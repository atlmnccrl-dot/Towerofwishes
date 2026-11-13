// Props for District V, the Undercroft: tall far walls lined with bones (a skull-and-bone pattern drawn
// in code) that fade into the dark where the vault would be, low broken stubs on the near sides, burial
// niches with candle stubs, sarcophagi with stone effigies, bone piles and skull mounds, collapsed
// passages, the underground stream with its culvert and footbridge, the light that falls through the
// street grates above, and the bone pillars and the ring of names in the Ossuary.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane, water } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';

export const H = 6.2;                    // tall walls: above them the vault is lost in the dark
const FADE_PX = 52, FADE_H = FADE_PX / 16, FADE0 = H + 0.3 - FADE_H; // the dark on the walls
export const WATER_Y = -0.35;
const q16 = (v) => Math.round(v * 16) / 16;

// ---------------------------------------------------------------- helpers
const texCache = new Map(), matCache = new Map();
function pix(key, w, h, draw, repeat = false) {
  if (!texCache.has(key)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
const mat = (key, fn) => { if (!matCache.has(key)) matCache.set(key, fn()); return matCache.get(key); };
const dotter = (g, W) => (x, y, c) => { g.fillStyle = c; g.fillRect(((x % W) + W) % W, y, 1, 1); };

// A plane whose texture repeats at 16 texels per metre (tw x th: the texture's size in texels).
function uvPlane(w, h, tw, th) {
  return geo(`ucuv${w},${h},${tw},${th}`, () => {
    const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 16 / tw, uv.getY(i) * h * 16 / th);
    return g;
  });
}
// A part at a local offset of a prop turned by ry around (x, z).
function part(ctx, g, m, x, z, ry, lx, ly, lz, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return add(ctx, g, m, x + lx * c + lz * s, ly, z - lx * s + lz * c, { ...o, ry: ry + (o.ry || 0) || undefined });
}
function solidRot(ctx, x, z, ry, hw, hd, h) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  solid(ctx, x - (c * hw + s * hd), z - (s * hw + c * hd), x + (c * hw + s * hd), z + (s * hw + c * hd), h);
}

// ---------------------------------------------------------------- textures
const BONE = { hi: '#a8a08c', base: '#888170', mid: '#6e6858', lo: '#4e493e', gap: '#1a1816', eye: '#0b0a09' };
// The ossuary wall: bands of skulls between packed bone ends and courses of long bones (4 m x 3 m).
function boneTex() {
  return pix('uc-bone', 64, 48, (g, W) => {
    const r = T.rng(501), C = BONE, d = dotter(g, W);
    g.fillStyle = C.gap; g.fillRect(0, 0, W, 48);
    const SK = ['.hhh.', 'bhhhb', 'meBem', 'lmeml', '.l.l.'];
    const col = { h: C.hi, b: C.base, B: C.base, m: C.mid, l: C.lo, e: C.eye };
    const skull = (x, y) => SK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') d(x + i, y + j, col[ch]); }));
    const knob = (x, y) => { d(x, y, C.base); d(x + 1, y, C.hi); d(x, y + 1, C.mid); d(x + 1, y + 1, C.lo); };
    const skulls = (y, off) => { for (let k = 0; k < 10; k++) { const x = off + 1 + k * 6; if (r() < 0.07) { knob(x + 1, y + 1); knob(x + 2, y + 3); } else skull(x, y); } knob(off + 61, y + 1); knob(off + 61, y + 3); };
    const ends = (y0, rows) => { for (let j = 0; j < rows; j++) { const y = y0 + j * 3; for (let x = (j % 2) * 2; x < W; x += 4) { if (r() < 0.07) continue; const v = r() < 0.35; d(x, y, C.base); d(x + 1, y, v ? C.base : C.hi); d(x + 2, y, C.mid); d(x, y + 1, C.mid); d(x + 1, y + 1, C.base); d(x + 2, y + 1, C.lo); } } };
    const longs = (y0) => {
      const x0 = (r() * 6) | 0; let x = x0;
      while (x < W + x0 - 4) {
        const L = Math.min(7 + ((r() * 8) | 0), W + x0 - x - 1);
        for (let xx = x + 2; xx < x + L - 2; xx++) { d(xx, y0 + 1, C.base); d(xx, y0 + 2, C.mid); }
        for (const kx of [x, x + L - 2]) for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 2; xx++) d(kx + xx, y0 + yy, yy === 0 ? C.hi : (yy === 3 ? C.lo : C.base));
        x += L + 1;
      }
    };
    skulls(1, 0); ends(7, 3); longs(16); skulls(21, 3); ends(27, 3); longs(36); skulls(41, 1); ends(46, 1);
  }, true);
}
function boneMat() { return mat('bone', () => cutout(new THREE.MeshLambertMaterial({ map: boneTex() }))); }

// A burial niche (loculus) cut into the bones: a dark arched recess with a skull; lit ones hold a
// candle stub and glow warm inside. 14 x 22 texels.
function nicheTex(lit, emissive) {
  return pix('uc-niche' + lit + emissive, 14, 22, (g, W, Hh) => {
    const d = dotter(g, W); const cx = 6.5, top = 6.5;
    const inside = (x, y) => x >= 0 && x < W && y >= 0 && y < Hh && (y >= top || (x - cx) ** 2 + ((y - top) * 1.15) ** 2 <= 6.6 ** 2);
    const SK = ['.###.', '#####', '#.#.#', '##.##'];
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || x === 0 || x === W - 1;
      let c;
      if (edge) c = emissive ? '#000000' : (y < 9 ? '#5a6272' : '#454c5a');
      else if (y >= Hh - 2) c = emissive ? '#000000' : (y === Hh - 2 ? '#4e5664' : '#383e4a');
      else if (lit) { const k = Math.max(0, 1 - Math.hypot(x - cx, (y - 17) * 0.8) / 11); const v = Math.round(k * 4) / 4; c = ['#140e0a', '#2e1a0e', '#5a3214', '#8a5420', '#b87a30'][Math.round(v * 4)]; }
      else c = emissive ? '#000000' : (y < 8 ? '#0a0b0d' : '#121315');
      d(x, y, c);
    }
    if (!emissive) SK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') d(lit ? 1 + i : 4 + i, 15 + j, j === 0 ? '#8a8474' : '#6a6456'); else d(lit ? 1 + i : 4 + i, 15 + j, BONE.eye); }));
  });
}
function nicheMat(lit) {
  return mat('niche' + lit, () => cutout(new THREE.MeshLambertMaterial(lit ? { map: nicheTex(true, false), emissive: 0xffffff, emissiveMap: nicheTex(true, true), emissiveIntensity: 1.1, alphaTest: 0.5 } : { map: nicheTex(false, false), alphaTest: 0.5 })));
}

// The dark that swallows the tops of the walls: a dithered (Bayer) fall-off to black.
function fadeMat() {
  return mat('fade', () => {
    const t = pix('uc-fade', 16, FADE_PX, (g, W, Hh) => {
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; g.fillStyle = '#000000';
      for (let y = 0; y < Hh; y++) { const a = Math.min(1, Math.pow(1 - y / (Hh - 1), 1.15) * 1.3); for (let x = 0; x < W; x++) if ((B[(y % 4) * 4 + (x % 4)] + 0.5) / 16 < a) g.fillRect(x, y, 1, 1); }
    }, true);
    return cutout(new THREE.MeshLambertMaterial({ color: 0x000000, map: t, alphaTest: 0.5, fog: false }));
  });
}
function blackMat() { return mat('black', () => cutout(new THREE.MeshLambertMaterial({ color: 0x000000, fog: false }))); }

// ---------------------------------------------------------------- bones
const SKULL = () => box(0.2, 0.17, 0.22), EYES = () => box(0.14, 0.05, 0.012), LONGBONE = () => box(0.055, 0.055, 0.44), KNOB = () => box(0.1, 0.08, 0.09);
const _e = new THREE.Euler(), _v = new THREE.Vector3();
// A skull facing local +Z (ry turns it), its sockets a dark band on the face.
export function skull(ctx, x, y, z, ry = 0, rx = 0, rz = 0) {
  inst(ctx, 'uc-skull', SKULL(), M.flat(0x9c9686), mat4(x, y, z, ry, rx, rz));
  _e.set(rx, ry, rz); _v.set(0, 0.012, 0.111).applyEuler(_e);
  inst(ctx, 'uc-eyes', EYES(), M.flat(0x0c0b0a), mat4(x + _v.x, y + _v.y, z + _v.z, ry, rx, rz));
}
export function bone(ctx, x, y, z, ry = 0, rx = 0, rz = 0) {
  inst(ctx, 'uc-lbone', LONGBONE(), M.flat(0x8c8676), mat4(x, y, z, ry, rx, rz));
  _e.set(rx, ry, rz);
  for (const s of [-1, 1]) { _v.set(0, 0, s * 0.22).applyEuler(_e); inst(ctx, 'uc-knob', KNOB(), M.flat(0x9a9484), mat4(x + _v.x, y + _v.y, z + _v.z, ry, rx, rz)); }
}
// Bones and skulls strewn in a loose heap of radius r; skulls turned toward the camera.
export function bonePile(ctx, x, z, r = 0.8, n = 10, o = {}) {
  const R = T.rng(Math.round(x * 53 + z * 31 + n));
  for (let i = 0; i < n; i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r, h = (1 - d / r) * (o.h ?? 0.25);
    bone(ctx, x + Math.sin(a) * d, 0.04 + h, z + Math.cos(a) * d, R() * Math.PI, (R() - 0.5) * 0.3, (R() - 0.5) * 0.3);
  }
  for (let i = 0; i < Math.ceil(n / 3); i++) {
    const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r * 0.85, h = (1 - d / r) * (o.h ?? 0.25);
    skull(ctx, x + Math.sin(a) * d, 0.1 + h, z + Math.cos(a) * d, 0.2 + R() * 1.2, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5);
  }
  if (o.solid) solidCircle(ctx, x, z, r * 0.7, 0.6);
}
// A mound of skulls stacked in rings, all staring at the camera.
export function skullMound(ctx, x, z, r = 1.1, layers = 5, o = {}) {
  const R = T.rng(Math.round(x * 17 + z * 29 + 5)); const half = o.half; // half: against a wall behind (-Z or -X side cut)
  for (let k = 0; k < layers; k++) {
    const rr = r * (1 - k / layers), y = 0.09 + k * 0.16; const n = Math.max(1, Math.round(rr * Math.PI * 2 / 0.22));
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + k * 0.4; const sx = Math.sin(a) * rr, sz = Math.cos(a) * rr;
      if (half === 'z' && sz < -0.05) continue; if (half === 'x' && sx < -0.05) continue;
      skull(ctx, x + sx, y, z + sz, 0.35 + R() * 0.9, (R() - 0.5) * 0.2, (R() - 0.5) * 0.2);
    }
  }
  if (o.solid !== false) solidCircle(ctx, x, z, r * 0.85, 0.8);
}
// A stone bin heaped with long bones, along 'x' or 'z'.
export function ossuaryBin(ctx, x, z, along = 'z', len = 2.2) {
  const ax = along === 'x'; const w = 0.9; const st = M.ashlar('#4a5260'); const R = T.rng(Math.round(x * 7 + z * 13));
  const B = (a0, a1, b0, b1, y0, y1, m) => add(ctx, box(ax ? a1 - a0 : b1 - b0, y1 - y0, ax ? b1 - b0 : a1 - a0), m, ax ? x + (a0 + a1) / 2 : x + (b0 + b1) / 2, (y0 + y1) / 2, ax ? z + (b0 + b1) / 2 : z + (a0 + a1) / 2);
  B(-len / 2, len / 2, -w / 2, -w / 2 + 0.14, 0, 0.62, st); B(-len / 2, len / 2, w / 2 - 0.14, w / 2, 0, 0.62, st);
  B(-len / 2, -len / 2 + 0.14, -w / 2, w / 2, 0, 0.62, st); B(len / 2 - 0.14, len / 2, -w / 2, w / 2, 0, 0.62, st);
  B(-len / 2, len / 2, -w / 2 + 0.14, w / 2 - 0.14, 0, 0.4, M.flat(0x1a1816));
  for (let i = 0; i < Math.round(len * 5); i++) { const a = (R() - 0.5) * (len - 0.4), b = (R() - 0.5) * (w - 0.4); bone(ctx, ax ? x + a : x + b, 0.48 + R() * 0.14, ax ? z + b : z + a, (ax ? Math.PI / 2 : 0) + (R() - 0.5) * 0.5, (R() - 0.5) * 0.2, 0); }
  for (let i = 0; i < 3; i++) { const a = (R() - 0.5) * (len - 0.6); skull(ctx, ax ? x + a : x, 0.66, ax ? z : z + a, 0.5 + R() * 0.6); }
  if (ax) solid(ctx, x - len / 2, z - w / 2, x + len / 2, z + w / 2, 0.7); else solid(ctx, x - w / 2, z - len / 2, x + w / 2, z + len / 2, 0.7);
}

// ---------------------------------------------------------------- candles
// Candle stubs (warm): wax and a flame each, on the floor, a sill or a lid.
export function candles(ctx, x, y, z, o = {}) {
  const n = o.n || 4, sp = o.spread ?? 0.22; const R = T.rng(Math.round(x * 41 + z * 23 + y * 7 + n));
  const wax = M.flat(0xcfc6ae), flame = M.glow('#ffc070', 3.2), hs = [0.07, 0.13, 0.21];
  for (let i = 0; i < n; i++) {
    const cx = x + (R() - 0.5) * 2 * sp * (o.ax ?? 1), cz = z + (R() - 0.5) * 2 * sp * (o.az ?? 1); const k = (R() * (o.tall ? 3 : 2.2)) | 0, hh = hs[k];
    inst(ctx, 'uc-wax' + k, cyl(0.035, 0.045, hh, 5), wax, mat4(cx, y + hh / 2, cz));
    inst(ctx, 'uc-flame', box(0.045, 0.08, 0.045), flame, mat4(cx, y + hh + 0.045, cz));
  }
  if (o.light) ctx.lights.push({ x: x + (o.lx || 0), y: y + 0.6, z: z + (o.lz || 0), color: 0xff9c48, intensity: o.intensity || 2.4, dist: o.dist || 5, flicker: 0.15, halo: !!o.halo });
}
// An iron votive stand: two tiers of candles.
export function votive(ctx, x, z, o = {}) {
  const iron = M.ironLit();
  for (const s of [-1, 1]) add(ctx, box(0.05, 1.1, 0.05), iron, x + s * 0.55, 0.55, z);
  add(ctx, box(1.2, 0.05, 0.3), iron, x, 0.75, z); add(ctx, box(1.2, 0.05, 0.3), iron, x, 1.05, z - 0.08);
  candles(ctx, x, 0.78, z, { n: 7, spread: 0.5, az: 0.25 }); candles(ctx, x, 1.08, z - 0.08, { n: 5, spread: 0.45, az: 0.2, light: o.light, intensity: 2.6, dist: 5.5, halo: o.halo });
  solid(ctx, x - 0.62, z - 0.2, x + 0.62, z + 0.2, 1.1);
}

// ---------------------------------------------------------------- walls
// A pointed arch over an opening: the spandrel from the springing (y 0) up to the wall top, span s.
function spandrelGeo(s, hs, t) {
  return geo(`ucsp${s},${hs},${t}`, () => {
    const r = s * 0.75, sh = new THREE.Shape(), n = 8; sh.moveTo(0, 0);
    const aL = Math.acos((s / 2 - r) / r), bR = Math.acos((r - s / 2) / r);
    for (let i = 1; i <= n; i++) { const a = Math.PI + (aL - Math.PI) * i / n; sh.lineTo(r + r * Math.cos(a), Math.min(hs - 0.05, r * Math.sin(a))); }
    for (let i = 1; i <= n; i++) { const b = bR - bR * i / n; sh.lineTo(s - r + r * Math.cos(b), Math.min(hs - 0.05, r * Math.sin(b))); }
    sh.lineTo(s, hs); sh.lineTo(0, hs); sh.lineTo(0, 0);
    return new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
  });
}

// A tall far wall from (x0,z0) to (x1,z1): along X it faces +z, along Z it faces +x. Bones from 0.5 to
// 3.5 m, burial niches every 2 m, pilasters every `bay` m, a string course, and above it the dark.
// gaps: [{ a0, a1, ys }] openings along the wall (an arch springs at ys). lit: niche indices that hold
// candles; lights: the lit niches that also cast light. Returns { face, niches }.
export function tallWall(ctx, x0, z0, x1, z1, o = {}) {
  const t = o.thick || 0.8, Hh = H; const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const c = alongX ? z0 : x0, f = c + t / 2; const gaps = (o.gaps || []).slice().sort((p, q) => p.a0 - q.a0);
  const core = M.brick(o.tone || '#262d39'), baseM = M.ashlar('#343c4a'), trim = M.ashlar('#4a5262');
  const B = (p0, p1, y0, y1, d0, d1, m, oo) => alongX ? add(ctx, box(p1 - p0, y1 - y0, d1 - d0), m, (p0 + p1) / 2, (y0 + y1) / 2, (d0 + d1) / 2, oo) : add(ctx, box(d1 - d0, y1 - y0, p1 - p0), m, (d0 + d1) / 2, (y0 + y1) / 2, (p0 + p1) / 2, oo);
  const S = (p0, p1, d0, d1, h) => alongX ? solid(ctx, p0, d0, p1, d1, h) : solid(ctx, d0, p0, d1, p1, h);
  const F = (g, m, p, y, off, oo = {}) => alongX ? add(ctx, g, m, p, y, f + off, { cast: false, ...oo }) : add(ctx, g, m, f + off, y, p, { cast: false, ry: Math.PI / 2, ...oo });
  const inGap = (p, pad) => gaps.some((g) => p > g.a0 - pad && p < g.a1 + pad);
  const pieces = []; let p = a0; for (const g of gaps) { if (g.a0 > p) pieces.push([p, g.a0]); p = Math.max(p, g.a1); } if (p < a1) pieces.push([p, a1]);
  for (const [p0, p1] of pieces) {
    B(p0, p1, 0, Hh, c - t / 2, f, core);
    B(p0, p1, 0, 0.5, c - t / 2 - 0.05, f + 0.06, baseM);
    S(p0, p1, c - t / 2, f, Hh);
    if (o.bones !== false && p1 - p0 > 0.3) { F(uvPlane(q16(p1 - p0), 3, 64, 48), boneMat(), (p0 + p1) / 2, 2.0, 0.012); B(p0, p1, 3.5, 3.68, f, f + 0.2, trim); }
  }
  for (const g of gaps) {
    const s = q16(g.a1 - g.a0);
    if (alongX) add(ctx, spandrelGeo(s, q16(Hh - g.ys), t), core, g.a0, g.ys, c - t / 2); else add(ctx, spandrelGeo(s, q16(Hh - g.ys), t), core, c + t / 2, g.ys, g.a0, { ry: -Math.PI / 2 });
    const mid = (g.a0 + g.a1) / 2, apex = g.ys + s * 0.707; B(mid - 0.16, mid + 0.16, apex - 0.1, apex + 0.34, f - 0.05, f + 0.1, trim);
    if (g.ys > 0.5) for (const e of [g.a0, g.a1]) B(e - 0.14, e + 0.14, 0, g.ys + 0.2, f - 0.02, f + 0.14, trim);
  }
  // pilasters
  const pil = [];
  if (o.bay) { const n = Math.max(1, Math.round((a1 - a0) / o.bay)); for (let i = 0; i <= n; i++) { const pp = a0 + (a1 - a0) * i / n; if (inGap(pp, 0.6) || (i === 0 && o.skipStart) || (i === n && o.skipEnd)) continue; B(pp - 0.28, pp + 0.28, 0, Hh, f, f + 0.3, M.ashlar('#384050')); B(pp - 0.36, pp + 0.36, 0, 0.7, f, f + 0.4, baseM); S(pp - 0.36, pp + 0.36, f, f + 0.4, Hh); pil.push(pp); } }
  // niches
  const niches = []; const step = o.nicheStep || 2;
  if (o.niches !== false) for (let pp = a0 + step / 2; pp < a1 - 0.5; pp += step) {
    if (inGap(pp, 0.75) || pil.some((q) => Math.abs(q - pp) < 0.8) || pp < a0 + 0.7 || pp > a1 - 0.7 || (o.skip || []).some(([s0, s1]) => pp > s0 && pp < s1)) continue;
    const i = niches.length, lit = (o.lit || []).includes(i);
    F(plane(0.875, 1.375), nicheMat(lit), pp, 1.75, 0.024); B(pp - 0.5, pp + 0.5, 0.98, 1.08, f, f + 0.18, trim);
    if (lit) { const [cx, cz] = alongX ? [pp, f + 0.09] : [f + 0.09, pp]; candles(ctx, cx, 1.08, cz, { n: 3, spread: 0.2, ax: alongX ? 1 : 0.2, az: alongX ? 0.2 : 1, light: (o.lights || []).includes(i), lx: alongX ? 0 : 0.5, lz: alongX ? 0.5 : 0, intensity: 2.2, dist: 5 }); }
    niches.push(pp);
  }
  // the dark above: a dithered fall-off in front of the face and pilasters, a black cap, the near end
  const L = a1 - a0 + 0.8, mid = (a0 + a1) / 2;
  F(uvPlane(q16(L), FADE_H, 16, FADE_PX), fadeMat(), mid, FADE0 + FADE_H / 2, 0.34);
  const dc = (c - t / 2 + f + 0.36) / 2, dw = t + 0.36;
  if (alongX) add(ctx, plane(L, dw), blackMat(), mid, Hh + 0.3, dc, { rx: -Math.PI / 2, cast: false }); else add(ctx, plane(dw, L), blackMat(), dc, Hh + 0.3, mid, { rx: -Math.PI / 2, cast: false });
  if (o.endFade !== false) { if (alongX) add(ctx, uvPlane(q16(dw), FADE_H, 16, FADE_PX), fadeMat(), a1 + 0.41, FADE0 + FADE_H / 2, dc, { ry: Math.PI / 2, cast: false }); else add(ctx, uvPlane(q16(dw), FADE_H, 16, FADE_PX), fadeMat(), dc, FADE0 + FADE_H / 2, a1 + 0.41, { cast: false }); }
  return { face: f, niches };
}

// A low broken wall on a near side: jagged courses, loose blocks and bones at its foot (room side).
export function stub(ctx, x0, z0, x1, z1, hMin = 0.5, hMax = 1.5, o = {}) {
  const t = o.thick || 0.7, m = M.brick(o.tone || '#333b48'); const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1), c = alongX ? z0 : x0;
  const R = T.rng(o.seed ?? Math.round(a0 * 17 + c * 29 + 2000)); let p = a0, hh = hMin + (hMax - hMin) * R();
  while (p < a1 - 0.01) {
    const len = Math.min(a1 - p, q16(0.4 + R() * 0.9)); hh = Math.max(hMin, Math.min(hMax, hh + (R() - 0.5) * (hMax - hMin) * 0.9)); const h = q16(hh);
    if (alongX) add(ctx, box(len, h, t), m, p + len / 2, h / 2, c); else add(ctx, box(t, h, len), m, c, h / 2, p + len / 2);
    p += len;
  }
  const L = a1 - a0, md = (a0 + a1) / 2;
  if (alongX) add(ctx, box(L + 0.1, 0.4, t + 0.1), M.ashlar('#343c4a'), md, 0.2, c); else add(ctx, box(t + 0.1, 0.4, L + 0.1), M.ashlar('#343c4a'), c, 0.2, md);
  if (alongX) solid(ctx, a0, c - t / 2, a1, c + t / 2, o.solidH ?? 1.2); else solid(ctx, c - t / 2, a0, c + t / 2, a1, o.solidH ?? 1.2);
  const side = o.side ?? -1, n = o.debris ?? Math.round(L / 1.8);
  for (let i = 0; i < n; i++) {
    const pp = a0 + R() * L, off = side * (t / 2 + 0.2 + R() * 0.5), s = q16(0.18 + R() * 0.22);
    add(ctx, box(s, q16(s * 0.7), s), M.ashlar('#3a4250'), alongX ? pp : c + off, s * 0.3, alongX ? c + off : pp, { ry: R() * 3, rz: (R() - 0.5) * 0.5 });
    if (R() < 0.5) bone(ctx, alongX ? pp + 0.3 : c + off * 1.3, 0.04, alongX ? c + off * 1.3 : pp + 0.3, R() * 3);
  }
}

// ---------------------------------------------------------------- iron and stone
// An iron grille's sightline: out of lowSolids and 0.6 m thick, so the dead cannot see through the bars
// (sim.sees samples every 0.5 m); an open gate still lets them see.
export function opaque(ctx, s, axis = 'x') {
  const i = ctx.lowSolids.indexOf(s); if (i >= 0) ctx.lowSolids.splice(i, 1);
  const c = axis === 'x' ? (s.z0 + s.z1) / 2 : (s.x0 + s.x1) / 2;
  if (axis === 'x') { s.z0 = c - 0.3; s.z1 = c + 0.3; } else { s.x0 = c - 0.3; s.x1 = c + 0.3; }
}
// A square stone pier where a grille meets a wall.
export function pier(ctx, x, z, h = 3.2, w = 0.8) {
  add(ctx, box(w, h, w), M.ashlar('#3c4452'), x, h / 2, z); add(ctx, box(w + 0.14, 0.18, w + 0.14), M.ashlar('#56606e'), x, h + 0.09, z);
  add(ctx, cone(w * 0.5, 0.6, 4), M.ashlar('#4a5262'), x, h + 0.48, z, { ry: Math.PI / 4 });
  solid(ctx, x - w / 2, z - w / 2, x + w / 2, z + w / 2, h);
}
// Vertical iron bars across an opening from p0 to p1 along X (axis 'x') or Z, at c.
export function bars(ctx, p0, p1, c, y0, y1, axis = 'x') {
  const iron = M.ironLit(); const n = Math.round((p1 - p0) / 0.2), h = y1 - y0;
  for (let i = 1; i < n; i++) { const p = p0 + (p1 - p0) * i / n; inst(ctx, 'uc-bar' + h, box(0.05, h, 0.05), iron, axis === 'x' ? mat4(p, y0 + h / 2, c) : mat4(c, y0 + h / 2, p)); }
  for (const y of [y0 + 0.15, y1 - 0.12]) add(ctx, box(axis === 'x' ? p1 - p0 : 0.05, 0.05, axis === 'x' ? 0.05 : p1 - p0), iron, axis === 'x' ? (p0 + p1) / 2 : c, y, axis === 'x' ? c : (p0 + p1) / 2);
}
// A heap of fallen vault: blocks, a broken rib, an earth mound; solid by default.
export function rubble(ctx, x, z, w, d, o = {}) {
  const R = T.rng(Math.round(x * 37 + z * 19 + 77)); const n = o.n || Math.round(w * d * 2.4) + 3, hh = o.h || 1.1;
  const tones = ['#363e4c', '#424a58', '#4e5664', '#3a4250'];
  const mound = add(ctx, cone(0.5, 1, 6), M.dirt('#2a2826'), x, hh * 0.32, z, { ry: R() }); mound.scale.set(w * 0.95, hh * 0.65, d * 0.95);
  for (let i = 0; i < n; i++) {
    const dx = (R() - 0.5) * w, dz = (R() - 0.5) * d; const f = 1 - Math.max(Math.abs(dx) / (w / 2), Math.abs(dz) / (d / 2)); const s = q16(0.26 + R() * 0.42);
    add(ctx, box(s, q16(s * (0.55 + R() * 0.4)), q16(s * (0.7 + R() * 0.6))), M.ashlar(tones[(R() * 4) | 0]), x + dx, s * 0.25 + f * hh * 0.7, z + dz, { ry: R() * 3, rx: (R() - 0.5) * 0.7, rz: (R() - 0.5) * 0.7 });
  }
  if (o.rib !== false) add(ctx, box(0.34, 0.3, Math.max(w, d) * 0.8), M.ashlar('#4a5262'), x - w * 0.1, hh * 0.45, z + d * 0.08, { ry: o.ribRy ?? 0.6, rx: 0.25 });
  if (o.bones) bonePile(ctx, x + w * 0.35, z + d * 0.35, 0.6, o.bones);
  if (o.solid !== false) solid(ctx, x - w * 0.42, z - d * 0.42, x + w * 0.42, z + d * 0.42, Math.max(1, hh));
}
// A ledger slab over a grave: a carved skull, crossed bones and lines of names.
export function slab(ctx, x, z, ry = 0) {
  const m = mat('slab', () => cutout(new THREE.MeshLambertMaterial({ map: pix('uc-slab', 16, 30, (g, W, Hh) => {
    const r = T.rng(66), d = dotter(g, W); const SK = ['.###.', '#####', '#.#.#', '##.##', '.#.#.'];
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) d(x, y, x === 0 || y === 0 || x === W - 1 || y === Hh - 1 ? '#3e4654' : (r() < 0.1 ? '#646c7a' : '#565e6c'));
    SK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') d(5 + i, 4 + j, '#6e7684'); else if (j > 1 && j < 4) d(5 + i, 4 + j, '#30363f'); }));
    for (let i = 0; i < 6; i++) { d(5 + i, 10 + i, '#3a404c'); d(10 - i, 10 + i, '#3a404c'); }
    for (let y = 17; y < 27; y += 2) for (let x = 3; x < 13; x++) if (r() < 0.65) d(x, y, '#3e4552');
  }) })));
  add(ctx, plane(1, 1.875), m, x, 0.018, z, { rx: -Math.PI / 2, rz: ry, cast: false });
}

// ---------------------------------------------------------------- sarcophagi
// A stone sarcophagus, head toward local -Z (ry turns it): carved arcading on the sides, the lid with
// its effigy (robed, hands joined, a sword for a knight, a hound at the feet). kind: 'whole', 'open'
// (lid shoved aside, bones within) or 'broken' (lid cracked, the effigy's head gone).
const tombTex = (n) => pix('uc-tomb' + n, n * 8, 12, (g, W, Hh) => {
  const d = dotter(g, W);
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const u = x % 8, top = y < 1 || y === Hh - 1; const archIn = u >= 2 && u <= 5 && y >= 3 && y <= 10 && !(y === 3 && (u === 2 || u === 5));
    d(x, y, top ? '#5c6472' : (archIn ? (u === 2 || y === 3 ? '#262b34' : '#323843') : (u === 1 || u === 6 ? '#545c6a' : '#4a5260')));
  }
});
export function sarcophagus(ctx, x, z, o = {}) {
  const ry = o.ry || 0, w = o.w || 1.0, l = o.l || 2.2, kind = o.kind || 'whole';
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  const st = M.ashlar(o.tone || '#4a5260'), lidM = M.ashlar('#5a6270'), pale = M.flat(0x8a8c8e), paleLo = M.flat(0x727478);
  P(box(w + 0.24, 0.16, l + 0.24), M.ashlar('#3a4250'), 0, 0.08, 0);
  P(box(w, 0.74, l), st, 0, 0.53, 0);
  // carved panels on the faces toward the camera
  const side = mat('tombL', () => cutout(new THREE.MeshLambertMaterial({ map: tombTex(4) }))), end = mat('tombS', () => cutout(new THREE.MeshLambertMaterial({ map: tombTex(2) })));
  const c = Math.cos(ry), s = Math.sin(ry);
  for (const [nx, nz, lx, lz, len, m, r] of [[c, -s, w / 2 + 0.01, 0, l - 0.16, side, Math.PI / 2], [-c, s, -w / 2 - 0.01, 0, l - 0.16, side, -Math.PI / 2], [s, c, 0, l / 2 + 0.01, w - 0.12, end, 0], [-s, -c, 0, -l / 2 - 0.01, w - 0.12, end, Math.PI]]) {
    if (nx + nz > 0.1) P(plane(len, 0.6), m, lx, 0.54, lz, { ry: r, cast: false });
  }
  const y0 = 0.9;
  if (kind === 'open') {
    P(plane(w - 0.16, l - 0.16), M.flat(0x08090b), 0, y0 + 0.005, 0, { rx: -Math.PI / 2, cast: false });
    P(box(w + 0.1, 0.14, l + 0.1), lidM, w * 0.42, y0 + 0.02, l * 0.12, { ry: 0.32, rz: -0.16 });
    const R = T.rng(Math.round(x * 3 + z * 5));
    for (let i = 0; i < 4; i++) { const lz = (R() - 0.5) * (l - 0.6); const v = new THREE.Vector3((R() - 0.5) * 0.3, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); bone(ctx, x + v.x, y0 + 0.02, z + v.z, ry + (R() - 0.5) * 0.4); }
    { const v = new THREE.Vector3(0.05, 0, -l / 2 + 0.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); skull(ctx, x + v.x, y0 + 0.06, z + v.z, ry + 0.6); }
  } else {
    const brk = kind === 'broken';
    if (brk) { P(box(w + 0.12, 0.14, l * 0.55), lidM, 0, y0 + 0.07, -l * 0.22); P(box(w + 0.12, 0.14, l * 0.42), lidM, 0.04, y0 + 0.05, l * 0.3, { rz: 0.06, ry: 0.05 }); }
    else P(box(w + 0.12, 0.14, l + 0.12), lidM, 0, y0 + 0.07, 0);
    const e = y0 + 0.14;
    P(box(0.44, 0.07, 0.3), paleLo, 0, e + 0.035, -l / 2 + 0.3);
    if (!brk) P(box(0.2, 0.2, 0.22), pale, 0, e + 0.17, -l / 2 + 0.33);
    P(box(0.46, 0.2, 0.75), pale, 0, e + 0.1, -l / 2 + 0.85);
    P(box(0.38, 0.16, 0.6), paleLo, 0, e + 0.08, -l / 2 + 1.5);
    P(box(0.12, 0.16, 0.1), pale, 0, e + 0.28, -l / 2 + 0.72);
    for (const sx of [-0.08, 0.08]) P(box(0.1, 0.18, 0.1), pale, sx, e + 0.16, l / 2 - 0.32);
    if (o.knight) { P(box(0.06, 0.03, 0.95), M.flat(0x6a6e74), 0, e + 0.215, -l / 2 + 1.12); P(box(0.28, 0.035, 0.05), M.flat(0x6a6e74), 0, e + 0.22, -l / 2 + 0.66); }
    if (o.hound) { P(box(0.3, 0.16, 0.2), paleLo, 0, e + 0.08, l / 2 - 0.12); P(box(0.14, 0.12, 0.12), pale, 0.15, e + 0.18, l / 2 - 0.1); }
  }
  if (o.candles) { const v = new THREE.Vector3(w * 0.3, 0, l * 0.38).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); candles(ctx, x + v.x, y0 + 0.14, z + v.z, { n: 3, spread: 0.1, light: o.light, intensity: 2.2, dist: 4.5 }); }
  solidRot(ctx, x, z, ry, w / 2 + 0.12, l / 2 + 0.12, 1.2);
}

// ---------------------------------------------------------------- the stream
// The underground stream, running along Z from z0 to z1 in a stone channel cut in the floor (leave the
// floor open over x0..x1). Dark water with pale streaks drifting downstream (+Z).
export function stream(ctx, x0, z0, x1, z1) {
  const len = z1 - z0, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, wall = M.ashlar('#343c48'), cope = M.ashlar('#4e5664');
  add(ctx, box(x1 - x0, 0.3, len), M.dirt('#141716'), mx, -1.2, mz, { cast: false });
  for (const [a, b] of [[x0, x0 + 0.25], [x1 - 0.25, x1]]) add(ctx, box(b - a, 1.05, len), wall, (a + b) / 2, -0.525, mz, { cast: false });
  for (const [a, b] of [[x0 - 0.15, x0 + 0.3], [x1 - 0.3, x1 + 0.15]]) add(ctx, box(b - a, 0.08, len), cope, (a + b) / 2, -0.01, mz, { cast: false });
  for (const zz of [z0, z1]) add(ctx, box(x1 - x0, 1.05, 0.3), wall, mx, -0.525, zz, { cast: false });
  const wm = water(ctx, x0 + 0.25, z0, x1 - 0.25, z1, WATER_Y, 0x0a1318); wm.material.opacity = 0.92;
  const t = pix('uc-flow', 32, 64, (g, W, Hh) => {
    const r = T.rng(808);
    for (let i = 0; i < 46; i++) { const x = (r() * W) | 0, y = (r() * Hh) | 0, l = 2 + ((r() * 6) | 0), a = (0.25 + r() * 0.6).toFixed(2); g.fillStyle = `rgba(150,184,208,${a})`; for (let j = 0; j < l; j++) g.fillRect(x, (y + j) % Hh, 1, 1); }
  }, true).clone();
  t.needsUpdate = true; t.repeat.set((x1 - x0 - 0.5) * 16 / 32, len * 16 / 64);
  const fm = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.5, 0.62, 0.78), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
  const fl = new THREE.Mesh(plane(x1 - x0 - 0.5, len), fm); fl.rotation.x = -Math.PI / 2; fl.position.set(mx, WATER_Y + 0.01, mz); fl.renderOrder = 1; ctx.group.add(fl);
  let k = 0; ctx.anims.push({ update(dt) { k += dt; t.offset.y = Math.floor(k * 0.55 * 64) / 64; return false; } });
}
// Water you cannot walk into (and nothing can blink onto); sight passes over it.
export function waterSolid(ctx, x0, z0, x1, z1) { solid(ctx, x0, z0, x1, z1, 1.0); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); }
// A little stone footbridge running along X over a Z stream: flagged deck, low parapets with end posts,
// an arch face over the water toward the camera. deck: [x0, x1, z0, z1]; wet: [wx0, wx1].
export function footbridge(ctx, x0, x1, z0, z1, wx0, wx1) {
  const st = M.ashlar('#46505e'), cap = M.ashlar('#5a6472');
  add(ctx, box(x1 - x0, 0.22, z1 - z0), M.flags('#56606c'), (x0 + x1) / 2, -0.08, (z0 + z1) / 2, { cast: false });
  add(ctx, spandrelGeo(q16(wx1 - wx0), 0.9, 0.3), st, wx0, -1.0, z1 - 0.3);
  add(ctx, spandrelGeo(q16(wx1 - wx0), 0.9, 0.3), st, wx0, -1.0, z0);
  for (const [a, b] of [[z0, z0 + 0.26], [z1 - 0.26, z1]]) {
    add(ctx, box(x1 - x0, 0.62, b - a), st, (x0 + x1) / 2, 0.34, (a + b) / 2); add(ctx, box(x1 - x0 + 0.08, 0.1, b - a + 0.08), cap, (x0 + x1) / 2, 0.7, (a + b) / 2);
    solid(ctx, x0, a, x1, b, 0.8);
    for (const xx of [x0 + 0.18, x1 - 0.18]) { add(ctx, box(0.36, 0.95, 0.36), st, xx, 0.48, (a + b) / 2); add(ctx, box(0.42, 0.1, 0.42), cap, xx, 1.0, (a + b) / 2); }
  }
}

// ---------------------------------------------------------------- light from above
// Moonlight through a street grate far overhead: a pale square cut by the bars, laid on the floor.
export function grateLight(ctx, x, z, s = 2.6) {
  const m = mat('grate', () => new THREE.MeshBasicMaterial({ map: pix('uc-grate', 42, 42, (g, W) => {
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const barX = x % 10 < 2 || x > W - 3, barY = y % 10 < 2 || y > W - 3; if (barX || barY) continue;
      const k = Math.max(0, 1 - (Math.hypot(x - W / 2, y - W / 2) / (W * 0.62)) ** 2); const v = Math.round(k * 5) / 5 * 255 | 0;
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1);
    }
  }), color: new THREE.Color(0.5, 0.64, 0.86), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  const p = new THREE.Mesh(plane(s, s), m); p.rotation.x = -Math.PI / 2; p.position.set(x, 0.03, z); p.renderOrder = 1; ctx.group.add(p);
}
// Dust drifting down through the shafts. list: [x, z, r, n].
export function motes(ctx, list) {
  const R = T.rng(3131); const base = [];
  for (const [x, z, r, n] of list) for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r; base.push([x + Math.sin(a) * d, R() * 5, z + Math.cos(a) * d, R() * 10]); }
  const pos = new Float32Array(base.length * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: new THREE.Color(0.9, 1.05, 1.3), size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; ctx.group.add(pts);
  let t = 0;
  const step = () => { for (let i = 0; i < base.length; i++) { const [x, y, z, ph] = base[i]; pos[i * 3] = x + Math.sin(t * 0.3 + ph) * 0.3; pos[i * 3 + 1] = ((y - t * 0.18) % 5 + 5) % 5 + 0.2; pos[i * 3 + 2] = z + Math.cos(t * 0.25 + ph) * 0.3; } g.attributes.position.needsUpdate = true; };
  step(); ctx.anims.push({ update(dt) { t += dt; step(); return false; } });
}

// ---------------------------------------------------------------- the crypt chapel
// The altar on its dais against a far wall (front toward +Z): frontal, reliquary, a plain cross, candles.
export function altar(ctx, x, z, o = {}) {
  const st = M.ashlar('#46505e'), hi = M.ashlar('#5a6270');
  add(ctx, box(3.6, 0.16, 1.9), st, x, 0.08, z); add(ctx, box(3.0, 0.16, 1.5), st, x, 0.24, z - 0.2);
  add(ctx, box(2.0, 0.8, 0.8), hi, x, 0.72, z - 0.35); add(ctx, box(2.3, 0.12, 1.0), M.ashlar('#6a7280'), x, 1.18, z - 0.35);
  add(ctx, box(1.3, 0.62, 0.02), M.flat(0x3a1418), x, 0.76, z + 0.06, { cast: false });
  add(ctx, box(0.3, 0.3, 0.021), M.flat(0x8a7a50, { emissive: 0x1a140a }), x, 0.82, z + 0.07, { cast: false });
  add(ctx, box(0.5, 0.36, 0.34), M.flat(0x7a6a44, { emissive: 0x201808 }), x, 1.42, z - 0.45);
  add(ctx, box(0.12, 1.5, 0.12), M.flat(0x8a8a86), x, 2.0, z - 0.72); add(ctx, box(0.8, 0.12, 0.12), M.flat(0x8a8a86), x, 2.4, z - 0.72);
  candles(ctx, x - 0.8, 1.24, z - 0.35, { n: 5, spread: 0.16, tall: true, light: true, intensity: 3.2, dist: 6.5, halo: true, lz: 0.6 });
  candles(ctx, x + 0.8, 1.24, z - 0.35, { n: 5, spread: 0.16, tall: true });
  candles(ctx, x - 1.55, 0.32, z + 0.35, { n: 4, spread: 0.18 }); candles(ctx, x + 1.55, 0.32, z + 0.35, { n: 3, spread: 0.18 });
  solid(ctx, x - 1.8, z - 0.95, x + 1.8, z + 0.95, 1.2);
}
// A wooden kneeling bench (prie-dieu) facing -Z, along X.
export function kneeler(ctx, x, z, len = 1.6) {
  const w = M.wood('#4a3424');
  add(ctx, box(len, 0.06, 0.3), w, x, 0.3, z + 0.1); add(ctx, box(len, 0.5, 0.06), w, x, 0.55, z - 0.12); add(ctx, box(len + 0.06, 0.06, 0.18), w, x, 0.82, z - 0.12);
  for (const s of [-1, 1]) add(ctx, box(0.06, 0.82, 0.42), M.wood('#3a281c'), x + s * len / 2, 0.41, z);
  solid(ctx, x - len / 2 - 0.05, z - 0.22, x + len / 2 + 0.05, z + 0.22, 0.85);
}

// ---------------------------------------------------------------- the Ossuary
// A column clad in bones: rings of skulls between bundles of long bones, a capital, and above it a dark
// shaft into the vault. broken: the height it snapped at.
export function bonePillar(ctx, x, z, o = {}) {
  const top = o.broken ? q16(o.broken) : (o.h || 3.9); const R = T.rng(Math.round(x * 19 + z * 23));
  add(ctx, box(1.3, 0.4, 1.3), M.ashlar('#3a4250'), x, 0.2, z); add(ctx, box(1.1, 0.2, 1.1), M.ashlar('#525a68'), x, 0.5, z);
  add(ctx, cyl(0.4, 0.44, top - 0.6, 8), M.ashlar('#4a5262'), x, 0.6 + (top - 0.6) / 2, z);
  for (let y = 0.92; y < top - 0.2; y += 0.62) {
    const n = 9, off = y * 1.7;
    for (let i = 0; i < n; i++) { if (o.broken && y > top - 0.7 && R() < 0.5) continue; const a = off + i / n * Math.PI * 2; skull(ctx, x + Math.sin(a) * 0.5, y, z + Math.cos(a) * 0.5, a); }
    if (y + 0.31 < top - 0.25) for (let i = 0; i < 12; i++) { const a = off + (i + 0.5) / 12 * Math.PI * 2; bone(ctx, x + Math.sin(a) * 0.47, y + 0.31, z + Math.cos(a) * 0.47, a, Math.PI / 2); }
  }
  if (!o.broken) {
    add(ctx, box(1.2, 0.28, 1.2), M.ashlar('#56606e'), x, top + 0.14, z); add(ctx, box(1.34, 0.14, 1.34), M.ashlar('#646c7a'), x, top + 0.35, z);
    add(ctx, cyl(0.36, 0.42, 2.4, 8), M.flat(0x0c0e12), x, top + 1.62, z);
  } else {
    for (let i = 0; i < 3; i++) add(ctx, box(0.36, 0.22, 0.3), M.ashlar('#4a5262'), x + (R() - 0.5) * 0.4, top + 0.08, z + (R() - 0.5) * 0.4, { ry: R() * 3, rz: (R() - 0.5) * 0.6 });
    bonePile(ctx, x + 0.9, z + 0.8, 0.7, 7);
  }
  solidCircle(ctx, x, z, 0.66, top);
}
// The ring of names inlaid in the floor: two bands of carved letters around a circle.
export function nameRing(ctx, x, z, R = 6) {
  const S = Math.round(R * 32);
  const m = mat('names' + S, () => cutout(new THREE.MeshLambertMaterial({ alphaTest: 0.5, map: pix('uc-names' + S, S, S, (g) => {
    const c = S / 2, d = dotter(g, S), col = '#7a8290', dim = '#646c7a';
    const glyphs = new Map(); const rr = T.rng(4040);
    const glyph = (k) => { if (!glyphs.has(k)) { const b = []; for (let i = 0; i < 15; i++) b.push(rr() < 0.42); b[7] = true; glyphs.set(k, b); } return glyphs.get(k); };
    const band = (r0) => { const n = Math.floor(2 * Math.PI * (r0 + 3) / 5); return { r0, n }; };
    const bands = [band(c - 10), band(c * 0.62)];
    for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
      const dx = xx + 0.5 - c, dy = y + 0.5 - c, dd = Math.hypot(dx, dy), a = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
      if ((dd > c - 3 && dd < c - 1.4) || (dd > c - 12.2 && dd < c - 11)) { d(xx, y, col); continue; }
      if (dd > c * 0.62 - 2.2 && dd < c * 0.62 - 1) { d(xx, y, dim); continue; }
      if (dd < 2.2 || (dd > 6 && dd < 7.2)) { d(xx, y, col); continue; }
      for (const B of bands) {
        const v = dd - B.r0; if (v < 0 || v >= 6) continue;
        const seg = a / (Math.PI * 2) * B.n, k = Math.floor(seg), u = Math.floor((seg - k) * 4); if (u > 2) continue;
        const row = Math.min(4, Math.floor(v * 5 / 6)); if (glyph(B.r0 * 1000 + k)[row * 3 + u]) d(xx, y, B.r0 > c * 0.7 ? col : dim);
      }
    }
  }) })));
  add(ctx, plane(R * 2, R * 2), m, x, 0.016, z, { rx: -Math.PI / 2, cast: false });
}
// A wall of skulls in an arched recess on a far wall face (+z at zf), with a ledge of candles.
export function skullShrine(ctx, x, zf, w = 2.8, o = {}) {
  const st = M.ashlar('#3c4452');
  add(ctx, box(w + 0.8, 0.6, 0.7), st, x, 0.3, zf + 0.35); add(ctx, box(w + 1, 0.12, 0.8), M.ashlar('#56606e'), x, 0.66, zf + 0.38);
  for (const s of [-1, 1]) add(ctx, box(0.4, 3.4, 0.5), st, x + s * (w / 2 + 0.2), 1.7, zf + 0.25);
  add(ctx, box(w + 0.8, 0.4, 0.5), st, x, 3.6, zf + 0.25);
  add(ctx, plane(w, 2.8), M.flat(0x0c0d10), x, 2.1, zf + 0.02, { cast: false });
  const rows = 11, cols = Math.floor(w / 0.24);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const u = (i - (cols - 1) / 2) * 0.24 + (j % 2) * 0.06, y = 0.82 + j * 0.24, R = w / 2 - 0.12;
    if (Math.abs(u) > R || (y > 2.3 && Math.abs(u) > Math.sqrt(Math.max(0, R * R - (y - 2.3) ** 2)))) continue;
    skull(ctx, x + u, y, zf + 0.16, (j * 7 + i * 3) % 5 * 0.06 - 0.12);
  }
  candles(ctx, x, 0.72, zf + 0.5, { n: 9, spread: w * 0.42, az: 0.15, light: true, intensity: 3, dist: 6, halo: true, lz: 0.4 });
  solid(ctx, x - w / 2 - 0.5, zf, x + w / 2 + 0.5, zf + 0.8, 3.6);
}
// Heat from below: a dim warm glow rising in an opening, dithered to dark at the top (the way down).
export function heatGlow(ctx, x, y, z, w, h, face = '+z') {
  const m = mat('heat', () => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: pix('uc-heat', 16, 32, (g, W, Hh) => {
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let yy = 0; yy < Hh; yy++) { const k = Math.pow(yy / (Hh - 1), 1.6); for (let xx = 0; xx < W; xx++) { const v = (B[(yy % 4) * 4 + (xx % 4)] + 0.5) / 16 < k ? 1 : 0.4 * k; g.fillStyle = `rgb(${200 * v | 0},${90 * v | 0},${30 * v | 0})`; g.fillRect(xx, yy, 1, 1); } }
  }, true), color: new THREE.Color(0.7, 0.55, 0.45) }));
  const p = new THREE.Mesh(uvPlane(w, h, 16, 32 * h / 2), m); p.position.set(x, y, z); if (face === '+x') p.rotation.y = Math.PI / 2; ctx.group.add(p);
}

// ---------------------------------------------------------------- the rock between the passages
// Every part of the bounds that is not a walk gets a solid that blocks movement, blinks and sight
// (the rock the crypt is cut from), merged into as few boxes as possible.
export function rockFill(ctx, bounds, walks, h = 2) {
  const uniq = (a) => [...new Set(a.map((v) => Math.round(v * 1000) / 1000))].sort((p, q) => p - q);
  const xs = uniq([bounds[0], bounds[2], ...walks.flatMap((r) => [r[0], r[2]])]).filter((v) => v >= bounds[0] && v <= bounds[2]);
  const zs = uniq([bounds[1], bounds[3], ...walks.flatMap((r) => [r[1], r[3]])]).filter((v) => v >= bounds[1] && v <= bounds[3]);
  const inWalk = (x, z) => walks.some((r) => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
  const open = new Map(); const out = [];
  for (let j = 0; j < zs.length - 1; j++) {
    const row = []; let start = null;
    for (let i = 0; i < xs.length - 1; i++) {
      const v = !inWalk((xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2);
      if (v && start === null) start = xs[i];
      if (start !== null && (!v || i === xs.length - 2)) { row.push([start, v ? xs[i + 1] : xs[i]]); start = null; }
    }
    const next = new Map();
    for (const [a, b] of row) { const k = a + ',' + b; const s = open.get(k); if (s) { s.z1 = zs[j + 1]; next.set(k, s); open.delete(k); } else { const n = { x0: a, x1: b, z0: zs[j], z1: zs[j + 1] }; out.push(n); next.set(k, n); } }
    open.clear(); for (const [k, s] of next) open.set(k, s);
  }
  for (const s of out) solid(ctx, s.x0, s.z0, s.x1, s.z1, h);
  return out.length;
}
