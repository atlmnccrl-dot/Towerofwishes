"""Pack the isometric tile sets (2D Desert Fantasy and 2D Isometric Fantasy) into atlases for Vesper's arenas.

Input:  ISO_SRC (default: a folder holding the extracted packs desert_0*/ and iso_*/), every tile a 256x256 PNG
        whose ground diamond (128x64) is centred at (128, 208).
Output: assets/iso/tiles_<group><page>.png (groups: w walls and rocks, d desert, i iso, a animations) + assets/iso/tiles.json
        { "pages": {group: n}, "tiles": { key: [page, sx, sy, w, h, ox, oy] }, "anims": { key: [tile keys...] } }
        ox, oy: the crop's top-left relative to the anchor (128, 208), so a tile is drawn with its anchor
        on the projected point. Keys: "d:Ground A1_E" (desert), "i:Ground A1_E" (iso), "a:Torch 1/3" (animation).
Run: ISO_SRC=/path/to/env python3 -I vesper/tools_iso.py
"""
import glob, hashlib, json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get('ISO_SRC') or os.path.join(ROOT, 'art_source', 'iso')
OUT = os.path.join(ROOT, 'assets', 'iso')
AX, AY, PAGE = 128, 208, 2048
D4, D2 = ['E', 'N', 'S', 'W'], ['N', 'W']

def rng(letter, a, b): return [f'{letter}{i}' for i in range(a, b + 1)]

# What each arena theme draws from: ground bases and overlays, cliffs, water, walls, props, plants.
DESERT = {
    'Ground': (['A1'] + rng('B', 1, 6) + rng('C', 1, 6) + ['D1'] + rng('F', 1, 6) + rng('G', 1, 22)
               + ['H1', 'H4', 'H9', 'H10', 'H11'] + rng('I', 1, 10) + rng('W', 1, 9), D4),
    'Ground ': (rng('A', 2, 26) + rng('E', 1, 15) + rng('J', 1, 13) + rng('K', 1, 7), ['E', 'N']),
    'Wall': (rng('A', 1, 22) + rng('B', 1, 8) + rng('D', 1, 9) + rng('F', 1, 9) + ['G1', 'G2', 'G3', 'H1', 'H4', 'H20', 'H21']
             + ['J1', 'J6', 'J9', 'J10', 'J11', 'J12'] + rng('J', 16, 20), D2),
    'WallFlora': (rng('A', 1, 14), D2),
    'Misc': (rng('A', 1, 9) + ['B1', 'B2', 'B3', 'B5', 'B6'] + rng('B', 8, 12) + ['B14'] + rng('B', 17, 21) + rng('B', 37, 47)
             + rng('B', 55, 58) + rng('B', 62, 66) + ['C1', 'C5', 'C6', 'C7', 'C8', 'C12', 'C13', 'C14'] + rng('D', 1, 8) + rng('E', 1, 11), ['E', 'S']),
    'Tree': (rng('A', 1, 4) + ['B1', 'C1'] + rng('D', 1, 3) + rng('E', 1, 6), ['E', 'S']),
    'Stone': (rng('A', 1, 24) + rng('B', 1, 11), ['E', 'S']),
    'Flora': (rng('A', 1, 7) + rng('B', 1, 6) + rng('C', 1, 6), ['E', 'S']),
    'Door': (['A1', 'A2'] + rng('C', 1, 10), D2),
}
ISO = {
    'Ground': (['A1', 'A2'] + rng('B', 1, 6) + rng('C', 1, 6) + ['D1'] + rng('F', 1, 6) + rng('G', 1, 22)
               + ['H1', 'H4', 'H9', 'H10', 'H11'] + rng('I', 1, 10), D4),
    'Ground ': (rng('A', 3, 12) + rng('A', 14, 24) + rng('E', 1, 15) + rng('J', 1, 10), ['E', 'N']),
    'Misc': (rng('A', 1, 9) + ['B1', 'B2', 'B3', 'B5', 'B6'] + rng('B', 8, 12) + ['B14'] + rng('B', 17, 21) + rng('B', 37, 48)
             + rng('B', 55, 58) + ['C1', 'C4', 'C5', 'C6', 'C7', 'C8', 'C12', 'C13', 'C14'] + rng('D', 1, 5) + rng('E', 1, 11), ['E', 'S']),
    'Flora': (rng('A', 1, 7) + rng('B', 1, 6), ['E', 'S']),
}
SINGLES = ['Torch East', 'Torch West', 'Torch2', 'TreeTrunkBroken', 'FirePlace']
ANIMS = ['Torch 1', 'Fire', 'Fire2', 'Barrel 1', 'Barrel 2', 'Barrel 3', 'Gas', 'PortalIdle', 'PortalOpen', 'Turret1',
         'Skeleton explosion', 'Clay explosion', 'wood explosion large', 'Wall Stone explosion', 'Stone damage', 'straw explosion',
         'Tree Green Explosion', 'Water Ripples 1', 'LevelUp']
# Atlas groups, loaded per arena theme: shared walls and rocks, desert ground and props, iso ground and props, animations.
def group(key):
    if key.startswith('a:'): return 'a'
    if key.split(' ')[0][2:] in ('Wall', 'WallFlora', 'Door', 'Stone', 'Tree') or key in ['d:' + n for n in SINGLES]: return 'w'
    return key[0]

def index(pattern):
    out = {}
    for f in glob.glob(os.path.join(SRC, pattern), recursive=True):
        out.setdefault(os.path.basename(f)[:-4], f)
    return out

def main():
    des, iso = index('desert_0*/**/*.png'), index('iso_1*/**/*.png')
    want, missing = [], []
    for tag, table, files in (('d', DESERT, des), ('i', ISO, iso)):
        for pre, (codes, dirs) in table.items():
            for c in codes:
                for d in dirs:
                    n = f'{pre.strip()} {c}_{d}'
                    (want.append((f'{tag}:{n}', files[n])) if n in files else missing.append(f'{tag}:{n}'))
    for n in SINGLES:
        if n in des: want.append(('d:' + n, des[n]))
    anims = {}
    for a in ANIMS:
        ds = [d for d in glob.glob(os.path.join(SRC, 'desert_0*', '**', a), recursive=True) if os.path.isdir(d)]
        if not ds: missing.append('a:' + a); continue
        fs = sorted(glob.glob(os.path.join(ds[0], '*.png')))
        anims[a] = []
        for k, f in enumerate(fs):
            want.append((f'a:{a}/{k}', f)); anims[a].append(f'a:{a}/{k}')
    if missing: print('missing', len(missing), missing[:12])
    # Trim, dedupe, shelf-pack (tallest first).
    items, uniq = [], {}
    for key, f in want:
        im = Image.open(f).convert('RGBA'); bb = im.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
        if not bb: bb = (AX, AY, AX + 1, AY + 1)
        crop = im.crop(bb); h = hashlib.md5(crop.tobytes() + bytes(str(crop.size), 'ascii')).hexdigest()
        items.append((key, h, bb))
        if h not in uniq: uniq[h] = crop
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(os.path.join(OUT, 'tiles_*.png')): os.remove(f)
    place, pages = {}, {}
    for g in 'wdia':
        hs = sorted({h for key, h, bb in items if group(key) == g}, key=lambda h: (-uniq[h].height, -uniq[h].width))
        pg, x, y, rowh, n = Image.new('RGBA', (PAGE, PAGE)), 0, 0, 0, 0
        def flush(last):
            im = pg.crop((0, 0, PAGE, y + rowh + 1)) if last else pg
            im = im.quantize(colors=256, method=Image.FASTOCTREE)
            im.save(os.path.join(OUT, f'tiles_{g}{n}.png'), optimize=True)
        for h in hs:
            if h in place: continue
            im = uniq[h]
            if x + im.width > PAGE: x, y, rowh = 0, y + rowh + 1, 0
            if y + im.height > PAGE: flush(False); pg, x, y, rowh, n = Image.new('RGBA', (PAGE, PAGE)), 0, 0, 0, n + 1
            pg.paste(im, (x, y)); place[h] = (f'{g}{n}', x, y); x += im.width + 1; rowh = max(rowh, im.height)
        flush(True); pages[g] = n + 1
    tiles = {}
    for key, h, bb in items:
        p, sx, sy = place[h]; im = uniq[h]
        tiles[key] = [p, sx, sy, im.width, im.height, bb[0] - AX, bb[1] - AY]
    with open(os.path.join(OUT, 'tiles.json'), 'w') as fh:
        json.dump({'pages': pages, 'tiles': tiles, 'anims': anims}, fh, separators=(',', ':'))
    print(len(tiles), 'tiles,', len(uniq), 'unique, pages', pages, len(anims), 'anims')

if __name__ == '__main__':
    main()
