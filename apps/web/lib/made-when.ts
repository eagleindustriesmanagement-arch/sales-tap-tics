import { t, type Language } from "@taptics/i18n";

/**
 * When an invite link was made, in words: "today, 10:42 AM" or "Oct 3", in the dealership's time zone. Enough to
 * tell two links apart. Worded once on the server and handed to the page, so the server and the browser never
 * disagree about "today" (a render just before midnight) or about how a time is spaced.
 */
export function madeWhen(at: Date | string, lang: Language, now = new Date()): string {
  const d = new Date(at);
  const tz = "America/New_York";
  const locale = lang === "es" ? "es-US" : "en-US";
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(x);
  if (day(d) === day(now)) {
    const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
    return t("invites.today", lang, { time });
  }
  return new Intl.DateTimeFormat(locale, { timeZone: tz, month: "short", day: "numeric" }).format(d);
}
