// Props for Act IV, region IV: the Broken Halo (PROPOSAL: names and descriptions are proposals for the author).
// Heaven's halo, the golden ring that crowned it, broke when the Wheel fell and came down over the bronze sea. Its
// pieces lie in the molten-gold water as islands: curved slabs of the ring with its inscription still glowing,
// spokes as long as streets lying across the waves, bells floating as buoys and tolling with the swell. The last
// angel keeps its gate: over the arena the halo's last whole arc hangs in the air, turning, and from it she comes.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, bar, floorGlow, decal } from '../kit2.js';
import { glowSprite } from '../kit3.js';
import { W4, goldM4, bronzeM, verdM, glowM, motes } from '../kit4.js';

const TAU = Math.PI * 2;
export const SEA = 0x120a03;
const brightGold = () => once('ha-gold', () => cutout(new THREE.MeshPhongMaterial({ color: 0xf0c050, specular: 0xfff0c0, shininess: 90, emissive: 0x4a3008 })));
const runeM = () => glowM(0xfff0b0, 2.2);

// ---------------------------------------------------------------- the halo's pieces
// An arc of the halo lying in the sea or on a slab: a curved band of gold, thick as a wall, its inscription of
// light running along its face, broken at both ends. (cx, cz): the centre of the ring it came from; R its
// radius; from a0 to a1 (radians, 0 = +z); o.y its height (sunk below zero for one half under water); o.tilt.
export function arc(ctx, cx, cz, R, a0, a1, o = {}) {
  const y = o.y ?? 0.6; const h = o.h ?? 1.4; const n = Math.max(3, Math.round((a1 - a0) * R / 1.2)); const g = new THREE.Group(); g.position.set(cx, y, cz); if (o.tilt) g.rotation.z = o.tilt; ctx.group.add(g);
  for (let i = 0; i < n; i++) {
    const a = a0 + (i + 0.5) * (a1 - a0) / n; const seg = (a1 - a0) / n * R + 0.05;
    const m = new THREE.Mesh(box(seg, h, 0.6), brightGold()); m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); m.rotation.y = a + Math.PI / 2; m.castShadow = true; m.receiveShadow = true; g.add(m);
    if (i % 2 === 0) { const r = new THREE.Mesh(box(seg * 0.6, 0.16, 0.04), runeM()); r.position.set(Math.sin(a) * (R + 0.31), 0.1, Math.cos(a) * (R + 0.31)); r.rotation.y = a + Math.PI / 2; g.add(r); }
  }
  if (o.solid !== false && y > -0.6) for (let i = 0; i <= n; i += 1) { const a = a0 + i * (a1 - a0) / n; solidCircle(ctx, cx + Math.sin(a) * R, cz + Math.cos(a) * R, 0.55, h); }
}
// The halo's last whole arc hanging over the arena, turning slowly, light dripping from its inscription; under
// it, a ring of light on the floor. The Seraph comes down out of it.
export function hangingHalo(ctx, x, y, z, R = 7) {
  const g = new THREE.Group(); g.position.set(x, y, z); ctx.group.add(g); g.rotation.x = 0.35;
  const n = 26; for (let i = 0; i < n; i++) { if (i === 7 || i === 8 || i === 19) continue; const a = i / n * TAU; const m = new THREE.Mesh(box(TAU * R / n + 0.05, 0.9, 0.5), brightGold()); m.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); m.rotation.y = a + Math.PI / 2; g.add(m); if (i % 2) { const r = new THREE.Mesh(box(TAU * R / n * 0.6, 0.14, 0.04), runeM()); r.position.set(Math.sin(a) * (R + 0.26), 0, Math.cos(a) * (R + 0.26)); r.rotation.y = a + Math.PI / 2; g.add(r); } }
  floorGlow(ctx, x, z, R * 2.4, R * 2.4, 0xffd070, 0.22);
  decal(ctx, x, z, R * 2.2, T.sigil('circle', 128, 4810), 0xffd890, { k: 0.3, pulse: 0.5, spin: -0.004 });
  glowSprite(ctx, x, y, z, R * 1.6, 0xffe0a0, 0.25);
  ctx.lights.push({ x, y: y - 1, z, color: 0xffd890, intensity: 5, dist: R * 2.6, flicker: 0.03 });
  motes(ctx, [[x - R, z - R, x + R, z + R]], 60, { vy: -0.5, h: y, y0: 0, color: 0xfff0b0, add: true, k: 1.8, sway: 0.2, seed: 4811 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; g.rotation.y = Math.round(t * 0.06 * 128) / 128; } });
}
// A spoke of the halo, as long as a street, lying across the slab (or half in the sea): a beam of gold with a
// knuckle of verdigris bronze at its broken end. Solid along its length.
export function spoke(ctx, x, z, ry = 0, len = 8, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry); const y = o.y ?? 0.35;
  add(ctx, box(0.5, 0.5, len), brightGold(), x, y, z, { ry, rx: o.tilt || 0 });
  add(ctx, box(0.9, 0.9, 0.9), verdM(), x + s * len / 2, y, z + c * len / 2, { ry });
  for (let k = 0; k < 4; k++) add(ctx, box(0.52, 0.08, 0.12), runeM(), x + s * (k - 1.5) * len / 4.5, y + 0.26, z + c * (k - 1.5) * len / 4.5, { ry, cast: false });
  if (y > -0.2) for (let k = -2; k <= 2; k++) solidCircle(ctx, x + s * k * len / 5, z + c * k * len / 5, 0.38, 0.8);
}
// A bell floating as a buoy in the bronze sea, bobbing on the swell and tolling now and then (its lip flares).
export function buoy(ctx, x, z, s = 1) {
  const g = new THREE.Group(); g.position.set(x, -0.6, z); ctx.group.add(g);
  const bell = new THREE.Mesh(geo('ha-buoy', () => new THREE.CylinderGeometry(0.4, 0.8, 1.2, 12, 1, true)), once('ha-buoyM', () => new THREE.MeshPhongMaterial({ color: 0xb08030, specular: 0xffd890, shininess: 60, side: THREE.DoubleSide }))); bell.scale.setScalar(s); bell.position.y = 0.6 * s; bell.castShadow = true; g.add(bell);
  const top = new THREE.Mesh(geo('ha-buoytop', () => new THREE.SphereGeometry(0.4, 10, 4, 0, TAU, 0, Math.PI / 2)), bronzeM()); top.scale.setScalar(s); top.position.y = 1.2 * s; g.add(top);
  const lip = new THREE.Mesh(geo('ha-buoylip', () => new THREE.TorusGeometry(0.8, 0.04, 4, 16).rotateX(Math.PI / 2)), glowM(0xffe0a0, 2)); lip.scale.setScalar(s); lip.visible = false; g.add(lip);
  let t = Math.random() * 9; ctx.anims.push({ update(dt) { t += dt; g.position.y = -0.6 + Math.round(Math.sin(t * 0.9) * 0.18 * 32) / 32; g.rotation.z = Math.round(Math.sin(t * 0.7) * 0.12 * 64) / 64; lip.visible = Math.sin(t * 0.45) > 0.97; } });
}
// The bronze sea: molten-gold water under the slabs, slow swell, glints; a plane at sea level across the bounds.
export function sea(ctx, b, y = -0.9) {
  const m = new THREE.Mesh(geo('ha-sea', () => new THREE.PlaneGeometry(1, 1, 1, 1).rotateX(-Math.PI / 2)), once('ha-seaM', () => new THREE.MeshPhongMaterial({ color: 0x3a240a, specular: 0xffc060, shininess: 80, emissive: 0x1a0c02, transparent: true, opacity: 0.96 })));
  m.scale.set(b[2] - b[0] + 60, 1, b[3] - b[1] + 60); m.position.set((b[0] + b[2]) / 2, y, (b[1] + b[3]) / 2); m.receiveShadow = true; ctx.group.add(m);
  motes(ctx, [b], 160, { vy: 0.0, h: 0.2, y0: y + 0.05, color: 0xffe0a0, add: true, k: 2, blink: true, seed: 4812 }); // glints on the swell
}
// A golden angel kneeling on a plinth, wings raised, its face a smooth mask; its hands hold a sword point-down.
export function goldAngel(ctx, x, z, ry = 0, o = {}) {
  const g = brightGold(); const P = (gg, m, lx, ly, lz, oo) => part(ctx, gg, m, x, z, ry, lx, ly, lz, oo); const h = o.h ?? 2.6;
  P(box(1.3, 0.5, 1.3), W4.marble('#c8b890'), 0, 0.25, 0); P(cyl(0.3, 0.5, h * 0.5, 7), g, 0, 0.5 + h * 0.25, 0); P(box(0.5, h * 0.3, 0.36), g, 0, 0.5 + h * 0.62, 0.04, { rx: 0.2 });
  P(box(0.26, 0.3, 0.26), g, 0, 0.5 + h * 0.86, 0.1); P(box(0.18, 0.2, 0.04), glowM(0xfff4d0, 1.4), 0, 0.5 + h * 0.86, 0.24, { cast: false });
  for (const s of [-1, 1]) { P(box(0.12, h * 0.9, 0.7), g, s * 0.5, 0.5 + h * 0.8, -0.3, { rz: s * 0.35, rx: -0.3 }); P(box(0.1, h * 0.55, 0.5), g, s * 0.92, 0.5 + h * 1.05, -0.45, { rz: s * 0.75 }); }
  P(box(0.08, h * 0.6, 0.08), W4.gold('#d8d8e0'), 0, 0.5 + h * 0.3, 0.45); P(box(0.4, 0.06, 0.08), g, 0, 0.5 + h * 0.6, 0.45);
  if (o.glow) { ctx.lights.push({ x, y: 0.5 + h, z, color: 0xffe0a0, intensity: o.glow, dist: 5, flicker: 0.04 }); glowSprite(ctx, x, 0.5 + h * 0.9, z, 1.4, 0xffe0a0, 0.45); }
  solidCircle(ctx, x, z, 0.72, h);
}
// A pillar of light rising out of the sea (where a piece of the halo sank), very tall, slowly pulsing.
export function seaLight(ctx, x, z, r = 1.2) {
  const m = new THREE.Mesh(geo('ha-pillar', () => new THREE.CylinderGeometry(1, 1, 1, 10, 1, true)), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  m.scale.set(r, 26, r); m.position.set(x, 12, z); ctx.group.add(m);
  let t = Math.random() * 9; ctx.anims.push({ update(dt) { t += dt; m.material.opacity = 0.08 + 0.06 * Math.max(0, Math.sin(t * 0.8)); } });
}
// A brazier of the ring: a bowl of gold on a tripod, burning with white fire.
export function ringBrazier(ctx, x, z) {
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; bar(ctx, 'ha-tripod', brightGold(), [x + Math.sin(a) * 0.4, 0, z + Math.cos(a) * 0.4], [x, 1.1, z], 0.07); }
  add(ctx, cyl(0.45, 0.25, 0.3, 10), brightGold(), x, 1.2, z); add(ctx, box(0.3, 0.4, 0.3), glowM(0xfff4e0, 2.6), x, 1.5, z, { cast: false });
  glowSprite(ctx, x, 1.6, z, 1.8, 0xffeac0, 0.5); ctx.lights.push({ x, y: 1.7, z, color: 0xffe8c0, intensity: 3.2, dist: 7, flicker: 0.12 });
  solidCircle(ctx, x, z, 0.5, 1.4);
}
