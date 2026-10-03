import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * The hourly reminder job (decision 0022). Called by a scheduler with `Authorization: Bearer <CRON_SECRET>` (Vercel
 * Cron sends it that way). Without CRON_SECRET set, it refuses everyone.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const ok = Boolean(secret) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await sendDueReminders());
}
