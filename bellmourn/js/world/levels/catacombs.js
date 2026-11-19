// Act II, region III — The Catacombs. (PROPOSAL: names and texts in this file are proposals for the author.)
// Down the pylon's stair under the dunes into the oldest dead: the stair hall, the gallery of loculi and its
// ossuary, the chasm with its one bridge, the hall of sarcophagi under a chandelier of skulls, and the
// reliquary where the Lich keeps his bier under green witchfire. Beyond it the floor is split, and red
// light breathes up from below. No sky at all: the torches and the braziers are all the light there is.
import * as P from '../props/catacombs.js';
import { rockFill } from '../props/undercroft.js';
import { W2, barrier, floorGlow, decal } from '../kit2.js';
import * as T from '../../engine/textures.js';

const WALKS = [
  [0, 4, 10, 16],             // the stair hall
  [-4, -4, 10, 4],            // the gallery of loculi (east)
  [-5.2, -1.8, -4, 1.8],      // the gallery's portcullis
  [-16, -4, -5.2, 4],         // the ossuary (west)
  [-12.3, -5.2, -8.7, -4],    // the chasm's portcullis
  [-16, -22, -5, -5.2],       // the chasm and its bridge
  [-12.3, -23.2, -8.7, -22],  // the crypt's portcullis
  [-16, -36, 4, -23.2],       // the hall of sarcophagi
  [0.2, -37.2, 3.8, -36],     // the crypt's north portcullis
  [-4, -42, 8, -37.2],        // the antechamber and the last lamp
  [0.2, -43.4, 3.8, -42],     // the reliquary door
  [-8, -60, 14, -43.4],       // the Lich's reliquary
  [9, -64, 12.6, -60],        // the rift
];
const BOUNDS = [-18, -64, 12 + 10, 18];

export default {
  id: 'catacombs', name: 'The Catacombs', tagline: 'BELOW THE SAND, THE DEAD OF A THOUSAND YEARS.', tier: 10, act: 2,
  start: { x: 5.4, z: 14.4, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['galleryGate', 'crackGate2', 'reliquaryGate'],
  ambience: {
    fog: 0x0c0a0a, fogNear: 78, fogFar: 175, sky: 0x020101, moon: 0.4, moonColor: 0x8a7a6a, hemi: 0.85, hemiSky: 0x5a4e44, hemiGround: 0x0e0a08,
    fill: 1.7, fillColor: 0x7a6a5c, ambient: 0x1a1612, ambientI: 0.7, rain: 0, lightning: false, weather: 'dust',
    grade: { gain: [1.06, 0.98, 0.9], lift: [0.006, 0.003, 0.002], sat: 0.84 },
    beams: [],
  },
  lamps: [{ id: 'stair', x: 1.6, z: 5.8, sx: 1.3, sz: 0.3 }, { id: 'reliquary', x: 7, z: -39.4, sx: -1.3, sz: 0.2 }],
  items: [{ id: 'c1', x: -15.1, z: -20.4, ry: Math.PI / 2, kind: 'embers', amount: 280 }, { id: 'c2', x: -15.1, z: -34.4, ry: Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [0, 10, 10, 16], text: 'NO SKY DOWN HERE. KEEP TO THE FIRES.' },
    { zone: [-4, -4, 4, 4], text: 'SLAY THE BONE-CASTERS FIRST. THEY RAISE WHAT YOU KILL.' },
    { zone: [-16, -10, -5, -5.4], text: 'ONE BRIDGE. NOTHING BELOW IT HAS A BOTTOM.' },
    { zone: [-4, -42, 8, -38.6], text: 'GREEN FIRE AHEAD. SOMEONE STILL READS BY IT.' },
  ],
  foes: [
    { t: 'bonecaster', x: 2.6, z: -1.6 }, { t: 'slime', x: 6.4, z: 1.4 }, { t: 'slime', x: 4.4, z: -2.6 },
    { t: 'cryptspider', x: -7.2, z: -18.6 }, { t: 'cryptspider', x: -13.6, z: -19.4 }, { t: 'bonecaster', x: -7, z: -8.4 },
    { t: 'slime', x: -1.2, z: -40.2 }, { t: 'cryptspider', x: 3.6, z: -41.2 },
  ],
  encounters: [
    { id: 'ossuary', zone: [-15, -3.2, -6.4, 3], gates: ['galleryGate'], opens: ['chasmGate'], msg: 'THE SKULLS IN THE WALLS TURN TO WATCH', done: 'A PORTCULLIS GRINDS UP',
      waves: [
        { pre: true, foes: [{ t: 'bonecaster', x: -13.8, z: -2.4, face: 0 }, { t: 'cryptspider', x: -9.4, z: -3 }, { t: 'slime', x: -12.4, z: 2.6 }, { t: 'slime', x: -7.4, z: 2.4 }] },
        { foes: [{ t: 'bonecaster', x: -13.6, z: 2.2 }, { t: 'bonecaster', x: -7, z: -3.2 }, { t: 'cryptspider', x: -11, z: 3 }, { t: 'cryptspider', x: -14.6, z: -0.4 }] },
      ] },
    { id: 'crypt', zone: [-14, -34.4, 2.6, -24.4], gates: ['crackGate2'], opens: ['cryptGate'], msg: 'THE LIDS ARE MOVING', done: 'THE NORTH PORTCULLIS RISES',
      waves: [
        { pre: true, foes: [{ t: 'cryptspider', x: -12.6, z: -34.6, face: 0 }, { t: 'cryptspider', x: 1.6, z: -34.4, face: 0 }, { t: 'bonecaster', x: -5, z: -35.2, face: 0 }, { t: 'slime', x: -2, z: -28.6 }] },
        { foes: [{ t: 'slime', x: -14.6, z: -26 }, { t: 'slime', x: 2.6, z: -25.4 }, { t: 'bonecaster', x: -7.6, z: -34.6 }, { t: 'cryptspider', x: -5.6, z: -24.2 }] },
      ] },
  ],
  boss: { type: 'lich', x: 3, z: -50.4, face: 0, zone: [-7.6, -59.6, 13.6, -44.4], gates: ['reliquaryGate'], opens: ['exitGate', 'reliquaryGate'] },
  exit: { zone: [9.2, -63.6, 12.4, -62], to: 'abyss', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ ground: tomb slabs, the rock beyond
    // (the chasm, x -16..-5 z -14.6..-11, is left open)
    const X0 = BOUNDS[0] - 30, Z0 = BOUNDS[1] - 30, X1 = BOUNDS[2] + 30, Z1 = BOUNDS[3] + 30, rock = W2.cat('#2a2420');
    K.floor(ctx, X0, -11, X1, Z1, rock, -0.02, 0.3); K.floor(ctx, X0, Z0, X1, -14.6, rock, -0.02, 0.3);
    K.floor(ctx, X0, -14.6, -16, -11, rock, -0.02, 0.3); K.floor(ctx, -5, -14.6, X1, -11, rock, -0.02, 0.3);
    for (const w of WALKS) if (w !== WALKS[5]) K.floor(ctx, w[0], w[1], w[2], w[3], W2.tomb(P.FLOOR), 0.0, 0.3);
    K.floor(ctx, -16, -22, -5, -14.6, W2.tomb(P.FLOOR), 0.0, 0.3); K.floor(ctx, -16, -11, -5, -5.2, W2.tomb(P.FLOOR), 0.0, 0.3);
    rockFill(ctx, BOUNDS, WALKS, 2.4);

    // ------------------------------------------------ the stair hall
    P.vaultWall(ctx, -0.4, 7.4, -0.4, 16.4, { gaps: [{ a0: 8.6, a1: 13, ys: 3.6 }], torches: [0, 2], bay: 4.5 });
    P.stub(ctx, -0.4, 4, -0.4, 7.4, 0.5, 1.4, { side: 1 });
    P.greatStair(ctx, 1.4, 9.2, 12.4, 9);
    P.stub(ctx, 0, 16.4, 10.4, 16.4, 0.4, 1.0); P.stub(ctx, 10.4, 4, 10.4, 16.4, 0.5, 1.3);
    P.brazier(ctx, 2.2, 14.8); P.brazier(ctx, 8.8, 5.6);
    P.sarcophagus(ctx, 8.4, 12.6, Math.PI / 2, { open: true }); P.skullHeap(ctx, 8.8, 15, 0.8, 4);
    P.cage(ctx, 5.2, 9.4, 2.4); P.candles(ctx, 2.6, 0, 7.4, 5, true); P.bonePile(ctx, 6.6, 6.2, 0.6, 6);
    K.fallenBody(ctx, 6, 11.2, 2.2, 0x1c1814); K.droppedSword(ctx, 6.8, 10.6, 0.8);

    // ------------------------------------------------ the gallery of loculi (east) and the ossuary (west)
    P.vaultWall(ctx, -4.4, -4.4, 10.4, -4.4, { torches: [1, 3], bay: 3.7 });
    P.stub(ctx, -16, -4.4, -12.3, -4.4, 0.6, 1.5, { side: 1 }); P.stub(ctx, -8.7, -4.4, -4.4, -4.4, 0.6, 1.4, { side: 1 });
    P.stub(ctx, -16.4, 4.4, 0, 4.4, 0.4, 1.1); P.stub(ctx, 10.4, -4.4, 10.4, 4, 0.4, 1.2);
    P.vaultWall(ctx, -16.4, -4.4, -16.4, 4.4, { face: 'ossuary', bay: 4.4, torches: [1] });
    // the dividing wall and its portcullis
    P.stub(ctx, -4.6, -4.4, -4.6, -1.8, 1.2, 1.6, { side: 1, thick: 0.8 }); P.stub(ctx, -4.6, 1.8, -4.6, 4.4, 1.2, 1.6, { side: 1, thick: 0.8 });
    ctx.marks.galleryGate = barrier(ctx, -4.6, 0, 3.6, 'z', 'portcullis', { open: true });
    P.brazier(ctx, 9, 3); P.brazier(ctx, -6.4, 3.2); P.brazier(ctx, -15, -3.2, { intensity: 4 });
    P.cage(ctx, 1.6, 1.6, 2.6, { empty: true }); P.cage(ctx, -12.2, 1.2, 2.2);
    P.skullChandelier(ctx, -10.4, -0.4, 3.6, 1.0);
    P.skullHeap(ctx, -15.2, 3.4, 0.9, 4); P.bonePile(ctx, -8.6, 2.4, 0.8, 9); P.bonePile(ctx, 4.8, 3, 0.6, 6);
    P.candles(ctx, -15.4, 0, -1.2, 6, true); P.candles(ctx, 6.4, 0, -3.4, 4);
    K.fallenBody(ctx, -9.6, -1.6, -0.8, 0x1c1814); K.droppedSword(ctx, -8.6, -1, 1.6);
    ctx.marks.chasmGate = barrier(ctx, -10.5, -4.4, 3.6, 'x', 'portcullis');

    // ------------------------------------------------ the chasm
    P.vaultWall(ctx, -16.4, -22.6, -16.4, -4.4, { torches: [1, 3], bay: 4.5 });
    P.stub(ctx, -4.6, -22.6, -4.6, -4.4, 0.4, 1.2, { side: -1 });
    P.chasm(ctx, -16, -14.6, -5, -11, -11.8, -9.2);
    P.brazier(ctx, -6.2, -6.4); P.brazier(ctx, -6, -20.8);
    P.bonePile(ctx, -14.4, -8, 0.7, 7); P.skullHeap(ctx, -6, -9.6, 0.7, 3); P.candles(ctx, -15.2, 0, -17.4, 5, true);
    P.cage(ctx, -7.2, -16.4, 2.6);
    P.stub(ctx, -16, -22.6, -12.3, -22.6, 0.5, 1.2, { side: 1 }); P.stub(ctx, -8.7, -22.6, -4.6, -22.6, 0.5, 1.2, { side: 1 });
    ctx.marks.crackGate2 = barrier(ctx, -10.5, -22.6, 3.6, 'x', 'portcullis', { open: true });

    // ------------------------------------------------ the hall of sarcophagi
    P.vaultWall(ctx, -16.4, -36.4, -16.4, -22.6, { torches: [0, 2], bay: 4.6 });
    P.vaultWall(ctx, -16.4, -36.4, -8, -36.4, { face: 'ossuary', bay: 4.2, torches: [1] });
    P.stub(ctx, -8, -36.4, 0.2, -36.4, 0.6, 1.4, { side: 1 }); P.stub(ctx, 3.8, -36.4, 4.4, -36.4, 0.6, 1.0, { side: 1 });
    P.stub(ctx, 4.4, -36.4, 4.4, -22.6, 0.4, 1.2);
    for (const [x, z, open] of [[-12.6, -27, false], [-12.6, -31.6, true], [-7.2, -27.4, true], [-7.2, -31.8, false], [-1.8, -27, false], [-1.8, -31.4, false]]) P.sarcophagus(ctx, x, z, 0, { open });
    P.skullChandelier(ctx, -7.2, -29.4, 3.8, 1.2);
    P.pillar(ctx, -15.2, -24.6, { skulls: true }); P.pillar(ctx, -9.8, -35.2, { w: 0.8 });
    P.witchfire(ctx, 2.8, -24, { intensity: 3.2, dist: 5 }); P.brazier(ctx, -15, -29.4, { intensity: 4 });
    P.bonePile(ctx, -4.6, -34.6, 0.8, 8); P.candles(ctx, -4.4, 0, -24.4, 5, true);
    ctx.marks.cryptGate = barrier(ctx, 2, -36.4, 3.6, 'x', 'portcullis');

    // ------------------------------------------------ the antechamber and the last lamp
    P.pillar(ctx, -3.4, -38, { skulls: true }); P.pillar(ctx, -3.4, -41.4);
    P.stub(ctx, -4.4, -42, -4.4, -37.2, 0.6, 1.2, { side: 1 }); P.stub(ctx, 8.4, -42.8, 8.4, -36.4, 0.4, 1.1);
    P.cage(ctx, 1, -39.4, 2.6); P.brazier(ctx, 4.6, -38.2, { intensity: 4 }); P.candles(ctx, -2.4, 0, -40, 5);
    P.stub(ctx, -4.4, -42.8, 0.2, -42.8, 0.5, 1.1, { side: 1 }); P.stub(ctx, 3.8, -42.8, 8.4, -42.8, 0.5, 1.1, { side: 1 });
    ctx.marks.reliquaryGate = barrier(ctx, 2, -42.8, 3.6, 'x', 'portcullis', { open: true });

    // ------------------------------------------------ the Lich's reliquary
    P.vaultWall(ctx, -8.4, -60.4, -8.4, -42.8, { face: 'ossuary', bay: 4.4, torches: [] });
    P.vaultWall(ctx, -8.4, -60.4, 14.4, -60.4, { gaps: [{ a0: 9, a1: 12.6, ys: 3.4 }], bay: 4.6, torches: [] });
    P.stub(ctx, 14.4, -60.4, 14.4, -42.8, 0.4, 1.2);
    P.bier(ctx, 3, -57.4);
    for (const [x, z] of [[-0.8, -54.4], [6.8, -54.4], [-6.4, -45.2], [12.4, -45.2]]) P.witchfire(ctx, x, z);
    P.pillar(ctx, -7, -49.6, { skulls: true }); P.pillar(ctx, -7, -55.6, { skulls: true });
    decal(ctx, 3, -50.4, 11, T.sigil('circle', 96, 103), 0x40ff80, { k: 0.32, pulse: 0.9 });
    floorGlow(ctx, 3, -55.4, 9, 4, 0x40ff80, 0.25);
    P.skullHeap(ctx, -6.6, -58.6, 1.1, 5); P.skullHeap(ctx, 13, -58.8, 0.9, 4); P.bonePile(ctx, 10.6, -48, 0.8, 8); P.bonePile(ctx, -4.4, -46, 0.7, 6);
    K.fallenBody(ctx, 8.6, -51.4, 0.8, 0x1c1814); K.droppedSword(ctx, 9.6, -50.8, 2.2);
    ctx.marks.exitGate = barrier(ctx, 10.8, -60.6, 3.4, 'x', 'portcullis');
    // the rift beyond: the way down
    P.vaultWall(ctx, 8.6, -64, 8.6, -60.4, { face: 'plain', bay: 4, endFade: false });
    P.rift(ctx, 10.8, -63, 3, 1.4);
  },
};
