import { language, library } from "@/lib/server";
import { FloorCheck, type FloorCard } from "@/components/floor-check";
import { t } from "@taptics/i18n";

export default async function FloorMode() {
  const lang = await language();
  const cards: FloorCard[] = [...library().behaviorCards.values()].map((c) => ({ code: c.code, title: c.title, behavior: c.behavior, script: c.floor_check_script, lookFor: c.look_for }));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("floor.title", lang)}</h1>
        <p className="text-muted">{t("floor.subtitle", lang)}</p>
      </div>
      {cards.map((c) => <FloorCheck key={c.code} card={c} language={lang} />)}
    </div>
  );
}
