import Link from "next/link";
import { notFound } from "next/navigation";
import { listSessions, practiceHistory, progressFor } from "@taptics/db";
import { t } from "@taptics/i18n";
import { ProgressView } from "@/components/progress-view";
import { Card, buttonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

/** Rep detail (spec 18.2): what this rep needs coaching on. Row-level security limits it to the manager's reps. */
export default async function RepDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await asUser(principalOf(user), async (db) => {
    const who = await db.query<{ first_name: string | null }>("select first_name from users where id = $1", [id]);
    if (!who.rows[0]) return null;
    return { name: who.rows[0].first_name, progress: await progressFor(db, id), past: await practiceHistory(db, id), sessions: await listSessions(db, { userId: id, limit: 10 }) };
  });
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{data.name}</h1>
        <Link href={`/manager/assign?rep=${id}`} className={buttonClass}>{t("assign.title", lang)}</Link>
      </div>
      <ProgressView progress={data.progress} history={data.past.history} lang={lang} />
      {data.sessions.length > 0 && (
        <Card>
          <h2 className="mb-2 font-bold text-ink">{t("history.title", lang)}</h2>
          <ul className="divide-y divide-line">
            {data.sessions.map((s) => (
              <li key={s.id}><Link href={`/history/${s.id}`} className="flex min-h-12 items-center justify-between gap-3 text-ink"><span>{library().scenarios.get(s.scenarioCode)?.title[lang] ?? s.scenarioCode}</span><span className="font-mono">{s.total === null ? "—" : Math.round(s.total)}{s.partial ? "*" : ""}</span></Link></li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
