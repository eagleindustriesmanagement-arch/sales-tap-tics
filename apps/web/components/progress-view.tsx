import type { RepProgress } from "@taptics/db";
import { t, type Language } from "@taptics/i18n";
import { certificationState, masteryFrom, practiceStreak, type Observation } from "@taptics/session";
import { IconBulb, IconCheck, IconFlame, IconTrophy } from "@/components/icons";
import { Bar, Card, Ring, SectionTitle, quoted } from "@/components/ui";
import { itemBehavior, library, scheduleInputs } from "@/lib/server";

const DIMENSIONS = ["discovery", "technique", "composure", "outcome"] as const;

/**
 * One rep's progress (spec 18.1 Progress, 18.2 Rep detail): the same view for the rep and the manager. The
 * certification ring is the long goal; skills by week show the trend; weakest skills say what to work on next.
 */
export function ProgressView({ progress, history, lang }: { progress: RepProgress; history: Observation[]; lang: Language }) {
  const lib = library();
  const now = new Date();
  const release1 = scheduleInputs(lib).scenarios.filter((s) => s.release1);
  const certified = release1.filter((s) => certificationState(s.code, history, now).state === "certified").length;
  const streak = practiceStreak(history.map((o) => o.at), now);
  const mastery = masteryFrom(history);
  const objections = release1
    .map((s) => ({
      code: s.code,
      title: lib.scenarios.get(s.code)!.title[lang],
      m: mastery.get(`scenario:${s.code}`),
      // Only offline (partial) scores so far: the figure covers just the behaviors that could be scored, so it is marked.
      estimate: !history.some((o) => o.scenarioCode === s.code && !o.partial && o.total !== null),
    }))
    .filter((x) => x.m)
    .sort((a, b) => a.m!.value - b.m!.value);
  const fmtWeek = (d: string) => new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const latest = progress.weeks.at(-1);
  // Weeks start on Monday (UTC), as the scores are grouped: say which week the tiles show, so this week's sessions
  // are never mistaken for an old date.
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7))).toISOString().slice(0, 10);
  const fmtDay = (d: string) => new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const prior = progress.weeks.at(-2);
  return (
    <div className="space-y-6">
      <section className="liquid-glass liquid-glass-panel liquid-glass-hero flex items-center gap-5 rounded-[1.5rem] p-5">
        <Ring value={release1.length ? certified / release1.length : 0} size={108} stroke={8} tone="brand" label={`${certified}/${release1.length}`}>
          <IconTrophy size={30} className="text-brand" />
        </Ring>
        <div className="min-w-0 space-y-1">
          <p className="font-display text-[46px] leading-none text-ink tabular-nums" data-testid="progress-certified">{certified}/{release1.length}</p>
          <p className="text-[15px] font-semibold text-ink">{t("progress.certifiedShort", lang)}</p>
          <p className="text-[13px] text-muted">{t("progress.certifyHint", lang)}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3.5">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted"><IconFlame size={16} className="text-spark" />{t("progress.streak", lang)}</p>
          <p className="mt-1.5 font-display text-[34px] leading-none text-ink tabular-nums">{streak}</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-[13px] font-medium text-muted">{t("progress.sessions", lang)}</p>
          <p className="mt-1.5 font-display text-[34px] leading-none text-ink tabular-nums">{history.length}</p>
        </Card>
      </div>

      <section className="space-y-2.5">
        <SectionTitle>{t("progress.dimensions", lang)}</SectionTitle>
        <Card>
          {progress.weeks.length === 0 || !latest ? (
            <p className="text-[15px] text-muted" data-testid="progress-no-scores">{t("progress.noComplete", lang)}</p>
          ) : (
            <>
            <p className="mb-3 text-[13px] text-muted" data-testid="progress-week">
              {latest.week === monday
                ? t("progress.thisWeek", lang, { date: fmtDay(latest.week), n: latest.sessions })
                : t("progress.latestWeek", lang, { date: fmtWeek(latest.week) })}
            </p>
            <ul className="space-y-4">
              {DIMENSIONS.map((d) => {
                const now = latest.dimensions[d];
                const before = prior?.dimensions[d];
                const delta = now !== undefined && before !== undefined ? Math.round(now - before) : null;
                return (
                  <li key={d}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] font-semibold text-ink">{t(`dimension.${d}`, lang)}</span>
                      <span className="flex items-baseline gap-2">
                        {delta !== null && delta !== 0 && <span className={`text-[13px] font-semibold ${delta > 0 ? "text-good" : "text-bad"}`}>{delta > 0 ? `+${delta}` : delta}</span>}
                        <span className="text-[17px] font-bold text-ink tabular-nums">{now === undefined ? "—" : Math.round(now)}</span>
                      </span>
                    </div>
                    {/* The last eight weeks as small columns: the trend at a glance. */}
                    <div className="mt-2 flex h-10 items-end gap-1" role="img" aria-label={progress.weeks.map((w) => `${fmtWeek(w.week)}: ${w.dimensions[d] === undefined ? "—" : Math.round(w.dimensions[d]!)}`).join(", ")}>
                      {progress.weeks.map((w, i) => {
                        const v = w.dimensions[d];
                        return <span key={w.week} className={`col-grow flex-1 rounded-t-[4px] ${w === latest ? "fill-gold" : "fill-gold-dim"}`} style={{ height: `${v === undefined ? 4 : Math.max(8, Math.min(100, v))}%`, ["--i" as string]: i }} />;
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </Card>
      </section>

      <section className="space-y-2.5">
        <SectionTitle>{t("progress.weakest", lang)}</SectionTitle>
        <Card>
          {progress.weakest.length === 0 ? (
            <p className="text-[15px] text-muted">{t("progress.notEnough", lang)}</p>
          ) : (
            <ul className="space-y-3.5" data-testid="progress-weakest">
              {progress.weakest.map((w) => (
                <li key={w.code}>
                  <div className="flex justify-between gap-3 text-[15px]"><span className="text-ink">{itemBehavior(w.code)?.[lang] ?? w.code}</span><span className="font-semibold text-muted tabular-nums">{Math.round(w.ratio * 100)}%</span></div>
                  <Bar value={w.ratio} tone={w.ratio >= 0.7 ? "good" : w.ratio >= 0.4 ? "warn" : "bad"} className="mt-1.5" />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {objections.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("progress.mastery", lang)}</SectionTitle>
          <Card>
            <ul className="space-y-3.5">
              {objections.map((o) => (
                <li key={o.code}>
                  <div className="flex justify-between gap-3 text-[15px]"><span className="text-ink">{o.title}</span><span className="font-semibold text-muted tabular-nums">{Math.round(o.m!.value * 100)}%{o.estimate ? "*" : ""}</span></div>
                  <Bar value={o.m!.value} className="mt-1.5" />
                </li>
              ))}
            </ul>
            {objections.some((o) => o.estimate) && <p className="mt-3.5 border-t border-line-soft pt-3 text-[13px] text-muted" data-testid="mastery-partial">{t("progress.masteryPartial", lang)}</p>}
          </Card>
        </section>
      )}

      <section className="space-y-2.5">
        <SectionTitle>{t("progress.cards", lang)}</SectionTitle>
        <Card>
          {progress.cards.length === 0 ? (
            <p className="flex items-center gap-3 text-[15px] text-muted"><IconBulb size={20} className="shrink-0" />{t("today.noCard", lang)}</p>
          ) : (
            <ul className="divide-y divide-line-soft" data-testid="progress-cards">
              {progress.cards.map((c) => (
                <li key={c.week} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${c.observed ? "bg-good-soft text-good" : "bg-ground text-muted"}`}>{c.observed ? <IconCheck size={18} /> : <IconBulb size={18} />}</span>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{lib.behaviorCards.get(c.cardCode)?.title[lang] ?? c.cardCode}</p>
                    <p className="text-[13px] text-muted">{fmtWeek(c.week)}</p>
                    <p className="mt-1 text-[14px] text-body">{c.observed ? t("progress.checked", lang, { observed: t(`floor.observed.${c.observed}` as "floor.observed.yes", lang) }) : t(`progress.card.${c.status}` as "progress.card.open", lang)}{c.note ? ` · ${quoted(c.note)}` : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
