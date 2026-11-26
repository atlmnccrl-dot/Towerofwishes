// Props for Act V, region III: the Waking City (PROPOSAL: names and descriptions are proposals for the author).
// Bellmourn as the god dreams it: the same houses, lamps and squares the wardens fought through, but wrong. The
// houses lean as if the street were a ship in a swell; more of them hang upside down in the sky over the street,
// windows lit; the fountain's water falls upward; every clock tells a different hour and their hands run
// backward; the lamps drip their light up into the dark; a bell hangs from the floor by a chain that rises into
// nothing. The colours are wrong too: the stone is violet, the lamplight green. The Hushed live here as he
// remembers them, still at their tables.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, solid, solidCircle } from '../kit.js';
import * as K from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, bar, floorGlow, decal } from '../kit2.js';
import { glowSprite } from '../kit3.js';
import { glowM, breath, transplant, tint, motes } from './dream.js';

const TAU = Math.PI * 2;
export const DREAMSKY = 0x0e0818;
const DREAM = 0x8a70d0; // the dream's wrong colour, laid over the city's own materials
const wrong = (m) => tint(m, 0xb8a8e8, 1.0); // the stone goes violet
const ironM = () => once('wk-iron', () => cutout(new THREE.MeshPhongMaterial({ color: 0x2a2434, specular: 0x8a80a8, shininess: 40 })));
const faceM = () => once('wk-face', () => cutout(new THREE.MeshLambertMaterial({ color: 0xe8e0c8, emissive: 0x2a2818 })));

// ---------------------------------------------------------------- houses
// A house of Bellmourn leaning as if the street were heaving (lean: radians about the street's axis), solid at
// its foot. The real city's house, in the dream's colours.
export function leanHouse(ctx, x, z, w, d, h, lean = 0.12, o = {}) {
  transplant(ctx, (sub) => K.house(sub, 0, 0, w, d, h, { tone: o.tone || '#4a3e5e', roofTone: o.roof || '#2a2238', ridge: o.ridge }), x, 0, z, { rz: lean, ry: o.ry || 0, mat: wrong });
  solid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, h);
  // its windows lit green from inside
  for (let i = 0; i < 2; i++) add(ctx, box(0.5, 0.6, 0.05), glowM(0x80ffb0, 1.4), x + (i - 0.5) * w * 0.4 + Math.sin(lean) * h * 0.4, h * 0.55, z + (o.front ?? d / 2) + 0.04, { cast: false });
}
// A house hanging upside down in the sky over the street, turning very slowly, windows lit (no collision).
export function skyHouse(ctx, x, y, z, w = 3, d = 3, h = 3.4) {
  const sub = transplant(ctx, (s) => K.house(s, 0, 0, w, d, h, { tone: '#3e3456', roofTone: '#221a30' }), x, y, z, { rx: Math.PI, ry: Math.random() * TAU, rz: (Math.random() - 0.5) * 0.4, mat: wrong, cast: false });
  for (let i = 0; i < 3; i++) add(ctx, box(0.5, 0.6, 0.05), glowM(0x80ffb0, 1.6), x + (i - 1) * w * 0.3, y - h * 0.5, z + d / 2 + 0.06, { cast: false });
  return sub;
}
// A lamp of Bellmourn whose light drips upward: the post, the cage, a green flame, motes rising off it in a column.
export function upLamp(ctx, x, z) {
  add(ctx, cyl(0.07, 0.1, 3, 6), ironM(), x, 1.5, z); add(ctx, box(0.42, 0.5, 0.42), ironM(), x, 3.2, z); add(ctx, box(0.2, 0.3, 0.2), glowM(0x80ffb0, 2.4), x, 3.2, z, { cast: false });
  glowSprite(ctx, x, 3.2, z, 1.8, 0x80ffb0, 0.45);
  motes(ctx, [[x - 0.2, z - 0.2, x + 0.2, z + 0.2]], 12, { color: 0x90ffc0, rise: 0.9, h: 9, y0: 3.4, k: 2, seed: Math.round(x * 7 + z) });
  ctx.lights.push({ x, y: 3.2, z, color: 0x80ffb0, intensity: 2.8, dist: 7, flicker: 0.06 });
  solidCircle(ctx, x, z, 0.22, 3);
}
// A clock tower telling the wrong hour: a square tower, four faces, the hands of each running backward at its own
// speed; a bell in the top that never strikes. Solid.
export function wrongClock(ctx, x, z, h = 6) {
  add(ctx, box(1.8, h, 1.8), wrong(M.ashlar('#4a4258')), x, h / 2, z); add(ctx, box(2.2, 0.4, 2.2), wrong(M.ashlar('#3a3448')), x, h + 0.2, z);
  add(ctx, geo('wk-spire', () => new THREE.ConeGeometry(1.4, 2.4, 4)), wrong(M.slate ? M.slate('#2a2238') : M.ashlar('#2a2238')), x, h + 1.6, z, { ry: Math.PI / 4 });
  const hands = [];
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2; const fx = x + Math.sin(a) * 0.92, fz = z + Math.cos(a) * 0.92;
    add(ctx, geo('wk-face', () => new THREE.CircleGeometry(0.62, 16)), faceM(), fx, h * 0.72, fz, { ry: a, cast: false });
    const g = new THREE.Group(); g.position.set(fx + Math.sin(a) * 0.02, h * 0.72, fz + Math.cos(a) * 0.02); g.rotation.y = a; ctx.group.add(g);
    const big = new THREE.Mesh(box(0.05, 0.5, 0.02), ironM()); big.position.y = 0.22; const hb = new THREE.Group(); hb.add(big); g.add(hb);
    const small = new THREE.Mesh(box(0.06, 0.32, 0.02), ironM()); small.position.y = 0.14; const hs = new THREE.Group(); hs.add(small); g.add(hs);
    hands.push({ hb, hs, sp: (0.4 + i * 0.35) * (i % 2 ? 1 : -1) });
  }
  ctx.lights.push({ x, y: h * 0.72, z: z + 1.4, color: 0xe8e0c8, intensity: 2, dist: 6, flicker: 0 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const hd of hands) { hd.hb.rotation.z = Math.round(t * hd.sp * 32) / 32; hd.hs.rotation.z = Math.round(t * hd.sp * 0.083 * 32) / 32; } } });
  solidCircle(ctx, x, z, 1.25, h);
}
// The fountain whose water falls upward: a basin, a column of water rising out of it and on up into the dark.
export function upFountain(ctx, x, z) {
  add(ctx, cyl(1.6, 1.8, 0.6, 14), wrong(M.ashlar('#5a5268')), x, 0.3, z); add(ctx, geo('wk-fwater', () => new THREE.CircleGeometry(1.45, 16).rotateX(-Math.PI / 2)), glowM(0x70c8ff, 1.1), x, 0.62, z, { cast: false });
  const col = new THREE.Mesh(cyl(0.3, 0.45, 14, 8), new THREE.MeshBasicMaterial({ color: 0x90d8ff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); col.position.set(x, 7.4, z); ctx.group.add(col);
  motes(ctx, [[x - 0.5, z - 0.5, x + 0.5, z + 0.5]], 30, { color: 0xb0e8ff, rise: 2.2, h: 14, y0: 0.6, k: 2, seed: 5301 });
  ctx.lights.push({ x, y: 1.4, z, color: 0x90d0ff, intensity: 3, dist: 7, flicker: 0.05 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; col.material.opacity = 0.25 + 0.12 * Math.sin(t * 3); } });
  solidCircle(ctx, x, z, 1.7, 0.8);
}
// A bell hanging from the floor by a chain that rises into nothing: it hangs mouth-up, swaying upward.
export function upBell(ctx, x, z, s = 1.6) {
  const pv = new THREE.Group(); pv.position.set(x, 0.2, z); ctx.group.add(pv);
  const bell = new THREE.Mesh(geo('wk-bell', () => new THREE.CylinderGeometry(0.62, 0.3, 1.1, 12, 1, true)), once('wk-bellM', () => new THREE.MeshPhongMaterial({ color: 0x8a7aa8, specular: 0xd8c8ff, shininess: 60, side: THREE.DoubleSide }))); bell.scale.setScalar(s); bell.position.y = 3 + s * 0.55; pv.add(bell);
  const chain = new THREE.Mesh(box(0.06, 14, 0.06), ironM()); chain.position.y = 3 + s * 1.1 + 7; pv.add(chain);
  const lip = new THREE.Mesh(geo('wk-belllip', () => new THREE.TorusGeometry(0.62, 0.04, 4, 16).rotateX(Math.PI / 2)), glowM(0xc8a8ff, 1.8)); lip.scale.setScalar(s); lip.position.y = 3 + s * 1.1; pv.add(lip);
  floorGlow(ctx, x, z, 4, 4, 0xa080ff, 0.25);
  let t = 0; ctx.anims.push({ update(dt) { t += dt; pv.rotation.z = Math.round(Math.sin(t * 0.5) * 0.05 * 128) / 128; } });
}
// A Hushed of the dream, at a table that is not there, as he remembers them: a still grey figure seated.
export function hushedSeated(ctx, x, z, ry = 0) {
  const g = wrong(M.plaster('#7a7488')); const P = (gg, m, lx, ly, lz, oo) => part(ctx, gg, m, x, z, ry, lx, ly, lz, oo);
  P(box(0.42, 0.45, 0.42), g, 0, 0.22, 0); P(box(0.4, 0.55, 0.26), g, 0, 0.72, 0); P(box(0.24, 0.26, 0.24), g, 0, 1.14, 0.02);
  P(box(0.1, 0.1, 0.4), g, 0.15, 0.62, 0.3); P(box(0.1, 0.1, 0.4), g, -0.15, 0.62, 0.3);
  solidCircle(ctx, x, z, 0.3, 1.2);
}
// A market stall of Lantern Row in the dream: a counter, an awning sagging the wrong way (up), goods of light.
export function dreamStall(ctx, x, z, ry = 0) {
  const P = (gg, m, lx, ly, lz, oo) => part(ctx, gg, m, x, z, ry, lx, ly, lz, oo);
  P(box(2.2, 0.9, 0.8), wrong(M.wood('#4a3a2a')), 0, 0.45, 0); for (const s of [-1, 1]) P(box(0.1, 2.4, 0.1), wrong(M.wood('#3a2a1a')), s * 1.05, 1.2, -0.35);
  P(box(2.4, 0.06, 1.2), once('wk-awn', () => cutout(new THREE.MeshLambertMaterial({ color: 0x5a3a8a }))), 0, 2.6, 0.2, { rx: -0.35 });
  for (let i = 0; i < 4; i++) P(box(0.2, 0.2, 0.2), glowM([0x80ffb0, 0xc8a8ff, 0xffd080, 0x80c8ff][i], 1.6), -0.75 + i * 0.5, 1.02, 0.05, { cast: false });
  solid(ctx, x - 1.1, z - 0.45, x + 1.1, z + 0.45, 1);
}
// A street that ends in the sky: the cobbles run up a ramp that curls over into nothing (a pure decoration far off).
export function curlingStreet(ctx, x, z, len = 14) {
  for (let i = 0; i < 12; i++) { const a = i / 11 * Math.PI * 0.9; const r = len / 2.4; add(ctx, box(4, 0.3, len / 11), wrong(M.cobble('#5a5468')), x, 4 + Math.sin(a) * r, z - Math.cos(a) * r, { rx: -a, cast: false }); }
}
