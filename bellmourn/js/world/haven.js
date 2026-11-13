// The Haven: the ruined lamplighters' shrine between the districts. Two tall walls of the old chapel
// still stand at the back; the roof over them holds, the front half of it fell in long ago and only
// the rafters remain, so the rain comes down past the fire. A great iron brazier burns in the middle
// before a hooded statue of the first lamplighter, candles at its feet; moths circle the flame.
// Built with the set kit like a district; game/haven.js runs the scene.
//
// Camera from +X+Z: +X is screen right-down, +Z screen left-down. On screen, left to right: the statue
// against the west wall, the fire, the warden kneeling (facing the fire, seen in profile), so the menu
// can sit at the right of the screen beside them. The roof that fell in is the part over that row (a
// roof there would stand between the camera and the statue); what is left of it frames the sides.
import * as THREE from '../../vendor/three.module.min.js';
import * as K from './kit.js';
import { M } from '../engine/materials.js';
import * as T from '../engine/textures.js';
import { candles, finish as finishProps } from './props/market.js';

const RIDGE_Z = -1.6, RIDGE_Y = 6.0, EAVE_Y = 4.6, WALL = -4.6, ROOF_X0 = -4.9, ROOF_X1 = 3.9;
const SLOPE = (RIDGE_Y - EAVE_Y) / (RIDGE_Z - WALL); // rise per metre toward the ridge

export const HAVEN = {
  id: 'haven', name: 'The Haven', bounds: [-9, -9, 12, 12],
  // where the fire burns, where the warden kneels (facing the fire), where they come in from and leave to
  fire: { x: -1.6, z: -1.6 },
  kneel: { x: -0.2, z: -3.0 },
  statue: { x: -3.55, z: -1.6 },
  frame: { x: -1.9, y: 1.7, z: -2.3 }, // what the camera frames once the warden kneels (statue, fire, warden)
  enter: [{ x: 5.4, z: 2.5 }, { x: 2.8, z: 0.2 }, { x: 1.0, z: -1.9 }],
  leave: [{ x: 1.2, z: -1.7 }, { x: 3.4, z: 0.6 }, { x: 7.6, z: 4.4 }],
  ambience: {
    fog: 0x1a212c, fogNear: 76, fogFar: 120, sky: 0x080b10, moon: 1.05, hemi: 0.62, ambient: 0x182030, ambientI: 0.5, fill: 0.7, rain: 1, lightning: true,
    beams: [],
  },
};

// The height the rain stops at: the roof where it still holds, the stones elsewhere.
const strips = []; // the front slope's surviving slates: [x0, x1, zEnd]
export function roofAt(x, z) {
  if (x < ROOF_X0 || x > ROOF_X1 || z < WALL - 0.35) return 0;
  if (z <= RIDGE_Z) return EAVE_Y + (z - WALL) * SLOPE;
  for (const s of strips) if (x >= s[0] && x < s[1] && z <= s[2]) return RIDGE_Y - (z - RIDGE_Z) * SLOPE;
  return 0;
}

export async function buildHaven() {
  const ctx = K.makeCtx(); const r = T.rng(4242); const D = HAVEN;
  const wood = M.wood('#3e2c20'), darkWood = M.wood('#2e2018'), stone = M.ashlar('#4a5464'), iron = M.ironLit();
  // ------------------------------------------------ ground: wet cobbles outside, old flags inside
  K.floor(ctx, -40, -40, 40, 40, M.cobble('#2e343e'), -0.03, 0.3);
  K.floor(ctx, -9, -9, 12, 12, M.cobble('#4a5260'));
  K.floor(ctx, WALL, WALL, 3.6, 3.2, M.flags('#5a626e'), 0.02, 0.42);
  // a worn red mat where the wardens kneel
  K.add(ctx, K.box(1.5, 0.03, 1.0), M.flat(0x4a1c1c), D.kneel.x + 0.1, 0.045, D.kneel.z + 0.1, { ry: Math.PI / 4, cast: false });
  K.add(ctx, K.box(1.3, 0.035, 0.8), M.flat(0x5e2622), D.kneel.x + 0.1, 0.05, D.kneel.z + 0.1, { ry: Math.PI / 4, cast: false });
  // puddles where the rain gets in, and out in the street
  K.puddle(ctx, 1.4, 1.6, 1.8, 1.1); K.puddle(ctx, -1.6, 1.4, 1.2, 0.8); K.puddle(ctx, 4.6, 3.6, 2.2, 1.3); K.puddle(ctx, 7.8, -1.2, 1.6, 1.1); K.puddle(ctx, -3.6, 6.4, 2.4, 1.2);

  // ------------------------------------------------ the two walls that stand (the far corner of the old chapel)
  K.wall(ctx, WALL, -4.9, WALL, 0.6, EAVE_Y, { face: 1, buttress: 0, arches: 2 });
  K.wall(ctx, -4.9, WALL, 1.2, WALL, EAVE_Y, { face: 1, arches: 2, litArches: [] });
  // their near ends broke away: low, ragged courses and fallen stones
  K.wall(ctx, WALL, 0.6, WALL, 2.0, 2.4, { face: 1, cap: false }); K.wall(ctx, WALL, 2.0, WALL, 3.2, 1.1, { face: 1, cap: false });
  K.wall(ctx, 1.2, WALL, 2.4, WALL, 2.0, { face: 1, cap: false }); K.wall(ctx, 2.4, WALL, 3.6, WALL, 0.9, { face: 1, cap: false });
  for (let i = 0; i < 9; i++) { const s = 0.25 + r() * 0.35; K.add(ctx, K.box(s, s * 0.7, s * 0.9), stone, WALL + 0.5 + r() * 0.8, s * 0.35, 1.6 + r() * 2.4, { ry: r() * 3 }); }
  for (let i = 0; i < 8; i++) { const s = 0.25 + r() * 0.35; K.add(ctx, K.box(s, s * 0.7, s * 0.9), stone, 1.8 + r() * 2.6, s * 0.35, WALL + 0.5 + r() * 0.9, { ry: r() * 3 }); }
  // a pier at the corner and pilasters where the arches spring
  K.add(ctx, K.box(0.9, EAVE_Y + 0.3, 0.9), stone, WALL + 0.15, (EAVE_Y + 0.3) / 2, WALL + 0.15);
  for (const z of [-2.6, -0.6]) K.add(ctx, K.box(0.35, EAVE_Y - 0.2, 0.45), stone, WALL + 0.45, (EAVE_Y - 0.2) / 2, z);
  for (const x of [-2.6, -0.4]) K.add(ctx, K.box(0.45, EAVE_Y - 0.2, 0.35), stone, x, (EAVE_Y - 0.2) / 2, WALL + 0.45);
  // the gable over the west wall (only its back half stands)
  const gs = new THREE.Shape(); gs.moveTo(0, 0); gs.lineTo(RIDGE_Z - WALL, 0); gs.lineTo(RIDGE_Z - WALL, RIDGE_Y - EAVE_Y - 0.1); gs.lineTo(0, 0);
  const gm = new THREE.Mesh(new THREE.ExtrudeGeometry(gs, { depth: 0.5, bevelEnabled: false }), M.brick('#384356'));
  gm.rotation.y = -Math.PI / 2; gm.position.set(WALL + 0.25, EAVE_Y, WALL); gm.castShadow = true; gm.receiveShadow = true; gm.userData.static = true; ctx.group.add(gm);

  // ------------------------------------------------ the roof: the back slope holds, the front is rafters
  const ang = Math.atan(SLOPE); const backLen = (RIDGE_Z - WALL + 0.45) / Math.cos(ang);
  const slate = M.slate('#1e2531');
  K.add(ctx, K.box(ROOF_X1 - ROOF_X0, 0.16, backLen), slate, (ROOF_X0 + ROOF_X1) / 2, (EAVE_Y + RIDGE_Y) / 2 - 0.12, (WALL - 0.45 + RIDGE_Z) / 2, { rx: -ang });
  // the front slope: strips of slates of uneven length, ragged where it broke
  strips.length = 0; const nS = 9, sw = (ROOF_X1 - ROOF_X0) / nS;
  for (let i = 0; i < nS; i++) {
    const x0 = ROOF_X0 + i * sw; const mid = x0 + sw > -3.4 && x0 < 2.4; // over the statue, the fire and the warden only stubs remain
    const reach = mid ? 0.12 + r() * 0.4 : 0.9 + r() * 1.0; // how far the slates still reach down from the ridge
    const zEnd = RIDGE_Z + reach; strips.push([x0, x0 + sw, zEnd]);
    const len = reach / Math.cos(ang);
    K.add(ctx, K.box(sw + 0.02, 0.16, len), slate, x0 + sw / 2, RIDGE_Y - reach * SLOPE / 2 - 0.12, RIDGE_Z + reach / 2, { rx: ang });
    // a few loose slates hang off the broken edge
    if (r() < 0.6) K.add(ctx, K.box(0.34, 0.04, 0.5), slate, x0 + sw * (0.3 + r() * 0.4), RIDGE_Y - reach * SLOPE - 0.32, zEnd + 0.12, { rx: ang + 0.7 + r() * 0.5, ry: (r() - 0.5) * 0.6 });
  }
  // the ridge beam on a post at the open end, and the rafters running down from it
  K.add(ctx, K.box(ROOF_X1 - ROOF_X0 + 0.3, 0.24, 0.24), darkWood, (ROOF_X0 + ROOF_X1) / 2, RIDGE_Y - 0.28, RIDGE_Z);
  K.add(ctx, K.box(0.26, RIDGE_Y - 0.4, 0.26), darkWood, ROOF_X1 - 0.2, (RIDGE_Y - 0.4) / 2, RIDGE_Z); K.solid(ctx, ROOF_X1 - 0.35, RIDGE_Z - 0.15, ROOF_X1 - 0.05, RIDGE_Z + 0.15, 6);
  K.add(ctx, K.box(0.5, 0.5, 0.5), stone, ROOF_X1 - 0.2, 0.25, RIDGE_Z);
  for (let i = 0; i <= 9; i++) {
    const x = ROOF_X0 + 0.3 + i * (ROOF_X1 - ROOF_X0 - 0.6) / 9;
    const reach = x > -3.2 && x < 2.2 ? 0 : 1.6 + r() * 1.4; if (!reach) { r(); continue; } // the middle ones fell (they lie on the floor below)
    const len = reach / Math.cos(ang);
    K.add(ctx, K.box(0.12, 0.16, len), wood, x, RIDGE_Y - reach * SLOPE / 2 - 0.3, RIDGE_Z + reach / 2, { rx: ang });
  }
  // the fallen rafter, leaning from the broken wall to the flags, and one more on the ground
  K.add(ctx, K.box(0.14, 0.16, 4.2), wood, WALL + 0.9, 1.25, 1.4, { rx: 0.62, ry: 0.15 });
  K.add(ctx, K.box(0.14, 0.14, 2.6), wood, 2.2, 0.08, 1.9, { ry: 1.1 });
  // broken slates scattered under the hole
  for (let i = 0; i < 14; i++) K.add(ctx, K.box(0.3, 0.04, 0.42), slate, -2.8 + r() * 6, 0.05 + r() * 0.03, -0.2 + r() * 3, { ry: r() * 3, rz: (r() - 0.5) * 0.4, cast: false });

  // ------------------------------------------------ the first lamplighter, hooded, his lantern held out
  const sx = D.statue.x, sz = D.statue.z;
  K.add(ctx, K.box(1.5, 0.5, 1.5), stone, sx, 0.25, sz); K.add(ctx, K.box(1.2, 0.7, 1.2), M.ashlar('#56606e'), sx, 0.85, sz); K.add(ctx, K.box(1.3, 0.1, 1.3), stone, sx, 1.25, sz);
  K.solid(ctx, sx - 0.75, sz - 0.75, sx + 0.75, sz + 0.75, 2.5);
  const robe = M.flat(0x56606c);
  K.add(ctx, K.cyl(0.3, 0.5, 1.7, 6), robe, sx, 2.15, sz, { ry: 0.3 });
  K.add(ctx, K.cyl(0.22, 0.32, 0.5, 6), robe, sx + 0.04, 3.15, sz);
  K.add(ctx, K.cone(0.3, 0.6, 6), robe, sx + 0.07, 3.55, sz, { rz: -0.2 });
  K.add(ctx, K.box(0.08, 0.2, 0.2), M.flat(0x0a0c10), sx + 0.27, 3.38, sz); // the shadow under the hood, toward the fire
  // the arm held out toward the fire, an iron lantern hanging from the hand (a little light still in it)
  K.add(ctx, K.box(0.7, 0.16, 0.16), robe, sx + 0.45, 2.75, sz, { rz: 0.45 });
  const lx = sx + 0.82, lz = sz, ly = 2.62;
  K.add(ctx, K.box(0.03, 0.3, 0.03), iron, lx, ly + 0.05, lz);
  K.add(ctx, K.box(0.24, 0.3, 0.24), M.glow('#ffb860', 1.25), lx, ly - 0.25, lz, { cast: false });
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.add(ctx, K.box(0.03, 0.34, 0.03), iron, lx + ox * 0.12, ly - 0.25, lz + oz * 0.12);
  K.add(ctx, K.cone(0.2, 0.16, 4), iron, lx, ly - 0.02, lz, { ry: Math.PI / 4 });
  // candles on the plinth and along the walls (two clusters cast a little light)
  candles(ctx, sx + 0.45, 1.3, sz + 0.25, 6, { r: 0.2, tall: 0.3, light: 2.6, dist: 3.4 });
  candles(ctx, sx + 0.45, 1.3, sz - 0.45, 3, { r: 0.12, tall: 0.22 }); candles(ctx, sx - 0.35, 1.3, sz + 0.5, 2, { r: 0.1, tall: 0.18 });
  candles(ctx, -2.7, 0, WALL + 0.6, 7, { r: 0.35, tall: 0.4, light: 2.2, dist: 3.2 });
  candles(ctx, WALL + 0.6, 0, -3.6, 4, { r: 0.25, tall: 0.3 });
  candles(ctx, 1.1, 0, WALL + 0.55, 3, { r: 0.16, tall: 0.2 });
  candles(ctx, -2.65, 0, -0.35, 3, { r: 0.12, tall: 0.16 });

  // ------------------------------------------------ the lamplighters' things
  // a bench along the north wall, a ladder, poles and unlit lanterns leaning on the west wall, stores
  K.bench(ctx, 0.9, WALL + 0.75, 0);
  for (const s of [-0.22, 0.22]) K.add(ctx, K.box(0.07, 3.4, 0.07), wood, 2.15 + s, 1.65, WALL + 0.55, { rx: -0.26 });
  for (let i = 0; i < 8; i++) K.add(ctx, K.box(0.5, 0.05, 0.05), wood, 2.15, 0.3 + i * 0.4, WALL + 0.62 + i * 0.105);
  for (const [z, a] of [[-2.85, 0.2], [-2.65, 0.14], [0.15, -0.18]]) K.add(ctx, K.cyl(0.025, 0.03, 3.2, 5), darkWood, WALL + 0.62, 1.55, z, { rz: -a });
  for (const z of [-3.9, -0.05]) { K.add(ctx, K.box(0.04, 0.04, 0.3), iron, WALL + 0.45, 3.0, z, { ry: Math.PI / 2 }); K.add(ctx, K.box(0.2, 0.26, 0.2), M.flat(0x2a2620), WALL + 0.62, 2.72, z); K.add(ctx, K.cone(0.17, 0.12, 4), iron, WALL + 0.62, 2.9, z, { ry: Math.PI / 4 }); }
  K.crate(ctx, 2.9, -3.7, { s: 0.7 }); K.crate(ctx, 2.75, -3.0, { s: 0.55 }); K.barrel(ctx, -3.9, 0.55, { s: 0.85 });
  K.add(ctx, K.box(0.55, 0.42, 0.4), M.flat(0x4a3e2e), -2.2, 0.21, WALL + 0.62, { ry: 0.3 }); // a sack of wicks
  // a little shelf of oil jars in the west wall
  K.add(ctx, K.box(0.3, 0.06, 1.1), stone, WALL + 0.45, 1.5, -3.55);
  for (let i = 0; i < 3; i++) K.add(ctx, K.cyl(0.07, 0.09, 0.22, 6), M.flat([0x5a4a30, 0x3a4a3a, 0x6a5038][i]), WALL + 0.45, 1.64, -3.9 + i * 0.32);

  // ------------------------------------------------ the brazier: a great iron bowl on three legs, coals, fire
  const fx = D.fire.x, fz = D.fire.z;
  K.add(ctx, K.cyl(0.62, 0.7, 0.24, 8), stone, fx, 0.12, fz);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4; K.add(ctx, K.box(0.08, 1.0, 0.08), iron, fx + Math.cos(a) * 0.32, 0.68, fz + Math.sin(a) * 0.32, { rz: Math.cos(a) * 0.32, rx: -Math.sin(a) * 0.32 }); }
  K.add(ctx, K.cyl(0.12, 0.14, 0.9, 6), iron, fx, 0.7, fz);
  K.add(ctx, K.cyl(0.62, 0.34, 0.36, 10), iron, fx, 1.2, fz);
  K.add(ctx, K.cyl(0.66, 0.66, 0.06, 10), iron, fx, 1.38, fz);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; K.add(ctx, K.cone(0.05, 0.28, 4), iron, fx + Math.cos(a) * 0.64, 1.5, fz + Math.sin(a) * 0.64, { rz: -Math.cos(a) * 0.35, rx: Math.sin(a) * 0.35 }); }
  K.add(ctx, K.cyl(0.56, 0.56, 0.06, 10), M.glow('#ff7a2a', 1.6), fx, 1.4, fz, { cast: false });
  for (let i = 0; i < 7; i++) K.add(ctx, K.box(0.16, 0.1, 0.14), M.glow(i % 2 ? '#ffb040' : '#c84818', 1.4 + (i % 3) * 0.3), fx + (r() - 0.5) * 0.7, 1.45, fz + (r() - 0.5) * 0.7, { ry: r() * 3, cast: false });
  K.solidCircle(ctx, fx, fz, 0.72, 1.6);
  const fireLight = { x: fx, y: 2.1, z: fz, color: 0xff9440, intensity: 15, dist: 10.5, flicker: 0.16, tag: 'havenFire' };
  ctx.lights.push(fireLight);
  const fire = makeFire(ctx, fx, 1.42, fz);

  // ------------------------------------------------ moths around the flame
  makeMoths(ctx, fx, 2.15, fz, 7);

  // ------------------------------------------------ outside: the dark city in the rain
  K.house(ctx, -9.2, -2.5, 4, 7, 7.5, { lit: 0.35, doorSide: 'x' }); K.house(ctx, -3.5, -9.4, 7, 4, 8, { lit: 0.3 });
  K.house(ctx, 5.5, -9.0, 5, 4, 6.5, { lit: 0.45 }); K.house(ctx, -9.4, 6.5, 4, 5, 6, { lit: 0.25, doorSide: 'x' });
  K.house(ctx, 10.6, -3.6, 4, 6, 5.5, { lit: 0.3, doorSide: 'x', plaster: '#464c5a' });
  K.deadTree(ctx, 6.4, -4.4, 1.1); K.deadTree(ctx, -6.4, 4.6, 0.9);
  K.grave(ctx, 6.2, 6.2, 0.3); K.grave(ctx, 7.4, 5.4, -0.2); K.grave(ctx, 5.1, 7.4, 0.1);
  K.lamp(ctx, 8.6, 1.4, { intensity: 4, dist: 7 });
  // low remains of the chapel's near walls (knee-high: they never hide the fire)
  for (const [x0, z0, x1, z1] of [[-4.9, 3.5, -2.4, 3.5], [3.9, -4.9, 3.9, -2.8]]) K.add(ctx, K.box(Math.abs(x1 - x0) || 0.55, 0.45, Math.abs(z1 - z0) || 0.55), stone, (x0 + x1) / 2, 0.22, (z0 + z1) / 2);

  finishProps(ctx);
  const group = await K.finishCtx(ctx);
  return { def: HAVEN, group, solids: ctx.solids, lowSolids: ctx.lowSolids, lights: ctx.lights.slice(), anims: ctx.anims, marks: {}, puddles: ctx.puddles || [], lamps: [], chests: [], fire, roofAt };
}

// The fire: three animated flame sprites (one tall, two low at the sides), a warm glow and sparks of
// light, all flickering; flare(k) makes it leap up and brighten for a moment.
function makeFire(ctx, x, y, z) {
  const parts = [];
  const mk = (sx, sy, ox, oy, speed, phase) => {
    const tex = T.flame().clone(); tex.needsUpdate = true; tex.repeat.set(1 / 4, 1);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(1.55, 1.25, 1.0), fog: false, transparent: true, alphaTest: 0.5 }));
    sp.scale.set(sx, sy, 1); sp.position.set(x + ox, y + oy + sy / 2, z - ox); ctx.group.add(sp);
    parts.push({ sp, tex, sx, sy, ox, oy, speed, t: phase });
  };
  mk(0.56, 0.9, 0, -0.04, 10, 0); mk(0.42, 0.6, -0.24, -0.02, 13, 1.3); mk(0.4, 0.56, 0.24, -0.03, 12, 2.1);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffb060', 32, 2.2), color: new THREE.Color(0.55, 0.3, 0.12), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  glow.position.set(x, y + 0.5, z); glow.scale.set(2.6, 2.6, 1); ctx.group.add(glow);
  const handle = {
    x, y, z, boost: 0, t: 0,
    flare(k = 1) { this.boost = Math.max(this.boost, k); },
    update(dt) {
      this.t += dt; this.boost = Math.max(0, this.boost - dt * 1.1);
      const b = this.boost, fl = 1 + Math.sin(this.t * 9.3) * 0.05 + Math.sin(this.t * 23.1) * 0.04;
      for (const p of parts) {
        p.t += dt; p.tex.offset.x = (Math.floor(p.t * p.speed) % 4) / 4;
        const k = (1 + b * 0.75) * fl * (1 + Math.sin(p.t * 7 + p.ox * 9) * 0.06);
        p.sp.scale.set(p.sx * (1 + b * 0.3), p.sy * k, 1); p.sp.position.y = y + p.oy + p.sy * k / 2;
      }
      glow.scale.setScalar(2.6 * fl * (1 + b * 0.5)); glow.material.color.setRGB(0.55 * (1 + b * 1.4), 0.3 * (1 + b * 1.2), 0.12 * (1 + b));
      return false;
    },
  };
  ctx.anims.push(handle);
  return handle;
}

// Moths: tiny pale wings fluttering on wandering loops round the flame, now and then darting in.
function makeMoths(ctx, x, y, z, n) {
  const r = T.rng(77); const ms = [];
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: new THREE.Color(1.9, 1.7, 1.3), fog: false }));
    sp.scale.set(0.12, 0.08, 1); ctx.group.add(sp);
    ms.push({ sp, a: r() * 6.28, w: (0.9 + r() * 1.4) * (r() < 0.5 ? -1 : 1), rad: 0.45 + r() * 0.7, h: (r() - 0.3) * 0.9, ph: r() * 10, flap: 14 + r() * 10, t: 0 });
  }
  ctx.anims.push({
    update(dt) {
      for (const m of ms) {
        m.t += dt; m.a += m.w * dt * (1 + Math.sin(m.t * 1.7 + m.ph) * 0.6);
        const rr = m.rad * (0.75 + 0.25 * Math.sin(m.t * 2.3 + m.ph)) * (Math.sin(m.t * 0.5 + m.ph) > 0.92 ? 0.45 : 1);
        m.sp.position.set(x + Math.cos(m.a) * rr, y + m.h + Math.sin(m.t * 3.1 + m.ph) * 0.25, z + Math.sin(m.a) * rr);
        const open = Math.floor(m.t * m.flap) % 2 === 0; m.sp.scale.set(open ? 0.13 : 0.06, 0.08, 1);
      }
      return false;
    },
  });
}
