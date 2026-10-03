"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass, fieldClass } from "@/components/ui";

/** Two steps: who and which store, then the emailed code (decision 0029). */
export function SignupForm({ language: lang }: { language: Language }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [step, setStep] = useState<"details" | "code">("details");
  const [storeName, setStoreName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ storeName, firstName, email, language: lang }) });
    const data = (await res.json().catch(() => ({}))) as { status?: string; devCode?: string };
    setBusy(false);
    if (data.status === "invalid") return setMessage(ui("signup.invalidInput"));
    if (data.status === "rate_limited") return setMessage(ui("login.rateLimited"));
    if (data.status !== "sent") return setMessage(ui("signup.unavailable"));
    setDevCode(data.devCode ?? null);
    setStep("code");
    setMessage(ui("signup.codeSent", { email: email.trim() }));
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/signup/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) });
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    if (data.status === "ok") return location.assign("/consent");
    setBusy(false);
    setMessage(ui(data.status === "locked" ? "login.locked" : data.status === "expired" ? "login.expired" : "login.invalid"));
  }

  return (
    <Card>
      {step === "details" ? (
        <form onSubmit={request} className="space-y-4">
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("signup.storeName")}</span>
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required minLength={2} maxLength={120} autoComplete="organization" className={`${fieldClass} mt-1.5`} />
          </label>
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("signup.firstName")}</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} autoComplete="given-name" className={`${fieldClass} mt-1.5`} />
          </label>
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("signup.email")}</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={200} autoComplete="email" inputMode="email" className={`${fieldClass} mt-1.5`} />
          </label>
          <button className={`${buttonClass} w-full`} disabled={busy || storeName.trim().length < 2 || !email.trim()}>{ui("signup.send")}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("login.code")}</span>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" pattern="\d{6}" required className={`${fieldClass} mt-1.5 min-h-14 text-center font-mono text-2xl tracking-[0.4em]`} />
          </label>
          {devCode && <p className="liquid-glass-inset rounded-[0.875rem] p-3 text-[14px] text-ink" data-testid="dev-code">{ui("login.devCode", { code: devCode })}</p>}
          <button className={`${buttonClass} w-full`} disabled={busy || code.length !== 6}>{ui("signup.verify")}</button>
          <button type="button" className="min-h-11 w-full text-[15px] font-semibold text-brand" onClick={() => { setStep("details"); setCode(""); setMessage(null); }}>{ui("signup.otherEmail")}</button>
        </form>
      )}
      {message && <p role="status" className="mt-3 text-[14px] text-ink">{message}</p>}
    </Card>
  );
}
