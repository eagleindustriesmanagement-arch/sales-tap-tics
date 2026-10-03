import { notFound } from "next/navigation";
import { listSpanishReviews } from "@taptics/db";
import { t } from "@taptics/i18n";
import { ReviewLines } from "@/components/review-lines";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { reviewProgress } from "@/lib/review";
import { language, library } from "@/lib/server";

export default async function ReviewScenario({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser({ roles: ["content_editor", "compliance_reviewer", "general_manager"] });
  const lang = await language();
  const { code } = await params;
  const s = library().scenarios.get(code);
  if (!s) notFound();
  const reviews = await asUser(principalOf(user), (db) => listSpanishReviews(db));
  const progress = reviewProgress(code, reviews);
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">{s.title[lang]}</h1>
      <p className="text-muted">{t("review.progress", lang, { approved: progress.approved, total: progress.total })}</p>
      <ReviewLines
        language={lang}
        scenario={code}
        canEdit={user.roles.includes("content_editor")}
        canSignOff={user.roles.includes("compliance_reviewer")}
        lines={progress.lines.map(({ line, review, status }) => ({ code: line.code, key: line.key, speaker: line.speaker, en: line.en, es: review && status !== "stale" ? review.esFinal : line.es, status }))}
      />
    </div>
  );
}
