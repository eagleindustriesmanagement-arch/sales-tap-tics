"use client";

/**
 * What the device's voice is actually doing, kept so a test on a real phone produces data instead of "it doesn't
 * work" (October 4: on Ernesto's iPhone a tap on "Test the sound" made no sound). Every speak records its voice and
 * what the engine reported back; the sound check shows it and can copy it.
 */

export type SpeakEvent = "queued" | "start" | "end" | "error" | "no-start" | "cancelled-stuck";

export interface SpeakRecord {
  at: number;
  text: string;
  voice: string | null;
  lang: string;
  events: { event: SpeakEvent; ms: number; detail?: string }[];
  /** speechSynthesis.speaking / pending right after speak(): a wedged engine shows pending with nothing speaking. */
  afterSpeak: { speaking: boolean; pending: boolean } | null;
}

interface State {
  unlockedAt: number | null;
  speaks: SpeakRecord[];
}

const state: State = { unlockedAt: null, speaks: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const voiceDiagnostics = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
  unlocked() {
    state.unlockedAt = Date.now();
    emit();
  },
  begin(text: string, voice: SpeechSynthesisVoice | undefined, lang: string): SpeakRecord {
    const r: SpeakRecord = { at: Date.now(), text: text.slice(0, 60), voice: voice ? `${voice.name} (${voice.lang}${voice.localService ? ", on device" : ", network"})` : null, lang, events: [{ event: "queued", ms: 0 }], afterSpeak: null };
    state.speaks = [...state.speaks.slice(-5), r];
    emit();
    return r;
  },
  event(r: SpeakRecord, event: SpeakEvent, detail?: string) {
    r.events.push({ event, ms: Date.now() - r.at, detail });
    emit();
  },
  afterSpeak(r: SpeakRecord) {
    try {
      r.afterSpeak = { speaking: window.speechSynthesis.speaking, pending: window.speechSynthesis.pending };
    } catch { /* no engine */ }
    emit();
  },
  get state(): Readonly<State> {
    return state;
  },
};

export interface Platform {
  ios: boolean;
  /** Opened from the Home Screen: iOS limits speech there more than in Safari. */
  standalone: boolean;
  userAgent: string;
}

export function platform(): Platform {
  if (typeof navigator === "undefined") return { ios: false, standalone: false, userAgent: "" };
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone = (typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches) || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return { ios, standalone, userAgent: ua };
}

/** The build this screen is running: compared with the server's to catch a phone still on yesterday's code. */
export const CLIENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
