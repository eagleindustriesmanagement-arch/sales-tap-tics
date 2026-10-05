import { usageSummary } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card, PageHeader, Stat } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { aiConfigured, language } from "@/lib/server";

/** Model cost and health for the store (M7): spend, cost per session, latency and failures, by day and purpose. */
export default async function Costs() {
  const user = await requireUser({ roles: ["general_manager"] });
  const lang = await language();
  const { rows, sessions } = await asUser(principalOf(user), (db) => usageSummary(db, 30));
  const total = rows.reduce((s, r) => s + r.costUsd, 0);
  const calls = rows.reduce((s, r) => s + r.calls, 0);
  const failures = rows.reduce((s, r) => s + r.failures, 0);
  const usd = (n: number) => new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 }).format(n);
  return (
    <div className="space-y-4">
      <PageHeader title={t("costs.title", lang)} subtitle={aiConfigured() ? undefined : t("costs.offline", lang)} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("costs.total", lang)} value={usd(total)} testId="cost-total" />
        <Stat label={t("costs.perSession", lang)} value={sessions ? usd(total / sessions) : "—"} testId="cost-per-session" />
        <Stat label={t("costs.calls", lang)} value={calls} />
        <Stat label={t("costs.failures", lang)} value={calls ? `${Math.round((failures / calls) * 100)}%` : "—"} tone={failures ? "bad" : undefined} testId="cost-failures" />
      </div>
      {rows.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("costs.title", lang)}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium">
              <tr><th className="py-2 pr-3">{t("costs.day", lang)}</th><th className="pr-3">{t("costs.purpose", lang)}</th><th className="pr-3">{t("costs.model", lang)}</th><th className="pr-3">{t("costs.calls", lang)}</th><th className="pr-3">{t("costs.cost", lang)}</th><th>{t("costs.latency", lang)}</th></tr>
            </thead>
            <tbody className="divide-y divide-line-soft text-ink">
              {rows.map((r) => (
                <tr key={`${r.day}${r.purpose}${r.model}`}>
                  <td className="py-2 pr-3 whitespace-nowrap">{dayLabel(r.day, lang)}</td><td className="pr-3">{(["customer", "judge", "classifier", "unlock"] as const).includes(r.purpose as "judge") ? t(`costs.purpose.${r.purpose as "judge"}`, lang) : r.purpose}</td><td className="pr-3 font-mono text-xs">{r.model}</td>
                  <td className="pr-3">{r.calls}{r.failures ? ` (${r.failures} ✗)` : ""}</td><td className="pr-3">{usd(r.costUsd)}</td><td>{r.p50Ms ?? "—"} / {r.p95Ms ?? "—"} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/** A calendar day ("2026-10-05") as the rest of the app writes it: "Oct 5" / "5 oct". */
const dayLabel = (d: string | Date, lang: "en" | "es") =>
  new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(typeof d === "string" ? `${d.slice(0, 10)}T12:00:00Z` : d));
