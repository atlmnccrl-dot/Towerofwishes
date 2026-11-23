// Act III, region II — The Clockwork Spire. (PROPOSAL: names and texts in this file are proposals for the author.)
// Up out of the marsh in a cage lift, into the Wheel's own machinery: decks of tread plate and brass and
// catwalks of grating over a violet drop, girders falling away under them, gears the size of houses
// turning beside the walks and far below, pistons pumping, steam bursting from the vents, sparks raining
// from the works above. The gear hall, the pendulum hall, the last deck, and the Clockmaster's chamber with
// its dial in the floor and the great clock face. Far above, the rim of the Wheel.
import * as P from '../props/spire.js';
import { barrier3, W3 } from '../kit3.js';

const DECKS = [
  [-4, 4, 8, 15],          // the lift deck
  [-7, -15, 10, -2],       // the gear hall
  [-6, -32, 10, -20],      // the pendulum hall
  [-2, -41, 10, -37],      // the last deck
  [-7, -62, 15, -43],      // the Clockmaster's chamber
];
const CATWALKS = [
  [1, -2, 4.4, 4],
  [1.4, -20, 4.8, -15],
  [2, -37, 5.4, -32],
  [2.4, -43, 5.8, -41],
  [2.6, -66, 6.4, -62],    // the way up to the hub (after the Clockmaster)
];
const WALKS = [...DECKS, ...CATWALKS];
const BOUNDS = [-16, -66, 20, 16];

export default {
  id: 'spire', name: 'The Clockwork Spire', tagline: 'THE WHEEL\'S MACHINERY. EVERY GEAR TURNS AGAINST THE TOLL.', tier: 13, act: 3,
  start: { x: 2.6, z: 12.6, face: Math.PI },
  bounds: BOUNDS, apron: false,
  gatesOpen: ['liftGate', 'clockGate'],
  ambience: {
    fog: 0x2a2044, fogNear: 76, fogFar: 150, background: 0x161028, moon: 1.7, moonColor: 0xbcaaf0, moonDir: [0.35, 1, -0.6], hemi: 1.25, hemiSky: 0x7060a8, hemiGround: 0x16101e,
    fill: 1.5, fillColor: 0x8a7ab8, ambient: 0x1e1834, ambientI: 0.75, rain: 0, lightning: false, weather: 'steam',
    grade: { gain: [1.0, 0.96, 1.08], lift: [0.008, 0.004, 0.018], sat: 0.84 },
    beams: [],
  },
  lamps: [{ id: 'lift', x: 6.6, z: 8.2, sx: -1.3, sz: 0.3 }, { id: 'gears', x: 7.6, z: -38.6, sx: -1.4, sz: 0.2 }],
  items: [{ id: 'c1', x: -5.8, z: -10.4, ry: Math.PI / 2, kind: 'embers', amount: 440 }, { id: 'c2', x: 8.7, z: -24.4, ry: -Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [-4, 9, 8, 15], text: 'THE WHEEL\'S WORKS. DO NOT LOOK DOWN.' },
    { zone: [1, -2, 4.4, 1], text: 'EVERY GEAR HERE TURNS AGAINST THE TOLL.' },
    { zone: [1.4, -20, 4.8, -17], text: 'THE PENDULUM KEEPS THE WHEEL\'S TIME.' },
    { zone: [-2, -41, 10, -38.4], text: 'BEYOND, THE CLOCKMASTER WINDS THE HOURS.' },
  ],
  foes: [
    { t: 'automaton', x: 0.6, z: 6.2 }, { t: 'automaton', x: 5, z: 5.4 }, { t: 'gearspider', x: 2.8, z: 4.8 },
    { t: 'gearspider', x: 1.6, z: -39.4 }, { t: 'automaton', x: 5, z: -40 },
  ],
  encounters: [
    { id: 'gears', zone: [-6, -14.4, 9, -2.4], gates: ['liftGate'], opens: ['gearGate'], msg: 'THE WORKS GRIND INTO MOTION', done: 'THE RAMS SINK INTO THE DECK',
      waves: [
        { pre: true, foes: [{ t: 'automaton', x: -2.4, z: -8.6 }, { t: 'automaton', x: 5.4, z: -9.8 }, { t: 'gearspider', x: 1.4, z: -13 }, { t: 'gearspider', x: 6.6, z: -4.6 }] },
        { foes: [{ t: 'chronoknight', x: 2, z: -12.6 }, { t: 'gearspider', x: -4.6, z: -9 }, { t: 'gearspider', x: 7.4, z: -9 }, { t: 'automaton', x: -3, z: -4.2 }] },
      ] },
    { id: 'pendulum', zone: [-5, -31.4, 9, -20.6], gates: ['gearGate'], opens: ['pendGate'], msg: 'THE PENDULUM SWINGS. SOMETHING WAKES.', done: 'THE WAY TO THE CLOCK IS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'chronoknight', x: 1.2, z: -29.4, face: 0 }, { t: 'automaton', x: 5.4, z: -27.6 }, { t: 'automaton', x: -1.4, z: -23 }, { t: 'gearspider', x: 6.6, z: -22.6 }] },
        { foes: [{ t: 'chronoknight', x: 6.4, z: -30.4 }, { t: 'gearspider', x: -3.8, z: -22.4 }, { t: 'gearspider', x: 7.6, z: -21.6 }, { t: 'automaton', x: 2, z: -31 }] },
      ] },
  ],
  boss: { type: 'clockmaster', x: 4, z: -52.6, face: 0, zone: [-6.6, -61.6, 14.6, -43.4], gates: ['clockGate'], opens: ['exitGate', 'clockGate'] },
  exit: { zone: [2.8, -65.6, 6.2, -64], to: 'empyrean', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ the decks, the catwalks, the drop
    for (const r of DECKS) P.deck(ctx, ...r, { mat: r === DECKS[1] || r === DECKS[4] ? W3.brass('#7e6232') : undefined });
    for (const r of CATWALKS) P.catwalk(ctx, ...r);
    P.voidFill(ctx, BOUNDS, WALKS);
    // far below: great gears turning in the dark, chains falling into it
    for (const [x, y, z, R, sp] of [[-10, -9, 2, 7, 0.05], [12, -12, -10, 6, -0.06], [-12, -14, -30, 8, 0.04], [13, -10, -36, 5, -0.07], [-12, -11, -56, 6.5, 0.05], [16, -15, -60, 7, -0.04], [3, -16, -24, 6, 0.05]]) P.gear(ctx, x, y, z, R, { axis: 'y', speed: sp, deep: 14, cast: false, thick: 0.8 });
    for (const [x, z, y] of [[-3, 0, -6], [7.4, -17, -8], [-1.4, -34, -7], [9, -42, -9], [0.6, -64, -6], [12, 2, -10]]) P.chain(ctx, x, 1.5, z, y);

    // ------------------------------------------------ the lift deck
    P.cageLift(ctx, -0.6, 12.6);
    P.works(ctx, -4, 4.2, -2.2, 8.4, 3.2);
    P.piston(ctx, 7.2, 13.6, { phase: 0 }); P.piston(ctx, 7.2, 11.6, { phase: 0.8 });
    P.gear(ctx, -4.7, 0.4, 9.6, 4.2, { axis: 'x', speed: 0.1 }); P.gear(ctx, -4.6, 4.4, 3.6, 2.2, { axis: 'x', speed: -0.19 });
    P.gear(ctx, 9.6, -1.6, 0.6, 3.2, { axis: 'y', speed: 0.12, deep: 6 });
    P.workLamp(ctx, -3.4, 14.4); P.vent(ctx, 5.4, 6.2);
    K.fallenBody(ctx, 4.8, 9.8, 1.2, 0x18161e); K.droppedSword(ctx, 5.6, 10.4, 2.4);
    ctx.marks.liftGate = barrier3(ctx, 2.7, -1.2, 3.6, 'x', 'pistons', { open: true });

    // ------------------------------------------------ the gear hall (first fight)
    P.gear(ctx, 2, 0.02, -8.6, 3.4, { axis: 'y', speed: 0.08, thick: 0.03, cast: false, mat: P.steelM() });
    P.gear(ctx, -7.6, 0.2, -8.2, 5.4, { axis: 'x', speed: 0.11 }); P.gear(ctx, -7.5, 5.8, -14.2, 2.4, { axis: 'x', speed: -0.25 });
    P.piston(ctx, 9, -4.4, { phase: 0 }); P.piston(ctx, 9, -7, { phase: 0.5 }); P.piston(ctx, 9, -9.6, { phase: 1.0 });
    P.works(ctx, -7, -15, -4.2, -12.2, 3.4); P.works(ctx, 7.4, -15, 10, -12.6, 2.6);
    P.vent(ctx, 5.6, -12.2); P.vent(ctx, -3.6, -4.2);
    P.workLamp(ctx, -6.4, -3); P.workLamp(ctx, 9.4, -11.6, { solid: true });
    P.sparks(ctx, [[-8.2, -11.4, -7.4, -10.6, 0.3, 14, 1.4], [8.8, -5, 9.2, -4, 1.6, 8, 1.2]]);
    K.fallenBody(ctx, 3.4, -5.6, -0.6, 0x18161e); K.droppedSword(ctx, 4.2, -5, 1.9);
    ctx.marks.gearGate = barrier3(ctx, 3.1, -15.6, 3.6, 'x', 'pistons');

    // ------------------------------------------------ the pendulum hall (second fight)
    P.pendulum(ctx, -7.4, 13.6, -26, 11.8, { ry: Math.PI / 2, r: 1.8, amp: 0.34, period: 4.6 });
    P.gear(ctx, -7.4, 9.6, -31.2, 2.8, { axis: 'x', speed: 0.18 }); P.gear(ctx, -6.8, 4.4, -33.4, 2, { axis: 'x', speed: -0.25 });
    P.works(ctx, 7.6, -31.8, 9.8, -27.4, 3);
    P.piston(ctx, -5.2, -21, { phase: 0.2 }); P.piston(ctx, -5.2, -31.2, { phase: 0.9 });
    P.vent(ctx, 0, -22.4); P.vent(ctx, 5.6, -30.4); P.vent(ctx, -3.6, -27);
    P.workLamp(ctx, -5.6, -25.8); P.workLamp(ctx, 9.3, -20.8);
    P.pipes(ctx, -5.6, -31.8, -5.6, -22.4, 2);
    P.gear(ctx, 12.8, -1.8, -26, 3.6, { axis: 'y', speed: -0.1, deep: 6 });
    K.fallenBody(ctx, 6, -26.4, 2.2, 0x18161e);
    ctx.marks.pendGate = barrier3(ctx, 3.7, -32.6, 3.6, 'x', 'pistons');

    // ------------------------------------------------ the last deck
    P.gear(ctx, -2.7, 0.8, -39, 3.6, { axis: 'x', speed: 0.13 });
    P.works(ctx, -2, -41, -0.2, -38.6, 2.4); P.workLamp(ctx, 0.4, -37.4);
    P.piston(ctx, 9.2, -40.2, { phase: 0.3 });
    ctx.marks.clockGate = barrier3(ctx, 4.1, -42.4, 3.6, 'x', 'pistons', { open: true });

    // ------------------------------------------------ the Clockmaster's chamber
    P.floorDial(ctx, 4, -52.6, 8);
    P.clockFace(ctx, 4.5, 6.6, -69.6, 7.4);
    P.gear(ctx, -7.6, 1, -50.6, 5, { axis: 'x', speed: 0.09 }); P.gear(ctx, -7.5, 6.6, -44.4, 2.4, { axis: 'x', speed: -0.19 });
    P.gear(ctx, 11.2, 1.4, -62.7, 4.2, { axis: 'z', speed: -0.1 }); P.gear(ctx, -2.6, 1.2, -62.7, 3.2, { axis: 'z', speed: 0.13 });
    for (const [x, z, ph] of [[-5.8, -44.8, 0], [13.8, -44.8, 0.6], [13.8, -60.6, 1.2], [-5.8, -60.6, 0.3]]) P.piston(ctx, x, z, { phase: ph, h: 1.8, r: 0.5 });
    P.vent(ctx, -5.6, -52.6, { size: 1.4 }); P.vent(ctx, 13.6, -52.6, { size: 1.4 });
    for (const [x, z] of [[14.2, -48.4], [14.2, -56.8], [-6.2, -57], [-6.2, -48.2]]) P.workLamp(ctx, x, z, { color: 0xffb060 });
    P.works(ctx, 7.6, -62, 14.6, -60.8, 2.2); P.works(ctx, -7, -62, 1.4, -60.8, 2.2);
    K.fallenBody(ctx, 9.6, -50.4, 0.9, 0x18161e); K.droppedSword(ctx, 10.6, -49.8, 2.4);
    P.sparks(ctx, [[-7.6, -48, -7, -46.8, 0.4, 12, 1.4], [10, -63, 11, -62.4, 0.6, 12, 1.4]]);
    ctx.marks.exitGate = barrier3(ctx, 4.5, -62.6, 4, 'x', 'pistons');

    // ------------------------------------------------ the sky: the Wheel's rim far above, cold stars below
    P.wheelRim(ctx, 4, -24, { y: 66, R: 46, k: 0.93 });
    P.skyMotes(ctx, 4, -24, 260);
  },
};
