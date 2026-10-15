/*
 * Tower of Wishes — staged story scenes: blocking and camera, beat by beat.
 *
 * Plain data (no DOM). Keyed by story node id (js/story.js). A value is a
 * stage definition played by js/render/stage.js, or 'same' to keep the stage
 * of the node before it running (choice nodes). Nodes without an entry keep
 * their painted backdrop.
 *
 * Each beat goes with one dialogue line, in order; a beat with `line` is tied
 * to the line containing that text instead (for lines that depend on who is
 * in the party). Speech balloons quote the book's lines; '$' shows the line
 * itself. Positions are arena metres (js/sim.js ARENAS); facing is radians
 * (0 = east, PI/2 = south, toward the default camera). Cast key '@' is the
 * player's starter. The format is documented in js/render/stage.js.
 *
 * The blocking follows the scene text of the manuscript; small gestures
 * (a laugh, a pointing archer) stage what the narration says.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowStages = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PI = Math.PI;
  const E = 0, S = PI / 2, W = PI, N = -PI / 2;

  // ------------------------------------------------------------ prologue
  const pTower = {
    arena: 'summit',
    cast: [
      { id: 'climber', key: 'climber', x: -9.0, y: 3.0, f: -0.3, hidden: true },
      { id: 'shade1', key: 'shade', x: 1.2, y: -1.8, f: W, hidden: true },
      { id: 'shade2', key: 'shade', x: 1.8, y: 2.0, f: W, hidden: true },
      { id: 'shade3', key: 'shade', x: 3.6, y: 0.2, f: W, hidden: true },
      { id: 'veil', key: 'veil', x: 6.0, y: -0.4, f: W, hidden: true },
    ],
    setup: [{ fade: [1] }],
    cam: { x: 0, y: -1, view: 15, ang: 0.15, pitch: 0.62 },
    beats: [
      // The Tower had been there longer than any history...
      { cam: { x: 0, y: -2, view: 12, ang: -0.05, pitch: 0.56, drift: -0.02, ease: 5 }, do: [{ fade: [0, 2.2] }] },
      // Stories disagreed about nearly everything else...
      { cam: { x: 0, y: -4.5, view: 8, ang: 0, pitch: 0.42, drift: 0.02, ease: 3.5 } },
      // ...a climber reached the last ascent.
      {
        cam: { focus: 'climber', dx: 1.2, view: 5.5, ang: -0.6, pitch: 0.46, up: 0.4, ease: 1.2 },
        do: [
          { who: 'climber', show: true, to: [-5.0, 1.1], speed: 0.9, gait: 'stride' },
        ],
      },
      // Blood had dried along one side of the stranger's face...
      {
        cam: { face: 'climber', side: 0.45, view: 2.8, up: 1.25, pitch: 0.4, drift: 0.04, ease: 0.9 },
        do: [{ who: 'climber', to: [-4.6, 1.0], speed: 0.5, face: E }],
      },
      // Something was waiting on the final floor...
      {
        cam: { behind: 'climber', side: -0.25, focus: ['climber', 'veil'], view: 7, pitch: 0.38, up: 0.6, ease: 1.0 },
        do: [
          { who: 'climber', face: E },
          { at: 0.3, who: 'shade1', show: true, blink: [1.2, -1.8] },
          { at: 0.55, who: 'shade2', show: true, blink: [1.8, 2.0] },
          { at: 0.8, who: 'shade3', show: true, blink: [3.6, 0.2] },
          { at: 1.3, who: 'veil', show: true, shake: 10 },
          { at: 1.35, who: 'climber', icon: '!' },
          { at: 1.9, who: 'climber', attack: { wind: 0.5, hold: true, tele: false } },
        ],
      },
    ],
  };

  const pLight = {
    arena: 'summit',
    cast: [{ id: 'climber', key: 'climber', x: 0.6, y: 0.6, f: N }],
    setup: [{ who: 'climber', drained: true }],
    cam: { behind: 'climber', view: 6.5, pitch: 0.36, up: 0.2 },
    beats: [
      // Above the final steps was a brightness too pale to see through.
      {
        cam: { behind: 'climber', x: 0, y: -4.2, view: 9, pitch: 0.34, push: -0.35, ease: 2.5 },
        do: [
          { at: 0.6, who: 'climber', drained: false, path: [[0.2, -2.5], [0, -4.6]], speed: 0.7, gait: 'stride' },
        ],
      },
      // The climber reached toward it.
      {
        cam: { behind: 'climber', side: 0.3, view: 4.2, up: 0.2, pitch: 0.34, push: 0.4, ease: 1.0 },
        do: [
          { who: 'climber', face: N },
          { at: 0.5, who: 'climber', state: 'cast', hold: true },
          { at: 1.6, fade: [1, 2.4, '246,240,236'] },
        ],
      },
    ],
  };

  // ------------------------------------------------------------ chapter one
  // The clearing: the fallen trunk runs from (-3.6, 2.9) to (1.6, 3.9); the
  // path to the road leaves in the north-east.
  const c1Voice = {
    arena: 'clearing',
    cast: [
      { id: 'eiryn', key: 'eiryn', x: -0.6, y: 2.3, f: -1.25 },
      { id: 'brute', key: 'brute', x: 2.6, y: -5.6, f: 2.0, hidden: true },
      { id: 'knife', key: 'knife', x: -4.8, y: -4.6, f: 1.0, hidden: true },
      { id: 'grabber', key: 'grabber', x: 7.0, y: 4.8, f: W, hidden: true },
      { id: 'lookout', key: 'lookout', x: 10.2, y: -5.8, f: 2.6, hidden: true },
      { id: 'kael', key: 'kael', x: -9.0, y: -0.9, f: 0.12 },
      { id: '@', key: '@', x: -9.7, y: 0.5, f: 0.05 },
    ],
    cam: { face: 'eiryn', side: 0.55, view: 3.0, up: 1.2, pitch: 0.42 },
    beats: [
      // At the forest's edge, a man laughs. Another answers...
      {
        cam: { face: 'eiryn', side: 0.55, view: 3.0, up: 1.2, pitch: 0.42, drift: 0.04, cut: true },
        do: [
          { at: 0.3, who: 'eiryn', state: 'cast', dur: 1.5 },
          { at: 0.95, who: 'eiryn', fx: 'fizzle' },
          { at: 1.9, who: 'eiryn', icon: '…', drained: true },
          { at: 2.3, who: 'brute', show: true, to: [1.8, -2.4], gait: 'stride' },
          { at: 2.4, who: 'knife', show: true, to: [-3.4, -2.2], gait: 'stride' },
          { at: 2.5, cam: { behind: 'eiryn', side: 0.2, focus: ['eiryn', 'brute'], view: 6.5, pitch: 0.45, up: 0.3, ease: 1.4 } },
          { at: 2.8, who: 'brute', say: 'Ha!' },
          { at: 3.0, who: 'eiryn', face: 'brute', drained: false },
          { at: 3.4, who: 'knife', say: 'Heh.' },
        ],
      },
      // "Keep your hands off me."
      {
        cam: { behind: 'brute', side: 0.35, focus: ['eiryn', 'brute'], view: 4.8, pitch: 0.42, up: 0.6, ease: 0.7 },
        do: [
          { who: 'brute', show: true, to: [0.5, 0.9], gait: 'stride' },
          { who: 'knife', show: true, to: [-2.8, -0.6] },
          { who: 'eiryn', drained: false, face: 'brute' },
          { at: 0.9, who: 'eiryn', to: [-0.9, 2.45], gait: 'back', icon: '!' },
          { at: 1.0, who: 'eiryn', say: 'Keep your hands off me.' },
        ],
      },
      // Four men in a clearing...
      {
        cam: { x: -0.6, y: 0.3, view: 9.2, ang: -0.3, pitch: 0.58, drift: 0.012, ease: 1.3 },
        do: [
          { who: 'knife', to: [-2.3, 0.7], face: 'eiryn' },
          { who: 'brute', face: 'eiryn' },
          { at: 0.2, who: 'grabber', show: true, path: [[4.6, 4.8], [2.5, 4.55], [2.6, 2.8]], gait: 'creep', speed: 1.6 },
          { at: 0.4, who: 'lookout', show: true, to: [6.4, -3.8], face: 'eiryn' },
          { at: 2.6, who: 'grabber', face: 'eiryn' },
        ],
      },
      // The woman they have cornered has long silver-white hair. She is exhausted.
      {
        cam: { face: 'eiryn', side: -0.35, view: 3.1, up: 1.25, pitch: 0.4, push: -0.08, ease: 1.0 },
        do: [
          { who: 'grabber', to: [2.6, 2.8], face: 'eiryn' },
          { who: 'lookout', to: [6.4, -3.8] },
          { at: 0.6, who: 'eiryn', drained: true },
        ],
      },
      // "Then do another trick. The big one. We all saw it."
      {
        cam: { behind: 'eiryn', side: 0.3, focus: ['eiryn', 'brute'], view: 4.4, pitch: 0.36, up: 0.6, ease: 0.6 },
        do: [
          { who: 'eiryn', face: 'brute' },
          { who: 'brute', to: [0.1, 1.3], gait: 'stride', speed: 1.1 },
          { at: 0.5, who: 'brute', say: 'The big one. We all saw it.', base: 'circle' },
          { at: 0.9, who: 'grabber', to: [2.1, 2.7], gait: 'creep' },
        ],
      },
      // "She can't. Look at her."
      {
        cam: { face: 'knife', side: 0.6, view: 3.4, up: 1.0, pitch: 0.42, ease: 0.6 },
        do: [
          { who: 'knife', to: [-1.9, 1.3], gait: 'creep', face: 'eiryn' },
          { at: 0.4, who: 'knife', say: 'She can’t. Look at her.' },
          { at: 2.3, cam: { x: -3.6, y: 1.0, view: 8.6, ang: -1.05, pitch: 0.48, drift: 0.01, ease: 1.6 } },
          { at: 2.6, who: 'kael', icon: '!', face: 'brute' },
          { at: 2.8, who: '@', face: 'eiryn' },
          { at: 3.6, who: 'kael', cutin: true },
        ],
      },
    ],
  };

  const c1After = {
    arena: 'clearing',
    cast: [
      { id: 'kael', key: 'kael', x: 0.6, y: 0.2, f: -0.65 },
      { id: 'eiryn', key: 'eiryn', x: -0.7, y: 2.45, f: -1.4 },
      { id: '@', key: '@', x: 2.0, y: 0.9, f: -2.6 },
    ],
    setup: [{ who: 'eiryn', drained: true }],
    cam: { face: 'kael', side: 0.4, view: 3.6, up: 0.9, pitch: 0.42 },
    beats: [
      // They're gone.
      {
        cam: { face: 'kael', side: 0.4, view: 3.6, up: 0.9, pitch: 0.42, drift: -0.03, cut: true },
        do: [
          { who: 'kael', state: 'recover', dur: 1.8 },
          { at: 0.4, who: 'kael', say: 'They’re gone.' },
        ],
      },
      // Good.
      {
        cam: { face: 'eiryn', side: -0.3, view: 3.0, up: 1.2, pitch: 0.42, ease: 0.6 },
        do: [{ at: 0.3, who: 'eiryn', say: 'Good.' }],
      },
      // Are you hurt?
      {
        cam: { across: ['eiryn', 'kael'], side: -0.35, focus: ['eiryn', 'kael'], view: 4.4, pitch: 0.44, up: 0.6, ease: 0.9 },
        do: [
          { who: 'kael', to: [-0.2, 1.35], face: 'eiryn' },
          { who: '@', face: 'eiryn' },
          { at: 0.7, who: 'kael', say: 'Are you hurt?' },
        ],
      },
      // Not by them.
      {
        cam: { face: 'eiryn', side: 0.45, view: 2.8, up: 1.3, pitch: 0.4, push: -0.06, ease: 0.7 },
        do: [
          { who: 'eiryn', face: 2.4, turn: 2 },
          { at: 0.4, who: 'eiryn', say: 'Not by them.' },
        ],
      },
      // That spell over the trees. Was it yours?
      {
        cam: { across: ['kael', 'eiryn'], side: 0.3, focus: ['eiryn', 'kael'], view: 5, pitch: 0.46, up: 0.4, drift: 0.02, ease: 0.9 },
        do: [
          { who: 'kael', face: [0, -9] },
          { at: 0.6, who: 'kael', say: 'Was it yours?' },
          { at: 1.0, who: 'kael', face: 'eiryn' },
          { at: 1.2, who: 'eiryn', face: 'kael' },
        ],
      },
      // It would have been considerably more impressive if it had worked.
      {
        cam: { face: 'eiryn', side: -0.4, view: 3.0, up: 1.2, pitch: 0.4, ease: 0.6 },
        do: [
          { at: 0.3, who: 'eiryn', state: 'cast', dur: 1.0 },
          { at: 0.7, who: 'eiryn', fx: 'fizzle' },
          { at: 1.3, who: 'eiryn', say: '…if it had worked.' },
        ],
      },
      // Kael offers his waterskin.
      {
        cam: { across: ['kael', 'eiryn'], side: -0.15, focus: ['eiryn', 'kael'], view: 3.6, pitch: 0.42, up: 0.7, ease: 0.8 },
        do: [
          { who: 'kael', to: [-0.1, 1.45], face: 'eiryn', speed: 0.8 },
          { at: 0.7, who: 'kael', state: 'cast', hold: true },
        ],
      },
      // That's what somebody trying to poison me would say.
      {
        cam: { face: 'eiryn', side: 0.35, view: 3.0, up: 1.2, pitch: 0.42, ease: 0.6 },
        do: [
          { at: 0.2, who: 'eiryn', icon: '?' },
          { at: 0.5, who: 'eiryn', say: '…trying to poison me would say.' },
        ],
      },
      // Then I'm apparently very committed to the plan.
      {
        cam: { x: -1.0, y: 1.2, view: 6.5, ang: -0.55, pitch: 0.5, drift: 0.02, ease: 1.4 },
        do: [
          { who: 'kael', base: 'idle' },
          { at: 0.4, who: 'kael', say: 'Very committed to the plan.' },
          { at: 1.5, who: '@', icon: '…' },
        ],
      },
    ],
  };

  const c1Walk = {
    arena: 'clearing',
    cast: [
      { id: 'kael', key: 'kael', x: -1.0, y: 0.4, f: -0.5 },
      { id: 'eiryn', key: 'eiryn', x: -1.9, y: 1.3, f: -0.5 },
      { id: '@', key: '@', x: -2.6, y: -0.3, f: -0.5 },
    ],
    cam: { focus: ['kael', 'eiryn', '@'], dx: 1.6, dy: -0.8, view: 5.2, ang: -1.9, pitch: 0.46, up: 0.5 },
    beats: [
      // I'm Kael.
      {
        cam: { focus: ['kael', 'eiryn', '@'], dx: 1.4, dy: -0.7, view: 5.2, ang: -1.9, pitch: 0.46, up: 0.5, drift: 0.03, cut: true },
        do: [
          { who: 'kael', to: [2.6, -1.0], speed: 1.0 },
          { who: 'eiryn', to: [1.7, -0.1], speed: 1.0 },
          { who: '@', to: [1.3, -1.6], speed: 1.0 },
          { at: 0.6, who: 'kael', say: 'I’m Kael.' },
        ],
      },
      // Eiryn.
      {
        do: [
          { who: 'kael', to: [4.2, -1.9], speed: 1.0 },
          { who: 'eiryn', to: [3.3, -1.1], speed: 1.0 },
          { who: '@', to: [2.9, -2.6], speed: 1.0 },
          { at: 0.4, who: 'eiryn', say: 'Eiryn.' },
        ],
      },
      // The starter's name.
      {
        cam: { face: '@', side: 0.5, view: 3.4, up: 1.0, pitch: 0.42, ease: 0.8 },
        do: [
          { who: 'kael', to: [5.4, -2.6], speed: 1.0 },
          { who: 'eiryn', to: [4.5, -1.8], speed: 1.0 },
          { who: '@', to: [4.1, -3.3], speed: 1.0 },
          { at: 0.5, who: '@', say: '$' },
        ],
      },
      // There should be a crossing east of here.
      {
        cam: { focus: ['kael', 'eiryn', '@'], dx: 1.2, dy: -0.6, view: 5.0, ang: -2.2, pitch: 0.46, up: 0.5, drift: -0.02, ease: 1.0 },
        do: [
          { who: 'kael', to: [6.8, -3.4], speed: 1.0 },
          { who: 'eiryn', to: [5.9, -2.6], speed: 1.0 },
          { who: '@', to: [5.5, -4.1], speed: 1.0 },
          { at: 0.4, who: 'eiryn', say: 'There should be a crossing east of here.' },
        ],
      },
      // Not on the road I came by.
      {
        do: [
          { who: 'kael', to: [7.9, -4.0], speed: 1.0 },
          { who: 'eiryn', to: [7.0, -3.2], speed: 1.0 },
          { who: '@', to: [6.6, -4.7], speed: 1.0 },
          { at: 0.5, who: 'kael', say: 'Not on the road I came by.' },
        ],
      },
      // There was.
      {
        cam: { face: 'eiryn', side: -0.2, view: 3.0, up: 1.2, pitch: 0.4, ease: 0.7 },
        do: [
          { who: 'eiryn', to: [7.2, -3.3], speed: 0.6 },
          { who: 'kael', to: [8.6, -4.4], speed: 1.0 },
          { who: '@', to: [7.4, -5.2], speed: 1.0 },
          { at: 0.5, who: 'eiryn', say: 'There was.' },
          { at: 1.0, who: 'kael', face: 'eiryn' },
          { at: 1.1, who: '@', face: 'eiryn' },
        ],
      },
      // Beyond the last branches lie the road and the first roofs of the town...
      {
        cam: { behind: 'eiryn', side: 0.15, x: 10.2, y: -5.6, view: 7.5, pitch: 0.36, push: -0.2, ease: 1.8 },
        do: [
          { who: 'eiryn', to: [8.0, -3.9], speed: 0.6, face: [12.5, -6.5] },
          { who: 'kael', face: [12.5, -6.5] },
          { who: '@', face: [12.5, -6.5] },
        ],
      },
      // I thought I knew this place.
      {
        cam: { face: 'eiryn', side: 1.3, view: 2.8, up: 1.3, pitch: 0.4, push: -0.07, ease: 0.9 },
        do: [{ at: 0.5, who: 'eiryn', say: 'I thought I knew this place.' }],
      },
    ],
  };

  // ------------------------------------------------------------ chapter five
  // The quarry path: the party comes up from the west; the hill rises east.
  const c5Path = {
    arena: 'hillpath',
    cast: [
      { id: '@', key: '@', x: -10.0, y: 0.4, f: E },
      { id: 'kael', key: 'kael', x: -10.8, y: -1.1, f: E, need: 'kael' },
      { id: 'eiryn', key: 'eirynMage', x: -11.0, y: 1.6, f: E, need: 'eiryn' },
      { id: 'goblin', key: 'goblin', x: 2.6, y: 1.8, f: 2.4 },
      { id: 'spear', key: 'goblinSpear', x: 7.6, y: -4.2, f: W, hidden: true },
      { id: 'archer', key: 'goblinArcher', x: 10.0, y: -2.6, f: W, hidden: true },
    ],
    setup: [{ who: 'goblin', base: 'pickup' }],
    cam: { face: 'goblin', side: 0.45, view: 3.0, up: 1.0, pitch: 0.42 },
    beats: [
      // A goblin squats by a stolen sack... It looks up and lets out a sharp cry.
      {
        cam: { face: 'goblin', side: 0.45, view: 3.0, up: 1.0, pitch: 0.42, drift: 0.03, cut: true },
        do: [
          { who: '@', to: [-6.6, 0.3] },
          { who: 'kael', to: [-7.4, -1.2] },
          { who: 'eiryn', to: [-7.6, 1.5] },
          { at: 1.6, who: 'goblin', base: 'idle', icon: '!', face: '@' },
          { at: 2.0, who: 'goblin', say: 'Kreeee!', shake: 4 },
          { at: 2.4, cam: { focus: ['goblin', '@'], view: 7.5, ang: -0.25, pitch: 0.5, ease: 1.2 } },
        ],
      },
      // From higher on the hill comes an answering cry.
      {
        cam: { x: 7.4, y: -3.2, view: 6.5, ang: -0.1, pitch: 0.4, ease: 1.6 },
        do: [
          { who: 'goblin', face: [8, -4] },
          { at: 1.0, shake: 5 },
          { at: 1.1, who: '@', icon: '!' },
          { at: 1.2, who: 'kael', icon: '!' },
        ],
      },
      // And now the rest know we're here.
      {
        line: 'rest know',
        cam: { face: 'eiryn', side: 0.5, view: 3.2, up: 1.0, pitch: 0.42, ease: 0.7 },
        do: [{ at: 0.3, who: 'eiryn', say: 'And now the rest know we’re here.' }],
      },
      // Two goblins appear above the path...
      {
        line: 'two goblins appear',
        cam: { x: 1.0, y: -0.6, view: 8.4, ang: -0.3, pitch: 0.5, drift: 0.01, ease: 0.9 },
        do: [
          { who: 'spear', show: true, path: [[5.0, -3.0], [2.0, -0.6]], gait: 'run' },
          { at: 0.2, who: 'archer', show: true, to: [6.6, 1.2], gait: 'run' },
          { at: 0.3, who: 'goblin', to: [3.6, 1.8], gait: 'back', face: '@' },
          { at: 1.6, who: 'archer', face: '@' },
          { at: 1.8, who: 'archer', attack: { wind: 0.9, hold: true, aim: '@' } },
          { at: 2.0, cam: { behind: '@', side: 0.2, focus: 'archer', view: 4.2, up: 0.5, pitch: 0.42, ease: 0.6 } },
        ],
      },
      // Down! / Get down!
      {
        line: 'down!',
        cam: { across: ['@', 'archer'], side: 0.2, x: -1.0, y: 0.6, view: 9, pitch: 0.4, ease: 0.25 },
        do: [
          { who: 'kael', say: 'Down!' },
          { unless: 'kael', who: '@', say: 'Get down!' },
          { at: 0.25, who: '@', state: 'dodge', dur: 0.9 },
          { at: 0.25, who: 'kael', state: 'dodge', dur: 0.9 },
          { at: 0.25, who: 'eiryn', state: 'dodge', dur: 0.9 },
          { at: 0.3, who: 'archer', release: true },
          { at: 0.35, arrow: { from: 'archer', to: '@', over: 4, speed: 17 }, slow: [0.35, 0.5] },
          { at: 1.6, who: 'spear', base: 'circle', face: '@' },
        ],
      },
    ],
  };

  // The quarry cave: the mouth is in the east, the deeper passage in the west.
  const c5Cave = {
    arena: 'cave',
    cast: [
      { id: '@', key: '@', x: 9.0, y: 0.6, f: W },
      { id: 'kael', key: 'kael', x: 9.4, y: -0.8, f: W, need: 'kael' },
      { id: 'eiryn', key: 'eirynMage', x: 9.6, y: 1.9, f: W, need: 'eiryn' },
      { id: 'archer', key: 'goblinArcher', x: -4.2, y: 0.4, f: 0.3 },
      { id: 'goblin', key: 'goblin', x: -1.4, y: -1.0, f: -2.6 },
      { id: 'goblin2', key: 'goblin', x: -1.7, y: 1.3, f: 2.6 },
    ],
    setup: [{ who: 'goblin', base: 'pickup' }, { who: 'goblin2', base: 'pickup' }],
    cam: { x: 7.6, y: 0.2, view: 4.2, ang: -1.9, pitch: 0.42, up: 0.6 },
    beats: [
      // At the cave mouth: the miller's grain... footprints.
      {
        cam: { x: 7.4, y: 0.1, view: 4.4, ang: -1.75, pitch: 0.42, up: 0.6, drift: 0.02, cut: true },
        do: [
          { who: '@', to: [7.8, 0.9] },
          { who: 'eiryn', to: [8.4, 2.0] },
          { who: 'kael', to: [7.2, -0.4] },
          { at: 1.1, who: 'kael', state: 'pickup', hold: true },
          { at: 1.1, who: '@', state: 'pickup', hold: true, unless: 'kael' },
        ],
      },
      // We go far enough to see what they've taken...
      {
        line: 'far enough',
        cam: { face: 'kael', side: 0.5, view: 3.2, up: 1.1, pitch: 0.42, ease: 0.7 },
        do: [
          { who: 'kael', base: 'idle', face: '@' },
          { at: 0.5, who: 'kael', say: 'We go far enough to see.' },
        ],
      },
      // Rotting food, wet hides, smoke...
      {
        cam: { x: -1.6, y: 0.2, view: 6.2, ang: 1.4, pitch: 0.42, drift: -0.02, ease: 3.2 },
        do: [
          { who: '@', base: 'idle', to: [5.4, 0.5], gait: 'creep' },
          { who: 'kael', to: [5.8, -0.9], gait: 'creep' },
          { who: 'eiryn', to: [6.0, 1.8], gait: 'creep' },
        ],
      },
      // For a moment nobody moves. Then the archer points and shouts.
      {
        cam: { x: 1.0, y: 0.3, view: 8.6, ang: -1.45, pitch: 0.46, ease: 0.8 },
        do: [
          { at: 0.9, who: 'goblin', icon: '!' },
          { at: 1.0, who: 'archer', face: '@', icon: '!' },
          { at: 1.3, cam: { face: 'archer', side: -0.4, view: 2.8, up: 1.1, pitch: 0.38, cut: true } },
          { at: 1.35, who: 'archer', state: 'cast', dur: 1.6, say: 'Kraaagh!', shake: 6 },
          { at: 1.8, who: 'goblin', base: 'idle', face: '@' },
          { at: 1.9, who: 'goblin2', base: 'idle', face: '@' },
          { at: 2.6, cam: { x: -0.6, y: 0.3, view: 9.6, ang: -1.45, pitch: 0.48, ease: 0.7 } },
          { at: 2.7, who: 'goblin', to: [0.2, -0.9], gait: 'run' },
          { at: 2.8, who: 'goblin2', to: [-0.2, 1.4], gait: 'run' },
        ],
      },
    ],
  };

  const c5Tracks = {
    arena: 'cave',
    cast: [
      { id: '@', key: '@', x: 1.6, y: 0.5, f: W },
      { id: 'kael', key: 'kael', x: 2.4, y: -1.0, f: W, need: 'kael' },
      { id: 'eiryn', key: 'eirynMage', x: 2.6, y: 1.8, f: W, need: 'eiryn' },
      { id: 'archer', key: 'goblinArcher', x: -4.4, y: 0.8, f: 0.4 },
      { id: 'goblin', key: 'goblin', x: -2.4, y: -0.8, f: W },
      { id: 'goblin2', key: 'goblin', x: -2.0, y: 1.2, f: W },
    ],
    setup: [{ who: 'archer', base: 'down' }],
    cam: { x: -3.0, y: 0.2, view: 7, ang: -1.5, pitch: 0.46 },
    beats: [
      // Two goblins bolt into the deeper passage...
      {
        cam: { x: -4.6, y: 0.0, view: 7, ang: -1.5, pitch: 0.46, drift: 0.02, cut: true },
        do: [
          { who: 'goblin', beaten: true, path: [[-6.8, -0.6], [-10.4, -0.5]], gait: 'run', speed: 5 },
          { at: 0.25, who: 'goblin2', beaten: true, path: [[-6.8, 0.2], [-10.4, -0.4]], gait: 'run', speed: 5 },
          { at: 2.4, who: 'goblin', hide: true },
          { at: 2.6, who: 'goblin2', hide: true },
        ],
      },
      // At least we found what they came for.
      {
        line: 'at least',
        cam: { face: 'eiryn', side: 0.4, view: 3.2, up: 1.0, pitch: 0.42, ease: 0.8 },
        do: [
          { who: 'goblin', hide: true }, { who: 'goblin2', hide: true },
          { who: 'eiryn', to: [3.6, -1.6], face: [4.6, -2.6] },
          { at: 1.0, who: 'eiryn', say: 'At least we found what they came for.' },
        ],
      },
      // The wet earth by the deeper passage is churned by the same large tracks...
      {
        line: 'large tracks',
        cam: { x: -7.4, y: -0.3, view: 5.2, ang: PI / 2 + 0.35, pitch: 0.38, up: 0.5, push: -0.12, ease: 1.4 },
        do: [
          { who: 'goblin', hide: true }, { who: 'goblin2', hide: true },
          { who: 'kael', to: [-7.0, -0.2], gait: 'creep', speed: 1.4 },
          { who: '@', to: [-6.0, 0.9], gait: 'creep', speed: 1.2 },
          { at: 2.2, who: 'kael', state: 'pickup', hold: true, face: [-10, -0.5] },
          { at: 2.2, who: '@', face: [-10, -0.5], unless: 'kael' },
        ],
      },
      // Eiryn, I think we're leaving.
      {
        line: 'leaving',
        cam: { face: 'kael', side: -0.5, view: 3.2, up: 1.0, pitch: 0.4, ease: 0.6 },
        do: [
          { who: 'kael', base: 'idle', face: [-10, -0.5] },
          { at: 0.3, who: 'kael', say: 'Eiryn, I think we’re leaving.' },
          { at: 0.3, unless: 'kael', who: '@', say: 'I think we’re leaving.', face: [-10, -0.5] },
          { at: 0.3, unless: 'kael', cam: { face: '@', side: -0.5, view: 3.2, up: 1.0, pitch: 0.4, ease: 0.6 } },
          { at: 1.2, who: 'kael', to: [-4.4, -0.4], gait: 'back', speed: 0.8 },
          { at: 1.2, who: '@', to: [-3.6, 0.9], gait: 'back', speed: 0.8 },
          { at: 2.2, shake: 3 },
        ],
      },
      // Kael. Those tracks.
      {
        line: 'those tracks',
        cam: { face: '@', side: 0.4, view: 3.2, up: 1.0, pitch: 0.4, ease: 0.6 },
        do: [
          { who: '@', face: [-10, -0.5] },
          { at: 0.3, who: '@', say: 'Kael. Those tracks.' },
          { at: 1.4, who: 'kael', to: [-4.4, -0.4], gait: 'back', speed: 0.8 },
          { at: 1.4, who: '@', to: [-3.6, 0.9], gait: 'back', speed: 0.8 },
        ],
      },
    ],
  };

  const c5Ogre = {
    arena: 'cave',
    scenario: 'ogre',
    cast: [
      { id: '@', key: '@', x: 1.0, y: 0.6, f: W },
      { id: 'kael', key: 'kael', x: 1.4, y: -0.9, f: W, need: 'kael' },
      { id: 'eiryn', key: 'eirynMage', x: 1.8, y: 1.9, f: W, need: 'eiryn' },
      { id: 'ogre', key: 'ogre', x: -10.6, y: -0.5, f: E, hidden: true },
    ],
    cam: { x: -6.0, y: -0.2, view: 6.4, ang: PI / 2 + 0.25, pitch: 0.38, up: 0.4 },
    beats: [
      // A thick hand closes round the edge of the passage...
      {
        cam: { x: -6.4, y: -0.3, view: 6.6, ang: PI / 2 + 0.25, pitch: 0.38, up: 0.5, push: -0.15, cut: true },
        do: [
          { who: '@', to: [3.0, 0.6], gait: 'back', speed: 0.7 },
          { who: 'kael', to: [3.4, -0.9], gait: 'back', speed: 0.7 },
          { who: 'eiryn', to: [3.8, 1.9], gait: 'back', speed: 0.7 },
          { at: 0.5, shake: 5, fx: { type: 'thunk', x: -9.4, y: -1.2 } },
          { at: 1.0, who: 'ogre', show: true, to: [-6.4, -0.3], speed: 0.9, gait: 'stride' },
          { at: 1.6, shake: 9, fx: { type: 'ko', x: -9.0, y: -0.4 } },
          { at: 2.8, shake: 9, fx: { type: 'ko', x: -7.4, y: -0.3 } },
          { at: 2.0, who: '@', icon: '!' },
          { at: 2.1, who: 'kael', icon: '!' },
          { at: 2.2, who: 'eiryn', icon: '!' },
        ],
      },
      // Its skin is the color of old, weathered stone. A heavy wooden beam...
      {
        cam: { face: 'ogre', side: 0.45, view: 5.2, up: 1.3, pitch: 0.34, drift: 0.03, ease: 0.9 },
        do: [
          { who: 'ogre', show: true, to: [-6.4, -0.3], speed: 0.9, gait: 'stride' },
          { at: 1.2, who: 'ogre', attack: { wind: 1.1, hold: true, tele: false }, shake: 4 },
        ],
      },
      // That was not in the contract.
      {
        line: 'not in the contract',
        cam: { face: '@', side: -0.6, focus: ['@', 'kael'], view: 4.0, up: 0.8, pitch: 0.42, ease: 0.7 },
        do: [
          { at: 0.3, who: 'kael', say: 'That was not in the contract.' },
          { at: 0.3, unless: 'kael', who: '@', say: 'That was not in the contract.' },
        ],
      },
      // Make it look at me.
      {
        line: 'make it look',
        cam: { behind: 'kael', side: 0.35, focus: ['kael', 'ogre'], view: 6.6, pitch: 0.36, up: 0.5, ease: 0.8 },
        do: [
          { who: 'kael', to: [0.4, -0.6], gait: 'stride' },
          { at: 0.7, who: 'kael', attack: { wind: 0.4, hold: true, tele: false } },
          { at: 0.8, who: 'kael', say: 'Make it look at me.' },
          { at: 1.6, who: 'kael', cutin: true },
          { at: 2.4, who: 'ogre', face: 'kael', turn: 3, shake: 6 },
        ],
      },
    ],
  };

  return {
    'p.tower': pTower,
    'p.light': pLight,
    'c1.voice': c1Voice,
    'c1.approach': 'same',
    'c1.after': c1After,
    'c1.trust': 'same',
    'c1.walk': c1Walk,
    'c5.path': c5Path,
    'c5.cave': c5Cave,
    'c5.tracks': c5Tracks,
    'c5.leave': 'same',
    'c5.ogre': c5Ogre,
  };
});
