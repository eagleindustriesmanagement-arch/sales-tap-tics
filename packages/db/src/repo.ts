import type { Queryable } from "./context.js";

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
}

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
}

/** Spec 3.3 rule 3: practice is private for the store's window; certification is visible immediately. */
export async function createPracticeSession(db: Queryable, user: UserContext, s: NewSession) {
  if (!user.storeId) throw new Error("user has no store");
  const privateUntil = s.mode === "practice" || s.mode === "warm_up" ? new Date(Date.now() + user.privateWindowHours * 3_600_000) : null;
  await db.query(
    `insert into sessions (id, tenant_id, user_id, store_id, scenario_code, release_id, language, mode, channel, text_mode, seed, exit_draw, private_until)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [s.id, user.tenantId, user.id, user.storeId, s.scenarioCode, s.releaseId, s.language, s.mode, s.channel, s.textMode, s.seed, s.exitDraw, privateUntil],
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
}

export async function insertTurns(db: Queryable, tenantId: string, sessionId: string, turns: TurnRow[]) {
  for (const t of turns) {
    await db.query(
      `insert into turns (tenant_id, session_id, index, speaker, text, language_detected, started_ms, ended_ms, pause_before_ms, words_per_minute, asr_confidence, is_objection)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) on conflict (session_id, index) do nothing`,
      [tenantId, sessionId, t.index, t.speaker, t.text, t.language ?? null, t.startedMs ?? null, t.endedMs ?? null, t.pauseBeforeMs ?? null, t.wordsPerMinute ?? null, t.asrConfidence ?? null, t.isObjection ?? false],
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
     group by u.id, u.first_name
     order by u.first_name`,
    [week],
  );
  return r.rows;
}

// ---------------------------------------------------------------- content releases (spec 6.2, 7.4)

/** Publishes a platform release: one immutable row per validated content item. Run as the database owner. */
export async function publishPlatformRelease(db: Queryable, version: string, changelog: string, items: { kind: string; code: string; body: unknown }[]): Promise<string> {
  const existing = await db.query<{ id: string }>("select id from content_releases where scope = 'platform' and version = $1", [version]);
  if (existing.rows[0]) return existing.rows[0].id;
  const r = await db.query<{ id: string }>("insert into content_releases (tenant_id, version, scope, changelog) values (null, $1, 'platform', $2) returning id", [version, changelog]);
  const id = r.rows[0]!.id;
  for (const item of items) {
    await db.query("insert into content_items (tenant_id, release_id, kind, code, body) values (null, $1, $2, $3, $4)", [id, item.kind, item.code, JSON.stringify(item.body)]);
  }
  return id;
}

export async function latestPlatformRelease(db: Queryable): Promise<{ id: string; version: string } | null> {
  const r = await db.query<{ id: string; version: string }>("select id, version from content_releases where scope = 'platform' order by published_at desc limit 1");
  return r.rows[0] ?? null;
}
