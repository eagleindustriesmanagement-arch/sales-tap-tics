import type { Language } from "@taptics/i18n";

/** Unicode-aware word boundary. JavaScript's \b only knows ASCII, so "\búltimo" would never match. */
const WORD = "[\\p{L}\\p{N}_]";
const BOUNDARY = `(?:(?<=${WORD})(?!${WORD})|(?<!${WORD})(?=${WORD}))`;

const cache = new Map<string, RegExp>();

/** Compiles a content pattern: case-insensitive, Unicode, with a Unicode-aware \b. */
export function compile(pattern: string, flags = "iu"): RegExp {
  const key = `${flags}:${pattern}`;
  let re = cache.get(key);
  if (!re) {
    re = new RegExp(pattern.replace(/\\b/g, BOUNDARY), flags);
    cache.set(key, re);
  }
  return re;
}

/** Compiles a list of cue words or phrases into one alternation bounded by word edges. */
export function compileCues(cues: string[], flags = "iu"): RegExp | null {
  if (cues.length === 0) return null;
  return compile(`\\b(?:${cues.join("|")})(?![\\p{L}\\p{N}_])`, flags);
}

export function normalize(text: string): string {
  return text.replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ");
}

export interface Clause {
  text: string;
  start: number;
  end: number;
}

/**
 * Splits text into sentence-level clauses, keeping offsets into the original text. A period between digits
 * ("$38.450", "5.9%") is not a boundary; an opening "¿" or "¡" starts a new clause.
 */
export function clauses(text: string): Clause[] {
  const result: Clause[] = [];
  let start = 0;
  const push = (end: number) => {
    const raw = text.slice(start, end);
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (body) result.push({ text: body, start: start + lead, end: start + lead + body.length });
    start = end;
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if ((ch === "¿" || ch === "¡") && text.slice(start, i).trim()) {
      push(i);
      continue;
    }
    if (".!?;".includes(ch)) {
      const prev = text[i - 1] ?? "";
      const next = text[i + 1] ?? "";
      if (ch === "." && /\d/.test(prev) && /\d/.test(next)) continue;
      if (next && !/\s/.test(next) && !".!?;\"')".includes(next)) continue;
      let j = i + 1;
      while (j < text.length && ".!?;\"')".includes(text[j]!)) j += 1;
      push(j);
      i = j - 1;
    }
  }
  push(text.length);
  return result;
}

export function clauseAt(text: string, index: number): Clause {
  const all = clauses(text);
  return all.find((c) => index >= c.start && index < c.end) ?? { text, start: 0, end: text.length };
}

export type BilingualPatterns = { en?: string[]; es?: string[] };

export function patternsFor(value: unknown, language: Language): string[] {
  const p = value as BilingualPatterns | undefined;
  return p?.[language] ?? [];
}

/** Patterns for both languages: reps code-switch, so a Spanish session still checks English patterns. */
export function patternsBoth(value: unknown, primary: Language): string[] {
  const other: Language = primary === "en" ? "es" : "en";
  return [...patternsFor(value, primary), ...patternsFor(value, other)];
}

export function anyMatch(text: string, patterns: string[]): RegExpExecArray | null {
  for (const p of patterns) {
    const m = compile(p).exec(text);
    if (m) return m;
  }
  return null;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
