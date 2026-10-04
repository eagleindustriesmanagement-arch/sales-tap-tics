import { STRINGS, type StringKey } from "./strings.js";
import { LANGUAGES, type Bilingual, type Language } from "./types.js";

/** Looks up a UI string and fills {placeholders}. Never machine-translates (spec 16.1 rule 2). */
export function t(key: StringKey, language: Language, values: Record<string, string | number> = {}): string {
  const text = format((STRINGS[key] as Bilingual)[language], language, values);
  return PSEUDO && language === "es" ? pseudo(text) : text;
}

/**
 * Pseudo-localization (docs/spanish-style-guide.md section 6 rule 6), for a test build only: every Spanish interface
 * string 35% longer and in brackets, so cut-off text and anything not going through these strings stand out.
 * NEXT_PUBLIC_ so the browser bundle sees the same switch as the server.
 */
const PSEUDO = typeof process !== "undefined" && process.env.NEXT_PUBLIC_TAPTICS_PSEUDO === "1";
// Padding in word-sized pieces, so it wraps the way longer Spanish words would rather than as one unbreakable run.
const pseudo = (s: string) => `[${s} ${Array.from({ length: Math.ceil((s.length * 0.35) / 5) }, () => "····").join(" ")}]`;

const LOCALES: Record<Language, string> = { en: "en-US", es: "es-US" };

/**
 * Fills a message: ICU plurals first ("{n, plural, =0 {…} one {# turno} other {# turnos}}", the form chosen by the
 * language's own plural rules, "#" the number), then plain {placeholders}. One message per sentence, so Spanish
 * word order, gender and number never depend on English (docs/spanish-style-guide.md section 6).
 */
export function format(template: string, language: Language, values: Record<string, string | number> = {}): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const head = /^\{(\w+),\s*plural,/.exec(template.slice(i));
    if (!head) {
      out += template[i];
      i += 1;
      continue;
    }
    // Read the options up to the brace that closes this plural.
    let j = i + head[0].length;
    const options: Record<string, string> = {};
    for (;;) {
      while (/\s/.test(template[j] ?? "")) j += 1;
      if (template[j] === "}") break;
      const sel = /^(=\d+|zero|one|two|few|many|other)\s*\{/.exec(template.slice(j));
      if (!sel) throw new Error(`bad plural in "${template}"`);
      j += sel[0].length;
      let depth = 1;
      const start = j;
      while (depth > 0) {
        if (template[j] === "{") depth += 1;
        else if (template[j] === "}") depth -= 1;
        if (j >= template.length) throw new Error(`unclosed plural in "${template}"`);
        j += 1;
      }
      options[sel[1]!] = template.slice(start, j - 1);
    }
    const n = Number(values[head[1]!]);
    const chosen = options[`=${n}`] ?? options[new Intl.PluralRules(LOCALES[language]).select(n)] ?? options["other"] ?? "";
    out += chosen.replace(/#/g, Number.isFinite(n) ? String(n) : "#");
    i = j + 1;
  }
  return out.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/** The names a message takes: plain {name} slots and the counts its plurals read. */
export function placeholderNames(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)(?:\}|,\s*plural,)/g)].map((m) => m[1]!))].sort();
}

export interface MissingTranslation {
  key: string;
  language: Language | "placeholders";
  detail: string;
}

/** Returns every string that is empty in a language or whose placeholders differ between languages. */
export function missingTranslations(table: Record<string, Bilingual> = STRINGS): MissingTranslation[] {
  const problems: MissingTranslation[] = [];
  for (const [key, pair] of Object.entries(table)) {
    for (const language of LANGUAGES) {
      if (typeof pair[language] !== "string" || pair[language].trim() === "") {
        problems.push({ key, language, detail: "empty or missing" });
      }
    }
    const placeholders = (s: string | undefined) => placeholderNames(s ?? "").join(",");
    if (placeholders(pair.en) !== placeholders(pair.es)) {
      problems.push({ key, language: "placeholders", detail: `en {${placeholders(pair.en)}} vs es {${placeholders(pair.es)}}` });
    }
  }
  return problems;
}
