// Props for District III, the Drowned Nave: clustered piers and pointed arcades, pews, ruined
// walls and rubble, fallen chandeliers, the candles of the drowned (teal), the altar, the font,
// drowned glass, the flood itself and the souls drifting over it.
import * as THREE from 'three';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane, water } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';

export const TEAL = '#6ff0dc';
const q16 = (v) => Math.round(v * 16) / 16;

// A part at a local offset (lx, ly, lz) of a prop turned by ry around (x, z).
function part(ctx, g, mat, x, z, ry, lx, ly, lz, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return add(ctx, g, mat, x + lx * c + lz * s, ly, z - lx * s + lz * c, { ...o, ry: ry + (o.ry || 0) || undefined });
}
// The axis-aligned solid around a w x d footprint turned by ry.
function solidRot(ctx, x, z, ry, hw, hd, h) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  const ax = c * hw + s * hd, az = s * hw + c * hd;
  solid(ctx, x - ax, z - az, x + ax, z + az, h);
}

// ---------------------------------------------------------------- the flood
// Shallow black water over the floor: walkable, drawn under the telegraphs and blood.
export function flood(ctx, x0, z0, x1, z1) {
  const m = water(ctx, x0, z0, x1, z1, 0.022, 0x0b171b);
  m.material.opacity = 0.8; m.material.depthWrite = false; m.material.shininess = 70; m.renderOrder = -1;
  return m;
}

// ---------------------------------------------------------------- drowned glass
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; }
const glassCache = new Map();
const GLASS = ['#163e44', '#1e5658', '#28706c', '#3a948a', '#5ab8a8'];

// A lancet of teal glass: two lights under a roundel, panes in lead, a stone frame.
function lancetGlass(w, h) {
  const [c, g] = canvas(w, h), [ce, ge] = canvas(w, h); const r = T.rng(w * 31 + h * 7);
  const stone = '#5a6474', stoneLo = '#3e4858'; const ah = w * 0.866; const mid = (w - 1) / 2;
  const ry = ah * 0.62, rr = w * 0.24;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + 0.5, py = y + 0.5;
    const d1 = Math.hypot(px, py - ah), d2 = Math.hypot(px - w, py - ah);
    if (py < ah && (d1 > w || d2 > w)) continue;
    const edge = x === 0 || x === w - 1 || y === h - 1 || (py < ah && (d1 > w - 1.2 || d2 > w - 1.2));
    const ring = Math.abs(Math.hypot(px - w / 2, py - ry) - rr) < 0.7;
    const mull = Math.abs(x - mid) < 0.6 && py > ry + rr;
    const tran = y === Math.round(h * 0.58);
    let col; let lit = true;
    if (edge) { col = py < h * 0.5 ? stone : stoneLo; lit = false; }
    else if (ring || mull || tran) { col = stoneLo; lit = false; }
    else {
      const lead = (x + y) % 5 === 0 || (x - y + 100) % 5 === 0;
      const k = Math.min(4, Math.max(0, Math.floor(1 + r() * 2.2 + (py / h) * 1.4 - (lead ? 1.6 : 0))));
      col = GLASS[k];
    }
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
    ge.fillStyle = lit ? col : '#000000'; ge.fillRect(x, y, 1, 1);
  }
  return [tex(c), tex(ce)];
}

// A rose of teal glass: a ring of stone, a quatrefoil, spokes.
function roseGlass(S) {
  const [c, g] = canvas(S, S), [ce, ge] = canvas(S, S); const cx = S / 2 - 0.5, cy = S / 2 - 0.5; const k = S / 48;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy) / k; const a = Math.atan2(dy, dx);
    let col = null, lit = true;
    if (d < 23.5 && d >= 20.5) { col = dy < 0 ? '#6a7482' : '#465060'; lit = false; }
    else if (d < 20.5) {
      let inLobe = false, lobeEdge = false;
      for (const [lx, ly] of [[0, -8], [8, 0], [0, 8], [-8, 0]]) { const ld = Math.hypot(dx / k - lx, dy / k - ly); if (ld < 7.5) inLobe = true; if (ld >= 7.5 && ld < 9) lobeEdge = true; }
      const spoke = Math.abs(((a / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.44;
      if (inLobe) col = GLASS[((x * 3 + y) % 7 === 0) ? 4 : ((x + y) % 3 === 0 ? 3 : 2)];
      else if (lobeEdge || d < 2.5) { col = '#6a7482'; lit = false; }
      else if (spoke && d > 11) { col = '#465060'; lit = false; }
      else col = GLASS[((x * 7 + y * 3) % 5 === 0) ? 3 : (d > 15 ? 1 : 2)];
    }
    if (!col) continue;
    g.fillStyle = col; g.fillRect(x, y, 1, 1); ge.fillStyle = lit ? col : '#000000'; ge.fillRect(x, y, 1, 1);
  }
  return [tex(c), tex(ce)];
}

function glassMat(kind, w, h, glow) {
  const key = kind + w + 'x' + h + ':' + glow;
  if (!glassCache.has(key)) {
    const [map, emissiveMap] = kind === 'rose' ? roseGlass(w) : lancetGlass(w, h);
    glassCache.set(key, cutout(new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: glow, alphaTest: 0.5 })));
  }
  return glassCache.get(key);
}

// A tall lancet window of drowned glass on a wall face ('+x' or '+z'), with jambs and a sill.
export function lancet(ctx, x, y, z, face = '+x', w = 1.25, h = 4.2, glow = 1.5) {
  const m = glassMat('lancet', Math.round(w * 16), Math.round(h * 16), glow); const st = M.ashlar('#4e5868');
  if (face === '+x') {
    add(ctx, plane(w, h), m, x + 0.02, y + h / 2, z, { cast: false, ry: Math.PI / 2 });
    for (const s of [-1, 1]) add(ctx, box(0.14, h * 0.82, 0.16), st, x + 0.07, y + h * 0.41, z + s * (w / 2 + 0.08));
    add(ctx, box(0.26, 0.14, w + 0.5), st, x + 0.13, y - 0.07, z);
  } else {
    add(ctx, plane(w, h), m, x, y + h / 2, z + 0.02, { cast: false });
    for (const s of [-1, 1]) add(ctx, box(0.16, h * 0.82, 0.14), st, x + s * (w / 2 + 0.08), y + h * 0.41, z + 0.07);
    add(ctx, box(w + 0.5, 0.14, 0.26), st, x, y - 0.07, z + 0.13);
  }
}

// A rose window of drowned glass on a wall face.
export function rose(ctx, x, y, z, face = '+z', size = 4.5, glow = 1.3) {
  const m = glassMat('rose', Math.round(size * 16), Math.round(size * 16), glow);
  if (face === '+x') add(ctx, plane(size, size), m, x + 0.03, y, z, { cast: false, ry: Math.PI / 2 });
  else add(ctx, plane(size, size), m, x, y, z + 0.03, { cast: false });
}

// ---------------------------------------------------------------- stone
// A clustered pier: plinth, square shaft with four engaged shafts, capital and abacus.
// broken: the height where the shaft snapped (no capital). Returns the springing height.
export function pier(ctx, x, z, h = 4.65, o = {}) {
  const w = o.w || 0.8, pw = w + 0.35; const stone = M.ashlar(o.tone || '#4a5464');
  add(ctx, box(pw, 0.5, pw), M.ashlar('#3c4656'), x, 0.25, z);
  add(ctx, box(pw - 0.12, 0.12, pw - 0.12), M.ashlar('#56606e'), x, 0.56, z);
  const faces = [[1, 0], [-1, 0], [0, 1], [0, -1]]; const off = w / 2 + 0.07;
  if (o.broken) {
    const top = q16(o.broken), r = T.rng(Math.round(x * 13 + z * 7 + 300));
    add(ctx, box(w, top - 0.5, w), stone, x, 0.5 + (top - 0.5) / 2, z);
    add(ctx, box(q16(w * 0.55), 0.3, q16(w * 0.6)), stone, x - w * 0.2, top + 0.15, z + w * 0.15);
    faces.forEach(([ox, oz], i) => { const sh = q16(Math.max(0.5, (top - 0.5) * (0.6 + r() * 0.5))); add(ctx, box(0.2, sh, 0.2), stone, x + ox * off, 0.5 + sh / 2, z + oz * off); });
    solid(ctx, x - pw / 2, z - pw / 2, x + pw / 2, z + pw / 2, Math.max(1.2, top));
    return top;
  }
  const top = h - 0.45;
  add(ctx, box(w, top - 0.5, w), stone, x, 0.5 + (top - 0.5) / 2, z);
  for (const [ox, oz] of faces) add(ctx, box(0.2, top - 0.5, 0.2), stone, x + ox * off, 0.5 + (top - 0.5) / 2, z + oz * off);
  add(ctx, box(pw - 0.05, 0.3, pw - 0.05), M.ashlar('#56606e'), x, top + 0.15, z);
  add(ctx, box(pw + 0.1, 0.15, pw + 0.1), M.ashlar('#5e6878'), x, top + 0.375, z);
  solid(ctx, x - pw / 2, z - pw / 2, x + pw / 2, z + pw / 2, h);
  return h;
}

// A pointed arch: the spandrel between two supports, open below. Spans a0..a1 along Z (axis 'z',
// the arch sits at x) or along X (axis 'x', at z), from the springing line ys up to the top yt.
export function arch(ctx, at, a0, a1, ys, yt, o = {}) {
  const span = q16(Math.abs(a1 - a0)), H = q16(yt - ys), t = o.thick || 0.7; const c = q16(o.c ?? span * 0.12);
  const g = geo(`narch${span},${H},${c},${t}`, () => {
    const r = span - c; const s = new THREE.Shape(); s.moveTo(0, 0); const n = 10;
    const a1L = Math.acos((c - span / 2) / r);
    for (let i = 1; i <= n; i++) { const a = Math.PI + (a1L - Math.PI) * i / n; s.lineTo(span - c + r * Math.cos(a), Math.min(H - 0.12, r * Math.sin(a))); }
    const b0 = Math.acos((span / 2 - c) / r);
    for (let i = 1; i <= n; i++) { const a = b0 - b0 * i / n; s.lineTo(c + r * Math.cos(a), Math.min(H - 0.12, r * Math.sin(a))); }
    s.lineTo(span, H); s.lineTo(0, H); s.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
  });
  const mat = M.ashlar(o.tone || '#4a5464'); const lo = Math.min(a0, a1);
  if ((o.axis || 'z') === 'z') { add(ctx, g, mat, at + t / 2, ys, lo, { ry: -Math.PI / 2 }); if (o.cornice !== false) add(ctx, box(t + 0.2, 0.2, span + 0.3), M.ashlar('#56606e'), at, yt + 0.1, lo + span / 2); }
  else { add(ctx, g, mat, lo, ys, at - t / 2); if (o.cornice !== false) add(ctx, box(span + 0.3, 0.2, t + 0.2), M.ashlar('#56606e'), lo + span / 2, yt + 0.1, at); }
}

// A broken wall: stone base, a jagged top of uneven courses, loose blocks at its foot.
export function ruin(ctx, x0, z0, x1, z1, hMin, hMax, o = {}) {
  const t = o.thick || 0.8; const mat = M.brick(o.tone || '#363f50');
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const c = alongX ? z0 : x0; const r = T.rng(o.seed ?? Math.round(a0 * 17 + c * 29 + 1000));
  let p = a0, hh = hMin + (hMax - hMin) * r();
  while (p < a1 - 0.01) {
    const len = Math.min(a1 - p, q16(0.45 + r() * 0.9));
    hh = Math.max(hMin, Math.min(hMax, hh + (r() - 0.5) * (hMax - hMin) * 0.9)); const h = q16(hh);
    if (alongX) add(ctx, box(len, h, t), mat, p + len / 2, h / 2, c); else add(ctx, box(t, h, len), mat, c, h / 2, p + len / 2);
    p += len;
  }
  const L = a1 - a0, mid = (a0 + a1) / 2;
  if (alongX) add(ctx, box(L + 0.1, 0.5, t + 0.1), M.ashlar('#38424f'), mid, 0.25, c); else add(ctx, box(t + 0.1, 0.5, L + 0.1), M.ashlar('#38424f'), c, 0.25, mid);
  const sh = o.solidH ?? Math.max(1, hMin); // solidH: how high it counts for sight lines
  if (alongX) solid(ctx, a0, c - t / 2, a1, c + t / 2, sh); else solid(ctx, c - t / 2, a0, c + t / 2, a1, sh);
  // loose blocks at its foot, on the side toward the camera unless told otherwise
  const side = o.side ?? 1; const n = o.debris ?? Math.round(L / 1.6);
  for (let i = 0; i < n; i++) {
    const pp = a0 + r() * L, off = side * (t / 2 + 0.2 + r() * 0.6), s = q16(0.2 + r() * 0.25);
    const bx = alongX ? pp : c + off, bz = alongX ? c + off : pp;
    add(ctx, box(s, q16(s * 0.7), s), M.ashlar('#3e4858'), bx, s * 0.3, bz, { ry: r() * 3, rz: (r() - 0.5) * 0.5 });
  }
}

// An outside buttress: a stepped stone pier against a wall face, capped by a slope; broken = no cap.
export function buttress(ctx, x, z, h, face = '+x', o = {}) {
  const st = M.ashlar(o.tone || '#3c4656'); const fx = face === '+x' ? 1 : 0, fz = 1 - fx; const dp = o.depth || 1.1, w = o.w || 0.9;
  const bx = x + fx * dp / 2, bz = z + fz * dp / 2;
  add(ctx, box(fx ? dp : w, q16(h), fz ? dp : w), st, bx, h / 2, bz);
  add(ctx, box(fx ? dp + 0.2 : w + 0.15, 0.5, fz ? dp + 0.2 : w + 0.15), M.ashlar('#38424f'), bx + fx * 0.1, 0.25, bz + fz * 0.1);
  if (!o.broken) {
    add(ctx, box(fx ? dp * 0.6 : w, 0.9, fz ? dp * 0.6 : w), st, bx - fx * dp * 0.2, h + 0.45, bz - fz * dp * 0.2);
    add(ctx, box(fx ? 0.9 : w + 0.1, 0.25, fz ? 0.9 : w + 0.1), M.ashlar('#4c5666'), bx + fx * 0.05, h + 0.3, bz + fz * 0.05, fx ? { rz: 0.7 } : { rx: -0.7 });
    add(ctx, cone(0.3, 0.9, 4), M.slate('#1e2633'), bx - fx * dp * 0.2, h + 1.35, bz - fz * dp * 0.2, { ry: Math.PI / 4 });
  } else add(ctx, box(fx ? dp * 0.5 : w * 0.6, 0.3, fz ? dp * 0.5 : w * 0.6), st, bx - fx * 0.2, h + 0.15, bz - fz * 0.2);
  solid(ctx, bx - (fx ? dp / 2 : w / 2), bz - (fz ? dp / 2 : w / 2), bx + (fx ? dp / 2 : w / 2), bz + (fz ? dp / 2 : w / 2), h);
}

// A heap of fallen masonry: blocks, a broken capital, a drum.
export function rubble(ctx, x, z, w, d, o = {}) {
  const r = T.rng(Math.round(x * 37 + z * 19 + 77)); const n = o.n || Math.round(w * d * 2.6) + 3; const hh = o.h || 1.1;
  const tones = ['#3e4858', '#4a5464', '#36404e', '#56606e'];
  for (let i = 0; i < n; i++) {
    const dx = (r() - 0.5) * w, dz = (r() - 0.5) * d; const f = 1 - Math.max(Math.abs(dx) / (w / 2), Math.abs(dz) / (d / 2));
    const s = q16(0.3 + r() * 0.45);
    add(ctx, box(s, q16(s * (0.55 + r() * 0.4)), q16(s * (0.7 + r() * 0.6))), M.ashlar(tones[(r() * 4) | 0]), x + dx, s * 0.25 + f * hh * 0.75, z + dz, { ry: r() * 3, rx: (r() - 0.5) * 0.7, rz: (r() - 0.5) * 0.7 });
  }
  if (o.capital !== false) add(ctx, box(1.0, 0.35, 1.0), M.ashlar('#56606e'), x + w * 0.2, 0.2, z - d * 0.15, { ry: 0.5, rz: 0.25 });
  if (o.solid !== false) solid(ctx, x - w * 0.42, z - d * 0.42, x + w * 0.42, z + d * 0.42, Math.max(1, hh));
}

// Drums of a fallen shaft, lying in a row along ry.
export function drums(ctx, x, z, ry, n = 2, o = {}) {
  const w = o.w || 0.8, st = M.ashlar(o.tone || '#4a5464'); const r = T.rng(Math.round(x * 11 + z * 5 + 9));
  for (let i = 0; i < n; i++) part(ctx, box(w, w, 0.72), st, x, z, ry, (r() - 0.5) * 0.12, w / 2 - 0.02, (i - (n - 1) / 2) * 0.82, { ry: (r() - 0.5) * 0.18 });
  solidRot(ctx, x, z, ry, w / 2, n * 0.41, w);
}

// A heavy roof timber lying where it fell.
export function beam(ctx, x, z, len, ry = 0, o = {}) {
  const wood = M.wood(o.tone || '#33261c');
  add(ctx, box(0.36, 0.36, len), wood, x, 0.2, z, { ry, rx: o.tilt || 0.05 });
  if (o.solid !== false) solidRot(ctx, x, z, ry, 0.2, len / 2, 0.6);
}

// Roof timbers still hanging off a wall top, broken off, sloping toward +X (dir 1) or -X.
export function rafters(ctx, x, y, zs, dir = 1) {
  const wood = M.wood('#2c221a'); const r = T.rng(Math.round(x * 7 + y * 3 + zs.length));
  for (const z of zs) { const L = q16(1.4 + r() * 2.2), a = 0.55 + r() * 0.3; add(ctx, box(L, 0.28, 0.28), wood, x + Math.cos(a) * L / 2 * dir, y + Math.sin(a) * L / 2, z, { rz: a * dir }); }
}

// ---------------------------------------------------------------- furniture
// A pew facing -Z (toward the altar): seat, back, ends, kneeler. kind: 'up', 'tipped' (fallen on
// its back toward +Z) or 'broken' (half of it gone).
export function pew(ctx, x, z, o = {}) {
  const len = o.len || 1.9, ry = o.ry || 0, kind = o.kind || 'up'; const wood = M.wood(o.tone || '#3e2c20'), dark = M.wood('#2e2018');
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  if (kind === 'tipped') {
    P(box(len, 0.06, 0.58), wood, 0, 0.03, 0.45);
    P(box(len, 0.42, 0.07), wood, 0, 0.24, 0.12);
    for (const s of [-1, 1]) P(box(0.07, 0.48, 0.95), dark, s * len / 2, 0.24, 0.3);
    solidRot(ctx, x + Math.sin(ry) * 0.3, z + Math.cos(ry) * 0.3, ry, len / 2 + 0.04, 0.5, 0.6);
    return;
  }
  const l = kind === 'broken' ? len * 0.55 : len, sh = kind === 'broken' ? -len * 0.22 : 0;
  P(box(l, 0.07, 0.42), wood, sh, 0.45, 0);
  P(box(l, 0.55, 0.06), wood, sh, 0.78, 0.2);
  P(box(l, 0.06, 0.12), dark, sh, 0.14, -0.34);
  P(box(0.07, 0.98, 0.52), dark, sh - l / 2, 0.49, 0.02);
  if (kind !== 'broken') P(box(0.07, 0.98, 0.52), dark, len / 2, 0.49, 0.02);
  else { P(box(len * 0.3, 0.07, 0.42), wood, len * 0.3, 0.12, 0.05, { rz: 0.35 }); P(box(0.07, 0.6, 0.52), dark, len * 0.42, 0.18, 0.1, { rz: 1.2 }); }
  solidRot(ctx, x, z, ry, len / 2, 0.3, 1.0);
}

// A great iron chandelier fallen flat: rings, spokes, candle cups; a few candles still burn.
export function chandelier(ctx, x, z, o = {}) {
  const R = o.r || 1.4, tilt = o.tilt ?? 0.12, iron = M.ironLit(); const lit = o.lit ?? 3;
  const ring = geo(`chring${R}`, () => new THREE.TorusGeometry(R, 0.07, 4, 24));
  const inner = geo(`chring${R * 0.5}`, () => new THREE.TorusGeometry(R * 0.5, 0.05, 4, 16));
  add(ctx, ring, iron, x, 0.22, z, { rx: Math.PI / 2 + tilt, rz: 0.2 });
  add(ctx, inner, iron, x, 0.3, z, { rx: Math.PI / 2 + tilt * 0.6 });
  add(ctx, cyl(0.16, 0.22, 0.4, 6), iron, x, 0.3, z, { rz: 1.3 });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(ctx, box(0.05, 0.05, R), iron, x + Math.sin(a) * R * 0.5, 0.22 + Math.cos(a) * tilt * 0.4, z + Math.cos(a) * R * 0.5, { ry: a }); }
  const wax = M.flat(0xcfc6ae), flame = M.glow('#ffc060', 3);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.13; const cx = x + Math.sin(a) * R, cz = z + Math.cos(a) * R; const cy = 0.22 + Math.cos(a) * Math.sin(tilt) * R;
    inst(ctx, 'chcup', cyl(0.08, 0.05, 0.08, 5), iron, mat4(cx, cy + 0.06, cz));
    if (i % 3 === 0) { inst(ctx, 'chwax', cyl(0.04, 0.045, 0.22, 5), wax, mat4(cx, cy + 0.2, cz)); if (i / 3 < lit) inst(ctx, 'chflame', box(0.05, 0.09, 0.05), flame, mat4(cx, cy + 0.36, cz)); }
    else inst(ctx, 'chstub', cyl(0.04, 0.045, 0.08, 5), wax, mat4(cx, cy + 0.12, cz, 0, 0.4, 0.3));
  }
  // the chain it hung by, in a heap
  for (let i = 0; i < 9; i++) inst(ctx, 'chain', geo('link', () => new THREE.TorusGeometry(0.09, 0.025, 3, 6)), iron, mat4(x + R * 0.9 + (i % 3) * 0.12, 0.06 + Math.floor(i / 3) * 0.05, z - R * 0.6 + i * 0.14, i * 0.9, Math.PI / 2, i * 0.5));
  if (lit) ctx.lights.push({ x, y: 0.9, z, color: 0xffa04a, intensity: 2.6, dist: 4.5, flicker: 0.2 });
  solidCircle(ctx, x, z, R + 0.12, 1.0);
}

// A cluster of candles on the floor or a ledge. The drowned burn teal.
export function candles(ctx, x, z, o = {}) {
  const n = o.n || 5, sp = o.spread || 0.35, y = o.y || 0, col = o.color || TEAL; const r = T.rng(Math.round(x * 41 + z * 23 + n));
  const wax = M.flat(0xcfc6ae), flame = M.glow(col, 3.2); const hs = [0.14, 0.24, 0.36];
  for (let i = 0; i < n; i++) {
    const cx = x + (r() - 0.5) * 2 * sp, cz = z + (r() - 0.5) * 2 * sp; const k = (r() * 3) | 0, hh = hs[k];
    inst(ctx, 'cwax' + k, cyl(0.04, 0.05, hh, 5), wax, mat4(cx, y + hh / 2, cz));
    inst(ctx, 'cflame' + col, box(0.05, 0.09, 0.05), flame, mat4(cx, y + hh + 0.05, cz));
  }
  if (o.light !== false) ctx.lights.push({ x, y: y + 0.8, z, color: new THREE.Color(col).getHex(), intensity: o.intensity || 2.6, dist: o.dist || 5, flicker: 0.12, halo: !!o.halo });
}

// A tall iron candle stand with three candles.
export function candelabrum(ctx, x, z, o = {}) {
  const col = o.color || TEAL, iron = M.ironLit(); const ry = o.ry || 0.6;
  add(ctx, cone(0.32, 0.3, 6), iron, x, 0.15, z);
  add(ctx, cyl(0.035, 0.05, 1.7, 5), iron, x, 1.0, z);
  add(ctx, box(0.9, 0.05, 0.05), iron, x, 1.82, z, { ry });
  const wax = M.flat(0xcfc6ae), flame = M.glow(col, 3.2);
  for (const k of [-1, 0, 1]) {
    const cx = x + Math.cos(ry) * k * 0.42, cz = z - Math.sin(ry) * k * 0.42;
    inst(ctx, 'cdcup', cyl(0.07, 0.04, 0.06, 5), iron, mat4(cx, 1.86, cz));
    inst(ctx, 'cdwax', cyl(0.04, 0.045, 0.26, 5), wax, mat4(cx, 2.02, cz));
    inst(ctx, 'cflame' + col, box(0.05, 0.09, 0.05), flame, mat4(cx, 2.2, cz));
  }
  ctx.lights.push({ x, y: 2.3, z, color: new THREE.Color(col).getHex(), intensity: o.intensity || 3.2, dist: o.dist || 6.5, flicker: 0.1, halo: true });
  solidCircle(ctx, x, z, 0.32, 2);
}

// The high altar on its dais (front toward +Z): three steps, the block, the frontal, candles.
export function altar(ctx, x, z, o = {}) {
  const w = o.w || 6.4, d = o.d || 3.8; const st = M.ashlar('#4c5666'), hi = M.ashlar('#5a6474');
  add(ctx, box(w + 0.8, 0.2, d), st, x, 0.1, z);
  add(ctx, box(w + 0.4, 0.2, d - 0.6), st, x, 0.3, z - 0.3);
  add(ctx, box(w, 0.2, d - 1.2), hi, x, 0.5, z - 0.6);
  const az = z - 0.5;
  add(ctx, box(2.6, 1.0, 1.0), M.ashlar('#5e6878'), x, 1.1, az);
  for (const s of [-1, 1]) add(ctx, box(0.24, 1.0, 0.24), M.ashlar('#4a5464'), x + s * 1.2, 1.1, az + 0.45);
  add(ctx, box(3.0, 0.14, 1.3), M.ashlar('#6a7484'), x, 1.67, az);
  add(ctx, box(1.7, 0.78, 0.03), M.flat(0x15363a), x, 1.16, az + 0.52);
  add(ctx, box(0.5, 0.1, 0.031), M.flat(0x8a7a50), x, 1.42, az + 0.53);
  // a reliquary, and a tall cross behind
  add(ctx, box(0.6, 0.45, 0.4), M.flat(0x6a5a3a, { emissive: 0x1a1408 }), x, 1.97, az - 0.1);
  add(ctx, box(0.12, 2.6, 0.12), M.ironLit(), x, 2.9, az - 0.55);
  add(ctx, box(1.1, 0.12, 0.12), M.ironLit(), x, 3.6, az - 0.55);
  candles(ctx, x - 1.05, az, { n: 4, spread: 0.2, y: 1.74, light: false });
  candles(ctx, x + 1.05, az, { n: 4, spread: 0.2, y: 1.74, light: false });
  solid(ctx, x - (w + 0.8) / 2, z - d / 2, x + (w + 0.8) / 2, z + d / 2, 1.7);
}

// The font, still holding a little light.
export function font(ctx, x, z) {
  add(ctx, box(1.3, 0.25, 1.3), M.ashlar('#3e4858'), x, 0.125, z);
  add(ctx, cyl(0.28, 0.36, 0.55, 8), M.ashlar('#4a5464'), x, 0.52, z);
  add(ctx, cyl(0.78, 0.56, 0.45, 8), M.ashlar('#56606e'), x, 1.0, z);
  add(ctx, cyl(0.64, 0.64, 0.02, 8), M.glow('#2a8278', 1.1), x, 1.21, z, { cast: false });
  solidCircle(ctx, x, z, 0.8, 1.2);
}

// One of the great west doors, burst in by the tide and lying in the water.
export function doorSlab(ctx, x, z, ry) {
  part(ctx, box(1.5, 0.12, 3.4), M.wood('#3a281c'), x, z, ry, 0, 0.06, 0);
  for (const oz of [-1.1, 0, 1.1]) part(ctx, box(1.52, 0.13, 0.09), M.iron(), x, z, ry, 0, 0.07, oz);
}

// ---------------------------------------------------------------- souls
// Motes of drowned light drifting over the water. regions: [x0, z0, x1, z1, n].
export function souls(ctx, regions) {
  const r = T.rng(4242); const base = [];
  for (const [x0, z0, x1, z1, n] of regions) for (let i = 0; i < n; i++) base.push([x0 + r() * (x1 - x0), 0.25 + r() * 1.4, z0 + r() * (z1 - z0), r() * 10]);
  const pos = new Float32Array(base.length * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: new THREE.Color(0.45, 2.3, 2.1), size: 2, sizeAttenuation: false, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const p = new THREE.Points(g, m); p.frustumCulled = false; ctx.group.add(p);
  let t = 0;
  const step = () => {
    for (let i = 0; i < base.length; i++) { const [x, y, z, ph] = base[i]; pos[i * 3] = x + Math.sin(t * 0.31 + ph) * 0.5; pos[i * 3 + 1] = y + Math.sin(t * 0.9 + ph * 2) * 0.22; pos[i * 3 + 2] = z + Math.cos(t * 0.27 + ph) * 0.5; }
    g.attributes.position.needsUpdate = true;
  };
  step(); ctx.anims.push({ update(dt) { t += dt; step(); return false; } });
}
