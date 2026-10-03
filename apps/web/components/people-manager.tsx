"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Language } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";

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
      setStatus(ui("people.invited", { name: form.firstName }));
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
    <fieldset className="flex flex-wrap gap-x-4">
      <legend className="sr-only">{ui("people.roles")}</legend>
      {ROLES.map((r) => (
        <label key={r} className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="h-5 w-5" name={name} checked={chosen.includes(r)} onChange={(e) => onChange(e.target.checked ? [...chosen, r] : chosen.filter((x) => x !== r))} />
          {ui(`role.${r}`)}
        </label>
      ))}
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
                {roleBoxes(roles, (r) => setEdits({ ...edits, [p.id]: r }), `roles-${p.id}`)}
                <div className="flex flex-wrap gap-2">
                  <button className="min-h-11 liquid-glass liquid-glass-flat liquid-glass-ring rounded-full px-5 font-semibold text-brand" onClick={() => update(p.id, { roles })}>{ui("people.saveRoles")}</button>
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
