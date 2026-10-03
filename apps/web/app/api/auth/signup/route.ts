import { NextResponse } from "next/server";
import { requestLoginCode, requestSignup } from "@taptics/db";
import { isLanguage } from "@taptics/i18n";
import { authSecret } from "@/lib/auth";
import { withClient } from "@/lib/db";
import { deliverCode, devLogin } from "@/lib/delivery";
import { log } from "@/lib/log";

/**
 * Step one of a dealership sign-up (decision 0029): the store name and a work email. The code goes by email. If
 * the email already has an account, an ordinary sign-in code goes instead and the answer is the same, so this
 * endpoint does not reveal who has an account.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: unknown; storeName?: unknown; firstName?: unknown; language?: unknown };
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const email = str(body.email, 200);
  const language = isLanguage(body.language) ? body.language : "en";
  const result = await withClient((db) => requestSignup(db, { email, storeName: str(body.storeName, 120), firstName: str(body.firstName, 60) || undefined, language }, authSecret()));
  if (result.status === "invalid") return NextResponse.json({ status: "invalid" }, { status: 400 });
  if (result.status === "rate_limited") return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  let code: string | null = null;
  if (result.status === "sent") code = result.code;
  else {
    const login = await withClient((db) => requestLoginCode(db, email, authSecret()));
    if (login.status === "rate_limited") return NextResponse.json({ status: "rate_limited" }, { status: 429 });
    if (login.status === "sent") code = login.code;
  }
  if (!code) return NextResponse.json({ status: "sent" });
  const delivered = await deliverCode(email, code, language).catch(() => "unavailable" as const);
  if (delivered === "unavailable") {
    log("error", "signup_email_unavailable", {});
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
  if (result.status === "sent") log("info", "signup_requested", {});
  return NextResponse.json({ status: "sent", ...(devLogin() ? { devCode: code } : {}) });
}
