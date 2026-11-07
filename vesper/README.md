# VESPER

*Seven hundred years ago a swordsman cut the moon. It has bled ever since.*

A side-on pixel action game built on this repository's packed assets (the Character Creator cast,
the effect and tile atlases, the battle track and the synthesised fight sounds). Its centrepiece is
the **Last Ditch Effort**, a moon art played as a cinematic in the style of the pixel "super move"
clips: snap to black, a red eye under the visor, the title over a falling blade, the blade planted
under a pale moon, the draw, a flower cut-in, a silhouette assault across a red moon, a red frame.

Separate from Tower of Wishes and Emberfall: its own story, cast names and combat. It only reads
from `../assets/`.

Play: serve the repository root and open `vesper/index.html` (for example
`python3 -m http.server` then <http://localhost:8000/vesper/>). Landscape; keyboard or touch.
*Theatre* on the title screen plays the Last Ditch Effort on demand.

## Heroes

Pick a hero on **New night** or under **Heroes** on the title screen. Each has a combo (left click),
a heavy (right click), two skills on cooldown (R and F) and an ultimate with its own cinematic (E).

| Hero | Style | Skills | Ultimate |
|---|---|---|---|
| Vesper, the Moonblade | Sword: combos, parries | Crescent Wave (a piercing wave), Phantom Step (blink behind a foe and cut) | Red Moon; the Last Ditch Effort at low health |
| Lys, the Bloom Witch | Spells from range: bolts, a frost nova that slows | Blight Bloom (a poison zone), Petal Blink (teleport, petals burst where she was) | Thousand Petals |
| Kestrel, the Stormlancer | Spear: long reach, stuns, a lunging heavy | Chain Lightning (jumps through five foes), Thunder Drop (leap and slam with lightning) | Heaven's Spear |
| Wisp, the Shadow | Daggers: fast, a fan of knives | Shadow Clones (two clones fight for 6 s), Smoke Veil (stuns around her, foes lose her) | Hundred Cuts |

At low health every ultimate hits as hard as the Last Ditch Effort and heals 30 %.

## The night

## Combat

Fights are seen from a helicopter camera: high above and a little to the side at one fixed angle,
over a round ring floating in the night. Move freely; foes surround you and keep turning toward you
while they wind up, so stepping aside makes them miss.

- **PC**: WASD to move, the mouse aims. **Left click** attacks (the hero's combo; a fifth hit with
  the Fifth Cut boon), **right click** is the heavy, **R** and **F** the skills, **Space** dashes,
  **Q** or Shift parries, **E** plays the ultimate. Keys only: J attack, K heavy, L parry, 1 and 2
  skills. Touch: a stick, attack, heavy, dash, parry, two skill buttons and the ultimate.
- **Danger on the floor**: during a wind-up the floor shows where the blow will land: the circle
  of a slam, the strip of a lunge, the cone of a swing. A ring also closes over the foe's head.
  **White** can be parried; a parry staggers the attacker and reflects bolts. **Red** can only be
  dashed out of or through. Dash at the last moment for a perfect dodge; cut during or right after
  a dash for a lunging dash-cut.
- **Launches and walls**: finishers, the heavy spin and dash-cuts throw minions into the air; hits
  keep them up (a juggle) until they crash down. Anything thrown hard into an arena's edge bounces
  off it and takes a knock. Bodies fly back when they die.
- **Facing**: with the mouse, Vesper faces where you aim and strafes or backpedals as he moves; foes
  strafe as they circle; bosses taunt as they land and as their second phase begins.
- **Impact frames**: parries, finishers that kill, boss poise breaks, boss landings and boss deaths
  flash white with black silhouettes, then black with white ones, as in the moon arts.
- **Arenas**: each hour is a chain of two or three arenas of different shapes: a round ring, a
  square courtyard, a long bridge, a ring around a bottomless pit, a crossroads. Foes arrive by the
  arena's rules: rising out of rifts in the floor, dropping from the sky onto a marked spot, or
  running in through glowing side gates. Bosses drop in (the Umbral rises from a rift).
- **The way on**: clearing an arena raises a door at its far end while the camera turns to it: a
  gate whose runes light one by one before its doors split open, a stairway of light set down step
  by step, or a tear in the air that splits into a vortex; each throws a pillar of light into the
  sky. The doors burst open on an impact frame with debris flung out; god rays fan from the door and
  energy spirals into it while it stands open. Walk in: the view rushes in, you fall through a red
  and white warp tunnel, and arrive through a door that blazes open and then crumbles to dust, with
  the arena's name.
- **Arena art**: each arena is a floating stone platform on cliffs, with flagstones, cracks, inlaid
  runes and marks for each hour (moss, snow, gold inlay, ash, wind streaks, blood pools), brazier
  light on the floor, drifting fog, and props: pillars, braziers, banners, knight statues, broken
  walls, lantern posts, trees, crystals, rock needles.
- **Readability**: a red ring under the knight, white rings under foes; pack effects only on the
  blows that matter (finishers, dash-cuts, spins, parries, breaks, deaths); damage numbers only for
  heavy blows; impact frames only for boss moments.
- **Moon**: the gauge fills from cuts, parries, perfect dodges and taking hits. Full, it plays the
  **Red Moon** (3.4 s). At 30 % health or less it plays the **Last Ditch Effort** instead (6.4 s,
  more than twice the damage, heals 30 %). Tap or any key skips to the final frame.
- Bosses have poise (the gold line under their bar): break it to knock them down. At half health
  they enter a second phase, wrapped in a dark aura. Every few seconds a boss throws a **signature
  move**, announced by an anime title card: Earthsplitter (rings of rock bursting outward), Call of
  the Gate (raiders), Ice Lance Rain, Frost Bloom, Shadow Court (clones of the Umbral), Nightfall,
  Blight (poison raining down), Devour, Gale (tornadoes that chase you), Featherstorm, Crescent (a
  fan of moon waves), Moonfall, Mirror of the First.
- **Foes**: skeleton raiders and spearmen, archers who keep their distance, hexers who curse the
  ground and call more raiders, armored golems that throw rocks, pyre priests whose fireballs leave
  burning ground, poachers with fans of darts, plus the ghouls, knives and gilded bones.
- **Danger on the floor**: strikes show a filling circle before they land; poison and fire zones
  tick; tornadoes chase. Statuses: slow (frost, poison), stun (lightning, smoke).
- Esc pauses (restart the hour, auto battle, quit).

## Story scenes

No dialogue. Each hour opens with a short wordless action intro drawn like the moon arts, on the
pixel buffer: a glitch title card, the boss revealed against the moon, a blade flash, and a clash
that lands on impact frames (about 8 to 10 seconds; the prologue adds the first cut across the moon).
The ending turns the moon white. A tap moves on, Esc skips. Shot lists in `js/story.js`, shots in
`js/scene.js`.

## Look

The game is drawn at the screen's full resolution. Fights: a glossy ring with the red moon in its
floor and a line of red light at its rim, props around it per hour (pillars, braziers, dead trees,
ice crystals, rock needles), crisp pixel characters turned to the camera with their reflections,
effects drawn in code. Title, menus and scenes are shot side-on with layered silhouettes under the
moon. A slim HUD and menus as real buttons (Chakra Petch and Barlow from Google Fonts). The moon arts keep their pixel
style: they are drawn on a 180 px buffer laid over the game and scaled up without smoothing.

## Code

| File | Role |
|---|---|
| `js/data.js` | Hero, Lys, foes and their attacks, stages, boons. Pure |
| `js/story.js` | The story scenes as shot lists, the bosses' phase lines, the ending. Pure |
| `js/sim.js` | The fight simulation on a round 2D ring (cones and circles, waves, parry, dodge, dash-cut, poise, the moon arts) and a bot. Pure, runs in Node |
| `js/assets.js` | Loads and draws the cast (plain, flashed, silhouette, hard grey), effects and tiles |
| `js/view.js` | The full-resolution game: the helicopter view for fights (projection, ring, props, floor danger, fighters, effects), the side-on stage for menus and scenes, HUD, touch controls, dialogue, boss card |
| `js/px.js`, `js/cine.js`, `js/scene.js` | The pixel buffer, the moon arts and the story scenes drawn on it |
| `js/ui.js` | Menus as buttons: title, settings, credits, boon pick, defeat, pause |
| `js/audio.js`, `js/main.js` | Sound; the loop, input, saves and the flow |

## Tests

```sh
node vesper/test/data-test.js        # every set, clip, effect and tile named exists; scenes are sound
node vesper/test/sim-test.js 20      # every stage with a bot at three skills: win rates, no NaN, no timeouts
NODE_PATH=$(npm root -g) node vesper/test/browser.js /tmp/vesper-shots   # needs the repo served on :8765
```

Balance with the bot (20 runs each; "boons" is the set a player would hold by then):

| Hour | Mid skill, no boons | Mid skill, boons |
|---|---|---|
| The Black Gate, Cloister of Frost | 100 % | 100 % |
| The Umbral Stair | 85 % | 100 % |
| The Ashen Waste | 60 % | 90 % |
| The Wind's Throat | 70 % | 100 % |
| The Moon's Shadow | 15 % | 75 % |
