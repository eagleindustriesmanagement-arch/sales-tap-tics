import type { Persona, Scenario, ScenarioFacts } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { CUSTOMER_CUES, type RepTurnSignals } from "./detect.js";
import { pick, rng } from "./random.js";

/** Spec 10.3. */
export type EngineState = "greeting" | "discovery" | "presentation" | "objection" | "negotiation" | "closing" | "finance_handoff" | "ending";
export type ExitKind = "walk_away" | "not_now";
export type EndReason = "sale" | "next_step" | "walk_away" | "not_now" | "timeout" | "abandoned";
export type SessionMode = "practice" | "certification" | "warm_up" | "customer_prep" | "demo";

export type StateEventKind =
  | "unlock_met"
  | "hidden_unlocked"
  | "hidden_revealed"
  | "trigger_hit"
  | "anchor_without_reason"
  | "checkpoint"
  | "walk_away_triggered"
  | "not_now_triggered"
  | "next_step_secured"
  | "partner_call"
  | "sale"
  | "state_changed"
  | "ended";

export interface StateEvent {
  turnIndex: number;
  event: StateEventKind;
  detail: Record<string, unknown>;
}

/** What the engine tells the AI customer before each reply (spec 10.4 item 4). */
export interface CustomerDirective {
  state: EngineState;
  /** The rep has met an unlock condition: the hidden truth may surface, naturally, over one or two turns. */
  mayReveal: boolean;
  /** Two customer turns have passed since the unlock: reveal it now. */
  revealNow: boolean;
  /** The engine decided this customer leaves; end the conversation in character. */
  exit: ExitKind | null;
  /** Rep turns left before the customer is gone. */
  exitTurnsLeft: number;
  /** React with mild offense: the rep opened with a number and no reason (spec 10.3 item 7). */
  reactToAnchor: boolean;
  /** A walk-out trigger the rep just hit, so the customer can react to it. */
  triggerJustHit: string | null;
  turnsRemaining: number;
  /** Say a short goodbye; this is the customer's last line. */
  endNow: boolean;
}

export interface SessionVariation {
  name: string;
  mood: string;
  facts: ScenarioFacts;
}

export interface EngineOptions {
  scenario: Scenario;
  persona: Persona;
  language: Language;
  seed: string;
  /** The exit draw u in [0, 1). Pass `exitDrawFor(...)` (decision 0005); defaults to a seeded draw. */
  exitDraw?: number;
  mode?: SessionMode;
}

/**
 * The scenario state machine (spec 10.3). Pure and synchronous: the gateway feeds it rep-turn signals and customer
 * lines, and it decides the facts, when the hidden concern may surface, and when the customer leaves. The language
 * model only writes the words.
 */
export class ScenarioEngine {
  readonly scenario: Scenario;
  readonly persona: Persona;
  readonly language: Language;
  readonly seed: string;
  readonly variation: SessionVariation;
  readonly exitDraw: number;
  readonly mode: SessionMode;

  state: EngineState;
  turnIndex = 0;
  repTurns = 0;
  hiddenUnlocked = false;
  hiddenRevealed = false;
  customerTurnsSinceUnlock = 0;
  readonly unlocksMet = new Set<string>();
  readonly triggerCounts = new Map<string, number>();
  readonly triggersFired = new Set<string>();
  anchorPenalty = 0;
  exit: ExitKind | null = null;
  exitTurnsLeft = 0;
  timeProposed = false;
  nextStepSecured = false;
  partnerCall = false;
  sale = false;
  ended = false;
  endReason: EndReason | null = null;
  numberStated = false;
  private reactToAnchor = false;
  private triggerJustHit: string | null = null;
  readonly events: StateEvent[] = [];

  constructor(options: EngineOptions) {
    this.scenario = options.scenario;
    this.persona = options.persona;
    this.language = options.language;
    this.seed = options.seed;
    this.mode = options.mode ?? "practice";
    const next = rng(options.seed);
    this.exitDraw = options.exitDraw ?? next();
    this.variation = vary(options.scenario, options.persona, options.language, next);
    this.state = options.scenario.start_state;
  }

  // ---------------------------------------------------------------- probabilities

  /** Current walk-away probability: base, plus each fired trigger, plus the anchoring penalty. */
  walkAwayProbability(): number {
    const p = this.scenario.exit_policy;
    return Math.min(1, p.walk_away_base + this.triggersFired.size * p.triggers_raise_by + this.anchorPenalty);
  }

  notNowProbability(): number {
    return Math.max(0, Math.min(this.scenario.exit_policy.not_now_base, 1 - this.walkAwayProbability()));
  }

  /** Customer-prep and demo sessions never exit on their own; warm-ups are a single drill. */
  private exitsEnabled(): boolean {
    return this.mode === "practice" || this.mode === "certification";
  }

  private requiredUnlocks(): number {
    return this.persona.difficulty >= 3 ? 2 : 1;
  }

  private record(event: StateEventKind, detail: Record<string, unknown> = {}) {
    this.events.push({ turnIndex: this.turnIndex, event, detail });
  }

  private setState(next: EngineState) {
    if (next === this.state) return;
    this.record("state_changed", { from: this.state, to: next });
    this.state = next;
  }

  turnsRemaining(): number {
    return Math.max(0, this.scenario.max_turns - this.turnIndex);
  }

  // ---------------------------------------------------------------- turns

  /** Feed one rep turn. Returns the directive for the customer's reply. */
  onRepTurn(signals: RepTurnSignals): CustomerDirective {
    if (this.ended) return this.directive();
    this.turnIndex += 1;
    this.repTurns += 1;
    this.reactToAnchor = false;
    this.triggerJustHit = null;

    // Anchoring: the first number, stated without a reason.
    if (signals.statesNumber && !this.numberStated) {
      this.numberStated = true;
      if (!signals.givesReason) {
        this.anchorPenalty = this.scenario.exit_policy.anchor_no_reason_raise;
        this.reactToAnchor = true;
        this.record("anchor_without_reason", { raise: this.anchorPenalty });
      }
    }

    // Unlocks (spec 10.3 item 1). Difficulty 3 needs two different conditions.
    for (const code of signals.unlocks) {
      if (!this.unlocksMet.has(code)) {
        this.unlocksMet.add(code);
        this.record("unlock_met", { condition: code });
      }
    }
    if (!this.hiddenUnlocked && this.unlocksMet.size >= this.requiredUnlocks()) {
      this.hiddenUnlocked = true;
      this.customerTurnsSinceUnlock = 0;
      this.record("hidden_unlocked", { conditions: [...this.unlocksMet] });
    }

    // Walk-out triggers (spec 10.3 item 2).
    for (const code of signals.triggers) {
      const count = (this.triggerCounts.get(code) ?? 0) + 1;
      this.triggerCounts.set(code, count);
      const trigger = this.persona.walk_out_triggers.find((t) => t.code === code);
      if (trigger && count >= trigger.min_hits && !this.triggersFired.has(code)) {
        this.triggersFired.add(code);
        this.triggerJustHit = code;
        this.record("trigger_hit", { trigger: code, walkAwayProbability: this.walkAwayProbability() });
      }
    }

    if (signals.proposesTime) this.timeProposed = true;
    if (signals.offersPartnerCall) this.record("checkpoint", { reason: "partner_call_offered" });

    if (this.exit) {
      this.exitTurnsLeft -= 1;
    } else if (this.exitsEnabled()) {
      // Checkpoints (spec 10.3 item 3): the rep asks for a decision or a next step, a trigger fires once the
      // customer is already in closing, or the conversation nears its limit without either.
      const nearLimit = this.turnsRemaining() <= this.scenario.exit_policy.grace_turns * 2 + 1;
      if (signals.closeAttempt) this.setState("closing");
      if (signals.closeAttempt || (this.triggerJustHit && this.state === "closing") || nearLimit) {
        this.checkpoint(signals.closeAttempt ? "close_attempt" : this.triggerJustHit ? "trigger" : "near_limit");
      }
    } else if (signals.closeAttempt) {
      this.setState("closing");
    }

    if (this.turnsRemaining() <= 0) this.end("timeout");
    return this.directive();
  }

  private checkpoint(reason: string) {
    const walk = this.walkAwayProbability();
    const notNow = this.notNowProbability();
    this.record("checkpoint", { reason, u: this.exitDraw, walk, notNow });
    if (this.exitDraw < walk) this.startExit("walk_away");
    else if (this.exitDraw < walk + notNow) this.startExit("not_now");
  }

  private startExit(kind: ExitKind) {
    this.exit = kind;
    this.exitTurnsLeft = this.scenario.exit_policy.grace_turns;
    this.setState("ending");
    this.record(kind === "walk_away" ? "walk_away_triggered" : "not_now_triggered", { u: this.exitDraw, grace: this.exitTurnsLeft });
  }

  /** Feed the customer's generated line (with its bracket cues, before they are stripped). */
  onCustomerTurn(raw: string): void {
    if (this.ended) return;
    this.turnIndex += 1;
    if (this.hiddenUnlocked && !this.hiddenRevealed) this.customerTurnsSinceUnlock += 1;
    if (CUSTOMER_CUES.revealed.test(raw) && this.hiddenUnlocked && !this.hiddenRevealed) {
      this.hiddenRevealed = true;
      this.record("hidden_revealed", {});
    }
    if (CUSTOMER_CUES.partnerCall.test(raw) && !this.partnerCall) {
      this.partnerCall = true;
      this.record("partner_call", {});
    }
    // A next step counts only if the rep proposed a specific time; the model cannot invent one (spec 10.3 item 4).
    if (CUSTOMER_CUES.agreedNextStep.test(raw) && this.timeProposed && !this.nextStepSecured) {
      this.nextStepSecured = true;
      this.record("next_step_secured", {});
    }
    if (CUSTOMER_CUES.agreedSale.test(raw) && !this.exit && !this.sale) {
      this.sale = true;
      this.record("sale", {});
    }

    if (this.exit) {
      // A leaving customer who agrees to a next step leaves with it, and the next step is the ending: the list and
      // the debrief must not say "Walked away" beside "Booked a next step". The exit draw stays on `exit`.
      if (this.exitTurnsLeft <= 0 || CUSTOMER_CUES.leaving.test(raw) || this.nextStepSecured) this.end(this.agreedEnding() ?? this.exit);
    } else if (this.winMet()) {
      this.end(this.sale ? "sale" : "next_step");
    }
    if (!this.ended && this.turnsRemaining() <= 0) this.end(this.agreedEnding() ?? "timeout");
  }

  /** What the customer already agreed to, if anything: it wins over an exit draw, a time limit or the rep's "end". */
  private agreedEnding(): "sale" | "next_step" | null {
    return this.sale ? "sale" : this.nextStepSecured ? "next_step" : null;
  }

  /** The persona's win condition (spec 10.1, 10.3 item 4). */
  winMet(): boolean {
    const w = this.persona.win_condition;
    const facts: Record<string, boolean> = {
      hidden_revealed: this.hiddenRevealed,
      next_step: this.nextStepSecured,
      sale: this.sale,
      partner_call: this.partnerCall,
    };
    const all = w.requires_all.every((k) => facts[k]);
    const any = w.requires_any.length === 0 || w.requires_any.some((k) => facts[k]);
    return all && any;
  }

  /**
   * The rep tapped "end", or the soft time limit passed. A customer who already agreed to buy or to a next step
   * keeps that ending, so the list does not call a booked appointment "Ended early"; otherwise a customer already
   * leaving leaves. `keepAgreed: false` is for a session stopped on a critical honesty failure: that one ended early,
   * whatever came before.
   */
  stop(reason: "abandoned" | "timeout", keepAgreed = true): void {
    if (!this.ended) this.end((keepAgreed ? this.agreedEnding() : null) ?? this.exit ?? reason);
  }

  private end(reason: EndReason) {
    if (this.ended) return;
    this.ended = true;
    this.endReason = reason;
    this.setState("ending");
    this.record("ended", { reason, exit: this.exit, nextStepSecured: this.nextStepSecured });
  }

  directive(): CustomerDirective {
    const mayReveal = this.hiddenUnlocked && !this.hiddenRevealed;
    return {
      state: this.state,
      mayReveal,
      revealNow: mayReveal && this.customerTurnsSinceUnlock >= 2,
      exit: this.exit,
      exitTurnsLeft: this.exitTurnsLeft,
      reactToAnchor: this.reactToAnchor,
      triggerJustHit: this.triggerJustHit,
      turnsRemaining: this.turnsRemaining(),
      endNow: this.ended || (this.exit !== null && this.exitTurnsLeft <= 0),
    };
  }

  /** Everything scoring needs from the engine (spec 13.2 U-HIDDEN, U-NEXT; spec 6.3 scenario_state_events). */
  outcome() {
    return {
      endReason: this.endReason,
      exit: this.exit,
      hiddenUnlocked: this.hiddenUnlocked,
      hiddenRevealed: this.hiddenRevealed,
      nextStepSecured: this.nextStepSecured,
      partnerCall: this.partnerCall,
      sale: this.sale,
      winMet: this.winMet(),
      triggersFired: [...this.triggersFired],
      exitDraw: this.exitDraw,
      events: [...this.events],
    };
  }
}

export type EngineOutcome = ReturnType<ScenarioEngine["outcome"]>;

/** Surface variation from the seed (spec 10.3 item 6): name, mood and customer-known amounts within ranges. */
export function vary(scenario: Scenario, persona: Persona, language: Language, next: () => number): SessionVariation {
  const name = pick(persona.name_pool[language], next);
  const mood = persona.variation.moods.length ? pick(persona.variation.moods, next) : "";
  const customerKnows = { ...scenario.facts.customer_knows };
  for (const [key, [lo, hi]] of Object.entries(persona.variation.amount_ranges)) {
    // Whole dollars, so spoken amounts stay natural.
    const dollars = Math.round((lo + next() * (hi - lo)) / 100);
    customerKnows[key] = dollars * 100;
  }
  return { name, mood, facts: { ...scenario.facts, customer_knows: customerKnows } };
}
