import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { checkContentLine, type ClassifierInput, type ComplianceClassifier, type Violation } from "@taptics/rules";
import { detectFromCues, type RepTurnSignals, type UnlockDetector } from "@taptics/engine";
import type { Lexicon, Persona } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import type { Judge, JudgeInput, JudgeResult } from "@taptics/scoring";
import type { AiClient } from "./client.js";
import { loadPrompt, render } from "./prompts.js";

const json = (value: unknown) => JSON.stringify(value, null, 1);

// ---------------------------------------------------------------- compliance classifier (spec 4.3 layer two)

const ClassifierOutput = z.object({
  violations: z.array(
    z.object({
      rule: z.string(),
      quote: z.string(),
      true_fact_en: z.string(),
      true_fact_es: z.string(),
      explanation_en: z.string(),
      explanation_es: z.string(),
    }),
  ),
});

export class ClaudeComplianceClassifier implements ComplianceClassifier {
  readonly name = "claude";
  constructor(private readonly client: AiClient, private readonly tenantId: string, private readonly sessionId: string | null = null) {}

  async classify({ utterance, rules, ctx }: ClassifierInput): Promise<Violation[]> {
    const prompt = loadPrompt("classifier");
    const system = render(prompt, {
      speaker: utterance.speaker,
      channel: ctx.channel,
      offer_language: ctx.offerLanguage,
      rules: rules.map((r) => `- ${r.code} (${r.severity}): ${r.description.en}`).join("\n"),
      facts: ctx.facts ? json(ctx.facts) : "(no scenario: content line)",
    });
    const { parsed } = await this.client.parse<z.infer<typeof ClassifierOutput>>(
      "classifier",
      { system, messages: [{ role: "user", content: utterance.text }], output_config: { format: zodOutputFormat(ClassifierOutput) } },
      { tenantId: this.tenantId, sessionId: this.sessionId, promptVersion: prompt.ref },
    );
    if (!parsed) return [];
    const byCode = new Map(rules.map((r) => [r.code, r]));
    const lower = utterance.text.toLowerCase();
    return parsed.violations.flatMap((v) => {
      const rule = byCode.get(v.rule);
      if (!rule) return []; // the model may only report rules it was given
      const at = v.quote ? lower.indexOf(v.quote.toLowerCase()) : -1;
      const span = at >= 0 ? { start: at, end: at + v.quote.length, text: utterance.text.slice(at, at + v.quote.length) } : { start: 0, end: utterance.text.length, text: utterance.text };
      const technique = rule.compliant_technique ? ctx.techniques?.get(rule.compliant_technique) : undefined;
      return [
        {
          rule: rule.code,
          severity: rule.severity,
          layer: "classifier" as const,
          turnIndex: utterance.turnIndex,
          span,
          trueFact: { en: v.true_fact_en, es: v.true_fact_es },
          explanation: { en: v.explanation_en, es: v.explanation_es },
          compliantLine: technique?.model_line ?? null,
          uncertain: (utterance.lowConfidence ?? []).some((s) => span.start < s.end && span.end > s.start),
        },
      ];
    });
  }
}

// ---------------------------------------------------------------- unlock and trigger detection (spec 10.3 item 1)

const UnlockOutput = z.object({ unlocks: z.array(z.string()), triggers: z.array(z.string()) });

export class ClaudeUnlockDetector implements UnlockDetector {
  readonly name = "claude";
  constructor(private readonly client: AiClient, private readonly tenantId: string, private readonly sessionId: string | null = null) {}

  /** The model judges meaning; deterministic cues still count, and are the fallback if the model fails. */
  async detect(input: { text: string; language: Language; persona: Persona; lexicon: Lexicon; previousCustomerText?: string }): Promise<RepTurnSignals> {
    const cues = detectFromCues(input);
    if (!this.client.isEnabled("unlock")) return cues;
    const prompt = loadPrompt("unlock");
    const list = (items: Persona["unlock_conditions"]) => items.map((c) => `- ${c.code}: ${c.description.en}`).join("\n");
    try {
      const { parsed } = await this.client.parse<z.infer<typeof UnlockOutput>>(
        "unlock",
        {
          system: render(prompt, { previous: input.previousCustomerText ?? "(none)", unlocks: list(input.persona.unlock_conditions), triggers: list(input.persona.walk_out_triggers) }),
          messages: [{ role: "user", content: input.text }],
          output_config: { format: zodOutputFormat(UnlockOutput) },
        },
        { tenantId: this.tenantId, sessionId: this.sessionId, promptVersion: prompt.ref },
      );
      if (!parsed) return cues;
      const unlockCodes = new Set(input.persona.unlock_conditions.map((c) => c.code));
      const triggerCodes = new Set(input.persona.walk_out_triggers.map((c) => c.code));
      return {
        ...cues,
        unlocks: [...new Set([...cues.unlocks, ...parsed.unlocks.filter((c) => unlockCodes.has(c))])],
        triggers: [...new Set([...cues.triggers, ...parsed.triggers.filter((c) => triggerCodes.has(c))])],
      };
    } catch {
      return cues;
    }
  }
}

// ---------------------------------------------------------------- judge (spec 13.4 item 2)

const JudgeOutput = z.object({
  items: z.array(
    z.object({
      code: z.string(),
      applicable: z.boolean(),
      score: z.number(),
      evidence_turn: z.number().nullable(),
      evidence_quote: z.string().nullable(),
      explanation_en: z.string(),
      explanation_es: z.string(),
    }),
  ),
  auto_fail: z.array(
    z.object({ code: z.string(), hit: z.boolean(), evidence_turn: z.number().nullable(), evidence_quote: z.string().nullable(), explanation_en: z.string(), explanation_es: z.string() }),
  ),
  turning_point: z.object({ turn_index: z.number(), model_alternative_en: z.string(), model_alternative_es: z.string() }).nullable(),
});

export interface JudgeComplianceContext {
  lexicon: Lexicon;
  rules: import("@taptics/content").Rule[];
}

/** Version 2 tells the judge that honest persuasion is never marked down (decision 0034). */
const JUDGE_PROMPT = 2;

export class ClaudeJudge implements Judge {
  readonly model: string;
  readonly promptVersion: string;

  constructor(private readonly client: AiClient, private readonly tenantId: string, private readonly compliance: JudgeComplianceContext, private readonly sessionId: string | null = null) {
    this.model = client.models.judge.model;
    this.promptVersion = loadPrompt("judge", JUDGE_PROMPT).ref;
  }

  async evaluate(input: JudgeInput): Promise<JudgeResult> {
    const prompt = loadPrompt("judge", JUDGE_PROMPT);
    const system = render(prompt, {
      scenario: `${input.scenario.code}: ${input.scenario.title.en}. ${input.scenario.setting.en}`,
      facts: json(input.scenario.facts),
      hidden_truth: input.hiddenTruth,
      items: input.items.map((i) => `- ${i.code}: ${i.behavior.en}`).join("\n") || "(none)",
      auto_fail: input.autoFail.map((a) => `- ${a.code}${a.kind === "coaching" ? " (coaching)" : ""}: ${a.description.en}`).join("\n") || "(none)",
      transcript: input.transcript.map((t) => `${t.index}\t${t.speaker}\t${t.text}`).join("\n"),
    });
    const { parsed, message } = await this.client.parse<z.infer<typeof JudgeOutput>>(
      "judge",
      { system, messages: [{ role: "user", content: "Score this session." }], output_config: { effort: this.client.models.judge.effort ?? "high", format: zodOutputFormat(JudgeOutput) } },
      { tenantId: this.tenantId, sessionId: this.sessionId, promptVersion: prompt.ref },
    );
    if (!parsed) throw new Error(`judge returned no structured output (stop_reason ${message.stop_reason})`);
    const evidence = (turn: number | null, quote: string | null) => (turn === null ? null : { turnIndex: turn, quote: quote ?? "" });
    const wanted = new Set(input.items.map((i) => i.code));
    const result: JudgeResult = {
      items: Object.fromEntries(
        parsed.items
          .filter((i) => wanted.has(i.code))
          .map((i) => [i.code, { applicable: i.applicable, score: Math.max(0, Math.min(1, i.score)), evidence: evidence(i.evidence_turn, i.evidence_quote), explanation: { en: i.explanation_en, es: i.explanation_es } }]),
      ),
      autoFail: Object.fromEntries(parsed.auto_fail.map((a) => [a.code, { hit: a.hit, evidence: evidence(a.evidence_turn, a.evidence_quote), explanation: { en: a.explanation_en, es: a.explanation_es } }])),
      turningPoint: null,
      model: message.model,
      promptVersion: prompt.ref,
    };
    // Debrief text passes the same compliance check as a rep's speech (spec 1.2 item 2): a model alternative that
    // breaks a critical rule is dropped, never shown.
    const tp = parsed.turning_point;
    if (tp) {
      const line = { en: tp.model_alternative_en, es: tp.model_alternative_es };
      const violations = checkContentLine(line, { facts: input.scenario.facts, store: { addOnRemovalPolicy: "none_configured", ignoredIdentityPlaces: [] }, channel: input.scenario.channel, lexicon: this.compliance.lexicon, rules: this.compliance.rules }, "debrief");
      if (!violations.some((v) => v.severity === "critical")) result.turningPoint = { turnIndex: tp.turn_index, modelAlternative: line };
    }
    return result;
  }
}
