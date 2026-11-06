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

- **Move** WASD or arrows. **Cut** J: a three-hit combo, auto-aimed at the nearest foe.
- **Parry** K: a short window. A white glint on a foe means the blow can be parried; a parry
  staggers the attacker and reflects bolts.
- **Dash** Space: i-frames. A red glint means the blow cannot be parried, only dodged. Dashing at
  the last moment is a perfect dodge (slow motion).
- **Moon** L: the gauge fills from cuts, parries, perfect dodges and taking hits. Full, it plays the
  **Red Moon** (3.4 s). At 30 % health or less it plays the **Last Ditch Effort** instead (6.4 s,
  more than twice the damage, heals 30 %). Tap or any key skips to the final frame.
- Bosses have poise: break it to knock them down for extra damage.
- Esc pauses (restart the hour, auto battle, quit). Touch: a stick on the left, buttons on the right.

## Code

| File | Role |
|---|---|
| `js/data.js` | Hero, Lys, foes and their attacks, stages, boons. Pure |
| `js/story.js` | The scenes, the bosses' phase lines, the ending. Pure |
| `js/sim.js` | The fight simulation (waves, parry, dodge, poise, the moon arts) and a bot. Pure, runs in Node |
| `js/assets.js` | Loads and draws the cast (plain, flashed, silhouette, hard grey), effects and tiles |
| `js/render.js` | The arena (sky, moon, parallax silhouettes, tiled floor, weather), fighters, effects, HUD, touch |
| `js/cine.js` | The moon arts as cinematics, the boss name card, floating lines |
| `js/audio.js`, `js/main.js` | Sound; the loop, input, saves and screens |

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
