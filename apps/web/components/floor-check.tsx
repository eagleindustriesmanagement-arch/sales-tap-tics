"use client";

import { useRef, useState } from "react";
import { t, type Bilingual, type Language } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";

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
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">{repName}</p>
      <h2 className="text-lg font-bold text-ink">{card.title[lang]}</h2>
      <p className="text-ink">{card.behavior[lang]}</p>
      <details onToggle={touch}>
        <summary className="cursor-pointer font-semibold text-brand">{ui("floor.script")}</summary>
        <dl className="mt-2 space-y-2">
          {parts.map(([label, text]) => (
            <div key={label}><dt className="text-sm font-semibold text-muted">{ui(label)}</dt><dd className="text-ink">{text[lang]}</dd></div>
          ))}
          <div><dt className="text-sm font-semibold text-muted">{ui("floor.lookFor")}</dt><dd><ul className="list-disc pl-5">{card.lookFor[lang].map((x) => <li key={x}>{x}</li>)}</ul></dd></div>
        </dl>
      </details>
      {error && <p role="alert" className="font-semibold text-bad">{ui("practice.error")}</p>}
      {status !== "open" ? (
        <p className="font-semibold text-good">{ui("card.checked")}</p>
      ) : saved !== null ? (
        <p role="status" className="font-semibold text-good">{ui("floor.recorded", { seconds: saved })}</p>
      ) : (
        <>
          <fieldset>
            <legend className="text-sm font-semibold text-muted">{ui("floor.observed")}</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["yes", "partly", "no"] as const).map((o) => (
                <button key={o} type="button" onClick={() => { touch(); setObserved(o); }} aria-pressed={observed === o} className={`min-h-12 rounded-xl border font-semibold ${observed === o ? "border-brand bg-brand text-brand-ink" : "border-line text-ink"}`}>
                  {ui(`floor.observed.${o}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-sm font-semibold text-muted">{ui("floor.note")}</span>
            <input value={note} onChange={(e) => { touch(); setNote(e.target.value); }} maxLength={280} className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink" />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-ink"><input type="checkbox" className="h-5 w-5" checked={specific} onChange={(e) => { touch(); setSpecific(e.target.checked); }} />{ui("floor.selfCheck.specific")}</label>
          <label className="flex min-h-11 items-center gap-3 text-ink"><input type="checkbox" className="h-5 w-5" checked={modeled} onChange={(e) => { touch(); setModeled(e.target.checked); }} />{ui("floor.selfCheck.modeled")}</label>
          <button className={`${buttonClass} w-full`} disabled={!observed} onClick={save}>{ui("floor.save")}</button>
        </>
      )}
    </Card>
  );
}
