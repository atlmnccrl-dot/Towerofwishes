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
**The forge** (`tools_forge.py`, 2026-11-10): the game's own art, drawn in code (numpy + PIL, no outside art), in the
packs' formats so the engine draws it like any other tile or effect. `python3 vesper/tools_forge.py [preview.png]`
writes `assets/iso/tiles_v0.png` + `assets/iso/forge.json` (the `v` tile group) and `assets/fx/fx_forge.png` +
`assets/fx/forge.json`; `js/assets.js` merges both over the packs at load.
- **Ground blocks** (128 x 64 diamonds, 16 px thick, four rotations): blood-stained flagstones (`v:Flag A1-A4`), obsidian
  with burning red fissures (`v:Obsidian B1-B3`), bone-strewn earth (`v:Bone C1-C2`), the rune circle (`v:Rune D1`), ash.
- **Overlays** (flat decals): blood pools, glowing cracks, ash drifts, scattered bones.
- **Props** (lit from the top left, banded ramps, a dark pixel edge): a rune obelisk, a broken pillar, a skull pile, a bone
  spire, blood crystals, a crimson banner with the cut moon, candles, an iron brazier, the altar, gravestones.
- **Effects** (frame animations, no cross-shaped sparkles): `v_impact` (heavy blows, finishers), `v_slash` (dash-cuts),
  `v_blood`, `v_soul` (his dead give up a red soul when they fall), `v_pillar` and `v_crack` (his blade landing, the Last
  Cut), `v_shock` (his fist, a gate falling), `v_blast` (a gate destroyed), `v_rift`, `v_embers`.
- **Where they are used**: the Moon's Altar has its own theme (`altar` in `js/arenas.js`: obsidian and flagstones, the rune
  circle at its centre, braziers, candles, skulls, crystals); the Umbral Stair, the Wind's Throat and the Moon's Shadow
  mix the forge's props into theirs.

**The asset expansion** (2026-11-10/11, the author: "make all of that"), all drawn or synthesised in code:
- **A tileset per act** (`tools_forge_acts.py`, page `tiles_v1.png`): the Black Gate (wet basalt cobbles, iron grates,
  puddles; a lantern post, a gibbet cage, stakes, a well), the Cloister of Frost (frosted flagstones, cracked ice, snow;
  ice spires, a snow cairn, a frozen urn, a fallen bell), the Umbral Stair (violet stone with void seams; void shards, a
  broken arch, a violet-flame brazier), the Ashen Waste (cinders, scorched earth with glowing seams, embers; a dead tree,
  a ribcage, a lava vent), the Wind's Throat (layered cliff rock, windswept grass, gravel; cairns, a rock spire, a
  wind-torn banner). Each theme in `js/arenas.js` mixes them into its ground, overlays, props and decor.
- **Matching hours** (2026-11-11, the author: "the ground structures and assets should match"): each act now draws from
  one set only. The pack's stone walls, corners, low walls, paving, pillars, statues, rocks and stone props are recoloured
  into each act's palette (`recolors()` in `tools_forge_acts.py`, page `tiles_v2.png`, keys `v:<act><Name> <dir>`, e.g.
  the Black Gate's basalt, the Cloister's frosted stone, the Stair's violet, the Waste's scorched sandstone, the Throat's
  cliff grey, the Shadow's obsidian), and laid with that act's forge ground, overlays, props and decor. The desert and
  grass grounds, the green vines and the sandstone walls no longer appear in the wrong hour; the boss lairs follow their
  act (the Moon's Altar uses the Shadow's walls). `test/data-test.js` checks every key each theme names.
- **Animated props** (iso anims, `kind: 'anim'` in `js/isoview.js`; a theme names one as `'@Name'`): the void shards, the
  violet brazier, the lava vent, the wind banner, flickering candles, a rippling blood pool, a pulsing rune stone, fog.
- **Breakables**: a bone urn and a coffin, each with smash frames (`BREAK.urn`, `BREAK.coffin`).
- **Pickups** (`s.drops` in `js/sim.js`): the fallen sometimes leave a health orb (6% health) or a moon shard (+12 moon);
  elites always leave an orb. They drift to her when she is near.
- **Effects** (`assets/fx/forge.json`): frost, fire, shadow, lightning, an elite's turning rune ring, the ground tearing
  open for a rift spawn, loot sparkle (unopened chests), heal motes, a gold column (the moon gauge full, a chest), the
  two pickup orbs; wired to their events.
- **Skill icons** (`assets/ui/icons_f.png`): one for each skill on the skills page.
- **Sounds** (`tools_sfx.py`, `assets/sfx/fight/`): the gates opening, spawning and breaking, the god's blade and the Last
  Cut, souls, ice, fire, pickups, loot, the rift's hum, and a heartbeat below a quarter of her health.
- **The far country** (`farCountry` in `js/view.js`): each hour's own silhouettes on the horizon behind the arena (a walled
  city, snow peaks, floating spires, volcanic ridges, cliff columns, the Spire itself), at a quarter resolution.
- **Input**: a dodge pressed mid-swing or mid-hit is held until she can roll, and a dodge cuts the automatic heavy's
  wind-up short (both used to swallow the press).

**The First Cut is a real character** (2026-11-10, the author: "I'd rather u use a real character"): the Master Knight
set from the character packs, drawn at whole-number scales so his pixels stay sharp (`godAt` in `js/intro.js`), instead of
the polygon god or the drawn sprite (`tools_boss.py` and `assets/forge/firstcut*` are kept, unused). In the opening he
rises out of the city onto the Spire's tip, draws his blade back against the moon and swings (his Attack6 played through),
waits on a pinnacle at the top of the world and on the Spire for "Kneel."; the menu shows him small on the Spire's tip.
In the final fight he stands on a broken pillar in the void past the summit's far edge, about twice a man's size, his
overhead cut (Attack4) played as each blade comes down; when he kneels he is on the summit itself, on one knee, open.

**Loading** (`boot()` in `js/main.js`, 2026-11-10): only her sheet and the small shared effect pages load before
the title (about 1 MB; it was every hero and foe, about 23 MB, ten seconds even on a fast link). The rest streams in
behind the menu (`M.bgLoad`); a fight, story scene or the map waits for it if it is not done yet (`needAll`).

**The main menu** (`I.menu` in `js/intro.js`, 2026-11-10): a filmed scene behind the menu, the First Cut towering
behind the bleeding moon with the moon at his heart, red light streaming from its wound to the horizon, the Spire and a
ruined city with his dead marching along it, Vesper on a crag before it all, red sheet lightning, mist, ash and embers;
the menu as big lettering with a red blade of light on the focused line and the logo slowly bleeding.

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
BEFORE THE DEAD WOKE / AND BEFORE THE LAST NIGHT FELL / THERE WAS, then ONE landing large and red beneath it, two lines that
never overlap) and one white frame of his crowned
head in ink with red eyes; a city under the white moon with the Spire over its roofs, the ground shaking, birds bursting off the
people in the street scattering away from him, small and clear under lamps on posts, as the First Cut rises
behind the Spire until his crowned head stands far above its tip, the camera pushing in, the city's windows
going dark (reworked 2026-11-10); the god towering over the Spire against the moon, drawing his sword back flat along
the line the cut will take; the cut (rebuilt 2026-11-10), seen from the city: the god in front of the moon behind
the Spire, small and sharp, his sword drawn back flat, light gathering on the blade, one burning line sweeping
across the moon along the wound, a white flash, the moon splitting along the cut and red light pouring out of the
gap onto the city as its windows go dark; the moon hanging still and bleeding; a graveyard under the red moon
(rebuilt 2026-11-10), the dead clawing up out of their graves one after another in their own colours under a red
cast, dirt bursting up around them, and starting to walk; tonight, in two beats (rebuilt 2026-11-10): the moon enormous over the horizon, its
wound opening wider and pouring red light down onto the land in falling streams, then, from high above,
his dead, small and spaced so each shape reads, marching rank behind rank toward the last lit city, its
torches going out one by one while the moon sinks behind them; her on a crag against the bleeding moon, in her
own colours, the moon's light flashing across the frame, and her name (the manga eye panels were cut, 2026-11-10:
they did not fit the pixel art; the guardian films use the same shot); the draw; VESPER in
letters the height of the screen with her run seen through them; the charge through eight of the dead; three manga panels; then the First Cut as a god over the
Spire (a drawn silhouette: crowned and horned helm, spiked pauldrons, a cape like wings, both hands on
a sword the size of a tower), the camera tilting from his sword's point past her, small on a rampart,
up to his burning eyes with the red moon as his halo (a tracking box on her, another on his eyes, a
dotted line between them counting the height); his gaze, from behind her on the rampart, him far off over the Spire against the moon ("Kneel."); his blade
coming down from the sky as one burning streak and her holding it, the ground breaking under her feet (the pack's
impact), AND YET (both rebuilt 2026-11-10); then the title (the I STAND shot was cut,
2026-11-10), THE BLEEDING MOON, over the red moon, his shadow faint behind
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
effect names play them instead (`A.CBMAP` in `js/assets.js`): moon-art hits Crimson Tide, dash cuts
Piercing Dash (in the direction of the cut); light and heavy blows, finishers, breaks and parries play
no pack effect (their cross-shaped sparkles were removed, 2026-11-10); spins
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

**Fights** (2026-11-10): the sword heroes' combo finishers play the overhead slam (`Attack4`); `Attack3` reads as
drawing a bow and is kept only for the caster. The swing's drawn crescent is gone (it never followed the blade).
The First Cut's one-shot (`F.oneShot`) is rebuilt the same way: him behind the summit's far edge, the light of his
raised blade pouring on her, the burning streak, the summit breaking, her falling in her own colours.

**The last hour** (`showcase()` and `showcaseBoss()` in `js/main.js`, `?showcase`): the tutorial, and how the night
first ended. After the opening, Vesper at full power at the top of the Spire, in three stages. **Stage 1, the
lessons** on practice targets: move; attack (the combo and the heavy blow together: the same button); dash through a
red swing; dash-cut; and the automatic skills, with a message explaining what each automatic move does. **Stage 2,
the horde**: the dead come a few at a time, two or three of the weaker ones, never more than three
standing, eight in all (it was twelve at once from the Act VI waves; too much, 2026-11-10). **Stage 3, the First Cut**: his film, then him in the colossus arena, faster than in the campaign, the
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
**Intensity** (2026-11-10, "far more intense and epic"): two more attacks join him, the **cross** (two blades
in an X through you, a beat apart) and the **quake** (his fist on the summit, then shockwave rings rolling out:
dash through each one); his attack pool turns harsher with each phase and he strikes faster. Below 15% he
makes **the Last Cut** once: the whole summit pulses red but for one pool of moonlight, REACH THE LIGHT,
then a cut over everything outside it. His blade is seen coming down out of the sky onto each line it cuts;
glowing cracks spread over the summit with the phases; red lightning, embers and (in the last phase) a ground
that never stops trembling run through every First Cut fight. The bot's win rate is unchanged (about 63% at
skill 0.55, 65% at 0.8, 40 fights each); the fight runs about 40 s instead of 30.
**The gates** (2026-11-10, "unit spawn gates... make it an epic battle"): rift gates open on the summit's rim
(`godGates` in `js/sim.js`, the `godGate` foe): two soon after he rises, two more at his second phase, and in his
last every fallen gate opens again with more health. Each pours his dead in, a few at a time (two, three, then four
a group; elites from the second phase), up to 9 / 12 / 15 on the summit at once. Cutting a gate down wounds him
(3% of his health) and blows it apart. He has 1800 health (was 1150) and the moon arts take 4% / 8% of him a hit
(was 6% / 12%), since the gates' dead fill the moon fast; the bot wins about 64% (40 fights each at skill 0.55 and
0.8), the fight runs about 45 s, and about seven gates fall in one. The last hour's First Cut (the tutorial) has no
gates (`s.noGates`).
He stands outside the map (the author, 2026-11-10): the Moon's Altar is a small open summit (no walls,
statue, pillars or barrels, three braziers), the camera pulls back (`GOD_ZOOM` in `js/view.js`) and sets
the whole floor low in the frame, and he rises in the void past its far edge, head and shoulders over it,
looking in. Wherever the floor is, he is cut away (`R.isoMask`), so he never covers the fight.

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

## The First Cut, on the summit

(2026-11-11, the author: "the final boss character looks wrong and horrible, cutscene and match".) He was a small grey knight
(the same look as the Gatewarden) blown up into black blocks in the films and, in the fight, a figure peeking over the
summit's far rim while you cut floating limbs. Now:
- **His own boss sheet** (the author: "make a proper boss sprite"): `vh_firstcut`, built by `tools_firstcut.py` from the
  real animations of the knight he was drawn from (`master_knight`, untouched: all 23 clips, 8 directions, 2760 frames).
  Each frame is recoloured (silver-white plate, crimson trim, violet-black shadows), redrawn at twice the resolution with
  Scale2x so the edges stay smooth instead of blocky, and given a boss's costume and finish at that resolution: a tattered
  crimson cape from his shoulders that sways frame to frame (behind him, or over his back when he faces away; shorter and
  flaring when he runs; none when he rolls or dies), two horns swept back from his crown (placed by the crown's gold,
  which reads in every frame), a dark outline, moonlight on his upper-right edges and crimson in his armour's seams.
  The sheet says `"res": 2` and js/assets.js draws it at half the scale, so he keeps his size and gains the detail.
  Five 2048 pages, about 6 MB. He fights at 1.8 times a man's size. Used everywhere he appears: both his fights, the
  echo, the soul, the playable First Cut, the opening, the films.
- **His animation pack** (the author: "create an animation and asset pack and change the cutscenes for the opening to work
  better with his model"): cinematic clips in the same sheet, made from the knight's own frames with the cape answering the
  wind (`tools_firstcut.py`, directions S, SE, SW, E, W): `C_Hover` (rising, the cape lifted and spread by the updraft),
  `C_Stand` (the cape streaming out), `C_Raise` (the blade held high, its last frames cycling), `C_Cut` (the wide sweep that
  cut the moon, the cape whipping against it), `C_Command` (calling his dead, arms out). godAt's poses `hover`, `stand`,
  `raise`, `cut`, `command` play them.
- **His effects pack** (`tools_firstcut_fx.py`, `assets/fx/fc_fx.*`, merged by js/assets.js): `fc_crescent` (the crescent of
  white-hot light his cut leaves across the moon), `fc_aura` (crimson-black flame licking at his feet), `fc_crown` (flames on his
  crown), `fc_glint` (the moon running down his blade), `fc_wind` (ash and torn cloth on the wind), `fc_summon` (his rune opening
  in the ground, motes rising), `fc_shock` (a flat crimson shockwave).
- **The opening, rebuilt from scratch around him** (2026-11-11, the author: "those character models just don't stand right in
  the cutscenes for the boss... build different cutscenes from scratch"): he is no longer a giant over the city or in front of
  the moon. He is filmed the way the game shows him, on the real summit through the fight camera at a man's scale, in two
  story scenes (js/story.js `FC_DEED`, `FC_WAIT`, played by js/tale.js): *Seven hundred years ago, the top of the Spire*: he
  climbs onto the summit and the townsfolk scatter from him (a cold "memory" tint); close on his back, the moon ahead, he
  raises his blade and the light gathers (C_Raise, the forge's aura and embers); one sweep (C_Cut) and the white cut across
  the summit. Then the moon is shot on its own: his crescent of light sweeps across it and it splits (`SH.mooncut`, no
  figure in it); the dead, her, the fight. Then *He waits at the top of the Spire*: red, the dead crouched round him, the
  wind in his cape, his name card; she walks onto the summit and he points his blade at her: "Kneel." Then the strike and
  the title. js/openfilm.js gives the films in three parts (`I.PARTS`), main.js `startIntro` plays the chain (Esc in any
  piece skips the rest). The film engine's shots gained timed actions (`acts`), costume looks (`set`), timed events (`ev`:
  the fight's own effects) and the 'past' tint.
- **Fixed**: story scenes froze (every act intro, guardian intro and the ending, since the menu scenes update): the menu
  scenes used the same `M.scene` as story scenes and cleared it; they use `M.menuSc` now.
- **The last fight** (a5-b) is a duel: `D.FOES.firstCutFinal`, the knight himself on the summit at 1.6 times a man's size,
  with his combo, lunges, crescent waves, moonfall and mirror. The god above (js/sim.js, 'the god') is now only the will
  behind him: its health follows his body's; he raises his blade to call the sky blades, crosses, sweeps and quakes (more
  slowly than before); the rift gates still open and pour his dead in (a fallen gate wounds him 1.5%); the echoes rise
  and the Last Cut still falls below 15%. No limbs to cut, no kneeling. The moon arts take 5% of his health (10% the
  stronger ones). One boss bar. The tutorial's last stage fights the same duel.
- **The films** draw him at most twice the sprite's size (no more blocks), in his white armour (a light tint, not ink);
  the shots of him on the Spire's tip were lowered so all of him stands in the frame; his rise in the guardian film is in
  colour against the blood-red sky.
- Balance (bot skill 0.55, late profile): about 55–60% wins, fights of 35–50 s.
- **His sword and his hand** (2026-11-11, "far more epic and clean"; js/view.js, no drawn shapes): the sword's line charges
  as a thin light along the floor (only the part over the summit), its blade's edge comes down out of the sky onto it,
  and it lands as a white-hot slash that thins into a crimson glow and leaves a cooling fissure, sparks and dust along it.
  The hand: its shadow gathers in a turning crimson rune circle, a column of crimson light slams down onto the mark, and a
  shockwave, a red ring, flying debris and a cracked glowing crater follow. The guardians' signature cards and the moon
  art's cutscenes draw the foe at twice its size in colour (they were 3–4x ink blocks).

## Bound Souls

(2026-11-11, the author: "combat feels very hyper focused on us... a pet or partner or summon that we can unlock,
upgrade and improve and help us in battle".) Each guardian she cuts down leaves its soul; one soul fights at her side.
`D.SOULS` in `js/data.js`, levels and shards in `js/progress.js`, the soul's brain in `js/sim.js` ('the bound soul').

| Soul | Freed by | Role | Signature | Bond (level 4) |
|---|---|---|---|---|
| The Oathbound (`vh_knight_004`) | a0-2, early in Act I | Guard | Shield Oath: foes near him turn on him, struck and held | +6% armour |
| The Gatewarden | the Gatewarden | Breaker | Earthsplitter: rings of stone | +6% damage |
| The Hollow Twins | the Hollow Twins | Frost | Ice Lance Rain, slowing | +12% moon gain |
| The Umbral | the Umbral | Assassin | Shadow Step: behind the weakest, three cuts, finishes the dying | skills 8% faster |
| The Hunger | the Hunger | Leech | Devour: heals her; its blows feed her too | +2% life steal |
| The Pale Wing | the Pale Wing | Storm | Gale: tornadoes that chase the dead (it fights at range) | +10% health |
| The First Cut | the First Cut | Blade | The First Cut: a long line cut (a cross when ascended) | +10% damage |

- **In a fight** it walks at her shoulder, goes after whatever threatens her (never far from her), uses its signature
  on a cooldown, and when it falls it re-forms beside her 7 s later. Its blows use its own strength (its level, a
  little of her damage), add a little to the moon, not to her combo, and do not shake the camera. Its hazards are drawn
  in its colour. The HUD shows it under her bar: name, stage and level, health, the signature charging (a ring).
  Not in the guided tutorial, the showcase or the theatre.
- **Growing**: soul shards come from every fight (more for kills, guardians, first wins; a few for a defeat). Levels
  1–10 (costs 15 → 170, 710 in all; one soul can be grown fully by the end of the climb and a second most of the way).
  Each level adds 8.5% strength and health. It **changes as it grows**: a pale wisp (1–3), bound (4–7: solid in its
  colour with a rune ring, and its bond gift for her), ascended (8–10: a cold flame, larger, its signature empowered
  and 15% faster).
- **Freed**: a reveal screen as each soul rises (after the result, or on the way to the map for an older save);
  the result shows the shards and a badge. The **Souls** page (from the map bar): the freed souls in a list, the chosen
  one at the altar, its stages, level, abilities, *Take into battle* and *Strengthen*.
- Balance (`test/sim-test.js`, the Ashen Waste, bot skill 0.55): a soul does 13–19% of the damage at level 1 and
  23–51% at level 10. The campaign walk (`test/campaign-test.js`, souls on; `nosoul` as the 6th argument turns them off)
  averages 97% win (94% without), the First Cut 75%.

## The menus' scenes

(2026-11-11, the author: "the menus... are all kinda shit, we can do epic animated backgrounds, effects, better
scenery and icons".) Every menu page now stands over its own animated place, drawn at pixel resolution with the
title's kit (`js/menuscene.js`), from the game's own cast, iso tiles and light textures; the panels stand to one side:
the **Gathering** (heroes: the chosen hero on the bridge under the moon, braziers burning, the others behind her and
the locked ones in shadow; pointing at a hero brings them forward), the **Forge** (gear: a hearth roaring, torches,
the hero striking the anvil stone, sparks), the **Vigil** (skills: a starfield with three constellations in the
branches' colours, the hero kneeling in a rune circle), the **Soul Altar** (souls: the freed souls turning round the
altar in a shaft of light), the **Endless March** (modes: the Spire, lightning, the dead marching), and the Spire at
rest for settings and the rest. New forge icons (`tools_forge_acts.py`): soul shard, souls, bond, ascend, and the
modes' emblems (endless, daily, achievements, New Game+).

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
turning round a cross among the spires) and the Moon's Altar (a ring of fire vents round its centre,
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
Settings: difficulty, music, sound, screen shake, auto battle (off by default; older saves were
switched off once; `?auto` turns the bot on for one visit and is never saved), text size (90–130%), colour-safe cues
(blue and orange attack warnings instead of white and red), save export (a file and a copied
code) and import.

**Dev tools → Watch the bot play** (or `?watch`, `?watch=4` for speed): the bot plays the campaign from wherever
the save is, hands-free: the films and story scenes advance on their own, every fight is auto battle, results and
lesson cards are confirmed, and the map picks the next open island. On each map visit it spends skill points
(dash first, then the heavy, the skills and the moon art) and equips its best gear. After two defeats in a row on
the same island it grinds a cleared battle first; after six on one island it stops and says which. **Watch speed**
runs fights at 1×, 2× or 4×. Any key or tap stops it (that press does nothing else). In a test run it cleared 27
islands in 10 minutes. The bot cannot pass the no-hit echo (Echo: The First Cut); the campaign test reports that
too.

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
- **Readability**: a red ring under the knight, white rings under foes; a soft glow and sparks where
  a blow lands, a slash on dash-cuts, a burst on the arts. No cross-shaped hit sparkles, no hit
  counter, no crosshair following the mouse, and no damage numbers unless Settings → Damage numbers
  turns them on (off by default; older saves were switched off once) (the author, 2026-11-10).
  Impact frames only for boss moments.
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
