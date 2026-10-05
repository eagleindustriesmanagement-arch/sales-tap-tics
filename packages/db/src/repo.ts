import { randomBytes } from "node:crypto";
import { hashToken } from "./auth.js";
import type { Queryable } from "./context.js";
import { withDeployLock } from "./migrate.js";

/**
 * Data access for the app (spec 6). Every function runs inside `withTenant`, so row-level security applies; the
 * functions never take a tenant id from the caller except to stamp new rows with the request's own tenant.
 */

export type Role = "rep" | "bdc_agent" | "manager" | "general_manager" | "content_editor" | "compliance_reviewer";

export interface UserContext {
  id: string;
  tenantId: string;
  firstName: string | null;
  preferredLanguage: "en" | "es";
  roles: Role[];
  storeId: string | null;
  privateWindowHours: number;
  audioRetentionDays: number;
  stopOnCritical: boolean;
  consentVersion: string | null;
  /** A manager's team, or an individual practicing on their own (decision 0032). */
  accountKind: "team" | "individual";
  industry: "cars" | "homes" | "solar" | "furniture" | "other";
}

/** Admin access (decision 0032): a privilege any member can hold, stored as the 'general_manager' membership. */
export const isAdmin = (u: Pick<UserContext, "roles">) => u.roles.includes("general_manager");

export async function loadUser(db: Queryable, userId: string): Promise<UserContext | null> {
  const u = await db.query<{ id: string; tenant_id: string; first_name: string | null; preferred_language: "en" | "es" }>(
    "select id, tenant_id, first_name, preferred_language from users where id = $1",
    [userId],
  );
  const user = u.rows[0];
  if (!user) return null;
  const m = await db.query<{ role: Role; store_id: string }>("select role, store_id from memberships where user_id = $1 order by created_at", [userId]);
  const storeId = m.rows[0]?.store_id ?? null;
  const p = storeId
    ? await db.query<{ private_window_hours: number; stop_on_critical: boolean; audio_retention_days: number }>("select private_window_hours, stop_on_critical, audio_retention_days from store_policies where store_id = $1", [storeId])
    : { rows: [] as { private_window_hours: number; stop_on_critical: boolean; audio_retention_days: number }[] };
  const c = await db.query<{ version: string }>("select version from consents where user_id = $1 order by accepted_at desc limit 1", [userId]);
  const t = await db.query<{ kind: "team" | "individual"; industry: UserContext["industry"] }>("select kind, industry from tenants where id = $1", [user.tenant_id]);
  return {
    id: user.id,
    tenantId: user.tenant_id,
    firstName: user.first_name,
    preferredLanguage: user.preferred_language,
    roles: [...new Set(m.rows.map((r) => r.role))],
    storeId,
    privateWindowHours: p.rows[0]?.private_window_hours ?? 24,
    audioRetentionDays: p.rows[0]?.audio_retention_days ?? 180,
    stopOnCritical: p.rows[0]?.stop_on_critical ?? true,
    consentVersion: c.rows[0]?.version ?? null,
    accountKind: t.rows[0]?.kind ?? "team",
    industry: t.rows[0]?.industry ?? "cars",
  };
}

export const isManager = (u: Pick<UserContext, "roles">) => u.roles.includes("manager") || u.roles.includes("general_manager");

export async function setPreferredLanguage(db: Queryable, userId: string, language: "en" | "es") {
  await db.query("update users set preferred_language = $2 where id = $1", [userId, language]);
}

export async function recordConsent(db: Queryable, user: Pick<UserContext, "id" | "tenantId">, version: string, language: "en" | "es") {
  await db.query("insert into consents (tenant_id, user_id, version, language) values ($1, $2, $3, $4) on conflict (user_id, version) do nothing", [user.tenantId, user.id, version, language]);
  await audit(db, user, "consent.accepted", "user", user.id, { version, language });
}

export async function audit(db: Queryable, actor: Pick<UserContext, "id" | "tenantId"> | { id: null; tenantId: string }, action: string, targetType: string, targetId: string | null, detail: Record<string, unknown> = {}) {
  await db.query("insert into audit_log (tenant_id, actor_id, action, target_type, target_id, detail) values ($1, $2, $3, $4, $5, $6)", [actor.tenantId, actor.id, action, targetType, targetId, JSON.stringify(detail)]);
}

// ---------------------------------------------------------------- practice sessions

export interface NewSession {
  id: string;
  scenarioCode: string;
  releaseId: string | null;
  language: "en" | "es";
  mode: "demo" | "practice" | "certification" | "warm_up" | "customer_prep";
  channel: "floor" | "phone" | "text";
  textMode: boolean;
  seed: string;
  exitDraw: number;
  /** The store's exit-rate multiplier the session ran under (spec 19.2 item 1). */
  exitMultiplier?: number;
  /** Whether the rep watched the demonstration first (spec 19.4); null when not recorded. */
  demoWatched?: boolean | null;
}

/** Spec 3.3 rule 3: practice is private for the store's window; certification is visible immediately. */
export async function createPracticeSession(db: Queryable, user: UserContext, s: NewSession) {
  if (!user.storeId) throw new Error("user has no store");
  const privateUntil = s.mode === "practice" || s.mode === "warm_up" ? new Date(Date.now() + user.privateWindowHours * 3_600_000) : null;
  await db.query(
    `insert into sessions (id, tenant_id, user_id, store_id, scenario_code, release_id, language, mode, channel, text_mode, seed, exit_draw, private_until, exit_multiplier, demo_watched)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [s.id, user.tenantId, user.id, user.storeId, s.scenarioCode, s.releaseId, s.language, s.mode, s.channel, s.textMode, s.seed, s.exitDraw, privateUntil, s.exitMultiplier ?? 1, s.demoWatched ?? null],
  );
}

export interface TurnRow {
  index: number;
  speaker: "rep" | "customer";
  text: string;
  language?: string;
  startedMs?: number;
  endedMs?: number;
  pauseBeforeMs?: number;
  wordsPerMinute?: number;
  asrConfidence?: number;
  isObjection?: boolean;
  /** The customer's line with its bracket cues (kept to rebuild a live session). */
  raw?: string;
}

/**
 * A rep's own unfinished session and its turns, to rebuild it on another server instance. Null once the session
 * has ended or when the caller does not own it (row-level security decides).
 */
export async function liveSessionRecord(db: Queryable, sessionId: string, userId: string) {
  const s = await db.query<{ scenario_code: string; language: "en" | "es"; mode: string; seed: string; exit_draw: number | null; text_mode: boolean; exit_multiplier: string; created_at: Date }>(
    "select scenario_code, language, mode, seed, exit_draw, text_mode, exit_multiplier, created_at from sessions where id = $1 and user_id = $2 and ended_at is null",
    [sessionId, userId],
  );
  const row = s.rows[0];
  if (!row) return null;
  const t = await db.query<{ index: number; speaker: "rep" | "customer"; text: string; language_detected: string | null; started_ms: number | null; ended_ms: number | null; pause_before_ms: number | null; words_per_minute: number | null; asr_confidence: number | null; is_objection: boolean; raw_text: string | null }>(
    "select index, speaker, text, language_detected, started_ms, ended_ms, pause_before_ms, words_per_minute, asr_confidence, is_objection, raw_text from turns where session_id = $1 order by index",
    [sessionId],
  );
  return {
    scenarioCode: row.scenario_code,
    language: row.language,
    mode: row.mode,
    seed: row.seed,
    exitDraw: row.exit_draw,
    textMode: row.text_mode,
    exitMultiplier: Number(row.exit_multiplier),
    createdAt: row.created_at,
    turns: t.rows.map((r) => ({
      index: r.index,
      speaker: r.speaker,
      text: r.text,
      language: (r.language_detected === "es" ? "es" : "en") as "en" | "es",
      startedMs: r.started_ms ?? undefined,
      endedMs: r.ended_ms ?? undefined,
      pauseBeforeMs: r.pause_before_ms ?? undefined,
      wordsPerMinute: r.words_per_minute ?? undefined,
      asrConfidence: r.asr_confidence ?? undefined,
      isObjection: r.is_objection,
      raw: r.raw_text ?? undefined,
    })),
  };
}

export async function insertTurns(db: Queryable, tenantId: string, sessionId: string, turns: TurnRow[]) {
  for (const t of turns) {
    await db.query(
      `insert into turns (tenant_id, session_id, index, speaker, text, language_detected, started_ms, ended_ms, pause_before_ms, words_per_minute, asr_confidence, is_objection, raw_text)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) on conflict (session_id, index) do nothing`,
      [tenantId, sessionId, t.index, t.speaker, t.text, t.language ?? null, t.startedMs ?? null, t.endedMs ?? null, t.pauseBeforeMs ?? null, t.wordsPerMinute ?? null, t.asrConfidence ?? null, t.isObjection ?? false, t.raw ?? null],
    );
  }
}

export interface SessionResultRow {
  endReason: string | null;
  events: { turnIndex: number; event: string; detail: Record<string, unknown> }[];
  violations: { turnIndex?: number; rule: string; severity: string; span: { text: string }; trueFact: unknown; layer: string; uncertain: boolean }[];
  score: { rubric: string; total: number; passed: boolean; honestyPassed: boolean; dimensions: unknown; items: unknown; judgeModel: string | null; judgePromptVersion: string | null; partial: boolean; coverage: number };
  debrief: unknown;
  usage: { purpose: string; model: string; promptVersion: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; costUsd: number; latencyMs: number; firstTokenMs: number | null; ok: boolean }[];
}

/** Writes everything a finished session produced (spec 5.2 items 7 and 8). Scores are immutable once written. */
export async function saveSessionResult(db: Queryable, tenantId: string, sessionId: string, r: SessionResultRow) {
  await db.query("update sessions set ended_at = now(), end_reason = $2 where id = $1 and ended_at is null", [sessionId, r.endReason]);
  // Passing an assigned scenario completes the assignment (spec 14.5 item 4, decision 0030). A failed or partial
  // score leaves it open: the rep has practiced it, not done it.
  if (r.score.passed) {
    await db.query(
      `update assignments a set completed_at = now()
       from sessions s where s.id = $1 and a.user_id = s.user_id and a.scenario_code = s.scenario_code
         and a.completed_at is null and a.created_at <= s.started_at`,
      [sessionId],
    );
  }
  for (const e of r.events) {
    await db.query("insert into scenario_state_events (tenant_id, session_id, turn_index, event, detail) values ($1, $2, $3, $4, $5)", [tenantId, sessionId, e.turnIndex, e.event, JSON.stringify(e.detail)]);
  }
  for (const v of r.violations) {
    await db.query(
      "insert into violations (tenant_id, session_id, turn_index, rule_code, severity, span, true_fact, layer, uncertain) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [tenantId, sessionId, v.turnIndex ?? null, v.rule, v.severity, v.span.text, JSON.stringify(v.trueFact), v.layer, v.uncertain],
    );
  }
  await db.query(
    `insert into scores (tenant_id, session_id, rubric_code, total, passed, honesty_passed, dimensions, items, judge_model, judge_prompt_version)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) on conflict (session_id) do nothing`,
    [tenantId, sessionId, r.score.rubric, r.score.total, r.score.passed, r.score.honestyPassed, JSON.stringify({ ...(r.score.dimensions as object), partial: r.score.partial, coverage: r.score.coverage }), JSON.stringify(r.score.items), r.score.judgeModel, r.score.judgePromptVersion],
  );
  await db.query("insert into debriefs (tenant_id, session_id, body) values ($1, $2, $3) on conflict (session_id) do nothing", [tenantId, sessionId, JSON.stringify(r.debrief)]);
  for (const u of r.usage) {
    await db.query(
      `insert into model_usage (tenant_id, session_id, purpose, model, prompt_version, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, latency_ms, first_token_ms, ok)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [tenantId, sessionId, u.purpose, u.model, u.promptVersion, u.inputTokens, u.outputTokens, u.cacheReadTokens, u.cacheWriteTokens, u.costUsd, u.latencyMs, u.firstTokenMs, u.ok],
    );
  }
}

export interface SessionSummary {
  id: string;
  userId: string;
  scenarioCode: string;
  language: string;
  mode: string;
  startedAt: Date;
  endedAt: Date | null;
  endReason: string | null;
  total: number | null;
  passed: boolean | null;
  partial: boolean | null;
  privateUntil: Date | null;
}

/** Sessions the current viewer may see (RLS decides), newest first. */
export async function listSessions(db: Queryable, opts: { userId?: string; limit?: number } = {}): Promise<SessionSummary[]> {
  const r = await db.query(
    `select s.id, s.user_id, s.scenario_code, s.language, s.mode, s.started_at, s.ended_at, s.end_reason, s.private_until,
            sc.total, sc.passed, (sc.dimensions->>'partial')::boolean as partial
     from sessions s left join scores sc on sc.session_id = s.id
     where ($1::uuid is null or s.user_id = $1)
     order by s.started_at desc limit $2`,
    [opts.userId ?? null, opts.limit ?? 50],
  );
  return r.rows.map((x) => ({ id: x.id, userId: x.user_id, scenarioCode: x.scenario_code, language: x.language, mode: x.mode, startedAt: x.started_at, endedAt: x.ended_at, endReason: x.end_reason, total: x.total, passed: x.passed, partial: x.partial, privateUntil: x.private_until }));
}

/** Per-scenario progress for one user: attempts, best complete score, whether any attempt passed, last attempt. */
export async function scenarioProgress(db: Queryable, userId: string) {
  const r = await db.query(
    `select s.scenario_code, count(*)::int attempts,
            max(sc.total) filter (where not coalesce((sc.dimensions->>'partial')::boolean, false)) best,
            coalesce(bool_or(sc.passed), false) passed, max(s.started_at) last_at
     from sessions s left join scores sc on sc.session_id = s.id
     where s.user_id = $1 group by s.scenario_code`,
    [userId],
  );
  return new Map(r.rows.map((x) => [x.scenario_code as string, { attempts: x.attempts as number, best: x.best === null ? null : Number(x.best), passed: x.passed as boolean, lastAt: x.last_at as Date | null }]));
}

/** A session with its transcript and debrief. Reading someone else's session is audit-logged (spec 3.3 rule 5). */
export async function getSessionDetail(db: Queryable, viewer: Pick<UserContext, "id" | "tenantId">, sessionId: string) {
  const s = await db.query("select id, user_id, scenario_code, language, mode, end_reason, started_at, ended_at from sessions where id = $1", [sessionId]);
  const session = s.rows[0];
  if (!session) return null;
  const turns = await db.query("select index, speaker, text from turns where session_id = $1 order by index", [sessionId]);
  const score = await db.query("select total, passed, honesty_passed, dimensions, items, judge_model from scores where session_id = $1", [sessionId]);
  const debrief = await db.query("select body from debriefs where session_id = $1", [sessionId]);
  if (session.user_id !== viewer.id) await audit(db, viewer, "session.read", "session", sessionId, { owner: session.user_id });
  return { session, turns: turns.rows, score: score.rows[0] ?? null, debrief: debrief.rows[0]?.body ?? null };
}

// ---------------------------------------------------------------- behavior cards and floor checks (spec 12.4, 14)

/** Monday of the week containing `date`, as YYYY-MM-DD, in UTC. */
export function weekOf(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** The week's scored items for a rep: what the card choice reads (spec 12.4 item 1). */
export async function weekScoreItems(db: Queryable, userId: string, week = weekOf()) {
  const r = await db.query<{ items: { code: string; points: number; max: number; status: string }[] }>(
    `select sc.items from scores sc join sessions s on s.id = sc.session_id
     where s.user_id = $1 and s.started_at >= $2::date and s.started_at < $2::date + 7 and s.mode in ('practice', 'certification')`,
    [userId, week],
  );
  return r.rows.map((row) => row.items);
}

/** At most one card per rep per week (unique index). Returns false when this week's card already exists. */
export async function issueCard(db: Queryable, tenantId: string, userId: string, card: { code: string; itemCode: string; sessionId: string | null }, week = weekOf()): Promise<boolean> {
  const r = await db.query(
    "insert into behavior_card_issues (tenant_id, user_id, card_code, item_code, session_id, due_week) values ($1, $2, $3, $4, $5, $6) on conflict (user_id, due_week) do nothing",
    [tenantId, userId, card.code, card.itemCode, card.sessionId, week],
  );
  return (r.rowCount ?? 0) > 0;
}

export interface OpenCard {
  id: string;
  userId: string;
  firstName: string | null;
  cardCode: string;
  itemCode: string;
  issuedAt: Date;
  status: string;
}

/** This week's cards the viewer may see: their own, or their team's for a manager (RLS on cards and users). */
export async function weekCards(db: Queryable, week = weekOf()): Promise<OpenCard[]> {
  const r = await db.query(
    `select c.id, c.user_id, u.first_name, c.card_code, c.item_code, c.issued_at, c.status
     from behavior_card_issues c join users u on u.id = c.user_id
     where c.due_week = $1 order by c.card_code, u.first_name`,
    [week],
  );
  return r.rows.map((x) => ({ id: x.id, userId: x.user_id, firstName: x.first_name, cardCode: x.card_code, itemCode: x.item_code, issuedAt: x.issued_at, status: x.status }));
}

export interface FloorCheckInput {
  cardIssueId: string;
  observed: "yes" | "partly" | "no";
  note: string;
  durationSeconds: number;
  specificFeedback: boolean;
  modeled: boolean;
}

/** Records the check, its coaching-quality row (spec 14.3) and closes the card. Managers only; never their own card. */
export async function recordFloorCheck(db: Queryable, manager: UserContext, input: FloorCheckInput) {
  if (!isManager(manager)) throw new Error("only managers record floor checks");
  const card = await db.query<{ id: string; user_id: string; issued_at: Date; status: string }>("select id, user_id, issued_at, status from behavior_card_issues where id = $1", [input.cardIssueId]);
  const c = card.rows[0];
  if (!c) throw new Error("card not found");
  if (c.user_id === manager.id) throw new Error("a manager cannot check their own card");
  if (c.status !== "open") throw new Error("card already closed");
  const fc = await db.query<{ id: string }>(
    "insert into floor_checks (tenant_id, card_issue_id, manager_id, observed, note, duration_seconds) values ($1, $2, $3, $4, $5, $6) returning id",
    [manager.tenantId, c.id, manager.id, input.observed, input.note.slice(0, 280) || null, Math.max(0, Math.round(input.durationSeconds))],
  );
  const hours = (Date.now() - new Date(c.issued_at).getTime()) / 3_600_000;
  await db.query(
    // The four-part script (spec 14.2) is followed when the manager named one behavior and modeled the line.
    "insert into manager_check_quality (tenant_id, floor_check_id, script_followed, specific_feedback, line_modeled, time_to_feedback_hours) values ($1, $2, $3, $4, $5, $6)",
    [manager.tenantId, fc.rows[0]!.id, input.specificFeedback && input.modeled, input.specificFeedback, input.modeled, Math.round(hours * 10) / 10],
  );
  await db.query("update behavior_card_issues set status = 'checked' where id = $1", [c.id]);
  return fc.rows[0]!.id;
}

/** Friday close: unchecked cards from past weeks become missed (spec 14.1 item 5). Run by the worker. */
export async function markMissedCards(db: Queryable, currentWeek = weekOf()) {
  const r = await db.query("update behavior_card_issues set status = 'missed' where status = 'open' and due_week < $1", [currentWeek]);
  return r.rowCount ?? 0;
}

/** Check completion and timing per manager (spec 14.3, 14.5): what the general manager sees. */
export async function coachingQuality(db: Queryable) {
  const r = await db.query(
    `select fc.manager_id, u.first_name, count(*)::int as checks,
            avg(q.time_to_feedback_hours)::real as avg_hours,
            avg(case when q.specific_feedback then 1 else 0 end)::real as specific_share,
            avg(case when q.line_modeled then 1 else 0 end)::real as modeled_share,
            avg(fc.duration_seconds)::real as avg_seconds
     from floor_checks fc join manager_check_quality q on q.floor_check_id = fc.id join users u on u.id = fc.manager_id
     group by fc.manager_id, u.first_name`,
  );
  return r.rows;
}

/** Team view (spec 14.5 item 1): each visible rep with this week's practice, average score and open card. */
export async function teamOverview(db: Queryable, week = weekOf()) {
  const r = await db.query(
    `select u.id, u.first_name,
            count(s.id) filter (where s.started_at >= $1::date)::int as sessions_this_week,
            avg(sc.total) filter (where coalesce((sc.dimensions->>'partial')::boolean, false) = false)::real as avg_score,
            (select c.card_code from behavior_card_issues c where c.user_id = u.id and c.due_week = $1) as card,
            (select c.status from behavior_card_issues c where c.user_id = u.id and c.due_week = $1) as card_status,
            (select count(*) from violations v join sessions vs on vs.id = v.session_id where vs.user_id = u.id and v.severity = 'critical')::int as critical_flags
     from users u
     join memberships m on m.user_id = u.id and m.role in ('rep', 'bdc_agent')
     left join sessions s on s.user_id = u.id
     left join scores sc on sc.session_id = s.id
     where u.status = 'active'
     group by u.id, u.first_name
     order by u.first_name`,
    [week],
  );
  return r.rows;
}

// ---------------------------------------------------------------- content releases (spec 6.2, 7.4)

/** Publishes a platform release: one immutable row per validated content item. Run as the database owner. */
/**
 * Publishes an immutable platform release: all its items in one transaction under the deploy lock (decision 0025), so a
 * build killed half way leaves nothing, and two builds publishing at once make one release, not two.
 */
export async function publishPlatformRelease(db: Queryable, version: string, changelog: string, items: { kind: string; code: string; body: unknown }[]): Promise<string> {
  return withDeployLock(db, async () => {
    const existing = await db.query<{ id: string }>("select id from content_releases where scope = 'platform' and version = $1", [version]);
    if (existing.rows[0]) return existing.rows[0].id;
    const r = await db.query<{ id: string }>("insert into content_releases (tenant_id, version, scope, changelog) values (null, $1, 'platform', $2) returning id", [version, changelog]);
    const id = r.rows[0]!.id;
    await db.query(
      `insert into content_items (tenant_id, release_id, kind, code, body)
       select null, $1, x.kind, x.code, x.body from jsonb_to_recordset($2::jsonb) as x(kind text, code text, body jsonb)`,
      [id, JSON.stringify(items)],
    );
    return id;
  });
}

export async function latestPlatformRelease(db: Queryable): Promise<{ id: string; version: string } | null> {
  const r = await db.query<{ id: string; version: string }>("select id, version from content_releases where scope = 'platform' order by published_at desc limit 1");
  return r.rows[0] ?? null;
}

// ---------------------------------------------------------------- store setup (spec 3.4, 18.3)

export interface StoreFee {
  code: string;
  nameEn: string;
  nameEs: string;
  amountCents: number;
  kind: "dealer_mandatory" | "government_customer_pays" | "optional";
}

export interface StoreSetup {
  storeId: string;
  storeName: string;
  fees: StoreFee[];
  lenders: { name: string; isCreditAcceptance: boolean }[];
  addOnRemoval: "credit_price" | "show_alternative" | "none_configured";
  referralReward: "none" | "gift" | "cash";
  textConsentEn: string;
  textConsentEs: string;
  privateWindowHours: number;
  audioRetentionDays: number;
  stopOnCritical: boolean;
  walkInMetric: "all_logged_ups" | "qualified_ups";
  languages: ("en" | "es")[];
  spanishRegister: "usted" | "tu";
  /** No reminders in these windows (spec 15.3 item 5); 0 = Sunday, store time. */
  peakHours: { day: number; from: string; to: string }[];
  approvedBy: string | null;
  approvedAt: Date | null;
}

export async function loadStoreSetup(db: Queryable, storeId: string): Promise<StoreSetup | null> {
  const s = await db.query<{ id: string; name: string; settings: Record<string, unknown> }>("select id, name, settings from stores where id = $1", [storeId]);
  const store = s.rows[0];
  if (!store) return null;
  const p = (await db.query("select * from store_policies where store_id = $1", [storeId])).rows[0] ?? {};
  const fees = await db.query("select code, name_en, name_es, amount_cents, kind from store_fees where store_id = $1 order by kind, code", [storeId]);
  const lenders = await db.query("select name, is_credit_acceptance from store_lenders where store_id = $1 order by name", [storeId]);
  return {
    storeId,
    storeName: store.name,
    fees: fees.rows.map((f) => ({ code: f.code, nameEn: f.name_en, nameEs: f.name_es, amountCents: Number(f.amount_cents), kind: f.kind })),
    lenders: lenders.rows.map((l) => ({ name: l.name, isCreditAcceptance: l.is_credit_acceptance })),
    addOnRemoval: p.add_on_removal ?? "none_configured",
    referralReward: p.referral_reward ?? "none",
    textConsentEn: p.text_consent_text_en ?? "",
    textConsentEs: p.text_consent_text_es ?? "",
    privateWindowHours: p.private_window_hours ?? 24,
    audioRetentionDays: p.audio_retention_days ?? 180,
    stopOnCritical: p.stop_on_critical ?? true,
    walkInMetric: p.walk_in_metric ?? "all_logged_ups",
    languages: (store.settings["languages"] as ("en" | "es")[]) ?? ["en", "es"],
    spanishRegister: (store.settings["spanish_register"] as "usted" | "tu") ?? "usted",
    peakHours: (p.peak_hours as StoreSetup["peakHours"] | undefined) ?? [{ day: 6, from: "11:00", to: "17:00" }],
    approvedBy: p.approved_by ?? null,
    approvedAt: p.approved_at ?? null,
  };
}

/**
 * Saves the setup wizard (general manager only). Any change clears the compliance sign-off, because scripts and the
 * compliance checker read these settings (spec 3.4). Every save is audit-logged with what changed.
 */
export async function saveStoreSetup(db: Queryable, user: UserContext, input: Omit<StoreSetup, "storeName" | "approvedBy" | "approvedAt" | "peakHours"> & { peakHours?: StoreSetup["peakHours"] }) {
  if (!user.roles.includes("general_manager")) throw new Error("only a general manager changes store settings");
  const before = await loadStoreSetup(db, input.storeId);
  if (!before) throw new Error("store not found");
  await db.query(
    `insert into store_policies (tenant_id, store_id, add_on_removal, referral_reward, text_consent_text_en, text_consent_text_es, private_window_hours, audio_retention_days, stop_on_critical, walk_in_metric, approved_by, approved_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, null, null)
     on conflict (store_id) do update set add_on_removal = excluded.add_on_removal, referral_reward = excluded.referral_reward,
       text_consent_text_en = excluded.text_consent_text_en, text_consent_text_es = excluded.text_consent_text_es,
       private_window_hours = excluded.private_window_hours, audio_retention_days = excluded.audio_retention_days,
       stop_on_critical = excluded.stop_on_critical, walk_in_metric = excluded.walk_in_metric, approved_by = null, approved_at = null`,
    [user.tenantId, input.storeId, input.addOnRemoval, input.referralReward, input.textConsentEn || null, input.textConsentEs || null, input.privateWindowHours, input.audioRetentionDays, input.stopOnCritical, input.walkInMetric],
  );
  if (input.peakHours) await db.query("update store_policies set peak_hours = $2 where store_id = $1", [input.storeId, JSON.stringify(input.peakHours)]);
  await db.query("update stores set settings = settings || $2::jsonb where id = $1", [input.storeId, JSON.stringify({ languages: input.languages, spanish_register: input.spanishRegister })]);
  await db.query("delete from store_fees where store_id = $1", [input.storeId]);
  for (const f of input.fees) {
    await db.query("insert into store_fees (tenant_id, store_id, code, name_en, name_es, amount_cents, kind) values ($1, $2, $3, $4, $5, $6, $7)", [user.tenantId, input.storeId, f.code, f.nameEn, f.nameEs, f.amountCents, f.kind]);
  }
  await db.query("delete from store_lenders where store_id = $1", [input.storeId]);
  for (const l of input.lenders) {
    await db.query("insert into store_lenders (tenant_id, store_id, name, is_credit_acceptance) values ($1, $2, $3, $4)", [user.tenantId, input.storeId, l.name, l.isCreditAcceptance]);
  }
  const after = await loadStoreSetup(db, input.storeId);
  const strip = (s: StoreSetup | null) => s && { ...s, approvedBy: undefined, approvedAt: undefined };
  await audit(db, user, "store.settings_changed", "store", input.storeId, { before: strip(before), after: strip(after) });
}

/** The compliance reviewer signs off the store's fees and policies (spec 3.2, 3.4). */
export async function approveStoreSetup(db: Queryable, user: UserContext, storeId: string) {
  if (!user.roles.includes("compliance_reviewer")) throw new Error("only a compliance reviewer signs off store settings");
  const r = await db.query("update store_policies set approved_by = $2, approved_at = now() where store_id = $1", [storeId, user.id]);
  if (!r.rowCount) throw new Error("store has no settings to approve");
  await audit(db, user, "store.settings_approved", "store", storeId);
}

// ---------------------------------------------------------------- compliance view (spec 14.5 item 3)

/** Violations the viewer may see (RLS on sessions), by rule, by rep, and the most recent with their true fact. */
export async function complianceFlags(db: Queryable, limit = 30) {
  const byRule = await db.query(
    `select v.rule_code, v.severity, count(*)::int n from violations v join sessions s on s.id = v.session_id
     where not v.uncertain group by v.rule_code, v.severity order by n desc, v.rule_code`,
  );
  const byRep = await db.query(
    `select u.first_name, count(*)::int n, count(*) filter (where v.severity = 'critical')::int critical
     from violations v join sessions s on s.id = v.session_id join users u on u.id = s.user_id
     where not v.uncertain group by u.first_name order by critical desc, n desc`,
  );
  const recent = await db.query(
    `select v.id, v.rule_code, v.severity, v.span, v.true_fact, v.uncertain, v.created_at, s.id as session_id, u.first_name
     from violations v join sessions s on s.id = v.session_id join users u on u.id = s.user_id
     order by v.created_at desc limit $1`,
    [limit],
  );
  return { byRule: byRule.rows, byRep: byRep.rows, recent: recent.rows };
}

// ---------------------------------------------------------------- assignments (spec 14.5 item 4)

export interface Assignment {
  id: string;
  userId: string;
  firstName: string | null;
  scenarioCode: string;
  assignedBy: string;
  assignedByName: string | null;
  dueAt: Date | null;
  reason: string;
  completedAt: Date | null;
  createdAt: Date;
  /** Finished attempts since it was assigned, as far as the viewer may see them (row-level security, private window). */
  attempts: number;
  /** The best complete score among those attempts, if any. */
  best: number | null;
}

const ASSIGNMENT_COLUMNS = `a.id, a.user_id, u.first_name, a.scenario_code, a.assigned_by, app.colleague_first_name(a.assigned_by) as assigned_by_name, a.due_at, a.reason, a.completed_at, a.created_at,
  (select count(*)::int from sessions s where s.user_id = a.user_id and s.scenario_code = a.scenario_code and s.ended_at is not null and s.started_at >= a.created_at) attempts,
  (select max(sc.total) from sessions s join scores sc on sc.session_id = s.id where s.user_id = a.user_id and s.scenario_code = a.scenario_code
     and s.started_at >= a.created_at and not coalesce((sc.dimensions->>'partial')::boolean, false)) best`;
const toAssignment = (x: Record<string, unknown>): Assignment => ({
  id: x.id as string, userId: x.user_id as string, firstName: x.first_name as string | null, scenarioCode: x.scenario_code as string,
  assignedBy: x.assigned_by as string, assignedByName: x.assigned_by_name as string | null, dueAt: x.due_at as Date | null,
  reason: x.reason as string, completedAt: x.completed_at as Date | null, createdAt: x.created_at as Date,
  attempts: (x.attempts as number | undefined) ?? 0, best: x.best === null || x.best === undefined ? null : Number(x.best),
});

/** A manager assigns one scenario to several reps. Row-level security refuses reps outside the manager's scope. */
export async function createAssignments(db: Queryable, manager: UserContext, input: { userIds: string[]; scenarioCode: string; dueAt: Date | null; reason: string }): Promise<string[]> {
  if (!isManager(manager)) throw new Error("only a manager assigns practice");
  // Only reps the manager can see on their own team; anyone else is refused before anything is written.
  const mine = new Set((await assignableReps(db, manager)).map((r) => r.id));
  if (input.userIds.some((id) => !mine.has(id))) throw new Error("not your rep");
  const ids: string[] = [];
  for (const userId of [...new Set(input.userIds)]) {
    const r = await db.query(
      "insert into assignments (tenant_id, user_id, scenario_code, assigned_by, due_at, reason) values ($1, $2, $3, $4, $5, $6) returning id",
      [manager.tenantId, userId, input.scenarioCode, manager.id, input.dueAt, input.reason],
    );
    ids.push(r.rows[0].id);
  }
  return ids;
}

/** Assignments the viewer can see: their own, or their team's for a manager. Open ones first, by due date. */
export async function listAssignments(db: Queryable, opts: { userId?: string; open?: boolean; limit?: number } = {}): Promise<Assignment[]> {
  const r = await db.query(
    `select ${ASSIGNMENT_COLUMNS}
     from assignments a left join users u on u.id = a.user_id
     where ($1::uuid is null or a.user_id = $1) and (not $2 or a.completed_at is null) and a.scenario_code is not null
     order by a.completed_at is not null, a.due_at nulls last, a.created_at desc limit $3`,
    [opts.userId ?? null, opts.open ?? false, opts.limit ?? 100],
  );
  return r.rows.map(toAssignment);
}

/** Reps the manager can assign to, by first name. */
export async function assignableReps(db: Queryable, manager: UserContext): Promise<{ id: string; firstName: string | null }[]> {
  const r = await db.query(
    `select distinct u.id, u.first_name from users u join memberships m on m.user_id = u.id and m.role in ('rep', 'bdc_agent')
     where u.id <> $1 and app.can_view_user(u.id) order by u.first_name`,
    [manager.id],
  );
  return r.rows.map((x) => ({ id: x.id, firstName: x.first_name }));
}

// ---------------------------------------------------------------- cadence and certification (spec 15)

/** One rep's finished sessions, oldest first, as the scheduler reads them; and the rep's onboarding day 1. */
export async function practiceHistory(db: Queryable, userId: string) {
  const r = await db.query(
    `select s.started_at, s.scenario_code, s.mode, sc.total, sc.passed, sc.items, coalesce(sc.honesty_passed, true) honesty_passed,
            coalesce((sc.dimensions->>'partial')::boolean, false) partial,
            coalesce((select array_agg(distinct v.rule_code) from violations v where v.session_id = s.id and v.severity = 'critical' and not v.uncertain), '{}') critical_rules
     from sessions s join scores sc on sc.session_id = s.id
     where s.user_id = $1 and s.ended_at is not null order by s.started_at`,
    [userId],
  );
  const start = await db.query(
    "select coalesce(u.hire_date::timestamptz, (select min(started_at) from sessions where user_id = u.id), u.created_at) started_at from users u where u.id = $1",
    [userId],
  );
  type Item = { code: string; points: number; max: number; status: string };
  const history = r.rows.map((x) => ({
    at: x.started_at as Date,
    scenarioCode: x.scenario_code as string,
    mode: x.mode,
    total: x.total === null ? null : Number(x.total),
    items: ((x.items ?? []) as Item[]).filter((i) => i.status === "scored" && i.max > 0).map((i) => ({ code: i.code, ratio: i.points / i.max })),
    honestyPassed: x.honesty_passed as boolean,
    partial: x.partial as boolean,
    passed: x.passed as boolean,
    criticalRules: x.critical_rules as string[],
  }));
  return { history, startedAt: (start.rows[0]?.started_at as Date | undefined) ?? new Date() };
}

/** Per rep: release 1 scenarios with a current certification pass (70+, honesty, complete score, last 90 days). */
export async function teamCertification(db: Queryable, release1: string[]): Promise<Map<string, number>> {
  const r = await db.query(
    `select s.user_id, count(distinct s.scenario_code)::int certified
     from sessions s join scores sc on sc.session_id = s.id
     where s.mode = 'certification' and sc.total >= 70 and sc.honesty_passed and not coalesce((sc.dimensions->>'partial')::boolean, false)
       and s.started_at > now() - interval '90 days' and s.scenario_code = any($1)
     group by s.user_id`,
    [release1],
  );
  return new Map(r.rows.map((x) => [x.user_id as string, x.certified as number]));
}

// ---------------------------------------------------------------- coach the coach (spec 14.3)

export async function recordCoachPractice(db: Queryable, manager: UserContext, r: { cardCode: string; language: "en" | "es"; text: string; parts: Record<string, boolean>; oneBehavior: boolean; score: number }) {
  if (!isManager(manager)) throw new Error("only managers practice coaching");
  const x = await db.query(
    "insert into coach_practice (tenant_id, manager_id, card_code, language, text, parts, one_behavior, score) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id",
    [manager.tenantId, manager.id, r.cardCode, r.language, r.text, JSON.stringify(r.parts), r.oneBehavior, r.score],
  );
  return x.rows[0].id as string;
}

/** Each visible manager's coach-the-coach practice in the last 30 days: count, average score, last date. */
export async function coachPracticeSummary(db: Queryable) {
  const r = await db.query(
    `select c.manager_id, app.colleague_first_name(c.manager_id) first_name, count(*)::int sessions, avg(c.score)::real avg_score, max(c.created_at) last_at
     from coach_practice c where c.created_at > now() - interval '30 days' group by c.manager_id`,
  );
  return r.rows as { manager_id: string; first_name: string | null; sessions: number; avg_score: number; last_at: Date }[];
}

// ---------------------------------------------------------------- Spanish review (spec 16.3, decision 0010)

export interface SpanishReview {
  contentCode: string;
  lineKey: string;
  enText: string;
  esOriginal: string;
  esFinal: string;
  needsCompliance: boolean;
  reviewedBy: string;
  reviewedAt: Date;
  complianceBy: string | null;
}

export async function listSpanishReviews(db: Queryable, codes?: string[]): Promise<SpanishReview[]> {
  const r = await db.query(
    `select content_code, line_key, en_text, es_original, es_final, needs_compliance, reviewed_by, reviewed_at, compliance_by
     from spanish_reviews where ($1::text[] is null or content_code = any($1))`,
    [codes ?? null],
  );
  return r.rows.map((x) => ({
    contentCode: x.content_code, lineKey: x.line_key, enText: x.en_text, esOriginal: x.es_original, esFinal: x.es_final,
    needsCompliance: x.needs_compliance, reviewedBy: x.reviewed_by, reviewedAt: x.reviewed_at, complianceBy: x.compliance_by,
  }));
}

/** The Spanish reviewer approves a line as is, or with an edit. Re-reviewing replaces the earlier decision. */
export async function saveSpanishReview(db: Queryable, reviewer: UserContext, r: { kind: "scenario" | "persona"; code: string; lineKey: string; en: string; esOriginal: string; esFinal: string; needsCompliance: boolean }) {
  if (!reviewer.roles.includes("content_editor")) throw new Error("only a Spanish reviewer approves Spanish lines");
  await db.query(
    `insert into spanish_reviews (tenant_id, content_kind, content_code, line_key, en_text, es_original, es_final, needs_compliance, reviewed_by)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (tenant_id, content_code, line_key) do update set en_text = excluded.en_text, es_original = excluded.es_original,
       es_final = excluded.es_final, needs_compliance = excluded.needs_compliance, reviewed_by = excluded.reviewed_by, reviewed_at = now()`,
    [reviewer.tenantId, r.kind, r.code, r.lineKey, r.en, r.esOriginal, r.esFinal, r.needsCompliance, reviewer.id],
  );
  await audit(db, reviewer, "spanish.review", r.kind, null, { code: r.code, line: r.lineKey, edited: r.esFinal !== r.esOriginal });
}

/** The compliance reviewer signs off a reviewed line that carries numbers, fees or conditions. */
export async function approveSpanishCompliance(db: Queryable, reviewer: UserContext, code: string, lineKey: string) {
  if (!reviewer.roles.includes("compliance_reviewer")) throw new Error("only the compliance reviewer signs off");
  const r = await db.query("update spanish_reviews set compliance_by = $3, compliance_at = now() where content_code = $1 and line_key = $2 and needs_compliance", [code, lineKey, reviewer.id]);
  if (r.rowCount === 0) throw new Error("no reviewed line with numbers to sign off");
}

// ---------------------------------------------------------------- model usage and cost (M7)

export interface UsageRow { day: string; purpose: string; model: string; calls: number; failures: number; inputTokens: number; outputTokens: number; costUsd: number; p50Ms: number | null; p95Ms: number | null }

/** Model calls, tokens, cost and latency per day, purpose and model, for the last `days` days. */
export async function usageSummary(db: Queryable, days = 30): Promise<{ rows: UsageRow[]; sessions: number }> {
  const r = await db.query(
    `select to_char(date_trunc('day', created_at at time zone 'America/New_York'), 'YYYY-MM-DD') as day, purpose, model,
            count(*)::int calls, count(*) filter (where not ok)::int failures,
            sum(input_tokens)::int input_tokens, sum(output_tokens)::int output_tokens, sum(cost_usd)::float8 cost_usd,
            percentile_cont(0.5) within group (order by latency_ms)::int p50, percentile_cont(0.95) within group (order by latency_ms)::int p95
     from model_usage where created_at > now() - make_interval(days => $1)
     group by 1, 2, 3 order by 1 desc, 2, 3`,
    [days],
  );
  const s = await db.query("select count(distinct session_id)::int n from model_usage where session_id is not null and created_at > now() - make_interval(days => $1)", [days]);
  return {
    rows: r.rows.map((x) => ({ day: x.day, purpose: x.purpose, model: x.model, calls: x.calls, failures: x.failures, inputTokens: x.input_tokens, outputTokens: x.output_tokens, costUsd: x.cost_usd, p50Ms: x.p50, p95Ms: x.p95 })),
    sessions: s.rows[0].n,
  };
}

// ---------------------------------------------------------------- people (spec 18.3 "Users")

export const ROLES: Role[] = ["rep", "bdc_agent", "manager", "general_manager", "content_editor", "compliance_reviewer"];

export interface Person { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; status: "active" | "inactive" | "anonymized"; roles: Role[]; language: "en" | "es" }

/** Everyone in the general manager's store, with their roles. */
export async function listPeople(db: Queryable, storeId: string): Promise<Person[]> {
  const r = await db.query(
    `select u.id, u.first_name, u.last_name, u.email, u.phone, u.status, u.preferred_language,
            coalesce(array_agg(m.role order by m.role) filter (where m.role is not null), '{}') roles
     from users u left join memberships m on m.user_id = u.id and m.store_id = $1
     where exists (select 1 from memberships x where x.user_id = u.id and x.store_id = $1)
     group by u.id order by u.status, u.first_name`,
    [storeId],
  );
  return r.rows.map((x) => ({ id: x.id, firstName: x.first_name, lastName: x.last_name, email: x.email, phone: x.phone, status: x.status, roles: x.roles, language: x.preferred_language }));
}

function requireGm(gm: UserContext) {
  if (!gm.roles.includes("general_manager") || !gm.storeId) throw new Error("only a general manager manages people");
}

/** Adds a person to the store. They sign in with a one-time code to the email or phone given. */
export async function invitePerson(db: Queryable, gm: UserContext, p: { firstName: string; lastName?: string; email?: string; phone?: string; language: "en" | "es"; roles: Role[] }): Promise<string> {
  requireGm(gm);
  if (!p.email && !p.phone) throw new Error("an email or a phone number is needed to sign in");
  if (p.roles.length === 0) throw new Error("at least one role");
  const u = await db.query(
    "insert into users (tenant_id, first_name, last_name, email, phone, preferred_language) values ($1, $2, $3, $4, $5, $6) returning id",
    [gm.tenantId, p.firstName, p.lastName ?? null, p.email?.toLowerCase() ?? null, p.phone ?? null, p.language],
  );
  const id = u.rows[0].id as string;
  for (const role of new Set(p.roles)) await db.query("insert into memberships (tenant_id, user_id, store_id, role) values ($1, $2, $3, $4)", [gm.tenantId, id, gm.storeId, role]);
  await audit(db, gm, "person.invite", "user", id, { roles: p.roles });
  return id;
}

// ---------------------------------------------------------------- invite links (decision 0032)

export interface InviteLink { id: string; role: "rep" | "manager"; uses: number; createdAt: Date }

/** A new link that joins whoever signs up through it to the team. Returns the raw token, shown once. */
export async function createInviteLink(db: Queryable, manager: UserContext, role: "rep" | "manager" = "rep"): Promise<{ id: string; token: string }> {
  if (!isManager(manager) || !manager.storeId) throw new Error("only a manager makes invite links");
  if (role === "manager" && !isAdmin(manager)) throw new Error("only admins invite managers");
  const token = randomBytes(24).toString("base64url");
  const r = await db.query("insert into invite_links (tenant_id, store_id, token_hash, role, created_by) values ($1, $2, $3, $4, $5) returning id", [manager.tenantId, manager.storeId, hashToken(token), role, manager.id]);
  await audit(db, manager, "invite.create", "invite", r.rows[0].id, { role });
  return { id: r.rows[0].id as string, token };
}

/** The team's live links. The raw tokens are never stored, so a lost link is replaced, not recovered. */
export async function listInviteLinks(db: Queryable, storeId: string): Promise<InviteLink[]> {
  const r = await db.query("select id, role, uses, created_at from invite_links where store_id = $1 and revoked_at is null order by created_at desc", [storeId]);
  return r.rows.map((x) => ({ id: x.id, role: x.role, uses: x.uses, createdAt: x.created_at }));
}

export async function revokeInviteLink(db: Queryable, manager: UserContext, id: string): Promise<void> {
  if (!isManager(manager)) throw new Error("only a manager revokes invite links");
  const r = await db.query("update invite_links set revoked_at = now() where id = $1 and revoked_at is null", [id]);
  if (r.rowCount === 0) throw new Error("no such link");
  await audit(db, manager, "invite.revoke", "invite", id);
}

/** Replaces a person's roles in the store. A general manager cannot remove their own general manager role. */
export async function setRoles(db: Queryable, gm: UserContext, userId: string, roles: Role[]) {
  requireGm(gm);
  if (roles.length === 0) throw new Error("at least one role; deactivate the person instead");
  // Only someone already in this store (October 5: a role given to another company's user created a membership
  // pointing across companies; the database now refuses that too, migration 0022).
  const inStore = await db.query("select 1 from users u join memberships m on m.user_id = u.id where u.id = $1 and u.tenant_id = $2 and m.store_id = $3 limit 1", [userId, gm.tenantId, gm.storeId]);
  if (inStore.rowCount === 0) throw new Error("not in your store");
  if (userId === gm.id && !roles.includes("general_manager")) throw new Error("you cannot remove your own general manager role");
  const before = await db.query("select role from memberships where user_id = $1 and store_id = $2", [userId, gm.storeId]);
  const had = new Set(before.rows.map((r) => r.role as Role));
  for (const role of had) if (!roles.includes(role)) await db.query("delete from memberships where user_id = $1 and store_id = $2 and role = $3", [userId, gm.storeId, role]);
  for (const role of new Set(roles)) if (!had.has(role)) await db.query("insert into memberships (tenant_id, user_id, store_id, role) values ($1, $2, $3, $4)", [gm.tenantId, userId, gm.storeId, role]);
  await audit(db, gm, "person.roles", "user", userId, { from: [...had], to: roles });
}

/** Deactivating blocks sign-in at once (every request checks the status); their history stays. */
export async function setPersonStatus(db: Queryable, gm: UserContext, userId: string, status: "active" | "inactive") {
  requireGm(gm);
  if (userId === gm.id) throw new Error("you cannot deactivate yourself");
  const r = await db.query("update users set status = $2 where id = $1 and exists (select 1 from memberships where user_id = $1 and store_id = $3)", [userId, status, gm.storeId]);
  if (r.rowCount === 0) throw new Error("not in your store");
  await audit(db, gm, status === "inactive" ? "person.deactivate" : "person.reactivate", "user", userId);
}

// ---------------------------------------------------------------- progress and rep detail (spec 18.1 Progress, 18.2 Rep detail)

export interface RepProgress {
  /** Average of complete (not partial) scores per dimension, by week, last 8 weeks, oldest first. */
  weeks: { week: string; sessions: number; dimensions: Record<string, number> }[];
  /** Rubric items scored at least twice, weakest first. */
  weakest: { code: string; ratio: number; times: number }[];
  cards: { week: string; cardCode: string; status: string; observed: string | null; note: string | null }[];
}

/** One rep's progress. Row-level security decides who may see it, including the private window. */
export async function progressFor(db: Queryable, userId: string): Promise<RepProgress> {
  const weeks = await db.query(
    `select to_char(date_trunc('week', s.started_at), 'YYYY-MM-DD') week, d.key, avg(d.value::text::float)::real avg, count(distinct s.id)::int n
     from sessions s join scores sc on sc.session_id = s.id, jsonb_each(sc.dimensions) d
     where s.user_id = $1 and s.started_at > now() - interval '56 days' and not coalesce((sc.dimensions->>'partial')::boolean, false)
       and jsonb_typeof(d.value) = 'number' and d.key not in ('coverage')
     group by 1, 2 order by 1`,
    [userId],
  );
  const byWeek = new Map<string, { week: string; sessions: number; dimensions: Record<string, number> }>();
  for (const r of weeks.rows) {
    const w = byWeek.get(r.week) ?? { week: r.week as string, sessions: 0, dimensions: {} as Record<string, number> };
    w.dimensions[r.key] = Math.round(r.avg);
    w.sessions = Math.max(w.sessions, r.n);
    byWeek.set(r.week, w);
  }
  const items = await db.query(
    `select i->>'code' code, avg((i->>'points')::float / nullif((i->>'max')::float, 0))::real ratio, count(*)::int times
     from sessions s join scores sc on sc.session_id = s.id, jsonb_array_elements(sc.items) i
     where s.user_id = $1 and i->>'status' = 'scored' and (i->>'max')::float > 0
     group by 1 having count(*) >= 2 order by 2, 1 limit 3`,
    [userId],
  );
  const cards = await db.query(
    `select c.due_week::text week, c.card_code, c.status, f.observed, f.note
     from behavior_card_issues c left join floor_checks f on f.card_issue_id = c.id
     where c.user_id = $1 order by c.due_week desc limit 12`,
    [userId],
  );
  return {
    weeks: [...byWeek.values()],
    weakest: items.rows.map((r) => ({ code: r.code, ratio: r.ratio, times: r.times })),
    cards: cards.rows.map((r) => ({ week: r.week, cardCode: r.card_code, status: r.status, observed: r.observed, note: r.note })),
  };
}

// ---------------------------------------------------------------- store dashboard (spec 18.3)

export interface StoreWeek { week: string; sessions: number; repsPracticing: number; cardsIssued: number; cardsChecked: number; criticalFlags: number }

/** Return on training for the general manager: certification, practice, floor checks and compliance, by week. */
export async function storeDashboard(db: Queryable, release1: string[], weeks = 8) {
  // Every count is of the same people: active reps. A manager who practices is not a rep who practiced ("3/2").
  const isRep = `select m.user_id from memberships m join users u on u.id = m.user_id and u.status = 'active' where m.role in ('rep', 'bdc_agent')`;
  const reps = await db.query(`select count(distinct user_id)::int n from (${isRep}) r`);
  const certified = await db.query(
    `select count(*)::int n from (
       select s.user_id from sessions s join scores sc on sc.session_id = s.id join users u on u.id = s.user_id and u.status = 'active'
       where s.user_id in (${isRep}) and s.mode = 'certification' and sc.total >= 70 and sc.honesty_passed and not coalesce((sc.dimensions->>'partial')::boolean, false)
         and s.started_at > now() - interval '90 days' and s.scenario_code = any($1)
       group by s.user_id having count(distinct s.scenario_code) = cardinality($1)) x`,
    [release1],
  );
  const r = await db.query(
    `with w as (select generate_series(date_trunc('week', now()) - make_interval(weeks => $1 - 1), date_trunc('week', now()), interval '1 week')::date week)
     select to_char(w.week, 'YYYY-MM-DD') week,
       (select count(*) from sessions s where date_trunc('week', s.started_at)::date = w.week)::int sessions,
       (select count(distinct s.user_id) from sessions s where s.user_id in (${isRep}) and date_trunc('week', s.started_at)::date = w.week)::int reps_practicing,
       (select count(*) from behavior_card_issues c where c.due_week = w.week)::int cards_issued,
       (select count(*) from behavior_card_issues c where c.due_week = w.week and c.status = 'checked')::int cards_checked,
       (select count(*) from violations v join sessions s on s.id = v.session_id where v.severity = 'critical' and not v.uncertain and date_trunc('week', s.started_at)::date = w.week)::int critical_flags
     from w order by w.week`,
    [weeks],
  );
  return {
    reps: reps.rows[0].n as number,
    certified: certified.rows[0].n as number,
    weeks: r.rows.map((x) => ({ week: x.week, sessions: x.sessions, repsPracticing: x.reps_practicing, cardsIssued: x.cards_issued, cardsChecked: x.cards_checked, criticalFlags: x.critical_flags })) as StoreWeek[],
  };
}

// ---------------------------------------------------------------- score overrides, audit log, export (spec 3.3, 18.3, 14.5)

export const OVERRIDE_FLAGS = ["judge_disagrees", "audio_problem", "scenario_problem", "other"] as const;
export type OverrideFlag = (typeof OVERRIDE_FLAGS)[number];

/** A manager's flag and reason on a session's score; the score itself never changes (spec 3.3 rule 4). */
export async function addScoreOverride(db: Queryable, manager: UserContext, sessionId: string, o: { flag: OverrideFlag; reason: string }) {
  if (!isManager(manager)) throw new Error("only managers flag a score");
  const sc = await db.query("select sc.id, s.user_id from scores sc join sessions s on s.id = sc.session_id where sc.session_id = $1", [sessionId]);
  if (!sc.rows[0]) throw new Error("no score to flag");
  if (sc.rows[0].user_id === manager.id) throw new Error("you cannot flag your own score");
  await db.query("insert into score_overrides (tenant_id, score_id, manager_id, reason, flag) values ($1, $2, $3, $4, $5)", [manager.tenantId, sc.rows[0].id, manager.id, o.reason, o.flag]);
  await audit(db, manager, "score.override", "session", sessionId, { flag: o.flag });
}

export async function listScoreOverrides(db: Queryable, sessionId: string) {
  const r = await db.query(
    `select o.flag, o.reason, o.created_at, app.colleague_first_name(o.manager_id) manager
     from score_overrides o join scores sc on sc.id = o.score_id where sc.session_id = $1 order by o.created_at`,
    [sessionId],
  );
  return r.rows as { flag: OverrideFlag; reason: string; created_at: Date; manager: string | null }[];
}

/** The latest audit entries, newest first (general manager only, by row-level security). */
export async function auditEntries(db: Queryable, limit = 200) {
  const r = await db.query(
    `select a.at, a.action, a.target_type, a.target_id, a.detail, app.colleague_first_name(a.actor_id) actor,
            case when a.target_type = 'user' then app.colleague_first_name(a.target_id) end target_name
     from audit_log a order by a.at desc limit $1`,
    [limit],
  );
  return r.rows as { at: Date; action: string; target_type: string; target_id: string | null; detail: Record<string, unknown>; actor: string | null; target_name: string | null }[];
}

/** Sessions and scores for the store's own records (spec 14.5 item 6). Visibility follows row-level security. */
export async function exportSessions(db: Queryable) {
  const r = await db.query(
    `select s.started_at, app.colleague_first_name(s.user_id) rep, s.scenario_code, s.mode, s.language, s.end_reason,
            sc.total, sc.passed, sc.honesty_passed, coalesce((sc.dimensions->>'partial')::boolean, false) partial,
            (select count(*) from violations v where v.session_id = s.id and v.severity = 'critical' and not v.uncertain)::int critical_flags,
            (select count(*) from score_overrides o where o.score_id = sc.id)::int overrides
     from sessions s left join scores sc on sc.session_id = s.id where s.ended_at is not null order by s.started_at`,
  );
  return r.rows;
}

/** RFC 4180 CSV. Cells that a spreadsheet would run as a formula are prefixed with a quote. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------- personal settings (spec 18.1 Settings)

export async function personalSettings(db: Queryable, userId: string) {
  const r = await db.query("select to_char(reminder_time, 'HH24:MI') reminder_time from users where id = $1", [userId]);
  return { reminderTime: (r.rows[0]?.reminder_time as string | null) ?? null };
}

/** A user sets their own daily reminder time (local "HH:MM"), or clears it. */
export async function setReminderTime(db: Queryable, userId: string, time: string | null) {
  if (time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("time must be HH:MM");
  await db.query("update users set reminder_time = $2::time where id = $1", [userId, time]);
}
