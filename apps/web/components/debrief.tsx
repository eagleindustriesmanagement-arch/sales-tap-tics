"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { t, type Bilingual, type Language } from "@taptics/i18n";
import { IconAlert, IconBulb, IconCheck, IconChevronRight, IconEye, IconRefresh, IconX } from "@/components/icons";
import { Bar, Card, Chip, Ring, buttonClass, ghostButtonClass, titleClass } from "@/components/ui";

/** When each part of the reveal starts (globals.css motion): all of it is over by ~0.85s. */
const delay = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;
const COUNT_MS = 760;
const VIOLATIONS_AT = 300;
const VERDICT_AT = 420;
const CASCADE_AT = 380;
const CASCADE_STEP = 50;
const cascade = (i: number) => delay(CASCADE_AT + Math.min(i, 4) * CASCADE_STEP);

/**
 * The score counts up from 0 as its ring draws. Server-rendered and without JavaScript it is the final number; with
 * reduced motion it never moves.
 */
function useCountUp(target: number) {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (target <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      // The ring's curve, roughly: fast out of the gate, settling onto the number.
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    setValue(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}

export interface DebriefPayload {
  language: Language;
  offline: boolean;
  endReason: string | null;
  nextStepSecured: boolean;
  score: { total: number; passed: boolean; partial: boolean; coverage: number; threshold: number; honestyPassed: boolean; items: { code: string; points: number; max: number; status: string; explanation: Bilingual }[] };
  debrief: {
    score?: { threshold: number };
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

/**
 * The results screen (spec 12.3, 18.4 rule 2): a critical issue first, then the score with the one change that
 * matters most right under it, the turning point as two lines side by side, what worked, and what the customer was
 * really thinking. Details fold away. `standalone` is the end of a live session: its own top bar and pinned actions.
 */
/** `seenId`: the rep's own session, marked seen when its debrief first shows (spec 19.4: debrief opens). */
export function Debrief({ data, language: lang, onRetry, standalone = true, seenId }: { data: DebriefPayload; language: Language; onRetry: () => void; standalone?: boolean; seenId?: string }) {
  useEffect(() => {
    if (seenId) void fetch(`/api/sessions/${seenId}/seen`, { method: "POST" }).catch(() => undefined);
  }, [seenId]);
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const d = data.debrief;
  const total = Math.round(data.score.total);
  const tone = data.score.partial ? "brand" : data.score.passed ? "good" : total >= data.score.threshold * 0.7 ? "warn" : "bad";
  const verdict = ui(data.score.partial ? "debrief.partialLabel" : data.score.passed ? "debrief.passed" : "debrief.notPassed");
  const shown = useCountUp(total);
  let step = 0;

  const body = (
    <div className="space-y-4">
      {d.critical.map((c, i) => (
        <section key={i} className="reveal-slide bezel space-y-2.5 rounded-[1.25rem] bg-bad-soft p-4 ring-1 ring-bad/30 ring-inset" style={delay(VIOLATIONS_AT + i * 60)}>
          <p className="flex items-center gap-2 text-[15px] font-bold text-bad"><IconAlert size={18} />{ui("debrief.critical")} · {c.rule}</p>
          <p className="text-[16px] text-ink">“{c.quote}”</p>
          <p className="text-[15px] text-ink">{c.explanation[lang]}</p>
          {c.compliantLine && (
            <p className="rounded-[0.875rem] bg-page/60 p-3 text-[15px] text-ink"><span className="font-semibold">{ui("debrief.compliantLine")}:</span> “{c.compliantLine[lang]}”</p>
          )}
        </section>
      ))}
      {d.autoFails.filter(() => !d.critical.length).map((a) => (
        <section key={a.code} className="reveal-slide bezel space-y-1 rounded-[1.25rem] bg-bad-soft p-4 ring-1 ring-bad/30 ring-inset" style={delay(VIOLATIONS_AT)}>
          <p className="flex items-center gap-2 font-bold text-bad"><IconAlert size={18} />{a.description[lang]}</p>
          {a.quote && <p className="text-ink">“{a.quote}”</p>}
        </section>
      ))}

      <Card className="reveal-rise flex flex-col items-center gap-3 py-7 text-center">
        <div className="score-ring">
          <Ring value={total / 100} size={164} stroke={10} tone={tone} label={`${ui("debrief.score")}: ${total}`}>
            <div>
              <p className="font-display text-[64px] leading-[0.9] text-ink tabular-nums">{shown}</p>
              <p className="mt-1 text-[13px] text-muted">{ui("debrief.outOf")}</p>
            </div>
          </Ring>
        </div>
        <div className="reveal-land flex flex-wrap justify-center gap-1.5" style={delay(VERDICT_AT)}>
          <Chip tone={tone}>{verdict}</Chip>
          {data.endReason && <Chip>{ui(`endReason.${data.endReason}` as "endReason.sale")}</Chip>}
          {data.nextStepSecured && data.endReason !== "next_step" && <Chip tone="good">{ui("endReason.next_step")}</Chip>}
        </div>
        <p className="text-[14px] text-muted">{ui("debrief.passMark", { n: data.score.threshold })}</p>
        {data.score.partial && <p className="max-w-sm text-[14px] text-body">{ui("debrief.partial", { percent: Math.round(data.score.coverage * 100) })}</p>}
      </Card>

      <section className="reveal-rise liquid-glass liquid-glass-panel liquid-glass-hero space-y-2 rounded-[1.5rem] p-5" style={cascade(step++)}>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-brand"><IconBulb size={18} />{d.change.stretch ? ui("debrief.stretch") : ui("debrief.change")}</p>
        <p className="font-display text-[27px] leading-[1.15] text-ink">{d.change.behavior[lang]}</p>
        <p className="text-[15px] text-body"><span className="font-semibold text-ink">{ui("debrief.why")}:</span> {d.change.why[lang]}</p>
      </section>

      {d.turningPoint && (
        <Card className="reveal-rise space-y-3" style={cascade(step++)}>
          <h2 className="text-[17px] font-bold text-ink">{ui("debrief.turningPoint")}</h2>
          <div>
            <p className="mb-1 text-[13px] font-semibold text-muted">{ui("debrief.youSaid")}</p>
            <p className="rounded-[1.1rem] rounded-tl-md bg-ground px-3.5 py-2.5 text-[15px] text-ink">“{d.turningPoint.repLine}”</p>
          </div>
          <div>
            <p className="mb-1 text-[13px] font-semibold text-good">{ui("debrief.tryInstead")}</p>
            <p className="rounded-[1.1rem] rounded-tl-md bg-good-soft px-3.5 py-2.5 text-[15px] text-ink">“{d.turningPoint.modelAlternative[lang]}”</p>
          </div>
        </Card>
      )}

      {d.worked.length > 0 && (
        <Card className="reveal-rise space-y-3" style={cascade(step++)}>
          <h2 className="text-[17px] font-bold text-ink">{ui("debrief.worked")}</h2>
          <ul className="space-y-3">
            {d.worked.map((w) => (
              <li key={w.code} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-good-soft text-good"><IconCheck size={16} /></span>
                <div>
                  <p className="text-[15px] font-semibold text-ink">{w.behavior[lang]}</p>
                  {w.quote && <p className="text-[14px] text-muted">“{w.quote}”</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {d.hiddenTruth && (
        <Card className="reveal-rise space-y-1.5" style={cascade(step++)}>
          <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink"><IconEye size={20} className="text-brand" />{ui("debrief.hiddenTruth")}</h2>
          <p className="text-[15px]">{d.hiddenTruth[lang]}</p>
        </Card>
      )}

      {(d.notScored.length > 0 || data.offline || d.reviewFlags > 0) && (
        <p className="reveal-rise px-1 text-[13px] text-muted" style={cascade(step++)}>
          {/* Offline, items go unscored because there is no judge, not because the audio was unclear. */}
          {data.offline ? ui("practice.offlineNotice") : d.notScored.length > 0 ? ui("debrief.notScored") : ""} {d.reviewFlags > 0 ? ui("debrief.reviewFlags", { count: d.reviewFlags }) : ""}
        </p>
      )}

      <details className="reveal-rise liquid-glass liquid-glass-panel group rounded-[1.25rem] p-4" style={cascade(step++)}>
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between font-semibold text-ink">{ui("debrief.items")}<IconChevronRight size={18} className="text-muted transition-transform duration-300 group-open:rotate-90" /></summary>
        <ul className="cascade mt-3 space-y-3 text-[14px]">
          {data.score.items.map((i, n) => (
            <li key={i.code} className="space-y-1" style={{ ["--i" as string]: n }}>
              <div className="flex justify-between gap-3">
                <span className="text-body">{i.explanation[lang]}</span>
                <span className="shrink-0 font-semibold text-ink tabular-nums">{i.status === "scored" ? `${Math.round(i.points * 10) / 10}/${i.max}` : "—"}</span>
              </div>
              {i.status === "scored" && <Bar value={i.max ? i.points / i.max : 0} tone={i.points >= i.max * 0.7 ? "good" : i.points >= i.max * 0.4 ? "warn" : "bad"} />}
            </li>
          ))}
        </ul>
      </details>
      <details className="reveal-rise liquid-glass liquid-glass-panel group rounded-[1.25rem] p-4" style={cascade(step++)}>
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between font-semibold text-ink">{ui("debrief.transcript")}<IconChevronRight size={18} className="text-muted transition-transform duration-300 group-open:rotate-90" /></summary>
        <ol className="mt-3 space-y-2 text-[14px]">
          {data.transcript.map((l) => (
            <li key={l.index} className={`flex ${l.speaker === "rep" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[85%] rounded-[1rem] px-3 py-2 text-ink ${l.speaker === "rep" ? "rounded-br-md bg-brand-soft" : "rounded-bl-md bg-ground"}`}>
                <span className="sr-only">{ui(l.speaker === "rep" ? "practice.you" : "practice.customer")}: </span>{l.text}
              </p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );

  const actions = (
    <>
      <button className={`${buttonClass} w-full`} onClick={onRetry}><IconRefresh size={18} />{ui("debrief.tryAgain")}</button>
      <Link href="/today" className={`${ghostButtonClass} w-full`}>{ui("debrief.backToday")}</Link>
    </>
  );

  if (!standalone) {
    return (
      <div className="space-y-4">
        <header className="space-y-3 px-1">
          <h1 className={titleClass}>{ui("debrief.title")}</h1>
          <span aria-hidden="true" className="gold-rule block" />
        </header>
        {body}
        <div className="flex flex-col gap-2 pt-2">{actions}</div>
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="glass-chrome pt-safe sticky top-0 z-30">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link href="/today" aria-label={ui("practice.close")} className="liquid-glass liquid-glass-flat grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink"><IconX size={18} /></Link>
          <h1 className="flex-1 text-center font-display text-[24px] leading-none text-ink">{ui("debrief.title")}</h1>
          <span className="w-10" />
        </div>
      </header>
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-44">{body}</div>
      <div className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-30 pt-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4">{actions}</div>
      </div>
    </div>
  );
}
