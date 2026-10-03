import { IconChevronLeft, IconPlay } from "@/components/icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { t } from "@taptics/i18n";
import { backLinkClass, buttonClass, Card, Grade, Pill, titleClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { language, library } from "@/lib/server";

function Both({ label, value, quote = false }: { label: string; value: { en: string; es: string }; quote?: boolean }) {
  const q = (s: string) => (quote ? `“${s}”` : s);
  return (
    <div>
      <p className="text-[13px] font-semibold text-brand">{label}</p>
      <p className="mt-1 text-ink" lang="en">{q(value.en)}</p>
      <p className="mt-1 text-ink" lang="es">{q(value.es)}</p>
    </div>
  );
}

export default async function Detail({ params }: { params: Promise<{ code: string }> }) {
  await requireUser();
  const { code } = await params;
  const lang = await language();
  const lib = library();
  const tech = lib.techniques.get(code);
  if (tech) {
    return (
      <div className="space-y-4">
        <Link href="/library" className={backLinkClass}><IconChevronLeft size={20} />{t("library.title", lang)}</Link>
        <div className="flex items-start gap-3">
          <span className="pt-3"><Grade grade={tech.evidence.grade} label={t(`evidence.${tech.evidence.grade}` as "evidence.A", lang)} /></span>
          <div className="space-y-1">
            <h1 className={titleClass}>{tech.name[lang]}</h1>
            <p className="text-sm text-muted">{tech.code} · {t(`evidence.${tech.evidence.grade}` as "evidence.A", lang)}</p>
          </div>
        </div>
        <Card className="space-y-4">
          <Both label={t("library.when", lang)} value={tech.when} />
          <Both label={t("library.modelLine", lang)} value={tech.model_line} quote={tech.model_line_kind === "spoken"} />
          {tech.use_only_when && <Both label={t("library.onlyWhen", lang)} value={tech.use_only_when} />}
          {tech.flawed_line && <Both label={t("library.flawedLine", lang)} value={tech.flawed_line} quote />}
          {tech.why && <Both label={t("library.why", lang)} value={tech.why} />}
          {!tech.spanish_reviewed && <Pill>{t("library.spanishPending", lang)}</Pill>}
        </Card>
        <Card className="space-y-2">
          <p className="text-[13px] font-semibold text-brand">{t("library.source", lang)}</p>
          <p className="text-ink">{tech.evidence.note}</p>
          <ul className="space-y-1">
            {tech.sources.map((s) => (
              <li key={s}><a className="break-all text-sm text-brand underline" href={s} rel="noreferrer" target="_blank">{s}</a></li>
            ))}
          </ul>
          {tech.compliance.length > 0 && <p className="text-sm">{t("library.rules", lang)}: {tech.compliance.join(", ")}</p>}
          {tech.related.length > 0 && (
            <p className="text-sm">
              {t("library.related", lang)}: {tech.related.map((r) => <Link key={r} className="mr-2 text-brand underline" href={`/library/${r}`}>{r}</Link>)}
            </p>
          )}
        </Card>
      </div>
    );
  }
  const obj = lib.objections.get(code);
  if (!obj) notFound();
  // Every objection has a customer to practice it on (spec 9: one level 1 scenario per objection by release 2).
  const practice = [...lib.scenarios.values()].filter((s) => s.objection === obj.code && s.status === "active").sort((a, b) => a.difficulty - b.difficulty);
  return (
    <div className="space-y-4">
      <Link href="/library?tab=objections" className={backLinkClass}><IconChevronLeft size={20} />{t("library.objections", lang)}</Link>
      <h1 className={titleClass}>{obj.code} · {obj.says[lang] || obj.says[lang === "en" ? "es" : "en"]}</h1>
      <Card className="space-y-4">
        <Both label={t("library.behind", lang)} value={obj.behind} />
        {obj.behind_source && <p className="text-sm text-muted">{t("library.source", lang)}: {obj.behind_source}</p>}
        <div>
          <p className="text-[13px] font-semibold text-brand">{t("library.coreMoves", lang)}</p>
          <p className="mt-1 flex flex-wrap gap-2">
            {obj.core_moves.techniques.map((c) => <Link key={c} href={`/library/${c}`} className="text-brand underline">{c} {lib.techniques.get(c)?.name[lang]}</Link>)}
          </p>
          {obj.core_moves.notes && <p className="mt-1 text-ink">{obj.core_moves.notes[lang]}</p>}
        </div>
        {!obj.spanish_reviewed && <Pill>{t("library.spanishPending", lang)}</Pill>}
      </Card>
      {practice.map((s) => (
        <Link key={s.code} href={`/practice/${s.code}`} className={buttonClass} data-testid={`practice-${s.code}`}>
          <IconPlay size={18} className="fill-current" />
          {practice.length === 1 ? t("library.practiceThis", lang) : t("practice.level", lang, { n: s.difficulty })}
        </Link>
      ))}
    </div>
  );
}
