# Vael: Sellsword Company (v2)

A squad RPG across six regions of the fallen kingdom of Vael. Each run starts with a spin of the wheel:
it picks the hero who leads the company (three heroes are free at the start, five are freed by beating
region bosses). The leader always fights and gives the squad their perk; the run lasts until a battle
is lost or a Seal of Vael is taken. Battles play themselves, or the player fires each hero's ability. Built from the Tower of Wishes character art,
animations and effects; everything else is new. Names and story are proposals for the author.

## Layout

| Path | What |
|---|---|
| `index.html` | The page: styles and every screen's markup |
| `src/main.js` | Boot, screens, the loop, buttons |
| `src/combat/battle.js` | The battle simulation (pure; runs in Node) |
| `src/data/` | The eight heroes, their unlocks and leader perks (`heroes.js`), units and foes, animations, campaign (6 regions, 60 missions), items, tuning (foe strength per mission), the world map's lands (`world.js`), battle arenas (`arenas.js`), cutscene sets (`stagesets.js`) and scenes (`scenes.js`) |
| `src/game/progress.js` | The save: rewards, levels, gear, training, upgrades, heroic mode, save codes (pure) |
| `src/game/economy.js` | Bounties, feats, the shop, the gem-pack catalog (pure) |
| `src/game/store.js` | App-store purchases (cordova-plugin-purchase); off on the web |
| `src/game/audio.js` | Music and sounds (Web Audio) |
| `src/render/` | The battle view and its arenas, the walkable world map (`overworld.js`, painted by `terrain.js`), the cutscene stage (`stage.js`: a low side-on camera, layered sets) and its player (`scene.js`), the campfire, asset loading |
| `src/ui/` | The wheel (`wheel.js`), the map card and markers, the formation, rewards and the new-hero reveal, heroes, shop/bounties/feats, tips; vector icons (`icons.js`) and big animated hero art (`heroart.js`) |
| `assets/` | Packed art (lossless), tiles, effects, sounds, music, fonts, icons |
| `tools/` | `pack.py` (art and sounds from the repo's assets), `portraits.py`, `icons.py` (app icon and splash), `store-shots.mjs` (store screenshots), `world_atlas.py` (map and set pieces), `hero_art.py` (the menus' hero poses) |
| `app/` | The iOS and Android app (Capacitor 8); see `docs/RELEASE.md` |
| `docs/` | `RELEASE.md` (store steps, products, listing), `PRIVACY.md` |

## Tests

```sh
node v2/test/progress-test.js        # save, runs and the wheel, rewards, levels, gear, training, upgrades, heroic, save codes
node v2/test/economy-test.js         # bounties, feats, shop, purchases granted once
node v2/test/battle-test.js          # random teams against the lab waves: win rates, no timeouts
node v2/test/campaign-test.js 12     # plays all 60 missions as a casual player (OPTIMAL=1: spends everything)
node v2/test/power-test.js 4         # the power rating predicts wins (equal power: about three wins in four)
node v2/test/tune.js 8               # re-tunes every mission's foe strength (writes src/data/tuning.js)
NODE_PATH=$(npm root -g) node v2/test/browser-check.js /tmp/shots   # plays the whole game in a browser
```

After changing units, abilities, upgrades or rewards, run `tune.js` and then `campaign-test.js` (also with
`PICK=0` and `PICK=1`: a company that always takes the first or the second upgrade must never get stuck).

Battle rules worth knowing: the time limit is 120 s and counts as a loss; after 45 s every blow lands 5%
harder each second ("fury"), so no battle stalls. "Best team" fields a healer, at most two tanks, then
the strongest of the rest.
