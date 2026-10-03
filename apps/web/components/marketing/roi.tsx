import type { Language } from "@taptics/i18n";
import { copy, say } from "./copy";
import { Eyebrow } from "./parts";
import { RoiCalculator } from "./roi-calculator";

/**
 * The return on training, from research (docs/research/selling-sales-training.md, section 1): a randomized field
 * experiment as the headline and the CEB coaching figure as the second. Each prints its attribution next to it,
 * and neither is ever presented as a result of using Sales Taptics.
 */
export function Roi({ lang }: { lang: Language }) {
  const c = copy.roi;
  return (
    <section id="results" aria-labelledby="mkt-results" className="mkt-section relative py-20 sm:py-28">
      <div className="mkt-glow top-10 -left-40 h-[30rem] w-[30rem] opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div data-reveal>
            <Eyebrow index="01">{say(c.eyebrow, lang)}</Eyebrow>
            <figure className="mt-6" data-testid="roi-figure">
              <p className="mkt-figure font-display leading-[0.82] tracking-[-0.03em]" aria-hidden="true">
                <span className="mkt-gold">{say(c.figure, lang)}</span>
              </p>
              <h2 id="mkt-results" className="mkt-h2 mt-4 max-w-[38rem]">{say(c.h2, lang)}</h2>
              <figcaption className="mt-6 max-w-[38rem] border-l-2 border-[var(--gold-line)] pl-4 text-[14.5px] leading-relaxed text-body" data-testid="roi-cite">
                {say(c.cite, lang)}
              </figcaption>
            </figure>
            <p className="mt-4 max-w-[38rem] pl-[1.125rem] text-[13px] leading-relaxed text-muted">{say(c.caveat, lang)}</p>
            <p className="mt-8 max-w-[36rem] text-[17px] leading-relaxed text-ink">{say(c.bridge, lang)}</p>
          </div>

          <div data-reveal style={{ ["--i" as string]: 1 }} className="flex flex-col gap-5">
            <RoiCalculator
              locale="en-US"
              title={say(c.calc.title, lang)}
              label={say(c.calc.label, lang)}
              result={say(c.calc.result, lang)}
              perMonth={say(c.calc.perMonth, lang)}
              perYear={say(c.calc.perYear, lang)}
              note={say(c.calc.note, lang)}
            />
            <figure className="liquid-glass-inset rounded-[1.25rem] px-5 py-5" data-testid="coach-figure">
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-[40px] leading-none text-[var(--accent)]">{say(c.coachFigure, lang)}</span>
                <span className="text-[15.5px] font-semibold text-ink">{say(c.coachHead, lang)}</span>
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-body">{say(c.coachLine, lang)}</p>
              <figcaption className="mt-2 text-[13px] text-muted">{say(c.coachCite, lang)}</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
