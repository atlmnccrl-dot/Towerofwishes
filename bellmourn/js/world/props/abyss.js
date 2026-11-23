// Props for Act II, region IV: the Abyss. Basalt islands hanging over a red void, rivers of fire far below
// and one across the way, obsidian spires with hot veins, ritual circles burning in the floor, chained
// altars, the torn rift the wardens came through, and over the great circle a vast wheel of rings and
// eyes turning in the dark, its great eye following the warden.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane, torus } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { skull, bone, bonePile } from './undercroft.js';
import { W2, once, part, put, bar, q16, pix, flame, floorGlow, solidRot, chain, slung, brazier, decal, boulder } from '../kit2.js';
export { skull, bone, bonePile, brazier, decal, floorGlow };

export const BASALT = '#45404a', BASALT2 = '#2e2a30', VOIDC = 0x1c0606;
const hot = () => M.glow('#ff4a1a', 2.4);
const ember = () => M.glow('#ff8a2a', 2.0);

// ---------------------------------------------------------------- below the walks
// Stone that sinks into the red dark: the further below the walks, the more it fades to the void's red-black.
const deepCache = new Map();
export function hdeep(base, range = 9) {
  const key = base.uuid + ':' + range; if (deepCache.has(key)) return deepCache.get(key);
  const m = base.clone(); m.onBeforeCompile = (sh, r) => {
    base.onBeforeCompile(sh, r); sh.uniforms.deepCol = { value: new THREE.Color(VOIDC) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 deepCol;')
      .replace('#include <fog_fragment>', `gl_FragColor.rgb = mix(gl_FragColor.rgb, deepCol, clamp(-vWPos.y / ${range.toFixed(1)}, 0.0, 1.0));\n#include <fog_fragment>`);
  };
  m.customProgramCacheKey = () => base.customProgramCacheKey() + 'hdeep' + range;
  deepCache.set(key, m); return m;
}
// An island of basalt: its walk, and the cliff under it falling into the red dark, ragged with columns.
export function island(ctx, x0, z0, x1, z1, o = {}) {
  const depth = o.depth || 12, R = T.rng(Math.round(x0 * 13 + z0 * 7)); const side = hdeep(W2.basalt(BASALT2), 8);
  add(ctx, box(x1 - x0, depth, z1 - z0), side, (x0 + x1) / 2, -0.3 - depth / 2, (z0 + z1) / 2, { cast: false });
  // basalt columns down the two faces we see, ragged lengths, glowing seams
  for (const f of ['x', 'z']) {
    const len = f === 'x' ? z1 - z0 : x1 - x0; const n = Math.round(len / 0.9);
    for (let i = 0; i < n; i++) {
      const p = (f === 'x' ? z0 : x0) + (i + 0.5) * len / n, L = 2 + R() * (depth - 2), w = 0.6 + R() * 0.4;
      if (f === 'x') add(ctx, box(0.4, L, w), side, x1 + 0.15, -0.25 - L / 2, p, { cast: false }); else add(ctx, box(w, L, 0.4), side, p, -0.25 - L / 2, z1 + 0.15, { cast: false });
      if (R() < 0.05) { if (f === 'x') add(ctx, box(0.05, L * 0.6, 0.06), hot(), x1 + 0.36, -0.6 - L * 0.3, p + w / 2, { cast: false }); else add(ctx, box(0.06, L * 0.6, 0.05), hot(), p + w / 2, -0.6 - L * 0.3, z1 + 0.36, { cast: false }); }
    }
  }
  // the rim: broken stones along the near edges
  for (const f of ['x', 'z']) { const len = f === 'x' ? z1 - z0 : x1 - x0; for (let k = 0; k < len / 1.4; k++) { const p = (f === 'x' ? z0 : x0) + R() * len, s = 0.25 + R() * 0.35; add(ctx, box(s, s * 0.6, s), W2.basalt(BASALT), f === 'x' ? x1 - 0.2 : p, s * 0.25, f === 'x' ? p : z1 - 0.2, { ry: R() * 3, cast: false }); } }
}
// A river of fire far below (or at the walk: o.y), a flowing strip with a glow over it.
export function fireRiver(ctx, x0, z0, x1, z1, o = {}) {
  const y = o.y ?? -9; const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const w = x1 - x0, d = z1 - z0;
  const tex = T.lava(o.seed || 40).clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2, d / 2);
  const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.5, 1.2, 1.1).multiplyScalar(o.dim ?? 1), fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); ctx.group.add(m);
  const sp = (o.speed ?? 0.05) * (alongX ? 1 : 0), sq = (o.speed ?? 0.05) * (alongX ? 0 : 1); let ox = 0, oy = 0;
  ctx.anims.push({ update(dt) { ox += dt * sp; oy += dt * sq; tex.offset.set(Math.round(ox * 32) / 32, Math.round(oy * 32) / 32); return false; } });
  if (o.glow !== false) floorGlow(ctx, (x0 + x1) / 2, (z0 + z1) / 2, w * 1.3, d * 1.3, 0xff4a10, o.glowK ?? 0.5, y + 0.3);
  if (o.lights) for (let i = 0; i < o.lights; i++) { const t = (i + 0.5) / o.lights; ctx.lights.push({ x: x0 + w * (alongX ? t : 0.5), y: y + 1.2, z: z0 + d * (alongX ? 0.5 : t), color: 0xff5a1a, intensity: o.intensity || 3.5, dist: o.dist || 6, flicker: 0.12 }); }
  return m;
}
// A channel of fire across a walk (solid, low and see-through), its basalt lips, slabs across it at gaps.
export function fireChannel(ctx, x0, z0, x1, z1, gaps = [], gw = 2.4) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  fireRiver(ctx, x0, z0, x1, z1, { y: -0.12, speed: 0.08, glowK: 0.3, lights: Math.round(Math.max(x1 - x0, z1 - z0) / 5), intensity: 3.5 });
  const lip = W2.basalt('#3a3034');
  for (const e of alongX ? [z0, z1] : [x0, x1]) add(ctx, alongX ? box(x1 - x0, 0.2, 0.2) : box(0.2, 0.2, z1 - z0), lip, alongX ? (x0 + x1) / 2 : e, 0.04, alongX ? e : (z0 + z1) / 2);
  const a0 = alongX ? x0 : z0, a1 = alongX ? x1 : z1; let s = a0;
  const seg = (p, q) => { if (q - p < 0.05) return; if (alongX) solid(ctx, p, z0, q, z1, 1.2); else solid(ctx, x0, p, x1, q, 1.2); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); };
  for (const g of gaps.slice().sort((p, q) => p - q)) {
    seg(s, g - gw / 2); s = g + gw / 2;
    const ob = W2.obsidian(); if (alongX) add(ctx, box(gw, 0.2, z1 - z0 + 0.6), ob, g, 0.06, (z0 + z1) / 2); else add(ctx, box(x1 - x0 + 0.6, 0.2, gw), ob, (x0 + x1) / 2, 0.06, g);
  }
  seg(s, a1);
}
// The void's own fill: a low see-through solid over everything that is not a walk (nothing lands out there).
export { voidFill } from './belfry.js';

// ---------------------------------------------------------------- spires, bridges
// An obsidian spire: a faceted shard of black glass, leaning, a hot vein up one face; optional smaller shards.
export function spire(ctx, x, z, h = 6, o = {}) {
  const R = T.rng(Math.round(x * 31 + z * 17 + h)); const ob = W2.obsidian(); const r = o.r || h * 0.13;
  const lean = (R() - 0.5) * 0.25, ry = R() * 6;
  add(ctx, cone(r, h, 5), ob, x, h / 2 - 0.1 + (o.y || 0), z, { ry, rz: lean });
  add(ctx, box(0.06, h * 0.55, 0.06), hot(), x - lean * h * 0.2 + r * 0.35, h * 0.32 + (o.y || 0), z + r * 0.35, { rz: lean, cast: false });
  for (let i = 0; i < (o.shards ?? 2); i++) { const a = R() * 6, d = r * (0.9 + R() * 0.6), hh = h * (0.3 + R() * 0.3); add(ctx, cone(r * 0.4, hh, 4), ob, x + Math.sin(a) * d, hh / 2 - 0.1 + (o.y || 0), z + Math.cos(a) * d, { ry: R() * 3, rz: (R() - 0.5) * 0.6, rx: (R() - 0.5) * 0.6 }); }
  if (o.solid !== false && !o.y) solidCircle(ctx, x, z, r * 0.9, h);
}
// An obsidian bridge between islands (along Z by default): a glassy slab, a hot seam along its edges,
// iron posts with chains slung between them for rails, and the stone under it falling into the red.
export function bridge(ctx, x0, z0, x1, z1, o = {}) {
  const alongZ = Math.abs(z1 - z0) >= Math.abs(x1 - x0); const ob = W2.obsidian(), w = x1 - x0, d = z1 - z0;
  add(ctx, box(w, 0.3, d), ob, (x0 + x1) / 2, -0.15, (z0 + z1) / 2);
  add(ctx, box(alongZ ? w * 0.6 : w, 1.6, alongZ ? d : d * 0.6), hdeep(W2.basalt(BASALT2), 4), (x0 + x1) / 2, -1.1, (z0 + z1) / 2, { cast: false });
  for (const s of [0, 1]) {
    if (alongZ) add(ctx, box(0.06, 0.05, d), hot(), s ? x1 - 0.03 : x0 + 0.03, 0.01, (z0 + z1) / 2, { cast: false }); else add(ctx, box(w, 0.05, 0.06), hot(), (x0 + x1) / 2, 0.01, s ? z1 - 0.03 : z0 + 0.03, { cast: false });
  }
  const iron = M.ironLit(); const posts = Math.max(2, Math.round((alongZ ? d : w) / 2.2) + 1);
  for (const side of [0, 1]) {
    let prev = null;
    for (let i = 0; i < posts; i++) {
      const t = i / (posts - 1); const px = alongZ ? (side ? x1 - 0.12 : x0 + 0.12) : x0 + w * t, pz = alongZ ? z0 + d * t : (side ? z1 - 0.12 : z0 + 0.12);
      add(ctx, box(0.1, 1.1, 0.1), iron, px, 0.55, pz); add(ctx, cone(0.07, 0.22, 4), iron, px, 1.2, pz, { ry: Math.PI / 4 });
      if (prev) slung(ctx, [prev[0], 1.0, prev[1]], [px, 1.0, pz], 0.25); prev = [px, pz];
    }
    if (alongZ) solid(ctx, side ? x1 - 0.2 : x0, z0, side ? x1 : x0 + 0.2, z1, 1.1); else solid(ctx, x0, side ? z1 - 0.2 : z0, x1, side ? z1 : z0 + 0.2, 1.1);
    ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]);
  }
}

// ---------------------------------------------------------------- the rite
// A ritual circle burned into the floor: the sigil (breathing), candles round it, a glow over it.
export function ritualCircle(ctx, x, z, R = 4, o = {}) {
  const col = o.color ?? 0xff2a10;
  decal(ctx, x, z, R * 2, T.sigil(o.kind || 'circle', o.px || 96, o.seed || 41), col, { k: o.k ?? 0.9, pulse: 1.1, phase: x, spin: o.spin });
  floorGlow(ctx, x, z, R * 2.4, R * 2.4, col, o.glow ?? 0.25);
  const n = o.candles ?? Math.round(R * 3); const wax = M.flat(0x3a2a28), fl = M.glow('#ff9a40', 3.2); const RR = T.rng(Math.round(x * 3 + z * 5));
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = R + 0.3; const hh = Math.round((0.1 + RR() * 0.2) * 20) / 20; inst(ctx, 'ab-wax' + hh, cyl(0.04, 0.05, hh, 5), wax, mat4(x + Math.cos(a) * r, hh / 2, z + Math.sin(a) * r)); inst(ctx, 'ab-fl', box(0.05, 0.09, 0.05), fl, mat4(x + Math.cos(a) * r, hh + 0.05, z + Math.sin(a) * r)); }
  if (o.light !== false) ctx.lights.push({ x, y: 1.2, z, color: col, intensity: o.intensity || 4, dist: R * 2, flicker: 0.1 });
}
// A chained altar (front toward ry): a black slab on a stepped base, a bound shape on it, four obsidian
// posts with chains to its corners, a bowl of fire at its foot.
export function altar(ctx, x, z, ry = 0, o = {}) {
  const ob = W2.obsidian(), bs = W2.basalt('#3a3034'), P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(2.8, 0.25, 3.4), bs, 0, 0.12, 0); P(box(2.2, 0.25, 2.8), bs, 0, 0.37, 0); P(box(1.3, 0.6, 2.2), ob, 0, 0.8, 0); for (const sx of [-1, 1]) P(box(0.04, 0.05, 2.22), hot(), sx * 0.66, 1.08, 0, { cast: false });
  if (o.bound !== false) { P(box(0.5, 0.22, 1.5), M.flat(0x2a1414), 0, 1.25, 0.1); P(box(0.3, 0.2, 0.3), M.flat(0x2a1414), 0, 1.26, -0.8); }
  const iron = M.ironLit(); const cs = Math.cos(ry), sn = Math.sin(ry);
  for (const [lx, lz] of [[-1.6, -1.8], [1.6, -1.8], [-1.6, 1.8], [1.6, 1.8]]) {
    const px = x + lx * cs + lz * sn, pz = z - lx * sn + lz * cs; add(ctx, cone(0.22, 2.4, 4), ob, px, 1.2, pz, { ry: 0.4 });
    const ax = x + lx * 0.4 * cs + lz * 0.5 * sn, az = z - lx * 0.4 * sn + lz * 0.5 * cs; slung(ctx, [px, 1.7, pz], [ax, 1.2, az], 0.3);
  }
  const fx = x + 2.0 * sn, fz = z + 2.0 * cs; add(ctx, cyl(0.36, 0.22, 0.4, 7), M.flat(0x1a1214), fx, 0.2, fz); add(ctx, cyl(0.3, 0.3, 0.04, 7), ember(), fx, 0.41, fz, { cast: false });
  flame(ctx, fx, 0.85, fz, 1.1, [2.6, 1.0, 0.6]); ctx.lights.push({ x: fx, y: 1.1, z: fz, color: 0xff4a1a, intensity: 4.5, dist: 6.5, flicker: 0.2, halo: true });
  solidRot(ctx, x, z, ry, 1.45, 1.75, 1.2); solidCircle(ctx, fx, fz, 0.4, 0.6);
}
// A tall iron brazier of red fire on a tripod (the cult's).
export const hellfire = (ctx, x, z, o = {}) => brazier(ctx, x, z, { color: 0xff3a14, coal: '#ff3a14', tint: [2.8, 0.9, 0.5], h: 1.1, intensity: o.intensity || 5, dist: o.dist || 7 });
// A banner of flayed red cloth on an obsidian pole, a sigil on it.
export function banner(ctx, x, z, h = 4.2, ry = 0) {
  add(ctx, cyl(0.06, 0.08, h, 5), W2.obsidian(), x, h / 2, z);
  const tex = pix('ab-banner', 12, 32, (g, W, Hh) => { for (let y = 0; y < Hh; y++) for (let xx = 0; xx < W; xx++) { if (y > Hh - 6 && (xx + y) % 3 === 0) continue; g.fillStyle = (Math.abs(xx - 5.5) < 1 && y > 6 && y < 22) || (Math.abs(y - 12) < 1 && xx > 2 && xx < 10) ? '#e0a040' : ((xx * 7 + y) % 9 === 0 ? '#4a0c0a' : '#6a1210'); g.fillRect(xx, y, 1, 1); } });
  const m = add(ctx, plane(0.75, 2), once('ab-banM', () => cutout(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }))), x + Math.sin(ry) * 0.42, h - 1.2, z + Math.cos(ry) * 0.42, { ry: ry + Math.PI / 2 });
  solidCircle(ctx, x, z, 0.2, h);
  return m;
}
// The rift the wardens came through: a ring of black glass standing on its edge, a red-gold swirl turning in it.
export function rift(ctx, x, z, r = 1.6, ry = Math.PI / 4) {
  const ob = W2.obsidian();
  const ring = add(ctx, geo(`ab-rift${r}`, () => new THREE.TorusGeometry(r, 0.22, 5, 18)), ob, x, r + 0.1, z, { ry }); ring.scale.set(0.8, 1.15, 1);
  const tex = pix('ab-swirl', 48, 48, (g, W) => { const c = W / 2; for (let y = 0; y < W; y++) for (let xx = 0; xx < W; xx++) { const dx = xx + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy) / c; if (d > 1) continue; const a = Math.atan2(dy, dx); const v = 0.5 + 0.5 * Math.sin(a * 3 + d * 9); const k = (1 - d) * 0.6 + v * 0.5; g.fillStyle = k > 0.85 ? '#ffe0a0' : k > 0.65 ? '#ff9a40' : k > 0.45 ? '#d03a14' : k > 0.25 ? '#6a1008' : '#200404'; g.fillRect(xx, y, 1, 1); } });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
  const disc = new THREE.Mesh(geo('ab-disc', () => new THREE.CircleGeometry(1, 20)), mat); disc.position.set(x, r + 0.1, z); disc.rotation.y = ry; disc.scale.set(r * 0.8 - 0.1, r * 1.15 - 0.1, 1); ctx.group.add(disc);
  let t = 0; ctx.anims.push({ update(dt) { t += dt; tex.center.set(0.5, 0.5); tex.rotation = Math.round(t * 1.2 * 16) / 16; return false; } });
  ctx.lights.push({ x: x + 0.8, y: r, z: z + 0.8, color: 0xff6a2a, intensity: 6, dist: 8, flicker: 0.15, halo: true });
  for (let i = 0; i < 5; i++) { const a = i * 1.3; boulder(ctx, x + Math.cos(a) * 1.4, z + Math.sin(a) * 1.4, 0.4, W2.basalt(BASALT), { solid: false }); }
  solidCircle(ctx, x, z, 1, 3);
}
// A cultist's lectern of bone with an open book, and a heap of skulls before an idol of eyes.
export function lectern(ctx, x, z, ry = 0) {
  part(ctx, box(0.4, 1.0, 0.3), M.flat(0x8a7c64), x, z, ry, 0, 0.5, 0); part(ctx, box(0.7, 0.06, 0.5), M.flat(0x1a1010), x, z, ry, 0, 1.06, 0.05, { rx: -0.4 });
  part(ctx, box(0.6, 0.04, 0.4), M.flat(0xb0a080), x, z, ry, 0, 1.1, 0.05, { rx: -0.4 }); part(ctx, box(0.08, 0.03, 0.3), M.glow('#ff4a1a', 1.6), x, z, ry, 0.1, 1.13, 0.05, { rx: -0.4 });
  solidCircle(ctx, x, z, 0.35, 1.1);
}
export function idol(ctx, x, z, h = 3, ry = 0) {
  const ob = W2.obsidian(); add(ctx, box(1.1, h, 0.8), ob, x, h / 2, z, { ry });
  for (let k = 0; k < 3; k++) { const m = part(ctx, plane(0.9, 0.56), eyeMat(2), x, z, ry, 0, h - 0.6 - k * 0.8, 0.41, { cast: false }); }
  add(ctx, cone(0.7, 1.0, 4), ob, x, h + 0.5, z, { ry: ry + Math.PI / 4 });
  bonePile(ctx, x + Math.sin(ry) * 1, z + Math.cos(ry) * 1, 0.7, 6);
  solid(ctx, x - 0.6, z - 0.5, x + 0.6, z + 0.5, h);
}
const eyeMats = new Map();
function eyeMat(open, w = 16, h = 10) { const k = open + ':' + w + ':' + h; if (!eyeMats.has(k)) eyeMats.set(k, new THREE.MeshBasicMaterial({ map: T.eye(open, w, h), alphaTest: 0.5, fog: false, depthWrite: false, color: new THREE.Color(1.25, 1.1, 1.05) })); return eyeMats.get(k); }

// ---------------------------------------------------------------- the wheel of eyes
// A vast wheel hanging in the air over the great circle (o.h metres up, turned to face the camera): concentric
// rings of glyphs turning against each other, eyes set round them that blink, and at the hub a great eye
// whose pupil follows the warden. The rings glow (additive) so the fight under them stays readable; nothing
// on it writes depth. game.js does not need to know: the eye reads the hero from window.BM when it can.
export function wheel(ctx, x, z, o = {}) {
  const f = new THREE.Vector3(-0.54, -0.64, -0.54).normalize(); const Y = new THREE.Vector3(0, 1, 0);
  const u = Y.clone().addScaledVector(f, -Y.dot(f)).normalize(); const rgt = new THREE.Vector3().crossVectors(f, u).normalize();
  const c = new THREE.Vector3(x, o.h ?? 12, z);
  const grp = new THREE.Group(); grp.position.copy(c); grp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rgt, u, f.clone().negate())); ctx.group.add(grp);
  const ringMat = (k) => new THREE.MeshBasicMaterial({ map: T.sigil('ring', 128, 200 + k), color: new THREE.Color(0.6, 0.22, 0.1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const radii = o.radii || [5.2, 8.6, 12.4]; const rings = [];
  radii.forEach((R, k) => {
    const g = new THREE.Group(); grp.add(g);
    const disc = new THREE.Mesh(plane(R * 2 + 1.6, R * 2 + 1.6), ringMat(k)); disc.position.z = -0.02 * k; g.add(disc);
    const band = new THREE.Mesh(geo(`ab-band${R}`, () => new THREE.RingGeometry(R - 0.1, R + 0.1, 64)), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.34, 0.14), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); g.add(band);
    const n = Math.round(R * 2 * Math.PI / 2.6); const eyes = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2; const e = new THREE.Mesh(plane(1, 0.625), eyeMat(2)); e.position.set(Math.cos(a) * (R - 0.85), Math.sin(a) * (R - 0.85), 0.05); g.add(e);
      eyes.push({ m: e, t: Math.random() * 8 });
    }
    rings.push({ g, speed: (k % 2 ? -1 : 1) * (0.05 + k * 0.025), eyes });
  });
  // the hub: a great eye (lids and white), an iris and pupil that move
  const S = 48, H = 28;
  const white = pix('ab-white', S, H, (g2) => { for (let y = 0; y < H; y++) for (let xx = 0; xx < S; xx++) { const dx = (xx + 0.5 - S / 2) / (S / 2), dy = (y + 0.5 - H / 2) / (H / 2); const lid = 1 - dx * dx; if (Math.abs(dy) > lid + 0.12) continue; g2.fillStyle = Math.abs(dy) > lid - 0.06 ? '#2a0806' : ((xx + y) % 7 === 0 ? '#c8b49c' : '#e4d4bc'); g2.fillRect(xx, y, 1, 1); } });
  const hub = new THREE.Mesh(plane(S / 16, H / 16), new THREE.MeshBasicMaterial({ map: white, alphaTest: 0.5, fog: false, depthWrite: false, color: new THREE.Color(1.2, 1.1, 1.05) })); hub.position.z = 0.1; grp.add(hub);
  const irisT = pix('ab-iris', 20, 20, (g2) => { for (let y = 0; y < 20; y++) for (let xx = 0; xx < 20; xx++) { const d = Math.hypot(xx + 0.5 - 10, y + 0.5 - 10); if (d > 9.5) continue; g2.fillStyle = Math.abs(xx + 0.5 - 10) < 1.5 && d < 8 ? '#000000' : d < 4 ? '#3a0402' : d < 7 ? ((xx * 3 + y) % 4 === 0 ? '#ff9a3a' : '#d42a10') : '#7a1008'; g2.fillRect(xx, y, 1, 1); } });
  const iris = new THREE.Mesh(plane(20 / 16, 20 / 16), new THREE.MeshBasicMaterial({ map: irisT, alphaTest: 0.5, fog: false, depthWrite: false, color: new THREE.Color(1.4, 1.2, 1.1) })); iris.position.z = 0.15; grp.add(iris);
  const lidM = new THREE.MeshBasicMaterial({ color: 0x1a0606, fog: false, depthWrite: false }); const lidT = new THREE.Mesh(plane(S / 16 + 0.2, H / 32 + 0.1), lidM), lidB = new THREE.Mesh(plane(S / 16 + 0.2, H / 32 + 0.1), lidM); lidT.position.z = lidB.position.z = 0.2; grp.add(lidT); grp.add(lidB); hub.renderOrder = 6; iris.renderOrder = 7; lidT.renderOrder = lidB.renderOrder = 8;
  const glowM = new THREE.Mesh(plane(9, 9), new THREE.MeshBasicMaterial({ map: T.glow('#ffffff', 32, 1.2), color: new THREE.Color(0.9, 0.18, 0.06), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); glowM.position.z = -0.1; grp.add(glowM);
  ctx.lights.push({ x, y: 4, z: z - 4, color: 0xff3010, intensity: 3, dist: 14, flicker: 0.05 });
  let t = 0, blink = 3, look = new THREE.Vector2();
  const eyeTex = [eyeMat(0), eyeMat(1), eyeMat(2)];
  let dying = -1; // the story no longer lets the wheel die with the Archon: it wakes (STORY_BIBLE.md, end of Act II)
  let wake = 0;
  const ringMats = rings.map((r) => r.g.children.filter((m) => m.material && m.material.transparent).map((m) => m.material)).flat();
  ctx.anims.push({ update(dt) {
    const G = typeof window !== 'undefined' && window.BM && window.BM.game;
    // when the Archon falls the wheel starts to turn instead (the story's scene sets game.wheelWakes)
    if (G && G.wheelWakes) { wake = Math.min(1, wake + dt / 2.5); dying = -1; }
    if (dying >= 0) {
      if (dying >= 1) { grp.visible = false; return false; }
      dying = Math.min(1, dying + dt / 3.5); const a = 1 - dying;
      for (const m of ringMats) m.opacity = a; glowM.material.opacity = a;
      for (const r of rings) for (const e of r.eyes) e.m.material = eyeTex[0];
      lidT.position.y = H / 32 / 2 + 0.05; lidB.position.y = -(H / 32 / 2 + 0.05); hub.visible = iris.visible = dying < 0.4;
      return false;
    }
    t += dt * (1 + wake * 5); if (wake) { glowM.material.color.setRGB(1.6 * wake + 0.4, 0.3, 0.1); }
    for (const r of rings) { r.g.rotation.z = Math.round(t * r.speed * 64) / 64; for (const e of r.eyes) { e.m.rotation.z = -r.g.rotation.z; e.t -= dt; if (e.t < 0) e.t = 3 + Math.random() * 7; e.m.material = e.t < 0.12 ? eyeTex[0] : (e.t < 0.24 ? eyeTex[1] : eyeTex[2]); } }
    // the great eye looks toward the warden (window.BM.game.world.hero), and blinks now and then
    const h = typeof window !== 'undefined' && window.BM && window.BM.game && window.BM.game.world && window.BM.game.world.hero;
    if (h) { const d = new THREE.Vector3(h.x - c.x, 0 - c.y, h.z - c.z); const tx = Math.max(-1, Math.min(1, d.dot(rgt) / 10)), ty = Math.max(-1, Math.min(1, d.dot(u) / 10)); look.lerp(new THREE.Vector2(tx, ty), Math.min(1, dt * 3)); }
    iris.position.x = Math.round(look.x * 0.75 * 16) / 16; iris.position.y = Math.round(look.y * 0.32 * 16) / 16;
    blink -= dt; if (blink < 0) blink = 4 + Math.random() * 5; const k = blink < 0.25 ? 1 - Math.abs(blink - 0.125) / 0.125 : 0;
    lidT.position.y = H / 32 / 2 + 0.875 * (1 - k) + 0.05; lidB.position.y = -(H / 32 / 2 + 0.875 * (1 - k) + 0.05); lidT.visible = lidB.visible = true;
    glowM.material.color.setRGB(0.9 * (0.8 + 0.2 * Math.sin(t * 1.3)), 0.18, 0.06);
    return false;
  } });
  return grp;
}
// Rocks hanging in the void below (set dressing, no solids), and the far lava.
export function floatingRock(ctx, x, y, z, s = 1.5) {
  const R = T.rng(Math.round(x * 7 + z * 13)); const m = add(ctx, geo('ab-frock', () => new THREE.ConeGeometry(0.6, 1.6, 5)), hdeep(W2.basalt(BASALT2), 14), x, y, z, { rx: Math.PI, ry: R() * 6, cast: false }); m.scale.set(s, s * (1 + R()), s);
  add(ctx, box(s * 1.1, 0.3, s * 1.1), hdeep(W2.basalt(BASALT), 14), x, y + s * 0.8, z, { ry: R() * 3, cast: false });
}
