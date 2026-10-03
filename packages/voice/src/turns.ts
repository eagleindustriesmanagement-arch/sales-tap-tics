/**
 * Turn-taking for a hands-free conversation (spec 11.3), kept free of browser APIs so it is tested here and runs
 * the same with the device recognizer or a streaming provider.
 */

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * Is what the microphone heard just the customer's own voice coming back from the speaker? True when most of the
 * heard words are in what the customer is saying right now.
 */
export function isEcho(heard: string, customerSpeaking: string): boolean {
  const h = words(heard);
  if (h.length === 0) return true;
  const said = new Set(words(customerSpeaking));
  const inside = h.filter((w) => said.has(w)).length;
  return inside / h.length >= 0.6;
}

/** The rep talks over the customer: at least two words that are not the customer's own echo (spec 11.3 barge-in). */
export function isBargeIn(heard: string, customerSpeaking: string): boolean {
  return words(heard).length >= 2 && !isEcho(heard, customerSpeaking);
}

export interface EndOfTurnOptions {
  /** Silence after the last recognized words that ends the turn (spec 11.3: about 700 ms, tuned per language). */
  silenceMs: number;
  /** A turn this long ends even mid-sentence, so a monologue cannot stall the session. */
  maxTurnMs: number;
}

export const END_OF_TURN: Record<"en" | "es", EndOfTurnOptions> = {
  en: { silenceMs: 700, maxTurnMs: 90_000 },
  // Spanish speakers in the pilot may pause differently (spec 11.3); start slightly longer, tune with data.
  es: { silenceMs: 850, maxTurnMs: 90_000 },
};

/**
 * Tracks one rep turn from recognition events. `heard` is called on every interim or final result; `due` says
 * whether the turn has ended. The text is the final results joined, plus any trailing interim.
 */
export class TurnTracker {
  private finals: string[] = [];
  private interim = "";
  private startedAt: number | null = null;
  private lastHeardAt: number | null = null;
  confidence: number[] = [];

  constructor(private readonly options: EndOfTurnOptions) {}

  heard(text: string, isFinal: boolean, at: number, confidence?: number) {
    if (!text.trim()) return;
    this.startedAt ??= at;
    this.lastHeardAt = at;
    if (isFinal) {
      this.finals.push(text.trim());
      this.interim = "";
      if (confidence !== undefined && confidence > 0) this.confidence.push(confidence);
    } else {
      this.interim = text.trim();
    }
  }

  get text(): string {
    return [...this.finals, this.interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  get started(): boolean {
    return this.startedAt !== null;
  }

  /** When the first and the latest words were heard (the fallback for speech onset and offset). */
  get firstAt(): number | null {
    return this.startedAt;
  }

  get lastAt(): number | null {
    return this.lastHeardAt;
  }

  due(now: number): boolean {
    if (this.startedAt === null || this.lastHeardAt === null) return false;
    if (now - this.startedAt >= this.options.maxTurnMs) return true;
    return this.finals.length > 0 && !this.interim && now - this.lastHeardAt >= this.options.silenceMs;
  }

  /** Mean confidence of the final results, or undefined when the recognizer gave none. */
  meanConfidence(): number | undefined {
    return this.confidence.length ? this.confidence.reduce((a, b) => a + b, 0) / this.confidence.length : undefined;
  }
}

export interface VoiceTiming {
  pauseBeforeMs?: number;
  wordsPerMinute?: number;
  asrConfidence?: number;
  lowConfidence?: { start: number; end: number }[];
}

/**
 * Timing for scoring (spec 11.6), from the microphone's speech onset and offset. The pause is measured from the end
 * of the customer's audio; speaking rate needs at least 1.5 seconds of speech to mean anything.
 */
export function turnTiming(input: { text: string; customerEndedAt: number | null; speechStartedAt: number | null; speechEndedAt: number | null; confidence?: number }): VoiceTiming {
  const out: VoiceTiming = {};
  if (input.customerEndedAt !== null && input.speechStartedAt !== null && input.speechStartedAt >= input.customerEndedAt) {
    out.pauseBeforeMs = Math.round(input.speechStartedAt - input.customerEndedAt);
  }
  if (input.speechStartedAt !== null && input.speechEndedAt !== null) {
    const seconds = (input.speechEndedAt - input.speechStartedAt) / 1000;
    const n = words(input.text).length;
    if (seconds >= 1.5 && n > 0) out.wordsPerMinute = Math.round((n / seconds) * 60);
  }
  if (input.confidence !== undefined) {
    out.asrConfidence = Math.round(input.confidence * 1000) / 1000;
    out.lowConfidence = lowConfidenceNumbers(input.text, input.confidence);
  }
  return out;
}

/**
 * The device recognizer reports confidence per phrase, not per word. Below the threshold, every number in the turn
 * is marked uncertain, so the compliance engine flags it for review instead of failing it (spec 11.1 item 4).
 */
export const NUMBER_CONFIDENCE = 0.75;
export function lowConfidenceNumbers(text: string, confidence: number): { start: number; end: number }[] {
  if (confidence >= NUMBER_CONFIDENCE) return [];
  const spans: { start: number; end: number }[] = [];
  for (const m of text.matchAll(/\$?\d[\d,.]*/g)) spans.push({ start: m.index!, end: m.index! + m[0].length });
  return spans;
}
