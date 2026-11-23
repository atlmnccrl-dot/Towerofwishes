// The Act III kit: what the Wheel's three regions are built from. World-mapped materials for the new
// grounds (marsh mud and moss, rotten boards, brass, gratings, tread plate, heaven's marble, gilt), the
// locks of Act III's fights (roots and drowned bells that heave up out of the mud, brass rams that drive
// up out of the deck, blades of light), and what the three share: stone that sinks into a sky of its own
// colour, things far off in the sky that move slower than the world (parallax), puffs of steam and fog,
// banks of low mist and soft glows.
// The same rules as kit.js and kit2.js: 16 texels per metre, solids for collision, lights in ctx.lights.
import * as THREE from '../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, plane, solid, solidCircle } from './kit.js';
import { M, cutout } from '../engine/materials.js';
import * as T from '../engine/textures.js';
import { once, worldMat, pix, decal } from './kit2.js';

// ---------------------------------------------------------------- materials
const lam = (key, tex, o = {}) => once('k3' + key, () => worldMat(new THREE.MeshLambertMaterial(o), tex));
const pho = (key, tex, o = {}) => once('k3' + key, () => worldMat(new THREE.MeshPhongMaterial(o), tex));
export const W3 = {
  mud: (tone = '#2e3226') => pho('mud' + tone, T.mud(51, tone), { shininess: 40, specular: 0x34403c }),
  moss: (tone = '#3a4630') => lam('moss' + tone, T.moss(52, tone)),
  rotwood: (tone = '#4c4236') => lam('rot' + tone, T.rotwood(53, tone)),
  brass: (tone = '#8a6a34') => pho('brass' + tone, T.brass(54, tone), { shininess: 48, specular: 0xc8a060 }),
  grate: (tone = '#3a3e48') => pho('grate' + tone, T.grate(55, tone), { shininess: 30, specular: 0x6a6a80 }),
  tread: (tone = '#4a4e5a') => pho('tread' + tone, T.tread(56, tone), { shininess: 36, specular: 0x8088a0 }),
  marble: (tone = '#d8d2c6') => pho('marble' + tone, T.marble(57, tone), { shininess: 30, specular: 0x8a8070 }),
  gilt: (tone = '#b08a3c') => pho('gilt' + tone, T.gilt(58, tone), { shininess: 60, specular: 0xffe0a0 }),
  // flat-shaded marble for broken stone, the undersides of the floating isles
  rock: (tex, tone) => once('k3rock' + tex + tone, () => worldMat(new THREE.MeshLambertMaterial({ flatShading: true }), T[tex](59, tone))),
};
// Plain metals for machinery (not world-mapped: they turn).
export const brassM = () => once('k3-brassM', () => cutout(new THREE.MeshPhongMaterial({ color: 0x8a6430, specular: 0xffd890, shininess: 54 })));
export const darkBrassM = () => once('k3-dbrassM', () => cutout(new THREE.MeshPhongMaterial({ color: 0x5a4020, specular: 0xb08850, shininess: 36 })));
export const steelM = () => once('k3-steelM', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3a3e4a, specular: 0x9aa0b8, shininess: 44 })));
export const goldM = () => once('k3-goldM', () => cutout(new THREE.MeshPhongMaterial({ color: 0xc8962e, specular: 0xfff0b0, shininess: 70, emissive: 0x3a2808 })));

// ---------------------------------------------------------------- stone that sinks into a sky
// The further below the walks, the more a set material fades into the given colour (the void's, the sky's).
const fadeCache = new Map();
export function fade(base, color, range = 9) {
  if (!base || !base.onBeforeCompile) return base;
  const key = base.uuid + ':' + color + ':' + range; if (fadeCache.has(key)) return fadeCache.get(key);
  const m = base.clone(); m.onBeforeCompile = (sh, r) => {
    base.onBeforeCompile(sh, r); sh.uniforms.fadeCol = { value: new THREE.Color(color) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 fadeCol;')
      .replace('#include <fog_fragment>', `gl_FragColor.rgb = mix(gl_FragColor.rgb, fadeCol, clamp(-vWPos.y / ${range.toFixed(1)}, 0.0, 1.0));\n#include <fog_fragment>`);
  };
  m.customProgramCacheKey = () => base.customProgramCacheKey() + 'k3fade' + color + ':' + range;
  fadeCache.set(key, m); return m;
}

// ---------------------------------------------------------------- the far sky
// Puts a group into the far sky: drawn first and behind everything (no depth), never fogged or shadowed,
// and moved with the camera by k (0: fixed in the world, 1: fixed on the screen), so it seems far away.
// The parallax is anchored at the level point `anchor`, so it sits the same whichever lamp you wake at.
export function skyLayer(ctx, grp, k = 0.8, anchor = [0, 0]) {
  grp.traverse((o) => {
    if (o.material) for (const m of [].concat(o.material)) { m.depthTest = false; m.depthWrite = false; m.fog = false; m.transparent = false; }
    o.renderOrder = -100 + (o.renderOrder || 0) * 0.01; o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false;
  });
  const base = grp.position.clone();
  ctx.anims.push({ update() {
    const G = typeof window !== 'undefined' && window.BM && window.BM.game; const f = G && G.camFocus; if (!f) return false;
    grp.position.set(base.x + (f.x - anchor[0]) * k, base.y, base.z + (f.z - anchor[1]) * k); return false;
  } });
  return grp;
}
// A basis turned to face the camera (local +Z toward it, +Y up the screen): for things meant to be seen flat.
export function faceCam(grp) {
  const f = new THREE.Vector3(-0.54, -0.64, -0.54).normalize(); const Y = new THREE.Vector3(0, 1, 0);
  const u = Y.clone().addScaledVector(f, -Y.dot(f)).normalize(); const rgt = new THREE.Vector3().crossVectors(f, u).normalize();
  grp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rgt, u, f.clone().negate())); return grp;
}

// ---------------------------------------------------------------- glows, puffs and mist
const glowTex = () => T.glow('#ffffff', 32, 1.5);
// A soft additive glow sprite (a wisp's light, the shine round a lamp).
export function glowSprite(ctx, x, y, z, s, color, k = 1) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(color).multiplyScalar(k), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  sp.scale.set(s, s, 1); sp.position.set(x, y, z); ctx.group.add(sp); return sp;
}
// A dithered soft blob (white on clear) for puffs of steam and fog.
export const puffTex = () => pix('k3-puff', 24, 24, (g, W) => {
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; const R = T.rng(77);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x + 0.5 - W / 2, y + 0.5 - W / 2) / (W / 2); const v = (1 - d) * 1.4 + (R() - 0.5) * 0.25;
    if (v > (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
  }
});
// Puffs that rise, swell and thin out, again and again: emitters [x, y, z, every (s), rise (m/s), size, colour,
// opacity]. o.burst: puffs per emission. Steam from vents and pistons, the marsh breathing fog.
export function puffs(ctx, emitters, o = {}) {
  const tex = puffTex(); const list = [];
  for (const [x, y, z, every = 1.6, rise = 1.2, size = 1, color = 0xd8d8e0, op = 0.5] of emitters) {
    const n = Math.max(3, Math.ceil(2.4 / every) + 1) * (o.burst || 1);
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0, depthWrite: false, fog: false })); sp.renderOrder = 4;
      ctx.group.add(sp); list.push({ sp, x, y, z, every, rise, size, op, age: (i / n) * 2.4 + Math.random() * 0.2, life: 2.4, dx: (Math.random() - 0.5) * 0.5, dz: (Math.random() - 0.5) * 0.5 });
    }
  }
  ctx.anims.push({ update(dt) {
    for (const p of list) {
      p.age += dt; if (p.age > p.life) { p.age -= p.life; p.dx = (Math.random() - 0.5) * 0.5; p.dz = (Math.random() - 0.5) * 0.5; }
      const k = p.age / p.life; p.sp.position.set(p.x + p.dx * k + k * 0.3, p.y + p.rise * p.age, p.z + p.dz * k);
      const s = p.size * (0.4 + k * 1.4); p.sp.scale.set(s, s, 1); p.sp.material.opacity = p.op * Math.min(1, k * 6) * (1 - k);
    }
    return false;
  } });
}
// Drifting mist sheets (dithered wisps), for fog lying over water and in the hollows.
export const mistTex = () => pix('k3-mist', 96, 96, (g, W) => {
  const R = T.rng(4242); const blobs = []; for (let i = 0; i < 14; i++) blobs.push([R() * W, R() * W, 6 + R() * 14, 0.4 + R() * 0.6]);
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    let v = 0; for (const [bx, by, br, bs] of blobs) { let dx = Math.abs(x - bx); dx = Math.min(dx, W - dx) / 2.2; let dy = Math.abs(y - by); dy = Math.min(dy, W - dy); v += bs * Math.exp(-(dx * dx + dy * dy) / (br * br)); }
    if (v * 0.9 > (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
  }
}, true);
export function mistSheet(ctx, x0, z0, x1, z1, y, opacity = 0.18, color = 0x9aa8a4, o = {}) {
  const w = x1 - x0, d = z1 - z0; const t = mistTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / (o.tile || 12), d / (o.tile || 12));
  const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, y, z0 + d / 2); m.renderOrder = o.order ?? 3; ctx.group.add(m);
  const vx = (o.vx ?? 0.02), vz = (o.vz ?? 0.008); let ox = Math.random(), oy = Math.random();
  ctx.anims.push({ update(dt) { ox += vx * dt; oy += vz * dt; t.offset.set(Math.round(ox * 96) / 96, Math.round(oy * 96) / 96); return false; } });
  return m;
}
// A bank of fog: soft dithered blobs lying low over a stretch (no hard edges), drifting to and fro.
export const blobTex = () => pix('k3-blob', 64, 32, (g, W, H) => {
  const R = T.rng(515); const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; const lumps = []; for (let i = 0; i < 7; i++) lumps.push([W * (0.25 + R() * 0.5), H * (0.3 + R() * 0.4), 7 + R() * 9]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0; for (const [bx, by, br] of lumps) v += Math.exp(-(((x - bx) / 2) ** 2 + (y - by) ** 2) / (br * br)); v *= 1 - Math.min(1, Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2)));
    if (v * 1.6 > (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); }
  }
});
export function fogBank(ctx, x0, z0, x1, z1, o = {}) {
  const R = T.rng(Math.round(x0 * 31 + z0 * 17)); const col = o.color ?? 0x8a9a94; const n = Math.max(1, Math.round((x1 - x0) * (z1 - z0) / (o.per ?? 26))); const tex = blobTex(); const list = [];
  for (let i = 0; i < n; i++) {
    const w = 5 + R() * 6, d = w * (0.4 + R() * 0.3), x = x0 + R() * (x1 - x0), z = z0 + R() * (z1 - z0), y = (o.y ?? 0) + 0.1 + R() * 0.8;
    const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: tex, color: col, transparent: true, opacity: (o.opacity ?? 0.12) * (0.6 + R() * 0.5), depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.rotation.z = (R() - 0.5) * 0.6; m.position.set(x, y, z); m.renderOrder = 3; ctx.group.add(m); list.push({ m, x, z, ph: R() * 6, sp: 0.05 + R() * 0.08 });
  }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const b of list) { b.m.position.x = Math.round((b.x + Math.sin(t * b.sp + b.ph) * 1.6) * 16) / 16; b.m.position.z = Math.round((b.z + Math.cos(t * b.sp * 0.7 + b.ph) * 0.8) * 16) / 16; } return false; } });
}

// ---------------------------------------------------------------- a bar of any section between two points
const _q = new THREE.Quaternion(), _d = new THREE.Vector3(), Y1 = new THREE.Vector3(0, 1, 0);
export function seg(parent, geom, mat, a, b, cast = true) {
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _d.length() || 1e-3; _d.divideScalar(len);
  const m = new THREE.Mesh(geom, mat); m.quaternion.setFromUnitVectors(Y1, _d); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.scale.set(1, len, 1);
  m.castShadow = cast; m.receiveShadow = true; m.userData.static = true; parent.add(m); return m;
}
const unitCyl = (rt, rb, n = 5) => geo(`k3-uc${rt},${rb},${n}`, () => new THREE.CylinderGeometry(rt, rb, 1, n));

// ---------------------------------------------------------------- the locks of Act III
// A barrier across a way (the same handle as kit.gate and kit2.barrier: set(open), update(dt), solid, x, z):
//  'roots'   black roots heave up out of the mud, moss hanging off them and small drowned bells caught in them;
//  'pistons' brass rams drive up out of an iron sill striped in warning colours, steam bursting as they move;
//  'light'   blades of gold light rise out of a gilt sill, a seal burning under them while they stand.
// axis 'x': the barrier runs along X. The solid is 0.6 m thick and blocks sight.
export function barrier3(ctx, x, z, width = 3, axis = 'x', style = 'roots', o = {}) {
  const alongX = axis === 'x'; const R = T.rng(Math.round(x * 89 + z * 43 + width * 7)); const h = o.h ?? 2.6;
  const grp = new THREE.Group(); grp.position.set(x, 0, z); if (!alongX) grp.rotation.y = Math.PI / 2; ctx.group.add(grp);
  const P = (g, m, lx, ly, lz, rx = 0, ry = 0, rz = 0, cast = true) => { const me = new THREE.Mesh(g, m); me.position.set(lx, ly, lz); me.rotation.set(rx, ry, rz); me.castShadow = cast; me.receiveShadow = true; grp.add(me); return me; };
  const fixed = (g, m, lx, ly, lz, oo = {}) => { const ry = alongX ? 0 : Math.PI / 2; const c = Math.cos(ry), s = Math.sin(ry); return add(ctx, g, m, x + lx * c + lz * s, ly, z - lx * s + lz * c, { ...oo, ry: ry + (oo.ry || 0) || undefined }); };
  let travel = h + 0.5; const fx = []; // fx: extra things that follow t (opacity by k)
  if (style === 'roots') {
    const bark = M.flat(0x1c1914), bark2 = M.flat(0x2a241a), mossC = M.flat(0x4a5a3a), bronze = once('k3-drbell', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3e5a46, specular: 0x8ab0a0, shininess: 30 })));
    const n = Math.max(4, Math.round(width / 0.32));
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + (i + 0.5) * width / n + (R() - 0.5) * 0.12; const hh = h * (0.55 + R() * 0.55); const r0 = 0.11 + R() * 0.08; const lz0 = (R() - 0.5) * 0.4;
      const pts = [[u, -0.2, lz0]]; for (let k = 1; k <= 4; k++) pts.push([u + (R() - 0.5) * 0.35, hh * k / 4, lz0 + (R() - 0.5) * 0.35 + (k === 4 ? (R() - 0.5) * 0.4 : 0)]);
      for (let k = 0; k < 4; k++) seg(grp, unitCyl(r0 * (1 - (k + 1) * 0.22), r0 * (1 - k * 0.22)), k % 2 ? bark2 : bark, pts[k], pts[k + 1]);
      if (R() < 0.6) { const p = pts[2 + ((R() * 2) | 0)]; P(box(0.05, 0.4 + R() * 0.5, 0.05), mossC, p[0] + 0.08, p[1] - 0.3, p[2] + 0.06, 0, 0, 0, false); }
      if (R() < 0.3) { const p = pts[3]; const b = P(geo('k3-bellsm', () => new THREE.CylinderGeometry(0.06, 0.14, 0.22, 7)), bronze, p[0], p[1] - 0.25, p[2] + 0.12); b.rotation.z = (R() - 0.5) * 0.5; }
    }
    // the mud they burst from, heaped along the way
    fixed(geo('k3-mudheap', () => new THREE.SphereGeometry(0.5, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2)), W3.mud('#2a2e22'), 0, -0.05, 0, { s: new THREE.Vector3(width + 0.6, 0.35, 1.1), cast: false });
  } else if (style === 'pistons') {
    const br = brassM(), st = steelM(); const n = Math.max(3, Math.round(width / 0.55)); const sw = width / n;
    P(box(width - 0.05, h * 0.92, 0.12), W3.tread('#3e424e'), 0, h * 0.46, -0.12);
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + (i + 0.5) * sw, hh = h * (0.94 + (i % 2) * 0.06);
      P(cyl(sw * 0.36, sw * 0.36, hh, 8), br, u, hh / 2, 0.04); P(cyl(sw * 0.42, sw * 0.42, 0.14, 8), st, u, hh - 0.07, 0.04);
      for (const y of [0.5, hh * 0.55]) P(cyl(sw * 0.4, sw * 0.4, 0.07, 8), st, u, y, 0.04);
    }
    const stripe = pix('k3-hazard', 16, 4, (g) => { for (let y = 0; y < 4; y++) for (let xx = 0; xx < 16; xx++) { g.fillStyle = ((xx + y) >> 2) % 2 ? '#1a1814' : '#c8a028'; g.fillRect(xx, y, 1, 1); } }, true);
    const sm = once('k3-hazM', () => cutout(new THREE.MeshLambertMaterial({ map: stripe })));
    const sill = fixed(box(width + 0.5, 0.22, 0.9), steelM(), 0, 0.11, 0); sill.castShadow = false;
    const fw = width + 0.5; const front = new THREE.Mesh(geo('k3-haz' + fw, () => { const g = new THREE.PlaneGeometry(fw, 0.2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * fw, uv.getY(i) * 0.8); return g; }), sm);
    front.position.set(x + (alongX ? 0 : 0.451), 0.11, z + (alongX ? 0.451 : 0)); if (!alongX) front.rotation.y = Math.PI / 2; ctx.group.add(front);
    for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0xe0e0e8, transparent: true, opacity: 0, depthWrite: false, fog: false })); const u = (i - 1) * width * 0.35; sp.position.set(x + (alongX ? u : 0.5), 0.6, z + (alongX ? 0.5 : u)); sp.scale.set(1.6, 1.6, 1); sp.renderOrder = 4; ctx.group.add(sp); fx.push({ sp, mode: 'mid' }); }
  } else if (style === 'light') {
    const n = Math.max(4, Math.round(width / 0.3));
    const blade = pix('k3-blade', 4, 32, (g) => { for (let y = 0; y < 32; y++) for (let xx = 0; xx < 4; xx++) { const k = (1 - y / 32) * (xx === 1 || xx === 2 ? 1 : 0.45); const v = Math.round(k * 6) / 6; g.fillStyle = `rgba(255,255,255,${v})`; g.fillRect(xx, 31 - y, 1, 1); } });
    const bm = new THREE.MeshBasicMaterial({ map: blade, color: new THREE.Color(1.9, 1.5, 0.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + (i + 0.5) * width / n, hh = h * (0.7 + R() * 0.55) * (i % 3 === 1 ? 1.2 : 1);
      for (const ry of [0, Math.PI / 2]) P(plane(0.26, hh), bm, u, hh / 2, (R() - 0.5) * 0.1, 0, ry, 0, false);
    }
    P(box(width, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.2), fog: false }), 0, h * 0.62, 0, 0, 0, 0, false);
    fixed(box(width + 0.4, 0.12, 0.7), W3.gilt(), 0, 0.06, 0, { cast: false });
    const seal = decal(ctx, x, z, alongX ? width + 0.8 : 1.4, T.sigil('seal', 48, 91), 0xffc860, { d: alongX ? 1.4 : width + 0.8, k: 1.3, opacity: 0, y: 0.13 });
    fx.push({ m: seal.material, mode: 'closed' }); fx.push({ m: bm, mode: 'closed', base: 1 });
  }
  const upY = 0, downY = -travel;
  const sh = { x0: alongX ? x - width / 2 : x - 0.3, z0: alongX ? z - 0.3 : z - width / 2, x1: alongX ? x + width / 2 : x + 0.3, z1: alongX ? z + 0.3 : z + width / 2, h: 3, gate: true, open: false };
  ctx.solids.push(sh);
  const apply = (k) => {
    grp.position.y = upY + (downY - upY) * k; grp.visible = k < 0.995;
    for (const f of fx) { const v = f.mode === 'mid' ? Math.sin(k * Math.PI) * 0.55 : 1 - k; if (f.sp) f.sp.material.opacity = v; else f.m.opacity = v * (f.base ?? 1); }
  };
  const handle = {
    t: o.open ? 1 : 0, target: o.open ? 1 : 0, solid: sh, x, z, style,
    set(open) { this.target = open ? 1 : 0; sh.open = !!open; },
    update(dt) {
      if (this.t === this.target) return false;
      this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * (style === 'pistons' ? 1.8 : 1.3));
      const k = this.t * this.t * (3 - 2 * this.t); apply(k);
      if (style !== 'light') grp.position.x = x + (k > 0.02 && k < 0.98 ? (Math.random() - 0.5) * 0.03 : 0);
      return true;
    },
  };
  sh.open = !!o.open; apply(handle.t);
  ctx.anims.push(handle);
  return handle;
}
