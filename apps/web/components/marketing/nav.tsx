import Link from "next/link";
import { t, type Language } from "@taptics/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { copy, say } from "./copy";
import { Brand } from "./parts";

/** The home page's sections; other public pages link to them on the home page. */
const ANCHORS = [
  ["#how", copy.nav.how],
  ["#techniques", copy.nav.techniques],
  ["#results", copy.nav.results],
  ["#managers", copy.nav.managers],
] as const;

/** `page` says where the nav sits: on the home page the sections are anchors, elsewhere they lead back home. */
export function Nav({ lang, page = "home" }: { lang: Language; page?: "home" | "pricing" }) {
  const base = page === "home" ? "" : "/";
  const links = ANCHORS.map(([hash, label]) => ({ href: `${base}${hash}`, label: say(label, lang), current: false }));
  links.push({ href: "/pricing", label: say(copy.nav.pricing, lang), current: page === "pricing" });
  return (
    <header data-mkt-nav className="mkt-nav pt-safe fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:h-[72px]">
        <Brand label={say(copy.nav.home, lang)} />
        <nav aria-label={say(copy.nav.label, lang)} className="ml-6 hidden items-center lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.current ? "page" : undefined}
              className={`mkt-navlink rounded-full px-3 py-2.5 text-[14px] font-medium hover:text-ink ${l.current ? "text-[var(--accent)]" : "text-body"}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageToggle lang={lang} testId="mkt-lang" />
          <Link href="/login" className="hidden min-h-11 items-center rounded-full px-3.5 text-[14px] font-semibold text-ink hover:text-brand sm:inline-flex">
            {say(copy.nav.signIn, lang)}
          </Link>
          <Link href="/signup" className="liquid-glass liquid-glass-accent mkt-cta-gold hidden min-h-11 items-center rounded-full px-5 text-[14px] font-semibold sm:inline-flex">
            {say(copy.nav.startFree, lang)}
          </Link>
          {/* Phones: one menu with the sections and both ways in. Works without JavaScript. */}
          <details data-mkt-menu className="mkt-menu relative lg:hidden">
            <summary className="liquid-glass liquid-glass-flat grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink" aria-label={say(copy.nav.menu, lang)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
            </summary>
            <div className="liquid-glass absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-[1.25rem] p-2">
              <nav aria-label={say(copy.nav.menu, lang)}>
                <ul>
                  {links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} aria-current={l.current ? "page" : undefined}
                        className={`flex min-h-12 items-center rounded-[0.875rem] px-3.5 text-[16px] font-medium hover:bg-[color-mix(in_srgb,#fff_6%,transparent)] ${l.current ? "text-[var(--accent)]" : "text-ink"}`}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mkt-hairline my-2" />
                <div className="grid gap-2 p-1">
                  <Link href="/login" className="liquid-glass liquid-glass-flat flex min-h-12 items-center justify-center rounded-full text-[16px] font-semibold text-ink">{say(copy.nav.signIn, lang)}</Link>
                  <Link href="/signup" className="liquid-glass liquid-glass-accent flex min-h-12 items-center justify-center rounded-full text-[16px] font-semibold">{say(copy.nav.startFree, lang)}</Link>
                </div>
              </nav>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
