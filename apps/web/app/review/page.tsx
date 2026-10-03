import Link from "next/link";
import { listSpanishReviews } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { reviewProgress } from "@/lib/review";
import { language, library, scheduleInputs } from "@/lib/server";

/** Spanish review (spec 16.3): every release 1 scenario with how many of its lines are reviewed. */
export default async function Review() {
  const user = await requireUser({ roles: ["content_editor", "compliance_reviewer", "general_manager"] });
  const lang = await language();
  const lib = library();
  const reviews = await asUser(principalOf(user), (db) => listSpanishReviews(db));
  const rows = scheduleInputs(lib).scenarios.filter((s) => s.release1).map((s) => ({ code: s.code, title: lib.scenarios.get(s.code)!.title[lang], ...reviewProgress(s.code, reviews) }));
  const approved = rows.reduce((n, r) => n + r.approved, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  return (
    <div className="space-y-4">
      <h1 className="text-[28px] leading-tight font-bold tracking-tight text-ink">{t("review.title", lang)}</h1>
      <p className="text-muted">{t("review.intro", lang)}</p>
      <p className="font-semibold text-ink" data-testid="review-total">{t("review.total", lang, { approved, total })}</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.code}>
            <Card className="flex items-center justify-between gap-3">
              <Link href={`/review/${r.code}`} className="min-w-0 flex-1 font-semibold text-ink" data-testid={`review-${r.code}`}>{r.title}</Link>
              <span className={r.approved === r.total ? "text-good" : "text-muted"}>{r.approved}/{r.total}</span>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
