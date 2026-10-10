import type { AutoFail, RubricItem, Scenario } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import type { JudgeResult, ScoredTurn } from "./types.js";

/**
 * The judge pass (spec 13.4 item 2): the strongest Claude model, fixed prompt, structured output.
 * Scores intent, not wording (item 3). The Claude implementation lives in `@taptics/ai`.
 */
export interface JudgeInput {
  scenario: Scenario;
  /** The persona's hidden truth, so the judge can recognize when it surfaced. Never shown to the rep. */
  hiddenTruth: string;
  transcript: ScoredTurn[];
  items: RubricItem[];
  autoFail: AutoFail[];
  sessionLanguage: Language;
}

export interface Judge {
  readonly model: string;
  readonly promptVersion: string;
  evaluate(input: JudgeInput): Promise<JudgeResult>;
}

/** A judge that returns fixed answers: for tests and for replaying stored judge output. */
export class FixtureJudge implements Judge {
  readonly model = "fixture";
  readonly promptVersion = "fixture";
  constructor(private readonly answers: Partial<JudgeResult> = {}) {}
  async evaluate(): Promise<JudgeResult> {
    return { items: {}, autoFail: {}, turningPoint: null, model: this.model, promptVersion: this.promptVersion, ...this.answers };
  }
}
