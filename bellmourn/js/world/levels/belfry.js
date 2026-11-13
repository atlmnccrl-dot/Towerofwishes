// District IV — The Belfry. Out of the stair turret onto the leads of the nave roof, high over the city in
// the storm; through the crossing under the lantern spire, where the bell wardens keep watch; over the
// flying bridge beside the choir gable; up the tower gallery and its stair to the bell platform, where
// Saint Silence keeps the great bell of St. Orrin from ringing.
import * as P from '../props/belfry.js';
import * as T from '../../engine/textures.js';

const BOUNDS = [-16, -62, 22, 18];

export default {
  id: 'belfry', name: 'The Belfry', tagline: 'THE BELL IS SILENT. SOMEONE IS STILL UP THERE.', tier: 7,
  start: { x: 0.1, z: 15.2, face: Math.PI },
  bounds: BOUNDS,
  gatesOpen: ['leadsGate', 'towerGate', 'belfryGate'],
  ambience: {
    fog: 0x161e2a, fogNear: 70, fogFar: 160, sky: 0x06090f, moon: 2.4, moonColor: 0xb4c8ec, hemi: 0.85, hemiSky: 0x56688c,
    fill: 1.3, fillColor: 0x7888b0, rain: 1.35, lightning: true,
    beams: [
      { x: 0.2, z: 7.5, r: 4.5, h: 26, from: [6, 0, -10], intensity: 55 },
      { x: 4, z: -5, r: 6, h: 28, from: [6, 0, -10], intensity: 75 },
      { x: 6.5, z: -49, r: 9, h: 28, from: [6, 0, -10], intensity: 110 },
    ],
  },
  lamps: [{ id: 'leads', x: -1.2, z: 11.2, sx: 1.3, sz: 0.3 }, { id: 'belfry', x: 4.1, z: -35.6, sx: 1.3, sz: 0.3 }],
  items: [{ id: 'c1', x: 8.9, z: -16.2, ry: -Math.PI / 2, kind: 'tonic' }, { id: 'c2', x: -1, z: -10.2, ry: 0, kind: 'embers', amount: 160 }],
  hints: [
    { zone: [-2, 12.6, 2.2, 18], text: 'THE WIND UP HERE PULLS AT YOUR CLOAK. KEEP TO THE LEADS.' },
    { zone: [-2, 1.8, 2.2, 4.4], text: 'SHIELDS TURN BLOWS. USE SKILLS, OR GET BEHIND.' },
    { zone: [4.6, -14.4, 7.4, -11.9], text: 'NOTHING BELOW BUT CLOUD. THE BRIDGE IS THE ONLY WAY ON.' },
    { zone: [3, -37.4, 10, -33.8], text: 'THE BELL HANGS STILL. SOMEONE STANDS BESIDE IT.' },
  ],
  foes: [
    { t: 'hushed', x: 0.7, z: 4 }, { t: 'hushed', x: -0.9, z: 3.4 }, { t: 'warden', x: 0.3, z: 2.4, face: 0 },
    { t: 'warden', x: 6, z: -17.6 }, { t: 'hushed', x: 6.2, z: -20.2 }, { t: 'crossbow', x: 12.1, z: -22.7 },
  ],
  encounters: [
    { id: 'crossing', zone: [-1.5, -6.5, 9.4, -1], gates: ['leadsGate'], opens: ['bridgeGate'], msg: 'THE BELL WARDENS RAISE THEIR SHIELDS', done: 'THE BRIDGE GATE SWINGS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'warden', x: 3.6, z: -6.6, face: 0 }, { t: 'hushed', x: 0.6, z: -3.4 }, { t: 'hushed', x: 6.6, z: -2.8 }, { t: 'acolyte', x: 7.8, z: -8.8, face: 0 }] },
        { foes: [{ t: 'brute', x: 3.8, z: -7.6 }, { t: 'hushed', x: -0.6, z: -7.4 }, { t: 'crossbow', x: 9, z: -9.9 }] },
      ] },
    { id: 'gallery', zone: [1, -27.6, 12, -23.4], gates: ['towerGate'], opens: ['stairGate'], msg: 'ARCHERS ON THE PARAPETS', done: 'THE STAIR TO THE BELL IS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'crossbow', x: 1.2, z: -28.4, face: 0 }, { t: 'crossbow', x: 11.9, z: -28.4, face: 0 }, { t: 'warden', x: 6.5, z: -27.4, face: 0 }, { t: 'hushed', x: 3.4, z: -24.4 }] },
        { foes: [{ t: 'brute', x: 6.5, z: -26.2 }, { t: 'acolyte', x: 1.4, z: -23.6 }, { t: 'acolyte', x: 11.6, z: -24.8 }, { t: 'hushed', x: 9.4, z: -23.2 }] },
      ] },
  ],
  boss: { type: 'silence', dmgMul: 1.3, x: 6.5, z: -48.5, face: 0, zone: [-4.3, -59.4, 17.4, -40.6], gates: ['belfryGate'], opens: ['belfryGate'] },
  exit: { zone: [4.9, -55.4, 8.1, -53.8], to: 'end', requires: 'boss' },
  build(K, ctx) {
    const W = K.M;
    // ------------------------------------------------ the dark below: the city in the storm, mist and racing cloud
    P.cityLights(ctx, -45, -100, 40, 30, -26, 320, { skip: [[-6, -61, 19, -37]] });
    P.mist(ctx, -60, -115, 70, 60, -16, 0.55, 0x080b10, -17);
    P.clouds(ctx, -60, -115, 70, 60, -9, { opacity: 0.4, speed: 1.6, seed: 59, order: -16, color: 0x26303e, density: 0.9, tile: 30 });
    P.mist(ctx, -60, -115, 70, 60, -7.5, 0.4, 0x090d13, -15);
    P.clouds(ctx, -60, -115, 70, 60, -3.4, { opacity: 0.28, speed: 3.4, seed: 41, order: -14, color: 0x3a465a, density: 0.7 });

    // ------------------------------------------------ the leads: the gutter walk along the nave roof
    K.floor(ctx, -2, 1.4, 2.2, 26, W.flags('#58626f'));
    K.wall(ctx, -2.2, -3.6, -2.2, 26, 0.6, { thick: 0.4, cap: false, tone: '#3a4454' });
    K.roof(ctx, -9.6, 0.55, 18, 15.6, 43.2, 7.6, false, '#34425a');
    for (const z of [12.4, 5.2]) { // dormers on the nave roof
      K.add(ctx, K.box(1.2, 1.4, 1.3), W.brick('#323c4e'), -4.4, 3.5, z);
      K.add(ctx, K.cone(1.05, 1.0, 4), W.slate('#2c3848'), -4.4, 4.7, z, { ry: Math.PI / 4 });
      K.add(ctx, K.plane(0.5, 0.62), W.decal(T.houseWindow(true), 1.6), -3.79, 3.4, z, { ry: Math.PI / 2, cast: false });
    }
    // the stair turret we came up by
    K.add(ctx, K.cyl(1.5, 1.5, 10, 8), W.brick('#343e50'), -3.8, 2, 14.5, { ry: Math.PI / 8 });
    K.add(ctx, K.cyl(1.62, 1.62, 0.3, 8), W.ashlar('#4a5464'), -3.8, 7.1, 14.5, { ry: Math.PI / 8 });
    K.add(ctx, K.cone(1.8, 3.6, 8), W.slate('#1c2430'), -3.8, 9.05, 14.5, { ry: Math.PI / 8 });
    K.solidCircle(ctx, -3.8, 14.5, 1.5, 7);
    K.torch(ctx, -2.35, 2.2, 13, '+x');
    P.fallenPinnacle(ctx, 0.4, 17.4, Math.PI / 2 - 0.2);
    // the parapet over the drop, the clerestory below it, the aisle roof, the flyers
    K.wall(ctx, 2.5, 1.4, 2.5, 26, 1.0, { thick: 0.6 });
    P.drop(ctx, 2.2, 1.4, 2.8, 26, 7.2, { faces: ['x'], lit: 0.4, gap: 2.8 });
    P.leanRoof(ctx, 2.8, 10.6, -7.2, -10.4, 1.4, 28, 'x');
    for (const z of [21, 15.5, 10, 4.5]) P.flyer(ctx, 2.8, z, 'x', 7.2, { yTop: -0.4, fall: 2.0 });
    for (const z of [15.5, 10, 4.5]) P.gargoyle(ctx, 2.65, 1.1, z + 1.2, Math.PI / 2, { stream: 1.8 });
    K.lamp(ctx, 1.75, 6.8, { h: 2.6 });
    K.puddle(ctx, 0.2, 12.6, 1.6, 0.8); K.puddle(ctx, -0.6, 4.6, 1.2, 0.9); K.puddle(ctx, 1, 9.4, 0.9, 1.4);
    K.fallenBody(ctx, 1, 10.2, 2.4); K.droppedSword(ctx, -0.4, 9.6, 0.9);
    P.rope(ctx, -1.2, 7.8);
    P.rubble(ctx, -1.2, 5.2, 1.2, 1.6, 5);
    P.flight(ctx, -2, 1.6, 2.2, 3.6, 'z-', { n: 4, cheek: 0 });

    // ------------------------------------------------ the crossing: the transept leads under the lantern spire
    K.floor(ctx, -2, -11.3, 10.3, 1.4, W.court('#5a6472'));
    K.floor(ctx, -2.6, -11.3, -2, -3.6, W.court('#5a6472'));
    ctx.marks.leadsGate = K.gate(ctx, 0.1, 1.4, 2.6, 'x', { h: 2.4, open: true, swingDir: -1 });
    // the lantern tower and its spire (far side)
    P.tower(ctx, -9.5, -11, -2.5, -4, 7.5);
    K.add(ctx, K.plane(1.4, 2.6), W.decal(T.door('#2c1f18')), -2.48, 1.3, -7.5, { ry: Math.PI / 2, cast: false });
    for (const z of [-5.8, -9.2]) K.add(ctx, K.plane(0.9, 3), W.decal(T.lancet(true, 12, 42), 1.2), -2.48, 4.9, z, { ry: Math.PI / 2, cast: false });
    for (const x of [-4.6, -7.4]) K.add(ctx, K.plane(0.9, 3), W.decal(T.lancet(true, 12, 42), 1.2), x, 5.2, -3.98, { cast: false });
    K.torch(ctx, -2.5, 2.4, -5.4, '+x'); K.torch(ctx, -2.5, 2.4, -9.6, '+x');
    K.banner(ctx, -2.5, 2.6, -6.3, '+x'); K.banner(ctx, -2.5, 2.6, -8.7, '+x');
    for (const [x, z] of [[-9.5, -11], [-2.5, -11], [-9.5, -4], [-2.5, -4]]) P.pinnacle(ctx, x, z, 7.6, 3.4, 1.0);
    P.spire(ctx, -6, -7.5, 7.6, 3, 13);
    // the choir roof rising beyond the far parapet, its gable over the bridge
    P.sunk(ctx, -11.4, () => K.chapel(ctx, -3, -16.3, 13.2, 9.4, 12, { front: '+x', roofH: 7, litRose: true, roofTone: '#2a3546' }));
    K.wall(ctx, -2.6, -11.5, 4.1, -11.5, 1.0, { thick: 0.4 });
    ctx.marks.bridgeGate = K.gate(ctx, 6, -11.5, 2.4, 'x', { h: 2.6 });
    P.railing(ctx, 7.9, -11.5, 10.55, -11.5, { style: 'stone', out: '-z', kw: 0.4 });
    // the near edges over the drop
    P.railing(ctx, 2.8, 1.4, 10.55, 1.4, { out: '+z' });
    P.railing(ctx, 10.3, -11.7, 10.3, 1.65, { out: '+x', broken: [[0.36, 0.48]] });
    P.drop(ctx, 2.8, -11.7, 10.55, 1.65, 16, { faces: ['x', 'z'], strips: 4, lit: 0.35 });
    for (const z of [-2.2, -8.4]) P.flyer(ctx, 10.55, z, 'x', 6, { yTop: -0.6, fall: 1.8, pin: 3 });
    P.gargoyle(ctx, 10.6, 0.45, 1.7, Math.PI / 4, { stream: 1.8 });
    P.gargoyle(ctx, 10.6, 0.45, -11.6, Math.PI * 0.75, { stream: 1.8 });
    K.lamp(ctx, 9.5, 0.6, { h: 2.8 }); K.lamp(ctx, 9.5, -10.5, { h: 2.8 });
    P.oculus(ctx, 4, -4.6, 1.3);
    // the wardens' stores by the tower
    K.crate(ctx, 0.6, -10.6); K.crate(ctx, 1.5, -10.7, { s: 0.6 }); K.barrel(ctx, -1.7, -8.4); K.barrel(ctx, -1.6, -7.5, { s: 0.85 });
    K.fallenBody(ctx, 6.2, -1.2, -0.6); K.droppedSword(ctx, 7.4, -0.6, 2.2); K.fallenBody(ctx, 1.4, -7.6, 1.9, 0x1c181a);
    K.puddle(ctx, 6.6, -6.4, 2, 1.1); K.puddle(ctx, 1.2, -2, 1.4, 0.9);
    P.rope(ctx, 8.4, -4.4);

    // ------------------------------------------------ the flying bridge
    K.floor(ctx, 4.6, -21.6, 7.4, -11.5, W.flags('#5c6674'));
    P.archBridge(ctx, 4.2, 7.8, -21.6, -11.7, { apex: -2.4 });
    P.railing(ctx, 4.4, -21.6, 4.4, -11.7, { style: 'stone', out: '-x', kw: 0.4, broken: [[0.6, 0.7]] });
    P.railing(ctx, 7.6, -14.6, 7.6, -11.7, { out: '+x', kw: 0.4 });
    P.railing(ctx, 7.6, -21.6, 7.6, -17.8, { out: '+x', kw: 0.4 });
    // the balcony on the near side, corbelled out over the drop
    K.floor(ctx, 7.4, -17.8, 9.8, -14.6, W.flags('#5c6674'));
    P.railing(ctx, 7.6, -14.6, 10, -14.6, { out: '+z', kw: 0.4 });
    P.railing(ctx, 9.8, -18, 9.8, -14.4, { out: '+x', kw: 0.4, broken: [[0.3, 0.55]] });
    P.railing(ctx, 7.6, -17.8, 10, -17.8, { out: '-z', kw: 0.4 });
    P.drop(ctx, 7.8, -18, 10, -14.4, 0.9, { faces: [] });
    K.add(ctx, K.cone(1.7, 2.6, 4), P.deep(W.ashlar('#384252')), 8.9, -2.25, -16.2, { rx: Math.PI, ry: Math.PI / 4, cast: false });
    K.lamp(ctx, 9.4, -17.3, { h: 2.6 });
    P.gargoyle(ctx, 10.1, 0.45, -14.3, Math.PI / 4, { stream: 1.8 });
    P.pennant(ctx, 7.6, 3.6, -12.1, { color: 0x5a1418 }); P.pennant(ctx, 7.6, 3.6, -21.1, { color: 0x5a1418 });
    ctx.marks.towerGate = K.gate(ctx, 6, -21.2, 2.4, 'x', { h: 2.6, open: true, swingDir: 1 });

    // ------------------------------------------------ the tower gallery
    K.floor(ctx, 0, -29.4, 13, -21.6, W.flags('#5e6876'));
    K.wall(ctx, -0.3, -29.6, -0.3, -21.4, 3.4, { thick: 0.6, buttress: 4, arches: 2, litArches: [0] });
    K.torch(ctx, 0, 2.2, -22.6, '+x'); K.torch(ctx, 0, 2.2, -28.4, '+x');
    K.wall(ctx, 0, -21.6, 4.2, -21.6, 1.0, { thick: 0.4 });
    P.railing(ctx, 7.8, -21.6, 13.25, -21.6, { out: '+z' });
    P.railing(ctx, 13, -29.65, 13, -21.6, { out: '+x', broken: [[0.42, 0.56]] });
    P.railing(ctx, -0.3, -29.4, 4.5, -29.4, { style: 'stone', out: '-z' });
    ctx.marks.stairGate = K.gate(ctx, 6.5, -29.4, 2.6, 'x', { h: 2.6 });
    P.railing(ctx, 8.5, -29.4, 13.25, -29.4, { style: 'stone', out: '-z' });
    P.drop(ctx, -0.6, -29.65, 13.25, -21.35, 24, { faces: ['x', 'z'], strips: 4, lit: 0.2 });
    for (const z of [-23.4, -27.6]) P.flyer(ctx, 13.25, z, 'x', 6, { yTop: -0.6, fall: 1.8, pin: 3 });
    K.lamp(ctx, 12.3, -25.6, { h: 2.8 });
    P.gargoyle(ctx, 13.35, 0.45, -21.3, Math.PI / 4, { stream: 1.8 });
    K.barrelStack(ctx, 1, -22.6);
    K.fallenBody(ctx, 9.6, -26.8, 0.6); K.droppedSword(ctx, 8.4, -27.4, -0.8);
    K.puddle(ctx, 5.4, -25.4, 1.8, 1.2); K.puddle(ctx, 10.2, -23.4, 1, 0.8);
    // the stair up and the landing below the bell platform
    K.floor(ctx, 4.5, -33.6, 8.5, -29.4, W.flags('#56606e'));
    P.flight(ctx, 4.5, -33.6, 8.5, -29.6, 'z-', { n: 8, h0: 1.0, h1: 2.0 });
    P.drop(ctx, 4, -33.6, 9, -29.6, 24, { faces: ['x'] });
    K.floor(ctx, 3, -37.6, 10, -33.6, W.flags('#5e6876'));
    K.wall(ctx, 3, -37.6, 3, -33.6, 1.0, { thick: 0.4 });
    K.wall(ctx, 2.8, -33.6, 4, -33.6, 1.0, { thick: 0.4 });
    P.railing(ctx, 10, -37.6, 10, -33.35, { out: '+x' });
    P.railing(ctx, 9, -33.6, 10.25, -33.6, { out: '+z' });
    P.drop(ctx, 2.8, -37.6, 10.25, -33.4, 24, { faces: ['x'] });
    K.lamp(ctx, 9.3, -34.3, { h: 2.6 });
    ctx.marks.belfryGate = K.gate(ctx, 6.5, -37.8, 2.8, 'x', { h: 2.8, open: true, swingDir: 1 });

    // ------------------------------------------------ the bell platform at the top of the tower
    K.floor(ctx, -5, -60, 18, -37.8, W.court('#5c6674'));
    P.compass(ctx, 6.5, -48, 7.5);
    P.drop(ctx, -5.6, -60.6, 18.4, -37.6, 30, { faces: ['x', 'z'], strips: 5.5, rows: 3, lit: 0.12, gap: 3.6 });
    P.railing(ctx, -5, -37.8, 4.4, -37.8, { out: '+z', broken: [[0.18, 0.32]] });
    P.railing(ctx, 8.6, -37.8, 18, -37.8, { out: '+z', broken: [[0.55, 0.72]] });
    P.railing(ctx, 18, -60, 18, -37.8, { out: '+x', broken: [[0.2, 0.3], [0.64, 0.73]] });
    P.railing(ctx, -5, -60, -5, -37.8, { style: 'stone', out: '-x', broken: [[0.42, 0.52]] });
    P.railing(ctx, -5, -60, 18, -60, { style: 'stone', out: '-z', broken: [[0.07, 0.15], [0.8, 0.88]] });
    // four corner pinnacles, the two far ones tallest
    for (const [x, z, h, s] of [[-5, -60, 7.5, 1.5], [18, -60, 6, 1.3], [-5, -37.8, 6, 1.3], [18, -37.8, 4.4, 1.1]]) {
      P.pinnacle(ctx, x, z, 0, h, s); K.solid(ctx, x - s / 2, z - s / 2, x + s / 2, z + s / 2, h);
    }
    P.gargoyle(ctx, 18.7, 0.5, -37.1, Math.PI / 4, { stream: 1.8 }); P.gargoyle(ctx, 18.7, 0.5, -60.7, Math.PI * 0.75, { stream: 1.8 });
    P.gargoyle(ctx, -5.7, 0.5, -37.1, -Math.PI / 4, { stream: 1.8 }); P.gargoyle(ctx, 18.35, 0.5, -49, Math.PI / 2, { stream: 1.8 });
    for (const z of [-42.4, -49, -55.6]) P.flyer(ctx, 18.4, z, 'x', 6.4, { yTop: -0.7, fall: 2.2, pin: 3.6, gargoyle: false });
    // the great bell in its frame at the back, braziers before it
    ctx.marks.bell = P.greatBell(ctx, 6.5, -57);
    P.hangLantern(ctx, 3.4, 4.7, -55.4); P.hangLantern(ctx, 9.6, 4.7, -55.4);
    P.pennant(ctx, 3.4, 7.4, -57, { pole: 2, len: 1.8 }); P.pennant(ctx, 9.6, 7.4, -57, { pole: 2, len: 1.8 });
    P.brazier(ctx, 2.6, -53.6); P.brazier(ctx, 10.4, -53.6);
    for (const [x, z] of [[-3.7, -58.7], [16.7, -58.7], [-3.7, -39.1], [16.7, -39.1]]) K.lamp(ctx, x, z, { h: 2.8 });
    // what is left of those who climbed before
    K.fallenBody(ctx, 2.4, -44.6, 0.8); K.droppedSword(ctx, 3.6, -45.4, 2.6); K.fallenBody(ctx, 12.6, -50.2, -1.2, 0x1c181a);
    K.droppedSword(ctx, 11.2, -42.8, -0.5); P.rope(ctx, 8.6, -52.4);
    P.rubble(ctx, 16.8, -53.6, 1.4, 2.2, 7); P.rubble(ctx, -1.8, -38.8, 2.2, 1, 6); P.rubble(ctx, -3.8, -48.6, 1.2, 2, 6);
    K.puddle(ctx, 4.6, -46.4, 2.6, 1.6); K.puddle(ctx, 12.4, -44, 1.8, 1.2); K.puddle(ctx, -0.6, -52.4, 2, 1.2); K.puddle(ctx, 14, -55.8, 1.4, 1);

    // ------------------------------------------------ the drop: nothing lands out there
    P.voidFill(ctx, BOUNDS, [
      [-2, 1.4, 2.2, 18], [-2.6, -11.5, 10.3, 1.4], [4.4, -21.6, 7.6, -11.5], [7.6, -17.8, 9.8, -14.6],
      [-0.3, -29.4, 13, -21.6], [4, -33.6, 9, -29.4], [3, -37.8, 10, -33.6], [-5, -60, 18, -37.8],
    ]);
  },
};
