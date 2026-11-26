// Act V, region III — The Waking City. (PROPOSAL: names and texts in this file are proposals for the author.)
// Bellmourn as the god dreams it: the same streets, but wrong. The wardens come in by a Gallows Gate that leans,
// walk Lantern Row with its houses heaving and more houses hanging upside down over it, look into a Hushed home
// where the family still sits at a table that is not there, cross the market that never closes round a fountain
// falling upward, climb a stair under tumbling houses, pass a belfry whose bell hangs up from the floor, stand in a
// square where every clock runs backward, and come to the last street, which curls up into the sky and ends.
import * as P from '../props/wake.js';
import * as D from '../props/dream.js';
import * as K2 from '../kit.js';
import { slab, voidFill, deepFloor, W4 } from '../kit4.js';

const SKY = P.DREAMSKY;
const ROOMS = [
  [-4, 8, 10, 18],         // the gate that leans
  [-12, -18, 16, 2],       // Lantern Row, heaving (first fight)
  [-30, -14, -18, -2],     // a Hushed home (a side fight)
  [-12, -50, 18, -26],     // the market that never closes
  [-2, -78, 8, -56],       // the stair of falling houses
  [14, -74, 26, -60],      // the upside-down belfry (a side fight)
  [-12, -108, 18, -86],    // the square of clocks
  [-14, -146, 22, -114],   // the last street (the last fight)
];
const WAYS = [[1.4, 2, 4.6, 8], [-18, -10, -12, -6], [1.4, -26, 4.6, -18], [1.4, -56, 4.6, -50], [8, -69, 14, -65], [1.4, -86, 4.6, -78], [1.4, -114, 4.6, -108], [2.4, -152, 5.6, -146]];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-34, -156, 30, 22];

export default {
  id: 'wake', name: 'The Waking City', tagline: 'BELLMOURN AS HE DREAMS IT: WRONG, TILTED, UPSIDE DOWN.', tier: 21.5, act: 5,
  start: { x: 3, z: 16, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['wakeGate', 'homeGate', 'belfryGate'],
  ambience: {
    fog: 0x160c24, fogNear: 54, fogFar: 132, background: SKY, moon: 1.4, moonColor: 0xb8a0ff, moonDir: [-0.4, 1, -0.4], hemi: 1.3, hemiSky: 0xa088e0, hemiGround: 0x0a0612,
    fill: 1.2, fillColor: 0x98c8b8, ambient: 0x1a1428, ambientI: 0.9, rain: 0.25, drizzle: 0.3, lightning: false, weather: 'dust',
    grade: { gain: [0.98, 0.94, 1.08], lift: [0.016, 0.006, 0.03], sat: 0.85, vignette: 0.55, bloom: 0.4 },
    beams: [],
  },
  lamps: [{ id: 'gate', x: -2.4, z: 12, sx: 1.3, sz: 0.3 }, { id: 'belfry', x: 24.4, z: -67, sx: -1.3, sz: 0 }],
  items: [
    { id: 'c1', x: -28, z: -4, ry: Math.PI / 2, kind: 'embers', amount: 760 },
    { id: 'c2', x: 24.6, z: -72.4, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: 6.4, z: -75, ry: -Math.PI / 2, kind: 'embers', amount: 560 },
  ],
  hints: [
    { zone: [-4, 12, 10, 18], text: 'THIS IS BELLMOURN. IT IS NOT BELLMOURN.' },
    { zone: [1.4, -22, 4.6, -18], text: 'THE HOUSES HANG FROM THE SKY. THEIR LAMPS ARE LIT.' },
    { zone: [-18, -10, -15, -6], text: 'THEY STILL SIT AT THE TABLE. AS HE REMEMBERS THEM.' },
    { zone: [1.4, -56, 4.6, -52], text: 'THE FOUNTAIN FALLS UP. DO NOT FOLLOW IT.' },
    { zone: [1.4, -114, 4.6, -110], text: 'THE LAST STREET. IT GOES UP INTO NOTHING.' },
  ],
  foes: [{ t: 'sleepwalker', x: 3, z: -4 }, { t: 'thought', x: 3, z: -53 }, { t: 'nightmare', x: 3, z: -82 }],
  encounters: [
    { id: 'row', zone: [-11.4, -17.4, 15.4, 1.4], gates: ['wakeGate', 'homeGate'], opens: ['marketGate', 'homeGate'], msg: 'THE HUSHED OF HIS DREAM WAKE', done: 'THE STREET SETTLES',
      waves: [
        { pre: true, foes: [{ t: 'sleepwalker', x: 3, z: -10 }, { t: 'homunculus', x: -6, z: -6 }, { t: 'homunculus', x: 11, z: -6 }, { t: 'thought', x: 3, z: -16 }] },
        { foes: [{ t: 'memoryknight', x: -5, z: -14 }, { t: 'memoryknight', x: 11, z: -14 }, { t: 'nightmare', x: 3, z: -3 }, { t: 'nightmare', x: 8, z: -9 }] },
      ] },
    { id: 'home', zone: [-29.4, -13.4, -18.6, -2.6], gates: ['homeGate'], opens: ['homeGate'], msg: 'THE FAMILY TURNS TO LOOK AT YOU', done: 'THEY TURN BACK TO THE TABLE',
      waves: [
        { pre: true, foes: [{ t: 'nightmare', x: -24, z: -11 }, { t: 'memoryknight', x: -21, z: -4 }] },
        { foes: [{ t: 'sleepwalker', x: -26, z: -8 }, { t: 'thought', x: -20, z: -11 }, { t: 'homunculus', x: -27, z: -4 }] },
      ] },
    { id: 'market', zone: [-11.4, -49.4, 17.4, -26.6], gates: ['marketGate'], opens: ['stairGate', 'marketGate'], msg: 'THE MARKET OPENS. IT HAS NEVER CLOSED.', done: 'THE STALLS FALL QUIET',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: -6, z: -32 }, { t: 'memoryknight', x: 13, z: -32 }, { t: 'homunculus', x: -4, z: -44 }, { t: 'homunculus', x: 10, z: -44 }, { t: 'dawnling', x: 3, z: -47 }] },
        { foes: [{ t: 'sleepwalker', x: -6, z: -42 }, { t: 'nightmare', x: 13, z: -42 }, { t: 'thought', x: -8, z: -28 }, { t: 'thought', x: 15, z: -28 }] },
        { foes: [{ t: 'memoryknight', x: 3, z: -46 }, { t: 'nightmare', x: -4, z: -30 }, { t: 'nightmare', x: 10, z: -30 }, { t: 'homunculus', x: -5, z: -36 }, { t: 'homunculus', x: 11, z: -36 }] },
      ] },
    { id: 'stair', zone: [-1.4, -77.4, 7.4, -56.6], gates: ['stairGate', 'belfryGate'], opens: ['clockGate', 'belfryGate'], msg: 'A HOUSE FALLS OUT OF THE SKY. SOMETHING CLIMBS OUT OF IT.', done: 'THE HOUSES HANG STILL',
      waves: [
        { pre: true, foes: [{ t: 'nightmare', x: 1, z: -62 }, { t: 'nightmare', x: 6, z: -70 }, { t: 'thought', x: 3, z: -74 }] },
        { foes: [{ t: 'memoryknight', x: 3, z: -72 }, { t: 'homunculus', x: 0, z: -64 }, { t: 'homunculus', x: 6, z: -64 }, { t: 'dawnling', x: 3, z: -59 }] },
      ] },
    { id: 'belfry', zone: [14.6, -73.4, 25.4, -60.6], gates: ['belfryGate'], opens: ['belfryGate'], msg: 'THE BELL TOLLS UPWARD', done: 'THE BELL HANGS SILENT',
      waves: [
        { pre: true, foes: [{ t: 'thought', x: 17, z: -62 }, { t: 'thought', x: 24, z: -62 }, { t: 'memoryknight', x: 20, z: -71 }] },
        { foes: [{ t: 'sleepwalker', x: 21, z: -71 }, { t: 'nightmare', x: 16, z: -71 }] },
      ] },
    { id: 'clocks', zone: [-11.4, -107.4, 17.4, -86.6], gates: ['clockGate'], opens: ['lastGate', 'clockGate'], msg: 'EVERY CLOCK STRIKES A DIFFERENT HOUR', done: 'THE HANDS RUN BACKWARD AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: -6, z: -92 }, { t: 'memoryknight', x: 12, z: -92 }, { t: 'sleepwalker', x: 3, z: -102 }, { t: 'thought', x: -5, z: -102 }, { t: 'thought', x: 11, z: -102 }] },
        { foes: [{ t: 'nightmare', x: -4, z: -98 }, { t: 'nightmare', x: 10, z: -98 }, { t: 'dawnling', x: 3, z: -90 }, { t: 'homunculus', x: -5, z: -92 }, { t: 'homunculus', x: 11, z: -92 }] },
      ] },
    { id: 'last', zone: [-13.4, -145.4, 21.4, -114.6], gates: ['lastGate'], opens: ['exitGate'], msg: 'THE CITY KNOWS YOU ARE NOT A DREAM', done: 'THE STREET IS EMPTY. IT GOES UP.',
      waves: [
        { pre: true, foes: [{ t: 'sleepwalker', x: -6, z: -122 }, { t: 'sleepwalker', x: 14, z: -122 }, { t: 'memoryknight', x: 4, z: -138 }, { t: 'thought', x: -10, z: -136 }, { t: 'thought', x: 18, z: -136 }] },
        { foes: [{ t: 'nightmare', x: -6, z: -130 }, { t: 'nightmare', x: 14, z: -130 }, { t: 'memoryknight', x: -8, z: -118 }, { t: 'memoryknight', x: 13, z: -120 }, { t: 'dawnling', x: 4, z: -142 }, { t: 'homunculus', x: 4, z: -120 }] },
        { foes: [{ t: 'sleepwalker', x: 4, z: -132 }, { t: 'nightmare', x: -10, z: -140 }, { t: 'nightmare', x: 18, z: -140 }, { t: 'dawnling', x: -10, z: -120 }, { t: 'dawnling', x: 18, z: -120 }, { t: 'homunculus', x: 4, z: -126 }] },
      ] },
  ],
  minibosses: [{ from: 'act2', x: 3, z: -38 }, { from: 'act3', x: 3, z: -97 }, { from: 'act1', x: 4, z: -128 }],
  exit: { zone: [2.6, -151.6, 5.4, -150] },
  build(K, ctx) {
    deepFloor(ctx, BOUNDS, 0x06040c, { y: -18 });
    const cob = (t) => K2.M ? K2.M.cobble(t) : W4.drown(t);
    ROOMS.forEach((r) => slab(ctx, ...r, W4.drown('#4a4258'), SKY, { kerb: W4.verd('#5a4a7a'), depth: 6, rockTone: '#2a2238' }));
    for (const r of WAYS) slab(ctx, ...r, W4.drown('#3a3448'), SKY, { kerb: false, depth: 2 });
    for (const r of ROOMS) K.floor(ctx, r[0] + 0.3, r[1] + 0.3, r[2] - 0.3, r[3] - 0.3, cob('#5a5268'), 0.01, 0.05);
    voidFill(ctx, BOUNDS, WALKS);
    D.motes(ctx, [[-32, -154, 28, 20]], 160, { color: 0xc8b0ff, rise: 0.25, h: 10 });
    // houses hanging upside down over the whole city
    for (const [x, y, z, w, d, h] of [[-14, 11, 6, 3, 3, 3.6], [18, 12, -4, 4, 3, 3.2], [-18, 13, -30, 3.4, 3.4, 4], [22, 11, -40, 3, 4, 3.4], [-16, 12, -70, 4, 3, 3.6], [22, 14, -96, 3, 3, 4.2], [-18, 12, -100, 3.6, 3, 3.2], [-18, 13, -132, 4, 4, 4], [24, 12, -128, 3, 3.4, 3.6], [3, 15, -60, 3, 3, 3.4], [3, 16, -130, 4, 4, 4.4]]) P.skyHouse(ctx, x, y, z, w, d, h);

    // ------------------------------------------------ the gate that leans
    K.gallows(ctx, -1.4, 13.6);
    P.leanHouse(ctx, 8.4, 15.6, 2.6, 2.4, 3.6, 0.18);
    P.upLamp(ctx, 7.6, 10.4);
    K.fallenBody(ctx, 5.4, 10, 1.2, 0x140c1e); K.droppedSword(ctx, 6.2, 10.6, 2.4);
    ctx.marks.wakeGate = D.barrier5(ctx, 3, 4.4, 4, 'x', 'bars', { open: true });

    // ------------------------------------------------ Lantern Row, heaving: houses down both sides, leaning
    for (const [z, l] of [[-1.5, 0.15], [-7, -0.12], [-13, 0.18]]) { if (z !== -7) P.leanHouse(ctx, -10, z, 3, 4, 3.8, l, { front: 0 }); P.leanHouse(ctx, 14, z, 3, 4, 4.2, -l, { front: 0 }); } // the west gap: the way to the Hushed home
    for (const [x, z] of [[-7, -4], [11, -10], [-7, -16], [11, -1]]) P.upLamp(ctx, x, z);
    P.hushedSeated(ctx, 3, -1.4, Math.PI);
    ctx.marks.homeGate = D.barrier5(ctx, -15, -8, 4, 'z', 'bars', { open: true });

    // ------------------------------------------------ a Hushed home: the family still at a table that is not there
    for (const [x, z, r] of [[-25, -9, 0], [-23, -6.6, Math.PI / 2], [-27, -6.6, -Math.PI / 2], [-25, -4.6, Math.PI]]) P.hushedSeated(ctx, x, z, r);
    P.leanHouse(ctx, -27.4, -12.2, 4, 2, 3, 0.08, { front: 1 });
    P.upLamp(ctx, -20, -12);

    // ------------------------------------------------ the market that never closes: stalls round the fountain
    P.upFountain(ctx, 3, -38);
    for (const [x, z, r] of [[-7, -30, 0.4], [13, -30, -0.4], [-7, -46, Math.PI - 0.4], [13, -46, Math.PI + 0.4], [-9, -38, Math.PI / 2], [15, -38, -Math.PI / 2]]) P.dreamStall(ctx, x, z, r);
    for (const [x, z] of [[-10, -27.5], [16, -27.5], [-10, -48.5], [16, -48.5]]) P.upLamp(ctx, x, z);
    ctx.marks.marketGate = D.barrier5(ctx, 3, -22, 4, 'x', 'bars');

    // ------------------------------------------------ the stair of falling houses: houses tumbling overhead
    for (const [x, y, z] of [[3, 7, -62], [3, 9, -70], [-6, 8, -66], [12, 9, -74]]) P.skyHouse(ctx, x, y, z, 2.6, 2.6, 3);
    P.upLamp(ctx, -1.4, -60); P.upLamp(ctx, 7.4, -74);
    ctx.marks.stairGate = D.barrier5(ctx, 3, -53, 4, 'x', 'bars');
    ctx.marks.belfryGate = D.barrier5(ctx, 11, -67, 4, 'z', 'bars', { open: true });

    // ------------------------------------------------ the upside-down belfry
    P.upBell(ctx, 20, -67, 1.8);
    P.leanHouse(ctx, 24.4, -72.6, 2.4, 2, 3.2, -0.14, { front: 1 });

    // ------------------------------------------------ the square of clocks
    for (const [x, z, h] of [[-9, -89, 6], [15, -89, 7], [-9, -105, 7.5], [15, -105, 6.4]]) P.wrongClock(ctx, x, z, h);
    P.wrongClock(ctx, 3, -97, 8.4);
    for (const [x, z] of [[-4, -92], [10, -102]]) P.upLamp(ctx, x, z);
    ctx.marks.clockGate = D.barrier5(ctx, 3, -82, 4, 'x', 'bars');

    // ------------------------------------------------ the last street: it curls up into the sky and ends
    for (const [z, l] of [[-118, 0.2], [-126, -0.16], [-134, 0.22], [-142, -0.12]]) { P.leanHouse(ctx, -12, z, 3, 5, 4, l, { front: 0 }); P.leanHouse(ctx, 20, z, 3, 5, 4.4, -l, { front: 0 }); }
    for (const [x, z] of [[-8, -122], [16, -130], [-8, -138], [16, -118]]) P.upLamp(ctx, x, z);
    P.curlingStreet(ctx, 4, -162, 16);
    K.fallenBody(ctx, 12, -116, 0.9, 0x140c1e); K.droppedSword(ctx, 12.8, -115.4, 2.2);
    ctx.marks.lastGate = D.barrier5(ctx, 3, -111, 4, 'x', 'bars');
    ctx.marks.exitGate = D.barrier5(ctx, 4, -147.6, 4, 'x', 'bars');
  },
};
