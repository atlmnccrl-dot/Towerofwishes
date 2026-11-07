#!/usr/bin/env python3
"""HOLDFAST - repack the Character Creator sets the game uses into slim atlases.

Reads ../assets/pixel/<set>.json and its pages (the repository's packed cast) and writes
holdfast/assets/cast/<set>.png + <set>.json with only the clips the settlement game plays.
Identical frames are stored once. Usage: python3 holdfast/tools/pack_cast.py [set ...]
"""
import json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'assets', 'pixel'))
OUT = os.path.normpath(os.path.join(HERE, '..', 'assets', 'cast'))

CIVIL = ['ashgate_f1', 'ashgate_m1', 'ashgate_m2', 'erdra_baker', 'erdra_f1', 'erdra_f2', 'erdra_m1', 'erdra_m2',
         'erdra_musician', 'erdra_vendor', 'hamlet_people', 'miller', 'sword_smith', 'tavern_keeper', 'shopkeeper',
         'labyrinth_citizen', 'hooded_follower', 'beastfolk_f', 'guard_officer']
FIGHT = ['guild_adventurer', 'ashgate_f2', 'spearwoman', 'guard_gate', 'beastfolk_m', 'poacher']
FOES = ['hamlet_predator', 'night_creature', 'bandit_knife', 'bandit_broad', 'bandit_grabber', 'bandit_lookout',
        'thug_a', 'thug_b', 'goblin', 'goblin_spear', 'goblin_archer', 'goblin_hexer', 'ogre']
ALL = CIVIL + FIGHT + FOES
CLIPS = ['Idle', 'Walk', 'Run', 'Attack1', 'Attack3', 'Attack5', 'CrouchIdle', 'TakeDamage', 'Die']
DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']
PAGE_W = 2048


def pack(set_id):
    src = json.load(open(os.path.join(SRC, set_id + '.json')))
    pages = [Image.open(os.path.join(SRC, p)).convert('RGBA') for p in src['pages']]
    uniq, order = {}, []
    for clip in CLIPS:
        if clip not in src['anims']:
            continue
        for d in DIRS:
            for f in src['anims'][clip].get(d, []):
                k = tuple(f[:5])
                if k not in uniq:
                    uniq[k] = None
                    order.append(k)
    # shelf pack, tallest first
    items = sorted(order, key=lambda k: -k[4])
    x = y = shelf = 0
    pos = {}
    for k in items:
        w, h = k[3], k[4]
        if x + w + 1 > PAGE_W:
            x, y, shelf = 0, y + shelf + 1, 0
        pos[k] = (x, y)
        x += w + 1
        shelf = max(shelf, h)
    H = y + shelf + 1
    atlas = Image.new('RGBA', (PAGE_W, H), (0, 0, 0, 0))
    for k, (px, py) in pos.items():
        atlas.paste(pages[k[0]].crop((k[1], k[2], k[1] + k[3], k[2] + k[4])), (px, py))
    # crop unused width
    bbox = atlas.getbbox()
    if bbox:
        atlas = atlas.crop((0, 0, bbox[2], H))
    anims = {}
    for clip in CLIPS:
        if clip not in src['anims']:
            continue
        anims[clip] = {}
        for d in DIRS:
            fr = src['anims'][clip].get(d, [])
            anims[clip][d] = [[pos[tuple(f[:5])][0], pos[tuple(f[:5])][1], f[3], f[4], f[5], f[6]] for f in fr]
    out = {'id': set_id, 'anchor': src['anchor'], 'page': set_id + '.png', 'anims': anims}
    atlas.save(os.path.join(OUT, set_id + '.png'), optimize=True)
    json.dump(out, open(os.path.join(OUT, set_id + '.json'), 'w'), separators=(',', ':'))
    return atlas.size, len(order)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for s in (sys.argv[1:] or ALL):
        size, n = pack(s)
        print(s, size, n, 'frames', os.path.getsize(os.path.join(OUT, s + '.png')) // 1024, 'KB')
