"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { t, type Bilingual, type Language } from "@taptics/i18n";
import type { VoiceTiming } from "@taptics/voice";
import { Debrief, type DebriefPayload } from "@/components/debrief";
import { IconAlert, IconEye, IconMessage, IconMic, IconPlay, IconSend, IconTrophy, IconX } from "@/components/icons";
import { Lesson, LessonSteps, type LessonView } from "@/components/lesson";
import { Recover } from "@/components/recover";
import { Avatar, Card, Chip, Grade, Inset, SEGMENT_INPUT, buttonClass, ghostButtonClass } from "@/components/ui";
import { VoiceStage } from "@/components/voice-stage";
import { DeviceSpeechToText, DeviceTextToSpeech } from "@/lib/voice/device";

type Line = { speaker: "rep" | "customer"; text: string };

export interface RoomScenario {
  code: string;
  title: Bilingual;
  setting: Bilingual;
  level: number;
  maxTurns: number;
  languages: Language[];
  targets: { code: string; name: Bilingual; grade: string }[];
  /** Read before anything else in practice (decision 0031). */
  lesson: LessonView | null;
  demos: Record<"flawed" | "good", { notice: Bilingual; script: Record<Language, Line[]> }>;
}

type Phase = "lesson" | "intro" | "demo" | "live" | "debrief";
type AnswerBy = "talk" | "type";
const ANSWER_KEY = "taptics.answerBy";

const strip = (s: string) => s.replace(/\[[^\]]*\]\s*/g, "");

/**
 * The practice room (spec 12.2), immersive like a lesson in a learning app: the briefing, an optional
 * demonstration, the conversation, then the debrief. No tab bar; one way out at the top left.
 */
export function PracticeRoom({ scenario, uiLanguage, live, mode = "practice" }: { scenario: RoomScenario; uiLanguage: Language; live: boolean; mode?: "practice" | "certification" }) {
  // Learn first: practice opens on the lesson; certification is a test and goes straight to the briefing.
  const [phase, setPhase] = useState<Phase>(scenario.lesson && mode === "practice" ? "lesson" : "intro");
  // Spec 19.4: whether the rep watched the demonstration before starting.
  const [watchedDemo, setWatchedDemo] = useState(false);
  useEffect(() => { if (phase === "demo") setWatchedDemo(true); }, [phase]);
  const [choice, setChoice] = useState<Language | "follow">(uiLanguage);
  const [lang, setLang] = useState<Language>(uiLanguage);
  const [session, setSession] = useState<{ id: string; brief: string; name: string } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState<{ stopped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<DebriefPayload | null>(null);
  // Talk by default wherever the device can listen and speak; the rep's last choice is remembered on this device.
  const [voiceOk, setVoiceOk] = useState(false);
  const [answerBy, setAnswerBy] = useState<AnswerBy>("type");
  const [opening, setOpening] = useState("");
  // An open conversation on this scenario, from before the screen was reloaded or redrawn: offered back, not lost.
  const resumeKey = `taptics.session.${scenario.code}.${mode}`;
  const [resumable, setResumable] = useState<{ id: string; language: Language; brief: string; name: string; lines: Line[] } | null>(null);
  useEffect(() => {
    const read = (): { id?: string; at?: number } | null => {
      try { return JSON.parse(sessionStorage.getItem(resumeKey) ?? "null") as { id?: string; at?: number } | null; } catch { return null; }
    };
    const saved = read();
    if (!saved?.id || !saved.at || Date.now() - saved.at > 55 * 60_000) return;
    const id = saved.id;
    void fetch(`/api/sessions/${id}`).then(async (res) => {
      if (!res.ok) {
        try { sessionStorage.removeItem(resumeKey); } catch { /* storage off */ }
        return;
      }
      const d = (await res.json()) as { scenario: string; language: Language; preBrief: { brief: string; customerName: string }; lines: Line[] };
      if (d.scenario === scenario.code && d.lines.length > 0) setResumable({ id, language: d.language, brief: d.preBrief.brief, name: d.preBrief.customerName, lines: d.lines });
    }).catch(() => {});
  }, [resumeKey, scenario.code]);
  const remember = (id: string | null) => {
    try { if (id) sessionStorage.setItem(resumeKey, JSON.stringify({ id, at: Date.now() })); else sessionStorage.removeItem(resumeKey); } catch { /* storage off */ }
  };
  const resume = () => {
    if (!resumable) return;
    setLang(resumable.language);
    setSession({ id: resumable.id, brief: resumable.brief, name: resumable.name });
    setLines(resumable.lines);
    setOpening(resumable.lines.find((l) => l.speaker === "customer")?.text ?? "");
    setAnswerBy("type");
    setResumable(null);
    setPhase("live");
    window.scrollTo(0, 0);
  };
  const resumeCard = resumable && (
    <Card className="space-y-3" data-testid="resume">
      <p className="text-[16px] font-semibold text-ink">{t("practice.resumeTitle", lang, { name: resumable.name })}</p>
      <button type="button" className={`${buttonClass} w-full`} onClick={resume}>{t("practice.resume", lang)}</button>
    </Card>
  );
  useEffect(() => {
    const ok = DeviceSpeechToText.supported() && DeviceTextToSpeech.supported();
    setVoiceOk(ok);
    let saved: string | null = null;
    try { saved = localStorage.getItem(ANSWER_KEY); } catch { /* storage off */ }
    setAnswerBy(ok && saved !== "type" ? "talk" : "type");
  }, []);
  const choose = (a: AnswerBy) => {
    setAnswerBy(a);
    try { localStorage.setItem(ANSWER_KEY, a); } catch { /* storage off */ }
  };
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const repTurns = lines.filter((l) => l.speaker === "rep").length;
  const turnBudget = Math.max(1, Math.floor(scenario.maxTurns / 2));
  const turnsLeft = Math.max(0, turnBudget - repTurns);
  const waiting = busy && lines.at(-1)?.speaker === "rep";

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [lines, phase, ended, waiting]);
  // The field grows with what is typed, up to five lines.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft]);

  async function start() {
    setBusy(true);
    setError(null);
    const voice = answerBy === "talk";
    // iOS lets a page speak only after a tap: this one, so the customer's first line is not blocked.
    if (voice) try { window.speechSynthesis.speak(new SpeechSynthesisUtterance(" ")); } catch { /* no voices */ }
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario: scenario.code, language: choice, mode, voice, demoWatched: watchedDemo }) });
      if (res.status === 409) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(t(body.error === "needs_judge" ? "cert.needsJudge" : "cert.notEligible", lang));
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { id: string; language: Language; opening: string; preBrief: { brief: string; customerName: string } };
      setLang(data.language);
      setSession({ id: data.id, brief: data.preBrief.brief, name: data.preBrief.customerName });
      remember(data.id);
      setLines([{ speaker: "customer", text: data.opening }]);
      setOpening(data.opening);
      setPhase("live");
    } catch {
      setError(t("practice.error", lang));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || !session || busy) return;
    setDraft("");
    await sendTurn(text, {});
  }

  /** One rep turn, typed or spoken; each customer sentence is handed to `onSentence` as it clears the guard. */
  async function sendTurn(text: string, timing: VoiceTiming, onSentence?: (sentence: string) => void): Promise<{ ended: boolean } | null> {
    if (!session) return null;
    let result: { ended: boolean } | null = { ended: false };
    setBusy(true);
    setLines((l) => [...l, { speaker: "rep", text }]);
    try {
      const res = await fetch(`/api/sessions/${session.id}/turn`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, timing }) });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let customer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          // One bad line (cut off by a proxy, say) is skipped; it never stops the turn or reaches the screen.
          let msg: { sentence?: unknown; outcome?: { ended?: unknown; stoppedOnCritical?: unknown }; error?: unknown };
          try {
            msg = JSON.parse(line) as typeof msg;
          } catch {
            continue;
          }
          if (!msg || typeof msg !== "object") continue;
          const sentence = typeof msg.sentence === "string" ? msg.sentence.trim() : "";
          if (sentence) {
            // The first sentence adds the customer's bubble; later ones grow it (it is always the last line).
            const first = !customer;
            customer = first ? sentence : `${customer} ${sentence}`;
            const current = customer;
            setLines((l) => (first ? [...l, { speaker: "customer", text: current }] : [...l.slice(0, -1), { speaker: "customer", text: current }]));
            onSentence?.(sentence);
          }
          if (msg.outcome?.ended === true) {
            setEnded({ stopped: msg.outcome.stoppedOnCritical === true });
            result = { ended: true };
          }
          if (msg.error) setError(t("practice.error", lang));
        }
      }
    } catch {
      setError(t("practice.error", lang));
      result = null;
    } finally {
      setBusy(false);
    }
    return result;
  }

  async function finish() {
    if (!session) return;
    remember(null);
    setBusy(true);
    setPhase("debrief");
    try {
      const res = await fetch(`/api/sessions/${session.id}/finish`, { method: "POST" });
      setDebrief((await res.json()) as DebriefPayload);
    } catch {
      setError(t("practice.error", lang));
    } finally {
      setBusy(false);
    }
  }

  if (phase === "debrief") {
    return debrief ? (
      <Debrief data={debrief} language={lang} seenId={session?.id} onRetry={() => location.reload()} />
    ) : (
      <div className="grid min-h-dvh place-items-center px-6" role="status">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-12 w-12 animate-spin rounded-full border-[3px] border-brand-soft border-t-brand" aria-hidden="true" />
          <p className="text-[17px] font-semibold text-ink">{ui("debrief.loading")}</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- live conversation
  if (phase === "live" && session) {
    // If drawing the conversation ever fails, it is drawn again from scratch with the conversation kept; if that
    // keeps failing, the rep can still see the debrief (decision 0027).
    const recovered = (
      <div className="grid min-h-dvh place-items-center px-6">
        <div role="alert" className="w-full max-w-md space-y-4 text-center">
          <p className="text-[17px] font-semibold text-ink">{ui("practice.recovered")}</p>
          <button type="button" className={`${buttonClass} w-full`} onClick={finish}>{ui("practice.seeDebrief")}</button>
          <button type="button" className={`${ghostButtonClass} w-full`} onClick={() => location.reload()}>{ui("practice.startAgain")}</button>
        </div>
      </div>
    );
    return (
      <Recover area="practice" fallback={recovered}>
      {/* The rep practices in the language chosen; the browser must not machine-translate the conversation. */}
      <div translate="no" className="flex min-h-dvh flex-col">
        <header className="glass-chrome pt-safe sticky top-0 z-30">
          <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
            {answerBy === "type" && <Avatar name={session.name} size={40} />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[22px] leading-tight text-ink">{session.name}</p>
              <p className="truncate text-[13px] text-muted">{scenario.title[lang]}</p>
            </div>
            {!ended && <button type="button" onClick={finish} className="liquid-glass liquid-glass-flat min-h-10 shrink-0 rounded-full px-3.5 text-[14px] font-semibold text-ink">{ui("practice.end")}</button>}
          </div>
          {/* Turns left: the conversation has a limit, and the rep should feel it coming. */}
          <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 pb-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ground" aria-hidden="true">
              <div className="fill-gold-x h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ width: `${Math.min(100, (repTurns / turnBudget) * 100)}%` }} />
            </div>
            <span className="text-[12px] font-semibold text-muted tabular-nums">{ui("practice.turnsLeft", { n: turnsLeft })}</span>
          </div>
        </header>

        {answerBy === "talk" ? (
          <VoiceStage
            name={session.name}
            language={lang}
            voiceKey={scenario.code}
            opening={opening}
            lines={lines}
            ended={ended}
            sendTurn={sendTurn}
            onFinish={finish}
            onTypeInstead={() => setAnswerBy("type")}
          />
        ) : (<>
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-40">
          <div className="mx-auto mb-5 max-w-md space-y-2 text-center">
            <p className="text-[15px] text-body">{session.brief}</p>
            <p className="text-[13px] text-muted"><span>{ui("practice.textModeNotice")}</span>{!live && <span> {ui("practice.offlineNotice")}</span>}</p>
          </div>
          <ol className="space-y-2.5" aria-live="polite">
            {lines.map((l, i) => {
              const rep = l.speaker === "rep";
              const firstOfRun = i === 0 || lines[i - 1]!.speaker !== l.speaker;
              return (
                <li key={i} data-testid={`line-${l.speaker}`} className={`bubble-in flex items-end gap-2 ${rep ? "justify-end" : "justify-start"}`}>
                  {!rep && <span className="w-8 shrink-0">{firstOfRun && <Avatar name={session.name} size={32} />}</span>}
                  <p className={`max-w-[80%] px-4 py-2.5 text-[16px] leading-snug ${rep
                    ? "bezel fill-gold rounded-[1.25rem] rounded-br-md text-brand-fill-ink"
                    : "liquid-glass liquid-glass-panel rounded-[1.25rem] rounded-bl-md text-ink"}`}>
                    <span className="sr-only">{ui(rep ? "practice.you" : "practice.customer")}: </span>
                    <span>{l.text}</span>
                  </p>
                </li>
              );
            })}
            {waiting && (
              <li data-testid="typing" className="flex items-end gap-2">
                <span className="w-8 shrink-0" />
                <span className="sr-only">{ui("practice.typing", { name: session.name })}</span>
                <span className="typing liquid-glass liquid-glass-panel flex gap-1 rounded-[1.25rem] rounded-bl-md px-4 py-3.5" aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-muted" /><span className="h-2 w-2 rounded-full bg-muted" /><span className="h-2 w-2 rounded-full bg-muted" />
                </span>
              </li>
            )}
          </ol>
          {error && <p role="alert" className="mt-4 flex items-center justify-center gap-2 font-semibold text-bad"><IconAlert size={18} />{error}</p>}
          {/* Scrolling to the end keeps the last line clear of the fixed composer or end panel below it. */}
          <div ref={bottom} className="scroll-mb-48" />
        </div>

        <div className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-30 pt-3">
          <div className="mx-auto max-w-2xl px-4">
            {ended ? (
              <div className="space-y-3 pb-1">
                <p className={`flex items-center justify-center gap-2 text-center text-[16px] font-semibold ${ended.stopped ? "text-bad" : "text-ink"}`}>
                  {ended.stopped && <IconAlert size={18} />}{ui(ended.stopped ? "practice.stoppedCritical" : "practice.ended")}
                </p>
                <button className={`${buttonClass} w-full`} onClick={finish}>{ui("practice.seeDebrief")}</button>
              </div>
            ) : (
              <form data-testid="composer" data-busy={busy ? "true" : "false"} className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
                <label htmlFor="say" className="sr-only">{ui("practice.typeHere")}</label>
                <textarea
                  ref={field}
                  id="say"
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
                  placeholder={ui("practice.typeHere")}
                  className="liquid-glass-field min-h-12 flex-1 resize-none rounded-[1.5rem] px-4 py-3 leading-snug"
                  lang={lang}
                  enterKeyHint="send"
                />
                <button aria-label={ui("practice.send")} className="liquid-glass liquid-glass-accent liquid-glass-flat grid h-12 w-12 shrink-0 place-items-center rounded-full" disabled={busy || !draft.trim()}>
                  <IconSend size={22} />
                </button>
              </form>
            )}
          </div>
        </div>
        </>)}
      </div>
      </Recover>
    );
  }

  // ------------------------------------------------------------- the lesson: learn the tactic first (decision 0031)
  if (phase === "lesson" && scenario.lesson) {
    return (
      <div className="flex min-h-dvh flex-col">
        <div className="pt-safe">
          <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
            <Link href="/practice" aria-label={ui("practice.close")} className="liquid-glass liquid-glass-flat grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink"><IconX size={20} /></Link>
            <div className="flex-1" />
            <Chip tone="brand">{t("practice.level", lang, { n: scenario.level })}</Chip>
          </div>
        </div>
        <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 pt-1 pb-48">
          {resumeCard}
          <LessonSteps current="learn" lang={lang} />
          <Lesson lesson={scenario.lesson} lang={lang} />
        </div>
        <div className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-30 pt-3">
          <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4">
            <button type="button" className={`${buttonClass} w-full`} onClick={() => { setPhase("demo"); window.scrollTo(0, 0); }}><IconEye size={18} />{ui("lesson.seeIt")}</button>
            <button type="button" className={`${ghostButtonClass} w-full`} onClick={() => { setPhase("intro"); window.scrollTo(0, 0); }}>{ui("lesson.skip")}</button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- briefing and demonstration
  const demoLang: Language = choice === "follow" ? lang : choice;
  const close = phase === "demo"
    ? <button type="button" onClick={() => setPhase("intro")} aria-label={ui("practice.close")} className="liquid-glass liquid-glass-flat grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink"><IconX size={20} /></button>
    : <Link href="/practice" aria-label={ui("practice.close")} className="liquid-glass liquid-glass-flat grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink"><IconX size={20} /></Link>;
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pt-safe">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4">
          {close}
          <div className="flex-1" />
          {mode === "certification"
            ? <Chip tone="spark" icon={<IconTrophy size={15} />} data-testid="cert-badge">{t("cert.badge", lang)}</Chip>
            : <Chip tone="brand">{t("practice.level", lang, { n: scenario.level })}</Chip>}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 pt-2 pb-48">
        {phase === "intro" && resumeCard}
        {scenario.lesson && mode === "practice" && <LessonSteps current={phase === "demo" ? "see" : "do"} lang={lang} />}
        <div className="space-y-2">
          <span className="grid h-14 w-14 place-items-center rounded-[1.1rem] bg-brand-soft text-brand ring-1 ring-brand/25 ring-inset"><IconMessage size={28} /></span>
          <h1 className="pt-2 font-display text-[38px] leading-[1.05] text-ink sm:text-[44px]">{scenario.title[lang]}</h1>
          <p className="text-[17px] text-body">{scenario.setting[lang]}</p>
        </div>

        {phase === "intro" && (
          <>
            <Card className="space-y-3">
              <h2 className="text-[17px] font-bold text-ink">{ui("scenario.targets")}</h2>
              <ul className="space-y-2.5">
                {scenario.targets.map((x) => (
                  <li key={x.code} className="flex items-center gap-3 text-[16px] text-ink">
                    <Grade grade={x.grade} label={ui("scenario.evidence", { grade: x.grade })} /> {x.name[lang]}
                  </li>
                ))}
              </ul>
              <p className="border-t border-line-soft pt-3 text-[14px] text-muted">{ui("scenario.howItWorks")}</p>
            </Card>
            <fieldset className="space-y-2">
              <legend className="px-1 text-[15px] font-semibold text-muted">{ui("scenario.language")}</legend>
              <div className="liquid-glass-inset grid grid-cols-3 gap-1 rounded-[1.1rem] p-1">
                {([...scenario.languages, "follow"] as const).map((option) => (
                  <label key={option} className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-[0.85rem] px-2 text-center text-[14px] leading-tight font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${choice === option ? "liquid-glass liquid-glass-flat text-ink" : "text-muted"}`}>
                    <input type="radio" name="lang" value={option} className={SEGMENT_INPUT} checked={choice === option} onChange={() => setChoice(option)} />
                    {ui(option === "follow" ? "scenario.language.follow" : (`scenario.language.${option}` as "scenario.language.en"))}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="px-1 text-[15px] font-semibold text-muted">{ui("voice.answerBy")}</legend>
              <div className="liquid-glass-inset grid grid-cols-2 gap-1 rounded-[1.1rem] p-1">
                {(["talk", "type"] as const).map((option) => (
                  <label key={option} className={`relative flex min-h-12 items-center justify-center gap-2 rounded-[0.85rem] px-2 text-[15px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${option === "talk" && !voiceOk ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${answerBy === option ? "liquid-glass liquid-glass-flat text-ink" : "text-muted"}`}>
                    <input type="radio" name="answer" value={option} className={SEGMENT_INPUT} checked={answerBy === option} disabled={option === "talk" && !voiceOk} onChange={() => choose(option)} />
                    {option === "talk" ? <IconMic size={18} /> : <IconMessage size={18} />}
                    {ui(option === "talk" ? "voice.talk" : "voice.type")}
                  </label>
                ))}
              </div>
              <p className="px-1 text-[14px] text-muted">{answerBy === "talk" ? ui("voice.talkHint") : voiceOk ? ui("practice.textModeNotice") : ui("voice.unsupported")}</p>
            </fieldset>
            <p className="px-1 text-[14px] text-muted">{ui(live ? "practice.liveNotice" : "practice.offlineNotice")}</p>
          </>
        )}

        {phase === "demo" && (["flawed", "good"] as const).map((kind) => (
          <Card key={kind} className="space-y-3">
            <h2 className={`text-[17px] font-bold ${kind === "flawed" ? "text-bad" : "text-good"}`}>{ui(kind === "flawed" ? "demo.flawed" : "demo.good")}</h2>
            <ol className="space-y-2">
              {scenario.demos[kind].script[demoLang].map((l, i) => (
                <li key={i} className={`flex ${l.speaker === "rep" ? "justify-end" : "justify-start"}`}>
                  <p className={`max-w-[85%] rounded-[1.1rem] px-3.5 py-2 text-[15px] text-ink ${l.speaker === "rep" ? "rounded-br-md bg-brand-soft" : "rounded-bl-md bg-ground"}`}>
                    <span className="sr-only">{ui(l.speaker === "rep" ? "practice.you" : "practice.customer")}: </span>{strip(l.text)}
                  </p>
                </li>
              ))}
            </ol>
            <Inset className="text-[14px] font-medium">{scenario.demos[kind].notice[demoLang]}</Inset>
          </Card>
        ))}
        {error && <p role="alert" className="flex items-center gap-2 font-semibold text-bad"><IconAlert size={18} />{error}</p>}
      </div>

      {/* Primary actions live in the bottom 40% (guidelines §7). */}
      <div className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-30 pt-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4">
          <button className={`${buttonClass} w-full`} onClick={start} disabled={busy} aria-busy={busy}>
            {busy
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />{ui("scenario.starting")}</>
              : <><IconPlay size={18} className="fill-current" />{ui("scenario.start")}</>}
          </button>
          {phase === "intro" && <button className={`${ghostButtonClass} w-full`} onClick={() => setPhase("demo")}><IconEye size={18} />{ui("scenario.watchDemo")}</button>}
          {phase === "intro" && scenario.lesson && mode === "practice" && (
            <button type="button" className="min-h-11 w-full text-[15px] font-semibold text-brand" onClick={() => { setPhase("lesson"); window.scrollTo(0, 0); }}>{ui("lesson.review")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
