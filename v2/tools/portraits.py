# Cuts a head-and-shoulders portrait for every sprite set in v2/assets/sprites (the first idle
# frame facing the viewer) into one small atlas, so menus never load the full sheets.
# Writes v2/assets/portraits.png and v2/assets/portraits.json ({set: [x, y]}, cells of 32x32).
import json, os
from PIL import Image
D = os.path.join(os.path.dirname(__file__), '..', 'assets')
SP = os.path.join(D, 'sprites')
CELL = 32
sets = sorted(f[:-5] for f in os.listdir(SP) if f.endswith('.json'))
cols = 8
atlas = Image.new('RGBA', (cols * CELL, ((len(sets) + cols - 1) // cols) * CELL))
index = {}
for i, s in enumerate(sets):
    d = json.load(open(os.path.join(SP, s + '.json')))
    a = d['anims'].get('Idle') or next(iter(d['anims'].values()))
    fr = next(f for f in (a.get('S') or next(iter(a.values()))) if f)
    pg, sx, sy, w, h, ox, oy = fr
    page = Image.open(os.path.join(SP, d['pages'][pg]))
    img = page.crop((sx, sy, sx + w, sy + h))
    # place the frame in its cell (anchor = feet), then crop around the head
    cw, ch = d['cell'] if isinstance(d['cell'], list) else (d['cell'], d['cell'])
    full = Image.new('RGBA', (cw, ch)); full.paste(img, (ox, oy))
    bb = full.getbbox()
    top = bb[1]
    # centre on the head: the widest run of the top few rows, which a raised weapon can't drag aside
    hb = full.crop((0, top + 3, cw, top + 7)).getbbox() or bb
    cx = (hb[0] + hb[2]) // 2
    face = full.crop((cx - 9, top - 1, cx + 9, top + 17)).resize((CELL, CELL), Image.NEAREST)
    x, y = (i % cols) * CELL, (i // cols) * CELL
    atlas.paste(face, (x, y)); index[s] = [x, y]
atlas.save(os.path.join(D, 'portraits.png'))
json.dump({'cell': CELL, 'sets': index}, open(os.path.join(D, 'portraits.json'), 'w'))
print('portraits', len(sets))
