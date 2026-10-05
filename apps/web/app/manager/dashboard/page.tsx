import { coachingQuality, storeDashboard } from "@taptics/db";
import { t } from "@taptics/i18n";
import { IconAlert, IconChart, IconChevronRight, IconClipboard, IconShield, IconStore, IconTrophy, IconUpload, IconUsers } from "@/components/icons";
import { PrivateWindowNote } from "@/components/private-window-note";
import { Avatar, Card, ListRow, PageHeader, RowGroup, SectionTitle, Stat } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, scheduleInputs } from "@/lib/server";
import { dateFormat } from "@/lib/dates";

/** Store dashboard (spec 18.3): return on training, for the general manager. The four numbers first, the trend under them. */
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
  const fmtWeek = (w: string) => dateFormat(lang, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${w}T00:00:00Z`));
  const maxSessions = Math.max(1, ...d.weeks.map((w) => w.sessions));
  const tile = "grid h-9 w-9 place-items-center rounded-[10px] ring-1 ring-current/20 ring-inset";
  return (
    <div className="space-y-6">
      <PageHeader title={t(user.industry === "cars" || user.industry === "other" ? "dash.title" : "dash.titleCompany", lang)} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(user.industry === "cars" || user.industry === "other") && <Stat label={t("dash.certified", lang)} value={`${d.certified}/${d.reps}`} testId="dash-certified" icon={<IconTrophy size={15} className="text-brand" />} />}
        <Stat label={t("dash.practicing", lang)} value={`${thisWeek.repsPracticing}/${d.reps}`} testId="dash-practicing" icon={<IconUsers size={15} className="text-brand" />} />
        <Stat label={t("dash.checks", lang)} value={pct(checked, issued)} testId="dash-checks" icon={<IconClipboard size={15} className="text-brand" />} />
        <Stat label={t("dash.flags", lang)} value={thisWeek.criticalFlags} tone={thisWeek.criticalFlags ? "bad" : undefined} testId="dash-flags" icon={<IconAlert size={15} className={thisWeek.criticalFlags ? "text-bad" : "text-muted"} />} />
      </div>
      {/* Usage counts private sessions; these numbers wait for the rep's private window (spec 3.3). */}
      <PrivateWindowNote hours={user.privateWindowHours} lang={lang} />

      <section className="space-y-2.5">
        <SectionTitle>{t("dash.byWeek", lang)}</SectionTitle>
        <Card className="space-y-4">
          <div className="flex h-36 items-end gap-2" role="img" aria-label={d.weeks.map((w) => `${fmtWeek(w.week)}: ${w.sessions}`).join(", ")}>
            {d.weeks.map((w, i) => (
              <div key={w.week} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[12px] font-semibold text-ink tabular-nums">{w.sessions || ""}</span>
                <span className={`col-grow w-full rounded-t-[6px] ${i === d.weeks.length - 1 ? "fill-gold" : "fill-gold-dim"}`} style={{ height: `${Math.max(3, (w.sessions / maxSessions) * 100)}%`, ["--i" as string]: i }} />
                <span className="text-[11px] whitespace-nowrap text-muted">{fmtWeek(w.week)}</span>
              </div>
            ))}
          </div>
          <details className="group border-t border-line-soft pt-3">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-ink">{t("dash.sessions", lang)} · {t("dash.cards", lang)} · {t("dash.critical", lang)}<IconChevronRight size={16} className="text-muted transition-transform group-open:rotate-90" /></summary>
            <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={t("dash.byWeek", lang)}>
              <table className="w-full text-left text-[14px]">
                <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium"><tr><th className="py-2 pr-3 font-medium">{t("dash.week", lang)}</th><th className="pr-3 font-medium">{t("dash.sessions", lang)}</th><th className="pr-3 font-medium">{t("dash.reps", lang)}</th><th className="pr-3 font-medium">{t("dash.cards", lang)}</th><th className="font-medium">{t("dash.critical", lang)}</th></tr></thead>
                <tbody className="divide-y divide-line-soft text-ink tabular-nums">
                  {[...d.weeks].reverse().map((w) => (
                    <tr key={w.week}><td className="py-2 pr-3">{fmtWeek(w.week)}</td><td className="pr-3">{w.sessions}</td><td className="pr-3">{w.repsPracticing}</td><td className="pr-3">{w.cardsChecked}/{w.cardsIssued}</td><td className={w.criticalFlags ? "font-semibold text-bad" : ""}>{w.criticalFlags}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      </section>

      {quality.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("team.coaching", lang)}</SectionTitle>
          <RowGroup>
            {quality.map((q) => (
              <div key={q.manager_id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <Avatar name={q.first_name ?? "?"} size={36} />
                <span className="flex-1 text-[16px] font-semibold text-ink">{q.first_name}</span>
                <span className="text-[14px] text-muted">{t("team.checks", lang)} <span className="font-bold text-ink tabular-nums">{q.checks}</span></span>
              </div>
            ))}
          </RowGroup>
        </section>
      )}

      <nav aria-label={t("dash.more", lang)} className="space-y-2.5">
        <SectionTitle>{t("dash.more", lang)}</SectionTitle>
        <RowGroup>
          <ListRow href="/manager/compliance" leading={<span className={`${tile} bg-bad-soft text-bad`}><IconShield size={18} /></span>} title={t("nav.compliance.view", lang)} />
          <ListRow href="/manager/people" leading={<span className={`${tile} bg-brand-soft text-brand`}><IconUsers size={18} /></span>} title={t("people.title", lang)} />
          <ListRow href="/manager/baseline" leading={<span className={`${tile} bg-brand-soft text-brand`}><IconStore size={18} /></span>} title={t("baseline.title", lang)} />
          <ListRow href="/manager/usage" leading={<span className={`${tile} bg-brand-soft text-brand`}><IconChart size={18} /></span>} title={t("usage.title", lang)} />
          <ListRow href="/manager/costs" leading={<span className={`${tile} bg-brand-soft text-brand`}><IconChart size={18} /></span>} title={t("costs.title", lang)} />
          <ListRow href="/manager/audit" leading={<span className={`${tile} bg-ground text-muted`}><IconClipboard size={18} /></span>} title={t("audit.title", lang)} />
          <a href="/api/export" download className="row-hover flex min-h-16 items-center gap-3 px-4 py-2.5">
            <span className={`${tile} bg-ground text-muted`}><IconUpload size={18} className="rotate-180" /></span>
            <span className="flex-1 text-[16px] font-semibold text-ink">{t("dash.export", lang)}</span>
          </a>
        </RowGroup>
      </nav>
    </div>
  );
}
