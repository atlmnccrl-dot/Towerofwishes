// Act III, region I — The Weeping Marsh. (PROPOSAL: names and texts in this file are proposals for the author.)
// Beyond the Abyss the road runs down into the drowned country where the First Founder's foundry sank: black
// water, mud isles and stilt walkways of rotten boards, dead cypresses dripping moss, bells half sunk
// everywhere (some still ring), will-o'-wisps over the water. The field of bells, the witch's yard, the
// last isle under the foundry's leaning chimney, and the drowned foundry floor where the Bog Mother keeps
// her hoard of bells and the voices in them. Fog on the water, fireflies, a drizzle that never stops.
import * as P from '../props/marsh.js';
import { barrier3 } from '../kit3.js';

const ISLES = [
  [-5, 4, 8, 15],          // the landing
  [-7, -15, 10, -2],       // the field of bells
  [-6, -32, 10, -20],      // the witch's yard
  [-2, -41, 10, -37],      // the last isle, under the chimney
  [-7, -62, 15, -43],      // the drowned foundry floor
];
const WALKS_BW = [
  [1.2, 15, 4, 16],        // the landing pier (on into the water past the bounds)
  [1, -2, 4.4, 4],
  [1.4, -20, 4.8, -15],
  [2, -37, 5.4, -32],
  [2.4, -43, 5.8, -41],
  [2.6, -66, 6.4, -62],    // the way on, toward the Spire (after the Bog Mother)
];
const WALKS = [...ISLES, ...WALKS_BW];
const BOUNDS = [-16, -66, 20, 16];
const wet = (x, z) => !WALKS.some((r) => x > r[0] - 0.3 && x < r[2] + 0.3 && z > r[1] - 0.3 && z < r[3] + 0.3) && !(x > 1 && x < 4.4 && z > 15 && z < 20);

export default {
  id: 'marsh', name: 'The Weeping Marsh', tagline: 'WHERE THE FIRST BELL WAS CAST, AND DROWNED.', tier: 12, act: 3,
  start: { x: 2.6, z: 12.6, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['reedGate', 'motherGate'],
  ambience: {
    fog: 0x18221f, fogNear: 76, fogFar: 140, moon: 2.2, moonColor: 0xb4ccb8, moonDir: [0.3, 1, -0.7], hemi: 1.6, hemiSky: 0x6a8478, hemiGround: 0x0e1612,
    fill: 1.5, fillColor: 0x7a9488, ambient: 0x1c2824, ambientI: 0.8, rain: 0.35, drizzle: 0.45, lightning: false, weather: 'marsh',
    grade: { gain: [0.93, 1.02, 0.97], lift: [0.004, 0.012, 0.009], sat: 0.7 },
    beams: [],
  },
  lamps: [{ id: 'landing', x: -2.6, z: 8.6, sx: 1.3, sz: 0.3 }, { id: 'reeds', x: 7.6, z: -38.6, sx: -1.4, sz: 0.2 }],
  items: [{ id: 'c1', x: -5.8, z: -13.4, ry: Math.PI / 2, kind: 'embers', amount: 400 }, { id: 'c2', x: 8.8, z: -27.2, ry: -Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [-5, 9, 8, 15], text: 'THE FIRST FOUNDRY SANK HERE. KEEP TO THE BOARDS.' },
    { zone: [1, -2, 4.4, 1], text: 'THE DROWNED BELLS STILL RING. SOMETHING ANSWERS.' },
    { zone: [1.4, -20, 4.8, -17], text: 'A WITCH OF THE MARSH KEEPS HER POT WARM.' },
    { zone: [-2, -41, 10, -38.4], text: 'BEYOND, THE BOG MOTHER COUNTS HER BELLS.' },
  ],
  foes: [
    { t: 'leech', x: 0.4, z: 6.4 }, { t: 'leech', x: 5.6, z: 5.6 }, { t: 'wisp', x: 2.6, z: 4.8 },
    { t: 'wisp', x: 1.6, z: -39.4 }, { t: 'leech', x: 5, z: -40 },
  ],
  encounters: [
    { id: 'bells', zone: [-6, -14.4, 9, -2.4], gates: ['reedGate'], opens: ['graveGate'], msg: 'THE WATER STIRS AMONG THE BELLS', done: 'THE ROOTS SINK BACK INTO THE MUD',
      waves: [
        { pre: true, foes: [{ t: 'leech', x: -2.4, z: -8.6 }, { t: 'leech', x: 5.4, z: -9.8 }, { t: 'leech', x: 1.4, z: -12.8 }, { t: 'wisp', x: 6.6, z: -4.6 }] },
        { foes: [{ t: 'bogtroll', x: 2, z: -12.6 }, { t: 'leech', x: -4.6, z: -9 }, { t: 'wisp', x: 8, z: -9 }, { t: 'wisp', x: -3, z: -4.2 }] },
      ] },
    { id: 'witch', zone: [-5, -31.4, 9, -20.6], gates: ['graveGate'], opens: ['hutGate'], msg: 'THE DOOR OF THE HUT SWINGS OPEN', done: 'THE WAY TO THE FOUNDRY IS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'marshwitch', x: 1.2, z: -29.4, face: 0 }, { t: 'bogtroll', x: 5.4, z: -27.6 }, { t: 'leech', x: -1.4, z: -22.8 }, { t: 'leech', x: 7, z: -22.6 }] },
        { foes: [{ t: 'marshwitch', x: 7.4, z: -30.4 }, { t: 'wisp', x: -3.8, z: -22.4 }, { t: 'wisp', x: 7.2, z: -24.4 }, { t: 'bogtroll', x: 3, z: -30.8 }] },
      ] },
  ],
  boss: { type: 'bogmother', x: 4, z: -52.6, face: 0, zone: [-6.6, -61.6, 14.6, -43.4], gates: ['motherGate'], opens: ['exitGate', 'motherGate'] },
  exit: { zone: [2.8, -65.6, 6.2, -64], to: 'spire', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ water, isles, walkways
    P.water(ctx, BOUNDS[0] - 30, BOUNDS[1] - 30, BOUNDS[2] + 30, BOUNDS[3] + 30);
    for (const r of ISLES) P.isle(ctx, ...r);
    P.boardwalk(ctx, 1.2, 15, 4, 20.5, { rail: '+x' }); P.boardwalk(ctx, 1, -2, 4.4, 4, { rail: '+x' }); P.boardwalk(ctx, 1.4, -20, 4.8, -15, { rail: '-x' });
    P.boardwalk(ctx, 2, -37, 5.4, -32, { rail: '+x' }); P.boardwalk(ctx, 2.4, -43, 5.8, -41); P.boardwalk(ctx, 2.6, -66, 6.4, -62, { rail: '-x' });
    P.voidFill(ctx, BOUNDS, WALKS, 1.0);
    // islets out in the water (no walking there: the water's solid covers them)
    for (const [x0, z0, x1, z1] of [[11.5, -11, 15.5, -5], [-12.5, -14, -9.5, -8], [-12, -30, -8.5, -24], [12.5, -30, 16, -23], [12, -40, 15.5, -36], [-13, -50, -9.5, -45], [17, -58, 20, -52], [-11, 8, -8.5, 12]]) { P.isle(ctx, x0, z0, x1, z1, { moss: 1 }); P.cypress(ctx, (x0 + x1) / 2, (z0 + z1) / 2, 6.5 + ((x0 * 7) % 3), { solid: false }); }

    // ------------------------------------------------ the landing
    P.punt(ctx, 5.6, 17.8, 0.2);
    P.cypress(ctx, -3.6, 13.4, 7.4); P.cypress(ctx, -7.6, 9.4, 8.6, { y: P.WATER_Y, solid: false }); P.cypress(ctx, 10.4, 12.4, 7.8, { y: P.WATER_Y, solid: false });
    P.totem(ctx, 6.8, 13.6, 2.8, 0.6); P.sunkBell(ctx, 6.2, 6.6, 1.1, { y: 0, sink: 0.3, solid: true, ring: true });
    P.lantern(ctx, 0.5, 4.6, { ry: -0.7 });
    P.reeds(ctx, -4.4, 5.2, 0.7, 10); P.reeds(ctx, 7.4, 9.6, 0.6, 8);
    K.fallenBody(ctx, 4.6, 9.6, 1.2, 0x161c18); K.droppedSword(ctx, 5.4, 10.2, 2.4);
    P.sunkBell(ctx, -8.6, 4.8, 1.3, { ring: true }); P.sunkBell(ctx, 11.2, 7.2, 1.0); P.sunkBell(ctx, 10.6, 1.6, 1.6, { ring: true });
    P.log(ctx, -9.6, 14.2, 4.4, 0.4, P.WATER_Y + 0.05);

    // ------------------------------------------------ the first walk
    P.cypress(ctx, -1.6, 0.6, 6.2, { y: P.WATER_Y, solid: false }); P.cypress(ctx, 7.6, 0.2, 7.2, { y: P.WATER_Y, solid: false });
    P.sunkBell(ctx, -2.8, 2.6, 0.9, { ring: true }); P.sunkBell(ctx, 6.4, -0.6, 0.8);
    ctx.marks.reedGate = barrier3(ctx, 2.7, -1.2, 3.6, 'x', 'roots', { open: true });

    // ------------------------------------------------ the field of bells (first fight)
    P.sunkBell(ctx, -4.6, -5.6, 1.4, { y: 0, sink: 0.32, solid: true, ring: true });
    P.sunkBell(ctx, 7.2, -6.2, 1.0, { y: 0, sink: 0.3, solid: true });
    P.sunkBell(ctx, -3, -12.2, 1.8, { y: 0, sink: 0.36, solid: true, ring: true });
    P.sunkBell(ctx, 7.8, -12.6, 1.2, { y: 0, sink: 0.3, solid: true });
    P.sunkBell(ctx, 1.6, -4.0, 0.7, { y: 0, sink: 0.3, solid: true });
    P.cypress(ctx, -5.8, -3.2, 7.6); P.cypress(ctx, 8.8, -14, 6.2);
    P.totem(ctx, 9, -3.4, 2.6, -0.4); P.lantern(ctx, -6.2, -8.8, { ry: 1.2 });
    P.bonePile(ctx, 4.8, -13.6, 0.6, 6); P.bonePile(ctx, -6, -6.8, 0.5, 5);
    K.fallenBody(ctx, 3.4, -7.2, -0.6, 0x161c18); K.droppedSword(ctx, 4.2, -6.6, 1.9);
    P.sunkBell(ctx, -9.4, -4.4, 1.5, { ring: true }); P.sunkBell(ctx, 12.4, -13.2, 1.2); P.sunkBell(ctx, -8.8, -15.6, 1.0, { ring: true });
    P.lilies(ctx, [[-9.6, -11, 2.2, 12], [12.6, -2.6, 2.4, 14], [-2.6, -17.6, 2.2, 10], [8.6, -17.6, 2.4, 12]]);
    ctx.marks.graveGate = barrier3(ctx, 3.1, -15.6, 3.6, 'x', 'roots');

    // ------------------------------------------------ the second walk
    P.lantern(ctx, 4.9, -17.6, { ry: 2.4 }); P.cypress(ctx, -1.4, -18.4, 6.8, { y: P.WATER_Y, solid: false }); P.cypress(ctx, 8.8, -17.4, 7.6, { y: P.WATER_Y, solid: false });
    P.log(ctx, 7.2, -19.2, 3.6, -0.3, P.WATER_Y + 0.05);

    // ------------------------------------------------ the witch's yard (second fight)
    P.hut(ctx, -2.4, -28, Math.PI / 4);
    P.cauldron(ctx, 2.6, -25.6);
    P.totem(ctx, -5, -21.4, 3, 0.3); P.totem(ctx, 8.8, -31, 2.6, -0.5); P.totem(ctx, 5.6, -21, 2.2, 0.1);
    P.bonePile(ctx, 4.2, -23.4, 0.7, 7); P.bonePile(ctx, -4.6, -24, 0.5, 5);
    P.sunkBell(ctx, 8.4, -22.4, 1.2, { y: 0, sink: 0.3, solid: true, ring: true });
    P.cypress(ctx, 9, -20.8, 6.4); P.cypress(ctx, -5.2, -31.2, 8);
    P.lantern(ctx, 6.6, -31.4, { ry: 2.8 });
    K.fallenBody(ctx, 6, -27.6, 2.2, 0x161c18);
    P.sunkBell(ctx, -9, -21.6, 1.1); P.sunkBell(ctx, 12.4, -20.8, 1.4, { ring: true }); P.sunkBell(ctx, 13, -33.6, 0.9);
    P.lilies(ctx, [[-8.8, -33.6, 2, 10], [12.6, -32.4, 2.2, 10]]);
    ctx.marks.hutGate = barrier3(ctx, 3.7, -32.6, 3.6, 'x', 'roots');

    // ------------------------------------------------ the last isle, under the foundry's chimney
    P.chimney(ctx, -7.2, -37.6, 16, 2.6);
    P.sunkBell(ctx, -4.4, -34.4, 1.3, { ring: true }); P.sunkBell(ctx, -5.6, -42, 1.0); P.sunkBell(ctx, 12.6, -42.4, 1.5, { ring: true });
    P.cypress(ctx, 9.4, -37.6, 6.8); P.reeds(ctx, -1.2, -40.4, 0.6, 9);
    P.lantern(ctx, -1.4, -37.6, { ry: 0.4 });
    ctx.marks.motherGate = barrier3(ctx, 4.1, -42.4, 3.6, 'x', 'roots', { open: true });

    // ------------------------------------------------ the drowned foundry floor (the Bog Mother)
    P.hoard(ctx, -2.4, -59.2, 2.6);
    P.ruinWall(ctx, -6.6, -61.6, -6.6, -54.4, 1.2, 4.2); P.furnaceMouth(ctx, -6.4, -52.2, '+x'); P.ruinWall(ctx, -6.6, -50, -6.6, -44.4, 0.6, 2.8, { gaps: 0.3 });
    P.ruinWall(ctx, 7.6, -61.6, 14.6, -61.6, 1.0, 3.6, { gaps: 0.2 });
    P.sunkBell(ctx, 13, -47.2, 1.3, { y: 0, sink: 0.34, solid: true, ring: true }); P.sunkBell(ctx, 13.2, -57.2, 1.7, { y: 0, sink: 0.36, solid: true });
    P.sunkBell(ctx, 9.4, -60, 0.9, { y: 0, sink: 0.3, solid: true, ring: true });
    P.cypress(ctx, 14, -44.4, 8.4); P.cypress(ctx, -5.6, -44.2, 7);
    P.lantern(ctx, 14.2, -52, { ry: -1.6 }); P.lantern(ctx, -5.4, -47.6, { ry: 1.4 }); P.lantern(ctx, 7.4, -60.6, { ry: 3 });
    P.bonePile(ctx, 10.6, -58.4, 0.7, 7); P.bonePile(ctx, -4.6, -55.4, 0.6, 6); K.fallenBody(ctx, 9.6, -50.4, 0.9, 0x161c18); K.droppedSword(ctx, 10.6, -49.8, 2.4);
    P.foundryFloor(ctx, -4.4, -59.8, 13, -45.4, [4, -52.6, 5.6]);
    for (const [x, z, h] of [[-11, -54, 9], [-12, -61, 7.6], [18, -46, 8], [17, -63, 7]]) P.cypress(ctx, x, z, h, { y: P.WATER_Y, solid: false });
    P.sunkBell(ctx, -9.6, -57.4, 2.0, { ring: true, every: 6 }); P.sunkBell(ctx, 17.6, -50, 1.4, { ring: true });
    ctx.marks.exitGate = barrier3(ctx, 4.5, -62.6, 4, 'x', 'roots');

    // ------------------------------------------------ the wisps, the fog on the water, the light on it
    for (const [x, y, z] of [[-3.6, 1.8, -47.6], [11.4, 1.8, -55.6], [8.6, 2, -45.4]]) P.wisp(ctx, x, y, z, { r: 0.8, light: 2.6 });
    for (const [x, y, z] of [[-9, 1.1, 2], [11.6, 1.0, 11], [-10, 1.4, -10], [13, 1.2, -18], [-9.6, 1.2, -30], [13.6, 1.0, -34], [-10.4, 1.3, -46], [17.6, 1.2, -56], [0, 1.0, 18.6], [-3.4, 1.2, -16.6]]) P.wisp(ctx, x, y, z, { r: 1.4 });
    for (const r of [[-16, -66, -8, 16], [11, -42, 20, 16], [16, -66, 20, -42], [-16, 16.5, 0.6, 20], [5, 16.5, 20, 20]]) P.fogBank(ctx, ...r, { opacity: 0.1, y: -0.2, color: 0x7a8c86 });
    P.glints(ctx, wet, [BOUNDS]);
  },
};
