"use client";

import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { Card, SEGMENT_INPUT, buttonClass, fieldClass } from "@/components/ui";

const INDUSTRIES = ["cars", "homes", "solar", "furniture", "other"] as const;
type Kind = "team" | "individual";

/**
 * Two steps (decisions 0029, 0032): who you are, then the emailed code. A team needs its name; an individual
 * only themselves and their industry; someone joining through an invite link only their name and email.
 */
export function SignupForm({ language: lang, initialKind = "team", invite }: { language: Language; initialKind?: Kind; invite?: string }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const joining = Boolean(invite);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [step, setStep] = useState<"details" | "code">("details");
  const [storeName, setStoreName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>("cars");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    // A failed send or a lost connection is said plainly, and the form stays usable for another try.
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: joining ? "join" : kind, storeName, firstName, email, industry, invite, language: lang }),
    }).catch(() => null);
    const data = ((await res?.json().catch(() => ({}))) ?? {}) as { status?: string; devCode?: string };
    setBusy(false);
    if (data.status === "invalid") return setMessage(ui(kind === "team" && !joining ? "signup.invalidInput" : "signup.invalidEmail"));
    if (data.status === "invalid_link") return setMessage(ui("join.deadLink"));
    if (data.status === "rate_limited") return setMessage(ui("login.rateLimited"));
    if (data.status !== "sent") return setMessage(ui("signup.unavailable"));
    setDevCode(data.devCode ?? null);
    setStep("code");
    setMessage(ui("signup.codeSent", { email: email.trim() }));
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/signup/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, code }) }).catch(() => null);
    const data = ((await res?.json().catch(() => ({}))) ?? {}) as { status?: string };
    if (data.status === "ok") return location.assign("/consent");
    setBusy(false);
    if (!res || res.status >= 500) return setMessage(ui("login.failed"));
    setMessage(ui(data.status === "invalid_link" ? "join.deadLink" : data.status === "locked" ? "login.locked" : data.status === "expired" ? "login.expired" : "login.invalid"));
  }

  const ready = email.trim() && (joining || kind === "individual" || storeName.trim().length >= 2);
  return (
    <Card>
      {step === "details" ? (
        <form onSubmit={request} className="space-y-4">
          {!joining && (
            <fieldset className="space-y-2">
              <legend className="sr-only">{ui("signup.forWhom")}</legend>
              <div className="liquid-glass-inset grid grid-cols-2 gap-1 rounded-[1.1rem] p-1">
                {(["team", "individual"] as const).map((k) => (
                  <label key={k} className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-[0.85rem] px-2 text-center text-[15px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${kind === k ? "liquid-glass liquid-glass-flat text-ink" : "text-muted"}`}>
                    <input type="radio" name="kind" value={k} className={SEGMENT_INPUT} checked={kind === k} onChange={() => setKind(k)} />
                    {ui(k === "team" ? "signup.forTeam" : "signup.forMe")}
                  </label>
                ))}
              </div>
              <p className="px-1 text-[14px] text-muted">{ui(kind === "team" ? "signup.teamHint" : "signup.meHint")}</p>
            </fieldset>
          )}
          {!joining && kind === "team" && (
            <label className="block">
              <span className="text-[14px] font-semibold text-muted">{ui("signup.storeName")}</span>
              <input value={storeName} onChange={(e) => setStoreName(e.target.value)} required minLength={2} maxLength={120} autoComplete="organization" className={`${fieldClass} mt-1.5`} />
            </label>
          )}
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("signup.firstName")}</span>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} autoComplete="given-name" className={`${fieldClass} mt-1.5`} />
          </label>
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui(kind === "team" && !joining ? "signup.email" : "signup.emailAny")}</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={200} autoComplete="email" inputMode="email" className={`${fieldClass} mt-1.5`} />
          </label>
          {!joining && (
            <label className="block">
              <span className="text-[14px] font-semibold text-muted">{ui("signup.industry")}</span>
              <select value={industry} onChange={(e) => setIndustry(e.target.value as (typeof INDUSTRIES)[number])} className={`${fieldClass} mt-1.5`}>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{ui(`industry.${i}`)}</option>)}
              </select>
            </label>
          )}
          <button className={`${buttonClass} w-full`} disabled={busy || !ready}>{ui("signup.send")}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <label className="block">
            <span className="text-[14px] font-semibold text-muted">{ui("login.code")}</span>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" pattern="\d{6}" required className={`${fieldClass} mt-1.5 min-h-14 text-center font-mono text-2xl tracking-[0.4em]`} />
          </label>
          {devCode && <p className="liquid-glass-inset rounded-[0.875rem] p-3 text-[14px] text-ink" data-testid="dev-code">{ui("login.devCode", { code: devCode })}</p>}
          <button className={`${buttonClass} w-full`} disabled={busy || code.length !== 6}>{ui(joining ? "join.verify" : kind === "team" ? "signup.verify" : "signup.verifyMe")}</button>
          <button type="button" className="min-h-11 w-full text-[15px] font-semibold text-brand" onClick={() => { setStep("details"); setCode(""); setMessage(null); }}>{ui("signup.otherEmail")}</button>
        </form>
      )}
      {message && <p role="status" className="mt-3 text-[14px] text-ink">{message}</p>}
    </Card>
  );
}
