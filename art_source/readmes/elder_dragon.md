# The Elder Dragon (boss, STAND-IN)

**Stand-in:** the creator has no dragon body, so this is a person body with dragon parts. It keeps the `elder_dragon` ID.

The palette is still OPEN; this uses an ancient weathered bronze with mossy-green undertones. It has huge leathery **dragon wings**, aged horn-like crests, a heavy scaled chest, big claws, gold eye pixels, and **fire** swirling during attacks.

**Scale it 2.5-3x in the engine.** It is the biggest thing in the game.

| Move | Sheet |
|---|---|
| fly / land | `Idle` / `Walk` lifted in code; `Slide` to land |
| roar | `Taunt` |
| fire breath | `Attack3` (two-handed blast stance with fire). Add a flame cone in code. |
| tail sweep | `Attack2` (spin) |
| claw | `Attack1`, `Attack6` |
| stagger | `TakeDamage` |
| death | `Die` |

Grief and intelligence will have to come from timing and the cutscene: faces are only about 3 px wide.

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

### `elder_dragon/`
```nNakedBody|5A4A30|E0B040
Legs8|4A3E28|2E2618
Chest8|6A5634|4A5A3A
Hands2|5A4A30|C8B890
Bag5|6A5030|4A5A3A
Head18|8A7A5A|5A4A30
Magic2|FF8030|C03010
```

