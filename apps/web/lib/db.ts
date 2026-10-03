import "server-only";
import pg from "pg";
import { withTenant, type Queryable } from "@taptics/db";

const g = globalThis as unknown as { __tapticsPool?: pg.Pool };

/** The app's connection: DATABASE_URL, or POSTGRES_URL as Vercel's Supabase and Postgres integrations name it. */
export const databaseUrl = () => process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

export function pool(): pg.Pool {
  if (!databaseUrl()) throw new Error("DATABASE_URL is not set");
  // Sized for a store of reps practicing at once on one server (load test, M7). On a serverless host each instance
  // serves a few requests and many instances share the database's pooler, so each keeps only a few connections.
  // TAPTICS_DB_POOL overrides it.
  const max = Number(process.env.TAPTICS_DB_POOL ?? (process.env.VERCEL ? 5 : 20));
  g.__tapticsPool ??= new pg.Pool({ connectionString: databaseUrl(), max });
  return g.__tapticsPool;
}

/** Runs work on one pooled connection. */
export async function withClient<T>(work: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    return await work(client);
  } finally {
    client.release();
  }
}

/** Runs work as the signed-in user, inside one transaction with row-level security keyed on their tenant. */
export function asUser<T>(principal: { tenantId: string; userId: string }, work: (db: Queryable) => Promise<T>): Promise<T> {
  return withClient((client) => withTenant(client, { tenantId: principal.tenantId, userId: principal.userId }, work));
}
