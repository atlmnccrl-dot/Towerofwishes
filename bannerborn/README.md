# BANNERBORN

*Forge your heroes. Raise your banner. Shut the Gravegates.*

A new, original isometric action RPG about **building a team**. It is a separate game from Tower of
Wishes and Emberfall: own world, cast, story, code and art. It uses only the asset packs the author
supplied for it (the 2D Isometric fantasy pack, the 2D Desert Fantasy pack and the 144-character "horde"
cast), packed into `bannerborn/assets/`. Names, story and balance are proposals for the author.

**Play:** serve the repository root and open `bannerborn/index.html`
(`python3 -m http.server`, then <http://localhost:8000/bannerborn/>). Landscape; touch or keyboard.
Progress saves in the browser.

## The game

Nine banners once stood between the living and the dead. Then the Gravegates opened, Vesh Morrow
began to sing, and the dead got up to listen. One banner is left, carried by a captain with no army.

1. **Raise your banner** — name the warband, pick its field colour, sigil and trim. It flies over
   your camp.
2. **Forge your heroes** — a full character creator built on the pack's paper-doll layers: skin,
   hair or helm, gilded or plate armour and legs, eight dyes each, and a **calling**:

   | Calling | Role | Weapon | Skill |
   |---|---|---|---|
   | Vanguard | Tank | sword + shield | **Shield Wall** — taunt, halve damage |
   | Berserker | Bruiser | great axe | **Ravager Leap** — leap and smash |
   | Ranger | Marksman | bow | **Arrow Storm** — rain on a crowd |
   | Arcanist | Caster | bare hands | **Dragonbreath** — cone of fire |
   | Warpriest | Healer | shield | **Sanctuary** — heal and cleanse |
   | Monk | Striker | fists and kicks | **Whirlwind Kick** — spinning leap, scatters foes |
   | Shadowblade | Assassin | knives | **Shadowstep** — reappear behind a foe, sure critical |
   | Lancer *(recruits only)* | Skirmisher | spear (hits a line) | **Impaling Charge** — spear everything in a line |

3. **Build the warband** — up to four march; the rest bank experience. **Bonds** reward the mix
   (Full Banner, Shield & Sorcery, Bloodpact, Hold the Line, Blessed, Wall of Steel). Every level
   offers a choice of three **perks**. Loot (four rarities) changes how heroes look: a plate cuirass
   you equip is the plate your hero wears. Six **legendary heroes** join through the story
   (Sera Nightveil, Ahmos, Kestrel, Brenna Redmane, Silas Grey, Talia Sunblade).
   The **Hall of Heroes** offers wandering recruits — 102 ready-made heroes from the horde cast,
   each with its own look, calling, star rating (1–3) and, for mages, an element (fire burns, frost
   slows, blood drains, storm chains, holy heals…). New faces arrive after every battle.
4. **Grow the stronghold** — Barracks, War Forge, Training Yard, Chapel, Market, Hall of Heroes.
   Each one you build appears in the camp scene, where townsfolk wander between the tents.
5. **March** — sixteen missions across Greenvale, the Sunscar, **Aldmere the fallen capital** and the
   Cantor's Gate: rout waves, destroy Gravegates, defend a ward against the clock, a duel and four
   bosses with telegraphed moves and enrage phases. Chests on every map open with a beam of light
   in the colour of the loot. After the vale is free, the **Endless Gate** opens for score.

### Fighting

Real-time, isometric. You command one hero; the others fight on their own. Swap any time.

| Action | Touch | Keyboard |
|---|---|---|
| Move | left thumb (floating stick) | WASD / arrows |
| Attack (hold) | ATTACK | J / Enter |
| Calling skill | ✦ | K / E |
| Dodge (a dodge through a blow is a **Perfect Dodge**: slow-motion, banner charge) | DODGE | Space / Shift |
| **Raise the Banner** when the gauge is full: the warband cheers, shockwave, +50 % damage, skills reset | ⚑ | R / Q |
| Take command of hero 1–4 | tap a portrait | 1–4 |
| Full auto | A | — |

Foes: Bone Reavers, Bonewardens (block blows from the front), Gravecallers (curse bolts, raise
reavers), skeleton soldiers, shieldbearers and archers (fifteen different skeletons), Wraiths
(elemental bolts, flicker away when struck), Cult Warlocks (telegraphed fire rings), Beastkin
Raiders (frenzy when hurt), Bone Ballistas, Gravegates, elite variants (Bloodbound, Frostbone,
Gilded), and the bosses Ossric, Kestrel, Sallow, the Pale Regent (fire, frost and shadow tides)
and Vesh Morrow. Explosive and
poison barrels lie around. Losing costs nothing: heroes keep a share of the experience; re-equip and
march again.

## Code

| File | Role |
|---|---|
| `index.html` | page, styles, all screens and HUD markup |
| `js/data.js` | callings, legends, foes, gear, perks, bonds, buildings, missions, story. Pure |
| `js/rules.js` | heroes, stats, levels, loot, save model, unlocks. Pure (runs in Node) |
| `js/assets.js` | atlas loading, recolouring (dyes, skin, effect hues), paper-doll drawing, portraits |
| `js/world.js` | isometric projection, procedural maps per layout, painted ground, collisions, A* pathing |
| `js/battle.js` | the battlefield: entities, hero/foe AI, skills, bosses, objectives, rendering, lighting |
| `js/audio.js` | synthesised sound effects and a procedural war-drum score |
| `js/ui.js` | banner editor, Hero Forge, warband, stronghold, war map, results, story cards |
| `js/main.js` | boot, loop, input, screen flow, camp and title scenes, rewards, saving |
| `tools/pack.py` | packs the raw asset batches into trimmed atlases |
| `test/` | Node tests and headless-browser screenshot runs |

### Assets

The raw packs are not committed (≈300 MB). `tools/pack.py <raw_dir> assets` rebuilds `assets/`
(≈18 MB) from the unzipped batches:

- `assets/chars/` — the base body, ten equipment layers (hair, helm, two chests, two legs, sword,
  axe, shield, slash), and seven complete characters (two desert warriors, two skeleton types, the
  necromancer, the hooded witch, the dark rogue). 15 frames × 8 facings per clip, frames trimmed and
  shelf-packed; the desert pack's baked shadows are removed so every character matches.
- `assets/env/vale|sand` — every environment sprite of both packs at half size (trees, rocks,
  walls, roofs, tents, stalls, statues, cages, banners…).
- `assets/fx/` — the animated effects, props and destructibles; `fx/other` holds the fire ring,
  cloud shadows and light rays.
- `assets/env/ground` — the ground block kit (dirt, grass, cobbles, flagstones, floor tiles),
  flora, chests, doors. Maps are tiled from it; the desert recolours the dirt into sand.
- `assets/chars/h/` — the horde cast: one atlas per character with only the clips its role uses,
  and `roster.json` (archetype, calling or foe kind, element, colours) parsed from the pack READMEs.
  `assets/chars/brenna|reaper` are the two iso-pack characters (legends).

`tools/pack.py <raw_dir> assets horde ground other` packs batch 2 (horde characters in parallel).

## Tests

```sh
node test/rules-test.js                    # pure rules: stats, xp, perks, loot, bonds, unlocks
node test/sim-node.js all 12               # every mission fast-forwarded in full auto: win rate, length, timeouts
NODE_PATH=$(npm root -g) node test/shots.js /tmp/bb-shots     # new game → forge → camp → map → battle → rally
NODE_PATH=$(npm root -g) node test/scenes.js /tmp/bb-scenes 0,4,5,9,11   # missions mid-fight + results
NODE_PATH=$(npm root -g) node test/phone.js /tmp/bb-phone     # 844×390 touch layout
NODE_PATH=$(npm root -g) node test/legends.js /tmp/bb-legends # legends in the party, Endless Gate, defeat → retry
NODE_PATH=$(npm root -g) node test/tavern.js /tmp/bb-tavern   # Hall of Heroes: offers, recruiting, recruits in camp and battle
```
The browser tests expect a static server on port 8123 at `bannerborn/`
(`npx http-server -p 8123 bannerborn`).

Full-auto balance at mission level with typical gear and mixed teams of all eight callings
(10 runs each, 16 missions): 60–100 % wins, bosses ≈ 60–120 s, occasional wipes at the spikes
(the Old Watch, Tombs of Glass, the Regent, the Cantor).
A player who dodges and aims skills does better. No stalls over 384 simulated runs.
Endless Gate: a level-5 warband falls around wave 5, a level-10 one around wave 9.

## Next (the last batch)

The roster and foe pools pick up new horde characters automatically when they are packed (five
horde parts are still missing: 02, 08, 10, 12, 13). Ideas waiting for art: buildings assembled
from the wall and roof kit, mounted heroes (the cast has riding clips), more regions.
