import { NextResponse } from "next/server";
import { z } from "zod";
import { reviewLines } from "@taptics/content";
import { saveSpanishReview } from "@taptics/db";
import { apiUser, principalOf } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { checkEditedSpanish } from "@/lib/review";
import { library } from "@/lib/server";

const Input = z.object({ scenario: z.string().min(1), code: z.string().min(1), lineKey: z.string().min(1), es: z.string().trim().min(1).max(2000) }).strict();

/** The Spanish reviewer approves a line, or saves an edit that passes the compliance checks (spec 16.3). */
export async function POST(request: Request) {
  const user = await apiUser({ roles: ["content_editor"] });
  if (user instanceof NextResponse) return user;
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { scenario, code, lineKey, es } = parsed.data;
  // The line comes from the content, never from the browser.
  const line = reviewLines(library(), scenario).find((l) => l.code === code && l.key === lineKey);
  if (!line) return NextResponse.json({ error: "unknown line" }, { status: 404 });
  if (es !== line.es) {
    const problems = checkEditedSpanish(scenario, line, es);
    if (problems.length) return NextResponse.json({ error: "compliance", problems }, { status: 422 });
  }
  await asUser(principalOf(user), (db) =>
    saveSpanishReview(db, user, { kind: line.kind, code: line.code, lineKey: line.key, en: line.en, esOriginal: line.es, esFinal: es, needsCompliance: line.needsCompliance || /\d|\$/.test(es) }),
  );
  return NextResponse.json({ ok: true, needsCompliance: line.needsCompliance || /\d|\$/.test(es) });
}
