import type { Language } from "@taptics/i18n";
import { copy, say } from "./copy";
import { Eyebrow } from "./parts";

const WORDS = ["usted", "el down", "el trade-in", "el dealer", "el up"];

export function Bilingual({ lang }: { lang: Language }) {
  const c = copy.bilingual;
  const Line = ({ who, es, en, rep }: { who: string; es: string; en: string; rep?: boolean }) => (
    <div className={`flex ${rep ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[92%] sm:max-w-[85%] ${rep ? "text-right" : ""}`}>
        <p className={`text-[11.5px] font-semibold tracking-[0.12em] uppercase ${rep ? "text-[var(--accent)]" : "text-muted"}`}>
          {who} · {say(c.spanish, lang)}
        </p>
        <p lang="es" className={`mt-2 rounded-[1.2rem] px-4 py-3 text-left text-[17px] leading-snug sm:text-[18px] ${rep ? "mkt-bubble-r rounded-br-md" : "mkt-bubble-c rounded-bl-md"}`}>{es}</p>
        <p lang="en" className="mt-2 px-1 text-[14px] leading-snug text-muted">
          <span className="sr-only">{say(c.inEnglish, lang)}: </span>{en}
        </p>
      </div>
    </div>
  );
  return (
    <section aria-labelledby="mkt-bilingual" className="mkt-section relative overflow-clip py-20 sm:py-28">
      <span aria-hidden="true" className="pointer-events-none absolute top-4 right-[-2%] hidden lg:block font-display text-[clamp(6rem,18vw,15rem)] leading-none whitespace-nowrap text-[color-mix(in_srgb,var(--accent)_6%,transparent)] italic select-none">
        ¿y el down?
      </span>
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div data-reveal>
          <Eyebrow index="07">{say(c.eyebrow, lang)}</Eyebrow>
          <h2 id="mkt-bilingual" className="mkt-h2 mt-5">{say(c.h2, lang)}</h2>
          <p className="mt-6 text-[17px] leading-relaxed text-body">{say(c.body, lang)}</p>
          <ul className="mt-8 flex flex-wrap gap-2.5" aria-label={say(c.words, lang)}>
            {WORDS.map((w) => (
              <li key={w} lang="es" className="rounded-full border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[var(--accent-soft)] px-4 py-2 font-display text-[18px] text-[var(--accent)] italic">{w}</li>
            ))}
          </ul>
        </div>
        <div data-reveal style={{ ["--i" as string]: 1 }} className="liquid-glass liquid-glass-panel mkt-card space-y-6 rounded-[1.75rem] p-5 sm:p-8">
          <Line who={say(c.customer, lang)} es={c.c} en={c.cGloss} />
          <Line who={say(c.rep, lang)} es={c.r} en={c.rGloss} rep />
        </div>
      </div>
    </section>
  );
}
