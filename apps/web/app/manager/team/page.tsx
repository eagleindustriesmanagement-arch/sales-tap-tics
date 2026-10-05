import Link from "next/link";
import { coachingQuality, coachPracticeSummary, isAdmin, listAssignments, listInviteLinks, listSessions, teamCertification, teamOverview } from "@taptics/db";
import { t } from "@taptics/i18n";
import { coachingFocus } from "@taptics/session";
import { IconChevronRight, IconClipboard, IconTarget, IconUsers } from "@/components/icons";
import { InvitePanel } from "@/components/invite-panel";
import { Avatar, Card, Chip, Empty, ListRow, PageHeader, RowGroup, ScoreBadge, WarmUpTag, SectionTitle, buttonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { madeWhen } from "@/lib/made-when";
import { language, library, scheduleInputs } from "@/lib/server";

const FOCUS_TONE = { coach: "brand", extra_practice: "warn", stretch: "good", needs_scores: "neutral" } as const;

/**
 * Team view (spec 14.5): each rep's practice, certification, focus, this week's card and critical flags, as rows
 * a manager can scan on a phone. Coaching quality is private to each manager and visible to the general manager
 * (spec 14.3).
 */
export default async function Team({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser({ manager: true });
  const welcome = (await searchParams).welcome === "1";
  const lang = await language();
  const gm = user.roles.includes("general_manager");
  const lib = library();
  const release1 = scheduleInputs().scenarios.filter((s) => s.release1).map((s) => s.code);
  const { team, quality, sessions, assignments, certified, coachPractice, invites } = await asUser(principalOf(user), async (db) => ({
    invites: (user.storeId ? await listInviteLinks(db, user.storeId) : []).map((l) => ({ id: l.id, role: l.role, uses: l.uses, made: madeWhen(l.createdAt, lang) })),
    certified: await teamCertification(db, release1),
    coachPractice: await coachPracticeSummary(db),
    assignments: await listAssignments(db, { limit: 30 }),
    team: await teamOverview(db),
    quality: (await coachingQuality(db)).filter((q) => gm || q.manager_id === user.id),
    sessions: await listSessions(db, { limit: 20 }),
  }));
  const name = new Map(team.map((r) => [r.id, r.first_name]));
  // The team's sessions only: another manager's own practice is not a rep's session (it showed as "?" with no name).
  const teamSessions = sessions.filter((s) => name.has(s.userId));
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

      {welcome && focused.length === 0 && (
        <Card className="space-y-1.5" data-testid="welcome">
          <h2 className="font-display text-[26px] leading-tight text-ink">{t("team.welcomeTitle", lang)}</h2>
          <p className="text-body">{t("team.welcomeBody", lang)}</p>
        </Card>
      )}
      {/* Invite links (decision 0032): first thing a new team sees, always one tap away after that. */}
      {focused.length === 0 && <InvitePanel language={lang} links={invites} canInviteManagers={isAdmin(user)} />}
      <section className="space-y-2.5">
        <SectionTitle>{t("team.reps", lang)}</SectionTitle>
        <RowGroup>
          {/* A new store has nobody yet: say what to do next rather than show an empty list. */}
          {focused.length === 0 && (
            <Empty icon={<IconUsers size={22} />} action={gm ? <Link href="/manager/people" className={buttonClass}>{t("team.addPeople", lang)}</Link> : undefined}>
              {t(gm ? "team.emptyGm" : "team.emptyManager", lang)}
            </Empty>
          )}
          {focused.map((r) => (
            <Link key={r.id} href={`/manager/team/${r.id}`} aria-label={r.first_name ?? ""} aria-describedby={`rep-${r.id}`} className="row-hover flex min-h-[72px] items-center gap-3 px-4 py-3">
              <Avatar name={r.first_name ?? "?"} size={44} />
              <span className="min-w-0 flex-1" id={`rep-${r.id}`}>
                <span className="block text-[16px] font-semibold text-ink">{r.first_name}</span>
                <span className="block text-[14px] text-muted">
                  {t("team.sessions", lang)}: {r.sessions_this_week}
                  {/* Certification is the car path (decision 0033): a solar, homes or furniture team has none to count. */}
                  {(user.industry === "cars" || user.industry === "other") && <> · {t("cert.team", lang)} <span data-testid={`cert-${r.first_name}`}>{certified.get(r.id) ?? 0}/{release1.length}</span></>}
                  {r.avg_score !== null && <> · {t("team.avg", lang)} {Math.round(r.avg_score)}</>}
                </span>
                {r.card && <span className="block text-[13px] text-muted">{lib.behaviorCards.get(r.card)?.title[lang] ?? r.card} ({t(`progress.card.${r.card_status as "open"}`, lang)})</span>}
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
                  <li key={a.id} className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-2.5">
                    {/* The status wraps under the name on a phone instead of squeezing it to one word a line. */}
                    <span className="min-w-0 flex-1 basis-48 text-[15px] text-ink">{a.firstName} · {lib.scenarios.get(a.scenarioCode)?.title[lang] ?? a.scenarioCode}</span>
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

      {teamSessions.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("team.recent", lang)}</SectionTitle>
          <RowGroup>
            {teamSessions.map((s) => (
              <ListRow key={s.id} href={`/history/${s.id}`} leading={<Avatar name={name.get(s.userId) ?? "?"} size={36} />} title={name.get(s.userId) ?? "—"} subtitle={lib.scenarios.get(s.scenarioCode)?.title[lang]} trailing={s.mode === "warm_up" && s.total !== null ? <WarmUpTag label={t("warmup.listLabel", lang)} /> : <ScoreBadge total={s.total} partial={s.partial} />} />
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
            {/* One row per measure, label left and value right in plain bold numbers (the Panel's style): the display
                serif's "1" read as a stroke and wrapped labels put values beside the wrong label (October 5 report). */}
            <dl className="divide-y divide-line-soft">
              {([
                [t("team.checks", lang), String(q.checks), "quality-checks"],
                [t("team.hours", lang), q.avg_hours === null ? "—" : q.avg_hours.toFixed(1), undefined],
                [t("team.specific", lang), pct(q.specific_share), undefined],
                [t("team.modeled", lang), pct(q.modeled_share), "quality-modeled"],
                [t("coach.column", lang), coachCell(coachPractice.find((c) => c.manager_id === q.manager_id), lang), `coach-${q.first_name}`],
              ] as const).map(([label, value, testId]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-[14px] text-muted">{label}</dt>
                  <dd className="text-right text-[16px] font-bold text-ink tabular-nums" data-testid={testId}>{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </section>}
      {focused.length > 0 && <InvitePanel language={lang} links={invites} canInviteManagers={isAdmin(user)} />}
    </div>
  );
}

function fmtDay(d: Date, lang: "en" | "es") {
  return new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(d));
}

/** "2 sessions · avg 75", not a bare "2 · 75" nobody can read. */
function coachCell(c: { sessions: number; avg_score: number } | undefined, lang: "en" | "es") {
  return c ? t("team.coachCell", lang, { count: c.sessions, avg: Math.round(c.avg_score) }) : "—";
}
