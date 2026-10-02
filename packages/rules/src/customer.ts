import type { BilingualText, Lexicon, ScenarioFacts } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { findMoney } from "./money.js";
import { compile, patternsFor } from "./text.js";

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
  const values = new Set<number>([
    facts.price_cents,
    facts.all_in_price_cents,
    ...facts.dealer_fees.map((f) => f.cents),
    ...facts.rebates.map((r) => r.cents),
    ...facts.add_ons.map((a) => a.cents),
    ...facts.payment_options.map((p) => p.cents),
    ...facts.payment_options.map((p) => p.down_cents),
    ...facts.alternatives.map((a) => a.all_in_price_cents),
  ]);
  if (facts.trade?.appraisal_cents != null) values.add(facts.trade.appraisal_cents);
  if (facts.trade?.payoff_cents != null) values.add(facts.trade.payoff_cents);
  const known = Object.entries(facts.customer_knows)
    .filter(([key, v]) => typeof v === "number" && key.endsWith("_cents"))
    .map(([, v]) => v as number);
  for (const v of known) values.add(v);
  const paymentish = [...known, ...facts.payment_options.map((p) => p.cents)];
  for (const a of paymentish) for (const b of paymentish) if (a > b) values.add(a - b);
  if (facts.trade?.appraisal_cents != null && facts.trade.payoff_cents != null) {
    values.add(Math.abs(facts.trade.payoff_cents - facts.trade.appraisal_cents));
  }
  return [...values].filter((v) => v > 0);
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

  const allowed = knownAmounts(facts);
  for (const m of findMoney(text, language, lexicon)) {
    if (m.placeholder) continue;
    const tolerance = m.approximate ? Math.max(500, Math.round(m.value * 0.1)) : 100;
    if (allowed.some((v) => Math.abs(v - m.value) <= tolerance)) continue;
    issues.push({ kind: "false_fact", span: { start: m.start, end: m.end, text: m.text }, detail: `amount ${m.value} not in scenario facts` });
  }
  return issues;
}

export function describeIssue(issue: CustomerIssue): BilingualText {
  return { en: `${issue.kind}: ${issue.span.text}`, es: `${issue.kind}: ${issue.span.text}` };
}
