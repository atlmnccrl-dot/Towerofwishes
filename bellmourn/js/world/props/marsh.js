// Props for Act III, region I: the Weeping Marsh, the drowned country where the First Founder's foundry
// sank. Black water, mud isles and moss, stilt walkways of rotten boards, dead cypresses hung with moss
// and their knees standing out of the water, bells half sunk everywhere (some still ring: a pulse of pale
// light and a ring spreading on the water), will-o'-wisps, a witch's hut on stilts and her pot, totems
// of bones and bells, the foundry's ruined walls and furnace mouth, its chimney leaning out of the water,
// and the Bog Mother's hoard of drowned bells.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, plane, solid, solidCircle, water as kitWater } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { bell as fdBell } from './foundry.js';
import { voidFill } from './belfry.js';
import { bonePile, skull } from './undercroft.js';
import { once, part, put, pix, mound, boulder, solidRot, floorGlow } from '../kit2.js';
import { W3, seg, glowSprite, puffs, fogBank, mistSheet } from '../kit3.js';
export { voidFill, bonePile, skull, fogBank, mistSheet, floorGlow };

export const WATER_Y = -0.32, BED_Y = -1.5;
export const MUD = '#403a2c', MUD2 = '#332f24', MOSS = '#45532e', WOOD = '#5a4e3e';
const bark = () => M.flat(0x2a2620), bark2 = () => M.flat(0x201c18);
const mossA = () => M.flat(0x7e8a5e), mossB = () => M.flat(0x5a6646);
const verd = () => once('mr-verd', () => cutout(new THREE.MeshPhongMaterial({ color: 0x4e7a62, specular: 0x9ad0b4, shininess: 28 })));
const bronzeM = () => once('mr-bronze', () => cutout(new THREE.MeshPhongMaterial({ color: 0x7a5a30, specular: 0xd8b070, shininess: 38 })));
const ucyl = (rt, rb, n = 5) => geo(`mr-uc${rt},${rb},${n}`, () => new THREE.CylinderGeometry(rt, rb, 1, n));

// ---------------------------------------------------------------- water and ground
// Black water over everything (and far past the bounds, into the fog), a silt bed under it.
export function water(ctx, x0, z0, x1, z1) {
  kitWater(ctx, x0, z0, x1, z1, WATER_Y, 0x070c0a);
  add(ctx, box(x1 - x0, 0.3, z1 - z0), M.dirt('#141812'), (x0 + x1) / 2, BED_Y - 0.15, (z0 + z1) / 2, { cast: false });
}
// A mud isle: its ground (to the bed), patches of moss on it, and the bank broken by lumps of mud and
// moss, roots and reeds along the edges we see, so it never reads as a box.
export function isle(ctx, x0, z0, x1, z1, o = {}) {
  const R = T.rng(Math.round(x0 * 17 + z0 * 31 + 5)); const mud = W3.mud(o.tone || MUD);
  add(ctx, box(x1 - x0, -BED_Y, z1 - z0), mud, (x0 + x1) / 2, BED_Y / 2, (z0 + z1) / 2, { cast: false });
  for (let i = 0; i < (o.moss ?? Math.round((x1 - x0) * (z1 - z0) / 22)); i++) {
    const w = 1.2 + R() * 2.6, d = 1 + R() * 2.2, cx = x0 + w / 2 + R() * (x1 - x0 - w), cz = z0 + d / 2 + R() * (z1 - z0 - d);
    mound(ctx, cx, cz, w, d, 0.03, W3.moss(MOSS), { solid: false, y: -0.02 + i * 0.001, ry: R() * 3, cast: false });
  }
  // the bank: lumps that straddle the edge (no solids: the water beyond is solid already)
  const edges = [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]];
  for (const [a, b, c, d] of edges) {
    const len = Math.hypot(c - a, d - b); const n = Math.round(len / 1.3);
    for (let i = 0; i < n; i++) {
      const t = (i + R()) / n, px = a + (c - a) * t, pz = b + (d - b) * t; const s = 0.5 + R() * 1.1;
      mound(ctx, px, pz, s * (1.2 + R()), s * (0.8 + R() * 0.6), 0.12 + R() * 0.12, R() < 0.4 ? W3.moss(MOSS) : W3.mud(MUD2), { solid: false, y: -0.12, ry: R() * 3, cast: false });
    }
    if (o.reeds !== false) for (let i = 0; i < n / 2; i++) { const t = R(); if (R() < 0.6) reeds(ctx, a + (c - a) * t + (R() - 0.5) * 0.4, b + (d - b) * t + (R() - 0.5) * 0.4, 0.5 + R() * 0.4, 6 + ((R() * 6) | 0)); }
  }
}
// Reeds and bulrushes in a clump (instanced blades, some with a brown head).
export function reeds(ctx, x, z, r = 0.6, n = 9, y = 0) {
  const R = T.rng(Math.round(x * 53 + z * 29)); const A = M.flat(0x4a5432), B = M.flat(0x36402a), head = M.flat(0x3a2a1a);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.3, d = Math.sqrt(R()) * r, h = 0.5 + R() * 0.9, lx = Math.sin(a) * 0.25, lz = Math.cos(a) * 0.25; const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    put(ctx, 'mr-reed' + (i % 2), i % 2 ? A : B, px, y + h / 2, pz, 0.03, h, 0.03, 0, lx, lz);
    if (R() < 0.3) put(ctx, 'mr-cat', head, px - lz * h * 0.45, y + h * 0.9, pz + lx * h * 0.45, 0.06, 0.18, 0.06, 0, lx, lz);
  }
}
// Lily pads on open water (flat discs, some with a pale flower). rects: [x0, z0, x1, z1].
export function lilies(ctx, list) {
  const A = M.flat(0x2e4228), B = M.flat(0x3a5030), F = M.flat(0xc8c8b0, { emissive: 0x101010 });
  const g = geo('mr-pad', () => new THREE.CylinderGeometry(0.5, 0.5, 0.02, 7));
  for (const [x, z, r, n] of list) { const R = T.rng(Math.round(x * 7 + z * 11)); for (let i = 0; i < n; i++) { const a = R() * 6.3, d = Math.sqrt(R()) * r, s = 0.25 + R() * 0.3; const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; put(ctx, 'mr-pad' + (i % 2), i % 2 ? A : B, px, WATER_Y + 0.01, pz, s, 0.02, s * 0.9, R() * 6); if (R() < 0.12) put(ctx, 'mr-fl', F, px, WATER_Y + 0.05, pz, 0.08, 0.06, 0.08); } }
  void g;
}

// ---------------------------------------------------------------- walkways
// A stilt walkway of rotten boards (deck top level with the isles): stringers, posts down into the
// water, braces, and on one side (o.rail: '+x', '-x', '+z' or '-z') crooked rail posts with a sagging rope.
export function boardwalk(ctx, x0, z0, x1, z1, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const alongZ = d >= w; const R = T.rng(Math.round(x0 * 13 + z0 * 7));
  add(ctx, box(w, 0.12, d), W3.rotwood(o.tone || WOOD), cx, -0.06, cz, { cast: false });
  const post = M.flat(0x261f18), beam = M.flat(0x2e261c);
  const len = alongZ ? d : w, n = Math.max(1, Math.round(len / 1.5));
  for (const s of [-1, 1]) {
    if (alongZ) add(ctx, box(0.16, 0.2, d), beam, cx + s * (w / 2 - 0.08), -0.2, cz); else add(ctx, box(w, 0.2, 0.16), beam, cx, -0.2, cz + s * (d / 2 - 0.08));
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + i * len / n; const px = alongZ ? cx + s * (w / 2 - 0.1) : cx + t, pz = alongZ ? cz + t : cz + s * (d / 2 - 0.1);
      const lean = (R() - 0.5) * 0.12; put(ctx, '!mr-post', post, px, (BED_Y - 0.1) / 2, pz, 0.14, -BED_Y + 0.1, 0.14, 0, lean, lean * 0.5);
      if (i < n && s > 0) { const p2 = alongZ ? [px, -1.1, pz + len / n] : [px + len / n, -1.1, pz]; seg(ctx.group, ucyl(0.04, 0.04, 4), beam, [px, -0.25, pz], p2); }
    }
  }
  if (o.rail) {
    const side = o.rail; const sx = side === '+x' ? 1 : side === '-x' ? -1 : 0, sz = side === '+z' ? 1 : side === '-z' ? -1 : 0; let prev = null;
    for (let i = 0; i <= n; i++) {
      if (R() < 0.18 && i > 0 && i < n) { prev = null; continue; } // a post gone
      const t = -len / 2 + i * len / n; const px = alongZ ? cx + sx * (w / 2 - 0.08) : cx + t, pz = alongZ ? cz + t : cz + sz * (d / 2 - 0.08); const hh = 0.8 + R() * 0.3;
      put(ctx, '!mr-rail', post, px, hh / 2, pz, 0.1, hh, 0.1, 0, (R() - 0.5) * 0.2, (R() - 0.5) * 0.2);
      if (prev) rope(ctx, [prev[0], prev[1], prev[2]], [px, hh - 0.08, pz], 0.22); prev = [px, hh - 0.08, pz];
    }
  }
  // the odd board sprung loose, a moss stain
  for (let i = 0; i < Math.round(len / 3); i++) { const t = R() * len - len / 2; const px = alongZ ? cx + (R() - 0.5) * (w - 0.6) : cx + t, pz = alongZ ? cz + t : cz + (R() - 0.5) * (d - 0.6); add(ctx, box(alongZ ? 0.9 : 0.24, 0.04, alongZ ? 0.24 : 0.9), W3.rotwood('#3e3a2e'), px, 0.02, pz, { ry: (R() - 0.5) * 0.3, cast: false }); }
}
// A rope slung between two points (sagging, dark).
export function rope(ctx, a, b, sag = 0.3) {
  const m = M.flat(0x2a2418); let prev = a; const n = 6;
  for (let i = 1; i <= n; i++) { const t = i / n; const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t]; seg(ctx.group, ucyl(0.02, 0.02, 3), m, prev, p, false); prev = p; }
}

// ---------------------------------------------------------------- trees and moss
// Moss hanging in strands from a point (an instanced curtain, grey-green).
export function mossHang(ctx, x, y, z, n = 4, len = 1.2, R = Math.random) {
  for (let i = 0; i < n; i++) { const l = len * (0.4 + R() * 0.8); put(ctx, 'mr-moss' + (i % 2), i % 2 ? mossA() : mossB(), x + (R() - 0.5) * 0.4, y - l / 2, z + (R() - 0.5) * 0.4, 0.05, l, 0.05); }
}
// A dead swamp cypress: a flared, buttressed foot (o.y: where it stands; in water it rises from below),
// a tall bare trunk, crooked boughs high up dripping moss, and knees standing out of the water round it.
export function cypress(ctx, x, z, h = 7, o = {}) {
  const R = T.rng(Math.round(x * 41 + z * 23 + h * 3)); const y0 = o.y ?? 0; const g = ctx.group; const lean = (R() - 0.5) * 0.14;
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + R() * 0.5, r = h * (0.13 + R() * 0.05); seg(g, ucyl(0.05, 0.14, 4), i % 2 ? bark() : bark2(), [x + Math.cos(a) * r, y0 - 0.35, z + Math.sin(a) * r], [x + Math.cos(a) * h * 0.03, y0 + h * (0.2 + R() * 0.1), z + Math.sin(a) * h * 0.03]); }
  add(ctx, cyl(h * 0.05, h * 0.11, h * 0.26, 7), bark(), x, y0 + h * 0.11, z, { ry: R() * 3 });
  const top = [x + lean * h, y0 + h, z + lean * h * 0.4];
  seg(g, ucyl(h * 0.022, h * 0.05, 6), bark(), [x, y0 + h * 0.2, z], top);
  for (let i = 0; i < (o.boughs ?? 5); i++) {
    const t = 0.55 + R() * 0.42, a = R() * 6.3, l = h * (0.18 + R() * 0.22); const p0 = [x + lean * h * t, y0 + h * t, z + lean * h * 0.4 * t];
    const p1 = [p0[0] + Math.cos(a) * l * 0.6, p0[1] + l * 0.25, p0[2] + Math.sin(a) * l * 0.6]; const p2 = [p1[0] + Math.cos(a + 0.6) * l * 0.5, p1[1] - l * 0.05 + R() * l * 0.3, p1[2] + Math.sin(a + 0.6) * l * 0.5];
    seg(g, ucyl(0.03, 0.07, 4), bark(), p0, p1); seg(g, ucyl(0.015, 0.035, 4), bark2(), p1, p2);
    if (o.moss !== false) { mossHang(ctx, p1[0], p1[1], p1[2], 3 + ((R() * 3) | 0), h * 0.16, R); mossHang(ctx, p2[0], p2[1], p2[2], 2 + ((R() * 3) | 0), h * 0.12, R); }
  }
  for (let i = 0; i < (o.knees ?? 5); i++) { const a = R() * 6.3, r = h * (0.22 + R() * 0.22), kh = 0.25 + R() * 0.4; put(ctx, 'mr-knee', bark(), x + Math.cos(a) * r, (o.kneeY ?? y0) + kh / 2 - 0.1, z + Math.sin(a) * r, 0.12, kh, 0.12, R() * 3); }
  if (o.solid !== false) solidCircle(ctx, x, z, h * 0.09, h);
}
// A fallen trunk lying half in the water, moss on its back.
export function log(ctx, x, z, len = 4, ry = 0, y = 0) {
  const m = add(ctx, cyl(0.28, 0.34, len, 7), bark(), x, y, z, { rz: Math.PI / 2, ry }); void m;
  add(ctx, box(len * 0.8, 0.06, 0.3), W3.moss(MOSS), x, y + 0.3, z, { ry, cast: false });
  for (let i = 0; i < 3; i++) { const t = (i - 1) * len * 0.3; mossHang(ctx, x + Math.cos(ry) * t, y - 0.1, z - Math.sin(ry) * t, 2, 0.5); }
}

// ---------------------------------------------------------------- bells
// A bell half sunk (in the water by default, o.y for mud), tipped by ry/rx/rz. o.ring: it still rings —
// now and then a pulse of pale light swells in it and a ring spreads on the water round it.
const ringTex = () => pix('mr-ring', 32, 32, (g, W) => { for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + 0.5 - W / 2, y + 0.5 - W / 2); if (d > 13.5 && d < 15.5) { g.fillStyle = d > 14.5 ? '#ffffff' : '#9a9a9a'; g.fillRect(x, y, 1, 1); } } });
export function sunkBell(ctx, x, z, s = 1.2, o = {}) {
  const R = T.rng(Math.round(x * 19 + z * 37)); const y = o.y ?? WATER_Y;
  fdBell(ctx, x, y - s * (o.sink ?? 0.42), z, s, { mat: R() < 0.55 ? verd() : bronzeM(), rx: o.rx ?? (R() - 0.5) * 0.9, rz: o.rz ?? (R() - 0.5) * 0.9, ry: R() * 3 });
  if (o.solid) solidCircle(ctx, x, z, s * 0.42, s);
  if (o.ring) ringing(ctx, x, y, z, s, o);
}
// The ring a bell sends out: a pulse of pale light in it and a ring spreading on the water.
export function ringing(ctx, x, y, z, s = 1, o = {}) {
  const col = new THREE.Color(o.color ?? 0x8affd8);
  const glow = glowSprite(ctx, x, y + s * 0.45, z, s * 2.4, col, 1); glow.material.opacity = 0;
  const rm = new THREE.MeshBasicMaterial({ map: ringTex(), color: col.clone().multiplyScalar(1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0 });
  const ring = new THREE.Mesh(plane(1, 1), rm); ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.02, z); ring.renderOrder = 3; ctx.group.add(ring);
  const per = o.every ?? (5 + Math.random() * 4); let t = Math.random() * per;
  ctx.anims.push({ update(dt) {
    t += dt; if (t > per) t -= per; const k = t / 2.6;
    glow.material.opacity = k < 1 ? Math.pow(Math.sin(Math.min(1, k * 1.4) * Math.PI), 2) * 0.9 : 0.08;
    if (k < 1) { const r = s * (0.6 + k * 3.4); ring.scale.set(r, r, 1); rm.opacity = (1 - k) * 0.7; } else rm.opacity = 0;
    return false;
  } });
}
// The Bog Mother's hoard: a heap of mud and drowned bells of every size, a pale light breathing in them,
// bones round it, and one great bell crowning it (front toward +Z).
export function hoard(ctx, x, z, r = 3, o = {}) {
  const R = T.rng(Math.round(x * 3 + z * 5));
  mound(ctx, x, z, r * 2.2, r * 1.6, r * 0.42, W3.mud(MUD2), { solid: false });
  mound(ctx, x - r * 0.5, z + r * 0.2, r * 1.2, r, r * 0.3, W3.moss(MOSS), { solid: false, y: 0 });
  for (let i = 0; i < 14; i++) {
    const a = R() * 6.3, d = Math.sqrt(R()) * r * 0.9, s = 0.4 + R() * 0.9; const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d * 0.72;
    const hy = r * 0.42 * 2 * Math.max(0, 1 - (d / (r * 1.1)) ** 2) * 0.5;
    fdBell(ctx, px, hy - s * 0.3, pz, s, { mat: R() < 0.5 ? verd() : bronzeM(), rx: (R() - 0.5) * 1.4, rz: (R() - 0.5) * 1.4, ry: R() * 3 });
  }
  fdBell(ctx, x, r * 0.25, z - r * 0.15, r * 0.9, { mat: verd(), rx: -0.25, rz: 0.12 });
  ringing(ctx, x, r * 0.25, z + 0.4, r * 0.9, { every: 4.2, color: 0x9affe0 });
  for (const [dx, dz] of [[-r * 1.1, r * 0.7], [r * 1.0, r * 0.8], [r * 0.2, r * 1.2]]) bonePile(ctx, x + dx, z + dz, 0.6, 6);
  ctx.lights.push({ x, y: r * 0.8, z: z + r * 0.6, color: 0x7ae8c8, intensity: 5, dist: r * 3.2, flicker: 0.06 });
  solid(ctx, x - r * 0.95, z - r * 0.75, x + r * 0.95, z + r * 0.6, 2.4);
}

// ---------------------------------------------------------------- lights of the marsh
// A will-o'-wisp: a bright core in a soft halo drifting on a slow loop round its home, bobbing.
export function wisp(ctx, x, y, z, o = {}) {
  const col = o.color ?? 0x9affe8; const core = glowSprite(ctx, x, y, z, 0.35, col, 2.2), halo = glowSprite(ctx, x, y, z, 1.6, col, 0.45);
  const ph = Math.random() * 10, rr = o.r ?? 1.2; let t = 0;
  ctx.anims.push({ update(dt) {
    t += dt; const px = x + Math.sin(t * 0.37 + ph) * rr, pz = z + Math.cos(t * 0.29 + ph * 1.3) * rr * 0.8, py = y + Math.sin(t * 1.3 + ph) * 0.2;
    core.position.set(px, py, pz); halo.position.set(px, py, pz); const f = 0.75 + 0.25 * Math.sin(t * 5 + ph); core.material.opacity = f; halo.material.opacity = f * 0.8; return false;
  } });
  if (o.light) ctx.lights.push({ x, y, z, color: col, intensity: o.light, dist: 5, flicker: 0.1 });
}
// A crooked lantern post: a leaning pole, an arm, a hanging cage lantern with a yellow-green candle.
export function lantern(ctx, x, z, o = {}) {
  const R = T.rng(Math.round(x * 11 + z * 5)); const post = M.flat(0x261f18); const ry = o.ry ?? R() * 6; const hh = o.h ?? 2.5; const lean = (R() - 0.5) * 0.12;
  const top = [x + lean, (o.y ?? 0) + hh, z + lean * 0.5]; seg(ctx.group, ucyl(0.05, 0.07, 5), post, [x, (o.y ?? 0) - 0.4, z], top);
  const ax = top[0] + Math.sin(ry) * 0.55, az = top[2] + Math.cos(ry) * 0.55; seg(ctx.group, ucyl(0.03, 0.03, 4), post, [top[0], top[1] - 0.1, top[2]], [ax, top[1] - 0.05, az]);
  const ly = top[1] - 0.45; const iron = M.ironLit();
  add(ctx, box(0.03, 0.2, 0.03), iron, ax, top[1] - 0.15, az); add(ctx, cone(0.17, 0.14, 4), iron, ax, ly + 0.2, az, { ry: Math.PI / 4 });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(ctx, box(0.025, 0.3, 0.025), iron, ax + dx * 0.09, ly, az + dz * 0.09);
  add(ctx, box(0.12, 0.2, 0.12), M.glow(o.glow || '#e0d070', 2.6), ax, ly, az, { cast: false });
  ctx.lights.push({ x: ax, y: ly, z: az, color: o.color ?? 0xd8c060, intensity: o.intensity ?? 4.2, dist: o.dist ?? 7, flicker: 0.15, halo: true });
  if (o.solid !== false) solidCircle(ctx, x, z, 0.15, 2);
}

// ---------------------------------------------------------------- the witch's yard
// A shack on stilts (front toward ry): plank walls, a moss-grown roof sagging between its gables, a dark
// door up a ladder, a window of green light, bones and bells hung under the eaves, a stove pipe smoking green.
export function hut(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, o) => part(ctx, g, m, x, z, ry, lx, ly, lz, o); const wood = W3.rotwood('#6a5a46'), post = M.flat(0x3a2e22), dark = M.flat(0x2a221a);
  const W = 3.6, D = 3.0, F = 0.7, Hh = 2.2;
  for (const [lx, lz] of [[-1.6, -1.3], [1.6, -1.3], [-1.6, 1.3], [1.6, 1.3], [0, -1.3], [0, 1.3]]) P(box(0.18, F + 0.4, 0.18), post, lx, (F - 0.4) / 2, lz);
  P(box(W + 0.5, 0.14, D + 0.8), wood, 0, F, 0.3);
  for (const s of [-1, 1]) P(box(0.12, Hh, D), wood, s * (W / 2 - 0.06), F + Hh / 2, 0);
  P(box(W, Hh, 0.12), wood, 0, F + Hh / 2, -D / 2 + 0.06); P(box(W, Hh, 0.12), wood, 0, F + Hh / 2, D / 2 - 0.06);
  P(plane(0.8, 1.5), M.flat(0x050606), -0.6, F + 0.82, D / 2 + 0.01, { cast: false });
  P(plane(0.55, 0.45), M.glow('#7ae860', 1.6), 0.9, F + 1.4, D / 2 + 0.01, { cast: false });
  P(box(0.06, 0.5, 0.06), dark, 0.9, F + 1.4, D / 2 + 0.03); P(box(0.6, 0.06, 0.06), dark, 0.9, F + 1.4, D / 2 + 0.03);
  // gables and the sagging roof
  for (const s of [-1, 1]) P(geo('mr-gable', () => { const sh = new THREE.Shape(); sh.moveTo(-1.6, 0); sh.lineTo(1.6, 0); sh.lineTo(0, 1.2); sh.lineTo(-1.6, 0); return new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); }), wood, s * (W / 2 - 0.05), F + Hh, -0.05, { ry: Math.PI / 2 });
  for (const s of [-1, 1]) { P(box(W + 0.7, 0.16, 2.1), W3.moss('#55663a'), 0, F + Hh + 0.62, s * 0.86, { rx: s * 0.66 }); P(box(W + 0.6, 0.1, 2.0), dark, 0, F + Hh + 0.52, s * 0.86, { rx: s * 0.66, cast: false }); }
  P(box(W + 0.8, 0.12, 0.14), dark, 0, F + Hh + 1.24, 0);
  // the ladder up to the door
  for (const s of [-1, 1]) P(box(0.07, 1.2, 0.07), post, -0.6 + s * 0.3, F * 0.45, D / 2 + 0.75, { rx: -0.35 });
  for (let i = 0; i < 3; i++) P(box(0.6, 0.05, 0.06), post, -0.6, 0.15 + i * 0.25, D / 2 + 0.55 + i * 0.09);
  // the stove pipe, smoking green
  const c = Math.cos(ry), s2 = Math.sin(ry); const px = x + 1.1 * c + -0.6 * s2, pz = z - 1.1 * s2 + -0.6 * c;
  add(ctx, cyl(0.12, 0.12, 1.4, 6), M.ironLit(), px, F + Hh + 1.3, pz); puffs(ctx, [[px, F + Hh + 2.1, pz, 1.1, 0.8, 0.9, 0x6aa070, 0.35]]);
  // hung under the eaves: bones, small bells, a bundle of herbs
  for (let i = 0; i < 5; i++) { const lx = -1.6 + i * 0.8, l = 0.3 + (i % 3) * 0.15; P(box(0.02, l, 0.02), M.flat(0x6a5a44), lx, F + Hh + 0.1 - l / 2, D / 2 + 0.55); P(i % 2 ? geo('mr-hbell', () => new THREE.CylinderGeometry(0.05, 0.11, 0.16, 6)) : box(0.05, 0.22, 0.05), i % 2 ? verd() : M.flat(0xb0a688), lx, F + Hh + 0.05 - l, D / 2 + 0.55); }
  ctx.lights.push({ x: x + 0.9 * c + (D / 2 + 1) * s2, y: F + 1.4, z: z - 0.9 * s2 + (D / 2 + 1) * c, color: 0x6ae050, intensity: 3.5, dist: 5.5, flicker: 0.12 });
  solidRot(ctx, x, z, ry, W / 2 + 0.25, D / 2 + 0.4, 3.5); solidRot(ctx, x - 0.6 * c + (D / 2 + 0.75) * s2, z + 0.6 * s2 + (D / 2 + 0.75) * c, ry, 0.4, 0.35, 1.2);
}
// The witch's pot: an iron cauldron on three stones over embers, the brew glowing green and bubbling.
export function cauldron(ctx, x, z, o = {}) {
  for (let i = 0; i < 3; i++) { const a = i * 2.1; boulder(ctx, x + Math.cos(a) * 0.5, z + Math.sin(a) * 0.5, 0.42, W3.rock('mud', '#3a3a32'), { solid: false }); }
  add(ctx, cyl(0.62, 0.44, 0.62, 10), M.ironLit(), x, 0.58, z); add(ctx, geo('mr-rim', () => new THREE.TorusGeometry(0.6, 0.05, 4, 12).rotateX(Math.PI / 2)), M.ironLit(), x, 0.89, z);
  add(ctx, cyl(0.56, 0.56, 0.03, 10), M.glow('#6af040', 1.9), x, 0.86, z, { cast: false });
  add(ctx, cyl(0.42, 0.42, 0.03, 8), M.glow('#ff7a28', 1.6), x, 0.14, z, { cast: false });
  const bub = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(geo('mr-bub', () => new THREE.SphereGeometry(0.07, 5, 3)), M.glow('#b8ff80', 2.2)); ctx.group.add(m); bub.push({ m, t: i * 0.4, a: Math.random() * 6, d: Math.random() * 0.4 }); }
  ctx.anims.push({ update(dt) { for (const b of bub) { b.t += dt; if (b.t > 1.6) { b.t = 0; b.a = Math.random() * 6; b.d = Math.random() * 0.42; } const k = b.t / 1.6; b.m.position.set(x + Math.cos(b.a) * b.d, 0.86 + k * 0.05, z + Math.sin(b.a) * b.d); b.m.scale.setScalar(0.4 + k); b.m.visible = k < 0.9; } return false; } });
  puffs(ctx, [[x, 1.1, z, 0.9, 0.6, 1.0, 0x7ac868, 0.3]]);
  ctx.lights.push({ x, y: 1.4, z, color: 0x70f050, intensity: o.intensity ?? 5, dist: 6.5, flicker: 0.18, halo: true });
  solidCircle(ctx, x, z, 0.75, 1.1);
}
// A totem: a pole with a crossbar, a skull with antlers, small bells and rags hung from it.
export function totem(ctx, x, z, h = 2.8, ry = 0) {
  const post = M.flat(0x2a2218); add(ctx, cyl(0.07, 0.09, h, 5), post, x, h / 2, z);
  part(ctx, box(1.1, 0.07, 0.07), post, x, z, ry, 0, h - 0.5, 0);
  skull(ctx, x, h + 0.05, z, ry); for (const s of [-1, 1]) { part(ctx, box(0.03, 0.4, 0.03), M.flat(0x8a7a60), x, z, ry, s * 0.12, h + 0.32, 0, { rz: -s * 0.6 }); part(ctx, box(0.03, 0.2, 0.03), M.flat(0x8a7a60), x, z, ry, s * 0.26, h + 0.5, 0, { rz: s * 0.4 }); }
  const rag = M.flat(0x4a2a24, { side: THREE.DoubleSide });
  for (const [lx, l, kind] of [[-0.5, 0.5, 'bell'], [-0.25, 0.7, 'rag'], [0.25, 0.4, 'bell'], [0.5, 0.8, 'rag']]) {
    part(ctx, box(0.02, l, 0.02), M.flat(0x6a5a44), x, z, ry, lx, h - 0.5 - l / 2, 0);
    if (kind === 'bell') part(ctx, geo('mr-hbell', () => new THREE.CylinderGeometry(0.05, 0.11, 0.16, 6)), verd(), x, z, ry, lx, h - 0.55 - l, 0); else part(ctx, plane(0.14, 0.5), rag, x, z, ry, lx, h - 0.7 - l / 2, 0.02, { cast: false });
  }
  solidCircle(ctx, x, z, 0.2, h);
}
// A flat-bottomed punt moored in the water, its pole across it.
export function punt(ctx, x, z, ry = 0) {
  const w = M.wood('#3a2e22'), dk = M.wood('#2a2018'); const y = WATER_Y + 0.08;
  part(ctx, box(1.1, 0.12, 3.6), dk, x, z, ry, 0, y, 0); for (const s of [-1, 1]) part(ctx, box(0.08, 0.32, 3.6), w, x, z, ry, s * 0.52, y + 0.16, 0);
  for (const s of [-1, 1]) part(ctx, box(1.1, 0.3, 0.08), w, x, z, ry, 0, y + 0.15, s * 1.78, { rx: s * 0.4 });
  part(ctx, box(1.0, 0.06, 0.3), w, x, z, ry, 0, y + 0.22, 0.4);
  part(ctx, cyl(0.03, 0.03, 4.2, 4), M.flat(0x4a3a28), x, z, ry, 0.2, y + 0.3, 0, { rx: Math.PI / 2 - 0.08 });
}

// ---------------------------------------------------------------- the drowned foundry
// The foundry's chimney leaning out of the water: a square brick shaft from the bed, iron bands, a broken
// crown, moss hanging down it and, low on its face, the flue arch still glowing from some fire far below.
export function chimney(ctx, x, z, h = 15, s = 2.4, o = {}) {
  const g = new THREE.Group(); g.position.set(x, BED_Y, z); g.rotation.set(o.rx ?? 0.06, o.ry ?? 0.3, o.rz ?? -0.09); ctx.group.add(g);
  const brick = M.brick('#2e2a2a'), soot = M.brick('#1a1818'), R = T.rng(Math.round(x * 7 + z * 3)); const H = h - BED_Y;
  const P = (gm, m, lx, ly, lz, cast = true) => { const me = new THREE.Mesh(gm, m); me.position.set(lx, ly, lz); me.castShadow = cast; me.receiveShadow = true; g.add(me); return me; };
  P(box(s + 0.5, 1.6, s + 0.5), M.ashlar('#2c2c30'), 0, 0.8, 0); P(box(s, H - 1.4, s), brick, 0, (H - 1.4) / 2 + 0.8, 0);
  for (let y = 2.4; y < H - 2; y += 2.2) P(box(s + 0.08, 0.12, s + 0.08), M.ironLit(), 0, y, 0);
  P(box(s + 0.02, 2.2, s + 0.02), soot, 0, H - 1.2, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.3, hh = 0.3 + R() * 1.2; P(box(s * 0.36, hh, s * 0.36), soot, Math.cos(a) * s * 0.36, H + hh / 2 - 0.2, Math.sin(a) * s * 0.36); }
  P(plane(0.8, 1.0), M.glow('#c05018', 1.5), 0, -BED_Y + 0.35, s / 2 + 0.01, false); P(plane(0.8, 1.0), M.glow('#c05018', 1.1), s / 2 + 0.01, -BED_Y + 0.35, 0, false).rotation.y = Math.PI / 2;
  const mm = [mossA(), mossB()]; for (let i = 0; i < 16; i++) { const l = 0.6 + R() * 2.4, y = 2 + R() * (H - 4), f = R() < 0.5; const me = P(box(0.06, l, 0.06), mm[i % 2], f ? s / 2 + 0.04 : (R() - 0.5) * s, y - l / 2, f ? (R() - 0.5) * s : s / 2 + 0.04, false); void me; }
  ctx.lights.push({ x: x + 1.4, y: 0.6, z: z + 1.4, color: 0xd05a20, intensity: 3, dist: 5, flicker: 0.2 });
  puffs(ctx, [[x + Math.sin(o.rz ?? -0.09) * -h * 0.9, h + 0.6, z + Math.sin(o.rx ?? 0.06) * h, 2.2, 0.5, 2.6, 0x707c78, 0.18]]);
  solidCircle(ctx, x, z, s * 0.8, h);
}
// A ruined foundry wall (brick, along X or Z): stretches of varied height with broken tops and moss on
// them, gaps where it fell, the fallen bricks heaped at its foot. Solid where it stands.
export function ruinWall(ctx, x0, z0, x1, z1, hMin = 0.8, hMax = 3.6, o = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? x1 - x0 : z1 - z0; const R = T.rng(Math.round(x0 * 7 + z0 * 13 + len)); const brick = M.brick(o.tone || '#3a3230'); const n = Math.max(1, Math.round(len / 1.1));
  for (let i = 0; i < n; i++) {
    if (o.gaps && R() < o.gaps) continue; const a = (alongX ? x0 : z0) + i * len / n, b = a + len / n; const hh = hMin + R() * (hMax - hMin);
    const cx = alongX ? (a + b) / 2 : x0, cz = alongX ? z0 : (a + b) / 2; const w = len / n;
    add(ctx, box(alongX ? w : 0.6, hh, alongX ? 0.6 : w), brick, cx, hh / 2 - 0.4, cz);
    add(ctx, box(alongX ? w * 0.9 : 0.66, 0.08, alongX ? 0.66 : w * 0.9), W3.moss(MOSS), cx, hh - 0.36, cz, { cast: false });
    if (R() < 0.5) mossHang(ctx, cx + (alongX ? 0 : 0.34), hh - 0.4, cz + (alongX ? 0.34 : 0), 3, 0.9, R);
    if (alongX) solid(ctx, cx - w / 2, z0 - 0.3, cx + w / 2, z0 + 0.3, hh); else solid(ctx, x0 - 0.3, cz - w / 2, x0 + 0.3, cz + w / 2, hh);
    if (R() < 0.4) for (let k = 0; k < 3; k++) add(ctx, box(0.24, 0.12, 0.12), brick, cx + (alongX ? (R() - 0.5) * w : 0.5 + R() * 0.4), 0.06, cz + (alongX ? 0.5 + R() * 0.4 : (R() - 0.5) * w), { ry: R() * 3 });
  }
}
// The drowned foundry's casting floor showing through the mud: flagstones, a great ring of dressed stone
// round the old casting pit, iron plates, and mud and moss lying over its edges and in its hollows.
export function foundryFloor(ctx, x0, z0, x1, z1, ring = [0, 0, 5]) {
  const R = T.rng(Math.round(x0 * 5 + z0 * 3)); add(ctx, box(x1 - x0, 0.04, z1 - z0), M.flags('#4a4c48'), (x0 + x1) / 2, 0.0, (z0 + z1) / 2, { cast: false });
  const [rx, rz, rr] = ring; const st = M.ashlar('#5a5a54');
  add(ctx, geo(`mr-cring${rr}`, () => new THREE.RingGeometry(rr - 0.7, rr, 40).rotateX(-Math.PI / 2)), st, rx, 0.03, rz, { cast: false });
  add(ctx, geo(`mr-cring${rr * 0.45}`, () => new THREE.RingGeometry(rr * 0.45 - 0.35, rr * 0.45, 28).rotateX(-Math.PI / 2)), st, rx, 0.03, rz, { cast: false });
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; add(ctx, box(0.24, 0.02, rr * 0.55 - 0.7), M.ashlar('#4e4e48'), rx + Math.sin(a) * (rr * 0.725 - 0.2), 0.035, rz + Math.cos(a) * (rr * 0.725 - 0.2), { ry: a, cast: false }); }
  add(ctx, cyl(rr * 0.45 - 0.35, rr * 0.45 - 0.35, 0.02, 24), W3.mud(MUD2), rx, 0.025, rz, { cast: false });
  // mud washed over its edges, moss in the joints
  const edges = [[x0, z0, x1, z0], [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z0, x1, z1]];
  for (const [a, b, c, d] of edges) { const n = Math.round(Math.hypot(c - a, d - b) / 1.6); for (let i = 0; i < n; i++) { const t = (i + R()) / n; mound(ctx, a + (c - a) * t, b + (d - b) * t, 1.4 + R() * 2.2, 1 + R() * 1.6, 0.05, R() < 0.5 ? W3.mud(MUD) : W3.moss(MOSS), { solid: false, y: 0.0, ry: R() * 3, cast: false }); } }
  for (let i = 0; i < 7; i++) { const x = x0 + 1 + R() * (x1 - x0 - 2), z = z0 + 1 + R() * (z1 - z0 - 2); if (Math.hypot(x - rx, z - rz) < rr + 0.6) continue; mound(ctx, x, z, 1 + R() * 1.8, 0.8 + R() * 1.2, 0.04, W3.moss(MOSS), { solid: false, y: 0.0, ry: R() * 3, cast: false }); }
  for (const [px, pz, w, d] of [[x0 + 1.8, z1 - 2, 1.8, 1.1], [x1 - 2.4, z0 + 2.2, 2.2, 1.2], [rx + rr + 1.4, rz - 1, 1.4, 0.9]]) { const m = new THREE.Mesh(geo('mr-pud', () => new THREE.CircleGeometry(0.5, 12)), new THREE.MeshPhongMaterial({ color: 0x0a100e, specular: 0x7a9a90, shininess: 90 })); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(px, 0.045, pz); m.receiveShadow = true; ctx.group.add(m); }
}
// The mouth of a great furnace in a wall (opening toward +x or +z): brick piers and a lintel, an arch of
// dark iron, the black throat glowing deep red.
export function furnaceMouth(ctx, x, z, face = '+x') {
  const fx = face === '+x', brick = M.brick('#3a3230'); const ry = fx ? Math.PI / 2 : 0;
  const P = (g, m, lx, ly, lz, o) => part(ctx, g, m, x, z, ry, lx, ly, lz, o);
  for (const s of [-1, 1]) P(box(0.9, 3.4, 1.2), brick, s * 1.35, 1.3, 0);
  P(box(3.6, 0.9, 1.3), brick, 0, 3.2, 0); P(box(1.9, 0.18, 0.2), M.ironLit(), 0, 2.6, 0.62);
  P(plane(1.8, 2.6), M.glow('#5a1408', 1.0), 0, 1.0, 0.3, { cast: false }); P(plane(1.2, 1.2), M.glow('#c04010', 1.2), 0, 0.5, 0.32, { cast: false });
  ctx.lights.push({ x: x + (fx ? 1.4 : 0), y: 1.2, z: z + (fx ? 0 : 1.4), color: 0xd04a18, intensity: 4, dist: 6, flicker: 0.25 });
  if (fx) solid(ctx, x - 0.65, z - 1.8, x + 0.65, z + 1.8, 3.6); else solid(ctx, x - 1.8, z - 0.65, x + 1.8, z + 0.65, 3.6);
}

// ---------------------------------------------------------------- water's face
// Light on black water: the broken columns each lamp throws toward the camera, and pale ripple dashes.
// Call after every light is placed. wet(x, z): true over open water.
export function glints(ctx, wet, rects, density = 0.15) {
  const cool = new THREE.Color(0x24382e);
  const mats = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: cool.clone(), fog: false }));
  const y = WATER_Y + 0.01; const r = T.rng(909);
  for (const [x0, z0, x1, z1] of rects) { const n = Math.round((x1 - x0) * (z1 - z0) * density); for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0); if (!wet(x, z)) continue; put(ctx, 'mr-rip' + (i % 2), mats[i % 2], x, y, z, 0.3 + r() * 0.8, 0.01, 0.06, Math.PI / 4); } }
  for (const L of ctx.lights) {
    if (L.y > 6) continue;
    const hh = L.y - WATER_Y; const off = hh * Math.cos(0.698) / Math.sin(0.698) / Math.SQRT2; const hex = new THREE.Color(L.color).getHexString();
    const gm = [0, 1].map((k) => once('mr-glm' + k + hex, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(L.color).multiplyScalar(k ? 0.32 : 0.48), fog: false })));
    for (let j = -3; j <= 3; j++) { const t = off + j * 0.3 * Math.max(1, hh / 3); const x = L.x + t, z = L.z + t; if (!wet(x, z)) continue; const k = (j + 4) % 2; put(ctx, 'mr-gl' + k + hex, gm[k], x, y + 0.005, z, (0.9 - Math.abs(j) * 0.1) * (0.6 + r() * 0.6), 0.01, 0.07, Math.PI / 4); }
  }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; const a = Math.sin(t * 1.3) * 0.3; mats[0].color.copy(cool).multiplyScalar(1 + a); mats[1].color.copy(cool).multiplyScalar(1 - a); return false; } });
}
