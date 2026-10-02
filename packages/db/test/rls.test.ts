import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { migrate, withTenant } from "../src/index.js";

/**
 * Cross-tenant and visibility tests against a real Postgres (spec 3.3, 20.4: "row-level security verified by
 * automated cross-tenant access tests"). Uses DATABASE_URL, or the local socket as a superuser; each run creates
 * and drops its own database.
 */
const LOCAL = "postgresql://root@localhost/postgres?host=/var/run/postgresql";
const ADMIN_URL = process.env.DATABASE_URL ?? LOCAL;
const SKIP = process.env.SKIP_DB === "1";
const admin = new pg.Client({ connectionString: ADMIN_URL });
const dbName = `taptics_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
let db: pg.Client;

const A = { tenant: randomUUID(), store: randomUUID(), rep: randomUUID(), rep2: randomUUID(), manager: randomUUID(), gm: randomUUID(), session: randomUUID(), privateSession: randomUUID(), prepSession: randomUUID(), rep2Session: randomUUID() };
const B = { tenant: randomUUID(), store: randomUUID(), rep: randomUUID(), session: randomUUID() };

beforeAll(async () => {
  if (SKIP) return;
  // No silent pass: without a database these tests fail unless SKIP_DB=1 says so explicitly.
  await admin.connect();
  await admin.query(`create database ${dbName}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${dbName}`;
  db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await migrate(db);
  const q = (sql: string, params: unknown[]) => db.query(sql, params);
  for (const t of [A, B]) {
    await q("insert into tenants (id, name) values ($1, $2)", [t.tenant, t === A ? "Group A" : "Group B"]);
    await q("insert into stores (id, tenant_id, name) values ($1, $2, 'Store')", [t.store, t.tenant]);
    await q("insert into store_policies (tenant_id, store_id) values ($1, $2)", [t.tenant, t.store]);
    await q("insert into store_fees (tenant_id, store_id, code, name_en, name_es, amount_cents, kind) values ($1, $2, 'dealer_fee', 'Dealer fee', 'Cargo de concesionario', 89900, 'dealer_mandatory')", [t.tenant, t.store]);
    await q("insert into users (id, tenant_id, first_name, email) values ($1, $2, 'Rep', 'rep@example.com')", [t.rep, t.tenant]);
    await q("insert into memberships (tenant_id, user_id, store_id, role) values ($1, $2, $3, 'rep')", [t.tenant, t.rep, t.store]);
    await q("insert into sessions (id, tenant_id, user_id, store_id, scenario_code, language, mode, channel, seed) values ($1, $2, $3, $4, 'S-partner-check-L1', 'en', 'practice', 'floor', 'x')", [t.session, t.tenant, t.rep, t.store]);
    await q("insert into turns (tenant_id, session_id, index, speaker, text) values ($1, $2, 0, 'customer', 'I need to talk to my wife.')", [t.tenant, t.session]);
    await q("insert into scores (tenant_id, session_id, rubric_code, total, passed, honesty_passed, dimensions, items) values ($1, $2, 'R-objection', 80, true, true, '{}', '[]')", [t.tenant, t.session]);
    await q("insert into debriefs (tenant_id, session_id, body) values ($1, $2, '{}')", [t.tenant, t.session]);
    await q("insert into violations (tenant_id, session_id, rule_code, severity, span, true_fact, layer) values ($1, $2, 'PRICE-01', 'critical', '$32,450', '{}', 'deterministic')", [t.tenant, t.session]);
    await q("insert into scenario_state_events (tenant_id, session_id, turn_index, event) values ($1, $2, 1, 'hidden_unlocked')", [t.tenant, t.session]);
    await q("insert into behavior_card_issues (tenant_id, user_id, card_code, item_code, due_week) values ($1, $2, 'B-T002-clarify', 'U-QFIRST', current_date)", [t.tenant, t.rep]);
    await q("insert into audit_log (tenant_id, action, target_type) values ($1, 'seed', 'tenant')", [t.tenant]);
    await q("insert into model_usage (tenant_id, purpose, model, prompt_version, input_tokens, output_tokens, cost_usd, latency_ms, ok) values ($1, 'judge', 'claude-opus-5-5', 'judge@1', 10, 10, 0.001, 100, true)", [t.tenant]);
    await q("insert into content_releases (id, tenant_id, version, scope) values ($1, $2, '1.0.0', 'tenant')", [randomUUID(), t.tenant]);
  }
  // Tenant A: a second rep, a manager, a GM, and sessions in and out of the private window.
  for (const [id, role] of [[A.rep2, "rep"], [A.manager, "manager"], [A.gm, "general_manager"]] as const) {
    await q("insert into users (id, tenant_id, first_name) values ($1, $2, $3)", [id, A.tenant, role]);
    await q("insert into memberships (tenant_id, user_id, store_id, role) values ($1, $2, $3, $4)", [A.tenant, id, A.store, role]);
  }
  await q("insert into sessions (id, tenant_id, user_id, store_id, scenario_code, language, mode, channel, seed, private_until) values ($1, $2, $3, $4, 'S', 'en', 'practice', 'floor', 'x', now() + interval '24 hours')", [A.privateSession, A.tenant, A.rep, A.store]);
  await q("insert into sessions (id, tenant_id, user_id, store_id, scenario_code, language, mode, channel, seed) values ($1, $2, $3, $4, 'S', 'en', 'customer_prep', 'floor', 'x')", [A.prepSession, A.tenant, A.rep, A.store]);
  await q("insert into sessions (id, tenant_id, user_id, store_id, scenario_code, language, mode, channel, seed) values ($1, $2, $3, $4, 'S', 'en', 'practice', 'floor', 'x')", [A.rep2Session, A.tenant, A.rep2, A.store]);
  await q("insert into content_releases (id, tenant_id, version, scope) values ($1, null, '1.0.0', 'platform')", [randomUUID()]);
});

afterAll(async () => {
  if (SKIP) return;
  await db?.end();
  await admin.query(`drop database if exists ${dbName}`);
  await admin.end();
});

const asUser = <T>(tenantId: string, userId: string, work: (q: Pick<pg.Client, "query">) => Promise<T>) => withTenant(db, { tenantId, userId }, work);

describe.skipIf(SKIP)("row-level security", () => {
  it("returns nothing from another tenant, on every tenant table, for every role", async () => {
    const tables = (await db.query<{ table_name: string }>("select table_name from information_schema.columns where table_schema = 'public' and column_name = 'tenant_id' order by 1")).rows.map((r) => r.table_name);
    expect(tables.length).toBeGreaterThanOrEqual(25);
    // The rows exist (seen without RLS), so "nothing leaked" below means isolation, not empty tables.
    const seeded = await db.query("select count(*)::int as n from sessions where tenant_id = $1", [B.tenant]);
    expect(seeded.rows[0].n).toBeGreaterThan(0);
    for (const who of [A.rep, A.manager, A.gm]) {
      for (const t of tables) {
        const leaked = await asUser(A.tenant, who, (q) => q.query(`select count(*)::int as n from ${t} where tenant_id = $1`, [B.tenant]));
        expect(leaked.rows[0].n, `${t} leaked tenant B rows`).toBe(0);
      }
    }
    const worker = await withTenant(db, { tenantId: A.tenant, role: "app_worker" }, (q) => q.query("select count(*)::int as n from sessions where tenant_id = $1", [B.tenant]));
    expect(worker.rows[0].n).toBe(0);
  });

  it("sees nothing at all without a tenant in the request", async () => {
    const r = await withTenant(db, { tenantId: "00000000-0000-0000-0000-000000000000" }, (q) => q.query("select count(*)::int as n from sessions"));
    expect(r.rows[0].n).toBe(0);
  });

  it("refuses to write a row into another tenant", async () => {
    await expect(asUser(A.tenant, A.rep, (q) => q.query("insert into audit_log (tenant_id, action, target_type) values ($1, 'x', 'y')", [B.tenant]))).rejects.toThrow(/row-level security/);
    await expect(asUser(A.tenant, A.rep, (q) => q.query("update stores set name = 'hacked' where tenant_id = $1", [B.tenant]))).resolves.toMatchObject({ rowCount: 0 });
  });

  it("platform content is shared; tenant content is not", async () => {
    const r = await asUser(A.tenant, A.rep, (q) => q.query("select scope, tenant_id from content_releases order by scope"));
    expect(r.rows.map((x: { scope: string }) => x.scope)).toEqual(["platform", "tenant"]);
    expect(r.rows.every((x: { tenant_id: string | null }) => x.tenant_id === null || x.tenant_id === A.tenant)).toBe(true);
  });
});

describe.skipIf(SKIP)("session visibility (spec 3.3 rule 3, 14.6)", () => {
  const visible = async (viewer: string) => {
    const r = await asUser(A.tenant, viewer, (q) => q.query("select id from sessions"));
    return new Set(r.rows.map((x: { id: string }) => x.id));
  };

  it("a rep sees all of their own sessions and no one else's", async () => {
    const s = await visible(A.rep);
    expect([...s].sort()).toEqual([A.session, A.privateSession, A.prepSession].sort());
    expect((await visible(A.rep2)).has(A.session)).toBe(false);
  });

  it("a manager sees team sessions after the private window, never customer prep", async () => {
    const s = await visible(A.manager);
    expect(s.has(A.session)).toBe(true);
    expect(s.has(A.rep2Session)).toBe(true);
    expect(s.has(A.privateSession)).toBe(false);
    expect(s.has(A.prepSession)).toBe(false);
  });

  it("turns, scores and debriefs follow the session's visibility", async () => {
    const r = await asUser(A.tenant, A.rep2, (q) => q.query("select (select count(*) from turns)::int t, (select count(*) from scores)::int s, (select count(*) from debriefs)::int d"));
    expect(r.rows[0]).toEqual({ t: 0, s: 0, d: 0 });
    const m = await asUser(A.tenant, A.manager, (q) => q.query("select (select count(*) from turns)::int t, (select count(*) from scores)::int s"));
    expect(m.rows[0]).toEqual({ t: 1, s: 1 });
  });

  it("scores are immutable and the audit log is append-only", async () => {
    await expect(asUser(A.tenant, A.manager, (q) => q.query("update scores set total = 100"))).rejects.toThrow(/immutable/);
    await expect(asUser(A.tenant, A.gm, (q) => q.query("delete from audit_log"))).rejects.toThrow(/immutable/);
  });

  it("a manager records an override next to the score, never in it", async () => {
    const score = await db.query("select id from scores where session_id = $1", [A.session]);
    await asUser(A.tenant, A.manager, (q) => q.query("insert into score_overrides (tenant_id, score_id, manager_id, reason, flag) values ($1, $2, $3, 'Recognition garbled the price', 'review')", [A.tenant, score.rows[0].id, A.manager]));
    await expect(asUser(A.tenant, A.rep2, (q) => q.query("insert into score_overrides (tenant_id, score_id, manager_id, reason, flag) values ($1, $2, $3, 'x', 'y')", [A.tenant, score.rows[0].id, A.rep2]))).rejects.toThrow(/row-level security/);
  });
});
