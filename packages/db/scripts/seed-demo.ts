/**
 * A demo tenant for development and browser tests: one store with the scenario's dealer fee, the strictest store
 * policy, a rep, a second rep, a manager and a general manager. Idempotent.
 *
 *   DATABASE_URL=... pnpm db:seed [--private-window-hours=0]
 */
import pg from "pg";
import { migrate, withDeployLock } from "../src/migrate.js";
import { pgConfig } from "../src/connection.js";

export const DEMO = {
  tenant: "11111111-1111-4111-8111-111111111111",
  store: "22222222-2222-4222-8222-222222222222",
  users: [
    { id: "33333333-3333-4333-8333-333333333301", first: "Luis", email: "rep@demo.test", role: "rep" },
    { id: "33333333-3333-4333-8333-333333333302", first: "Ana", email: "rep2@demo.test", role: "rep" },
    { id: "33333333-3333-4333-8333-333333333303", first: "Carlos", email: "manager@demo.test", role: "manager" },
    { id: "33333333-3333-4333-8333-333333333304", first: "Marta", email: "gm@demo.test", role: "general_manager" },
    { id: "33333333-3333-4333-8333-333333333305", first: "Rosa", email: "review@demo.test", role: "compliance_reviewer" },
    { id: "33333333-3333-4333-8333-333333333306", first: "Yesenia", email: "es@demo.test", role: "content_editor" },
  ],
} as const;

/** In one transaction under the deploy lock (decision 0025): two builds seeding at once cannot duplicate a row. */
export async function seedDemo(db: pg.Client, privateWindowHours = 24) {
  await withDeployLock(db, () => seedDemoRows(db, privateWindowHours));
}

async function seedDemoRows(db: pg.Client, privateWindowHours: number) {
  await db.query("insert into tenants (id, name) values ($1, 'Demo dealer group') on conflict do nothing", [DEMO.tenant]);
  await db.query("insert into stores (id, tenant_id, name, brands) values ($1, $2, 'Demo Chevrolet store', '{Chevrolet}') on conflict do nothing", [DEMO.store, DEMO.tenant]);
  await db.query(
    `insert into store_policies (tenant_id, store_id, private_window_hours) values ($1, $2, $3)
     on conflict (store_id) do update set private_window_hours = excluded.private_window_hours`,
    [DEMO.tenant, DEMO.store, privateWindowHours],
  );
  const fee = await db.query("select 1 from store_fees where store_id = $1 and code = 'dealer_fee'", [DEMO.store]);
  if (!fee.rowCount) {
    await db.query("insert into store_fees (tenant_id, store_id, code, name_en, name_es, amount_cents, kind) values ($1, $2, 'dealer_fee', 'Dealer fee', 'Cargo de concesionario', 89900, 'dealer_mandatory')", [DEMO.tenant, DEMO.store]);
  }
  for (const u of DEMO.users) {
    await db.query("insert into users (id, tenant_id, first_name, email) values ($1, $2, $3, $4) on conflict do nothing", [u.id, DEMO.tenant, u.first, u.email]);
    const m = await db.query("select 1 from memberships where user_id = $1 and role = $2", [u.id, u.role]);
    if (!m.rowCount) await db.query("insert into memberships (tenant_id, user_id, store_id, role) values ($1, $2, $3, $4)", [DEMO.tenant, u.id, DEMO.store, u.role]);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const window = Number(process.argv.find((a) => a.startsWith("--private-window-hours="))?.split("=")[1] ?? 24);
  const db = new pg.Client(pgConfig(process.env.DATABASE_URL!));
  await db.connect();
  await migrate(db);
  await seedDemo(db, window);
  console.log(`seeded demo tenant (private window ${window} h): ${DEMO.users.map((u) => `${u.email} (${u.role})`).join(", ")}`);
  await db.end();
}
