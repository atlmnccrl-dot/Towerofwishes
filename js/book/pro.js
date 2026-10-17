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
    stages: {
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
      // ---- the overlook, the Tower in the evening
      'p.overlook': auto('hillpath', [AL(-1.4, 0.8, N), EI(-0.5, 1.4, N)], {
        noFace: false,
        nodes: { 'p.overlook': {
          0: { cam: { x: 0, y: -4, view: 14, ang: 0.2, pitch: 0.24, up: 1.5, push: -0.15, ease: 2.5 } },
          1: { cam: { across: ['alric', 'eiryn'], side: 0.3, focus: ['alric', 'eiryn'], view: 4.6, pitch: 0.4, up: 0.5, ease: 1.2 } },
          7: { cam: { focus: ['alric', 'eiryn'], view: 2.8, ang: 0.1, pitch: 0.36, up: 0.9, push: 0.05, ease: 1.8 }, do: [{ who: 'alric', to: [-0.9, 1.0], speed: 0.4, face: 'eiryn' }, { who: 'eiryn', face: 'alric' }] },
          9: { cam: { x: -0.7, y: 1.1, view: 3.2, ang: 0.0, pitch: 0.3, up: 1.4, ease: 2.0 } },
          10: { cam: { x: 0, y: -6, view: 16, ang: 0.2, pitch: 0.18, up: 3, push: -0.3, ease: 3 }, do: [{ light: ['255,200,160', 0.18, 2.5] }] },
        } },
      }),
      // ---- the Reset
      'p.reset': {
        arena: 'rooftops',
        cast: [EI(-6.6, 0.6, E), AL(-5.4, 0.4, E)],
        setup: [{ reset: [0, 0] }, { fade: [1] }],
        cam: { x: -3, y: 0, view: 11, ang: -0.1, pitch: 0.4 },
        beats: [
          // Then the clouds began to burn.
          { cam: { x: -4, y: 0, view: 9, ang: -0.1, pitch: 0.14, up: 3.2, push: -0.05, ease: 2.5 },
            do: [{ fade: [0, 1.2] }, { who: 'alric', face: [0, -8] }, { who: 'eiryn', face: [0, -8] }, { reset: [0.25, 5] }, { rumble: [1.5, 5] }] },
          // A straight white line opened overhead...
          { cam: { x: -3, y: 0, view: 12, ang: -0.1, pitch: 0.08, up: 4.5, push: -0.15, ease: 2.0 },
            do: [{ reset: [0.6, 4] }, { light: ['255,240,230', 0.18, 0.4] }, { at: 0.6, light: [null, 0, 1.4] }, { rumble: [2.5, 6] }, { at: 0.8, who: 'eiryn', icon: '!' }] },
          // Fire rained down. Oceans surged inland...
          { cam: { x: -3, y: 0.6, view: 8, ang: -0.3, pitch: 0.3, up: 2.0, drift: 0.04, ease: 1.2 },
            do: [{ reset: [0.8, 3] }, { shake: 9 }, { rumble: [3.5, 8] }, { at: 1.5, shake: 7 }, { at: 0.5, who: 'alric', icon: '!' },
              { who: 'alric', to: [-5.0, 0.4], face: 'eiryn', speed: 0.5 }] },
          // Eiryn ran. Alric's hand was locked around hers...
          { cam: { focus: ['eiryn', 'alric'], view: 7, ang: -0.8, pitch: 0.38, up: 0.4, push: 0.1, ease: 0.6, cut: true },
            do: [{ speed: [0.9, 0.6, 'h'] }, { reset: [0.9, 3] }, { rumble: [3, 8] },
              { who: 'eiryn', path: [[-3, 0.4], [1.5, 0.2], [6.0, 0.6]], gait: 'sprint', speed: 5.2 },
              { who: 'alric', path: [[-4, 0.2], [0.4, 0.0], [5.0, 0.4]], gait: 'sprint', speed: 5.2 }] },
          // Then the light changed. A wall of flame was descending...
          { cam: { focus: ['eiryn', 'alric'], view: 6, ang: -0.3, pitch: 0.34, up: 0.6, ease: 0.8 },
            do: [{ speed: [0, 0.5] }, { reset: [1, 4] }, { shake: 12 }, { who: 'alric', face: [0, -6], icon: '!' }, { who: 'eiryn', face: [0, -6], icon: '!' },
              { at: 1.2, light: ['255,200,140', 0.4, 2.5] }] },
          // Alric turned and shoved Eiryn backward...
          { cam: { behind: 'alric', side: 0.2, view: 4.4, up: 1.0, pitch: 0.3, push: 0.12, ease: 0.7 },
            do: [{ who: 'alric', face: 'eiryn' }, { at: 0.6, who: 'eiryn', knock: [-3.2, 0.2], state: 'hurt' }, { at: 0.6, shake: 6 },
              { at: 1.1, who: 'alric', face: [0, -6], set: { gest: 'cross' } }, { at: 2.2, who: 'alric', to: [5.6, 0.4], speed: 0.4 }, { at: 2.4, cam: { focus: 'alric', face: 'alric', side: -0.1, view: 2.8, up: 1.0, pitch: 0.28, ease: 1.2 } }] },
          // Eiryn screamed. No sound came out. Ash fell. Alric was gone.
          { cam: { focus: 'eiryn', view: 3.4, ang: -0.2, pitch: 0.4, up: 0.8, ease: 0.8 },
            do: [{ light: ['255,250,240', 1.0, 0.4] }, { shake: 16 }, { at: 0.4, who: 'alric', hide: true }, { at: 0.5, light: [null, 0, 2.6] },
              { at: 0.6, who: 'eiryn', state: 'down' }, { at: 0.8, reset: [0.35, 4] }, { at: 0.9, speed: [0, 0.2] }] },
          // The world remembered it as the Reset.
          { cam: { x: 0, y: 0, view: 14, ang: -0.1, pitch: 0.3, up: 2, push: -0.12, ease: 3.0 },
            do: [{ reset: [0.2, 6] }, { fade: [1, 5.0] }] },
        ],
      },
      // ---- the tale at the fire
      'p.story': auto('nightcamp', [
        EI(7.4, 4.0, W, { key: 'eirynAsh', id: 'eiryn' }), PT('p1', -2.2, 1.8, 0.2), PT('p2', -1.2, -1.4, 0.8), PT('p3', 2.0, 1.8, 2.8), PT('p4', 2.2, -1.2, 3.8),
      ], {
        noFace: true,
        nodes: { 'p.story': {
          0: { cam: { x: 0, y: 0.4, view: 9, ang: -0.4, pitch: 0.46, drift: 0.03, ease: 2.5 }, do: [{ fade: [0, 1.5] }, { who: 'p1', set: { gest: 'cross' } }] },
          1: { cam: { x: 0.4, y: 0.2, view: 6, ang: 0.4, pitch: 0.44, drift: -0.03, ease: 2 }, do: [{ who: 'p2', set: { gest: 'cross' } }] },
          2: { cam: { x: 0.2, y: -0.4, view: 11, ang: 0.0, pitch: 0.3, up: 1.5, push: 0.05, ease: 2.5 } },
          3: { cam: { focus: 'eiryn', view: 4.0, ang: 0.5, pitch: 0.42, up: 0.7, ease: 2.0 }, do: [{ who: 'eiryn', face: [0, 0.4] }, { at: 1, who: 'eiryn', icon: '…' }] },
        } },
      }),
      // ---- a hundred and fifty years later
      'p.later': auto('hillpath', [EI(-0.6, 1.0, N, { key: 'eirynAsh' })], {
        nodes: { 'p.later': {
          0: { cam: { focus: 'eiryn', face: 'eiryn', side: 0.4, view: 3.6, up: 1.0, pitch: 0.34, push: -0.08, ease: 1.0 }, do: [{ fade: [0, 1.5] }, { light: ['255,190,140', 0.14, 3] }] },
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
