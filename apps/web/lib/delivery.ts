import "server-only";
import { appendFile } from "node:fs/promises";
import { t, type Language } from "@taptics/i18n";

/** Shows the code on the login screen. Only for local development and browser tests, never in production. */
export const devLogin = () => process.env.TAPTICS_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

/**
 * Delivers a login code. Email through Resend when RESEND_API_KEY is set. TAPTICS_CODE_OUTBOX (a file path) is a
 * mail catcher for staging and browser tests: an operator must set it on purpose, and codes are never shown on
 * screen in production. Otherwise, outside production, the server log. SMS delivery is not configured yet.
 */
export async function deliverCode(identifier: string, code: string, language: Language): Promise<"sent" | "logged" | "unavailable"> {
  const outbox = process.env.TAPTICS_CODE_OUTBOX;
  if (outbox) {
    await appendFile(outbox, `${JSON.stringify({ identifier: identifier.trim().toLowerCase(), code, at: new Date().toISOString() })}\n`);
    return "sent";
  }
  const key = process.env.RESEND_API_KEY;
  if (key && identifier.includes("@")) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.TAPTICS_EMAIL_FROM ?? "Sales Tap-tics <login@example.com>",
        to: [identifier],
        subject: t("login.emailSubject", language),
        text: t("login.emailBody", language, { code }),
      }),
    });
    if (!res.ok) throw new Error(`email delivery failed: ${res.status}`);
    return "sent";
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[dev] login code for ${identifier}: ${code}`);
    return "logged";
  }
  return "unavailable";
}
