# Knife bandit (fast skirmisher)

Lean, with short uneven black hair. A dark-brown shirt with a red scarf, slim trousers, low boots, pale forearm wraps, and a **short knife** in his off hand.
- **Feints and lunges:** `Attack1`, `Attack6` and `AttackRun`.
- **Evasive footwork:** `StrafeLeft`, `StrafeRight`, `RunBackwards` and `Rolling`.

**Story rule:** nobody dies in the clearing. Use `TakeDamage` for hits, `Slide` for knockdown + scramble up, and `Run` / `RunBackwards` for fleeing. `Die` exists but should not be used here.

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

### `bandit_knife/`
```nNakedBody|E0B898|2A1E18
Legs1|3A3028|26201A
Shoes1|3A2A1E|26201A
Chest9|4A3424|2E2016
Chest2|9A2A22|6A1A16
Hands3|A89A80|6A6050
Head5|1E1A18|1E1A18
Offhand2|C8CCD4|4A3020
```

