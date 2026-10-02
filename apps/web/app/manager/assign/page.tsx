import { assignableReps } from "@taptics/db";
import { t } from "@taptics/i18n";
import { AssignForm } from "@/components/assign-form";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library, practiceList } from "@/lib/server";

/** Assign practice (spec 18 "Assign" screen): scenario, reps, due date, reason. */
export default async function Assign({ searchParams }: { searchParams: Promise<{ rep?: string }> }) {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const lib = library();
  const reps = await asUser(principalOf(user), (db) => assignableReps(db, user));
  const scenarios = practiceList(lib)
    .map((s) => ({ code: s.code, level: s.difficulty, title: lib.scenarios.get(s.code)!.title[lang] }))
    .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title, lang));
  const { rep } = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{t("assign.title", lang)}</h1>
      <AssignForm language={lang} reps={reps} scenarios={scenarios} preselected={rep ? [rep] : []} />
    </div>
  );
}
