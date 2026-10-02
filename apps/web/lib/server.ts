import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { AiClient, ClaudeComplianceClassifier, ClaudeJudge, ClaudeUnlockDetector, MemoryUsageSink } from "@taptics/ai";
import { platformLibrary } from "@taptics/content";
import {
  createPracticeSession, insertTurns, issueCard, latestPlatformRelease, saveSessionResult, weekScoreItems, type UserContext,
} from "@taptics/db";
import { exitDrawFor } from "@taptics/engine";
import { isLanguage, type Language } from "@taptics/i18n";
import { chooseWeeklyCard, type ItemResult, type ScoreResult } from "@taptics/scoring";
import { PracticeSession, type SessionResult } from "@taptics/session";
import { asUser, withClient } from "./db";

export const library = () => platformLibrary();

export async function language(): Promise<Language> {
  const value = (await cookies()).get("lang")?.value;
  return isLanguage(value) ? value : "en";
}

/** The live Claude customer only when a key is configured; otherwise the offline customer (labeled in the UI). */
export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.TAPTICS_OFFLINE !== "1";
}

interface Live {
  id: string;
  session: PracticeSession;
  userId: string;
  tenantId: string;
  createdAt: number;
  persistedTurns: number;
  usage: MemoryUsageSink;
  result: SessionResult | null;
}

/**
 * Live sessions stay in process memory while the conversation runs (the voice gateway will keep the same state in
 * Redis); every turn is written to the database as it happens, and the result when it ends (decision in
 * docs/plans/M2b-login-and-persistence.md). Abandoned live state expires after an hour.
 */
const store = globalThis as unknown as { __taptics?: { sessions: Map<string, Live> } };
store.__taptics ??= { sessions: new Map() };
const live = store.__taptics.sessions;

function sweep() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, s] of live) if (s.createdAt < cutoff) live.delete(id);
}

const principal = (u: { tenantId: string; id: string }) => ({ tenantId: u.tenantId, userId: u.id });

/** Sessions a rep may start per minute (spec 20.4: rate limiting on session start). */
const STARTS_PER_MINUTE = 4;

export async function startSession(user: UserContext, scenarioCode: string, lang: Language | "follow") {
  sweep();
  const id = randomUUID();
  const { recent, attempt, release } = await asUser(principal(user), async (db) => {
    const r = await db.query<{ recent: number; attempt: number }>(
      "select count(*) filter (where started_at > now() - interval '1 minute')::int recent, count(*) filter (where scenario_code = $2)::int attempt from sessions where user_id = $1",
      [user.id, scenarioCode],
    );
    return { ...r.rows[0]!, release: await latestPlatformRelease(db) };
  });
  if (recent >= STARTS_PER_MINUTE) return { error: "rate_limited" as const };

  const usage = new MemoryUsageSink();
  let ai: ConstructorParameters<typeof PracticeSession>[0]["ai"];
  if (aiConfigured()) {
    const client = new AiClient(undefined, usage);
    const lib = library();
    ai = {
      client,
      classifier: new ClaudeComplianceClassifier(client, user.tenantId, id),
      detector: new ClaudeUnlockDetector(client, user.tenantId, id),
      judge: new ClaudeJudge(client, user.tenantId, { lexicon: lib.lexicon!, rules: [...lib.rules.values()] }, id),
    };
  }
  // The exit draw follows the rep's attempt number on this scenario (decision 0005); the user id keys the sequence.
  const exitDraw = exitDrawFor(user.id, scenarioCode, attempt);
  const session = new PracticeSession({
    library: library(),
    scenarioCode,
    language: lang,
    seed: `${user.id}:${scenarioCode}:${attempt}`,
    exitDraw,
    tenantId: user.tenantId,
    sessionId: id,
    textMode: true,
    stopOnCritical: user.stopOnCritical,
    ai,
  });
  const opening = session.start();
  await asUser(principal(user), async (db) => {
    await createPracticeSession(db, user, { id, scenarioCode, releaseId: release?.id ?? null, language: session.language, mode: "practice", channel: session.scenario.channel, textMode: true, seed: `${user.id}:${scenarioCode}:${attempt}`, exitDraw });
    await insertTurns(db, user.tenantId, id, session.transcript.map((t) => ({ ...t, isObjection: t.isObjection })));
  });
  live.set(id, { id, session, userId: user.id, tenantId: user.tenantId, createdAt: Date.now(), persistedTurns: session.transcript.length, usage, result: null });
  return { id, session, opening };
}

/** A live session, only for the rep who owns it. */
export function liveSession(id: string, user: { id: string }): Live | null {
  const s = live.get(id);
  return s && s.userId === user.id ? s : null;
}

/** Writes the turns added since the last write (each rep turn and the customer's reply). */
export async function persistNewTurns(s: Live) {
  const fresh = s.session.transcript.slice(s.persistedTurns);
  if (fresh.length === 0) return;
  await asUser({ tenantId: s.tenantId, userId: s.userId }, (db) => insertTurns(db, s.tenantId, s.id, fresh));
  s.persistedTurns = s.session.transcript.length;
}

/**
 * Ends, scores and saves the session, then issues this week's behavior card if the rep has none yet (spec 12.4:
 * the lowest-scoring item across the week, weighted toward stronger evidence).
 */
export async function finishSession(s: Live, user: UserContext): Promise<SessionResult> {
  if (s.result) return s.result;
  const result = await s.session.finish();
  await persistNewTurns(s);
  await asUser(principal(user), async (db) => {
    await saveSessionResult(db, user.tenantId, s.id, {
      endReason: result.engine.endReason,
      events: result.engine.events.map((e) => ({ turnIndex: e.turnIndex, event: e.event, detail: e.detail })),
      violations: result.violations,
      score: result.score,
      debrief: result.debrief,
      usage: s.usage.entries,
    });
    const week = await weekScoreItems(db, user.id);
    const scores = week.map((items) => ({ items: items as unknown as ItemResult[] }) as ScoreResult);
    const choice = chooseWeeklyCard(library(), scores);
    if (choice) await issueCard(db, user.tenantId, user.id, { code: choice.card.code, itemCode: choice.itemCode, sessionId: s.id });
  });
  s.result = result;
  return result;
}

export { withClient };
