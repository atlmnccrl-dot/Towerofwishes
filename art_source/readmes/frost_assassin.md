# Frost assassin (Nox's Markers Covenant peer; boss vs Nox)

Lean, pale-skinned, with short ash-grey hair and icy-blue eye pixels. Fitted slate-blue combat clothes with a charcoal harness, charcoal trousers, gloves, slate boots, a belt with an ice-blue buckle, and an **ice-steel dagger** in the off hand. **Pale frost wisps** swirl from the hands during attacks. `Attack3` is the two-handed frost cast (sealing and restraint), `Rolling` and `Strafe*` are the dodges, and `Idle4` is the counter stance.

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

### `frost_assassin/`
```nNakedBody|F0E4E0|7AC0E8
Legs1|2A2E36|1C1E24
Shoes5|3A4A60|2A2E36
Chest4|3A4A60|2A2E36
Belt1|2A2E36|9AC8E8
Hands4|2A2E36|1C1E24
Head10|9A9CA4|6A6C74
Offhand2|C8E8F8|3A4A60
Magic3|C8F0FF|7AC0E8
```

