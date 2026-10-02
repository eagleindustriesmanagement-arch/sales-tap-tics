import { NextResponse } from "next/server";
import { z } from "zod";
import { recordCoachPractice } from "@taptics/db";
import { scoreFloorCheck } from "@taptics/scoring";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

const Input = z.object({ cardCode: z.string().min(1), text: z.string().trim().min(10).max(2000) }).strict();

/** Coach the coach (spec 14.3): scores the manager's floor check on the four-part shape and keeps it. */
export async function POST(request: Request) {
  const user = await apiUser({ manager: true });
  if (user instanceof NextResponse) return user;
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const card = library().behaviorCards.get(parsed.data.cardCode);
  if (!card) return NextResponse.json({ error: "unknown card" }, { status: 400 });
  const lang = await language();
  const result = scoreFloorCheck(parsed.data.text, lang, card);
  await asUser(principalOf(user), (db) => recordCoachPractice(db, user, { cardCode: card.code, language: lang, text: parsed.data.text, parts: result.parts, oneBehavior: result.oneBehavior, score: result.score }));
  return NextResponse.json(result);
}
