import type { DebriefPayload } from "@/components/debrief";
import { conceptFor, itemBehavior } from "@/lib/server";

interface Source {
  /** For naming each behavior's lesson concept (decision 0031). */
  scenarioCode?: string;
  language: "en" | "es";
  offline: boolean;
  endReason: string | null;
  nextStepSecured: boolean;
  score: { total: number; passed: boolean; partial?: boolean; coverage?: number; threshold?: number; honestyPassed: boolean; items: { code: string; points: number; max: number; status: string; explanation: { en: string; es: string }; evidence?: { turnIndex: number; quote: string } | null }[] };
  debrief: DebriefPayload["debrief"];
  transcript: { index: number; speaker: "rep" | "customer"; text: string }[];
}

/** One shape for the debrief, whether it comes from a live session or from the database. */
export function debriefPayload(r: Source): DebriefPayload {
  return {
    language: r.language,
    offline: r.offline,
    endReason: r.endReason,
    nextStepSecured: r.nextStepSecured,
    score: {
      total: r.score.total,
      passed: r.score.passed,
      partial: r.score.partial ?? false,
      coverage: r.score.coverage ?? 1,
      threshold: r.score.threshold ?? r.debrief.score?.threshold ?? 70,
      honestyPassed: r.score.honestyPassed,
      // The behavior's own name labels the row; the explanation (evidence, or why it was not scored) goes under it.
      items: r.score.items.map((i) => ({ code: i.code, points: i.points, max: i.max, status: i.status, explanation: i.explanation, behavior: itemBehavior(i.code) ?? i.explanation, quote: i.evidence?.quote || null, concept: r.scenarioCode ? conceptFor(r.scenarioCode, i.code) : null })),
    },
    debrief: r.debrief,
    transcript: r.transcript.map((t) => ({ index: t.index, speaker: t.speaker, text: t.text })),
  };
}
