"use client";

import { BottomBar } from "@/components/bottom-bar";
import { useEffect, useRef, useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { END_OF_TURN, isBargeIn, isEcho, speakable, TurnTracker, turnTiming, type SpeechError, type VoiceTiming } from "@taptics/voice";
import { IconAlert, IconMessage } from "@/components/icons";
import { Avatar, buttonClass } from "@/components/ui";
import { DeviceSpeechToText, DeviceTextToSpeech } from "@/lib/voice/device";
import { MicMeter } from "@/lib/voice/mic";

type Phase = "customer" | "listening" | "thinking" | "done";
export type SendTurn = (text: string, timing: VoiceTiming, onSentence: (sentence: string) => void) => Promise<{ ended: boolean } | null>;

/** iOS plays through the quiet earpiece while the microphone is open, so it listens only on the rep's turn. */
const halfDuplex = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * The hands-free conversation (spec 11.3, 12.2 item 2): the customer speaks each sentence as it arrives, the turn
 * ends when the rep pauses, the rep can talk over the customer or tap to interrupt. No live transcript by default,
 * because reading interrupts listening; "Show words" is there for accessibility.
 */
export function VoiceStage({ name, language: lang, voiceKey, opening, lines, ended, sendTurn, onFinish, onTypeInstead }: {
  name: string;
  language: Language;
  voiceKey: string;
  opening: string;
  lines: { speaker: "rep" | "customer"; text: string }[];
  ended: { stopped: boolean } | null;
  sendTurn: SendTurn;
  onFinish: () => void;
  onTypeInstead: () => void;
}) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [phase, setPhase] = useState<Phase>("customer");
  const [error, setError] = useState<SpeechError | null>(null);
  const [noisy, setNoisy] = useState(false);
  const [showWords, setShowWords] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // The phone blocked the customer's voice: the sentence waits for a tap to be heard.
  const [blocked, setBlocked] = useState<string | null>(null);
  const bars = useRef<HTMLDivElement>(null);

  const phaseRef = useRef<Phase>("customer");
  const stt = useRef<DeviceSpeechToText | null>(null);
  const tts = useRef<DeviceTextToSpeech | null>(null);
  const tracker = useRef(new TurnTracker(END_OF_TURN[lang]));
  const customerText = useRef("");
  const onset = useRef<number | null>(null);
  const offset = useRef<number | null>(null);
  const interrupted = useRef(false);
  const speaking = useRef<Promise<void>>(Promise.resolve());
  const endedRef = useRef(false);

  const set = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  function listen() {
    if (endedRef.current) return set("done");
    tracker.current = new TurnTracker(END_OF_TURN[lang]);
    onset.current = null;
    offset.current = null;
    set("listening");
    if (halfDuplex()) stt.current?.start(lang, onEvent, onError);
  }

  function speak(sentence: string) {
    if (phaseRef.current !== "customer") {
      customerText.current = "";
      set("customer");
      if (halfDuplex()) stt.current?.stop();
    }
    customerText.current = `${customerText.current} ${sentence}`.trim();
    speaking.current = tts.current!.speak(speakable(sentence, lang), { language: lang, voiceKey });
    return speaking.current;
  }

  function interrupt() {
    if (phaseRef.current !== "customer") return;
    interrupted.current = true;
    tts.current?.cancel();
    listen();
  }

  function onEvent(e: { text: string; isFinal: boolean; confidence?: number; at: number }) {
    const p = phaseRef.current;
    if (p === "customer") {
      // Talking over the customer stops them (barge-in); their own voice coming back through the speaker does not.
      if (!isBargeIn(e.text, customerText.current)) return;
      interrupt();
      onset.current = e.at;
    } else if (p !== "listening") {
      return;
    }
    if (!tracker.current.started && isEcho(e.text, customerText.current)) return;
    tracker.current.heard(e.text, e.isFinal, e.at, e.confidence);
  }

  function onError(reason: SpeechError) {
    setError(reason);
  }

  async function submit() {
    const tr = tracker.current;
    const text = tr.text;
    if (!text) return;
    const timing = turnTiming({
      text,
      customerEndedAt: interrupted.current ? null : tts.current?.lastEndedAt ?? null,
      speechStartedAt: onset.current ?? tr.firstAt,
      speechEndedAt: offset.current ?? tr.lastAt,
      confidence: tr.meanConfidence(),
    });
    interrupted.current = false;
    set("thinking");
    const outcome = await sendTurn(text, timing, (sentence) => void speak(sentence));
    await speaking.current;
    if (outcome?.ended) endedRef.current = true;
    listen();
  }

  useEffect(() => {
    stt.current = new DeviceSpeechToText();
    tts.current = new DeviceTextToSpeech();
    tts.current.onBlocked = (sentence) => setBlocked(sentence);
    stt.current.onSpeechStart = (at) => { if (phaseRef.current === "listening" && onset.current === null) onset.current = at; };
    stt.current.onSpeechEnd = (at) => { if (phaseRef.current === "listening") offset.current = at; };
    if (!halfDuplex()) stt.current.start(lang, onEvent, onError);
    const meter = new MicMeter();
    if (MicMeter.worthTrying()) {
      void meter.start((level, isNoisy) => {
        bars.current?.style.setProperty("--lvl", phaseRef.current === "listening" ? level.toFixed(3) : "0");
        setNoisy((was) => (was === isNoisy ? was : isNoisy));
      });
    }
    void speak(opening).then(() => { if (phaseRef.current === "customer") listen(); });
    const clock = setInterval(() => setElapsed((s) => s + 1), 1000);
    const turns = setInterval(() => {
      if (phaseRef.current === "listening" && tracker.current.due(performance.now())) void submit();
    }, 100);
    return () => {
      clearInterval(clock);
      clearInterval(turns);
      stt.current?.stop();
      tts.current?.cancel();
      meter.stop();
    };
    // The stage runs once per session; its handlers read refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ended) endedRef.current = true;
    if (ended && phaseRef.current !== "customer" && phaseRef.current !== "thinking") set("done");
  }, [ended]);

  const status = phase === "customer" ? ui("voice.speaking", { name }) : phase === "listening" ? ui("voice.listening") : phase === "thinking" ? ui("voice.thinking", { name }) : "";
  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6 pb-4">
      <div className="flex flex-col items-center gap-5 text-center">
        <button
          type="button"
          onClick={interrupt}
          disabled={phase !== "customer"}
          aria-label={ui("voice.interrupt", { name })}
          className={`voice-halo relative grid place-items-center rounded-full p-2 ${phase === "customer" ? "voice-speaking" : ""}`}
          data-testid="voice-avatar"
        >
          <Avatar name={name} size={128} />
        </button>
        <div className="space-y-1">
          <p className="font-display text-[34px] leading-tight text-ink">{name}</p>
          <p className="text-[15px] text-muted tabular-nums">{mmss}</p>
        </div>
        {/* The rep's voice as bars; a gentle idle wave when the microphone level is not available. */}
        <div ref={bars} className={`voice-bars flex h-12 items-center gap-1 ${phase === "listening" ? "is-listening" : ""}`} aria-hidden="true">
          {Array.from({ length: 21 }, (_, i) => <span key={i} style={{ ["--i" as string]: i }} />)}
        </div>
        <p className="min-h-6 text-[17px] font-semibold text-ink" role="status" aria-live="polite" data-testid="voice-status">{status}</p>
        {blocked && (
          <button type="button" data-testid="tap-to-hear" className={`${buttonClass} w-full`}
            onClick={() => { tts.current?.replay(blocked, { language: lang, voiceKey }); setBlocked(null); }}>
            {ui("voice.tapToHear", { name })}
          </button>
        )}
        {noisy && phase === "listening" && <p className="flex items-center gap-2 text-[14px] font-medium text-warn"><IconAlert size={16} />{ui("practice.tooNoisy")}</p>}
        {error && (
          <div role="alert" className="liquid-glass liquid-glass-panel w-full space-y-3 rounded-[1.25rem] p-4 text-left">
            <p className="flex items-start gap-2 text-[15px] text-ink"><IconAlert size={18} className="mt-0.5 shrink-0 text-bad" />{ui(error === "unsupported" ? "voice.unsupported" : "practice.micDenied")}</p>
            <button type="button" className={`${buttonClass} w-full`} onClick={onTypeInstead}>{ui("voice.typeInstead")}</button>
          </div>
        )}
      </div>

      {showWords && (
        <ol className="mt-6 space-y-2" aria-label={ui("voice.showWords")}>
          {lines.map((l, i) => (
            <li key={i} className={`flex ${l.speaker === "rep" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[85%] rounded-[1.1rem] px-3.5 py-2 text-[15px] text-ink ${l.speaker === "rep" ? "rounded-br-md bg-brand-soft" : "rounded-bl-md bg-ground"}`}>
                <span className="sr-only">{ui(l.speaker === "rep" ? "practice.you" : "practice.customer")}: </span>{l.text}
              </p>
            </li>
          ))}
        </ol>
      )}

      <BottomBar>
        <div className="mx-auto max-w-2xl px-4">
          {ended && phase === "done" ? (
            <div className="space-y-3 pb-1">
              <p className={`flex items-center justify-center gap-2 text-center text-[16px] font-semibold ${ended.stopped ? "text-bad" : "text-ink"}`}>
                {ended.stopped && <IconAlert size={18} />}{ui(ended.stopped ? "practice.stoppedCritical" : "practice.ended")}
              </p>
              <button className={`${buttonClass} w-full`} onClick={onFinish}>{ui("practice.seeDebrief")}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-1">
              <button type="button" className="liquid-glass liquid-glass-flat min-h-12 rounded-full text-[15px] font-semibold text-ink" aria-pressed={showWords} onClick={() => setShowWords((v) => !v)}>
                {ui(showWords ? "voice.hideWords" : "voice.showWords")}
              </button>
              <button type="button" className="liquid-glass liquid-glass-flat inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold text-ink" onClick={onTypeInstead}>
                <IconMessage size={17} />{ui("voice.typeInstead")}
              </button>
            </div>
          )}
        </div>
      </BottomBar>
    </div>
  );
}
