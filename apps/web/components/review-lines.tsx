"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card } from "@/components/ui";

type Status = "unreviewed" | "approved" | "needs_compliance" | "stale";
interface Line { code: string; key: string; speaker: "rep" | "customer" | "text"; en: string; es: string; status: Status }

const STATUS_CLASS: Record<Status, string> = { unreviewed: "text-muted", approved: "text-good", needs_compliance: "text-warn", stale: "text-bad" };

/** English and Spanish side by side; approve as is, edit and save, or (compliance reviewer) sign off numbers. */
export function ReviewLines({ language: lang, scenario, lines: initial, canEdit, canSignOff }: { language: Language; scenario: string; lines: Line[]; canEdit: boolean; canSignOff: boolean }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [lines, setLines] = useState(initial);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const id = (l: Line) => `${l.code}/${l.key}`;
  const update = (l: Line, patch: Partial<Line>) => setLines((all) => all.map((x) => (id(x) === id(l) ? { ...x, ...patch } : x)));

  async function save(l: Line) {
    const res = await fetch("/api/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario, code: l.code, lineKey: l.key, es: l.es }) });
    if (res.ok) {
      const body = (await res.json()) as { needsCompliance: boolean };
      update(l, { status: body.needsCompliance ? "needs_compliance" : "approved" });
      setNotes((n) => ({ ...n, [id(l)]: "" }));
    } else {
      const body = (await res.json().catch(() => ({}))) as { problems?: string[] };
      setNotes((n) => ({ ...n, [id(l)]: ui("review.blocked", { rules: (body.problems ?? []).join(", ") || "?" }) }));
    }
  }

  async function signOff(l: Line) {
    const res = await fetch("/api/review/compliance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: l.code, lineKey: l.key }) });
    if (res.ok) update(l, { status: "approved" });
  }

  return (
    <ul className="space-y-3">
      {lines.map((l) => (
        <li key={id(l)} data-testid={`line-${l.key}`}>
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-mono text-muted">{l.key} · {ui(`review.speaker.${l.speaker}`)}</span>
              <span className={`font-semibold ${STATUS_CLASS[l.status]}`} data-testid="status">{ui(`review.status.${l.status}`)}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="liquid-glass-inset rounded-[0.875rem] p-3 text-ink" lang="en">{l.en}</p>
              {canEdit ? (
                <textarea aria-label={ui("review.spanish")} lang="es" className="min-h-20 w-full liquid-glass-field rounded-[0.875rem] p-3 text-ink" value={l.es} onChange={(e) => update(l, { es: e.target.value })} />
              ) : (
                <p className="liquid-glass-inset rounded-[0.875rem] p-3 text-ink" lang="es">{l.es}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && <button className="min-h-11 liquid-glass liquid-glass-accent liquid-glass-flat rounded-full px-5 font-semibold" onClick={() => save(l)}>{ui("review.approve")}</button>}
              {canSignOff && l.status === "needs_compliance" && <button className="min-h-11 liquid-glass liquid-glass-flat liquid-glass-ring rounded-full px-5 font-semibold text-brand" onClick={() => signOff(l)}>{ui("review.signOff")}</button>}
            </div>
            {notes[id(l)] && <p role="alert" className="font-semibold text-bad">{notes[id(l)]}</p>}
          </Card>
        </li>
      ))}
    </ul>
  );
}
