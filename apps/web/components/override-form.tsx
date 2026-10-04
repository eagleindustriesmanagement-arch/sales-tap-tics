"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Language } from "@taptics/i18n";
import { Card } from "@/components/ui";

const FLAGS = ["judge_disagrees", "audio_problem", "scenario_problem", "other"] as const;
const input = "mt-1.5 min-h-12 w-full liquid-glass-field rounded-[0.875rem] px-3 text-ink";

/** A manager's flag and reason next to the score; the score itself never changes (spec 3.3 rule 4). */
export function OverrideForm({ sessionId, language: lang }: { sessionId: string; language: Language }) {
  const ui = (key: Parameters<typeof t>[0]) => t(key, lang);
  const router = useRouter();
  const [flag, setFlag] = useState<(typeof FLAGS)[number]>("judge_disagrees");
  const [reason, setReason] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/sessions/${sessionId}/override`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ flag, reason }) }).catch(() => null);
    if (res?.ok) {
      setReason("");
      router.refresh();
    }
  }
  return (
    <form onSubmit={submit}>
      <Card className="space-y-3">
        <h2 className="font-bold text-ink">{ui("override.add")}</h2>
        <label className="block text-[14px] font-medium text-muted">{ui("override.flag")}
          <select className={input} value={flag} onChange={(e) => setFlag(e.target.value as (typeof FLAGS)[number])}>
            {FLAGS.map((f) => <option key={f} value={f}>{t(`override.flag.${f}`, lang)}</option>)}
          </select>
        </label>
        <label className="block text-[14px] font-medium text-muted">{ui("override.reason")}<textarea className={`${input} min-h-20 py-2`} required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <button className="min-h-12 liquid-glass liquid-glass-flat liquid-glass-ring rounded-full px-5 font-semibold text-brand" disabled={reason.trim().length < 3}>{ui("override.submit")}</button>
      </Card>
    </form>
  );
}
