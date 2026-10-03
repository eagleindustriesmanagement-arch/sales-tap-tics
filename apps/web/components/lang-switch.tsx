import { t, type Language } from "@taptics/i18n";
import { IconGlobe } from "@/components/icons";

/** The language, one tap from anywhere (BookFlows panel: Luis). Used where the app frame is hidden. */
export function LangSwitch({ lang }: { lang: Language }) {
  const other = lang === "en" ? "es" : "en";
  return (
    <form action="/api/language" method="post">
      <input type="hidden" name="lang" value={other} />
      <button className="liquid-glass liquid-glass-flat inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-ink" lang={other}>
        <IconGlobe size={16} />{t("language.switch", lang)}
      </button>
    </form>
  );
}
