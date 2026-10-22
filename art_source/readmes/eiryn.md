# Eiryn Ashvale

Long silver-white hair, emerald eyes (the dot-sized eye pixels are green), pale skin. Fitted black tunic with a deep-green asymmetric front panel, dark leggings, simple belt with green accent, black gloves, dark-green high boots. No cape.

| Folder | What |
|---|---|
| `eiryn/` | unarmed caster. Green glyph-light trails (the creator's Magic3 layer) appear during attack/cast swings, so `Attack1`-`Attack6` read as spellcasting. `Attack5` is the straight hand push (Pressure). |
| `eiryn_branch/` | the same Eiryn swinging a crooked broken branch, for the bandit fight. No magic layer. |

The creator has only one (male-proportioned) body; at this size the long hair, tunic and boots carry the read. Faces are about 3 px wide.

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

### `eiryn/`
```nNakedBody|FAE4D6|2E8A50
Legs1|1C1C22|111114
Shoes5|1E4A32|141418
Chest13|1E2024|1E5A3C
Belt1|3A2A20|2E8A50
Hands4|1C1C22|1E5A3C
Head12|EEEEF2|B8BCC8
Magic3|7CF0A8|2EA060
```

### `eiryn_branch/`
```nNakedBody|FAE4D6|2E8A50
Legs1|1C1C22|111114
Shoes5|1E4A32|141418
Chest13|1E2024|1E5A3C
Belt1|3A2A20|2E8A50
Hands4|1C1C22|1E5A3C
Head12|EEEEF2|B8BCC8
Melee6|7A5A38|4E3822
```

