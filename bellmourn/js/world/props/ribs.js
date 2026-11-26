// Props for Act V, region I: the Ribcage Cathedral (PROPOSAL: names and descriptions are proposals for the author).
// The God's Dream begins inside a body: a colossal figure of bronze lying in the dark, and in its chest a church has
// grown. Its ribs arch overhead like the vaults of a nave, green with age, veined with molten light that pulses
// with a slow heartbeat; the floor is plates of bronze riveted over the dark; the vertebrae of the spine stand like
// columns; the lungs are vast bellows-chambers that breathe out warm mist; the sternum is an altar. At the far end
// the heart: a bronze heart as big as a chapel, its valves cathedral windows, beating, and every beat a pulse of
// light that runs out along the veins of the floor.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, bar, floorGlow, decal } from '../kit2.js';
import { glowSprite } from '../kit3.js';
import { dreamBronze, darkBronze, glowM, breath, breathGlow, vein } from './dream.js';

const TAU = Math.PI * 2;
export const DARK = 0x0c0604;
const verdM = () => once('rb-verd', () => cutout(new THREE.MeshPhongMaterial({ color: 0x5a7a5a, specular: 0xa8c098, shininess: 30, emissive: 0x0a0e08 })));
const sinewM = () => once('rb-sinew', () => cutout(new THREE.MeshLambertMaterial({ color: 0x5a2014, emissive: 0x1a0402 })));
const toothM = () => once('rb-tooth', () => cutout(new THREE.MeshLambertMaterial({ color: 0xd8ccb0 })));

// the heartbeat: every ~2.6 s a double beat; beat(t) is 0..1 (a sharp rise and a fall, twice)
export const BEAT = 2.6;
export const beat = (t) => { const u = (t % BEAT) / BEAT; const p = (c) => Math.max(0, 1 - Math.abs(u - c) / 0.06); return Math.max(p(0.05), 0.7 * p(0.2)); };

// ---------------------------------------------------------------- ribs and spine
// A pair of ribs arching over the floor from one side of a hall to the other, like the vault of a nave: curved
// beams of verdigris bronze meeting at a keel, a vein of molten light along each. (x, z): the middle; span across
// x (axis 'x') or z; h the height of the vault.
export function ribArch(ctx, x, z, span = 14, h = 8, axis = 'x', o = {}) {
  const n = 9; const pts = []; const ax = axis === 'x';
  for (let i = 0; i <= n; i++) { const u = i / n; const a = Math.PI * u; const lx = -Math.cos(a) * span / 2, ly = Math.sin(a) * h + (o.base ?? 0); pts.push(ax ? [x + lx, ly, z] : [x, ly, z + lx]); }
  for (let i = 0; i < n; i++) { bar(ctx, 'rb-rib', verdM(), pts[i], pts[i + 1], 0.55 - Math.abs(i - n / 2) * 0.03); if (i % 2 === 0) bar(ctx, 'rb-ribvein', glowM(0xff7a30, 1.6), [pts[i][0], pts[i][1] - 0.3, pts[i][2] + (ax ? 0.3 : 0)], [pts[i + 1][0], pts[i + 1][1] - 0.3, pts[i + 1][2] + (ax ? 0.3 : 0)], 0.08); }
  for (const s of [0, n]) { const p = pts[s]; add(ctx, box(1.0, 0.6, 1.0), darkBronze(), p[0], 0.3, p[2]); solidCircle(ctx, p[0], p[2], 0.6, 2.4); }
}
// A vertebra of the spine standing as a column: a stack of bronze drums with wings, a cord of light down its middle.
export function vertebra(ctx, x, z, h = 4.4) {
  const k = Math.round(h / 0.9);
  for (let i = 0; i < k; i++) { const y = 0.45 + i * 0.9; add(ctx, cyl(0.55, 0.62, 0.7, 8), i % 2 ? dreamBronze() : verdM(), x, y, z); add(ctx, box(1.6, 0.18, 0.4), dreamBronze(), x, y + 0.1, z, { ry: i * 0.2 }); }
  add(ctx, box(0.14, h, 0.14), glowM(0xffa050, 1.8), x, h / 2, z + 0.58, { cast: false });
  solidCircle(ctx, x, z, 0.7, h);
}
// The spine lying along a way: vertebrae laid end to end as a bridge's kerbs on both sides.
export function spineKerb(ctx, x0, z0, x1, z1) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const n = Math.round(len / 1.3);
  for (let i = 0; i < n; i++) { const c = (ax ? x0 : z0) + (i + 0.5) * len / n; add(ctx, cyl(0.42, 0.42, 0.9, 8), i % 2 ? dreamBronze() : verdM(), ax ? c : x0, 0.4, ax ? z0 : c, { rx: ax ? 0 : Math.PI / 2, rz: ax ? Math.PI / 2 : 0 }); }
  solid(ctx, ax ? x0 : x0 - 0.4, ax ? z0 - 0.4 : z0, ax ? x1 : x0 + 0.4, ax ? z0 + 0.4 : z1, 0.9);
}

// ---------------------------------------------------------------- the lungs, the sternum, the heart
// A lung wall: a great bellows of leather-bronze folds along an edge that swells and sinks with the god's breath,
// warm mist sighing from its seams. Solid.
export function lungWall(ctx, x0, z0, x1, z1, h = 4.6) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const n = Math.round(len / 1.4); const folds = [];
  for (let i = 0; i < n; i++) {
    const c = (ax ? x0 : z0) + (i + 0.5) * len / n; const g = new THREE.Group(); g.position.set(ax ? c : x0, 0, ax ? z0 : c); ctx.group.add(g);
    const m = new THREE.Mesh(box(ax ? len / n * 0.9 : 0.9, h, ax ? 0.9 : len / n * 0.9), sinewM()); m.position.y = h / 2; m.castShadow = true; g.add(m);
    const rib = new THREE.Mesh(box(ax ? 0.18 : 1.0, h + 0.2, ax ? 1.0 : 0.18), dreamBronze()); rib.position.set(ax ? len / n / 2 : 0, h / 2, ax ? 0 : len / n / 2); g.add(rib);
    folds.push({ g, ph: i * 0.35 });
  }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const f of folds) { const k = breath(t + f.ph); f.g.scale.set(ax ? 1 : 1 + 0.25 * k, 1 + 0.04 * k, ax ? 1 + 0.25 * k : 1); } } });
  solid(ctx, ax ? x0 : x0 - 0.6, ax ? z0 - 0.6 : z0, ax ? x1 : x0 + 0.6, ax ? z0 + 0.6 : z1, h);
}
// The sternum altar: the breastbone laid flat as an altar on steps, candles of molten light, a reliquary.
export function sternum(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(5, 0.3, 3), darkBronze(), 0, 0.15, 0); P(box(4, 0.3, 2.2), dreamBronze(), 0, 0.45, 0);
  P(box(1.2, 0.9, 3.6), verdM(), 0, 1.05, -0.2); for (let i = 0; i < 4; i++) P(box(2.2, 0.16, 0.3), verdM(), 0, 1.2, -1.6 + i * 0.95);
  for (const s of [-1.6, -0.8, 0.8, 1.6]) { P(cyl(0.06, 0.07, 0.5, 5), toothM(), s, 0.85, 0.9); P(box(0.08, 0.16, 0.08), glowM(0xffa040, 2.4), s, 1.18, 0.9, { cast: false }); }
  ctx.lights.push({ x, y: 1.8, z, color: 0xff9040, intensity: 3.4, dist: 8, flicker: 0.1 });
  solidCircle(ctx, x, z, 2.0, 1.4);
}
// The heart: a bronze heart as big as a chapel, its four chambers domes, its great vessels rising like towers,
// its valves windows of molten glass; it beats (a double beat), every beat a flash through the windows and a
// pulse along the veins of the floor (o.veins: floor points the veins run out to).
export function heart(ctx, x, z, o = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); ctx.group.add(g);
  const body = new THREE.Group(); g.add(body);
  const P = (geom, m, lx, ly, lz, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(geom, m); me.position.set(lx, ly, lz); me.rotation.set(rx, ry, rz); me.castShadow = true; body.add(me); return me; };
  P(geo('rb-heart', () => new THREE.SphereGeometry(3, 12, 10)), dreamBronze(0x8a4a24), 0, 3.4, 0);
  P(geo('rb-heart2', () => new THREE.SphereGeometry(2.4, 10, 8)), dreamBronze(0x7a3e1e), -1.6, 4.2, 0.6);
  P(geo('rb-heart3', () => new THREE.ConeGeometry(2.6, 3.2, 10)), dreamBronze(0x8a4a24), 0.4, 1.0, 0, Math.PI, 0, 0.3);
  for (const [lx, lz, r, h, tilt] of [[0.8, -0.6, 0.8, 5, 0.2], [-0.8, -1, 0.7, 4.4, -0.3], [1.8, 0.4, 0.55, 3.6, 0.5]]) P(cyl(r * 0.8, r, h, 8), verdM(), lx, 6 + h / 2 - 1, lz, 0, 0, tilt);
  const wins = []; for (const [lx, ly, lz, ry] of [[0, 3.6, 2.95, 0], [2.4, 3.8, 1.6, 1.0], [-2.3, 4.4, 1.6, -0.9], [0.6, 2.2, 2.6, 0.3]]) { const w = P(box(0.8, 1.4, 0.1), glowM(0xff6020, 1.4), lx, ly, lz, 0, ry, 0); wins.push(w); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; bar(ctx, 'rb-artery', sinewM(), [x + Math.sin(a) * 2.6, 2.2, z + Math.cos(a) * 2.6], [x + Math.sin(a) * 4.6, 0.1, z + Math.cos(a) * 4.6], 0.3); }
  for (const p of o.veins || []) vein(ctx, [x, z], p, 0xff6a20, { w: 0.22, k: 2 });
  floorGlow(ctx, x, z, 14, 14, 0xff5a20, 0.25);
  const glow = breathGlow(ctx, x, 3.6, z, 9, 0xff6a30, 0.8);
  const L = { x, y: 3.6, z: z + 3.4, color: 0xff7030, intensity: 5, dist: 16, flicker: 0 }; ctx.lights.push(L);
  let t = 0; ctx.anims.push({ update(dt) { t += dt; const b = beat(t); const s = 1 + 0.06 * b; body.scale.set(s, s, s); for (const w of wins) w.scale.y = 1 + 0.3 * b; glow.material.opacity = 0.5 + 0.5 * b; return false; } });
  solidCircle(ctx, x, z, 3.4, 6);
}

// ---------------------------------------------------------------- smaller things
// A finger bone of the giant lying on the floor: three bronze knuckles, longer than a man is tall.
export function finger(ctx, x, z, ry = 0, s = 1) {
  const c = Math.cos(ry), sn = Math.sin(ry);
  for (let i = 0; i < 3; i++) { const d = (i - 1) * 1.5 * s; add(ctx, cyl(0.32 * s, 0.38 * s, 1.4 * s, 7), i % 2 ? verdM() : dreamBronze(), x + sn * d, 0.36 * s, z + c * d, { rz: Math.PI / 2, ry }); add(ctx, geo('rb-knuckle', () => new THREE.SphereGeometry(0.42, 7, 5)), darkBronze(), x + sn * (d + 0.75 * s), 0.38 * s, z + c * (d + 0.75 * s), { s: new THREE.Vector3(s, s, s) }); }
  for (let k = -1; k <= 1; k++) solidCircle(ctx, x + sn * k * 1.5 * s, z + c * k * 1.5 * s, 0.45 * s, 0.8);
}
// A row of the giant's teeth set in the floor like the stones of a choir, worn smooth, a candle on each.
export function teeth(ctx, x0, z0, x1, z1) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const n = Math.round(len / 1.1); const R = T.rng(Math.round(x0 * 9 + z0));
  for (let i = 0; i < n; i++) { const c = (ax ? x0 : z0) + (i + 0.5) * len / n; const h = 1.1 + R() * 0.5; const tx = ax ? c : x0, tz = ax ? z0 : c; add(ctx, box(0.8, h, 0.7), toothM(), tx, h / 2, tz); if (i % 2) add(ctx, box(0.08, 0.16, 0.08), glowM(0xffb060, 2.4), tx, h + 0.1, tz, { cast: false }); }
  solid(ctx, ax ? x0 : x0 - 0.4, ax ? z0 - 0.4 : z0, ax ? x1 : x0 + 0.4, ax ? z0 + 0.4 : z1, 1.4);
}
// Sinews hanging from the dark above (cables of red-bronze), swaying with the breath.
export function sinews(ctx, x, z, n = 4) {
  const R = T.rng(Math.round(x * 5 + z * 3)); const list = [];
  for (let i = 0; i < n; i++) { const pv = new THREE.Group(); pv.position.set(x + (R() - 0.5) * 2, 10, z + (R() - 0.5) * 2); ctx.group.add(pv); const L = 4 + R() * 4; const m = new THREE.Mesh(box(0.12, L, 0.12), sinewM()); m.position.y = -L / 2; pv.add(m); list.push({ pv, ph: R() * 9 }); }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const s of list) s.pv.rotation.z = Math.round(Math.sin(t * 0.5 + s.ph) * 0.06 * 64) / 64; } });
}
// A homunculus frozen at prayer: a small figure of bronze kneeling, its seams still glowing a little.
export function prayer(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(0.4, 0.36, 0.5), dreamBronze(), 0, 0.18, 0); P(box(0.36, 0.44, 0.26), dreamBronze(), 0, 0.58, 0.04, { rx: 0.3 }); P(box(0.22, 0.22, 0.22), darkBronze(), 0, 0.92, 0.14);
  P(box(0.04, 0.3, 0.04), glowM(0xff8030, 2), 0, 0.6, 0.18, { cast: false });
  solidCircle(ctx, x, z, 0.32, 1);
}
// Rivet plates on the floor: a grid of darker plates with glowing seams between some (a decal-free look: thin bars).
export function plates(ctx, x0, z0, x1, z1) {
  const R = T.rng(Math.round(x0 * 11 + z0 * 13));
  // a few seams, broken and irregular, not a grid: a short run here and there that glows faintly
  const n = Math.round(((x1 - x0) * (z1 - z0)) / 60);
  for (let i = 0; i < n; i++) { const x = x0 + 1 + R() * (x1 - x0 - 2), z = z0 + 1 + R() * (z1 - z0 - 2), L = 1.5 + R() * 3; const along = R() < 0.5; vein(ctx, [x, z], along ? [Math.min(x1 - 0.5, x + L), z] : [x, Math.min(z1 - 0.5, z + L)], 0x6a2a0a, { w: 0.05, k: 1.0, phase: R() * 5 }); }
}
