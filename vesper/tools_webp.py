# Lossless WebP copies of the images the web build ships (2026-11-13: about half the download, pixel-identical).
# Reads assets/<pixel|cbfx|iso>/*.png named in the list (default: the published package's files) and writes
# assets/webp/<dir>/<name>.webp; the shared PNGs stay untouched (js/assets.js tries the WebP copy first and falls back
# to the PNG). Every copy is decoded again and compared pixel by pixel; a mismatch stops the run.
# Usage: python3 vesper/tools_webp.py [package_dir]
import os, sys, io
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageChops
REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); A = os.path.join(REPO, 'assets')
def one(rel):
    src = os.path.join(A, rel); dst = os.path.join(A, 'webp', rel[:-4] + '.webp')
    im = Image.open(src).convert('RGBA'); b = io.BytesIO(); im.save(b, 'WEBP', lossless=True, exact=True, method=5)
    back = Image.open(io.BytesIO(b.getvalue())).convert('RGBA')
    if ImageChops.difference(im, back).getbbox() is not None: raise SystemExit('mismatch ' + rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True); open(dst, 'wb').write(b.getvalue())
    return rel, os.path.getsize(src), len(b.getvalue()), 'new'
if __name__ == '__main__':
    pkg = sys.argv[1] if len(sys.argv) > 1 else None
    if pkg: rels = [os.path.relpath(os.path.join(r, f), os.path.join(pkg, 'assets')) for d in ('pixel', 'cbfx', 'iso') for r, _, fs in os.walk(os.path.join(pkg, 'assets', d)) for f in fs if f.endswith('.png')]
    else: rels = [os.path.join(d, f) for d in ('cbfx', 'iso') for f in os.listdir(os.path.join(A, d)) if f.endswith('.png')]
    rels = [r for r in rels if os.path.exists(os.path.join(A, r))]
    with ProcessPoolExecutor() as ex: res = list(ex.map(one, sorted(rels)))
    # Keep a copy only where it saves at least a tenth (the random-cast sheets barely shrink); the list tells the game which.
    keep = [r for r in res if r[2] < 0.9 * r[1]]
    for r in res:
        if r not in keep:
            q = os.path.join(A, 'webp', r[0][:-4] + '.webp')
            if os.path.exists(q): os.remove(q)
    import json; json.dump(sorted(r[0] for r in keep), open(os.path.join(A, 'webp', 'list.json'), 'w'))
    a = sum(r[1] for r in keep); b = sum(r[2] for r in keep)
    print(f'{len(res)} images checked pixel-identical; {len(keep)} kept: {a / 1e6:.1f} MB png -> {b / 1e6:.1f} MB webp ({100 - b * 100 / a:.0f}% smaller)')
