// Act V, region I — The Ribcage Cathedral. (PROPOSAL: names and texts in this file are proposals for the author.)
// The wardens walk into God's dream through the throat of a colossal bronze body lying in the dark, and find a
// church grown in its chest: the nave of its ribs vaulting overhead, the ossuary of its fingers, the left lung
// breathing warm mist out of its folds, the spine laid across the dark as a bridge, the choir of its teeth, the
// sternum chapel, and at the end the heart, as big as a chapel, beating; every beat runs out along the veins.
import * as P from '../props/ribs.js';
import * as D from '../props/dream.js';
import { slab, span, voidFill, deepFloor, W4 } from '../kit4.js';

const DARK = P.DARK;
const ROOMS = [
  [-4, 8, 10, 18],         // the throat gate
  [-10, -16, 16, 2],       // the nave of ribs (first fight)
  [-28, -12, -16, 0],      // the ossuary of fingers (a side fight)
  [-12, -46, 18, -22],     // the left lung
  [-2, -72, 8, -52],       // the spine bridge
  [14, -68, 26, -56],      // the choir of teeth (a side fight)
  [-10, -100, 16, -78],    // the sternum chapel
  [-14, -138, 22, -106],   // the heart chamber (the last fight)
];
const WAYS = [[1.4, 2, 4.6, 8], [-16, -8, -10, -4], [1.4, -22, 4.6, -16], [1.4, -52, 4.6, -46], [8, -64, 14, -60], [1.4, -78, 4.6, -72], [1.4, -106, 4.6, -100], [2.4, -144, 5.6, -138]];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-32, -148, 30, 22];

export default {
  id: 'ribs', name: 'The Ribcage Cathedral', tagline: 'A CHURCH GROWN INSIDE THE RIBS OF A SLEEPING GOD OF BRONZE.', tier: 20, act: 5,
  start: { x: 3, z: 16, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['throatGate', 'ossuaryGate', 'teethGate'],
  ambience: {
    fog: 0x1a0c06, fogNear: 54, fogFar: 128, background: DARK, moon: 1.3, moonColor: 0xffc890, moonDir: [0.3, 1, -0.6], hemi: 1.2, hemiSky: 0xd89a68, hemiGround: 0x0e0604,
    fill: 1.2, fillColor: 0xe0a070, ambient: 0x221208, ambientI: 0.9, rain: 0, drizzle: 0, lightning: false, weather: 'embers',
    grade: { gain: [1.08, 0.96, 0.86], lift: [0.02, 0.008, 0.0], sat: 0.96, vignette: 0.52, bloom: 0.44 },
    beams: [],
  },
  lamps: [{ id: 'throat', x: -2.4, z: 12, sx: 1.3, sz: 0.3 }, { id: 'teeth', x: 24.4, z: -62, sx: -1.3, sz: 0 }],
  items: [
    { id: 'c1', x: -26, z: -2, ry: Math.PI / 2, kind: 'embers', amount: 700 },
    { id: 'c2', x: 24.6, z: -66.4, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: 6.4, z: -56, ry: -Math.PI / 2, kind: 'embers', amount: 520 },
  ],
  hints: [
    { zone: [-4, 12, 10, 18], text: 'YOU ARE INSIDE HIM NOW. LISTEN: HE BREATHES.' },
    { zone: [1.4, -20, 4.6, -16], text: 'THE RIBS ARE WARM. SOMETHING BUILT A CHURCH IN HERE.' },
    { zone: [-16, -8, -13, -4], text: 'HIS FINGERS. EACH LONGER THAN A MAN.' },
    { zone: [1.4, -52, 4.6, -48], text: 'THE SPINE. DO NOT LOOK DOWN.' },
    { zone: [1.4, -106, 4.6, -102], text: 'THE HEART. IT HAS NOT STOPPED IN A THOUSAND YEARS.' },
  ],
  foes: [{ t: 'homunculus', x: 3, z: -1 }, { t: 'thought', x: 3, z: -48 }, { t: 'nightmare', x: 3, z: -75 }],
  encounters: [
    { id: 'nave', zone: [-9.4, -15.4, 15.4, 1.4], gates: ['throatGate', 'ossuaryGate'], opens: ['lungGate', 'ossuaryGate'], msg: 'THE RIBS CREAK. SOMETHING CRAWLS OUT OF THE BRONZE.', done: 'THE NAVE IS STILL',
      waves: [
        { pre: true, foes: [{ t: 'homunculus', x: -5, z: -7 }, { t: 'homunculus', x: 0, z: -10 }, { t: 'homunculus', x: 10, z: -9 }, { t: 'memoryknight', x: 4, z: -13 }] },
        { foes: [{ t: 'thought', x: -6, z: -13 }, { t: 'thought', x: 13, z: -13 }, { t: 'homunculus', x: 4, z: -2 }, { t: 'homunculus', x: 8, z: -4 }, { t: 'nightmare', x: -2, z: -2 }] },
      ] },
    { id: 'ossuary', zone: [-27.4, -11.4, -16.6, -0.6], gates: ['ossuaryGate'], opens: ['ossuaryGate'], msg: 'THE FINGERS TWITCH', done: 'THE OSSUARY SLEEPS',
      waves: [
        { pre: true, foes: [{ t: 'homunculus', x: -25, z: -9 }, { t: 'homunculus', x: -18, z: -5 }, { t: 'nightmare', x: -22, z: -6 }] },
        { foes: [{ t: 'memoryknight', x: -22, z: -3 }, { t: 'dawnling', x: -25, z: -9 }, { t: 'homunculus', x: -18, z: -10 }] },
      ] },
    { id: 'lung', zone: [-11.4, -45.4, 17.4, -22.6], gates: ['lungGate'], opens: ['spineGate', 'lungGate'], msg: 'THE LUNG BREATHES OUT. SOMETHING CAME WITH THE BREATH.', done: 'THE LUNG SIGHS AND IS STILL',
      waves: [
        { pre: true, foes: [{ t: 'sleepwalker', x: 3, z: -36 }, { t: 'homunculus', x: -6, z: -28 }, { t: 'homunculus', x: 12, z: -28 }, { t: 'thought', x: -4, z: -42 }] },
        { foes: [{ t: 'memoryknight', x: -6, z: -40 }, { t: 'memoryknight', x: 13, z: -40 }, { t: 'dawnling', x: 3, z: -26 }, { t: 'nightmare', x: 8, z: -32 }] },
        { foes: [{ t: 'thought', x: -8, z: -30 }, { t: 'thought', x: 14, z: -30 }, { t: 'homunculus', x: 0, z: -43 }, { t: 'homunculus', x: 6, z: -43 }, { t: 'nightmare', x: 3, z: -24 }] },
      ] },
    { id: 'spine', zone: [-1.4, -71.4, 7.4, -52.6], gates: ['spineGate', 'teethGate'], opens: ['chapelGate', 'teethGate'], msg: 'THE SPINE SHUDDERS UNDER YOU', done: 'THE SPINE IS STILL',
      waves: [
        { pre: true, foes: [{ t: 'nightmare', x: 1, z: -58 }, { t: 'nightmare', x: 6, z: -66 }, { t: 'thought', x: 3, z: -70 }] },
        { foes: [{ t: 'memoryknight', x: 3, z: -68 }, { t: 'homunculus', x: 0, z: -60 }, { t: 'homunculus', x: 6, z: -60 }, { t: 'dawnling', x: 3, z: -55 }] },
      ] },
    { id: 'teeth', zone: [14.6, -67.4, 25.4, -56.6], gates: ['teethGate'], opens: ['teethGate'], msg: 'THE TEETH GRIND', done: 'THE CHOIR OF TEETH IS SILENT',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: 20, z: -65 }, { t: 'homunculus', x: 17, z: -58 }, { t: 'homunculus', x: 23, z: -58 }] },
        { foes: [{ t: 'nightmare', x: 20, z: -62 }, { t: 'dawnling', x: 23, z: -66 }, { t: 'thought', x: 17, z: -66 }] },
      ] },
    { id: 'chapel', zone: [-9.4, -99.4, 15.4, -78.6], gates: ['chapelGate'], opens: ['heartGate', 'chapelGate'], msg: 'THE STERNUM CHAPEL WAKES. THE CANDLES FLARE.', done: 'THE CANDLES SINK LOW',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: -5, z: -84 }, { t: 'memoryknight', x: 11, z: -84 }, { t: 'dawnling', x: 3, z: -89 }, { t: 'homunculus', x: -2, z: -92 }, { t: 'homunculus', x: 8, z: -92 }] },
        { foes: [{ t: 'sleepwalker', x: 3, z: -82 }, { t: 'thought', x: -7, z: -96 }, { t: 'thought', x: 13, z: -96 }, { t: 'nightmare', x: -4, z: -88 }, { t: 'nightmare', x: 10, z: -88 }] },
      ] },
    { id: 'heart', zone: [-13.4, -137.4, 21.4, -106.6], gates: ['heartGate'], opens: ['exitGate'], msg: 'THE HEART BEATS FASTER. THE DREAM KNOWS YOU ARE HERE.', done: 'THE HEART SLOWS AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'memoryknight', x: -8, z: -112 }, { t: 'memoryknight', x: 16, z: -112 }, { t: 'sleepwalker', x: -6, z: -130 }, { t: 'homunculus', x: 4, z: -110 }, { t: 'homunculus', x: 8, z: -114 }] },
        { foes: [{ t: 'thought', x: -10, z: -122 }, { t: 'thought', x: 18, z: -122 }, { t: 'nightmare', x: -4, z: -112 }, { t: 'nightmare', x: 12, z: -112 }, { t: 'dawnling', x: 4, z: -134 }, { t: 'homunculus', x: 14, z: -130 }] },
        { foes: [{ t: 'sleepwalker', x: 14, z: -130 }, { t: 'memoryknight', x: 4, z: -110 }, { t: 'dawnling', x: -10, z: -110 }, { t: 'dawnling', x: 18, z: -110 }, { t: 'homunculus', x: -6, z: -120 }, { t: 'homunculus', x: 14, z: -120 }] },
      ] },
  ],
  minibosses: [{ from: 'act3', x: 3, z: -34 }, { from: 'act2', x: 3, z: -89 }],
  exit: { zone: [2.6, -143.6, 5.4, -142] },
  build(K, ctx) {
    deepFloor(ctx, BOUNDS, 0x080402, { y: -16 });
    const plateM = W4.gold('#5a3a1e'), chapelM = W4.gold('#6a4422'), wayM = D.darkBronze();
    for (const r of ROOMS) slab(ctx, ...r, r === ROOMS[6] || r === ROOMS[7] ? chapelM : plateM, DARK, { kerb: D.dreamBronze(), rockTone: '#3a2618' });
    for (const r of WAYS) span(ctx, ...r, wayM, DARK);
    voidFill(ctx, BOUNDS, WALKS);
    for (const r of ROOMS) P.plates(ctx, ...r);
    D.motes(ctx, [[-30, -146, 28, 20]], 220, { color: 0xffa060, rise: 0.4, h: 9 });

    // ------------------------------------------------ the throat gate: vertebrae, the frozen at prayer
    P.vertebra(ctx, -2.6, 16.4, 4.6); P.vertebra(ctx, 8.6, 16.4, 4.6);
    P.ribArch(ctx, 3, 12, 13, 6, 'x');
    for (const [x, z, r] of [[-2, 11, Math.PI * 0.8], [8, 11, -Math.PI * 0.8], [1, 14, Math.PI], [5, 14, Math.PI]]) P.prayer(ctx, x, z, r);
    P.sinews(ctx, 3, 12, 3);
    K.fallenBody(ctx, 5.4, 10, 1.2, 0x1a0c06); K.droppedSword(ctx, 6.2, 10.6, 2.4);
    ctx.marks.throatGate = D.barrier5(ctx, 3, 4.4, 4, 'x', 'ribs', { open: true });

    // ------------------------------------------------ the nave of ribs: the vault overhead
    for (const z of [0, -5, -10, -15]) P.ribArch(ctx, 3, z, 26, 9, 'x');
    for (const [x, z] of [[-8.6, -2.5], [14.6, -2.5], [-8.6, -12.5], [14.6, -12.5]]) P.vertebra(ctx, x, z, 3.6);
    P.sinews(ctx, -2, -8, 4); P.sinews(ctx, 9, -6, 4);
    for (const [x, z, r] of [[-5, -15, 0.3], [11, -15, -0.3]]) P.prayer(ctx, x, z, r);
    D.vein(ctx, [3, 2], [3, -16], 0xff6a20, { w: 0.18, k: 2 });
    ctx.marks.ossuaryGate = D.barrier5(ctx, -13, -6, 4, 'z', 'ribs', { open: true });

    // ------------------------------------------------ the ossuary of fingers
    P.finger(ctx, -24, -3, 0.4, 1.1); P.finger(ctx, -21, -9.6, -1.2, 1.0); P.finger(ctx, -19.4, -2, 1.9, 0.9);
    P.ribArch(ctx, -22, -6, 11, 5, 'z');
    P.sinews(ctx, -22, -6, 3);

    // ------------------------------------------------ the left lung: breathing walls of folds, warm mist
    P.lungWall(ctx, -12, -46, -12, -22, 5); P.lungWall(ctx, 18, -46, 18, -22, 5);
    P.lungWall(ctx, -12, -46, 1.2, -46, 4); P.lungWall(ctx, 4.8, -46, 18, -46, 4);
    for (const z of [-26, -34, -42]) P.ribArch(ctx, 3, z, 30, 10, 'x');
    for (const [x, z] of [[-6, -30], [12, -30], [-6, -40], [12, -40]]) D.breathGlow(ctx, x, 1.4, z, 3, 0xff9060, 0.7);
    D.motes(ctx, [[-11, -45, 17, -23]], 90, { color: 0xffd0b0, rise: 0.25, h: 6, k: 1.2 });
    ctx.marks.lungGate = D.barrier5(ctx, 3, -18, 4, 'x', 'ribs');

    // ------------------------------------------------ the spine bridge: vertebrae laid over the dark
    P.spineKerb(ctx, -2, -72, -2, -52); P.spineKerb(ctx, 8, -72, 8, -64.5); P.spineKerb(ctx, 8, -59.5, 8, -52);
    for (const z of [-56, -64, -70]) P.ribArch(ctx, 3, z, 11, 5, 'x');
    P.sinews(ctx, 3, -62, 4);
    ctx.marks.spineGate = D.barrier5(ctx, 3, -48, 4, 'x', 'ribs');
    ctx.marks.teethGate = D.barrier5(ctx, 11, -62, 4, 'z', 'ribs', { open: true });

    // ------------------------------------------------ the choir of teeth
    P.teeth(ctx, 26, -68, 26, -56); P.teeth(ctx, 15, -68, 26, -68); P.teeth(ctx, 15, -56, 26, -56);
    D.breathGlow(ctx, 20, 1.2, -62, 4, 0xffc080, 0.8);

    // ------------------------------------------------ the sternum chapel
    P.sternum(ctx, 3, -94, 0);
    for (const z of [-82, -90, -98]) P.ribArch(ctx, 3, z, 26, 9, 'x');
    for (const [x, z] of [[-8.6, -80], [14.6, -80], [-8.6, -98], [14.6, -98]]) P.vertebra(ctx, x, z, 4.2);
    for (const [x, z, r] of [[-4, -84, 0.6], [10, -84, -0.6], [-6, -92, 1.2], [12, -92, -1.2]]) P.prayer(ctx, x, z, r);
    P.sinews(ctx, -2, -88, 3); P.sinews(ctx, 9, -88, 3);
    ctx.marks.chapelGate = D.barrier5(ctx, 3, -75, 4, 'x', 'ribs');

    // ------------------------------------------------ the heart chamber
    P.heart(ctx, 4, -124, { veins: [[-12, -110], [20, -110], [-12, -136], [20, -136], [4, -107]] });
    for (const z of [-110, -118, -126, -134]) P.ribArch(ctx, 4, z, 34, 12, 'x');
    for (const [x, z] of [[-12.6, -108], [20.6, -108], [-12.6, -136], [20.6, -136]]) P.vertebra(ctx, x, z, 5.4);
    P.sinews(ctx, -6, -118, 5); P.sinews(ctx, 14, -118, 5); P.sinews(ctx, 4, -132, 4);
    K.fallenBody(ctx, 12, -110, 0.9, 0x1a0c06); K.droppedSword(ctx, 12.8, -109.4, 2.2);
    ctx.marks.heartGate = D.barrier5(ctx, 3, -103, 4, 'x', 'ribs');
    ctx.marks.exitGate = D.barrier5(ctx, 4, -139.6, 4, 'x', 'ribs');
  },
};
