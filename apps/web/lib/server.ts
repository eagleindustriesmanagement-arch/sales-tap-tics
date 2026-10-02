import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { AiClient, ClaudeComplianceClassifier, ClaudeJudge, ClaudeUnlockDetector, MemoryUsageSink } from "@taptics/ai";
import { platformLibrary } from "@taptics/content";
import {
  createPracticeSession, currentExitMultiplier, insertTurns, issueCard, latestPlatformRelease, loadStoreSetup, practiceHistory, saveSessionResult, weekScoreItems, type UserContext,
} from "@taptics/db";
import { exitDrawFor } from "@taptics/engine";
import { isLanguage, type Language } from "@taptics/i18n";
import { chooseWeeklyCard, type ItemResult, type ScoreResult } from "@taptics/scoring";
import { certificationSeed, certificationState, certifiedForUps, PracticeSession, type ScenarioMeta, type SessionResult } from "@taptics/session";
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

export async function startSession(user: UserContext, scenarioCode: string, lang: Language | "follow", mode: "practice" | "certification" = "practice") {
  sweep();
  const id = randomUUID();
  const { recent, attempt, certAttempt, release, store, history, exitMultiplier } = await asUser(principal(user), async (db) => {
    const r = await db.query<{ recent: number; attempt: number; cert_attempt: number }>(
      `select count(*) filter (where started_at > now() - interval '1 minute')::int recent, count(*) filter (where scenario_code = $2)::int attempt,
              count(*) filter (where scenario_code = $2 and mode = 'certification')::int cert_attempt
       from sessions where user_id = $1`,
      [user.id, scenarioCode],
    );
    return {
      ...r.rows[0]!,
      certAttempt: r.rows[0]!.cert_attempt,
      release: await latestPlatformRelease(db),
      store: user.storeId ? await loadStoreSetup(db, user.storeId) : null,
      exitMultiplier: user.storeId && mode === "practice" ? await currentExitMultiplier(db, user.storeId) : 1,
      history: mode === "certification" ? (await practiceHistory(db, user.id)).history : [],
    };
  });
  if (recent >= STARTS_PER_MINUTE) return { error: "rate_limited" as const };
  if (mode === "certification") {
    // Offline scores are partial and can never certify, so certification needs the live judge (spec 15.4, decision 0004).
    if (!aiConfigured()) return { error: "needs_judge" as const };
    const now = new Date();
    const recert = certifiedForUps(user.id, scheduleInputs().scenarios, history, now).recertDue.includes(scenarioCode);
    if (!recert && certificationState(scenarioCode, history, now).state !== "eligible") return { error: "not_eligible" as const };
  }

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
  // Certification uses a fixed set of seeds and exit draws, so every rep faces comparable customers (spec 15.4).
  const certification = mode === "certification";
  const seed = certification ? certificationSeed(scenarioCode, certAttempt) : `${user.id}:${scenarioCode}:${attempt}`;
  const exitDraw = certification ? exitDrawFor("certification", scenarioCode, certAttempt % 3) : exitDrawFor(user.id, scenarioCode, attempt);
  const session = new PracticeSession({
    library: library(),
    scenarioCode,
    language: lang,
    seed,
    exitDraw,
    mode: certification ? "certification" : "practice",
    tenantId: user.tenantId,
    sessionId: id,
    textMode: true,
    // Stop on critical is always on in certification (spec 15.4).
    stopOnCritical: certification || user.stopOnCritical,
    // The store's real charges and policies drive the compliance checker (spec 3.4). Until the compliance reviewer
    // signs them off, the removal policy is treated as not configured: the strictest reading (spec 4.5).
    exitMultiplier,
    dealerFees: store?.fees.filter((f) => f.kind === "dealer_mandatory").map((f) => ({ code: f.code, cents: f.amountCents })),
    store: {
      addOnRemovalPolicy: store?.approvedAt ? store.addOnRemoval : "none_configured",
      ignoredIdentityPlaces: store ? store.storeName.split(/\s+/).filter((w) => w.length > 3) : [],
    },
    ai,
  });
  const opening = session.start();
  await asUser(principal(user), async (db) => {
    await createPracticeSession(db, user, { id, scenarioCode, releaseId: release?.id ?? null, language: session.language, mode, channel: session.scenario.channel, textMode: true, seed, exitDraw, exitMultiplier });
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

/** Every active scenario as the recommender sees it: level and how often reps meet its objection. */
export function practiceList(lib = library()) {
  return [...lib.scenarios.values()]
    .filter((s) => s.status === "active")
    .map((s) => ({ code: s.code, difficulty: s.difficulty, weight: lib.objections.get(s.objection)?.frequency_weight ?? 1 }));
}

/** 11:59 pm on a calendar day in the store's time zone (Miami), as an instant. */
export function endOfDayInStore(date: string, timeZone = "America/New_York"): Date {
  const noon = new Date(`${date}T12:00:00Z`);
  const offset = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(noon).find((p) => p.type === "timeZoneName")!.value;
  const m = /GMT([+-]\d+)?(?::(\d+))?/.exec(offset)!;
  const hours = Number(m[1] ?? 0);
  const sign = hours < 0 || m[1]?.startsWith("-") ? "-" : "+";
  const hh = String(Math.abs(hours)).padStart(2, "0");
  const mm = String(m[2] ?? "0").padStart(2, "0");
  return new Date(`${date}T23:59:00${sign}${hh}:${mm}`);
}

/** The scheduler's view of the library: every active scenario and the rubric items it scores. */
export function scheduleInputs(lib = library()) {
  const scenarios: ScenarioMeta[] = [...lib.scenarios.values()]
    .filter((s) => s.status === "active")
    .map((s) => {
      const o = lib.objections.get(s.objection);
      return { code: s.code, objection: s.objection, difficulty: s.difficulty, weight: o?.frequency_weight ?? 1, release1: o?.release_1 ?? false };
    });
  const itemsByScenario = new Map([...lib.scenarios.values()].map((s) => [s.code, (s.scoring?.items ?? []).map((i) => i.code)]));
  return { scenarios, itemsByScenario };
}

/** Plain-language behavior for any rubric item code, universal or scenario-specific. */
export function itemBehavior(code: string, lib = library()) {
  for (const r of lib.rubrics.values()) {
    const item = r.items.find((i) => i.code === code);
    if (item) return item.behavior;
  }
  for (const s of lib.scenarios.values()) {
    const item = s.scoring?.items.find((i) => i.code === code);
    if (item) return item.behavior;
  }
  return null;
}
