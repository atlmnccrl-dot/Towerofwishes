# The escaped caged creature (Depth 3, STAND-IN)

**Stand-in:** the creator has no creature or construct bodies, so this is built on the person body with creature parts. It keeps the cast-list ID so real art can replace it later.

The species is still OPEN. This is a low, muscular grey-brown predator with a shaggy mane, big hooked claws and pale amber eye pixels.

**Scale about 1.3x in the engine.**

| Move | Sheet |
|---|---|
| prowl, low-slung | `CrouchIdle`, `CrouchRun` |
| pounce | `AttackRun` or `Attack4` |
| claw | `Attack1` - `Attack3` |
| hurt | `TakeDamage` |
| flee | `Run` |
| death | `Die` |

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

### `caged_creature/`
```nNakedBody|6A5E50|E0C070
Legs9|5A5044|3E382E
Hands2|5A5044|8A8070
Head24|4A4036|2E2820
```

