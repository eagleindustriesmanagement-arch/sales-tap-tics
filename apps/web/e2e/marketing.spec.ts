import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * The public home page (decision 0028), signed out. Relative URLs only, so it runs under the main config or a
 * standalone one pointed at any port.
 */

/** Console errors and failed requests. Link prefetches (`_rsc=`) are left out: they are not what the page shows. */
const settle = async (page: Page) => { await page.waitForLoadState("load"); await page.waitForTimeout(1500); };
function watch(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) problems.push(`console: ${m.text()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("_rsc=")) problems.push(`${r.status()} ${r.url()}`);
  });
  return problems;
}

test.describe("the public home page", () => {
  test("shows the headline and both ways in, with no errors", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Your reps take the hard ups here first\./);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
    await expect(hero.getByRole("link", { name: "Start a pilot" })).toHaveAttribute("href", "/signup");
    await expect(hero.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/login?demo=1");

    // The rest of the story is on the page: the library count, the flagged line, the pilot.
    await expect(page.getByRole("heading", { name: /\d+ objections\. A customer for every one\./ })).toBeVisible();
    await expect(page.getByTestId("flagged-line")).toContainText("Made-up deadline");
    await expect(page.locator("footer")).toContainText("This is a training tool, not legal advice.");
    await settle(page);
    expect(problems).toEqual([]);
  });

  test("the language switch turns the page to Spanish", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await page.getByTestId("mkt-lang").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Sus vendedores atienden los ups difíciles aquí primero\./);
    const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
    await expect(hero.getByRole("link", { name: "Empezar un piloto" })).toHaveAttribute("href", "/signup");
    await expect(hero.getByRole("link", { name: "Probar el demo" })).toHaveAttribute("href", "/login?demo=1");
    await expect(page.locator("[data-mkt]")).toHaveAttribute("lang", "es");
    await settle(page);
    expect(problems).toEqual([]);
  });

  test("reduced motion: everything visible, nothing hidden waiting to animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settle(page);
    expect(await page.locator(".mkt-will").count()).toBe(0);
    await page.getByTestId("pilot-cta").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("pilot-cta")).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("#pilot [data-reveal]")!).opacity)).toBe("1");
  });

  test("passes the accessibility audit and never scrolls sideways", async ({ page }) => {
    // Reduced motion so every block is at rest when colours are measured.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    for (const lang of ["en", "es"] as const) {
      await page.context().addCookies([{ name: "lang", value: lang, url: page.url() }]);
      await page.goto("/");
      await settle(page);
      await expect(page.locator("[data-mkt]")).toHaveAttribute("lang", lang);
      const audit = async (label: string) => {
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(r.passes.length).toBeGreaterThan(10); // it really audited the page
        expect(r.violations.map((v) => `${label}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
      };
      await audit(lang);
      // On a phone, the menu too.
      const menu = page.locator("details[data-mkt-menu] > summary");
      if (await menu.isVisible()) {
        await menu.click();
        await expect(page.locator("details[data-mkt-menu] nav")).toBeVisible();
        await audit(`${lang} menu`);
        await menu.click();
      }
      const [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });
});
