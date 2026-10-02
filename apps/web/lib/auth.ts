import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { isManager, loadUser, resolveLogin, type Role, type UserContext } from "@taptics/db";
import { asUser, withClient } from "./db";

export const SESSION_COOKIE = "tt_session";
/** Bump to make every rep accept the notice again (spec 20.1 item 4). */
export const CONSENT_VERSION = "2026-10-01";

export function authSecret(): string {
  const secret = process.env.TAPTICS_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("TAPTICS_SECRET (32+ characters) is required in production");
  return "development-only-secret-change-me-0123456789";
}

export interface Viewer extends UserContext {
  sessionId: string;
}

/** The signed-in user for this request, or null. Cached per request. */
export const currentUser = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const principal = await withClient((db) => resolveLogin(db, token));
  if (!principal) return null;
  const user = await asUser(principal, (db) => loadUser(db, principal.userId));
  return user ? { ...user, sessionId: principal.sessionId } : null;
});

/** Pages: send to login, then to the consent notice, then check the role (spec 3.3 rule 1: server-side). */
export async function requireUser(opts: { manager?: boolean; roles?: Role[] } = {}): Promise<Viewer> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.consentVersion !== CONSENT_VERSION) redirect("/consent");
  if (opts.manager && !isManager(user)) redirect("/");
  if (opts.roles && !opts.roles.some((r) => user.roles.includes(r))) redirect("/");
  return user;
}

/** API routes: the user, or a 401/403 response. */
export async function apiUser(opts: { manager?: boolean; roles?: Role[] } = {}): Promise<Viewer | NextResponse> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });
  if (user.consentVersion !== CONSENT_VERSION) return NextResponse.json({ error: "consent required" }, { status: 403 });
  if (opts.manager && !isManager(user)) return NextResponse.json({ error: "managers only" }, { status: 403 });
  if (opts.roles && !opts.roles.some((r) => user.roles.includes(r))) return NextResponse.json({ error: "not allowed for your role" }, { status: 403 });
  return user;
}

export const principalOf = (u: Viewer) => ({ tenantId: u.tenantId, userId: u.id });
