"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, SEGMENT_INPUT, buttonClass } from "@/components/ui";
import type { AssignGroup } from "@/lib/assign-options";
import { dateFormat } from "@/lib/dates";

const input = "mt-1.5 min-h-12 w-full liquid-glass-field rounded-[0.875rem] px-3 text-ink";

/** A date this many days from today, in the manager's own calendar (YYYY-MM-DD). */
function daysFromToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const QUICK = [
  { key: "none", days: null },
  { key: "tomorrow", days: 1 },
  { key: "3days", days: 3 },
  { key: "week", days: 7 },
  { key: "pick", days: null },
] as const;
type Quick = (typeof QUICK)[number]["key"];

export function AssignForm({ language: lang, reps, groups, preselected }: {
  language: Language;
  reps: { id: string; firstName: string | null }[];
  groups: AssignGroup[];
  preselected: string[];
}) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [chosen, setChosen] = useState<string[]>(preselected);
  const [scenario, setScenario] = useState(groups[0]?.options[0]?.code ?? "");
  const [due, setDue] = useState("");
  // Quick choices set the date in one tap; "Pick a date" opens the calendar for anything else.
  const [quick, setQuick] = useState<Quick>("none");
  const choose = (q: Quick) => {
    setQuick(q);
    const days = QUICK.find((x) => x.key === q)!.days;
    setDue(days === null ? (q === "pick" ? due || daysFromToday(1) : "") : daysFromToday(days));
  };
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (chosen.length === 0) return setStatus(ui("assign.pickRep"));
    const res = await fetch("/api/assignments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userIds: chosen, scenarioCode: scenario, dueDate: due || null, reason }) }).catch(() => null);
    if (res?.ok) {
      setStatus(ui("assign.done", { n: chosen.length }));
      setChosen([]);
      setReason("");
      choose("none");
    } else setStatus(ui("assign.failed"));
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card className="space-y-3">
        <label className="block text-[14px] font-medium text-muted">{ui("assign.scenario")}
          <select className={input} value={scenario} onChange={(e) => setScenario(e.target.value)}>
            {/* The team's own industry first; the others after it, each named, so a look-alike title is not picked by mistake. */}
            {groups.map((g) => (
              <optgroup key={g.industry} label={g.label} data-testid={`assign-group-${g.industry}`}>
                {g.options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-[14px] font-medium text-muted">{ui("assign.reps")}</legend>
          {reps.map((r) => (
            <label key={r.id} className="flex min-h-11 items-center gap-3 text-ink">
              <input type="checkbox" className="h-5 w-5" checked={chosen.includes(r.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, r.id] : chosen.filter((x) => x !== r.id))} />
              {r.firstName}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="text-[14px] font-medium text-muted">{ui("assign.due")}</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <label key={q.key} className={`relative inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-[15px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${quick === q.key ? "liquid-glass liquid-glass-flat text-ink ring-1 ring-brand/40 ring-inset" : "liquid-glass-inset text-muted"}`}>
                <input type="radio" name="due" value={q.key} className={SEGMENT_INPUT} checked={quick === q.key} onChange={() => choose(q.key)} />
                {ui(`assign.due.${q.key}` as "assign.due.none")}
              </label>
            ))}
          </div>
          {quick === "pick" ? (
            <label className="mt-2 block text-[14px] font-medium text-muted">{ui("assign.due.date")}
              <input type="date" className={`${input} [color-scheme:dark]`} min={daysFromToday(0)} value={due} onChange={(e) => setDue(e.target.value)} data-testid="due-date" />
            </label>
          ) : due ? (
            <p className="mt-2 text-[14px] text-body" data-testid="due-summary">{ui("assign.dueOn", { date: dateFormat(lang, { weekday: "short", month: "short", day: "numeric" }).format(new Date(`${due}T12:00:00`)) })}</p>
          ) : null}
        </fieldset>
        <label className="block text-[14px] font-medium text-muted">{ui("assign.reason")}<textarea className={`${input} min-h-20 py-2`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={ui("assign.reasonHint")} /></label>
      </Card>
      <button className={`${buttonClass} w-full`}>{ui("assign.submit")}</button>
      {status && <p role="status" className="font-semibold text-ink">{status}</p>}
    </form>
  );
}
