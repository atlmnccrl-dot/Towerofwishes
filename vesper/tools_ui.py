"""Draw Vesper's pixel-art interface pieces: 9-slice frames for panels, buttons and item slots, an
ornament divider and the gem bullets, in the game's iron-and-blood palette. Drawn at 1x and shown
scaled up without smoothing, like the characters.
Output: assets/ui/vesper/*.png. Run: python3 -I vesper/tools_ui.py
"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'ui', 'vesper')
INK = (5, 3, 7, 255)
IRON_HI, IRON, IRON_LO = (120, 98, 112, 255), (74, 58, 70, 255), (38, 28, 36, 255)
FILL = (20, 11, 17, 236)
RED, RED_HI, RED_LO = (178, 22, 46, 255), (255, 60, 84, 255), (92, 10, 26, 255)
GOLD, GOLD_HI = (214, 160, 60, 255), (255, 222, 130, 255)

def frame(n, corner, hot=False, gem=True, fill=FILL):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); px = im.load()
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            if d == 0: c = INK
            elif d == 1: c = (IRON_HI if (x < n / 2 and y < n / 2) or (x < y and x < n - 1 - y) else IRON) if not hot else ((200, 70, 90, 255) if x + y < n else (140, 30, 50, 255))
            elif d == 2: c = IRON if not hot else (160, 40, 60, 255)
            elif d == 3: c = IRON_LO
            elif d == 4: c = INK
            elif d == 5: c = RED_HI if hot else RED_LO
            else: c = fill
            px[x, y] = c
    if gem:
        # Riveted corners: a small diamond gem, lit from the top left.
        for cx, cy in ((3, 3), (n - 4, 3), (3, n - 4), (n - 4, n - 4)):
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    if abs(dx) + abs(dy) <= 2:
                        c = RED_HI if hot and dx + dy < 0 else RED if dx + dy <= 0 else RED_LO
                        if abs(dx) + abs(dy) == 2: c = INK if not hot else RED_LO
                        if dx == -1 and dy == -1: c = (255, 200, 210, 255)
                        px[cx + dx, cy + dy] = c
    return im

def button(w, h, state):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); px = im.load()
    top, mid, bot = {'idle': ((70, 52, 64), (40, 28, 36), (26, 17, 23)), 'hot': ((200, 50, 72), (140, 20, 42), (86, 10, 26)), 'down': ((30, 20, 26), (44, 30, 38), (60, 44, 54))}[state]
    for y in range(h):
        k = y / (h - 1); base = tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3))
        for x in range(w):
            d = min(x, y, w - 1 - x, h - 1 - y)
            if d == 0: c = INK
            elif d == 1:
                light = (y == 1 or x == 1) and not (y == h - 2 or x == w - 2)
                c = ((255, 150, 165, 255) if state == 'hot' else IRON_HI) if (light and state != 'down') else ((20, 12, 18, 255) if state != 'down' else IRON)
            else: c = base + (255,)
            px[x, y] = c
    # Corner notches for a chiselled plate.
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)): px[x, y] = (0, 0, 0, 0)
    return im

def slot(n, hot=False):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); px = im.load()
    for y in range(n):
        for x in range(n):
            d = min(x, y, n - 1 - x, n - 1 - y)
            if d == 0: c = INK
            elif d == 1: c = (RED_HI if hot else IRON_LO) if (x == 1 or y == 1) else ((255, 120, 140, 255) if hot else IRON)
            elif d == 2: c = INK
            else: c = (12, 7, 11, 230)
            px[x, y] = c
    return im

def divider(w):
    h = 9; im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); px = im.load(); m = w // 2
    for x in range(w):
        fade = 1 - abs(x - m) / m
        if fade <= 0.02: continue
        a = int(255 * min(1, fade * 1.6))
        px[x, 4] = RED[:3] + (a,); px[x, 3] = IRON_HI[:3] + (int(a * 0.5),); px[x, 5] = INK[:3] + (a,)
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            if abs(dx) + abs(dy) <= 4:
                c = INK if abs(dx) + abs(dy) == 4 else RED_HI if dx + dy < -1 else RED if dx + dy <= 1 else RED_LO
                if dx == -1 and dy == -2: c = (255, 210, 220, 255)
                px[m + dx, 4 + dy] = c
    for s in (-1, 1):
        cx = m + s * 9
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                if abs(dx) + abs(dy) <= 2: px[cx + dx, 4 + dy] = INK if abs(dx) + abs(dy) == 2 else GOLD if dx + dy < 0 else (140, 96, 30, 255)
    return im

def gem(n=7, col=RED, hi=RED_HI, lo=RED_LO):
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0)); px = im.load(); m = n // 2
    for y in range(n):
        for x in range(n):
            d = abs(x - m) + abs(y - m)
            if d <= m: px[x, y] = INK if d == m else hi if x + y < n - 2 else col if x + y == n - 1 else lo
    px[m - 1, m - 1] = (255, 220, 225, 255)
    return im

def bar(w, h, col):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); px = im.load()
    for y in range(h):
        for x in range(w):
            if y == 0 or y == h - 1 or x == 0 or x == w - 1: c = INK
            else: c = tuple(min(255, int(v * (1.25 if y == 1 else 0.7 if y == h - 2 else 1))) for v in col[:3]) + (255,)
            px[x, y] = c
    return im

def main():
    os.makedirs(OUT, exist_ok=True)
    frame(48, 16).save(os.path.join(OUT, 'frame.png'))
    frame(48, 16, hot=True).save(os.path.join(OUT, 'frame_hot.png'))
    frame(24, 8, gem=False, fill=(16, 9, 14, 236)).save(os.path.join(OUT, 'frame_thin.png'))
    for st in ('idle', 'hot', 'down'): button(24, 16, st).save(os.path.join(OUT, f'btn_{st}.png'))
    slot(16).save(os.path.join(OUT, 'slot.png')); slot(16, True).save(os.path.join(OUT, 'slot_hot.png'))
    divider(160).save(os.path.join(OUT, 'divider.png'))
    gem().save(os.path.join(OUT, 'gem.png')); gem(7, GOLD, GOLD_HI, (140, 96, 30, 255)).save(os.path.join(OUT, 'gem_gold.png'))
    bar(8, 6, RED).save(os.path.join(OUT, 'bar_red.png')); bar(8, 6, GOLD).save(os.path.join(OUT, 'bar_gold.png'))
    print('ui pieces in', OUT)

if __name__ == '__main__':
    main()
