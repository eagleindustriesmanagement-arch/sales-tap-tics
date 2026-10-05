import { assignableReps } from "@taptics/db";
import { t } from "@taptics/i18n";
import { AssignForm } from "@/components/assign-form";
import { PageHeader } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { assignGroups } from "@/lib/assign-options";
import { asUser } from "@/lib/db";
import { language, library, practiceList } from "@/lib/server";

/** Assign practice (spec 18 "Assign" screen): scenario, reps, due date, reason. */
export default async function Assign({ searchParams }: { searchParams: Promise<{ rep?: string }> }) {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const lib = library();
  const reps = await asUser(principalOf(user), (db) => assignableReps(db, user));
  // The team's own industry first, the others after it under their own names (any active scenario stays assignable).
  const groups = assignGroups(
    practiceList(lib).map((s) => {
      const sc = lib.scenarios.get(s.code)!;
      return { code: s.code, industry: sc.industry, level: s.difficulty, title: sc.title[lang] };
    }),
    user.industry,
    lang,
  );
  const { rep } = await searchParams;
  return (
    <div className="space-y-4">
      <PageHeader title={t("assign.title", lang)} />
      <AssignForm language={lang} reps={reps} groups={groups} preselected={rep ? [rep] : []} />
    </div>
  );
}
