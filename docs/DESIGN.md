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

## 6. All Out (decided)

- One press per match, after a charge meter fills (prototype: 18 s).
- For 4.5 s every unit on the team attacks flat out: much faster wind-ups and recovery,
  more damage and knockback, no stamina cost.
- Afterwards the team is **drained** for 3.4 s: stamina empty, **no dodging or parrying**,
  slower movement.
- **Bosses account for it.** Some punish the drained window, some bait it with a fake
  opening, some have a stagger window that rewards it. Prototype: the Broad Bandit is a
  *punisher* and goes straight for a drained hero.

## 7. Heavy arts (decided)

Large special moves play as short cutscenes: the world freezes, the camera closes in,
a title card names the move, the impact lands, then the camera returns.
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

## 15. Roadmap (proposed)

1. **0.2** — Author feedback on fight feel; second arena (quarry cave) with goblins and the ogre as first boss with an All Out counter.
2. **0.3** — Contract board with branching choices; recruit flow; party of up to 3.
3. **0.4** — Arcade and Survival from the same arena code.
4. **Engine decision** — choose the production engine before any store release (purchases, performance, real art pipeline).
