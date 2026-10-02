export const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

/** A pair of strings that must always exist in both languages (spec 1.2 item 3, 6.4 rule 5). */
export interface Bilingual {
  en: string;
  es: string;
}

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "es";
}
