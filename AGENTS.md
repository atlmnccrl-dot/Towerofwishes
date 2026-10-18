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
- No speech bubbles anywhere: subtitles, or ambient "…" for murmurs.
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
| `js/render/spirit.js`, `js/render/itemart.js` | The spirit-tree skill screen; drawn icons for every item |
| `js/progress.js` | Hearts and injuries: pure functions |
| `js/story.js` | Story campaign: chapter graph, side episodes, choices, team experience. Pure data + functions |
| `js/campaign.js` | World map: lands, routes, unlock rules. Pure |
| `js/progression.js` | Gear, inventory, loot tables, skill trees → per-fighter fight modifiers. Pure |
| `js/stages.js`, `js/render/stage.js` | Staged story scenes: fighters acting out dialogue on real arenas |
| `js/render/map.js` | Painted world map with fog over unrevealed lands |
| `js/render/backdrop.js` | Painted full-screen backgrounds for story scenes |
| `js/main.js` | Loop, input, HUD, save, story screens (scenes, choices, select, chapters) |
| `test/` | Node tests and a headless-browser check |

Keep `sim.js`, `progress.js`, `story.js`, `campaign.js` and `progression.js` free of DOM access so they stay testable.

## Before every commit

```sh
node test/progress-test.js        # heart and injury rules
node test/sim-test.js 200         # balance + invariants (no NaN, no wall clipping, no timeouts)
node test/scenario-test.js 30     # every campaign battle with each starter
node test/story-test.js 6         # walks every branch of the campaign and plays its battles
node test/side-test.js 12         # side missions, dungeon rooms, yard, arcade waves
node test/progression-test.js     # gear, loot and skill rules
node test/book-test.js 20         # the book's road and Tower fights
node test/stage-test.js           # every scene is a staged cutscene (no painted stills)
node test/grade-test.js           # fight ranks (wins only)
node test/replay-test.js          # a replayed fight (same seed, same All Out moments) is identical
NODE_PATH=$(npm root -g) node test/browser-check.js /tmp/shots   # needs Playwright; screenshots + console errors
NODE_PATH=$(npm root -g) node test/story-browser.js /tmp/story-shots   # plays the whole story in the browser
```

- Report win rates and fight length when you change balance. Current targets: 65–80 %
  win without All Out for the Chapter One fight (Kael alone, `clearingKael`), a clear gain from well-timed All Out,
  zero timeouts.
- Look at the screenshots. Report exactly what was and wasn't tested (e.g. not tested on
  a real phone).
- Make small, reviewable commits.
