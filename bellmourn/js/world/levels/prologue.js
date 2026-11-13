// Prologue — The Old Road. The last mile to the city gate in the rain: a walled road past a roadside
// graveyard and a wayside shrine. The training happens here (js/game/tutorial.js drives it).
export default {
  id: 'prologue', name: 'The Old Road', tagline: 'THE CITY IS DARK. THE ROAD IS NOT EMPTY.', tier: 0, tutorial: true,
  start: { x: 0, z: 27, face: Math.PI },
  bounds: [-11, -22, 11, 31],
  ambience: {
    fog: 0x1f2834, fogNear: 76, fogFar: 140, sky: 0x0b0f17, moon: 2.2, hemi: 0.8, rain: 1, lightning: true,
    beams: [{ x: 0, z: 22, r: 5, h: 26, from: [6, 0, -10], intensity: 70 }, { x: 0, z: 0, r: 6, h: 26, from: [6, 0, -10], intensity: 80 }],
  },
  lamps: [{ id: 'shrine', x: -4.2, z: -9.6, sx: 1.4, sz: 0.6 }],
  items: [],
  foes: [],
  exit: { zone: [-3, -22, 3, -18.5], to: 'gate' },
  build(K, ctx) {
    K.floor(ctx, -11, -22, 11, 31, K.M.dirt('#363a3a'));
    K.floor(ctx, -4, -22, 4, 31, K.M.cobble('#545e6c'), 0.02, 0.42);
    // the walls that line the road (far side tall, near side low and broken)
    K.wall(ctx, -6.2, -22, -6.2, 31, 3.2, { face: 1, buttress: 6 });
    K.fence(ctx, 6, -17, 6, 31, { kerb: 0.5 });
    // a roadside graveyard behind the west wall's gap
    for (const [x, z, r] of [[-8.6, 16, 0.2], [-9.4, 13.4, -0.3], [-8.4, 10.8, 0.1], [-9.6, 8.2, 0.4], [-8.8, 5.6, -0.2]]) K.grave(ctx, x, z, r);
    K.deadTree(ctx, -9, 20, 1.1); K.deadTree(ctx, 8.6, 12, 0.9); K.deadTree(ctx, 8.8, -4, 1.2);
    // things left on the road
    K.cart(ctx, 3.2, 19, 0.4); K.barrel(ctx, 4.4, 17.2); K.crate(ctx, -4.6, 6.4, { s: 0.7 });
    K.fallenBody(ctx, 1.6, 9.4, 2.4, 0x1c181a); K.droppedSword(ctx, 2.6, 8.6, 0.8);
    K.puddle(ctx, -1, 23, 2, 1.2); K.puddle(ctx, 1.4, 2, 1.6, 1); K.puddle(ctx, -1.6, -6, 1.4, 1.1);
    K.lamp(ctx, 4.6, 24.6); K.lamp(ctx, -5, 13); K.lamp(ctx, 4.6, 1.2); K.lamp(ctx, 4.4, -14);
    // the wayside shrine with the first warden's lamp
    K.statue(ctx, -7.6, -11.6);
    K.runeMark(ctx, -2.4, -9.8, '#e8c060');
    // the city wall and its gate ahead (the way into Gallows Gate)
    K.wall(ctx, -11, -21.4, -3.6, -21.4, 6, { face: 1, buttress: 4, arches: 1 });
    K.wall(ctx, 3.6, -21.4, 11, -21.4, 6, { face: 1, buttress: 4, arches: 1, litArches: [0] });
    K.torch(ctx, -3.6, 2.6, -21.0, '+z'); K.torch(ctx, 3.0, 2.6, -21.0, '+z');
  },
};
