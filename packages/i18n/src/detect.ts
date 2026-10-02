import type { Language } from "./types.js";

export type DetectedLanguage = Language | "mixed" | "unknown";

// Function words only: they carry language identity without topic bias.
const EN_WORDS = new Set(
  "the an and or but is are was were be been it this that these those you your i me my we our they their he she him her what when where why how which who do does did not no yes can could would should will just so if then than there here have has had to of in on at for with about from by as".split(" "),
);
const ES_WORDS = new Set(
  "el la los las un una unos unas y o pero es son era fue ser está están estoy este esta estos estas ese esa eso usted ustedes yo me mi mis nosotros nuestro su sus qué cuándo dónde por porque cómo cuál quién no sí puede podría sería va voy vamos solo entonces si que de del en con para sin sobre hasta desde al lo le les se muy más menos hay tiene tengo".split(" "),
);

/**
 * Dealer terms Miami customers use inside Spanish ("el down", "el trade-in"). They are not code-switching
 * (spec 16.1 rule 5), so they never count toward English. Loaded from the glossary by callers when available.
 */
export const DEFAULT_NEUTRAL_TERMS = new Set(
  "down trade trade-in dealer fee score payoff gap apr lease test drive ok okay".split(" "),
);

const SPANISH_CHARS = /[ñáéíóúü¿¡]/i;

export interface LanguageScores {
  en: number;
  es: number;
}

export function scoreLanguage(text: string, neutral: Set<string> = DEFAULT_NEUTRAL_TERMS): LanguageScores {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  let en = 0;
  let es = 0;
  for (const token of tokens) {
    if (neutral.has(token)) continue;
    const isEs = ES_WORDS.has(token);
    const isEn = EN_WORDS.has(token);
    if (isEs && !isEn) es += 1;
    else if (isEn && !isEs) en += 1;
    if (SPANISH_CHARS.test(token)) es += 0.5;
  }
  return { en, es };
}

/** Detects the dominant language of one clause or turn. Short or ambiguous text returns "unknown". */
export function detectLanguage(text: string, neutral?: Set<string>): DetectedLanguage {
  const { en, es } = scoreLanguage(text, neutral);
  const total = en + es;
  if (total < 1.5) return "unknown";
  if (en >= 2 && es >= 2 && Math.min(en, es) / total >= 0.3) return "mixed";
  return en > es ? "en" : "es";
}

/** Splits text into clauses so mixed turns can be judged clause by clause (LANG-01, U-LANG). */
export function splitClauses(text: string): string[] {
  return text
    .split(/(?<=[.!?¿¡;])\s+|,\s+(?=(?:but|pero|if|si|and|y|unless|a menos)\b)/i)
    .map((c) => c.trim())
    .filter(Boolean);
}
