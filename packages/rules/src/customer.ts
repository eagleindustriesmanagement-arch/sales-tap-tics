import type { BilingualText, Lexicon, ScenarioFacts } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { findMoney } from "./money.js";
import { findNumbers } from "./numbers.js";
import { clauseAt, compile, patternsFor } from "./text.js";

/**
 * Guards every AI customer line before it is spoken (spec 4.3 item 7, 10.4, 21.3): the hidden truth must not leak
 * before an unlock, the customer never coaches the rep, and never states a money fact the scenario does not hold.
 * Any issue means the line is regenerated and the incident logged.
 */
export type CustomerIssueKind = "hidden_leak" | "coaching" | "false_fact" | "stage_direction_only";

export interface CustomerIssue {
  kind: CustomerIssueKind;
  span: { start: number; end: number; text: string };
  detail: string;
}

export interface CustomerGuardInput {
  text: string;
  language: Language;
  facts: ScenarioFacts;
  lexicon: Lexicon;
  hiddenTruthMarkers: { en: string[]; es: string[] };
  hiddenUnlocked: boolean;
}

/** Every amount the customer could truthfully mention, including simple differences ("sixty bucks higher"). */
export function knownAmounts(facts: ScenarioFacts): number[] {
  const sets = amountSets(facts);
  return [...new Set([...sets.base, ...sets.differences])];
}

interface AmountSets {
  /** Amounts the scenario states outright. */
  base: number[];
  /** Simple differences between them: true only said as a difference, never as a discount or another store's quote. */
  differences: number[];
  /** What the customer may say he owes on his car. */
  payoff: number[];
  /** What the customer may say his car is worth, or was offered for it. */
  trade: number[];
}

function amountSets(facts: ScenarioFacts): AmountSets {
  const base = new Set<number>([
    facts.price_cents,
    facts.all_in_price_cents,
    ...facts.dealer_fees.map((f) => f.cents),
    ...facts.rebates.map((r) => r.cents),
    ...facts.add_ons.map((a) => a.cents),
    ...facts.payment_options.map((p) => p.cents),
    ...facts.payment_options.map((p) => p.down_cents),
    ...facts.alternatives.map((a) => a.all_in_price_cents),
  ]);
  const payoff = new Set<number>();
  const trade = new Set<number>();
  if (facts.trade?.appraisal_cents != null) {
    base.add(facts.trade.appraisal_cents);
    trade.add(facts.trade.appraisal_cents);
  }
  if (facts.trade?.payoff_cents != null) {
    base.add(facts.trade.payoff_cents);
    payoff.add(facts.trade.payoff_cents);
    trade.add(facts.trade.payoff_cents);
  }
  const known = Object.entries(facts.customer_knows).filter(([key, v]) => typeof v === "number" && key.endsWith("_cents")) as Array<[string, number]>;
  for (const [key, v] of known) {
    base.add(v);
    if (/payoff|owe|balance/.test(key)) payoff.add(v);
    if (/payoff|owe|balance|trade|apprais|estimate|auction|offer|allowance|worth|value|kbb|carmax|carvana/.test(key)) trade.add(v);
  }
  const differences = new Set<number>();
  const paymentish = [...known.map(([, v]) => v), ...facts.payment_options.map((p) => p.cents)];
  for (const a of paymentish) for (const b of paymentish) if (a > b) differences.add(a - b);
  if (facts.trade?.appraisal_cents != null && facts.trade.payoff_cents != null) {
    const equity = Math.abs(facts.trade.payoff_cents - facts.trade.appraisal_cents);
    differences.add(equity);
    trade.add(equity);
    // "I owe about seven thousand more than it's worth".
    payoff.add(equity);
  }
  const positive = (s: Set<number>) => [...s].filter((v) => v > 0);
  return { base: positive(base), differences: positive(differences), payoff: positive(payoff), trade: positive(trade) };
}

/** The customer says what he owes on his own car ("I still owe", "todavía debo"). Checked in the words before the amount. */
const OWE_CUE =
  /(?<![\p{L}])(?:owe|owed|owing|payoff|pay-?off|balance|debo|debemos|me falta(?:n)? pagar|me queda(?:n)? por pagar|saldo)(?![\p{L}])/iu;
/** The customer says what someone offered for his own car, or what it is worth ("offered me six grand for my Civic"). */
const TRADE_CUE = [
  /(?<![\p{L}])(?:offer(?:ed|s)?|gave|give|giving|quoted?|bid|appraised|valued|would pay|will pay|pay me|paid me|worth)(?![\p{L}])[^.?!;]*?(?<![\p{L}])(?:for|on) (?:my|our) \p{L}/iu,
  /(?<![\p{L}])(?:my|our) (?:trade|trade-in|old car|old truck)(?![\p{L}-])[^.?!;]*?(?<![\p{L}])(?:worth|offer(?:ed)?|appraised|valued|gets?|got)(?![\p{L}])/iu,
  /(?<![\p{L}])(?:ofrec\p{L}*|d(?:an|aban|ieron|io|ió|ar[ií]an)|pag(?:an|aban|ar[ií]an|aron)|tas(?:aron|an|ó)|vale|val[ií]a)(?![\p{L}])[^.?!;]*?(?<![\p{L}])por (?:mi|nuestro|nuestra) \p{L}/iu,
  /(?<![\p{L}])(?:mi|nuestro|nuestra) (?:trade|trade-in|carro viejo|camioneta vieja)(?![\p{L}-])[^.?!;]*?(?<![\p{L}])(?:vale|val[ií]a|ofrec\p{L}*|tas\p{L}*)(?![\p{L}])/iu,
];
/** The customer reports another seller's or lender's number: a new fact, never a difference he worked out himself. */
const ELSEWHERE_CUE =
  /(?<![\p{L}])(?:other (?:dealer(?:ship)?|store|place|lot)s?|another (?:dealer(?:ship)?|store|place|lot)|down the street|online|carvana|carmax|credit union|my bank|otra (?:agencia|tienda)|otro (?:dealer|concesionario|lugar)|la cooperativa|mi banco|en internet)(?![\p{L}])/iu;

interface Amount {
  start: number;
  end: number;
  text: string;
  value: number;
  role: string;
  approximate: boolean;
  /** Said with no dollar word ("six grand"): only checked where the role is clear. */
  bare?: boolean;
}

/** "Six grand", "6 grand", "seis mil": a spoken amount with no dollar word is still dollars. */
function spokenThousands(text: string, language: Language): Amount[] {
  const found: Amount[] = [];
  for (const n of findNumbers(text, language)) {
    if (n.unit !== "none" || n.value < 1000) continue;
    const after = text.slice(n.end, n.end + 20);
    const grand = /grand$/i.test(n.text.trim()) && n.text.trim().toLowerCase() !== "grand";
    const mil = language === "es" && /(?<![\p{L}])mil$/iu.test(n.text.trim()) && !/^\s*(?:millas|kil[oó]metros|km|personas|veces|años)/iu.test(after);
    if (grand || mil) found.push({ start: n.start, end: n.end, text: n.text, value: n.value * 100, role: "unknown", approximate: true, bare: true });
  }
  for (const m of text.matchAll(/(?<![\d.,])(\d{1,3}(?:\.\d)?)\s*grand(?![\p{L}])/giu)) {
    found.push({ start: m.index!, end: m.index! + m[0].length, text: m[0], value: Math.round(Number(m[1]) * 100_000), role: "unknown", approximate: true, bare: true });
  }
  return found;
}

export function guardCustomerLine(input: CustomerGuardInput): CustomerIssue[] {
  const { text, language, facts, lexicon } = input;
  const issues: CustomerIssue[] = [];
  const spoken = text.replace(/\[[^\]]*\]/g, "").trim();
  if (!spoken) issues.push({ kind: "stage_direction_only", span: { start: 0, end: text.length, text }, detail: "no spoken words" });

  if (!input.hiddenUnlocked) {
    for (const lang of ["en", "es"] as const) {
      for (const marker of patternsFor(input.hiddenTruthMarkers, lang)) {
        const m = compile(marker).exec(text);
        if (m) issues.push({ kind: "hidden_leak", span: { start: m.index, end: m.index + m[0].length, text: m[0] }, detail: marker });
      }
    }
    if (/\[\s*reveal(ed)?\s*\]/i.test(text)) issues.push({ kind: "hidden_leak", span: { start: 0, end: text.length, text }, detail: "reveal cue before unlock" });
  }

  for (const cue of [...lexicon.coaching.en, ...lexicon.coaching.es]) {
    const m = compile(`\\b(?:${cue})`).exec(text);
    if (m) issues.push({ kind: "coaching", span: { start: m.index, end: m.index + m[0].length, text: m[0] }, detail: cue });
  }

  const sets = amountSets(facts);
  const near = (list: number[], value: number, tolerance: number) => list.some((v) => Math.abs(v - value) <= tolerance);
  const amounts: Amount[] = [...findMoney(text, language, lexicon).filter((m) => !m.placeholder), ...spokenThousands(text, language)];
  for (const m of amounts) {
    const tolerance = m.approximate ? Math.max(500, Math.round(m.value * 0.1)) : 100;
    const clause = clauseAt(text, m.start);
    const flag = (detail: string) => issues.push({ kind: "false_fact", span: { start: m.start, end: m.end, text: m.text }, detail });
    // What the customer owes, or was offered, for his own car is only true when it matches that car; with no trade, there is none.
    if (OWE_CUE.test(text.slice(clause.start, m.start))) {
      if (!near(sets.payoff, m.value, tolerance)) flag(sets.payoff.length ? `payoff ${m.value} does not match the trade` : `payoff ${m.value}: the scenario has no trade`);
      continue;
    }
    // Only the customer's own words decide this: the lexicon's "sale en" is a trade cue but also a price.
    if (TRADE_CUE.some((re) => re.test(clause.text))) {
      // "$3,000 more for my trade" is a difference he knows about, not an offer.
      const delta = "delta" in m && m.delta === true;
      if (!near(delta ? [...sets.trade, ...sets.base, ...sets.differences] : sets.trade, m.value, tolerance)) flag(sets.trade.length ? `trade amount ${m.value} does not match the trade` : `trade amount ${m.value}: the scenario has no trade`);
      continue;
    }
    if (m.bare) continue;
    if (near(sets.base, m.value, tolerance)) continue;
    // A difference ("sixty bucks higher") is only true said as a difference, never as a discount or another store's quote.
    const differenceRole = m.role === "gap" || m.role === "payment" || m.role === "budget" || m.role === "unknown";
    if (differenceRole && !ELSEWHERE_CUE.test(clause.text) && near(sets.differences, m.value, tolerance)) continue;
    flag(`amount ${m.value} not in scenario facts`);
  }
  return issues;
}

export function describeIssue(issue: CustomerIssue): BilingualText {
  return { en: `${issue.kind}: ${issue.span.text}`, es: `${issue.kind}: ${issue.span.text}` };
}
