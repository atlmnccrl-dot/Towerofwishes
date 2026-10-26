# Tower of Wishes v2: plan (for approval)

A new build from scratch in `v2/`, beside the old game. The old game stays untouched as a reference.

## What carries over (copied into v2, unchanged)

- **Character art:** the pixel sprite sets from the Character Creator (`assets/pixel/`, 75 sets, 30 clips × 8 directions).
  v2 copies in only the sets it uses: the full folder is 126 MB, too big for one publish.
- **Animations:** the clip mapping (idle, walk, run, attacks, hit, dodge, down, KO, special…), the attack timing
  (wind-up, contact frame, recovery) and each character's attack-clip list. These are rewritten as clean data,
  not copied as code.
- **VFX:** the pack effects (`assets/fx/`: slashes, hits, magic, fire, ice, smoke, auras…).
- **Each hero's attacks and abilities, as data:**

| Hero | Basic attack | Close-range / extra | Special (heavy art) |
|---|---|---|---|
| Kael | Slash (sword) | — | Blade heavy art |
| Eiryn | Pressure (ranged) | Pressure (close burst) | Pressure (area) |
| Aerys | Light (ranged) | Stillwing (palm strikes) | Spear of Light (line) |
| Nox | Twin Blades (3-hit combo) | Blink (teleport) | One Step — A Thousand Wounds |
| Eloryn | Push of Light (ranged) | Shove; heal on allies | Life Surge (area + heal) |
| Braxen | Altered Fist (2-hit combo) | — | Bone Breaker (area) |

  The foes' attacks (bandits, skeletons, the warlord, the Skyreaver, the knights, Calamity) carry over the same way
  when they're needed.

## What does not carry over

Everything else is rebuilt or decided again: the engine, combat code, camera, HUD, controls, UI, menus, story,
cinematics, maps and the design rules. Sounds and music aren't on the keep list. **Open question:** keep them?

## Structure

```
v2/
  index.html          one page; loads src/ as ES modules
  src/data/           heroes.js, foes.js, anims.js (clips, timing), fx.js (effect names)
  src/combat/         the fight rules: pure logic, no DOM, testable in Node
  src/render/         sprites, effects, arena, camera
  src/ui/             HUD, controls (touch + keyboard), menus
  src/main.js         loop, input, state
  assets/             copied sprite sets and effects (only what's used)
  test/               Node tests for combat; a headless-browser check with screenshots
```

Rules for the code: data separate from logic; combat runs in Node for tests; one place per concern.

## Milestones

1. **Combat core (first, published as a new artifact).** One arena. Pick a hero and fight a small group of foes,
   with real attacks, abilities, animations and VFX. Includes movement, attack, special, dodge and block, health
   and stamina, hit reactions, KO, and win or lose. Works on phone (touch) and PC (keyboard), landscape.
2. **Party.** Several heroes at once: you control one, the AI plays the rest. Switch who you control. Enemy AI
   with roles (melee, ranged, heavy).
3. **Feel.** Hit-stop, camera shake, knockback, combo timing and sound (if kept). Tuned until it feels right.
4. **Then, in order:** the story structure, scenes and cinematics, progression and menus. Each one is planned
   with you before it's built.

## Decisions (the author, 2026-10-23)

- **Camera:** angled top-down: looking down at an angle over the arena, fixed, easy to read.
- **Control:** commands only. The heroes fight by themselves. The player:
  - taps a foe to make it the party's target;
  - triggers each hero's special when their meter is full;
  - can call them back (regroup).
  An auto setting does all of this for you.
- **First roster:** Kael (Slash; his blade heavy art) and Eiryn (Pressure: ranged, close burst and the area
  special) against a band of four bandits (broad, knife, grabber, lookout).
- **Audio:** left out for now.

## Milestone 1, concretely

One arena (a clearing). Kael and Eiryn fight the four bandits with their real clips and pack effects:
- wind-up, contact and recovery timing;
- hit reactions, knockback, KO;
- the special meter and the two heavy arts;
- target tap and regroup;
- win and lose, with a retry.

Phone and PC, landscape. The combat logic has Node tests: no NaN, no timeouts, and a balance target agreed
after the first look. It's published as a new artifact.


---

# Phase 2: a team builder (proposal, 2026-10-23)

The author's direction: recruit characters, build a team of up to 5, fight campaign missions, level up,
train, upgrade loot and learn abilities. A full game, using the available art (75 sprite sets and the
effects pack). Decided so far:
- **Recruits** are earned in missions, from a fixed pool: each character joins at a moment that fits them. You
  beat them, rescue them, or finish their story mission. There's no randomness and no summoning.
- **Setting:** a new, original world.
- **Money:** built so in-app purchases could plug in later. No real payments now.
- **Battles:** set the team and formation, then the fight plays itself.

## The core loop

Pick a mission on the campaign map → choose up to 5 units and place them on a 2 × 3 formation (front row
takes the hits, back row shoots and heals) → the auto battle (×1/×2 speed, skip once a mission is
cleared) → rewards (XP, gold, gear, materials, sometimes a recruit) → the camp, where you level up, train,
upgrade gear and learn abilities → harder missions.

## Systems

- **Roster:** about 40 recruitable characters from the 75 sets. Town folk, guards, guild fighters, the old game's
  heroes, a reformed bandit, a beastfolk pair, a golem, a knight from each order, a tamed night creature, the sky
  beast, and the dragon at the very end.
  - Each has a class: Vanguard, Striker, Ranger, Mystic or Support.
  - Each has a base rarity and stats (HP, attack, defence, speed, crit), a basic attack, one active ability that
    charges in battle, and a passive.
- **Levels and promotion:** XP from missions and training raises the level. Promotion (★ to ★★★★★) uses
  materials and raises the level cap.
- **Abilities:** each unit learns new abilities at level milestones, choosing one of two at each step. Up to
  three are equipped.
- **Gear:** weapon, armour and charm, in rarities from common to legendary. They drop from missions and are
  upgraded with gold and materials.
- **Training grounds:** slots where idle units earn XP over real time.
- **Campaign:** 6 regions of 8–10 missions, each ending in a boss.
  - Each region has its own recruits and enemy families (bandits, the risen dead, beasts, frost knights,
    spectres, the dragon's mountain).
  - Cleared missions have a hard mode for better loot.
- **Economy (purchase-ready):** gold is earned everywhere; gems are rare and earned in play now. A shop sells gear
  crates, materials and training boosts for gems. Prices and products live in one catalogue that a real store
  could connect to later.
- **Saving:** on the device, with export and import. A cloud save comes with the app version.
- **App readiness:**
  - a first-time tutorial, settings (speed, effects, reduced motion) and credits;
  - phone-first layout in landscape, an install-to-home-screen web app, and fast loading;
  - a native wrapper for the App Store is a later step and needs a Mac with Xcode and an Apple developer account.

## Milestones

1. **Battle engine for 5 v 5.** Formations, classes, the ability types (area damage, heal, shield, stun, buffs and
   debuffs, summons) and an enemy AI that uses them. About 12 playable units to start. Balance tests in Node.
   **Done (2026-10-23):** 13 recruits, 2 summons, 10 foes, 3 test waves, in a battle lab (team and formation,
   1×/2×/3× speed, results with damage, healing and MVP). Sprites load per battle; portraits come from one small atlas.
2. **The game loop.** **Done with milestone 3 (2026-10-23):** title, camp, the Thornwick Road (10 missions, stars,
   replays), recruits joining at set missions (8 in region 1; 3 to start), rewards, the company screen, saving.
   Balance: `test/campaign-test.js` plays the region as a sensible player.
   **The game loop.** The campaign map with region 1 and its recruits, team and formation selection, results and
   rewards, and saving.
3. **Progression.** **Done (2026-10-23):** levels and XP (the bench earns 40%), gold, gear in three slots with four
   tiers and upgrades to +5, selling, training ranks, and two ability upgrades (levels 4 and 8, one of two each).
   **Progression.** Levels, gear and loot, upgrades, ability learning, training and promotion.
4. **The world.** **Done (2026-10-26):** regions 2–6 (50 more missions, 60 in all), 10 more recruits (23), 17 more
   foe types with a boss per region, tiled grounds per region, heroic mode, level cap 60, four upgrade tiers;
   difficulty tuned by `test/tune.js` for a casual player.
   **The world.** Regions 2–6 with their enemies, bosses, recruits, story beats and hard mode.
5. **Ready to ship.** **Done (2026-10-26), waiting on the author:** gems, shop, daily bounties, 23 feats, gem packs
   through the app stores, music and sounds, first-time tips, settings (volumes, shake, save codes), bundled
   fonts, the Capacitor iOS/Android projects, icons, an installable web build, `docs/RELEASE.md`, `docs/PRIVACY.md`.
   **Ready to ship.** Shop and currencies, the tutorial, settings, polish and performance, and the installable
   web app.

## Answered (the author, 2026-10-23)

- The world is **Vael**. The old heroes' sprites return as **new characters with new names** (Corvin, Ysolde, Saela,
  Vesk, Maren, Brann).
