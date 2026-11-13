// District VII — The Crown Heights. The rich quarter on the hill below the cathedral, its east edge a
// balustrade over the lower city far down in the mist: up the Regent's Road past the manors, through
// the fountain garden, along the long colonnade, across the carriage court of a fallen house, to the
// palace forecourt where the Pale Regent still holds his last ball. Out by the stair to the cathedral.
import * as P from '../props/heights.js';

const LAMP = '#d6ccff'; // the Heights burn pale gas, not tallow

export default {
  id: 'heights', name: 'The Crown Heights', tagline: 'UP HERE THEY PAID FOR THE NIGHT TO STAY.', tier: 6,
  start: { x: 1.6, z: 14.6, face: Math.PI },
  bounds: [-14, -57.6, 9.4, 18.4],
  apron: false, // the east side falls away to the lower city: the level lays its own ground
  gatesOpen: ['gardenGate', 'courtGate'],
  ambience: {
    fog: 0x211e30, fogNear: 78, fogFar: 175, sky: 0x0b0a14, moon: 1.75, moonColor: 0xb4b0e4, hemi: 0.95, hemiSky: 0x5c5a8a, hemiGround: 0x120f1a,
    fill: 1.3, fillColor: 0x8884b8, rain: 1, lightning: true,
    beams: [
      { x: 1.4, z: 12.6, r: 5.5, h: 26, from: [6, 0, -10], intensity: 70, color: 0xbab4ec },
      { x: -3.5, z: -42.6, r: 8, h: 28, from: [6, 0, -10], intensity: 85, color: 0xbab4ec },
    ],
  },
  lamps: [{ id: 'road', x: -2.4, z: 11.4, sx: 1.3, sz: 0.4 }, { id: 'court', x: -3.4, z: -30.4, sx: 1.3, sz: 0.4 }],
  items: [{ id: 'c1', x: -7.3, z: -21.6, ry: Math.PI / 2, kind: 'embers', amount: 130 }, { id: 'c2', x: 7.6, z: -10.3, ry: 0, kind: 'tonic' }],
  hints: [
    { zone: [-3.8, 12.2, 9.4, 18.4], text: 'LIGHT THE LAMP. THE GARDENS ARE NOT EMPTY.' },
    { zone: [-3.8, 5.2, 9.4, 8.6], text: 'PALE KNIGHTS BLOCK FROM THE FRONT. CIRCLE THEM.' },
    { zone: [-8.2, -14.4, 9.4, -11.6], text: 'SHADES STEP OUT BEHIND YOU. NEVER STAND STILL.' },
    { zone: [-13.4, -35.3, 9.4, -32.9], text: 'MUSIC ON THE FORECOURT. SOMEONE IS STILL DANCING.' },
  ],
  foes: [
    { t: 'hound', x: 0.2, z: 7.6 }, { t: 'hound', x: 2.8, z: 6.8 }, { t: 'knight', x: -1.4, z: 6.6 },
    { t: 'gargoyle', x: 2.6, z: -14.2 }, { t: 'knight', x: 1.6, z: -18 }, { t: 'shade', x: -6.2, z: -17.6 },
    { t: 'acolyte', x: 6.2, z: -19.4 }, { t: 'gargoyle', x: -1.2, z: -21.4 },
  ],
  encounters: [
    { id: 'garden', zone: [-5.6, -8.6, 7, 1.6], gates: ['gardenGate'], opens: ['gardenExit'], msg: 'THE GARDEN GUARD STILL KEEPS THE GATE', done: 'THE FAR GATE SWINGS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'knight', x: 0.6, z: -8.4, face: 0 }, { t: 'hound', x: -4.6, z: -3.4 }, { t: 'hound', x: 5.8, z: -3 }] },
        { foes: [{ t: 'warden', x: -0.8, z: -9.8 }, { t: 'knight', x: 2.4, z: -9.6 }, { t: 'hound', x: -7, z: -1 }, { t: 'gargoyle', x: 7.4, z: -0.8 }] },
      ] },
    // no casters that blink in here: the court is walled by railings they could step through
    { id: 'court', zone: [-6.6, -31, 7.6, -24.2], gates: ['courtGate'], opens: ['courtExit'], msg: 'THE HOUSE GUARD TURNS OUT ONE LAST TIME',
      waves: [
        { pre: true, foes: [{ t: 'warden', x: -1.4, z: -29 }, { t: 'knight', x: 1.6, z: -26.4 }, { t: 'knight', x: -4.6, z: -29.6 }] },
        { foes: [{ t: 'hound', x: -6.8, z: -30.6 }, { t: 'hound', x: 7.4, z: -24.6 }, { t: 'gargoyle', x: 0.6, z: -31.4 }, { t: 'knight', x: 6.2, z: -31.6 }] },
      ] },
  ],
  boss: { type: 'regent', x: -3.5, z: -43.8, face: 0, zone: [-13, -49, 8.6, -35.6], gates: ['courtExit'], opens: ['exitGate', 'courtExit'] },
  exit: { zone: [5.3, -57.4, 7.9, -54.2], to: 'belfry', requires: 'boss' },
  build(K, ctx) {
    const W = K.M;
    // ------------------------------------------------ ground: the hill top, and the drop to the lower city
    K.floor(ctx, -46, -90, 9.7, 50, W.cobble('#2c303c'), -0.03, 0.3);
    K.floor(ctx, -3.8, 4.8, 5.6, 36, W.cobble('#545a6a'), 0, 0.4);
    K.floor(ctx, 5.6, 4.8, 9.7, 36, W.flags('#5e6474'), 0.004, 0.4);
    K.floor(ctx, -8.6, 4.8, -3.8, 36, W.grass('#28362e'), 0.002, 0.4);
    K.floor(ctx, -8.6, -11.2, 9.7, 4.8, W.dirt('#5a5c64'), 0.004, 0.4);
    K.floor(ctx, -2.4, -6.6, 3.6, 0.2, W.flags('#646a7a'), 0.008, 0.4);
    K.floor(ctx, -8.6, -23, 9.7, -11.2, W.grass('#2a3830'), 0.002, 0.4);
    K.floor(ctx, -0.6, -23, 2.8, -11.2, W.dirt('#5a5c64'), 0.006, 0.4);
    K.floor(ctx, -8.2, -23, -3, -11.2, W.flags('#5c6070'), 0.006, 0.4);
    K.floor(ctx, -8.6, -32.6, 9.7, -23, W.cobble('#525868'), 0.006, 0.4);
    K.floor(ctx, -14, -53.4, 9.7, -32.6, W.court('#5c6274'), 0.006, 0.4);
    K.floor(ctx, 4.6, -64, 9.7, -53.4, W.flags('#5a6070'), 0.004, 0.4);
    P.cliff(ctx, 9.7, -90, 50, 9);
    P.balustrade(ctx, 9.2, -64, 9.2, 36, { urns: true });
    P.lowerCity(ctx, 10.5, -100, 60, 60, -9);
    P.mist(ctx, 9.7, -110, 80, 70, -1.6, 0.28);
    P.mist(ctx, 9.7, -110, 80, 70, -4.8, 0.42);

    // ------------------------------------------------ the Regent's Road (the way in)
    P.manor(ctx, -12.1, 22.3, 7, 9.4, 7, { faces: ['x', 'z'], lit: 0.35, lights: 0, tone: '#4a4e60', bay: 2.4 });
    P.manor(ctx, -12.1, 13.2, 7, 8.8, 7.8, { faces: ['x', 'z'], lit: 0.4, bay: 2.9, pattern: (f, k, i, n) => (f === 'x' && k === 0 && i === (n >> 1) ? 'door' : 'win') });
    P.manor(ctx, -12.1, 3.4, 7, 10.8, 7.4, { lit: 0.45, tone: '#484c5e', bay: 2.2 });
    P.railing(ctx, -3.8, 4.8, -3.8, 11.3);
    P.gate(ctx, -3.8, 13.2, 2.4, 'z', { h: 2.4 });
    P.railing(ctx, -3.8, 15.1, -3.8, 36);
    K.floor(ctx, -8.6, 12.4, -3.8, 14, W.flags('#5a6070'), 0.008, 0.4);
    P.topiary(ctx, -5, 11.8, 'ball'); P.topiary(ctx, -5, 14.6, 'ball');
    P.topiary(ctx, -7.2, 6.4, 'cone'); P.topiary(ctx, -7.2, 19.4, 'cone');
    P.hedge(ctx, -8.2, 7.4, -4.6, 8.2, 0.9); P.hedge(ctx, -8.2, 16.6, -4.6, 17.4, 0.9); P.hedge(ctx, -8.2, 21.6, -4.6, 22.4, 0.9);
    P.banner(ctx, -8.6, 3.4, 5.9, '+x', { variant: 2 });
    P.carriage(ctx, 3.6, 9.8, 0.4, { door: true });
    P.trunk(ctx, 5.2, 7.2, 0.3);
    K.fallenBody(ctx, 2, 11.8, 2.2); K.droppedSword(ctx, 1.1, 12.6, 0.4);
    K.lamp(ctx, 8.3, 16.4, { color: LAMP }); K.lamp(ctx, 8.3, 7.4, { color: LAMP }); K.lamp(ctx, 8.3, 25.6, { color: LAMP });
    K.bench(ctx, 8.15, 12.2, Math.PI / 2);
    K.puddle(ctx, 1, 12, 2, 1.1); K.puddle(ctx, -1, 6.4, 1.4, 0.9); K.puddle(ctx, 4.2, 15.8, 1.2, 0.8); K.puddle(ctx, 6.8, 9.6, 1.2, 1.4);

    // ------------------------------------------------ the fountain garden (the garden guard)
    P.manor(ctx, -12.1, -6.8, 7, 9.6, 8.2, { lit: 0.5, tone: '#52566a', bay: 3.2, pattern: (f, k, i, n) => (k === 0 && i === (n >> 1) ? 'door' : 'win') });
    P.railing(ctx, -8.6, 4.8, -1.5, 4.8);
    ctx.marks.gardenGate = P.gate(ctx, 0.6, 4.8, 2.8, 'x', { open: true, swingDir: -1 });
    P.railing(ctx, 2.7, 4.8, 8.95, 4.8);
    P.fountain(ctx, 0.6, -3.2, 2.3);
    P.bed(ctx, -6.2, -9, -2.4, -6.2, 'statue:crown', Math.PI * 0.25);
    P.bed(ctx, 3.6, -9, 7.4, -6.2, 'tiers');
    P.bed(ctx, -6.2, -0.2, -2.4, 2.8, 'cone');
    P.bed(ctx, 3.6, -0.2, 7.4, 2.8, 'statue:mourner', Math.PI * 0.25);
    P.topiary(ctx, -2.2, 3.6, 'ball', 0.8); P.topiary(ctx, 3.4, 3.6, 'ball', 0.8);
    K.lamp(ctx, 8.3, -3.2, { color: LAMP });
    K.bench(ctx, 8.15, 1.4, Math.PI / 2);
    K.fallenBody(ctx, -3.6, -4.8, 0.9); K.droppedSword(ctx, -2.8, -5.4, 2.1);
    K.fallenBody(ctx, 5, -10, -0.6, 0x1c181a);
    K.puddle(ctx, -5.4, -3.8, 1.6, 1); K.puddle(ctx, 6.2, -4.4, 1.2, 1.4); K.puddle(ctx, 1.6, 3.4, 1.4, 0.8);
    P.railing(ctx, -8.6, -11.2, -1.5, -11.2);
    ctx.marks.gardenExit = P.gate(ctx, 0.6, -11.2, 2.8, 'x', { swingDir: 1 });
    P.railing(ctx, 2.7, -11.2, 8.95, -11.2);

    // ------------------------------------------------ the long colonnade
    // the gallery behind it: lit windows between niches of marble mourners
    P.manor(ctx, -11.9, -17.4, 7.4, 11.6, 7.2, { lit: 0.5, lights: 2, tone: '#4e5266', bay: 2.32, pattern: (f, k, i) => (k === 0 && i % 2 === 0 ? 'niche' : 'win') });
    P.checkerFloor(ctx, -8, -22.8, -3, -11.4);
    P.colonnade(ctx, -3.8, -8.2, [-12.2, -14.7, -17.2, -19.7, -22.2]);
    K.torch(ctx, -8.08, 2.4, -18.56, '+x'); K.torch(ctx, -8.08, 2.4, -13.92, '+x');
    for (const z of [-13.45, -15.95, -18.45, -20.95]) P.topiary(ctx, -2.4, z, 'cone', 0.9);
    P.statue(ctx, 6.6, -14.4, Math.PI * 0.25, { pose: 'sword' });
    P.statue(ctx, 6.6, -20.8, Math.PI * 0.25, { pose: 'angel' });
    P.statue(ctx, 5, -17, 1.3, { fallen: true, pose: 'crown' });
    K.bench(ctx, 8.15, -17.4, Math.PI / 2);
    K.lamp(ctx, 8.3, -12.4, { color: LAMP });
    K.fallenBody(ctx, -5.4, -15.4, 2.6); K.droppedSword(ctx, -4.6, -16.2, 0.9);
    K.puddle(ctx, 1, -15, 1.6, 1); K.puddle(ctx, 1.8, -20.6, 1.2, 0.9); K.puddle(ctx, 4.4, -12.6, 1.2, 0.8);

    // ------------------------------------------------ the carriage court (the house guard)
    P.railing(ctx, -8.6, -23, -0.7, -23);
    ctx.marks.courtGate = P.gate(ctx, 1.4, -23, 2.8, 'x', { open: true, swingDir: -1 });
    P.railing(ctx, 3.5, -23, 8.95, -23);
    P.manor(ctx, -12.1, -27.9, 7, 9, 6.2, { tone: '#464a5c', bay: 3, floors: 2, floorH: 2.4, lit: 0.3, lights: 0, pattern: (f, k) => (k === 0 ? 'blank' : 'win') });
    P.coachDoors(ctx, -8.6, [-30.9, -24.9]);
    P.banner(ctx, -8.6, 3, -27.9, '+x', { variant: 2 });
    P.carriage(ctx, -5.6, -26, Math.PI + 0.25, { door: true });
    P.carriage(ctx, 5, -29, Math.PI / 2 + 0.1, { tipped: true, shafts: false });
    P.trunk(ctx, 2.4, -28.2, 0.6, { hatbox: false }); P.trunk(ctx, 7.6, -30.6, -0.4);
    P.fallenBanner(ctx, -1.6, -26.2, 0.4);
    P.topiary(ctx, -1.4, -31.8, 'cone'); P.topiary(ctx, 4.2, -31.8, 'cone');
    K.lamp(ctx, 8.3, -24.6, { color: LAMP });
    K.fallenBody(ctx, 0.2, -28.6, 0.8, 0x24162c); K.droppedSword(ctx, 1, -29.6, 2.4);
    K.fallenBody(ctx, -6.4, -31.2, -1.2, 0x24162c);
    K.puddle(ctx, -2.4, -24.6, 1.6, 1); K.puddle(ctx, 2.8, -31, 1.4, 0.9); K.puddle(ctx, 7, -27.8, 1, 1.2);
    P.railing(ctx, -8.6, -32.6, -0.7, -32.6);
    ctx.marks.courtExit = P.gate(ctx, 1.4, -32.6, 2.8, 'x', { swingDir: 1 });
    P.railing(ctx, 3.5, -32.6, 8.95, -32.6);

    // ------------------------------------------------ the palace forecourt (the Pale Regent)
    // the west wing (far side), the fallen house's banners between its windows
    P.manor(ctx, -17.4, -43, 7.2, 20.8, 8.6, { lit: 0.4, tone: '#50566a', bay: 2.6 });
    for (const z of [-48.2, -43, -37.8]) P.banner(ctx, -13.68, 4.2, z, '+x', { variant: z === -43 ? 2 : 0 });
    // the palace (far side, north): eleven bays, the frontispiece and its stair in the middle three
    P.manor(ctx, -8.2, -57.2, 25.6, 7.6, 9.6, { faces: ['z'], floors: 3, floorH: 2.6, bay: 25.6 / 11, lit: 0.45, lights: 2, tone: '#50566a', pattern: (f, k, i) => (i >= 6 && i <= 8 ? 'blank' : 'win') });
    P.frontispiece(ctx, -3.55, -52.6, 7, 10.2, { doorY: 1.6 });
    P.grandStair(ctx, -3.55, -52.6, 4.6, 8);
    for (const x of [-9.37, 2.27]) P.banner(ctx, x, 5, -53.28, '+z', { long: true });
    P.brazier(ctx, -7.4, -49); P.brazier(ctx, 0.3, -49); P.brazier(ctx, -12.6, -34); P.brazier(ctx, 8, -34);
    P.statue(ctx, -12.6, -40.4, Math.PI / 2, { pose: 'sword' }); P.statue(ctx, -12.6, -46.2, Math.PI / 2, { pose: 'angel', headless: true });
    P.topiary(ctx, -11.6, -52.4, 'cone'); P.topiary(ctx, 3.4, -52.4, 'cone');
    P.star(ctx, -3.5, -42.6, 12);
    K.fallenBody(ctx, -6, -39.4, 0.4, 0x24162c); K.droppedSword(ctx, -5, -38.8, 1.9);
    K.fallenBody(ctx, 2.2, -45.4, -2.2, 0x24162c); K.droppedSword(ctx, 3.2, -44.6, -0.6);
    K.fallenBody(ctx, -9.6, -47.2, 1.6);
    K.puddle(ctx, 4.4, -40, 2, 1.2); K.puddle(ctx, -9.4, -42.6, 1.6, 1); K.puddle(ctx, 5.8, -48.6, 1.4, 1);

    // ------------------------------------------------ the way out: the stair to the cathedral
    ctx.marks.exitGate = P.gate(ctx, 6.6, -53.4, 2.6, 'x', { h: 2.8, swingDir: 1 });
    K.steps(ctx, 6.6, -54.4, 2.6, 8, 'z-', 0.2, 0.4, '#5a6070');
    K.add(ctx, K.box(2.6, 1.6, 4.4), W.ashlar('#5a6070'), 6.6, 0.8, -59.6);
    K.lamp(ctx, 8.4, -57, { color: LAMP });
    K.wall(ctx, 4.6, -63, 9.7, -63, 7, { buttress: 2.5 });

    // ------------------------------------------------ the rest of the quarter, behind the manors
    for (const z of [26, 17, 8, -1, -10, -19, -28]) K.house(ctx, -19.8, z, 7, 8.4, 6 + Math.abs(z % 3) * 0.6, { lit: 0.25, windowLights: false, doorSide: 'x' });
    for (const z of [-37, -46, -55]) K.house(ctx, -25, z, 7, 8.4, 6.6, { lit: 0.2, windowLights: false, doorSide: 'x' });
  },
};
