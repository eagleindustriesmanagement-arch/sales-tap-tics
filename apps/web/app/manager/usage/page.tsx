import { notFound } from "next/navigation";
import { storeUsage } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

const DAYS = 28;

/**
 * Usage (spec 19.4, decision 0020): how the store uses the app over the last 4 weeks, for the general manager.
 * Counts and averages from the app's own tables, never conversation text.
 */
export default async function Usage() {
  const user = await requireUser({ roles: ["general_manager"] });
  if (!user.storeId) notFound();
  const lang = await language();
  const since = new Date(Date.now() - DAYS * 86_400_000);
  const u = await asUser(principalOf(user), (db) => storeUsage(db, user.storeId!, since));
  if (!u) notFound();
  const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");
  const num = (n: number | null, digits = 0) => (n === null ? "—" : new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", { maximumFractionDigits: digits }).format(Number(n)));
  const usd = (n: number | null) => (n === null ? "—" : new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(Number(n)));
  const demos = u.demo_watched + u.demo_skipped;
  const conf = (["en", "es"] as const).map((l) => `${l.toUpperCase()} ${u.asr_confidence[l] === undefined ? "—" : `${Math.round(u.asr_confidence[l]! * 100)}%`}`).join(" · ");
  return (
    <div className="space-y-6">
      <PageHeader title={t("usage.title", lang)} subtitle={t("usage.intro", lang, { days: DAYS })} back={{ href: "/manager/dashboard", label: t("nav.dashboard", lang) }} />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="usage-stats">
        <Stat label={t("usage.started", lang)} value={u.sessions_started} testId="usage-started" />
        <Stat label={t("usage.completed", lang)} value={pct(u.sessions_completed, u.sessions_started)} testId="usage-completed" />
        <Stat label={t("usage.active7", lang)} value={`${u.active_reps_7d}/${u.reps}`} testId="usage-active" />
        <Stat label={t("usage.dailyActive", lang)} value={num(u.avg_daily_active_reps, 1)} />
        <Stat label={t("usage.debriefs", lang)} value={pct(u.debriefs_seen, u.sessions_completed)} testId="usage-debriefs" />
        <Stat label={t("usage.demos", lang)} value={pct(u.demo_watched, demos)} testId="usage-demos" />
        <Stat label={t("usage.cards", lang)} value={`${u.cards_checked}/${u.cards_issued}`} />
        <Stat label={t("usage.firstSession", lang)} value={u.median_hours_to_first_session === null ? "—" : t("usage.hours", lang, { n: num(u.median_hours_to_first_session, 1) })} />
        <Stat label={t("usage.never", lang)} value={u.reps_never_practiced} tone={u.reps_never_practiced ? "warn" : undefined} />
        <Stat label={t("usage.spoken", lang)} value={pct(u.voice_sessions, u.sessions_started)} />
        <Stat label={t("usage.pause", lang)} value={u.pause_ms_median === null ? "—" : t("usage.seconds", lang, { n: num(u.pause_ms_median / 1000, 1) })} />
        <Stat label={t("usage.costPerSession", lang)} value={usd(u.model_cost_per_session)} />
      </section>
      {/* The team screens wait for each rep's private window; this page counts those sessions too (spec 3.3). */}
      {user.privateWindowHours > 0 && <p className="px-1 text-[14px] text-muted" data-testid="usage-private-note">{t("usage.privateNote", lang)}</p>}
      <Card className="space-y-1">
        <p className="text-[14px] font-semibold text-muted">{t("usage.confidence", lang)}</p>
        <p className="text-ink tabular-nums">{conf}</p>
      </Card>
      {u.weeks.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("usage.byWeek", lang)}</SectionTitle>
          <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("usage.byWeek", lang)}>
            <table className="w-full text-left text-sm" data-testid="usage-weeks">
              <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium"><tr><th className="py-2 pr-3">{t("usage.week", lang)}</th><th className="pr-3">{t("usage.started", lang)}</th><th className="pr-3">{t("usage.done", lang)}</th><th>{t("usage.reps", lang)}</th></tr></thead>
              <tbody className="divide-y divide-line-soft text-ink tabular-nums">
                {u.weeks.map((w) => <tr key={w.week}><td className="py-2 pr-3 whitespace-nowrap">{dayLabel(w.week, lang)}</td><td className="pr-3">{w.started}</td><td className="pr-3">{w.completed}</td><td>{w.active_reps}</td></tr>)}
              </tbody>
            </table>
          </Card>
        </section>
      )}
      {Object.keys(u.latency_ms).length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("usage.latency", lang)}</SectionTitle>
          <Card className="space-y-1.5">
            {Object.entries(u.latency_ms).map(([purpose, l]) => (
              <p key={purpose} className="flex justify-between gap-3 text-ink tabular-nums">
                <span>{purpose}</span>
                <span>{t("usage.latencyRow", lang, { median: num(l.median), first: num(l.first_token), calls: l.calls })}</span>
              </p>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

/** A calendar day ("2026-10-05") as the rest of the app writes it: "Oct 5" / "5 oct". */
const dayLabel = (d: string | Date, lang: "en" | "es") =>
  new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(typeof d === "string" ? `${d.slice(0, 10)}T12:00:00Z` : d));
