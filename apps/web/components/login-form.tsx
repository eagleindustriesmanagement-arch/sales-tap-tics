"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass, fieldClass, ghostButtonClass } from "@/components/ui";

/** `demo` lists the demo store's accounts on the trial site (decision 0014): one tap signs in as that role. */
export function LoginForm({ language: lang, demo = [], demoFirst = false }: { language: Language; demo?: { identifier: string; label: string }[]; demoFirst?: boolean }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const [step, setStep] = useState<"identifier" | "code">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent | null, who = identifier) {
    e?.preventDefault();
    setBusy(true);
    setMessage(null);
    setIdentifier(who);
    // A failed request is said plainly: never "we sent a code" when none was made.
    const res = await fetch("/api/auth/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: who, language: lang }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { status?: string; devCode?: string } | undefined;
    setBusy(false);
    if (data?.status === "rate_limited") return setMessage(ui("login.rateLimited"));
    if (data?.status === "unavailable") return setMessage(ui("login.unavailable"));
    if (!res?.ok || data?.status !== "sent") return setMessage(ui("login.failed"));
    setDevCode(data.devCode ?? null);
    if (data.devCode && demo.some((d) => d.identifier === who)) setCode(data.devCode);
    setStep("code");
    setMessage(ui("login.codeSent"));
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier, code }) }).catch(() => null);
    const data = ((await res?.json().catch(() => ({}))) ?? {}) as { status?: string };
    setBusy(false);
    if (data.status === "ok") return location.assign("/today");
    if (!res || res.status >= 500) return setMessage(ui("login.failed"));
    setMessage(ui(data.status === "locked" ? "login.locked" : data.status === "expired" ? "login.expired" : "login.invalid"));
  }

  return (
    <Card>
      {step === "identifier" ? (
        <form onSubmit={request} className={`flex gap-4 ${demoFirst ? "flex-col-reverse" : "flex-col"}`}>
          <div className="space-y-3">
            {demoFirst && <p className="text-[14px] font-semibold text-muted">{ui("login.orEmail")}</p>}
            <label className="block">
              <span className="text-[14px] font-semibold text-muted">{ui("login.identifier")}</span>
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" inputMode="email" required={!demoFirst} className={`${fieldClass} mt-1.5`} type="text" />
            </label>
            <button className={`${demoFirst ? ghostButtonClass : buttonClass} w-full`} disabled={busy || !identifier.trim()}>{ui("login.sendCode")}</button>
          </div>
          {demo.length > 0 && (
            <div className={`space-y-2 ${demoFirst ? "border-b pb-4" : "border-t pt-4"} border-line-soft`} data-testid="demo-accounts">
              <p className="text-[14px] font-semibold text-muted">{ui(demoFirst ? "login.demoPick" : "login.demoTitle")}</p>
              <div className="grid gap-2">
                {demo.map((d) => (
                  <button key={d.identifier} type="button" disabled={busy} onClick={() => void request(null, d.identifier)} className={`liquid-glass ${demoFirst ? "liquid-glass-accent" : ""} liquid-glass-flat min-h-12 rounded-full px-4 text-[15px] font-semibold ${demoFirst ? "" : "text-ink"}`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("login.code")}</span>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" pattern="\d{6}" required className={`${fieldClass} mt-1.5 min-h-14 text-center font-mono text-2xl tracking-[0.4em]`} />
          </label>
          {devCode && <p className="liquid-glass-inset rounded-[0.875rem] p-3 text-[14px] text-ink" data-testid="dev-code">{ui(demo.some((d) => d.identifier === identifier) ? "login.demoCode" : "login.devCode", { code: devCode })}</p>}
          <button className={`${buttonClass} w-full`} disabled={busy || code.length !== 6}>{ui("login.verify")}</button>
          <button type="button" className="min-h-11 w-full text-[15px] font-semibold text-brand" onClick={() => { setStep("identifier"); setCode(""); setMessage(null); }}>{ui("login.otherIdentifier")}</button>
        </form>
      )}
      {message && <p role="status" className="mt-3 text-[14px] text-ink">{message}</p>}
    </Card>
  );
}
