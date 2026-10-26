# Cuts the medieval UI pieces out of the UI pack (Kibyra's Free Medieval Fantasy UI) and scales them up
# without smoothing, so CSS can use them as nine-slice borders and icons that stay crisp everywhere.
# Writes v2/assets/ui/*.png. python3 v2/tools/ui.py
import os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'art_source', 'ui', 'medieval_fantasy_ui')
OUT = os.path.join(HERE, '..', 'assets', 'ui')
os.makedirs(OUT, exist_ok=True)
def cell(sheet, cx, cy, w=32, h=32): return Image.open(os.path.join(SRC, sheet)).convert('RGBA').crop((cx * w, cy * h, cx * w + w, cy * h + h))
def save(im, name, k): im.resize((im.width * k, im.height * k), Image.NEAREST).save(os.path.join(OUT, name + '.png'), optimize=True)
# nine-slice frames and textures (x2)
for name, (cx, cy) in {'panel': (1, 7), 'board': (7, 4), 'btn': (2, 6), 'chip': (6, 4), 'frame_wood': (3, 1), 'frame_stone': (4, 1),
                       'frame_iron': (5, 1), 'plank_dark': (2, 7), 'plank_light': (3, 7), 'ornate': (0, 6)}.items():
    im = cell('icons2.png', cx, cy); save(im.crop(im.getbbox()), name, 2)   # trimmed, so the frame meets the edges
pa = cell('icons2.png', 6, 5); save(pa.crop(pa.getbbox()), 'parchment', 3)
# the light board, recoloured gold for the main action buttons
gold = cell('icons2.png', 3, 7); gold = gold.crop(gold.getbbox())
px = gold.load()
for y in range(gold.height):
    for x in range(gold.width):
        r, g, b, a = px[x, y]
        if a: l = (r + g + b) / 3; px[x, y] = (min(255, int(l * 1.35 + 30)), min(255, int(l * 1.08 + 10)), int(l * 0.45), a)
save(gold, 'btn_gold', 2)
# the main-menu icons with their own lettering (64x32 cells)
for name, (cx, cy) in {'mm_continue': (1, 0), 'mm_new': (2, 0), 'mm_play': (0, 0), 'mm_armory': (1, 1), 'mm_troops': (2, 1), 'mm_kingdom': (3, 1),
                       'mm_map': (0, 2), 'mm_quests': (1, 2), 'mm_shop': (2, 2), 'mm_settings': (3, 2), 'mm_exit': (0, 3), 'mm_fight': (1, 3), 'mm_options': (2, 3), 'mm_start': (3, 3)}.items():
    save(cell('mainmenuicons.png', cx, cy, 64, 32), name, 2)
# small icons (x1; CSS sizes them, pixelated)
for name, (sheet, cx, cy) in {'i_coin': ('icons3.png', 3, 0), 'i_gem': ('icons3.png', 4, 0), 'i_emerald': ('icons3.png', 5, 0), 'i_pouch': ('icons3.png', 7, 0),
                              'i_sword': ('icons3.png', 0, 1), 'i_shield': ('icons3.png', 3, 1), 'i_helm': ('icons3.png', 4, 1), 'i_star': ('icons3.png', 0, 3),
                              'i_chest': ('icons3.png', 4, 6), 'i_scroll': ('icons3.png', 7, 3), 'i_skull': ('icons3.png', 0, 7), 'i_crown': ('icons3.png', 6, 7),
                              'i_book': ('icons3.png', 3, 2), 'i_hourglass': ('icons3.png', 2, 7), 'i_lock': ('icons3.png', 5, 3), 'i_key': ('icons3.png', 4, 3),
                              'i_heart': ('icons3.png', 0, 0), 'i_fire': ('icons3.png', 5, 2), 'i_anvil': ('icons3.png', 5, 4), 'i_map': ('icons3.png', 4, 4),
                              'i_pause': ('icons1.png', 6, 0), 'i_back': ('icons1.png', 5, 0), 'i_close': ('icons1.png', 1, 0), 'i_ok': ('icons1.png', 7, 0),
                              'i_gear': ('icons1.png', 2, 0), 'i_trophy': ('icons1.png', 4, 6)}.items():
    save(cell(sheet, cx, cy), name, 1)
print('ui pieces:', len(os.listdir(OUT)))
