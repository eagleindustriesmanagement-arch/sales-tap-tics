import { auditEntries } from "@taptics/db";
import { STRINGS, t } from "@taptics/i18n";
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
      {/* One entry per row, in plain words: who did what, to whom, when. Unknown codes show as they are. */}
      <Card className="p-0" role="region" aria-label={t("audit.title", lang)}>
        <ul className="divide-y divide-line-soft" data-testid="audit-rows">
          {entries.map((e, i) => {
            const key = `audit.action.${e.action}`;
            const what = key in STRINGS ? t(key as keyof typeof STRINGS, lang) : e.action;
            const target = e.target_name && e.target_name !== e.actor ? e.target_name : null;
            return (
              <li key={i} className="px-4 py-3">
                <p className="text-[15px] text-ink"><span className="font-semibold">{e.actor ?? "—"}</span> · {what}{target ? <span className="text-body"> · {target}</span> : null}</p>
                <p className="text-[13px] text-muted">{fmt.format(new Date(e.at))}</p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
