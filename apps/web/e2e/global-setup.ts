import { writeFileSync } from "node:fs";
import pg from "pg";
import { OUTBOX } from "../playwright.config";

/** Once per run: clear the demo tenant's activity (users and store stay seeded) and the code outbox. */
export default async function globalSetup() {
  writeFileSync(OUTBOX, "");
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("truncate assignments, floor_checks, manager_check_quality, behavior_card_issues, debriefs, scores, violations, scenario_state_events, turns, model_usage, sessions, consents, auth_sessions, login_codes, audit_log cascade");
  // Put the store setup back to the seeded state, since one test edits it.
  await c.query("delete from store_lenders");
  await c.query("delete from store_fees where code <> 'dealer_fee'");
  await c.query("update store_fees set amount_cents = 89900, kind = 'dealer_mandatory'");
  await c.query(
    `update store_policies set add_on_removal = 'none_configured', referral_reward = 'none', text_consent_text_en = null, text_consent_text_es = null,
       audio_retention_days = 180, stop_on_critical = true, walk_in_metric = 'all_logged_ups', approved_by = null, approved_at = null`,
  );
  await c.query("update stores set settings = '{}'");
  await c.end();
}
