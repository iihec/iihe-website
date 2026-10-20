"""Apply the IIHE photo treatment to every image in photo-originals/.

The treatment gives all photos one consistent, on-brand look:
  1. colour is softened (less saturated), so IIHE Red stays the strongest colour on the page
  2. contrast is softened and shadows are slightly lifted (a gentle matte finish)
  3. a light cream warmth keeps skin tones natural and welcoming

Output: src/assets/img/photos/NAME-800.webp and NAME-1600.webp

Run from the project folder:
  uv run --with pillow --with numpy python tools/brand_photos.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photo-originals"
OUT = ROOT / "src" / "assets" / "img" / "photos"

SATURATION = 0.74   # 1 = original colour, 0 = black and white
SIZES = (800, 1600)
RATIO = 3 / 2       # every photo is cropped to the same landscape shape

# Warm, soft "matte" look (reference: a bright library photo with creamy highlights)
BLACK_LIFT = 0.07            # shadows are lifted slightly, never pure black
WHITE_POINT = 0.97           # highlights never pure white
WARMTH = (1.035, 1.0, 0.93)  # red, green, blue multipliers: a light cream warmth
CONTRAST = 0.92              # below 1 = softer contrast


def treat(img):
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    lum = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2])[..., None]
    x = lum + (rgb - lum) * SATURATION                 # softer colour
    x = (x - 0.5) * CONTRAST + 0.5                     # softer contrast
    x = x * np.array(WARMTH, dtype=np.float32)         # cream warmth
    x = BLACK_LIFT + np.clip(x, 0, 1) * (WHITE_POINT - BLACK_LIFT)  # matte finish
    return Image.fromarray(np.clip(x * 255.0, 0, 255).astype(np.uint8))


# Where to keep the subject when a tall photo is cropped (0 = top, 0.5 = centre, 1 = bottom)
FOCUS_Y = {
    
}


def crop_to_ratio(img, name=""):
    w, h = img.size
    if w / h > RATIO:
        nw = int(h * RATIO)
        left = (w - nw) // 2
        return img.crop((left, 0, left + nw, h))
    nh = int(w / RATIO)
    top = int((h - nh) * FOCUS_Y.get(name, 0.5))
    return img.crop((0, top, w, top + nh))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for f in sorted(SRC.glob("*.jp*g")):
        img = treat(crop_to_ratio(Image.open(f), f.stem))
        for w in SIZES:
            h = round(w / RATIO)
            img.resize((w, h), Image.LANCZOS).save(OUT / f"{f.stem}-{w}.webp", quality=74, method=6)
        print("done", f.stem)


if __name__ == "__main__":
    main()
