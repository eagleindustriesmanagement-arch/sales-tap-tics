import "server-only";
import { lineStatus, reviewLines, type ReviewLine } from "@taptics/content";
import type { SpanishReview } from "@taptics/db";
import { checkContentLine, guardCustomerLine, STRICTEST_STORE } from "@taptics/rules";
import { library } from "./server";

export function reviewProgress(code: string, reviews: SpanishReview[]) {
  const lines = reviewLines(library(), code);
  const byKey = new Map(reviews.filter((r) => r.contentCode === code || lines.some((l) => l.code === r.contentCode)).map((r) => [`${r.contentCode}/${r.lineKey}`, r]));
  const statuses = lines.map((l) => ({ line: l, review: byKey.get(`${l.code}/${l.key}`), status: lineStatus(l, byKey.get(`${l.code}/${l.key}`)) }));
  return { lines: statuses, approved: statuses.filter((s) => s.status === "approved").length, total: lines.length };
}

/** An edited Spanish line must pass the same checks as authored content (spec 7.4 item 2). */
export function checkEditedSpanish(scenarioCode: string, line: ReviewLine, es: string): string[] {
  const lib = library();
  const s = lib.scenarios.get(scenarioCode)!;
  if (line.speaker === "customer") {
    return guardCustomerLine({ text: es, language: "es", facts: s.facts, lexicon: lib.lexicon!, hiddenTruthMarkers: { en: [], es: [] }, hiddenUnlocked: true }).map((i) => i.kind);
  }
  const ctx = { facts: s.facts, store: STRICTEST_STORE, channel: s.channel, lexicon: lib.lexicon!, rules: [...lib.rules.values()], techniques: lib.techniques };
  return checkContentLine({ en: line.en, es }, ctx)
    .filter((v) => v.severity === "critical" && !v.uncertain)
    .map((v) => v.rule);
}
