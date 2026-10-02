import { NextResponse } from "next/server";
import { recordFloorCheck } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";

/** Records a floor check (spec 14.1 item 4): observed, an optional note, and the manager's two self-checks. */
export async function POST(request: Request) {
  const user = await apiUser({ manager: true });
  if (user instanceof NextResponse) return user;
  const body = (await request.json().catch(() => ({}))) as { cardIssueId?: string; observed?: string; note?: string; specific?: boolean; modeled?: boolean; seconds?: number };
  if (!body.cardIssueId || !/^[0-9a-f-]{36}$/.test(body.cardIssueId)) return NextResponse.json({ error: "card required" }, { status: 400 });
  if (body.observed !== "yes" && body.observed !== "partly" && body.observed !== "no") return NextResponse.json({ error: "observed must be yes, partly or no" }, { status: 400 });
  try {
    const id = await asUser(principalOf(user), (db) =>
      recordFloorCheck(db, user, { cardIssueId: body.cardIssueId!, observed: body.observed as "yes", note: body.note ?? "", durationSeconds: body.seconds ?? 0, specificFeedback: Boolean(body.specific), modeled: Boolean(body.modeled) }),
    );
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "failed" }, { status: 409 });
  }
}
