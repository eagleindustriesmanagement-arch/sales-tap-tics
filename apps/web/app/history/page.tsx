import Link from "next/link";
import { listSessions } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card, Pill } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

export default async function History() {
  const user = await requireUser();
  const lang = await language();
  const sessions = await asUser(principalOf(user), (db) => listSessions(db, { userId: user.id }));
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("history.title", lang)}</h1>
      {sessions.length === 0 && <p className="text-muted">{t("history.empty", lang)}</p>}
      <ul className="space-y-3">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link href={`/history/${s.id}`} className="block">
              <Card className="flex items-center justify-between gap-3 hover:border-brand">
                <div>
                  <p className="font-semibold text-ink">{library().scenarios.get(s.scenarioCode)?.title[lang] ?? s.scenarioCode}</p>
                  <p className="text-sm text-muted">{fmt.format(new Date(s.startedAt))} · {s.endReason ? t(`endReason.${s.endReason}` as "endReason.sale", lang) : t("history.inProgress", lang)}</p>
                  {s.privateUntil && new Date(s.privateUntil) > new Date() && <div className="mt-1"><Pill>{t("history.private", lang, { time: fmt.format(new Date(s.privateUntil)) })}</Pill></div>}
                </div>
                <span className="font-mono text-xl text-ink">{s.total === null ? "—" : Math.round(s.total)}{s.partial ? "*" : ""}</span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
