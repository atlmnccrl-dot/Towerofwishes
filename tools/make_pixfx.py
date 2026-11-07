"""The game's own pixel effects -> assets/fx/tow_0.png + assets/fx/tow.json

    python3 tools/make_pixfx.py [--sheet preview.png]

Drawn here, pixel by pixel, in small fixed palettes at the creator cast's scale (a 1.6 m figure
is 44 px, so 1 m is about 27.5 px). No smoothing, no blur: hard edges and ordered dithering.
js/render/pixelfx.js loads tow.json next to the packed fx.json (same frame format:
[page, x, y, w, h, ox, oy]).

Calamity's two area attacks (EFFECTS_LIST.md: "Skyfire mark + impact", "Moving Ocean mark + impact"):
  skyfire_mark, ocean_mark      the warning circle on the floor (loop 4), drawn flattened
  skyfire_fill, ocean_fill      the fill that grows over the wind-up (1 frame, scaled by the game)
  skyfire_gather, ocean_gather  the knot of flame / slab of water gathering overhead (loop 6)
  skyfire_impact, ocean_impact  the fall and the burst (10 frames)
"""
import json, math, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fx')

def hexc(h):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)

INK = hexc('#0c0808')
FIRE = [hexc(c) for c in ('#2a0a08', '#7a1410', '#c8321a', '#f2701e', '#ffb43a', '#ffe68a', '#fffbe6')]
WATER = [hexc(c) for c in ('#081a2c', '#163f66', '#2a6fa6', '#4fa6d8', '#9adcf4', '#e6f8ff', '#ffffff')]
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


def noise(w, h, scale, seed, octaves=3, ox=0.0, oy=0.0, rot=0.0):
    """Value noise (fbm), sampled on a grid that can be shifted and rotated per frame."""
    rng = np.random.RandomState(seed)
    tot = np.zeros((h, w)); amp, norm = 1.0, 0.0
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    cx, cy = w / 2, h / 2
    ca, sa = math.cos(rot), math.sin(rot)
    X = (xx - cx) * ca - (yy - cy) * sa + cx + ox
    Y = (xx - cx) * sa + (yy - cy) * ca + cy + oy
    for o in range(octaves):
        g = rng.rand(64, 64)
        s = scale / (2 ** o)
        u, v = X / s, Y / s
        i0, j0 = np.floor(u).astype(int), np.floor(v).astype(int)
        fu, fv = u - i0, v - j0
        fu, fv = fu * fu * (3 - 2 * fu), fv * fv * (3 - 2 * fv)
        a = g[j0 % 64, i0 % 64]; b = g[j0 % 64, (i0 + 1) % 64]
        c = g[(j0 + 1) % 64, i0 % 64]; d = g[(j0 + 1) % 64, (i0 + 1) % 64]
        tot += amp * ((a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv)
        norm += amp; amp *= 0.5
    return tot / norm


def quant(val, mask, levels):
    """Values 0..1 -> palette index 1..levels with ordered dithering; 0 where mask is off."""
    h, w = val.shape
    th = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w]
    idx = np.clip(np.floor(val * levels + th - 0.5).astype(int) + 1, 1, levels)
    return np.where(mask, idx, 0)


def to_img(idx, pal, ink_outline=False):
    h, w = idx.shape
    im = np.zeros((h, w, 4), np.uint8)
    for i, c in enumerate(pal, start=1):
        im[idx == i] = c
    if ink_outline:
        op = idx > 0
        edge = np.zeros_like(op)
        edge[1:, :] |= op[:-1, :]; edge[:-1, :] |= op[1:, :]; edge[:, 1:] |= op[:, :-1]; edge[:, :-1] |= op[:, 1:]
        edge &= ~op
        im[edge] = INK
    return Image.fromarray(im, 'RGBA')


def polar(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    dx, dy = xx - (w - 1) / 2, yy - (h - 1) / 2
    return np.hypot(dx, dy), (np.degrees(np.arctan2(dy, dx)) + 360) % 360, xx, yy


# ---------------------------------------------------------------- the marks
def mark(kind, f):
    S = 128
    r, a, xx, yy = polar(S, S)
    pal = FIRE if kind == 'fire' else WATER
    idx = np.zeros((S, S), int)
    hot = 6 if f % 2 == 0 else 5
    idx[(r >= 61) & (r < 62.6)] = 1
    idx[(r >= 58) & (r < 61)] = hot
    idx[(r >= 56.6) & (r < 58)] = 4
    # twelve ticks turning with the loop (30 degrees apart, 7.5 per frame: seamless)
    rot = f * 7.5 if kind == 'fire' else -f * 7.5
    am = (a - rot) % 30
    tick = ((am < 3.2) | (am > 26.8)) & (r >= 47) & (r < 55)
    idx[tick] = hot
    # short runes between the ticks
    rune = (np.abs(am - 15) < 5) & (r >= 50) & (r < 52)
    idx[rune] = 3
    # an inner dashed ring turning the other way
    am2 = (a + rot * 0.66) % 20
    idx[(am2 < 10) & (r >= 39.5) & (r < 42)] = 4
    # the sigil in the centre
    x, y = xx - 63.5, yy - 63.5
    if kind == 'fire':
        # a flame: a teardrop with a notch, pointing up
        tear = (x / 11) ** 2 + ((y - 4) / 13) ** 2 < 1
        top = (np.abs(x) < (1 - (-(y + 1) / 18)) * 10) & (y < 0) & (y > -19)
        flame = (tear | top)
        inner = ((x / 5) ** 2 + ((y - 6) / 7) ** 2 < 1)
        idx[flame] = 4; idx[inner] = hot
    else:
        for k, oy in enumerate((-8, 0, 8)):
            wave = (np.abs(y - oy - 3 * np.sin((x + f * 2 + k * 3) / 3.2)) < 1.4) & (np.abs(x) < 16 - abs(oy) * 0.5)
            idx[wave] = hot if k == 1 else 4
    return to_img(idx, pal, ink_outline=True)


def fill(kind):
    S = 128
    r, a, xx, yy = polar(S, S)
    pal = FIRE if kind == 'fire' else WATER
    th = np.tile(BAYER, (S // 4, S // 4))
    idx = np.zeros((S, S), int)
    disc = r < 57
    idx[disc & (th < 0.3)] = 3
    idx[disc & (((xx + yy) % 7) < 1)] = 4
    idx[(r >= 53) & (r < 57) & (th < 0.6)] = 4
    return to_img(idx, pal)


# ---------------------------------------------------------------- overhead
def gather(kind, f):
    if kind == 'fire':
        W = H = 64
        r, a, xx, yy = polar(W, H)
        n = noise(W, H, 9, 7, 3, rot=f * (math.pi * 2 / 6) / 3, ox=f * 1.5)
        # tongues of flame licking outward: radius wobbles with angle and time
        edge = 22 + 6 * np.sin(np.radians(a) * 5 + f * math.tau / 6) + 5 * (n - 0.5) * 2
        mask = r < edge
        heat = np.clip(1.15 - r / edge * 0.9 + (n - 0.5) * 0.5, 0, 1)
        return to_img(quant(heat, mask, 7), FIRE, ink_outline=True)
    W, H = 112, 56
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    n = noise(W, H, 10, 11, 3, ox=f * 3)
    top = 14 + 4 * np.sin(xx / 7 + f * math.tau / 6) + 2 * np.sin(xx / 3.1 - f * math.tau / 6)
    bot = 40 + 3 * np.sin(xx / 9 - f * math.tau / 6)
    side = (xx > 6) & (xx < W - 7)
    body = side & (yy > top) & (yy < bot)
    # drips under the slab
    drip = np.zeros_like(body)
    for i, dx in enumerate(range(12, W - 10, 13)):
        ln = 4 + ((i * 7 + f * 3) % 9)
        drip |= (np.abs(xx - dx - (i % 3)) < 1.2) & (yy >= bot - 1) & (yy < bot + ln)
    depth = np.clip((yy - top) / (bot - top), 0, 1)
    val = np.clip(0.85 - depth * 0.7 + (n - 0.5) * 0.45, 0, 1)
    idx = quant(val, body | drip, 6)
    foam = side & (np.abs(yy - top) < 1.6)
    idx[foam] = 7
    idx[drip & ~body] = 5
    return to_img(idx, WATER, ink_outline=True)


# ---------------------------------------------------------------- impacts
def skyfire_impact(f):
    W, H, G = 112, 176, 166  # G: the ground row
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    x = xx - W / 2
    rng = np.random.RandomState(40 + f)
    heat = np.zeros((H, W)); mask = np.zeros((H, W), bool)
    if f <= 1:
        # the fall: a meteor of fire coming straight down onto the mark
        hy = 46 + f * 62
        head = np.hypot(x, (yy - hy) * 0.9) < 10
        n = noise(W, H, 6, 3 + f, 2, oy=-f * 20)
        tail_w = 9 * np.clip(1 - (hy - yy) / 120, 0, 1)
        tail = (yy < hy) & (np.abs(x + (n - 0.5) * 6) < tail_w)
        mask = head | tail
        heat = np.where(head, 1.0, np.clip(0.95 - (hy - yy) / 130 + (n - 0.5) * 0.4, 0, 1))
    else:
        k = (f - 2) / 7.0  # 0 at the flash, 1 at the end
        n = noise(W, H, 8, 21, 3, oy=f * 9)
        hgt = G - yy
        top = 30 + 120 * min(1, k * 1.6)
        # the plume: wide at the floor, a rounded head that rises and spreads
        width = 18 + 30 * k + 10 * np.sin(np.clip(hgt / top, 0, 1) * math.pi) * (1 - k * 0.3)
        head_y = G - top * 0.82
        headr = 14 + 22 * k
        plume = (hgt > -4) & (hgt < top) & (np.abs(x) < width * np.clip(1 - hgt / (top * 1.25), 0.25, 1) + (n - 0.5) * 14)
        cap = np.hypot(x, (yy - head_y) * 1.2) < headr + (n - 0.5) * 12
        ring = (np.abs(yy - G) < 3 + 2 * k) & (np.abs(x) < 26 + 34 * k + (n - 0.5) * 8)
        mask = plume | cap | ring
        age = k * 0.85 + (hgt / 200) * 0.6
        heat = np.clip(1.15 - age + (n - 0.5) * 0.55 - np.abs(x) / 160, 0, 1)
        # the smoke breaks up as it ages: holes open from the cool edges inward
        if k > 0.45:
            n2 = noise(W, H, 5, 61 + f, 2, oy=f * 6)
            mask &= ~((n2 + heat * 0.6) < (k - 0.45) * 1.9)
        if f == 2:  # the flash: white-hot at the floor
            core = np.hypot(x, (yy - G) * 1.6) < 30
            mask |= core; heat = np.where(core, 1.0, heat)
        # embers thrown out
        for i in range(26):
            ang = rng.uniform(-math.pi, 0); v = rng.uniform(30, 80)
            ex = W / 2 + math.cos(ang) * v * k * 1.3
            ey = G - 20 + math.sin(ang) * v * k * 1.2 + 60 * k * k
            if 0 <= ex < W - 1 and 0 <= ey < H - 1:
                mask[int(ey), int(ex)] = True; heat[int(ey), int(ex)] = 0.8
                mask[int(ey), int(ex) + 1] = True; heat[int(ey), int(ex) + 1] = 0.6
    return to_img(quant(heat, mask, 7), FIRE)


def ocean_impact(f):
    W, H, G = 144, 176, 148
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    x = xx - W / 2
    rng = np.random.RandomState(70 + f)
    idx = np.zeros((H, W), int)
    if f <= 1:
        # the slab coming down
        bot = 70 + f * 52
        n = noise(W, H, 9, 5 + f, 3, oy=-f * 18)
        body = (np.abs(x) < 54 + (n - 0.5) * 6) & (yy < bot + 3 * np.sin(xx / 5)) & (yy > bot - 70)
        depth = np.clip((bot - yy) / 70, 0, 1)
        idx = quant(np.clip(0.9 - depth * 0.6 + (n - 0.5) * 0.4, 0, 1), body, 6)
        foam = (np.abs(x) < 54) & (np.abs(yy - bot - 3 * np.sin(xx / 5)) < 2)
        idx[foam] = 7
        streak = body & ((xx.astype(int) % 9) == 0) & (yy > bot - 50)
        idx[streak] = 5
    else:
        k = (f - 2) / 7.0
        n = noise(W, H, 7, 31, 3, ox=f * 5)
        # foam spreading on the floor
        rx, ry = 40 + 30 * k, (40 + 30 * k) * 0.32
        e = (x / rx) ** 2 + ((yy - G) / ry) ** 2
        floor = e < 1
        val = np.clip(0.95 - e * 0.5 - k * 0.5 + (n - 0.5) * 0.4, 0, 1)
        idx = quant(val, floor & (val > 0.25), 6)
        # the crown: spikes of water thrown up round the rim, peaking then falling back
        lift = math.sin(min(1, k * 1.5) * math.pi)
        for i in range(16):
            ang = i / 16 * math.tau + 0.2
            bx = W / 2 + math.cos(ang) * rx * 0.95
            by = G + math.sin(ang) * ry * 0.95
            hgt = (26 + (i * 7 % 5) * 7) * lift
            if hgt < 2:
                continue
            rise = np.clip((by - yy) / hgt, 0, 1)
            spike = (yy <= by) & (yy > by - hgt) & (np.abs(xx - bx - math.cos(ang) * (by - yy) * 0.25) < 5 * (1 - rise * 0.75))
            # a bead of water on top of each jet
            tip = np.hypot(xx - bx - math.cos(ang) * hgt * 0.25, yy - (by - hgt)) < 2.6
            spike |= tip
            back = math.sin(ang) < 0  # the far side reads darker
            idx[spike] = 4 if back else 6
            idx[spike & (np.abs(xx - bx) < 1)] = 7
        # droplets
        for i in range(34):
            ang = rng.uniform(-math.pi, 0); v = rng.uniform(25, 70)
            dx = W / 2 + math.cos(ang) * v * (0.4 + k)
            dy = G - 10 + math.sin(ang) * v * k * 1.4 + 70 * k * k
            if 1 <= dx < W - 2 and 1 <= dy < H - 2:
                idx[int(dy):int(dy) + 2, int(dx):int(dx) + 2] = 6 if i % 3 else 7
        if f == 2:
            core = (x / 56) ** 2 + ((yy - G + 6) / 16) ** 2 < 1
            idx[core] = 7
    return to_img(idx, WATER, ink_outline=f <= 1)


# ---------------------------------------------------------------- pack
EFFECTS = [
    # name, frames(fn), fps, loop, anchor (x, y) in the cell
    ('skyfire_mark', [lambda f=f: mark('fire', f) for f in range(4)], 8, True, None),
    ('ocean_mark', [lambda f=f: mark('water', f) for f in range(4)], 8, True, None),
    ('skyfire_fill', [lambda: fill('fire')], 1, True, None),
    ('ocean_fill', [lambda: fill('water')], 1, True, None),
    ('skyfire_gather', [lambda f=f: gather('fire', f) for f in range(6)], 12, True, None),
    ('ocean_gather', [lambda f=f: gather('water', f) for f in range(6)], 10, True, None),
    ('skyfire_impact', [lambda f=f: skyfire_impact(f) for f in range(10)], 16, False, (56, 166)),
    ('ocean_impact', [lambda f=f: ocean_impact(f) for f in range(10)], 16, False, (72, 148)),
]


def main():
    frames = []
    for name, fns, fps, loop, anchor in EFFECTS:
        ims = [fn() for fn in fns]
        frames.append((name, ims, fps, loop, anchor))
    # shelf packing, one page
    PW, x, y, rowh, placed = 1024, 0, 0, 0, []
    for name, ims, fps, loop, anchor in frames:
        for im in ims:
            w, h = im.size
            if x + w > PW:
                x, y, rowh = 0, y + rowh + 1, 0
            placed.append((name, im, x, y))
            x += w + 1; rowh = max(rowh, h)
    page = Image.new('RGBA', (PW, y + rowh), (0, 0, 0, 0))
    meta = {'pages': ['tow_0.png'], 'fx': {}}
    for name, ims, fps, loop, anchor in frames:
        w, h = ims[0].size
        meta['fx'][name] = {'fps': fps, 'loop': loop, 'size': [w, h], 'anchor': list(anchor or (w // 2, h // 2)), 'frames': []}
    for name, im, px, py in placed:
        page.alpha_composite(im, (px, py))
        w, h = im.size
        meta['fx'][name]['frames'].append([0, px, py, w, h, 0, 0])
    os.makedirs(OUT, exist_ok=True)
    page.save(os.path.join(OUT, 'tow_0.png'), optimize=True)
    json.dump(meta, open(os.path.join(OUT, 'tow.json'), 'w'), separators=(',', ':'))
    print('page', page.size, 'effects', len(frames))
    if '--sheet' in sys.argv:
        out = sys.argv[sys.argv.index('--sheet') + 1]
        bg = Image.new('RGBA', page.size, (40, 44, 52, 255))
        bg.alpha_composite(page)
        bg.resize((page.size[0] * 2, page.size[1] * 2), Image.NEAREST).save(out)


if __name__ == '__main__':
    main()
