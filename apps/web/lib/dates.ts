/**
 * Dates and times as the Spanish style guide writes them: "5:30 p. m.", "1 de oct. de 2026" (docs/spanish-style-guide.md
 * section 2). Intl gives "p.m." and "oct", so Spanish output is touched up; English passes through.
 */
export function spanishDate(text: string): string {
  return text
    .replace(/\b([ap])\.\s?m\./gi, (_, x: string) => `${x.toLowerCase()}. m.`)
    .replace(/\b(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\b(?!\.)/g, "$1.");
}

/** `lang` is "en" / "es" or a full locale ("es-US"); Spanish uses es-US and the style guide's punctuation. */
export function dateFormat(lang: string, options: Intl.DateTimeFormatOptions): { format: (d: Date | number) => string } {
  const es = lang.startsWith("es");
  const f = new Intl.DateTimeFormat(es ? "es-US" : "en-US", options);
  return { format: (d) => (es ? spanishDate(f.format(d)) : f.format(d)) };
}
