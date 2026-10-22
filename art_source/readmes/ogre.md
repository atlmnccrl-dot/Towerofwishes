# Skeleton warlord (replaces: the Ogre boss)

**Replaces the Ogre.** The creator has no ogre body, so the boss is a **giant skeleton warlord** leading the skeleton raiders (the goblin slot). It keeps the `ogre` ID. Rename the boss in the story text to match.

The look: an aged bone body in heavy grey iron-and-fur armour with dull bronze fittings, armoured greaves, a horned iron helm, and a big two-handed **war maul** (the stand-in for the wooden beam).

**Scale it up about 1.6-1.8x in the engine** so it dwarfs Kael and Eiryn. The sheet is person-sized.

| Boss move | Sheet |
|---|---|
| wide sweep | `Attack2` (spinning swing) |
| overhead smash | `Attack4` (leaping downward strike) |
| ground slam | `Special1` (jump attack), or `Attack4` with a screen shake |
| grab and throw | `Attack5` (reach) followed by `Kick`. No dedicated grab exists. |
| stagger | `TakeDamage` (slow it down for weight) |
| dies against the wall | `Die` |

Play every animation at about 0.7x speed so the heavy attacks read as slow and weighty.

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

### `ogre/`
```nNakedBody2|C8BCA0|6A6250
Legs5|3A3632|6A6460
Shoes5|3A3632|5A5450
Chest8|5A5450|6A5A3A
Belt1|4A3424|6A5A3A
Hands1|5A5450|3A3632
Head19|4A4644|6A5A3A
Melee11|6A4A2E|5A5A5A
```

