import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import pg from "pg";
import { CRON_SECRET, OUTBOX } from "../playwright.config";

/** Practice opens on the lesson (decision 0031); tests that are about something else step past it. */
async function pastLesson(page: Page) {
  const skip = page.getByRole("button", { name: "Skip to practice" });
  await expect(skip.or(page.getByRole("radio", { name: "Type" }))).toBeVisible();
  if (await skip.isVisible()) await skip.click();
}


const db = () => new pg.Client({ connectionString: process.env.DATABASE_URL });
/** The demo store (packages/db/scripts/seed-demo.ts); other tenants, such as the load test's, may share the database. */
const DEMO_STORE = "22222222-2222-4222-8222-222222222222";

/** Session cookies by account: each account signs in once per run, which keeps the tests under the real limit of
 *  five codes per account per 15 minutes. */
const sessions = new Map<string, Awaited<ReturnType<ReturnType<Page["context"]>["cookies"]>>>();

/** Signs in (or reuses this run's session) and, when the consent notice shows, accepts it. */
async function signInReady(page: Page, email: string) {
  const saved = sessions.get(email);
  if (saved) {
    await page.context().addCookies(saved);
    await page.goto("/today");
    if (!/\/login$/.test(page.url())) return;
  }
  await signIn(page, email);
  if (/\/consent$/.test(page.url())) await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page).not.toHaveURL(/\/consent$/);
  sessions.set(email, await page.context().cookies());
}

async function signIn(page: Page, email: string) {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email or mobile number").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
  const sent = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code?: string });
  const code = sent.filter((m) => m.identifier === email && m.code).at(-1)!.code!;
  await page.getByLabel("Six-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Signed in only once the server has set the session and sent the browser on.
  await expect(page).not.toHaveURL(/\/login$/);
}


test("a rep signs in, accepts the notice, practices, and the session is saved", async ({ page }) => {
  await signIn(page, "rep@demo.test");
  await expect(page).toHaveURL(/\/consent$/);
  await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page.getByRole("heading", { name: /Today, Luis/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Practice now" })).toBeVisible();
  // A new rep starts onboarding: week 1, the first objection.
  await expect(page.getByTestId("plan-reason")).toHaveText(/week 1/);
  await expect(page.getByRole("link", { name: "Practice now" })).toHaveAttribute("href", "/practice/S-partner-check-L1");

  // Every scenario is listed by level; open the "talk to my wife" one.
  await page.getByRole("link", { name: "See all scenarios" }).click();
  await expect(page.getByRole("heading", { name: "Level 1" })).toBeVisible();
  await page.getByTestId("scenario-S-partner-check-L1").click();
  // Learn, see it, do it (decision 0031): the lesson comes first, then the demonstration, then the role-play.
  const lesson = page.getByTestId("lesson");
  await expect(lesson.getByRole("heading", { level: 1 })).toContainText("find out what she'll ask");
  // The tactic in plain words and the steps come first; the background waits behind "More about this tactic".
  await expect(lesson.getByTestId("lesson-tactic")).toContainText("Find out what she will ask");
  await expect(lesson.getByTestId("lesson-steps").getByRole("listitem")).toHaveCount(5);
  await expect(lesson.getByRole("heading", { name: "Why it works" })).toBeHidden();
  await lesson.getByText("More about this tactic").click();
  await expect(lesson.getByRole("heading", { name: "Why it works" })).toBeVisible();
  await expect(lesson.getByText("When you talk tonight, what do you think her first question will be?")).toBeVisible();
  await expect(lesson.getByText("Her first question", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "See it done" }).click();
  await expect(page.getByRole("heading", { name: "What not to do" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("radio", { name: "Type" }).check(); // typed turns; the spoken flow has its own test
  await page.getByRole("button", { name: "Start" }).click();
  const say = page.getByLabel("Type what you would say");
  await expect(say).toBeVisible();
  const lines = [
    "Of course. It is a big purchase and you should both be comfortable. When you talk tonight, what do you think her first question will be?",
    "That makes sense. Setting the conversation with her aside for a second, is this the right car for you?",
    "And the payment. Is it where you told her it would be?",
    "I appreciate you telling me. Would she be free for a quick video call, or is it better if you both come in tomorrow? Does tomorrow at 5:30 work?",
  ];
  const ended = page.getByText("The conversation has ended.");
  for (const line of lines) {
    await say.fill(line);
    await page.getByRole("button", { name: "Send" }).click();
    // The turn is done when the composer is no longer busy, or the conversation has ended. The engine may end it
    // on any turn (a booked step, or its exit draw): follow it either way.
    await expect(ended.or(page.locator('[data-testid="composer"][data-busy="false"]'))).toBeVisible();
    if (await ended.isVisible()) break;
    await expect(say).toBeEmpty();
  }
  await expect(page.getByText(/sixty bucks higher/)).toBeVisible();
  await page.getByRole("button", { name: /See debrief|End session/ }).first().click();
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await expect(page.getByText("Partial", { exact: true })).toBeVisible();
  // A partial score is out of what could be scored, never "out of 100"; each behavior is named, not its status.
  await expect(page.getByText(/on the \d+% that could be scored/)).toBeVisible();
  await page.getByText("Every behavior scored").click();
  await expect(page.getByTestId("scored-item").first()).not.toContainText(/^Not scored in text mode/);
  await expect(page.getByText(/The payment is about \$60 a month above/)).toBeVisible();
  // The feedback points back to the lesson by name.
  await expect(page.getByText(/From the lesson: /).first()).toBeVisible();

  const c = db();
  await c.connect();
  const s = await c.query("select s.end_reason, (select count(*)::int from turns t where t.session_id = s.id) turns, sc.total, sc.passed from sessions s join scores sc on sc.session_id = s.id");
  expect(s.rows).toHaveLength(1);
  expect(s.rows[0].turns).toBeGreaterThanOrEqual(8);
  expect(s.rows[0].passed).toBe(false); // partial offline score never passes
  const consent = await c.query("select version from consents");
  expect(consent.rowCount).toBe(1);
  await c.end();

  await page.goto("/history");
  await page.getByRole("link", { name: /talk to my wife/ }).first().click();
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
});

test("a rep who makes up a deadline is stopped and the violation is stored", async ({ page }) => {
  await signIn(page, "rep2@demo.test");
  await page.getByRole("button", { name: "I understand and agree" }).click();
  await page.goto("/practice/S-partner-check-L1");
  await pastLesson(page);
  await page.getByRole("radio", { name: "Type" }).check(); // typed turns; the spoken flow has its own test
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Type what you would say").fill("The bonus cash ends tomorrow, so you should decide today.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText(/Stopped: that line broke a compliance rule/)).toBeVisible();
  await page.getByRole("button", { name: "See debrief" }).click();
  await expect(page.getByText(/Compliance issue · DEAD-01/)).toBeVisible();
  const c = db();
  await c.connect();
  const v = await c.query("select rule_code, severity from violations");
  expect(v.rows).toContainEqual({ rule_code: "DEAD-01", severity: "critical" });
  await c.end();
});

test("the manager sees the team's cards, records a floor check in under 60 seconds, and sees the team view", async ({ page }) => {
  await signIn(page, "manager@demo.test");
  await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page).toHaveURL(/\/manager\/floor$/);
  // Ana's stopped session left items at zero, so she has this week's card. Luis scored full marks on everything
  // measurable offline, so he correctly has none.
  const card = page.locator("section").filter({ hasText: "Ana" }).first();
  await expect(card).toBeVisible();
  await expect(page.locator("section:not(:has([data-testid=floor-new]))").filter({ hasText: "Luis" })).toHaveCount(0);
  const start = Date.now();
  await card.getByRole("button", { name: "Yes" }).click();
  await card.getByLabel("I named one specific behavior").check();
  await card.getByLabel("I modeled the line in person").check();
  await card.getByRole("button", { name: "Record check" }).click();
  await expect(card.getByText(/Recorded in \d+ seconds/)).toBeVisible();
  expect(Date.now() - start).toBeLessThan(60_000);

  await page.goto("/manager/team");
  await expect(page.getByRole("link", { name: "Luis", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ana", exact: true })).toBeVisible();
  await expect(page.getByText(/\(Checked\)/)).toBeVisible();
  // Every coaching measure shows its value beside its own label (October 5: "Checks" and "Line modeled" read empty).
  await expect(page.getByTestId("quality-checks")).toHaveText("1");
  await expect(page.getByTestId("quality-modeled")).toHaveText("100%");
  await expect(page.getByTestId("quality-checks").locator("xpath=preceding-sibling::dt")).toHaveText("Checks");

  const c = db();
  await c.connect();
  const q = await c.query("select script_followed, specific_feedback, line_modeled from manager_check_quality");
  expect(q.rows).toEqual([{ script_followed: true, specific_feedback: true, line_modeled: true }]);
  const cards = await c.query("select u.email, c.status from behavior_card_issues c join users u on u.id = c.user_id");
  expect(cards.rows).toEqual([{ email: "rep2@demo.test", status: "checked" }]);
  await c.end();

  // A rep with no card this week still gets a check: the manager starts one, picks the behavior, and records it.
  await page.goto("/manager/floor");
  const newCheck = page.getByTestId("floor-new");
  await newCheck.getByLabel("Rep").selectOption({ label: "Luis" });
  await newCheck.getByLabel("Behavior to watch").selectOption({ label: "Pause and slow down" });
  await newCheck.getByRole("button", { name: "Start the check" }).click();
  const luis = page.locator("section:not(:has([data-testid=floor-new]))").filter({ hasText: "Luis" }).first();
  await expect(luis).toBeVisible();
  await luis.getByRole("button", { name: "Yes" }).click();
  await luis.getByRole("button", { name: "Record check" }).click();
  await expect(luis.getByText(/Recorded in \d+ seconds/)).toBeVisible();
  // Everyone now has this week's card, so the start form steps aside.
  await page.reload();
  await expect(page.getByTestId("floor-new")).toHaveCount(0);
});

test("a rep cannot open manager screens or another rep's session", async ({ page }) => {
  await signIn(page, "rep2@demo.test");
  // The server refuses the manager screen and sends the rep home.
  await page.goto("/manager/floor").catch(() => undefined);
  await expect(page).toHaveURL(/localhost:\d+\/today$/);
  const c = db();
  await c.connect();
  const other = await c.query("select s.id from sessions s join users u on u.id = s.user_id where u.email = 'rep@demo.test' limit 1");
  await c.end();
  const res = await page.goto(`/history/${other.rows[0].id}`);
  expect(res?.status()).toBe(404);
  const api = await page.request.post("/api/floor-checks", { data: { cardIssueId: "00000000-0000-0000-0000-000000000000", observed: "yes" } });
  expect(api.status()).toBe(403);
});

test("a manager with admin access edits store setup, the reviewer signs it off and sees the compliance flags", async ({ page, browser }) => {
  await signInReady(page, "manager@demo.test");
  await page.goto("/manager/floor");
  await page.getByRole("link", { name: "Store", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Store setup" })).toBeVisible();
  await expect(page.getByTestId("approval")).toHaveText(/Not signed off yet/);
  await page.getByLabel("Amount ($)").fill("799");
  await page.getByLabel("When a customer refuses a pre-installed add-on").selectOption("credit_price");
  await page.getByLabel(/Lenders/).fill("Ally\nCredit Acceptance *");
  // Consent wording in one language only is refused: both languages or neither (spec 1.2 item 3).
  await page.getByLabel("Text-message consent wording (English)").fill("Can I text you about this car?");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText(/Not saved/);
  await page.getByLabel("Text-message consent wording (Spanish)").fill("¿Le puedo mandar un mensaje sobre este carro?");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText(/Saved\. Waiting/);

  // The general manager cannot sign off their own settings.
  expect((await page.request.post("/api/store/approve")).status()).toBe(403);

  const reviewer = await browser.newPage();
  await signIn(reviewer, "review@demo.test");
  await reviewer.getByRole("button", { name: "I understand and agree" }).click();
  await expect(reviewer).toHaveURL(/\/manager\/compliance$/);
  await expect(reviewer.getByRole("heading", { name: "Compliance flags" })).toBeVisible();
  await expect(reviewer.getByText("DEAD-01 · critical")).toBeVisible();
  await expect(reviewer.getByText(/Ana ·/)).toBeVisible();
  await reviewer.getByRole("link", { name: "Store", exact: true }).click();
  await expect(reviewer.getByRole("button", { name: "Save settings" })).toHaveCount(0);
  await reviewer.getByRole("button", { name: "Sign off these settings" }).click();
  await expect(reviewer.getByTestId("approval")).toHaveText(/Signed off by the compliance reviewer/);
  expect((await reviewer.request.put("/api/store", { data: {} })).status()).toBe(403);

  const c = db();
  await c.connect();
  const fees = await c.query("select code, amount_cents::int from store_fees where store_id = $1", [DEMO_STORE]);
  expect(fees.rows).toEqual([{ code: "dealer_fee", amount_cents: 79900 }]);
  const p = await c.query("select add_on_removal, approved_at is not null approved from store_policies where store_id = $1", [DEMO_STORE]);
  expect(p.rows).toEqual([{ add_on_removal: "credit_price", approved: true }]);
  const lenders = await c.query("select name, is_credit_acceptance from store_lenders where store_id = $1 order by name", [DEMO_STORE]);
  expect(lenders.rows).toEqual([{ name: "Ally", is_credit_acceptance: false }, { name: "Credit Acceptance", is_credit_acceptance: true }]);
  await c.end();
});

test("a manager assigns practice with a reason; the rep sees it first and practices it; it is not done until it passes", async ({ page, browser }) => {
  await signInReady(page, "manager@demo.test");
  await page.goto("/manager/team");
  await page.getByRole("link", { name: "Assign practice" }).click();
  await page.getByLabel("Scenario").selectOption("S-partner-check-L1");
  await page.getByLabel("Luis").check();
  // Due date: one tap for the common ones, the calendar for anything else (a typed date is accepted too).
  await page.getByRole("radio", { name: "In a week" }).check();
  await expect(page.getByTestId("due-summary")).toBeVisible();
  await page.getByRole("radio", { name: "Pick a date" }).check();
  await page.getByTestId("due-date").fill("2026-12-31");
  await page.getByLabel("Reason the rep will see").fill("Ask what she will ask first before you show options.");
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Assigned to 1.");
  await page.goto("/manager/team");
  await expect(page.getByTestId("assignments")).toContainText("Due Thu, Dec 31");

  const rep = await browser.newPage();
  await signInReady(rep, "rep@demo.test");
  await expect(rep.getByText("Assigned by Carlos")).toBeVisible();
  await expect(rep.getByTestId("assignment-reason")).toHaveText(/Ask what she will ask first/);
  await rep.getByRole("link", { name: "Practice now" }).click();
  await expect(rep).toHaveURL(/\/practice\/S-partner-check-L1$/);
  await pastLesson(rep);
  await rep.getByRole("radio", { name: "Type" }).check(); // typed turns; the spoken flow has its own test
  await rep.getByRole("button", { name: "Start" }).click();
  await rep.getByLabel("Type what you would say").fill("Of course. What do you think her first question will be?");
  await rep.getByRole("button", { name: "Send" }).click();
  await expect(rep.locator('[data-testid="composer"][data-busy="false"]')).toBeVisible();
  await rep.getByRole("button", { name: /End session|See debrief/ }).first().click();
  await expect(rep.getByRole("heading", { name: "Debrief" })).toBeVisible();

  await page.goto("/manager/team");
  await expect(page.getByTestId("assignments").getByText(/Luis · .*talk to my wife/)).toBeVisible();
  // Practiced is not passed (decision 0030): offline scores are partial, so it stays open and says so.
  await expect(page.getByTestId("assignments").getByText("Tried, no complete score yet")).toBeVisible();
  await expect(page.getByTestId("assignments").getByText("Done")).toHaveCount(0);
  // The rep still sees it first.
  await rep.goto("/today");
  await expect(rep.getByText("Assigned by Carlos")).toBeVisible();
  // A rep cannot assign.
  expect((await rep.request.post("/api/assignments", { data: { userIds: [], scenarioCode: "S-partner-check-L1", dueDate: null, reason: "" } })).status()).toBe(403);
});

test("certification is refused without the live judge, and the team view counts certifications", async ({ page }) => {
  await signInReady(page, "rep@demo.test");
  await page.goto("/practice/S-partner-check-L1?mode=certification");
  await expect(page.getByTestId("cert-badge")).toHaveText("Certification attempt");
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Certification needs the live AI judge" })).toBeVisible();
  const c = db();
  await c.connect();
  const cert = await c.query("select count(*)::int n from sessions where mode = 'certification'");
  expect(cert.rows[0].n).toBe(0);
  await c.end();

  const manager = await page.context().browser()!.newPage();
  await signInReady(manager, "manager@demo.test");
  await manager.goto("/manager/team");
  await expect(manager.getByTestId("cert-Luis")).toHaveText("0/20");
});

test("a manager practices a floor check and is scored on the four parts", async ({ page }) => {
  await signInReady(page, "manager@demo.test");
  await page.goto("/manager/team");
  await page.getByRole("link", { name: "Practice coaching" }).click();
  await page.getByLabel("Behavior").selectOption("B-T002-clarify");
  await expect(page.getByTestId("coach-scene")).toContainText("You watched");
  // A weak check first: no line, no time.
  await page.getByLabel("What you would say to the rep").fill("I saw you go straight to options. Next time slow down.");
  await page.getByRole("button", { name: "Score my floor check" }).click();
  await expect(page.getByTestId("coach-result")).toContainText("50 of 100");
  await expect(page.getByTestId("coach-result")).toContainText("The card's wording for what was missing");
  // The spec 14.2 example.
  await page.getByLabel("What you would say to the rep").fill("I watched your talk with the couple at the Tahoe. When they said the payment was high, you went straight to options. Next time, ask first: 'What number did you have in mind?' Let's try it on your next up. I'll check back after lunch.");
  await page.getByRole("button", { name: "Score my floor check" }).click();
  await expect(page.getByTestId("coach-result")).toContainText("100 of 100");
  await page.goto("/manager/team");
  await expect(page.getByTestId("coach-Carlos")).toHaveText("2 sessions · avg 75");
});

test("the Spanish reviewer approves and edits lines; an edit that breaks a rule is refused; numbers need compliance", async ({ page, browser }) => {
  await signInReady(page, "es@demo.test");
  await expect(page).toHaveURL(/\/review$/);
  await expect(page.getByTestId("review-total")).toHaveText(/^0 of \d{3} lines approved$/);
  await page.getByTestId("review-S-partner-check-L1").click();

  // Approve the opening as written.
  const opening = page.getByTestId("line-opening");
  await opening.getByRole("button", { name: "Approve" }).click();
  await expect(opening.getByTestId("status")).toHaveText("Approved");

  // An edit to a rep line that invents a deadline is refused by the compliance engine.
  const rep = page.getByTestId("line-demo.good.1");
  await rep.getByLabel("Spanish").fill("Claro que sí. Pero este precio es solo por hoy, así que decídase ya.");
  await rep.getByRole("button", { name: "Approve" }).click();
  await expect(rep.getByRole("alert")).toHaveText(/breaks DEAD-01/);
  await expect(rep.getByTestId("status")).toHaveText("Not reviewed");

  // A line with an amount is approved by the Spanish reviewer, then needs the compliance reviewer.
  const amount = page.getByTestId("line-demo.good.6");
  await amount.getByLabel("Spanish").fill("La verdad, son como sesenta dólares más de lo que le dije.");
  await amount.getByRole("button", { name: "Approve" }).click();
  await expect(amount.getByTestId("status")).toHaveText("Needs compliance sign-off");

  const rosa = await browser.newPage();
  await signInReady(rosa, "review@demo.test");
  await rosa.goto("/review/S-partner-check-L1");
  const line = rosa.getByTestId("line-demo.good.6");
  await expect(line.getByText("La verdad, son como sesenta dólares más de lo que le dije.")).toBeVisible();
  await line.getByRole("button", { name: "Sign off the numbers" }).click();
  await expect(line.getByTestId("status")).toHaveText("Approved");
  await rosa.goto("/review");
  await expect(rosa.getByTestId("review-total")).toHaveText(/^2 of \d{3} lines approved$/);
  // A rep cannot review.
  expect((await page.context().request.post("/api/review/compliance", { data: { code: "S-partner-check-L1", lineKey: "opening" } })).status()).toBe(403);
});

test("the reminder job sends once a day to someone whose time has come, and only with its secret", async ({ page }) => {
  // The settings screen offers reminders on this phone (the test browser has no push service to finish subscribing).
  await signInReady(page, "manager@demo.test");
  await page.goto("/settings");
  await expect(page.getByTestId("reminder-push")).toBeVisible();
  const c = db();
  await c.connect();
  // Carlos has not practiced today; his reminder time is a minute ago in Miami, and his one phone's push service is down.
  const carlos = (await c.query("select id, tenant_id from users where email = 'manager@demo.test'")).rows[0] as { id: string; tenant_id: string };
  // No peak hours for this test (it may run on a Saturday afternoon) and no reminder recorded yet today.
  await c.query("update store_policies set peak_hours = '[]' where store_id = (select store_id from memberships where user_id = $1 limit 1)", [carlos.id]);
  await c.query("delete from reminders_sent where user_id = $1", [carlos.id]);
  await c.query("update users set reminder_time = ((now() at time zone 'America/New_York') - interval '1 minute')::time where id = $1", [carlos.id]);
  await c.query("insert into push_subscriptions (tenant_id, user_id, endpoint, p256dh, auth) values ($1, $2, 'https://localhost:1/push/e2e', 'BAAA', 'AAAA') on conflict do nothing", [carlos.tenant_id, carlos.id]);
  const job = (auth?: string) => page.context().request.get("/api/cron/reminders", { headers: auth ? { authorization: auth } : {} });
  expect((await job()).status()).toBe(401);
  expect((await job("Bearer wrong")).status()).toBe(401);
  const first = await job(`Bearer ${CRON_SECRET}`);
  expect(first.status()).toBe(200);
  expect(await first.json()).toMatchObject({ configured: true, people: 1 });
  expect((await c.query("select devices from reminders_sent where user_id = $1", [carlos.id])).rows).toEqual([{ devices: 1 }]);
  // Never two in a day.
  expect(await (await job(`Bearer ${CRON_SECRET}`)).json()).toMatchObject({ people: 0 });
  await c.query("update users set reminder_time = null where id = $1", [carlos.id]);
  await c.query("update store_policies set peak_hours = '[{\"day\": 6, \"from\": \"11:00\", \"to\": \"17:00\"}]' where store_id = (select store_id from memberships where user_id = $1 limit 1)", [carlos.id]);
  await c.end();
});

test("the general manager sees model costs; a rep cannot", async ({ page, browser }) => {
  const c = db();
  await c.connect();
  await c.query(
    `insert into model_usage (tenant_id, purpose, model, prompt_version, input_tokens, output_tokens, cost_usd, latency_ms, ok)
     values ('11111111-1111-4111-8111-111111111111', 'judge', 'claude-opus-5-5', 'judge@1', 5000, 800, 0.12, 9000, true),
            ('11111111-1111-4111-8111-111111111111', 'judge', 'claude-opus-5-5', 'judge@1', 5000, 800, 0.13, 11000, false)`,
  );
  await c.end();
  await signInReady(page, "manager@demo.test");
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await page.getByRole("link", { name: "AI costs" }).click();
  await expect(page.getByTestId("cost-total")).toHaveText("$0.25");
  await expect(page.getByTestId("cost-failures")).toHaveText("50%");
  // Usage (spec 19.4): counts from the sessions the earlier tests ran; the reps' debriefs were seen.
  await page.goto("/manager/dashboard");
  await page.getByRole("link", { name: "Usage", exact: true }).click();
  await expect(page.getByTestId("usage-started")).toHaveText(/^[1-9]\d*$/);
  await expect(page.getByTestId("usage-debriefs")).toHaveText(/^([1-9]\d*)%$/);
  await expect(page.getByTestId("usage-stats")).not.toContainText("undefined");
  const rep = await browser.newPage();
  await signInReady(rep, "rep2@demo.test");
  await rep.goto("/manager/costs");
  await expect(rep).toHaveURL(/localhost:\d+\/today$/);
  await rep.goto("/manager/usage");
  await expect(rep).toHaveURL(/localhost:\d+\/today$/);
});

test("the general manager adds a person who can sign in, then deactivates them", async ({ page, browser }) => {
  await signInReady(page, "manager@demo.test");
  await page.goto("/manager/dashboard");
  await page.getByRole("link", { name: "People", exact: true }).click();
  await page.getByLabel("First name").fill("Daniel");
  await page.getByLabel("Email").fill("e2e-daniel@demo.test");
  await page.getByRole("combobox", { name: /^Language/ }).selectOption("es");
  await page.getByRole("button", { name: "Add to the store" }).click();
  await expect(page.getByRole("status")).toHaveText("Daniel was added and can sign in now.");
  await expect(page.getByTestId("person-Daniel")).toContainText("Active");

  const daniel = await browser.newPage();
  await signInReady(daniel, "e2e-daniel@demo.test");
  await expect(daniel.getByRole("heading", { name: /Daniel/ })).toBeVisible();

  await page.getByTestId("person-Daniel").getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByTestId("person-Daniel")).toContainText("Deactivated");
  // Their next request is refused, whatever session they still hold.
  await daniel.goto("/today");
  await expect(daniel).toHaveURL(/\/login$/);
  // A manager without admin access cannot add people (decision 0032: admin is a privilege, not a role).
  const manager = await browser.newPage();
  await signInReady(manager, "manager2@demo.test");
  expect((await manager.request.post("/api/people", { data: { firstName: "X", email: "e2e-x@demo.test", language: "en", roles: ["rep"] } })).status()).toBe(403);
});

test("a rep sees their progress; a manager opens a rep's detail from the team view", async ({ page, browser }) => {
  await signInReady(page, "rep@demo.test");
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await expect(page.getByTestId("progress-certified")).toHaveText("0/20");
  // Offline scores are partial, so no weekly dimension scores yet; that is said plainly.
  await expect(page.getByTestId("progress-no-scores")).toBeVisible();
  // Mastery from offline practice is marked as covering only what could be scored, never a bare percentage.
  await expect(page.getByTestId("mastery-partial")).toBeVisible();

  const manager = await browser.newPage();
  await signInReady(manager, "manager@demo.test");
  await manager.goto("/manager/team");
  await manager.getByRole("link", { name: "Ana", exact: true }).click();
  await expect(manager.getByRole("heading", { name: "Ana", exact: true })).toBeVisible();
  await expect(manager.getByTestId("progress-cards")).toContainText("Checked on the floor: Yes");
  // A rep cannot open another rep's detail.
  await page.goto(`/manager/team/${(await manager.url()).split("/").pop()}`);
  await expect(page).toHaveURL(/localhost:\d+\/today$/);
});

test("the general manager's dashboard and the team view's coaching focus", async ({ page }) => {
  await signInReady(page, "manager@demo.test");
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await expect(page.getByRole("heading", { name: "Store dashboard" })).toBeVisible();
  await expect(page.getByTestId("dash-certified")).toHaveText("0/2");
  await expect(page.getByTestId("dash-practicing")).toHaveText("2/2");
  await expect(page.getByTestId("dash-flags")).not.toHaveText("0");
  await page.goto("/manager/team");
  // Offline scores are partial, so nobody has complete scores to place them yet.
  await expect(page.getByTestId("focus-Luis")).toHaveText("Not enough scores");
});

test("a manager flags a score with a reason; the rep sees it; the general manager audits and exports", async ({ page, browser }) => {
  const c = db();
  await c.connect();
  const s = await c.query("select s.id, sc.total from sessions s join scores sc on sc.session_id = s.id join users u on u.id = s.user_id where u.email = 'rep2@demo.test' order by s.started_at limit 1");
  await c.end();
  const { id, total } = s.rows[0];

  await signInReady(page, "manager@demo.test");
  await page.goto(`/history/${id}`);
  await page.getByLabel("Why").selectOption("audio_problem");
  await page.getByLabel("What you saw (the rep sees this)").fill("The mic cut out right after the opening.");
  await page.getByRole("button", { name: "Add flag" }).click();
  await expect(page.getByTestId("overrides")).toContainText("Audio or transcription problem · Carlos");

  const ana = await browser.newPage();
  await signInReady(ana, "rep2@demo.test");
  await ana.goto(`/history/${id}`);
  await expect(ana.getByTestId("overrides")).toContainText("The mic cut out right after the opening.");
  await expect(ana.getByRole("button", { name: "Add flag" })).toHaveCount(0);
  const after = db();
  await after.connect();
  expect((await after.query("select total from scores where session_id = $1", [id])).rows[0].total).toBe(total);
  await after.end();

  const gm = await browser.newPage();
  await signInReady(gm, "manager@demo.test");
  await gm.goto("/manager/audit");
  await expect(gm.getByTestId("audit-rows")).toContainText("Changed a score");
  const csv = await gm.request.get("/api/export");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const body = await csv.text();
  expect(body.split("\r\n")[0]).toBe("started_at,rep,scenario_code,mode,language,end_reason,total,passed,honesty_passed,partial,critical_flags,overrides");
  expect(body).toContain("Ana");
  // A manager without admin access cannot export (decision 0032).
  const plain = await browser.newPage();
  await signInReady(plain, "manager2@demo.test");
  expect((await plain.request.get("/api/export")).status()).toBe(403);
});

test("settings: a reminder time, the privacy rule, and signing out on a phone", async ({ page }) => {
  await signInReady(page, "rep@demo.test");
  await expect(page.getByTestId("streak")).toHaveText("1-day practice streak");
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Daily practice reminder").fill("08:30");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await expect(page.getByLabel("Daily practice reminder")).toHaveValue("08:30");
  await expect(page.getByTestId("private-window")).toContainText("as soon as they end");
  // The Pixel 7 viewport: sign out is reachable without the desktop header.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
});

test("the general manager uploads the store's numbers; a bad file is refused by line; a rep cannot upload", async ({ page, browser }) => {
  await signInReady(page, "manager@demo.test");
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await page.getByRole("link", { name: "Store numbers" }).click();
  await expect(page.getByText("No numbers uploaded yet.")).toBeVisible();
  await page.getByTestId("import-file").setInputFiles({ name: "ups.csv", mimeType: "text/csv", buffer: Buffer.from("month,rep,ups,sold\n2026-08,Luis,40,10\n2026-08,2,x\n") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByTestId("import-result")).toContainText("Nothing was imported");
  await expect(page.getByTestId("import-result")).toContainText("line 3: ups must be a whole number");
  await page.getByTestId("import-file").setInputFiles({ name: "ups.csv", mimeType: "text/csv", buffer: Buffer.from("month,rep,ups,sold\r\n2026-08,Luis,40,10\r\n2026-08,rep2@demo.test,60,12\r\n2026-08,Old Timer,20,5\r\n") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByTestId("import-result")).toContainText("Imported 3 rows.");
  await expect(page.getByTestId("import-result")).toContainText("Old Timer");
  // 120 ups, 27 sold: a 23% close rate for August.
  await expect(page.getByTestId("baseline-months").getByRole("row").nth(1).getByRole("cell")).toHaveText(["2026-08", "120", "27", "23%"]);
  // The ups upload recalibrates practice exits; a handful of practice sessions is not enough to move them.
  await expect(page.getByTestId("calibration")).toContainText("stay at 1× the standard rates until the store has at least 30 finished practice sessions");
  // Lost-deal reasons reweight the objections reps practice first (spec 19.2 item 2); unknown reasons are listed.
  await page.getByTestId("import-kind").selectOption("lost_reasons");
  await page.getByTestId("import-file").setInputFiles({ name: "lost.csv", mimeType: "text/csv", buffer: Buffer.from("month,reason,count\n2026-08,Payment too high,20\n2026-08,Pago muy alto,5\n2026-08,Trade value,10\n2026-08,Weather,3\n") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByTestId("import-result")).toContainText("Imported 4 rows.");
  const weights = page.getByTestId("objection-weights");
  await expect(weights).toContainText("The payment is too high");
  await expect(weights).toContainText("×5");
  await expect(weights).toContainText("Not matched to an objection, so not counted: weather (3)");
  // Score validity (spec 19.2 item 3) waits for enough reps with practice and real ups.
  await expect(page.getByTestId("score-validity")).toContainText("Shown once at least 5 reps");
  const rep = await browser.newPage();
  await signInReady(rep, "rep@demo.test");
  const res = await rep.request.post("/api/store/import", { data: { kind: "ups", csv: "month,rep,ups,sold\n2026-08,Luis,1,1\n" } });
  expect(res.status()).toBe(403);
  await rep.goto("/manager/baseline");
  await expect(rep).toHaveURL(/localhost:\d+\/today$/);
});

/**
 * A spoken session, end to end, with the device's recognizer and voice replaced by a script: the customer's lines
 * are spoken sentence by sentence, the turn ends when the rep pauses, talking over the customer stops them, and the
 * pause and speaking rate reach the stored turns (spec 11.3, 11.6).
 */
test("a spoken session: hands-free turns, barge-in, and the pause and pace are stored", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__said = [] as string[];
    w.__cancels = 0;
    w.__ttsMs = 300;
    const pending: (() => void)[] = [];
    const synth = {
      speaking: false,
      speak(u: { text: string; volume?: number; onend?: () => void }) {
        if (!u.text.trim() || u.volume === 0) return; // the silent unlock
        (w.__said as string[]).push(u.text);
        (u as { onstart?: () => void }).onstart?.();
        const done = () => u.onend?.();
        pending.push(done);
        setTimeout(() => { const i = pending.indexOf(done); if (i >= 0) { pending.splice(i, 1); done(); } }, w.__ttsMs as number);
      },
      cancel() { w.__cancels = (w.__cancels as number) + 1; pending.splice(0).forEach((d) => d()); },
      getVoices: () => [],
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    class FakeRecognition {
      lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null; onspeechstart: (() => void) | null = null; onspeechend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null; onend: (() => void) | null = null;
      start() { w.__rec = this; }
      stop() {} abort() {}
    }
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
    // The rep speaks: onset now, the words after `ms`, then the end of speech.
    w.__say = (text: string, ms = 0) => {
      const rec = w.__rec as FakeRecognition;
      rec.onspeechstart?.();
      setTimeout(() => {
        const result = Object.assign([{ transcript: text, confidence: 0.92 }], { isFinal: true });
        rec.onresult?.({ resultIndex: 0, results: [result] });
        rec.onspeechend?.();
      }, ms);
    };
  });
  await signInReady(page, "rep@demo.test");
  await page.goto("/practice/S-partner-check-L1");
  await pastLesson(page);
  await expect(page.getByRole("radio", { name: "Talk" })).toBeChecked();
  await page.getByRole("button", { name: "Start" }).click();
  const status = page.getByTestId("voice-status");
  await expect(status).toHaveText("Your turn. Listening…");
  expect(await page.evaluate(() => (window as unknown as { __said: string[] }).__said[0])).toMatch(/talk to my wife/);

  // A real pause before answering, then a 25-word answer over about nine seconds.
  await page.waitForTimeout(2200);
  await page.evaluate(() => (window as unknown as { __say: (t: string, ms: number) => void }).__say("Of course. It is a big purchase and you should both be comfortable. When you talk tonight, what do you think her first question will be?", 9000));
  await expect(status).toHaveText(/Mike is talking|is thinking|Your turn/, { timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __said: string[] }).__said.length), { timeout: 15_000 }).toBeGreaterThan(1);
  await expect(status).toHaveText("Your turn. Listening…", { timeout: 15_000 });

  // Talk over a long reply: the customer stops and the rep's words start the next turn.
  await page.evaluate(() => { (window as unknown as { __ttsMs: number }).__ttsMs = 6000; });
  await page.evaluate(() => (window as unknown as { __say: (t: string) => void }).__say("That makes sense. Setting the conversation with her aside for a second, is this the right car for you?"));
  await expect(status).toHaveText(/is talking/, { timeout: 15_000 });
  await page.evaluate(() => (window as unknown as { __say: (t: string) => void }).__say("And the payment, is it where you told her it would be?"));
  await expect.poll(() => page.evaluate(() => (window as unknown as { __cancels: number }).__cancels)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Show words" }).click();
  await expect(page.getByText("is this the right car for you?")).toBeVisible();
  await page.getByRole("button", { name: /See debrief|End session/ }).first().click();
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible({ timeout: 30_000 });

  const c = db();
  await c.connect();
  const s = await c.query("select id, text_mode from sessions where user_id = '33333333-3333-4333-8333-333333333301' order by started_at desc limit 1");
  expect(s.rows[0].text_mode).toBe(false);
  const first = await c.query("select pause_before_ms, words_per_minute, asr_confidence from turns where session_id = $1 and speaker = 'rep' order by index limit 1", [s.rows[0].id]);
  await c.end();
  expect(first.rows[0].pause_before_ms).toBeGreaterThanOrEqual(2000);
  expect(first.rows[0].words_per_minute).toBeGreaterThan(140);
  expect(first.rows[0].words_per_minute).toBeLessThan(200);
  expect(first.rows[0].asr_confidence).toBeCloseTo(0.92, 2);
});

test("a typed turn renders the reply, even when the stream is damaged or the page is changed under it", async ({ page }) => {
  // Production bug (October 3): the first typed Send replaced the room with "This page couldn't load". A translator or
  // an extension that removes a node the page drew, while the reply is on its way, produced exactly that screen.
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await signInReady(page, "rep@demo.test");
  await page.goto("/practice/S-partner-check-L1");
  await pastLesson(page);
  await page.getByRole("radio", { name: "Type" }).check();
  await page.getByRole("button", { name: "Start" }).click();
  const say = page.getByLabel("Type what you would say");
  const send = page.getByRole("button", { name: "Send" });
  const free = page.locator('[data-testid="composer"][data-busy="false"]');
  const customer = page.getByTestId("line-customer");
  await expect(customer).toHaveCount(1);

  // A real first turn: the rep's line, then the customer's reply.
  await say.fill("Of course, it's a big decision. What do you think her first question will be?");
  await send.click();
  await expect(page.getByTestId("line-rep")).toHaveCount(1);
  await expect(customer).toHaveCount(2);
  await expect(free).toBeVisible();

  // A damaged stream: a line that is not JSON and a sentence that is not text are skipped; the good sentence shows.
  const turn = "**/api/sessions/*/turn";
  const ndjson = (...lines: string[]) => ({ status: 200, contentType: "application/x-ndjson", body: lines.map((l) => `${l}\n`).join("") });
  const outcome = '{"outcome":{"ended":false,"stoppedOnCritical":false}}';
  await page.route(turn, (r) => r.fulfill(ndjson('{"sentence":"Fine', '{"sentence":{"text":1}}', '{"sentence":"Fine. Tell me more."}', outcome)));
  await say.fill("What matters most to her in a car?");
  await send.click();
  await expect(page.getByText("Fine. Tell me more.")).toBeVisible();
  await expect(free).toBeVisible();

  // The page is changed under React while the reply is on its way: it recovers, keeps the conversation, and says so
  // in the log.
  await page.unroute(turn);
  let release!: () => void;
  const held = new Promise<void>((r) => (release = r));
  await page.route(turn, async (r) => {
    await held;
    await r.fulfill(ndjson('{"sentence":"Okay. She would want to see it."}', outcome));
  });
  const report = page.waitForRequest("**/api/client-error");
  await say.fill("Would she want to see it in person?");
  await send.click();
  await page.getByTestId("typing").waitFor();
  await page.evaluate(() => document.querySelector('[data-testid="typing"]')?.remove());
  release();
  await expect(page.getByText("Okay. She would want to see it.")).toBeVisible();
  expect((await report).postDataJSON()).toMatchObject({ area: "practice", name: "NotFoundError" });
  await expect(page.getByText(/couldn.t load/)).toHaveCount(0);
  await expect(page.getByText("Fine. Tell me more.")).toBeVisible();

  // And the next real turn still works.
  await page.unroute(turn);
  await say.fill("When could you both come in to see it together?");
  await send.click();
  await expect(page.getByTestId("line-rep")).toHaveCount(4);
  await expect(free.or(page.getByText("The conversation has ended."))).toBeVisible();
  expect(crashes).toEqual([]);
});

test("a reload mid-conversation offers the conversation back, and it carries on", async ({ page }) => {
  // Production (October 3): after a crash, "Try again" landed on the lesson and the conversation was gone.
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await signInReady(page, "rep2@demo.test");
  await page.goto("/practice/S-browser-L1");
  await pastLesson(page);
  await page.getByRole("radio", { name: "Type" }).check();
  await page.getByRole("button", { name: "Start" }).click();
  const customer = page.getByTestId("line-customer");
  await expect(customer).toHaveCount(1);
  await page.getByLabel("Type what you would say").fill("Take your time. What brought you in today?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(customer).toHaveCount(2);

  await page.reload();
  await expect(page.getByTestId("resume")).toBeVisible();
  await page.getByRole("button", { name: "Pick it back up" }).click();
  await expect(page.getByTestId("line-rep")).toHaveCount(1);
  await expect(customer).toHaveCount(2);
  await page.getByLabel("Type what you would say").fill("What would make today a good visit for you?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("line-rep")).toHaveCount(2);
  await expect(customer).toHaveCount(3);
  expect(crashes).toEqual([]);
});

test("a typed Send works in browsers whose scroll returns a promise", async ({ page }) => {
  // Production (October 3): every first typed Send showed "TypeError: i is not a function". Newer browsers return a
  // promise from scrollIntoView; the room's scroll effect handed it to React as a cleanup, which React then called.
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element, ...args: Parameters<Element["scrollIntoView"]>) {
      original.apply(this, args);
      return Promise.resolve() as unknown as void;
    };
  });
  const crashes: string[] = [];
  page.on("pageerror", (e) => crashes.push(e.message));
  await signInReady(page, "rep2@demo.test");
  await page.goto("/practice/S-browser-L1");
  await pastLesson(page);
  await page.getByRole("radio", { name: "Type" }).check();
  await page.getByRole("button", { name: "Start" }).click();
  const customer = page.getByTestId("line-customer");
  await expect(customer).toHaveCount(1);
  for (const [i, line] of ["Take your time. What brought you in today?", "What would make this a good visit for you?"].entries()) {
    await page.getByLabel("Type what you would say").fill(line);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByTestId("line-rep")).toHaveCount(i + 1);
    await expect(customer).toHaveCount(i + 2);
  }
  await expect(page.getByText("This screen hit a problem")).toHaveCount(0);

  // When scoring fails, the rep is told and can try again: never a crashed debrief, never a wait that never ends.
  await page.route("**/api/sessions/*/finish", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "judge unavailable" }) }));
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByTestId("finish-failed")).toContainText("We couldn't finish scoring");
  await page.unroute("**/api/sessions/*/finish");

  // While the session is scored, the wait shows what is happening and keeps moving (production: "Scoring your
  // session…" sat for over a minute with nothing changing). The scoring is held the way a slow judge would hold it.
  await page.route("**/api/sessions/*/finish", async (route) => {
    await new Promise((r) => setTimeout(r, 8000));
    await route.continue();
  });
  await page.getByTestId("finish-failed").getByRole("button", { name: "Try again" }).click();
  const stage = page.getByTestId("scoring-stage");
  await expect(stage).toHaveText("Reading your conversation, line by line…");
  await expect(stage).toHaveText("Checking every line against the compliance rules…", { timeout: 9000 });
  await expect(page.getByText(/\d+ s so far/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible({ timeout: 15000 });
  expect(crashes).toEqual([]);
});

test("the app header's language picker: globe, current language, both languages", async ({ page }) => {
  await signInReady(page, "rep2@demo.test");
  await page.goto("/today");
  const picker = page.getByTestId("app-lang");
  await expect(picker).toBeVisible();
  await expect(picker.locator("svg").first()).toBeVisible();
  await expect(picker).toContainText("English");
  await picker.locator("select").selectOption("es");
  await expect(page.getByTestId("app-lang")).toContainText("Español");
  await expect(page.getByRole("link", { name: "Hoy" }).first()).toBeVisible();
  await page.getByTestId("app-lang").locator("select").selectOption("en");
  await expect(page.getByTestId("app-lang")).toContainText("English");
});


test("on an iPhone: the voice plays even where a blank utterance wedges speech, tap to talk uses the keyboard, and the microphone is never opened", async ({ browser }) => {
  // Production (October 4): on Ernesto's iPhone "Test the sound" made no sound, and the microphone prompt appeared but
  // nothing listened. This speech engine behaves like iOS: an utterance of only whitespace never starts and blocks
  // everything queued behind it until cancel(). The app's old unlock spoke " " first, so every line stayed silent.
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__said = [] as string[];
    w.__mic = 0;
    w.__recCreated = 0;
    type U = { text: string; onstart?: (e: unknown) => void; onend?: (e: unknown) => void };
    const synth = {
      speaking: false,
      pending: false,
      wedged: false,
      speak(u: U) {
        if (!u.text.trim()) { synth.wedged = true; synth.pending = true; return; }
        if (synth.wedged) { synth.pending = true; return; }
        (w.__said as string[]).push(u.text);
        setTimeout(() => { u.onstart?.({}); setTimeout(() => u.onend?.({}), 30); }, 10);
      },
      cancel() { synth.wedged = false; synth.pending = false; },
      resume() {},
      getVoices: () => [],
    };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    class FakeRecognition {
      constructor() { w.__recCreated = (w.__recCreated as number) + 1; }
      lang = ""; continuous = false; interimResults = false; maxAlternatives = 1;
      onresult = null; onspeechstart = null; onspeechend = null; onerror = null; onend = null;
      start() {} stop() {} abort() {}
    }
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: () => { w.__mic = (w.__mic as number) + 1; return Promise.reject(new Error("no")); } }, configurable: true });
  });
  const said = () => page.evaluate(() => (window as unknown as { __said: string[] }).__said.filter((x) => x !== "."));
  await signInReady(page, "manager2@demo.test");
  await page.goto("/practice/S-browser-L1");
  await pastLesson(page);
  // Talking on iPhone means the keyboard's dictation key, and the start screen says so.
  await expect(page.getByRole("radio", { name: "Tap to talk" })).toBeChecked();
  await expect(page.getByTestId("answer-hint")).toContainText("keyboard's microphone key");

  // The sound check speaks, and its details show what the engine did.
  await page.getByTestId("test-sound").click();
  await expect.poll(said).toContain("Hi. This is how your customer will sound.");
  await expect(page.getByTestId("sound-details")).toContainText("iPhone/iPad");
  await expect(page.getByTestId("sound-details")).toContainText(/queued 0ms → start \d+ms → end \d+ms/);
  await expect(page.getByTestId("sound-details")).toContainText("Use the keyboard's microphone key");
  const axe = async (where: string) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map((v) => `${where}: ${v.id} ${v.nodes.map((n) => n.target.join(" ")).slice(0, 2).join(", ")}`);
  const a11y = await axe("sound check");

  // The customer's opening line is spoken, with no microphone and no recognizer.
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByTestId("tap-to-talk")).toBeVisible();
  await expect(page.getByTestId("talk-steps")).toContainText("Tap the microphone key on the keyboard");
  await page.waitForTimeout(900); // let the bubbles finish drawing in before colours are measured
  a11y.push(...(await axe("tap to talk")));
  expect(a11y).toEqual([]);
  await expect.poll(async () => (await said()).length).toBeGreaterThan(1);
  await page.getByTestId("tap-to-talk").click();
  await expect(page.getByLabel("Type what you would say")).toBeFocused();

  // A dictated (typed) answer gets a spoken reply; the steps shrink to a reminder after the first answer.
  const before = (await said()).length;
  await page.getByLabel("Type what you would say").fill("Take your time. What brought you in today?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("line-customer")).toHaveCount(2);
  await expect.poll(async () => (await said()).length).toBeGreaterThan(before);
  await expect(page.getByTestId("talk-reminder")).toBeVisible();

  // A tap on a customer line always plays it.
  const again = (await said()).length;
  await page.getByTestId("hear-line").first().click();
  await expect.poll(async () => (await said()).length).toBeGreaterThan(again);

  expect(await page.evaluate(() => (window as unknown as { __recCreated: number }).__recCreated)).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { __mic: number }).__mic)).toBe(0);
  await ctx.close();
});

test("a phone still on an older release reloads once, then offers the update instead of reloading again", async ({ page }) => {
  // A reload can still be served the older page (a rollback, a deploy rolling out): it must never loop.
  await signInReady(page, "rep2@demo.test");
  // Count requests for the page, not finished loads: on a fast machine the one reload starts before the first load
  // ends, which aborts it (CI saw net::ERR_ABORTED on the goto).
  let visits = 0;
  page.on("request", (r) => { if (r.isNavigationRequest() && new URL(r.url()).pathname === "/today") visits += 1; });
  await page.route("**/api/version", (route) => route.fulfill({ json: { build: "a-newer-release" } }));
  await page.goto("/today", { waitUntil: "commit" }).catch(() => undefined);
  await expect(page.getByTestId("update-ready")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  expect(visits).toBe(2); // the page, then exactly one reload
  await page.unroute("**/api/version");
});

test("a tap made while the app reloads for a new release still lands on the tapped screen", async ({ page }) => {
  // October 5: a first tap on "Team" seemed to do nothing. A release check that reloads while a tap is on its way
  // must finish the tap on the new release, not reload the screen the rep was leaving.
  await signInReady(page, "rep2@demo.test");
  let releaseVersion!: () => void;
  const gate = new Promise<void>((r) => (releaseVersion = r));
  await page.route("**/api/version", async (route) => { await gate; await route.fulfill({ json: { build: "a-newer-release" } }); });
  // The next screen is slow to arrive, as on a cold server.
  await page.route(/\/progress\?_rsc=/, async (route) => { await new Promise((r) => setTimeout(r, 4000)); await route.continue().catch(() => undefined); });
  await page.goto("/today");
  await page.waitForTimeout(1000); // hydrated: the tap is the app's own navigation
  const link = page.getByRole("link", { name: "Progress" }).first();
  await link.click();
  await expect(link).toHaveAttribute("data-pending", ""); // the tap shows it landed
  releaseVersion();
  await expect(page).toHaveURL(/\/progress$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.unroute("**/api/version");
});

test("a 3-minute warm-up drills one behavior: the rep sees how it went, the manager only that it was done, never a pass", async ({ page, browser }) => {
  await signInReady(page, "rep@demo.test");
  await page.goto("/today");
  await page.getByTestId("warmup-card").click();
  // Straight to the drill: no lesson, one behavior, its technique and a line to try.
  await expect(page.getByTestId("warmup-brief")).toBeVisible();
  await expect(page.getByTestId("warmup-badge")).toHaveText("Warm-up · 3 min");
  await page.getByRole("radio", { name: "Type" }).check();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByTestId("warmup-clock")).toHaveText(/^[23]:\d\d$/);
  await page.getByLabel("Type what you would say").fill("I hear you. What matters most to you here?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("line-customer")).toHaveCount(2);
  await page.getByRole("button", { name: "End session" }).click();
  await expect(page.getByTestId("warmup-result")).toBeVisible();
  await expect(page.getByTestId("warmup-result")).toContainText("Warm-up done");

  const c = db();
  await c.connect();
  const r = await c.query(
    `select s.focus_item, sc.passed, coalesce((sc.dimensions->>'partial')::boolean, false) partial, jsonb_array_length(sc.items) items
     from sessions s join scores sc on sc.session_id = s.id join users u on u.id = s.user_id
     where u.email = 'rep@demo.test' and s.mode = 'warm_up'`,
  );
  await c.end();
  expect(r.rows).toHaveLength(1);
  expect(r.rows[0]).toMatchObject({ passed: false, partial: true, items: 1 });
  expect(r.rows[0].focus_item).toBeTruthy();

  // History says it was done, without a score; the daily goal still waits for a real session.
  await page.goto("/history");
  await expect(page.getByTestId("warmup-tag").first()).toHaveText("Warm-up done");

  const manager = await browser.newPage();
  await signInReady(manager, "manager@demo.test");
  await manager.goto("/manager/team");
  const tag = manager.getByTestId("warmup-tag").first();
  await expect(tag).toBeVisible();
  await tag.click();
  await expect(manager.getByTestId("warmup-summary")).toBeVisible();
  await expect(manager.getByTestId("warmup-summary")).not.toContainText(/You did it|Not yet|could not be scored/);
  await manager.close();
});

test("one turn at a time: a second turn sent while the customer is answering is refused, and the conversation stays whole", async ({ page }) => {
  await signInReady(page, "rep2@demo.test");
  const started = await page.request.post("/api/sessions", { data: { scenario: "S-partner-check-L1", language: "en", mode: "practice" } });
  expect(started.ok()).toBe(true);
  const { id } = (await started.json()) as { id: string };
  const send = (text: string) => page.request.post(`/api/sessions/${id}/turn`, { data: { text } });
  const [a, b] = await Promise.all([send("Of course. What do you think her first question will be?"), send("And what about the payment?")]);
  expect([a.status(), b.status()].sort()).toEqual([200, 409]);
  const lines = ((await (await page.request.get(`/api/sessions/${id}`)).json()) as { lines: { speaker: string }[] }).lines;
  expect(lines.map((l) => l.speaker)).toEqual(["customer", "rep", "customer"]);
});
