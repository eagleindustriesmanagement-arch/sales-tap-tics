import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { randomUUID } from "node:crypto";
import { platformLibrary } from "@taptics/content";
import { calibrateExits, weighObjections } from "@taptics/session";
import { baseline, createPracticeSession, scoreValidityInputs, currentExitMultiplier, currentObjectionWeights, latestObjectionWeights, lostReasonCounts, saveObjectionWeights, exitCalibrationInputs, importStoreMetrics, latestExitCalibration, loadUser, parseCsv, saveExitCalibration, withTenant } from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { scratchDatabase, SKIP } from "./helpers.js";

let db: pg.Client;
let drop: () => Promise<void>;
// Decision 0032: Carlos (index 2) holds admin access; Marta (index 3) is a manager without it.
const [REP, REP2, GM, MANAGER] = DEMO.users.map((u) => u.id) as [string, string, string, string];
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

describe.skipIf(SKIP)("exit-rate calibration (spec 19.2 item 1)", () => {
  const JULY = new Date("2026-07-15T12:00:00Z");
  const AUGUST = new Date("2026-08-15T12:00:00Z");
  async function practice(userId: string, n: number, exits: number, multiplier: number, startedAt: Date) {
    const user = (await as(userId, (q) => loadUser(q, userId)))!;
    for (let i = 0; i < n; i += 1) {
      const id = randomUUID();
      await as(userId, (q) => createPracticeSession(q, user, { id, scenarioCode: "S-partner-check-L1", releaseId: null, language: "en", mode: "practice", channel: "floor", textMode: true, seed: id, exitDraw: 0.5, exitMultiplier: multiplier }));
      await db.query("update sessions set end_reason = $2, ended_at = $3, started_at = $3 where id = $1", [id, i < exits ? "walk_away" : "next_step", startedAt]);
    }
  }
  const calibrate = (at: Date) => as(GM, async (q) => {
    const gm = (await loadUser(q, GM))!;
    const input = await exitCalibrationInputs(q, DEMO.store, at);
    const result = calibrateExits(input);
    await saveExitCalibration(q, gm, input.month, { ...result, ups: input.ups, sessions: input.sessions });
    return { input, result };
  });

  it("counts every finished practice session in the store, private window included, under the multiplier in force", async () => {
    await db.query("delete from store_metrics");
    await importAs(GM, "ups", "month,rep,ups,sold\n2026-06,Luis,100,20\n2026-06,Ana,100,20\n");
    await practice(REP, 20, 6, 1, new Date("2026-07-10T12:00:00Z"));
    await practice(REP2, 20, 6, 1, new Date("2026-07-11T12:00:00Z"));
    await practice(REP2, 5, 5, 1.5, new Date("2026-07-11T12:00:00Z")); // another multiplier: not counted
    await db.query("update sessions set private_until = now() + interval '1 day'");
    const { input, result } = await calibrate(JULY);
    expect(input).toMatchObject({ month: "2026-07-01", current: 1, ups: 200, sold: 40, sessions: 40, exits: 12 });
    // 80% real unsold against 30% practice exits: the most one month allows.
    expect(result).toEqual({ status: "updated", multiplier: 2, target: 0.8, observed: 0.3 });
    expect(await as(REP, (q) => currentExitMultiplier(q, DEMO.store, JULY))).toBe(2);
  });

  it("recomputing the same month starts from the previous month, so it never compounds", async () => {
    await calibrate(JULY);
    await calibrate(JULY);
    expect(await as(REP, (q) => currentExitMultiplier(q, DEMO.store, JULY))).toBe(2);
    // August starts from July's 2 and counts only sessions run under it: none yet.
    const { result } = await calibrate(AUGUST);
    expect(result).toEqual({ status: "insufficient_data", multiplier: 2, reason: "sessions" });
    expect(await as(GM, (q) => latestExitCalibration(q, DEMO.store))).toMatchObject({ month: "2026-08", value: { status: "insufficient_data", multiplier: 2, sessions: 0 } });
  });

  it("a rep reads the multiplier but cannot set it or count the store's sessions", async () => {
    const write = as(REP, (q) => q.query("insert into store_calibrations (tenant_id, store_id, kind, month, value, computed_by) values ($1, $2, 'exit_rates', '2026-09-01', '{\"multiplier\": 4}', $3)", [DEMO.tenant, DEMO.store, REP]));
    await expect(write).rejects.toThrow(/row-level security/);
    const counts = await as(REP, (q) => q.query("select * from app.store_exit_counts($1, '2026-01-01', 1)", [DEMO.store]));
    expect(counts.rows[0]).toEqual({ sessions: 0, exits: 0 });
    const managerUpdate = await as(MANAGER, (q) => q.query("update store_calibrations set value = '{\"multiplier\": 4}'"));
    expect(managerUpdate.rowCount).toBe(0);
  });
});

describe.skipIf(SKIP)("objection weights from lost-deal reasons (spec 19.2 item 2)", () => {
  const weigh = () => as(GM, async (q) => {
    const gm = (await loadUser(q, GM))!;
    const result = weighObjections(await lostReasonCounts(q, DEMO.store), platformLibrary().lostReasons!);
    await saveObjectionWeights(q, gm, "2026-09-01", result);
    return result;
  });

  it("sums the last 3 imported months by reason and sets weights everyone in the store reads", async () => {
    await importAs(GM, "lost_reasons", "month,reason,count\n2026-05,Payment,500\n2026-06,Payment,20\n2026-07,Payment,10\n2026-07,Trade value,10\n2026-08,Payment,10\n2026-08,Wife,10\n2026-08,Weather,4\n");
    // May is outside the last 3 months; reasons are stored as logged, in lower case.
    expect(await as(GM, (q) => lostReasonCounts(q, DEMO.store))).toEqual([
      { reason: "payment", count: 40 },
      { reason: "trade value", count: 10 },
      { reason: "wife", count: 10 },
      { reason: "weather", count: 4 },
    ]);
    const result = await weigh();
    expect(result).toMatchObject({ status: "updated", matched: 60, unmatched: [{ reason: "weather", count: 4 }] });
    const weights = await as(REP, (q) => currentObjectionWeights(q, DEMO.store));
    // Payment: 40 stated plus a quarter of the spouse row's hidden half, of 60 matched deals: past the cap of 5.
    expect(weights["O03"]).toBe(5);
    expect(weights["O04"]).toBe(Math.round((1 + (10 * 1.25) / 60) * 100) / 100);
    expect(weights["O01"]).toBe(Math.round((1 + (10 * 5) / 60) * 100) / 100);
    expect(await as(GM, (q) => latestObjectionWeights(q, DEMO.store))).toMatchObject({ month: "2026-09", value: { status: "updated" } });
  });

  it("too few lost deals leaves the store on authored weights; a rep cannot write weights", async () => {
    await db.query("delete from store_metrics where kind = 'lost_reasons'");
    await importAs(GM, "lost_reasons", "month,reason,count\n2026-08,Payment,12\n");
    expect(await weigh()).toMatchObject({ status: "insufficient_data", matched: 12 });
    expect(await as(REP, (q) => currentObjectionWeights(q, DEMO.store))).toEqual({});
    const write = as(REP, (q) => q.query("insert into store_calibrations (tenant_id, store_id, kind, month, value, computed_by) values ($1, $2, 'objection_weights', '2026-10-01', '{}', $3)", [DEMO.tenant, DEMO.store, REP]));
    await expect(write).rejects.toThrow(/row-level security/);
  });
});

describe.skipIf(SKIP)("score validity inputs (spec 19.2 item 3)", () => {
  it("averages each matched rep's complete practice scores and joins their real ups and add-ons; partial scores do not count", async () => {
    await db.query("delete from store_metrics where kind in ('ups', 'addons')");
    await importAs(GM, "ups", "month,rep,ups,sold\n2026-08,rep@demo.test,60,12\n2026-08,Unknown Rep,40,4\n");
    await importAs(GM, "addons", "month,rep,deals,addons_sold,cancelled_60d\n2026-08,rep@demo.test,12,10,2\n");
    const user = (await as(REP, (q) => loadUser(q, REP)))!;
    const now = new Date();
    for (const [total, partial] of [[60, false], [80, false], [10, true]] as const) {
      const id = randomUUID();
      await as(REP, (q) => createPracticeSession(q, user, { id, scenarioCode: "S-partner-check-L1", releaseId: null, language: "en", mode: "practice", channel: "floor", textMode: true, seed: id, exitDraw: 0.5 }));
      await db.query(
        "insert into scores (tenant_id, session_id, rubric_code, total, passed, honesty_passed, dimensions, items) values ($1, $2, 'R-objection', $3, false, true, $4, '[]')",
        [DEMO.tenant, id, total, JSON.stringify({ composure: total / 100, discovery: 0.5, technique: null, outcome: 0.4, partial })],
      );
    }
    const rows = await as(GM, (q) => scoreValidityInputs(q, DEMO.store, now));
    const mine = rows.find((r) => r.ups === 60)!;
    expect(mine).toMatchObject({ ups: 60, sold: 12, addonsSold: 10, cancelled: 2 });
    expect(mine.sessions).toBe(2);
    expect(mine.scores.total).toBeCloseTo(70, 3);
    expect(mine.scores.composure).toBeCloseTo(0.7, 3);
    // Unmatched names from the CSV have no practice to relate.
    expect(rows.some((r) => r.ups === 40)).toBe(false);
  });
});
