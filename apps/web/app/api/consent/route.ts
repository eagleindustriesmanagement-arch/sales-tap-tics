import { NextResponse } from "next/server";
import { listPeople, recordConsent } from "@taptics/db";
import { isLanguage } from "@taptics/i18n";
import { CONSENT_VERSION, currentUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const language = isLanguage(form.get("lang")) ? (form.get("lang") as "en" | "es") : "en";
  const alone = await asUser(principalOf(user), async (db) => {
    await recordConsent(db, user, CONSENT_VERSION, language);
    return user.roles.includes("general_manager") && user.storeId ? (await listPeople(db, user.storeId)).length === 1 : false;
  });
  // The owner of a store that has just signed up (nobody else in it yet) goes straight to adding the team.
  return NextResponse.redirect(new URL(alone ? "/manager/people?welcome=1" : "/today", request.url), 303);
}
