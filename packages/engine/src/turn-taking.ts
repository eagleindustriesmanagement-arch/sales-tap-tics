/** Turn-taking rules the voice gateway applies (spec 11.3). Kept here so the text practice room shares them. */

export const END_OF_TURN_SILENCE_MS = 700;
export const BARGE_IN_STOP_MS = 200;
const INTERRUPTING_TEMPERAMENTS = new Set(["rushed", "irritated", "theatrical"]);

/**
 * The customer may interrupt the rep only when its temperament allows it and the rep has talked for more than
 * 40 seconds without asking a question. This trains reps out of monologues.
 */
export function customerMayInterrupt(temperaments: string[], repSpeakingMs: number, repAskedQuestion: boolean): boolean {
  return temperaments.some((t) => INTERRUPTING_TEMPERAMENTS.has(t)) && repSpeakingMs > 40_000 && !repAskedQuestion;
}
