import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeLogin } from "@taptics/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { withClient } from "@/lib/db";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await withClient((db) => revokeLogin(db, token));
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
