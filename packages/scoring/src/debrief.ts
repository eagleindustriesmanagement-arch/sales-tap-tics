import type { BilingualText, EvidenceGrade, Library, Scenario } from "@taptics/content";
import { compile } from "@taptics/rules";
import type { ItemResult, JudgeResult, ScoreResult, ScoredTurn } from "./types.js";

/** Evidence-grade weights: stronger evidence makes a weak item more worth fixing first (spec 12.4 item 1). */
export const GRADE_WEIGHT: Record<EvidenceGrade, number> = { A: 1, B: 0.85, C: 0.7, D: 0.55 };

export interface Debrief {
  /** Shown first, above the score (spec 12.3). */
  critical: { rule: string; quote: string; trueFact: BilingualText; compliantLine: BilingualText | null; explanation: BilingualText }[];
  autoFails: { code: string; description: BilingualText; quote: string | null }[];
  /** Moves that cost the customer but deceive no one: shown as a note, no points lost (decision 0034). */
  coaching: { code: string; description: BilingualText; quote: string | null }[];
  score: { total: number; passed: boolean; threshold: number };
  endReason: string | null;
  worked: { code: string; behavior: BilingualText; quote: string | null; explanation: BilingualText; concept?: BilingualText | null }[];
  /** The one change that matters most, with its why. Never absent: a score is never shown alone (spec 13.5). */
  change: { code: string; behavior: BilingualText; why: BilingualText; technique: string | null; stretch: boolean; concept?: { name: BilingualText; idea: BilingualText } | null };
  turningPoint: { turnIndex: number; repLine: string; modelAlternative: BilingualText } | null;
  /** Revealed only after the session (spec 18.4 rule 1). */
  hiddenTruth: BilingualText | null;
  /**
   * Whether the customer actually said it in this conversation, read from the transcript (the persona's own
   * hidden-truth markers): the first customer line that gave it away, or null when it never came out.
   */
  hiddenTruthSaid: { turnIndex: number; quote: string } | null;
  notScored: string[];
  reviewFlags: number;
}

/** The first customer line matching a hidden-truth marker, in either language. */
export function firstSaid(transcript: ScoredTurn[], markers: { en: string[]; es: string[] }): { turnIndex: number; quote: string } | null {
  const patterns = [...markers.en, ...markers.es].map((m) => compile(m));
  if (patterns.length === 0) return null;
  const turn = transcript.find((t) => t.speaker === "customer" && patterns.some((p) => p.test(t.text)));
  return turn ? { turnIndex: turn.index, quote: turn.text } : null;
}

function gradeOf(library: Library, technique: string | undefined): EvidenceGrade {
  return (technique && library.techniques.get(technique)?.evidence.grade) || "D";
}

/** Lowest-scoring item, weighted toward stronger evidence; scenario items first, then universal ones. */
export function weakestItem(library: Library, items: ItemResult[]): ItemResult | null {
  const scored = items.filter((i) => i.status === "scored" && i.max > 0 && i.points < i.max);
  if (scored.length === 0) return null;
  const priority = (i: ItemResult) => (1 - i.points / i.max) * GRADE_WEIGHT[gradeOf(library, i.technique)] + (i.scenarioItem ? 1 : 0);
  return scored.reduce((a, b) => (priority(b) > priority(a) ? b : a));
}

export function buildDebrief(input: { library: Library; scenario: Scenario; score: ScoreResult; transcript: ScoredTurn[]; judge?: JudgeResult | null; endReason: string | null }): Debrief {
  const { library, scenario, score, transcript } = input;
  const behavior = (code: string) =>
    scenario.scoring?.items.find((i) => i.code === code)?.behavior ??
    [...library.rubrics.values()].flatMap((r) => r.items).find((i) => i.code === code)?.behavior ?? { en: code, es: code };

  // The scenario's lesson names the move behind each scored behavior, so feedback can point back to it (decision 0031).
  const lesson = [...(library.lessons?.values() ?? [])].find((l) => l.scenario === scenario.code);
  const concept = (code: string) => {
    const c = lesson?.concepts.find((x) => x.items.includes(code));
    return c ? { name: c.name, idea: c.idea } : null;
  };

  const worked = score.items
    .filter((i) => i.status === "scored" && i.max > 0 && i.points >= i.max)
    .sort((a, b) => Number(b.scenarioItem) - Number(a.scenarioItem) || Number(Boolean(b.evidence)) - Number(Boolean(a.evidence)) || b.max - a.max)
    .slice(0, 2)
    .map((i) => ({ code: i.code, behavior: behavior(i.code), quote: i.evidence?.quote ?? null, explanation: i.explanation, concept: concept(i.code)?.name ?? null }));

  const weak = weakestItem(library, score.items);
  let change: Debrief["change"];
  if (weak) {
    const t = weak.technique ? library.techniques.get(weak.technique) : undefined;
    change = { code: weak.code, behavior: behavior(weak.code), why: t?.why ?? weak.explanation, technique: t?.code ?? null, stretch: false, concept: concept(weak.code) };
  } else {
    // Everything scored landed: point to the next target technique instead of showing a bare score.
    const next = scenario.target_techniques.map((c) => library.techniques.get(c)).find((t) => t?.why);
    change = {
      code: next?.code ?? "stretch",
      behavior: next?.name ?? { en: "Try the level 2 version of this customer.", es: "Pruebe la versión de nivel 2 de este cliente." },
      why: next?.why ?? { en: "The next level hides the concern deeper.", es: "El siguiente nivel esconde más la preocupación." },
      technique: next?.code ?? null,
      stretch: true,
    };
  }

  let turningPoint: Debrief["turningPoint"] = null;
  const tp = input.judge?.turningPoint;
  if (tp) {
    const turn = transcript.find((t) => t.index === tp.turnIndex);
    if (turn) turningPoint = { turnIndex: tp.turnIndex, repLine: turn.text, modelAlternative: tp.modelAlternative };
  } else if (weak?.evidence && change.technique) {
    const t = library.techniques.get(change.technique)!;
    if (t.model_line_kind === "spoken") turningPoint = { turnIndex: weak.evidence.turnIndex, repLine: weak.evidence.quote, modelAlternative: t.model_line };
  }

  const persona = library.personas.get(scenario.persona);
  return {
    critical: score.criticalViolations.map((v) => ({ rule: v.rule, quote: v.span.text, trueFact: v.trueFact, compliantLine: v.compliantLine, explanation: v.explanation })),
    autoFails: score.autoFails.map((a) => ({ code: a.code, description: a.description, quote: a.evidence?.quote ?? null })),
    coaching: score.coaching.map((a) => ({ code: a.code, description: a.description, quote: a.evidence?.quote ?? null })),
    score: { total: score.total, passed: score.passed, threshold: score.threshold },
    endReason: input.endReason,
    worked,
    change,
    turningPoint,
    hiddenTruth: persona?.hidden_truth ?? null,
    hiddenTruthSaid: persona ? firstSaid(transcript, persona.hidden_truth_markers) : null,
    notScored: score.items.filter((i) => i.status === "not_scored").map((i) => i.code),
    reviewFlags: score.reviewFlags.length,
  };
}
