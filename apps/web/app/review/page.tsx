import Link from "next/link";
import { listSpanishReviews } from "@taptics/db";
import { t } from "@taptics/i18n";
import { Card, PageHeader, SectionTitle } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { reviewProgress } from "@/lib/review";
import { language, library, scheduleInputs } from "@/lib/server";

/** Spanish review (spec 16.3): every scenario with how many of its lines are reviewed, release 1 first. */
export default async function Review() {
  const user = await requireUser({ roles: ["content_editor", "compliance_reviewer", "general_manager"] });
  const lang = await language();
  const lib = library();
  const reviews = await asUser(principalOf(user), (db) => listSpanishReviews(db));
  const row = (code: string) => ({ code, title: lib.scenarios.get(code)!.title[lang], ...reviewProgress(code, reviews) });
  const all = scheduleInputs(lib).scenarios;
  const rows = all.filter((s) => s.release1).map((s) => row(s.code));
  // Release 2 customers: reviewed the same way, but release 1 does not wait on them (spec 16.3 item 4).
  const later = all.filter((s) => !s.release1).map((s) => row(s.code)).sort((a, b) => a.title.localeCompare(b.title, lang));
  const approved = rows.reduce((n, r) => n + r.approved, 0);
  const total = rows.reduce((n, r) => n + r.total, 0);
  return (
    <div className="space-y-4">
      <PageHeader title={t("review.title", lang)} subtitle={t("review.intro", lang)} />
      <p className="font-semibold text-ink" data-testid="review-total">{t("review.total", lang, { approved, total })}</p>
      <ReviewList rows={rows} />
      {later.length > 0 && (
        <>
          <div className="pt-3"><SectionTitle>{t("review.later.title", lang)}</SectionTitle></div>
          <p className="text-muted" data-testid="review-later-total">{t("review.later.intro", lang, { approved: later.reduce((n, r) => n + r.approved, 0), total: later.reduce((n, r) => n + r.total, 0) })}</p>
          <ReviewList rows={later} />
        </>
      )}
    </div>
  );
}

function ReviewList({ rows }: { rows: { code: string; title: string; approved: number; total: number }[] }) {
  return (
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
  );
}
