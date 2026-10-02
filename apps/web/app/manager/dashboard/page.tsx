import Link from "next/link";
import { coachingQuality, storeDashboard } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, scheduleInputs } from "@/lib/server";

/** Store dashboard (spec 18.3): return on training, for the general manager. */
export default async function Dashboard() {
  const user = await requireUser({ roles: ["general_manager"] });
  const lang = await language();
  const release1 = scheduleInputs().scenarios.filter((s) => s.release1).map((s) => s.code);
  const { d, quality } = await asUser(principalOf(user), async (db) => ({ d: await storeDashboard(db, release1), quality: await coachingQuality(db) }));
  const thisWeek = d.weeks.at(-1)!;
  const last4 = d.weeks.slice(-4);
  const issued = last4.reduce((n, w) => n + w.cardsIssued, 0);
  const checked = last4.reduce((n, w) => n + w.cardsChecked, 0);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
  const fmtWeek = (w: string) => new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${w}T00:00:00Z`));
  const link = "inline-flex min-h-12 items-center rounded-xl border border-line px-4 font-semibold text-ink";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("dash.title", lang)}</h1>
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><p className="text-sm text-muted">{t("dash.certified", lang)}</p><p className="text-xl font-bold text-ink" data-testid="dash-certified">{d.certified}/{d.reps}</p></Card>
        <Card><p className="text-sm text-muted">{t("dash.practicing", lang)}</p><p className="text-xl font-bold text-ink" data-testid="dash-practicing">{thisWeek.repsPracticing}/{d.reps}</p></Card>
        <Card><p className="text-sm text-muted">{t("dash.checks", lang)}</p><p className="text-xl font-bold text-ink" data-testid="dash-checks">{pct(checked, issued)}</p></Card>
        <Card><p className="text-sm text-muted">{t("dash.flags", lang)}</p><p className={`text-xl font-bold ${thisWeek.criticalFlags ? "text-bad" : "text-ink"}`} data-testid="dash-flags">{thisWeek.criticalFlags}</p></Card>
      </div>
      <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("dash.byWeek", lang)}>
        <h2 className="mb-2 font-bold text-ink">{t("dash.byWeek", lang)}</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="py-2 pr-3">{t("dash.week", lang)}</th><th className="pr-3">{t("dash.sessions", lang)}</th><th className="pr-3">{t("dash.reps", lang)}</th><th className="pr-3">{t("dash.cards", lang)}</th><th>{t("dash.critical", lang)}</th></tr></thead>
          <tbody className="divide-y divide-line text-ink">
            {[...d.weeks].reverse().map((w) => (
              <tr key={w.week}><td className="py-2 pr-3">{fmtWeek(w.week)}</td><td className="pr-3">{w.sessions}</td><td className="pr-3">{w.repsPracticing}</td><td className="pr-3">{w.cardsChecked}/{w.cardsIssued}</td><td>{w.criticalFlags}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      {quality.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold text-ink">{t("team.coaching", lang)}</h2>
          <ul className="space-y-1 text-sm">{quality.map((q) => <li key={q.manager_id} className="flex justify-between"><span className="text-ink">{q.first_name}</span><span className="text-muted">{q.checks}</span></li>)}</ul>
        </Card>
      )}
      <nav aria-label={t("dash.more", lang)} className="flex flex-wrap gap-2">
        <Link href="/manager/compliance" className={link}>{t("nav.compliance.view", lang)}</Link>
        <Link href="/manager/people" className={link}>{t("people.title", lang)}</Link>
        <Link href="/manager/baseline" className={link}>{t("baseline.title", lang)}</Link>
        <Link href="/manager/costs" className={link}>{t("costs.title", lang)}</Link>
        <Link href="/manager/audit" className={link}>{t("audit.title", lang)}</Link>
        <a href="/api/export" className={link} download>{t("dash.export", lang)}</a>
      </nav>
    </div>
  );
}
