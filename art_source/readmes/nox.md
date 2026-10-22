# Nox Kairen

Messy near-black hair, pale skin, violet eye pixels. Fitted charcoal-black assassin clothes with a dark leather harness and dark-metal plates, a black scarf, leather gloves, reinforced boots, and **twin daggers** (one in each hand). Quick attacks: `Attack1`, `Attack2`, `Attack6`, `AttackRun`. Shadow Step stays a code effect (fade out, move, fade in). For the exhausted demon-power state, slow `Idle3` and tint him paler in code.

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

### `nox/`
```nNakedBody|EAD6CC|7A4AB0
Legs1|26262C|1A1A1E
Shoes5|2E2E34|4A4C56
Chest4|2E2E36|4A4C56
Chest2|1A1A20|101014
Hands4|2A2420|1E1A16
Head17|141218|0E0C10
Melee1|B8BCC4|2A2A30
Offhand2|B8BCC4|2A2A30
```

