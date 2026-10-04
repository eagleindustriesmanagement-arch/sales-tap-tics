"use client";

import { useEffect, useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { CLIENT_BUILD } from "@/lib/voice/diagnostics";

/**
 * Keeps phones on the current release (October 4). iPhone keeps a tab or a Home Screen app alive for days on the
 * code it first loaded, so a fix can be live and still not reach the rep. When the server's build differs, the app
 * reloads, except during a live conversation, where it offers the reload instead of cutting the rep off.
 */
export function UpdateCheck({ language }: { language: Language }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (CLIENT_BUILD === "dev") return;
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const res = await fetch("/api/version", { cache: "no-store" }).catch(() => null);
      const body = (await res?.json().catch(() => null)) as { build?: string } | null;
      if (stopped || !body?.build || body.build === "dev" || body.build === CLIENT_BUILD) return;
      if (document.documentElement.dataset.liveSession === "1") setReady(true);
      else location.reload();
    };
    void check();
    const onVisible = () => { void check(); };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => { void check(); }, 5 * 60_000);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);
  if (!ready) return null;
  return (
    <div role="status" data-testid="update-ready" className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-brand-soft px-4 py-2 text-[14px] text-ink pt-safe">
      <span>{t("update.ready", language)}</span>
      <button type="button" className="font-semibold text-brand underline" onClick={() => location.reload()}>{t("update.reload", language)}</button>
    </div>
  );
}
