import type { Client, PoolClient } from "pg";

type Queryable = Pick<Client | PoolClient, "query">;

/**
 * Runs work as the app role inside one transaction with the request's tenant and user set, so row-level security
 * applies (spec 3.3 rule 2). Authorization still happens in the server first; this is the second line of defense.
 */
export async function withTenant<T>(db: Queryable, ctx: { tenantId: string; userId?: string; role?: "app_user" | "app_worker" }, work: (db: Queryable) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query(`set local role ${ctx.role === "app_worker" ? "app_worker" : "app_user"}`);
    await db.query("select set_config('app.tenant_id', $1, true), set_config('app.user_id', $2, true)", [ctx.tenantId, ctx.userId ?? ""]);
    const result = await work(db);
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}
