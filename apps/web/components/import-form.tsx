"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";

type Kind = "ups" | "lost_reasons" | "be_backs" | "leads" | "addons";
interface Result { ok: boolean; rows: number; errors: string[]; unmatchedReps: string[] }

const input = "mt-1.5 min-h-12 w-full liquid-glass-field rounded-[0.875rem] px-3 text-ink";

/** `kinds` maps each import kind to its required header line, from the server's definitions. */
export function ImportForm({ language: lang, kinds }: { language: Language; kinds: Record<Kind, string> }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("ups");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [tooBig, setTooBig] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setResult(null);
    setTooBig(file.size > 1_000_000);
    if (file.size > 1_000_000) return;
    setBusy(true);
    const res = await fetch("/api/store/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, csv: await file.text() }) });
    setBusy(false);
    if (res.status === 200 || res.status === 422) {
      setResult((await res.json()) as Result);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-[14px] font-medium text-muted">{ui("baseline.kind")}
        <select className={input} value={kind} onChange={(e) => { setKind(e.target.value as Kind); setResult(null); }} data-testid="import-kind">
          {(Object.keys(kinds) as Kind[]).map((k) => <option key={k} value={k}>{ui(`baseline.kind.${k}` as Parameters<typeof t>[0])}</option>)}
        </select>
      </label>
      <p className="text-sm text-muted">{ui("baseline.columns", { columns: "" })}<code className="font-mono text-ink">{kinds[kind]}</code></p>
      <label className="block text-[14px] font-medium text-muted">{ui("baseline.file")}
        <input type="file" accept=".csv,text/csv" className={`${input} py-2`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="import-file" />
      </label>
      <button className={`${buttonClass} w-full`} disabled={busy || !file}>{ui("baseline.upload")}</button>
      {tooBig && <p className="text-bad" role="alert">{ui("baseline.tooBig")}</p>}
      {result && (
        <Card role="status" data-testid="import-result">
          {result.ok ? (
            <>
              <p className="font-semibold text-good">{ui("baseline.imported", { rows: result.rows })}</p>
              {result.unmatchedReps.length > 0 && <p className="mt-1 text-sm text-ink">{ui("baseline.unmatched", { names: result.unmatchedReps.join(", ") })}</p>}
            </>
          ) : (
            <>
              <p className="font-semibold text-bad">{ui("baseline.failed")}</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </>
          )}
        </Card>
      )}
    </form>
  );
}
