# Cassius (boss; the Night Dweller)

Lean and dangerous, with medium-length dark hair. A fitted dark short jacket over a dark shirt, slim trousers, light dark boots, gloves. **Unarmed**: pale **air wisps** trail his hands during attacks (his air-based motion), which keeps his style distinct from Kael's sword. Use `Rolling`, `StrafeLeft` / `StrafeRight` and `Slide` for his lazy evasive repositioning, and `Idle4` for counters and blocks.

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

### `cassius/`
```nNakedBody|E8C8B0|2A1E18
Legs1|1E1E26|141418
Shoes1|2A2A30|1C1C20
Chest9|34343E|26262E
Chest11|26262E|4A4A5A
Belt1|2A2A30|8A8E96
Hands4|1E1E22|141416
Head9|1E1A1E|141214
Magic3|D8E8F0|9AB0C8
```

