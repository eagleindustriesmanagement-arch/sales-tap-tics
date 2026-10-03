import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import pg from "pg";
import { OUTBOX } from "../playwright.config";

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
    await page.goto("/");
    if (!/\/login$/.test(page.url())) return;
  }
  await signIn(page, email);
  if (/\/consent$/.test(page.url())) await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page).not.toHaveURL(/\/consent$/);
  sessions.set(email, await page.context().cookies());
}

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email or mobile number").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
  const sent = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code: string });
  const code = sent.filter((m) => m.identifier === email).at(-1)!.code;
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
  await expect(page.getByText(/The payment is about \$60 a month above/)).toBeVisible();

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
  await expect(page.locator("section").filter({ hasText: "Luis" })).toHaveCount(0);
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

  const c = db();
  await c.connect();
  const q = await c.query("select script_followed, specific_feedback, line_modeled from manager_check_quality");
  expect(q.rows).toEqual([{ script_followed: true, specific_feedback: true, line_modeled: true }]);
  const cards = await c.query("select u.email, c.status from behavior_card_issues c join users u on u.id = c.user_id");
  expect(cards.rows).toEqual([{ email: "rep2@demo.test", status: "checked" }]);
  await c.end();
});

test("a rep cannot open manager screens or another rep's session", async ({ page }) => {
  await signIn(page, "rep2@demo.test");
  // The server refuses the manager screen and sends the rep home.
  await page.goto("/manager/floor").catch(() => undefined);
  await expect(page).toHaveURL(/localhost:\d+\/$/);
  const c = db();
  await c.connect();
  const other = await c.query("select s.id from sessions s join users u on u.id = s.user_id where u.email = 'rep@demo.test' limit 1");
  await c.end();
  const res = await page.goto(`/history/${other.rows[0].id}`);
  expect(res?.status()).toBe(404);
  const api = await page.request.post("/api/floor-checks", { data: { cardIssueId: "00000000-0000-0000-0000-000000000000", observed: "yes" } });
  expect(api.status()).toBe(403);
});

test("the general manager edits store setup, the reviewer signs it off and sees the compliance flags", async ({ page, browser }) => {
  await signIn(page, "gm@demo.test");
  await page.getByRole("button", { name: "I understand and agree" }).click();
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

test("a manager assigns practice with a reason; the rep sees it first, practices it, and it shows as done", async ({ page, browser }) => {
  await signInReady(page, "manager@demo.test");
  await page.goto("/manager/team");
  await page.getByRole("link", { name: "Assign practice" }).click();
  await page.getByLabel("Scenario").selectOption("S-partner-check-L1");
  await page.getByLabel("Luis").check();
  await page.getByLabel("Due date (optional)").fill("2026-12-31");
  await page.getByLabel("Reason the rep will see").fill("Ask what she will ask first before you show options.");
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Assigned to 1.");

  const rep = await browser.newPage();
  await signInReady(rep, "rep@demo.test");
  await expect(rep.getByText("Assigned by Carlos")).toBeVisible();
  await expect(rep.getByTestId("assignment-reason")).toHaveText(/Ask what she will ask first/);
  await rep.getByRole("link", { name: "Practice now" }).click();
  await expect(rep).toHaveURL(/\/practice\/S-partner-check-L1$/);
  await rep.getByRole("radio", { name: "Type" }).check(); // typed turns; the spoken flow has its own test
  await rep.getByRole("button", { name: "Start" }).click();
  await rep.getByLabel("Type what you would say").fill("Of course. What do you think her first question will be?");
  await rep.getByRole("button", { name: "Send" }).click();
  await expect(rep.locator('[data-testid="composer"][data-busy="false"]')).toBeVisible();
  await rep.getByRole("button", { name: /End session|See debrief/ }).first().click();
  await expect(rep.getByRole("heading", { name: "Debrief" })).toBeVisible();

  await page.goto("/manager/team");
  await expect(page.getByTestId("assignments").getByText(/Luis · .*talk to my wife/)).toBeVisible();
  await expect(page.getByTestId("assignments").getByText("Done")).toBeVisible();
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
  await expect(page.getByTestId("coach-Carlos")).toHaveText("2 · 75");
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

test("the general manager sees model costs; a rep cannot", async ({ page, browser }) => {
  const c = db();
  await c.connect();
  await c.query(
    `insert into model_usage (tenant_id, purpose, model, prompt_version, input_tokens, output_tokens, cost_usd, latency_ms, ok)
     values ('11111111-1111-4111-8111-111111111111', 'judge', 'claude-opus-5-5', 'judge@1', 5000, 800, 0.12, 9000, true),
            ('11111111-1111-4111-8111-111111111111', 'judge', 'claude-opus-5-5', 'judge@1', 5000, 800, 0.13, 11000, false)`,
  );
  await c.end();
  await signInReady(page, "gm@demo.test");
  await page.getByRole("link", { name: "Dashboard" }).first().click();
  await page.getByRole("link", { name: "AI costs" }).click();
  await expect(page.getByTestId("cost-total")).toHaveText("$0.25");
  await expect(page.getByTestId("cost-failures")).toHaveText("50%");
  const rep = await browser.newPage();
  await signInReady(rep, "rep2@demo.test");
  await rep.goto("/manager/costs");
  await expect(rep).toHaveURL(/localhost:\d+\/$/);
});

test("the general manager adds a person who can sign in, then deactivates them", async ({ page, browser }) => {
  await signInReady(page, "gm@demo.test");
  await page.goto("/manager/dashboard");
  await page.getByRole("link", { name: "People", exact: true }).click();
  await page.getByLabel("First name").fill("Daniel");
  await page.getByLabel("Email").fill("e2e-daniel@demo.test");
  await page.getByLabel("Language").selectOption("es");
  await page.getByRole("button", { name: "Add to the store" }).click();
  await expect(page.getByRole("status")).toHaveText("Daniel was added and can sign in now.");
  await expect(page.getByTestId("person-Daniel")).toContainText("Active");

  const daniel = await browser.newPage();
  await signInReady(daniel, "e2e-daniel@demo.test");
  await expect(daniel.getByRole("heading", { name: /Daniel/ })).toBeVisible();

  await page.getByTestId("person-Daniel").getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByTestId("person-Daniel")).toContainText("Deactivated");
  // Their next request is refused, whatever session they still hold.
  await daniel.goto("/");
  await expect(daniel).toHaveURL(/\/login$/);
  // The same email can't be added twice while active, and a manager cannot add people.
  const manager = await browser.newPage();
  await signInReady(manager, "manager@demo.test");
  expect((await manager.request.post("/api/people", { data: { firstName: "X", email: "e2e-x@demo.test", language: "en", roles: ["rep"] } })).status()).toBe(403);
});

test("a rep sees their progress; a manager opens a rep's detail from the team view", async ({ page, browser }) => {
  await signInReady(page, "rep@demo.test");
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
  await expect(page.getByTestId("progress-certified")).toHaveText("0/20");
  // Offline scores are partial, so no weekly dimension scores yet; that is said plainly.
  await expect(page.getByTestId("progress-no-scores")).toBeVisible();

  const manager = await browser.newPage();
  await signInReady(manager, "manager@demo.test");
  await manager.goto("/manager/team");
  await manager.getByRole("link", { name: "Ana", exact: true }).click();
  await expect(manager.getByRole("heading", { name: "Ana" })).toBeVisible();
  await expect(manager.getByTestId("progress-cards")).toContainText("Checked on the floor: Yes");
  // A rep cannot open another rep's detail.
  await page.goto(`/manager/team/${(await manager.url()).split("/").pop()}`);
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("the general manager's dashboard and the team view's coaching focus", async ({ page }) => {
  await signInReady(page, "gm@demo.test");
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
  await signInReady(gm, "gm@demo.test");
  await gm.goto("/manager/audit");
  await expect(gm.getByTestId("audit-rows")).toContainText("score.override");
  const csv = await gm.request.get("/api/export");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const body = await csv.text();
  expect(body.split("\r\n")[0]).toBe("started_at,rep,scenario_code,mode,language,end_reason,total,passed,honesty_passed,partial,critical_flags,overrides");
  expect(body).toContain("Ana");
  expect((await page.request.get("/api/export")).status()).toBe(403);
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
  await signInReady(page, "gm@demo.test");
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
  const rep = await browser.newPage();
  await signInReady(rep, "rep@demo.test");
  const res = await rep.request.post("/api/store/import", { data: { kind: "ups", csv: "month,rep,ups,sold\n2026-08,Luis,1,1\n" } });
  expect(res.status()).toBe(403);
  await rep.goto("/manager/baseline");
  await expect(rep).toHaveURL(/localhost:\d+\/$/);
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
      speak(u: { text: string; onend?: () => void }) {
        if (!u.text.trim()) return;
        (w.__said as string[]).push(u.text);
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
