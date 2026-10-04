"use client";

import { useEffect, useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { IconPlay, IconSpeaker } from "@/components/icons";
import { DeviceSpeechToText, DeviceTextToSpeech } from "@/lib/voice/device";
import { CLIENT_BUILD, platform, voiceDiagnostics } from "@/lib/voice/diagnostics";

/** A short beep as a WAV file made on the spot: it plays through the media channel, not the speech engine. */
function beepUrl(): string {
  const rate = 22050;
  const n = Math.floor(rate * 0.35);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) v.setInt16(44 + i * 2, Math.sin((2 * Math.PI * 660 * i) / rate) * 9000 * Math.min(1, (n - i) / 800), true);
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/**
 * The sound check (October 4): plays the customer's voice and a plain beep, and shows what the phone's speech engine
 * reported, so a real-phone test says why there is no sound instead of only that there is none.
 */
export function SoundCheck({ ui, testLanguage, voiceKey }: { ui: Language; testLanguage: Language; voiceKey: string }) {
  // The diagnostics change in place; each change redraws the panel.
  const [, tick] = useState(0);
  useEffect(() => {
    return voiceDiagnostics.subscribe(() => tick((n) => n + 1));
  }, []);
  const diag = voiceDiagnostics.state;
  const [tested, setTested] = useState(false);
  const [beeped, setBeeped] = useState<"ok" | "failed" | null>(null);
  const [copied, setCopied] = useState(false);
  const [env, setEnv] = useState<{ ios: boolean; standalone: boolean; synth: boolean; recognizer: boolean; voices: number; en: number; es: number } | null>(null);

  const readEnv = () => {
    const p = platform();
    const synth = DeviceTextToSpeech.supported();
    const voices = synth ? window.speechSynthesis.getVoices() : [];
    const w = window as unknown as Record<string, unknown>;
    setEnv({ ios: p.ios, standalone: p.standalone, synth, recognizer: !!(w.SpeechRecognition ?? w.webkitSpeechRecognition), voices: voices.length, en: voices.filter((x) => x.lang.toLowerCase().startsWith("en")).length, es: voices.filter((x) => x.lang.toLowerCase().startsWith("es")).length });
  };
  useEffect(() => {
    readEnv();
    if (!DeviceTextToSpeech.supported()) return;
    const synth = window.speechSynthesis as SpeechSynthesis & Partial<EventTarget>;
    synth.addEventListener?.("voiceschanged", readEnv);
    return () => synth.removeEventListener?.("voiceschanged", readEnv);
  }, []);

  const last = diag.speaks.at(-1) ?? null;
  const yes = (b: boolean) => t(b ? "sound.yes" : "sound.no", ui);
  const rows: [string, string][] = env
    ? [
        [t("sound.build", ui), CLIENT_BUILD.slice(0, 7)],
        [t("sound.device", ui), `${env.ios ? "iPhone/iPad" : t("sound.otherDevice", ui)}${env.standalone ? ` · ${t("sound.homeScreen", ui)}` : ""}`],
        [t("sound.engine", ui), yes(env.synth)],
        [t("sound.voices", ui), t("sound.voiceCount", ui, { total: env.voices, en: env.en, es: env.es })],
        [t("sound.unlocked", ui), yes(diag.unlockedAt !== null)],
        [t("sound.lastSpeak", ui), last ? last.events.map((e) => `${e.event}${e.detail ? `(${e.detail})` : ""} ${e.ms}ms`).join(" → ") : "—"],
        [t("sound.lastVoice", ui), last ? `${last.voice ?? t("sound.defaultVoice", ui)} · ${last.lang}` : "—"],
        [t("sound.queue", ui), last?.afterSpeak ? `speaking=${last.afterSpeak.speaking} pending=${last.afterSpeak.pending}` : "—"],
        [t("sound.listen", ui), DeviceSpeechToText.supported() ? t("sound.listenYes", ui) : env.ios ? t("sound.listenKeyboard", ui) : t("sound.listenNo", ui)],
        [t("sound.beep", ui), beeped ? t(beeped === "ok" ? "sound.beepOk" : "sound.beepFailed", ui) : "—"],
      ]
    : [];
  const report = () => [...rows.map(([k, v]) => `${k}: ${v}`), `UA: ${platform().userAgent}`].join("\n");

  return (
    <div className="space-y-2.5" data-testid="sound-check">
      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="test-sound" className="liquid-glass liquid-glass-flat inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold text-ink"
          onClick={() => {
            new DeviceTextToSpeech().replay(t("voice.testLine", testLanguage), { language: testLanguage, voiceKey });
            setTested(true);
            readEnv();
          }}>
          <IconPlay size={16} />{t("voice.testSound", ui)}
        </button>
        <button type="button" data-testid="test-beep" className="liquid-glass liquid-glass-flat inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold text-ink"
          onClick={() => {
            const a = new Audio(beepUrl());
            a.play().then(() => setBeeped("ok"), () => setBeeped("failed"));
          }}>
          <IconSpeaker size={16} />{t("sound.playBeep", ui)}
        </button>
      </div>
      {tested && <p className="px-1 text-[14px] text-muted" data-testid="sound-hint">{t("voice.soundHint", ui)}</p>}
      {(tested || beeped) && (
        <section className="liquid-glass-inset rounded-[1rem] px-3.5 py-2.5" data-testid="sound-details" aria-label={t("sound.details", ui)}>
          <h3 className="text-[14px] font-semibold text-ink">{t("sound.details", ui)}</h3>
          <dl className="mt-2 space-y-1 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="w-36 shrink-0 text-muted">{k}</dt><dd className="min-w-0 break-words text-ink" data-testid={`sound-${k}`}>{v}</dd></div>
            ))}
          </dl>
          <button type="button" className="mt-2 text-[14px] font-semibold text-brand underline" onClick={() => { void navigator.clipboard?.writeText(report()).then(() => setCopied(true), () => setCopied(false)); }}>
            {t(copied ? "sound.copied" : "sound.copy", ui)}
          </button>
        </section>
      )}
    </div>
  );
}
