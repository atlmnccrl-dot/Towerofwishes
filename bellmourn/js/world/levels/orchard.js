// Act IV, region II — The Glass Orchard. (PROPOSAL: names and texts in this file are proposals for the author.)
// Heaven's orchard fell with it and froze: terraces of pale glass-sand under a violet dusk, trees of stained glass
// whose fruit are the voices the Great Bell took, still singing softly inside clear glass. The wardens come in by
// the gate of glass brambles, cross the lower orchard (a gardener-angel still prunes there), pass the press where
// the fruit were crushed for their song, the grove of the bell-fruit tree, a terrace broken off over the dark,
// the greenhouse cathedral of gold ribs, its seed vault, and come at last under the Heart Tree, the orchard's
// first tree, with a choir frozen in its trunk.
import * as P from '../props/orchard.js';
import { slab, span, voidFill, deepFloor, barrier4, motes, W4 } from '../kit4.js';
import { VARIANTS } from '../../game/variants4.js';

const DUSK = P.DUSK;
const ROOMS = [
  [-4, 8, 10, 18],         // the gate of brambles
  [-9, -14, 15, 2],        // the lower orchard (first fight)
  [-26, -11, -15, 1],      // the press of voices (a side fight)
  [-7, -40, 13, -22],      // the grove of the bell-fruit tree
  [-4, -66, 10, -44],      // the broken terrace
  [-8, -94, 16, -72],      // the greenhouse cathedral
  [22, -88, 32, -76],      // the seed vault (a side fight)
  [-12, -126, 20, -100],   // under the Heart Tree (the last fight)
];
const WAYS = [
  [1.4, 2, 4.6, 8], [-15, -7, -9, -3], [1.4, -22, 4.6, -14], [1.4, -44, 4.6, -40], [1.4, -72, 4.6, -66],
  [16, -84, 22, -80], [1.4, -100, 4.6, -94], [2.4, -132, 5.6, -126],
];
const WALKS = [...ROOMS, ...WAYS];
const BOUNDS = [-30, -136, 36, 22];

export default {
  variants: VARIANTS.orchard, // the run's area variants (js/game/variants4.js)
  id: 'orchard', name: 'The Glass Orchard', tagline: 'TREES OF STAINED GLASS. THEIR FRUIT ARE THE VOICES THE BELL TOOK.', tier: 16, act: 4,
  start: { x: 3, z: 16, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['orchardGate', 'pressGate', 'vaultGate'],
  ambience: {
    fog: 0x1c1430, fogNear: 60, fogFar: 140, background: DUSK, moon: 1.5, moonColor: 0xd8c8ff, moonDir: [-0.3, 1, -0.4], hemi: 1.4, hemiSky: 0xb09ae8, hemiGround: 0x120a1c,
    fill: 1.3, fillColor: 0xc0a8f0, ambient: 0x221a34, ambientI: 0.9, rain: 0, drizzle: 0, lightning: false, weather: 'feathers',
    grade: { gain: [1.0, 0.95, 1.08], lift: [0.014, 0.004, 0.024], sat: 0.98, vignette: 0.45, bloom: 0.42 },
    beams: [],
  },
  lamps: [{ id: 'gate', x: -2.4, z: 12, sx: 1.3, sz: 0.3 }, { id: 'vault', x: 30.4, z: -82, sx: -1.3, sz: 0 }],
  items: [
    { id: 'c1', x: -24, z: -2, ry: Math.PI / 2, kind: 'embers', amount: 560 },
    { id: 'c2', x: 30.6, z: -86.4, ry: -Math.PI / 2, kind: 'tonic' },
    { id: 'c3', x: 8.6, z: -58, ry: -Math.PI / 2, kind: 'embers', amount: 420 },
  ],
  hints: [
    { zone: [-4, 12, 10, 18], text: 'EVERY FRUIT HERE IS A VOICE THE BELL TOOK. LISTEN.' },
    { zone: [1.4, -18, 4.6, -14], text: 'THE GARDENER STILL PRUNES. IT DOES NOT LOOK UP.' },
    { zone: [-15, -7, -12, -3], text: 'A PRESS. THEY CRUSHED THE FRUIT FOR THEIR SONG.' },
    { zone: [1.4, -44, 4.6, -41], text: 'THE TERRACE BROKE WHEN HEAVEN FELL. MIND THE EDGE.' },
    { zone: [1.4, -100, 4.6, -96], text: 'THE HEART TREE. THE FIRST TREE. SOMETHING SINGS INSIDE IT.' },
  ],
  foes: [
    { t: 'choirwraith', x: 3, z: 0 }, { t: 'glassknight', x: 10, z: -30 },
    { t: 'belljelly', x: 3, z: -42 }, { t: 'choirwraith', x: 3, z: -69 }, { t: 'belljelly', x: 26, z: -82 },
  ],
  encounters: [
    { id: 'lower', zone: [-8.4, -13.4, 14.4, 1.4], gates: ['orchardGate', 'pressGate'], opens: ['groveGate', 'pressGate'], msg: 'THE FRUIT CRACK OPEN. SOMETHING CLIMBS OUT.', done: 'THE ORCHARD IS QUIET',
      waves: [
        { pre: true, foes: [{ t: 'glassknight', x: -4, z: -6 }, { t: 'choirwraith', x: 10, z: -4 }, { t: 'glasshound', x: 2, z: -10 }, { t: 'glasshound', x: 6, z: -11 }] },
        { foes: [{ t: 'drownedangel', x: 12, z: -11 }, { t: 'belljelly', x: -5, z: -12 }, { t: 'glasshound', x: -6, z: -2 }, { t: 'choirwraith', x: 4, z: -1 }, { t: 'shardswarm', x: 8, z: -8 }] },
      ] },
    { id: 'press', zone: [-25.4, -10.4, -15.6, 0.4], gates: ['pressGate'], opens: ['pressGate'], msg: 'THE PRESS TURNS ON ITS OWN', done: 'THE VAT STILLS',
      waves: [
        { pre: true, foes: [{ t: 'shardswarm', x: -22, z: -8 }, { t: 'glasshound', x: -18, z: -1 }, { t: 'choirwraith', x: -24, z: -1 }] },
        { foes: [{ t: 'glassknight', x: -18, z: -9 }, { t: 'glasshound', x: -23, z: -5 }, { t: 'shardswarm', x: -17, z: -4 }] },
      ] },
    { id: 'grove', zone: [-6.4, -39.4, 12.4, -22.6], gates: ['groveGate'], opens: ['terraceGate', 'groveGate'], msg: 'THE BELL-FRUIT RING. THE GROVE WAKES.', done: 'THE BELLS FALL SILENT',
      waves: [
        { pre: true, foes: [{ t: 'glassknight', x: -3, z: -34 }, { t: 'glassknight', x: 8.6, z: -26.4 }, { t: 'belljelly', x: 2, z: -36 }, { t: 'glasshound', x: -2, z: -26 }] },
        { foes: [{ t: 'drownedangel', x: 9, z: -36 }, { t: 'shardswarm', x: -4, z: -30 }, { t: 'choirwraith', x: 11, z: -30 }, { t: 'glasshound', x: 4, z: -24 }, { t: 'glasshound', x: -2, z: -38 }] },
        { foes: [{ t: 'glassknight', x: 3, z: -38 }, { t: 'belljelly', x: -3, z: -25.6 }, { t: 'belljelly', x: 9, z: -25.6 }, { t: 'shardswarm', x: 4, z: -30 }] },
      ] },
    { id: 'terrace', zone: [-3.4, -65.4, 9.4, -44.6], gates: ['terraceGate'], opens: ['glassGate', 'terraceGate'], msg: 'SHARDS FALL FROM THE BROKEN SKY', done: 'THE EDGE IS STILL',
      waves: [
        { pre: true, foes: [{ t: 'glasshound', x: 0, z: -52 }, { t: 'glasshound', x: 7, z: -56 }, { t: 'shardswarm', x: 3, z: -62 }] },
        { foes: [{ t: 'drownedangel', x: 1, z: -60 }, { t: 'drownedangel', x: 7, z: -50 }, { t: 'choirwraith', x: 4, z: -63 }, { t: 'glasshound', x: -1, z: -47 }] },
      ] },
    { id: 'greenhouse', zone: [-7.4, -93.4, 15.4, -72.6], gates: ['glassGate', 'vaultGate'], opens: ['heartGate', 'vaultGate'], msg: 'THE PANES SHIVER. THE GREENHOUSE IS FULL OF THEM.', done: 'THE LAST PANE SETTLES',
      waves: [
        { pre: true, foes: [{ t: 'glassknight', x: -4, z: -78 }, { t: 'glassknight', x: 12, z: -78 }, { t: 'choirwraith', x: 4, z: -90 }, { t: 'shardswarm', x: 0, z: -86 }, { t: 'glasshound', x: 8, z: -84 }] },
        { foes: [{ t: 'drownedangel', x: -5, z: -90 }, { t: 'drownedangel', x: 13, z: -90 }, { t: 'belljelly', x: 4, z: -80 }, { t: 'glasshound', x: -2, z: -76 }, { t: 'glasshound', x: 10, z: -76 }] },
        { foes: [{ t: 'glassknight', x: 4, z: -88 }, { t: 'shardswarm', x: -4, z: -82 }, { t: 'shardswarm', x: 12, z: -82 }, { t: 'choirwraith', x: 4, z: -76 }] },
      ] },
    { id: 'vault', zone: [22.6, -87.4, 31.4, -76.6], gates: ['vaultGate'], opens: ['vaultGate'], msg: 'THE JARS RATTLE ON THEIR SHELVES', done: 'THE SEEDS SLEEP AGAIN',
      waves: [
        { pre: true, foes: [{ t: 'shardswarm', x: 27, z: -86 }, { t: 'glasshound', x: 25, z: -78 }, { t: 'glasshound', x: 29, z: -78 }] },
        { foes: [{ t: 'glassknight', x: 27, z: -82 }, { t: 'choirwraith', x: 24, z: -86 }, { t: 'belljelly', x: 30, z: -84 }] },
      ] },
    { id: 'heart', zone: [-11.4, -125.4, 19.4, -100.6], gates: ['heartGate'], opens: ['exitGate'], msg: 'THE HEART TREE SINGS. THE ORCHARD ANSWERS.', done: 'THE CHOIR IN THE TREE FALLS SILENT',
      waves: [
        { pre: true, foes: [{ t: 'glassknight', x: -6, z: -106 }, { t: 'glassknight', x: 14, z: -106 }, { t: 'drownedangel', x: -8, z: -118 }, { t: 'drownedangel', x: 16, z: -118 }, { t: 'glasshound', x: 4, z: -104 }] },
        { foes: [{ t: 'shardswarm', x: -6, z: -112 }, { t: 'shardswarm', x: 14, z: -112 }, { t: 'choirwraith', x: 4, z: -122 }, { t: 'belljelly', x: -4, z: -123 }, { t: 'belljelly', x: 12, z: -123 }, { t: 'glasshound', x: 4, z: -106 }] },
        { foes: [{ t: 'glassknight', x: 4, z: -122 }, { t: 'drownedangel', x: -8, z: -104 }, { t: 'drownedangel', x: 16, z: -104 }, { t: 'glasshound', x: -4, z: -116 }, { t: 'glasshound', x: 12, z: -116 }] },
      ] },
  ],
  minibosses: [{ from: 'act2', x: 4, z: -86 }, { from: 'act1', x: 4, z: -110 }],
  exit: { zone: [2.6, -131.6, 5.4, -130] },
  build(K, ctx) {
    // ------------------------------------------------ the dusk below, the terraces, the ways
    deepFloor(ctx, BOUNDS, 0x0a0614, { y: -16 });
    const sandM = W4.gsand('#b0a8c4'), groveM = W4.gsand('#c0b0d0'), wayM = W4.leaded(), kerbM = W4.gold('#9a7a3a');
    for (const r of ROOMS) slab(ctx, ...r, r === ROOMS[3] || r === ROOMS[7] ? groveM : sandM, DUSK, { kerb: kerbM, rockTone: '#4a4060' });
    for (const r of WAYS) span(ctx, ...r, wayM, DUSK, { rail: W4.gold('#8a6a2a') });
    voidFill(ctx, BOUNDS, WALKS);
    // glass petals drifting down everywhere, motes of song
    motes(ctx, [[-28, -134, 34, 20]], 240, { vy: -0.18, h: 10, y0: 0, color: 0xe0c8ff, add: true, k: 1.5, blink: true, sway: 0.7, seed: 4601 });
    motes(ctx, [[-28, -134, 34, 20]], 90, { vy: 0.1, h: 6, y0: 0, color: 0xffd0e8, add: true, k: 1.8, blink: true, sway: 0.3, seed: 4602 });

    // ------------------------------------------------ the gate of brambles
    P.brambleArch(ctx, 3, 8, 4.4, 'x');
    P.glassTree(ctx, -2.4, 16, { hue: 1, fruit: 2 }); P.glassTree(ctx, 8.4, 16.4, { hue: 0, fruit: 2 });
    P.glassTree(ctx, -2.6, 9.4, { hue: 2, broken: true, fruit: 0, light: false }); P.fallenTree(ctx, 8, 10.6, 0.6, 3.6);
    P.terrace(ctx, -4, 17.6, 10, 17.6, 1.1);
    P.shards(ctx, -3, 9, 9, 17, 22);
    P.fallingLight(ctx, 3, 13, 1.8);
    K.fallenBody(ctx, 5.4, 11.6, 1.2, 0x18122a); K.droppedSword(ctx, 6.2, 12.2, 2.4);
    ctx.marks.orchardGate = barrier4(ctx, 3, 4.4, 4, 'x', 'glass', { open: true });

    // ------------------------------------------------ the lower orchard (first fight): rows of trees, the gardener
    for (const [x, z, hue] of [[-6.4, -1, 0], [-6.6, -7, 1], [-6.2, -12.4, 2], [12.4, -0.8, 3], [12.6, -6.6, 4], [12.2, -12.2, 0]]) P.glassTree(ctx, x, z, { hue, fruit: 3 });
    P.glassTree(ctx, -1.8, -5, { hue: 4, fruit: 2, h: 3.2 }); P.glassTree(ctx, 8.4, -9.6, { hue: 1, fruit: 2, h: 3.4 });
    P.gardener(ctx, 3, -11.6, 0);
    P.fruitLantern(ctx, -8, -4); P.fruitLantern(ctx, 14, -4, 0xffd0e8);
    P.shards(ctx, -8, -13, 14, 1, 40);
    K.fallenBody(ctx, 9, -3, 0.6, 0x18122a);
    ctx.marks.pressGate = barrier4(ctx, -12, -5, 4, 'z', 'glass', { open: true });

    // ------------------------------------------------ the press of voices
    P.voicePress(ctx, -20.4, -5);
    P.terrace(ctx, -26, -11, -26, 1, 1.4); P.terrace(ctx, -26, -11, -15, -11, 1.0);
    P.glassTree(ctx, -24.4, 0, { hue: 2, fruit: 1 }); P.glassTree(ctx, -16.6, -10, { hue: 0, broken: true, fruit: 0, light: false });
    P.shards(ctx, -25, -10, -16, 0, 18);

    // ------------------------------------------------ the grove of the bell-fruit tree
    P.bellTree(ctx, 3, -31, { h: 5.6 });
    for (const [x, z, hue] of [[-5, -24, 2], [11, -24, 1], [-5.2, -38.4, 0], [11.2, -38.2, 3]]) P.glassTree(ctx, x, z, { hue, fruit: 3 });
    P.glassTree(ctx, -5.4, -31, { hue: 4, broken: true, fruit: 1 }); P.glassTree(ctx, 11.4, -31.2, { hue: 2, fruit: 2 });
    P.fruitLantern(ctx, 3, -23.4); P.fruitLantern(ctx, 3, -39);
    P.shards(ctx, -6, -39, 12, -23, 30);
    ctx.marks.groveGate = barrier4(ctx, 3, -18, 4, 'x', 'glass');

    // ------------------------------------------------ the broken terrace: the edge fell into the dark
    P.terrace(ctx, -4, -66, -4, -44, 1.2); P.terrace(ctx, 10, -66, 10, -54, 0.9);
    P.fallenTree(ctx, 6, -48, -0.4, 4.6); P.fallenTree(ctx, 0, -62, 2.4, 3.8);
    P.glassTree(ctx, -2.4, -52, { hue: 3, fruit: 2, lean: 0.35 }); P.glassTree(ctx, 8.4, -62, { hue: 0, broken: true, fruit: 1 });
    P.fallingLight(ctx, 3, -55, 2.2);
    P.shards(ctx, -3, -65, 9, -45, 36);
    K.fallenBody(ctx, 2, -58, -0.4, 0x18122a); K.droppedSword(ctx, 2.8, -57.4, 1.9);
    ctx.marks.terraceGate = barrier4(ctx, 3, -42, 4, 'x', 'glass');

    // ------------------------------------------------ the greenhouse cathedral
    P.greenhouse(ctx, -8, -94, 16, -72, [['n', 0, 0], ['e', -84.5, -79.5]]);
    for (const [x, z, hue] of [[-4, -76, 1], [12, -76, 4], [-4, -90, 2], [12, -90, 0]]) P.glassTree(ctx, x, z, { hue, fruit: 3, h: 4.4 });
    P.glassTree(ctx, 4, -83, { hue: 3, fruit: 4, h: 5 });
    P.fruitLantern(ctx, -6.4, -83); P.fruitLantern(ctx, 14.4, -88, 0xffd0e8);
    P.shards(ctx, -7, -93, 15, -73, 30);
    ctx.marks.glassGate = barrier4(ctx, 3, -69, 4, 'x', 'glass');
    ctx.marks.vaultGate = barrier4(ctx, 19, -82, 4, 'z', 'glass', { open: true });

    // ------------------------------------------------ the seed vault
    P.seedShelves(ctx, 32, -88, 32, -76); P.seedShelves(ctx, 22, -88, 32, -88);
    P.fruitLantern(ctx, 24, -77, 0xb0ffd8);
    P.shards(ctx, 23, -87, 31, -77, 10);

    // ------------------------------------------------ under the Heart Tree (the last fight)
    P.heartTree(ctx, 4, -116);
    for (const [x, z, hue] of [[-9, -103, 0], [17, -103, 1], [-9.4, -123, 2], [17.4, -123, 3]]) P.glassTree(ctx, x, z, { hue, fruit: 3, h: 4.6 });
    P.terrace(ctx, -12, -126, 1.6, -126, 1.3); P.terrace(ctx, 6.4, -126, 20, -126, 1.3); P.terrace(ctx, -12, -126, -12, -100, 1.2); P.terrace(ctx, 20, -126, 20, -100, 1.2);
    P.gardener(ctx, -6, -110, Math.PI * 0.6); P.gardener(ctx, 14, -110, -Math.PI * 0.6);
    P.shards(ctx, -11, -125, 19, -101, 50);
    K.fallenBody(ctx, 10, -104, 0.9, 0x18122a); K.droppedSword(ctx, 10.8, -103.4, 2.2);
    ctx.marks.heartGate = barrier4(ctx, 3, -97, 4, 'x', 'glass');
    ctx.marks.exitGate = barrier4(ctx, 4, -127.6, 4, 'x', 'glass');
    P.fallingLight(ctx, 4, -131, 1.6);
  },
};
