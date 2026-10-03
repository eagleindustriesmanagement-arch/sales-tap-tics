import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { migrate } from "../src/index.js";
import { SKIP } from "./helpers.js";

/**
 * Decision 0023: on Supabase, every new table in public is granted to the Data API's `anon` and `authenticated` roles.
 * This builds that situation (the roles, and default privileges that grant them every new table) before migrating,
 * then checks the migrations leave those roles nothing.
 */
const ADMIN_URL = process.env.DATABASE_URL ?? "postgresql://root@localhost/postgres?host=/var/run/postgresql";
let admin: pg.Client;
let db: pg.Client;
const name = `taptics_supabase_${randomUUID().replace(/-/g, "").slice(0, 12)}`;

beforeAll(async () => {
  if (SKIP) return;
  admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  for (const r of ["anon", "authenticated"]) await admin.query(`do $$ begin if not exists (select 1 from pg_roles where rolname = '${r}') then create role ${r} nologin; end if; end $$`);
  await admin.query(`create database ${name}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query("alter default privileges in schema public grant all on tables to anon, authenticated");
  await db.query("alter default privileges in schema public grant all on sequences to anon, authenticated");
  await migrate(db);
});
afterAll(async () => {
  if (SKIP) return;
  await db.end();
  await admin.query(`drop database if exists ${name}`);
  await admin.end();
});

describe.skipIf(SKIP)("Supabase's Data API roles get nothing (decision 0023)", () => {
  it("anon and authenticated hold no privilege on any app table, schema or function", async () => {
    const r = await db.query<{ role: string; table: string }>(
      `select r.rolname as role, c.relname as table from pg_class c join pg_namespace n on n.oid = c.relnamespace cross join pg_roles r
       where n.nspname = 'public' and c.relkind = 'r' and r.rolname in ('anon', 'authenticated')
         and (has_table_privilege(r.oid, c.oid, 'select') or has_table_privilege(r.oid, c.oid, 'insert') or has_table_privilege(r.oid, c.oid, 'update') or has_table_privilege(r.oid, c.oid, 'delete'))`,
    );
    expect(r.rows).toEqual([]);
    const schema = await db.query("select has_schema_privilege('anon', 'app', 'usage') a, has_schema_privilege('authenticated', 'app', 'usage') b");
    expect(schema.rows[0]).toEqual({ a: false, b: false });
  });

  it("a table a later migration creates starts without that access too", async () => {
    await db.query("create table public.later_table (id int)");
    const r = await db.query("select has_table_privilege('anon', 'public.later_table', 'select') a, has_table_privilege('authenticated', 'public.later_table', 'insert') b");
    expect(r.rows[0]).toEqual({ a: false, b: false });
  });
});
