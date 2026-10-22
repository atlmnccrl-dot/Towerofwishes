# Beast Folk villagers

The creator has no animal ears or tails, so Beast Folk are people with **wild fur manes** and amber eye pixels, in earthy forest clothes.

| Folder | Who |
|---|---|
| `beastfolk_m/` | **hunter / tracker:** a dark-brown mane, forest-green leather harness, clawed hands, belt pouch and boots. Use him for sparring and arm-wrestling (FIGHTER), and for the **high-ranked tracker**: `Idle3` for sniffing and searching, `Run` for sprinting, `Attack5` for pointing. |
| `beastfolk_f/` | **villager / craftsperson:** a tawny mane, olive tunic, long brown skirt, plain shoes. No claws. |

- **Beast Folk child:** scale `beastfolk_f` (or `beastfolk_m` without claws) to about 0.7x.
- **More lineages:** each is a recolour of the mane and clothes.

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

### `beastfolk_m/`
```nNakedBody|C08A60|E0A030
Legs1|4A4A30|2E2E1E
Shoes2|5A4030|3A2A1E
Chest4|4A5A34|5A4030
Belt2|5A4030|3A2A1E
Hands2|5A4030|C8B890
Head24|6A4A2E|4A3420
```

### `beastfolk_f/`
```nNakedBody|E0B088|E0A030
Legs2|5A4030|3A2A1E
Shoes1|5A4030|3A2A1E
Chest15|6A6A40|4A4A2C
Belt1|5A4030|8A7A50
Head24|A07848|7A5A34
```

