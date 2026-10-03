# 0028: One luxury theme, a public home page, and the app home at /today

- **Context.** Ernesto (October 3):
  - The home page must sell the product, with a cinematic hero and a luxury palette: deep charcoal and black,
    champagne gold, rich contrast, glass throughout. Not the generic white-and-blue look.
  - The same language goes across the whole app, with smooth motion.
- **Decision.**
  - **One theme.** The light/dark pair (decision record for Liquid Glass, docs/LIQUID-GLASS.md) becomes a single
    dark theme. The structure is unchanged: every colour is a token at the top of `globals.css`, the material
    classes read the tokens, and Tailwind names map to them.
  - **Palette:**
    - charcoal ground `#0a0a0b` and surfaces `#151517` / `#1e1d20`;
    - warm ivory text (`#f6f1e7` ink, `#d8d1c4` body, `#a9a194` muted);
    - champagne gold `#dcc08c` for accents and links;
    - gold fill `#d6b47a` with dark ink on it for primary buttons;
    - a bronze second wash;
    - state colours kept separate from the brand.
  - **Contrast.** Every text token clears 4.5:1 on every surface it is used on (body text 11:1 or more, gold text
    9.6:1 or more, dark ink on gold 9.5:1). The accessibility suite audits it.
  - **Type.** Inter for the interface; Instrument Serif for display headlines. Both are self-hosted by Next at
    build time (`next/font`), so there is no runtime request to Google.
  - **Routes.**
    - `/` is the public home page: signed-in people go straight to the app.
    - The rep's home moved from `/` to `/today`, including the home-screen app's start URL and push links.
    - Sign-up is `/signup` (decision 0029); sign-in stays `/login`.
  - **Motion** respects `prefers-reduced-motion` everywhere: shader, parallax, page transitions, score reveal.
- **Consequence.**
  - The owner supplied a new logo (green on near-black) on October 3; every icon is rebuilt from it with
    `scripts/brand-icons.sh`. The interface palette stays gold.
  - `docs/DESIGN-GUIDELINES.md` describes the new language.
