import type { BilingualText, Dimension, RubricItem } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import type { Violation } from "@taptics/rules";

/** One transcript turn as stored in `turns` (spec 6.3). Timing fields are absent in text mode. */
export interface ScoredTurn {
  index: number;
  speaker: "rep" | "customer";
  text: string;
  language: Language;
  startedMs?: number;
  endedMs?: number;
  /** Gap between the customer's last word and the rep's first word (spec 11.6). */
  pauseBeforeMs?: number;
  wordsPerMinute?: number;
  asrConfidence?: number;
  /** The customer raised an objection in this turn (the engine marks the stated objection). */
  isObjection?: boolean;
  /** The customer's line with its bracket cues, kept so a session can be rebuilt turn for turn. */
  raw?: string;
}

export type ItemStatus = "scored" | "not_applicable" | "not_scored" | "excluded_text_mode";

export interface Evidence {
  turnIndex: number;
  quote: string;
}

export interface ItemResult {
  code: string;
  dimension: Dimension;
  method: RubricItem["method"];
  max: number;
  points: number;
  status: ItemStatus;
  evidence: Evidence | null;
  explanation: BilingualText;
  technique?: string;
  /** Set by the scenario table (spec 10.5); these define the total when present. */
  scenarioItem: boolean;
}

/** What the judge returns for one item (spec 13.4 item 2). */
export interface JudgeItem {
  applicable: boolean;
  /** 0 to 1 share of the item's points. */
  score: number;
  evidence: Evidence | null;
  explanation: BilingualText;
}

export interface JudgeResult {
  items: Record<string, JudgeItem>;
  autoFail: Record<string, { hit: boolean; evidence: Evidence | null; explanation: BilingualText }>;
  /** The 10 to 20 seconds where the conversation turned, with a model alternative (spec 12.3 item 4). */
  turningPoint: { turnIndex: number; modelAlternative: BilingualText } | null;
  model: string;
  promptVersion: string;
}

export interface EngineFacts {
  endReason: string | null;
  exit: "walk_away" | "not_now" | null;
  hiddenRevealed: boolean;
  nextStepSecured: boolean;
  winMet: boolean;
}

export interface ScoreResult {
  rubric: string;
  total: number;
  passed: boolean;
  honestyPassed: boolean;
  level: 1 | 2 | 3;
  threshold: number;
  aggregation: "points" | "dimension_weights";
  /** Share of the possible points that could be scored (0 to 1). Below MIN_COVERAGE the score is partial. */
  coverage: number;
  /** Too little was scorable (offline judge, text mode, unclear audio): shown as partial, never a pass. */
  partial: boolean;
  dimensions: Record<Exclude<Dimension, "honesty">, number | null>;
  items: ItemResult[];
  autoFails: { code: string; description: BilingualText; evidence: Evidence | null }[];
  /** Scenario moves that cost the customer but deceive no one: named in the debrief, no points lost. */
  coaching: { code: string; description: BilingualText; evidence: Evidence | null }[];
  criticalViolations: Violation[];
  reviewFlags: Violation[];
  /** Judged honesty failures at a moment the recording was unclear: flagged for review, never a zero (absent on
   *  scores stored before October 5). */
  uncertainAutoFails?: { code: string; description: BilingualText; evidence: Evidence | null }[];
  judgeModel: string | null;
  judgePromptVersion: string | null;
  textMode: boolean;
  /** The judge's pick for "the turning point" (a turn index and a better line); the debrief grounds it in the
   *  transcript and shows it only when that turn is the rep's. Absent on scores stored before October 5. */
  turningPoint?: JudgeResult["turningPoint"];
}
