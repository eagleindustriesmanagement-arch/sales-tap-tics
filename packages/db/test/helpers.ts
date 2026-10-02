import pg from "pg";
import { randomUUID } from "node:crypto";
import { migrate } from "../src/index.js";

export const SKIP = process.env.SKIP_DB === "1";
const ADMIN_URL = process.env.DATABASE_URL ?? "postgresql://root@localhost/postgres?host=/var/run/postgresql";

/** A throwaway, migrated database per test file. Fails loudly without Postgres unless SKIP_DB=1. */
export async function scratchDatabase() {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const name = `taptics_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  await admin.query(`create database ${name}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${name}`;
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await migrate(db);
  return {
    db,
    async drop() {
      await db.end();
      await admin.query(`drop database if exists ${name}`);
      await admin.end();
    },
  };
}
