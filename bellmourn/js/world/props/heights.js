// Props for District VII, the Crown Heights: grand manors of pale stone with tall lit windows, iron
// railings and gates with gilded tips, stone balustrades along the hill's edge with the lower city far
// below in the mist, clipped hedges and topiary, marble statues, the fountain, the long colonnade,
// abandoned carriages, the banners of a fallen house, braziers, the palace and its grand stair.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, plane, geo, inst, mat4, solid, solidCircle, torus } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';

// ---------------------------------------------------------------- materials
const mats = new Map();
const once = (k, fn) => { if (!mats.has(k)) mats.set(k, fn()); return mats.get(k); };
// gilt: dull gold that still catches a lamp in the rain
export const gilt = () => once('gilt', () => cutout(new THREE.MeshPhongMaterial({ color: 0x9c7c38, specular: 0xffe4a8, shininess: 46, emissive: 0x1e1608 })));
const marble = () => once('marble', () => cutout(new THREE.MeshPhongMaterial({ color: 0xa6a4b8, specular: 0x5a5a70, shininess: 24 })));
const lacquer = () => once('lacquer', () => cutout(new THREE.MeshPhongMaterial({ color: 0x2a1e34, specular: 0x8a7aa8, shininess: 40 })));
const hedgeM = () => M.grass('#1c2c26');
const trimM = () => M.ashlar('#666b7e');

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
// a texture repeated over a plane of w x d metres at 16 texels per metre
function tiled(base, w, d) { const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w * 16 / base.image.width, d * 16 / base.image.height); return t; }

// Builds parts in a local frame (a group turned and placed), then bakes them into the level so the
// static merge in finishCtx batches them like any other set piece.
function local(x, y, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; return g; }
function bake(ctx, g) {
  ctx.group.add(g); g.updateMatrixWorld(true);
  const meshes = []; g.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const m of meshes) { m.matrixWorld.decompose(m.position, m.quaternion, m.scale); m.userData.static = true; ctx.group.add(m); }
  ctx.group.remove(g);
}
// The axis-aligned solid around a local rectangle of a prop turned by ry around (x, z).
function solidLocal(ctx, x, z, ry, lx0, lz0, lx1, lz1, h) {
  const c = Math.cos(ry), s = Math.sin(ry); let a = Infinity, b = Infinity, e = -Infinity, f = -Infinity;
  for (const [lx, lz] of [[lx0, lz0], [lx1, lz0], [lx0, lz1], [lx1, lz1]]) { const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c; a = Math.min(a, wx); b = Math.min(b, wz); e = Math.max(e, wx); f = Math.max(f, wz); }
  solid(ctx, a, b, e, f, h);
}
const sph = (r, d = 1) => geo(`hh-sph${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));
const lathe = (key, prof, n = 8) => geo('hh-' + key, () => new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), n));

// ---------------------------------------------------------------- textures
// A tall round-headed window: frame, mullion, transom, glazing bars. Lit: warm glass between drawn
// curtains (three hangings, so a row of them does not repeat); dark: black glass with a cold sheen.
function winTex(lit, k = 0) {
  return pix('hh-win' + lit + k, 9, 24, (g, w, h) => {
    const r = T.rng(31 + k * 7 + (lit ? 100 : 0)); const cx = 4, top = 4.5;
    const drape = ['#4a1c34', '#3a1e48', '#5a2a2a'][k % 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dr = Math.hypot(x - cx, y - top);
      if (y < top && dr > 4.6) continue; // the round head
      const rim = x === 0 || x === w - 1 || y === h - 1 || (y < top && dr > 3.7);
      const bar = x === cx || y === 8 || (y > 8 && (y - 8) % 5 === 0);
      let c;
      if (rim) c = '#24202c';
      else if (bar) c = lit ? '#3a2a26' : '#22202a';
      else if (lit) {
        const curtain = (x === 1 || x === w - 2) && y > 7 || (x === 2 || x === w - 3) && y > 9 && y < 14;
        c = curtain ? drape : (r() < 0.22 ? '#eab060' : (y > h - 6 && r() < 0.3 ? '#f4d080' : '#c07a3c'));
      } else c = (x + y) % 7 === 0 ? '#20283a' : (y < 8 ? '#141826' : '#0e1018');
      dot(g, x, y, c);
    }
  });
}
// An empty niche of the same shape, deep in shadow.
function nicheTex() {
  return pix('hh-niche', 9, 24, (g, w, h) => {
    const cx = 4, top = 4.5;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dr = Math.hypot(x - cx, y - top); if (y < top && dr > 4.6) continue;
      const rim = x === 0 || x === w - 1 || (y < top && dr > 3.7); const shell = y < top && (Math.round(Math.atan2(y - top, x - cx) * 3) % 2 === 0);
      dot(g, x, y, rim ? '#3e4252' : y === h - 1 ? '#5a5e70' : shell ? '#2a2c38' : (x < 3 ? '#121218' : '#1a1a22'));
    }
  });
}
// The grand door: two dark panelled leaves, gilt handles, a fanlight.
function doorTex() {
  return pix('hh-door', 20, 36, (g, w, h) => {
    const r = T.rng(17);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dr = Math.hypot(x - 9.5, y - 10); if (y < 10 && dr > 10) continue;
      let c;
      if (y < 10) c = dr > 9 ? '#2a2630' : ((Math.round(Math.atan2(y - 10, x - 9.5) * 4) % 2 === 0) ? '#3a2e26' : (dr < 3 ? '#a87a40' : '#6a4a2c'));
      else if (x === 0 || x === w - 1 || y === 10) c = '#2a2630';
      else if (x === 9 || x === 10) c = '#1a1216';
      else { const px = x % 10, py = (y - 11) % 12; const edge = px === 1 || px === 8 || py === 0 || py === 10; c = edge ? '#1e1418' : (r() < 0.1 ? '#3a2630' : '#2e1e26'); }
      dot(g, x, y, c);
    }
    for (const x of [8, 11]) { dot(g, x, 22, '#e0b858'); dot(g, x, 23, '#a07a34'); }
  });
}
// Great arched coach-house doors: planks and iron straps.
function coachDoorTex() {
  return pix('hh-coach', 32, 44, (g, w, h) => {
    const r = T.rng(23);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dr = Math.hypot(x - 15.5, y - 16); if (y < 16 && dr > 16) continue;
      const rim = dr > 14.8 && y < 16 || x === 0 || x === w - 1;
      const strap = y === 20 || y === 34 || y === 21 || y === 35; const seam = x === 15 || x === 16;
      dot(g, x, y, rim ? '#3e4252' : seam ? '#140e0c' : strap ? '#16181e' : (x % 4 === 3 ? '#24180f' : (r() < 0.15 ? '#3c2a1c' : '#32221a')));
    }
  });
}
// The banner of the fallen house: violet, a gilt border, a crown over a sword pointing down; torn.
// variant 2 is slashed across.
function bannerTex(long, variant = 0) {
  return pix('hh-ban' + long + variant, long ? 15 : 13, long ? 54 : 32, (g, w, h) => {
    const r = T.rng(71 + variant * 13 + (long ? 5 : 0)); const cx = (w - 1) / 2; const tail = h - (long ? 10 : 7);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y >= tail) { const k = (y - tail) / (h - tail); if (Math.abs(x - cx) < k * cx * 1.1 || r() < k * 0.35) continue; }
      if (variant === 2 && y > h * 0.3 && y < h * 0.75 && Math.abs((x - 1) - (y - h * 0.3) * 0.5) < 0.8) continue;
      const edge = x === 0 || x === w - 1; const border = (x === 1 || x === w - 2 || y === 1) && y < tail;
      let c = edge ? '#24102e' : border ? '#b08a3c' : ((x + y * 3) % 11 === 0 ? '#44205a' : '#381a48');
      if (!border && !edge && r() < 0.05) c = '#2a1236';
      dot(g, x, y, c);
    }
    const crown = ['X..X..X', 'XX.X.XX', 'XXXXXXX', 'XoXoXoX', 'XXXXXXX']; const ox = cx - 3, oy = long ? 8 : 5;
    crown.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') dot(g, ox + i, oy + j, ch === 'o' ? '#8a2a3a' : (j < 2 ? '#e4c060' : '#c49a40')); }));
    const s0 = oy + 7, s1 = long ? oy + 34 : oy + 18;
    dot(g, cx, s0 - 1, '#c49a40'); for (let x = cx - 2; x <= cx + 2; x++) dot(g, x, s0 + 1, '#c49a40');
    for (let y = s0; y <= s1; y++) if (!(variant === 2 && y > h * 0.5 && y < h * 0.56)) dot(g, cx, y, y === s0 ? '#c49a40' : (y > s0 + 1 ? '#b8b4c4' : '#c49a40'));
  });
}
// Black-and-pale marble checkers for the colonnade's walk.
function checkerTex() {
  return pix('hh-check', 32, 32, (g, w, h) => {
    const r = T.rng(5);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sq = ((x >> 3) + (y >> 3)) % 2; const joint = x % 8 === 7 || y % 8 === 7;
      let c = sq ? '#70728a' : '#363644';
      if (joint) c = '#2a2a36'; else if (sq && (x + y * 2) % 9 === 0 && r() < 0.5) c = '#8a8ca0'; else if (!sq && r() < 0.06) c = '#44444f';
      dot(g, x, y, c);
    }
  });
}
// The forecourt's inlaid star: an eight-pointed compass of pale and dark marble inside two rings.
function starTex(S) {
  return pix('hh-star' + S, S, S, (g) => {
    const c = S / 2; const r = T.rng(9);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      let col = null;
      if (d > c - 3 && d < c - 1) col = '#8a8ca0';
      else if (d > c - 7 && d < c - 6) col = '#3a3a48';
      else if (d < c - 9) {
        const k = ((a / (Math.PI / 4)) % 1 + 1) % 1; const tri = Math.abs(k - 0.5) * 2; const rr = 6 + (c - 16) * Math.pow(tri, 0.9) * (Math.floor(a / (Math.PI / 4) + 0.5) % 2 ? 0.62 : 1);
        if (d < 5) col = d < 4 ? '#a8aabb' : '#3a3a48';
        else if (d < rr) { const half = (Math.floor(a / (Math.PI / 8)) + 16) % 2; col = half ? '#8c8ea2' : '#3e3e4c'; if (Math.abs(d - rr) < 1) col = '#2c2c38'; }
        else if (d > c * 0.55 && d < c * 0.55 + 1) col = '#6a6c80';
      }
      if (col && r() < 0.04) col = '#2c2c38';
      if (col) dot(g, x, y, col);
    }
  });
}
// Falling water: thin pale streaks.
function streamTex() {
  return pix('hh-stream', 16, 16, (g, w, h) => {
    const r = T.rng(3);
    for (let x = 0; x < w; x++) { if (r() < 0.45) continue; const a = (0.35 + r() * 0.55).toFixed(2); const y0 = (r() * h) | 0, len = 4 + ((r() * 9) | 0); g.fillStyle = `rgba(190,206,230,${a})`; for (let j = 0; j < len; j++) g.fillRect(x, (y0 + j) % h, 1, 1); }
  });
}
function carriageWinTex() {
  return pix('hh-cwin', 9, 8, (g, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const rim = x === 0 || y === 0 || x === w - 1 || y === h - 1; const cur = (x === 1 || x === 2) && y > 0;
      dot(g, x, y, rim ? '#b08a3c' : cur ? '#5a2a4a' : ((x + y) % 4 === 0 ? '#2a3044' : '#121520'));
    }
  });
}

// ---------------------------------------------------------------- roofs
// A hipped roof: four slopes, the ridge along the longer side (or a pyramid when square).
function hipGeo(w, d, rh) {
  return geo(`hh-hip${w},${d},${rh}`, () => {
    const hw = w / 2, hd = d / 2, ins = Math.min(hd, hw);
    const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd], R1 = [-hw + ins, rh, 0], R2 = [hw - ins, rh, 0];
    const tris = [D, C, R2, D, R2, R1, B, A, R1, B, R1, R2, C, B, R2, A, D, R1];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(tris.length * 2), 2)); g.computeVertexNormals();
    return g;
  });
}
export function hipRoof(ctx, x, y, z, w, d, rh, mat, opts = {}) {
  const alongX = w >= d;
  return add(ctx, alongX ? hipGeo(w, d, rh) : hipGeo(d, w, rh), mat, x, y, z, { ...opts, ry: alongX ? 0 : Math.PI / 2 });
}
// A triangular pediment, its face toward +Z (or +X with ry = PI/2), `depth` deep.
function pedGeo(span, rh, depth) {
  return geo(`hh-ped${span},${rh},${depth}`, () => {
    const s = new THREE.Shape(); s.moveTo(-span / 2, 0); s.lineTo(span / 2, 0); s.lineTo(0, rh); s.lineTo(-span / 2, 0);
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  });
}

// ---------------------------------------------------------------- small stonework
const urnGeo = () => lathe('urn', [[0, 0], [0.16, 0], [0.16, 0.06], [0.08, 0.12], [0.08, 0.2], [0.22, 0.3], [0.26, 0.44], [0.2, 0.58], [0.25, 0.62], [0.25, 0.67], [0, 0.67]], 8);
export function urn(ctx, x, y, z, s = 1) { const m = add(ctx, urnGeo(), trimM(), x, y, z); m.scale.setScalar(s); return m; }

// A gilt crown: a ring with five points (the fallen house's mark, and the Regent's).
export function crown(ctx, x, y, z, s = 1, parent) {
  const g = gilt(); const o = parent ? { parent } : {};
  add(ctx, geo('hh-crownring' + s, () => new THREE.TorusGeometry(0.2 * s, 0.045 * s, 4, 10)), g, x, y, z, { ...o, rx: Math.PI / 2 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; add(ctx, cone(0.05 * s, 0.2 * s, 4), g, x + Math.sin(a) * 0.2 * s, y + 0.12 * s, z + Math.cos(a) * 0.2 * s, o); }
}

// ---------------------------------------------------------------- the hill's edge
// A stone balustrade: kerb, turned balusters, a rail, piers (urns on every other one). Low: it never
// hides anything, and blows and bolts fly over it.
const balGeo = () => lathe('bal', [[0, 0], [0.085, 0], [0.085, 0.07], [0.055, 0.13], [0.1, 0.32], [0.06, 0.56], [0.05, 0.62], [0.08, 0.66], [0.08, 0.72], [0, 0.72]], 6);
export function balustrade(ctx, x0, z0, x1, z1, o = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const W = alongX ? len : 0.5, D = alongX ? 0.5 : len;
  add(ctx, box(W, 0.26, D), M.ashlar('#4a4e60'), cx, 0.13, cz);
  add(ctx, box(alongX ? len : 0.42, 0.14, alongX ? 0.42 : len), trimM(), cx, 1.05, cz);
  const n = Math.round(len / 0.3); const bm = M.flat(0x6c7082);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; inst(ctx, 'hh-bal', balGeo(), bm, mat4(x0 + (x1 - x0) * t, 0.26, z0 + (z1 - z0) * t)); }
  const np = Math.max(1, Math.round(len / (o.pier || 3.6)));
  for (let i = 0; i <= np; i++) {
    const t = i / np; const px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t;
    add(ctx, box(0.56, 1.2, 0.56), M.ashlar('#565b6e'), px, 0.6, pz); add(ctx, box(0.66, 0.12, 0.66), trimM(), px, 1.26, pz);
    if (o.urns && i % 2 === 0) urn(ctx, px, 1.32, pz, 0.8);
  }
  solid(ctx, cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2, 1.2);
}

// Stone that sinks into the night: the further below the hill's top, the more it fades to the void.
export const VOID = 0x0c0a12;
const deepCache = new Map();
function deep(base, range = 12) {
  const key = base.uuid + ':' + range; if (deepCache.has(key)) return deepCache.get(key);
  const m = base.clone();
  m.onBeforeCompile = (sh, r) => {
    base.onBeforeCompile(sh, r);
    sh.uniforms.deepCol = { value: new THREE.Color(VOID) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 deepCol;')
      .replace('#include <fog_fragment>', `gl_FragColor.rgb = mix(gl_FragColor.rgb, deepCol, clamp(-vWPos.y / ${range.toFixed(1)}, 0.0, 1.0));\n#include <fog_fragment>`);
  };
  m.customProgramCacheKey = () => base.customProgramCacheKey() + 'deep' + range;
  deepCache.set(key, m); return m;
}

// The retaining wall under the hill's edge: its face (x) looks east over the lower city.
export function cliff(ctx, x, z0, z1, depth) {
  const L = z1 - z0, zm = (z0 + z1) / 2;
  add(ctx, box(1.2, depth, L), deep(M.ashlar('#3c4052')), x - 0.6, -depth / 2 - 0.02, zm, { cast: false });
  add(ctx, box(0.3, 0.3, L), deep(M.ashlar('#4c5062')), x + 0.1, -0.75, zm, { cast: false });
  for (let z = z0 + 3; z < z1; z += 6.5) add(ctx, box(0.8, depth, 1.1), deep(M.ashlar('#363a4c')), x + 0.4, -depth / 2 - 1.1, z, { cast: false });
}

// The lower city below the hill: rows of dark roofs sinking into the mist, and the lit windows.
export function lowerCity(ctx, x0, z0, x1, z1, y, o = {}) {
  const r = T.rng(o.seed || 91); const range = o.range || 13;
  add(ctx, box(x1 - x0, 0.4, z1 - z0), deep(M.cobble('#2a2e3a'), range), (x0 + x1) / 2, y - 0.2, (z0 + z1) / 2, { cast: false });
  const walls = ['#343848', '#3a3e4e', '#30344a'].map((t) => deep(M.brick(t), range)); const roofM = deep(M.slate('#22243a'), range);
  const pts = [], cols = []; const warm = new THREE.Color(0xffa448), cold = new THREE.Color(0xb8b0ff);
  for (let bx = x0 + 2; bx < x1 - 4; bx += 9.5) {
    let bz = z0;
    while (bz < z1) {
      const w = 5 + r() * 2, d = 3 + r() * 2.4, h = 2.2 + r() * 2.2; const hx = bx + w / 2, hz = bz + d / 2;
      if (r() < 0.1) { bz += 2.4; continue; } // a lane
      add(ctx, box(w, h, d), walls[(r() * 3) | 0], hx, y + h / 2, hz, { cast: false });
      hipRoof(ctx, hx, y + h, hz, w + 0.3, d + 0.3, Math.min(w, d) * 0.45, roofM, { cast: false });
      for (let k = 0; k < 3; k++) if (r() < 0.32) {
        const onX = r() < 0.6; const c = r() < 0.18 ? cold : warm;
        pts.push(onX ? hx + w / 2 + 0.05 : hx - w / 2 + 0.5 + r() * (w - 1), y + 0.9 + r() * Math.max(0.4, h - 1.6), onX ? hz - d / 2 + 0.4 + r() * (d - 0.8) : hz + d / 2 + 0.05);
        const f = 0.55 + r() * 0.45; cols.push(c.r * f, c.g * f, c.b * f);
      }
      bz += d + 0.1;
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false }));
  p.renderOrder = -5; p.frustumCulled = false; ctx.group.add(p);
}
// A sheet of mist over the drop.
export function mist(ctx, x0, z0, x1, z1, y, opacity, color = 0x15121f) {
  const m = new THREE.Mesh(plane(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.renderOrder = -10; ctx.group.add(m);
}

// ---------------------------------------------------------------- ironwork
// Wrought-iron railing on a stone kerb: bars with gilded spear tips, posts with gilded finials, a
// gilded scroll band. See-through (it does not block sight lines).
export function railing(ctx, x0, z0, x1, z1, o = {}) {
  const h = o.h || 2.0; const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const len = Math.hypot(x1 - x0, z1 - z0); const kerb = o.kerb ?? 0.4; const iron = M.ironLit(), gold = gilt();
  add(ctx, box(alongX ? len + 0.1 : 0.5, kerb, alongX ? 0.5 : len + 0.1), M.ashlar('#4a4e60'), (x0 + x1) / 2, kerb / 2, (z0 + z1) / 2);
  add(ctx, box(alongX ? len + 0.14 : 0.56, 0.08, alongX ? 0.56 : len + 0.14), trimM(), (x0 + x1) / 2, kerb + 0.04, (z0 + z1) / 2);
  const nb = Math.max(2, Math.round(len / 0.22));
  for (let i = 0; i <= nb; i++) {
    const t = i / nb; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    if (i % 9 === 0) {
      inst(ctx, 'hh-rpost', box(0.14, h + 0.2, 0.14), iron, mat4(x, kerb + (h + 0.2) / 2, z));
      inst(ctx, 'hh-rknob', sph(0.09, 0), gold, mat4(x, kerb + h + 0.28, z));
      inst(ctx, 'hh-rfin', cone(0.07, 0.3, 4), gold, mat4(x, kerb + h + 0.5, z, Math.PI / 4));
    } else {
      inst(ctx, 'hh-rbar', box(0.045, h, 0.045), iron, mat4(x, kerb + h / 2, z));
      inst(ctx, 'hh-rtip', cone(0.055, 0.2, 4), gold, mat4(x, kerb + h + 0.1, z, Math.PI / 4));
    }
  }
  for (const ry of [0.22, h - 0.26]) add(ctx, box(alongX ? len : 0.05, 0.05, alongX ? 0.05 : len), iron, (x0 + x1) / 2, kerb + ry, (z0 + z1) / 2);
  for (let i = 0; i < nb; i += 2) { const t = (i + 0.5) / nb; inst(ctx, 'hh-rring', torus(0.09, 0.018), gold, mat4(x0 + (x1 - x0) * t, kerb + h - 0.45, z0 + (z1 - z0) * t, alongX ? 0 : Math.PI / 2)); }
  const pad = 0.18;
  if (alongX) solid(ctx, Math.min(x0, x1), z0 - pad, Math.max(x0, x1), z0 + pad, h); else solid(ctx, x0 - pad, Math.min(z0, z1), x0 + pad, Math.max(z0, z1), h);
  ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]);
}

// An ornate gilded double gate between stone piers crowned with urns. Same handle as the kit's gate:
// open(t) for the arena locks; axis 'x' if the gate sits in a railing running along X.
export function gate(ctx, x, z, width = 2.8, axis = 'x', opts = {}) {
  const h = opts.h || 2.6; const iron = M.ironLit(), gold = gilt(); const alongX = axis === 'x';
  const along = (p) => alongX ? [x + p, z] : [x, z + p];
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35));
    add(ctx, box(0.7, h + 0.9, 0.7), M.ashlar('#4e5264'), px, (h + 0.9) / 2, pz);
    add(ctx, box(0.86, 0.2, 0.86), trimM(), px, h + 1.0, pz);
    urn(ctx, px, h + 1.1, pz, 0.95);
    solid(ctx, px - 0.35, pz - 0.35, px + 0.35, pz + 0.35, h + 1);
  }
  const leaves = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); const [hx, hz] = along(s * width / 2); pivot.position.set(hx, 0, hz); ctx.group.add(pivot);
    const lw = width / 2; const nb = Math.round(lw / 0.2);
    for (let i = 0; i <= nb; i++) {
      const p = -s * (i / nb) * lw; const bh = h - 0.2 + Math.sin((i / nb) * Math.PI * 0.5) * 0.3;
      const bar = new THREE.Mesh(box(0.05, bh, 0.05), iron); bar.position.set(alongX ? p : 0, bh / 2 + 0.05, alongX ? 0 : p); bar.castShadow = true; pivot.add(bar);
      const tip = new THREE.Mesh(cone(0.06, 0.22, 4), gold); tip.position.set(alongX ? p : 0, bh + 0.16, alongX ? 0 : p); tip.rotation.y = Math.PI / 4; pivot.add(tip);
    }
    for (const ry of [0.3, h * 0.55, h - 0.35]) {
      const rail = new THREE.Mesh(box(alongX ? lw : 0.05, 0.06, alongX ? 0.05 : lw), iron); rail.position.set(alongX ? -s * lw / 2 : 0, ry, alongX ? 0 : -s * lw / 2); pivot.add(rail);
    }
    const ring = new THREE.Mesh(torus(0.3, 0.03), gold); ring.position.set(alongX ? -s * lw / 2 : 0, h * 0.77, alongX ? 0 : -s * lw / 2); if (!alongX) ring.rotation.y = Math.PI / 2; pivot.add(ring);
    const boss = new THREE.Mesh(sph(0.08, 0), gold); boss.position.copy(ring.position); pivot.add(boss);
    pivot.userData.side = s; leaves.push(pivot);
  }
  // the crest: an iron arch with gilded scrolls and a crown at its top
  const arch = new THREE.Mesh(geo(`hh-arch${width}`, () => new THREE.TorusGeometry(width / 2, 0.05, 4, 16, Math.PI)), iron);
  arch.position.set(x, h + 0.15, z); arch.scale.set(1, 0.45, 1); if (!alongX) arch.rotation.y = Math.PI / 2; arch.castShadow = true; ctx.group.add(arch);
  for (let i = -2; i <= 2; i++) {
    const sc = new THREE.Mesh(torus(0.15, 0.025), gold); const [sx, sz] = along(i * width * 0.17);
    sc.position.set(sx, h + 0.25 + (1 - Math.abs(i) / 2.5) * width * 0.16, sz); if (!alongX) sc.rotation.y = Math.PI / 2; ctx.group.add(sc);
  }
  crown(ctx, x, h + 0.42 + width * 0.24, z, 0.8);
  const sh = { x0: alongX ? x - width / 2 : x - 0.2, z0: alongX ? z - 0.2 : z - width / 2, x1: alongX ? x + width / 2 : x + 0.2, z1: alongX ? z + 0.2 : z + width / 2, h, gate: true, open: false };
  ctx.solids.push(sh); ctx.lowSolids.push(sh);
  const swing = opts.swing || 1.6, dir = opts.swingDir || 1;
  const handle = {
    t: opts.open ? 1 : 0, target: opts.open ? 1 : 0, solid: sh, x, z,
    set(open) { this.target = open ? 1 : 0; sh.open = !!open; },
    update(dt) {
      if (this.t === this.target) return false;
      this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * 1.2);
      const a = (1 - Math.cos(this.t * Math.PI)) / 2 * swing;
      for (const l of leaves) l.rotation.y = l.userData.side * a * (alongX ? -1 : 1) * dir;
      return true;
    },
  };
  sh.open = !!opts.open; handle.update(0); if (opts.open) for (const l of leaves) l.rotation.y = l.userData.side * swing * (alongX ? -1 : 1) * dir;
  ctx.anims.push(handle);
  return handle;
}

// ---------------------------------------------------------------- buildings
// A tall window with its sill, hood and keystone, on face f ('x': the +X face at `out`, 'z': +Z).
function tallWindow(ctx, f, out, along, y, lit, k) {
  const m = M.decal(winTex(lit, k), lit ? 1.15 : 0); const W = 9 / 16, H = 24 / 16; const tm = trimM();
  const at = (g, mat, off, yy, o = {}) => f === 'x' ? add(ctx, g, mat, out + off, yy, along, o) : add(ctx, g, mat, along, yy, out + off, o);
  at(plane(W, H), m, 0.02, y, { ry: f === 'x' ? Math.PI / 2 : 0, cast: false });
  at(f === 'x' ? box(0.16, 0.08, W + 0.2) : box(W + 0.2, 0.08, 0.16), tm, 0.08, y - H / 2 - 0.04);
  at(f === 'x' ? box(0.16, 0.12, W + 0.32) : box(W + 0.32, 0.12, 0.16), tm, 0.08, y + H / 2 + 0.14);
  at(f === 'x' ? box(0.18, 0.2, 0.14) : box(0.14, 0.2, 0.18), tm, 0.09, y + H / 2 + 0.02);
}
// A niche with a small marble figure in it.
function niche(ctx, f, out, along, y) {
  const W = 9 / 16, H = 24 / 16;
  if (f === 'x') add(ctx, plane(W, H), M.decal(nicheTex()), out + 0.02, y, along, { ry: Math.PI / 2, cast: false });
  else add(ctx, plane(W, H), M.decal(nicheTex()), along, y, out + 0.02, { cast: false });
  const px = f === 'x' ? out + 0.16 : along, pz = f === 'x' ? along : out + 0.16;
  statue(ctx, px, pz, f === 'x' ? Math.PI / 2 : 0, { plinth: false, y0: y - H / 2 + 0.02, s: 0.62, pose: ['mourner', 'crown', 'sword'][Math.abs(Math.round(along * 3)) % 3] });
}
// The front door under a small portico: two columns, an entablature, a pediment, two steps.
function portico(ctx, f, out, along, o = {}) {
  const tm = trimM(), mm = marble(); const dy = o.y || 0;
  const at = (g, mat, off, yy, a = 0, opt = {}) => f === 'x' ? add(ctx, g, mat, out + off, yy, along + a, opt) : add(ctx, g, mat, along + a, yy, out + off, opt);
  at(plane(1.25, 2.25), M.decal(doorTex()), 0.1, dy + 1.125, 0, { ry: f === 'x' ? Math.PI / 2 : 0, cast: false });
  if (o.columns === false) return;
  for (const s of [-1, 1]) { at(cyl(0.13, 0.15, 2.7, 8), mm, 0.75, 0.3 + 1.35, s * 0.95); at(box(0.36, 0.2, 0.36), tm, 0.75, 0.4, s * 0.95); }
  at(f === 'x' ? box(0.9, 0.36, 2.4) : box(2.4, 0.36, 0.9), tm, 0.5, 3.18);
  const ped = add(ctx, pedGeo(2.6, 0.7, 0.9), tm, f === 'x' ? out + 0.05 : along, 3.36, f === 'x' ? along : out + 0.05, { ry: f === 'x' ? Math.PI / 2 : 0 });
  ped.userData.static = true;
  at(f === 'x' ? box(0.5, 0.15, 2.2) : box(2.2, 0.15, 0.5), M.ashlar('#565b6e'), 0.95, 0.075);
  at(f === 'x' ? box(0.4, 0.3, 2.0) : box(2.0, 0.3, 0.4), M.ashlar('#565b6e'), 0.45, 0.15);
  if (f === 'x') solid(ctx, out, along - 1.2, out + 1.2, along + 1.2, 3.2); else solid(ctx, along - 1.2, out, along + 1.2, out + 1.2, 3.2);
}

// A manor of pale dressed stone: a rusticated base, pilasters between window bays, string courses,
// a cornice and a parapet, a hipped slate roof with iron cresting and paired chimneys. Windows on the
// faces the camera sees (o.faces: 'x' for +X, 'z' for +Z). o.pattern(f, floor, bay, n) may return
// 'door' | 'niche' | 'blank' | 'win'. o.lights: how many lit ground-floor windows cast light.
export function manor(ctx, x, z, w, d, h, o = {}) {
  const wallM = M.ashlar(o.tone || '#4c5062'), tm = trimM(), baseM = M.ashlar(o.base || '#3a3e4e');
  add(ctx, box(w, h, d), wallM, x, h / 2, z);
  add(ctx, box(w + 0.16, 0.9, d + 0.16), baseM, x, 0.45, z);
  add(ctx, box(w + 0.44, 0.3, d + 0.44), tm, x, h + 0.15, z);
  add(ctx, box(w + 0.2, 0.46, d + 0.2), wallM, x, h + 0.53, z);
  add(ctx, box(w + 0.3, 0.12, d + 0.3), tm, x, h + 0.82, z);
  solid(ctx, x - w / 2 - 0.08, z - d / 2 - 0.08, x + w / 2 + 0.08, z + d / 2 + 0.08, h);
  const rh = o.roofH ?? Math.min(w, d) * 0.42; const ry0 = h + 0.76;
  if (o.roof !== false) {
    hipRoof(ctx, x, ry0, z, w - 0.4, d - 0.4, rh, M.slate(o.roofTone || '#1e1f2e'));
    const alongX = w >= d; const half = Math.max(0, (Math.max(w, d) - Math.min(w, d)) / 2 - 0.2);
    for (let p = -half; p <= half + 0.01; p += 0.4) inst(ctx, 'hh-crest', cone(0.04, 0.3, 4), M.ironLit(), mat4(alongX ? x + p : x, ry0 + rh + 0.12, alongX ? z : z + p));
    for (const s of [-1, 1]) {
      const cx = x + (alongX ? s * w * 0.3 : 0), cz = z + (alongX ? 0 : s * d * 0.3); const ch = rh + 1.3;
      add(ctx, box(0.7, ch, 0.9), M.brick('#2c2e3c'), cx, ry0 + ch / 2, cz); add(ctx, box(0.86, 0.14, 1.06), tm, cx, ry0 + ch + 0.07, cz);
      for (const k of [-0.2, 0.2]) add(ctx, cyl(0.1, 0.1, 0.3, 6), M.flat(0x3a3036), cx, ry0 + ch + 0.29, cz + k);
    }
  }
  const FH = o.floorH || 2.7; const floors = o.floors ?? Math.max(1, Math.floor((h - 1.6) / FH));
  const r = T.rng(Math.round(Math.abs(x * 17 + z * 31)) + 7); let lights = o.lights ?? 1;
  for (const f of o.faces || ['x']) {
    const len = f === 'x' ? d : w; const n = Math.max(1, Math.round(len / (o.bay || 2.3))); const bw = len / n;
    const out = f === 'x' ? x + w / 2 : z + d / 2; const c0 = f === 'x' ? z : x;
    const at = (g, mat, off, y, a) => f === 'x' ? add(ctx, g, mat, out + off, y, c0 + a) : add(ctx, g, mat, c0 + a, y, out + off);
    for (let i = 0; i <= n; i++) at(f === 'x' ? box(0.12, h - 0.9, 0.34) : box(0.34, h - 0.9, 0.12), tm, 0.06, (h + 0.9) / 2, -len / 2 + i * bw);
    for (let k = 1; k < floors; k++) at(f === 'x' ? box(0.14, 0.14, len + 0.1) : box(len + 0.1, 0.14, 0.14), tm, 0.07, 0.9 + k * FH - 0.12, 0);
    for (let k = 0; k < floors; k++) for (let i = 0; i < n; i++) {
      const a = -len / 2 + (i + 0.5) * bw; const y = 0.9 + k * FH + 1.3;
      const kind = o.pattern ? o.pattern(f, k, i, n) : 'win';
      if (kind === 'blank') continue;
      if (kind === 'door') { portico(ctx, f, out, c0 + a, o.door || {}); continue; }
      if (kind === 'niche') { niche(ctx, f, out, c0 + a, y); continue; }
      const lit = r() < (o.lit ?? 0.4);
      tallWindow(ctx, f, out, c0 + a, y, lit, (i + k * 2) % 3);
      if (lit && k === 0 && lights > 0) {
        lights--;
        ctx.lights.push(f === 'x' ? { x: out + 0.8, y: y - 0.2, z: c0 + a, color: 0xffa858, intensity: 1.4, dist: 3.8 } : { x: c0 + a, y: y - 0.2, z: out + 0.8, color: 0xffa858, intensity: 1.4, dist: 3.8 });
      }
    }
  }
}

// The coach house's great arched doors on its +X face.
export function coachDoors(ctx, xFace, zs) {
  for (const z of zs) {
    add(ctx, plane(2, 2.75), M.decal(coachDoorTex()), xFace + 0.03, 1.375, z, { ry: Math.PI / 2, cast: false });
    add(ctx, box(0.2, 0.3, 0.5), trimM(), xFace + 0.1, 2.9, z);
  }
}

// The palace's frontispiece: a projecting bay with giant pilasters, the great door at the head of the
// stair, a pediment with a gilt crown on it. Its face looks +Z at zFace.
export function frontispiece(ctx, x, zFace, w, h, o = {}) {
  const wallM = M.ashlar(o.tone || '#50566a'), tm = trimM();
  add(ctx, box(w, h, 0.8), wallM, x, h / 2, zFace - 0.4);
  add(ctx, box(w + 0.16, 0.9, 0.96), M.ashlar('#3a3e4e'), x, 0.45, zFace - 0.4);
  add(ctx, box(w + 0.44, 0.32, 1.2), tm, x, h + 0.16, zFace - 0.4);
  solid(ctx, x - w / 2, zFace - 0.8, x + w / 2, zFace, h);
  for (const s of [-1, -0.33, 0.33, 1]) add(ctx, box(0.46, h - 0.9, 0.2), tm, x + s * (w / 2 - 0.3), (h + 0.9) / 2, zFace + 0.06);
  add(ctx, pedGeo(w + 0.4, 1.9, 0.9), tm, x, h + 0.32, zFace - 0.85);
  add(ctx, plane(1.0, 1.0), M.decal(T.roseWindow(false)), x, h + 0.95, zFace + 0.06, { cast: false });
  crown(ctx, x, h + 2.35, zFace - 0.4, 1.6);
  // the great door at the head of the stair, a gilt crown over it; the ballroom lit above
  const dY = o.doorY || 0;
  add(ctx, plane(1.9, 3.2), M.decal(doorTex()), x, dY + 1.6, zFace + 0.03, { cast: false });
  add(ctx, box(2.4, 0.3, 0.3), tm, x, dY + 3.4, zFace + 0.15);
  crown(ctx, x, dY + 3.75, zFace + 0.2, 1.1);
  for (const k of [-1, 1]) { tallWindow(ctx, 'z', zFace, x + k * w * 0.3, dY + 2.0, false, 1); tallWindow(ctx, 'z', zFace, x + k * w * 0.3, 7.9, true, k > 0 ? 0 : 2); }
  tallWindow(ctx, 'z', zFace, x, 6.6, true, 1);
}

// The grand stair: steps climbing toward -Z up to a door, cheek walls with urns. Solid.
export function grandStair(ctx, x, zTop, w, n = 8, rise = 0.2, run = 0.4) {
  const st = M.ashlar('#5a5f72');
  for (let i = 0; i < n; i++) { const hh = rise * (n - i); add(ctx, box(w, hh, run), st, x, hh / 2, zTop + (i + 0.5) * run); add(ctx, box(w, 0.04, 0.06), trimM(), x, hh + 0.02, zTop + i * run + run - 0.03); }
  const L = n * run;
  for (const s of [-1, 1]) {
    const cx = x + s * (w / 2 + 0.25);
    add(ctx, box(0.5, rise * n + 0.3, L), M.ashlar('#4e5264'), cx, (rise * n + 0.3) / 2, zTop + L / 2);
    add(ctx, box(0.6, 0.12, L + 0.1), trimM(), cx, rise * n + 0.36, zTop + L / 2);
    add(ctx, box(0.62, 1.1, 0.62), M.ashlar('#565b6e'), cx, 0.55, zTop + L - 0.1);
    urn(ctx, cx, 1.12, zTop + L - 0.1, 1.0);
  }
  solid(ctx, x - w / 2 - 0.5, zTop, x + w / 2 + 0.5, zTop + L, rise * n + 0.3);
}

// ---------------------------------------------------------------- the colonnade
// Marble columns along xc (one per z), an entablature over them with urns, cross beams back to the
// wall at xw; the glass roof between the beams is long gone, only its iron ribs are left.
export function colonnade(ctx, xc, xw, zs, H = 4.6) {
  const sm = marble(), cm = M.ashlar('#666b7e');
  for (const z of zs) {
    add(ctx, box(0.8, 0.36, 0.8), M.ashlar('#4e5264'), xc, 0.18, z);
    add(ctx, cyl(0.34, 0.36, 0.12, 10), cm, xc, 0.42, z);
    add(ctx, cyl(0.25, 0.29, H - 0.9, 10), sm, xc, 0.48 + (H - 0.9) / 2, z);
    add(ctx, cyl(0.36, 0.26, 0.24, 10), cm, xc, H - 0.3, z);
    add(ctx, box(0.82, 0.18, 0.82), cm, xc, H - 0.09, z);
    solidCircle(ctx, xc, z, 0.42, H);
  }
  const z0 = Math.min(...zs) - 0.6, z1 = Math.max(...zs) + 0.6, L = z1 - z0, zm = (z0 + z1) / 2;
  add(ctx, box(0.78, 0.42, L), M.ashlar('#5c6174'), xc, H + 0.21, zm);
  add(ctx, box(0.7, 0.36, L), M.ashlar('#484c5e'), xc, H + 0.6, zm);
  add(ctx, box(1.0, 0.2, L + 0.3), cm, xc, H + 0.88, zm);
  const span = Math.abs(xc - xw), mx = (xc + xw) / 2;
  for (const z of zs) add(ctx, box(span, 0.34, 0.3), M.ashlar('#50556a'), mx, H + 0.42, z);
  for (const z of zs) urn(ctx, xc, H + 0.98, z, 0.85);
  for (const f of [0.3, 0.65]) add(ctx, box(0.06, 0.06, L), M.ironLit(), xc + (xw - xc) * f, H + 0.68, zm);
}

// ---------------------------------------------------------------- garden
export function hedge(ctx, x0, z0, x1, z1, h = 0.8, o = {}) {
  const w = x1 - x0, d = z1 - z0;
  add(ctx, box(w, h, d), hedgeM(), x0 + w / 2, h / 2, z0 + d / 2);
  add(ctx, box(Math.max(0.1, w - 0.12), 0.05, Math.max(0.1, d - 0.12)), M.grass('#26392f'), x0 + w / 2, h + 0.025, z0 + d / 2, { cast: false });
  if (o.solid !== false) solid(ctx, x0, z0, x1, z1, h);
}
// A parterre bed: a clipped hedge border round a lawn, something in the middle ('cone', 'tiers', or
// 'statue:<pose>').
export function bed(ctx, x0, z0, x1, z1, centre = 'cone', ry = 0) {
  const t = 0.42, h = 0.7;
  add(ctx, box(x1 - x0 - 2 * t, 0.04, z1 - z0 - 2 * t), M.grass('#2a3a30'), (x0 + x1) / 2, 0.03, (z0 + z1) / 2, { cast: false });
  hedge(ctx, x0, z0, x1, z0 + t, h, { solid: false }); hedge(ctx, x0, z1 - t, x1, z1, h, { solid: false });
  hedge(ctx, x0, z0 + t, x0 + t, z1 - t, h, { solid: false }); hedge(ctx, x1 - t, z0 + t, x1, z1 - t, h, { solid: false });
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) add(ctx, sph(0.32, 1), hedgeM(), cx + Math.sign((x0 + x1) / 2 - cx) * 0.2, h + 0.18, cz + Math.sign((z0 + z1) / 2 - cz) * 0.2);
  solid(ctx, x0, z0, x1, z1, 0.8);
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  if (centre && centre.startsWith('statue')) statue(ctx, mx, mz, ry, { pose: centre.split(':')[1] || 'crown' });
  else if (centre) topiary(ctx, mx, mz, centre, 1, false);
}
// Clipped yew in a stone planter: 'cone', 'ball' or 'tiers'.
export function topiary(ctx, x, z, kind = 'cone', s = 1, planter = true) {
  const hm = hedgeM(); let y = 0;
  if (planter) { add(ctx, box(0.72, 0.46, 0.72), M.ashlar('#565b6e'), x, 0.23, z); add(ctx, box(0.8, 0.07, 0.8), trimM(), x, 0.49, z); y = 0.5; }
  if (kind === 'cone') add(ctx, cone(0.5 * s, 1.8 * s, 8), hm, x, y + 0.9 * s, z);
  else if (kind === 'ball') { add(ctx, cyl(0.05, 0.06, 0.6, 4), M.wood('#2a2018'), x, y + 0.3, z); add(ctx, sph(0.5 * s), hm, x, y + 0.55 + 0.45 * s, z); }
  else { add(ctx, sph(0.48 * s), hm, x, y + 0.45 * s, z); add(ctx, sph(0.34 * s), hm, x, y + 1.1 * s, z); add(ctx, sph(0.2 * s), hm, x, y + 1.6 * s, z); }
  if (planter) solid(ctx, x - 0.38, z - 0.38, x + 0.38, z + 0.38, 1.6);
}

// A marble figure on a plinth. Poses: 'sword' (a blade raised), 'crown' (a crown held up), 'mourner'
// (hooded, hands to the face), 'angel' (wings). o.fallen: thrown down, lying on the grass, its head apart.
export function statue(ctx, x, z, ry = 0, o = {}) {
  const pose = o.pose || 'sword'; const mm = marble(); const plinth = o.plinth !== false && !o.fallen;
  if (plinth) {
    add(ctx, box(1.05, 1.0, 1.05), M.ashlar('#4e5264'), x, 0.5, z); add(ctx, box(1.2, 0.14, 1.2), trimM(), x, 1.07, z); add(ctx, box(0.95, 0.16, 0.95), M.ashlar('#5a5f72'), x, 1.22, z);
    solid(ctx, x - 0.6, z - 0.6, x + 0.6, z + 0.6, 2.8);
  }
  const g = local(x, o.y0 ?? (plinth ? 1.3 : 0), z, ry);
  if (o.s) g.scale.setScalar(o.s);
  if (o.fallen) { g.rotation.set(-Math.PI / 2, ry, 0, 'YXZ'); g.position.y = 0.2; }
  const P = (gm, mat, lx, ly, lz, opt = {}) => add(ctx, gm, mat, lx, ly, lz, { ...opt, parent: g });
  P(cyl(0.2, 0.3, 0.95, 6), mm, 0, 0.48, 0);
  P(box(0.42, 0.5, 0.26), mm, 0, 1.18, 0);
  P(box(0.54, 0.12, 0.3), mm, 0, 1.4, 0);
  const headless = o.headless || o.fallen;
  if (!headless) P(sph(0.14, 0), mm, 0, 1.6, 0.02);
  if (pose === 'sword') {
    P(box(0.11, 0.5, 0.11), mm, 0.3, 1.62, 0, { rz: 0.25 }); P(box(0.05, 0.95, 0.03), mm, 0.4, 2.3, 0); P(box(0.26, 0.05, 0.06), mm, 0.4, 1.88, 0);
    P(box(0.11, 0.48, 0.11), mm, -0.3, 1.05, 0.04, { rz: -0.12 });
  } else if (pose === 'crown') {
    for (const s of [-1, 1]) P(box(0.1, 0.55, 0.1), mm, s * 0.24, 1.72, 0, { rz: -s * 0.38 });
    crown(ctx, 0, 2.06, 0, 0.9, g);
  } else if (pose === 'mourner') {
    if (!headless) P(cone(0.22, 0.42, 6), mm, 0, 1.68, -0.02);
    for (const s of [-1, 1]) P(box(0.1, 0.42, 0.1), mm, s * 0.14, 1.4, 0.16, { rx: -0.9 });
  } else {
    for (const s of [-1, 1]) P(box(0.07, 0.95, 0.5), mm, s * 0.22, 1.5, -0.24, { rz: s * 0.35, rx: 0.2 });
    P(box(0.32, 0.12, 0.12), mm, 0, 1.18, 0.16);
  }
  bake(ctx, g);
  if (o.fallen) { // lying on its back, head toward local -z; the head rolled a little further
    const c = Math.cos(ry), s = Math.sin(ry), hx = 0.35, hz = -2.1;
    add(ctx, sph(0.14, 0), mm, x + hx * c + hz * s, 0.13, z - hx * s + hz * c);
    solidLocal(ctx, x, z, ry, -0.35, -1.8, 0.35, 0.4, 0.6);
  }
}

// The fountain: an octagonal basin, dark water, a pedestal with two bowls spilling into each other, a
// gilt crown on top. Low: blows and sight lines pass over its rim.
export function fountain(ctx, x, z, R = 2.3) {
  const st = M.ashlar('#5c6174'), lip = trimM(); const side = 2 * R * Math.sin(Math.PI / 8), ap = R * Math.cos(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * Math.PI / 4;
    add(ctx, box(side + 0.06, 0.6, 0.34), st, x + Math.sin(a) * (ap - 0.17), 0.3, z + Math.cos(a) * (ap - 0.17), { ry: a });
    add(ctx, box(side + 0.16, 0.1, 0.48), lip, x + Math.sin(a) * (ap - 0.12), 0.65, z + Math.cos(a) * (ap - 0.12), { ry: a });
  }
  const rw = (ap - 0.34) / Math.cos(Math.PI / 8);
  add(ctx, geo('hh-fbed' + R, () => new THREE.CircleGeometry(rw, 8)), M.flat(0x0c1016), x, 0.05, z, { rx: -Math.PI / 2, cast: false });
  const wm = new THREE.MeshPhongMaterial({ color: 0x18202e, specular: 0x8a98c0, shininess: 90, transparent: true, opacity: 0.88 });
  const water = new THREE.Mesh(geo('hh-fwater' + R, () => new THREE.CircleGeometry(rw, 8)), wm); water.rotation.x = -Math.PI / 2; water.position.set(x, 0.42, z); water.receiveShadow = true; ctx.group.add(water);
  ctx.puddles = ctx.puddles || []; ctx.puddles.push({ x, z, w: rw * 2, d: rw * 2, water: true });
  add(ctx, cyl(0.42, 0.52, 1.1, 8), st, x, 0.55, z);
  add(ctx, cyl(1.12, 0.34, 0.36, 8), lip, x, 1.28, z);
  add(ctx, geo('hh-fbowl', () => new THREE.CircleGeometry(1.0, 8)), wm, x, 1.47, z, { rx: -Math.PI / 2, cast: false }).userData.static = false;
  add(ctx, cyl(0.15, 0.22, 0.7, 8), st, x, 1.8, z);
  add(ctx, cyl(0.62, 0.2, 0.24, 8), lip, x, 2.25, z);
  add(ctx, sph(0.16, 0), gilt(), x, 2.5, z);
  crown(ctx, x, 2.66, z, 0.8);
  // the water spilling from the bowls (a curtain of streaks, running down)
  const tex = streamTex().clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 1);
  const sm = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.8, 0.86, 1.0), transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
  for (const [rt, rb, y0, y1] of [[1.1, 1.3, 1.44, 0.43], [0.6, 0.72, 2.35, 1.48]]) {
    const m = new THREE.Mesh(geo(`hh-fall${rt}`, () => new THREE.CylinderGeometry(rt, rb, y0 - y1, 8, 1, true)), sm); m.position.set(x, (y0 + y1) / 2, z); ctx.group.add(m);
  }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; tex.offset.y = Math.floor(t * 18) / 16; return false; } });
  solidCircle(ctx, x, z, R + 0.12, 0.7);
}

// ---------------------------------------------------------------- the abandoned
function wheel(P, lx, lz, r, trim) {
  P(geo('hh-rim' + r, () => new THREE.TorusGeometry(r, 0.045, 4, 14)), M.flat(0x2a2024), lx, r, lz, { ry: Math.PI / 2 });
  for (let k = 0; k < 3; k++) P(box(0.04, r * 2 - 0.08, 0.04), M.flat(0x3a2c26), lx, r, lz, { rx: k * Math.PI / 3 });
  P(cyl(0.09, 0.09, 0.14, 6), trim, lx, r, lz, { rz: Math.PI / 2 });
}
// A lacquered coach with gilt trim, its horses long gone. o.tipped: thrown on its side; o.door: hanging open.
export function carriage(ctx, x, z, ry = 0, o = {}) {
  const g = local(x, 0, z, ry); const body = lacquer(), trim = gilt(), wood = M.wood('#3a2a22');
  if (o.tipped) { g.rotation.set(0, ry, Math.PI / 2, 'YXZ'); g.position.y = 0.74; }
  const P = (gm, mat, lx, ly, lz, opt = {}) => add(ctx, gm, mat, lx, ly, lz, { ...opt, parent: g });
  P(box(0.9, 0.1, 2.9), wood, 0, 0.62, 0.1);
  P(box(1.36, 0.62, 1.7), body, 0, 1.08, -0.25);
  P(box(1.3, 0.78, 1.5), body, 0, 1.78, -0.25);
  P(box(1.44, 0.1, 1.66), body, 0, 2.22, -0.25);
  P(box(1.4, 0.06, 1.74), trim, 0, 1.4, -0.25);
  for (const s of [-1, 1]) { P(box(0.05, 0.05, 1.7), trim, s * 0.72, 2.28, -0.25); P(box(1.44, 0.05, 0.05), trim, 0, 2.28, -0.25 + s * 0.83); }
  for (const lz of [-0.95, 0.45]) for (const s of [-1, 1]) P(box(0.04, 0.16, 0.04), trim, s * 0.6, 2.36, lz);
  for (const s of [-1, 1]) P(box(0.04, 0.04, 1.44), trim, s * 0.6, 2.44, -0.25);
  for (const s of [-1, 1]) {
    P(plane(0.56, 0.5), M.decal(carriageWinTex()), s * 0.66, 1.86, -0.25, { ry: s * Math.PI / 2, cast: false });
    P(box(0.03, 0.9, 0.06), trim, s * 0.69, 1.45, 0.25); P(box(0.03, 0.9, 0.06), trim, s * 0.69, 1.45, -0.75);
  }
  if (o.door) P(box(0.05, 0.92, 0.5), body, 0.95, 1.5, 0.08, { ry: 1.2 });
  P(box(1.1, 0.5, 0.55), body, 0, 1.45, 0.95); P(box(1.0, 0.1, 0.45), M.flat(0x3a1a2c), 0, 1.75, 0.95);
  P(box(1.0, 0.06, 0.42), wood, 0, 1.0, 1.38, { rx: -0.5 });
  for (const s of [-1, 1]) { P(box(0.16, 0.24, 0.16), M.flat(0x101218), s * 0.62, 1.95, 0.64); P(cone(0.13, 0.12, 4), trim, s * 0.62, 2.12, 0.64, { ry: Math.PI / 4 }); }
  for (const [lz, r] of [[-0.85, 0.62], [0.95, 0.46]]) for (const s of [-1, 1]) wheel(P, s * 0.74, lz, r, trim);
  if (o.shafts !== false) for (const s of [-1, 1]) P(box(0.06, 0.06, 2.2), wood, s * 0.42, 0.3, 2.35, { rx: 0.2 });
  bake(ctx, g);
  if (o.tipped) solidLocal(ctx, x, z, ry, -2.45, -1.5, 0.1, 1.5, 1.4); else solidLocal(ctx, x, z, ry, -0.8, -1.5, 0.8, 1.45, 2.3);
}
// Luggage thrown from a coach: a trunk with gilt bands, hat boxes.
export function trunk(ctx, x, z, ry = 0, o = {}) {
  const g = local(x, 0, z, ry); const P = (gm, mat, lx, ly, lz, opt = {}) => add(ctx, gm, mat, lx, ly, lz, { ...opt, parent: g });
  P(box(0.9, 0.5, 0.55), M.wood('#4a2e22'), 0, 0.25, 0); P(box(0.94, 0.12, 0.59), M.flat(0x3a1e2a), 0, 0.53, 0);
  for (const lx of [-0.3, 0.3]) P(box(0.06, 0.64, 0.6), gilt(), lx, 0.3, 0);
  if (o.hatbox !== false) { P(cyl(0.22, 0.22, 0.3, 8), M.flat(0x5a2a44), 0.75, 0.15, 0.35); P(cyl(0.18, 0.18, 0.26, 8), M.flat(0x6a5a70), 0.55, 0.13, -0.5, { rz: Math.PI / 2 }); }
  bake(ctx, g); solidLocal(ctx, x, z, ry, -0.47, -0.3, 0.47, 0.3, 0.6);
}

// ---------------------------------------------------------------- fire and cloth
// A brazier of the house on a stone pedestal.
export function brazier(ctx, x, z) {
  add(ctx, box(0.62, 0.9, 0.62), M.ashlar('#4e5264'), x, 0.45, z); add(ctx, box(0.74, 0.1, 0.74), trimM(), x, 0.95, z);
  add(ctx, cyl(0.46, 0.24, 0.34, 8), M.ironLit(), x, 1.17, z);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; add(ctx, box(0.07, 0.24, 0.07), gilt(), x + Math.sin(a) * 0.36, 1.2, z + Math.cos(a) * 0.36, { rx: Math.cos(a) * 0.4, rz: -Math.sin(a) * 0.4 }); }
  add(ctx, cyl(0.4, 0.4, 0.04, 8), M.glow('#ff8a30', 1.6), x, 1.33, z, { cast: false });
  const t0 = T.flame().clone(); t0.needsUpdate = true; t0.repeat.set(1 / 4, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t0, color: new THREE.Color(2.2, 1.9, 1.6), fog: false }));
  sp.scale.set(0.8, 1.05, 1); sp.position.set(x, 1.8, z); ctx.group.add(sp);
  let t = Math.random() * 10; ctx.anims.push({ update(dt) { t += dt; t0.offset.x = (Math.floor(t * 10) % 4) / 4; return false; } });
  ctx.lights.push({ x, y: 2.1, z, color: 0xff8a30, intensity: 5.5, dist: 7.5, halo: true, flicker: 0.25 });
  solid(ctx, x - 0.38, z - 0.38, x + 0.38, z + 0.38, 1.4);
}
// The fallen house's banner hung from an iron rod on a wall facing '+x' or '+z'. o.long for the
// palace hangings, o.variant 2 for one slashed across.
const banMats = new Map();
export function banner(ctx, x, y, z, face = '+x', o = {}) {
  const long = !!o.long; const W = long ? 15 / 16 : 13 / 16, H = long ? 54 / 16 : 2; const tex = bannerTex(long, o.variant || 0);
  if (!banMats.has(tex)) banMats.set(tex, cutout(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide })));
  const fx = face === '+x';
  add(ctx, plane(W, H), banMats.get(tex), x + (fx ? 0.08 : 0), y, z + (fx ? 0 : 0.08), { ry: fx ? Math.PI / 2 : 0, cast: false });
  add(ctx, fx ? box(0.06, 0.06, W + 0.3) : box(W + 0.3, 0.06, 0.06), M.ironLit(), x + (fx ? 0.12 : 0), y + H / 2 + 0.04, z + (fx ? 0 : 0.12));
  for (const s of [-1, 1]) add(ctx, sph(0.05, 0), gilt(), x + (fx ? 0.12 : s * (W / 2 + 0.15)), y + H / 2 + 0.04, z + (fx ? s * (W / 2 + 0.15) : 0.12));
}
// A banner torn down, lying in the wet.
export function fallenBanner(ctx, x, z, ry = 0) {
  const tex = bannerTex(false, 1);
  if (!banMats.has(tex)) banMats.set(tex, cutout(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide })));
  add(ctx, plane(13 / 16, 2), banMats.get(tex), x, 0.02, z, { rx: -Math.PI / 2, rz: ry, cast: false });
  add(ctx, box(0.05, 0.05, 2.6), M.ironLit(), x + Math.sin(ry) * 0.2 - 0.6, 0.04, z + 0.4, { ry: ry + 0.3 });
}

// ---------------------------------------------------------------- inlaid floors
// The colonnade's walk: marble checkers over the flags.
export function checkerFloor(ctx, x0, z0, x1, z1) {
  const w = x1 - x0, d = z1 - z0;
  const m = new THREE.MeshPhongMaterial({ map: tiled(checkerTex(), w, d), shininess: 34, specular: 0x4a5266 });
  add(ctx, plane(w, d), m, x0 + w / 2, 0.016, z0 + d / 2, { rx: -Math.PI / 2, cast: false });
}
// The forecourt's compass star.
export function star(ctx, x, z, size = 12) {
  const S = Math.round(size * 16); const m = new THREE.MeshPhongMaterial({ map: starTex(S), alphaTest: 0.5, shininess: 30, specular: 0x4a5266 });
  add(ctx, plane(size, size), m, x, 0.018, z, { rx: -Math.PI / 2, cast: false });
}
