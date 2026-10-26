# The app icon (1024x1024, no transparency) and splash (2732x2732) from the game's own pixel art: Corvin
# by a campfire at night, scaled up without smoothing. @capacitor/assets cuts every size from these.
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

def scene(size):
    img = Image.new('RGBA', (size, size), (16, 23, 15, 255))
    px = img.load(); fx_, fy_ = size * 0.68, size * 0.74
    for y in range(0, size, 4):
        for x in range(0, size, 4):
            d = math.hypot(x - fx_, (y - fy_) * 1.25) / (size * 0.62)
            g = max(0.0, 1 - d) ** 1.4
            c = (int(14 + 190 * g), int(20 + 105 * g), int(14 + 40 * g), 255)
            for dy in range(4):
                for dx in range(4): px[x + dx, y + dy] = c
    hero = frame('kael_sword', 'Idle', 'SE'); hero = hero.crop(hero.getbbox())
    k = int(size * 0.66 / hero.height); hero = hero.resize((hero.width * k, hero.height * k), Image.NEAREST)
    # firelight on the side facing the fire: an orange copy of the figure, masked to its own shape
    glow = Image.new('RGBA', hero.size, (255, 150, 60, 0)); a = hero.split()[3]
    glow.putalpha(a.point(lambda v: 70 if v else 0))
    hx, hy = int(size * 0.3 - hero.width / 2 + size * 0.06), int(size * 0.86 - hero.height)
    img.alpha_composite(hero, (hx, hy)); img.alpha_composite(glow, (hx, hy))
    fire, _ = fx('campfire', 2); fire = fire.crop(fire.getbbox())
    kf = int(size * 0.34 / fire.height); fire = fire.resize((fire.width * kf, fire.height * kf), Image.NEAREST)
    img.alpha_composite(fire, (int(fx_ - fire.width / 2), int(size * 0.9 - fire.height)))
    return img.convert('RGB')

os.makedirs(OUT, exist_ok=True)
scene(1024).save(os.path.join(OUT, 'icon-only.png'))
scene(1024).save(os.path.join(OUT, 'icon-foreground.png'))
Image.new('RGB', (1024, 1024), (16, 23, 15)).save(os.path.join(OUT, 'icon-background.png'))
for name in ['splash.png', 'splash-dark.png']:
    big = Image.new('RGB', (2732, 2732), (16, 23, 15)); big.paste(scene(1024), (854, 854)); big.save(os.path.join(OUT, name))
print('icons written to', OUT)
