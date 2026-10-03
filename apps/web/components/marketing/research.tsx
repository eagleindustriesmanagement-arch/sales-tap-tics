import type { Language } from "@taptics/i18n";
import { IconBook } from "@/components/icons";
import { copy, say } from "./copy";

/** Credibility, right under the hero: where the techniques come from. Names only, no logos. */
export function Research({ lang }: { lang: Language }) {
  const c = copy.research;
  return (
    <section aria-labelledby="mkt-research" className="relative z-10 -mt-4 pb-6 sm:-mt-2">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="mkt-research liquid-glass liquid-glass-panel mkt-card relative overflow-hidden rounded-[1.5rem] px-5 py-6 sm:px-8 sm:py-7">
          <div className="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10">
            <h2 id="mkt-research" className="flex items-center gap-3 text-[13px] font-semibold tracking-[0.16em] text-[var(--accent)] uppercase">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] ring-inset" aria-hidden="true"><IconBook size={18} /></span>
              {say(c.label, lang)}
            </h2>
            <p className="font-display text-[clamp(1.35rem,4.6vw,1.9rem)] leading-[1.2] text-ink" data-testid="research-line">{say(c.line, lang)}</p>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-2 gap-y-2 border-t border-[var(--border-soft)] pt-5">
            {c.bodies.map((b, i) => (
              <li key={i} className="inline-flex min-h-9 items-center rounded-full bg-[color-mix(in_srgb,#fff_5%,transparent)] px-3.5 text-[14px] font-medium text-body ring-1 ring-[var(--border-soft)] ring-inset">
                {say(b, lang)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
