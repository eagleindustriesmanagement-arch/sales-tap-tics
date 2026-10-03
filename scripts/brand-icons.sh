#!/usr/bin/env bash
# Rebuilds every icon from docs/brand/logo-source.png (ImageMagick). See docs/brand/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=docs/brand/logo-source.png   # 1024 x 1024: the mark above the wordmark, on near-black
PUB=apps/web/public
TMP=$(mktemp -d)
TILE="#03060b"   # the logo's own near-black
# The mark (the rounded tile with the bars and the arrow), cropped square without the wordmark.
convert "$SRC" -crop 480x480+272+104 +repage -alpha off "$TMP/mark.png"
# Store and home-screen icons: the mark, full bleed (stores and phones apply their own corner mask).
convert "$TMP/mark.png" -resize 1024x1024 -alpha off -define png:color-type=2 docs/brand/app-store-1024.png
convert "$TMP/mark.png" -resize 512x512 -alpha off "$PUB/icon-512.png"
convert "$TMP/mark.png" -resize 192x192 -alpha off "$PUB/icon-192.png"
convert "$TMP/mark.png" -resize 180x180 -alpha off "$PUB/apple-touch-icon.png"
# Android adaptive icon: the mark inside the 80% safe zone.
convert "$TMP/mark.png" -resize 380x380 -background "$TILE" -gravity center -extent 512x512 -alpha off "$PUB/icon-maskable-512.png"
# Small sizes, where the wordmark could not be read.
convert "$TMP/mark.png" -resize 128x128 "$PUB/mark-128.png"
convert "$TMP/mark.png" -resize 64x64 "$PUB/favicon-64.png"
convert "$TMP/mark.png" -resize 32x32 "$PUB/favicon-32.png"
# The full logo with the wordmark and tagline.
convert "$SRC" -resize 480x480 "$PUB/logo.png"
rm -rf "$TMP"
echo "icons rebuilt"
