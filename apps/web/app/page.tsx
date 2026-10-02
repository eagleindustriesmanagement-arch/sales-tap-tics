import Link from "next/link";
import { t } from "@taptics/i18n";
import { Card, Grade, buttonClass } from "@/components/ui";
import { language, library } from "@/lib/server";

export default async function Today() {
  const lang = await language();
  const lib = library();
  const scenarios = [...lib.scenarios.values()].filter((s) => s.status === "active");
  const next = scenarios[0];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t("today.title", lang)}</h1>
        <p className="mt-1 text-muted">{t("app.tagline", lang)}</p>
      </div>
      {next && (
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("today.recommended", lang)}</p>
          <h2 className="mt-1 text-xl font-bold text-ink">{next.title[lang]}</h2>
          <p className="mt-1">{next.setting[lang]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {next.target_techniques.map((code) => {
              const tech = lib.techniques.get(code)!;
              return (
                <span key={code} className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-3 text-sm text-ink">
                  <Grade grade={tech.evidence.grade} label={t(`evidence.${tech.evidence.grade}` as "evidence.A", lang)} />
                  {tech.name[lang]}
                </span>
              );
            })}
          </div>
          <Link href={`/practice/${next.code}`} className={`${buttonClass} mt-4 w-full sm:w-auto`}>
            {t("today.practiceNow", lang)}
          </Link>
        </Card>
      )}
      <Card>
        <h2 className="font-semibold text-ink">{t("today.behaviorCard", lang)}</h2>
        <p className="mt-1 text-muted">{t("today.noCard", lang)}</p>
      </Card>
      <Card>
        <h2 className="font-semibold text-ink">{t("today.assignments", lang)}</h2>
        <p className="mt-1 text-muted">{t("today.noAssignments", lang)}</p>
      </Card>
    </div>
  );
}
