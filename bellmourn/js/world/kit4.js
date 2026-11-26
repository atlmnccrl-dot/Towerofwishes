// The Act IV kit: what the Drowned Heaven is built from (PROPOSAL: names and descriptions are proposals for
// the author). When the Wheel broke, heaven fell into the sea of bell-bronze beneath it: drowned stone with
// weed and barnacles, bronze gone green, glass sand, black mirror-glass, beaten gold. Shared here: those
// world-mapped grounds, the broken slabs of heaven the wardens walk on (their undersides fading into the
// deep, the sea or the dark), the bronze sea itself, rising bubbles and falling glints, shafts of light from
// above, schools of small fish, and the locks of Act IV's fights (organ pipes, stained-glass panes and mirrors
// that rise out of the floor; a gate of gold blades).
// The same rules as kit.js, kit2.js and kit3.js: 16 texels per metre, solids for collision, lights in ctx.lights.
import * as THREE from '../../vendor/three.module.min.js';
import { add, box, cyl, geo, plane, solid } from './kit.js';
import { M, cutout } from '../engine/materials.js';
import * as T from '../engine/textures.js';
import { once, worldMat, pix, decal } from './kit2.js';
import { W3, fade, puffTex } from './kit3.js';
export { fade };

// ---------------------------------------------------------------- textures (16 texels per metre)
const texCache = new Map();
function wtex(key, W, H, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g, W, H);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.worldSize = [W / 16, H / 16]; texCache.set(key, t); return t;
}
const hexRGB = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const shade = (h, f) => { const [r, g, b] = hexRGB(h); const k = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${k(r)},${k(g)},${k(b)})`; };
const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
// a smooth tiling value noise (period W x H, cells of `cell` texels)
function noise(seed, W, H, cell) {
  const R = T.rng(seed); const nx = Math.max(1, Math.round(W / cell)), ny = Math.max(1, Math.round(H / cell)); const v = []; for (let i = 0; i < nx * ny; i++) v.push(R());
  const at = (i, j) => v[((j % ny) + ny) % ny * nx + ((i % nx) + nx) % nx]; const sm = (k) => k * k * (3 - 2 * k);
  return (x, y) => { const fx = x / W * nx, fy = y / H * ny; const i = Math.floor(fx), j = Math.floor(fy); const u = sm(fx - i), w = sm(fy - j); const a = at(i, j) + (at(i + 1, j) - at(i, j)) * u, b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * u; return a + (b - a) * w; };
}
// Drowned flagstones: 1 m slabs of pale stone gone grey-green under the water, dark joints, patches of weed,
// white specks of barnacles.
export const drownTex = (tone = '#5a6c68') => wtex('k4-drown' + tone, 64, 64, (g, W, H) => {
  const R = T.rng(4101); const n1 = noise(4102, W, H, 16), n2 = noise(4103, W, H, 8);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = x >> 4, sy = y >> 4; const lx = x & 15, ly = y & 15; let k = 0.92 + ((sx * 7 + sy * 3) % 4) * 0.035 + n2(x, y) * 0.1;
    if (lx === 0 || ly === 0) k = 0.5; else if (lx === 1 || ly === 1) k = 1.1;
    k = Math.round(k * 14) / 14; let c = shade(tone, k);
    if (n1(x, y) > 0.62 && lx > 0 && ly > 0) c = shade('#3e5a3a', 0.8 + n2(x, y) * 0.4);
    px(g, x, y, c);
  }
  for (let i = 0; i < 70; i++) { const x = (R() * W) | 0, y = (R() * H) | 0; if ((x & 15) && (y & 15)) px(g, x, y, R() < 0.5 ? '#c8d0c4' : '#9aa89c'); }
});
// Verdigris: bronze crusted green, the copper showing through where it is worn.
export const verdTex = (tone = '#3e7a68') => wtex('k4-verd' + tone, 32, 32, (g, W, H) => {
  const n1 = noise(4111, W, H, 8), n2 = noise(4112, W, H, 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = n1(x, y) * 0.7 + n2(x, y) * 0.3; px(g, x, y, v > 0.66 ? shade('#8a5a2e', 0.8 + v * 0.3) : shade(tone, Math.round((0.75 + v * 0.45) * 10) / 10)); }
});
// Glass sand: pale grey-violet sand full of chips of coloured glass.
export const glassSandTex = (tone = '#b8b0c4') => wtex('k4-gsand' + tone, 48, 48, (g, W, H) => {
  const R = T.rng(4121); const n1 = noise(4122, W, H, 12);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) px(g, x, y, shade(tone, Math.round((0.84 + n1(x, y) * 0.2 + (R() - 0.5) * 0.06) * 16) / 16));
  const C = ['#e85a6a', '#5ac8e8', '#e8c85a', '#8ae86a', '#b46ae8', '#ffffff'];
  for (let i = 0; i < 46; i++) { const x = (R() * W) | 0, y = (R() * H) | 0; const c = C[(R() * C.length) | 0]; px(g, x, y, c); if (R() < 0.4) px(g, (x + 1) % W, y, shade('#ffffff', 0.9)); }
});
// Leaded glass paving: square panes of dim coloured glass set in lead (the orchard's paths).
export const leadedTex = () => wtex('k4-leaded', 32, 32, (g, W, H) => {
  const R = T.rng(4131); const C = ['#5a3a52', '#3a4a62', '#5a5236', '#3a5a4a', '#62403a'];
  for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) { const c = C[(R() * C.length) | 0]; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) px(g, bx * 8 + x, by * 8 + y, (x === 0 || y === 0) ? '#1c1a22' : shade(c, (x === 1 || y === 1) ? 1.35 : 1 + ((x + y) % 5 === 0 ? 0.15 : 0))); }
});
// Black mirror-glass in 2 m slabs with hairlines of silver; a few stars of light caught in it.
export const mirrorTex = (tone = '#16141e') => wtex('k4-mirror' + tone, 64, 64, (g, W, H) => {
  const R = T.rng(4141); const n1 = noise(4142, W, H, 32);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let k = 0.9 + n1(x, y) * 0.25; if ((x & 31) === 0 || (y & 31) === 0) k = 2.6; px(g, x, y, shade(tone, Math.round(k * 10) / 10)); }
  for (let i = 0; i < 9; i++) { const x = 1 + ((R() * (W - 2)) | 0), y = 1 + ((R() * (H - 2)) | 0); px(g, x, y, '#b8b0d8'); }
});
// Hammered gold, for the halo's ring and its court.
export const ringTex = (tone = '#b48a3a') => wtex('k4-ring' + tone, 32, 32, (g, W, H) => {
  const n1 = noise(4151, W, H, 4), n2 = noise(4152, W, H, 16);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let k = 0.86 + n1(x, y) * 0.22 + n2(x, y) * 0.12; if ((x & 15) === 0) k = 0.6; px(g, x, y, shade(tone, Math.round(k * 12) / 12)); }
});

// ---------------------------------------------------------------- materials
const lam = (key, tex, o = {}) => once('k4' + key, () => worldMat(new THREE.MeshLambertMaterial(o), tex));
const pho = (key, tex, o = {}) => once('k4' + key, () => worldMat(new THREE.MeshPhongMaterial(o), tex));
export const W4 = {
  drown: (tone) => pho('drown' + tone, drownTex(tone), { shininess: 26, specular: 0x3a5a58 }),
  verd: (tone) => pho('verd' + tone, verdTex(tone), { shininess: 30, specular: 0x6aa090 }),
  gsand: (tone) => lam('gsand' + tone, glassSandTex(tone)),
  leaded: () => pho('leaded', leadedTex(), { shininess: 60, specular: 0x8a8098, emissive: 0x0c0810 }),
  mirror: (tone) => pho('mirror' + tone, mirrorTex(tone), { shininess: 110, specular: 0xb8b0e0 }),
  gold: (tone) => pho('gold' + tone, ringTex(tone), { shininess: 70, specular: 0xffe0a0, emissive: 0x1e1404 }),
  marble: (tone) => W3.marble(tone),
  rock: (tex, tone) => W3.rock(tex, tone),
};
// Plain lit materials for things that move or turn (not world-mapped).
export const verdM = () => once('k4-verdM', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3e7a68, specular: 0x8ac0a8, shininess: 28 })));
export const bronzeM = () => once('k4-bronzeM', () => cutout(new THREE.MeshPhongMaterial({ color: 0x8a5a26, specular: 0xffc070, shininess: 50, emissive: 0x1a0c02 })));
export const goldM4 = () => once('k4-goldM', () => cutout(new THREE.MeshPhongMaterial({ color: 0xd8a438, specular: 0xfff0b0, shininess: 80, emissive: 0x3a2808 })));
export const glowM = (col, k = 1) => once('k4-glow' + col + ':' + k, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), fog: false }));
export const glassM = (col, op = 0.75, em = 0.6) => once('k4-glass' + col + op + em, () => cutout(new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: op, emissive: new THREE.Color(col).multiplyScalar(em), side: THREE.DoubleSide, depthWrite: false })));

// ---------------------------------------------------------------- the slabs of heaven
// A broken slab of the fallen heaven to walk on: the top in `mat` with a kerb, under it stepped masonry that
// breaks into a ragged cone of rock fading into `deep` (the colour of the water, the sea or the dark below).
// o.kerb: a kerb material (none: false); o.depth: how far the underside reaches; o.chunks: loose pieces under it.
export function slab(ctx, x0, z0, x1, z1, mat, deep, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const R = T.rng(Math.round(x0 * 13 + z0 * 7 + 41));
  add(ctx, box(w, 0.4, d), mat, cx, -0.2, cz, { cast: false });
  if (o.kerb !== false) { const k = o.kerb || mat; for (const s of [0, 1]) { add(ctx, box(w + 0.1, 0.1, 0.22), k, cx, 0.0, s ? z1 - 0.11 : z0 + 0.11, { cast: false }); add(ctx, box(0.22, 0.1, d), k, s ? x1 - 0.11 : x0 + 0.11, 0.0, cz, { cast: false }); } }
  const under = fade(o.under || mat, deep, o.range ?? 7);
  let y = -0.4, ww = w, dd = d;
  for (let k = 0; k < 2; k++) { const hh = 0.9 + k * 0.4; ww *= 0.9; dd *= 0.9; add(ctx, box(ww, hh, dd), under, cx + (R() - 0.5) * 0.3, y - hh / 2, cz + (R() - 0.5) * 0.3, { cast: false }); y -= hh; }
  if (o.depth === 0) return;
  const rock = fade(W3.rock('marble', o.rockTone || '#6a7470'), deep, (o.range ?? 7) + 2);
  const m = add(ctx, geo('k4-cone', () => new THREE.ConeGeometry(0.5, 1, 6)), rock, cx, y - (o.depth ?? 5) / 2, cz, { rx: Math.PI, ry: R() * 3, cast: false }); m.scale.set(ww * 1.05, o.depth ?? 5, dd * 1.05);
  for (let i = 0; i < (o.chunks ?? 4); i++) { const a = R() * 6.3, r = Math.min(ww, dd) * 0.42; const m2 = add(ctx, geo('k4-cone', () => new THREE.ConeGeometry(0.5, 1, 6)), rock, cx + Math.cos(a) * r, y - 1 - R() * 1.5, cz + Math.sin(a) * r, { rx: Math.PI, ry: R() * 3, cast: false }); const s = 0.8 + R() * 1.3; m2.scale.set(s, s * 2.4, s); }
}
// A narrow way between slabs (a fallen column, a glass bridge, a mirror walk, a span of the ring): the deck in
// `mat` with a beam under it fading into `deep`; o.rail: a low rail material along both long sides.
export function span(ctx, x0, z0, x1, z1, mat, deep, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const alongZ = d >= w;
  add(ctx, box(w, 0.3, d), mat, cx, -0.15, cz, { cast: false });
  add(ctx, box(alongZ ? w * 0.6 : w, 1.6, alongZ ? d : d * 0.6), fade(o.under || mat, deep, 4), cx, -1.1, cz, { cast: false });
  if (o.rail) {
    const len = alongZ ? d : w; const n = Math.max(2, Math.round(len / 1.4));
    for (const s of [-1, 1]) {
      const ex = alongZ ? cx + s * (w / 2 - 0.08) : cx, ez = alongZ ? cz : cz + s * (d / 2 - 0.08);
      add(ctx, box(alongZ ? 0.08 : w, 0.08, alongZ ? d : 0.08), o.rail, ex, 0.62, ez);
      for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; add(ctx, box(0.09, 0.62, 0.09), o.rail, alongZ ? ex : cx + t, 0.31, alongZ ? cz + t : ez); }
    }
  }
}
// Everything off the walks is a drop (solid, low): kit3's void fill, re-exported for the Act IV levels.
export { voidFill } from './props/belfry.js';

// ---------------------------------------------------------------- the deep below
// A great plane far below the walks in the colour of the deep, with drifting murk over it; o.y its depth.
export function deepFloor(ctx, bounds, color, o = {}) {
  const [x0, z0, x1, z1] = bounds; const m = 40; const w = x1 - x0 + m * 2, d = z1 - z0 + m * 2;
  const pl = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ color, fog: false })); pl.rotation.x = -Math.PI / 2; pl.position.set((x0 + x1) / 2, o.y ?? -14, (z0 + z1) / 2); pl.renderOrder = -50; ctx.group.add(pl);
  return pl;
}

// ---------------------------------------------------------------- the bronze sea
// The sea of molten bell-bronze heaven fell into: a slow heavy surface of dark bronze with bright ridges that
// crawl across it, a second layer of glints moving the other way; it gives off a warm glow (o.glow) and
// can change colour (handle.tint(color, k)). Not walkable: the void fill covers it.
const seaTex = () => pix('k4-sea', 64, 64, (g, W, H) => {
  const n1 = noise(4161, W, H, 16), n2 = noise(4162, W, H, 8);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = Math.abs(Math.sin((n1(x, y) * 3 + n2(x, y)) * 4.2)); const c = v < 0.08 ? '#f8d088' : v < 0.2 ? '#c8883a' : v < 0.45 ? '#8a5424' : v < 0.75 ? '#5e3616' : '#46260e';
    px(g, x, y, c);
  }
}, true);
const glintTex = () => pix('k4-seaglint', 32, 32, (g, W, H) => { const R = T.rng(4163); for (let i = 0; i < 26; i++) { const x = (R() * W) | 0, y = (R() * H) | 0; g.fillStyle = R() < 0.3 ? '#fff4d0' : '#e8a850'; g.fillRect(x, y, R() < 0.3 ? 2 : 1, 1); } }, true);
export function bronzeSea(ctx, x0, z0, x1, z1, y = -1.6, o = {}) {
  const w = x1 - x0, d = z1 - z0; const t1 = seaTex().clone(); t1.needsUpdate = true; t1.repeat.set(w / 6, d / 6);
  const mat = new THREE.MeshPhongMaterial({ map: t1, color: new THREE.Color(o.color ?? 0xffffff), specular: 0xffd890, shininess: 60, emissive: new THREE.Color(o.emissive ?? 0x2a1404) });
  const sea = new THREE.Mesh(plane(w, d), mat); sea.rotation.x = -Math.PI / 2; sea.position.set(x0 + w / 2, y, z0 + d / 2); sea.receiveShadow = true; ctx.group.add(sea);
  const t2 = glintTex().clone(); t2.needsUpdate = true; t2.repeat.set(w / 4, d / 4);
  const gl = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: t2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(1.2, 0.9, 0.5) })); gl.rotation.x = -Math.PI / 2; gl.position.set(sea.position.x, y + 0.02, sea.position.z); gl.renderOrder = 1; ctx.group.add(gl);
  let t = 0; const sp = o.speed ?? 1; const base = new THREE.Color(o.color ?? 0xffffff), cur = base.clone(); const emi = new THREE.Color(o.emissive ?? 0x2a1404), emiCur = emi.clone();
  const handle = { sea, glints: gl, target: null, k: 0, rise: 0, y0: y,
    tint(col, k = 1, em) { this.target = { c: new THREE.Color(col), k, e: new THREE.Color(em ?? 0x000000) }; },
    update(dt) {
      t += dt * sp; t1.offset.set(Math.round(t * 0.02 * 64) / 64, Math.round(t * 0.011 * 64) / 64); t2.offset.set(-Math.round(t * 0.035 * 32) / 32, Math.round(t * 0.02 * 32) / 32);
      gl.material.opacity = 0.6 + 0.4 * Math.sin(t * 1.3);
      if (this.target) { const q = Math.min(1, dt * 0.8); cur.lerp(this.target.c.clone().lerp(base, 1 - this.target.k), q); emiCur.lerp(this.target.e, q); mat.color.copy(cur); mat.emissive.copy(emiCur); }
      sea.position.y = this.y0 + this.rise + Math.sin(t * 0.5) * 0.04; gl.position.y = sea.position.y + 0.02;
      return false;
    } };
  ctx.anims.push(handle);
  if (o.glow) { const n = Math.max(1, Math.round(w * d / 900)); const R = T.rng(4164); for (let i = 0; i < n; i++) ctx.lights.push({ x: x0 + R() * w, y: y + 2, z: z0 + R() * d, color: 0xffa040, intensity: o.glow, dist: 14, flicker: 0.05 }); }
  return handle;
}

// ---------------------------------------------------------------- particles
// A field of pixel motes inside rects: o.vy (m/s, + rises: bubbles; - falls: glints, ash), o.sway, o.color,
// o.size (1 or 2 px), o.h (height of the column), o.add (additive glow), o.blink.
export function motes(ctx, rects, n, o = {}) {
  const pos = new Float32Array(n * 3); const data = []; const R = T.rng(o.seed ?? 4171); const H = o.h ?? 8, y0 = o.y0 ?? -1;
  for (let i = 0; i < n; i++) { const r = rects[i % rects.length]; data.push({ r, x: r[0] + R() * (r[2] - r[0]), y: y0 + R() * H, z: r[1] + R() * (r[3] - r[1]), s: 0.6 + R() * 0.8, ph: R() * 9 }); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const col = new THREE.Color(o.color ?? 0xbfe8e0); if (o.k) col.multiplyScalar(o.k);
  const m = new THREE.PointsMaterial({ color: col, size: o.size ?? 1, sizeAttenuation: false, transparent: true, opacity: o.opacity ?? 0.8, depthWrite: false, fog: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; ctx.group.add(pts);
  let t = 0; const vy = o.vy ?? 0.6, sway = o.sway ?? 0.25;
  ctx.anims.push({ update(dt) {
    t += dt;
    for (let i = 0; i < n; i++) {
      const p = data[i]; p.y += vy * p.s * dt;
      if (p.y > y0 + H || p.y < y0) { p.y = vy > 0 ? y0 : y0 + H; p.x = p.r[0] + Math.random() * (p.r[2] - p.r[0]); p.z = p.r[1] + Math.random() * (p.r[3] - p.r[1]); }
      pos[i * 3] = p.x + Math.sin(t * 1.3 + p.ph) * sway; pos[i * 3 + 1] = (o.blink && Math.sin(t * 2 + p.ph * 3) < 0.2) ? -100 : p.y; pos[i * 3 + 2] = p.z + Math.cos(t * 1.1 + p.ph) * sway * 0.6;
    }
    g.attributes.position.needsUpdate = true; return false;
  } });
  return pts;
}
// A shaft of light falling from far above onto (x, z): an open cone, additive, brightest near the floor, with a
// soft pool where it lands. Breathes a little (o.breath). Cheap: no light of its own unless o.light.
export function shaft(ctx, x, z, r = 2, o = {}) {
  const h = o.h ?? 16, lean = o.lean ?? [2.5, -3.5]; const len = Math.hypot(lean[0], h, lean[1]);
  const g = new THREE.CylinderGeometry(r * 0.45, r, len, 14, 4, true); const cols = []; const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) { const k = 0.5 - pa.getY(i) / len; const a = Math.pow(Math.max(0, k), 1.6) * 1.2; cols.push(a, a, a); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const col = new THREE.Color(o.color ?? 0x9ae0d8).multiplyScalar(o.k ?? 0.16);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  m.position.set(x + lean[0] / 2, h / 2, z + lean[1] / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(lean[0], h, lean[1]).normalize()); m.renderOrder = 6; ctx.group.add(m);
  const pool = decal(ctx, x, z, r * 2.4, T.glow('#ffffff', 32, 1.4), o.color ?? 0x9ae0d8, { k: (o.k ?? 0.16) * 2.6 });
  if (o.light) ctx.lights.push({ x, y: 2.5, z, color: o.color ?? 0x9ae0d8, intensity: o.light, dist: r * 3.5, flicker: 0.04 });
  let t = Math.random() * 9; const br = o.breath ?? 0.25;
  ctx.anims.push({ update(dt) { t += dt; const k = 1 - br + br * Math.sin(t * 0.7); m.material.color.copy(col).multiplyScalar(k); pool.material.opacity = k; return false; } });
  return m;
}
// A school of small fish (dark slivers with a pale belly) circling round (x, y, z) in a wobbling ring.
const fishTex = () => pix('k4-fish', 8, 4, (g) => { const F = ['..####..', '.######.', '########', '.##..##.']; F.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') { g.fillStyle = y === 2 ? '#8aa8a0' : (x === 1 && y === 1 ? '#e0f0e8' : '#2a4a48'); g.fillRect(x, y, 1, 1); } })); });
export function school(ctx, x, y, z, n = 12, R0 = 3, o = {}) {
  const mat = new THREE.SpriteMaterial({ map: fishTex(), color: o.color ?? 0xffffff, alphaTest: 0.5, fog: true }); const list = []; const R = T.rng(Math.round(x * 7 + z * 3));
  for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(mat); sp.scale.set(0.5, 0.25, 1); ctx.group.add(sp); list.push({ sp, a: R() * 6.3, r: R0 * (0.7 + R() * 0.5), dy: (R() - 0.5) * 1.2, v: (o.dir ?? 1) * (0.35 + R() * 0.15) }); }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const f of list) { f.a += f.v * dt; f.sp.position.set(x + Math.cos(f.a) * f.r, y + f.dy + Math.sin(t + f.a * 2) * 0.2, z + Math.sin(f.a) * f.r * 0.7); f.sp.material.rotation = 0; f.sp.scale.x = Math.cos(f.a) * f.v > 0 ? -0.5 : 0.5; } return false; } });
}
// Slow murk drifting low over the deep (soft dithered puffs that rise and thin).
export function murk(ctx, x, y, z, w, d, n = 6, color = 0x5a8a88, op = 0.12) {
  const tex = puffTex(); const R = T.rng(Math.round(x * 5 + z * 11)); const list = [];
  for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: op, depthWrite: false, fog: false })); const s = 4 + R() * 5; sp.scale.set(s, s * 0.6, 1); sp.renderOrder = 3; ctx.group.add(sp); list.push({ sp, x: x + (R() - 0.5) * w, z: z + (R() - 0.5) * d, ph: R() * 9 }); }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const p of list) p.sp.position.set(Math.round((p.x + Math.sin(t * 0.1 + p.ph) * 2) * 16) / 16, y + Math.sin(t * 0.2 + p.ph) * 0.4, p.z); return false; } });
}

// ---------------------------------------------------------------- the locks of Act IV
// A barrier across a way (the same handle as kit3.barrier3: set(open), update(dt), solid, x, z):
//  'pipes'  green-bronze organ pipes rise out of the drowned floor, bubbles streaming off them;
//  'glass'  panes of stained glass slide up out of a lead sill, glowing in the orchard's colours;
//  'mirror' tall black mirrors rise, a silver line of light along each edge.
// axis 'x': the barrier runs along X. The solid is 0.6 m thick.
export function barrier4(ctx, x, z, width = 3.6, axis = 'x', style = 'pipes', o = {}) {
  const alongX = axis === 'x'; const R = T.rng(Math.round(x * 71 + z * 37 + width * 5)); const h = o.h ?? 2.8;
  const grp = new THREE.Group(); grp.position.set(x, 0, z); if (!alongX) grp.rotation.y = Math.PI / 2; ctx.group.add(grp);
  const P = (g, m, lx, ly, lz, cast = true) => { const me = new THREE.Mesh(g, m); me.position.set(lx, ly, lz); me.castShadow = cast; me.receiveShadow = true; grp.add(me); return me; };
  const glows = [];
  if (style === 'pipes') {
    const n = Math.max(4, Math.round(width / 0.36)); const vm = verdM(), bm = bronzeM();
    for (let i = 0; i < n; i++) { const u = -width / 2 + (i + 0.5) * width / n; const hh = h * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7))) + 0.3; const r = 0.13 + (i % 3 === 1 ? 0.04 : 0);
      P(cyl(r, r, hh, 8), vm, u, hh / 2, 0); P(cyl(r + 0.03, r + 0.03, 0.08, 8), bm, u, hh - 0.04, 0);
      const mouth = P(box(r * 1.3, 0.08, 0.05), glowM(0x9ae8d8, 1.4), u, hh * 0.3, r, false); glows.push(mouth); }
    add(ctx, box(width + 0.4, 0.18, 0.8), W4.verd(), x, 0.09, z, { ry: alongX ? 0 : Math.PI / 2, cast: false });
  } else if (style === 'glass') {
    const n = Math.max(3, Math.round(width / 0.6)); const C = [0xe85a6a, 0x5ac8e8, 0xe8c85a, 0x8ae86a, 0xb46ae8];
    for (let i = 0; i < n; i++) { const u = -width / 2 + (i + 0.5) * width / n; const c = C[(i + Math.round(x)) % C.length]; const hh = h * (0.8 + R() * 0.25);
      P(box(width / n - 0.06, hh, 0.06), glassM(c, 0.7, 0.7), u, hh / 2, 0, false);
      P(box(0.06, hh + 0.1, 0.1), M.flat(0x1c1a22), u - width / n / 2 + 0.03, hh / 2, 0); P(box(width / n, 0.06, 0.1), M.flat(0x1c1a22), u, hh * 0.5, 0); P(box(width / n, 0.08, 0.12), M.flat(0x1c1a22), u, hh, 0); }
    add(ctx, box(width + 0.4, 0.16, 0.7), M.flat(0x24202a), x, 0.08, z, { ry: alongX ? 0 : Math.PI / 2, cast: false });
  } else if (style === 'mirror') {
    const n = Math.max(2, Math.round(width / 1.2)); const mm = once('k4-mirrorM', () => cutout(new THREE.MeshPhongMaterial({ color: 0x0c0a12, specular: 0xe0d8ff, shininess: 140, emissive: 0x06040c })));
    for (let i = 0; i < n; i++) { const u = -width / 2 + (i + 0.5) * width / n; const hh = h + 0.4;
      P(box(width / n - 0.1, hh, 0.08), mm, u, hh / 2, 0); P(box(0.05, hh, 0.1), glowM(0xc8c0ff, 1.6), u - width / n / 2 + 0.07, hh / 2, 0, false); P(box(0.05, hh, 0.1), glowM(0xc8c0ff, 1.6), u + width / n / 2 - 0.07, hh / 2, 0, false); P(box(width / n - 0.1, 0.12, 0.12), M.flat(0x2a2638), u, hh, 0); }
    add(ctx, box(width + 0.4, 0.14, 0.7), M.flat(0x1a1824), x, 0.07, z, { ry: alongX ? 0 : Math.PI / 2, cast: false });
  }
  const travel = h + 0.8; const sh = { x0: alongX ? x - width / 2 : x - 0.3, z0: alongX ? z - 0.3 : z - width / 2, x1: alongX ? x + width / 2 : x + 0.3, z1: alongX ? z + 0.3 : z + width / 2, h: 3, gate: true, open: false };
  ctx.solids.push(sh);
  const apply = (k) => { grp.position.y = -travel * k; grp.visible = k < 0.995; };
  const handle = { t: o.open ? 1 : 0, target: o.open ? 1 : 0, solid: sh, x, z, style,
    set(open) { this.target = open ? 1 : 0; sh.open = !!open; },
    update(dt) {
      if (this.t === this.target) return false;
      this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * 1.4);
      const k = this.t * this.t * (3 - 2 * this.t); apply(k); grp.position.x = x + (k > 0.02 && k < 0.98 ? (Math.random() - 0.5) * 0.03 : 0); return true;
    } };
  sh.open = !!o.open; apply(handle.t); ctx.anims.push(handle);
  if (glows.length) { let t = R() * 9; ctx.anims.push({ update(dt) { t += dt; for (const [i, g] of glows.entries()) g.visible = Math.sin(t * 2 + i) > -0.3; return false; } }); }
  return handle;
}

// ---------------------------------------------------------------- the boss in the level
// The fight's boss as the level sees it (to change the arena with its stages): the game's boss entity when it
// fights in this level, else null. Browser only.
export function bossOf(type) {
  const G = typeof window !== 'undefined' && window.BM && window.BM.game; const b = G && G.boss;
  return b && b.type === type && !b.dead ? b : null;
}
export function gameOf() { return typeof window !== 'undefined' && window.BM && window.BM.game; }
