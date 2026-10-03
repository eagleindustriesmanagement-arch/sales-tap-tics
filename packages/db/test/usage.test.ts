import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { randomUUID } from "node:crypto";
import { createPracticeSession, loadUser, markDebriefSeen, storeUsage, withTenant } from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { scratchDatabase, SKIP } from "./helpers.js";

let db: pg.Client;
let drop: () => Promise<void>;
const [REP, REP2, MANAGER, GM] = DEMO.users.map((u) => u.id) as [string, string, string, string];
const as = <T>(userId: string, work: (q: pg.Client) => Promise<T>) => withTenant(db, { tenantId: DEMO.tenant, userId }, () => work(db));

beforeAll(async () => {
  if (SKIP) return;
  ({ db, drop } = await scratchDatabase());
  await seedDemo(db, 24);
});
afterAll(async () => {
  if (!SKIP) await drop();
});

async function session(userId: string, opts: { demoWatched: boolean | null; ended: string | null; voice?: boolean }) {
  const user = (await as(userId, (q) => loadUser(q, userId)))!;
  const id = randomUUID();
  await as(userId, (q) => createPracticeSession(q, user, { id, scenarioCode: "S-partner-check-L1", releaseId: null, language: "es", mode: "practice", channel: "floor", textMode: !opts.voice, seed: id, exitDraw: 0.5, demoWatched: opts.demoWatched }));
  if (opts.ended) await db.query("update sessions set end_reason = $2, ended_at = now() where id = $1", [id, opts.ended]);
  return id;
}

describe.skipIf(SKIP)("product analytics (spec 19.4)", () => {
  it("counts the store's use, private windows included, for the general manager only, with no text", async () => {
    await db.query("delete from sessions where store_id = $1 and started_at > now() - interval '1 day'", [DEMO.store]).catch(() => undefined);
    const before = (await as(GM, (q) => storeUsage(q, DEMO.store, new Date(Date.now() - 3_600_000))))!;
    const a = await session(REP, { demoWatched: true, ended: "next_step", voice: true });
    const early = await session(REP, { demoWatched: false, ended: "abandoned" });
    await session(REP2, { demoWatched: false, ended: "walk_away" });
    // Spoken turns with recognizer confidence, and one model call.
    await db.query("insert into turns (tenant_id, session_id, index, speaker, text, asr_confidence, pause_before_ms) values ($1, $2, 0, 'rep', 'hola', 0.8, 1200), ($1, $2, 1, 'rep', 'sí', 0.9, 2400)", [DEMO.tenant, a]);
    await db.query("insert into model_usage (tenant_id, session_id, purpose, model, prompt_version, input_tokens, output_tokens, cost_usd, latency_ms, first_token_ms, ok) values ($1, $2, 'customer', 'm', 'v1', 100, 20, 0.01, 900, 300, true)", [DEMO.tenant, a]);
    // The rep sees their own debrief once; nobody can mark someone else's.
    expect(await as(REP, (q) => markDebriefSeen(q, a))).toBe(true);
    expect(await as(REP, (q) => markDebriefSeen(q, a))).toBe(false);
    const other = await session(REP2, { demoWatched: null, ended: "next_step" });
    expect(await as(REP, (q) => markDebriefSeen(q, other))).toBe(false);

    for (const id of [a, early]) {
      await db.query("insert into scores (tenant_id, session_id, rubric_code, total, passed, honesty_passed, dimensions, items) values ($1, $2, 'R-objection', 50, false, true, '{}', '[]')", [DEMO.tenant, id]);
    }
    const u = (await as(GM, (q) => storeUsage(q, DEMO.store, new Date(Date.now() - 3_600_000))))!;
    expect(u.sessions_started - before.sessions_started).toBe(4);
    // Finished means a debrief was produced (a score exists), whatever the end reason: the one the rep ended early counts.
    expect(u.sessions_completed - before.sessions_completed).toBe(2);
    expect(u.voice_sessions - before.voice_sessions).toBe(1);
    expect(u.demo_watched - before.demo_watched).toBe(1);
    expect(u.demo_skipped - before.demo_skipped).toBe(2);
    expect(u.debriefs_seen - before.debriefs_seen).toBe(1);
    expect(u.active_reps_today).toBeGreaterThanOrEqual(2);
    expect(u.asr_confidence["es"]).toBeCloseTo(0.85, 3);
    expect(u.pause_ms_median).toBe(1800);
    expect(u.latency_ms["customer"]).toMatchObject({ median: 900, first_token: 300, calls: 1 });
    expect(Number(u.model_cost_per_session)).toBeCloseTo(0.01, 4);
    expect(u.weeks.at(-1)).toMatchObject({ started: expect.any(Number), active_reps: expect.any(Number) });
    // Counts only: no transcript text, names or ids anywhere in it.
    const json = JSON.stringify(u);
    expect(json).not.toContain("hola");
    expect(json).not.toContain(REP);
  });

  it("anyone but the store's general manager gets nothing", async () => {
    for (const who of [REP, MANAGER]) expect(await as(who, (q) => storeUsage(q, DEMO.store, new Date(0)))).toBeNull();
  });
});
