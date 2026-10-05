import Link from "next/link";
import { complianceFlags } from "@taptics/db";
import { t } from "@taptics/i18n";
import { IconShield } from "@/components/icons";
import { Card, Empty, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

/** Compliance view (spec 14.5 item 3): violations by rule and by rep, with the turn and the true fact. */
export default async function Compliance() {
  const user = await requireUser({ roles: ["manager", "general_manager", "compliance_reviewer"] });
  const lang = await language();
  const flags = await asUser(principalOf(user), (db) => complianceFlags(db));
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
  if (flags.recent.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("compliance.title", lang)} />
        <Card><Empty icon={<IconShield size={22} />}>{t("compliance.none", lang)}</Empty></Card>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <PageHeader title={t("compliance.title", lang)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold text-ink">{t("compliance.byRule", lang)}</h2>
          <ul className="divide-y divide-line-soft text-[15px]">{flags.byRule.map((r) => <li key={`${r.rule_code}${r.severity}`} className="flex justify-between py-2"><span className={r.severity === "critical" ? "font-semibold text-bad" : "text-body"}>{r.rule_code}</span><span className="font-semibold text-ink tabular-nums">{r.n}</span></li>)}</ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-ink">{t("compliance.byRep", lang)}</h2>
          <ul className="divide-y divide-line-soft text-[15px]">{flags.byRep.map((r) => <li key={r.first_name} className="flex justify-between py-2"><span className="text-body">{r.first_name}</span><span className="tabular-nums"><span className="font-semibold text-bad">{r.critical}</span> / {r.n}</span></li>)}</ul>
        </Card>
      </div>
      <SectionTitle>{t("compliance.recent", lang)}</SectionTitle>
      <ul className="space-y-3">
        {flags.recent.map((v) => (
          <li key={v.id}>
            <Link href={`/history/${v.session_id}`} className="block">
              <Card className="space-y-1">
                <p className="text-sm text-muted">{v.first_name} · {fmt.format(new Date(v.created_at))}</p>
                <p className={`font-semibold ${v.severity === "critical" ? "text-bad" : "text-ink"}`}>{v.rule_code} · {(["critical", "major", "minor"] as const).includes(v.severity as "critical") ? t(`severity.${v.severity as "critical"}`, lang) : v.severity}</p>
                {v.span && <p className="text-ink">“{v.span}”</p>}
                <p className="text-sm">{(v.true_fact as { en: string; es: string })[lang]}</p>
                {v.uncertain && <Pill>{t("compliance.review", lang)}</Pill>}
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
