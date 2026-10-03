import { platformLibrary, type Scenario } from "@taptics/content";
import type { Language } from "@taptics/i18n";
import { copy, say } from "./copy";
import { Eyebrow } from "./parts";
import { RailToggle } from "./rail-toggle";

/** Real customers from the content library, in two rows: the floor classics first, then phone, money and electric. */
const ROW_A = [
  "S-partner-check-L1", "S-grinder-L3", "S-browser-L1", "S-credit-union-rate-L1", "S-thinker-L1",
  "S-trade-defender-L2", "S-deadline-tester-L2", "S-cross-shopper-L3", "S-payment-buyer-L2", "S-down-the-road-L1",
];
const ROW_B = [
  "S-phone-shopper-L2", "S-no-money-down-L1", "S-underwater-owner-L2", "S-bad-credit-L1", "S-email-me-L2",
  "S-range-worry-L1", "S-itin-buyer-L1", "S-son-translates-L1", "S-three-day-cancel-L1", "S-walker-L3",
];

interface Chip { title: string; level: number; phone: boolean }

/** Picks the listed scenarios that exist; tops a short row up from the rest of the library so it never thins out. */
function rows(lang: Language): { a: Chip[]; b: Chip[]; objections: number } {
  let scenarios: Map<string, Scenario> = new Map();
  let objections = 65;
  try {
    const lib = platformLibrary();
    scenarios = lib.scenarios;
    objections = lib.objections.size || objections;
  } catch {
    // The page still renders without the library; the rail is then empty and the heading keeps the known count.
  }
  const used = new Set<string>();
  // Titles are quoted objections, some with a "(phone)" note the chip shows as a badge instead.
  const quoted = (s: Scenario) => s.title.en.startsWith('"');
  const clean = (title: string) => title.replace(/\s*\((phone|por teléfono)\)$/, "").replace(/^"|"$/g, "");
  const chip = (s: Scenario): Chip => ({ title: clean(s.title[lang]), level: s.difficulty, phone: s.channel === "phone" });
  const pick = (codes: string[]) => {
    const out: Chip[] = [];
    for (const code of codes) {
      const s = scenarios.get(code);
      if (s && quoted(s) && !used.has(code)) { used.add(code); out.push(chip(s)); }
    }
    for (const [code, s] of scenarios) {
      if (out.length >= codes.length) break;
      if (!used.has(code) && quoted(s)) { used.add(code); out.push(chip(s)); }
    }
    return out;
  };
  return { a: pick(ROW_A), b: pick(ROW_B), objections };
}

function ChipList({ chips, lang, dup }: { chips: Chip[]; lang: Language; dup?: boolean }) {
  return (
    <ul className="flex shrink-0 gap-3" {...(dup ? { "aria-hidden": true, "data-dup": "" } : {})}>
      {chips.map((c, i) => (
        <li key={i} className="liquid-glass liquid-glass-panel mkt-card flex min-h-[4.25rem] shrink-0 items-center gap-3 rounded-[1.1rem] py-3 pr-5 pl-3">
          <span className="grid h-10 min-w-10 place-items-center rounded-[0.7rem] bg-[var(--accent-soft)] px-1.5 text-[12px] font-bold text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]">
            <span className="sr-only">{say(copy.library.level, lang)} </span>L{c.level}
          </span>
          <span className="font-display text-[19px] leading-tight whitespace-nowrap text-ink">“{c.title}”</span>
          {c.phone && <span className="rounded-full bg-[color-mix(in_srgb,#fff_7%,transparent)] px-2 py-0.5 text-[11.5px] font-semibold text-muted">{say(copy.library.phone, lang)}</span>}
        </li>
      ))}
    </ul>
  );
}

export function LibraryRail({ lang }: { lang: Language }) {
  const c = copy.library;
  const { a, b, objections } = rows(lang);
  return (
    <section id="library" aria-labelledby="mkt-library" className="mkt-section py-20 sm:py-28" data-rail-root>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <Eyebrow index="02">{say(c.eyebrow, lang)}</Eyebrow>
            <h2 id="mkt-library" className="mkt-h2 mt-5">{say(c.h2, lang).replace("{n}", String(objections))}</h2>
          </div>
          <p className="text-[17px] leading-relaxed text-body">{say(c.sub, lang)}</p>
        </div>
      </div>
      <div data-reveal className="mt-14 space-y-3" style={{ ["--i" as string]: 1 }}>
        {[{ chips: a, dir: "left", dur: "80s" }, { chips: b, dir: "right", dur: "95s" }].map((row, i) => (
          <div key={i} className="mkt-rail overflow-hidden py-2">
            <div className="mkt-track px-4 sm:px-6" data-dir={row.dir} style={{ ["--dur" as string]: row.dur }}>
              <ChipList chips={row.chips} lang={lang} />
              <ChipList chips={row.chips} lang={lang} dup />
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <p className="text-[14px] text-muted">{say(c.note, lang)}</p>
        <RailToggle pause={say(c.pause, lang)} play={say(c.play, lang)} />
      </div>
    </section>
  );
}
