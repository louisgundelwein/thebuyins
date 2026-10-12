#!/usr/bin/env bash
# Renders the app icon, Android adaptive layers, splash and favicon into assets/images.
# Needs rsvg-convert (brew install librsvg). Rerun after changing the motif.
set -euo pipefail
cd "$(dirname "$0")/../assets/images"

SPADE='M50 6 C50 6 92 38 92 60 C92 77 73 85 58 74 C60 85 64 92 71 96 L29 96 C36 92 40 85 42 74 C27 85 8 77 8 60 C8 38 50 6 50 6 Z'
DEFS='<defs>
  <radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#17122a"/><stop offset="1" stop-color="#0c0b12"/></radialGradient>
  <linearGradient id="vt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#5eead4"/></linearGradient>
</defs>'
BG='<rect width="1024" height="1024" fill="url(#bg)"/>'

# Chip with spade, centered on a 1024 canvas. $1 = paint, $2 = notch/spade colour, $3 = scale.
chip() {
  local notches=""
  for a in 0 45 90 135 180 225 270 315; do
    notches+="<rect x=\"482\" y=\"176\" width=\"60\" height=\"60\" rx=\"10\" fill=\"$2\" transform=\"rotate($a 512 512)\"/>"
  done
  echo "<g transform=\"translate(512 512) scale($3) translate(-512 -512)\">
    <circle cx=\"512\" cy=\"512\" r=\"310\" fill=\"none\" stroke=\"$1\" stroke-width=\"56\"/>$notches
    <circle cx=\"512\" cy=\"512\" r=\"215\" fill=\"$1\"/>
    <path d=\"$SPADE\" fill=\"$2\" transform=\"translate(512 512) scale(2.7) translate(-50 -51)\"/></g>"
}
svg() { echo "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1024 1024\">$DEFS$1</svg>"; }
render() { svg "$2" | rsvg-convert -w "$3" -h "$3" -o "$1"; }

# Opaque, so iOS accepts it.
render icon.png "$BG$(chip 'url(#vt)' '#0c0b12' 1)" 1024
render favicon.png "$BG$(chip 'url(#vt)' '#0c0b12' 1)" 48
# Adaptive icon: launchers crop to the inner ~61%, so the chip shrinks.
render android-icon-background.png "$BG" 1024
render android-icon-foreground.png "$(chip 'url(#vt)' '#0c0b12' 0.85)" 1024
# Monochrome: launchers only read alpha, so notches and spade are masked out.
render android-icon-monochrome.png "<mask id=\"m\"><rect width=\"1024\" height=\"1024\"/>$(chip '#fff' '#000' 0.85)</mask><rect width=\"1024\" height=\"1024\" fill=\"#fff\" mask=\"url(#m)\"/>" 1024
# Splash: transparent chip on the splash background colour from app.json.
render splash-icon.png "$(chip 'url(#vt)' '#0c0b12' 1.5)" 1024
