# Gothic Kingdom knights A and B (C to follow)

Disciplined kingdom knights, not villains. They share one design language: dark steel with **deep crimson cloth and crest** (the kingdom colours), and closed helms.

| Folder | Knight | Look |
|---|---|---|
| `gothic_knight_a/` | A: Vanguard | full dark-steel plate with layered shoulders and a long sword. A clean, authoritative silhouette. |
| `gothic_knight_b/` | B: Mobile combatant | lighter protection (a steel harness over a crimson tunic), bracers, light boots and a slimmer short sword. |

- **Blocks:** `Idle4`.
- **Knight C (the binding specialist with vine magic):** comes in the next batch.

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

### `gothic_knight_a/`
```nNakedBody|E0C0A8|2A1E18
Legs5|2E2E34|4A4E56
Shoes5|2E2E34|4A4E56
Chest16|4A4E56|5A1E24
Chest7|3A3E46|5A5E66
Belt1|2A1E20|8A8E96
Hands4|3A3E46|2A2E34
Head13|4A4E56|5A1E24
Melee4|C0C4CC|2A1E20
```

### `gothic_knight_b/`
```nNakedBody|E8C8B0|2A1E18
Legs5|2E2E34|5A5E66
Shoes2|2A2A30|1E1E24
Chest9|3A1E22|2A1418
Chest4|3A3E46|5A5E66
Belt1|2A1E20|8A8E96
Hands3|3A3E46|2A2E34
Head13|5A5E66|5A1E24
Melee3|C0C4CC|2A1E20
```

