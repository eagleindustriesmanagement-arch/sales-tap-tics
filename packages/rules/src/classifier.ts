import type { Rule } from "@taptics/content";
import { checkUtterance, sortViolations } from "./engine.js";
import type { CheckContext, SessionComplianceState, Utterance, Violation } from "./types.js";

/**
 * Layer two of the rule engine (spec 4.3 item 2): a language-model classifier for meaning the patterns miss
 * ("implying an add-on is required without the word required"). Fixed prompt, temperature 0, structured JSON.
 * The Claude implementation lives in `@taptics/ai`; this package only defines the contract.
 */
export interface ClassifierInput {
  utterance: Utterance;
  /** Only rules marked `classifier: true` that apply to this speaker and channel. */
  rules: Rule[];
  ctx: CheckContext;
}

export interface ComplianceClassifier {
  readonly name: string;
  classify(input: ClassifierInput): Promise<Violation[]>;
}

/** Used when no model is configured (tests, offline). It finds nothing, so only layer one applies. */
export class NullClassifier implements ComplianceClassifier {
  readonly name = "null";
  async classify(): Promise<Violation[]> {
    return [];
  }
}

export interface FullCheckOptions {
  state?: SessionComplianceState;
  /** Give up on the classifier after this long; layer one results still stand (spec 5.2 item 4). */
  classifierTimeoutMs?: number;
  onClassifierError?: (error: unknown) => void;
}

/** Both layers. Deterministic results win where both layers flag the same rule on overlapping words. */
export async function checkUtteranceFull(
  utterance: Utterance,
  ctx: CheckContext,
  classifier: ComplianceClassifier,
  options: FullCheckOptions = {},
): Promise<Violation[]> {
  const deterministic = checkUtterance(utterance, ctx, options.state);
  const rules = ctx.rules.filter(
    (r) => r.enabled && r.classifier && r.applies_to.includes(utterance.speaker) && r.channels.includes(ctx.channel) && r.industries.includes(ctx.industry ?? "cars"),
  );
  if (rules.length === 0) return deterministic;
  let classified: Violation[] = [];
  try {
    const timeout = options.classifierTimeoutMs ?? 4000;
    classified = await Promise.race([
      classifier.classify({ utterance, rules, ctx }),
      new Promise<Violation[]>((_, reject) => setTimeout(() => reject(new Error("classifier timeout")), timeout)),
    ]);
  } catch (error) {
    options.onClassifierError?.(error);
  }
  const merged = [...deterministic];
  for (const v of classified) {
    const duplicate = merged.some(
      (d) => d.rule === v.rule && (v.span.end === 0 || (v.span.start < d.span.end && v.span.end > d.span.start)),
    );
    if (!duplicate) merged.push({ ...v, layer: "classifier" });
  }
  return sortViolations(merged);
}
