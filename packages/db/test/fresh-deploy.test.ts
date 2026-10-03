import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { migrate, MIGRATIONS_DIR, publishPlatformRelease } from "../src/index.js";
import { DEMO, seedDemo } from "../scripts/seed-demo.js";
import { SKIP } from "./helpers.js";

/**
 * Decision 0025: Production and Preview builds share one database and can deploy at the same moment, starting from an
 * empty database. Three deploys race here: each step must run once, with nothing duplicated and nothing half-written.
 */
const ADMIN_URL = process.env.DATABASE_URL ?? "postgresql://root@localhost/postgres?host=/var/run/postgresql";
const name = `taptics_fresh_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
let admin: pg.Client;
let clients: pg.Client[] = [];

beforeAll(async () => {
  if (SKIP) return;
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`create database ${name}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  clients = await Promise.all([0, 1, 2].map(async () => {
    const c = new pg.Client({ connectionString: url.toString() });
    await c.connect();
    return c;
  }));
});
afterAll(async () => {
  if (SKIP) return;
  await Promise.all(clients.map((c) => c.end()));
  await admin.query(`drop database if exists ${name}`);
  await admin.end();
});

describe.skipIf(SKIP)("deploying to a fresh, shared database (decision 0025)", () => {
  it("three migrations at once apply every file exactly once", async () => {
    const results = await Promise.all(clients.map((c) => migrate(c)));
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    expect(results.flat().sort()).toEqual(files);
    const rows = await clients[0]!.query("select name, count(*)::int n from schema_migrations group by name having count(*) > 1");
    expect(rows.rows).toEqual([]);
    // A second run is a no-op.
    expect(await migrate(clients[1]!)).toEqual([]);
  });

  it("three demo seeds at once leave one of each row", async () => {
    await Promise.all(clients.map((c) => seedDemo(c, 0)));
    const memberships = await clients[0]!.query("select count(*)::int n from memberships where tenant_id = $1", [DEMO.tenant]);
    expect(memberships.rows[0].n).toBe(DEMO.users.length);
    const fees = await clients[0]!.query("select count(*)::int n from store_fees where store_id = $1", [DEMO.store]);
    expect(fees.rows[0].n).toBe(1);
  });

  it("three content releases at once make one complete release", async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ kind: "technique", code: `T${i}`, body: { i } }));
    const ids = await Promise.all(clients.map((c) => publishPlatformRelease(c, "sha-test", "test", items)));
    expect(new Set(ids).size).toBe(1);
    const r = await clients[0]!.query("select (select count(*)::int from content_releases where version = 'sha-test') releases, (select count(*)::int from content_items where release_id = $1) items", [ids[0]]);
    expect(r.rows[0]).toEqual({ releases: 1, items: 50 });
  });

  it("a release that fails half way leaves nothing behind", async () => {
    const bad = [{ kind: "technique", code: "A", body: {} }, { kind: "technique", code: "A", body: {} }]; // same code twice: unique violation
    await expect(publishPlatformRelease(clients[0]!, "sha-broken", "test", bad)).rejects.toThrow();
    const r = await clients[0]!.query("select count(*)::int n from content_releases where version = 'sha-broken'");
    expect(r.rows[0].n).toBe(0);
  });
});
