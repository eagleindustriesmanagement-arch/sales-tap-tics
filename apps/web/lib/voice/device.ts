"use client";

import type { RecognitionEvent, SpeakOptions, SpeechError, SpeechToText, TextToSpeech } from "@taptics/voice";

/**
 * The device tier (decision 0013): the phone's or browser's own recognizer and voices. No per-minute cost and no
 * audio leaves the app for a speech vendor. One language per session; mixed Spanish and English needs the cloud tier.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
};

const RecognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const LOCALE = { en: "en-US", es: "es-US" } as const;

export class DeviceSpeechToText implements SpeechToText {
  readonly tier = "device" as const;
  private rec: Recognition | null = null;
  private active = false;
  private restarts = 0;
  /** Speech onset and offset as the recognizer hears them: the pause and rate come from these. */
  onSpeechStart: ((at: number) => void) | null = null;
  onSpeechEnd: ((at: number) => void) | null = null;

  static supported(): boolean {
    return RecognitionCtor() !== null;
  }

  start(language: "en" | "es", onEvent: (e: RecognitionEvent) => void, onError: (reason: SpeechError) => void): void {
    const Ctor = RecognitionCtor();
    if (!Ctor) return onError("unsupported");
    this.stop();
    const rec = new Ctor();
    rec.lang = LOCALE[language];
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i]!;
        const best = r[0];
        if (best) onEvent({ text: best.transcript, isFinal: r.isFinal, confidence: best.confidence || undefined, at: performance.now() });
      }
    };
    rec.onspeechstart = () => this.onSpeechStart?.(performance.now());
    rec.onspeechend = () => this.onSpeechEnd?.(performance.now());
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return; // silence is normal; onend restarts
      const reason: SpeechError = e.error === "not-allowed" || e.error === "service-not-allowed" ? "not-allowed" : e.error === "audio-capture" ? "no-microphone" : e.error === "network" ? "network" : "other";
      this.active = false;
      onError(reason);
    };
    // Browsers end continuous recognition after a silence or a minute; keep listening while the session wants it.
    rec.onend = () => {
      if (!this.active) return;
      if ((this.restarts += 1) > 200) return onError("other");
      try { rec.start(); } catch { /* already started */ }
    };
    this.rec = rec;
    this.active = true;
    this.restarts = 0;
    try { rec.start(); } catch { onError("other"); }
  }

  stop(): void {
    this.active = false;
    if (this.rec) {
      this.rec.onend = null;
      try { this.rec.abort(); } catch { /* not started */ }
    }
    this.rec = null;
  }
}

/** Voices that sound like a person, in the order a Miami store would pick them (spec 5.4, 11.4). */
const QUALITY = /premium|enhanced|neural|natural|google|siri/i;
const SPANISH_ORDER = ["es-US", "es-MX", "es-419", "es-CO", "es-VE", "es-PR", "es-CU", "es-DO", "es-AR", "es-CL"];

export function rankVoices(voices: SpeechSynthesisVoice[], language: "en" | "es"): SpeechSynthesisVoice[] {
  const tag = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-");
  const pool = voices.filter((v) => tag(v).toLowerCase().startsWith(language));
  const regionRank = (v: SpeechSynthesisVoice) => {
    if (language === "en") return tag(v) === "en-US" ? 0 : 1;
    const i = SPANISH_ORDER.indexOf(tag(v));
    return i >= 0 ? i : tag(v) === "es-ES" ? 99 : 50; // Castilian last (spec 5.4)
  };
  return [...pool].sort((a, b) => regionRank(a) - regionRank(b) || Number(QUALITY.test(b.name)) - Number(QUALITY.test(a.name)) || Number(b.localService) - Number(a.localService));
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export class DeviceTextToSpeech implements TextToSpeech {
  readonly tier = "device" as const;
  private queue: Promise<void> = Promise.resolve();
  private current = 0;
  private generation = 0;
  /**
   * Utterances being spoken. Browsers drop the end event of an utterance nothing references any more (Safari and
   * Chrome both do), and the conversation would wait forever on a sentence that already finished.
   */
  private readonly live = new Set<SpeechSynthesisUtterance>();
  /** When the last sentence finished playing: the start of the rep's pause. */
  lastEndedAt: number | null = null;
  /** Called when a sentence never starts: the device is blocking speech until the rep taps (iPhone). */
  onBlocked: ((sentence: string) => void) | null = null;

  static supported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
  }

  /**
   * Must run inside a tap: iPhone speaks only after the page has spoken during a user gesture. A silent utterance does
   * it without a sound; resume() clears the paused state Safari sometimes leaves behind.
   */
  static unlock(): void {
    if (!DeviceTextToSpeech.supported()) return;
    try {
      window.speechSynthesis.resume?.();
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    } catch { /* nothing to unlock */ }
  }

  /** The device's voices load after the page does; wait for them briefly so the first line gets the right voice. */
  static voicesReady(timeoutMs = 1500): Promise<void> {
    if (!DeviceTextToSpeech.supported() || window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
    return new Promise((resolve) => {
      const synth = window.speechSynthesis as SpeechSynthesis & Partial<EventTarget>;
      const done = () => { synth.removeEventListener?.("voiceschanged", done); resolve(); };
      synth.addEventListener?.("voiceschanged", done);
      setTimeout(done, timeoutMs);
    });
  }

  get speaking(): boolean {
    return this.current > 0;
  }

  private voiceFor(options: SpeakOptions): SpeechSynthesisVoice | undefined {
    const ranked = rankVoices(window.speechSynthesis.getVoices(), options.language);
    // The best region and quality tier, then one voice per customer within it, so a persona keeps its voice.
    const top = ranked.filter((v) => v.lang === ranked[0]?.lang && QUALITY.test(v.name) === QUALITY.test(ranked[0]?.name ?? ""));
    return top.length ? top[hash(options.voiceKey) % top.length] : ranked[0];
  }

  speak(sentence: string, options: SpeakOptions): Promise<void> {
    const generation = this.generation;
    this.current += 1;
    const run = () =>
      DeviceTextToSpeech.voicesReady().then(() => new Promise<void>((resolve) => {
        if (generation !== this.generation) return resolve();
        const u = new SpeechSynthesisUtterance(sentence);
        u.lang = LOCALE[options.language];
        const voice = this.voiceFor(options);
        if (voice) u.voice = voice;
        // A small, stable difference per customer, so two personas on one voice still sound like two people.
        u.pitch = 0.95 + (hash(options.voiceKey) % 11) / 100;
        u.rate = 1;
        let started = false;
        let finished = false;
        // Generous upper bound on how long the sentence can take: if no end event arrives, move on anyway.
        const words = sentence.split(/\s+/).length;
        const limit = setTimeout(() => done(), 4000 + words * 600);
        // Nothing heard after a few seconds: speech is blocked until the rep taps.
        const blocked = setTimeout(() => { if (!started && !finished) this.onBlocked?.(sentence); }, 3000);
        const done = () => {
          if (finished) return;
          finished = true;
          clearTimeout(limit);
          clearTimeout(blocked);
          this.live.delete(u);
          resolve();
        };
        u.onstart = () => { started = true; };
        u.onend = done;
        u.onerror = done;
        this.live.add(u);
        try {
          window.speechSynthesis.resume?.();
          window.speechSynthesis.speak(u);
        } catch {
          done();
        }
      }));
    const p = this.queue.then(run).finally(() => {
      this.current = Math.max(0, this.current - 1);
      if (generation === this.generation) this.lastEndedAt = performance.now();
    });
    this.queue = p;
    return p;
  }

  /** Says one sentence now, from a tap (iPhone allows speech after a gesture), outside the queue's timing. */
  replay(sentence: string, options: SpeakOptions): void {
    DeviceTextToSpeech.unlock();
    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = LOCALE[options.language];
    const voice = this.voiceFor(options);
    if (voice) u.voice = voice;
    this.live.add(u);
    u.onend = u.onerror = () => this.live.delete(u);
    window.speechSynthesis.speak(u);
  }

  cancel(): void {
    this.generation += 1;
    this.current = 0;
    window.speechSynthesis.cancel();
    this.live.clear();
    this.queue = Promise.resolve();
    this.lastEndedAt = performance.now();
  }
}
