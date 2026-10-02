import { practiceHistory, progressFor } from "@taptics/db";
import { t } from "@taptics/i18n";
import { ProgressView } from "@/components/progress-view";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language } from "@/lib/server";

export default async function Progress() {
  const user = await requireUser();
  const lang = await language();
  const { progress, past } = await asUser(principalOf(user), async (db) => ({ progress: await progressFor(db, user.id), past: await practiceHistory(db, user.id) }));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("progress.title", lang)}</h1>
      <ProgressView progress={progress} history={past.history} lang={lang} />
    </div>
  );
}
