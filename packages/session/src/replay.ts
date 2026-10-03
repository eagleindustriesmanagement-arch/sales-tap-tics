import type { ScoredTurn } from "@taptics/scoring";
import { PracticeSession, type PracticeSessionOptions } from "./session.js";

/**
 * Rebuilds a live session from its stored turns, so any server instance can take the next turn (a serverless host
 * may route two turns of one conversation to different instances). The session is rebuilt with its original seed,
 * exit draw and settings, and the rep's turns are run again in order. Offline, the customer and the cue detector
 * are deterministic, so the rebuilt session is the same session. With the AI customer, the recorded replies are used
 * instead of new ones; the unlock detector runs again and can read a turn slightly differently.
 */
export async function replayPracticeSession(options: Omit<PracticeSessionOptions, "replay">, turns: ScoredTurn[]): Promise<PracticeSession> {
  const ordered = [...turns].sort((a, b) => a.index - b.index);
  const replies = ordered.filter((t) => t.speaker === "customer" && t.index > 0).map((t) => ({ raw: t.raw ?? t.text, spoken: t.text }));
  const session = new PracticeSession({ ...options, replay: replies });
  session.start();
  for (const t of ordered.filter((x) => x.speaker === "rep")) {
    const turn = session.repTurn(t.text, { startedMs: t.startedMs, endedMs: t.endedMs, pauseBeforeMs: t.pauseBeforeMs, wordsPerMinute: t.wordsPerMinute, asrConfidence: t.asrConfidence });
    for (let step = await turn.next(); !step.done; step = await turn.next());
  }
  return session;
}
