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
