import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Client } from "pg";

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../migrations");

/**
 * One lock for every deploy step on a database (decision 0025). Production and Preview builds share one database and
 * can deploy at the same moment; each step takes this lock inside its own transaction, so it holds through a
 * transaction pooler (Supabase, Neon) where a session-level lock would not.
 */
export const DEPLOY_LOCK = 730119710;

/** Runs `work` in one transaction that holds the deploy lock. */
export async function withDeployLock<T>(client: Pick<Client, "query">, work: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select pg_advisory_xact_lock($1)", [DEPLOY_LOCK]);
    const result = await work();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

/**
 * Applies pending SQL migrations in file-name order, each in its own transaction under the deploy lock, re-checking
 * inside the lock that no other deploy applied it first. Works on an empty database and through a transaction pooler.
 * Returns the names applied.
 */
export async function migrate(client: Client, dir = MIGRATIONS_DIR, opts: { lockTimeoutMs?: number } = {}): Promise<string[]> {
  // A migration waits at most this long for its table locks (October 5 review). Production and Preview share one
  // database: an ALTER queued behind a long transaction would otherwise block every query on that table while it
  // waits. Failing instead fails the deploy, the previous deployment keeps serving, and the next deploy retries.
  // Set after the deploy lock is held, so concurrent deploys still wait for each other.
  const lockTimeoutMs = Math.max(1, Math.floor(opts.lockTimeoutMs ?? 15_000));
  await withDeployLock(client, () => client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())"));
  const applied: string[] = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      const ran = await withDeployLock(client, async () => {
        if ((await client.query("select 1 from schema_migrations where name = $1", [name])).rowCount) return false;
        await client.query(`set local lock_timeout = ${lockTimeoutMs}`);
        await client.query(readFileSync(join(dir, name), "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [name]);
        return true;
      });
      if (ran) applied.push(name);
    } catch (error) {
      throw new Error(`migration ${name} failed: ${(error as Error).message}`);
    }
  }
  return applied;
}
