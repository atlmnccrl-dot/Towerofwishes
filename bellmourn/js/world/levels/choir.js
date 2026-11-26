// Act IV, region I — The Sunken Choir. (PROPOSAL: names and texts in this file are proposals for the author.)
// When the Wheel broke, heaven fell into the sea of bell-bronze, and its cathedral sank. The wardens walk its
// broken floors hanging in the green-black water: the narthex, the nave with its pews and its fallen rose
// window, a side chapel, the organ loft where the drowned still play, the baptistery with its font of light,
// the stalls where the choristers of bone are still singing, a reliquary, the cloister, and the sanctuary of
// the drowned altar. Shafts of light from a surface no one can see, bubbles, kelp, small fish, bells on chains.
import * as P from '../props/choir.js';
import { slab, span, voidFill, deepFloor, barrier4, motes, shaft, school, murk, W4 } from '../kit4.js';
import { VARIANTS } from '../../game/variants4.js';

const DEEP = P.DEEP;
const ROOMS = [
  [-3, 6, 9, 17],          // the narthex
  [-6, -16, 13, 0],        // the nave (first fight)
  [-22, -15, -13, -3],     // the side chapel (a side fight)
  [-5, -40, 13, -22],      // the organ loft
  [19, -38, 29, -26],      // the baptistery (a side fight)
  [-6, -62, 14, -46],      // the drowned choir
  [-16, -58, -10, -50],    // the reliquary (a side way, a lamp)
  [-4, -82, 12, -68],      // the cloister
  [-8, -106, 16, -88],     // the sanctuary of the drowned altar (the last fight)
];
const WAYS = [
  [1.4, 0, 5.4, 6], [-13, -11, -6, -7], [1.4, -22, 5.4, -16], [13, -34, 19, -30], [1.4, -46, 5.4, -40],
  [-10, -56, -6, -52], [1.4, -68, 5.4, -62], [1.4, -88, 5.4, -82], [1.4, -112, 5.4, -106],
];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-26, -114, 32, 21];

export default {
  variants: VARIANTS.choir, // the run's area variants (js/game/variants4.js)
  id: 'choir', name: 'The Sunken Choir', tagline: 'HEAVEN FELL INTO THE SEA. ITS CHOIR NEVER STOPPED SINGING.', tier: 15.5, act: 4,
  start: { x: 3.4, z: 14.4, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['naveGate', 'chapelGate', 'fontGate'],
  ambience: {
    fog: 0x0e2e30, fogNear: 62, fogFar: 132, background: DEEP, moon: 1.5, moonColor: 0x9ae0d0, moonDir: [0.3, 1, -0.5], hemi: 1.35, hemiSky: 0x4a9a96, hemiGround: 0x081414,
    fill: 1.3, fillColor: 0x6ab0a8, ambient: 0x14302e, ambientI: 0.85, rain: 0, drizzle: 0, lightning: false, weather: 'dust',
    grade: { gain: [0.88, 1.02, 1.07], lift: [0.0, 0.012, 0.016], sat: 0.86, vignette: 0.45, bloom: 0.3 },
    beams: [],
  },
  lamps: [{ id: 'narthex', x: -1.6, z: 9.4, sx: 1.3, sz: 0.3 }, { id: 'reliquary', x: -13, z: -51.4, sx: 0, sz: 1.3 }],
  items: [
    { id: 'c1', x: -20.6, z: -9, ry: Math.PI / 2, kind: 'embers', amount: 520 },
    { id: 'c2', x: 27.6, z: -32, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: -14.6, z: -56.4, ry: 0, kind: 'embers', amount: 380 },
  ],
  hints: [
    { zone: [-3, 10, 9, 17], text: 'THE WATER IS FULL OF SINGING. NO ONE DROWNS HERE. NOT AGAIN.' },
    { zone: [1.4, 0, 5.4, 4], text: 'HEAVEN FELL WHEN THE WHEEL BROKE. THIS WAS ITS CATHEDRAL.' },
    { zone: [-13, -11, -9, -7], text: 'A CHAPEL. SOMEONE STILL KEEPS ITS CANDLES.' },
    { zone: [1.4, -46, 5.4, -42], text: 'THE CHOIR. LISTEN: THEY ARE SINGING YOUR NAME.' },
    { zone: [1.4, -88, 5.4, -84], text: 'THE ALTAR OF THE DROWNED. SOMETHING TENDS IT.' },
  ],
  foes: [
    { t: 'belljelly', x: 3.4, z: 3 }, { t: 'drownedangel', x: 15.6, z: -31.4 },
    { t: 'belljelly', x: 3.4, z: -43.4 }, { t: 'choirwraith', x: -8, z: -54 },
    { t: 'drownedangel', x: 3.4, z: -65 }, { t: 'belljelly', x: 3.4, z: -85.4 },
  ],
  encounters: [
    { id: 'nave', zone: [-5, -15, 12, -0.4], gates: ['naveGate', 'chapelGate'], opens: ['organGate', 'chapelGate'], msg: 'THE PEWS FILL WITH THE DROWNED', done: 'THE PIPES SINK INTO THE FLOOR',
      waves: [
        { pre: true, foes: [{ t: 'drownedangel', x: -2.6, z: -8.6 }, { t: 'choirwraith', x: 9.4, z: -10.4 }, { t: 'belljelly', x: 3.4, z: -13 }] },
        { foes: [{ t: 'drownedangel', x: 9, z: -7 }, { t: 'choirwraith', x: -1, z: -6 }, { t: 'belljelly', x: 7.6, z: -13.6 }, { t: 'choirwraith', x: 0, z: -10 }] },
      ] },
    { id: 'chapel', zone: [-21, -14, -13.4, -4], gates: ['chapelGate'], opens: ['chapelGate'], msg: 'THE CANDLES GUTTER. THE CHAPEL IS NOT EMPTY.', done: 'THE CANDLES BURN STILL AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'choirwraith', x: -18.6, z: -12.4, face: 0 }, { t: 'choirwraith', x: -15, z: -5.6 }] },
        { foes: [{ t: 'drownedangel', x: -19.4, z: -6 }, { t: 'belljelly', x: -15.4, z: -12.6 }, { t: 'choirwraith', x: -18, z: -12 }] },
      ] },
    { id: 'organ', zone: [-4, -39, 12, -22.4], gates: ['organGate', 'fontGate'], opens: ['choirGate', 'fontGate'], msg: 'THE ORGAN PLAYS. THE WHOLE LOFT SHAKES.', done: 'THE LAST CHORD FADES',
      waves: [
        { pre: true, foes: [{ t: 'drownedangel', x: 0.4, z: -33.6, face: 0 }, { t: 'drownedangel', x: 9.4, z: -33.4, face: 0 }, { t: 'belljelly', x: 4, z: -27.6 }, { t: 'choirwraith', x: -2.6, z: -25.4 }] },
        { foes: [{ t: 'choirwraith', x: 10.6, z: -25 }, { t: 'choirwraith', x: -2.4, z: -36.6 }, { t: 'belljelly', x: 9.6, z: -37 }, { t: 'drownedangel', x: 4.6, z: -24.6 }] },
      ] },
    { id: 'font', zone: [19.6, -37.4, 28.4, -26.6], gates: ['fontGate'], opens: ['fontGate'], msg: 'THE FONT BOILS WITH LIGHT', done: 'THE FONT IS STILL',
      waves: [
        { pre: true, foes: [{ t: 'belljelly', x: 26.4, z: -28.4 }, { t: 'belljelly', x: 21.4, z: -36 }, { t: 'drownedangel', x: 26.6, z: -36, face: 0 }] },
        { foes: [{ t: 'drownedangel', x: 21, z: -28 }, { t: 'choirwraith', x: 26, z: -29.4 }, { t: 'belljelly', x: 27.4, z: -36.6 }] },
      ] },
    { id: 'stalls', zone: [-5, -61, 13, -46.4], gates: ['choirGate'], opens: ['cloisterGate'], msg: 'THE CHOIR TURNS ITS HEADS TOWARD YOU', done: 'THE SINGING DROPS TO A HUM',
      waves: [
        { pre: true, foes: [{ t: 'choirwraith', x: -0.6, z: -55.4, face: 0 }, { t: 'choirwraith', x: 8.6, z: -55.6, face: 0 }, { t: 'drownedangel', x: 4, z: -55, face: 0 }, { t: 'belljelly', x: 10.4, z: -49.4 }] },
        { foes: [{ t: 'drownedangel', x: -2.6, z: -49.6 }, { t: 'drownedangel', x: 11.4, z: -59.6 }, { t: 'choirwraith', x: 4, z: -51 }, { t: 'belljelly', x: -2.4, z: -60 }] },
      ] },
    { id: 'cloister', zone: [-3, -81, 11, -68.4], gates: ['cloisterGate'], opens: ['sanctGate'], msg: 'THE BELLS IN THE CLOISTER BEGIN TO SWING', done: 'THE BELLS HANG STILL',
      waves: [
        { pre: true, foes: [{ t: 'belljelly', x: 0, z: -75 }, { t: 'belljelly', x: 8.4, z: -77.4 }, { t: 'drownedangel', x: 4.4, z: -79.6, face: 0 }] },
        { foes: [{ t: 'choirwraith', x: -1.6, z: -79.4 }, { t: 'choirwraith', x: 9.6, z: -71 }, { t: 'drownedangel', x: 1, z: -71.4 }, { t: 'belljelly', x: 9.4, z: -80 }] },
      ] },
    { id: 'sanctuary', zone: [-7, -105, 15, -88.4], gates: ['sanctGate'], opens: ['exitGate'], msg: 'THE ALTAR WAKES. THE DROWNED KNEEL, THEN RISE.', done: 'THE SANCTUARY FALLS SILENT. THE WAY UP IS OPEN.',
      waves: [
        { pre: true, foes: [{ t: 'drownedangel', x: -2.4, z: -97.4, face: 0 }, { t: 'drownedangel', x: 4, z: -101, face: 0 }, { t: 'choirwraith', x: 4, z: -92.6 }, { t: 'belljelly', x: 13.4, z: -92 }] },
        { foes: [{ t: 'drownedangel', x: 4, z: -97, elite: 'shielded' }, { t: 'choirwraith', x: -5, z: -92 }, { t: 'choirwraith', x: 13, z: -102 }, { t: 'belljelly', x: -4.6, z: -103 }] },
        { foes: [{ t: 'drownedangel', x: -4.4, z: -100 }, { t: 'drownedangel', x: 12.4, z: -91.6 }, { t: 'belljelly', x: 4, z: -91 }, { t: 'choirwraith', x: 6, z: -94 }, { t: 'choirwraith', x: -4.6, z: -91.6 }] },
      ] },
  ],
  exit: { zone: [1.8, -111.6, 5, -110], to: 'orchard', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ the deep, the broken floors, the ways between them
    deepFloor(ctx, BOUNDS, 0x04120f, { y: -16 });
    const floorM = W4.drown('#5e6e6a'), naveM = W4.drown('#66766e'), wayM = W4.drown('#7a8a84');
    for (const r of ROOMS) slab(ctx, ...r, r === ROOMS[1] || r === ROOMS[8] ? naveM : floorM, DEEP, { kerb: W4.verd(), rockTone: '#3a4a46' });
    for (const r of WAYS) span(ctx, ...r, wayM, DEEP);
    voidFill(ctx, BOUNDS, WALKS);
    for (const [x, y, z, w, d] of [[-14, -9, 6, 30, 14], [20, -10, -8, 24, 20], [-16, -11, -36, 22, 24], [24, -12, -60, 20, 30], [-14, -9, -80, 20, 20], [22, -10, -98, 20, 24], [4, -12, 22, 40, 10]]) murk(ctx, x, y, z, w, d, 5, 0x3a7a74, 0.1);
    // bubbles rising everywhere, motes of plankton, fish
    motes(ctx, [[-20, -110, 28, 18]], 220, { vy: 0.7, h: 10, y0: -6, color: 0xc8f0e8, opacity: 0.55, seed: 4501 });
    motes(ctx, [[-20, -110, 28, 18]], 140, { vy: -0.08, h: 7, y0: 0, color: 0x9ae8c8, add: true, k: 1.4, blink: true, sway: 0.4, seed: 4502 });
    school(ctx, 18, 3.4, 6, 14, 3.4); school(ctx, -14, 4, -28, 12, 3, { dir: -1 }); school(ctx, 22, 4.6, -56, 16, 4); school(ctx, -14, 3.6, -96, 12, 3.4, { dir: -1 });

    // ------------------------------------------------ the narthex
    P.drownedAngel(ctx, -1.4, 15, Math.PI * 0.8, { pose: 'pray', glow: 2 }); P.drownedAngel(ctx, 7.8, 15.2, -Math.PI * 0.8, { pose: 'pray', glow: 2 });
    P.ruin(ctx, -3, 17, 9, 17, 3.6, { lancets: true }); P.pillar(ctx, -2, 7.2, 4.6, { broken: true }); P.pillar(ctx, 8, 7.4, 5.2);
    P.kelp(ctx, 8, 11.6, 4); P.kelp(ctx, -2.4, 12.2, 3); P.coral(ctx, 7.6, 9.6, 0.9);
    P.hangBell(ctx, 12.4, 1, 10, 1.2, { ring: true }); P.hangBell(ctx, -7, 0, 12, 0.9);
    shaft(ctx, 3.4, 11.4, 2.2, { color: 0xbfe8b0, k: 0.14, light: 2.2 });
    K.fallenBody(ctx, 5.4, 9.4, 1.2, 0x10201e); K.droppedSword(ctx, 6.2, 10, 2.4);
    ctx.marks.naveGate = barrier4(ctx, 3.4, 0.8, 4, 'x', 'pipes', { open: true });

    // ------------------------------------------------ the nave (first fight): pews, the fallen rose window
    P.rose(ctx, 3.4, -8.4, 3.2);
    P.pews(ctx, -5.2, -3.4, 5.2, 2, -1, { tip: 0.4 }); P.pews(ctx, 7.2, -3.4, 5.2, 2, -1, { tip: 0.4 }); P.pews(ctx, -5.2, -12.6, 5.2, 2, -1, { tip: 0.5 }); P.pews(ctx, 7.2, -12.4, 5.2, 1, -1);
    for (const [x, z, h, b] of [[-5.2, -0.8, 5, false], [12.2, -0.8, 6, false], [-5.2, -15.2, 4, true], [12.2, -15.2, 5.4, false]]) P.pillar(ctx, x, z, h, { broken: b });
    P.ruin(ctx, 13, -15, 13, -1, 3.8, { lancets: true });
    P.hangBell(ctx, 3.4, 2, -8.4, 1.6, { ring: true });
    P.drownLamp(ctx, -5, -8.4); P.kelp(ctx, 11.6, -7, 3); P.coral(ctx, -4.6, -5.4, 0.8);
    shaft(ctx, 3.4, -8.4, 2.8, { color: 0xbfe8b0, k: 0.12 }); shaft(ctx, -2, -13, 1.6, { color: 0xbfe8b0, k: 0.1 });
    K.fallenBody(ctx, 8.6, -7.4, 0.6, 0x10201e);
    ctx.marks.chapelGate = barrier4(ctx, -7, -9, 4, 'z', 'pipes', { open: true });

    // ------------------------------------------------ the side chapel
    P.ruin(ctx, -22, -15, -22, -3, 3.2, { lancets: true }); P.ruin(ctx, -22, -15, -13, -15, 2.8);
    P.drownedAngel(ctx, -20.4, -13.2, Math.PI * 0.25, { pose: 'pray', glow: 2.6 });
    P.drownLamp(ctx, -14.4, -13.6, { color: 0x80c8ff }); P.drownLamp(ctx, -14.6, -4.4, { color: 0x80c8ff });
    P.kelp(ctx, -20.6, -4.2, 3); P.coral(ctx, -16.4, -9, 0.7);
    shaft(ctx, -17.6, -9, 1.8, { color: 0xbfe8b0, k: 0.12 });

    // ------------------------------------------------ the organ loft
    P.organ(ctx, -3.6, -38.8, 4.6); P.organ(ctx, 6.2, -38.8, 4.6); // two halves, the way down to the choir between them
    P.drownedAngel(ctx, -3.6, -24.6, Math.PI * 0.75, { glow: 2 }); P.drownedAngel(ctx, 11.6, -24.4, -Math.PI * 0.75, { glow: 2 });
    P.pillar(ctx, 12, -39, 5.6); P.pillar(ctx, -4, -30, 4, { broken: true });
    P.pews(ctx, 1.6, -29.6, 4, 1, 1); P.drownLamp(ctx, 11.8, -30.6);
    P.hangBell(ctx, -9, 1, -30, 1.3, { ring: true }); P.hangBell(ctx, 17, 2, -24, 1.0);
    P.kelp(ctx, 12, -36.4, 3); P.coral(ctx, -3.8, -34.6, 0.8);
    shaft(ctx, 4.4, -30, 2.4, { color: 0xbfe8b0, k: 0.12 });
    ctx.marks.organGate = barrier4(ctx, 3.4, -17, 4, 'x', 'pipes');
    ctx.marks.fontGate = barrier4(ctx, 14, -32, 4, 'z', 'pipes', { open: true });

    // ------------------------------------------------ the baptistery
    P.font(ctx, 24, -32);
    P.ruin(ctx, 29, -38, 29, -26, 3.4, { lancets: true }); P.ruin(ctx, 19, -38, 29, -38, 2.6);
    for (const [x, z] of [[20, -27], [28, -27], [20, -37], [28.2, -37]]) P.coral(ctx, x, z, 0.7);
    P.kelp(ctx, 28, -30, 3);

    // ------------------------------------------------ the drowned choir
    P.stalls(ctx, -5.6, -61, -5.6, -57, '+x', 2); P.stalls(ctx, -5.6, -51, -5.6, -47, '+x', 2); // the way to the reliquary between them P.stalls(ctx, 13.6, -61, 13.6, -47, '-x', 2);
    P.stalls(ctx, -2.4, -61.6, 0.8, -61.6, '+z', 1); P.stalls(ctx, 6.0, -61.6, 10.4, -61.6, '+z', 1); // the way to the cloister between them
    P.drownedAngel(ctx, 4, -58.6, 0, { glow: 3.4 });
    P.hangBell(ctx, 0, 1, -50, 1.1, { ring: true }); P.hangBell(ctx, 8.8, 1.6, -51, 1.3); P.hangBell(ctx, 4, 2.4, -55, 1.8, { ring: true });
    P.drownLamp(ctx, 0, -47.4); P.drownLamp(ctx, 8.8, -47.4);
    shaft(ctx, 4, -54, 3, { color: 0xbfe8b0, k: 0.12, light: 2 });
    K.fallenBody(ctx, 6.4, -49.4, -0.8, 0x10201e); K.droppedSword(ctx, 7.2, -48.8, 2);
    ctx.marks.choirGate = barrier4(ctx, 3.4, -41, 4, 'x', 'pipes');

    // ------------------------------------------------ the reliquary
    P.ruin(ctx, -16, -58, -16, -50, 3, { lancets: true }); P.ruin(ctx, -16, -50, -10, -50, 2.6);
    P.coral(ctx, -11, -57, 0.7); P.kelp(ctx, -15, -52.6, 3);
    shaft(ctx, -13, -54, 1.6, { color: 0xbfe8b0, k: 0.14 });

    // ------------------------------------------------ the cloister: an arcade round a court of kelp, bells
    for (const x of [-3.2, 0.8, 7.6, 11.2]) { P.pillar(ctx, x, -69, 4.2, { broken: x === 0.8 }); P.pillar(ctx, x, -81, 4.2, { broken: x === 11.2 }); }
    P.archStump(ctx, 3.8, -81, 3.4, 0);
    P.kelp(ctx, 2, -75, 5, { h: 3.2 }); P.kelp(ctx, 7, -76, 4, { h: 3 }); P.coral(ctx, 4.4, -73, 1); P.coral(ctx, 9.6, -78, 0.8);
    P.hangBell(ctx, 0, 1, -75, 1.0, { ring: true }); P.hangBell(ctx, 9, 1.4, -74, 1.2);
    P.drownLamp(ctx, -3, -75); P.drownLamp(ctx, 11.4, -75);
    shaft(ctx, 4.4, -75, 2.4, { color: 0xbfe8b0, k: 0.12 });
    ctx.marks.cloisterGate = barrier4(ctx, 3.4, -63, 4, 'x', 'pipes');

    // ------------------------------------------------ the sanctuary of the drowned altar
    P.altar(ctx, 10.6, -98, -Math.PI / 2); // against the east wall, its great bell off the way up
    P.drownedAngel(ctx, -5.6, -103.6, Math.PI * 0.25, { glow: 2.6 }); P.drownedAngel(ctx, 13.6, -103.6, -Math.PI * 0.25, { glow: 2.6 });
    P.drownedAngel(ctx, -5.6, -90.4, Math.PI * 0.75, { pose: 'pray' }); P.drownedAngel(ctx, 13.6, -90.6, -Math.PI * 0.75, { pose: 'pray' });
    P.ruin(ctx, -8, -106, 1.2, -106, 4.2, { lancets: true }); P.ruin(ctx, 5.6, -106, 16, -106, 4.2, { lancets: true }); // the way up out of the sea between them P.ruin(ctx, -8, -106, -8, -94, 3.6, { lancets: true }); P.ruin(ctx, 16, -106, 16, -96, 3.6, { lancets: true });
    P.rose(ctx, 4, -95.4, 2.4);
    P.hangBell(ctx, -1, 1.4, -96, 1.2, { ring: true }); P.hangBell(ctx, 9.4, 1.8, -95.6, 1.4, { ring: true });
    P.kelp(ctx, -6.4, -97, 3); P.kelp(ctx, 14.4, -98, 3); P.coral(ctx, -6, -95, 0.8); P.coral(ctx, 14, -101, 0.8);
    shaft(ctx, 4, -99, 3.4, { color: 0xffe8a0, k: 0.14, light: 2.6 });
    K.fallenBody(ctx, 10.6, -93.6, 0.9, 0x10201e); K.droppedSword(ctx, 11.4, -93, 2.2);
    ctx.marks.sanctGate = barrier4(ctx, 3.4, -83, 4, 'x', 'pipes');
    ctx.marks.exitGate = barrier4(ctx, 3.4, -107, 4, 'x', 'pipes');
    // the way up out of the sea: light pouring down at the exit
    shaft(ctx, 3.4, -110.6, 1.8, { color: 0xfff0c0, k: 0.22, light: 2.4 });
  },
};
