import Link from "next/link";
import type { Language } from "@taptics/i18n";
import { IconUsers } from "@/components/icons";
import { copy, say } from "./copy";
import { Arrow, Eyebrow, glassButton, goldButton } from "./parts";

function IconPerson({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

/** The close of the page: the two ways in, side by side, and the demo for anyone not ready. */
export function Start({ lang }: { lang: Language }) {
  const c = copy.start;
  const ways = [
    { key: "team", w: c.team, href: "/signup", Icon: IconUsers, gold: true },
    { key: "solo", w: c.solo, href: "/signup?for=me", Icon: IconPerson, gold: false },
  ] as const;
  return (
    <section id="start" aria-labelledby="mkt-start" className="mkt-section py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div data-reveal className="mkt-pilot relative overflow-hidden rounded-[2rem] p-px">
          <div className="liquid-glass liquid-glass-panel relative rounded-[calc(2rem-1px)] px-4 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="mkt-glow -top-40 left-1/2 h-[26rem] w-[40rem] -translate-x-1/2" aria-hidden="true" />
            <div className="relative text-center">
              <Eyebrow index="08">{say(c.eyebrow, lang)}</Eyebrow>
              <h2 id="mkt-start" className="mkt-h2 mx-auto mt-5 max-w-3xl">{say(c.h2, lang)}</h2>
              <p className="mt-5 text-[18px] leading-relaxed text-body">{say(c.sub, lang)}</p>
            </div>
            <ul className="relative mt-10 grid gap-4 md:grid-cols-2">
              {ways.map(({ key, w, href, Icon, gold }) => (
                <li key={key} className="liquid-glass-inset flex flex-col rounded-[1.4rem] p-5 sm:p-7">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${gold ? "bg-[linear-gradient(170deg,#ecd3a4,var(--accent-fill))] text-[var(--accent-fill-foreground)]" : "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] ring-inset"}`} aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 font-display text-[30px] leading-none text-ink">{say(w.title, lang)}</h3>
                  <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-body">{say(w.body, lang)}</p>
                  <Link href={href} className={`${gold ? goldButton : glassButton} mt-6 w-full`} data-testid={`start-${key}`}>
                    {say(w.cta, lang)}<Arrow />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="relative mt-8 flex flex-col items-center gap-2 text-center text-[15px] text-muted sm:flex-row sm:justify-center sm:gap-6">
              <p>
                {say(c.demoNote, lang)}{" "}
                <Link href="/login?demo=1" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">{say(copy.nav.tryDemo, lang)}</Link>
              </p>
              <Link href="/pricing" className="inline-flex min-h-11 items-center font-semibold text-[var(--accent)] underline-offset-4 hover:underline">{say(c.seePricing, lang)}</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
