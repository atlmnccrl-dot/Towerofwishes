// Mirewater Docks' own set pieces: black harbour water behind stone quays, timber piers on piles,
// moored ships (masts, yards, rigging and ragged sails as silhouettes in the fog), the wreck in the
// dry dock, tarred warehouses with loading doors and hoists, dock cranes, fish stalls, net racks,
// bollards and the clutter of a harbour; low mist on the water and the lighthouse out in the fog.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, plane, geo, solid, solidCircle, roof, water } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';

export const WATER_Y = -1.0, BED_Y = -2.4, PIT_Y = -2.6;

// ---------------------------------------------------------------- helpers
const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4(), _e = new THREE.Euler();
const _L = new THREE.Matrix4(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const X1 = new THREE.Vector3(1, 0, 0), UP = new THREE.Vector3(0, 1, 0);
const unitBox = () => geo('dk-box', () => new THREE.BoxGeometry(1, 1, 1));
const unitCyl = () => geo('dk-cyl8', () => new THREE.CylinderGeometry(1, 1, 1, 8));

// Small repeated parts are gathered per kind and per 24 m cell, then become instanced meshes in
// finish(); a key starting with '!' casts shadows.
const REG = new WeakMap();
function push(ctx, key, geom, mat, m, x, z, col) {
  let reg = REG.get(ctx); if (!reg) REG.set(ctx, (reg = new Map()));
  const k = key + '@' + Math.floor(x / 24) + ',' + Math.floor(z / 24);
  let e = reg.get(k); if (!e) reg.set(k, (e = { geom, mat, mats: [], cols: [], cast: key[0] === '!' }));
  e.mats.push(m.clone()); e.cols.push(col);
}
function put(ctx, key, geom, mat, x, y, z, sx, sy, sz, ry = 0, rz = 0, col, rx = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  push(ctx, key, geom, mat, _m.compose(_p, _q, _s), x, z, col);
}
// A bar (rope, spar, rib) between two points.
function bar(ctx, key, mat, a, b, t, col) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const len = Math.hypot(dx, dy, dz) || 1e-3;
  _q.setFromUnitVectors(X1, _p.set(dx / len, dy / len, dz / len));
  const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2; _p.set(mx, (a[1] + b[1]) / 2, mz); _s.set(len, t, t);
  push(ctx, key, unitBox(), mat, _m.compose(_p, _q, _s), mx, mz, col);
}
// A flat board between two points (a plank, a gangway): w wide, t thick, its width kept level.
function slab(ctx, key, mat, a, b, w, t) {
  _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _a.length(); _a.normalize();
  const side = new THREE.Vector3().crossVectors(_a, UP).normalize(); const n = new THREE.Vector3().crossVectors(side, _a);
  _m.makeBasis(_a, n, side); _q.setFromRotationMatrix(_m);
  _p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); _s.set(len, t, w);
  push(ctx, key, unitBox(), mat, _m.compose(_p, _q, _s), _p.x, _p.z);
}
// A local frame (position, yaw, roll about the local X axis) for props built in their own axes.
function frame(x, y, z, ry = 0, rx = 0) { _e.set(rx, ry, 0, 'YXZ'); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(_e), new THREE.Vector3(1, 1, 1)); }
const wpt = (F, p) => { _b.set(p[0], p[1], p[2]).applyMatrix4(F); return [_b.x, _b.y, _b.z]; };
// A static mesh placed in a frame (merged with the rest by finishCtx).
function fmesh(ctx, F, geom, mat, x, y, z, rx = 0, ry = 0, rz = 0, cast = true) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(1, 1, 1);
  _L.compose(_p, _q, _s); const m = new THREE.Matrix4().multiplyMatrices(F, _L);
  const mesh = new THREE.Mesh(geom, mat); m.decompose(mesh.position, mesh.quaternion, mesh.scale);
  mesh.castShadow = cast; mesh.receiveShadow = true; mesh.userData.static = true; ctx.group.add(mesh);
  return mesh;
}
const fbar = (ctx, F, key, mat, a, b, t, col) => bar(ctx, key, mat, wpt(F, a), wpt(F, b), t, col);

// A box whose UVs run in metres on every face, so a repeating pixel texture keeps 16 texels per metre.
function mbox(w, h, d) {
  return geo(`dk-mb${w},${h},${d}`, () => {
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
    const sz = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * sz[f][0], uv.getY(i) * sz[f][1]); }
    return g;
  });
}

// Call once at the end of the level's build.
export function finish(ctx) {
  const reg = REG.get(ctx); if (!reg) return;
  for (const e of reg.values()) {
    const im = new THREE.InstancedMesh(e.geom, e.mat, e.mats.length);
    e.mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true;
    if (e.cols[0] !== undefined) { const c = new THREE.Color(); e.cols.forEach((h, i) => im.setColorAt(i, c.set(h ?? 0xffffff))); im.instanceColor.needsUpdate = true; }
    im.castShadow = e.cast; im.receiveShadow = true; im.computeBoundingSphere(); ctx.group.add(im);
  }
  REG.delete(ctx);
}

// ---------------------------------------------------------------- pixel textures
const texCache = new Map(), matCache = new Map();
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
// A canvas texture drawn texel by texel; rep: how many metres the texture spans (repeating), or 0.
function pix(key, w, h, draw, rep = 0) {
  if (!texCache.has(key)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h, T.rng(hash(key)));
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / rep, 1 / rep); }
    texCache.set(key, t);
  }
  return texCache.get(key);
}
const mat = (key, fn) => { if (!matCache.has(key)) matCache.set(key, fn()); return matCache.get(key); };
const texMat = (key, tex, o = {}) => mat(key, () => cutout(new THREE.MeshLambertMaterial({ map: tex, ...o })));
const dot = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
function sh(hex, f) { const n = parseInt(hex.slice(1), 16); const k = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${k((n >> 16) & 255)},${k((n >> 8) & 255)},${k(n & 255)})`; }

// Tarred hull strakes: horizontal planks four texels deep with dark seams and butt joints.
function hullTex(tone) {
  return pix('dk-hull' + tone, 32, 32, (g, w, h, r) => {
    for (let s = 0; s < 8; s++) {
      const f = 0.8 + r() * 0.32, b1 = (r() * 32) | 0, b2 = (b1 + 13 + ((r() * 8) | 0)) % 32;
      for (let y = s * 4; y < s * 4 + 4; y++) for (let x = 0; x < w; x++) {
        const seam = y === s * 4 + 3 || x === b1 || x === b2;
        dot(g, x, y, sh(tone, seam ? f * 0.5 : f * (y === s * 4 ? 1.14 : 1) * (0.94 + r() * 0.1)));
      }
    }
  }, 2);
}
// Weathered deck boards with dark gaps, nail heads and the odd missing board.
function deckTex(tone) {
  return pix('dk-deck' + tone, 32, 32, (g, w, h, r) => {
    for (let s = 0; s < 8; s++) {
      const f = 0.78 + r() * 0.34, gap = r() < 0.07, j = (r() * 32) | 0;
      for (let y = s * 4; y < s * 4 + 4; y++) for (let x = 0; x < w; x++) {
        const edge = y === s * 4 + 3; let c = gap ? '#07090b' : sh(tone, edge ? f * 0.42 : f * (0.93 + r() * 0.12));
        if (!gap && !edge && x === j) c = sh(tone, f * 0.55);
        if (!gap && y === s * 4 + 1 && (x === (j + 2) % 32 || x === (j + 18) % 32)) c = '#22262a';
        dot(g, x, y, c);
      }
    }
  }, 2);
}
// Canvas sail, grey with stains, torn: holes, a ragged foot, eaten edges.
function sailTex() {
  return pix('dk-sail', 24, 32, (g, w, h, r) => {
    const cut = []; for (let x = 0; x < w; x++) cut.push(h - 2 - ((r() * 9) | 0) - (x % 5 === 0 ? 3 : 0));
    const holes = []; for (let k = 0; k < 4; k++) holes.push([r() * w, 6 + r() * (h - 14), 1 + r() * 2.2]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (y > cut[x] || ((x === 0 || x === w - 1) && r() < 0.3)) continue;
      if (holes.some(([hx, hy, hr]) => Math.hypot(x - hx, y - hy) < hr)) continue;
      const seam = x % 6 === 0; const stain = Math.sin(x * 0.7 + y * 0.3) + Math.cos(y * 0.5) > 1.2;
      dot(g, x, y, sh('#b8b6aa', (seam ? 0.78 : 0.9 + r() * 0.12) * (stain ? 0.72 : 1) * (1 - y / h * 0.25)));
    }
  });
}
// A fishing net: diamond mesh of tarred cord, open between.
function netTex() {
  return pix('dk-net', 32, 32, (g, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = (x + y) % 5 === 0, b = (x - y + 40) % 5 === 0;
      if (a && b) dot(g, x, y, '#4a463c'); else if (a || b) dot(g, x, y, '#2c2a24');
    }
  }, 2);
}
// A wide loading door: vertical planks, two iron straps, a centre seam; one leaf ajar shows the dark.
function loadDoor(ajar) {
  return pix('dk-ld' + ajar, 38, 45, (g, w, h, r) => {
    for (let x = 0; x < w; x++) { const f = 0.8 + r() * 0.3; for (let y = 0; y < h; y++) {
      const frame = x === 0 || x === w - 1 || y === 0; const strap = y === 9 || y === 10 || y === 34 || y === 35;
      let c = frame ? '#17120e' : strap ? '#15171b' : sh('#3e3024', (x % 4 === 3 ? 0.55 : f) * (0.95 + r() * 0.08));
      if (x === 18 || x === 19) c = '#120e0a';
      if (ajar && x > 19 && x < 27 && !frame) c = y > h - 3 ? '#1a1d22' : '#06070a';
      dot(g, x, y, c);
    } }
    for (const y of [9, 34]) for (const x of [3, 15, 22, 34]) dot(g, x, y, '#4a4e56');
  });
}
// A loft door, upper floor: planks, a cross brace, an iron ring.
function loftDoor() {
  return pix('dk-loft', 21, 28, (g, w, h, r) => {
    for (let x = 0; x < w; x++) { const f = 0.8 + r() * 0.3; for (let y = 0; y < h; y++) {
      const frame = x === 0 || x === w - 1 || y === 0 || y === h - 1; const brace = Math.abs((x / w) * h - y) < 1.1 || y === 3 || y === h - 4;
      dot(g, x, y, frame ? '#17120e' : brace ? sh('#3e3024', 0.62) : sh('#3a2c22', (x % 4 === 3 ? 0.55 : f)));
    } }
    dot(g, 16, 14, '#5a5e66'); dot(g, 17, 14, '#3a3e46');
  });
}
// Stern windows: a row of small panes, dark or lit a sickly green.
function sternTex(lit) {
  return pix('dk-stern' + lit, 26, 7, (g, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const frame = y === 0 || y === h - 1 || x % 5 === 0;
      dot(g, x, y, frame ? '#1c1610' : lit ? ((x + y) % 4 === 0 ? '#b4f8e0' : '#4aa890') : '#0c1014');
    }
  });
}
// The fishmonger's sign: a board with a pale fish on it.
function fishSign() {
  return pix('dk-fsign', 14, 9, (g, w, h) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dot(g, x, y, x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#1e140c' : '#4a3424');
    const rows = [[4, 4, 8], [3, 2, 11], [3, 3, 10], [4, 2, 11], [5, 4, 8]];
    for (const [y, x0, x1] of rows) for (let x = x0; x <= x1; x++) dot(g, x, y, x < 4 ? '#8a969c' : '#b8c2c6');
    dot(g, 9, 3, '#1e140c'); dot(g, 1, 3, '#9aa6ac'); dot(g, 1, 5, '#9aa6ac'); dot(g, 2, 4, '#9aa6ac');
  });
}
// Soft drifting fog, smooth (filtered): value noise in two octaves, tiling.
function mistTex() {
  if (texCache.has('dk-mist')) return texCache.get('dk-mist');
  const N = 64, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const img = g.createImageData(N, N); const r = T.rng(911);
  const grid = (n) => { const a = []; for (let i = 0; i < n * n; i++) a.push(r()); return (x, y) => { const xi = Math.floor(x) % n, yi = Math.floor(y) % n, fx = x - Math.floor(x), fy = y - Math.floor(y); const s = (t) => t * t * (3 - 2 * t); const v = (i, j) => a[((j + n) % n) * n + ((i + n) % n)]; const top = v(xi, yi) + (v(xi + 1, yi) - v(xi, yi)) * s(fx), bot = v(xi, yi + 1) + (v(xi + 1, yi + 1) - v(xi, yi + 1)) * s(fx); return top + (bot - top) * s(fy); }; };
  const o1 = grid(4), o2 = grid(8);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const v = o1(x / N * 4, y / N * 4) * 0.65 + o2(x / N * 8, y / N * 8) * 0.35; const a = Math.max(0, Math.min(1, (v - 0.32) * 1.9));
    const i = (y * N + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; texCache.set('dk-mist', t); return t;
}

const ropeM = () => M.flat(0x15120e);
const lineM = () => M.flat(0x0a0c0f);
const sparM = () => M.flat(0x1c1712);
const fishM = () => mat('fish', () => cutout(new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 70, specular: 0x8898a8 })));
const FISH = [0x9aa6ae, 0x7e8c94, 0xb4bcc0, 0x6a7a6e, 0x8a7e6a, 0xa8b0a8];

// ---------------------------------------------------------------- water
// A sheet of black water and the silt bed under it.
export function harbour(ctx, x0, z0, x1, z1) {
  water(ctx, x0, z0, x1, z1, WATER_Y, 0x090f13);
  add(ctx, box(x1 - x0, 0.3, z1 - z0), M.dirt('#101418'), (x0 + x1) / 2, BED_Y - 0.15, (z0 + z1) / 2, { cast: false });
}
// Water you cannot walk into (nothing can blink onto it); sight passes over it.
export function waterSolid(ctx, x0, z0, x1, z1) { solid(ctx, x0, z0, x1, z1, 1.0); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); }

// A stone quay edge along a water line; waterSide: where the water lies ('+x','-x','+z','-z'). A wall to
// the bed, a coping lip, a band of weed at the waterline and, on the faces we see, timber fenders.
export function quay(ctx, x0, z0, x1, z1, waterSide) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const sg = waterSide[0] === '+' ? 1 : -1; const H = -BED_Y - 0.05;
  const wallM = M.ashlar('#343e4c'), copeM = M.ashlar('#525c6a'), weed = M.flat(0x18241e), fend = M.wood('#2e241a');
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const seen = sg > 0;
  const B = (w, h, d, m, x, y, z) => add(ctx, box(alongX ? w : d, h, alongX ? d : w), m, x, y, z, { cast: false });
  if (alongX) {
    B(len, H, 0.52, wallM, cx, BED_Y + H / 2, z0 - sg * 0.24); B(len, 0.35, 0.56, copeM, cx, -0.125, z0 - sg * 0.22);
    if (seen) B(len, 0.22, 0.04, weed, cx, WATER_Y + 0.22, z0 + sg * 0.03);
  } else {
    B(len, H, 0.52, wallM, x0 - sg * 0.24, BED_Y + H / 2, cz); B(len, 0.35, 0.56, copeM, x0 - sg * 0.22, -0.125, cz);
    if (seen) B(len, 0.22, 0.04, weed, x0 + sg * 0.03, WATER_Y + 0.22, cz);
  }
  if (seen) for (let t = 1.2; t < len - 0.6; t += 3.1) {
    const px = alongX ? Math.min(x0, x1) + t : x0 + sg * 0.1, pz = alongX ? z0 + sg * 0.1 : Math.min(z0, z1) + t;
    put(ctx, 'dk-fender', unitBox(), fend, px, WATER_Y + 0.35, pz, 0.18, 1.2, 0.18);
  }
}

// Ripples on black water (short pale dashes lying level on the screen, shimmering) and the broken
// columns of light the lamps throw on it. Call after every light is placed.
export function ripples(ctx, rects, density = 0.3) {
  const cool = new THREE.Color(0x2e4052), hot = new THREE.Color(0x9a6430);
  const mats = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: cool.clone(), fog: false }));
  const warm = [0, 1].map(() => new THREE.MeshBasicMaterial({ color: hot.clone(), fog: false }));
  const g = unitBox(); const y = WATER_Y + 0.01; const r = T.rng(303);
  const wet = (x, z) => rects.some(([x0, z0, x1, z1]) => x > x0 + 0.3 && x < x1 - 0.3 && z > z0 + 0.3 && z < z1 - 0.3);
  const dry = ctx.dryRects || [];
  const onLand = (x, z) => dry.some(([x0, z0, x1, z1]) => x > x0 - 0.2 && x < x1 + 0.2 && z > z0 - 0.2 && z < z1 + 0.2);
  for (const [x0, z0, x1, z1] of rects) {
    const n = Math.round((x1 - x0) * (z1 - z0) * density);
    for (let i = 0; i < n; i++) {
      const x = x0 + 0.4 + r() * (x1 - x0 - 0.8), z = z0 + 0.4 + r() * (z1 - z0 - 0.8); if (onLand(x, z)) continue; const k = i % 2;
      put(ctx, 'dk-rip' + k, g, mats[k], x, y, z, 0.3 + r() * 0.9, 0.01, 0.06, Math.PI / 4);
    }
  }
  for (const L of ctx.lights) {
    const hh = L.y - WATER_Y; const off = hh * Math.cos(0.698) / Math.sin(0.698) / Math.SQRT2;
    for (let j = -3; j <= 3; j++) {
      const t = off + j * 0.32 * Math.max(1, hh / 3); const x = L.x + t, z = L.z + t; if (!wet(x, z) || onLand(x, z)) continue;
      const k = (j + 4) % 2; put(ctx, 'dk-glint' + k, g, warm[k], x, y + 0.005, z, (0.9 - Math.abs(j) * 0.1) * (0.6 + r() * 0.6), 0.01, 0.07, Math.PI / 4);
    }
  }
  let t = 0;
  ctx.anims.push({ update(dt) {
    t += dt; const a = Math.sin(t * 1.3) * 0.3;
    mats[0].color.copy(cool).multiplyScalar(1 + a); mats[1].color.copy(cool).multiplyScalar(1 - a);
    warm[0].color.copy(hot).multiplyScalar(1 + a); warm[1].color.copy(hot).multiplyScalar(1 - a); return false;
  } });
}

// Low mist over the water: sheets of soft fog at height y, drifting slowly. Over open water only.
export function mist(ctx, rects, y = -0.55, opacity = 0.2, color = 0x8c9cac) {
  const base = mistTex(); let i = 0;
  for (const [x0, z0, x1, z1] of rects) {
    const w = x1 - x0, d = z1 - z0; const t = base.clone(); t.needsUpdate = true; t.repeat.set(w / 14, d / 14);
    const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, y, z0 + d / 2); m.renderOrder = 2; ctx.group.add(m);
    const vx = 0.012 + (i % 3) * 0.006, vz = (i % 2 ? 1 : -1) * 0.007; i++;
    ctx.anims.push({ update(dt) { t.offset.x += vx * dt; t.offset.y += vz * dt; return false; } });
  }
}

// ---------------------------------------------------------------- piers and boats
// A timber pier on piles over the water: deck boards (boards: the way the planks run), stringers under
// the edges, a pile every 1.6 m along the long sides with X-bracing between, some pile heads standing
// proud as mooring posts. The deck is level with the quay and walkable; the water solids border it.
export function pier(ctx, x0, z0, x1, z1, opts = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const longX = w >= d;
  const deck = texMat('deck', deckTex('#5c5248')); const timber = M.wood('#2e261e'), pile = M.wood('#262019');
  if ((opts.boards || (longX ? 'z' : 'x')) === 'x') add(ctx, mbox(w, 0.14, d), deck, cx, -0.07, cz, { cast: false });
  else add(ctx, mbox(d, 0.14, w), deck, cx, -0.07, cz, { cast: false, ry: Math.PI / 2 });
  const len = longX ? w : d, n = Math.max(1, Math.round(len / 1.6));
  for (const side of [-1, 1]) {
    // stringer along the long edge
    if (longX) add(ctx, box(w, 0.26, 0.2), timber, cx, -0.27, cz + side * (d / 2 - 0.1)); else add(ctx, box(0.2, 0.26, d), timber, cx + side * (w / 2 - 0.1), -0.27, cz);
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + (i / n) * len; const px = longX ? cx + t : cx + side * (w / 2 - 0.12), pz = longX ? cz + side * (d / 2 - 0.12) : cz + t;
      put(ctx, '!dk-pile', unitCyl(), pile, px, (BED_Y + 0) / 2, pz, 0.15, -BED_Y, 0.15);
      if ((i % 2 === 0 && opts.posts !== false) && (side > 0 || opts.bothPosts)) put(ctx, '!dk-pile', unitCyl(), pile, px, 0.22, pz, 0.15, 0.44, 0.15);
      if (i < n && side > 0) { // bracing on the camera side
        const t2 = -len / 2 + ((i + 1) / n) * len; const qx = longX ? cx + t2 : px, qz = longX ? pz : cz + t2;
        bar(ctx, 'dk-brace', timber, [px, -0.3, pz], [qx, WATER_Y - 0.1, qz], 0.1); bar(ctx, 'dk-brace', timber, [qx, -0.3, qz], [px, WATER_Y - 0.1, pz], 0.1);
      }
    }
  }
  // the end beam (when the pier ends in water)
  if (opts.endBeam) { const [ex, ez] = opts.endBeam; add(ctx, box(longX ? 0.2 : w, 0.26, longX ? d : 0.2), timber, ex, -0.27, ez); }
}

// A rowing boat or barge riding low (along 'x' or 'z', bow toward +).
export function rowboat(ctx, x, z, len = 4.4, along = 'z', opts = {}) {
  const ax = along === 'x', W = opts.w || 1.3, y = WATER_Y;
  const B = (lu, lh, lw, m, u, yy, v, o) => add(ctx, box(ax ? lu : lw, lh, ax ? lw : lu), m, x + (ax ? u : v), yy, z + (ax ? v : u), o);
  const hull = M.wood(opts.tone || '#3a2c20'), rim = M.wood('#5a4430'), inner = M.wood('#221a12');
  const L = len - W * 0.5, u0 = -W * 0.25;
  B(L, 0.36, W - 0.16, inner, u0, y + 0.03, 0);
  for (const sv of [-1, 1]) { B(L, 0.46, 0.1, hull, u0, y + 0.12, sv * (W / 2 - 0.05)); B(L, 0.05, 0.14, rim, u0, y + 0.37, sv * (W / 2 - 0.05)); }
  B(0.1, 0.46, W, hull, u0 - L / 2, y + 0.12, 0);
  const bu = u0 + L / 2; add(ctx, box(W * 0.71, 0.46, W * 0.71), hull, x + (ax ? bu : 0), y + 0.12, z + (ax ? 0 : bu), { ry: Math.PI / 4 });
  B(0.22, 0.05, W - 0.2, rim, u0 + 0.6, y + 0.24, 0); B(0.22, 0.05, W - 0.2, rim, u0 - L / 2 + 0.7, y + 0.24, 0);
  add(ctx, box(ax ? 2.4 : 0.06, 0.04, ax ? 0.06 : 2.4), M.wood('#6a5038'), x + (ax ? u0 : 0.2), y + 0.3, z + (ax ? 0.2 : u0), { ry: 0.1 });
  if (opts.water) add(ctx, box(ax ? L - 0.3 : W - 0.4, 0.02, ax ? W - 0.4 : L - 0.3), M.flat(0x0c1216), x + (ax ? u0 : 0), y + 0.2, z + (ax ? 0 : u0), { cast: false });
  if (opts.moor) { const [tx, ty, tz] = opts.moor; const sx = x + (ax ? bu + 0.2 : 0), sz = z + (ax ? 0 : bu + 0.2); bar(ctx, 'dk-line', ropeM(), [sx, y + 0.4, sz], [(sx + tx) / 2, (y + ty) / 2 - 0.15, (sz + tz) / 2], 0.04); bar(ctx, 'dk-line', ropeM(), [(sx + tx) / 2, (y + ty) / 2 - 0.15, (sz + tz) / 2], [tx, ty, tz], 0.04); }
  if (opts.crates) for (let i = 0; i < opts.crates; i++) add(ctx, box(0.5, 0.45, 0.5), M.wood('#4e3a26'), x + (ax ? u0 - 0.6 + i * 0.62 : 0.05), y + 0.42, z + (ax ? 0.05 : u0 - 0.6 + i * 0.62), { ry: i * 0.3 });
}

// A moored sailing ship: hull of tarred strakes with a wale, bulwarks and a raised quarterdeck, a
// bowsprit, two masts with yards, ragged sails hanging, shrouds and stays as dark lines; a green
// lantern on the stern of a ship that came back with no one aboard. bow: the way it points.
export function ship(ctx, x, z, opts = {}) {
  const L = opts.len || 12, B = opts.beam || 3.8, D = opts.deck ?? 1.2, H0 = WATER_Y - 0.5, bh = 0.55;
  const ry = { '+x': 0, '-x': Math.PI, '+z': -Math.PI / 2, '-z': Math.PI / 2 }[opts.bow || '+x'];
  const F = frame(x, 0, z, ry); const r = T.rng(hash('ship' + x + ',' + z));
  const hullM = texMat('hull' + (opts.tone || ''), hullTex(opts.tone || '#2e2620')); const wale = M.wood('#4a3c2c'), dark = M.wood('#221a14');
  const line = lineM(), spar = sparM(); const hh = D - H0, Lm = L - B / 2, um = -L / 2 + Lm / 2, uc = L / 2 - B / 2;
  // hull: the straight run and the bow (a square turned 45 degrees), the wale along the side
  fmesh(ctx, F, mbox(Lm, hh, B), hullM, um, H0 + hh / 2, 0);
  fmesh(ctx, F, mbox(B * 0.7071, hh, B * 0.7071), hullM, uc, H0 + hh / 2, 0, 0, Math.PI / 4);
  fmesh(ctx, F, mbox(Lm, 0.16, B + 0.08), wale, um, D - 0.4, 0);
  fmesh(ctx, F, mbox(Lm, 0.1, B + 0.06), wale, um, WATER_Y + 0.25, 0);
  // bulwarks and their rails
  for (const s of [-1, 1]) {
    fmesh(ctx, F, mbox(Lm, bh, 0.12), hullM, um, D + bh / 2, s * (B / 2 - 0.06));
    fmesh(ctx, F, mbox(Lm, 0.06, 0.22), wale, um, D + bh + 0.03, s * (B / 2 - 0.08));
    fmesh(ctx, F, mbox(B * 0.7071, bh, 0.12), hullM, uc + B / 4, D + bh / 2, s * B / 4, 0, s * Math.PI / 4);
  }
  fmesh(ctx, F, mbox(0.12, bh, B), hullM, -L / 2 + 0.06, D + bh / 2, 0);
  // quarterdeck, its rail, the transom with its windows, the rudder
  fmesh(ctx, F, mbox(2.6, 0.8, B), hullM, -L / 2 + 1.3, D + 0.4, 0);
  for (const s of [-1, 1]) fbar(ctx, F, 'dk-rail', spar, [-L / 2 + 0.1, D + 1.45, s * (B / 2 - 0.08)], [-L / 2 + 2.6, D + 1.45, s * (B / 2 - 0.08)], 0.06);
  for (let i = 0; i <= 6; i++) for (const s of [-1, 1]) fbar(ctx, F, 'dk-rail', spar, [-L / 2 + 0.1 + i * 0.41, D + 0.8, s * (B / 2 - 0.08)], [-L / 2 + 0.1 + i * 0.41, D + 1.45, s * (B / 2 - 0.08)], 0.05);
  fmesh(ctx, F, plane(1.7, 0.45), texMat('stern' + !!opts.lantern, sternTex(!!opts.lantern), opts.lantern ? { emissive: 0xffffff, emissiveMap: sternTex(true), emissiveIntensity: 0.9 } : {}), -L / 2 - 0.02, D + 0.35, 0, 0, -Math.PI / 2, 0, false);
  fmesh(ctx, F, mbox(0.5, hh * 0.85, 0.14), dark, -L / 2 - 0.25, H0 + hh * 0.42, 0);
  // bowsprit and jib-boom
  const bs = [L / 2, D + 0.3, 0], be = [L / 2 + 3.4, D + 1.4, 0];
  fbar(ctx, F, '!dk-spar', spar, bs, be, 0.18);
  // masts: lower mast, top, topmast; yards across with furled or hanging sails
  const masts = opts.masts || [10, 11]; const mu = [L * 0.2, -L * 0.12]; const tops = [];
  masts.forEach((Hm, k) => {
    const u = mu[k]; const topY = D + Hm * 0.6; tops.push([u, D + Hm, 0]);
    fbar(ctx, F, '!dk-spar', spar, [u, D - 0.2, 0], [u, topY + 0.6, 0], 0.26);
    fbar(ctx, F, '!dk-spar', spar, [u, topY - 0.2, 0], [u, D + Hm, 0], 0.16);
    fmesh(ctx, F, mbox(1.0, 0.1, 1.5), dark, u, topY, 0);
    const yards = [[0.42, 1.65], [0.72, 1.3], [0.92, 0.95]];
    yards.forEach(([f, wl], j) => {
      const yy = D + Hm * f, yl = B * wl;
      fbar(ctx, F, '!dk-spar', spar, [u + 0.18, yy, -yl / 2], [u + 0.18, yy, yl / 2], 0.11);
      const kind = (opts.sails || ['hang', 'furl', 'bare', 'furl', 'hang', 'bare'])[k * 3 + j];
      if (kind === 'furl') fbar(ctx, F, 'dk-furl', M.flat(0x6e6a60), [u + 0.24, yy - 0.15, -yl * 0.44], [u + 0.24, yy - 0.15, yl * 0.44], 0.22);
      if (kind === 'hang') {
        const nextY = j === 0 ? D + 1.4 : D + Hm * yards[j - 1][0]; const sh2 = Math.max(1.4, (yy - nextY) * 0.92), sw = yl * 0.84;
        fmesh(ctx, F, plane(sw, sh2), mat('sailM', () => cutout(new THREE.MeshLambertMaterial({ map: sailTex(), alphaTest: 0.5, side: THREE.DoubleSide, color: 0x9a988c }))), u + 0.26, yy - sh2 / 2 - 0.08, 0, 0, Math.PI / 2 + (r() - 0.5) * 0.25, 0, false);
      }
      // braces to the deck, from the lowest yard
      if (j === 0) for (const s of [-1, 1]) fbar(ctx, F, 'dk-rig', line, [u + 0.18, yy, s * yl / 2], [u - 2.2, D + bh, s * (B / 2 - 0.1)], 0.05);
    });
    // shrouds, both sides
    for (const s of [-1, 1]) for (const du of [-0.7, 0, 0.7]) fbar(ctx, F, 'dk-rig', line, [u, topY, s * 0.3], [u + du, D + bh, s * (B / 2 - 0.05)], 0.05);
  });
  // stays: foretop to the bowsprit end, maintop to the fore mast, maintop to the stern
  fbar(ctx, F, 'dk-rig', line, tops[0], be, 0.05);
  fbar(ctx, F, 'dk-rig', line, [mu[0], D + masts[0] * 0.6, 0], bs, 0.05);
  if (tops[1]) { fbar(ctx, F, 'dk-rig', line, tops[1], [mu[0], D + masts[0] * 0.75, 0], 0.05); fbar(ctx, F, 'dk-rig', line, tops[1], [-L / 2 + 0.3, D + 1.5, 0], 0.05); }
  // the stern lantern: cold green, the colour of things that came back from the sea
  if (opts.lantern) {
    const lp = [-L / 2 + 0.35, D + 2.2, 0]; fbar(ctx, F, 'dk-rail', spar, [-L / 2 + 0.35, D + 0.8, 0], lp, 0.06);
    const [lx, ly, lz] = wpt(F, lp); add(ctx, box(0.22, 0.3, 0.22), M.glow('#8ff0d0', 1.6), lx, ly - 0.2, lz, { cast: false });
    ctx.lights.push({ x: lx, y: ly, z: lz, color: 0x60e0c0, intensity: opts.lantern, dist: 6.5, flicker: 0.12 });
  }
  // mooring lines from bow and stern to points ashore ([[u, v], [x, y, z]])
  for (const [[lu, lv], to] of opts.moor || []) {
    const a = wpt(F, [lu, D + 0.4, lv]); const mid = [(a[0] + to[0]) / 2, (a[1] + to[1]) / 2 - 0.35, (a[2] + to[2]) / 2];
    bar(ctx, 'dk-line', ropeM(), a, mid, 0.05); bar(ctx, 'dk-line', ropeM(), mid, to, 0.05);
  }
  // a gangway from the side to a point ashore ([u, side, x, z])
  if (opts.plank) { const [pu, ps, tx, tz] = opts.plank; slab(ctx, '!dk-plank', M.wood('#4a3c2e'), wpt(F, [pu, D + 0.05, ps * (B / 2 + 0.05)]), [tx, 0.05, tz], 0.6, 0.06); }
  // its footprint blocks sight (it lies in water anyway)
  const cs = [[-L / 2, -B / 2], [L / 2, -B / 2], [-L / 2, B / 2], [L / 2, B / 2]].map(([u, v]) => wpt(F, [u, 0, v]));
  solid(ctx, Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[2])), Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[2])), 3);
}

// ---------------------------------------------------------------- the dry dock
// A dry dock (interior x0..x1, z0..z1): pumped dry, stepped altars down the far wall (-X), a timber dock
// gate holding back the harbour at the -Z end, seep water on the floor, a stone rim. Nothing walks in;
// sight passes over it.
export function dryDock(ctx, x0, z0, x1, z1) {
  const fy = PIT_Y, cz = (z0 + z1) / 2, cx = (x0 + x1) / 2, D = z1 - z0, W = x1 - x0;
  const stone = M.ashlar('#36404c'), step = M.ashlar('#404a56'), wood = M.wood('#2a221a');
  add(ctx, box(W, 0.3, D), M.flags('#363e48'), cx, fy - 0.15, cz, { cast: false });
  // the far wall's altars: steps down from the rim
  const n = 4, rise = (-0.4 - fy) / n, run = 0.5;
  for (let i = 0; i < n; i++) { const wd = run * (n - i), ht = rise * (i + 1); add(ctx, box(wd, ht, D), step, x0 + wd / 2, fy + ht / 2, cz); }
  add(ctx, box(0.6, -fy - 0.4, D + 1.2), stone, x0 - 0.3, (fy - 0.4) / 2, cz);
  add(ctx, box(0.6, -fy - 0.4, D + 1.2), stone, x1 + 0.3, (fy - 0.4) / 2, cz);
  add(ctx, box(W, -fy - 0.4, 0.6), stone, cx, (fy - 0.4) / 2, z1 + 0.3);
  // the dock gate: a tarred timber caisson with posts and seep streaks
  add(ctx, box(W, -fy - 0.4, 0.6), wood, cx, (fy - 0.4) / 2, z0 - 0.3);
  for (let x = x0 + 0.8; x < x1 - 0.4; x += 1.6) put(ctx, '!dk-post', unitBox(), M.wood('#1e1812'), x, (fy - 0.3) / 2, z0 + 0.06, 0.22, -fy - 0.3, 0.14);
  const r = T.rng(77); const seep = M.flat(0x1e2a30, { emissive: 0x060a0c });
  for (let k = 0; k < 6; k++) { const x = x0 + 0.6 + r() * (W - 1.2), hgt = 0.6 + r() * 1.4; put(ctx, 'dk-seep', unitBox(), seep, x, fy + hgt / 2, z0 + 0.02, 0.06, hgt, 0.02); }
  // seep water on the floor
  const pud = new THREE.MeshPhongMaterial({ color: 0x121a22, specular: 0x8090a8, shininess: 80, transparent: true, opacity: 0.85 });
  for (const [px, pz, pw, pd] of [[cx - 1, z0 + 1.2, 4, 1.4], [cx + 2, z0 + 3, 2, 1.2], [x0 + 3, cz + 2, 1.6, 2.4], [cx + 1, z1 - 2, 2.2, 1]]) {
    const m = new THREE.Mesh(geo('dk-pud', () => new THREE.CircleGeometry(0.5, 12)), pud); m.rotation.x = -Math.PI / 2; m.scale.set(pw, pd, 1); m.position.set(px, fy + 0.01, pz); m.receiveShadow = true; ctx.group.add(m);
  }
  // the rim: a coping lip on the edges we look over
  add(ctx, box(0.5, 0.14, D + 1.0), M.ashlar('#56606e'), x1 + 0.25, 0.02, cz + 0.5);
  add(ctx, box(W, 0.14, 0.5), M.ashlar('#56606e'), cx, 0.02, z1 + 0.25);
  waterSolid(ctx, x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 1.0);
}

// A wreck on the keel blocks of the dry dock: a hull heeled over, half its planking stripped to the
// ribs, propped with timber shores. (x, y, z): the keel's middle; along: the keel's direction.
export function wreck(ctx, x, y, z, opts = {}) {
  const L = opts.len || 10, B = opts.beam || 3.6, Dp = opts.depth || 2.8, heel = opts.heel ?? 0.4;
  const ry = opts.along === 'x' ? 0 : -Math.PI / 2; const F = frame(x, y, z, ry, heel); const r = T.rng(hash('wreck' + x));
  const rib = M.wood('#2c231b'), plank = texMat('hull#2a241e', hullTex('#2a241e')), keel = M.wood('#221a14');
  fbar(ctx, F, '!dk-keel', keel, [-L / 2 - 0.2, 0, 0], [L / 2, 0, 0], 0.34);
  fbar(ctx, F, '!dk-keel', keel, [L / 2, 0, 0], [L / 2 + 0.5, Dp * 0.6, 0], 0.26); fbar(ctx, F, '!dk-keel', keel, [L / 2 + 0.5, Dp * 0.6, 0], [L / 2 + 0.9, Dp + 0.7, 0], 0.22);
  fbar(ctx, F, '!dk-keel', keel, [-L / 2 - 0.2, 0, 0], [-L / 2 - 0.45, Dp + 0.4, 0], 0.26);
  const n = Math.round(L / 0.72);
  const prof = (u) => { const t = 1 - Math.pow(Math.abs(u) / (L / 2), 2.2) * 0.72; return [B / 2 * t, Dp * (0.86 + 0.14 * t)]; };
  for (let i = 1; i < n; i++) {
    const u = -L / 2 + (i / n) * L; const [b, d] = prof(u);
    for (const s of [-1, 1]) {
      const broken = s < 0 && r() < 0.35; const kmax = broken ? 2 + ((r() * 3) | 0) : 6;
      let prev = [u, 0, 0];
      for (let k = 1; k <= kmax; k++) {
        const th = Math.min(k, 5) / 5 * Math.PI / 2; const p = k <= 5 ? [u, d * (1 - Math.cos(th)), s * b * Math.sin(th)] : [u, d + 0.4, s * b * 0.94];
        fbar(ctx, F, '!dk-rib', rib, prev, p, 0.14); prev = p;
      }
    }
  }
  // planking: most strakes left on the low side (+v), a few torn ones on the high side
  const [bm, dm] = prof(0);
  for (const th of [0.12, 0.38, 0.64, 0.9, 1.14, 1.36]) {
    const lw = L * (0.74 - th * 0.12); fmesh(ctx, F, mbox(lw, 0.07, 0.42), plank, -0.2, dm * (1 - Math.cos(th)) + 0.05, (bm + 0.05) * Math.sin(th), -th, 0, 0);
  }
  for (const [th, lw, off] of [[0.12, L * 0.6, 0.6], [0.4, L * 0.32, -1.6], [0.62, L * 0.2, 1.8], [1.1, L * 0.16, -0.4]]) {
    fmesh(ctx, F, mbox(lw, 0.07, 0.42), plank, off, dm * (1 - Math.cos(th)) + 0.05, -(bm + 0.05) * Math.sin(th), th, 0, 0);
  }
  // keel blocks and the shores that hold it up
  const fy = opts.floorY ?? PIT_Y; const vd = [Math.sin(ry), Math.cos(ry)];
  for (let u = -L / 2 + 0.8; u < L / 2; u += 1.6) { const [kx, , kz] = wpt(F, [u, 0, 0]); put(ctx, '!dk-block', unitBox(), M.wood('#3a2e22'), kx, fy + (y - fy - 0.15) / 2, kz, ry ? 0.9 : 0.5, y - fy - 0.15, ry ? 0.5 : 0.9); }
  for (const u of [-L * 0.3, 0, L * 0.28]) for (const s of [-1, 1]) {
    const [b, d] = prof(u); const P = wpt(F, [u, d * 0.6, s * b * 0.92]);
    const foot = [P[0] + s * vd[0] * 1.8, fy, P[2] + s * vd[1] * 1.8]; bar(ctx, '!dk-shore', keel, foot, P, 0.16);
  }
}

// Sheer legs: two tall spars leaning over the dock from the rim, lashed at the top, tackle hanging.
export function sheerLegs(ctx, a, b, top, hookY) {
  const spar = M.wood('#2a2219');
  bar(ctx, '!dk-sheer', spar, [a[0], 0, a[1]], top, 0.3); bar(ctx, '!dk-sheer', spar, [b[0], 0, b[1]], top, 0.3);
  for (const p of [a, b]) add(ctx, box(0.8, 0.3, 0.8), M.ashlar('#3c4656'), p[0], 0.15, p[1]);
  bar(ctx, 'dk-line', ropeM(), top, [top[0], hookY + 0.4, top[2]], 0.05); bar(ctx, 'dk-line', ropeM(), [top[0] + 0.15, top[1] - 0.2, top[2]], [top[0] + 0.15, hookY + 0.4, top[2]], 0.05);
  add(ctx, box(0.3, 0.5, 0.3), M.ironLit(), top[0], hookY + 0.15, top[2]);
  add(ctx, box(0.5, 0.2, 0.5), M.wood('#3a2e22'), top[0], top[1] - 0.1, top[2]);
}

// A low chain rail: iron posts with chains sagging between (visual; a solid lies under it).
export function chainRail(ctx, x0, z0, x1, z1, step = 1.6) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / step)); const iron = M.ironLit();
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    put(ctx, '!dk-cpost', unitBox(), iron, x, 0.45, z, 0.1, 0.9, 0.1); put(ctx, 'dk-cknob', geo('dk-knob', () => new THREE.SphereGeometry(0.08, 6, 4)), iron, x, 0.92, z, 1, 1, 1);
    if (i < n) { const x2 = x0 + (x1 - x0) * (i + 1) / n, z2 = z0 + (z1 - z0) * (i + 1) / n; const pts = [0, 0.25, 0.5, 0.75, 1].map((k) => [x + (x2 - x) * k, 0.82 - Math.sin(k * Math.PI) * 0.22, z + (z2 - z) * k]); for (let k = 0; k < 4; k++) bar(ctx, 'dk-chain', iron, pts[k], pts[k + 1], 0.04); }
  }
}

// ---------------------------------------------------------------- buildings
// A harbour warehouse: a long store with its eaves to the quay (front: the camera-facing long side, '+x'
// or '+z'), wide loading doors below and a loft door above each with a hoist beam, rope and hook under
// the eaves, a hooded lucam over one; small windows; brick, or brick below tarred boards (clad).
export function warehouse(ctx, x, z, w, d, h, opts = {}) {
  const fx = (opts.front || '+x') === '+x'; const r = T.rng(Math.round(x * 31 + z * 7 + h * 3));
  const base = M.brick(opts.tone || '#384356'), clad = opts.clad ? M.wood(opts.clad) : base; const h0 = opts.clad ? Math.min(h, opts.base || 2.8) : h;
  add(ctx, box(w, h0, d), base, x, h0 / 2, z);
  if (h0 < h) add(ctx, box(w, h - h0, d), clad, x, h0 + (h - h0) / 2, z);
  add(ctx, box(w + 0.1, 0.5, d + 0.1), M.ashlar('#363f4e'), x, 0.25, z);
  if (h0 < h) add(ctx, box(w + 0.12, 0.14, d + 0.12), M.wood('#1e1a16'), x, h0, z);
  solid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, h);
  const span = fx ? w : d, len = fx ? d : w; const rh = opts.roofH || span * 0.55;
  roof(ctx, x, h, z, w + 0.5, d + 0.5, rh, !fx, opts.roofTone || '#222b38');
  // gable ends
  const gh = rh * span / (span + 0.5); const shp = new THREE.Shape(); shp.moveTo(-span / 2, 0); shp.lineTo(span / 2, 0); shp.lineTo(0, gh); shp.lineTo(-span / 2, 0);
  const gg = geo(`dk-gable${span},${gh}`, () => new THREE.ExtrudeGeometry(shp, { depth: 0.3, bevelEnabled: false }));
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(gg, clad); m.castShadow = true; m.receiveShadow = true; m.userData.static = true;
    if (!fx) { m.position.set(x + s * (w / 2) - (s > 0 ? 0.3 : 0), h, z); m.rotation.y = Math.PI / 2; } else m.position.set(x, h, z + s * (d / 2) - (s > 0 ? 0.3 : 0));
    ctx.group.add(m);
  }
  const F = (u, out = 0) => fx ? [x + w / 2 + out, z + u] : [x + u, z + d / 2 + out]; const ryF = fx ? Math.PI / 2 : 0;
  const decal = (pw, ph, m, u, y, out = 0.02) => { const [px, pz] = F(u, out); return add(ctx, plane(pw, ph), m, px, y, pz, { ry: ryF, cast: false }); };
  const fbox = (fw, fh, fo, m, u, y, out) => { const [px, pz] = F(u, out); return add(ctx, box(fx ? fo : fw, fh, fx ? fw : fo), m, px, y, pz); };
  const doors = opts.doors || [0]; const stone = M.ashlar('#4a5462'), beam = M.wood('#2e241a');
  doors.forEach((u, i) => {
    decal(38 / 16, 45 / 16, M.decal(loadDoor(i === (opts.ajar ?? -1))), u, 45 / 32 + 0.02);
    fbox(2.7, 0.24, 0.3, stone, u, 2.95, 0.1); fbox(2.7, 0.12, 0.5, stone, u, 0.06, 0.2);
    let topY = 0;
    for (let y = 4.1; y + 1.0 < h; y += 2.3) { decal(21 / 16, 28 / 16, M.decal(loftDoor()), u, y); fbox(1.5, 0.1, 0.24, stone, u, y - 0.92, 0.08); topY = y; }
    const lucam = opts.lucam === u;
    const hy = lucam ? h + 1.0 : Math.min(h - 0.2, topY + 1.1);
    if (lucam) { // a hooded hoist house standing out from the roof
      fbox(1.7, 1.9, 1.2, clad, u, h + 0.55, 0.3); const [px, pz] = F(u, 0.35);
      roof(ctx, px, h + 1.5, pz, fx ? 1.6 : 2.0, fx ? 2.0 : 1.6, 0.6, fx, opts.roofTone || '#1c232d');
      decal(21 / 16, 28 / 16 * 0.8, M.decal(loftDoor()), u, h + 0.4, 0.92);
    }
    if (topY || lucam) { // hoist beam, rope, hook and (sometimes) a load
      fbox(0.16, 0.16, 1.3, beam, u, hy, lucam ? 1.2 : 0.65); const [hx, hz] = F(u, lucam ? 1.75 : 1.2);
      const ly = opts.loadY ? opts.loadY[i] ?? 3.4 : 3.4; bar(ctx, 'dk-line', ropeM(), [hx, hy, hz], [hx, ly + 0.35, hz], 0.05);
      add(ctx, box(0.16, 0.22, 0.16), M.ironLit(), hx, ly + 0.25, hz);
      if (i % 2 === 0) add(ctx, box(0.7, 0.6, 0.7), M.wood('#4e3a26'), hx, ly - 0.2, hz, { ry: 0.3 });
    }
  });
  // windows between the doors, on every floor
  const lit = opts.lit ?? 0.3; const ws = [];
  for (let u = -len / 2 + 1.1; u < len / 2 - 0.8; u += 2.0) if (doors.every((du) => Math.abs(u - du) > 1.9)) ws.push(u);
  for (const u of ws) for (let y = 1.7; y + 0.8 < h; y += 2.3) {
    const isLit = r() < lit; decal(0.5, 0.62, M.decal(T.houseWindow(isLit), isLit ? 1.6 : 0), u, y);
    if (isLit && y < 2 && opts.windowLights !== false && r() < 0.6) { const [lx, lz] = F(u, 0.7); ctx.lights.push({ x: lx, y, z: lz, color: 0xffa040, intensity: 1.2, dist: 3.5 }); }
  }
  // the short end that faces us: windows and a gable vent
  if (opts.end !== false) {
    const E = (v, out = 0.02) => fx ? [x + v, z + d / 2 + out] : [x + w / 2 + out, z + v]; const ryE = fx ? 0 : Math.PI / 2;
    for (let v = -span / 2 + 1; v < span / 2 - 0.6; v += 1.8) for (let y = 1.7; y + 0.8 < h; y += 2.3) { const isLit = r() < lit * 0.6; const [px, pz] = E(v); add(ctx, plane(0.5, 0.62), M.decal(T.houseWindow(isLit), isLit ? 1.6 : 0), px, y, pz, { ry: ryE, cast: false }); }
    const [vx, vz] = E(0, 0.04); add(ctx, plane(0.5, 0.62), M.decal(T.houseWindow(false)), vx, h + gh * 0.4, vz, { ry: ryE, cast: false });
  }
  if (opts.sign !== undefined) {
    const u = opts.sign; const [bx, bz] = F(u, 0.45); add(ctx, box(fx ? 0.9 : 0.05, 0.05, fx ? 0.05 : 0.9), M.ironLit(), bx, 3.3, bz);
    const [qx, qz] = F(u, 0.7); add(ctx, plane(0.88, 0.56), M.decal(fishSign()), qx, 2.95, qz, { ry: fx ? 0 : Math.PI / 2, cast: false });
  }
}

// A flush timber loading deck before a warehouse (front toward +X): boards, a kerb beam on the open
// edge, rails along the stretches given in rails ([[z0, z1], ...]); walkable, the rails are solid.
export function loadingDeck(ctx, x0, z0, x1, z1, rails = []) {
  const w = x1 - x0, d = z1 - z0; const deck = texMat('deck2', deckTex('#4e463e'));
  add(ctx, mbox(w, 0.12, d), deck, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, { cast: false });
  add(ctx, box(0.18, 0.16, d), M.wood('#2a2219'), x1 - 0.09, 0.04, (z0 + z1) / 2);
  for (const [a, b] of rails) {
    const n = Math.max(1, Math.round((b - a) / 1.3)); const wood = M.wood('#3a2e22');
    for (let i = 0; i <= n; i++) put(ctx, '!dk-rpost', unitBox(), wood, x1 - 0.1, 0.55, a + (b - a) * i / n, 0.12, 1.1, 0.12);
    add(ctx, box(0.1, 0.1, b - a), wood, x1 - 0.1, 1.05, (a + b) / 2); add(ctx, box(0.08, 0.08, b - a), wood, x1 - 0.1, 0.6, (a + b) / 2);
    solid(ctx, x1 - 0.28, a, x1 + 0.08, b, 1.1); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]);
  }
}

// ---------------------------------------------------------------- dockside
// A timber dock crane: a stout post on a stone foot with raking braces, a jib reaching out over the
// water (dir), the fall rope with a hook block and its load: a crate, or a net of sacks.
export function crane(ctx, x, z, dir = '+x', opts = {}) {
  const H = opts.h || 6, R = opts.reach || 3.8; const [dx, dz] = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[dir];
  const wood = M.wood('#3a2c20'), dark = M.wood('#2a2018');
  add(ctx, box(1.3, 0.4, 1.3), M.ashlar('#3c4656'), x, 0.2, z);
  add(ctx, box(0.36, H, 0.36), wood, x, H / 2, z);
  add(ctx, box(0.5, 0.3, 0.5), dark, x, H + 0.1, z);
  for (const [bx, bz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) bar(ctx, '!dk-cbrace', dark, [x + bx * 0.6, 0.4, z + bz * 0.6], [x + bx * 0.12, 1.9, z + bz * 0.12], 0.16);
  const tip = [x + dx * R, H + 0.3, z + dz * R]; const root = [x + dx * 0.2, 1.9, z + dz * 0.2];
  bar(ctx, '!dk-jib', wood, root, tip, 0.24);
  bar(ctx, 'dk-line', ropeM(), [x, H + 0.1, z], tip, 0.06);
  // the winch drum by the post and the fall
  add(ctx, cyl(0.22, 0.22, 0.7, 8), dark, x - dz * 0.5, 0.9, z + dx * 0.5, { rx: dx ? Math.PI / 2 : 0, rz: dz ? Math.PI / 2 : 0 });
  const ly = opts.loadY ?? 2.0;
  bar(ctx, 'dk-line', ropeM(), tip, [tip[0], ly + 0.55, tip[2]], 0.05);
  add(ctx, box(0.2, 0.3, 0.2), M.ironLit(), tip[0], ly + 0.42, tip[2]);
  if (opts.load === 'net') { // a cargo net bulging with sacks
    for (let i = 0; i < 5; i++) add(ctx, box(0.42, 0.3, 0.34), M.flat(0x6e6450), tip[0] + Math.cos(i * 2.4) * 0.22, ly - 0.15 + (i % 2) * 0.18, tip[2] + Math.sin(i * 2.4) * 0.22, { ry: i });
    for (let k = -1; k <= 1; k += 2) bar(ctx, 'dk-line', ropeM(), [tip[0], ly + 0.3, tip[2]], [tip[0] + k * 0.4, ly - 0.35, tip[2] - k * 0.1], 0.04);
  } else if (opts.load !== false) add(ctx, box(0.8, 0.7, 0.8), M.wood('#4e3a26'), tip[0], ly - 0.1, tip[2], { ry: 0.4 });
  solid(ctx, x - 0.65, z - 0.65, x + 0.65, z + 0.65, H);
}

// A fish stall: counter with a slanted tray of the catch, posts, a canvas awning sloping toward the
// buyers, fish hung from the front beam, baskets behind. face: where the buyers stand.
export function fishStall(ctx, x, z, opts = {}) {
  const face = opts.face || '+x', w = opts.w || 2.4, d = opts.d || 1.3;
  const th = { '+x': 0, '-x': Math.PI, '+z': -Math.PI / 2, '-z': Math.PI / 2 }[face];
  const c = Math.round(Math.cos(th)), s = Math.round(Math.sin(th)); const r = T.rng(Math.round(x * 13 + z * 29));
  const P = (u, v) => [x + u * c + v * s, z - u * s + v * c];
  const B = (bu, bh, bv, m, u, y, v, o = {}) => { const [px, pz] = P(u, v); return add(ctx, box(bu, bh, bv), m, px, y, pz, { ry: th, ...o }); };
  const wood = M.wood('#4e3c2c'), dark = M.wood('#33271c'), top = M.wood('#6a5642');
  B(0.55, 0.85, w, wood, d / 2 - 0.275, 0.425, 0); B(0.7, 0.06, w + 0.1, top, d / 2 - 0.3, 0.9, 0, { rz: -0.18 });
  B(0.5, 0.7, w - 0.2, dark, -d / 2 + 0.25, 0.35, 0);
  for (const pu of [-1, 1]) for (const pv of [-1, 1]) { const ph = pu > 0 ? 2.05 : 2.45; B(0.08, ph, 0.08, dark, pu * d / 2, ph / 2, pv * (w / 2 - 0.04)); }
  B(0.06, 0.06, w + 0.1, dark, d / 2, 2.03, 0);
  // the awning: plain canvas in two worn tones
  const cloth = [M.flat(opts.cloth || '#3e4a48'), M.flat(opts.cloth2 || '#8a8474')];
  const nS = Math.max(4, Math.round(w / 0.4)), sw = w / nS, Lw = Math.hypot(d + 0.5, 0.45), tilt = -Math.atan2(0.45, d + 0.5);
  for (let i = 0; i < nS; i++) { const v = -w / 2 + (i + 0.5) * sw; const k = (i % 3 === 1) ? 1 : 0; B(Lw, 0.04, sw, cloth[k], 0.25, 2.25, v, { rz: tilt }); B(0.03, 0.12 + (i % 2) * 0.08, sw, cloth[k], d / 2 + 0.5, 1.95, v); }
  // the catch laid out on the tray, glinting
  for (let k = 0; k < Math.round(w * 6); k++) {
    const v = -w / 2 + 0.12 + r() * (w - 0.24), u = d / 2 - 0.5 + r() * 0.4; const [px, pz] = P(u, v);
    put(ctx, 'dk-fish', unitBox(), fishM(), px, 0.95 + (u - (d / 2 - 0.5)) * -0.18 + 0.03, pz, 0.3, 0.05, 0.09, th + (r() - 0.5) * 0.8 + Math.PI / 2, 0, FISH[(r() * FISH.length) | 0]);
  }
  // fish hung by the tail from the front beam
  for (let v = -w / 2 + 0.25; v < w / 2 - 0.1; v += 0.36) { const [px, pz] = P(d / 2 - 0.04, v); put(ctx, 'dk-fish', unitBox(), fishM(), px, 1.72, pz, 0.08, 0.36, 0.05, th, 0, FISH[(r() * FISH.length) | 0]); bar(ctx, 'dk-line', ropeM(), [px, 1.9, pz], [px, 2.03, pz], 0.02); }
  for (const v of [-w / 3, w / 4]) { const [px, pz] = P(-d / 2 + 0.25, v); basket(ctx, px, pz, 0.7, 0.3); }
  const xs = [], zs = []; for (const pu of [-1, 1]) for (const pv of [-1, 1]) { const [px, pz] = P(pu * (d / 2 + 0.05), pv * (w / 2 + 0.05)); xs.push(px); zs.push(pz); }
  solid(ctx, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), 1.0);
  if (opts.light) { // a lantern on the corner post
    const [lx, lz] = P(d / 2, w / 2 - 0.04); add(ctx, box(0.18, 0.24, 0.18), M.glow('#ffb860', 2.2), lx, 1.78, lz, { cast: false });
    ctx.lights.push({ x: lx, y: 1.8, z: lz, color: 0xffa850, intensity: opts.light, dist: 4.5, flicker: 0.1 });
  }
}

// A wicker basket (of fish, by default) on the ground or a shelf.
export function basket(ctx, x, z, y = 0, s = 0.35, fish = true) {
  put(ctx, '!dk-basket', geo('dk-basG', () => new THREE.CylinderGeometry(1, 0.8, 1, 8)), M.wood('#5a4630'), x, y + s * 0.4, z, s, s * 0.8, s);
  if (fish) { const r = T.rng(Math.round(x * 71 + z * 37)); for (let k = 0; k < 5; k++) put(ctx, 'dk-fish', unitBox(), fishM(), x + (r() - 0.5) * s, y + s * 0.82, z + (r() - 0.5) * s, 0.26, 0.05, 0.08, r() * 3, 0, FISH[(r() * FISH.length) | 0]); }
}

// A net drying rack: posts and a pole along 'x' or 'z', nets hung over it like a tent, cork floats.
export function netRack(ctx, x, z, len = 2.6, along = 'z') {
  const ax = along === 'x', wood = M.wood('#3a2e22'); const h = 2.0;
  const netM = mat('netM', () => cutout(new THREE.MeshLambertMaterial({ map: netTex(), alphaTest: 0.5, side: THREE.DoubleSide })));
  for (const e of [-1, 0, 1]) put(ctx, '!dk-npost', unitBox(), wood, x + (ax ? e * len / 2 : 0), h / 2, z + (ax ? 0 : e * len / 2), 0.1, h, 0.1);
  bar(ctx, '!dk-npole', wood, [x - (ax ? len / 2 + 0.2 : 0), h, z - (ax ? 0 : len / 2 + 0.2)], [x + (ax ? len / 2 + 0.2 : 0), h, z + (ax ? 0 : len / 2 + 0.2)], 0.08);
  const sl = Math.hypot(0.5, h - 0.3);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(plane(len, sl), netM); m.position.set(x + (ax ? 0 : s * 0.25), (h + 0.3) / 2, z + (ax ? s * 0.25 : 0));
    if (ax) m.rotation.x = -s * 0.26; else { m.rotation.y = Math.PI / 2; m.rotation.x = -s * 0.26; }
    m.rotation.order = 'YXZ'; m.userData.static = true; ctx.group.add(m);
    for (let t = -len / 2 + 0.15; t < len / 2; t += 0.32) put(ctx, 'dk-float', unitBox(), M.flat(0x8a6a44), x + (ax ? t : s * 0.06), h - 0.08, z + (ax ? s * 0.06 : t), 0.1, 0.07, 0.1);
  }
  if (ax) solid(ctx, x - len / 2 - 0.1, z - 0.55, x + len / 2 + 0.1, z + 0.55, h); else solid(ctx, x - 0.55, z - len / 2 - 0.1, x + 0.55, z + len / 2 + 0.1, h);
}

// An iron mooring bollard, a coil of rope at its foot now and then.
export function bollard(ctx, x, z, coil = false) {
  const iron = M.ironLit();
  put(ctx, '!dk-boll', geo('dk-bollG', () => new THREE.CylinderGeometry(0.13, 0.17, 0.55, 8)), iron, x, 0.275, z, 1, 1, 1);
  put(ctx, '!dk-bollcap', geo('dk-bollcapG', () => new THREE.CylinderGeometry(0.21, 0.15, 0.12, 8)), iron, x, 0.6, z, 1, 1, 1);
  if (coil) ropeCoil(ctx, x + 0.42, z + 0.3);
  solidCircle(ctx, x, z, 0.2, 0.7);
}
// A coil of rope lying flat.
export function ropeCoil(ctx, x, z, y = 0) {
  for (let k = 0; k < 3; k++) put(ctx, 'dk-coil', geo('dk-coilG', () => new THREE.TorusGeometry(0.22, 0.06, 4, 10)), M.flat(0x4a3e2c), x, y + 0.05 + k * 0.08, z, 1 - k * 0.12, 1 - k * 0.12, 1 - k * 0.12, k, 0, undefined, Math.PI / 2);
}
// Sacks of salt or meal piled up (n on the bottom row).
export function sacks(ctx, x, z, n = 3, along = 'x') {
  const ax = along === 'x'; const r = T.rng(Math.round(x * 17 + z * 11)); const tones = [0x6e6650, 0x7a725a, 0x5e5846, 0x8a8268];
  for (let row = 0; row < n; row++) for (let i = 0; i < n - row; i++) {
    const o = (i - (n - row - 1) / 2) * 0.5; put(ctx, '!dk-sack', unitBox(), M.flat(0xffffff), x + (ax ? o : 0), 0.18 + row * 0.3, z + (ax ? 0 : o), 0.5, 0.34, 0.4, (r() - 0.5) * 0.3, 0, tones[(r() * 4) | 0]);
  }
  const half = n * 0.25 + 0.05; if (ax) solid(ctx, x - half, z - 0.25, x + half, z + 0.25, n * 0.3); else solid(ctx, x - 0.25, z - half, x + 0.25, z + half, n * 0.3);
}
// Lobster pots (half barrels of slats) stacked by the water.
export function pots(ctx, x, z, n = 3) {
  const g = geo('dk-potG', () => new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8, 1, false, 0, Math.PI)); const m = M.wood('#4a3a28'); const r = T.rng(Math.round(x * 5 + z * 3));
  for (let i = 0; i < n; i++) { const tier = i >= 2 ? 1 : 0; put(ctx, '!dk-pot', g, m, x + (i % 2) * 0.62 - 0.31 + tier * 0.3, 0.02 + tier * 0.3, z + (r() - 0.5) * 0.1, 1, 1, 1, Math.PI / 2 + (r() - 0.5) * 0.3, Math.PI / 2, undefined, 0); }
  solid(ctx, x - 0.65, z - 0.35, x + 0.65, z + 0.35, 0.6);
}
// A ship's anchor lying on the quay, its chain trailing.
export function anchor(ctx, x, z, ry = 0) {
  const iron = M.flat(0x1e2228); const c = Math.cos(ry), s = Math.sin(ry); const L = (u, v, y = 0.1) => [x + u * c + v * s, y, z - u * s + v * c];
  bar(ctx, '!dk-anc', iron, L(-1.3, 0), L(1.1, 0), 0.18);
  bar(ctx, '!dk-stock', M.wood('#3a2e22'), L(-1.1, -1.0, 0.16), L(-1.1, 1.0, 0.16), 0.2);
  for (const k of [-1, 1]) { bar(ctx, '!dk-anc', iron, L(1.1, 0), L(1.55, k * 0.7), 0.16); bar(ctx, '!dk-anc', iron, L(1.55, k * 0.7), L(1.2, k * 1.1), 0.14); put(ctx, '!dk-anc', unitBox(), iron, ...L(1.25, k * 1.1, 0.06), 0.34, 0.08, 0.28, ry + k * 0.6); }
  put(ctx, 'dk-ring', geo('dk-ringG', () => new THREE.TorusGeometry(0.2, 0.05, 4, 10)), iron, ...L(-1.5, 0, 0.06), 1, 1, 1, ry, 0, undefined, Math.PI / 2);
  for (let k = 0; k < 7; k++) bar(ctx, 'dk-chain', M.ironLit(), L(-1.7 - k * 0.3, Math.sin(k) * 0.3, 0.05), L(-2.0 - k * 0.3, Math.sin(k + 1) * 0.3, 0.05), 0.07);
  solid(ctx, Math.min(L(-1.4, 0)[0], L(1.6, 0)[0]) - 0.5, Math.min(L(-1.4, 0)[2], L(1.6, 0)[2]) - 0.5, Math.max(L(-1.4, 0)[0], L(1.6, 0)[0]) + 0.5, Math.max(L(-1.4, 0)[2], L(1.6, 0)[2]) + 0.5, 0.4);
}
// A capstan: a drum with its bars, for warping ships into the dock.
export function capstan(ctx, x, z) {
  add(ctx, cyl(0.42, 0.5, 0.9, 10), M.wood('#3e3024'), x, 0.45, z); add(ctx, cyl(0.55, 0.55, 0.12, 10), M.wood('#4e3c2c'), x, 0.95, z);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; bar(ctx, '!dk-capbar', M.wood('#4a3a2a'), [x - Math.cos(a) * 1.1, 0.95, z - Math.sin(a) * 1.1], [x + Math.cos(a) * 1.1, 0.95, z + Math.sin(a) * 1.1], 0.09); }
  solidCircle(ctx, x, z, 0.6, 1.0);
}
// A lantern hung from a post on the pier: one small warm light.
export function pierLantern(ctx, x, z, side = '+x', light = 3) {
  const [dx, dz] = side === '+x' ? [1, 0] : side === '-x' ? [-1, 0] : side === '+z' ? [0, 1] : [0, -1];
  const wood = M.wood('#2e241a');
  add(ctx, box(0.16, 2.8, 0.16), wood, x, 1.4, z); add(ctx, box(dx ? 0.8 : 0.08, 0.08, dz ? 0.8 : 0.08), wood, x + dx * 0.36, 2.7, z + dz * 0.36);
  const lx = x + dx * 0.66, lz = z + dz * 0.66;
  bar(ctx, 'dk-line', ropeM(), [lx, 2.66, lz], [lx, 2.42, lz], 0.03);
  add(ctx, box(0.2, 0.28, 0.2), M.glow('#ffbe68', 2.4), lx, 2.24, lz, { cast: false }); add(ctx, cone(0.17, 0.14, 4), M.ironLit(), lx, 2.44, lz, { ry: Math.PI / 4 });
  ctx.lights.push({ x: lx, y: 2.2, z: lz, color: 0xffa850, intensity: light, dist: 6, flicker: 0.08, halo: true });
  solidCircle(ctx, x, z, 0.16, 2.8);
}

// Crane rails let into the quay: two iron strips between granite kerbs, along X (walkable).
export function quayRails(ctx, x0, x1, z, gauge = 1.6) {
  const len = x1 - x0, cx = (x0 + x1) / 2;
  for (const o of [-gauge / 2, gauge / 2]) {
    add(ctx, box(len, 0.02, 0.36), M.ashlar('#5e6876'), cx, 0.008, z + o, { cast: false });
    add(ctx, box(len, 0.03, 0.09), M.ironLit(), cx, 0.016, z + o, { cast: false });
  }
}
// What the tide leaves on a quay: dead fish, heaps of black weed, a lost net (walkable decals).
export function litter(ctx, x0, z0, x1, z1, n = 12, net = null) {
  const r = T.rng(Math.round(x0 * 13 + z0 * 7 + n)); const weed = M.flat(0x15201a);
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
    if (i % 3 === 0) put(ctx, 'dk-weed', unitCyl(), weed, x, 0.02, z, 0.3 + r() * 0.4, 0.04, 0.2 + r() * 0.3, r() * 3);
    else put(ctx, 'dk-fish', unitBox(), fishM(), x, 0.03, z, 0.3, 0.05, 0.09, r() * 6, 0, FISH[(r() * FISH.length) | 0]);
  }
  if (net) { const [x, z, w, d, ry] = net; const m = new THREE.Mesh(plane(w, d), mat('netM', () => cutout(new THREE.MeshLambertMaterial({ map: netTex(), alphaTest: 0.5, side: THREE.DoubleSide })))); m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, 0.03, z); m.userData.static = true; ctx.group.add(m); }
}

// ---------------------------------------------------------------- the lighthouse
// Out at the harbour mouth on its rock, half lost in the fog: a pale tower, a gallery, the lamp room
// burning, a halo on the mist, and two faint beams sweeping slowly round.
export function lighthouse(ctx, x, z, opts = {}) {
  const H = opts.h || 9, y0 = WATER_Y; const stone = M.flat(0x46525e), band = M.flat(0x26303a), rock = M.flat(0x1e2428);
  for (const [ox, oz, s] of [[0, 0, 2.4], [1.4, 0.8, 1.4], [-1.2, 1.1, 1.2], [0.6, -1.5, 1.5]]) add(ctx, box(s, 1.2, s), rock, x + ox, y0 + 0.3, z + oz, { ry: ox });
  const seg = 4; for (let i = 0; i < seg; i++) { const r0 = 1.0 - i * 0.12, r1 = 1.0 - (i + 1) * 0.12, hh = H / seg; add(ctx, cyl(r1, r0, hh, 10), i % 2 ? band : stone, x, y0 + 0.9 + hh * (i + 0.5), z); }
  const ty = y0 + 0.9 + H; add(ctx, cyl(0.85, 0.85, 0.12, 10), band, x, ty, z);
  add(ctx, cyl(0.42, 0.42, 0.8, 8), M.glow('#fff0c8', 3), x, ty + 0.46, z, { cast: false });
  add(ctx, cone(0.6, 0.6, 8), band, x, ty + 1.15, z);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#fff4d8', 32, 1.4), color: new THREE.Color(0.55, 0.55, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  halo.scale.set(4.2, 4.2, 1); halo.position.set(x, ty + 0.5, z); ctx.group.add(halo);
  // the beams: flat wedges, bright at the lamp and fading out
  const len = opts.beam || 22; const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, len, -0.6, -2.6, len, -0.6, 2.6, 0, 0, 0, -len, -0.6, 2.6, -len, -0.6, -2.6], 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0], 3));
  const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.11, 0.115, 0.1), vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const beam = new THREE.Mesh(g, bm); beam.position.set(x, ty + 0.46, z); ctx.group.add(beam);
  let t = 0; ctx.anims.push({ update(dt) { t += dt; beam.rotation.y = t * 0.45; halo.material.opacity = 0.75 + Math.abs(Math.cos(t * 0.45)) * 0.25; return false; } });
}
