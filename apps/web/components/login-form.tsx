"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";

export function LoginForm({ language: lang }: { language: Language }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [step, setStep] = useState<"identifier" | "code">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/auth/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, language: lang }) });
    const data = (await res.json().catch(() => ({}))) as { status?: string; devCode?: string };
    setBusy(false);
    if (data.status === "rate_limited") return setMessage(ui("login.rateLimited"));
    if (data.status === "unavailable") return setMessage(ui("login.unavailable"));
    setDevCode(data.devCode ?? null);
    setStep("code");
    setMessage(ui("login.codeSent"));
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) });
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    setBusy(false);
    if (data.status === "ok") return location.assign("/");
    setMessage(ui(data.status === "locked" ? "login.locked" : data.status === "expired" ? "login.expired" : "login.invalid"));
  }

  return (
    <Card>
      {step === "identifier" ? (
        <form onSubmit={request} className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-muted">{ui("login.identifier")}</span>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" inputMode="email" required className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-ink" />
          </label>
          <button className={`${buttonClass} w-full`} disabled={busy || !identifier.trim()}>{ui("login.sendCode")}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-muted">{ui("login.code")}</span>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" pattern="\d{6}" required className="mt-1 min-h-12 w-full rounded-xl border border-line bg-surface px-4 text-center font-mono text-2xl tracking-[0.4em] text-ink" />
          </label>
          {devCode && <p className="rounded-xl bg-ground p-3 text-sm text-ink" data-testid="dev-code">{ui("login.devCode", { code: devCode })}</p>}
          <button className={`${buttonClass} w-full`} disabled={busy || code.length !== 6}>{ui("login.verify")}</button>
          <button type="button" className="w-full text-sm font-semibold text-muted underline" onClick={() => { setStep("identifier"); setCode(""); setMessage(null); }}>{ui("login.otherIdentifier")}</button>
        </form>
      )}
      {message && <p role="status" className="mt-3 text-sm text-ink">{message}</p>}
    </Card>
  );
}
