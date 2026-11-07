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

## The night

Vesper, a knight in a red hood, climbs through six hours of one night to finish the cut. Lys, a
witch with a flower in her hair, lends her flower to the Last Ditch Effort.

| Hour | Place | Boss |
|---|---|---|
| Dusk | The Black Gate | The Gatewarden |
| The First Hour | Cloister of Frost | The Hollow Twins |
| The Second Hour | The Umbral Stair | The Umbral |
| The Third Hour | The Ashen Waste | The Hunger |
| The Fourth Hour | The Wind's Throat | The Pale Wing |
| The Last Hour | The Moon's Shadow | The First Cut |

Each hour is a short scene (title cards, lines floating beside the speaker), waves of minions, then
the boss with a name card and a second phase at half health. After each won hour you keep one of
three boons. Losing costs nothing: retry the hour with your boons.

## Combat

Fights are seen from a helicopter camera: high above and a little to the side at one fixed angle,
over a round ring floating in the night. Move freely; foes surround you and keep turning toward you
while they wind up, so stepping aside makes them miss.

- **PC**: WASD to move, the mouse aims. **Left click** cuts (slash, slash, kick, cut; a fifth cut
  with the Fifth Cut boon), **right click** is the heavy, a spinning cut all around. **Space**
  dashes, **Q** or Shift parries, **E** plays the moon art. Keys only: J cut, K heavy, L parry.
  Touch: a stick, CUT, HEAVY, DASH, PARRY and MOON buttons.
- **Danger on the floor**: during a wind-up the floor shows where the blow will land: the circle
  of a slam, the strip of a lunge, the cone of a swing. A ring also closes over the foe's head.
  **White** can be parried; a parry staggers the attacker and reflects bolts. **Red** can only be
  dashed out of or through. Dash at the last moment for a perfect dodge; cut during or right after
  a dash for a lunging dash-cut.
- **Impact frames**: parries, finishers that kill, boss poise breaks, boss landings and boss deaths
  flash white with black silhouettes, then black with white ones, as in the moon arts.
- **Areas**: each hour is a chain of arenas. Clear one and the way on opens at the back of the ring
  (a gate of light, a stairway into the sky, or a rift); walk into it to cross to the next arena.
  Foes rise out of rifts in the floor; bosses drop from the sky onto a marked spot.
- **Moon**: the gauge fills from cuts, parries, perfect dodges and taking hits. Full, it plays the
  **Red Moon** (3.4 s). At 30 % health or less it plays the **Last Ditch Effort** instead (6.4 s,
  more than twice the damage, heals 30 %). Tap or any key skips to the final frame.
- Bosses have poise (the gold line under their bar): break it to knock them down. At half health
  they enter a second phase, wrapped in a dark aura.
- Esc pauses (restart the hour, auto battle, quit).

## Story scenes

Each hour opens with an anime sequence drawn like the moon arts, on the pixel buffer: glitch title
cards, reveals against the moon, grey close-ups with the red eye, speed lines, clashes that land on
impact frames, and the first cut across the moon in the prologue. Shots play on their own; a tap
moves on, Esc skips the scene. The shot lists live in `js/story.js`, the shots in `js/scene.js`.

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
