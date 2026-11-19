# BLACKLINE: FRONTLINES

Working title. A side-on, real-time tactical battle game in thin off-white line art on black, with
rain, wind, lightning and muted red as the only colour. You command squads, vehicles and support
across a long battlefield; you never steer a single soldier.

It is separate from everything else in this repository: no shared code, names or rules, and it
reads no files from `assets/`. Every visual is drawn by code; every sound is synthesised.

Design, the reference analysis and the roadmap: [DESIGN.md](DESIGN.md).

## Play

Open `blackline/index.html` in a browser (no build step), or serve the folder. Landscape on phones.

| | Touch | Mouse / keyboard |
|---|---|---|
| Deploy | tap a card, tap near a beam | `1`–`8`, click the field |
| Select | tap a unit; hold then drag for a box; ALL | click; shift-drag box; shift-click adds; `Tab` all |
| Order | tap ground (move) or a seen enemy (attack) | left click, or right click without changing selection |
| Modes | MOVE / ATTACK (attack-move) / HOLD / RETREAT | `M`, `G`, `H`, `R` |
| Camera | drag, pinch, tap the top strip; FOLLOW or double-tap a unit | drag, wheel, arrows / `WASD`, `Q`/`E`, `F` |
| Pause | ‖ top right | `Space`, `P`, `Esc` |
| Action camera | eye button, top right | `C` |
| Skip a cinematic | tap | `Space`, `Enter`, `Esc` |

## Campaign: Operation Black Rain

Five missions on the Black Rain front. Each one opens with a briefing cinematic (title card,
typed lines over a flyover of the ground, an introduction card for each new unit, then H-hour),
teaches through short hints that point at what to tap, and ends on a closing shot and a debrief.

| # | Mission | Objective | New | Victory unlocks |
|---|---|---|---|---|
| 01 | Landfall | go in by rope, take sector A | rifle squad | machine-gun team |
| 02 | The Gunline | hold A against four waves (3:30) | machine-gun team | scouts, artillery |
| 03 | Eyes on the Ridge | take B from dug-in gunners | scouts, artillery | carrier, tank |
| 04 | Iron in the Rain | meet their armour, take C | carrier, tank | helicopter, rope drop |
| 05 | Black Rain | everything; break their line | helicopter, rope drop | — |

Up to three stars per mission (win, losses under a limit, time under par); stars give a rank.
Skirmish opens after mission 01 and offers the cards unlocked so far. Progress is saved in the
browser (`localStorage`); if storage is blocked the game plays without saving.

During battles: illumination flares go up over fights and light the ground; a vehicle destroyed
on screen gets a moment of slow motion; the eye button (or `C`) switches on the action camera,
which follows your fights by itself until you pan.

## What is in this slice

- **Black Rain**, a 4,800-unit night battlefield in a storm: ridgelines, trenches, ruins, a radio
  mast, a broken mill, telegraph wire, barbed wire, rocks and dead trees; three sectors (A, B, C).
- **Units:** rifle squad (6, one AT rocket), machine-gun team (sets up to fire), scout team (long
  sight, marksman rifles), armoured carrier (autocannon), battle tank (main gun and coax; can't hit
  aircraft), attack helicopter (rocket pods and chin gun). **Support:** artillery (warned in red,
  hits both sides) and air insertion (a rifle squad by rope from a transport helicopter).
- **Combat:** every shot is a projectile; line of sight over real terrain; cover (trenches, rocks,
  ruins, wrecks); suppression (crouch, prone, pinned); armour classes; explosions with craters,
  debris and smoke; wrecks that burn and become cover; helicopters that fall before they die.
- **Sight:** each side only sees and targets what its units can see; firing reveals the shooter.
- **Economy and victory:** RP income from held sectors; deploy forward at held sectors (infantry);
  retreat to base to refill and repair; holding more sectors drains the enemy's line, losses too.
- **Enemy AI:** buys against what it has seen, garrisons sectors, defends, retreats the wounded,
  shells clusters, drops squads by air. Two difficulties.
- **Presentation:** stippled terrain, dithered cloud bands, parallax ranges, a storm funnel, rain
  that slants with gusts, lightning that lights the hills, wind loops, grain and vignette; a live
  AI battle behind the title menu with a drifting camera.

## Code

| File | Role |
|---|---|
| `js/util.js` | seeded RNG, noise, maths |
| `js/data.js` | unit, weapon, armour and support tables; rules |
| `js/terrain.js` | height field, cover, trenches, structures, sectors, line of sight, craters |
| `js/sim.js` | the fight: units, orders, sight, targeting, projectiles, damage, sectors, economy |
| `js/ai.js` | the computer commander (modes: push, assault, defend) |
| `js/campaign.js` | missions, waves, objectives, hints, stars, unlocks, saved progress |
| `js/render/core.js` | canvas, camera, line helpers, grain, vignette |
| `js/render/world.js` | sky, clouds, far hills, funnel, terrain, structures, sector marks, rain, lightning |
| `js/render/units.js` | soldiers, vehicles, helicopters, wrecks, markers, selection |
| `js/render/fx.js` | flashes, tracers, explosions, debris, smoke, flares; event → effect and sound |
| `js/render/cinema.js` | letterbox, title cards, briefing flyovers, unit dossiers, H-hour, closing shots |
| `js/audio.js` | synthesised sound |
| `js/hud.js` | the HUD, title, pause and end screens (canvas-drawn, hit regions) |
| `js/main.js` | loop, screens, input, the title camera |

`util`, `data`, `terrain`, `sim`, `ai` and `campaign` touch no DOM and run in Node.

## Tests

```sh
node test/sim-test.js 30                                         # rules + 30 AI-vs-AI matches
node test/campaign-test.js 6                                     # mission data, progress/unlocks, each mission played by an AI on our side
NODE_PATH=$(npm root -g) node test/flow.js /tmp/bl-flow [--phone]   # title → campaign → briefing → play → debrief → mission 02
NODE_PATH=$(npm root -g) node test/browser.js /tmp/bl-shots      # plays through the real input path, screenshots, console errors
NODE_PATH=$(npm root -g) node test/browser.js /tmp/bl-shots --phone   # same, iPhone 13 landscape emulation
NODE_PATH=$(npm root -g) node test/gallery.js /tmp/bl-gallery    # close-ups of every unit, both sides, and the rope drop
```

Not yet tested on a real phone; touch was exercised through Playwright's emulation only.
