# Packs the pieces for the overworld, the arenas and the cutscene sets into one atlas:
# loose pieces (the forest-village and castle kits), sprites cut out of sheets (Cainos plants and
# props, the fantasy-forest decorations, the desert props), and terrain textures.
# Writes v2/assets/world/world.json ({pages, sprites: {name: [page, x, y, w, h]}}) and its pages,
# plus a labelled contact sheet for reference (v2/tools/world_contact.png, not shipped).
# python3 v2/tools/world_atlas.py
import glob, json, os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'art_source', 'tiles')
OUT = os.path.join(HERE, '..', 'assets', 'world')
pieces = {}

def add(name, im):
    im = im.convert('RGBA'); bb = im.getbbox()
    if bb: pieces[name] = im.crop(bb) if name[:2] != 't_' else im

# loose pieces
for d, pre in [('forest_village/trees', ''), ('forest_village/plants', 'plant_'), ('forest_village/props', 'prop_'),
               ('forest_village/nature', 'nat_'), ('forest_village/animals', 'animal_'), ('castle_dungeon/props', 'cd_'), ('castle_dungeon/walls', 'cw_')]:
    for f in sorted(glob.glob(os.path.join(SRC, d, '*.png'))): add(pre + os.path.basename(f)[:-4], Image.open(f))
for f in sorted(glob.glob(os.path.join(SRC, 'forest_village/terrain/*.png')) + glob.glob(os.path.join(SRC, 'castle_dungeon/floors/*.png'))):
    add('t_' + os.path.basename(f)[:-4], Image.open(f))

# sprites inside sheets: connected opaque regions (close pixels merged), small specks dropped
def cut(sheet, pre, box=None, gap=3, minpx=40):
    im = Image.open(os.path.join(SRC, sheet)).convert('RGBA')
    if box: im = im.crop(box)
    a = np.array(im)[..., 3] > 0
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=gap))
    boxes = ndimage.find_objects(lab)
    k = 0
    for sl in sorted(boxes, key=lambda s: (s[0].start // 24, s[1].start)):
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        if a[y0:y1, x0:x1].sum() < minpx: continue
        add(f'{pre}{k}', im.crop((x0, y0, x1, y1))); k += 1
cut('cainos_basic/TX Plant.png', 'cainos_plant_')
cut('cainos_basic/TX Props.png', 'cainos_prop_')
cut('cainos_basic/TX Struct.png', 'cainos_struct_')
cut('topdownfantasy_forest/Decorations/Decorations.png', 'tdf_')
cut('desert/DESERT TILESET 32x32.png', 'desert_', box=(0, 288, 624, 448))
# terrain cells from the desert and fantasy-forest sheets (full centre tiles)
dsheet = Image.open(os.path.join(SRC, 'desert/DESERT TILESET 32x32.png')).convert('RGBA')
for name, (cx, cy) in {'t_d_grass': (1, 1), 't_d_sand': (4, 1), 't_d_dirt': (1, 4), 't_d_water': (1, 7)}.items():
    add(name, dsheet.crop((cx * 32, cy * 32, cx * 32 + 32, cy * 32 + 32)))

# shelf packing into 2048-wide pages
order = sorted(pieces.items(), key=lambda kv: -kv[1].height)
W, H, pad = 2048, 2048, 2
pages, sprites, x, y, rowh = [Image.new('RGBA', (W, H))], {}, 0, 0, 0
for name, im in order:
    w, h = im.size
    if x + w > W: x, y, rowh = 0, y + rowh + pad, 0
    if y + h > H: pages.append(Image.new('RGBA', (W, H))); x, y, rowh = 0, 0, 0
    pages[-1].alpha_composite(im, (x, y)); sprites[name] = [len(pages) - 1, x, y, w, h]
    x += w + pad; rowh = max(rowh, h)
os.makedirs(OUT, exist_ok=True)
names = []
for i, p in enumerate(pages):
    used = p.crop((0, 0, W, min(H, max(s[2] + s[4] for s in sprites.values() if s[0] == i) + 1)))
    fn = f'world_{i}.webp'; used.save(os.path.join(OUT, fn), 'WEBP', lossless=True, method=6); names.append(fn)
json.dump({'pages': names, 'sprites': sprites}, open(os.path.join(OUT, 'world.json'), 'w'), separators=(',', ':'))
# a labelled contact sheet, for choosing pieces by name
cw, x, y, rowh, pos = 1800, 0, 0, 0, []
for name, im in sorted(pieces.items()):
    w, h = max(im.width, 64), im.height + 12
    if x + w > cw: x, y, rowh = 0, y + rowh + 4, 0
    pos.append((name, im, x, y)); x += w + 6; rowh = max(rowh, h)
sheet = Image.new('RGBA', (cw, y + rowh + 4), (60, 70, 60, 255)); d = ImageDraw.Draw(sheet)
for name, im, x, y in pos: sheet.alpha_composite(im, (x, y + 11)); d.text((x, y), name[-14:], fill=(255, 240, 180, 255))
sheet.save(os.path.join(HERE, 'world_contact.png'))
print(len(pieces), 'pieces in', len(pages), 'page(s)')
