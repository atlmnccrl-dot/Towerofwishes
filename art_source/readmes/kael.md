# Kael Viren

Tousled chestnut hair, charcoal fitted tunic with steel shoulder guards, dark trousers, dark leather gloves, brown belt, dark-brown boots, no cape.

| Folder | What |
|---|---|
| `kael_sword/` | Kael with his ordinary steel sword |
| `kael_unarmed/` | the same Kael with empty hands, for the fights after the sky beast takes his sword (`Attack5` is a straight punch, plus `Kick`) |

**Still open:**
- **Sword of Calamity:** look still OPEN; quick to rebuild with a different blade and colors once decided.
- **Sheathed sword:** the creator has a sword-on-the-back part (Bag3), so a sheathed version can be added if wanted.

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

### `kael_sword/`
```nNakedBody|F0C8A8|2A1E18
Legs1|2E2E34|1E1E22
Shoes2|3E2E22|2A2018
Chest7|3E3E48|6A6E78
Belt1|5E3E26|6A6E78
Hands4|2E2622|6A6E78
Head17|7A4A2A|4A2C18
Melee4|C8CCD4|4A3020
```

### `kael_unarmed/`
```nNakedBody|F0C8A8|2A1E18
Legs1|2E2E34|1E1E22
Shoes2|3E2E22|2A2018
Chest7|3E3E48|6A6E78
Belt1|5E3E26|6A6E78
Hands4|2E2622|6A6E78
Head17|7A4A2A|4A2C18
```

