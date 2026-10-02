import type { Language } from "@taptics/i18n";

/**
 * Bilingual number recognition for the compliance engine (spec 11.1 item 4): digits in either convention
 * ("$38,450", "$38.450", "5,9 %") and spoken numbers ("thirty-eight thousand four hundred fifty",
 * "treinta y ocho mil cuatrocientos cincuenta", "five seventy-five a month").
 */

export type NumberUnit = "dollar" | "cent" | "percent" | "none";

export interface NumberMention {
  /** For dollars and cents: integer cents. For percent: basis points. For none: the plain value. */
  value: number;
  unit: NumberUnit;
  start: number;
  end: number;
  text: string;
  source: "digits" | "words";
  approximate: boolean;
  /** "$X" style content placeholder; never compared with facts. */
  placeholder: string | null;
}

const EN_UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const EN_TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const EN_SCALES: Record<string, number> = { hundred: 100, thousand: 1000, grand: 1000, million: 1_000_000 };

const ES_UNITS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, "dieciséis": 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, "veintiún": 21, veintiun: 21,
  "veintidós": 22, veintidos: 22, "veintitrés": 23, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  "veintiséis": 26, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const ES_TENS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const ES_HUNDREDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};
const ES_SCALES: Record<string, number> = { mil: 1000, "millón": 1_000_000, millon: 1_000_000, millones: 1_000_000 };

const DOLLAR_WORDS = /^(dollars?|bucks?|d[oó]lares|d[oó]lar|usd)$/i;
const CENT_WORDS = /^(cents?|centavos?|chavitos?)$/i;
const PERCENT_WORDS = /^(percent|porciento)$/i;
const APPROX_BEFORE = /(about|around|roughly|approximately|like|almost|nearly|como|más o menos|mas o menos|alrededor de|aproximadamente|casi|unos|unas)\s*$/i;

interface Token {
  word: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(/[\p{L}]+(?:-[\p{L}]+)*|\$|%|\d[\d,.:]*/gu)) {
    const start = m.index ?? 0;
    // Split hyphenated English numbers ("thirty-eight") into parts with their own offsets.
    if (m[0].includes("-") && /^[a-z-]+$/i.test(m[0])) {
      let offset = start;
      for (const part of m[0].split("-")) {
        tokens.push({ word: part.toLowerCase(), start: offset, end: offset + part.length });
        offset += part.length + 1;
      }
    } else {
      tokens.push({ word: m[0].toLowerCase(), start, end: start + m[0].length });
    }
  }
  return tokens;
}

function isEnNumberWord(w: string): boolean {
  return w in EN_UNITS || w in EN_TENS || w in EN_SCALES;
}
function isEsNumberWord(w: string): boolean {
  return w in ES_UNITS || w in ES_TENS || w in ES_HUNDREDS || w in ES_SCALES;
}

/** Parses a run of English number words. Supports the colloquial "five seventy-five" (575). */
export function parseEnglishWords(words: string[]): number | null {
  let total = 0;
  let current = 0;
  let lastUnit: number | null = null;
  let sawScale = false;
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i]!;
    if (w === "and") continue;
    if (w === "a" || w === "an") {
      current += 1;
      continue;
    }
    if (w in EN_UNITS) {
      const v = EN_UNITS[w]!;
      if (lastUnit !== null && lastUnit >= 1 && lastUnit <= 9 && v >= 10 && !sawScale && current === lastUnit) {
        current = lastUnit * 100 + v; // "five fifteen"
        lastUnit = null;
        continue;
      }
      current += v;
      lastUnit = v;
      continue;
    }
    if (w in EN_TENS) {
      const v = EN_TENS[w]!;
      if (lastUnit !== null && lastUnit >= 1 && lastUnit <= 9 && !sawScale && current === lastUnit) {
        current = lastUnit * 100 + v; // "five seventy" (-five follows)
        lastUnit = null;
        continue;
      }
      current += v;
      lastUnit = null;
      continue;
    }
    if (w === "hundred") {
      current = (current || 1) * 100;
      lastUnit = null;
      continue;
    }
    if (w === "thousand" || w === "grand" || w === "million") {
      total += (current || 1) * EN_SCALES[w]!;
      current = 0;
      lastUnit = null;
      sawScale = true;
      continue;
    }
    return null;
  }
  return total + current;
}

export function parseSpanishWords(words: string[]): number | null {
  let total = 0;
  let current = 0;
  for (const w of words) {
    if (w === "y") continue;
    if (w in ES_UNITS) current += ES_UNITS[w]!;
    else if (w in ES_TENS) current += ES_TENS[w]!;
    else if (w in ES_HUNDREDS) current += ES_HUNDREDS[w]!;
    else if (w === "mil") {
      total += (current || 1) * 1000;
      current = 0;
    } else if (w in ES_SCALES) {
      total += (current || 1) * ES_SCALES[w]!;
      current = 0;
    } else return null;
  }
  return total + current;
}

/** Parses a digit string in either thousands convention. Returns the value in units (dollars, percent points). */
export function parseDigits(raw: string): number | null {
  const s = raw.replace(/[.,]$/, "");
  if (/^\d{1,3}([,.]\d{3})+$/.test(s)) return Number(s.replace(/[,.]/g, ""));
  if (/^\d{1,3}(,\d{3})+\.\d{1,2}$/.test(s)) return Number(s.replace(/,/g, ""));
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) return Number(s.replace(/\./g, "").replace(",", "."));
  if (/^\d+[.,]\d{1,2}$/.test(s)) return Number(s.replace(",", "."));
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

const MONEY_HINT_AFTER = /^\s*(a month|per month|\/mo|monthly|al mes|por mes|mensual(es)?|a day|al d[ií]a|por d[ií]a|off|de descuento|down|de inicial|de entrada|(?:more|less|m[aá]s|menos)(?=\s*(?:on|for|off|than|que|a month|al mes|por|en|de|[.,;!?]|$))|apart|higher|over|por encima|on (the|your) trade|for (the|your) trade|out the door|all in|todo incluido|precio total)\b/i;
const MONEY_HINT_BEFORE = /(price|precio|payment|pago|mensualidad|fee|cargo|rebate|reembolso|bono|bonus|discount|descuento|trade|trade-in|appraisal|tasaci[oó]n|payoff|down|inicial|total|cuesta|costs?|worth|vale|sale en|est[aá] en|it's|it is|is|es)\s*$/i;
const NOT_MONEY_AFTER = /^\s*(miles|millas|km|kil[oó]metros|minutes?|minutos?|hours?|horas?|days?|d[ií]as|weeks?|semanas?|months?|meses|years?|a[nñ]os|people|personas|cars?|carros?|units?|unidades)\b/i;

/**
 * Finds every number in a text, with its unit. Plain numbers without a money cue get unit "none"; the money
 * role detector decides later whether a bare number in a payment or price context is money.
 */
export function findNumbers(input: string, language: Language): NumberMention[] {
  const text = input;
  const mentions: NumberMention[] = [];
  const taken: [number, number][] = [];
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a);

  // 1. Placeholders: "$X", "$A".
  for (const m of text.matchAll(/\$([A-Z])\b/g)) {
    const start = m.index ?? 0;
    mentions.push({ value: 0, unit: "dollar", start, end: start + m[0].length, text: m[0], source: "digits", approximate: false, placeholder: m[1]! });
    taken.push([start, start + m[0].length]);
  }

  // 2. Digits, with optional $, k/mil multiplier, and unit words.
  const digitRe = /(\$\s?)?(\d[\d,.]*\d|\d)(\s?(?:k|K)\b|\s(?:mil)\b)?(\s?%|\s(?:percent|por ciento|porciento)\b)?(\s(?:dollars?|bucks?|d[oó]lares|d[oó]lar|cents?|centavos?))?/gu;
  for (const m of text.matchAll(digitRe)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (overlaps(start, end)) continue;
    const before = text[start - 1] ?? "";
    const after = text[end] ?? "";
    if (before === ":" || after === ":" || before === "/" || after === "/") continue; // clock times, dates
    const raw = m[2]!;
    let value = parseDigits(raw);
    if (value === null) continue;
    if (m[3]) value *= 1000;
    let unit: NumberUnit = "none";
    if (m[4]) unit = "percent";
    else if (m[5] && CENT_WORDS.test(m[5].trim())) unit = "cent";
    else if (m[1] || m[5]) unit = "dollar";
    else if (NOT_MONEY_AFTER.test(text.slice(end, end + 15)) || /^(19|20)\d{2}$/.test(raw)) unit = "none";
    else if (MONEY_HINT_AFTER.test(text.slice(end, end + 25))) unit = "dollar";
    else if (MONEY_HINT_BEFORE.test(text.slice(Math.max(0, start - 20), start)) && value >= 10) unit = "dollar";
    // A bare number with a thousands separator ("33,349") in sales talk is money unless a unit says otherwise.
    else if (/^\d{1,3}([,.]\d{3})+$/.test(raw)) unit = "dollar";
    const scaled = unit === "dollar" ? Math.round(value * 100) : unit === "cent" ? Math.round(value) : unit === "percent" ? Math.round(value * 100) : value;
    mentions.push({
      value: scaled,
      unit,
      start,
      end,
      text: m[0],
      source: "digits",
      approximate: APPROX_BEFORE.test(text.slice(Math.max(0, start - 25), start)),
      placeholder: null,
    });
    taken.push([start, end]);
  }

  // 3. Spoken numbers.
  const tokens = tokenize(text);
  const isNum = (w: string) => isEnNumberWord(w) || isEsNumberWord(w);
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    if (overlaps(t.start, t.end)) continue;
    const startsRun = isNum(t.word) || ((t.word === "a" || t.word === "an") && (tokens[i + 1] && (tokens[i + 1]!.word in EN_SCALES || DOLLAR_WORDS.test(tokens[i + 1]!.word))));
    if (!startsRun) continue;
    let j = i;
    const words: string[] = [];
    while (j < tokens.length) {
      const w = tokens[j]!.word;
      const connector = (w === "y" || w === "and") && words.length > 0 && j + 1 < tokens.length && isNum(tokens[j + 1]!.word);
      if (isNum(w) || connector || (j === i && (w === "a" || w === "an"))) {
        words.push(w);
        j += 1;
      } else break;
    }
    if (words.length === 0) continue;
    const spanish = words.some((w) => isEsNumberWord(w) && !isEnNumberWord(w));
    const value = spanish || language === "es" ? parseSpanishWords(words) ?? parseEnglishWords(words) : parseEnglishWords(words) ?? parseSpanishWords(words);
    if (value === null) continue;
    const next = tokens[j]?.word ?? "";
    const next2 = `${next} ${tokens[j + 1]?.word ?? ""}`;
    let unit: NumberUnit = "none";
    let end = tokens[j - 1]!.end;
    if (DOLLAR_WORDS.test(next)) {
      unit = "dollar";
      end = tokens[j]!.end;
    } else if (CENT_WORDS.test(next)) {
      unit = "cent";
      end = tokens[j]!.end;
    } else if (PERCENT_WORDS.test(next) || /^(por ciento)$/i.test(next2)) {
      unit = "percent";
      end = tokens[next === "por" ? j + 1 : j]!.end;
    } else if (MONEY_HINT_AFTER.test(text.slice(end, end + 25))) {
      unit = "dollar";
    }
    const start = t.start;
    if (unit === "none" && value < 10) {
      i = j - 1;
      continue; // "two options", "una hoja": not money
    }
    const scaled = unit === "dollar" ? value * 100 : unit === "percent" ? value * 100 : value;
    mentions.push({
      value: scaled,
      unit,
      start,
      end,
      text: text.slice(start, end),
      source: "words",
      approximate: APPROX_BEFORE.test(text.slice(Math.max(0, start - 25), start)),
      placeholder: null,
    });
    taken.push([start, end]);
    i = j - 1;
  }
  return mentions.sort((a, b) => a.start - b.start);
}

export function formatDollars(cents: number, language: Language): string {
  const dollars = cents / 100;
  const whole = Number.isInteger(dollars);
  return `$${dollars.toLocaleString(language === "es" ? "en-US" : "en-US", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

const HOURS_EN: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const HOURS_ES: Record<string, number> = { una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12 };
const MINUTES: Record<string, number> = { thirty: 30, "half": 30, fifteen: 15, "forty-five": 45, media: 30, cuarto: 15, quince: 15, treinta: 30 };

/**
 * Clock times in either language, normalized to "H:MM" so "5:30", "five thirty" and "las cinco y media" compare
 * equal (FAIR-01 parity, next-step detection).
 */
export function findClockTimes(text: string): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase();
  const fmt = (h: number, m: number) => `${h}:${String(m).padStart(2, "0")}`;
  for (const m of lower.matchAll(/(?<![\d:])(\d{1,2}):(\d{2})(?!\d)/g)) out.push(fmt(Number(m[1]), Number(m[2])));
  for (const m of lower.matchAll(/\b(?:at|a las|a la)\s+(\d{1,2})(?![\d:])/g)) out.push(fmt(Number(m[1]), 0));
  const enWords = Object.keys(HOURS_EN).join("|");
  for (const m of lower.matchAll(new RegExp(`\\b(?:at|by|around)\\s+(${enWords})(?:\\s+(thirty|fifteen|forty-five)|\\s+o'clock)?\\b`, "g"))) {
    out.push(fmt(HOURS_EN[m[1]!]!, m[2] ? MINUTES[m[2]]! : 0));
  }
  for (const m of lower.matchAll(new RegExp(`\\bhalf past (${enWords})\\b`, "g"))) out.push(fmt(HOURS_EN[m[1]!]!, 30));
  const esWords = Object.keys(HOURS_ES).join("|");
  // "a las cinco", or "las cinco y media"; a bare "las dos" is usually "both" ("las dos opciones"), not a time.
  for (const m of lower.matchAll(new RegExp(`\\b(?:a las|a la|para las|para la|antes de las)\\s+(${esWords})(?:\\s+y\\s+(media|cuarto|quince|treinta))?(?![\\p{L}])|\\b(?:las|la)\\s+(${esWords})\\s+y\\s+(media|cuarto|quince|treinta)(?![\\p{L}])`, "gu"))) {
    const hour = m[1] ?? m[3]!;
    const minutes = m[2] ?? m[4];
    out.push(fmt(HOURS_ES[hour]!, minutes ? MINUTES[minutes]! : 0));
  }
  return out;
}
