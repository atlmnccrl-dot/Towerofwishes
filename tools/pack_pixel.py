"""Pack the Character Creator sheets into compact atlases for the game.

Input:  art_source/characters/<set>/<Anim>.png   (1920x1024: 15 frames x 8 directions of 128 px,
        rows E, SE, S, SW, W, NW, N, NE), as exported from the creator.
Output: assets/pixel/<set>_<page>.png + assets/pixel/<set>.json

Each frame is trimmed to its pixels and packed; identical frames are stored once. The JSON
keeps every frame's offset inside its 128 px cell, so the feet stay on the same anchor.
A drop shadow baked into an export (near-black, half transparent) is removed: the game
draws its own. Run: python3 tools/pack_pixel.py [set ...]
"""
import json, os, sys, hashlib
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art_source', 'characters')
OUT = os.path.join(ROOT, 'assets', 'pixel')
DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']
CELL, PAGE = 128, 2048

FIGHT = ['Idle', 'Idle2', 'Idle3', 'Idle4', 'Walk', 'Run', 'StrafeLeft', 'StrafeRight', 'RunBackwards',
         'Attack1', 'Attack2', 'Attack3', 'Attack4', 'Attack5', 'Attack6', 'Kick', 'Special1', 'Rolling', 'TakeDamage',
         'Slide', 'Die', 'Taunt', 'CrouchIdle']
NPC = ['Idle', 'Idle2', 'Idle3', 'Walk', 'Run', 'Attack5', 'Rolling', 'TakeDamage', 'Slide', 'Die',
       'Taunt', 'CrouchIdle', 'CrouchRun']
NPC_SETS = {'erdra_baker', 'erdra_f1', 'erdra_f2', 'erdra_m1', 'erdra_m2', 'erdra_musician', 'erdra_vendor',
            'ashgate_f1', 'ashgate_m1', 'ashgate_m2', 'tavern_keeper', 'shopkeeper', 'registrar',
            'evaluator', 'miller', 'guard_officer', 'sword_smith', 'nox_target', 'labyrinth_citizen',
            'merchant_recurring', 'demon_dealer', 'hamlet_people', 'beastfolk_f', 'hooded_follower'}
NO_STRIP = {'fragment'}  # a black silhouette: its own dark pixels are not a shadow


def is_shadow(p):
    return p[3] and p[3] < 255 and max(p[0], p[1], p[2]) <= 2


def pack(set_id):
    src = os.path.join(SRC, set_id)
    anims = NPC if set_id in NPC_SETS else FIGHT
    strip = set_id not in NO_STRIP
    frames, uniq, meta = [], {}, {}
    for an in anims:
        path = os.path.join(src, an + '.png')
        if not os.path.exists(path):
            continue
        sheet = Image.open(path).convert('RGBA')
        if strip:
            px = sheet.load()
            w, h = sheet.size
            for y in range(h):
                for x in range(w):
                    if is_shadow(px[x, y]):
                        px[x, y] = (0, 0, 0, 0)
        meta[an] = {}
        for r, d in enumerate(DIRS):
            row = []
            for c in range(15):
                cell = sheet.crop((c * CELL, r * CELL, c * CELL + CELL, r * CELL + CELL))
                bb = cell.getchannel('A').getbbox()
                if not bb:
                    row.append(None)
                    continue
                img = cell.crop(bb)
                key = hashlib.md5(img.tobytes() + bytes(img.size)).hexdigest()
                if key not in uniq:
                    uniq[key] = len(frames)
                    frames.append(img)
                row.append([uniq[key], bb[0], bb[1]])
            meta[an][d] = row
    # Shelf-pack the unique frames, tallest first, onto 2048 px pages.
    order = sorted(range(len(frames)), key=lambda i: -frames[i].size[1])
    pages, place = [], {}
    x = y = shelf = 0
    page = None
    for i in order:
        w, h = frames[i].size
        if page is None or x + w > PAGE:
            x, y, shelf = 0, y + shelf, 0
        if page is None or y + h > PAGE:
            page = Image.new('RGBA', (PAGE, PAGE), (0, 0, 0, 0))
            pages.append(page)
            x = y = shelf = 0
        page.paste(frames[i], (x, y))
        place[i] = (len(pages) - 1, x, y, w, h)
        x += w + 1
        shelf = max(shelf, h + 1)
    # Crop the last page to what it uses.
    used_h = y + shelf
    if pages:
        pages[-1] = pages[-1].crop((0, 0, PAGE, max(1, used_h)))
    os.makedirs(OUT, exist_ok=True)
    names = []
    for n, pg in enumerate(pages):
        name = '%s_%d.png' % (set_id, n)
        pg.save(os.path.join(OUT, name), optimize=True)
        names.append(name)
    # Anchor: the feet, from the standing frames (bottom row of pixels, centre of the cell).
    bottoms = []
    for d in DIRS:
        f = meta['Idle'][d][0]
        if f:
            bottoms.append(f[2] + frames[f[0]].size[1])
    bottoms.sort()
    anchor = [CELL // 2, bottoms[len(bottoms) // 2] - 1 if bottoms else 92]
    out = {'id': set_id, 'cell': CELL, 'anchor': anchor, 'pages': names, 'anims': {}}
    for an, dirs in meta.items():
        out['anims'][an] = {d: [None if f is None else [*place[f[0]], f[1], f[2]] for f in row] for d, row in dirs.items()}
    with open(os.path.join(OUT, set_id + '.json'), 'w') as fh:
        json.dump(out, fh, separators=(',', ':'))
    return len(frames), [p.size for p in pages]


if __name__ == '__main__':
    sets = sys.argv[1:] or sorted(os.listdir(SRC))
    for s in sets:
        n, sizes = pack(s)
        print('%-16s %5d frames  pages %s' % (s, n, sizes))
