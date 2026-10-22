# The creature drawn by healing (STAND-IN)

**Stand-in:** the creator has no creature bodies, so this is built on the person body with creature parts. It keeps the cast-list ID so real art can replace it later.

Separate from the Nightcrawler. A smooth, pale ash-grey, hairless figure with long pale claws and **light-catching white-cyan eye pixels**. No mane and no clothes, so it reads as eerie and quiet where the Nightcrawler reads as chaotic.

**Scale about 1.5x, and stretch about 1.15x tall** for its elongated limbs.

| Move | Sheet |
|---|---|
| eerie controlled movement | `Walk` played slow (0.6x) |
| lunge | `AttackRun` |
| claw | `Attack1` - `Attack3` |
| death | `Die` |

This is the enemy tied to Nox's *One Step: A Thousand Wounds*.

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

### `night_creature/`
```nNakedBody|9A9AA4|E0FFFF
Hands2|B0B0BA|6A6A74
```

