# Erdra townsfolk (before the Reset)

| Folder | Who |
|---|---|
| `erdra_m1/` | A: young man, short brown hair, olive work tunic, brown trousers and shoes |
| `erdra_m2/` | B: older artisan, grey hair, russet vest over a pale shirt, dark trousers |
| `erdra_f1/` | C: woman, chestnut hair tied up, cream blouse, long muted-green skirt, ankle boots |
| `erdra_f2/` | D: young woman, short dark hair, grey shirt under a navy vest, grey trousers, walking shoes |
| `erdra_vendor/` | fruit seller: earth-brown clothes with a cream apron panel, tied-back dark hair |
| `erdra_baker/` | baker: cream clothes with a tan apron panel, short fair hair |
| `erdra_musician/` | fountain musician: lived-in violet shirt with a red sash, headband. No instrument (the creator has none: add a prop sprite). |

**Not included:**
- **Children:** the creator has no child body. Scale an adult down to about 0.7x as a stopgap, or use custom art.
- **Rooftop neighbours and fleeing civilians:** reuse these bodies. `Run` works for panic and `CrouchIdle` for cowering. Dust and injury are code tints.

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

### `erdra_m1/`
```nNakedBody|E8C0A0|2A1E18
Legs1|5A4A3A|3A2E24
Shoes1|5A3A22|3A2616
Chest10|8A8456|5A5636
Belt1|4A3424|2A2018
Head10|6A4A2A|4A3020
```

### `erdra_m2/`
```nNakedBody|E0B898|2A1E18
Legs1|2E2A28|1E1C1A
Shoes1|3A2A1E|2A1E14
Chest9|E0D8C4|A09A8A
Chest12|8A4A2A|5A3018
Head16|9A9A98|6A6A6A
```

### `erdra_f1/`
```nNakedBody|F0CCB0|2A1E18
Legs2|5A6E4A|3A4A30
Shoes1|4A3424|2E2016
Chest9|EADFC4|B0A486
Belt1|6A4A30|4A3020
Head1|7A4A2A|4A2C18
```

### `erdra_f2/`
```nNakedBody|F2D2BC|2A1E18
Legs1|4A4E58|2E3038
Shoes3|3A3A40|26262A
Chest9|7A808A|4A4E58
Chest12|2E3650|1E2438
Head6|2A2220|1A1614
```

### `erdra_vendor/`
```nNakedBody|D8A880|2A1E18
Legs1|4A3A2A|2E241A
Shoes1|4A3020|2E1E14
Chest13|9A5A30|D0C0A0
Head4|3A2418|2A1A10
```

### `erdra_baker/`
```nNakedBody|F0CCB0|2A1E18
Legs1|7A6A5A|4A4038
Shoes1|5A4030|3A2A1E
Chest13|EAE2D2|A8885A
Head16|C8A060|9A7840
```

### `erdra_musician/`
```nNakedBody|E8C4A4|2A1E18
Legs1|3E3A44|26242A
Shoes1|4A3424|2E2016
Chest17|6A5A80|A04A3A
Head22|4A3020|8A2A22
```

