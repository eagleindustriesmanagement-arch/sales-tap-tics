import { NextResponse } from "next/server";
import { assignableReps, issueCard } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { library } from "@/lib/server";

/**
 * A manager starts a floor check for any rep on the team (spec 14.1): this week's card is issued for the behavior the
 * manager wants to watch, then checked like any other. One card per rep per week, as when practice issues it.
 */
export async function POST(request: Request) {
  const user = await apiUser({ manager: true });
  if (user instanceof NextResponse) return user;
  const body = (await request.json().catch(() => ({}))) as { userId?: string; cardCode?: string };
  const card = body.cardCode ? library().behaviorCards.get(body.cardCode) : undefined;
  if (!body.userId || !/^[0-9a-f-]{36}$/.test(body.userId) || !card) return NextResponse.json({ error: "rep and behavior required" }, { status: 400 });
  const issued = await asUser(principalOf(user), async (db) => {
    const reps = await assignableReps(db, user);
    if (!reps.some((r) => r.id === body.userId)) return "not_on_team" as const;
    return (await issueCard(db, user.tenantId, body.userId!, { code: card.code, itemCode: card.rubric_items[0] ?? card.code, sessionId: null })) ? ("issued" as const) : ("exists" as const);
  });
  if (issued === "not_on_team") return NextResponse.json({ error: "not on your team" }, { status: 403 });
  if (issued === "exists") return NextResponse.json({ error: "already has this week's card" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
