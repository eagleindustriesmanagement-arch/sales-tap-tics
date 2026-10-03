import Link from "next/link";
import { t, type Language } from "@taptics/i18n";
import { copy, say } from "./copy";
import { Brand } from "./parts";

export function Footer({ lang }: { lang: Language }) {
  const link = "inline-flex min-h-11 items-center text-[15px] font-medium text-body hover:text-ink";
  return (
    <footer className="relative pb-safe">
      <div className="mkt-hairline" />
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <Brand label={say(copy.nav.home, lang)} />
          <nav aria-label={say(copy.footer.links, lang)}>
            <ul className="flex flex-wrap gap-x-7 gap-y-1">
              <li><Link href="/login" className={link}>{say(copy.nav.signIn, lang)}</Link></li>
              <li><Link href="/signup" className={link}>{say(copy.nav.startPilot, lang)}</Link></li>
              <li><Link href="/login?demo=1" className={link}>{say(copy.nav.tryDemo, lang)}</Link></li>
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border-soft)] pt-6 text-[13px] leading-relaxed text-muted sm:flex-row sm:justify-between sm:gap-10">
          <p className="shrink-0">{say(copy.footer.rights, lang)}</p>
          <p className="max-w-2xl sm:text-right">{t("app.disclaimer", lang)}</p>
        </div>
      </div>
    </footer>
  );
}
