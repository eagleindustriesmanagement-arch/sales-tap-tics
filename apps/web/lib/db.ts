import "server-only";
import pg from "pg";
import { withTenant, type Queryable } from "@taptics/db";

const g = globalThis as unknown as { __tapticsPool?: pg.Pool };

export function pool(): pg.Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  g.__tapticsPool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
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
