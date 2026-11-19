// The Act II kit: what the lands beyond the city walls are built from. World-mapped materials for the
// new grounds (snow, ice, sand, sandstone, catacomb stone, basalt, obsidian), the locks of Act II's
// fights (barriers that rise from the ground or drop from the dark instead of iron gates), natural
// shapes (boulders, mounds, pines) and a few lights and glows the four regions share.
// The same rules as kit.js: 16 texels per metre, solids for collision, lights in ctx.lights.
import * as THREE from '../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane, torus } from './kit.js';
import { M, cutout } from '../engine/materials.js';
import * as T from '../engine/textures.js';

// ---------------------------------------------------------------- materials
// A set material with a world-mapped texture (as materials.js does for its own): the texture is projected
// along the face's dominant axis on the 16-texel grid, and the see-through cut applies.
const matCache = new Map();
export const once = (key, fn) => { if (!matCache.has(key)) matCache.set(key, fn()); return matCache.get(key); };
export function worldMat(mat, tex) {
  cutout(mat); mat.map = tex; const ws = tex.userData.worldSize || [2, 2]; const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    base(sh, r); sh.uniforms.worldSize = { value: new THREE.Vector2(ws[0], ws[1]) };
    sh.fragmentShader = sh.fragmentShader.replace('uniform float cutR;', 'uniform float cutR; uniform vec2 worldSize;').replace('#include <map_fragment>', `
        vec3 an = abs(vWNrm); vec2 wuv;
        if (an.y >= an.x && an.y >= an.z) wuv = vec2(vWPos.x, -vWPos.z);
        else if (an.x >= an.z) wuv = vec2(-vWPos.z * sign(vWNrm.x), vWPos.y);
        else wuv = vec2(vWPos.x * sign(vWNrm.z), vWPos.y);
        wuv = floor(wuv * 16.0 + 0.001) / 16.0 + 1.0/32.0;
        diffuseColor *= texture2D(map, wuv / worldSize);`);
  };
  mat.customProgramCacheKey = () => 'bm2w' + ws.join('x') + (mat.flatShading ? 'f' : '');
  return mat;
}
const lam = (key, tex, o = {}) => once(key, () => worldMat(new THREE.MeshLambertMaterial(o), tex));
const pho = (key, tex, o = {}) => once(key, () => worldMat(new THREE.MeshPhongMaterial(o), tex));
export const W2 = {
  snow: (tone = '#c4cede') => lam('snow' + tone, T.snow(31, tone)),
  ice: (tone = '#6e98b8') => pho('ice' + tone, T.ice(32, tone), { shininess: 70, specular: 0x9ab8d8 }),
  sand: (tone = '#b88a56') => lam('sand' + tone, T.sand(33, tone)),
  sandstone: (tone = '#a8784c') => lam('sst' + tone, T.sandstone(34, tone)),
  cat: (tone = '#5a5048') => lam('cat' + tone, T.catstone(35, tone)),
  tomb: (tone = '#575049') => pho('tomb' + tone, T.tombfloor(36, tone), { shininess: 14, specular: 0x302820 }),
  basalt: (tone = '#2e2628') => pho('bas' + tone, T.basalt(37, tone), { shininess: 16, specular: 0x402020 }),
  obsidian: (tone = '#1c1620') => pho('obs' + tone, T.obsidian(38, tone), { shininess: 90, specular: 0x8a6aa0 }),
  hellbrick: (tone = '#3a2220') => lam('hbr' + tone, T.hellbrick(39, tone)),
  crag: (tone = '#4c5462') => once('crag' + tone, () => worldMat(new THREE.MeshLambertMaterial({ flatShading: true }), T.crag(42, tone))),
  // any of the grounds, flat shaded, for faceted rocks and mounds
  rock: (tex, tone) => once('rock' + tex + tone, () => worldMat(new THREE.MeshLambertMaterial({ flatShading: true }), T[tex](43, tone))),
};

// ---------------------------------------------------------------- small helpers
export const q16 = (v) => Math.round(v * 16) / 16;
const texCache = new Map();
export function pix(key, w, h, draw, repeat = false) {
  if (!texCache.has(key)) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
// a part at a local offset of a prop turned by ry around (x, z); local +Z is its front
export function part(ctx, g, m, x, z, ry, lx, ly, lz, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return add(ctx, g, m, x + lx * c + lz * s, ly, z - lx * s + lz * c, { ...o, ry: ry + (o.ry || 0) || undefined });
}
export function solidRot(ctx, x, z, ry, hw, hd, h) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  solid(ctx, x - (c * hw + s * hd), z - (s * hw + c * hd), x + (c * hw + s * hd), z + (s * hw + c * hd), h);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _d = new THREE.Vector3();
const Y1 = new THREE.Vector3(0, 1, 0);
const unitBox = () => geo('k2-ubox', () => new THREE.BoxGeometry(1, 1, 1));
// an instanced box of its own size and turn
export function put(ctx, key, m, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz); inst(ctx, key, unitBox(), m, _m.compose(_p, _q, _s));
}
// an instanced bar between two points (chains, struts, ropes)
export function bar(ctx, key, m, a, b, t) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]; const len = Math.hypot(dx, dy, dz) || 1e-3;
  _q.setFromUnitVectors(Y1, _d.set(dx / len, dy / len, dz / len)); _p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); _s.set(t, len, t);
  inst(ctx, key, unitBox(), m, _m.compose(_p, _q, _s));
}
// a flat strip len x wid lying on the ground (along X), its texture tw x th texels at 16 per metre
export function strip(len, wid, tw, th) {
  return geo(`k2-strip${len.toFixed(2)},${wid.toFixed(2)},${tw},${th}`, () => {
    const g = new THREE.PlaneGeometry(len, wid); const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 16 / tw, uv.getY(i) * wid * 16 / th);
    g.rotateX(-Math.PI / 2); return g;
  });
}
// a solid out of the see-through list (blocks sight as well as feet)
export function lowSolid(ctx, x0, z0, x1, z1, h = 1.2) { solid(ctx, x0, z0, x1, z1, h); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); }

// ---------------------------------------------------------------- light and fire
// An animated flame sprite (the city's torch flame), tinted.
export function flame(ctx, x, y, z, s = 1, tint = [2.2, 1.9, 1.6]) {
  const tex = T.flame().clone(); tex.needsUpdate = true; tex.repeat.set(1 / 4, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(...tint), fog: false }));
  sp.scale.set(0.5 * s, 0.75 * s, 1); sp.position.set(x, y, z); ctx.group.add(sp);
  let t = Math.random() * 10; ctx.anims.push({ update(dt) { t += dt; tex.offset.x = (Math.floor(t * 10) % 4) / 4; return false; } });
  return sp;
}
// A soft additive glow lying on the floor (the light a fire or a sigil throws), w along X, d along Z.
export function floorGlow(ctx, x, z, w, d, color = 0xff7a2a, k = 0.8, y = 0.03) {
  const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: T.glow('#ffffff', 32, 1.4), color: new THREE.Color(color).multiplyScalar(k), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2; ctx.group.add(m); return m;
}
// A glowing decal on the floor (a sigil, a rune line): additive, tinted, optionally breathing and turning.
export function decal(ctx, x, z, size, tex, color, o = {}) {
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(o.k ?? 1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: o.opacity ?? 1 });
  const m = new THREE.Mesh(plane(size, o.d || size), mat); m.rotation.x = -Math.PI / 2; m.rotation.z = o.rz || 0; m.position.set(x, o.y ?? 0.025, z); m.renderOrder = 3; ctx.group.add(m);
  if (o.pulse || o.spin) { let t = o.phase || 0; const base = mat.opacity; ctx.anims.push({ update(dt) { t += dt; if (o.pulse) mat.opacity = base * (0.7 + 0.3 * Math.sin(t * o.pulse)); if (o.spin) m.rotation.z = (o.rz || 0) + Math.round(t * o.spin * 32) / 32; return false; } }); }
  return m;
}
// A fire in an iron bowl on three legs (tint: the colour of the flame; o.stone for a stone bowl).
export function brazier(ctx, x, z, o = {}) {
  const iron = M.ironLit(); const h = o.h ?? 0.8; const col = o.color ?? 0xff7a2a;
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; bar(ctx, 'k2-strut', iron, [x + Math.sin(a) * 0.36, 0, z + Math.cos(a) * 0.36], [x + Math.sin(a) * 0.2, h, z + Math.cos(a) * 0.2], 0.06); }
  add(ctx, cyl(0.42, 0.24, 0.3, 8), o.stone ? o.stone : iron, x, h + 0.1, z);
  add(ctx, cyl(0.36, 0.36, 0.05, 8), M.glow(o.coal || '#ff7a28', 2.2), x, h + 0.24, z, { cast: false });
  flame(ctx, x, h + 0.62, z, 1.1, o.tint);
  ctx.lights.push({ x, y: h + 0.7, z, color: col, intensity: o.intensity || 4.5, dist: o.dist || 6.5, flicker: 0.2, halo: true });
  solidCircle(ctx, x, z, 0.45, 1.1);
}
// A torch on a wall facing +x or +z, with a tinted flame (kit.torch is always warm).
export function torch(ctx, x, y, z, face = '+x', o = {}) {
  const fx = face === '+x' ? 1 : 0, fz = face === '+z' ? 1 : 0;
  add(ctx, box(0.1 + fx * 0.3, 0.08, 0.1 + fz * 0.3), M.ironLit(), x + fx * 0.15, y, z + fz * 0.15);
  add(ctx, cyl(0.06, 0.04, 0.5, 5), M.wood('#4a3020'), x + fx * 0.32, y + 0.15, z + fz * 0.32, { rz: -fx * 0.3, rx: fz * 0.3 });
  flame(ctx, x + fx * 0.4, y + 0.7, z + fz * 0.4, 1, o.tint);
  ctx.lights.push({ x: x + fx * 0.8, y: y + 0.7, z: z + fz * 0.8, color: o.color ?? 0xff8a30, intensity: o.intensity || 5, dist: o.dist || 7, halo: true, flicker: 0.25 });
}

// ---------------------------------------------------------------- natural shapes
// A faceted boulder (a squashed dodecahedron) in the given material, solid unless told otherwise.
export function boulder(ctx, x, z, s = 1, mat, o = {}) {
  const R = T.rng(Math.round(x * 71 + z * 37 + s * 13));
  const m = add(ctx, geo('k2-dodec', () => new THREE.DodecahedronGeometry(0.5, 0)), mat, x, (o.y ?? 0) + s * (o.sink ?? 0.32), z, { ry: R() * 6, rx: (R() - 0.5) * 0.6, rz: (R() - 0.5) * 0.6 });
  m.scale.set(s * (o.sx ?? (0.9 + R() * 0.4)), s * (o.sy ?? (0.65 + R() * 0.3)), s * (o.sz ?? (0.9 + R() * 0.4)));
  if (o.solid !== false) solidCircle(ctx, x, z, s * 0.42 * (o.sx ?? 1.05), Math.max(1, s * 0.7));
  return m;
}
// A smooth mound (a drift or a dune): half an ellipsoid w x d, h tall; solid by default (a low wall).
export function mound(ctx, x, z, w, d, h, mat, o = {}) {
  const m = add(ctx, geo('k2-dome', () => new THREE.SphereGeometry(0.5, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)), mat, x, o.y ?? -0.05, z, { ry: o.ry || 0, cast: o.cast });
  m.scale.set(w, h * 2, d);
  if (o.solid !== false) {
    if (o.ry) solidRot(ctx, x, z, o.ry, w * 0.4, d * 0.4, Math.max(1, h)); else solid(ctx, x - w * 0.4, z - d * 0.4, x + w * 0.4, z + d * 0.4, Math.max(1, h));
  }
  return m;
}
// A fir: a dark trunk and layered boughs, snow lying on each tier (snowy) or bare and black.
export function pine(ctx, x, z, h = 6, o = {}) {
  const R = T.rng(Math.round(x * 13 + z * 29 + h * 7)); const bough = M.flat(o.tone ?? 0x16241e), snowC = M.flat(0xc8d4e6), bark = M.flat(0x221a16);
  add(ctx, cyl(0.1 * h / 6, 0.16 * h / 6, h * 0.35, 5), bark, x, h * 0.17, z);
  const tiers = Math.max(3, Math.round(h / 1.4)); const ry0 = R() * 6;
  for (let i = 0; i < tiers; i++) {
    const k = i / tiers, r = (1 - k * 0.78) * h * 0.24 * (o.wide ?? 1), th = h * 0.28, y = h * 0.18 + k * h * 0.7;
    add(ctx, cone(r, th, 7), bough, x, y + th / 2, z, { ry: ry0 + i * 0.6 });
    if (o.snowy !== false) { const sm = add(ctx, cone(r * 0.82, th * 0.42, 7), snowC, x, y + th * 0.68, z, { ry: ry0 + i * 0.6 + 0.2 }); sm.scale.y = 1; }
  }
  if (o.solid !== false) solidCircle(ctx, x, z, Math.max(0.3, h * 0.05), h);
}
// A bare, dead tree (wind-bent): trunk and crooked boughs, a tone of choice.
export function snag(ctx, x, z, h = 3.4, color = 0x1e1a18, o = {}) {
  const bark = M.flat(color); const R = T.rng(Math.round(x * 31 + z * 17));
  add(ctx, cyl(0.07 * h / 3, 0.18 * h / 3, h, 5), bark, x, h / 2, z, { rz: (o.lean ?? 0.08) });
  for (let i = 0; i < 5; i++) {
    const a = R() * Math.PI * 2, y = h * (0.45 + R() * 0.45), l = h * (0.25 + R() * 0.3);
    const m = add(ctx, cyl(0.025, 0.06, l, 4), bark, x + Math.cos(a) * l * 0.38 + (o.lean ?? 0.08) * -y * 0.5, y + l * 0.3, z + Math.sin(a) * l * 0.38);
    m.rotation.z = Math.cos(a) * 0.95; m.rotation.x = -Math.sin(a) * 0.95;
  }
  if (o.solid !== false) solidCircle(ctx, x, z, 0.28, h);
}

// ---------------------------------------------------------------- the locks of Act II
// A barrier across a way (handle compatible with kit.gate: set(open), update(dt), solid, x, z):
//  'ice'        jagged ice crystals burst out of the snow;
//  'sand'       sandstone slabs grind up out of the sand, a gold glyph on each;
//  'portcullis' an iron grille drops from the dark between two stone piers (hung up high when open);
//  'obsidian'   black glass teeth with red-hot cores tear up through the floor, a seal burning under them.
// axis 'x': the barrier runs along X. The solid is 0.6 m thick and blocks sight (foes beyond do not wait at it).
export function barrier(ctx, x, z, width = 3, axis = 'x', style = 'ice', o = {}) {
  const alongX = axis === 'x'; const R = T.rng(Math.round(x * 97 + z * 41 + width * 3)); const h = o.h ?? 2.8;
  const grp = new THREE.Group(); grp.position.set(x, 0, z); if (!alongX) grp.rotation.y = Math.PI / 2; ctx.group.add(grp);
  const P = (g, m, lx, ly, lz, rx = 0, ry = 0, rz = 0, s) => { const me = new THREE.Mesh(g, m); me.position.set(lx, ly, lz); me.rotation.set(rx, ry, rz); if (s) me.scale.copy(s); me.castShadow = true; me.receiveShadow = true; grp.add(me); return me; };
  const fixed = (g, m, lx, ly, lz, ry = 0) => { const c = Math.cos(alongX ? 0 : Math.PI / 2), s2 = Math.sin(alongX ? 0 : Math.PI / 2); return add(ctx, g, m, x + lx * c + lz * s2, ly, z - lx * s2 + lz * c, { ry: (alongX ? 0 : Math.PI / 2) + ry || undefined }); };
  let travel = h + 0.4, upY = 0, downY = -travel; // y of the group when closed (upY) and open (downY)
  if (style === 'ice') {
    const m = once('k2-icecr', () => cutout(new THREE.MeshPhongMaterial({ color: 0x8ec4e8, emissive: 0x1a3a58, specular: 0xe8f6ff, shininess: 90, flatShading: true })));
    const m2 = once('k2-icecr2', () => cutout(new THREE.MeshPhongMaterial({ color: 0xc8e6f8, emissive: 0x24486a, specular: 0xffffff, shininess: 110, flatShading: true })));
    const n = Math.max(3, Math.round(width / 0.42));
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + (i + 0.5) * width / n + (R() - 0.5) * 0.15, hh = h * (0.6 + R() * 0.5), r = 0.24 + R() * 0.16;
      P(cone(r, hh, 5), R() < 0.3 ? m2 : m, u, hh / 2, (R() - 0.5) * 0.3, (R() - 0.5) * 0.25, R() * 3, (R() - 0.5) * 0.35);
      if (R() < 0.6) { const h2 = hh * 0.45; P(cone(r * 0.6, h2, 5), m2, u + (R() - 0.5) * 0.3, h2 / 2, 0.25 + R() * 0.15, 0.3, R() * 3, (R() - 0.5) * 0.6); }
    }
  } else if (style === 'sand') {
    const st = W2.sandstone('#a07448'), glyph = M.glow('#ffc860', 1.8); const n = Math.max(2, Math.round(width / 1.1)); const sw = width / n;
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + (i + 0.5) * sw, hh = h * (0.92 + R() * 0.14);
      P(box(sw - 0.06, hh, 0.5), st, u, hh / 2, 0, 0, 0, (R() - 0.5) * 0.03);
      P(box(sw * 0.36, 0.08, 0.02), glyph, u, hh * 0.62, 0.26); P(box(0.08, sw * 0.4, 0.02), glyph, u, hh * 0.62, 0.26);
      P(box(sw * 0.2, 0.08, 0.02), glyph, u, hh * 0.62 + sw * 0.16, 0.26);
    }
    // the sill the slabs rise through
    fixed(box(width + 0.3, 0.08, 0.7), W2.sandstone('#8a6440'), 0, 0.04, 0);
  } else if (style === 'portcullis') {
    const iron = M.ironLit(); const nb = Math.round(width / 0.22);
    for (let i = 0; i <= nb; i++) { const u = -width / 2 + i * width / nb; P(box(0.06, h, 0.06), iron, u, h / 2, 0); P(cone(0.06, 0.2, 4), iron, u, -0.08, 0, Math.PI, Math.PI / 4); }
    for (const y of [0.4, h * 0.5, h - 0.2]) P(box(width, 0.07, 0.07), iron, 0, y, 0.02);
    // the stone frame it hangs in: piers and a lintel (the grille sits up behind the lintel when open)
    const tone = o.tone || '#4e463e'; const st = W2.cat(tone), hi = W2.cat('#6a6056'); const lh = o.lintel ?? 3.1;
    for (const s of [-1, 1]) { fixed(box(0.7, lh + 0.5, 0.9), st, s * (width / 2 + 0.35), (lh + 0.5) / 2, 0); solid(ctx, ...(alongX ? [x + s * (width / 2 + 0.35) - 0.35, z - 0.45, x + s * (width / 2 + 0.35) + 0.35, z + 0.45] : [x - 0.45, z + s * (width / 2 + 0.35) - 0.35, x + 0.45, z + s * (width / 2 + 0.35) + 0.35]), lh + 0.5); }
    fixed(box(width + 1.6, 0.6, 0.95), hi, 0, lh + 0.5, 0);
    travel = h - 0.25; upY = 0; downY = travel; // drops from above
  } else if (style === 'obsidian') {
    const ob = W2.obsidian(), core = M.glow('#ff3a18', 2.2); const n = Math.max(3, Math.round(width / 0.5));
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + (i + 0.5) * width / n, hh = h * (0.55 + R() * 0.6), r = 0.22 + R() * 0.14, lean = (R() - 0.5) * 0.4;
      P(cone(r, hh, 4), ob, u, hh / 2, (R() - 0.5) * 0.25, (R() - 0.5) * 0.2, R() * 3, lean);
      P(box(0.05, hh * 0.5, 0.05), core, u - lean * hh * 0.12, hh * 0.3, 0.12 + r * 0.3, 0, 0, lean);
    }
    const seal = decal(ctx, x, z, alongX ? width + 0.6 : 1.2, T.sigil('ring', 48, 77), 0xff3010, { d: alongX ? 1.2 : width + 0.6, k: 1.2, opacity: 0 });
    o.onT = (t) => { seal.material.opacity = 1 - t; };
  }
  const sh = { x0: alongX ? x - width / 2 : x - 0.3, z0: alongX ? z - 0.3 : z - width / 2, x1: alongX ? x + width / 2 : x + 0.3, z1: alongX ? z + 0.3 : z + width / 2, h: 3, gate: true, open: false };
  ctx.solids.push(sh);
  const handle = {
    t: o.open ? 1 : 0, target: o.open ? 1 : 0, solid: sh, x, z, style,
    set(open) { this.target = open ? 1 : 0; sh.open = !!open; },
    update(dt) {
      if (this.t === this.target) return false;
      this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * (style === 'portcullis' ? (this.target ? 0.9 : 2.2) : 1.4));
      const k = this.t * this.t * (3 - 2 * this.t);
      grp.position.y = upY + (downY - upY) * k; grp.visible = style === 'portcullis' || k < 0.995;
      if (style !== 'portcullis') grp.position.x = x + (k > 0.02 && k < 0.98 ? (Math.random() - 0.5) * 0.03 : 0);
      if (o.onT) o.onT(k);
      return true;
    },
  };
  sh.open = !!o.open; handle.t = o.open ? 1 : 0; const k0 = handle.t; grp.position.y = upY + (downY - upY) * k0; grp.visible = style === 'portcullis' || k0 < 0.995; if (o.onT) o.onT(k0);
  ctx.anims.push(handle);
  return handle;
}

// ---------------------------------------------------------------- shared set dressing
// A chain hanging from the dark (instanced links), from (x, yTop, z) down to y, swinging slowly when told.
export function chain(ctx, x, yTop, z, y, o = {}) {
  const m = M.ironLit(); const n = Math.max(2, Math.round((yTop - y) / 0.16));
  for (let i = 0; i < n; i++) { const yy = yTop - i * 0.16; put(ctx, 'k2-link' + (i % 2), m, x, yy, z, i % 2 ? 0.03 : 0.09, 0.14, i % 2 ? 0.09 : 0.03); }
  if (o.hook) { put(ctx, 'k2-hook', m, x, y - 0.06, z, 0.04, 0.14, 0.04); put(ctx, 'k2-hook', m, x + 0.06, y - 0.14, z, 0.12, 0.04, 0.04); }
}
// A chain slung between two points (sagging), instanced links.
export function slung(ctx, a, b, sag = 0.6) {
  const m = M.ironLit(); const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const n = Math.max(3, Math.round(L / 0.15)); let prev = a;
  for (let i = 1; i <= n; i++) { const t = i / n; const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t]; bar(ctx, 'k2-slung' + (i % 2), m, prev, p, i % 2 ? 0.035 : 0.07); prev = p; }
}
