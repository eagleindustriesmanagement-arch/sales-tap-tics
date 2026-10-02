import Link from "next/link";
import { t, type Language } from "@taptics/i18n";
import { Card, Grade, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { language, library } from "@/lib/server";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function Library({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; grade?: string }> }) {
  await requireUser();
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
      <h1 className="text-2xl font-bold text-ink">{t("library.title", lang)}</h1>
      <div role="tablist" className="flex gap-2">
        {(["techniques", "objections"] as const).map((name) => (
          <Link key={name} role="tab" aria-selected={tab === name} href={tabLink(name)} className={`min-h-11 rounded-xl px-4 py-2.5 font-semibold ${tab === name ? "bg-brand text-brand-ink" : "border border-line text-ink"}`}>
            {t(`library.${name}`, lang)}
          </Link>
        ))}
      </div>
      <form className="flex flex-wrap gap-2" action="/library">
        <input type="hidden" name="tab" value={tab} />
        <label className="sr-only" htmlFor="q">{t("library.search", lang)}</label>
        <input id="q" name="q" defaultValue={q} placeholder={t("library.search", lang)} className="min-h-12 flex-1 rounded-xl border border-line bg-surface px-4 text-ink" />
        {tab === "techniques" && (
          <select name="grade" defaultValue={grade} aria-label="Evidence grade" className="min-h-12 rounded-xl border border-line bg-surface px-3 text-ink">
            <option value="">{t("library.allGrades", lang)}</option>
            {["A", "B", "C", "D"].map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        <button className="min-h-12 rounded-xl border border-line px-4 font-semibold text-ink">{t("library.search", lang)}</button>
      </form>
      <p className="text-sm text-muted">{t("library.results", lang, { count: tab === "techniques" ? techniques.length : objections.length })}</p>
      <ul className="space-y-3">
        {tab === "techniques"
          ? techniques.map((x) => (
              <li key={x.code}>
                <Link href={`/library/${x.code}`} className="block">
                  <Card className="hover:border-brand">
                    <div className="flex items-start gap-3">
                      <Grade grade={x.evidence.grade} label={t(`evidence.${x.evidence.grade}` as "evidence.A", lang)} />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{x.code} · {x.name[lang]}</p>
                        <p className="mt-1 text-sm">{x.model_line_kind === "spoken" ? `“${x.model_line[lang]}”` : x.model_line[lang]}</p>
                        <p className="mt-1 text-xs text-muted">{x.evidence.note}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))
          : objections.map((x) => (
              <li key={x.code}>
                <Link href={`/library/${x.code}`} className="block">
                  <Card className="hover:border-brand">
                    <p className="font-semibold text-ink">{x.code} · {x.says[lang] || x.says[lang === "en" ? "es" : "en"]}</p>
                    <p className="mt-1 text-sm">{x.behind[lang]}</p>
                    {x.release_1 && <div className="mt-2"><Pill>{t("library.release1", lang)}</Pill></div>}
                  </Card>
                </Link>
              </li>
            ))}
      </ul>
    </div>
  );
}
