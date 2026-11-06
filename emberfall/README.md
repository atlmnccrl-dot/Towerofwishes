# EMBERFALL

*The sun is dead. Nine shards remain. Take them all.*

A pixel-art action RPG built on this repository's packed assets (the Character Creator cast,
the effect, tile and icon atlases, the music and synthesised sounds). It is a separate game from
Tower of Wishes: its own world, cast, story and combat. Nothing here touches the Tower of Wishes
code or canon; it only reads from `../assets/`.

Play: serve the repository root and open `emberfall/index.html` (for example
`python3 -m http.server` then <http://localhost:8000/emberfall/>). Landscape; keyboard or touch.

## The story

Three hundred years ago the Pale King broke the sun. Nine shards fell. Whoever held one stopped
dying; the world calls them the Hollow Lords and lives by their Ember light, which is going out.
Rook Vane, a gravedigger's son, dies in the first raid on his village and stands back up with a
dead Ember burning in his chest. Nine acts follow the road east to the Dead Sun:

| Act | Place | Hollow Lord | Joins |
|---|---|---|---|
| I | Crowsmoor | Grum, Warlord of the Risen | Rook Vane |
| II | The Ashroad | Red Mara, Queen of the Ashroad | Ysolde Marr, the Cinder Witch |
| III | Frosthold | Caedmon, the Frost Lord | Old Brannoc, the Anvil |
| IV | The Skyreach | The Skyreaver | Tamsin Crow, the Stormlance |
| V | The Drowned City | The Drowned Bell | Sister Wren of the Drowned Church |
| VI | The Labyrinth of Thorns | The Gardener | Mouse, the Knife in the Dark |
| VII | The Night of Knives | Mother Mireille of the Knives | |
| VIII | The Hollow Court | Castellan Dreth | |
| IX | The Dead Sun | The Sunwyrm, then the Pale King | |

Each act is a filmed opening scene, a three-wave fight, a confrontation, a boss with phases, and a
closing scene. Cleared acts offer repeatable hunts for gold and experience. Losing costs nothing.

## Combat

Real-time, top-down, one hero under your control and the rest on AI (swap any time).

- **Light combo** (J / ATK): three-hit chains; the last hit is heavier. Ranged heroes fire bolts.
- **Heavy** (K / HVY): a slow blow that shatters poise.
- **Dodge** (SPACE / DGE): invulnerable for a moment. A dodge through a blow is a **perfect dodge**:
  time slows and the Surge gauge jumps.
- **Signature art** (L / ART): one per hero, on a cooldown. Grave Cleave, Cinder Bloom, Anvil Drop,
  Stormlance, Shadow Step, Tidewater.
- **Ember Surge** (Q / SRG): fills on hits, kills and perfect dodges. Time slows, every art resets,
  the party burns 60 % harder for seven seconds.
- **Poise**: every hit wears a foe's poise; at zero they **BREAK** and take 50 % more damage.
- Foes telegraph every attack on the ground (an arc, a line, a circle). Bosses have phases, summon
  help, enrage, and speak.
- Burn, frost and shock from weapons and arts. Draughts (E / POT) heal the host 40 %.

Between acts the **camp** has the party (levels, three talents per hero with three ranks each,
gear slots) and the quartermaster's shop (weapons, armour, trinkets, draughts). Progress saves to
the browser.

## Code

| File | Role |
|---|---|
| `index.html` | page, font, canvas |
| `js/data.js` | heroes, foes, bosses, items, talents, clip timing (pure) |
| `js/story.js` | places, extras, the nine acts' scenes and fights, hunts (pure) |
| `js/combat.js` | the fight simulation: pure, runs in Node |
| `js/assets.js` | loads and draws the packed atlases |
| `js/render.js` | places, the fight view, HUD, touch controls |
| `js/scenes.js` | the scene player (beats, floating lines, cards) |
| `js/ui.js` | title, road map, camp, shop, results, pause, settings, credits |
| `js/audio.js` | music, sounds, ambience |
| `js/main.js` | loop, input, state machine, save |

Tests (from the repository root):

```sh
node emberfall/test/story-test.js          # every actor, set, effect, prop and foe referenced exists
node emberfall/test/play-test.js 3         # plays the whole campaign on auto: no walls, timeouts or NaN
python3 -m http.server 8765 &              # then, with Playwright:
NODE_PATH=$(npm root -g) node emberfall/test/browser.js /tmp/ef-shots   # title → scene → fight → results → camp
NODE_PATH=$(npm root -g) node emberfall/test/shots.js /tmp/ef-shots     # boss fight, late scenes, phone layout
```

## Credits

Characters from the itch.io Character Creator 2D Fantasy; tiles, props and effects from the packed
atlases in `assets/`; UI icons by Kibyra (Medieval Fantasy UI); the Adventurer font; "Heartfelt
Battle" (OpenGameArt, CC0); Brackeys particle textures; synthesised fight sounds and ambience.
