"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Language } from "@taptics/i18n";
import { IconChevronRight } from "@/components/icons";
import { Card, Chip, buttonClass } from "@/components/ui";

const ROLES = ["rep", "bdc_agent", "manager", "general_manager", "content_editor", "compliance_reviewer"] as const;
type Role = (typeof ROLES)[number];
interface Person { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; status: string; roles: Role[] }

const input = "min-h-12 w-full liquid-glass-field rounded-[0.875rem] px-3 text-ink";

export function PeopleManager({ language: lang, people, me }: { language: Language; people: Person[]; me: string }) {
  const ui = (key: Parameters<typeof t>[0], values?: Record<string, string | number>) => t(key, lang, values);
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", language: lang as Language, roles: ["rep"] as Role[] });
  const [status, setStatus] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Role[]>>({});

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/people", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      const { invited } = (await res.json().catch(() => ({}))) as { invited?: string };
      // The person is added either way; only the welcome email may not have gone out.
      setStatus(ui(invited === "failed" || invited === "unavailable" ? "people.invitedNoEmail" : "people.invited", { name: form.firstName }));
      setForm({ ...form, firstName: "", lastName: "", email: "", phone: "" });
      router.refresh();
    } else setStatus(ui(res.status === 409 ? "people.taken" : "people.invalid"));
  }

  async function update(id: string, body: object) {
    const res = await fetch(`/api/people/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setStatus(res.ok ? ui("people.saved") : ((await res.json().catch(() => ({}))) as { error?: string }).error ?? ui("people.invalid"));
    if (res.ok) router.refresh();
  }

  const roleBoxes = (chosen: Role[], onChange: (r: Role[]) => void, name: string) => (
    <fieldset className="space-y-1">
      <legend className="sr-only">{ui("people.roles")}</legend>
      <div className="flex flex-wrap gap-x-4">
        {ROLES.filter((r) => r !== "general_manager").map((r) => (
          <label key={r} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="h-5 w-5" name={name} checked={chosen.includes(r)} onChange={(e) => onChange(e.target.checked ? [...chosen, r] : chosen.filter((x) => x !== r))} />
            {ui(`role.${r}`)}
          </label>
        ))}
      </div>
      {/* Admin access is a privilege any member can hold, not a job title (decision 0032). */}
      <label className="flex min-h-11 items-start gap-2 border-t border-line-soft pt-2 text-sm text-ink">
        <input type="checkbox" className="mt-0.5 h-5 w-5" name={`${name}-admin`} checked={chosen.includes("general_manager")} onChange={(e) => onChange(e.target.checked ? [...chosen, "general_manager"] : chosen.filter((x) => x !== "general_manager"))} />
        <span><span className="font-semibold">{ui("role.general_manager")}</span><span className="block text-[13px] text-muted">{ui("people.adminHint")}</span></span>
      </label>
    </fieldset>
  );

  return (
    <div className="space-y-4">
      <form onSubmit={invite}>
        <Card className="space-y-3">
          <h2 className="font-bold text-ink">{ui("people.invite")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">{ui("people.firstName")}<input className={input} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
            <label className="text-sm">{ui("people.lastName")}<input className={input} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
            <label className="text-sm">{ui("people.email")}<input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="text-sm">{ui("people.phone")}<input className={input} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          <label className="block text-sm">{ui("people.language")}
            <select className={input} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Language })}>
              <option value="en">English</option><option value="es">Español</option>
            </select>
          </label>
          {roleBoxes(form.roles, (roles) => setForm({ ...form, roles }), "invite-role")}
          <button className={`${buttonClass} w-full`}>{ui("people.add")}</button>
        </Card>
      </form>
      {status && <p role="status" className="font-semibold text-ink">{status}</p>}
      <ul className="space-y-3">
        {people.map((p) => {
          const roles = edits[p.id] ?? p.roles;
          return (
            <li key={p.id} data-testid={`person-${p.firstName}`}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-ink">{p.firstName} {p.lastName}{p.id === me ? ` (${ui("people.you")})` : ""}</p>
                  <span className={p.status === "active" ? "text-good" : "text-bad"}>{ui(p.status === "active" ? "people.active" : "people.inactive")}</span>
                </div>
                <p className="text-sm text-muted">{[p.email, p.phone].filter(Boolean).join(" · ")}</p>
                {/* Roles at a glance; changing them is one tap away instead of six checkboxes per person. */}
                <div className="flex flex-wrap gap-1.5">{p.roles.map((r) => <Chip key={r}>{ui(`role.${r}` as "role.rep")}</Chip>)}</div>
                <details className="group">
                  <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 font-semibold text-brand">{ui("people.editRoles")}<IconChevronRight size={16} className="transition-transform group-open:rotate-90" /></summary>
                  <div className="space-y-2 pt-2">
                    {roleBoxes(roles, (r) => setEdits({ ...edits, [p.id]: r }), `roles-${p.id}`)}
                    <button className="min-h-11 liquid-glass liquid-glass-flat liquid-glass-ring rounded-full px-5 font-semibold text-brand" onClick={() => update(p.id, { roles })}>{ui("people.saveRoles")}</button>
                  </div>
                </details>
                <div className="flex flex-wrap gap-2">
                  {p.id !== me && (
                    <button className="min-h-11 liquid-glass liquid-glass-flat rounded-full px-5 font-semibold text-ink" onClick={() => update(p.id, { status: p.status === "active" ? "inactive" : "active" })}>
                      {ui(p.status === "active" ? "people.deactivate" : "people.reactivate")}
                    </button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
