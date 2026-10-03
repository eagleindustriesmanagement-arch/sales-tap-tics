import type { Queryable } from "./context.js";

/** The store's usage (spec 19.4, decision 0020): counts and averages only, for its general manager. */
export interface StoreUsage {
  sessions_started: number;
  sessions_completed: number;
  voice_sessions: number;
  reps: number;
  active_reps_today: number;
  active_reps_7d: number;
  avg_daily_active_reps: number;
  median_hours_to_first_session: number | null;
  reps_never_practiced: number;
  debriefs_seen: number;
  demo_watched: number;
  demo_skipped: number;
  cards_issued: number;
  cards_checked: number;
  asr_confidence: Record<string, number>;
  pause_ms_median: number | null;
  model_cost_per_session: number | null;
  latency_ms: Record<string, { median: number; first_token: number | null; calls: number }>;
  weeks: { week: string; started: number; completed: number; active_reps: number }[];
}

/** Null unless the caller is the store's general manager. */
export async function storeUsage(db: Queryable, storeId: string, since: Date): Promise<StoreUsage | null> {
  const r = await db.query<{ u: StoreUsage | null }>("select app.store_usage($1, $2) u", [storeId, since]);
  return r.rows[0]?.u ?? null;
}

/** The rep saw the debrief of their own session; only the first time counts. */
export async function markDebriefSeen(db: Queryable, sessionId: string): Promise<boolean> {
  const r = await db.query("update sessions set debrief_seen_at = now() where id = $1 and user_id = app.user_id() and debrief_seen_at is null", [sessionId]);
  return (r.rowCount ?? 0) > 0;
}
