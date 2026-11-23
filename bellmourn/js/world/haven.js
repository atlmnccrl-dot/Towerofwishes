// The Haven: a lonely rooftop high above the drowned city. The leaded top of an old lamplighters' tower, a
// broken parapet round it, and in the middle one great iron lantern holding the Great Bell's forge-flame, the
// only fire the night cannot touch. A cracked bronze bell lies beside it, wicks and a ladder, a worn mat where a
// warden kneels. All round and far below, the city in the rain: roofs, a few lit windows, the dark Belfry
// standing up out of the mist. No one else is here. Built with the set kit; game/haven.js runs the scene.
//
// Camera from +X+Z: +X is screen right-down, +Z screen left-down. On screen, left to right: the fallen bell,
// the great lantern, the warden kneeling (facing it, in profile), so a panel can sit at the right of the screen.
// The parapet is tall only on the far sides (-X, -Z), low on the near ones, so nothing hides the lantern.
import * as THREE from '../../vendor/three.module.min.js';
import * as K from './kit.js';
import { M } from '../engine/materials.js';
import * as T from '../engine/textures.js';
import { candles, finish as finishProps } from './props/market.js';

const X0 = -4.8, Z0 = -4.8, X1 = 4.9, Z1 = 4.2; // the roof's edges
const DROP = 17; // how far below the city lies

export const HAVEN = {
  id: 'haven', name: 'The Haven', bounds: [X0, Z0, X1, Z1],
  // where the flame burns, where the warden kneels (facing it), where they come up the stair and go down again
  fire: { x: -1.6, z: -1.6 },
  kneel: { x: -0.2, z: -3.0 },
  statue: { x: -3.55, z: -1.6 }, // the fallen bell (the scenes call it the statue: something by the fire)
  frame: { x: -1.9, y: 1.9, z: -2.3 }, // what the camera frames once the warden kneels (the bell, the lantern, the warden)
  enter: [{ x: 4.0, z: 2.9 }, { x: 2.6, z: 0.6 }, { x: 1.0, z: -1.9 }],
  leave: [{ x: 1.2, z: -1.7 }, { x: 2.8, z: 0.8 }, { x: 4.1, z: 3.1 }],
  ambience: {
    fog: 0x141a26, fogNear: 70, fogFar: 128, sky: 0x06080d, moon: 1.15, hemi: 0.5, ambient: 0x141c2c, ambientI: 0.45, fill: 0.6, rain: 1, lightning: true,
    beams: [{ x: -1.6, z: -1.6, r: 3.2, h: 30, from: [6, 0, -10], intensity: 34 }],
  },
};

// The height the rain stops at: the roof, or the streets far below.
export function roofAt(x, z) { return x >= X0 - 0.3 && x <= X1 + 0.3 && z >= Z0 - 0.3 && z <= Z1 + 0.3 ? 0 : -DROP; }

export async function buildHaven() {
  const ctx = K.makeCtx(); const r = T.rng(4243); const D = HAVEN;
  const stone = M.ashlar('#424b5a'), stoneLo = M.ashlar('#343c4a'), lead = M.flags('#4a525e'), iron = M.ironLit(), wood = M.wood('#3e2c20');
  const bronze = M.flat(0x6e5a32), bronzeDk = M.flat(0x3e3420);
  // ------------------------------------------------ the roof: worn lead sheets, seams, puddles
  K.floor(ctx, X0, Z0, X1, Z1, lead, 0, 0.5);
  for (let x = X0 + 1.2; x < X1; x += 1.6) K.add(ctx, K.box(0.06, 0.04, Z1 - Z0 - 0.4), M.flat(0x5a626e), x, 0.02, (Z0 + Z1) / 2, { cast: false });
  K.puddle(ctx, 1.6, 1.4, 1.6, 1.0); K.puddle(ctx, -2.8, 1.8, 1.2, 0.8); K.puddle(ctx, 3.0, -2.6, 1.1, 0.7);
  // the tower's body falling away under the roof (seen on the near faces): ashlar, a string course, slit windows
  K.add(ctx, K.box(X1 - X0, DROP, Z1 - Z0), stoneLo, (X0 + X1) / 2, -DROP / 2 - 0.5, (Z0 + Z1) / 2);
  K.add(ctx, K.box(X1 - X0 + 0.3, 0.35, Z1 - Z0 + 0.3), stone, (X0 + X1) / 2, -0.62, (Z0 + Z1) / 2);
  K.add(ctx, K.box(X1 - X0 + 0.3, 0.35, Z1 - Z0 + 0.3), stone, (X0 + X1) / 2, -6.2, (Z0 + Z1) / 2);
  for (const y of [-3.2, -9.4]) { for (const z of [-2.4, 1.2]) K.add(ctx, K.box(0.05, 1.1, 0.3), M.glow(y > -5 ? '#ffb050' : '#402010', y > -5 ? 1.4 : 1), X1 + 0.01, y, z, { cast: false }); for (const x of [-1.8, 2.2]) K.add(ctx, K.box(0.3, 1.1, 0.05), M.glow('#ffb050', y > -5 ? 1.2 : 0.6), x, y, Z1 + 0.01, { cast: false }); }
  K.solid(ctx, X0 - 1, Z0 - 1, X0, Z1 + 1, 2); K.solid(ctx, X0 - 1, Z0 - 1, X1 + 1, Z0, 2); K.solid(ctx, X1, Z0 - 1, X1 + 1, Z1 + 1, 1); K.solid(ctx, X0 - 1, Z1, X1 + 1, Z1 + 1, 1);

  // ------------------------------------------------ the parapet: crenellated on the far sides, a low broken kerb on the near
  const PH = 1.15;
  K.add(ctx, K.box(0.5, PH, Z1 - Z0), stone, X0 + 0.25, PH / 2, (Z0 + Z1) / 2);
  K.add(ctx, K.box(X1 - X0, PH, 0.5), stone, (X0 + X1) / 2, PH / 2, Z0 + 0.25);
  for (let z = Z0 + 0.6; z < Z1 - 0.3; z += 0.9) K.add(ctx, K.box(0.56, 0.42, 0.48), stone, X0 + 0.25, PH + 0.21, z);
  for (let x = X0 + 0.6; x < X1 - 0.3; x += 0.9) { if (x > 1.6 && x < 2.6) continue; K.add(ctx, K.box(0.48, 0.42, 0.56), stone, x, PH + 0.21, Z0 + 0.25); } // a merlon fell
  for (const [x, z] of [[2.1, Z0 - 0.4], [2.5, Z0 + 0.7]]) K.add(ctx, K.box(0.46, 0.4, 0.5), stone, x, x > 2.3 ? 0.2 : -0.5, z, { ry: r() * 2, rz: (r() - 0.5) * 0.6 });
  // the near kerb, knee-high, broken where the stair comes up
  K.add(ctx, K.box(0.4, 0.42, 3.9), stone, X1 - 0.2, 0.21, Z0 + 2.2); K.add(ctx, K.box(0.4, 0.3, 1.2), stone, X1 - 0.2, 0.15, Z1 - 0.8);
  K.add(ctx, K.box(4.4, 0.42, 0.4), stone, X0 + 2.4, 0.21, Z1 - 0.2); K.add(ctx, K.box(1.4, 0.3, 0.4), stone, 0.9, 0.15, Z1 - 0.2);
  // corner pinnacles with little spires, and a weathered gargoyle looking down on the city
  for (const [x, z, h] of [[X0 + 0.25, Z0 + 0.25, 3.4], [X1 - 0.25, Z0 + 0.25, 2.2], [X0 + 0.25, Z1 - 0.25, 2.2]]) {
    K.add(ctx, K.box(0.8, h, 0.8), stone, x, h / 2, z); K.add(ctx, K.box(0.95, 0.18, 0.95), stoneLo, x, h + 0.09, z);
    K.add(ctx, K.cone(0.42, 1.3, 4), M.slate('#262e3a'), x, h + 0.85, z, { ry: Math.PI / 4 }); K.add(ctx, K.box(0.08, 0.4, 0.08), iron, x, h + 1.7, z);
  }
  K.add(ctx, K.box(0.5, 0.36, 0.9), stoneLo, X0 + 0.25, PH + 0.1, 1.0); K.add(ctx, K.box(0.34, 0.3, 0.42), stoneLo, X0 - 0.12, PH + 0.06, 1.0); // the gargoyle

  // ------------------------------------------------ the stair hatch the warden comes up by (the near corner)
  K.add(ctx, K.box(1.6, 0.08, 1.4), M.flat(0x07080b), 4.0, 0.03, 3.0, { cast: false });
  for (let i = 0; i < 3; i++) K.add(ctx, K.box(1.3, 0.12, 0.34), stoneLo, 4.0, -0.12 - i * 0.22, 2.55 + i * 0.36);
  K.add(ctx, K.box(0.1, 0.9, 0.1), iron, 3.2, 0.45, 2.3); K.add(ctx, K.box(0.1, 0.9, 0.1), iron, 3.2, 0.45, 3.7); K.add(ctx, K.box(0.06, 0.06, 1.4), iron, 3.2, 0.88, 3.0);

  // ------------------------------------------------ the fallen bell: cracked bronze on its side, by the lantern
  const bx = D.statue.x, bz = D.statue.z;
  K.add(ctx, K.cyl(0.42, 0.78, 1.15, 10), bronze, bx, 0.62, bz, { rz: 1.35, ry: 0.4 });
  K.add(ctx, K.cyl(0.8, 0.8, 0.12, 10), bronzeDk, bx + 0.52, 0.72, bz + 0.2, { rz: 1.35, ry: 0.4 });
  K.add(ctx, K.cyl(0.2, 0.2, 0.22, 6), bronzeDk, bx - 0.62, 0.48, bz - 0.24, { rz: 1.35, ry: 0.4 });
  K.add(ctx, K.box(0.05, 0.8, 0.06), M.flat(0x15120c), bx + 0.1, 0.95, bz + 0.48, { rz: 0.5, ry: 0.4 }); // the crack
  K.add(ctx, K.box(0.18, 0.18, 0.5), iron, bx + 0.3, 0.12, bz - 0.7, { ry: 0.8 }); // the clapper, fallen out
  K.solidCircle(ctx, bx, bz, 0.8, 1.2);
  candles(ctx, bx + 0.7, 0, bz + 0.9, 5, { r: 0.22, tall: 0.26, light: 2.2, dist: 3.0 });
  candles(ctx, X0 + 0.65, 0, -3.6, 4, { r: 0.22, tall: 0.3 });
  candles(ctx, 0.9, 0, Z0 + 0.65, 3, { r: 0.16, tall: 0.2 });

  // ------------------------------------------------ the lamplighter's things: a ladder, poles, a wick sack, oil
  for (const s of [-0.22, 0.22]) K.add(ctx, K.box(0.07, 3.0, 0.07), wood, 2.4 + s, 1.45, Z0 + 0.62, { rx: -0.26 });
  for (let i = 0; i < 7; i++) K.add(ctx, K.box(0.5, 0.05, 0.05), wood, 2.4, 0.3 + i * 0.4, Z0 + 0.7 + i * 0.105);
  for (const [z, a] of [[-2.9, 0.2], [-2.7, 0.14]]) K.add(ctx, K.cyl(0.025, 0.03, 2.8, 5), M.wood('#2e2018'), X0 + 0.62, 1.4, z, { rz: -a });
  K.add(ctx, K.box(0.55, 0.42, 0.4), M.flat(0x4a3e2e), -2.3, 0.21, Z0 + 0.65, { ry: 0.3 });
  for (let i = 0; i < 3; i++) K.add(ctx, K.cyl(0.07, 0.09, 0.22, 6), M.flat([0x5a4a30, 0x3a4a3a, 0x6a5038][i]), X0 + 0.7, 0.11, -0.6 + i * 0.26);
  K.crate(ctx, 3.3, -3.6, { s: 0.6 });
  // the worn red mat where a warden kneels
  K.add(ctx, K.box(1.5, 0.03, 1.0), M.flat(0x4a1c1c), D.kneel.x + 0.1, 0.02, D.kneel.z + 0.1, { ry: Math.PI / 4, cast: false });
  K.add(ctx, K.box(1.3, 0.035, 0.8), M.flat(0x5e2622), D.kneel.x + 0.1, 0.03, D.kneel.z + 0.1, { ry: Math.PI / 4, cast: false });

  // ------------------------------------------------ the great lantern: a stone plinth, an iron cage taller than a man,
  // the forge-flame inside, a pointed cap and a ring; chains run from it to the parapet
  const fx = D.fire.x, fz = D.fire.z;
  K.add(ctx, K.box(1.7, 0.4, 1.7), stone, fx, 0.2, fz); K.add(ctx, K.box(1.3, 0.35, 1.3), M.ashlar('#525c6a'), fx, 0.57, fz);
  K.add(ctx, K.cyl(0.62, 0.66, 0.16, 8), iron, fx, 0.82, fz);
  const CH = 2.3, CB = 0.9; // the cage: height and base
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) K.add(ctx, K.box(0.09, CH, 0.09), iron, fx + ox * 0.5, CB + CH / 2, fz + oz * 0.5);
  for (const y of [CB + 0.05, CB + CH - 0.05]) for (const [w, d, ox, oz] of [[1.08, 0.08, 0, -0.5], [1.08, 0.08, 0, 0.5], [0.08, 1.08, -0.5, 0], [0.08, 1.08, 0.5, 0]]) K.add(ctx, K.box(w, 0.08, d), iron, fx + ox, y, fz + oz);
  for (const [w, d, ox, oz] of [[0.04, 0.04, -0.5, 0], [0.04, 0.04, 0.5, 0], [0.04, 0.04, 0, -0.5], [0.04, 0.04, 0, 0.5]]) K.add(ctx, K.box(w + 0.02, CH - 0.1, d + 0.02), iron, fx + ox, CB + CH / 2, fz + oz);
  // faint glass panes on the far sides only (the near ones are broken out, so the flame shows)
  K.add(ctx, K.box(0.94, CH - 0.2, 0.02), M.glow('#ff9a40', 0.32), fx, CB + CH / 2, fz - 0.49, { cast: false });
  K.add(ctx, K.box(0.02, CH - 0.2, 0.94), M.glow('#ff9a40', 0.32), fx - 0.49, CB + CH / 2, fz, { cast: false });
  K.add(ctx, K.cone(0.95, 0.8, 4), iron, fx, CB + CH + 0.4, fz, { ry: Math.PI / 4 });
  K.add(ctx, K.box(0.12, 0.5, 0.12), iron, fx, CB + CH + 1.0, fz);
  K.add(ctx, K.torus(0.22, 0.04), iron, fx, CB + CH + 1.42, fz);
  // a bed of coals in the cage's floor
  K.add(ctx, K.cyl(0.4, 0.44, 0.1, 8), M.glow('#ff7a2a', 1.6), fx, CB + 0.14, fz, { cast: false });
  for (let i = 0; i < 6; i++) K.add(ctx, K.box(0.14, 0.08, 0.12), M.glow(i % 2 ? '#ffb040' : '#c84818', 1.4 + (i % 3) * 0.3), fx + (r() - 0.5) * 0.5, CB + 0.2, fz + (r() - 0.5) * 0.5, { ry: r() * 3, cast: false });
  // chains from the cap down to rings in the far parapet
  for (const [tx, tz] of [[X0 + 0.5, fz + 0.4], [fx + 0.4, Z0 + 0.5]]) {
    const sx = fx, sy = CB + CH + 0.3, sz = fz; const n = 9;
    for (let i = 1; i < n; i++) { const k = i / n; const x = sx + (tx - sx) * k, z = sz + (tz - sz) * k; const y = sy + (PH + 0.2 - sy) * k - Math.sin(k * Math.PI) * 0.55; K.add(ctx, K.box(0.07, 0.07, 0.07), iron, x, y, z, { ry: k * 3 }); }
  }
  K.solidCircle(ctx, fx, fz, 0.9, 3);
  const fireLight = { x: fx, y: 2.2, z: fz, color: 0xff9440, intensity: 17, dist: 11.5, flicker: 0.16, tag: 'havenFire' };
  ctx.lights.push(fireLight);
  const fire = makeFire(ctx, fx, CB + 0.18, fz);
  makeMoths(ctx, fx, CB + 1.4, fz, 6);

  finishProps(ctx);
  const group = await K.finishCtx(ctx);

  // ------------------------------------------------ the city far below in the rain (its own group, lowered)
  const city = K.makeCtx(); const rc = T.rng(9191);
  K.floor(city, -60, -60, 60, 60, M.cobble('#1c2028'), 0, 0.3);
  const tones = ['#2c3442', '#323a4a', '#28303c', '#363c48'];
  for (let gx = -6; gx <= 6; gx++) for (let gz = -6; gz <= 6; gz++) {
    const x = gx * 7.5 + (rc() - 0.5) * 2, z = gz * 7.5 + (rc() - 0.5) * 2;
    if (Math.abs(x) < 8.5 && Math.abs(z) < 8.5) continue; // the tower's own foot
    if (rc() < 0.18) continue; // squares and lanes
    const w = 3.6 + rc() * 2.6, d = 3.6 + rc() * 2.6, h = 4 + rc() * 6;
    K.house(city, x, z, w, d, h, { lit: 0.45, windowLights: false, chimney: rc() < 0.6, tone: tones[Math.floor(rc() * tones.length)], ridge: rc() < 0.5 ? 'x' : 'z' });
  }
  // street lamps glowing in the lanes
  for (let i = 0; i < 26; i++) { const a = rc() * Math.PI * 2, d = 10 + rc() * 32; K.add(city, K.box(0.25, 0.3, 0.25), M.glow('#ffb050', 2.2), Math.cos(a) * d, 3, Math.sin(a) * d, { cast: false }); }
  // the Belfry: the dark tower of the Great Bell rising out of the mist, a faint light in its bell-chamber
  const bfx = -24, bfz = -22;
  K.add(city, K.box(6, 30, 6), M.ashlar('#2a303c'), bfx, 15, bfz); K.add(city, K.box(5, 6, 5), M.ashlar('#262c38'), bfx, 33, bfz);
  K.add(city, K.cone(4.4, 9, 4), M.slate('#1a202a'), bfx, 40.5, bfz, { ry: Math.PI / 4 });
  for (const [ox, oz, ry] of [[3.01, 0, Math.PI / 2], [0, 3.01, 0]]) K.add(city, K.plane(2.2, 3.4), M.glow('#c08850', 0.9), bfx + ox, 33, bfz + oz, { ry, cast: false });
  K.add(city, K.box(7, 1, 7), M.ashlar('#323844'), bfx, 30.5, bfz);
  // two more spires on the skyline
  for (const [x, z, h] of [[30, -26, 22], [-30, 20, 18]]) { K.add(city, K.box(3.5, h, 3.5), M.ashlar('#2a303c'), x, h / 2, z); K.add(city, K.cone(2.8, 6, 4), M.slate('#1a202a'), x, h + 3, z, { ry: Math.PI / 4 }); }
  const cityG = await K.finishCtx(city); cityG.position.y = -DROP - 0.5; cityG.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  group.add(cityG);

  return { def: HAVEN, group, solids: ctx.solids, lowSolids: ctx.lowSolids, lights: ctx.lights.slice(), anims: ctx.anims, marks: {}, puddles: ctx.puddles || [], lamps: [], chests: [], fire, roofAt };
}

// The forge-flame: three animated flame sprites (one tall, two low at the sides), a warm glow and sparks of
// light, all flickering; flare(k) makes it leap up and brighten for a moment.
function makeFire(ctx, x, y, z) {
  const parts = [];
  const mk = (sx, sy, ox, oy, speed, phase) => {
    const tex = T.flame().clone(); tex.needsUpdate = true; tex.repeat.set(1 / 4, 1);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(1.6, 1.25, 1.0), fog: false, transparent: true, alphaTest: 0.5 }));
    sp.scale.set(sx, sy, 1); sp.position.set(x + ox, y + oy + sy / 2, z - ox); ctx.group.add(sp);
    parts.push({ sp, tex, sx, sy, ox, oy, speed, t: phase });
  };
  mk(0.62, 1.15, 0, -0.04, 10, 0); mk(0.42, 0.7, -0.2, -0.02, 13, 1.3); mk(0.4, 0.64, 0.2, -0.03, 12, 2.1);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffb060', 32, 2.2), color: new THREE.Color(0.6, 0.32, 0.12), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  glow.position.set(x, y + 0.7, z); glow.scale.set(3.6, 3.6, 1); ctx.group.add(glow);
  const handle = {
    x, y, z, boost: 0, t: 0,
    flare(k = 1) { this.boost = Math.max(this.boost, k); },
    update(dt) {
      this.t += dt; this.boost = Math.max(0, this.boost - dt * 1.1);
      const b = this.boost, fl = 1 + Math.sin(this.t * 9.3) * 0.05 + Math.sin(this.t * 23.1) * 0.04;
      for (const p of parts) {
        p.t += dt; p.tex.offset.x = (Math.floor(p.t * p.speed) % 4) / 4;
        const k = (1 + b * 0.6) * fl * (1 + Math.sin(p.t * 7 + p.ox * 9) * 0.06);
        p.sp.scale.set(p.sx * (1 + b * 0.25), p.sy * k, 1); p.sp.position.y = y + p.oy + p.sy * k / 2;
      }
      glow.scale.setScalar(3.6 * fl * (1 + b * 0.5)); glow.material.color.setRGB(0.6 * (1 + b * 1.4), 0.32 * (1 + b * 1.2), 0.12 * (1 + b));
      return false;
    },
  };
  ctx.anims.push(handle);
  return handle;
}

// Moths: tiny pale wings fluttering on wandering loops round the lantern, now and then darting in.
function makeMoths(ctx, x, y, z, n) {
  const r = T.rng(77); const ms = [];
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: new THREE.Color(1.9, 1.7, 1.3), fog: false }));
    sp.scale.set(0.12, 0.08, 1); ctx.group.add(sp);
    ms.push({ sp, a: r() * 6.28, w: (0.9 + r() * 1.4) * (r() < 0.5 ? -1 : 1), rad: 0.75 + r() * 0.7, h: (r() - 0.3) * 1.2, ph: r() * 10, flap: 14 + r() * 10, t: 0 });
  }
  ctx.anims.push({
    update(dt) {
      for (const m of ms) {
        m.t += dt; m.a += m.w * dt * (1 + Math.sin(m.t * 1.7 + m.ph) * 0.6);
        const rr = m.rad * (0.75 + 0.25 * Math.sin(m.t * 2.3 + m.ph)) * (Math.sin(m.t * 0.5 + m.ph) > 0.92 ? 0.7 : 1);
        m.sp.position.set(x + Math.cos(m.a) * rr, y + m.h + Math.sin(m.t * 3.1 + m.ph) * 0.25, z + Math.sin(m.a) * rr);
        const open = Math.floor(m.t * m.flap) % 2 === 0; m.sp.scale.set(open ? 0.13 : 0.06, 0.08, 1);
      }
      return false;
    },
  });
}
