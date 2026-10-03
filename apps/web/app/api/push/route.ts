import { NextResponse } from "next/server";
import { z } from "zod";
import { removePushSubscription, savePushSubscription } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { pushConfigured } from "@/lib/push";

// A P-256 public key is 65 bytes and the auth secret 16, base64url-encoded by the browser.
const b64url = (bytes: number) => z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).refine((v) => Buffer.from(v, "base64url").length === bytes);
const Sub = z.object({ endpoint: z.string().url().startsWith("https://").max(2000), keys: z.object({ p256dh: b64url(65), auth: b64url(16) }) });

/** Turns practice reminders on for this phone (decision 0022). */
export async function POST(request: Request) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  if (!pushConfigured()) return NextResponse.json({ error: "reminders are not set up" }, { status: 409 });
  const parsed = Sub.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await asUser(principalOf(user), (db) => savePushSubscription(db, user, { endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth }));
  return NextResponse.json({ ok: true });
}

/** Turns them off for this phone. */
export async function DELETE(request: Request) {
  const user = await apiUser();
  if (user instanceof NextResponse) return user;
  const parsed = z.object({ endpoint: z.string().max(2000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await asUser(principalOf(user), (db) => removePushSubscription(db, parsed.data.endpoint));
  return NextResponse.json({ ok: true });
}
