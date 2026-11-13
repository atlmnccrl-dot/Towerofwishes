// District III — The Drowned Nave. Through St. Orrin's churchyard, in at the side door of the great
// cathedral (its west doors buried by the tide), down the flooded nave between the arcades, past the
// fallen chandelier, to the crossing where the Drowned Deacon preaches to the water.
import * as P from '../props/nave.js';

export default {
  id: 'nave', name: 'The Drowned Nave', tagline: 'THE TIDE CAME IN THROUGH THE DOORS. IT NEVER WENT OUT.', tier: 2,
  start: { x: 15.5, z: 14, face: Math.PI },
  bounds: [-17.5, -42.5, 22, 16.5],
  gatesOpen: ['lychGate', 'choirGate'],
  ambience: {
    fog: 0x1b2730, fogNear: 78, fogFar: 175, sky: 0x0a0e14, moon: 1.7, hemi: 1.0, rain: 1, lightning: true,
    beams: [
      { x: 15.4, z: 2.4, r: 5, h: 26, from: [6, 0, -10], intensity: 65 },
      { x: 0.2, z: -3, r: 5.2, h: 26, from: [6, 0, -10], intensity: 75 },
      { x: 0, z: -29.5, r: 7.5, h: 28, from: [6, 0, -10], intensity: 90 },
    ],
  },
  lamps: [{ id: 'yard', x: 11.6, z: 12.6, sx: 1.3, sz: 0.4 }, { id: 'choir', x: 5.4, z: -18.4, sx: -1.4, sz: 0.3 }],
  items: [{ id: 'c1', x: 19, z: -2.5, ry: 0, kind: 'embers', amount: 90 }, { id: 'c2', x: -6.4, z: -17.2, ry: Math.PI / 2, kind: 'embers', amount: 120 }],
  hints: [
    { zone: [12, 10.2, 21.5, 16.5], text: 'THE WEST DOORS ARE BURIED. THE SIDE DOOR STILL STANDS.' },
    { zone: [8.6, -0.8, 12, 2.6], text: 'INSIDE, THE WATER IS SHALLOW. IT ONLY SOUNDS DEEP.' },
    { zone: [-7.5, -8.6, 7.5, -6.4], text: 'PARRY AN ORB AND IT FLIES BACK AT WHOEVER CAST IT.' },
    { zone: [-7.5, -19.4, 7.5, -16.2], text: 'BEYOND THE SCREEN, SOMEONE IS PREACHING TO THE WATER.' },
  ],
  foes: [
    { t: 'hushed', x: -5.4, z: -8.8 }, { t: 'ghoul', x: 4.6, z: -15.2 }, { t: 'brute', x: 1, z: -14 }, { t: 'acolyte', x: -5.6, z: -13.2 },
  ],
  encounters: [
    { id: 'yard', zone: [10, 4.6, 21.2, 8.7], gates: ['lychGate'], opens: ['sideDoor'], msg: 'THE GRAVES ARE NOT EMPTY', done: 'THE SIDE DOOR SWINGS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'hushed', x: 13.6, z: 2.6 }, { t: 'hushed', x: 17.2, z: 0.4 }, { t: 'ghoul', x: 11.4, z: -0.9 }] },
        { foes: [{ t: 'ghoul', x: 11.2, z: -3.8 }, { t: 'ghoul', x: 19.6, z: -1.2 }, { t: 'hushed', x: 15.4, z: -4.4 }] },
      ] },
    { id: 'nave', zone: [3.9, -2.4, 7.2, 4], gates: ['sideDoor'], opens: ['naveGate'], msg: 'THE CONGREGATION RISES',
      waves: [
        { pre: true, foes: [{ t: 'acolyte', x: -0.2, z: 1, face: Math.PI }, { t: 'acolyte', x: -5.4, z: -2.8, face: Math.PI }, { t: 'acolyte', x: 2, z: -4.2, face: Math.PI }, { t: 'hushed', x: -1, z: -4.4, face: Math.PI }] },
        { foes: [{ t: 'warden', x: 0.2, z: -3.4 }, { t: 'hushed', x: -5.2, z: 1.6 }, { t: 'hushed', x: 5.6, z: 2.6 }, { t: 'acolyte', x: -5.8, z: -4.8 }] },
      ] },
  ],
  boss: { type: 'deacon', x: 0, z: -29.5, face: 0, zone: [-11.8, -36.4, 11.8, -22.2], gates: ['choirGate'], opens: ['exitGate'] },
  exit: { zone: [-16.4, -30.6, -13.8, -27.4], to: 'belfry', requires: 'boss' },
  build(K, ctx) {
    const W = K.M;
    // ------------------------------------------------ ground
    K.floor(ctx, -26, -56, 34, 28, W.dirt('#444c54'));
    K.floor(ctx, 8.5, -42, 22, -6.5, W.grass('#3a4642'), 0.005, 0.3);
    K.floor(ctx, 8.5, -6.5, 21.5, 9.5, W.grass('#4a5652'), 0.01, 0.3);
    K.floor(ctx, 8.5, 9.5, 30, 24, W.cobble('#56606e'), 0.01, 0.3);
    K.floor(ctx, 14.3, -0.4, 16.7, 9.5, W.flags('#646e7c'), 0.02, 0.3);
    K.floor(ctx, 8.5, -0.4, 14.3, 1.9, W.flags('#646e7c'), 0.02, 0.3);
    K.floor(ctx, -7.5, -19.8, 7.5, 5.5, W.flags('#68727f'), 0.01, 0.3);
    K.floor(ctx, -12.5, -41, 12.5, -19.8, W.court('#5e6876'), 0.01, 0.3);
    K.floor(ctx, -17.8, -31.4, -13.3, -26.6, W.flags('#4c5664'), 0.01, 0.3);
    P.flood(ctx, -7.5, -19.8, 7.5, 5.5);
    P.flood(ctx, -12.5, -41, 12.5, -19.8);

    // ------------------------------------------------ the street and the lychgate
    K.fence(ctx, 8.5, 6.6, 8.5, 16.8);
    K.fence(ctx, 8.5, 16.8, 26, 16.8);
    K.fence(ctx, 8.5, 9.5, 13.5, 9.5);
    ctx.marks.lychGate = K.gate(ctx, 15.5, 9.5, 2.6, 'x', { h: 2.6, open: true, swingDir: -1 });
    K.fence(ctx, 17.5, 9.5, 21.5, 9.5);
    K.lamp(ctx, 20.4, 15.6, { h: 2.8 });
    K.barrel(ctx, 9.4, 15.6); K.barrel(ctx, 10.2, 16, { s: 0.85 });
    K.puddle(ctx, 14.2, 12.4, 1.8, 1); K.puddle(ctx, 18.6, 14.4, 1.2, 0.8);
    K.house(ctx, 19.5, 20.6, 7, 4, 4.2, { lit: 0.35, windowLights: false });
    K.house(ctx, 11, 20.4, 5, 4, 3.6, { lit: 0.6, windowLights: false, plaster: '#464c5a' });
    // the west front outside the fence: the tide's wreckage
    P.rubble(ctx, 0.4, 7.4, 4.4, 1.8, { h: 1.3 });
    K.puddle(ctx, 4, 10, 2.4, 1.4); K.puddle(ctx, -2.5, 9.6, 1.8, 1.1);
    K.grave(ctx, 6, 11, 0.2); K.grave(ctx, 3.6, 12.4, -0.3); K.grave(ctx, 6.4, 13.8, 0.1);
    K.deadTree(ctx, 5.2, 15.2, 1);
    // the stump of the west tower, fallen across the doors, and its bell
    P.ruin(ctx, -15, 6.5, -15, 12.5, 4.5, 7.5, { thick: 1, tone: '#323c4e', debris: 0 });
    P.ruin(ctx, -15, 6.2, -8.5, 6.2, 4, 6.5, { thick: 0.8, tone: '#323c4e', debris: 0 });
    P.ruin(ctx, -14.5, 12.5, -9, 12.5, 1.4, 3, { thick: 1, tone: '#3e4858' });
    P.rubble(ctx, -10.4, 9.6, 3.2, 3.6, { h: 1.6, solid: false });
    P.rubble(ctx, -6, 8.2, 3, 2, { h: 1.2, solid: false });
    P.bell(ctx, -12.2, 9.4, 1.5, Math.PI * 0.25);

    // ------------------------------------------------ the churchyard
    K.fence(ctx, 21.5, 9.5, 21.5, -6.5);
    P.ruin(ctx, 8.5, -6.5, 13.4, -6.5, 1.8, 3.4, { thick: 0.7 });
    P.rubble(ctx, 14.4, -6.6, 2.2, 1.6, { h: 1.2 });
    P.ruin(ctx, 15.4, -6.5, 21.5, -6.5, 1.6, 3, { thick: 0.7 });
    const graves = [[10.2, 6.4], [11.6, 6.4], [13, 6.4], [18, 6.4], [19.5, 6.4], [20.8, 6.4], [10.6, 4], [12.2, 4], [18.4, 4], [19.9, 4],
      [10.2, -2.6], [11.7, -2.6], [13.2, -2.6], [16.6, -2.6], [10.8, -4.8], [12.4, -4.8], [14, -4.8]];
    graves.forEach(([x, z], i) => { K.grave(ctx, x, z, ((i * 37) % 7 - 3) * 0.06); K.solid(ctx, x - 0.25, z - 0.1, x + 0.25, z + 0.1, 0.7); });
    K.house(ctx, 19, -4.6, 2.6, 2.4, 2.8, { lit: 0, chimney: false, ridge: 'z', roofH: 1.6, tone: '#3e4858', windowLights: false });
    K.statue(ctx, 18.6, 2, -0.4);
    K.deadTree(ctx, 20.2, 7.8, 1.1); K.deadTree(ctx, 9.8, 8, 0.9); K.deadTree(ctx, 16.6, -5.4, 1.2);
    K.bench(ctx, 20.6, 0.4, Math.PI / 2);
    K.lamp(ctx, 13, 8.2, { h: 2.8 });
    P.candles(ctx, 11.6, 6.95, { n: 4, spread: 0.2, color: '#ffc070', intensity: 1.6, dist: 3.5 });
    K.fallenBody(ctx, 17, 5, 0.8); K.droppedSword(ctx, 16.2, 4.4, 2.2);
    K.puddle(ctx, 15.6, 5, 1.4, 0.9); K.puddle(ctx, 12, 0.8, 1.2, 0.8);

    // ------------------------------------------------ the cathedral: north wall (far side, tall, drowned glass)
    const bays = [3, -1.5, -6, -10.5, -15];
    K.wall(ctx, -8, -15.6, -8, 3.6, 10, { thick: 1, tone: '#323c4e' });
    P.ruin(ctx, -8, 3.6, -8, 6.5, 6.6, 9, { thick: 1, tone: '#323c4e', debris: 0 });
    P.ruin(ctx, -8, -21.3, -8, -15.6, 6.6, 8.8, { thick: 1, tone: '#323c4e', debris: 0 });
    for (const z of bays) {
      K.add(ctx, K.box(0.5, 6.6, 0.7), W.ashlar('#3c4656'), -7.25, 3.3, z);
      K.add(ctx, K.box(0.62, 0.25, 0.86), W.ashlar('#56606e'), -7.25, 6.72, z);
      K.solid(ctx, -7.5, z - 0.35, -7, z + 0.35, 6.6);
    }
    K.add(ctx, K.box(0.16, 0.18, 27.8), W.ashlar('#4c5666'), -7.42, 1.62, -7.4);
    for (const z of [5, 0.75, -3.75, -8.25, -12.75, -17.6]) P.lancet(ctx, -7.5, 1.9, z, '+x');
    ctx.lights.push({ x: -6.8, y: 2.4, z: 0.75, color: 0x3ad6c4, intensity: 3.2, dist: 7.5 });
    ctx.lights.push({ x: -6.8, y: 2.4, z: -8.25, color: 0x3ad6c4, intensity: 3.2, dist: 7.5 });
    P.rafters(ctx, -7.6, 10, [1.4, -3.1, -7.6, -12.1], 1);
    // the west wall: broken down, its portal choked with what the tide brought in
    P.ruin(ctx, -8.5, 6, -2.7, 6, 1.3, 2.6, { thick: 1, tone: '#3e4858' });
    K.add(ctx, K.box(1, 3, 1.2), W.ashlar('#46505e'), -2.2, 1.5, 6); K.add(ctx, K.box(1, 2.4, 1.2), W.ashlar('#46505e'), 2.2, 1.2, 6);
    K.solid(ctx, -2.7, 5.4, -1.7, 6.6, 3); K.solid(ctx, 1.7, 5.4, 2.7, 6.6, 2.4);
    P.ruin(ctx, -1.7, 6, 1.7, 6, 0.9, 1.6, { thick: 1, debris: 0 });
    P.ruin(ctx, 2.7, 6, 8.5, 6, 1.2, 2.4, { thick: 1, tone: '#3e4858' });
    P.rubble(ctx, 0, 4.5, 4.6, 1.6, { h: 1.4 });
    // the south wall (near side): fallen to its lower courses, buttresses still standing outside
    P.ruin(ctx, 8, 2.75, 8, 6.5, 1.2, 2.4, { thick: 1, solidH: 2, tone: '#3e4858' });
    P.ruin(ctx, 8, -21.3, 8, -1.25, 1, 2.2, { thick: 1, solidH: 2, tone: '#3e4858' });
    for (const [z, h, broken] of [[5, 3.4], [-3.4, 2.6, true], [-8, 3.6], [-12.6, 1.8, true], [-17.2, 3.2]]) P.buttress(ctx, 8.5, z, h, '+x', { broken });
    // the side door: a pointed portal, its iron gate shut until the churchyard is quiet
    K.add(ctx, K.box(1.2, 4, 0.8), W.ashlar('#3e4858'), 8, 2, -0.85); K.add(ctx, K.box(1.2, 4, 0.8), W.ashlar('#3e4858'), 8, 2, 2.35);
    K.solid(ctx, 7.4, -1.25, 8.6, -0.45, 4); K.solid(ctx, 7.4, 1.95, 8.6, 2.75, 4);
    P.arch(ctx, 8, -0.45, 1.95, 2.5, 4.4, { axis: 'z', thick: 1, c: 0.3 });
    ctx.marks.sideDoor = K.gate(ctx, 8, 0.75, 2.4, 'z', { h: 2.4, piers: false, swingDir: 1 });
    K.torch(ctx, 8.6, 2.4, -0.85, '+x');

    // ------------------------------------------------ the arcades
    for (const z of bays) P.pier(ctx, -3.6, z, 4.65);
    for (let i = 0; i < bays.length - 1; i++) P.arch(ctx, -3.6, bays[i + 1] + 0.625, bays[i] - 0.625, 4.65, 7.6);
    P.pier(ctx, -3.8, -19.8, 8.2, { w: 1.1 });
    P.arch(ctx, -3.6, -19.08, -15.625, 4.65, 7.6);
    K.add(ctx, K.box(0.7, 1.1, 0.9), W.ashlar('#4a5464'), -3.6, 5.2, 3.95, { rx: 0.3 });
    [3.2, 1.3, 2.6, 3.9, 2].forEach((h, i) => P.pier(ctx, 3.6, bays[i], 4.65, { broken: h }));
    P.pier(ctx, 3.8, -19.8, 4.65, { w: 1.1, broken: 3.4 });
    P.drums(ctx, 5.4, -3.4, 1.3, 3);
    P.drums(ctx, 2.2, -8.8, 1.1, 2);
    P.drums(ctx, 5.6, -21.6, 1.2, 3, { w: 1.1 });

    // ------------------------------------------------ the west nave: the congregation
    P.font(ctx, -5.6, 3.6);
    P.doorSlab(ctx, -1.5, 2.2, 0.25); P.doorSlab(ctx, 1.4, 1.7, -0.4);
    P.pew(ctx, -2.05, 0.2, { ry: 0.05 }); P.pew(ctx, -2.05, -1.2, { ry: -0.08 });
    P.pew(ctx, 2.05, -0.4, { ry: -0.2, kind: 'tipped' }); P.pew(ctx, 2.05, -2.2, { ry: 0.3, kind: 'broken' });
    P.pew(ctx, -5.6, -0.6, { ry: 1.45 }); P.pew(ctx, 6.2, 4.6, { ry: 0.9 });
    P.candelabrum(ctx, -6.7, -4.4);
    P.brazier(ctx, 2.6, 1.6);
    for (const [x, z] of [[-5.6, -4.6], [5.8, -0.2], [-5.4, 1.2]]) P.ledger(ctx, x, z, 0);
    P.candles(ctx, -6.9, 4.6, { n: 6, light: false }); P.candles(ctx, 6.6, -4.9, { n: 4, light: false });
    K.torch(ctx, -3.03, 2.3, -1.5, '+x');
    K.banner(ctx, -2.98, 3.2, 3, '+x', 0x1a2c30);
    K.fallenBody(ctx, 3, -3, 1.2, 0x1a1c20); K.droppedSword(ctx, 3.8, -4.4, 0.6);

    // ------------------------------------------------ the nave screen
    K.fence(ctx, -7.5, -6, -4.175, -6, { h: 2.4 }); K.fence(ctx, -3.025, -6, -2, -6, { h: 2.4 });
    ctx.marks.naveGate = K.gate(ctx, 0, -6, 2.6, 'x', { h: 2.6, swingDir: 1 });
    K.fence(ctx, 2, -6, 3.025, -6, { h: 2.4 }); K.fence(ctx, 4.175, -6, 7.5, -6, { h: 2.4 });

    // ------------------------------------------------ the east nave: the fallen chandelier
    P.chandelier(ctx, -0.4, -11.2);
    P.brazier(ctx, 5.8, -12.6);
    P.rubble(ctx, -2, -8, 1.6, 1.2);
    P.beam(ctx, 5.9, -9, 3.4, 0.3);
    P.pew(ctx, -1.4, -13.9, { ry: 0.6, kind: 'tipped' });
    P.pew(ctx, -2.05, -16.4, { ry: 0.04 }); P.pew(ctx, 2.05, -16.4, { ry: -0.06 });
    P.pew(ctx, -2.05, -17.8, { kind: 'broken' }); P.pew(ctx, 2.05, -17.8, { ry: 0.1 });
    K.torch(ctx, -3.03, 2.3, -15, '+x');
    for (const [x, z] of [[-5.6, -9.6], [5.6, -16.2], [-5.6, -11.6], [0, -18.6]]) P.ledger(ctx, x, z, 0);
    P.candles(ctx, 6.7, -7.4, { n: 4, light: false });
    K.banner(ctx, -2.98, 3.2, -10.5, '+x', 0x2a1418);
    P.candles(ctx, -7, -18.6, { n: 6, halo: true, intensity: 3, dist: 6 });
    P.candles(ctx, -6.9, -15.9, { n: 4, light: false });
    K.fallenBody(ctx, 3.4, -12.8, -0.7); K.droppedSword(ctx, 2.6, -13.6, 1.9);

    // ------------------------------------------------ the choir screen
    K.fence(ctx, -7.5, -19.8, -4.525, -19.8, { h: 2.8 }); K.fence(ctx, -3.075, -19.8, -2.2, -19.8, { h: 2.8 });
    ctx.marks.choirGate = K.gate(ctx, 0, -19.8, 3, 'x', { h: 3, open: true, swingDir: 1 });
    K.fence(ctx, 2.2, -19.8, 3.075, -19.8, { h: 2.8 }); K.fence(ctx, 4.525, -19.8, 7.5, -19.8, { h: 2.8 });

    // ------------------------------------------------ the crossing and the apse (the Deacon's arena)
    // north transept (far side): tall, with the door to the belfry stair
    P.ruin(ctx, -13.3, -20.9, -8.5, -20.9, 4.2, 5.6, { thick: 0.8, side: -1 });
    K.wall(ctx, -12.9, -27.7, -12.9, -20.5, 9.5, { thick: 0.8, tone: '#323c4e' });
    K.wall(ctx, -12.9, -41.8, -12.9, -30.3, 9.5, { thick: 0.8, tone: '#323c4e' });
    P.arch(ctx, -12.9, -30.3, -27.7, 2.9, 9.5, { axis: 'z', thick: 0.8, c: 0.3, cornice: false });
    ctx.marks.exitGate = K.gate(ctx, -12.9, -29, 2.6, 'z', { h: 2.8, piers: false, swingDir: 1 });
    for (const z of [-23.6, -34.2, -38.6]) P.lancet(ctx, -12.5, 1.9, z, '+x');
    K.torch(ctx, -12.5, 2.4, -25.8, '+x'); K.torch(ctx, -12.5, 2.4, -32.2, '+x');
    ctx.lights.push({ x: -11.8, y: 2.4, z: -36.4, color: 0x3ad6c4, intensity: 3, dist: 7 });
    P.rafters(ctx, -12.6, 9.5, [-24, -35, -39], 1);
    // the apse wall (far side): the rose of drowned glass over the altar
    K.wall(ctx, -13.3, -41.4, 10.2, -41.4, 10, { thick: 0.8, tone: '#323c4e' });
    P.ruin(ctx, 10.2, -41.4, 13.3, -41.4, 3, 6, { thick: 0.8, tone: '#323c4e' });
    P.rose(ctx, 0, 7.6, -41);
    P.lancet(ctx, -1.9, 2.2, -41, '+z', 1.1, 3.8); P.lancet(ctx, 1.9, 2.2, -41, '+z', 1.1, 3.8);
    for (const x of [-10.6, -7.2, 7.2]) P.lancet(ctx, x, 1.9, -41, '+z');
    ctx.lights.push({ x: 0, y: 4.2, z: -40.2, color: 0x3ad6c4, intensity: 4, dist: 9 });
    K.torch(ctx, -8.9, 2.4, -41, '+z'); K.torch(ctx, 8.9, 2.4, -41, '+z');
    P.altar(ctx, 0, -39.1);
    K.statue(ctx, -4.6, -40.2, 0.3); K.statue(ctx, 4.6, -40.2, -0.3);
    P.candelabrum(ctx, -3.2, -36.6); P.candelabrum(ctx, 3.2, -36.6);
    // the crossing: four piers (the near two broken), the labyrinth under the water, the dead under their slabs
    P.pier(ctx, -5.2, -24.6, 6.4, { w: 1 }); P.pier(ctx, -5.2, -34.4, 6.4, { w: 1 });
    P.pier(ctx, 5.2, -24.6, 6.4, { w: 1, broken: 2.6 }); P.pier(ctx, 5.2, -34.4, 6.4, { w: 1, broken: 3.4 });
    P.labyrinth(ctx, 0, -29.5, 9);
    for (const [x, z, r] of [[-8.6, -28.4, 0], [-8.6, -31, 0], [8.4, -29.6, 0.1], [-2.6, -36, 1.57], [7.6, -38.6, 0], [-10.4, -24, 0.2]]) P.ledger(ctx, x, z, r);
    for (const [x, z] of [[-11.6, -27.4], [11.4, -30.2], [-7.8, -39.8], [8.4, -40], [-11.2, -33.2]]) P.candles(ctx, x, z, { n: 5, light: false });
    // south transept (near side): broken down to the sills
    P.ruin(ctx, 8.5, -20.9, 13.3, -20.9, 1, 2.2, { thick: 0.8, side: -1, solidH: 2, tone: '#3e4858' });
    P.ruin(ctx, 12.9, -41.8, 12.9, -20.5, 0.9, 2, { thick: 0.8, solidH: 2, tone: '#3e4858' });
    for (const [z, h, broken] of [[-25, 2.6, true], [-30.5, 3.4], [-36, 2, true]]) P.buttress(ctx, 13.3, z, h, '+x', { broken });
    P.chandelier(ctx, -9, -36.2, { r: 1.1, lit: 2 });
    P.pew(ctx, -9.8, -23.8, { ry: 0.5, kind: 'tipped' }); P.pew(ctx, 10.4, -35.4, { ry: 1.35 }); P.pew(ctx, 9.6, -24.4, { ry: -0.3, kind: 'broken' });
    P.rubble(ctx, -11.2, -40, 2, 1.4); P.rubble(ctx, 11.4, -22.8, 1.6, 1.4);
    K.fallenBody(ctx, -5.5, -31.5, 0.9); K.fallenBody(ctx, 6.8, -27, -1.2, 0x1c181a); K.droppedSword(ctx, -4.6, -30.6, 2);
    // the belfry passage behind the north transept
    K.wall(ctx, -17.6, -26.3, -13.3, -26.3, 4, { thick: 0.6 });
    K.wall(ctx, -17.6, -31.7, -13.3, -31.7, 5, { thick: 0.6 });
    K.steps(ctx, -16.9, -29, 4.8, 4, 'x-');
    K.torch(ctx, -15, 2.2, -31.4, '+z');

    // ------------------------------------------------ outside the south wall: the rest of the graveyard
    for (const [x, z, r] of [[11, -9.6, 0.2], [12.6, -10.2, -0.3], [10.6, -14, 0.1], [12.4, -16.4, 0.4], [15, -12, -0.2], [11.4, -26, 0.2], [15.6, -28.4, -0.1], [16, -34.2, 0.3], [14.8, -38, -0.3]]) K.grave(ctx, x, z, r);
    K.deadTree(ctx, 14.2, -15, 1.1); K.deadTree(ctx, 16.4, -24.6, 1); K.deadTree(ctx, 15, -40, 1.2);
    P.rubble(ctx, 14.8, -32.6, 1.6, 1.2, { solid: false, capital: false });
    P.candles(ctx, 12.6, -9.9, { n: 4, spread: 0.2, color: '#ffc070', intensity: 2, dist: 4.5 });
    K.puddle(ctx, 11.5, -19, 2, 1.2); K.puddle(ctx, 16, -20.5, 1.4, 1);

    // ------------------------------------------------ the drowned, drifting
    P.souls(ctx, [[-7, -5.5, 7, 3.5, 10], [-7, -19.5, 7, -6.5, 10], [-12, -36, 12, -22, 14], [10, -5, 20, 7, 6]]);
  },
};
