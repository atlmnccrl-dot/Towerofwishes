# Raider spearman (replaces: Goblin spearman)

**Replaces the goblins.** The creator has no goblin body, so this role is a **skeleton raider**: the one non-human body the tool has. It keeps the goblin cast-list ID so it drops into the same slot, and its job in the fight is unchanged.

If you want them goblin-sized, scale to about 0.8x in the engine. The story text, contract and enemy names (goblin, Goblin Scout...) need renaming to match, for example "bone raiders" haunting the mill.

Bone body with a leather shoulder guard, a **red sash**, ragged shorts and a rough wood-and-iron **spear**.
- **Spear lunge:** `Attack5` or `Attack6`.

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

### `goblin_spear/`
```nNakedBody2|D8D0B8|8A8270
Legs9|4A3A2A|2E241A
Chest6|5A4030|3A2A1E
Belt1|8A2A22|5A1A16
Melee25|8A7E70|5A4030
```

