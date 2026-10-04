import { AiCustomer, type AiClient } from "@taptics/ai";
import type { Library, Persona, Scenario } from "@taptics/content";
import { CueDetector, ScenarioEngine, type EngineOutcome, type RepTurnSignals, type SessionMode, type UnlockDetector } from "@taptics/engine";
import { detectLanguage, type Language } from "@taptics/i18n";
import {
  checkUtterance,
  checkUtteranceFull,
  failsHonesty,
  finalizeSession,
  newSessionState,
  NullClassifier,
  STRICTEST_STORE,
  type CheckContext,
  type ComplianceClassifier,
  type SessionComplianceState,
  type StoreContext,
  type Violation,
} from "@taptics/rules";
import { buildDebrief, FixtureJudge, scoreSession, type Debrief, type Judge, type ScoredTurn, type ScoreResult } from "@taptics/scoring";
import { OfflineCustomer, type CustomerSentence, type CustomerTurnResult, type CustomerVoice } from "./offline-customer.js";
import { scaleExitPolicy } from "./calibrate.js";

export interface RepTiming {
  startedMs?: number;
  endedMs?: number;
  pauseBeforeMs?: number;
  wordsPerMinute?: number;
  asrConfidence?: number;
  lowConfidence?: Array<{ start: number; end: number }>;
}

export interface PracticeSessionOptions {
  library: Library;
  scenarioCode: string;
  /** "follow" starts in the persona's preferred language (spec 12.2 item 1). */
  language: Language | "follow";
  mode?: SessionMode;
  seed: string;
  exitDraw?: number;
  tenantId: string;
  sessionId: string;
  textMode: boolean;
  store?: StoreContext;
  /** Stop and debrief on the first confident critical violation (spec 12.2 item 5, always on in certification). */
  stopOnCritical?: boolean;
  /**
   * The store's mandatory dealer charges (spec 3.4). When given, they replace the scenario's example fees and the
   * all-in price is recomputed, so the compliance engine enforces the store's real numbers.
   */
  dealerFees?: { code: string; cents: number }[];
  /**
   * The store's exit-rate calibration (spec 19.2 item 1). Scales practice exits only: certification faces the
   * authored rates in every store, so certifications stay comparable (decision 0011).
   */
  exitMultiplier?: number;
  /**
   * Rebuilding a live session from its stored turns (`replayPracticeSession`): the recorded customer replies, in
   * order, used instead of new ones while they last.
   */
  replay?: { raw: string; spoken: string }[];
  /** Omit for the offline customer and judge. */
  ai?: { client: AiClient; classifier?: ComplianceClassifier; detector?: UnlockDetector; judge?: Judge };
}

export interface TurnOutcome {
  ended: boolean;
  endReason: string | null;
  /** Set when stop-on-critical ended the session on this turn. */
  stoppedOnCritical: Violation | null;
  customer: { spoken: string; incidents: number; usedFallback: boolean } | null;
}

export interface SessionResult {
  sessionId: string;
  scenarioCode: string;
  language: Language;
  transcript: ScoredTurn[];
  violations: Violation[];
  engine: EngineOutcome;
  score: ScoreResult;
  debrief: Debrief;
  offline: boolean;
}

/** The scenario with the store's mandatory dealer charges in place of its example fees. */
export function withStoreFees(scenario: Scenario, fees: { code: string; cents: number }[]): Scenario {
  const total = fees.reduce((sum, f) => sum + f.cents, 0);
  return { ...scenario, facts: { ...scenario.facts, dealer_fees: fees.map((f) => ({ ...f })), all_in_price_cents: scenario.facts.price_cents + total } };
}

/**
 * One practice session, end to end (spec 5.2, 12.2): every rep turn goes through the deterministic rule layer at
 * once and the classifier in the background, the engine decides the scene, the customer speaks sentence by
 * sentence, and the end of the session produces a score and a debrief. Transport-free: the voice gateway and the
 * text practice room both drive this class.
 */
export class PracticeSession {
  readonly scenario: Scenario;
  readonly persona: Persona;
  readonly language: Language;
  readonly engine: ScenarioEngine;
  readonly transcript: ScoredTurn[] = [];
  private readonly ctx: CheckContext;
  private readonly compliance: SessionComplianceState = newSessionState();
  private readonly violations: Violation[] = [];
  private readonly pending: Promise<Violation[]>[] = [];
  private readonly customer: CustomerVoice;
  private readonly detector: UnlockDetector;
  private readonly classifier: ComplianceClassifier;
  private stoppedOnCritical: Violation | null = null;
  private started = false;

  constructor(private readonly options: PracticeSessionOptions) {
    const { library } = options;
    const content = library.scenarios.get(options.scenarioCode);
    if (!content) throw new Error(`unknown scenario ${options.scenarioCode}`);
    const withFees = options.dealerFees?.length ? withStoreFees(content, options.dealerFees) : content;
    const calibrated = (options.mode ?? "practice") === "practice" && options.exitMultiplier !== undefined;
    const scenario = calibrated ? { ...withFees, exit_policy: scaleExitPolicy(withFees.exit_policy, options.exitMultiplier!) } : withFees;
    const persona = library.personas.get(scenario.persona);
    if (!persona) throw new Error(`scenario ${scenario.code} has no persona ${scenario.persona}`);
    this.scenario = scenario;
    this.persona = persona;
    this.language = options.language === "follow" ? persona.language.preferred : options.language;
    this.engine = new ScenarioEngine({ scenario, persona, language: this.language, seed: options.seed, exitDraw: options.exitDraw, mode: options.mode ?? "practice" });
    this.ctx = {
      facts: this.engine.variation.facts,
      store: options.store ?? STRICTEST_STORE,
      channel: scenario.channel,
      offerLanguage: this.language,
      finance: scenario.rubric === "R-finance",
      industry: scenario.industry,
      lexicon: library.lexicon!,
      rules: [...library.rules.values()],
      techniques: library.techniques,
    };
    this.detector = options.ai?.detector ?? new CueDetector();
    this.classifier = options.ai?.classifier ?? new NullClassifier();
    this.customer = options.ai
      ? new AiCustomer(options.ai.client, { scenario, persona, variation: this.engine.variation, language: this.language, glossary: library.glossary, lexicon: library.lexicon!, tenantId: options.tenantId, sessionId: options.sessionId })
      : new OfflineCustomer(scenario, persona, this.language);
  }

  private finalized = false;

  get offline(): boolean {
    return !this.options.ai;
  }

  /** The pre-brief (spec 12.2 item 1): who the customer is and the setting. Never the hidden truth. */
  preBrief() {
    return {
      customerName: this.engine.variation.name,
      setting: this.scenario.setting[this.language],
      brief: this.scenario.pre_brief[this.language].replace("{name}", this.engine.variation.name),
      targets: this.scenario.target_techniques,
    };
  }

  /** The customer's approved opening line, recorded as the stated objection. */
  start(): CustomerSentence {
    if (this.started) throw new Error("session already started");
    this.started = true;
    const opening = this.customer.opening();
    this.transcript.push({ index: 0, speaker: "customer", text: opening.text, language: this.language, isObjection: true });
    return opening;
  }

  private stopOnCritical(): boolean {
    return this.options.stopOnCritical ?? (this.options.mode === "certification");
  }

  /** One rep turn; yields the customer's reply sentence by sentence and returns what happened. */
  async *repTurn(text: string, timing: RepTiming = {}): AsyncGenerator<CustomerSentence, TurnOutcome> {
    if (!this.started) throw new Error("call start() first");
    if (this.engine.ended) return this.outcome(null);
    const index = this.transcript.length;
    const detected = detectLanguage(text);
    const language: Language = detected === "en" || detected === "es" ? detected : this.language;
    const previousCustomer = [...this.transcript].reverse().find((t) => t.speaker === "customer")?.text;
    this.transcript.push({
      index,
      speaker: "rep",
      text,
      language,
      startedMs: timing.startedMs,
      endedMs: timing.endedMs,
      pauseBeforeMs: this.options.textMode ? undefined : timing.pauseBeforeMs,
      wordsPerMinute: this.options.textMode ? undefined : timing.wordsPerMinute,
      asrConfidence: timing.asrConfidence,
    });

    // Layer one now (under 20 ms); layer two in the background, collected at the end (spec 5.2 item 4).
    const utterance = { text, language, speaker: "rep" as const, turnIndex: index, lowConfidence: timing.lowConfidence, previousCustomerText: previousCustomer };
    const now = checkUtterance(utterance, this.ctx, this.compliance);
    this.violations.push(...now);
    if (!(this.classifier instanceof NullClassifier)) {
      this.pending.push(
        checkUtteranceFull(utterance, { ...this.ctx }, this.classifier).then((all) => all.filter((v) => v.layer === "classifier")).catch(() => []),
      );
    }
    if (this.stopOnCritical() && failsHonesty(now)) {
      this.stoppedOnCritical = now.find((v) => v.severity === "critical" && !v.uncertain) ?? null;
      this.engine.stop("abandoned");
      return this.outcome(null);
    }

    const signals: RepTurnSignals = await this.detector.detect({ text, language, persona: this.persona, lexicon: this.ctx.lexicon, previousCustomerText: previousCustomer });
    const directive = this.engine.onRepTurn(signals);
    if (this.engine.ended && !directive.endNow) return this.outcome(null);

    const recorded = this.options.ai && this.customer.absorb ? this.options.replay?.shift() : undefined;
    let result: CustomerTurnResult;
    if (recorded) {
      this.customer.absorb!(text, directive, recorded.raw);
      result = { raw: recorded.raw, spoken: recorded.spoken, incidents: [], usedFallback: false };
      yield { text: recorded.spoken, raw: recorded.raw };
    } else {
      const reply = this.customer.reply(text, directive, signals);
      let step = await reply.next();
      while (!step.done) {
        yield step.value;
        step = await reply.next();
      }
      result = step.value;
    }
    this.engine.onCustomerTurn(result.raw);
    this.transcript.push({ index: this.transcript.length, speaker: "customer", text: result.spoken, language: this.language, raw: result.raw });
    return this.outcome({ spoken: result.spoken, incidents: result.incidents.length, usedFallback: result.usedFallback });
  }

  private outcome(customer: TurnOutcome["customer"]): TurnOutcome {
    return { ended: this.engine.ended, endReason: this.engine.endReason, stoppedOnCritical: this.stoppedOnCritical, customer };
  }

  /** Ends the session (if the engine has not), then scores it and writes the debrief (spec 12.3, 13.4). */
  async finish(): Promise<SessionResult> {
    if (!this.engine.ended) this.engine.stop("abandoned");
    const classified = (await Promise.all(this.pending)).flat();
    for (const v of classified) {
      if (!this.violations.some((d) => d.rule === v.rule && d.turnIndex === v.turnIndex)) this.violations.push(v);
    }
    // Once: finishing again after a failed try must not count the end-of-session checks twice.
    if (!this.finalized) this.violations.push(...finalizeSession(this.ctx, this.compliance));
    this.finalized = true;
    const outcome = this.engine.outcome();
    const run = (judge: Judge) =>
      scoreSession({
        library: this.options.library,
        scenario: this.scenario,
        transcript: this.transcript,
        violations: this.violations,
        engine: { endReason: outcome.endReason, exit: outcome.exit, hiddenRevealed: outcome.hiddenRevealed, nextStepSecured: outcome.nextStepSecured, winMet: outcome.winMet },
        judge,
        textMode: this.options.textMode,
        level: this.scenario.difficulty as 1 | 2 | 3,
      });
    let offline = this.offline;
    let score: ScoreResult;
    try {
      score = await run(this.options.ai?.judge ?? new FixtureJudge());
    } catch (error) {
      if (!this.options.ai?.judge) throw error;
      // The judge is down or timed out: the rep still gets the rules' and the engine's verdict, shown as partial
      // (never a pass, spec 13.4), instead of losing the session to an error.
      score = await run(new FixtureJudge());
      offline = true;
    }
    const debrief = buildDebrief({ library: this.options.library, scenario: this.scenario, score, transcript: this.transcript, endReason: outcome.endReason });
    return { sessionId: this.options.sessionId, scenarioCode: this.scenario.code, language: this.language, transcript: this.transcript, violations: this.violations, engine: outcome, score, debrief, offline };
  }
}
