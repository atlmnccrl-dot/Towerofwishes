# Tower of Wishes: asset list

Today the game uses no art or audio files. Every character, arena, effect, icon and painted scene is drawn in code. This list covers what real assets would replace or add.

**Priority**
- **P1**: the playable slice and the opening (TW-001–082). Build these first.
- **P2**: Aerys, the sky beast, Nox and the Nightcrawler (TW-083–130).
- **P3**: everything after that, in inventory order. Where the inventory marks something OPEN it is flagged, and nothing is invented for it.

---

## 0. One decision before any art is made: the camera

The fight and scene camera rotates around the action (it is a 3/4 view, not a fixed side view). This decides how characters have to be drawn:
- **Option A (recommended): keep the rotating camera.**
  - Characters need **8 facing directions** (front, back, both sides, four diagonals). Mirroring cuts the drawing to 5.
  - Arena ground is painted **straight down (top view)**.
  - Props, walls and trees are separate standing pieces.
- **Option B: lock the camera** to one angle per arena.
  - Characters need only 2–3 directions (cheaper).
  - Arenas can be painted as one picture.
  - The cost is losing the swinging cinematic camera in fights.

Tell me A or B before commissioning. Everything below assumes **A**.

## 1. File formats (for every asset)

| Kind | Format | Notes |
|---|---|---|
| Rigged characters and creatures | **Spine 4.x export: `.json` + `.atlas` + `.png`** (premultiplied alpha) | One rig per character, 8 directions (5 if mirrored). The game would add the free Spine web runtime. DragonBones JSON is a second choice. |
| Fallback if no rigging | **PNG sprite sheets + JSON frame data** (TexturePacker "JSON hash") | 8 directions × every animation. Much more drawing. |
| Character art source size | Full body about **512 px tall** at 1× | The game draws at 2× on phones. |
| Close-ups (heavy-art shots, cut-ins) | **PNG, about 1024 px tall** | Head and shoulders, plus 2–3 expressions. |
| Equipment shown on characters | **Separate skins/attachments inside the Spine rig** | Slots: main weapon, off-hand, head, body, cloak. This must exist before the gear roster can show gear on characters. |
| Arena / map ground | **PNG tiles 1024×1024**, painted top-down at **64 px per metre** | Large maps are cut into tiles. |
| Standing props (walls, trees, tables, crates) | **PNG with transparency** plus a footprint (circle or box, in metres) | Placed and sorted by depth in the engine. |
| Map layout data | **Tiled map editor `.tmj` (JSON)** | Collision shapes, spawn and exit points, triggers (talk, examine, fight, cutscene, exit), objective marker, camera bounds. |
| Item icons | **SVG** (preferred) or PNG 256×256 | 39 are drawn in code today; the final equipment roster is still waiting. |
| UI icons | **SVG** | |
| Painted backgrounds / key art | **PNG or WebP, 2560×1440** | Only where a moving scene is not possible. The author does not want still screens, so keep this minimal. |
| Effects (optional) | PNG sprite sheets, or Spine | The procedural effects already work. Replace only where art is clearly better. |
| Music | **`.m4a` (AAC) + `.ogg`**, 44.1 kHz, loopable with loop points noted | There is no sound in the game at all today. |
| Sound effects | **`.m4a` + `.ogg`**, mono, short | |
| Fonts | `.woff2` with a web licence | Currently loaded from Google Fonts. |

---

## 2. Characters (rigged, 8 directions)

### Animation sets
Every rig uses these sets. The extra animations for each character are listed in the table below.

- **Base set (every fighter):**
  - idle; walk; run; sprint
  - basic attack in three parts (wind-up, strike, recover)
  - parry; dodge
  - hit react; stagger
  - knocked down → get up; KO / fall
  - victory pose
- **Scene set (everyone who appears in story scenes):**
  - talk idle
  - gestures: point, arms crossed, hands on hips, hand to chin, laugh, shrug, sit, sit-and-eat, sip
  - pick up / plant object; look up

| Character | Pri | Extra animations / notes |
|---|---|---|
| **Kael** | P1 | Sword combo (2–3 swings); riposte; the sword-plant entrance (drop from height, plant, draw); thrown into a wall; Kael's sword heavy art; sheathed and drawn sword states. 2 close-up expressions. |
| **Eiryn** (now) | P1 | Glyph cast (wind-up, release); Pressure push; Force Lance (heavy art); spell fizzle; exhausted / drained idle; floating-object hold (Guild test); tea glyph. Close-ups. |
| **Eiryn** (before the Reset, 150 years earlier) | P1 | Different outfit. Rooftop run and leap; landing; feet close-up (a separate close-up asset); Pressure launch; being caught; hug; screaming at the Reset. |
| **Alric** | P1 | Rooftop run and leap; catch; street stroll; shield-over-Eiryn pose. **Beast/vampire form** is a separate rig or a transformation: transform sequence, shielding pose. Design is OPEN: I need your description or a reference image. |
| **The unknown climber** | P1 | Climb / entrance; underling-kill strike; last-stand transformation; Dark Legion heavy art. Whether he is named is an open question. |
| **Climber's underlings** (1 design, recoloured) | P1 | Base set; die-on-screen. |
| **Bandits ×4**: broad-shouldered, knife, grabber, lookout | P1 | Base set; circle and taunt; flee off-screen. |
| **Spearwoman** (tavern) | P1 | Scene set only. |
| **Tavern patrons** (4 bodies × 3 colourways) | P1 | Scene set; "…" murmur reaction; crowd to the window. |
| **Ashgate townsfolk** (4 bodies × colourways) | P1 | Walk; idle; scene set. Also the before-the-Reset street crowd. |
| **Gate guard; older guard (officer)** | P1 | Scene set; the issuing-the-fine gesture. |
| **Registrar; evaluator** | P1 | Scene set; writing at the counter. |
| **Shopkeeper** (general store) | P1 | Scene set. |
| **Miller** | P1 | Scene set; worried gestures. |
| **Goblin; goblin spear; goblin archer; goblin hexer** | P1 | Base set plus: archer draw and release; spear lunge; hexer cast; tear at a sack (scout); cry out; die on screen; flee (the last survivor). |
| **Ogre** | P1 | Big rig. Beam sweep; overhead smash; ground slam; grab and throw; stagger; walking with the beam on its shoulder; rising from the dark (reveal); driven into the wall and dying (finisher). |
| **Aerys** | P2 | Spear of Light (hands close, spread, spear forms, grab, throw); sword throw; crash-and-brawl; close-ups. |
| **Sky beast** | P2 | Flying, swooping, crash landing, ground brawl, death (Eiryn's finishing spell). Large rig. |
| **Rival kid** | P2 | Scene set plus base fight set. |
| **Sword-shop owner** | P2 | Scene set. |
| **Nox** | P2 | Daggers (and ice-dagger variant), blink-step, base set, close-ups. Guild Hall execution scene poses. |
| **Nightcrawler** | P2 | Creature rig; details per inventory TW-108–130. |
| **Eloryn** | P3 | Healer cast; heal; the overload (TW-341–355, her death is canon); clinic scene set. |
| **Braxen** | P3 | Shield bearer; brass knuckles; frost-scar variant (a persistent wound, Floor 1). |
| **Beast Folk** (2–3 bodies) | P3 | Scene and base sets. |
| **Dragon** | P3 | Large creature rig. |
| **Black Knight** | P3 | Base set plus his signature attacks (per the inventory). |
| **Horned Master Knight** | P3 | Floor 1 flagship duel vs Eiryn. |
| **Calamity** | P3 | Boss for a vertical arena; adds (minions). |
| **Altheryx** | P3 | Boss, Hall of Offering. |
| **Tournament fighters** (generic, 3–4 bodies) | P3 | Base set. |
| **Dead climbers** (Floor 1 corpses) | P3 | Static poses. |
| **Guardian** | P3 | **OPEN in the inventory: not designed yet.** |

---

## 3. Maps and arenas

- **Walkable maps** are places the player moves through: ground tiles + props + a `.tmj` layout.
- **Arenas** are fight spaces, about 20×11 m.
- Sizes below are in metres; at 64 px per metre, multiply by 64 for pixels.

| # | Place | Type | Size | Pri | Contents |
|---|---|---|---|---|---|
| 1 | **Old-city rooftops** (before the Reset) | Cinematic set | 4–5 rooftops in a chain, about 60 m | P1 | Gaps to leap, chimneys, a ledge view to the Tower; later the pillars and flood. |
| 2 | **The living street** (before the Reset) | Cinematic set | about 40 m | P1 | Market stalls, crowd, a view of the Tower (the horn sounds). |
| 3 | **Tower summit / climber's arena** | Arena | 20×11 | P1 | Exists in code; would be repainted. |
| 4 | **The Reset** | Painted cinematic | n/a | P1 | **Protected: keep the current painted skyfire-and-flood shot as it is.** Only the rooftop pillars and flood scenes after it are new. |
| 5 | **Kael's tavern** (Ashgate) | Walkable | 17×10 | P1 | Door on the east wall, windows on the north wall, bar, hearth, 5 tables, stools, notice board. |
| 6 | **Ashgate street at night** (outside the tavern) | Walkable | about 30×12 | P1 | Lamps, well, the north road; the glyph visible in the sky. |
| 7 | **North road to the treeline** | Walkable sprint path | about 60 m | P1 | |
| 8 | **The clearing** | Arena | 20×11 | P1 | Fallen trunk, the bank Kael drops from, trees. |
| 9 | **Road to Ashgate** | Walkable | about 80 m | P1 | Collapsed mile markers, rebuilt bridge, farm cart, road shrine, town walls in the distance. |
| 10 | **Ashgate centre** | Walkable hub | about 60×40 | P1 | Gate, square, inn, tea stall, guard post, market, general store, Guild door, the tavern door. Night and day versions. |
| 11 | **Inn room / inn common room** | Walkable | 12×8 | P1 | |
| 12 | **Guild Hall interior** | Walkable | 18×10 | P1 | Registration counter, contract board (interactive), benches, banners. |
| 13 | **Evaluation Yard** | Arena / walkable | 20×11 | P1 | Stone block and target mark (Eiryn's test). |
| 14 | **General store** | Interior | 8×6 | P1 | Shelves, counter. Can also be a UI screen with a painted background. |
| 15 | **The mill** | Walkable | about 30×20 | P1 | Mill house, sheds, stream, wheel. |
| 16 | **Quarry hill** | Walkable + 2 fight zones | about 120 m | P1 | Spilled grain, broken sacks, footprints (tracking clues); the scout spot; the skirmish zone; a marsh as scenery. |
| 17 | **Quarry floor and cave mouth** | Walkable | about 30×20 | P1 | Cart track, loading frame, sacks, the huge footprint. |
| 18 | **Cave interior** | Arena | 20×11 | P1 | Narrow tunnels, cooking fire, stolen crates, basin. |
| 19 | **Ogre chamber** | Arena | 22×12 | P1 | The quarry wall the ogre is driven into (it needs a broken/impact version), pit, torches. |
| 20 | Sky-beast road / crash site | Arena + walkable | | P2 | |
| 21 | Sword shop | Interior | | P2 | |
| 22 | Guild Hall execution scene | Same set as #12 | | P2 | |
| 23 | Nightcrawler locations | Per inventory | | P2 | |
| 24 | Blizzard pass | Walkable + arena | | P3 | |
| 25 | **Labyrinth, 7 depths** | 7 arenas + connecting maps | | P3 | One tileset, 7 variants. |
| 26 | Eloryn's clinic | Interior | | P3 | Replaces the tavern in her scenes (playtest note). |
| 27 | Braxen's hamlet | Walkable | | P3 | |
| 28 | Beast Folk country | Walkable + arenas | | P3 | |
| 29 | Dragon's lair | Arena | | P3 | |
| 30 | Tornado Country | Walkable + arena | | P3 | Black Knight fight. |
| 31 | Tournament arena | Arena | | P3 | |
| 32 | Tower City | Walkable hub | | P3 | |
| 33 | Last campfire | Cinematic set | | P3 | |
| 34 | Tower Floor 1 | Arenas (6 duels) | | P3 | Dead climbers. |
| 35 | The staircase | Walkable | | P3 | |
| 36 | **Calamity arena (vertical)** | Arena, vertical layout | | P3 | |
| 37 | Hall of Offering | Arena | | P3 | |
| 38 | False Feast; Floor 4 | Arena / sets | | P3 | **Floor 4 victory conditions are OPEN.** |
| 39 | Guardian's arena; epilogue | | | P3 | **OPEN.** |

**World map:** one painted map, **4096×2304 PNG**, plus a fog layer and location pins (SVG).
- Unchanged for P1. The current one is drawn in code.

---

## 4. Effects (all exist in code; replace only if art is wanted)

| Effect | Pri |
|---|---|
| Slash trails (sword, daggers, claws) | P1 |
| Hit sparks; parry flash; dodge afterimage | P1 |
| Attack telegraphs on the ground: arc, line, circle | P1 |
| Glyph circles: Eiryn's purple; the big rotating formation over the treeline and its failure | P1 |
| Pressure push; **Force Lance** (the ogre finisher) | P1 |
| Spell fizzle; dust and leaf bursts; landing impact; wall-impact cracks | P1 |
| Climber: dark-magic transformation; **Dark Legion** | P1 |
| Kael's sword heavy art | P1 |
| The pillars and flood after the Reset; Alric's beast-shield; the preservation effect | P1 |
| **Aerys's Spear of Light** (forming between the hands, thrown) | P2 |
| Elemental gear effects: fire wave + burn, ice + freeze, storm chain, quake | P2 |
| All Out aura | P1 |
| Heal glow; Eloryn's overload | P3 |

**Format:** PNG sprite sheets, 256 px frames at 12–24 fps, additive-blend versions where they glow; or Spine.

---

## 5. UI

| Item | Format | Pri |
|---|---|---|
| Logo / wordmark (light and dark) | SVG | P1 |
| Title-screen key art (or a moving title scene, as now) | PNG 2560×1440 | P1 |
| HUD icons: crown (host), ATTACK, SPECIAL, ALL OUT badge, withdraw flag, pause, speed, follow | SVG | P1 |
| Character portraits for the HUD cards and the subtitle name plate, every playable and named character | PNG 512×512 | P1 |
| Item icons (final equipment roster pending; 39 are drawn in code now) | SVG | P1 |
| Coin / money icon; shop UI frame | SVG | P1 |
| Spirit-tree skill icons, one per skill | SVG | P2 |
| Bestiary entry art, one per enemy | PNG 1024 | P3 |
| Fight rank stamps S / A / B / C / D | SVG | P2 |

---

## 6. Audio (nothing exists)

**Music** (loops, m4a + ogg):
1. Title theme
2. Before the Reset (calm city)
3. The Reset (cinematic cue, not a loop)
4. Tavern / town
5. Road / exploration
6. Battle (normal)
7. Battle (boss)
8. Victory sting
9. Defeat sting
10. Tension / cave
11. Sad / loss theme

Later: one theme per arc.

**Sound effects** (P1 list):
- **Combat:**
  - sword swing, hit, parry clang, dodge whoosh, body fall
  - glyph charge, glyph release, Pressure impact, spell fizzle
- **Ogre:** roar, sweep, slam; goblin cries; arrow release and hit
- **Movement:** footsteps (stone, wood, grass, dirt); sprint; leap; landing
- **Events:** the Tower horn; Reset rumble, fire and flood
- **Places:** tavern ambience and murmur; street ambience; cave drips and wind
- **UI:** tap, confirm, back, All Out trigger, level up, item found, coins

**Voice:** none planned. Subtitles only, unless you want voices.

---

## 7. What can stay procedural (no purchase needed)
- Telegraphs, damage numbers, screen shake, speed lines, light washes
- The camera and director
- The current effects, until better art exists
- The protected Reset painting stays exactly as it is.

## 8. Decisions needed from you
1. Camera A (rotating; 8-direction characters) or B (fixed; cheaper art).
2. Spine rigs (recommended) or hand-drawn sprite sheets.
3. Alric's beast form: a description or a reference image.
4. The final equipment roster, which drives the item icons and the equipment slots on the rigs.
5. Voices: yes or no.
