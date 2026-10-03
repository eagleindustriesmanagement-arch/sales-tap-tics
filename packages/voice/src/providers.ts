/**
 * Speech provider contracts (spec 5.4: a `SpeechToText` and a `TextToSpeech` interface with more than one
 * implementation, so the provider can change without touching session logic). Release 1 ships the device tier,
 * which costs nothing per minute; a streaming cloud tier plugs in behind the same contracts (decision 0013).
 */

export type Tier = "device" | "cloud";

export interface RecognitionEvent {
  text: string;
  isFinal: boolean;
  /** 0 to 1 when the provider reports it. */
  confidence?: number;
  at: number;
}

export interface SpeechToText {
  readonly tier: Tier;
  /** Starts listening in a language ("en" or "es"); events arrive until stop(). */
  start(language: "en" | "es", onEvent: (e: RecognitionEvent) => void, onError: (reason: SpeechError) => void): void;
  stop(): void;
}

export interface SpeakOptions {
  language: "en" | "es";
  /** A stable key (the persona) so one customer keeps one voice. */
  voiceKey: string;
}

export interface TextToSpeech {
  readonly tier: Tier;
  /** Speaks one sentence; resolves when it has finished or was cancelled. Sentences queue in order. */
  speak(sentence: string, options: SpeakOptions): Promise<void>;
  /** Stops at once (barge-in: within 200 ms, spec 11.3) and drops anything queued. */
  cancel(): void;
  readonly speaking: boolean;
}

export type SpeechError = "not-allowed" | "no-microphone" | "unsupported" | "network" | "other";
