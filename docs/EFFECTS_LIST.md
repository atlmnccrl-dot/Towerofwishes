# Effects, bosses and animations still drawn in code

Everything below is still drawn by code (vector shapes and gradients). To match the pixel cast,
each needs pixel art.

## Art style for all of it

- **Pixel art, the same scale as the creator characters.** A character is about 44 px tall in a
  128 px cell; effects are drawn at that pixel size, with no smoothing or blur in the art.
- **Limited palette per effect:** 3–5 colours plus white for the core. Hard pixel edges; the
  game adds glow and transparency on top.
- **Transparent PNG sprite sheets.** One row per animation, frames left to right, the same cell
  size for every frame. Name it `<effect>.png` and say the cell size, the frame count and the frame
  where it hits.
- **Directions:** most effects are drawn once and rotated by the game. Only the boss and creature
  bodies need 8 directions, like the creator exports.
- **Frame rate:** 12–16 fps; impacts 6–10 frames, loops 8–12 frames.
- **The creator can't make these.** Its magic layers (Magic1–3) only cover small hand trails.
  Options: Aseprite or Piskel (by hand, about $20 or free), an itch.io pixel FX pack (many cost
  $5–15; must allow commercial use), or AI pixel generation followed by a cleanup pass.

---

## 1. Bosses and creatures still drawn

| ID | Who | Where | Size | Clips needed |
|---|---|---|---|---|
| `veil` | **Kharuun / the Unseen**: what the climber fights at the summit | Prologue, the tutorial fight | very large (~2.5× a person) | idle (hovering), drift, attack (Water Bullet throw), cast (marks the floor), hurt, phase/fade, dissolve into light (death). **Canon: never shown whole** (it may only be glimpsed), so a silhouette of light and fragments, not a body. 8 directions not needed: it faces the camera |
| `calamity` | **Calamity** | Floor Two boss | huge | idle, summon, water attack (left side), fire attack (right side), phase change, death |
| `calamity_add_fire` / `_water` | Calamity's adds | Floor Two | small | move, attack, death |
| `knightSword`, `knightFist`, `knightSpear`, `knightTwin`, `knightAxe` | Frost Knights | Floor One duels | person (the creator may do these: icy armour) | the full creator set |
| `knightMaster` | Horned Master Knight | Floor One, Eiryn's duel | person + horns | the full creator set |
| `thug` | Shadow City thugs | Chapter Seven | person (creator) | the full creator set |
| `echo`, `warden` | Echo, the Warden (side and arcade foes) | side content | person / large | the full creator set |
| `golem` | Practice Block (Guild yard dummy) | the Evaluation Yard | a wooden or stone dummy | idle, hit wobble, break |

The knights, thugs and echo can be built in the creator. Kharuun, Calamity and its adds need
custom pixel art.

## 2. Heavy arts (the once-per-fight cutscene moves)

The body uses a creator clip; the **effect** is the art needed.

| Heavy art | Who | Effect to draw | Frames |
|---|---|---|---|
| **Rising Cut** | Kael | a tall upward crescent slash of blue-white light, then a shockwave ring on the ground | slash 8, ring 8 |
| **Pressure** | Eiryn (road) | invisible force: a distortion ripple, dust and grass flattened outward, a pressure ring | ripple 10, dust 8 |
| **Force Lance** | Eiryn (mana back) | a violet glyph circle forming, then a narrow beam of force down a line, and a wall impact | glyph 12, beam loop 6, impact 8 |
| **Dark Legion** | the climber | dark-magic shadow soldiers rising out of the floor and striking, then fading | rise 10, strike 8, fade 8 |
| **Spear of Light** | Aerys | a gold light spear forming in her hand, the thrown spear (rotated by the game), a light burst on impact | form 10, flight loop 4, burst 10 |
| **One Step — A Thousand Wounds** | Nox | violet-black afterimages, a flurry of thin slash lines around the target, a final cross-cut | afterimage 6, slashes 12, cross 8 |
| **Life Surge** | Eloryn | a rose-gold healing bloom on the ground, rising motes, a glow on each ally | bloom 12, motes loop 8 |
| **Bone Breaker** | Braxen | the bone arm swelling, a ground-cracking punch, flying rock chips | crack 10, chips 8 |
| Hundredfold Step, Lattice Lance, Anvilfall | Ren, Mara, Brannoc (the old starter heroes) | **skip unless they come back**: they're from the older manuscript | |

## 3. Normal abilities and attacks

| Effect | Who | Draw |
|---|---|---|
| Sword slash arc | Kael, the climber, knights, rival kid | a white-blue crescent, 3 sizes; 5 frames |
| Dagger slash | Nox, the knife bandit, the frost assassin | a thin quick arc; 4 frames |
| Fist / maul impact | Braxen, the broad bandit, the Warlord | an impact star with dust; 5 frames |
| Light bolt | Aerys | a gold bolt in flight (loop 4) and a burst (6) |
| Force bolt | Eiryn (mage) | a violet bolt (loop 4) and a burst (6) |
| Failed glyph | Eiryn (bandit fight) | a violet half-circle that flickers out; 8 frames |
| Heal | Eloryn | a rose sparkle rising on the healed ally; 8 frames |
| Hex bolt | Skeleton hexer | a sickly purple orb (loop 4) and a burst (6) |
| Arrow | Skeleton archer | a 1-frame arrow sprite (rotated by the game) and a "thunk" in a wall (3 frames) |
| Warlord ground slam | the Skeleton Warlord | a ring of cracked ground and dust; 10 frames |
| Warlord throw | the Warlord | dust burst where Kael hits the wall; 8 frames |
| Fragment blink | the Fragments | a pale-blue break-up and re-form; 6 frames each |
| Fragment dissolve | Fragments, Kharuun | shatter into pale-blue light motes; 10 frames |
| Skyfire mark + impact | Calamity, the Reset | a red warning circle on the floor (loop 4) and a fire burst (10) |
| Moving Ocean mark + impact | Calamity | a blue warning circle (loop 4) and a water slam (10) |
| Frost | frost assassin, ice gear | ice crystals forming and shattering; 8 + 6 |
| Shadow Step | Nox | a puff of black smoke at both ends; 6 frames |

## 4. Shared combat effects (used by everyone)

| Effect | Draw | Frames |
|---|---|---|
| Hit spark | white and yellow star burst, 2 sizes (normal and big) | 4 |
| Parry clash | a bright spark cross with a ring | 5 |
| Dodge dust | dust puffs at the feet | 5 |
| Dash streak | speed lines behind a rushing fighter | 4 |
| Whiff | a faint empty swish | 3 |
| Knockdown dust | a dust cloud when someone falls | 6 |
| KO | small stars or a dust puff | 6 |
| Ground shadow | a soft dark oval (one image) | 1 |
| All Out aura | an orange flame aura around each hero (loop) | 8 |
| Exhausted | a sweat drop / "…" puff | 4 |
| Element weapons | fire trail and burn flicker; ice freeze and thaw; storm arc; quake crack | 6–8 each |
| Reaction icons | "!", "?", "…", "✦", as pixel icons | 1 each |

## 5. Things that are code, not art

These stay in code; they only need colours that match the pixel art:

- camera shake, slow motion, screen flash, hit pause;
- the heavy-art banner text, subtitles and HUD bars;
- damage numbers (a pixel font would match: e.g. Google Fonts "Press Start 2P" or "Silkscreen").

## 6. Also still drawn (not effects)

- **Arenas and backgrounds** (forest clearing, city, tavern, cave, Tower floors, world map) are
  painted in a smooth comic style. Next to pixel characters they're the biggest style gap. The
  options: pixel tilesets (itch.io), or keep the painted backgrounds as a deliberate contrast
  (common in HD-2D games).
- **Props:** tables, mugs, bread, the branch Eiryn picks up, swords on the shop wall, the cart.

---

## Suggested order

1. **Shared combat effects** (section 4): every fight uses them.
2. **Kharuun / the Unseen** and the climber's **Dark Legion**: the very first fight.
3. **Kael's Rising Cut** and **Eiryn's failed glyph**: the bandit fight.
4. The party's heavy arts as they join (Spear of Light, Life Surge, One Step, Bone Breaker, Force Lance).
5. The knights and thugs (creator), then Calamity.
6. Decide on the arena style.
