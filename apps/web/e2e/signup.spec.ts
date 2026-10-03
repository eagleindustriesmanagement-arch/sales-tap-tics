import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { OUTBOX } from "../playwright.config";

/** The newest code mailed to an address (the outbox also holds invitations, which carry no code). */
function lastCode(email: string) {
  const sent = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code?: string; subject?: string });
  return sent.filter((m) => m.identifier === email && m.code).at(-1)!.code!;
}

async function axe(page: Page, label: string) {
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(r.violations.map((v) => `${label}: ${v.id} ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
}

test("a dealership signs up, the owner invites a rep, and the rep practices in the new store only", async ({ page, browser }) => {
  const run = Date.now();
  const owner = `owner-${run}@pilot.test`;
  const repEmail = `rep-${run}@pilot.test`;

  // Sign-in offers the pilot; the pilot form asks for the store and a work email.
  await page.goto("/login");
  await axe(page, "/login");
  await page.getByRole("link", { name: "Start a pilot" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole("heading", { level: 1, name: "Start a pilot" })).toBeVisible();
  await axe(page, "/signup");
  await page.getByLabel("Store name").fill(`Coral Gables Chevrolet ${run}`);
  await page.getByLabel("Your first name").fill("Marisol");
  await page.getByLabel("Work email").fill(owner.toUpperCase());
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText(`We emailed a six-digit code to ${owner.toUpperCase()}`)).toBeVisible();
  // A wrong code is refused and creates nothing.
  await page.getByLabel("Six-digit code").fill(lastCode(owner) === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Open my store" }).click();
  await expect(page.getByText("That code is not right.")).toBeVisible();
  await page.getByLabel("Six-digit code").fill(lastCode(owner));
  await page.getByRole("button", { name: "Open my store" }).click();

  // The owner accepts the notice and lands on People, welcomed, alone in the new store.
  await expect(page).toHaveURL(/\/consent$/);
  await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page).toHaveURL(/\/manager\/people\?welcome=1$/);
  await expect(page.getByTestId("welcome")).toContainText("Your store is open");
  await expect(page.getByText(owner)).toBeVisible();
  await expect(page.getByText("rep@demo.test")).toHaveCount(0);

  // The owner adds a rep; the rep is told by email.
  await page.getByLabel("First name").fill("Yoel");
  await page.getByLabel("Email").fill(repEmail);
  await page.getByRole("button", { name: "Add to the store" }).click();
  await expect(page.getByRole("status")).toHaveText("Yoel was added and can sign in now.");
  const outbox = readFileSync(OUTBOX, "utf8");
  expect(outbox).toContain(`"identifier":"${repEmail}","subject":"Coral Gables Chevrolet ${run} added you to Sales Taptics"`);

  // The owner's team is the new store's: the demo reps are not there.
  await page.goto("/manager/team");
  await expect(page.getByText("Luis")).toHaveCount(0);

  // The rep signs in with their own code and practices in the new store.
  const ctx = await browser.newContext();
  const rep = await ctx.newPage();
  await rep.goto("/login");
  await rep.getByLabel("Email or mobile number").fill(repEmail);
  await rep.getByRole("button", { name: "Send me a code" }).click();
  await expect(rep.getByLabel("Six-digit code")).toBeVisible();
  await rep.getByLabel("Six-digit code").fill(lastCode(repEmail));
  await rep.getByRole("button", { name: "Sign in" }).click();
  await expect(rep).toHaveURL(/\/consent$/);
  await rep.getByRole("button", { name: "I understand and agree" }).click();
  await expect(rep).toHaveURL(/\/today$/);
  await expect(rep.getByRole("heading", { name: /Yoel/ })).toBeVisible();
  await rep.goto("/practice/S-partner-check-L1");
  await rep.getByRole("radio", { name: "Type" }).check();
  await rep.getByRole("button", { name: "Start" }).click();
  await rep.getByLabel("Type what you would say").fill("Of course. What do you think her first question will be?");
  await rep.getByRole("button", { name: "Send" }).click();
  await expect(rep.getByTestId("line-customer")).toHaveCount(2);
  await ctx.close();

  // Signing up again with an email that has an account just signs in: no second store.
  const again = await browser.newContext();
  const p2 = await again.newPage();
  await p2.goto("/signup");
  await p2.getByLabel("Store name").fill("Another store");
  await p2.getByLabel("Work email").fill(owner);
  await p2.getByRole("button", { name: "Email me a code" }).click();
  await expect(p2.getByLabel("Six-digit code")).toBeVisible();
  await p2.getByLabel("Six-digit code").fill(lastCode(owner));
  await p2.getByRole("button", { name: "Open my store" }).click();
  await expect(p2).toHaveURL(/\/(today|manager\/floor)$/);
  await again.close();
});
