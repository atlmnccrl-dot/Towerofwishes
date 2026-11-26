// What the four places of Act V, the God's Dream, share (docs/ASCENT_DESIGN.md §2): materials tinted the wrong
// colour (a dream remembers the city in the wrong light), a way to build a kit piece once and set it down turned
// or upside down (the Waking City's houses hanging in the sky), the locks of the dream's fights (bronze ribs that
// close up out of the floor, iron bars under a sleeping eye), motes of light drifting, and a thing that breathes
// (a slow swell in scale or light: the god is asleep, and everything here rises and falls with its breath).
// The same rules as kit.js and kit3.js: 16 texels per metre, solids for collision, lights in ctx.lights.
// PROPOSAL: every look described here.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, plane, makeCtx } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, pix, decal } from '../kit2.js';
import { brassM, steelM, seg } from '../kit3.js';
export { decal };

// ---------------------------------------------------------------- the wrong colour
// A copy of a set material in another colour that keeps its texture mapping and its see-through cut.
const tintCache = new Map();
export function tint(base, color, k = 1) {
  if (!base || !base.isMaterial) return base;
  const key = base.uuid + ':' + color + ':' + k; if (tintCache.has(key)) return tintCache.get(key);
  const m = base.clone(); if (m.color) m.color.set(color).multiplyScalar(k);
  if (base.onBeforeCompile) m.onBeforeCompile = base.onBeforeCompile;
  if (base.customProgramCacheKey) m.customProgramCacheKey = base.customProgramCacheKey;
  tintCache.set(key, m); return m;
}
// bronze that glows a little in its own light, for the dream's bones and organs
export const dreamBronze = (c = 0x8a5e2a) => once('dr-bronze' + c, () => cutout(new THREE.MeshPhongMaterial({ color: c, specular: 0xd8a868, shininess: 42, emissive: 0x1a0c04 })));
export const darkBronze = () => once('dr-dbronze', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3a2614, specular: 0x9a7048, shininess: 30 })));
export const glowM = (color, k = 2.4) => once('dr-glow' + color + k, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), fog: false }));

// ---------------------------------------------------------------- building a piece once, setting it down anywhere
// Builds fn(sub) into a scratch context and moves every mesh into ctx, baked through the transform (position x, y,
// z, turned ry about Y, then rz about Z: Math.PI hangs it upside down). Its solids and lights are dropped unless
// o.keepSolids / o.keepLights (only for pieces set down upright on the floor). The meshes stay static, so they
// merge with the rest of the level.
const _m = new THREE.Matrix4(), _mm = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3();
export function transplant(ctx, fn, x, y, z, o = {}) {
  const sub = makeCtx(); sub.style = o.style ?? ctx.style; fn(sub);
  _m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ')), new THREE.Vector3(1, 1, 1).multiplyScalar(o.s || 1));
  sub.group.updateMatrixWorld(true);
  for (const m of sub.group.children.slice()) {
    m.updateMatrix(); _mm.multiplyMatrices(_m, m.matrix); _mm.decompose(_p, _q, _s);
    m.position.copy(_p); m.quaternion.copy(_q); m.scale.copy(_s);
    if (o.mat && m.material && m.isMesh) m.material = o.mat(m.material);
    if (o.cast === false) m.castShadow = false;
    ctx.group.add(m);
  }
  for (const [key, e] of sub.instances) for (const mt of e.mats) { const k2 = key + (o.mat ? ':t' : ''); const mat = o.mat ? o.mat(e.mat) : e.mat; let f = ctx.instances.get(k2); if (!f) { f = { geom: e.geom, mat, mats: [] }; ctx.instances.set(k2, f); } f.mats.push(new THREE.Matrix4().multiplyMatrices(_m, mt)); }
  if (o.keepSolids) for (const s of sub.solids) ctx.solids.push(s.r !== undefined ? { ...s, x: s.x + x, z: s.z + z } : { ...s, x0: s.x0 + x, x1: s.x1 + x, z0: s.z0 + z, z1: s.z1 + z });
  if (o.keepLights) for (const l of sub.lights) ctx.lights.push({ ...l, x: l.x + x, y: l.y + y, z: l.z + z });
  for (const a of sub.anims) ctx.anims.push(a);
  return sub;
}

// ---------------------------------------------------------------- breathing
// The god breathes in its sleep: a slow swell (about one breath in five seconds) that the dream's living things
// follow. breath(t) is 0..1; breathe(ctx, obj, o) swells an object's scale (o.amp) or a light's intensity.
export const BREATH = 5.2;
export const breath = (t) => 0.5 - 0.5 * Math.cos(t / BREATH * Math.PI * 2);
export function breathe(ctx, obj, o = {}) {
  let t = o.phase ?? 0; const s0 = obj.scale ? obj.scale.clone() : null; const amp = o.amp ?? 0.04;
  ctx.anims.push({ update(dt) { t += dt; const k = breath(t); if (s0) { const q = Math.round((1 + amp * k) * 32) / 32; obj.scale.set(s0.x * (o.x === false ? 1 : q), s0.y * (o.y === false ? 1 : q), s0.z * (o.z === false ? 1 : q)); } return false; } });
}

// ---------------------------------------------------------------- motes of light
// Points of light drifting up through the rects and wrapping round (one draw for all of them). o.color, o.size
// (pixels), o.rise (m/s), o.h (how high they go).
export function motes(ctx, rects, n = 80, o = {}) {
  const R = T.rng(o.seed || 909); const pos = new Float32Array(n * 3); const data = [];
  for (let i = 0; i < n; i++) { const r = rects[i % rects.length]; const d = { r, x: r[0] + R() * (r[2] - r[0]), z: r[1] + R() * (r[3] - r[1]), y: (o.y0 ?? 0) + R() * (o.h ?? 6), ph: R() * 9, v: (o.rise ?? 0.35) * (0.5 + R()) }; data.push(d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const c = new THREE.Color(o.color ?? 0xffe0a0).multiplyScalar(o.k ?? 2.2);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: c, size: o.size ?? 1, sizeAttenuation: false, transparent: true, opacity: o.opacity ?? 0.9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  pts.frustumCulled = false; pts.renderOrder = 5; ctx.group.add(pts);
  const H = (o.y0 ?? 0) + (o.h ?? 6);
  ctx.anims.push({ update(dt) {
    for (let i = 0; i < n; i++) { const d = data[i]; d.y += d.v * dt; d.ph += dt; if (d.y > H) { d.y = o.y0 ?? 0; d.x = d.r[0] + Math.random() * (d.r[2] - d.r[0]); d.z = d.r[1] + Math.random() * (d.r[3] - d.r[1]); }
      pos[i * 3] = Math.round((d.x + Math.sin(d.ph * 0.7) * 0.4) * 16) / 16; pos[i * 3 + 1] = Math.round(d.y * 16) / 16; pos[i * 3 + 2] = Math.round((d.z + Math.cos(d.ph * 0.5) * 0.3) * 16) / 16; }
    g.attributes.position.needsUpdate = true; return false;
  } });
  return pts;
}

// A soft glow sprite that breathes with the god (a light hanging in the dark).
export function breathGlow(ctx, x, y, z, s, color, k = 1, o = {}) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.5), color: new THREE.Color(color).multiplyScalar(k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  sp.scale.set(s, s, 1); sp.position.set(x, y, z); ctx.group.add(sp);
  let t = o.phase ?? 0; ctx.anims.push({ update(dt) { t += dt; sp.material.opacity = 0.65 + 0.35 * breath(t); return false; } });
  return sp;
}

// ---------------------------------------------------------------- the locks of Act V
// A barrier across a way (the same handle as kit3.barrier3: set(open), update(dt), solid, x, z):
//  'ribs'  curved teeth of bronze close up out of a bronze sill, a molten seam glowing along it while they stand;
//  'bars'  black iron bars rise under a closed eye of violet light that opens while the way is shut (the city
//          that dreams itself awake does not want you to leave).
export function barrier5(ctx, x, z, width = 3, axis = 'x', style = 'ribs', o = {}) {
  const alongX = axis === 'x'; const R = T.rng(Math.round(x * 71 + z * 37 + width * 5)); const h = o.h ?? 2.8;
  const grp = new THREE.Group(); grp.position.set(x, 0, z); if (!alongX) grp.rotation.y = Math.PI / 2; ctx.group.add(grp);
  const P = (g, m, lx, ly, lz, rx = 0, ry = 0, rz = 0, cast = true) => { const me = new THREE.Mesh(g, m); me.position.set(lx, ly, lz); me.rotation.set(rx, ry, rz); me.castShadow = cast; me.receiveShadow = true; grp.add(me); return me; };
  const fixedAdd = (g, m, lx, ly, lz, oo = {}) => { const ry = alongX ? 0 : Math.PI / 2; const c = Math.cos(ry), s = Math.sin(ry); return add(ctx, g, m, x + lx * c + lz * s, ly, z - lx * s + lz * c, { ...oo, ry: ry + (oo.ry || 0) || undefined }); };
  const fx = [];
  if (style === 'ribs') {
    const br = dreamBronze(0x9a6a30), dk = darkBronze(); const n = Math.max(4, Math.round(width / 0.42));
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + (i + 0.5) * width / n; const hh = h * (0.75 + R() * 0.3); const lean = (i % 2 ? 1 : -1) * 0.12;
      const pts = [[u, -0.2, 0], [u + lean * 0.3, hh * 0.45, 0.06], [u + lean, hh * 0.85, 0.16], [u + lean * 1.3, hh, 0.3]];
      for (let k = 0; k < 3; k++) seg(grp, geo('dr-rib' + k, () => new THREE.CylinderGeometry(0.07 - k * 0.018, 0.1 - k * 0.018, 1, 5)), k === 2 ? dk : br, pts[k], pts[k + 1]);
    }
    P(box(width, 0.06, 0.06), glowM(0xff8a28, 2.6), 0, h * 0.3, 0.05, 0, 0, 0, false);
    fixedAdd(box(width + 0.5, 0.2, 0.8), dk, 0, 0.1, 0, { cast: false });
    const seam = new THREE.Mesh(plane(alongX ? width + 0.3 : 0.12, alongX ? 0.12 : width + 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 1.2, 0.3), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    seam.rotation.x = -Math.PI / 2; seam.position.set(x, 0.21, z); seam.renderOrder = 3; ctx.group.add(seam); fx.push({ m: seam.material, mode: 'closed' });
  } else if (style === 'bars') {
    const iron = M.ironLit(); const n = Math.max(4, Math.round(width / 0.36));
    for (let i = 0; i < n; i++) { const u = -width / 2 + (i + 0.5) * width / n; const hh = h * (0.9 + (i % 3) * 0.06); P(box(0.07, hh, 0.07), iron, u, hh / 2, 0); P(box(0.12, 0.22, 0.12), iron, u, hh, 0); }
    for (const y of [0.5, h * 0.62]) P(box(width, 0.06, 0.08), iron, 0, y, 0);
    const eye = pix('dr-eye', 24, 12, (g) => { for (let yy = 0; yy < 12; yy++) for (let xx = 0; xx < 24; xx++) { const dx = (xx - 11.5) / 11.5, dy = (yy - 5.5) / 5.5; const e = dx * dx + dy * dy * 2.2; if (e < 1 && e > 0.62) { g.fillStyle = '#ffffff'; g.fillRect(xx, yy, 1, 1); } if (Math.hypot(xx - 11.5, (yy - 5.5) * 1.3) < 2.6) { g.fillStyle = '#ffffff'; g.fillRect(xx, yy, 1, 1); } } });
    const em = new THREE.MeshBasicMaterial({ map: eye, color: new THREE.Color(2.0, 1.0, 3.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    P(plane(1.4, 0.7), em, 0, h + 0.55, 0.06, 0, 0, 0, false); fx.push({ m: em, mode: 'closed' });
    fixedAdd(box(width + 0.3, 0.12, 0.5), steelM(), 0, 0.06, 0, { cast: false });
  }
  const travel = h + 0.6; const sh = { x0: alongX ? x - width / 2 : x - 0.3, z0: alongX ? z - 0.3 : z - width / 2, x1: alongX ? x + width / 2 : x + 0.3, z1: alongX ? z + 0.3 : z + width / 2, h: 3, gate: true, open: false };
  ctx.solids.push(sh);
  const apply = (k) => { grp.position.y = -travel * k; grp.visible = k < 0.995; for (const f of fx) f.m.opacity = 1 - k; };
  const handle = {
    t: o.open ? 1 : 0, target: o.open ? 1 : 0, solid: sh, x, z, style,
    set(open) { this.target = open ? 1 : 0; sh.open = !!open; },
    update(dt) {
      if (this.t === this.target) return false;
      this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * 1.5);
      const k = this.t * this.t * (3 - 2 * this.t); apply(k);
      grp.position.x = x + (k > 0.02 && k < 0.98 ? (Math.random() - 0.5) * 0.03 : 0);
      return true;
    },
  };
  sh.open = !!o.open; apply(handle.t);
  ctx.anims.push(handle);
  return handle;
}

// ---------------------------------------------------------------- light on the floor in a line (veins, seams)
// A glowing line laid on the floor from a to b (a vein of molten light, a seam of dawn), breathing with the god.
export function vein(ctx, a, b, color = 0xff6a20, o = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1]; const len = Math.hypot(dx, dz); const w = o.w ?? 0.14;
  const m = new THREE.Mesh(plane(len, w), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(o.k ?? 1.8), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  m.rotation.order = 'YXZ'; m.rotation.y = Math.atan2(-dz, dx); m.rotation.x = -Math.PI / 2; m.position.set((a[0] + b[0]) / 2, o.y ?? 0.02, (a[1] + b[1]) / 2); m.renderOrder = 2; ctx.group.add(m);
  let t = o.phase ?? Math.random() * 5; ctx.anims.push({ update(dt) { t += dt; m.material.opacity = 0.45 + 0.5 * breath(t); return false; } });
  return m;
}
export const cylAt = (ctx, r0, r1, h, mat, x, y, z, o = {}) => add(ctx, cyl(r0, r1, h, o.n || 8), mat, x, y, z, o);
