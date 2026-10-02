import Link from "next/link";
import { redirect } from "next/navigation";
import { isManager, listAssignments, listSessions, practiceHistory, weekCards } from "@taptics/db";
import { t } from "@taptics/i18n";
import { dailyPlan, type PlanReason } from "@taptics/session";
import { Card, Grade, buttonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library, scheduleInputs } from "@/lib/server";

export default async function Today() {
  const user = await requireUser();
  if (isManager(user)) redirect("/manager/floor");
  if (user.roles.includes("compliance_reviewer")) redirect("/manager/compliance");
  if (user.roles.includes("content_editor")) redirect("/review");
  const lang = await language();
  const lib = library();
  const { cards, recent, progress, assigned } = await asUser(principalOf(user), async (db) => ({
    cards: (await weekCards(db)).filter((c) => c.userId === user.id),
    recent: await listSessions(db, { userId: user.id, limit: 3 }),
    progress: await practiceHistory(db, user.id),
    assigned: await listAssignments(db, { userId: user.id, open: true, limit: 5 }),
  }));
  const card = cards[0] ? lib.behaviorCards.get(cards[0].cardCode) : undefined;
  // Spec 15.3: assignments first, then compliance, onboarding, certification and due items.
  const plan = dailyPlan({
    now: new Date(),
    startedAt: progress.startedAt,
    history: progress.history,
    assignments: assigned.map((a) => ({ scenarioCode: a.scenarioCode, assignedBy: a.assignedByName, reason: a.reason, dueAt: a.dueAt })),
    ...scheduleInputs(lib),
    userId: user.id,
  });
  const top = plan[0];
  const next = top ? lib.scenarios.get(top.scenarioCode) : undefined;
  const assignedNext = top?.reason.kind === "assigned" ? assigned.find((a) => a.scenarioCode === top.scenarioCode) : undefined;
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "America/New_York" });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("today.title", lang)}{user.firstName ? `, ${user.firstName}` : ""}</h1>
        <p className="mt-1 text-muted">{t("app.tagline", lang)}</p>
      </div>
      {next && (
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{assignedNext ? t("today.assigned", lang, { name: assignedNext.assignedByName ?? "" }) : t("today.recommended", lang)}</p>
          {top && top.reason.kind !== "assigned" && <p className="mt-1 text-sm text-ink" data-testid="plan-reason">{reasonText(top.reason, lang)}</p>}
          <h2 className="mt-1 text-xl font-bold text-ink">{next.title[lang]}</h2>
          <p className="mt-1">{next.setting[lang]}</p>
          {assignedNext?.reason && <p className="mt-2 rounded-xl bg-ground p-3 text-ink" data-testid="assignment-reason">“{assignedNext.reason}”</p>}
          {assignedNext?.dueAt && <p className="mt-2 text-sm font-semibold text-ink">{t("assign.dueOn", lang, { date: fmt.format(new Date(assignedNext.dueAt)) })}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {next.target_techniques.map((code) => {
              const tech = lib.techniques.get(code)!;
              return (
                <span key={code} className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-3 text-sm text-ink">
                  <Grade grade={tech.evidence.grade} label={t(`evidence.${tech.evidence.grade}` as "evidence.A", lang)} />
                  {tech.name[lang]}
                </span>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href={`/practice/${next.code}${top?.mode === "certification" ? "?mode=certification" : ""}`} className={`${buttonClass} w-full sm:w-auto`}>{top?.mode === "certification" ? t("cert.start", lang) : t("today.practiceNow", lang)}</Link>
            <Link href="/practice" className="font-semibold text-brand underline">{t("practice.all", lang)}</Link>
          </div>
        </Card>
      )}
      <Card>
        <h2 className="font-semibold text-ink">{card ? t("card.issued", lang) : t("today.behaviorCard", lang)}</h2>
        {card ? (
          <div className="mt-2 space-y-2" data-testid="my-card">
            <p className="text-lg font-semibold text-ink">{card.title[lang]}</p>
            <p>{card.behavior[lang]}</p>
            <p className="rounded-xl bg-ground p-3 text-ink">{card.floor_check_script.line[lang]}</p>
            {cards[0]!.status === "checked" && <p className="font-semibold text-good">{t("card.checked", lang)}</p>}
          </div>
        ) : (
          <p className="mt-1 text-muted">{t("today.noCard", lang)}</p>
        )}
      </Card>
      {recent.length > 0 && (
        <Card>
          <h2 className="font-semibold text-ink">{t("history.title", lang)}</h2>
          <ul className="mt-2 divide-y divide-line">
            {recent.map((s) => (
              <li key={s.id}><Link href={`/history/${s.id}`} className="flex min-h-12 items-center justify-between gap-3 text-ink"><span>{lib.scenarios.get(s.scenarioCode)?.title[lang] ?? s.scenarioCode}</span><span className="font-mono">{s.total === null ? t("history.inProgress", lang) : Math.round(s.total)}</span></Link></li>
            ))}
          </ul>
        </Card>
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
    default: return "";
  }
}
