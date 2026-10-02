import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { Queryable } from "./context.js";

/** Login settings. Numbers are the strictest reasonable defaults; change them here, not at call sites. */
export const AUTH = {
  codeTtlSeconds: 10 * 60,
  codesPerWindow: 5,
  windowSeconds: 15 * 60,
  maxAttempts: 5,
  sessionTtlSeconds: 30 * 24 * 60 * 60,
} as const;

export function normalizeIdentifier(identifier: string): string {
  const v = identifier.trim();
  return v.includes("@") ? v.toLowerCase() : v.replace(/[^0-9+]/g, "");
}

/** Codes are stored as HMACs keyed by the server secret and bound to the identifier. */
export function hashCode(identifier: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${normalizeIdentifier(identifier)}:${code}`).digest("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function asApp<T>(db: Queryable, work: () => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query("set local role app_user");
    const r = await work();
    await db.query("commit");
    return r;
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}

export type CodeRequest = { status: "sent"; code: string; userId: string } | { status: "unknown" } | { status: "rate_limited" };

/** Creates a six-digit code for the identifier. The caller delivers it and answers "sent" for "unknown" too. */
export async function requestLoginCode(db: Queryable, identifier: string, secret: string): Promise<CodeRequest> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const r = await asApp(db, () =>
    db.query<{ status: string; user_id: string | null }>("select * from app.auth_request_code($1, $2, $3, $4, $5)", [
      normalizeIdentifier(identifier),
      hashCode(identifier, code, secret),
      AUTH.codeTtlSeconds,
      AUTH.codesPerWindow,
      AUTH.windowSeconds,
    ]),
  );
  const row = r.rows[0]!;
  if (row.status === "sent") return { status: "sent", code, userId: row.user_id! };
  return { status: row.status as "unknown" | "rate_limited" };
}

export type CodeCheck = { status: "ok"; token: string; userId: string; tenantId: string } | { status: "invalid" | "expired" | "locked" };

/** Verifies a code and, when it matches, opens a login session. Returns the raw token for the cookie. */
export async function verifyLoginCode(db: Queryable, identifier: string, code: string, secret: string): Promise<CodeCheck> {
  if (!/^\d{6}$/.test(code.trim())) return { status: "invalid" };
  return asApp(db, async () => {
    const r = await db.query<{ status: string; user_id: string | null; tenant_id: string | null }>("select * from app.auth_verify_code($1, $2, $3)", [
      normalizeIdentifier(identifier),
      hashCode(identifier, code.trim(), secret),
      AUTH.maxAttempts,
    ]);
    const row = r.rows[0]!;
    if (row.status !== "ok") return { status: row.status as "invalid" | "expired" | "locked" };
    const token = randomBytes(32).toString("base64url");
    await db.query("select app.auth_create_session($1, $2, $3)", [row.user_id, hashToken(token), AUTH.sessionTtlSeconds]);
    return { status: "ok", token, userId: row.user_id!, tenantId: row.tenant_id! };
  });
}

export interface Principal {
  sessionId: string;
  userId: string;
  tenantId: string;
}

export async function resolveLogin(db: Queryable, token: string | undefined | null): Promise<Principal | null> {
  if (!token || token.length < 20) return null;
  const r = await asApp(db, () => db.query<{ session_id: string; user_id: string; tenant_id: string }>("select * from app.auth_resolve_session($1)", [hashToken(token)]));
  const row = r.rows[0];
  return row ? { sessionId: row.session_id, userId: row.user_id, tenantId: row.tenant_id } : null;
}

export async function revokeLogin(db: Queryable, token: string): Promise<void> {
  await asApp(db, () => db.query("select app.auth_revoke_session($1)", [hashToken(token)]));
}

/** Constant-time comparison for any other secrets the app checks. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
