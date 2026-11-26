// Props for Act V, region IV: the Cradle of Bronze (PROPOSAL: names and descriptions are proposals for the author).
// At the heart of the dream, the foundry where the First Founder cast the Great Bell a thousand years ago, kept
// as he left it, and kept by him: moulds of bells in rows like graves, rivers of molten bronze running in stone
// channels, crucibles tilting, hammers as big as carts hanging from chains, the cell where he has slept beside his
// work for a thousand years, a room of wax patterns. At the far end, half sunk in a pool of bronze, the Cradle:
// the first mould, the shape of the Great Bell, with the god asleep inside it, light breathing through its cracks.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, bar, floorGlow, decal } from '../kit2.js';
import { glowSprite } from '../kit3.js';
import { dreamBronze, darkBronze, glowM, breath, breathGlow, motes } from './dream.js';

const TAU = Math.PI * 2;
export const SOOT = 0x0c0604;
const clayM = () => once('cr-clay', () => cutout(new THREE.MeshLambertMaterial({ color: 0xa8805c, emissive: 0x1a0c04 })));
const ironM = () => once('cr-iron', () => cutout(new THREE.MeshPhongMaterial({ color: 0x2a2624, specular: 0x8a7a6a, shininess: 30 })));
const waxM = () => once('cr-wax', () => cutout(new THREE.MeshLambertMaterial({ color: 0xe8dcc0, emissive: 0x2a2010 })));
const moltenM = () => glowM(0xff6a10, 1.8);

// ---------------------------------------------------------------- moulds and the Cradle
// A bell mould: a clay shell in the shape of a bell, bound with iron hoops, its seam glowing where bronze is still
// cooling inside. s: size.
export function mould(ctx, x, z, s = 1, o = {}) {
  add(ctx, geo('cr-mould', () => new THREE.CylinderGeometry(0.55, 1.05, 1.6, 12)), clayM(), x, 0.8 * s, z, { s: new THREE.Vector3(s, s, s) });
  add(ctx, geo('cr-mouldtop', () => new THREE.SphereGeometry(0.55, 10, 5, 0, TAU, 0, Math.PI / 2)), clayM(), x, 1.6 * s, z, { s: new THREE.Vector3(s, s, s) });
  for (const y of [0.3, 0.9, 1.4]) add(ctx, geo('cr-hoop' + y, () => new THREE.TorusGeometry(1.05 - (y / 1.6) * 0.5 + 0.03, 0.04, 4, 16).rotateX(Math.PI / 2)), ironM(), x, y * s, z, { s: new THREE.Vector3(s, s, s), cast: false });
  if (o.hot !== false) { add(ctx, box(0.06 * s, 1.5 * s, 0.03), moltenM(), x + 0.62 * s, 0.85 * s, z + 0.55 * s, { ry: 0.8, rz: 0.3, cast: false }); glowSprite(ctx, x, 0.9 * s, z, 1.4 * s, 0xff7a20, 0.25); ctx.lights.push({ x: x + 0.8 * s, y: 1.2 * s, z: z + 0.8 * s, color: 0xff8030, intensity: 1.8, dist: 5, flicker: 0.12 }); }
  solidCircle(ctx, x, z, 1.0 * s, 1.8 * s);
}
// The Cradle: the first mould, vast, half sunk in a ring-pool of molten bronze; through its cracks the light of the
// god asleep inside breathes in and out. Solid at the mould.
export function cradle(ctx, x, z, s = 4) {
  const g = new THREE.Group(); g.position.set(x, -0.4 * s, z); ctx.group.add(g);
  const shell = new THREE.Mesh(geo('cr-cradle', () => new THREE.CylinderGeometry(0.55, 1.05, 1.6, 16)), clayM()); shell.scale.setScalar(s); shell.position.y = 0.8 * s; shell.castShadow = true; g.add(shell);
  const top = new THREE.Mesh(geo('cr-cradletop', () => new THREE.SphereGeometry(0.55, 14, 6, 0, TAU, 0, Math.PI / 2)), clayM()); top.scale.setScalar(s); top.position.y = 1.6 * s; g.add(top);
  for (const y of [0.25, 0.7, 1.15, 1.5]) { const hp = new THREE.Mesh(geo('cr-choop' + y, () => new THREE.TorusGeometry(1.05 - (y / 1.6) * 0.5 + 0.04, 0.05, 4, 20).rotateX(Math.PI / 2)), ironM()); hp.scale.setScalar(s); hp.position.y = y * s; g.add(hp); }
  const cracks = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + 0.3; const c = new THREE.Mesh(box(0.04, 0.6 + (i % 3) * 0.2, 0.02), glowM(0xffe0a0, 2.4)); c.scale.setScalar(s); c.position.set(Math.sin(a) * 0.85 * s, (0.5 + (i % 3) * 0.3) * s, Math.cos(a) * 0.85 * s); c.rotation.set(0, a, (i % 2 ? 0.4 : -0.3)); g.add(c); cracks.push(c); }
  // the ring-pool of molten bronze round it
  add(ctx, geo('cr-pool', () => new THREE.RingGeometry(1, 1.5, 24).rotateX(-Math.PI / 2)), moltenM(), x, 0.03, z, { s: new THREE.Vector3(s * 1.05, 1, s * 1.05), cast: false });
  floorGlow(ctx, x, z, s * 4, s * 4, 0xff6a20, 0.35);
  const glow = breathGlow(ctx, x, 1.6 * s, z, s * 3, 0xffd890, 0.7);
  ctx.lights.push({ x, y: 2 * s, z: z + s * 1.4, color: 0xffc070, intensity: 6, dist: s * 5, flicker: 0.02 });
  motes(ctx, [[x - s * 1.5, z - s * 1.5, x + s * 1.5, z + s * 1.5]], 50, { color: 0xffc080, rise: 0.6, h: s * 2.5, k: 2 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; const k = breath(t); for (const c of cracks) c.scale.y = s * (0.7 + 0.6 * k); return false; } });
  solidCircle(ctx, x, z, 1.05 * s, 2 * s);
}

// ---------------------------------------------------------------- molten bronze
// A channel of molten bronze cut across a hall (axis-aligned rect), flowing; solid except where o.bridges (ranges
// along the channel's length) cross it, where iron plates lie over it.
export function channel(ctx, x0, z0, x1, z1, o = {}) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const w = ax ? z1 - z0 : x1 - x0;
  add(ctx, box(x1 - x0, 0.1, z1 - z0), moltenM(), (x0 + x1) / 2, 0.02, (z0 + z1) / 2, { cast: false });
  for (const s of [0, 1]) add(ctx, box(ax ? len : 0.3, 0.3, ax ? 0.3 : len), darkBronze(), ax ? (x0 + x1) / 2 : (s ? x1 : x0), 0.15, ax ? (s ? z1 : z0) : (z0 + z1) / 2);
  floorGlow(ctx, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) + 2, (z1 - z0) + 2, 0xff5a10, 0.3);
  const bridges = o.bridges || []; let c = ax ? x0 : z0;
  for (const [b0, b1] of [...bridges, [ax ? x1 : z1, ax ? x1 : z1]]) {
    if (b0 > c) solid(ctx, ax ? c : x0, ax ? z0 : c, ax ? b0 : x1, ax ? z1 : b0, 0.4);
    if (b1 > b0) add(ctx, box(ax ? b1 - b0 : w + 0.6, 0.12, ax ? w + 0.6 : b1 - b0), ironM(), ax ? (b0 + b1) / 2 : (x0 + x1) / 2, 0.08, ax ? (z0 + z1) / 2 : (b0 + b1) / 2, { cast: false });
    c = b1;
  }
  motes(ctx, [[x0, z0, x1, z1]], Math.round(len * 2), { color: 0xffa040, rise: 0.8, h: 2, k: 2.4 });
  ctx.lights.push({ x: (x0 + x1) / 2, y: 1, z: (z0 + z1) / 2, color: 0xff6a20, intensity: 3, dist: len * 0.6, flicker: 0.1 });
}
// A crucible on a frame, tilting slowly to pour a thread of molten bronze into a mould below.
export function crucible(ctx, x, z) {
  for (const s of [-1, 1]) add(ctx, box(0.2, 3, 0.2), ironM(), x + s * 1.1, 1.5, z); add(ctx, box(2.4, 0.2, 0.2), ironM(), x, 3, z);
  const pot = new THREE.Group(); pot.position.set(x, 2.2, z); ctx.group.add(pot);
  const b = new THREE.Mesh(cyl(0.6, 0.45, 0.9, 10), darkBronze()); pot.add(b); const lip = new THREE.Mesh(geo('cr-cruc', () => new THREE.CircleGeometry(0.55, 10).rotateX(-Math.PI / 2)), moltenM()); lip.position.y = 0.46; pot.add(lip);
  const stream = new THREE.Mesh(box(0.08, 1.6, 0.08), moltenM()); stream.position.set(x + 0.7, 1.0, z); ctx.group.add(stream);
  mould(ctx, x + 0.7, z + 0.1, 0.6);
  let t = 0; ctx.anims.push({ update(dt) { t += dt; const k = 0.5 + 0.5 * Math.sin(t * 0.4); pot.rotation.z = -0.3 - 0.5 * k; stream.visible = k > 0.55; } });
  solid(ctx, x - 1.3, z - 0.3, x + 1.3, z + 0.3, 3);
}
// A furnace in a wall: a domed mouth of brick, the fire roaring in it.
export function furnace(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(3, 3.4, 2.2), M.brick('#3a2418'), 0, 1.7, 0); P(geo('cr-furndome', () => new THREE.SphereGeometry(1.5, 10, 6, 0, TAU, 0, Math.PI / 2)), M.brick('#3a2418'), 0, 3.4, 0);
  P(box(1.4, 1.2, 0.1), glowM(0xff7a20, 2.2), 0, 1.0, 1.12, { cast: false }); P(cyl(0.35, 0.4, 3, 8), M.brick('#2a1a10'), 0.8, 5, -0.4);
  ctx.lights.push({ x: x + Math.sin(ry) * 1.6, y: 1.2, z: z + Math.cos(ry) * 1.6, color: 0xff7020, intensity: 4.4, dist: 9, flicker: 0.25 });
  solid(ctx, x - 1.5, z - 1.1, x + 1.5, z + 1.1, 3.4);
}
// A hammer as big as a cart hanging from chains, swinging very slightly (no collision: it hangs overhead).
export function bigHammer(ctx, x, z, y = 5) {
  const pv = new THREE.Group(); pv.position.set(x, y + 6, z); ctx.group.add(pv);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(box(0.06, 6, 0.06), ironM()); ch.position.set(s * 0.8, -3, 0); pv.add(ch); }
  const head = new THREE.Mesh(box(2.4, 1.2, 1.2), darkBronze()); head.position.y = -6.4; pv.add(head); const hdl = new THREE.Mesh(box(0.25, 0.25, 4), M.wood('#3a2a1a')); hdl.position.set(0, -6.4, 2.4); pv.add(hdl);
  let t = Math.random() * 9; ctx.anims.push({ update(dt) { t += dt; pv.rotation.x = Math.round(Math.sin(t * 0.35) * 0.05 * 128) / 128; } });
}
// An anvil on a stump, a hammer leaning on it, sparks now and then.
export function anvil(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(cyl(0.5, 0.55, 0.7, 8), M.wood('#3a2a1a'), 0, 0.35, 0); P(box(1.2, 0.3, 0.5), ironM(), 0, 0.85, 0); P(box(0.5, 0.2, 0.4), ironM(), 0.55, 0.85, 0);
  P(box(0.12, 1.1, 0.12), M.wood('#4a3424'), -0.5, 0.6, 0.35, { rz: 0.3 }); P(box(0.4, 0.25, 0.25), darkBronze(), -0.66, 1.1, 0.35);
  motes(ctx, [[x - 0.3, z - 0.3, x + 0.3, z + 0.3]], 8, { color: 0xffc060, rise: 1.2, h: 1.5, y0: 1, k: 2.5 });
  solidCircle(ctx, x, z, 0.65, 1);
}
// The Founder's cell: a cot of bronze planks, a desk heaped with drawings of bells, a candle that has burned a
// thousand years and is no shorter.
export function cell(ctx, x, z) {
  add(ctx, box(2.2, 0.4, 1.0), darkBronze(), x - 2, 0.3, z - 2); add(ctx, box(2.0, 0.1, 0.9), M.wood('#5a4a3a'), x - 2, 0.55, z - 2);
  add(ctx, box(1.8, 0.1, 1.0), M.wood('#4a3424'), x + 1.6, 0.9, z + 1.6); for (const [lx, lz] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) add(ctx, box(0.08, 0.9, 0.08), M.wood('#3a2a1a'), x + 1.6 + lx, 0.45, z + 1.6 + lz);
  const R = T.rng(5411); for (let i = 0; i < 8; i++) add(ctx, box(0.5, 0.01, 0.35), waxM(), x + 1.2 + R() * 0.8, 0.96 + i * 0.01, z + 1.3 + R() * 0.6, { ry: R() * TAU, cast: false });
  add(ctx, cyl(0.05, 0.05, 0.3, 6), waxM(), x + 2.2, 1.1, z + 1.9); add(ctx, box(0.06, 0.14, 0.06), glowM(0xffc060, 2.6), x + 2.2, 1.32, z + 1.9, { cast: false });
  ctx.lights.push({ x: x + 2.2, y: 1.5, z: z + 1.9, color: 0xffb050, intensity: 2.6, dist: 6, flicker: 0.15 });
  solid(ctx, x - 3.1, z - 2.5, x - 0.9, z - 1.5, 0.6); solid(ctx, x + 0.7, z + 1.1, x + 2.5, z + 2.1, 1);
}
// A wax pattern of a bell (the first shape before the mould): pale, on a turntable, half carved.
export function waxBell(ctx, x, z, s = 0.8) {
  add(ctx, cyl(0.7 * s, 0.7 * s, 0.2, 10), M.wood('#3a2a1a'), x, 0.1, z);
  add(ctx, geo('cr-wax', () => new THREE.CylinderGeometry(0.5, 0.95, 1.4, 12)), waxM(), x, 0.9 * s, z, { s: new THREE.Vector3(s, s, s) });
  solidCircle(ctx, x, z, 0.75 * s, 1.4 * s);
}
// A heap of slag, dark and glassy, cooling, a few embers in it.
export function slag(ctx, x, z, s = 1) {
  const R = T.rng(Math.round(x * 3 + z * 11)); for (let i = 0; i < 5; i++) add(ctx, geo('cr-slag', () => new THREE.IcosahedronGeometry(0.5, 0)), M.flat(0x1a120e), x + (R() - 0.5) * s, 0.2 + R() * 0.3 * s, z + (R() - 0.5) * s, { s: new THREE.Vector3(s, s * 0.6, s) });
  add(ctx, box(0.12, 0.08, 0.12), glowM(0xff6a20, 2), x, 0.45 * s, z, { cast: false }); solidCircle(ctx, x, z, 0.7 * s, 0.7);
}
