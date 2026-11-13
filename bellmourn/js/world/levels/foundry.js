// District VI — The Bell Foundry. In through the coal yard, across the furnace hall (its open side
// toward you, the furnaces roaring along the back wall), out into the mould yard under the gantry
// crane, through the casting shed where the pits are still being poured, past the last lamp, to the
// great casting pit where the Bellfounder keeps the furnaces fed.
import * as P from '../props/foundry.js';

export default {
  id: 'foundry', name: 'The Bell Foundry', tagline: 'THE FURNACES NEVER COOLED. SOMETHING KEPT THEM FED.', tier: 5,
  start: { x: 4, z: 14.6, face: Math.PI },
  bounds: [-17, -67, 11.8, 17.6],
  gatesOpen: ['hallGate', 'shedGate', 'arenaGate'],
  ambience: {
    fog: 0x221f24, fogNear: 78, fogFar: 175, sky: 0x0c0c11, moon: 1.5, hemi: 0.9, hemiGround: 0x1c1410, rain: 1, lightning: true,
    beams: [{ x: 3.5, z: 11.5, r: 5.5, h: 16, from: [4, 0, -7], intensity: 55 }, { x: 0.5, z: -50, r: 7.5, h: 22, from: [5, 0, -9], intensity: 70 }],
  },
  lamps: [{ id: 'yard', x: 0.4, z: 12.4, sx: 1.4, sz: 0.3 }, { id: 'pit', x: 6.4, z: -39.8, sx: -1.5, sz: 0.3 }],
  items: [{ id: 'c1', x: 7.6, z: -24.2, ry: 0, kind: 'embers', amount: 130 }, { id: 'c2', x: -7.2, z: -9.5, ry: Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [-5, 9, 11, 17.6], text: 'BOMBERS LOB FIRE. KEEP MOVING, THEN CLOSE IN.' },
    { zone: [-9, -17, 11, -11.2], text: 'WATCH THE ROOFS. GARGOYLES DIVE FROM ABOVE.' },
    { zone: [-8.6, -30, 8, -26.6], text: 'KILL THE CHANTERS FIRST. THEY SHIELD THE REST.' },
    { zone: [-3.4, -41.2, 8, -38.2], text: 'REST AT THE LAMP. THE GREAT PIT IS AHEAD.' },
  ],
  foes: [
    { t: 'hushed', x: 3, z: 7.4 }, { t: 'bomber', x: 6.8, z: 5.8 },
    { t: 'gargoyle', x: -2.6, z: -14.4 }, { t: 'hushed', x: 3.6, z: -13 }, { t: 'gargoyle', x: 6.2, z: -20.6 },
    { t: 'bomber', x: -5.6, z: -19.6 }, { t: 'brute', x: -1.2, z: -21 }, { t: 'hushed', x: -4.8, z: -23.6 },
  ],
  encounters: [
    { id: 'hall', zone: [-8.2, -10, 6.2, 3], gates: ['hallGate'], opens: ['yardGate'], msg: 'THE FURNACE HANDS TURN FROM THE FIRE', done: 'THE YARD GATE GRINDS OPEN',
      waves: [
        { pre: true, foes: [{ t: 'sentinel', x: -3.4, z: -1.2 }, { t: 'hushed', x: -6.2, z: 0.4 }, { t: 'hushed', x: 2.6, z: -7.6 }] },
        { foes: [{ t: 'chanter', x: -6.6, z: -8.4 }, { t: 'bomber', x: 3.4, z: -8.6 }, { t: 'hushed', x: -1.4, z: 1.8 }, { t: 'hushed', x: 4.4, z: -2.2 }] },
      ] },
    { id: 'shed', zone: [-8.6, -37, 8, -26.6], gates: ['shedGate'], opens: ['pitGate'], msg: 'THE POURING BEGINS', done: 'THE PIT GATE SWINGS WIDE',
      waves: [
        { pre: true, foes: [{ t: 'sentinel', x: -4, z: -35 }, { t: 'hushed', x: 6.4, z: -29.4 }, { t: 'bomber', x: -4.6, z: -27.6 }, { t: 'hushed', x: 1.8, z: -35.4 }] },
        { foes: [{ t: 'chanter', x: -6.8, z: -35.4 }, { t: 'brute', x: 2, z: -28.2 }, { t: 'bomber', x: 7, z: -35.4 }, { t: 'hushed', x: -2.6, z: -28 }] },
      ] },
  ],
  boss: { type: 'founder', x: 0.6, z: -51, face: 0, zone: [-8.4, -58.4, 10.8, -42.6], gates: ['arenaGate'], opens: ['exitGate', 'arenaGate'] },
  exit: { zone: [-16.6, -56.8, -13.6, -54.4], to: 'heights', requires: 'boss' },
  build(K, ctx) {
    const W = K.M; const SOOT = P.SOOT, BRICK = '#2c2a2e';
    // Dividers between the spaces are opaque to foes (out of ctx.lowSolids, 0.6 m thick, 1.6 m tall),
    // so nothing beyond a locked room watches through the bars and waits at a shut gate.
    const opaque = (s, axis = 'x') => {
      const i = ctx.lowSolids.indexOf(s); if (i >= 0) ctx.lowSolids.splice(i, 1);
      const c = axis === 'x' ? (s.z0 + s.z1) / 2 : (s.x0 + s.x1) / 2;
      if (axis === 'x') { s.z0 = c - 0.3; s.z1 = c + 0.3; } else { s.x0 = c - 0.3; s.x1 = c + 0.3; }
    };
    const divider = (x0, x1, z) => { K.fence(ctx, x0, z, x1, z, { kerb: 0.6, h: 1.6 }); opaque(ctx.solids[ctx.solids.length - 1]); };
    const gateAt = (x, z, w, o, axis = 'x') => { const g = K.gate(ctx, x, z, w, axis, o); opaque(g.solid, axis); return g; };
    const yTop = (xa, xb, ya, yb) => (x) => ya + (yb - ya) * (x - xa) / (xb - xa);

    // ------------------------------------------------ ground
    K.floor(ctx, -5.2, 4, 11.4, 19, W.cobble('#4e545e'));
    K.floor(ctx, -12.8, -10.6, 6.8, 4, W.flags('#5a5a62'));
    K.floor(ctx, 6.8, -10.6, 11.4, 4, W.dirt('#34343a'));
    K.floor(ctx, -10.4, -25.6, 11.4, -10.6, W.court('#545a64'));
    K.floor(ctx, -10.4, -37.8, 8.6, -25.6, W.flags('#58585e'));
    K.floor(ctx, 8.6, -37.8, 11.4, -25.6, W.dirt('#34343a'));
    K.floor(ctx, -10.4, -41.6, 11.4, -37.8, W.flags('#55565c'));
    K.floor(ctx, -12.8, -67, 11.8, -41.6, W.court('#56585e'));
    K.floor(ctx, -17.4, -57.8, -12.8, -53.3, W.flags('#4c4e56'));
    K.floor(ctx, -5.2, 4.4, -1.6, 16.4, W.dirt('#26262a'), 0.012, 0.3); // coal dust by the bunkers
    K.floor(ctx, -9.4, -10.6, -6.4, 4, W.dirt('#2a2628'), 0.012, 0.3); // soot before the furnaces
    K.floor(ctx, -2.6, -36.6, 6.6, -29.8, W.dirt('#463a30'), 0.012, 0.3); // moulding sand round the pits
    K.floor(ctx, -9.4, -58.9, -6.8, -41.6, W.dirt('#2a2628'), 0.012, 0.3);

    // ------------------------------------------------ the coal yard (the way in)
    K.house(ctx, -9.4, 10.5, 8.4, 11.8, 4.6, { lit: 0.2, doorSide: 'x', windowLights: false, ridge: 'z', roofH: 3.2, tone: BRICK });
    P.gargoyle(ctx, -9.4, 7.8, 5.2, 0);
    for (const z of [7.6, 11.6, 15.4]) K.wall(ctx, -5.2, z, -2.6, z, 1.4, { thick: 0.3, tone: SOOT });
    P.coal(ctx, -4, 5.9, 1.1, 0.9); P.coal(ctx, -3.9, 9.6, 1.2, 1.1); P.coal(ctx, -4, 13.5, 1.15, 1);
    // the entrance: two brick piers and an iron bar with the founders' sign-bell
    for (const x of [1.4, 6.6]) { K.add(ctx, K.box(0.9, 3.4, 0.9), W.brick(SOOT), x, 1.7, 17.3); K.add(ctx, K.box(1.1, 0.24, 1.1), W.ashlar('#4a4650'), x, 3.52, 17.3); K.solid(ctx, x - 0.45, 16.85, x + 0.45, 17.75, 3.4); }
    K.add(ctx, K.box(5.4, 0.12, 0.12), P.iron(), 4, 3.3, 17.3);
    P.chain(ctx, [4, 3.24, 17.3], [4, 2.86, 17.3]); P.bell(ctx, 4, 2.3, 17.3, 0.55, { mat: P.oldBronze() });
    K.fence(ctx, -5.2, 17.3, 0.95, 17.3); K.fence(ctx, 7.05, 17.3, 11, 17.3);
    K.fence(ctx, 11, 17.3, 11, 4);
    P.rails(ctx, 8, 17.4, 8, -10.4);
    P.tub(ctx, 8, 11, 0); P.tub(ctx, 9.6, 6.4, 0.4, true);
    K.lamp(ctx, 10, 15.6, { h: 2.8 });
    P.brazier(ctx, -1.4, 6);
    K.barrel(ctx, 9.8, 16.4); K.barrel(ctx, 9.3, 17, { s: 0.85 }); K.crate(ctx, -1.8, 16.4);
    K.fallenBody(ctx, 5.2, 8.6, 0.7); K.droppedSword(ctx, 6.2, 9.2, 2);
    K.puddle(ctx, 3, 10.5, 2, 1.2); K.puddle(ctx, 6.5, 14.8, 1.4, 0.9); K.puddle(ctx, 1, 6, 1.2, 0.8);
    // beyond the railing: slag tipped in the rain
    P.slag(ctx, 13.6, 10, 1.6, 1); P.slag(ctx, 14, 1, 1.8, 1.1); P.slag(ctx, 13.8, -16, 1.5, 0.9); K.deadTree(ctx, 13.2, 15, 1);

    // ------------------------------------------------ the furnace hall
    divider(-11.6, 1, 4);
    ctx.marks.hallGate = gateAt(3, 4, 2.6, { h: 2.6, open: true, swingDir: -1 });
    divider(5, 11, 4);
    // the back wall and its three furnaces, the trough before them, the run to the mould pit
    K.wall(ctx, -12.2, -10.9, -12.2, 4.3, 8.5, { thick: 1.2, arches: 2, litArches: [0], tone: BRICK });
    for (const z of [1.2, -3.2, -7.6]) P.furnace(ctx, -11.6, z);
    P.channel(ctx, -8.9, 2.4, -8.9, -8.8, { lights: 0 });
    P.channel(ctx, -8.55, -5.4, -4.8, -5.4, { gaps: [-6.6], lights: 1 });
    P.castPit(ctx, -3.5, -5.4, 2.6, 2.6, { hot: true });
    // the open side: cast-iron columns, a low railing, iron trusses, a lean-to over the furnaces
    K.fence(ctx, 6.8, 4, 6.8, -10.6, { h: 1.5 });
    const hallTop = yTop(-11.6, 6.8, 8.3, 6.9);
    for (const z of [2.4, -1.4, -5.8, -9.8]) { P.column(ctx, 6.8, z, 6.4); P.truss(ctx, -11.6, 6.8, z, 6.4, 8.3, 6.9); }
    P.purlins(ctx, [-5.4, 1.6], -10.4, 3.8, hallTop);
    P.leanRoof(ctx, -12.8, -7.6, 9.2, 8.2, -10.9, 4.3);
    P.chain(ctx, [-1, 6.4, -1.4], [-1, 3.3, -1.4]); P.hook(ctx, -1, 3.3, -1.4);
    P.chain(ctx, [1.8, 6.4, -5.8], [1.8, 4.6, -5.8]); P.hook(ctx, 1.8, 4.6, -5.8); P.bell(ctx, 1.8, 3.12, -5.8, 0.95, { mat: P.oldBronze() });
    P.coal(ctx, -6.8, 3, 0.9, 0.7);
    P.anvil(ctx, 3.8, 1.6, 0.4); P.ingots(ctx, 5.2, -8.6, 4); P.mould(ctx, -0.6, 2.8, 0.9, { core: true });
    K.fallenBody(ctx, 0.6, -2.8, 2.2, 0x1c1816);
    // outside the railing
    P.slag(ctx, 9.8, 1.4, 1.2, 0.8); P.tub(ctx, 8, -2.6, 0); K.cart(ctx, 9.8, -7.4, 0.1);

    // ------------------------------------------------ the mould yard
    divider(-12.2, -1.4, -10.6);
    ctx.marks.yardGate = gateAt(0.6, -10.6, 2.6, { h: 2.6, swingDir: 1 });
    divider(2.6, 11, -10.6);
    K.wall(ctx, -9.8, -25.6, -9.8, -10.6, 6.5, { thick: 1.2, buttress: 5, arches: 3, tone: BRICK });
    P.chimney(ctx, -11.8, -14.6, 15, 2.2); P.chimney(ctx, -11.8, -21.8, 13, 2.2);
    P.chimney(ctx, -7.6, -23.4, 14, 2);
    P.gargoyle(ctx, -9.8, 6.7, -13, Math.PI / 2); P.gargoyle(ctx, -9.8, 6.7, -19.4, Math.PI / 2);
    K.torch(ctx, -9.2, 2.4, -16.6, '+x');
    K.fence(ctx, 11, 4, 11, -37.8);
    // the gantry crane on its rails, a bell on the hook
    P.rails(ctx, -7.8, -21.6, -7.8, -11); P.rails(ctx, 9.6, -25, 9.6, -11);
    const tr = P.gantry(ctx, -7.8, 9.6, -17.6, 7.4, { trolley: 1.6 });
    P.hangingBell(ctx, tr.x, tr.y, tr.z, 1.5, 1.4);
    P.chain(ctx, [-3, 7.3, -17.6], [-3, 3.8, -17.6]); P.hook(ctx, -3, 3.8, -17.6);
    P.coal(ctx, -7, -12.6, 1.2, 1);
    P.mould(ctx, 5, -12.2, 1.2); P.mould(ctx, 6.5, -11.8, 0.9); P.mould(ctx, 7.6, -13.2, 1, { core: true });
    P.tippedBell(ctx, -3.4, -12.2, 1.4, 0.6);
    P.sand(ctx, -1.6, -24.3, 0.9, 0.6); P.ingots(ctx, 8.4, -22.2, 5);
    P.tub(ctx, 9.6, -13.6, 0);
    P.brazier(ctx, 0.4, -23.6);
    K.lamp(ctx, 10.2, -11.6, { h: 2.8 });
    K.fallenBody(ctx, 2.8, -16.2, -0.6); K.droppedSword(ctx, 3.8, -15.6, 1.1);
    K.puddle(ctx, -1, -16, 2.2, 1.2); K.puddle(ctx, 5, -22, 1.6, 1); K.puddle(ctx, 7, -15.4, 1.2, 0.8);

    // ------------------------------------------------ the casting shed
    divider(-9.8, 2, -25.6);
    ctx.marks.shedGate = gateAt(4, -25.6, 2.6, { h: 2.6, open: true, swingDir: -1 });
    divider(6, 11, -25.6);
    K.wall(ctx, -9.8, -38.4, -9.8, -25.6, 8.5, { thick: 1.2, arches: 2, litArches: [1], tone: BRICK });
    P.gargoyle(ctx, -9.8, 8.7, -27, Math.PI / 2);
    P.cupola(ctx, -7.6, -31.8, { r: 1.3, h: 9 });
    P.channel(ctx, -4.8, -31.8, -1.9, -31.8, { gaps: [-3.35], gapW: 1.6, lights: 0 });
    P.castPit(ctx, -0.6, -31.8, 2.6, 2.6, { hot: true });
    P.castPit(ctx, 4.4, -34.4, 3, 3, { old: true });
    K.fence(ctx, 8.6, -25.6, 8.6, -37.8, { h: 1.5 });
    const shedTop = yTop(-9.2, 8.6, 8.3, 6.9);
    for (const z of [-27.4, -31, -34.4]) { P.column(ctx, 8.6, z, 6.4); P.truss(ctx, -9.2, 8.6, z, 6.4, 8.3, 6.9); }
    P.purlins(ctx, [-4.6, 3.4], -37.4, -26, shedTop);
    P.chain(ctx, [3.8, 6.4, -34.4], [3.8, 4.1, -34.4]); P.ladle(ctx, 3.8, 3.5, -34.4, 0.1);
    P.chain(ctx, [-4, 6.4, -27.4], [-4, 3, -27.4]); P.hook(ctx, -4, 3, -27.4);
    K.torch(ctx, -9.2, 2.4, -36.4, '+x');
    P.mould(ctx, -8.4, -27, 1.1); P.mould(ctx, -8.4, -36.6, 1, { core: true });
    P.tippedBell(ctx, 7, -27.4, 1.3, -2.2); P.ingots(ctx, 7.2, -36.8, 3); P.ingots(ctx, -3.2, -36.8, 4);
    P.anvil(ctx, -1, -27, -0.5); P.coal(ctx, -5.6, -36.6, 0.8, 0.6);
    K.fallenBody(ctx, 1.6, -29.4, 1.4, 0x1c1816);
    P.slag(ctx, 9.9, -30, 1.1, 0.7); P.tub(ctx, 9.8, -35.4, 1.2, true);

    // ------------------------------------------------ the last lamp
    divider(-9.8, -0.6, -37.8);
    ctx.marks.pitGate = gateAt(1.4, -37.8, 2.6, { h: 2.6, swingDir: 1 });
    divider(3.4, 11, -37.8);
    K.wall(ctx, -3.8, -41.6, -3.8, -37.8, 1.6, { thick: 0.5, tone: SOOT });
    K.fence(ctx, 8.2, -37.8, 8.2, -41.6, { h: 1.5 });
    P.coal(ctx, -7, -39.7, 1.4, 1.1); P.tub(ctx, -5.2, -40.6, 0.3);
    P.slag(ctx, 9.8, -39.7, 1, 0.7);

    // ------------------------------------------------ the great casting pit (the Bellfounder's floor)
    divider(-11.6, 0.3, -41.6);
    ctx.marks.arenaGate = gateAt(2.4, -41.6, 2.8, { h: 2.8, open: true, swingDir: -1 });
    divider(4.5, 11.4, -41.6);
    // the west wall: two furnaces, the trough before them, the door out to the stair
    K.wall(ctx, -12.2, -53.7, -12.2, -41.6, 9, { thick: 1.2, tone: BRICK });
    K.wall(ctx, -12.2, -67, -12.2, -57.5, 9, { thick: 1.2, tone: BRICK });
    K.add(ctx, K.box(1.2, 4.6, 3.8), W.brick(BRICK), -12.2, 6.7, -55.6);
    K.add(ctx, K.box(1.36, 0.4, 2.6), W.ashlar('#4a4650'), -12.2, 4.2, -55.6);
    ctx.marks.exitGate = gateAt(-12.2, -55.6, 2.4, { h: 3.2, swingDir: 1 }, 'z');
    for (const z of [-45.4, -50.2]) P.furnace(ctx, -11.6, z, { flue: 12.5 });
    P.channel(ctx, -9.05, -43.6, -9.05, -58.95, { gaps: [-55.6], gapW: 2.4, lights: 2 });
    K.torch(ctx, -11.6, 2.4, -43, '+x');
    // the pit, its side platforms, the crane holding the great bell, the back wall
    P.greatPit(ctx, -8, -65.4, 8, -59.4);
    for (const [x0, x1] of [[-11.6, -8.45], [8.45, 11.4]]) { K.add(ctx, K.box(x1 - x0, 0.7, 7.45), W.ashlar('#3e3a3e'), (x0 + x1) / 2, 0.35, -62.675); K.solid(ctx, x0, -66.4, x1, -58.95, 0.8); }
    const gt = P.gantry(ctx, -9.8, 9.8, -62.4, 10.5, { spread: 1.4 });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.chain(ctx, [gt.x + dx * 0.35, gt.y, gt.z + dz * 0.35], [dx * 0.14, 3.42, -62.4 + dz * 0.14]);
    K.wall(ctx, -12.8, -67, 11.4, -67, 10, { thick: 1.2, buttress: 4.8, arches: 4, litArches: [0, 3], tone: BRICK });
    P.gargoyle(ctx, -6, 10.2, -67, 0); P.gargoyle(ctx, 6.4, 10.2, -67, 0);
    // the east side: columns and a railing open to the rain
    K.fence(ctx, 11.4, -41.6, 11.4, -58.95, { h: 1.6 });
    for (const z of [-44, -50, -56]) P.column(ctx, 11.4, z, 5);
    P.brazier(ctx, -7.6, -42.9); P.brazier(ctx, 10.2, -57.8); P.brazier(ctx, 10.2, -43);
    P.tippedBell(ctx, 9.2, -46.8, 1.3, 2.4); P.tippedBell(ctx, -6.8, -57.8, 1.1, -0.4);
    K.fallenBody(ctx, 4.6, -46, 0.4); K.droppedSword(ctx, 5.6, -46.6, 2.4); K.fallenBody(ctx, -3, -53.6, -1.2, 0x1c1816);
    K.puddle(ctx, -2, -46, 2.2, 1.2); K.puddle(ctx, 5.5, -53, 1.6, 1); K.puddle(ctx, -5, -50, 1.4, 0.9);
    P.slag(ctx, 14, -48, 1.8, 1.1); P.slag(ctx, 13.6, -58, 1.4, 0.8);
    // the stair out, up toward the heights
    K.wall(ctx, -17.4, -53.3, -12.8, -53.3, 4.5, { thick: 0.6, tone: SOOT });
    K.wall(ctx, -17.4, -57.8, -12.8, -57.8, 5, { thick: 0.6, tone: SOOT });
    K.wall(ctx, -17.6, -58.1, -17.6, -53, 6, { thick: 0.6, tone: SOOT });
    K.steps(ctx, -13.6, -55.6, 3.6, 7, 'x-', 0.2, 0.45, '#4c4e56');
    K.torch(ctx, -15, 2.2, -57.5, '+z');

    // ------------------------------------------------ sparks rising from every fire
    const fire = [];
    for (const z of [1.2, -3.2, -7.6, -45.4, -50.2]) fire.push([-9.3, z - 0.6, -8.4, z + 0.6, 1, 10, 4.5]);
    fire.push([-9.2, -8.8, -8.6, 2.4, 0.1, 8, 2], [-8.5, -5.6, -4.8, -5.2, 0.1, 5, 2], [-4.3, -6.2, -2.7, -4.6, 0.2, 6, 2.5]);
    fire.push([-6.2, -32.2, -4.6, -31.4, 0.3, 8, 3], [-1.4, -32.6, 0.2, -31, 0.2, 6, 2.5], [4.3, -34.6, 4.7, -34.2, 0.2, 8, 2]);
    fire.push([-7.5, -64.8, 7.5, -59.8, 0.2, 40, 6], [-9.3, -58.8, -8.8, -43.8, 0.1, 10, 2]);
    P.sparks(ctx, fire);
  },
};
