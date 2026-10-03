import type { Queryable } from "./context.js";
import { audit, type UserContext } from "./repo.js";

/** The first day of the month, UTC, as YYYY-MM-01. */
export const monthOf = (d: Date) => `${d.toISOString().slice(0, 7)}-01`;

/** The exit multiplier practice sessions start under now: the latest month calibrated, or 1 (spec 19.2 item 1). */
export async function currentExitMultiplier(db: Queryable, storeId: string, now = new Date()): Promise<number> {
  const r = await db.query<{ m: string }>(
    "select value->>'multiplier' m from store_calibrations where store_id = $1 and kind = 'exit_rates' and month <= $2 order by month desc limit 1",
    [storeId, monthOf(now)],
  );
  return r.rows[0] ? Number(r.rows[0].m) : 1;
}

/**
 * What a month's calibration starts from: the multiplier set before this month (so recomputing a month never
 * compounds), the store's real ups and sales over the last 3 imported months, and the practice sessions of the
 * last 90 days that ran under that multiplier.
 */
export async function exitCalibrationInputs(db: Queryable, storeId: string, now = new Date()) {
  const month = monthOf(now);
  const prev = await db.query<{ m: string }>(
    "select value->>'multiplier' m from store_calibrations where store_id = $1 and kind = 'exit_rates' and month < $2 order by month desc limit 1",
    [storeId, month],
  );
  const current = prev.rows[0] ? Number(prev.rows[0].m) : 1;
  const real = await db.query<{ ups: number; sold: number }>(
    `with recent as (select month from store_metrics where store_id = $1 and kind = 'ups' group by month order by month desc limit 3)
     select coalesce(sum((metrics->>'ups')::int), 0)::int ups, coalesce(sum((metrics->>'sold')::int), 0)::int sold
     from store_metrics where store_id = $1 and kind = 'ups' and month in (select month from recent)`,
    [storeId],
  );
  const since = new Date(now.getTime() - 90 * 86_400_000);
  const practice = await db.query<{ sessions: number; exits: number }>("select * from app.store_exit_counts($1, $2, $3)", [storeId, since, current]);
  return { month, current, ups: real.rows[0]!.ups, sold: real.rows[0]!.sold, sessions: practice.rows[0]!.sessions, exits: practice.rows[0]!.exits };
}

export async function saveExitCalibration(db: Queryable, gm: UserContext, month: string, value: Record<string, unknown> & { multiplier: number }) {
  if (!gm.storeId) throw new Error("no store");
  await db.query(
    `insert into store_calibrations (tenant_id, store_id, kind, month, value, computed_by) values ($1, $2, 'exit_rates', $3, $4, $5)
     on conflict (store_id, kind, month) do update set value = excluded.value, computed_by = excluded.computed_by`,
    [gm.tenantId, gm.storeId, month, JSON.stringify(value), gm.id],
  );
  await audit(db, gm, "store.calibrate", "store", gm.storeId, { kind: "exit_rates", month, ...value });
}

export async function latestExitCalibration(db: Queryable, storeId: string) {
  const r = await db.query<{ month: string; value: Record<string, unknown> }>(
    "select to_char(month, 'YYYY-MM') as month, value from store_calibrations where store_id = $1 and kind = 'exit_rates' order by month desc limit 1",
    [storeId],
  );
  return r.rows[0] ?? null;
}

/** The store's lost-deal reasons over the last 3 imported months, summed by reason (spec 19.2 item 2). */
export async function lostReasonCounts(db: Queryable, storeId: string) {
  const r = await db.query<{ reason: string; count: number }>(
    `with recent as (select month from store_metrics where store_id = $1 and kind = 'lost_reasons' group by month order by month desc limit 3)
     select dimension reason, sum((metrics->>'count')::int)::int count
     from store_metrics where store_id = $1 and kind = 'lost_reasons' and month in (select month from recent)
     group by dimension order by count desc, dimension`,
    [storeId],
  );
  return r.rows;
}

export async function saveObjectionWeights(db: Queryable, gm: UserContext, month: string, value: Record<string, unknown>) {
  if (!gm.storeId) throw new Error("no store");
  await db.query(
    `insert into store_calibrations (tenant_id, store_id, kind, month, value, computed_by) values ($1, $2, 'objection_weights', $3, $4, $5)
     on conflict (store_id, kind, month) do update set value = excluded.value, computed_by = excluded.computed_by`,
    [gm.tenantId, gm.storeId, month, JSON.stringify(value), gm.id],
  );
  await audit(db, gm, "store.calibrate", "store", gm.storeId, { kind: "objection_weights", month, status: value["status"], matched: value["matched"] });
}

/** The latest objection weighting for the store, or null before the first lost-reasons import. */
export async function latestObjectionWeights(db: Queryable, storeId: string) {
  const r = await db.query<{ month: string; value: Record<string, unknown> }>(
    "select to_char(month, 'YYYY-MM') as month, value from store_calibrations where store_id = $1 and kind = 'objection_weights' order by month desc limit 1",
    [storeId],
  );
  return r.rows[0] ?? null;
}

/** The weights practice plans use now: the latest month's, when it had enough data; otherwise none (all 1). */
export async function currentObjectionWeights(db: Queryable, storeId: string): Promise<Record<string, number>> {
  const latest = await latestObjectionWeights(db, storeId);
  const weights = latest?.value["status"] === "updated" ? latest.value["weights"] : null;
  return weights && typeof weights === "object" ? (weights as Record<string, number>) : {};
}

/**
 * Score validity inputs (spec 19.2 item 3, decision 0024), per matched rep: complete practice scores of the last 13
 * weeks the caller may see (row-level security keeps private-window sessions out), averaged by dimension, and the
 * rep's ups, sales, add-ons and cancellations over the last 3 imported months.
 */
export async function scoreValidityInputs(db: Queryable, storeId: string, now = new Date()) {
  const since = new Date(now.getTime() - 91 * 86_400_000);
  const r = await db.query<{
    sessions: number; total: number | null; composure: number | null; discovery: number | null; technique: number | null; outcome: number | null;
    ups: number; sold: number; addons_sold: number | null; cancelled: number | null;
  }>(
    `with practice as (
       select s.user_id, count(*)::int sessions, avg(sc.total)::real total,
              avg((sc.dimensions->>'composure')::real)::real composure, avg((sc.dimensions->>'discovery')::real)::real discovery,
              avg((sc.dimensions->>'technique')::real)::real technique, avg((sc.dimensions->>'outcome')::real)::real outcome
       from sessions s join scores sc on sc.session_id = s.id
       where s.store_id = $1 and s.started_at >= $2 and s.mode in ('practice', 'certification') and not coalesce((sc.dimensions->>'partial')::boolean, false)
       group by s.user_id),
     ups_months as (select month from store_metrics where store_id = $1 and kind = 'ups' group by month order by month desc limit 3),
     addon_months as (select month from store_metrics where store_id = $1 and kind = 'addons' group by month order by month desc limit 3),
     ups as (select rep_user_id, sum((metrics->>'ups')::int)::int ups, sum((metrics->>'sold')::int)::int sold
             from store_metrics where store_id = $1 and kind = 'ups' and rep_user_id is not null and month in (select month from ups_months) group by rep_user_id),
     addons as (select rep_user_id, sum((metrics->>'addons_sold')::int)::int addons_sold, sum((metrics->>'cancelled_60d')::int)::int cancelled
                from store_metrics where store_id = $1 and kind = 'addons' and rep_user_id is not null and month in (select month from addon_months) group by rep_user_id)
     select p.sessions, p.total, p.composure, p.discovery, p.technique, p.outcome, u.ups, u.sold, a.addons_sold, a.cancelled
     from practice p join ups u on u.rep_user_id = p.user_id left join addons a on a.rep_user_id = p.user_id`,
    [storeId, since],
  );
  return r.rows.map((x) => ({
    sessions: x.sessions,
    scores: Object.fromEntries(Object.entries({ total: x.total, composure: x.composure, discovery: x.discovery, technique: x.technique, outcome: x.outcome }).filter(([, v]) => v !== null)) as Record<string, number>,
    ups: x.ups,
    sold: x.sold,
    ...(x.addons_sold !== null ? { addonsSold: x.addons_sold, cancelled: x.cancelled ?? 0 } : {}),
  }));
}
