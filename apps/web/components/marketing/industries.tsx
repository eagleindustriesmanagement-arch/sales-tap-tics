import type { Language } from "@taptics/i18n";
import type { ReactNode } from "react";
import { IconCheck, IconClock } from "@/components/icons";
import { copy, fill, say } from "./copy";
import { libraryFacts } from "./library-facts";
import { Eyebrow } from "./parts";

/** Line drawings for each industry, on the icon grid (24px, 2px stroke). Decorative. */
const GLYPHS: Record<string, ReactNode> = {
  cars: <><path d="M3 15.5V12l2.2-4.6A2 2 0 0 1 7 6.3h10a2 2 0 0 1 1.8 1.1L21 12v3.5a1 1 0 0 1-1 1h-1" /><path d="M5 16.5H4a1 1 0 0 1-1-1" /><path d="M3.5 12h17" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /><path d="M9.3 16.5h5.4" /></>,
  homes: <><path d="M3 11 12 4l9 7" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></>,
  solar: <><path d="M4 18 6.5 9h11L20 18Z" /><path d="M5.3 13.5h13.4M10 9l-.8 9M14 9l.8 9" /><path d="M12 2.5v2M7 4.2l1 1.4M17 4.2l-1 1.4" /></>,
  furniture: <><path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11" /><path d="M3 13a2 2 0 0 1 4 0v1.5h10V13a2 2 0 0 1 4 0v4.5H3Z" /><path d="M5 17.5V20M19 17.5V20" /></>,
};

/** All high-ticket sales, said honestly: the techniques travel; an industry reads "Customers live" only once the library has its role-play customers. */
export function Industries({ lang }: { lang: Language }) {
  const c = copy.industries;
  const lib = libraryFacts();
  const count = (key: string) => lib.customers[key] ?? 0;
  const allLive = c.items.every((item) => count(item.key) > 0);
  return (
    <section id="industries" aria-labelledby="mkt-industries" className="mkt-section relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end lg:gap-16">
          <div>
            <Eyebrow index="04">{say(c.eyebrow, lang)}</Eyebrow>
            <h2 id="mkt-industries" className="mkt-h2 mt-5">{say(c.h2, lang)}</h2>
          </div>
          <p className="text-[17px] leading-relaxed text-body">{say(allLive ? c.subAll : c.sub, lang)}</p>
        </div>
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="industries">
          {c.items.map((it) => ({ ...it, live: count(it.key) > 0 })).map((item, i) => (
            <li key={item.key} data-reveal style={{ ["--i" as string]: i }}
              className={`liquid-glass liquid-glass-panel mkt-card relative flex flex-col rounded-[1.5rem] p-6`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl ring-1 ring-inset ${item.live ? "bg-[linear-gradient(170deg,#ecd3a4,var(--accent-fill))] text-[var(--accent-fill-foreground)] ring-[color-mix(in_srgb,#fff_30%,transparent)]" : "bg-[color-mix(in_srgb,#fff_5%,transparent)] text-[var(--accent)] ring-[var(--border-soft)]"}`} aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" focusable="false">{GLYPHS[item.key]}</svg>
                </span>
                <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold ${item.live ? "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)] ring-inset" : "bg-[color-mix(in_srgb,#fff_5%,transparent)] text-muted"}`}>
                  {item.live ? <IconCheck size={13} strokeWidth={3} /> : <IconClock size={13} />}
                  {say(item.live ? c.live : c.next, lang)}
                </span>
              </div>
              <h3 className="mt-6 font-display text-[32px] leading-none text-ink">{say(item.name, lang)}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-body">{fill(say(item.live ? item.liveBody : item.body, lang), { n: count(item.key) })}</p>
            </li>
          ))}
        </ul>
        <p data-reveal className="mt-8 text-center text-[16px] text-muted">{say(c.more, lang)}</p>
      </div>
    </section>
  );
}
