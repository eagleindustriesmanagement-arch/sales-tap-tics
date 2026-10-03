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
  test("shows the headline, both ways in, the cited research and the library, with no errors", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Master the close before it counts\./);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
    await expect(hero.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/signup");
    await expect(hero.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/login?demo=1");

    // Credibility up top, in the supported wording (never "millions of hours").
    await expect(page.getByTestId("research-line")).toHaveText(/Neil Rackham's 35,000 observed sales calls to studies of millions of recorded sales conversations/);
    await expect(page.locator("[data-mkt]")).not.toContainText("millions of hours");

    // The return on training: the number, its citation and its caveat.
    await expect(page.getByRole("heading", { name: "Trained sales floors sold 12% more per day." })).toBeVisible();
    await expect(page.getByTestId("roi-cite")).toContainText("Prada, Rucci & Urzúa");
    await expect(page.getByTestId("roi-cite")).toContainText("IZA Discussion Paper 12447 (2019)");
    await expect(page.getByTestId("coach-figure")).toContainText("Up to 19%");

    // The calculator is the visitor's number times the study's 12.1%.
    const calc = page.getByTestId("roi-calculator");
    await calc.getByLabel("Your monthly sales, in dollars").fill("100000");
    await expect(calc.getByTestId("roi-month")).toHaveText("$12,100");
    await expect(calc).toContainText("$145,200 a year");

    // The technique count comes from the library, and real names are shown.
    await expect(page.getByTestId("hero-facts")).toContainText(/\d{3} techniques/);
    await expect(page.getByTestId("technique-count")).toHaveText(/Deep to learn\. \d{3} techniques in \d+ families\./);
    for (const name of ["Pause and slow down", "Isolate", "Label the concern", "Firm next step"]) {
      await expect(page.locator("#techniques").getByRole("heading", { name, exact: true })).toBeVisible();
    }

    // Industries, honestly: cars live, the rest next.
    await expect(page.getByTestId("industries")).toContainText("Customers live");
    await expect(page.getByTestId("industries")).toContainText("Home-buyer customers are next.");

    // Two ways in at the end, and pricing one tap away.
    await expect(page.getByTestId("start-team")).toHaveAttribute("href", "/signup");
    await expect(page.getByTestId("start-solo")).toHaveAttribute("href", "/signup?for=me");
    await expect(page.locator("footer").getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/pricing");
    await expect(page.getByTestId("flagged-line")).toContainText("Made-up deadline");
    await expect(page.locator("footer")).toContainText("This is a training tool, not legal advice.");
    await settle(page);
    expect(problems).toEqual([]);
  });

  test("the language switch turns the page to Spanish", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await page.getByTestId("mkt-lang").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Domine el cierre antes de que cuente\./);
    const hero = page.locator("section", { has: page.getByRole("heading", { level: 1 }) });
    await expect(hero.getByRole("link", { name: "Empiece gratis" })).toHaveAttribute("href", "/signup");
    await expect(hero.getByRole("link", { name: "Probar el demo" })).toHaveAttribute("href", "/login?demo=1");
    await expect(page.getByRole("heading", { name: "Los pisos de venta entrenados vendieron 12% más por día." })).toBeVisible();
    await expect(page.getByTestId("technique-count")).toHaveText(/\d{3} técnicas en \d+ familias\./);
    await expect(page.locator("[data-mkt]")).toHaveAttribute("lang", "es");
    await settle(page);
    expect(problems).toEqual([]);
  });

  test("reduced motion: everything visible, nothing hidden waiting to animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await settle(page);
    expect(await page.locator(".mkt-will").count()).toBe(0);
    await page.getByTestId("start-team").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("start-team")).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector("#start [data-reveal]")!).opacity)).toBe("1");
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
