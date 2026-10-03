import Link from "next/link";
import type { Language } from "@taptics/i18n";
import "@/app/marketing.css";
import { IconAlert, IconCheck, IconChevronRight } from "@/components/icons";
import { copy, fill, say, type L } from "./copy";
import { Footer } from "./footer";
import { libraryFacts } from "./library-facts";
import { MarketingMotion } from "./motion";
import { Nav } from "./nav";
import { Arrow, Eyebrow, glassButton, goldButton } from "./parts";
import { pricingCopy as p } from "./pricing-copy";

/**
 * The monthly / annual switch: two radios styled as a segmented control. The prices' wording follows the checked
 * radio in CSS (marketing.css, .mkt-pricing:has(...)), so it works before JavaScript and needs none. The radios
 * cover their segments (not sr-only), so they stay clickable for people and for tests.
 */
function BillingSwitch({ lang }: { lang: Language }) {
  const b = p.billing;
  const options = [["monthly", b.monthly], ["annual", b.annual]] as const;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <fieldset className="mkt-bill liquid-glass liquid-glass-flat rounded-full p-1">
        <legend className="sr-only">{say(b.legend, lang)}</legend>
        {options.map(([value, label]) => (
          <label key={value} className="mkt-bill-seg relative inline-flex min-h-11 min-w-[7.5rem] cursor-pointer items-center justify-center rounded-full px-5 text-[15px] font-semibold">
            <input type="radio" name="billing" value={value} defaultChecked={value === "monthly"}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full opacity-0" />
            {say(label, lang)}
          </label>
        ))}
      </fieldset>
      <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-[var(--accent-soft)] px-3.5 text-[13px] font-semibold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] ring-inset" data-testid="annual-save">
        {say(b.save, lang)}
        <span className="font-medium text-muted">· {say(b.placeholderSave, lang)}</span>
      </span>
    </div>
  );
}

type Tier = (typeof p.tiers)[number];

function TierCard({ tier, lang, values }: { tier: Tier; lang: Language; values: Record<string, number> }) {
  const card = (
    <div className={`liquid-glass liquid-glass-panel relative flex h-full flex-col p-6 sm:p-7 ${tier.recommended ? "rounded-[calc(1.75rem-1px)]" : "mkt-card rounded-[1.75rem]"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[36px] leading-none text-ink">{say(tier.name, lang)}</h3>
        {tier.recommended && (
          <span className="liquid-glass liquid-glass-accent inline-flex min-h-8 items-center rounded-full px-3.5 text-[13px] font-semibold" data-testid="recommended">
            {say(p.recommended, lang)}
          </span>
        )}
      </div>
      <p className="mt-3 text-[15.5px] leading-snug text-body">{say(tier.who, lang)}</p>
      <p className="mt-1 text-[14px] font-semibold text-[var(--accent)]">{say(tier.seats, lang)}</p>

      <div className="liquid-glass-inset mt-6 rounded-[1.1rem] px-4 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-display text-[52px] leading-none text-ink tabular-nums">{p.price.amount}</span>
          <span className="inline-flex min-h-7 items-center rounded-full border border-dashed border-[color-mix(in_srgb,var(--accent)_60%,transparent)] px-2.5 text-[12.5px] font-semibold text-[var(--accent)]" data-testid="placeholder-badge">
            {say(p.price.badge, lang)}
          </span>
        </div>
        <p className="mt-2 text-[13.5px] text-muted">
          <span data-bill="monthly">{say(p.price.perSeatMonthly, lang)}</span>
          <span data-bill="annual">{say(p.price.perSeatAnnual, lang)}</span>
        </p>
      </div>

      <Link href={tier.href} className={`${tier.recommended ? goldButton : glassButton} mt-6 w-full`} data-testid={`tier-${tier.key}-cta`}>
        {say(tier.cta, lang)}<Arrow />
      </Link>

      <div className="mt-7 flex-1 border-t border-[var(--border-soft)] pt-6">
        {tier.lead && <p className="text-[14px] font-semibold text-ink">{say(tier.lead, lang)}</p>}
        <ul className={`${tier.lead ? "mt-3" : ""} space-y-3`}>
          {tier.features.map((f: L, i: number) => (
            <li key={i} className="flex items-start gap-3 text-[15px] leading-snug text-body">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]" aria-hidden="true"><IconCheck size={12} strokeWidth={3} /></span>
              {fill(say(f, lang), values)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
  return (
    <li data-reveal className="flex" data-testid={`tier-${tier.key}`}>
      {tier.recommended ? <div className="mkt-pilot w-full rounded-[1.75rem] p-px">{card}</div> : <div className="w-full">{card}</div>}
    </li>
  );
}

/** The public pricing page: three per-seat tiers with placeholder prices, what each includes, and honest FAQs. */
export function Pricing({ lang }: { lang: Language }) {
  const lib = libraryFacts();
  const values = { n: lib.techniques, l: lib.lessons };
  return (
    <div data-mkt className="mkt mkt-pricing" lang={lang}>
      <span className="mkt-grain" aria-hidden="true" />
      <Nav lang={lang} page="pricing" />

      <section aria-labelledby="pricing-h1" className="relative overflow-clip pt-28 pb-10 sm:pt-36">
        <div className="mkt-glow -top-24 left-1/2 h-[30rem] w-[52rem] max-w-[140vw] -translate-x-1/2" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Eyebrow>{say(p.eyebrow, lang)}</Eyebrow>
          <h1 id="pricing-h1" className="mt-5 font-display text-[clamp(2.6rem,10vw,5rem)] leading-[1] tracking-[-0.015em] text-ink">
            {say(p.h1a, lang)} <em className="mkt-gold pr-1 italic">{say(p.h1b, lang)}</em>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-body sm:text-[18px]">{say(p.sub, lang)}</p>
          <div role="note" className="liquid-glass-inset mx-auto mt-8 flex max-w-xl items-start gap-3 rounded-[1.1rem] px-4 py-3.5 text-left" data-testid="placeholder-notice">
            <span className="mt-0.5 text-[var(--accent)]" aria-hidden="true"><IconAlert size={18} /></span>
            <p className="text-[14.5px] leading-snug">
              <strong className="font-semibold text-ink">{say(p.notice.title, lang)}</strong>{" "}
              <span className="text-body">{say(p.notice.body, lang)}</span>
            </p>
          </div>
          <div className="mt-9"><BillingSwitch lang={lang} /></div>
        </div>
      </section>

      <section aria-labelledby="pricing-plans" className="relative pb-16">
        <h2 id="pricing-plans" className="sr-only">{say(p.plansTitle, lang)}</h2>
        <ul className="mx-auto grid max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:items-stretch">
          {p.tiers.map((tier) => <TierCard key={tier.key} tier={tier} lang={lang} values={values} />)}
        </ul>
      </section>

      <section aria-labelledby="pricing-faq" className="mkt-section py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 id="pricing-faq" data-reveal className="mkt-h2 text-center">{say(p.faq.title, lang)}</h2>
          <div className="mt-10 space-y-3" data-testid="faq">
            {p.faq.items.map((item, i) => (
              <details key={i} data-reveal style={{ ["--i" as string]: i }} className="mkt-faq liquid-glass liquid-glass-panel group rounded-[1.25rem]">
                <summary className="flex min-h-[3.75rem] cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[17px] font-semibold text-ink">
                  {say(item.q, lang)}
                  <span className="shrink-0 text-[var(--accent)] transition-transform duration-300 group-open:rotate-90" aria-hidden="true"><IconChevronRight size={20} /></span>
                </summary>
                <p className="px-5 pb-5 text-[15.5px] leading-relaxed text-body">{say(item.a, lang)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="pricing-close" className="mkt-section pb-20 sm:pb-28">
        <div data-reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 id="pricing-close" className="font-display text-[clamp(2rem,6vw,3rem)] leading-[1.05] text-ink">{say(p.closing.h2, lang)}</h2>
          <p className="mt-4 text-[17px] text-body">{say(p.closing.body, lang)}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login?demo=1" className={glassButton}>{say(copy.nav.tryDemo, lang)}</Link>
            <Link href="/signup" className={goldButton}>{say(copy.nav.startFree, lang)}<Arrow /></Link>
          </div>
        </div>
      </section>

      <Footer lang={lang} />
      <MarketingMotion />
    </div>
  );
}
