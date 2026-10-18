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
  - **Delivered so far** (36 frames at 59 ms each, timings read from each JSON, looping):

    | Animation | Drawn | Not drawn yet |
    |---|---|---|
    | walk | S, SE, SW, E (W = E mirrored) | NE, N (and NW by mirror) |
    | run | S | SE, E, NE, N |
    | idle | none (her base sprite stands in, front only) | all |

    - Where an animation isn't drawn for a facing, the nearest drawn view is used. Running uses the walk, sped up, in views where the run isn't drawn.
    - Each delivered JSON is kept as is. Runtime sheets are half-size WebP (`sheetScale: 0.5`, about 0.5–0.7 MB each); the full PNGs are in `source/`.
    - The files labelled SE and SW arrived with each other's directions, so they are filed by how they face on screen. SE = facing down-right.
    - walk_E arrived with a checkerboard painted into the image (not transparent). It was keyed out; `source/walk_E_full.png` is the keyed sheet.
    - walk_E also shows a green cape with gold trim that isn't on her base sprite. It is kept as delivered; it needs a call from the author.
  - **Where she shows:** in story scenes and the title screen, while standing (her base pose) or walking and running.
    - Everything else keeps her drawn body until that art arrives: fights, gestures, sitting, holding props, exhausted.

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
