import { assignableReps, weekCards } from "@taptics/db";
import { t } from "@taptics/i18n";
import { FloorCheck, type FloorCard } from "@/components/floor-check";
import { FloorNewCheck } from "@/components/floor-new-check";
import { IconClipboard } from "@/components/icons";
import { Card, Empty, PageHeader } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library } from "@/lib/server";

/** Floor mode (spec 18.2): this week's cards for the manager's team, grouped by behavior so several reps can be watched at once. */
export default async function FloorMode() {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const lib = library();
  const { cards: all, reps } = await asUser(principalOf(user), async (db) => ({ cards: await weekCards(db), reps: await assignableReps(db, user) }));
  const issued = all.filter((c) => c.userId !== user.id);
  // Anyone on the team without this week's card can get a check started here, not only reps whose practice issued one.
  const unchecked = reps.filter((r) => r.id !== user.id && !all.some((c) => c.userId === r.id));
  const groups = new Map<string, typeof issued>();
  for (const c of issued) groups.set(c.cardCode, [...(groups.get(c.cardCode) ?? []), c]);
  return (
    <div className="space-y-5">
      <PageHeader title={t("floor.title", lang)} subtitle={t("floor.subtitle", lang)} />
      <FloorNewCheck language={lang} reps={unchecked} cards={[...lib.behaviorCards.values()].map((c) => ({ code: c.code, title: c.title[lang] }))} />
      {issued.length === 0 && unchecked.length === 0 && <Card><Empty icon={<IconClipboard size={22} />}>{t("team.noCards", lang)}</Empty></Card>}
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
