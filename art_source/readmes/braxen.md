# Braxen

Short dark hair, tanned skin, gold eye pixels. A sleeveless dark combat vest over bare arms, practical trousers, a belt and reinforced boots. His altered arm is shown as huge pale **bone-like claw growths**. Fists only.

| Folder | What |
|---|---|
| `braxen/` | the normal Braxen |
| `braxen_frost/` | after Floor 1: cooler, paler skin, icy-blue eye pixels and frost-blue altered arms |

**Limits of the creator:**
- **Altered arm:** the hand part covers **both** arms, so both look altered. Flip the sprite so the right side leads, or have custom art replace it later.
- **Horns:** there are no small horns (only helmets), so they are left off until approved art exists.
- **Size:** scale him about 1.15x in the engine so he is the largest hero.

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

### `braxen/`
```nNakedBody|D0A07C|C8A040
Legs1|3A3630|26221E
Shoes5|3A2E24|26201A
Chest12|2E2A2A|1E1C1C
Belt2|3A2E24|26201A
Head10|1E1A18|141210
Hands2|E0D8C8|8A8070
```

### `braxen_frost/`
```nNakedBody|C8A890|7AC8F0
Legs1|3A3A40|26262A
Shoes5|3A3438|26262A
Chest12|2E2E34|1E1E22
Belt2|3A3438|26262A
Head10|1E1A20|141218
Hands2|C8E4F4|5A8AB0
```

