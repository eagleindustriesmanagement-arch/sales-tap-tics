"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";

type Part = "saw" | "behavior" | "line" | "check_again";
interface Result { parts: Record<Part, boolean>; oneBehavior: boolean; score: number; missing: { part: Part; model: string }[] }

const input = "min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-ink";

export function CoachForm({ language: lang, cardCode, cardTitle, scene, cards }: { language: Language; cardCode: string; cardTitle: string; scene: string; cards: { code: string; title: string }[] }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cardCode, text }) });
    setBusy(false);
    if (res.ok) setResult((await res.json()) as Result);
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm">{ui("coach.card")}
        <select className={input} value={cardCode} onChange={(e) => router.push(`/manager/coach?card=${e.target.value}`)}>
          {cards.map((c) => <option key={c.code} value={c.code}>{c.title}</option>)}
        </select>
      </label>
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">{ui("coach.youSaw")}</p>
        <p className="mt-1 text-ink" data-testid="coach-scene">{scene}</p>
        <p className="mt-2 text-sm text-muted">{ui("coach.task", { card: cardTitle })}</p>
      </Card>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm">{ui("coach.say")}
          <textarea className={`${input} min-h-32 py-2`} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        </label>
        <button className={`${buttonClass} w-full`} disabled={busy || text.trim().length < 10}>{ui("coach.submit")}</button>
      </form>
      {result && (
        <Card className="space-y-2" data-testid="coach-result">
          <p className="text-xl font-bold text-ink">{ui("coach.score", { score: result.score })}</p>
          <ul className="space-y-1">
            {(["saw", "behavior", "line", "check_again"] as const).map((p) => (
              <li key={p} className={result.parts[p] ? "text-good" : "text-bad"}>{result.parts[p] ? "✓" : "✗"} {ui(`coach.part.${p}`)}</li>
            ))}
            {!result.oneBehavior && <li className="text-bad">✗ {ui("coach.oneBehavior")}</li>}
          </ul>
          {result.missing.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-ink">{ui("coach.model")}</p>
              {result.missing.map((m) => <p key={m.part} className="rounded-xl bg-ground p-3 text-ink">{m.model}</p>)}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
