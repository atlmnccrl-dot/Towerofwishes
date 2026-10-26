# Packs the carried-over art and sound into v2/assets, losslessly smaller:
#  - sprite sets: pages with up to 256 colours become palette PNGs, the rest lossless WebP
#  - the effects atlas and the tile atlas (ground tiles and props), the same way
#  - the sounds the game plays, and the portraits atlas (tools/portraits.py)
# Run from the repository root: python3 v2/tools/pack.py
import json, os, shutil, subprocess
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
V2 = os.path.join(ROOT, '..')
SRC = os.path.join(V2, '..', 'assets')
SETS = '''kael_sword eiryn aerys nox eloryn braxen guard_gate spearwoman poacher erdra_baker hooded_follower golem_a
beastfolk_f beastfolk_m guild_adventurer black_knight rival_kid kael_unarmed frost_assassin climber aerys_spear lyra alric
caged_creature bandit_broad bandit_knife bandit_grabber bandit_lookout thug_a goblin goblin_spear goblin_archer goblin_hexer
ogre night_creature hamlet_predator nightcrawler cassius sky_beast gothic_knight_a gothic_knight_b fragment braxen_frost
golem_b alric_beast elder_dragon'''.split()
SFX = '''accept_01 cancel_01 chest_open coin_01 confirm_01 equip_armor_01 error_01 level_up locked_01 notify_01 page_turn_01
quest_complete quest_new click_wood_01 unsheathe_01 anvil_01 heal_02'''.split()

def exact_palette(im, cols):
    # an exact palette: every colour (with its alpha) gets its own entry, nothing is merged
    a = np.array(im); flat = a.reshape(-1, 4)
    pal = np.array([c for _, c in cols], dtype=np.uint8)
    key = lambda x: (x[..., 0].astype(np.uint32) << 24) | (x[..., 1].astype(np.uint32) << 16) | (x[..., 2].astype(np.uint32) << 8) | x[..., 3]
    order = np.argsort(key(pal)); idx = order[np.searchsorted(key(pal)[order], key(flat))]
    p = Image.fromarray(idx.astype(np.uint8).reshape(a.shape[:2]), 'P')
    p.putpalette(pal[:, :3].flatten().tolist() + [0] * (768 - 3 * len(pal)))
    p.info['transparency'] = bytes(pal[:, 3].tolist()) + bytes(256 - len(pal))
    return p

def pack_page(src, dst_dir, name):
    im = Image.open(src).convert('RGBA')
    cols = im.getcolors(256)
    if cols is not None:
        out = name + '.png'
        exact_palette(im, cols).save(os.path.join(dst_dir, out), 'PNG', optimize=True, transparency=exact_palette(im, cols).info['transparency'])
        back = Image.open(os.path.join(dst_dir, out)).convert('RGBA')
        if not np.array_equal(np.array(back), np.array(im)): os.remove(os.path.join(dst_dir, out)); out = None
    else: out = None
    # lossless WebP too; keep whichever is smaller
    web = name + '.webp'
    im.save(os.path.join(dst_dir, web), 'WEBP', lossless=True, method=6, exact=True)
    assert np.array_equal(np.array(Image.open(os.path.join(dst_dir, web)).convert('RGBA')), np.array(im)), src
    if out and os.path.getsize(os.path.join(dst_dir, out)) <= os.path.getsize(os.path.join(dst_dir, web)):
        os.remove(os.path.join(dst_dir, web)); return out
    if out: os.remove(os.path.join(dst_dir, out))
    return web

def pack_atlas(src_json, dst_dir):
    d = json.load(open(src_json)); base = os.path.dirname(src_json)
    d['pages'] = [pack_page(os.path.join(base, p), dst_dir, os.path.splitext(p)[0]) for p in d['pages']]
    json.dump(d, open(os.path.join(dst_dir, os.path.basename(src_json)), 'w'), separators=(',', ':'))

for sub in ['sprites', 'fx', 'tiles', 'sfx', 'music']:
    p = os.path.join(V2, 'assets', sub); shutil.rmtree(p, ignore_errors=True); os.makedirs(p)
for s in SETS:
    pack_atlas(os.path.join(SRC, 'pixel', s + '.json'), os.path.join(V2, 'assets', 'sprites'))
pack_atlas(os.path.join(SRC, 'fx', 'fx.json'), os.path.join(V2, 'assets', 'fx'))
pack_atlas(os.path.join(SRC, 'tiles', 'tiles.json'), os.path.join(V2, 'assets', 'tiles'))
for s in SFX: shutil.copy(os.path.join(SRC, 'sfx', s + '.mp3'), os.path.join(V2, 'assets', 'sfx'))
for d in ['fight', 'amb']:
    os.makedirs(os.path.join(V2, 'assets', 'sfx', d), exist_ok=True)
    for f in os.listdir(os.path.join(SRC, 'sfx', d)): shutil.copy(os.path.join(SRC, 'sfx', d, f), os.path.join(V2, 'assets', 'sfx', d))
shutil.copy(os.path.join(SRC, 'music', 'heartfelt_battle.mp3'), os.path.join(V2, 'assets', 'music'))
subprocess.run(['python3', os.path.join(ROOT, 'portraits.py')], check=True)
print('packed', len(SETS), 'sets')
