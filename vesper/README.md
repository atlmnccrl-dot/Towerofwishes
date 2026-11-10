# THE BLEEDING MOON

*Seven hundred years ago a swordsman cut the moon to raise the dead. It has bled ever since.*

The hero is Vesper; the code, folder and save keys keep the working name `vesper`.

A side-on pixel action game built on this repository's packed assets (the Character Creator cast,
the effect and tile atlases, the battle track and the synthesised fight sounds). Its centrepiece is
the **Last Ditch Effort**, a moon art played as a cinematic in the style of the pixel "super move"
clips: snap to black, a red eye under the visor, the title over a falling blade, the blade planted
under a pale moon, the draw, a flower cut-in, a silhouette assault across a red moon, a red frame.

Separate from Tower of Wishes and Emberfall: its own story, cast names and combat. It only reads
from `../assets/`.

Play: serve the repository root and open `vesper/index.html` (for example
`python3 -m http.server` then <http://localhost:8000/vesper/>). Landscape; keyboard or touch.
*Theatre* (Settings, or the title screen) plays every cutscene on demand, reached or not: the opening,
each act's intro, the ending, the six guardian films and every hero's moon art (Vesper's Last Ditch Effort
and Red Moon); a tap or Esc brings you back to the list (`?cutscenes` opens it).

## Heroes

Pick a hero on **New night** or under **Heroes** on the title screen. Each has a combo (left click),
a heavy (right click), two skills on cooldown (R and F) and an ultimate with its own cinematic (E).

| Hero | Style | Skills | Ultimate |
|---|---|---|---|
| Vesper, the Moonblade | Sword: combos, dashes | Crescent Wave (a piercing wave), Phantom Step (blink behind a foe and cut) | Red Moon; the Last Ditch Effort at low health |
| Lys, the Bloom Witch | Spells from range: bolts, a frost nova that slows | Blight Bloom (a poison zone), Petal Blink (teleport, petals burst where she was) | Thousand Petals |
| Kestrel, the Stormlancer | Spear: long reach, stuns, a lunging heavy | Chain Lightning (jumps through five foes), Thunder Drop (leap and slam with lightning) | Heaven's Spear |
| Wisp, the Shadow | Daggers: fast, a fan of knives | Shadow Clones (two clones fight for 6 s), Smoke Veil (stuns around her, foes lose her) | Hundred Cuts |

At low health every ultimate hits as hard as the Last Ditch Effort and heals 30 %.

## The night

## The campaign

**The map** (`js/mapview.js`) is built from the fights themselves: every mission's island is a piece
of the very arena that mission opens in (the guardian's own lair for a guardian), built the way the
fight builds it, with its ground tiles, walls, props, torches and chests, cut out as an oval round the
middle and floating in the night over a cliff. Each mission's arena is fixed (`PROG.arenaSeed`), so
what the map shows is where you will fight. Choosing a mission opens its island out into a wide piece
of that arena, with the foes it brings standing in it (the guardian or champion in the middle, in the
looks they will wear, a red ring under each) and your hero at the near edge facing them; the rest of
the map steps back. Other islands carry the champion or guardian who waits there and your hero on the
one you stand on. Islands bob, joined by stepping stones that glow gold once cleared and pulse red
toward what is open; sealed acts sit in the dark. The red moon hangs low behind, the Spire stands far
off, fog drifts between the acts; an act's title rises like a stage card as you climb into it. The
mission card along the bottom shows the fight's name, its foes as portraits (the guardian or champion
first, larger), its goals, the reward and a big Fight plate.

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
guardians. You start with the light-attack combo, the heavy attack and dodge. Both skills
and the ultimate are learned in the skill tree's three branches (Blade, Shadow, Moon) alongside passives (more damage, health, less damage taken, healing on a perfect dodge, a faster moon, an
executioner bonus, quicker skills). Refunding the whole tree is free. A new ability gets a short
tip card the first time you fight with it.

**Heroes**: Vesper starts. Lys unlocks at level 4, Kestrel by defeating the Umbral, Wisp by
defeating any guardian without being hit (the Untouchable challenge is made for it), Rime at
level 12, and the First Cut himself by defeating him. The roster shows locked heroes as shadows
with what it takes and how close you are.

**Tutorial**: the First Steps trial is guided, one thing at a time, and nothing attacks until it
is taught: walk to a glowing circle (chevrons lead the way), cut down two training husks, chain
a 6-hit combo on a post, clear a ring of four husks with one heavy blow, dash through two slow
swings of the Drill Knight when the red ring flashes, finish him with a dash-cut, then smash a
powder barrel to blow up the husks around it. Only then are the dead let loose, with a tip the
first time each kind shows up (Blood Husk, Shieldbearer, ghouls, raider). The card at the top
names the keys (or buttons) for the step and counts it down (2 / 4, 5 / 6 hits); arrows bounce over
the step's targets; on a phone the button to press pulses; a tick and a chime mark each step done.
Every step moves on by itself after half a minute, so nobody is ever stuck. The game drives it
(`TUT` in `js/main.js`); the sim holds its waves back while a fight is scripted (`place`,
`addBreak`, `dismiss`, `release`).

**Spawns**: on the large maps a group arrives from two or three directions at once, each foe at
its own distance (rising or dropping 150 to 300 away, or running in from 300 to 450 away, out of
sight), never closer than 64 to another, so a wave closes in from around you instead of in one
clump. Red chevrons at the screen's edge point at every foe out of sight.

**The opening** (`js/intro.js`): about 40 seconds, cut like an anime fight in the style of the moon
arts and drawn on the same 180 px pixel buffer, with its words on a sharp full-resolution layer above.
None of it is the game's own view: every shot is a set built for it. The plot: seven hundred years ago the First Cut climbed the Spire
and cut the moon to raise an army that would never die; by its red light his dead rise; tonight the
wound bleeds out, and Vesper's blade is the one that can stop him. The shots: a cold open of title cards cut hard between paper and black (BEFORE THE MOON BLED /
BEFORE THE DEAD WOKE / AND BEFORE THE LAST NIGHT FELL / THERE WAS ONE) and one white frame of his crowned
head in ink with red eyes; a city under the white moon with the Spire over its roofs, the ground shaking, birds bursting off the
roofs and people running in the streets as the First Cut rises behind the Spire, a black shape against a
swelling red glow, until his eyes ignite; the god towering over the Spire against the moon, raising his
sword into it; the cut: the tower-sized blade drinking
the moon's light, the swing across its face, a storm of impact frames, then the moon splitting along
the cut, white-hot, with red light pouring out of the gap onto the world, rings of force across a sky
turning to blood, and his crowned head rising beneath it; the moon hanging still and bleeding; the earth cracking
and a hand bursting out (two frames of red ink), then the dead standing up one by one in a row on a ridge against the moon,
their eyes lighting, his eyes watching from the sky; red eyes opening in waves across a black plain, hundreds of them, and lightning showing the horde
they belong to, rank behind rank to the horizon, tracking boxes locking onto the front rank; a manga panel of her eyes behind
the visor slit, the irises turning red with rings closing round one, and her name; the draw; VESPER in
letters the height of the screen with her run seen through them; the charge through eight of the dead; three manga panels; then the First Cut as a god over the
Spire (a drawn silhouette: crowned and horned helm, spiked pauldrons, a cape like wings, both hands on
a sword the size of a tower), the camera tilting from his sword's point past her, small on a rampart,
up to his burning eyes with the red moon as his halo (a tracking box on her, another on his eyes, a
dotted line between them counting the height); his gaze, her eye answering; his blade coming
down from the sky and her holding it (impact frames, the ground breaking, AND YET); her throwing it off
(I STAND) and raising her blade at him; the title, THE BLEEDING MOON, over the red moon, his shadow faint behind
it and his eyes burning above the name, its letters drawing together over drifting red lights. Every
film is graded: grain on every frame and a vignette on the ordinary ones. The opening is told in clear beats by `js/openfilm.js`: each built shot above held long enough to read,
and one fight in the middle told shot by shot in the characters' own colours (the dead in grey): they
come at her, she cuts the first down, throws off two more with a spin, slides under the brute and fells
him, and stands among them; the First Cut's "Kneel." at his gaze. The undead have no glowing eyes.
**The First Cut is the drawn god** (the author's pick, 2026-11-09, over his knight sprite blown up
giant): one solid silhouette (crowned and horned helm, spiked pauldrons, cape, the tower-sized sword),
with no glowing eyes, in the opening, his film, on the map and over the final fight (`colossus()` in
`js/intro.js`). Any tap skips it. The older hand-drawn
sequence (`js/opening.js`) stays in the code for the Theatre.

**Effects: Crowd Breaker** (PixelHit, `tools_cbfx.py` → `assets/cbfx`): 29 of the pack's hand-drawn skill
sheets, trimmed and packed into five lossless atlases (13 MB), loaded after the game starts. The old
effect names play them instead (`A.CBMAP` in `js/assets.js`): light hits are Roaring Blade Nova sparks,
heavy blows and breaks the Last Stand cross, moon-art hits Crimson Tide, finishers Flashpoint
Severance, dash cuts Piercing Dash (in the direction of the cut), parries the Sky Rend star, spins
Earthshaker, landings and rock bursts Quake Stomp, strikes and moonfall Meteor Rain, fire bursts the
Greater Fireball ring, frost the Frost Curtain, lightning Skyfall Thunder and Storm Orb, heals Inner
Flow Mending, deaths the Crimson Tide smoke; the god's cut lands with Flashpoint Severance and his
hand with Quake Stomp. `'cb:<folder>/<role>'` plays any packed sheet by name. Sheets with the pack's
placeholder ghost or its targeting grid are left out. Projectiles and burning or poisoned ground
keep their looping effects. The pack's licence allows it inside the game and this private repository,
never on its own or in a public repository; its THIRD_PARTY_NOTICES sit in `assets/cbfx` and the
credits name it. The raw pack is not in the repository: rebuild with
`CB_SRC=/path/to/crowdbreaker python3 -I vesper/tools_cbfx.py`.

**The guardians' entrances** (`js/bossfilms.js`, built with `js/edit.js`): before each guardian's fight, a
short duel cut like the reference edits: most cuts under half a second, the camera always pushing, tilting
or drifting, black figures against bright fields, and each film in its own colour world (a gradient map over
everything drawn; Vesper's red stays red). Each opens on title cards, shows the place, the guardian and a line,
her eyes and her answer, then a real exchange of blows: the leap, the hit as an inverted silhouette, the
fisheye ring, the body thrown along a trail, the stutter frame, the grey aftermath; then the name. The
Gatewarden is violet ("Turn back, little blade." / "Open the gate."), leaps from the gate and throws her; the
Hollow Twins are ice, on a split screen with tracking boxes ("We are two blades." / "I only need one."), and
cross blades where she stood; the Umbral is black-and-white ink, flickering behind her ("Behind you." / "Too
slow."), with his court of shadows; the Hunger is ember: the lights go out, HUNGRY flashes, it lunges out of
the dark ("Come on, then."); the Pale Wing is storm, two tiny figures in a vast sky ("The wind takes
everything." / "Not me."); the First Cut is blood: the fallen guardians one frame each in their own colours,
the colossus rising with the HUD measuring him ("Seven hundred years... and they send one blade." / "One is
enough."), and his blade falling on her: THIS ENDS TONIGHT. Each plays in full the first time and can be
skipped after that (`?film=warden|twins|umbral|hunger|wing|firstCut`).

**The edit** (`js/edit.js`): a film is a list of cuts, `E.film(cuts)`. A cut has a duration, a camera (`cam`:
zoom, tilt, drift), an optional colour world (`grade`: blood, violet, ice, ink, ember, storm, toxic, gold,
grey, dusk) and a template: `E.scene` (a set; actors that move, arc, spin and smear; speed fields, trails,
rings, debris, effects; `sil` turns every figure into a black silhouette), `E.inv` (the inverted impact
frame), `E.ring` (the fisheye hit), `E.face` (a chest-up mid shot), `E.eyes` (her eyes full frame inside
focus lines), `E.card`, `E.flash`, `E.glitch`, `E.blink()` and `E.hold(cut, k)` (a stutter). Dialogue lines
ride on cuts in the speaker's colour; only the newest shows.

**The last hour** (`showcase()` and `showcaseBoss()` in `js/main.js`, `?showcase`): the tutorial, and how the night
first ended. After the opening, Vesper at full power at the top of the Spire, in three stages. **Stage 1, the
lessons** on practice targets: move; attack (the combo and the heavy blow together: the same button); dash through a
red swing; dash-cut; and the automatic skills, with a message explaining what each automatic move does. **Stage 2,
the horde.** **Stage 3, the First Cut**: his film, then him in the colossus arena, faster than in the campaign, the
summit trembling and red lightning splitting the sky; the moon art; and when he falls below 55% (or after a while)
he raises his sword: THE FIRST CUT, a one-shot that kills her (`F.oneShot`). **The Moon** (a hooded woman of pale
light, `moonGod()` in `js/bossfilms.js`) sees her corpse, says "Not yet." and raises her in a beam of moonlight; it
turns the night back to dusk and she wakes with nothing but her blade (`F.rise`): the campaign begins. Its first node, **Where She Woke**, is
a plain fight (no lessons; it teaches the basics itself only on a save that never played the last hour). Each lesson opens with a message that pauses the game until OK;
she cannot fall before his one-shot; Esc skips to the Moon raising her. Both films are in the Theatre.

**The heavy and the skills are automatic** (`autoMove()` in `js/sim.js`): while you keep attacking, the next swing
is a skill whenever one is ready and a foe is in its reach (from the second cut of a combo on, the two taking
turns), or the heavy blow when three or more crowd you, a shield stands in front of you, or a combo has run its
full length (the heavy has a 3.2 s cooldown). The keys still work for anyone who wants them, but nothing asks for
them. **Touch controls** (minimal, the author's pick): soft dark discs with big white icons and no outlines: CUT,
DASH and MOON (its disc fills as the moon does), a stick, pause; a small row above CUT shows the heavy and the two
skills, gold when ready, with a sweep while they recharge.

**Skills page**: the three branches as rows of round icons read left to right (gold and pulsing when ready, lit
in the branch colour when learned, grey with the level when locked); the chosen skill is shown large in a card
on the right in plain type (what it does, what it needs, ticked off) with one Learn button. **Effects**: the Crowd Breaker sheets are drawn at 62% of their
old size on attacks (`A.CB_SCALE`). **Pacing**: the guardian films play with `pace: 1.4` (action cuts stretched
the most, the stutter holds dropped), 12 to 17 seconds each.

**How the guardians fight**: besides their signature moves, every guardian has a delayed blow (the
wind-up stops one frame short of the strike and hangs there with a glint, so the blow comes late),
and the Gatewarden, a Hollow Twin, the Hunger and the Pale Wing have leaping slams (up from where they
stand, down where you stood, the landing ringed in red). The Gatewarden and the Right Hand chain three
blows ending in a delayed finisher.

**The final fight** (Act VI's guardian, `js/sim.js` 'the god'): the First Cut is the colossus of the
opening, too vast for the summit, so he looms over its far edge and strikes into it, Binding-of-Isaac
"Lamb" style. His blade cuts a line across the floor (a red band warns, then a white cut); his hand
slams a circle (its shadow grows); moonfall rains small strikes around you; later a sweep of cuts
crosses the summit one after another (stand in a gap or roll). Where his blade or hand comes down it
stays in the floor for a few seconds, ringed: cut it and he bleeds. At two thirds his dead pour in;
at one third the echoes of the guardians you beat rise one by one, and he kneels, lowering his head
to the summit's edge, where it takes double damage. The moon arts take a fixed share of him.

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

## Loot and gear

Gold and items (`js/loot.js`). Three slots per hero (weapon, armour, charm), four rarities (common,
magic, rare, legendary with a name and fixed affixes), item level from the node's depth. Main stats:
damage (weapon), health (armour), moon gain (charm); affixes: armour, life steal, cooldowns, dodge
distance, kill healing, gold find. Each hero wears their own set; it feeds the fight's
numbers. Drops: gold from every win (more for the first, elites and guardians, plus a little per
barrel or crate smashed), an item from every guardian, often from elites and challenges, sometimes
from battles, one per chest opened (chests sit off the way through, glinting; iron and gold ones hold
better), and another for two new stars. The Gear screen (map bar, or G) compares an item against
what is worn, equips the best, upgrades to +5 at the forge and salvages for gold; the Blacksmith
sells four pieces that restock after each win. A full bag (48) sells new finds.

## Guardians' lairs

Each guardian fights in a hand-built lair (`lair_*` in `js/arenas.js`) with hazards that strike on a
rhythm and hurt foes as well: the Gatehouse (fire vents between pillars, in turn), the Twin Nave
(frost pools that slow, ice bursts), the Umbral Dais (four voids cut into a round dais, shadow
strikes), the Maw (a ring round the Hunger's pool, poison pools, rock bursts), the Eyrie (wind vents
turning round a cross among the spires) and the Moon's Altar (a ring of fire vents round the altar,
sweeping faster in the First Cut's second phase). Orange rings warn of lair hazards.

## After the story

`js/modes.js`, from the Modes button on the map:
- **Difficulty** (Settings): Story, Normal, Hard (+30% foes, +25% rewards), Nightmare (+60%, elites
  lead every wave, +50% rewards).
- **New Game+** after the ending: the climb again from the first battle with level, skills, heroes,
  gear and gold kept; foes +35% health and +30% damage per level, gear 10 item levels better.
- **Endless**: waves on one large map from your two highest acts, a champion every fifth and a
  guardian every tenth, 15% health back between waves; gold and experience per wave, an item every five.
- **Daily challenge**: the same fight for everyone on a day (an act, two twists from glass, elites,
  no healing, a time limit or no moon art, three areas and a champion); the first win of the day pays
  gold and a rare item.
- **Achievements** (26) and **mastery**: every win adds to the hero's mastery, up to 10 (+2% damage each).

## Controls and options

Keyboard and mouse, touch, or a gamepad (sticks move and aim; A cut, X heavy, B dash, Y heavy, LB/RB
skills, triggers the moon art, Start pauses; the d-pad and A/B work every menu and the map).
Settings: difficulty, music, sound, screen shake, auto battle, text size (90–130%), colour-safe cues
(blue and orange attack warnings instead of white and red), save export (a file and a copied
code) and import.

## Release

`python3 -I vesper/tools_build.py` builds `dist/vesper-web` (a static site that installs as an app)
and a zip for itch.io. What is left before selling it (licences, music, store pages, playtesting) is
in [RELEASE.md](RELEASE.md).

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
  Shift dashes too, **E** plays the ultimate. Keys only: J attack, K heavy, 1 and 2
  skills. Touch: a stick, attack, heavy, dash, two skill buttons and the ultimate.
- **Danger on the floor**: during a wind-up the floor shows where the blow will land: the circle
  of a slam, the strip of a lunge, the cone of a swing. A ring also closes over the foe's head.
  **White** is an ordinary blow, **red** a heavy one; there is no parry (taken out on 2026-11-10): dash
  out of or through both. Dash at the last moment for a perfect dodge (it slows time, fills the moon,
  arms Counter Cut and heals with Second Wind); cut during or right after a dash for a lunging dash-cut.
- **Launches and walls**: finishers, the heavy spin and dash-cuts throw minions into the air; hits
  keep them up (a juggle) until they crash down. Anything thrown hard into an arena's edge bounces
  off it and takes a knock. Bodies fly back when they die.
- **Facing**: with the mouse, Vesper faces where you aim and strafes or backpedals as he moves; foes
  strafe as they circle; bosses taunt as they land and as their second phase begins.
- **Impact frames**: parries, finishers that kill, boss poise breaks, boss landings and boss deaths
  flash white with black silhouettes, then black with white ones, as in the moon arts.
- **Arenas**: each hour is a chain of two or three large isometric maps (`js/arenas.js`), built
  from the 2D Desert Fantasy and 2D Isometric Fantasy tile sets: a walled courtyard (13 x 11 tiles),
  a causeway over water or the abyss (16 x 7), a round ruin (13 x 13), a ring around a pit or a
  pool (14 x 14) and a crossroads (15 x 15). A tile is about three fighters tall, so a map is four
  to five times the old ring across. Tall walls (with torches, vines and a gate) stand only along
  the two back edges, where they can never hide a fighter; the front edges fall away as cliffs.
  Props and ruins to fight around (statues, carts, tents, towers, wells, ribcages, a dragon skull,
  rock spires) never block the plaza, the way in or the way on, and the map always stays connected.
  Props in front of a fighter turn see-through. Pillars, statues and rocks stop bolts: they are cover.
  Foes find their way round walls and props (a flow field per target cell); so does the bot.
  Foes arrive by the map's rules: rising out of rifts, dropping from the sky, or running in from
  open ground just out of sight. Bosses land ahead of you, toward the way on.
- **Breakables**: barrels, crates, pots and bone piles break under your blows and play the tile
  pack's own explosions. A powder barrel blasts the foes around it, a green barrel leaves a poison
  cloud that hurts only them, a water barrel mends you a little, and every smash feeds the moon.
- **The way on**: clearing an area opens a portal by the gate in its far wall while the camera turns to it
  (you run 75% faster while the way is open, and a trail of arrows leads round the props), and
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
- **Arena art**: each hour has its own tiles and light (`VS.ARENA.THEMES`): the Black Gate a grass
  courtyard in stone-and-timber walls, the Cloister frosted flagstones and white plaster, the Umbral
  Stair a sandstone temple with columns, sphinxes and red ivy, the Ashen Waste cracked sand with
  ribcages, dead roots and craters, the Wind's Throat ledges lined with rock spires, the Moon's
  Shadow a red-lit hall. The ground is baked once per map (tiles, overlays, cliff faces, the hour's
  tint, the moon's glow, brazier and torch light); walls, props and fighters are drawn over it at
  the same pixel scale, with animated torches, fires and water ripples.
- **Readability**: a red ring under the knight, white rings under foes; pack effects only on the
  blows that matter (finishers, dash-cuts, spins, parries, breaks, deaths); damage numbers only for
  heavy blows; impact frames only for boss moments.
- **Moon**: the gauge fills from cuts, perfect dodges and taking hits. Full, it plays the
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

The game is drawn at the screen's full resolution. Fights: a true isometric view (2:1 tiles) of
large tile maps under the red moon, crisp pixel characters at the tiles' own pixel scale, effects
drawn in code. Title, menus and scenes are shot side-on with layered silhouettes under the
moon. A slim HUD and menus as real buttons (Chakra Petch and Barlow from Google Fonts). The moon arts keep their pixel
style: they are drawn on a 180 px buffer laid over the game and scaled up without smoothing.

## Tiles

`assets/iso/` holds the tile atlases packed by `vesper/tools_iso.py` from the extracted packs
(`ISO_SRC=/path/to/packs python3 -I vesper/tools_iso.py`): every chosen tile trimmed, with its
offset from the ground anchor (128, 208), in four groups loaded per hour: `w` walls, doors, rocks
and trees; `d` desert ground and props; `i` isometric ground and props; `a` the animations
(torches, fires, barrels breaking, explosions, ripples). 256-colour pages, about 2.6 MB in all.
The packs' own characters are packed with the rest of the cast (`vh_sand_*`, `vh_iso_*`): the
Risen Dead (Black Gate), Sun Wardens (Umbral Stair), Dune Reavers, Sand Imps and Dune Brutes
(Ashen Waste, Wind's Throat), and new looks for shield skeletons, cultists, duelists and townsfolk.

## Code

| File | Role |
|---|---|
| `js/data.js` | Hero, Lys, foes and their attacks, stages, boons. Pure |
| `js/progress.js` | The profile, experience and levels, the skill tree, hero unlocks, the campaign's nodes, their fights, stars and rewards. Pure |
| `js/mapview.js` | The campaign map: each mission's island cut from its real arena, the chosen one opened out with its foes, stepping-stone paths, the camera, act title cards, input |
| `js/story.js` | The story: shot lists with captions, each hour's goal, the ending. Pure |
| `js/arenas.js` | The large tile maps: layouts, themes, walls, props, breakables; walking (clamp, line of sight, flow-field steering). Pure |
| `js/loot.js` | Gold, items, rarities, affixes, drops, the blacksmith, upgrades, what gear does in a fight. Pure |
| `js/modes.js` | Difficulty, New Game+, the endless survival, the daily challenge, achievements, mastery. Pure |
| `js/sim.js` | The fight simulation on the tile maps (cones and circles, waves, dodge, dash-cut, poise, breakables, the moon arts) and a bot. Pure, runs in Node |
| `js/assets.js` | Loads and draws the cast (plain, flashed, silhouette, hard grey), effects and tiles |
| `js/isoview.js` | Draws the tile maps: the baked ground, the walls behind, props, torches and breakables sorted with the fighters |
| `js/view.js` | The full-resolution game: the isometric view for fights (projection, ring, props, floor danger, fighters, effects), the side-on stage for menus and scenes, HUD, touch controls, dialogue, boss card |
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
