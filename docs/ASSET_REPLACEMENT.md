# Asset replacement: what is real art now, what is still drawn

Status after the 2026-10-22 pass. "Drawn" means made in code (vector shapes); "pixel" means
the author's asset packs.

**Rule:** once everything in section 2 is replaced, **redo the opening cutscene** to fit the
pixel art (section 4).

---

## 1. Replaced with the author's assets

| Area | Now uses | Where |
|---|---|---|
| **Characters (63 sets)** | Character Creator 2D Fantasy exports | `assets/pixel/`, `js/sprites.js` |
| Kael, Eiryn, Alric, Aerys, Nox, Eloryn, Braxen | creator sets (Kael: sword or unarmed; Eiryn: caster or branch; Aerys: also the Spear of Light; Braxen: also frost) | every fight and scene |
| Bandits, skeleton raiders (were goblins), Skeleton Warlord (was the Ogre), climber, Fragments | creator sets | fights |
| Skyreaver, Night Creature, ruin beasts, the Stray | creator stand-ins (person body + creature parts), scaled up | fights |
| Townsfolk, guards, Guild staff, merchants, tavern | creator sets (Erdra before the Reset, Ashgate after) | scenes |
| Later cast (ready, not in scenes yet) | rival kid, hooded follower, Cassius, Lyra + golems, frost assassin, Black Knight, Gothic knights, Elder Dragon, poacher, Beast Folk, hamlet folk and predators, caged creature, Labyrinth citizen, demon broker, guild adventurer, sword-shop owner | `PIXEL_CAST` in `js/sprites.js` |
| **Fight effects (133)** | Pixel VFX Essentials, KILN FX, Magic Spells VFX Lite, Free pack 6 slashes, FX pack 13 | `assets/fx/`, `js/render/pixelfx.js` |
| Hits, crits, parries, blocks, dodges, knockdowns, KOs | hit sparks, parry flash, dust | every fight |
| Swings | slash per weapon: sword, dagger, thrust, claw, cleave, fire or ice slash, dark slash | every attack |
| Projectiles | arrow, magic missile, energy bolt, homing orb, ice shard, rock | archers, casters, hexers, Calamity |
| Magic | teleport, heal, failed glyph circle, freeze, shatter, lightning, quake, dissolve, fire, burning | events |
| Heavy-art impacts | arcs and shockwave (Rising Cut), summons (Dark Legion), holy light (Spear of Light), heal bloom (Life Surge), zaps (Force Lance), rock burst (Bone Breaker), multi-hit (One Step), shockwave (Pressure) | cutscenes |
| All Out, exhausted, burning | fire ring, embers, steam, flame | fighters |
| **Arenas (15 themes)** | Pixel Art Top Down Basic (Cainos), TopDownFantasy Forest, Forest & Village and Castle & Dungeon tilesets (reodesuxz), EPIC RPG Ancient Ruins, Dark World | `assets/tiles/`, `js/render/tiles.js` |
| | clearing, quarry path, cave, deep passage, north road, ruins, Guild yard, tavern, Guild office, grassland, dead farms, night camp, Shadow City, Floor One hall, Hall of Offering, Calamity's corridor | fights and scenes |
| **Interface** | Free Medieval Fantasy UI Pack (Kibyra), Adventurer font | pause and withdraw buttons, ! and ? reaction marks, every gear icon, fight lettering |
| **Sound** | Fantasy UI SFX Free (heyheythere) | buttons, menus, chapter cards, fight start, heals, wins, loot, level-ups, equipping |

---

## 2. Still drawn: what's needed to finish

### Characters and creatures
Stand-ins made from packs already delivered (replace them when the real exports arrive):

| ID | Who | Stand-in now | Real art needed |
|---|---|---|---|
| `knightSword`, `knightAxe`, `knightFist`, `knightSpear`, `knightTwin` | **Frost Knights**, Floor One | the Gothic knights recoloured ice blue (`frost_knight_a`, `frost_knight_b`). The weapons don't match the axe, fist, spear and twin-blade knights | creator sets in icy armour, one per weapon |
| `knightMaster` | Horned Master Knight | the Black Knight recoloured pale steel and gold (`master_knight`), no horns | creator set |
| `thug` | Shadow City thugs | the broad and knife bandits in city greys (`thug_a`, `thug_b`) | creator sets |
| `echo` | Tower echoes | a Fragment with gold cracks (`echo`) | |
| `warden` | The Drowned Bell | the Night Creature in sea green (`drowned_bell`) | a design |
| `veil` | **Kharuun / the Unseen** | built only from pixel effects: a dark curse, a swirling portal and sparkles. It is never shown whole, which fits the book | custom art, if wanted |
| `calamity` | **Calamity** | pixel effects: blue flame on its left, fire on its right, a dark core | custom art (creature) |
| `golem` | the Guild's Practice Block | the training dummy from the Castle & Dungeon tileset | |
| `ren`, `mara`, `brannoc` | the old starter heroes | still drawn | only if they stay (older manuscript) |
| Dialogue cut-in portraits | heavy-art and face-off panels draw faces | still drawn | portrait art per main character |

### Effects and fight overlays
| What | Needs |
|---|---|
| Heavy-art **cutscene panels** (slanted manhwa panels, Force Lance beam, Rising Cut blade glow, Dark Legion giants) | Pixel versions, or a simpler pixel cutscene (zoom, flash, pixel effect). |
| Attack **telegraph zones** (red and blue wedges), boss hazard marks | Could stay as clean shapes. Pixel option: Pixel VFX "Cast Circle" or "Fire Ring" tinted. |
| HP bars, team rings, follow ring | Code UI; restyle to match the UI pack's frames. |

### Places
| What | Needs |
|---|---|
| Prologue city: **rooftops**, **square**, **summit** | Kept painted on purpose; they're rebuilt with the opening (section 4). |
| Story **backdrops** (`backdrop.js`: full-screen painted stills for some scenes) | Pixel scenes, or replace each with a staged pixel arena. |
| **World map** (`map.js`, painted) | A pixel overworld map (the tilesets can build one). |
| **Spirit-tree** skill screen | Pixel frame and icons (UI pack). |
| Title logo, menus, result screen, Team screen | CSS styling. Pixel option: the UI pack's wooden and stone buttons and frames. |
| Scene props held in hands (mugs, bread, the branch Eiryn picks up) | Small pixel props (Castle & Dungeon items have bread, potions, a sword). |
| Sitting | The creator has no sit pose; patrons crouch behind tables. Needs custom frames or a crop trick. |

### Sound
| What | Needs |
|---|---|
| **Music** | None yet: title, town, forest, fight, boss and Tower themes. |
| **Combat sound** | Sword hits, punches, parries, dodges, magic, creatures. The UI pack doesn't cover these. |

---

## 3. Received but not used (and why)

| Pack | Why not (yet) |
|---|---|
| Glitch Portals | A sci-fi glitch look; doesn't fit. A possible Tower door or rift if wanted. |
| Super Pixel Fantasy FX Pack 3 (free) | Buff icons (attack up, defence up, haste, regen) for a buff system the game doesn't have; the death effect shows a kanji. |
| REEBOO Stylized VFX | Godot shaders, which don't run in the browser game. |
| Desert tileset | No desert arena in the chapters built so far. |
| Pixel 16 village, interiors, Halloween and Christmas packs | A chibi scale that clashes with the characters. Houses could dress a town map later. |
| Dark Castle tileset | Mostly very dark tiles; the gates and candles could dress the Tower later. |
| Mixel Top-Down RPG | Only its nature details and font were usable (font in use). |
| `model-rigged.glb` (3D Alric) | 3D; the game is 2D pixel art now. |
| The two "young adult female" sheets | The retired anime Eiryn (kept for portraits). |
| Light novel PDF (through the first Guild contract) | Story reference, not an asset. |

---

## 4. After the base replacement: redo the opening cutscene

The prologue (TW-001–034) still uses the painted city, rooftops and summit, drawn effects, and
the protected painted skyfire-and-flood Reset shot. Once section 2 is done, rebuild it in the
pixel style:

1. **Rooftop run** (Eiryn and Alric): a pixel rooftop arena (tilesets: roof tiles, chimneys),
   the creator's run and leap clips, pixel dust and landing effects.
2. **The city square, evening**: pixel cobble square, market stalls, Erdra townsfolk, lanterns.
3. **The summit fight**: a pixel Tower-top arena; the climber, the Fragments, **Kharuun**
   (needs its art first); Dark Legion as pixel summons.
4. **The Reset**: the painted Reset shot is **protected**. Decide whether to keep it as a painted
   still or redraw it in pixel art. Then Alric's beast form (stand-in until its design is decided),
   the preservation spell, the flood.
5. Re-time the subtitles and camera to the new art; check the skip setting keeps rewards and flags.
