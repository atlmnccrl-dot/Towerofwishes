# The sky beast / Skyreaver (boss, STAND-IN)

**Stand-in:** the creator has no creature bodies, so this is built on the person body with creature parts. It keeps the cast-list ID so the real creature art can replace it later.

A feather-winged clawed predator in the reference palette: huge layered **silver-white feathered wings**, a spiky silver crest and ragged feather mantle, slate-blue hide, large pale talon-claws, and pale glowing eye pixels.

**Scale it up about 1.8-2x in the engine.**

| Move | Sheet |
|---|---|
| fly / hover | `Idle` or `Walk` lifted off the ground in code; the wings move in every animation |
| dive / swoop | `AttackRun` or `AttackRun2` |
| crash-land | `Slide` |
| ground bite and claw | `Attack1` - `Attack3` and `Attack6` |
| stagger | `TakeDamage` |
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

### `sky_beast/`
```nNakedBody|5A6478|D8F0FF
Chest19|C8D4E0|6A8AB0
Hands2|8A94A8|3A4458
Bag8|EEF2F8|6A8AB0
Head24|C8D4E0|4A5870
```

