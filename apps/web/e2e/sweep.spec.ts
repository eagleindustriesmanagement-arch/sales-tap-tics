import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { STRINGS } from "@taptics/i18n";
import { OUTBOX } from "../playwright.config";

/**
 * Regression sweep: every screen of every role, in English and in Spanish, on a phone. A screen fails if it crashes,
 * logs an error, gets a server error, scrolls sideways, or (in Spanish) shows an English interface line.
 */

/** Interface lines that read differently in Spanish: any of them on a Spanish screen is a missed translation. */
const ENGLISH_ONLY = Object.values(STRINGS as Record<string, { en: string; es: string }>)
  .map((s) => s.en)
  .filter((en, i, all) => all.indexOf(en) === i)
  .filter((en) => !/[{}]/.test(en) && en.split(/\s+/).length >= 3)
  .filter((en) => Object.values(STRINGS as Record<string, { en: string; es: string }>).every((s) => s.en !== en || s.es.trim() !== en.trim()));

/** One sign-in per account for the whole sweep: the login screen allows only a few codes per account (anti-abuse). */
const signedIn = new Map<string, Awaited<ReturnType<BrowserContext["cookies"]>>>();

async function signIn(page: Page, email: string) {
  const saved = signedIn.get(email);
  if (saved) {
    await page.context().addCookies(saved.filter((c) => c.name !== "lang"));
    return;
  }
  await page.goto("/login");
  await page.getByLabel(/Email or mobile number|Correo o número de celular/).fill(email);
  await page.getByRole("button", { name: /Send me a code|Envíeme un código/ }).click();
  await expect(page.getByLabel(/Six-digit code|Código de seis dígitos/)).toBeVisible();
  const sent = readFileSync(OUTBOX, "utf8").trim().split("\n").map((l) => JSON.parse(l) as { identifier: string; code?: string });
  await page.getByLabel(/Six-digit code|Código de seis dígitos/).fill(sent.filter((m) => m.identifier === email && m.code).at(-1)!.code!);
  await page.getByRole("button", { name: /^(Sign in|Entrar)$/ }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  if (/\/consent$/.test(page.url())) await page.getByRole("button", { name: /I understand and agree|Entiendo y acepto/ }).click();
  await expect(page).not.toHaveURL(/\/consent$/);
  signedIn.set(email, await page.context().cookies());
}

async function setLanguage(context: BrowserContext, lang: "en" | "es") {
  await context.addCookies([{ name: "lang", value: lang, url: "http://localhost:3200" }]);
}

/** Visits one screen and returns what is wrong with it. */
async function visit(page: Page, path: string, lang: "en" | "es"): Promise<string[]> {
  const problems: string[] = [];
  const onError = (e: Error) => problems.push(`${path} [${lang}] page error: ${e.message}`);
  const onConsole = (m: { type: () => string; text: () => string }) => {
    if (m.type() === "error" && !/Failed to load resource: the server responded with a status of 40[134]/.test(m.text())) problems.push(`${path} [${lang}] console: ${m.text().slice(0, 200)}`);
  };
  const onResponse = (r: { status: () => number; url: () => string }) => {
    if (r.status() >= 500) problems.push(`${path} [${lang}] ${r.status()} from ${r.url()}`);
  };
  page.on("pageerror", onError);
  page.on("console", onConsole);
  page.on("response", onResponse);
  const res = await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  if (!res || res.status() >= 400) problems.push(`${path} [${lang}] HTTP ${res?.status()}`);
  if (await page.getByText(/This screen hit a problem|Esta pantalla tuvo un problema/).count()) problems.push(`${path} [${lang}] error screen shown`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) problems.push(`${path} [${lang}] scrolls sideways by ${overflow}px`);
  if (lang === "es") {
    const text = await page.locator("body").innerText();
    const leaks = ENGLISH_ONLY.filter((en) => text.includes(en));
    if (leaks.length) problems.push(`${path} [es] English on a Spanish screen: ${leaks.slice(0, 5).map((l) => `"${l}"`).join(", ")}`);
  }
  if (process.env.SWEEP_SHOTS) await page.screenshot({ path: `${process.env.SWEEP_SHOTS}/${lang}${path.replace(/\//g, "_")}.png`, fullPage: true });
  page.off("pageerror", onError);
  page.off("console", onConsole);
  page.off("response", onResponse);
  return problems;
}

/** The first link on a list screen that leads to a detail screen, so the sweep covers one of each. */
async function firstLink(page: Page, list: string, pattern: RegExp): Promise<string | null> {
  await page.goto(list);
  const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  return hrefs.find((h) => pattern.test(h)) ?? null;
}

for (const lang of ["en", "es"] as const) {
  test(`every rep screen works in ${lang === "en" ? "English" : "Spanish"}`, async ({ page, context }) => {
    await setLanguage(context, lang);
    await signIn(page, "rep@demo.test");
    const paths = ["/today", "/practice", "/practice/S-partner-check-L1", "/practice/S-solar-partner-L1", "/history", "/progress", "/settings", "/library", "/library/T002"];
    const session = await firstLink(page, "/history", /^\/history\/[0-9a-f-]{36}$/);
    if (session) paths.push(session);
    const problems: string[] = [];
    for (const p of paths) problems.push(...(await visit(page, p, lang)));
    expect(problems).toEqual([]);
  });

  test(`every manager screen works in ${lang === "en" ? "English" : "Spanish"}`, async ({ page, context }) => {
    await setLanguage(context, lang);
    await signIn(page, "manager@demo.test");
    const paths = ["/manager/dashboard", "/manager/team", "/manager/assign", "/manager/floor", "/manager/coach", "/manager/people", "/manager/store", "/manager/baseline", "/manager/compliance", "/manager/audit", "/manager/costs", "/manager/usage"];
    const rep = await firstLink(page, "/manager/team", /^\/manager\/team\/[0-9a-f-]{36}$/);
    if (rep) paths.push(rep);
    const problems: string[] = [];
    for (const p of paths) problems.push(...(await visit(page, p, lang)));
    expect(problems).toEqual([]);
  });

  test(`the reviewer's and the public screens work in ${lang === "en" ? "English" : "Spanish"}`, async ({ page, context }) => {
    await setLanguage(context, lang);
    const problems: string[] = [];
    for (const p of ["/", "/pricing", "/login", "/signup"]) problems.push(...(await visit(page, p, lang)));
    await signIn(page, "review@demo.test");
    const paths = ["/review"];
    const item = await firstLink(page, "/review", /^\/review\/S-/);
    if (item) paths.push(item);
    for (const p of paths) problems.push(...(await visit(page, p, lang)));
    expect(problems).toEqual([]);
  });
}

/**
 * Every control a screen shows can be tapped where the browser puts it. Each one is scrolled to the bottom edge the
 * way focus, find-in-page and test tools scroll ("end"), then hit-tested: a fixed bar over it would take the tap
 * (the October 4 report: the Start bar covered half a button and won the tap on a radio above it).
 */
async function nothingUnderTheBar(page: Page, label: string): Promise<string[]> {
  return page.evaluate(async (where) => {
    const fixedAncestor = (n: Element | null) => {
      for (let x = n; x; x = x.parentElement) if (getComputedStyle(x).position === "fixed") return x;
      return null;
    };
    const problems: string[] = [];
    const controls = [...document.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, summary")].filter((el) => !fixedAncestor(el));
    for (const el of controls) {
      const target = el.matches("input") && el.closest("label") ? el.closest("label")! : el;
      const box = target.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      target.scrollIntoView({ block: "end" });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const r = target.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && !target.contains(hit) && !hit.contains(target) && fixedAncestor(hit)) {
        problems.push(`${where}: "${(target.getAttribute("aria-label") ?? target.textContent ?? "").trim().slice(0, 40)}" is under a fixed bar`);
      }
    }
    return problems;
  }, label);
}

for (const [name, size] of [["a small phone", { width: 375, height: 667 }], ["a laptop", { width: 1280, height: 720 }]] as const)
test(`on ${name}, nothing on the practice screens hides under the bottom bar (Spanish)`, async ({ page, context }) => {
  await page.setViewportSize(size);
  await setLanguage(context, "es");
  // The account the sweep already signed in: no new code (the login allows only a few per account).
  await signIn(page, "rep@demo.test");
  await page.goto("/practice/S-payment-buyer-L2");
  const problems: string[] = [];
  problems.push(...(await nothingUnderTheBar(page, "lesson")));
  await page.getByRole("button", { name: "Ver ejemplo" }).click();
  problems.push(...(await nothingUnderTheBar(page, "demo")));
  await page.getByRole("button", { name: "Cerrar" }).first().click();
  problems.push(...(await nothingUnderTheBar(page, "setup")));
  // The answer mode is tappable where it sits (the report: the bar won the tap on "Escribir").
  await page.getByRole("radio", { name: "Escribir" }).check();
  await expect(page.getByRole("radio", { name: "Escribir" })).toBeChecked();
  await page.getByRole("button", { name: "Empezar" }).click();
  await expect(page.getByTestId("line-customer")).toHaveCount(1);
  problems.push(...(await nothingUnderTheBar(page, "conversation")));
  expect(problems).toEqual([]);
});
