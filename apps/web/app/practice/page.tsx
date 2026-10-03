import Link from "next/link";
import { listAssignments, practiceHistory, scenarioProgress } from "@taptics/db";
import { t } from "@taptics/i18n";
import { certificationState, dailyPlan, onboardingDay } from "@taptics/session";
import { IconCheck, IconPlay, IconTrophy } from "@/components/icons";
import { Bar, PageHeader } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library, practiceList, scheduleInputs } from "@/lib/server";

type NodeState = "certified" | "passed" | "next" | "tried" | "new";

/**
 * The learning path (spec 15, docs/DESIGN-GUIDELINES.md §7): every scenario by level as one connected path, so a rep
 * sees where they are, what is done and what comes next. Certification needs all 20 at level 1.
 */
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
    <div className="space-y-6">
      <PageHeader title={t("practice.title", lang)} subtitle={t("practice.intro", lang)} />
      {levels.map((level) => {
        const scenarios = list
          .filter((s) => s.difficulty === level)
          .map((s) => lib.scenarios.get(s.code)!)
          .sort((a, b) => a.title[lang].localeCompare(b.title[lang], lang));
        const passed = scenarios.filter((s) => progress.get(s.code)?.passed).length;
        return (
          <section key={level} className="space-y-3" aria-labelledby={`level-${level}`}>
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <h2 id={`level-${level}`} className="text-[22px] font-bold text-ink">{t("practice.level", lang, { n: level })}</h2>
                <p className="text-[15px] text-muted">{t(`practice.levelName.${level}` as "practice.levelName.1", lang)}</p>
              </div>
              <p className="pb-0.5 text-[14px] font-semibold text-muted tabular-nums">{t("practice.levelProgress", lang, { passed, total: scenarios.length })}</p>
            </div>
            <Bar value={scenarios.length ? passed / scenarios.length : 0} tone="good" className="mx-1" />
            <ol className="liquid-glass liquid-glass-panel overflow-hidden rounded-[1.25rem] py-1.5">
              {scenarios.map((s, i) => {
                const p = progress.get(s.code);
                const cert = certificationState(s.code, past.history, now);
                const state: NodeState = cert.state === "certified" ? "certified" : p?.passed ? "passed" : s.code === next ? "next" : p ? "tried" : "new";
                const status = !p
                  ? t("practice.notTried", lang)
                  : p.best === null
                    ? (p.attempts === 1 ? t("practice.tried1", lang) : t("practice.tried", lang, { n: p.attempts }))
                    : t("practice.best", lang, { score: Math.round(p.best) });
                return (
                  <li key={s.code} className={`relative flex items-center gap-3 pr-3 pl-4 ${state === "next" ? "bg-brand-soft" : ""}`}>
                    {/* The path: a line through every node, cut at the first and last. */}
                    <span aria-hidden="true" className={`absolute left-[37px] w-0.5 bg-line ${i === 0 ? "top-1/2" : "top-0"} ${i === scenarios.length - 1 ? "bottom-1/2" : "bottom-0"}`} />
                    <Node state={state} />
                    <Link href={`/practice/${s.code}`} className="min-w-0 flex-1 py-3" data-testid={`scenario-${s.code}`}>
                      <span className="block text-[16px] leading-snug font-semibold text-ink">{s.title[lang]}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[14px] text-muted">
                        {state === "next" ? <span className="font-semibold text-brand">{t("practice.next", lang)}</span> : <span>{status}</span>}
                        {state === "passed" && <span className="font-semibold text-good">{t("practice.passed", lang)}</span>}
                        {cert.state === "certified" && <span className="font-semibold text-good">{t("cert.until", lang, { date: fmt.format(cert.until) })}</span>}
                        {cert.state === "wait" && <span>{t(cert.reason === "24h" ? "cert.wait24" : "cert.waitPractice", lang)}</span>}
                      </span>
                    </Link>
                    {certOpen && cert.state === "eligible" && (
                      <Link href={`/practice/${s.code}?mode=certification`} className="liquid-glass liquid-glass-flat inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-semibold text-brand" data-testid={`certify-${s.code}`}>
                        <IconTrophy size={15} />{t("cert.certify", lang)}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** A path node: filled green when passed, amber trophy when certified, the accent and breathing when next. */
function Node({ state }: { state: NodeState }) {
  const base = "relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full";
  if (state === "certified") return <span className={`${base} bezel bg-spark text-ink`}><IconTrophy size={20} /></span>;
  if (state === "passed") return <span className={`${base} bezel bg-good text-surface`}><IconCheck size={22} /></span>;
  if (state === "next") return <span className={`${base} node-current liquid-glass liquid-glass-accent liquid-glass-flat`}><IconPlay size={18} className="fill-current" /></span>;
  if (state === "tried") return <span className={`${base} border-2 border-brand bg-surface text-brand`}><span className="h-2.5 w-2.5 rounded-full bg-brand" /></span>;
  return <span className={`${base} border-2 border-line bg-surface`} />;
}
