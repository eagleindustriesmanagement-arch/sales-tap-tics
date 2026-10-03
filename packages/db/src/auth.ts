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

export interface SignupInput {
  email: string;
  storeName: string;
  firstName?: string;
  language: "en" | "es";
}

export type SignupRequest = { status: "sent"; code: string } | { status: "exists" } | { status: "rate_limited" } | { status: "invalid" };

/**
 * Starts a dealership sign-up (decision 0029): stores the store name and a code for the work email. "exists" means
 * an active account already uses that email: the caller sends an ordinary sign-in code instead and answers the
 * same way, so sign-up does not reveal who has an account.
 */
export async function requestSignup(db: Queryable, input: SignupInput, secret: string): Promise<SignupRequest> {
  const email = normalizeIdentifier(input.email);
  const storeName = input.storeName.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || storeName.length < 2 || storeName.length > 120) return { status: "invalid" };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const r = await asApp(db, () =>
    db.query<{ status: string }>("select app.signup_request($1, $2, $3, $4, $5, $6, $7, $8) as status", [
      email,
      storeName,
      input.firstName?.trim().slice(0, 60) || null,
      input.language,
      hashCode(email, code, secret),
      AUTH.codeTtlSeconds,
      AUTH.codesPerWindow,
      AUTH.windowSeconds,
    ]),
  );
  const status = r.rows[0]!.status;
  return status === "sent" ? { status: "sent", code } : { status: status as "exists" | "rate_limited" };
}

export type SignupCheck = { status: "ok"; token: string; userId: string; tenantId: string } | { status: "none" | "invalid" | "expired" | "locked" };

/**
 * Verifies a sign-up code. On success the tenant, its store and the owner (the store's general manager) now exist,
 * and a login session is opened. "none" means there is no pending sign-up for the email: try it as a sign-in code.
 */
export async function verifySignup(db: Queryable, email: string, code: string, secret: string): Promise<SignupCheck> {
  if (!/^\d{6}$/.test(code.trim())) return { status: "invalid" };
  return asApp(db, async () => {
    const r = await db.query<{ status: string; user_id: string | null; tenant_id: string | null }>("select * from app.signup_verify($1, $2, $3)", [
      normalizeIdentifier(email),
      hashCode(email, code.trim(), secret),
      AUTH.maxAttempts,
    ]);
    const row = r.rows[0]!;
    if (row.status !== "ok") return { status: row.status as "none" | "invalid" | "expired" | "locked" };
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
