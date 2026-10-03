import type { Persona, Scenario } from "@taptics/content";
import type { CustomerDirective, RepTurnSignals } from "@taptics/engine";
import type { Language } from "@taptics/i18n";

export interface CustomerSentence {
  text: string;
  raw: string;
}

export interface CustomerTurnResult {
  raw: string;
  spoken: string;
  incidents: unknown[];
  usedFallback: boolean;
}

/** What the session needs from a customer: the AI customer and the offline customer both fit. */
export interface CustomerVoice {
  opening(): CustomerSentence;
  /**
   * Takes a recorded reply as if it had just been said, when a session is rebuilt from its stored turns. The AI
   * customer needs it (its reply cannot be generated twice the same); the offline customer is deterministic and
   * simply replies again.
   */
  absorb?(repText: string, directive: CustomerDirective, raw: string): void;
  reply(repText: string, directive: CustomerDirective, signals?: RepTurnSignals): AsyncGenerator<CustomerSentence, CustomerTurnResult>;
}

/**
 * The offline customer: approved persona lines chosen by the engine's directive, no model. Used for local
 * development, demos and model outages. It follows the same unlock, exit and next-step rules, so sessions still
 * score honestly on everything the engine and the rule engine measure.
 */
export class OfflineCustomer implements CustomerVoice {
  private deflections = 0;
  private afterReveal = 0;
  private hinted = false;
  private revealed = false;

  constructor(private readonly scenario: Scenario, private readonly persona: Persona, private readonly language: Language) {
    if (!persona.offline_lines) throw new Error(`persona ${persona.code} has no offline_lines`);
  }

  opening(): CustomerSentence {
    const text = this.scenario.opening[this.language];
    return { text, raw: text };
  }

  /**
   * Paced like a real customer (spec 10.3 item 1): the first answer after an unlock only hints; the concern comes
   * out on the next turn that presses it, or when the engine says it is time.
   */
  async *reply(_repText: string, d: CustomerDirective, signals?: RepTurnSignals): AsyncGenerator<CustomerSentence, CustomerTurnResult> {
    const lines = this.persona.offline_lines!;
    const say = (line: { en: string; es: string }) => line[this.language];
    let text: string;
    let cue = "";
    if (d.endNow) {
      text = say(lines.goodbye);
      cue = " [leaving]";
    } else if (d.exit && signals?.proposesTime) {
      text = say(lines.agree_next_step);
      cue = " [agreed_next_step]";
    } else if (d.exit === "walk_away") text = say(lines.walk_away);
    else if (d.exit === "not_now") text = say(lines.not_now);
    else if (d.mayReveal && !this.revealed && !this.hinted && !d.revealNow) {
      text = say(lines.hint);
      this.hinted = true;
    } else if (d.mayReveal && !this.revealed && (d.revealNow || (signals?.unlocks.length ?? 0) > 0)) {
      text = say(lines.reveal);
      cue = " [revealed]";
      this.revealed = true;
    } else if (d.mayReveal && !this.revealed) text = say(lines.after_hint);
    else if (signals?.proposesTime) {
      text = say(lines.agree_next_step);
      cue = " [agreed_next_step]";
    } else if (d.triggerJustHit) text = say(lines.react_to_pressure);
    else if (this.revealed) {
      text = say(lines.after_reveal[this.afterReveal % lines.after_reveal.length]!);
      this.afterReveal += 1;
    } else {
      text = say(lines.deflect[this.deflections % lines.deflect.length]!);
      this.deflections += 1;
    }
    yield { text, raw: text + cue };
    return { raw: text + cue, spoken: text, incidents: [], usedFallback: false };
  }
}
