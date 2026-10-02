"use client";

import { t, type Bilingual, type Language } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";

export interface DebriefPayload {
  language: Language;
  offline: boolean;
  endReason: string | null;
  nextStepSecured: boolean;
  score: { total: number; passed: boolean; partial: boolean; coverage: number; threshold: number; honestyPassed: boolean; items: { code: string; points: number; max: number; status: string; explanation: Bilingual }[] };
  debrief: {
    critical: { rule: string; quote: string; trueFact: Bilingual; compliantLine: Bilingual | null; explanation: Bilingual }[];
    autoFails: { code: string; description: Bilingual; quote: string | null }[];
    worked: { code: string; behavior: Bilingual; quote: string | null; explanation: Bilingual }[];
    change: { code: string; behavior: Bilingual; why: Bilingual; stretch: boolean };
    turningPoint: { repLine: string; modelAlternative: Bilingual } | null;
    hiddenTruth: Bilingual | null;
    notScored: string[];
    reviewFlags: number;
  };
  transcript: { index: number; speaker: "rep" | "customer"; text: string }[];
}

/** Spec 12.3: critical issue first, then score and how the customer left, what worked, the one change, the turn. */
export function Debrief({ data, language: lang, onRetry }: { data: DebriefPayload; language: Language; onRetry: () => void }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const d = data.debrief;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{ui("debrief.title")}</h1>

      {d.critical.map((c, i) => (
        <Card key={i} className="space-y-2 border-bad">
          <p className="font-bold text-bad">{ui("debrief.critical")} · {c.rule}</p>
          <p className="text-ink">“{c.quote}”</p>
          <p className="text-ink">{c.explanation[lang]}</p>
          {c.compliantLine && (
            <p className="rounded-xl bg-ground p-3 text-ink"><span className="font-semibold">{ui("debrief.compliantLine")}:</span> “{c.compliantLine[lang]}”</p>
          )}
        </Card>
      ))}
      {d.autoFails.filter((a) => !d.critical.length).map((a) => (
        <Card key={a.code} className="border-bad"><p className="font-bold text-bad">{a.description[lang]}</p>{a.quote && <p className="text-ink">“{a.quote}”</p>}</Card>
      ))}

      <Card className="space-y-3">
        <div className="flex items-center gap-4">
          <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold ${data.score.passed ? "bg-good text-white" : "border-2 border-dashed border-line text-ink"}`}>{Math.round(data.score.total)}</div>
          <div>
            <p className="font-bold text-ink">{ui(data.score.partial ? "debrief.partialLabel" : data.score.passed ? "debrief.passed" : "debrief.notPassed")}</p>
            <p className="text-sm text-muted">{data.endReason ? ui(`endReason.${data.endReason}` as "endReason.sale") : ""}
              {data.nextStepSecured && data.endReason !== "next_step" ? ` · ${ui("endReason.next_step")}` : ""} · {data.score.threshold}+</p>
          </div>
        </div>
        {data.score.partial && <p className="text-sm text-ink">{ui("debrief.partial", { percent: Math.round(data.score.coverage * 100) })}</p>}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-bold text-ink">{d.change.stretch ? ui("debrief.stretch") : ui("debrief.change")}</h2>
        <p className="text-lg font-semibold text-ink">{d.change.behavior[lang]}</p>
        <p><span className="font-semibold">{ui("debrief.why")}:</span> {d.change.why[lang]}</p>
      </Card>

      {d.worked.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-bold text-ink">{ui("debrief.worked")}</h2>
          {d.worked.map((w) => (
            <div key={w.code}>
              <p className="font-semibold text-ink">{w.behavior[lang]}</p>
              {w.quote && <p className="text-sm">“{w.quote}”</p>}
            </div>
          ))}
        </Card>
      )}

      {d.turningPoint && (
        <Card className="space-y-2">
          <h2 className="font-bold text-ink">{ui("debrief.turningPoint")}</h2>
          <p><span className="font-semibold">{ui("debrief.youSaid")}:</span> “{d.turningPoint.repLine}”</p>
          <p><span className="font-semibold">{ui("debrief.tryInstead")}:</span> “{d.turningPoint.modelAlternative[lang]}”</p>
        </Card>
      )}

      {d.hiddenTruth && (
        <Card><h2 className="font-bold text-ink">{ui("debrief.hiddenTruth")}</h2><p className="mt-1">{d.hiddenTruth[lang]}</p></Card>
      )}

      {(d.notScored.length > 0 || data.offline || d.reviewFlags > 0) && (
        <p className="text-sm text-muted">
          {/* Offline, items go unscored because there is no judge, not because the audio was unclear. */}
          {data.offline ? ui("practice.offlineNotice") : d.notScored.length > 0 ? ui("debrief.notScored") : ""} {d.reviewFlags > 0 ? ui("debrief.reviewFlags", { count: d.reviewFlags }) : ""}
        </p>
      )}

      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="cursor-pointer font-semibold text-ink">{ui("debrief.items")}</summary>
        <ul className="mt-3 space-y-2 text-sm">
          {data.score.items.map((i) => (
            <li key={i.code} className="flex justify-between gap-3">
              <span>{i.explanation[lang]}</span>
              <span className="shrink-0 font-mono text-ink">{i.status === "scored" ? `${Math.round(i.points * 10) / 10}/${i.max}` : "—"}</span>
            </li>
          ))}
        </ul>
      </details>
      <details className="rounded-2xl border border-line bg-surface p-4">
        <summary className="cursor-pointer font-semibold text-ink">{ui("debrief.transcript")}</summary>
        <ol className="mt-3 space-y-1 text-sm">
          {data.transcript.map((l) => <li key={l.index}><span className="font-semibold">{ui(l.speaker === "rep" ? "practice.you" : "practice.customer")}:</span> {l.text}</li>)}
        </ol>
      </details>
      <button className={`${buttonClass} w-full`} onClick={onRetry}>{ui("debrief.tryAgain")}</button>
    </div>
  );
}
