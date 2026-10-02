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
