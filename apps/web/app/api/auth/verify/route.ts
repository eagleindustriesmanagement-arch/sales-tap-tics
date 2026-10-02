import { NextResponse } from "next/server";
import { AUTH, verifyLoginCode } from "@taptics/db";
import { authSecret, SESSION_COOKIE } from "@/lib/auth";
import { withClient } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { identifier?: string; code?: string };
  const result = await withClient((db) => verifyLoginCode(db, (body.identifier ?? "").slice(0, 200), (body.code ?? "").slice(0, 12), authSecret()));
  if (result.status !== "ok") return NextResponse.json({ status: result.status }, { status: 401 });
  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH.sessionTtlSeconds,
  });
  return response;
}
