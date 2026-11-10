# THE BLEEDING MOON - the First Cut as a pixel-art sprite, drawn in code (no outside art). Same proportions as the
# polygon god in js/intro.js (deity(): one unit = the old silhouette's unit, the eyes at the origin), so it drops into
# every scene and the boss fight. Three poses (plant: the sword point-down before him; raise: the sword up; side: drawn
# back flat along the cut), four frames each (the cape stirring, the runes pulsing), at 3 and 6 pixels per unit.
# Writes assets/forge/firstcut_<n>.png + assets/forge/firstcut.json. Usage: python3 vesper/tools_boss.py [preview.png]
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); OUT = ROOT + '/assets/forge'
HP = 12                 # working pixels per unit
SIZES = [3, 6]          # the sprite's pixels per unit
def hexc(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
def ramp(cs): return np.stack([hexc(c) for c in cs])
MATS = {1: ramp(['#06050a', '#0f0d15', '#1a1622', '#262030', '#352d42', '#4a4058', '#665a76', '#8a7e9a']),   # iron
        2: ramp(['#140205', '#240409', '#3a060e', '#560a16', '#76101e', '#981a28']),                          # cloth
        3: ramp(['#32281f', '#5e4e3e', '#8c7a62', '#b8a482', '#ddd0b2', '#f2ead6']),                          # bone
        4: ramp(['#2e1c06', '#5a3a0e', '#8e621a', '#c4922e', '#e8c058', '#fae6a0']),                          # gold
        5: ramp(['#100e14', '#221e28', '#3a3442', '#58506a', '#7c7490', '#a8a0b8', '#d4cee0']),               # blade steel
        6: ramp(['#120a08', '#24140e', '#3a2216', '#523020']),                                                # leather
        7: ramp(['#5a0a14', '#a01428', '#e02038', '#ff4a5e', '#ffa0ae', '#ffe4e8'])}                          # glow
OUTLINE, RIM = hexc('#040205'), hexc('#ff5a6a')
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16 - 0.5

class Canvas:
    def __init__(s, x0, y0, x1, y1):
        s.x0, s.y0 = x0, y0; s.w, s.h = int((x1 - x0) * HP), int((y1 - y0) * HP)
        s.V = np.zeros((s.h, s.w), np.float32); s.M = np.zeros((s.h, s.w), np.uint8); s.E = np.zeros((s.h, s.w), np.float32)
        yy, xx = np.mgrid[0:s.h, 0:s.w]; s.ux = xx / HP + x0; s.uy = yy / HP + y0
        r = np.random.default_rng(7); s.noise = np.asarray(Image.fromarray((r.random((s.h // 6 + 2, s.w // 6 + 2)) * 255).astype(np.uint8)).resize((s.w, s.h), Image.BILINEAR), np.float32) / 255
    def P(s, pts): return [((x - s.x0) * HP, (y - s.y0) * HP) for x, y in pts]
    def mask_poly(s, pts):
        m = Image.new('L', (s.w, s.h), 0); ImageDraw.Draw(m).polygon(s.P(pts), fill=255); return m
    def mask_line(s, pts, wu):
        m = Image.new('L', (s.w, s.h), 0); d = ImageDraw.Draw(m); p = s.P(pts); w = int(wu * HP)
        d.line(p, fill=255, width=w, joint='curve')
        for (x, y) in p: d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
        return m
    def paint(s, m, mat, base, bevel=0.3, glob=0.16, ridge=None, nz=0.06):
        """Fill a part: base tone, a bevel lit from the top left, a broad gradient across it, a little grain."""
        a = np.asarray(m, np.float32) / 255; sel = a > 0.5
        if not sel.any(): return
        bl = np.asarray(m.filter(ImageFilter.GaussianBlur(HP * 0.7)), np.float32) / 255
        gy, gx = np.gradient(bl); bev = np.clip((gx * 0.6 + gy * 0.8) * HP * 1.6, -1, 1)   # facing up-left: lit
        ys, xs = np.nonzero(sel); cx, cy = xs.mean(), ys.mean(); sz = max(np.ptp(xs), np.ptp(ys), 1)
        g = -(((s.ux * HP - s.x0 * HP) - cx) * 0.55 + ((s.uy * HP - s.y0 * HP) - cy) * 0.8) / sz
        v = base + bevel * bev + glob * g + (s.noise - 0.5) * nz
        if ridge is not None: v += ridge(s.ux, s.uy)
        s.V[sel] = np.clip(v[sel], 0, 0.999); s.M[sel] = mat; s.E[sel] = 0
    def poly(s, pts, mat, base, **k): s.paint(s.mask_poly(pts), mat, base, **k)
    def line(s, pts, wu, mat, base, **k): s.paint(s.mask_line(pts, wu), mat, base, **k)
    def groove(s, pts, wu, dv):
        """An engraved line: darker where it cuts the metal."""
        m = np.asarray(s.mask_line(pts, wu), np.float32) > 127; m &= s.M > 0; s.V[m] = np.clip(s.V[m] + dv, 0, 0.999)
    def glow(s, pts, wu, k=1.0):
        m = np.asarray(s.mask_line(pts, wu), np.float32) > 127; s.M[m] = 7; s.V[m] = 0.55 + 0.4 * k; s.E[m] = k
        halo = np.asarray(s.mask_line(pts, wu * 3.2).filter(ImageFilter.GaussianBlur(HP * 0.5)), np.float32) / 255
        s.E = np.maximum(s.E, halo * 0.5 * k)

def god(pose, fr):
    ph = fr / 4 * math.tau; sway = math.sin(ph); pulse = 0.75 + 0.25 * math.sin(ph + 1)
    bounds = {'plant': (-40, -21, 40, 105), 'raise': (-40, -98, 40, 80), 'side': (-102, -21, 40, 80)}[pose]
    c = Canvas(*bounds)
    # The cape, two torn wings behind him, moving a little.
    for sx in (-1, 1):
        pts = [(sx * 6, 7), (sx * 13, 8)]
        for i in range(9): pts.append((sx * (14 + i * 2.6 + math.sin(ph + i) * 0.8), 20 + i * 6))
        for i in range(8, -1, -1): pts.append((sx * (3 + i * 1.2), 70 + (6 if i % 2 else -2) + sway * 0.8 + math.sin(ph * 2 + i) * 0.6))
        c.poly(pts, 2, 0.42, bevel=0.15, glob=0.25)
        for k in range(4):   # folds
            x0 = sx * (8 + k * 4.5); c.groove([(x0, 12 + k), (x0 + sx * (k * 2.2), 66)], 0.5, -0.16)
    # The legs, greaves and knees, between the wings.
    for sx in (-1, 1):
        c.poly([(sx * 0.6, 31), (sx * 7.2, 31), (sx * 7.0, 52), (sx * 6.4, 72), (sx * 1.2, 72), (sx * 1.0, 52)], 1, 0.36)
        c.poly([(sx * 0.4, 46), (sx * 7.8, 46), (sx * 7.2, 55), (sx * 0.8, 55)], 1, 0.5)   # the knee
        c.poly([(sx * 0.6, 71), (sx * 7.4, 71), (sx * 9.4, 76.5), (sx * 0.2, 76.5)], 1, 0.4)    # the foot
        c.groove([(sx * 3.6, 56), (sx * 3.5, 70)], 0.35, 0.12)
    # Tassets, the plates hanging from the waist.
    for k, x in enumerate([-6.5, -2.2, 2.2]):
        c.poly([(x, 30), (x + 4.4, 30), (x + 4.8, 40), (x - 0.4, 40)], 1, 0.4 + 0.04 * k)
    # A tabard hanging from the belt to the shins: crimson, torn at the hem, the cut moon in gold on it.
    hem = [(-5.6, 30)]
    for i in range(9): hem.append((-5.0 + i * 1.25 + math.sin(ph + i) * 0.15, 62 + (3 if i % 2 else -1) + sway * 0.5))
    hem.append((5.6, 30)); c.poly(hem, 2, 0.5, bevel=0.2, glob=0.3)
    c.groove([(-2.2, 33), (-2.6, 62)], 0.4, -0.18); c.groove([(2.2, 33), (2.6, 62)], 0.4, -0.18)
    c.line([(0, 41), (0, 41)], 5.0, 4, 0.62, bevel=0.3); c.line([(1.3, 40.2), (1.3, 40.2)], 4.0, 2, 0.5, bevel=0.1)   # the crescent
    c.glow([(-2.6, 42.4), (2.6, 39.6)], 0.32, pulse * 0.8)   # the cut across it
    # The sword (behind his arms when raised, in front when planted or drawn back: drawn last then).
    def sword(T):
        flat = pose != 'raise'   # planted and drawn-back share the planted sword's own frame
        bl = [(-2.2, 30), (2.2, 30), (1.6, 95), (0, 102), (-1.6, 95)] if flat else [(-2.2, -23.5), (2.2, -23.5), (1.6, -88), (0, -95), (-1.6, -88)]
        gd = [(-8, 28), (8, 28), (9, 30.5), (-9, 30.5)] if flat else [(-8, -21), (8, -21), (9, -23.5), (-9, -23.5)]
        gr = [(-1, 19), (1, 19), (1, 28), (-1, 28)] if flat else [(-1, -21), (1, -21), (1, -13), (-1, -13)]
        pm = (0, 18.2) if flat else (0, -11.8)
        bl, gd, gr = T(bl), T(gd), T(gr); pm = T([pm])[0]
        c.poly(bl, 5, 0.55, bevel=0.35, glob=0.2, ridge=None)
        a, b = bl[0], bl[1]; tip = bl[3]; mid0 = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        c.groove([mid0, (mid0[0] + (tip[0] - mid0[0]) * 0.86, mid0[1] + (tip[1] - mid0[1]) * 0.86)], 0.9, -0.22)   # the fuller
        c.glow([(mid0[0] + (tip[0] - mid0[0]) * 0.04, mid0[1] + (tip[1] - mid0[1]) * 0.04), (mid0[0] + (tip[0] - mid0[0]) * 0.78, mid0[1] + (tip[1] - mid0[1]) * 0.78)], 0.32, pulse)
        c.poly(gd, 4, 0.5, bevel=0.35); c.poly(gr, 6, 0.5)
        for t in (0.25, 0.5, 0.75): ga = (gr[0][0] + (gr[3][0] - gr[0][0]) * t, gr[0][1] + (gr[3][1] - gr[0][1]) * t); gb = (gr[1][0] + (gr[2][0] - gr[1][0]) * t, gr[1][1] + (gr[2][1] - gr[1][1]) * t); c.groove([ga, gb], 0.3, -0.25)
        c.line([pm, pm], 2.2, 4, 0.6); c.glow([pm, pm], 0.9, pulse)
    if pose == 'side':
        HX, HY, ca, sa = -15, 15, math.cos(math.pi - 0.34), math.sin(math.pi - 0.34)
        def T(pts):   # the planted sword's own frame (along +y from the hilt) turned to lie along the cut
            out = []
            for (x, y) in pts:
                t = (y - 28) * (81 / 74) + 6; n = x   # distance along the blade from the hilt, across it
                out.append((HX + t * ca - n * sa, HY + t * sa + n * ca))
            return out
    else: T = lambda pts: pts
    if pose == 'raise': sword(T)
    # The breastplate: a ridge down the middle, engraved lines, the runes burning in it.
    c.poly([(-3, 4.5), (3, 4.5), (5.5, 8), (-5.5, 8)], 1, 0.46)   # the gorget
    c.poly([(-7.5, 8), (7.5, 8), (8.5, 18), (6, 32), (-6, 32), (-8.5, 18)], 1, 0.42, ridge=lambda ux, uy: np.where(ux < 0, 0.08, -0.06))
    for y in (13, 23): c.groove([(-7.6, y), (-1.2, y + 2.2), (1.2, y + 2.2), (7.6, y)], 0.35, -0.2)
    c.groove([(0, 8.5), (0, 31)], 0.3, 0.16)
    c.glow([(0, 11), (0, 29)], 0.35, pulse)
    for y in (16, 21, 26): c.glow([(-3.2, y - 2.2), (0, y), (3.2, y - 2.2)], 0.3, pulse * 0.85)
    c.poly([(-7.2, 29.5), (7.2, 29.5), (7.6, 32.5), (-7.6, 32.5)], 4, 0.45)   # the belt, gold
    # The arms down to the hilt (or up, or across to the drawn-back sword), the gauntlets on the grip.
    for sx in (-1, 1):
        if pose == 'raise': pts = [(sx * 12, 11), (sx * 13, -2), (sx * 2.6, -16.5)]
        elif pose == 'side': pts = [(sx * 12, 11), ((-15 if sx < 0 else 4), (17 if sx < 0 else 20)), (-15, 15)]
        else: pts = [(sx * 12, 11), (sx * 12.5, 19), (sx * 2.6, 23.5)]
        c.line(pts, 4.8, 1, 0.38, bevel=0.35)
        e = pts[1]; c.line([e, e], 3.2, 1, 0.5, bevel=0.4)   # the elbow cop
    if pose == 'side': gp = [(-17.5, 12.5), (-12.5, 12.5), (-12.5, 17.5), (-17.5, 17.5)]
    elif pose == 'raise': gp = [(-3.4, -19.5), (3.4, -19.5), (3.4, -14), (-3.4, -14)]
    else: gp = [(-3.4, 21), (3.4, 21), (3.4, 26.5), (-3.4, 26.5)]
    c.poly(gp, 1, 0.48, bevel=0.4)
    # The pauldrons, three spikes each, banded plates.
    for sx in (-1, 1):
        c.poly([(sx * 4, 7), (sx * 11, 5.5), (sx * 15, 8.5), (sx * 15.5, 13), (sx * 11, 15), (sx * 5.5, 12)], 1, 0.46, bevel=0.4)
        for k in range(2): c.groove([(sx * (6 + k * 0.5), 9.5 + k * 2), (sx * 11, 8 + k * 2.4), (sx * (15 - k * 0.3), 11 + k * 1.4)], 0.3, -0.2)
        for i in range(3): c.poly([(sx * (8 + i * 2.6), 6.2 - i * 0.2), (sx * (9.2 + i * 2.6), -0.5 - i * 1.2), (sx * (10.4 + i * 2.6), 6.5)], 1, 0.52, bevel=0.4)
        c.line([(sx * 12.8, 10.6), (sx * 12.8, 10.6)], 0.8, 4, 0.6)   # a rivet
    # The horns, ridged bone sweeping out and up.
    for sx in (-1, 1):
        c.poly([(sx * 2.4, -3.5), (sx * 6, -7), (sx * 9.5, -12), (sx * 9, -18), (sx * 8, -13), (sx * 5, -8.5), (sx * 2.8, -6)], 3, 0.55, bevel=0.4)
        for k in range(4): t = 0.2 + k * 0.17; c.groove([(sx * (2.9 + 6.3 * t), -4.4 - 9 * t), (sx * (4.4 + 5.6 * t), -6.2 - 9.4 * t)], 0.25, -0.18)
    # The helm: tall, narrowing to the jaw, a dark visor slit (no eyes in it), the crown of five spikes.
    c.poly([(-3.4, -5), (3.4, -5), (3.2, 2), (2.4, 4.6), (0, 6), (-2.4, 4.6), (-3.2, 2)], 1, 0.46, bevel=0.45, ridge=lambda ux, uy: np.where(ux < 0, 0.07, -0.05))
    c.groove([(-2.7, -0.4), (2.7, -0.4)], 0.55, -0.6)
    for x in (-1.2, 0, 1.2): c.groove([(x, 2.2), (x, 3.6)], 0.22, -0.4)
    crown = [(-3.4, -5)] + [(-3.4 + i * 0.85, -6.2 if i % 2 else (-11.5 if i == 4 else -8.6)) for i in range(9)] + [(3.4, -5)]
    c.poly(crown, 1, 0.5, bevel=0.4)
    c.poly([(-3.5, -5.6), (3.5, -5.6), (3.5, -4.6), (-3.5, -4.6)], 4, 0.55)   # its gold band
    c.line([(0, -7.4), (0, -7.4)], 1.0, 4, 0.6); c.glow([(0, -7.4), (0, -7.4)], 0.5, pulse)
    if pose != 'raise': sword(T)
    return c

def finish(c, P):
    """Down to P pixels per unit, banded into the material ramps, the runes lit, the moon's rim light, the outline."""
    f = HP // P; h, w = c.h // f, c.w // f
    M = c.M[f // 2::f, f // 2::f][:h, :w]
    V = c.V[:h * f, :w * f].reshape(h, f, w, f).mean((1, 3)); E = c.E[:h * f, :w * f].reshape(h, f, w, f).max((1, 3))
    cov = (c.M[:h * f, :w * f] > 0).reshape(h, f, w, f).mean((1, 3)); M = np.where(cov > 0.45, np.where(M > 0, M, 1), 0)
    out = np.zeros((h, w, 4), np.float32); b = BAYER[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4]
    for mat, pal in MATS.items():
        sel = M == mat
        if not sel.any(): continue
        idx = np.clip(np.floor(V * len(pal) + b * 0.55), 0, len(pal) - 1).astype(int)
        out[sel, :3] = pal[idx][sel]; out[sel, 3] = 255
    gl = (E > 0.08) & (M != 7)   # the runes' light spilling onto the metal
    out[gl, :3] = out[gl, :3] * (1 - E[gl, None] * 0.6) + MATS[7][2] * E[gl, None] * 0.6
    A = out[..., 3] > 0
    def outside(dy, dx): return ~np.roll(np.roll(A, dy, 0), dx, 1)
    edge = A & (outside(1, 0) | outside(-1, 0) | outside(0, 1) | outside(0, -1))
    inner = A & ~edge
    rim = inner & (np.roll(edge, 1, 0) | np.roll(edge, -1, 1) | np.roll(edge, 1, 1))   # the edge's inner ring, upper and side
    if P >= 6: rim |= inner & (np.roll(rim, 1, 0) | np.roll(rim, -1, 1))
    up = np.zeros_like(A); up[:-2] = ~A[2:]   # facing up
    rk = np.where(up | outside(0, -1) | outside(0, 1), 0.55, 0.3)
    out[rim, :3] = out[rim, :3] * (1 - rk[rim, None]) + RIM * rk[rim, None]
    out[edge, :3] = out[edge, :3] * 0.25 + OUTLINE * 0.75
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA'), ((0 - c.x0) * P, (0 - c.y0) * P)

def pack(items, maxw=2048):
    items = sorted(items, key=lambda t: -t[1].height); pages = []; place = {}
    cur, x, y, row = [], 0, 0, 0
    for k, im, anc in items:
        if x + im.width > maxw: x = 0; y += row + 1; row = 0
        if y + im.height > 2048: pages.append(cur); cur, x, y, row = [], 0, 0, 0
        cur.append((k, im, anc, x, y)); place[k] = (len(pages), x, y, im.width, im.height, anc[0], anc[1]); x += im.width + 1; row = max(row, im.height)
    pages.append(cur)
    imgs = []
    for pg in pages:
        H = max(it[4] + it[1].height for it in pg); W = max(it[3] + it[1].width for it in pg); page = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for k, im, anc, x, y in pg: page.alpha_composite(im, (x, y))
        imgs.append(page)
    return imgs, place

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); items = []
    for pose in ('plant', 'raise', 'side'):
        for fr in range(4):
            c = god(pose, fr)
            for P in SIZES:
                im, anc = finish(c, P); items.append((f'{pose}/{P}/{fr}', im, anc))
    pages, place = pack(items)
    for i, pg in enumerate(pages): pg.save(f'{OUT}/firstcut_{i}.png', optimize=True)
    json.dump({'sizes': SIZES, 'pages': [f'firstcut_{i}.png' for i in range(len(pages))], 'frames': {k: list(v) for k, v in place.items()}}, open(OUT + '/firstcut.json', 'w'))
    print('pages', [p.size for p in pages], 'frames', len(place))
    if len(sys.argv) > 1:
        sel = [im for k, im, _ in items if k.endswith('/6/0')] + [im for k, im, _ in items if k.endswith('/3/0')]
        W = sum(i.width for i in sel) + 20 * len(sel); H = max(i.height for i in sel)
        sheet = Image.new('RGBA', (W, H + 20), (60, 14, 24, 255)); x = 10
        for im in sel: sheet.alpha_composite(im, (x, 10)); x += im.width + 20
        sheet.save(sys.argv[1])
