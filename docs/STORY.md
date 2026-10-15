# Tower of Wishes — Story Map

Source: the author's manuscript *Tower of Wishes — Through the First Guild Contract*
(Prologue and Chapters One to Five), adapted for the game by the author's decisions of
2026-10-15. Where this file and the manuscript differ, this file records the author's
newer decision for the game.

## Author decisions (2026-10-15)

| Decision | Detail |
|---|---|
| Timeline | The game begins **22 years after the Reset** (the manuscript says 150; the game uses 22). Eiryn wakes from the preservation spell 22 years on. |
| Starters | **All-new starting characters.** The player picks one. Kael and Eiryn are story characters the player meets and can recruit. |
| Opening | The tutorial is the **climber's final battle at the top of the Tower**, at full power, then the Reset, then "22 years later" and character select. |
| The Tower's guardian | An **unseen mystery**: shadows, light and fragments, never fully shown. |
| The climber | **A mystery for now**; who they were is a later reveal. |
| Branching | Choices change paths, who joins, and how fights start and play. |

## Rules

1. The campaign follows the manuscript's events in order (the quarry contract, the
   bandits in the clearing, Eiryn's arrival, the Guild); the player's starter is
   present for them, and choices change *how* they go and who stands with you.
2. Dialogue for Kael, Eiryn and the book's other characters is quoted from the
   manuscript where a line exists. New lines and everything about the new starters are
   **Proposals** until the author approves them.
3. Fights keep the book's cast, weapons and outcomes (nobody dies in the clearing; the
   ogre is driven through the wall), but the player's party joins in.

## Starting characters (Proposals: names, looks, powers, backgrounds)

All three are 22 or younger: they grew up in the world after the Reset, and each has a
reason to climb the Tower.

| Starter | Who | Fighting style | Heavy art |
|---|---|---|---|
| **Ren Ashgrove** | Vampire-blooded Guild runner, born the winter after the Reset. Strength and speed come from his body, like the vampires of the old cities. Wants the wish to undo what the Reset took from his family. | Fast and aggressive: dashes, chains strikes, dodges on instinct; weak to heavy blows. | *Hundredfold Step* |
| **Mara Quill** | A licensed glyph-caster from the Guild's mage registry. Her teacher climbed the Tower and never came back. | Keeps her distance: force bolts at range, a shove to break rushes, a glyph barrier to block. | *Lattice Lance* |
| **Brannoc Vell** | A dwarven shield-bearer who guards caravans on the western roads and owes a debt the Tower's bounties could clear. | Holds the line: huge health, parries and blocks, shield-bash counters; slow. | *Anvilfall* |

## Campaign map

| # | Chapter | What happens | Play | Branches |
|---|---|---|---|---|
| 0 | **The Last Ascent** (tutorial) | A lone, bloodied climber fights the Tower's unseen guardian on the final floor, then reaches into the light. | Battle: the Climber vs the Unseen (full power, All Out and heavy art taught) | — |
| — | **The Reset** | The Tower sounds; fire and flood fall on the cities. Somewhere a silver-haired mage casts a spell that holds only its caster. | Scene | — |
| — | **Twenty-two years later** | Character select. | Choice | Which starter |
| 1 | **The Clearing** | In a western town, a huge purple formation fails over the forest. Four bandits corner an exhausted silver-haired woman (Eiryn). A Guild swordsman (Kael) arrives. | Battle: starter + Kael (+ Eiryn as a guest) vs four bandits | How you go in (charge, circle round, let Kael lead) changes how the fight opens. Whether you stay by Eiryn sets her trust. |
| 2–3 | **A Town Grown Strange** | Eiryn learns it has been 22 years; the story of the wish that destroyed the world; the fine for warming tea without a permit. | Scenes | Pay her fine yourself, let Kael pay, or argue with the guard. |
| 4 | **The First Contract** | Guild registration, Eiryn ranked F, the contract board. | Scene | Who you take: Kael, Eiryn, or both. |
| 5 | **The Quarry** | Goblins at the mill; a spearman and an archer on the path; three goblins in the cave; the ogre "not in the contract". | Battles: goblins, then the ogre boss | Your party from Chapter 4. |
| 6+ | Beyond the manuscript | — | Roadmap | Needs the author's next chapters. |

## Choices and what they change (built in 0.4; all Proposals)

The graph lives in `js/story.js`; `node test/story-test.js` walks every path.

| Where | Choice | Effect on play |
|---|---|---|
| Chapter One | **Charge in first** | Bandits start staggered; Kael arrives a beat behind. |
| | **Circle round the fallen tree** | You start beside Eiryn; the lookout bolts without distracting Kael. |
| | **Let Kael go first** | Kael opens with his heavy art part-charged; Kael's bond +1. |
| After the clearing | **Stay with Eiryn** | Trust +1: in Chapter Five she starts with her heavy art part-charged. Unlocks "Just Eiryn". |
| | **Search what the bandits dropped** | A few coins: lets you pay the fine yourself. |
| The tea fine | **Pay it yourself** (needs the coins) | Trust +1. |
| | **Let Kael cover it** (as in the book) | Kael's bond +1: he fights one level higher. |
| | **Argue with the guard** | Trust +1; the fine goes up. |
| Chapter Four | **Kael and Eiryn** (as in the book) / **Just Kael** / **Just Eiryn** (needs trust) | Who fights the quarry battles; two-person parties are harder. |
| The flooded fork | **The longer path** (as in the book) / **Wade the shortcut** | Wading: the party arrives at 85 % health but catches the goblins staggered. |
| The ogre's tracks | **Back to the entrance** (as in the book) / **Grab the tools** | Backing off: everyone starts with heavy-art power banked. Grabbing: the party starts staggered. |

Losing a story battle costs a heart only on a wipe and leaves you at the same battle.
The prologue battle never costs hearts, and the story moves on even if the climber falls.

Lines quoted from the manuscript are marked `B()` in `js/story.js` (adjusted only for the
22-year timeline); everything the starters say and all `S()` lines are new and need the
author's approval.

## Side missions (built in 0.5; all Proposals except quoted lines)

| Mission | Where | Source in the book | Unlocks |
|---|---|---|---|
| The Evaluation Yard (training) | The Guild's yard | The evaluation yard, stone blocks, the evaluator | Chapter Four |
| Yard Gauntlet (arcade) | The yard | — | Chapter Four |
| The Missing Supply Cart | The north road | Contract board talk: "Missing supply cart north of town." The knife bandit returns. | Chapter Four |
| Enough Teeth for Three | Past the clearing | Kael's "stray animal with enough teeth for three animals" | After the cart |
| The Old Crossing | The dry riverbed and bridge | Eiryn's stone bridge, still standing over dry stones; the echoes and the Drowned Bell are new | Chapter Four + Eiryn's trust |
| The Deep Passage (dungeon) | Behind the quarry cave | The goblins that fled deeper | After Chapter Five |

## Canon notes kept from the manuscript

- Eiryn: long silver-white hair, dark travel-worn outfit with green ornamentation at the
  collar; force glyphs (violet), Negation, the preservation spell; drained of mana on
  waking; fails to cast, swings a branch.
- Kael: Guild swordsman, armour with a shoulder plate; "Make it look at me".
- The clearing: four men (broad-shouldered man with fists, a short knife, one circling
  the trunk, a lookout who runs); nobody dies.
- The quarry: goblin archer and spearman, three in the chamber with two fleeing deeper,
  the ogre with a beam from the loading frame, Eiryn's narrow lance of force through
  the wall.
