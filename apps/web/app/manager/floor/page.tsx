import { weekCards } from "@taptics/db";
import { t } from "@taptics/i18n";
import { FloorCheck, type FloorCard } from "@/components/floor-check";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

/** Floor mode (spec 18.2): this week's cards for the manager's team, grouped by behavior so several reps can be watched at once. */
export default async function FloorMode() {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const lib = library();
  const issued = (await asUser(principalOf(user), (db) => weekCards(db))).filter((c) => c.userId !== user.id);
  const groups = new Map<string, typeof issued>();
  for (const c of issued) groups.set(c.cardCode, [...(groups.get(c.cardCode) ?? []), c]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("floor.title", lang)}</h1>
        <p className="text-muted">{t("floor.subtitle", lang)}</p>
      </div>
      {issued.length === 0 && <p className="text-muted">{t("team.noCards", lang)}</p>}
      {[...groups].map(([code, cards]) => {
        const c = lib.behaviorCards.get(code);
        if (!c) return null;
        const card: FloorCard = { code: c.code, title: c.title, behavior: c.behavior, script: c.floor_check_script, lookFor: c.look_for };
        return (
          <section key={code} className="space-y-2">
            {cards.map((issue) => <FloorCheck key={issue.id} card={card} issueId={issue.id} repName={issue.firstName ?? "—"} status={issue.status} language={lang} />)}
          </section>
        );
      })}
    </div>
  );
}
