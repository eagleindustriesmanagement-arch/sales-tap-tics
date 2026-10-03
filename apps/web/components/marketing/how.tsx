import type { Language } from "@taptics/i18n";
import { IconBook, IconMic, IconTrophy, IconUsers } from "@/components/icons";
import { copy, say } from "./copy";
import { Eyebrow } from "./parts";

const ICONS = [IconUsers, IconBook, IconMic, IconTrophy] as const;

export function How({ lang }: { lang: Language }) {
  const c = copy.how;
  return (
    <section id="how" aria-labelledby="mkt-how" className="mkt-section py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="max-w-3xl">
          <Eyebrow index="02">{say(c.eyebrow, lang)}</Eyebrow>
          <h2 id="mkt-how" className="mkt-h2 mt-5"><span className="mkt-gold italic">{say(c.h2a, lang)}</span> {say(c.h2b, lang)}</h2>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-body">{say(c.sub, lang)}</p>
        </div>
        <div className="relative mt-14">
          {/* The line that joins the steps on wide screens. */}
          <span aria-hidden="true" className="mkt-hairline absolute top-[3.25rem] right-[12%] left-[12%] hidden lg:block" />
          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {c.steps.map((step, i) => {
              const Icon = ICONS[i % ICONS.length]!;
              return (
                <li key={i} data-reveal style={{ ["--i" as string]: i }}
                  className="liquid-glass liquid-glass-panel mkt-card group relative rounded-[1.5rem] p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(150deg,#3a301f,#17140f)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] transition-transform duration-300 group-hover:-translate-y-0.5">
                      <Icon size={26} />
                    </span>
                    <span className="font-display text-[44px] leading-none text-[color-mix(in_srgb,var(--accent)_75%,var(--background))]" aria-hidden="true">{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-[19px] font-semibold tracking-tight text-ink">{say(step.title, lang)}</h3>
                  <p className="mt-2.5 text-[15.5px] leading-relaxed text-body">{say(step.body, lang)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
