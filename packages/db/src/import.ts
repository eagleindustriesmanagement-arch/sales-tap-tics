import { z } from "zod";
import type { Queryable } from "./context.js";
import { audit, type UserContext } from "./repo.js";

/**
 * CSV import of the store's outcome data (spec 19.1). Each kind has fixed columns; a file is accepted whole or not
 * at all, with every problem reported by line. Re-importing a month replaces it.
 */
export const IMPORT_KINDS = {
  ups: { columns: ["month", "rep", "ups", "sold"], perRep: true, dimension: null },
  lost_reasons: { columns: ["month", "reason", "count"], perRep: false, dimension: "reason" },
  be_backs: { columns: ["month", "be_backs", "walk_aways"], perRep: false, dimension: null },
  leads: { columns: ["month", "channel", "leads", "appointments_set", "shown", "sold"], perRep: false, dimension: "channel" },
  addons: { columns: ["month", "rep", "deals", "addons_sold", "cancelled_60d"], perRep: true, dimension: null },
} as const;
export type ImportKind = keyof typeof IMPORT_KINDS;

/** RFC 4180 parsing: quoted fields, doubled quotes, commas and line breaks inside quotes, CRLF or LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const count = z.coerce.number().int().min(0).max(1_000_000);
const month = z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be YYYY-MM");

export interface ImportResult { ok: boolean; rows: number; errors: string[]; unmatchedReps: string[] }

export async function importStoreMetrics(db: Queryable, gm: UserContext, kind: ImportKind, csv: string): Promise<ImportResult> {
  if (!gm.roles.includes("general_manager") || !gm.storeId) throw new Error("only a general manager imports store data");
  const spec = IMPORT_KINDS[kind];
  const table = parseCsv(csv);
  const header = (table[0] ?? []).map((h) => h.trim().toLowerCase());
  if (header.join(",") !== spec.columns.join(",")) {
    return { ok: false, rows: 0, errors: [`line 1: the columns must be exactly ${spec.columns.join(",")}`], unmatchedReps: [] };
  }
  const errors: string[] = [];
  const parsed: { month: string; rep: string | null; dimension: string; metrics: Record<string, number | string> }[] = [];
  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const rec = Object.fromEntries(spec.columns.map((c, j) => [c, (cells[j] ?? "").trim()]));
    const m = month.safeParse(rec["month"]);
    if (!m.success) return void errors.push(`line ${line}: ${m.error.issues[0]!.message}`);
    const metrics: Record<string, number> = {};
    for (const c of spec.columns) {
      if (c === "month" || c === "rep" || c === spec.dimension) continue;
      const v = count.safeParse(rec[c]);
      if (!v.success) return void errors.push(`line ${line}: ${c} must be a whole number`);
      metrics[c] = v.data;
    }
    if (kind === "ups" && metrics["sold"]! > metrics["ups"]!) return void errors.push(`line ${line}: sold is more than ups`);
    if (kind === "leads" && !["phone", "internet"].includes(rec["channel"]!.toLowerCase())) return void errors.push(`line ${line}: channel must be phone or internet`);
    if (spec.perRep && !rec["rep"]) return void errors.push(`line ${line}: rep is empty`);
    if (spec.dimension && !rec[spec.dimension]) return void errors.push(`line ${line}: ${spec.dimension} is empty`);
    parsed.push({ month: `${m.data}-01`, rep: spec.perRep ? rec["rep"]! : null, dimension: spec.dimension ? rec[spec.dimension]!.toLowerCase().slice(0, 200) : "", metrics });
  });
  if (parsed.length === 0 && errors.length === 0) errors.push("the file has no data rows");
  if (errors.length) return { ok: false, rows: 0, errors: errors.slice(0, 50), unmatchedReps: [] };

  // Reps are matched by email, then by "First Last" or first name, among the store's people.
  const people = await db.query<{ id: string; email: string | null; first_name: string | null; last_name: string | null }>(
    "select u.id, lower(u.email) email, u.first_name, u.last_name from users u where exists (select 1 from memberships m where m.user_id = u.id and m.store_id = $1)",
    [gm.storeId],
  );
  const find = (label: string) => {
    const l = label.toLowerCase();
    const hits = people.rows.filter((p) => p.email === l || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim().toLowerCase() === l || (p.first_name ?? "").toLowerCase() === l);
    return hits.length === 1 ? hits[0]!.id : null;
  };
  const unmatched = new Set<string>();
  const seen = new Map<string, number>();
  const rows = parsed.map((r, i) => {
    const repId = r.rep ? find(r.rep) : null;
    if (r.rep && !repId) unmatched.add(r.rep);
    const key = [r.month, repId ?? r.rep?.toLowerCase() ?? "", r.dimension].join("|");
    if (seen.has(key)) errors.push(`line ${i + 2}: same ${spec.perRep ? "rep" : spec.dimension ?? "month"} and month as line ${seen.get(key)! + 2}`);
    else seen.set(key, i);
    return { ...r, repId };
  });
  if (errors.length) return { ok: false, rows: 0, errors: errors.slice(0, 50), unmatchedReps: [] };
  for (const r of rows) {
    await db.query(
      `insert into store_metrics (tenant_id, store_id, kind, month, rep_user_id, rep_label, dimension, metrics, imported_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (store_id, kind, month, coalesce(rep_user_id::text, lower(rep_label), ''), dimension)
       do update set rep_label = excluded.rep_label, metrics = excluded.metrics, imported_by = excluded.imported_by`,
      [gm.tenantId, gm.storeId, kind, r.month, r.repId, r.rep, r.dimension, JSON.stringify(r.metrics), gm.id],
    );
  }
  await audit(db, gm, "store.import", "store", gm.storeId, { kind, rows: parsed.length, unmatched: unmatched.size });
  return { ok: true, rows: parsed.length, errors: [], unmatchedReps: [...unmatched] };
}

/** Close rate by month (store) and by rep over the last 3 imported months, plus be-backs and walk-aways. */
export async function baseline(db: Queryable, storeId: string) {
  const months = await db.query(
    `select to_char(m.month, 'YYYY-MM') as month, sum((m.metrics->>'ups')::int)::int ups, sum((m.metrics->>'sold')::int)::int sold
     from store_metrics m where m.store_id = $1 and m.kind = 'ups' group by m.month order by m.month desc limit 6`,
    [storeId],
  );
  const reps = await db.query(
    `with recent as (select month from store_metrics where store_id = $1 and kind = 'ups' group by month order by month desc limit 3)
     select rep_user_id, max(rep_label) rep_label, sum((metrics->>'ups')::int)::int ups, sum((metrics->>'sold')::int)::int sold
     from store_metrics where store_id = $1 and kind = 'ups' and month in (select month from recent)
     group by rep_user_id, case when rep_user_id is null then lower(rep_label) end`,
    [storeId],
  );
  const beBacks = await db.query(
    `select to_char(m.month, 'YYYY-MM') as month, (m.metrics->>'be_backs')::int be_backs, (m.metrics->>'walk_aways')::int walk_aways
     from store_metrics m where m.store_id = $1 and m.kind = 'be_backs' order by m.month desc limit 6`,
    [storeId],
  );
  return {
    months: months.rows as { month: string; ups: number; sold: number }[],
    reps: reps.rows as { rep_user_id: string | null; rep_label: string; ups: number; sold: number }[],
    beBacks: beBacks.rows as { month: string; be_backs: number; walk_aways: number }[],
  };
}
