import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND, renderEmail } from "../lib/email/layout";
import { inviteEmail, loginCodeEmail } from "../lib/email/messages";

vi.mock("server-only", () => ({}));

const SITE = "https://salestaptics.com";

describe("the branded email layout (decision 0035)", () => {
  for (const language of ["en", "es"] as const) {
    it(`the ${language} login-code email carries the code in the HTML, the text and the inbox preview`, () => {
      const e = loginCodeEmail("482913", language, SITE);
      expect(e.subject).toBe(language === "en" ? "Your Sales Taptics code" : "Su código de Sales Taptics");
      expect(e.html).toContain(`<html lang="${language}"`);
      expect(e.html).toContain(">482913<");
      expect(e.html).toContain(language === "en" ? "Your code is 482913" : "Su código es 482913"); // preheader
      expect(e.text).toContain(language === "en" ? "Sign-in code: 482913" : "Código para entrar: 482913");
      expect(e.text).toContain(language === "en" ? "It works for 10 minutes." : "Sirve por 10 minutos.");
    });
  }

  it("looks like the app: charcoal surfaces, champagne gold, the wordmark set in type, header and footer", () => {
    const { html } = loginCodeEmail("482913", "en", SITE);
    for (const hex of [BRAND.page, BRAND.surface, BRAND.gold, BRAND.ink]) expect(html).toContain(hex);
    expect(html).toContain(">Sales Taptics<");
    expect(html).toContain("Practice the hard conversations before the real ones.");
    expect(html).toContain(`href="${SITE}"`);
    expect(html).toMatch(/&copy; \d{4} Sales Taptics/);
  });

  it("is safe in dark mode and on a phone, and loads nothing from the internet", () => {
    const { html } = loginCodeEmail("482913", "en", SITE);
    expect(html).toContain('<meta name="color-scheme" content="dark">');
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(html).toContain("@media (max-width: 600px)");
    expect(html).toContain("max-width:560px");
    expect(html).toContain(`linear-gradient(${BRAND.page},${BRAND.page})`); // Gmail's app does not invert it
    expect(html).not.toMatch(/<img|<link|<script|@import|url\(/i);
  });

  it("escapes every word it is given and refuses a link that is not http(s)", () => {
    const e = inviteEmail({ name: "Ana <b>", store: `Kendall "Ford" & Co <script>alert(1)</script>`, language: "en" }, SITE);
    expect(e.html).not.toContain("<script>alert(1)</script>");
    expect(e.html).toContain("Kendall &quot;Ford&quot; &amp; Co &lt;script&gt;");
    expect(e.text).toContain(`Kendall "Ford" & Co`); // plain text stays plain
    expect(() => renderEmail({ language: "en", siteUrl: SITE, subject: "s", preheader: "p", heading: "h", paragraphs: [], action: { label: "x", url: "javascript:alert(1)" } })).toThrow();
  });

  it("the invite uses the same layout, with a gold button to sign in, in both languages", () => {
    const en = inviteEmail({ name: "Carlos", store: "Kendall Toyota", language: "en" }, SITE);
    const es = inviteEmail({ name: "Carlos", store: "Kendall Toyota", language: "es" }, SITE);
    expect(en.html).toContain(`href="${SITE}/login"`);
    expect(en.html).toContain("Sign in to Sales Taptics");
    expect(es.html).toContain("Entrar a Sales Taptics");
    expect(es.subject).toBe("Kendall Toyota lo agregó a Sales Taptics");
    expect(en.text).toContain(`Sign in to Sales Taptics: ${SITE}/login`);
    expect(en.html).toContain(BRAND.goldFill);
  });
});

describe("delivering the login code", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends Resend the branded HTML and its plain-text twin, from Sales Taptics", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_not_a_real_key");
    vi.stubEnv("TAPTICS_CODE_OUTBOX", "");
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
    });
    const { deliverCode } = await import("../lib/delivery");
    await expect(deliverCode("rep@store.test", "482913", "es")).resolves.toBe("sent");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    const body = calls[0]!.body;
    expect(body["to"]).toEqual(["rep@store.test"]);
    expect(body["from"]).toBe("Sales Taptics <login@salestaptics.com>");
    expect(body["subject"]).toBe("Su código de Sales Taptics");
    expect(String(body["html"])).toContain(">482913<");
    expect(String(body["text"])).toContain("482913");
  });

  it("a refused send still says why, and never shows the key", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_not_a_real_key");
    vi.stubEnv("TAPTICS_CODE_OUTBOX", "");
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ message: "The salestaptics.com domain is not verified." }), { status: 403 }));
    const { deliverCode } = await import("../lib/delivery");
    const error = await deliverCode("rep@store.test", "482913", "en").catch((e: Error) => e);
    expect(String(error)).toContain("403 The salestaptics.com domain is not verified.");
    expect(String(error)).not.toContain("re_test_not_a_real_key");
  });
});
