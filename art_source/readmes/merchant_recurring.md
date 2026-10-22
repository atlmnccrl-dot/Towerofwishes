# Recurring merchant (OPTION)

A wandering trader you can spot instantly: a long teal coat with gold trim, a wide-brimmed hat with a red feather, and a big travelling pack. Brown trousers and boots. No weapon.

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

### `merchant_recurring/`
```nNakedBody|E0B490|2A1E18
Legs1|3A3430|26221E
Shoes1|4A3424|2E2016
Chest14|2E5A58|C8A040
Bag6|7A5A3A|5A4030
Head21|6A4A2E|A02A22
```

