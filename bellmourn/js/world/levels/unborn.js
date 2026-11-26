// Act V, region II — The Sea of Unborn Days. (PROPOSAL: names and texts in this file are proposals for the author.)
// Every dawn the Great Bell took drifts here as an island of light over a dark sea, each with its own sun stuck at
// the horizon. The wardens cross them on bridges of light: the first dawn, a spring morning in blossom, a breakfast
// laid for people who never woke, a harvest dawn in the wheat, the bridge of hours where a sundial's shadow never
// moves, a field of windows thrown open on nothing, a winter dawn in frost, and at the last the dawn that was never
// born: a red sun, enormous, half risen, and a cradle rocking on its own.
import * as P from '../props/unborn.js';
import * as D from '../props/dream.js';
import { slab, voidFill, deepFloor, W4 } from '../kit4.js';

const NIGHT = P.NIGHT;
const ROOMS = [
  [-4, 8, 10, 18],         // the first dawn
  [-12, -16, 16, 2],       // the isle of a spring morning (first fight)
  [-29, -12, -17, 0],      // the lost breakfast (a side fight)
  [-10, -46, 18, -24],     // the isle of the harvest dawn
  [-2, -72, 8, -52],       // the bridge of hours
  [14, -68, 26, -56],      // the field of windows (a side fight)
  [-12, -102, 18, -80],    // the isle of the winter dawn
  [-14, -140, 22, -108],   // the dawn that was never born (the last fight)
];
const WAYS = [[1.4, 2, 4.6, 8], [-17, -8, -12, -4], [1.4, -24, 4.6, -16], [1.4, -52, 4.6, -46], [8, -64, 14, -60], [1.4, -80, 4.6, -72], [1.4, -108, 4.6, -102], [2.4, -146, 5.6, -140]];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-33, -150, 30, 22];

export default {
  id: 'unborn', name: 'The Sea of Unborn Days', tagline: 'EVERY DAWN THE BELL EVER STOLE, ADRIFT AS ISLANDS OF LIGHT.', tier: 20.5, act: 5,
  start: { x: 3, z: 16, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['dawnGate', 'breakfastGate', 'windowGate'],
  ambience: {
    fog: 0x1a1020, fogNear: 60, fogFar: 150, background: NIGHT, moon: 1.4, moonColor: 0xffd8c0, moonDir: [0.2, 1, -0.7], hemi: 1.3, hemiSky: 0xf0c8c0, hemiGround: 0x0c0610,
    fill: 1.25, fillColor: 0xffd0b0, ambient: 0x201420, ambientI: 0.9, rain: 0, drizzle: 0, lightning: false, weather: 'feathers',
    grade: { gain: [1.06, 0.98, 0.96], lift: [0.026, 0.016, 0.02], sat: 0.9, vignette: 0.45, bloom: 0.5 },
    beams: [],
  },
  lamps: [{ id: 'dawn', x: -2.4, z: 12, sx: 1.3, sz: 0.3 }, { id: 'windows', x: 24.4, z: -62, sx: -1.3, sz: 0 }],
  items: [
    { id: 'c1', x: -27, z: -2, ry: Math.PI / 2, kind: 'embers', amount: 720 },
    { id: 'c2', x: 24.6, z: -66.4, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: 6.4, z: -69, ry: -Math.PI / 2, kind: 'embers', amount: 540 },
  ],
  hints: [
    { zone: [-4, 12, 10, 18], text: 'THESE ARE THE DAWNS YOU NEVER HAD.' },
    { zone: [1.4, -20, 4.6, -16], text: 'A SPRING THAT NEVER CAME. THE BLOSSOM NEVER FELL.' },
    { zone: [-17, -8, -15, -4], text: 'BREAKFAST, LAID FOR SOMEONE WHO NEVER WOKE.' },
    { zone: [1.4, -52, 4.6, -48], text: 'THE SHADOW ON THE DIAL HAS NOT MOVED IN A THOUSAND YEARS.' },
    { zone: [1.4, -108, 4.6, -104], text: 'THE LAST DAWN. IT WAS NEVER BORN.' },
  ],
  foes: [{ t: 'dawnling', x: 3, z: -1 }, { t: 'thought', x: 3, z: -49 }, { t: 'dawnling', x: 3, z: -76 }],
  encounters: [
    { id: 'spring', zone: [-11.4, -15.4, 15.4, 1.4], gates: ['dawnGate', 'breakfastGate'], opens: ['harvestGate', 'breakfastGate'], msg: 'THE BLOSSOM STIRS. THE SPRING REMEMBERS YOU.', done: 'THE PETALS HANG STILL',
      waves: [
        { pre: true, foes: [{ t: 'dawnling', x: -6, z: -10 }, { t: 'dawnling', x: 11, z: -10 }, { t: 'thought', x: 3, z: -13 }, { t: 'homunculus', x: 0, z: -4 }] },
        { foes: [{ t: 'memoryknight', x: 3, z: -12 }, { t: 'thought', x: -8, z: -2 }, { t: 'thought', x: 11, z: -4 }, { t: 'nightmare', x: 8, z: -6 }] },
      ] },
    { id: 'breakfast', zone: [-28.4, -11.4, -17.6, -0.6], gates: ['breakfastGate'], opens: ['breakfastGate'], msg: 'THE CHAIRS SCRAPE BACK', done: 'THE TABLE IS LAID AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'sleepwalker', x: -23, z: -9.6 }, { t: 'homunculus', x: -27, z: -10 }] },
        { foes: [{ t: 'nightmare', x: -20, z: -2 }, { t: 'dawnling', x: -26, z: -2 }, { t: 'homunculus', x: -20, z: -8 }] },
      ] },
    { id: 'harvest', zone: [-9.4, -45.4, 17.4, -24.6], gates: ['harvestGate'], opens: ['hoursGate', 'harvestGate'], msg: 'SOMETHING MOVES IN THE WHEAT', done: 'THE WHEAT IS STILL',
      waves: [
        { pre: true, foes: [{ t: 'nightmare', x: -3, z: -34 }, { t: 'nightmare', x: 12, z: -30 }, { t: 'homunculus', x: 3, z: -40 }, { t: 'homunculus', x: 8, z: -42 }, { t: 'dawnling', x: -6, z: -42 }] },
        { foes: [{ t: 'sleepwalker', x: 3, z: -34 }, { t: 'thought', x: -7, z: -26 }, { t: 'thought', x: 14, z: -26 }, { t: 'memoryknight', x: 3, z: -44 }] },
        { foes: [{ t: 'nightmare', x: 0, z: -26 }, { t: 'nightmare', x: 8, z: -26 }, { t: 'dawnling', x: 14, z: -42 }, { t: 'homunculus', x: -6, z: -34 }, { t: 'homunculus', x: 13, z: -34 }] },
      ] },
    { id: 'hours', zone: [-1.4, -71.4, 7.4, -52.6], gates: ['hoursGate', 'windowGate'], opens: ['winterGate', 'windowGate'], msg: 'THE SHADOW ON THE DIAL TURNS AT LAST, AND SOMETHING COMES WITH IT', done: 'THE SHADOW STOPS AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: 1, z: -60 }, { t: 'memoryknight', x: 6, z: -66 }, { t: 'thought', x: 3, z: -70 }] },
        { foes: [{ t: 'nightmare', x: 1, z: -68 }, { t: 'nightmare', x: 6, z: -59 }, { t: 'dawnling', x: 3, z: -54 }, { t: 'homunculus', x: 3, z: -64 }] },
      ] },
    { id: 'windows', zone: [14.6, -67.4, 25.4, -56.6], gates: ['windowGate'], opens: ['windowGate'], msg: 'THE WINDOWS SLAM, ONE BY ONE', done: 'THE WINDOWS STAND OPEN AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'thought', x: 21, z: -63 }, { t: 'thought', x: 18.5, z: -61 }, { t: 'dawnling', x: 23, z: -58 }] },
        { foes: [{ t: 'memoryknight', x: 21, z: -62 }, { t: 'nightmare', x: 23, z: -66 }, { t: 'homunculus', x: 16, z: -66 }] },
      ] },
    { id: 'winter', zone: [-11.4, -101.4, 17.4, -80.6], gates: ['winterGate'], opens: ['lastGate', 'winterGate'], msg: 'THE FROST CRACKS. THE WINTER DAWN WAKES.', done: 'THE FROST SETTLES',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: -6, z: -86 }, { t: 'memoryknight', x: 12, z: -86 }, { t: 'sleepwalker', x: 3, z: -96 }, { t: 'thought', x: -8, z: -98 }] },
        { foes: [{ t: 'nightmare', x: -4, z: -92 }, { t: 'nightmare', x: 10, z: -92 }, { t: 'dawnling', x: 3, z: -84 }, { t: 'dawnling', x: 14, z: -98 }, { t: 'homunculus', x: -8, z: -84 }] },
      ] },
    { id: 'last', zone: [-13.4, -139.4, 21.4, -108.6], gates: ['lastGate'], opens: ['exitGate'], msg: 'THE RED SUN TRIES TO RISE. EVERYTHING IN THE DREAM COMES TO STOP IT.', done: 'THE RED SUN SINKS BACK',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: -8, z: -114 }, { t: 'memoryknight', x: 16, z: -114 }, { t: 'sleepwalker', x: 4, z: -119 }, { t: 'dawnling', x: -10, z: -132 }, { t: 'dawnling', x: 18, z: -132 }] },
        { foes: [{ t: 'nightmare', x: -6, z: -120 }, { t: 'nightmare', x: 14, z: -120 }, { t: 'thought', x: 4, z: -136 }, { t: 'thought', x: -7, z: -114 }, { t: 'thought', x: 15, z: -114 }, { t: 'homunculus', x: 4, z: -112 }] },
        { foes: [{ t: 'sleepwalker', x: -6, z: -130 }, { t: 'sleepwalker', x: 14, z: -130 }, { t: 'memoryknight', x: 4, z: -116 }, { t: 'dawnling', x: 4, z: -136 }, { t: 'nightmare', x: 8, z: -126 }] },
      ] },
  ],
  minibosses: [{ from: 'act3', x: 3, z: -35 }, { from: 'act2', x: 3, z: -91 }],
  exit: { zone: [2.6, -145.6, 5.4, -144] },
  build(K, ctx) {
    deepFloor(ctx, BOUNDS, 0x06040a, { y: -18 });
    const isles = { 0: W4.marble('#e0d0d0'), 1: W4.marble('#f0d8e0'), 2: W4.marble('#e8dccc'), 3: W4.marble('#e8d8a8'), 4: W4.marble('#d8ccb8'), 5: W4.marble('#e0d4c4'), 6: W4.marble('#dce8f0'), 7: W4.marble('#c8a8a0') };
    ROOMS.forEach((r, i) => slab(ctx, ...r, isles[i], NIGHT, { kerb: W4.gold('#c8a060'), depth: 7, rockTone: '#4a3a40' }));
    for (const r of WAYS) P.lightBridge(ctx, ...r);
    voidFill(ctx, BOUNDS, WALKS);
    D.motes(ctx, [[-31, -148, 28, 20]], 200, { color: 0xffe0c0, rise: 0.3, h: 9 });

    // ------------------------------------------------ the first dawn: a pale pink sun, clouds lying on the floor
    P.stuckSun(ctx, 3, 30, 7, 0xffb0b8, { light: 3 });
    P.cloudBank(ctx, -4, 8, 10, 18, 0xffe0e8, 10);
    P.cradle(ctx, 7.4, 15.4, 0.4); P.vane(ctx, -2.4, 15.6);
    K.fallenBody(ctx, 5.4, 10, 1.2, 0x2a1a20); K.droppedSword(ctx, 6.2, 10.6, 2.4);
    ctx.marks.dawnGate = D.barrier5(ctx, 3, 4.4, 4, 'x', 'ribs', { open: true });

    // ------------------------------------------------ the isle of a spring morning: blossom, a pink-gold sun
    P.stuckSun(ctx, 32, -8, 8, 0xffc0c8, { face: -Math.PI / 2 });
    for (const [x, z, s] of [[-9, -2, 1.1], [13, -2, 1.2], [-9, -13, 1], [13, -13, 1.1], [-3, -9, 0.8], [9, -6, 0.9]]) P.blossomTree(ctx, x, z, s);
    P.cloudBank(ctx, -12, -16, 16, 2, 0xffe8f0, 14);
    P.openWindow(ctx, 10, -14.4, -0.3);
    D.motes(ctx, [[-11, -15, 15, 1]], 80, { color: 0xffc8e0, rise: -0.15, h: 5, k: 1.4 });
    ctx.marks.breakfastGate = D.barrier5(ctx, -14.5, -6, 4, 'z', 'ribs', { open: true });

    // ------------------------------------------------ the lost breakfast
    P.breakfast(ctx, -23, -6, 0.2);
    P.openWindow(ctx, -27.4, -6, Math.PI / 2); P.blossomTree(ctx, -19, -10.4, 0.9);
    P.cloudBank(ctx, -29, -12, -17, 0, 0xffeee0, 8);

    // ------------------------------------------------ the isle of the harvest dawn: wheat, a golden sun
    P.stuckSun(ctx, -26, -35, 9, 0xffc860, { face: Math.PI / 2 });
    P.wheat(ctx, -9, -45, -1, -25, 70); P.wheat(ctx, 7, -45, 17, -25, 70);
    P.haystack(ctx, -6, -30); P.haystack(ctx, 14, -40); P.vane(ctx, 14, -27);
    P.cloudBank(ctx, -10, -46, 18, -24, 0xfff0d0, 12);
    ctx.marks.harvestGate = D.barrier5(ctx, 3, -20, 4, 'x', 'ribs');

    // ------------------------------------------------ the bridge of hours: a sundial whose shadow never moves
    P.sundial(ctx, 3, -62, 2.6);
    P.cloudBank(ctx, -2, -72, 8, -52, 0xffe8d8, 6);
    ctx.marks.hoursGate = D.barrier5(ctx, 3, -49, 4, 'x', 'ribs');
    ctx.marks.windowGate = D.barrier5(ctx, 11, -62, 4, 'z', 'ribs', { open: true });

    // ------------------------------------------------ the field of windows
    for (const [x, z, r, y] of [[17, -58, 0.3, 0], [23, -59, -0.4, 0], [20, -66, 0.1, 0], [16, -63, 1.2, 2.4], [24.5, -65, -1.0, 3.0]]) P.openWindow(ctx, x, z, r, y);
    P.cloudBank(ctx, 14, -68, 26, -56, 0xfff4e0, 8);

    // ------------------------------------------------ the isle of the winter dawn: frost, a pale blue sun
    P.stuckSun(ctx, 32, -91, 8, 0xc8e0ff, { face: -Math.PI / 2 });
    for (const [x, z] of [[-9, -84, 0], [15, -84, 0], [-9, -98, 0], [15, -98, 0], [-3, -92, 0], [10, -94, 0]]) P.frostTree(ctx, x, z);
    P.cloudBank(ctx, -12, -102, 18, -80, 0xe8f4ff, 14);
    D.motes(ctx, [[-11, -101, 17, -81]], 90, { color: 0xe8f4ff, rise: -0.25, h: 6, k: 1.3 });
    ctx.marks.winterGate = D.barrier5(ctx, 3, -76, 4, 'x', 'ribs');

    // ------------------------------------------------ the dawn that was never born: an enormous red sun
    P.stuckSun(ctx, 4, -160, 16, 0xff4a30, { light: 6, y: -6 });
    P.cradle(ctx, 4, -124, 0);
    for (const [x, z] of [[-10, -112], [18, -112], [-10, -136], [18, -136]]) P.openWindow(ctx, x, z, Math.atan2(4 - x, -124 - z), 0);
    P.cloudBank(ctx, -14, -140, 22, -108, 0xffc8b8, 16);
    D.vein(ctx, [4, -108], [4, -140], 0xff5030, { w: 0.2, k: 1.8 });
    K.fallenBody(ctx, 12, -112, 0.9, 0x2a1a20); K.droppedSword(ctx, 12.8, -111.4, 2.2);
    ctx.marks.lastGate = D.barrier5(ctx, 3, -105, 4, 'x', 'ribs');
    ctx.marks.exitGate = D.barrier5(ctx, 4, -141.6, 4, 'x', 'ribs');
  },
};
