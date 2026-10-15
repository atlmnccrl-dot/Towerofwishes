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

  // ------------------------------------------------------------ the tavern
  // The tavern by the Guild office (arena 'tavern', js/render/world.js): the
  // back wall is north, with the window over Kael's table (x -4.1..-1.9),
  // the kitchen doorway (x 0.8..2.0) and the bar (x 2.8..6.4, y -3.2). The
  // street door is in the east wall at y -2; the hearth in the south-west.
  // Tables: Kael's (-3.0,-1.2), (2.4,1.6), the starter's (-3.0,2.7), a corner
  // table (-6.2,-3.5) and (6.2,2.5). Seated figures sit at the stool they
  // bring (state 'sit'); u.gest poses the hands (js/render/fighters.js).
  // Small talk in balloons is background life, not dialogue from the book.
  const SEAT = {
    kael: { x: -3.4, y: -2.05, f: S },
    spear: { x: -4.45, y: -1.15, f: E },
    p1: { x: -1.55, y: -1.25, f: W },
    p2: { x: 2.0, y: 0.95, f: S },
    p3: { x: 3.75, y: 1.55, f: W },
    p6: { x: 6.0, y: 1.85, f: S },
    me: { x: -2.5, y: 2.0, f: S }, // the starter's seat at the next table
    ren: { x: -0.75, y: -4.75, f: S + 0.35 },
    mara: { x: -6.2, y: -4.12, f: S },
    brannoc: { x: 3.3, y: -2.35, f: 2.3 },
  };
  const at = (k, extra) => Object.assign({ x: SEAT[k].x, y: SEAT[k].y, f: SEAT[k].f }, extra);
  // The room: everyone but the player's starter.
  const tavernFolk = () => [
    Object.assign({ id: 'kael', key: 'kael' }, at('kael')),
    Object.assign({ id: 'spear', key: 'spearwoman' }, at('spear')),
    Object.assign({ id: 'p1', key: 'patron' }, at('p1')),
    Object.assign({ id: 'p2', key: 'patron' }, at('p2')),
    Object.assign({ id: 'p3', key: 'patron' }, at('p3')),
    { id: 'p4', key: 'patron', x: 4.5, y: -2.4, f: N + 0.3 },
    { id: 'p5', key: 'patron', x: 5.6, y: -2.45, f: N - 0.4 },
    Object.assign({ id: 'p6', key: 'patron' }, at('p6')),
    { id: 'cook', key: 'cook', x: 1.4, y: -4.7, f: S },
  ];
  const seated = (id, gest, prop) => ({ who: id, base: 'sit', set: { gest, prop: prop === undefined ? undefined : prop } });
  const folkSetup = () => [
    seated('kael', 'eat', 'spoon'), { who: 'kael', set: { stow: true, leanAt: [-3.95, -2.25] } },
    seated('spear', 'eat', 'spoon'), seated('p1', 'eat', 'spoon'),
    seated('p2', 'sip', 'cup'), seated('p3', 'gesture'), seated('p6', 'sip', 'tankard'),
    { who: 'p4', set: { gest: 'cup', prop: 'tankard' } }, { who: 'p5', set: { gest: 'sip', prop: 'cup' } },
  ];
  // Background life: cups raised, laughs, the cook doing her rounds.
  const chatter = (talk) => ({
    every: 14,
    do: [
      { at: 0.4, who: 'p2', set: { gest: 'raise' } },
      talk && { at: 0.5, who: 'p2', say: 'Another round!' },
      { at: 1.8, who: 'p2', set: { gest: 'sip' } },
      { at: 1.0, who: 'p3', set: { gest: 'laugh' } },
      { at: 2.6, who: 'p3', set: { gest: 'gesture' } },
      { at: 2.2, who: 'p4', set: { gest: 'laugh' } },
      talk && { at: 2.3, who: 'p5', say: 'Ha! Not a chance.' },
      { at: 3.6, who: 'p4', set: { gest: 'cup' } },
      { at: 4.0, who: 'cook', to: [1.6, -0.2], speed: 1.3 },
      { at: 5.6, who: 'cook', face: 'p2' },
      talk && { at: 5.8, who: 'cook', say: 'Bowls up.' },
      { at: 5.9, who: 'cook', set: { gest: 'present' } },
      { at: 7.2, who: 'cook', set: { gest: null }, face: null },
      { at: 7.4, who: 'cook', path: [[2.2, -2.0], [1.4, -4.7]], speed: 1.3 },
      { at: 10.8, who: 'cook', face: S },
      { at: 6.2, who: 'p1', set: { gest: 'laugh' } },
      talk && { at: 6.3, who: 'p1', say: '…and the cart went over!' },
      { at: 7.0, who: 'spear', set: { gest: 'laugh' } },
      { at: 8.6, who: 'spear', set: { gest: 'eat' } },
      { at: 8.8, who: 'p1', set: { gest: 'eat' } },
      { at: 8.0, who: 'p6', set: { gest: 'raise' } },
      { at: 9.4, who: 'p6', set: { gest: 'sip' } },
      { at: 9.0, who: 'kael', set: { gest: 'chin' } },
      talk && { at: 9.2, who: 'kael', say: 'Mm.' },
      { at: 11.5, who: 'kael', set: { gest: 'eat' } },
      { at: 11.0, who: 'p5', set: { gest: 'laugh' } },
      { at: 12.5, who: 'p5', set: { gest: 'sip' } },
    ].filter(Boolean),
  });

  // Character select: the three starters each in their corner of the tavern.
  // Looking at one brings them forward into the light (focus); the one you
  // looked at before goes back to their spot.
  // The spot in front of Kael's table where the camera (from the south-west,
  // looking past the starter at Kael, the spearwoman and the window) frames
  // them in the gap between the select menu and the info panel.
  const FRONT = [-1.0, 1.8], TO_CAM = 0.82;
  const closeUp = (who) => ({ focus: who, dx: 0.41, dy: -0.38, ang: 0.75, view: 3.6, up: 4.2, pitch: 0.28, ease: 1.5 });
  const pSelect = {
    arena: 'tavern',
    cast: tavernFolk().concat([
      Object.assign({ id: 'ren', key: 'ren' }, at('ren')),
      Object.assign({ id: 'mara', key: 'mara' }, at('mara')),
      Object.assign({ id: 'brannoc', key: 'brannoc' }, at('brannoc')),
    ]),
    setup: folkSetup().concat([
      { who: 'ren', set: { gest: 'lean' } },
      { who: 'mara', base: 'sit', set: { gest: 'notes', prop: null } },
      { who: 'brannoc', set: { gest: 'cup', prop: 'tankard' } },
    ]),
    cam: { x: -1.6, y: -0.6, view: 7.6, ang: 0.42, pitch: 0.46, dx: 0.9, dy: -0.5 },
    ambient: chatter(true),
    safe: [0.28, 0.6], // balloons stay between the select menu and the info panel
    focus: {
      ren: {
        cam: closeUp('ren'),
        do: [
          { who: 'ren', set: { gest: null }, face: null, path: [[-0.7, -3.2], [-0.4, 0.3]], gait: 'stride', speed: 2.8 },
          { at: 1.85, who: 'ren', to: FRONT, gait: 'dash', burst: 'dust' },
          { at: 2.1, who: 'ren', face: TO_CAM, burst: 'dust' },
          { at: 2.5, who: 'ren', attack: { wind: 0.25, hold: true, tele: false } },
        ],
        back: [
          { who: 'ren', state: 'idle', hold: true, face: null, path: [[-0.4, 0.3], [-0.7, -3.2], [SEAT.ren.x, SEAT.ren.y]], gait: 'walk', speed: 2.2 },
          { at: 3.0, who: 'ren', face: SEAT.ren.f, set: { gest: 'lean' } },
        ],
      },
      mara: {
        cam: closeUp('mara'),
        do: [
          { who: 'mara', base: 'idle', set: { gest: null }, face: null, path: [[-5.3, -3.2], [-5.3, 0.4], FRONT], gait: 'stride', speed: 3.0 },
          { at: 3.25, who: 'mara', face: TO_CAM },
          { at: 3.4, who: 'mara', state: 'cast', hold: true },
        ],
        back: [
          { who: 'mara', state: 'idle', hold: true, face: null, path: [[-5.3, 0.4], [-5.3, -3.2], [SEAT.mara.x, SEAT.mara.y]], gait: 'walk', speed: 2.6 },
          { at: 3.8, who: 'mara', face: S, base: 'sit', set: { gest: 'notes' } },
        ],
      },
      brannoc: {
        cam: closeUp('brannoc'),
        do: [
          { who: 'brannoc', set: { gest: null }, face: null, path: [[2.4, -1.0], [0.9, 0.7], FRONT], gait: 'stride', speed: 2.3 },
          { at: 2.7, who: 'brannoc', face: TO_CAM },
          { at: 2.9, who: 'brannoc', set: { gest: 'raise' }, shake: 2 },
          { at: 4.4, who: 'brannoc', set: { gest: 'hips' } },
        ],
        back: [
          { who: 'brannoc', set: { gest: 'cup' }, face: null, path: [[0.9, 0.7], [2.4, -1.0], [SEAT.brannoc.x, SEAT.brannoc.y]], gait: 'walk', speed: 2.0 },
          { at: 3.4, who: 'brannoc', face: SEAT.brannoc.f },
        ],
      },
    },
    // 'p.who' keeps this stage: the starter speaks, then goes to sit down.
    beats: [
      {
        cam: { focus: '@', ang: 0.75, view: 3.0, up: 3.2, pitch: 0.3, drift: -0.01, ease: 0.8 },
        do: [
          { who: '@', state: 'idle', hold: true, set: { gest: null }, face: TO_CAM },
          { at: 0.4, who: '@', say: '$' },
        ],
      },
      {
        cam: { x: -2.2, y: 0.4, view: 5.6, ang: -0.18, pitch: 0.46, drift: 0.008, ease: 1.6 },
        do: [
          { who: '@', state: 'idle', hold: true, face: null, path: [[-1.6, 1.5], [SEAT.me.x, 1.55], [SEAT.me.x, SEAT.me.y]], gait: 'walk', speed: 1.7 },
          { at: 2.3, who: '@', face: S, base: 'sit', set: { gest: 'eat', prop: 'spoon' } },
        ],
      },
    ],
  };

  // The cast of the tavern scenes: the room, the starter at the next table,
  // and the two starters you didn't pick, back in their corners.
  const tavernCast = () => tavernFolk().concat([
    Object.assign({ id: '@', key: '@' }, at('me')),
    Object.assign({ id: 'ren', key: 'ren', notStarter: true }, at('ren')),
    Object.assign({ id: 'mara', key: 'mara', notStarter: true }, at('mara')),
    Object.assign({ id: 'brannoc', key: 'brannoc', notStarter: true }, at('brannoc')),
  ]);
  const tavernSetup = () => folkSetup().concat([
    { who: '@', base: 'sit', set: { gest: 'eat', prop: 'spoon' } },
    { who: 'ren', set: { gest: 'lean' } },
    { who: 'mara', base: 'sit', set: { gest: 'notes' } },
    { who: 'brannoc', set: { gest: 'cup', prop: 'tankard' } },
  ]);

  const c1Tavern = {
    arena: 'tavern',
    cast: tavernCast(),
    setup: tavernSetup(),
    cam: { x: -1.6, y: 0.6, view: 7.6, ang: -0.28, pitch: 0.5 },
    ambient: chatter(false),
    beats: [
      // At the next table, a Guild swordsman has decided the stew tastes burnt...
      {
        cam: { x: -1.8, y: -0.7, view: 7.4, ang: -0.28, pitch: 0.44, push: -0.45, drift: 0.02, cut: true },
        do: [
          { at: 2.2, cam: { face: 'kael', side: 0.22, view: 2.6, up: 1.0, pitch: 0.4, drift: 0.015, ease: 1.3 } },
          { at: 3.0, who: 'kael', set: { gest: 'table' } },
          { at: 3.4, who: 'kael', icon: '…' },
          { at: 3.9, who: 'spear', face: 'kael' },
          { at: 4.1, who: 'p1', face: 'kael', set: { gest: 'table' } },
        ],
      },
      // "It's smoked pepper. They've been putting it in since spring."
      {
        cam: { face: 'spear', side: -0.35, view: 2.5, up: 1.0, pitch: 0.4, drift: -0.02, ease: 0.6 },
        do: [
          { who: 'kael', set: { gest: 'table' } },
          { who: 'spear', face: 'kael', set: { gest: 'spoon' } },
          { at: 0.3, who: 'spear', say: 'It’s smoked pepper.' },
          { at: 1.9, who: 'spear', say: 'Since spring.' },
        ],
      },
      // "Then they've been burning it since spring."
      {
        cam: { face: 'kael', side: 0.3, view: 2.5, up: 1.0, pitch: 0.4, ease: 0.5 },
        do: [
          { who: 'spear', set: { gest: 'table' } },
          { who: 'kael', face: 'spear' },
          { at: 0.3, who: 'kael', say: 'Then they’ve been burning it since spring.' },
          // ...the cook comes out of the kitchen behind him
          { at: 0.6, who: 'cook', path: [[1.0, -3.7], [-1.4, -3.6]], speed: 1.2 },
          { at: 1.8, who: 'p1', set: { gest: 'choke' }, icon: '!' },
          { at: 1.9, cam: { face: 'p1', side: -0.25, view: 2.3, up: 0.95, pitch: 0.4, cut: true } },
          { at: 1.95, shake: 3 },
          { at: 3.2, who: 'p1', set: { gest: 'drink', prop: 'cup' } },
          { at: 3.3, cam: { face: 'kael', side: 0.1, view: 4.2, up: 1.15, pitch: 0.42, ease: 1.0 } },
        ],
      },
      // "You know the cook can hear you."
      {
        cam: { face: 'spear', side: 0.2, view: 2.4, up: 1.0, pitch: 0.4, ease: 0.5 },
        do: [
          { who: 'p1', set: { gest: 'table', prop: 'spoon' } },
          { who: 'cook', to: [-1.4, -3.6] },
          { at: 0.3, who: 'spear', say: 'You know the cook can hear you.' },
          { at: 1.1, who: 'spear', face: [-3.3, -3.0] },
          { at: 1.7, cam: { face: 'kael', side: -0.05, view: 2.2, up: 1.05, pitch: 0.4, cut: true } },
          { at: 1.7, who: 'kael', face: S },
          { at: 1.8, who: 'cook', to: [-3.3, -2.95], speed: 1.8, set: { prop: 'ladle', gest: 'hips' } },
          { at: 2.9, who: 'cook', face: 'kael' },
          { at: 2.8, who: 'kael', icon: '!', freeze: 0.18 },
          { at: 3.1, cam: { face: 'kael', side: 0.05, view: 4.3, up: 1.6, pitch: 0.32, ease: 1.1 } },
        ],
      },
      // "Distinctive. I was telling them your stew has a very distinctive flavor."
      {
        cam: { face: 'kael', side: 0.55, view: 2.5, up: 1.15, pitch: 0.38, ease: 0.5 },
        do: [
          { who: 'cook', to: [-3.3, -2.95], face: 'kael', set: { prop: 'ladle', gest: 'hips' } },
          { who: 'kael', face: 'cook', turn: 1.6 },
          { at: 0.6, who: 'kael', say: 'Distinctive.', sayT: 1.6 },
          { at: 1.5, who: 'spear', set: { gest: 'chin' } },
          { at: 2.2, who: 'kael', say: 'A very distinctive flavor.' },
          { at: 2.6, who: 'p1', icon: '…' },
        ],
      },
      // "Then you'll have no trouble finishing it."
      {
        cam: { face: 'cook', side: -0.25, view: 3.1, up: 1.3, pitch: 0.34, drift: 0.02, ease: 0.5 },
        do: [
          { who: 'cook', face: 'kael' },
          { at: 0.3, who: 'cook', say: 'Then you’ll have no trouble finishing it.' },
          { at: 1.6, who: 'cook', set: { gest: 'present' } },
          { at: 1.9, fx: { type: 'thunk', x: -3.4, y: -1.5 }, shake: 2 },
          { at: 2.3, cam: { focus: ['kael', 'cook', 'spear'], view: 4.4, ang: -0.2, pitch: 0.46, up: 0.5, ease: 1.0 } },
          { at: 2.5, who: 'kael', icon: '…', set: { gest: 'eat' } },
          { at: 2.7, who: 'spear', set: { gest: 'laugh' } },
          { at: 2.8, who: 'p1', set: { gest: 'laugh' } },
          { at: 3.2, who: 'cook', set: { gest: null }, face: null, path: [[-1.4, -3.6], [1.0, -3.7], [1.4, -4.7]], speed: 1.3 },
          { at: 6.4, who: 'cook', face: S, set: { prop: 'bread' } },
          { at: 5.0, who: 'spear', set: { gest: 'eat' } },
        ],
      },
    ],
  };

  // Above the treeline a purple formation; Kael goes to look.
  const c1Formation = {
    arena: 'tavern',
    cast: tavernCast(),
    setup: tavernSetup().concat([
      { who: 'kael', set: { gest: 'sip', prop: 'cup' } },
      { who: 'cook', set: { prop: 'ladle' } },
    ]),
    cam: { x: -3.0, y: -9.4, view: 1.9, ang: 0, pitch: 0.36 },
    beats: [
      // Above the distant treeline, purple light gathers in the air...
      {
        cam: { x: -3.0, y: -9.4, view: 1.9, ang: 0, pitch: 0.36, push: 0.12, cut: true },
        do: [
          { glow: [1, 3.2] },
          { at: 2.2, who: 'p2', base: 'idle', set: { gest: 'point' }, face: [-3, -5.2], icon: '!' },
          { at: 2.3, cam: { x: -0.6, y: -1.2, view: 7.2, ang: -0.22, pitch: 0.46, drift: 0.01, ease: 1.2 } },
          { at: 2.8, who: 'p4', set: { gest: null }, path: [[2.0, -3.6], [-2.4, -4.45]], speed: 2.4, face: null },
          { at: 3.0, who: 'p5', set: { gest: null }, path: [[2.0, -3.9], [-3.7, -4.5]], speed: 2.4, face: null },
          { at: 3.1, who: 'p3', base: 'idle', set: { gest: null }, path: [[0.6, -2.4], [-1.6, -4.3]], speed: 2.2, face: null },
          { at: 3.4, who: 'p6', base: 'idle', set: { gest: null }, path: [[2.8, -0.4], [-4.4, -4.3]], speed: 2.6, face: null },
          { at: 3.2, who: 'kael', set: { gest: 'cup' }, face: [-3, -5.2], turn: 2 },
          { at: 3.3, who: 'spear', face: [-3, -5.2], set: { gest: 'table' } },
          { at: 3.5, who: 'p1', face: [-3, -5.2], set: { gest: 'table' } },
          { at: 4.2, who: 'cook', face: [-3, -5.2], icon: '?' },
          { at: 5.4, who: 'p4', face: [-3, -6] }, { at: 5.8, who: 'p5', face: [-3, -6] }, { at: 5.6, who: 'p3', face: [-3, -6] }, { at: 6.4, who: 'p6', face: [-3, -6] },
        ],
      },
      // The starter: "That's not a Guild exercise." (varies)
      {
        cam: { focus: '@', ang: 1.22, view: 3.0, up: 1.0, pitch: 0.4, ease: 0.7 },
        do: [
          { glow: [1, 0.1] },
          { who: 'p4', to: [-2.4, -4.45], face: [-3, -6] }, { who: 'p5', to: [-3.7, -4.5], face: [-3, -6] },
          { who: 'p3', to: [-1.6, -4.3], face: [-3, -6] }, { who: 'p6', to: [-4.4, -4.3], face: [-3, -6] },
          { who: '@', state: 'idle', hold: true, set: { gest: null }, face: null, path: [[-1.0, 1.4], [-1.2, -3.0]], speed: 2.2 },
          { at: 2.3, who: '@', face: [-3, -5.2] },
          { at: 2.6, cam: { focus: '@', ang: 1.22, view: 2.5, up: 1.05, pitch: 0.38, ease: 0.7 } },
          { at: 2.8, who: '@', say: '$' },
        ],
      },
      // One of the inner rings stops. The whole formation shudders, holds —
      // and comes apart over the trees.
      {
        cam: { x: -3.0, y: -2.2, view: 4.6, ang: 0, pitch: 0.38, up: 1.3, push: -0.1, ease: 0.6 },
        do: [
          { who: '@', to: [-1.2, -3.0], face: [-3, -5.2] },
          { glow: [1.2, 0.3] },
          { at: 0.9, rumble: [2, 0.9] },
          { at: 1.9, glow: [1.5, 0.08], light: ['205,180,255', 0.75, 0.06], shake: 10, slow: [0.35, 0.5] },
          { at: 2.0, light: [null, 0, 1.4] },
          { at: 2.0, who: 'p4', icon: '!' }, { at: 2.05, who: 'p3', icon: '!' }, { at: 2.1, who: 'kael', icon: '!' }, { at: 2.15, who: '@', icon: '!' },
          { at: 2.3, glow: [0.25, 3.2] },
          { at: 2.6, cam: { focus: 'kael', ang: 0.6, view: 2.6, up: 1.0, pitch: 0.38, ease: 1.4 } },
        ],
      },
      // "I'm going outside."
      {
        cam: { focus: 'kael', ang: 0.6, view: 2.5, up: 1.0, pitch: 0.4, ease: 0.6 },
        do: [
          { glow: [0.25, 0.1] },
          { at: 0.3, who: 'kael', set: { gest: 'table', prop: null } },
          { at: 0.5, fx: { type: 'thunk', x: -3.35, y: -1.6 } },
          { at: 0.9, who: 'kael', base: 'idle', set: { gest: null }, to: [-3.3, -2.6], speed: 1.2, face: E, turn: 4 },
          { at: 1.1, cam: { focus: 'kael', ang: Math.PI / 2 - 0.3, view: 2.8, up: 1.3, pitch: 0.4, ease: 0.6 } },
          { at: 1.3, who: 'kael', say: 'I’m going outside.' },
        ],
      },
      // "You're doing that thing with your face..."
      {
        cam: { face: 'spear', side: -0.3, view: 2.5, up: 1.0, pitch: 0.4, ease: 0.5 },
        do: [
          { who: 'kael', base: 'idle', set: { gest: null }, to: [-3.3, -2.6] },
          { who: 'spear', face: 'kael', set: { gest: 'tip', prop: null } },
          { at: 0.4, who: 'spear', say: '$' },
          { at: 2.2, who: 'spear', say: 'Before you run at a problem.' },
        ],
      },
      // "That's why I'm going to see."
      {
        cam: { across: ['spear', 'kael'], side: 0.25, focus: ['kael', 'spear'], view: 3.6, up: 0.7, pitch: 0.42, ease: 0.6 },
        do: [
          { who: 'spear', set: { gest: 'tip' } },
          { who: 'kael', to: [-3.8, -2.55], speed: 1.2, face: [-3.95, -2.25] },
          { at: 0.5, who: 'kael', state: 'pickup', dur: 0.5 },
          { at: 0.85, who: 'kael', set: { leanAt: null, stow: true } },
          { at: 1.2, who: 'kael', face: 'spear', say: 'That’s why I’m going to see.' },
        ],
      },
      // He sets off before she can offer an opinion.
      {
        cam: { behind: 'kael', side: 0.2, x: 4.0, y: -2.2, view: 5.6, pitch: 0.4, up: 0.5, ease: 0.8 },
        do: [
          { who: 'kael', set: { leanAt: null, stow: true }, face: null, path: [[-2.0, -2.9], [3.0, -2.15], [9.8, -2.0]], gait: 'stride', speed: 2.8 },
          { at: 0.2, who: 'spear', set: { gest: 'gesture' }, face: 'kael' },
          { at: 0.5, who: 'spear', icon: '…' },
          { at: 0.5, cam: { focus: 'kael', ang: -0.35, view: 5.0, pitch: 0.42, up: 0.6, ease: 1.6 } },
          { at: 2.4, cam: { x: 6.2, y: -2.1, ang: -0.5, view: 5.2, pitch: 0.42, up: 0.6, ease: 1.2 } },
          { at: 1.6, who: '@', face: 'kael' },
          { at: 3.4, door: [1, 0.35] },
          { at: 4.3, who: 'kael', hide: true },
          { at: 4.6, door: [0.3, 0.6] },
        ],
      },
      // The starter: "Wait. I'm coming with you." (varies)
      {
        cam: { face: '@', side: -0.2, view: 2.5, up: 1.0, pitch: 0.4, ease: 0.6 },
        do: [
          { who: 'kael', hide: true },
          { who: '@', face: [8.6, -2] },
          { at: 0.3, who: '@', say: '$' },
          { at: 1.2, who: 'spear', face: '@' },
        ],
      },
      // You leave your stew and go after him.
      {
        cam: { x: 4.6, y: -2.2, view: 5.4, ang: -0.55, pitch: 0.42, up: 0.6, ease: 0.9 },
        do: [
          { who: '@', face: null, path: [[1.0, -2.6], [9.8, -2.0]], gait: 'run', speed: 3.6 },
          { at: 1.6, door: [1, 0.3] },
          { at: 2.9, who: '@', hide: true },
          { at: 2.8, who: 'spear', set: { gest: 'eat' }, icon: '…' },
          { at: 3.3, door: [0, 0.5] },
        ],
      },
    ],
  };

  // The run: from the town's edge to the woods, flat out. The North Road:
  // the runners come in from the west and head for the trees in the east.
  const sprint = (x0, y0, x1, y1, sp) => [{ who: 'kael', put: [x0, y0], to: [x1, y1], gait: 'sprint', speed: sp, trail: 'dust' }, { who: '@', put: [x0 - 0.7, y0 + 1.0], to: [x1 - 0.5, y1 + 1.0], gait: 'sprint', speed: sp * 0.98, trail: 'dust' }];
  const later = (t, list) => list.map((a) => Object.assign({ at: t }, a));
  const c1Run = {
    arena: 'road',
    cast: [
      { id: 'kael', key: 'kael', x: -14, y: 0.2, f: E },
      { id: '@', key: '@', x: -14.7, y: 1.2, f: E },
    ],
    setup: [{ who: 'kael', set: { stow: true } }],
    cam: { x: -7, y: 0.6, view: 4.8, ang: 0.1, pitch: 0.34, up: 0.5 },
    beats: [
      // The road curves north past the market square... toward the woods.
      {
        loop: 6.4,
        cam: { x: -6.5, y: 0.6, view: 4.6, ang: 0.15, pitch: 0.32, up: 0.6, cut: true },
        do: [
          { cam: { x: -6.5, y: 0.6, view: 4.6, ang: 0.15, pitch: 0.32, up: 0.6, cut: true } },
          ...sprint(-15, 0.2, 13, 0.4, 9),
          { speed: [0, 0] }, { whip: [0, 0] },
          { at: 0.55, burst: 'dust', who: 'kael', shake: 4 },
          // low side-on tracking: trunks and speed lines tear past
          { at: 0.9, cam: { focus: ['kael', '@'], dx: 0.9, ang: 0, view: 3.4, up: 0.55, pitch: 0.3, cut: true } },
          { at: 0.9, speed: [1, 0.3, 'h'], whip: [0.9, 0.2, -1] },
          { at: 2.5, who: 'kael', cutin: true },
          // head-on, low: they run at the lens
          ...later(3.1, sprint(-11, 0.2, 13, 0.4, 9)),
          { at: 3.1, cam: { x: 3.5, y: 0.7, ang: Math.PI / 2, view: 4.2, up: 0.6, pitch: 0.3, cut: true } },
          { at: 3.1, speed: [1, 0.1, 'r'], whip: [0, 0.2] },
          { at: 4.2, who: '@', burst: 'leaf', burstN: 10 },
          { at: 4.6, cam: { focus: ['kael', '@'], ang: Math.PI / 2, view: 3.0, up: 0.7, pitch: 0.3, ease: 0.3 } },
          { at: 5.0, shake: 5 },
        ],
      },
      // The starter: "Keep up." (varies)
      {
        loop: 5.6,
        cam: { focus: ['kael', '@'], dx: 0.4, ang: -0.35, view: 2.9, up: 0.75, pitch: 0.32, cut: true },
        do: [
          { cam: { focus: ['kael', '@'], dx: 0.4, ang: -0.35, view: 2.9, up: 0.75, pitch: 0.32, cut: true } },
          ...sprint(-14, -0.6, 14, -0.4, 8.6),
          { speed: [0.9, 0.2, 'h'] }, { whip: [0.8, 0.2, -1] },
          { at: 0.5, who: '@', say: '$' },
          { at: 1.5, who: 'kael', icon: '!' },
          { at: 2.1, who: '@', cutin: true },
          { at: 2.7, cam: { focus: '@', dx: 0.3, ang: 0.4, view: 2.4, up: 0.8, pitch: 0.3, cut: true } },
          { at: 2.8, who: '@', burst: 'leaf', burstN: 14 },
          { at: 3.6, cam: { focus: ['kael', '@'], dx: 1.2, ang: -0.1, view: 3.6, up: 0.6, pitch: 0.3, ease: 0.6 } },
        ],
      },
      // Behind them, the ordinary noise of the town fades, replaced by wind
      // moving through the first trees.
      {
        cam: { behind: 'kael', x: 7.5, y: 0.6, view: 5.4, up: 0.9, pitch: 0.3, cut: true },
        do: [
          { sky: [1, 0.2] },
          { who: 'kael', put: [-4, 0.3], path: [[6.0, 0.6], [9.6, 1.0]], gait: 'sprint', speed: 7.5, trail: 'dust', face: null },
          { who: '@', put: [-4.8, 1.4], path: [[5.4, 1.7], [9.0, 2.0]], gait: 'sprint', speed: 7.3, trail: 'dust', face: null },
          { speed: [0.7, 0.1, 'h'] }, { whip: [0, 0.1] },
          { at: 0.3, speed: [0, 1.4] },
          { at: 0.6, sky: [0.15, 3.6] },
          { at: 1.4, who: 'kael', trail: null, burst: 'dust' },
          { at: 1.5, who: '@', trail: null, burst: 'dust' },
          { at: 1.5, who: 'kael', to: [10.4, 1.1], gait: 'walk', speed: 1.2 },
          { at: 1.6, who: '@', to: [9.8, 2.1], gait: 'walk', speed: 1.2 },
          { at: 1.7, cam: { behind: 'kael', side: 0.25, x: 11.5, y: 1.6, view: 4.0, up: 0.8, pitch: 0.32, push: -0.08, ease: 1.8 } },
          { at: 3.0, who: 'kael', set: { gest: 'point' } },
          { at: 3.2, who: 'kael', icon: '!' },
          { at: 3.3, who: '@', icon: '!' },
          { at: 3.8, who: 'kael', set: { gest: null } },
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
    'p.select': pSelect,
    'p.who': 'same',
    'c1.tavern': c1Tavern,
    'c1.formation': c1Formation,
    'c1.run': c1Run,
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
