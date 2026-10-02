import { NextResponse } from "next/server";
import { isLanguage } from "@taptics/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = form.get("lang");
  // Return to the page the switch was pressed on, but only on this site.
  const referer = request.headers.get("referer");
  const target = referer && new URL(referer).origin === new URL(request.url).origin ? referer : new URL("/", request.url);
  const response = NextResponse.redirect(target, 303);
  if (isLanguage(lang)) response.cookies.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}
