import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Client } from "pg";

export const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../migrations");

/** Applies pending SQL migrations in file-name order, each in its own transaction. Returns the names applied. */
export async function migrate(client: Client, dir = MIGRATIONS_DIR): Promise<string[]> {
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  const applied: string[] = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(name)) continue;
    await client.query("begin");
    try {
      await client.query(readFileSync(join(dir, name), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [name]);
      await client.query("commit");
      applied.push(name);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`migration ${name} failed: ${(error as Error).message}`);
    }
  }
  return applied;
}
