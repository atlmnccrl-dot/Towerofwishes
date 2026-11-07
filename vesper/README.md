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

## The campaign

The game is a climb up the Spire on a scrolling map (`js/mapview.js`): seven acts, one per hour
of the night plus the post-game, each a band in its hour's colours split from the next by cloud.
65 nodes join by branching paths: **trials** (the tutorial), **battles**, **elites** (every wave
led by an elite), **challenges** (against the clock, Glass Blade, Untouchable, Moonless, No Mercy,
the Horde), **shrines** (a skill point) and a **guardian** at the top of each act. The post-game act,
Echoes of the Night, brings every guardian back stronger and ends with the Endless Night. Nodes
open as you clear the ones below them; each has three stars (win, finish above half health, and a
goal that depends on the node: a time, a 20-hit combo, or beating the guardian without a hit). The
story plays where it belongs: the prologue before the first trial, each act's intro the first
time you climb into it, each guardian's intro before its fight, the ending after the First Cut.

**Levels and the skill tree** (`js/progress.js`): fights give experience (more the first time,
more per new star, a little for trying); every level gives a skill point, so do shrines and
guardians. You start with the light-attack combo, the heavy attack and dodge. Parry, both skills
and the ultimate are learned in the skill tree's three branches (Blade, Shadow, Moon) alongside passives (more damage, health, a wider parry window, a faster moon, an
executioner bonus, quicker skills). Refunding the whole tree is free. A new ability gets a short
tip card the first time you fight with it.

**Heroes**: Vesper starts. Lys unlocks at level 4, Kestrel by defeating the Umbral, Wisp by
defeating any guardian without being hit (the Untouchable challenge is made for it), Rime at
level 12, and the First Cut himself by defeating him. The roster shows locked heroes as shadows
with what it takes and how close you are.

**Tutorial**: the First Steps trial walks you through moving, cutting and chaining a combo,
the heavy attack and the dodge on training husks, then a real fight, with a coaching card for
each step.

**The opening** (`js/opening.js`): about 23 seconds, cut like an anime transformation and drawn at
full resolution (painted light, ribbons and grain around crisp scaled-up pixel figures): a flat red
sky with the swordsman as a black silhouette, pushing in, one glint, the cut tearing the sky; ribbons
of light whipping across the frame around the wounded moon and THE FIRST CUT; the dead assembling
out of flying shards; a dark smear and a gold flash; your hero forming out of the ribbons as the
camera climbs the figure; an extreme close-up as the eye opens red; the flat red sky again with the
Spire black against it, a guardian's eyes lit on every ledge, and the title. A tap skips to the
next beat.

**Foes with a trick**: Shieldbearers block cuts from the front (a heavy blow breaks the guard, or
get behind them); Grave Brutes charge down a telegraphed lane and slam the floor; Blood Husks run
at you and burst, and killing one blows up the foes around it.

**Balance**: `node test/campaign-test.js [runs] [hero]` plays the whole map in order with the
profile a player would have by then (levels from the experience earned, skills bought in a sensible
order). With the bot at a good player's skill: Act I about 100%, the middle acts mostly 70 to 100%,
the last acts 50 to 90%, the post-game harder; about 80% overall for every hero. The First Cut:
50 to 88% depending on the hero. Knobs: `P.TUNE` and the per-node adjustments in `progress.js`.

## The armies

Every one of the 200 random-cast characters (Fantasy Character Creator parts, 19 batches, sets
`vh_*`) has a place:

- **Looks**: each army foe has several looks (`D.VARIANTS`), all 200 characters spread across them.
  A fight picks up to three looks per foe type, so a wave of reavers is never five copies, and it
  loads only those (`P.setsFor`).
- **Champions**: twelve named elites with a name card and a health bar, two to an act, each leading
  the second area of an elite fight and standing beside it on the map: Hrolf the Gatebreaker and the
  Bone Captain; Mother Rime and the Saber of the Cloister; the Hollow Bishop and Night's Widow; the
  Carrion King and the Ashmother; the Huntmaster and Grandmaster Gale; the Lord of the Wound and the
  Last Saint. The Endless Night ends with two of them.
- **Thralls**: the thirteen townsfolk are the city's people turned by the wound's light, a swarm in
  the Black Gate and the Ashen Waste, and the dead rising in the opening.
- **Cutscenes**: each act's intro has a few of the army it is about to send rise out of rifts.

| Act | Army | Foes |
|---|---|---|
| I, the Black Gate | raiders, thralls, the first dead | Thrall, Gate Reaver (axe spin), Gate Spearman, Bone Bulwark (shield), Bone Pikeman, Bone Guard, Black Gate Guard, Raider Chieftain |
| II, the Cloister of Frost | the frost order | Rime Acolyte (slowing ice, falling ice), Frost Seer (ice fields, summons), Cloister Knight, Mirror Duelist (counters light cuts), Frost Pike |
| III, the Umbral Stair | the shadow cult | Umbral Wraith and Violet Shade (blink away when struck), Cutthroat and Stalker (blink behind you), Stair Warlock (summons), Shadow Bulwark, Bone Guard |
| IV, the Ashen Waste | beasts, fire and blight | Ash Hound (pounce), Bone Ram (charge), Cinder Mage, Blight Mage (poison), Ash Warlock (fire rain, summons hounds), Ash Ravager, Thrall |
| V, the Wind's Throat | the hunters | Throat Ranger (volleys), Gale Sniper (one huge arrow), Wind Monk and Storm Fist (kick chains), Ridge Pikeman, Gale Harpy (long dive), Stalker |
| VI, the Moon's Shadow | the Knights of the Wound | Wound Paladin (heals allies), Knight of the Wound, Wound Duelist, Blood Warlock, Blood Wraith |

Duelists turn aside light cuts from the front and strike back (heavy blows and finishers get
through); wraiths come apart when struck and gather again near you; paladins mend the foes around
them every few seconds (kill them first). These sets are packed with a 256-colour palette and
without the idle variants they never use, their metadata bundled by act in `assets/pixel/vh_b<N>.json`
with `vh_map.json` (`node vesper/tools_vh_bundles.js`), and they load when a fight needs them (during its story scene), not at
start. The 33 first chosen keep their source sheets in `art_source/characters/`; the rest were
packed straight from the batches (`PACK_SRC=<dir> python3 tools/pack_pixel.py ...`).

Two more heroes: **Ember**, the Ash Monk (fists, burning palm, a step through fire), unlocked by
defeating the Hollow Twins; **Halden**, the Dawn Shield (mace and shield, holy ground, judgment from
the sky), unlocked by earning 60 stars.

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
- **The way on**: clearing an arena opens a portal at its far end while the camera turns to it, and
  the goal in the corner changes to "Go through the door". The portal is made only from the soft
  vfx textures in `assets/vfx`: two rune rings turning against each other on the floor, smoke
  gathering and churning around a ring of light, a dark core with three layers of swirl turning
  inside, flares riding the rim and a beam into the sky. It opens from a single flare to a slit,
  then bursts wide on an impact frame. Walk in: you fall through a vortex of the same swirl
  textures and arrive through a portal that collapses behind you in smoke. Foes that come in from
  the side step out of small portals at the arena's edge.
- **Waves and reinforcements**: every arena throws two or three pulses of foes at you; when one is
  left standing the next pulse charges in ("REINFORCEMENTS"), led from the first hour on by an
  elite (bigger, wreathed in red, more than twice the health). Bosses get escorts mid-fight. Up to
  three foes swing at once.
- **Stronger hero to match**: heroes hit 30% harder and have 30% more health than their base kit,
  every kill heals 3% and fills the moon, and kills close together call out streaks (double kill
  up to massacre). The last kill of an arena plays a slow-motion finisher with an impact frame.
- **Difficulty**: tuned with the test bot so a good run wins most hours (about 75 to 90% per hero
  across the night, 50 to 100% per hour) and fights last 60 to 105 seconds. Losing costs nothing:
  retry the hour. Knobs: `VS.DIFF` (foe health and damage) and `VS.POWER` (hero) in `js/sim.js`,
  `pow` per hero in `js/data.js`.
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

The story in one breath: seven hundred years ago a swordsman leapt from the Spire and cut the
falling moon, and it stopped. The cut never healed, and its red light raises the dead. Tonight the
wound bleeds out, and at dawn the moon falls for good. Only your blade can close it, from the top
of the Spire, past six guardians. The last is the swordsman himself: the wound keeps him alive.

It is told with no dialogue, one caption line per shot at the bottom of the screen (`js/tale.js`).
The story shots are filmed from the fights' own high three-quarter camera on the hour's real
arena: the dead rising from rifts, the hero close up, guardians dropping from the sky onto the far
side of their arena (with an impact frame when they land), the camera pushing in and zooming. The
attack shots (the first cut across the moon, each clash, the final strike) stay as full-screen
anime impact frames. The first night opens with the whole premise (the falling moon
and the cut, the wound raising the dead, tonight's deadline, the climb). Every hour after it shows
the Spire with the guardians up its side and the hours left to dawn, the next place, the guardian
named with one line about it, and a clash on an impact frame. The ending: you leap at the moon and
strike the wound, it turns white and rises, dawn. Each fight starts with its goal ("Break through
the Black Gate", then "Defeat the Gatewarden"), which stays in the top right corner. A tap moves
on, Esc skips. Shot lists and goals in `js/story.js`.

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
| `js/progress.js` | The profile, experience and levels, the skill tree, hero unlocks, the campaign's nodes, their fights, stars and rewards. Pure |
| `js/mapview.js` | The campaign map: the Spire, act bands, paths, nodes, guardians, input |
| `js/story.js` | The story: shot lists with captions, each hour's goal, the ending. Pure |
| `js/sim.js` | The fight simulation on a round 2D ring (cones and circles, waves, parry, dodge, dash-cut, poise, the moon arts) and a bot. Pure, runs in Node |
| `js/assets.js` | Loads and draws the cast (plain, flashed, silhouette, hard grey), effects and tiles |
| `js/view.js` | The full-resolution game: the helicopter view for fights (projection, ring, props, floor danger, fighters, effects), the side-on stage for menus and scenes, HUD, touch controls, dialogue, boss card |
| `js/px.js`, `js/cine.js` | The pixel buffer and the moon arts drawn on it |
| `js/tale.js` | The story scenes, drawn at full resolution with captions |
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
