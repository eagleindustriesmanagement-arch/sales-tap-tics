import type { ExitPolicy } from "@taptics/content";

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
