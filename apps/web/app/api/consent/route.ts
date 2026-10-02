import { NextResponse } from "next/server";
import { recordConsent } from "@taptics/db";
import { isLanguage } from "@taptics/i18n";
import { CONSENT_VERSION, currentUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const language = isLanguage(form.get("lang")) ? (form.get("lang") as "en" | "es") : "en";
  await asUser(principalOf(user), (db) => recordConsent(db, user, CONSENT_VERSION, language));
  return NextResponse.redirect(new URL("/", request.url), 303);
}
