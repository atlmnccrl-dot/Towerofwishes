"""Bannerborn: the app's icon and splash sources, drawn from nothing (the banner and its crown).

    python3 tools/make-icons.py

Writes app/assets/{icon-only,icon-foreground,icon-background,splash,splash-dark}.png, which
`npx capacitor-assets generate` (run from app/) turns into every size the stores and devices want,
store/feature-graphic.png (1024x500, Google Play) and the web icons in assets/.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SS = 4  # supersampling

RED, GOLD, CROWN, DARK = (179, 36, 44), (232, 198, 106), (255, 211, 122), (10, 12, 17)


def glow_bg(w, h, strength=1.0):
    """near-black with a warm glow behind the banner"""
    im = Image.new('RGB', (w, h), DARK)
    g = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(g)
    r = min(w, h) * 0.46
    d.ellipse((w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r), fill=int(120 * strength))
    g = g.filter(ImageFilter.GaussianBlur(min(w, h) * 0.16))
    warm = Image.new('RGB', (w, h), (120, 84, 30))
    return Image.composite(warm, im, g)


def banner(size, scale=1.0):
    """the banner on a transparent square of `size`, filling `scale` of the classic icon's proportions"""
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = S / 512 * scale
    ox, oy = S / 2 - 256 * u, S / 2 - 256 * u
    P = lambda x, y: (ox + x * u, oy + y * u)
    edge = 14 * u
    # cloth with its gold border: a swallow-tailed pennant
    outer = [P(132, 78), P(380, 78), P(380, 440), P(256, 372), P(132, 440)]
    d.polygon(outer, fill=GOLD)
    d.line(outer + [outer[0]], fill=GOLD, width=int(edge), joint='curve')
    inner = [P(146, 92), P(366, 92), P(366, 416), P(256, 356), P(146, 416)]
    d.polygon(inner, fill=RED)
    # the bar it hangs from
    d.rounded_rectangle((*P(118, 64), *P(394, 92)), radius=int(3 * u), fill=GOLD)
    # the crown
    d.polygon([P(189, 268), P(189, 182), P(223, 224), P(256, 170), P(289, 224), P(323, 182), P(323, 268)], fill=CROWN)
    return im.resize((size, size), Image.LANCZOS)


def save(im, *path):
    p = os.path.join(ROOT, *path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p)
    print('wrote', os.path.relpath(p, ROOT), im.size)


def main():
    # the whole icon (iOS, the web, the store listing)
    icon = glow_bg(1024, 1024).convert('RGBA')
    icon.alpha_composite(banner(1024))
    save(icon.convert('RGB'), 'app', 'assets', 'icon-only.png')
    for n in (512, 192, 180):
        save(icon.convert('RGB').resize((n, n), Image.LANCZOS), 'assets', 'icon-%d.png' % n)
    # Android's adaptive icon: the banner alone inside the safe middle, over the glow
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    fg.alpha_composite(banner(1024, 0.62))
    save(fg, 'app', 'assets', 'icon-foreground.png')
    save(glow_bg(1024, 1024), 'app', 'assets', 'icon-background.png')
    # the splash: the banner small in the middle of the dark (the same by day and by night)
    sp = glow_bg(2732, 2732, 0.8).convert('RGBA')
    b = banner(820)
    sp.alpha_composite(b, ((2732 - 820) // 2, (2732 - 820) // 2))
    save(sp.convert('RGB'), 'app', 'assets', 'splash.png')
    save(sp.convert('RGB'), 'app', 'assets', 'splash-dark.png')


if __name__ == '__main__':
    main()
