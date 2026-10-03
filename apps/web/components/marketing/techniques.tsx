import type { Language } from "@taptics/i18n";
import { copy, fill, say, type L } from "./copy";
import { libraryFacts } from "./library-facts";
import { Eyebrow } from "./parts";
import { RailToggle } from "./rail-toggle";

function NameList({ names, lang, dup }: { names: L[]; lang: Language; dup?: boolean }) {
  return (
    <ul className="flex shrink-0 gap-3" {...(dup ? { "aria-hidden": true, "data-dup": "" } : {})}>
      {names.map((n, i) => (
        <li key={i} className="liquid-glass liquid-glass-panel mkt-card flex min-h-[3.75rem] shrink-0 items-center gap-3 rounded-full py-2.5 pr-6 pl-4">
          <span className="h-1.5 w-1.5 rotate-45 bg-[var(--accent)]" aria-hidden="true" />
          <span className="font-display text-[20px] leading-tight whitespace-nowrap text-ink">{say(n, lang)}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Deep to learn": the technique library counted at render time, a few by name, the families, a moving rail. */
export function Techniques({ lang }: { lang: Language }) {
  const c = copy.techniques;
  const lib = libraryFacts();
  const max = Math.max(1, ...lib.families.map((f) => f.count));
  return (
    <section id="techniques" aria-labelledby="mkt-techniques" className="mkt-section py-20 sm:py-28" data-rail-root>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <Eyebrow index="03">{say(c.eyebrow, lang)}</Eyebrow>
            <h2 id="mkt-techniques" className="mkt-h2 mt-5" data-testid="technique-count">
              <span className="mkt-gold italic">{say(c.h2a, lang)}</span>{" "}
              {fill(say(c.h2b, lang), { n: lib.techniques, f: lib.families.length || 12 })}
            </h2>
          </div>
          <p className="text-[17px] leading-relaxed text-body">{say(c.sub, lang)}</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          {lib.featured.length > 0 && (
            <div data-reveal>
              <h3 className="px-1 text-[13px] font-semibold tracking-[0.14em] text-muted uppercase">{say(c.featuredLabel, lang)}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {lib.featured.map((t, i) => (
                  <li key={t.code} className="liquid-glass liquid-glass-panel mkt-card relative rounded-[1.25rem] p-5">
                    <p className="flex items-center justify-between gap-3 text-[12.5px] font-semibold text-[var(--accent)]">
                      <span>{say(c.families[t.family] ?? { en: t.family, es: t.family }, lang)}</span>
                      <span className="font-display text-[22px] leading-none text-[color-mix(in_srgb,var(--accent)_60%,var(--background))]" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    </p>
                    <h4 className="mt-3 font-display text-[27px] leading-[1.05] text-ink">{say(t.name, lang)}</h4>
                    <p className="mt-2 text-[14.5px] leading-snug text-body"><span className="font-semibold text-muted">{say(c.when, lang)}:</span> {say(t.when, lang)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div data-reveal style={{ ["--i" as string]: 1 }} className="liquid-glass liquid-glass-panel mkt-card relative self-start rounded-[1.5rem] p-5 sm:p-7">
            <h3 className="text-[17px] font-semibold text-ink">{say(c.familiesLabel, lang)}</h3>
            <ul className="mt-4 space-y-2.5">
              {lib.families.map((f, i) => (
                <li key={f.family} className="grid grid-cols-[minmax(0,1fr)_2.25rem] items-center gap-x-3 gap-y-1.5">
                  <span className="truncate text-[14.5px] text-body">{say(c.families[f.family] ?? { en: f.family, es: f.family }, lang)}</span>
                  <span className="text-right text-[14.5px] font-semibold text-ink tabular-nums">{f.count}</span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,#fff_7%,transparent)]" aria-hidden="true">
                    <span className="mkt-grow block h-full rounded-full bg-[linear-gradient(90deg,#9a7442,#dcc08c)]" style={{ width: `${(f.count / max) * 100}%`, ["--i" as string]: i }} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-3 border-t border-[var(--border-soft)] pt-5 text-[14.5px] leading-relaxed">
              {lib.researchBacked > 0 && <p className="text-body">{fill(say(c.evidence, lang), { n: lib.researchBacked })}</p>}
              <p className="text-ink">{fill(say(c.lessons, lang), { n: lib.lessons })}</p>
            </div>
          </div>
        </div>
      </div>

      {lib.rail[0].length > 0 && (
        <>
          <div data-reveal className="mt-12 space-y-3" style={{ ["--i" as string]: 2 }} role="region" aria-label={say(c.railLabel, lang)}>
            {[{ names: lib.rail[0], dir: "left", dur: "90s" }, { names: lib.rail[1], dir: "right", dur: "105s" }].map((row, i) => (
              <div key={i} className="mkt-rail overflow-hidden py-2">
                <div className="mkt-track px-4 sm:px-6" data-dir={row.dir} style={{ ["--dur" as string]: row.dur }}>
                  <NameList names={row.names} lang={lang} />
                  <NameList names={row.names} lang={lang} dup />
                </div>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-6 flex max-w-7xl justify-end px-4 sm:px-6">
            <RailToggle pause={say(c.pause, lang)} play={say(c.play, lang)} />
          </div>
        </>
      )}
    </section>
  );
}
