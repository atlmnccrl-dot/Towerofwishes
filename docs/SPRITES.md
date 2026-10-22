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
| attack | the set's attacks (Kael Attack1 → Attack2 in a combo; fists, grabs and Eiryn's push Attack5). The wind-up stretches to the fight's wind-up and the blow lands on the clip's contact frame |
| cast (Eiryn's failed glyphs) | Attack5 |
| parry | Idle4 with a lean back |
| hurt, stagger | TakeDamage |
| dodge | Rolling |
| knocked down | Slide (falls and gets back up) |
| defeated | Die (holds the last frame) |
| heavy art (cutscene) | Special1, its contact frame on the impact |
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
| Goblins (stand-ins: skeleton raiders) | `goblin`, `goblin_spear`, `goblin_archer`, `goblin_hexer` |

Not yet built: Aerys, Nox, Eloryn, Braxen, the Ogre, beasts and the later cast. They keep their
drawn bodies until their sets arrive.

## Not in the creator

No sit, talk, pick-up or plain jump clips, and no children. Sitting uses the crouch behind the
table; the creator's leaps (Special1, Attack4) stand in for jumps.
