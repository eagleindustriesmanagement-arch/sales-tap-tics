import Link from "next/link";
import type { Language } from "@taptics/i18n";
import { IconAlert, IconCheck, IconChevronLeft, IconMic, IconSparkle } from "@/components/icons";
import { copy, fill, say } from "./copy";
import { HeroShader } from "./hero-shader";
import { libraryFacts } from "./library-facts";
import { Arrow, Eyebrow, MiniRing, glassButton, goldButton } from "./parts";

/** The practice room on a phone, in HTML: the conversation plays in line by line. Decorative. */
function Phone({ lang }: { lang: Language }) {
  const p = copy.phone;
  const Bubble = ({ who, n, children }: { who: "c" | "r"; n: number; children: string }) => (
    <div className={`mkt-seq flex ${who === "r" ? "justify-end" : "justify-start"}`} style={{ ["--n" as string]: n }}>
      <p className={`max-w-[82%] rounded-[1.15rem] px-3.5 py-2.5 text-[13.5px] leading-snug ${who === "r" ? "mkt-bubble-r rounded-br-md" : "mkt-bubble-c rounded-bl-md"}`}>{children}</p>
    </div>
  );
  return (
    <div className="mkt-phone relative mx-auto w-[min(76vw,300px)] lg:w-[318px]">
      <div className="mkt-phone-screen flex h-[min(150vw,590px)] flex-col lg:h-[628px]">
        <div className="flex items-center justify-between px-6 pt-3 text-[12px] font-semibold text-ink">
          <span>9:41</span>
          <span className="mkt-island" />
          <span className="flex gap-1"><span className="h-2.5 w-4 rounded-[3px] border border-[color-mix(in_srgb,#fff_60%,transparent)]" /></span>
        </div>
        <div className="flex items-center gap-2 px-4 pt-4">
          <span className="grid h-8 w-8 place-items-center rounded-full text-muted"><IconChevronLeft size={18} /></span>
          <span className="flex-1 text-center text-[13px] font-semibold text-ink">{say(p.title, lang)}</span>
          <span className="flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,#fff_6%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-ink tabular-nums">
            <span className="mkt-pulse h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />2:14
          </span>
        </div>
        <div className="px-5 pt-3">
          <div className="flex items-center justify-between text-[10.5px] font-semibold tracking-wide text-muted uppercase">
            <span>{say(p.turns, lang)}</span><span className="tabular-nums">5</span>
          </div>
          <div className="mt-1.5 grid grid-cols-8 gap-1">
            {Array.from({ length: 8 }, (_, i) => <span key={i} className={`h-1 rounded-full ${i < 3 ? "bg-[var(--accent-fill)]" : "bg-[color-mix(in_srgb,#fff_10%,transparent)]"}`} />)}
          </div>
        </div>
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(145deg,#4a3d27,#1c1813)] text-[13px] font-bold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_40%,transparent)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="12" cy="8.5" r="4" /><path d="M4 20.5a8 8 0 0 1 16 0Z" /></svg>
          </span>
          <span className="text-[12.5px] font-semibold text-ink">{say(p.customer, lang)}</span>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2.5 overflow-hidden px-4 pt-3 pb-3">
          <Bubble who="c" n={0}>{say(p.c1, lang)}</Bubble>
          <Bubble who="r" n={1}>{say(p.r1, lang)}</Bubble>
          <Bubble who="c" n={2}>{say(p.c2, lang)}</Bubble>
          <div className="mkt-unlock mx-auto flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--accent-soft)] px-3 py-1 text-[11.5px] font-semibold text-[var(--accent)]" style={{ ["--n" as string]: 3 }}>
            <IconSparkle size={13} />{say(p.unlocked, lang)}
          </div>
          <Bubble who="r" n={4}>{say(p.r2, lang)}</Bubble>
          <div className="mkt-seq typing flex w-14 items-center justify-center gap-1 rounded-[1.15rem] rounded-bl-md mkt-bubble-c py-3" style={{ ["--n" as string]: 5 }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" /><span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" /><span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />
          </div>
        </div>
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-full border border-[var(--lg-edge)] bg-[color-mix(in_srgb,#fff_5%,transparent)] py-1.5 pr-1.5 pl-4">
          <span className="mkt-wave flex h-6 items-center gap-[3px]">
            {Array.from({ length: 9 }, (_, i) => <span key={i} style={{ ["--i" as string]: i }} />)}
          </span>
          <span className="flex-1 text-[12.5px] text-muted">{say(p.composer, lang)}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(170deg,#ecd3a4,var(--accent-fill))] text-[var(--accent-fill-foreground)]"><IconMic size={17} /></span>
        </div>
      </div>
    </div>
  );
}

/** The cards around the phone: each wrapper is a parallax layer, the card inside drifts. Decorative. */
function FloatingCards({ lang }: { lang: Language }) {
  const f = copy.float;
  const card = "liquid-glass mkt-float mkt-card rounded-[1.1rem] p-3.5";
  return (
    <>
      <div className="mkt-layer absolute top-0 left-0 z-10 lg:top-[3%] lg:-left-32" data-depth="-0.06" data-lean="10">
        <div className={`${card} mkt-drift w-[12.5rem] lg:w-[15rem]`} style={{ ["--tilt" as string]: "-2deg" }}>
          <p className="text-[10.5px] font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">{say(f.objection, lang)}</p>
          <p className="mt-1.5 font-display text-[19px] leading-tight text-ink">{say(f.objLine, lang)}</p>
          <p className="mt-2 flex items-start gap-1.5 text-[12.5px] leading-snug text-body"><IconCheck size={14} className="mt-0.5 shrink-0 text-[var(--success)]" />{say(f.repLine, lang)}</p>
        </div>
      </div>
      <div className="mkt-layer absolute right-0 bottom-[7.5rem] z-10 lg:top-[13%] lg:bottom-auto lg:-right-2 xl:-right-8" data-depth="0.12" data-lean="18">
        <div className={`${card} mkt-drift-b flex w-[12rem] items-center gap-3 lg:w-[14rem]`} style={{ ["--tilt" as string]: "1.5deg" }}>
          <MiniRing value={0.86} size={56} stroke={5}>
            <span className="font-display text-[22px] leading-none text-ink">86</span>
          </MiniRing>
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold tracking-[0.14em] text-muted uppercase">{say(f.score, lang)}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-[var(--accent)]">{say(f.oneChange, lang)}</p>
            <p className="text-[12.5px] leading-snug text-ink">{say(f.oneChangeLine, lang)}</p>
          </div>
        </div>
      </div>
      <div className="mkt-layer absolute bottom-0 left-0 z-10 lg:bottom-[-3%] lg:-left-16" data-depth="0.2" data-lean="14">
        <div className={`${card} mkt-drift-c w-[14rem] lg:w-[15.5rem]`} style={{ ["--tilt" as string]: "-1deg" }}>
          <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-[var(--danger)] uppercase"><IconAlert size={13} />{say(f.critical, lang)}</p>
          <p className="mt-1.5 text-[13px] leading-snug text-ink line-through decoration-[var(--danger)] decoration-1">{say(f.flagLine, lang)}</p>
          <p className="mt-1.5 text-[12px] leading-snug text-body">{say(f.flagWhy, lang)}</p>
        </div>
      </div>
    </>
  );
}

export function Hero({ lang }: { lang: Language }) {
  const h = copy.hero;
  const lib = libraryFacts();
  const facts = [
    fill(say(h.facts.techniques, lang), { n: lib.techniques }),
    fill(say(h.facts.lessons, lang), { n: lib.lessons }),
    say(h.facts.languages, lang),
    say(h.facts.talk, lang),
  ];
  return (
    <section aria-labelledby="mkt-h1" className="mkt-hero relative overflow-clip pt-28 pb-16 sm:pt-32 lg:flex lg:min-h-[100svh] lg:items-center lg:pt-28 lg:pb-20">
      <div className="mkt-hero-bg mkt-layer" data-depth="0.35" aria-hidden="true">
        <div className="mkt-hero-fallback" />
        <HeroShader />
      </div>
      <div className="mkt-hero-scrim" aria-hidden="true" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="relative z-10 max-w-[40rem]">
          <Eyebrow>{say(h.eyebrow, lang)}</Eyebrow>
          <h1 id="mkt-h1" className={`mt-5 font-display leading-[0.96] tracking-[-0.015em] text-ink ${lang === "es" ? "text-[clamp(2.9rem,11vw,5.75rem)]" : "text-[clamp(3.1rem,11.5vw,6.5rem)]"}`}>
            {say(h.h1a, lang)} <em className="mkt-gold pr-1 italic">{say(h.h1b, lang)}</em>
          </h1>
          <p className="mt-7 max-w-[35rem] text-[17px] leading-[1.6] text-body sm:text-[18px]">{say(h.sub, lang)}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className={goldButton} data-testid="hero-start">{say(copy.nav.startFree, lang)}<Arrow /></Link>
            <Link href="/login?demo=1" className={glassButton} data-testid="hero-demo">{say(copy.nav.tryDemo, lang)}</Link>
          </div>
          <p className="mt-4 text-[14px] text-muted">{say(h.ways, lang)}</p>
          <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2.5 text-[13.5px] text-muted" data-testid="hero-facts">
            {facts.map((fact) => (
              <li key={fact} className="flex items-center gap-2"><span className="h-1 w-1 rotate-45 bg-[var(--accent)]" aria-hidden="true" />{fact}</li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[26rem] pt-24 pb-44 lg:max-w-[30rem] lg:py-0" aria-hidden="true">
          <div className="mkt-glow inset-[10%_-10%]" />
          <div className="mkt-layer relative" data-depth="0.05" data-lean="6">
            <Phone lang={lang} />
          </div>
          <FloatingCards lang={lang} />
        </div>
      </div>
    </section>
  );
}
