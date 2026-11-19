// Props for Act II, region III: the Catacombs under the dunes. Older and deeper than the Undercroft: brown
// stone gone pale with saltpetre, walls of loculi where the wrapped dead lie three high, ossuary walls of
// skulls set in crosses, iron cages and chains hanging out of the dark, braziers the only light, a chasm
// with no bottom, sarcophagi with their lids pushed aside, a chandelier of skulls, and the Lich's bier
// under a green witchfire. Above the walls the vault is lost in the dark.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane, torus } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { skull, bone, bonePile } from './undercroft.js';
import { deep } from './belfry.js';
import { W2, once, part, put, bar, q16, pix, flame, floorGlow, solidRot, chain, slung, brazier, decal } from '../kit2.js';
export { skull, bone, bonePile, brazier, chain, slung };

export const H = 6.8;                       // the tall walls: above them the dark
export const STONE = '#5a5048', STONE2 = '#4c443e', FLOOR = '#575049';
const FADE_PX = 56, FADE_H = FADE_PX / 16, FADE0 = H + 0.3 - FADE_H;
const blackM = () => once('cc-black', () => cutout(new THREE.MeshLambertMaterial({ color: 0x000000, fog: false })));
const fadeM = () => once('cc-fade', () => cutout(new THREE.MeshLambertMaterial({ color: 0x000000, alphaTest: 0.5, fog: false, map: pix('cc-fade', 16, FADE_PX, (g, W, Hh) => {
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; g.fillStyle = '#000000';
  for (let y = 0; y < Hh; y++) { const a = Math.max(0, Math.min(1, (Hh - 10 - y) / 26)); for (let x = 0; x < W; x++) if ((B[(y % 4) * 4 + (x % 4)] + 0.5) / 16 < a) g.fillRect(x, y, 1, 1); }
}, true) })));
function uvPlane(w, h, tw, th) {
  return geo(`ccuv${w},${h},${tw},${th}`, () => { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * 16 / tw, uv.getY(i) * h * 16 / th); return g; });
}

// ---------------------------------------------------------------- textures
const dotter = (g, W) => (x, y, c) => { g.fillStyle = c; g.fillRect(((x % W) + W) % W, y, 1, 1); };
// The ossuary face: rows of brown skulls between courses of bone ends, and every other bay a cross of
// skulls on a ground of long bones (4 m x 3 m).
function ossuaryTex() {
  return pix('cc-oss', 64, 48, (g, W) => {
    const r = T.rng(5150), d = dotter(g, W); const C = { hi: '#a89a7e', base: '#887a62', mid: '#6a5e4a', lo: '#4a4234', gap: '#100c0a', eye: '#030202' };
    g.fillStyle = C.gap; g.fillRect(0, 0, W, 48);
    const SK = ['.hhhh.', 'hbbbbh', 'bEEbEE', 'mEEmEE', '.mmEm.', '.l.l..'];
    const col = { h: C.hi, b: C.base, m: C.mid, l: C.lo, E: C.eye };
    const skullAt = (x, y) => SK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') d(x + i, y + j, col[ch]); }));
    const knob = (x, y) => { d(x, y, C.mid); d(x + 1, y, C.base); d(x, y + 1, C.lo); d(x + 1, y + 1, C.mid); };
    // bands of bone ends with a skull row between
    for (let y = 0; y < 48; y += 3) for (let x = (y / 3 % 2) * 1; x < W; x += 3) if (r() > 0.08) knob(x, y);
    for (const y of [2, 26]) for (let x = 0; x < W; x += 7) skullAt(x, y);
    // a cross of skulls in the middle band
    for (const cx of [14, 46]) { for (let k = -1; k <= 2; k++) skullAt(cx - 3, 11 + k * 6 > 20 ? 20 : 11 + k * 6); skullAt(cx - 10, 14); skullAt(cx + 4, 14); }
  }, true);
}
const ossM = () => once('cc-ossM', () => cutout(new THREE.MeshLambertMaterial({ map: ossuaryTex() })));
// A loculus: a dark slot with a body wrapped in pale linen, or bones and a skull (32 x 12 texels = 2 m x 0.75 m).
function loculusTex(kind) {
  return pix('cc-loc' + kind, 32, 12, (g, W, Hh) => {
    const d = dotter(g, W); const r = T.rng(77 + kind);
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) d(x, y, (x === 0 || x === W - 1 || y === 0) ? '#3a322c' : (y === Hh - 1 ? '#2a241e' : '#0a0807'));
    if (kind === 0) { // a wrapped body
      for (let x = 4; x < 28; x++) for (let y = 5; y < 11; y++) { const head = x > 23; if (head && (x - 25.5) ** 2 + ((y - 8) * 1.2) ** 2 > 7) continue; d(x, y, ((x + (y >> 1)) % 4 === 0) ? '#7a705c' : (y < 7 ? '#a49880' : '#8a806a')); }
    } else if (kind === 1) { // bones and a skull
      for (let k = 0; k < 4; k++) { const y = 8 + (k % 2) * 2, x0 = 3 + k * 4; for (let x = x0; x < x0 + 9; x++) d(x, y, '#8a7c64'); d(x0, y - 1, '#a89a7e'); d(x0 + 8, y - 1, '#a89a7e'); }
      for (let y = 5; y < 10; y++) for (let x = 22; x < 27; x++) d(x, y, (y === 7 && (x === 23 || x === 25)) ? '#050404' : '#a09276');
    } else { // sealed with a slab, an epitaph
      for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) d(x, y, r() < 0.9 ? '#5a5046' : '#4a4038');
      for (let x = 6; x < 26; x++) if (r() < 0.7) { d(x, 4, '#3a322a'); if (x < 20) d(x, 7, '#3a322a'); }
    }
  });
}
const locM = (k) => once('cc-locM' + k, () => cutout(new THREE.MeshLambertMaterial({ map: loculusTex(k) })));

// ---------------------------------------------------------------- walls
// A tall far wall from (x0,z0) to (x1,z1): along X it faces +z, along Z it faces +x. Its face: loculi three
// high ('loculi', the default) or skulls in crosses ('ossuary'); pilasters every bay with ribs climbing into
// the dark; a dithered fall-off to black over the top. gaps: [{ a0, a1 }] doorways (dark beyond).
export function vaultWall(ctx, x0, z0, x1, z1, o = {}) {
  const t = o.thick || 0.8; const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const c = alongX ? z0 : x0, f = c + t / 2; const gaps = (o.gaps || []).slice().sort((p, q) => p.a0 - q.a0);
  const core = W2.cat(o.tone || STONE), trim = W2.cat('#6a5e52'), baseM = W2.cat(STONE2); const R = T.rng(Math.round(a0 * 13 + c * 7));
  const B = (p0, p1, y0, y1, d0, d1, m, oo) => alongX ? add(ctx, box(p1 - p0, y1 - y0, d1 - d0), m, (p0 + p1) / 2, (y0 + y1) / 2, (d0 + d1) / 2, oo) : add(ctx, box(d1 - d0, y1 - y0, p1 - p0), m, (d0 + d1) / 2, (y0 + y1) / 2, (p0 + p1) / 2, oo);
  const S = (p0, p1, d0, d1, h) => alongX ? solid(ctx, p0, d0, p1, d1, h) : solid(ctx, d0, p0, d1, p1, h);
  const F = (g, m, p, y, off, oo = {}) => alongX ? add(ctx, g, m, p, y, f + off, { cast: false, ...oo }) : add(ctx, g, m, f + off, y, p, { cast: false, ry: Math.PI / 2, ...oo });
  const pieces = []; let p = a0; for (const gp of gaps) { if (gp.a0 > p) pieces.push([p, gp.a0]); p = Math.max(p, gp.a1); } if (p < a1) pieces.push([p, a1]);
  for (const [p0, p1] of pieces) {
    B(p0, p1, 0, H, c - t / 2, f, core); B(p0, p1, 0, 0.45, c - t / 2 - 0.05, f + 0.08, baseM); S(p0, p1, c - t / 2, f, H);
    if (o.face === 'ossuary') { if (p1 - p0 > 0.3) { F(uvPlane(q16(p1 - p0), 3, 64, 48), ossM(), (p0 + p1) / 2, 2.05, 0.012); B(p0, p1, 3.55, 3.75, f, f + 0.22, trim); } }
    else if (o.face !== 'plain') {
      for (let row = 0; row < 3; row++) for (let pp = p0 + 1.25; pp < p1 - 1.1; pp += 2.3) {
        const k = R() < 0.55 ? 0 : (R() < 0.6 ? 1 : 2); F(plane(2, 0.75), locM(k), pp, 0.85 + row * 1.05, 0.014);
        B(pp - 1.1, pp + 1.1, 0.45 + row * 1.05, 0.5 + row * 1.05, f, f + 0.14, trim);
      }
    }
  }
  for (const gp of gaps) { B(gp.a0, gp.a1, (gp.ys || 3) , H, c - t / 2, f, core); F(plane(gp.a1 - gp.a0, gp.ys || 3), blackM(), (gp.a0 + gp.a1) / 2, (gp.ys || 3) / 2, -t / 2 + 0.02); for (const e of [gp.a0, gp.a1]) B(e - 0.18, e + 0.18, 0, (gp.ys || 3) + 0.3, f - 0.02, f + 0.2, trim); }
  // pilasters and the ribs that climb from them into the dark
  const bay = o.bay || 4.6; const n = Math.max(1, Math.round((a1 - a0) / bay));
  for (let i = 0; i <= n; i++) {
    const pp = a0 + (a1 - a0) * i / n; if (gaps.some((gp) => pp > gp.a0 - 0.6 && pp < gp.a1 + 0.6) || (i === 0 && o.skipStart) || (i === n && o.skipEnd)) continue;
    B(pp - 0.3, pp + 0.3, 0, H, f, f + 0.34, trim); B(pp - 0.4, pp + 0.4, 0, 0.7, f, f + 0.44, baseM); S(pp - 0.4, pp + 0.4, f, f + 0.44, H);
    B(pp - 0.36, pp + 0.36, 3.9, 4.15, f, f + 0.5, trim);
    if (o.torches && o.torches.includes(i)) { const [tx, tz] = alongX ? [pp, f + 0.34] : [f + 0.34, pp]; torchAt(ctx, tx, 2.3, tz, alongX ? '+z' : '+x'); }
  }
  // the dark over it all
  const L = a1 - a0 + 0.8, mid = (a0 + a1) / 2;
  F(uvPlane(q16(L), FADE_H, 16, FADE_PX), fadeM(), mid, FADE0 + FADE_H / 2, 0.52);
  const dc = (c - t / 2 + f + 0.54) / 2, dw = t + 0.54;
  if (alongX) add(ctx, plane(L, dw), blackM(), mid, H + 0.3, dc, { rx: -Math.PI / 2, cast: false }); else add(ctx, plane(dw, L), blackM(), dc, H + 0.3, mid, { rx: -Math.PI / 2, cast: false });
  if (o.endFade !== false) { if (alongX) add(ctx, uvPlane(q16(dw), FADE_H, 16, FADE_PX), fadeM(), a1 + 0.41, FADE0 + FADE_H / 2, dc, { ry: Math.PI / 2, cast: false }); else add(ctx, uvPlane(q16(dw), FADE_H, 16, FADE_PX), fadeM(), dc, FADE0 + FADE_H / 2, a1 + 0.41, { cast: false }); }
}
function torchAt(ctx, x, y, z, face) {
  const fx = face === '+x' ? 1 : 0, fz = face === '+z' ? 1 : 0;
  add(ctx, box(0.1 + fx * 0.3, 0.08, 0.1 + fz * 0.3), M.ironLit(), x + fx * 0.15, y, z + fz * 0.15);
  add(ctx, cyl(0.06, 0.04, 0.5, 5), M.wood('#3a2818'), x + fx * 0.32, y + 0.15, z + fz * 0.32, { rz: -fx * 0.3, rx: fz * 0.3 });
  flame(ctx, x + fx * 0.4, y + 0.7, z + fz * 0.4, 1);
  ctx.lights.push({ x: x + fx * 0.9, y: y + 0.7, z: z + fz * 0.9, color: 0xff8030, intensity: 6.5, dist: 8.5, halo: true, flicker: 0.25 });
}
// A low broken wall on a near side: jagged blocks of the old stone, bones at its foot (room side).
export function stub(ctx, x0, z0, x1, z1, hMin = 0.4, hMax = 1.3, o = {}) {
  const t = o.thick || 0.7; const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1), c = alongX ? z0 : x0;
  const R = T.rng(Math.round(a0 * 17 + c * 29 + 3000)); let p = a0, hh = hMin + (hMax - hMin) * R(); const m = W2.cat(STONE2);
  while (p < a1 - 0.01) {
    const len = Math.min(a1 - p, q16(0.4 + R() * 0.9)); hh = Math.max(hMin, Math.min(hMax, hh + (R() - 0.5) * (hMax - hMin))); const h = q16(hh);
    if (alongX) add(ctx, box(len, h, t), m, p + len / 2, h / 2, c); else add(ctx, box(t, h, len), m, c, h / 2, p + len / 2);
    p += len;
  }
  if (alongX) solid(ctx, a0, c - t / 2, a1, c + t / 2, o.solidH ?? 1.2); else solid(ctx, c - t / 2, a0, c + t / 2, a1, o.solidH ?? 1.2);
  const side = o.side ?? -1;
  for (let i = 0; i < Math.round((a1 - a0) / 1.6); i++) { const pp = a0 + R() * (a1 - a0), off = side * (t / 2 + 0.3 + R() * 0.4); if (R() < 0.5) bone(ctx, alongX ? pp : c + off, 0.04, alongX ? c + off : pp, R() * 3); else add(ctx, box(0.3, 0.2, 0.26), W2.cat(STONE), alongX ? pp : c + off, 0.1, alongX ? c + off : pp, { ry: R() * 3 }); }
}

// ---------------------------------------------------------------- iron in the dark
// A gibbet cage hanging on a chain from the dark (a skeleton crouched inside, or empty and swinging open).
export function cage(ctx, x, z, y = 2.2, o = {}) {
  const m = M.ironLit(); chain(ctx, x, H + 0.4, z, y + 1.25);
  const n = 8, r = 0.42, h = 1.2;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; put(ctx, 'cc-bar', m, x + Math.cos(a) * r, y + h / 2, z + Math.sin(a) * r, 0.04, h, 0.04); }
  for (const yy of [y, y + h]) add(ctx, geo('cc-ring', () => new THREE.TorusGeometry(0.42, 0.03, 3, 10)), m, x, yy, z, { rx: Math.PI / 2 });
  add(ctx, cone(0.46, 0.4, 8), m, x, y + h + 0.2, z);
  if (!o.empty) { skull(ctx, x + 0.05, y + 0.62, z + 0.08, 0.4, 0.4); bone(ctx, x, y + 0.2, z, 0.6, 0, 0.4); bone(ctx, x - 0.1, y + 0.3, z + 0.1, 2.2, 0.3, 0); add(ctx, box(0.24, 0.32, 0.16), M.flat(0x8a7c64), x, y + 0.4, z - 0.05, { rz: 0.4 }); }
}
// A chandelier of skulls: an iron ring hung on three chains, skulls round it, candles on top.
export function skullChandelier(ctx, x, z, y = 3.4, R0 = 0.9) {
  const m = M.ironLit(); add(ctx, geo(`cc-chr${R0}`, () => new THREE.TorusGeometry(R0, 0.05, 3, 16)), m, x, y, z, { rx: Math.PI / 2 });
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; bar(ctx, 'cc-chain', m, [x + Math.cos(a) * R0, y, z + Math.sin(a) * R0], [x, H + 0.4, z], 0.04); }
  const n = Math.round(R0 * 2 * Math.PI / 0.24); const wax = M.flat(0xcfc6ae), fl = M.glow('#ffc070', 3.2);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; skull(ctx, x + Math.cos(a) * R0, y - 0.13, z + Math.sin(a) * R0, -a + Math.PI / 2); if (i % 2 === 0) { inst(ctx, 'cc-wax', cyl(0.035, 0.045, 0.16, 5), wax, mat4(x + Math.cos(a) * R0, y + 0.1, z + Math.sin(a) * R0)); inst(ctx, 'cc-flame', box(0.045, 0.08, 0.045), fl, mat4(x + Math.cos(a) * R0, y + 0.22, z + Math.sin(a) * R0)); } }
  ctx.lights.push({ x, y: y - 0.2, z, color: 0xffa050, intensity: 4, dist: 7, flicker: 0.12, halo: true });
}
// A stone sarcophagus along ry: a carved effigy on the lid, or the lid pushed half off and the box empty.
export function sarcophagus(ctx, x, z, ry = 0, o = {}) {
  const st = W2.cat('#5e544a'), hi = W2.cat('#6e6458'), P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(1.1, 0.85, 2.3), st, 0, 0.42, 0); P(box(1.2, 0.12, 2.4), hi, 0, 0.06, 0);
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) P(box(0.02, 0.4, 0.34), hi, s * 0.56, 0.45, -0.7 + k * 0.7);
  if (o.open) {
    P(box(0.9, 0.05, 2.1), M.flat(0x080606), 0, 0.86, 0, { cast: false });
    P(box(1.16, 0.18, 2.36), hi, 0.5, 0.75, 0.3, { ry: 0.35, rz: -0.3 });
    bonePile(ctx, x + Math.cos(ry) * 1.1, z - Math.sin(ry) * 1.1, 0.5, 5);
  } else {
    P(box(1.16, 0.18, 2.36), hi, 0, 0.94, 0);
    P(box(0.5, 0.2, 1.5), st, 0, 1.12, -0.05); P(box(0.34, 0.22, 0.3), st, 0, 1.14, 0.88); P(box(0.6, 0.1, 0.22), st, 0, 1.06, 0.4);
  }
  solidRot(ctx, x, z, ry, 0.6, 1.2, 1.1);
}
// The great stair that came down from the desert, climbing into the dark along a far wall (toward -x).
export function greatStair(ctx, x, z0, z1, n = 10) {
  const st = W2.cat('#62584e'), w = z1 - z0;
  for (let i = 0; i < n; i++) { const h = 0.22 * (i + 1); add(ctx, box(0.45, h, w), st, x - i * 0.45, h / 2, (z0 + z1) / 2); }
  add(ctx, box(0.6, n * 0.22 + 1, w + 0.8), W2.cat(STONE2), x - n * 0.45 - 0.3, (n * 0.22 + 1) / 2, (z0 + z1) / 2);
  add(ctx, plane(w * 0.8, 2.4), blackM(), x - n * 0.45 + 0.01, n * 0.22 + 1.2, (z0 + z1) / 2, { ry: Math.PI / 2, cast: false });
  for (const zz of [z0 - 0.25, z1 + 0.25]) { add(ctx, box(n * 0.45 + 0.4, 0.5, 0.4), W2.cat('#6a5e52'), x - n * 0.45 / 2 + 0.2, n * 0.11 + 0.2, zz, { rz: Math.atan2(n * 0.22, n * 0.45) }); }
  solid(ctx, x - n * 0.45 - 0.6, z0 - 0.5, x + 0.25, z1 + 0.5, 3);
}
// The chasm: a black crack with sheer sides sinking into the dark, a stone bridge across it (bx0..bx1),
// chains slung over. Solid (low, see-through) except the bridge.
export function chasm(ctx, x0, z0, x1, z1, bx0, bx1) {
  const D = 9; const side = deep(W2.cat(STONE2), 7);
  add(ctx, plane(x1 - x0, z1 - z0), blackM(), (x0 + x1) / 2, -D, (z0 + z1) / 2, { rx: -Math.PI / 2, cast: false });
  for (const zz of [z0, z1]) add(ctx, box(x1 - x0, D, 0.1), side, (x0 + x1) / 2, -D / 2, zz, { cast: false });
  for (const xx of [x0, x1]) add(ctx, box(0.1, D, z1 - z0), side, xx, -D / 2, (z0 + z1) / 2, { cast: false });
  const st = W2.cat('#5e544a'), hi = W2.cat('#6e6458');
  add(ctx, box(bx1 - bx0, 0.5, z1 - z0 + 0.4), st, (bx0 + bx1) / 2, -0.25, (z0 + z1) / 2);
  add(ctx, box(bx1 - bx0 - 0.3, 2.4, z1 - z0 + 0.3), deep(st, 7), (bx0 + bx1) / 2, -1.45, (z0 + z1) / 2, { cast: false });
  for (const xx of [bx0 + 0.15, bx1 - 0.15]) { add(ctx, box(0.3, 0.55, z1 - z0 + 0.4), hi, xx, 0.27, (z0 + z1) / 2); solid(ctx, xx - 0.15, z0 - 0.2, xx + 0.15, z1 + 0.2, 0.9); }
  const L = (a, b) => { if (b - a > 0.05) { solid(ctx, a, z0, b, z1, 1.2); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); } };
  L(x0, bx0); L(bx1, x1);
  for (const xx of [x0 + 1.5, bx0 - 1.2, bx1 + 1.4, x1 - 1.3]) slung(ctx, [xx, 3.6, z1 + 0.3], [xx + 0.4, 4.2, z0 - 0.3], 1.4);
  // a cold breath rising from below
  for (const [y, op] of [[-4.5, 0.2], [-1.8, 0.14]]) {
    const fog = new THREE.Mesh(plane(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ map: T.glow('#ffffff', 32, 0.7), color: new THREE.Color(0.16, 0.34, 0.3), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    fog.rotation.x = -Math.PI / 2; fog.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); fog.scale.set(1.2, 1.6, 1); ctx.group.add(fog);
  }
  // the lips of the crack, broken stone catching the light
  const R = T.rng(Math.round(x0 * 3 + z0 * 5));
  for (const zz of [z0, z1]) for (let x = x0 + 0.3; x < x1; x += 0.5 + R() * 0.5) if (x < bx0 - 0.2 || x > bx1 + 0.2) add(ctx, box(0.4 + R() * 0.4, 0.14, 0.3), W2.cat('#6a5e52'), x, 0.05, zz + (zz === z0 ? -0.1 : 0.1), { ry: (R() - 0.5) * 0.4, cast: false });
  ctx.lights.push({ x: (x0 + bx0) / 2, y: -1, z: (z0 + z1) / 2, color: 0x6affc8, intensity: 2.5, dist: 6 }); ctx.lights.push({ x: (bx1 + x1) / 2, y: -1, z: (z0 + z1) / 2, color: 0x6affc8, intensity: 2.5, dist: 6 });
}
// Witchfire: a brazier burning green (the Lich's light).
export function witchfire(ctx, x, z, o = {}) {
  brazier(ctx, x, z, { color: 0x50ff90, coal: '#3aff8a', tint: [0.9, 2.6, 1.3], intensity: o.intensity || 5, dist: o.dist || 7.5, stone: W2.cat('#3e3832') });
}
// The Lich's bier on its stepped dais (front toward +z): a long black slab under a canopy of bones on four
// posts, its seal carved in the floor before it, candles guttering green.
export function bier(ctx, x, z) {
  const st = W2.cat('#4e463e'), hi = W2.cat('#6a5e52'), ob = W2.obsidian('#18141a');
  add(ctx, box(6.4, 0.3, 4.2), st, x, 0.15, z); add(ctx, box(5.2, 0.3, 3.2), hi, x, 0.45, z - 0.2); add(ctx, box(4, 0.3, 2.4), st, x, 0.75, z - 0.4);
  add(ctx, box(2.6, 0.7, 1.2), ob, x, 1.25, z - 0.5); add(ctx, box(2.8, 0.1, 1.4), hi, x, 1.64, z - 0.5);
  for (const [sx, sz] of [[-1.7, -1.5], [1.7, -1.5], [-1.7, 0.6], [1.7, 0.6]]) {
    add(ctx, box(0.3, 4.2, 0.3), hi, x + sx, 2.1, z + sz); for (let k = 0; k < 6; k++) skull(ctx, x + sx, 0.9 + k * 0.55, z + sz + 0.16, 0);
  }
  add(ctx, box(3.8, 0.3, 2.5), hi, x, 4.3, z - 0.45); for (let k = 0; k < 14; k++) skull(ctx, x - 1.8 + k * 0.28, 4.15, z + 0.82, 0);
  for (let k = 0; k < 8; k++) bone(ctx, x - 1.6 + k * 0.45, 4.5, z - 0.45, Math.PI / 2 + (k % 2) * 0.4);
  solid(ctx, x - 3.2, z - 2.1, x + 3.2, z + 1.5, 1.6);
}
// The rift at the bottom of the catacombs: the floor split open, red light breathing up from far below.
export function rift(ctx, x, z, w = 3.4, d = 1.6) {
  const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: T.glow('#ffffff', 32, 1.0), color: new THREE.Color(2.2, 0.5, 0.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, -0.6, z); ctx.group.add(m);
  add(ctx, plane(w, d), blackM(), x, -1.4, z, { rx: -Math.PI / 2, cast: false });
  const R = T.rng(Math.round(x * 7 + z * 3));
  for (let i = 0; i < 9; i++) add(ctx, box(0.3 + R() * 0.4, 0.25, 0.3 + R() * 0.3), W2.cat(STONE2), x + (R() - 0.5) * w * 1.2, 0.08, z + (R() < 0.5 ? -1 : 1) * (d / 2 + 0.2), { ry: R() * 3, rx: (R() - 0.5) * 0.6 });
  ctx.lights.push({ x, y: 0.8, z, color: 0xff3a14, intensity: 4, dist: 6, flicker: 0.2 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; m.material.color.setRGB(2.2 * (0.8 + 0.2 * Math.sin(t * 2.1)), 0.5, 0.2); return false; } });
}
// Wax and bones on the floor; a heap of skulls in a corner.
export function candles(ctx, x, y, z, n = 4, light = false) {
  const R = T.rng(Math.round(x * 41 + z * 23 + n)); const wax = M.flat(0xcfc6ae), fl = M.glow('#ffc070', 3.2);
  for (let i = 0; i < n; i++) { const cx = x + (R() - 0.5) * 0.5, cz = z + (R() - 0.5) * 0.5, hh = 0.08 + R() * 0.16; inst(ctx, 'cc-wax' + Math.round(hh * 20), cyl(0.035, 0.045, Math.round(hh * 20) / 20, 5), wax, mat4(cx, y + hh / 2, cz)); inst(ctx, 'cc-flame', box(0.045, 0.08, 0.045), fl, mat4(cx, y + Math.round(hh * 20) / 20 + 0.045, cz)); }
  if (light) ctx.lights.push({ x, y: y + 0.6, z, color: 0xff9c48, intensity: 2.6, dist: 5, flicker: 0.15 });
}
export function skullHeap(ctx, x, z, r = 1, layers = 4) {
  const R = T.rng(Math.round(x * 17 + z * 29));
  for (let k = 0; k < layers; k++) { const rr = r * (1 - k / layers), y = 0.09 + k * 0.16, n = Math.max(1, Math.round(rr * Math.PI * 2 / 0.22)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + k * 0.4; skull(ctx, x + Math.sin(a) * rr, y, z + Math.cos(a) * rr, 0.35 + R() * 0.9); } }
  solidCircle(ctx, x, z, r * 0.85, 0.8);
}
// A square column of the old stone (a vault support), its top lost in the dark.
export function pillar(ctx, x, z, o = {}) {
  const st = W2.cat(o.tone || STONE), hi = W2.cat('#6a5e52'); const w = o.w || 0.9;
  add(ctx, box(w + 0.4, 0.5, w + 0.4), hi, x, 0.25, z); add(ctx, box(w, H, w), st, x, H / 2, z); add(ctx, box(w + 0.2, 0.24, w + 0.2), hi, x, 3.9, z);
  add(ctx, uvPlane(q16(w + 0.02), FADE_H, 16, FADE_PX), fadeM(), x, FADE0 + FADE_H / 2, z + w / 2 + 0.02, { cast: false }); add(ctx, uvPlane(q16(w + 0.02), FADE_H, 16, FADE_PX), fadeM(), x + w / 2 + 0.02, FADE0 + FADE_H / 2, z, { ry: Math.PI / 2, cast: false });
  if (o.skulls) for (let k = 0; k < 4; k++) skull(ctx, x, 1.2 + k * 0.5, z + w / 2 + 0.1, 0);
  solid(ctx, x - w / 2 - 0.2, z - w / 2 - 0.2, x + w / 2 + 0.2, z + w / 2 + 0.2, H);
}
