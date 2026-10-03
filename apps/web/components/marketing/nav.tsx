import Link from "next/link";
import { t, type Language } from "@taptics/i18n";
import { IconGlobe } from "@/components/icons";
import { copy, say } from "./copy";
import { Brand } from "./parts";

const ANCHORS = [
  ["#how", copy.nav.how],
  ["#library", copy.nav.library],
  ["#scoring", copy.nav.scoring],
  ["#managers", copy.nav.managers],
  ["#pilot", copy.nav.pilot],
] as const;

/** The language, one tap away, posted exactly like the app frame does. */
function LangForm({ lang }: { lang: Language }) {
  const other = lang === "en" ? "es" : "en";
  return (
    <form action="/api/language" method="post">
      <input type="hidden" name="lang" value={other} />
      <button
        className="liquid-glass liquid-glass-flat inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-ink"
        lang={other}
        data-testid="mkt-lang"
      >
        <IconGlobe size={16} />
        <span className="hidden sm:inline">{t("language.switch", lang)}</span>
        <span className="sm:hidden" aria-hidden="true">{other.toUpperCase()}</span>
        <span className="sr-only sm:hidden">{t("language.switch", lang)}</span>
      </button>
    </form>
  );
}

export function Nav({ lang }: { lang: Language }) {
  return (
    <header data-mkt-nav className="mkt-nav pt-safe fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:h-[72px]">
        <Brand label={say(copy.nav.home, lang)} />
        <nav aria-label={say(copy.nav.label, lang)} className="ml-6 hidden items-center lg:flex">
          {ANCHORS.map(([href, label]) => (
            <a key={href} href={href} className="mkt-navlink rounded-full px-3 py-2.5 text-[14px] font-medium text-body hover:text-ink">
              {say(label, lang)}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangForm lang={lang} />
          <Link href="/login" className="hidden min-h-11 items-center rounded-full px-3.5 text-[14px] font-semibold text-ink hover:text-brand sm:inline-flex">
            {say(copy.nav.signIn, lang)}
          </Link>
          <Link href="/signup" className="liquid-glass liquid-glass-accent mkt-cta-gold hidden min-h-11 items-center rounded-full px-5 text-[14px] font-semibold sm:inline-flex">
            {say(copy.nav.startPilot, lang)}
          </Link>
          {/* Phones: one menu with the sections and both ways in. Works without JavaScript. */}
          <details data-mkt-menu className="mkt-menu relative lg:hidden">
            <summary className="liquid-glass liquid-glass-flat grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink" aria-label={say(copy.nav.menu, lang)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
            </summary>
            <div className="liquid-glass absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-[1.25rem] p-2">
              <nav aria-label={say(copy.nav.menu, lang)}>
                <ul>
                  {ANCHORS.map(([href, label]) => (
                    <li key={href}>
                      <a href={href} className="flex min-h-12 items-center rounded-[0.875rem] px-3.5 text-[16px] font-medium text-ink hover:bg-[color-mix(in_srgb,#fff_6%,transparent)]">{say(label, lang)}</a>
                    </li>
                  ))}
                </ul>
                <div className="mkt-hairline my-2" />
                <div className="grid gap-2 p-1">
                  <Link href="/login" className="liquid-glass liquid-glass-flat flex min-h-12 items-center justify-center rounded-full text-[16px] font-semibold text-ink">{say(copy.nav.signIn, lang)}</Link>
                  <Link href="/signup" className="liquid-glass liquid-glass-accent flex min-h-12 items-center justify-center rounded-full text-[16px] font-semibold">{say(copy.nav.startPilot, lang)}</Link>
                </div>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
