import Link from "next/link";
import { redirect } from "next/navigation";
import { currentObjectionWeights, isManager, listAssignments, listSessions, practiceHistory, weekCards } from "@taptics/db";
import { t } from "@taptics/i18n";
import { certificationState, dailyPlan, pickWarmUp, practiceStreak, type PlanReason } from "@taptics/session";
import { IconBulb, IconCheck, IconClock, IconFlame, IconPlay, IconTarget, IconTrophy } from "@/components/icons";
import { Card, Chip, Inset, ListRow, Ring, RowGroup, ScoreBadge, WarmUpTag, SectionTitle, buttonClass, quoted, titleClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { hasIndustry, language, library, scheduleInputs, warmUpItems } from "@/lib/server";

const DAILY_GOAL = 1;
const TZ = "America/New_York";

/**
 * Today (spec 18.1, docs/DESIGN-GUIDELINES.md §7): the learning-app home. One clear next step is the biggest thing
 * on screen; the daily goal, streak and certification count sit above it; what comes after, this week's behavior
 * and recent sessions follow.
 */
/** "domingo, 4 de octubre" → "Domingo, 4 de octubre": only the first letter (CSS capitalize made it "4 De Octubre"). */
const capitalizeFirst = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

export default async function Today() {
  const user = await requireUser();
  if (isManager(user)) redirect("/manager/floor");
  if (user.roles.includes("compliance_reviewer")) redirect("/manager/compliance");
  if (user.roles.includes("content_editor")) redirect("/review");
  const lang = await language();
  const lib = library();
  const { cards, recent, progress, assigned, weights } = await asUser(principalOf(user), async (db) => ({
    cards: (await weekCards(db)).filter((c) => c.userId === user.id),
    recent: await listSessions(db, { userId: user.id, limit: 3 }),
    progress: await practiceHistory(db, user.id),
    assigned: await listAssignments(db, { userId: user.id, open: true, limit: 5 }),
    weights: user.storeId ? await currentObjectionWeights(db, user.storeId) : {},
  }));
  const now = new Date();
  const inputs = scheduleInputs(lib, weights, user.industry);
  const card = cards[0] ? lib.behaviorCards.get(cards[0].cardCode) : undefined;
  // Spec 15.3: assignments first, then compliance, onboarding, certification and due items.
  const plan = dailyPlan({
    now,
    startedAt: progress.startedAt,
    history: progress.history,
    assignments: assigned.map((a) => ({ scenarioCode: a.scenarioCode, assignedBy: a.assignedByName, reason: a.reason, dueAt: a.dueAt })),
    ...inputs,
    userId: user.id,
  });
  const top = plan[0];
  const streak = practiceStreak(progress.history.map((o) => o.at), now);
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  // The daily goal is a real session; a 3-minute warm-up keeps the streak but does not meet the goal (decision 0038).
  const doneToday = progress.history.filter((o) => day(o.at) === day(now) && o.mode !== "warm_up").length;
  const release1 = inputs.scenarios.filter((s) => s.release1);
  const certified = release1.filter((s) => certificationState(s.code, progress.history, now).state === "certified").length;
  const next = top ? lib.scenarios.get(top.scenarioCode) : undefined;
  const assignedNext = top?.reason.kind === "assigned" ? assigned.find((a) => a.scenarioCode === top.scenarioCode) : undefined;
  const after = plan.slice(1, 3).map((p) => ({ p, s: lib.scenarios.get(p.scenarioCode)! })).filter((x) => x.s);
  const locale = lang === "es" ? "es-US" : "en-US";
  const dateFmt = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone: TZ });
  const dueFmt = new Intl.DateTimeFormat(locale, { weekday: "long", month: "short", day: "numeric", timeZone: TZ });
  const goalMet = doneToday >= DAILY_GOAL;
  // Spec 12.5 and 15.2: an optional 3-minute warm-up at the start of a shift, on the rep's weakest behavior.
  const warm = pickWarmUp({ scenarios: inputs.scenarios, items: warmUpItems(lib), history: progress.history });
  const warmTechnique = warm ? lib.techniques.get(warm.technique)?.name : undefined;

  return (
    <div className="space-y-6">
      <header className="space-y-2 px-1">
        <p className="text-[15px] font-medium text-muted">{capitalizeFirst(dateFmt.format(now))}</p>
        <h1 className={titleClass}>{t("today.title", lang)}{user.firstName ? `, ${user.firstName}` : ""}</h1>
        {streak > 0 ? (
          <Chip tone="spark" icon={<IconFlame size={16} className="text-spark" />} data-testid="streak">{t("today.streak", lang, { n: streak })}</Chip>
        ) : (
          <Chip icon={<IconFlame size={16} />}>{t("today.noStreak", lang)}</Chip>
        )}
      </header>

      {/* Honest about what exists (decision 0032): the techniques are universal; the customers are car buyers for now. */}
      {user.industry !== "cars" && !hasIndustry(user.industry, lib) && (
        <p className="liquid-glass-inset rounded-[0.875rem] p-3 text-[15px] text-ink" data-testid="industry-note">
          {user.industry === "other"
            ? t("industry.otherNote", lang)
            : t("industry.comingSoon", lang, { industry: t(`industry.${user.industry}` as "industry.homes", lang).toLowerCase() })}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3 p-3.5">
          <Ring value={doneToday / DAILY_GOAL} size={52} stroke={6} tone={goalMet ? "good" : "brand"} label={t("today.goalValue", lang, { done: Math.min(doneToday, DAILY_GOAL), goal: DAILY_GOAL })}>
            {goalMet ? <IconCheck size={24} className="text-good" /> : <IconTarget size={22} className="text-brand" />}
          </Ring>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-muted">{t("today.goal", lang)}</p>
            <p className="mt-0.5 font-display text-[30px] leading-none text-ink tabular-nums">{Math.min(doneToday, DAILY_GOAL)}<span className="font-sans text-[15px] font-semibold text-muted">/{DAILY_GOAL}</span></p>
          </div>
        </Card>
        <Link href="/progress" className="block">
          <Card className="flex h-full items-center gap-3 p-3.5">
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-spark-soft text-spark ring-1 ring-spark/30 ring-inset"><IconTrophy size={24} /></span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-muted">{t("today.certified", lang)}</p>
              <p className="mt-0.5 font-display text-[30px] leading-none text-ink tabular-nums">{certified}<span className="font-sans text-[15px] font-semibold text-muted">/{release1.length}</span></p>
            </div>
          </Card>
        </Link>
      </div>

      {next && (
        <section aria-labelledby="up-next" className="liquid-glass liquid-glass-panel liquid-glass-hero rounded-[1.75rem] p-5 sm:p-7">
          <p className="flex flex-wrap items-center gap-2">
            <Chip tone="brand">{assignedNext ? t("today.assigned", lang, { name: assignedNext.assignedByName ?? "" }) : t("practice.next", lang)}</Chip>
            <Chip>{t("practice.level", lang, { n: next.difficulty })}</Chip>
          </p>
          <h2 id="up-next" className="mt-4 font-display text-[34px] leading-[1.06] text-ink sm:text-[40px]">{next.title[lang]}</h2>
          <p className="mt-2 text-[16px] text-body">{next.setting[lang]}</p>
          {top && top.reason.kind !== "assigned" && <p className="mt-3 text-[15px] font-medium text-brand" data-testid="plan-reason">{reasonText(top.reason, lang)}</p>}
          {assignedNext?.reason && <p className="liquid-glass-inset mt-3 rounded-2xl p-3 text-[15px] text-ink" data-testid="assignment-reason">{quoted(assignedNext.reason)}</p>}
          {assignedNext?.dueAt && <p className="mt-2 flex items-center gap-1.5 text-[14px] font-semibold text-ink"><IconClock size={16} className="text-brand" />{t("assign.dueOn", lang, { date: dueFmt.format(new Date(assignedNext.dueAt)) })}</p>}
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t("scenario.targets", lang)}>
            {next.target_techniques.slice(0, 3).map((code) => (
              <li key={code} className="rounded-full bg-page/50 px-2.5 py-1 text-[13px] font-semibold text-body ring-1 ring-line ring-inset">{lib.techniques.get(code)!.name[lang]}</li>
            ))}
            {next.target_techniques.length > 3 && <li className="rounded-full bg-page/50 px-2.5 py-1 text-[13px] font-semibold text-body ring-1 ring-line ring-inset">+{next.target_techniques.length - 3}</li>}
          </ul>
          <Link
            href={`/practice/${next.code}${top?.mode === "certification" ? "?mode=certification" : ""}`}
            className={`${buttonClass} mt-6 min-h-14 w-full font-bold`}
          >
            <IconPlay size={20} className="fill-current" />
            {top?.mode === "certification" ? t("cert.start", lang) : t("today.practiceNow", lang)}
          </Link>
          <Link href="/practice" className="mt-2 flex min-h-11 items-center justify-center text-[15px] font-semibold text-brand underline-offset-4 hover:underline">{t("practice.all", lang)}</Link>
        </section>
      )}

      {after.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("today.comingUp", lang)}</SectionTitle>
          <RowGroup>
            {after.map(({ p, s }) => (
              <ListRow
                key={`${p.scenarioCode}${p.mode}`}
                href={`/practice/${s.code}${p.mode === "certification" ? "?mode=certification" : ""}`}
                leading={<span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-[20px] text-brand ring-1 ring-brand/25 ring-inset">{s.difficulty}</span>}
                title={s.title[lang]}
                subtitle={p.reason.kind === "assigned" ? t("today.assigned", lang, { name: p.reason.assignedBy ?? "" }) : reasonText(p.reason, lang)}
              />
            ))}
          </RowGroup>
        </section>
      )}

      {warm && warmTechnique && (
        <Link href={`/practice/${warm.scenarioCode}?warmup=${encodeURIComponent(warm.itemCode)}`} className="block" data-testid="warmup-card">
          <Card className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand ring-1 ring-brand/25 ring-inset"><IconClock size={22} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold text-ink">{t("warmup.todayTitle", lang)}</p>
              <p className="mt-0.5 text-[15px] text-body">{t("warmup.todayBody", lang, { technique: warmTechnique[lang] })}</p>
            </div>
            <IconPlay size={18} className="shrink-0 fill-current text-brand" aria-hidden="true" />
          </Card>
        </Link>
      )}

      <section className="space-y-2.5">
        <SectionTitle>{card ? t("card.issued", lang) : t("today.behaviorCard", lang)}</SectionTitle>
        <Card>
          {card ? (
            <div className="space-y-3" data-testid="my-card">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-spark-soft text-spark ring-1 ring-spark/30 ring-inset"><IconBulb size={22} /></span>
                <div>
                  <p className="text-[17px] font-bold text-ink">{card.title[lang]}</p>
                  <p className="mt-0.5 text-[15px]">{card.behavior[lang]}</p>
                </div>
              </div>
              <Inset className="text-[15px]">{quoted(card.floor_check_script.line[lang])}</Inset>
              {cards[0]!.status === "checked" && <Chip tone="good" icon={<IconCheck size={15} />}>{t("card.checked", lang)}</Chip>}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ground text-muted"><IconBulb size={22} /></span>
              <p className="text-[15px] text-muted">{t("today.noCard", lang)}</p>
            </div>
          )}
        </Card>
      </section>

      {recent.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle action={<Link href="/history" className="text-[15px] font-semibold text-brand">{t("today.seeAll", lang)}</Link>}>{t("today.recent", lang)}</SectionTitle>
          <RowGroup>
            {recent.map((s) => (
              <ListRow
                key={s.id}
                href={`/history/${s.id}`}
                title={lib.scenarios.get(s.scenarioCode)?.title[lang] ?? s.scenarioCode}
                subtitle={s.endReason ? t(`endReason.${s.endReason}` as "endReason.sale", lang) : t("history.inProgress", lang)}
                trailing={s.mode === "warm_up" ? <WarmUpTag label={t("warmup.listLabel", lang)} /> : <ScoreBadge total={s.total} partial={s.partial} />}
              />
            ))}
          </RowGroup>
        </section>
      )}
    </div>
  );
}

function reasonText(r: PlanReason, lang: "en" | "es"): string {
  switch (r.kind) {
    case "onboarding": return t("plan.onboarding", lang, { week: r.week });
    case "compliance": return t("plan.compliance", lang, { rule: r.rule });
    case "due": return r.daysSince === null ? t("plan.dueItems", lang, { n: r.items }) : t("plan.due", lang, { days: r.daysSince });
    case "certification": return t("plan.certification", lang);
    case "recertification": return t("plan.recertification", lang);
    case "new": return t("plan.new", lang);
    case "retry": return r.best === null ? t("plan.retryNoScore", lang) : t("plan.retry", lang, { score: r.best });
    default: return "";
  }
}
