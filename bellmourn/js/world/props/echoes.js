// Props for Act IV, region III: the Hall of Echoes (PROPOSAL: names and descriptions are proposals for the author).
// The Voice remembers every battle fought for it and against it, and keeps them here: an endless hall of black
// mirror floors and silver frames, where the places the wardens fought through stand again as memories made of
// grey glass, the gallows of Gallows Gate, the lamps of Lantern Row, the Great Bell of the Belfry, and where the
// bosses they felled step out of the mirrors to fight again. Mirrors on every wall show the warden a moment late.
// At the end, one great mirror, cracked from frame to frame, and in the crack an eye.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, bar, floorGlow, decal } from '../kit2.js';
import { glowSprite } from '../kit3.js';
import { W4, glassM, goldM4, glowM, motes } from '../kit4.js';

const TAU = Math.PI * 2;
export const VOID = 0x07070c;
const silverM = () => once('ec-silver', () => cutout(new THREE.MeshPhongMaterial({ color: 0xb8bccc, specular: 0xffffff, shininess: 90, emissive: 0x101018 })));
const darkM = () => once('ec-dark', () => cutout(new THREE.MeshPhongMaterial({ color: 0x1a1a24, specular: 0x6a6a90, shininess: 60 })));
const memM = () => glassM(0xc8c8e0, 0.45, 0.35); // the grey glass that memories are made of
const memEdge = () => glassM(0xe8e8ff, 0.7, 0.8);

// ---------------------------------------------------------------- mirrors
// A wall of tall mirrors in silver frames along an edge (axis-aligned), each pane faintly showing a ghost of light
// that drifts across it; solid. o.h height; o.gap: [from, to] along the wall left open.
export function mirrorWall(ctx, x0, z0, x1, z1, o = {}) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const h = o.h ?? 3.6; const n = Math.max(1, Math.round(len / 1.8)); const step = len / n;
  const ghosts = [];
  for (let i = 0; i < n; i++) {
    const c = (ax ? x0 : z0) + (i + 0.5) * step; if (o.gap && c > o.gap[0] && c < o.gap[1]) continue;
    const cx = ax ? c : x0, cz = ax ? z0 : c; const hs = step / 2;
    solid(ctx, ax ? cx - hs : cx - 0.25, ax ? cz - 0.25 : cz - hs, ax ? cx + hs : cx + 0.25, ax ? cz + 0.25 : cz + hs, h); // each pane its own solid (a gap stays open)
    add(ctx, box(ax ? step - 0.1 : 0.12, h, ax ? 0.12 : step - 0.1), W4.mirror('#141420'), cx, h / 2, cz);
    add(ctx, box(ax ? step : 0.2, 0.14, ax ? 0.2 : step), silverM(), cx, h + 0.07, cz); add(ctx, box(ax ? 0.12 : 0.22, h + 0.2, ax ? 0.22 : 0.12), silverM(), ax ? cx - step / 2 : cx, (h + 0.2) / 2, ax ? cz : cz - step / 2);
    // the ghost in the glass: a pale shape that drifts across the pane
    const gm = new THREE.Mesh(box(ax ? 0.4 : 0.02, 1.4, ax ? 0.02 : 0.4), new THREE.MeshBasicMaterial({ color: 0xc8d0ff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    gm.position.set(cx + (ax ? 0 : 0.08), 1.3, cz + (ax ? 0.08 : 0)); ctx.group.add(gm); ghosts.push({ m: gm, c, ax, ph: Math.random() * 9, half: step / 2 - 0.3 });
  }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const g of ghosts) { const u = Math.sin(t * 0.3 + g.ph) * g.half; if (g.ax) g.m.position.x = g.c + u; else g.m.position.z = g.c + u; g.m.material.opacity = 0.1 + 0.1 * Math.max(0, Math.sin(t * 0.5 + g.ph)); } } });
}
// A free-standing mirror on a silver stand, turned to ry (low-solid); it shows a pale figure that is not there.
export function standMirror(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(1.3, 2.4, 0.1), W4.mirror('#1a1a28'), 0, 1.5, 0); P(box(1.5, 0.12, 0.16), silverM(), 0, 2.76, 0); P(box(1.5, 0.12, 0.16), silverM(), 0, 0.26, 0);
  for (const s of [-1, 1]) P(box(0.1, 2.6, 0.16), silverM(), s * 0.7, 1.5, 0); P(box(0.9, 0.08, 0.6), silverM(), 0, 0.04, 0);
  P(box(0.34, 1.3, 0.02), new THREE.MeshBasicMaterial({ color: 0xd8dcff, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), 0, 1.4, 0.06);
  solidCircle(ctx, x, z, 0.7, 2.6);
}
// A pillar of stacked mirror drums with silver rings.
export function mirrorPillar(ctx, x, z, h = 5) {
  add(ctx, box(1.0, 0.3, 1.0), silverM(), x, 0.15, z); add(ctx, cyl(0.38, 0.42, h, 8), W4.mirror('#181826'), x, 0.3 + h / 2, z);
  for (let i = 1; i < 4; i++) add(ctx, cyl(0.46, 0.46, 0.08, 8), silverM(), x, 0.3 + i * h / 4, z, { cast: false });
  add(ctx, box(1.1, 0.3, 1.1), silverM(), x, 0.45 + h, z);
  solidCircle(ctx, x, z, 0.5, h);
}

// ---------------------------------------------------------------- memories of places
// The gallows of Gallows Gate, remembered in grey glass: the platform, the beam, a noose of light swinging.
export function memGallows(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(3.2, 0.9, 2.2), memM(), 0, 0.45, 0); for (const s of [-1, 1]) P(box(0.22, 3.4, 0.22), memEdge(), s * 1.2, 2.6, 0);
  P(box(2.8, 0.22, 0.22), memEdge(), 0, 4.2, 0); P(box(0.05, 1.2, 0.05), glowM(0xe8e8ff, 1.6), 0.3, 3.5, 0, { cast: false });
  P(geo('ec-noose', () => new THREE.TorusGeometry(0.18, 0.03, 4, 10)), glowM(0xe8e8ff, 2), 0.3, 2.8, 0, { cast: false });
  floorGlow(ctx, x, z, 5, 4, 0xc8c8ff, 0.16); solid(ctx, x - 1.6, z - 1.1, x + 1.6, z + 1.1, 1.0);
}
// A cell of the gaol, remembered: a cage of bars of light on a grey-glass floor.
export function memCell(ctx, x, z, w = 2.4) {
  add(ctx, box(w, 0.12, w), memM(), x, 0.06, z, { cast: false });
  for (let i = 0; i <= 5; i++) { const u = -w / 2 + i * w / 5; for (const [lx, lz] of [[u, -w / 2], [u, w / 2], [-w / 2, u], [w / 2, u]]) add(ctx, box(0.05, 2.4, 0.05), memEdge(), x + lx, 1.2, z + lz, { cast: false }); }
  add(ctx, box(w, 0.08, w), memEdge(), x, 2.42, z, { cast: false }); solidCircle(ctx, x, z, w * 0.55, 2.4);
}
// A lamp of Lantern Row, remembered: a post of grey glass, a flame of white light that never moves.
export function memLamp(ctx, x, z) {
  add(ctx, cyl(0.06, 0.1, 2.8, 6), memEdge(), x, 1.4, z); add(ctx, box(0.36, 0.48, 0.36), memM(), x, 3.0, z, { cast: false });
  add(ctx, box(0.14, 0.24, 0.14), glowM(0xf0f0ff, 2.6), x, 3.0, z, { cast: false }); glowSprite(ctx, x, 3.0, z, 1.6, 0xe0e4ff, 0.45);
  ctx.lights.push({ x, y: 3, z, color: 0xd8dcff, intensity: 2.6, dist: 6.5, flicker: 0 }); solidCircle(ctx, x, z, 0.2, 2.8);
}
// Candles of Mother Tallow's chapel, remembered: a cluster of grey-glass candles with still white flames.
export function memCandles(ctx, x, z, n = 7) {
  const R = T.rng(Math.round(x * 13 + z * 7));
  for (let i = 0; i < n; i++) { const a = R() * TAU, r = R() * 0.8, h = 0.3 + R() * 0.7; const cx = x + Math.sin(a) * r, cz = z + Math.cos(a) * r; add(ctx, cyl(0.07, 0.08, h, 6), memM(), cx, h / 2, cz, { cast: false }); add(ctx, box(0.05, 0.12, 0.05), glowM(0xffffff, 2.2), cx, h + 0.08, cz, { cast: false }); }
  ctx.lights.push({ x, y: 1, z, color: 0xe8e8ff, intensity: 1.6, dist: 4, flicker: 0 });
}
// The Great Bell of the Belfry, remembered: huge, hanging over the gallery in grey glass, a crack of light in it,
// turning very slowly as if it were about to ring and never does.
export function memBell(ctx, x, y, z, s = 4) {
  const g = new THREE.Group(); g.position.set(x, y, z); ctx.group.add(g);
  const bell = new THREE.Mesh(geo('ec-bell', () => new THREE.CylinderGeometry(0.45, 1, 1.4, 16, 1, true)), new THREE.MeshLambertMaterial({ color: 0xc8c8e0, transparent: true, opacity: 0.32, emissive: 0x30304a, side: THREE.DoubleSide, depthWrite: false }));
  bell.scale.setScalar(s); g.add(bell);
  const lip = new THREE.Mesh(geo('ec-belllip', () => new THREE.TorusGeometry(1, 0.03, 4, 24).rotateX(Math.PI / 2)), glowM(0xe8e8ff, 1.8)); lip.scale.setScalar(s); lip.position.y = -0.7 * s; g.add(lip);
  const crack = new THREE.Mesh(box(0.05, 1.2, 0.02), glowM(0xffffff, 2.4)); crack.scale.setScalar(s); crack.position.set(0.2 * s, 0, 0.72 * s); crack.rotation.z = 0.3; g.add(crack);
  const chain = new THREE.Mesh(box(0.08, 12, 0.08), memEdge()); chain.position.y = 0.7 * s + 6; g.add(chain);
  floorGlow(ctx, x, z, s * 3, s * 3, 0xc8c8ff, 0.18);
  let t = 0; ctx.anims.push({ update(dt) { t += dt; g.rotation.y = Math.round(t * 0.05 * 64) / 64; g.rotation.z = Math.round(Math.sin(t * 0.4) * 0.03 * 128) / 128; } });
}
// A broken stair of the belfry, remembered: steps of grey glass climbing into nothing.
export function memStair(ctx, x, z, ry = 0, n = 8) {
  for (let i = 0; i < n; i++) part(ctx, box(1.6, 0.18, 0.5), i % 3 === 2 ? memEdge() : memM(), x, z, ry, 0, 0.2 + i * 0.36, -i * 0.45);
  solid(ctx, x - 0.8, z - n * 0.45, x + 0.8, z + 0.3, 1.2);
}

// ---------------------------------------------------------------- masks, wardens, the great mirror
// The wall of masks: the faces of every boss the hall remembers, in silver, hung in rows on a dark wall, their
// eyes lit. Solid along its length.
export function maskWall(ctx, x0, z0, x1, z1) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const R = T.rng(Math.round(x0 * 3 + z1));
  add(ctx, box(ax ? len : 0.3, 3.4, ax ? 0.3 : len), darkM(), ax ? (x0 + x1) / 2 : x0, 1.7, ax ? z0 : (z0 + z1) / 2);
  const n = Math.round(len / 1.1);
  for (const y of [1.0, 2.2]) for (let i = 0; i < n; i++) { const c = (ax ? x0 : z0) + (i + 0.5) * len / n; const mx = ax ? c : x0 + 0.2, mz = ax ? z0 + 0.2 : c; add(ctx, box(ax ? 0.5 : 0.08, 0.62, ax ? 0.08 : 0.5), silverM(), mx, y, mz); const eye = glowM([0xff4040, 0xffc040, 0x80d8ff, 0xc080ff][Math.floor(R() * 4)], 2.4); for (const s of [-1, 1]) add(ctx, box(ax ? 0.08 : 0.04, 0.05, ax ? 0.04 : 0.08), eye, mx + (ax ? s * 0.11 : 0.05), y + 0.08, mz + (ax ? 0.05 : s * 0.11), { cast: false }); }
  solid(ctx, ax ? x0 : x0 - 0.3, ax ? z0 - 0.3 : z0, ax ? x1 : x0 + 0.3, ax ? z0 + 0.3 : z1, 3.4);
}
// A fallen warden of an earlier age, remembered: kneeling in grey glass, head bowed on the hilt of a sword.
export function memWarden(ctx, x, z, ry = 0) {
  const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(0.5, 0.5, 0.7), memM(), 0, 0.25, 0); P(box(0.5, 0.7, 0.34), memM(), 0, 0.85, 0.05, { rx: 0.25 }); P(box(0.24, 0.26, 0.24), memEdge(), 0, 1.32, 0.16);
  P(box(0.06, 1.3, 0.12), memEdge(), 0, 0.65, 0.5); P(box(0.4, 0.06, 0.08), memEdge(), 0, 1.2, 0.5);
  solidCircle(ctx, x, z, 0.4, 1.4);
}
// The great mirror at the end of the hall: wider than a house, in a frame of silver and black, cracked from top
// to bottom; in the crack, an eye of gold light that opens slowly and looks at whoever stands before it.
export function greatMirror(ctx, x, z, w = 12) {
  const h = 6.2; // low enough that the eye shows in the camera's frame
  add(ctx, box(w, h, 0.3), W4.mirror('#10101a'), x, h / 2, z); add(ctx, box(w + 0.8, 0.6, 0.5), silverM(), x, h + 0.3, z); add(ctx, box(w + 0.8, 0.5, 0.5), silverM(), x, 0.25, z);
  for (const s of [-1, 1]) add(ctx, box(0.6, h + 1, 0.5), silverM(), x + s * (w / 2 + 0.1), (h + 1) / 2, z);
  // the crack: a jagged line of light from top to bottom
  let px = x + 0.4, py = h; for (let i = 0; i < 9; i++) { const nx = x + (Math.random() - 0.5) * 1.6, ny = py - h / 9; bar(ctx, 'ec-crack', glowM(0xffe8b0, 2.4), [px, py, z + 0.18], [nx, ny, z + 0.18], 0.07); px = nx; py = ny; }
  // the eye in the crack
  const eye = new THREE.Group(); eye.position.set(x, h * 0.58, z + 0.22); ctx.group.add(eye);
  const white = new THREE.Mesh(geo('ec-eyew', () => new THREE.CircleGeometry(1, 20)), glowM(0xfff0d0, 1.6)); white.scale.set(1.6, 0.9, 1); eye.add(white);
  const iris = new THREE.Mesh(geo('ec-eyei', () => new THREE.CircleGeometry(1, 16)), glowM(0xffa020, 2.4)); iris.scale.setScalar(0.55); iris.position.z = 0.01; eye.add(iris);
  const pupil = new THREE.Mesh(geo('ec-eyep', () => new THREE.CircleGeometry(1, 12)), M.flat(0x080402)); pupil.scale.set(0.16, 0.4, 1); pupil.position.z = 0.02; eye.add(pupil);
  glowSprite(ctx, x, h * 0.58, z + 0.5, 6, 0xffc060, 0.5);
  ctx.lights.push({ x, y: h * 0.58, z: z + 2, color: 0xffc070, intensity: 6, dist: 16, flicker: 0.03 });
  floorGlow(ctx, x, z + 6, w, 12, 0xffb050, 0.16);
  let t = 0; ctx.anims.push({ update(dt) { t += dt; const open = 0.15 + 0.85 * Math.max(0, Math.sin(t * 0.25)); eye.scale.set(1, Math.round(open * 16) / 16, 1); iris.position.x = Math.round(Math.sin(t * 0.4) * 0.35 * 16) / 16; } });
  solid(ctx, x - w / 2 - 0.4, z - 0.4, x + w / 2 + 0.4, z + 0.4, h);
}
// The floor's sigil of the hall: rings of silver inlaid in the black mirror, slowly turning (a decal).
export function floorRings(ctx, x, z, r = 6) {
  decal(ctx, x, z, r * 2, T.sigil('circle', 128, 4720 + Math.round(x + z)), 0xc8c8f0, { k: 0.3, pulse: 0.4, spin: 0.005 });
}
// Shards of memory floating in the air: flat pieces of mirror turning slowly, each catching a little light.
export function floatShards(ctx, x0, z0, x1, z1, n = 12, y0 = 2.5) {
  const R = T.rng(Math.round(x0 * 7 + z0 * 3 + n)); const list = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(box(0.5 + R() * 0.6, 0.6 + R() * 0.8, 0.04), W4.mirror('#2a2a40')); m.position.set(x0 + R() * (x1 - x0), y0 + R() * 4, z0 + R() * (z1 - z0)); m.rotation.set(R(), R() * TAU, R()); ctx.group.add(m); list.push({ m, sp: (R() - 0.5) * 0.6, by: m.position.y, ph: R() * 9 }); }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const s of list) { s.m.rotation.y += dt * s.sp; s.m.position.y = s.by + Math.round(Math.sin(t * 0.6 + s.ph) * 0.25 * 32) / 32; } } });
}
