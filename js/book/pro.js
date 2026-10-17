/*
 * Tower of Wishes — the prologue's staged scenes: the square at evening, the
 * rooftops, the Reset, the fireside tale, the dawn 150 years later. Staging only
 * (the nodes and dialogue live in js/story.js); see js/book/README.md.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.TowBook = root.TowBook || {})[api.id] = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PI = Math.PI, E = 0, S = PI / 2, W = PI, N = -PI / 2;
  const auto = (arena, cast, a) => ({ arena, cast, auto: Object.assign({}, a) });
  const AL = (x, y, f, o) => Object.assign({ id: 'alric', key: 'alric', x, y, f }, o);
  const EI = (x, y, f, o) => Object.assign({ id: 'eiryn', key: 'eiryn', x, y, f }, o);
  const PT = (id, x, y, f, o) => Object.assign({ id, key: 'patron', x, y, f }, o);
  const stroll = (id, a, b, every) => ({ at: 0, who: id, to: a, speed: 0.55 });

  const K = (x, y, f, o) => Object.assign({ id: 'kael', key: 'kael', x, y, f }, o);
  const EA = (x, y, f, o) => Object.assign({ id: 'eiryn', key: 'eirynAsh', x, y, f }, o);
  const AE = (x, y, f, o) => Object.assign({ id: 'aerys', key: 'aerys', x, y, f }, o);
  const CP = (x, y, f, o) => Object.assign({ id: '@', key: '@', x, y, f }, o);
  const NP = (id, key, x, y, f, o) => Object.assign({ id, key, x, y, f }, o);
  const guest = (name, epithet) => ({ name, team: 'hero', r: 0.36, hp: 100, sta: 100, speed: 3.8, guest: true, react: 0.3, read: 0.3, parry: 0, dodge: 0, feint: 0, noncombat: true, attack: null, barks: {}, intro: { epithet, line: null } });

  return {
    id: 'pro',
    defs: {
      officer: guest('Older guard', 'Ashgate'), registrar: guest('Registrar', 'Guild'), evaluator: guest('Evaluator', 'Guild'), miller: guest('The miller', 'Mill'),
    },
    looks: {
      officer: { h: 1.04, w: 1.12, build: 1.12, weapon: 'none', hair: 'helm', skin: ['#d4a07e', '#8e6450'], hairC: ['#6a6a70', '#34343a'], body: ['#4a5560', '#242a30'], armor: ['#5c6672', '#2c323a'], pauldron: 'L', legs: ['#2e3238', '#16181c'], boots: ['#2a2420', '#14100e'], accent: '#c8a860', eye: '#4a4034', belt: '#2a1e16', coat: ['#3a4452', '#1c222a'], coatLen: 0.3 },
      registrar: { h: 0.96, w: 0.92, build: 0.92, weapon: 'none', hair: 'short', skin: ['#e6c4aa', '#a67e70'], hairC: ['#8a8a8e', '#4a4a50'], body: ['#3a4a5a', '#1c2430'], legs: ['#2a2e36', '#14161a'], boots: ['#2a2420', '#14100e'], accent: '#c8a860', eye: '#4a4a52', belt: '#2a1e16', coat: ['#2a3a52', '#141c2a'], coatLen: 0.4, prop: 'notes' },
      evaluator: { h: 1.0, w: 0.96, build: 0.98, weapon: 'none', hair: 'bob', skin: ['#d8b08e', '#946e58'], hairC: ['#2a2430', '#100c14'], body: ['#4a3a54', '#241c2a'], legs: ['#2a262e', '#141216'], boots: ['#2a2420', '#14100e'], accent: '#a98bff', eye: '#3a3040', belt: '#2a1e16', coat: ['#3a2c4a', '#1c1426'], coatLen: 0.35 },
      miller: { h: 0.98, w: 1.2, build: 1.2, weapon: 'none', hair: 'bald', beard: ['#c8c0b0', '#7a7468'], skin: ['#e0b896', '#9a6e58'], hat: { c: ['#8a7a5a', '#4a4030'], brim: 1.2 }, body: ['#a89c84', '#5a5242'], apron: ['#e0d8c4', '#8a8270'], legs: ['#4a4036', '#241e18'], boots: ['#3a2a1e', '#1c130c'], accent: '#c8c0b0', eye: '#4a3a2a', belt: '#5a4a36' },
    },
    scenarios: {
      // Fork encounters (Proposals): what waits on the way you did not scout.
      forkMarsh: {
        chapter: 'Chapter Five', title: 'The Flooded Track', arena: 'hillpath', allOutUses: 1, vs: 'goblin', scale: { hp: 2.0, dmg: 1.8 },
        units: [
          { slot: 0, x: -7.2, y: 0.2, f: 0 }, { slot: 1, x: -8.0, y: -1.4, f: 0 }, { slot: 2, x: -8.2, y: 1.6, f: 0 },
          { key: 'goblin', x: 1.8, y: -1.0, f: 3.1 }, { key: 'goblin', x: 2.6, y: 1.4, f: 3.1 }, { key: 'goblin', x: 3.4, y: 0.2, f: 3.1 }, { key: 'goblinArcher', x: 6.5, y: 1.4, f: 3.1 },
        ],
      },
      forkRuins: {
        chapter: 'Chapter Two', title: 'Under the Arches', arena: 'ruins', allOutUses: 1, vs: 'beast', scale: { hp: 0.8, dmg: 0.9 },
        units: [
          { slot: 0, x: -7.4, y: 0.4, f: 0 }, { slot: 1, x: -8.0, y: -1.4, f: 0 }, { slot: 2, x: -8.2, y: 1.8, f: 0 },
          { key: 'beast', x: 3.6, y: -1.6, f: 3.1 }, { key: 'beast', x: 4.6, y: 1.8, f: 3.1 },
        ],
      },
    },
    nodes(h) {
      const { B, N, S, BOOK, member } = h;
      const pair = (st) => [member(st, 'kael'), member(st, 'eirynMage')];
      return {
        // ---- a fork in the road: Chapter Five, up the quarry hill. Both ways reach the quarry path.
        'c5.fork': {
          type: 'fork', chapter: 'c5', bg: 'hill',
          lines: [
            N('Halfway up the second hill the road divides round marshy ground.'),
            N('To the left, the shorter track runs straight into standing water. A lantern hangs from a post at the edge of it, unlit.'),
            N('To the right, the dry way climbs the ridge and loses itself in thorn. Somewhere up there, a crow stops calling.'),
            N('Kael looks at Eiryn. Eiryn looks at the Tower.'),
          ],
          options: [{ label: 'The flooded track', next: 'c5.fork.a' }, { label: 'The ridge', next: 'c5.fork.b' }],
        },
        'c5.fork.a': {
          type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.fork.afight',
          lines: [
            N('The water is shin-deep and warmer than it should be. Halfway across, Kael stops. The reeds ahead are the wrong kind of still.'),
            S('kael', 'Eiryn. Behind me.'),
            N('Three goblins rise out of the reeds with sacks of stolen grain still tied to their belts. A fourth, with a bow, is already on the far bank.'),
          ],
        },
        'c5.fork.afight': {
          type: 'battle', chapter: 'c5', scenario: 'forkMarsh', hearts: false, xp: 90, loot: 'ember',
          party: pair, win: 'c5.fork.aafter',
          outro: 'The last goblin drops its sack and wades away into the reeds.',
        },
        'c5.fork.aafter': {
          type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.path',
          lines: [
            N('They wring out their boots on the far bank. The track was shorter. Nobody says it was better.'),
            N('Up ahead, a goblin squats by a stolen sack. It has not heard them coming. It will.'),
          ],
        },
        'c5.fork.b': {
          type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.fork.bafter',
          lines: [
            N('The ridge path is dry, steep and thick with thorn. Kael goes first, cutting through, and Eiryn follows without complaint.'),
            N('At the top there is a hunter\u2019s lean-to, long abandoned, and in it a stack of stolen tools wrapped in sacking. Someone has been sorting them. Carefully.'),
            S('kael', 'That isn\u2019t goblin work.'),
            S('eiryn', 'No.'),
          ],
        },
        'c5.fork.bafter': {
          type: 'scene', chapter: 'c5', bg: 'hill', next: 'c5.path', xp: 70, set: { gold: 1 },
          lines: [
            N('Below them the quarry path lies empty. Whatever is waiting there has not noticed the ridge. They take the tools, and the high ground.'),
          ],
        },
        // ---- a fork in the road: Chapter Two, the viaduct. Both ways reach the camp.
        'c6.fork': {
          type: 'fork', chapter: 'c6', bg: 'road',
          lines: [
            N('The road splits where an old viaduct once crossed it. One arm goes under the broken arches; the other climbs onto an open ridge.'),
            N('Under the arches the air is cool and smells of wet stone. Somewhere in the dark, something drips, steadily.'),
            N('On the ridge the wind is clean and the grass lies flat as a hand. Nothing has crossed it today. Aerys looks up anyway.'),
            N('Nobody says which way. They all look at Kael, who does not like being looked at.'),
          ],
          options: [{ label: 'Under the arches', next: 'c6.fork.a' }, { label: 'Along the ridge', next: 'c6.fork.b' }],
        },
        'c6.fork.a': {
          type: 'scene', chapter: 'c6', bg: 'ruins', next: 'c6.fork.afight',
          lines: [
            N('The dark under the arches is complete. Aerys lifts one palm. A small light blooms in it, and the stone fills with eyes.'),
            S('aerys', 'I thought they were stones.'),
            S('kael', 'So did they.'),
          ],
        },
        'c6.fork.afight': {
          type: 'battle', chapter: 'c6', scenario: 'forkRuins', hearts: false, xp: 110, allyLevel: true, loot: 'frost',
          party: (st) => BOOK(st), win: 'c6.fork.aafter',
          outro: 'The last of them backs into the dark and keeps going.',
        },
        'c6.fork.aafter': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.camp',
          lines: [N('They climb out the far side into the evening with torn sleeves and a new respect for Aerys\u2019s palm. The camp is not far.')],
        },
        'c6.fork.b': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.fork.bafter',
          lines: [
            N('On the ridge there is nowhere to hide, so they walk fast and keep low. Nothing comes. That is somehow worse.'),
            N('At the highest point stands a cairn of flat stones, each one scratched with a name. Eiryn stops. She puts two fingers on the topmost stone. It is warm.'),
            S('aerys', 'Who are they?'),
            S('eiryn', 'People who were on this road.'),
          ],
        },
        'c6.fork.bafter': {
          type: 'scene', chapter: 'c6', bg: 'road', next: 'c6.camp', xp: 90, set: { gold: 1 },
          lines: [N('Kael does not ask what she is not saying. They leave the stones as they found them, and go down toward the camp.')],
        },
      };
    },
    stages: {
      // ---- forks: the party stops, the camera shows each way, then the picker
      'c5.fork': {
        arena: 'hillpath',
        cast: [K(-0.4, 3.2, N, { armed: true }), EA(0.8, 3.6, N), NP('peek', 'goblinArcher', -9, -5, S, { hidden: true })],
        cam: { x: 0, y: 1, view: 10, ang: 0, pitch: 0.42 },
        beats: [
          { cam: { x: 0, y: 1.6, view: 9, ang: 0, pitch: 0.42, push: -0.15, ease: 2 }, do: [{ who: 'kael', to: [-0.4, 1.8], speed: 0.8, face: N }, { who: 'eiryn', to: [0.8, 2.3], speed: 0.8, face: N }] },
          { cam: { x: -6.4, y: -3.4, view: 6.5, ang: -0.35, pitch: 0.34, up: 0.6, drift: -0.02, ease: 2.2 }, do: [{ light: ['70,140,190', 0.18, 1.0] }, { at: 1.4, who: 'peek', show: true, put: [-8.6, -4.6] }, { at: 1.9, who: 'peek', hide: true }] },
          { cam: { x: 6.4, y: -3.4, view: 6.5, ang: 0.35, pitch: 0.34, up: 0.6, drift: 0.02, ease: 2.2 }, do: [{ light: ['255,170,100', 0.16, 1.0] }] },
          { cam: { focus: ['kael', 'eiryn'], view: 4.2, ang: 0, pitch: 0.4, up: 0.8, ease: 1.8 }, do: [{ light: [null, 0, 1.5] }, { who: 'kael', face: 'eiryn' }, { who: 'eiryn', face: N }] },
        ],
      },
      'c5.fork.a': auto('hillpath', [K(-5.6, 1.0, 0), EA(-6.8, 0.4, 0), NP('g1', 'goblin', 4.0, -2.4, W, { hidden: true }), NP('g2', 'goblin', 5.0, 2.0, W, { hidden: true }), NP('g3', 'goblin', 6.4, -0.4, W, { hidden: true })], {
        nodes: { 'c5.fork.a': {
          0: { cam: { x: -1, y: 0.6, view: 8.5, ang: -0.3, pitch: 0.42, ease: 1.6 }, do: [{ who: 'kael', to: [-1.4, 1.0], speed: 0.6 }, { who: 'eiryn', to: [-2.6, 0.4], speed: 0.6 }] },
          2: { cam: { x: 2.5, y: 0, view: 9, ang: -0.2, pitch: 0.38, ease: 0.8 }, do: [{ who: 'g1', show: true, blink: [3.0, -1.8] }, { at: 0.2, who: 'g2', show: true, blink: [3.6, 1.8] }, { at: 0.4, who: 'g3', show: true, blink: [4.4, 0] }, { at: 0.5, who: 'kael', icon: '!' }, { shake: 4 }] },
        } },
      }),
      'c5.fork.aafter': auto('hillpath', [K(-1.0, 0.8, 0.3), EA(-2.4, 1.4, 0.2)], { nodes: { 'c5.fork.aafter': { 0: { cam: { x: -1.6, y: 0.6, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } } }),
      'c5.fork.b': auto('hillpath', [K(-6.0, 1.6, 0), EA(-7.2, 1.0, 0)], {
        nodes: { 'c5.fork.b': {
          0: { cam: { focus: ['kael', 'eiryn'], view: 8, ang: -0.5, pitch: 0.42, ease: 1.4 }, do: [{ who: 'kael', to: [-1.0, -0.6], speed: 0.8 }, { who: 'eiryn', to: [-2.2, 0.0], speed: 0.8 }] },
          1: { cam: { x: 1.6, y: -1.6, view: 5.2, ang: 0.3, pitch: 0.4, up: 0.4, ease: 1.4 } },
        } },
      }),
      'c5.fork.bafter': 'same',
      'c6.fork': {
        arena: 'ruins',
        cast: [K(-0.4, 3.0, N, { armed: true }), EA(0.8, 3.4, N), AE(-1.6, 3.4, N), NP('peek', 'beast', -9, -5, S, { hidden: true })],
        cam: { x: 0, y: 1, view: 10, ang: 0, pitch: 0.42 },
        beats: [
          { cam: { x: 0, y: 1.6, view: 9, ang: 0, pitch: 0.42, push: -0.15, ease: 2 }, do: [{ who: 'kael', to: [-0.4, 1.8], speed: 0.8, face: N }, { who: 'eiryn', to: [0.8, 2.3], speed: 0.8, face: N }, { who: 'aerys', to: [-1.6, 2.3], speed: 0.8, face: N }] },
          { cam: { x: -6, y: -3, view: 6.5, ang: -0.35, pitch: 0.32, up: 0.5, drift: -0.02, ease: 2.2 }, do: [{ light: ['60,70,110', 0.22, 1.0] }, { at: 1.5, who: 'peek', show: true, put: [-8.8, -4.4] }, { at: 1.9, who: 'peek', hide: true }] },
          { cam: { x: 6.4, y: -3.4, view: 7, ang: 0.35, pitch: 0.3, up: 1.4, drift: 0.02, ease: 2.2 }, do: [{ light: ['255,230,170', 0.14, 1.0] }, { at: 1.2, who: 'aerys', face: [0, -9], icon: '…' }] },
          { cam: { focus: ['kael', 'eiryn', 'aerys'], view: 4.6, ang: 0, pitch: 0.4, up: 0.8, ease: 1.8 }, do: [{ light: [null, 0, 1.5] }, { who: 'kael', face: 'eiryn' }] },
        ],
      },
      'c6.fork.a': auto('ruins', [K(-5.6, 1.0, 0), EA(-6.8, 0.4, 0), AE(-6.8, 1.8, 0), NP('b1', 'beast', 4.0, -2.4, W, { hidden: true }), NP('b2', 'beast', 5.0, 2.0, W, { hidden: true })], {
        nodes: { 'c6.fork.a': {
          0: { cam: { x: -1, y: 0.6, view: 8.5, ang: -0.3, pitch: 0.42, ease: 1.6 }, do: [{ who: 'kael', to: [-1.4, 1.0], speed: 0.6 }, { who: 'eiryn', to: [-2.6, 0.4], speed: 0.6 }, { who: 'aerys', to: [-2.6, 1.8], speed: 0.6 }] },
          1: { cam: { focus: 'aerys', view: 3.6, ang: 0.3, pitch: 0.38, up: 0.9, ease: 1.0 }, do: [{ who: 'aerys', set: { gest: 'cast' } }, { light: ['255,236,170', 0.12, 1.5] }, { at: 1.0, who: 'b1', show: true, blink: [3.0, -1.0] }, { at: 1.2, who: 'b2', show: true, blink: [3.4, 1.6] }] },
        } },
      }),
      'c6.fork.aafter': auto('road', [K(-1.0, 0.8, 0.3), EA(-2.4, 1.4, 0.2), AE(-2.4, 0.2, 0.3)], { nodes: { 'c6.fork.aafter': { 0: { cam: { x: -1.6, y: 0.6, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } } }),
      'c6.fork.b': auto('grassland', [K(-6.0, 1.6, 0), EA(-7.2, 1.0, 0), AE(-7.2, 2.2, 0)], {
        nodes: { 'c6.fork.b': {
          0: { cam: { focus: ['kael', 'eiryn', 'aerys'], view: 9, ang: -0.5, pitch: 0.4, ease: 1.4 }, do: [{ who: 'kael', to: [1.0, -0.4], speed: 1.2 }, { who: 'eiryn', to: [-0.4, 0.2], speed: 1.2 }, { who: 'aerys', to: [-0.4, 1.0], speed: 1.2 }] },
          1: { cam: { x: 1.8, y: -0.6, view: 4.8, ang: 0.3, pitch: 0.4, up: 0.5, ease: 1.4 }, do: [{ who: 'eiryn', to: [0.8, -0.2], face: [1.8, -0.6], speed: 0.5 }] },
        } },
      }),
      'c6.fork.bafter': 'same',
      // ---- the square before the Reset
      'p.evening': auto('square', [
        EI(-9.5, 1.6, 0), AL(5.2, 0.4, W),
        PT('p1', -3, -1.4, 0.4), PT('p2', -1, 2.4, 3.3), PT('p3', 2.2, 1.6, 2.2), PT('p4', -5, 0.2, 0.2), PT('p5', 0.4, -2.2, 3.6),
      ], {
        noFace: true,
        ambient: { every: 8, do: [
          { at: 0, who: 'p1', to: [-1.2, -1.2], speed: 0.5 }, { at: 0, who: 'p2', to: [-3, 2.2], speed: 0.5 },
          { at: 0, who: 'p3', to: [3.6, 1.0], speed: 0.45 }, { at: 0, who: 'p4', to: [-2.8, 0.6], speed: 0.5 }, { at: 0, who: 'p5', to: [2.4, -2.0], speed: 0.45 },
          { at: 4, who: 'p1', to: [-3, -1.6], speed: 0.5 }, { at: 4, who: 'p2', to: [-1, 2.6], speed: 0.5 },
          { at: 4, who: 'p3', to: [2.2, 1.8], speed: 0.45 }, { at: 4, who: 'p4', to: [-5, 0.4], speed: 0.5 }, { at: 4, who: 'p5', to: [0.4, -2.4], speed: 0.45 },
        ] },
        nodes: { 'p.evening': {
          0: { cam: { x: -1, y: 0, view: 12, ang: -0.3, pitch: 0.5, drift: 0.02, ease: 2 }, do: [{ fade: [0, 2.0] }] },
          1: { cam: { x: 1.5, y: 0.5, view: 8, ang: 0.35, pitch: 0.4, drift: -0.03, ease: 2 } },
          2: { cam: { x: 3, y: -1, view: 14, ang: 0, pitch: 0.2, up: 2.2, drift: 0.0, push: -0.2, ease: 3 } },
          3: { cam: { focus: 'eiryn', view: 6, ang: -0.5, pitch: 0.46, ease: 1.2 }, do: [{ who: 'eiryn', to: [3.6, 0.6], speed: 1.0 }, { at: 1.6, who: 'alric', icon: '!' }] },
          4: { cam: { focus: ['eiryn', 'alric'], view: 3.4, ang: 0.2, pitch: 0.4, up: 0.8, push: 0.05, ease: 1.2 }, do: [{ who: 'eiryn', to: [4.2, 0.6], face: 'alric', speed: 0.6 }, { who: 'alric', face: 'eiryn' }] },
          7: { cam: { focus: ['eiryn', 'alric'], view: 8, ang: -0.9, pitch: 0.46, drift: 0.02, ease: 1.4 }, do: [{ who: 'alric', to: [9.5, -0.6], speed: 0.8 }, { who: 'eiryn', to: [8.5, 0.0], speed: 0.8 }] },
        } },
      }),
      // ---- the overlook: Alric and Eiryn race over the rooftops, leaping the gaps, to the high edge of the city
      'p.overlook': auto('rooftops', [AL(-10.0, 0.0, E), EI(-11.2, 0.7, E)], {
        nodes: { 'p.overlook': {
          0: { cam: { focus: ['alric', 'eiryn'], view: 6.2, ang: -0.55, pitch: 0.3, up: 0.9, ease: 0.35 },
            do: [{ speed: [0.6, 0.8, 'h'] },
              { who: 'alric', path: [[-6, 0.0], [-1, 0.0], [4, 0.0], [8.2, 0.0]], gait: 'sprint', speed: 4.8 },
              { who: 'eiryn', path: [[-7, 0.7], [-2, 0.7], [3, 0.7], [7.0, 0.7]], gait: 'sprint', speed: 4.8 },
              { at: 0.9, who: 'alric', hop: [1.4, 0.75] }, { at: 1.0, who: 'eiryn', hop: [1.3, 0.75] },
              { at: 2.0, who: 'alric', hop: [1.4, 0.75] }, { at: 2.1, who: 'eiryn', hop: [1.3, 0.75] },
              { at: 3.1, who: 'alric', hop: [1.4, 0.75] }, { at: 3.2, who: 'eiryn', hop: [1.3, 0.75] },
              { at: 4.4, speed: [0, 0.6] }, { at: 4.4, shake: 3 }, { at: 4.5, who: 'alric', face: [8.2, -6] }, { at: 4.5, who: 'eiryn', face: [8.2, -6] }] },
          1: { cam: { across: ['alric', 'eiryn'], side: 0.3, focus: ['alric', 'eiryn'], view: 4.6, pitch: 0.4, up: 0.5, ease: 1.2 }, do: [{ who: 'alric', put: [8.0, 0.0] }, { who: 'eiryn', put: [7.0, 0.7] }, { who: 'alric', face: [8, -6] }, { who: 'eiryn', face: [8, -6] }] },
          7: { cam: { focus: ['alric', 'eiryn'], view: 3.2, ang: 0.1, pitch: 0.38, up: 0.9, push: 0.05, ease: 1.8 }, do: [{ who: 'alric', to: [7.6, 0.2], speed: 0.4, face: 'eiryn' }, { who: 'eiryn', face: 'alric' }] },
          9: { cam: { x: 7.4, y: 0.4, view: 3.6, ang: 0.0, pitch: 0.3, up: 1.4, ease: 2.0 } },
          10: { cam: { x: 6, y: -4, view: 16, ang: 0.15, pitch: 0.16, up: 3.4, push: -0.3, ease: 3 }, do: [{ light: ['255,200,160', 0.16, 2.5] }] },
        } },
      }),
      // ---- Chapter Two and Three: Ashgate
      'c2.gate': auto('square', [
        K(-9.5, 0.6, 0, { armed: true }), EA(-10.8, 1.4, 0),
        PT('p1', -3, -1.8, 0.4), PT('p2', -1, 2.6, 3.3), PT('p3', 2.6, 1.8, 2.2), PT('p4', 4, -2.4, 3.4),
      ], {
        nodes: { 'c2.gate': {
          0: { cam: { x: -1, y: 0, view: 11, ang: -0.3, pitch: 0.46, drift: 0.02, ease: 2 }, do: [{ who: 'kael', to: [-3.8, 0.6], speed: 1.1 }, { who: 'eiryn', to: [-5.2, 1.2], speed: 1.1 }] },
          1: { do: [{ who: 'kael', to: [-2.6, 0.6], speed: 0.7 }, { who: 'eiryn', to: [-3.4, 1.4], speed: 0.7, face: 'kael' }] },
        } },
      }),
      'c3.tea': auto('square', [
        K(-1.6, 0.4, 0.3), EA(-2.8, 1.2, 0.2), NP('officer', 'officer', 2.6, -0.2, W), NP('guard', 'officer', 3.6, 0.9, W),
        PT('p1', -6.4, -2.2, 0.5), PT('p2', 5.6, -2.4, 2.8),
      ], {
        nodes: { 'c3.tea': {
          0: { cam: { x: -1.6, y: 0.4, view: 7, ang: -0.4, pitch: 0.42, ease: 1.2 }, do: [{ who: 'eiryn', set: { gest: 'cup', prop: 'cup' } }] },
          1: { do: [{ who: 'kael', face: 'officer', icon: '!' }, { who: 'officer', to: [1.0, 0.1], speed: 0.8 }] },
          2: { do: [{ who: 'officer', to: [0.4, 0.2], speed: 0.4 }] },
          6: { cam: { focus: 'eiryn', view: 3.6, ang: -0.3, pitch: 0.4, up: 0.8, ease: 1.0 }, do: [{ who: 'eiryn', set: { gest: 'hips' } }] },
        } },
      }),
      'c3.fine': 'same',
      'c3.paid': 'same', 'c3.kael': 'same', 'c3.argue': 'same', 'c3.guild': 'same',
      // ---- the Guild office and yard
      'c4.guild': auto('guildhall', [
        K(1.2, 1.2, 0.4), EA(0.4, 2.2, 0.2), NP('registrar', 'registrar', 3.6, -4.2, S), PT('p1', -4.6, 2.4, 0.3), PT('p2', 6.4, 2.0, 2.9),
      ], {
        nodes: { 'c4.guild': {
          0: { cam: { x: 1.0, y: -0.4, view: 9, ang: -0.28, pitch: 0.46, drift: 0.02, ease: 2 }, do: [{ who: 'kael', to: [2.4, -1.4], speed: 1.0 }, { who: 'eiryn', to: [1.8, -0.4], speed: 1.0 }] },
          1: { do: [{ who: 'eiryn', to: [3.6, -2.4], face: 'registrar', speed: 0.8 }, { who: 'kael', to: [2.6, -1.8], face: 'registrar' }] },
        } },
      }),
      'c4.eval': auto('yard', [EA(-2.0, 1.6, E), K(-6.4, 2.4, E), NP('evaluator', 'evaluator', 1.8, -1.2, W)], {
        nodes: { 'c4.eval': {
          0: { cam: { focus: 'eiryn', view: 6.4, ang: -0.5, pitch: 0.42, ease: 1.2 }, do: [{ who: 'eiryn', set: { gest: 'cast' } }, { at: 1.2, who: 'eiryn', to: [-1.0, 1.0], speed: 0.5 }] },
        } },
      }),
      'c4.board': auto('guildhall', [K(3.4, 0.4, N), EA(5.2, 0.6, N), NP('registrar', 'registrar', 2.2, -4.2, S), CP(1.0, 0.8, N)], {
        alias: { companion: '@' },
        nodes: { 'c4.board': {
          0: { cam: { x: 5.0, y: -2.0, view: 6.6, ang: -0.1, pitch: 0.4, up: 1.0, ease: 2.0 }, do: [{ who: 'kael', to: [4.4, -2.4], face: [5, -5.2], speed: 0.8 }, { who: 'eiryn', to: [5.8, -2.4], face: [6, -5.2], speed: 0.8 }] },
        } },
      }),
      // ---- Chapter Five
      'c4.party': 'same',
      'c5.mill': auto('hillpath', [K(-5.6, 1.0, 0), EA(-7.0, 0.4, 0), NP('miller', 'miller', -1.0, 0.4, W)], {
        nodes: { 'c5.mill': {
          0: { cam: { focus: ['miller', 'kael'], view: 6, ang: 0.3, pitch: 0.44, ease: 1.2 }, do: [{ who: 'kael', to: [-2.4, 1.0], speed: 1.0 }, { who: 'eiryn', to: [-3.4, 0.2], speed: 1.0 }] },
          5: { cam: { x: 3, y: -1.8, view: 11, ang: -0.3, pitch: 0.32, up: 1.0, push: -0.1, ease: 2.2 }, do: [{ who: 'kael', to: [3.2, 1.0], speed: 1.1, face: null }, { who: 'eiryn', to: [2.2, 0.4], speed: 1.1 }] },
        } },
      }),
      'c5.after': auto('cave', [K(-1.0, 1.6, 0.6), EA(-3.6, 0.8, 0.3), NP('ogre', 'ogre', 3.2, -0.6, 0.4, { beaten: true })], {
        nodes: { 'c5.after': {
          0: { cam: { focus: 'eiryn', view: 5, ang: -0.3, pitch: 0.4, ease: 1.0 }, do: [{ who: 'eiryn', set: { gest: 'cast' } }, { at: 0.9, shake: 8 }, { at: 0.9, who: 'ogre', knock: [1.6, -0.4], state: 'hurt' }] },
          1: { cam: { x: 3.2, y: -0.6, view: 6.5, ang: 0.4, pitch: 0.4, ease: 1.2 }, do: [{ who: 'ogre', state: 'down' }, { shake: 6 }] },
          2: { cam: { across: ['kael', 'eiryn'], focus: ['kael', 'eiryn'], side: 0.3, view: 4.6, pitch: 0.42, up: 0.6, ease: 1.2 } },
        } },
      }),
      // ---- side contracts and the yard
      'toll.board': auto('guildhall', [K(3.4, 0.4, N), EA(5.2, 0.8, N), CP(1.4, 0.8, N)], {
        alias: { companion: '@' },
        nodes: { 'toll.board': { 0: { cam: { x: 5.0, y: -2.0, view: 6.6, ang: -0.1, pitch: 0.4, up: 1.0, ease: 2.0 } } } },
      }),
      'toll.bridge': auto('ruins', [K(-6.0, 1.0, 0, { armed: true }), EA(-7.2, 0.4, 0), CP(-7.6, 1.6, 0), NP('toll', 'thug', 3.0, -0.4, W, { gest: 'cross' })], {
        alias: { companion: '@' },
        nodes: { 'toll.bridge': {
          0: { cam: { x: 2, y: -0.4, view: 8, ang: 0.3, pitch: 0.42, ease: 1.6 }, do: [{ who: 'kael', to: [-1.6, 1.0], speed: 1.0 }, { who: 'eiryn', to: [-3.0, 0.4], speed: 1.0 }, { who: '@', to: [-3.2, 1.6], speed: 1.0 }] },
        } },
      }),
      'toll.after': auto('ruins', [K(-0.8, 0.6, 0.5), EA(-2.4, 1.2, 0.3), CP(-2.0, -0.6, 0.4)], {
        nodes: { 'toll.after': { 0: { cam: { x: -1.6, y: 0.4, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } },
      }),
      'orchard.board': 'same',
      'orchard.rows': auto('farmland', [K(-4.6, 1.0, 0), EA(-5.8, 0.4, 0), CP(-6.0, 1.8, 0), NP('b1', 'beast', 6.0, -3.4, W, { hidden: true }), NP('b2', 'beast', 8.4, 3.6, W, { hidden: true })], {
        nodes: { 'orchard.rows': { 0: { cam: { x: -1.0, y: 0.4, view: 9, ang: -0.3, pitch: 0.42, ease: 2.0 }, do: [{ who: 'kael', to: [-1.0, 1.0], speed: 0.6 }, { who: 'eiryn', to: [-2.2, 0.4], speed: 0.6 }, { who: '@', to: [-2.6, 1.6], speed: 0.6 }, { at: 2.4, who: 'b1', show: true, blink: [5.6, -3.0] }, { at: 3.0, who: 'b2', show: true, blink: [7.6, 3.2] }, { at: 3.2, who: 'kael', icon: '!' }] } } },
      }),
      'orchard.after': auto('farmland', [K(-1.0, 0.8, 0.3), EA(-2.4, 1.4, 0.2), CP(-2.2, -0.4, 0.3), NP('grower', 'patron', 2.4, 0.4, W)], {
        nodes: { 'orchard.after': { 0: { cam: { x: -0.4, y: 0.6, view: 6.6, ang: -0.4, pitch: 0.42, ease: 1.4 } } } },
      }),
      'warren.board': auto('guildhall', [K(3.4, 0.4, N), EA(5.2, 0.8, N), CP(1.4, 0.8, N)], {
        alias: { companion: '@' },
        nodes: { 'warren.board': { 0: { cam: { x: 5.0, y: -2.0, view: 6.6, ang: -0.1, pitch: 0.4, up: 1.0, ease: 2.0 } } } },
      }),
      'warren.after': auto('cave', [K(-1.4, 0.8, 0.3), EA(-2.8, 1.4, 0.2), CP(-2.4, -0.4, 0.3)], {
        nodes: { 'warren.after': { 0: { cam: { x: -1.6, y: 0.4, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } },
      }),
      'yard.intro': auto('yard', [EA(-2.0, 1.6, E), K(-6.4, 2.4, E), NP('evaluator', 'evaluator', 1.8, -1.2, W)], {
        nodes: { 'yard.intro': { 0: { cam: { focus: 'eiryn', view: 6.4, ang: -0.5, pitch: 0.42, ease: 1.2 } } } },
      }),
      'yard.after': auto('yard', [EA(-1.0, 1.0, E), K(-6.4, 2.4, E), NP('evaluator', 'evaluator', 1.8, -1.2, W)], {
        nodes: { 'yard.after': { 0: { cam: { focus: ['evaluator', 'eiryn'], view: 6, ang: -0.4, pitch: 0.42, ease: 1.2 } } } },
      }),
      'cart.board': auto('guildhall', [K(3.4, 0.4, N), EA(5.2, 0.8, N), CP(1.4, 0.8, N)], {
        alias: { companion: '@' },
        nodes: { 'cart.board': { 0: { cam: { x: 5.0, y: -2.0, view: 6.6, ang: -0.1, pitch: 0.4, up: 1.0, ease: 2.0 } } } },
      }),
      'cart.ditch': auto('road', [K(-5.6, 0.8, 0), EA(-6.8, 0.2, 0), CP(-7.0, 1.4, 0), NP('knifeman', 'knife', 3.4, -0.6, W)], {
        alias: { companion: '@' },
        nodes: { 'cart.ditch': { 0: { cam: { x: 0, y: 0, view: 9, ang: -0.3, pitch: 0.44, ease: 1.6 }, do: [{ who: 'kael', to: [-1.4, 0.8], speed: 0.8 }, { who: 'eiryn', to: [-2.6, 0.2], speed: 0.8 }, { who: '@', to: [-2.8, 1.4], speed: 0.8 }] } } },
      }),
      'cart.after': auto('road', [K(-1.0, 0.6, 0.4), EA(-2.4, 1.2, 0.3), CP(-2.2, -0.4, 0.4)], {
        nodes: { 'cart.after': { 0: { cam: { x: -1.6, y: 0.4, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } },
      }),
      'stray.board': auto('guildhall', [K(3.4, 0.4, N), EA(5.2, 0.8, N), CP(1.4, 0.8, N)], {
        alias: { companion: '@' },
        nodes: { 'stray.board': { 0: { cam: { x: 5.0, y: -2.0, view: 6.6, ang: -0.1, pitch: 0.4, up: 1.0, ease: 2.0 } } } },
      }),
      'stray.after': auto('clearing', [K(-1.0, 0.6, 0.4), EA(-2.4, 1.2, 0.3), CP(-2.2, -0.4, 0.4)], {
        nodes: { 'stray.after': { 0: { cam: { x: -1.6, y: 0.4, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } },
      }),
      'cross.ask': auto('road', [EA(-5.0, 1.0, 0), K(-6.4, 0.4, 0), CP(-6.6, 1.6, 0)], {
        nodes: { 'cross.ask': { 0: { cam: { focus: 'eiryn', view: 7, ang: -0.4, pitch: 0.42, ease: 1.2 }, do: [{ who: 'eiryn', to: [-1.0, 1.0], speed: 0.7 }, { who: 'kael', to: [-2.4, 0.4], speed: 0.7 }, { who: '@', to: [-2.6, 1.6], speed: 0.7 }] } } },
      }),
      'cross.after': auto('road', [EA(-1.0, 1.0, 0.3), K(-2.4, 0.4, 0.3), CP(-2.6, 1.6, 0.3)], {
        nodes: { 'cross.after': { 0: { cam: { focus: 'eiryn', view: 5.6, ang: -0.4, pitch: 0.4, up: 0.6, ease: 1.2 } } } },
      }),
      'deep.mouth': auto('deep', [K(-6.2, 0.4, 0), EA(-7.4, 1.0, 0), CP(-7.6, -0.4, 0)], {
        nodes: { 'deep.mouth': { 0: { cam: { x: -1.0, y: 0.2, view: 9, ang: -0.3, pitch: 0.44, ease: 2.0 }, do: [{ who: 'kael', to: [-2.8, 0.4], speed: 0.8 }, { who: 'eiryn', to: [-4.0, 1.0], speed: 0.8 }, { who: '@', to: [-4.2, -0.4], speed: 0.8 }] } } },
      }),
      'deep.rest': auto('deep', [K(-2.0, 0.6, 0.4), EA(-3.2, 1.4, 0.3), CP(-3.0, -0.4, 0.4)], {
        nodes: { 'deep.rest': { 0: { cam: { x: -2.4, y: 0.4, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } },
      }),
      'deep.end': auto('deep', [K(-1.0, 0.6, 0.4), EA(-2.4, 1.2, 0.3), CP(-2.2, -0.4, 0.4)], {
        nodes: { 'deep.end': { 0: { cam: { x: -1.6, y: 0.4, view: 6, ang: -0.3, pitch: 0.42, ease: 1.4 } } } },
      }),
      // ---- the Guild's call to arms: the formation breaks (c1.clip)
      'c1.clip': {
        arena: 'clearing',
        cast: [
          PT('p1', -9.0, -2.0, 0), PT('p2', -9.6, 0.0, 0), PT('p3', -9.2, 2.0, 0), PT('p4', -10.4, -1.0, 0), PT('p5', -10.2, 1.0, 0),
        ],
        setup: [{ sky: [0, 0] }],
        cam: { x: 2, y: -3, view: 14, ang: 0.1, pitch: 0.3, up: 1.2 },
        beats: [
          // Above the distant treeline, purple light gathers in the air...
          { cam: { x: 3, y: -4, view: 13, ang: 0.15, pitch: 0.22, up: 2.2, push: -0.12, ease: 2.5 },
            do: [{ sky: [1, 3.5] }, { who: 'p1', to: [-3.0, -2.0], gait: 'run', speed: 3 }, { who: 'p2', to: [-3.6, 0.0], gait: 'run', speed: 3 }, { who: 'p3', to: [-3.2, 2.0], gait: 'run', speed: 3 },
              { who: 'p4', to: [-4.6, -1.0], gait: 'run', speed: 3 }, { who: 'p5', to: [-4.4, 1.0], gait: 'run', speed: 3 }, { speed: [0.6, 1.0, 'h'] }] },
          // One of the inner rings stops. The whole formation shudders, holds, and comes apart.
          { cam: { x: 3, y: -4, view: 13, ang: 0.15, pitch: 0.2, up: 2.4, push: 0.0, ease: 1.5 },
            do: [{ speed: [0, 0.4] }, { rumble: [3, 2.4] }, { at: 1.0, shake: 10 }, { at: 1.1, sky: [0.15, 1.2] }, { at: 1.1, light: ['200,170,255', 0.35, 0.3] }, { at: 1.5, light: [null, 0, 1.2] },
              { at: 1.2, who: 'p1', knock: [-2.4, 0.4], state: 'hurt' }, { at: 1.2, who: 'p2', knock: [-2.8, 0.0], state: 'hurt' }, { at: 1.2, who: 'p3', knock: [-2.4, -0.4], state: 'hurt' },
              { at: 1.3, who: 'p4', knock: [-2.0, 0.2], state: 'hurt' }, { at: 1.3, who: 'p5', knock: [-2.2, 0.0], state: 'hurt' }, { at: 2.6, sky: [0, 2.0] }] },
        ],
      },
    },
  };
});
