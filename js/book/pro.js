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

  return {
    id: 'pro',
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
    },
  };
});
