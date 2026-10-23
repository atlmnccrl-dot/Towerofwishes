# Tower of Wishes — Game Design

Status: living document · started 2026-10-15 · prototype 0.2

Companion documents: [STORY.md](STORY.md) (the plot the campaign follows) and
[ART_DIRECTION.md](ART_DIRECTION.md) (the visual style).

This file is the single source of truth for game design. Story canon lives in the
author's manuscript (*Tower of Wishes — Through the First Guild Contract*), not here.
Anything in this document that adds to the story is marked **Proposal** and is not
canon until the author approves it (see §12).

Tower of Wishes is a **separate game from RIFTWORN**. No content, mechanics, code or
assets cross between the two projects.

---

## 1. The pitch

A spectator-tactics RPG. You recruit a party, shape them, and **watch** them fight
choreographed battles from an elevated "coliseum" camera. Every fighter has their own
brain: some dodge, some parry, some feint and fake out, some read the enemy and set
traps. You follow the story of the manuscript toward the Tower and climb it, gaining
companions from one fighter to five.

Closest real reference points, none of which combine all of this:
- **Final Fantasy XII** (gambits): characters act on their own priorities.
- **Gladiabots**: you watch AI you shaped fight.
- **Darkest Dungeon / Battle Brothers**: recruiting, personalities, injuries that carry over.

## 2. Pillars

1. **Watchable fights.** Fights read like scenes from the series: wind-ups you can see,
   exchanges that clash and break apart, mind games you can follow. Never a blur of lines.
2. **Every fighter thinks.** Units differ in *how* they decide, not just in numbers.
3. **One perfect moment.** The player's only direct input in a fight is **All Out**, and
   *when* they press it is the skill.
4. **A persistent campaign.** Choices open and close paths, recruits and encounters.
5. **Always something to play.** Free modes never need hearts.

## 3. Player role (decided)

- **Pure watching.** No moment-to-moment control of units.
- **One All Out button** per match (§6).
- **Withdraw** at any time in a story match (§9).
- Outside fights: team building, gear, choices on the contract map (later milestones).

## 4. Fight system

### 4.1 Brains
Each unit has:

| Stat | Meaning |
|---|---|
| `react` | Seconds before it notices a wind-up aimed at it |
| `read` | Chance to see through a feint |
| `parry` / `dodge` | How often it chooses each defence when threatened |
| `feint` | How often its own attacks are fake-outs |
| `morale` | Courage; below a threshold the unit runs |
| traits | `protector`, `flanker`, `punisher`, `ranged`, `riposte`, `cleave` … |

### 4.2 Telegraphs and defence
- Every attack has a **wind-up**, shown as a glowing wedge on the ground (blue = ally,
  red = enemy). Ranged attacks show a dashed aim line.
- A threatened unit waits out its `react` time, then decides: **parry**, **dodge**,
  or nothing. Its action is timed against the moment the blow lands.
- A successful parry staggers the attacker and can trigger a **riposte**.
- A unit that is mid-attack can't defend. Hitting a unit **during its wind-up**
  interrupts it ("cuts through the wind-up").

### 4.3 Feints
A feint plays a full wind-up, holds for a beat, then strikes fast for real. Defenders who
fall for it dodge or parry too early and get hit. Defenders who **read** it (`?` icon)
hold still and may punish the fake immediately.

### 4.4 Fight director (choreography)
- **Attack tokens:** at most 2 enemies may swing at one hero at once (1 at a guest).
  Everyone else circles at a distance, strafing, looking for an opening.
- Spacing between token grants keeps exchanges readable: approach → clash → break → circle.
- **Heavy arts are cutscenes** (§7).
- Target pacing (tuned in prototype): 25–40 s for a 4-enemy fight before cutscenes.

### 4.5 Morale and fleeing
Morale drops when allies fall or flee, when a unit is badly hurt, and when a heavy art
lands. Below 0.2 a unit runs for the arena exit. Fled enemies count as beaten.
*Later:* fled enemies can come back, and some can be recruited.

### 4.6 Terrain
Walls, trunks, trees and rocks block movement and line of sight (projectiles break on
them). Units path around obstacles. **Arenas change as the story progresses** and later
gain destructible pieces and hazards.

## 5. Team growth

The game opens with **one** controllable fighter. Companions join through the story,
up to **five**. Fights scale from 1-vs-many early to 5-vs-5 and 5-vs-1 boss fights.
Guests (like Eiryn in Chapter One) fight beside the team but don't count toward a wipe.

Built in 0.4 (**Proposal**, numbers open to tuning): the team shares experience from story
wins (Clearing 100, Quarry Path 120, Cave 100, Ogre 150; levels at 100 / 220 / 380 / 600 /
900 XP). Each level adds 10 % health and 7 % damage. Recruits join at the team's level.

## 6. All Out (decided, revised 2026-10-15)

- Usable **2–3 times per match** (1–2 in early chapters; set per chapter). The meter
  charges over about 11 s of fighting, faster when the team lands hits or parries.
- On press, every hero burns **all their stamina and ability power** into rapid,
  heavy attacks. Stamina drains fast (about 3 s from full), and a full ability meter
  makes the burst stronger.
- When a hero's stamina hits zero they are **exhausted**: no dodging, blocking or
  parrying until stamina recovers to 30. Pressing with low stamina gives a short burst.
- Bosses account for it. Prototype: the Broad Bandit goes straight for an exhausted hero.
- Balance (Chapter One, 200 sims): never 72 %, pressing the moment it's ready 70 %,
  pressing with full stamina when two bandits are close 78 %.

## 7. Heavy arts (decided)

Large special moves play as full cinematic cutscenes, with no face close-ups: the
fighter charges (a pillar of light, ground cracking, debris lifting, energy pouring in),
a single gleam of light, a dash with afterimages and slashes across the enemies, impact
frames, a shockwave, then the move's name. About 3.4 s; tap to skip.
- Length 2–3 s. The AI decides when to use one; the player never triggers it.
- Skippable (prototype: tap to jump to the impact). Final rule: skippable after first viewing.
- Prototype art: Kael's **Rising Cut** (placeholder name, Proposal).

## 7b. Face-off and countdown (decided)

Every match opens like a versus screen before the fight:
1. Establishing shot of the arena.
2. **Face-off cards:** each fighter in turn, close-up, name, a short description and, where
   the book gives one, their line, while they strike a pose.
3. **VS**, then **3 · 2 · 1 · FIGHT**.
4. On FIGHT everyone makes a distinct **opening move** at once: Kael rushes in, the Knife
   Bandit dips sideways off the line, the Lookout edges back toward the path, the Flanking
   Bandit heads round the trunk, Eiryn braces against it. Future fighters can teleport,
   back off to range, and so on.
Tap during the face-off to jump to the countdown. Withdraw is available once the fight starts.

## 7c. The anime director (decided)

One system directs every fight like an episode; nothing is scripted per match
(`js/render/director.js`):
- Camera cuts and zooms on parries, big hits, knockdowns, Eiryn's failed spell, All Out
  and the final blow, with a lower, more dramatic angle while zoomed.
- A beat of slow motion on parries, knockdowns, feint reads and the finish.
- Manhwa cut-in strips (a shadowed close-up with glowing eyes) when a fighter reads a
  feint, when the broad man charges a distracted or drained Kael, and in heavy arts,
  the face-off and VS.
Real character art can later replace the drawn close-ups without changing the system.

## 7d. Watching controls (decided)

- Tap one of your fighters (or their HUD card) to lock the camera onto them; tap again
  or tap empty ground to release.
- The HUD stays small and to the edges: compact team and enemy bars, one commentary
  line, a small withdraw button, the All Out seal with uses left.
- Landscape only; portrait shows a "turn your phone" screen and pauses.

## 8. Camera

Elevated 3/4 "helicopter over the coliseum" view, not top-down. Slowly drifts its angle,
frames all active fighters, and leans toward the player's lead fighter.

## 9. Hearts and injuries (decided by the author)

| Rule | Value |
|---|---|
| Hearts held at once | up to **5** |
| Refill | **1 heart every 8 minutes** |
| Cost of a story match | **1 heart, only if the whole team falls** |
| Winning | whole team restored to **full health** |
| Withdrawing | **never costs a heart**; team leaves injured |
| Injury healing | linear, 0 → 100 % in **4 minutes** (always faster than a heart) |
| Starting a story match | needs at least 1 heart |
| Free modes (§11) | never use or affect hearts |

Notes:
- A unit that has fallen when the team withdraws leaves at 10 %.
- Injured units start the next story match at their healed-so-far health.
- **Balance consequence:** hearts are only spent on wipes, so bosses must be able to wipe
  a team that ignores tells; otherwise hearts never matter.

## 10. Monetisation (decided direction)

Hearts are the main source of income: players can **buy hearts with real money**.
Guidelines:
- Bought hearts may exceed the 5-heart cap (banked).
- Consider an optional "watch an ad for 1 heart".
- Never make the story impossible to finish without paying. A full refill takes 40 minutes.
- Free modes keep players playing while out of hearts.
- Not built in the prototype. App Store / Play billing comes with the production engine.

## 11. Modes that never need hearts (decided)

| Mode | Notes | Build cost |
|---|---|---|
| **Arcade** | Single matches with any unlocked team | Low: same arena system |
| **Survival** | Endless waves, score chase | Low |
| **Boss battles** | Replay beaten bosses, harder variants | Medium |
| **Exploration** | 3rd-person world with direct control of one discovered character: dungeons, encounters, loot, its own combat | High: effectively a second game |

Prototype 0.1 has **Practice** as a stand-in for Arcade.

## 12. Story → mechanics (all Proposals, need author approval)

Source: manuscript through Chapter Five.

| Story moment | Proposed mechanic |
|---|---|
| Eiryn's reserves are drained by the preservation spell | Her mana cap starts tiny and grows over the campaign |
| Glyphs built line by line | Spells have visible build-up times; small ones fast (push, trip, deflect), large ones slow (the ogre-through-the-wall force lance, with a wall-slam bonus) |
| Negation | Circle that cancels spells and projectiles inside it; expensive |
| "I can do better" | Eiryn may overreach when low on mana |
| Kael: "Make it look at me", staying inside the beam's swing | Draws aggro, hugs big enemies so they can't wind up fully, deflects, uses cover to close in (partly in prototype: `protector`) |
| Kael's bruised shoulder | Injuries that carry over unless the unit rests |
| Chapter One: Kael alone vs four bandits; Eiryn has no mana and swings a branch | **The prototype fight** |
| Chapter Five: goblin archer and spearman, then the ogre "not in the contract" | First 2-fighter contract and first surprise boss in a cramped cave |
| Guild F rank and contract board | The campaign map: picking a contract opens some paths and closes others |
| The Tower and the wish | Final act: climb floor by floor, each a new arena |
| Prologue: rooftops, the Reset, Alric | A short, unwinnable cinematic fight that teaches the camera and sets the stakes |

Open with the author: names of heavy arts, Alric's fate, which side characters (the
spearwoman, the cook, the evaluator) become recruits or allies.

## 13. Prototype 0.1 (this repository)

Chapter One, the forest clearing, staged as the book stages it (see docs/STORY.md): Kael
(+ Eiryn as guest) vs the Broad Bandit (fists), the Knife Bandit, the Flanking Bandit
(goes for Eiryn) and the Lookout (doesn't fight; runs). Nobody dies: beaten bandits retreat.

Built:
- AI brains with reaction, reading, parry, dodge, feint, riposte, protect-the-guest,
  flanking, ranged keep-away, morale and fleeing.
- Telegraph wedges, slash trails, hit-stop, screen shake, reaction icons, short barks
  taken from the manuscript's own dialogue, a commentary feed.
- Fight director with attack tokens.
- Obstacles with collision, pathing around them, and line of sight for stones.
- All Out with drained window; Broad Bandit punishes it.
- Kael's heavy art as a cutscene.
- Hearts, injuries, withdraw (hold to confirm), saving in browser storage.
- Story match and Practice match.

Balance at time of writing (`node test/sim-test.js 200`):

| Policy | Win | Avg length (sim time) |
|---|---|---|
| Never press All Out | ~72 % | ~32 s |
| Press when 2+ bandits are on Kael | ~89 % | ~24 s |

All Out tuning: 5.5 s, damage ×1.6, then 3.0 s drained.

Not built yet: recruitment, contract map, gear, training, other arenas, bosses with All
Out counters beyond the punisher, sound, real art, purchases, free modes beyond Practice.

## 14. Decision log

| Date | Decision | By |
|---|---|---|
| 2026-10-14 | Separate game from RIFTWORN; nothing crosses between them | Author |
| 2026-10-14 | Pure watching + one forced All Out button that drains the team; bosses account for it | Author |
| 2026-10-14 | Heavy arts as close-up cutscenes; fights must feel choreographed | Author |
| 2026-10-14 | 5 hearts, 1 per 8 minutes; lose 1 only when the whole team falls in a story match | Author |
| 2026-10-14 | Win = full heal; withdraw costs no heart, team leaves injured and heals faster than a heart | Author |
| 2026-10-14 | Arcade, survival, exploration, bosses, dungeons, loot without hearts | Author |
| 2026-10-14 | Hearts purchasable for real money at release | Author |
| 2026-10-15 | Prototype 0.1 built as a browser page for quick phone testing | Claude (agreed with author) |
| 2026-10-15 | Art style: anime/manhwa webtoon (see docs/ART_DIRECTION.md) | Author |
| 2026-10-15 | Versus-style face-off, 3-2-1 countdown, distinct opening moves | Author |
| 2026-10-15 | The campaign follows the manuscript's plot (see docs/STORY.md) | Author |
| 2026-10-15 | Tap a fighter to follow them with the camera; landscape only | Author |
| 2026-10-15 | All Out: 2–3 uses per match (1–2 early), burns all stamina and heavy-art power, drained fighters can't defend | Author |
| 2026-10-15 | Heavy arts as full cinematic cutscenes, not face cut-ins | Author |
| 2026-10-15 | Real story campaign with branching choices; pick one of several new starters; low level start | Author |
| 2026-10-15 | Tutorial = the climber's last battle in the Tower, then the Reset, then 22 years later (book says 150) | Author |
| 2026-10-16 | Follow the full manuscript, keep everything built; the book's six heroes are the party; 150 years; the climber stays a mystery; Ren, Mara and Brannoc become companions for hire | Author |
| 2026-10-15 | All-new starters; the Tower's guardian is an unseen mystery; the climber stays a mystery | Author |
| 2026-10-17 | Dialogue reads as film subtitles, no speech balloons; every non-fight scene is a moving cutscene; the original prologue (opening cinematic, animated painted Reset) stays as it was | Author |
| 2026-10-17 | A fleeing enemy must run out of view before the match ends | Author |
| 2026-10-17 | Choice screens are removed; paths are forks in the road: the camera shows each way, the player picks one, both reach the same place (Proposal: the two forks, the encounters and rewards on them) | Author |
| 2026-10-17 | Prologue fight: the climber is beaten nearly to death, then a last stand (Dark Legion) wins it | Author |
| 2026-10-17 | Spirit-tree skill screen; gear has art; elemental weapons change fights (fire sword throws flame, ice daggers freeze) (Proposal: item names, numbers, the element set) | Author |
| 2026-10-23 | The prologue opens on the rooftop chase (TW-001–010), cuts to the climber's whole fight as a filmed cutscene (no auto-battle; no names on screen), then back to Eiryn and Alric looking at the Tower (TW-014–018). The street walk (TW-011–013) is dropped from the opening. The tutorial moves to Kael's bandit fight (c1.fight) | Author |
| 2026-10-23 | The opening before the roofs is redone, filmed: "the world before" (the market at dusk, the lamps lit toward the Tower, climbers at its gate, the promise, the title over the roofs). The Tower lines move from the climber section into it. The menu becomes a left column over a campfire at night with every hero doing their own thing; heroes not met yet are shadows | Author |
| 2026-10-23 | No narrator: the book's narration is shown, not read; spoken lines float beside the speaker (mockup B with tone effects) instead of the subtitle bar; time and place jumps are title cards; anything that can't be shown and isn't said is decided per scene. Pilot: the prologue and Chapter One, then chapter by chapter. The promise is spoken by a townsperson; the Reset ends on a THE RESET card; the legend is told by a storyteller by a fire, with filmed memories | Author |
| 2026-10-23 | Spare dialogue: before the first fight only six lines are spoken (the seller's promise, "Too slow." / "I wanted the hug.", "I already have everything I could ever wish for.", the storyteller's first line, "Keep your hands off me."); the rest of the roof banter, the Tower talk, the stew argument, Kael's lines in Ashgate and the bandits' taunts are cut | Author |

## 16. Growth, loot and the world map (built in 0.5, all Proposals)

- **Gear:** weapon (class-locked: Ren blades, Mara and Eiryn glyph foci, Brannoc shields,
  Kael swords), armour and charm; four rarities (common, fine, rare, relic). Bonuses:
  health, power, speed, parry, dodge, reflexes, armour, heavy-art charge, stamina,
  lifesteal, second wind (once a fight, rise at 30 %).
- **Skill trees:** three branches of three steps per fighter; one point at level 1 and one
  per team level after. Respec is free.
- **Loot:** each mission has a table; first clears add a set piece (the Stray's Tooth,
  the Bell Shard, the Miller's Cleaver). Story wins drop gear too. Arcade: one roll per
  three waves.
- **World map:** lands reveal as their missions open; locked lands stay in fog. From the
  Guild the road branches north (contracts), east (the quarry, then the dungeon) and
  south-east (the Old Crossing, which needs Eiryn's trust). Side missions never cost
  hearts.
- **Tutorial:** the prologue fight pauses to teach All Out (tap it), following a fighter,
  heavy arts and withdrawing.

## 15. Roadmap (proposed)

1. ~~**0.2** — second arena (quarry cave) with goblins and the ogre.~~ Done in 0.4.
2. ~~**0.3** — branching choices; recruit flow; party of up to 3.~~ Done in 0.4.
3. **0.4 (this build)** — the story campaign from the Prologue to Chapter Five: scenes,
   choices, character select, chapter map, team experience. See docs/STORY.md.
4. **0.5** — Author review of the starters and new lines; real character portraits for
   scenes; sound; Arcade and Survival from the same arena code.
5. **0.5 (this build)** — world map with fog and a three-way branch from the Guild; side
   missions (Guild contracts, the Old Crossing, the Deep Passage dungeon, the Evaluation
   Yard, the Yard Gauntlet arcade), gear and skill trees, staged story scenes, a guided
   tutorial in the prologue fight, and a new face-off. See §16.
6. **Chapter Six onward** — needs the author's next chapters.
6. **Engine decision** — choose the production engine before any store release (purchases, performance, real art pipeline).


## 17. Forks, elements and last stands (built 2026-10-17, Proposals except where decided above)

- **Forks.** A `fork` node (js/story.js) has `lines` that preview each way (the staged camera
  shows them, with a subtle hint) and two `options`; the picker is one way on at each side of
  the screen. Both ways rejoin the same node. Built: the quarry hill (Chapter Five: flooded
  track = goblin ambush, ridge = a quiet find) and the viaduct (Chapter Two: arches = a fight,
  ridge = the cairn). Node fields `set` and `xp` pay out on arrival for no-fight ways.
- **Elements.** A weapon's `elem` (js/progression.js) reaches the sim as `mods.elem` and acts in
  `elemHit` (js/sim.js): *fire* burns and throws a cone of flame past the target; *ice* chills
  and sometimes freezes (frozen foes cannot act and take 30% more; bosses resist); *storm* arcs
  to the two nearest others; *quake* staggers everything beside the target. Items: Emberbrand,
  Cinderglass Focus, Frost Fangs, Stormwake Lance, Quake Bands. Icons are drawn by
  js/render/itemart.js; first-clear drops are set by the `loot` table on the node.
- **Last stand.** A unit with `def.lastStand` cannot fall until its heavy art has played: held
  above 13% for the first 16 s, then at 20% health (or on a killing blow) the cutscene fires.
  Used by the prologue climber (Dark Legion).

## 18. Watching, grading, replay and the trailer (built 2026-10-18, Proposals)

- **Readability.** A blue ring marks your team and a red ring marks the foe on the ground; the
  fighter you follow has a brighter ring. The default camera is tighter and the canvas is lifted
  (brightness and contrast) so the dark arenas read on a phone.
- **Grades.** A won fight gets a rank S to D (js/grade.js): team health left, nobody down, speed,
  parries/dodges/feints read, a heavy art, a well-timed All Out. The best rank per fight is saved
  in `story.grades`; the map's node card shows it.
- **Replay.** The result screen of a win has *Watch replay*: the same fight again from its seed, All
  Out at the same moments (the sim is deterministic, test/replay-test.js), no HUD, letterboxed.
- **Trailer.** *Trailer* on the title screen (or `?trailer`) plays a ~75 s reel: the painted opening,
  the Reset, the rooftop run, the dawn, four fights with heavy arts. Cards are manuscript quotes or
  plain taglines. A tap leaves it; nothing is saved. Meant for screen capture.

## 19. The opening, filmed (built 2026-10-23; the drafted lines are Proposals)

The prologue plays as filmed scenes (js/render/cinema.js): `p.lore` → `p.roof` → `p.tower` →
`p.climb` → `p.overlook` → `p.light` → `p.reset` (the protected painted shot) → `p.story` →
`p.later`. There is no battle in the prologue; the coach teaches in Kael's bandit fight (`c1.fight`).
`p.evening` and `p.ascent` stay in js/story.js for old saves but nothing links to them.

- **The rooftop chase (`p.roof`, TW-001–010).** Close on Eiryn's feet along a ridge; her look back
  (first person) at Alric gaining; the gap she misjudges; a violet glyph throws her off the roof; in
  the air she looks back and Alric leaps after her, catches her and takes the landing; the two of them
  on the broken roof. **Proposal** (drafted by Claude, awaiting the author): every line of `p.roof`
  ("You're slowing down." … "Somewhere below, one more tile slid off the edge and broke in the street.").
- **The climber (`p.tower`, `p.climb`, `p.light`, TW-019, TW-014).** The Tower above the clouds; the
  climber comes up the last stairs; the thing on the final floor; two shapes drop and die in one
  stroke; the thing throws the climber, they trade blows, the climber is beaten to one knee; a rift
  opens and giants of darkness crush it; the Tower's horn sounds (TW-014, synthesised `horn` in
  tools/make_sfx.py); the climber walks up into the light. No names on screen (the author). Cast:
  the climber set; the thing is the night creature drawn as a shadow; the giants are knight sets
  drawn as shadows at three times size. **Proposal**: the nine narration lines of `p.climb` and the
  fight's choreography.
- **The Tower talk (`p.overlook`, TW-014–018).** The roof hears the horn; "They say someone climbed
  another floor today." / "They always say that." (**Proposal**, TW-015); "You could do it." / "Me?
  I'd be bored by the third floor. You'd end up carrying me." (**Proposal**, TW-016); Eiryn says "I
  already have everything I could ever wish for." (TW-017; the older text gave it to Alric).
- **The world before (`p.lore`).** Filmed in the square, the new gate set (js/cinema/gate.js) and the
  roofs. **Proposal** (Claude's staging of the author's pick): the lamplighter and the lamps lighting
  up the street; six climbers (adventurer, spearwoman, knights, poacher, a hooded one) walking up to
  an arched gate of light in the Tower's south face, two of them stepping into it; the title card.
  The lines are the manuscript's.
- **The menu.** A campfire in a clearing at night (js/cinema/camp.js). **Proposal**: what each hero
  does there (Kael drilling at a post, Eiryn casting, Eloryn tending with a healing glow, Braxen by the
  fire, Aerys on watch with her spear, Nox crouched on a branch of the old tree).
- **Without a narrator (pilot: the prologue and Chapter One).** Drafted for the game (**Proposal**,
  waiting for the author's wording): the fruit seller's "Reach the summit, and you can make a wish."
  in the opening (the book's promise, spoken, while a child points at the Tower); the storyteller's
  "Long ago, a man climbed to the top of the Tower of Wishes." in `p.legend` (from the book's
  narration). After the author's cut (2026-10-23) these are the only words in those scenes. The legend's
  memories (the climber walking into the light, the sky splitting over the burning city, the street
  to the Tower broken and rebuilt as the years flicker past) are Claude's staging.

