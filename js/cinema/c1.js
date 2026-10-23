/*
 * Tower of Wishes — Chapter One as filmed scenes (js/render/cinema.js), 2026-10-22.
 * The tavern (TW-036–040), Kael going out (TW-041), the formation failing (TW-042) and his
 * decision (TW-043). Places: js/cinema/ashgate.js. One entry per line of each node's text.
 */
(function () {
  'use strict';
  const C = (window.TowCinema = window.TowCinema || {});
  const PI = Math.PI;

  // ------------------------------------------------------------ inside the tavern
  // Kael and the Guild spearwoman at neighbouring tables; the keeper behind the bar; regulars.
  const ROOM = () => [
    { id: 'kael', set: 'kael_unarmed', x: 1.05, y: 0, z: 1.0, dir: 'W' },
    { id: 'spear', set: 'spearwoman', x: -0.35, y: 0, z: 1.5, dir: 'E' },
    { id: 'keeper', set: 'tavern_keeper', x: -4.4, y: 0, z: 1.0, dir: 'E' },
    { id: 'p1', set: 'ashgate_m1', x: 2.9, y: 0, z: -1.1, dir: 'S' },
    { id: 'p2', set: 'ashgate_f1', x: -2.0, y: 0, z: -1.1, dir: 'S' },
    { id: 'p3', set: 'ashgate_m2', x: 0.2, y: 0, z: 3.1, dir: 'N' },
    { id: 'p4', set: 'ashgate_f2', x: 3.4, y: 0, z: 3.0, dir: 'N' },
    { id: 'p5', set: 'ashgate_m1', x: -3.5, y: 0, z: 2.4, dir: 'W' },
    { id: 'p6', set: 'ashgate_f2', x: -3.4, y: 0, z: -0.4, dir: 'W' },
  ];
  // everyone at the windows, faces lit purple
  const AT_WINDOWS = [['p3', -0.4, 5.1], ['p4', 3.2, 5.1], ['p1', 2.2, 4.5], ['p2', -2.9, 5.0], ['p5', -2.0, 4.4], ['p6', -3.8, 4.6]];
  const windowsPut = () => AT_WINDOWS.map(([who, x, z]) => ({ who, put: [x, 0, z], dir: 'N', anim: 'idle' }));

  C['c1.tavern'] = {
    set: 'tavern', vars: { glow: 0, door: 0 },
    actors: ROOM(),
    cam: { x: 3.8, y: 1.75, z: -3.4, yaw: -0.45, pitch: -0.08 },
    beats: [
      // At the next table, a Guild swordsman has decided the stew tastes burnt...
      { do: [{ cam: { x: 3.8, y: 1.75, z: -3.4, yaw: -0.45, pitch: -0.08, cut: true } },
        { at: 0.3, cam: { x: 1.9, y: 1.6, z: -1.4, yaw: -0.25, pitch: -0.05, ease: 6 } },
        { at: 2.5, who: 'p6', anim: 'idle_alt' }, { at: 3.5, who: 'keeper', anim: 'idle_alt' }] },
      // Around them the regulars murmur over their cups.  (across the room to the hearth)
      { cam: { x: -3.9, y: 1.9, z: 5.0, yaw: 2.55, pitch: -0.12, cut: true }, do: [{ who: 'kael', anim: 'idle' }, { at: 0.2, cam: { x: -3.4, y: 1.85, z: 4.4, yaw: 2.6, pitch: -0.1, ease: 6 } }] },
    ],
  };
  C['c1.formation'] = {
    set: 'tavern', vars: { glow: 0, door: 0 },
    actors: ROOM(),
    beats: [
      // A murmur runs through the tavern. One by one, the regulars drift to the window...
      // Far to the north, the light over the trees has turned purple.
      { do: [
        { cam: { x: 0.8, y: 1.5, z: -3.0, yaw: 0, pitch: 0.02, cut: true } },
        { at: 0.4, vars: { glow: [1, 5] } },
        ...AT_WINDOWS.map(([who, x, z], i) => ({ at: 0.6 + i * 0.4, who, to: [x, 0, z], speed: 1.05 })),
        { at: 3.2, who: 'keeper', dir: 'NE' }, { at: 3.6, who: 'spear', dir: 'N' }, { at: 4.2, who: 'kael', dir: 'N' },
        { at: 1.0, cam: { x: 0.8, y: 1.45, z: -2.2, yaw: 0, pitch: 0.04, ease: 6 } },
        // from the windows, the faces in the purple light
        { at: 7.0, cam: { x: 4.5, y: 1.65, z: 5.6, yaw: -2.45, pitch: -0.04, cut: true } },
        ...windowsPut().map((a) => Object.assign({ at: 7.0 }, a)),
        { at: 7.2, cam: { x: 4.3, y: 1.65, z: 5.4, yaw: -2.5, pitch: -0.04, ease: 5 } },
      ] },
    ],
  };
  C['c1.go'] = {
    set: 'tavern', vars: { glow: 1, door: 0 },
    actors: ROOM(),
    beats: [
      // (silent) Kael gets up and heads for the door before she can offer an opinion.  (the room at the windows,
      // lit purple; then across the room as he goes)
      { cam: { x: 0.35, y: 1.55, z: -1.3, yaw: 0.02, pitch: -0.02, cut: true },
        do: [...windowsPut(), { who: 'keeper', dir: 'NE' }, { who: 'kael', dir: 'W' }, { who: 'spear', dir: 'E' }, { at: 0.9, who: 'spear', anim: 'idle_alt' }, { at: 1.5, who: 'kael', dir: 'E' },
          { at: 2.2, cam: { x: -4.2, y: 1.8, z: 2.4, yaw: 1.42, pitch: -0.05, cut: true } },
          { at: 2.2, who: 'kael', to: [4.3, 0, 3.6], speed: 1.9 }, { at: 2.2, who: 'spear', anim: 'idle' }, { at: 3.0, who: 'spear', dir: 'E' }, { at: 3.8, vars: { door: [1, 0.5] } },
          { at: 2.4, cam: { x: -4.0, y: 1.8, z: 2.6, yaw: 1.5, pitch: -0.05, ease: 3 } }, { at: 5.8, who: 'kael', hide: true }, { at: 5.9, vars: { door: [0, 0.6] } }] },
    ],
  };

  // ------------------------------------------------------------ the street
  // Kael at the tavern door (x -5.5, z 0); townsfolk in the street, every face turned north.
  const FOLK = ['ashgate_m1', 'ashgate_f1', 'ashgate_m2', 'ashgate_f2'];
  const CROWD = [[-3.8, 5.2], [1.4, 4.6], [3.6, 2.2], [-0.8, 7.2], [2.6, 8.0], [-3.4, 9.4], [0.8, 10.8], [-1.8, 12.6], [3.8, 12.0], [4.2, -2.2], [-3.4, -3.6]];
  const STREET = (kx, kz, kdir) => [
    { id: 'kael', set: 'kael_unarmed', x: kx, y: 0, z: kz, dir: kdir },
    ...CROWD.map(([x, z], i) => ({ id: 'f' + i, set: FOLK[i % FOLK.length], x, y: 0, z, dir: i % 3 ? 'N' : i % 2 ? 'NE' : 'NW' })),
  ];
  // the formation: (js/cinema/ashgate.js GLYPH) centre (10, 150, 470), radius 120
  const AIM = { yaw: Math.atan2(10, 470), pitch: Math.atan2(148, 470) };

  C['c1.street'] = {
    set: 'ashgate', vars: { glyph: 1, stop: 0, shudder: 0, fail: 0 },
    actors: STREET(-5.1, 0, 'E'),
    beats: [
      // Outside, the street has gone quiet. Every face is turned north.
      { do: [
        // through his eyes: out of the door into the quiet street
        { cam: { pov: 'kael', eye: 1.62, yaw: PI / 2, pitch: -0.04, cut: true } },
        { who: 'kael', to: [-2.2, 0, 0.6], speed: 1.25, anim: 'walk' },
        // he turns where everyone is looking, and looks up
        { at: 1.4, cam: { pov: 'kael', eye: 1.62, yaw: 0.02, pitch: 0.02, ease: 1.4 } },
        { at: 3.0, cam: { pov: 'kael', eye: 1.62, yaw: AIM.yaw, pitch: AIM.pitch * 0.85, ease: 2.6 } },
        // the whole street under it
        { at: 6.6, who: 'kael', put: [-2.2, 0, 0.6], dir: 'N', anim: 'idle' },
        { at: 6.6, cam: { x: 0.6, y: 2.2, z: -9, yaw: 0.02, pitch: 0.2, cut: true } },
        { at: 6.8, cam: { x: 0.6, y: 2.4, z: -7.5, yaw: 0.02, pitch: 0.22, ease: 6 } },
      ] },
    ],
  };
  C['c1.clip'] = {
    set: 'ashgate', vars: { glyph: 1, stop: 0, shudder: 0, fail: 0 },
    actors: STREET(-2.2, 0.6, 'N'),
    beats: [
      // Above the distant treeline, purple light gathers in the air. Fine lines curve around a
      // bright center, ring inside ring, turning against one another.
      { do: [
        { cam: { x: 0, y: 1.7, z: 0, yaw: AIM.yaw, pitch: AIM.pitch, F: 3.0, cut: true } },
        { at: 0.2, cam: { x: 0, y: 1.7, z: 0, yaw: AIM.yaw, pitch: AIM.pitch, F: 3.5, ease: 7 } },
        // over the heads of the crowd
        { at: 6.0, cam: { x: -0.8, y: 1.85, z: -3.2, yaw: AIM.yaw, pitch: 0.24, F: 1.25, cut: true } },
        { at: 6.2, cam: { x: -0.8, y: 1.85, z: -2.6, yaw: AIM.yaw, pitch: 0.25, F: 1.3, ease: 5 } },
      ] },
      // One of the inner rings stops. The whole formation shudders, holds — and comes apart
      // over the trees.
      { do: [
        { cam: { x: 0, y: 1.7, z: 0, yaw: AIM.yaw, pitch: AIM.pitch, F: 2.4, cut: true } },
        { at: 0.6, vars: { stop: [1, 0.9] } },
        { at: 1.7, vars: { shudder: [1, 0.15] } }, { at: 1.7, shake: 2 },
        { at: 2.7, vars: { shudder: [0, 0.4] } },
        { at: 3.5, vars: { fail: [1, 3.2] } },
        // the faces in the street as the light goes out of them
        { at: 4.6, cam: { x: 0.4, y: 1.7, z: 13.5, yaw: PI, pitch: 0.02, cut: true } },
        { at: 4.8, cam: { x: 0.4, y: 1.7, z: 12.8, yaw: PI, pitch: 0.02, ease: 4 } },
        // and the empty sky over the trees
        { at: 8.0, cam: { x: 0, y: 1.8, z: -2, yaw: AIM.yaw, pitch: 0.18, F: 1.2, cut: true } },
      ] },
    ],
  };
  C['c1.look'] = {
    set: 'ashgate', vars: { glyph: 1, stop: 1, shudder: 0, fail: 1 },
    actors: STREET(-2.2, 0.6, 'N'),
    beats: [
      // (silent) Kael looks up at it, then starts north, toward the trees.
      { cam: { x: -1.95, y: 1.6, z: 3.1, yaw: PI + 0.08, pitch: -0.02, cut: true },
        do: [{ who: 'kael', dir: 'N' }, { at: 0.3, cam: { x: -1.95, y: 1.6, z: 2.8, yaw: PI + 0.08, pitch: -0.02, ease: 2 } },
          { at: 2.2, cam: { x: -2.0, y: 1.75, z: -3.5, yaw: 0.02, pitch: 0.03, cut: true } },
          { at: 2.2, who: 'kael', to: [-1.6, 0, 9], speed: 1.8, anim: 'walk' }, { at: 6.6, who: 'kael', to: [-0.8, 0, 40], speed: 5.6, anim: 'run' },
          { at: 3.4, who: 'f0', dir: 'NE' }, { at: 3.8, who: 'f3', dir: 'NW' }, { at: 4.2, who: 'f1', dir: 'NW' },
          { at: 2.4, cam: { x: -2.0, y: 1.75, z: -1.0, yaw: 0.02, pitch: 0.03, ease: 6 } }] },
    ],
  };
})();
