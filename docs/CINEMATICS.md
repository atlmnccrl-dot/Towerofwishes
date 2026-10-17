# Cinematic moments

Every moment of the story that isn't a fight plays as a staged scene: the real fighters
on a real arena, blocked beat by beat with the dialogue, with camera cuts, gestures, walks,
weather and light. Dialogue reads out as a film subtitle under the picture (name over a
hairline, text with a soft shadow); there are no speech balloons.

**Rule:** no painted still images between scenes. A scene node with no stage is a bug.
`test/story-test.js` does not check this; the list below is generated from the story graph
(`NONE` would mean a still; there are none).

## Set pieces (moving, not just talking heads)

| Moment | Where | What plays |
|---|---|---|
| Opening: the world before the Reset | `js/render/opening.js` (cinematic) | the painted flyover of Erdra and the Tower |
| Evening in the square | `p.evening` | the crowd, Eiryn crossing to Alric, the hand kiss, the walk out |
| The overlook | `p.overlook` | the Tower at dusk, the two of them, forehead to forehead |
| The last ascent | `p.tower`, `p.light` | the wounded climber creeping up the final steps, the Fragments blinking in |
| The Reset | `p.reset` (rooftops arena) | the line opens across the sky, red at its edges, fire and embers, the run across the roofs, Alric's shove, the white-out |
| The tale at the fire | `p.story` | survivors telling it, Eiryn standing apart |
| 150 years later | `p.later` | Eiryn at dawn; title card over the moving scene |
| The formation breaks | `c1.clip` | the Guild's charge, the purple rings over the treeline, the shudder |
| Heavy arts | `js/render/fx.js` | Kael and the climber: the blade of light climbs, falls, runs out as a wave of light and a cut line across the screen; Eiryn, Aerys: the lance |

## Proposals in this pass (flagged for the author)

- The rooftop run and the shove are staged from the manuscript's lines ("Eiryn ran. Alric's
  hand was locked around hers…"); the rooftops themselves are staging, not text.
- The square, the Guild office with its contract board and banners, the toll bridge, the
  orchard rows: set dressing only.
- Looks for the Older guard, the Registrar, the Evaluator, the miller.
- The climber is wounded (75 % health), slower and no longer blinks: staging for "blood had
  dried along one side of the stranger's face, the weapon was broken".

## Every scene node and where it plays

### prologue

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `p.evening` | scene | 10 | square |
| `p.overlook` | scene | 11 | hillpath |
| `p.tower` | scene | 5 | summit |
| `p.light` | scene | 2 | summit |
| `p.reset` | scene | 8 | rooftops |
| `p.story` | scene | 4 | nightcamp |
| `p.later` | card |  | hillpath |
| `p.who` | scene | 2 | (continues the shot above) |

### c1

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c1.tavern` | scene | 6 | tavern |
| `c1.formation` | scene | 1 | tavern |
| `c1.clip` | scene | 2 | clearing |
| `c1.go` | scene | 5 | tavern |
| `c1.run` | scene | 3 | road |
| `c1.voice` | scene | 9 | clearing |
| `c1.after` | scene | 14 | clearing |
| `c1.trust` | choice |  | (continues the shot above) |
| `c1.walk` | scene | 11 | clearing |

### c2

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c2.gate` | scene | 7 | square |
| `c2.tavern` | scene | 8 | tavern |
| `c3.tea` | scene | 7 | square |
| `c3.fine` | choice |  | (continues the shot above) |
| `c3.paid` | scene | 3 | (continues the shot above) |
| `c3.kael` | scene | 5 | (continues the shot above) |
| `c3.argue` | scene | 5 | (continues the shot above) |
| `c3.guild` | scene | 4 | (continues the shot above) |

### c4

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c4.guild` | scene | 4 | guildhall |
| `c4.eval` | scene | 4 | yard |
| `c4.board` | scene | 4 | guildhall |
| `c4.party` | choice |  | (continues the shot above) |

### c5

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c5.mill` | scene | 6 | hillpath |
| `c5.path` | scene | 6 | hillpath |
| `c5.cave` | scene | 4 | cave |
| `c5.tracks` | scene | 6 | cave |
| `c5.ogre` | scene | 5 | cave |
| `c5.after` | scene | 11 | cave |
| `c5.home` | scene | 7 | tavern |

### c6

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c6.road` | scene | 13 | grassland |
| `c6.youngling` | scene | 14 | grassland |
| `c6.mother` | scene | 12 | grassland |
| `c6.after` | scene | 11 | grassland |
| `c6.why` | scene | 14 | (continues the shot above) |
| `c6.join` | scene | 26 | (continues the shot above) |
| `c6.walk` | scene | 6 | grassland |
| `c6.camp` | scene | 9 | nightcamp |
| `c6.fire` | scene | 9 | (continues the shot above) |
| `c6.worth` | scene | 11 | (continues the shot above) |
| `c6.laugh` | scene | 9 | (continues the shot above) |
| `c6.sleep` | scene | 12 | (continues the shot above) |

### c7

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c7.fog` | scene | 5 | grassland |
| `c7.city` | scene | 8 | shadowcity |
| `c7.body` | scene | 10 | shadowcity |
| `c7.duel` | scene | 9 | shadowcity |
| `c7.judge` | scene | 12 | shadowcity |
| `c7.offer` | scene | 17 | (continues the shot above) |

### c8

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c8.road` | scene | 12 | road |
| `c8.market` | scene | 7 | road |
| `c8.alley` | scene | 9 | shadowcity |
| `c8.run` | scene | 8 | road |
| `c8.infirmary` | scene | 14 | tavern |
| `c8.heal` | scene | 20 | (continues the shot above) |
| `c8.talk` | scene | 16 | (continues the shot above) |
| `c8.healer` | scene | 21 | (continues the shot above) |
| `c8.join` | scene | 21 | (continues the shot above) |
| `c8.leave` | scene | 26 | (continues the shot above) |

### c9

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c9.farms` | scene | 15 | farmland |
| `c9.thuds` | scene | 8 | farmland |
| `c9.stranger` | scene | 14 | farmland |
| `c9.after` | scene | 14 | farmland |
| `c9.name` | scene | 17 | (continues the shot above) |
| `c9.nox` | scene | 13 | farmland |
| `c9.steel` | scene | 19 | (continues the shot above) |
| `c9.page` | scene | 11 | (continues the shot above) |

### c10

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c10.shadow` | scene | 7 | farmland |
| `c10.camp` | scene | 7 | nightcamp |
| `c10.road` | scene | 3 | grassland |
| `c10.spring` | scene | 5 | nightcamp |
| `c10.contract` | scene | 4 | nightcamp |
| `c10.night` | scene | 6 | nightcamp |
| `c10.after` | scene | 10 | nightcamp |
| `c10.dawn` | scene | 14 | nightcamp |
| `c10.thanks` | scene | 15 | grassland |
| `c10.angel` | scene | 47 | (continues the shot above) |

### c11

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c11.learn` | scene | 16 | grassland |
| `c11.hands` | scene | 10 | nightcamp |
| `c11.train` | scene | 17 | grassland |
| `c11.stream` | scene | 11 | road |
| `c11.lessons` | scene | 11 | road |
| `c11.frost` | scene | 3 | frosthall |
| `c11.doors` | scene | 6 | frosthall |

### c12

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c12.doors` | scene | 8 | frosthall |
| `c12.hall` | scene | 9 | frosthall |
| `c12.mist` | scene | 7 | frosthall |
| `c12.kael` | scene | 4 | frosthall |
| `c12.kael2` | scene | 6 | frosthall |
| `c12.braxen` | scene | 4 | frosthall |
| `c12.braxen2` | scene | 4 | frosthall |
| `c12.aerys` | scene | 3 | frosthall |
| `c12.aerys2` | scene | 13 | frosthall |
| `c12.aerys3` | scene | 2 | frosthall |
| `c12.eloryn` | scene | 4 | frosthall |
| `c12.eloryn2` | scene | 2 | frosthall |
| `c12.nox` | scene | 6 | frosthall |
| `c12.nox2` | scene | 6 | frosthall |
| `c12.eiryn` | scene | 2 | frosthall |
| `c12.end` | scene | 2 | frosthall |

### c13

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c13.enter` | scene | 27 | frosthall |
| `c13.stairs` | scene | 15 | frosthall |
| `c13.climb` | scene | 21 | frosthall |
| `c13.corridor` | scene | 7 | calamity |
| `c13.taunt` | scene | 13 | (continues the shot above) |
| `c13.climax1` | scene | 17 | calamity |
| `c13.climax2` | scene | 11 | calamity |
| `c13.climax3` | scene | 21 | calamity |
| `c13.sword` | scene | 22 | calamity |
| `c13.ramp` | scene | 22 | calamity |
| `c13.climb2` | scene | 24 | calamity |

### c14

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `c14.hall` | scene | 6 | offering |
| `c14.king` | scene | 28 | offering |
| `c14.wheels` | scene | 17 | offering |
| `c14.offering` | scene | 10 | offering |

### side

| Node | Type | Lines | Staged on |
|---|---|---|---|
| `hire.intro` | scene | 3 | tavern |
| `hire.done` | scene | 2 | (continues the shot above) |
| `toll.board` | scene | 3 | guildhall |
| `toll.bridge` | scene | 3 | ruins |
| `toll.after` | scene | 3 | ruins |
| `orchard.board` | scene | 3 | (continues the shot above) |
| `orchard.rows` | scene | 1 | farmland |
| `orchard.after` | scene | 3 | farmland |
| `warren.board` | scene | 4 | guildhall |
| `warren.after` | scene | 2 | cave |
| `yard.intro` | scene | 3 | yard |
| `yard.after` | scene | 1 | (continues the shot above) |
| `cart.board` | scene | 3 | guildhall |
| `cart.ditch` | scene | 3 | road |
| `cart.after` | scene | 3 | road |
| `stray.board` | scene | 5 | guildhall |
| `stray.after` | scene | 2 | clearing |
| `cross.ask` | scene | 5 | road |
| `cross.after` | scene | 2 | road |
| `deep.mouth` | scene | 3 | deep |
| `deep.rest` | choice |  | deep |
| `deep.end` | scene | 1 | deep |
