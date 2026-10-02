import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { baseline, importStoreMetrics, loadUser, parseCsv, withTenant } from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { scratchDatabase, SKIP } from "./helpers.js";

let db: pg.Client;
let drop: () => Promise<void>;
const [REP, , MANAGER, GM] = DEMO.users.map((u) => u.id) as [string, string, string, string];
const as = <T>(userId: string, work: (q: pg.Client) => Promise<T>) => withTenant(db, { tenantId: DEMO.tenant, userId }, () => work(db));
const importAs = (userId: string, kind: Parameters<typeof importStoreMetrics>[2], csv: string) =>
  as(userId, async (q) => importStoreMetrics(q, (await loadUser(q, userId))!, kind, csv));

beforeAll(async () => {
  if (SKIP) return;
  ({ db, drop } = await scratchDatabase());
  await seedDemo(db, 0);
});
afterAll(async () => {
  if (!SKIP) await drop();
});

describe("CSV parsing", () => {
  it("handles quotes, doubled quotes, commas and line breaks inside quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\n"two\nlines",3\n\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
      ["two\nlines", "3"],
    ]);
  });
});

describe.skipIf(SKIP)("store data import (spec 19.1)", () => {
  it("imports ups by rep, matching reps by email or first name, and reports the ones it cannot match", async () => {
    const csv = "month,rep,ups,sold\n2026-07,rep@demo.test,40,8\n2026-07,Ana,30,9\n2026-07,Former Rep,20,2\n2026-08,Luis,50,10\n";
    const r = await importAs(GM, "ups", csv);
    expect(r).toEqual({ ok: true, rows: 4, errors: [], unmatchedReps: ["Former Rep"] });
    const b = await as(GM, (q) => baseline(q, DEMO.store));
    expect(b.months).toEqual([{ month: "2026-08", ups: 50, sold: 10 }, { month: "2026-07", ups: 90, sold: 19 }]);
    const luis = b.reps.find((x) => x.rep_user_id === REP)!;
    expect(luis).toMatchObject({ ups: 90, sold: 18 });
  });

  it("rejects a file that lists the same rep twice for one month, however it is written", async () => {
    const r = await importAs(GM, "ups", "month,rep,ups,sold\n2026-09,Luis,10,1\n2026-09,REP@demo.test,5,1\n2026-09,Gone,1,0\n2026-09,gone,1,0\n");
    expect(r).toMatchObject({ ok: false, errors: ["line 3: same rep and month as line 2", "line 5: same rep and month as line 4"] });
  });

  it("re-importing a month replaces it instead of adding to it", async () => {
    expect((await importAs(GM, "ups", "month,rep,ups,sold\n2026-08,Luis,60,12\n")).ok).toBe(true);
    const b = await as(GM, (q) => baseline(q, DEMO.store));
    expect(b.months[0]).toEqual({ month: "2026-08", ups: 60, sold: 12 });
  });

  it("rejects the whole file with line numbers when any row is wrong, and stores nothing", async () => {
    const r = await importAs(GM, "be_backs", "month,be_backs,walk_aways\n2026-07,5,40\n2026-13,1,1\n2026-08,x,3\n2026-09,-1,3\n");
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(["line 3: month must be YYYY-MM", "line 4: be_backs must be a whole number", "line 5: be_backs must be a whole number"]);
    expect((await as(GM, (q) => baseline(q, DEMO.store))).beBacks).toEqual([]);
  });

  it("checks the columns, sold against ups, lead channels and empty files", async () => {
    expect((await importAs(GM, "ups", "month,rep,sold,ups\n2026-07,Luis,1,2\n")).errors[0]).toMatch(/columns must be exactly month,rep,ups,sold/);
    expect((await importAs(GM, "ups", "month,rep,ups,sold\n2026-07,Luis,2,3\n")).errors).toEqual(["line 2: sold is more than ups"]);
    expect((await importAs(GM, "leads", "month,channel,leads,appointments_set,shown,sold\n2026-07,walk-in,1,1,1,1\n")).errors).toEqual(["line 2: channel must be phone or internet"]);
    expect((await importAs(GM, "lost_reasons", "month,reason,count\n")).errors).toEqual(["the file has no data rows"]);
  });

  it("imports lost-deal reasons, leads and add-ons", async () => {
    expect((await importAs(GM, "lost_reasons", 'month,reason,count\n2026-07,"Payment too high",12\n2026-07,Trade value,7\n')).rows).toBe(2);
    expect((await importAs(GM, "leads", "month,channel,leads,appointments_set,shown,sold\n2026-07,Phone,80,30,18,6\n")).rows).toBe(1);
    expect((await importAs(GM, "addons", "month,rep,deals,addons_sold,cancelled_60d\n2026-07,Luis,8,3,1\n")).rows).toBe(1);
    expect((await importAs(GM, "be_backs", "month,be_backs,walk_aways\n2026-07,5,40\n")).rows).toBe(1);
    const b = await as(GM, (q) => baseline(q, DEMO.store));
    expect(b.beBacks).toEqual([{ month: "2026-07", be_backs: 5, walk_aways: 40 }]);
    const dims = await db.query("select dimension from store_metrics where kind in ('lost_reasons', 'leads') order by dimension");
    expect(dims.rows.map((r) => r.dimension)).toEqual(["payment too high", "phone", "trade value"]);
  });

  it("only a general manager can import or read the store's data", async () => {
    await expect(importAs(MANAGER, "ups", "month,rep,ups,sold\n2026-07,Luis,1,1\n")).rejects.toThrow(/general manager/);
    await expect(importAs(REP, "ups", "month,rep,ups,sold\n2026-07,Luis,1,1\n")).rejects.toThrow(/general manager/);
    const seen = await as(MANAGER, (q) => q.query("select count(*)::int n from store_metrics"));
    expect(seen.rows[0].n).toBe(0);
    const write = as(MANAGER, (q) => q.query("insert into store_metrics (tenant_id, store_id, kind, month, metrics, imported_by) values ($1, $2, 'be_backs', '2026-01-01', '{}', $3)", [DEMO.tenant, DEMO.store, MANAGER]));
    await expect(write).rejects.toThrow(/row-level security/);
  });

  it("records the import in the audit log", async () => {
    const r = await db.query("select detail from audit_log where action = 'store.import' order by created_at");
    expect(r.rows.length).toBeGreaterThanOrEqual(5);
    expect(r.rows[0].detail).toMatchObject({ kind: "ups", rows: 4, unmatched: 1 });
  });
});
