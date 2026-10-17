# Tower of Wishes — rules for development agents

Read first: [docs/DESIGN.md](docs/DESIGN.md), [docs/STORY.md](docs/STORY.md),
[docs/ART_DIRECTION.md](docs/ART_DIRECTION.md).

## Project boundaries

- This is **Tower of Wishes**, a spectator-tactics RPG based on the author's own light
  novel manuscript. It is **completely separate from RIFTWORN**: never copy content,
  mechanics, code, names or assets between the two projects or repositories.
- The manuscript is the canon. Do not invent lore, character facts, power names or plot
  and present them as canon. New ideas go in DESIGN.md marked **Proposal** until the
  author approves them.
- **The campaign follows the manuscript's plot in order** (docs/STORY.md). Fights use the
  book's cast, weapons, targets and outcomes; fight dialogue is quoted from the book.
- The repository is private. Never commit secrets, purchase keys or copyrighted
  reference assets.

## Decided rules (change only with the author's say-so)

- Pure watching; the in-fight inputs are **All Out** (a few uses per match, set per
  chapter: it burns every hero's stamina and ability power into attacks, and a hero who
  runs dry can't dodge, block or parry until stamina recovers), **Withdraw**, and
  tap-to-follow (camera locks onto one of your fighters).
- Landscape only.
- Heavy arts are cutscenes.
- Hearts: max 5, one per 8 minutes, lose one only when the whole team falls in a story
  match; wins fully heal; withdrawing costs no heart and leaves the team injured, healing
  faster than a heart refills. Free modes never use hearts. Implemented in `js/progress.js`.

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
