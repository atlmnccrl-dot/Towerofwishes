// Act V, region IV — The Cradle of Bronze. (PROPOSAL: names and texts in this file are proposals for the author.)
// At the heart of the dream: the foundry where the First Founder cast the Great Bell, kept as he left it a thousand
// years ago, and kept by him. The wardens come through the cooling yard, the hall of moulds standing in rows like
// graves, his cell, the hall where the bronze river runs, the gallery of hanging hammers, the room of wax patterns,
// and come to the Cradle: the first mould, half sunk in a pool of bronze, the god asleep inside it. He will not let
// anyone wake it.
import * as P from '../props/cradle.js';
import * as D from '../props/dream.js';
import { slab, voidFill, deepFloor, W4 } from '../kit4.js';

const SOOT = P.SOOT;
const ROOMS = [
  [-4, 8, 10, 18],         // the cooling yard
  [-12, -18, 16, 2],       // the hall of moulds (first fight)
  [-29, -12, -17, 0],      // the Founder's cell (a side fight)
  [-12, -50, 18, -26],     // the bronze river
  [-2, -78, 8, -56],       // the gallery of hammers
  [14, -74, 26, -60],      // the room of wax patterns (a side fight)
  [-16, -122, 22, -86],    // the Cradle (the First Founder)
];
const WAYS = [[1.4, 2, 4.6, 8], [-17, -8, -12, -4], [1.4, -26, 4.6, -18], [1.4, -56, 4.6, -50], [8, -69, 14, -65], [1.4, -86, 4.6, -78], [2.4, -128, 5.6, -122]];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-33, -132, 30, 22];

export default {
  id: 'cradle', name: 'The Cradle of Bronze', tagline: 'WHERE THE BELL WAS CAST. WHERE THE GOD SLEEPS. WHERE HE KEEPS IT.', tier: 23, act: 5,
  start: { x: 3, z: 16, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['yardGate', 'cellGate', 'waxGate', 'cradleGate'],
  ambience: {
    fog: 0x1e0c04, fogNear: 54, fogFar: 128, background: SOOT, moon: 1.3, moonColor: 0xffc890, moonDir: [0.4, 1, -0.5], hemi: 1.6, hemiSky: 0xf0b078, hemiGround: 0x1a0c06,
    fill: 1.45, fillColor: 0xffb070, ambient: 0x34180a, ambientI: 1.1, rain: 0, drizzle: 0, lightning: false, weather: 'embers',
    grade: { gain: [1.1, 0.94, 0.82], lift: [0.03, 0.008, 0.0], sat: 1.0, vignette: 0.5, bloom: 0.5 },
    beams: [],
  },
  lamps: [{ id: 'yard', x: -2.4, z: 12, sx: 1.3, sz: 0.3 }, { id: 'wax', x: 24.4, z: -67, sx: -1.3, sz: 0 }],
  items: [
    { id: 'c1', x: -21, z: -10, ry: 0, kind: 'embers', amount: 800 },
    { id: 'c2', x: 24.6, z: -72.4, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: 6.4, z: -75, ry: -Math.PI / 2, kind: 'embers', amount: 600 },
  ],
  hints: [
    { zone: [-4, 12, 10, 18], text: 'THE FORGE WHERE THE BELL WAS CAST. A THOUSAND YEARS AGO.' },
    { zone: [1.4, -22, 4.6, -18], text: 'A MOULD FOR EVERY BELL THE CITY EVER RANG.' },
    { zone: [-17, -8, -15, -4], text: 'HE SLEPT HERE. HE NEVER LEFT.' },
    { zone: [1.4, -56, 4.6, -52], text: 'THE HAMMERS STILL HANG READY.' },
    { zone: [1.4, -86, 4.6, -82], text: 'THE CRADLE. THE GOD SLEEPS IN IT. HE WILL NOT LET YOU WAKE IT.' },
  ],
  foes: [{ t: 'homunculus', x: 3, z: -1 }, { t: 'homunculus', x: 3, z: -53 }],
  encounters: [
    { id: 'moulds', zone: [-11.4, -17.4, 15.4, 1.4], gates: ['yardGate', 'cellGate'], opens: ['riverGate', 'cellGate'], msg: 'THE MOULDS CRACK OPEN. BRONZE WALKS OUT.', done: 'THE MOULDS ARE STILL',
      waves: [
        { pre: true, foes: [{ t: 'bronzecopy', x: 3, z: -10 }, { t: 'homunculus', x: -1, z: -4 }, { t: 'homunculus', x: 7, z: -4 }, { t: 'homunculus', x: 3, z: -13 }] },
        { foes: [{ t: 'bronzecopy', x: -1, z: -12 }, { t: 'bronzecopy', x: 7, z: -12 }, { t: 'dawnling', x: 3, z: -2 }, { t: 'homunculus', x: -3, z: -8 }, { t: 'homunculus', x: 9, z: -8 }] },
      ] },
    { id: 'cell', zone: [-28.4, -11.4, -17.6, -0.6], gates: ['cellGate'], opens: ['cellGate'], msg: 'SOMETHING GUARDS HIS SLEEP', done: 'THE CELL IS QUIET',
      waves: [
        { pre: true, foes: [{ t: 'bronzecopy', x: -23, z: -6 }, { t: 'homunculus', x: -27, z: -2 }] },
        { foes: [{ t: 'memoryknight', x: -24, z: -4 }, { t: 'homunculus', x: -19, z: -8 }, { t: 'homunculus', x: -27, z: -9 }] },
      ] },
    { id: 'river', zone: [-11.4, -49.4, 17.4, -26.6], gates: ['riverGate'], opens: ['hammerGate', 'riverGate'], msg: 'THE BRONZE RIVER RISES IN ITS CHANNEL', done: 'THE RIVER SINKS BACK',
      waves: [
        { pre: true, foes: [{ t: 'bronzecopy', x: -6, z: -31 }, { t: 'bronzecopy', x: 12, z: -31 }, { t: 'homunculus', x: 3, z: -46 }, { t: 'dawnling', x: -6, z: -46 }, { t: 'dawnling', x: 12, z: -46 }] },
        { foes: [{ t: 'sleepwalker', x: 3, z: -45 }, { t: 'homunculus', x: -4, z: -31 }, { t: 'homunculus', x: 10, z: -31 }, { t: 'nightmare', x: -4, z: -44 }, { t: 'nightmare', x: 10, z: -44 }] },
        { foes: [{ t: 'bronzecopy', x: 3, z: -30 }, { t: 'memoryknight', x: -6, z: -46 }, { t: 'memoryknight', x: 12, z: -46 }, { t: 'homunculus', x: 3, z: -42 }] },
      ] },
    { id: 'hammers', zone: [-1.4, -77.4, 7.4, -56.6], gates: ['hammerGate', 'waxGate'], opens: ['lastGate', 'waxGate'], msg: 'THE HAMMERS SWING DOWN', done: 'THE HAMMERS HANG STILL',
      waves: [
        { pre: true, foes: [{ t: 'bronzecopy', x: 3, z: -64 }, { t: 'homunculus', x: 0, z: -72 }, { t: 'homunculus', x: 6, z: -72 }] },
        { foes: [{ t: 'bronzecopy', x: 1, z: -74 }, { t: 'bronzecopy', x: 6, z: -60 }, { t: 'thought', x: 3, z: -70 }] },
      ] },
    { id: 'wax', zone: [14.6, -73.4, 25.4, -60.6], gates: ['waxGate'], opens: ['waxGate'], msg: 'THE WAX BELLS SOFTEN AND STAND', done: 'THE WAX HARDENS AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'homunculus', x: 17, z: -63 }, { t: 'homunculus', x: 23, z: -63 }, { t: 'homunculus', x: 20, z: -72 }] },
        { foes: [{ t: 'bronzecopy', x: 20, z: -66 }, { t: 'dawnling', x: 23, z: -72 }] },
      ] },
  ],
  minibosses: [{ from: 'act3', x: 3, z: -38 }],
  boss: { type: 'firstfounder', x: 3, z: -100, face: 0, zone: [-15.4, -121.4, 21.4, -86.6], gates: ['cradleGate'], opens: ['exitGate', 'cradleGate'] },
  exit: { zone: [2.6, -127.6, 5.4, -126], requires: 'boss' },
  build(K, ctx) {
    deepFloor(ctx, BOUNDS, 0x080302, { y: -16 });
    ROOMS.forEach((r, i) => slab(ctx, ...r, i === 6 ? W4.gold('#4a2e16') : W4.drown('#4a3a30'), SOOT, { kerb: D.dreamBronze(), rockTone: '#2a1a10' }));
    for (const r of WAYS) slab(ctx, ...r, D.darkBronze(), SOOT, { kerb: false, depth: 2 });
    voidFill(ctx, BOUNDS, WALKS);
    D.motes(ctx, [[-31, -130, 28, 20]], 220, { color: 0xffa050, rise: 0.6, h: 9 });

    // ------------------------------------------------ the cooling yard
    for (const [x, z, s] of [[-1.6, 15.4, 0.8], [8, 15.6, 0.9], [-1.4, 10.4, 0.6]]) P.mould(ctx, x, z, s, { hot: s > 0.7 });
    P.slag(ctx, 8.2, 10, 1); P.anvil(ctx, 6, 13, 0.4);
    K.fallenBody(ctx, 4.6, 10, 1.2, 0x1a0c06); K.droppedSword(ctx, 5.4, 10.6, 2.4);
    ctx.marks.yardGate = D.barrier5(ctx, 3, 4.4, 4, 'x', 'ribs', { open: true });

    // ------------------------------------------------ the hall of moulds: rows like graves
    for (const z of [-3, -9, -15]) for (const x of [-9, -5.4, 11.4, 15]) P.mould(ctx, x, z, 0.8, { hot: (x + z) % 3 === 0 });
    P.crucible(ctx, 3, -16.2);
    for (const [x, z] of [[-11, 1], [15, 1]]) D.breathGlow(ctx, x, 1.2, z, 2.4, 0xff7a20, 0.8);
    ctx.marks.cellGate = D.barrier5(ctx, -14.5, -6, 4, 'z', 'ribs', { open: true });

    // ------------------------------------------------ the Founder's cell
    P.cell(ctx, -23, -6);
    P.mould(ctx, -27.4, -10.6, 0.6, { hot: false });

    // ------------------------------------------------ the bronze river: a channel across the hall, two iron bridges
    P.channel(ctx, -12, -39.4, 18, -36.6, { bridges: [[1.2, 4.8], [10, 13]] });
    P.furnace(ctx, -9.6, -28.4, Math.PI); P.furnace(ctx, 15.6, -28.4, Math.PI);
    P.crucible(ctx, -6, -47.6); P.crucible(ctx, 12, -47.6);
    P.slag(ctx, 15.6, -44, 0.9); P.slag(ctx, -9.6, -44, 0.8);
    ctx.marks.riverGate = D.barrier5(ctx, 3, -22, 4, 'x', 'ribs');

    // ------------------------------------------------ the gallery of hammers
    for (const z of [-60, -66, -72]) P.bigHammer(ctx, 3, z, 4.6);
    P.anvil(ctx, -0.6, -62, 0.8); P.anvil(ctx, 6.6, -70, -0.8);
    ctx.marks.hammerGate = D.barrier5(ctx, 3, -53, 4, 'x', 'ribs');
    ctx.marks.waxGate = D.barrier5(ctx, 11, -67, 4, 'z', 'ribs', { open: true });

    // ------------------------------------------------ the room of wax patterns
    for (const [x, z, s] of [[17, -62, 0.8], [23.4, -62, 0.9], [17, -71.4, 1.0], [21.4, -67, 0.7]]) P.waxBell(ctx, x, z, s);

    // ------------------------------------------------ the Cradle
    P.cradle(ctx, 3, -114, 4.2);
    P.channel(ctx, -16, -103.4, -6, -100.6); P.channel(ctx, 12, -103.4, 22, -100.6);
    for (const [x, z] of [[-13, -89], [19, -89]]) P.furnace(ctx, x, z, Math.PI);
    for (const [x, z] of [[-12, -112], [18, -112], [-12, -96], [18, -96]]) P.mould(ctx, x, z, 1.1);
    for (const z of [-92, -106]) P.bigHammer(ctx, 3, z, 6.2);
    P.anvil(ctx, 3, -92.6, 0);
    K.fallenBody(ctx, 10, -90, 0.9, 0x1a0c06); K.droppedSword(ctx, 10.8, -89.4, 2.2);
    ctx.marks.lastGate = D.barrier5(ctx, 3, -81, 4, 'x', 'ribs');
    ctx.marks.cradleGate = D.barrier5(ctx, 3, -84, 4, 'x', 'ribs', { open: true });
    ctx.marks.exitGate = D.barrier5(ctx, 4, -123.6, 4, 'x', 'ribs');
  },
};
