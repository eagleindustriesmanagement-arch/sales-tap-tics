import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import pg from "pg";
import { OUTBOX } from "../playwright.config";

const db = () => new pg.Client({ connectionString: process.env.DATABASE_URL });

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
}


test("a rep signs in, accepts the notice, practices, and the session is saved", async ({ page }) => {
  await signIn(page, "rep@demo.test");
  await expect(page).toHaveURL(/\/consent$/);
  await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page.getByRole("heading", { name: /Today, Luis/ })).toBeVisible();

  await page.getByRole("link", { name: "Practice now" }).click();
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
  await page.getByRole("link", { name: "Practice now" }).click();
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
  await expect(page.getByRole("cell", { name: "Luis" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Ana" })).toBeVisible();
  await expect(page.getByText(/\(checked\)/)).toBeVisible();

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
