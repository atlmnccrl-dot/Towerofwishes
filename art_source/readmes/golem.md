# Lyra's stone golems (x2, STAND-IN)

**Stand-in:** the creator has no creature or construct bodies, so this is built on the person body with creature parts. It keeps the cast-list ID so real art can replace it later.

Both are layered grey stone with **amber glowing joints and cracks**, matching Lyra's golden earth magic.

| Folder | Golem | Look | Scale in engine |
|---|---|---|---|
| `golem_a/` | A: broad, squat crusher | bulky stone mass, heavy stone fists, a blocky closed head | about 1.5x, and stretch about 1.15x wide |
| `golem_b/` | B: tall, narrow reacher | lighter stone plates, long reaching stone claws, a tall finned crest | about 1.6x, and stretch about 1.1x tall |

| Move | Sheet |
|---|---|
| slow slam | `Attack4` |
| punch | `Attack5` |
| A: block / grapple | `Idle4` and `Attack1` |
| B: reaching strike / area denial | `Attack6` and `Special1` |
| crumble (death) | `Die` (break into rubble in code) |

Play everything at about 0.7x speed for weight.

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

### `golem_a/`
```nNakedBody|7A7468|E0B060
Legs8|6A6458|4A463E
Shoes5|5A564C|3E3A34
Chest8|6A6458|E0B060
Hands1|7A7468|4A463E
Head13|6A6458|E0B060
```

### `golem_b/`
```nNakedBody|7A7468|E0B060
Legs5|8A8478|E0B060
Shoes5|5A564C|3E3A34
Chest5|8A8478|E0B060
Hands2|7A7468|E0B060
Head18|6A6458|E0B060
```

