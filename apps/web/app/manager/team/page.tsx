import Link from "next/link";
import { coachingQuality, coachPracticeSummary, listAssignments, listSessions, teamCertification, teamOverview } from "@taptics/db";
import { t } from "@taptics/i18n";
import { coachingFocus } from "@taptics/session";
import { IconChevronRight, IconClipboard, IconTarget } from "@/components/icons";
import { Avatar, Card, Chip, ListRow, PageHeader, RowGroup, ScoreBadge, SectionTitle } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library, scheduleInputs } from "@/lib/server";

const FOCUS_TONE = { coach: "brand", extra_practice: "warn", stretch: "good", needs_scores: "neutral" } as const;

/**
 * Team view (spec 14.5): each rep's practice, certification, focus, this week's card and critical flags, as rows
 * a manager can scan on a phone. Coaching quality is private to each manager and visible to the general manager
 * (spec 14.3).
 */
export default async function Team() {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const gm = user.roles.includes("general_manager");
  const lib = library();
  const release1 = scheduleInputs().scenarios.filter((s) => s.release1).map((s) => s.code);
  const { team, quality, sessions, assignments, certified, coachPractice } = await asUser(principalOf(user), async (db) => ({
    certified: await teamCertification(db, release1),
    coachPractice: await coachPracticeSummary(db),
    assignments: await listAssignments(db, { limit: 30 }),
    team: await teamOverview(db),
    quality: (await coachingQuality(db)).filter((q) => gm || q.manager_id === user.id),
    sessions: (await listSessions(db, { limit: 20 })).filter((s) => s.userId !== user.id),
  }));
  const name = new Map(team.map((r) => [r.id, r.first_name]));
  // Spec 14.4: middle performers first, low performers flagged for extra practice.
  const focused = coachingFocus(team.map((r) => ({ ...r, avgScore: r.avg_score as number | null })));
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
  return (
    <div className="space-y-6">
      <PageHeader title={t("team.title", lang)} />
      <div className="grid grid-cols-2 gap-3">
        <Link href="/manager/assign" className="liquid-glass liquid-glass-accent liquid-glass-flat flex min-h-[52px] items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-center text-[15px] leading-tight font-semibold [&>svg]:shrink-0"><IconTarget size={18} />{t("assign.title", lang)}</Link>
        <Link href="/manager/coach" className="liquid-glass liquid-glass-flat flex min-h-[52px] items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-center text-[15px] leading-tight font-semibold [&>svg]:shrink-0 text-ink"><IconClipboard size={18} />{t("coach.title", lang)}</Link>
      </div>

      <section className="space-y-2.5">
        <SectionTitle>{t("team.reps", lang)}</SectionTitle>
        <RowGroup>
          {focused.map((r) => (
            <Link key={r.id} href={`/manager/team/${r.id}`} aria-label={r.first_name ?? ""} aria-describedby={`rep-${r.id}`} className="row-hover flex min-h-[72px] items-center gap-3 px-4 py-3">
              <Avatar name={r.first_name ?? "?"} size={44} />
              <span className="min-w-0 flex-1" id={`rep-${r.id}`}>
                <span className="block text-[16px] font-semibold text-ink">{r.first_name}</span>
                <span className="block text-[14px] text-muted">
                  {t("team.sessions", lang)}: {r.sessions_this_week} · {t("cert.team", lang)} <span data-testid={`cert-${r.first_name}`}>{certified.get(r.id) ?? 0}/{release1.length}</span>
                  {r.avg_score !== null && <> · {t("team.avg", lang)} {Math.round(r.avg_score)}</>}
                </span>
                {r.card && <span className="block truncate text-[13px] text-muted">{lib.behaviorCards.get(r.card)?.title[lang] ?? r.card} ({t(`progress.card.${r.card_status as "open"}`, lang)})</span>}
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  <Chip tone={FOCUS_TONE[r.focus as keyof typeof FOCUS_TONE] ?? "neutral"} data-testid={`focus-${r.first_name}`}>{t(`team.focus.${r.focus as "coach"}`, lang)}</Chip>
                  {r.critical_flags > 0 && <Chip tone="bad">{t("team.flagCount", lang, { n: r.critical_flags })}</Chip>}
                </span>
              </span>
              <IconChevronRight size={18} className="shrink-0 text-faint" />
            </Link>
          ))}
        </RowGroup>
      </section>

      {assignments.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("assign.list", lang)}</SectionTitle>
          <RowGroup>
            <ul className="divide-y divide-line-soft" data-testid="assignments">
              {assignments.map((a) => {
                const overdue = !a.completedAt && a.dueAt && new Date(a.dueAt) < new Date();
                return (
                  <li key={a.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0 text-[15px] text-ink">{a.firstName} · {lib.scenarios.get(a.scenarioCode)?.title[lang] ?? a.scenarioCode}</span>
                    {/* Done means passed (decision 0030); a failed attempt shows as not passed yet. */}
                    <Chip tone={a.completedAt ? "good" : overdue ? "bad" : a.attempts > 0 ? "warn" : "neutral"} className="shrink-0">
                      {a.completedAt
                        ? t("assign.statusDone", lang)
                        : overdue
                          ? t("assign.statusOverdue", lang)
                          : a.attempts > 0
                            ? a.best === null ? t("assign.statusTried", lang) : t("assign.statusNotPassed", lang, { score: Math.round(a.best) })
                            : a.dueAt ? t("assign.due.short", lang, { date: fmtDay(a.dueAt, lang) }) : t("assign.statusOpen", lang)}
                    </Chip>
                  </li>
                );
              })}
            </ul>
          </RowGroup>
        </section>
      )}

      {sessions.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("team.recent", lang)}</SectionTitle>
          <RowGroup>
            {sessions.map((s) => (
              <ListRow key={s.id} href={`/history/${s.id}`} leading={<Avatar name={name.get(s.userId) ?? "?"} size={36} />} title={name.get(s.userId) ?? "—"} subtitle={lib.scenarios.get(s.scenarioCode)?.title[lang]} trailing={<ScoreBadge total={s.total} partial={s.partial} />} />
            ))}
          </RowGroup>
        </section>
      )}

      {quality.length > 0 && <section className="space-y-2.5">
        <SectionTitle>{t("team.coaching", lang)}</SectionTitle>
        {quality.map((q) => (
          <Card key={q.manager_id} className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={q.first_name ?? "?"} size={36} />
              <p className="text-[16px] font-bold text-ink">{q.first_name}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {([
                [t("team.checks", lang), String(q.checks), undefined],
                [t("team.hours", lang), q.avg_hours === null ? "—" : q.avg_hours.toFixed(1), undefined],
                [t("team.specific", lang), pct(q.specific_share), undefined],
                [t("team.modeled", lang), pct(q.modeled_share), undefined],
                [t("coach.column", lang), coachCell(coachPractice.find((c) => c.manager_id === q.manager_id)), `coach-${q.first_name}`],
              ] as const).map(([label, value, testId]) => (
                <div key={label}>
                  <dt className="text-[13px] text-muted">{label}</dt>
                  <dd className="font-display text-[26px] leading-tight text-ink tabular-nums" data-testid={testId}>{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </section>}
    </div>
  );
}

function fmtDay(d: Date, lang: "en" | "es") {
  return new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(d));
}

function coachCell(c: { sessions: number; avg_score: number } | undefined) {
  return c ? `${c.sessions} · ${Math.round(c.avg_score)}` : "—";
}
