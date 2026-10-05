import type { ScoreResult } from "./types.js";

/**
 * A warm-up is scored on its one behavior (spec 12.5, decision 0038). The session is scored as usual, then narrowed:
 * the drilled item alone, never a pass and never a full score (it is "partial", so it counts toward neither
 * certification, nor assignments, nor a failed lesson). Honesty is still the hard line: a confident critical
 * violation zeroes the drill and is shown, as in any session.
 */
export function focusOn(score: ScoreResult, itemCode: string): ScoreResult {
  const item = score.items.find((i) => i.code === itemCode);
  const items = item ? [{ ...item, scenarioItem: true }] : [];
  const scored = item?.status === "scored" && item.max > 0;
  const total = !score.honestyPassed || !scored ? 0 : Math.round((item!.points / item!.max) * 1000) / 10;
  return {
    ...score,
    total,
    passed: false,
    partial: true,
    coverage: scored ? 1 : 0,
    items,
    coaching: [],
    turningPoint: null,
  };
}
