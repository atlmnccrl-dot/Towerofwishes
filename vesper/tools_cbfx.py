"""Pack the Crowd Breaker effects (PixelHit) the game uses into atlases.

Input:  CB_SRC (a folder with the pack's skill folders, e.g. 01_crimson_tide_cleave/crimson_tide_cleave_target.png + .json).
Output: assets/cbfx/cb_<n>.png + assets/cbfx/cb.json
        { "pages": n, "fx": { "<folder>/<role>": { "fps": 20, "tags": [[name, from, to, startSec]], "frames": [[page, sx, sy, w, h, ox, oy]] } } }
        ox, oy: the trimmed frame's top-left relative to the sheet's pivot. Identical crops are stored once.
The pack's licence allows shipping it inside the game and in a private repository, not on its own or in a
public repository; keep THIRD_PARTY_NOTICES with the build (Settings > Credits names it).
Run: CB_SRC=/path/to/crowdbreaker python3 -I vesper/tools_cbfx.py
"""
import hashlib, json, os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get('CB_SRC') or os.path.join(ROOT, 'art_source', 'crowdbreaker')
OUT = os.path.join(ROOT, 'assets', 'cbfx')
PAGE = 2048
# The sheets the game plays (folder/role). Sheets with the pack's placeholder ghost or its targeting grid are left out.
SHEETS = [
    '02_roaring_blade_nova/target', '90_last_stand_strike/target', '01_crimson_tide_cleave/target', '01_crimson_tide_cleave/caster',
    '01_crimson_tide_cleave/death', '107_flashpoint_severance/target', '107_flashpoint_severance/caster', '06_piercing_dash/target',
    '218_sky_rend_star/target', '113_earthshaker_stance/target', '10_quake_stomp/target', '10_quake_stomp/caster', '10_quake_stomp/death',
    '08_meteor_rain/target', '54_greater_fireball/target', '183_frost_curtain/caster', '13_water_orb/target', '101_skyfall_thunder/target',
    '15_storm_orb/target', '156_inner_flow_mending/caster', '11_ghostfire_hex/caster', '05_phantom_legion/caster', '175_violet_veil/caster',
    '12_golden_blessing/caster', '187_venom_dagger/caster', '43_cyclone_bolt/target', '19_recall_beam/caster', '224_black_cross_star/target',
    '220_ten_day_bloom/caster',
]

def main():
    items, uniq, meta = [], {}, {}
    for key in SHEETS:
        folder, role = key.split('/')
        base = folder.split('_', 1)[1]
        j = os.path.join(SRC, folder, f'{base}_{role}.json')
        if not os.path.exists(j):
            print('missing', j); continue
        m = json.load(open(j)); M = m['meta']; img = Image.open(j[:-5] + '.png').convert('RGBA')
        px, py = M['pivot']
        meta[key] = {'fps': M.get('fps', 20), 'tags': [[t['name'], t['from'], t['to'], t.get('startSec', 0)] for t in M['frameTags']], 'frames': []}
        for f in m['frames']:
            r = f['frame']; crop = img.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
            bb = crop.getchannel('A').point(lambda v: 255 if v > 4 else 0).getbbox()
            if not bb: meta[key]['frames'].append(None); continue
            c = crop.crop(bb); h = hashlib.md5(c.tobytes() + bytes(str(c.size), 'ascii')).hexdigest()
            if h not in uniq: uniq[h] = c
            meta[key]['frames'].append((h, bb[0] - px, bb[1] - py))
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(os.path.join(OUT, 'cb_*.png')): os.remove(f)
    order = sorted(uniq, key=lambda h: (-uniq[h].height, -uniq[h].width))
    place, n = {}, 0
    pg, x, y, rowh = Image.new('RGBA', (PAGE, PAGE)), 0, 0, 0
    def flush(img, n, last):
        im = img.crop((0, 0, PAGE, y + rowh + 1)) if last else img
        im.save(os.path.join(OUT, f'cb_{n}.png'), optimize=True)
    for h in order:
        im = uniq[h]
        if x + im.width > PAGE: x, y, rowh = 0, y + rowh + 1, 0
        if y + im.height > PAGE: flush(pg, n, False); pg, x, y, rowh, n = Image.new('RGBA', (PAGE, PAGE)), 0, 0, 0, n + 1
        pg.paste(im, (x, y)); place[h] = (n, x, y); x += im.width + 1; rowh = max(rowh, im.height)
    flush(pg, n, True)
    fx = {}
    for key, M in meta.items():
        fr = []
        for e in M['frames']:
            if e is None: fr.append(None); continue
            h, ox, oy = e; p, sx, sy = place[h]; im = uniq[h]
            fr.append([p, sx, sy, im.width, im.height, ox, oy])
        fx[key] = {'fps': M['fps'], 'tags': M['tags'], 'frames': fr}
    with open(os.path.join(OUT, 'cb.json'), 'w') as fh:
        json.dump({'pages': n + 1, 'fx': fx}, fh, separators=(',', ':'))
    total = sum(os.path.getsize(f) for f in glob.glob(os.path.join(OUT, '*')))
    print(len(fx), 'sheets,', len(uniq), 'unique frames,', n + 1, 'pages,', round(total / 1e6, 1), 'MB')

if __name__ == '__main__':
    main()
