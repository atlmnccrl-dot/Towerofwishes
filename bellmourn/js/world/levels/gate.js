// District I — Gallows Gate. In through the city gate, the courtyard by the chapel of St. Orrin
// (the scene as first seen: the warden among the hushed in the rain), the gaol lane, and the
// gallows square where the Gaoler keeps the keys.
export default {
  id: 'gate', name: 'Gallows Gate', tagline: 'THE GATE STANDS OPEN. IT NEVER USED TO.', tier: 0,
  start: { x: -5, z: 13.5, face: Math.PI },
  bounds: [-14, -49, 18, 16],
  gatesOpen: ['cityGate', 'laneGate'],
  ambience: {
    fog: 0x1f2834, fogNear: 78, fogFar: 175, sky: 0x0b0f17, moon: 1.7, hemi: 0.95, rain: 1, lightning: true,
    beams: [{ x: -0.5, z: -0.5, r: 5.5, h: 26, from: [6, 0, -10], intensity: 70 }, { x: 3, z: -36, r: 7, h: 28, from: [6, 0, -10], intensity: 80 }],
  },
  lamps: [{ id: 'court', x: -7.6, z: 6.6, sx: 1.2, sz: 0.4 }, { id: 'lane', x: 2.6, z: -24.8, sx: 1.4, sz: 0.4 }],
  items: [{ id: 'c1', x: -8.4, z: -8.3, ry: 0.4, kind: 'embers', amount: 50 }, { id: 'c2', x: 3.9, z: -17.6, ry: -Math.PI / 2, kind: 'embers', amount: 70 }],
  hints: [
    { zone: [-9, 9.2, -1, 16], text: 'WASD TO MOVE. THE LAMP AHEAD KEEPS YOUR PLACE.', touch: 'LEFT THUMB TO MOVE. THE LAMP AHEAD KEEPS YOUR PLACE.' },
    { zone: [-9, -9, 7.5, 8.4], text: 'J ATTACK  SPACE DASH  K AND L SKILLS  Q ULTIMATE', touch: 'ATK STRIKE  DASH EVADE  TWO SKILLS  ULT WHEN RED', life: 6 },
    { zone: [3, -27, 8, -11], text: 'RED ON THE STONES: A BLOW IS COMING. DASH THROUGH.' },
    { zone: [-2, -31, 12, -28.5], text: 'SOMETHING HEAVY MOVES ON THE GALLOWS SQUARE.' },
  ],
  foes: [
    { t: 'hushed', x: 5.2, z: -14.5 }, { t: 'ghoul', x: 4.2, z: -20.5 }, { t: 'hushed', x: 6.8, z: -19.5 }, { t: 'crossbow', x: 6.6, z: -25.4 },
  ],
  encounters: [
    { id: 'court', zone: [-9, -9, 7.5, 8.2], gates: ['cityGate'], opens: ['gaolGate'], msg: 'THE HUSHED TURN THEIR HEADS',
      waves: [
        { pre: true, foes: [{ t: 'hushed', x: 1.4, z: -2.6 }, { t: 'hushed', x: 3.6, z: -0.6 }, { t: 'hushed', x: 4.9, z: -4.6 }] },
        { foes: [{ t: 'hushed', x: -3, z: -6 }, { t: 'ghoul', x: 3, z: 3 }, { t: 'hushed', x: -6, z: -1 }] },
      ] },
  ],
  boss: { type: 'gaoler', x: 3, z: -38, face: 0, zone: [-8, -44, 14, -30.5], gates: ['laneGate'], opens: ['exitGate'] },
  exit: { zone: [0.6, -49, 5.4, -45.6], to: 'market', requires: 'boss' },
  build(K, ctx) {
    // ------------------------------------------------ ground
    K.floor(ctx, -14, -12, 16, 16, K.M.cobble('#56606e'));
    K.floor(ctx, -14, -49, 18, -12, K.M.cobble('#545e6c'));
    K.floor(ctx, -9, -9, 7.5, 8.6, K.M.court('#606a78'), 0.02, 0.42);
    K.floor(ctx, -8.2, -44.2, 13.6, -28.4, K.M.court('#5c6674'), 0.02, 0.42);
    // ------------------------------------------------ the courtyard (as first seen)
    K.wall(ctx, -9.6, -10, -9.6, 7, 4.6, { face: 1, buttress: 4, arches: 3, litArches: [1] });
    K.wall(ctx, -10, -9.9, 3, -9.9, 4.6, { face: 1, buttress: 4, arches: 2 });
    K.torch(ctx, -9.3, 2.2, -4.2, '+x');
    K.torch(ctx, -2.5, 2.2, -9.6, '+z');
    K.fence(ctx, 3, -9.2, 3.9, -9.2);
    ctx.marks.gaolGate = K.gate(ctx, 5.4, -9.2, 2.2, 'x', { h: 2.4 });
    K.fence(ctx, 6.9, -9.2, 7.6, -9.2);
    K.fence(ctx, 7.6, -9.2, 7.6, 4);
    K.fence(ctx, -9.6, 9, -6.9, 9);
    ctx.marks.cityGate = K.gate(ctx, -5, 9, 2.6, 'x', { h: 2.8, open: true, swingDir: -1 });
    K.fence(ctx, -3.1, 9, 7.6, 9);
    K.chapel(ctx, 11.6, -1.5, 6, 11, 4.6, { front: '+z', belfry: true, roofH: 4.2, litRose: false });
    K.barrelStack(ctx, -6.4, -7.2);
    K.barrel(ctx, -8.2, -5.4);
    K.table(ctx, -0.6, -6.6, { mugs: true });
    K.chair(ctx, 1.4, -5.2, 0.7, true);
    K.table(ctx, -7.4, 1.6, { ry: 1, benches: true });
    K.crate(ctx, -8.6, 4.4); K.crate(ctx, -8.6, 3.4, { s: 0.6 });
    K.fallenBody(ctx, -3.6, -2.4, 0.6); K.droppedSword(ctx, -2.4, -1.4, 1.2);
    K.fallenBody(ctx, -1.4, 0.8, 2.2); K.droppedSword(ctx, -4.2, 0.6, -0.4);
    K.droppedSword(ctx, 1.2, 4.8, 2.6);
    K.runeMark(ctx, -8.4, -1.2);
    K.lamp(ctx, 2.6, 7.6);
    K.lamp(ctx, -8.2, 10.4);
    K.lamp(ctx, -11.5, 14.5);
    K.lamp(ctx, 6.8, -3.5, { h: 2.6 });
    K.puddle(ctx, 0.5, 2.5, 2.2, 1.2); K.puddle(ctx, -5.5, 4.5, 1.4, 0.9); K.puddle(ctx, 3.8, -2.5, 1.2, 1.6);
    // outside the city gate: the road in
    K.house(ctx, -12.2, 12.5, 3, 5, 4.5, { lit: 0.5, doorSide: 'x' });
    K.fence(ctx, -9.6, 9, -9.6, 16);
    K.house(ctx, 4.5, 13.6, 6, 3, 3.6, { lit: 0.4 });
    K.cart(ctx, -1.5, 13, 0.3);
    // ------------------------------------------------ the gaol lane (north of the courtyard)
    K.house(ctx, 0.4, -14.2, 5, 6.4, 6, { lit: 0.25, doorSide: 'x' });
    K.house(ctx, 0.4, -21.6, 5, 6, 5.2, { lit: 0.4, doorSide: 'x', plaster: '#4a5060' });
    K.house(ctx, 11.2, -14.6, 5, 7, 4.2, { lit: 0.2 });
    K.house(ctx, 11.2, -22, 5, 6.6, 4.4, { lit: 0.35, plaster: '#464c5a' });
    K.wall(ctx, 8.6, -10, 13.8, -10, 3, { face: 1 });
    K.lamp(ctx, 7.8, -12.6, { h: 2.6 }); K.lamp(ctx, 3.4, -20.4, { h: 2.6 });
    K.barrel(ctx, 3.6, -12.2); K.barrel(ctx, 3.5, -13.1, { s: 0.9 }); K.crate(ctx, 8.2, -16.8, { s: 0.7 }); K.crate(ctx, 8.1, -24, { s: 0.8 });
    K.banner(ctx, 2.95, 3, -18, '+x'); K.banner(ctx, 2.95, 3, -24.4, '+x', 0x2a1418);
    K.puddle(ctx, 5.6, -16.5, 1.6, 1); K.puddle(ctx, 6.2, -22.5, 1.2, 1.4);
    K.fallenBody(ctx, 6.4, -17.8, -0.4, 0x1c181a);
    // ------------------------------------------------ the gallows square
    K.fence(ctx, -8.6, -27.6, 3.8, -27.6);
    ctx.marks.laneGate = K.gate(ctx, 5.5, -27.6, 2.6, 'x', { h: 2.6, open: true, swingDir: -1 });
    K.fence(ctx, 7.2, -27.6, 14, -27.6);
    K.wall(ctx, -8.8, -45, -8.8, -27.6, 5, { face: 1, buttress: 4, arches: 3, litArches: [0, 2] });
    K.wall(ctx, -9, -45, 1.1, -45, 5, { face: 1, buttress: 4, arches: 2 });
    ctx.marks.exitGate = K.gate(ctx, 3, -45, 2.6, 'x', { h: 3, swingDir: 1 });
    K.wall(ctx, 4.9, -45, 14.2, -45, 5, { face: 1, buttress: 4, arches: 2, litArches: [1] });
    K.fence(ctx, 14, -45, 14, -27.6);
    K.torch(ctx, -8.5, 2.4, -36, '+x'); K.torch(ctx, -3, 2.4, -44.7, '+z'); K.torch(ctx, 9, 2.4, -44.7, '+z');
    K.lamp(ctx, -6.5, -29.5); K.lamp(ctx, 12.4, -29.8); K.lamp(ctx, 12.2, -42.6);
    K.gallows(ctx, -4.2, -39.2);
    K.statue(ctx, 10.5, -39.5);
    K.barrelStack(ctx, -7.4, -31.4); K.crate(ctx, 12.6, -33.4); K.crate(ctx, 12.8, -34.4, { s: 0.6 });
    K.puddle(ctx, 2, -33, 2.4, 1.4); K.puddle(ctx, 6.5, -40, 1.8, 1.2);
    K.fallenBody(ctx, 5.5, -35.5, 1.1); K.droppedSword(ctx, 6.6, -34.8, 2.1); K.fallenBody(ctx, -1.6, -32.5, -0.8);
    // beyond the exit gate: the road to Lantern Row
    K.house(ctx, -3.5, -47.6, 6, 2.4, 4, { lit: 0.6 }); K.house(ctx, 10, -47.6, 8, 2.4, 4, { lit: 0.5 });
    K.lamp(ctx, 5.6, -46.8, { h: 2.6 });
  },
};
