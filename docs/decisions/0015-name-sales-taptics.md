# 0015: The product is Sales Taptics

- **Context.** Decision 0001 used "Sales Tap-tics". The owner's logo (docs/brand) and domain (salestaptics.com)
  say "Sales Taptics", and on 2026-10-03 he confirmed that is the name.
- **Decision.** Every user-facing string, the app manifest, sign-in emails and the docs use **Sales Taptics**. The
  home-screen label is **Taptics**, because iOS cuts labels longer than about 12 characters. Code names stay as
  they are (`@taptics/*` packages, `TAPTICS_*` settings, the `sales-tap-tics` repository), since they were never
  shown to users.
- **Consequence.** Applied migrations and earlier decision records keep the old spelling as written; they are
  history.
