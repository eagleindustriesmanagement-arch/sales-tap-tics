import type { RepProgress } from "@taptics/db";
import { t, type Language } from "@taptics/i18n";
import { certificationState, masteryFrom, type Observation } from "@taptics/session";
import { Card } from "@/components/ui";
import { itemBehavior, library, scheduleInputs } from "@/lib/server";

const DIMENSIONS = ["discovery", "technique", "composure", "outcome"] as const;

/** One rep's progress (spec 18.1 Progress, 18.2 Rep detail): the same view for the rep and the manager. */
export function ProgressView({ progress, history, lang }: { progress: RepProgress; history: Observation[]; lang: Language }) {
  const lib = library();
  const now = new Date();
  const release1 = scheduleInputs(lib).scenarios.filter((s) => s.release1);
  const certified = release1.filter((s) => certificationState(s.code, history, now).state === "certified").length;
  const mastery = masteryFrom(history);
  const objections = release1
    .map((s) => ({ code: s.code, title: lib.scenarios.get(s.code)!.title[lang], m: mastery.get(`scenario:${s.code}`) }))
    .filter((x) => x.m)
    .sort((a, b) => a.m!.value - b.m!.value);
  const fmtWeek = (d: string) => new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm text-muted">{t("progress.certified", lang)}</p>
        <p className="text-2xl font-bold text-ink" data-testid="progress-certified">{certified}/{release1.length}</p>
      </Card>

      <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("progress.dimensions", lang)}>
        <h2 className="mb-2 font-bold text-ink">{t("progress.dimensions", lang)}</h2>
        {progress.weeks.length === 0 ? (
          <p className="text-muted" data-testid="progress-no-scores">{t("progress.noComplete", lang)}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted"><tr><th className="py-2 pr-3">{t("progress.week", lang)}</th>{DIMENSIONS.map((d) => <th key={d} className="pr-3">{t(`dimension.${d}`, lang)}</th>)}</tr></thead>
            <tbody className="divide-y divide-line text-ink">
              {progress.weeks.map((w) => (
                <tr key={w.week}><td className="py-2 pr-3">{fmtWeek(w.week)}</td>{DIMENSIONS.map((d) => <td key={d} className="pr-3 font-mono">{w.dimensions[d] ?? "—"}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-bold text-ink">{t("progress.weakest", lang)}</h2>
        {progress.weakest.length === 0 ? (
          <p className="text-muted">{t("progress.notEnough", lang)}</p>
        ) : (
          <ul className="space-y-2" data-testid="progress-weakest">
            {progress.weakest.map((w) => (
              <li key={w.code} className="flex justify-between gap-3"><span className="text-ink">{itemBehavior(w.code)?.[lang] ?? w.code}</span><span className="font-mono text-muted">{Math.round(w.ratio * 100)}%</span></li>
            ))}
          </ul>
        )}
      </Card>

      {objections.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold text-ink">{t("progress.mastery", lang)}</h2>
          <ul className="space-y-2">
            {objections.map((o) => (
              <li key={o.code}>
                <div className="flex justify-between gap-3 text-sm"><span className="text-ink">{o.title}</span><span className="font-mono text-muted">{Math.round(o.m!.value * 100)}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-ground" aria-hidden="true"><div className="h-2 rounded-full bg-brand" style={{ width: `${Math.round(o.m!.value * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-bold text-ink">{t("progress.cards", lang)}</h2>
        {progress.cards.length === 0 ? (
          <p className="text-muted">{t("today.noCard", lang)}</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="progress-cards">
            {progress.cards.map((c) => (
              <li key={c.week} className="py-2">
                <p className="text-ink">{fmtWeek(c.week)} · {lib.behaviorCards.get(c.cardCode)?.title[lang] ?? c.cardCode}</p>
                <p className="text-sm text-muted">{c.observed ? t("progress.checked", lang, { observed: t(`floor.observed.${c.observed}` as "floor.observed.yes", lang) }) : t(`progress.card.${c.status}` as "progress.card.open", lang)}{c.note ? ` · “${c.note}”` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
