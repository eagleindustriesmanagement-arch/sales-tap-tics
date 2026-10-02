"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";

const input = "min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink";

export function AssignForm({ language: lang, reps, scenarios, preselected }: {
  language: Language;
  reps: { id: string; firstName: string | null }[];
  scenarios: { code: string; level: number; title: string }[];
  preselected: string[];
}) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [chosen, setChosen] = useState<string[]>(preselected);
  const [scenario, setScenario] = useState(scenarios[0]?.code ?? "");
  const [due, setDue] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (chosen.length === 0) return setStatus(ui("assign.pickRep"));
    const res = await fetch("/api/assignments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userIds: chosen, scenarioCode: scenario, dueDate: due || null, reason }) });
    if (res.ok) {
      setStatus(ui("assign.done", { n: chosen.length }));
      setChosen([]);
      setReason("");
    } else setStatus(ui("assign.failed"));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-3">
        <label className="block text-sm">{ui("assign.scenario")}
          <select className={input} value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {scenarios.map((s) => <option key={s.code} value={s.code}>{ui("practice.level", { n: s.level })} · {s.title}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm">{ui("assign.reps")}</legend>
          {reps.map((r) => (
            <label key={r.id} className="flex min-h-11 items-center gap-3 text-ink">
              <input type="checkbox" className="h-5 w-5" checked={chosen.includes(r.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, r.id] : chosen.filter((x) => x !== r.id))} />
              {r.firstName}
            </label>
          ))}
        </fieldset>
        <label className="block text-sm">{ui("assign.due")}<input type="date" className={input} value={due} onChange={(e) => setDue(e.target.value)} /></label>
        <label className="block text-sm">{ui("assign.reason")}<textarea className={`${input} min-h-20 py-2`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={ui("assign.reasonHint")} /></label>
      </Card>
      <button className={`${buttonClass} w-full`}>{ui("assign.submit")}</button>
      {status && <p role="status" className="font-semibold text-ink">{status}</p>}
    </form>
  );
}
