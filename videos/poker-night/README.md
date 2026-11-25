# Render the draft

Editable source: `index.html`. Fictional API: `mock-api.py`. Build helper: `build.py`.

Requires Python 3, FFmpeg, Node.js and Chromium. Install the pinned renderer and animation library into a separate directory.

```sh
tool_dir=$(mktemp -d)
render_dir=$(mktemp -d)
npm install --prefix "$tool_dir" hyperframes@0.9.96 gsap@3.15.1
python3 videos/poker-night/build.py "$render_dir" "$tool_dir/node_modules/gsap/dist/gsap.min.js"
HYPERFRAMES_SKIP_SKILLS=1 "$tool_dir/node_modules/.bin/hyperframes" render "$render_dir" --quality draft --output "$render_dir/draft.mp4"
```

The original 390×845 browser capture is in `assets/results-usd.png`. It is a genuine capture of the unmodified app at 05418b4, not an illustrated app reconstruction. The composition crops and enlarges it. The kitchen scene is original CSS illustration. Chip sounds are synthesized by `build.py`; no third-party music or voice recording is used. GSAP retains its upstream license in the installed package. Existing app fonts appear only inside its screenshot.

Capture reproduction: archive commit 05418b4 into a temporary directory, install its lockfile, set `EXPO_PUBLIC_API_URL=http://127.0.0.1:18765`, then start its Expo web server on 18764. Run `python videos/poker-night/mock-api.py`. Navigate the isolated app to `/game/fictional-friday`, choose English and dark appearance, and capture with the T3 preview tools. Do not point this fixture at production.

Draft limitation: illustrated kitchen setting, caption-only script, synthetic chip clacks. Audio was measured but not auditioned.
