import { chromium, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
const OUT = process.env.SHOTS!;
const OUTBOX = process.env.TAPTICS_CODE_OUTBOX!;
const base = "http://localhost:3300";
const browser = await chromium.launch();
async function as(email: string) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/login`);
  await page.getByLabel("Email or mobile number").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await page.getByLabel("Six-digit code").waitFor();
  const sent = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code: string });
  await page.getByLabel("Six-digit code").fill(sent.filter((m) => m.identifier === email).at(-1)!.code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  if (page.url().endsWith("/consent")) await page.getByRole("button", { name: "I understand and agree" }).click();
  return page;
}
async function shot(page: import("@playwright/test").Page, path: string, name: string, scrollTo?: string) {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(`${base}${path}`);
    await page.waitForLoadState("networkidle");
    if (scrollTo) await page.getByText(scrollTo).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${name}-${scheme}.png` });
  }
}
const rep = await as("rep@demo.test");
await shot(rep, "/practice", "practice-top");
await shot(rep, "/practice", "practice-more", "More customers");
await shot(rep, "/library/O28", "library-o28", "Practice this objection");
const gm = await as("gm@demo.test");
await shot(gm, "/manager/usage", "usage");
await shot(gm, "/manager/baseline", "baseline-weights", "What costs the store deals");
await browser.close();
