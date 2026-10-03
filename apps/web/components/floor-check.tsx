"use client";

import { useRef, useState } from "react";
import { t, type Bilingual, type Language } from "@taptics/i18n";
import { IconCheck, IconChevronRight } from "@/components/icons";
import { Avatar, Card, Chip, buttonClass, fieldClass } from "@/components/ui";

export interface FloorCard {
  code: string;
  title: Bilingual;
  behavior: Bilingual;
  script: { saw: Bilingual; behavior: Bilingual; line: Bilingual; check_again: Bilingual };
  lookFor: { en: string[]; es: string[] };
}

/** A floor check recorded in under 60 seconds on a phone (spec 14.1, 22.1 M5). The timer starts on first tap. */
export function FloorCheck({ card, issueId, repName, status, language: lang }: { card: FloorCard; issueId: string; repName: string; status: string; language: Language }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const started = useRef<number | null>(null);
  const [observed, setObserved] = useState<"yes" | "partly" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [specific, setSpecific] = useState(false);
  const [modeled, setModeled] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const touch = () => (started.current ??= Date.now());

  async function save() {
    const seconds = Math.round((Date.now() - (started.current ?? Date.now())) / 1000);
    const res = await fetch("/api/floor-checks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cardIssueId: issueId, observed, note, specific, modeled, seconds }) });
    if (res.ok) setSaved(seconds);
    else setError(true);
  }

  const parts: [Parameters<typeof t>[0], Bilingual][] = [["floor.saw", card.script.saw], ["floor.oneBehavior", card.script.behavior], ["floor.exactLine", card.script.line], ["floor.checkAgain", card.script.check_again]];
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={repName} size={44} />
        <div className="min-w-0">
          <p className="font-display text-[24px] leading-tight text-ink">{repName}</p>
          <p className="text-[14px] text-muted">{card.title[lang]}</p>
        </div>
      </div>
      <p className="text-[16px] text-ink">{card.behavior[lang]}</p>
      <details onToggle={touch} className="liquid-glass-inset group rounded-[0.875rem] px-3.5 py-2.5">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between font-semibold text-brand">{ui("floor.script")}<IconChevronRight size={18} className="transition-transform duration-300 group-open:rotate-90" /></summary>
        <dl className="mt-2 space-y-2.5 pb-1">
          {parts.map(([label, text]) => (
            <div key={label}><dt className="text-[13px] font-semibold text-brand">{ui(label)}</dt><dd className="text-[15px] text-ink">{text[lang]}</dd></div>
          ))}
          <div><dt className="text-[13px] font-semibold text-brand">{ui("floor.lookFor")}</dt><dd><ul className="list-disc pl-5 text-[15px] text-ink">{card.lookFor[lang].map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
        </dl>
      </details>
      {error && <p role="alert" className="font-semibold text-bad">{ui("practice.error")}</p>}
      {status !== "open" ? (
        <Chip tone="good" icon={<IconCheck size={15} />}>{ui("card.checked")}</Chip>
      ) : saved !== null ? (
        <p role="status" className="font-semibold text-good">{ui("floor.recorded", { seconds: saved })}</p>
      ) : (
        <>
          <fieldset>
            <legend className="text-[14px] font-semibold text-muted">{ui("floor.observed")}</legend>
            <div className="liquid-glass-inset mt-2 grid grid-cols-3 gap-1 rounded-[1.1rem] p-1">
              {(["yes", "partly", "no"] as const).map((o) => (
                <button key={o} type="button" onClick={() => { touch(); setObserved(o); }} aria-pressed={observed === o} className={`min-h-12 rounded-[0.85rem] text-[15px] font-semibold ${observed === o ? "liquid-glass liquid-glass-accent liquid-glass-flat" : "text-ink"}`}>
                  {ui(`floor.observed.${o}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("floor.note")}</span>
            <input value={note} onChange={(e) => { touch(); setNote(e.target.value); }} maxLength={280} className={`${fieldClass} mt-1.5`} />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-ink"><input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--accent)]" checked={specific} onChange={(e) => { touch(); setSpecific(e.target.checked); }} />{ui("floor.selfCheck.specific")}</label>
          <label className="flex min-h-11 items-center gap-3 text-ink"><input type="checkbox" className="h-6 w-6 shrink-0 accent-[var(--accent)]" checked={modeled} onChange={(e) => { touch(); setModeled(e.target.checked); }} />{ui("floor.selfCheck.modeled")}</label>
          <button className={`${buttonClass} w-full`} disabled={!observed} onClick={save}>{ui("floor.save")}</button>
        </>
      )}
    </Card>
  );
}
