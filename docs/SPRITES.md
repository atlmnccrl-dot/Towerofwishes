# Sprite characters: delivery format

Code: `js/sprites.js`. Assets: `assets/characters/<id>/`. Test: `node test/sprites-test.js`.

## Eiryn (registered)

- **Official look:** `assets/characters/eiryn/eiryn_base.png`.
  - 448×816 transparent PNG, front view (S).
  - Every animation must match it: hair (long silver-white with side braids), face, green eyes, black-and-green outfit, belt and pouch, black leggings, green boots, proportions.
- **Manifest:** `assets/characters/eiryn/eiryn.json`.
  - Feet anchor at pixel (223, 778).
  - Figure height 741 px (top of head to soles).
  - Used for the sim looks `eiryn`, `eirynAsh` and `eirynMage`.
  - **Delivered so far** (timings read from each JSON):

    | Animation | Drawn | Not drawn yet |
    |---|---|---|
    | walk (36 × 59 ms) | S, SE, SW, E (W = E mirrored) | NE, N |
    | run (36 × 59 ms) | S | SE, E, NE, N |
    | idle_combat (36 × 88 ms) | S: fight stance, glyph at her hand | other directions |
    | attack (36 × 100 ms) | S: Pressure cast; wind-up 0–12, hit on 12, release and recover 28–35 | other directions |
    | idle | none (her base sprite stands in, front only) | all |

  - **Fights** use her sprite in every state. Where a clip doesn't exist yet, existing art is reused:

    | State | Uses | Until this arrives |
    |---|---|---|
    | standing | idle_combat | |
    | casting / charging | idle_combat | `cast` |
    | parry | idle_combat, with a small lean back | `block` |
    | hit, stagger | idle_combat, with a recoil and a flash | `hit` |
    | dodge | run or walk, played fast | `dodge` |
    | knocked down, out | the current pose, sinking onto her side | `down`, `ko` |

    The attack clip is timed to the fight: the wind-up stretches to the attack's real wind-up, the hit lands on frame 12, and the long hold is skipped into the release.
  - **Scenes** keep her calm poses (the base sprite standing, the walk moving). Life layer:
    - while walking she turns toward whoever is talking;
    - a pair walking the same way keeps abreast, the speaker half a step ahead;
    - the pace has a little natural give and eases in and out;
    - still poses breathe.
  - **Gestures, props and sitting in scenes** have no sprite art yet and keep the drawn body there.
  - Each delivered JSON is kept as is. Runtime sheets are half-size WebP; the full PNGs are in `source/`.
  - The files labelled SE and SW arrived with each other's directions; they're filed by how they face on screen.
  - walk_E arrived with a checkerboard painted in. It was keyed out. Its cape isn't on her base sprite; that needs a call from the author.

## What each animation ZIP should contain

```
eiryn_idle.zip
  idle.png    transparent PNG sprite sheet (all directions, all frames)
  idle.json   frame data, TexturePacker "JSON hash" (or array) format
```

- **Frame names:** `<anim>_<DIR>_<NNN>`, for example `idle_S_000`, `idle_SE_007`, `run_N_011`.
  - A one-direction sheet can keep generic names like `frame_000`; I record its direction in the manifest.
  - Directions are as seen on screen: `SE` faces down-right, `SW` faces down-left.
  - `DIR` is one of `S SW W NW N NE E SE`.
  - `S` faces the viewer; `N` is the back.
- **Directions:** draw at least `S, SE, E, NE, N`. The game mirrors `SE→SW`, `E→W` and `NE→NW`.
  - Fewer directions also work: the game uses the nearest drawn one. They look worse when the camera turns.
- **Scale and anchor:** same as the base sprite.
  - The figure is about 741 px tall.
  - The feet stay at the same anchor point in every frame.
  - If the sheet is trimmed, keep `spriteSourceSize` / `sourceSize` in the JSON so the anchor holds.
  - If a clip needs a different canvas, give its anchor in the note below.
- **Frame rate:** 12 fps by default. Say if a clip uses another rate, and whether it loops.
- **Attacks:** say which frames are the wind-up, the hit and the recovery (e.g. "wind-up 0–12, hit 12, recover 28–35"). The fight stretches each part to its own timing.
- **Background:** transparent. No shadow baked in; the game draws the ground shadow.

## Animations the game will map to fight states

| Animation | Used for | Loops |
|---|---|---|
| `idle` | standing, waiting | yes |
| `walk` | circling, slow moves, scenes | yes |
| `run` | moving in fights, rushing | yes |
| `attack` | basic attack. Ideally three marked parts: wind-up, strike, recover | no |
| `cast` | glyph casting | no |
| `dodge` | dodge | no |
| `block` | parry / block | no |
| `hit` | taking damage, stagger | no |
| `down`, `ko` | knocked down, defeated | no |
| (optional) `idle_to_run`, etc. | transition clips. The game plays them between states if present; otherwise it crossfades (0.12 s) | no |

Send them in any order. Each one is registered in the manifest as it arrives and checked by the test.
