import { writeFileSync } from "node:fs";
import pg from "pg";
import { OUTBOX } from "../playwright.config";

/** Once per run: clear the demo tenant's activity (users and store stay seeded) and the code outbox. */
export default async function globalSetup() {
  writeFileSync(OUTBOX, "");
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("truncate floor_checks, manager_check_quality, behavior_card_issues, debriefs, scores, violations, scenario_state_events, turns, model_usage, sessions, consents, auth_sessions, login_codes, audit_log cascade");
  await c.end();
}
