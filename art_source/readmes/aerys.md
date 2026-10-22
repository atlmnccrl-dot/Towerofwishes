# Aerys

Long pale-blonde hair, light-blue eye pixels. An ivory tunic with a pale-blue split overskirt panel, gold belt and trim, ivory bracers, pale-blue leggings and pale boots. No wings.

| Folder | What |
|---|---|
| `aerys/` | unarmed Light user. **Gold Light** swirls from her hands during attacks: `Attack5` is the straight hand-fired bolt and `Attack3` the two-handed blast. |
| `aerys_spear/` | the same Aerys holding the glowing **Spear of Light**. `Attack6` / `AttackRun` are the thrust; for the throw use `Attack5` and spawn the spear projectile in code. |

**Flying / hover:** the creator has no fly animation. Play `Idle` or `Walk` lifted off the ground in code, with a soft bob. `Rolling` works for aerial dodges.

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

### `aerys/`
```nNakedBody|F6E0D0|6AB0E8
Legs1|8A9AB0|5A6A80
Shoes2|E8E2D6|C8A040
Chest13|F0ECE0|9AC0E0
Belt1|C8A040|8A6A20
Hands3|F0ECE0|C8A040
Head12|F0E0A8|C8B070
Magic3|FFE070|D0A020
```

### `aerys_spear/`
```nNakedBody|F6E0D0|6AB0E8
Legs1|8A9AB0|5A6A80
Shoes2|E8E2D6|C8A040
Chest13|F0ECE0|9AC0E0
Belt1|C8A040|8A6A20
Hands3|F0ECE0|C8A040
Head12|F0E0A8|C8B070
Melee25|FFF6D0|F0D070
Magic3|FFE070|D0A020
```

