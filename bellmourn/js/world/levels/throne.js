// Act VI — The Throne of the Toll. (PROPOSAL: names and texts in this file are proposals for the author.)
// Above the clouds, past the end of heaven: a short isle of white stone where the last of the Hushed kneel, a
// bridge of light, and the vast court of God's throne: a floor of bronze-veined marble ringed by columns, the
// throne itself a great cracked bell turned into a seat, and behind it the sun. God sits there. The fight's
// layout (where He sits, where the bells come down, where the floor cracks) is THRONE in js/game/bosses8.js.
import * as P from '../props/empyrean.js';
import { barrier3 } from '../kit3.js';
import { THRONE } from '../../game/bosses8.js';

const ISLES = [
  [-4, 4, 8, 15],          // the threshold, where the last Hushed kneel
  THRONE.floor,            // the court of the throne [-13, -31, 17, -2]
];
const BRIDGES = [[0.4, -2, 3.6, 4]];
const WALKS = [...ISLES, ...BRIDGES];
const BOUNDS = [-18, -38, 22, 16];

export default {
  id: 'throne', name: 'The Throne of the Toll', tagline: 'ABOVE THE CLOUDS. ABOVE HEAVEN. HIM.', tier: 26, act: 6,
  start: { x: 2, z: 12, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['bridgeGate', 'throneGate'],
  ambience: {
    fog: 0xf0e2c8, fogNear: 70, fogFar: 150, background: P.SKY, moon: 2.0, moonColor: 0xfff0d0, moonDir: [0.2, 1, -0.7], hemi: 1.6, hemiSky: 0xfff4e0, hemiGround: 0x8a7a60,
    fill: 1.4, fillColor: 0xffe8c0, ambient: 0x706450, ambientI: 0.9, rain: 0, lightning: false, weather: 'feathers',
    grade: { gain: [1.03, 1.0, 0.95], lift: [0.03, 0.025, 0.015], sat: 0.85, vignette: 0.4, bloom: 0.45 },
    beams: [],
  },
  lamps: [{ id: 'threshold', x: -2.6, z: 8.6, sx: 1.3, sz: 0.3 }],
  items: [{ id: 't1', x: 7, z: 13, ry: 0, kind: 'tonic' }],
  hints: [
    { zone: [-4, 9, 8, 15], text: 'THE BELLS ARE SILENT. EVEN THE WIND KNEELS.' },
    { zone: [0.4, -2, 3.6, 2], text: 'HE IS WAITING. HE HAS ALWAYS BEEN WAITING.' },
  ],
  foes: [],
  encounters: [
    { id: 'kneel', zone: [-4, 5.4, 8, 11], gates: ['bridgeGate'], opens: ['bridgeGate'], msg: 'THE KNEELING RISE', done: 'THE WAY TO THE THRONE IS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'hollowangel', x: 0, z: 6 }, { t: 'choirmask', x: 5, z: 6.4 }, { t: 'gildedknight', x: 2.4, z: 5 }] },
        { foes: [{ t: 'gildedknight', x: -2, z: 6 }, { t: 'hollowangel', x: 6.6, z: 7 }, { t: 'choirmask', x: 2, z: 4.6 }] },
      ] },
  ],
  boss: { type: 'god', x: THRONE.home.x, z: THRONE.home.z, face: 0, zone: [-12.6, -30.6, 16.6, -3], gates: ['throneGate'], opens: ['throneGate'] },
  exit: { zone: [0.4, 13.6, 3.6, 15], to: 'end', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ the sky: clouds far below, the sun behind the throne
    P.clouds(ctx, BOUNDS[0] - 40, BOUNDS[1] - 40, BOUNDS[2] + 40, BOUNDS[3] + 40, -10, { color: 0xffffff, opacity: 0.6, seed: 71, tile: 30, speed: 1.0, density: 0.75 });
    P.clouds(ctx, BOUNDS[0] - 40, BOUNDS[1] - 40, BOUNDS[2] + 40, BOUNDS[3] + 40, -18, { color: 0xfff0d8, opacity: 0.5, seed: 72, tile: 40, speed: 0.5, density: 0.8, order: -10 });
    P.halo(ctx, 2, 9, -36, 9, { tilt: 0, ry: 0, speed: 0.03, light: 6 }); // the sun-ring behind the throne

    // ------------------------------------------------ the isles and the bridge
    for (const r of ISLES) P.isle(ctx, ...r);
    for (const r of BRIDGES) P.bridge(ctx, ...r);
    P.voidFill(ctx, BOUNDS, WALKS);
    for (const [x, y, z, s] of [[-12, -4, 8, 1.4], [14, -6, 6, 1.2], [-16, -5, -14, 1.8], [20, -5, -20, 1.5], [-15, -7, -30, 1.3], [21, -6, -34, 1.1]]) P.shard(ctx, x, y, z, s);

    // ------------------------------------------------ the threshold: the last Hushed kneel here
    P.angel(ctx, -3, 13.4, Math.PI * 0.75); P.angel(ctx, 7.2, 13.4, -Math.PI * 0.25);
    P.column(ctx, -3.2, 5.2, 3.8); P.column(ctx, 7.2, 5.4, 3.0, { broken: true });
    P.lumen(ctx, 6.8, 9.8); P.lumen(ctx, -2.4, 10.4);
    ctx.marks.bridgeGate = barrier3(ctx, 2, 3.6, 3.4, 'x', 'light');

    // ------------------------------------------------ the court of the throne
    P.voiceBell(ctx, THRONE.home.x, THRONE.home.z - 7.5, { size: 6, lip: 4 }); // the throne: the cracked Great Bell, a seat for Him
    P.decal(ctx, 2, -17, 26, P.sigilTex(), 0xe8b860, { k: 0.26, pulse: 0.5, spin: 0.004 });
    P.ring(ctx, 2, -17, 12.5); P.ring(ctx, 2, -17, 8); P.ring(ctx, 2, -17, 4);
    for (const [x, z, h] of [[-12.4, -3, 5.2], [16.4, -3, 5.2], [-12.4, -12, 6], [16.4, -12, 6], [-12.4, -22, 6.8], [16.4, -22, 6.8], [-12.4, -30.4, 7.6], [16.4, -30.4, 7.6]]) P.column(ctx, x, z, h);
    for (const [x, z] of [[-11, -7], [15, -7], [-11, -26], [15, -26]]) P.lumen(ctx, x, z);
    for (const b of THRONE.bells) P.halo(ctx, b.x, 0, b.z, 1.6, { ground: true });
    P.lightFall(ctx, 17.05, -10, 1.6, '+x'); P.lightFall(ctx, 17.05, -24, 1.8, '+x'); P.lightFall(ctx, -13.05, -18, 1.8, '-x');
    P.halo(ctx, -16, 5, -10, 4, { tilt: 0.3, ry: 1.1, speed: 0.04 }); P.halo(ctx, 21, 2, -16, 3, { tilt: 1.1, ry: -0.4, speed: -0.07 });
    K.fallenBody(ctx, 9, -6, 0.9, 0x2a2622); K.droppedSword(ctx, 9.8, -5.4, 2.4);
    ctx.marks.throneGate = barrier3(ctx, 2, -0.4, 3.4, 'x', 'light', { open: true });

    // ------------------------------------------------ feathers and motes of light drifting over it all
    P.feathers(ctx, [THRONE.floor, [-4, 4, 8, 15]], 60);
  },
};
