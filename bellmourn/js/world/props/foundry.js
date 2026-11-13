// Props for District VI, the Bell Foundry: brick furnaces with burning mouths, channels of molten
// bronze with iron bridge plates, casting pits with half-buried bells, the great casting pit, gantry
// cranes, hanging chains and ladles, cast-iron columns and roof trusses, coal heaps and tubs on rails,
// clay moulds, ingots, anvils, braziers, soot-black chimneys, stone gargoyles, and the sparks rising
// from all of it. Everything is drawn here in code: boxes, lathes and small canvas pixel textures.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, inst, solid, solidCircle, plane } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { mergeGeometries } from '../../../vendor/BufferGeometryUtils.js';

// ---------------------------------------------------------------- helpers
const cache = new Map();
const mat = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };
// rusted cast iron that catches the furnace light
export const iron = () => mat('iron', () => cutout(new THREE.MeshPhongMaterial({ color: 0x221e1e, specular: 0x7a604c, shininess: 22 })));
export const bronze = () => mat('bronze', () => cutout(new THREE.MeshPhongMaterial({ color: 0x6e4c26, specular: 0xd8a868, shininess: 40 })));
export const oldBronze = () => mat('oldBronze', () => cutout(new THREE.MeshPhongMaterial({ color: 0x4a3a26, specular: 0x8a7050, shininess: 24 })));
const coalMat = () => mat('coal', () => cutout(new THREE.MeshPhongMaterial({ color: 0x131317, specular: 0x5a6070, shininess: 60 })));
export const SOOT = '#2c292c';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _d = new THREE.Vector3();
const Y1 = new THREE.Vector3(0, 1, 0);
const unitBox = () => geo('fd-ubox', () => new THREE.BoxGeometry(1, 1, 1));
// an instanced box of its own size and turn (one InstancedMesh per key)
function put(ctx, key, m, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  inst(ctx, key, unitBox(), m, _m.compose(_p, _q, _s));
}
// an instanced bar (strut, rod) between two points
function bar(ctx, key, m, a, b, t) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const len = Math.hypot(dx, dy, dz) || 1e-3;
  _q.setFromUnitVectors(Y1, _d.set(dx / len, dy / len, dz / len));
  _p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); _s.set(t, len, t);
  inst(ctx, key, unitBox(), m, _m.compose(_p, _q, _s));
}
// a part at a local offset (lx, ly, lz) of a prop turned by ry around (x, z); local +Z is its front
function part(ctx, g, m, x, z, ry, lx, ly, lz, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return add(ctx, g, m, x + lx * c + lz * s, ly, z - lx * s + lz * c, { ...o, ry: ry + (o.ry || 0) || undefined });
}
// small pixel textures
function pix(key, w, h, draw, repeat = false) {
  return mat('tex' + key, () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}
const dot = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
// a flat strip len x wid (along X), its texture at 16 texels per metre
function strip(len, wid, tw, th) {
  return geo(`fd-strip${len.toFixed(2)},${wid.toFixed(2)},${tw},${th}`, () => {
    const g = new THREE.PlaneGeometry(len, wid); const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 16 / tw, uv.getY(i) * wid * 16 / th);
    g.rotateX(-Math.PI / 2); return g;
  });
}
const once = new WeakMap();
function onceFor(ctx, key, fn) { let s = once.get(ctx); if (!s) once.set(ctx, (s = new Set())); if (!s.has(key)) { s.add(key); fn(); } }

// ---------------------------------------------------------------- molten bronze
const RAMP = ['#3a1206', '#7a2608', '#c24a10', '#ee7a1c', '#ffb03a', '#ffe08a'];
// flowing streaks, white-gold to dull red, with flecks of crust riding on them
function moltenTex() {
  return pix('molten', 32, 16, (g, W, H) => {
    const r = T.rng(611);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = Math.sin((x / W) * Math.PI * 4 + Math.sin((y / H) * Math.PI * 2) * 1.6);
      const b = Math.sin((x / W) * Math.PI * 2 - (y / H) * Math.PI * 4);
      const v = 0.55 + a * 0.22 + b * 0.16 + (r() - 0.5) * 0.18;
      dot(g, x, y, RAMP[Math.max(0, Math.min(5, Math.floor(v * 6)))]);
    }
    for (let k = 0; k < 5; k++) { const cx = (r() * W) | 0, cy = (r() * H) | 0, n = 2 + ((r() * 3) | 0); for (let i = 0; i < n; i++) { dot(g, (cx + i) % W, cy, RAMP[0]); dot(g, (cx + i) % W, (cy + 1) % H, RAMP[1]); } }
  }, true);
}
export const moltenMat = () => mat('molten', () => new THREE.MeshBasicMaterial({ map: moltenTex(), color: new THREE.Color(1.45, 1.3, 1.15), fog: false }));
function flow(ctx) { onceFor(ctx, 'flow', () => { const t = moltenTex(); ctx.anims.push({ update(dt) { t.offset.x = (t.offset.x - dt * 0.07) % 1; return false; } }); }); }

// The crust on a big pool: dark plates with glowing cracks, a few cells still liquid.
function crustTex() {
  return pix('crust', 64, 64, (g, W, H) => {
    const r = T.rng(1313); const pts = []; for (let i = 0; i < 18; i++) pts.push([r() * W, r() * H, r() < 0.22]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let d1 = 1e9, d2 = 1e9, i1 = 0;
      pts.forEach(([px, py], i) => { let dx = Math.abs(x - px), dy = Math.abs(y - py); dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; i1 = i; } else if (d < d2) d2 = d; });
      const e = d2 - d1; let c;
      if (e < 1.2) c = r() < 0.5 ? '#ffe08a' : '#ffb03a';
      else if (e < 2.4) c = '#e0661a';
      else if (pts[i1][2]) c = (x * 7 + y * 3) % 5 === 0 ? '#ffb03a' : '#ee7a1c';
      else c = (x * 5 + y * 11) % 7 === 0 ? '#4a1e10' : (e > 6 ? '#1c1210' : '#2c1610');
      dot(g, x, y, c);
    }
  }, true);
}

// A channel of molten bronze along X or Z: stone lips and the glowing run between them. Solid (not
// walkable) except at the bridges: o.gaps are positions along the run, each crossed by an iron plate.
export function channel(ctx, x0, z0, x1, z1, o = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const w = o.w || 0.7, lip = 0.16, h = 0.14, gw = o.gapW || 1.8;
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const c = alongX ? z0 : x0, len = a1 - a0, mid = (a0 + a1) / 2; const st = M.ashlar('#3a3638');
  for (const s of [-1, 1]) { const off = c + s * (w / 2 - lip / 2); if (alongX) add(ctx, box(len, h, lip), st, mid, h / 2, off); else add(ctx, box(lip, h, len), st, off, h / 2, mid); }
  const run = w - lip * 2;
  if (alongX) add(ctx, strip(len, run, 32, 16), moltenMat(), mid, 0.07, c, { cast: false });
  else add(ctx, strip(len, run, 32, 16), moltenMat(), c, 0.07, mid, { cast: false, ry: Math.PI / 2 });
  flow(ctx);
  const seg = (p, q) => { if (q - p < 0.05) return; if (alongX) solid(ctx, p, c - w / 2, q, c + w / 2, 0.5); else solid(ctx, c - w / 2, p, c + w / 2, q, 0.5); };
  let s0 = a0;
  for (const gc of (o.gaps || []).slice().sort((p, q) => p - q)) {
    seg(s0, gc - gw / 2); s0 = gc + gw / 2;
    // the bridge plate, riveted, with a low kerb either end
    if (alongX) { put(ctx, 'fd-plate', iron(), gc, 0.15, c, gw + 0.1, 0.04, w + 0.5); for (const e of [-1, 1]) put(ctx, 'fd-plate', iron(), gc + e * (gw / 2 + 0.02), 0.2, c, 0.08, 0.1, w + 0.5); }
    else { put(ctx, 'fd-plate', iron(), c, 0.15, gc, w + 0.5, 0.04, gw + 0.1); for (const e of [-1, 1]) put(ctx, 'fd-plate', iron(), c, 0.2, gc + e * (gw / 2 + 0.02), w + 0.5, 0.1, 0.08); }
  }
  seg(s0, a1);
  const n = o.lights ?? Math.max(0, Math.round(len / 6));
  for (let i = 0; i < n; i++) { const t = a0 + (i + 0.5) * len / n; ctx.lights.push({ x: alongX ? t : c, y: 0.7, z: alongX ? c : t, color: 0xff6a1a, intensity: o.intensity || 3, dist: 5, flicker: 0.12 }); }
}

// ---------------------------------------------------------------- furnaces
// The burning mouth: an arch of iron round white-gold fire, the grate and coals below. 3 frames.
function mouthTex() {
  return pix('mouth', 60, 18, (g, W, H) => {
    const r = T.rng(77); const fw = 20;
    for (let f = 0; f < 3; f++) for (let y = 0; y < H; y++) for (let x = 0; x < fw; x++) {
      const dx = x - 9.5, ay = 7; const arc = y < ay ? Math.hypot(dx, (ay - y) * 1.25) : Math.abs(dx);
      if (arc > 9.6) continue;
      if (arc > 8.5) { dot(g, f * fw + x, y, '#1a1210'); continue; }
      const heat = 1.05 - Math.abs(dx) / 9 * 0.55 - Math.abs(y - 11) / 16 + (r() - 0.5) * 0.35 + Math.sin(x * 0.9 + f * 2.1 + y * 0.5) * 0.12;
      let col = heat > 0.85 ? '#fff4c0' : heat > 0.68 ? '#ffd060' : heat > 0.5 ? '#ff9a30' : heat > 0.32 ? '#d4561a' : '#7a2410';
      if (y >= H - 4) col = x % 3 === 0 ? '#140e0c' : (heat > 0.5 ? '#ff7a20' : '#a03a10');
      dot(g, f * fw + x, y, col);
    }
  });
}
const heatMat = () => mat('heat', () => new THREE.MeshBasicMaterial({ map: T.glow('#ff8a3a', 32, 1.3), color: new THREE.Color(0.8, 0.38, 0.12), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
// a warm spill of light on the floor (a flat additive glow), w along X and d along Z
export function heatSpill(ctx, x, z, w, d, k = 1) {
  const m = new THREE.Mesh(plane(w, d), k === 1 ? heatMat() : mat('heat' + k, () => { const h = heatMat().clone(); h.color.multiplyScalar(k); return h; }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.renderOrder = 2; ctx.group.add(m);
}

// A brick furnace built against a wall, its back at x and its mouth facing +X: the burning arch behind
// a grate, an iron door hung open, a tapering hood and a soot-black flue; strong orange light.
export function furnace(ctx, x, z, o = {}) {
  const D = o.d || 2.2, W = o.w || 2.6, H = o.h || 3.2, top = o.flue || 11.5; const brick = M.brick(o.tone || '#33292a');
  const fx = x + D;
  add(ctx, box(D, H, W), brick, x + D / 2, H / 2, z);
  add(ctx, box(D + 0.16, 0.5, W + 0.16), M.ashlar('#3a3436'), x + D / 2, 0.25, z);
  add(ctx, box(D + 0.24, 0.22, W + 0.24), M.ashlar('#4a4446'), x + D / 2, H + 0.11, z);
  // the hood and the flue
  add(ctx, cyl(0.66, Math.max(D, W) * 0.66, 2.2, 4), brick, x + D / 2, H + 1.32, z, { ry: Math.PI / 4 });
  const fl = top - (H + 2.4);
  add(ctx, box(1.0, fl, 1.0), M.brick('#262224'), x + D / 2, H + 2.4 + fl / 2, z);
  for (let y = H + 3.6; y < top - 0.5; y += 2.2) add(ctx, box(1.08, 0.1, 1.08), iron(), x + D / 2, y, z);
  add(ctx, box(1.3, 0.3, 1.3), M.ashlar('#34303a'), x + D / 2, top + 0.15, z);
  // the mouth (its own copy of the fire, so the furnaces flicker apart)
  const t = mouthTex().clone(); t.needsUpdate = true; t.repeat.set(1 / 3, 1);
  const mm = new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, color: new THREE.Color(1.7, 1.5, 1.3), fog: false });
  const mw = 1.25, mh = 1.125;
  add(ctx, plane(mw, mh), mm, fx + 0.012, 0.5 + mh / 2, z, { ry: Math.PI / 2, cast: false, dynamic: true });
  add(ctx, box(0.24, 0.3, 1.9), M.ashlar('#4a4446'), fx + 0.08, 0.5 + mh + 0.2, z); // the lintel
  for (const s of [-1, 1]) add(ctx, box(0.12, mh + 0.3, 0.14), iron(), fx + 0.05, 0.5 + mh / 2, z + s * 0.7);
  add(ctx, box(0.5, 0.08, 1.6), iron(), fx + 0.25, 0.44, z); // the sill plate
  add(ctx, box(0.06, 1.1, 0.78), iron(), fx + 0.36, 1.05, z + 1.04, { ry: -0.85 }); // the door, hung open
  let k = Math.random() * 3, acc = 0;
  ctx.anims.push({ update(dt) { acc += dt; if (acc > 0.11) { acc = 0; k = (k + 1 + (Math.random() < 0.3 ? 1 : 0)) % 3; t.offset.x = Math.floor(k) / 3; } return false; } });
  heatSpill(ctx, fx + 1.1, z, 2.4, 2.4, o.spill ?? 0.6);
  ctx.lights.push({ x: fx + 0.9, y: 1.3, z, color: 0xff7424, intensity: o.light ?? 9, dist: o.dist ?? 10, flicker: 0.12 });
  solid(ctx, x, z - W / 2 - 0.08, fx + 0.1, z + W / 2 + 0.08, H);
}

// A cupola furnace: a tall round shaft in an iron skin on a brick foot, a charging door up top, the tap
// spout at its foot pouring into a channel (toward +X).
export function cupola(ctx, x, z, o = {}) {
  const r = o.r || 1.3, h = o.h || 9; const m = iron();
  add(ctx, cyl(r + 0.25, r + 0.35, 1.0, 10), M.brick(SOOT), x, 0.5, z);
  add(ctx, cyl(r, r, h - 1, 12), M.brick('#2a2628'), x, 1 + (h - 1) / 2, z);
  for (let y = 1.6; y < h; y += 1.4) add(ctx, cyl(r + 0.04, r + 0.04, 0.12, 12), m, x, y, z);
  add(ctx, cyl(r * 0.55, r + 0.1, 1.2, 10), M.brick('#252225'), x, h + 0.6, z);
  add(ctx, cyl(r * 0.5, r * 0.5, 3, 8), M.brick('#201e20'), x, h + 2.7, z);
  // the charging platform and its door, glowing
  add(ctx, box(1.6, 0.12, 2.6), m, x + r + 0.6, h * 0.62, z);
  for (const s of [-1, 1]) bar(ctx, 'fd-strut', m, [x + r + 1.3, 0, z + s * 1.2], [x + r + 1.3, h * 0.62, z + s * 1.2], 0.12);
  add(ctx, plane(0.7, 0.9), M.glow('#ff8a2a', 1.6), x + r + 0.02, h * 0.62 + 0.55, z, { ry: Math.PI / 2, cast: false });
  // the tap: a glowing hole, a spout and a falling stream
  add(ctx, plane(0.36, 0.3), M.glow('#ffc050', 2.4), x + r + 0.02, 0.85, z, { ry: Math.PI / 2, cast: false });
  add(ctx, box(0.7, 0.14, 0.3), m, x + r + 0.3, 0.62, z);
  add(ctx, box(0.1, 0.5, 0.1), M.glow('#ffb040', 2.6), x + r + 0.62, 0.32, z, { cast: false });
  heatSpill(ctx, x + r + 1.2, z, 2.6, 2.6, 0.6);
  ctx.lights.push({ x: x + r + 1.0, y: 1.2, z, color: 0xff7424, intensity: 8, dist: 9, flicker: 0.14 });
  solidCircle(ctx, x, z, r + 0.35, h);
  solid(ctx, x + r - 0.2, z - 1.4, x + r + 1.5, z + 1.4, 0.6);
}

// ---------------------------------------------------------------- bells
// One bell profile (radius, height) for a bell 1 m tall: crown, shoulder, waist, sound bow, lip.
const BELL = [[0, 1.0], [0.16, 0.99], [0.26, 0.96], [0.31, 0.9], [0.32, 0.78], [0.33, 0.62], [0.36, 0.46], [0.41, 0.3], [0.48, 0.15], [0.54, 0.05], [0.56, 0.0], [0.5, 0.0], [0.45, 0.06], [0.38, 0.2], [0.32, 0.38], [0.28, 0.6], [0.26, 0.8], [0, 0.86]];
const bellGeo = () => geo('fd-bell', () => new THREE.LatheGeometry(BELL.map(([r, y]) => new THREE.Vector2(r, y)), 16));
const ringGeo = (r, t) => geo(`fd-ring${r},${t}`, () => new THREE.TorusGeometry(r, t, 4, 20).rotateX(Math.PI / 2));
// A bell s metres tall standing at (x, y, z). Upright bells get their bands and the crown loop.
export function bell(ctx, x, y, z, s, o = {}) {
  const m = o.mat || bronze(); const opts = { s: new THREE.Vector3(s, s, s), parent: o.parent, cast: o.cast };
  if (o.rx) opts.rx = o.rx; if (o.rz) opts.rz = o.rz; if (o.ry) opts.ry = o.ry;
  add(ctx, bellGeo(), m, x, y, z, opts);
  if (o.rx || o.rz) return;
  const band = o.band || mat('band', () => cutout(new THREE.MeshPhongMaterial({ color: 0x84602e, specular: 0xe0b878, shininess: 44 })));
  const shows = (hy) => !!o.parent || y + hy * s > 0.02; // bands under the floor are left out
  for (const [hy, hr] of [[0.15, 0.49], [0.78, 0.325], [0.9, 0.315]]) if (shows(hy)) add(ctx, ringGeo(hr, 0.022), band, x, y + hy * s, z, { s: new THREE.Vector3(s, s, s), parent: o.parent });
  if (shows(0.62)) add(ctx, ringGeo(0.335, 0.016), M.flat(0x3c5c4e), x, y + 0.62 * s, z, { s: new THREE.Vector3(s, s, s), parent: o.parent }); // verdigris
  add(ctx, geo('fd-crown', () => new THREE.TorusGeometry(0.09, 0.03, 4, 8)), m, x, y + 1.04 * s, z, { s: new THREE.Vector3(s, s, s), parent: o.parent });
}
// A bell tipped on its side on the floor, mouth toward ry.
export function tippedBell(ctx, x, z, s, ry = 0, m = oldBronze()) {
  const g = new THREE.Group(); g.position.set(x, 0.5 * s * 0.96, z); g.rotation.y = ry; ctx.group.add(g);
  const b = new THREE.Mesh(bellGeo(), m); b.scale.setScalar(s); b.rotation.x = Math.PI / 2 - 0.12; b.position.set(0, 0, -0.45 * s); b.castShadow = b.receiveShadow = true; g.add(b);
  solidCircle(ctx, x, z, 0.5 * s, 0.9 * s);
}

// A casting pit: a stone kerb round packed sand and a bell buried to its shoulders. o.hot: the pour is
// fresh and bronze still glows round it.
export function castPit(ctx, x, z, w, d, o = {}) {
  const k = 0.32, kh = 0.42, st = M.ashlar('#403c40');
  for (const s of [-1, 1]) { add(ctx, box(w, kh, k), st, x, kh / 2, z + s * (d / 2 - k / 2)); add(ctx, box(k, kh, d - 2 * k), st, x + s * (w / 2 - k / 2), kh / 2, z); }
  add(ctx, box(w - 2 * k, 0.05, d - 2 * k), M.dirt('#3a2e26'), x, 0.025, z, { cast: false });
  const s = o.s || Math.min(w, d) * 0.7;
  bell(ctx, x, -s * 0.5, z, s, { mat: o.old ? oldBronze() : bronze() });
  if (o.hot) {
    add(ctx, geo(`fd-seam${s}`, () => new THREE.RingGeometry(s * 0.36, s * 0.36 + 0.2, 18).rotateX(-Math.PI / 2)), moltenMat(), x, 0.06, z, { cast: false });
    // the runner cups at the edge, brimming
    for (const [dx, dz] of [[-0.3, 0.32], [0.32, -0.3]]) add(ctx, cyl(0.16, 0.12, 0.08, 8), moltenMat(), x + dx * (w - 2 * k), 0.08, z + dz * (d - 2 * k), { cast: false });
    flow(ctx);
    ctx.lights.push({ x, y: 1.0, z, color: 0xff6a1a, intensity: o.light ?? 4, dist: 6, flicker: 0.1 });
  }
  solid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, 0.5);
}

// The great casting pit: a deep stone-lined pit brimming with crusted bronze, the crown of a bell the
// size of a house rising out of it, all lit from below. The whole rectangle is solid.
export function greatPit(ctx, x0, z0, x1, z1, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const st = M.ashlar('#3e3a3e'), lo = M.ashlar('#2e2a2e');
  // the lips: the near one low so the pool shows, the far one high against the wall
  add(ctx, box(w + 0.8, 0.6, 0.45), st, cx, 0.3, z1 + 0.22);
  add(ctx, box(w + 0.8, 1.3, 0.5), st, cx, 0.65, z0 - 0.25);
  for (const s of [-1, 1]) add(ctx, box(0.45, 0.9, d + 0.95), st, cx + s * (w / 2 + 0.22), 0.45, cz);
  // the inner faces of the far walls, sooted dark, and a ledge just above the bronze
  add(ctx, box(w, 0.5, 0.2), lo, cx, 0.32, z0 + 0.1);
  for (const s of [-1, 1]) add(ctx, box(0.2, 0.4, d), lo, cx + s * (w / 2 - 0.1), 0.25, cz);
  // the pool
  const tex = crustTex();
  const pm = mat('crust', () => new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25, 1.15, 1.05), fog: false }));
  add(ctx, strip(w - 0.2, d - 0.2, 64, 64), pm, cx, 0.1, cz, { cast: false, dynamic: true });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; const k = 1.12 + Math.sin(t * 1.3) * 0.1 + Math.sin(t * 3.1) * 0.04; pm.color.setRGB(k * 1.1, k, k * 0.92); tex.offset.x = (tex.offset.x + dt * 0.004) % 1; return false; } });
  // the bell, buried to its shoulders
  const s = o.bell || Math.min(w, d) * 0.95;
  bell(ctx, cx, -s * 0.45, cz, s, { mat: bronze() });
  add(ctx, geo(`fd-seam${s}`, () => new THREE.RingGeometry(s * 0.355, s * 0.355 + 0.3, 24).rotateX(-Math.PI / 2)), moltenMat(), cx, 0.12, cz, { cast: false });
  flow(ctx);
  heatSpill(ctx, cx, z1 + 1.1, w * 0.8, 2.4, 0.4);
  for (const lx of [-w * 0.3, w * 0.3]) ctx.lights.push({ x: cx + lx, y: 1.6, z: cz + d * 0.3, color: 0xff6a1a, intensity: 8, dist: 11, flicker: 0.08 });
  solid(ctx, x0 - 0.45, z0 - 0.5, x1 + 0.45, z1 + 0.45, 1.2);
  return { x: cx, z: cz, top: s * 0.55 };
}

// ---------------------------------------------------------------- iron: columns, trusses, cranes, chains
// A cast-iron column on a stone foot, with a flared capital.
export function column(ctx, x, z, h = 6.4) {
  const m = iron();
  add(ctx, box(0.52, 0.36, 0.52), M.ashlar('#3c3a3e'), x, 0.18, z);
  add(ctx, cyl(0.15, 0.19, h - 0.66, 8), m, x, 0.36 + (h - 0.66) / 2, z);
  add(ctx, cyl(0.26, 0.15, 0.24, 8), m, x, h - 0.42, z);
  add(ctx, box(0.48, 0.18, 0.48), m, x, h - 0.09, z);
  solidCircle(ctx, x, z, 0.3, h);
}

// A riveted iron roof truss spanning X at z: a level bottom chord at yBot, a sloping top chord from
// yA (at xa) to yB (at xb), posts and diagonals between.
export function truss(ctx, xa, xb, z, yBot, yA, yB, o = {}) {
  const m = iron(); const n = o.n || Math.max(3, Math.round(Math.abs(xb - xa) / 2.3));
  bar(ctx, 'fd-truss', m, [xa, yBot, z], [xb, yBot, z], 0.12);
  bar(ctx, 'fd-truss', m, [xa, yA, z], [xb, yB, z], 0.14);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = xa + (xb - xa) * t, yt = yA + (yB - yA) * t;
    if (yt - yBot > 0.2) bar(ctx, 'fd-web', m, [x, yBot, z], [x, yt, z], 0.07);
    if (i < n) { const t2 = (i + 1) / n, x2 = xa + (xb - xa) * t2, yt2 = yA + (yB - yA) * t2; if (i % 2) bar(ctx, 'fd-web', m, [x, yBot, z], [x2, yt2, z], 0.06); else bar(ctx, 'fd-web', m, [x, yt, z], [x2, yBot, z], 0.06); }
  }
}
// Purlins along Z between trusses (some missing where the roof burned).
export function purlins(ctx, xs, z0, z1, yAt) {
  for (const x of xs) bar(ctx, 'fd-truss', iron(), [x, yAt(x) + 0.1, z0], [x, yAt(x) + 0.1, z1], 0.1);
}
// A lean-to of slates against a wall, from (xWall, yHigh) down to (xLow, yLow), along Z from z0 to z1.
export function leanRoof(ctx, xWall, xLow, yHigh, yLow, z0, z1, tone = '#1e2027') {
  const dx = xLow - xWall, dy = yLow - yHigh, len = Math.hypot(dx, dy);
  add(ctx, box(len, 0.16, z1 - z0), M.slate(tone), (xWall + xLow) / 2, (yHigh + yLow) / 2, (z0 + z1) / 2, { rz: Math.atan2(dy, dx) });
  add(ctx, box(0.16, 0.3, z1 - z0), M.wood('#2e2420'), xLow, yLow - 0.12, (z0 + z1) / 2); // the fascia
}

// A chain of alternating links from a to b (instanced; links ~16 cm).
export function chain(ctx, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const len = Math.hypot(dx, dy, dz); const n = Math.max(1, Math.floor(len / 0.13));
  _q.setFromUnitVectors(Y1, _d.set(dx / len, dy / len, dz / len)); const m = iron();
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n; _p.set(a[0] + dx * t, a[1] + dy * t, a[2] + dz * t);
    if (i % 2) _s.set(0.11, 0.17, 0.04); else _s.set(0.04, 0.17, 0.11);
    inst(ctx, 'fd-link', unitBox(), m, _m.compose(_p, _q, _s));
  }
}
// A crane hook at the end of a chain.
export function hook(ctx, x, y, z, parent) {
  const m = iron();
  add(ctx, box(0.14, 0.3, 0.14), m, x, y - 0.15, z, { parent });
  add(ctx, geo('fd-hook', () => new THREE.TorusGeometry(0.17, 0.045, 4, 10, Math.PI * 1.4)), m, x, y - 0.46, z, { rz: Math.PI * 0.8, parent });
}

// A gantry crane: two A-frame legs on bogies over rails, a lattice girder at height h spanning X, and
// the trolley. Returns where the trolley's chains start.
export function gantry(ctx, x0, x1, z, h, o = {}) {
  const m = iron(); const sp = o.spread || 1.3;
  for (const x of [x0, x1]) {
    for (const s of [-1, 1]) bar(ctx, 'fd-gleg', m, [x, 0.4, z + s * sp], [x, h, z], 0.26);
    put(ctx, 'fd-box', m, x, 0.22, z, 0.5, 0.36, sp * 2 + 0.7);
    for (const s of [-1, 1]) put(ctx, 'fd-box', m, x, 0.18, z + s * (sp + 0.1), 0.62, 0.3, 0.3, 0, 0, Math.PI / 4);
    bar(ctx, 'fd-gleg', m, [x, h * 0.42, z - sp * 0.58], [x, h * 0.42, z + sp * 0.58], 0.14);
    solid(ctx, x - 0.34, z - sp - 0.42, x + 0.34, z + sp + 0.42, h);
  }
  const L = x1 - x0, mx = (x0 + x1) / 2;
  put(ctx, 'fd-box', m, mx, h, z, L + 0.9, 0.24, 0.5);
  put(ctx, 'fd-box', m, mx, h + 1.0, z, L + 0.9, 0.2, 0.5);
  const n = Math.round(L / 1.0);
  for (let i = 0; i < n; i++) { const xa = x0 + (i / n) * L, xb = x0 + ((i + 1) / n) * L; for (const s of [-1, 1]) bar(ctx, 'fd-web', m, [i % 2 ? xa : xb, h + 0.1, z + s * 0.22], [i % 2 ? xb : xa, h + 0.92, z + s * 0.22], 0.07); }
  const xt = o.trolley ?? mx;
  put(ctx, 'fd-box', m, xt, h + 1.35, z, 1.3, 0.5, 1.1);
  add(ctx, cyl(0.3, 0.3, 1.0, 8), m, xt, h - 0.3, z, { rx: Math.PI / 2 });
  return { x: xt, y: h - 0.5, z };
}

// A bell hanging from a hook on two chains, swaying a little. (Built under its own pivot.)
export function hangingBell(ctx, x, yTop, z, len, s, o = {}) {
  const pivot = new THREE.Group(); pivot.position.set(x, yTop, z); ctx.group.add(pivot);
  const m = iron(); const links = [];
  const n = Math.floor(len / 0.13);
  for (const lz of [-0.12, 0.12]) for (let i = 0; i < n; i++) { const g = new THREE.BoxGeometry(i % 2 ? 0.11 : 0.04, 0.17, i % 2 ? 0.04 : 0.11); g.translate(0, -0.08 - i * 0.13, lz * (1 - i / n)); links.push(g); }
  const cm = new THREE.Mesh(mergeGeometries(links, false), m); cm.castShadow = true; pivot.add(cm); for (const g of links) g.dispose();
  hook(ctx, 0, -len, 0, pivot);
  bell(ctx, 0, -len - 0.5 - s * 1.0, 0, s, { mat: o.mat || oldBronze(), parent: pivot });
  let t = Math.random() * 6;
  ctx.anims.push({ update(dt) { t += dt; pivot.rotation.z = Math.sin(t * 0.7) * 0.03; pivot.rotation.x = Math.sin(t * 0.53 + 1) * 0.022; return false; } });
  return pivot;
}

// A crucible ladle hanging from a chain, tipped toward +X, pouring a thin stream into a pit below.
export function ladle(ctx, x, y, z, yTo = 0.1) {
  const m = iron();
  add(ctx, cyl(0.5, 0.36, 0.8, 10), m, x, y, z, { rz: -0.45 });
  add(ctx, cyl(0.44, 0.44, 0.04, 10), moltenMat(), x + 0.18, y + 0.37, z, { rz: -0.45, cast: false });
  add(ctx, box(0.06, 1.3, 0.06), m, x - 0.05, y + 0.7, z + 0.5, { rx: 0.4 }); add(ctx, box(0.06, 1.3, 0.06), m, x - 0.05, y + 0.7, z - 0.5, { rx: -0.4 }); // the bail
  add(ctx, box(0.3, 0.1, 0.18), m, x + 0.52, y + 0.22, z, { rz: -0.6 }); // spout
  const sl = y + 0.12 - yTo;
  add(ctx, box(0.07, sl, 0.07), M.glow('#ffb040', 2.6), x + 0.66, yTo + sl / 2, z, { cast: false });
  ctx.lights.push({ x: x + 0.66, y: yTo + 0.8, z, color: 0xff7a24, intensity: 4.5, dist: 6, flicker: 0.18 });
}

// ---------------------------------------------------------------- yard and floor clutter
// A heap of coal, lumps rolled off its foot.
export function coal(ctx, x, z, r = 1, h = 0.8) {
  add(ctx, cyl(r * 0.28, r, h, 8), coalMat(), x, h / 2, z, { ry: x * 1.3 });
  const rr = T.rng(Math.round(x * 31 + z * 17) + 5);
  for (let i = 0; i < Math.round(r * 10); i++) { const a = rr() * 6.283, dd = r * (0.3 + rr() * 0.8), yy = Math.max(0.05, h * (1 - dd / r) * 0.95 + 0.04); put(ctx, 'fd-lump', coalMat(), x + Math.cos(a) * dd, yy, z + Math.sin(a) * dd, 0.14 + rr() * 0.12, 0.1 + rr() * 0.08, 0.14 + rr() * 0.1, rr() * 3, rr(), rr()); }
  solidCircle(ctx, x, z, r * 0.85, h);
}
// A heap of slag: rough grey-brown, a few clinkers still glowing.
export function slag(ctx, x, z, r = 1.2, h = 0.8) {
  add(ctx, cyl(r * 0.35, r, h, 7), M.flat(0x2e2a2a), x, h / 2, z, { ry: z });
  const rr = T.rng(Math.round(x * 13 + z * 29) + 9);
  for (let i = 0; i < Math.round(r * 6); i++) { const a = rr() * 6.283, dd = r * (0.2 + rr() * 0.85), yy = Math.max(0.05, h * (1 - dd / r)); put(ctx, 'fd-slag', M.flat(0x3a3434), x + Math.cos(a) * dd, yy, z + Math.sin(a) * dd, 0.2 + rr() * 0.2, 0.14, 0.2 + rr() * 0.16, rr() * 3, rr(), rr()); }
  for (let i = 0; i < 3; i++) { const a = rr() * 6.283, dd = r * (0.3 + rr() * 0.5); put(ctx, 'fd-clinker', M.glow('#ff6a20', 1.3), x + Math.cos(a) * dd, h * (1 - dd / r) + 0.04, z + Math.sin(a) * dd, 0.08, 0.06, 0.08); }
  solidCircle(ctx, x, z, r * 0.85, h);
}
// Moulding sand, piled.
export function sand(ctx, x, z, r = 1, h = 0.7) {
  add(ctx, cyl(r * 0.3, r, h, 8), M.dirt('#5a4836'), x, h / 2, z);
  solidCircle(ctx, x, z, r * 0.85, h);
}

// Narrow-gauge rails on sleepers along X or Z.
export function rails(ctx, x0, z0, x1, z1, gauge = 0.8) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; const m = iron(), wd = M.wood('#3a2c22');
  for (const s of [-1, 1]) { if (alongX) put(ctx, 'fd-rail', m, mx, 0.05, mz + s * gauge / 2, len, 0.07, 0.07); else put(ctx, 'fd-rail', m, mx + s * gauge / 2, 0.05, mz, 0.07, 0.07, len); }
  const n = Math.floor(len / 0.6);
  for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; if (alongX) put(ctx, 'fd-sleeper', wd, mx + t, 0.02, mz, 0.2, 0.04, gauge + 0.5); else put(ctx, 'fd-sleeper', wd, mx, 0.02, mz + t, gauge + 0.5, 0.04, 0.2); }
}
// An iron coal tub on four wheels (on its side and spilled, if tipped).
export function tub(ctx, x, z, ry = 0, tipped = false) {
  const m = iron();
  if (tipped) {
    part(ctx, box(0.75, 0.5, 1.0), m, x, z, ry, 0, 0.38, 0, { rz: 1.35 });
    coal(ctx, x + Math.sin(ry + Math.PI / 2) * 0.9, z + Math.cos(ry + Math.PI / 2) * 0.9, 0.7, 0.35);
  } else {
    part(ctx, box(0.75, 0.5, 1.0), m, x, z, ry, 0, 0.55, 0);
    part(ctx, box(0.66, 0.08, 0.9), coalMat(), x, z, ry, 0, 0.8, 0);
    part(ctx, cyl(0.24, 0.3, 0.2, 7), coalMat(), x, z, ry, 0, 0.92, 0);
    for (const [lx, lz] of [[-0.4, -0.32], [0.4, -0.32], [-0.4, 0.32], [0.4, 0.32]]) part(ctx, cyl(0.16, 0.16, 0.06, 8), m, x, z, ry, lx, 0.18, lz, { rz: Math.PI / 2 });
  }
  solidCircle(ctx, x, z, 0.62, 1);
}

// A clay cope (the outer mould of a bell), iron-hooped; a core (brick dome) if o.core.
const COPE = [[0, 1.08], [0.24, 1.06], [0.38, 0.98], [0.44, 0.8], [0.47, 0.55], [0.55, 0.28], [0.64, 0.08], [0.66, 0], [0, 0]];
const copeGeo = () => geo('fd-cope', () => new THREE.LatheGeometry(COPE.map(([r, y]) => new THREE.Vector2(r, y)), 12));
export function mould(ctx, x, z, s = 1.2, o = {}) {
  const sv = new THREE.Vector3(s, s * (o.core ? 0.8 : 1), s);
  add(ctx, copeGeo(), o.core ? M.flat(0x4a3a32) : M.flat(0x5e4a3c), x, o.y || 0, z, { s: sv });
  if (!o.core) for (const [hy, hr] of [[0.12, 0.62], [0.55, 0.475], [0.88, 0.42]]) add(ctx, cyl(hr * s + 0.02, hr * s + 0.02, 0.06, 12), iron(), x, (o.y || 0) + hy * s, z);
  if (!o.y) solidCircle(ctx, x, z, 0.62 * s, s);
}
// Ingots stacked crosswise.
export function ingots(ctx, x, z, layers = 4) {
  for (let l = 0; l < layers; l++) for (let i = 0; i < 4; i++) { const along = l % 2, off = (i - 1.5) * 0.17; put(ctx, 'fd-ingot', bronze(), x + (along ? off : 0), 0.045 + l * 0.09, z + (along ? 0 : off), along ? 0.12 : 0.6, 0.08, along ? 0.6 : 0.12); }
  solid(ctx, x - 0.34, z - 0.34, x + 0.34, z + 0.34, 0.4);
}
// An anvil on an oak stump.
export function anvil(ctx, x, z, ry = 0) {
  const m = iron();
  add(ctx, cyl(0.3, 0.34, 0.55, 8), M.wood('#3e2e22'), x, 0.275, z);
  part(ctx, box(0.24, 0.12, 0.3), m, x, z, ry, 0, 0.61, 0);
  part(ctx, box(0.26, 0.16, 0.62), m, x, z, ry, 0, 0.75, 0.04);
  part(ctx, geo('fd-horn', () => new THREE.ConeGeometry(0.08, 0.32, 5).rotateX(Math.PI / 2)), m, x, z, ry, 0, 0.78, 0.5);
  part(ctx, box(0.05, 0.05, 0.5), M.wood('#5a4632'), x, z, ry, 0.2, 0.58, -0.3, { rx: 0.6 }); // a hammer leant against it
  solidCircle(ctx, x, z, 0.42, 0.9);
}
// A coal brazier on three legs, a flame on top.
export function brazier(ctx, x, z, o = {}) {
  const m = iron();
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; bar(ctx, 'fd-strut', m, [x + Math.sin(a) * 0.38, 0, z + Math.cos(a) * 0.38], [x + Math.sin(a) * 0.2, 0.78, z + Math.cos(a) * 0.2], 0.06); }
  add(ctx, cyl(0.42, 0.24, 0.3, 8), m, x, 0.88, z);
  add(ctx, cyl(0.36, 0.36, 0.05, 8), M.glow('#ff7a28', 2.2), x, 1.02, z, { cast: false });
  const tex = T.flame().clone(); tex.needsUpdate = true; tex.repeat.set(1 / 4, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.2, 1.8, 1.5), fog: false }));
  sp.scale.set(0.55, 0.8, 1); sp.position.set(x, 1.4, z); ctx.group.add(sp);
  let t = Math.random() * 10; ctx.anims.push({ update(dt) { t += dt; tex.offset.x = (Math.floor(t * 10) % 4) / 4; return false; } });
  ctx.lights.push({ x, y: 1.5, z, color: 0xff7a2a, intensity: o.intensity || 4.5, dist: o.dist || 6.5, flicker: 0.2, halo: true });
  solidCircle(ctx, x, z, 0.45, 1.1);
}

// A soot-black chimney stack: a brick shaft on a plinth, iron bands, a corbelled cap, blacker at the top.
export function chimney(ctx, x, z, h = 14, s = 2) {
  const b = M.brick('#252225');
  add(ctx, box(s + 0.4, 1.2, s + 0.4), M.ashlar('#34323a'), x, 0.6, z);
  add(ctx, box(s, h - 3.2, s), b, x, 1.2 + (h - 3.2) / 2, z);
  add(ctx, box(s + 0.02, 2, s + 0.02), M.brick('#171517'), x, h - 1, z);
  for (let y = 3; y < h - 2; y += 2.4) add(ctx, box(s + 0.08, 0.12, s + 0.08), iron(), x, y, z);
  add(ctx, box(s + 0.36, 0.3, s + 0.36), M.ashlar('#3a3840'), x, h + 0.15, z);
  add(ctx, box(s + 0.16, 0.5, s + 0.16), M.brick('#141214'), x, h + 0.55, z);
  // the flue arch at its foot, glowing faintly
  add(ctx, plane(0.7, 0.9), M.glow('#a03c12', 1.2), x + s / 2 + 0.01, 1.65, z, { ry: Math.PI / 2, cast: false });
  solid(ctx, x - s / 2 - 0.2, z - s / 2 - 0.2, x + s / 2 + 0.2, z + s / 2 + 0.2, h);
}

// A stone gargoyle perched on a ledge, hunched, wings half spread, looking down (its front: ry).
export function gargoyle(ctx, x, y, z, ry = 0) {
  const st = M.flat(0x4c5058), dk = M.flat(0x363940);
  part(ctx, box(0.66, 0.16, 0.66), dk, x, z, ry, 0, y + 0.08, 0);
  part(ctx, box(0.5, 0.36, 0.46), st, x, z, ry, 0, y + 0.34, -0.06);
  part(ctx, box(0.4, 0.42, 0.34), st, x, z, ry, 0, y + 0.72, 0.08);
  part(ctx, box(0.3, 0.26, 0.34), st, x, z, ry, 0, y + 0.98, 0.3);
  part(ctx, box(0.2, 0.1, 0.16), dk, x, z, ry, 0, y + 0.88, 0.48); // the jaw
  for (const s of [-1, 1]) {
    part(ctx, box(0.06, 0.2, 0.06), dk, x, z, ry, s * 0.1, y + 1.18, 0.26, { rz: s * 0.4 }); // horns
    part(ctx, box(0.08, 0.62, 0.5), dk, x, z, ry, s * 0.32, y + 0.98, -0.14, { rz: -s * 0.45 }); // wings
    part(ctx, box(0.1, 0.32, 0.12), st, x, z, ry, s * 0.17, y + 0.32, 0.26); // forelegs
  }
}

// An iron floor plate, riveted (flat, walkable).
export function plate(ctx, x, z, w = 1.6, d = 1.6) {
  put(ctx, 'fd-floorplate', iron(), x, 0.015, z, w, 0.03, d);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(ctx, 'fd-rivet', iron(), x + sx * (w / 2 - 0.1), 0.035, z + sz * (d / 2 - 0.1), 0.06, 0.03, 0.06);
}
// A splash of bronze spilled on the floor, still glowing at its heart (flat, walkable).
export function splash(ctx, x, z, r = 0.4) {
  add(ctx, geo('fd-splash', () => new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2)), M.flat(0x2a1a14), x, 0.014, z, { s: new THREE.Vector3(r * 1.3, 1, r), cast: false });
  add(ctx, geo('fd-splash', () => new THREE.CircleGeometry(1, 7).rotateX(-Math.PI / 2)), moltenMat(), x, 0.02, z, { s: new THREE.Vector3(r * 0.6, 1, r * 0.45), cast: false });
  flow(ctx);
}

// ---------------------------------------------------------------- sparks
// Sparks rising from the fires: emitters [x0, z0, x1, z1, y0, n, rise]. Each spark climbs, wavers and
// cools from white-gold to dull red, then starts again. Two layers: 2 px and 1 px.
export function sparks(ctx, emitters) {
  const all = []; for (const [x0, z0, x1, z1, y0, n, rise = 3.5] of emitters) for (let i = 0; i < n; i++) all.push({ x0, z0, x1, z1, y0, rise });
  const layers = [[], []]; all.forEach((s, i) => layers[i % 3 === 0 ? 0 : 1].push(s));
  const reset = (s, first) => {
    s.x = s.x0 + Math.random() * (s.x1 - s.x0); s.z = s.z0 + Math.random() * (s.z1 - s.z0); s.y = s.y0 + Math.random() * 0.3;
    s.vy = 0.7 + Math.random() * 1.3; s.life = (s.rise / s.vy) * (0.5 + Math.random() * 0.6); s.age = first ? Math.random() * s.life : 0; s.ph = Math.random() * 6.3; s.b = 0.7 + Math.random() * 0.6;
  };
  const sets = layers.map((list, li) => {
    const pos = new Float32Array(list.length * 3), col = new Float32Array(list.length * 3);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size: li === 0 ? 2 : 1, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    p.frustumCulled = false; ctx.group.add(p); for (const s of list) reset(s, true);
    return { list, pos, col, g };
  });
  const step = (dt) => {
    for (const { list, pos, col, g } of sets) {
      for (let i = 0; i < list.length; i++) {
        const s = list[i]; s.age += dt; if (s.age > s.life) reset(s, false);
        s.y += s.vy * dt; s.x += (Math.sin(s.age * 3.2 + s.ph) * 0.35 + 0.12) * dt; s.z += Math.cos(s.age * 2.7 + s.ph) * 0.3 * dt;
        const k = Math.max(0, 1 - s.age / s.life) * s.b;
        pos[i * 3] = s.x; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z;
        col[i * 3] = 2.4 * k + 0.2 * k; col[i * 3 + 1] = 1.5 * k * k; col[i * 3 + 2] = 0.35 * k * k * k;
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    }
  };
  step(0); ctx.anims.push({ update(dt) { step(Math.min(dt, 0.1)); return false; } });
}
