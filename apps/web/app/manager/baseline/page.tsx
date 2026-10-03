import { baseline, IMPORT_KINDS, latestExitCalibration, latestObjectionWeights, scoreValidityInputs, type ImportKind } from "@taptics/db";
import { EXIT_CALIBRATION, OBJECTION_WEIGHTS, SCORE_VALIDITY, scoreValidity, type Correlation, type ValidityMeasure } from "@taptics/session";
import { t } from "@taptics/i18n";
import { notFound } from "next/navigation";
import { ImportForm } from "@/components/import-form";
import { Card, PageHeader } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

/** The store's own numbers (spec 19.1): CSV upload and the close-rate baseline that training is measured against. */
export default async function Baseline() {
  const user = await requireUser({ roles: ["general_manager"] });
  const lang = await language();
  if (!user.storeId) notFound();
  const { b, cal, weighting, validity } = await asUser(principalOf(user), async (db) => ({
    b: await baseline(db, user.storeId!),
    cal: await latestExitCalibration(db, user.storeId!),
    weighting: await latestObjectionWeights(db, user.storeId!),
    validity: scoreValidity(await scoreValidityInputs(db, user.storeId!)),
  }));
  const measureName = (m: ValidityMeasure) => (m === "total" ? t("validity.total", lang) : t(`dimension.${m}` as "dimension.composure", lang));
  const cell = (c: Correlation | undefined) => (c && c.r !== null ? t("validity.cell", lang, { r: c.r.toFixed(2), n: c.n }) : "—");
  const lib = library();
  const w = (weighting?.value ?? {}) as { status?: string; matched?: number; weights?: Record<string, number>; byLabel?: { label: string; count: number }[]; unmatched?: { reason: string; count: number }[] };
  const labelText = (en: string) => lib.lostReasons?.reasons.find((r) => r.label.en === en)?.label[lang] ?? en;
  const topObjections = Object.entries(w.weights ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  const pct = (n: unknown) => `${Math.round(Number(n) * 100)}%`;
  const v = cal?.value ?? {};
  const calText = !cal ? null
    : v["status"] === "updated" ? t("baseline.calibration.updated", lang, { month: cal.month, target: pct(v["target"]), observed: pct(v["observed"]), multiplier: Number(v["multiplier"]) })
    : v["reason"] === "ups" ? t("baseline.calibration.ups", lang, { month: cal.month, multiplier: Number(v["multiplier"]), min: EXIT_CALIBRATION.minUps })
    : t("baseline.calibration.sessions", lang, { month: cal.month, multiplier: Number(v["multiplier"]), min: EXIT_CALIBRATION.minSessions, sessions: Number(v["sessions"] ?? 0) });
  const kinds = Object.fromEntries(Object.entries(IMPORT_KINDS).map(([k, v]) => [k, v.columns.join(",")])) as Record<ImportKind, string>;
  const rate = (sold: number, ups: number) => (ups ? `${Math.round((sold / ups) * 100)}%` : "—");
  const head = "py-2 pr-3";
  return (
    <div className="space-y-4">
      <PageHeader title={t("baseline.title", lang)} subtitle={t("baseline.intro", lang)} />
      <Card><ImportForm language={lang} kinds={kinds} /></Card>
      {calText && (
        <Card>
          <h2 className="font-bold text-ink">{t("baseline.calibration", lang)}</h2>
          <p className="mt-1 text-sm text-muted">{t("baseline.calibration.intro", lang)}</p>
          <p className="mt-2 text-ink" data-testid="calibration">{calText}</p>
        </Card>
      )}
      {weighting && (
        <Card className="space-y-3" data-testid="objection-weights">
          <div>
            <h2 className="font-bold text-ink">{t("baseline.weights", lang)}</h2>
            <p className="mt-1 text-sm text-muted">{t("baseline.weights.intro", lang)}</p>
          </div>
          {w.status !== "updated" && <p className="text-ink">{t("baseline.weights.insufficient", lang, { matched: w.matched ?? 0, min: OBJECTION_WEIGHTS.minRecords })}</p>}
          {topObjections.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted">{t("baseline.weights.top", lang)}</p>
              <ol className="mt-1 space-y-1 text-ink">
                {topObjections.map(([code, weight]) => {
                  const o = lib.objections.get(code);
                  return <li key={code} className="flex justify-between gap-3"><span className="min-w-0">{o ? o.says[lang] || o.says[lang === "en" ? "es" : "en"] : code}</span><span className="shrink-0 font-semibold tabular-nums">×{weight}</span></li>;
                })}
              </ol>
            </div>
          )}
          {(w.byLabel?.length ?? 0) > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted">{t("baseline.weights.reasons", lang)}</p>
              <ul className="mt-1 space-y-1 text-ink">
                {w.byLabel!.map((l) => <li key={l.label} className="flex justify-between gap-3"><span>{labelText(l.label)}</span><span className="tabular-nums">{l.count}</span></li>)}
              </ul>
            </div>
          )}
          {(w.unmatched?.length ?? 0) > 0 && <p className="text-sm text-muted">{t("baseline.weights.unmatched", lang, { reasons: w.unmatched!.map((u) => `${u.reason} (${u.count})`).join(", ") })}</p>}
        </Card>
      )}
      <Card className="space-y-3" data-testid="score-validity">
        <div>
          <h2 className="font-bold text-ink">{t("validity.title", lang)}</h2>
          <p className="mt-1 text-sm text-muted">{t("validity.intro", lang)}</p>
        </div>
        {validity.status === "insufficient_data" ? (
          <p className="text-ink">{t("validity.waiting", lang, { min: SCORE_VALIDITY.minReps, sessions: SCORE_VALIDITY.minSessions, ups: SCORE_VALIDITY.minUps, n: validity.reps })}</p>
        ) : (
          <>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("validity.title", lang)}>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium"><tr><th className="py-2 pr-3">{t("validity.measure", lang)}</th><th className="pr-3">{t("validity.close", lang)}</th><th>{t("validity.addons", lang)}</th></tr></thead>
                <tbody className="divide-y divide-line-soft text-ink tabular-nums">
                  {validity.closeRate.map((c) => (
                    <tr key={c.measure}><td className="py-2 pr-3">{measureName(c.measure)}</td><td className="pr-3">{cell(c)}</td><td>{cell(validity.addonCancellation.find((a) => a.measure === c.measure))}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {validity.weak.length > 0 && <p className="text-sm text-muted">{t("validity.weak", lang, { list: validity.weak.map(measureName).join(", ") })}</p>}
          </>
        )}
      </Card>
      {b.months.length === 0 && b.beBacks.length === 0 && <p className="text-muted">{t("baseline.none", lang)}</p>}
      {b.months.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("baseline.closeRate", lang)}>
          <h2 className="mb-2 font-bold text-ink">{t("baseline.closeRate", lang)}</h2>
          <table className="w-full text-left text-sm" data-testid="baseline-months">
            <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium"><tr><th className={head}>{t("baseline.month", lang)}</th><th className="pr-3">{t("baseline.ups", lang)}</th><th className="pr-3">{t("baseline.sold", lang)}</th><th>{t("baseline.rate", lang)}</th></tr></thead>
            <tbody className="divide-y divide-line-soft text-ink">
              {b.months.map((m) => <tr key={m.month}><td className={head}>{m.month}</td><td className="pr-3">{m.ups}</td><td className="pr-3">{m.sold}</td><td>{rate(m.sold, m.ups)}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
      {b.reps.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("baseline.byRep", lang)}>
          <h2 className="mb-2 font-bold text-ink">{t("baseline.byRep", lang)}</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium"><tr><th className={head}>{t("baseline.rep", lang)}</th><th className="pr-3">{t("baseline.ups", lang)}</th><th className="pr-3">{t("baseline.sold", lang)}</th><th>{t("baseline.rate", lang)}</th></tr></thead>
            <tbody className="divide-y divide-line-soft text-ink">
              {[...b.reps].sort((x, y) => y.ups - x.ups).map((r) => <tr key={r.rep_user_id ?? r.rep_label}><td className={head}>{r.rep_label}</td><td className="pr-3">{r.ups}</td><td className="pr-3">{r.sold}</td><td>{rate(r.sold, r.ups)}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
      {b.beBacks.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${t("baseline.beBacks", lang)} / ${t("baseline.walkAways", lang)}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium"><tr><th className={head}>{t("baseline.month", lang)}</th><th className="pr-3">{t("baseline.beBacks", lang)}</th><th>{t("baseline.walkAways", lang)}</th></tr></thead>
            <tbody className="divide-y divide-line-soft text-ink">
              {b.beBacks.map((m) => <tr key={m.month}><td className={head}>{m.month}</td><td className="pr-3">{m.be_backs}</td><td>{m.walk_aways}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
