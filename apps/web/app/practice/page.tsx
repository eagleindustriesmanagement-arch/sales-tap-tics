import Link from "next/link";
import { currentObjectionWeights, listAssignments, practiceHistory, scenarioProgress } from "@taptics/db";
import { t } from "@taptics/i18n";
import { certificationState, dailyPlan, onboardingDay } from "@taptics/session";
import { IconCheck, IconPlay, IconTrophy } from "@/components/icons";
import { Bar, PageHeader } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import type { Scenario } from "@taptics/content";
import { language, library, practiceList, scheduleInputs } from "@/lib/server";

type NodeState = "certified" | "passed" | "next" | "tried" | "new";

/**
 * The learning path (spec 15, docs/DESIGN-GUIDELINES.md §7): every scenario by level as one connected path, so a rep
 * sees where they are, what is done and what comes next. The certification path holds the release 1 scenarios;
 * every other objection's customer follows under "More customers", by topic, and never counts toward certification.
 */
export default async function Practice() {
  const user = await requireUser();
  const lang = await language();
  const lib = library();
  const { progress, past, assigned, weights } = await asUser(principalOf(user), async (db) => ({
    progress: await scenarioProgress(db, user.id),
    past: await practiceHistory(db, user.id),
    assigned: await listAssignments(db, { userId: user.id, open: true }),
    weights: user.storeId ? await currentObjectionWeights(db, user.storeId) : {},
  }));
  const list = practiceList(lib);
  const now = new Date();
  const inputs = scheduleInputs(lib, weights);
  const next = dailyPlan({ now, startedAt: past.startedAt, history: past.history, assignments: assigned.map((a) => ({ scenarioCode: a.scenarioCode, assignedBy: a.assignedByName, reason: a.reason, dueAt: a.dueAt })), ...inputs, userId: user.id })[0]?.scenarioCode;
  // Certification opens once onboarding has met every release 1 scenario (spec 15.2).
  const tried = new Set(past.history.map((o) => o.scenarioCode));
  const certOpen = onboardingDay({ now, startedAt: past.startedAt }) >= 30 || inputs.scenarios.filter((s) => s.release1).every((s) => tried.has(s.code));
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
  const release1 = new Set(inputs.scenarios.filter((s) => s.release1).map((s) => s.code));
  const byTitle = (a: Scenario, b: Scenario) => a.title[lang].localeCompare(b.title[lang], lang);
  const core = list.filter((s) => release1.has(s.code)).map((s) => lib.scenarios.get(s.code)!);
  const more = list.filter((s) => !release1.has(s.code)).map((s) => lib.scenarios.get(s.code)!);
  const levels = [...new Set(core.map((s) => s.difficulty))].sort();
  const topics = [...new Set(more.map((s) => s.module))].sort((a, b) => topicRank(a) - topicRank(b));
  const row = (s: Scenario, i: number, all: Scenario[]) => {
    const p = progress.get(s.code);
    const cert = certificationState(s.code, past.history, now);
    const counts = release1.has(s.code);
    const state: NodeState = counts && cert.state === "certified" ? "certified" : p?.passed ? "passed" : s.code === next ? "next" : p ? "tried" : "new";
    const status = !p
      ? t("practice.notTried", lang)
      : p.best === null
        ? (p.attempts === 1 ? t("practice.tried1", lang) : t("practice.tried", lang, { n: p.attempts }))
        : t("practice.best", lang, { score: Math.round(p.best) });
    return (
      <li key={s.code} className={`row-hover relative flex items-center gap-3 pr-3 pl-4 ${state === "next" ? "bg-linear-to-r from-brand-soft to-transparent" : ""}`}>
        {/* The path: a line through every node, cut at the first and last. */}
        <span aria-hidden="true" className={`absolute left-[37.5px] w-px bg-linear-to-b from-brand/40 to-line ${i === 0 ? "top-1/2" : "top-0"} ${i === all.length - 1 ? "bottom-1/2" : "bottom-0"}`} />
        <Node state={state} />
        <Link href={`/practice/${s.code}`} className="min-w-0 flex-1 py-3" data-testid={`scenario-${s.code}`}>
          <span className="block text-[16px] leading-snug font-semibold text-ink">{s.title[lang]}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[14px] text-muted">
            {state === "next" ? <span className="font-semibold text-brand">{t("practice.next", lang)}</span> : <span>{status}</span>}
            {state === "passed" && <span className="font-semibold text-good">{t("practice.passed", lang)}</span>}
            {/* A complete score that did not pass: the lesson is not done (decision 0030). */}
            {p && !p.passed && p.best !== null && !(counts && cert.state === "certified") && <span className="font-semibold text-warn" data-testid={`not-passed-${s.code}`}>{t("practice.notPassed", lang)}</span>}
            {counts && cert.state === "certified" && <span className="font-semibold text-good">{t("cert.until", lang, { date: fmt.format(cert.until) })}</span>}
            {counts && cert.state === "wait" && <span>{t(cert.reason === "24h" ? "cert.wait24" : "cert.waitPractice", lang)}</span>}
          </span>
        </Link>
        {counts && certOpen && cert.state === "eligible" && (
          <Link href={`/practice/${s.code}?mode=certification`} className="liquid-glass liquid-glass-flat inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-semibold text-brand" data-testid={`certify-${s.code}`}>
            <IconTrophy size={15} />{t("cert.certify", lang)}
          </Link>
        )}
      </li>
    );
  };
  return (
    <div className="space-y-6">
      <PageHeader title={t("practice.title", lang)} subtitle={t("practice.intro", lang)} />
      <div className="px-1">
        <h2 className="font-display text-[28px] leading-tight text-ink">{t("practice.core.title", lang)}</h2>
        <p className="text-[15px] text-muted">{t("practice.core.sub", lang)}</p>
      </div>
      {levels.map((level) => {
        const scenarios = core.filter((s) => s.difficulty === level).sort(byTitle);
        const passed = scenarios.filter((s) => progress.get(s.code)?.passed).length;
        return (
          <section key={level} className="space-y-3" aria-labelledby={`level-${level}`}>
            <div className="flex items-end justify-between gap-3 px-1">
              <div>
                <h3 id={`level-${level}`} className="text-[20px] font-semibold text-ink">{t("practice.level", lang, { n: level })}</h3>
                <p className="text-[15px] text-muted">{t(`practice.levelName.${level}` as "practice.levelName.1", lang)}</p>
              </div>
              <p className="pb-0.5 text-[14px] font-semibold text-muted tabular-nums">{t("practice.levelProgress", lang, { passed, total: scenarios.length })}</p>
            </div>
            <Bar value={scenarios.length ? passed / scenarios.length : 0} className="mx-1" />
            <ol className="liquid-glass liquid-glass-panel overflow-hidden rounded-[1.25rem] py-1.5">{scenarios.map(row)}</ol>
          </section>
        );
      })}
      {topics.length > 0 && (
        <>
          <div className="px-1 pt-4">
            <h2 className="font-display text-[28px] leading-tight text-ink">{t("practice.more.title", lang)}</h2>
            <p className="text-[15px] text-muted">{t("practice.more.sub", lang)}</p>
          </div>
          {topics.map((topic) => {
            const scenarios = more.filter((s) => s.module === topic).sort(byTitle);
            const passed = scenarios.filter((s) => progress.get(s.code)?.passed).length;
            return (
              <section key={topic} className="space-y-3" aria-labelledby={`topic-${topic}`} data-testid={`topic-${topic}`}>
                <div className="flex items-end justify-between gap-3 px-1">
                  <h3 id={`topic-${topic}`} className="text-[20px] font-bold text-ink">{topicName(topic, lang)}</h3>
                  <p className="pb-0.5 text-[14px] font-semibold text-muted tabular-nums">{t("practice.levelProgress", lang, { passed, total: scenarios.length })}</p>
                </div>
                <ol className="liquid-glass liquid-glass-panel overflow-hidden rounded-[1.25rem] py-1.5">{scenarios.map(row)}</ol>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

const TOPICS = ["car-core", "car-phone-finance", "car-market-2026", "car-ev", "car-language-trust", "car-miami-indecision"] as const;
function topicRank(module: string) {
  const i = TOPICS.indexOf(module as (typeof TOPICS)[number]);
  return i === -1 ? TOPICS.length : i;
}
/** A module's display name; a module without one (a store's own pack) shows its code. */
function topicName(module: string, lang: "en" | "es") {
  return (TOPICS as readonly string[]).includes(module) ? t(`practice.topic.${module}` as "practice.topic.car-core", lang) : module;
}

/** A path node: filled green when passed, amber trophy when certified, the accent and breathing when next. */
function Node({ state }: { state: NodeState }) {
  const base = "relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full";
  if (state === "certified") return <span className={`${base} bezel fill-gold text-brand-fill-ink`}><IconTrophy size={20} /></span>;
  if (state === "passed") return <span className={`${base} bezel bg-good text-surface`}><IconCheck size={22} /></span>;
  if (state === "next") return <span className={`${base} node-current liquid-glass liquid-glass-accent liquid-glass-flat`}><IconPlay size={18} className="fill-current" /></span>;
  if (state === "tried") return <span className={`${base} border-[1.5px] border-brand bg-surface text-brand`}><span className="h-2.5 w-2.5 rounded-full bg-brand" /></span>;
  return <span className={`${base} border-[1.5px] border-line bg-surface`} />;
}
