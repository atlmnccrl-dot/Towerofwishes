// Act III, region III — The Empyrean. (PROPOSAL: names and texts in this file are proposals for the author.)
// The top of the Spire opens into the hub of the Wheel, a heaven turned inside out: isles of white marble
// and gold floating in an endless pale sky, bridges between them, broken halos hanging in the air, the
// choir-stalls of empty masks, rivers of light pouring off the isles' edges, feathers drifting down, and
// far off the vast Wheel of eyes turning. In the last court, under the Great Bell's twin that holds the
// Voice, the Wheel itself comes down to guard it. The final fight; the choice; the endings.
import * as P from '../props/empyrean.js';
import { barrier3 } from '../kit3.js';
import { VARIANTS } from '../../game/variants.js';

const ISLES = [
  [-4, 4, 8, 15],          // the threshold
  [-7, -15, 10, -2],       // the empty choir
  [-6, -32, 10, -20],      // the river of light
  [-2, -41, 10, -37],      // the isle of the hanging halo
  [-8, -64, 16, -44],      // the court of the Voice (24 x 20)
];
const BRIDGES = [
  [1, -2, 4.4, 4],
  [1.4, -20, 4.8, -15],
  [2, -37, 5.4, -32],
  [2.4, -44, 5.8, -41],
  [2.6, -68, 6.4, -64],    // the way out, into the light (after the Wheel)
];
const WALKS = [...ISLES, ...BRIDGES];
const BOUNDS = [-16, -68, 20, 16];

export default {
  variants: VARIANTS.empyrean, // the run's area variants: layout, condition, foes, boss pool, events (js/game/variants.js)
  id: 'empyrean', name: 'The Empyrean', tagline: 'THE HUB OF THE WHEEL. HEAVEN, TURNED INSIDE OUT.', tier: 14, act: 3,
  start: { x: 2.6, z: 12.6, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['veilGate', 'wheelGate'],
  ambience: {
    fog: 0xe4dcd0, fogNear: 77, fogFar: 160, background: P.SKY, moon: 1.6, moonColor: 0xfff6ea, moonDir: [0.35, 1, -0.55], hemi: 1.5, hemiSky: 0xf4f0ff, hemiGround: 0x8a8690,
    fill: 1.3, fillColor: 0xe0d8f0, ambient: 0x6e685e, ambientI: 0.85, rain: 0, lightning: false, weather: 'feathers',
    grade: { gain: [1.0, 1.0, 1.01], lift: [0.02, 0.02, 0.026], sat: 0.78, vignette: 0.35, bloom: 0.35 },
    beams: [],
  },
  lamps: [{ id: 'threshold', x: -2.6, z: 8.6, sx: 1.3, sz: 0.3 }, { id: 'halo', x: 7.6, z: -38.6, sx: -1.4, sz: 0.2 }],
  items: [{ id: 'c1', x: -3.4, z: -13.6, ry: 0, kind: 'embers', amount: 480 }, { id: 'c2', x: 8.8, z: -28.6, ry: -Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [-4, 9, 8, 15], text: 'NO RAIN HERE. NO NIGHT. NO SOUND AT ALL.' },
    { zone: [1, -2, 4.4, 1], text: 'THE CHOIR IS EMPTY. THE MASKS STILL SING.' },
    { zone: [1.4, -20, 4.8, -17], text: 'THE LIGHT RUNS OFF THE STONE. CROSS ON THE SLABS.' },
    { zone: [-2, -41, 10, -38.4], text: 'THE VOICE IS NEAR. SO IS ITS KEEPER.' },
  ],
  foes: [
    { t: 'choirmask', x: 0.4, z: 6.4 }, { t: 'choirmask', x: 5.6, z: 5.6 }, { t: 'hollowangel', x: 2.6, z: 4.8 },
    { t: 'hollowangel', x: 1.6, z: -39.4 }, { t: 'choirmask', x: 5, z: -40 },
  ],
  encounters: [
    { id: 'choir', zone: [-3.2, -14.4, 9, -2.4], gates: ['veilGate'], opens: ['choirGate'], msg: 'THE MASKS TURN TOWARD YOU AND SING', done: 'THE LIGHT ACROSS THE WAY GOES OUT',
      waves: [
        { pre: true, foes: [{ t: 'choirmask', x: -1.4, z: -8.6 }, { t: 'choirmask', x: 5.4, z: -9.8 }, { t: 'hollowangel', x: 1.4, z: -12.8 }, { t: 'choirmask', x: 6.6, z: -4.6 }] },
        { foes: [{ t: 'gildedknight', x: 2, z: -12.6 }, { t: 'choirmask', x: -2, z: -5 }, { t: 'hollowangel', x: 7.6, z: -9 }, { t: 'hollowangel', x: -1.6, z: -12 }] },
      ] },
    { id: 'river', zone: [-5, -31.4, 9, -20.6], gates: ['choirGate'], opens: ['riverGate'], msg: 'THE RIVER OF LIGHT RISES', done: 'THE WAY TO THE VOICE IS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'gildedknight', x: 1.2, z: -29.4, face: 0 }, { t: 'hollowangel', x: 5.4, z: -28.4 }, { t: 'choirmask', x: -1.4, z: -22.8 }, { t: 'choirmask', x: 5.4, z: -22.4 }] },
        { foes: [{ t: 'gildedknight', x: 6.4, z: -30.4 }, { t: 'hollowangel', x: -3.8, z: -22.4 }, { t: 'choirmask', x: 8.4, z: -23.6 }, { t: 'choirmask', x: 2, z: -30.8 }] },
      ] },
  ],
  boss: { type: 'wheel', x: 4, z: -52, face: 0, zone: [-7.6, -63.6, 15.6, -44.4], gates: ['wheelGate'], opens: ['exitGate', 'wheelGate'] },
  exit: { zone: [2.8, -67.6, 6.2, -66], to: 'end', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ the sky: clouds far below, the Wheel far off
    P.clouds(ctx, BOUNDS[0] - 40, BOUNDS[1] - 40, BOUNDS[2] + 40, BOUNDS[3] + 40, -9, { color: 0xffffff, opacity: 0.55, seed: 61, tile: 30, speed: 1.2, density: 0.7 });
    P.clouds(ctx, BOUNDS[0] - 40, BOUNDS[1] - 40, BOUNDS[2] + 40, BOUNDS[3] + 40, -16, { color: 0xf4ece0, opacity: 0.5, seed: 62, tile: 40, speed: 0.6, density: 0.8, order: -10 });
    P.skyWheel(ctx, 4, 8.5, -63, { k: 0.9, anchor: [4, -54], level: 'empyrean' });

    // ------------------------------------------------ the isles and the bridges
    for (const r of ISLES) P.isle(ctx, ...r);
    for (const r of BRIDGES) P.bridge(ctx, ...r);
    P.voidFill(ctx, BOUNDS, WALKS);
    for (const [x, y, z, s] of [[-11, -4, 8, 1.4], [13, -6, 4, 1.2], [-12, -3, -9, 1.8], [14, -5, -20, 1.4], [-11, -6, -36, 1.6], [18, -4, -50, 1.3], [-12, -5, -56, 1.5], [9, -7, -34, 1.0], [-6, -7, -18, 0.9], [13, -3, -40, 0.8]]) P.shard(ctx, x, y, z, s);

    // ------------------------------------------------ the threshold
    P.halo(ctx, 2.6, 2.6, 15.8, 2.4, { tilt: 0, ry: 0, speed: 0.06, light: 4 });
    P.angel(ctx, -3, 13, Math.PI * 0.75); P.angel(ctx, 7.2, 13.2, -Math.PI * 0.75 + Math.PI / 2);
    P.column(ctx, -3.2, 5.2, 3.6, { broken: true }); P.column(ctx, 7.2, 5.4, 4.2);
    P.lumen(ctx, 6.8, 9.8);
    P.halo(ctx, -9, 3, 6, 3.4, { tilt: 0.9, ry: 0.5, speed: 0.08 }); P.halo(ctx, 12.4, 1.2, 10, 2.2, { tilt: 1.2, ry: -0.4, speed: -0.1 });
    K.fallenBody(ctx, 4.6, 9.6, 1.2, 0x2a2622); K.droppedSword(ctx, 5.4, 10.2, 2.4);
    ctx.marks.veilGate = barrier3(ctx, 2.7, -1.2, 3.6, 'x', 'light', { open: true });

    // ------------------------------------------------ the empty choir (first fight)
    P.choir(ctx, -4.2, -14.6, -4.2, -2.4, '+x', 3);
    P.choir(ctx, 6.4, -14.1, 9.8, -14.1, '+z', 1);
    P.decal(ctx, 2.6, -8.4, 8.4, P.sigilTex(), 0xd8a850, { k: 0.3, pulse: 0.6, spin: 0.01 });
    P.angel(ctx, 9, -3.4, -Math.PI / 2); P.column(ctx, 9.2, -9, 3.4, { broken: true });
    P.lumen(ctx, 5.4, -3.2); P.lumen(ctx, 0.2, -14);
    P.halo(ctx, -10.6, 4.2, -9, 3.8, { tilt: 0.4, ry: 1.2, speed: 0.07 }); P.halo(ctx, 13, 0.4, -9.6, 2.6, { tilt: 1.3, ry: 0.2, speed: -0.09 });
    K.fallenBody(ctx, 3.4, -6.2, -0.6, 0x2a2622); K.droppedSword(ctx, 4.2, -5.6, 1.9);
    ctx.marks.choirGate = barrier3(ctx, 3.1, -15.6, 3.6, 'x', 'light');

    // ------------------------------------------------ the river of light (second fight)
    P.lightRiver(ctx, -6, -26.4, 10, -24.8, [-1.6, 6], { falls: [[-6.05, -25.6, 1.6, '-x'], [10.05, -25.6, 1.6, '+x']] });
    P.halo(ctx, -3.4, 0, -29.6, 1.8, { ground: true }); P.halo(ctx, 7.4, 0, -21.8, 1.5, { ground: true });
    P.angel(ctx, -5, -21.2, Math.PI * 0.75); P.angel(ctx, -5, -31, Math.PI * 0.25);
    P.column(ctx, 9.2, -21, 3.8); P.column(ctx, 9, -31, 2.6, { broken: true });
    P.lumen(ctx, 2.4, -21); P.lumen(ctx, 5, -31);
    P.halo(ctx, -10, 5, -27, 4.4, { tilt: 0.3, ry: 0.9, speed: 0.05 }); P.halo(ctx, 13.4, 1, -28, 2.4, { tilt: 1.1, ry: -0.6, speed: 0.11 });
    K.fallenBody(ctx, 6, -28.6, 2.2, 0x2a2622);
    ctx.marks.riverGate = barrier3(ctx, 3.7, -32.6, 3.6, 'x', 'light');

    // ------------------------------------------------ the isle of the hanging halo
    P.halo(ctx, 3.4, 4.6, -39.4, 3, { tilt: 1.35, ry: 0.4, speed: 0.1, light: 3 });
    P.angel(ctx, -1.2, -40.2, Math.PI * 0.25); P.column(ctx, 9.4, -40.4, 3.2, { broken: true });
    P.lightFall(ctx, 10.05, -39, 1.4, '+x');
    ctx.marks.wheelGate = barrier3(ctx, 4.1, -42.4, 3.6, 'x', 'light', { open: true });

    // ------------------------------------------------ the court of the Voice
    P.voiceBell(ctx, 4, -60.2, { size: 6, lip: 3.6 });
    P.decal(ctx, 4, -53.4, 17, P.sigilTex(), 0xd8a850, { k: 0.22, pulse: 0.5, spin: -0.006 });
    P.ring(ctx, 4, -53.4, 9.2); P.ring(ctx, 4, -53.4, 5.2);
    P.choir(ctx, -6.2, -62.2, -6.2, -46.4, '+x', 2); P.choir(ctx, -6.2, -62.2, 1.6, -62.2, '+z', 2); P.choir(ctx, 7.4, -62.2, 15.8, -62.2, '+z', 2);
    for (const [x, z, h] of [[-7.2, -44.6, 4.4], [15.2, -44.6, 3.6]]) P.column(ctx, x, z, h, { broken: h < 4 });
    for (const [x, z] of [[-4.6, -50], [-4.6, -58], [14.4, -50], [14.4, -58]]) P.lumen(ctx, x, z);
    P.lightFall(ctx, 16.05, -50, 1.4, '+x'); P.lightFall(ctx, 16.05, -58.4, 1.8, '+x'); P.lightFall(ctx, 0, -64.05, 1.6, '+z');
    P.halo(ctx, -11.4, 5, -54, 4.6, { tilt: 0.2, ry: 1.3, speed: 0.04 }); P.halo(ctx, 19, 0.6, -47, 2.6, { tilt: 1.2, ry: 0.3, speed: -0.08 }); P.halo(ctx, 18.4, 2, -60, 3.2, { tilt: 0.7, ry: -0.5, speed: 0.06 });
    K.fallenBody(ctx, 11, -48.6, 0.9, 0x2a2622); K.droppedSword(ctx, 12, -48, 2.4);
    ctx.marks.exitGate = barrier3(ctx, 4.5, -64.6, 4, 'x', 'light');

    // ------------------------------------------------ feathers drifting down over it all
    P.feathers(ctx, [[-6, -64, 16, -44], [-7, -32, 10, -2], [-4, -41, 10, -32], [-4, 4, 8, 15]], 56);
  },
};
