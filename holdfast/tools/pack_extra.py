#!/usr/bin/env python3
"""HOLDFAST - pack the extra sprites the game needs that the shared tile atlas lacks.

Sources are the repository's own packs in art_source/tiles (16 px village/castle sets, drawn
at 2x) and the Cainos structures. Writes holdfast/assets/extra.png + extra.json:
{ "sprites": { name: [x, y, w, h] } }. Also converts the UI sounds (OGG) to MP3 for Safari.
"""
import json, os, subprocess
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
T = os.path.join(REPO, 'art_source', 'tiles')
OUT = os.path.normpath(os.path.join(HERE, '..', 'assets'))

X2 = {  # name: path under art_source/tiles (16 px, drawn at 2x)
    'fence_gate': 'forest_village/props/fence_gate.png', 'fence_v': 'forest_village/props/fence_v.png',
    'fence_post': 'forest_village/props/fence_post.png', 'stone_wall_fv': 'forest_village/props/stone_wall.png',
    'war_tent_blue': 'castle_dungeon/props/war_tent_blue.png', 'ballista': 'castle_dungeon/props/ballista.png',
    'catapult': 'castle_dungeon/props/catapult.png', 'cannon': 'castle_dungeon/props/cannon.png',
    'flag_blue': 'castle_dungeon/props/flagpole_blue.png', 'flag_red': 'castle_dungeon/props/flagpole_red.png',
    'spike_trap': 'castle_dungeon/props/spike_trap.png', 'banner_green': 'castle_dungeon/props/banner_green.png',
    'banner_purple': 'castle_dungeon/props/banner_purple.png', 'shield_rack': 'castle_dungeon/props/shield_rack.png',
    'world_globe': 'castle_dungeon/props/world_globe.png', 'battlement_h': 'castle_dungeon/walls/battlement_h.png',
    'arrow_slit': 'castle_dungeon/walls/arrow_slit.png', 'wall_torch': 'castle_dungeon/walls/wall_torch_1.png',
    'tower_roof_red': 'castle_dungeon/walls/tower_roof_red.png', 'tower_roof_blue': 'castle_dungeon/walls/tower_roof_blue.png',
    'roof_thatch': 'forest_village/village/roof_thatch.png', 'wall_log': 'forest_village/village/wall_log.png',
    'wall_log_dark': 'forest_village/village/wall_log_dark.png', 'door_wood': 'forest_village/village/door_wood.png',
    'roof_slate': 'forest_village/village/roof_slate.png', 'wall_stone_fv': 'forest_village/village/wall_stone.png',
    'window_shutters': 'forest_village/village/window_shutters.png', 'chimney': 'forest_village/village/chimney.png',
    'deer': 'forest_village/animals/deer.png', 'rabbit': 'forest_village/animals/rabbit.png',
    'fox': 'forest_village/animals/fox.png', 'sheep': 'forest_village/animals/sheep.png',
    'chicken': 'forest_village/animals/chicken.png', 'pig': 'forest_village/animals/pig.png',
    'cow': 'forest_village/animals/cow.png', 'dog': 'forest_village/animals/dog.png',
    'sunflower': 'forest_village/plants/sunflower.png', 'berry_red': 'forest_village/plants/bush_berry_red.png',
    'berry_blue': 'forest_village/plants/bush_berry_blue.png', 'bush_green_fv': 'forest_village/plants/bush_green.png',
    'mush_red': 'forest_village/plants/mushroom_red.png', 'lily': 'forest_village/plants/lily_pad.png',
    'dirt_1': 'forest_village/terrain/dirt_1.png', 'dirt_2': 'forest_village/terrain/dirt_2.png',
    'water_1': 'forest_village/terrain/water_1.png', 'water_2': 'forest_village/terrain/water_2.png',
    'water_3': 'forest_village/terrain/water_3.png', 'sand': 'forest_village/terrain/sand.png',
    'cobble': 'castle_dungeon/floors/cobble_road.png', 'trampled': 'castle_dungeon/floors/trampled_dirt.png',
    'gravel': 'castle_dungeon/floors/gravel.png', 'hay_floor': 'castle_dungeon/floors/hay_floor.png',
    'grass_flowers_w': 'forest_village/terrain/grass_flowers_white.png',
}
CROPS = {  # name: (path, box) at 1x from larger sheets
    'cainos_wall': ('cainos_basic/TX Struct.png', (32, 32, 96, 128)),
    'cainos_wall_moss': ('cainos_basic/TX Struct.png', (32, 160, 96, 256)),
    'cainos_arch': ('cainos_basic/TX Struct.png', (408, 26, 488, 92)),
    'stone_ground': ('cainos_basic/TX Tileset Stone Ground.png', (0, 0, 128, 128)),
    'shadow_sheet': ('cainos_basic/TX Shadow.png', (0, 0, 512, 512)),
}


def main():
    ims = {}
    for k, p in X2.items():
        im = Image.open(os.path.join(T, p)).convert('RGBA')
        ims[k] = im.resize((im.width * 2, im.height * 2), Image.NEAREST)
    for k, (p, box) in CROPS.items():
        if k == 'shadow_sheet':
            continue
        ims[k] = Image.open(os.path.join(T, p)).convert('RGBA').crop(box)
    W = 1024
    x = y = shelf = 0
    pos = {}
    for k in sorted(ims, key=lambda k: -ims[k].height):
        w, h = ims[k].size
        if x + w + 2 > W:
            x, y, shelf = 0, y + shelf + 2, 0
        pos[k] = (x, y, w, h)
        x += w + 2
        shelf = max(shelf, h)
    atlas = Image.new('RGBA', (W, y + shelf + 2))
    for k, (px, py, w, h) in pos.items():
        atlas.paste(ims[k], (px, py))
    atlas.save(os.path.join(OUT, 'extra.png'), optimize=True)
    json.dump({'sprites': {k: list(v) for k, v in pos.items()}}, open(os.path.join(OUT, 'extra.json'), 'w'), separators=(',', ':'))
    print('extra atlas', atlas.size, len(pos), 'sprites')

    snd = os.path.join(REPO, 'art_source', 'sfx_fantasy_ui', 'OGG')
    pick = {'click': 'clicks', 'confirm': 'confirm', 'cancel': 'cancel', 'coins': 'coins', 'craft': 'crafting',
            'notify': 'notification', 'reward': 'reward', 'error': 'error', 'page': 'parchment', 'hover': 'hover'}
    os.makedirs(os.path.join(OUT, 'sfx'), exist_ok=True)
    for name, folder in pick.items():
        files = sorted(os.listdir(os.path.join(snd, folder)))
        src = os.path.join(snd, folder, files[0])
        dst = os.path.join(OUT, 'sfx', name + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-ac', '1', '-b:a', '64k', dst], check=True)
    print('ui sounds', sorted(pick))


if __name__ == '__main__':
    main()
