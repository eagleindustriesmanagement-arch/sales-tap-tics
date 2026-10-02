import type { Lexicon } from "@taptics/content";
import { compile } from "./text.js";

/** Resolves spoken date expressions ("Monday", "el 31", "end of the month", "mañana") against the scenario clock. */

function parseIso(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

export function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function lastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export interface ResolvedDates {
  /** Candidate dates the expression could mean. Empty when the clause names no date. */
  dates: string[];
  /** The expression was "today only" style: the deadline is today. */
  today: boolean;
}

/** Finds the dates a clause refers to, relative to the scenario's session date. */
export function resolveDates(clause: string, sessionDate: string, lexicon: Lexicon): ResolvedDates {
  const now = parseIso(sessionDate);
  const text = stripAccents(clause.toLowerCase());
  const dates = new Set<string>();
  let today = false;

  const has = (list: string[]) => list.some((w) => compile(`\\b${stripAccents(w)}\\b`).test(text));
  if (has([...lexicon.relative_days.today.en, ...lexicon.relative_days.today.es])) {
    dates.add(isoOf(now));
    today = true;
  }
  if (has([...lexicon.relative_days.tomorrow.en, ...lexicon.relative_days.tomorrow.es])) dates.add(isoOf(addDays(now, 1)));

  const weekdays = [lexicon.weekdays.en, lexicon.weekdays.es];
  for (const list of weekdays) {
    list.forEach((name, index) => {
      if (compile(`\\b${stripAccents(name)}\\b`).test(text)) {
        const delta = (index - now.getUTCDay() + 7) % 7;
        dates.add(isoOf(addDays(now, delta)));
      }
    });
  }

  if (/\b(end of (the )?month|fin de mes|fin del mes|finales de mes)\b/.test(text)) dates.add(isoOf(lastDayOfMonth(now)));
  if (/\b(this weekend|este fin de semana)\b/.test(text)) {
    const saturday = addDays(now, (6 - now.getUTCDay() + 7) % 7);
    dates.add(isoOf(saturday));
    dates.add(isoOf(addDays(saturday, 1)));
  }

  const months = [lexicon.months.en, lexicon.months.es];
  const dayNumbers: number[] = [];
  for (const m of text.matchAll(/\b(?:the|el|on the|on)\s+(\d{1,2})(?:st|nd|rd|th)?\b/g)) dayNumbers.push(Number(m[1]));
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/g)) dayNumbers.push(Number(m[1]));
  for (const list of months) {
    list.forEach((name, monthIndex) => {
      const n = stripAccents(name);
      const patterns = [new RegExp(`\\b${n}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`), new RegExp(`\\b(\\d{1,2})\\s+de\\s+${n}\\b`)];
      for (const re of patterns) {
        const m = re.exec(text);
        if (m) {
          let year = now.getUTCFullYear();
          const candidate = new Date(Date.UTC(year, monthIndex, Number(m[1])));
          if (candidate < now) year += 1;
          dates.add(isoOf(new Date(Date.UTC(year, monthIndex, Number(m[1])))));
        }
      }
    });
  }
  for (const m of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)) {
    const year = now.getUTCFullYear();
    dates.add(isoOf(new Date(Date.UTC(year, Number(m[1]) - 1, Number(m[2])))));
  }
  for (const day of dayNumbers) {
    if (day < 1 || day > 31) continue;
    let candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
    if (candidate < now) candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day));
    dates.add(isoOf(candidate));
  }
  return { dates: [...dates].sort(), today };
}
