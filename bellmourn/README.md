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
The last of the bell-wardens come home to ring the bell.

Between the districts the wardens rest at **the Haven**, a ruined lamplighters' shrine whose fire was lit
from the great bell's own forge, so the night cannot touch it. The embers the wardens carry there are
freed voices: striking a Hushed down releases the voice asleep in it. The story, the cast and the endings
are planned in `docs/STORY_BIBLE.md` (a proposal for the author).

**Cutscenes** play in the game world with the real characters: letterbox bars, each line under the
speaker's name in their colour (a tap, a click or a key moves on), a SKIP button top right (skipping never
skips a reward, a story flag or a choice). They tell the prologue on the Old Road (the crow-masked warden
at the gate, the three wardens meeting), Sister Ash at the first Haven, each recruitment (Kestrel after the
Gaoler, Sister Ash after Mother Tallow, Hollis after the Harbormaster, Mother Wren after the Deacon), Bram
and the Bellfounder, the Pale Regent's revelation, Saint Silence before his fight, the ringing of the great
bell (you strike it three times with the attack; the dawn comes, the Hushed lift their heads, Vesper finds
her brother Tam; then the bell cracks), the ends and openings of the acts, the Hollow Archon's revelation,
and the Voice in the Bell's choice before the last fight: RING, SILENCE, or (with all seven wardens and
every Echo) SING. Each choice has its own ending (the Dawn, Silence, the New Song), then the credits, then
New Game+ (bosses return Ascended). Every boss speaks a line as its fight begins and as it falls.

| | District | Boss |
|---|---|---|
| — | The Old Road (training) | — |
| I | Gallows Gate | The Gaoler |
| II | Lantern Row | Mother Tallow |
| III | Mirewater Docks | The Harbormaster |
| IV | The Drowned Nave | The Drowned Deacon |
| V | The Undercroft | The Ossuary Knight |
| VI | The Bell Foundry | The Bellfounder |
| VII | The Crown Heights | The Pale Regent |
| VIII | The Belfry | Saint Silence |

The bell rings: the end of Act I. Then **Act II, beyond the walls** (the names are proposals): the Haven
opens on the lands the silence came from.

| | Region | Weather and light | Boss |
|---|---|---|---|
| IX | The Frostmarch | falling snow, a cold blue moon; crags, firs, the frozen river and its waterfall, a bell-tower locked in ice, the giant's cirque under the glacier | The Hoarfrost King |
| X | The Ash Dunes | a hot wind full of sand, a low amber moon; rock-cut tombs, the sunken colonnade, half-buried colossi and guardian beasts, the sinking bowl | Ashmaw |
| XI | The Catacombs | no sky, dust in the torchlight; walls of loculi and skulls, cages and chains in the dark, the chasm bridge, the hall of sarcophagi, green witchfire | Abbot Morrow |
| XII | The Abyss | embers rising, ash falling, the dark breathing red; basalt islands over the void, rivers of fire, ritual circles, chained altars, obsidian spires, a wheel of eyes overhead | The Hollow Archon |

After the Archon falls, the Wheel above the Abyss starts to turn: Act III, the Wheel (the Weeping Marsh,
the Clockwork Spire, the Empyrean), and the final choice. Act II's fights lock with their own barriers (ice
that bursts from the snow, sandstone slabs, portcullises, teeth of black glass) instead of iron gates.

## The wardens

| Warden | Weapon | Attack | Skills | Ultimate |
|---|---|---|---|---|
| Carmine, the Bell-Warden | blade | 3-hit combo | Crimson Wave, Cutting Rush, Whirl of Thorns | Requiem |
| Vesper, the Night Huntress | crossbow | hold to shoot | Volley, Smoke Step, Snare Trap | Rain of Bolts |
| Bram, the Bellbreaker | hammer | 2-hit smash, armour | Shockwave, Iron Charge, Bell Ward | Toll of Ruin |
| Sister Ash, the Lamplighter (joins after Lantern Row) | lantern staff | hold to cast fire | Flame Pillar, Lantern Ward, Will-o'-Wisps | Sunburst |

The skills have no buttons: the two in your slots fire from your attack once they are ready (their
badges glow). The third skill unlocks at level 4 and can be swapped into a slot at the Haven. Every
warden levels on their own.

## Playing

| | Keyboard / mouse | Touch | Gamepad |
|---|---|---|---|
| Move | WASD / arrows | left thumb (floating stick) | left stick |
| Attack (hold to keep shooting; fires a ready skill) | J / left click | ATK | X |
| Dash (invulnerable, recharges) | Space / Shift | DASH | A |
| Ultimate (when the red gauge is full) | Q / U | ULT | RB |
| Tonic | R / H | TON | LB |
| Open a chest | E | USE (shows by a chest) | Back |
| Pause | Esc / P | II | Start |
| Haven menu: section, row, do it, ONWARD | Q E or left/right, up/down, Enter, Esc Esc | tap a section, tap a row, tap the button under the list, tap ONWARD (drag the list to scroll) | LB RB, up/down, A, B B |

- Foes telegraph every blow with red shapes on the stones. Dash through a blow at the last moment for a
  **perfect dodge** (time slows). There is no parry: read, dash, punish.
- **Skills fire from the attack.** When a skill is off cooldown (its badge glows; on touch, a gold bar
  under ATK) and would help right now (foes in its reach, or you are hurt for a ward or a heal), your
  next attack casts it instead of a plain blow; slot 1 first, then slot 2. Settings → ABILITIES: AUTO
  also casts them on their own in a fight. The ultimate stays on its own button.
- Every hit wears down a foe's poise; a foe whose guard breaks reels for a moment and takes more damage.
  There are no finishers.
- **Tonics**: drinking one shows the flask going up, green-gold motes rising round the warden, a ring at
  the feet and the health landing (the bar's new part flashes green, "+amount" over the head).
- Burn, bleed, poison, frost, stun and root. A dash tears you free of a web or a curse. **Elite** foes glow with an affix (burning, frozen,
  shielded, hasted, vampiric), hit harder and drop more.
- **Lamps** in a district are checkpoints and light themselves: walk within about 3.5 m of one while the
  area is clear (no foe hunting you within 12 m, no locked fight or boss under way) and it flares up with
  embers, the lamp's sound and LAMP LIT: your place is kept, your health, tonics and revives come back and
  the game saves. Nothing to press and no kneeling: you keep moving. A lit lamp restores you again when you
  come back within reach out of a fight, once per visit (it re-arms after you have walked 6 m away).
- **The Haven** comes between the districts: walk through a district's exit after its boss (or the end
  of the Old Road) and the warden walks in out of the rain and kneels by the fire, which stays in view
  between the menu's two halves. On the left a rail of five big sections: WARDEN (switch warden), SKILLS
  (five ranks per skill, swap the third into slot 2; a gold badge counts unspent points), GEAR (temper and
  change weapons, each warden has five; relics, fourteen, two slots and a third after District IV),
  MERCHANT (stocked for the district ahead), MAP (any district already reached) and BESTIARY (every foe met,
  locked silhouettes for the rest, and where each first appears; a foe slain for the first time says NEW IN THE BESTIARY). On the right the open
  section: a few large rows, each with its name, a second line saying what it is and, on the right, what
  choosing it costs or its state (1 PT, 288 E, IN HAND, WORN, LOCKED). One tap selects a row; the button
  under the list says what it will do and for how much (LEARN 1 PT, TEMPER 40 E, BUY 288 E, EQUIP, SET
  OUT), or why it cannot (NEED 288 E, NO SKILL POINTS), and does it. Every choice is answered by the
  fire flaring, embers and a bell; a new weapon appears in the warden's hand, a new warden takes the
  kneeling place. ONWARD (bottom right, always there): the warden rises and walks out into the next
  district. The first visit has a short guide in the panel that points at the button and at ONWARD. The pause menu in a district offers RETURN TO THE HAVEN (what you
  cleared stays cleared), and CONTINUE on the title resumes in the Haven if you saved there.
- Kills give embers and experience; chests (E / USE) and bosses give weapons, relics and tonic flasks.
- Dying costs nothing but the fight in progress: you wake at the last lamp; cleared fights stay cleared.
- Progress saves in the browser. Settings: sound, music volume, screen shake, pixel size, BUTTONS (touch
  button size: small, medium, large) and ABILITIES (ON ATTACK or AUTO); tap a row's right part to step a
  value up, its left part to step it down (keys: left and right).
- **Menus** share one look: framed buttons at least 18 buffer pixels tall (about 40 points on a phone),
  kept clear of the notch and the home bar. A menu tap counts when the finger lifts without moving; a
  drag scrolls a list. The select screen lists the wardens on the left (Sister Ash shows a lock until
  Lantern Row), the chosen warden stands in the middle, and their card on the right gives the title,
  blurb, ratings, skills and ultimate with a CHOOSE button, then THE TRAINING ROAD or SKIP TO THE CITY.

## Code

| File | Role |
|---|---|
| `index.html` | page and the two canvases (modules import three.js by relative path, so no import map is needed; `node bellmourn/tools/fix-imports.mjs` rewrites any bare `'three'` import) |
| `vendor/` | three.js r170 (MIT) and its BufferGeometryUtils |
| `js/main.js` | boot and the frame loop, dynamic resolution |
| `js/engine/renderer.js` | the pixel pipeline: low-res render target, snapped iso camera, bloom, grade, dither, fades |
| `js/engine/textures.js` | procedural pixel textures (cobbles, paving, brick, ashlar, slate, wood, windows, rose window, flame; snow, ice, sand, sandstone, crag, catacomb stone, tomb floor, basalt, obsidian, hell brick, lava, ritual sigils, eyes) |
| `js/engine/materials.js` | world-mapped materials and the see-through cut around the hero |
| `js/engine/atmos.js` | fog, moon and fill light, moonbeams, the point-light pool, rain, splashes, lightning; Act II's weather (snow, sand, embers and ash, dust), a grade and a pulse of the sky light per place |
| `js/engine/fx.js` | sword trails, pixel particles, blood, telegraphs, hazards, projectiles, afterimages |
| `js/engine/ui.js` | the 5x7 pixel font, HUD, menus, cards, touch buttons |
| `js/engine/input.js` | keyboard, mouse, gamepad and touch, screen-relative movement |
| `js/engine/audio.js` | synthesised rain, thunder, steel, bells, organ, choir and drums |
| `js/world/kit.js` | the set kit (walls, houses, chapel, iron fences and gates, lamps, props) |
| `js/world/level.js`, `js/world/levels/*.js` | the districts (layout, lamps, foes, locked-gate fights, boss, exit) |
| `js/world/props/*.js` | props made for one district or region |
| `js/world/kit2.js` | the Act II kit: world-mapped snow, ice, sand, sandstone, catacomb stone, basalt and obsidian, the barriers that lock Act II's fights, boulders, mounds, firs, braziers, glows, chains |
| `js/actors/rig.js`, `anims.js`, `view.js` | articulated characters, their poses and clips, and the sim-to-rig view |
| `js/game/sim.js` | the fight simulation: pure, fixed 60 Hz, deterministic; runs in Node (hero kits, abilities, ultimates, statuses, elites, relic effects) |
| `js/game/heroes.js` | the four wardens, abilities, ultimates, weapons, relics, elite affixes, growth curves (pure data) |
| `js/game/progress.js` | experience, skill ranks, loot, boss rewards, the merchant (pure functions on the save) |
| `js/game/haven.js`, `js/world/haven.js` | the Haven between districts: the scene (walk in, kneel, the camera closing in, the fire answering each choice, ONWARD) and its set (the ruined shrine, the brazier, the statue, candles, moths, the roof that stops the rain) |
| `js/game/lampmenu.js`, `js/game/tutorial.js` | the Haven's menu (the section rail, the open section's rows, the button that does the selected row, ONWARD), beside the kneeling warden; the guided training on the Old Road |
| `js/game/units.js`, `js/game/bosses2.js`, `js/actors/beasts.js` | the newer foes and their behaviour, the four newer bosses, bodies that are not people |
| `js/game/defs.js` | the first foes and bosses (pure data) |
| `js/game/ai.js` | foe and boss behaviour (pure) |
| `js/game/bot.js`, `autoplay.js` | an autoplayer for tests |
| `js/game/story.js` | the opening cards, the districts and regions of the three acts, the tips, the credits |
| `js/game/cutscene.js`, `js/game/scenes/*.js` | the cutscene player (camera, actors, lines, choices, the bell's strikes, SKIP) and the scene scripts (`index.js` says which plays when; `lines.js` holds every boss's two lines; `cast.js` the speakers' colours and stand-in looks) |
| `js/game/game.js` | states, levels, encounters, bosses, the self-lighting checkpoint lamps, the Haven state, saves, settings, the title, select, pause, settings and controls screens, events to effects |

## Tests

From the repository root, with a static server on port 8790 (`python3 -m http.server 8790`):

```sh
node bellmourn/test/no-assets.mjs                                           # no pre-made assets anywhere in the game
HERO=warden node bellmourn/test/sim-test.mjs 6                              # balance and invariants in Node (any warden)
NODE_PATH=$(npm root -g) node bellmourn/test/level-check.js gate            # reachability, gates, lamps and chests of one district (any id)
NODE_PATH=$(npm root -g) node bellmourn/test/modules.js                     # every module imports in the browser (catches syntax errors)
NODE_PATH=$(npm root -g) node bellmourn/test/play.js /tmp/bm-play            # title -> story -> first fight -> the lamp lights by walking up, restores once per visit
NODE_PATH=$(npm root -g) node bellmourn/test/poses.js /tmp/bm-poses          # every clip, zoomed
NODE_PATH=$(npm root -g) node bellmourn/test/tonic.js /tmp/bm-tonic warden    # a tonic in a district: the flask, the motes, the heal; effects cleaned up
NODE_PATH=$(npm root -g) node bellmourn/test/phone.js /tmp/bm-phone          # iPhone-sized touch: select by taps, stick, ATK, the layout at every button size, a tonic tapped, the Haven by taps
NODE_PATH=$(npm root -g) node bellmourn/test/autoplay-browser.js /tmp/bm-auto 40 3   # plays the whole game on autoplay
NODE_PATH=$(npm root -g) node bellmourn/test/shot.js /tmp/x.png "level=nave&boss=1&god=1"   # any spot
NODE_PATH=$(npm root -g) node bellmourn/test/scenes-test.js /tmp/bm-scenes [id ...]   # every cutscene on a phone-sized screen, a frame from each
```

Debug URL parameters: `?level=<id>` starts in a district (prologue, gate, market, docks, nave,
undercroft, foundry, heights, belfry, frostmarch, ashdunes, catacombs, abyss), `&lamp=<id>` at a lamp, `&boss=1` in the boss arena, `&hero=<id>`
as a given warden, `&god=1` makes the hero unkillable, `?auto=1&speed=3` plays itself (through the
Haven too: it spends, equips and goes ONWARD). `?level=haven&next=<id>` opens the Haven leading to a
district (`&resume=1` already kneeling, `&intro=1` with the first-visit guide). `?scene=<id>` plays one
cutscene on its stage (`&fast=1` lets it run itself; ids in `js/game/scenes/index.js`).
