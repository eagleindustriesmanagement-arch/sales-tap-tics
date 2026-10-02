/**
 * Where to aim coaching (spec 14.4): middle performers first, because coaching moved them most; low performers get
 * extra assigned practice; high performers keep stretching. Thirds are taken among reps with complete scores.
 */
export type Focus = "coach" | "extra_practice" | "stretch" | "needs_scores";

export function coachingFocus<T extends { id: string; avgScore: number | null }>(reps: T[]): (T & { focus: Focus })[] {
  const scored = reps.filter((r) => r.avgScore !== null).sort((a, b) => a.avgScore! - b.avgScore!);
  const third = scored.length / 3;
  const focusOf = new Map<string, Focus>();
  scored.forEach((r, i) => focusOf.set(r.id, scored.length < 3 ? "coach" : i < Math.floor(third) ? "extra_practice" : i >= scored.length - Math.floor(third) ? "stretch" : "coach"));
  const order: Focus[] = ["coach", "extra_practice", "stretch", "needs_scores"];
  return reps
    .map((r) => ({ ...r, focus: focusOf.get(r.id) ?? ("needs_scores" as Focus) }))
    .sort((a, b) => order.indexOf(a.focus) - order.indexOf(b.focus) || (a.avgScore ?? 0) - (b.avgScore ?? 0));
}
