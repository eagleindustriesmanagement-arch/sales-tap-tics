import { factsSchema, platformLibrary, type Channel, type ScenarioFacts } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { STRICTEST_STORE, type CheckContext, type StoreContext } from "../src/types.js";

/** The spec 7.3 example deal, extended with a finance menu, a trade and a qualifying rebate for coverage. */
export const FACTS: ScenarioFacts = factsSchema.parse({
  session_date: "2026-10-02", // a Friday
  vehicle: { year: 2026, make: "Chevrolet", model: "Equinox", trim: "LT", stock: "4521", in_stock: true },
  price_cents: 3245000,
  dealer_fees: [{ code: "dealer_fee", cents: 89900 }],
  government_charges_customer_pays: ["sales_tax", "tag", "title"],
  all_in_price_cents: 3334900,
  rebates: [
    { code: "bonus_cash", name: "Bonus cash", cents: 100000, eligibility: "everyone", ends: "2026-10-05", proof: "OEM bulletin 26-114" },
    { code: "first_responder", name: "First responder", cents: 100000, eligibility: "qualifying", qualifies: "first responders", ends: "2026-10-31", proof: "OEM bulletin 26-120" },
  ],
  deadlines: [
    { what: "Bonus cash", date: "2026-10-05", proof: "OEM bulletin 26-114" },
    { what: "First responder cash", date: "2026-10-31", proof: "OEM bulletin 26-120" },
  ],
  inventory_same_trim_color: 3,
  trade: { vehicle: "2015 Malibu", appraisal_cents: 1485000, payoff_cents: null, basis: "three closest auction sales", conditions: [] },
  lender_state: "not_applied",
  add_ons: [
    { code: "service_contract", name: { en: "service contract", es: "contrato de servicio" }, cents: 189500, aliases: { en: ["extended warranty"], es: ["garantía extendida"] } },
    { code: "gap", name: { en: "GAP", es: "GAP" }, cents: 79500 },
  ],
  payment_options: [
    { code: "base_72", cents: 58000, term_months: 72 },
    { code: "protected_72", cents: 62500, term_months: 72, includes_add_ons: ["service_contract", "gap"] },
    { code: "protected_84", cents: 59900, term_months: 84, includes_add_ons: ["service_contract", "gap"] },
  ],
  authority: { min_payment_cents: 57500, manager_has_room: true },
  rep_profile: { hometown: "Hialeah" },
  text_consent: false,
  customer_knows: { budget_told_spouse_cents: 52000, quoted_payment_cents: 58000 },
});

export function ctx(overrides: Partial<CheckContext> & { language?: Language; channel?: Channel; facts?: ScenarioFacts | null; store?: StoreContext } = {}): CheckContext {
  const library = platformLibrary();
  return {
    facts: overrides.facts === undefined ? FACTS : overrides.facts,
    store: overrides.store ?? STRICTEST_STORE,
    channel: overrides.channel ?? "floor",
    offerLanguage: overrides.offerLanguage ?? overrides.language ?? "en",
    lexicon: library.lexicon!,
    rules: [...library.rules.values()],
    techniques: library.techniques,
  };
}
