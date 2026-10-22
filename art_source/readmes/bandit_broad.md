# Broad-shouldered bandit (heavy brawler, the fight's boss)

Bald (the creator's closest to cropped hair), with tanned skin. A sleeveless brown leather vest over a faded undershirt, red sash, dark trousers, reinforced boots, and cloth-wrapped fists. No weapon.
- **Width:** the creator has one body build, so scale him about 1.15x in the engine to look wider than Kael.
- **Wind-up punch:** use `Attack5`. Slow its first frames for the obvious wind-up.

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

### `bandit_broad/`
```nNakedBody|C89A78|2A1E18
Legs1|2E2A28|1E1C1A
Shoes2|3A2A1E|26201A
Chest1|8A8478|5A564E
Chest12|6A4A2E|4A3420
Belt1|8A2A22|5A1A16
Hands1|B8AC94|7A7262
Head2|2A221C|1A1612
```

