"""Pack the pixel effects the game uses into one atlas.

Sources (art_source/fx/, as delivered by the author):
  vfx_essentials/<Category>/<Effect>/*.png   Pixel VFX Essentials, 32 px frames
  kiln/<name>_strip<N>.png                    KILN FX Free Sampler, horizontal strips
  magic_spells_lite/<effect>/<effect>_sheet.png + manifest.json   Magic Spells VFX Lite, 64 px
  slashes_pack6/<1-6>/*.png                   Free pack 6: slash arcs in six colours, 100 px
  fxpack13/Effect<1-3>/*.png                  FX pack 13: fireballs, 64 px

Output: assets/fx/fx_<page>.png + assets/fx/fx.json
  { name: { fps, loop, anchor: [x, y] (in the frame), size: [w, h], frames: [[page, x, y, w, h, ox, oy], ...] } }
Each frame is trimmed; ox, oy is where the trimmed rect sits inside the full frame.
Run: python3 tools/pack_fx.py
"""
import glob, json, os, re, hashlib
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art_source', 'fx')
OUT = os.path.join(ROOT, 'assets', 'fx')
PAGE = 2048

def nat(s):
    return [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', s)]

def E(path):  # Pixel VFX Essentials frames
    return [Image.open(f).convert('RGBA') for f in sorted(glob.glob(os.path.join(SRC, 'vfx_essentials', path, '*.png')), key=nat)]

def K(name):  # KILN strip
    f = glob.glob(os.path.join(SRC, 'kiln', name + '_strip*.png'))[0]
    n = int(re.search(r'strip(\d+)', f).group(1))
    im = Image.open(f).convert('RGBA'); w = im.width // n
    return [im.crop((i * w, 0, i * w + w, im.height)) for i in range(n)]

def M(name):  # Magic Spells VFX Lite sheet
    man = json.load(open(os.path.join(SRC, 'magic_spells_lite', 'manifest.json')))
    e = man['effects_list'][name]; fw, fh = man['frame_size']
    im = Image.open(os.path.join(SRC, 'magic_spells_lite', e['sheet'])).convert('RGBA')
    return [im.crop((i * fw, 0, i * fw + fw, fh)) for i in range(e['frames'])]

def D(folder, every=1):  # numbered frame folders (pack 6, FX pack 13)
    fs = sorted(glob.glob(os.path.join(SRC, folder, '*.png')), key=nat)
    return [Image.open(f).convert('RGBA') for f in fs[::every]]

# name: (frames, fps, loop, anchor) — anchor 'c' centre, 'b' bottom centre (sits on the ground)
FX = {
    # hits and clashes
    'hit': (E('Hit Sparks/Hit Spark'), 20, False, 'c'),
    'hit_big': (E('Hit Sparks/Heavy Hit'), 18, False, 'c'),
    'hit_crit': (E('Hit Sparks/Critical Star'), 18, False, 'c'),
    'hit_slash': (E('Hit Sparks/Slash Hit'), 20, False, 'c'),
    'hit_punch': (E('Hit Sparks/Punch Impact'), 20, False, 'c'),
    'hit_blunt': (E('Hit Sparks/Blunt Thud'), 18, False, 'c'),
    'hit_pierce': (E('Hit Sparks/Pierce Spark'), 20, False, 'c'),
    'hit_fire': (E('Hit Sparks/Fire Hit'), 18, False, 'c'),
    'hit_ice': (E('Hit Sparks/Ice Hit'), 18, False, 'c'),
    'hit_shock': (E('Hit Sparks/Shock Hit'), 20, False, 'c'),
    'hit_poison': (E('Hit Sparks/Poison Hit'), 16, False, 'c'),
    'hit_holy': (K('hit_spark_holy_L'), 18, False, 'c'),
    'multi_hit': (E('Hit Sparks/Multi Hit'), 18, False, 'c'),
    'parry': (E('Hit Sparks/Parry Flash'), 18, False, 'c'),
    'block': (E('Hit Sparks/Block Spark'), 18, False, 'c'),
    # slashes
    'slash_r': (E('Slashes/Slash Right'), 22, False, 'c'), 'slash_l': (E('Slashes/Slash Left'), 22, False, 'c'),
    'slash_u': (E('Slashes/Slash Up'), 22, False, 'c'), 'slash_d': (E('Slashes/Slash Down'), 22, False, 'c'),
    'cleave': (E('Slashes/Wide Cleave'), 20, False, 'c'), 'spin_slash': (E('Slashes/Spin Slash'), 20, False, 'c'),
    'cross_slash': (E('Slashes/Cross Slash'), 18, False, 'c'), 'double_slash': (E('Slashes/Double Slash'), 20, False, 'c'),
    'dagger': (E('Slashes/Dagger Flick'), 24, False, 'c'), 'thrust': (E('Slashes/Thrust'), 22, False, 'c'),
    'claw': (E('Slashes/Triple Claw'), 20, False, 'c'), 'dark_slash': (E('Slashes/Dark Slash'), 18, False, 'c'),
    'fire_slash': (E('Slashes/Fire Slash'), 20, False, 'c'), 'ice_slash': (E('Slashes/Ice Slash'), 20, False, 'c'),
    'katana': (E('Slashes/Katana Draw'), 20, False, 'c'),
    'arc_white': (D('slashes_pack6/6', 3), 30, False, 'c'), 'arc_blue': (D('slashes_pack6/2', 3), 30, False, 'c'),
    'arc_gold': (D('slashes_pack6/1', 3), 30, False, 'c'), 'arc_red': (D('slashes_pack6/5', 3), 30, False, 'c'),
    'arc_green': (D('slashes_pack6/3', 3), 30, False, 'c'), 'arc_pink': (D('slashes_pack6/4', 3), 30, False, 'c'),
    'slash_arc_frost': (K('slash_arc_frost_L'), 18, False, 'c'), 'slash_arc_blood': (K('slash_arc_blood_L'), 18, False, 'c'),
    # dust and smoke
    'dust_land': (E('Smoke and Dust/Landing Dust'), 14, False, 'b'), 'dust_run': (E('Smoke and Dust/Run Dust'), 16, False, 'b'),
    'dust_kick': (E('Smoke and Dust/Dirt Kick'), 16, False, 'b'), 'dust_cloud': (E('Smoke and Dust/Dust Cloud'), 12, False, 'b'),
    'jump_puff': (E('Smoke and Dust/Jump Puff'), 16, False, 'b'), 'footstep': (E('Smoke and Dust/Footstep'), 14, False, 'b'),
    'smoke_puff': (E('Smoke and Dust/Smoke Puff'), 12, False, 'c'), 'dissipate': (E('Smoke and Dust/Dissipate'), 12, False, 'c'),
    'steam': (E('Smoke and Dust/Steam'), 10, True, 'b'), 'sand_burst': (E('Smoke and Dust/Sand Burst'), 14, False, 'b'),
    'smoke_earth': (K('smoke_puff_earth_L'), 14, False, 'b'), 'smoke_dark': (K('smoke_puff_smoke_L'), 14, False, 'c'),
    # magic
    'teleport': (E('Magic/Teleport'), 18, False, 'b'), 'portal': (E('Magic/Portal'), 12, True, 'c'),
    'cast_circle': (E('Magic/Cast Circle'), 14, True, 'c'), 'heal': (E('Magic/Heal'), 12, False, 'c'),
    'holy_light': (E('Magic/Holy Light'), 12, False, 'b'), 'shield_bubble': (E('Magic/Shield Bubble'), 12, True, 'c'),
    'summon': (E('Magic/Summon'), 12, False, 'b'), 'dark_curse': (E('Magic/Dark Curse'), 12, True, 'c'),
    'frost_nova': (E('Magic/Frost Nova'), 14, False, 'c'), 'water_splash': (E('Magic/Water Splash'), 14, False, 'b'),
    'wind_gust': (E('Magic/Wind Gust'), 14, False, 'c'), 'buff_up': (E('Magic/Buff Up'), 12, False, 'b'),
    'debuff': (E('Magic/Debuff Down'), 12, False, 'b'), 'arcane_orb': (E('Magic/Arcane Orb'), 12, True, 'c'),
    'poison_cloud': (E('Magic/Poison Cloud'), 10, True, 'b'),
    'heal_loop': (K('heal_loop_holy_L'), 12, True, 'b'), 'circle_holy': (K('magic_circle_loop_holy_L'), 12, True, 'c'),
    'circle_arcane': (K('magic_circle_loop_arcane_L'), 12, True, 'c'),
    'spell_cast': (M('cast'), 14, False, 'c'), 'spell_impact': (M('impact'), 16, False, 'c'),
    'spell_fire': (M('fire_impact'), 14, False, 'c'), 'spell_ice': (M('ice_shatter'), 14, False, 'c'),
    'spell_zap': (M('zap'), 16, False, 'c'), 'spell_heal': (M('heal'), 12, False, 'c'),
    # explosions
    'boom': (E('Explosions/Big Boom'), 14, False, 'c'), 'fire_burst': (E('Explosions/Fireball Burst'), 14, False, 'c'),
    'ice_shatter': (E('Explosions/Ice Shatter'), 14, False, 'c'), 'shockwave': (E('Explosions/Shockwave'), 16, False, 'c'),
    'rock_burst': (E('Explosions/Rock Burst'), 14, False, 'b'), 'small_pop': (E('Explosions/Small Pop'), 16, False, 'c'),
    'smoke_burst': (E('Explosions/Smoke Burst'), 12, False, 'c'), 'blast': (E('Explosions/Blast'), 14, False, 'c'),
    'explosion_fire': (K('explosion_medium_fire_L'), 16, False, 'c'), 'explosion_frost': (K('explosion_medium_frost_L'), 16, False, 'c'),
    # lightning
    'bolt_strike': (E('Lightning/Bolt Strike'), 16, False, 'b'), 'thunder': (E('Lightning/Thunder Impact'), 16, False, 'b'),
    'shock': (E('Lightning/Electric Shock'), 18, False, 'c'), 'chain_lightning': (E('Lightning/Chain Lightning'), 18, False, 'c'),
    'charge_up': (E('Lightning/Charge Up'), 14, True, 'c'), 'shock_aura': (E('Lightning/Shock Aura'), 14, True, 'c'),
    'lightning_holy': (K('lightning_strike_holy_L'), 16, False, 'b'),
    # fire
    'flame': (E('Fire/Flame Loop'), 14, True, 'b'), 'burning_ground': (E('Fire/Burning Ground'), 12, True, 'b'),
    'fire_ring': (E('Fire/Fire Ring'), 14, True, 'c'), 'fire_shield': (E('Fire/Fire Shield'), 14, True, 'c'),
    'ignite': (E('Fire/Ignite'), 14, False, 'b'), 'fire_puff': (E('Fire/Fire Puff'), 14, False, 'c'),
    'flamethrower': (E('Fire/Flamethrower'), 14, True, 'c'), 'torch': (E('Fire/Torch'), 12, True, 'b'),
    'campfire': (E('Fire/Campfire'), 12, True, 'b'), 'blue_flame': (E('Fire/Blue Flame'), 12, True, 'b'),
    'phoenix': (E('Fire/Phoenix Flare'), 14, False, 'c'),
    'fireball_big': (D('fxpack13/Effect1', 2), 24, True, 'c'),
    # projectiles (drawn along their flight)
    'arrow': (E('Projectiles/Arrow Trail'), 16, True, 'c'), 'magic_missile': (E('Projectiles/Magic Missile'), 16, True, 'c'),
    'energy_bolt': (E('Projectiles/Energy Bolt'), 16, True, 'c'), 'rock': (E('Projectiles/Rock Throw'), 16, True, 'c'),
    'homing_orb': (E('Projectiles/Homing Orb'), 14, True, 'c'), 'fireball': (E('Projectiles/Fireball Shot'), 16, True, 'c'),
    'ice_shard': (E('Projectiles/Ice Shard Shot'), 16, True, 'c'), 'spear': (E('Projectiles/Spear Throw'), 16, True, 'c'),
    'dart': (E('Projectiles/Poison Dart'), 16, True, 'c'), 'fireball_arcane': (K('fireball_loop_arcane_L'), 14, True, 'c'),
    'laser': (E('Projectiles/Laser Beam'), 16, True, 'c'),
    # ambient (atmosphere)
    'fireflies': (E('Ambient/Fireflies'), 10, True, 'c'), 'leaves': (E('Ambient/Falling Leaves'), 10, True, 'c'),
    'motes': (E('Ambient/Dust Motes'), 8, True, 'c'), 'embers': (E('Ambient/Embers Ambient'), 10, True, 'c'),
    'snow': (E('Ambient/Snow'), 10, True, 'c'), 'rain': (E('Ambient/Rain'), 14, True, 'c'),
    'ash': (E('Smoke and Dust/Ash Fall'), 8, True, 'c'), 'sparkles': (E('Ambient/Sparkles Ambient'), 10, True, 'c'),
    'fog': (E('Smoke and Dust/Fog Drift'), 6, True, 'c'),
    # rewards and UI
    'level_up': (E('Pickups and UI/Level Up'), 12, False, 'b'), 'exp': (E('Pickups and UI/EXP Gain'), 12, False, 'c'),
    'coin': (E('Pickups and UI/Coin Sparkle'), 12, False, 'c'), 'chest_open': (E('Pickups and UI/Chest Open'), 12, False, 'b'),
    'star_burst': (E('Pickups and UI/Star Burst'), 14, False, 'c'), 'unlock': (E('Pickups and UI/Unlock'), 12, False, 'c'),
    'heal_cross': (E('Pickups and UI/Heal Cross'), 12, False, 'c'), 'item_glow': (E('Pickups and UI/Item Glow'), 10, True, 'c'),
    'rank_up': (E('Pickups and UI/Rank Up'), 12, False, 'c'), 'save': (E('Pickups and UI/Save Sparkle'), 10, True, 'c'),
}

def main():
    frames, uniq, meta = [], {}, {}
    for name, (fr, fps, loop, anc) in FX.items():
        assert fr, name
        w, h = fr[0].size
        lst = []
        for im in fr:
            bb = im.getchannel('A').getbbox()
            if not bb:
                lst.append(None); continue
            c = im.crop(bb)
            key = hashlib.md5(c.tobytes() + bytes(c.size)).hexdigest()
            if key not in uniq:
                uniq[key] = len(frames); frames.append(c)
            lst.append((uniq[key], bb[0], bb[1]))
        meta[name] = {'fps': fps, 'loop': loop, 'size': [w, h], 'anchor': [w // 2, h // 2 if anc == 'c' else h - 1], 'frames': lst}
    order = sorted(range(len(frames)), key=lambda i: -frames[i].size[1])
    pages, place, page = [], {}, None
    x = y = shelf = 0
    for i in order:
        w, h = frames[i].size
        if page is None or x + w > PAGE:
            x, y, shelf = 0, y + shelf, 0
        if page is None or y + h > PAGE:
            page = Image.new('RGBA', (PAGE, PAGE)); pages.append(page); x = y = shelf = 0
        page.paste(frames[i], (x, y)); place[i] = (len(pages) - 1, x, y, w, h)
        x += w + 1; shelf = max(shelf, h + 1)
    pages[-1] = pages[-1].crop((0, 0, PAGE, y + shelf))
    os.makedirs(OUT, exist_ok=True)
    names = []
    for n, pg in enumerate(pages):
        nm = 'fx_%d.png' % n; pg.save(os.path.join(OUT, nm), optimize=True); names.append(nm)
    out = {'pages': names, 'fx': {}}
    for name, m in meta.items():
        fl, last = [], None
        for f in m['frames']:
            if f is None:
                fl.append(last); continue
            p = place[f[0]]; last = [p[0], p[1], p[2], p[3], p[4], f[1], f[2]]; fl.append(last)
        m['frames'] = [f for f in fl if f]
        out['fx'][name] = m
    json.dump(out, open(os.path.join(OUT, 'fx.json'), 'w'), separators=(',', ':'))
    print(len(FX), 'effects,', len(frames), 'frames, pages', [p.size for p in pages])

if __name__ == '__main__':
    main()
