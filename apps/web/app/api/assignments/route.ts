import { NextResponse } from "next/server";
import { z } from "zod";
import { createAssignments } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { endOfDayInStore, practiceList } from "@/lib/server";

const Input = z
  .object({
    userIds: z.array(z.string().uuid()).min(1).max(50),
    scenarioCode: z.string().min(1),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    reason: z.string().trim().max(300),
  })
  .strict();

/** A manager assigns one scenario to one or many reps, with a due date and a reason the rep sees (spec 14.5 item 4). */
export async function POST(request: Request) {
  const user = await apiUser({ manager: true });
  if (user instanceof NextResponse) return user;
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const input = parsed.data;
  if (!practiceList().some((s) => s.code === input.scenarioCode)) return NextResponse.json({ error: "unknown scenario" }, { status: 400 });
  try {
    const ids = await asUser(principalOf(user), (db) =>
      createAssignments(db, user, { userIds: input.userIds, scenarioCode: input.scenarioCode, dueAt: input.dueDate ? endOfDayInStore(input.dueDate) : null, reason: input.reason }),
    );
    return NextResponse.json({ ok: true, ids });
  } catch (error) {
    // Row-level security refuses a rep outside the manager's scope.
    const denied = error instanceof Error && /row-level security|not your rep|foreign key/.test(error.message);
    return NextResponse.json({ error: denied ? "not your rep" : "failed" }, { status: denied ? 403 : 500 });
  }
}
