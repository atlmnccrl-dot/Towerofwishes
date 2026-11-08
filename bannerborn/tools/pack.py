#!/usr/bin/env python3
"""Pack the raw asset batches into trimmed atlases for Bannerborn.

usage: python3 -I tools/pack.py <raw_dir> <out_assets_dir>

<raw_dir> holds the unzipped packs side by side (desert_05_characters/, iso_04_characters/, ...).
Each character clip is a 1920x1024 sheet: 15 frames x 8 facings of 128x128. Row r faces the screen
angle -45*r degrees (row 0 = east, then clockwise: 2 = south/toward the camera, 6 = north). Frames are trimmed and shelf-packed;
the JSON keeps each frame's rect and its offset inside the 128 frame, so layers stay registered.
"""
import sys, os, json, glob
from PIL import Image

RAW, OUT = sys.argv[1], sys.argv[2]
FULL = ['Idle', 'Run', 'Attack1', 'Attack2', 'Attack3', 'Attack4', 'Attack5', 'AttackRun',
        'Special1', 'Taunt', 'TakeDamage', 'Die']
FOE = ['Idle', 'Run', 'Attack1', 'Attack2', 'Attack4', 'Special1', 'Taunt', 'TakeDamage', 'Die']

def find(rel):
    hits = glob.glob(os.path.join(RAW, '*', rel))
    if not hits:
        raise SystemExit('missing ' + rel)
    return hits[0]

# key: (source folder, clip list, strip baked shadow)
SETS = {
    'body':   ('Characters/player1', FULL, True),
    'hair':   ('Animations/Equipment/Head1Animation', FULL, True),
    'helm':   ('Animations/Equipment/Head2Animation', FULL, True),
    'chestA': ('Animations/Equipment/Chest1Animation', FULL, True),
    'chestB': ('Animations/Equipment/Chest2Animation', FULL, True),
    'legsA':  ('Animations/Equipment/Legs1Animation', FULL, True),
    'legsB':  ('Animations/Equipment/Legs2Animation', FULL, True),
    'sword':  ('Animations/Equipment/Sword1Animation', FULL, True),
    'axe':    ('Animations/Equipment/Axe1Animation', FULL, True),
    'shield': ('Animations/Equipment/Shield1Animation', FULL, True),
    'slash':  ('Animations/Equipment/slashAnimation', FULL, False),
    'sunguard': ('Characters/NPC2', FULL, True),   # desert NPC2 (golden shield warrior)
    'sunblade': ('Characters/NPC3', FULL, True),   # desert NPC3
    'ghoul':    ('Characters/Enemy 1', FOE, False),
    'necro':    ('Characters/Enemy 2', FOE, False),
    'warden':   ('Characters/Enemy 3', FOE, False),
    'witch':    ('Characters/NPC1', FULL, False),
    'shade':    ('Characters/NPC2', FULL, False),
}
ISO_CHARS = {'ghoul', 'necro', 'warden', 'witch', 'shade'}

class Shelf:
    def __init__(self, width):
        self.w = width; self.x = 0; self.y = 0; self.h = 0
    def place(self, w, h):
        if self.x + w > self.w:
            self.x = 0; self.y += self.h; self.h = 0
        p = (self.x, self.y); self.x += w; self.h = max(self.h, h)
        return p
    def height(self):
        return self.y + self.h

def pack_frames(frames, width=2048, pad=1):
    """frames: list of (key, Image RGBA). returns atlas, {key: [x,y,w,h,ox,oy]}"""
    items = []
    for key, im, ox, oy in frames:
        items.append((key, im, ox, oy))
    order = sorted(range(len(items)), key=lambda i: -items[i][1].size[1])
    sh = Shelf(width); pos = {}
    for i in order:
        k, im, ox, oy = items[i]
        w, h = im.size
        pos[i] = sh.place(w + pad, h + pad)
    H = sh.height()
    W = width if H > 0 else 1
    if sh.y == 0:  # single row: shrink width
        W = max(pos[i][0] + items[i][1].size[0] + pad for i in pos)
    atlas = Image.new('RGBA', (W, max(1, H)), (0, 0, 0, 0))
    rects = {}
    for i, (k, im, ox, oy) in enumerate(items):
        x, y = pos[i]
        atlas.paste(im, (x, y))
        rects[k] = [x, y, im.size[0], im.size[1], ox, oy]
    return atlas, rects

def save(atlas, meta, name):
    atlas.save(os.path.join(OUT, name + '.webp'), 'WEBP', lossless=True, quality=100, method=6)
    with open(os.path.join(OUT, name + '.json'), 'w') as f:
        json.dump(meta, f, separators=(',', ':'))

def strip(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < 128 else 255)
    return Image.merge('RGBA', (r, g, b, a))

def pack_chars():
    os.makedirs(os.path.join(OUT, 'chars'), exist_ok=True)
    for key, (rel, clips, shadow) in SETS.items():
        if key in ISO_CHARS:
            src = glob.glob(os.path.join(RAW, 'iso_*', rel))[0]
        elif rel.startswith('Characters'):
            src = glob.glob(os.path.join(RAW, 'desert_*', rel))[0]
        else:
            src = find(rel)
        frames = []; meta = {'clips': {}, 'cell': 128}
        for clip in clips:
            f = os.path.join(src, clip + '.png')
            if not os.path.exists(f):
                continue
            sheet = Image.open(f).convert('RGBA')
            if shadow:
                sheet = strip(sheet)
            n = sheet.size[0] // 128
            meta['clips'][clip] = n
            for r in range(8):
                for c in range(n):
                    cell = sheet.crop((c * 128, r * 128, c * 128 + 128, r * 128 + 128))
                    bb = cell.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
                    k = '%s:%d:%d' % (clip, r, c)
                    if not bb:
                        frames.append((k, Image.new('RGBA', (1, 1)), 0, 0)); continue
                    frames.append((k, cell.crop(bb), bb[0], bb[1]))
        atlas, rects = pack_frames(frames)
        meta['f'] = {}
        for clip, n in meta['clips'].items():
            meta['f'][clip] = [rects['%s:%d:%d' % (clip, r, c)] for r in range(8) for c in range(n)]
        save(atlas, meta, 'chars/' + key)
        print('char', key, atlas.size)

# ---- environment: props drawn at ENV scale, anchor = iso tile centre (128, 209) of the 256 sprite
ENV_SCALE = 0.5
def env_list(biome):
    if biome == 'vale':
        E = [os.path.join(RAW, 'iso_13_environment/Environment'), os.path.join(RAW, 'iso_12_environment/Environment')]
    else:
        E = [os.path.join(RAW, 'desert_07_environment/Environment/Sprites'), os.path.join(RAW, 'desert_08_environment/Environment/Sprites')]
    files = []
    for d in E:
        files += glob.glob(os.path.join(d, '*.png'))
    keep = []
    for f in files:
        n = os.path.basename(f)[:-4]
        base = n.split('_')[0]
        if base.startswith('Shadow') or base.startswith('TilePreview'):
            continue
        if biome == 'vale' and base.startswith('Wall') and base[5] not in 'ABCDEFG':
            continue
        keep.append((n, f))
    return keep

def pack_env():
    os.makedirs(os.path.join(OUT, 'env'), exist_ok=True)
    for biome in ('vale', 'sand'):
        frames = []
        for n, f in sorted(env_list(biome)):
            im = Image.open(f).convert('RGBA')
            im = im.resize((int(im.size[0] * ENV_SCALE), int(im.size[1] * ENV_SCALE)), Image.LANCZOS)
            bb = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
            if not bb:
                continue
            frames.append((n, im.crop(bb), bb[0] - 128 * ENV_SCALE, bb[1] - 209 * ENV_SCALE))
        atlas, rects = pack_frames(frames, 4096)
        save(atlas, {'scale': ENV_SCALE, 'f': rects}, 'env/' + biome)
        print('env', biome, atlas.size, len(rects))

# ---- animations: effects, props, destructibles. anchor = sprite centre
FX = {
    'aoe': ('iso_02_animations/Animations/Effects/AoE', 0.5),
    'bolt': ('iso_02_animations/Animations/Effects/Bolt', 1),
    'buff1': ('iso_02_animations/Animations/Effects/Buff1', 1),
    'buff2': ('iso_02_animations/Animations/Effects/Buff2', 1),
    'buff3': ('iso_02_animations/Animations/Effects/Buff3', 1),
    'buff4': ('iso_02_animations/Animations/Effects/Buff4', 1),
    'buff56': ('iso_02_animations/Animations/Effects/Buff5 6', 1),
    'buff78': ('iso_02_animations/Animations/Effects/Buff7 8', 1),
    'buff9': ('iso_02_animations/Animations/Effects/Buff9', 1),
    'buff10': ('iso_02_animations/Animations/Effects/Buff10', 1),
    'cone': ('iso_02_animations/Animations/Effects/Cone', 0.75),
    'dash': ('iso_02_animations/Animations/Effects/Dash', 0.6),
    'hook': ('iso_02_animations/Animations/Effects/Hook', 0.75),
    'levelup': ('iso_02_animations/Animations/Effects/LevelUp', 1),
    'barrel1': ('desert_03_animations/Animations/Props/Barrel 1', 0.5),
    'barrel2': ('desert_03_animations/Animations/Props/Barrel 2', 0.5),
    'barrel3': ('desert_03_animations/Animations/Props/Barrel 3', 0.5),
    'fire': ('desert_03_animations/Animations/Props/Fire', 0.5),
    'fire2': ('desert_03_animations/Animations/Props/Fire2', 0.5),
    'gas': ('desert_03_animations/Animations/Props/Gas', 0.5),
    'portal': ('desert_03_animations/Animations/Props/PortalIdle', 0.5),
    'portalopen': ('desert_03_animations/Animations/Props/PortalOpen', 0.5),
    'bones': ('desert_03_animations/Animations/Props/Skeleton explosion', 0.5),
    'torch': ('desert_03_animations/Animations/Props/Torch 1', 0.5),
    'turret': ('desert_03_animations/Animations/Props/Turret1', 0.5),
    'mill': ('iso_01_animations/Animations/Animated Tiles/WindMill1', 0.25),
    'ripple': ('iso_01_animations/Animations/Animated Tiles/Water Ripples 1', 0.5),
    'x_stone': ('iso_01_animations/Animations/Destructible tiles/stone explosion large', 0.5),
    'x_wood': ('iso_01_animations/Animations/Destructible tiles/wood explosion large', 0.5),
    'x_wall': ('iso_01_animations/Animations/Destructible tiles/Wall Stone explosion', 0.5),
    'x_tree': ('iso_01_animations/Animations/Destructible tiles/Tree Green Explosion', 0.5),
    'x_tree2': ('iso_01_animations/Animations/Destructible tiles/Tree Yellow Explosion', 0.5),
    'x_straw': ('iso_01_animations/Animations/Destructible tiles/straw explosion', 0.5),
    'x_clay': ('desert_01_animations/Animations/Destructible tiles/Clay explosion', 0.5),
    'x_grass': ('iso_01_animations/Animations/Destructible tiles/grass explosion large', 0.5),
}

def pack_fx():
    os.makedirs(os.path.join(OUT, 'fx'), exist_ok=True)
    frames = []; meta = {}
    for key, (rel, sc) in FX.items():
        fs = sorted(glob.glob(os.path.join(RAW, rel, '*.png')))
        if not fs:
            print('skip fx', key); continue
        meta[key] = len(fs)
        for i, f in enumerate(fs):
            im = Image.open(f).convert('RGBA')
            W, H = im.size
            if sc != 1:
                im = im.resize((max(1, int(W * sc)), max(1, int(H * sc))), Image.LANCZOS)
            cx, cy = W * sc / 2, H * sc / 2
            bb = im.getchannel('A').point(lambda v: 255 if v > 4 else 0).getbbox()
            k = '%s:%d' % (key, i)
            if not bb:
                frames.append((k, Image.new('RGBA', (1, 1)), 0, 0)); continue
            frames.append((k, im.crop(bb), bb[0] - cx, bb[1] - cy))
    atlas, rects = pack_frames(frames, 4096)
    out = {'n': meta, 'f': {k: [rects['%s:%d' % (k, i)] for i in range(n)] for k, n in meta.items()}}
    save(atlas, out, 'fx/fx')
    print('fx', atlas.size)

if __name__ == '__main__':
    what = sys.argv[3:] or ['chars', 'env', 'fx']
    if 'chars' in what: pack_chars()
    if 'env' in what: pack_env()
    if 'fx' in what: pack_fx()
