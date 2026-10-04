import "server-only";
import { appendFile } from "node:fs/promises";
import type { Language } from "@taptics/i18n";
import type { RenderedEmail } from "./email/layout";
import { inviteEmail, loginCodeEmail } from "./email/messages";

/** Shows the code on the login screen. Only for local development and browser tests, never in production. */
export const devLogin = () => process.env.TAPTICS_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

/**
 * The trial site (decision 0014): with TAPTICS_DEMO_LOGIN=1 the demo store's accounts (@demo.test, which have no
 * inbox) see their code on screen, so anyone with the link can try each role. Every other address still gets its
 * code by email. Turn it off before a real store's people sign in.
 */
export const DEMO_DOMAIN = "@demo.test";
export const demoLogin = (identifier: string) => process.env.TAPTICS_DEMO_LOGIN === "1" && identifier.trim().toLowerCase().endsWith(DEMO_DOMAIN);

/** The public address people sign in at, for emails. */
export const appUrl = () => (process.env.TAPTICS_APP_URL ?? "https://salestaptics.com").replace(/\/$/, "");

/** Resend's own answer on a refused send (status and its error message, never the key): the log names the cause. */
async function refused(res: Response): Promise<Error> {
  const body = await res.text().catch(() => "");
  let reason = body.slice(0, 300);
  try { reason = (JSON.parse(body) as { message?: string }).message ?? reason; } catch { /* not JSON */ }
  return new Error(`email delivery failed: ${res.status} ${reason}`.trim());
}

/**
 * Sends one branded email (decision 0035): the HTML from the shared layout and its plain-text twin, never one
 * without the other. The outbox line records what was sent, plus `record` (the login code, for browser tests).
 */
async function sendEmail(to: string, email: RenderedEmail, record: Record<string, string> = {}): Promise<"sent" | "logged" | "unavailable"> {
  const outbox = process.env.TAPTICS_CODE_OUTBOX;
  if (outbox) {
    await appendFile(outbox, `${JSON.stringify({ identifier: to.trim().toLowerCase(), subject: email.subject, ...record, at: new Date().toISOString() })}\n`);
    return "sent";
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) return process.env.NODE_ENV !== "production" ? "logged" : "unavailable";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.TAPTICS_EMAIL_FROM ?? "Sales Taptics <login@salestaptics.com>", to: [to], subject: email.subject, html: email.html, text: email.text }),
  });
  if (!res.ok) throw await refused(res);
  return "sent";
}

/**
 * Tells a person the general manager added that they can sign in (decision 0029). Best effort: they can sign in
 * whether or not it arrives, so a failure is reported, never thrown. No code is in it.
 */
export async function deliverInvite(email: string, p: { name: string; store: string; language: Language }): Promise<"sent" | "logged" | "unavailable" | "failed"> {
  try {
    return await sendEmail(email, inviteEmail(p, appUrl()));
  } catch {
    return "failed";
  }
}

/**
 * Delivers a login code. Email through Resend when RESEND_API_KEY is set. TAPTICS_CODE_OUTBOX (a file path) is a
 * mail catcher for staging and browser tests: an operator must set it on purpose, and codes are never shown on
 * screen in production. Otherwise, outside production, the server log. SMS delivery is not configured yet.
 */
export async function deliverCode(identifier: string, code: string, language: Language): Promise<"sent" | "logged" | "unavailable"> {
  if (process.env.TAPTICS_CODE_OUTBOX || (process.env.RESEND_API_KEY && identifier.includes("@"))) {
    return sendEmail(identifier, loginCodeEmail(code, language, appUrl()), { code });
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[dev] login code for ${identifier}: ${code}`);
    return "logged";
  }
  console.error(JSON.stringify({ level: "error", event: "email_not_configured", detail: process.env.RESEND_API_KEY ? "not an email address" : "RESEND_API_KEY is not set in this deployment" }));
  return "unavailable";
}
