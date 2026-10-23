/*
 * Tower of Wishes — the climber at the last floor, filmed (js/render/cinema.js), 2026-10-23.
 * The author's edit: the climber's fight is a cutscene, not an auto-battle. TW-019 (anonymous,
 * wounded; no wish, no Guardian), and the Tower's horn when the floor is cleared (TW-014).
 * No names on screen: not the climber's, not the boss's, not the final move's.
 * Place: js/cinema/summit.js. One entry per line of each node's text.
 */
(function () {
  'use strict';
  const C = (window.TowCinema = window.TowCinema || {});
  const PI = Math.PI;
  const CAST = () => [
    { id: 'climber', set: 'climber', x: 0, y: -4.6, z: -25, dir: 'N' },
    { id: 'boss', set: 'night_creature', x: 0, y: 0, z: 3, dir: 'S', scale: 1.9, sil: true, hidden: true },
    { id: 'frag1', set: 'fragment', x: -1.6, y: 7, z: -5, dir: 'S', hidden: true },
    { id: 'frag2', set: 'fragment', x: 1.8, y: 7, z: -5.2, dir: 'S', hidden: true },
    { id: 'g1', set: 'black_knight', x: -4.5, y: 0, z: -15, dir: 'N', scale: 3.2, sil: true, silCol: '#140a24', hidden: true },
    { id: 'g2', set: 'black_knight', x: 0.6, y: 0, z: -17.5, dir: 'N', scale: 3.6, sil: true, silCol: '#140a24', hidden: true },
    { id: 'g3', set: 'gothic_knight_a', x: 4.6, y: 0, z: -15, dir: 'N', scale: 3.2, sil: true, silCol: '#140a24', hidden: true },
  ];

  // ------------------------------------------------------------ the approach (p.tower)
  C['p.tower'] = {
    set: 'summit', vars: { light: 0 },
    actors: CAST(),
    cam: { x: 30, y: -40, z: -80, yaw: -0.36, pitch: 0.38 },
    beats: [
      // Far away, high inside the Tower, a climber reached the last ascent.  (up the Tower's side to
      // its broken top above the clouds; then the stairs, at the lens)
      { do: [{ cam: { x: 30, y: -40, z: -80, yaw: -0.36, pitch: 0.38, cut: true } }, { at: 0.3, cam: { x: 24, y: 6, z: -55, yaw: -0.41, pitch: 0.1, ease: 3.4 } },
        { at: 3.6, cam: { x: 1.2, y: 1.2, z: -14.6, yaw: PI + 0.06, pitch: -0.42, cut: true } },
        { at: 3.6, who: 'climber', put: [0, -4.6, -25] }, { at: 3.6, who: 'climber', to: [0, 0, -15.4], speed: 1.0, anim: 'walk' }] },
      // Blood had dried along one side of the stranger's face. The weapon in their hand was broken...
      { cam: { x: 2.4, y: 1.4, z: -10.5, yaw: -2.55, pitch: -0.04, cut: true },
        do: [{ who: 'climber', to: [0, 0, -11], speed: 0.8, anim: 'walk' }, { at: 0.3, cam: { x: 2.1, y: 1.4, z: -10.0, yaw: -2.6, pitch: -0.04, ease: 6 } }] },
      // Something was waiting on the final floor. Something no one had ever seen clearly.
      { cam: { x: 2.2, y: 1.75, z: -14, yaw: -0.06, pitch: 0.1, cut: true },
        do: [{ who: 'climber', anim: 'idle_combat' }, { at: 0.8, who: 'boss', show: true }, { at: 0.8, who: 'boss', pfx: [{ name: 'smoke_dark', scale: 4, mul: true, life: 2 }, { name: 'dark_curse', scale: 3, life: 1.6 }] },
          { at: 0.8, sfx: 'charge', vol: 0.5 }, { at: 0.4, cam: { x: 2.1, y: 1.7, z: -13.2, yaw: -0.06, pitch: 0.14, ease: 6 } }] },
    ],
  };

  // ------------------------------------------------------------ the fight (p.climb)
  // Staged at medium range so both stay whole in frame: the climber at z -11, facing north; the thing
  // comes down the floor at him. Blows land where the two of them stand (about 2 m apart);
  // effects sit at the contact point, h 1.2.
  const SIDE = (z, o) => Object.assign({ x: 5.6, y: 1.25, z, yaw: -PI / 2, pitch: -0.02, F: 1.2 }, o);
  C['p.climb'] = {
    set: 'summit', vars: { light: 0 },
    actors: CAST().map((a) => (a.id === 'climber' ? Object.assign(a, { y: 0, z: -11 }) : a.id === 'boss' ? Object.assign(a, { hidden: false })
      : /^g/.test(a.id) ? Object.assign(a, { scale: a.id === 'g2' ? 2.6 : 2.3, z: a.id === 'g2' ? -17 : -16 }) : a)),
    beats: [
      // Two shapes dropped from the dark to bar the way.  (behind him, three-quarters: they land in front of him)
      { cam: { x: 3.0, y: 1.5, z: -15.2, yaw: -0.4, pitch: -0.03, F: 1.25, cut: true },
        do: [{ who: 'climber', anim: 'idle_combat' },
          { at: 0.3, who: 'frag1', show: true }, { at: 0.3, who: 'frag1', put: [-1.2, 6, -7.0] }, { at: 0.3, who: 'frag1', leap: { to: [-1.2, 0, -7.0], h: 0, dur: 0.45, then: 'idle_combat' } },
          { at: 0.55, who: 'frag2', show: true }, { at: 0.55, who: 'frag2', put: [1.2, 6, -6.6] }, { at: 0.55, who: 'frag2', leap: { to: [1.2, 0, -6.6], h: 0, dur: 0.45, then: 'idle_combat' } },
          { at: 0.75, who: 'frag1', pfx: { name: 'dust_land', scale: 1.4 } }, { at: 0.75, sfx: 'thud', vol: 0.6 }, { at: 0.75, shake: 2 },
          { at: 1.0, who: 'frag2', pfx: { name: 'dust_land', scale: 1.4 } }, { at: 1.0, sfx: 'thud', vol: 0.6 }, { at: 1.0, shake: 2 },
          { at: 0.4, cam: { x: 2.8, y: 1.45, z: -14.6, yaw: -0.38, pitch: -0.02, F: 1.3, ease: 3 } }] },
      // The climber cut through both of them in a single stroke.  (side on: he dashes between them)
      { cam: SIDE(-8.6, { cut: true }),
        do: [{ who: 'climber', to: [0, 0, -7.9], speed: 9, anim: 'run' },
          { at: 0.35, who: 'climber', anim: 'heavy' }, { at: 0.45, slow: [0.3, 1.3] }, { at: 0.5, flash: ['230,210,255', 0.25] },
          { at: 0.5, pfx: [{ name: 'dark_slash', x: 0, y: 1.1, z: -6.9, scale: 2.4, add: true }, { name: 'spin_slash', x: 0, y: 1.1, z: -6.9, scale: 2.0, add: true }] }, { at: 0.5, sfx: ['slash', 'swish'], vol: 0.8 },
          { at: 0.6, who: 'frag1', anim: 'ko' }, { at: 0.6, who: 'frag2', anim: 'ko' }, { at: 0.65, sfx: 'blow_big', vol: 0.7 },
          { at: 0.6, who: 'frag1', pfx: { name: 'hit_slash', scale: 1.5, add: true, h: 1 } }, { at: 0.6, who: 'frag2', pfx: { name: 'hit_slash', scale: 1.5, add: true, h: 1 } },
          { at: 1.8, who: 'frag1', pfx: { name: 'smoke_dark', scale: 1.8, mul: true } }, { at: 1.8, who: 'frag2', pfx: { name: 'smoke_dark', scale: 1.8, mul: true } },
          { at: 2.1, who: 'frag1', hide: true }, { at: 2.1, who: 'frag2', hide: true }, { at: 1.9, who: 'climber', anim: 'idle_combat' }] },
      // The thing behind them answered.  (wide side on: it crosses the floor and throws him back)
      { cam: SIDE(-4.6, { x: 8.4, y: 1.6, F: 1.0, cut: true }),
        do: [{ who: 'boss', to: [0, 0, -5.8], speed: 10, anim: 'run' }, { at: 0.75, who: 'boss', anim: 'attack' },
          { at: 0.9, pfx: { name: 'claw', x: 0, y: 1.2, z: -7.3, scale: 2.6, add: true } }, { at: 0.9, sfx: 'blow_big', vol: 0.9 }, { at: 0.9, shake: 7 }, { at: 0.9, slow: [0.4, 0.8] },
          { at: 0.9, who: 'climber', anim: 'hit' }, { at: 0.95, who: 'climber', leap: { to: [0, 0, -11.6], h: 0.9, dur: 0.6, then: 'ko' } },
          { at: 1.55, who: 'climber', pfx: { name: 'dust_cloud', scale: 1.4 } }, { at: 1.55, sfx: 'thud', vol: 0.7 }, { at: 1.8, who: 'boss', anim: 'idle' }] },
      // The climber got up.  (low behind him, the thing waiting down the floor)
      { cam: { x: 1.1, y: 0.6, z: -15.0, yaw: -0.08, pitch: 0.2, F: 1.2, cut: true },
        do: [{ who: 'climber', pose: 'kneel' }, { at: 1.3, who: 'climber', pose: null, anim: 'idle_combat' }, { at: 0.2, cam: { x: 1.0, y: 0.75, z: -14.6, yaw: -0.08, pitch: 0.16, F: 1.2, ease: 4 } }] },
      // Steel and shadow, again and again.  (side on, then the reverse, then three-quarters front)
      { cam: SIDE(-8.4, { cut: true }),
        do: [{ who: 'climber', to: [0, 0, -7.7], speed: 8, anim: 'run' },
          { at: 0.55, who: 'climber', anim: 'attack' }, { at: 0.65, pfx: { name: 'slash_r', x: 0, y: 1.3, z: -6.5, scale: 1.8, add: true } }, { at: 0.65, sfx: 'slash', vol: 0.8 }, { at: 0.65, who: 'boss', anim: 'hit' },
          { at: 1.3, who: 'boss', anim: 'attack2' }, { at: 1.4, who: 'climber', anim: 'dodge' }, { at: 1.4, who: 'climber', leap: { to: [1.4, 0, -8.2], h: 0.3, dur: 0.4, then: 'idle_combat' } }, { at: 1.4, sfx: 'whoosh', vol: 0.6 },
          { at: 1.45, pfx: { name: 'claw', x: 0, y: 1.0, z: -7.4, scale: 2.4, add: true } },
          { at: 2.1, cam: SIDE(-7.4, { x: -5.6, yaw: PI / 2, cut: true }) },
          { at: 2.15, who: 'climber', to: [0.4, 0, -7.6], speed: 5, anim: 'run' },
          { at: 2.4, who: 'climber', anim: 'attack2' }, { at: 2.5, pfx: { name: 'cross_slash', x: 0.2, y: 1.3, z: -6.4, scale: 2, add: true } }, { at: 2.5, sfx: 'slash', vol: 0.85 }, { at: 2.5, who: 'boss', anim: 'hit' }, { at: 2.5, slow: [0.5, 0.6] },
          { at: 3.2, who: 'boss', anim: 'attack' }, { at: 3.3, pfx: { name: 'parry', x: 0.3, y: 1.2, z: -7.0, scale: 1.8, add: true } }, { at: 3.3, sfx: 'clang', vol: 0.8 }, { at: 3.3, flash: ['255,255,255', 0.12] },
          { at: 3.9, who: 'climber', anim: 'kick' }, { at: 4.05, sfx: 'blow', vol: 0.8 }, { at: 4.05, who: 'boss', anim: 'hit' }, { at: 4.05, who: 'boss', to: [0, 0, -4.6], speed: 3 },
          { at: 4.7, cam: { x: 3.6, y: 1.7, z: -12.6, yaw: -0.3, pitch: -0.04, F: 1.15, cut: true } },
          { at: 4.8, who: 'boss', to: [0, 0, -6.0], speed: 6, anim: 'run' }, { at: 5.05, who: 'boss', anim: 'heavy' },
          { at: 5.3, pfx: { name: 'dark_slash', x: 0.3, y: 1.2, z: -7.1, scale: 2.8, add: true } }, { at: 5.3, sfx: 'blow_big', vol: 0.95 }, { at: 5.3, shake: 9 },
          { at: 5.3, slow: [0.35, 1.2] }, { at: 5.3, who: 'climber', anim: 'hit' }, { at: 5.35, who: 'climber', leap: { to: [0.2, 0, -11.6], h: 1.0, dur: 0.7, then: 'ko' } },
          { at: 6.1, who: 'climber', pfx: { name: 'dust_cloud', scale: 1.5 } }, { at: 6.1, sfx: 'thud', vol: 0.8 }, { at: 6.2, who: 'boss', anim: 'idle' }] },
      // It was not enough.  (low behind him, on one knee; it comes on, slowly)
      { cam: { x: -1.3, y: 0.5, z: -15.0, yaw: 0.1, pitch: 0.24, F: 1.2, cut: true },
        do: [{ who: 'climber', pose: 'kneel' }, { who: 'boss', to: [-0.4, 0, -8.8], speed: 1.2, anim: 'walk', then: 'idle' }, { at: 0.2, cam: { x: -1.2, y: 0.55, z: -14.5, yaw: 0.1, pitch: 0.24, F: 1.2, ease: 5 } }] },
      // So the climber reached for something older.  (from the thing's side, at him: a rift; giants rise behind him)
      { cam: { x: 3.8, y: 1.3, z: -9.4, yaw: -2.33, pitch: 0.1, F: 1.0, cut: true },
        do: [{ who: 'climber', pose: 'cast' }, { at: 0.2, who: 'climber', ring: { r: 5, col: '150,60,210', dur: 3.2 } },
          { at: 0.2, who: 'climber', pfx: [{ name: 'portal', scale: 3, add: true, ground: true, life: 3 }, { name: 'dark_curse', scale: 1.5, life: 2, h: 1.6 }] }, { at: 0.2, sfx: 'charge', vol: 0.8 },
          { at: 0.3, flash: ['70,0,100', 0.5] }, { at: 0.3, shake: 4 },
          { at: 0.9, who: 'g1', show: true }, { at: 0.9, who: 'g1', pfx: { name: 'smoke_dark', scale: 4, mul: true, life: 1.8 } },
          { at: 1.2, who: 'g2', show: true }, { at: 1.2, who: 'g2', pfx: { name: 'smoke_dark', scale: 4.5, mul: true, life: 1.8 } },
          { at: 1.5, who: 'g3', show: true }, { at: 1.5, who: 'g3', pfx: { name: 'smoke_dark', scale: 4, mul: true, life: 1.8 } },
          { at: 1.5, sfx: 'quake', vol: 0.8 }, { at: 1.6, shake: 5 },
          { at: 0.4, cam: { x: 3.6, y: 1.4, z: -9.0, yaw: -2.33, pitch: 0.14, F: 1.0, ease: 5 } }] },
      // The last floor fell silent.  (wide, from above: they fall on it; it is gone; he kneels alone)
      { cam: { x: 8, y: 4.6, z: -4.5, yaw: -2.2, pitch: -0.3, F: 1.0, cut: true },
        do: [{ who: 'g1', to: [-1.8, 0, -10.0], speed: 3, anim: 'walk' }, { who: 'g2', to: [0.0, 0, -10.4], speed: 3, anim: 'walk' }, { who: 'g3', to: [1.8, 0, -10.0], speed: 3, anim: 'walk' },
          { at: 2.0, who: 'g1', anim: 'attack' }, { at: 2.15, who: 'g2', anim: 'attack' }, { at: 2.3, who: 'g3', anim: 'attack' },
          { at: 2.4, who: 'boss', pfx: [{ name: 'hit_big', scale: 3, add: true, h: 1.5 }, { name: 'smoke_dark', scale: 4, mul: true }] }, { at: 2.4, sfx: ['blow_big', 'quake'], vol: 0.95 }, { at: 2.4, shake: 11 }, { at: 2.4, flash: ['120,40,160', 0.4] },
          { at: 2.4, slow: [0.4, 1.0] }, { at: 2.5, who: 'boss', anim: 'ko' },
          { at: 3.4, who: 'boss', pfx: [{ name: 'dark_curse', scale: 3.5, life: 1.2 }, { name: 'smoke_dark', scale: 5, mul: true }] }, { at: 3.8, who: 'boss', hide: true },
          { at: 4.2, who: 'g1', pfx: { name: 'smoke_dark', scale: 3.6, mul: true } }, { at: 4.2, who: 'g2', pfx: { name: 'smoke_dark', scale: 4, mul: true } }, { at: 4.2, who: 'g3', pfx: { name: 'smoke_dark', scale: 3.6, mul: true } },
          { at: 4.5, who: 'g1', hide: true }, { at: 4.5, who: 'g2', hide: true }, { at: 4.5, who: 'g3', hide: true },
          { at: 4.5, who: 'climber', pose: 'kneel' }, { at: 2.8, cam: { x: 6.6, y: 3.8, z: -6.4, yaw: -2.2, pitch: -0.32, F: 1.05, ease: 6 } }] },
      // Then the Tower sounded: one vast note, and every soul in Erdra heard it.  (out and away)
      { cam: { x: 4, y: 6, z: -24, yaw: -0.16, pitch: -0.18, cut: true },
        do: [{ sfx: 'horn', vol: 0.9 }, { at: 0.1, flash: ['210,190,255', 1.4] }, { at: 0.1, shake: 2.5 },
          { at: 0.3, cam: { x: 120, y: 50, z: -330, yaw: -0.34, pitch: -0.06, ease: 9 } }] },
    ],
  };

  // ------------------------------------------------------------ the light (p.light)
  C['p.light'] = {
    set: 'summit', vars: { light: 0.2 },
    actors: CAST().map((a) => (a.id === 'climber' ? Object.assign(a, { y: 0, z: 8.5 }) : a)),
    beats: [
      // Above the final steps was a brightness too pale to see through.
      { cam: { x: 1.2, y: 1.0, z: 2.5, yaw: -0.05, pitch: 0.18, cut: true },
        do: [{ vars: { light: [1, 3] } }, { who: 'climber', to: [0, 0, 15.2], speed: 1.0, anim: 'walk', then: 'idle' }, { at: 0.3, cam: { x: 1.0, y: 1.0, z: 5, yaw: -0.05, pitch: 0.2, ease: 7 } }] },
      // The climber reached toward it.
      { cam: { x: 0.9, y: 0.9, z: 9.5, yaw: -0.03, pitch: 0.26, cut: true },
        do: [{ who: 'climber', to: [0, 2.25, 20.1], speed: 0.9, anim: 'walk', then: 'idle' }, { at: 4.0, who: 'climber', pose: 'reach' }, { at: 4.0, vars: { light: [1.8, 1.5] } },
          { at: 5.2, flash: ['255,250,240', 1.2] }, { at: 0.3, cam: { x: 0.9, y: 1.0, z: 11.5, yaw: -0.03, pitch: 0.28, ease: 6 } }] },
    ],
  };
})();
