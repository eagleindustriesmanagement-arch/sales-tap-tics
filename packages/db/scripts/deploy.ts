/**
 * Runs on every production build (decision 0014): migrations, then the content release, then, on the trial site, the
 * demo store. Each step is safe to repeat: migrations are applied once, a release is keyed by its content hash, and
 * the demo seed upserts. Uses the direct connection when the host provides one (DDL through a pooler is fragile).
 *
 *   pnpm db:deploy     (TAPTICS_DEMO_SEED=1 also seeds the demo store, with no private window so managers see practice at once)
 */
import pg from "pg";
import { migrate } from "../src/index.js";
import { seedDemo } from "./seed-demo.js";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error("db:deploy needs DATABASE_URL (or DATABASE_URL_UNPOOLED)");
  process.exit(1);
}
process.env.DATABASE_URL = url;

const db = new pg.Client({ connectionString: url });
await db.connect();
const applied = await migrate(db);
console.log(applied.length ? `applied: ${applied.join(", ")}` : "database is up to date");
if (process.env.TAPTICS_DEMO_SEED === "1") {
  await seedDemo(db, Number(process.env.TAPTICS_DEMO_PRIVATE_WINDOW_HOURS ?? 0));
  console.log("demo store seeded");
}
await db.end();
// The content release script connects with DATABASE_URL, set above to the direct connection.
await import("./publish-content.js");
