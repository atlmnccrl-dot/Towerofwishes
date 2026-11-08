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

A hero-collector RPG: you build the team, the team fights.

1. **Start alone.** The Captain is your only hero. Stages pay gold, crystals ◆, sigils ✧ and gear.
2. **Recruit.** Crystals buy a random hero you don't own yet from an open **tier**; each tier holds ten
   heroes from the horde cast and opens when a chapter is cleared:

   | Tier | Opens | Cost |
   |---|---|---|
   | Common | at the start | ◆ 150 |
   | Rare | chapter 1 (Greenvale) cleared | ◆ 300 |
   | Epic | chapter 2 (the Sunscar) cleared | ◆ 600 |
   | Legendary | chapter 3 (Aldmere) cleared | ◆ 1000 |

   Six **legends** join through the story (Sera Nightveil 1-4, Ahmos 2-3, Kestrel 2-5, Brenna Redmane 3-1,
   Silas Grey 3-4, Talia Sunblade 4-1). A recruit steps out of a gate in the reveal.
3. **Grow them.** Level up with gold (cap 10 + 10 per star), **ascend** ★ with sigils to raise the cap
   (up to 5 stars), gear in four slots (weapon, armour, helm, charm) that the **Forge** upgrades to +10.
   Rarity (Common → Legendary) multiplies every stat.
4. **Formation.** Up to five heroes: two in the front row (they draw the blows), three behind.
   **Bonds** reward mixed callings. *Auto-fill* puts the strongest five in place.
5. **Battle.** Heroes fight on their own. Each charges an **ultimate** by fighting and taking hits;
   tap the glowing card (or 1–5) to unleash it with a cut-in, or turn on **AUTO**. 1×/2× speed, pause.
6. **Campaign.** Four chapters, thirty stages (Greenvale, the Sunscar, Aldmere, the Cantor's Gate):
   rout waves, destroy Gravegates, defend a ward against the clock, a duel and four bosses with
   telegraphed moves and enrage phases. Each stage shows the recommended power next to yours.
7. **Camp.** Your chosen hero stands by the fire; the camp grows tents, a forge, a shrine and a
   market as the campaign goes on. **Spoils** gather while you are away (up to 12 h). **Goals**
   (seventeen milestones) pay crystals, gold and sigils. The **Shop** has a few offers a day.

Losing costs nothing: level up, forge, change the formation and fight again.

| Callings | Role | Ultimate |
|---|---|---|
| Vanguard | Tank | **Shield Wall** — taunt, halve damage |
| Berserker | Bruiser | **Ravager Leap** — leap and smash |
| Ranger | Marksman | **Arrow Storm** — rain on a crowd |
| Arcanist | Caster | **Dragonbreath** — cone of fire (mages carry an element) |
| Warpriest | Healer | **Sanctuary** — heal and cleanse |
| Monk | Striker | **Whirlwind Kick** — spinning leap, scatters foes |
| Shadowblade | Assassin | **Shadowstep** — reappear behind a foe, sure critical |
| Lancer | Skirmisher | **Impaling Charge** — spear everything in a line |

Settings: music, effects, screen shake, damage numbers, skip story scenes, erase save.

## Code

| File | Role |
|---|---|
| `index.html` | page, styles, all screens and HUD markup |
| `js/data.js` | callings, legends, foes, gear, perks, bonds, buildings, missions, story. Pure |
| `js/rules.js` | heroes, stats, levels and stars, gear and forge, formation, tiers and recruiting, rewards, spoils, shop, goals, save. Pure (runs in Node) |
| `js/assets.js` | atlas loading, recolouring (dyes, skin, effect hues), paper-doll drawing, portraits |
| `js/world.js` | isometric projection, procedural maps per layout, painted ground, collisions, A* pathing |
| `js/battle.js` | the battlefield: formation, hero/foe AI, energy and ultimates, bosses, objectives, rendering, lighting |
| `js/audio.js` | synthesised sound effects and a procedural war-drum score |
| `js/screens.js` | every menu screen: top bar and tabs, camp, campaign, heroes, hero, recruit and reveal, team, forge, shop, goals, results, story |
| `js/main.js` | boot, loop, input, camp and title scenes, battle HUD, deploy → rewards, saving |
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
node test/rules-test.js                    # pure rules: stats, levels, stars, gear, formation, tiers, rewards, spoils, shop, goals
node test/sim-node.js all 4                # every stage fast-forwarded on AUTO: win rate, length
LAG=4 node test/sim-node.js all 2          # same, heroes four levels below the stage
NOULT=1 node test/sim-node.js all 4        # same, nobody casts ultimates
NODE_PATH=$(npm root -g) node test/shots.js /tmp/bb-shots            # title → story → camp → campaign → team → battle → results → every tab
NODE_PATH=$(npm root -g) node test/shots.js /tmp/bb-phone 844 390    # the same on a phone-sized touch screen
NODE_PATH=$(npm root -g) node test/scenes.js /tmp/bb-scenes 4,7,15,23,29   # stages mid-fight with a five-hero team
```
The browser tests expect a static server on port 8123 at `bannerborn/`
(`npx http-server -p 8123 bannerborn`) and fail on any console error.

Balance on AUTO, heroes one level below the stage with the team growing from one hero to five: every
stage won in 3–4 of 4 runs except the second fight (half), bosses 47–117 s. Four levels below, the
Greenvale boss, the Old Watch and the Bone Cantor become walls until the team levels up.

## Next (the last batch)

The roster and foe pools pick up new horde characters automatically when they are packed (five
horde parts are still missing: 02, 08, 10, 12, 13). Ideas waiting for art: buildings assembled
from the wall and roof kit, mounted heroes (the cast has riding clips), more regions.
