import { NextResponse } from "next/server";
import { AUTH, verifyLoginCode, verifySignup } from "@taptics/db";
import { authSecret, setSessionCookie } from "@/lib/auth";
import { withClient } from "@/lib/db";
import { log } from "@/lib/log";

/**
 * Step two: the emailed code. A pending sign-up becomes the tenant, its store and its owner; an email that already
 * had an account (it was sent a sign-in code) simply signs in.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; code?: unknown };
  const email = typeof body.email === "string" ? body.email.slice(0, 200) : "";
  const code = typeof body.code === "string" ? body.code.slice(0, 12) : "";
  const signup = await withClient((db) => verifySignup(db, email, code, authSecret()));
  if (signup.status === "ok") {
    log("info", "signup_completed", { tenant: signup.tenantId });
    return setSessionCookie(NextResponse.json({ status: "ok" }), signup.token, AUTH.sessionTtlSeconds);
  }
  if (signup.status !== "none") return NextResponse.json({ status: signup.status }, { status: 401 });
  const login = await withClient((db) => verifyLoginCode(db, email, code, authSecret()));
  if (login.status !== "ok") return NextResponse.json({ status: login.status }, { status: 401 });
  return setSessionCookie(NextResponse.json({ status: "ok" }), login.token, AUTH.sessionTtlSeconds);
}
