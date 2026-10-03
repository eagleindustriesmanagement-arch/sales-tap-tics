import { usageSummary } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card } from "@/components/ui";
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
      <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">{t("costs.title", lang)}</h1>
      {!aiConfigured() && <p className="text-muted">{t("costs.offline", lang)}</p>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><p className="text-sm text-muted">{t("costs.total", lang)}</p><p className="text-xl font-bold text-ink" data-testid="cost-total">{usd(total)}</p></Card>
        <Card><p className="text-sm text-muted">{t("costs.perSession", lang)}</p><p className="text-xl font-bold text-ink" data-testid="cost-per-session">{sessions ? usd(total / sessions) : "—"}</p></Card>
        <Card><p className="text-sm text-muted">{t("costs.calls", lang)}</p><p className="text-xl font-bold text-ink">{calls}</p></Card>
        <Card><p className="text-sm text-muted">{t("costs.failures", lang)}</p><p className={`text-xl font-bold ${failures ? "text-bad" : "text-ink"}`} data-testid="cost-failures">{calls ? `${Math.round((failures / calls) * 100)}%` : "—"}</p></Card>
      </div>
      {rows.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("costs.title", lang)}>
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr><th className="py-2 pr-3">{t("costs.day", lang)}</th><th className="pr-3">{t("costs.purpose", lang)}</th><th className="pr-3">{t("costs.model", lang)}</th><th className="pr-3">{t("costs.calls", lang)}</th><th className="pr-3">{t("costs.cost", lang)}</th><th>{t("costs.latency", lang)}</th></tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {rows.map((r) => (
                <tr key={`${r.day}${r.purpose}${r.model}`}>
                  <td className="py-2 pr-3">{r.day}</td><td className="pr-3">{r.purpose}</td><td className="pr-3 font-mono text-xs">{r.model}</td>
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
