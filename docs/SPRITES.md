# Sprite characters: pixel art from the Character Creator

Code: `js/sprites.js` (which set draws whom, clip mapping) and `pixelBody` in `js/render/fighters.js`
(which clip plays in each state). Test: `node test/sprites-test.js`.

## Delivery

Each character is built in the itch.io **Character Creator 2D Fantasy** and exported as a ZIP:

- 30 PNG sheets, one per clip (`Idle.png`, `Walk.png`, `Attack1.png`, …);
- each sheet 1920×1024, transparent: 15 frames × 8 rows of 128 px;
- rows are directions as seen on screen: E, SE, S, SW, W, NW, N, NE;
- the figure stands about 44 px tall; **no drop shadow** (the game draws its own;
  `tools/pack_pixel.py` removes one if it was exported).

To add one: copy its folder to `art_source/characters/<set>/`, run `python3 tools/pack_pixel.py <set>`
(writes `assets/pixel/<set>.json` and its pages), and map the character to the set in
`PIXEL_CAST` in `js/sprites.js`.

## Which clip plays when

| Game state | Clip |
|---|---|
| standing (fight) | Idle4 (guard stance); the lookout uses Idle3 |
| standing (scene) | Idle; other gestures Idle2; pointing Attack5 held |
| walking, running | Walk, Run (pace matched to the ground speed) |
| circling a foe | StrafeLeft / StrafeRight; backing off RunBackwards |
| attack | the set's attacks, cycled through a combo (Kael Attack1 → Attack2; Nox Attack1 → Attack2 → Attack6; fists, grabs, Eiryn's push and Aerys's bolt Attack5; the warlord's ground slam Attack4). The wind-up stretches to the fight's wind-up and the blow lands on the clip's contact frame |
| cast | Attack5 (Eiryn's failed glyphs); Attack3 (Eloryn's two-handed heal) |
| parry | Idle4 with a lean back |
| hurt, stagger | TakeDamage |
| dodge | Rolling |
| knocked down | Slide (falls and gets back up) |
| defeated | Die (holds the last frame) |
| heavy art (cutscene) | Special1 (Aerys and Eloryn: Attack3), its contact frame on the impact |
| won fight | Taunt |
| sitting, picking up | CrouchIdle (behind the table) |

## Cast (sets in `art_source/characters/`)

| Character | Set |
|---|---|
| Kael | `kael_sword` in fights, `kael_unarmed` in scenes |
| Eiryn | `eiryn` (caster); `eiryn_branch` once she picks up the branch |
| Alric; his beast form | `alric`; `alric_beast` (stand-in: the beast's look is still OPEN) |
| The climber; the Fragments | `climber`; `fragment` |
| Bandits | `bandit_broad` (×1.15), `bandit_knife`, `bandit_grabber`, `bandit_lookout` |
| Erdra townsfolk (before the Reset) | `erdra_m1`, `erdra_m2`, `erdra_f1`, `erdra_f2`, `erdra_vendor`, `erdra_baker`, `erdra_musician` |
| Ashgate regulars | `ashgate_m1`, `ashgate_m2`, `ashgate_f1`, `ashgate_f2` (`ashgate_f2` is the minor adventurer) |
| Spearwoman, tavern keeper | `spearwoman`, `tavern_keeper` |
| Gate guard, guard officer | `guard_gate`, `guard_officer` |
| Shopkeeper, registrar, evaluator, miller | `shopkeeper`, `registrar`, `evaluator`, `miller` |
| Aerys; Nox; Eloryn; Braxen | `aerys` (`aerys_spear` for the Spear of Light); `nox`; `eloryn`; `braxen` (`braxen_frost` after Floor One) |
| Skeleton raiders (were goblins) | `goblin`, `goblin_spear`, `goblin_archer`, `goblin_hexer` |
| Skeleton Warlord (was the Ogre; ×1.8); the raider chief | `ogre` |
| Skyreaver (×2.1); Night Creature (×1.5) | `sky_beast`; `nightcrawler` |
| Ruin beasts; the Stray | `hamlet_predator`; `caged_creature` |
| Nox's target; the road merchant; the sword-shop owner | `nox_target`; `merchant_recurring`; `sword_smith` |
| Later chapters (ready, not in scenes yet) | `rival_kid` (×0.9), `hooded_follower`, `cassius`, `lyra`, `golem_a`, `golem_b`, `frost_assassin`, `caged_creature`, `night_creature`, `hamlet_people`, `hamlet_predator`, `beastfolk_m`, `beastfolk_f`, `labyrinth_citizen`, `demon_dealer`, `guild_adventurer` |

Creature sets are stand-ins built on the creator's person body, scaled up in the game.
Not yet built: Calamity, the knights, Kharuun, the Practice Block, the thugs and other later foes.
They keep their drawn bodies until their sets arrive.

## Not in the creator

No sit, talk, pick-up or plain jump clips, and no children. Sitting uses the crouch behind the
table; the creator's leaps (Special1, Attack4) stand in for jumps.
