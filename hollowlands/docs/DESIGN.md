# HOLLOWLANDS: design foundation v0.1

Working title. A mobile-first, single-character dark fantasy survival and exploration RPG.
This file has four parts: what the reference video shows, the design, the technical architecture,
and the decisions still waiting for the author.

Status labels: **Locked** = the author's requirement. **Built** = in the slice and tested.
**Proposal** = invented for the slice, needs the author's approval before it becomes canon.

---

## 1. Reading the reference video (evidence only)

The clip is 76 s, 576×576, 30 fps, a social-media cut that switches between a battlefield and item panels.

| What it shows | What it does not show |
|---|---|
| A very high camera looking almost straight down, with a slight tilt so tall things show their side (the tower is a cylinder whose wall runs up the screen) | A playable single character, how it moves or fights |
| Tilt-shift focus: the top and bottom of the frame are blurred | Exploration, puzzles, enemy behaviour, collision rules |
| Huge scale contrast: a tower many times taller than the tiny units around it | The renderer, the world units, frame counts of animations |
| Pale ash and stone ground, dithered and halftone patterned, with tiny dark ticks like stubble | |
| Red as the only strong accent (the crowd of tiny red figures); everything else greys and charcoal | |
| A dark rounded vignette and grain over the whole picture | |
| Lit doorway: the tower door turns warm cream when opened | |
| UI: a charcoal full-screen panel, thin dotted frames with small square corners, cream pixel text, a grid inventory whose filled cells are tan and speckled, an item card ("Key / --- / Opens a lock. / (Unlock)"), a cream progress bar, a counter "x 14", three framed equipment slots | |

The horde in the clip is treated as a picture of scale and mood, not as a mechanic. Hollowlands is one
character, never an army.

## 2. The design

### Pillars
1. **Curiosity.** Landmarks, clues and odd objects pull you; no objective arrows.
2. **Vulnerable, then capable.** Early fights can kill you; skill and gear make you confident.
3. **Loot with consequences.** A new weapon changes reach, rhythm, ultimate and silhouette.
4. **Uneven rhythm.** Quiet walking, then an ambush, a puzzle, a wave event, a boss.
5. **A coherent ruin.** Carts, wells, graves and cellars tell the story without walls of text.

### The loop
See a landmark → choose a route → explore → beat a fight, puzzle or obstacle → loot and clues →
open a shortcut → rest at a fire (heal, craft, save) → choose the next place.

### Controls (Built)
Left thumb: floating joystick anywhere on the left half. Right thumb: a large attack button (tap to strike,
hold to charge a heavy blow), roll, a context button that appears with its label next to it
("Search", "Unlock", "Turn the crank"), the quick item, and the ultimate once you own the Bell Shard.
Tapping empty space on the right also strikes. **Drag to aim** (v0.3): press the attack button and drag; a
cream arc shows the swing on the ground and the strike goes that way on release; a quick tap strikes the
nearest foe; holding past 0.4 s charges a heavy blow. **Dash** replaces the roll: a 0.17 s burst that
passes through attacks and foes. **Story and direction** (v0.3): an opening cutscene and short ones at the
tower, the crypt and the Keeper (skippable, they also go in the journal); an objective line always on screen
and a guide marker or edge arrow toward it (can be turned off in System). Held upright, the game turns itself a quarter
so you can play by rotating the phone, even in viewers that do not rotate. Soft targeting turns your swing toward the nearest foe;
nothing auto-plays. Keyboard: WASD, J attack (hold for heavy), Space roll, E interact, Q item, R ultimate,
C swap weapon, Tab pack, M map.

### Combat feel (Built)
Acceleration and braking on the stick, three-hit combo with a heavier finisher, charged heavy blows,
a roll with invulnerability frames, one stamina bar, hit-stop, white hit flash, knock-back, red sparks,
small screen shake (can be turned off), synthesised impacts, footsteps that change on ash, stone and wood.
Every enemy attack has a red ground telegraph (ring, arc or aim line) that stays readable at this distance.

### Weapons (Built: three of the six proposed families)
| Weapon | Where | Feel | Ultimate |
|---|---|---|---|
| Rusted Sword (Common) | by the cart | balanced, 3-hit combo | Grave Arc: full-circle cleave |
| Ashwood Spear (Forged) | locked storehouse | long, narrow thrusts | Ashen Drive: rush through a line |
| Bellbreaker (Named) | the Keeper | slow, breaks any guard | King's Fall: ground-crushing blow |

Weapons are tempered twice at the anvil (+18% each) with iron scrap and bone dust.
Armour changes the sprite: Tattered Cloak, Gravecloth Coat (−15% harm), Rustbound Plate (−28% harm,
12% slower, adds pauldrons). Relics: Bell Shard (ultimates), Ember Charm (stamina returns faster).

### Foes (Built)
| Foe | Behaviour | The answer |
|---|---|---|
| Ash Drifter | wanders, notices you ("!"), crouches, lunges | roll the lunge, punish the long recovery |
| Carrion Hound | circles, then pounces | dodge: a missed pounce leaves it dazed and taking extra damage |
| Grave Archer | keeps its distance, shows an aim line, arrows stop at walls | break line of sight, close in |
| Rustbound Guard | shield blocks hits from the front, slow turning, telegraphed slam | heavy blows or Bellbreaker break its guard; circle behind |
| Rootlurker | hidden as a mound in the trail, erupts, roots strike where you stand | keep moving, hit it while it is up |
| The Bellworn Keeper (boss) | chain sweep (arc), delayed slam (ring), bell toll shockwave (roll through it), summons at 55% and 25%, faster below 35% | strike a resonator while it glows to stun the Keeper for 4 s and take 60% more damage; beatable without it |

Enemies are placed by hand. Resting at a fire brings ordinary foes back; unique foes stay dead.

### Survival (Built, deliberately light)
Health, stamina, scarce poultices, food that regenerates over time, fire flasks, materials for crafting
at fires. No hunger, thirst or durability chores. The crypt is dark: your lantern and braziers are the light.
**Death costs nothing:** you wake at the last fire with everything you carried (a punishment level
is still the author's call, see section 4).

### The slice map (Built)
```
 [wreck]--ROAD-->[Ashwick square: well, Maren's fire, fallen bell]--east-->[Crowshade Trail]
    houses A/B, smithy (crank), locked storehouse (spear),     waystones (eye, bell, moon)
    graveyard, chained chapel (shortcut, opens from inside)     ruined bridge, hound hollow
                                                                ring of stones -> root wall -> glade (coat)
                                                                guard camp (plate, gate key)
                                                                THE TOWER (locked) ---+
 Bellroot Underchapel, floor 1: fire, hall, ossuary (crypt key), resonance chamber    |
   (three bells -> vault with Bell Shard), iron door, crank hall (3 waves) -> gate    |
 Floor 2: the Keeper's hall (resonators) -> bell door -> stairs up into the chapel ---+
```
Critical path: sword → cart → smithy crank → well → storehouse key → (spear) → forest → guard camp →
gate key → tower → ossuary key → iron door → crank waves → Keeper → Bell Key → chapel → lift the bar
→ Maren → end card. Optional: the stones puzzle and glade, the bell vault (ultimate), the anvil,
crafting, houses, the hollow.

### Puzzles (Built)
1. **Well:** the winch has no handle; the smith's chest has the crank; the bucket brings up the storehouse key.
2. **Ring of stones:** three waystones on the trail each show a glyph; turn the stones to eye, bell, moon;
   the root wall to the glade withdraws.
3. **Resonance chamber:** scratches read "low, high, between"; strike the large, the small, then the middle
   bell. Each toll shows its name on screen as well as sounding (accessibility).
4. **Physical:** keys, the crank that raises the gate (a wave event), a bar that opens the chapel only from inside.

### Waves (Built)
Turning the crank raises the gate slowly and seals the iron door behind you. Three waves:
drifters; drifters and archers; the guard, hounds and drifters. A cream progress bar ("The gate rises")
fills as you win, as in the reference. Dying resets the event; nothing else is lost.

## 3. Technical architecture

**Platform: HTML5 canvas, plain JavaScript, no build step (Built).** It runs on an iPhone or a PC from a
link, which is how these projects are playtested today; there is no Mac/Xcode here for a native iOS build.
It can be wrapped later (Capacitor) or ported. The systems are plain data and state machines, so a Godot
port stays possible: the layouts, item tables, foe tables and save format move over as they are.

**Rendering (v0.2, 3D).** `js/render3d.js` builds each map as a lit low-poly scene with three.js
(vendored in `vendor/`, MIT licence): a camera high above and 56° down with a narrow lens, a low sun with
real cast shadows, haze, and every tree, rock, wall, building and prop made from merged primitives (few draw
calls). The frame is rendered at the same low resolution as before and finished by one shader pass:
tilt-shift blur at the top and bottom, a gentle grade that keeps red as the accent, ordered dithering to a
limited palette, a rounded vignette and grain. Characters are small jointed figures (legs swing, the weapon
follows its real swing). Telegraphs are red ground decals. The pixel UI is drawn on a second canvas on top.
If WebGL is missing, the original 2D renderer below is used instead.

**Rendering (2D fallback).** A low-resolution buffer (about 420×195 on a landscape phone) scaled by a whole number
to the screen, so every pixel is crisp. Order each frame: pre-rendered ground for the map → interior floors
and back walls of the building you are in → telegraphs and ground effects → shadows → everything else
sorted by its feet (props, trees, buildings, foes, the Wayfarer) → a see-through silhouette when you are
hidden behind a roof or canopy → particles → cloud shadows and falling ash outdoors, or the light mask
underground (rendered at half resolution so light falls off in pixel steps) → tilt-shift focus bands →
vignette → grain → UI.

**Art pipeline (Built).** Every image is drawn by code at boot (`js/art.js`): trees from overlapping
lit blobs with ordered dithering, the tower as a shaded brick cylinder, buildings with roofs, walls,
doorways and interiors, props, item icons and a 5×7 pixel font with descenders (`js/util.js`). Characters
are drawn live at native size from layered shapes, so the weapon in hand follows its real swing angle.
Ground is rendered once per map from tiles, warped borders and noise, quantised through a 4×4 Bayer matrix.
Sound is synthesised with WebAudio (`js/audio.js`): bells use inharmonic partials.

**Collision.** A 4-px grid per map with two bits (blocks movement, blocks sight). Tiles, building walls with
doorways, props and tree trunks are rasterised into it; doors live on a separate dynamic layer. Movement
slides along walls with a small corner nudge. Arrows and aiming use the sight bit.

**Code layout.**

| File | Role |
|---|---|
| `js/util.js` | namespace, math, deterministic noise, canvas helper, the pixel font |
| `js/art.js` | palette, every sprite and icon, character drawing |
| `js/audio.js` | synthesised sound and ambience |
| `js/data.js` | items, weapons, ultimates, recipes, foes, notes, survivor lines (pure data) |
| `js/maps.js` | the outdoor map and the two crypt floors: layout, objects, enemy placement (pure) |
| `js/world.js` | a loaded map: collision, ground render, statics, buildings, buckets for culling |
| `js/save.js` | inventory rules and the versioned save with a backup slot (pure) |
| `js/actors.js` | the Wayfarer, foes and the Keeper (state machines), hits, effects |
| `js/ui.js` | input, HUD, controls, item/map/journal/system screens, fire, anvil, dialogue, title |
| `js/game.js` | state, interactions, puzzles, waves, boss, saving, transitions, the frame |

**Save.** JSON in localStorage, version 1, with the previous save kept as a backup and validated on load.
It holds the map, position, health, ultimate charge, inventory, equipment, tempering, every flag (opened
containers, taken items, doors, puzzle states, killed unique foes), the journal, the last fire, the explored
map (run-length packed) and settings. Saves on every important event, at fires, on map changes, every
45 s outside combat and when the page is hidden (app switch or close).

**Performance.** One pre-rendered ground image per map, static scenery in 64-px buckets so only what is on
screen is considered, a capped particle list, lights at half resolution, deep forest drawn into the ground
and only the forest edge as sprites. Headless Chromium without a GPU holds the 60 fps frame cap.
**Not yet measured on a real phone.**

**Tests.** `test/play.js` (a bot plays the whole slice in a real browser, fights with real inputs, and a
walkability search proves every lock blocks before it opens and frees after), `test/touch.js` (pointer
events on the on-screen controls at iPhone size), `test/shots.js` (screenshots of every area).

## 4. Waiting for the author (nothing here is canon yet)

1. **Proposal:** the Great Silence, bells as locks under the kingdom, the bell-warden, Ashwick, Crowshade,
   Bellroot Underchapel, the Bellworn Keeper, Maren, Blackfen as the next region. All placeholder text is in
   `js/data.js` and can be swapped freely.
2. The Wayfarer's look, identity and story; customisation or not.
3. Which of the six weapon families ship (three are built), and whether magic is a weapon family or relics only.
4. How hard death should be (now: nothing is lost) and whether food or durability should matter more.
5. Whether boss puzzles stay optional advantages (now: resonators are optional).
6. Camera and art details after a look on a real phone: character height (now about 11 px), zoom,
   tilt-shift strength, palette, UI scale.
7. Engine for production (now: HTML5; a Godot port is possible), control layout, inventory style
   (now a simple grid; the reference shows shaped items in the grid).
8. Region and character names, endings, the final boss.

## 5. Next gates
Phone playtest of feel and readability → fixes → second region (Blackfen) only after that.
