import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { randomUUID } from "node:crypto";
import { createPracticeSession, insertTurns, liveSessionRecord, loadUser, withTenant } from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { scratchDatabase, SKIP } from "./helpers.js";

let db: pg.Client;
let drop: () => Promise<void>;
const [REP, REP2] = DEMO.users.map((u) => u.id) as [string, string];
const as = <T>(userId: string, work: (q: pg.Client) => Promise<T>) => withTenant(db, { tenantId: DEMO.tenant, userId }, () => work(db));

beforeAll(async () => {
  if (SKIP) return;
  ({ db, drop } = await scratchDatabase());
  await seedDemo(db, 0);
});
afterAll(async () => {
  if (!SKIP) await drop();
});

describe.skipIf(SKIP)("hosted Postgres (decision 0014)", () => {
  it("keeps row-level security on every table with tenant data, without FORCE", async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity, c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and exists (select 1 from information_schema.columns k where k.table_name = c.relname and k.column_name = 'tenant_id')`,
    );
    expect(r.rows.length).toBeGreaterThan(25);
    expect(r.rows.filter((t) => !t.relrowsecurity).map((t) => t.relname)).toEqual([]);
    expect(r.rows.filter((t) => t.relforcerowsecurity).map((t) => t.relname)).toEqual([]);
  });

  it("loads a rep's own unfinished session to rebuild it, with the customer's raw lines; never someone else's, never a finished one", async () => {
    const user = (await as(REP, (q) => loadUser(q, REP)))!;
    const id = randomUUID();
    await as(REP, async (q) => {
      await createPracticeSession(q, user, { id, scenarioCode: "S-partner-check-L1", releaseId: null, language: "en", mode: "practice", channel: "floor", textMode: false, seed: "s", exitDraw: 0.42, exitMultiplier: 1.5 });
      await insertTurns(q, DEMO.tenant, id, [
        { index: 0, speaker: "customer", text: "I need to talk to my wife.", raw: "I need to talk to my wife." },
        { index: 1, speaker: "rep", text: "Of course.", pauseBeforeMs: 2100, wordsPerMinute: 150 },
        { index: 2, speaker: "customer", text: "Probably the payment.", raw: "[hesitant] Probably the payment." },
      ]);
    });
    const rec = await as(REP, (q) => liveSessionRecord(q, id, REP));
    expect(rec).toMatchObject({ scenarioCode: "S-partner-check-L1", seed: "s", exitDraw: 0.42, textMode: false, exitMultiplier: 1.5 });
    expect(rec!.turns.map((t) => t.raw ?? null)).toEqual(["I need to talk to my wife.", null, "[hesitant] Probably the payment."]);
    expect(rec!.turns[1]).toMatchObject({ pauseBeforeMs: 2100, wordsPerMinute: 150 });
    expect(await as(REP2, (q) => liveSessionRecord(q, id, REP2))).toBeNull();
    await db.query("update sessions set ended_at = now() where id = $1", [id]);
    expect(await as(REP, (q) => liveSessionRecord(q, id, REP))).toBeNull();
  });
});
