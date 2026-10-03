# Brand assets

- `logo-source.png`: the owner's logo (1024 × 1024), as supplied on 2026-10-03 (second version: green and teal on
  near-black, "Learn / Practice / Close").
- `app-store-1024.png`: the App Store and Google Play icon: the mark, full bleed, no transparency (Apple rejects an
  icon with an alpha channel at upload).
- In the web app (`apps/web/public/`):
  - `icon-192.png` and `icon-512.png`: home-screen icons.
  - `icon-maskable-512.png`: Android adaptive icon, with the mark inside the 80% safe zone.
  - `apple-touch-icon.png`: the iPhone home screen.
  - `logo.png`: the full logo with the wordmark.
  - `mark-128.png`, `favicon-64.png` and `favicon-32.png`: the rounded tile with the bars and arrow, without the
    wordmark. Use these wherever the logo is shown under 64 px.

The app's interface keeps its own palette (charcoal, champagne gold; decision 0028). The logo's green is used in
the logo only.

Rebuild every size from `logo-source.png` with `scripts/brand-icons.sh` (ImageMagick).
