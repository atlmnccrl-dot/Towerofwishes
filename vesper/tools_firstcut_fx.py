# THE BLEEDING MOON - the First Cut's effects pack (2026-11-11, the author: "create an animation and asset pack and
# change the cutscenes for the opening to work better with his model"). Pixel effects in the fx.json format, drawn
# with the forge's own helpers (tools_forge.py) and merged into the effect set by js/assets.js:
#   fc_crescent   the cut that wounded the moon: a long crescent of white-hot light, crimson at its edges, sweeping
#   fc_aura       crimson-black fire rising round him (a loop; drawn behind his feet)
#   fc_crown      small flames licking up from his crown and horns (a loop)
#   fc_glint      a glint running up his blade
#   fc_wind       ash and torn cloth streaming past on the wind (a loop)
#   fc_summon     a rune circle opening in the ground, red motes rising out of it (a loop)
#   fc_shock      a flat crimson shockwave ring for his landing (seen from the side)
# Writes assets/fx/fc_fx.json and fc_fx.png. Usage: python3 vesper/tools_firstcut_fx.py [preview.png]
import json, math, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import tools_forge as T

P, E, D = T.FXPAL['red'], T.FXPAL['ember'], T.FXPAL['dust']
INK = (24, 6, 12)
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets', 'fx'))

def crescent():
    out = []
    for i in range(10):
        f = T.frame(256, 96); k = i / 9; a1 = -2.9 + 2.5 * min(1, (i + 1) / 4); tail = max(-2.9, a1 - 2.2)
        if k < 0.95:
            T.band(f, 128, 300, 222, 236 - k * 8, P[2], 255 * (1 - k * 0.6), 1.0, tail, a1)
            T.band(f, 128, 300, 228, 236 - k * 5, P[4], 255 * (1 - k * 0.8), 1.0, max(tail, a1 - 1.2), a1)
            T.band(f, 128, 300, 232, 236, P[6], 255 * (1 - k), 1.0, max(tail, a1 - 0.6), a1)
        for j in range(10):   # sparks thrown off its leading edge
            a = a1 - j * 0.09; d = 236 + (j % 3) * 3 + k * 10; T.put(f, 128 + math.cos(a) * d, 300 + math.sin(a) * d, P[5] if j % 2 else P[3], 255 * (1 - k))
        out.append(f)
    return out, 20, False

def aura(seed):
    """Tongues of crimson-black fire licking up round him: each a tapered flame, dark outside, red, a hot core low down."""
    r = T.rng(seed); out = []; tongues = [(8 + r.random() * 48, r.random(), 0.7 + r.random() * 0.7, 24 + r.random() * 40) for _ in range(11)]
    for i in range(10):
        f = T.frame(64, 96); t = i / 10
        T.blob(f, 32, 90, 24, INK, 110, 0.22)
        for (x0, ph, sp, hmax) in tongues:
            q = (t * sp + ph) % 1; h = hmax * (0.55 + 0.45 * math.sin(q * math.pi)); base = 92; w0 = 4.5
            for yy in range(int(h)):
                u = yy / h; x = x0 + math.sin(u * 3 + q * 6.283 + ph * 9) * 3 * u; w = w0 * (1 - u) ** 0.8
                y = base - yy; a = 255 * (1 - u * 0.6)
                for dx in range(-int(w) - 1, int(w) + 2):
                    ad = abs(dx) / max(0.5, w)
                    if ad > 1.15: continue
                    col = INK if ad > 0.75 else P[2] if (ad > 0.35 or u > 0.45) else P[4] if u > 0.15 else P[5]
                    T.put(f, x + dx, y, col, a)
        out.append(f)
    return out, 12, True

def crown(seed):
    r = T.rng(seed); out = []; ps = [(r.random() * 16 + 4, r.random()) for _ in range(8)]
    for i in range(6):
        f = T.frame(24, 28); t = i / 6
        for (x0, ph) in ps:
            q = (t + ph) % 1; y = 26 - q * 22; x = x0 + math.sin(q * 9 + ph * 7) * 1.5
            T.put(f, x, y, P[3] if q < 0.5 else P[2], 255 * (1 - q)); T.put(f, x, y + 1, P[5] if q < 0.3 else P[3], 220 * (1 - q))
        out.append(f)
    return out, 12, True

def glint():
    out = []
    for i in range(8):
        f = T.frame(16, 72); k = i / 7; y = 66 - 60 * k
        for dy in range(-6, 7):
            a = 255 * (1 - abs(dy) / 7) * (1 - max(0, k - 0.8) * 5)
            T.put(f, 8, y + dy, P[6] if abs(dy) < 2 else P[5], a)
        T.blob(f, 8, y, 3, P[6], 255 * (1 - k * 0.5)); T.put(f, 4, y, P[5], 200); T.put(f, 12, y, P[5], 200)
        out.append(f)
    return out, 16, False

def wind(seed):
    r = T.rng(seed); out = []; ps = [(r.random() * 48, r.random(), r.random()) for _ in range(22)]
    for i in range(12):
        f = T.frame(128, 48); t = i / 12
        for (y0, ph, kind) in ps:
            q = (t + ph) % 1; x = q * 140 - 6; y = y0 + math.sin(q * 6 + ph * 5) * 3
            if kind < 0.3:   # a torn scrap of his cape
                T.put(f, x, y, (112, 10, 28)); T.put(f, x + 1, y, (178, 28, 48)); T.put(f, x - 1, y + 1, (62, 4, 16))
            elif kind < 0.7: T.put(f, x, y, D[2], 200); T.put(f, x - 1, y, D[1], 150)
            else: T.put(f, x, y, E[3], 230 * (1 - q)); T.put(f, x - 1, y, E[2], 160 * (1 - q))
        out.append(f)
    return out, 16, True

def summon(seed):
    r = T.rng(seed); out = []; motes = [(r.random() * 6.283, r.random(), r.random()) for _ in range(20)]
    for i in range(10):
        f = T.frame(96, 64); t = i / 10; cx, cy = 48, 52
        T.band(f, cx, cy, 30, 33, P[2], 200, 0.32); T.band(f, cx, cy, 20, 22, P[3], 220, 0.32)
        for j in range(8):   # runes turning round the ring
            a = j / 8 * 6.283 + t * 0.8; x, y = cx + math.cos(a) * 26, cy + math.sin(a) * 26 * 0.32
            T.put(f, x, y, P[5]); T.put(f, x + 1, y, P[4]); T.put(f, x, y - 1, P[4])
        T.blob(f, cx, cy, 18, P[1], 120, 0.32)
        for (a, ph, sp) in motes:
            q = (t + ph) % 1; rr = 10 + 18 * sp; x = cx + math.cos(a) * rr; y = cy + math.sin(a) * rr * 0.32 - q * 46
            T.put(f, x, y, P[4] if q < 0.5 else P[3], 255 * (1 - q))
        out.append(f)
    return out, 12, True

def shock():
    out = []
    for i in range(9):
        f = T.frame(192, 64); k = i / 8; rr = 10 + 84 * (1 - (1 - k) ** 2); w = 8 * (1 - k) + 2
        T.band(f, 96, 40, rr - w, rr, P[2], 255 * (1 - k * 0.8), 0.3); T.band(f, 96, 40, rr - w * 0.4, rr, P[5], 255 * (1 - k), 0.3)
        if i < 3: T.blob(f, 96, 40, 18 - i * 4, P[6], 255, 0.3)
        out.append(f)
    return out, 18, False

def build(preview=None):
    makers = {'fc_crescent': crescent(), 'fc_aura': aura(31), 'fc_crown': crown(32), 'fc_glint': glint(), 'fc_wind': wind(33), 'fc_summon': summon(34), 'fc_shock': shock()}
    bottom = {'fc_aura', 'fc_crown', 'fc_summon'}
    items, meta = [], {}
    for name, (frames, fps, loop) in makers.items():
        h, w = frames[0].shape[:2]; meta[name] = {'fps': fps, 'loop': loop, 'size': [w, h], 'anchor': [w // 2, h - 4] if name in bottom else [w // 2, h // 2]}
        for i, f in enumerate(frames):
            im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), 'RGBA'); bb = im.getbbox() or (0, 0, 1, 1)
            items.append((f'{name}/{i}', im.crop(bb), (bb[0], bb[1])))
    page, place = T.pack(items, 1024)
    page.save(OUT + '/fc_fx.png', optimize=True)
    fx = {}
    for name, m in meta.items():
        n = len([k for k in place if k.startswith(name + '/')])
        m['frames'] = [[0] + list(place[f'{name}/{i}'][:6]) for i in range(n)]; fx[name] = m
    json.dump({'pages': ['fc_fx.png'], 'fx': fx}, open(OUT + '/fc_fx.json', 'w'))
    print('fc fx:', list(fx), 'page', page.size)
    if preview:
        sheet = Image.new('RGBA', (1300, 120 * len(makers)), (38, 22, 30, 255)); y = 6
        for name, (frames, fps, loop) in makers.items():
            x = 6
            for f in frames[:8]:
                im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), 'RGBA')
                if im.width > 160: im = im.resize((im.width // 2, im.height // 2))
                sheet.alpha_composite(im, (x, y)); x += im.width + 4
            y += 110
        sheet.save(preview)

if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else None)
