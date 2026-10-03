import { auditEntries } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card, PageHeader } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

/** Audit log (spec 18.3): who read whose session, changed settings, people or scores. General manager only. */
export default async function Audit() {
  const user = await requireUser({ roles: ["general_manager"] });
  const lang = await language();
  const entries = await asUser(principalOf(user), (db) => auditEntries(db, 200));
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
  return (
    <div className="space-y-4">
      <PageHeader title={t("audit.title", lang)} subtitle={t("audit.intro", lang)} />
      <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("audit.title", lang)}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[13px] text-muted [&_th]:font-medium"><tr><th className="py-2 pr-3">{t("audit.when", lang)}</th><th className="pr-3">{t("audit.who", lang)}</th><th className="pr-3">{t("audit.what", lang)}</th><th>{t("audit.target", lang)}</th></tr></thead>
          <tbody className="divide-y divide-line-soft text-ink" data-testid="audit-rows">
            {entries.map((e, i) => (
              <tr key={i}><td className="py-2 pr-3 whitespace-nowrap">{fmt.format(new Date(e.at))}</td><td className="pr-3">{e.actor ?? "—"}</td><td className="pr-3 font-mono text-xs">{e.action}</td><td>{e.target_name ?? e.target_type}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
