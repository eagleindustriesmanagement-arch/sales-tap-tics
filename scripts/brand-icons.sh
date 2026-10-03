#!/usr/bin/env bash
# Rebuilds every icon from docs/brand/logo-source.png (ImageMagick). See docs/brand/README.md.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=docs/brand/logo-source.png
PUB=apps/web/public
TMP=$(mktemp -d)
TILE="#040407"   # the logo's own near-black
# Full bleed: fill the four corners outside the rounded tile with the tile colour (stores apply their own mask).
convert "$SRC" -fuzz 75% -fill "$TILE" \
  -draw "color 0,0 floodfill" -draw "color 1253,0 floodfill" -draw "color 0,1253 floodfill" -draw "color 1253,1253 floodfill" \
  -alpha off "$TMP/square.png"
convert "$TMP/square.png" -resize 1024x1024 -alpha off -define png:color-type=2 docs/brand/app-store-1024.png
convert "$TMP/square.png" -resize 512x512 -alpha off "$PUB/icon-512.png"
convert "$TMP/square.png" -resize 192x192 -alpha off "$PUB/icon-192.png"
convert "$TMP/square.png" -resize 180x180 -alpha off "$PUB/apple-touch-icon.png"
# Android adaptive icon: the logo inside the 80% safe zone.
convert "$TMP/square.png" -resize 410x410 -background "$TILE" -gravity center -extent 512x512 -alpha off "$PUB/icon-maskable-512.png"
# The mark (bars, arrow, tap hand) without the wordmark, for anything under 64 px.
convert "$TMP/square.png" -crop 820x560+260+55 +repage -background "$TILE" -gravity center -extent 820x820 "$TMP/mark.png"
convert "$TMP/mark.png" -resize 128x128 "$PUB/mark-128.png"
convert "$TMP/mark.png" -resize 64x64 "$PUB/favicon-64.png"
convert "$TMP/mark.png" -resize 32x32 "$PUB/favicon-32.png"
# The sign-in logo keeps its rounded corners, transparent outside.
convert "$SRC" \( -size 1254x1254 xc:none -fill white -draw "roundrectangle 0,0 1253,1253 250,250" \) -compose DstIn -composite -resize 480x480 "$PUB/logo.png"
rm -rf "$TMP"
echo "icons rebuilt"
