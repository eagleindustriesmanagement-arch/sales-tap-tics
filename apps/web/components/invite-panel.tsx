"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Language } from "@taptics/i18n";
import { IconUsers } from "@/components/icons";
import { Card, buttonClass, ghostButtonClass } from "@/components/ui";

interface Link { id: string; role: "rep" | "manager"; uses: number }

/**
 * Invite links (decision 0032): a manager makes a link, sends it any way they like, and whoever signs up through it
 * joins the team. The link is shown once (only its hash is kept); a lost one is turned off and replaced.
 */
export function InvitePanel({ language: lang, links, canInviteManagers }: { language: Language; links: Link[]; canInviteManagers: boolean }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const router = useRouter();
  const [fresh, setFresh] = useState<{ url: string; role: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function make(role: "rep" | "manager") {
    setBusy(true);
    setCopied(false);
    const res = await fetch("/api/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    setBusy(false);
    if (data.url) setFresh({ url: data.url, role });
    router.refresh();
  }
  async function revoke(id: string) {
    await fetch(`/api/invites/${id}`, { method: "DELETE" });
    router.refresh();
  }
  async function copy() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.url);
      setCopied(true);
    } catch {
      /* the link stays selectable on screen */
    }
  }
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <Card className="space-y-4" data-testid="invite-panel">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand ring-1 ring-brand/25 ring-inset"><IconUsers size={20} /></span>
        <div className="space-y-1">
          <h2 className="font-display text-[24px] leading-tight text-ink">{ui("invites.title")}</h2>
          <p className="text-[15px] text-body">{ui("invites.intro")}</p>
        </div>
      </div>
      {fresh && (
        <div className="space-y-2 rounded-[1rem] border-l-2 border-brand bg-ground p-3" role="status">
          <p className="text-[13px] font-semibold text-muted">{ui("invites.once")}</p>
          <p className="font-mono text-[14px] break-all text-ink select-all" data-testid="invite-url">{fresh.url}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${buttonClass} min-h-11 px-5 text-[15px]`} onClick={copy}>{ui(copied ? "invites.copied" : "invites.copy")}</button>
            {canShare && (
              <button type="button" className={`${ghostButtonClass} min-h-11 px-5 text-[15px]`} onClick={() => void navigator.share({ url: fresh.url }).catch(() => undefined)}>{ui("invites.share")}</button>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={`${fresh ? ghostButtonClass : buttonClass} min-h-11 px-5 text-[15px]`} onClick={() => void make("rep")}>{ui("invites.newRep")}</button>
        {canInviteManagers && <button type="button" disabled={busy} className={`${ghostButtonClass} min-h-11 px-5 text-[15px]`} onClick={() => void make("manager")}>{ui("invites.newManager")}</button>}
      </div>
      {links.length > 0 && (
        <div className="space-y-2 border-t border-line-soft pt-3">
          <p className="text-[13px] font-semibold tracking-wide text-muted uppercase">{ui("invites.active")}</p>
          <ul className="space-y-1.5">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-[15px] text-ink">
                <span>{ui("invites.linkFor", { role: ui(l.role === "manager" ? "role.manager" : "role.rep"), n: l.uses })}</span>
                <button type="button" className="min-h-11 px-2 font-semibold text-bad" onClick={() => void revoke(l.id)}>{ui("invites.revoke")}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
