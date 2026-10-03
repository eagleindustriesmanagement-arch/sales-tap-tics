import { NextResponse } from "next/server";
import { requestLoginCode } from "@taptics/db";
import { isLanguage } from "@taptics/i18n";
import { authSecret } from "@/lib/auth";
import { withClient } from "@/lib/db";
import { deliverCode, demoLogin, devLogin } from "@/lib/delivery";

/**
 * Step one of sign-in. Answers the same way whether or not the account exists, so the endpoint does not reveal who
 * has one; only the rate limit and delivery outages are reported.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { identifier?: string; language?: string };
  const identifier = (body.identifier ?? "").trim().slice(0, 200);
  const language = isLanguage(body.language) ? body.language : "en";
  if (!identifier) return NextResponse.json({ error: "identifier required" }, { status: 400 });
  const result = await withClient((db) => requestLoginCode(db, identifier, authSecret()));
  if (result.status === "rate_limited") return NextResponse.json({ status: "rate_limited" }, { status: 429 });
  if (result.status === "unknown") return NextResponse.json({ status: "sent" });
  // Demo accounts on the trial site have no inbox: the code goes on screen instead (decision 0014).
  if (demoLogin(identifier)) return NextResponse.json({ status: "sent", devCode: result.code });
  const delivered = await deliverCode(identifier, result.code, language);
  if (delivered === "unavailable") return NextResponse.json({ status: "unavailable" }, { status: 503 });
  return NextResponse.json({ status: "sent", ...(devLogin() ? { devCode: result.code } : {}) });
}
