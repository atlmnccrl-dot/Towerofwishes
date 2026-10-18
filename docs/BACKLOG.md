# Backlog: everything requested, and its state

**Updated:** 2026-10-18.
**Rule:** nothing is removed from this list. Items move between **Done**, **In progress**, **Next** and **Waiting on you**.
**Sources:** the master handoff, your playtest notes, and this conversation.

## Done (on `main`, published)
- **No hearts.** Losing costs nothing; retry, or leave for gear, loot and XP.
- **Tavern:** no cook; patrons murmur "…"; Kael walks outside and watches the glyph fail.
- **Bandit rescue:** Eiryn's spell fizzles, Kael drops in, plants his sword and draws it.
- **No speech bubbles:** the face-off line is now a subtitle. "Asked nicely" is gone.
- **The quarry fork** is retired from the main path.
- **The Ogre fights back:**
  - stagger only from heavy hits or All Out;
  - a swing at least every 3 s;
  - ground slam;
  - throw at 60%, Eiryn's charge at 35%;
  - Force Lance finisher; it dies on screen.
- **Asset list** (`docs/ASSET_LIST.md`), **animation list** (`docs/ANIMATION_LIST.md`), **cinematic needs** (`docs/CINEMATIC_NEEDS.md`).
- **Sprite system** (`js/sprites.js`):
  - Eiryn's base sprite;
  - walk in S, SE, SW and E (W mirrored);
  - run in S;
  - direction from facing and camera;
  - crossfades;
  - per-frame timings from your JSON.
- **Event ledger** (`docs/EVENTS.md`) and **Director's Bible part 1** (`docs/BIBLE_01.md`, TW-001–082).

## In progress
- **Host control:** crown, joystick, Attack and Special.
  - The game logic is done and tested; the on-screen controls are built but untested.
  - Both are on branch `wip/host-control`, not yet on `main`.
- **Scout fight** before the quarry skirmish (TW-069), with the crown introduced at the skirmish (TW-070). Also on the branch.

## Next: Milestone 2, the playable slice (tavern → Ogre, TW-036–082)
1. Finish host control. Browser-test the crown, joystick, Attack and Special, then merge.
2. **Walkable maps**:
   - tavern; Ashgate street; north road; road to Ashgate; Ashgate centre; Guild Hall; mill; quarry hill; cave.
   - Each has walk bounds, triggers and an objective marker.
3. **Money and a shop:** the fine at TW-057 drops Kael's purse; the general store; payout at TW-080.
4. **Cutscene-skip setting.** Skipping keeps rewards, flags and injuries.
5. **Guild:**
   - registration;
   - Eiryn's yard test with the player controlling her (stone block, floating counter);
   - the interactive contract board.
6. **Cave:** clues (sacks, tools, the huge footprint) before the Ogre.
7. **Goblin deaths:** goblins die; only a frightened last survivor runs; the book's archer flees to the cave. Partly coded, not merged.
8. **Ogre:** its club as loot if the equipment roster has one.
9. **World map** becomes travel only (TW-079 onward).

## Then: Milestone 3, the opening rebuilt (TW-001–035)
- **Rooftops:**
  - real roof-to-roof leaps;
  - close-up on Eiryn's feet;
  - her point-of-view look at the drop;
  - Pressure launch;
  - Alric's vampiric leap and catch;
  - the hug.
- **Street:** a stroll through ordinary life; the Tower horn.
- **Climber:** entrance; kills an underling; boss retaliation; playable fight; desperate final move.
- **Reset:**
  - the protected skyfire-and-flood shot stays as it is;
  - then the rooftop pillars and the flood;
  - the preservation argument;
  - Alric's beast transformation and shield;
  - preservation completes.
- Remove the fireside tale and the "She was still waiting" card. Hard cut to Kael's tavern.

## Then: Milestone 4 onward, in inventory order
- **Sky beast (TW-083–107):**
  - chase;
  - Kael's sword throw, crash, unarmed brawl, Kael thrown;
  - Aerys countered;
  - Eiryn's kill;
  - Kael loses his sword; the sword shop; the rival kid;
  - Aerys's **Spear of Light** (your design).
- **Nox (TW-108–130):** the Guild Hall execution (not a recruitment); the Nightcrawler sequence; health-threshold beats; Nox's eye-strike finisher.
- **Labyrinth, seven depths:** Eloryn's clinic; the stabbed Aerys; Cassius and Lyra.
- **Later arcs, in order:**
  - Braxen's hamlet;
  - Beast Folk country and the Elder Dragon;
  - Tornado Country and the Black Knight;
  - the three duo arcs; the tournament; Tower City; the last campfire.
- **The Tower:**
  - Floor 1, separate trials; Braxen's frost injury;
  - the staircase;
  - Calamity: a vertical arena, adds, Nox shields Aerys, the Sword of Calamity;
  - the Hall of Offering: Eloryn's death, permanent;
  - the False Feast;
  - Floor 4 (OPEN);
  - the Guardian (OPEN), Braxen's death, permanent;
  - the epilogue.
- **Rebuild chapters 7–11 from the inventory.** The current ones come from the older manuscript.

## Systems still to build (from the handoff)
- **Exploration:** optional discoveries; mystery-enemy silhouettes; a bestiary.
- **Equipment:**
  - shows on characters, changes moves and visuals;
  - enemies use gear;
  - rarities.
  - Waiting on the new roster.
- **Spirit tree** that grows from a seedling; mission currency; rare drops.
- **Boss systems:** phases, summons and adds, counters, health-threshold cinematics.
- **Each hero fights in their own style:**
  - Kael: sword and improvisation;
  - Eiryn: Pressure and Negation, with costs;
  - Aerys: Light;
  - Nox: Shadow Step, and One Step with its lifespan cost;
  - Braxen: hybrid strength;
  - Eloryn: dangerous healing.
- **Directed camera** for scenes where nobody is being controlled.
- **Sound:** none exists yet.
- **Life layer** for sprite characters (`docs/CINEMATIC_NEEDS.md` 1A): waiting for your go.

## Art pipeline (as you deliver)
- **Eiryn, still missing:**
  - walk NE and N;
  - run SE, E, NE and N;
  - idle in all 5 directions;
  - the fight set;
  - walk-and-talk clips;
  - bust portraits.
- **Then:** Kael, Aerys, Nox, Braxen, Eloryn. See `docs/ANIMATION_LIST.md` for the order.
- **Eiryn's sprite in fights:** switched on once her fight set exists. Until then fights use her code-drawn body.

## Waiting on you
1. **Camera:** keep it rotating (5-direction art), or lock the angle?
2. **Weapons:** separate layers, or a sheet per weapon?
3. **Alric's beast form:** a description or a reference image.
4. **The climber:** stay unnamed, or keep "Kharuun" and "Dark Legion"?
5. **TW-017:** confirm the line is Eiryn's.
6. **Kael's glyph reaction line.** The placeholder is "Nobody draws something that big for fun."
7. **My side contracts and yard extras:** keep them as optional board jobs, or cut them?
8. **Moves:**
   - Kael's special;
   - Negation as Eiryn's special;
   - Braxen's guard;
   - Eloryn's aging cost;
   - the Sword of Calamity's abilities.
9. **The new equipment roster** (from ChatGPT).
10. **walk_E:** her cape in that file isn't on her base sprite. Keep it, or regenerate?
11. **Go on the life layer**, and which art comes first.
12. **Bust portraits:** layered, or full images?
13. **Comic panels and character reference sheets** for the rest of the cast.
14. **Voices:** yes or no.
