import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** The public pricing page, signed out. Relative URLs only, so it runs under the main config or a standalone one. */

const settle = async (page: Page) => { await page.waitForLoadState("load"); await page.waitForTimeout(1200); };

test.describe("the pricing page", () => {
  test("three per-seat tiers with placeholder prices and the right ways in", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
    page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("_rsc=")) problems.push(`${r.status()} ${r.url()}`); });
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/One price per seat\./);

    // The prices are visibly placeholders.
    await expect(page.getByTestId("placeholder-notice")).toContainText("Pricing is being finalized. These are placeholders.");
    await expect(page.getByTestId("placeholder-badge")).toHaveCount(3);

    for (const name of ["Solo", "Team", "Dealership"]) await expect(page.getByRole("heading", { level: 3, name, exact: true })).toBeVisible();
    await expect(page.getByTestId("tier-team").getByTestId("recommended")).toHaveText("Recommended");
    await expect(page.locator("[data-mkt]")).not.toContainText(/most popular/i);

    await expect(page.getByTestId("tier-solo-cta")).toHaveAttribute("href", "/signup?for=me");
    await expect(page.getByTestId("tier-team-cta")).toHaveAttribute("href", "/signup");
    await expect(page.getByTestId("tier-dealership-cta")).toHaveAttribute("href", "/signup");
    await expect(page.getByTestId("tier-solo")).toContainText(/All \d{3} techniques/);
    await expect(page.getByTestId("tier-dealership")).toContainText("Audit log and CSV export");

    // The nav leads back to the home page's sections and marks this page.
    await expect(page.locator('[data-mkt-nav] a[href="/pricing"]').first()).toHaveAttribute("aria-current", "page");
    await settle(page);
    expect(problems).toEqual([]);
  });

  test("the monthly / annual switch changes the billing wording", async ({ page }) => {
    await page.goto("/pricing");
    const solo = page.getByTestId("tier-solo");
    await expect(page.getByRole("radio", { name: "Monthly" })).toBeChecked();
    await expect(solo.getByText("per seat a month, billed monthly")).toBeVisible();
    await expect(solo.getByText("per seat a month, billed yearly")).toBeHidden();
    await page.getByRole("radio", { name: "Annual" }).check();
    await expect(solo.getByText("per seat a month, billed yearly")).toBeVisible();
    await expect(solo.getByText("per seat a month, billed monthly")).toBeHidden();
    await expect(page.getByTestId("annual-save")).toContainText("Placeholder discount");
    await page.getByRole("radio", { name: "Monthly" }).check();
    await expect(solo.getByText("per seat a month, billed monthly")).toBeVisible();
  });

  test("the FAQ opens and answers in Spanish too", async ({ page }) => {
    await page.goto("/pricing");
    const faq = page.getByTestId("faq");
    await faq.getByText("Is it only for car sales?").click();
    await expect(faq).toContainText("The role-play customers today are car-sales customers");
    await page.getByTestId("mkt-lang").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Un precio por usuario\./);
    await expect(page.getByTestId("placeholder-notice")).toContainText("Estos son provisionales.");
    await expect(page.locator("[data-mkt]")).toHaveAttribute("lang", "es");
  });

  test("passes the accessibility audit and never scrolls sideways", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/pricing");
    for (const lang of ["en", "es"] as const) {
      await page.context().addCookies([{ name: "lang", value: lang, url: page.url() }]);
      await page.goto("/pricing");
      await settle(page);
      await expect(page.locator("[data-mkt]")).toHaveAttribute("lang", lang);
      // Open every answer so the audit sees them too, and pick annual so both wordings are measured.
      for (const d of await page.locator("[data-testid=faq] details").all()) await d.evaluate((el) => el.setAttribute("open", ""));
      await page.getByRole("radio", { name: lang === "en" ? "Annual" : "Anual" }).check();
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(r.passes.length).toBeGreaterThan(10);
      expect(r.violations.map((v) => `${lang}: ${v.id} (${v.impact}) ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);
      const [scrollWidth, clientWidth] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    }
  });
});
