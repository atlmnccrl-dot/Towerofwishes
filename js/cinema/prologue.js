/*
 * Tower of Wishes — the prologue as filmed scenes (js/render/cinema.js), 2026-10-22.
 * One entry per line of the scene's text (js/story.js); `at` is seconds into the line.
 * The rooftop chase is the author's own direction (2026-10-22): Eiryn runs and leaps roof to
 * roof, looks back, and Alric is chasing her.
 */
(function () {
  'use strict';
  const C = (window.TowCinema = window.TowCinema || {});
  const FOLK = ['erdra_m1', 'erdra_f1', 'erdra_m2', 'erdra_f2', 'erdra_baker', 'erdra_vendor'];

  // ------------------------------------------------------------ the square, evening
  // World: x east, z north (the Tower is far up the street at x ~ 8); the leads cross the
  // front of the plaza at z ~ 1.4, the crowd moves behind them.
  // ------------------------------------------------------------ the opening: the world before
  // The author's pick (2026-10-23): the market at dusk under the Tower, the lamps lit up the street
  // toward it, climbers going up to its gate, the promise; then over the roofs to Eiryn (p.roof).
  // Places: the square (js/cinema/sets.js), the gate (js/cinema/gate.js), the roofs.
  // [id, set, x, z]: c1 leads; on the steps each stands at LANDZ(i)
  const CLIMBERS = [['c1', 'guild_adventurer', -1.0, 72.8], ['c2', 'spearwoman', 1.2, 71.4], ['c3', 'master_knight', -0.2, 70.2], ['c4', 'poacher', 2.0, 68.8], ['c5', 'hooded_follower', -1.8, 67.4], ['c6', 'frost_knight_b', 0.6, 66]];
  const LANDZ = (i) => 83.6 - i * 0.6, LANDY = (i) => (LANDZ(i) >= 81.5 ? 3 : 2.5);
  C['p.lore'] = {
    set: 'square', vars: { lamps: 0, gate: 0.5 },
    actors: [
      { id: 'musician', set: 'erdra_musician', x: 1.2, y: 0, z: 4.4, dir: 'S' },
      { id: 'vendor', set: 'erdra_vendor', x: -9, y: 0, z: 3.6, dir: 'S' },
      { id: 'baker', set: 'erdra_baker', x: 13, y: 0, z: 6.6, dir: 'S' },
      { id: 'kid1', set: 'rival_kid', x: -24, y: 0, z: 1.5, dir: 'E' },
      { id: 'kid2', set: 'rival_kid', x: -27, y: 0, z: 2.6, dir: 'E' },
      { id: 'lamplighter', set: 'erdra_m2', x: 6.4, y: 0, z: 25.4, dir: 'W' },
      ...CLIMBERS.map(([id, set, x, z]) => ({ id, set, x, y: 0, z: z - 6, dir: 'N', hidden: true })),
    ],
    crowd: [
      { on: 'square', n: 30, sets: FOLK, x: [-34, 38], z: [2.6, 14], still: 0.3 },
      { on: 'gate', n: 12, sets: FOLK, x: [-28, -7], z: [12, 64], still: 0.85 },
      { on: 'gate', n: 12, sets: FOLK, x: [7, 28], z: [12, 64], still: 0.85 },
    ],
    cam: { x: 8, y: 120, z: -40, yaw: 0.09, pitch: 0.16 },
    beats: [
      // (silent) Down out of the clouds, the Tower far off, into the market at dusk; a child runs to the fruit stall.
      { do: [{ cam: { x: 8, y: 120, z: -40, yaw: 0.09, pitch: 0.16, cut: true } },
        { at: 0.6, cam: { x: 6, y: 3.2, z: -10, yaw: 0.04, pitch: -0.02, ease: 9.5 } },
        { at: 6.2, who: 'kid1', to: [-8.3, 0, 2.2], speed: 4.2, anim: 'run', then: 'idle' }, { at: 6.9, who: 'kid2', to: [24, 0, 4], speed: 4.0, anim: 'run' },
        { at: 10.6, who: 'kid1', dir: 'N' }, { at: 10.6, who: 'vendor', dir: 'SE' }] },
      // Fruit seller: "Reach the summit, and you can make a wish."  (at the stall: the child points up at
      // the Tower; then the camera looks where they point)
      { do: [{ cam: { x: -4.6, y: 1.35, z: -3.6, yaw: -0.52, pitch: 0.05, F: 1.15, cut: true } },
        { who: 'kid1', put: [-8.3, 0, 2.2], dir: 'NE' }, { who: 'vendor', dir: 'SE' }, { at: 0.6, who: 'vendor', anim: 'idle_alt' },
        { at: 0.2, cam: { x: -4.9, y: 1.35, z: -3.0, yaw: -0.54, pitch: 0.06, F: 1.15, ease: 2.4 } },
        { at: 2.8, who: 'kid1', dir: 'N' }, { at: 2.8, cam: { x: -7.6, y: 1.3, z: -2.4, yaw: 0.06, pitch: 0.18, F: 1.0, ease: 3.5 } }] },
      // (silent) The lamps lit up the street toward the Tower; climbers walk up to its gate.
      { do: [{ cam: { x: 8.4, y: 1.6, z: 17.6, yaw: -0.04, pitch: 0.08, F: 1.0, cut: true } },
        { at: 0.5, who: 'lamplighter', pose: 'reach' },
        { at: 1.1, vars: { lamps: [1, 0.5] } }, { at: 1.1, pfx: { name: 'fire_puff', x: 5.4, y: 3.45, z: 25, scale: 0.8 } },
        { at: 1.7, who: 'lamplighter', pose: null, anim: 'idle' },
        { at: 1.8, vars: { lamps: [10, 3.4] } }, { at: 1.8, cam: { x: 8.3, y: 1.8, z: 19.2, yaw: 0.03, pitch: 0.1, F: 1.0, ease: 4 } },
        { at: 6.0, place: 'gate' },
        { at: 6.0, cam: { x: 1.6, y: 1.3, z: 47, yaw: -0.02, pitch: 0.22, cut: true } },
        ...CLIMBERS.map(([id, , x, z]) => ({ at: 6.0, who: id, show: true, put: [x, 0, z - 6] })),
        ...CLIMBERS.map(([id, , x, z], i) => ({ at: 6.0, who: id, to: [x, 0, z], speed: 1.15 + i * 0.02, anim: 'walk' })),
        { at: 6.2, cam: { x: 1.6, y: 1.5, z: 53, yaw: -0.02, pitch: 0.3, ease: 8 } }] },
      // (silent) Up the steps; two walk into the light; up the Tower's face into the clouds;
      // (up the steps; the first of them walks into the light; up the Tower's face into the clouds;
      // over the roofs, the title, and down toward the one who is running)
      { do: [{ cam: { x: 3.4, y: 4.8, z: 84.6, yaw: Math.PI + 0.1, pitch: -0.2, cut: true } },
        ...CLIMBERS.map(([id, , x], i) => ({ who: id, to: [x * 0.8, LANDY(i), LANDZ(i)], speed: 1.7, anim: 'walk' })),
        { at: 3.2, cam: { x: 0.8, y: 4.6, z: 77.6, yaw: 0.02, pitch: 0.14, cut: true } },
        ...CLIMBERS.map(([id, , x], i) => ({ at: 3.2, who: id, put: [x * 0.8, LANDY(i), LANDZ(i)], dir: 'N', anim: 'idle' })),
        { at: 3.4, who: 'c1', to: [-0.5, 3, 85.9], speed: 1.2, anim: 'walk' }, { at: 4.3, who: 'c2', to: [0.9, 3, 85.9], speed: 1.2, anim: 'walk' },
        { at: 4.4, vars: { gate: [2.4, 1.2] } }, { at: 4.6, sfx: 'magic', vol: 0.45 },
        { at: 5.6, who: 'c1', hide: true }, { at: 5.6, flash: ['225,205,255', 0.5] }, { at: 6.3, who: 'c2', hide: true },
        { at: 6.4, vars: { gate: [1, 1.0] } },
        { at: 6.6, cam: { x: 0, y: 2.2, z: 52, yaw: 0, pitch: 0.26, cut: true } },
        { at: 6.7, cam: { x: 0, y: 26, z: 44, yaw: 0, pitch: 1.2, ease: 4.4 } },
        { at: 10.9, place: 'roofs' }, { at: 10.9, sfx: 'whoosh', vol: 0.5 },
        { at: 10.9, cam: { x: 0, y: 40, z: -78, yaw: 0, pitch: -0.42, cut: true } },
        { at: 11.0, cam: { x: 0, y: 16.4, z: -17, yaw: 0, pitch: -0.12, ease: 5 } },
        { at: 11.3, title: { text: 'Tower of Wishes', dur: 4.8 } },
        { at: 15.6, fade: [1, 0.9] }] },
    ],
  };

  C['p.evening'] = {
    set: 'square',
    actors: [
      { id: 'eiryn', set: 'eiryn', x: -16, y: 0, z: 1.2, dir: 'E' },
      { id: 'alric', set: 'alric', x: 11, y: 0, z: 1.6, dir: 'W' },
      { id: 'musician', set: 'erdra_musician', x: 1.2, y: 0, z: 4.4, dir: 'S' },
      { id: 'vendor', set: 'erdra_vendor', x: -9, y: 0, z: 3.5, dir: 'S' },
    ],
    crowd: { n: 26, sets: FOLK, x: [-34, 38], z: [2.6, 14], still: 0.25 },
    cam: { x: 6, y: 24, z: -17, pitch: 0.12 },
    beats: [
      // The world used to breathe. Eiryn Ashvale remembered that most of all.
      // (high over the roofs, the Tower in the clouds; the crane comes down into the square)
      { do: [{ cam: { x: 6, y: 24, z: -17, pitch: 0.12, cut: true } }, { at: 0.8, cam: { x: 2, y: 2.6, z: -11, pitch: -0.06, ease: 7 } }] },
      // Lanterns burning against the evening. Children cutting through crowded streets...
      { cam: { x: -12, y: 1.7, z: -4.5, pitch: -0.05, vx: 0.45, cut: true, still: true } },
      // And farther still... stood the Tower of Wishes.
      { cam: { x: 8, y: 1.5, z: -3, yaw: 0.09, pitch: 0.1, cut: true }, do: [{ at: 0.4, cam: { x: 8, y: 1.5, z: -2, yaw: 0.09, pitch: 0.34, ease: 6 } }] },
      // Eiryn moved through the evening crowd unnoticed... Alric Noct saw her coming.
      { cam: { track: 'eiryn', dx: 1.6, dy: 1.45, dz: -5.5, pitch: -0.05, cut: true },
        do: [{ who: 'eiryn', put: [-12, 0, 1.2] }, { who: 'eiryn', to: [9.2, 0, 1.4], speed: 1.35 },
          { at: 6.3, cam: { x: 10.2, y: 1.55, z: -3.6, pitch: -0.04, ease: 2.6 } }, { at: 7.0, who: 'alric', dir: 'SW' }] },
      // He took her hand and raised her knuckles to his lips.
      { cam: { x: 9.95, y: 1.45, z: -3.2, pitch: -0.02, cut: true },
        do: [{ who: 'eiryn', put: [9.5, 0, 1.4], dir: 'E', anim: 'idle' }, { who: 'alric', put: [10.4, 0, 1.4], dir: 'W' },
          { at: 0.2, cam: { x: 9.95, y: 1.4, z: -2.4, ease: 4 } }] },
      // Late.  (a two-shot, leaning to him)
      { cam: { x: 10.2, y: 1.45, z: -2.3, yaw: -0.05, pitch: -0.02, ease: 4 }, do: [{ who: 'alric', dir: 'W' }, { who: 'eiryn', dir: 'E' }] },
      // You'll survive.  (leaning to her)
      { cam: { x: 9.7, y: 1.45, z: -2.2, yaw: 0.05, pitch: -0.02, ease: 4 }, do: [{ who: 'eiryn', dir: 'E', anim: 'idle_alt' }] },
      // He lowered her hand but did not release it. They walked. The city slowly fell behind them.
      { cam: { x: 14, y: 2.4, z: -10, pitch: -0.05, cut: true },
        do: [{ who: 'eiryn', dir: 'E', anim: 'idle' }, { who: 'eiryn', to: [16, 0, 1.6], speed: 1.15 }, { who: 'alric', to: [17, 0, 1.2], speed: 1.15 }, { at: 0.3, cam: { x: 18, y: 2.8, z: -12, pitch: -0.05, ease: 6 } }] },
      // They say someone climbed another floor today.
      { cam: { track: 'alric', dx: -0.4, dy: 1.5, dz: -3.4, pitch: -0.04, cut: true }, do: [{ who: 'eiryn', put: [16, 0, 1.6] }, { who: 'alric', put: [17, 0, 1.2] }, { who: 'eiryn', to: [34, 0, 1.6], speed: 1.1 }, { who: 'alric', to: [35, 0, 1.2], speed: 1.1 }] },
      // They always say that.
      { cam: { track: 'eiryn', dx: 0.2, dy: 1.5, dz: -3.8, pitch: -0.04, ease: 3 } },
    ],
  };

  // ------------------------------------------------------------ the rooftops: the chase and the catch
  // TW-001-010 as the author edited them (2026-10-23): her feet on the tiles, Alric gaining
  // behind her (seen through her eyes), roof to roof, the gap she misjudges, the Pressure glyph
  // that throws her on, his leap by strength alone, the catch in the air, the hard landing.
  // The run goes north over the terraces of js/cinema/sets.js RUN: [z0, z1, height]
  //   [-70, 8, 14], [11.2, 24, 13.4], [27, 40, 14.2], [43, 56, 14.6], [63, 80, 15.4]
  // (the last gap, 56 -> 63, is the wide one).
  const PI = Math.PI, R1 = 14, R2 = 13.4, R3 = 14.2, R4 = 14.6, R5 = 15.4, EX = 0.3, AX = -0.5;
  const pov = (o) => Object.assign({ pov: 'eiryn', eye: 1.5 }, o);
  C['p.roof'] = {
    set: 'roofs',
    actors: [
      { id: 'eiryn', set: 'eiryn', x: EX, y: R1, z: -8, dir: 'N' },
      { id: 'alric', set: 'alric', x: AX, y: R1, z: -14, dir: 'N' },
    ],
    cam: { track: 'eiryn', dx: 2.0, dy: 0.45, dz: 0.1, yaw: -PI / 2, pitch: -0.06, F: 1.5 },
    beats: [
      // "You're slowing down."  Her boots on the tiles; up to her running; he comes in from behind, faster.
      { do: [
        { cam: { track: 'eiryn', dx: 2.0, dy: 0.45, dz: 0.1, yaw: -PI / 2, pitch: -0.06, F: 1.5, cut: true } },
        { who: 'eiryn', to: [EX, R1, 7.6], speed: 6.0, anim: 'run' },
        { who: 'alric', to: [AX, R1, 7.4], speed: 7.4, anim: 'run' },
        { at: 1.3, cam: { track: 'eiryn', dx: 4.6, dy: 1.1, dz: -1.4, yaw: -PI / 2 + 0.14, pitch: -0.02, F: 1.0, ease: 1.1 } },
        { at: 2.6, who: 'eiryn', leap: { to: [EX, R2, 12.2], h: 1.2, dur: 0.55 } },
        { at: 3.15, who: 'eiryn', to: [EX, R2, 15.5], speed: 6.0, anim: 'run' },
        { at: 2.98, who: 'alric', leap: { to: [AX, R2, 12.0], h: 1.2, dur: 0.55 } },
        { at: 3.53, who: 'alric', to: [AX, R2, 13.2], speed: 6.0, anim: 'run' },
      ] },
      // "I'm letting you think you can catch me."  Through her eyes, looking back: he is gaining.
      { do: [
        { cam: pov({ yaw: PI - 0.06, pitch: -0.12, cut: true }) },
        { who: 'eiryn', to: [EX, R2, 23.6], speed: 4.6, anim: 'run' },
        { who: 'alric', put: [AX, R2, 11.8] }, { who: 'alric', to: [AX, R2, 21.6], speed: 5.4, anim: 'run' },
        { at: 1.55, cam: pov({ yaw: 0, pitch: -0.22, ease: 0.35 }) },
        { at: 1.82, who: 'eiryn', leap: { to: [EX, R3, 27.6], h: 1.3, dur: 0.58 } },
        { at: 2.4, who: 'eiryn', to: [EX, R3, 29], speed: 6.4, anim: 'run' },
        { at: 1.75, who: 'alric', to: [AX, R2, 23.6], speed: 6.2, anim: 'run' },
        { at: 2.1, who: 'alric', leap: { to: [AX, R3, 27.4], h: 1.3, dur: 0.58 } },
        { at: 2.68, who: 'alric', to: [AX, R3, 27.8], speed: 6.2, anim: 'run' },
      ] },
      // "Then stop letting me."  On him as he says it, running; then low, as they come leaping at the lens.
      { do: [
        { cam: { track: 'alric', dx: -1.4, dy: 1.45, dz: 1.9, yaw: PI - 0.64, pitch: -0.04, F: 1.3, cut: true } },
        { who: 'eiryn', to: [EX, R3, 39.6], speed: 6.6, anim: 'run' },
        { who: 'alric', to: [AX, R3, 38.4], speed: 6.6, anim: 'run' },
        { at: 1.0, cam: { x: 2.4, y: R4 + 0.8, z: 50, yaw: PI + 0.35, pitch: 0.1, F: 1.2, cut: true } },
        { at: 1.6, who: 'eiryn', leap: { to: [EX, R4, 43.6], h: 1.4, dur: 0.6 } },
        { at: 2.2, who: 'eiryn', to: [EX, R4, 55.4], speed: 6.6, anim: 'run' },
        { at: 2.2, who: 'eiryn', pfx: { name: 'dust_run', scale: 0.9 } },
        { at: 1.85, who: 'alric', leap: { to: [AX, R4, 43.4], h: 1.4, dur: 0.6 } },
        { at: 2.45, who: 'alric', to: [AX, R4, 53.2], speed: 6.2, anim: 'run' },
        { at: 2.3, cam: { x: 2.4, y: R4 + 0.8, z: 50, yaw: PI + 0.55, pitch: 0.06, F: 1.0, ease: 0.6 } },
        { at: 2.85, cam: pov({ yaw: 0, pitch: -0.3, cut: true }) },
      ] },
      // The next gap was wider than she had judged.  ...and the rest of the leap, as one take:
      // she jumps short over the drop; a glyph flares under her and throws her on; looking back
      // as she floats, she sees him crouch and leap for her; he catches her and lands hard.
      { do: [
        { cam: pov({ yaw: 0, pitch: -0.4, cut: true }) },
        { who: 'eiryn', leap: { to: [EX, 14.4, 58.8], h: 0.9, dur: 0.7 } },
        { at: 0.05, cam: pov({ yaw: 0, pitch: -1.1, ease: 0.45 }) }, { at: 0.1, slow: [0.3, 2.0] },
        { who: 'alric', put: [AX, R4, 52.6], anim: 'run' }, { who: 'alric', to: [AX, R4, 55.3], speed: 5.4, anim: 'run' },
        // the Pressure glyph: a ring under her, a burst of force, and she is thrown forward and up
        { at: 0.62, who: 'eiryn', ring: { r: 1.5, col: '190,150,255', dur: 1.1 } },
        { at: 0.62, who: 'eiryn', pfx: [{ name: 'shockwave', scale: 1.4, add: true }, { name: 'jump_puff', scale: 1.2 }] },
        { at: 0.62, flash: ['190,150,255', 0.35] }, { at: 0.62, shake: 3 },
        { at: 0.64, who: 'eiryn', leap: { to: [EX, R5, 79], h: 4.4, dur: 3.2 } }, { at: 0.64, slow: [0.6, 1.4] },
        { at: 0.64, cam: pov({ yaw: 0, pitch: 0.12, ease: 0.4 }) },
        // floating, she looks back: he crouches at the edge, the tiles split, he jumps
        { at: 1.15, cam: pov({ yaw: PI - 0.04, pitch: -0.42, F: 1.7, ease: 0.5 }) },
        { at: 1.75, cam: pov({ yaw: PI - 0.04, pitch: -0.16, F: 1.4, ease: 0.45 }) },
        { at: 1.2, who: 'alric', pose: 'brace' },
        { at: 1.5, who: 'alric', debris: { n: 10, w: 1.2, col: '#7a3e30', floor: 0 } }, { at: 1.5, who: 'alric', pfx: { name: 'rock_burst', scale: 1.2 } },
        { at: 1.7, who: 'alric', pose: null }, { at: 1.7, who: 'alric', leap: { to: [-0.55, R5, 76], h: 4.3, dur: 0.9 } },
        { at: 1.7, slow: [0.5, 1.2] },
        // the catch: side on against the sky
        { at: 2.25, who: 'eiryn', attach: { to: 'alric', dx: 0.28, dy: 0.35, dz: 0.22 } },
        { at: 2.25, cam: { x: 6.2, y: R5 + 2.6, z: 70.2, yaw: -PI / 2 + 0.06, pitch: 0.24, F: 1.0, cut: true } },
        { at: 2.25, slow: [0.35, 1.1] },
        { at: 2.36, cam: { x: 6.4, y: R5 + 1.7, z: 72.6, yaw: -PI / 2 + 0.44, pitch: -0.1, F: 1.0, ease: 0.9 } },
        // he takes the landing; the tiles go
        { at: 2.62, shake: 7 }, { at: 2.62, who: 'alric', pose: 'brace' },
        { at: 2.62, who: 'alric', debris: { n: 18, w: 2.2, col: '#80402f', floor: 0, vz: 1.5 } },
        { at: 2.62, who: 'alric', pfx: [{ name: 'dust_cloud', scale: 1.6 }, { name: 'rock_burst', scale: 1.4 }] },
        { at: 2.62, who: 'eiryn', detach: true }, { at: 2.62, who: 'eiryn', put: [0.75, R5, 76.3], anim: 'hit', dir: 'W' },
        { at: 3.6, who: 'alric', pose: null, anim: 'idle', dir: 'E' }, { at: 3.2, who: 'eiryn', anim: 'idle', dir: 'W' },
        { at: 3.3, cam: { x: 0.1, y: R5 + 1.45, z: 72.0, yaw: 0, pitch: -0.02, cut: true } },
        { at: 3.5, cam: { x: 0.1, y: R5 + 1.45, z: 72.6, yaw: 0, pitch: -0.02, ease: 6 } },
      ] },
      // "Too slow."  The two of them on the broken roof, the Tower far beyond.
      { cam: { x: 0.2, y: R5 + 1.5, z: 72.8, yaw: 0.02, pitch: -0.02, ease: 4 }, do: [{ who: 'alric', dir: 'E' }, { who: 'eiryn', dir: 'W' }] },
      // "I wanted the hug."
      { cam: { x: 0.1, y: R5 + 1.45, z: 73.6, yaw: 0, pitch: -0.02, ease: 4 }, do: [{ who: 'eiryn', to: [0.2, R5, 76.3], speed: 0.6, dir: 'W', then: 'idle' }] },
      // Somewhere below, one more tile slid off the edge and broke in the street.  (from the alley)
      { cam: { x: 5.4, y: 1.5, z: 60, yaw: -0.2, pitch: 0.72, cut: true },
        do: [{ at: 0.5, debris: { n: 1, x: 3.3, y: R5, z: 70.5, w: 0.1, s: 0.38, col: '#8a4a3a', floor: 0 } },
          { at: 0.55, cam: { x: 5.4, y: 1.5, z: 60, yaw: -0.2, pitch: 0.05, ease: 1.65 } },
          { at: 2.2, pfx: { name: 'rock_burst', x: 3.4, y: 0, z: 70.6, scale: 0.9 } }, { at: 2.2, shake: 1.5 }] },
    ],
  };

  // ------------------------------------------------------------ the roof at the edge: the Tower talk
  // After the horn (TW-014): they look at the Tower and talk (TW-015-017), a breath (TW-018).
  const OV = R5, OZ = 78.3; // standing near the low wall at the city's edge (z 80)
  C['p.overlook'] = {
    set: 'roofs',
    actors: [
      { id: 'eiryn', set: 'eiryn', x: 0.5, y: OV, z: OZ + 0.1, dir: 'W' },
      { id: 'alric', set: 'alric', x: -0.6, y: OV, z: OZ, dir: 'E' },
    ],
    cam: { x: -0.4, y: OV + 1.9, z: OZ - 8, pitch: -0.05 },
    beats: [
      // (silent) On a roof at the edge of the city, they turn toward the horn with everyone else.
      { do: [{ cam: { x: -0.4, y: OV + 1.9, z: OZ - 8, pitch: -0.05, cut: true } }, { at: 0.6, who: 'eiryn', dir: 'N' }, { at: 0.9, who: 'alric', dir: 'N' },
        { at: 0.4, cam: { x: -0.3, y: OV + 1.75, z: OZ - 5.6, pitch: -0.03, ease: 4 } }] },
      // (silent) Eiryn looks at the Tower; it gives her nothing back.  (behind them, up to the Tower)
      { cam: { x: -0.2, y: OV + 1.4, z: OZ - 3.7, yaw: 0.1, pitch: 0.05, cut: true }, do: [{ who: 'eiryn', dir: 'N' }, { who: 'alric', dir: 'N' }, { at: 0.3, cam: { x: -0.2, y: OV + 1.3, z: OZ - 2.7, yaw: 0.14, pitch: 0.22, ease: 3 } }, { at: 2.6, who: 'alric', dir: 'E' }] },
      // (silent) He steps closer, his arm round her waist; their foreheads touch.  (in profile, the Tower behind)
      { cam: { x: 0.27, y: OV + 1.45, z: OZ - 4.9, pitch: 0.02, cut: true }, do: [{ who: 'alric', to: [0.05, OV, OZ + 0.1], speed: 0.8, dir: 'E', then: 'idle' }, { who: 'eiryn', dir: 'W' }, { at: 0.2, cam: { x: 0.27, y: OV + 1.45, z: OZ - 3.9, pitch: 0.02, ease: 3 } }] },
      // Eiryn: "I already have everything I could ever wish for."  (TW-017)
      { cam: { x: 0.27, y: OV + 1.5, z: OZ - 3.1, pitch: 0.01, ease: 5 }, do: [{ who: 'alric', dir: 'E' }, { who: 'eiryn', dir: 'W' }] },
      // (silent) The world is enough; far above them, something is dying.  (pull away behind them, up the Tower)
      { cam: { x: 0.2, y: OV + 2, z: OZ - 12, pitch: -0.02, cut: true },
        do: [{ at: 0.2, cam: { x: 0.2, y: OV + 6, z: OZ - 28, pitch: -0.04, ease: 4 } }, { at: 3.6, cam: { x: 0.2, y: OV + 6, z: OZ - 28, yaw: 0.16, pitch: 0.5, ease: 3.5 } },
          { at: 6.4, flash: ['170,120,255', 0.6] }, { at: 6.5, shake: 3 }] },
    ],
  };
})();
