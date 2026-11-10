# THE BLEEDING MOON - the forge: the game's own tiles, props and effects, drawn in code (no outside art).
# Writes assets/iso/tiles_v0.png + assets/iso/forge.json (the 'v' tile group: ground blocks, flat overlays and
# standing props in the isometric format of tiles.json) and assets/fx/fx_forge.png + assets/fx/forge.json (frame
# effects in the format of fx.json). js/assets.js merges both forge.json files over the packs at load.
# Usage: python3 vesper/tools_forge.py [preview.png]
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ISO, FXD = ROOT + '/assets/iso', ROOT + '/assets/fx'

# ---- helpers ------------------------------------------------------------------------------------------
def rng(seed): return np.random.default_rng(seed)
def hexc(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
def ramp(cols): return np.stack([hexc(c) for c in cols])
def lerp(a, b, t): return a + (b - a) * t

def vnoise(n, cells, seed):
    """Smooth value noise on an n x n grid that tiles, `cells` lattice cells across."""
    r = rng(seed); g = r.random((cells + 1, cells + 1)); g[-1, :] = g[0, :]; g[:, -1] = g[:, 0]
    xs = np.linspace(0, cells, n, endpoint=False); i = xs.astype(int); f = xs - i; f = f * f * (3 - 2 * f)
    a = g[np.ix_(i, i)]; b = g[np.ix_(i, i + 1)]; c = g[np.ix_(i + 1, i)]; d = g[np.ix_(i + 1, i + 1)]
    fy, fx = f[:, None], f[None, :]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def fbm(n, seed, octaves=4, base=4):
    out = np.zeros((n, n)); amp = 1; tot = 0
    for o in range(octaves): out += vnoise(n, base * 2 ** o, seed + o * 31) * amp; tot += amp; amp *= 0.5
    return out / tot

def voronoi(n, k, seed, jitter=0.8):
    """Jittered k x k sites (tiling). Returns nearest-site index, d1, d2 and the vector to the site."""
    r = rng(seed); cs = n / k
    sites = [((i + 0.5 + (r.random() - 0.5) * jitter) * cs, (j + 0.5 + (r.random() - 0.5) * jitter) * cs) for j in range(k) for i in range(k)]
    pts = []
    for (x, y) in sites:
        for dx in (-n, 0, n):
            for dy in (-n, 0, n): pts.append((x + dx, y + dy))
    pts = np.array(pts); yy, xx = np.mgrid[0:n, 0:n] + 0.5
    d = np.hypot(xx[..., None] - pts[:, 0], yy[..., None] - pts[:, 1]); o = np.argsort(d, axis=-1)
    i1 = o[..., 0]; d1 = np.take_along_axis(d, o[..., :1], -1)[..., 0]; d2 = np.take_along_axis(d, o[..., 1:2], -1)[..., 0]
    vx = xx - pts[i1, 0]; vy = yy - pts[i1, 1]
    return (i1 // 9), d1, d2, vx, vy, (o[..., 1] // 9)

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.5
def shade(val, pal, dither=0.6):
    """Map 0..1 to a colour ramp in bands, with ordered dither between bands (the pixel-art look)."""
    h, w = val.shape; b = BAYER[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4]
    idx = np.clip(np.floor(val * len(pal) + b * dither), 0, len(pal) - 1).astype(int)
    return pal[idx]

# Ramps, dark to light.
STONE = ramp(['#1c1418', '#2c2026', '#3e2e32', '#54403f', '#6a5450', '#82695f', '#9a806f'])
OBSID = ramp(['#07050b', '#100c18', '#1a1424', '#251c32', '#332640', '#43344f'])
EARTH = ramp(['#140a0c', '#22121282', '#30181a', '#3f2222', '#4e2c2a', '#5e3832'][:1] + ['#22121a', '#30181a', '#3f2222', '#4e2c2a', '#5e3832'])
BONE = ramp(['#4a3c34', '#7a6a58', '#a8957c', '#cdbb9c', '#e8dcc0'])
BLOOD = ramp(['#1e0306', '#3a060c', '#5a0a14', '#7a101c'])
GLOW = ramp(['#5a0a14', '#a01428', '#e02038', '#ff4a5e', '#ffb0bc', '#ffe8ec'])
IRON = ramp(['#0c0a0e', '#1a171e', '#2a2630', '#3c3744', '#55505e'])
CLOTH = ramp(['#2a0408', '#4a0810', '#6e0c18', '#941422', '#b8202e'])
GOLD = ramp(['#4a3010', '#7a5418', '#b08028', '#d8b048', '#f4dc8c'])

# ---- the isometric block ------------------------------------------------------------------------------
TW, TH, THK = 128, 64, 16   # a ground tile: 128 x 64 diamond, 16 px thick

def to_block(tex, side_tex=None, thick=THK, alpha_tex=None):
    """Map an N x N RGB texture (u right-down, v left-down) onto the top diamond; side faces from the texture's
    edges, darker. Returns RGBA 128 x (64 + thick) with the anchor at the diamond's centre (64, 32)."""
    n = tex.shape[0]; img = np.zeros((TH + thick, TW, 4), np.float32)
    yy, xx = np.mgrid[0:TH, 0:TW] + 0.5
    u = ((xx - 64) / 64 + yy / 32) / 2; v = (yy / 32 - (xx - 64) / 64) / 2
    inside = (u >= 0) & (u < 1) & (v >= 0) & (v < 1)
    ui = np.clip((u * n).astype(int), 0, n - 1); vi = np.clip((v * n).astype(int), 0, n - 1)
    top = tex[vi, ui]
    img[:TH][inside, :3] = top[inside]; img[:TH][inside, 3] = 255 if alpha_tex is None else alpha_tex[vi, ui][inside]
    # A light rim on the two upper edges, a dark one on the lower.
    edge_ul = inside & ((u < 1.5 / n) | (v < 1.5 / n)); edge_lr = inside & ((u > 1 - 1.5 / n) | (v > 1 - 1.5 / n))
    if alpha_tex is None:
        img[:TH][edge_ul, :3] = np.minimum(255, img[:TH][edge_ul, :3] * 1.18 + 6)
        img[:TH][edge_lr, :3] *= 0.8
    if thick:
        # The sides: the block's own colour (its average, a little desaturated), in rough horizontal layers.
        st = tex if side_tex is None else side_tex
        base = st.reshape(-1, 3).mean(0); base = base * 0.8 + base.mean() * 0.2
        nz = fbm(128, 77, 3, 8)
        for x in range(TW):
            if x < 64: y0 = 32 + x / 2; k = 0.62
            else: y0 = 64 - (x - 64) / 2; k = 0.42
            for dy in range(thick):
                y = int(y0 + dy + 0.5)
                if 0 <= y < TH + thick and img[y, x, 3] == 0:
                    layer = 0.86 if (dy in (5, 11)) else 1.0
                    v = 0.82 + (nz[dy * 6 % 128, x] - 0.5) * 0.5
                    c = base * k * layer * v * (1 - dy / thick * 0.3)
                    img[y, x, :3] = c; img[y, x, 3] = 255
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGBA')

# ---- ground textures (N = 64 texels across) -----------------------------------------------------------
N = 64
def tex_flag(seed, blood=0.5):
    cell, d1, d2, vx, vy, _ = voronoi(N, 3, seed, 0.7)
    r = rng(seed); tone = r.random(9)[cell]
    n1 = fbm(N, seed + 1, 4, 4); n2 = fbm(N, seed + 2, 3, 8)
    edge = np.clip((d2 - d1) / 3.2, 0, 1)
    rim = (-(vx + vy) / (np.hypot(vx, vy) + 1e-3)) * 0.5   # lit from the top left
    val = 0.28 + tone * 0.22 + n1 * 0.32 + rim * 0.12 * (1 - np.clip((d2 - d1) / 10, 0, 1))
    val = val * (0.55 + 0.45 * edge)
    col = shade(np.clip(val, 0, 0.999), STONE)
    grout = (d2 - d1) < 1.1
    col[grout] = STONE[0]
    if blood > 0:
        st = (fbm(N, seed + 7, 3, 3) > 0.62 - blood * 0.12) & (n2 > 0.45)
        bl = shade(np.clip(n2 * 0.9, 0, 0.999), BLOOD, 0.4)
        col = np.where(st[..., None], col * 0.35 + bl * 0.65, col)
        col[grout & (fbm(N, seed + 8, 2, 4) > 0.5)] = BLOOD[1]
    # Chips and cracks.
    ck = (np.abs(fbm(N, seed + 9, 3, 6) - 0.5) < 0.012) & (edge > 0.3)
    col[ck] = STONE[1]
    return col

def tex_obsidian(seed, fissure=0.35):
    cell, d1, d2, vx, vy, cell2 = voronoi(N, 4, seed, 0.9)
    r = rng(seed); facet = r.random(16)[cell]
    n1 = fbm(N, seed + 3, 4, 4)
    val = 0.25 + facet * 0.3 + n1 * 0.35 + (-(vx + vy) / (np.hypot(vx, vy) + 1e-3)) * 0.06
    col = shade(np.clip(val, 0, 0.999), OBSID)
    pair = (np.minimum(cell, cell2) * 7 + np.maximum(cell, cell2) * 13) % 100 / 100
    on = pair < fissure; gap = d2 - d1
    core = on & (gap < 0.9); halo = on & (gap < 3.6)
    g = np.clip(1 - gap / 3.6, 0, 1)
    col = np.where(halo[..., None], col * (1 - g[..., None] * 0.7) + GLOW[1] * g[..., None] * 0.7, col)
    col[core] = GLOW[3]
    col[on & (gap < 0.45)] = GLOW[4]
    return col

def tex_bones(seed):
    n1 = fbm(N, seed + 4, 4, 4); n2 = fbm(N, seed + 5, 2, 8)
    col = shade(np.clip(0.2 + n1 * 0.55 + n2 * 0.15, 0, 0.999), EARTH)
    r = rng(seed)
    gr = r.random((N, N)) < 0.05; col[gr] = EARTH[min(4, len(EARTH) - 1)]
    img = Image.fromarray(col.astype(np.uint8)); d = ImageDraw.Draw(img)
    for _ in range(7):   # bones
        x, y, a, L = r.random() * N, r.random() * N, r.random() * math.pi, 7 + r.random() * 6
        dx, dy = math.cos(a) * L / 2, math.sin(a) * L / 2
        d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=tuple(int(c) for c in BONE[1]), width=3)
        d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=tuple(int(c) for c in BONE[3]), width=1)
        for s in (-1, 1): d.ellipse([x + s * dx - 1.5, y + s * dy - 1.5, x + s * dx + 1.5, y + s * dy + 1.5], fill=tuple(int(c) for c in BONE[3]))
    for _ in range(2):   # skulls
        x, y = 8 + r.random() * (N - 16), 8 + r.random() * (N - 16)
        d.ellipse([x - 4, y - 3.5, x + 4, y + 4], fill=tuple(int(c) for c in BONE[2])); d.ellipse([x - 3, y - 3, x + 2, y + 1], fill=tuple(int(c) for c in BONE[4]))
        d.rectangle([x - 2.5, y - 0.5, x - 1, y + 1], fill=tuple(int(c) for c in EARTH[0])); d.rectangle([x + 1, y - 0.5, x + 2.5, y + 1], fill=tuple(int(c) for c in EARTH[0]))
    return np.asarray(img, np.float32)

def tex_rune(seed):
    col = tex_flag(seed, 0.2)
    yy, xx = np.mgrid[0:N, 0:N] + 0.5; rr = np.hypot(xx - N / 2, yy - N / 2); a = np.arctan2(yy - N / 2, xx - N / 2)
    ring = (np.abs(rr - 23) < 1.2) | (np.abs(rr - 17) < 0.9)
    ticks = (rr > 17.5) & (rr < 22.5) & ((np.floor((a + math.pi) / (2 * math.pi) * 24) % 2 == 0) & (np.abs(((a + math.pi) / (2 * math.pi) * 24) % 1 - 0.5) < 0.14))
    glyph = (rr < 9) & ((np.abs(xx - N / 2) < 0.9) | (np.abs(yy - N / 2) < 0.9) | (np.abs(rr - 6) < 0.8))
    halo = (np.abs(rr - 23) < 3.5) | (np.abs(rr - 17) < 2.6)
    col = np.where(halo[..., None], col * 0.6 + GLOW[0] * 0.4, col)
    col[ring | ticks | glyph] = GLOW[3]
    return col

def tex_ash(seed):
    n1 = fbm(N, seed + 6, 4, 4)
    return shade(np.clip(0.15 + n1 * 0.7, 0, 0.999), ramp(['#120c10', '#1e171c', '#2a2228', '#3a3036', '#4c4046']))

# ---- flat overlays (decals on the ground, transparent elsewhere) --------------------------------------
def ov_blood(seed):
    n1 = fbm(N, seed + 11, 3, 3); yy, xx = np.mgrid[0:N, 0:N] + 0.5; rr = np.hypot((xx - N / 2) / 26, (yy - N / 2) / 26)
    m = (n1 * 0.9 + (1 - rr) * 0.9) > 0.95
    col = shade(np.clip(n1, 0, 0.999), BLOOD, 0.3); col[m & (fbm(N, seed + 12, 2, 6) > 0.7)] = BLOOD[3]
    a = np.where(m, 235, 0).astype(np.float32)
    return col, a

def ov_cracks(seed):
    cell, d1, d2, vx, vy, cell2 = voronoi(N, 3, seed, 1.0)
    pair = (np.minimum(cell, cell2) * 5 + np.maximum(cell, cell2) * 11) % 10 / 10
    gap = d2 - d1; on = pair < 0.6
    a = np.where(on & (gap < 3.4), np.clip(1 - gap / 3.4, 0, 1) * 200, 0).astype(np.float32)
    col = np.zeros((N, N, 3), np.float32) + GLOW[1]; col[on & (gap < 1.0)] = GLOW[3]; col[on & (gap < 0.5)] = GLOW[4]
    a[on & (gap < 1.0)] = 255
    return col, a

def ov_ash(seed):
    n1 = fbm(N, seed + 13, 4, 5); m = n1 > 0.58
    col = shade(np.clip(n1, 0, 0.999), ramp(['#3a3236', '#554a4e', '#71666a', '#8e8286']), 0.5)
    return col, np.where(m, np.clip((n1 - 0.58) * 900, 0, 200), 0).astype(np.float32)

def ov_bones(seed):
    t = tex_bones(seed); base = tex_bones(seed + 999) * 0   # bones only: compare against plain earth
    earth = np.asarray(Image.fromarray(shade(np.clip(0.2 + fbm(N, seed + 4, 4, 4) * 0.55 + fbm(N, seed + 5, 2, 8) * 0.15, 0, 0.999), EARTH).astype(np.uint8)), np.float32)
    diff = np.abs(t - earth).sum(-1) > 40
    return t, np.where(diff, 255, 0).astype(np.float32)

# ---- standing props (drawn upright, anchor = the foot's centre on the ground) -------------------------
def canvas(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def C(c, a=255): c = hexc(c) if isinstance(c, str) else c; return (int(c[0]), int(c[1]), int(c[2]), a)
def texture_poly(img, poly, pal, seed, base, spread=0.35, scale=6):
    """Fill a polygon with a banded, dithered noise texture from a ramp (base 0..1 sets the overall tone)."""
    w, h = img.size; m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).polygon(poly, fill=255)
    nz = fbm(max(w, h), seed, 3, scale)[:h, :w]
    col = shade(np.clip(base + (nz - 0.5) * spread, 0, 0.999), pal)
    layer = Image.fromarray(np.dstack([col, np.asarray(m)]).astype(np.uint8), 'RGBA'); img.alpha_composite(layer)

def iso_box(img, cx, by, hw, hh, height, pal, seed, top_base=0.75, l_base=0.5, r_base=0.3):
    """A block: hw/hh the half sizes of its diamond footprint, `height` tall, its foot's centre at (cx, by)."""
    top = [(cx, by - hh * 2 - height), (cx + hw, by - hh - height), (cx, by - height), (cx - hw, by - hh - height)]
    left = [(cx - hw, by - hh - height), (cx, by - height), (cx, by), (cx - hw, by - hh)]
    right = [(cx, by - height), (cx + hw, by - hh - height), (cx + hw, by - hh), (cx, by)]
    texture_poly(img, left, pal, seed, l_base); texture_poly(img, right, pal, seed + 1, r_base); texture_poly(img, top, pal, seed + 2, top_base)
    return top, left, right

def glow(img, x, y, r, col, a=0.6):
    w, h = img.size; yy, xx = np.mgrid[0:h, 0:w]; g = np.clip(1 - np.hypot(xx - x, yy - y) / r, 0, 1) ** 2 * a
    c = hexc(col); layer = np.zeros((h, w, 4), np.float32); layer[..., :3] = c; layer[..., 3] = g * 255
    img.alpha_composite(Image.fromarray(layer.astype(np.uint8), 'RGBA'))

def edge_dark(img, col='#0a0608'):
    """A one-pixel dark edge round the silhouette (the props' pixel outline)."""
    a = np.asarray(img)[..., 3] > 40; e = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
    arr = np.asarray(img).copy(); arr[e, :3] = (arr[e, :3] * 0.45 + hexc(col) * 0.55).astype(np.uint8); return Image.fromarray(arr, 'RGBA')

def prop_obelisk(seed):
    W, H = 72, 176; img = canvas(W, H); cx, by = 36, 166
    iso_box(img, cx, by, 26, 13, 12, STONE, seed, 0.7, 0.5, 0.3)   # the plinth
    b = by - 12; hw0, hw1, ht = 15, 9, 120
    left = [(cx - hw0, b - hw0 / 2), (cx, b), (cx, b - ht), (cx - hw1, b - ht - hw1 / 2)]
    right = [(cx, b), (cx + hw0, b - hw0 / 2), (cx + hw1, b - ht - hw1 / 2), (cx, b - ht)]
    texture_poly(img, left, OBSID, seed + 3, 0.62, 0.3, 8); texture_poly(img, right, OBSID, seed + 4, 0.32, 0.3, 8)
    tip = (cx, b - ht - 24); d = ImageDraw.Draw(img)
    d.polygon([(cx - hw1, b - ht - hw1 / 2), (cx, b - ht), tip], fill=C(OBSID[4])); d.polygon([(cx, b - ht), (cx + hw1, b - ht - hw1 / 2), tip], fill=C(OBSID[2]))
    for i in range(6):   # runes down the lit face, glowing
        y = b - 18 - i * 17; x = cx - 7 + i * 0.4
        glow(img, x, y, 9, '#ff2a44', 0.35); d = ImageDraw.Draw(img)
        g = [(x - 2, y - 4, x + 2, y - 4), (x, y - 4, x, y + 4), (x - 2, y + 1, x + 2, y + 3)][i % 3]
        d.line([(g[0], g[1]), (g[2], g[3])], fill=C(GLOW[3]), width=1); d.line([(x, y - 4), (x, y + 4)], fill=C(GLOW[4]), width=1)
    glow(img, tip[0], tip[1] + 4, 12, '#ff2a44', 0.5)
    return edge_dark(img), (-36, -166)

def prop_pillar(seed):
    W, H = 64, 150; img = canvas(W, H); cx, by = 32, 140
    iso_box(img, cx, by, 24, 12, 10, STONE, seed, 0.72, 0.5, 0.3)
    r = rng(seed); b = by - 10; R = 13; ht = 92
    tops = [ht - (abs(math.sin(x * 0.7 + seed)) * 14 + r.random() * 8 if x > -R // 2 else 0) for x in range(-R, R + 1)]
    arr = np.asarray(img).copy()
    for i, x in enumerate(range(-R, R + 1)):
        lit = math.cos((x / R) * math.pi / 2 + 0.5); hgt = int(tops[i])
        for y in range(hgt):
            yy = b - y - int((1 - (x / R) ** 2) ** 0.5 * 4)
            band = 0.15 if y % 22 == 0 else 0
            v = np.clip(0.25 + lit * 0.5 + (fbm(64, seed + 5, 2, 8)[y % 64, (x + 32) % 64] - 0.5) * 0.25 - band, 0, 0.999)
            idx = int(v * len(STONE)); arr[yy, cx + x, :3] = STONE[min(idx, len(STONE) - 1)]; arr[yy, cx + x, 3] = 255
            if x % 4 == 0 and y % 22 != 0 and v > 0.55: arr[yy, cx + x, :3] = STONE[min(idx + 1, len(STONE) - 1)]
    img = Image.fromarray(arr, 'RGBA'); d = ImageDraw.Draw(img)
    for _ in range(6):   # rubble at the foot
        x, y, s = cx + (r.random() - 0.5) * 50, by - 2 + (r.random() - 0.5) * 8, 2 + r.random() * 4
        d.polygon([(x - s, y), (x, y - s), (x + s, y), (x, y + s * 0.5)], fill=C(STONE[3])); d.line([(x - s, y), (x, y - s)], fill=C(STONE[5]))
    return edge_dark(img), (-32, -140)

def skull(d, x, y, s, lit=1.0):
    d.ellipse([x - s, y - s * 0.95, x + s, y + s * 0.9], fill=C(BONE[1])); d.ellipse([x - s * 0.85, y - s * 0.9, x + s * 0.6, y + s * 0.4], fill=C(BONE[3] if lit > 0.5 else BONE[2]))
    d.ellipse([x - s * 0.55, y - s * 0.75, x - s * 0.05, y - s * 0.3], fill=C(BONE[4]))
    for ex in (-0.42, 0.32): d.ellipse([x + ex * s - s * 0.26, y - s * 0.05, x + ex * s + s * 0.26, y + s * 0.38], fill=C('#140a0c'))
    d.rectangle([x - s * 0.45, y + s * 0.62, x + s * 0.45, y + s * 0.95], fill=C(BONE[2]))
    for k in range(3): d.line([(x - s * 0.3 + k * s * 0.3, y + s * 0.65), (x - s * 0.3 + k * s * 0.3, y + s * 0.95)], fill=C(BONE[0]))

def prop_skulls(seed):
    W, H = 70, 56; img = canvas(W, H); d = ImageDraw.Draw(img); r = rng(seed); cx, by = 35, 50
    d.ellipse([cx - 30, by - 10, cx + 30, by + 4], fill=C(EARTH[1], 200))
    rows = [(0, 6, 5.2), (9, 4, 5.4), (18, 3, 5.6), (27, 1, 6)]
    for (dy, n, s) in rows:
        for i in range(n):
            x = cx + (i - (n - 1) / 2) * s * 1.9 + (r.random() - 0.5) * 3; y = by - 6 - dy + (r.random() - 0.5) * 2
            skull(d, x, y, s, 1 if i < n / 2 else 0.4)
    return edge_dark(img), (-35, -50)

def bone(d, x0, y0, x1, y1, w=3):
    d.line([(x0, y0), (x1, y1)], fill=C(BONE[1]), width=w + 1); d.line([(x0, y0), (x1, y1)], fill=C(BONE[3]), width=max(1, w - 1))
    for (x, y) in ((x0, y0), (x1, y1)): d.ellipse([x - w * 0.8, y - w * 0.8, x + w * 0.8, y + w * 0.8], fill=C(BONE[3]))

def prop_bonespire(seed):
    W, H = 70, 130; img = canvas(W, H); d = ImageDraw.Draw(img); r = rng(seed); cx, by = 35, 124
    d.ellipse([cx - 28, by - 8, cx + 28, by + 4], fill=C(EARTH[1], 210))
    for i in range(11):
        a = -math.pi / 2 + (r.random() - 0.5) * 0.55; L = 60 + r.random() * 55; x0 = cx + (r.random() - 0.5) * 30
        bone(d, x0, by - 2, x0 + math.cos(a) * L, by - 2 + math.sin(a) * L, 3 if L > 80 else 2)
    for i in range(5): skull(d, cx + (i - 2) * 9 + (r.random() - 0.5) * 3, by - 6 - (i % 2) * 5, 4.4, 1 if i < 3 else 0.4)
    return edge_dark(img), (-35, -124)

def prop_crystal(seed):
    W, H = 64, 92; img = canvas(W, H); r = rng(seed); cx, by = 32, 84
    glow(img, cx, by - 30, 34, '#ff2a44', 0.45)
    d = ImageDraw.Draw(img); d.ellipse([cx - 22, by - 6, cx + 22, by + 4], fill=C(OBSID[1], 230))
    for i, (dx, L, a) in enumerate([(-12, 34, -0.35), (12, 30, 0.4), (-4, 58, -0.08), (6, 44, 0.16), (-18, 20, -0.7)]):
        x0, y0 = cx + dx, by - 2; ang = -math.pi / 2 + a; x1, y1 = x0 + math.cos(ang) * L, y0 + math.sin(ang) * L; w = 5 + L / 14
        nx, ny = -math.sin(ang) * w, math.cos(ang) * w
        tip = (x1 + math.cos(ang) * w * 1.4, y1 + math.sin(ang) * w * 1.4)
        lit = [(x0 + nx, y0 + ny), (x0, y0), (x1, y1), (x1 + nx, y1 + ny), (tip[0] + nx * 0.3, tip[1] + ny * 0.3)]
        dark = [(x0, y0), (x0 - nx, y0 - ny), (x1 - nx, y1 - ny), tip, (x1, y1)]
        d.polygon(dark, fill=C(GLOW[0])); d.polygon(lit, fill=C(GLOW[2])); d.line([(x0, y0), (x1, y1), tip], fill=C(GLOW[4]))
        d.line([(x0 + nx * 0.5, y0 + ny * 0.5), (x1 + nx * 0.5, y1 + ny * 0.5)], fill=C(GLOW[3]))
    return edge_dark(img, '#2a0006'), (-32, -84)

def prop_banner(seed):
    W, H = 56, 150; img = canvas(W, H); d = ImageDraw.Draw(img); cx, by = 20, 146
    d.rectangle([cx - 1, by - 140, cx + 1, by], fill=C(IRON[2])); d.line([(cx - 1, by - 140), (cx - 1, by)], fill=C(IRON[4]))
    d.line([(cx - 2, by - 132), (cx + 30, by - 132)], fill=C(IRON[3]), width=2); d.ellipse([cx - 3, by - 145, cx + 3, by - 139], fill=C(GOLD[3]))
    top, bot = by - 130, by - 58
    pts = [(cx + 1, top), (cx + 30, top)]
    for i in range(7): pts.append((cx + 30 - i * 4.8, bot + (6 if i % 2 else -2) + math.sin(i * 1.7 + seed) * 2))
    pts.append((cx + 1, bot + 4))
    texture_poly(img, pts, CLOTH, seed, 0.55, 0.3, 6); d = ImageDraw.Draw(img)
    for i in range(4): d.line([(cx + 6 + i * 6, top + 2), (cx + 4 + i * 6, bot - 4)], fill=C(CLOTH[1]))   # folds
    mx, my = cx + 16, top + 26
    d.ellipse([mx - 8, my - 8, mx + 8, my + 8], fill=C(GOLD[3])); d.ellipse([mx - 4, my - 9, mx + 10, my + 6], fill=C(CLOTH[2]))   # the crescent
    d.line([(mx - 9, my + 3), (mx + 9, my - 4)], fill=C(GLOW[3]), width=1)   # the cut across it
    return edge_dark(img), (-20, -146)

def prop_candles(seed):
    W, H = 48, 44; img = canvas(W, H); r = rng(seed); cx, by = 24, 40
    glow(img, cx, by - 16, 22, '#ffb050', 0.4); d = ImageDraw.Draw(img)
    d.ellipse([cx - 18, by - 5, cx + 18, by + 3], fill=C('#d8c8a8', 120))
    for i in range(6):
        x = cx + (i - 2.5) * 6 + (r.random() - 0.5) * 2; h = 8 + r.random() * 12; y = by - (i % 2) * 3
        d.rectangle([x - 2, y - h, x + 2, y], fill=C('#d8ccb0')); d.line([(x - 2, y - h), (x - 2, y)], fill=C('#f2e8d4')); d.line([(x + 2, y - h), (x + 2, y)], fill=C('#a89878'))
        d.ellipse([x - 1.5, y - h - 6, x + 1.5, y - h - 0.5], fill=C('#ffb050')); d.ellipse([x - 0.8, y - h - 4, x + 0.8, y - h - 1], fill=C('#fff4c8'))
    return edge_dark(img, '#2a1c10'), (-24, -40)

def prop_brazier(seed):
    W, H = 60, 70; img = canvas(W, H); d = ImageDraw.Draw(img); cx, by = 30, 66
    for a in (-1, 0, 1): d.line([(cx + a * 14, by), (cx + a * 6, by - 30)], fill=C(IRON[2]), width=3)
    d.ellipse([cx - 22, by - 44, cx + 22, by - 28], fill=C(IRON[1])); d.chord([cx - 22, by - 50, cx + 22, by - 24], 0, 180, fill=C(IRON[2]))
    d.ellipse([cx - 19, by - 46, cx + 19, by - 34], fill=C('#3a0a0a'))
    r = rng(seed)
    for _ in range(26): x, y = cx + (r.random() - 0.5) * 32, by - 40 + (r.random() - 0.5) * 8; d.point((x, y), fill=C(['#ff6a2a', '#ffb050', '#c8301a'][int(r.random() * 3)]))
    d.line([(cx - 22, by - 37), (cx + 22, by - 37)], fill=C(IRON[4]))
    glow(img, cx, by - 40, 26, '#ff7a30', 0.4)
    return edge_dark(img), (-30, -66)

def prop_altar(seed):
    W, H = 120, 96; img = canvas(W, H); cx, by = 60, 88
    iso_box(img, cx, by, 46, 23, 26, STONE, seed, 0.72, 0.52, 0.3)
    top, left, right = iso_box(img, cx, by - 26, 52, 26, 6, STONE, seed + 9, 0.82, 0.6, 0.38)
    d = ImageDraw.Draw(img); mx, my = cx - 23, by - 18
    glow(img, mx, my, 16, '#ff2a44', 0.5); d = ImageDraw.Draw(img)
    d.ellipse([mx - 7, my - 7, mx + 7, my + 7], outline=C(GLOW[3])); d.line([(mx - 8, my + 3), (mx + 8, my - 3)], fill=C(GLOW[4]))
    for i in range(3): x = cx + 8 + i * 10; y = by - 50 - i * 2; d.rectangle([x - 1, y - 6, x + 1, y], fill=C('#d8ccb0')); d.point((x, y - 8), fill=C('#ffd080'))
    blood = [(cx - 8, by - 44), (cx + 10, by - 52), (cx + 22, by - 46), (cx + 4, by - 40)]; d.polygon(blood, fill=C(BLOOD[2], 220))
    return edge_dark(img), (-60, -88)

def prop_grave(seed, cross=False):
    W, H = 40, 56; img = canvas(W, H); d = ImageDraw.Draw(img); cx, by = 20, 52; r = rng(seed)
    d.ellipse([cx - 14, by - 6, cx + 14, by + 3], fill=C(EARTH[2], 220))
    if cross:
        d.rectangle([cx - 2, by - 40, cx + 2, by - 2], fill=C(STONE[3])); d.rectangle([cx - 10, by - 32, cx + 10, by - 28], fill=C(STONE[3]))
        d.line([(cx - 2, by - 40), (cx - 2, by - 2)], fill=C(STONE[5])); d.line([(cx - 10, by - 32), (cx + 10, by - 32)], fill=C(STONE[5]))
    else:
        texture_poly(img, [(cx - 10, by - 2), (cx - 10, by - 28), (cx - 6, by - 34), (cx + 6, by - 34), (cx + 10, by - 28), (cx + 10, by - 2)], STONE, seed, 0.55, 0.3, 5)
        d = ImageDraw.Draw(img); d.line([(cx - 4, by - 24), (cx + 4, by - 24)], fill=C(STONE[1])); d.line([(cx, by - 28), (cx, by - 16)], fill=C(STONE[1]))
        if r.random() < 0.6: d.line([(cx + 3, by - 34), (cx - 2, by - 18)], fill=C(STONE[1]))   # cracked
    return edge_dark(img), (-20, -52)

# ---- packing ------------------------------------------------------------------------------------------
def pack(items, width=2048):
    """Shelf-pack [(key, Image, (ox, oy))] into one page. Returns the page and {key: [x, y, w, h, ox, oy]}."""
    items = sorted(items, key=lambda t: -t[1].height); x = y = row = 0; place = {}
    for k, im, (ox, oy) in items:
        if x + im.width > width: x = 0; y += row + 1; row = 0
        place[k] = (x, y, im.width, im.height, ox, oy); x += im.width + 1; row = max(row, im.height)
    page = Image.new('RGBA', (width, y + row + 1), (0, 0, 0, 0))
    for k, im, _ in items: p = place[k]; page.alpha_composite(im, (p[0], p[1]))
    return page, place

def build_tiles():
    items = []
    def ground(name, tex):
        for i, d4 in enumerate(['E', 'N', 'S', 'W']):
            items.append((f'v:{name}_{d4}', to_block(np.rot90(tex, i).copy()), (-64, -32)))
    def over(name, ca):
        col, a = ca
        for i, d2 in enumerate(['E', 'N']):
            items.append((f'v:{name}_{d2}', to_block(np.rot90(col, i).copy(), thick=0, alpha_tex=np.rot90(a, i).copy()), (-64, -32)))
    for k in range(4): ground(f'Flag A{k + 1}', tex_flag(100 + k * 17, 0.25 + 0.2 * (k % 3)))
    for k in range(3): ground(f'Obsidian B{k + 1}', tex_obsidian(200 + k * 13, [0.15, 0.3, 0.45][k]))
    for k in range(2): ground(f'Bone C{k + 1}', tex_bones(300 + k * 11))
    ground('Rune D1', tex_rune(400))
    for k in range(2): ground(f'Ash E{k + 1}', tex_ash(500 + k * 7))
    for k in range(3): over(f'Blood F{k + 1}', ov_blood(600 + k * 9))
    for k in range(3): over(f'Crack G{k + 1}', ov_cracks(700 + k * 9))
    for k in range(2): over(f'Ashdrift H{k + 1}', ov_ash(800 + k * 9))
    for k in range(2): over(f'Bones I{k + 1}', ov_bones(900 + k * 9))
    props = [('Obelisk', prop_obelisk(11)), ('Pillar', prop_pillar(12)), ('Skulls', prop_skulls(13)), ('Bonespire', prop_bonespire(14)),
             ('Crystal', prop_crystal(15)), ('Banner', prop_banner(16)), ('Candles', prop_candles(17)), ('Brazier', prop_brazier(18)),
             ('Altar', prop_altar(19)), ('Grave', prop_grave(20)), ('Gravecross', prop_grave(21, True))]
    for name, (im, anchor) in props:
        for d2 in ['E', 'S']: items.append((f'v:{name}_{d2}', im if d2 == 'E' else im.transpose(Image.FLIP_LEFT_RIGHT), (anchor[0] if d2 == 'E' else -(im.width + anchor[0]), anchor[1])))
    page, place = pack(items)
    page.save(ISO + '/tiles_v0.png', optimize=True)
    tiles = {k: ['v0', p[0], p[1], p[2], p[3], p[4], p[5]] for k, p in place.items()}
    json.dump({'pages': {'v': 1}, 'tiles': tiles, 'anims': {}}, open(ISO + '/forge.json', 'w'))
    print('tiles:', len(tiles), 'page', page.size)
    return items


# ---- effects (frame animations in the fx.json format) -------------------------------------------------
FXPAL = {'red': ramp(['#3a040c', '#7a0c1a', '#c01428', '#ff3048', '#ff8a98', '#ffe0e4', '#ffffff']),
         'ember': ramp(['#4a1004', '#9a2a08', '#e05010', '#ff8a30', '#ffd080', '#fff4d8']),
         'dust': ramp(['#2a1e22', '#4a3a3e', '#6e5c5e', '#94807e'])}
def frame(w, h): return np.zeros((h, w, 4), np.float32)
def put(f, x, y, col, a=255):
    x, y = int(round(x)), int(round(y)); h, w = f.shape[:2]
    if 0 <= x < w and 0 <= y < h: f[y, x, :3] = col; f[y, x, 3] = max(f[y, x, 3], a)
def blob(f, cx, cy, r, col, a=255, sq=1.0):
    h, w = f.shape[:2]; yy, xx = np.mgrid[0:h, 0:w] + 0.5; m = np.hypot(xx - cx, (yy - cy) / sq) <= r
    f[m, :3] = col; f[m, 3] = np.maximum(f[m, 3], a)
def band(f, cx, cy, r0, r1, col, a=255, sq=1.0, a0=None, a1=None):
    h, w = f.shape[:2]; yy, xx = np.mgrid[0:h, 0:w] + 0.5; d = np.hypot(xx - cx, (yy - cy) / sq); m = (d >= r0) & (d <= r1)
    if a0 is not None: ang = np.arctan2(yy - cy, xx - cx); m &= ((ang - a0) % (2 * math.pi)) <= ((a1 - a0) % (2 * math.pi))
    f[m, :3] = col; f[m, 3] = np.maximum(f[m, 3], a)
def fade(f, k): f[..., 3] *= k; return f

def fx_impact(seed):
    # A round burst (no cross, no dot in a ring): a white-hot core, a thick red shock ring and shards flung out.
    r = rng(seed); P = FXPAL['red']; out = []; shards = [(r.random() * 6.283, 0.6 + r.random() * 0.6) for _ in range(12)]
    for i in range(9):
        f = frame(64, 64); k = i / 8
        if i == 0: blob(f, 32, 32, 12, P[4]); blob(f, 32, 32, 8, P[6])
        elif i == 1: blob(f, 32, 32, 15, P[3]); blob(f, 32, 32, 11, P[4]); blob(f, 32, 32, 6, P[6])
        else:
            rr = 10 + 20 * (1 - (1 - k) ** 2); wdt = 7 * (1 - k) + 2
            band(f, 32, 32, rr - wdt, rr, P[3] if k < 0.55 else P[2], 255 * (1 - k * 0.7))
            band(f, 32, 32, rr - wdt * 0.45, rr, P[4] if k < 0.5 else P[3], 255 * (1 - k * 0.8))
            if i == 2: blob(f, 32, 32, rr - wdt, P[2], 200)
            for (a, sp) in shards:
                d = 8 + 26 * sp * (1 - (1 - k) ** 1.5); x, y = 32 + math.cos(a) * d, 32 + math.sin(a) * d
                if k < 0.9: put(f, x, y, P[5] if k < 0.4 else P[3]); put(f, x - math.cos(a), y - math.sin(a), P[2]); put(f, x - 2 * math.cos(a), y - 2 * math.sin(a), P[1], 180)
        out.append(f)
    return out, 22, False

def fx_slash(seed):
    P = FXPAL['red']; out = []
    for i in range(7):
        f = frame(72, 72); k = i / 6; a0 = -2.2; a1 = a0 + 3.4 * min(1, (i + 1) / 3)
        tail = max(a0, a1 - 2.6)
        if k < 0.9:
            band(f, 36, 40, 22, 30 - k * 6, P[2], 255 * (1 - k * 0.7), 1.0, tail, a1)
            band(f, 36, 40, 26, 30 - k * 4, P[4], 255 * (1 - k), 1.0, max(tail, a1 - 1.6), a1)
            band(f, 36, 40, 28, 30, P[6], 255 * (1 - k), 1.0, max(tail, a1 - 0.7), a1)
        for j in range(6):
            a = a1 - j * 0.45; d = 30 + k * 10 + j; put(f, 36 + math.cos(a) * d, 40 + math.sin(a) * d, P[4], 255 * (1 - k))
        out.append(f)
    return out, 24, False

def fx_blood(seed):
    r = rng(seed); P = BLOOD; out = []; drops = [((r.random() - 0.5) * 3.0 - 1.57, 18 + r.random() * 34, 1 + int(r.random() * 2)) for _ in range(16)]
    for i in range(8):
        f = frame(64, 56); t = i / 7
        for (a, v, s) in drops:
            x = 32 + math.cos(a) * v * t; y = 34 + math.sin(a) * v * t + 40 * t * t
            if y < 54: blob(f, x, y, s, P[3] if t < 0.5 else P[2], 255 * (1 - t * 0.5))
        if i >= 4: blob(f, 32, 50, 3 + (i - 4) * 2.5, P[1], 200, 0.35)
        out.append(f)
    return out, 20, False

def fx_shock(seed):
    r = rng(seed); D = FXPAL['dust']; P = FXPAL['red']; out = []; puffs = [(r.random() * 6.283, r.random()) for _ in range(14)]
    for i in range(10):
        f = frame(128, 64); k = i / 9; rr = 8 + 54 * (1 - (1 - k) ** 2)
        band(f, 64, 32, rr - 4 * (1 - k) - 1.5, rr, D[3] if k < 0.5 else D[2], 230 * (1 - k), 0.5)
        if k < 0.4: band(f, 64, 32, rr - 1.5, rr, P[4], 255, 0.5)
        for (a, o) in puffs:
            d = rr * (0.8 + o * 0.25); x, y = 64 + math.cos(a) * d, 32 + math.sin(a) * d * 0.5 - k * 6 * o
            blob(f, x, y, 2 + 3 * k, D[1 + int(o * 2)], 200 * (1 - k))
        out.append(f)
    return out, 20, False

def fx_soul(seed):
    r = rng(seed); P = FXPAL['red']; out = []; ash = [(r.random() * 16 - 8, r.random()) for _ in range(10)]
    for i in range(12):
        f = frame(32, 64); t = i / 11; cy = 52 - t * 36; sz = 5 * (1 - t * 0.6)
        if t < 0.9:
            for j in range(5):
                yy = cy + j * 3; ww = sz * (1 - j / 6) + math.sin(t * 9 + j) * 1.2
                blob(f, 16 + math.sin(t * 7 + j * 0.9) * 2, yy, max(0.6, ww), P[2 + (j < 2) + (j < 1)], 230 * (1 - t))
            blob(f, 16 + math.sin(t * 7) * 2, cy, max(0.8, sz * 0.45), P[5], 255 * (1 - t))
        for (dx, o) in ash:
            y = 56 - t * (30 + o * 30); put(f, 16 + dx + math.sin(t * 6 + o * 9) * 2, y, P[3] if o > 0.5 else P[1], 220 * (1 - t))
        out.append(f)
    return out, 16, False

def fx_crack(seed):
    out = []; col, a = ov_cracks(seed)
    full = np.asarray(to_block(col, thick=0, alpha_tex=a), np.float32)
    yy, xx = np.mgrid[0:64, 0:128]; d = np.hypot((xx - 64) / 64, (yy - 32) / 32)
    for i in range(8):
        k = i / 7; reach = min(1, k * 1.8); f = full.copy(); m = d > reach; f[m, 3] = 0
        if k > 0.55: f[..., 3] *= (1 - (k - 0.55) / 0.45)
        out.append(f)
    return out, 16, False

def fx_rift(seed):
    P = FXPAL['red']; out = []; r = rng(seed)
    for i in range(8):
        f = frame(48, 96); t = i / 8
        blob(f, 24, 48, 15, P[1], 160, 2.6); blob(f, 24, 48, 11, P[0], 255, 2.8); blob(f, 24, 48, 6, hexc('#07020a'), 255, 3.4)
        for j in range(14):
            a = t * 6.283 + j * 0.45; rr = 6 + (j % 4) * 2.5; x, y = 24 + math.cos(a) * rr, 48 + math.sin(a) * rr * 2.8
            put(f, x, y, P[3 + (j % 3 == 0)])
        band(f, 24, 48, 14, 16, P[3], 255, 2.6); band(f, 24, 48, 15, 16, P[5], 255, 2.6)
        out.append(f)
    return out, 12, True

def fx_pillar(seed):
    P = FXPAL['red']; out = []
    for i in range(8):
        f = frame(48, 160); k = i / 7
        top = 0 if i > 1 else 160 - (i + 1) * 80; w = (6 + 10 * min(1, k * 2)) * (1 - max(0, k - 0.5) * 1.6)
        if w > 0.5:
            f[top:150, int(24 - w):int(24 + w) + 1, :3] = P[2]; f[top:150, int(24 - w):int(24 + w) + 1, 3] = 200 * (1 - k * 0.5)
            f[top:150, int(24 - w * 0.5):int(24 + w * 0.5) + 1, :3] = P[4]; f[top:150, int(24 - w * 0.5):int(24 + w * 0.5) + 1, 3] = 255 * (1 - k * 0.4)
            f[top:150, int(24 - w * 0.2):int(24 + w * 0.2) + 1, :3] = P[6]
        if i >= 1: blob(f, 24, 150, 6 + 16 * k, P[3], 230 * (1 - k), 0.4); blob(f, 24, 150, 3 + 8 * k, P[5], 255 * (1 - k), 0.4)
        out.append(f)
    return out, 18, False

def fx_embers(seed):
    r = rng(seed); E = FXPAL['ember']; out = []; ps = [(r.random() * 64, r.random(), r.random()) for _ in range(18)]
    for i in range(12):
        f = frame(64, 96); t = i / 12
        for (x0, ph, sp) in ps:
            q = (t + ph) % 1; y = 92 - q * 90; x = x0 + math.sin(q * 6 + ph * 9) * 4
            put(f, x, y, E[3 + int(sp * 2)], 255 * (1 - q)); 
            if sp > 0.6: put(f, x, y + 1, E[2], 200 * (1 - q))
        out.append(f)
    return out, 14, True

def fx_blast(seed):
    r = rng(seed); E = FXPAL['ember']; P = FXPAL['red']; D = FXPAL['dust']; out = []
    debris = [(r.random() * 6.283, 0.5 + r.random()) for _ in range(16)]
    for i in range(12):
        f = frame(128, 128); k = i / 11
        if i < 2: blob(f, 64, 70, 18 + i * 10, P[6])
        rr = 10 + 46 * (1 - (1 - k) ** 2)
        if k < 0.75:
            blob(f, 64, 70 - k * 14, rr * 0.75, E[1] if k > 0.4 else E[2], 255 * (1 - k))
            blob(f, 64, 70 - k * 14, rr * 0.5, E[3] if k < 0.4 else E[2], 255 * (1 - k))
            blob(f, 64, 70 - k * 16, rr * 0.28, E[5] if k < 0.25 else E[4], 255 * (1 - k))
        band(f, 64, 92, rr * 1.1 - 3, rr * 1.1, D[3], 220 * (1 - k), 0.4)
        for j in range(8):
            a = j / 8 * 6.283 + k; sx, sy = 64 + math.cos(a) * rr * 0.9, 70 - k * 20 + math.sin(a) * rr * 0.55
            if k > 0.3: blob(f, sx, sy, 4 + 6 * k, D[1 + j % 2], 200 * (1 - k))
        for (a, sp) in debris:
            d = 6 + 56 * sp * (1 - (1 - k) ** 1.5); x, y = 64 + math.cos(a) * d, 70 + math.sin(a) * d * 0.7 + 30 * k * k
            if k < 0.9: put(f, x, y, D[3]); put(f, x + 1, y, D[2])
        out.append(f)
    return out, 18, False

def build_fx():
    makers = {'v_impact': fx_impact(1), 'v_slash': fx_slash(2), 'v_blood': fx_blood(3), 'v_shock': fx_shock(4), 'v_soul': fx_soul(5), 'v_crack': fx_crack(6),
              'v_rift': fx_rift(7), 'v_pillar': fx_pillar(8), 'v_embers': fx_embers(9), 'v_blast': fx_blast(10)}
    items, meta = [], {}
    for name, (frames, fps, loop) in makers.items():
        h, w = frames[0].shape[:2]; meta[name] = {'fps': fps, 'loop': loop, 'size': [w, h], 'anchor': [w // 2, h // 2] if name not in ('v_pillar', 'v_soul', 'v_rift', 'v_embers') else [w // 2, h - 8 if name != 'v_rift' else h // 2], 'frames': []}
        for i, f in enumerate(frames):
            im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), 'RGBA'); bb = im.getbbox() or (0, 0, 1, 1)
            items.append((f'{name}/{i}', im.crop(bb), (bb[0], bb[1])))
    page, place = pack(items, 1024)
    page.save(FXD + '/fx_forge.png', optimize=True)
    fx = {}
    for name, m in meta.items():
        m['frames'] = [[0, place[f'{name}/{i}'][0], place[f'{name}/{i}'][1], place[f'{name}/{i}'][2], place[f'{name}/{i}'][3], place[f'{name}/{i}'][4], place[f'{name}/{i}'][5]] for i in range(len([k for k in place if k.startswith(name + '/')]))]
        fx[name] = m
    json.dump({'pages': ['fx_forge.png'], 'fx': fx}, open(FXD + '/forge.json', 'w'))
    print('fx:', len(fx), 'page', page.size)
    return makers

if __name__ == '__main__':
    items = build_tiles()
    makers = build_fx()
    if len(sys.argv) > 1:
        sheet = Image.new('RGBA', (1600, 900), (38, 28, 40, 255)); x = y = 10; row = 0
        for k, im, _ in items:
            if not (k.endswith('_E')): continue
            if x + im.width > 1590: x = 10; y += row + 14; row = 0
            sheet.alpha_composite(im, (x, y)); x += im.width + 10; row = max(row, im.height)
        y += row + 14
        for name, (frames, fps, loop) in makers.items():
            x = 10; hh = frames[0].shape[0]
            for f in frames[:10]:
                im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), 'RGBA'); sheet.alpha_composite(im, (x, y)); x += im.width + 4
            y += hh + 6
            if y > 860: break
        sheet.crop((0, 0, 1600, min(900, y + 4))).save(sys.argv[1])
