import Link from "next/link";
import { listAssignments, practiceHistory, scenarioProgress } from "@taptics/db";
import { t } from "@taptics/i18n";
import { certificationState, dailyPlan, onboardingDay } from "@taptics/session";
import { Card, Pill } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library, practiceList, scheduleInputs } from "@/lib/server";

/** Every scenario by level, with the rep's progress on each (spec 15: certification needs all 20 at level 1). */
export default async function Practice() {
  const user = await requireUser();
  const lang = await language();
  const lib = library();
  const { progress, past, assigned } = await asUser(principalOf(user), async (db) => ({
    progress: await scenarioProgress(db, user.id),
    past: await practiceHistory(db, user.id),
    assigned: await listAssignments(db, { userId: user.id, open: true }),
  }));
  const list = practiceList(lib);
  const now = new Date();
  const inputs = scheduleInputs(lib);
  const next = dailyPlan({ now, startedAt: past.startedAt, history: past.history, assignments: assigned.map((a) => ({ scenarioCode: a.scenarioCode, assignedBy: a.assignedByName, reason: a.reason, dueAt: a.dueAt })), ...inputs, userId: user.id })[0]?.scenarioCode;
  // Certification opens once onboarding has met every release 1 scenario (spec 15.2).
  const tried = new Set(past.history.map((o) => o.scenarioCode));
  const certOpen = onboardingDay({ now, startedAt: past.startedAt }) >= 30 || inputs.scenarios.filter((s) => s.release1).every((s) => tried.has(s.code));
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
  const levels = [...new Set(list.map((s) => s.difficulty))].sort();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("practice.title", lang)}</h1>
        <p className="mt-1 text-muted">{t("practice.intro", lang)}</p>
      </div>
      {levels.map((level) => (
        <section key={level} className="space-y-2">
          <h2 className="font-bold text-ink">{t("practice.level", lang, { n: level })}</h2>
          <ul className="space-y-2">
            {list
              .filter((s) => s.difficulty === level)
              .map((s) => lib.scenarios.get(s.code)!)
              .sort((a, b) => a.title[lang].localeCompare(b.title[lang], lang))
              .map((s) => {
                const p = progress.get(s.code);
                const cert = certificationState(s.code, past.history, now);
                const status = !p
                  ? t("practice.notTried", lang)
                  : p.best === null
                    ? t("practice.tried", lang, { n: p.attempts })
                    : t("practice.best", lang, { score: Math.round(p.best) });
                return (
                  <li key={s.code}>
                    <Card className="flex items-center justify-between gap-3 hover:border-brand">
                      <Link href={`/practice/${s.code}`} className="min-w-0 flex-1" data-testid={`scenario-${s.code}`}>
                        <p className="font-semibold text-ink">{s.title[lang]}</p>
                        <p className="text-sm text-muted">{status}</p>
                        {cert.state === "certified" && <p className="text-sm font-semibold text-good">{t("cert.until", lang, { date: fmt.format(cert.until) })}</p>}
                        {cert.state === "wait" && <p className="text-sm text-muted">{t(cert.reason === "24h" ? "cert.wait24" : "cert.waitPractice", lang)}</p>}
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        {s.code === next && <Pill>{t("practice.next", lang)}</Pill>}
                        {p?.passed && <Pill>{t("practice.passed", lang)}</Pill>}
                        {certOpen && cert.state === "eligible" && (
                          <Link href={`/practice/${s.code}?mode=certification`} className="inline-flex min-h-11 items-center rounded-full border border-brand px-3 text-sm font-semibold text-brand" data-testid={`certify-${s.code}`}>
                            {t("cert.certify", lang)}
                          </Link>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
