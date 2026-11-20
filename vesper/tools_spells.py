# THE BLEEDING MOON - the spell forge: every attack, ability and spell effect, drawn in code (no outside art).
# Lightning, fireballs, meteors, shadow, frost, arcane, poison, holy light, earth, blood slashes, impacts,
# ground zones, casting runes. Each effect is a field of energy per frame, quantised onto a short colour ramp
# with an ordered dither, at the characters' own pixel size (a hero is about 42 px tall), so the effects
# share their pixel grid.
# Writes assets/spell/spell_<n>.png + assets/spell/spell.json. js/assets.js plays them in place of the
# old packs (A.SPELLMAP routes the old effect names here).
# Usage: python3 vesper/tools_spells.py [preview.png]
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = ROOT + '/assets/spell'
PITCH = 0.5          # the fight camera's ground squash (view.js HELI.pitch)

# ---- colour ---------------------------------------------------------------------------------------------
def hexc(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def ramp(*cols): return np.array([hexc(c) for c in cols], np.uint8)
FIRE = ramp('#5a0f12', '#a3201a', '#e0461c', '#ff8a24', '#ffd23f', '#fff6c8')
FIRE2 = ramp('#b8281a', '#f05a1c', '#ff9426', '#ffc83c', '#fff0a8', '#ffffff')
SMOKE2 = ramp('#4a4248', '#655a60', '#83777b', '#a69a9c')
SHADOW2 = ramp('#1c0a26', '#3a1250', '#621c70', '#9a2a78', '#e04a86', '#ffb0c8')
SMOKE = ramp('#151017', '#251d25', '#3a3039', '#544850', '#6e6168')
FROST = ramp('#12305a', '#1f5f9a', '#3fa0d8', '#86dcf5', '#d4f6ff', '#ffffff')
STORM = ramp('#3a2378', '#6248c8', '#8fb4ff', '#d6e8ff', '#ffffff')
ARCANE = ramp('#2c0f4a', '#5c1f8e', '#9a3fd0', '#d27aff', '#f4c8ff', '#ffffff')
SHADOW = ramp('#07030a', '#170a20', '#2c1236', '#4a1640', '#8e1a38', '#e02a48', '#ff7a88')
POISON = ramp('#0f2a12', '#1f5a1c', '#3f9a26', '#86d83a', '#d6ff7a', '#f4ffd0')
HOLY = ramp('#6a420c', '#b07a1a', '#e8b030', '#ffe07a', '#fff8d8', '#ffffff')
BLOOD = ramp('#3a0408', '#7a0a14', '#c01628', '#ff3048', '#ff9aa8', '#ffffff')
EARTH = ramp('#22160e', '#3e2a1a', '#644428', '#8e6a40', '#b8935e', '#dcc08e')
HIT = ramp('#7a1020', '#ff3048', '#ffc0b8', '#ffffff')
WIND = ramp('#5a6a8a', '#9aaccc', '#d8e4f6', '#ffffff')
STEEL = ramp('#2a2630', '#5a5462', '#9a94a2', '#d6d2dc', '#ffffff')
WOOD = ramp('#3a2414', '#6a4424', '#9a6a3a')
HEAL = ramp('#145a2a', '#2a9a48', '#5ad86a', '#b0ff9a', '#f0ffe0')

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.5

def paint(val, pal, lo=0.12, dither=0.3):
    """Energy 0..1 to RGBA: transparent below lo, then the ramp in bands with an ordered dither."""
    h, w = val.shape; b = BAYER[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4]
    v = (val - lo) / (1 - lo); n = len(pal)
    idx = np.floor(v * n + b * dither)
    on = (val + b * dither * (1 - lo) / n) > lo
    idx = np.clip(idx, 0, n - 1).astype(int)
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = pal[idx]; out[..., 3] = np.where(on, 255, 0)
    return out

def over(a, b):
    """b drawn over a (both opaque-or-clear pixel art)."""
    m = b[..., 3:4] > 0; return np.where(m, b, a)

def dissolve(img, k, seed=0):
    """Fade out as a whole (k 0 = solid, 1 = gone): a clean fade, no scattered pixels."""
    if k <= 0: return img
    out = img.copy(); out[..., 3] = (out[..., 3].astype(np.float32) * max(0.0, 1 - k)).astype(np.uint8); return out

# ---- fields ---------------------------------------------------------------------------------------------
def grid(w, h): y, x = np.mgrid[0:h, 0:w]; return x + 0.5, y + 0.5

def vnoise(w, h, cell, seed, ox=0.0, oy=0.0):
    """Smooth value noise, cell px per lattice step, offset (ox, oy) in px (scrolls between frames)."""
    r = np.random.default_rng(seed); gw, gh = int((w + abs(ox)) / cell) + 3, int((h + abs(oy)) / cell) + 3
    g = r.random((gh, gw)); x, y = grid(w, h)
    fx = (x + ox) / cell % (gw - 1); fy = (y + oy) / cell % (gh - 1)
    i, j = fx.astype(int), fy.astype(int); u, v = fx - i, fy - j; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v)
    a, b, c, d = g[j, i], g[j, i + 1], g[j + 1, i], g[j + 1, i + 1]
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v

def fbm(w, h, cell, seed, ox=0.0, oy=0.0, oct=3):
    t = 0; s = 0; a = 1
    for o in range(oct): s += vnoise(w, h, cell / 2 ** o, seed + o * 17, ox * 2 ** o / 2 ** o, oy) * a; t += a; a *= 0.5
    return s / t

def seg_dist(x, y, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0; L = dx * dx + dy * dy or 1e-9
    t = np.clip(((x - x0) * dx + (y - y0) * dy) / L, 0, 1)
    return np.hypot(x - (x0 + t * dx), y - (y0 + t * dy))

def poly_dist(x, y, pts):
    d = np.full(x.shape, 1e9)
    for (a, b) in zip(pts[:-1], pts[1:]): d = np.minimum(d, seg_dist(x, y, a[0], a[1], b[0], b[1]))
    return d

def bolt_path(r, x0, y0, x1, y1, rough, n=5):
    pts = [(x0, y0), (x1, y1)]
    for k in range(n):
        q = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; L = math.hypot(b[0] - a[0], b[1] - a[1])
            nx, ny = -(b[1] - a[1]) / (L or 1), (b[0] - a[0]) / (L or 1); o = (r.random() - 0.5) * L * rough
            q += [(mx + nx * o, my + ny * o), b]
        pts = q
    return pts

def mask_poly(w, h, polys, val=1.0):
    im = Image.new('L', (w, h), 0); d = ImageDraw.Draw(im)
    for p in polys: d.polygon([(float(a), float(b)) for a, b in p], fill=int(255 * val))
    return np.asarray(im, np.float32) / 255

def ell(x, y, cx, cy, rx, ry): return np.hypot((x - cx) / max(rx, 1e-6), (y - cy) / max(ry, 1e-6))

def sq(img, x, y, s, col):
    """A hard square particle (s px) of colour col into an RGBA frame."""
    h, w = img.shape[:2]; x0, y0 = int(round(x - s / 2)), int(round(y - s / 2))
    x1, y1 = max(0, x0), max(0, y0); x2, y2 = min(w, x0 + max(1, int(s))), min(h, y0 + max(1, int(s)))
    if x2 > x1 and y2 > y1: img[y1:y2, x1:x2, :3] = col; img[y1:y2, x1:x2, 3] = 255

def blank(w, h): return np.zeros((h, w, 4), np.uint8)

# ---- the effects --------------------------------------------------------------------------------------------
FX = {}
def fx(name, fps, anchor, loop=False):
    def reg(fn):
        FX[name] = dict(fn=fn, fps=fps, anchor=anchor, loop=loop); return fn
    return reg

# ===== projectiles (they point along +x; the game turns them to their flight) =====
def fireball(W, H, n, pal, seed, core_r, tail):
    out = []
    x, y = grid(W, H); cx, cy = W - core_r - 2, H / 2
    for f in range(n):
        nz = fbm(W, H, 5, seed, ox=f * 4.0)
        dx = cx - x; along = np.clip(dx / tail, 0, 1)
        width = core_r * (1 - along * 0.75) + 0.5
        tailv = np.exp(-((y - cy - np.sin(f + x * 0.4) * 0.6) / width) ** 2) * (1 - along) ** 1.2 * (dx > 0)
        core = np.clip(1.25 - np.hypot(x - cx, y - cy) / (core_r + 0.6 * math.sin(f * 1.7)), 0, 1)
        v = np.maximum(core * 1.05, tailv * (0.55 + 0.6 * nz))
        out.append(paint(np.clip(v, 0, 1), pal, lo=0.16))
    return out

@fx('s_fireball', 14, (17, 8), loop=True)
def _(): return fireball(24, 16, 6, FIRE, 11, 4.2, 18)
@fx('s_fireball_big', 14, (27, 12), loop=True)
def _(): return fireball(36, 24, 6, FIRE, 12, 6.5, 28)
@fx('s_arcane_bolt', 14, (17, 8), loop=True)
def _(): return fireball(24, 16, 6, ARCANE, 13, 4.0, 18)
@fx('s_poison_bolt', 14, (17, 8), loop=True)
def _(): return fireball(24, 16, 6, POISON, 14, 3.6, 16)

@fx('s_shadow_bolt', 14, (19, 9), loop=True)
def _():
    out = []; W, H = 28, 18; x, y = grid(W, H); cx, cy = 20, 9
    for f in range(6):
        nz = fbm(W, H, 4, 21, ox=f * 3.5, oy=f * 0.7)
        dx = cx - x; along = np.clip(dx / 20, 0, 1)
        smoke = np.exp(-((y - cy) / (5 * (1 - along * 0.5) + 1)) ** 2) * (1 - along) * (dx > -2) * (0.4 + 0.7 * nz)
        d = np.hypot(x - cx, y - cy); core = np.clip(1.2 - d / 5.2, 0, 1)
        rim = np.exp(-((d - 4.6) / 1.1) ** 2) * (0.75 + 0.25 * np.cos(np.arctan2(y - cy, x - cx) * 3 + f))
        v = np.maximum(smoke * 0.55, core * 0.34); v = np.maximum(v, rim * 0.95)
        out.append(paint(np.clip(v, 0, 1), SHADOW, lo=0.1))
    return out

@fx('s_frost_shard', 14, (14, 6), loop=True)
def _():
    out = []; W, H = 22, 12; x, y = grid(W, H)
    for f in range(6):
        body = mask_poly(W, H, [[(19, 6), (11, 2.5), (5, 6), (11, 9.5)]])
        edge = mask_poly(W, H, [[(19, 6), (11, 2.5), (12, 6)]])
        trail = np.exp(-((y - 6) / 1.4) ** 2) * np.clip((9 - x) / 9, 0, 1) * (x < 9) * (0.4 + 0.6 * vnoise(W, H, 2.5, 31, ox=f * 3))
        v = np.maximum(body * 0.62, edge * 0.92); v = np.maximum(v, trail * 0.55)
        img = paint(v, FROST, lo=0.14)
        r = np.random.default_rng(f + 40)
        for k in range(3): sq(img, r.uniform(0, 8), 6 + r.uniform(-4, 4), 1, FROST[5])
        out.append(img)
    return out

@fx('s_ice_lance', 14, (20, 5), loop=True)
def _():
    """A long lance of ice falling point-first (points along +x)."""
    out = []; W, H = 28, 10; x, y = grid(W, H)
    for f in range(4):
        body = mask_poly(W, H, [[(27, 5), (14, 1.5), (2, 5), (14, 8.5)]])
        hi = mask_poly(W, H, [[(27, 5), (14, 1.5), (16, 5)]])
        img = paint(np.maximum(body * 0.6, hi * 0.95), FROST, lo=0.14)
        r = np.random.default_rng(f + 50)
        for k in range(4): sq(img, r.uniform(0, 6), 5 + r.uniform(-3, 3), 1, FROST[4])
        out.append(img)
    return out

@fx('s_spark_bolt', 16, (13, 5), loop=True)
def _():
    out = []; W, H = 18, 10; x, y = grid(W, H)
    for f in range(4):
        d = np.hypot((x - 13) / 1.0, (y - 5) / 1.0); core = np.clip(1.3 - d / 3, 0, 1)
        tail = np.exp(-((y - 5) / 1.2) ** 2) * np.clip((13 - x) / 13, 0, 1) * (x < 13) * (0.6 + 0.4 * np.sin(x * 1.3 + f * 2))
        out.append(paint(np.maximum(core, tail * 0.7), ARCANE, lo=0.15))
    return out

@fx('s_arcane_orb', 14, (9, 9), loop=True)
def _():
    out = []; W = H = 18; x, y = grid(W, H)
    for f in range(8):
        d = np.hypot(x - 9, y - 9); core = np.clip(1.15 - d / 5, 0, 1) * (0.85 + 0.15 * math.sin(f))
        img = paint(core, ARCANE, lo=0.12)
        for k in range(3):
            a = f / 8 * math.tau + k * math.tau / 3; sq(img, 9 + math.cos(a) * 7, 9 + math.sin(a) * 3.5, 2, ARCANE[4])
        out.append(img)
    return out

@fx('s_wind', 14, (14, 9), loop=True)
def _():
    out = []; W, H = 26, 18; x, y = grid(W, H)
    for f in range(6):
        v = np.zeros((H, W))
        for k, (r0, off) in enumerate([(9, 0), (7, -4), (6, 4)]):
            cx = 10 + k * 2 - (f % 3); d = np.hypot((x - cx) / 1.0, (y - 9 - off * 0.2) / 1.6)
            arc = np.exp(-((d - r0) / 0.9) ** 2) * (x > cx) * np.clip(1 - np.abs(y - 9) / (r0 * 1.4), 0, 1)
            v = np.maximum(v, arc * (0.95 - k * 0.2))
        out.append(paint(v, WIND, lo=0.25))
    return out

@fx('s_moon_wave', 14, (22, 22), loop=True)
def _():
    """The crescent wave: a blood-red moon blade flung forward, white along its cutting edge."""
    out = []; W = H = 44; x, y = grid(W, H)
    for f in range(4):
        d1 = np.hypot(x - 16, y - 22); d2 = np.hypot(x - 10, y - 22)
        cres = (d1 < 16) & (d2 > 15.5) & (x > 12)
        edge = np.exp(-((d1 - 15) / 1.2) ** 2) * (x > 14)
        tips = np.clip(1 - np.abs(y - 22) / 16, 0, 1)
        v = cres * (0.45 + 0.35 * tips) + 0 * x; v = np.maximum(v, edge * tips * (0.95 + 0.05 * math.sin(f * 2)))
        trail = np.exp(-((d1 - 12.5) / 2.5) ** 2) * (x < 22) * (x > 4) * tips * 0.35 * (0.6 + 0.4 * vnoise(W, H, 3, 61, oy=f * 4))
        out.append(paint(np.clip(np.maximum(v, trail), 0, 1), BLOOD, lo=0.18))
    return out

@fx('s_rock', 12, (7, 7), loop=True)
def _():
    out = []
    for f in range(8):
        a = f / 8 * math.tau; W = H = 14; pts = []
        for k in range(7):
            b = a + k / 7 * math.tau; rr = 5.2 + (1.2 if k % 2 else -0.4); pts.append((7 + math.cos(b) * rr, 7 + math.sin(b) * rr))
        body = mask_poly(W, H, [pts]); x, y = grid(W, H)
        lit = np.clip(0.55 + (-(x - 7) * 0.08 - (y - 7) * 0.1), 0.3, 0.9) * body
        out.append(paint(lit, EARTH, lo=0.1, dither=0.4))
    return out

def stick(W, H, head, shaft_col, head_col, fletch=None, spin=False, n=1):
    out = []
    for f in range(n):
        img = blank(W, H); cy = H // 2
        img[cy, 1:W - head] = list(shaft_col) + [255]
        for i in range(head):
            hh = head - i - 1
            img[max(0, cy - hh // 2): cy + hh // 2 + 1, W - head + i, :3] = head_col; img[max(0, cy - hh // 2): cy + hh // 2 + 1, W - head + i, 3] = 255
        if fletch is not None:
            for i in range(3): img[cy - 1 - (i % 2), 1 + i, :3] = fletch; img[cy - 1 - (i % 2), 1 + i, 3] = 255; img[cy + 1 + (i % 2), 1 + i, :3] = fletch; img[cy + 1 + (i % 2), 1 + i, 3] = 255
        out.append(img)
    return out

@fx('s_arrow', 12, (10, 3), loop=True)
def _(): return stick(18, 7, 4, WOOD[2], STEEL[3], fletch=BLOOD[3])
@fx('s_dart', 12, (7, 2), loop=True)
def _(): return stick(12, 5, 3, POISON[1], POISON[4])
@fx('s_dagger', 16, (7, 4), loop=True)
def _():
    out = []
    for f in range(4):
        W = H = 14; img = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(img); a = f / 4 * math.tau
        c, s = math.cos(a), math.sin(a)
        def P(u, v): return (7 + u * c - v * s, 7 + u * s + v * c)
        d.polygon([P(6, 0), P(0, -1.6), P(-1, 0), P(0, 1.6)], fill=tuple(STEEL[4]) + (255,))
        d.line([P(-1, -2.5), P(-1, 2.5)], fill=tuple(STEEL[1]) + (255,)); d.line([P(-1, 0), P(-5, 0)], fill=tuple(WOOD[1]) + (255,), width=2)
        out.append(np.asarray(img).copy())
    return out

# ===== impacts and slashes =====
def burst(W, H, n, pal, seed, r_end, streaks, ring=True, cy=None, heat=1.0):
    out = []; x, y = grid(W, H); cx = W / 2; cy = H / 2 if cy is None else cy
    r = np.random.default_rng(seed); angs = r.uniform(0, math.tau, streaks); lens = r.uniform(0.65, 1.0, streaks)
    for f in range(n):
        k = (f + 1) / n; rr = r_end * (1 - (1 - k) ** 2)
        d = np.hypot(x - cx, y - cy); a = np.arctan2(y - cy, x - cx)
        core = np.clip(1 - d / (r_end * 0.45 * (1 - k) + 0.5), 0, 1) * heat
        v = core
        if ring: v = np.maximum(v, np.exp(-((d - rr) / (1.2 + 1.2 * (1 - k))) ** 2) * (1 - k) * 0.95)
        for ang, L in zip(angs, lens):
            da = np.abs((a - ang + math.pi) % math.tau - math.pi)
            st = np.exp(-(da * d / 0.9) ** 2) * (d < rr * L * 1.15) * (d > rr * L * 0.35) * (1 - k * 0.7)
            v = np.maximum(v, st)
        out.append(paint(np.clip(v, 0, 1), pal, lo=0.2))
    return out

def impact(W, H, n, pal, seed, size, spikes, front=True, chips=0, spread=0.9):
    """A blow landing, struck along +x: a hot flash where it lands, tapered shards flung forward in a fan,
    a half-moon shock front ahead of it, chips of light. No ring of spokes."""
    out = []; x, y = grid(W, H); cx, cy = W * 0.36, H / 2
    r = np.random.default_rng(seed)
    sp = [(r.uniform(-spread, spread), r.uniform(0.6, 1.0), r.uniform(0.9, 1.6)) for _ in range(spikes)]
    ch = [(r.uniform(-1.2, 1.2), r.uniform(0.5, 1.1)) for _ in range(chips)]
    for f in range(n):
        k = (f + 1) / n; d = np.hypot(x - cx, y - cy); a = np.arctan2(y - cy, x - cx)
        flash = np.clip(1.1 - ell(x, y, cx, cy, size * 0.22 * (1.3 - k), size * 0.34 * (1.3 - k)), 0, 1) * max(0, 1.2 - k * 1.6)
        v = flash
        for (ang, L, wd) in sp:
            head = size * L * min(1, 0.45 + k * 1.1); tail = size * L * max(0, k * 1.2 - 0.25)
            da = np.abs((a - ang + math.pi) % math.tau - math.pi)
            taper = np.clip((d - tail) / max(head - tail, 0.5), 0, 1)
            w = wd * (1 - taper) * (1 - k * 0.5) + 0.2
            st = (np.abs(da * d) < w) * (d > tail) * (d < head) * np.cos(np.clip(da, 0, 1.5))
            v = np.maximum(v, st * (1.0 - taper * 0.45))
        if front:
            fr = size * (0.45 + 0.6 * k)
            arc = np.exp(-((d - fr) / (0.9 + (1 - k))) ** 2) * (np.abs(a) < 1.0) * np.cos(np.clip(a, -1.5, 1.5)) * (1 - k) * 0.9
            v = np.maximum(v, arc)
        img = paint(np.clip(v, 0, 1), pal, lo=0.22, dither=0.4)
        for (ang, L) in ch:
            dd = size * L * (0.4 + k * 0.9)
            if k < 0.85: sq(img, cx + math.cos(ang) * dd, cy + math.sin(ang) * dd, 1, pal[-1] if f < 2 else pal[-2])
        out.append(img)
    return out

@fx('s_hit', 22, (9, 12))
def _(): return impact(26, 24, 5, HIT, 3, 11, 4, chips=3)
@fx('s_hit_heavy', 20, (13, 18))
def _(): return impact(38, 36, 6, HIT, 4, 16, 6, chips=5)
@fx('s_crit', 18, (17, 24))
def _(): return impact(50, 48, 7, BLOOD, 5, 22, 7, chips=8, spread=1.1)

@fx('s_blood', 16, (16, 14))
def _():
    out = []; W, H = 32, 24; r = np.random.default_rng(71)
    drops = [(r.uniform(-0.9, 0.9), r.uniform(40, 120), r.uniform(-40, 30), r.integers(1, 3)) for _ in range(16)]
    for f in range(6):
        img = blank(W, H); t = (f + 1) * 0.05
        for (a, v, vz, s) in drops:
            px = 16 + math.cos(a) * v * t; py = 14 + math.sin(a) * v * t * 0.5 + (-vz * t + 260 * t * t) * 0.5
            if 0 <= px < W and 0 <= py < H: sq(img, px, py, s, BLOOD[1 + (s % 3)])
        out.append(dissolve(img, max(0, (f - 3) / 3), f))
    return out

def crescent(W, H, n, pal, r_out, thick, span, seed, sweep=2):
    out = []; x, y = grid(W, H); cx, cy = W / 2 - r_out * 0.35, H / 2
    for f in range(n):
        prog = min(1, (f + 1) / sweep); fade = max(0, (f + 1 - sweep) / (n - sweep + 0.5))
        d = np.hypot(x - cx, y - cy); a = np.arctan2(y - cy, x - cx)
        lim = -span + 2 * span * prog
        inarc = (a > -span) & (a < lim)
        th = thick * (1 - fade * 0.8) * np.clip(1 - np.abs(a) / (span * 1.05), 0.15, 1)
        band = np.clip(1 - np.abs(d - (r_out - th / 2)) / (th / 2 + 0.3), 0, 1)
        edge = np.exp(-((d - r_out + 0.6) / 0.8) ** 2)
        lead = np.exp(-((a - lim) / 0.25) ** 2) * 0.3
        v = inarc * np.maximum(band * (0.62 + lead + 0.25 * (d > r_out - th * 0.45)), edge * band.clip(0.4, 1)) * (1 - fade * 0.5)
        out.append(dissolve(paint(np.clip(v, 0, 1), pal, lo=0.18), fade * 0.9, f))
    return out

@fx('s_slash', 22, (20, 20))
def _(): return crescent(40, 40, 6, HIT, 17, 8.5, 1.3, 1)
@fx('s_slash_red', 20, (26, 26))
def _(): return crescent(52, 52, 7, BLOOD, 23, 12, 1.4, 2)

@fx('s_spin', 18, (34, 22))
def _():
    out = []; W, H = 68, 44; x, y = grid(W, H); cx, cy = 34, 24
    for f in range(7):
        k = (f + 1) / 7; d = ell(x, y, cx, cy, 30, 30 * PITCH); a = np.arctan2((y - cy) / PITCH, x - cx)
        head = f / 7 * math.tau * 1.2; da = (head - a) % math.tau
        trail = np.clip(1 - da / 3.6, 0, 1) * (da < 3.6)
        ringv = np.exp(-((d - 0.9) / 0.09) ** 2) * trail * (1 - k * 0.6)
        out.append(paint(np.clip(ringv, 0, 1), HIT, lo=0.2))
    return out

@fx('s_smoke', 14, (16, 18))
def _():
    out = []; W, H = 32, 26
    x, y = grid(W, H)
    for f in range(7):
        k = (f + 1) / 7; nz = fbm(W, H, 5, 81, oy=f * 2)
        d = ell(x, y, 16, 18 - k * 5, 6 + k * 8, 4 + k * 6)
        v = np.clip((1 - d) * 1.3 + (nz - 0.5) * 0.6, 0, 1) * (1 - k * 0.3)
        out.append(dissolve(paint(v, SMOKE, lo=0.15), max(0, k - 0.45) * 1.6, f))
    return out

def explosion(W, H, n, seed, r_end, heat_pal=FIRE, smoke=True, ground=0.65):
    out = []; x, y = grid(W, H); cx, cy = W / 2, H * ground
    for f in range(n):
        k = (f + 1) / n; nz = fbm(W, H, max(3, r_end / 4), seed, oy=f * 2.5)
        rr = r_end * (0.35 + 0.65 * (1 - (1 - k) ** 2.2)); lift = k * r_end * 0.35
        d = ell(x, y, cx, cy - lift, rr, rr * 0.85)
        heat = np.clip((1 - d) * 1.6 + (nz - 0.5) * 0.8, 0, 1) * max(0, 1.15 - k * 1.25)
        img = paint(heat, heat_pal, lo=0.14 + 0.2 * k, dither=0.35)
        if smoke and k > 0.35:
            sm = np.clip((1 - ell(x, y, cx, cy - lift * 1.3, rr * 1.05, rr * 0.9)) * 1.4 + (nz - 0.5) * 0.9, 0, 1) * min(1, (k - 0.35) * 3)
            simg = dissolve(paint(sm * 0.75, SMOKE, lo=0.24, dither=0.35), max(0, k - 0.55) * 2.6, f)
            img = over(simg, img)
        ringk = np.exp(-((ell(x, y, cx, cy, r_end * 1.15 * k, r_end * 1.15 * k * PITCH) - 1) / 0.08) ** 2) * (1 - k) * (k < 0.7)
        img = over(img, paint(ringk, heat_pal, lo=0.3))
        out.append(img)
    return out

@fx('s_fire_burst', 16, (28, 36))
def _(): return explosion(56, 52, 9, 91, 20)
@fx('s_meteor_impact', 15, (44, 58))
def _():
    a = explosion(88, 80, 11, 92, 32, ground=0.72)
    # debris: burning rocks thrown out
    r = np.random.default_rng(93); rocks = [(r.uniform(0, math.tau), r.uniform(60, 140), r.uniform(80, 160)) for _ in range(12)]
    for f, img in enumerate(a):
        t = (f + 1) * 0.06
        for (an, v, vz) in rocks:
            px = 44 + math.cos(an) * v * t; py = 58 + math.sin(an) * v * t * PITCH - (vz * t - 300 * t * t)
            if py < 58 + 6: sq(img, px, py, 2, FIRE[3] if f < 5 else EARTH[2])
    return a

@fx('s_shadow_burst', 15, (28, 38))
def _():
    out = explosion(56, 54, 9, 101, 19, heat_pal=SHADOW, smoke=False)
    W, H = 56, 54; r = np.random.default_rng(102)
    for f, img in enumerate(out):
        for k in range(6):
            a = r.uniform(0, math.tau); d = 6 + f * 2.2
            sq(img, 28 + math.cos(a) * d, 38 + math.sin(a) * d * 0.6 - f * 1.5, 1, SHADOW[6])
    return out

@fx('s_arcane_burst', 18, (20, 20))
def _():
    out = burst(40, 40, 7, ARCANE, 111, 15, 0)
    r = np.random.default_rng(112); m = [(r.uniform(0, math.tau), r.uniform(0.6, 1.1)) for _ in range(8)]
    for f, img in enumerate(out):
        for (a, L) in m:
            dd = 4 + f * 2.4 * L
            if f < 6: sq(img, 20 + math.cos(a) * dd, 20 + math.sin(a) * dd, 1, ARCANE[5 if f < 3 else 4])
    return out
@fx('s_shock', 20, (16, 16))
def _():
    out = []; W = H = 32; x, y = grid(W, H)
    for f in range(6):
        r = np.random.default_rng(120 + f); v = np.zeros((H, W)); k = (f + 1) / 6
        for b in range(4):
            a = r.uniform(0, math.tau); L = 13 * (0.6 + 0.4 * r.random())
            pts = bolt_path(r, 16, 16, 16 + math.cos(a) * L, 16 + math.sin(a) * L, 0.5, 3)
            d = poly_dist(x, y, pts); v = np.maximum(v, np.clip(1.2 - d / 0.9, 0, 1) * 0.95 + np.exp(-d / 1.8) * 0.35)
        v = np.maximum(v, np.clip(1 - np.hypot(x - 16, y - 16) / 4.5, 0, 1))
        out.append(dissolve(paint(np.clip(v, 0, 1) * (1 - k * 0.3), STORM, lo=0.22), max(0, k - 0.6) * 2, f))
    return out

@fx('s_frost_burst', 16, (28, 40))
def _():
    out = []; W, H = 56, 50; x, y = grid(W, H); cx, cy = 28, 40
    r = np.random.default_rng(131)
    spikes = [(r.uniform(-1, 1) * 18, r.uniform(-1, 1) * 8, r.uniform(9, 22), r.uniform(-0.45, 0.45), r.uniform(2.2, 3.6)) for _ in range(9)]
    spikes.sort(key=lambda s: s[1])
    for f in range(9):
        k = (f + 1) / 9; grow = min(1, k * 3.2); melt = max(0, (k - 0.6) / 0.4)
        img = blank(W, H)
        ringv = np.exp(-((ell(x, y, cx, cy, 26 * min(1, k * 1.6), 13 * min(1, k * 1.6)) - 1) / 0.08) ** 2) * (1 - k)
        img = over(img, paint(ringv, FROST, lo=0.3))
        for (ox, oy, hgt, lean, wd) in spikes:
            bx, by = cx + ox, cy + oy * 0.6; hh = hgt * grow
            tip = (bx + math.sin(lean) * hh, by - hh)
            body = mask_poly(W, H, [[(bx - wd, by), tip, (bx + wd, by)]])
            hi = mask_poly(W, H, [[(bx - wd * 0.2, by), tip, (bx + wd, by)]])
            img = over(img, paint(np.maximum(body * 0.5, hi * 0.85), FROST, lo=0.14, dither=0.3))
        if f < 4:
            for q in range(8): a = r.uniform(0, math.tau); sq(img, cx + math.cos(a) * (8 + f * 5), cy - 6 + math.sin(a) * (4 + f * 2.5) - f * 3, 1, FROST[5])
        out.append(dissolve(img, melt * 1.1, f))
    return out

@fx('s_poison_burst', 14, (24, 30))
def _():
    out = []; W, H = 48, 40; x, y = grid(W, H); cx, cy = 24, 30
    for f in range(8):
        k = (f + 1) / 8; nz = fbm(W, H, 5, 141, oy=f * 2.5)
        d = ell(x, y, cx, cy - k * 8, 8 + k * 12, 5 + k * 9)
        v = np.clip((1 - d) * 1.4 + (nz - 0.5) * 0.9, 0, 1) * (1 - k * 0.5)
        img = paint(v, POISON, lo=0.18)
        r = np.random.default_rng(142 + f)
        for q in range(5):
            bx, by = cx + r.uniform(-14, 14), cy - r.uniform(0, 18) - k * 6; rr = r.uniform(1, 2.6)
            ring = np.exp(-((np.hypot(x - bx, y - by) - rr) / 0.6) ** 2)
            img = over(img, paint(ring, POISON, lo=0.5))
        out.append(dissolve(img, max(0, k - 0.55) * 2.2, f))
    return out

@fx('s_holy_burst', 15, (24, 56))
def _():
    out = []; W, H = 48, 64; x, y = grid(W, H); cx, cy = 24, 56
    for f in range(9):
        k = (f + 1) / 9; wide = 7 * math.sin(min(1, k * 1.4) * math.pi) + 1
        col = np.exp(-((x - cx) / wide) ** 2) * np.clip(1 - (cy - y) / (60 * min(1, k * 2.2)), 0, 1) * (y < cy + 2)
        base = np.clip(1 - ell(x, y, cx, cy, 20 * min(1, k * 2), 10 * min(1, k * 2)), 0, 1)
        v = np.maximum(col, base * 0.8) * (1.1 - k * 0.6)
        img = paint(np.clip(v, 0, 1), HOLY, lo=0.16)
        r = np.random.default_rng(150 + f)
        for q in range(6): sq(img, cx + r.uniform(-14, 14), cy - r.uniform(0, 50) * k, 1 + (q % 2), HOLY[5])
        out.append(dissolve(img, max(0, k - 0.65) * 2.6, f))
    return out

@fx('s_heal', 12, (16, 40))
def _():
    out = []; W, H = 32, 44; x, y = grid(W, H)
    r = np.random.default_rng(161); motes = [(r.uniform(4, 28), r.uniform(0, 1), r.integers(0, 2)) for _ in range(9)]
    for f in range(9):
        k = (f + 1) / 9; img = blank(W, H)
        base = np.exp(-((ell(x, y, 16, 40, 13, 5) - 1) / 0.12) ** 2) * (1 - k * 0.7)
        img = over(img, paint(base, HEAL, lo=0.3))
        for (mx, ph, cross) in motes:
            py = 40 - ((ph + k) % 1) * 36
            if cross:
                for dx, dy in [(0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)]: sq(img, mx + dx, py + dy, 1, HEAL[4] if (dx or dy) else HEAL[3])
            else: sq(img, mx, py, 1, HEAL[3])
        out.append(dissolve(img, max(0, k - 0.7) * 3, f))
    return out

@fx('s_earth_burst', 16, (24, 34))
def _():
    out = []; W, H = 48, 42; x, y = grid(W, H); cx, cy = 24, 34
    r = np.random.default_rng(171)
    spikes = sorted([(r.uniform(-15, 15), r.uniform(-6, 6), r.uniform(8, 17), r.uniform(-0.35, 0.35), r.uniform(2.5, 4.2)) for _ in range(7)], key=lambda s: s[1])
    for f in range(8):
        k = (f + 1) / 8; grow = min(1, k * 3.5); sink = max(0, (k - 0.6) / 0.4)
        img = blank(W, H)
        dust = np.clip((1 - ell(x, y, cx, cy - 2, 10 + 14 * k, 5 + 7 * k)) * 1.2 + (fbm(W, H, 4, 172, oy=f * 2) - 0.5) * 0.8, 0, 1) * (1 - k) * 0.8
        img = over(img, paint(dust, SMOKE, lo=0.2))
        for (ox, oy, hgt, lean, wd) in spikes:
            bx, by = cx + ox, cy + oy * 0.6; hh = hgt * grow * (1 - sink * 0.8)
            tip = (bx + math.sin(lean) * hh, by - hh)
            body = mask_poly(W, H, [[(bx - wd, by + 1), tip, (bx + wd, by + 1)]])
            lit = mask_poly(W, H, [[(bx - wd, by + 1), tip, (bx - wd * 0.1, by + 1)]])
            img = over(img, paint(np.maximum(body * 0.45, lit * 0.8), EARTH, lo=0.12, dither=0.3))
        for q in range(6 if f < 4 else 0):
            a = r.uniform(math.pi, math.tau); sq(img, cx + math.cos(a) * (6 + f * 4), cy + math.sin(a) * (6 + f * 5), 2, EARTH[2])
        out.append(dissolve(img, sink * 0.9, f))
    return out

@fx('s_quake', 16, (48, 26))
def _():
    out = []; W, H = 96, 50; x, y = grid(W, H); cx, cy = 48, 26
    r = np.random.default_rng(181); cracks = []
    for i in range(9):
        a = i / 9 * math.tau + r.uniform(-0.2, 0.2); L = r.uniform(22, 40)
        pts = bolt_path(r, cx, cy, cx + math.cos(a) * L, cy + math.sin(a) * L * PITCH, 0.35, 3); cracks.append(pts)
    dcr = np.full((H, W), 1e9)
    for p in cracks: dcr = np.minimum(dcr, poly_dist(x, y, p))
    for f in range(9):
        k = (f + 1) / 9; reach = min(1, k * 2.4)
        d = ell(x, y, cx, cy, 44 * reach, 22 * reach)
        crack = np.clip(1.1 - dcr / 0.8, 0, 1) * (ell(x, y, cx, cy, 44 * reach, 22 * reach) < 1)
        glow = crack * (1 - k * 0.8)
        img = paint(np.clip(crack * 0.32, 0, 1), EARTH, lo=0.1, dither=0)
        img = over(img, paint(glow * 0.9, BLOOD, lo=0.5))
        wave = np.exp(-((ell(x, y, cx, cy, 46 * k, 23 * k) - 1) / 0.06) ** 2) * (1 - k)
        dust = np.clip((wave * 1.4 + (fbm(W, H, 5, 182, oy=f) - 0.5) * 0.5) * (1 - k), 0, 1)
        img = over(img, paint(dust, SMOKE, lo=0.3))
        out.append(dissolve(img, max(0, k - 0.65) * 2.6, f))
    return out

# ===== the great spells =====
@fx('s_lightning', 18, (24, 156))
def _():
    """A bolt from the sky: a thin leader, the strike with its branches, the flash on the ground, a re-strike, gone."""
    out = []; W, H = 48, 160; x, y = grid(W, H); gx, gy = 24, 156
    r = np.random.default_rng(191)
    main = bolt_path(r, 24 + r.uniform(-10, 10), 0, gx, gy - 2, 0.32, 6)
    branches = []
    for b in range(3):
        i = r.integers(len(main) // 5, len(main) * 3 // 5); p = main[i]; a = math.pi / 2 + r.choice([-1, 1]) * r.uniform(0.4, 0.9)
        L = r.uniform(18, 36); branches.append(bolt_path(r, p[0], p[1], p[0] + math.cos(a) * L, p[1] + math.sin(a) * L, 0.4, 4))
    dm = poly_dist(x, y, main); db = np.full((H, W), 1e9)
    for p in branches: db = np.minimum(db, poly_dist(x, y, p))
    main2 = bolt_path(np.random.default_rng(192), 24 + r.uniform(-8, 8), 0, gx, gy - 2, 0.3, 6); dm2 = poly_dist(x, y, main2)
    seq = [('lead', 0.5), ('strike', 1.0), ('strike', 0.85), ('after', 0.6), ('re', 0.9), ('after', 0.45), ('fade', 0.3), ('fade', 0.15), (None, 0)]
    for f, (kind, s) in enumerate(seq):
        if kind is None: out.append(blank(W, H)); continue
        if kind == 'lead': v = np.clip(1 - dm / 0.6, 0, 1) * 0.6 * (y < gy * 0.75)
        else:
            d = dm2 if kind == 're' else dm
            v = np.clip(1.25 - d / (1.1 * s), 0, 1) * s + np.exp(-d / 3.2) * 0.4 * s
            if kind in ('strike', 're'): v = np.maximum(v, (np.clip(1.2 - db / 0.8, 0, 1) * 0.8 + np.exp(-db / 2.4) * 0.25) * s)
        flash = np.clip(1 - ell(x, y, gx, gy, 14 * s + 2, 6 * s + 1), 0, 1) * (s if kind != 'lead' else 0)
        img = paint(np.clip(np.maximum(v, flash), 0, 1), STORM, lo=0.2)
        if kind in ('strike', 're', 'after'):
            rr = np.random.default_rng(193 + f)
            for q in range(8): a = rr.uniform(math.pi, math.tau); dd = rr.uniform(4, 16) * (1 + (f > 2)); sq(img, gx + math.cos(a) * dd, gy + math.sin(a) * dd * 0.6, 1, STORM[3])
        out.append(dissolve(img, 0.4 if kind == 'fade' and s < 0.2 else 0, f))
    return out

@fx('s_meteor_rock', 12, (16, 8), loop=True)
def _():
    """The falling meteor (points along +x): a burning rock with a long tail of fire and smoke."""
    out = []; W, H = 40, 18; x, y = grid(W, H); cx, cy = 32, 9
    for f in range(6):
        nz = fbm(W, H, 4, 201, ox=f * 5)
        dx = cx - x; along = np.clip(dx / 32, 0, 1)
        tail = np.exp(-((y - cy) / (6 * (1 - along * 0.6) + 0.5)) ** 2) * (1 - along) ** 0.9 * (dx > 0) * (0.5 + 0.7 * nz)
        img = paint(np.clip(tail, 0, 1), FIRE, lo=0.2)
        sm = np.exp(-((y - cy) / 5) ** 2) * (along > 0.55) * (dx > 0) * (1 - along) * 1.6 * nz
        img = over(paint(np.clip(sm, 0, 1), SMOKE, lo=0.25), img)
        rock = np.hypot(x - cx, y - cy) < 4.6
        rk = paint(np.where(rock, np.clip(0.75 - (x - cx) * 0.06 + (y - cy) * 0.05, 0.3, 0.9), 0), EARTH, lo=0.1, dither=0.3)
        img = over(img, rk)
        rim = np.exp(-((np.hypot(x - cx, y - cy) - 4.6) / 0.8) ** 2) * (x > cx - 1)
        img = over(img, paint(rim, FIRE, lo=0.5))
        out.append(img)
    return out

@fx('s_meteor', 15, (44, 150))
def _():
    """The whole meteor for a film: it falls from the top-right corner, strikes, explodes."""
    W, H = 88, 152; gx, gy = 44, 150
    rock = FX['s_meteor_rock']['fn']()
    imp = FX['s_meteor_impact']['fn']()
    out = []
    for f in range(4):
        img = Image.new('RGBA', (W, H)); k = f / 4
        px, py = W - 4 - (W - 4 - gx) * k, 6 + (gy - 18 - 6) * k * k
        rimg = Image.fromarray(rock[f % len(rock)]).rotate(math.degrees(math.atan2(gy - 6, -(W - 4 - gx))) * -1, expand=True, resample=Image.NEAREST)
        img.alpha_composite(rimg, (int(px - rimg.width / 2), int(py - rimg.height / 2)))
        out.append(np.asarray(img).copy())
    for f, a in enumerate(imp):
        img = Image.new('RGBA', (W, H)); img.alpha_composite(Image.fromarray(a), (gx - 44, gy - 58)); out.append(np.asarray(img).copy())
    return out

@fx('s_shadow_rise', 14, (32, 88))
def _():
    """Shadow erupting from the ground: a black pool with a crimson rim, tendrils lashing up out of it."""
    out = []; W, H = 64, 92; x, y = grid(W, H); cx, cy = 32, 88
    r = np.random.default_rng(211)
    tend = [(r.uniform(-18, 18), r.uniform(40, 80), r.uniform(0, math.tau), r.uniform(2.2, 3.8)) for _ in range(6)]
    for f in range(10):
        k = (f + 1) / 10; grow = min(1, k * 2.6); sink = max(0, (k - 0.6) / 0.4)
        pool = np.clip(1.2 - ell(x, y, cx, cy - 2, 24 * min(1, k * 3), 9 * min(1, k * 3)), 0, 1)
        img = paint(pool * 0.5, SHADOW, lo=0.12)
        rim = np.exp(-((ell(x, y, cx, cy - 2, 24 * min(1, k * 3), 9 * min(1, k * 3)) - 1) / 0.07) ** 2) * (1 - sink)
        img = over(img, paint(rim * 0.85, SHADOW, lo=0.4))
        v = np.zeros((H, W))
        for (ox, hgt, ph, wd) in tend:
            hh = hgt * grow * (1 - sink); bx = cx + ox
            yy = np.clip((cy - y) / max(hh, 1), 0, 1)
            sway = np.sin(yy * 3 + ph + f * 0.7) * 6 * yy
            dxx = np.abs(x - (bx + sway)); wide = wd * (1 - yy * 0.85) + 0.4
            v = np.maximum(v, np.clip(1 - dxx / wide, 0, 1) * (y < cy - 1) * (cy - y < hh) * (0.55 + 0.45 * (1 - yy)))
        img = over(img, paint(v, SHADOW, lo=0.15, dither=0.5))
        for q in range(5):
            sq(img, cx + r.uniform(-20, 20), cy - r.uniform(0, 70) * grow, 1, SHADOW[6])
        out.append(dissolve(img, sink * 1.05, f))
    return out

@fx('s_holy_pillar', 15, (24, 156))
def _():
    out = []; W, H = 48, 160; x, y = grid(W, H); cx, cy = 24, 156
    for f in range(10):
        k = (f + 1) / 10; wide = 9 * math.sin(min(1, k * 1.3) * math.pi) + 1.5
        core = np.exp(-((x - cx) / (wide * 0.45)) ** 2); halo = np.exp(-((x - cx) / wide) ** 2) * 0.6
        top = np.clip(1 - (cy - y) / (170 * min(1, k * 3)), 0, 1) ** 0.3
        v = np.maximum(core, halo) * top * (y < cy + 1)
        base = np.clip(1 - ell(x, y, cx, cy - 1, 22 * min(1, k * 2), 8 * min(1, k * 2)), 0, 1) * 0.9
        img = paint(np.clip(np.maximum(v, base) * (1.1 - k * 0.5), 0, 1), HOLY, lo=0.18)
        rr = np.random.default_rng(221 + f)
        for q in range(8): sq(img, cx + rr.uniform(-16, 16), cy - rr.uniform(0, 140), 1, HOLY[5])
        out.append(dissolve(img, max(0, k - 0.7) * 3, f))
    return out

@fx('s_blood_wave', 15, (48, 34))
def _():
    """The blood-moon cut: a red crescent of force tearing across the ground and out."""
    out = []; W, H = 96, 64; x, y = grid(W, H); cx, cy = 48, 34
    for f in range(9):
        k = (f + 1) / 9; rr = 10 + 36 * (1 - (1 - k) ** 2)
        d = ell(x, y, cx, cy, rr, rr * PITCH * 1.2)
        nz = vnoise(W, H, 4, 311, ox=f * 3)
        band = np.exp(-((d - 1 + (nz - 0.5) * 0.12) / (0.13 * (1 - k * 0.5))) ** 2) * (1 - k * 0.6) * (0.75 + 0.5 * nz)
        inner = np.clip(1 - d, 0, 1) * (d > 0.55) * 0.3 * (1 - k)
        core = np.clip(1 - ell(x, y, cx, cy, 12 * (1 - k), 7 * (1 - k)), 0, 1)
        img = paint(np.clip(np.maximum(np.maximum(band, core), inner), 0, 1), BLOOD, lo=0.2, dither=0.5)
        g = np.random.default_rng(312 + f)
        for q in range(10 if k < 0.8 else 0):
            a = g.uniform(0, math.tau); sq(img, cx + math.cos(a) * rr * 1.1, cy + math.sin(a) * rr * PITCH * 1.3, 1 + (q % 2), BLOOD[2 + (q % 2)])
        out.append(dissolve(img, max(0, k - 0.6) * 2.4, f))
    return out

# ===== ground zones (loop) =====
@fx('s_flames', 12, (10, 22), loop=True)
def _():
    out = []; W, H = 20, 24; x, y = grid(W, H)
    for f in range(8):
        nz = fbm(W, H, 4, 231, oy=f * 3)
        shape = np.clip(1 - np.abs(x - 10) / (6 * np.clip((y - 2) / 22, 0.05, 1)), 0, 1) * np.clip((y - 2) / 20, 0, 1)
        v = np.clip(shape * 1.3 + (nz - 0.55) * 0.9 - (1 - (y / H)) * 0.4, 0, 1)
        out.append(paint(v, FIRE, lo=0.2))
    return out

@fx('s_poison_fume', 10, (14, 18), loop=True)
def _():
    out = []; W, H = 28, 22; x, y = grid(W, H)
    for f in range(8):
        nz = fbm(W, H, 5, 241, oy=f * 2.75)
        v = np.clip((1 - ell(x, y, 14, 15, 12, 7)) * 1.2 + (nz - 0.5) * 1.0, 0, 1) * 0.85
        img = paint(v, POISON, lo=0.25)
        bx, by = 8 + (f * 3) % 12, 16 - (f % 4) * 3
        ring = np.exp(-((np.hypot(x - bx, y - by) - 1.6) / 0.5) ** 2); img = over(img, paint(ring, POISON, lo=0.5))
        out.append(img)
    return out

@fx('s_frost_mist', 10, (14, 14), loop=True)
def _():
    out = []; W, H = 28, 18; x, y = grid(W, H)
    r = np.random.default_rng(251); pts = [(r.uniform(3, 25), r.uniform(4, 15), r.uniform(0, 1)) for _ in range(9)]
    for f in range(8):
        nz = fbm(W, H, 5, 252, ox=f * 2)
        v = np.clip((1 - ell(x, y, 14, 12, 13, 5)) * 1.1 + (nz - 0.5) * 0.8, 0, 1) * 0.5
        img = paint(v, FROST, lo=0.22)
        for (px, py, ph) in pts:
            if ((ph + f / 8) % 1) < 0.4:
                sq(img, px, py, 1, FROST[5]); sq(img, px - 1, py, 1, FROST[4]); sq(img, px + 1, py, 1, FROST[4])
        out.append(img)
    return out

@fx('s_holy_motes', 10, (12, 26), loop=True)
def _():
    out = []; W, H = 24, 28
    r = np.random.default_rng(261); pts = [(r.uniform(2, 22), r.uniform(0, 1)) for _ in range(7)]
    for f in range(8):
        img = blank(W, H)
        for i, (px, ph) in enumerate(pts):
            py = 26 - ((ph + f / 8) % 1) * 24; sq(img, px, py, 1 + (i % 2), HOLY[4 + (i % 2)])
        out.append(img)
    return out

@fx('s_shadow_pool', 10, (14, 12), loop=True)
def _():
    out = []; W, H = 28, 16; x, y = grid(W, H)
    for f in range(8):
        nz = fbm(W, H, 4, 271, ox=f * 2)
        v = np.clip((1 - ell(x, y, 14, 10, 13, 5)) * 1.2 + (nz - 0.5) * 0.7, 0, 1) * 0.7
        img = paint(v, SHADOW, lo=0.2)
        sq(img, 6 + (f * 5) % 16, 10 - (f % 3) * 3, 1, SHADOW[6]); out.append(img)
    return out

@fx('s_whirl', 14, (16, 46))
def _():
    out = []; W, H = 32, 48; x, y = grid(W, H)
    for f in range(8):
        v = np.zeros((H, W))
        for i in range(7):
            cy = 44 - i * 6; rw = 4 + i * 1.8; a0 = f * 0.9 + i * 0.7
            d = ell(x, y, 16 + math.sin(a0) * 1.5, cy, rw, rw * 0.32); ang = np.arctan2((y - cy) / 0.32, x - 16)
            on = ((ang - a0) % math.tau) < 3.8
            v = np.maximum(v, np.exp(-((d - 1) / 0.18) ** 2) * on * (0.9 - i * 0.05))
        out.append(paint(v, WIND, lo=0.3))
    return out

# ===== casting =====
@fx('s_rune', 14, (24, 12))
def _():
    out = []; W, H = 48, 24; x, y = grid(W, H); cx, cy = 24, 12
    for f in range(9):
        k = (f + 1) / 9; s = min(1, k * 3); fade = max(0, (k - 0.6) / 0.4)
        d = ell(x, y, cx, cy, 22 * s, 11 * s); a = np.arctan2((y - cy) / PITCH, x - cx)
        ring = np.exp(-((d - 1) / 0.05) ** 2) + np.exp(-((d - 0.72) / 0.04) ** 2) * 0.8
        ticks = (np.abs(((a + f * 0.35) % (math.tau / 8)) - math.tau / 16) < 0.12) & (d > 0.74) & (d < 0.98)
        star = np.zeros_like(d)
        for i in range(5):
            p0 = (cx + math.cos(i * 4 * math.pi / 5 - f * 0.2) * 15 * s, cy + math.sin(i * 4 * math.pi / 5 - f * 0.2) * 7.5 * s)
            p1 = (cx + math.cos((i + 1) * 4 * math.pi / 5 - f * 0.2) * 15 * s, cy + math.sin((i + 1) * 4 * math.pi / 5 - f * 0.2) * 7.5 * s)
            star = np.maximum(star, np.clip(1 - seg_dist(x, y, *p0, *p1) / 0.6, 0, 1) * 0.6)
        v = np.maximum(np.maximum(ring, ticks * 0.9), star)
        out.append(dissolve(paint(np.clip(v, 0, 1), BLOOD, lo=0.35), fade, f))
    return out

@fx('s_charge', 14, (16, 44))
def _():
    out = []; W, H = 32, 48; x, y = grid(W, H)
    r = np.random.default_rng(281); motes = [(r.uniform(0, math.tau), r.uniform(8, 15), r.uniform(0, 1)) for _ in range(12)]
    for f in range(9):
        k = (f + 1) / 9; img = blank(W, H)
        glow = np.clip(1 - ell(x, y, 16, 44, 12, 4.5), 0, 1) * (0.5 + 0.5 * k)
        img = over(img, paint(glow, HOLY, lo=0.35))
        for (a, rad, ph) in motes:
            t = (ph + k * 1.3) % 1; rr = rad * (1 - t); py = 44 - t * 34
            sq(img, 16 + math.cos(a + t * 3) * rr, py + math.sin(a + t * 3) * rr * 0.4, 1, HOLY[4] if t > 0.5 else HOLY[3])
        if f >= 6:
            fl = np.clip(1.2 - ell(x, y, 16, 24, 4 + (f - 6) * 4, 8 + (f - 6) * 6), 0, 1) * (1 - (f - 6) / 3)
            img = over(img, paint(fl, HOLY, lo=0.3))
        out.append(img)
    return out

@fx('s_vanish', 16, (16, 44))
def _():
    """Shadow step: a dark streak torn upwards and a puff of black smoke with crimson motes."""
    out = []; W, H = 32, 48; x, y = grid(W, H)
    for f in range(8):
        k = (f + 1) / 8; nz = fbm(W, H, 4, 291, oy=f * 3)
        hh = 40 * min(1, k * 2.5); streak = np.exp(-((x - 16) / ((3.2 * np.clip((y - (44 - hh)) / max(hh, 1), 0, 1)) * (1 - k) + 0.45)) ** 2) * (y < 44) * (y > 44 - hh) * (1 - k)
        puff = np.clip((1 - ell(x, y, 16, 38 - k * 6, 7 + k * 9, 4 + k * 5)) * 1.3 + (nz - 0.5) * 0.9, 0, 1) * (1 - k * 0.4)
        img = paint(np.clip(np.maximum(streak * 0.95, puff * 0.55), 0, 1), SHADOW, lo=0.15)
        rr = np.random.default_rng(292 + f)
        for q in range(5): sq(img, 16 + rr.uniform(-12, 12), 40 - rr.uniform(0, 30) * k, 1, SHADOW[6])
        out.append(dissolve(img, max(0, k - 0.55) * 2.2, f))
    return out

@fx('s_summon', 14, (28, 30))
def _():
    out = []; W, H = 56, 52; x, y = grid(W, H); cx, cy = 28, 30
    for f in range(10):
        k = (f + 1) / 10; s = min(1, k * 2.5); fade = max(0, (k - 0.65) / 0.35)
        d = ell(x, y, cx, cy, 24 * s, 12 * s)
        hole = np.clip(1 - d, 0, 1) * 0.45
        rings = sum(np.exp(-((d - rr) / 0.05) ** 2) * (0.9 - rr * 0.3) for rr in [((k * 2 + j / 3) % 1) for j in range(3)])
        img = paint(np.clip(np.maximum(hole, rings), 0, 1), SHADOW, lo=0.12)
        v = np.zeros((H, W)); rr = np.random.default_rng(301)
        for j in range(5):
            bx = cx + rr.uniform(-16, 16); ph = rr.uniform(0, 1); t = (ph + k) % 1
            wy = cy - t * 28; v = np.maximum(v, np.clip(1 - np.hypot((x - bx - math.sin(t * 6) * 2) / 1.6, (y - wy) / 4), 0, 1) * (1 - t))
        img = over(img, paint(v, SHADOW, lo=0.3))
        out.append(dissolve(img, fade, f))
    return out

# ===== the second pass (the author, 2026-11-20: resize, re-angle, cleaner animation and placement) =====
# Later definitions replace the first ones under the same name.

def swipe(W, H, n, pal, rx, ry, thick, seed, sweep=2, a0=-2.5, a1=0.55):
    """A sword's swipe seen from the fight camera: a flat arc around the target (an ellipse, squashed like the floor),
    swept from behind to the front in two frames, white along its outer edge, then thinning away. Struck to the right;
    the game mirrors it for blows to the left and tilts it a little, never stands it up."""
    out = []; x, y = grid(W, H); cx, cy = W / 2, H / 2
    for f in range(n):
        prog = min(1, (f + 1) / sweep); fade = max(0, (f + 1 - sweep) / (n - sweep))
        d = ell(x, y, cx, cy, rx, ry); a = np.arctan2((y - cy) / ry, (x - cx) / rx)
        head = a0 + (a1 - a0) * prog; tail = a0 + (a1 - a0) * min(prog, fade * 1.2)
        inarc = (a >= tail) & (a <= head)
        span = max(head - tail, 1e-3); along = np.clip((a - tail) / span, 0, 1)
        th = (thick / rx) * (0.35 + 0.65 * np.sin(np.pi * along)) * (1 - fade * 0.6)
        band = np.clip(1 - np.abs(d - (1 - th / 2)) / (th / 2 + 0.02), 0, 1)
        edge = np.exp(-((d - 0.97) / 0.035) ** 2)
        v = inarc * np.maximum(band * (0.55 + 0.35 * along), edge * (band > 0.05) * 1.0)
        out.append(dissolve(paint(np.clip(v, 0, 1), pal, lo=0.2, dither=0.15), fade * 0.85))
    return out

@fx('s_slash', 24, (22, 12))
def _(): return swipe(44, 24, 6, HIT, 19, 9, 6.5, 1)
@fx('s_slash_red', 22, (28, 15))
def _(): return swipe(56, 30, 7, BLOOD, 25, 12, 8.5, 2)

@fx('s_moon_wave', 14, (16, 9), loop=True)
def _():
    """The crescent wave in flight, flat over the floor: a blood-red moon blade, convex forward, white on its edge."""
    out = []; W, H = 30, 18; x, y = grid(W, H); cx, cy = 10, 9
    for f in range(4):
        d1 = ell(x, y, cx, cy, 14, 7.5); d2 = ell(x, y, cx - 5, cy, 13, 7.5)
        cres = (d1 < 1) & (d2 > 1) & (x > cx - 2)
        tips = np.clip(1 - np.abs(y - cy) / 7.5, 0, 1)
        edge = np.exp(-((d1 - 0.93) / 0.06) ** 2) * (x > cx)
        v = cres * (0.45 + 0.3 * tips); v = np.maximum(v, edge * tips * (0.95 + 0.05 * math.sin(f * 2)))
        trail = np.exp(-((d1 - 0.7) / 0.12) ** 2) * (x < cx + 6) * (x > 1) * tips * 0.32 * (0.6 + 0.4 * vnoise(W, H, 3, 61, oy=f * 4))
        out.append(paint(np.clip(np.maximum(v, trail), 0, 1), BLOOD, lo=0.18, dither=0.15))
    return out

def puffs(W, H, n, pal, seed, cx, cy, count, r0, r1, rise, start=0.25):
    """Round smoke puffs that swell, rise and fade (smoke after a blast, a shadow step)."""
    rng = np.random.default_rng(seed); P = [(rng.uniform(-1, 1), rng.uniform(-0.4, 0.6), rng.uniform(0.7, 1.2)) for _ in range(count)]
    x, y = grid(W, H); out = []
    for f in range(n):
        k = (f + 1) / n
        if k < start: out.append(blank(W, H)); continue
        kk = (k - start) / (1 - start); v = np.zeros((H, W))
        for (ox, oy, s) in P:
            r = (r0 + (r1 - r0) * kk) * s; px = cx + ox * r1 * 0.9; py = cy - oy * r1 * 0.4 - rise * kk
            d = np.hypot(x - px, (y - py) * 1.15) / r
            v = np.maximum(v, np.clip(1 - d, 0, 1) ** 0.6 * (0.55 + 0.45 * (1 - (y - py + r) / (2 * r + 1e-6))))
        out.append(dissolve(paint(np.clip(v, 0, 1) * 0.9, pal, lo=0.15, dither=0.1), max(0, kk - 0.45) * 1.8))
    return out

def blast(W, H, n, seed, size, cx, cy, pal=FIRE2, smoke=None, embers=10):
    """An explosion: a white flash, a fireball that swells and climbs, embers thrown up, a flat shock ring on the floor,
    then a few grey puffs that rise and fade. No dark mass left behind."""
    x, y = grid(W, H); rng = np.random.default_rng(seed)
    E = [(rng.uniform(-math.pi * 0.95, -math.pi * 0.05), rng.uniform(0.6, 1.2)) for _ in range(embers)]
    sm = puffs(W, H, n, smoke, seed + 1, cx, cy - size * 0.9, 3, size * 0.25, size * 0.45, size * 0.7, start=0.55) if smoke is not None else [blank(W, H)] * n
    out = []
    for f in range(n):
        k = (f + 1) / n; nz = fbm(W, H, max(3, size / 3), seed, oy=f * 2.5)
        swell = min(1, k * 3.2); cool = max(0, (k - 0.3) / 0.7)
        rr = size * (0.35 + 0.65 * swell) * (1 - cool * 0.55); lift = size * 0.45 * k
        d = ell(x, y, cx, cy - rr * 0.8 - lift * 0.5, rr, rr * 1.05)
        heat = np.clip((1 - d) * 1.5 + (nz - 0.5) * 0.7, 0, 1) * (1.1 - cool * 0.9)
        img = paint(np.clip(heat, 0, 1), pal, lo=0.22 + 0.25 * cool, dither=0.15)
        img = over(sm[f], img) if cool > 0.5 else over(img, sm[f])
        if k < 0.6:
            ring = np.exp(-((ell(x, y, cx, cy, size * 1.4 * k / 0.6 + 2, (size * 1.4 * k / 0.6 + 2) * PITCH) - 1) / 0.06) ** 2) * (1 - k / 0.6)
            img = over(paint(ring, pal, lo=0.35, dither=0), img)
        for (a, sp) in E:
            t = k * 0.9; px = cx + math.cos(a) * size * 1.6 * sp * t; py = cy - size * 0.6 + math.sin(a) * size * 1.4 * sp * t + size * 1.2 * t * t
            if k < 0.85: sq(img, px, py, 1, pal[4] if k < 0.4 else pal[2])
        if f == 0:
            fl = np.clip(1.2 - ell(x, y, cx, cy - size * 0.4, size * 0.45, size * 0.45), 0, 1); img = over(img, paint(fl, pal, lo=0.3, dither=0))
        out.append(img)
    return out

@fx('s_fire_burst', 18, (26, 50))
def _(): return blast(52, 56, 10, 91, 15, 26, 50)
@fx('s_meteor_impact', 16, (40, 74))
def _():
    a = blast(80, 80, 12, 92, 22, 40, 74, embers=16)
    x, y = grid(80, 80)
    for f, img in enumerate(a):   # a scorched crater under it, cooling
        k = (f + 1) / 12; sc = np.clip(1 - ell(x, y, 40, 74, 22, 11), 0, 1) * (0.9 - k * 0.5)
        c = paint(sc * 0.5, EARTH, lo=0.1, dither=0); c = dissolve(c, k * 0.7); a[f] = over(c, img)
    return a

@fx('s_shadow_burst', 16, (26, 46))
def _():
    """Shadow bursting out: a violet-black blast with a crimson rim, wisps climbing out of it, a ring on the floor."""
    W, H = 52, 50; x, y = grid(W, H); cx, cy = 26, 46; out = []
    sm = puffs(W, H, 10, SHADOW2, 102, cx, cy - 10, 5, 4, 11, 12, start=0.3)
    for f in range(10):
        k = (f + 1) / 10; nz = fbm(W, H, 4, 101, oy=f * 2)
        rr = 14 * (0.4 + 0.6 * min(1, k * 3)) * (1 - max(0, k - 0.4) * 0.8)
        d = ell(x, y, cx, cy - rr * 0.8, rr, rr)
        core = np.clip((1 - d) * 1.4 + (nz - 0.5) * 0.6, 0, 1) * (1 - max(0, k - 0.3) * 1.2)
        img = over(sm[f], paint(np.clip(core, 0, 1), SHADOW2, lo=0.18, dither=0.1))
        rim = np.exp(-((d - 1) / 0.08) ** 2) * (1 - k) * (k < 0.7)
        img = over(img, paint(rim, SHADOW2, lo=0.45, dither=0))
        if k < 0.6:
            ring = np.exp(-((ell(x, y, cx, cy, 24 * k / 0.6 + 2, (24 * k / 0.6 + 2) * PITCH) - 1) / 0.07) ** 2) * (1 - k / 0.6)
            img = over(paint(ring, SHADOW2, lo=0.35, dither=0), img)
        out.append(img)
    return out

@fx('s_shadow_bolt', 14, (19, 8), loop=True)
def _():
    """A ball of shadow in flight: a hot magenta heart in a violet orb, trailing dark smoke."""
    out = []; W, H = 26, 16; x, y = grid(W, H); cx, cy = 19, 8
    for f in range(6):
        nz = fbm(W, H, 4, 21, ox=f * 3.5)
        dx = cx - x; along = np.clip(dx / 18, 0, 1)
        tail = np.exp(-((y - cy) / (4.5 * (1 - along * 0.6) + 0.5)) ** 2) * (1 - along) * (dx > 0) * (0.45 + 0.6 * nz)
        d = np.hypot(x - cx, y - cy); orb = np.clip(1.15 - d / 5.2, 0, 1)
        out.append(paint(np.clip(np.maximum(orb, tail * 0.6), 0, 1), SHADOW2, lo=0.14, dither=0.15))
    return out

@fx('s_vanish', 16, (18, 34))
def _():
    """Shadow step: a burst of violet-black smoke where the body was, crimson motes thrown out of it."""
    W, H = 36, 38; out = puffs(W, H, 9, SHADOW2, 291, 18, 32, 6, 4, 10, 10, start=0.0)
    rng = np.random.default_rng(292); M = [(rng.uniform(0, math.tau), rng.uniform(0.6, 1.1)) for _ in range(8)]
    for f, img in enumerate(out):
        k = (f + 1) / 9
        for (a, sp) in M:
            if k < 0.8: sq(img, 18 + math.cos(a) * 16 * sp * k, 26 + math.sin(a) * 8 * sp * k - 10 * k, 1, SHADOW2[5] if k < 0.4 else SHADOW2[4])
    return out

@fx('s_smoke', 14, (16, 22))
def _(): return puffs(32, 26, 8, SMOKE2, 81, 16, 22, 4, 3, 8, 8, start=0.0)

@fx('s_flames', 12, (12, 30), loop=True)
def _():
    """A tongue of fire on burning ground."""
    out = []; W, H = 24, 32; x, y = grid(W, H)
    for f in range(8):
        nz = fbm(W, H, 4, 231, oy=f * 3.5)
        up = np.clip((30 - y) / 26, 0, 1)
        shape = np.clip(1 - np.abs(x - 12 - np.sin(y * 0.4 + f) * up * 1.5) / (7 * (1 - up) ** 0.8 + 0.4), 0, 1) * (y < 31)
        v = np.clip(shape * 1.35 + (nz - 0.55) * 0.8 - up * 0.45, 0, 1)
        out.append(paint(v, FIRE2, lo=0.22, dither=0.15))
    return out

# ---- pack ------------------------------------------------------------------------------------------------------
def build():
    sheets = {}
    for name, d in FX.items():
        frames = d['fn'](); sheets[name] = (frames, d)
    PAGE = 1024; pages = [Image.new('RGBA', (PAGE, PAGE))]; px = py = rowh = 0; meta = {}
    # tallest first packs better
    items = []
    for name, (frames, d) in sheets.items():
        for i, fr in enumerate(frames):
            a = fr[..., 3] > 0
            if not a.any(): items.append((name, i, None, 0, 0)); continue
            ys, xs = np.where(a); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            items.append((name, i, fr[y0:y1, x0:x1], x0, y0))
    order = sorted(range(len(items)), key=lambda j: -(items[j][2].shape[0] if items[j][2] is not None else 0))
    placed = {}
    for j in order:
        name, i, crop, x0, y0 = items[j]
        if crop is None: placed[j] = None; continue
        h, w = crop.shape[:2]
        if px + w + 1 > PAGE: px = 0; py += rowh + 1; rowh = 0
        if py + h + 1 > PAGE: pages.append(Image.new('RGBA', (PAGE, PAGE))); px = py = rowh = 0
        pages[-1].paste(Image.fromarray(crop), (px, py)); placed[j] = (len(pages) - 1, px, py, w, h, int(x0), int(y0))
        px += w + 1; rowh = max(rowh, h)
    for j, (name, i, crop, x0, y0) in enumerate(items):
        frames, d = sheets[name]
        m = meta.setdefault(name, dict(fps=d['fps'], loop=d['loop'], frames=[None] * len(frames)))
        p = placed[j]
        if p is not None: m['frames'][i] = [p[0], p[1], p[2], p[3], p[4], p[5] - d['anchor'][0], p[6] - d['anchor'][1]]
    # trim the last page
    last = pages[-1]; bb = last.getbbox()
    if bb: pages[-1] = last.crop((0, 0, PAGE, min(PAGE, bb[3] + 1)))
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.startswith('spell_') and f.endswith('.png'): os.remove(os.path.join(OUT, f))
    names = []
    for k, pg in enumerate(pages): nm = 'spell_%d.png' % k; pg.save(os.path.join(OUT, nm), optimize=True); names.append(nm)
    json.dump(dict(pages=names, fx=meta), open(os.path.join(OUT, 'spell.json'), 'w'), separators=(',', ':'))
    return sheets

def preview(sheets, path, scale=3):
    rows = []
    for name, (frames, d) in sheets.items():
        h = max(f.shape[0] for f in frames); w = sum(f.shape[1] + 4 for f in frames)
        row = Image.new('RGBA', (max(w, 200), h + 12), (24, 20, 28, 255)); dr = ImageDraw.Draw(row); dr.text((2, 0), name, fill=(200, 200, 200, 255))
        xx = 0
        for f in frames:
            bg = Image.new('RGBA', (f.shape[1], f.shape[0]), (44, 38, 50, 255)); bg.alpha_composite(Image.fromarray(f)); row.paste(bg, (xx, 11)); xx += f.shape[1] + 4
        rows.append(row)
    W = max(r.width for r in rows); H = sum(r.height + 2 for r in rows)
    out = Image.new('RGBA', (W, H), (16, 12, 18, 255)); y = 0
    for r in rows: out.paste(r, (0, y)); y += r.height + 2
    out = out.resize((W * scale // 2, H * scale // 2), Image.NEAREST); out.save(path)

if __name__ == '__main__':
    s = build()
    print(len(s), 'effects,', sum(len(f) for f, _ in s.values()), 'frames ->', OUT)
    if len(sys.argv) > 1: preview(s, sys.argv[1])
