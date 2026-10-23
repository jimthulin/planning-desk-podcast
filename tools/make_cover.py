#!/usr/bin/env python3
"""Draw the show cover (3000x3000 RGB PNG) into docs/cover.png.

Run locally; needs Pillow and the Inter / Inter Display fonts. The PNG is committed,
so the GitHub workflow never has to run this.
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "cover.png"
FONTS = Path("/usr/share/fonts/opentype/inter")
S = 3000

INK = (12, 20, 33)
INK_2 = (20, 34, 54)
WHITE = (244, 241, 234)
AMBER = (242, 163, 58)
TEAL = (59, 196, 180)
MUTED = (138, 152, 170)


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def main():
    img = Image.new("RGB", (S, S), INK)
    d = ImageDraw.Draw(img)

    # Soft vertical gradient for depth.
    for y in range(S):
        t = y / S
        c = tuple(int(INK_2[i] * (1 - t) + INK[i] * t) for i in range(3))
        d.line([(0, y), (S, y)], fill=c)

    # A three-tier supply network in the upper half: sources -> hubs -> markets.
    rnd = random.Random(43)
    tiers = [
        [(330 + i * 300, 330 + rnd.randint(-40, 40)) for i in range(8)],
        [(620 + i * 600, 820 + rnd.randint(-60, 60)) for i in range(4)],
        [(260 + i * 250, 1330 + rnd.randint(-50, 50)) for i in range(11)],
    ]
    net = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    n = ImageDraw.Draw(net)
    for a in tiers[0]:
        for b in sorted(tiers[1], key=lambda p: abs(p[0] - a[0]))[:2]:
            n.line([a, b], fill=MUTED + (90,), width=6)
    for b in tiers[1]:
        for c in sorted(tiers[2], key=lambda p: abs(p[0] - b[0]))[:4]:
            n.line([b, c], fill=MUTED + (90,), width=6)
    # One highlighted flow, source to market.
    path = [tiers[0][5], tiers[1][2], tiers[2][7]]
    n.line(path, fill=AMBER + (255,), width=16, joint="curve")
    for p in tiers[0]:
        n.ellipse([p[0] - 22, p[1] - 22, p[0] + 22, p[1] + 22], fill=TEAL + (255,))
    for p in tiers[1]:
        n.rounded_rectangle([p[0] - 46, p[1] - 46, p[0] + 46, p[1] + 46], radius=14, fill=WHITE + (255,))
    for p in tiers[2]:
        n.ellipse([p[0] - 16, p[1] - 16, p[0] + 16, p[1] + 16], outline=WHITE + (220,), width=7)
    for p in path:
        n.ellipse([p[0] - 34, p[1] - 34, p[0] + 34, p[1] + 34], fill=AMBER + (255,))
    glow = net.filter(ImageFilter.GaussianBlur(18))
    img.paste(glow, (0, 0), glow)
    img.paste(net, (0, 0), net)

    d = ImageDraw.Draw(img)
    left = 230
    d.text((left, 1640), "THE", font=font("InterDisplay-Bold.otf", 190), fill=AMBER)
    d.text((left - 18, 1810), "PLANNING", font=font("InterDisplay-Black.otf", 430), fill=WHITE)
    d.text((left - 18, 2210), "DESK", font=font("InterDisplay-Black.otf", 430), fill=WHITE)
    d.rectangle([left, 2715, left + 380, 2735], fill=AMBER)
    d.text((left, 2770), "Supply chain planning & design news  ·  every Sunday",
           font=font("Inter-Medium.otf", 92), fill=MUTED)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
