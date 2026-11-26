// Act IV, region IV — The Broken Halo. (PROPOSAL: names and texts in this file are proposals for the author.)
// Heaven's golden ring broke when the Wheel fell and came down over the bronze sea. The wardens cross its pieces:
// the shore where it struck, the field of fallen spokes, a chapel that was built into the ring, the long arc of
// the ring itself with its inscription still burning, a causeway between bell-buoys tolling on the swell, the
// rest where the angels laid down their swords, and at last the gate of the halo: under its last whole arc,
// hanging in the air and turning, the Last Seraph keeps the way into God's dream.
import * as P from '../props/halo.js';
import * as CH from '../props/choir.js';
import { slab, span, voidFill, barrier4, motes, W4 } from '../kit4.js';
import { VARIANTS } from '../../game/variants4.js';

const SEA = P.SEA;
const ROOMS = [
  [-4, 8, 10, 18],         // the shore where the ring struck
  [-10, -16, 16, 2],       // the field of fallen spokes (first fight)
  [-28, -12, -16, 0],      // the chapel in the ring (a side fight)
  [-14, -38, 20, -22],     // the arc of the ring
  [-3, -66, 11, -42],      // the causeway of the bell-buoys
  [17, -62, 28, -48],      // where the angels rest (a side fight)
  [-16, -108, 24, -72],    // the gate of the halo (the Last Seraph)
];
const WAYS = [[1.4, 2, 4.6, 8], [-16, -8, -10, -4], [1.4, -22, 4.6, -16], [1.4, -42, 4.6, -38], [11, -57, 17, -53], [1.4, -72, 4.6, -66], [2.4, -114, 5.6, -108]];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-32, -118, 34, 22];

export default {
  variants: VARIANTS.halo,
  id: 'halo', name: 'The Broken Halo', tagline: 'HEAVEN\'S RING LIES BROKEN ON THE BRONZE SEA. SHE KEEPS ITS GATE.', tier: 18.5, act: 4,
  start: { x: 3, z: 16, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['shoreGate', 'chapelGate', 'restGate', 'haloGate'],
  ambience: {
    fog: 0x1c1208, fogNear: 60, fogFar: 140, background: 0x140c04, moon: 1.5, moonColor: 0xffe8c0, moonDir: [0.4, 1, -0.5], hemi: 1.15, hemiSky: 0xe8d0a0, hemiGround: 0x140c04,
    fill: 1.1, fillColor: 0xd8b880, ambient: 0x1c140a, ambientI: 0.8, rain: 0, drizzle: 0, lightning: false, weather: 'feathers',
    grade: { gain: [1.02, 0.98, 0.9], lift: [0.012, 0.008, 0.0], sat: 0.9, vignette: 0.48, bloom: 0.42 },
    beams: [],
  },
  lamps: [{ id: 'shore', x: 7, z: 15, sx: -1.3, sz: 0.3 }, { id: 'rest', x: 26, z: -55, sx: -1.3, sz: 0 }],
  items: [
    { id: 'c1', x: -26, z: -2, ry: Math.PI / 2, kind: 'embers', amount: 640 },
    { id: 'c2', x: 26.4, z: -60, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: 9.4, z: -46, ry: -Math.PI / 2, kind: 'embers', amount: 460 },
  ],
  hints: [
    { zone: [-4, 12, 10, 18], text: 'HEAVEN\'S HALO. IT FELL WHEN THE WHEEL BROKE.' },
    { zone: [1.4, -20, 4.6, -16], text: 'THE WORDS ON THE RING STILL BURN. NO ONE CAN READ THEM.' },
    { zone: [-16, -8, -13, -4], text: 'A CHAPEL WAS BUILT INTO THE RING. ITS CANDLES NEVER WENT OUT.' },
    { zone: [1.4, -42, 4.6, -39], text: 'THE BUOYS ARE BELLS. THEY TOLL FOR SOMEONE.' },
    { zone: [1.4, -72, 4.6, -68], text: 'THE LAST ANGEL WAITS AT THE GATE. BEYOND HER: HIS DREAM.' },
  ],
  foes: [{ t: 'drownedangel', x: 3, z: -1 }, { t: 'belljelly', x: 3, z: -40 }, { t: 'glasshound', x: 3, z: -69 }],
  encounters: [
    { id: 'spoke', zone: [-9.4, -15.4, 15.4, 1.4], gates: ['shoreGate', 'chapelGate'], opens: ['arcGate', 'chapelGate'], msg: 'ANGELS RISE FROM THE FALLEN SPOKES', done: 'THE SPOKES ARE STILL',
      waves: [
        { pre: true, foes: [{ t: 'drownedangel', x: -3, z: -12 }, { t: 'mirrorknight', x: 12, z: -4 }, { t: 'glasshound', x: 4, z: -12 }, { t: 'glasshound', x: 8, z: -13 }] },
        { foes: [{ t: 'drownedangel', x: 13, z: -13 }, { t: 'belljelly', x: -7, z: -2 }, { t: 'shardswarm', x: 3, z: -7 }, { t: 'mirrorknight', x: -4, z: -14 }, { t: 'choirwraith', x: 10, z: 0 }] },
      ] },
    { id: 'chapel', zone: [-27.4, -11.4, -16.6, -0.6], gates: ['chapelGate'], opens: ['chapelGate'], msg: 'THE CANDLES OF THE RING FLARE', done: 'THE CHAPEL IS QUIET',
      waves: [
        { pre: true, foes: [{ t: 'choirwraith', x: -25, z: -9 }, { t: 'choirwraith', x: -19, z: -2 }, { t: 'glasshound', x: -22, z: -6 }] },
        { foes: [{ t: 'drownedangel', x: -24, z: -2 }, { t: 'mirrorknight', x: -19, z: -9 }, { t: 'shardswarm', x: -22, z: -5 }] },
      ] },
    { id: 'arc', zone: [-13.4, -37.4, 19.4, -22.6], gates: ['arcGate'], opens: ['buoyGate', 'arcGate'], msg: 'THE INSCRIPTION ON THE RING BLAZES', done: 'THE WORDS DIM',
      waves: [
        { pre: true, foes: [{ t: 'mirrorknight', x: -8, z: -26 }, { t: 'mirrorknight', x: 15, z: -26 }, { t: 'drownedangel', x: 3, z: -35 }, { t: 'shardswarm', x: -6, z: -33 }, { t: 'glasshound', x: 12, z: -33 }] },
        { foes: [{ t: 'drownedangel', x: -10, z: -35 }, { t: 'drownedangel', x: 16, z: -35 }, { t: 'choirwraith', x: 6, z: -27 }, { t: 'glasshound', x: -4, z: -24 }, { t: 'glasshound', x: 10, z: -24 }] },
        { foes: [{ t: 'mirrorknight', x: 3, z: -34 }, { t: 'belljelly', x: -9, z: -29 }, { t: 'belljelly', x: 15, z: -29 }, { t: 'shardswarm', x: 3, z: -26 }] },
      ] },
    { id: 'buoys', zone: [-2.4, -65.4, 10.4, -42.6], gates: ['buoyGate', 'restGate'], opens: ['gateGate', 'restGate'], msg: 'THE BELL-BUOYS TOLL. SOMETHING SWIMS UNDER THEM.', done: 'THE SWELL GOES QUIET',
      waves: [
        { pre: true, foes: [{ t: 'belljelly', x: 0, z: -50 }, { t: 'belljelly', x: 8, z: -60 }, { t: 'choirwraith', x: 4, z: -63 }] },
        { foes: [{ t: 'drownedangel', x: 0, z: -62 }, { t: 'mirrorknight', x: 8, z: -48 }, { t: 'glasshound', x: 2, z: -54 }, { t: 'glasshound', x: 8, z: -56 }, { t: 'shardswarm', x: 4, z: -46 }] },
      ] },
    { id: 'rest', zone: [17.6, -61.4, 27.4, -48.6], gates: ['restGate'], opens: ['restGate'], msg: 'THE RESTING ANGELS LIFT THEIR SWORDS', done: 'THEY LAY THEM DOWN AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'mirrorknight', x: 22, z: -59 }, { t: 'mirrorknight', x: 25, z: -51 }] },
        { foes: [{ t: 'drownedangel', x: 23, z: -52 }, { t: 'glasshound', x: 20, z: -59 }, { t: 'glasshound', x: 26, z: -59 }] },
      ] },
  ],
  minibosses: [{ from: 'act2', x: 3, z: -30 }],
  boss: { type: 'seraph', x: 4, z: -92, face: 0, zone: [-15.4, -107.4, 23.4, -72.6], gates: ['haloGate'], opens: ['exitGate', 'haloGate'] },
  exit: { zone: [2.6, -113.6, 5.4, -112], requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ the bronze sea, the slabs of the ring, the ways
    P.sea(ctx, BOUNDS, -0.9);
    const goldM = W4.gold('#a8803a'), marbM = W4.marble('#d8d0c0'), wayM = W4.gold('#8a6a30');
    for (const r of ROOMS) slab(ctx, ...r, r === ROOMS[6] ? goldM : marbM, SEA, { kerb: W4.gold('#e0b050'), depth: 2.2, range: 3 });
    for (const r of WAYS) span(ctx, ...r, wayM, SEA, { rail: W4.gold('#e0b050') });
    voidFill(ctx, BOUNDS, WALKS);
    motes(ctx, [[-30, -116, 32, 20]], 120, { vy: -0.15, h: 9, y0: 0, color: 0xfff0c0, add: true, k: 1.6, blink: true, sway: 0.6, seed: 4801 });
    // the ring's broken arcs lying in the sea all round, pillars of light where pieces sank, bell-buoys
    P.arc(ctx, -40, -30, 30, 0.7, 1.5, { y: -0.5, solid: false }); P.arc(ctx, 48, -60, 32, -1.4, -0.7, { y: -0.4, solid: false }); P.arc(ctx, 0, 40, 24, 2.6, 3.4, { y: -0.6, solid: false });
    for (const [x, z, r] of [[-24, 12, 1.4], [26, 4, 1.1], [-28, -40, 1.6], [30, -30, 1.2], [-26, -90, 1.6], [30, -96, 1.3]]) P.seaLight(ctx, x, z, r);
    for (const [x, z, s] of [[-8, 14, 0.9], [14, 10, 1.1], [-20, -20, 1], [26, -18, 0.9], [-7, -54, 1.1], [14, -66, 1], [-22, -64, 1.2], [30, -76, 1]]) P.buoy(ctx, x, z, s);

    // ------------------------------------------------ the shore where the ring struck
    P.arc(ctx, -6, 13, 6, 0.9, 2.2, { h: 1.6 }); P.spoke(ctx, 8, 13, 0.4, 5, { tilt: 0.12 });
    P.goldAngel(ctx, -2.4, 16.4, Math.PI * 0.8, { glow: 2 });
    P.ringBrazier(ctx, 8.6, 9.6);
    K.fallenBody(ctx, 4.8, 11, 1.2, 0x2a1a08); K.droppedSword(ctx, 5.6, 11.6, 2.4);
    ctx.marks.shoreGate = barrier4(ctx, 3, 4.4, 4, 'x', 'glass', { open: true });

    // ------------------------------------------------ the field of fallen spokes
    P.spoke(ctx, -5, -6, 0.3, 9); P.spoke(ctx, 11, -9, -0.5, 8); P.spoke(ctx, 2, -14, 1.5, 7, { tilt: 0.1 });
    P.goldAngel(ctx, -8.6, 0.4, Math.PI * 0.75); P.goldAngel(ctx, 14.6, 0.4, -Math.PI * 0.75);
    P.ringBrazier(ctx, -8.6, -14); P.ringBrazier(ctx, 14.6, -14);
    K.fallenBody(ctx, 8, -3, 0.6, 0x2a1a08);
    ctx.marks.chapelGate = barrier4(ctx, -13, -6, 4, 'z', 'glass', { open: true });

    // ------------------------------------------------ the chapel in the ring
    P.arc(ctx, -22, -6, 6, -2.4, -0.8, { h: 2.2 }); P.arc(ctx, -22, -6, 6, 0.8, 1.2, { h: 2.2 }); P.arc(ctx, -22, -6, 6, 1.95, 2.4, { h: 2.2 }); // a gap where the way comes in
    CH.altar(ctx, -26, -6, Math.PI / 2);
    P.goldAngel(ctx, -18, -10.6, Math.PI * 0.2, { glow: 2.4 }); P.goldAngel(ctx, -18, -1.4, Math.PI * 0.8, { glow: 2.4 });

    // ------------------------------------------------ the arc of the ring: the long curved band, its words burning
    P.arc(ctx, 3, -10, 26, Math.PI - 0.55, Math.PI - 0.1, { h: 2.4 }); P.arc(ctx, 3, -10, 26, Math.PI + 0.1, Math.PI + 0.55, { h: 2.4 });
    P.arc(ctx, 3, -50, 20, -0.45, -0.12, { h: 1.8 }); P.arc(ctx, 3, -50, 20, 0.12, 0.45, { h: 1.8 });
    for (const [x, z] of [[-12, -24], [18, -24], [-12, -36], [18, -36]]) P.ringBrazier(ctx, x, z);
    P.goldAngel(ctx, 3, -24, 0, { glow: 2.6 });
    P.spoke(ctx, -6, -30, 1.2, 6); P.spoke(ctx, 13, -31, -1.3, 6);
    ctx.marks.arcGate = barrier4(ctx, 3, -19, 4, 'x', 'glass');

    // ------------------------------------------------ the causeway of the bell-buoys
    for (const [x, z, s] of [[-6, -46, 1.2], [14, -50, 1.1], [-6, -62, 1.3], [14, -64, 1]]) P.buoy(ctx, x, z, s);
    P.spoke(ctx, -1.6, -54, 0, 9, { y: 0.3 }); P.spoke(ctx, 9.6, -54, 0, 9, { y: 0.3 });
    P.ringBrazier(ctx, 4, -64);
    ctx.marks.buoyGate = barrier4(ctx, 3, -40, 4, 'x', 'glass');
    ctx.marks.restGate = barrier4(ctx, 14, -55, 4, 'z', 'glass', { open: true });

    // ------------------------------------------------ where the angels rest
    for (const [x, z, r] of [[19, -50, Math.PI * 0.75], [26, -50, -Math.PI * 0.75], [19, -60, Math.PI * 0.25], [26.4, -60.4, -Math.PI * 0.25]]) P.goldAngel(ctx, x, z, r, { h: 2.2 });
    P.ringBrazier(ctx, 22.6, -55);

    // ------------------------------------------------ the gate of the halo: under its last whole arc
    P.hangingHalo(ctx, 4, 9, -90, 8);
    P.arc(ctx, 4, -90, 19, Math.PI - 0.8, Math.PI - 0.12, { h: 2.8 }); P.arc(ctx, 4, -90, 19, Math.PI + 0.12, Math.PI + 0.8, { h: 2.8 });
    for (const [x, z] of [[-14, -76], [22, -76], [-14, -104], [22, -104]]) P.ringBrazier(ctx, x, z);
    for (const [x, z, r] of [[-12, -86, Math.PI / 2], [20, -86, -Math.PI / 2], [-12, -98, Math.PI / 2], [20, -98, -Math.PI / 2]]) P.goldAngel(ctx, x, z, r, { glow: 2, h: 3 });
    K.fallenBody(ctx, 12, -78, 0.9, 0x2a1a08); K.droppedSword(ctx, 12.8, -77.4, 2.2);
    ctx.marks.gateGate = barrier4(ctx, 3, -69, 4, 'x', 'glass');
    ctx.marks.haloGate = barrier4(ctx, 3, -71, 4, 'x', 'glass', { open: true });
    ctx.marks.exitGate = barrier4(ctx, 4, -109.6, 4, 'x', 'glass');
    P.seaLight(ctx, 4, -116, 1.4);
  },
};
