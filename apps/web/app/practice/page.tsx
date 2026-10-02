import Link from "next/link";
import { scenarioProgress } from "@taptics/db";
import { t } from "@taptics/i18n";
import { recommend } from "@taptics/session";
import { Card, Pill } from "@/components/ui";
import { principalOf, requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { language, library, practiceList } from "@/lib/server";

/** Every scenario by level, with the rep's progress on each (spec 15: certification needs all 20 at level 1). */
export default async function Practice() {
  const user = await requireUser();
  const lang = await language();
  const lib = library();
  const progress = await asUser(principalOf(user), (db) => scenarioProgress(db, user.id));
  const list = practiceList(lib);
  const next = recommend(list, progress)[0]?.code;
  const levels = [...new Set(list.map((s) => s.difficulty))].sort();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("practice.title", lang)}</h1>
        <p className="mt-1 text-muted">{t("practice.intro", lang)}</p>
      </div>
      {levels.map((level) => (
        <section key={level} className="space-y-2">
          <h2 className="font-bold text-ink">{t("practice.level", lang, { n: level })}</h2>
          <ul className="space-y-2">
            {list
              .filter((s) => s.difficulty === level)
              .map((s) => lib.scenarios.get(s.code)!)
              .sort((a, b) => a.title[lang].localeCompare(b.title[lang], lang))
              .map((s) => {
                const p = progress.get(s.code);
                const status = !p
                  ? t("practice.notTried", lang)
                  : p.best === null
                    ? t("practice.tried", lang, { n: p.attempts })
                    : t("practice.best", lang, { score: Math.round(p.best) });
                return (
                  <li key={s.code}>
                    <Link href={`/practice/${s.code}`} className="block" data-testid={`scenario-${s.code}`}>
                      <Card className="flex items-center justify-between gap-3 hover:border-brand">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{s.title[lang]}</p>
                          <p className="text-sm text-muted">{status}</p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          {s.code === next && <Pill>{t("practice.next", lang)}</Pill>}
                          {p?.passed && <Pill>{t("practice.passed", lang)}</Pill>}
                        </div>
                      </Card>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
