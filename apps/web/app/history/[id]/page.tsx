import { notFound } from "next/navigation";
import { getSessionDetail, isManager, listScoreOverrides } from "@taptics/db";
import { t } from "@taptics/i18n";
import { OverrideForm } from "@/components/override-form";
import { Card } from "@/components/ui";
import { DebriefView } from "@/components/debrief-view";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { debriefPayload } from "@/lib/payload";
import { language } from "@/lib/server";

/** A stored session (spec 18.1 History): the rep's own, or a team member's for a manager (RLS decides, reads are audited). */
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await language();
  const { detail, overrides } = await asUser(principalOf(user), async (db) => ({ detail: await getSessionDetail(db, user, id), overrides: await listScoreOverrides(db, id) }));
  if (!detail || !detail.score || !detail.debrief) notFound();
  const canFlag = isManager(user) && detail.session.user_id !== user.id;
  const dims = detail.score.dimensions as { partial?: boolean; coverage?: number };
  const payload = debriefPayload({
    language: lang,
    offline: detail.score.judge_model === null,
    endReason: detail.session.end_reason,
    nextStepSecured: false,
    score: { total: detail.score.total, passed: detail.score.passed, partial: dims.partial, coverage: dims.coverage, honestyPassed: detail.score.honesty_passed, items: detail.score.items },
    debrief: detail.debrief,
    transcript: detail.turns,
  });
  const fmt = new Intl.DateTimeFormat(lang === "es" ? "es-US" : "en-US", { dateStyle: "medium", timeZone: "America/New_York" });
  return (
    <div className="space-y-4">
      {overrides.length > 0 && (
        <Card className="space-y-2" data-testid="overrides">
          <h2 className="font-bold text-ink">{t("override.title", lang)}</h2>
          {overrides.map((o, i) => (
            <p key={i} className="text-ink">{t(`override.flag.${o.flag}`, lang)} · {o.manager} · {fmt.format(new Date(o.created_at))}: “{o.reason}”</p>
          ))}
          <p className="text-sm text-muted">{t("override.note", lang)}</p>
        </Card>
      )}
      <DebriefView data={payload} language={lang} scenarioCode={detail.session.scenario_code} seenId={detail.session.user_id === user.id ? id : undefined} />
      {canFlag && <OverrideForm sessionId={id} language={lang} />}
    </div>
  );
}
