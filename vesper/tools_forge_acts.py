# THE BLEEDING MOON - the forge, part two: a tileset for each act of the climb and animated props, drawn in code with the
# helpers of tools_forge.py (which calls items() and packs everything into the 'v' tile group).
#   The Black Gate: wet basalt cobbles, iron grates, puddles; a lantern post, a gibbet cage, stakes, a well.
#   The Cloister of Frost: frosted flagstones, cracked ice, snow; ice spires, a snow cairn, a frozen urn, a fallen bell.
#   The Umbral Stair: violet stone with void seams; void shards, a broken arch, a violet-flame brazier (animated).
#   The Ashen Waste: cinders, scorched earth with glowing seams, embers; a dead tree, a ribcage, a lava vent (animated).
#   The Wind's Throat: layered cliff rock, windswept grass, gravel; a cairn, a rock spire, a wind-torn banner (animated).
#   Shared animated props: candles, a blood pool, a rune stone, low fog.
import math
import numpy as np
from PIL import Image, ImageDraw
from tools_forge import (rng, hexc, ramp, fbm, voronoi, shade, to_block, canvas, C, texture_poly, iso_box, glow, edge_dark,
                         STONE, IRON, BONE, GOLD, CLOTH, BLOOD, GLOW, EARTH, N, skull, bone)

BASALT = ramp(['#0c0e12', '#161a20', '#20262e', '#2c333c', '#3a434e', '#4c5662', '#606c78'])
MOSS = ramp(['#0e140c', '#18220f', '#243214', '#32441a'])
ICE = ramp(['#1a2a3c', '#2a4460', '#3e6488', '#5a88ae', '#82aed0', '#b4d4ec', '#e2f0fa'])
FROST = ramp(['#2a3440', '#3e4a58', '#56647a', '#72829a', '#94a4ba', '#bccad8', '#e4ecf4'])
SNOW = ramp(['#8a9aae', '#aebccc', '#d0dae6', '#eef4fa'])
UMBRA = ramp(['#0e0a16', '#181226', '#241a36', '#322448', '#42305c', '#563e72', '#6e508c'])
VOID = ramp(['#2a0e4a', '#5a1e9a', '#8a3ae0', '#b070ff', '#d8b0ff', '#f4e8ff'])
CINDER = ramp(['#0e0a0a', '#1a1412', '#28201c', '#382c26', '#4a3a32', '#5e4a40'])
SCORCH = ramp(['#1a0e08', '#2c1810', '#402418', '#563220', '#6e422a'])
EMBER = ramp(['#4a1004', '#9a2a08', '#e05010', '#ff8a30', '#ffd080', '#fff4d8'])
CLIFF = ramp(['#141814', '#20261f', '#2e352b', '#3e4639', '#50594a', '#646e5c', '#7c8672'])
GRASS = ramp(['#1a2410', '#283818', '#3a4e20', '#4e6628', '#668034'])
WOOD = ramp(['#1a0e08', '#2c1a10', '#40281a', '#583824', '#704a30'])

# ---- ground textures ----------------------------------------------------------------------------------
def cobbles(seed, pal, k=6, gap=1.2, moss=0.0, wet=0.0):
    cell, d1, d2, vx, vy, _ = voronoi(N, k, seed, 0.9)
    r = rng(seed); tone = r.random(k * k)[cell]; n1 = fbm(N, seed + 1, 3, 6)
    dome = 1 - np.clip(d1 / (N / k * 0.62), 0, 1); lit = (-(vx + vy) / (np.hypot(vx, vy) + 1e-3)) * 0.5 + 0.5
    val = 0.2 + tone * 0.25 + dome * 0.25 + lit * dome * 0.22 + (n1 - 0.5) * 0.2
    col = shade(np.clip(val, 0, 0.999), pal); g = (d2 - d1) < gap
    col[g] = pal[0]
    if moss: m = g & (fbm(N, seed + 2, 3, 4) > 1 - moss); col[m] = shade(np.clip(fbm(N, seed + 3, 2, 8), 0, 0.999), MOSS)[m]
    if wet: w = fbm(N, seed + 4, 3, 3) > 1 - wet; col[w] = col[w] * 0.55 + hexc('#3a4a66') * 0.2; col[w & (dome > 0.6) & (lit > 0.7)] = hexc('#8aa0c0')
    return col

def tex_grate(seed):
    col = cobbles(seed, BASALT, 6, 1.2, 0.4); yy, xx = np.mgrid[0:N, 0:N]
    box = (np.abs(xx - N / 2) < 18) & (np.abs(yy - N / 2) < 18)
    col[box] = hexc('#050608')
    bars = box & (((xx - 14) % 6 < 2) | ((yy - 14) % 6 < 2)); col[bars] = IRON[3]; col[bars & (((xx - 14) % 6 == 0) | ((yy - 14) % 6 == 0))] = IRON[4]
    rim = (np.abs(xx - N / 2) < 20) & (np.abs(yy - N / 2) < 20) & ~box; col[rim] = IRON[2]
    return col

def tex_frost(seed):
    cell, d1, d2, vx, vy, _ = voronoi(N, 3, seed, 0.6); r = rng(seed); tone = r.random(9)[cell]
    n1 = fbm(N, seed + 1, 4, 4); val = 0.35 + tone * 0.2 + n1 * 0.3 + (-(vx + vy) / (np.hypot(vx, vy) + 1e-3)) * 0.05
    col = shade(np.clip(val, 0, 0.999), FROST); col[(d2 - d1) < 1.1] = FROST[1]
    sp = rng(seed + 9).random((N, N)) < 0.04; col[sp] = SNOW[3]
    rime = fbm(N, seed + 5, 3, 5) > 0.62; col[rime] = col[rime] * 0.5 + SNOW[2] * 0.5
    return col

def tex_ice(seed):
    n1 = fbm(N, seed, 4, 3); yy, xx = np.mgrid[0:N, 0:N]
    col = shade(np.clip(0.3 + n1 * 0.45 + (xx + yy) / (N * 8), 0, 0.999), ICE)
    cell, d1, d2, *_ = voronoi(N, 3, seed + 3, 1.0); ck = (d2 - d1) < 0.8; col[ck] = ICE[6]; col[((d2 - d1) < 2.2) & ~ck] = col[((d2 - d1) < 2.2) & ~ck] * 0.6 + ICE[5] * 0.4
    for i in range(5): y0 = int(rng(seed + i).random() * N); col[y0 % N, :] = col[y0 % N, :] * 0.7 + ICE[6] * 0.3   # streaks
    return col

def tex_umbral(seed, seam=0.3):
    cell, d1, d2, vx, vy, cell2 = voronoi(N, 3, seed, 0.7); r = rng(seed); tone = r.random(9)[cell]; n1 = fbm(N, seed + 1, 4, 4)
    col = shade(np.clip(0.28 + tone * 0.2 + n1 * 0.3, 0, 0.999), UMBRA); gap = d2 - d1; col[gap < 1.1] = UMBRA[0]
    pair = (np.minimum(cell, cell2) * 7 + np.maximum(cell, cell2) * 3) % 10 / 10; on = pair < seam
    g = np.clip(1 - gap / 3.4, 0, 1); col = np.where((on & (gap < 3.4))[..., None], col * (1 - g[..., None] * 0.6) + VOID[1] * g[..., None] * 0.6, col)
    col[on & (gap < 1.0)] = VOID[3]; col[on & (gap < 0.5)] = VOID[4]
    return col

def tex_cinder(seed):
    n1 = fbm(N, seed, 4, 4); col = shade(np.clip(0.2 + n1 * 0.6, 0, 0.999), CINDER)
    r = rng(seed + 1); e = r.random((N, N)); col[e < 0.012] = EMBER[3]; col[(e > 0.012) & (e < 0.03)] = EMBER[1]
    return col

def tex_scorch(seed):
    cell, d1, d2, vx, vy, _ = voronoi(N, 4, seed, 1.0); n1 = fbm(N, seed + 1, 3, 4); r = rng(seed); tone = r.random(16)[cell]
    col = shade(np.clip(0.3 + tone * 0.3 + n1 * 0.3, 0, 0.999), SCORCH); gap = d2 - d1
    g = np.clip(1 - gap / 3.0, 0, 1); col = np.where((gap < 3.0)[..., None], col * (1 - g[..., None] * 0.7) + EMBER[1] * g[..., None] * 0.7, col)
    col[gap < 0.9] = EMBER[3]; col[gap < 0.45] = EMBER[4]
    return col

def tex_cliff(seed):
    n1 = fbm(N, seed, 4, 4); yy, xx = np.mgrid[0:N, 0:N]
    strata = np.sin((yy + xx * 0.3 + n1 * 14) * 0.45) * 0.5 + 0.5
    col = shade(np.clip(0.25 + strata * 0.3 + n1 * 0.3, 0, 0.999), CLIFF)
    ck = np.abs(np.sin((yy + xx * 0.3 + n1 * 14) * 0.45)) < 0.06; col[ck] = CLIFF[0]
    return col

def tex_grass(seed):
    col = tex_cliff(seed); n1 = fbm(N, seed + 2, 3, 4); m = n1 > 0.42
    g = shade(np.clip(fbm(N, seed + 3, 3, 8) * 0.9 + 0.1, 0, 0.999), GRASS); col[m] = g[m]
    r = rng(seed + 4)
    for _ in range(80):   # blades bent by the wind
        x, y = int(r.random() * N), int(r.random() * N)
        if not m[y, x]: continue
        for k in range(3):
            xx, yy = (x + k) % N, (y - k) % N; col[yy, xx] = GRASS[4] if k == 2 else GRASS[3]
    return col

# ---- overlays -------------------------------------------------------------------------------------------
def ov_puddle(seed):
    n1 = fbm(N, seed, 3, 3); yy, xx = np.mgrid[0:N, 0:N]; rr = np.hypot((xx - N / 2) / 30, (yy - N / 2) / 26)
    m = (n1 * 0.7 + (1 - rr)) > 0.72
    col = np.zeros((N, N, 3), np.float32) + hexc('#141c2a'); col[m & (fbm(N, seed + 1, 2, 6) > 0.62)] = hexc('#4a5e80')
    col[m & ((xx + yy) % 23 == 0)] = hexc('#9ab0d0')
    return col, np.where(m, 215, 0).astype(np.float32)

def ov_snow(seed):
    n1 = fbm(N, seed, 4, 4); m = n1 > 0.52
    col = shade(np.clip((n1 - 0.4) * 2, 0, 0.999), SNOW, 0.4)
    return col, np.where(m, np.clip((n1 - 0.52) * 1600, 0, 250), 0).astype(np.float32)

def ov_void(seed):
    cell, d1, d2, *_ = voronoi(N, 3, seed, 1.0); gap = d2 - d1; on = (cell * 3 % 5) < 3
    a = np.where(on & (gap < 3.0), np.clip(1 - gap / 3.0, 0, 1) * 190, 0).astype(np.float32)
    col = np.zeros((N, N, 3), np.float32) + VOID[1]; col[on & (gap < 1)] = VOID[3]; col[on & (gap < 0.5)] = VOID[4]; a[on & (gap < 1)] = 255
    return col, a

def ov_embers(seed):
    r = rng(seed); col = np.zeros((N, N, 3), np.float32); a = np.zeros((N, N), np.float32)
    n1 = fbm(N, seed + 1, 3, 4)
    for _ in range(70):
        x, y = int(r.random() * N), int(r.random() * N)
        if n1[y, x] < 0.45: continue
        col[y, x] = EMBER[3 + int(r.random() * 2)]; a[y, x] = 255
        if r.random() < 0.4: col[y, (x + 1) % N] = EMBER[2]; a[y, (x + 1) % N] = 200
    m = (n1 > 0.62); col[m & (a == 0)] = CINDER[4]; a[m & (a == 0)] = 140
    return col, a

def ov_gravel(seed):
    r = rng(seed); col = np.zeros((N, N, 3), np.float32); a = np.zeros((N, N), np.float32)
    for _ in range(90):
        x, y, s = int(r.random() * N), int(r.random() * N), 1 + int(r.random() * 2)
        c = CLIFF[3 + int(r.random() * 3)]
        col[y:y + s, x:x + s] = c; a[y:y + s, x:x + s] = 255; col[min(N - 1, y + s), x:x + s] = CLIFF[1]; a[min(N - 1, y + s), x:x + s] = 200
    return col, a

# ---- props ------------------------------------------------------------------------------------------------
def prop_lantern(seed, fr=0):
    W, H = 40, 120; img = canvas(W, H); cx, by = 20, 116
    flick = 0.5 + 0.12 * math.sin(fr * 2.1) + 0.06 * math.sin(fr * 5.3)
    glow(img, cx + 6, by - 92, 26, '#ffb050', flick); d = ImageDraw.Draw(img)
    d.ellipse([cx - 9, by - 4, cx + 9, by + 3], fill=C(IRON[1], 200))
    d.rectangle([cx - 2, by - 100, cx + 1, by], fill=C(IRON[2])); d.line([(cx - 2, by - 100), (cx - 2, by)], fill=C(IRON[4]))
    d.line([(cx, by - 98), (cx + 10, by - 98)], fill=C(IRON[3]), width=2); d.line([(cx + 8, by - 98), (cx + 8, by - 94)], fill=C(IRON[3]))
    d.polygon([(cx + 3, by - 94), (cx + 13, by - 94), (cx + 12, by - 80), (cx + 4, by - 80)], fill=C(IRON[2]))
    d.rectangle([cx + 5, by - 92, cx + 11, by - 82], fill=C('#ffc060')); d.rectangle([cx + 7, by - 90, cx + 9, by - 84], fill=C('#fff4c8'))
    d.line([(cx + 8, by - 94), (cx + 8, by - 80)], fill=C(IRON[3]))
    return edge_dark(img), (-20, -116)

def prop_cage(seed):
    W, H = 70, 130; img = canvas(W, H); d = ImageDraw.Draw(img); cx, by = 22, 126
    d.rectangle([cx - 3, by - 120, cx + 1, by], fill=C(WOOD[2])); d.line([(cx - 3, by - 120), (cx - 3, by)], fill=C(WOOD[4]))
    d.rectangle([cx - 3, by - 122, cx + 34, by - 118], fill=C(WOOD[2])); d.line([(cx + 1, by - 104), (cx + 14, by - 118)], fill=C(WOOD[3]), width=3)
    d.line([(cx + 30, by - 118), (cx + 30, by - 104)], fill=C(IRON[3]))
    x0, y0 = cx + 30, by - 104
    for k in range(-3, 4): d.line([(x0 + k * 4, y0 + 4), (x0 + k * 4.5, y0 + 34)], fill=C(IRON[3] if k < 1 else IRON[2]))
    d.arc([x0 - 13, y0, x0 + 13, y0 + 10], 180, 360, fill=C(IRON[4])); d.line([(x0 - 14, y0 + 34), (x0 + 14, y0 + 34)], fill=C(IRON[3]), width=2)
    for (x, y) in ((x0 - 3, y0 + 24), (x0 + 2, y0 + 28)): d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=C(BONE[3]))   # what is left inside
    d.ellipse([cx - 12, by - 4, cx + 10, by + 3], fill=C(EARTH[1], 200))
    return edge_dark(img), (-22, -126)

def prop_stakes(seed):
    W, H = 64, 70; img = canvas(W, H); d = ImageDraw.Draw(img); r = rng(seed); cx, by = 32, 64
    d.ellipse([cx - 26, by - 7, cx + 26, by + 4], fill=C(EARTH[1], 200))
    for i in range(7):
        x = cx - 22 + i * 7.3 + (r.random() - 0.5) * 3; h = 26 + r.random() * 30; lean = (r.random() - 0.5) * 8; y = by - (i % 2) * 3
        d.polygon([(x - 2.5, y), (x + 2.5, y), (x + lean + 0.5, y - h), (x + lean - 0.5, y - h)], fill=C(WOOD[2]))
        d.line([(x - 2.5, y), (x + lean - 0.5, y - h)], fill=C(WOOD[4])); d.line([(x + lean, y - h), (x + lean, y - h + 5)], fill=C(BLOOD[3]))
    return edge_dark(img), (-32, -64)

def prop_well(seed):
    W, H = 84, 90; img = canvas(W, H); cx, by = 42, 84
    iso_box(img, cx, by, 30, 15, 18, BASALT, seed, 0.7, 0.5, 0.3)
    d = ImageDraw.Draw(img); d.polygon([(cx, by - 48), (cx + 22, by - 37), (cx, by - 26), (cx - 22, by - 37)], fill=C('#05070a'))
    for sx in (-1, 1): d.rectangle([cx + sx * 26 - 2, by - 76, cx + sx * 26 + 2, by - 30], fill=C(WOOD[2]))
    d.line([(cx - 28, by - 76), (cx + 28, by - 76)], fill=C(WOOD[3]), width=4); d.line([(cx + 4, by - 74), (cx + 4, by - 52)], fill=C('#8a7a60'))
    d.rectangle([cx, by - 54, cx + 8, by - 46], fill=C(WOOD[3]))
    return edge_dark(img), (-42, -84)

def prop_icespire(seed):
    W, H = 64, 110; img = canvas(W, H); cx, by = 32, 102
    glow(img, cx, by - 40, 34, '#8ad0ff', 0.35); d = ImageDraw.Draw(img); d.ellipse([cx - 22, by - 6, cx + 22, by + 4], fill=C(SNOW[1], 220))
    for (dx, L, a) in [(-12, 40, -0.32), (12, 34, 0.38), (-3, 78, -0.06), (7, 56, 0.15), (-18, 22, -0.7)]:
        x0, y0 = cx + dx, by - 2; ang = -math.pi / 2 + a; x1, y1 = x0 + math.cos(ang) * L, y0 + math.sin(ang) * L; w = 4 + L / 16
        nx, ny = -math.sin(ang) * w, math.cos(ang) * w; tip = (x1 + math.cos(ang) * w * 1.8, y1 + math.sin(ang) * w * 1.8)
        d.polygon([(x0, y0), (x0 - nx, y0 - ny), (x1 - nx, y1 - ny), tip, (x1, y1)], fill=C(ICE[2]))
        d.polygon([(x0 + nx, y0 + ny), (x0, y0), (x1, y1), tip, (x1 + nx, y1 + ny)], fill=C(ICE[4]))
        d.line([(x0, y0), (x1, y1), tip], fill=C(ICE[6]))
    return edge_dark(img, '#0a1828'), (-32, -102)

def prop_cairn(seed, pal=None, snow=False):
    pal = pal if pal is not None else CLIFF
    W, H = 56, 70; img = canvas(W, H); r = rng(seed); cx, by = 28, 64; d = ImageDraw.Draw(img)
    d.ellipse([cx - 22, by - 6, cx + 22, by + 3], fill=C(pal[1], 200)); y = by
    for i in range(5):
        w = 20 - i * 3.5 + r.random() * 3; h = 9 - i * 0.8; ox = (r.random() - 0.5) * 4
        texture_poly(img, [(cx + ox - w, y - 2), (cx + ox - w * 0.8, y - h), (cx + ox + w * 0.8, y - h - 1), (cx + ox + w, y - 2), (cx + ox, y + 1)], pal, seed + i, 0.55, 0.35, 4)
        d = ImageDraw.Draw(img); d.line([(cx + ox - w * 0.8, y - h), (cx + ox + w * 0.8, y - h - 1)], fill=C(pal[5]))
        if snow: d.line([(cx + ox - w * 0.7, y - h - 1), (cx + ox + w * 0.6, y - h - 2)], fill=C(SNOW[3]), width=2)
        y -= h - 1
    return edge_dark(img), (-28, -64)

def prop_urn(seed, frozen=True):
    W, H = 40, 54; img = canvas(W, H); cx, by = 20, 50; d = ImageDraw.Draw(img)
    d.ellipse([cx - 14, by - 5, cx + 14, by + 3], fill=C(SNOW[1] if frozen else EARTH[1], 200))
    body = [(cx - 6, by), (cx - 12, by - 14), (cx - 11, by - 26), (cx - 6, by - 32), (cx - 7, by - 38), (cx + 7, by - 38), (cx + 6, by - 32), (cx + 11, by - 26), (cx + 12, by - 14), (cx + 6, by)]
    texture_poly(img, body, FROST if frozen else STONE, seed, 0.5, 0.3, 4); d = ImageDraw.Draw(img)
    d.line([(cx - 11, by - 22), (cx + 11, by - 22)], fill=C(GOLD[2])); d.ellipse([cx - 7, by - 41, cx + 7, by - 36], fill=C('#0a0a10'))
    if frozen:
        for x in (-8, -2, 5): d.line([(cx + x, by - 26), (cx + x, by - 20 + abs(x))], fill=C(ICE[5]))
        d.line([(cx - 7, by - 39), (cx + 7, by - 39)], fill=C(SNOW[3]), width=2)
    return edge_dark(img), (-20, -50)

def prop_bell(seed):
    W, H = 64, 52; img = canvas(W, H); cx, by = 32, 46; d = ImageDraw.Draw(img)
    d.ellipse([cx - 28, by - 7, cx + 28, by + 4], fill=C(SNOW[1], 200))
    pts = [(cx - 24, by - 4), (cx - 20, by - 14), (cx - 6, by - 30), (cx + 6, by - 34), (cx + 16, by - 30), (cx + 22, by - 18), (cx + 26, by - 2)]
    texture_poly(img, pts, ramp(['#1e1a10', '#3a3018', '#5a4a24', '#7a6632', '#9a8444', '#c4ac64']), seed, 0.5, 0.3, 4); d = ImageDraw.Draw(img)
    d.ellipse([cx - 26, by - 9, cx + 0, by + 1], fill=C('#120e08')); d.arc([cx - 26, by - 9, cx + 0, by + 1], 0, 360, fill=C('#9a8444'))
    d.line([(cx - 8, by - 26), (cx + 18, by - 16)], fill=C('#c4ac64')); d.line([(cx - 4, by - 31), (cx + 10, by - 33)], fill=C(SNOW[3]), width=2)
    return edge_dark(img), (-32, -46)

def prop_voidshard(seed, fr=0):
    W, H = 56, 100; img = canvas(W, H); cx, by = 28, 94; bob = math.sin(fr / 6 * math.tau) * 3
    glow(img, cx, by - 46 + bob, 30, '#a050ff', 0.4 + 0.1 * math.sin(fr / 6 * math.tau)); d = ImageDraw.Draw(img)
    d.ellipse([cx - 12, by - 4, cx + 12, by + 2], fill=C(UMBRA[1], 180))
    top, mid, bot = by - 80 + bob, by - 50 + bob, by - 20 + bob
    d.polygon([(cx, top), (cx - 10, mid), (cx, bot)], fill=C(VOID[2])); d.polygon([(cx, top), (cx + 10, mid), (cx, bot)], fill=C(VOID[1]))
    d.line([(cx, top), (cx, bot)], fill=C(VOID[4])); d.line([(cx, top), (cx - 10, mid)], fill=C(VOID[5]))
    for i in range(3):
        a = fr / 6 * math.tau + i * 2.1; x, y = cx + math.cos(a) * 16, mid + math.sin(a) * 6
        d.polygon([(x, y - 4), (x - 2, y), (x, y + 4), (x + 2, y)], fill=C(VOID[3]))
    return edge_dark(img, '#12061e'), (-28, -94)

def prop_arch(seed):
    W, H = 110, 140; img = canvas(W, H); cx, by = 55, 134
    for sx in (-1, 1): iso_box(img, cx + sx * 34, by - 8 * (1 if sx < 0 else 0), 9, 5, 92 if sx < 0 else 54, UMBRA, seed + sx, 0.65, 0.5, 0.3)
    d = ImageDraw.Draw(img); d.arc([cx - 40, by - 140, cx + 30, by - 64], 180, 265, fill=C(UMBRA[4]), width=8)
    d.arc([cx - 40, by - 140, cx + 30, by - 64], 180, 265, fill=C(UMBRA[2]), width=3)
    r = rng(seed)
    for _ in range(7): x, y, s = cx + (r.random() - 0.3) * 60, by - 2 + (r.random() - 0.5) * 8, 2 + r.random() * 4; d.polygon([(x - s, y), (x, y - s), (x + s, y), (x, y + s * 0.5)], fill=C(UMBRA[3]))
    glow(img, cx - 34, by - 70, 10, '#a050ff', 0.35)
    return edge_dark(img), (-55, -134)

def prop_vbrazier(seed, fr=0):
    W, H = 60, 96; img = canvas(W, H); d = ImageDraw.Draw(img); cx, by = 30, 92
    for a in (-1, 0, 1): d.line([(cx + a * 14, by), (cx + a * 6, by - 30)], fill=C(IRON[2]), width=3)
    d.chord([cx - 20, by - 46, cx + 20, by - 24], 0, 180, fill=C(IRON[2])); d.ellipse([cx - 20, by - 40, cx + 20, by - 30], fill=C(IRON[1]))
    t = fr / 8 * math.tau
    for i in range(7):   # the violet flames, leaping
        ph = t + i * 0.9; x = cx - 12 + i * 4; h = 14 + 10 * (0.5 + 0.5 * math.sin(ph)) + (6 if i == 3 else 0)
        d.polygon([(x - 3, by - 35), (x + math.sin(ph) * 2, by - 35 - h), (x + 3, by - 35)], fill=C(VOID[2]))
        d.polygon([(x - 1.5, by - 35), (x + math.sin(ph) * 1.5, by - 35 - h * 0.6), (x + 1.5, by - 35)], fill=C(VOID[4]))
    glow(img, cx, by - 48, 30, '#a050ff', 0.45 + 0.08 * math.sin(t * 2))
    return edge_dark(img), (-30, -92)

def prop_deadtree(seed):
    W, H = 100, 150; img = canvas(W, H); d = ImageDraw.Draw(img); r = rng(seed); cx, by = 50, 144
    d.ellipse([cx - 22, by - 6, cx + 22, by + 4], fill=C(CINDER[1], 210))
    def branch(x, y, a, L, w, depth):
        if depth == 0 or L < 4: return
        x1, y1 = x + math.cos(a) * L, y + math.sin(a) * L
        d.line([(x, y), (x1, y1)], fill=C(CINDER[2]), width=max(1, int(w))); d.line([(x - w * 0.3, y), (x1 - w * 0.3, y1)], fill=C(CINDER[4]), width=1)
        if depth < 3 and r.random() < 0.4: d.point((x1, y1), fill=C(EMBER[3]))
        for s in (-1, 1): branch(x1, y1, a + s * (0.35 + r.random() * 0.4), L * (0.62 + r.random() * 0.15), w * 0.62, depth - 1)
    branch(cx, by - 2, -math.pi / 2 + 0.05, 46, 9, 6)
    return edge_dark(img), (-50, -144)

def prop_ribcage(seed):
    W, H = 90, 64; img = canvas(W, H); d = ImageDraw.Draw(img); cx, by = 45, 58
    d.ellipse([cx - 38, by - 8, cx + 38, by + 4], fill=C(CINDER[1], 210))
    d.line([(cx - 34, by - 4), (cx + 34, by - 10)], fill=C(BONE[1]), width=5); d.line([(cx - 34, by - 5), (cx + 34, by - 11)], fill=C(BONE[3]), width=2)
    for i in range(7):
        x = cx - 26 + i * 8.6; y = by - 5 - i * 0.9; h = 30 - abs(i - 3) * 3
        d.arc([x - 9, y - h, x + 9, y + 4], 180, 360, fill=C(BONE[2]), width=3); d.arc([x - 9, y - h, x + 9, y + 4], 200, 300, fill=C(BONE[4]), width=1)
    skull(d, cx + 38, by - 12, 7, 0.8)
    return edge_dark(img), (-45, -58)

def prop_lavavent(seed, fr=0):
    W, H = 70, 70; img = canvas(W, H); cx, by = 35, 60; t = fr / 8 * math.tau
    glow(img, cx, by - 6, 30, '#ff6a20', 0.45 + 0.1 * math.sin(t)); d = ImageDraw.Draw(img)
    d.ellipse([cx - 26, by - 12, cx + 26, by + 6], fill=C(SCORCH[2])); d.ellipse([cx - 18, by - 8, cx + 18, by + 3], fill=C(EMBER[2]))
    d.ellipse([cx - 12, by - 6, cx + 12, by + 1], fill=C(EMBER[3])); d.ellipse([cx - 6, by - 4, cx + 6, by - 1], fill=C(EMBER[4]))
    for i in range(6):   # bubbles and sparks rising
        ph = (fr / 8 + i / 6) % 1; x = cx + math.sin(i * 2.3) * 12; y = by - 4 - ph * 46
        d.point((x, y), fill=C(EMBER[4 if ph < 0.5 else 3]));
        if ph < 0.3: d.point((x + 1, y), fill=C(EMBER[3]))
    for i in range(5): a = i / 5 * math.tau; d.line([(cx + math.cos(a) * 20, by - 3 + math.sin(a) * 7), (cx + math.cos(a) * 28, by - 3 + math.sin(a) * 10)], fill=C(EMBER[1]))
    return img, (-35, -60)

def prop_rockspire(seed):
    W, H = 70, 140; img = canvas(W, H); cx, by = 35, 134; r = rng(seed)
    pts_l = [(cx - 20, by), (cx - 16, by - 50), (cx - 10, by - 96), (cx - 2, by - 128), (cx, by - 50)]
    pts_r = [(cx, by - 50), (cx - 2, by - 128), (cx + 6, by - 92), (cx + 14, by - 46), (cx + 20, by)]
    texture_poly(img, pts_l + [(cx, by)], CLIFF, seed, 0.6, 0.3, 6); texture_poly(img, pts_r + [(cx, by)], CLIFF, seed + 1, 0.32, 0.3, 6)
    d = ImageDraw.Draw(img)
    for i in range(6): y = by - 18 - i * 19; d.line([(cx - 16 + i * 2, y), (cx + 15 - i * 2, y - 4)], fill=C(CLIFF[1]))
    for _ in range(5): x, y = cx + (r.random() - 0.5) * 30, by - r.random() * 100; d.point((x, y), fill=C(GRASS[3]))
    return edge_dark(img), (-35, -134)

def prop_windbanner(seed, fr=0):
    W, H = 80, 140; img = canvas(W, H); d = ImageDraw.Draw(img); cx, by = 14, 136; t = fr / 8 * math.tau
    d.rectangle([cx - 1, by - 130, cx + 1, by], fill=C(WOOD[2])); d.line([(cx - 1, by - 130), (cx - 1, by)], fill=C(WOOD[4]))
    top = by - 124; pts_t, pts_b = [], []
    for i in range(10):   # streaming out with the wind, rippling
        x = cx + 2 + i * 6; w = math.sin(t - i * 0.7) * (1 + i * 0.5); pts_t.append((x, top + w)); pts_b.append((x, top + 20 - i * 0.8 + w))
    pts = pts_t + list(reversed(pts_b))
    texture_poly(img, pts, CLOTH, seed, 0.55, 0.25, 5); d = ImageDraw.Draw(img)
    for i in range(1, 9, 2): d.line([pts_t[i], pts_b[i]], fill=C(CLOTH[1]))
    x9, y9 = pts_t[-1]; d.polygon([(x9, y9), (x9 + 6, y9 + 4), (x9, y9 + 9)], fill=C(CLOTH[2]))
    return edge_dark(img), (-14, -136)

def prop_tuft(seed):
    W, H = 30, 22; img = canvas(W, H); d = ImageDraw.Draw(img); r = rng(seed); cx, by = 15, 20
    for i in range(9):
        x = cx - 8 + i * 2; h = 6 + r.random() * 10; lean = 3 + r.random() * 4
        d.line([(x, by), (x + lean, by - h)], fill=C(GRASS[2 + (i % 3)]))
    return img, (-15, -20)

# ---- animated shared props -------------------------------------------------------------------------------
def prop_candles_anim(seed, fr=0):
    W, H = 48, 44; img = canvas(W, H); r = rng(seed); cx, by = 24, 40; t = fr / 6 * math.tau
    glow(img, cx, by - 16, 22, '#ffb050', 0.36 + 0.08 * math.sin(t * 2)); d = ImageDraw.Draw(img)
    d.ellipse([cx - 18, by - 5, cx + 18, by + 3], fill=C('#d8c8a8', 110))
    for i in range(6):
        x = cx + (i - 2.5) * 6 + (r.random() - 0.5) * 2; h = 8 + r.random() * 12; y = by - (i % 2) * 3; fl = 4.5 + math.sin(t + i * 1.7) * 1.4
        d.rectangle([x - 2, y - h, x + 2, y], fill=C('#d8ccb0')); d.line([(x - 2, y - h), (x - 2, y)], fill=C('#f2e8d4'))
        d.ellipse([x - 1.5 + math.sin(t + i) * 0.6, y - h - fl - 1, x + 1.5 + math.sin(t + i) * 0.6, y - h - 0.5], fill=C('#ffb050')); d.point((x, y - h - 2), fill=C('#fff4c8'))
    return edge_dark(img, '#2a1c10'), (-24, -40)

def prop_bloodpool(seed, fr=0):
    W, H = 80, 40; img = canvas(W, H); cx, by = 40, 22; t = fr / 8 * math.tau; d = ImageDraw.Draw(img)
    d.ellipse([cx - 34, by - 12, cx + 34, by + 12], fill=C(BLOOD[1])); d.ellipse([cx - 28, by - 9, cx + 28, by + 9], fill=C(BLOOD[2]))
    for k in range(3):   # ripples spreading
        ph = (fr / 8 + k / 3) % 1; rx, ry = 4 + ph * 24, 2 + ph * 8
        d.ellipse([cx - rx, by - ry, cx + rx, by + ry], outline=C(BLOOD[3], int(255 * (1 - ph))))
    d.line([(cx - 18, by - 5), (cx - 6, by - 7)], fill=C('#c04050'))
    return img, (-40, -22)

def prop_runestone(seed, fr=0):
    W, H = 50, 80; img = canvas(W, H); cx, by = 25, 74; t = fr / 8 * math.tau; k = 0.55 + 0.45 * math.sin(t)
    glow(img, cx, by - 34, 24, '#ff2a44', 0.25 + 0.3 * k)
    texture_poly(img, [(cx - 14, by), (cx - 15, by - 40), (cx - 8, by - 58), (cx + 6, by - 60), (cx + 14, by - 44), (cx + 15, by)], STONE, seed, 0.5, 0.3, 5)
    d = ImageDraw.Draw(img); g = GLOW[2] * (1 - k) + GLOW[4] * k
    for (a, b) in [((cx - 5, by - 46), (cx + 5, by - 46)), ((cx, by - 52), (cx, by - 30)), ((cx - 6, by - 36), (cx + 6, by - 24)), ((cx + 6, by - 36), (cx - 6, by - 24))]: d.line([a, b], fill=C(g), width=1)
    d.ellipse([cx - 14, by - 4, cx + 14, by + 3], fill=C(EARTH[1], 180))
    return edge_dark(img), (-25, -74)

def prop_fog(seed, fr=0):
    W, H = 160, 50; out = np.zeros((H, W, 4), np.float32); yy, xx = np.mgrid[0:H, 0:W]
    n = fbm(160, seed, 4, 4)[:H, :]; n = np.roll(n, fr * 4, axis=1)
    m = np.clip(1 - np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)), 0, 1) * np.clip(n * 1.4 - 0.3, 0, 1)
    out[..., :3] = hexc('#b8a0b0'); out[..., 3] = np.floor(m * 4) / 4 * 110
    return Image.fromarray(out.astype(np.uint8), 'RGBA'), (-80, -25)

# ---- the act sets ------------------------------------------------------------------------------------------
def items():
    """Returns (tile items, anims): items are (key, Image, anchor); anims {name: [keys]}."""
    out, anims = [], {}
    def ground(name, tex):
        for i, d4 in enumerate(['E', 'N', 'S', 'W']): out.append((f'v:{name}_{d4}', to_block(np.rot90(tex, i).copy()), (-64, -32)))
    def over(name, ca):
        col, a = ca
        for i, d2 in enumerate(['E', 'N']): out.append((f'v:{name}_{d2}', to_block(np.rot90(col, i).copy(), thick=0, alpha_tex=np.rot90(a, i).copy()), (-64, -32)))
    def prop(name, fn, *a):
        im, anc = fn(*a)
        for d2 in ['E', 'S']: out.append((f'v:{name}_{d2}', im if d2 == 'E' else im.transpose(Image.FLIP_LEFT_RIGHT), (anc[0] if d2 == 'E' else -(im.width + anc[0]), anc[1])))
    def anim(name, fn, seed, n):
        keys = []
        for f in range(n): im, anc = fn(seed, f); k = f'v:{name}/{f}'; out.append((k, im, anc)); keys.append(k)
        anims[name] = keys
    # The Black Gate
    for k in range(3): ground(f'Cobble J{k + 1}', cobbles(1100 + k * 7, BASALT, 6, 1.2, 0.35, [0.1, 0.25, 0.4][k]))
    ground('Grate K1', tex_grate(1150))
    for k in range(2): over(f'Puddle L{k + 1}', ov_puddle(1160 + k * 5))
    prop('Lantern', prop_lantern, 1170); prop('Cage', prop_cage, 1171); prop('Stakes', prop_stakes, 1172); prop('Well', prop_well, 1173)
    # The Cloister of Frost
    for k in range(3): ground(f'Frost M{k + 1}', tex_frost(1200 + k * 7))
    for k in range(2): ground(f'Ice N{k + 1}', tex_ice(1230 + k * 7))
    for k in range(2): over(f'Snow O{k + 1}', ov_snow(1250 + k * 5))
    prop('Icespire', prop_icespire, 1260); prop('Snowcairn', prop_cairn, 1261, FROST, True); prop('Frozenurn', prop_urn, 1262); prop('Bell', prop_bell, 1263)
    # The Umbral Stair
    for k in range(3): ground(f'Umbral P{k + 1}', tex_umbral(1300 + k * 7, [0.15, 0.3, 0.5][k]))
    for k in range(2): over(f'Void Q{k + 1}', ov_void(1330 + k * 5))
    prop('Arch', prop_arch, 1340)
    anim('Voidshard', prop_voidshard, 1341, 6); anim('Vbrazier', prop_vbrazier, 1342, 8)
    # The Ashen Waste
    for k in range(2): ground(f'Cinder R{k + 1}', tex_cinder(1400 + k * 7))
    for k in range(2): ground(f'Scorch S{k + 1}', tex_scorch(1420 + k * 7))
    for k in range(2): over(f'Embers T{k + 1}', ov_embers(1440 + k * 5))
    prop('Deadtree', prop_deadtree, 1450); prop('Ribcage', prop_ribcage, 1451)
    anim('Lavavent', prop_lavavent, 1452, 8)
    # The Wind's Throat
    for k in range(2): ground(f'Cliff U{k + 1}', tex_cliff(1500 + k * 7))
    for k in range(2): ground(f'Grass V{k + 1}', tex_grass(1520 + k * 7))
    for k in range(2): over(f'Gravel W{k + 1}', ov_gravel(1540 + k * 5))
    prop('Cairn', prop_cairn, 1550); prop('Rockspire', prop_rockspire, 1551); prop('Tuft', prop_tuft, 1552)
    anim('Windbanner', prop_windbanner, 1553, 8)
    # Shared, animated
    anim('Candlesfl', prop_candles_anim, 1600, 6); anim('Bloodpool', prop_bloodpool, 1601, 8); anim('Runestone', prop_runestone, 1602, 8); anim('Fog', prop_fog, 1603, 8)
    return out, anims

# ---- breakables: an intact tile and smash frames -----------------------------------------------------------
def urn_frames(seed, n=8):
    r = rng(seed); out = []; shards = [((r.random() - 0.5) * 2.6 - 1.57, 20 + r.random() * 30, r.random()) for _ in range(12)]
    for f in range(n):
        img = canvas(48, 56); d = ImageDraw.Draw(img); cx, by = 24, 50; k = f / (n - 1)
        if f == 0:
            body = [(cx - 6, by), (cx - 11, by - 12), (cx - 10, by - 24), (cx - 5, by - 30), (cx - 6, by - 34), (cx + 6, by - 34), (cx + 5, by - 30), (cx + 10, by - 24), (cx + 11, by - 12), (cx + 6, by)]
            texture_poly(img, body, BONE, seed, 0.45, 0.3, 4); d = ImageDraw.Draw(img)
            skull(d, cx, by - 18, 4.5, 0.8); d.line([(cx - 10, by - 26), (cx + 10, by - 26)], fill=C(BONE[1]))
        else:
            for (a, v, o) in shards:
                x = cx + math.cos(a) * v * k; y = by - 18 + math.sin(a) * v * k + 50 * k * k
                if y < by + 2: s = 2 + int(o * 3); d.polygon([(x - s, y), (x, y - s), (x + s, y + 1)], fill=C(BONE[2 + int(o * 2)]))
                else: d.point((x, by + 1), fill=C(BONE[1]))
            if k < 0.6: d.ellipse([cx - 10 * (1 + k), by - 24 - 10 * k, cx + 10 * (1 + k), by - 10 - 10 * k], fill=C('#c8b8a0', int(140 * (1 - k / 0.6))))
        out.append((edge_dark(img), (-24, -50)))
    return out

def coffin_frames(seed, n=8):
    r = rng(seed); out = []; planks = [((r.random() - 0.5) * 3 - 1.57, 18 + r.random() * 26, r.random() * 3) for _ in range(9)]
    for f in range(n):
        img = canvas(80, 60); d = ImageDraw.Draw(img); cx, by = 40, 52; k = f / (n - 1)
        if f == 0:
            top = [(cx - 30, by - 14), (cx - 20, by - 26), (cx + 22, by - 30), (cx + 32, by - 20), (cx + 20, by - 8), (cx - 22, by - 4)]
            texture_poly(img, top, WOOD, seed, 0.55, 0.3, 5); d = ImageDraw.Draw(img)
            d.polygon([(cx - 22, by - 4), (cx + 20, by - 8), (cx + 20, by - 2), (cx - 22, by + 2)], fill=C(WOOD[1]))
            d.line([(cx - 4, by - 26), (cx - 2, by - 10)], fill=C(GOLD[2]), width=2); d.line([(cx - 10, by - 20), (cx + 6, by - 21)], fill=C(GOLD[2]), width=2)
        else:
            for (a, v, rot) in planks:
                x = cx + math.cos(a) * v * k; y = by - 14 + math.sin(a) * v * k + 44 * k * k
                if y < by + 2:
                    dx, dy = math.cos(rot + k * 4) * 7, math.sin(rot + k * 4) * 3; d.line([(x - dx, y - dy), (x + dx, y + dy)], fill=C(WOOD[3]), width=3)
            if k < 0.5: d.ellipse([cx - 24, by - 26, cx + 24, by - 6], fill=C('#5a4a40', int(150 * (1 - k * 2))))
            if f >= 3: bone(d, cx - 10, by - 2, cx + 12, by - 5, 2); skull(d, cx + 16, by - 6, 4.2, 0.7)
        out.append((edge_dark(img), (-40, -52)))
    return out

def breakables():
    """Tile items and anims for the forge's breakables."""
    items, anims = [], {}
    for name, fr in (('Urn', urn_frames(1700)), ('Coffin', coffin_frames(1701))):
        im, anc = fr[0]; items.append((f'v:{name}_E', im, anc))
        keys = []
        for i, (im2, anc2) in enumerate(fr): k = f'v:{name} smash/{i}'; items.append((k, im2, anc2)); keys.append(k)
        anims[f'{name} smash'] = keys
    return items, anims

# ---- skill icons: 32 x 32 on an 8 x 8 sheet (assets/ui/icons_f.png) ------------------------------------------
ICON_ORDER = ['heavy', 'fourth', 'edge', 'riposte', 'edge2', 'exec', 'dodge', 'iron', 'ghost', 'wind', 'vigor', 'vigor2', 'thirst',
              'skill1', 'art', 'skill2', 'moonblood', 'rising', 'breath', 'quick',
              'shard', 'souls', 'endless', 'daily', 'ach', 'ngplus', 'bond', 'ascend']   # then the souls and the modes (2026-11-11)
def _icon(name):
    S = 4; img = Image.new('RGBA', (32 * S, 32 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(img); P = lambda pts: [(x * S, y * S) for x, y in pts]
    steel, steelL, red, redL, gold, bone_, dark = (150, 150, 170), (226, 226, 240), (220, 32, 56), (255, 140, 156), (232, 184, 72), (232, 220, 192), (40, 30, 44)
    def sword(x0, y0, x1, y1, w=2.2, col=steel, hi=steelL, guard=gold):
        a = math.atan2(y1 - y0, x1 - x0); nx, ny = -math.sin(a) * w, math.cos(a) * w
        d.polygon(P([(x0 + nx, y0 + ny), (x1, y1), (x0 - nx, y0 - ny)]), fill=col); d.line(P([(x0, y0), (x1, y1)]), fill=hi, width=S)
        gx, gy = x0 - math.cos(a) * 1, y0 - math.sin(a) * 1; d.line(P([(gx + nx * 2.4, gy + ny * 2.4), (gx - nx * 2.4, gy - ny * 2.4)]), fill=guard, width=2 * S)
        d.line(P([(gx, gy), (gx - math.cos(a) * 5, gy - math.sin(a) * 5)]), fill=(90, 60, 40), width=2 * S)
    def heart(cx, cy, s, col, hi):
        d.ellipse(P([(cx - s, cy - s * 0.8), (cx, cy + s * 0.2)]), fill=col); d.ellipse(P([(cx, cy - s * 0.8), (cx + s, cy + s * 0.2)]), fill=col)
        d.polygon(P([(cx - s, cy - s * 0.2), (cx + s, cy - s * 0.2), (cx, cy + s * 1.1)]), fill=col); d.ellipse(P([(cx - s * 0.7, cy - s * 0.6), (cx - s * 0.25, cy - s * 0.15)]), fill=hi)
    def moon(cx, cy, r, col, cut=True):
        d.ellipse(P([(cx - r, cy - r), (cx + r, cy + r)]), fill=col); d.ellipse(P([(cx - r * 0.55, cy - r * 0.7), (cx - r * 0.1, cy - r * 0.3)]), fill=tuple(min(255, c + 50) for c in col))
        if cut: d.line(P([(cx - r * 1.1, cy + r * 0.4), (cx + r * 1.1, cy - r * 0.4)]), fill=(40, 0, 8), width=2 * S); d.line(P([(cx - r * 1.1, cy + r * 0.4), (cx + r * 1.1, cy - r * 0.4)]), fill=redL, width=S)
    if name == 'heavy': d.polygon(P([(16, 3), (19, 12), (29, 13), (21, 19), (24, 29), (16, 23), (8, 29), (11, 19), (3, 13), (13, 12)]), fill=red); d.polygon(P([(16, 8), (18, 14), (24, 15), (19, 18), (21, 24), (16, 20), (11, 24), (13, 18), (8, 15), (14, 14)]), fill=(255, 210, 120)); sword(10, 22, 24, 6)
    elif name == 'fourth':   # four parallel cuts, the last one red
        for i in range(4): d.line(P([(5 + i * 5, 25), (13 + i * 5, 5)]), fill=[steel, steel, steelL, red][i], width=2 * S); d.line(P([(5 + i * 5, 25), (13 + i * 5, 5)]), fill=[steelL, steelL, (255, 255, 255), redL][i], width=S)
    elif name == 'edge': sword(8, 25, 25, 6, 2.6); d.line(P([(13, 23), (26, 8)]), fill=redL, width=S)
    elif name == 'edge2': sword(7, 25, 22, 5, 2.2); sword(11, 27, 27, 9, 2.2, (120, 120, 140))
    elif name == 'riposte': sword(6, 26, 26, 6); sword(26, 26, 6, 6, 2.2, (120, 120, 140)); d.ellipse(P([(13, 13), (19, 19)]), fill=redL)
    elif name == 'exec':
        d.ellipse(P([(7, 6), (25, 24)]), fill=bone_); d.rectangle(P([(11, 20), (21, 27)]), fill=bone_)
        for ex in (11, 18): d.ellipse(P([(ex, 12), (ex + 4, 17)]), fill=dark)
        d.line(P([(4, 26), (28, 6)]), fill=(60, 0, 10), width=3 * S); d.line(P([(4, 26), (28, 6)]), fill=red, width=S)
    elif name == 'dodge':
        for i, c in enumerate([(120, 40, 60), red, redL]): d.line(P([(3 + i * 3, 10 + i * 5), (18 + i * 3, 10 + i * 5)]), fill=c, width=2 * S)
        d.polygon(P([(20, 6), (29, 15), (20, 24), (23, 15)]), fill=steelL)
    elif name == 'iron': d.polygon(P([(6, 6), (26, 6), (26, 18), (16, 28), (6, 18)]), fill=steel); d.polygon(P([(9, 9), (23, 9), (23, 17), (16, 24), (9, 17)]), fill=(90, 90, 110)); d.line(P([(16, 9), (16, 24)]), fill=steelL, width=S); d.line(P([(6, 6), (26, 6)]), fill=steelL, width=S)
    elif name == 'ghost':   # a hooded shade, the eyes in shadow
        d.polygon(P([(16, 3), (24, 9), (26, 28), (21, 25), (16, 29), (11, 25), (6, 28), (8, 9)]), fill=(130, 140, 180)); d.polygon(P([(16, 3), (24, 9), (26, 28), (21, 25), (16, 29)]), fill=(90, 100, 140))
        d.ellipse(P([(11, 8), (21, 17)]), fill=dark); d.line(P([(13, 13), (15, 13)]), fill=(200, 220, 255), width=S); d.line(P([(17, 13), (19, 13)]), fill=(200, 220, 255), width=S)
    elif name == 'wind':
        for i, (r0, c) in enumerate([(11, steelL), (7, (170, 200, 230)), (3.5, (120, 160, 200))]): d.arc(P([(16 - r0, 16 - r0), (16 + r0, 16 + r0)]), 0 + i * 40, 270 + i * 40, fill=c, width=2 * S)
        heart(24, 24, 3.4, red, redL)
    elif name == 'vigor': heart(16, 15, 9, red, redL)
    elif name == 'vigor2': heart(11, 13, 6.5, (160, 20, 40), red); heart(20, 18, 7.5, red, redL)
    elif name == 'thirst': d.polygon(P([(16, 3), (25, 18), (22, 26), (16, 29), (10, 26), (7, 18)]), fill=red); d.ellipse(P([(7, 13), (25, 29)]), fill=red); d.ellipse(P([(10, 15), (15, 21)]), fill=redL)
    elif name == 'skill1': d.arc(P([(3, 3), (29, 29)]), 200, 340, fill=red, width=4 * S); d.arc(P([(5, 5), (27, 27)]), 210, 330, fill=redL, width=S); sword(10, 26, 22, 12, 1.8)
    elif name == 'art': moon(16, 16, 11, (220, 40, 62))
    elif name == 'skill2':   # a blade striking from behind its fading afterimages
        for i, c in enumerate([(70, 56, 110), (110, 90, 170), (160, 140, 220)]): sword(4 + i * 5, 27 - i * 2, 14 + i * 5, 9 - i * 2, 1.8, c, c, c)
        sword(16, 27, 28, 5, 2.4)
    elif name == 'moonblood':   # the cut moon, bleeding
        moon(16, 11, 9, (220, 40, 62))
        for (x, y, r0) in ((11, 23, 2.2), (17, 27, 2.6), (22, 22, 1.8)): d.polygon(P([(x, y - r0 * 2), (x + r0, y), (x, y + r0), (x - r0, y)]), fill=red); d.point(P([(x - 0.5, y - 0.5)])[0], fill=redL)
    elif name == 'rising': d.polygon(P([(16, 3), (27, 15), (20, 15), (20, 29), (12, 29), (12, 15), (5, 15)]), fill=gold); d.polygon(P([(16, 7), (23, 14), (18, 14), (18, 27), (14, 27), (14, 14), (9, 14)]), fill=(255, 230, 150))
    elif name == 'breath':   # a second wind: a pale swirl rising round a heart
        for i, (r0, c) in enumerate([(12, (220, 235, 250)), (8.5, (170, 200, 230))]): d.arc(P([(16 - r0, 14 - r0), (16 + r0, 14 + r0)]), 120 + i * 60, 400 + i * 60, fill=c, width=2 * S)
        heart(16, 19, 5, red, redL)
    elif name == 'quick': d.polygon(P([(18, 2), (8, 18), (15, 18), (12, 30), (25, 12), (17, 12), (21, 2)]), fill=gold); d.line(P([(18, 3), (10, 17)]), fill=(255, 240, 180), width=S)
    elif name == 'shard':   # a soul shard: a pale crystal with a wisp inside
        d.polygon(P([(16, 2), (24, 12), (20, 29), (12, 29), (8, 12)]), fill=(150, 200, 255)); d.polygon(P([(16, 2), (24, 12), (20, 29), (16, 29)]), fill=(100, 150, 230))
        d.polygon(P([(16, 6), (20, 13), (17, 24), (14, 13)]), fill=(225, 240, 255)); d.ellipse(P([(14, 15), (18, 19)]), fill=(255, 255, 255))
    elif name == 'souls':   # a spirit rising from its flame
        d.polygon(P([(16, 2), (23, 10), (25, 19), (21, 27), (16, 30), (11, 27), (7, 19), (9, 10)]), fill=(120, 170, 255)); d.polygon(P([(16, 8), (21, 15), (21, 23), (16, 27), (11, 23), (11, 15)]), fill=(190, 225, 255))
        for ex in (11, 18): d.polygon(P([(ex, 15), (ex + 3.5, 16.5), (ex + 3, 19.5), (ex + 0.5, 18.5)]), fill=(20, 26, 70))
        d.polygon(P([(14, 22), (18, 22), (17, 26), (15, 26)]), fill=(20, 26, 70))
    elif name == 'endless':   # waves without end: a ring of blades
        for i in range(6): a_ = i / 6 * math.tau; sword(16 + math.cos(a_) * 4, 16 + math.sin(a_) * 4, 16 + math.cos(a_) * 14, 16 + math.sin(a_) * 14, 1.6)
        d.ellipse(P([(12, 12), (20, 20)]), fill=red); d.ellipse(P([(14, 13), (17, 16)]), fill=redL)
    elif name == 'daily':   # a sun setting under the moon
        d.pieslice(P([(5, 13), (27, 35)]), 180, 360, fill=(232, 120, 40)); d.pieslice(P([(9, 17), (23, 31)]), 180, 360, fill=(255, 180, 90)); d.line(P([(2, 24), (30, 24)]), fill=gold, width=2 * S)
        moon(22, 8, 5, (220, 40, 62), False)
        for i in range(5): x = 6 + i * 5; d.line(P([(x, 27), (x + 2, 27)]), fill=(255, 190, 110), width=S)
    elif name == 'ach':   # a laurel round a star
        for side in (-1, 1):
            for i in range(5): a_ = math.pi / 2 + side * (0.5 + i * 0.42); x, y = 16 + math.cos(a_) * 11, 17 + math.sin(a_) * 11; d.ellipse(P([(x - 2.4, y - 1.4), (x + 2.4, y + 1.4)]), fill=(120, 170, 70))
        d.polygon(P([(16, 7), (18.5, 13), (25, 13.5), (20, 17.5), (21.5, 24), (16, 20.5), (10.5, 24), (12, 17.5), (7, 13.5), (13.5, 13)]), fill=gold)
    elif name == 'ngplus':   # the cut moon with a plus
        moon(13, 17, 10, (220, 40, 62)); d.rectangle(P([(23, 4), (26, 15)]), fill=gold); d.rectangle(P([(19, 8), (30, 11)]), fill=gold)
    elif name == 'bond':   # two links, one red, one pale
        d.ellipse(P([(3, 9), (19, 23)]), outline=red, width=3 * S); d.ellipse(P([(13, 9), (29, 23)]), outline=(150, 200, 255), width=3 * S)
        d.arc(P([(3, 9), (19, 23)]), 300, 60, fill=red, width=3 * S)
    elif name == 'ascend':   # a pale flame climbing over a chevron
        d.polygon(P([(16, 2), (23, 12), (21, 20), (16, 23), (11, 20), (9, 12)]), fill=(150, 200, 255)); d.polygon(P([(16, 7), (19, 13), (16, 19), (13, 13)]), fill=(240, 250, 255))
        d.polygon(P([(5, 30), (16, 22), (27, 30), (27, 26), (16, 18), (5, 26)]), fill=gold)
    small = img.resize((32, 32), Image.BOX)
    a = np.asarray(small).copy(); a[..., 3] = np.where(a[..., 3] > 90, 255, 0)   # hard edges
    al = a[..., 3] > 0; e = al & ~(np.roll(al, 1, 0) & np.roll(al, -1, 0) & np.roll(al, 1, 1) & np.roll(al, -1, 1))
    out = np.zeros((32, 32, 4), np.uint8); grow = al | np.roll(al, 1, 0) | np.roll(al, -1, 0) | np.roll(al, 1, 1) | np.roll(al, -1, 1)
    out[grow] = (14, 8, 16, 255); out[al] = a[al]; out[e, :3] = (a[e, :3] * 0.6).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def build_icons(path):
    sheet = Image.new('RGBA', (256, 256), (0, 0, 0, 0)); where = {}
    for i, name in enumerate(ICON_ORDER):
        r_, c_ = divmod(i, 8); sheet.alpha_composite(_icon(name), (c_ * 32, r_ * 32)); where[name] = (r_, c_)
    sheet.save(path); return where

# ---- the pack's stonework, recoloured into each act's palette (2026-11-11: "the ground structures and assets match") ---
# The hand-made walls, paving, columns, statues and rocks of the tile packs keep their shapes and shading but take the act's
# own ramp, so every hour reads as one place. 'd:Wall F1' becomes 'v:GateWall F1' (an 'i:' group key gains an I:
# 'i:Misc C7' -> 'v:GateMiscI C7'), in every direction the pack has it.
import json as _json, os as _os, re as _re
WASTE_STONE = ramp(['#120c0a', '#22170f', '#33241a', '#463326', '#5a4434', '#705744', '#8a6e58'])
ACT_RAMPS = {'Gate': BASALT, 'Cloister': FROST, 'Stair': UMBRA, 'Waste': WASTE_STONE, 'Throat': CLIFF, 'Shadow': STONE}
ACT_KEYS = {
    'Gate': ['d:Wall F1', 'd:Wall F2', 'd:Wall F3', 'd:Wall F4', 'd:Wall F5', 'd:Wall F7', 'd:Wall F8', 'd:Wall F9', 'd:Wall B7', 'd:Wall B8', 'i:Ground H1', 'i:Ground H4', 'i:Ground D1', 'i:Misc C5', 'i:Misc C6', 'i:Misc C7', 'd:Stone A1', 'd:Stone A2', 'd:Stone B4'],
    'Cloister': ['d:Wall G1', 'd:Wall G2', 'd:Wall G3', 'd:Wall F5', 'd:Wall A10', 'i:Ground H1', 'i:Ground H4', 'i:Misc C5', 'i:Misc C6', 'i:Misc C7', 'd:Stone A4', 'd:Stone A13', 'd:Stone A14', 'd:Stone A15', 'd:Stone A16', 'd:Stone B4'],
    'Stair': ['d:Wall A1', 'd:Wall A2', 'd:Wall A3', 'd:Wall A4', 'd:Wall A5', 'd:Wall A6', 'd:Wall A10', 'd:Wall A15', 'd:Wall A16', 'd:Wall A19', 'd:Wall J1', 'd:Wall J6', 'd:Wall J11', 'd:Ground H1', 'd:Ground H4', 'd:Stone A21', 'd:Stone A22', 'd:Stone A23', 'd:Stone A24', 'd:Stone B4'],
    'Waste': ['d:Wall A1', 'd:Wall A2', 'd:Wall A3', 'd:Wall A7', 'd:Wall A8', 'd:Wall A9', 'd:Wall A17', 'd:Wall A18', 'd:Ground B3', 'd:Ground B6', 'd:Stone A9', 'd:Stone A10', 'd:Stone B1', 'd:Stone B3', 'd:Stone B5', 'd:Misc D3'],
    'Throat': ['d:Wall A10', 'd:Ground D1', 'd:Ground H1', 'd:Stone A1', 'd:Stone A2', 'd:Stone A3', 'd:Stone B1', 'd:Stone B2', 'd:Stone B3', 'd:Stone B4', 'd:Stone B6', 'd:Stone B7', 'd:Stone B8', 'd:Stone B9'],
    'Shadow': ['d:Wall D1', 'd:Wall D2', 'd:Wall D3', 'd:Wall D4', 'd:Wall D5', 'd:Wall D7', 'd:Wall D8', 'd:Wall D9', 'd:Wall A6', 'd:Wall A10', 'd:Wall J11', 'd:Wall J16', 'd:Wall J17', 'd:Ground H1', 'd:Ground H4', 'd:Stone A8', 'd:Stone A21', 'd:Stone A23', 'd:Stone B4'],
}
def recolor_key(act, key):
    grp, rest = key.split(':', 1); fam, code = rest.split(' '); return f"v:{act}{fam}{'I' if grp == 'i' else ''} {code}"

def _recolor(im, pal, top=0.93):
    a = np.asarray(im.convert('RGBA'), np.float32); al = a[..., 3] > 0
    if not al.any(): return im
    L = a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11; lo, hi = np.percentile(L[al], 3), np.percentile(L[al], 97)
    t = np.clip((L - lo) / max(1.0, hi - lo), 0, 0.999) * (top - 0.07) + 0.07   # keep the extremes off pure black and white
    idx = np.clip((t * len(pal)).astype(int), 0, len(pal) - 1); out = a.copy(); out[..., :3] = np.where(al[..., None], pal[idx], a[..., :3])
    return Image.fromarray(out.astype(np.uint8), 'RGBA')

def recolors(iso_dir):
    """Items for every act's recoloured stonework, read from the packs (assets/iso/tiles.json)."""
    d = _json.load(open(iso_dir + '/tiles.json'))['tiles']; pages = {}; out = []
    def page(p):
        if p not in pages: pages[p] = Image.open(f'{iso_dir}/tiles_{p}.png').convert('RGBA')
        return pages[p]
    for act, keys in ACT_KEYS.items():
        pal = ACT_RAMPS[act]
        for key in keys:
            found = False
            for dr in ('N', 'W', 'E', 'S'):
                t = d.get(f'{key}_{dr}')
                if not t: continue
                im = page(t[0]).crop((t[1], t[2], t[1] + t[3], t[2] + t[4])); out.append((f'{recolor_key(act, key)}_{dr}', _recolor(im, pal, 0.74 if act == 'Cloister' else 0.93), (t[5], t[6]))); found = True
            if not found: print('no such pack tile', key)
    return out
