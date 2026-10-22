# Hamlet predators (pack, STAND-IN)

**Stand-in:** the creator has no creature bodies, so this is built on the person body with creature parts. It keeps the cast-list ID so real art can replace it later.

The species is still OPEN. These are wild, earthy pack hunters: mottled brown fur, a shaggy dark mane, long claws and amber eye pixels. They are warmer and browner than the Nightcrawler so the two never read as the same thing. Spawn several and tint each slightly in code for a pack.

**Scale about 1.2x in the engine.**

| Move | Sheet |
|---|---|
| prowl / circle | `CrouchIdle`, `CrouchRun` |
| pounce | `AttackRun` or `Attack4` |
| pack bite / claw | `Attack1` - `Attack3` |
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

### `hamlet_predator/`
```nNakedBody|5A4A3A|E0A040
Legs9|4A3A2C|2E241A
Hands2|4A3E30|8A7A60
Head24|3A2E24|6A5A44
```

