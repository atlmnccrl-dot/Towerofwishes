# HOLDFAST (working title)

*Start with nothing. Build everything. Defend what you create.*

A survival settlement game for the browser, landscape-first for phones, played on PC too. One
survivor walks into a clearing in a wild, ruined world. You make camp, light a fire, survive the
first night, take in strangers, give them work, build and wall a settlement, send expeditions into
the unknown and hold it against raids that grow every few days.

It is its own game and its own world. It lives in this repository only to use the asset library
here. It reads the shared packs from `../assets` and its own repacked atlases from `holdfast/assets`.
It never touches Tower of Wishes code or canon, and it does not use the Tower of Wishes heroes.

**Play:** serve the repository root and open `holdfast/`. For example, run
`python3 -m http.server` from the repository root, then open <http://localhost:8000/holdfast/>.
Landscape; touch or mouse and keyboard.

## What is in this build (playable, tested)

| System | State |
|---|---|
| Opening | A filmed flyover of the real world with letterbox and captions (skippable), then one survivor in the wilds. Objectives teach by doing: make camp at the lit clearing, gather by tapping trees and rocks, light the campfire, build a lean-to, forage, survive the night. The first day's clock waits for you. |
| Camera and controls | Drag to pan, pinch or wheel to zoom (0.55x to 3.2x), tap to select or order. WASD and arrows, Space to pause, B to build, Esc to cancel, 1-3 for speed. Pause, 1x, 2x and 3x. |
| World | 96 x 96 tiles: forests, meadows, lakes, a stream, a pond near the camp, stone outcrops, ruins with salvage, wildlife (deer, hares), birds overhead, fireflies at night, soft terrain blending. Fog of war lifts as people explore, and lookouts reveal the land around them. Day and night with firelight, dusk tint, rain. |
| Gathering and resources | Wood, stone, food (berries, hunting, fields), water (from the lake, rain barrels, wells), metal (ruin salvage, expeditions), knowledge (scholars, expeditions). Storage caps; workers haul loads to the nearest store. Paths wear into dirt tracks, then stone roads with Paved Roads. |
| Building | 19 building types with tiers: Campfire to Hearth to Longhall, Lean-to, Cabin, Stockpile to Storehouse, Rain Barrel to Well, Woodcutter's and Stonecutter's Camps, Field, Barricade to Stone Wall (drag a line), Gate to Iron Gate, Lookout to Watchtower, Workshop to Smithy, Healer's Tent, Training Yard, Scholar's Study, Barracks; and in the Village era a Fountain Square (+morale), a Market (more traders) and a Ballista Tower. Placement preview with valid and invalid tiles, construction that rises from the ground with scaffolding, upgrades, damage (smoke, fire), repairs, demolition with refunds. |
| Survivors | Individual names, appearances (Character Creator cast), a trait, a past, six skills that grow with use, levels, health, morale, injuries, gear (club, spear, bow, sword, hide, mail). Ten jobs; people walk to the work and do it. They eat and drink at dawn, gather around the fire in the evening, sleep in beds at night, hide from danger, fight, rescue the wounded and mourn the dead. A downed survivor bleeds out unless someone reaches them. |
| Recruitment and trade | A scripted stranger on day 2, then wanderers more often when there are free beds and spirits are high. Expeditions rescue people. Each arrival is a choice. A travelling trader visits every four days (two with a Market) with three or four offers: resources, gear, or a hired hand. |
| Expeditions | A parchment world map with 14 places revealed by exploring. Choose a party (1 to 4) and rations. The party walks out of the map. Road events and an arrival encounter with two choices each are resolved by party skill checks (chance shown). Outcomes include loot, recruits, relics, new places, injuries and deaths. Clearing the raider camp or the stalker den quiets that threat for days. Millbrook trades and helps. |
| Defense | Night stalkers; Ash Raider raids announced 12 hours ahead (24 with Watch Fires), from more directions as days pass; the Hollow at night later; the Bone Warlord. Enemies path around walls or break through them, loot stores and run, shoot from range and attack towers. Guards man towers and shoot farther. The Alarm sends civilians into shelters and fighters to the fire. Beasts are weaker in firelight. Raids retreat after a while or rout when most fall. |
| Progression | Eras (Camp, Settlement, Village) raised at the Heart, with requirements: people, a raid repelled, research, a relic. Research (8 techs) spends knowledge. Crafting at the Workshop. Three relics found on expeditions. |
| Cinematics | Opening, first fire, night one, dawn, a stranger arriving, the first wall, raids (camera on the attackers), the boss, era changes, the first raid held. All in-engine on the live world. |
| Interface | A compact game HUD: objective card, resource bar with full and low warnings, clock and speed, a threat banner, round action buttons, a build drawer with building thumbnails and costs, a selection panel for survivors, buildings and foes, a people roster, job and gear pickers, research, craft, relics, event dialogs with an animated vignette, settings and credits, a game-over screen. |
| Sound | Ambience loops that follow time and weather (wind, night, fire, murmur), synthesised birds by day and crickets by night, fight and work sounds placed by distance, UI sounds, "Heartfelt Battle" during attacks. |
| Save | Autosave at dawn, every 90 seconds and when the tab is hidden; Save, Load and New Game in settings; Continue on the title screen. |

## Assets: what is used where

- **Characters:** the repository's Character Creator sets, repacked by `tools/pack_cast.py`. Only the
  clips the game plays are kept (Idle, Walk, Run, Attack1/3/5, CrouchIdle, TakeDamage, Die; 8
  directions), stored in `assets/cast/` (38 sets, loaded on demand).
  - Survivors use the townsfolk and fighter sets: Ashgate, Erdra and hamlet folk, the miller, the
    smith, guards, spearwoman, guild adventurer, poacher and beastfolk.
  - Foes: stalkers (`hamlet_predator`), the pale thing (`night_creature`), Ash Raiders (bandits,
    thugs), the Hollow (the skeletal goblin sets) and the Bone Warlord (`ogre`).
  - Named Tower of Wishes characters are not used.
- **World:** the shared tile atlas (`../assets/tiles`): Cainos grass, trees, rocks, ruins, houses,
  props. Extras the atlas lacks are packed by `tools/pack_extra.py` into `assets/extra.png`: gates,
  tents, flags, animals, berry bushes, ground textures. They come from the 16 px village and castle
  sets, drawn at 2x.
- **Effects:** the shared effect atlas (`../assets/fx`): campfire, hits, dust, sparkles, smoke, flame,
  arrows, orbs.
- **Interface:** the Kibyra icon sheets (`../assets/ui`) and the Adventurer font.
- **Sound:** `../assets/sfx` (fight sounds, ambience), the fantasy UI sounds converted to MP3 in
  `assets/sfx/`, and `../assets/music/heartfelt_battle.mp3` (CC0).

**Stand-in art (drawn in code, not final):** the palisade (Barricade) and the timber Lookout. No pack
has them. The 16 px props (tents, gates, animals) are drawn at 2x, so they are chunkier than the
Cainos art and the cast. That is the clearest style mismatch, and the next art pass should fix it.

## Code

| File | Role |
|---|---|
| `index.html` | Page, all styles, HUD markup |
| `js/data.js` | Buildings, eras, research, gear, survivors, foes, expedition sites and encounters, objectives. Pure |
| `js/world.js` | World generation (noise, lakes, forests, ruins, wildlife) and A* pathfinding. Pure |
| `js/sim.js` | The simulation: survivors' AI and jobs, construction, production, combat, raids, expeditions, objectives, save/load. Pure, runs in Node |
| `js/assets.js` | Loading and drawing atlases, the cast, effects, icons, thumbnails, procedural sprites |
| `js/render.js` | Terrain chunks, sorted sprites, effects, lighting, weather, fog, placement ghost |
| `js/cinema.js` | In-engine cinematics |
| `js/ui.js` | HUD and all panels and dialogs |
| `js/audio.js` | Web Audio mixer, ambience, synthesised wildlife |
| `js/main.js` | Loop, input, title, saves, event routing |
| `tools/pack_cast.py`, `tools/pack_extra.py` | Asset packers (rerun after changing sources) |

## Tests

```sh
node holdfast/test/sim-test.js 12 3          # headless autoplayer: opening, building, raids, expeditions, save/load, invariants
python3 -m http.server 8765 &                 # from the repository root
NODE_PATH=$(npm root -g) node holdfast/test/browser.js /tmp/hf-shots          # loads, opens, console errors
NODE_PATH=$(npm root -g) node holdfast/test/play-browser.js /tmp/hf-play      # plays days 1-5 through the real UI, screenshots
```

## Not done yet (planned, not implemented)

- Era III content beyond the Longhall: electricity and advanced works, more buildings, the Black Spire.
- Rival factions as living settlements on the world map that act on their own (Millbrook only trades).
- Interactive expedition battles; encounters resolve as choices with an animated vignette.
- Siege equipment, multi-wave sieges and the late-game army fights.
- Direct formation control of squads (individual move and attack orders work).
- A matched art pass for buildings: construction and damage variants, and a consistent scale for the 16 px props.
- Tested only in desktop Chromium (headless) at a phone-landscape viewport. Not yet tested on a real phone.
