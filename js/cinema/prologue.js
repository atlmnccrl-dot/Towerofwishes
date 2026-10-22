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

  // ------------------------------------------------------------ the rooftops and the overlook
  // The run goes north over a line of terraces (js/cinema/sets.js RUN): [z0, z1, height]
  //   [-70, 8, 14], [11.2, 24, 13.4], [27, 40, 14.2], [43, 56, 14.6], [59, 74, 15.4] (the overlook)
  // Seen through Eiryn's eyes: the roofs rushing under her, the drop as she leaps, then she
  // looks back and Alric is right behind, clearing the same gap. Then a low shot from the next
  // roof as the two of them come leaping toward the lens.
  const PI = Math.PI, OV = 15.4, EYE = { pov: 'eiryn', eye: 1.5 };
  const pov = (o) => Object.assign({}, EYE, o);
  const R1 = 14, R2 = 13.4, R3 = 14.2, R4 = 14.6;
  C['p.overlook'] = {
    set: 'roofs',
    actors: [
      { id: 'eiryn', set: 'eiryn', x: 0.3, y: R1, z: -4, dir: 'N' },
      { id: 'alric', set: 'alric', x: -0.5, y: R1, z: -12, dir: 'N' },
    ],
    cam: pov({ yaw: 0, pitch: -0.3 }),
    beats: [
      // (the chase) The road opened onto a high overlook...
      { do: [
        // her eyes: the tiles rushing under her, the edge coming
        { cam: pov({ yaw: 0, pitch: -0.3, cut: true }) },
        { who: 'eiryn', to: [0.3, R1, 7.6], speed: 6.5, anim: 'run' },
        { who: 'alric', to: [-0.5, R1, 7.6], speed: 6.3, anim: 'run' },
        // the leap: she looks down into the alley as it opens under her, slowed
        { at: 1.25, cam: pov({ yaw: 0, pitch: -0.5, ease: 0.5 }) },
        { at: 1.78, who: 'eiryn', leap: { to: [0.3, R2, 12.4], h: 1.2, dur: 0.62 } }, { at: 1.7, slow: [0.35, 1.7] },
        { at: 1.78, cam: pov({ yaw: 0, pitch: -1.2, ease: 0.3 }) },
        { at: 2.2, cam: pov({ yaw: 0, pitch: -0.22, ease: 0.25 }) },
        { at: 2.4, shake: 4 },
        { at: 2.4, who: 'eiryn', to: [0.3, R2, 23.6], speed: 3.8, anim: 'run' },
        // she looks back over her shoulder: he is right behind, and he takes the gap too
        { at: 2.6, cam: pov({ yaw: PI - 0.1, pitch: 0.0, ease: 0.4 }) },
        { at: 3.15, who: 'alric', leap: { to: [-0.5, R2, 12.4], h: 1.3, dur: 0.62 } }, { at: 3.15, slow: [0.45, 1.3] },
        { at: 3.77, who: 'alric', to: [-0.5, R2, 23.6], speed: 6.2, anim: 'run' },
        // and forward again, over the next gap
        { at: 4.3, cam: pov({ yaw: 0, pitch: -0.3, ease: 0.35 }) },
        { at: 4.3, who: 'eiryn', to: [0.3, R2, 23.6], speed: 6.5, anim: 'run' },
        { at: 4.95, who: 'eiryn', leap: { to: [0.3, R3, 27.6], h: 1.3, dur: 0.6 } },
        { at: 4.95, cam: pov({ yaw: 0, pitch: -0.6, ease: 0.25 }) }, { at: 5.28, cam: pov({ yaw: 0, pitch: -0.2, ease: 0.3 }) },
        { at: 5.55, who: 'eiryn', to: [0.3, R3, 39.6], speed: 6.5, anim: 'run' },
        { at: 5.6, who: 'alric', leap: { to: [-0.5, R3, 27.6], h: 1.25, dur: 0.6 } },
        { at: 6.2, who: 'alric', to: [-0.5, R3, 39.6], speed: 6.3, anim: 'run' },
        // a low shot from the next roof: she comes leaping toward the lens and past it, he follows
        { at: 6.1, cam: { x: 1.4, y: R4 + 0.9, z: 49.5, yaw: PI + 0.04, pitch: 0.1, F: 1.25, cut: true } },
        { at: 7.42, who: 'eiryn', leap: { to: [0.3, R4, 43.6], h: 1.4, dur: 0.62 } }, { at: 7.42, slow: [0.45, 1.3] },
        { at: 8.04, who: 'eiryn', to: [0.3, R4, 55], speed: 6.5, anim: 'run' }, { at: 8.04, who: 'eiryn', pfx: { name: 'dust_run', scale: 0.9 } },
        { at: 8.1, who: 'alric', leap: { to: [-0.5, R4, 43.6], h: 1.4, dur: 0.62 } },
        { at: 8.72, who: 'alric', to: [-0.5, R4, 55], speed: 6.3, anim: 'run' }, { at: 8.72, who: 'alric', pfx: { name: 'dust_run', scale: 0.9 } },
        { at: 8.1, cam: { x: 1.4, y: R4 + 0.9, z: 49.5, yaw: PI + 0.12, pitch: 0.08, F: 1.05, ease: 1.2 } },
        // the high edge of the city: the two of them against Erdra and the Tower
        { at: 9.4, fade: [1, 0.3] },
        { at: 9.75, who: 'eiryn', put: [0.5, OV, 72.4], dir: 'N', anim: 'idle' }, { at: 9.75, who: 'alric', put: [-2.2, OV, 70.6], dir: 'NE', anim: 'idle' },
        { at: 9.75, cam: { x: -0.4, y: OV + 1.9, z: 64.5, pitch: -0.06, cut: true } }, { at: 9.8, fade: [0, 0.8] },
        { at: 10.0, who: 'alric', to: [-0.6, OV, 72.3], speed: 1.3, then: 'idle' },
        { at: 9.9, cam: { x: -0.3, y: OV + 1.75, z: 66.5, pitch: -0.04, ease: 5 } },
      ] },
      // Do you think anyone's ever made it to the top?  (in profile against the lands, the Tower beyond)
      { cam: { x: 0.2, y: OV + 1.6, z: 69.0, yaw: -0.06, pitch: -0.02, cut: true }, do: [{ who: 'alric', put: [-0.6, OV, 72.3], dir: 'E' }, { who: 'eiryn', put: [0.5, OV, 72.4], dir: 'N' }, { at: 0.2, cam: { x: 0.0, y: OV + 1.6, z: 69.6, yaw: -0.08, pitch: -0.02, ease: 6 } }] },
      // Eiryn finally looked. The Tower gave her nothing back.  (behind them, the Tower over the lands)
      { cam: { x: -0.2, y: OV + 1.4, z: 68.6, yaw: 0.1, pitch: 0.05, cut: true }, do: [{ who: 'eiryn', dir: 'N' }, { who: 'alric', dir: 'N' }, { at: 0.3, cam: { x: -0.2, y: OV + 1.3, z: 69.6, yaw: 0.14, pitch: 0.22, ease: 6 } }] },
      // You'd have to be powerful.  (over his shoulder, onto her)
      { cam: { x: 0.3, y: OV + 1.6, z: 69.0, yaw: -0.04, pitch: -0.02, cut: true }, do: [{ who: 'eiryn', dir: 'W' }, { who: 'alric', dir: 'E' }, { at: 0.2, cam: { x: 0.45, y: OV + 1.6, z: 69.3, yaw: -0.06, pitch: -0.02, ease: 5 } }] },
      // And if someone did?
      { cam: { x: -0.2, y: OV + 1.6, z: 69.5, yaw: 0.05, pitch: -0.02, ease: 5 } },
      // What would they wish for?
      { cam: { x: 0.5, y: OV + 1.6, z: 69.8, yaw: -0.07, pitch: -0.02, ease: 5 } },
      // I don't know.
      { cam: { x: -0.25, y: OV + 1.6, z: 70.0, yaw: 0.06, pitch: -0.02, ease: 5 } },
      // He stepped closer. His arm slid around her waist... Their foreheads touched.  (in profile, the Tower behind)
      { cam: { x: 0.27, y: OV + 1.45, z: 67.4, pitch: 0.02, cut: true }, do: [{ who: 'alric', to: [0.05, OV, 72.4], speed: 0.8, dir: 'E', then: 'idle' }, { who: 'eiryn', dir: 'W' }, { at: 0.2, cam: { x: 0.27, y: OV + 1.45, z: 68.4, pitch: 0.02, ease: 5 } }] },
      // I already have everything I could ever wish for.
      { cam: { x: 0.27, y: OV + 1.5, z: 69.2, pitch: 0.01, ease: 6 }, do: [{ who: 'alric', dir: 'E' }, { who: 'eiryn', dir: 'W' }] },
      // ...Eiryn closed her eyes. For a moment, the world was enough.  (pull away behind them, wide)
      { cam: { x: 0.2, y: OV + 2, z: 66, pitch: -0.02, cut: true }, do: [{ at: 0.2, cam: { x: 0.2, y: OV + 6, z: 50, pitch: -0.04, ease: 8 } }] },
      // Far above them, something was dying.  (up the Tower into the clouds)
      { cam: { x: 0.2, y: OV + 6, z: 50, yaw: 0.16, pitch: 0.5, ease: 5 }, do: [{ at: 2.5, flash: ['170,120,255', 0.6] }, { at: 2.6, shake: 3 }] },
    ],
  };
})();
