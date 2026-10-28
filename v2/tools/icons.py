# The app icon (1024x1024, no transparency) and splash (2732x2732) from the game's own pixel art: Corvin
# from the waist up on the game's navy and gold, scaled up without smoothing. @capacitor/assets cuts every size from these.
# python3 v2/tools/icons.py
import json, os, math
from PIL import Image, ImageDraw
V2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(V2, 'app', 'assets')

def frame(set_name, clip, d, i=0):
    j = json.load(open(os.path.join(V2, 'assets', 'sprites', set_name + '.json')))
    fr = [f for f in j['anims'][clip][d] if f][i]
    pg, sx, sy, w, h, ox, oy = fr
    page = Image.open(os.path.join(V2, 'assets', 'sprites', j['pages'][pg])).convert('RGBA')
    cell = Image.new('RGBA', (128, 128)); cell.paste(page.crop((sx, sy, sx + w, sy + h)), (ox, oy))
    return cell
def fx(name, i):
    j = json.load(open(os.path.join(V2, 'assets', 'fx', 'fx.json'))); d = j['fx'][name]
    pg, sx, sy, w, h, ox, oy = d['frames'][i % len(d['frames'])]
    page = Image.open(os.path.join(V2, 'assets', 'fx', j['pages'][pg])).convert('RGBA')
    cell = Image.new('RGBA', (d['size'][0], d['size'][1]) if 'size' in d else (128, 128)); cell.paste(page.crop((sx, sy, sx + w, sy + h)), (ox, oy))
    return cell, d['anchor']

BG = (10, 13, 20)

def backdrop(size):
    # deep navy with a warm gold glow behind the hero's head, in 4-pixel steps like the game
    img = Image.new('RGBA', (size, size), BG + (255,)); px = img.load(); cx, cy = size * 0.5, size * 0.42
    for y in range(0, size, 4):
        for x in range(0, size, 4):
            d = math.hypot(x - cx, y - cy) / (size * 0.6); g = max(0.0, 1 - d) ** 1.6
            c = (int(10 + 120 * g + 18 * (y / size)), int(13 + 78 * g + 14 * (y / size)), int(20 + 30 * g + 30 * (y / size)), 255)
            for dy in range(4):
                for dx in range(4): px[x + dx, y + dy] = c
    return img

def bust(size, fill):
    # Corvin from the waist up, scaled by a whole number so every pixel stays square
    hero = frame('kael_sword', 'Idle3', 'SE'); hero = hero.crop(hero.getbbox())
    hero = hero.crop((0, 0, hero.width, int(hero.height * 0.5)))
    # centre on the head: the middle of the top rows that are drawn
    al = hero.split()[3]; xs = [x for y in range(6) for x in range(hero.width) if al.getpixel((x, y))]
    head = (min(xs) + max(xs)) / 2 if xs else hero.width / 2
    k = max(1, int(size * fill / hero.height)); hero = hero.resize((hero.width * k, hero.height * k), Image.NEAREST)
    return hero, head * k

def scene(size, transparent=False, fill=0.86):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0)) if transparent else backdrop(size)
    hero, head = bust(size, fill)
    img.alpha_composite(hero, (int(size / 2 - head), size - hero.height if not transparent else int(size * 0.5 - hero.height * 0.45)))
    return img

os.makedirs(OUT, exist_ok=True)
scene(1024).convert('RGB').save(os.path.join(OUT, 'icon-only.png'))
scene(1024, transparent=True, fill=0.5).save(os.path.join(OUT, 'icon-foreground.png'))   # Android's adaptive icon keeps the middle 66%
backdrop(1024).convert('RGB').save(os.path.join(OUT, 'icon-background.png'))
for name in ['splash.png', 'splash-dark.png']:
    big = Image.new('RGB', (2732, 2732), BG); big.paste(scene(1024).convert('RGB'), (854, 854)); big.save(os.path.join(OUT, name))
# the web icons (manifest and the game's own assets/icons)
ICONS = os.path.join(V2, 'assets', 'icons')
for n in [48, 72, 96, 128, 192, 256, 512]:
    scene(1024).convert('RGB').resize((n, n), Image.LANCZOS if n < 256 else Image.NEAREST).save(os.path.join(ICONS, f'icon-{n}.webp'), lossless=True)
print('icons written to', OUT, 'and', ICONS)
