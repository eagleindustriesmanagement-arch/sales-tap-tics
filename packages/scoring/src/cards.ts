import type { BehaviorCard, Library } from "@taptics/content";
import { GRADE_WEIGHT } from "./debrief.js";
import type { ScoreResult } from "./types.js";

export interface CardChoice {
  card: BehaviorCard;
  itemCode: string;
  meanScore: number;
  sessions: number;
  priority: number;
}

/**
 * The week's one behavior card (spec 12.4): the rep's lowest-scoring rubric item across the week's sessions,
 * weighted toward items with the strongest evidence grade, among items that have a card with a floor check.
 */
export function chooseWeeklyCard(library: Library, weekScores: ScoreResult[]): CardChoice | null {
  const byItem = new Map<string, number[]>();
  for (const score of weekScores) {
    for (const item of score.items) {
      if (item.status !== "scored" || item.max === 0) continue;
      const list = byItem.get(item.code) ?? [];
      list.push(item.points / item.max);
      byItem.set(item.code, list);
    }
  }
  let best: CardChoice | null = null;
  for (const card of library.behaviorCards.values()) {
    const grade = library.techniques.get(card.technique)?.evidence.grade ?? "D";
    for (const code of card.rubric_items) {
      const ratios = byItem.get(code);
      if (!ratios || ratios.length === 0) continue;
      const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      if (mean >= 1) continue;
      const priority = (1 - mean) * GRADE_WEIGHT[grade];
      if (!best || priority > best.priority || (priority === best.priority && ratios.length > best.sessions)) {
        best = { card, itemCode: code, meanScore: mean, sessions: ratios.length, priority };
      }
    }
  }
  return best;
}
