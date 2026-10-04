import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { OUTBOX } from "../playwright.config";

/** Practice opens on the lesson (decision 0031); tests that are about something else step past it. */
async function pastLesson(page: Page) {
  const skip = page.getByRole("button", { name: "Skip to practice" });
  await expect(skip.or(page.getByRole("radio", { name: "Type" }))).toBeVisible();
  if (await skip.isVisible()) await skip.click();
}

/** The newest code mailed to an address (the outbox also holds invitations, which carry no code). */
function lastCode(email: string) {
  const sent = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code?: string });
  return sent.filter((m) => m.identifier === email && m.code).at(-1)!.code!;
}

async function axe(page: Page, label: string) {
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${label}: ${v.id} ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
}

async function codeStep(page: Page, email: string, button: string) {
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
  await page.getByLabel("Six-digit code").fill(lastCode(email));
  await page.getByRole("button", { name: button }).click();
  await expect(page).toHaveURL(/\/consent$/);
  await page.getByRole("button", { name: "I understand and agree" }).click();
}

test("a manager signs up a team, sends an invite link, and whoever joins through it practices on that team", async ({ page, browser }) => {
  const run = Date.now();
  const owner = `owner-${run}@pilot.test`;
  const repEmail = `rep-${run}@pilot.test`;
  const team = `Coral Gables Chevrolet ${run}`;

  // Sign-in offers sign-up; sign-up offers a team or just me.
  await page.goto("/login");
  await axe(page, "/login");
  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { level: 1, name: "Get started" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "For my team" })).toBeChecked();
  await axe(page, "/signup");
  await page.getByLabel("Team or company name").fill(team);
  await page.getByLabel("Your first name").fill("Marisol");
  await page.getByLabel("Work email").fill(owner.toUpperCase());
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText(`We emailed a six-digit code to ${owner.toUpperCase()}`)).toBeVisible();
  // A wrong code is refused and creates nothing.
  await page.getByLabel("Six-digit code").fill(lastCode(owner) === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Open my store" }).click();
  await expect(page.getByText("That code is not right.")).toBeVisible();
  await codeStep(page, owner, "Open my store");

  // The owner lands on Team, welcomed, with the invite link first; admin screens are theirs too.
  await expect(page).toHaveURL(/\/manager\/team\?welcome=1$/);
  await expect(page.getByTestId("welcome")).toContainText("Your team is open");
  await page.getByRole("button", { name: "Make a link for reps" }).click();
  const url = (await page.getByTestId("invite-url").textContent())!.trim();
  expect(url).toMatch(/\/join\/[A-Za-z0-9_-]{30,}$/);
  await expect(page.getByTestId("invite-panel")).toContainText("Rep link · 0 joined");

  // A rep opens the link, joins with their own email, and practices on this team.
  const ctx = await browser.newContext();
  const rep = await ctx.newPage();
  await rep.goto(url);
  await expect(rep.getByRole("heading", { level: 1, name: `Join ${team}` })).toBeVisible();
  await axe(rep, "/join");
  await rep.getByLabel("Your first name").fill("Yoel");
  await rep.getByLabel("Email").fill(repEmail);
  await rep.getByRole("button", { name: "Email me a code" }).click();
  await codeStep(rep, repEmail, "Join the team");
  await expect(rep).toHaveURL(/\/today$/);
  await expect(rep.getByRole("heading", { name: /Yoel/ })).toBeVisible();
  await rep.goto("/practice/S-partner-check-L1");
  await pastLesson(rep);
  await rep.getByRole("radio", { name: "Type" }).check();
  await rep.getByRole("button", { name: "Start" }).click();
  await rep.getByLabel("Type what you would say").fill("Of course. What do you think her first question will be?");
  await rep.getByRole("button", { name: "Send" }).click();
  await expect(rep.getByTestId("line-customer")).toHaveCount(2);
  await ctx.close();

  // The manager sees the new rep on the team, and the link counts them; turning it off closes it.
  await page.goto("/manager/team");
  await expect(page.getByRole("link", { name: "Yoel" })).toBeVisible();
  await expect(page.getByTestId("invite-panel")).toContainText("Rep link · 1 joined");
  await page.getByRole("button", { name: "Turn off" }).click();
  await expect(page.getByTestId("invite-panel")).not.toContainText("Rep link");
  const late = await browser.newPage();
  await late.goto(url);
  await expect(late.getByRole("heading", { level: 1, name: "This link has expired" })).toBeVisible();
  await late.close();

  // A wrong address is a real 404 with a way back.
  const missing = await page.goto("/no-such-page");
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Wrong lot." })).toBeVisible();
});

test("an individual signs up alone, whatever they sell; no team screens", async ({ page }) => {
  const email = `solo-${Date.now()}@solar.test`;
  await page.goto("/signup?for=me");
  await expect(page.getByRole("radio", { name: "Just for me" })).toBeChecked();
  await expect(page.getByLabel("Team or company name")).toHaveCount(0);
  await page.getByLabel("Your first name").fill("Iris");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("What do you sell?").selectOption("solar");
  await page.getByRole("button", { name: "Email me a code" }).click();
  await codeStep(page, email, "Start practicing");
  await expect(page).toHaveURL(/\/today$/);
  // Their own industry's customers (decision 0033): solar customers on the plan, no "coming soon" note.
  await expect(page.getByTestId("industry-note")).toHaveCount(0);
  await expect(page.locator('a[href^="/practice/S-solar-"]').first()).toBeVisible();
  // Alone: the rep's tabs, and manager screens send them home.
  await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);
  await page.goto("/manager/team");
  await expect(page).toHaveURL(/\/today$/);
});

test("sign-in never says a code was sent when the request failed", async ({ page }) => {
  await page.route("**/api/auth/request", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"internal"}' }));
  await page.goto("/login");
  await page.getByLabel("Email or mobile number").fill("someone@example.test");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByText("Something went wrong on our side. Try again in a moment.")).toBeVisible();
  await expect(page.getByLabel("Six-digit code")).toHaveCount(0);
});

test("the sign-in page's language picker matches the app's", async ({ page }) => {
  await page.goto("/login");
  const picker = page.getByTestId("auth-lang");
  await expect(picker.locator("svg").first()).toBeVisible();
  await expect(picker).toContainText("English");
  await picker.locator("select").selectOption("es");
  await expect(page.getByTestId("auth-lang")).toContainText("Español");
  await expect(page.getByLabel("Correo o número de celular")).toBeVisible();
});

test("when the code email cannot be sent, sign-up says so kindly and can be tried again", async ({ page }) => {
  // Production: the email provider refused the sending domain. The person sees a plain message, never an error page.
  let calls = 0;
  await page.route("**/api/auth/signup", (r) => {
    calls += 1;
    return calls === 1 ? r.fulfill({ status: 503, contentType: "application/json", body: '{"status":"unavailable"}' }) : r.abort();
  });
  await page.goto("/signup?for=me");
  await page.getByLabel("Your first name").fill("Iris");
  await page.getByLabel("Email").fill("iris@example.test");
  const send = page.getByRole("button", { name: "Email me a code" });
  await send.click();
  await expect(page.getByText("We couldn't send your code just now. Please try again in a few minutes.")).toBeVisible();
  // A lost connection on the retry: still a message, and the button works again.
  await send.click();
  await expect(page.getByText("Something went wrong on our side. Try again in a moment.").or(page.getByText("We couldn't send your code just now. Please try again in a few minutes."))).toBeVisible();
  await expect(send).toBeEnabled();
  await expect(page.getByLabel("Six-digit code")).toHaveCount(0);
});
