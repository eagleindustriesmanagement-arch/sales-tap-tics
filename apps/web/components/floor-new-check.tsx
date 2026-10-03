"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass, fieldClass } from "@/components/ui";

/** Start a floor check for any rep without this week's card: pick the rep and the behavior to watch (spec 14.1). */
export function FloorNewCheck({ language: lang, reps, cards }: { language: Language; reps: { id: string; firstName: string | null }[]; cards: { code: string; title: string }[] }) {
  const router = useRouter();
  const [rep, setRep] = useState(reps[0]?.id ?? "");
  const [card, setCard] = useState(cards[0]?.code ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (reps.length === 0) return null;
  async function start(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/floor-checks/cards", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: rep, cardCode: card }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) return router.refresh();
    setMessage(t(res?.status === 409 ? "floor.new.exists" : "floor.new.failed", lang));
  }
  return (
    <Card>
      <form onSubmit={start} className="space-y-3" data-testid="floor-new">
        <h2 className="text-[17px] font-bold text-ink">{t("floor.new.title", lang)}</h2>
        <p className="text-[14px] text-muted">{t("floor.new.hint", lang)}</p>
        <label className="block text-[14px] font-medium text-muted">{t("floor.new.rep", lang)}
          <select className={`${fieldClass} mt-1.5`} value={rep} onChange={(e) => setRep(e.target.value)}>
            {reps.map((r) => <option key={r.id} value={r.id}>{r.firstName ?? "—"}</option>)}
          </select>
        </label>
        <label className="block text-[14px] font-medium text-muted">{t("floor.new.behavior", lang)}
          <select className={`${fieldClass} mt-1.5`} value={card} onChange={(e) => setCard(e.target.value)}>
            {cards.map((c) => <option key={c.code} value={c.code}>{c.title}</option>)}
          </select>
        </label>
        <button className={`${buttonClass} w-full`} disabled={busy}>{t("floor.new.start", lang)}</button>
        {message && <p role="status" className="font-semibold text-ink">{message}</p>}
      </form>
    </Card>
  );
}
