import { NextResponse } from "next/server";
import { library, memory } from "@/lib/server";

/** Records a floor check (spec 14.1 item 4): observed, an optional note, and the manager's two self-checks. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { card?: string; observed?: string; note?: string; specific?: boolean; modeled?: boolean; seconds?: number };
  if (!body.card || !library().behaviorCards.has(body.card)) return NextResponse.json({ error: "unknown card" }, { status: 404 });
  if (!["yes", "partly", "no"].includes(body.observed ?? "")) return NextResponse.json({ error: "observed must be yes, partly or no" }, { status: 400 });
  const check = { card: body.card, observed: body.observed, note: (body.note ?? "").slice(0, 280), specific: Boolean(body.specific), modeled: Boolean(body.modeled), seconds: Math.max(0, Math.round(body.seconds ?? 0)), at: new Date().toISOString() };
  memory.floorChecks.push(check);
  return NextResponse.json({ ok: true, check });
}
