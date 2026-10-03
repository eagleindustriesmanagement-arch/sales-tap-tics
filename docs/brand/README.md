# Brand assets

- `logo-source.png`: the owner's logo (1254 × 1254), as supplied on 2026-10-03.
- `app-store-1024.png`: the App Store and Google Play icon. Full bleed, no transparency (Apple rejects an icon with
  an alpha channel at upload), corners filled with the logo's own near-black (#040407) so the stores' masks
  show no seam.
- In the web app (`apps/web/public/`):
  - `icon-192.png` and `icon-512.png`: home-screen icons.
  - `icon-maskable-512.png`: Android adaptive icon, with the logo inside the 80% safe zone.
  - `apple-touch-icon.png`: the iPhone home screen.
  - `logo.png`: the sign-in screen.
  - `mark-128.png`, `favicon-64.png` and `favicon-32.png`: the bars, arrow and tap hand without the wordmark.
    Use these wherever the logo is shown under 64 px, where the wordmark cannot be read.

Colours taken from the logo:

- **Cyan, the top of its gradient (#1bc6fc):** the ambient wash only, never text.
- **Electric blue (#0773fd):** the brand blue. The UI accent is #0062e6, the same hue darkened only enough for white
  text on it to reach 5.3:1. Dark mode uses #4db4ff for text and #0a5bd6 for filled buttons.
- **Near-black tile (#040407):** the app icon and the installed app's launch colour.

Rebuild every size from `logo-source.png` with `scripts/brand-icons.sh` (ImageMagick).
