import { STRINGS, type StringKey } from "./strings.js";
import { LANGUAGES, type Bilingual, type Language } from "./types.js";

/** Looks up a UI string and fills {placeholders}. Never machine-translates (spec 16.1 rule 2). */
export function t(key: StringKey, language: Language, values: Record<string, string | number> = {}): string {
  const template = (STRINGS[key] as Bilingual)[language];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
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
    const placeholders = (s: string | undefined) => [...(s ?? "").matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    if (placeholders(pair.en) !== placeholders(pair.es)) {
      problems.push({ key, language: "placeholders", detail: `en {${placeholders(pair.en)}} vs es {${placeholders(pair.es)}}` });
    }
  }
  return problems;
}
