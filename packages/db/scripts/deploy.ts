/**
 * Runs on every build (decisions 0014, 0025): migrations, then, on the trial site, the demo store, then the content
 * release. Starts from an empty database or an up-to-date one. Each step is safe to repeat and safe to run while
 * another build runs it on the same database: each holds the deploy lock inside its own transaction, which also works
 * through a transaction pooler (Supabase port 6543, Neon's pooled URL). Prefers the direct connection when the host
 * provides one.
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
