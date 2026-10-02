import { writeFileSync } from "node:fs";
import pg from "pg";
import { OUTBOX } from "../playwright.config";

/** Once per run: clear the demo tenant's activity (users and store stay seeded) and the code outbox. */
export default async function globalSetup() {
  writeFileSync(OUTBOX, "");
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("truncate store_metrics, spanish_reviews, coach_practice, assignments, floor_checks, manager_check_quality, behavior_card_issues, debriefs, scores, violations, scenario_state_events, turns, model_usage, sessions, consents, auth_sessions, login_codes, audit_log cascade");
  // Put the store setup back to the seeded state, since one test edits it.
  const store = "22222222-2222-4222-8222-222222222222"; // the demo store; other tenants may share the database
  await c.query("delete from store_lenders where store_id = $1", [store]);
  await c.query("delete from store_fees where store_id = $1 and code <> 'dealer_fee'", [store]);
  await c.query("update store_fees set amount_cents = 89900, kind = 'dealer_mandatory' where store_id = $1", [store]);
  await c.query(
    `update store_policies set add_on_removal = 'none_configured', referral_reward = 'none', text_consent_text_en = null, text_consent_text_es = null,
       audio_retention_days = 180, stop_on_critical = true, walk_in_metric = 'all_logged_ups', approved_by = null, approved_at = null
     where store_id = $1`,
    [store],
  );
  await c.query("update stores set settings = '{}' where id = $1", [store]);
  // People added by an earlier run step aside, so the same email can be added again.
  await c.query(
    `delete from memberships where user_id in (select id from users where tenant_id = '11111111-1111-4111-8111-111111111111'
       and (email like 'e2e-%@demo.test' or (email is null and phone is null and status = 'inactive')))`,
  );
  await c.query("update users set status = 'inactive', email = null where email like 'e2e-%@demo.test'");
  await c.end();
}
