# Tower of Wishes — Story Map

Source: the author's manuscript *Tower of Wishes — Through the First Guild Contract*
(Prologue and Chapters One to Five), adapted for the game by the author's decisions of
2026-10-15. Where this file and the manuscript differ, this file records the author's
newer decision for the game.

## Author decisions (2026-10-16, replacing those of 2026-10-15 where they differ)

The author supplied the full manuscript (*Tower of Wishes*, Parts 1 and 2: Prologue to
Floor Three) and decided:

| Decision | Detail |
|---|---|
| Story | The game follows the new manuscript, **keeping every scene, cutscene and mission already built**. The first-draft chapters (clearing, town, Guild, quarry) are the opening arc; the new book's road follows after the quarry. |
| Party | **The book's six heroes**: Kael, Eiryn, Aerys, Eloryn, Braxen and Nox, joining when the book has them join. |
| Timeline | **150 years** after the Reset, as the book says. |
| The climber | Still **a mystery**. |
| Ren, Mara, Brannoc | No longer starters. They are companions you hire at the tavern ("Three for Hire") for side contracts. |
| Choices | The before-fight choices are removed; Chapter Four's party choice is retired (Kael and Eiryn go together, as in the book). Story choices after fights stay. |

## Rules

1. The campaign follows the manuscript's events in order. Fights use the book's cast,
   weapons, targets and outcomes.
2. Dialogue is quoted from the manuscript where a line exists (`B()` in `js/story.js`).
   New lines (`S()`), the companions and all side missions are **Proposals** until the
   author approves them.

## Companions for hire (Proposals: names, looks, powers, backgrounds)

| Companion | Who | Fighting style | Heavy art |
|---|---|---|---|
| **Ren Ashgrove** | Vampire-blooded Guild runner. | Fast and aggressive; weak to heavy blows. | *Hundredfold Step* |
| **Mara Quill** | A licensed glyph-caster; her teacher climbed the Tower and never came back. | Force bolts at range. | *Lattice Lance* |
| **Brannoc Vell** | A dwarven shield-bearer with a debt. | Holds the line. | *Anvilfall* |

## Campaign map

| # | Chapter | What happens | Play |
|---|---|---|---|
| 0 | **The Last Ascent** (tutorial) | A lone climber fights the Tower's unseen guardian, then reaches into the light. | Battle (guided) |
| — | **The Reset**, then **one hundred and fifty years later** | Fire and flood; the preservation spell. | Scenes |
| 1 | **The Clearing** | The tavern; the formation fails over the forest; Kael runs to it alone and faces four bandits around an exhausted Eiryn. | Battle: Kael (+ Eiryn as a guest) |
| 2–3 | **A Town Grown Strange** | It has been 150 years; the tea fine. | Scenes, a choice |
| 4 | **The First Contract** | Guild registration; the contract board. Side missions open. | Scenes |
| 5 | **The Quarry** | Goblins, the cave, the ogre. | Three battles: Kael + Eiryn |
| 6 | **The Sky That Hunts** (book 2–3) | The road beyond Ashgate; the youngling's corpse; Aerys bursts from the grass hunted by the Skyreaver; Kael steps in; she joins; the campfire and "the last easy laugh". | Scenes; battle: Kael + Eiryn, Aerys fixed |
| 7 | **The Shadow City** (book 4) | The silent lower streets; the dead man; Nox kills before their eyes; Kael lunges and is stopped ("Again."); the relic shard; Kael's offer; "Next time with a name on a page." | Scenes (the duel is staged) |
| 8 | **The Road That Bleeds** (book 5) | The trade road; the market; Aerys stabbed in the alley; the run; the chapel infirmary; the healer, Eloryn, joins. | Scenes (the alley is staged) |
| 9 | **A Name on a Page** (book 6–7) | Dead farms; Braxen among the beasts; Nox's blade at his throat; "Then you go through me again." | Battle: party + Braxen fixed vs the pack |
| 10 | **The Night Creature** (book 8–9) | Nox shadows them; the dead bandits; the hot spring; the creature goes for Eloryn; Nox steps out of the shadows; "You too, angel." | Battle; Nox arrives mid-fight |
| 11 | **The Road That Learns You** (book 10–11) | Nox joins "for roads"; Kael's sparring; Aerys and Nox; Eloryn's lessons; the first frost; the doors. | Scenes (sparring staged) |
| 12 | **Floor One: The Hall of Frost and Mist** (book 12) | The six knights separate the party; six duels (Kael, Braxen, Aerys with Stillwing, Eloryn, Nox, Eiryn). | Six duels |
| 13 | **Floor Two: Calamity** (book 13–15) | The stairs; the two-walled corridor; Calamity; Negation; "How far can you throw me?"; the Sword of Calamity; the ramp. | Battle: all six; then the book's climax plays |
| 14 | **Floor Three: The Hall of Offering** (book 16) | The wheels; Altheryx, the Crownless King; Eloryn. | Scenes |
| 15 | Beyond the manuscript | — | Awaits the author's next chapters |

## Choices and what they change (built in 0.4; all Proposals; before-fight and party choices retired 2026-10-16)

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

Lines quoted from the manuscript are marked `B()` in `js/story.js`; everything the companions say and all `S()` lines are new and need the
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
| Three for Hire | The tavern | — (the old character select, staged) | Chapter Four |

Contracts, the crossing and the dungeon are tuned for three fighters, so they open once a
companion is hired (or a third book hero has joined).

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
