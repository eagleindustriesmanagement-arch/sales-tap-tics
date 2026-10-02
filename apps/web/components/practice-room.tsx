"use client";

import { useEffect, useRef, useState } from "react";
import { t, type Bilingual, type Language } from "@taptics/i18n";
import { Card, Grade, Pill, buttonClass, ghostButtonClass } from "@/components/ui";
import { Debrief, type DebriefPayload } from "@/components/debrief";

type Line = { speaker: "rep" | "customer"; text: string };

export interface RoomScenario {
  code: string;
  title: Bilingual;
  setting: Bilingual;
  languages: Language[];
  targets: { code: string; name: Bilingual; grade: string }[];
  demos: Record<"flawed" | "good", { notice: Bilingual; script: Record<Language, Line[]> }>;
}

type Phase = "intro" | "demo" | "live" | "debrief";

const strip = (s: string) => s.replace(/\[[^\]]*\]\s*/g, "");

export function PracticeRoom({ scenario, uiLanguage, live }: { scenario: RoomScenario; uiLanguage: Language; live: boolean }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [choice, setChoice] = useState<Language | "follow">(uiLanguage);
  const [lang, setLang] = useState<Language>(uiLanguage);
  const [session, setSession] = useState<{ id: string; brief: string; name: string } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [ended, setEnded] = useState<{ stopped: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<DebriefPayload | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [lines, phase]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario: scenario.code, language: choice }) });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { id: string; language: Language; opening: string; preBrief: { brief: string; customerName: string } };
      setLang(data.language);
      setSession({ id: data.id, brief: data.preBrief.brief, name: data.preBrief.customerName });
      setLines([{ speaker: "customer", text: data.opening }]);
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
    setBusy(true);
    setLines((l) => [...l, { speaker: "rep", text }]);
    try {
      const res = await fetch(`/api/sessions/${session.id}/turn`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
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
          const msg = JSON.parse(buffer.slice(0, nl)) as { sentence?: string; outcome?: { ended: boolean; stoppedOnCritical: boolean }; error?: string };
          buffer = buffer.slice(nl + 1);
          if (msg.sentence) {
            // The first sentence adds the customer's bubble; later ones grow it (it is always the last line).
            const first = !customer;
            customer = first ? msg.sentence : `${customer} ${msg.sentence}`;
            const current = customer;
            setLines((l) => (first ? [...l, { speaker: "customer", text: current }] : [...l.slice(0, -1), { speaker: "customer", text: current }]));
          }
          if (msg.outcome?.ended) setEnded({ stopped: msg.outcome.stoppedOnCritical });
          if (msg.error) setError(t("practice.error", lang));
        }
      }
    } catch {
      setError(t("practice.error", lang));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!session) return;
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
    return debrief ? <Debrief data={debrief} language={lang} onRetry={() => location.reload()} /> : <p className="text-muted" role="status">{ui("debrief.loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{scenario.title[lang]}</h1>
        <p className="text-muted">{scenario.setting[lang]}</p>
      </div>

      {phase === "intro" && (
        <Card className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-muted">{ui("scenario.targets")}</p>
            <ul className="mt-2 space-y-2">
              {scenario.targets.map((x) => (
                <li key={x.code} className="flex items-center gap-2 text-ink">
                  <Grade grade={x.grade} label={ui(`evidence.${x.grade}` as "evidence.A")} /> {x.name[lang]}
                </li>
              ))}
            </ul>
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-muted">{ui("scenario.language")}</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([...scenario.languages, "follow"] as const).map((option) => (
                <label key={option} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${choice === option ? "border-brand bg-brand text-brand-ink" : "border-line text-ink"}`}>
                  <input type="radio" name="lang" value={option} className="sr-only" checked={choice === option} onChange={() => setChoice(option)} />
                  {ui(option === "follow" ? "scenario.language.follow" : (`scenario.language.${option}` as "scenario.language.en"))}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className={ghostButtonClass} onClick={() => setPhase("demo")}>{ui("scenario.watchDemo")}</button>
            <button className={buttonClass} onClick={start} disabled={busy}>{ui("scenario.start")}</button>
          </div>
          <p className="text-sm text-muted">{ui(live ? "practice.liveNotice" : "practice.offlineNotice")}</p>
        </Card>
      )}

      {phase === "demo" && (
        <div className="space-y-4">
          {(["flawed", "good"] as const).map((kind) => {
            const demoLang: Language = choice === "follow" ? lang : choice;
            return (
              <Card key={kind} className="space-y-3">
                <h2 className="font-bold text-ink">{ui(kind === "flawed" ? "demo.flawed" : "demo.good")}</h2>
                <ol className="space-y-2">
                  {scenario.demos[kind].script[demoLang].map((l, i) => (
                    <li key={i} className={l.speaker === "rep" ? "text-ink" : "text-body"}>
                      <span className="font-semibold">{ui(l.speaker === "rep" ? "practice.you" : "practice.customer")}:</span> {strip(l.text)}
                    </li>
                  ))}
                </ol>
                <p className="rounded-xl bg-ground p-3 text-sm font-medium text-ink">{scenario.demos[kind].notice[demoLang]}</p>
              </Card>
            );
          })}
          <button className={`${buttonClass} w-full`} onClick={start} disabled={busy}>{ui("scenario.start")}</button>
        </div>
      )}

      {phase === "live" && session && (
        <div className="space-y-3">
          <Card>
            <p className="text-ink">{session.brief}</p>
            <div className="mt-2 flex flex-wrap gap-2"><Pill>{ui("practice.textModeNotice")}</Pill>{!live && <Pill>{ui("practice.offlineNotice")}</Pill>}</div>
          </Card>
          <ol className="space-y-2" aria-live="polite">
            {lines.map((l, i) => (
              <li key={i} className={`flex ${l.speaker === "rep" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${l.speaker === "rep" ? "bg-brand text-brand-ink" : "border border-line bg-surface text-ink"}`}>
                  <span className="sr-only">{ui(l.speaker === "rep" ? "practice.you" : "practice.customer")}: </span>
                  {l.text}
                </p>
              </li>
            ))}
          </ol>
          <div ref={bottom} />
          {ended ? (
            <Card className="space-y-3">
              <p className="font-semibold text-ink">{ui(ended.stopped ? "practice.stoppedCritical" : "practice.ended")}</p>
              <button className={`${buttonClass} w-full`} onClick={finish}>{ui("practice.seeDebrief")}</button>
            </Card>
          ) : (
            <form className="sticky bottom-16 flex gap-2 sm:bottom-2 rounded-2xl border border-line bg-surface p-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
              <label htmlFor="say" className="sr-only">{ui("practice.typeHere")}</label>
              <textarea id="say" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder={ui("practice.typeHere")} className="min-h-12 flex-1 resize-none rounded-xl bg-ground px-3 py-2 text-ink" lang={lang} />
              <div className="flex flex-col gap-2">
                <button className={buttonClass} disabled={busy || !draft.trim()}>{ui("practice.send")}</button>
                <button type="button" className="text-sm font-semibold text-muted underline" onClick={finish}>{ui("practice.end")}</button>
              </div>
            </form>
          )}
        </div>
      )}
      {error && <p role="alert" className="font-semibold text-bad">{error}</p>}
    </div>
  );
}
