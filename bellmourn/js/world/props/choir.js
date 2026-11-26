// Props for Act IV, region I: the Sunken Choir (PROPOSAL: names and descriptions are proposals for the author).
// A cathedral of heaven that fell into the sea and sank: broken floors of drowned stone hanging in green-black
// water, pillars wound with weed, ruined walls with lancets still faintly lit, pews tipped over, organ pipes of
// bronze gone green, drowned angels of verdigris still holding their trumpets, bells hanging on chains that
// sway in the current, a rose window lying on the floor glowing, choristers of bone in their stalls with their
// mouths open (they are still singing), a font of pale light, kelp, coral, bubbles and small fish.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, plane, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, put, bar, pix, floorGlow, decal } from '../kit2.js';
import { W3, glowSprite } from '../kit3.js';
import { W4, verdM, bronzeM, glowM, motes } from '../kit4.js';

export const DEEP = 0x061a1e;
const boneM = () => once('ch-bone', () => cutout(new THREE.MeshLambertMaterial({ color: 0xc8c8b4 })));
const robeM = () => once('ch-robe', () => cutout(new THREE.MeshLambertMaterial({ color: 0x1e3a36 })));
const weedM = () => once('ch-weed', () => cutout(new THREE.MeshLambertMaterial({ color: 0x3a6a3a, emissive: 0x081408 })));
const stoneM = () => W4.drown('#6a7a74');
const verdDS = () => once('ch-verdDS', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3e7a68, specular: 0x8ac0a8, shininess: 28, side: THREE.DoubleSide })));

// ---------------------------------------------------------------- the drowned angel
// A statue of verdigris bronze on a plinth of drowned stone: a robed angel, wings half spread, head bowed,
// holding a long trumpet to its lips (o.pose 'trumpet'), or its hands folded (o.pose 'pray'); weed hangs off
// the wings, barnacles crust the plinth. Front toward ry.
export function drownedAngel(ctx, x, z, ry = 0, o = {}) {
  const h = o.h ?? 3.4; const v = verdM(); const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(1.3, 0.5, 1.3), stoneM(), 0, 0.25, 0); P(box(1.4, 0.1, 1.4), W4.verd(), 0, 0.52, 0, { cast: false });
  const b = 0.55;
  P(cyl(0.24, 0.5, h * 0.6, 7), v, 0, b + h * 0.3, 0); P(cyl(0.26, 0.24, h * 0.14, 7), v, 0, b + h * 0.67, 0);
  P(box(0.3, 0.32, 0.3), v, 0, b + h * 0.82, 0.06, { rx: 0.35 }); // the head, bowed
  for (const s of [-1, 1]) {
    P(box(0.12, h * 0.78, 0.7), v, s * 0.48, b + h * 0.6, -0.28, { rz: s * 0.28, rx: -0.2 }); P(box(0.1, h * 0.5, 0.5), v, s * 0.86, b + h * 0.78, -0.42, { rz: s * 0.6 });
    P(box(0.05, h * 0.36, 0.05), weedM(), s * 0.62, b + h * 0.42, -0.2, { cast: false }); P(box(0.05, h * 0.24, 0.05), weedM(), s * 0.9, b + h * 0.56, -0.4, { cast: false });
  }
  if ((o.pose || 'trumpet') === 'trumpet') { P(box(0.1, 0.1, 1.2), bronzeM(), 0.1, b + h * 0.76, 0.6, { rx: 0.3 }); P(cyl(0.22, 0.05, 0.3, 8), bronzeM(), 0.1, b + h * 0.62, 1.15, { rx: Math.PI / 2 + 0.3 }); for (const s of [-1, 1]) P(box(0.12, 0.12, 0.45), v, s * 0.16, b + h * 0.72, 0.28, { rx: -0.9 }); }
  else for (const s of [-1, 1]) P(box(0.14, h * 0.3, 0.14), v, s * 0.12, b + h * 0.6, 0.24, { rx: -0.8, rz: -s * 0.5 });
  P(geo('ch-ahalo', () => new THREE.TorusGeometry(0.3, 0.04, 4, 14)), bronzeM(), 0, b + h * 0.98, -0.04);
  for (let i = 0; i < 5; i++) { const a = i * 1.3; P(box(0.08, 0.06, 0.08), boneM(), Math.cos(a) * 0.6, 0.3 + (i % 2) * 0.1, Math.sin(a) * 0.6, { cast: false }); }
  if (o.glow) { ctx.lights.push({ x, y: b + h * 0.9, z, color: 0x80e0c8, intensity: o.glow, dist: 5, flicker: 0.05 }); glowSprite(ctx, x, b + h * 0.98, z, 1.2, 0x80e0c8, 0.5); }
  solidCircle(ctx, x, z, 0.72, h);
}

// ---------------------------------------------------------------- pillars, walls, arches
// A drowned pillar: a fluted shaft of pale stone wound with weed, a capital gone green; o.broken: snapped off,
// drums lying beside it.
export function pillar(ctx, x, z, h = 5, o = {}) {
  const s = stoneM(); add(ctx, box(1.1, 0.4, 1.1), s, x, 0.2, z); add(ctx, cyl(0.4, 0.44, h, 10), s, x, 0.4 + h / 2, z);
  for (let i = 0; i < 3; i++) { const y = 0.6 + i * h * 0.3; add(ctx, geo('ch-wind', () => new THREE.TorusGeometry(0.46, 0.05, 3, 10)), weedM(), x, y, z, { rx: Math.PI / 2 + 0.3, ry: i, cast: false }); }
  if (o.broken) { const R = T.rng(Math.round(x * 3 + z * 5)); for (let i = 0; i < 3; i++) add(ctx, box(0.32, 0.3 + R() * 0.3, 0.32), s, x + (R() - 0.5) * 0.4, 0.4 + h + 0.1, z + (R() - 0.5) * 0.4, { ry: R() * 3 }); add(ctx, cyl(0.42, 0.42, 0.9, 10), s, x + 1.2, 0.42, z - 0.5, { rz: Math.PI / 2, ry: R() * 3 }); solid(ctx, x + 0.75, z - 0.95, x + 1.65, z - 0.05, 0.9); }
  else { add(ctx, box(1.1, 0.35, 1.1), W4.verd(), x, 0.4 + h + 0.17, z); add(ctx, box(1.3, 0.25, 1.3), s, x, 0.4 + h + 0.47, z); }
  solidCircle(ctx, x, z, 0.55, h);
}
// A ruined wall along a slab's edge from (x0,z0) to (x1,z1) (axis-aligned), its top broken in steps, with
// lancet windows that still glow the colour of the deep (o.lancets); solid along its length.
export function ruin(ctx, x0, z0, x1, z1, h = 3.4, o = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? x1 - x0 : z1 - z0; const R = T.rng(Math.round(x0 * 17 + z0 * 11)); const s = W4.drown('#56665f');
  const n = Math.max(1, Math.round(len / 1.5)); const step = len / n;
  for (let i = 0; i < n; i++) {
    const hh = h * (0.45 + R() * 0.55) * (o.low ? 0.5 : 1); const c = (alongX ? x0 : z0) + (i + 0.5) * step;
    add(ctx, alongX ? box(step + 0.02, hh, 0.6) : box(0.6, hh, step + 0.02), s, alongX ? c : x0, hh / 2, alongX ? z0 : c);
    if (o.lancets && i % 2 === 1 && hh > 2.2) { const lm = glowM(0x4ab8b0, 0.9); add(ctx, alongX ? box(0.5, 1.4, 0.64) : box(0.64, 1.4, 0.5), lm, alongX ? c : x0, 1.5, alongX ? z0 : c, { cast: false }); add(ctx, alongX ? box(0.06, 1.4, 0.66) : box(0.66, 1.4, 0.06), M.flat(0x1a2a28), alongX ? c : x0, 1.5, alongX ? z0 : c, { cast: false }); }
    if (R() < 0.4) add(ctx, alongX ? box(0.06, hh * 0.6, 0.66) : box(0.66, hh * 0.6, 0.06), weedM(), alongX ? c + (R() - 0.5) * step * 0.6 : x0, hh * 0.65, alongX ? z0 : c + (R() - 0.5) * step * 0.6, { cast: false });
  }
  if (alongX) solid(ctx, x0, z0 - 0.3, x1, z0 + 0.3, h); else solid(ctx, x0 - 0.3, z0, x0 + 0.3, z1, h);
}
// The stump of an arch: two piers and the start of the curve, broken off at the crown (decor at a slab edge).
export function archStump(ctx, x, z, w = 4, ry = 0, h = 4.4) {
  const s = stoneM(); const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  for (const sx of [-1, 1]) { P(box(0.8, h, 0.8), s, sx * w / 2, h / 2, 0); for (let k = 0; k < 3; k++) { const a = (k + 1) * 0.3; P(box(0.7, 0.5, 0.75), s, sx * (w / 2 - Math.sin(a) * w * 0.3), h + Math.cos(a) * 0.4 + k * 0.32, 0, { rz: sx * a }); } }
  for (const sx of [-1, 1]) { const c = Math.cos(ry), sn = Math.sin(ry); solidCircle(ctx, x + sx * w / 2 * c, z - sx * w / 2 * sn, 0.5, h); }
}

// ---------------------------------------------------------------- pews, the organ, the stalls
// A row of pews (old timber gone black and green), some tipped over: from (x, z) along +x for len metres, n
// rows going back along +z * dir; each row is low-solid.
export function pews(ctx, x, z, len, n = 3, dir = 1, o = {}) {
  const wood = W3.rotwood('#3a3a2c'); const R = T.rng(Math.round(x * 7 + z * 13));
  for (let i = 0; i < n; i++) {
    const zz = z + i * 1.5 * dir; const tip = R() < (o.tip ?? 0.3); const ry = (R() - 0.5) * 0.12;
    if (tip) { add(ctx, box(len, 0.12, 0.9), wood, x + len / 2, 0.08, zz, { ry, rz: 0.08 }); add(ctx, box(len * 0.9, 0.7, 0.12), wood, x + len / 2, 0.15, zz + 0.5 * dir, { ry, rx: 1.4 }); }
    else { add(ctx, box(len, 0.1, 0.5), wood, x + len / 2, 0.45, zz, { ry }); add(ctx, box(len, 0.8, 0.1), wood, x + len / 2, 0.75, zz + 0.3 * dir, { ry }); for (const e of [0.1, len - 0.1]) add(ctx, box(0.1, 0.9, 0.6), wood, x + e, 0.45, zz + 0.05 * dir, { ry }); }
    if (R() < 0.5) add(ctx, box(0.6, 0.06, 0.5), weedM(), x + R() * len, tip ? 0.16 : 0.52, zz, { cast: false });
    solid(ctx, x, zz - 0.4, x + len, zz + 0.45, 0.9); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]);
  }
}
// The organ: a wall of bronze pipes gone green, tall in the middle, a carved case, the keys glowing faintly
// (the drowned still play it: o.light). Along x from (x, z) for w metres, the front toward +z (o.face -1: -z).
export function organ(ctx, x, z, w = 8, o = {}) {
  const f = o.face ?? 1; const v = verdM(), b = bronzeM(); const caseM = W3.rotwood('#2e2a22'); const n = Math.round(w / 0.42);
  add(ctx, box(w + 0.4, 1.2, 1.4), caseM, x + w / 2, 0.6, z - 0.4 * f);
  add(ctx, box(w * 0.5, 0.12, 0.5), caseM, x + w / 2, 1.0, z + 0.4 * f);
  add(ctx, box(w * 0.46, 0.06, 0.3), glowM(0x9ae8d8, 1.2), x + w / 2, 1.08, z + 0.42 * f, { cast: false });
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n; const hh = 2.4 + Math.sin(u * Math.PI) * 5 + (i % 2) * 0.6; const r = 0.15 + Math.sin(u * Math.PI) * 0.05; const xx = x + u * w;
    add(ctx, cyl(r, r, hh, 8), v, xx, 1.2 + hh / 2, z - 0.6 * f); add(ctx, cyl(r + 0.03, r + 0.03, 0.08, 8), b, xx, 1.2 + hh, z - 0.6 * f);
    add(ctx, box(r * 1.4, 0.12, 0.05), M.flat(0x0a1210), xx, 1.2 + hh * 0.2, z - 0.6 * f + r * f, { cast: false }); }
  for (let i = 0; i < 3; i++) add(ctx, box(w * (0.9 - i * 0.2), 0.3, 0.2), caseM, x + w / 2, 3.4 + i * 1.9, z - 0.95 * f);
  solid(ctx, x - 0.2, z - 1.2 * (f > 0 ? 1 : 0) - (f > 0 ? 0 : -0.3), x + w + 0.2, z + (f > 0 ? 0.3 : 1.2), 4);
  if (o.light !== false) ctx.lights.push({ x: x + w / 2, y: 1.6, z: z + 0.8 * f, color: 0x80e0c8, intensity: 3.2, dist: 7, flicker: 0.12 });
  motes(ctx, [[x, z - 0.8, x + w, z - 0.4]], 30, { vy: 0.9, h: 9, y0: 1.5, color: 0xc8f0e8, opacity: 0.7, seed: Math.round(x * 3 + z) });
}
// Choir stalls with the drowned choristers still standing in them: tiers of dark timber along a line, and in
// each place a robed figure of bone, skull up, its jaw open (singing). face: which way they look.
export function stalls(ctx, x0, z0, x1, z1, face = '+x', tiers = 2) {
  const alongX = face === '+z' || face === '-z'; const len = alongX ? x1 - x0 : z1 - z0; const sg = face[0] === '+' ? 1 : -1; const R = T.rng(Math.round(x0 * 5 + z0 * 9));
  const base = alongX ? z0 : x0; const step = 0.9; const wood = W3.rotwood('#2e2a22'); const rb = robeM(), bn = boneM();
  const ry = face === '+x' ? Math.PI / 2 : face === '-x' ? -Math.PI / 2 : face === '+z' ? 0 : Math.PI;
  for (let k = 0; k < tiers; k++) {
    const off = base - sg * (k * step + step / 2), h = 0.3 + k * 0.4;
    add(ctx, alongX ? box(len, h, step) : box(step, h, len), wood, alongX ? (x0 + x1) / 2 : off, h / 2, alongX ? off : (z0 + z1) / 2);
    const n = Math.floor(len / 0.8);
    for (let i = 0; i < n; i++) {
      if (R() < 0.2) continue; const t = (alongX ? x0 : z0) + (i + 0.5) * len / n; const sx = alongX ? t : off, sz = alongX ? off : t; const lean = (R() - 0.5) * 0.25;
      put(ctx, '!ch-robe', rb, sx, h + 0.55, sz, 0.42, 1.1, 0.34, ry, 0, lean);
      put(ctx, '!ch-skull', bn, sx + (alongX ? 0 : sg * 0.03), h + 1.28, sz + (alongX ? sg * 0.03 : 0), 0.24, 0.26, 0.24, ry, -0.35, lean);
      put(ctx, 'ch-jaw', glowM(0x0a1a18, 1), sx + (alongX ? 0 : sg * 0.13), h + 1.2, sz + (alongX ? sg * 0.13 : 0), 0.12, 0.1, 0.04, ry);
    }
  }
  const d = tiers * step; if (alongX) solid(ctx, x0, sg > 0 ? z0 - d : z0, x1, sg > 0 ? z0 : z0 + d, 2); else solid(ctx, sg > 0 ? x0 - d : x0, z0, sg > 0 ? x0 : x0 + d, z1, 2);
}

// ---------------------------------------------------------------- glass, bells, the font, the altar
// The rose window, fallen and lying flat on the floor, still lit from within: twelve petals of coloured glass
// in lead round a golden heart. Walkable (a decal), with a pool of its light.
const roseTex = () => pix('ch-rose', 64, 64, (g, W, H) => {
  const C = ['#3a7ae0', '#e04a5a', '#e8c050', '#3ac0a0', '#9a5ae0', '#e07a3a'];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - W / 2, dy = y + 0.5 - H / 2; const r = Math.hypot(dx, dy) / (W / 2); const a = Math.atan2(dy, dx); if (r > 1) continue;
    let c; if (r > 0.94) c = '#1a1a22'; else if (r < 0.2) c = r > 0.17 ? '#1a1a22' : '#ffe8a0';
    else { const pet = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12); const lead = Math.abs(((a + Math.PI) / (Math.PI * 2)) * 12 - pet - 0.5) > 0.44 || Math.abs(r - 0.56) < 0.03; c = lead ? '#1a1a22' : C[(pet + (r > 0.56 ? 3 : 0)) % C.length]; }
    g.fillStyle = c; g.fillRect(x, y, 1, 1);
  }
});
export function rose(ctx, x, z, r = 3) {
  decal(ctx, x, z, r * 2, roseTex(), 0xffffff, { k: 0.85, pulse: 0.5 });
  floorGlow(ctx, x, z, r * 3, r * 3, 0x8ab8ff, 0.22);
  add(ctx, geo('ch-rosering' + r, () => new THREE.RingGeometry(r * 0.98, r * 1.08, 40).rotateX(-Math.PI / 2)), W4.verd(), x, 0.03, z, { cast: false });
  ctx.lights.push({ x, y: 1.2, z, color: 0x8ab0ff, intensity: 3, dist: r * 2.6, flicker: 0.04 });
}
// A drowned bell hanging on a chain from the dark above, swaying in the current, trailing bubbles; o.ring:
// it tolls now and then (a faint glow at its lip).
export function hangBell(ctx, x, y, z, s = 1, o = {}) {
  const pv = new THREE.Group(); pv.position.set(x, y + 8, z); ctx.group.add(pv);
  const ch = new THREE.Mesh(box(0.06, 8 - s * 1.1, 0.06), M.flat(0x2a3a36)); ch.position.y = -(8 - s * 1.1) / 2; pv.add(ch);
  const bell = new THREE.Mesh(geo('ch-bell', () => new THREE.CylinderGeometry(0.3, 0.62, 1.1, 10, 1, true)), verdDS()); bell.scale.setScalar(s); bell.position.y = -8 + s * 0.55; bell.castShadow = true; pv.add(bell);
  const top = new THREE.Mesh(geo('ch-belltop', () => new THREE.SphereGeometry(0.3, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2)), verdM()); top.scale.setScalar(s); top.position.y = -8 + s * 1.1; pv.add(top);
  const lip = new THREE.Mesh(geo('ch-bell-lip', () => new THREE.TorusGeometry(0.62, 0.04, 4, 16).rotateX(Math.PI / 2)), glowM(0x9ae8d8, 1.4)); lip.scale.setScalar(s); lip.position.y = -8; pv.add(lip); lip.visible = false;
  motes(ctx, [[x - 0.3, z - 0.3, x + 0.3, z + 0.3]], 8, { vy: 1.1, h: 6, y0: y + s, color: 0xd0f0e8, sway: 0.1, seed: Math.round(x * 13 + z) });
  let t = Math.random() * 9; const ring = o.ring; let flash = 0;
  ctx.anims.push({ update(dt) { t += dt; pv.rotation.z = Math.round(Math.sin(t * 0.6) * 0.05 * 128) / 128; pv.rotation.x = Math.round(Math.sin(t * 0.43) * 0.04 * 128) / 128; if (ring) { if (Math.sin(t * 0.5) > 0.995 && flash <= 0) flash = 1.2; flash -= dt; lip.visible = flash > 0 && Math.floor(flash * 10) % 2 === 0; } return false; } });
}
// The font: a wide basin of pale stone on a stem, brim-full of light that rises in a slow column of bubbles.
export function font(ctx, x, z, o = {}) {
  const s = W3.marble('#a8b4ae');
  add(ctx, cyl(0.5, 0.7, 0.4, 10), s, x, 0.2, z); add(ctx, cyl(0.28, 0.36, 0.8, 8), s, x, 0.8, z); add(ctx, cyl(1.3, 0.6, 0.5, 14), s, x, 1.45, z);
  add(ctx, geo('ch-fontw', () => new THREE.CircleGeometry(1.15, 18).rotateX(-Math.PI / 2)), glowM(0xa0f0e0, 1.6), x, 1.69, z, { cast: false });
  floorGlow(ctx, x, z, 6, 6, 0x80e0c8, 0.3);
  motes(ctx, [[x - 0.8, z - 0.8, x + 0.8, z + 0.8]], 26, { vy: 0.8, h: 9, y0: 1.7, color: 0xe0fff8, add: true, k: 1.6, sway: 0.15, seed: 4410 + Math.round(x) });
  ctx.lights.push({ x, y: 2.2, z, color: 0x9af0e0, intensity: o.light ?? 5, dist: 9, flicker: 0.06 });
  solidCircle(ctx, x, z, 1.3, 1.6);
}
// The altar of the drowned: steps, a slab, a great bell lying on its side behind it, half sunk in the floor,
// cracked, with light in the crack; candles of cold blue flame.
export function altar(ctx, x, z, ry = 0) {
  const s = W3.marble('#9aa8a2'); const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(5, 0.25, 3), s, 0, 0.12, 0); P(box(4.2, 0.25, 2.4), s, 0, 0.37, -0.1); P(box(3, 0.9, 1.2), W4.drown('#7a8a84'), 0, 0.95, -0.3); P(box(3.2, 0.12, 1.4), W4.verd(), 0, 1.45, -0.3, { cast: false });
  const bell = P(geo('ch-bigbell', () => new THREE.CylinderGeometry(1.4, 2.6, 3.6, 16, 1, true)), verdDS(), 0, 2.2, -3.4, { rz: 1.25, rx: 0.1 }); void bell;
  P(box(0.12, 2.4, 0.3), glowM(0x9af0e0, 1.5), 0.2, 2.6, -2.2, { rz: 0.3, cast: false });
  for (const sx of [-1.2, 1.2]) { P(cyl(0.06, 0.06, 0.4, 5), boneM(), sx, 1.7, -0.3); P(box(0.1, 0.18, 0.1), glowM(0x80c8ff, 2.2), sx, 2.0, -0.3, { cast: false }); }
  const c = Math.cos(ry), sn = Math.sin(ry); const bx = x + -3.4 * sn, bz = z + -3.4 * c;
  ctx.lights.push({ x: x + 0.6 * sn, y: 2.2, z: z + 0.6 * c, color: 0x80c8ff, intensity: 3.6, dist: 7, flicker: 0.1 });
  solidCircle(ctx, x, z - 0.3 * c, 1.8, 1.5); solidCircle(ctx, bx, bz, 2.2, 3);
}
// Kelp: strands that rise from cracks in the floor and sway in the current (o.h tall).
export function kelp(ctx, x, z, n = 4, o = {}) {
  const R = T.rng(Math.round(x * 31 + z * 7)); const strands = []; const m = weedM();
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(); g.position.set(x + (R() - 0.5) * 0.8, 0, z + (R() - 0.5) * 0.8); ctx.group.add(g); const segs = []; let parent = g; const h = (o.h ?? 2.6) * (0.6 + R() * 0.6); const k = 5;
    for (let j = 0; j < k; j++) { const s = new THREE.Group(); s.position.y = j ? h / k : 0; parent.add(s); const b = new THREE.Mesh(box(0.12 - j * 0.015, h / k, 0.05), m); b.position.y = h / k / 2; s.add(b); if (j % 2) { const leaf = new THREE.Mesh(box(0.22, 0.1, 0.03), m); leaf.position.set(0.1, h / k * 0.6, 0); leaf.rotation.z = -0.5; s.add(leaf); } segs.push(s); parent = s; }
    strands.push({ segs, ph: R() * 9 });
  }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const s of strands) s.segs.forEach((q, j) => { q.rotation.z = Math.round(Math.sin(t * 0.9 + s.ph - j * 0.5) * 0.12 * 32) / 32; q.rotation.x = Math.round(Math.sin(t * 0.7 + s.ph * 2 - j * 0.4) * 0.08 * 32) / 32; }); return false; } });
}
// Coral of bronze and pale lime: a branching cluster with glowing tips (low-solid).
export function coral(ctx, x, z, s = 1) {
  const R = T.rng(Math.round(x * 19 + z * 23)); const v = verdM(); const tip = glowM(0xb8f0a0, 1.3);
  for (let i = 0; i < 6; i++) { const a = R() * 6.3, l = (0.5 + R() * 0.7) * s; const ex = x + Math.cos(a) * 0.3 * s, ez = z + Math.sin(a) * 0.3 * s; bar(ctx, 'ch-coral', v, [x, 0, z], [ex + Math.cos(a) * 0.2, l, ez + Math.sin(a) * 0.2], 0.1 * s); put(ctx, 'ch-ctip', tip, ex + Math.cos(a) * 0.2, l, ez + Math.sin(a) * 0.2, 0.12 * s, 0.12 * s, 0.12 * s); }
  solidCircle(ctx, x, z, 0.45 * s, 0.8);
}
// A drowned lamp: a globe of thick glass on a bronze post, holding a little trapped light.
export function drownLamp(ctx, x, z, o = {}) {
  add(ctx, cyl(0.06, 0.09, 1.6, 6), bronzeM(), x, 0.8, z); add(ctx, geo('ch-globe', () => new THREE.SphereGeometry(0.22, 8, 6)), glowM(o.color ?? 0x9af0e0, 1.4), x, 1.75, z, { cast: false });
  glowSprite(ctx, x, 1.75, z, 1.6, o.color ?? 0x9af0e0, 0.45);
  ctx.lights.push({ x, y: 1.8, z, color: o.color ?? 0x9af0e0, intensity: o.intensity ?? 3.2, dist: o.dist ?? 6.5, flicker: 0.08 });
  solidCircle(ctx, x, z, 0.25, 1.8);
}
