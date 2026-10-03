/**
 * Numbers and money read aloud the way a person says them (spec 11.4 item 4): "$38,450" becomes "thirty-eight
 * thousand four hundred fifty dollars" or "treinta y ocho mil cuatrocientos cincuenta dólares". Only money,
 * percentages and comma-grouped numbers change; years, times and model numbers are left to the voice.
 */
export type SpeechLanguage = "en" | "es";

const EN_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enBelow1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(`${EN_ONES[h]} hundred`);
  if (r) parts.push(r < 20 ? EN_ONES[r]! : `${EN_TENS[Math.floor(r / 10)]}${r % 10 ? `-${EN_ONES[r % 10]}` : ""}`);
  return parts.join(" ");
}

export function englishNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`not a whole number: ${n}`);
  if (n === 0) return "zero";
  const scales: [number, string][] = [[1_000_000_000, "billion"], [1_000_000, "million"], [1_000, "thousand"]];
  const parts: string[] = [];
  let rest = n;
  for (const [size, name] of scales) {
    if (rest >= size) {
      parts.push(`${enBelow1000(Math.floor(rest / size))} ${name}`);
      rest %= size;
    }
  }
  if (rest) parts.push(enBelow1000(rest));
  return parts.join(" ");
}

const ES_UNITS = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const ES_TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const ES_HUNDREDS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function esBelow1000(n: number): string {
  if (n === 100) return "cien";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(ES_HUNDREDS[h]!);
  if (r) parts.push(r < 30 ? ES_UNITS[r]! : `${ES_TENS[Math.floor(r / 10)]}${r % 10 ? ` y ${ES_UNITS[r % 10]}` : ""}`);
  return parts.join(" ");
}

/** Spanish cardinal. `beforeNoun` shortens a final "uno" ("veintiún dólares", "un millón"). */
export function spanishNumber(n: number, beforeNoun = false): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`not a whole number: ${n}`);
  if (n === 0) return "cero";
  const parts: string[] = [];
  let rest = n;
  const millions = Math.floor(rest / 1_000_000);
  if (millions) {
    parts.push(millions === 1 ? "un millón" : `${apocope(spanishNumber(millions))} millones`);
    rest %= 1_000_000;
  }
  const thousands = Math.floor(rest / 1000);
  if (thousands) {
    parts.push(thousands === 1 ? "mil" : `${apocope(esBelow1000(thousands))} mil`);
    rest %= 1000;
  }
  if (rest) parts.push(esBelow1000(rest));
  const out = parts.join(" ");
  return beforeNoun ? apocope(out) : out;
}

/** "uno" before a noun or "mil" becomes "un"; "veintiuno" becomes "veintiún". */
function apocope(s: string): string {
  return s.replace(/veintiuno$/, "veintiún").replace(/(^|\s)uno$/, "$1un");
}

const toInt = (s: string) => Number(s.replace(/,/g, ""));

function money(whole: string, cents: string | undefined, lang: SpeechLanguage): string {
  const d = toInt(whole);
  const c = cents ? Number(cents.padEnd(2, "0").slice(0, 2)) : 0;
  if (lang === "en") {
    const dollars = `${englishNumber(d)} ${d === 1 ? "dollar" : "dollars"}`;
    return c ? `${dollars} and ${englishNumber(c)} ${c === 1 ? "cent" : "cents"}` : dollars;
  }
  // "un millón de dólares": exact millions take "de".
  const de = d >= 1_000_000 && d % 1_000_000 === 0 ? " de" : "";
  const dollars = `${spanishNumber(d, true)}${de} ${d === 1 ? "dólar" : "dólares"}`;
  return c ? `${dollars} con ${spanishNumber(c, true)} ${c === 1 ? "centavo" : "centavos"}` : dollars;
}

function decimal(intPart: string, frac: string | undefined, lang: SpeechLanguage): string {
  const whole = lang === "en" ? englishNumber(toInt(intPart)) : spanishNumber(toInt(intPart));
  if (!frac) return whole;
  const digits = [...frac].map((d) => (lang === "en" ? englishNumber(Number(d)) : spanishNumber(Number(d)))).join(" ");
  return `${whole} ${lang === "en" ? "point" : "punto"} ${digits}`;
}

export function speakable(text: string, lang: SpeechLanguage): string {
  return text
    // $38,450 / $38,450.50 / $580 / 38.450 $ is not used in the content.
    .replace(/\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g, (_m, whole: string, cents?: string) => money(whole, cents, lang))
    // 4.9% / 12%
    .replace(/(\d+)(?:\.(\d+))?\s?%/g, (_m, i: string, f?: string) => `${decimal(i, f, lang)} ${lang === "en" ? "percent" : "por ciento"}`)
    // 38,450 (comma-grouped, not money): read as a whole number.
    .replace(/\b\d{1,3}(?:,\d{3})+\b/g, (m) => (lang === "en" ? englishNumber(toInt(m)) : spanishNumber(toInt(m))));
}
