# Opening → first bandit fight: character sprite and animation checklist

**Scope:** from the **title screen** to the **end of Kael and Eiryn's first fight against the bandits and its immediate aftermath in the clearing** (TW-001 → TW-050).
- It stops before the road to Ashgate (TW-051).
- Nothing about the Ogre, Aerys, Nox or later party members is included, except the title-screen question in §2.

**Sources:**
- the 430-event inventory (`docs/source/MASTER_HANDOFF_2026-10-17.txt`);
- Director's Bible part 1 (`docs/BIBLE_01.md`, sequences S01–S06);
- `docs/CAST_OPENING.md`, `docs/ANIMATION_LIST.md`, `docs/CINEMATIC_NEEDS.md`;
- the game code: `js/sim.js` fighters and the bandit scenario `clearingKael`, `js/story.js` scenes, `js/stages.js` staging.

**Important.**
- The prologue scenes in the build today come from the older manuscript. Milestone 3 rebuilds them to the inventory.
- This checklist follows the **inventory and the Bible** (the target), so art is made once for the final version.
- Code-drawn characters count as **MISSING**: drawn in code is not finished artwork.

---

## 0. Rules for every ZIP (same workflow as Eiryn's delivered sheets)

### Format
- One transparent PNG sprite sheet plus its JSON frame data (your tool's format is fine: `frame_000` … with `duration` per frame).
- **No shadow.** Transparent background: a real alpha channel, not a painted checkerboard.

### Scale and alignment
- Each character keeps **the same scale, canvas height and foot position** in every clip.
- Eiryn's reference: figure about 740–830 px tall, canvas about 420–500 × 760–900. The game reads each sheet's own size.

### Naming
- `<character>_<animation>_<DIR>.zip`, e.g. `kael_attack1_SE.zip`.
- **Direction is as seen on screen:**
  - `S` faces the viewer;
  - `SE` faces down-right;
  - `E` faces right;
  - `NE` faces up-right (3/4 back);
  - `N` is the back.
- The game mirrors `SW`, `W` and `NW`.

### Directions
- **Gameplay** clips need all 5: `S, SE, E, NE, N`.
- **Cinematic** clips only need the camera angles listed.

### Frame counts
- Your generator makes 36 frames (6×6). That's fine. Fewer frames (16–24) make smaller files and look just as smooth for loops.
- Durations below are what the game needs. Set the per-frame duration to match.

### Attacks
For every attack, write in the ZIP name or a note:
- the **wind-up** frames;
- the **hit frame**;
- the **recovery** frames.

Example: `wind-up 0–12, hit 12, recover 28–35`. The game stretches each part to its gameplay timing.

### Two-person contact moments
Use **one duo clip** with both characters in the same sheet: the catch, the hug, the hand-holding run, the shield, the shoulder grip. Separate sheets for each person won't line up.

### Body only
Glyphs, projectiles, force rings, the Negation dome, skyfire, flood, dust, debris, slash trails, sparks, light and screen effects are **drawn by Claude in code**. Don't paint them into the body sheets. See §11.

### Status codes
- **DONE**: integrated and tested in the game.
- **DRAFT**: generated but not integrated, or integrated with a known problem.
- **MISSING**: not made yet.
- **OPEN**: waits on a decision (§1).

### Columns used in every checklist table
- **ZIP**: the file name to generate.
- **TW**: the story event number(s) it's used in.
- **Type**: G = gameplay, C = cinematic.
- **Dirs / camera**: the directions to draw.
- **Loop**: yes / no.
- **Frames / s**: suggested frame count and duration.
- **Reuse / notes**.
- **Status**.

---

## 1. Decisions that change what you generate (answer first: they save credits)

| # | Question | Effect |
|---|---|---|
| D1 | **Is Eiryn's outfit before the Reset the same as now?** | **Same:** every Eiryn sheet is reused for the prologue (recommended; saves ~40 sheets). **Different:** a second Eiryn set is needed for TW-001–033. |
| D2 | **Alric's beast form:** a description or a reference image. | Blocks 3 clips (transform, shield duo, beast portrait). |
| D3 | **Alric's normal look:** do you have a reference sheet (front, side, back)? | Needed before any Alric sheet. |
| D4 | **The climber's enemies** (underlings and the presence at the summit). | **(a) Keep them as light-and-shadow effects drawn in code** (recommended: the inventory says never reveal the Guardian). **(b)** Commission sprite designs. Choosing (a) removes ~25 sheets. |
| D5 | **The climber's power and names.** | Show "Kharuun" / "Dark Legion", or no names? (Names only; the art isn't affected.) |
| D6 | **Kael's table companion (the spearwoman).** | Keep her as a unique character, or make her a generic regular? |
| D7 | **A tavern keeper or server** in the background. | Yes adds 1 generic NPC; no is free. |
| D8 | **Eiryn's broken branch in the bandit fight.** | It's in the fight code (she grabs a branch after her spell fails); the book doesn't confirm it. **(a) Keep:** she needs branch clips. **(b) Drop:** she dodges and stays behind Kael (saves 3 clips × 5 directions). |
| D9 | **The title screen.** | It shows all six heroes today. **(a) Show only Eiryn and Kael** until the others exist (recommended; this checklist assumes it). **(b)** Keep all six (needs Aerys, Nox, Braxen and Eloryn walk clips: out of scope). |
| D10 | **Lookout bandit = the grabber's body in a different colourway** (recoloured in code)? | Yes saves ~10 sheets. |
| D11 | **Kael's heavy art:** what it looks like. | It's in the code (a multi-cut flurry), but the book doesn't describe it. OPEN until you describe it. |

---

## 2. Cast in order of first appearance

| # | Character | First on screen | Art type | Have now |
|---|---|---|---|---|
| 1 | **Eiryn** (current outfit) | Title screen | Unique | Base sprite + 7 clips (see §3) |
| 2 | **Kael** | Title screen (D9), then TW-035 | Unique | Code-drawn only → MISSING |
| — | Aerys, Nox, Braxen, Eloryn | Title screen today | Out of scope | See D9 |
| — | Opening-cinematic silhouettes (crowd, climbers on stairs) | Opening cinematic | **Code-drawn silhouettes: keep, no sprites** | Done in code |
| 3 | **Eiryn, before the Reset** | TW-001 | Reuse #1 if D1 = same | — |
| 4 | **Alric** | TW-001 | Unique | Code-drawn → MISSING (D3) |
| 5 | **Erdra townsfolk** (old city): 4 adults (2 men, 2 women) | TW-011 | Generic, colourways | MISSING |
| 6 | **Street vendor / fruit seller** | TW-011 | Generic: an Erdra adult with an apron | MISSING |
| 7 | **Baker** | TW-012 | Generic: same as #6, another colourway | MISSING |
| 8 | **Musician** (fountain) | TW-011 | Generic: an Erdra adult with an instrument | MISSING |
| 9 | **Children** (1 body, 2 colourways) | TW-011 | Generic child | MISSING (no child body exists) |
| 10 | **The unknown climber** | TW-019 | Unique, hooded / armoured, anonymous | Code-drawn → MISSING |
| 11 | **Fragments** (the climber's underlings) | TW-019 | D4: code effect (recommended) or unique | Code |
| 12 | **The summit presence** (the boss) | TW-019 | D4: code effect (recommended) or unique | Code |
| 13 | **Fleeing townspeople** | TW-020 | Reuse #5–9 | — |
| 14 | **Alric's beast form** | TW-031 | Unique | OPEN (D2) |
| 15 | **Ashgate tavern regulars:** 4 adults | TW-036 | Generic, colourways (newer clothes than Erdra) | Code-drawn → MISSING |
| 16 | **Spearwoman** (Kael's table) | TW-036 | D6 | Code-drawn → MISSING / OPEN |
| 17 | **The patron who notices the light** | TW-039 | Reuse #15 | — |
| 18 | **Tavern keeper / server** | TW-036 | D7 | — |
| 19 | **Ashgate townsfolk** (street outside) | TW-041 | Reuse #15 | — |
| 20 | **Broad-shouldered bandit** (heavy brawler) | TW-045 | Unique (big body) | Code-drawn → MISSING |
| 21 | **Knife bandit** (quick, feints) | TW-045 | Unique | Code-drawn → MISSING |
| 22 | **Grabber bandit** (flanker, goes for Eiryn) | TW-045 | Unique | Code-drawn → MISSING |
| 23 | **Lookout bandit** (hangs back, runs) | TW-045 | D10: reuse #22 recoloured | Code-drawn → MISSING |

---

## 3. EIRYN (current outfit; also the prologue if D1 = same)

**Assets already generated and integrated (tested in the game):**
- `eiryn_base.png` (front);
- walk S, SE, SW, E;
- run S;
- combat idle S;
- ranged Pressure attack S.

**Problems found in what was delivered:**
- **walk_E:** came with a painted-in checkerboard (keyed out in code); it also has a green cape not on her base sprite.
- **walk_SE / walk_SW:** labelled the wrong way round (filed by how they face on screen).

### 3A. Gameplay set (her free-movement and fight animations)
*"In range?" says whether it's used between the title screen and the bandits. Later clips are listed because you asked for her complete combat set. Generate them after the in-range ones.*

| ✓ | ZIP | In range? (TW) | Type | Dirs | Loop | Frames / s | Reuse / notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☑ | `eiryn_base.png` | all | — | S | — | 1 | Official look | **DONE** |
| ☐ | `eiryn_idle_[DIR]` (calm, standing) | Y: TW-002 play, 008–018, 046–050 | G | S SE E NE N | yes | 24 / 2.0 s | The base sprite stands in for S today | MISSING |
| ☑ | `eiryn_walk_S` | Y | G | S | yes | 36 / 2.1 s | | **DONE** |
| ☑ | `eiryn_walk_SE` | Y | G | SE | yes | 36 / 2.1 s | | **DONE** |
| ☑ | `eiryn_walk_E` | Y | G | E | yes | 36 / 2.1 s | Cape not on the base sprite: keep, or regenerate? | **DRAFT** (in game) |
| ☐ | `eiryn_walk_NE` | Y: TW-011, title (walks away) | G | NE | yes | 24–36 / 2.1 s | Match walk_S timing | MISSING |
| ☐ | `eiryn_walk_N` | Y: title, TW-011 | G | N | yes | 24–36 / 2.1 s | | MISSING |
| ☑ | `eiryn_run_S` | Y | G | S | yes | 36 / 2.1 s | | **DONE** |
| ☐ | `eiryn_run_[SE,E,NE,N]` | Y: TW-001–002 rooftop run, TW-023 escape | G | SE E NE N | yes | 24 / ~0.8–1.0 s per cycle | Rooftops mostly use E and SE | MISSING |
| ☑ | `eiryn_idle_combat_S` (glyph at her hand) | later (from the Ogre) | G | S | yes | 36 / 3.2 s | | **DONE** |
| ☐ | `eiryn_idle_combat_[SE,E,NE,N]` | later | G | SE E NE N | yes | 24–36 / 3 s | Body only: the hand glyph can be painted in or left for code (your call) | MISSING |
| ☑ | `eiryn_attack_ranged_S` (Pressure cast) | Y: TW-024 (push debris) | G | S | no | 36 / 3.6 s (game compresses it) | Wind-up 0–12, **hit 12**, recover 28–35 | **DONE** |
| ☐ | `eiryn_attack_ranged_[SE,E,NE,N]` | Y: TW-024 | G | SE E NE N | no | 16–24 / ~1.0 s | Same choreography and timing marks as S | MISSING |
| ☐ | `eiryn_attack_close_[DIR]` (close-range Pressure shove: palm thrust at arm's length) | later (her close Pressure, from the Ogre) | G | S SE E NE N | no | 12–16 / 0.6 s | Mark the hit frame; the force ring is code VFX | MISSING |
| ☐ | `eiryn_dodge_[DIR]` | Y: bandit fight | G | S SE E NE N | no | 10–12 / 0.4 s | Sidestep | MISSING |
| ☐ | `eiryn_block_[DIR]` (parry) | later (she doesn't parry before the Ogre) | G | S SE E NE N | no | 8–10 / 0.35 s | | MISSING (low priority) |
| ☐ | `eiryn_hit_[DIR]` | Y: bandit fight | G | S SE E NE N | no | 8 / 0.3 s | Flinch | MISSING |
| ☐ | `eiryn_stagger_[DIR]` | Y: bandit fight | G | S SE E NE N | no | 12–16 / 0.8 s | Off balance | MISSING |
| ☐ | `eiryn_knockdown_[DIR]` (fall + lie + get up) | Y: the Broad bandit's fist floors her | G | S SE E NE N | no | 24–30 / 1.6 s | Mark the "lying" frames; the game can hold them | MISSING |
| ☐ | `eiryn_defeat_[DIR]` (falls, stays down) | Y: if she's knocked out in the fight | G | S SE E NE N | no | 16–20 / 1.0 s | | MISSING |
| ☐ | `eiryn_drained_idle_[DIR]` (mana empty: hunched, breathing hard) | Y: TW-045–050; All Out exhaustion | G | S SE E NE N | yes | 24 / 2.0 s | Also covers "after All Out" | MISSING |
| ☐ | `eiryn_fizzle_[DIR]` (tries to cast, hand shakes, nothing; sags) | Y: TW-046 (cutscene) + the bandit fight's first move | G + C | S SE E NE N | no | 16–20 / 0.8 s | The failing glyph line is code VFX | MISSING |
| ☐ | `eiryn_pickup_branch_[DIR]` | Y: bandit fight **(D8)** | G | S SE E NE N | no | 10–12 / 0.4 s | | OPEN (D8) |
| ☐ | `eiryn_branch_idle_[DIR]` | Y: bandit fight **(D8)** | G | S SE E NE N | yes | 16–24 / 2 s | | OPEN (D8) |
| ☐ | `eiryn_branch_swing_[DIR]` | Y: bandit fight **(D8)** | G | S SE E NE N | no | 12–16 / 0.6 s | Mark the hit frame | OPEN (D8) |
| ☐ | `eiryn_allout_[DIR]` (power-up flash pose) | Y: All Out in the bandit fight | G | S SE E | no | 10–12 / 0.5 s | | MISSING |
| ☐ | `eiryn_negation_[DIR]` (raise both hands, hold, release) | Y: TW-025 (cinematic there; gameplay later) | C now, G later | S SE now (5 later) | no (hold loop inside) | 24–30 / 1.5 s + hold | The dome is code VFX | MISSING |

### 3B. Life-layer and dialogue clips (scenes)

| ✓ | ZIP | TW | Type | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☐ | `eiryn_walk_talk_L_[DIR]` / `_R_[DIR]` (head turned to her left / right while walking) | 003, 011–017, 050 | C | S SE E | yes | 24–36 / 2.1 s | Same cycle timing as her walk | MISSING |
| ☐ | `eiryn_talk_idle_[DIR]` (talking, small hand gesture) | 008–010, 012–017, 048–050 | C | S SE | yes | 24 / 2.5 s | | MISSING |
| ☐ | `eiryn_listen_[DIR]` (nod, small tilt) | same | C | S SE | yes | 16–24 / 2 s | | MISSING |
| ☐ | `eiryn_react_laugh_S` | 003, 008, 010 | C | S | no | 16 / 1.0 s | | MISSING |
| ☐ | `eiryn_react_surprise_S` | 004, 014, 047 | C | S | no | 12 / 0.8 s | | MISSING |
| ☐ | `eiryn_react_sigh_S` (deadpan) | 048–050 | C | S | no | 16 / 1.0 s | Her calm "why should I be?" | MISSING |
| ☐ | `eiryn_idle_look_around_[DIR]` | 011, 049 (the vanished town) | C | S SE | no | 24 / 2 s | | MISSING |
| ☐ | `eiryn_idle_shift_[DIR]` (weight shift, hair tuck) | scenes | C | S SE | no | 24 / 2 s | | MISSING |

### 3C. Eiryn's cinematic clips, by event

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `eiryn_cin_feet_run_E` | 001 | E (close-up on the boots, low) | yes | 16–24 / 0.8 s | A separate **close-up** at large scale: boots on roof tiles, from the knees down | MISSING |
| ☐ | `eiryn_jump_[E,SE]` (take-off, airborne, landing) | 002, 004 | E SE | no | 24 / 1.0 s | Also used for the automatic jumps in the rooftop play | MISSING |
| ☐ | `eiryn_cin_misjudge_E` (at the edge: sees the gap is too wide, flails) | 004 | E | no | 16 / 0.8 s | Her point-of-view shot is a camera move, not art | MISSING |
| ☐ | `eiryn_cin_pressure_launch_E` (crouch → push → flung up and forward → overshooting) | 005 | E | no | 30 / 1.4 s | The glyph under her feet is code VFX | MISSING |
| ☐ | `eiryn_cin_point_SE` (points at home below) | 009 | SE | no | 16 / 1.0 s | | MISSING |
| ☐ | `eiryn_cin_take_item_SE` (takes a pastry, hands over coin) | 012 | SE | no | 16 / 1.0 s | **OPTION** stall interaction | MISSING |
| ☐ | `eiryn_cin_kick_ball_SE` | 011 | SE | no | 12 / 0.6 s | **OPTION** children's game | MISSING |
| ☐ | `eiryn_cin_horn_turn_SE` (stops, turns toward the Tower) | 014 | SE, then N (back view looking at the Tower) | no | 16 / 1.0 s | | MISSING |
| ☐ | `eiryn_cin_startle_S` (senses nothing yet, then looks up) | 020 | S | no | 16 / 1.0 s | | MISSING |
| ☐ | `eiryn_cin_cower_S` (shields her head from debris) | 023 | S | no | 12 / 0.6 s | | MISSING |
| ☐ | `eiryn_cin_kneel_exhausted_S` (drops to one knee after Negation) | 025 | S | no + hold loop | 16 + 8 loop | Negation's physical cost | MISSING |
| ☐ | `eiryn_cin_refuse_S` (shakes her head, pulls back, pleading) | 030 | S SE | no | 24 / 1.5 s | | MISSING |
| ☐ | `eiryn_cin_preservation_cast_S` (kneels, both hands up, holds) | 032–033 | S | no + hold loop | 24 + 12 loop | The glyph that won't widen is code VFX | MISSING |
| ☐ | `eiryn_cin_reach_out_S` (tries to reach him through the barrier) | 032–033 | S | no | 16 / 1.0 s | | MISSING |
| ☐ | `eiryn_cin_scream_S` (silent scream as the fire falls) | 033 | S (+ portrait close-up) | no | 16 / 1.0 s | | MISSING |
| ☐ | `eiryn_cin_backstep_S` (backing away from the bandits) | 045 | S SE | no | 16 / 0.8 s | Can reuse walk played backwards in code | MISSING (optional) |
| ☐ | `eiryn_cin_look_up_landing_S` (looks at Kael as he lands) | 047 | S | no | 12 / 0.6 s | Can reuse react_surprise | MISSING (optional) |

### 3D. Eiryn's duo clips (shared with Alric or Kael)
Listed under §4E (Alric) and §12C (Kael).

---

## 4. ALRIC (prologue only; needs D3 first, and D2 for the beast)

### 4A. Gameplay set
The rooftop and street are played as Eiryn; Alric follows her as an AI companion, so his movement needs all directions.

| ✓ | ZIP | TW | Type | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☐ | `alric_idle_[DIR]` | 008–018, 020 | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `alric_walk_[DIR]` | 010–018 | G | S SE E NE N | yes | 24–36 / 2 s | Match Eiryn's walk speed | MISSING |
| ☐ | `alric_run_[DIR]` | 001–002, 023 | G | S SE E NE N | yes | 24 / 0.8 s | Visibly faster, light on his feet | MISSING |
| ☐ | `alric_jump_[E,SE]` | 002 | G | E SE | no | 20 / 0.9 s | Automatic gap jumps | MISSING |

### 4B. Dialogue and life layer

| ✓ | ZIP | TW | Dirs | Loop | Frames / s | Status |
|---|---|---|---|---|---|---|
| ☐ | `alric_walk_talk_L_[DIR]` / `_R_[DIR]` | 003, 011–017 | S SE E | yes | 24–36 / 2 s | MISSING |
| ☐ | `alric_talk_idle_[DIR]` | 008–017, 029 | S SE | yes | 24 / 2.5 s | MISSING |
| ☐ | `alric_listen_[DIR]` | same | S SE | yes | 16–24 / 2 s | MISSING |
| ☐ | `alric_react_laugh_S` | 003, 008, 016 | S | no | 16 / 1 s | MISSING |
| ☐ | `alric_run_lookback_E` (glances back at her mid-run) | 001–003 | E | yes | 24 / 0.8 s | MISSING |

### 4C. Cinematic clips

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `alric_cin_leap_E` (crouch → strength leap; tiles crack) | 006 | E (low angle) | no | 24 / 1.0 s | **No glow, no glyph:** strength only. Tile cracks are code VFX | MISSING |
| ☐ | `alric_cin_horn_turn_SE` | 014 | SE | no | 16 / 1 s | Turns toward the Tower | MISSING |
| ☐ | `alric_cin_sense_S` (his head snaps up before anything is visible) | 020 | S | no | 12 / 0.6 s | | MISSING |
| ☐ | `alric_cin_search_S` (looks one way, then another: no way out) | 028 | S SE | no | 24 / 1.5 s | | MISSING |
| ☐ | `alric_cin_demand_S` (urgent, insistent) | 029–030 | S SE | yes | 24 / 2 s | | MISSING |
| ☐ | `alric_cin_transform_S` (into the vampiric beast) | 031 | S | no | 30–36 / 2 s | **OPEN (D2)** | OPEN |

### 4D. Alric's beast form (D2)

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Status |
|---|---|---|---|---|---|---|
| ☐ | `alricbeast_idle_S` (braced, shielding) | 031–033 | S | yes | 16 / 1.5 s | OPEN |
| ☐ | `alricbeast_cin_take_hit_S` (the pillar and the fire strike his back) | 031–033 | S | no | 16 / 1 s | OPEN |

### 4E. Duo clips: Alric + Eiryn (both in one sheet)

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `alric_eiryn_cin_catch_E` (mid-air catch → he turns his back to the landing → hard landing) | 007 | E (tracking side shot) | no | 30 / 1.4 s | Tiles shattering are code VFX | MISSING |
| ☐ | `alric_eiryn_cin_hug_SE` ("I wanted the hug") | 008 | SE | loop at the end | 24 + 12 loop | | MISSING |
| ☐ | `alric_eiryn_walk_together_[S,SE,E]` (holding hands, walking) | 010–013 | S SE E | yes | 24–36 / 2 s | **Optional.** Separate walks also work | MISSING (optional) |
| ☐ | `alric_eiryn_cin_close_SE` (TW-017 tender moment, foreheads close) | 017 | SE | yes | 24 / 2.5 s | | MISSING |
| ☐ | `alric_eiryn_cin_door_S` (standing together at the blue door, a quiet hold) | 018 | S | yes | 24 / 3 s | Breathing space | MISSING |
| ☐ | `alric_eiryn_cin_run_hand_SE` (he pulls her by the hand, running) | 023 | SE E | yes | 24 / 0.8 s | | MISSING |
| ☐ | `alric_eiryn_cin_grip_SE` (he grips her shoulders: "I'm not asking you") | 029–030 | SE | yes | 24 / 2 s | | MISSING |
| ☐ | `alricbeast_eiryn_cin_shield_S` (the beast arches over her; she's underneath, casting) | 031–033 | S | yes | 24 / 2 s | **OPEN (D2)** | OPEN |

---

## 5. ERDRA TOWNSFOLK (old city): generic, reused for the street and the Reset

**Bodies:**
- 4 adults (2 men, 2 women), in colourways;
- 1 child body, in 2 colourways.

**Specialised variants:**
- **Vendor and baker:** an adult with an apron (one body, two colourways).
- **Musician:** an adult with an instrument (painted into the clip).

These clips are cinematic: these characters never move freely. Two directions suffice (S, SE), plus E for running past.

| ✓ | ZIP | TW | Dirs / camera | Loop | Frames / s | Who | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `erdra_[a,b,c,d]_idle_[S,SE]` | 011–018 | S SE | yes | 16–24 / 2 s | 4 adults | MISSING |
| ☐ | `erdra_[a,b,c,d]_walk_[S,SE,E]` | 011–018 | S SE E | yes | 24 / 2 s | 4 adults | MISSING |
| ☐ | `erdra_[a,b,c,d]_talk_[S,SE]` | 011 | S SE | yes | 24 / 2.5 s | 4 adults | MISSING |
| ☐ | `erdra_[a..d]_turn_lookup_[S,SE]` (stops, turns toward the horn, looks up) | 014, 020 | S SE | no | 16 / 1 s | 4 adults | MISSING |
| ☐ | `erdra_[a..d]_run_panic_[S,SE,E]` | 022–027 | S SE E | yes | 24 / 0.8 s | 4 adults | MISSING |
| ☐ | `erdra_[a..d]_cower_[S,SE]` (cover head, crouch) | 023–024 | S SE | yes (end hold) | 16 / 0.8 s | 4 adults | MISSING |
| ☐ | `erdra_[a..d]_fall_[S,SE]` (stumble and fall) | 023 | S SE | no | 16 / 0.8 s | 2 adults is enough | MISSING |
| ☐ | `erdra_vendor_idle_S` / `_callout_S` / `_handover_SE` | 011–012 | S SE | yes / no / no | 24 / 2 s; 16 / 1 s | vendor and baker | MISSING |
| ☐ | `erdra_musician_play_S` / `_stop_S` | 011, 014 | S | yes / no | 24 / 2 s; 12 / 0.8 s | musician | MISSING |
| ☐ | `erdra_child_run_[S,SE,E]` / `_play_S` / `_point_S` | 011, 014 | S SE E / S / S | yes / yes / no | 24 / 0.7 s; 24 / 2 s; 12 / 1 s | child | MISSING |
| ☐ | `erdra_adult_carry_child_[S,SE]` (duo: an adult carries a child while fleeing) | 023–027 | S SE | yes | 24 / 0.8 s | adult A + child | MISSING (optional) |

**Saving tip:** if credits are tight, make 2 adults + 1 child instead of 4 + 1. Code colourways turn them into a crowd.

---

## 6. THE UNKNOWN CLIMBER (TW-019; playable fight)

Anonymous, hooded or helmeted; no face shown, no wish, no name (D5). The fight is playable and can't be lost; his last stand is scripted.

### 6A. Gameplay set (all 5 directions: the player can move him)

| ✓ | ZIP | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|
| ☐ | `climber_idle_combat_[DIR]` (wounded but ready, broken blade) | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `climber_walk_[DIR]` | S SE E NE N | yes | 24 / 2 s | A slight limp is fine | MISSING |
| ☐ | `climber_run_[DIR]` | S SE E NE N | yes | 24 / 0.8 s | | MISSING |
| ☐ | `climber_attack1_[DIR]` (broken-blade slash) | S SE E NE N | no | 12–16 / 0.6 s | Mark the hit frame. Also used for his riposte (played faster) | MISSING |
| ☐ | `climber_attack2_[DIR]` (return slash, combo finisher) | S SE E NE N | no | 12–16 / 0.6 s | Mark the hit frame | MISSING |
| ☐ | `climber_block_[DIR]` (parry) | S SE E NE N | no | 8–10 / 0.35 s | | MISSING |
| ☐ | `climber_dodge_[DIR]` | S SE E NE N | no | 10–12 / 0.4 s | | MISSING |
| ☐ | `climber_hit_[DIR]` | S SE E NE N | no | 8 / 0.3 s | | MISSING |
| ☐ | `climber_stagger_[DIR]` | S SE E NE N | no | 12–16 / 0.8 s | | MISSING |
| ☐ | `climber_knockdown_[DIR]` (fall + get up) | S SE E NE N | no | 24–30 / 1.6 s | Also the "thrown and gets up" moment in the entrance | MISSING |
| ☐ | `climber_drained_[DIR]` | S SE E NE N | yes | 24 / 2 s | After All Out (the tutorial teaches All Out) | MISSING |
| ☐ | `climber_allout_[S,SE,E]` | S SE E | no | 10–12 / 0.5 s | | MISSING |

No defeat clip: he can't lose.

### 6B. Cinematic clips

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `climber_cin_climb_S` (climbs the last stairs into the hall, wounded) | 019 | S (low angle) | yes | 24 / 1.5 s | | MISSING |
| ☐ | `climber_cin_kill_E` (one blade arc kills two underlings) | 019 | E | no | 24 / 1.0 s | The dark wake is code VFX | MISSING |
| ☐ | `climber_cin_laststand_S` (on the brink → dark power surges; summons the giants of darkness) | 019 | S SE | no + hold loop | 36 / 2.5 s + 12 loop | Rift and giants are code VFX. Name OPEN (D5) | MISSING |
| ☐ | `climber_cin_reach_N` (reaches up toward the light) | 019 | N (back view) | no | 16 / 1.2 s | | MISSING |
| ☐ | `climber_cin_ascend_N` (walks up into the light) | 019 | N | yes | 24 / 2 s | Can reuse walk_N | MISSING (optional) |

### 6C. Fragments and the summit presence (D4)
- **Recommended:** keep them as **code-drawn light-and-shadow effects**. The inventory says the Guardian is never revealed, and they already exist in code.
- If you choose sprites instead, each needs: idle (floating), move / blink in, claw attack (5 directions), hit, dissolve. About 25 sheets in all.
- **Status: OPEN (D4).**

---

## 7. THE RESET: townspeople
Covered by §5's clips: run_panic, cower, fall, carry_child.
- **TW-024:** the two townspeople saved from a falling beam: `cower`, then `turn_lookup`, then `run_panic`.

---

## 8. ASHGATE TAVERN REGULARS AND TOWNSFOLK (150 years later)

**Bodies:** 4 adults with newer clothes than Erdra's, in colourways. Most of the time they're seated.

| ✓ | ZIP | TW | Dirs / camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `ashgate_[a..d]_sit_idle_[S,SE]` | 036–038 | S SE | yes | 24 / 2.5 s | Seated at a table; stool and table are part of the set | MISSING |
| ☐ | `ashgate_[a..d]_sit_drink_[S,SE]` | 036–038 | S SE | yes | 24 / 3 s | Mug in hand | MISSING |
| ☐ | `ashgate_[a..d]_sit_eat_[S,SE]` | 036–038 | S SE | yes | 24 / 2.5 s | Spoon and bowl | MISSING |
| ☐ | `ashgate_[a..d]_sit_talk_[S,SE]` (murmuring "…") | 037 | S SE | yes | 24 / 2.5 s | | MISSING |
| ☐ | `ashgate_[a..d]_sit_laugh_[S,SE]` | 036–037 | S SE | no | 16 / 1 s | | MISSING |
| ☐ | `ashgate_[a..d]_stand_up_[S,SE]` | 040 | S SE | no | 12 / 0.6 s | From seated | MISSING |
| ☐ | `ashgate_[a..d]_walk_[S,SE,E,NE,N]` | 040, 041 | 5 dirs | yes | 24 / 2 s | They cross the room to the window. 5 dirs because the tavern is walkable later | MISSING |
| ☐ | `ashgate_[a..d]_idle_[S,SE,N]` | 040–043 | S SE N | yes | 24 / 2 s | N = backs turned, looking out of the window or north | MISSING |
| ☐ | `ashgate_[a..d]_point_[N,SE]` | 039–040 | N SE | no | 12 / 1 s | The patron who notices the light | MISSING |
| ☐ | `ashgate_[a..d]_lookup_[N,S]` (crowd looking up at the glyph) | 041–043 | N S | yes | 24 / 2 s | | MISSING |
| ☐ | `ashgate_server_walk_[S,SE,E]`, `_idle_S`, `_wipe_bar_S` | 036 | | | | **OPTION (D7)** | OPEN |

**Saving tip:** 2 adults + colourways cover a full tavern.

---

## 9. SPEARWOMAN (Kael's table companion), D6
- **If kept as unique:**
  - `spearwoman_sit_eat_[S,SE]`, `_sit_talk_[S,SE]`, `_sit_laugh_S`, `_tip_chair_SE`: TW-036–037, all MISSING.
  - Portrait: smirk, laugh, neutral.
- **If generic:** use §8's clips with a spear leaning against the table (a code prop).
- **Status: OPEN.**

---

## 10. KAEL (TW-035 → TW-050; title screen if D9 = a)

### 10A. Gameplay set (the bandit fight; exploration from TW-036)

| ✓ | ZIP | TW | Type | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☐ | `kael_base.png` (reference sprite, front) | — | — | S | — | 1 | **Needed first:** sets his scale | MISSING |
| ☐ | `kael_idle_[DIR]` (relaxed, sword on his back) | 036–043, 048–050, title | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `kael_walk_[DIR]` | 036–043, title (walks away = N) | G | S SE E NE N | yes | 24–36 / 2 s | | MISSING |
| ☐ | `kael_run_[DIR]` | 044 (sprint), fight | G | S SE E NE N | yes | 24 / 0.8 s | The cinematic sprint reuses run E + speed lines | MISSING |
| ☐ | `kael_idle_combat_[DIR]` (sword drawn, guard) | 047 | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `kael_attack1_[DIR]` (horizontal slash) | 047 | G | S SE E NE N | no | 12–16 / 0.6 s | Mark the hit frame. Combo piece 1. Also used for the riposte, played faster | MISSING |
| ☐ | `kael_attack2_[DIR]` (return slash) | 047 | G | S SE E NE N | no | 12–16 / 0.6 s | Combo piece 2 | MISSING |
| ☐ | `kael_attack3_[DIR]` (heavier downward finisher) | 047 | G | S SE E NE N | no | 14–18 / 0.7 s | Combo piece 3 | MISSING |
| ☐ | `kael_block_[DIR]` (sword parry) | 047 | G | S SE E NE N | no | 8–10 / 0.35 s | | MISSING |
| ☐ | `kael_dodge_[DIR]` (sidestep or roll) | 047 | G | S SE E NE N | no | 10–12 / 0.4 s | | MISSING |
| ☐ | `kael_hit_[DIR]` | 047 | G | S SE E NE N | no | 8 / 0.3 s | | MISSING |
| ☐ | `kael_stagger_[DIR]` | 047 | G | S SE E NE N | no | 12–16 / 0.8 s | | MISSING |
| ☐ | `kael_knockdown_[DIR]` (fall + get up) | 047 | G | S SE E NE N | no | 24–30 / 1.6 s | | MISSING |
| ☐ | `kael_defeat_[DIR]` | 047 (loss) | G | S SE E NE N | no | 16–20 / 1 s | | MISSING |
| ☐ | `kael_drained_[DIR]` | 047 (after All Out) | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `kael_glance_back_[DIR]` (distracted look at the fleeing lookout) | 047 | G | S SE E NE N | no | 12 / 0.6 s | The fight code has this beat | MISSING |
| ☐ | `kael_allout_[S,SE,E]` | 047 | G | S SE E | no | 10–12 / 0.5 s | | MISSING |
| ☐ | `kael_heavy_[S,SE,E]` (heavy art) | 047 | C (cutscene) | S SE E | no | 36–48 / 2.5 s | **OPEN (D11)** | OPEN |
| ☐ | `kael_victory_S` (sheathes his sword) | 047 → 048 | C | S SE | no | 16–24 / 1.2 s | | MISSING |

### 10B. Tavern and dialogue clips

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `kael_sit_eat_[S,SE]` | 036 | S SE | yes | 24 / 2.5 s | Spoon and bowl painted in | MISSING |
| ☐ | `kael_sit_talk_[S,SE]` (complaining about the stew) | 036–037 | S SE | yes | 24 / 2.5 s | | MISSING |
| ☐ | `kael_sit_laugh_S` | 037 | S | no | 16 / 1 s | | MISSING |
| ☐ | `kael_sit_lookup_N` (turns toward the window light) | 039–040 | N (over the shoulder) or SE | no | 16 / 1 s | | MISSING |
| ☐ | `kael_stand_up_[S,SE]` (rises from the table, takes his sword) | 041 | S SE | no | 16–24 / 1 s | | MISSING |
| ☐ | `kael_cin_door_out_E` (walks out through the door) | 041 | E | yes | — | Reuses walk_E (no new art) | reuse |
| ☐ | `kael_cin_watch_glyph_N` (stands in the street, watching the sky) | 042 | N (back) + S reaction | yes | 24 / 2 s | | MISSING |
| ☐ | `kael_cin_decide_S` (frowns, then sets off) | 043 | S | no | 16 / 1 s | His line is still a placeholder | MISSING |
| ☐ | `kael_talk_idle_[S,SE]`, `kael_listen_[S,SE]` | 048–050 | S SE | yes | 24 / 2.5 s | | MISSING |
| ☐ | `kael_walk_talk_L/R_[S,SE,E]` | 050 (walking with Eiryn) | S SE E | yes | 24–36 / 2 s | | MISSING |

### 10C. Bandit-rescue cinematic clips

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `kael_cin_drop_land_S` (drops from the bank, lands in a crouch) | 047 (entrance) | S (from behind Eiryn) | no | 24 / 1.0 s | Dust is code VFX | MISSING |
| ☐ | `kael_cin_sword_plant_SE` (drives his sword into the ground → beat → pulls it free → guard) | 047 | SE | no | 36 / 2.5 s | One clip, with the pause marked | MISSING |
| ☐ | `kael_cin_offer_waterskin_SE` | 048 | SE | no | 16 / 1 s | A duo with Eiryn isn't needed if she just looks at it | MISSING |
| ☐ | `kael_cin_point_road_SE` ("you're not doing it alone"; nods toward town) | 048–050 | SE | no | 16 / 1 s | | MISSING |

### 10D. Duo: Kael + Eiryn

| ✓ | ZIP | TW | Camera | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|
| ☐ | `kael_eiryn_cin_waterskin_SE` (he holds it out, she takes it or doesn't) | 048 | SE | no | 24 / 1.5 s | **Optional:** single clips can play it | MISSING (optional) |

---

## 11. BANDITS (TW-045 → TW-047)

**Sources:**
- the fight scenario `clearingKael`: four bandits, Kael fighting, Eiryn a non-player companion;
- the scene `c1.voice` (book lines);
- the drop scene `c1.drop`.

**Canon:** nobody dies in the clearing. A beaten bandit goes down, scrambles up, and runs off out of view.

### 11A. Broad-shouldered bandit (heavy brawler; the boss of the fight)
In the code: big, slow, a huge knock-down fist; punishes anyone exhausted; goes for Eiryn first.

| ✓ | ZIP | TW | Type | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☐ | `broad_base.png` | — | — | S | — | 1 | Reference | MISSING |
| ☐ | `broad_idle_combat_[DIR]` | 045–047 | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `broad_walk_[DIR]` | 045–047 | G | S SE E NE N | yes | 24 / 2.2 s | Heavy stride. Backing away = the walk played backwards in code | MISSING |
| ☐ | `broad_run_[DIR]` | 047 (charges); flees | G | S SE E NE N | yes | 24 / 0.9 s | | MISSING |
| ☐ | `broad_attack_fist_[DIR]` (slow wind-up haymaker that floors people) | 047 | G | S SE E NE N | no | 20–24 / 1.6 s | **Long, readable wind-up.** Mark the hit frame | MISSING |
| ☐ | `broad_dodge_[DIR]` | 047 | G | S SE E NE N | no | 10 / 0.4 s | He rarely dodges | MISSING |
| ☐ | `broad_hit_[DIR]` | 047 | G | S SE E NE N | no | 8 / 0.3 s | | MISSING |
| ☐ | `broad_stagger_[DIR]` | 047 | G | S SE E NE N | no | 12–16 / 0.8 s | | MISSING |
| ☐ | `broad_knockdown_[DIR]` (fall + scramble up) | 047 | G | S SE E NE N | no | 24–30 / 1.6 s | Also the "beaten" fall before he runs | MISSING |
| ☐ | `broad_taunt_[S,SE]` ("Then do another trick…", "That's what I thought.") | 045, 047 | C + G | S SE | no | 16–24 / 1.2 s | | MISSING |
| ☐ | `broad_cin_circle_[S,SE]` (menacing advance on Eiryn) | 045 | S SE | yes | 24 / 2 s | Can reuse the walk | reuse |

### 11B. Knife bandit (quick; feints; dodges a lot)

| ✓ | ZIP | TW | Type | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☐ | `knife_base.png` | — | — | S | — | 1 | Reference | MISSING |
| ☐ | `knife_idle_combat_[DIR]` | 045–047 | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `knife_walk_[DIR]` (prowling) | 045–047 | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `knife_run_[DIR]` | 047; flees | G | S SE E NE N | yes | 24 / 0.8 s | | MISSING |
| ☐ | `knife_attack_stab_[DIR]` (quick lunging stab) | 047 | G | S SE E NE N | no | 12 / 0.5 s | Mark the hit frame. His **feint** reuses the stab's wind-up and stops short, in code | MISSING |
| ☐ | `knife_dodge_[DIR]` | 047 | G | S SE E NE N | no | 10 / 0.35 s | | MISSING |
| ☐ | `knife_hit_[DIR]`, `knife_stagger_[DIR]`, `knife_knockdown_[DIR]` | 047 | G | S SE E NE N | no | 8 / 12–16 / 24–30 | As Broad | MISSING |
| ☐ | `knife_taunt_[S,SE]` ("She can't. Look at her." / "Pretty thing, walking alone?") | 045 | C | S SE | no | 16–24 / 1.2 s | | MISSING |

### 11C. Grabber bandit (flanker; goes for Eiryn; "She's trouble." as he flees)

| ✓ | ZIP | TW | Type | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☐ | `grabber_base.png` | — | — | S | — | 1 | Reference | MISSING |
| ☐ | `grabber_idle_combat_[DIR]` | 045–047 | G | S SE E NE N | yes | 24 / 2 s | | MISSING |
| ☐ | `grabber_walk_[DIR]` (creeping around the side) | 045–047 | G | S SE E NE N | yes | 24 / 2.2 s | | MISSING |
| ☐ | `grabber_run_[DIR]` | 047; flees | G | S SE E NE N | yes | 24 / 0.8 s | | MISSING |
| ☐ | `grabber_attack_grab_[DIR]` (lunging grab and shove) | 047 | G | S SE E NE N | no | 14–16 / 0.7 s | Mark the hit frame | MISSING |
| ☐ | `grabber_dodge_[DIR]`, `_hit_[DIR]`, `_stagger_[DIR]`, `_knockdown_[DIR]` | 047 | G | S SE E NE N | no | as above | | MISSING |
| ☐ | `grabber_taunt_[S,SE]` ("Bet you scream nice.") | 045 | C | S SE | no | 16 / 1 s | | MISSING |

### 11D. Lookout bandit (hangs back by the path; loses his nerve and runs; makes Kael glance away)
**D10:** reuse all the grabber's clips with a code colourway. Only the extra clip below is needed.

| ✓ | ZIP | TW | Type | Dirs | Loop | Frames / s | Notes | Status |
|---|---|---|---|---|---|---|---|---|
| ☐ | `lookout_idle_nervous_[S,SE,E]` (watching, shifting from foot to foot) | 045–047 | G | S SE E | yes | 24 / 2 s | | MISSING |
| — | walk / run / dodge / hit / knockdown | 047 | G | 5 dirs | | | Reuse the grabber's (D10) | reuse / OPEN |

**Bandit defeat:** `knockdown` (fall + scramble up), then `run`. No death clips: nobody dies in the clearing.

---

## 12. Portraits (close-up busts for cutscenes)

### 12A. Format
- **Size:** transparent PNG, about **1024 px tall**, head and shoulders, 3/4 view facing screen-left. The game mirrors it for facing right (watch asymmetric details).
- **Per character:**
  - one **face base** per expression;
  - plus **eye layers**: open, half, closed (for blinking);
  - plus **mouth layers**: closed, mid, open (talking).
  
  Separate layers are much cheaper than full images.
- **Naming:** `portrait_<character>_<expression>.png`, `portrait_<character>_eyes_<state>.png`, `portrait_<character>_mouth_<state>.png`.

### 12B. Needed before or during the bandit encounter

| Character | Priority | Expressions |
|---|---|---|
| **Eiryn** | 1 | neutral; teasing smile; laugh; surprised / fear (the gap); determined (Pressure, Negation); pained / exhausted; anguish / silent scream (TW-033); deadpan / calm ("why should I be?") |
| **Kael** | 1 | neutral; annoyed (the stew); smirk; surprised (the glyph); serious / determined; concerned; battle shout |
| **Alric** | 2 | neutral; playful smirk; laugh; tender; alert (senses danger); afraid / desperate; resolved (shielding her). Plus his beast form if D2 allows. |
| **Broad bandit** | 3 | sneer; laugh; angry; startled (Kael lands) |
| **Knife bandit** | 3 | sneer; laugh; wary |
| **Grabber bandit** | 3 | leer; startled; scared ("She's trouble.") |
| **Spearwoman** | 4 (D6) | smirk; laugh; neutral |
| **The climber** | not needed | Anonymous: no face shown |

---

## 13. Done in code: don't put these in the sheets
- **Glyphs:** Pressure rings and the force push; the launch glyph under her feet; the Negation dome; the preservation glyph that won't widen; the fizzling half-circle; the huge rotating formation over the treeline.
- **Effects:** projectiles; slash trails; hit sparks; parry flashes; dust; tile cracks and falling tiles; debris; falling pillars; skyfire; the flood; rifts and the giants of darkness; Fragments and the summit presence (if D4 = a); the light of the ascent; speed lines; trees whipping past.
- **Camera and screen:** cuts, slow motion, shake, point-of-view moves, letterbox, subtitles, the protected Reset painting.
- **Small props:** the spear by the table, the stew, the waterskin. These can be code-drawn props, or painted into the clip that uses them.

---

## 14. Production order (chronological, reuse first)

**Before anything:**
1. ☐ Answer D1–D11 (§1).
2. ☐ Reference sheets (front, side, back) for **Kael**, **Alric**, the **climber**, the **broad**, **knife** and **grabber** bandits. One generation each, used to keep later clips on-model.

### Batch 1: Eiryn finished for free movement (used everywhere)
3. ☐ `eiryn_walk_NE`, `eiryn_walk_N`.
4. ☐ `eiryn_idle_[S,SE,E,NE,N]`.
5. ☐ `eiryn_run_[SE,E,NE,N]`.
6. ☐ Decide on walk_E (the cape): regenerate if needed.

### Batch 2: title screen and opening (D9 = a)
7. ☐ Kael's movement: `kael_base`, `kael_idle_[5]`, `kael_walk_[5]`, `kael_run_[5]`. Also needed in the tavern and the fight.

### Batch 3: rooftops (TW-001–010)
8. ☐ Alric's movement: `alric_idle/walk/run_[5]`, `alric_jump_[E,SE]`.
9. ☐ Eiryn: `eiryn_cin_feet_run_E`, `eiryn_jump_[E,SE]`, `eiryn_cin_misjudge_E`, `eiryn_cin_pressure_launch_E`.
10. ☐ `alric_cin_leap_E`, `alric_run_lookback_E`.
11. ☐ Duos: `alric_eiryn_cin_catch_E`, `alric_eiryn_cin_hug_SE`.
12. ☐ Dialogue: Eiryn and Alric `talk_idle`, `listen`, `react_laugh`; `eiryn_cin_point_SE`.

### Batch 4: the street (TW-011–018)
13. ☐ `walk_talk_L/R` for both.
14. ☐ Erdra townsfolk: 2–4 adults × (idle, walk, talk, turn_lookup); vendor; musician; child.
15. ☐ `*_cin_horn_turn_SE` for both.
16. ☐ Duos: `alric_eiryn_cin_close_SE`, `alric_eiryn_cin_door_S`.
17. ☐ Optional: `eiryn_cin_take_item_SE`, `eiryn_cin_kick_ball_SE`.

### Batch 5: the summit (TW-019)
18. ☐ The climber's gameplay set (§6A).
19. ☐ The climber's cinematic clips (§6B).
20. ☐ Fragments and the presence only if D4 = b.

### Batch 6: the Reset (TW-020–034)
21. ☐ `alric_cin_sense_S`, `eiryn_cin_startle_S`.
22. ☐ `alric_eiryn_cin_run_hand_SE`, `eiryn_cin_cower_S`.
23. ☐ `eiryn_attack_ranged_[SE,E,NE,N]` (Pressure on debris, TW-024).
24. ☐ `eiryn_negation_[S,SE]`, `eiryn_cin_kneel_exhausted_S`.
25. ☐ Townsfolk: `run_panic`, `cower`, `fall`, `carry_child`.
26. ☐ `alric_cin_search_S`, `alric_cin_demand_S`, `alric_eiryn_cin_grip_SE`, `eiryn_cin_refuse_S`.
27. ☐ (D2) `alric_cin_transform_S`, `alricbeast_*`, `alricbeast_eiryn_cin_shield_S`.
28. ☐ `eiryn_cin_preservation_cast_S`, `eiryn_cin_reach_out_S`, `eiryn_cin_scream_S`.

### Batch 7: the tavern and the street (TW-035–043)
29. ☐ Ashgate regulars: 2–4 adults × (sit_idle, sit_drink, sit_eat, sit_talk, sit_laugh, stand_up, walk, idle, point, lookup).
30. ☐ Kael: `sit_eat`, `sit_talk`, `sit_laugh`, `sit_lookup`, `stand_up`, `cin_watch_glyph_N`, `cin_decide_S`.
31. ☐ (D6) Spearwoman; (D7) tavern keeper.

### Batch 8: the bandits (TW-044–047)
32. ☐ Bandit reference sprites; then each bandit's gameplay set (§11A–11D).
33. ☐ Taunts: `broad_taunt`, `knife_taunt`, `grabber_taunt`, `lookout_idle_nervous`.
34. ☐ Eiryn's fight set:
    - `drained_idle_[5]`, `fizzle_[5]`, `dodge_[5]`, `hit_[5]`, `stagger_[5]`, `knockdown_[5]`, `defeat_[5]`, `allout_[S,SE,E]`;
    - branch clips if D8 = a;
    - optional `cin_backstep_S`.
35. ☐ Kael's fight set:
    - `idle_combat_[5]`, `attack1–3_[5]`, `block_[5]`, `dodge_[5]`, `hit_[5]`, `stagger_[5]`, `knockdown_[5]`, `defeat_[5]`, `drained_[5]`, `glance_back_[5]`, `allout_[S,SE,E]`;
    - (D11) `heavy_[S,SE,E]`.
36. ☐ Kael's entrance: `kael_cin_drop_land_S`, `kael_cin_sword_plant_SE`.

### Batch 9: the aftermath (TW-048–050)
37. ☐ `kael_victory_S`, `kael_cin_offer_waterskin_SE`, `kael_cin_point_road_SE`.
38. ☐ Kael and Eiryn `talk_idle`, `listen`, `walk_talk`; `eiryn_react_sigh_S`, `eiryn_idle_look_around_SE`; optional `kael_eiryn_cin_waterskin_SE`.

### Portraits (in parallel)
39. ☐ Eiryn and Kael (priority 1).
40. ☐ Alric (priority 2).
41. ☐ The bandits (priority 3).
42. ☐ Spearwoman (priority 4, D6).

### Later (after this range, already listed so the sets are complete)
43. ☐ Eiryn: `idle_combat_[SE,E,NE,N]`, `attack_close_[5]`, `block_[5]`, `negation_[SE,E,NE,N]` (gameplay).

---

## 15. Rough totals (to plan credits)

| Group | Sheets (approx.) | Notes |
|---|---|---|
| Eiryn, in range | ~75 | 7 done; D8 = b removes 15 |
| Eiryn, later (her complete combat set) | ~22 | Not needed until the Ogre |
| Alric + beast + duos | ~55 | The beast form waits on D2 |
| Erdra townsfolk (2 adults + child, minimal) | ~35 | ~70 with 4 adults |
| Climber | ~60 | D4 = b adds ~25 |
| Ashgate regulars (2 adults, minimal) | ~45 | ~90 with 4 |
| Kael | ~95 | |
| Bandits (lookout reusing the grabber) | ~110 | |
| Portraits (6–7 characters, layered) | ~50 images | |

**Fastest route to a visually complete opening:**
- Minimal NPC counts.
- D1 = same outfit; D4 = code effects; D8 = drop the branch; D9 = Eiryn and Kael only; D10 = recolour.

That is roughly **350–400 sheets** plus portraits.
