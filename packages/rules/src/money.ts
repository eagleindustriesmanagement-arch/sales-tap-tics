import type { Lexicon } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { findNumbers, type NumberMention } from "./numbers.js";
import { clauseAt, compile } from "./text.js";

export type MoneyRole = keyof Lexicon["money_roles"] | "unknown";

export interface MoneyMention extends NumberMention {
  role: MoneyRole;
  /** A change, not a total ("two hundred more on the trade", "another $1,000 off"). */
  delta: boolean;
  /** The amount is someone else's claim being reported ("they quoted you $31,000"). */
  attributed: boolean;
  /** The clause says the price already includes every dealer charge. */
  allInMarked: boolean;
  /** Overlaps a low-confidence speech-recognition span. */
  uncertain: boolean;
}

// "another $2,000 on your trade" / "otros $2,000" is a difference too, said before the amount.
const DELTA_BEFORE = /(?<![\p{L}\p{N}_])(another|otros|otras)\s*$/iu;
// "$45 más al mes" is a difference; "$47,850 más los cargos" is a price plus charges, not a difference.
const DELTA_AFTER = /^[\s,]*(more|extra|additional|less|m[aá]s(?!\s+(?:los|las|el|la|lo|impuestos|cargos|fees|taxes|tax|tag|title|el tag|registro)\b)|adicional(es)?|de m[aá]s)(?![\p{L}\p{N}_])/iu;

/** After-cues are checked first and in this order: a gap or a per-day amount is never a payment. */
const AFTER_PRIORITY: MoneyRole[] = ["gap", "per_day", "payment", "rebate", "fee", "trade", "payoff", "down", "budget", "add_on", "price"];
/** On equal distance, the more specific role wins over the generic price cue. */
const BEFORE_PRIORITY: MoneyRole[] = ["budget", "gap", "per_day", "payment", "fee", "rebate", "trade", "payoff", "down", "add_on", "price"];

/** Money-role cues and attributions are literal phrases; escape them before building a pattern. */
export function phrases(list: { en: string[]; es: string[] }): string[] {
  return [...list.en, ...list.es].map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

/**
 * Finds the nearest before-cue for each role in the words before an amount (within its clause), and returns the
 * role whose cue ends closest to the amount; ties go to the more specific role.
 */
function roleBefore(lexicon: Lexicon, before: string): { role: MoneyRole; distance: number } | null {
  let best: MoneyRole | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const role of BEFORE_PRIORITY) {
    if (role === "unknown") continue;
    const cues = phrases(lexicon.money_roles[role].before);
    if (cues.length === 0) continue;
    const re = compile(`(?<![\\p{L}\\p{N}_])(?:${cues.join("|")})(?![\\p{L}\\p{N}_])`, "giu");
    re.lastIndex = 0;
    let nearest = Number.POSITIVE_INFINITY;
    for (const match of before.matchAll(re)) {
      const tail = before.slice((match.index ?? 0) + match[0].length);
      // Only words in the same phrase count: stop at a comma or another amount.
      if (/[,;]|\$|\d/.test(tail)) continue;
      nearest = Math.min(nearest, tail.trim().split(/\s+/).filter(Boolean).length);
    }
    // Strictly closer wins; on a tie the earlier (more specific) role in BEFORE_PRIORITY keeps the slot.
    if (nearest < bestDistance) {
      best = role;
      bestDistance = nearest;
    }
  }
  return best ? { role: best, distance: bestDistance } : null;
}

/** Number of words between an amount and the first after-cue of a role (0 to 2), or Infinity. */
function afterDistance(cues: string[], after: string): number {
  for (let gap = 0; gap <= 2; gap += 1) {
    const re = compile(`^[\\s,]*(?:[\\p{L}'-]+\\s+){${gap}}(?:${cues.join("|")})(?![\\p{L}\\p{N}_])`);
    if (re.test(after)) return gap;
  }
  return Number.POSITIVE_INFINITY;
}

function roleAfter(lexicon: Lexicon, after: string): { role: MoneyRole; distance: number } | null {
  let best: { role: MoneyRole; distance: number } | null = null;
  for (const role of AFTER_PRIORITY) {
    if (role === "unknown") continue;
    const cues = phrases(lexicon.money_roles[role].after);
    if (cues.length === 0) continue;
    const distance = afterDistance(cues, after);
    if (distance < (best?.distance ?? Number.POSITIVE_INFINITY)) best = { role, distance };
  }
  return best;
}

export interface MoneyOptions {
  lowConfidence?: Array<{ start: number; end: number }>;
  /** The deal's vehicle (model, make, trim): "the Blazer is $39,651" quotes its price. */
  vehicleNames?: string[];
}

/** A vehicle named, then "is": the amount after it is that vehicle's price. Only for amounts no cue claimed. */
function vehicleIsBefore(before: string, names: string[]): boolean {
  const nouns = ["car", "truck", "suv", "van", "vehicle", "carro", "camioneta", "troca", "guagua", "vehículo", ...names.map((n) => n.toLowerCase())]
    .filter((n) => n.trim().length > 1)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<![\\p{L}])(?:${nouns.join("|")})(?:\\s+\\p{L}+){0,2}?\\s*(?:is|'s|es|está|sale)(?:\\s+(?:only|just|solo|sólo|en))?\\s*\\$?\\s*$`, "iu").test(before);
}

/** Finds every money amount in an utterance and decides what each one is (price, payment, fee, trade...). */
export function findMoney(text: string, language: Language, lexicon: Lexicon, options: MoneyOptions = {}): MoneyMention[] {
  const attributions = compile(`(?<![\\p{L}\\p{N}_])(?:${phrases(lexicon.attributions).join("|")})(?![\\p{L}\\p{N}_])`);
  const allIn = compile(`(?:${[...lexicon.all_in_markers.en, ...lexicon.all_in_markers.es].join("|")})`);
  const mentions: MoneyMention[] = findNumbers(text, language)
    .filter((n) => n.unit === "dollar" || n.unit === "cent")
    .map((n) => {
      const clause = clauseAt(text, n.start);
      const before = text.slice(Math.max(clause.start, n.start - 60), n.start);
      const after = text.slice(n.end, Math.min(clause.end, n.end + 40));
      const a = roleAfter(lexicon, after);
      const b = roleBefore(lexicon, before);
      // The closest cue wins; an after-cue wins a tie ("$1,000 off" beats "another").
      const role: MoneyRole =
        n.unit === "cent" ? "per_day" : a && (!b || a.distance <= b.distance) ? a.role : b ? b.role : "unknown";
      const uncertain = (options.lowConfidence ?? []).some((s) => n.start < s.end && n.end > s.start);
      return {
        ...n,
        role,
        delta: DELTA_AFTER.test(after) || DELTA_BEFORE.test(before),
        attributed: attributions.test(text.slice(clause.start, n.start)),
        allInMarked: allIn.test(clause.text),
        uncertain,
      };
    });
  // An amount listed right after a payment ("$625 a month. Without them, $580.") is another payment option.
  const payments = mentions.filter((m) => m.role === "payment").map((m) => m.value);
  for (const m of mentions) {
    if (m.role === "unknown" && payments.some((p) => m.value >= p * 0.5 && m.value <= p * 1.5)) m.role = "payment";
  }
  // "The Blazer is $39,651" / "la Blazer está en $39,651": a price, even with no price word before it.
  if (options.vehicleNames?.length) {
    for (const m of mentions) {
      if (m.role !== "unknown") continue;
      const clause = clauseAt(text, m.start);
      if (vehicleIsBefore(text.slice(Math.max(clause.start, m.start - 60), m.start), options.vehicleNames)) m.role = "price";
    }
  }
  return mentions;
}
