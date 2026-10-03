import type { Language } from "@taptics/i18n";
import { IconAlert, IconShield, IconX } from "@/components/icons";
import { copy, say } from "./copy";
import { Eyebrow } from "./parts";

/** A rep line the engine stopped: real content (not decorative), so a screen reader hears the example too. */
function FlaggedLine({ lang }: { lang: Language }) {
  const c = copy.scoring;
  const line = say(c.flagLine, lang);
  const hit = say(c.flagHit, lang);
  const at = line.indexOf(hit);
  return (
    <figure className="liquid-glass liquid-glass-panel mkt-card relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6" data-testid="flagged-line">
      <span className="mkt-scan" aria-hidden="true" />
      <figcaption className="flex items-center justify-between gap-3 text-[12px] font-semibold tracking-[0.12em] uppercase">
        <span className="text-[var(--accent)]">{say(c.flagged, lang)}</span>
        <span className="text-muted">{say(c.flagMeta, lang)}</span>
      </figcaption>
      <blockquote className="mt-4 font-display text-[clamp(1.6rem,5.6vw,2.15rem)] leading-[1.15] text-ink">
        “{at >= 0 ? <>{line.slice(0, at)}<mark className="mkt-hit">{hit}</mark>{line.slice(at + hit.length)}</> : line}”
      </blockquote>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[var(--danger-soft)] px-3 text-[13px] font-semibold text-[var(--danger)]">
          <IconAlert size={15} />{say(c.flagRule, lang)}
        </span>
        <span className="inline-flex min-h-8 items-center rounded-full border border-[color-mix(in_srgb,var(--danger)_45%,transparent)] px-3 text-[13px] font-semibold text-[var(--danger)]">
          {say(c.flagSeverity, lang)}
        </span>
      </div>
      <div className="liquid-glass-inset mt-4 rounded-[0.9rem] px-4 py-3">
        <p className="text-[11.5px] font-semibold tracking-[0.12em] text-muted uppercase">{say(c.flagFactLabel, lang)}</p>
        <p className="mt-1 text-[15px] text-ink">{say(c.flagFact, lang)}</p>
      </div>
      <p className="mt-4 flex items-center gap-2 text-[14px] font-semibold text-ink">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--danger)] text-[var(--surface)]" aria-hidden="true"><span className="h-2 w-2 rounded-[2px] bg-current" /></span>
        {say(c.flagStopped, lang)}
      </p>
    </figure>
  );
}

export function Scoring({ lang }: { lang: Language }) {
  const c = copy.scoring;
  return (
    <section id="scoring" aria-labelledby="mkt-scoring" className="mkt-section py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="max-w-4xl">
          <Eyebrow index="05">{say(c.eyebrow, lang)}</Eyebrow>
          <h2 id="mkt-scoring" className="mkt-h2 mt-5">
            {say(c.h2a, lang)} <span className="mkt-gold italic">{say(c.h2b, lang)}</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <div data-reveal className="liquid-glass liquid-glass-panel mkt-card rounded-[1.75rem] p-6 sm:p-8">
            <h3 className="text-[22px] font-semibold tracking-tight text-ink">{say(c.scoredTitle, lang)}</h3>
            <ol className="mt-4">
              {c.scored.map((item, i) => (
                <li key={i} className={`flex gap-4 py-5 ${i ? "border-t border-[var(--border-soft)]" : ""}`}>
                  <span className="w-10 shrink-0 font-display text-[30px] leading-none text-[var(--accent)] tabular-nums" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h4 className="text-[17px] font-semibold text-ink">{say(item.title, lang)}</h4>
                    <p className="mt-1.5 text-[15.5px] leading-relaxed text-body">{say(item.body, lang)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div data-reveal style={{ ["--i" as string]: 1 }} className="flex flex-col gap-6">
            <div className="px-1">
              <h3 className="flex items-center gap-2.5 text-[22px] font-semibold tracking-tight text-ink">
                <IconShield size={24} className="text-[var(--accent)]" />{say(c.engineTitle, lang)}
              </h3>
              <p className="mt-3 text-[16.5px] leading-relaxed text-body">{say(c.engineBody, lang)}</p>
              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {c.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]" aria-hidden="true"><IconX size={12} strokeWidth={3} /></span>
                    {say(rule, lang)}
                  </li>
                ))}
              </ul>
            </div>
            <FlaggedLine lang={lang} />
            <p className="px-1 text-[15px] leading-relaxed text-muted">{say(c.stop, lang)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
