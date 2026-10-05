import Link from "next/link";
import { t, type Language } from "@taptics/i18n";
import { IconChevronRight, IconSearch } from "@/components/icons";
import { Chip, Grade, PageHeader, fieldClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { language, library } from "@/lib/server";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function Library({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; grade?: string }> }) {
  const user = await requireUser();
  const lang: Language = await language();
  const { tab = "techniques", q = "", grade = "" } = await searchParams;
  const lib = library();
  const query = fold(q.trim());
  const techniques = [...lib.techniques.values()].filter(
    (x) => (!grade || x.evidence.grade === grade) && (!query || fold(`${x.code} ${x.name.en} ${x.name.es} ${x.model_line.en} ${x.model_line.es} ${x.when.en}`).includes(query)),
  );
  const objections = [...lib.objections.values()].filter((x) => !query || fold(`${x.code} ${x.says.en} ${x.says.es} ${x.behind.en}`).includes(query));
  const tabLink = (name: string) => `/library?tab=${name}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <div className="space-y-4">
      <PageHeader title={t("library.title", lang)} />
      {/* The example lines come from car sales; a solar, homes or furniture team is told the moves carry over. */}
      {user.industry !== "cars" && <p className="text-[14px] text-muted" data-testid="library-car-note">{t("library.carExamples", lang)}</p>}
      <div role="tablist" className="liquid-glass-inset grid grid-cols-2 gap-1 rounded-[1.1rem] p-1">
        {(["techniques", "objections"] as const).map((name) => (
          <Link key={name} role="tab" aria-selected={tab === name} href={tabLink(name)} className={`flex min-h-11 items-center justify-center rounded-[0.85rem] px-4 text-[15px] font-semibold ${tab === name ? "liquid-glass liquid-glass-flat text-ink" : "text-muted"}`}>
            {t(`library.${name}`, lang)}
          </Link>
        ))}
      </div>
      <form className="flex gap-2" action="/library">
        <input type="hidden" name="tab" value={tab} />
        <label className="sr-only" htmlFor="q">{t("library.search", lang)}</label>
        <input id="q" name="q" defaultValue={q} placeholder={t("library.search", lang)} className={`${fieldClass} min-w-0 flex-1`} type="search" />
        {tab === "techniques" && (
          <select name="grade" defaultValue={grade} aria-label={t("library.gradeLabel", lang)} className="liquid-glass-field min-h-12 rounded-[0.875rem] px-3 text-ink">
            <option value="">{t("library.allGrades", lang)}</option>
            {["A", "B", "C", "D"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        <button aria-label={t("library.search", lang)} className="liquid-glass liquid-glass-accent liquid-glass-flat grid h-12 w-12 shrink-0 place-items-center rounded-full"><IconSearch size={20} /></button>
      </form>
      <p className="px-1 text-[14px] text-muted">{t("library.results", lang, { count: tab === "techniques" ? techniques.length : objections.length })}</p>
      <ul className="liquid-glass liquid-glass-panel divide-y divide-line-soft overflow-hidden rounded-[1.25rem]">
        {tab === "techniques"
          ? techniques.map((x) => (
              <li key={x.code}>
                <Link href={`/library/${x.code}`} className="row-hover flex items-start gap-3 px-4 py-3.5">
                  <Grade grade={x.evidence.grade} label={t(`evidence.${x.evidence.grade}` as "evidence.A", lang)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-ink">{x.name[lang]}</p>
                    <p className="mt-0.5 line-clamp-2 text-[14px] text-body">{x.model_line_kind === "spoken" ? `“${x.model_line[lang]}”` : x.model_line[lang]}</p>
                  </div>
                  <IconChevronRight size={18} className="mt-1 shrink-0 text-faint" />
                </Link>
              </li>
            ))
          : objections.map((x) => (
              <li key={x.code}>
                <Link href={`/library/${x.code}`} className="row-hover flex items-start gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold text-ink">“{x.says[lang] || x.says[lang === "en" ? "es" : "en"]}”</p>
                    <p className="mt-0.5 line-clamp-2 text-[14px] text-body">{x.behind[lang]}</p>
                    {x.release_1 && <Chip tone="brand" className="mt-1.5">{t("library.release1", lang)}</Chip>}
                  </div>
                  <IconChevronRight size={18} className="mt-1 shrink-0 text-faint" />
                </Link>
              </li>
            ))}
      </ul>
    </div>
  );
}
