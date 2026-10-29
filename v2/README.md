# Vael: Sellsword Company (v2)

A squad RPG across six regions of the fallen kingdom of Vael. A new company is one hero, Corvin; every
other hero stays hidden until met, three or four to a region. A region is crossed as an expedition: a
branching road from its gate to its boss, through fights, elites, camps, a pedlar, treasure and events,
with wounds carried from fight to fight. Each expedition starts with a spin of the wheel that picks which
of the eight wheel heroes leads (the others join it as they are met or freed by the region bosses). The
leader always fights and gives the squad their perk; the expedition lasts until a fight is lost (levels,
gear and cleared missions stay) or the boss's Seal of Vael is taken. Cleared missions can be replayed from
the world map, outside expeditions. Fifteen more heroes join as recruits: they fight but never lead. Every fight
opens like a film (the foes, the company, FIGHT) and a director camera follows it; battles play
themselves, or the player fires each hero's ability. The team screen is the camp itself, the team
drilling and resting round the fire. After every win in a run the company picks one of three boons
(burning hits, chain lightning, a hero who gets back up, ...), which stack until the run ends. Missions ask
for more than a rout: hold out against waves, protect a cart, hunt a marked foe against the clock, survive an
ambush; elite foes bring traits (shielded, enraged, splitting, vampiric, swift) and some fields are struck by
rockfall, fire or lightning. Each region fights on three or four different battle maps; after the
sixth Seal, every mission opens again on Heroic. Built from the Tower of Wishes character art,
animations and effects; everything else is new. Names and story are proposals for the author.

## Layout

| Path | What |
|---|---|
| `index.html` | The page: styles and every screen's markup |
| `src/main.js` | Boot, screens, the loop, buttons |
| `src/combat/battle.js` | The battle simulation (pure; runs in Node) |
| `src/data/` | The run's boons (`boons.js`), what the heroes say in a fight (`voices.js`), the wheel's eight heroes, their unlocks and leader perks (`heroes.js`), heroes, recruits and foes, animations, campaign (6 regions, 60 missions, each with its job, elites and hazard), items, tuning (foe strength per mission), the world map's lands (`world.js`), battle arenas (`arenas.js`: 21 places, which mission fights where, also the cutscenes' places) and scenes (`scenes.js`) |
| `src/game/expedition.js` | Expeditions (pure): a region's branching map, wounds, camps, the pedlar, treasure, events |
| `src/game/progress.js` | The save: rewards, levels, gear, training, upgrades, heroic mode, save codes (pure) |
| `src/game/economy.js` | Bounties, feats, the shop, the gem-pack catalog (pure) |
| `src/game/store.js` | App-store purchases (cordova-plugin-purchase); off on the web |
| `src/game/audio.js` | Music and sounds (Web Audio): a theme each for the title, the camp, battles and bosses, victory and defeat stings |
| `src/render/` | The battle view and its arenas, the battle director (`director.js`: the cinematic start, the camera, slow time), the walkable world map (`overworld.js`, painted by `terrain.js`), the cutscene player (`scene.js`: filmed scenes drawn by the battle view, on the same arenas), the campfire, asset loading |
| `src/ui/` | The expedition's road (`expedition.js`), the boon pick (`boons.js`), the wheel (`wheel.js`), the map card and markers, the formation, rewards and the new-hero reveal, heroes, shop/bounties/feats, tips; vector icons (`icons.js`) and big animated hero art (`heroart.js`) |
| `assets/` | Packed art (lossless), tiles, effects, sounds, music, fonts, icons |
| `tools/` | `pack.py` (art and sounds from the repo's assets), `portraits.py`, `icons.py` (app icon and splash), `store-shots.mjs` (store screenshots), `world_atlas.py` (map and set pieces), `hero_art.py` (the menus' hero poses), `compose.py` (the title, camp and boss themes and the stings, synthesised: `python3 tools/compose.py`, needs numpy, scipy and ffmpeg) |
| `app/` | The iOS and Android app (Capacitor 8); see `docs/RELEASE.md` |
| `docs/` | `RELEASE.md` (store steps, products, listing), `PRIVACY.md` |

## Tests

```sh
node v2/test/progress-test.js        # save, runs and the wheel, rewards, levels, gear, training, upgrades, heroic, save codes
node v2/test/economy-test.js         # bounties, feats, shop, purchases granted once
node v2/test/battle-test.js          # random teams against the lab waves: win rates, no timeouts
node v2/test/jobs-test.js 2          # every mission's job, elites and hazard, every boon going off; boons in the save
node v2/test/expedition-test.js      # every region's road can be crossed; every place resolves; wounds stay in bounds
node v2/test/campaign-test.js 8      # plays the campaign as expeditions, as a casual player: expeditions per region, win rates
node v2/test/power-test.js 4         # the power rating predicts wins (equal power: about three wins in four)
node v2/test/tune.js 8               # re-tunes every mission's foe strength from simulated expeditions (writes src/data/tuning.js)
NODE_PATH=$(npm root -g) node v2/test/browser-check.js /tmp/shots   # plays the whole game in a browser
```

After changing units, abilities, upgrades or rewards, run `tune.js` and then `campaign-test.js` (also with
`PICK=0` and `PICK=1`: a company that always takes the first or the second upgrade must never get stuck).

Battle rules worth knowing: the time limit is 120 s and counts as a loss; after 45 s every blow lands 5%
harder each second ("fury"), so no battle stalls. "Best team" fields a healer, at most two tanks, then
the strongest of the rest.
