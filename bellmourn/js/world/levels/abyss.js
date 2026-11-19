// Act II, region IV — The Abyss. (PROPOSAL: names and texts in this file are proposals for the author.)
// Down through the rift under the catacombs, into the place the silence came from: basalt islands hung over
// a red void, rivers of fire far below, the first ritual circle, the court of chained altars cut by a river
// of fire, the brink and the last lamp, and the great circle under the wheel of eyes where the Archon keeps
// the rite that stilled the bell. Embers rise, ash falls; the dark breathes red.
import * as P from '../props/abyss.js';
import { W2, barrier } from '../kit2.js';
import * as T from '../../engine/textures.js';

const ISLANDS = [
  [-4, 6, 8, 17],          // the rift: where the wardens come through
  [-8, -12, 10, 1.2],      // the first circle
  [-10, -32, 6, -18],      // the court of chained altars
  [-3, -43, 9, -38],       // the brink and the last lamp
  [-7, -64, 15, -46],      // the great circle under the wheel
];
const BRIDGES = [
  [0.8, 1.2, 3.6, 6],
  [-5.6, -18, -3, -12],
  [1, -38, 3.8, -32],
  [2.4, -46, 5.2, -43],
  [2.6, -68, 6.4, -64],    // the way out, toward the light (after the Archon)
];
const WALKS = [...ISLANDS, ...BRIDGES];
const BOUNDS = [-18, -68, 22, 18];

export default {
  id: 'abyss', name: 'The Abyss', tagline: 'WHERE THE SILENCE CAME FROM.', tier: 11, act: 2,
  start: { x: 1.6, z: 13.8, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['riteGate', 'archonGate'],
  ambience: {
    fog: 0x3a0e0e, fogNear: 76, fogFar: 160, sky: 0x1a0505, moon: 1.4, moonColor: 0xd8a8a0, moonDir: [0.3, 1, -0.6], hemi: 1.0, hemiSky: 0x6a3a4a, hemiGround: 0x120608,
    fill: 1.4, fillColor: 0x7a6078, ambient: 0x1a0c10, ambientI: 0.6, rain: 0, lightning: false, weather: 'embers',
    grade: { gain: [1.05, 0.96, 0.95], lift: [0.01, 0.002, 0.002], sat: 0.85 },
    pulse: { amp: 0.22, speed: 0.8, flareEvery: 8, flare: 0.6 },
    beams: [],
  },
  lamps: [{ id: 'rift', x: -2.4, z: 10.6, sx: 1.3, sz: 0.3 }, { id: 'brink', x: 7.6, z: -40.4, sx: -1.4, sz: 0.2 }],
  items: [{ id: 'c1', x: 9, z: -11, ry: 0, kind: 'embers', amount: 320 }, { id: 'c2', x: -9.1, z: -30.8, ry: Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [-4, 12, 8, 17], text: 'NO GROUND BELOW. KEEP TO THE STONE.' },
    { zone: [-8, -1.6, 10, 1.2], text: 'A CHANTING CULTIST FEEDS THE CIRCLE. STOP THE CHANT.' },
    { zone: [-10, -21, 6, -18.2], text: 'THE RIVER OF FIRE CROSSES THE COURT. USE THE SLABS.' },
    { zone: [-3, -43, 9, -41.4], text: 'THE WHEEL TURNS. SOMETHING ON IT IS LOOKING AT YOU.' },
  ],
  foes: [
    { t: 'imp', x: 5.6, z: 7.6 }, { t: 'hellhound', x: 0, z: 7.4 },
    { t: 'cultist', x: 0.6, z: -41.2 }, { t: 'imp', x: 4.4, z: -40.2 },
  ],
  encounters: [
    { id: 'rite', zone: [-6, -10.4, 8, -0.6], gates: ['riteGate'], opens: ['veilGate'], msg: 'THE CIRCLE KINDLES', done: 'THE GLASS TEETH SINK INTO THE STONE',
      waves: [
        { pre: true, foes: [{ t: 'cultist', x: 1, z: -9.6, face: 0 }, { t: 'imp', x: -5, z: -6.4 }, { t: 'imp', x: 7.4, z: -7 }, { t: 'hellhound', x: 6.6, z: -9.6 }] },
        { foes: [{ t: 'demon', x: 3, z: -8.4 }, { t: 'imp', x: -6.4, z: -1.2 }, { t: 'hellhound', x: 8.4, z: -2 }, { t: 'cultist', x: -5, z: -9.4 }] },
      ] },
    { id: 'altars', zone: [-8, -30.4, 4.4, -19.4], gates: ['veilGate'], opens: ['altarGate'], msg: 'THE CHAINS ON THE ALTARS PULL TIGHT', done: 'THE WAY TO THE BRINK IS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'cultist', x: -7.6, z: -29.8, face: 0 }, { t: 'cultist', x: 4, z: -30, face: 0 }, { t: 'seraph', x: -2, z: -28.4 }, { t: 'hellhound', x: -0.4, z: -23.4 }] },
        { foes: [{ t: 'demon', x: -2, z: -30.6 }, { t: 'imp', x: -8.6, z: -20 }, { t: 'imp', x: 4.6, z: -20.4 }, { t: 'seraph', x: 4.6, z: -26.4 }] },
      ] },
  ],
  boss: { type: 'archon', x: 4, z: -55, face: 0, zone: [-6.6, -63.6, 14.6, -47], gates: ['archonGate'], opens: ['exitGate', 'archonGate'] },
  exit: { zone: [2.8, -67.6, 6.2, -66], to: 'end', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ the void: rivers of fire far below, rocks hanging in it
    P.fireRiver(ctx, -40, -16.2, 50, -13.8, { y: -11, seed: 40, glow: false, dim: 0.6 });
    P.fireRiver(ctx, 12.6, -48, 15, 10, { y: -12, seed: 44, speed: 0.04, glow: false, dim: 0.55 });
    P.fireRiver(ctx, -40, -42.4, 50, -40.4, { y: -11.5, seed: 48, glow: false, dim: 0.55 });
    P.fireRiver(ctx, -11.6, -46, -9.6, 8, { y: -13, seed: 50, speed: 0.03, glow: false, dim: 0.5 });
    for (const [x, y, z, s] of [[-12, -5, 10, 1.6], [13, -6, 4, 1.2], [-13, -4, -8, 2.0], [12, -7, -20, 1.4], [-14, -6, -38, 1.8], [18, -5, -52, 1.5], [-11, -7, -54, 1.3], [8, -8, -34, 1], [-6, -8, -15, 0.9]]) P.floatingRock(ctx, x, y, z, s);

    // ------------------------------------------------ the walks: basalt islands and glass bridges
    for (const r of ISLANDS) { K.floor(ctx, r[0], r[1], r[2], r[3], W2.basalt(P.BASALT), 0, 0.3); P.island(ctx, r[0], r[1], r[2], r[3]); }
    for (const r of BRIDGES) P.bridge(ctx, r[0], r[1], r[2], r[3]);
    P.voidFill(ctx, BOUNDS, WALKS);

    // ------------------------------------------------ the rift
    P.rift(ctx, -2.6, 15.2, 1.7);
    P.spire(ctx, -3.2, 7, 4.6); P.spire(ctx, 7.2, 16.2, 2.2); P.spire(ctx, 7.4, 7, 1.8, { shards: 1 });
    P.banner(ctx, 5.2, 12.6, 3.8, 0.4); P.hellfire(ctx, 6.6, 9.8); P.hellfire(ctx, -3, 6.8, { intensity: 3.5 });
    P.ritualCircle(ctx, 1.8, 10, 1.6, { kind: 'seal', px: 48, k: 0.6, candles: 0, glow: 0.15, intensity: 2 });
    P.bonePile(ctx, 6, 14.4, 0.6, 6); K.fallenBody(ctx, 4, 15.6, 1.2, 0x1a0c0c); K.droppedSword(ctx, 4.8, 16.2, 2.4);
    ctx.marks.riteGate = barrier(ctx, 2.2, 1.8, 2.8, 'x', 'obsidian', { open: true });

    // ------------------------------------------------ the first circle (first fight)
    P.ritualCircle(ctx, 1, -5.4, 4.2, { seed: 41, spin: 0.03, k: 0.45, color: 0xff7030, glow: 0.15 });
    P.spire(ctx, -7.2, -11, 6.6); P.spire(ctx, -7.4, -3, 5.2); P.spire(ctx, 9.2, -11.2, 3, { shards: 1 }); P.spire(ctx, -1.6, -11.4, 7.4);
    P.idol(ctx, 4.6, -11.2, 3.2, 0); P.lectern(ctx, 1, -10.6, 0);
    P.hellfire(ctx, -6, 0.2); P.hellfire(ctx, 8.6, 0); P.hellfire(ctx, 8.8, -8.6, { intensity: 4 });
    P.banner(ctx, -7, -7, 4.4, Math.PI / 2); P.bonePile(ctx, 7.2, -4.4, 0.7, 7); P.bonePile(ctx, -5.2, -9.6, 0.6, 6);
    K.fallenBody(ctx, -3.6, -2.2, 0.6, 0x1a0c0c); K.droppedSword(ctx, -2.6, -1.6, 2.1);
    ctx.marks.veilGate = barrier(ctx, -4.3, -12.6, 2.6, 'x', 'obsidian');

    // ------------------------------------------------ the court of chained altars (second fight)
    P.fireChannel(ctx, -10, -25.6, 6, -24.4, [-6, 2.4]);
    P.altar(ctx, -5.6, -29.2, 0); P.altar(ctx, 2, -28.4, 0); P.altar(ctx, -2.2, -20.4, Math.PI, { bound: false });
    P.spire(ctx, -9.4, -18.8, 5.6); P.spire(ctx, -9.2, -27.6, 6.8); P.spire(ctx, -4, -31.6, 7.6); P.spire(ctx, 5.2, -31.4, 4.2, { shards: 1 }); P.spire(ctx, 5.4, -18.6, 1.8, { shards: 0 });
    P.hellfire(ctx, 4.8, -22.6); P.hellfire(ctx, -9, -22.8, { intensity: 4 });
    P.banner(ctx, -9.2, -24.4 + 3.4, 4.2, Math.PI / 2); P.ritualCircle(ctx, -2, -27.8, 1.4, { kind: 'seal', px: 48, k: 0.7, candles: 6, intensity: 2.5 });
    P.bonePile(ctx, 4.4, -26.8, 0.6, 6); K.fallenBody(ctx, 3.2, -21.6, 1.8, 0x1a0c0c);
    ctx.marks.altarGate = barrier(ctx, 2.4, -32.6, 2.8, 'x', 'obsidian');

    // ------------------------------------------------ the brink
    P.spire(ctx, -2.4, -42.6, 5.4); P.spire(ctx, 8.6, -38.6, 1.6, { shards: 0 });
    P.hellfire(ctx, -2.2, -38.8, { intensity: 4 }); P.banner(ctx, 0, -42.4, 3.6, 0); P.lectern(ctx, 5.4, -42.6, 0);
    ctx.marks.archonGate = barrier(ctx, 3.8, -43.6, 2.8, 'x', 'obsidian', { open: true });

    // ------------------------------------------------ the great circle under the wheel
    P.ritualCircle(ctx, 4, -55, 7.6, { px: 128, seed: 333, k: 0.35, color: 0xffa040, spin: -0.02, candles: 30, intensity: 4, glow: 0.12 });
    P.ritualCircle(ctx, 4, -55, 2.4, { kind: 'seal', px: 48, seed: 334, k: 1.0, candles: 0, glow: 0.2, light: false });
    for (const [x, z, h] of [[-6.2, -63, 9], [-6.4, -55, 7.4], [-6.2, -47, 5.4], [14.2, -63, 6], [-1.4, -63.4, 6.6], [9.6, -63.4, 6.8]]) P.spire(ctx, x, z, h);
    for (const [x, z] of [[14.4, -47], [14.6, -55]]) P.spire(ctx, x, z, 1.6, { shards: 1 });
    P.altar(ctx, -3.2, -60.4, 0.5); P.altar(ctx, 11.4, -60.6, -0.5);
    for (const [x, z] of [[-5.6, -50.6], [13.6, -50.4], [-1, -48], [9.2, -48]]) P.hellfire(ctx, x, z, { intensity: 4.5 });
    P.idol(ctx, 1.6, -63, 3.4, 0); P.idol(ctx, 7.6, -63, 3.4, 0);
    P.bonePile(ctx, 12.4, -57, 0.8, 8); P.bonePile(ctx, -4.4, -53.6, 0.7, 7); K.fallenBody(ctx, 9.6, -52.4, 0.9, 0x1a0c0c); K.droppedSword(ctx, 10.6, -51.8, 2.4);
    P.wheel(ctx, 4, -61, { h: 15 });
    ctx.marks.exitGate = barrier(ctx, 4.5, -64.6, 3.8, 'x', 'obsidian');
  },
};
