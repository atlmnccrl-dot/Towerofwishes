// Props for Act V, region II: the Sea of Unborn Days (PROPOSAL: names and descriptions are proposals for the author).
// Every dawn the Great Bell took, every morning the world was owed and never got, drifts here as an island of light
// over a dark sea: a spring morning with its blossom, a harvest dawn with its wheat, a winter dawn with its frost,
// each with its own sun stuck at the horizon, half risen, never rising. On them, the mornings that never happened:
// breakfast laid for people who never woke, windows thrown open on nothing, a weathervane cock that never crowed.
// Bridges of light join them. The last island holds the dawn that was never born: a red sun, enormous, half risen.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, bar, floorGlow, decal } from '../kit2.js';
import { glowSprite } from '../kit3.js';
import { glowM, breath, breathGlow } from './dream.js';

const TAU = Math.PI * 2;
export const NIGHT = 0x0a0612;
const woodM = () => once('ub-wood', () => cutout(new THREE.MeshLambertMaterial({ color: 0x8a6a4a })));
const clothM = () => once('ub-cloth', () => cutout(new THREE.MeshLambertMaterial({ color: 0xf0e8dc })));
const blossomM = () => once('ub-blossom', () => cutout(new THREE.MeshLambertMaterial({ color: 0xffb8d0, emissive: 0x401828 })));
const wheatM = () => once('ub-wheat', () => cutout(new THREE.MeshLambertMaterial({ color: 0xe8c060, emissive: 0x3a2a08 })));
const frostM = () => once('ub-frost', () => cutout(new THREE.MeshLambertMaterial({ color: 0xd8ecff, emissive: 0x18283a })));
const ironM = () => once('ub-iron', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3a3440, specular: 0x9a90a8, shininess: 40 })));

// ---------------------------------------------------------------- the suns that never rose
// A sun stuck at the horizon past the island's edge: a great disc of light half sunk below the island's rim, a
// halo round it, rays; it brightens and dims as if trying to rise. (x, z) where it stands, r its radius, color.
export function stuckSun(ctx, x, z, r = 6, color = 0xffc080, o = {}) {
  const g = new THREE.Group(); g.position.set(x, o.y ?? -r * 0.35, z); ctx.group.add(g);
  const disc = new THREE.Mesh(geo('ub-sun', () => new THREE.SphereGeometry(1, 20, 14)), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.7), fog: false })); disc.scale.setScalar(r); g.add(disc);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 64, 1.3), color: new THREE.Color(color).multiplyScalar(0.8), blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); halo.scale.set(r * 4.5, r * 4.5, 1); g.add(halo);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI - Math.PI / 2; const ray = new THREE.Mesh(box(0.25, r * 1.6, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.2), transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); ray.position.set(Math.sin(a) * r * 1.6, Math.cos(a) * r * 1.6, 0); ray.rotation.z = -a; g.add(ray); }
  if (o.face !== undefined) g.rotation.y = o.face;
  ctx.lights.push({ x, y: 4, z, color, intensity: o.light ?? 4, dist: r * 4, flicker: 0 });
  let t = Math.random() * 9; ctx.anims.push({ update(dt) { t += dt; const k = breath(t * 0.7); halo.material.opacity = 0.55 + 0.45 * k; g.position.y = (o.y ?? -r * 0.35) + Math.round(k * 0.4 * 16) / 16; return false; } });
}
// A bridge of light between two islands: the deck a band of pale gold glow, motes rising off its edges.
export function lightBridge(ctx, x0, z0, x1, z1) {
  const w = x1 - x0, d = z1 - z0;
  add(ctx, box(w, 0.12, d), glowM(0xffe0a0, 1.1), (x0 + x1) / 2, -0.04, (z0 + z1) / 2, { cast: false });
  floorGlow(ctx, (x0 + x1) / 2, (z0 + z1) / 2, w + 1, d + 1, 0xffd080, 0.25);
}

// ---------------------------------------------------------------- the mornings that never came
// A blossom tree of a spring morning that never came: a dark trunk, a crown of pink blossom, petals falling.
export function blossomTree(ctx, x, z, s = 1) {
  const R = T.rng(Math.round(x * 17 + z * 5));
  add(ctx, cyl(0.16 * s, 0.24 * s, 2.2 * s, 6), woodM(), x, 1.1 * s, z);
  for (let i = 0; i < 6; i++) { const a = R() * TAU, r = (0.4 + R() * 0.8) * s, y = (2.2 + R() * 1.2) * s; add(ctx, geo('ub-bloom', () => new THREE.IcosahedronGeometry(0.6, 0)), blossomM(), x + Math.sin(a) * r, y, z + Math.cos(a) * r, { s: new THREE.Vector3(s, s * 0.8, s) }); }
  solidCircle(ctx, x, z, 0.32 * s, 2.2);
}
// A sheaf of wheat standing in a field of harvest gold (no collision): a dozen stalks with heavy heads.
export function wheat(ctx, x0, z0, x1, z1, n = 40) {
  const R = T.rng(Math.round(x0 * 3 + z0 * 7));
  for (let i = 0; i < n; i++) { const x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0), h = 0.7 + R() * 0.5; bar(ctx, 'ub-stalk', wheatM(), [x, 0, z], [x + (R() - 0.5) * 0.3, h, z + (R() - 0.5) * 0.3], 0.04); add(ctx, box(0.09, 0.22, 0.09), wheatM(), x, h + 0.05, z, { cast: false }); }
}
// A haystack of the harvest dawn, golden, with a pitchfork in it.
export function haystack(ctx, x, z) { add(ctx, geo('ub-hay', () => new THREE.ConeGeometry(1.2, 2, 8)), wheatM(), x, 1, z); add(ctx, box(0.05, 1.8, 0.05), woodM(), x + 0.5, 1.4, z + 0.3, { rz: 0.4 }); solidCircle(ctx, x, z, 1.1, 2); }
// A tree of a winter dawn: bare, rimed white, icicles on its boughs.
export function frostTree(ctx, x, z) {
  const R = T.rng(Math.round(x * 7 + z * 11)); add(ctx, cyl(0.14, 0.22, 2.6, 6), frostM(), x, 1.3, z);
  for (let i = 0; i < 6; i++) { const a = R() * TAU, y = 1.4 + R() * 1.4, L = 0.8 + R() * 0.8; bar(ctx, 'ub-bough', frostM(), [x, y, z], [x + Math.sin(a) * L, y + 0.5, z + Math.cos(a) * L], 0.07); add(ctx, box(0.04, 0.3, 0.04), glowM(0xe0f0ff, 1.3), x + Math.sin(a) * L, y + 0.3, z + Math.cos(a) * L, { cast: false }); }
  solidCircle(ctx, x, z, 0.3, 2.6);
}
// A breakfast laid for people who never woke: a table with a cloth, cups, bread, a jug, chairs pushed back.
export function breakfast(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(2.2, 0.08, 1.2), woodM(), 0, 0.82, 0); for (const [lx, lz] of [[-1, -0.5], [1, -0.5], [-1, 0.5], [1, 0.5]]) P(box(0.08, 0.8, 0.08), woodM(), lx, 0.4, lz);
  P(box(2.3, 0.02, 1.0), clothM(), 0, 0.87, 0);
  for (const [lx, lz] of [[-0.7, -0.3], [0.1, 0.3], [0.7, -0.25]]) { P(cyl(0.07, 0.06, 0.12, 6), clothM(), lx, 0.94, lz); P(box(0.05, 0.03, 0.05), glowM(0xffd8a0, 1.4), lx, 1.0, lz, { cast: false }); }
  P(box(0.3, 0.12, 0.18), woodM(), -0.2, 0.94, -0.1); P(cyl(0.1, 0.12, 0.3, 6), clothM(), 0.4, 1.03, 0.1);
  for (const [lx, lz, r] of [[-0.6, -0.9, 0.3], [0.6, 0.95, -0.5], [1.4, 0, 1.2]]) { P(box(0.45, 0.06, 0.45), woodM(), lx, 0.45, lz, { ry: r }); P(box(0.45, 0.5, 0.06), woodM(), lx + Math.sin(r) * 0.2, 0.7, lz - Math.cos(r) * 0.2, { ry: r, rx: -0.2 }); }
  solid(ctx, x - 1.2, z - 0.7, x + 1.2, z + 0.7, 1);
}
// A window thrown open on nothing, standing alone (or floating), morning light pouring through it onto the ground.
export function openWindow(ctx, x, z, ry = 0, y = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(1.4, 0.12, 0.2), woodM(), 0, y + 0.6, 0); P(box(1.4, 0.12, 0.2), woodM(), 0, y + 2.4, 0); for (const s of [-1, 1]) P(box(0.12, 1.9, 0.2), woodM(), s * 0.65, y + 1.5, 0);
  P(box(1.2, 1.7, 0.02), glowM(0xfff0c8, 1.2), 0, y + 1.5, 0, { cast: false });
  for (const s of [-1, 1]) P(box(0.6, 1.7, 0.04), woodM(), s * 0.95, y + 1.5, 0.35, { ry: s * 0.9 });
  if (y < 0.5) floorGlow(ctx, x + Math.sin(ry) * 1.6, z + Math.cos(ry) * 1.6, 2.2, 3, 0xffe8b0, 0.3);
  if (y < 0.5) solid(ctx, x - 0.8, z - 0.2, x + 0.8, z + 0.2, 2.4);
}
// A weathervane cock on a post that never crowed: it turns slowly toward the stuck sun.
export function vane(ctx, x, z) {
  add(ctx, cyl(0.05, 0.07, 3.2, 6), ironM(), x, 1.6, z);
  const g = new THREE.Group(); g.position.set(x, 3.3, z); ctx.group.add(g);
  const b = new THREE.Mesh(box(0.6, 0.4, 0.08), ironM()); g.add(b); const tail = new THREE.Mesh(box(0.3, 0.5, 0.06), ironM()); tail.position.set(-0.35, 0.15, 0); g.add(tail); const arrow = new THREE.Mesh(box(1.2, 0.05, 0.05), ironM()); arrow.position.y = -0.3; g.add(arrow);
  let t = Math.random() * 9; ctx.anims.push({ update(dt) { t += dt; g.rotation.y = Math.round(Math.sin(t * 0.2) * 1.2 * 16) / 16; } });
  solidCircle(ctx, x, z, 0.15, 3);
}
// A sundial whose shadow never moves: a round dial in the floor, its gnomon, the hours in gold.
export function sundial(ctx, x, z, r = 2.4) {
  add(ctx, cyl(r, r, 0.2, 20), W4m(), x, 0.1, z, { cast: false });
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; add(ctx, box(0.12, 0.04, 0.4), glowM(0xffd890, 1.6), x + Math.sin(a) * (r - 0.4), 0.22, z + Math.cos(a) * (r - 0.4), { ry: a, cast: false }); }
  add(ctx, box(0.12, 1.4, 1.2), ironM(), x, 0.8, z, { rx: 0.5 }); solidCircle(ctx, x, z, 0.5, 1.2);
}
const W4m = () => once('ub-dial', () => cutout(new THREE.MeshPhongMaterial({ color: 0xc8b898, specular: 0xffffff, shininess: 30 })));
// Clouds lying on an island's floor at the edges, soft and lit by the sun (no collision).
export function cloudBank(ctx, x0, z0, x1, z1, color = 0xffe8e0, n = 12) {
  const R = T.rng(Math.round(x0 * 13 + z1 * 3)); const m = once('ub-cloud' + color, () => new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.55, emissive: new THREE.Color(color).multiplyScalar(0.25), depthWrite: false }));
  for (let i = 0; i < n; i++) { const side = Math.floor(R() * 4); const x = side === 0 ? x0 : side === 1 ? x1 : x0 + R() * (x1 - x0), z = side === 2 ? z0 : side === 3 ? z1 : z0 + R() * (z1 - z0); add(ctx, geo('ub-puff', () => new THREE.IcosahedronGeometry(1, 1)), m, x, -0.2 + R() * 0.4, z, { s: new THREE.Vector3(1.2 + R() * 1.4, 0.6 + R() * 0.5, 1.2 + R() * 1.4), cast: false }); }
}
// A cradle left on an island, rocking very slowly, empty, a little light in it.
export function cradle(ctx, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.group.add(g);
  const body = new THREE.Group(); body.position.y = 0.45; g.add(body);
  for (const [w, h, d, lx, ly, lz] of [[1.2, 0.08, 0.6, 0, 0, 0], [1.2, 0.4, 0.06, 0, 0.2, 0.3], [1.2, 0.4, 0.06, 0, 0.2, -0.3], [0.06, 0.5, 0.6, 0.6, 0.25, 0], [0.06, 0.5, 0.6, -0.6, 0.25, 0]]) { const m = new THREE.Mesh(box(w, h, d), woodM()); m.position.set(lx, ly, lz); body.add(m); }
  const glow = new THREE.Mesh(box(0.5, 0.1, 0.3), glowM(0xfff0d0, 1.8)); glow.position.y = 0.1; body.add(glow);
  for (const s of [-1, 1]) { const rk = new THREE.Mesh(box(0.06, 0.06, 0.8), woodM()); rk.position.set(s * 0.5, -0.4, 0); g.add(rk); }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; body.rotation.z = Math.round(Math.sin(t * 0.9) * 0.12 * 64) / 64; } });
  solidCircle(ctx, x, z, 0.6, 1);
}
