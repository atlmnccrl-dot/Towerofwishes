# Grabber bandit (flanker, goes for Eiryn)

Compact, with short dark hair. A faded grey-green tunic under a leather vest, a thick red belt or sash, sturdy gloves and boots. No weapon.
- **Grabs and shoves:** the creator has no grab animation, so use `Attack5` (reach) and `Kick`.
- **Low ready stance:** `Idle4` or `CrouchIdle`.

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

### `bandit_grabber/`
```nNakedBody|D8AC88|2A1E18
Legs1|3A3A32|26261E
Shoes2|3A2A1E|26201A
Chest10|6A7462|4A5244
Chest12|5A4030|3A2A1E
Belt2|7A2A22|4A1A16
Hands4|4A3424|2E2016
Head10|2A221C|1A1612
```

