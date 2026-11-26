// Act IV, region III — The Hall of Echoes. (PROPOSAL: names and texts in this file are proposals for the author.)
// The Voice keeps every battle here. A hall of black mirror floors and silver frames running on into the dark,
// where the places the wardens fought through stand again in grey glass: the gallows and cells of Gallows Gate,
// the lamps and candles of Lantern Row, the Great Bell and broken stair of the Belfry. The bosses the wardens
// felled step out of the mirrors to fight again (echoes, one in every gallery). Off the hall: a maze of
// mirrors, and a wall of every face the hall remembers. At the end, the great cracked mirror with an eye in it.
import * as P from '../props/echoes.js';
import { slab, span, voidFill, deepFloor, barrier4, motes, W4 } from '../kit4.js';
import { VARIANTS } from '../../game/variants4.js';

const VOID = P.VOID;
const ROOMS = [
  [-4, 8, 10, 18],         // the threshold of mirrors
  [-8, -14, 14, 2],        // the gallery of the first night (Gallows Gate)
  [-27, -13, -14, 1],      // the mirror maze (a side fight)
  [-8, -40, 14, -22],      // the gallery of candles (Lantern Row)
  [-4, -70, 12, -44],      // the long reflection
  [-10, -98, 16, -76],     // the gallery of the bell (the Belfry)
  [22, -93, 33, -81],      // the hall of masks (a side fight)
  [-12, -132, 20, -106],   // before the great mirror (the last fight)
];
const WAYS = [
  [1.4, 2, 4.6, 8], [-14, -8, -8, -4], [1.4, -22, 4.6, -14], [1.4, -44, 4.6, -40], [1.4, -76, 4.6, -70],
  [16, -89, 22, -85], [1.4, -106, 4.6, -98],
];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-31, -136, 37, 22];

export default {
  variants: VARIANTS.echoes,
  id: 'echoes', name: 'The Hall of Echoes', tagline: 'THE VOICE REMEMBERS EVERY BATTLE. HERE, IT PLAYS THEM AGAIN.', tier: 17, act: 4,
  start: { x: 3, z: 16, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['thresholdGate', 'mazeGate', 'masksGate'],
  ambience: {
    fog: 0x0c0c14, fogNear: 56, fogFar: 130, background: VOID, moon: 1.4, moonColor: 0xd0d4ff, moonDir: [0.2, 1, -0.5], hemi: 1.3, hemiSky: 0xa8acd8, hemiGround: 0x08080e,
    fill: 1.25, fillColor: 0xb8bce8, ambient: 0x16161e, ambientI: 0.9, rain: 0, drizzle: 0, lightning: false, weather: 'dust',
    grade: { gain: [0.96, 0.97, 1.05], lift: [0.012, 0.012, 0.022], sat: 0.7, vignette: 0.52, bloom: 0.38 },
    beams: [],
  },
  lamps: [{ id: 'threshold', x: -2.4, z: 12, sx: 1.3, sz: 0.3 }, { id: 'masks', x: 23.4, z: -87, sx: 1.3, sz: 0 }],
  items: [
    { id: 'c1', x: -25, z: -2, ry: Math.PI / 2, kind: 'embers', amount: 600 },
    { id: 'c2', x: 31, z: -91, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: 10.6, z: -48, ry: -Math.PI / 2, kind: 'embers', amount: 440 },
  ],
  hints: [
    { zone: [-4, 12, 10, 18], text: 'THE HALL OF ECHOES. EVERY FOE YOU FELLED IS HERE.' },
    { zone: [1.4, -18, 4.6, -14], text: 'THE MIRRORS SHOW YOU A MOMENT LATE.' },
    { zone: [-14, -8, -11, -4], text: 'A MAZE OF GLASS. THE WAY OUT IS WHERE YOU ARE NOT.' },
    { zone: [1.4, -44, 4.6, -41], text: 'THEY REMEMBER YOUR TRICKS NOW.' },
    { zone: [1.4, -106, 4.6, -102], text: 'THE LAST MIRROR IS CRACKED. SOMETHING LOOKS THROUGH.' },
  ],
  foes: [{ t: 'mirrorknight', x: 5, z: -2 }, { t: 'choirwraith', x: 3, z: -42 }, { t: 'echoknight', x: 3, z: -72 }],
  encounters: [
    { id: 'foyer', zone: [-7.4, -13.4, 13.4, 1.4], gates: ['thresholdGate', 'mazeGate'], opens: ['foyerGate', 'mazeGate'], msg: 'THE MIRRORS CLOUD. SOMEONE STEPS OUT.', done: 'THE GLASS CLEARS',
      waves: [
        { pre: true, foes: [{ t: 'mirrorknight', x: 0, z: -4 }, { t: 'echoknight', x: 10, z: -8 }, { t: 'choirwraith', x: 3, z: -12 }] },
        { foes: [{ t: 'mirrorknight', x: 11, z: -2 }, { t: 'glasshound', x: -5, z: -2 }, { t: 'glasshound', x: -5, z: -11 }, { t: 'echoknight', x: 3, z: -1 }] },
      ] },
    { id: 'maze', zone: [-26.4, -12.4, -14.6, 0.4], gates: ['mazeGate'], opens: ['mazeGate'], msg: 'YOUR REFLECTIONS TURN TO FACE YOU', done: 'THE MAZE IS EMPTY',
      waves: [
        { pre: true, foes: [{ t: 'mirrorknight', x: -24, z: -10 }, { t: 'mirrorknight', x: -17, z: -2 }] },
        { foes: [{ t: 'echoknight', x: -25, z: -6 }, { t: 'shardswarm', x: -17, z: -8 }, { t: 'mirrorknight', x: -21, z: -1 }] },
      ] },
    { id: 'gallery', zone: [-7.4, -39.4, 13.4, -22.6], gates: ['foyerGate'], opens: ['galleryGate', 'foyerGate'], msg: 'THE CANDLES OF LANTERN ROW. THEY REMEMBER YOU.', done: 'THE STILL FLAMES GO OUT',
      waves: [
        { pre: true, foes: [{ t: 'choirwraith', x: -5, z: -34 }, { t: 'choirwraith', x: 11, z: -34 }, { t: 'echoknight', x: 3, z: -37 }, { t: 'shardswarm', x: 3, z: -26 }] },
        { foes: [{ t: 'mirrorknight', x: -3, z: -25 }, { t: 'mirrorknight', x: 9, z: -25 }, { t: 'belljelly', x: 3, z: -38 }, { t: 'glasshound', x: -5, z: -30 }] },
      ] },
    { id: 'reflection', zone: [-3.4, -69.4, 11.4, -44.6], gates: ['galleryGate'], opens: ['bellGate', 'galleryGate'], msg: 'THE REFLECTIONS STEP OUT OF THE WALLS', done: 'THE LONG HALL IS STILL',
      waves: [
        { pre: true, foes: [{ t: 'echoknight', x: 0, z: -50 }, { t: 'echoknight', x: 8, z: -58 }, { t: 'shardswarm', x: 4, z: -66 }] },
        { foes: [{ t: 'mirrorknight', x: 0, z: -64 }, { t: 'mirrorknight', x: 9, z: -48 }, { t: 'glasshound', x: 4, z: -52 }, { t: 'glasshound', x: 4, z: -60 }, { t: 'choirwraith', x: 7, z: -66 }] },
      ] },
    { id: 'bell', zone: [-9.4, -97.4, 15.4, -76.6], gates: ['bellGate', 'masksGate'], opens: ['mirrorGate', 'masksGate'], msg: 'THE GREAT BELL HANGS OVER YOU AGAIN', done: 'THE MEMORY OF THE BELL FADES',
      waves: [
        { pre: true, foes: [{ t: 'echoknight', x: -6, z: -80 }, { t: 'echoknight', x: 12, z: -80 }, { t: 'drownedangel', x: 3, z: -94 }, { t: 'choirwraith', x: -6, z: -92 }] },
        { foes: [{ t: 'mirrorknight', x: 3, z: -80 }, { t: 'mirrorknight', x: 12, z: -92 }, { t: 'shardswarm', x: -4, z: -86 }, { t: 'belljelly', x: 10, z: -86 }, { t: 'glasshound', x: 3, z: -90 }] },
      ] },
    { id: 'masks', zone: [22.6, -92.4, 32.4, -81.6], gates: ['masksGate'], opens: ['masksGate'], msg: 'THE MASKS OPEN THEIR EYES', done: 'THE MASKS CLOSE THEIR EYES',
      waves: [
        { pre: true, foes: [{ t: 'choirwraith', x: 28, z: -90 }, { t: 'echoknight', x: 25, z: -83 }, { t: 'echoknight', x: 30, z: -83 }] },
        { foes: [{ t: 'mirrorknight', x: 27, z: -86 }, { t: 'shardswarm', x: 30, z: -90 }, { t: 'glasshound', x: 24, z: -90 }] },
      ] },
    { id: 'mirror', zone: [-11.4, -131.4, 19.4, -106.6], gates: ['mirrorGate'], opens: ['exitGate'], msg: 'THE EYE IN THE MIRROR OPENS', done: 'THE EYE CLOSES. FOR NOW.',
      waves: [
        { pre: true, foes: [{ t: 'mirrorknight', x: -6, z: -112 }, { t: 'mirrorknight', x: 14, z: -112 }, { t: 'echoknight', x: 4, z: -118 }, { t: 'drownedangel', x: -8, z: -124 }] },
        { foes: [{ t: 'echoknight', x: -6, z: -122 }, { t: 'echoknight', x: 14, z: -122 }, { t: 'shardswarm', x: 4, z: -110 }, { t: 'choirwraith', x: 16, z: -126 }, { t: 'glasshound', x: 4, z: -126 }] },
        { foes: [{ t: 'mirrorknight', x: 4, z: -122 }, { t: 'drownedangel', x: -8, z: -110 }, { t: 'drownedangel', x: 16, z: -110 }, { t: 'glasshound', x: -4, z: -118 }, { t: 'glasshound', x: 12, z: -118 }] },
      ] },
  ],
  // the echoes: a boss of the first act in each of the first galleries, of the second act deeper in, and the hall
  // throws more at the great mirror
  minibosses: [{ from: 'act1', x: 3, z: -6 }, { from: 'act1', x: 3, z: -31 }, { from: 'act2', x: 4, z: -57 }, { from: 'act2', x: 3, z: -87 }, { from: 'act3', x: 4, z: -118 }],
  exit: { zone: [1, -130.9, 7, -130.1] }, // the way on is through the cracked mirror, once the eye has closed
  build(K, ctx) {
    deepFloor(ctx, BOUNDS, 0x040408, { y: -16 });
    const floorM = W4.mirror('#16141e'), galM = W4.mirror('#1c1a26'), wayM = W4.mirror('#24202e'), kerbM = W4.gold('#8a8aa0');
    for (const r of ROOMS) slab(ctx, ...r, r === ROOMS[3] || r === ROOMS[5] ? galM : floorM, VOID, { kerb: kerbM, rockTone: '#2a2a36' });
    for (const r of WAYS) span(ctx, ...r, wayM, VOID, { rail: W4.gold('#9a9ab0') });
    voidFill(ctx, BOUNDS, WALKS);
    motes(ctx, [[-29, -134, 35, 20]], 170, { vy: 0.05, h: 8, y0: 0, color: 0xd0d4ff, add: true, k: 1.4, blink: true, sway: 0.3, seed: 4701 });

    // ------------------------------------------------ the threshold of mirrors
    P.mirrorWall(ctx, -4, 18, 10, 18, { h: 3.6 }); P.mirrorWall(ctx, -4, 9, -4, 18, { h: 3 }); P.mirrorWall(ctx, 10, 9, 10, 18, { h: 3 });
    P.standMirror(ctx, 0, 12, 0.5); P.standMirror(ctx, 7, 12.4, -0.5);
    P.memWarden(ctx, 3, 14.6, Math.PI);
    P.floatShards(ctx, -3, 9, 9, 17, 8);
    ctx.marks.thresholdGate = barrier4(ctx, 3, 4.4, 4, 'x', 'mirror', { open: true });

    // ------------------------------------------------ the gallery of the first night: Gallows Gate remembered
    P.memGallows(ctx, -3, -9, 0.3); P.memCell(ctx, 10.6, -10.2, 2.4); P.memCell(ctx, 10.6, -4, 2.2);
    for (const [x, z] of [[-7.2, 1.2], [13.2, 1.2], [-7.2, -13.2], [13.2, -13.2]]) P.mirrorPillar(ctx, x, z, 4.6);
    P.memLamp(ctx, -6.6, -4); P.memLamp(ctx, 3, 0.6);
    P.floorRings(ctx, 3, -6, 6);
    P.memWarden(ctx, 6, -12, 0.4);
    ctx.marks.mazeGate = barrier4(ctx, -11, -6, 4, 'z', 'mirror', { open: true });

    // ------------------------------------------------ the mirror maze
    P.mirrorWall(ctx, -27, -13, -27, 1, { h: 3.2 }); P.mirrorWall(ctx, -27, 1, -14, 1, { h: 3.2 }); P.mirrorWall(ctx, -27, -13, -14, -13, { h: 3.2 });
    P.mirrorWall(ctx, -23, -9, -23, -3, { h: 2.8 }); P.mirrorWall(ctx, -19, -13, -19, -9, { h: 2.8 }); P.mirrorWall(ctx, -19, -3, -19, 1, { h: 2.8 });
    P.standMirror(ctx, -21, -6, 1.2); P.standMirror(ctx, -16, -11, -0.4);

    // ------------------------------------------------ the gallery of candles: Lantern Row remembered
    for (const [x, z] of [[-6.4, -24], [12.4, -24], [-6.4, -38], [12.4, -38], [-6.4, -31], [12.4, -31]]) P.memLamp(ctx, x, z);
    P.memCandles(ctx, 3, -31, 12); P.memCandles(ctx, -3, -36, 6); P.memCandles(ctx, 9, -26, 6);
    P.floorRings(ctx, 3, -31, 7);
    P.mirrorWall(ctx, -8, -40, 14, -40, { h: 3.4, gap: [1, 5] });
    P.floatShards(ctx, -7, -39, 13, -23, 10);
    ctx.marks.foyerGate = barrier4(ctx, 3, -18, 4, 'x', 'mirror');

    // ------------------------------------------------ the long reflection: mirrors down both sides
    P.mirrorWall(ctx, -4, -70, -4, -44, { h: 4 }); P.mirrorWall(ctx, 12, -70, 12, -44, { h: 4 });
    for (const z of [-50, -58, -66]) { P.mirrorPillar(ctx, -2.4, z, 4.2); P.mirrorPillar(ctx, 10.4, z, 4.2); }
    P.memWarden(ctx, 1, -54, 0.8); P.memWarden(ctx, 8, -62, -0.8);
    P.floatShards(ctx, -3, -69, 11, -45, 12, 3);
    ctx.marks.galleryGate = barrier4(ctx, 3, -42, 4, 'x', 'mirror');

    // ------------------------------------------------ the gallery of the bell: the Belfry remembered
    P.memBell(ctx, 3, 9, -87, 4.2);
    P.memStair(ctx, -6.6, -82, 0, 9); P.memStair(ctx, 12.6, -94, Math.PI, 7);
    for (const [x, z] of [[-9.2, -77], [15.2, -77], [-9.2, -97], [15.2, -97]]) P.mirrorPillar(ctx, x, z, 5.4);
    P.memLamp(ctx, -8, -90); P.memLamp(ctx, 14, -82);
    P.floorRings(ctx, 3, -87, 8);
    ctx.marks.bellGate = barrier4(ctx, 3, -73, 4, 'x', 'mirror');
    ctx.marks.masksGate = barrier4(ctx, 19, -87, 4, 'z', 'mirror', { open: true });

    // ------------------------------------------------ the hall of masks
    P.maskWall(ctx, 33, -93, 33, -81); P.maskWall(ctx, 22, -93, 33, -93);
    P.memCandles(ctx, 27, -86, 7);

    // ------------------------------------------------ before the great mirror
    P.greatMirror(ctx, 4, -131.4, 14);
    for (const [x, z] of [[-11, -108], [19, -108], [-11, -120], [19, -120]]) P.mirrorPillar(ctx, x, z, 6);
    P.mirrorWall(ctx, -12, -132, -12, -106, { h: 4.4 }); P.mirrorWall(ctx, 20, -132, 20, -106, { h: 4.4 });
    for (const [x, z, r] of [[-7, -126, 0.6], [15, -126, -0.6], [-7, -112, 1.2], [15, -112, -1.2]]) P.memWarden(ctx, x, z, r);
    P.floorRings(ctx, 4, -118, 9);
    P.floatShards(ctx, -10, -130, 18, -108, 16, 3);
    ctx.marks.mirrorGate = barrier4(ctx, 3, -102, 4, 'x', 'mirror');
    ctx.marks.exitGate = barrier4(ctx, 4, -129.4, 6, 'x', 'mirror');
  },
};
