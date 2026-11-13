// Lantern Row's own set pieces: canals with quay walls, stone bridges, tall canal houses with
// stepped gables, market stalls under striped awnings, strings of paper lanterns, candles everywhere
// (Mother Tallow's mark), moored boats, and the tallow works' vats and drying racks.
import * as THREE from 'three';
import { add, box, cyl, cone, plane, inst, geo, solid, solidCircle, roof, water } from '../kit.js';
import { M } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';

export const WATER_Y = -0.8, BED_Y = -1.7;

// ---------------------------------------------------------------- helpers
const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _e = new THREE.Euler();
const X1 = new THREE.Vector3(1, 0, 0);
const unitCyl = () => geo('mk-cyl6', () => new THREE.CylinderGeometry(1, 1, 1, 6));
const unitCyl10 = () => geo('mk-cyl10', () => new THREE.CylinderGeometry(1, 1, 1, 10));
const unitBox = () => geo('mk-box', () => new THREE.BoxGeometry(1, 1, 1));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// An instanced part with its own (non-uniform) size.
function put(ctx, key, geom, mat, x, y, z, sx, sy, sz, ry = 0, rz = 0) {
  _e.set(0, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  inst(ctx, key, geom, mat, _m.compose(_p, _q, _s));
}
// An instanced bar (rope, rod) between two points.
function bar(ctx, key, mat, a, b, t) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const len = Math.hypot(dx, dy, dz) || 1e-3;
  _q.setFromUnitVectors(X1, _p.set(dx / len, dy / len, dz / len));
  _p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); _s.set(len, t, t);
  inst(ctx, key, unitBox(), mat, _m.compose(_p, _q, _s));
}

// Small pixel textures (16 texels per metre, like the rest of the city).
const texCache = new Map();
function pix(key, w, h, draw) {
  if (!texCache.has(key)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
const dot = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

// A tall canal-house window: frame, transom, mullion; warm glass and a candle on the sill when lit.
function tallWindow(lit) {
  return pix('mk-tw' + lit, 7, 13, (g, w, h) => {
    const glass = lit ? '#cc8640' : '#111721', glass2 = lit ? '#f4c672' : '#1a2130';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const frame = x === 0 || x === w - 1 || y === 0 || y === h - 2 || y === 4 || (x === 3 && y > 4);
      dot(g, x, y, y === h - 1 ? '#5c6472' : frame ? '#2a2018' : ((x * 3 + y) % 5 === 0 ? glass2 : glass));
    }
    if (lit) { dot(g, 5, 8, '#fff2b8'); dot(g, 5, 9, '#e8dcc0'); dot(g, 5, 10, '#e8dcc0'); }
  });
}
// A shop window of small panes, candles on display behind the glass.
function shopWindow(lit) {
  return pix('mk-sw' + lit, 16, 11, (g, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const frame = x === 0 || x === w - 1 || y === 0 || y >= h - 2 || x % 5 === 0 || y === 5;
      dot(g, x, y, y === h - 1 ? '#5c6472' : frame ? '#2e2218' : lit ? ((x + y * 2) % 7 === 0 ? '#f6cc78' : '#c47c3a') : '#121822');
    }
    if (lit) for (const cx of [2, 3, 7, 12, 13]) { dot(g, cx, 6, '#fff4c0'); dot(g, cx, 7, '#e8dcc0'); dot(g, cx, 8, '#e8dcc0'); }
  });
}
// The chandlers' sign: a board with a lit candle.
function candleSign() {
  return pix('mk-sign', 10, 9, (g, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dot(g, x, y, x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#2a1c12' : '#5a3e26');
    for (let y = 4; y < 8; y++) { dot(g, 4, y, '#e8dcc0'); dot(g, 5, y, '#c8b894'); }
    dot(g, 4, 3, '#ff9a30'); dot(g, 5, 3, '#ffd070'); dot(g, 5, 2, '#fff0b0');
  });
}

const WAX = [0xe4d8b8, 0xd2c4a0, 0xefe6cc, 0xc4b28c];
const waxMat = (k) => M.flat(WAX[k], { emissive: 0x2c2010 });
const flameMat = () => M.glow('#ffcf78', 2.6);

// ---------------------------------------------------------------- water
// The water and the bed of a canal (the banks come from quay(), the solids from waterSolid()).
export function canal(ctx, x0, z0, x1, z1) {
  water(ctx, x0, z0, x1, z1, WATER_Y);
  add(ctx, box(x1 - x0, 0.3, z1 - z0), M.dirt('#141a1e'), (x0 + x1) / 2, BED_Y - 0.15, (z0 + z1) / 2, { cast: false });
}

// A quay edge along a water line from (x0,z0) to (x1,z1); waterSide: where the canal lies ('+x', '-x',
// '+z', '-z'). A stone wall drops to the canal bed and a coping lip runs along the top.
export function quay(ctx, x0, z0, x1, z1, waterSide) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const sg = waterSide[0] === '+' ? 1 : -1; const H = -BED_Y - 0.05;
  const wallM = M.ashlar('#3a4454'), copeM = M.ashlar('#56606e');
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (alongX) {
    add(ctx, box(len, H, 0.52), wallM, cx, BED_Y + H / 2, z0 - sg * 0.24, { cast: false });
    add(ctx, box(len, 0.35, 0.56), copeM, cx, -0.125, z0 - sg * 0.22, { cast: false });
  } else {
    add(ctx, box(0.52, H, len), wallM, x0 - sg * 0.24, BED_Y + H / 2, cz, { cast: false });
    add(ctx, box(0.56, 0.35, len), copeM, x0 - sg * 0.22, -0.125, cz, { cast: false });
  }
}

// Water you cannot walk into (and nothing can blink onto); sight passes over it.
export function waterSolid(ctx, x0, z0, x1, z1) {
  solid(ctx, x0, z0, x1, z1, 1.0); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]);
}

// A stone bridge: a flagged deck level with the street, low capped parapets, a stepped arch over the
// water. axis: the way the deck runs; deck: [a0, a1] along the axis, [b0, b1] across; wet: [w0, w1]
// the open water along the axis.
export function bridge(ctx, axis, deck, wet, opts = {}) {
  const az = axis === 'z'; const [a0, a1, b0, b1] = deck; const [w0, w1] = wet; const wid = b1 - b0, bc = (b0 + b1) / 2;
  const stone = M.ashlar(opts.tone || '#4a5464'), capM = M.ashlar('#5c6676');
  // an axis-aligned block from p0..p1 along the axis, q0..q1 across, y0..y1
  const A = (p0, p1, q0, q1, y0, y1, mat, o = {}) => {
    const l = p1 - p0, wd = q1 - q0, pm = (p0 + p1) / 2, qm = (q0 + q1) / 2;
    return add(ctx, box(az ? wd : l, y1 - y0, az ? l : wd), mat, az ? qm : pm, (y0 + y1) / 2, az ? pm : qm, o);
  };
  A(a0, a1, b0, b1, -0.23, 0.02, M.flags(opts.deckTone || '#5a6474'), { cast: false });
  A(w0, w0 + 0.7, b0, b1, BED_Y, -0.23, stone); A(w1 - 0.7, w1, b0, b1, BED_Y, -0.23, stone);
  A(w0, w0 + 1.5, b0, b1, -0.47, -0.23, stone); A(w1 - 1.5, w1, b0, b1, -0.47, -0.23, stone);
  A(w0 + 1.5, w1 - 1.5, b0, b1, -0.3, -0.23, stone);
  for (const [q0, q1] of [[b0, b0 + 0.32], [b1 - 0.32, b1]]) {
    A(a0, a1, q0, q1, 0, 0.9, stone); A(a0 - 0.05, a1 + 0.05, q0 - 0.05, q1 + 0.05, 0.9, 1.0, capM);
    if (az) solid(ctx, q0, a0, q1, a1, 1.0); else solid(ctx, a0, q0, a1, q1, 1.0);
  }
  // end posts
  if (opts.posts !== false) for (const p of [a0 + 0.25, a1 - 0.25]) for (const q of [b0 + 0.16, b1 - 0.16]) {
    A(p - 0.25, p + 0.25, q - 0.25, q + 0.25, 0, 1.3, stone); A(p - 0.3, p + 0.3, q - 0.3, q + 0.3, 1.3, 1.4, capM);
    if (az) solid(ctx, q - 0.25, p - 0.25, q + 0.25, p + 0.25, 1.4); else solid(ctx, p - 0.25, q - 0.25, p + 0.25, q + 0.25, 1.4);
  }
  // candle stubs along the parapet caps
  if (opts.candles) for (const q of [b0 + 0.16, b1 - 0.16]) for (let p = a0 + 1.0; p < a1 - 0.8; p += 1.3) {
    const [x, z] = az ? [q, p] : [p, q]; candles(ctx, x, 1.0, z, 2, { r: 0.1, tall: 0.16, pool: false });
  }
  return { mid: bc, wid };
}

// A rowing boat moored in a canal (along 'x' or 'z', bow toward +), riding low, a lantern on the stern.
export function boat(ctx, x, z, len = 4.4, along = 'z', opts = {}) {
  const ax = along === 'x', W = opts.w || 1.25, y = opts.y ?? WATER_Y;
  const B = (lu, lh, lw, mat, u, yy, v, o) => add(ctx, box(ax ? lu : lw, lh, ax ? lw : lu), mat, x + (ax ? u : v), yy, z + (ax ? v : u), o);
  const hull = M.wood(opts.tone || '#4a3424'), rim = M.wood('#6a4e34'), inner = M.wood('#2a1e16');
  const L = len - W * 0.5, u0 = -W * 0.25;
  B(L, 0.34, W - 0.16, inner, u0, y + 0.03, 0);
  for (const sv of [-1, 1]) { B(L, 0.42, 0.1, hull, u0, y + 0.1, sv * (W / 2 - 0.05)); B(L, 0.05, 0.14, rim, u0, y + 0.33, sv * (W / 2 - 0.05)); }
  B(0.1, 0.42, W, hull, u0 - L / 2, y + 0.1, 0);
  const bu = u0 + L / 2; add(ctx, box(W * 0.71, 0.42, W * 0.71), hull, x + (ax ? bu : 0), y + 0.1, z + (ax ? 0 : bu), { ry: Math.PI / 4 });
  B(0.22, 0.05, W - 0.2, rim, u0 + 0.6, y + 0.22, 0); B(0.22, 0.05, W - 0.2, rim, u0 - L / 2 + 0.7, y + 0.22, 0);
  add(ctx, box(ax ? 2.2 : 0.06, 0.04, ax ? 0.06 : 2.2), M.wood('#7a5a3a'), x + (ax ? u0 : 0.2), y + 0.27, z + (ax ? 0.2 : u0), { ry: 0.12 });
  if (opts.lantern !== false) {
    const lu = u0 - L / 2 + 0.2; const lx = x + (ax ? lu : 0), lz = z + (ax ? 0 : lu);
    add(ctx, box(0.05, 1.0, 0.05), M.ironLit(), lx, y + 0.8, lz);
    add(ctx, box(0.2, 0.26, 0.2), M.glow('#ffb860', 2.2), lx, y + 1.42, lz, { cast: false });
    add(ctx, cone(0.18, 0.14, 4), M.ironLit(), lx, y + 1.62, lz, { ry: Math.PI / 4 });
    if (opts.light) ctx.lights.push({ x: lx, y: y + 1.4, z: lz, color: 0xffa850, intensity: opts.light, dist: 5, flicker: 0.08 });
  }
}

// An iron mooring bollard on the quay (a candle stub on top, more often than not).
export function bollard(ctx, x, z, candle = true) {
  put(ctx, 'mk-boll', geo('mk-bollG', () => new THREE.CylinderGeometry(0.11, 0.14, 0.62, 6)), M.ironLit(), x, 0.31, z, 1, 1, 1);
  put(ctx, 'mk-bollcap', geo('mk-bollcapG', () => new THREE.CylinderGeometry(0.16, 0.12, 0.08, 6)), M.ironLit(), x, 0.66, z, 1, 1, 1);
  if (candle) candles(ctx, x, 0.7, z, 1, { tall: 0.14, pool: false });
  solidCircle(ctx, x, z, 0.16, 0.7);
}

// ---------------------------------------------------------------- candles
// A cluster of candles, stubs and tapers in old wax, each with a flame; a pool of wax under them on
// the ground. light: intensity of a small warm light at the cluster (none if 0).
export function candles(ctx, x, y, z, n = 5, opts = {}) {
  const r = T.rng(Math.round(x * 97 + z * 53 + y * 31) + n * 7);
  const R = opts.r ?? 0.26, tall = opts.tall ?? 0.36, thick = opts.thick ?? 1;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = n === 1 ? 0 : Math.sqrt(r()) * R;
    const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
    const h = 0.08 + r() * tall, cr = (0.04 + r() * 0.03) * thick, k = (r() * WAX.length) | 0;
    put(ctx, 'mk-wax' + k, unitCyl(), waxMat(k), cx, y + h / 2, cz, cr, h, cr);
    put(ctx, 'mk-flame', unitBox(), flameMat(), cx, y + h + 0.05, cz, 0.06, 0.1, 0.06);
  }
  if (opts.pool !== false && y < 0.1) waxPool(ctx, x, z, R + 0.14);
  if (opts.light) ctx.lights.push({ x, y: y + 0.7, z, color: 0xffa850, intensity: opts.light, dist: opts.dist || 4.5, flicker: 0.14 });
}

// Spilled wax on the stones.
export function waxPool(ctx, x, z, r = 0.4) {
  put(ctx, 'mk-pool', unitCyl10(), waxMat(1), x, 0.035, z, r, 0.02, r * 0.8);
}

// A row of candles along a line (a step, a sill, a kerb).
export function candleRow(ctx, x0, z0, x1, z1, y = 0, n = 6, opts = {}) {
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; candles(ctx, x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t, opts.each || 2, { r: 0.12, tall: 0.24, pool: y < 0.1, ...opts }); }
}

// A ring of candles on the ground joined by a line of spilled wax.
export function candleRing(ctx, x, z, R, n = 16) {
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; candles(ctx, x + Math.cos(a) * R, 0, z + Math.sin(a) * R, 2, { r: 0.1, tall: 0.18, pool: false }); }
  add(ctx, geo('mk-ring' + R, () => new THREE.RingGeometry(R - 0.07, R + 0.07, 40)), waxMat(1), x, 0.036, z, { rx: -Math.PI / 2, cast: false });
}

// A wrought-iron candelabrum: a tall stand with five tapers.
export function candelabra(ctx, x, z, opts = {}) {
  const iron = M.ironLit(); const h = opts.h || 1.8;
  add(ctx, cone(0.34, 0.32, 4), iron, x, 0.16, z, { ry: Math.PI / 4 });
  add(ctx, cyl(0.04, 0.05, h, 5), iron, x, h / 2, z);
  add(ctx, box(1.0, 0.05, 0.05), iron, x, h, z, { ry: Math.PI / 4 });
  add(ctx, box(1.0, 0.05, 0.05), iron, x, h, z, { ry: -Math.PI / 4 });
  for (const [ox, oz, hh] of [[0, 0, 0.42], [0.35, 0.35, 0.3], [-0.35, 0.35, 0.34], [0.35, -0.35, 0.28], [-0.35, -0.35, 0.32]]) {
    add(ctx, cyl(0.07, 0.04, 0.06, 6), iron, x + ox, h + 0.04, z + oz);
    put(ctx, 'mk-wax0', unitCyl(), waxMat(0), x + ox, h + 0.07 + hh / 2, z + oz, 0.045, hh, 0.045);
    put(ctx, 'mk-flame', unitBox(), flameMat(), x + ox, h + 0.13 + hh, z + oz, 0.06, 0.11, 0.06);
  }
  waxPool(ctx, x + 0.1, z + 0.1, 0.45);
  solidCircle(ctx, x, z, 0.32, h);
  if (opts.light !== 0) ctx.lights.push({ x, y: h + 0.6, z, color: 0xffb060, intensity: opts.light || 3.4, dist: opts.dist || 6.5, flicker: 0.1 });
}

// Pillar candles burned down over a hundred nights, standing in their own spilled wax.
export function pillars(ctx, x, z, opts = {}) {
  const r = T.rng(Math.round(x * 41 + z * 23)); const n = opts.n || 3, s = opts.s || 1;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + r(), d = n === 1 ? 0 : 0.32 * s;
    const cx = x + Math.cos(a) * d, cz = z + Math.sin(a) * d;
    const h = (0.5 + r() * 0.9) * s, cr = (0.13 + r() * 0.07) * s, k = (r() * WAX.length) | 0, m = waxMat(k);
    add(ctx, unitCyl10(), m, cx, h / 2, cz, { s: V3(cr, h, cr) });
    add(ctx, unitCyl10(), m, cx, 0.05, cz, { s: V3(cr * 1.5, 0.1, cr * 1.5) });
    for (let j = 0; j < 3; j++) { const b = r() * Math.PI * 2, dh = h * (0.2 + r() * 0.3); add(ctx, box(0.05, dh, 0.05), m, cx + Math.cos(b) * cr, h - dh / 2, cz + Math.sin(b) * cr); }
    put(ctx, 'mk-flame', unitBox(), flameMat(), cx, h + 0.09, cz, 0.08, 0.16, 0.08);
  }
  waxPool(ctx, x, z, 0.75 * s);
  solidCircle(ctx, x, z, 0.55 * s, 1.2);
  if (opts.light) ctx.lights.push({ x, y: 1.6 * s, z, color: 0xffb060, intensity: opts.light, dist: opts.dist || 6, flicker: 0.12 });
}

// ---------------------------------------------------------------- lanterns
// A string of paper lanterns slung between two points (each [x, y, z]); one light at the middle.
export function lanterns(ctx, a, b, opts = {}) {
  const n = opts.n || 7, sag = opts.sag ?? 0.8;
  const at = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
  const rope = M.flat(0x1a1612), capM = M.ironLit();
  const S = 10; for (let i = 0; i < S; i++) bar(ctx, 'mk-rope', rope, at(i / S), at((i + 1) / S), 0.03);
  const cols = opts.colors || ['#ff9440', '#ff6038', '#ffc060', '#e85a3a'];
  const lanG = geo('mk-lanG', () => new THREE.CylinderGeometry(0.15, 0.15, 0.32, 8)), capG = geo('mk-lcapG', () => new THREE.CylinderGeometry(0.07, 0.11, 0.05, 6));
  const r = T.rng(Math.round(a[0] * 7 + a[2] * 13 + 3));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5 + (r() - 0.5) * 0.3) / n; const [x, y, z] = at(t); const s = 0.85 + r() * 0.3; const c = cols[(i + (r() * 2 | 0)) % cols.length];
    bar(ctx, 'mk-rope', rope, [x, y, z], [x, y - 0.14 * s, z], 0.02);
    put(ctx, 'mk-lan' + c, lanG, M.glow(c, 1.5), x, y - 0.3 * s, z, s, s, s);
    put(ctx, 'mk-lcap', capG, capM, x, y - 0.13 * s, z, s, 1, s);
    put(ctx, 'mk-lcap', capG, capM, x, y - 0.47 * s, z, s, 1, s);
  }
  if (opts.light !== false) { const [x, y, z] = at(0.5); ctx.lights.push({ x, y: y - 0.7, z, color: 0xff9448, intensity: opts.intensity || 3.2, dist: opts.dist || 7.5, flicker: 0.05, halo: !!opts.halo }); }
}

// The iron post a lantern string is tied to; returns the tie point.
export function stringPost(ctx, x, z, h = 3.8) {
  const iron = M.ironLit();
  add(ctx, box(0.34, 0.3, 0.34), M.ashlar('#3a4454'), x, 0.15, z);
  add(ctx, cyl(0.05, 0.07, h, 5), iron, x, h / 2, z);
  add(ctx, cone(0.08, 0.24, 4), iron, x, h + 0.12, z, { ry: Math.PI / 4 });
  add(ctx, geo('mk-hookT', () => new THREE.TorusGeometry(0.09, 0.02, 4, 8)), iron, x, h - 0.25, z);
  solidCircle(ctx, x, z, 0.2, h);
  return [x, h - 0.25, z];
}

// ---------------------------------------------------------------- buildings
// A tall, narrow canal house: a stepped gable on the front, tall windows (most lit, a candle on many
// sills), a shop window, a door with candle stubs on its step. front: '+x' or '+z' (toward the camera).
export function canalHouse(ctx, x, z, w, d, h, opts = {}) {
  const fx = (opts.front || '+x') === '+x';
  const body = opts.plaster ? M.plaster(opts.plaster) : M.brick(opts.tone || '#3a4456');
  const stone = M.ashlar('#384252'), cope = M.ashlar('#56606e');
  add(ctx, box(w, h, d), body, x, h / 2, z);
  add(ctx, box(w + 0.1, 0.6, d + 0.1), stone, x, 0.3, z);
  solid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, h);
  const span = fx ? d : w, depth = fx ? w : d;
  const rh = opts.roofH || span * 0.9;
  roof(ctx, x, h, z, w + 0.3, d + 0.3, rh, fx, opts.roofTone || '#222b38');
  // front-face helpers: u runs along the frontage, out away from the wall
  const F = (u, out = 0) => fx ? [x + w / 2 + out, z + u] : [x + u, z + d / 2 + out];
  const ryF = fx ? Math.PI / 2 : 0;
  const fbox = (fw, fh, fo, mat, u, y, out) => { const [px, pz] = F(u, out); return add(ctx, box(fx ? fo : fw, fh, fx ? fw : fo), mat, px, y, pz); };
  const decal = (pw, ph, mat, u, y, out) => { const [px, pz] = F(u, out); return add(ctx, plane(pw, ph), mat, px, y, pz, { ry: ryF, cast: false }); };
  // the stepped gable
  const n = opts.steps || 4, sh = rh / n;
  for (let i = 0; i < n; i++) {
    const sw = (span + 0.3) * (1 - i / n);
    fbox(sw, sh, 0.4, body, 0, h + sh * (i + 0.5), 0);
    fbox(sw + 0.08, 0.1, 0.5, cope, 0, h + sh * (i + 1) + 0.05, 0);
  }
  fbox(0.3, 0.5, 0.3, cope, 0, h + rh + 0.35, 0);
  // string courses between the floors
  for (let y = 2.4; y < h - 0.5; y += 2.2) fbox(span + 0.06, 0.12, 0.1, cope, 0, y, 0.04);
  const lit = opts.lit ?? 0.7; const r = T.rng(Math.round(x * 29 + z * 17 + h * 5));
  const cols = span >= 3.0 ? [-span / 4, span / 4] : [0];
  if (opts.windows !== false) {
    // ground floor: the door and a shop window
    const du = cols[0];
    decal(1, 2, M.decal(T.door(opts.doorTone || '#3e2a1e')), du, 1.0, 0.02);
    const [sx, sz] = F(du, 0.28); add(ctx, box(fx ? 0.56 : 1.2, 0.18, fx ? 1.2 : 0.56), M.ashlar('#4e5868'), sx, 0.09, sz);
    if (fx) solid(ctx, x + w / 2, z + du - 0.6, x + w / 2 + 0.56, z + du + 0.6, 0.2); else solid(ctx, x + du - 0.6, z + d / 2, x + du + 0.6, z + d / 2 + 0.56, 0.2);
    if (opts.stepCandles !== false) { const [cx, cz] = F(du + 0.38, 0.3); candles(ctx, cx, 0.18, cz, 3, { r: 0.14, tall: 0.2, pool: false }); }
    if (cols.length > 1) { const sl = r() < lit + 0.2; decal(1, 0.69, M.decal(shopWindow(sl), sl ? 1.4 : 0), cols[1], 1.45, 0.02); }
    // upper floors
    for (let y = 3.5; y + 0.6 < h; y += 2.2) for (const u of cols) {
      const isLit = r() < lit; decal(7 / 16, 13 / 16, M.decal(tallWindow(isLit), isLit ? 1.6 : 0), u, y, 0.02);
      fbox(0.6, 0.06, 0.14, cope, u, y - 0.44, 0.07);
      if (isLit && r() < 0.55) { const [cx, cz] = F(u + 0.14, 0.09); candles(ctx, cx, y - 0.41, cz, 1, { tall: 0.1, pool: false }); }
    }
    // a little window in the gable
    if (n >= 3) { const gl = r() < lit; decal(0.5, 0.625, M.decal(T.houseWindow(gl), gl ? 1.6 : 0), 0, h + sh * 1.5, 0.21); }
  }
  // windows down the side wall (hidden where a neighbour stands against it)
  if (opts.side !== false && opts.windows !== false) {
    const S = (v) => fx ? [x + v, z + d / 2 + 0.01] : [x + w / 2 + 0.01, z + v];
    const ns = Math.max(1, Math.floor((depth - 0.8) / 1.9));
    for (let y = 3.5; y + 0.6 < h; y += 2.2) for (let i = 0; i < ns; i++) {
      const v = -depth / 2 + (i + 0.5) * depth / ns; const isLit = r() < lit * 0.6; const [px, pz] = S(v);
      add(ctx, plane(7 / 16, 13 / 16), M.decal(tallWindow(isLit), isLit ? 1.6 : 0), px, y, pz, { ry: fx ? 0 : Math.PI / 2, cast: false });
    }
  }
  // a hoist beam under the top of the gable
  if (opts.hoist) {
    fbox(0.14, 0.14, 1.0, M.wood('#4a3626'), 0, h + rh - sh * 0.6, 0.5);
    const [hx, hz] = F(0, 0.92); bar(ctx, 'mk-rope', M.flat(0x1a1612), [hx, h + rh - sh * 0.6, hz], [hx, h + rh - sh * 0.6 - 1.4, hz], 0.03);
    add(ctx, box(0.12, 0.12, 0.12), M.ironLit(), hx, h + rh - sh * 0.6 - 1.45, hz);
  }
  // the chandlers' sign on an iron bracket
  if (opts.sign) {
    const u = cols.length > 1 ? cols[1] + 0.6 : 0.6;
    const [bx, bz] = F(u, 0.45); add(ctx, box(fx ? 0.9 : 0.05, 0.05, fx ? 0.05 : 0.9), M.ironLit(), bx, 2.95, bz);
    const [qx, qz] = F(u, 0.62); add(ctx, plane(0.62, 0.56), M.decal(candleSign()), qx, 2.6, qz, { ry: fx ? 0 : Math.PI / 2, cast: false });
  }
  if (opts.chimney !== false) { const [cx, cz] = F(span * 0.28, -depth * 0.65); add(ctx, box(0.55, 1.5, 0.55), M.brick('#252d3a'), cx, h + rh * 0.55, cz); }
  if (opts.light) { const [lx, lz] = F(cols[cols.length - 1], 0.8); ctx.lights.push({ x: lx, y: 1.5, z: lz, color: 0xffa040, intensity: opts.light, dist: 4.5 }); }
}

// The Chandlers' Hall: a broad stepped gable with a lit rose window, a tall portal between lancets,
// front steps crowded with candles. Faces +X.
export function guildHall(ctx, x, z, w, d, h, opts = {}) {
  canalHouse(ctx, x, z, w, d, h, { front: '+x', steps: 6, windows: false, roofH: d * 0.62, tone: '#353f52', chimney: false });
  const fx = x + w / 2, stone = M.ashlar('#4a5464'), cope = M.ashlar('#5c6676');
  add(ctx, plane(3.2, 3.2), M.decal(T.roseWindow(true), 0.7), fx + 0.22, h + 1.9, z, { ry: Math.PI / 2, cast: false });
  // buttress piers across the front
  for (const u of [-d / 2, -d / 4, d / 4, d / 2]) {
    add(ctx, box(0.6, h * 0.9, 0.6), stone, fx + 0.3, h * 0.45, z + u);
    add(ctx, box(0.5, 0.5, 0.6), cope, fx + 0.25, h * 0.9 + 0.15, z + u, { rz: 0.6 });
    solid(ctx, fx, z + u - 0.3, fx + 0.6, z + u + 0.3, h);
  }
  // portal: jambs, lintel, double door; lancets either side
  for (const s of [-1, 1]) add(ctx, box(0.36, 3.5, 0.36), stone, fx + 0.18, 1.75, z + s * 1.15);
  add(ctx, box(0.4, 0.45, 2.7), cope, fx + 0.2, 3.6, z);
  add(ctx, plane(1.9, 3.1), M.decal(T.door('#2c1f18')), fx + 0.02, 1.55, z, { ry: Math.PI / 2, cast: false });
  for (const u of [-4.6, -2.6, 2.6, 4.6]) add(ctx, plane(0.75, 2.6), M.decal(T.lancet(true, 12, 42), 0.8), fx + 0.02, 3.0, z + u, { ry: Math.PI / 2, cast: false });
  for (const u of [-3.6, 0, 3.6]) add(ctx, plane(0.62, 1.5), M.decal(T.lancet(true, 10, 24), 0.8), fx + 0.02, 5.6, z + u, { ry: Math.PI / 2, cast: false });
  // front steps
  add(ctx, box(1.4, 0.2, 5.4), stone, fx + 0.7, 0.1, z); add(ctx, box(0.8, 0.4, 4.4), stone, fx + 0.4, 0.2, z);
  solid(ctx, fx, z - 2.7, fx + 1.4, z + 2.7, 0.4);
  candleRow(ctx, fx + 1.2, z - 2.5, fx + 1.2, z - 0.9, 0.2, 3, { each: 3 });
  candleRow(ctx, fx + 1.2, z + 0.9, fx + 1.2, z + 2.5, 0.2, 3, { each: 3 });
  candleRow(ctx, fx + 0.6, z - 2.0, fx + 0.6, z + 2.0, 0.4, 5, { each: 2 });
}

// ---------------------------------------------------------------- market
// A market stall: counter, posts and a striped cloth awning sloping toward the customers, goods on
// top (candles, mostly), dipped candles hanging in pairs from the front beam.
// face: the side customers stand on ('+x', '-x', '+z', '-z'); w: frontage; d: depth.
export function stall(ctx, x, z, opts = {}) {
  const face = opts.face || '+x', w = opts.w || 2.4, d = opts.d || 1.3;
  const th = { '+x': 0, '-x': Math.PI, '+z': -Math.PI / 2, '-z': Math.PI / 2 }[face];
  const c = Math.round(Math.cos(th)), s = Math.round(Math.sin(th));
  const P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
  const B = (bu, bh, bv, mat, u, y, v, o = {}) => { const [px, pz] = P(u, v); return add(ctx, box(bu, bh, bv), mat, px, y, pz, { ry: th, ...o }); };
  const wood = M.wood('#5e4430'), dark = M.wood('#3e2c20'), top = M.wood('#7a6048');
  B(0.55, 0.9, w, wood, d / 2 - 0.275, 0.45, 0); B(0.65, 0.06, w + 0.1, top, d / 2 - 0.275, 0.93, 0);
  B(0.5, 0.75, w - 0.2, dark, -d / 2 + 0.25, 0.375, 0);
  for (const pu of [-1, 1]) for (const pv of [-1, 1]) { const ph = pu > 0 ? 2.1 : 2.5; B(0.08, ph, 0.08, dark, pu * d / 2, ph / 2, pv * (w / 2 - 0.04)); }
  B(0.06, 0.06, w + 0.1, dark, d / 2, 2.08, 0);
  // the awning
  const cloth = [M.flat(opts.cloth || '#7a2a26'), M.flat(opts.cloth2 || '#bfb091')];
  const nS = Math.max(4, Math.round(w / 0.32)), sw = w / nS, L = Math.hypot(d + 0.5, 0.45), tilt = -Math.atan2(0.45, d + 0.5);
  for (let i = 0; i < nS; i++) {
    const v = -w / 2 + (i + 0.5) * sw;
    B(L, 0.04, sw, cloth[i % 2], 0.25, 2.3, v, { rz: tilt });
    B(0.03, i % 2 ? 0.1 : 0.17, sw, cloth[i % 2], d / 2 + 0.5, 2.0, v);
  }
  // dipped candles hanging from the front beam
  for (let v = -w / 2 + 0.25; v < w / 2 - 0.1; v += 0.3) for (const du of [-0.03, 0.03]) {
    const [px, pz] = P(d / 2 - 0.05 + du, v + du); put(ctx, 'mk-wax2', unitCyl(), waxMat(2), px, 1.8, pz, 0.025, 0.28, 0.025);
  }
  // goods
  const goods = opts.goods || 'candles';
  if (goods === 'candles') for (const v of [-w / 3, 0, w / 3]) { const [px, pz] = P(d / 2 - 0.28, v); candles(ctx, px, 0.96, pz, 4, { r: 0.16, tall: 0.22, pool: false }); }
  if (goods === 'jars') for (let v = -w / 2 + 0.2; v < w / 2; v += 0.22) { const [px, pz] = P(d / 2 - 0.28, v); add(ctx, cyl(0.07, 0.07, 0.16, 6), M.flat(0x5a6a5a), px, 1.04, pz); }
  if (goods === 'cloth') for (const v of [-w / 3, 0, w / 3]) B(0.4, 0.14, 0.5, M.flat(v > 0 ? '#5a3a4a' : '#3a4a5a'), d / 2 - 0.28, 1.03, v);
  B(0.42, 0.42, 0.42, M.wood('#5a3e26'), -d / 2 + 0.25, 0.96, -w / 4); B(0.3, 0.3, 0.3, M.wood('#4e3a26'), -d / 2 + 0.25, 0.9, w / 4);
  // a solid over the footprint
  const xs = [], zs = []; for (const pu of [-1, 1]) for (const pv of [-1, 1]) { const [px, pz] = P(pu * (d / 2 + 0.05), pv * (w / 2 + 0.05)); xs.push(px); zs.push(pz); }
  solid(ctx, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), 1.0);
  if (opts.light) { const [lx, lz] = P(d / 2 + 0.3, 0); ctx.lights.push({ x: lx, y: 1.5, z: lz, color: 0xffa850, intensity: opts.light, dist: 4.5, flicker: 0.12 }); }
}

// ---------------------------------------------------------------- the tallow works
// A tallow vat on a brick hearth: wax that never sets over a fire that never dies.
export function vat(ctx, x, z, r = 0.9) {
  add(ctx, box(r * 2 + 0.4, 0.55, r * 2 + 0.4), M.brick('#3a2c28'), x, 0.275, z);
  add(ctx, cyl(r, r * 0.86, 1.0, 10), M.flat(0x22201e), x, 1.05, z);
  add(ctx, cyl(r + 0.07, r + 0.07, 0.1, 10), M.ironLit(), x, 1.55, z);
  add(ctx, cyl(r - 0.04, r - 0.04, 0.02, 10), M.glow('#e8d6a0', 1.05), x, 1.53, z, { cast: false });
  add(ctx, box(0.6, 0.28, 0.04), M.glow('#ff7a28', 2.2), x, 0.22, z + r + 0.21, { cast: false });
  add(ctx, box(0.04, 0.28, 0.6), M.glow('#ff7a28', 2.2), x + r + 0.21, 0.22, z, { cast: false });
  ctx.lights.push({ x: x + r * 0.6, y: 0.7, z: z + r * 0.6 + 0.4, color: 0xff7a30, intensity: 3.6, dist: 5.5, flicker: 0.3 });
  solid(ctx, x - r - 0.2, z - r - 0.2, x + r + 0.2, z + r + 0.2, 1.6);
}

// A drying rack: dipped candles hung in pairs over two poles between trestles.
export function dryingRack(ctx, x, z, len = 2.6, along = 'x') {
  const ax = along === 'x', wood = M.wood('#4a3626');
  for (const e of [-1, 1]) {
    const tx = ax ? x + e * len / 2 : x, tz = ax ? z : z + e * len / 2;
    for (const sv of [-1, 1]) add(ctx, box(0.07, 1.95, 0.07), wood, tx + (ax ? 0 : sv * 0.28), 0.95, tz + (ax ? sv * 0.28 : 0), ax ? { rx: sv * 0.16 } : { rz: -sv * 0.16 });
  }
  for (const sv of [-0.16, 0.16]) {
    add(ctx, box(ax ? len + 0.2 : 0.05, 0.05, ax ? 0.05 : len + 0.2), wood, x + (ax ? 0 : sv), 1.86, z + (ax ? sv : 0));
    for (let t = -len / 2 + 0.15; t <= len / 2 - 0.12; t += 0.13) for (const o of [-0.03, 0.03]) {
      const px = x + (ax ? t : sv + o), pz = z + (ax ? sv + o : t); put(ctx, 'mk-wax0', unitCyl(), waxMat(0), px, 1.6, pz, 0.022, 0.42, 0.022);
    }
  }
  if (ax) solid(ctx, x - len / 2 - 0.1, z - 0.4, x + len / 2 + 0.1, z + 0.4, 1.9); else solid(ctx, x - 0.4, z - len / 2 - 0.1, x + 0.4, z + len / 2 + 0.1, 1.9);
}

// A tall brick chimney stack (the works' flue).
export function chimney(ctx, x, z, h = 10) {
  add(ctx, box(1.4, h, 1.4), M.brick('#2e2a2e'), x, h / 2, z);
  add(ctx, box(1.7, 0.4, 1.7), M.ashlar('#3a4250'), x, h + 0.2, z);
  solid(ctx, x - 0.7, z - 0.7, x + 0.7, z + 0.7, h);
}
