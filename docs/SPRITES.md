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
  - **walk** (delivered 2026-10-18): front view (S), 36 frames, 59 ms each (timings read from the JSON), looping.
    - Files: `walk_S.png` + `walk_S.json`. The JSON is kept as delivered.
    - The sheet ships at half size (`sheetScale: 0.5`); the original is in `source/`.
    - Feet anchor (208, 850) and figure height 824 px, both in the JSON's full-size pixels.
    - The cycle speeds up or slows down with her movement so her feet don't slide.
  - **Where she shows:** in story scenes and the title screen, while standing (her base pose) or walking.
    - Everything else keeps her drawn body until that art arrives: fights, gestures, sitting, holding props, exhausted.
  - With only the front view drawn, she faces the camera whichever way she walks.

## What each animation ZIP should contain

```
eiryn_idle.zip
  idle.png    transparent PNG sprite sheet (all directions, all frames)
  idle.json   frame data, TexturePacker "JSON hash" (or array) format
```

- **Frame names:** `<anim>_<DIR>_<NNN>`, for example `idle_S_000`, `idle_SE_007`, `run_N_011`.
  - A one-direction sheet can keep generic names like `frame_000`; I record its direction in the manifest.
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
