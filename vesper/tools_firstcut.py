# THE BLEEDING MOON - the First Cut's own look (2026-11-11, the author: "the final boss character looks wrong and
# horrible"): the knight he was drawn from, recoloured so he is nobody else: silver-white plate, crimson trim, deep
# violet-black in the shadows. Reads assets/pixel/master_knight.* (untouched) and writes assets/pixel/vh_firstcut.*.
# Usage: python3 vesper/tools_firstcut.py
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); PX = ROOT + '/assets/pixel'
SRC, DST = 'master_knight', 'vh_firstcut'
# Grey armour by its brightness -> ivory; warm trim (tan, gold) by its brightness -> crimson.
IVORY = [(0, (16, 10, 20)), (62, (34, 26, 40)), (76, (88, 82, 100)), (86, (138, 136, 152)), (98, (186, 186, 200)), (110, (220, 220, 230)), (134, (246, 244, 250)), (256, (255, 255, 255))]
CRIMSON = [(0, (30, 4, 10)), (90, (96, 8, 22)), (140, (168, 18, 40)), (200, (226, 40, 62)), (256, (255, 120, 130))]

def ramp(stops, v):
    xs = np.array([s[0] for s in stops], float); out = np.zeros(v.shape + (3,))
    for c in range(3): out[..., c] = np.interp(v, xs, [s[1][c] for s in stops])
    return out

def recolour(im):
    a = np.asarray(im.convert('RGBA')).astype(float); rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1); sat = (mx - mn) / np.maximum(mx, 1); lum = rgb @ [0.299, 0.587, 0.114]
    warm = (sat > 0.12) & (rgb[..., 0] >= rgb[..., 2])
    out = np.where(warm[..., None], ramp(CRIMSON, lum), ramp(IVORY, lum))
    res = a.copy(); res[..., :3] = np.where((a[..., 3] > 0)[..., None], out, rgb)
    return Image.fromarray(res.clip(0, 255).astype(np.uint8), 'RGBA')

d = json.load(open(f'{PX}/{SRC}.json'))
pages = []
for i, p in enumerate(d['pages']):
    name = f'{DST}_{i}.png'; recolour(Image.open(f'{PX}/{p}')).save(f'{PX}/{name}', optimize=True); pages.append(name)
d['id'] = DST; d['pages'] = pages
json.dump(d, open(f'{PX}/{DST}.json', 'w'), separators=(',', ':'))
print('wrote', DST, pages)
