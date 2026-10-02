import Link from "next/link";
import { coachingQuality, listAssignments, listSessions, teamOverview } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card, buttonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

/**
 * Team view (spec 14.5): each rep's practice, average of complete scores, this week's card and critical flags.
 * Coaching quality is private to each manager and visible to the general manager (spec 14.3).
 */
export default async function Team() {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const gm = user.roles.includes("general_manager");
  const { team, quality, sessions, assignments } = await asUser(principalOf(user), async (db) => ({
    assignments: await listAssignments(db, { limit: 30 }),
    team: await teamOverview(db),
    quality: (await coachingQuality(db)).filter((q) => gm || q.manager_id === user.id),
    sessions: (await listSessions(db, { limit: 20 })).filter((s) => s.userId !== user.id),
  }));
  const name = new Map(team.map((r) => [r.id, r.first_name]));
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t("team.title", lang)}</h1>
        <Link href="/manager/assign" className={buttonClass}>{t("assign.title", lang)}</Link>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="py-2 pr-3">{t("team.rep", lang)}</th><th className="pr-3">{t("team.sessions", lang)}</th><th className="pr-3">{t("team.avg", lang)}</th><th className="pr-3">{t("team.card", lang)}</th><th>{t("team.flags", lang)}</th></tr></thead>
          <tbody className="divide-y divide-line text-ink">
            {team.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-3 font-semibold">{r.first_name}</td>
                <td className="pr-3">{r.sessions_this_week}</td>
                <td className="pr-3">{r.avg_score === null ? "—" : Math.round(r.avg_score)}</td>
                <td className="pr-3">{r.card ? `${library().behaviorCards.get(r.card)?.title[lang] ?? r.card} (${r.card_status})` : "—"}</td>
                <td className={r.critical_flags > 0 ? "font-bold text-bad" : ""}>{r.critical_flags}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {assignments.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold text-ink">{t("assign.list", lang)}</h2>
          <ul className="divide-y divide-line" data-testid="assignments">
            {assignments.map((a) => {
              const overdue = !a.completedAt && a.dueAt && new Date(a.dueAt) < new Date();
              return (
                <li key={a.id} className="flex min-h-12 items-center justify-between gap-3 text-ink">
                  <span>{a.firstName} · {library().scenarios.get(a.scenarioCode)?.title[lang] ?? a.scenarioCode}</span>
                  <span className={a.completedAt ? "text-good" : overdue ? "font-semibold text-bad" : "text-muted"}>
                    {a.completedAt ? t("assign.statusDone", lang) : overdue ? t("assign.statusOverdue", lang) : a.dueAt ? t("assign.due.short", lang, { date: fmtDay(a.dueAt, lang) }) : t("assign.statusOpen", lang)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {sessions.length > 0 && (
        <Card>
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id}><Link href={`/history/${s.id}`} className="flex min-h-12 items-center justify-between gap-3 text-ink"><span>{name.get(s.userId) ?? "—"} · {library().scenarios.get(s.scenarioCode)?.title[lang]}</span><span className="font-mono">{s.total === null ? "—" : Math.round(s.total)}{s.partial ? "*" : ""}</span></Link></li>
            ))}
          </ul>
        </Card>
      )}
      <Card className="overflow-x-auto">
        <h2 className="mb-2 font-bold text-ink">{t("team.coaching", lang)}</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="py-2 pr-3">{t("nav.team", lang)}</th><th className="pr-3">{t("team.checks", lang)}</th><th className="pr-3">{t("team.hours", lang)}</th><th className="pr-3">{t("team.specific", lang)}</th><th>{t("team.modeled", lang)}</th></tr></thead>
          <tbody className="divide-y divide-line text-ink">
            {quality.map((q) => (
              <tr key={q.manager_id}><td className="py-2 pr-3 font-semibold">{q.first_name}</td><td className="pr-3">{q.checks}</td><td className="pr-3">{q.avg_hours === null ? "—" : q.avg_hours.toFixed(1)}</td><td className="pr-3">{pct(q.specific_share)}</td><td>{pct(q.modeled_share)}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function fmtDay(d: Date, lang: "en" | "es") {
  return new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(d));
}
