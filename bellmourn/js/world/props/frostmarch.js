// Props for Act II, region I: the Frostmarch. Snow-capped crags on the far sides, firs in the drifts,
// the frozen river with its waterfall turned to ice, the drowned bell-tower of an old border chapel locked
// in ice, standing stones round the giant's cirque under the glacier, icicles everywhere water ran.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { W2, once, part, put, boulder, mound, pine, snag, q16, flame, floorGlow } from '../kit2.js';

export const SNOW = '#c4cede', SNOW2 = '#b6c2d4', PATH = '#a4b0c2', ROCK = '#4a5262';
const snowCap = () => M.flat(0xd2dcea);
const iceM = () => once('fm-ice', () => cutout(new THREE.MeshPhongMaterial({ color: 0x86b8dc, emissive: 0x16304a, specular: 0xe8f6ff, shininess: 90, flatShading: true, transparent: true, opacity: 0.88 })));
const iceHi = () => once('fm-icehi', () => cutout(new THREE.MeshPhongMaterial({ color: 0xcfe8f8, emissive: 0x23455e, specular: 0xffffff, shininess: 120, flatShading: true })));

// ---------------------------------------------------------------- crags and rocks
// A crag along a far side: a solid rock core whose face is broken by leaning slabs and boulders, snow
// lying on the top and on every ledge. face: '+x' or '+z' (the side toward the walk and the camera).
export function crag(ctx, x0, z0, x1, z1, h, o = {}) {
  const R = T.rng(Math.round(x0 * 31 + z0 * 17 + h)); const rock = W2.crag(o.tone || ROCK), dark = W2.crag('#3a404c');
  const w = x1 - x0, d = z1 - z0; add(ctx, box(w, h, d), rock, x0 + w / 2, h / 2, z0 + d / 2);
  add(ctx, box(w + 0.1, 0.35, d + 0.1), W2.snow(SNOW2), x0 + w / 2, h + 0.12, z0 + d / 2);
  solid(ctx, x0, z0, x1, z1, h);
  const face = o.face || '+x'; const alongZ = face === '+x'; const len = alongZ ? d : w; const n = Math.max(2, Math.round(len / 1.6));
  for (let i = 0; i < n; i++) {
    const p = (alongZ ? z0 : x0) + (i + 0.5) * len / n + (R() - 0.5) * 0.6; const sh = h * (0.45 + R() * 0.55), sw = 1 + R() * 1.1, sd = 0.7 + R() * 0.6;
    const cx = alongZ ? x1 + sd * 0.3 : p, cz = alongZ ? p : z1 + sd * 0.3;
    const m = add(ctx, box(alongZ ? sd : sw, sh, alongZ ? sw : sd), R() < 0.5 ? rock : dark, cx, sh / 2 - 0.1, cz, { ry: (R() - 0.5) * 0.4, rz: alongZ ? (R() - 0.5) * 0.12 : 0, rx: alongZ ? 0 : (R() - 0.5) * 0.12 });
    add(ctx, box(alongZ ? sd + 0.08 : sw + 0.08, 0.16, alongZ ? sw + 0.08 : sd + 0.08), snowCap(), cx, sh - 0.04, cz, { ry: m.rotation.y });
    if (R() < 0.55) boulder(ctx, cx + (alongZ ? sd * 0.6 : (R() - 0.5)), cz + (alongZ ? (R() - 0.5) : sd * 0.6), 0.7 + R() * 0.6, R() < 0.5 ? rock : dark, { solid: false });
  }
  if (o.solidFace !== false) { if (alongZ) solid(ctx, x1, z0, x1 + 0.6, z1, h * 0.5); else solid(ctx, x0, z1, x1, z1 + 0.6, h * 0.5); }
}
// a snowy boulder: the rock and a cap of snow on its top
export function rock(ctx, x, z, s = 1, o = {}) {
  const m = boulder(ctx, x, z, s, W2.crag(o.tone || ROCK), o);
  const cap = add(ctx, geo('fm-cap', () => new THREE.SphereGeometry(0.5, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2)), W2.snow(SNOW), x, m.position.y + m.scale.y * 0.22, z, { ry: m.rotation.y });
  cap.scale.set(m.scale.x * 0.85, m.scale.y * 0.42, m.scale.z * 0.85);
  return m;
}
export const drift = (ctx, x, z, w, d, h, o = {}) => mound(ctx, x, z, w, d, h, W2.snow(o.tone || SNOW), o);

// Icicles hanging in a row from y along a span (instanced): thin glassy spikes of uneven length.
export function icicles(ctx, x0, z0, x1, z1, y, o = {}) {
  const n = o.n || Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.18); const R = T.rng(Math.round(x0 * 7 + z0 * 11 + y * 13));
  for (let i = 0; i < n; i++) { const t = (i + R() * 0.6) / n, L = (o.len || 0.6) * (0.3 + R() * R() * 1.4); inst(ctx, 'fm-icicle', cone(0.045, 1, 4), iceHi(), mat4(x0 + (x1 - x0) * t, y - L / 2, z0 + (z1 - z0) * t, R() * 3, Math.PI, 0, 1).multiply(new THREE.Matrix4().makeScale(1, L, 1))); }
}

// ---------------------------------------------------------------- the frozen river
// The ice sheet across the way (walkable), open black water in holes (solid), heaped snow on the banks.
export function river(ctx, x0, z0, x1, z1, holes = []) {
  add(ctx, box(x1 - x0, 0.4, z1 - z0), W2.ice('#6a92b2'), (x0 + x1) / 2, -0.21, (z0 + z1) / 2, { cast: false });
  const wm = once('fm-water', () => new THREE.MeshPhongMaterial({ color: 0x050a10, specular: 0x6a88a8, shininess: 100 }));
  for (const [hx, hz, hw, hd] of holes) {
    const m = new THREE.Mesh(geo('fm-hole', () => new THREE.CircleGeometry(0.5, 9)), wm); m.rotation.x = -Math.PI / 2; m.scale.set(hw, hd, 1); m.position.set(hx, 0.006, hz); ctx.group.add(m);
    const rim = new THREE.Mesh(geo('fm-rim', () => new THREE.RingGeometry(0.46, 0.56, 9)), iceHi()); rim.rotation.x = -Math.PI / 2; rim.scale.set(hw, hd, 1); rim.position.set(hx, 0.012, hz); ctx.group.add(rim);
    solid(ctx, hx - hw * 0.42, hz - hd * 0.42, hx + hw * 0.42, hz + hd * 0.42, 1); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]);
  }
  // reeds frozen at the edges
  const R = T.rng(Math.round(x0 * 3 + z0 * 5)); const reed = M.flat(0x6a6448);
  for (const zz of [z0 + 0.15, z1 - 0.15]) for (let x = x0; x < x1; x += 0.25 + R() * 0.6) if (R() < 0.45) inst(ctx, 'fm-reed', box(0.03, 0.5, 0.03), reed, mat4(x, 0.22 + R() * 0.1, zz + (R() - 0.5) * 0.3, 0, (R() - 0.5) * 0.4, (R() - 0.5) * 0.4));
}
// A waterfall frozen down a crag face toward +x: hanging columns of ice, a heap of ice where it struck.
export function frozenFall(ctx, x, z, h, w = 2.6) {
  const R = T.rng(Math.round(x * 13 + z * 7)); const n = Math.round(w / 0.32);
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * w / n, hh = h * (0.7 + R() * 0.3), r = 0.18 + R() * 0.16;
    add(ctx, cyl(r * 0.7, r, hh, 6), R() < 0.4 ? iceHi() : iceM(), x + 0.1 + R() * 0.25, h - hh / 2, z + u, { rz: (R() - 0.5) * 0.08 });
    inst(ctx, 'fm-icicle', cone(0.045, 1, 4), iceHi(), mat4(x + 0.35, h - hh - 0.25, z + u, 0, Math.PI, 0, 1).multiply(new THREE.Matrix4().makeScale(2.4, 0.6, 2.4)));
  }
  for (let i = 0; i < 7; i++) add(ctx, cone(0.35 + R() * 0.3, 0.6 + R() * 0.8, 5), iceM(), x + 0.6 + R() * 1.2, 0.2, z + (R() - 0.5) * w, { rz: (R() - 0.5) * 0.5, rx: (R() - 0.5) * 0.5 });
  ctx.lights.push({ x: x + 1.4, y: 2.4, z, color: 0x8ec8ff, intensity: 2.2, dist: 6 });
}

// ---------------------------------------------------------------- the bell-tower in the ice
// The border chapel's bell-tower (front toward +x): rough stone, buttressed corners, an open belfry with the
// bell frozen mid-swing in a sheath of ice, a snow-loaded pyramid roof, icicles on every ledge, ice
// climbing the south face. A dark door at its foot.
export function bellTower(ctx, x, z, o = {}) {
  const st = W2.cat('#5a5e68'), hi = W2.cat('#6e727c'), wood = M.wood('#3a2a20'); const w = o.w || 4.2, H = o.h || 8.4;
  add(ctx, box(w, H, w), st, x, H / 2, z); add(ctx, box(w + 0.3, 0.6, w + 0.3), hi, x, 0.3, z);
  solid(ctx, x - w / 2 - 0.15, z - w / 2 - 0.15, x + w / 2 + 0.15, z + w / 2 + 0.15, H);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1]]) { add(ctx, box(0.7, H * 0.7, 0.7), hi, x + sx * (w / 2 + 0.1), H * 0.35, z + sz * (w / 2 + 0.1)); add(ctx, box(0.76, 0.18, 0.76), snowCap(), x + sx * (w / 2 + 0.1), H * 0.7 + 0.08, z + sz * (w / 2 + 0.1)); }
  // string courses with snow on them
  for (const y of [3.2, H - 2.6]) { add(ctx, box(w + 0.24, 0.2, w + 0.24), hi, x, y, z); add(ctx, box(w + 0.26, 0.08, w + 0.26), snowCap(), x, y + 0.13, z); icicles(ctx, x + w / 2 + 0.13, z - w / 2, x + w / 2 + 0.13, z + w / 2, y - 0.1, { len: 0.5 }); icicles(ctx, x - w / 2, z + w / 2 + 0.13, x + w / 2, z + w / 2 + 0.13, y - 0.1, { len: 0.5 }); }
  // the belfry: dark openings on the two faces we see, the bell inside, its ice
  const by = H - 1.3;
  for (const f of ['+x', '+z']) {
    const ox = f === '+x' ? x + w / 2 + 0.01 : x, oz = f === '+z' ? z + w / 2 + 0.01 : z;
    add(ctx, plane(1.5, 2.0), M.flat(0x07090c), ox, by, oz, { ry: f === '+x' ? Math.PI / 2 : 0, cast: false });
    add(ctx, plane(0.2, 2.0), hi, ox + (f === '+x' ? 0.01 : 0), by, oz + (f === '+z' ? 0.01 : 0), { ry: f === '+x' ? Math.PI / 2 : 0, cast: false });
  }
  const bronze = once('fm-bronze', () => cutout(new THREE.MeshPhongMaterial({ color: 0x4a4436, specular: 0x8ab0c8, shininess: 50 })));
  const bell = add(ctx, cyl(0.42, 0.78, 1.1, 10), bronze, x + 1.25, by - 0.25, z + 1.25, { rz: -0.35, rx: 0.2 });
  add(ctx, cyl(0.8, 0.82, 0.12, 10), bronze, x + 1.42, by - 0.8, z + 1.38, { rz: -0.35, rx: 0.2 });
  add(ctx, cyl(0.88, 0.95, 1.35, 7), iceM(), x + 1.3, by - 0.35, z + 1.3, { rz: -0.35, rx: 0.2 });
  add(ctx, box(w * 0.9, 0.2, 0.2), wood, x, by + 0.8, z + 1.25);
  // the roof, its snow, the cross
  add(ctx, box(w + 0.5, 0.3, w + 0.5), hi, x, H + 0.15, z);
  add(ctx, cone(w * 0.8, 3.0, 4), M.slate('#262c38'), x, H + 1.8, z, { ry: Math.PI / 4 });
  add(ctx, cone(w * 0.64, 2.3, 4), snowCap(), x, H + 1.75, z, { ry: Math.PI / 4 + 0.001 });
  add(ctx, box(0.1, 1, 0.1), M.ironLit(), x, H + 3.6, z); add(ctx, box(0.5, 0.1, 0.1), M.ironLit(), x, H + 3.75, z);
  icicles(ctx, x + w / 2 + 0.25, z - w / 2, x + w / 2 + 0.25, z + w / 2, H, { len: 0.9 }); icicles(ctx, x - w / 2, z + w / 2 + 0.25, x + w / 2, z + w / 2 + 0.25, H, { len: 0.9 });
  // ice climbing the +z face, the door
  const R = T.rng(77);
  for (let i = 0; i < 9; i++) add(ctx, box(0.5 + R() * 0.8, 1.2 + R() * 3.2, 0.4), R() < 0.4 ? iceHi() : iceM(), x - w / 2 + 0.4 + R() * (w - 0.8), 0.6 + R() * 1.6, z + w / 2 + 0.15, { rz: (R() - 0.5) * 0.3 });
  add(ctx, plane(1.1, 2.1), M.decal(T.door('#2a2018')), x + w / 2 + 0.02, 1.05, z - 0.6, { ry: Math.PI / 2, cast: false });
  add(ctx, box(0.36, 0.22, 1.5), hi, x + w / 2 + 0.12, 2.2, z - 0.6);
  // the bell rope down the outside, stiff with frost
  add(ctx, cyl(0.025, 0.025, by - 1.4, 4), M.flat(0x8a8a90), x + w / 2 + 0.3, (by - 1.4) / 2 + 0.6, z + 1.25);
}

// ---------------------------------------------------------------- the old border post and its yard
// A low dry-stone wall with snow along its top (h ~0.8): the yard's near sides.
export function lowWall(ctx, x0, z0, x1, z1, h = 0.8) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const st = W2.cat('#5a5e66');
  add(ctx, box(alongX ? len : 0.6, h, alongX ? 0.6 : len), st, cx, h / 2, cz); add(ctx, box(alongX ? len + 0.1 : 0.7, 0.16, alongX ? 0.7 : len + 0.1), snowCap(), cx, h + 0.06, cz);
  solid(ctx, cx - (alongX ? len / 2 : 0.3), cz - (alongX ? 0.3 : len / 2), cx + (alongX ? len / 2 : 0.3), cz + (alongX ? 0.3 : len / 2), 1.1);
}
// A gravestone with a cap of snow, leaning a little.
export function grave(ctx, x, z, ry = 0) {
  const R = T.rng(Math.round(x * 11 + z * 19)); const lean = (R() - 0.5) * 0.3;
  part(ctx, box(0.5, 0.75, 0.14), W2.cat('#626670'), x, z, ry, 0, 0.32, 0, { rx: lean });
  part(ctx, box(0.52, 0.08, 0.18), snowCap(), x, z, ry, 0, 0.71, lean * 0.3, { rx: lean });
  solidCircle(ctx, x, z, 0.3, 1);
}
// A standing stone, taller than a man, snow on its crown and frost runes that glimmer.
export function standingStone(ctx, x, z, h = 3, ry = 0) {
  const R = T.rng(Math.round(x * 23 + z * 41)); const w = 0.9 + R() * 0.4;
  const m = add(ctx, box(w, h, 0.6), W2.crag('#565e6c'), x, h / 2 - 0.1, z, { ry, rz: (R() - 0.5) * 0.1 });
  add(ctx, box(w + 0.06, 0.18, 0.66), snowCap(), x, h - 0.08, z, { ry, rz: m.rotation.z });
  const rune = M.glow('#8ad8ff', 1.4);
  for (let k = 0; k < 3; k++) part(ctx, box(0.08, 0.22, 0.02), rune, x, z, ry, (k - 1) * 0.22, h * 0.55 + (k % 2) * 0.12, 0.31);
  solidCircle(ctx, x, z, Math.max(w, 0.6) * 0.55, h);
}
// The bones of an older giant: ribs arching out of the snow (a half-torus each) and a spine ridge.
export function giantRibs(ctx, x, z, n = 4, ry = 0) {
  const bone = M.flat(0xb4ae9c);
  for (let i = 0; i < n; i++) {
    const s = 2.2 - Math.abs(i - (n - 1) / 2) * 0.35; const r = new THREE.Mesh(geo('fm-rib', () => new THREE.TorusGeometry(1, 0.11, 4, 10, Math.PI)), bone);
    const lz = (i - (n - 1) / 2) * 0.9; r.position.set(x + Math.sin(ry) * lz, -0.15, z + Math.cos(ry) * lz); r.rotation.y = ry + Math.PI / 2; r.rotation.z = 0.15; r.scale.set(s, s * 1.1, s); r.castShadow = true; r.userData.static = true; ctx.group.add(r);
  }
  for (let i = 0; i < n * 2; i++) { const lz = (i / (n * 2 - 1) - 0.5) * n * 0.9; add(ctx, box(0.34, 0.26, 0.34), bone, x + Math.sin(ry) * lz, 0.05, z + Math.cos(ry) * lz, { ry: ry + i * 0.3 }); }
}
// A skull as big as a cart, half sunk in snow, facing ry.
export function giantSkull(ctx, x, z, ry = 0) {
  const bone = M.flat(0xbab4a2), dark = M.flat(0x0a0c10);
  const sk = add(ctx, geo('fm-skull', () => new THREE.SphereGeometry(1, 8, 6)), bone, x, 0.5, z, { ry }); sk.scale.set(1.3, 1.0, 1.5);
  part(ctx, box(1.6, 0.7, 1.1), bone, x, z, ry, 0, 0.1, 1.1);
  for (const s of [-1, 1]) part(ctx, box(0.42, 0.32, 0.05), dark, x, z, ry, s * 0.48, 0.72, 1.48, { rx: -0.3 });
  part(ctx, box(0.3, 0.2, 0.05), dark, x, z, ry, 0, 0.32, 1.66);
  drift(ctx, x - Math.sin(ry) * 0.8, z - Math.cos(ry) * 0.8, 2.6, 2.2, 0.6, { solid: false });
  solidCircle(ctx, x, z, 1.4, 1.6);
}
// The glacier along a far side: a wall of blue ice in faceted blocks, crevasses, snow on top, icicles.
export function glacier(ctx, x0, z0, x1, z1, h, face = '+z') {
  const R = T.rng(Math.round(x0 * 5 + z0 * 9)); const w = x1 - x0, d = z1 - z0;
  const body = once('fm-glacier', () => cutout(new THREE.MeshPhongMaterial({ color: 0x5a8cb4, emissive: 0x0c2032, specular: 0xb8dcf8, shininess: 60, flatShading: true })));
  add(ctx, box(w, h, d), body, x0 + w / 2, h / 2, z0 + d / 2); add(ctx, box(w + 0.2, 0.5, d + 0.2), W2.snow(SNOW2), x0 + w / 2, h + 0.2, z0 + d / 2);
  solid(ctx, x0, z0, x1, z1, h);
  const alongX = face === '+z'; const len = alongX ? w : d; const n = Math.round(len / 1.3);
  for (let i = 0; i < n; i++) {
    const p = (alongX ? x0 : z0) + (i + 0.5) * len / n; const bh = h * (0.5 + R() * 0.55), bw = 1.0 + R() * 0.9, bd = 0.5 + R() * 0.7;
    const cx = alongX ? p : x1 + bd * 0.4, cz = alongX ? z1 + bd * 0.4 : p;
    add(ctx, box(alongX ? bw : bd, bh, alongX ? bd : bw), R() < 0.3 ? iceHi() : body, cx, bh / 2, cz, { ry: (R() - 0.5) * 0.3 });
    add(ctx, box(alongX ? bw + 0.1 : bd + 0.1, 0.22, alongX ? bd + 0.1 : bw + 0.1), snowCap(), cx, bh, cz);
    if (R() < 0.35) add(ctx, plane(0.3, bh * 0.8), M.flat(0x08121c), alongX ? p + bw / 2 + 0.05 : x1 + bd * 0.9, bh * 0.45, alongX ? z1 + bd * 0.9 : p + bw / 2 + 0.05, { ry: alongX ? 0 : Math.PI / 2, cast: false });
    if (alongX) icicles(ctx, cx - bw / 2, cz + bd / 2 + 0.02, cx + bw / 2, cz + bd / 2 + 0.02, bh - 0.05, { len: 0.8 }); else icicles(ctx, cx + bd / 2 + 0.02, cz - bw / 2, cx + bd / 2 + 0.02, cz + bw / 2, bh - 0.05, { len: 0.8 });
  }
  if (alongX) solid(ctx, x0, z1, x1, z1 + 1, h * 0.5); else solid(ctx, x1, z0, x1 + 1, z1, h * 0.5);
}
// A warden's frontier lantern: a wooden post, a hooded iron lamp, frost on the cap (warm light in the cold).
export function postLantern(ctx, x, z, o = {}) {
  const wood = M.wood('#3e2c20'); add(ctx, box(0.16, 2.6, 0.16), wood, x, 1.3, z); add(ctx, box(0.6, 0.1, 0.1), wood, x + 0.25, 2.5, z);
  add(ctx, box(0.24, 0.32, 0.24), M.glow('#ffc46a', 2.6), x + 0.48, 2.2, z, { cast: false }); add(ctx, cone(0.24, 0.2, 4), M.ironLit(), x + 0.48, 2.46, z, { ry: Math.PI / 4 });
  add(ctx, cone(0.2, 0.08, 4), snowCap(), x + 0.48, 2.58, z, { ry: Math.PI / 4 });
  ctx.lights.push({ x: x + 0.48, y: 2.2, z, color: 0xffb45a, intensity: o.intensity || 5, dist: o.dist || 8, halo: true, flicker: 0.05 });
  solidCircle(ctx, x, z, 0.2, 2.6);
}
// A cart buried in a drift, its wheel standing out; a frozen pennant on a pole; a cold campfire ring.
export function buriedCart(ctx, x, z, ry = 0) {
  const w = M.wood('#4a3626');
  part(ctx, box(1.2, 0.1, 2.0), w, x, z, ry, 0, 0.55, 0, { rx: 0.18 }); part(ctx, box(0.06, 0.45, 2.0), w, x, z, ry, -0.6, 0.78, 0, { rx: 0.18 });
  const wh = part(ctx, cyl(0.45, 0.45, 0.08, 10), M.wood('#3e2c20'), x, z, ry, 0.68, 0.42, -0.4); wh.rotation.z = Math.PI / 2;
  drift(ctx, x + Math.sin(ry) * 0.6, z + Math.cos(ry) * 0.6, 2.2, 2.6, 0.8, { solid: false });
  solidCircle(ctx, x, z, 1.1, 1.2);
}
export function coldFire(ctx, x, z) {
  const R = T.rng(Math.round(x * 3 + z * 7)); const st = W2.crag('#4a5060');
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; boulder(ctx, x + Math.sin(a) * 0.6, z + Math.cos(a) * 0.6, 0.3, st, { solid: false }); }
  for (let i = 0; i < 4; i++) add(ctx, cyl(0.05, 0.06, 0.8, 4), M.flat(0x1a1614), x + (R() - 0.5) * 0.3, 0.1, z + (R() - 0.5) * 0.3, { rz: Math.PI / 2, ry: R() * 3 });
  solidCircle(ctx, x, z, 0.8, 0.5);
}
export function pennant(ctx, x, z, h = 3.2, color = 0x5a1418) {
  add(ctx, cyl(0.04, 0.05, h, 5), M.wood('#3a2a20'), x, h / 2, z);
  const c = add(ctx, box(0.04, 0.5, 1.0), M.flat(color), x, h - 0.4, z + 0.5, { rx: 0.05 }); c.castShadow = true;
  icicles(ctx, x, z + 0.05, x, z + 1, h - 0.66, { len: 0.25, n: 5 });
  solidCircle(ctx, x, z, 0.15, h);
}

// ---------------------------------------------------------------- scattering
// Fill the land outside the walks with firs, rocks and drifts (seeded): tall firs only where they stand
// beyond a far edge (screen top); near the camera only drifts, rocks and saplings.
export function wilds(ctx, bounds, walks, o = {}) {
  const R = T.rng(o.seed || 909); const [bx0, bz0, bx1, bz1] = bounds; const pad = 0.9;
  const inWalk = (x, z, p) => walks.some((r) => x > r[0] - p && x < r[2] + p && z > r[1] - p && z < r[3] + p);
  const nearSide = (x, z) => walks.some((r) => z > r[1] - 1 && z < r[3] + 1 && x > r[2] && x < r[2] + 9) || walks.some((r) => x > r[0] - 1 && x < r[2] + 1 && z > r[3] && z < r[3] + 9);
  const skip = o.skip || [];
  for (let z = bz0 - 6; z < bz1 + 8; z += 1.6) for (let x = bx0 - 8; x < bx1 + 8; x += 1.6) {
    const jx = x + (R() - 0.5) * 1.4, jz = z + (R() - 0.5) * 1.4;
    if (inWalk(jx, jz, pad) || skip.some((s) => jx > s[0] && jx < s[2] && jz > s[1] && jz < s[3])) continue;
    const k = R(); const near = nearSide(jx, jz) && !walks.some((r) => jx < r[0] && jz > r[1] - 2 && jz < r[3]);
    if (near) { if (k < 0.32) pine(ctx, jx, jz, 1.4 + R() * 1.2, { solid: false }); else if (k < 0.5) rock(ctx, jx, jz, 0.6 + R() * 0.7, { solid: false }); else if (k < 0.66) drift(ctx, jx, jz, 1.6 + R(), 1.4 + R(), 0.5 + R() * 0.4, { solid: false }); }
    else { if (k < 0.55) pine(ctx, jx, jz, 4.5 + R() * 3.5, { solid: false }); else if (k < 0.66) rock(ctx, jx, jz, 0.9 + R() * 1.1, { solid: false }); else if (k < 0.7) snag(ctx, jx, jz, 2.6 + R() * 1.5, 0x1e1a18, { solid: false }); }
  }
}
// A row of wooden stakes, half buried (a snow fence), along a line.
export function stakes(ctx, x0, z0, x1, z1) {
  const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.5); const R = T.rng(Math.round(x0 * 9 + z0 * 4)); const w = M.wood('#4a3828');
  for (let i = 0; i <= n; i++) { const t = i / n, h = 0.6 + R() * 0.5; inst(ctx, 'fm-stake', box(0.1, 1, 0.1), w, mat4(x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t, 0, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3).multiply(new THREE.Matrix4().makeScale(1, h, 1))); }
  add(ctx, box(Math.abs(x1 - x0) || 0.06, 0.06, Math.abs(z1 - z0) || 0.06), w, (x0 + x1) / 2, 0.5, (z0 + z1) / 2);
}
