import Link from "next/link";
import { notFound } from "next/navigation";
import { listSessions, practiceHistory, progressFor } from "@taptics/db";
import { t } from "@taptics/i18n";
import { ProgressView } from "@/components/progress-view";
import { ListRow, PageHeader, RowGroup, ScoreBadge, WarmUpTag, SectionTitle, buttonClass } from "@/components/ui";
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
      <PageHeader title={data.name} action={<Link href={`/manager/assign?rep=${id}`} className={buttonClass}>{t("assign.title", lang)}</Link>} />
      {/* A manager sees a warm-up only as done (spec 12.5): its result never reaches their mastery view. */}
      <ProgressView progress={data.progress} history={data.past.history.filter((o) => o.mode !== "warm_up")} lang={lang} />
      {data.sessions.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>{t("team.repSessions", lang, { name: data.name ?? "" })}</SectionTitle>
          <RowGroup>
            {data.sessions.map((s) => (
              <ListRow key={s.id} href={`/history/${s.id}`} title={library().scenarios.get(s.scenarioCode)?.title[lang] ?? s.scenarioCode} trailing={s.mode === "warm_up" && s.total !== null ? <WarmUpTag label={t("warmup.listLabel", lang)} /> : <ScoreBadge total={s.total} partial={s.partial} />} />
            ))}
          </RowGroup>
        </section>
      )}
    </div>
  );
}
