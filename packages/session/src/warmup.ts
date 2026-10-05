import { masteryFrom, onboardingOrder, type Observation, type ScenarioMeta } from "./schedule.js";

/**
 * Warm-up (spec 12.5, 15.2; decision 0038): a 3-minute drill on one technique at the start of a shift. It drills the
 * rep's weakest practiced behavior, on the customer they have gone longest without; a rep with no history drills
 * the first behavior of their first onboarding customer.
 */
export interface WarmUpItem {
  /** A scenario's scoring item. */
  code: string;
  scenarioCode: string;
  technique: string;
  /** Measured from the voice only (the pause): a typed warm-up could never score it, so it is never drilled. */
  voiceOnly: boolean;
}

export interface WarmUpPick {
  scenarioCode: string;
  itemCode: string;
  technique: string;
  reason: "weakest" | "first";
}

/** A warm-up is short: it ends at three minutes or after this many rep turns, whichever comes first. */
export const WARM_UP_SECONDS = 180;
export const WARM_UP_TURNS = 4;

export function pickWarmUp(input: { scenarios: ScenarioMeta[]; items: WarmUpItem[]; history: Observation[] }): WarmUpPick | null {
  const pool = new Set(input.scenarios.map((s) => s.code));
  const candidates = input.items.filter((i) => pool.has(i.scenarioCode) && !i.voiceOnly && i.technique);
  if (candidates.length === 0) return null;
  const mastery = masteryFrom(input.history);
  const practiced = [...new Set(candidates.map((c) => c.code))]
    .map((code) => ({ code, m: mastery.get(`item:${code}`) }))
    .filter((x): x is { code: string; m: NonNullable<typeof x.m> } => x.m !== undefined)
    .sort((a, b) => a.m.value - b.m.value || a.m.lastAt.getTime() - b.m.lastAt.getTime() || a.code.localeCompare(b.code));
  if (practiced.length > 0) {
    const code = practiced[0]!.code;
    const lastAt = (s: string) => mastery.get(`scenario:${s}`)?.lastAt.getTime() ?? 0;
    const where = candidates.filter((c) => c.code === code).sort((a, b) => lastAt(a.scenarioCode) - lastAt(b.scenarioCode) || a.scenarioCode.localeCompare(b.scenarioCode))[0]!;
    return { scenarioCode: where.scenarioCode, itemCode: code, technique: where.technique, reason: "weakest" };
  }
  for (const s of onboardingOrder(input.scenarios)) {
    const first = candidates.find((c) => c.scenarioCode === s.code);
    if (first) return { scenarioCode: first.scenarioCode, itemCode: first.code, technique: first.technique, reason: "first" };
  }
  return null;
}
