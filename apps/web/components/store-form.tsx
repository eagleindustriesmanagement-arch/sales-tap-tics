"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass, ghostButtonClass } from "@/components/ui";

type Kind = "dealer_mandatory" | "government_customer_pays" | "optional";
interface Fee { code: string; nameEn: string; nameEs: string; amountCents: number; kind: Kind }
export interface StoreFormValue {
  fees: Fee[];
  lenders: { name: string; isCreditAcceptance: boolean }[];
  addOnRemoval: "credit_price" | "show_alternative" | "none_configured";
  referralReward: "none" | "gift" | "cash";
  textConsentEn: string;
  textConsentEs: string;
  privateWindowHours: number;
  audioRetentionDays: number;
  stopOnCritical: boolean;
  walkInMetric: "all_logged_ups" | "qualified_ups";
  languages: ("en" | "es")[];
  spanishRegister: "usted" | "tu";
  approvedAt: string | null;
}

const input = "min-h-12 w-full liquid-glass-field rounded-[0.875rem] px-3 text-ink disabled:opacity-70";

export function StoreForm({ initial, language: lang, canEdit, canApprove }: { initial: StoreFormValue; language: Language; canEdit: boolean; canApprove: boolean }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [v, setV] = useState(initial);
  const [lenders, setLenders] = useState(initial.lenders.map((l) => `${l.name}${l.isCreditAcceptance ? " *" : ""}`).join("\n"));
  const [status, setStatus] = useState<string | null>(null);
  const [approvedAt, setApprovedAt] = useState(initial.approvedAt);
  const set = <K extends keyof StoreFormValue>(key: K, value: StoreFormValue[K]) => setV((x) => ({ ...x, [key]: value }));
  const setFee = (i: number, patch: Partial<Fee>) => set("fees", v.fees.map((f, j) => (i === j ? { ...f, ...patch } : f)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    // Only the editable settings: the server refuses anything else.
    const { fees, addOnRemoval, referralReward, textConsentEn, textConsentEs, privateWindowHours, audioRetentionDays, stopOnCritical, walkInMetric, languages, spanishRegister } = v;
    const body = {
      fees, addOnRemoval, referralReward, textConsentEn, textConsentEs, privateWindowHours, audioRetentionDays, stopOnCritical, walkInMetric, languages, spanishRegister,
      lenders: lenders.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => ({ name: l.replace(/\s*\*$/, ""), isCreditAcceptance: l.endsWith("*") })),
    };
    const res = await fetch("/api/store", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setApprovedAt(null);
      setStatus(ui("store.saved"));
    } else {
      const err = (await res.json().catch(() => ({}))) as { issues?: { path: string; message: string }[] };
      setStatus(ui("store.invalid", { fields: (err.issues ?? []).map((i) => i.path || i.message).join(", ") || "?" }));
    }
  }

  async function approve() {
    const res = await fetch("/api/store/approve", { method: "POST" });
    if (res.ok) setApprovedAt(new Date().toISOString());
  }

  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeZone: "America/New_York" });
  return (
    <form onSubmit={save} className="space-y-4">
      <Card>
        <p className={`font-semibold ${approvedAt ? "text-good" : "text-warn"}`} data-testid="approval">
          {approvedAt ? ui("store.approved", { date: fmt.format(new Date(approvedAt)) }) : ui("store.notApproved")}
        </p>
        {canApprove && !approvedAt && <button type="button" className={`${buttonClass} mt-3`} onClick={approve}>{ui("store.approve")}</button>}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold text-ink">{ui("store.fees")}</h2>
        {v.fees.map((f, i) => (
          <fieldset key={i} disabled={!canEdit} className="grid gap-2 liquid-glass-inset rounded-[0.875rem] p-3 sm:grid-cols-2">
            <label className="text-sm">{ui("store.feeCode")}<input className={input} value={f.code} onChange={(e) => setFee(i, { code: e.target.value })} /></label>
            <label className="text-sm">{ui("store.feeAmount")}<input className={input} inputMode="decimal" value={(f.amountCents / 100).toString()} onChange={(e) => setFee(i, { amountCents: Math.round(Number(e.target.value || 0) * 100) })} /></label>
            <label className="text-sm">{ui("store.feeNameEn")}<input className={input} value={f.nameEn} onChange={(e) => setFee(i, { nameEn: e.target.value })} /></label>
            <label className="text-sm">{ui("store.feeNameEs")}<input className={input} value={f.nameEs} onChange={(e) => setFee(i, { nameEs: e.target.value })} lang="es" /></label>
            <label className="text-sm sm:col-span-2">{ui("store.feeKind")}
              <select className={input} value={f.kind} onChange={(e) => setFee(i, { kind: e.target.value as Kind })}>
                {(["dealer_mandatory", "government_customer_pays", "optional"] as const).map((k) => <option key={k} value={k}>{ui(`store.kind.${k}`)}</option>)}
              </select>
            </label>
            {canEdit && <button type="button" className="text-left text-sm font-semibold text-bad underline" onClick={() => set("fees", v.fees.filter((_, j) => j !== i))}>{ui("store.remove")}</button>}
          </fieldset>
        ))}
        {canEdit && <button type="button" className={ghostButtonClass} onClick={() => set("fees", [...v.fees, { code: "", nameEn: "", nameEs: "", amountCents: 0, kind: "dealer_mandatory" }])}>{ui("store.addFee")}</button>}
      </Card>

      <Card className="space-y-3">
        <fieldset disabled={!canEdit} className="space-y-3">
          <label className="block text-sm">{ui("store.addOnRemoval")}
            <select className={input} value={v.addOnRemoval} onChange={(e) => set("addOnRemoval", e.target.value as StoreFormValue["addOnRemoval"])}>
              {(["credit_price", "show_alternative", "none_configured"] as const).map((k) => <option key={k} value={k}>{ui(`store.addOn.${k}`)}</option>)}
            </select>
          </label>
          <label className="block text-sm">{ui("store.lenders")}<textarea className={`${input} min-h-24 py-2`} value={lenders} onChange={(e) => setLenders(e.target.value)} /></label>
          <label className="block text-sm">{ui("store.referral")}
            <select className={input} value={v.referralReward} onChange={(e) => set("referralReward", e.target.value as StoreFormValue["referralReward"])}>
              {(["none", "gift", "cash"] as const).map((k) => <option key={k} value={k}>{ui(`store.referral.${k}`)}</option>)}
            </select>
          </label>
          <label className="block text-sm">{ui("store.consentEn")}<textarea className={`${input} min-h-20 py-2`} value={v.textConsentEn} onChange={(e) => set("textConsentEn", e.target.value)} /></label>
          <label className="block text-sm">{ui("store.consentEs")}<textarea className={`${input} min-h-20 py-2`} lang="es" value={v.textConsentEs} onChange={(e) => set("textConsentEs", e.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">{ui("store.privateWindow")}<input className={input} type="number" min={0} max={72} value={v.privateWindowHours} onChange={(e) => set("privateWindowHours", Number(e.target.value))} /></label>
            <label className="block text-sm">{ui("store.retention")}<input className={input} type="number" min={30} max={365} value={v.audioRetentionDays} onChange={(e) => set("audioRetentionDays", Number(e.target.value))} /></label>
          </div>
          <label className="flex min-h-11 items-center gap-3 text-ink"><input type="checkbox" className="h-5 w-5" checked={v.stopOnCritical} onChange={(e) => set("stopOnCritical", e.target.checked)} />{ui("store.stopOnCritical")}</label>
          <label className="block text-sm">{ui("store.metric")}
            <select className={input} value={v.walkInMetric} onChange={(e) => set("walkInMetric", e.target.value as StoreFormValue["walkInMetric"])}>
              {(["all_logged_ups", "qualified_ups"] as const).map((k) => <option key={k} value={k}>{ui(`store.metric.${k}`)}</option>)}
            </select>
          </label>
          <fieldset className="text-sm"><legend>{ui("store.languages")}</legend>
            {(["en", "es"] as const).map((l) => (
              <label key={l} className="mr-4 inline-flex min-h-11 items-center gap-2 text-ink"><input type="checkbox" className="h-5 w-5" checked={v.languages.includes(l)} onChange={(e) => set("languages", e.target.checked ? [...v.languages, l] : v.languages.filter((x) => x !== l))} />{ui(`scenario.language.${l}`)}</label>
            ))}
          </fieldset>
          <label className="block text-sm">{ui("store.register")}
            <select className={input} value={v.spanishRegister} onChange={(e) => set("spanishRegister", e.target.value as "usted" | "tu")}><option value="usted">usted</option><option value="tu">tú</option></select>
          </label>
        </fieldset>
      </Card>
      {canEdit && <button className={`${buttonClass} w-full`}>{ui("store.save")}</button>}
      {status && <p role="status" className="font-semibold text-ink">{status}</p>}
    </form>
  );
}
