import Link from "next/link";
import type { Language } from "@taptics/i18n";
import { IconCheck } from "@/components/icons";
import { copy, say } from "./copy";
import { Arrow, Eyebrow, glassButton, goldButton } from "./parts";

export function Pilot({ lang }: { lang: Language }) {
  const c = copy.pilot;
  return (
    <section id="pilot" aria-labelledby="mkt-pilot" className="mkt-section py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div data-reveal className="mkt-pilot relative overflow-hidden rounded-[2rem] p-px">
          <div className="liquid-glass liquid-glass-panel relative rounded-[calc(2rem-1px)] px-5 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="mkt-glow -top-40 left-1/2 h-[26rem] w-[40rem] -translate-x-1/2" aria-hidden="true" />
            <div className="relative grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <Eyebrow index="06">{say(c.eyebrow, lang)}</Eyebrow>
                <h2 id="mkt-pilot" className="mkt-h2 mt-5">{say(c.h2, lang)}</h2>
                <p className="mt-5 text-[18px] leading-relaxed text-body">{say(c.sub, lang)}</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className={goldButton} data-testid="pilot-cta">{say(copy.nav.startPilot, lang)}<Arrow /></Link>
                  <Link href="/login?demo=1" className={glassButton}>{say(copy.nav.tryDemo, lang)}</Link>
                </div>
                <p className="mt-5 text-[14px] text-muted">{say(c.demoNote, lang)}</p>
              </div>
              <ul className="grid gap-3">
                {c.items.map((item, i) => (
                  <li key={i} className="liquid-glass-inset flex items-start gap-3.5 rounded-[1.1rem] px-4 py-4 text-[15.5px] leading-snug text-ink">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[linear-gradient(170deg,#ecd3a4,var(--accent-fill))] text-[var(--accent-fill-foreground)]" aria-hidden="true"><IconCheck size={15} strokeWidth={3} /></span>
                    <span className="pt-0.5">{say(item, lang)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
