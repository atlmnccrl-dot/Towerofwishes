# Game Director's Bible — Part 1: TW-001 to TW-082
*From the rooftop to the Ogre and the first payout.*

**How to read this.**
- Every event id from the 430-event inventory (`docs/source/MASTER_HANDOFF_2026-10-17.txt`) in this range appears below exactly once, under the sequence where it happens.
- Labels:
  - **[CANON]**: the author's story fact.
  - **[GAME]**: game-approved.
  - **[OPTION]**: needs approval.
  - **[OPEN]**: undecided.
  - **[PROPOSAL]**: my addition, needs your approval; never presented as canon.
- "Build now" is what the current build does, checked in the repo on 18 Oct 2026. Full state per id: `docs/EVENTS.md`.
- Dialogue in quotes marked *(book)* is from the older manuscript and is kept unless you replace it. Lines marked *(inventory)* are the inventory's own direction. Everything else is a placeholder **[PROPOSAL]** for your rewrite.

**Shared rules for this part.**
- **Camera.**
  - *Play camera:* the existing 3/4 top-down view, following the host.
  - *Cinematic camera:* directed shots (close-ups, POV, low angles) used only for authored scenes.
  - Normal specials never switch to the cinematic camera; heavy arts do.
- **Text.** Subtitles under the picture. Ambient murmurs are "…". No balloons.
- **Skip.**
  - A settings toggle "Skip cutscenes" plus a skip button in each scene.
  - Skipping applies every flag, reward, injury and recruitment immediately.
- **Defeat.**
  - Retry the fight, or leave (change gear, run optional content) and come back.
  - No progress lost. There are no hearts.
- **Checkpoints.** One before every boss and every long cutscene, and one at every map entry.

---

## S01 — Rooftops of the old city · TW-001 to TW-010
**Before the Reset. Play as Eiryn.**

| Id | Label | Event |
|---|---|---|
| TW-001 | CANON | Rooftop feet first |
| TW-002 | CANON | Roofline pursuit (optional brief control) |
| TW-003 | CANON | Flirting while running |
| TW-004 | CANON | Misjudged leap |
| TW-005 | CANON | First magic demonstration (Pressure launch) |
| TW-006 | CANON | Alric's physical leap |
| TW-007 | CANON | Midair rescue |
| TW-008 | CANON | "I wanted the hug" |
| TW-009 | CANON | Almost home |
| TW-010 | CANON | The neighbours' roofs |

**Build now:** `p.overlook`.
- What exists: a staged rooftop run on a single roof with in-place hops, followed by the older manuscript's overlook dialogue.
- Missing: the feet close-up, roof-to-roof gaps, the Pressure launch, Alric's catch and the "hug" exchange.

**Environment.**
- A chain of 4 rooftops at dusk, each a separate slab, with gaps of 3–6 m between them and a 12 m drop to a lit street.
  - Roof 1 (start): slate, chimney stacks.
  - Roof 2: flat terrace with laundry lines.
  - Roof 3: steep tiles, lower by 1.5 m.
  - Roof 4: a long ridge toward "home", a recognisable blue door below.
- Background: the city skyline, lanterns lighting one by one, the Tower on the horizon under the permanent cloud ceiling.
- Re-uses the existing `rooftops` arena painter, extended to multiple slabs with real gaps (sky and street visible through each gap).

**Entry.**
- Cut from the opening title cinematic (`opening.js`, kept).
- Spawn: Eiryn on Roof 1, running east. Alric is off-screen behind.

**Sequence and shots.**
1. **CIN — feet** (TW-001).
   - Tight low shot on Eiryn's boots striking tiles.
   - Tilt up to her back, white hair moving. Alric enters from behind, visibly faster, and passes her.
   - Sound: tile clatter, wind, distant bells of ordinary city life.
2. **PLAY — roofline** (TW-002, optional brief control).
   - The joystick moves Eiryn along Roof 1→2. Jumps are automatic at gap edges (no platforming skill test).
   - If the player does nothing for 4 s, auto-run continues.
   - Alric stays a few metres ahead, glancing back.
   - Duration: under 25 s. No way to fall.
3. **DIA while running** (TW-003). Subtitles during the run: teasing about who is slower, the race "home".
   - Placeholder lines **[PROPOSAL]** until you write them: Alric "You're letting me win." / Eiryn "I'm letting you think that."
4. **CIN — misjudged leap** (TW-004).
   - Control locks at the edge of Roof 3. POV shot from Eiryn: the gap is wider than she judged; the street far below swims into view.
   - 0.4 s slow motion.
5. **CIN/PLAY — Pressure** (TW-005).
   - A violet glyph flashes under her feet. A visible push of force launches her forward and up; she overshoots.
   - First readable demonstration of her magic: a ring of compressed air, and dust blown off the tiles below.
6. **CIN — Alric's leap** (TW-006).
   - Low angle: Alric crouches. Tiles crack under the push-off. He leaps by strength alone: no glyph, no glow.
   - The cut shows the gap he covers.
7. **CIN — catch** (TW-007).
   - Midair, he catches her, rotates so his back takes the landing, and lands hard on Roof 4. Tiles shatter and slide; a few fall to the street.
   - Camera: a tracking side-on shot, then a hard stop on impact with a short shake.
8. **DIA** (TW-008, inventory direction): "too slow" / "let you catch me" / "wanted the hug". Tender, not expository.
9. **DIA** (TW-009): Eiryn notes they almost reached home. The camera finds the blue door below.
10. **DIA** (TW-010): they decide to walk the rest before the neighbours notice the broken roofs. A comic beat: one more tile slides off.

**Control returns:** none. The sequence cuts to S02 as they drop to street level (a short ladder or awning drop, shown, not played).

**Characters:** Eiryn (look `eiryn`, young, before the Reset), Alric (`alric`). No enemies.

**Rewards / state:** none. Flag `prologue.rooftop` is set.

**Assets needed.**
- Multi-slab rooftop map.
- Animation poses: jump, airborne, catch, landing.
- Pressure launch effect.
- Tile-crack and debris effects.
- A feet close-up shot. This needs either a dedicated close-up painter or a stylised panel cut-in (the existing `panel()` system in `fx.js` can frame it).

**QA.**
- Eiryn visibly leaps between at least three separate roofs.
- The Pressure launch reads as her own magic before any explanation.
- Alric uses no magic.
- The scene lasts 60–90 s with dialogue.
- No balloons.
- Skippable, and skipping sets `prologue.rooftop`.

**Note for you.** Item 7 of your playtest asks for the rooftop to end on "the view toward the distant Tower and its bell motif". The inventory places the Tower horn later (TW-014, on the street). My proposal: the rooftop ends with the Tower visible on the skyline (no sound), and the horn happens in S02 as the inventory orders it.

---

## S02 — The living street · TW-011 to TW-018
**Before the Reset. Eiryn and Alric walk home.**

| Id | Label | Event |
|---|---|---|
| TW-011 | CANON | Living pre-Reset street (short interactive stroll) |
| TW-012 | CANON | Pastries and errands |
| TW-013 | CANON | Tomorrow at home |
| TW-014 | CANON | The Tower's floor-clear sound |
| TW-015 | CANON | Someone's climbing |
| TW-016 | CANON | Could Alric climb it? |
| TW-017 | CANON | Already have my wish |
| TW-018 | CANON | Breathing space |

**Build now:** `p.evening`.
- What exists: the staged square at evening with the older manuscript's narration.
- **Conflict:**
  - The older text has *Alric* say "I already have everything I could ever wish for."
  - TW-017 says *Eiryn* tells Alric she already has her wish.
  - I will follow the inventory unless you say otherwise.

**Environment.**
- One evening street, about 40 m long, ending at the blue door.
- Built on the existing `square` theme (warm lamps).
- Stalls: a baker, a fruit seller, a fountain with a musician. Children run through.
- The Tower stands at the end of the street over the rooftops.

**Entry:** Eiryn and Alric at the street's west end.

**Play** (TW-011, under 90 s).
- The joystick moves Eiryn. Alric walks with her.
- Optional interactions (a glowing mark on approach):
  - The baker's stall (TW-012): pastries, the errand joke.
  - The musician.
  - Children's game: a ball rolls to her; she kicks it back.
- None of these are required.
- Main marker: the blue door.

**Dialogue beats (DIA).**
- TW-012 and TW-013: domestic plans (a meal, a hinge to fix tomorrow) as natural subtitles while walking.
- Each optional stall adds one exchange.

**CIN — the horn** (TW-014).
- Triggered when Eiryn passes the fountain. The world-sized horn sounds from the Tower.
- Every citizen stops and turns. The musician stops. A child points.
- Camera: a wide shot of the street with everyone turned the same way, then the Tower.
- Sound design is the key asset: a low, alien, layered horn.

**DIA** (TW-015, TW-016, TW-017).
- Talk of climbers and the wish legend.
- Alric doesn't think he could reach the top; he teases her.
- Eiryn says she already has what she'd wish for.

**CIN — breathing space** (TW-018).
- A quiet held shot: the two of them at the door, lanterns, the street going on around them.
- 4–5 s with no dialogue. No foreboding speech.

**Control returns:** no. Cut to S03 (the summit).

**Characters.** Eiryn and Alric, with 8–12 townspeople using the `patron` variants. Patron looks get a pre-Reset palette.

**State:** flag `prologue.street`.

**Assets needed.**
- Extend the street layout of the `square` painter.
- Stall props, a fountain prop, children (scaled patrons).
- Horn sound.

**QA.**
- The stroll is under 90 s.
- All stalls are optional.
- The horn interrupts ordinary life and every NPC reacts.
- The TW-017 line is Eiryn's.

---

## S03 — The unknown climber · TW-019
**Inside the Tower, at the last ascent.**

| Id | Label | Event |
|---|---|---|
| TW-019 | CANON | Unknown summit climber: anonymous, wounded; no wish shown, no Guardian revealed |

**Build now:** `p.tower` → `p.ascent` → `p.light`.
- What exists: the climber creeps in wounded.
- There is a playable tutorial fight against Fragments and "Kharuun".
- His last stand (Dark Legion) wins it, and he ascends into light.
- The older manuscript names him "the Dark Legion Caller" and the boss "Kharuun".

**Playtest item 8:**
1. Cinematic entrance.
2. The climber defeats one or two underlings with an impressive attack.
3. The boss retaliates.
4. A playable auto/manual battle.
5. A cinematic desperate final power move.
6. Ascent, light, Reset.

The current build has the battle and the final move, but not the entrance or the underling kill.

**Environment:** the existing `summit` arena (broken top floor, open sky, red floor glyphs). Kept.

**Sequence.**
1. **CIN — entrance.**
   - Low angle on the stairs as a lone armoured figure climbs into the hall. Blood on the armour.
   - Two Fragments drop from the dark to block him.
   - He kills both in one move: a blade arc with a dark wake, cut in one motion. The camera stays on the climber.
2. **CIN — the boss answers.** The guardian presence (named only if the inventory names it; it does not) rises behind the pillars and strikes. He is thrown and gets up.
3. **PLAY — the fight.**
   - Auto by default, with manual control available.
   - This is the one place the host system appears before Kael's arc. The crown is not shown here; the climber is simply controllable with the joystick and attack button if the player touches them.
   - Coach tips teach the attack, the special, and All Out.
4. **Scripted last stand** (exists).
   - He cannot fall before 16 s.
   - At 20% health the cinematic fires: a rift opens behind him, giants of darkness surge out and crush the enemy.
5. **CIN — ascent** (exists, kept). The path opens, he steps into the light.

**Not to invent:** his name, his wish, the Guardian. His look stays hooded and anonymous.

**Question for you:** keep the older manuscript's names "Kharuun" and "Dark Legion" on screen, or show no names at all? My proposal is to show no names; the heavy-art title becomes simply "—".

**Assets needed:** an underling-kill animation (reuse the blade heavy-art pieces), the boss attack telegraph.

**QA.**
- The climber never shows his face or a wish.
- The fight cannot be lost.
- The last stand always fires.
- Total length is under 2 min including cutscenes.

---

## S04 — The Reset · TW-020 to TW-034

| Id | Label | Event |
|---|---|---|
| TW-020 | CANON | Alric senses something wrong |
| TW-021 | CANON | Firmament splits |
| TW-022 | CANON | Skyfire begins |
| TW-023 | CANON | First escape |
| TW-024 | CANON | Protect townspeople with Pressure |
| TW-025 | CANON | Negation defense |
| TW-026 | CANON | Impossible flood |
| TW-027 | CANON | Home destroyed |
| TW-028 | CANON | No way out |
| TW-029 | CANON | The self-only preservation spell |
| TW-030 | CANON | She refuses to leave him |
| TW-031 | CANON | Alric shields her |
| TW-032 | CANON | Failed attempt to include Alric |
| TW-033 | CANON | Preservation completes |
| TW-034 | CANON | The original Reset ends |

**Build now:** `p.reset`. The painted animated skyfire-and-flood shot (protected, your quality reference), with narration.

**Sequence.**
1. **CIN** (TW-020).
   - Back at the blue door. Sound drops out; the air goes still.
   - Alric's head turns before anything is visible.
2. **CIN** (TW-021, TW-022).
   - **The protected painted shot plays here unchanged:** the firmament fractures, then columns of skyfire fall on distant blocks.
3. **CIN/PLAY — first escape** (TW-023).
   - Alric grabs her hand. A short directed run down the street as façades fail.
   - Optional joystick: the player steers Eiryn but cannot fail.
4. **PLAY/CIN — Pressure saves people** (TW-024).
   - A falling beam over two townspeople.
   - Prompt: the special button (or auto after 2 s) casts Pressure and shoves the debris aside.
   - Shows the spell's limits: a smaller ring, and she staggers.
5. **PLAY/CIN — Negation** (TW-025).
   - A wave of skyfire comes down the street.
   - Eiryn raises Negation: a dome where the fire vanishes, over a limited area only. Beyond its edge the street still burns.
   - Physical cost: she drops to one knee. She cannot save the city.
6. **CIN — flood** (TW-026). From the side streets, black water rises with no source, at the same time as the fire.
7. **CIN — home destroyed** (TW-027).
   - The blue door, the stalls, the fountain: all gone in one shot.
   - No narration, just the image.
8. **CIN — rooftop** (TW-028; playtest item 9).
   - They climb back up to escape the water: the same Roof 4 from S01.
   - Pillars and towers fall around them; the flood rises below.
   - Alric searches for routes: every direction fails in quick cuts.
9. **DIA** (TW-029, TW-030).
   - Alric demands she cast the preservation spell that protects only its caster.
   - She refuses. He admits fear; inventory direction: "I'm not asking you."
10. **CIN — shield** (TW-031; playtest item 9).
    - A slow-motion pillar descends toward them. Alric transforms into his vampiric beast form to shield her: a visual callback to the roof catch.
    - **Needs your design input:** what his beast form looks like. A placeholder silhouette (larger, clawed, wings undecided) is used until you approve.
11. **CIN** (TW-032).
    - Under him, Eiryn casts preservation and tries to widen it around him. The glyph refuses to grow past her.
    - No workaround.
12. **CIN** (TW-033).
    - Her POV: time stops for her. Through the barrier she sees him left outside it as the fire comes down.
    - Tragic and quiet. Sound collapses to her breathing.
13. **CIN** (TW-034).
    - Wide shot: the devastated civilisation.
    - Her own experience cuts away. **No waking scene here.**

**Removed from the current build** (they contradict TW-034/035 and TW-254):
- The fireside-tale scene `p.story`.
- The "She was still waiting" dawn card.

**State:** flag `prologue.done`. No party, no XP.

**Assets needed.**
- Alric's beast form: design needed from you.
- Falling-pillar set piece.
- Negation dome effect.
- Flood rising on the rooftop map.
- Preservation glyph that fails to widen.

**QA.**
- Skyfire and flood happen together.
- The protected painted shot is unchanged.
- Eiryn's Pressure and Negation each show a limit and a cost.
- Alric is not preserved.
- The scene does not explain the awakening.
- The sequence from TW-020 to TW-034 runs about 3–4 minutes, with no long evacuation.

---

## S05 — 150 years later: Kael's tavern · TW-035 to TW-043
**Ashgate, a tavern near the Guild office. Evening. Play as Kael.**

| Id | Label | Event |
|---|---|---|
| TW-035 | CANON | 150 YEARS LATER: hard cut to Kael's tavern; preservation expires naturally (not explained here) |
| TW-036 | CANON | Kael in an ordinary tavern |
| TW-037 | CANON | Tavern banter |
| TW-038 | OPTION | Small tavern interactions |
| TW-039 | CANON | Patron notices light |
| TW-040 | CANON | Crowd gathers at windows |
| TW-041 | CANON | Kael steps into street |
| TW-042 | CANON | Ancient spell falters |
| TW-043 | CANON | Decision to investigate |

**Build now:** `c1.tavern` → `c1.formation` → `c1.clip` → `c1.go`.
- What exists:
  - A staged tavern with Kael, a spearwoman and a cook (stew banter).
  - The glyph is watched through the window and seen to fail from inside.
  - Kael leaves.
  - Kael's intro card says "Somebody who asked nicely" (to remove).

**Playtest item 10:**
- Remove the cook subplot and the chatter boxes; patrons murmur "…".
- The glyph is seen through the window and the crowd looks.
- Kael walks out and looks toward the glyph.
- Keep the Eiryn glyph close-up and failure, and the Kael running sequences.
- Give Kael an original reaction, not a placeholder line.

**Environment.**
- **Map T1, tavern interior.** The existing `tavern` arena, about 17 × 10 m.
  - Door: east wall. Windows: north wall. Bar: north-east. Hearth: south-west.
- **Map T2, the street outside** (new). A short Ashgate street at night: lamps, a well, the road north to the treeline. The glyph is visible in the sky to the north.
- Both are walkable.

**Sequence.**
1. **CIN** (TW-035).
   - A hard cut from the devastation to the title card "150 years later" over the tavern's warm interior.
   - Then the camera finds Kael at his table.
2. **PLAY — the tavern** (TW-036, TW-037, TW-038).
   - The player controls Kael (joystick). Patrons talk among themselves, shown as "…" over heads, plus a subtitle when Kael walks near them.
   - Conversations (TW-037) are overheard snippets about guild work, roads, beasts and prices. **[PROPOSAL lines]**
   - Kael's day and complaints: one exchange with the spearwoman at his table. The cook's lines are removed. **[PROPOSAL]** Rewrite the stew exchange without the cook, or cut it.
   - **[OPTION] TW-038:** the notice board by the door (rumours, travel notices), regulars.
   - Main marker: none for 20 s. Then TW-039 triggers.
3. **CIN** (TW-039). A patron at the window: "…" becomes a subtitle as purple light shows above the treeline through the glass.
4. **CIN** (TW-040).
   - The crowd moves to the windows (staged walk). Murmurs debate its size; three short subtitles.
   - Kael looks.
5. **PLAY** (TW-041).
   - Marker: the door. Kael walks outside.
   - **Transition:** a door-open wipe into Map T2. Kael stands in the street.
6. **CIN** (TW-042).
   - From the street, Kael watches the huge rotating glyph in the north.
   - Cut to the existing Eiryn glyph close-up and failure (kept): an inner ring stops, the formation shudders and comes apart.
   - No explosion.
7. **DIA** (TW-043).
   - Kael has no idea who cast it. Concern and curiosity.
   - His reaction line replaces "finally some action" and "asked nicely". **[PROPOSAL, for your rewrite]:** Kael (quiet, to himself) "Nobody draws something that big for fun." He starts walking north.

**Control returns:** Kael in Map T2. The main marker is the north road.

**State:** flag `c1.tavern.done`.

**Assets needed.**
- The street map T2.
- Ambient "…" murmur markers.
- A window light-spill effect on the patrons.

**QA.**
- No cook.
- No speech bubbles; patrons show only "…" plus subtitles.
- Kael walks out by player control; the glyph fails while he is outside.
- The "asked nicely" line is gone everywhere, including the face-off card.

---

## S06 — The treeline sprint and the bandits · TW-044 to TW-050

| Id | Label | Event |
|---|---|---|
| TW-044 | CANON | Kael's sprint to the treeline |
| TW-045 | CANON | Bandits corner Eiryn |
| TW-046 | CANON | Eiryn refuses to submit |
| TW-047 | CANON | Bandit rescue (playable Kael combat) |
| TW-048 | CANON | After the rescue |
| TW-049 | CANON | The vanished town |
| TW-050 | CANON | A practical offer |

**Build now.**
- `c1.run` (staged sprint, kept).
- `c1.voice` (bandits corner her; book lines).
- `c1.fight`: a playable battle, Kael alone vs 4 bandits; 65–80% win without All Out, as targeted.
- `c1.after`, `c1.walk`.
- Bandits are beaten, then flee (they now run out of view).

**Playtest item 11:**
1. A cutscene of weakened Eiryn surrounded.
2. Her attempted spell fails.
3. Kael drops from above.
4. He plants his sword in the ground, pulls it out and confronts them.
5. Then the playable rescue.

**Environment.**
- **Map F1, the north road to the treeline** (walkable sprint path, about 60 m), on the `road` theme.
- Then the clearing: the existing `clearing` arena (fallen trunk, trees).

**Sequence.**
1. **PLAY** (TW-044).
   - Kael runs north on Map F1. The joystick has a sprint by default.
   - The camera trails behind and low to sell speed. The existing whip-past trunks effect is reused.
   - No enemies. Marker: the treeline. Under 30 s.
2. **CIN** (TW-045, TW-046).
   - The clearing: four bandits circle Eiryn at the trunk. She is out of mana and disoriented, not weak by nature.
   - Lines kept *(book)*:
     - "Keep your hands off me."
     - "Then do another trick. The big one. We all saw it."
     - "She can't. Look at her."
   - The lines "Pretty thing, walking alone?", "Bet you scream nice." and "Or maybe she don't scream at all." also come from the book and are kept unless you want them softened.
   - Eiryn tries a spell: a small glyph flickers and dies (the existing "fizzle" effect).
3. **CIN — Kael's entrance** (playtest item 11).
   - From above (the trunk or the bank), Kael drops into the circle.
   - He plants his sword in the ground between Eiryn and the bandits.
   - A beat. He pulls it out.
   - A line **[PROPOSAL]**: none, or a single word. My suggestion is silence; the action is the line.
4. **PLAY — the rescue** (TW-047).
   - Kael alone vs 4 bandits: broad, knife, grabber, lookout. Existing balance, existing AI.
   - Host: no crown yet. Kael is auto with optional joystick and attack.
     - The host system's crown is introduced at the second Kael+Eiryn fight (S11), per your handoff.
     - Here manual input is simply allowed, without the crown UI.
   - Victory: all bandits beaten. Each beaten bandit runs off-screen; this is narratively right (TW-047 says nothing about killing; the book says nobody dies in the clearing).
   - Defeat: retry from the checkpoint at the cutscene's end.
5. **CIN/DIA** (TW-048, TW-049, TW-050). Existing book lines, kept:
   - Kael: "They're gone." / Eiryn: "Good." / "Are you hurt?" / "Not by them." / "That spell over the trees. Was it yours?" / "It would have been considerably more impressive if it had worked."
   - The waterskin exchange.
   - TW-049: the vanished town; Kael explains roughly 150 years.
   - TW-050: Kael offers to walk her to the nearest town.

**Rewards / state.**
- XP to Kael.
- Flag `c1.rescued`.
- Eiryn's mana is depleted. She does not fight until S13. Carried as a state flag.

**Assets needed.** Map F1. A sword-plant animation (pose plus dust effect).

**QA.**
- The fizzle happens before Kael arrives.
- Kael's entrance plants and draws the sword.
- The fight is winnable without All Out at the targeted rate.
- No bandit "dies"; all leave the screen.

---

## S07 — Road to Ashgate · TW-051 to TW-053

| Id | Label | Event |
|---|---|---|
| TW-051 | CANON | Road to civilization |
| TW-052 | CANON | Different coins and customs |
| TW-053 | CANON | The painful meaning of 150 years |

**Build now:** `c1.walk` and `c2.gate` (staged talk only).

**Environment.**
- **Map R1, the road from the forest to Ashgate** (walkable, about 80 m).
- Along it: collapsed mile markers, a rebuilt bridge, a farm cart, a road shrine. Ashgate's walls come into view.

**Play.**
- The host is Kael. Eiryn follows on AI.
- Optional discoveries on the road. **[OPTION, TW-424-style collectibles]:** an old coin, a broken road sign with a name she recognises.

**Dialogue (DIA)** at trigger points along the road:
- TW-052: coins and customs, played as comedy.
- TW-053: the 150 years turns painful by the last trigger. The existing book lines "There was a town east of here…" / "How long?" / "A hundred and fifty years." are used here.

**Exit:** the town gate. A transition into S08.

**QA.** The tone runs funny → inconvenient → painful across the walk. No lonely-awakening flashback.

---

## S08 — Ashgate: town, the fine · TW-054 to TW-058

| Id | Label | Event |
|---|---|---|
| TW-054 | CANON | Town introduction |
| TW-055 | CANON | Casual public spell |
| TW-056 | CANON | Public magic fine |
| TW-057 | CANON | Kael pays the fine |
| TW-058 | CANON | Why they need jobs |

**Build now.** `c2.gate`, `c2.tavern` (with the cook, to remove), `c3.tea`, `c3.kael`, `c3.guild`. Staged on the `square` set.

**Environment.**
- **Map A1, Ashgate centre** (walkable).
  - Gate, square, inn, tea stall, guards' post, market, Guild office door.
  - The tavern door from S05 is on this map, so the town is one place.

**Play.**
- Free movement. Optional NPCs: a market seller, a guard, the inn. **[OPTION, TW-063]**
- Main marker: the inn (night), then next morning the tea stall.

**Sequence.**
1. Night at the inn (the existing `c2.tavern` scene, minus the cook).
2. A morning time-skip card.
3. **CIN** (TW-055, TW-056, TW-057). The existing staged scene is kept, with book lines:
   - Eiryn warms her tea with a tiny glyph.
   - The older guard: "Was that a spell? Do you have a public casting permit?" … "First offense. Issue the standard fine…"
   - Kael pays: "No need." … "Great. Now I'm broke too."
4. **DIA** (TW-058): food, lodging and permits push them to the Guild. The existing `c3.guild` lines.

**Rewards / state.**
- **Money becomes visible here.** Kael's purse drops to near zero (the economy starts).
- Flag `c2.fined`.

**QA.** The fine scene plays with no choice screen. Kael's money drops. The Guild becomes the marker.

---

## S09 — The Guild: registration, evaluation, the board · TW-059 to TW-064

| Id | Label | Event |
|---|---|---|
| TW-059 | CANON | First Guild Hall visit |
| TW-060 | CANON | Eiryn's registration/evaluation |
| TW-061 | CANON | Rank and limitations |
| TW-062 | CANON | Contract-board inspection |
| TW-063 | OPTION | Town NPC subplots |
| TW-064 | OPTION | Creature contract teaser (species needs your approval) |

**Build now.** `c4.guild` (registrar), `c4.eval` (yard), `c4.board`. Staged on the `guildhall` and `yard` sets.

**Environment.**
- **Map G1, Guild Hall interior** (walkable): registration counter, contract board, benches, other adventurers.
- **Map G2, Evaluation Yard** (existing `yard`).

**Sequence.**
1. **PLAY:** enter; marker on the counter.
2. **DIA** (TW-059): the registrar, F–S ranks, contract types (existing lines).
3. **PLAY** (TW-060), role-sensitive and limited.
   - In the yard, the host becomes **Eiryn** for one short test: move a stone block onto its mark with a small Pressure glyph, then keep a counter floating while walking.
   - Uses the special button. It dips twice, as written; her mana is still limited.
   - No fail state, no invented high rank.
4. **CIN/DIA** (TW-061): F rank. The book lines "Your initial credential will be at F rank…" and "Apparently I'm a beginner." Kael grumbles at bureaucracy.
5. **PLAY** (TW-062): the board is interactive. Tap notices: road repairs, missing cargo, an escort, the goblin contract.
6. **[OPTION] TW-063:** small NPC exchanges in town.
7. **[OPTION] TW-064:** a creature-capture notice. Not built until you approve a species.

**Rewards / state.**
- Eiryn registered (rank F).
- Contract "Goblins at the mill" is available.

**Note.** The existing side contracts (toll bridge, orchard, warren, missing cart, stray), the yard drills, the gauntlet and "Three for Hire" were my additions, marked Proposals. They are listed as possible **[OPTION]** board jobs for you to approve, keep or cut. They do not block the story.

**QA.** Eiryn's test cannot fail and shows limited mana. The rank is F. The board lists the goblin contract.

---

## S10 — Taking the job and setting out · TW-065 to TW-067

| Id | Label | Event |
|---|---|---|
| TW-065 | CANON | Take modest goblin job |
| TW-066 | CANON | Supplies and departure |
| TW-067 | CANON | Miller / contract giver |

**Play.**
- **TW-065:** accept the contract at the board.
- **TW-066:** the shop. A general store on Map A1 sells rations, bandages and torches with the little money they have. This is the first shop; buying is optional but useful (bandages heal between fights).
- Leave by the east gate.

**Environment.** **Map M1, the mill** at the foot of the quarry hill (existing `hillpath` theme, extended): the mill house, sheds, the stream.

**DIA** (TW-067). The miller explains the stolen grain, tools and his son's cut arm (existing book lines kept). Marker: the hill road.

**Removed.** The existing **fork** at the quarry hill (`c5.fork`, my Proposal) is retired from the main path. The inventory has no fork here, and TW-068 is "track the goblins". The fork system stays available for places you approve.

**QA.** The shop works with the current money. Buying bandages is optional. The miller scene plays on the walkable map.

---

## S11 — Tracking the goblins · TW-068 to TW-070
**The first Kael and Eiryn fights.**

| Id | Label | Event |
|---|---|---|
| TW-068 | CANON | Track the goblins |
| TW-069 | CANON | Outer goblin scout (FIGHT) |
| TW-070 | CANON | Approach skirmish (FIGHT) |

**Environment.**
- **Map H1, the quarry hill** (walkable, about 120 m up the hill). Grain spilled on the path, broken sacks and footprints act as tracking clues.
- The marsh where the road divides is scenery only.

**Play — tracking** (TW-068).
- Clues glow faintly when near. Following them reveals the path.
- Optional: a side path with a hidden cache (old coins). **[OPTION]**

**FIGHT 1 — scout** (TW-069).
- A goblin squats by a stolen sack, cries out and attacks. A single goblin.
- Kael fights; Eiryn supports in a limited way. Her mana is still low, so she has no glyph attacks: she shouts warnings and evades.
- Auto with optional manual input.
- *This is the first Kael and Eiryn joint fight.*

**FIGHT 2 — skirmish** (TW-070).
- Goblin spear, goblin archer and goblin. The existing `path` scenario, reused.
- **Host introduction** (your handoff: the second fight after Eiryn joins Kael):
  1. Before the fight, a tutorial card shows crown icons next to Kael and Eiryn on the party bar.
  2. "Tap the crown to take control. Tap again to let them fight on their own."
  3. Controls appear: joystick (left thumb), Attack (auto-targets the closest enemy), Special (Kael: a sword technique; Eiryn: a small glyph once some mana returns), All Out (party).
  4. Dodge and parry stay automatic, driven by the host's stats and timing.
- Telegraphs: the archer's aim line and the spear's lunge flash (existing).

**Victory.** All goblins beaten. The last surviving goblin runs only if it saw an ally destroyed (playtest item 19); the others die.

**Defeat.** Retry, or leave to the mill or town to buy supplies.

**Rewards.** XP per character who fought; small coin from the goblins.

**QA.**
- The crown appears for the first time at FIGHT 2, not before.
- Manual Kael can move, attack the nearest goblin and use his special.
- Turning the crown off returns him to AI immediately.
- Goblins die, except a frightened last survivor.

---

## S12 — The quarry and cave · TW-071 to TW-073

| Id | Label | Event |
|---|---|---|
| TW-071 | CANON | Quarry/cave investigation |
| TW-072 | CANON | Something's wrong |
| TW-073 | CANON | Interior goblin clash (FIGHT) |

**Environment.** **Map Q1, the quarry floor and cave mouth, then the cave interior** (existing `cave` theme). Stolen sacks, tools, a cart track, torches.

**Play** (TW-071). Investigate: stolen sacks, tools, a huge footprint. Each is an interactable that adds a line.

**DIA** (TW-072). Their reactions: the footprint is too big for goblins; a rumbling from deeper in.

**FIGHT** (TW-073).
- Goblins in the cave. The existing `cave` scenario: goblins and a hexer.
- Host available.
- Positioning matters: narrow tunnels, plus a cart that can be pushed. **[PROPOSAL]**, environment hazard only if cheap; otherwise none.

**QA.** The footprint clue appears before the ogre. The cave fight uses the narrow layout.

---

## S13 — The Ogre · TW-074 to TW-078

| Id | Label | Event |
|---|---|---|
| TW-074 | CANON | Ogre reveal |
| TW-075 | CANON | Kael versus Ogre (BOSS) |
| TW-076 | CANON | Kael pressed to the limit |
| TW-077 | CANON | Eiryn's recovered magic |
| TW-078 | CANON | Ogre defeated |

**Build now.**
- `c5.ogre` → `c5.ogrefight` → `c5.after`.
- **Measured:** the ogre is staggered or down for about 40% of a fight (27.8 s of 70 s), averaging 39 swings. It feels stun-locked.
- There is no cinematic finisher.

**Environment.** The deep cave chamber (existing ogre arena): a pit, a wall the spell can drive it into.

**Sequence.**
1. **CIN** (TW-074). The ogre rises from the dark behind the goblins. Low angle, torchlight. It leads the remaining goblins.
2. **BOSS — phase 1** (TW-075). Kael and the goblins vs the ogre. Eiryn is still charging and can't fight yet.
   - **Ogre fixes** (playtest item 12):
     - Stagger resistance: the ogre staggers only from heavy hits or All Out, and at most once every 6 s.
     - Attack scheduling: it always gets its next swing within about 2.5 s after recovering.
     - Response attack: when hit 3 times in 2 s it answers with a ground slam (a telegraphed circle).
     - Telegraphs: an overhead smash (a long red line) and a sweep (an arc).
   - Kael's role: draw its attention. The AI already has a "make it look at me" behaviour; the host can do it manually.
3. **CIN — pressed to the limit** (TW-076). At ogre 60%: it catches Kael and throws him into the wall. Kael is hurt (health reduced, not killed). Return to the same fight state.
4. **PLAY/CIN — Eiryn's magic returns** (TW-077).
   - At ogre 35%, Eiryn's charge completes: her special becomes available.
   - The host can switch to her with the crown, or the AI fires it.
5. **CIN — the finisher** (TW-078).
   - Eiryn draws the force into a narrow path. The ogre is driven into the quarry wall and dies.
   - Uses the existing book narration: "Eiryn draws the force into a narrow path. The ogre strikes the quarry wall…"
   - The goblins left alive: the last one flees, terrified (allowed by item 19).
   - Kael's injury stays (no magic heal).
   - The book lines "You could have told me you were capable of that." / "I did." / "The wall was convenient." are kept.

**Victory / defeat.**
- The ogre dies. On defeat: retry from the cave checkpoint, or leave to buy bandages.
- **Difficulty target:** winnable on auto by a sensibly levelled pair. Manual play or good use of All Out makes it clearly easier.

**Rewards.** XP; the ogre's club (an item, if the equipment roster includes one; otherwise none); coin.

**QA.**
- The ogre swings at least every 3 s when not staggered.
- It is never staggered more than 15% of the fight.
- The 60% throw and the 35% charge fire once each and resume the same fight state.
- The ogre dies on screen.

---

## S14 — Back to town and the payout · TW-079 to TW-082

| Id | Label | Event |
|---|---|---|
| TW-079 | CANON | Proof and return |
| TW-080 | CANON | Guild payout |
| TW-081 | CANON | Rest and choose second job |
| TW-082 | OPTION | Post-mission town errands |

**Play.**
- **TW-079:** collect the evidence (the stolen tools, the miller's sacks) in the cave, then walk out. A short travel cut back to Ashgate. The world map is unlocked as a return-travel tool from here.
- **TW-080:** at the Guild, the payout and a hazard supplement for the underreported ogre (existing `c5.home` lines). The coin total updates.
- **TW-081:** rest at the inn. Choose the second job at the board (the road east, toward S15, the sky beast).
- **[OPTION] TW-082:** repair gear, shop, rumours.

**Rewards.** Money; the shop restocks. Kael's injury heals with rest (a time skip at the inn).

**QA.** The world map opens as travel, not as story buttons. The second contract leads to the Aerys arc.

---

## Systems this part introduces (build order inside Milestone 2)

1. **Walkable maps.** A map is an existing arena painter plus:
   - walk bounds;
   - entry and exit points;
   - triggers (talk, examine, fight, cutscene, exit);
   - a main-objective marker.
2. **Joystick and host.**
   - Left thumb: movement.
   - Right: Attack, Special, All Out.
   - Crown toggle per party card.
   - Host input is recorded so replays stay exact.
3. **Manual combat in the sim.**
   - The host's AI is replaced by input for movement and attacks.
   - Defence (dodge and parry) stays on the AI.
4. **Boss phases.** Health thresholds play a directed beat and return to the same fight state.
5. **Money and a shop.**
6. **No hearts; retry and leave on defeat.**
7. **Cutscene skip setting.**
8. **Story text fixes** (cook, "asked nicely", fireside tale, the dawn card).

## Questions in this part (answer any time; I'll use the proposals until you do)
1. Climber: show no names (my proposal), or keep "Kharuun" and "Dark Legion"?
2. Alric's beast form: a description, or a reference image?
3. TW-017: confirm the line is Eiryn's.
4. Kael's reaction line at the glyph: write it, or approve my placeholder?
5. My side contracts and yard extras: keep as optional board jobs, or cut?
