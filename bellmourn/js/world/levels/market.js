// District II — Lantern Row. The candle-makers' quarter along the canals: the canal road in, the
// Wick Market (the stallholders never left), the bridge to the chandlers' quay, the tallow works
// where the Executioner waits, and over the last bridge Candlemas Square before the Chandlers' Hall,
// where Mother Tallow keeps every candle burning.
import * as P from '../props/market.js';

export default {
  id: 'market', name: 'Lantern Row', tagline: 'THE CANDLES STILL BURN. NO ONE LIT THEM.', tier: 1,
  start: { x: 0, z: 15.5, face: Math.PI },
  bounds: [-56.6, -46, 14, 18],
  gatesOpen: ['marketGate', 'yardGate'],
  ambience: {
    fog: 0x1e2632, fogNear: 78, fogFar: 175, sky: 0x0b0f17, moon: 1.6, hemi: 0.9, rain: 1, lightning: true,
    beams: [{ x: -2.5, z: -7, r: 6, h: 26, from: [6, 0, -10], intensity: 70 }, { x: -46, z: -31.5, r: 8, h: 28, from: [6, 0, -10], intensity: 85 }],
  },
  lamps: [{ id: 'row', x: -5.6, z: 6, sx: 1.3, sz: 0.4 }, { id: 'works', x: -25.6, z: -29.8, sx: 1.2, sz: 0.6 }],
  items: [{ id: 'c1', x: 9, z: -28.6, ry: 0, kind: 'embers', amount: 90 }, { id: 'c2', x: -8.6, z: -14.5, ry: 0, kind: 'tonic' }],
  hints: [
    { zone: [-7, 9.5, 5.2, 18], text: 'HOLD K FULLY, THEN LET GO: THE CRIMSON WAVE.', touch: 'HOLD HVY FULLY, THEN LET GO: THE CRIMSON WAVE.' },
    { zone: [-7, 0.9, 5, 5], text: 'PARRY A BOLT OR A FLAME AND IT FLIES BACK.' },
    { zone: [-13, -30, -8.5, -21.6], text: 'EVEN THE HEAVIEST BLOW CAN BE PARRIED. THEN FINISH.' },
    { zone: [-27.4, -28.6, -24, -23.4], text: 'ACROSS THE WATER, ONE OF THE CANDLES MOVES.' },
  ],
  foes: [
    { t: 'hushed', x: 1.4, z: 7.4 }, { t: 'hushed', x: 2.6, z: 2.6 },
    { t: 'hushed', x: -3.6, z: -25.4 }, { t: 'ghoul', x: -9.4, z: -23.6 }, { t: 'crossbow', x: -11.4, z: -27.6 }, { t: 'acolyte', x: -6, z: -28 },
    { t: 'hushed', x: 7.6, z: -24.6 },
  ],
  encounters: [
    { id: 'market', zone: [-10.2, -14.8, 4.8, -0.4], gates: ['marketGate'], opens: ['bridgeGate'], msg: 'THE STALLKEEPERS LEAVE THEIR STALLS',
      waves: [
        { pre: true, foes: [{ t: 'hushed', x: -7.4, z: -4.4 }, { t: 'hushed', x: 2.2, z: -4.6 }, { t: 'hushed', x: -7.2, z: -8.6 }] },
        { foes: [{ t: 'ghoul', x: -3.6, z: -12.6 }, { t: 'ghoul', x: 2, z: -1.6 }, { t: 'crossbow', x: -0.4, z: -13.6 }, { t: 'hushed', x: -5.6, z: -0.8 }] },
      ] },
    { id: 'works', zone: [-27.2, -35.5, -14, -21.8], gates: ['yardGate'], opens: ['squareGate'], msg: 'SOMETHING STIRS IN THE TALLOW',
      waves: [
        { foes: [{ t: 'brute', x: -20.6, z: -30.4 }] },
        { foes: [{ t: 'hushed', x: -16.2, z: -23.8 }, { t: 'hushed', x: -24.6, z: -23.4 }, { t: 'crossbow', x: -21, z: -32 }] },
      ] },
  ],
  boss: { type: 'tallow', x: -46, z: -31.5, face: Math.PI / 2, zone: [-54.4, -41.2, -36.4, -22.2], gates: ['squareGate'], opens: ['exitGate'] },
  exit: { zone: [-48.2, -46, -46, -43.4], to: 'nave', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ ground and water
    K.floor(ctx, -12, 0.6, 5.5, 27, K.M.cobble('#545e6c'));
    K.floor(ctx, -16.5, -15.5, 5.5, 0.6, K.M.cobble('#56606e'));
    K.floor(ctx, -10.5, -15, 5, 0.6, K.M.court('#5e6876'), 0.02, 0.42);
    K.floor(ctx, 11.5, -36, 18, 27, K.M.cobble('#505a68'));
    K.floor(ctx, -28, -44, 11.5, -21, K.M.cobble('#545e6c'));
    K.floor(ctx, -13, -29.9, 11, -21.5, K.M.flags('#5a6472'), 0.02, 0.42);
    K.floor(ctx, -66, -50, -35, -21, K.M.cobble('#545e6c'));
    K.floor(ctx, -55.8, -41.6, -35.6, -21.6, K.M.court('#5c6674'), 0.02, 0.42);
    K.floor(ctx, -62, -15.5, -16.5, -2, K.M.cobble('#4c5664'));
    P.canal(ctx, 5.5, -15.5, 11.5, 26); P.canal(ctx, -62, -21, 11.5, -15.5); P.canal(ctx, -35, -50, -28, -21);
    P.waterSolid(ctx, 5.5, -15.5, 11.5, 26); P.waterSolid(ctx, -62, -21, -2.3, -15.5); P.waterSolid(ctx, 1.8, -21, 11.5, -15.5);
    P.waterSolid(ctx, -35, -50, -28, -27.3); P.waterSolid(ctx, -35, -24.7, -28, -21);
    P.quay(ctx, 5.5, -15.5, 5.5, 26, '+x'); P.quay(ctx, 11.5, -21, 11.5, 26, '-x');
    P.quay(ctx, -62, -15.5, -2.3, -15.5, '-z'); P.quay(ctx, 1.8, -15.5, 5.5, -15.5, '-z');
    P.quay(ctx, -62, -21, -35, -21, '+z'); P.quay(ctx, -28, -21, -2.3, -21, '+z'); P.quay(ctx, 1.8, -21, 11.5, -21, '+z');
    P.quay(ctx, -35, -50, -35, -27.3, '+x'); P.quay(ctx, -35, -24.7, -35, -21, '+x');
    P.quay(ctx, -28, -50, -28, -27.3, '-x'); P.quay(ctx, -28, -24.7, -28, -21, '-x');

    // ------------------------------------------------ the canal road (the way in)
    P.canalHouse(ctx, -9.5, 4.9, 5, 3.8, 7.2, { sign: true });
    P.canalHouse(ctx, -9.5, 8.5, 5, 3.4, 8.6, { hoist: true, plaster: '#4c5262' });
    P.canalHouse(ctx, -9.5, 12.3, 5, 4.2, 6.8, { light: 1.6 });
    P.canalHouse(ctx, -9.5, 16.2, 5, 3.6, 8, { plaster: '#46505e' });
    P.canalHouse(ctx, -9.5, 20, 5, 4, 7, {});
    P.canalHouse(ctx, -9.5, 24, 5, 4, 8.2, { plaster: '#4a4e5c' });
    K.house(ctx, -9.5, 1.8, 5, 2.4, 3.2, { lit: 0.6, doorSide: 'x', ridge: 'z', roofH: 1.4, windowLights: false, chimney: false });
    const r1 = P.stringPost(ctx, 4.7, 5), r2 = P.stringPost(ctx, 4.7, 12.8);
    P.lanterns(ctx, [-6.95, 5.3, 5], r1, { n: 8 }); P.lanterns(ctx, [-6.95, 5.6, 12.8], r2, { n: 8, colors: ['#ffc060', '#ff6038', '#ff9440'] });
    P.stall(ctx, 3.4, 9.4, { face: '-x', cloth: '#2a5a5a', light: 2 });
    for (const z of [2.2, 7.4, 11, 15, 19, 23]) P.bollard(ctx, 4.75, z);
    P.boat(ctx, 7.2, 9.5, 4.6, 'z', { light: 0 }); P.boat(ctx, 7.1, -8.5, 4.4, 'z', { lantern: false }); P.boat(ctx, 10, 1.2, 4.2, 'z', { lantern: false, tone: '#3e2c22' });
    K.cart(ctx, -4.6, 11.4, 0.2); K.crate(ctx, -4.6, 11.2, { y: 0.75, s: 0.5, solid: false });
    K.barrel(ctx, -6.4, 9.6); K.barrel(ctx, -6.3, 14.9, { s: 0.85 }); K.crate(ctx, 3.9, 6.6, { s: 0.7 });
    P.candles(ctx, -6.55, 0, 6.75, 6); P.candles(ctx, -6.5, 0, 14.4, 5); P.candles(ctx, 4.2, 0, 7.8, 4);
    K.lamp(ctx, 4.4, 16.6);
    K.puddle(ctx, -1.5, 9, 2, 1.1); K.puddle(ctx, 1.5, 3.6, 1.4, 1); K.puddle(ctx, -3, 15.8, 1.2, 1.6);
    // behind: the road in from Gallows Gate, its gate left open
    K.fence(ctx, -7, 19.6, -2.9, 19.6); K.gate(ctx, -0.6, 19.6, 3.2, 'x', { h: 2.8, open: true, swingDir: 1 }); K.fence(ctx, 1.7, 19.6, 5, 19.6);
    // the far bank: low sheds and stacks across the water
    K.wall(ctx, 13.6, -21, 13.6, 26, 1, { thick: 0.5 });
    K.house(ctx, 16, -7, 3.6, 6, 2.4, { lit: 0.3, doorSide: 'x', roofH: 1.4, windowLights: false, chimney: false });
    K.house(ctx, 16, 10, 3.6, 5, 2.6, { lit: 0.2, doorSide: 'x', roofH: 1.4, windowLights: false });
    K.crate(ctx, 12.4, -3); K.crate(ctx, 12.5, -3.9, { s: 0.6 }); K.barrel(ctx, 12.4, 5.6); K.barrel(ctx, 12.5, 6.5, { s: 0.9 }); K.crate(ctx, 12.4, 15.5);
    K.lamp(ctx, 12.4, 3, { h: 2.6 });

    // ------------------------------------------------ the Wick Market
    K.fence(ctx, -7, 0.6, -3.1, 0.6);
    ctx.marks.marketGate = K.gate(ctx, -1, 0.6, 2.8, 'x', { h: 2.6, open: true, swingDir: -1 });
    K.fence(ctx, 1.1, 0.6, 5, 0.6);
    P.canalHouse(ctx, -13.5, -1.4, 6, 4, 7.6, {});
    P.canalHouse(ctx, -13.5, -5.3, 6, 3.8, 9.2, { hoist: true, sign: true, light: 1.6 });
    P.canalHouse(ctx, -13.5, -9.3, 6, 4.2, 7, { plaster: '#4a5060' });
    P.canalHouse(ctx, -13.5, -13.45, 6, 4.1, 8.2, {});
    K.fence(ctx, -10.5, -15.25, -2.45, -15.25, { h: 1.3, kerb: 0.2 });
    ctx.marks.bridgeGate = K.gate(ctx, -0.25, -15.25, 3, 'x', { h: 2.6 });
    K.fence(ctx, 1.95, -15.25, 5.25, -15.25, { h: 1.3, kerb: 0.2 });
    K.fence(ctx, 5.25, -15.25, 5.25, 0.6, { h: 1.3, kerb: 0.2 });
    P.stall(ctx, -9.55, -4.2, { face: '+x', w: 2.2, cloth: '#7a2a26', light: 2 });
    P.stall(ctx, -9.55, -8.3, { face: '+x', w: 2.2, cloth: '#8a6a2a' });
    P.stall(ctx, 3.75, -4.2, { face: '-x', w: 2.6, cloth: '#4a2a44', goods: 'cloth' });
    P.stall(ctx, 3.75, -10.4, { face: '-x', w: 2.6, cloth: '#7a2a26', goods: 'jars', light: 1.6 });
    P.stall(ctx, -6.6, -13.9, { face: '+z', w: 2.4, d: 1.2, cloth: '#8a6a2a' });
    const m1 = P.stringPost(ctx, 4.75, -7.2), m2 = P.stringPost(ctx, 4.75, -13);
    P.lanterns(ctx, [-10.45, 5.8, -7.2], m1, { n: 9, sag: 1 }); P.lanterns(ctx, [-10.45, 5.4, -13], m2, { n: 9, colors: ['#ff6038', '#ffc060', '#e85a3a'] });
    K.barrelStack(ctx, 2.6, -14); K.crate(ctx, -10, -12.4); K.crate(ctx, -10.1, -11.6, { s: 0.55 });
    K.crate(ctx, -3.5, 0, { s: 0.6 }); K.crate(ctx, 4.5, -0.3, { s: 0.7 }); K.barrel(ctx, 4.5, -7.2 + 0.9, { s: 0.85 });
    P.candles(ctx, -10, -0.3, 0, 5); P.candles(ctx, 1.4, 0, -14.4, 6); P.candles(ctx, -2.7, 0, -14.5, 4);
    P.candles(ctx, -1.6, 0, -5.4, 3, { r: 0.4 }); P.candles(ctx, 0.6, 0, -8.6, 2, { r: 0.3 }); P.waxPool(ctx, -2.8, -9.4, 0.5);
    K.fallenBody(ctx, -2, -6.8, 0.9); K.droppedSword(ctx, -0.8, -6.2, 2.2); K.chair(ctx, 1.6, -11.2, 0.4, true);
    K.puddle(ctx, -4.5, -3, 2.2, 1.2); K.puddle(ctx, 0.8, -12, 1.6, 1.1); K.puddle(ctx, -6, -11, 1.2, 1.4);
    K.banner(ctx, -10.45, 3.4, -11.3, '+x', 0x5a1418);

    // ------------------------------------------------ the bridge to the chandlers' quay
    P.bridge(ctx, 'z', [-21.6, -14.95, -2.3, 1.8], [-21, -15.5], { candles: true, posts: false });
    K.lamp(ctx, -2.75, -22.05, { h: 2.8 }); K.lamp(ctx, 2.25, -22.05, { h: 2.8 });
    P.boat(ctx, -8, -18.4, 4.6, 'x', { light: 2 }); P.boat(ctx, -18.5, -18, 4.2, 'x', { lantern: false });
    P.boat(ctx, 7.8, -17.9, 4, 'x', { lantern: false, tone: '#3e2c22' });

    // ------------------------------------------------ the chandlers' quay
    P.canalHouse(ctx, -11, -33, 4, 6, 7.4, { front: '+z', plaster: '#4a5060' });
    P.canalHouse(ctx, -7.2, -33, 3.6, 6, 8.8, { front: '+z', hoist: true, sign: true });
    P.canalHouse(ctx, -3.3, -33, 4.2, 6, 7, { front: '+z' });
    P.canalHouse(ctx, 0.6, -33, 3.6, 6, 8.2, { front: '+z', light: 1.6, plaster: '#4c5262' });
    P.canalHouse(ctx, 4.4, -33, 4, 6, 6.6, { front: '+z', plaster: '#464c5a' });
    P.canalHouse(ctx, 8.7, -33, 4.6, 6, 7.6, { front: '+z', hoist: true });
    const q1 = P.stringPost(ctx, -8.5, -21.95), q2 = P.stringPost(ctx, 5.6, -21.95);
    P.lanterns(ctx, [-8.5, 5.6, -29.95], q1, { n: 7 }); P.lanterns(ctx, [5.6, 5.2, -29.95], q2, { n: 7, colors: ['#ffc060', '#ff9440', '#e85a3a'] });
    for (const x of [-11.2, -5.4, -4, 3.6, 8.2, 10.2]) P.bollard(ctx, x, -21.75);
    P.candles(ctx, -9.6, 0, -29.55, 5, { light: 1.8 }); P.candles(ctx, -1.6, 0, -29.55, 4); P.candles(ctx, 5.2, 0, -29.55, 5);
    K.barrel(ctx, -5.6, -29.4); K.barrel(ctx, 2.6, -29.4, { s: 0.85 }); K.crate(ctx, 10.4, -29.4, { s: 0.7 }); K.crate(ctx, 10.4, -25, { s: 0.8 });
    K.wall(ctx, 11.3, -30.2, 11.3, -20.9, 1.2, { thick: 0.6 });
    K.fallenBody(ctx, -6.4, -24.4, -0.6, 0x1c181a); K.droppedSword(ctx, -5.2, -24.9, 1);
    K.puddle(ctx, -4.5, -26.5, 2, 1.2); K.puddle(ctx, 4.6, -24.2, 1.4, 1);
    // beyond the nook: low sheds
    K.house(ctx, 15, -27, 5, 7, 2.6, { lit: 0.2, doorSide: 'x', roofH: 1.4, windowLights: false, chimney: false });

    // ------------------------------------------------ the tallow works
    K.fence(ctx, -13, -30, -13, -27.95);
    ctx.marks.yardGate = K.gate(ctx, -13, -25.75, 3, 'z', { h: 2.6, open: true, swingDir: -1 });
    K.fence(ctx, -13, -23.55, -13, -21.4);
    K.fence(ctx, -27.75, -21.25, -13.3, -21.25, { h: 1.3, kerb: 0.2 });
    K.fence(ctx, -27.75, -36, -27.75, -27.3, { h: 1.3, kerb: 0.2 }); K.fence(ctx, -27.75, -24.7, -27.75, -21.3, { h: 1.3, kerb: 0.2 });
    K.house(ctx, -20.5, -39.2, 15, 6.4, 5.4, { ridge: 'x', lit: 0.45, doorSide: 'z', plaster: '#4a4e58', windowLights: false, chimney: false });
    P.chimney(ctx, -15.4, -40.4, 12.5);
    K.torch(ctx, -25.8, 2.4, -36, '+z'); K.torch(ctx, -15.2, 2.4, -36, '+z');
    P.vat(ctx, -24.4, -33.6, 0.85); P.vat(ctx, -16.8, -33.8, 0.8);
    P.dryingRack(ctx, -20.6, -34.6, 2.6, 'x'); P.dryingRack(ctx, -15.2, -28.8, 2.4, 'z');
    K.barrelStack(ctx, -27, -35.3); K.crate(ctx, -22.6, -35.5, { s: 0.7 }); K.crate(ctx, -18.4, -35.6, { s: 0.8 }); K.crate(ctx, -18.4, -35.6, { s: 0.5, y: 0.8, solid: false });
    P.waxPool(ctx, -22, -31, 0.7); P.waxPool(ctx, -18.6, -26.5, 0.5); P.candles(ctx, -14, -0, -22.2, 4); P.candles(ctx, -26.9, 0, -22.1, 5);
    K.fallenBody(ctx, -19, -24.8, 2.4); K.puddle(ctx, -21, -27.4, 2.2, 1.3); K.puddle(ctx, -16, -31.6, 1.2, 0.9);

    // ------------------------------------------------ the last bridge and Candlemas Square
    P.bridge(ctx, 'x', [-35.6, -27.4, -27.3, -24.7], [-35, -28], { candles: true, posts: false });
    K.lamp(ctx, -27, -23.6, { h: 2.8 });
    K.fence(ctx, -35.25, -42.2, -35.25, -27.7, { h: 1.3, kerb: 0.2 });
    ctx.marks.squareGate = K.gate(ctx, -35.25, -26, 2, 'z', { h: 2.4 });
    K.fence(ctx, -35.25, -24.3, -35.25, -21.3, { h: 1.3, kerb: 0.2 });
    K.fence(ctx, -56.3, -21.25, -35.5, -21.25, { h: 1.3, kerb: 0.2 });
    P.guildHall(ctx, -60.5, -32, 9, 13, 7.5);
    P.pillars(ctx, -54.6, -36.1, { light: 3.2 }); P.pillars(ctx, -54.6, -27.9, { light: 3.2 });
    K.wall(ctx, -56.4, -42.4, -56.4, -38.5, 4.6, { face: 1 }); K.wall(ctx, -56.4, -25.5, -56.4, -21.3, 4, { face: 1 });
    K.torch(ctx, -56.1, 2.3, -40.4, '+x');
    P.canalHouse(ctx, -54.8, -45, 4.4, 6, 8.2, { front: '+z' });
    P.canalHouse(ctx, -50.5, -45, 4.2, 6, 9.4, { front: '+z', hoist: true, plaster: '#4a5060' });
    P.canalHouse(ctx, -43.7, -45, 4.2, 6, 8, { front: '+z', sign: true });
    P.canalHouse(ctx, -39.7, -45, 3.8, 6, 9, { front: '+z', plaster: '#464c5a' });
    P.canalHouse(ctx, -36.4, -45, 2.8, 6, 7.2, { front: '+z' });
    ctx.marks.exitGate = K.gate(ctx, -47.1, -42.2, 2, 'x', { h: 2.6 });
    K.torch(ctx, -48.4, 2.2, -44.4, '+x'); K.lamp(ctx, -47.1, -48.4, { h: 2.6 });
    P.candelabra(ctx, -53.4, -39.6); P.candelabra(ctx, -53.2, -24); P.candelabra(ctx, -37.6, -39.8); P.candelabra(ctx, -37.4, -23.6);
    P.candleRing(ctx, -46, -31.5, 3.2, 18);
    for (const x of [-53.6, -49.4, -42.6, -38.6]) P.candles(ctx, x, 0, -41.3, 6);
    for (const x of [-51.5, -47, -43, -39.6]) P.candles(ctx, x, 0, -22.05, 5);
    for (const z of [-37.4, -32.6, -29]) P.candles(ctx, -36.1, 0, z, 5);
    P.candles(ctx, -55.4, 0, -40.8, 7); P.candles(ctx, -55.4, 0, -23, 6);
    P.waxPool(ctx, -41, -35, 0.6); P.waxPool(ctx, -50.5, -27.5, 0.5);
    K.fallenBody(ctx, -40.4, -26.6, 1.9); K.droppedSword(ctx, -41.4, -27.4, 0.3); K.fallenBody(ctx, -51.6, -36.8, -0.7, 0x1c181a);
    K.puddle(ctx, -42, -27.5, 2.4, 1.4); K.puddle(ctx, -50, -35.5, 1.8, 1.2); K.puddle(ctx, -39.5, -36, 1.4, 1);
    P.boat(ctx, -44.5, -18.3, 4.6, 'x', { lantern: false }); P.boat(ctx, -31.5, -36, 4.2, 'z', { lantern: false, tone: '#3e2c22' });

    // ------------------------------------------------ across the canal: the boatyard (low, seen from the square)
    K.house(ctx, -42, -9.5, 12, 5, 2.8, { ridge: 'x', lit: 0.25, roofH: 1.6, windowLights: false, chimney: false, plaster: '#3e4250' });
    K.house(ctx, -24, -8.5, 6, 5, 2.6, { lit: 0.3, roofH: 1.5, windowLights: false, chimney: false });
    for (const [x, z] of [[-31, -12], [-53, -12.2]]) { P.boat(ctx, x, z, 5, 'x', { y: 0.55, lantern: false }); for (const o of [-1.4, 1.2]) K.crate(ctx, x + o, z, { s: 0.5 }); }
    K.crate(ctx, -19.5, -12.6); K.crate(ctx, -20.3, -12.7, { s: 0.6 }); K.barrelStack(ctx, -36.5, -13.4);
  },
};
