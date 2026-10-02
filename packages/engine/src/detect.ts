import type { BehaviorCondition, Lexicon, Persona } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { compile, findMoney } from "@taptics/rules";

/**
 * What the engine needs to know about one rep turn. A fast classifier fills this in production (spec 10.3 item 1);
 * `detectFromCues` is the deterministic fallback built from the persona's cue patterns and the lexicon.
 */
export interface RepTurnSignals {
  unlocks: string[];
  triggers: string[];
  /** The rep asked for a decision or proposed a next step. */
  closeAttempt: boolean;
  /** The rep proposed a specific day and time. */
  proposesTime: boolean;
  /** The rep offered to bring in the absent decision-maker now (T013). */
  offersPartnerCall: boolean;
  /** The rep stated a money amount as a price or payment. */
  statesNumber: boolean;
  /** ... and gave a reason with it. */
  givesReason: boolean;
  /** The turn ends in a question. */
  asksQuestion: boolean;
}

export interface UnlockDetector {
  readonly name: string;
  detect(input: { text: string; language: Language; persona: Persona; lexicon: Lexicon; previousCustomerText?: string }): Promise<RepTurnSignals>;
}

function matches(condition: BehaviorCondition, text: string): boolean {
  return [...condition.cues.en, ...condition.cues.es].some((cue) => compile(cue).test(text));
}

const REASON = compile("\\b(because|here'?s why|the reason|that'?s why|since|based on|porque|le explico por qué|la razón|ya que|según)\\b");
const PARTNER_CALL = compile("\\b(video ?call|facetime|call (her|him|them) (now|right now)|get (her|him) on the phone|videollamada|llamarla ahora|llamarlo ahora|hacerle una llamada)\\b");
const QUESTION_END = /[?？]\s*$/;

/** Deterministic signals from persona cues and the lexicon. Prompt-injection text matches nothing, by design. */
export function detectFromCues(input: { text: string; language: Language; persona: Persona; lexicon: Lexicon }): RepTurnSignals {
  const { text, persona, lexicon, language } = input;
  const close = [...lexicon.close_questions.en, ...lexicon.close_questions.es].some((p) => compile(p).test(text));
  const time = [...lexicon.next_step_time.en, ...lexicon.next_step_time.es].some((p) => compile(p).test(text));
  const money = findMoney(text, language, lexicon).filter((m) => (m.role === "price" || m.role === "payment") && !m.attributed);
  return {
    unlocks: persona.unlock_conditions.filter((c) => matches(c, text)).map((c) => c.code),
    triggers: persona.walk_out_triggers.filter((c) => matches(c, text)).map((c) => c.code),
    closeAttempt: close || time,
    proposesTime: time,
    offersPartnerCall: PARTNER_CALL.test(text),
    statesNumber: money.length > 0,
    givesReason: REASON.test(text),
    asksQuestion: QUESTION_END.test(text.trim()),
  };
}

export class CueDetector implements UnlockDetector {
  readonly name = "cues";
  async detect(input: { text: string; language: Language; persona: Persona; lexicon: Lexicon }): Promise<RepTurnSignals> {
    return detectFromCues(input);
  }
}

/** Cues the AI customer appends in brackets; the gateway strips them before speech (spec 11.4 item 3). */
export const CUSTOMER_CUES = {
  revealed: /\[\s*revealed\s*\]/i,
  agreedNextStep: /\[\s*agreed_next_step\s*\]/i,
  partnerCall: /\[\s*partner_call\s*\]/i,
  agreedSale: /\[\s*agreed_sale\s*\]/i,
  leaving: /\[\s*leaving\s*\]/i,
} as const;

export function stripCues(text: string): string {
  return text.replace(/\[[^\]]*\]/g, "").replace(/\s{2,}/g, " ").trim();
}
