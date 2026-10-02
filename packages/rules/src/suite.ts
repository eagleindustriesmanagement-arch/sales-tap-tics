import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { factsSchema, type Rule, type ScenarioFacts } from "@taptics/content";
import { checkUtterance, finalizeSession } from "./engine.js";
import { STRICTEST_STORE, newSessionState, type CheckContext, type Violation } from "./types.js";

/** The compliance suite (spec 21.2): case format, the deal facts and their variants, and the scoring of a run. */

export const suiteCaseSchema = z
  .object({
    id: z.string().min(1),
    rule_focus: z.string().min(1),
    lang: z.enum(["en", "es"]),
    kind: z.enum(["violation", "near_miss", "compliant"]),
    speaker: z.enum(["rep", "customer", "demonstrator"]).default("rep"),
    channel: z.enum(["floor", "phone", "text"]).default("floor"),
    variant: z.string().default("base"),
    offer_language: z.enum(["en", "es"]).optional(),
    /** The conversation is in the finance office (an R-finance scenario), where ADD-04 applies. */
    finance: z.boolean().default(false),
    text: z.string().optional(),
    turns: z.array(z.string().min(1)).optional(),
    expect: z.array(z.string()).default([]),
    note: z.string().optional(),
  })
  .refine((c) => Boolean(c.text) !== Boolean(c.turns), "a case has either text or turns");
export type SuiteCase = z.infer<typeof suiteCaseSchema>;

/** The deal in facts.yaml, as the engine sees it, with its named variants. */
export const SUITE_FACTS: ScenarioFacts = factsSchema.parse({
  session_date: "2026-10-02",
  vehicle: { year: 2026, make: "Chevrolet", model: "Equinox", trim: "LT", color: "Summit White", stock: "4521", in_stock: true },
  price_cents: 3245000,
  dealer_fees: [{ code: "dealer_fee", cents: 89900 }],
  government_charges_customer_pays: ["sales_tax", "tag", "title"],
  all_in_price_cents: 3334900,
  rebates: [
    { code: "bonus_cash", name: "Bonus cash", cents: 100000, eligibility: "everyone", ends: "2026-10-05", proof: "OEM bulletin 26-114" },
    { code: "first_responder", name: "First responder cash", cents: 100000, eligibility: "qualifying", qualifies: "first responders", ends: "2026-10-31", proof: "OEM bulletin 26-120" },
  ],
  deadlines: [
    { what: "Bonus cash", date: "2026-10-05", proof: "OEM bulletin 26-114" },
    { what: "First responder cash", date: "2026-10-31", proof: "OEM bulletin 26-120" },
  ],
  inventory_same_trim_color: 3,
  trade: { vehicle: "2015 Malibu", appraisal_cents: 1485000, payoff_cents: null, basis: "three closest auction sales", conditions: [] },
  lender_state: "not_applied",
  add_ons: [
    { code: "service_contract", name: { en: "service contract", es: "contrato de servicio" }, cents: 189500, aliases: { en: ["extended warranty", "warranty"], es: ["garantía extendida", "garantía"] } },
    { code: "gap", name: { en: "GAP", es: "GAP" }, cents: 79500 },
  ],
  payment_options: [
    { code: "base_72", cents: 58000, term_months: 72 },
    { code: "protected_72", cents: 62500, term_months: 72, includes_add_ons: ["service_contract", "gap"] },
    { code: "protected_84", cents: 59900, term_months: 84, includes_add_ons: ["service_contract", "gap"] },
  ],
  authority: { min_payment_cents: 57500, max_trade_cents: 1550000, manager_has_room: true },
  rep_profile: { hometown: "Hialeah" },
  text_consent: false,
  customer_knows: {},
});

export function suiteFacts(variant: string): ScenarioFacts {
  const f = structuredClone(SUITE_FACTS);
  switch (variant) {
    case "base":
      return f;
    case "approved":
      return { ...f, lender_state: "approved", approved_apr_bps: 690 };
    case "in_transit":
      return { ...f, vehicle: { ...f.vehicle, in_stock: false, in_transit: true } };
    case "trade_conditional":
      return { ...f, trade: { ...f.trade!, conditions: ["payoff letter confirms $14,200 owed"] } };
    case "competing_buyer":
      return { ...f, competing_buyer: true };
    case "consent_given":
      return { ...f, text_consent: true };
    case "last_unit":
      return { ...f, inventory_same_trim_color: 1 };
    case "no_room":
      return { ...f, authority: { min_all_in_price_cents: null, min_payment_cents: null, max_trade_cents: null, manager_has_room: false } };
    default:
      throw new Error(`unknown variant ${variant}`);
  }
}

export function loadSuite(dir: string): { cases: SuiteCase[]; errors: string[] } {
  const cases: SuiteCase[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.startsWith("cases-") && f.endsWith(".yaml")).sort()) {
    const raw = parse(readFileSync(join(dir, file), "utf8")) as unknown[];
    raw.forEach((item, i) => {
      const r = suiteCaseSchema.safeParse(item);
      if (!r.success) errors.push(`${file}[${i}]: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
      else if (seen.has(r.data.id)) errors.push(`${file}: duplicate id ${r.data.id}`);
      else {
        seen.add(r.data.id);
        cases.push(r.data);
      }
    });
  }
  return { cases, errors };
}

/** Half the cases are holdout, fixed by a hash of the id: never tuned against. */
export function splitOf(id: string): "dev" | "holdout" {
  return createHash("sha256").update(id).digest()[0]! % 2 === 0 ? "dev" : "holdout";
}

/**
 * Runs one case through the deterministic layer. Single-text cases are turn-level; `turns` cases run as one session,
 * so order and presence rules (PRICE-03, PRICE-05, PAY-02, ADD-04, AVAIL-02) apply.
 */
export function runCase(c: SuiteCase, base: Omit<CheckContext, "facts" | "channel" | "offerLanguage">): Violation[] {
  const ctx: CheckContext = { ...base, facts: suiteFacts(c.variant), channel: c.channel, offerLanguage: c.offer_language ?? c.lang, finance: c.finance, store: base.store ?? STRICTEST_STORE };
  if (c.text) return checkUtterance({ text: c.text, language: c.lang, speaker: c.speaker, turnIndex: 0 }, ctx);
  const state = newSessionState();
  const out: Violation[] = [];
  c.turns!.forEach((text, i) => out.push(...checkUtterance({ text, language: c.lang, speaker: c.speaker, turnIndex: i }, ctx, state)));
  out.push(...finalizeSession(ctx, state));
  return out;
}

export interface CaseOutcome {
  c: SuiteCase;
  split: "dev" | "holdout";
  fired: string[];
  missed: string[];
  unexpected: string[];
}

export function outcome(c: SuiteCase, violations: Violation[]): CaseOutcome {
  const fired = [...new Set(violations.filter((v) => !v.uncertain).map((v) => v.rule))].sort();
  return { c, split: splitOf(c.id), fired, missed: c.expect.filter((r) => !fired.includes(r)), unexpected: fired.filter((r) => !c.expect.includes(r)) };
}

export interface SuiteMetrics {
  cases: number;
  /** Expected rule firings that did not happen, critical rules only. Target zero. */
  criticalMisses: number;
  misses: number;
  expectedFirings: number;
  /** Share of cases where a rule fired that was not expected. Target under 5%. */
  falsePositiveRate: number;
  falsePositiveCases: number;
}

export function metrics(outcomes: CaseOutcome[], rules: Map<string, Rule>): SuiteMetrics {
  const critical = (code: string) => rules.get(code)?.severity === "critical";
  return {
    cases: outcomes.length,
    criticalMisses: outcomes.reduce((n, o) => n + o.missed.filter(critical).length, 0),
    misses: outcomes.reduce((n, o) => n + o.missed.length, 0),
    expectedFirings: outcomes.reduce((n, o) => n + o.c.expect.length, 0),
    falsePositiveCases: outcomes.filter((o) => o.unexpected.length > 0).length,
    falsePositiveRate: outcomes.length ? outcomes.filter((o) => o.unexpected.length > 0).length / outcomes.length : 0,
  };
}
