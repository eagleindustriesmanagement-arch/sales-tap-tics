import { t } from "@taptics/i18n";
import { coachScene } from "@taptics/scoring";
import { CoachForm } from "@/components/coach-form";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { language, library } from "@/lib/server";

/** Coach the coach (spec 14.3): a scene the manager "watched", then the manager's floor check, scored. */
export default async function Coach({ searchParams }: { searchParams: Promise<{ card?: string; n?: string }> }) {
  const user = await requireUser({ manager: true });
  const lang = await language();
  const lib = library();
  const cards = [...lib.behaviorCards.values()];
  const { card: wanted, n } = await searchParams;
  const seed = Number(n ?? Math.floor(Date.now() / 86_400_000));
  const card = (wanted && lib.behaviorCards.get(wanted)) || cards[seed % cards.length]!;
  const scene = coachScene(lib, card, seed, user.industry);
  return (
    <div className="space-y-4">
      <PageHeader title={t("coach.title", lang)} subtitle={t("coach.intro", lang)} />
      <CoachForm
        language={lang}
        cardCode={card.code}
        cardTitle={card.title[lang]}
        scene={scene.scene[lang]}
        cards={cards.map((c) => ({ code: c.code, title: c.title[lang] }))}
      />
    </div>
  );
}
