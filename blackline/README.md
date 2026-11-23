# BLACKLINE: FRONTLINES

Working title. A real-time tactics game seen from above at an angle, drawn in thin off-white
line art on black, with rain, wind, lightning and muted red as the only colour. You command
squads, vehicles and support across a battlefield; you never steer a single soldier.

Only the art style comes from the reference video: black ground, thin imperfect lines,
stipple, rain and red accents. The view, maps, controls, interface and missions are original.
It is separate from everything else in this repository and reads no files from `assets/`;
every visual is drawn by code and every sound is synthesised.

Design and roadmap: [DESIGN.md](DESIGN.md).

## Play

Open `blackline/index.html` in a browser (no build step). Landscape on phones.

| | Touch | Mouse / keyboard |
|---|---|---|
| Select | tap a unit in the roster (left), or on the map; ALL selects everything | click; shift-click adds; `Tab` all |
| Order | tap the map: move (the unit finds its own way); tap a seen enemy: attack | click, or right click |
| Order strip | MOVE / ATTACK (advance and fight) / HOLD / RETREAT / FOLLOW | `M`, `G`, `H`, `R`, `F` |
| Deploy | `+ DEPLOY` under the roster, pick a card, tap a glowing ring (or the target, for artillery and rope drops) | `1`–`8`, `B` opens the drawer |
| Camera | drag to pan, pinch to zoom, tap or drag the minimap; double-tap a roster row to jump to it | drag, wheel, arrows / `WASD`, `Q`/`E` |
| Action camera | camera button, top right | `C` |
| Pause | ‖ top right | `Space`, `P`, `Esc` |
| Skip a cinematic | tap | `Space`, `Enter`, `Esc` |

## Campaign: Operation Black Rain

Five missions on three maps. Each opens with a briefing cinematic (title card, typed lines over
camera moves that show the ground and the enemy, an introduction card for each new unit, then
H-hour), teaches through hints that point at what to tap, and ends on a closing shot and a
debrief.

| # | Mission | Map | Objective | New | Victory unlocks |
|---|---|---|---|---|---|
| 01 | The Ford | the ford | cross the stream, take the wooded hill A | rifle squad | machine-gun team |
| 02 | The Gunline | the ford | hold A against four waves (3:30) | machine-gun team | scouts, artillery |
| 03 | Eyes on the Ridge | the ridge | take B from dug-in gunners | scouts, artillery | carrier, tank |
| 04 | Iron in the Rain | the ridge | break their armour, take the village C | carrier, tank | helicopter, rope drop |
| 05 | Black Rain | the valley | everything; break their line | helicopter, rope drop | — |

Up to three stars per mission (win, losses under a limit, time under par); stars give a rank.
Skirmish (the valley) opens after mission 01 with the cards unlocked so far. Progress is saved in
the browser; if storage is blocked the game plays without saving.

## The battlefield

- **Ground:** height shown as stippled relief and dotted contour lines. Hills and ridges block
  sight; uphill is slower.
- **Woods:** cover, and they hide whoever stands in them; vehicles slow down. The canopy is drawn
  over the units.
- **Ruins:** block movement and sight; walls give cover.
- **Trenches** give the best cover. **Wire** slows infantry. **Streams** stop vehicles except at
  fords; infantry wade slowly. **Roads** speed vehicles.
- **Pathfinding:** every order is routed around obstacles; the route shows as a dotted line.

## Combat

Every shot is a projectile; sight is checked over the terrain; cover, suppression (crouch, prone,
pinned) and armour classes decide hits; explosions crater the ground and throw debris; wrecks
burn and become cover; helicopters fall before they die. Each side only sees and targets what its
units can see, and firing reveals the shooter.

## Code

| File | Role |
|---|---|
| `js/util.js` | seeded RNG, noise, maths |
| `js/data.js` | unit, weapon, armour and support tables; rules |
| `js/map.js` | the three maps: height field, woods, ruins, trenches, roads, streams, wire; cover, movement cost, line of sight, A* pathfinding |
| `js/sim.js` | the fight on the 2D field: units, orders and routes, sight, targeting, projectiles, damage, sectors, economy |
| `js/ai.js` | the computer commander (modes: push, assault, defend) |
| `js/campaign.js` | missions, waves, objectives, hints, stars, unlocks, saved progress |
| `js/render/view.js` | canvas, camera, the angled projection, grain, vignette |
| `js/render/terrain.js` | the ground pre-rendered in line art, woods canopy, sector marks, craters; rain, dot clouds, lightning |
| `js/render/units.js` | soldiers, extruded vehicles, helicopters, wrecks, selection rings and routes |
| `js/render/fx.js` | flashes, tracers, explosions, debris, smoke, flares; event → effect and sound |
| `js/render/cinema.js` | letterbox, title cards, briefing camera moves, unit dossiers, H-hour, closing shots |
| `js/audio.js` | synthesised sound |
| `js/hud.js` | the interface: top bar, roster, deploy drawer, order strip, minimap, title, campaign, pause, debrief |
| `js/main.js` | loop, screens, input, the director camera |

`util`, `data`, `map`, `sim`, `ai` and `campaign` touch no DOM and run in Node.

## Tests

```sh
node test/sim-test.js 10                                            # maps, rules, 10 AI-vs-AI matches
node test/campaign-test.js 4                                        # mission data, unlocks, saves; each mission played by an AI on our side
NODE_PATH=$(npm root -g) node test/flow.js /tmp/bl-flow [--phone]   # title → campaign → briefing → play → debrief → mission 02, by real taps
NODE_PATH=$(npm root -g) node test/look.js /tmp/bl-look [--phone]   # screenshots of the main screens
```

Not yet tested on a real phone; touch was exercised through Playwright's iPhone emulation only.
