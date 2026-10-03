import { t, type Language } from "@taptics/i18n";
import { IconCheck, IconClipboard, IconStore, IconUsers } from "@/components/icons";
import { copy, say } from "./copy";
import { Eyebrow, MiniRing } from "./parts";

/** Sample reps for the illustration: initials only, labelled as sample data under the mock. */
const TEAM = [
  { initials: "JR", score: 91, certified: true, hue: 38 },
  { initials: "AM", score: 82, certified: true, hue: 22 },
  { initials: "DL", score: 74, certified: false, hue: 48 },
  { initials: "KS", score: 68, certified: false, hue: 12 },
];

/** The manager's floor mode in HTML: this week's focus, the team, a floor check in progress. Decorative. */
function Dashboard({ lang }: { lang: Language }) {
  const c = copy.managers;
  const parts = [t("floor.saw", lang), t("floor.oneBehavior", lang), t("floor.exactLine", lang), t("floor.checkAgain", lang)];
  return (
    <div className="liquid-glass liquid-glass-panel mkt-card relative rounded-[1.75rem] p-4 sm:p-6" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><IconClipboard size={18} /></span>
          <span className="text-[16px] font-semibold text-ink">{say(c.mockTitle, lang)}</span>
        </div>
        <span className="rounded-full bg-[color-mix(in_srgb,#fff_6%,transparent)] px-3 py-1 text-[12px] font-semibold text-muted">{say(c.week, lang)}</span>
      </div>

      <div className="liquid-glass liquid-glass-panel liquid-glass-accent mt-4 flex items-center justify-between gap-4 rounded-[1.1rem] px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase opacity-80">{say(c.focusLabel, lang)}</p>
          <p className="mt-0.5 font-display text-[22px] leading-tight">{say(c.focus, lang)}</p>
        </div>
        <MiniRing value={0.75} size={50} stroke={5} ink>
          <span className="text-[12px] font-bold tabular-nums">3/4</span>
        </MiniRing>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="px-1 text-[11.5px] font-semibold tracking-[0.12em] text-muted uppercase">{say(c.team, lang)}</p>
          <ul className="mt-2 space-y-2">
            {TEAM.map((rep, i) => (
              <li key={rep.initials} className="liquid-glass-inset flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-[#16120b]" style={{ background: `linear-gradient(145deg, hsl(${rep.hue} 52% 72%), hsl(${rep.hue} 46% 52%))` }}>{rep.initials}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[12px] font-semibold ${rep.certified ? "text-[var(--accent)]" : "text-muted"}`}>{say(rep.certified ? c.certified : c.practicing, lang)}</span>
                    <span className="text-[14px] font-semibold text-ink tabular-nums">{rep.score}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,#fff_8%,transparent)]">
                    <div className="mkt-grow h-full rounded-full bg-[linear-gradient(90deg,#9a7442,#dcc08c)]" style={{ width: `${rep.score}%`, ["--i" as string]: i }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center justify-between px-1">
            <p className="text-[11.5px] font-semibold tracking-[0.12em] text-muted uppercase">{say(c.check, lang)}</p>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ink tabular-nums"><span className="mkt-pulse h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />0:48</span>
          </div>
          <ol className="mt-2 space-y-2">
            {parts.map((part, i) => (
              <li key={part} className="liquid-glass-inset flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${i < 3 ? "bg-[var(--accent-fill)] text-[var(--accent-fill-foreground)]" : "border border-[var(--border)] text-muted"}`}>
                  {i < 3 ? <IconCheck size={13} strokeWidth={3} /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                </span>
                <span className="text-[13.5px] font-medium text-ink">{part}</span>
              </li>
            ))}
          </ol>
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-full bg-[color-mix(in_srgb,#000_30%,transparent)] p-1 text-center text-[12.5px] font-semibold">
            <span className="rounded-full bg-[var(--accent-fill)] py-1.5 text-[var(--accent-fill-foreground)]">{t("floor.observed.yes", lang)}</span>
            <span className="py-1.5 text-muted">{t("floor.observed.partly", lang)}</span>
            <span className="py-1.5 text-muted">{t("floor.observed.no", lang)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURE_ICONS = [IconUsers, IconClipboard, IconStore] as const;

export function Managers({ lang }: { lang: Language }) {
  const c = copy.managers;
  return (
    <section id="managers" aria-labelledby="mkt-managers" className="mkt-section relative py-20 sm:py-28">
      <div className="mkt-glow top-1/3 right-0 h-[28rem] w-[28rem] opacity-70" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div data-reveal>
          <Eyebrow index="04">{say(c.eyebrow, lang)}</Eyebrow>
          <h2 id="mkt-managers" className="mkt-h2 mt-5">{say(c.h2, lang)}</h2>
          <p className="mt-6 text-[17px] leading-relaxed text-body">{say(c.sub, lang)}</p>
          <ul className="mt-8 space-y-4">
            {c.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]!;
              return (
                <li key={i} className="flex items-start gap-3.5 text-[15.5px] leading-relaxed text-ink">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]" aria-hidden="true"><Icon size={17} /></span>
                  {say(f, lang)}
                </li>
              );
            })}
          </ul>
        </div>
        <div data-reveal style={{ ["--i" as string]: 1 }}>
          <Dashboard lang={lang} />
          <p className="mt-3 text-center text-[13px] text-muted">{say(c.sample, lang)}</p>
        </div>
      </div>
    </section>
  );
}
