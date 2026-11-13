// District V — The Undercroft. Down the stair from the drowned nave into the catacombs: the stair foot
// where the tide seeps in, the bone gallery, the collapsed passage over the buried stream, the hall of
// effigies, the crypt chapel, and the Ossuary, where the Ossuary Knight keeps the names of the dead.
// Underground: no rain, the vault lost in the dark above the tall far walls, moonlight only where the
// street grates far overhead let it fall.
import * as P from '../props/undercroft.js';

const WALKS = [
  [0.4, -8.4, 10.4, 16.4],      // the stair foot and the bone gallery
  [-17.4, -8.4, 0.4, -1.6],     // the collapsed passage and the stream
  [-17.4, -23.4, -7.65, -8.4],  // the hall of effigies
  [-8, -23.4, 0.4, -15.2],      // the crypt chapel
  [0.4, -37.4, 22.4, -15.2],    // the Ossuary
  [15.1, -41.6, 17.7, -37.4],   // the way down
];
const BOUNDS = [-17.8, -41.6, 23, 16.8];

export default {
  id: 'undercroft', name: 'The Undercroft', tagline: 'BENEATH THE TIDE, THE OLDER DEAD.', tier: 4,
  start: { x: 5.4, z: 13.6, face: Math.PI },
  bounds: BOUNDS,
  gatesOpen: ['stairGate', 'effigyGate', 'ossuaryGate'],
  ambience: {
    fog: 0x131820, fogNear: 78, fogFar: 175, sky: 0x020304, moon: 0.9, moonColor: 0x8ea4cc, hemi: 1.0, hemiSky: 0x4a5874, hemiGround: 0x0a0c10,
    fill: 1.7, fillColor: 0x6a7898, ambient: 0x141a28, ambientI: 0.6, rain: 0, lightning: false,
    // short shafts through the street grates (the ceiling is lost in the dark); none over the stream,
    // whose shaft would lie across the hall of effigies behind it. (Lengths chosen so the shaft's top
    // vertex colour stays finite: atmos computes pow(1 - t, 1.4) with t a hair over 1 for some lengths.)
    beams: [
      { x: 5.6, z: 11, r: 2.4, h: 8, from: [1.4, 0, 1.4], intensity: 22 },
      { x: 11.4, z: -26.3, r: 6.5, h: 14, from: [1.5, 0, -2.5], intensity: 58 },
    ],
  },
  lamps: [{ id: 'stair', x: 2.4, z: 9.6, sx: 1.3, sz: 0.3 }, { id: 'chapel', x: -1.2, z: -16.6, sx: 0, sz: -1.4 }],
  items: [{ id: 'c1', x: -15.9, z: -4.2, ry: Math.PI / 2, kind: 'embers', amount: 110 }, { id: 'c2', x: -16.1, z: -21.8, ry: Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [3, 10.5, 9.5, 16], text: 'THE TIDE STOPS AT THE STAIR. THE DEAD DO NOT.' },
    { zone: [3, 6.4, 8, 8.6], text: 'RATS COME IN SWARMS. SWING WIDE, KEEP MOVING.' },
    { zone: [-14.5, -7.9, -10.5, -5.6], text: 'A CHANTER SHIELDS THE DEAD. CUT IT DOWN FIRST.' },
    { zone: [-3.2, -22.4, 0.1, -16], text: 'BEYOND THE BARS, SOMEONE IS READING NAMES.' },
  ],
  foes: [
    // the passage: one of the hushed at the bridge, a swarm in the rubble, a ghoul and a shade beyond
    { t: 'hushed', x: -8.6, z: -5.2 },
    { t: 'rat', x: -10.6, z: -3 }, { t: 'rat', x: -11.2, z: -4.2 }, { t: 'rat', x: -10, z: -4.6 }, { t: 'rat', x: -11.9, z: -3.2 }, { t: 'rat', x: -12.4, z: -4.4 },
    { t: 'ghoul', x: -14.2, z: -6.8 }, { t: 'shade', x: -15.6, z: -2.8 },
    // the chapel
    { t: 'hushed', x: -5.6, z: -17.4 }, { t: 'hound', x: -2.6, z: -18.4 },
  ],
  encounters: [
    { id: 'gallery', zone: [1.4, 1.2, 9.6, 5], gates: ['stairGate'], opens: ['boneGate'], msg: 'THE BONES STIR', done: 'A GRILLE GRINDS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'rat', x: 2.4, z: -6.8 }, { t: 'rat', x: 3.2, z: -6.2 }, { t: 'rat', x: 2, z: -6 }, { t: 'rat', x: 4.4, z: -6.6 }, { t: 'rat', x: 2.8, z: -7.4 }, { t: 'hushed', x: 5.2, z: -5 }, { t: 'hushed', x: 7.2, z: -6 }] },
        { foes: [{ t: 'hound', x: 2.2, z: -1 }, { t: 'hound', x: 8.6, z: -0.6 }, { t: 'ghoul', x: 4.8, z: -6.6 }, { t: 'hushed', x: 8, z: -6.4 }] },
      ] },
    // no shades in this locked hall: their blinks would land beyond its walls
    { id: 'effigies', zone: [-16.4, -13.2, -8.8, -9.4], gates: ['effigyGate'], opens: ['chapelGate'], msg: 'THE EFFIGIES ARE EMPTY', done: 'THE CHAPEL GRILLE OPENS',
      waves: [
        { pre: true, foes: [{ t: 'knight', x: -12.5, z: -19.4, face: 0 }, { t: 'hushed', x: -16.2, z: -19.8, face: 0 }, { t: 'hushed', x: -8.9, z: -20.4, face: 0 }] },
        { foes: [{ t: 'chanter', x: -12.5, z: -19.8 }, { t: 'hound', x: -16.2, z: -11.2 }, { t: 'hound', x: -8.9, z: -11.6 }, { t: 'hushed', x: -16, z: -20.4 }] },
      ] },
  ],
  boss: { type: 'ossuary', x: 11.4, z: -27, face: -0.96, zone: [2.2, -35.4, 20.6, -18.4], gates: ['ossuaryGate'], opens: ['exitGate', 'ossuaryGate'] },
  exit: { zone: [15.3, -41.2, 17.5, -38.2], to: 'foundry', requires: 'boss' },
  build(K, ctx) {
    const W = K.M;
    // the grilles that close off the fights are opaque to the dead (they cannot see through the bars)
    const screen = (x0, z0, x1, z1) => { K.fence(ctx, x0, z0, x1, z1, { h: 2.6 }); P.opaque(ctx, ctx.solids[ctx.solids.length - 1], x0 === x1 ? 'z' : 'x'); };
    const grilleGate = (name, x, z, w, axis, o) => { ctx.marks[name] = K.gate(ctx, x, z, w, axis, { h: 2.8, ...o }); P.opaque(ctx, ctx.marks[name].solid, axis); };

    // ------------------------------------------------ ground: the rock floor, cut open for the stream
    const earth = W.dirt('#232220');
    K.floor(ctx, -45, -75, -6.6, 45, earth); K.floor(ctx, -4.6, -75, 50, 45, earth);
    K.floor(ctx, -6.6, -75, -4.6, -13.8, earth); K.floor(ctx, -6.6, 9, -4.6, 45, earth);
    K.floor(ctx, 0.8, 6, 10.05, 16.05, W.flags('#4c5460'), 0.01, 0.3);
    K.floor(ctx, 0.8, -8, 10.05, 6, W.flags('#48505c'), 0.01, 0.3);
    K.floor(ctx, -4.6, -8, 0.8, -1.95, W.cobble('#444a56'), 0.01, 0.3);
    K.floor(ctx, -17, -8.4, -6.6, -1.95, W.cobble('#444a56'), 0.01, 0.3);
    K.floor(ctx, -17, -23, -7.65, -8.4, W.flags('#4c5462'), 0.01, 0.3);
    K.floor(ctx, -8, -23, 0.4, -15.55, W.court('#4e5664'), 0.01, 0.3);
    K.floor(ctx, 0.4, -37, 22.4, -15.55, W.flags('#4a525e'), 0.01, 0.3);
    K.floor(ctx, 15.1, -41.6, 17.7, -37.4, W.flags('#4a525e'), 0.01, 0.3);
    P.rockFill(ctx, BOUNDS, WALKS);

    // ------------------------------------------------ the stair foot (the way down from the nave)
    // tall from the gallery's middle on; its south end is broken low, or it would hide the passage behind it
    P.tallWall(ctx, 0.4, 3.4, 0.4, 16.4, { bay: 6.5, skipEnd: true, gaps: [{ a0: 10.6, a1: 14.6, ys: 2.4 }], lit: [0, 2], lights: [2] });
    P.stub(ctx, 0.4, -1.95, 0.4, 3.4, 0.6, 1.6, { thick: 0.8, solidH: 2, side: 1 });
    K.steps(ctx, 0.25, 12.6, 3.9, 9, 'x-', 0.24, 0.4, '#4a5260');
    for (const zz of [10.4, 14.8]) K.add(ctx, K.box(3.8, P.H, 0.4), W.brick('#262d39'), -1.7, P.H / 2, zz);
    K.add(ctx, K.box(0.4, P.H, 4.8), W.brick('#262d39'), -3.8, P.H / 2, 12.6);
    P.doorway(ctx, -3.58, 2.16, 12.6, 2.2, 2.6);
    K.solid(ctx, -4, 10.2, 0.45, 15, P.H);
    P.candles(ctx, -0.95, 0.96, 11.3, { n: 3, spread: 0.12 }); P.candles(ctx, -1.75, 1.44, 13.9, { n: 2, spread: 0.1 });
    P.candles(ctx, 1.25, 0.02, 11.1, { n: 5, spread: 0.25, light: true, intensity: 2.6, dist: 5.5 });
    K.puddle(ctx, 1.9, 12.6, 1.8, 2.6); K.puddle(ctx, 3.6, 14.4, 1.2, 0.8); K.puddle(ctx, 4.8, 9.2, 1.4, 1);
    P.stub(ctx, 0.8, 16.4, 10.75, 16.4, 0.4, 1.1);
    P.stub(ctx, 10.4, -8, 10.4, 16.4, 0.5, 1.6);
    P.sarcophagus(ctx, 8.6, 12.8, { kind: 'open', ry: 0.08 });
    P.bonePile(ctx, 9.2, 8.4, 0.7, 9); P.bonePile(ctx, 7.6, 15.4, 0.5, 5); P.bonePile(ctx, 1.6, 7.2, 0.6, 7);
    P.grateLight(ctx, 5.6, 11, 2.6);
    K.fallenBody(ctx, 6.8, 9.4, 2.4, 0x1c1a1c); K.droppedSword(ctx, 7.6, 8.8, 0.9);

    // ------------------------------------------------ the gallery grille
    screen(0.8, 6, 3.7, 6); grilleGate('stairGate', 5.4, 6, 2.6, 'x', { open: true, swingDir: -1 }); screen(7.1, 6, 10.05, 6);

    // ------------------------------------------------ the bone gallery (first fight)
    // tall over the gallery; low over the passage's west half, or it would hide the hall of effigies
    P.tallWall(ctx, -2.8, -8.4, 10.4, -8.4, { bay: 6.6, skipEnd: true, skip: [[-0.4, 1]], lit: [0, 1, 3], lights: [0, 1] });
    P.stub(ctx, -8, -8.4, -6.75, -8.4, 0.6, 1.3, { thick: 0.8, solidH: 2, side: 1 }); P.stub(ctx, -4.45, -8.4, -2.8, -8.4, 0.7, 1.5, { thick: 0.8, solidH: 2, side: 1 });
    P.pier(ctx, -8, -8.4, 2.6);
    P.skullMound(ctx, 6.4, -7, 1.0, 6, { half: 'z' });
    P.candles(ctx, 5.2, 0.02, -6.4, { n: 4, spread: 0.2 }); P.candles(ctx, 7.6, 0.02, -6.2, { n: 4, spread: 0.2, light: true, intensity: 2.8, dist: 6, lx: -1.2, lz: 0.4 });
    P.ossuaryBin(ctx, 9.35, 1.2, 'z', 2.2); P.ossuaryBin(ctx, 9.35, -4.4, 'z', 2.2);
    P.candles(ctx, 9.3, 0.64, 2.0, { n: 3, spread: 0.12, light: true, intensity: 2.2, dist: 5, lx: -0.8 });
    P.bonePile(ctx, 2.6, -6.4, 0.9, 12); P.bonePile(ctx, 1.5, -2.8, 0.6, 6); P.bonePile(ctx, 1.5, 3.4, 0.5, 5); P.bonePile(ctx, 8.4, -2, 0.4, 4);
    P.slab(ctx, 4, 2); P.slab(ctx, 6.8, -1.4); P.slab(ctx, 3.6, -2.8); P.slab(ctx, 5.4, -4.6, 1.57);
    K.fallenBody(ctx, 6.6, 3, -0.6); K.droppedSword(ctx, 5.6, 3.6, 2.2);
    // outside the gallery's broken east wall: the older dead, heaped in the dark
    P.bonePile(ctx, 12.4, 4, 1.2, 14); P.bonePile(ctx, 13.6, -3, 1, 10); P.bonePile(ctx, 12, 12.4, 0.9, 8);
    P.rubble(ctx, 13.2, 8.8, 2.4, 2, { solid: false }); P.rubble(ctx, 12.6, -6.6, 1.8, 1.6, { solid: false });
    P.sarcophagus(ctx, 13.4, 0.8, { kind: 'broken', ry: 0.3 });

    // ------------------------------------------------ the bone grille into the passage
    screen(0.4, -8, 0.4, -6.6); grilleGate('boneGate', 0.4, -5, 2.4, 'z', { swingDir: -1 }); screen(0.4, -3.4, 0.4, -1.95);

    // ------------------------------------------------ the collapsed passage and the stream
    P.tallWall(ctx, -17.4, -23.8, -17.4, -1.6, { bay: 5.55, skipStart: true, skipEnd: true, skip: [[-24, -22.2]], lit: [1, 3, 5], lights: [3, 5] });
    P.stub(ctx, -17, -1.6, -6.75, -1.6, 0.4, 1.4); P.stub(ctx, -4.45, -1.6, 0, -1.6, 0.4, 1.2);
    P.rubble(ctx, -1.9, -6.9, 3, 2.2, { h: 1.4, bones: 6 }); P.rubble(ctx, -2.4, -2.3, 1.6, 1, { h: 0.8, rib: false });
    K.floor(ctx, -4.4, -6, -0.4, -2.8, W.dirt('#33312e'), 0.016, 0.02); K.floor(ctx, -3.6, -7.9, -0.6, -5.8, W.dirt('#33312e'), 0.016, 0.02);
    P.stream(ctx, -6.6, -13.8, -4.6, 9);
    P.footbridge(ctx, -7, -4.2, -6.3, -3.7, -6.35, -4.85);
    P.waterSolid(ctx, -6.6, -8.4, -4.6, -6.3); P.waterSolid(ctx, -6.6, -3.7, -4.6, -1.25);
    P.bars(ctx, -6.6, -4.6, -8.05, P.WATER_Y, 1.0, 'x');
    P.candles(ctx, -4.38, 1.05, -6.17, { n: 3, spread: 0.1, light: true, intensity: 2.2, dist: 5, lz: 0.6 });
    ctx.lights.push({ x: -5.6, y: 1.2, z: -5, color: 0x6a8ab4, intensity: 2.6, dist: 6 });
    P.grateLight(ctx, -5.6, -5, 2.4);
    P.sarcophagus(ctx, -9.6, -7.1, { kind: 'broken', ry: Math.PI / 2, w: 0.9, l: 2 });
    P.bonePile(ctx, -11.2, -3.8, 1.1, 14); P.bonePile(ctx, -15.8, -7.2, 0.6, 6); P.bonePile(ctx, -8.2, -2.6, 0.5, 5);
    // where the stream goes: under the passage's broken south wall, into the dark
    P.rubble(ctx, -5.6, 9.6, 2.8, 1.8, { solid: false, rib: false }); P.bonePile(ctx, -2.4, 3, 1, 9); P.bonePile(ctx, -10, 1.2, 1, 9);
    P.rubble(ctx, -11.4, 4.6, 2.6, 2.2, { solid: false });

    // ------------------------------------------------ the effigy grille
    screen(-17, -8.4, -14.2, -8.4); grilleGate('effigyGate', -12.5, -8.4, 2.6, 'x', { open: true, swingDir: 1 }); screen(-10.8, -8.4, -8, -8.4);

    // ------------------------------------------------ the hall of effigies (second fight)
    P.tallWall(ctx, -17.8, -23.4, 0.8, -23.4, { pilasters: [-15.2, -9.8, -6.2, -1.4], skip: [[-8.9, -7.1], [-5.9, -1.7]], lit: [0, 2] });
    P.stub(ctx, -7.65, -15.55, -7.65, -8.8, 0.5, 1.4);
    P.sarcophagus(ctx, -14.6, -13.4, { knight: true, hound: true });
    P.sarcophagus(ctx, -10.4, -13.4, { kind: 'open' });
    P.sarcophagus(ctx, -14.6, -18, { kind: 'broken', candles: true, light: true });
    P.sarcophagus(ctx, -10.4, -18, { knight: true });
    P.sarcophagus(ctx, -12.5, -21.6, { ry: Math.PI / 2, w: 1.2, l: 2.6, knight: true, hound: true, tone: '#525a68', candles: true, light: true });
    P.slab(ctx, -12.5, -11.4); P.slab(ctx, -12.5, -15.7); P.slab(ctx, -16, -10.6, 1.57);
    P.bonePile(ctx, -16.2, -12.6, 0.6, 7); P.bonePile(ctx, -8.8, -21.8, 0.6, 7); P.bonePile(ctx, -9, -9.4, 0.4, 4);
    P.candles(ctx, -16.4, 0.02, -16.4, { n: 4, spread: 0.18 }); P.candles(ctx, -8.8, 0.02, -14.4, { n: 3, spread: 0.15 });
    // the rock band beyond the hall's broken east wall: the stream rises from a spring in the rubble
    P.rubble(ctx, -5.6, -14.4, 2.8, 1.4, { solid: false, rib: false, h: 0.9 });
    P.bonePile(ctx, -2, -11.6, 1.2, 12); P.bonePile(ctx, 4.4, -12.4, 1.4, 14); P.rubble(ctx, 8, -11, 2.4, 2, { solid: false });
    P.sarcophagus(ctx, -1.4, -13.6, { kind: 'open', ry: 1.2 });

    // ------------------------------------------------ the chapel grille
    screen(-8, -23, -8, -20.9); grilleGate('chapelGate', -8, -19.3, 2.4, 'z', { swingDir: 1 }); screen(-8, -17.7, -8, -15.55);
    P.pier(ctx, -8, -15.2);

    // ------------------------------------------------ the crypt chapel (the last lamp)
    P.stub(ctx, -7.6, -15.2, 0, -15.2, 0.5, 1.3);
    P.altar(ctx, -3.8, -22);
    K.statue(ctx, -6.4, -22, 0.3); K.statue(ctx, -1.2, -22, -0.3);
    P.kneeler(ctx, -5.4, -20.6); P.kneeler(ctx, -2.2, -20.6);
    P.votive(ctx, -6.6, -16.4, { light: true });
    P.slab(ctx, -3.8, -18); P.slab(ctx, -5.8, -18.6, 0.1);
    P.candles(ctx, -0.6, 0.02, -22.4, { n: 4, spread: 0.18 });

    // ------------------------------------------------ the Ossuary grille
    screen(0.4, -23, 0.4, -21); grilleGate('ossuaryGate', 0.4, -19.3, 2.6, 'z', { open: true, swingDir: 1 }); screen(0.4, -17.6, 0.4, -15.55);
    P.pier(ctx, 0.4, -15.2);

    // ------------------------------------------------ the Ossuary (the Knight's hall)
    P.tallWall(ctx, 0.4, -37.8, 0.4, -23, { bay: 5, skipStart: true, skipEnd: true, endFade: false, skip: [[-38, -36.2]], lit: [0, 2, 4] });
    P.tallWall(ctx, 0, -37.4, 22.75, -37.4, { pilasters: [10.4, 13.6, 20.2], gaps: [{ a0: 15.1, a1: 17.7, ys: 2.9 }], skip: [[-1, 1.6], [4.2, 8.6]], lit: [0, 2] });
    P.stub(ctx, 0.4, -15.2, 22.75, -15.2, 0.5, 1.5);
    P.stub(ctx, 22.4, -37, 22.4, -15.55, 0.5, 1.5);
    grilleGate('exitGate', 16.4, -37.4, 2.6, 'x', { piers: false, swingDir: 1 });
    P.skullShrine(ctx, 6.4, -37, 2.8);
    P.nameRing(ctx, 11.4, -26.3, 6);
    P.grateLight(ctx, 11.4, -26.3, 4.2);
    for (const [x, z, o] of [[2.8, -35, {}], [11.4, -35, {}], [20, -35, {}], [2.8, -26.3, {}], [2.8, -17.6, {}], [20, -26.3, { broken: 2 }], [11.4, -17.6, { broken: 1.6 }], [20, -17.6, { broken: 1 }]]) P.bonePillar(ctx, x, z, o);
    P.candles(ctx, 3.6, 0.02, -34.2, { n: 5, spread: 0.25, light: true, intensity: 2.8, dist: 6 });
    P.candles(ctx, 12.2, 0.02, -34.2, { n: 4, spread: 0.25, light: true, intensity: 2.6, dist: 6 });
    P.candles(ctx, 3.6, 0.02, -25.5, { n: 4, spread: 0.25, light: true, intensity: 2.6, dist: 6 });
    P.candles(ctx, 19.2, 0.02, -34.2, { n: 3, spread: 0.2 }); P.candles(ctx, 3.6, 0.02, -18.4, { n: 3, spread: 0.2 });
    P.skullMound(ctx, 1.9, -35.9, 1.0, 6, { half: 'x' }); P.skullMound(ctx, 21.2, -36, 0.9, 5, { half: 'z' });
    P.bonePile(ctx, 8, -36.2, 0.6, 6); P.bonePile(ctx, 1.6, -30.6, 0.5, 5); P.bonePile(ctx, 21, -22, 0.6, 6); P.bonePile(ctx, 14.6, -16.6, 0.5, 5);
    P.slab(ctx, 6.2, -21); P.slab(ctx, 16.6, -21.4); P.slab(ctx, 6, -31.8); P.slab(ctx, 17, -31.4, 0.2);
    K.fallenBody(ctx, 8.6, -21.4, 0.7); K.droppedSword(ctx, 9.4, -20.6, 1.9); K.fallenBody(ctx, 15.4, -30.2, -1.2, 0x1c1a1c);
    // the way down to the foundries: warm air rising from below
    for (const xx of [14.8, 18]) K.add(ctx, K.box(0.6, P.H, 4.4), W.brick('#262d39'), xx, P.H / 2, -39.6);
    P.heatGlow(ctx, 16.4, 1.4, -41, 2.6, 2.8);
    ctx.lights.push({ x: 16.4, y: 0.8, z: -39.6, color: 0xff7a30, intensity: 3, dist: 6, flicker: 0.1 });
    // beyond the Ossuary's broken walls
    P.bonePile(ctx, 24.6, -24, 1.4, 12); P.rubble(ctx, 25, -32, 2.6, 2.2, { solid: false }); P.bonePile(ctx, 14, -13.2, 1, 9);

    // ------------------------------------------------ dust in the shafts of moonlight
    P.motes(ctx, [[5.6, 11, 1.2, 10], [-5.6, -5, 1.1, 8], [11.4, -26.3, 2.6, 24]]);
  },
};
