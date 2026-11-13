// District III — Mirewater Docks. The harbour at the river mouth, in fog: the landing below the
// warehouses, the fish market on the quay, the long pier past a ship that came back with no one
// aboard, the Salt Quay under the warehouse loading decks, and the Graving Quay by the dry dock
// (a wreck on its keel blocks) where the Harbormaster drags the drowned ashore.
import * as P from '../props/docks.js';

export default {
  id: 'docks', name: 'Mirewater Docks', tagline: 'THE SHIPS CAME BACK. THE CREWS DID NOT.', tier: 2,
  start: { x: 0.4, z: 14.4, face: Math.PI },
  bounds: [-26, -56, 14, 17.6],
  gatesOpen: ['landGate', 'pierGate'],
  ambience: {
    fog: 0x1c262e, fogNear: 68, fogFar: 160, sky: 0x0a0e13, moon: 1.5, hemi: 0.9, rain: 0.6, lightning: false,
    beams: [{ x: 0, z: 11.5, r: 4.6, h: 26, from: [6, 0, -10], intensity: 65 }, { x: -0.5, z: -45, r: 7.5, h: 28, from: [6, 0, -10], intensity: 80 }],
  },
  lamps: [{ id: 'landing', x: -5.5, z: 10.4, sx: 1.3, sz: 0.4 }, { id: 'quay', x: -2.8, z: -33.2, sx: 1.3, sz: 0.5 }],
  items: [{ id: 'c1', x: 9.3, z: -1.5, ry: 0, kind: 'embers', amount: 120 }, { id: 'c2', x: -6.1, z: -31.6, ry: Math.PI / 2, kind: 'tonic' }],
  hints: [
    { zone: [-7, 9.5, 5.5, 17.6], text: 'LIGHT THE LAMP FIRST. THE PIERS ARE NOT EMPTY.' },
    { zone: [-7, 6.4, 5.5, 8.6], text: 'HOUNDS HUNT IN PACKS. KEEP THEM IN FRONT OF YOU.' },
    { zone: [-2.6, -12, 2.6, -8.3], text: 'A LIT FLASK ARCS OVERHEAD. MOVE BEFORE IT LANDS.' },
    { zone: [-4.4, -35.2, 10, -33.4], text: 'SOMETHING HUGE STIRS IN THE HARBOUR WATER.' },
  ],
  foes: [
    { t: 'hushed', x: 2.6, z: 8.8 }, { t: 'hushed', x: -2.8, z: 7.6 },
    { t: 'hound', x: -1.0, z: -13.4 }, { t: 'hound', x: 1.2, z: -14.4 }, { t: 'hound', x: -0.4, z: -15.6 },
    { t: 'spitter', x: -1.7, z: -18.0 }, { t: 'bomber', x: 1.6, z: -17.4 },
  ],
  encounters: [
    { id: 'market', zone: [-6.6, -6.7, 5.0, 5.2], gates: ['landGate'], opens: ['marketGate'], msg: 'THE DOCKHANDS DROP THEIR NETS',
      waves: [
        { pre: true, foes: [{ t: 'hushed', x: -3.6, z: 1.0 }, { t: 'hushed', x: 2.4, z: -1.4 }, { t: 'hushed', x: -2.2, z: -4.4 }] },
        { foes: [{ t: 'hound', x: 3.4, z: -5.4 }, { t: 'hound', x: -4.4, z: -4.6 }, { t: 'spitter', x: 7.6, z: -1.6 }, { t: 'hushed', x: -1.0, z: 3.6 }] },
      ] },
    { id: 'quay', zone: [-4.4, -34.0, 9.4, -20.4], gates: ['pierGate'], opens: ['dockGate'], msg: 'THE HOLDS ARE NOT EMPTY',
      waves: [
        { pre: true, foes: [{ t: 'crossbow', x: -5.8, z: -27.0 }, { t: 'hushed', x: 3.8, z: -24.2 }, { t: 'hushed', x: -1.6, z: -30.0 }] },
        { foes: [{ t: 'brute', x: 2.6, z: -28.6 }, { t: 'hound', x: 7.0, z: -31.4 }, { t: 'hound', x: -2.4, z: -22.8 }] },
      ] },
  ],
  boss: { type: 'harbormaster', x: -0.4, z: -46.5, face: 0, zone: [-9.6, -52.4, 9.4, -36.6], gates: ['dockGate'], opens: ['exitGate'] },
  exit: { zone: [-17.4, -52.6, -14.2, -49.2], to: 'nave', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ water, quays, ground
    P.harbour(ctx, 2.6, -80, 30, 24); P.harbour(ctx, -40, -80, 2.6, -53); P.harbour(ctx, -16, -19.5, 2.6, -8.2);
    P.waterSolid(ctx, 5.5, 0.2, 14, 17.6); P.waterSolid(ctx, 5.5, -8.2, 14, -3.2); P.waterSolid(ctx, 10.2, -3.2, 14, 0.2);
    P.waterSolid(ctx, 2.6, -19.5, 14, -8.2); P.waterSolid(ctx, -16, -19.5, -2.6, -8.2);
    P.waterSolid(ctx, 10, -56, 14, -19.5); P.waterSolid(ctx, -26, -56, 10, -53);
    P.quay(ctx, 5.5, 0.2, 5.5, 17.6, '+x'); P.quay(ctx, 5.5, -8.2, 5.5, -3.2, '+x');
    P.quay(ctx, -16, -8.2, -2.6, -8.2, '-z'); P.quay(ctx, 2.6, -8.2, 5.5, -8.2, '-z');
    P.quay(ctx, -16, -19.5, -2.6, -19.5, '+z'); P.quay(ctx, 2.6, -19.5, 10, -19.5, '+z');
    P.quay(ctx, -16, -19.5, -16, -8.2, '+x'); P.quay(ctx, 10, -53, 10, -19.5, '+x'); P.quay(ctx, -26, -53, 10, -53, '-z');
    K.floor(ctx, -7, 6, 5.5, 17.6, K.M.cobble('#505a66'));
    K.floor(ctx, -26, -8.2, -7, 17.6, K.M.cobble('#48525e'));
    K.floor(ctx, -7, -8.2, 5.5, 6, K.M.court('#5a6470'), 0, 0.4);
    K.floor(ctx, -26, -19.5, -16, -8.2, K.M.cobble('#48525e'));
    K.floor(ctx, -26, -35.4, 10, -19.5, K.M.cobble('#4e5864'));
    K.floor(ctx, -4.6, -35.2, 10, -19.7, K.M.flags('#56606c'), 0.02, 0.42);
    K.floor(ctx, -10.6, -53, 10, -35.4, K.M.court('#56606c'));
    K.floor(ctx, -26, -36.4, -10.6, -35.4, K.M.cobble('#4a5460')); K.floor(ctx, -26, -53, -10.6, -47.6, K.M.cobble('#4a5460'));
    K.floor(ctx, -26, -47.6, -20, -36.4, K.M.cobble('#4a5460')); K.floor(ctx, -11.2, -47.6, -10.6, -36.4, K.M.cobble('#4a5460'));

    // ------------------------------------------------ the landing (the way in)
    P.warehouse(ctx, -10, 11.8, 6, 11.6, 6.4, { front: '+x', doors: [-2.6, 2.8], lit: 0.35, ajar: 1 });
    K.lamp(ctx, 4.6, 15.6);
    for (const z of [16.4, 12.6, 7.2]) P.bollard(ctx, 5.0, z, z === 12.6);
    P.rowboat(ctx, 7.2, 12.4, 4.4, 'z', { moor: [5.0, 0.6, 12.6], water: true }); P.rowboat(ctx, 8.6, 6.4, 4, 'z', { tone: '#2e241a', crates: 2 });
    K.cart(ctx, -4.4, 15.4, 0.25); K.crate(ctx, -4.4, 15.2, { y: 0.75, s: 0.5, solid: false }); P.basket(ctx, -4.0, 16.1, 0.75, 0.28);
    K.barrel(ctx, -6.3, 13.8); K.barrel(ctx, -6.2, 14.7, { s: 0.85 }); K.crate(ctx, -6.4, 7.0, { s: 0.7 }); P.sacks(ctx, -6.2, 16.6, 2, 'x');
    P.pots(ctx, 4.3, 10.4, 4); P.ropeCoil(ctx, 3.6, 13.6);
    K.puddle(ctx, -1.5, 11.5, 2.2, 1.2); K.puddle(ctx, 2.4, 15.6, 1.4, 1); K.puddle(ctx, -3, 8.4, 1.2, 1.5);
    K.fallenBody(ctx, 1.4, 11.2, 2.2, 0x1a1c20);

    // ------------------------------------------------ the fish market
    K.fence(ctx, -7, 6, -1.75, 6);
    ctx.marks.landGate = K.gate(ctx, 0, 6, 2.8, 'x', { h: 2.6, open: true, swingDir: -1 });
    K.fence(ctx, 1.75, 6, 5.5, 6);
    P.warehouse(ctx, -10.5, -1.1, 7, 14.2, 7.6, { front: '+x', doors: [-3.6, 3.4], clad: '#3e3a36', lucam: 3.4, sign: 0.4, lit: 0.4 });
    K.torch(ctx, -7, 2.6, 0.9, '+x');
    P.fishStall(ctx, -5.55, 2.8, { face: '+x', w: 2.4, cloth: '#3e4a48', light: 2.2 });
    P.fishStall(ctx, -5.55, -2.4, { face: '+x', w: 2.4, cloth: '#4a2c28' });
    P.fishStall(ctx, -3.8, -6.45, { face: '+z', w: 2.4, d: 1.2, cloth: '#363c48' });
    P.netRack(ctx, 4.5, 2.9, 2.6, 'z');
    P.crane(ctx, 4.5, -6.5, '+x', { h: 5.6, reach: 3.4, loadY: 1.4 });
    P.pier(ctx, 5.5, -3.2, 10.2, 0.2, { boards: 'z', endBeam: [10.1, -1.5] });
    P.rowboat(ctx, 8.0, 1.25, 4.6, 'x', { moor: [6.2, 0.5, 0.0], crates: 2 }); P.rowboat(ctx, 7.6, -4.3, 4, 'x', { tone: '#2e241a', water: true });
    P.bollard(ctx, 6.2, -0.05); P.bollard(ctx, 10.0, -3.0);
    K.lamp(ctx, 4.9, -2.4, { h: 2.8 });
    K.barrelStack(ctx, -6.4, 4.6); K.crate(ctx, 3.8, 5.2, { s: 0.7 }); K.crate(ctx, 4.5, 5.0, { s: 0.55 });
    K.table(ctx, 1.2, -5.0, { benches: false }); P.basket(ctx, 0.6, -5.0, 0.82, 0.22); P.basket(ctx, 1.7, -4.9, 0.82, 0.2);
    for (const [x, z] of [[-2.2, -5.4], [1.8, -6.8], [4.4, -0.6], [-4.0, 4.9], [3.6, 0.6]]) P.basket(ctx, x, z);
    P.ropeCoil(ctx, 3.2, -3.0); P.pots(ctx, 2.9, -6.9, 3);
    P.litter(ctx, -4, -6, 4, 5, 14, [2.2, 1.4, 1.8, 1.4, -0.3]);
    K.fallenBody(ctx, -1.6, 0.4, 2.0); K.droppedSword(ctx, -0.4, 1.2, 0.6); K.fallenBody(ctx, 1.8, -3.2, -0.7, 0x1c181a);
    K.puddle(ctx, 0.2, 1.6, 2.4, 1.3); K.puddle(ctx, -2.6, -3.6, 1.6, 1.1); K.puddle(ctx, 2.6, 3.6, 1.2, 1.4);
    K.fence(ctx, -7, -7.6, -1.75, -7.6);
    ctx.marks.marketGate = K.gate(ctx, 0, -7.6, 2.8, 'x', { h: 2.6 });
    K.fence(ctx, 1.75, -7.6, 5.5, -7.6);

    // ------------------------------------------------ the long pier, and the ship that came back
    P.pier(ctx, -2.6, -19.5, 2.6, -8.2, { boards: 'x', bothPosts: true });
    P.ship(ctx, -6.5, -13.4, { len: 9.6, beam: 3.6, bow: '-z', masts: [9.5, 10.5], lantern: 2.2,
      moor: [[[3.6, 1.6], [-2.35, 0.5, -16.6]], [[-4.2, 1.6], [-2.35, 0.5, -10.4]]], plank: [-0.6, 1, -2.4, -13.0] });
    P.warehouse(ctx, -19.8, -13.85, 7, 11.3, 6.6, { front: '+x', doors: [-2.2, 2.6], clad: '#3a3632', lit: 0.25, end: false });
    for (const z of [-10.4, -16.6]) P.bollard(ctx, -2.3, z);
    P.bollard(ctx, 2.3, -13.2, true);
    P.pierLantern(ctx, 2.25, -10.6, '-x', 2.6); P.pierLantern(ctx, -2.25, -15.0, '+x', 2.6);
    P.rowboat(ctx, 4.2, -12.4, 4.2, 'z', { moor: [2.3, 0.6, -13.2], water: true }); P.rowboat(ctx, 4.6, -17.2, 4.4, 'z', { tone: '#2e241a' });
    K.crate(ctx, 0.2, -16.6, { s: 0.7 }); K.crate(ctx, 0.5, -16.0, { s: 0.5 }); K.barrel(ctx, -2.0, -12.0, { s: 0.85 });
    P.litter(ctx, -2, -18, 2, -9, 8);
    P.pots(ctx, 1.7, -10.0, 3); P.ropeCoil(ctx, -1.6, -17.0); P.sacks(ctx, -1.6, -9.4, 2, 'x');
    K.fallenBody(ctx, 0.6, -11.6, 1.2); K.droppedSword(ctx, -0.6, -12.2, 2.4);
    K.fence(ctx, -2.6, -19.0, -1.75, -19.0);
    ctx.marks.pierGate = K.gate(ctx, 0, -19.0, 2.8, 'x', { h: 2.4, open: true, swingDir: -1 });
    K.fence(ctx, 1.75, -19.0, 2.6, -19.0);

    // ------------------------------------------------ the Salt Quay
    P.warehouse(ctx, -11, -27.3, 8, 14.6, 8.2, { front: '+x', doors: [-2.6, 2.6], clad: '#403a34', base: 3, lit: 0.3, lucam: -2.6, loadY: [4.2, 3.6] });
    P.loadingDeck(ctx, -7, -32.6, -4.6, -21.4, [[-32.6, -28.4], [-25.6, -21.4]]);
    K.torch(ctx, -7, 2.8, -27, '+x');
    P.sacks(ctx, -5.6, -22.4, 2, 'z'); K.crate(ctx, -6.4, -24.0, { s: 0.7 }); K.crate(ctx, -6.4, -24.0, { s: 0.45, y: 0.7, solid: false });
    P.crane(ctx, 9.0, -32.4, '+x', { h: 6, reach: 3.6, load: 'net', loadY: 2.4 });
    for (const z of [-22.6, -26.8, -29.6]) P.bollard(ctx, 9.6, z, z === -26.8);
    P.sacks(ctx, 6.8, -21.6, 3, 'x'); K.barrelStack(ctx, 5.6, -34.2); K.crate(ctx, 8.6, -21.4, { s: 0.7 });
    K.crate(ctx, -3.6, -21.0, { s: 0.8 }); K.crate(ctx, -2.9, -20.9, { s: 0.55 }); P.basket(ctx, 3.6, -34.4, 0, 0.35, false);
    K.lamp(ctx, 8.8, -20.4);
    P.rowboat(ctx, 12.2, -27.0, 6.2, 'z', { w: 2.0, tone: '#2e241a', crates: 3 });
    K.fallenBody(ctx, 1.4, -26.4, 0.4); K.droppedSword(ctx, 2.6, -25.8, 1.8);
    K.puddle(ctx, 2, -23.4, 2.4, 1.3); K.puddle(ctx, -2.2, -27.6, 1.6, 1.2); K.puddle(ctx, 5.6, -30, 1.6, 1.0);
    K.fence(ctx, -11.4, -35.4, -1.85, -35.4);
    ctx.marks.dockGate = K.gate(ctx, 0, -35.4, 3, 'x', { h: 2.8 });
    K.fence(ctx, 1.85, -35.4, 10, -35.4);

    // ------------------------------------------------ the Graving Quay (the Harbormaster) and the dry dock
    P.dryDock(ctx, -20, -47.6, -11.2, -36.4);
    P.wreck(ctx, -15.4, P.PIT_Y + 0.75, -42.0, { len: 9.2, beam: 3.8, depth: 3.0, heel: 0.42, along: 'z' });
    P.sheerLegs(ctx, [-18.6, -35.9], [-12.6, -35.9], [-15.6, 10.5, -39.4], 2.4);
    P.chainRail(ctx, -10.95, -47.4, -10.95, -36.6);
    P.ship(ctx, 1.0, -57.0, { len: 14, beam: 4.4, bow: '+x', masts: [12, 13], lantern: 2.4, sails: ['furl', 'hang', 'bare', 'hang', 'furl', 'hang'],
      moor: [[[5.6, 2.2], [6.0, 0.5, -52.6]], [[-5.6, 2.2], [-4.0, 0.5, -52.6]]] });
    for (const x of [-7.6, -4.0, 2.0, 6.0]) P.bollard(ctx, x, -52.6, x === 2.0);
    for (const z of [-40.4, -45.6]) P.bollard(ctx, 9.6, z);
    P.quayRails(ctx, -10.6, 10, -50.2); P.litter(ctx, -9, -51.5, 8.5, -38, 22, [-3.8, -39.2, 2.6, 1.8, 0.4]);
    P.anchor(ctx, 6.0, -49.4, 0.5); P.capstan(ctx, -8.0, -38.6); P.ropeCoil(ctx, -8.6, -51.6); P.ropeCoil(ctx, 8.2, -43.0);
    K.crate(ctx, 8.8, -37.4); K.crate(ctx, 8.9, -38.3, { s: 0.6 }); K.barrel(ctx, -9.6, -52.2); K.barrel(ctx, -8.9, -52.4, { s: 0.85 });
    K.lamp(ctx, 9.2, -36.4); K.lamp(ctx, 9.2, -52.4); K.lamp(ctx, -9.8, -36.6, { h: 2.8 });
    K.fallenBody(ctx, 3.6, -41.6, 2.6); K.droppedSword(ctx, 4.8, -42.0, 0.9); K.fallenBody(ctx, -4.6, -49.0, -0.5, 0x1c181a);
    K.puddle(ctx, -2.5, -41, 2.6, 1.4); K.puddle(ctx, 4.5, -47, 2, 1.2); K.puddle(ctx, -6, -46.5, 1.4, 1.1);
    P.lighthouse(ctx, 12.5, -60.5, { h: 5 }); // the mole light at the harbour mouth
    // the way out: the walk along the dock gate, toward the nave
    ctx.marks.exitGate = K.gate(ctx, -10.6, -50.6, 2.8, 'z', { h: 2.8 });
    K.house(ctx, -22.6, -50.6, 5, 4.8, 5.4, { lit: 0.5, doorSide: 'x', windowLights: false });
    K.steps(ctx, -19.5, -50.6, 2, 2, 'x-', 0.18, 0.4);
    K.lamp(ctx, -16.0, -48.8, { h: 2.6 }); K.crate(ctx, -12.8, -52.4, { s: 0.7 }); P.ropeCoil(ctx, -18.6, -52.4);

    // ------------------------------------------------ last: mist on the water, ripples, instanced parts
    P.mist(ctx, [[2.6, -64, 22, 20], [-30, -66, 2.6, -53], [-16, -19.5, 2.6, -8.2]], -0.6, 0.22);
    P.mist(ctx, [[-30, -70, 24, -55.2]], 1.0, 0.16); P.mist(ctx, [[-30, -72, 24, -55.6]], 2.6, 0.12);
    P.ripples(ctx, [[5.6, -8.1, 16, 17.6], [2.7, -19.4, 16, -8.3], [10.1, -60, 16, -19.6], [-16, -19.4, -2.7, -8.3], [-22, -62, 10, -53.1]]);
    P.finish(ctx);
  },
};
