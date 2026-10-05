import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionDetail, isManager, listScoreOverrides } from "@taptics/db";
import { t } from "@taptics/i18n";
import { OverrideForm } from "@/components/override-form";
import { Card, buttonClass } from "@/components/ui";
import { DebriefView } from "@/components/debrief-view";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { debriefPayload } from "@/lib/payload";
import { language, library } from "@/lib/server";

/** A stored session (spec 18.1 History): the rep's own, or a team member's for a manager (RLS decides, reads are audited). */
export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await language();
  const { detail, overrides } = await asUser(principalOf(user), async (db) => ({ detail: await getSessionDetail(db, user, id), overrides: await listScoreOverrides(db, id) }));
  if (!detail) notFound();
  // A session left before it was scored (the app closed mid-conversation) has no debrief: the rep goes back to that
  // customer to try again, a manager sees that it was not finished. Never a "not found" for a row History listed.
  if (!detail.score || !detail.debrief) {
    if (detail.session.user_id === user.id) redirect(`/practice/${detail.session.scenario_code}`);
    return (
      <Card className="space-y-3" data-testid="session-unfinished">
        <p className="text-ink">{t("history.unfinished", lang)}</p>
        <Link href="/manager/team" className={buttonClass}>{t("history.backToTeam", lang)}</Link>
      </Card>
    );
  }
  // A warm-up (decision 0038): the rep sees how the one behavior went; a manager sees only that it was done (spec 12.5).
  if (detail.session.mode === "warm_up") {
    const own = detail.session.user_id === user.id;
    const items = (detail.score.items ?? []) as { code: string; points: number; max: number; status: string; explanation: { en: string; es: string } }[];
    const item = items[0];
    const behavior = item ? library().scenarios.get(detail.session.scenario_code)?.scoring?.items.find((i) => i.code === item.code)?.behavior : undefined;
    const landed = item?.status === "scored" && item.max > 0 && item.points >= item.max;
    return (
      <Card className="space-y-3" data-testid="warmup-summary">
        <p className="text-[17px] font-bold text-ink">{t("warmup.listLabel", lang)}</p>
        {behavior && <p className="text-[15px] text-body">{behavior[lang]}</p>}
        {own && item && <p className={`text-[15px] font-semibold ${landed ? "text-good" : "text-muted"}`}>{t(landed ? "warmup.landed" : item.status === "scored" ? "warmup.missed" : "warmup.notScored", lang)}</p>}
        <Link href={own ? "/today" : "/manager/team"} className={buttonClass}>{t(own ? "warmup.toToday" : "history.backToTeam", lang)}</Link>
      </Card>
    );
  }
  const canFlag = isManager(user) && detail.session.user_id !== user.id;
  const dims = detail.score.dimensions as { partial?: boolean; coverage?: number };
  const payload = debriefPayload({
    scenarioCode: detail.session.scenario_code,
    language: lang,
    // A stored score the AI judge never saw (offline, or an outage, which stores the fixture judge): no claim about
    // the customer, only that the judge's behaviors were not scored (October 5 review).
    offline: false,
    noJudge: detail.score.judge_model === null || detail.score.judge_model === "fixture",
    endReason: detail.session.end_reason,
    // A booked next step or a sale is what the session ended on; the chip shows here as in the live debrief.
    nextStepSecured: detail.session.end_reason === "next_step" || detail.session.end_reason === "sale",
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
