# BANNERBORN

*Raise your banner. Earn your heroes. Shut the Gravegates.*

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

1. **Start alone.** The Captain is your only hero. Every first victory earns a **Banner Mark**
   (two for a boss, one more for a first S grade).
2. **Earn your heroes.** The Heroes screen holds set **tiers** opened by the campaign, each with ten
   heroes from the horde cast, bought with Marks:

   | Tier | Opens | Cost | Stars |
   |---|---|---|---|
   | I · Recruits | at the start | ⚑ 1 | ★ |
   | II · Veterans | Greenvale freed (Ossric) | ⚑ 2 | ★★ |
   | III · Elite | the Sunscar quiet (Sallow) | ⚑ 3 | ★★ |
   | IV · Champions | Aldmere freed (the Pale Regent) | ⚑ 4 | ★★★ |

   Six **legendary heroes** join through the story (Sera Nightveil, Ahmos, Kestrel, Brenna Redmane,
   Silas Grey, Talia Sunblade). Locked tiers show as silhouettes.
3. **Callings:**

   | Calling | Role | Skill |
   |---|---|---|
   | Vanguard | Tank | **Shield Wall** — taunt, halve damage |
   | Berserker | Bruiser | **Ravager Leap** — leap and smash |
   | Ranger | Marksman | **Arrow Storm** — rain on a crowd |
   | Arcanist | Caster | **Dragonbreath** — cone of fire (mages carry an element) |
   | Warpriest | Healer | **Sanctuary** — heal and cleanse |
   | Monk | Striker | **Whirlwind Kick** — spinning leap, scatters foes |
   | Shadowblade | Assassin | **Shadowstep** — reappear behind a foe, sure critical |
   | Lancer | Skirmisher | **Impaling Charge** — spear everything in a line |

4. **Build the warband** — up to four march; the rest bank experience. **Bonds** reward the mix.
   Every level offers a choice of three **perks**. Loot comes in four rarities; on the Captain it
   also changes the armour you see.
5. **Grow the stronghold** — Barracks (+health), War Forge, Training Yard, Chapel, Market. Each one
   you build appears in the camp scene, where townsfolk wander between the tents.
6. **March** — sixteen missions across Greenvale, the Sunscar, **Aldmere the fallen capital** and the
   Cantor's Gate: rout waves, destroy Gravegates, defend a ward against the clock, a duel and four
   bosses with telegraphed moves and enrage phases. Chests open with a beam of light in the colour
   of the loot. After the vale is free, the **Endless Gate** opens for score. Waves shrink for a
   small warband, so a lone Captain can win the first fight.

### Commanding a battle

The warband fights on its own: heroes pick targets, kite, protect wards and step out of telegraphed
attacks by themselves. You are the commander.

| Order | Touch | Keyboard |
|---|---|---|
| Unleash a hero's skill (a cut-in plays; unused skills fire on their own after a few seconds, or always with *auto skills* in Settings) | tap the hero's card | 1–4 |
| Plant the banner: the warband holds there | tap the ground | — |
| Focus every blade on one foe | tap the foe | — |
| March on | Advance | A |
| **Raise the Banner** when the gauge is full: shockwave, +50 % damage, skills reset | ⚑ | R |
| Battle speed 1× / 2× | 1× | F |
| Pause (with a short command guide) | ❚❚ | Space |

Two skills from different heroes within a moment make a **combo**: the whole warband hits 25 %
harder for four seconds. Battles open with a short cinematic, bosses get an entrance, and every
victory ends with a grade (S/A/B/C, gold bonus) and an MVP.

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
node test/sim-node.js all 12               # every mission fast-forwarded hands-off: win rate, length, timeouts
PROG=1 node test/sim-node.js all 10        # same, with the warband growing from one hero (1, 2, 3, then 4)
AUTO=1 node test/sim-node.js all 10        # same, with heroes casting skills on their own
NODE_PATH=$(npm root -g) node test/shots.js /tmp/bb-shots     # new game → camp → Heroes → recruit → map → battle (orders, cut-in, rally)
NODE_PATH=$(npm root -g) node test/scenes.js /tmp/bb-scenes 0,4,5,9,11   # missions mid-fight + results
NODE_PATH=$(npm root -g) node test/phone.js /tmp/bb-phone     # 844×390 touch layout
NODE_PATH=$(npm root -g) node test/legends.js /tmp/bb-legends # legends in the party, Endless Gate, defeat → retry
```
The browser tests expect a static server on port 8123 at `bannerborn/`
(`npx http-server -p 8123 bannerborn`).

Hands-off balance (no orders given, skills firing only after the wait), mission-level heroes with
typical gear, the warband growing from one hero: the first two fights ≈ 60 %, the rest 90–100 %,
the Bone Cantor ≈ 60 %; bosses ≈ 50–110 s. A commander who times skills, focuses and plants the
banner does better. No stalls in the sweeps.
Endless Gate: a level-5 warband falls around wave 5, a level-10 one around wave 9.

## Next (the last batch)

The roster and foe pools pick up new horde characters automatically when they are packed (five
horde parts are still missing: 02, 08, 10, 12, 13). Ideas waiting for art: buildings assembled
from the wall and roof kit, mounted heroes (the cast has riding clips), more regions.
