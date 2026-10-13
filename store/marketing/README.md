# The Buy-Ins marketing screenshots

Direction C is the only rendered direction: bold white typography, tilted phones, a continuous violet band and chip motifs crossing the frame edges. Promotional copy and intentional headline line breaks live together in `copy.json` for German and English.

From the repository root, regenerate both languages and both stores:

```sh
node store/marketing/render.mjs
```

Render one language:

```sh
node store/marketing/render.mjs --lang en
```

First-time setup on another machine: `npm ci --prefix store/marketing`. The renderer uses installed Google Chrome on macOS. Set `CHROME_PATH` for another Chromium executable. It creates its own headless browser, without a logged-in profile.

## Screenshot inputs

Inputs are read fresh on each invocation from `store/screenshots/ios-6.9/<lang>/`, with these filenames:

| Marketing frame | Raw capture |
| --- | --- |
| 01 · Buy-ins | `02-live-table.png` |
| 02 · Seat draw | `03-seat-draw.png` |
| 03 · Settlement | `04-result.png` |
| 04 · Overview | `01-overview.png` |
| 05 · History | `05-history-leaderboard.png` |

The existing flat `store/screenshots/ios-6.9/*.png` files are treated as German. German captures prefer `de/`, then the flat directory. English captures prefer `en/`, then `de/`, then the flat German files. Each missing English capture produces an explicit warning and is marked as a fallback in the language manifest. Once English captures arrive, rerun the same command; no code changes are needed. `MARKETING_SCREENSHOTS` may override the screenshot root, retaining this directory structure.

All inputs must be 1320 × 2868. Missing German captures or invalid dimensions stop rendering. The renderer does not fabricate app UI or placeholders. Replacing captures for app UI changes, including neutral result-screen wording, also requires only the same render command.

## Outputs

- `out/<lang>/ios/01.png` through `05.png`: 1320 × 2868.
- `out/<lang>/play/01.png` through `05.png`: 1434 × 2868, an exact 1:2 ratio. The canvas is wider, with 57 extra pixels on each side of each composition; text, phone size and screenshot proportions stay the same.
- `out/<lang>/panorama.png`: 3000px-wide iOS panorama preview.
- Each store directory also contains `panorama.png`, `panorama-full.png` and self-contained `source.html`.
- `out/<lang>/manifest.json`: source paths, source language, fallback flags, source SHA-256 hashes, rendered copy, dimensions, collision-check results and timestamp.
- `index.html`: German/English gallery with iOS/Play links.

Each store uses one continuous composition, sliced into five frames. Every render checks safe margins and conservative transformed text/art bounds, leaving at least 24px between copy and phone/chip artwork. The bright chips sit below the sublines, including the seat-draw and overview frames.

Original PNG bytes are embedded unchanged inside CSS phone frames. Perspective, uniform scaling, screen-corner clipping and frame-level crops are composition treatments. There are no UI edits or added overlays on the screens. The raw screenshot files are read-only to this pipeline.

All promotional copy describes bookkeeping and coordination for private poker nights. Current renders remain design previews until localized and updated app captures replace any fallback sources.

Serve the gallery locally:

```sh
python3 -m http.server 4187 --bind 127.0.0.1 --directory store/marketing
```

Open `http://127.0.0.1:4187/` in the T3 preview.
