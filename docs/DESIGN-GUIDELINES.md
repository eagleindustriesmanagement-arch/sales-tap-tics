# Sales Tap-tics design guidelines

Every UI change follows this file. The material is Liquid Glass, ported from BookFlows
(`docs/LIQUID-GLASS.md` is that file, unchanged; it is written to be portable). This file is the
Sales Tap-tics policy on top of it. Spec 18.4 rule 7 still governs: calm, high contrast, large
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
   (amber trophy), up next (accent, breathing), tried, new. Each level shows its progress bar.
3. **A short loop.** Daily goal ring and streak at the top of Today; the session; a results
   screen with the score ring and the one change that matters most right under it (spec 18.4
   rule 2); Try again or Back to Today.
4. **Progress is a place.** Its own tab: the certification ring (the long goal), skills by week
   as small columns, weakest skills, mastery, behavior cards.
5. **Practice is immersive.** No tab bar inside a session; one way out at the top left.

## 3. Tokens and material

- Colours are tokens in `app/globals.css`: the mark's blue (`--accent`) and amber (`--spark`).
  Amber is for streaks, stars and certification only, never text.
- `--accent-fill` paints large tinted surfaces and primary buttons. In dark mode it stays a deep
  blue under white text; the lighter `--accent` is for text, links and the active tab.
- Dark values live in the token blocks only (two selectors: OS preference unless light was
  chosen, and an explicit dark choice). The material is written once.
- Vocabulary: `.liquid-glass` (+ `-accent`, `-ink`, `-success`, `-danger`), `-panel` for cards,
  `-inset` for something sunk into a card, `-field` for inputs, `-ring` for a selected edge,
  `-flat` for a control on a flat panel (material without blur), `-solid` for a neutral control
  on a tinted card, `.bezel` for a surface that keeps its own fill, `.glass-chrome` for the bars.
- Never a `bg-*` or `border-*` utility on an element with a material (LIQUID-GLASS §5.2).
- Budget: at most four blurred layers on screen. The chrome blurs; controls on panels use `-flat`.
- Radii: 28px hero, 24px glass, 20px cards, 14px fields and controls, pills fully round.

## 4. Building blocks

`components/ui.tsx`: `Card`, `Inset`, `PageHeader`, `SectionTitle`, `Chip`, `Grade`, `Ring`,
`Bar`, `Avatar`, `ListRow`, `RowGroup`, `Stat`, `Empty`, `ScoreBadge`, and the button and field
classes. `components/icons.tsx` is the one icon family (24px grid, 2px stroke). Use these before
writing new markup.

## 5. Type and text

- System font (SF Pro on iPhone). Titles 28-32px bold, section titles 19px, body 15-17px,
  captions 13px. Numbers use tabular figures and are the loudest thing in a tile.
- Sentence case. No ALL-CAPS labels, no eyebrow labels, no "->" or "←" text arrows (use the
  chevron icons).
- Empty states name the next action.

## 6. Phone and app-store manners

- `viewport-fit=cover`; the chrome insets for the notch and home indicator through `--safe-top`
  and `--safe-bottom` (variables, so tests can set them).
- Bottom tab bar: four tabs at most, icons and labels, floating glass. Primary actions in the
  bottom 40% of the screen. Touch targets at least 44px, primary buttons 52px.
- Fields are 16px or larger so iOS never zooms.
- The language is one tap away on every screen, including sign-in.
- Both themes ship; the accessibility suite audits every main screen in light and dark.
- Motion answers an action or marks the one loud moment (the next node). `prefers-reduced-motion`
  and `prefers-reduced-transparency` are honoured.

## 7. Definition of done for any UI change

1. Screenshots at 390px in light and dark reviewed, plus one desktop width.
2. `pnpm --filter @taptics/web e2e` green, including the two-theme accessibility audit.
3. Tokens and building blocks only.
4. Spanish strings checked for overflow (they run about 30% longer).
5. One element removed before shipping. If nothing was removable, look again.
