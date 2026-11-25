# BELLMOURN: The Ascent (hours of play, harder runs, six acts, God)

Asked for by the author (2026-11-25), after clearing every act in a single run without dying:
- Act I should take about five runs or more before a clear is even close, as in Mewgenics or The Binding of
  Isaac. Progress comes from learning, unlocks and permanent upgrades.
- Bosses must change and evolve in their second and third stages, Isaac-style. The boss leaves the arena for a
  while, and the player dodges, destroys targets or fends off waves. It comes back changed.
- The final boss is literally God. The bells are merely things he summons to fight you. He summons two.
- Maps grow larger the deeper the run goes.
- Bosses from Acts I and II come back as mini-bosses.
- Two more advanced, epic acts come before the final one.
- Hours of play, not a one-and-done run.

Everything new is a PROPOSAL for the author, like the rest of STORY_BIBLE.md. The roguelite rules stand (one
warden per run, death ends the run, permanent progress is kept).

## 1. The run: six acts

| Act | Name | Areas | Boss area, boss |
|---|---|---|---|
| I | THE CITY | Gallows Gate, then 3 of the 6 districts | the Belfry, Saint Silence |
| II | BEYOND THE WALLS | 2 of Frostmarch, Ash Dunes, Catacombs | the Abyss, the Hollow Archon |
| III | THE WHEEL | 1 of the Weeping Marsh or the Clockwork Spire | the Empyrean, the Wheel (no longer the final boss) |
| IV | THE DROWNED HEAVEN (new) | 2 of `choir` THE SUNKEN CHOIR, `orchard` THE GLASS ORCHARD, `echoes` THE HALL OF ECHOES | `halo` THE BROKEN HALO, `seraph` THE LAST SERAPH |
| V | THE GOD'S DREAM (new) | 2 of `ribs` THE RIBCAGE CATHEDRAL, `unborn` THE SEA OF UNBORN DAYS, `wake` THE WAKING CITY | `cradle` THE CRADLE OF BRONZE, `firstfounder` THE FIRST FOUNDER |
| VI | THE THRONE (new) | no other areas: a shrine, then the throne | `throne` THE THRONE OF THE TOLL, `god` THE VOICE, GOD OF THE TOLL |

A full clear is about 20 areas plus small nodes. The endings (RING, SILENCE, SING) move to Act VI: the choice is
made before God's fight.

## 2. Story of the new acts (PROPOSAL)

**Why God is the enemy.** The Wheel was God's jailer. When the wardens break it at the end of Act III, the
Voice in the Bell wakes fully, for the first time since the First Founder caught it in bronze. It is not grateful.
It has screamed inside the bell for a thousand years. Every toll that kept the world alive was its pain. Now it
means to toll the world back into the silence it came from and begin again. "I was the dawn. You made me a bell."

**Act IV, the Drowned Heaven.** The Wheel's hub broke and heaven fell into the sea of bell-bronze beneath it.
- **The Sunken Choir:** an underwater cathedral of drowned angels still singing.
- **The Glass Orchard:** trees of stained glass whose fruit are frozen voices.
- **The Hall of Echoes:** the Voice remembers every warden's battle and replays the bosses of Acts I and II as
  echoes.
- **The boss, the Last Seraph, at the Broken Halo:** the God's herald and the last angel. She keeps the gate of
  His dream.

**Act V, the God's Dream.** The wardens walk into the Voice's sleeping mind.
- **The Ribcage Cathedral:** a church grown inside the ribs of a colossal bronze body.
- **The Sea of Unborn Days:** every dawn the bell ever stole, adrift as islands of light.
- **The Waking City:** a dream-copy of Bellmourn, warped and upside-down. Its people are the Hushed as the god
  remembers them.
- **The boss, the First Founder, at the Cradle of Bronze:** the man who cast the bell. He has guarded the god's
  dream for a thousand years and will not let anyone wake it. "I bound a god to save you. I would do it again."

**Act VI, the Throne of the Toll.** God, the Voice, enthroned in a vast bronze heaven over the clouds.
- **Stage 1:** He fights from the throne with light, the toll and judgement. He summons **two great living
  bells**: THE DAWN BELL, gold, sun and fire, and THE DUSK BELL, iron, night and void. Each bell is a fighter with
  its own health and attacks: it rolls, slams, tolls shockwaves and rings. God is shielded while both bells live.
- **Stage 2:** the bells fall and God rises. He leaves the throne and the arena changes: the heaven cracks and
  the floor becomes islands. He tolls the world: waves of the Hushed from every act and returning echoes of
  earlier bosses.
- **Stage 3:** God alone, vast, with the arena shrinking. Then the ending the choice set.

## 3. Bosses that evolve (Isaac-style)

Every boss in the game, all 20 existing plus the 3 new ones and God's bells, gets:
- **Three stages,** at about 66% and 33% health. Each stage visibly changes:
  - a new attack set, never only faster;
  - a change in its look: armour breaks, a second form, glowing, missing parts, a size change;
  - a change in the arena: hazards, lighting, the floor breaking, water rising.
- **At least one interlude,** usually at the stage 2 turn. Late bosses get two. The boss **leaves the fight**:
  it burrows, flies up, sinks, hides in the dark, climbs the walls or steps behind a veil. It cannot be hit while
  away. While it is gone, the player must do one of these:
  - `waves`: fend off waves of its servants;
  - `targets`: destroy K marked objects (bell totems, eggs, candles, chains, mirrors); each one destroyed brings
    it back sooner and hurt;
  - `gauntlet`: survive a dodge pattern for N seconds (falling bells, sweeping beams, tides, a closing ring);
  - `chase`: hit it when it surfaces briefly at random places.
  The boss then **returns with an entrance beat** and starts its next stage. An interlude lasts 12–25 s and
  always has a clear on-screen objective: a short banner (for example DESTROY THE BELL TOTEMS 0/4) and markers.
- Interludes are fair: telegraphed, dashable, no unavoidable damage.

The shared framework is `js/game/interlude.js` (section 6).

## 4. Harder runs and hours of play

**Target:** with no permanent upgrades, a skilled first-time player usually dies in Act I. It takes about five
runs of learning and upgrades to clear Act I. A full six-act clear is a long-term goal: dozens of runs, 15+
hours. Then Ascension adds more.

Levers, all owned by the run core:
- **The base challenge rises:**
  - foes hit harder, come in larger groups, and some regular foes get new attacks;
  - healing is scarce: fewer tonics at the start, smaller shrine heals, a boss kill heals less (but the 30%
    arrival floor and the arrival grace stay, so a warden never dies unfairly on arrival);
  - bosses have more health and faster stages.
- **Depth:**
  - the existing ramp (elites and elements only from area 3 on, per-area stat growth) continues across six acts;
  - Acts IV–VI are meant to be brutal;
  - mini-bosses (section 5).
- **Permanent progress, Mewgenics-style:**
  - **The Bell Tower** becomes a deep chained upgrade tree, with 25+ nodes in branches:
    - VIGOUR: max health and tonic size;
    - ARMS: damage and crit;
    - GRACE: dash charges and i-frames;
    - FORTUNE: embers, boon rarity and rerolls;
    - FAITH: **Second Toll**, revive once per run at 40%, and start with a boon.
  - Costs grow. Bell Shards are paid by depth, so every failed run buys something.
  - **Warden mastery:** each warden's own talents and weapons, as already designed.
  - **Unlocks:**
    - Act IV is locked until the first Wheel kill;
    - Act V until the first Seraph kill;
    - Act VI until the first First Founder kill;
    - otherwise the run ends at the last unlocked act with a "the road goes on" card;
    - more boons, relics and events unlock by challenges.
- **Ascension: the Tolls.** After the first full clear, Toll 1 unlocks, and each Toll clear unlocks the next, up
  to **Toll 20**.
  - Each Toll stacks one rule, for example: foes +10% health; elites from the first area; fewer shrines; bosses
    begin at stage 2 speed; no heal from bosses; cursed rooms; one less tonic; foes leave hazards on death;
    Ascended bosses (the existing NG+ forms); and so on.
  - Each Toll raises the Bell Shard reward and shows on the select screen.
- **Balance check:** the autoplay bot is the proxy. With **no meta**, it should clear Act I in at most about 20%
  of seeds. With **half the Bell Tower** bought, in about 50–70%. With **everything**, it should reach Act IV or
  further. Report the numbers.

## 5. Mini-bosses: the old bosses return

- From Act II on, an area's encounter can field a **returning boss** from an earlier act as a mini-boss:
  - it uses its real move set;
  - it has about 45% of its health and one stage, with no full cutscene;
  - it gets a short entrance and its name as a banner: ECHO OF THE GAOLER.
  - Killing it pays like a trial.
- A level def asks for one with `minibosses: [{ from: 'act1' | 'act2' | 'act3' | '<bossType>', x, z }]`. The
  game picks a boss from that pool, preferring ones this warden has met. The game also adds about one per area
  from Act II on, rising with depth.
- The Hall of Echoes (Act IV) is a gauntlet of them.

## 6. Shared contracts

- **Level ids** (registered in `js/world/levels/index.js`):
  - Act IV: `choir`, `orchard`, `echoes`, `halo`;
  - Act V: `ribs`, `unborn`, `wake`, `cradle`;
  - Act VI: `throne`.
- **Boss types:** `seraph` (halo), `firstfounder` (cradle), `god` (throne). God summons `dawnbell` and `duskbell`
  (boss-class units with their own health bars).
- **Map size:** the new areas are larger than the Act III ones. Acts IV–V areas are about 1.5–2× an Act III
  area's walkable floor, with longer routes, more encounters (5–8) and more side paths. The throne is a big arena.
- **`js/game/interlude.js`,** owned by the Act I bosses agent. Pure, with no DOM:
  ```js
  // inside a boss AI (shape of bosses2.js BOSS_AI2 entries):
  import { interlude, stageOf } from './interlude.js';
  // stageOf(boss) -> 1 | 2 | 3   (by hp fraction: >0.66, >0.33, else; a boss may set its own thresholds)
  // interlude(world, boss, spec) starts an interlude; returns a handle { done, t }.
  // spec = {
  //   kind: 'waves' | 'targets' | 'gauntlet' | 'chase',
  //   leave: 'burrow' | 'fly' | 'sink' | 'fade' | 'climb',   // how it leaves (the fx/anim key)
  //   banner: 'DESTROY THE BELL TOTEMS',                     // short, upper case
  //   dur: 18,                                               // max seconds (gauntlet: exact)
  //   waves: [[['hushed', 4], ['ghoul', 1]], ...],           // waves: unit types and counts
  //   targets: { type: 'totem', n: 4, hp: 60 },              // targets: marked props with hp (hitting one bleeds the boss)
  //   pattern: (world, t, dt) => {},                         // gauntlet/chase: the boss's hazards each tick
  //   back: { x, z, entrance: 'slam' },                      // where and how it returns
  //   onReturn: (world, boss) => {},                         // the stage change: new moves, arena change
  // }
  // While away: boss.away = true, untargetable, not drawn (or drawn far off), and its health bar shows the
  // objective. The HUD reads world.interlude = { banner, progress: [n, of], t, dur }.
  ```
  The sim and HUD hooks it needs (`sim.js` targeting skips `away`; `ui/hud.js` banner) are made by that agent
  with small, guarded edits.
