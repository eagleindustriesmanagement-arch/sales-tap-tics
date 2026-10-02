import { NextResponse } from "next/server";
import { setReminderTime } from "@taptics/db";
import { currentUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

/** Saves the user's own settings from the settings form, then returns to it. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303);
  const form = await request.formData();
  const raw = String(form.get("reminder") ?? "").trim();
  const ok = raw === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(raw);
  if (ok) await asUser(principalOf(user), (db) => setReminderTime(db, user.id, raw || null));
  return NextResponse.redirect(new URL(`/settings?saved=${ok ? 1 : 0}`, request.url), 303);
}
