// Act II, region I — The Frostmarch. (PROPOSAL: names and texts in this file are proposals for the author.)
// North out of the city on the old border road: through the firs under the crags, across the frozen river
// where the waterfall hangs in ice, into the yard of a border chapel whose bell-tower stands locked in
// ice, up the pass, and into the giant's cirque under the glacier, where the Frost Giant waits.
// Snow instead of rain; a cold blue moon; the lamps the only warm light.
import * as P from '../props/frostmarch.js';
import { rockFill } from '../props/undercroft.js';
import { W2, barrier, floorGlow } from '../kit2.js';

const WALKS = [
  [-5.5, -4.0, 8.5, 18],     // the north road among the firs
  [1.2, -5.2, 4.8, -4.0],    // the ford barrier
  [-7, -16.8, 10, -5.2],     // the frozen river
  [1.2, -18, 4.8, -16.8],    // the far bank barrier
  [-5.5, -32.4, 9, -18],     // the chapel yard under the bell-tower
  [1.6, -33.6, 5.2, -32.4],  // the yard's north gap
  [-1, -38, 9, -33.6],       // the pass and the last lamp
  [2.4, -39.2, 6.4, -38],    // the cirque's mouth
  [-6.5, -58.4, 14.5, -39.2],// the giant's cirque
  [2.6, -62, 6.4, -58.4],    // the way on, through the glacier
];
const BOUNDS = [-16, -62, 18, 18];

export default {
  id: 'frostmarch', name: 'The Frostmarch', tagline: 'BEYOND THE WALLS THE TOLL CARRIES NORTH. THE SNOW ANSWERS.', tier: 8, act: 2,
  start: { x: 1.6, z: 15.4, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['fordGate', 'cirqueGate'],
  ambience: {
    fog: 0x24344a, fogNear: 72, fogFar: 150, sky: 0x0c1420, moon: 2.3, moonColor: 0xa8c8f4, moonDir: [0.4, 1, -0.75], hemi: 1.15, hemiSky: 0x7088b0, hemiGround: 0x2a3444,
    fill: 1.4, fillColor: 0x8aa0c8, ambient: 0x1c2a40, ambientI: 0.7, rain: 0, lightning: false, weather: 'snow',
    grade: { gain: [0.94, 1.0, 1.1], lift: [0.004, 0.008, 0.016], sat: 0.74 },
    beams: [{ x: 2, z: 9, r: 5, h: 15, from: [6, 0, -10], intensity: 50 }, { x: -2, z: -24, r: 5.5, h: 15, from: [6, 0, -10], intensity: 55 }, { x: 4, z: -49, r: 8, h: 18, from: [6, 0, -9], intensity: 75 }],
  },
  lamps: [{ id: 'road', x: -3.8, z: 8.6, sx: 1.3, sz: 0.3 }, { id: 'pass', x: 7.6, z: -36.2, sx: -1.4, sz: 0.2 }],
  items: [{ id: 'c1', x: -5.6, z: -15.2, ry: Math.PI / 2, kind: 'embers', amount: 200 }, { id: 'c2', x: -4.4, z: -26.6, ry: Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [-5, 12, 8, 18], text: 'SNOW, NOT RAIN. THE CITY IS BEHIND YOU NOW.' },
    { zone: [-5, -3.6, 8, 0], text: 'WOLVES HUNT IN PACKS. DO NOT LET THEM CIRCLE YOU.' },
    { zone: [-5, -21, 9, -18.4], text: 'AN OLD BELL HANGS IN THE ICE. IT DID NOT STOP THEM.' },
    { zone: [-1, -38, 9, -34.6], text: 'THE GROUND SHAKES BEYOND THE PASS.' },
  ],
  foes: [
    { t: 'frostwolf', x: 1.4, z: 1.4 }, { t: 'frostwolf', x: 4.8, z: -0.2 }, { t: 'icewraith', x: 2.6, z: -2.6 },
    { t: 'frostwolf', x: 1.2, z: -35.4 }, { t: 'icewraith', x: 4.2, z: -36.8 },
  ],
  encounters: [
    { id: 'river', zone: [-5, -15, 8, -6.8], gates: ['fordGate'], opens: ['iceGate'], msg: 'THE ICE GROANS. SHAPES ON THE RIVER.', done: 'THE ICE ON THE FAR BANK CRACKS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'frostwolf', x: -2.4, z: -12.4 }, { t: 'frostwolf', x: 5.6, z: -13.2 }, { t: 'frostwolf', x: 1.8, z: -14.6 }, { t: 'icewraith', x: 7.4, z: -9.6 }] },
        { foes: [{ t: 'yeti', x: 2.4, z: -13.8 }, { t: 'frostwolf', x: -3.6, z: -8.4 }, { t: 'icewraith', x: 7.6, z: -14.4 }] },
      ] },
    { id: 'yard', zone: [-4, -30, 8, -20.4], gates: ['iceGate'], opens: ['towerGate'], msg: 'SOMETHING STIRS AMONG THE GRAVES', done: 'THE WAY NORTH CLEARS',
      waves: [
        { pre: true, foes: [{ t: 'yeti', x: 2.8, z: -29.6, face: 0 }, { t: 'icewraith', x: -2.6, z: -28.8, face: 0 }, { t: 'frostwolf', x: 6.8, z: -27.2 }, { t: 'frostwolf', x: 0.4, z: -25.8 }] },
        { foes: [{ t: 'yeti', x: -2.8, z: -22.4 }, { t: 'icewraith', x: 7.4, z: -22 }, { t: 'frostwolf', x: 3.4, z: -30.4 }, { t: 'frostwolf', x: 6.4, z: -30.2 }] },
      ] },
  ],
  boss: { type: 'frostgiant', x: 4.2, z: -50, face: 0, zone: [-6, -58, 14, -40.2], gates: ['cirqueGate'], opens: ['exitGate', 'cirqueGate'] },
  exit: { zone: [2.8, -61.6, 6.2, -59.8], to: 'ashdunes', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ ground: snow everywhere, the road trodden darker
    K.floor(ctx, BOUNDS[0] - 30, BOUNDS[1] - 30, BOUNDS[2] + 30, BOUNDS[3] + 30, W2.snow(P.SNOW2), -0.02, 0.3);
    K.floor(ctx, -5.5, -4.0, 8.5, 18, W2.snow(P.SNOW), 0.0, 0.3);
    K.floor(ctx, 0.4, -4.4, 4.2, 18, W2.snow(P.PATH), 0.012, 0.3);
    K.floor(ctx, -5.5, -32.4, 9, -18, W2.snow(P.SNOW), 0.0, 0.3);
    K.floor(ctx, 1, -38, 5.6, -17, W2.snow(P.PATH), 0.012, 0.3);
    K.floor(ctx, -1, -38, 9, -33.6, W2.snow(P.SNOW), 0.0, 0.3);
    K.floor(ctx, -6.5, -62, 14.5, -39.2, W2.snow(P.SNOW), 0.0, 0.3);
    P.river(ctx, BOUNDS[0] - 4, -14.4, BOUNDS[2] + 4, -8.6, [[-4.6, -9.6, 1.6, 0.9], [8.6, -13.6, 1.4, 1.0], [6.6, -9.4, 0.9, 0.6]]);
    K.floor(ctx, -3, -55.4, 11.6, -43.6, W2.ice('#5e86a8'), 0.01, 0.3);
    rockFill(ctx, BOUNDS, WALKS, 2.2);

    // ------------------------------------------------ the north road
    // behind the start: the drifts the road came through, a waymarker
    P.drift(ctx, -2.2, 17.2, 4, 2, 0.7, { solid: false }); P.drift(ctx, 6.8, 17, 3, 2.2, 0.6, { solid: false });
    P.standingStone(ctx, -1.6, 15.6, 1.8, 0.2);
    P.buriedCart(ctx, 6.4, 12.6, 0.5);
    // the far side (west): crags and big firs; the near side (east): drifts and saplings
    P.crag(ctx, -11, -4.2, -6.2, 6, 5.5, { face: '+x' }); P.crag(ctx, -10, 6, -6.4, 12.8, 4.2, { face: '+x' });
    P.pine(ctx, -6.4, 13.6, 6.5); P.pine(ctx, -7.2, 15.8, 5); P.pine(ctx, -6.8, 1.6, 5.2, { solid: false });
    P.rock(ctx, -5.6, 3.4, 1.0); P.rock(ctx, -5.8, -2.6, 1.3); P.rock(ctx, -4.8, 11.6, 0.7);
    P.drift(ctx, 9.4, 8, 2.4, 5, 0.7); P.drift(ctx, 9.6, -1.4, 2.2, 4.4, 0.6); P.pine(ctx, 9.4, 3.4, 1.8); P.pine(ctx, 9, 13.8, 1.6); P.rock(ctx, 9.1, 0.4, 0.8);
    P.stakes(ctx, 8.2, 14.6, 8.2, 4.8);
    P.postLantern(ctx, 4.8, 4.2); P.postLantern(ctx, -0.6, -2.2);
    P.coldFire(ctx, -2.4, 4.6);
    K.fallenBody(ctx, 5.6, 6.6, 1.2, 0x1a1c22); K.droppedSword(ctx, 6.2, 7.4, 2.4);
    P.pennant(ctx, -4.6, 0.8, 3.2);

    // ------------------------------------------------ the frozen river (first fight)
    // the ford: rocks pinch the road to the barrier
    P.rock(ctx, -0.4, -4.4, 1.6, { solid: false }); P.rock(ctx, 6.4, -4.6, 1.4, { solid: false }); P.drift(ctx, -3.6, -4.6, 3.4, 1.2, 0.7, { solid: false }); P.drift(ctx, 8, -4.6, 3, 1.2, 0.6, { solid: false });
    ctx.marks.fordGate = barrier(ctx, 3, -4.6, 3.6, 'x', 'ice', { open: true });
    // the far bank: the crag the river falls from, its waterfall frozen
    P.crag(ctx, -13, -18.4, -7, -5.2, 7.4, { face: '+x' });
    P.frozenFall(ctx, -7.2, -11.5, 7.2, 3);
    P.icicles(ctx, -6.6, -16.2, -6.6, -13.6, 4.2, { len: 1 });
    P.rock(ctx, -6.4, -6.6, 1.0); P.rock(ctx, -6.2, -16.2, 0.9);
    P.giantSkull(ctx, 8.6, -6.8, -0.9);
    P.drift(ctx, 10.4, -11.6, 1.6, 8, 0.6, { solid: false });
    P.rock(ctx, 9.3, -15.6, 0.9); P.rock(ctx, -6.4, -8.4, 0.6);
    // the far edge of the clearing (north): snow banks and rocks pinching to the barrier
    P.drift(ctx, -3, -17.2, 7.6, 1.6, 0.9, { solid: false }); P.drift(ctx, 8, -17.2, 5, 1.6, 0.8, { solid: false });
    P.rock(ctx, 0.4, -17.4, 1.3, { solid: false }); P.rock(ctx, 5.8, -17.6, 1.2, { solid: false });
    ctx.marks.iceGate = barrier(ctx, 3, -17.4, 3.6, 'x', 'ice');
    K.fallenBody(ctx, 3.6, -11.2, -0.5, 0x1a1c22); K.droppedSword(ctx, 4.6, -10.6, 1.9);
    P.postLantern(ctx, 9, -6.2, { intensity: 4 });

    // ------------------------------------------------ the chapel yard and the bell-tower (second fight)
    P.bellTower(ctx, -8.2, -24.6, { w: 4.4, h: 9 });
    P.crag(ctx, -14, -33, -6.2, -27.4, 6.2, { face: '+x' }); P.crag(ctx, -13, -21.6, -6.2, -18.2, 4.6, { face: '+x' });
    // the chapel's ruined west wall along the far side, graves in rows
    K.wall(ctx, -5.9, -32.6, -5.9, -27.2, 2.6, { face: 1, buttress: 2.6, tone: '#3e4452' });
    P.lowWall(ctx, 9.4, -31.8, 9.4, -18.6); P.lowWall(ctx, -5.4, -18.2, 0.6, -18.2, 0.7); P.lowWall(ctx, 5.4, -18.2, 9.4, -18.2, 0.7);
    for (const [x, z] of [[-1.6, -21.2], [0.2, -21.6], [6.2, -21.2], [7.8, -21.6], [-2.6, -24.4], [6.4, -24.6], [-1, -27.4], [7.2, -27.8]]) P.grave(ctx, x, z, (x * 7) % 0.4 - 0.2);
    P.standingStone(ctx, 2.2, -31.4, 2.2, 0.1);
    P.postLantern(ctx, -4.6, -19.4, { intensity: 4 }); P.postLantern(ctx, 8.6, -30.4, { intensity: 4 });
    P.drift(ctx, 3.4, -24.4, 2.2, 1.6, 0.5, { solid: false });
    K.fallenBody(ctx, 4.4, -25.8, 2.2, 0x1a1c22); K.droppedSword(ctx, 3.2, -26.4, 0.6);
    // the north edge: rocks and firs pinch to a gap
    P.crag(ctx, -6, -36, 1.4, -32.6, 3.4, { face: '+z' }); P.rock(ctx, 6.8, -33, 1.2, { solid: false }); P.drift(ctx, 8.4, -33, 2, 1.6, 0.6, { solid: false });
    ctx.marks.towerGate = barrier(ctx, 3.4, -33, 3.6, 'x', 'ice');

    // ------------------------------------------------ the pass
    P.crag(ctx, -8, -40, -1.2, -36, 5.8, { face: '+x' });
    P.rock(ctx, 9.4, -35, 1.0); P.drift(ctx, 9.6, -37.2, 1.6, 2.6, 0.6);
    P.pennant(ctx, -0.4, -34.2, 3.4); K.fallenBody(ctx, 1.4, -37.2, -1.2, 0x1a1c22);
    P.rock(ctx, 1.6, -38.6, 1.4, { solid: false }); P.rock(ctx, 7.6, -38.6, 1.2, { solid: false });
    ctx.marks.cirqueGate = barrier(ctx, 4.4, -38.6, 4, 'x', 'ice', { open: true });

    // ------------------------------------------------ the giant's cirque
    P.glacier(ctx, -14, -66, 18, -58.6, 9, '+z');
    P.glacier(ctx, -14, -58.6, -6.6, -39.4, 7.5, '+x');
    P.crag(ctx, 8.2, -42, 14, -39.4, 3, { face: '+z', solidFace: false });
    // standing stones ring the frozen lake
    const ring = [[-4.6, -42], [-5.4, -47.4], [-5.2, -53], [-3.8, -57], [12.8, -57.2], [13.6, -51.6], [13.2, -45.6]];
    ring.forEach(([x, z], i) => P.standingStone(ctx, x, z, i < 4 ? 3.4 : 1.8, i * 0.4));
    P.giantRibs(ctx, -3, -49, 5, 0.1); P.giantSkull(ctx, 11.6, -42.4, -2.4);
    P.drift(ctx, 14.6, -49, 1.6, 14, 0.7, { solid: false }); P.drift(ctx, 9.4, -39.8, 4, 1.2, 0.5, { solid: false });
    for (const [x, z] of [[-4.4, -40.4], [12.6, -41], [12.4, -58]]) P.postLantern(ctx, x, z, { intensity: 4.5 });
    K.fallenBody(ctx, 7, -45.2, 0.8, 0x1a1c22); K.droppedSword(ctx, 8, -44.4, 2.1); K.fallenBody(ctx, 0.4, -53.4, -1.4, 0x1a1c22);
    floorGlow(ctx, 4.2, -49.4, 9, 7, 0x6aa8e8, 0.25);
    // the way on, through a crevasse in the glacier
    ctx.marks.exitGate = barrier(ctx, 4.5, -59, 3.8, 'x', 'ice');

    // ------------------------------------------------ the wilds round it all
    P.wilds(ctx, BOUNDS, WALKS, { seed: 808, skip: [[-15, -70, 19, -58.6], [-15, -58.6, -6.6, -39], [-14, -33, -6, -18], [-13, -18.4, -7, -5.2], [-11, -4.2, -6.2, 12.8], [-8, -40, -1.2, -32.6], [-6, -36, 1.4, -32.6], [8.2, -42, 14, -39.4], [-15, -16, 19, -6]] });
  },
};
