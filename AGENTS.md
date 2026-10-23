# Tower of Wishes — rules for development agents

Read first: [docs/DESIGN.md](docs/DESIGN.md), [docs/STORY.md](docs/STORY.md),
[docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).

## Project boundaries

- This is **Tower of Wishes**, a story-first cinematic RPG based on the author's own light
  novel manuscript. It is **completely separate from RIFTWORN**: never copy content,
  mechanics, code, names or assets between the two projects or repositories.
- The manuscript is the canon. Do not invent lore, character facts, power names or plot
  and present them as canon. New ideas go in DESIGN.md marked **Proposal** until the
  author approves them.
- **The campaign follows the 430-event inventory in order** (see Decided rules). Fights use the
  book's cast, weapons, targets and outcomes; fight dialogue is quoted from the book.
- The repository is private. Never commit secrets, purchase keys or copyrighted
  reference assets.

## Decided rules (change only with the author's say-so)

- **Talk before work.** Discuss findings and the plan with the author and wait for an explicit
  go before changing code. Audit the repository before claiming anything is implemented.
- **Story order and canon:** the 430-event inventory (`docs/source/MASTER_HANDOFF_2026-10-17.txt`,
  ids TW-001–TW-430) governs story sequence and canon status, ahead of the older manuscript.
  CANON = story fact (not "implemented"); GAME = game-approved; OPTION = needs approval;
  OPEN = undecided, never invent it. Progress per id is tracked in `docs/EVENTS.md`.
- The healer's name is **Eloryn** (the inventory's "Eleanor" is her).
- **Host control** (replaces pure watching): after the second Kael+Eiryn fight the player
  picks one hero to control (crown icon). The host gets a movement joystick, an auto-targeted
  basic attack and a special; dodge and parry stay automatic. The rest of the party is AI.
  **All Out** stays as a party command. Full auto is an option. Tap-to-follow stays.
- **Exploration:** story locations are walkable maps with a marked main objective and
  optional discoveries; the world map is an overview and fast-travel tool.
- **No hearts.** Losing a fight costs nothing: retry, or leave to change gear, loot or earn XP
  and come back. No story progress is ever lost.
- Cutscenes can be skipped (setting); skipping never skips rewards, flags or injuries.
- No speech bubbles anywhere: no boxes or tails; spoken lines float beside the speaker (below), or
  ambient "…" for murmurs.
- **Dialogue floats beside the speaker** (the author's pick, 2026-10-23, mockup B + tone; it replaces
  the film-subtitle bar): the line sits by the speaker's head, tied to them by a thin bar in their
  colour, their name above it; a shout is big, hot and shakes, a soft line small and fading; someone
  out of the shot speaks from low on the left. Letterbox bars stay; no typewriter; the controls appear
  on a tap. Filmed scenes play as one continuous take: a tap hurries the line (and the action), never
  cuts it off; the next line and its shot wait until the current action has played.
- **No narrator** (the author, 2026-10-23): the book's narration is shown, not read. A narrated line
  becomes a silent beat (`X(note)` in js/story.js keeps what happens, for staging) and its shot plays it;
  jumps in time or place are short title cards. When something matters but can't be shown and nobody
  says it in the book, ask the author per scene. Lines written for the game are `P(...)` (Proposals).
  Adapted so far: the prologue and Chapter One; later chapters still show their narration under the
  picture until they are adapted, chapter by chapter, with the author.
- **Spare dialogue** (the author, 2026-10-23: "cleaner and simple"): keep only the lines that need a
  voice; everything else is shown. Before the first fight there are six spoken lines in all (the
  seller's promise; "Too slow." / "I wanted the hug."; "I already have everything I could ever wish
  for."; the storyteller's first line; "Keep your hands off me."). Cut lines go, with their shots.
- **Fight HUD: the clean style** (the author's pick, 2026-10-22, mockup A): portrait chips top left,
  foes left as pips at the top centre (or the boss bar), round speed/pause, a round All Out gauge.
- **Music:** fights play "Heartfelt Battle" (OpenGameArt, CC0; assets/music/). New tracks must be
  CC0 or properly credited in Settings → Credits. Cues wait for tracks in js/audio.js (title, town,
  story, tension, boss → battle); fight sounds and ambience loops are synthesised by
  `tools/make_sfx.py` (assets/sfx/fight, assets/sfx/amb).
- **Filmed scenes render at pixel resolution** (a 200 px tall buffer scaled up without smoothing) so
  the sets, light and effects share the characters' pixel grid. Held poses (kneel, lie, collapse,
  reach, cast, flinch, brace) are frames of the creator's clips; it has no sit/kneel/talk clips.
- **Art style: pixel art** from the itch.io "Character Creator 2D Fantasy" (decided 2026-10-22).
  The author builds each character in the creator and sends its export (30 clips × 8 directions).
  The sources live in `art_source/characters/<set>/`, untouched; `tools/pack_pixel.py` packs them
  into `assets/pixel/`. Never redesign a character the author has delivered; no placeholder art.
- **Eiryn's official look** is the creator's `eiryn` set (caster) and `eiryn_branch` (the bandit
  fight). The earlier anime sprite in `assets/characters/eiryn/` is retired (kept for portraits).
- **Arenas and scene backgrounds stay painted** (the author, 2026-10-22): the tileset arenas and the
  scene-camera limits were tried and rolled back. Characters and power effects stay pixel art.
- **World map: the illustrated parchment map** (option B, the author, 2026-10-22): ink and watercolour,
  one road west to east, the Tower on the eastern edge. The pixel overworld (option A) was rejected.
- **Camera** (the author, 2026-10-22): **fights** use the helicopter view, high above and a little to
  the side at one fixed angle (`V.HELI` in core.js). **Story scenes and the match face-off are shot at
  ground level**, eye height, first-person feel (`GROUND` in stage.js; shots may be marked `high` to
  look down, as in the rooftop chase), with the far background softened in mist.
- **Filmed scenes** (the author, 2026-10-22: "start fresh in cinematics"): story scenes are being moved,
  node by node, from the staged fight-arena cutscenes to the cinema (`js/render/cinema.js`): a real 3D
  camera (yaw, pitch, first-person shots through a character's eyes) in built sets of solid houses and
  roofs, with the pixel cast as actors. A node with an entry in `window.TowCinema` (js/cinema/*.js) is
  filmed; every other node keeps its staged scene. Filmed so far: the opening `p.lore` (the world before: the
  market, the lamps, the climbers at the Tower's gate, the title over the roofs), the prologue's `p.roof` (the rooftop
  chase and the catch), `p.tower`, `p.climb` and `p.light` (the climber's whole fight, a cutscene, not
  an auto-battle), `p.overlook` (the Tower talk), the unlinked `p.evening`, and Chapter One's tavern and
  street (`c1.tavern`, `c1.formation`, `c1.go`, `c1.street`, `c1.clip`, `c1.look`).
- **The opening** (the author, 2026-10-23): the world before (`p.lore`, filmed; the old vector opening is gone;
  a fruit seller tells a child the promise) → the rooftop chase → the climber's fight → Eiryn and Alric looking at
  the Tower → the light → the Reset → THE RESET card → the legend told by a fire, with filmed memories
  (`p.legend`) → 150 years later. No street walk, no names for the climber, the thing
  or the final move. The prologue has no battle; the guided tutorial is Kael's bandit fight (`c1.fight`).
- **The menu** (the author, 2026-10-23): a left column (logo top left, the menu as a list, the team as chips
  bottom right) over a campfire at night, filmed (`js/cinema/camp.js`): each hero does what fits them (Kael
  drills at a post, Eiryn casts, Eloryn tends, Braxen sits by the fire, Aerys keeps watch, Nox crouches in
  the tree); heroes not met yet are shadows.
- **The JavaScript game is the live build** (decided 2026-10-22): it plays on iPhone and PC from the
  published link. The Godot migration plan is shelved; a Godot iPhone build needs a Mac and Xcode.
- **Goblins are skeleton raiders and the Ogre is a skeleton warlord** (the author, 2026-10-22): the
  on-screen names and story text say so; internal keys (`goblin`, `ogre`) are unchanged.
- Landscape only.
- Heavy arts are cutscenes. Normal specials keep the standard battle camera.
- Protected: the prologue's painted skyfire-and-flood Reset shot and other approved cinematics.
- Restore point before the handoff work: branch `restore/pre-master-handoff`.

## Code layout

| File | Role |
|---|---|
| `index.html` | Page, styles, menus and HUD markup |
| `js/sim.js` | Fight simulation: pure logic, no DOM. Runs in Node for tests |
| `js/render/core.js` | Canvas, camera, projection, frame order; shared view `V` |
| `js/render/world.js` | Ground, trees, rocks, trunk, atmosphere |
| `js/render/fighters.js` | Character bodies, hair, cloth, poses |
| `js/render/fx.js` | Telegraphs, slashes, particles, banners, heavy-art cutscenes |
| `js/render/callouts.js` | Over-head bars, reaction icons, speech balloons |
| `js/render/intro.js` | Face-off cards, VS, countdown |
| `js/book/*.js` | The book's chapters (nodes, staged scenes, foes); `pro.js` stages the prologue and the early side scenes |
| `js/render/director.js` | Camera cuts, slow motion, cut-in panels during fights |
| `js/grade.js` | Fight ranks S–D from a finished match. Pure |
| `js/sprites.js`, `assets/pixel/`, `art_source/` | Sprite characters: the pixel cast (which set draws which character, clip mapping, hit frames), packed atlases, the creator's source sheets; `tools/pack_pixel.py` repacks (docs/SPRITES.md) |
| `js/render/spirit.js`, `js/render/itemart.js` | The spirit-tree skill screen; drawn icons for every item |
| `js/progress.js` | Injuries after story fights (no hearts): pure functions |
| `js/story.js` | Story campaign: chapter graph, side episodes, choices, team experience. Pure data + functions |
| `js/campaign.js` | World map: lands, routes, unlock rules. Pure |
| `js/progression.js` | Gear, inventory, loot tables, skill trees → per-fighter fight modifiers. Pure |
| `js/stages.js`, `js/render/stage.js` | Staged story scenes: fighters acting out dialogue on real arenas |
| `js/render/cinema.js`, `js/cinema/*.js` | The cinema: filmed story scenes (3D camera with yaw, pitch and first-person shots; solid painted sets; pixel actors; pack effects). `sets.js` (the square, the rooftops and overlook, and the shared kit), `ashgate.js` (the tavern, the street, the formation), `gate.js` (the Tower's gate), `summit.js` (the Tower's last floor above the clouds) and `camp.js` (the menu's campfire, with its scene; as a hearth among ruins for the legend) build the places; a film may move between places (`place`); `prologue.js`, `climber.js`, `legend.js` and `c1.js` hold the shot lists per node, one entry per dialogue line |
| `js/render/overworld.js`, `js/render/inkmap.js` | The world map: layout, stops (wax seals), ink labels, the pin at the current chapter; `inkmap.js` draws the land as an illustrated parchment map (option B, the author's pick 2026-10-22). Without `inkmap.js` it falls back to the pixel overworld (option A, rejected) |
| `js/render/map.js` | The painted world map (option B; drop the overworld script tag in `index.html` to use it) |
| `js/render/backdrop.js` | Painted full-screen backgrounds for story scenes |
| `js/main.js` | Loop, input, HUD, save, story screens (scenes, choices, select, chapters) |
| `test/` | Node tests and a headless-browser check |

Keep `sim.js`, `progress.js`, `story.js`, `campaign.js` and `progression.js` free of DOM access so they stay testable.

## Before every commit

```sh
node test/progress-test.js        # injury rules (no hearts)
node test/sim-test.js 200         # balance + invariants (no NaN, no wall clipping, no timeouts)
node test/scenario-test.js 30     # every campaign battle with each starter
node test/story-test.js 6         # walks every branch of the campaign and plays its battles
node test/side-test.js 12         # side missions, dungeon rooms, yard, arcade waves
node test/progression-test.js     # gear, loot and skill rules
node test/book-test.js 20         # the book's road and Tower fights
node test/stage-test.js           # every scene is a staged cutscene (no painted stills)
node test/cinema-test.js          # filmed scenes: one beat per line, known cast and sets, leaps land on roofs
node test/grade-test.js           # fight ranks (wins only)
node test/replay-test.js          # a replayed fight (same seed, same All Out moments) is identical
node test/sprites-test.js         # sprite manifests, base PNGs, directions, frames, crossfades
node test/ogre-test.js 40          # the Ogre fights back: swing cadence, stagger cap, 60%/35% beats, dies on screen
NODE_PATH=$(npm root -g) node test/scene-shots.js /tmp/scenes c1.tavern c1.drop   # screenshots of staged scenes, line by line
NODE_PATH=$(npm root -g) node test/browser-check.js /tmp/shots   # needs Playwright; screenshots + console errors
NODE_PATH=$(npm root -g) node test/story-browser.js /tmp/story-shots   # plays the whole story in the browser
```

- Report win rates and fight length when you change balance. Current targets: 65–80 %
  win without All Out for the Chapter One fight (Kael alone, `clearingKael`), a clear gain from well-timed All Out,
  zero timeouts.
- Look at the screenshots. Report exactly what was and wasn't tested (e.g. not tested on
  a real phone).
- Make small, reviewable commits.
