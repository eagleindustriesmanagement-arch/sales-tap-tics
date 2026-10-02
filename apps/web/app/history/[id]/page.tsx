import { notFound } from "next/navigation";
import { getSessionDetail } from "@taptics/db";
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
  const detail = await asUser(principalOf(user), (db) => getSessionDetail(db, user, id));
  if (!detail || !detail.score || !detail.debrief) notFound();
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
  return <DebriefView data={payload} language={lang} scenarioCode={detail.session.scenario_code} />;
}
