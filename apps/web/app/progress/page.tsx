import Link from "next/link";
import { practiceHistory, progressFor } from "@taptics/db";
import { t } from "@taptics/i18n";
import { IconClock } from "@/components/icons";
import { ProgressView } from "@/components/progress-view";
import { PageHeader, smallButtonClass } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

export default async function Progress() {
  const user = await requireUser();
  const lang = await language();
  const { progress, past } = await asUser(principalOf(user), async (db) => ({ progress: await progressFor(db, user.id), past: await practiceHistory(db, user.id) }));
  return (
    <div className="space-y-5">
      <PageHeader title={t("progress.title", lang)} action={<Link href="/history" className={smallButtonClass}><IconClock size={18} />{t("progress.history", lang)}</Link>} />
      <ProgressView progress={progress} history={past.history} lang={lang} />
    </div>
  );
}
