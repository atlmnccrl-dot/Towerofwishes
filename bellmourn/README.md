# BELLMOURN

*Ring the bell. Bring the dawn.*

An isometric pixel-art action game for the browser (PC and iPhone, landscape). A separate game
from Tower of Wishes: its own world, cast, story, code and art.

**No pre-made assets.** Nothing is loaded from the repository's asset library or anywhere else: every
texture, building, prop, character, effect, the font, the music and every sound are created from scratch
in code when the game starts. The only third-party file is the three.js rendering library (code, MIT)
in `vendor/`. `node bellmourn/test/no-assets.mjs` enforces this.

Play: serve the repository root and open `bellmourn/index.html`, for example
`python3 -m http.server 8000` and then <http://localhost:8000/bellmourn/>.

## The look

The whole city is a real 3D scene rendered into a small buffer (about 200 px tall) with an orthographic
isometric camera at 16 pixels per metre, then scaled up by a whole number without smoothing. Every
texture is drawn procedurally at 16 texels per metre and projected in world space, so walls, floors and
props share one pixel grid. The camera moves in whole buffer pixels and the remainder is applied in the
last pass, so it scrolls smoothly without shimmering. On top: moonlight with hard shadows, moonbeams
through the mist, lamp and torch light, fog, rain streaks and splashes, lightning, bloom on the lamps,
a cool colour grade, a vignette and a light ordered dither. Characters are small articulated low-poly
figures posed by code (cloaks with spring physics), so at 30 px tall they read like pixel sprites but
every swing and fall is free. Anything standing between the camera and the hero is dithered away.

## The story

For a hundred nights the great bell of St. Orrin has been silent; the rain has not stopped and neither
has the night. The people still walking the streets have no voices any more, only red eyes: the Hushed.
Carmine, last of the bell-wardens, comes home to ring the bell.

| District | Place | Boss | Gift |
|---|---|---|---|
| I | Gallows Gate | The Gaoler | Crimson Wave (a fully charged heavy sends a wave) |
| II | Lantern Row | Mother Tallow | Twin Step (dash twice) |
| III | The Drowned Nave | The Drowned Deacon | Riposte (a parry heals) |
| IV | The Belfry | Saint Silence | the dawn |

## Playing

| | Keyboard / mouse | Touch | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | left thumb (floating stick) | left stick |
| Attack (3-hit combo) | J / left click | ATK | X |
| Heavy (hold to charge) | K / right click | HVY | Y |
| Dash (invulnerable) | Space / Shift | DASH | A |
| Parry | L / F | PRY | B |
| Tonic | R | TON | LB |
| Requiem (when the red gauge is full) | Q | ART | RB |
| Use (lamps, chests) | E | USE | |
| Pause | Esc / P | II | Start |

- Foes telegraph every blow with red shapes on the stones. Dash through a blow at the last moment for
  a **perfect dodge** (time slows); **parry** just before it lands to break the attacker.
- Every hit wears down a foe's poise; a broken foe reels and can be **finished** (attack while it reels).
- Common foes flinch a few times, then fight through your blows. Bosses have phases.
- **Lamps** are checkpoints: lighting or resting at one heals, refills tonics and keeps your place.
  Spend **embers** (dropped by foes, found in chests) at a lamp on Vitality, Blade and Tonic.
- Dying costs nothing but the fight in progress: you wake at the last lamp; cleared fights stay cleared.
- Progress saves in the browser. Settings: sound, music volume, screen shake.

## Code

| File | Role |
|---|---|
| `index.html` | page, import map for three.js, the two canvases |
| `vendor/` | three.js r170 (MIT) and its BufferGeometryUtils |
| `js/main.js` | boot and the frame loop, dynamic resolution |
| `js/engine/renderer.js` | the pixel pipeline: low-res render target, snapped iso camera, bloom, grade, dither, fades |
| `js/engine/textures.js` | procedural pixel textures (cobbles, paving, brick, ashlar, slate, wood, windows, rose window, flame) |
| `js/engine/materials.js` | world-mapped materials and the see-through cut around the hero |
| `js/engine/atmos.js` | fog, moon and fill light, moonbeams, the point-light pool, rain, splashes, lightning |
| `js/engine/fx.js` | sword trails, pixel particles, blood, telegraphs, hazards, projectiles, afterimages |
| `js/engine/ui.js` | the 5x7 pixel font, HUD, menus, cards, touch buttons |
| `js/engine/input.js` | keyboard, mouse, gamepad and touch, screen-relative movement |
| `js/engine/audio.js` | synthesised rain, thunder, steel, bells, organ, choir and drums |
| `js/world/kit.js` | the set kit (walls, houses, chapel, iron fences and gates, lamps, props) |
| `js/world/level.js`, `js/world/levels/*.js` | the districts (layout, lamps, foes, locked-gate fights, boss, exit) |
| `js/world/props/*.js` | props made for one district |
| `js/actors/rig.js`, `anims.js`, `view.js` | articulated characters, their poses and clips, and the sim-to-rig view |
| `js/game/sim.js` | the fight simulation: pure, fixed 60 Hz, deterministic; runs in Node |
| `js/game/defs.js` | hero moves, foes, bosses (pure data) |
| `js/game/ai.js` | foe and boss behaviour (pure) |
| `js/game/bot.js`, `autoplay.js` | an autoplayer for tests |
| `js/game/story.js` | the opening, the districts, the gifts, the ending |
| `js/game/game.js` | states, levels, encounters, bosses, lamps, upgrades, saves, events to effects |

## Tests

From the repository root, with a static server on port 8790 (`python3 -m http.server 8790`):

```sh
node bellmourn/test/no-assets.mjs                                           # no pre-made assets anywhere in the game
node bellmourn/test/sim-test.mjs 12                                         # balance and invariants in Node
NODE_PATH=$(npm root -g) node bellmourn/test/level-check.js gate            # reachability of every district (gate, market, nave, belfry)
NODE_PATH=$(npm root -g) node bellmourn/test/play.js /tmp/bm-play            # title -> story -> first fight, screenshots
NODE_PATH=$(npm root -g) node bellmourn/test/poses.js /tmp/bm-poses          # every clip, zoomed
NODE_PATH=$(npm root -g) node bellmourn/test/autoplay-browser.js /tmp/bm-auto 40 3   # plays the whole game on autoplay
NODE_PATH=$(npm root -g) node bellmourn/test/shot.js /tmp/x.png "level=nave&boss=1&god=1"   # any spot
```

Debug URL parameters: `?level=<id>` starts in a district, `&lamp=<id>` at a lamp, `&boss=1` in the boss
arena, `&god=1` makes the hero unkillable, `?auto=1&speed=3` plays itself.
