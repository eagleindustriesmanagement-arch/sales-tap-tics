import { baseline, IMPORT_KINDS, latestExitCalibration, type ImportKind } from "@taptics/db";
import { EXIT_CALIBRATION } from "@taptics/session";
import { t } from "@taptics/i18n";
import { notFound } from "next/navigation";
import { ImportForm } from "@/components/import-form";
import { Card } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

/** The store's own numbers (spec 19.1): CSV upload and the close-rate baseline that training is measured against. */
export default async function Baseline() {
  const user = await requireUser({ roles: ["general_manager"] });
  const lang = await language();
  if (!user.storeId) notFound();
  const { b, cal } = await asUser(principalOf(user), async (db) => ({ b: await baseline(db, user.storeId!), cal: await latestExitCalibration(db, user.storeId!) }));
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
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("baseline.title", lang)}</h1>
        <p className="mt-1 text-sm">{t("baseline.intro", lang)}</p>
      </div>
      <Card><ImportForm language={lang} kinds={kinds} /></Card>
      {calText && (
        <Card>
          <h2 className="font-bold text-ink">{t("baseline.calibration", lang)}</h2>
          <p className="mt-1 text-sm text-muted">{t("baseline.calibration.intro", lang)}</p>
          <p className="mt-2 text-ink" data-testid="calibration">{calText}</p>
        </Card>
      )}
      {b.months.length === 0 && b.beBacks.length === 0 && <p className="text-muted">{t("baseline.none", lang)}</p>}
      {b.months.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("baseline.closeRate", lang)}>
          <h2 className="mb-2 font-bold text-ink">{t("baseline.closeRate", lang)}</h2>
          <table className="w-full text-left text-sm" data-testid="baseline-months">
            <thead className="text-muted"><tr><th className={head}>{t("baseline.month", lang)}</th><th className="pr-3">{t("baseline.ups", lang)}</th><th className="pr-3">{t("baseline.sold", lang)}</th><th>{t("baseline.rate", lang)}</th></tr></thead>
            <tbody className="divide-y divide-line text-ink">
              {b.months.map((m) => <tr key={m.month}><td className={head}>{m.month}</td><td className="pr-3">{m.ups}</td><td className="pr-3">{m.sold}</td><td>{rate(m.sold, m.ups)}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
      {b.reps.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("baseline.byRep", lang)}>
          <h2 className="mb-2 font-bold text-ink">{t("baseline.byRep", lang)}</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-muted"><tr><th className={head}>{t("baseline.rep", lang)}</th><th className="pr-3">{t("baseline.ups", lang)}</th><th className="pr-3">{t("baseline.sold", lang)}</th><th>{t("baseline.rate", lang)}</th></tr></thead>
            <tbody className="divide-y divide-line text-ink">
              {[...b.reps].sort((x, y) => y.ups - x.ups).map((r) => <tr key={r.rep_user_id ?? r.rep_label}><td className={head}>{r.rep_label}</td><td className="pr-3">{r.ups}</td><td className="pr-3">{r.sold}</td><td>{rate(r.sold, r.ups)}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
      {b.beBacks.length > 0 && (
        <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${t("baseline.beBacks", lang)} / ${t("baseline.walkAways", lang)}`}>
          <table className="w-full text-left text-sm">
            <thead className="text-muted"><tr><th className={head}>{t("baseline.month", lang)}</th><th className="pr-3">{t("baseline.beBacks", lang)}</th><th>{t("baseline.walkAways", lang)}</th></tr></thead>
            <tbody className="divide-y divide-line text-ink">
              {b.beBacks.map((m) => <tr key={m.month}><td className={head}>{m.month}</td><td className="pr-3">{m.be_backs}</td><td>{m.walk_aways}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
