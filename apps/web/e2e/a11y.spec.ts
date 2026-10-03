import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { OUTBOX } from "../playwright.config";

/** Accessibility audit (spec 20, M7): WCAG 2.1 A and AA rules on every main screen, for each role. */
async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email or mobile number").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByLabel("Six-digit code")).toBeVisible();
  const sent = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code?: string });
  await page.getByLabel("Six-digit code").fill(sent.filter((m) => m.identifier === email && m.code).at(-1)!.code!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  if (/\/consent$/.test(page.url())) await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page).not.toHaveURL(/\/consent$/);
}

/** Every screen in both themes: dark mode is first-class (docs/DESIGN-GUIDELINES.md §7), so its contrast is audited too. */
async function check(page: Page, label: string) {
  const found: string[] = [];
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    // Let the ring and bar draw-in animations finish so colours are measured at rest (LIQUID-GLASS §7).
    await page.waitForTimeout(950);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    found.push(...r.violations.map((v) => `${label} (${scheme}): ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`));
  }
  await page.emulateMedia({ colorScheme: "light" });
  expect(found).toEqual([]);
}

async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await check(page, path);
}

test("the login page", async ({ page }) => {
  await audit(page, "/login");
});

test("rep screens", async ({ page }) => {
  await signIn(page, "rep@demo.test");
  for (const path of ["/today", "/practice", "/practice/S-partner-check-L1", "/history", "/progress", "/settings", "/library", "/library/T002"]) await audit(page, path);
});

test("a live practice session and its debrief", async ({ page }) => {
  await signIn(page, "rep2@demo.test");
  await page.goto("/practice/S-thinker-L1");
  await page.getByRole("radio", { name: "Type" }).check(); // typed turns; the spoken flow has its own test
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByLabel("Type what you would say").fill("Of course, take your time. What would you want to be sure about before you decide?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.locator('[data-testid="composer"][data-busy="false"]')).toBeVisible();
  await check(page, "practice room (live)");
  await page.getByRole("button", { name: /End session|See debrief/ }).first().click();
  await expect(page.getByRole("heading", { name: "Debrief" })).toBeVisible();
  await check(page, "debrief");
});

test("a spoken practice session", async ({ page }) => {
  // The device's recognizer and voice are replaced by stand-ins; the screen is what is audited.
  await page.addInitScript(() => {
    const synth = { speaking: false, speak(u: { onend?: () => void }) { setTimeout(() => u.onend?.(), 150); }, cancel() {}, getVoices: () => [] };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    class Rec { lang = ""; continuous = false; interimResults = false; maxAlternatives = 1; start() {} stop() {} abort() {} onresult = null; onerror = null; onend = null; onspeechstart = null; onspeechend = null; }
    Object.assign(window, { SpeechRecognition: Rec, webkitSpeechRecognition: Rec });
  });
  await signIn(page, "rep2@demo.test");
  await page.goto("/practice/S-thinker-L1");
  await page.getByRole("radio", { name: "Talk" }).check();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByTestId("voice-status")).toHaveText("Your turn. Listening…");
  await page.getByRole("button", { name: "Show words" }).click();
  await check(page, "practice room (voice)");
});

test("manager screens", async ({ page }) => {
  await signIn(page, "gm@demo.test");
  for (const path of ["/manager/floor", "/manager/team", "/manager/assign", "/manager/coach", "/manager/compliance", "/manager/store", "/manager/costs", "/manager/people", "/manager/dashboard", "/manager/audit", "/manager/baseline", "/manager/usage"]) await audit(page, path);
});

test("review screens", async ({ page }) => {
  await signIn(page, "es@demo.test");
  for (const path of ["/review", "/review/S-partner-check-L1"]) await audit(page, path);
});
