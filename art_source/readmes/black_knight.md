# The Black Knight (major boss)

Tall heavy **blackened steel** armour: a broad breastplate, layered shoulder plates, gauntlets, greaves and a fully closed helm whose **visor slit glows dim violet** (the trapped souls). It carries a dark **longsword**. **Dark violet smoke** trails its strikes, like many souls in one body.

**Scale it about 1.3x in the engine.**

| Behaviour | Sheet |
|---|---|
| unnaturally still before combat | hold `Idle` frame 0 |
| controlled strikes | `Attack1`-`Attack3` |
| block | `Idle4` |
| second phase (scatters the party) | `Special1` with a code blast |

It is never killed: don't play `Die`. Use `TakeDamage` and `Slide` at most.

## Sheet format (same for every PNG)
- **1920 x 1024 px**, transparent background: **15 columns x 8 rows** of **128 x 128 px** frames. Every animation uses all 15 frames.
- **Each row is one direction:**

| Row | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Faces | E (right) | SE | S (toward camera) | SW | W (left) | NW | N (away) | NE |

- Characters stand about 45 px tall inside the frame. **No drop shadow** is baked in: draw your own in the engine. Use point/nearest filtering, no mipmaps.

## The 30 animations (same names for every character)
| Game state | Sheet |
|---|---|
| idle | `Idle` (`Idle2`, `Idle3` relaxed variants) |
| combat-ready / block / parry | `Idle4` (low guard stance) |
| walk / run | `Walk`, `Run`, `RunBackwards`, `StrafeLeft`, `StrafeRight` |
| attack combo | `Attack1` -> `Attack2` -> `Attack3` |
| heavy / extra attacks | `Attack4` (leaping downward strike), `Attack6` (lunge combo), `Special1` (spinning jump attack) |
| punch / cast push | `Attack5` (straight thrust of the hand) |
| kick | `Kick` |
| attack while moving | `AttackRun`, `AttackRun2` |
| dodge / roll | `Rolling` (`Slide` also works) |
| knockdown + get up | `Slide` (goes to the ground and rises again) |
| hurt | `TakeDamage` |
| death / defeated | `Die` (hold the last frame) |
| victory / taunt / gesture | `Taunt` |
| crouch / cower | `CrouchIdle`, `CrouchRun` |
| mounted (rider only) | `RideIdle`, `RideRun`, `RideIdleAttack1`, `RideRunAttack1` |

The creator has no sit, talk, pick-up or jump animations.
## Parts used (bottom to top: `Part | main color | second color`)

### `black_knight/`
```nNakedBody|2A2A30|8A7AC8
Legs5|1E1E24|3A3A42
Shoes5|1E1E24|2E2E34
Chest16|26262C|3A3A42
Chest7|1E1E24|3A3A42
Belt1|1E1E24|3A3A42
Hands4|2A2A30|4A4A52
Head13|202024|8A7AC8
Melee2|5A5A64|1E1E24
Magic1|6A5AA0|3A2A6A
```

