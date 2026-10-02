import type { BilingualText, Channel, Lexicon, Rule, ScenarioFacts, Severity, SpeakerRole, Technique } from "@taptics/content";
import type { Language } from "@taptics/i18n";

export type AddOnRemovalPolicy = "credit_price" | "show_alternative" | "none_configured";

/** Store settings the checker reads (spec 3.4). Until the attorney confirms them, the strictest values apply. */
export interface StoreContext {
  addOnRemovalPolicy: AddOnRemovalPolicy;
  /** Places and names that are not personal identity claims ("I'm from Bomnin Chevrolet"). */
  ignoredIdentityPlaces: string[];
}

export const STRICTEST_STORE: StoreContext = { addOnRemovalPolicy: "none_configured", ignoredIdentityPlaces: [] };

export interface Utterance {
  text: string;
  language: Language;
  speaker: SpeakerRole;
  turnIndex?: number;
  /** Character spans where speech recognition confidence was low (spec 11.1 item 4). */
  lowConfidence?: Array<{ start: number; end: number }>;
  /** The customer's previous line, so a rep echoing a question is not read as a claim. */
  previousCustomerText?: string;
}

export interface CheckContext {
  /** Null when checking content that has no scenario (technique lines): fact comparisons are skipped. */
  facts: ScenarioFacts | null;
  store: StoreContext;
  channel: Channel;
  /** The language of the offer (the session language). */
  offerLanguage: Language;
  lexicon: Lexicon;
  rules: Rule[];
  techniques?: Map<string, Technique>;
}

export interface Violation {
  rule: string;
  severity: Severity;
  layer: "deterministic" | "classifier";
  turnIndex?: number;
  span: { start: number; end: number; text: string };
  trueFact: BilingualText;
  explanation: BilingualText;
  compliantLine: BilingualText | null;
  /** True when it rests on a low-confidence number: flagged for review, never an automatic fail (spec 11.1). */
  uncertain: boolean;
}

/** Session-level memory for order and presence rules (PRICE-03, PRICE-05, PAY-02, ADD-04, TRADE-02, AVAIL-02). */
export interface SessionComplianceState {
  firstPriceChecked: boolean;
  totalStated: boolean;
  itemizedBeforeTotal: boolean;
  addOnsPresented: boolean;
  twoPaymentMenuShown: boolean;
  serviceContractMentioned: boolean;
  serviceContractDisclosures: Set<number>;
  vehicleMentioned: boolean;
  offLotDisclosed: boolean;
  firstAddOnTurn: number | null;
  firstServiceContractTurn: number | null;
  firstVehicleTurn: number | null;
}

export function newSessionState(): SessionComplianceState {
  return {
    firstPriceChecked: false,
    totalStated: false,
    itemizedBeforeTotal: false,
    addOnsPresented: false,
    twoPaymentMenuShown: false,
    serviceContractMentioned: false,
    serviceContractDisclosures: new Set(),
    vehicleMentioned: false,
    offLotDisclosed: false,
    firstAddOnTurn: null,
    firstServiceContractTurn: null,
    firstVehicleTurn: null,
  };
}
