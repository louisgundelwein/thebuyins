"""Prepare the composition, the frozen app capture, and synthesized chip sounds."""
import argparse
import math
from pathlib import Path
import random
import shutil
import struct
import wave

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path)
parser.add_argument("gsap", type=Path)
args = parser.parse_args()
source = Path(__file__).parent
assets = args.output / "assets"
assets.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source / "index.html", args.output / "index.html")
shutil.copyfile(source / "assets" / "results-usd.png", assets / "results-usd.png")
shutil.copyfile(args.gsap, assets / "gsap.min.js")

# Resonant transients evoke poker chips hitting a wooden table.
rate = 48_000
hits = (0.14, 0.29, 0.48, 1.05, 1.2, 1.37, 1.75, 2.0)
noise = random.Random(17)
with wave.open(str(assets / "chips.wav"), "wb") as audio:
    audio.setparams((1, 2, rate, 0, "NONE", "not compressed"))
    for frame in range(8 * rate):
        time = frame / rate
        sample = 0.0
        for hit in hits:
            elapsed = time - hit
            if 0 <= elapsed < 0.14:
                resonance = 0.32 * math.sin(2 * math.pi * 2300 * elapsed)
                resonance += 0.23 * math.sin(2 * math.pi * 3700 * elapsed)
                sample += (resonance + noise.uniform(-0.35, 0.35)) * math.exp(-elapsed * 75)
        audio.writeframesraw(struct.pack("<h", int(max(-0.95, min(0.95, sample)) * 22_000)))
