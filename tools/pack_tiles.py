"""Pack ground tiles and props for the pixel arenas into one atlas.

Sources: art_source/tiles/ (the author's tileset packs). Output: assets/tiles/tiles_<page>.png +
assets/tiles/tiles.json  { name: [page, x, y, w, h] }. Ground tiles are named g_*; everything
else is a prop drawn standing up, feet at its bottom centre.

All art ends up at one pixel size: the 32 px tilesets as they are, the 16 px ones doubled.
Props cut from a sheet are found as the sheet's separate pieces (connected pixels), so the
index after a sheet name is the piece number (tools: scratchpad comps.py shows them numbered).
Run: python3 tools/pack_tiles.py
"""
import json, os
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art_source', 'tiles')
OUT = os.path.join(ROOT, 'assets', 'tiles')
PAGE = 2048

def img(rel):
    return Image.open(os.path.join(SRC, rel)).convert('RGBA')

_pieces = {}
def pieces(rel, minpx=40):
    if rel in _pieces: return _pieces[rel]
    im = img(rel); a = np.array(im)[:, :, 3] > 0
    lab, _ = ndimage.label(ndimage.binary_dilation(a, iterations=1))
    out = []
    for b in ndimage.find_objects(lab):
        if b and (b[0].stop - b[0].start) * (b[1].stop - b[1].start) >= minpx:
            out.append(im.crop((b[1].start, b[0].start, b[1].stop, b[0].stop)))
    _pieces[rel] = out
    return out

def piece(rel, i): return pieces(rel)[i]
def x2(im): return im.resize((im.width * 2, im.height * 2), Image.NEAREST)
def tile16(rel): return x2(img(rel))
def crop(rel, box): return img(rel).crop(box)

C = 'cainos_basic/'
PLANT, PROPS, STRUCT = C + 'TX Plant.png', C + 'TX Props.png', C + 'TX Struct.png'
TDF = 'topdownfantasy_forest/Decorations/Decorations.png'
EPIC = 'epic_ruins/Props/Atlas-Props.png'
CD, FV = 'castle_dungeon/', 'forest_village/'

S = {}
# ---- ground: 32 px tiles
for i in range(8):
    for j in range(4):
        S['g_grass_%d_%d' % (i, j)] = crop(C + 'TX Tileset Grass.png', (i * 32, j * 32, i * 32 + 32, j * 32 + 32))
for n in ['flagstone_1', 'flagstone_2', 'flagstone_3', 'flagstone_dark', 'flagstone_mossy', 'flagstone_warm', 'cobble_road',
          'gravel', 'trampled_dirt', 'arena_sand', 'wood_plank_h', 'wood_plank_v', 'marble_white', 'marble_checker', 'hay_floor',
          'lava_pool', 'moat_water_1', 'moat_water_2', 'floor_grate', 'carpet_red', 'courtyard_grass_1', 'courtyard_grass_2']:
    S['g_' + n] = tile16(CD + 'floors/' + n + '.png')
for n in ['dirt_1', 'dirt_2', 'dirt_dark', 'grass_1', 'grass_2', 'grass_3', 'grass_dark_1', 'grass_dark_2', 'grass_autumn', 'grass_tall',
          'cobble', 'cobble_mossy', 'sand', 'stone_floor', 'water_1', 'water_2']:
    S['g_' + n] = tile16(FV + 'terrain/' + n + '.png')
for n in ['wood_floor_h', 'wood_floor_v']:
    S['g_' + n] = tile16(FV + 'village/' + n + '.png')
# Cainos stone slab floor: the big plain slab, cut into 32 px tiles
for i in range(2):
    for j in range(2):
        S['g_slab_%d_%d' % (i, j)] = crop(C + 'TX Tileset Stone Ground.png', (i * 32 + 8, j * 32 + 8, i * 32 + 40, j * 32 + 40))

# ---- props (stand up; feet at the bottom centre)
for k, i in {'tree_a': 0, 'tree_b': 1, 'tree_c': 2, 'bush_a': 3, 'bush_b': 4, 'bush_c': 5, 'bush_d': 6, 'bush_e': 7, 'bush_f': 8}.items():
    S[k] = piece(PLANT, i)
for n, i in enumerate(range(9, 25)):
    S['tuft_%d' % n] = piece(PLANT, i)
for k, i in {'crate': 3, 'crate_b': 11, 'chest': 7, 'barrel': 18, 'vase_a': 27, 'pot': 33, 'vase_b': 36, 'sign_e': 20, 'sign_w': 28,
             'statue': 5, 'pillar': 23, 'pillar_broken': 25, 'grave_a': 29, 'grave_b': 30, 'grave_cross': 34, 'tomb': 19, 'coffin': 12,
             'altar': 4, 'monolith_a': 1, 'monolith_b': 13, 'monolith_c': 24, 'stone_circle': 32, 'ruin_ring': 37, 'rock_big': 38,
             'rock_a': 39, 'rock_b': 40, 'rock_c': 42, 'rock_d': 43, 'stone_a': 46, 'stone_b': 47, 'slabs': 41, 'brick_a': 44, 'brick_b': 45,
             'door': 15, 'slab_wall_a': 0, 'slab_wall_b': 14, 'lantern_post': 17, 'table_stone': 35}.items():
    S[k] = piece(PROPS, i)
for k, i in {'arch_a': 0, 'arch_b': 4, 'wall_a': 1, 'wall_b': 2, 'wall_c': 3, 'wall_moss_a': 5, 'wall_moss_b': 6, 'wall_moss_c': 7}.items():
    S[k] = piece(STRUCT, i)
for k, i in {'log_a': 0, 'log_b': 6, 'shrub_a': 1, 'shrub_b': 7, 'shrub_s': 3, 'shrub_t': 9, 'reeds_a': 12, 'reeds_b': 13, 'reeds_c': 19,
             'reeds_d': 20, 'fern_a': 14, 'fern_b': 15, 'fern_c': 21, 'fern_d': 22, 'mush_a': 2, 'mush_b': 4, 'mush_c': 5, 'mush_d': 8,
             'mush_e': 10, 'pebble_a': 23, 'pebble_b': 24, 'pebble_c': 25, 'rock_m1': 27, 'rock_m2': 28, 'rock_m3': 29,
             'tree_dark_a': 30, 'tree_dark_b': 31, 'pine_a': 32, 'pine_b': 33}.items():
    S[k] = piece(TDF, i)
for k, i in {'tree_gold_a': 1, 'tree_gold_b': 2, 'ruin_pillar': 14, 'ruin_wall': 19, 'ruin_stone_a': 13, 'ruin_stone_b': 15,
             'ruin_stone_c': 23, 'fountain': 24, 'temple': 9, 'shrine_a': 6, 'shrine_b': 7, 'shrine_c': 8, 'tree_young': 0, 'bush_gold': 3}.items():
    S[k] = piece(EPIC, i)
# 16 px props, doubled
for n in ['campfire', 'haystack', 'fence_h', 'fence_post', 'scarecrow', 'well', 'hand_cart', 'market_stall_red', 'market_stall_blue',
          'tent_green', 'tent_red', 'lamp_post', 'lantern', 'barrel', 'crate', 'grain_sack', 'beehive', 'bench', 'gravestone', 'stone_wall']:
    S['fv_' + n] = tile16(FV + 'props/' + n + '.png')
for n in ['boulder', 'fallen_log', 'log_pile', 'rock_mossy', 'tree_stump']:
    S['fv_' + n] = tile16(FV + 'nature/' + n + '.png')
for n in ['tree_pine_snow', 'tree_dead', 'tree_birch', 'tree_autumn_red', 'tree_autumn_orange']:
    S['fv_' + n] = tile16(FV + 'trees/' + n + '.png')
for n in ['banquet_table', 'brazier', 'bookshelf', 'throne', 'training_dummy', 'archery_target', 'supply_cart', 'castle_well', 'forge',
          'anvil', 'weapon_rack', 'banner_red', 'banner_blue', 'candelabra', 'chair_wood', 'cauldron', 'statue_knight', 'stone_tomb',
          'hay_bale', 'war_tent_red', 'hanging_cage', 'skull_on_pike']:
    S['cd_' + n] = tile16(CD + 'props/' + n + '.png')
for n in ['pillar', 'wall_face_stone', 'wall_face_dark', 'wall_face_mossy', 'wall_face_brick', 'wall_torch_1', 'gate_arch', 'arched_window']:
    S['cdw_' + n] = tile16(CD + 'walls/' + n + '.png')
# Dark World's gnarled tree and mushrooms (night and the Tower's dark floors)
S['tree_gnarled'] = img('dark_world/Environment/tree.png')
S['rock_dark'] = img('dark_world/Environment/rock.png')

def main():
    names = list(S)
    for n in names:
        bb = S[n].getchannel('A').getbbox()
        if bb and not n.startswith('g_'): S[n] = S[n].crop(bb)
    order = sorted(names, key=lambda n: -S[n].height)
    pages, place, page = [], {}, None
    x = y = shelf = 0
    for n in order:
        im = S[n]; w, h = im.size
        if page is None or x + w > PAGE: x, y, shelf = 0, y + shelf, 0
        if page is None or y + h > PAGE:
            page = Image.new('RGBA', (PAGE, PAGE)); pages.append(page); x = y = shelf = 0
        page.paste(im, (x, y)); place[n] = [len(pages) - 1, x, y, w, h]
        x += w + 2; shelf = max(shelf, h + 2)
    pages[-1] = pages[-1].crop((0, 0, PAGE, y + shelf))
    os.makedirs(OUT, exist_ok=True)
    files = []
    for i, pg in enumerate(pages):
        f = 'tiles_%d.png' % i; pg.save(os.path.join(OUT, f), optimize=True); files.append(f)
    json.dump({'pages': files, 'sprites': place}, open(os.path.join(OUT, 'tiles.json'), 'w'), separators=(',', ':'))
    print(len(names), 'sprites, pages', [p.size for p in pages])

if __name__ == '__main__':
    main()
