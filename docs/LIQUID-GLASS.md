# Liquid Glass — a portable material system

Written for BookFlows, but nothing here is BookFlows-specific. It needs four
colour tokens and CSS `color-mix`. Lift the whole file into any app.

Built and measured 2026-09-03. **Raised 2026-09-04** — see §2.1. Every number
below is one that shipped and was verified on a device, not a value someone
liked the sound of.

---

## 0. The one idea

**Glass is not a surface treatment. It is a relationship between a surface and
what is behind it.**

The first version of this system failed because it ignored that. It had a
tinted background, a lit rim, a sheen and a shadow — all correct — sitting on a
page with one flat background colour. On a flat ground a 72%-opaque surface and
a 100%-opaque surface composite to *exactly the same colour*. The translucency
was doing nothing. The rim and the sheen were carrying the whole effect, and it
read as "a light grey card with a nice edge".

The fix was not on the glass. It was giving the page something to be glass
about.

> If you take one thing from this document: **before you tune the material,
> put colour variation in the ground.** Everything else here is refinement.

---

## 1. The ground

Two very wide, very faint washes at opposite corners of the *viewport*.

```css
body {
  background:
    radial-gradient(120% 90% at 8% -10%,
      color-mix(in srgb, var(--accent) 9%, transparent), transparent 60%),
    radial-gradient(110% 80% at 100% 108%,
      color-mix(in srgb, var(--accent) 7%, transparent), transparent 62%),
    var(--background);
  background-attachment: fixed;
}
```

Three decisions worth keeping:

- **`background-attachment: fixed`.** The wash belongs to the screen, not the
  document. A card's tint then *changes as the page scrolls under it*, which is
  the single most convincing thing a fake glass surface can do.
- **Opposite corners.** A surface near the top-left picks up more accent than
  one at the bottom-right, and a card spanning both is lighter at one end. One
  centred wash gives you a vignette, not depth.
- **Under 9% alpha.** Above that it stops being light and becomes gradient
  wallpaper. In dark mode go slightly higher (9% / 7%) — a dark ground shows a
  tint at lower alpha but has further to travel before it reads at all.

---

## 2. The material

```css
.liquid-glass {
  --lg-tint: var(--surface);   /* what the glass is made of */
  --lg-opacity: 62%;           /* how much ground comes through */
  --lg-sheen: 52%;             /* strength of the specular highlight */
  --lg-rim: 72%;               /* strength of the lit top edge */

  background:
    /* SPECULAR, not a wash: a bright narrow glint across the top few percent,
       and a fainter bounce off the bottom. Four stops, not two. */
    linear-gradient(to bottom,
      color-mix(in srgb, #fff var(--lg-sheen), transparent) 0%,
      color-mix(in srgb, #fff calc(var(--lg-sheen) * 0.34), transparent) 14%,
      transparent 52%,
      color-mix(in srgb, #fff calc(var(--lg-sheen) * 0.18), transparent) 100%
    ),
    color-mix(in srgb, var(--lg-tint) var(--lg-opacity), transparent);

  -webkit-backdrop-filter: blur(30px) saturate(200%) brightness(1.07);
  backdrop-filter: blur(30px) saturate(200%) brightness(1.07);
  border: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);

  box-shadow:
    0 1px 2px  color-mix(in srgb, var(--ink) 9%, transparent),   /* contact  */
    0 10px 30px color-mix(in srgb, var(--ink) 13%, transparent), /* ambient  */
    inset 0 0 0 0.5px color-mix(in srgb, #fff 40%, transparent), /* lens     */
    inset 0 1.5px 0   color-mix(in srgb, #fff var(--lg-rim), transparent),
    inset 0 -1px 0    color-mix(in srgb, var(--ink) 9%, transparent),
    inset 0 -6px 12px -6px color-mix(in srgb, #fff 22%, transparent);

  transition:
    box-shadow 220ms cubic-bezier(0.32, 0.72, 0, 1),
    transform  220ms cubic-bezier(0.32, 0.72, 0, 1),
    background 220ms ease;
}
```

### The three details that do the work

**The lens.** Two inset rings a half-pixel apart: a bright one for the lit face
of the bevel, a dark one for the shadow it casts inward. This is what makes an
edge look *refracted* rather than *printed*. If you keep only one line from this
block, keep `inset 0 0 0 0.5px`.

**Specular, not sheen.** A single top-to-bottom white fade reads as "tinted
white at the top". A real curved edge catches a narrow glint and bounces a
fainter one back off the bottom. The `0% → 14% → 52% → 100%` stops are the
difference between *lit* and *tinted*.

**Contact plus ambient shadow.** `0 1px 2px` sits directly under the edge and
says the surface touches something; `0 10px 30px` is the light in the room. One
without the other gives you either a sticker or a hovering ghost.

## 2.1 The raise (2026-09-04)

The owner's report: *"for some of them you can't see that they're 3d glass."*
They were right, and the reason was arithmetic rather than taste.

**A white rim on a white surface is invisible.** At `--lg-opacity: 89%` a panel
composites to within one part in 255 of pure white, so `inset 0 1.5px 0 #fff
62%` and `inset 0 0 0 0.5px #fff 34%` — the lit rim and the lens, the two
details this document says do all the work — were contributing *nothing at
all*. What remained was a soft grey drop shadow, which is exactly what a flat
card looks like.

Four changes, in order of how much they matter:

1. **The bottom edge is darker than the top.** `border-bottom-color` at 13–15%
   ink, plus `inset 0 -1.5px 0` and a soft `inset 0 -10px 16px -10px` climbing
   off the lower lip. Glass is lit from above, so its underside sits in its own
   shadow — and on a near-white fill that dark line is most of what reads as
   *thickness*. This is the single biggest change.
2. **Four shadow scales, not two.** `0 1px 1px`, `0 4px 8px -2px`,
   `0 14px 28px -6px`, `0 30px 60px -20px`. Real objects cast a tight dark
   contact shadow and progressively wider, fainter ones as light wraps around
   them. Two stops read as "a card with a drop shadow"; four read as an object
   above a surface. Negative spread on each is what stacks them into one
   falloff instead of four visible rings.
3. **Opacity came DOWN.** Base 62% → 58%, panel 89% → 82%. Counter-intuitive
   until you remember the point: more ground through the surface gives the
   white rim something to be brighter *than*. Contrast is unaffected — the
   panel composite moves from ~253.9 to ~253.2 of 255 over the `#f5f7fa`
   ground, which is 0.3% of one channel.
4. **The lens wraps all four sides**, and the specular runs at `177deg` rather
   than `180deg`. A hair off-vertical reads as a pane catching light from a
   real direction instead of a symmetrical CSS gradient.

**Tinted variants cast tinted shadows.** A blue button throwing a grey shadow
is the giveaway that it was drawn rather than lit, so `.liquid-glass-accent`,
`-success` and `-danger` mix their shadow from their own tint.

**States move in the third dimension.** Hover lifts (`translateY(-1px)`) and
every shadow scale grows; press sinks (`translateY(1.5px)`) and the whole stack
*collapses* to three short shadows. A control that only darkens on press looks
nudged; one whose shadow shortens with it looks pushed.

All of it applies in dark mode too, where the shadows carry more of the depth
because there is no bright rim to spare.

---

### Saturation is not decoration

`saturate(200%)` is what makes the ambient wash *visible* through the glass. If
you drop the backdrop-filter for performance, you lose the ground's colour
along with the blur — that is the real cost, not the blur itself.

---

## 3. The family

One base, several tints. Each variant only overrides tokens and the shadow.

| Class | Use | Key values |
|---|---|---|
| `.liquid-glass` | the base — buttons, chips, controls | tint `--surface`, 62% |
| `.liquid-glass-accent` | primary CTA | tint `--accent`, 92% |
| `.liquid-glass-ink` | neutral-dark control, second primary | tint `--ink`, 93% |
| `.liquid-glass-danger` | destructive | tint `--danger`, 92% |
| `.liquid-glass-success` | confirm states ("Saved ✓") | tint `--success`, 94% |
| `.liquid-glass-panel` | cards — **no blur**, 89% | see below |
| `.liquid-glass-inset` | something sunk *into* a panel | highlight moves to the bottom edge |
| `.liquid-glass-field` | inputs | recessed, quieter |
| `.liquid-glass-ring` | selected/unread row | border-colour only |
| `.bezel` | shadow only, keeps the element's own fill | see §4 |
| `.sticky-heading` | a heading that pins inside a panel | see §6 |

**Tinted variants run at 89–94%, not 62%.** A label has to clear 4.5:1 against
them, which a 62% tint of an accent colour does not. Measure it; don't guess.

### Panels do not blur

```css
.liquid-glass-panel {
  --lg-opacity: 89%;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  /* …shadow with the same contact + ambient + lens structure… */
}
```

A card on flat ground has nothing to refract, and six cards would spend six
compositor layers to blur a colour they could have sampled. But **89%, not
100%** — that 11% is how the ambient wash reaches each card, so a stack stops
reading as six identical white rectangles. It costs one colour stop, not a
layer.

---

## 4. `.bezel` — the escape hatch you will need

```css
.bezel {
  box-shadow:
    0 3px 12px color-mix(in srgb, var(--ink) 8%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--ink) 6%, transparent);
}
```

Shadow only — **no background**. It exists for surfaces that must keep their
own fill:

- a button coloured with a *user's* brand colour via inline `style`
- semantic callouts (amber warning, green success) that must stay that colour
- small tinted badges and icon medallions

Without this you end up choosing between "on the material" and "the right
colour", and someone will pick wrong.

**It is shadow-only, so never put it on an element with no fill.** A bezel on a
transparent button is a shadow floating with nothing under it. That looks
broken, and it is the one way to misuse this class.

---

## 5. Traps that cost real time

### 5.1 Lightning CSS silently deletes `backdrop-filter`

If the standard property is written **before** the `-webkit-` alias, the
minifier drops one and **the blur never ships**. It fails silently, in
production only.

```css
/* CORRECT — prefixed first, every time */
-webkit-backdrop-filter: blur(30px) saturate(200%);
backdrop-filter: blur(30px) saturate(200%);
```

Add it to your build check:
`grep -o -- "-webkit-backdrop-filter[^;]*;backdrop-filter" dist/*.css`

### 5.2 Unlayered CSS beats Tailwind utilities

Tailwind v4 puts utilities in `@layer utilities`. A plain `.liquid-glass` rule
in your stylesheet is **unlayered**, and unlayered wins regardless of
specificity. So:

```html
<!-- The bg-accent does NOTHING. White label on neutral glass = invisible. -->
<button class="liquid-glass bg-accent text-accent-foreground">
```

**Switch the material, never the fill:**

```html
<button class="liquid-glass liquid-glass-accent text-accent-foreground">
```

The same applies to `border-*` (the material sets the `border` *shorthand*, so
`border-dashed` becomes solid — ship a `.liquid-glass-dashed` opt-in) and to
`shadow-*`/`ring-*`, which become dead code beside any material.

This bug is invisible in review and obvious to a user: a control that renders
as a blank rectangle. Detect it in CI by scanning `className` values for a
material class next to a `bg-*` utility — **and make the scanner
template-literal aware**, because a naive regex stops at the first `"` and
misses every ternary arm.

### 5.3 Three theme states, not two

An explicit theme toggle and an OS preference are different selectors:

```css
:root { /* light */ }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { } }
:root[data-theme="dark"] { }
```

Tune every material in **both** dark blocks. Miss one and a user who picks Dark
in your settings gets light-tuned glass on a dark ground — a 46% white sheen
that reads as fog.

**Watch specificity when you add `:hover` / `:active`.** A light rule written
`button.liquid-glass:hover` is `(0,3,1)` and beats a dark override written
`:root[data-theme="dark"] .liquid-glass` `(0,3,0)`. We shipped a bug where a
`<button>` flashed a white rim in dark mode, an `<a>` got no hover at all, and
the press state never fired — same rule, three behaviours, decided by tag.

### 5.4 Dark glass is not light glass with less white

A white sheen that reads as a highlight on white reads as **fog** on `#0b1220`.
In dark: drop the sheen hard (52% → 14%), keep the *lens* ring (it still
defines the edge), and make the ambient shadow real black — an ink-coloured
shadow is invisible on a dark ground.

### 5.5 Two translucent surfaces stacked will seam

A sticky heading inside a translucent panel is the case you will hit. Any fill
at all composites differently from the panel behind it and paints a lighter
rectangle with a hard bottom edge across the card. We measured a 1.179:1 step.

The physics answer is to give it **no fill**:

```css
.sticky-heading {
  background: transparent;
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  backdrop-filter: blur(14px) saturate(180%);
}
```

A blur with no tint samples whatever is behind it — at rest that is the panel
itself, so it is invisible; the moment content scrolls under, the same blur is
what keeps the heading readable.

### 5.6 Reduced transparency is a promise, not a nicety

Someone who turned that on asked for exactly one thing, and it is the thing
this whole file is made of. Every translucent surface goes solid — **including
the ones that set their own background** (`-field`, `-inset`), which the base
fallback will not reach, and including any modifier declared *after* the
fallback block, which will otherwise undo it by source order.

```css
@media (prefers-reduced-transparency: reduce) {
  .liquid-glass { background: var(--lg-tint); backdrop-filter: none; }
  .liquid-glass-field, :root[data-theme="dark"] .liquid-glass-field {
    background: var(--surface);
  }
  /* …and every other self-backgrounding variant… */
}
```

Note the repeated dark selector: the dark overrides are `(0,3,0)` and would
out-specify a bare class here.

### 5.7 Modifiers must add, not replace

A "chrome" modifier that sets its own `background` and is declared after the
base *replaces the entire material* at equal specificity — the gradient, the
tint, both lens rings — leaving a flat surface. Modifiers should set only what
they add (an edge, a colour), never `background`.

---

## 6. Budgets

- **≤ 4 blurred layers on screen.** Each `backdrop-filter` is a compositor
  layer. Form controls do not need one: `input.liquid-glass, select…,
  textarea… { backdrop-filter: none }` removed 17 layers from one screen here
  with no visible change, because a field sits on a flat card anyway.
- **Blur ≤ 30px.** Past that you pay more and see less.
- **Text on glass ≥ 4.5:1, measured.** Not judged.

---

## 7. How to measure contrast on translucent surfaces

Judging by eye is how you ship a 3:1 label. Two traps, both of which produced
wildly wrong numbers here before they were caught:

**Never parse the colour string.** Modern palettes compute to `oklch()` /
`oklab()` / `color(srgb …)`. Pulling numbers out with a regex gives nonsense
that looks plausible — it reported 274 failures that did not exist. Resolve
every colour by **painting** it:

```js
const cv = document.createElement('canvas'); cv.width = cv.height = 1;
const ctx = cv.getContext('2d', { willReadFrequently: true });
const resolve = (str) => {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  try { ctx.fillStyle = str; } catch { return null; }
  ctx.clearRect(0, 0, 1, 1); ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
};
```

Then composite the element's background up the **whole ancestor chain** over an
opaque base before computing the ratio. On a translucent system the parent
chain *is* the background.

**Disable transitions before measuring.** `getComputedStyle` returns
*interpolated* values mid-transition, and a throttled or hidden tab can freeze
them there — that produced 111 phantom failures in one run.

Also worth doing: run the same maths with the *old* values as a counterfactual.
It is the only way to tell a regression from something that was always broken.

---

## 8. Porting checklist

1. Define `--background`, `--surface`, `--ink`, `--accent` for light and both
   dark states.
2. Add the ambient ground (§1). **Look at it before tuning anything else.**
3. Copy `.liquid-glass` and the variants you need.
4. Verify the built CSS kept `backdrop-filter` (§5.1).
5. Sweep for material + `bg-*` collisions (§5.2), template-literal aware.
6. Add the reduced-transparency and `@supports not` fallbacks (§5.6).
7. Measure contrast with §7 in both themes.
8. Count blurred layers per screen (§6).
