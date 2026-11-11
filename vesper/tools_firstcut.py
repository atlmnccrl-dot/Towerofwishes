# THE BLEEDING MOON - the First Cut's own boss sheet (2026-11-11, the author: "make a proper boss sprite").
# Built from the real animations of the knight he was drawn from (every clip, every direction), not drawn shapes:
#   1. recoloured: silver-white plate, crimson trim, deep violet-black in the shadows;
#   2. redrawn at twice the resolution with Scale2x (EPX), so his edges stay sharp and smooth instead of turning to blocks;
#   3. given a boss's finish at that resolution: a crisp dark outline, a rim of moonlight on his upper-right edges, and the
#      seams of his armour burning crimson (the wound in the moon, in him).
# Reads assets/pixel/master_knight.* (untouched); writes assets/pixel/vh_firstcut.json and vh_firstcut_<n>.png with
# "res": 2 (js/assets.js draws a res-2 sheet at half the scale, so he keeps his size and gains the detail).
# Usage: python3 vesper/tools_firstcut.py
import json, os, hashlib
import numpy as np
from PIL import Image, ImageDraw
import math

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); PX = ROOT + '/assets/pixel'
SRC, DST, RES, PAGE = 'master_knight', 'vh_firstcut', 2, 2048
IVORY = [(0, (14, 8, 18)), (66, (30, 22, 38)), (76, (64, 58, 80)), (84, (112, 108, 128)), (94, (164, 162, 180)), (106, (208, 206, 220)), (132, (240, 238, 248)), (256, (255, 255, 255))]
CRIMSON = [(0, (30, 4, 10)), (90, (96, 8, 22)), (140, (168, 18, 40)), (200, (226, 40, 62)), (256, (255, 120, 130))]
OUTLINE, MOON, SEAM, SEAM_HOT = (14, 6, 12), (255, 228, 236), (214, 26, 52), (255, 96, 110)

def ramp(stops, v):
    xs = np.array([s[0] for s in stops], float); out = np.zeros(v.shape + (3,))
    for c in range(3): out[..., c] = np.interp(v, xs, [s[1][c] for s in stops])
    return out

def recolour(a):
    rgb = a[..., :3].astype(float); mx, mn = rgb.max(-1), rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1); lum = rgb @ [0.299, 0.587, 0.114]
    warm = (sat > 0.12) & (rgb[..., 0] >= rgb[..., 2])
    out = a.copy(); out[..., :3] = np.where(warm[..., None], ramp(CRIMSON, lum), ramp(IVORY, lum)).clip(0, 255).astype(np.uint8)
    return out

def scale2x(a):
    """EPX: every pixel becomes four, rounding diagonals off along matching neighbours."""
    h, w = a.shape[:2]; p = a.view(np.uint32).reshape(h, w)
    pad = np.pad(p, 1, mode='edge'); P = pad[1:-1, 1:-1]; A = pad[:-2, 1:-1]; B = pad[1:-1, 2:]; C = pad[1:-1, :-2]; D = pad[2:, 1:-1]
    o1 = np.where((C == A) & (C != D) & (A != B), A, P); o2 = np.where((A == B) & (A != C) & (B != D), B, P)
    o3 = np.where((D == C) & (D != B) & (C != A), C, P); o4 = np.where((B == D) & (B != A) & (D != C), D, P)
    out = np.zeros((h * 2, w * 2), np.uint32); out[0::2, 0::2] = o1; out[0::2, 1::2] = o2; out[1::2, 0::2] = o3; out[1::2, 1::2] = o4
    return out.view(np.uint8).reshape(h * 2, w * 2, 4)

def finish(a):
    """The boss's finish at 2x: crimson seams in the armour, moonlight on the upper-right edges, a dark outline."""
    m = a[..., 3] > 0; rgb = a[..., :3].astype(float); lum = rgb @ [0.299, 0.587, 0.114]
    n = lambda arr, dy, dx: np.roll(np.roll(arr, dy, 0), dx, 1)
    inner = m & n(m, 1, 0) & n(m, -1, 0) & n(m, 0, 1) & n(m, 0, -1)
    # Seams: thin dark lines inside the plate (darker than the pixels either side of them, across or down).
    L = lambda dy, dx: n(lum, dy, dx)
    line = ((L(0, 1) - lum > 34) & (L(0, -1) - lum > 34)) | ((L(1, 0) - lum > 34) & (L(-1, 0) - lum > 34))
    seam = inner & line & (lum < 120)
    out = a.copy()
    hot = seam & ((np.indices(lum.shape).sum(0) % 5) == 0)
    out[seam, :3] = SEAM; out[hot, :3] = SEAM_HOT
    # Moonlight: plate pixels whose upper-right neighbour is empty.
    rim = m & ~n(m, 1, -1) & ~seam
    out[rim, :3] = (out[rim, :3] * 0.45 + np.array(MOON) * 0.55).astype(np.uint8)
    # The outline: empty pixels touching him.
    edge = ~m & (n(m, 1, 0) | n(m, -1, 0) | n(m, 0, 1) | n(m, 0, -1))
    out[edge] = OUTLINE + (255,)
    return out

# ---- his cape and his horns, drawn at 2x onto every frame -------------------------------------------------------------
CAPE, CAPE_DK, CAPE_HI, HORN, HORN_DK = (112, 10, 28), (62, 4, 16), (178, 28, 48), (228, 222, 210), (70, 48, 58)
NO_CAPE = {'Die', 'Rolling', 'Slide'}
def head_of(a):
    """Where his crown is (its gold reads in every frame and direction): the topmost warm pixels."""
    rgb = a[..., :3].astype(int); mx, mn = rgb.max(-1), rgb.min(-1); warm = ((mx - mn) / np.maximum(mx, 1) > 0.12) & (rgb[..., 0] >= rgb[..., 2]) & (a[..., 3] > 0)
    ys, xs = np.nonzero(warm)
    if not len(ys): ys, xs = np.nonzero(a[..., 3] > 0); y0 = ys.min(); sel = ys <= y0 + 4; return xs[sel].mean(), y0 + 4.0
    y0 = ys.min(); sel = ys <= y0 + 5; return xs[sel].mean(), ys[sel].mean()
def cape(im, d, hx, hy, feet, i, clip, front, wind=None):
    """A tattered crimson cape from his shoulders: behind him, or over his back when he faces away."""
    g = ImageDraw.Draw(im); sy = hy + 13; L = max(18, feet - sy - 4)
    side = {'E': -1, 'W': 1, 'SE': -0.5, 'SW': 0.5, 'NE': -0.5, 'NW': 0.5, 'S': 0, 'N': 0}[d]
    moving = clip in ('Run', 'Walk', 'StrafeLeft', 'StrafeRight', 'RunBackwards'); sway = math.sin(i * 0.75) * (3 if not moving else 5)
    profile = d in ('E', 'W')
    tw, bw = (9, 20) if profile else (15, 30) if front else (13, 28)
    back = side * (16 if moving else 9) + sway; L = L * (0.82 if moving else 1)
    lift = 0
    if wind:   # the cinematic clips: (wx, lift, spread, flutter): blown sideways, lifted and spread by the wind
        wx, lift, spread, flut = wind; back = side * 4 + wx * L * 0.55 + math.sin(i * 1.3) * flut; bw *= spread
    tl, tr = (hx - tw / 2 + side * 3, sy), (hx + tw / 2 + side * 3, sy)
    by = sy + L * (1 - lift)
    bl, br = (hx - bw / 2 + back, by), (hx + bw / 2 + back, by)
    hem = [br]; n = 6
    for k in range(1, n):   # the torn hem
        t = k / n; amp = 2 if not wind else 2 + wind[3] * 0.8; hem.append((br[0] + (bl[0] - br[0]) * t, br[1] - (7 if k % 2 else 1) - amp * math.sin(i * 0.9 + k * 1.7)))
    hem.append(bl); pts = [tl, tr] + hem
    g.polygon(pts, fill=CAPE + (255,))
    mid = (tl[0] + tr[0]) / 2, (bl[0] + br[0]) / 2   # a fold down its middle and a lit edge
    g.polygon([(mid[0] - 2, sy + 3), (mid[0] + 2, sy + 3), (mid[1] + 5, by - 5), (mid[1] - 3, by - 3)], fill=CAPE_DK + (255,))
    g.line([tr, br], fill=CAPE_HI + (255,), width=2)
    g.ellipse([hx - tw / 2 - 1, sy - 3, hx + tw / 2 + 1, sy + 4], fill=CAPE_DK + (255,))   # the collar
def horns(im, d, hx, hy):
    """Two horns swept back from the crown (one, side on)."""
    g = ImageDraw.Draw(im)
    for sgn in ((-1, 1) if d not in ('E', 'W') else ((1,) if d == 'E' else (-1,))):
        back = {'E': -1, 'W': 1}.get(d, 0)
        pts = [(hx + sgn * 4, hy + 2), (hx + sgn * 8 + back * 3, hy - 4), (hx + sgn * 10 + back * 6, hy - 11), (hx + sgn * 8 + back * 9, hy - 17)]
        g.line(pts, fill=HORN + (255,), width=3); g.line(pts[2:], fill=HORN_DK + (255,), width=2)

def build():
    d = json.load(open(f'{PX}/{SRC}.json')); pages = [np.asarray(Image.open(f'{PX}/{p}').convert('RGBA')) for p in d['pages']]
    cache, items = {}, []   # unique frames: key -> (image, ox, oy)
    PAD = 14   # room (at 1x) for the cape, the horns and the outline
    def process(f, clip, dname, i, wind=None):
        pg = pages[f[0]]; x, y, w, h, ox, oy = f[1:7]
        a = np.zeros((h + 2 * PAD, w + 2 * PAD, 4), np.uint8); a[PAD:PAD + h, PAD:PAD + w] = pg[y:y + h, x:x + w]
        hx, hy = head_of(a); hx, hy = hx * RES, hy * RES; feet = (PAD + h) * RES
        body = Image.fromarray(scale2x(recolour(a))); front = dname in ('N', 'NE', 'NW')
        canvas = Image.new('RGBA', body.size, (0, 0, 0, 0))
        if clip not in NO_CAPE and not front: cape(canvas, dname, hx, hy, feet, i, clip, False, wind)
        canvas.alpha_composite(body)
        if clip not in NO_CAPE and front: cape(canvas, dname, hx, hy, feet, i, clip, True, wind)
        if clip != 'Die': horns(canvas, dname, hx, hy)
        img = finish(np.asarray(canvas).copy())
        ys, xs = np.nonzero(img[..., 3] > 0); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        img = np.ascontiguousarray(img[y0:y1, x0:x1])
        nox, noy = int((ox - PAD) * RES + x0), int((oy - PAD) * RES + y0)
        key = hashlib.md5(img.tobytes() + str((nox, noy)).encode()).hexdigest()
        if key not in cache: cache[key] = len(items); items.append((img, nox, noy))
        return cache[key]
    anims = {}
    for clip, dirs in d['anims'].items():
        anims[clip] = {k: [None if f is None else process(f, clip, k, i) for i, f in enumerate(fr)] for k, fr in dirs.items()}
    # The animation pack for the films (js/intro.js godAt): the knight's own frames, the cape in the wind.
    #   C_Hover   rising over the city: the cape lifted and spread by the updraft
    #   C_Stand   at the top of the Spire: the cape streaming out in the wind
    #   C_Raise   the blade held high (the Taunt's raised frames), the cape billowing
    #   C_Cut     the wide sweep that cut the moon (Attack6), the cape whipping against the swing
    #   C_Command calling his dead up (Special1), the cape flaring
    FILM_DIRS = ('S', 'SE', 'SW', 'E', 'W')
    def film(name, src, frames, windf):
        an = d['anims'][src]; anims[name] = {}
        for k in FILM_DIRS:
            fr = an.get(k) or an['S']; seq = [fr[min(len(fr) - 1, j)] for j in frames]
            anims[name][k] = [None if f is None else process(f, 'Film', k, i, windf(i, len(seq), k)) for i, f in enumerate(seq)]
    sgn = lambda k: {'E': -1, 'W': 1, 'SE': -1, 'SW': 1, 'S': 1}[k]
    film('C_Hover', 'Idle4', range(15), lambda i, n, k: (0.15 * math.sin(i * 0.5), 0.42, 1.45, 4))
    film('C_Stand', 'Idle4', range(15), lambda i, n, k: (0.75 * sgn(k), 0.18, 1.15, 3))
    film('C_Raise', 'Taunt', [8, 9, 10, 11, 12, 12, 12, 13, 12, 12, 13, 12], lambda i, n, k: (0.5 * sgn(k), 0.3, 1.3, 4))
    film('C_Cut', 'Attack6', range(15), lambda i, n, k: ((0.9 if i < 6 else -0.9) * sgn(k), 0.25, 1.3, 5))
    film('C_Command', 'Special1', range(15), lambda i, n, k: (0.3 * sgn(k), 0.35 + 0.15 * min(1, i / 6), 1.5, 4))
    # Shelf-pack the unique frames, tallest first, into PAGE x PAGE sheets.
    order = sorted(range(len(items)), key=lambda i: -items[i][0].shape[0]); place = {}; sheets = []
    cx = cy = row = 0; sheet = None
    for i in order:
        img = items[i][0]; h, w = img.shape[:2]
        if sheet is None or cx + w > PAGE: cx = 0; cy += row; row = 0
        if sheet is None or cy + h > PAGE: sheet = np.zeros((PAGE, PAGE, 4), np.uint8); sheets.append(sheet); cx = cy = row = 0
        sheet[cy:cy + h, cx:cx + w] = img; place[i] = (len(sheets) - 1, cx, cy, w, h); cx += w + 1; row = max(row, h + 1)
    names = []
    for k, sh in enumerate(sheets):
        used = np.nonzero(sh[..., 3].any(1))[0]; hh = int(used.max()) + 1 if len(used) else 1
        name = f'{DST}_{k}.png'; Image.fromarray(sh[:hh]).save(f'{PX}/{name}', optimize=True); names.append(name)
    for clip in anims:
        for k in anims[clip]:
            anims[clip][k] = [None if i is None else [int(v) for v in (place[i][0], place[i][1], place[i][2], place[i][3], place[i][4], items[i][1], items[i][2])] for i in anims[clip][k]]
    out = {'id': DST, 'cell': str(int(d['cell']) * RES), 'anchor': [d['anchor'][0] * RES, d['anchor'][1] * RES], 'res': RES, 'pages': names, 'anims': anims}
    for f in os.listdir(PX):   # old pages of this sheet beyond the new count
        if f.startswith(DST + '_') and f.endswith('.png') and f not in names: os.remove(f'{PX}/{f}')
    json.dump(out, open(f'{PX}/{DST}.json', 'w'), separators=(',', ':'))
    print('wrote', DST, len(items), 'unique frames on', len(names), 'pages', names)

build()
