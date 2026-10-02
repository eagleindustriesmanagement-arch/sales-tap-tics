import Link from "next/link";
import { redirect } from "next/navigation";
import { isManager, listAssignments, listSessions, scenarioProgress, weekCards } from "@taptics/db";
import { t } from "@taptics/i18n";
import { recommend } from "@taptics/session";
import { Card, Grade, buttonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library, practiceList } from "@/lib/server";

export default async function Today() {
  const user = await requireUser();
  if (isManager(user)) redirect("/manager/floor");
  if (user.roles.includes("compliance_reviewer")) redirect("/manager/compliance");
  const lang = await language();
  const lib = library();
  const { cards, recent, progress, assigned } = await asUser(principalOf(user), async (db) => ({
    cards: (await weekCards(db)).filter((c) => c.userId === user.id),
    recent: await listSessions(db, { userId: user.id, limit: 3 }),
    progress: await scenarioProgress(db, user.id),
    assigned: await listAssignments(db, { userId: user.id, open: true, limit: 5 }),
  }));
  const card = cards[0] ? lib.behaviorCards.get(cards[0].cardCode) : undefined;
  // Manager assignments come first (spec 15.2 item 3), earliest due first; then the recommender.
  const assignedNext = assigned.find((a) => lib.scenarios.has(a.scenarioCode));
  const first = recommend(practiceList(lib), progress)[0];
  const next = assignedNext ? lib.scenarios.get(assignedNext.scenarioCode) : first ? lib.scenarios.get(first.code) : undefined;
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
            <Link href={`/practice/${next.code}`} className={`${buttonClass} w-full sm:w-auto`}>{t("today.practiceNow", lang)}</Link>
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
