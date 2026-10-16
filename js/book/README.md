# js/book — the manuscript's chapters, one file each

Every chapter of the campaign after the quarry is one UMD module here. `js/story.js`
loads them (nodes, speakers, sim extras) and `js/stages.js` takes their staged scenes;
`js/render/fighters.js` takes their extra looks. In the browser they load before
`story.js` (script tags in `index.html`); in Node `story.js` requires them.

## The bar

**Every scene of the book becomes a scene the player watches.** The reference is the
tavern in Chapter One (`c1Tavern`, `c1Formation`, `c1Run` in `js/stages.js`): real
fighters on a real arena, blocked beat by beat with the dialogue, camera cuts, gestures,
walks, props, weather and light. A chapter is not done while any of its scenes is text
over a painted backdrop. "I want to see the people doing the things in the dialogue."

- **The book is canon.** Dialogue is quoted with `B()` exactly as written. Narration
  (`N()`) condenses the book's prose; keep its images and order. Do not invent lore,
  names, powers or plot; anything new is `S()` and a Proposal.
- **Don't skip scenes.** Walk the chapter text start to end; each change of place, time
  or beat is its own `scene` node (6–14 lines). A 1,500-word chapter is 6–10 nodes,
  not 2.
- **Fight where the book fights.** Every action beat is a `battle` node with a scenario
  (party vs the book's foes, in the book's arena) and an `outro` line. Duels, ambushes,
  a creature at camp, a test of strength: all fights.
- **Cutscene beats.** Heavy-art moments the book describes (a spear of light through a
  throat, Eiryn erasing a knight) can be staged beats with `cutin`, `shake`, `fade`,
  `light`, slow motion — see `js/render/stage.js` for the action vocabulary.

## Module shape

```js
(function (root, factory) { /* UMD: module.exports or root.TowBook[api.id] */ })(..., function () {
  return {
    id: 'c7',
    speakers: { nox: { name: 'Nox', tone: 'foe' } },          // merged into story SPEAKERS
    nodes(h) {                                                 // h = { B, S, N, only, member, bookParty, BOOK }
      const { B, S, N, member, BOOK } = h;
      return { 'c7.city': { type: 'scene', chapter: 'c7', bg: 'town', next: 'c7.nox', lines: [ ... ] }, ... };
    },
    stages: { 'c7.city': { arena: 'shadowcity', cast: [...], beats: [...] }, 'c7.nox': 'same' },
    defs: { keeper: { name: 'The innkeeper', team: 'hero', noncombat: true, ... } },  // extra Sim.DEFS
    scenarios: { alley: { ... } },                             // extra Sim.SCENARIOS
    looks: { keeper: { ... } },                                // extra fighters.js LOOK entries
  };
});
```

Node types and fields are documented at the top of `js/story.js`. Battles use
`party: (st) => BOOK(st)` (the book's party at this chapter: Kael, Eiryn, then Aerys
from c7, Eloryn from c9, Braxen from c10, Nox from c11) and `allyLevel: true`; a fight
for one hero is `party: (st) => [member(st, 'nox')]`. Fixed book characters in a
scenario are `{ key, x, y, f, hpFrac }` units, not slots.

## Ids and links

Chapter `cN` owns every node id `cN.*`. The first node of each chapter is fixed (the
campaign map and chapter gates point at it) and the last node links to the next
chapter's first node:

| Chapter | Book | First node | Links on to |
|---|---|---|---|
| c6 The Sky That Hunts | Two, Three | `c6.road` | `c7.city` |
| c7 The Shadow City | Four | `c7.city` | `c8.road` |
| c8 The Road That Bleeds | Five | `c8.road` | `c9.farms` |
| c9 A Name on a Page | Six, Seven | `c9.farms` | `c10.shadow` |
| c10 The Night Creature | Eight, Nine | `c10.shadow` | `c11.frost` |
| c11 The Tower Draws Near | Ten, Eleven | `c11.frost` | `c12.doors` |
| c12 Floor One | Twelve | `c12.doors` | `c13.enter` |
| c13 Floor Two | Thirteen, Fourteen, Fifteen | `c13.enter` | `c14.hall` |
| c14 Floor Three | Sixteen | `c14.hall` | `end` |

## Arenas, fighters, looks

Arenas (`Sim.ARENAS`, painted in `js/render/world.js`): clearing, road, town, tavern,
guild, yard, hill, cave, deep, ruins, summit, grassland, shadowcity, farmland, nightcamp,
frosthall, calamity, offering. Use the one that fits; don't add arenas (world.js is
shared).

Fighters (`Sim.DEFS`): heroes kael, eiryn (Chapter One guest), eirynAsh (the book's
Eiryn), aerys, nox, eloryn, braxen; foes skyreaver, ruinBeast, nightCreature, the six
knights (knightSword, knightFist, knightSpear, knightTwin, knightAxe, knightMaster),
calamity, thug, knife, beast, golem, goblins; town folk spearwoman, cook, patron
(`noncombat: true`). A new non-fighting character (an innkeeper, the healer's patient,
Altheryx) goes in `defs` with `noncombat: true`, copying `patron`'s shape, and gets a
`looks` entry copying a LOOK in `fighters.js` (hair, skin, cloth colours, build).

## Tests (run before reporting)

```sh
node test/story-test.js 6          # every node links, every battle plays
node test/book-test.js 20          # add a case per new scenario
NODE_PATH=$(npm root -g) PORT=<unique> node test/browser-check.js /tmp/<yours>
NODE_PATH=$(npm root -g) PORT=<unique> node test/story-browser.js /tmp/<yours>   # plays the whole story
```

Also screenshot every one of your staged scenes (`window.__tow.debug.storyGo('c7.city')`
in a Playwright page, tap through, screenshot each line) and look at them. Report win
rates for new fights (target 65–80 %), what you looked at, and what you did not test.
