import type { Dimension, Library, RubricItem, Scenario } from "@taptics/content";
import { failsHonesty, type Violation } from "@taptics/rules";
import { deterministicPass, resolveRubric } from "./deterministic.js";
import type { Judge } from "./judge.js";
import type { EngineFacts, ItemResult, JudgeResult, ScoreResult, ScoredTurn } from "./types.js";

export interface ScoreInput {
  library: Library;
  scenario: Scenario;
  transcript: ScoredTurn[];
  violations: Violation[];
  engine: EngineFacts | null;
  judge: Judge;
  textMode: boolean;
  level?: 1 | 2 | 3;
  lowConfidence?: number;
  /** The live judge was down and a fixture stood in: the score is partial and never a pass, however much the rules
   *  alone could measure, because the judge's honesty checks did not run (spec 13.4). */
  judgeUnavailable?: boolean;
}

const DIMENSIONS = ["composure", "discovery", "technique", "outcome"] as const;

/** Every item that runs for this scenario: its own table (spec 10.5) plus the rubric's items. */
export function scenarioItems(library: Library, scenario: Scenario): { items: RubricItem[]; scenarioCodes: Set<string>; weights: Record<(typeof DIMENSIONS)[number], number>; thresholds: { level_1: number; level_2: number; level_3: number } } {
  const { rubric, items } = resolveRubric(library, scenario.rubric);
  const own = scenario.scoring?.items ?? [];
  return {
    items: [...own, ...items.filter((i) => !own.some((o) => o.code === i.code))],
    scenarioCodes: new Set(own.map((i) => i.code)),
    weights: rubric.weights,
    thresholds: rubric.pass_threshold,
  };
}

function fromJudge(item: RubricItem, judge: JudgeResult, scenarioCodes: Set<string>, transcript: ScoredTurn[], lowConfidence: number): ItemResult {
  const base: ItemResult = { code: item.code, dimension: item.dimension, method: item.method, max: item.points, points: 0, status: "not_scored", evidence: null, explanation: item.behavior, technique: item.technique, scenarioItem: scenarioCodes.has(item.code) };
  const answer = judge.items[item.code];
  if (!answer) return base;
  if (!answer.applicable) return { ...base, status: "not_applicable", explanation: answer.explanation };
  const score = Math.max(0, Math.min(1, answer.score));
  const turn = answer.evidence ? transcript.find((t) => t.index === answer.evidence!.turnIndex) : undefined;
  // Low recognition confidence on the turn an item hinges on means "not scored", never "failed" (spec 13.4 item 4).
  if (score < 1 && turn?.asrConfidence !== undefined && turn.asrConfidence < lowConfidence) {
    return { ...base, status: "not_scored", evidence: answer.evidence, explanation: { en: "Not scored: the recording was unclear at this moment.", es: "Sin calificar: la grabación no se entendió bien en este momento." } };
  }
  return { ...base, status: "scored", points: score * item.points, evidence: answer.evidence, explanation: answer.explanation };
}

function ratio(items: ItemResult[]): number | null {
  const scored = items.filter((i) => i.status === "scored" && i.max > 0);
  const max = scored.reduce((s, i) => s + i.max, 0);
  return max === 0 ? null : (scored.reduce((s, i) => s + i.points, 0) / max) * 100;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** A total resting on less than this share of the possible points is partial and cannot pass (decision 0004). */
export const MIN_COVERAGE = 0.7;

function coverageOf(items: ItemResult[]): number {
  const applicable = items.filter((i) => i.status !== "not_applicable" && i.max > 0);
  const max = applicable.reduce((s, i) => s + i.max, 0);
  return max === 0 ? 0 : applicable.filter((i) => i.status === "scored").reduce((s, i) => s + i.max, 0) / max;
}

/**
 * Scores one session (spec 13.4): deterministic pass, judge pass, assembly with the honesty gate. The result is
 * stored immutably with the judge model and prompt version.
 */
export async function scoreSession(input: ScoreInput): Promise<ScoreResult> {
  const { library, scenario, transcript } = input;
  const lowConfidence = input.lowConfidence ?? 0.6;
  const { items, scenarioCodes, weights, thresholds } = scenarioItems(library, scenario);
  const deterministic = deterministicPass({
    scenario,
    items,
    scenarioItemCodes: scenarioCodes,
    transcript,
    violations: input.violations,
    engine: input.engine,
    rules: library.rules,
    lexicon: library.lexicon!,
    textMode: input.textMode,
    lowConfidence,
  });

  const needJudge = items.filter((i) => deterministic.get(i.code) == null && !(input.textMode && i.voice_only));
  const autoFail = scenario.scoring?.auto_fail ?? [];
  const persona = library.personas.get(scenario.persona);
  const judged =
    needJudge.length > 0 || autoFail.some((a) => a.method === "judge")
      ? await input.judge.evaluate({ scenario, hiddenTruth: persona?.hidden_truth[transcript[0]?.language ?? "en"] ?? "", transcript, items: needJudge, autoFail: autoFail.filter((a) => a.method === "judge"), sessionLanguage: transcript[0]?.language ?? "en" })
      : null;

  const results: ItemResult[] = items.map((item) => deterministic.get(item.code) ?? (judged ? fromJudge(item, judged, scenarioCodes, transcript, lowConfidence) : { code: item.code, dimension: item.dimension, method: item.method, max: item.points, points: 0, status: "not_scored" as const, evidence: null, explanation: item.behavior, technique: item.technique, scenarioItem: scenarioCodes.has(item.code) }));

  // Honesty gate: any confident critical violation, or a scenario auto-fail (spec 10.5, 13.1).
  const critical = input.violations.filter((v) => v.severity === "critical" && !v.uncertain);
  const reviewFlags = input.violations.filter((v) => v.uncertain);
  const familyOf = (code: string) => library.rules.get(code)?.family;
  const autoFails: ScoreResult["autoFails"] = [];
  const coaching: ScoreResult["coaching"] = [];
  for (const a of autoFail) {
    // Only dishonesty zeroes the attempt; a coaching move is named and costs nothing (decision 0034).
    const into = a.kind === "coaching" ? coaching : autoFails;
    if (a.method === "rule_family") {
      const hit = critical.find((v) => a.rule_families.includes(familyOf(v.rule) ?? ""));
      if (hit) into.push({ code: a.code, description: a.description, evidence: { turnIndex: hit.turnIndex ?? 0, quote: hit.span.text } });
    } else if (judged?.autoFail[a.code]?.hit) {
      into.push({ code: a.code, description: a.description, evidence: judged.autoFail[a.code]!.evidence });
    }
  }
  const honestyPassed = !failsHonesty(input.violations) && autoFails.length === 0;

  const dimensions = Object.fromEntries(DIMENSIONS.map((d) => [d, ratio(results.filter((r) => r.dimension === d))])) as Record<(typeof DIMENSIONS)[number], number | null>;
  let total: number;
  let aggregation: ScoreResult["aggregation"];
  if (scenario.scoring) {
    aggregation = "points";
    total = ratio(results.filter((r) => r.scenarioItem)) ?? 0;
  } else {
    aggregation = "dimension_weights";
    const present = DIMENSIONS.filter((d) => dimensions[d] !== null);
    const weightSum = present.reduce((s, d) => s + weights[d], 0);
    total = weightSum === 0 ? 0 : present.reduce((s, d) => s + (dimensions[d]! * weights[d]) / weightSum, 0);
  }
  // "0 for the attempt" (spec 10.5): a failed honesty gate fails everything, whatever else went well.
  if (!honestyPassed) total = 0;

  const coverage = coverageOf(scenario.scoring ? results.filter((r) => r.scenarioItem) : results);
  const partial = coverage < MIN_COVERAGE || input.judgeUnavailable === true;
  const level = input.level ?? scenario.difficulty as 1 | 2 | 3;
  const threshold = level === 1 ? thresholds.level_1 : level === 2 ? thresholds.level_2 : thresholds.level_3;
  return {
    rubric: scenario.rubric,
    total: round1(total),
    passed: honestyPassed && !partial && total >= threshold,
    honestyPassed,
    level,
    threshold,
    aggregation,
    coverage: round1(coverage * 100) / 100,
    partial,
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([k, v]) => [k, v === null ? null : round1(v)])) as ScoreResult["dimensions"],
    items: results,
    autoFails,
    coaching,
    criticalViolations: critical,
    reviewFlags,
    judgeModel: judged?.model ?? null,
    judgePromptVersion: judged?.promptVersion ?? null,
    turningPoint: judged?.turningPoint ?? null,
    textMode: input.textMode,
  };
}

export type { Dimension };
