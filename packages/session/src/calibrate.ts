import type { ExitPolicy, LostReasonMap } from "@taptics/content";

/**
 * Exit-rate calibration (spec 19.2 item 1, decision 0011). Each month one multiplier per store scales every
 * scenario's authored walk-away and not-now base rates, so the share of practice sessions that end in an exit moves
 * toward the store's real share of unsold ups. Scaling keeps the authored ratios, so harder scenarios stay harder.
 */
export const EXIT_CALIBRATION = {
  /** Fewer real ups or practice sessions than this and the multiplier stays where it is. */
  minUps: 50,
  minSessions: 30,
  /** One month moves the multiplier by at most half or double, so one odd month cannot swing practice. */
  maxStep: 2,
  /** The multiplier never leaves this range of the authored rates. */
  min: 0.25,
  max: 4,
  /** Walk-away plus not-now never exceeds this, so every customer can still be won. */
  maxExitBase: 0.9,
} as const;

export function scaleExitPolicy(policy: ExitPolicy, multiplier: number): ExitPolicy {
  if (multiplier === 1) return policy;
  let walk = policy.walk_away_base * multiplier;
  let notNow = policy.not_now_base * multiplier;
  const sum = walk + notNow;
  if (sum > EXIT_CALIBRATION.maxExitBase) {
    walk *= EXIT_CALIBRATION.maxExitBase / sum;
    notNow *= EXIT_CALIBRATION.maxExitBase / sum;
  }
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return { ...policy, walk_away_base: round(walk), not_now_base: round(notNow) };
}

export interface ExitCalibrationInput {
  /** The store's real ups and sales over the period. */
  ups: number;
  sold: number;
  /** Completed practice sessions over the period, run under `current`, and how many ended in an exit. */
  sessions: number;
  exits: number;
  /** The multiplier those sessions ran under (1 before the first calibration). */
  current: number;
}

export type ExitCalibration =
  | { status: "updated"; multiplier: number; target: number; observed: number }
  | { status: "insufficient_data"; multiplier: number; reason: "ups" | "sessions" };

export function calibrateExits(input: ExitCalibrationInput): ExitCalibration {
  const c = EXIT_CALIBRATION;
  if (input.ups < c.minUps) return { status: "insufficient_data", multiplier: input.current, reason: "ups" };
  if (input.sessions < c.minSessions) return { status: "insufficient_data", multiplier: input.current, reason: "sessions" };
  const target = (input.ups - input.sold) / input.ups;
  const observed = input.exits / input.sessions;
  // No exits at all: step up as far as one month allows. Otherwise scale by target over observed.
  const ratio = observed === 0 ? c.maxStep : Math.min(c.maxStep, Math.max(1 / c.maxStep, target / observed));
  const multiplier = Math.round(Math.min(c.max, Math.max(c.min, input.current * ratio)) * 100) / 100;
  return { status: "updated", multiplier, target: round3(target), observed: round3(observed) };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------- objection weights (spec 19.2 item 2)

/**
 * Objection weights from the store's lost-deal reasons (decision 0018). Each reason is matched to objections by the
 * content mapping; a reason known to hide another moves part of each deal to the objections it usually hides. An
 * objection's weight is 1 plus `perShare` times its share of the matched lost deals, capped at `max`: one that costs
 * the store a tenth of its lost deals weighs 2. Objections the store never names keep 1, because stated reasons are
 * unreliable and absence is not evidence.
 */
export const OBJECTION_WEIGHTS = {
  /** Fewer matched lost deals than this and no store weights are set. */
  minRecords: 30,
  perShare: 10,
  max: 5,
} as const;

export interface LostReasonCount {
  reason: string;
  count: number;
}

export type ObjectionWeighting =
  | {
      status: "updated";
      weights: Record<string, number>;
      matched: number;
      /** Matched lost deals by mapping label (English), largest first, for the general manager's view. */
      byLabel: { label: string; count: number }[];
      unmatched: LostReasonCount[];
    }
  | { status: "insufficient_data"; matched: number; unmatched: LostReasonCount[] };

export function weighObjections(rows: LostReasonCount[], map: LostReasonMap): ObjectionWeighting {
  const compiled = map.reasons.map((r) => ({ ...r, res: r.patterns.map((p) => new RegExp(p, "iu")) }));
  const shares = new Map<string, number>();
  const byLabel = new Map<string, number>();
  const unmatched = new Map<string, number>();
  let matched = 0;
  const spread = (codes: string[], amount: number) => {
    for (const c of codes) shares.set(c, (shares.get(c) ?? 0) + amount / codes.length);
  };
  for (const row of rows) {
    if (row.count <= 0) continue;
    const entry = compiled.find((r) => r.res.some((re) => re.test(row.reason)));
    if (!entry) {
      unmatched.set(row.reason, (unmatched.get(row.reason) ?? 0) + row.count);
      continue;
    }
    matched += row.count;
    byLabel.set(entry.label.en, (byLabel.get(entry.label.en) ?? 0) + row.count);
    const hidden = entry.hides.length ? map.hidden_share : 0;
    spread(entry.objections, row.count * (1 - hidden));
    if (hidden) spread(entry.hides, row.count * hidden);
  }
  const unmatchedList = [...unmatched].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  if (matched < OBJECTION_WEIGHTS.minRecords) return { status: "insufficient_data", matched, unmatched: unmatchedList };
  const weights: Record<string, number> = {};
  for (const [code, amount] of [...shares].sort(([a], [b]) => a.localeCompare(b))) {
    weights[code] = Math.round(Math.min(OBJECTION_WEIGHTS.max, 1 + (OBJECTION_WEIGHTS.perShare * amount) / matched) * 100) / 100;
  }
  return {
    status: "updated",
    weights,
    matched,
    byLabel: [...byLabel].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    unmatched: unmatchedList,
  };
}

// ---------------------------------------------------------------- score validity (spec 19.2 item 3)

/**
 * Score validity (decision 0024): across reps, how each practice dimension (and the total) relates to the rep's real
 * outcomes, as a Pearson correlation with its sample size. Correlation, not proof. A dimension that relates to no
 * outcome is a candidate for less weight; nothing changes automatically.
 */
export const SCORE_VALIDITY = {
  /** Reps needed for any correlation to be shown. */
  minReps: 5,
  /** A rep counts only with this many complete practice scores and this many real ups in the period. */
  minSessions: 3,
  minUps: 20,
  /** Below this size of correlation, in both directions, a dimension "does not relate". */
  weak: 0.1,
} as const;

export const VALIDITY_MEASURES = ["total", "composure", "discovery", "technique", "outcome"] as const;
export type ValidityMeasure = (typeof VALIDITY_MEASURES)[number];

export interface RepPracticeAndOutcome {
  sessions: number;
  scores: Partial<Record<ValidityMeasure, number>>;
  ups: number;
  sold: number;
  /** Add-ons sold and cancelled within 60 days, when the store uploaded them. */
  addonsSold?: number;
  cancelled?: number;
}

export interface Correlation {
  measure: ValidityMeasure;
  r: number | null;
  n: number;
}

export type ScoreValidity =
  | { status: "insufficient_data"; reps: number }
  | { status: "computed"; reps: number; closeRate: Correlation[]; addonCancellation: Correlation[]; weak: ValidityMeasure[] };

export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n < 3 || ys.length !== n) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  return Math.round((sxy / Math.sqrt(sxx * syy)) * 100) / 100;
}

export function scoreValidity(reps: RepPracticeAndOutcome[]): ScoreValidity {
  const c = SCORE_VALIDITY;
  const eligible = reps.filter((r) => r.sessions >= c.minSessions && r.ups >= c.minUps);
  if (eligible.length < c.minReps) return { status: "insufficient_data", reps: eligible.length };
  const correlate = (outcome: (r: RepPracticeAndOutcome) => number | null) =>
    VALIDITY_MEASURES.map((measure): Correlation => {
      const pairs = eligible
        .map((r) => [r.scores[measure], outcome(r)] as const)
        .filter((p): p is readonly [number, number] => typeof p[0] === "number" && typeof p[1] === "number");
      const enough = pairs.length >= c.minReps;
      return { measure, r: enough ? pearson(pairs.map((p) => p[0]), pairs.map((p) => p[1])) : null, n: pairs.length };
    });
  const closeRate = correlate((r) => (r.ups ? r.sold / r.ups : null));
  // Fewer cancellations is better, so the sign is flipped: a positive r always means "higher score, better result".
  const addonCancellation = correlate((r) => (r.addonsSold ? -((r.cancelled ?? 0) / r.addonsSold) : null));
  const weak = VALIDITY_MEASURES.filter((m) => {
    const all = [...closeRate, ...addonCancellation].filter((x) => x.measure === m && x.r !== null);
    return all.length > 0 && all.every((x) => Math.abs(x.r!) < c.weak);
  });
  return { status: "computed", reps: eligible.length, closeRate, addonCancellation, weak };
}
