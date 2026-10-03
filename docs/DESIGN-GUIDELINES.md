# Sales Taptics design guidelines

Every UI change follows this file. The material is Liquid Glass, ported from BookFlows
(`docs/LIQUID-GLASS.md` is that file, unchanged; it is written to be portable). This file is the
Sales Taptics policy on top of it. Spec 18.4 rule 7 still governs: calm, high contrast, large
touch targets for a showroom floor.

## 1. Who this is for

A car sales rep, on a phone, between customers. Every screen passes the **Showroom Test**:
readable under showroom lights and outside on the lot, tappable with a thumb, understood in
3 seconds. Managers use the same phone on the floor; the general manager also uses a laptop.

## 2. A learning app, not a website

The flow follows what works in learning apps (Duolingo's path redesign, the daily-goal and streak
loop, results screens):

1. **One next step.** Today's biggest element is "Up next" with one Start button. Assignments win
   over the plan; the reason is one line.
2. **A visible path.** Practice is a connected path by level: passed (green check), certified
   (gold trophy), up next (accent, breathing), tried, new. Each level shows its progress bar.
3. **A short loop.** Daily goal ring and streak at the top of Today; the session; a results
   screen with the score ring and the one change that matters most right under it (spec 18.4
   rule 2); Try again or Back to Today.
4. **Progress is a place.** Its own tab: the certification ring (the long goal), skills by week
   as small columns, weakest skills, mastery, behavior cards.
5. **Practice is immersive.** No tab bar inside a session; one way out at the top left.

## 3. One theme: the showroom at night (decision 0028)

There is one theme, dark. No light mode, no theme switch; `color-scheme: dark` everywhere. The look is a
luxury showroom after hours: charcoal surfaces, warm ivory type, champagne gold as the only accent.

- **Palette** (tokens in `app/globals.css`, never hex in a component):
  - Ground `--background` #0a0a0b, surfaces `--surface` #151517 and `--surface-2` #1e1d20, lines `--border`
    and `--border-soft` in warm grey.
  - Ink `--ink` #f6f1e7 (titles, numbers), `--foreground` (body), `--muted` and `--faint` (labels, captions).
    All of them clear 4.5:1 on every surface they sit on; check before adding a pairing.
  - Gold: `--accent` #dcc08c for text, links, icons and the active tab; `--accent-fill` #d6b47a with
    `--gold-hi`/`--gold-lo` for fills (primary buttons, the rep's bubble, chart values), always with the dark
    ink `--accent-fill-foreground` on top; `--accent-soft` for tinted chips and pills; `--gold-line` for
    hairlines and rims. Bronze (`--brand-cyan`) is ambient light only, never text.
  - Spark amber is for streaks, stars and certification only, never text.
  - State colours (`--success`, `--warning`, `--danger`) say good or bad and nothing else. Charts, rings and
    bars are gold; they turn green or red only when the value is a verdict (pass/fail, weakest skills).
  - Avatars stay in a warm metallic range (copper to olive gold); the hue still follows the name.
- **Material** vocabulary: `.liquid-glass` (+ `-accent` gold metal, `-ink`, `-success`, `-danger`), `-panel`
  for cards, `-hero` for the one loud card on a screen (Today's next step, the debrief's one change: dark glass
  lit gold from one corner and bronze from the other, gold rim), `-inset` for something sunk into a card,
  `-field` for inputs, `-ring` for a selected edge, `-flat` for a control on a flat panel (no blur), `-solid` for
  a neutral control on a tinted card, `.bezel` for a surface that keeps its own fill, `.glass-chrome` for bars.
  Glass edges and rims are warm (champagne), not white.
- Gold details: `.gold-rule` (the hairline under a page title), `.fill-gold` / `.fill-gold-x` / `.fill-gold-dim`
  (data fills), the `#tt-gold` gradient every ring draws with (defined once in `AppChrome`). Tinted chips and
  icon tiles get a 1px inset ring in their own colour (`ring-1 ring-current/15 ring-inset`).
- Never a `bg-*` or `border-*` utility on an element with a material (LIQUID-GLASS §5.2); a `ring-*` utility on
  a `.bezel` is overridden by its shadow, so do not rely on one.
- Budget: at most four blurred layers on screen. The chrome blurs; controls on panels use `-flat`.
- Radii: 28px hero, 24px glass, 20px cards, 14px fields and controls, pills fully round.

## 4. Building blocks

`components/ui.tsx`: `Card`, `Inset`, `PageHeader` (serif title, optional back link and subtitle, gold rule),
`SectionTitle`, `Chip`, `Grade`, `Ring`, `Bar`, `Avatar`, `ListRow`, `RowGroup`, `Stat`, `Empty`, `ScoreBadge`,
and the classes `titleClass`, `backLinkClass`, `buttonClass`, `ghostButtonClass`, `smallButtonClass`,
`fieldClass`. `components/icons.tsx` is the one icon family (24px grid, 2px stroke). Use these before writing
new markup; every page h1 is `PageHeader` or `titleClass`.

## 5. Type and text

- Two families. **Instrument Serif** (`font-display`, weight 400 only) for page titles (40px, 48px on
  desktop), section titles (25px), hero headlines, people's names as headings, and the big numbers (score,
  stats, certification count). **Inter** (`font-sans`, the default) for everything else: body 15-17px, labels
  13-14px, buttons 15-17px semibold, card headings 17px bold.
- Never bold the serif and never set body copy in it. Small numbers inside running text stay in Inter.
- Numbers use tabular figures and are the loudest thing in a tile.
- Sentence case. No ALL-CAPS labels, no eyebrow labels, no "->", "←" or "›" text arrows (use the chevron icons).
- Empty states name the next action.

## 6. Phone and app-store manners

- `viewport-fit=cover`; the chrome insets for the notch and home indicator through `--safe-top`
  and `--safe-bottom` (variables, so tests can set them).
- Bottom tab bar: four tabs at most, icons and labels, floating glass, one gold pill that glides to the active
  tab. Primary actions in the bottom 40% of the screen. Touch targets at least 44px, primary buttons 52px.
- Fields are 16px or larger so iOS never zooms. No horizontal scroll at 390px: grids of fields collapse to
  two columns or one on a phone.
- The language is one tap away on every screen, including sign-in.
- `prefers-reduced-transparency` is honoured (solid surfaces).

### Motion

- One curve: `cubic-bezier(0.32, 0.72, 0, 1)`. Motion answers an action or marks the one loud moment; it never
  delays reading. Every entrance is over in under 0.9s (the accessibility audit measures colours 0.95s after a
  screen settles).
- **Routes** (`app/template.tsx`): each screen's content fades in and rises 8px in 280ms; immersive screens
  (practice room, consent, public pages) only fade, because a transform would trap their fixed bars. Keyframes
  use `backwards` fill only, so nothing stays transformed or invisible afterwards.
- **The debrief reveal**: the score card rises, the ring draws while the number counts up (0.76s), the verdict
  lands (0.42s), compliance issues slide in (0.3s), the cards below cascade 50ms apart; opening "Every behavior
  scored" cascades its items. Server-rendered, the number is already final.
- **Small things**: cards that are links lift 2px with a gold glow on hover; rows tint gold on hover; rings and
  bars draw in once; chart columns rise from the baseline; the next node on the path breathes.
- `prefers-reduced-motion`: every entrance is switched off (final state at once), the tab pill jumps, nothing
  loops.

## 7. Definition of done for any UI change

1. Screenshots at 390px and one desktop width (1440) reviewed, in the one dark theme. Look at them.
2. `pnpm --filter @taptics/web e2e` green, including the accessibility audit (axe, WCAG 2.1 AA, contrast
   measured).
3. Tokens and building blocks only.
4. Spanish strings checked for overflow (they run about 30% longer).
5. One element removed before shipping. If nothing was removable, look again.
