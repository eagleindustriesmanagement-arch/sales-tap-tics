"use client";

import { useEffect, useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { smallButtonClass } from "@/components/ui";

type State = "checking" | "unsupported" | "blocked" | "off" | "on" | "busy";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Practice reminders on this phone by Web Push (decision 0022). On iPhone it needs the app on the Home Screen. */
export function ReminderPush({ language: lang, publicKey }: { language: Language; publicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const ui = (key: Parameters<typeof t>[0]) => t(key, lang);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
    if (Notification.permission === "denied") return setState("blocked");
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setState("busy");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) }).catch(() => null);
      setState(res?.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  async function turnOff() {
    setState("busy");
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => null);
        await sub.unsubscribe();
      }
    } finally {
      setState("off");
    }
  }

  if (state === "checking") return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line-soft pt-3" data-testid="reminder-push">
      <p className="min-w-0 text-[14px] text-muted">
        {state === "on" ? ui("settings.push.on") : state === "unsupported" ? ui("settings.push.unsupported") : state === "blocked" ? ui("settings.push.blocked") : ui("settings.push.off")}
      </p>
      {(state === "on" || state === "off" || state === "busy") && (
        <button type="button" className={`${smallButtonClass} shrink-0`} disabled={state === "busy"} onClick={state === "on" ? turnOff : turnOn}>
          {state === "on" ? ui("settings.push.turnOff") : ui("settings.push.turnOn")}
        </button>
      )}
    </div>
  );
}
