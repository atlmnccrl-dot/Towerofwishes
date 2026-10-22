# The rival kid (recurring)

A teenage boy with messy dark-brown hair (darker than Kael's chestnut) and a young face. A khaki shirt under a fitted brown vest, dark trousers, simple boots and an **inexpensive short sword**. He looks ambitious but under-equipped.

- **Size:** scale him about 0.9x so he is visibly shorter than Kael.
- **Dodges:** `Rolling` and `StrafeLeft` / `StrafeRight`.
- **Later enhanced version:** the same recipe plus engraved markings, to build when we reach chapter 11.
- **Hooded follower:** to be built from this recipe with a hood.

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

### `rival_kid/`
```nNakedBody|EEC8A8|2A1E18
Legs1|2E2A2E|1E1C1E
Shoes1|4A3424|2E2016
Chest9|8A7A5A|5A503C
Chest12|4A3A2A|2E241A
Belt1|4A3424|2E2016
Head17|3A2618|2A1A10
Melee3|9A9CA0|5A4030
```

