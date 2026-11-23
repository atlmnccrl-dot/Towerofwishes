// Props for Act III, region II: the Clockwork Spire, the Wheel's machinery. Decks of brass and tread plate
// and catwalks of grating hung over a violet drop, girders falling away under them; gears the size of
// houses turning beside the walks and far below; pistons pumping, steam bursting from vents, chains
// hanging out of the dark above; the pendulum and its escapement, the cage lift the wardens ride up, work
// lamps, and the great clock face of the Clockmaster's chamber. Far above, the rim of the Wheel.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, plane, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { voidFill } from './belfry.js';
import { sparks } from './foundry.js';
import { once, put, bar, pix, chain, slung, floorGlow, solidRot } from '../kit2.js';
import { W3, fade, brassM, darkBrassM, steelM, skyLayer, faceCam, puffs, glowSprite, seg } from '../kit3.js';
export { voidFill, sparks, floorGlow, chain };

export const VIOLET = 0x1c1632;
export { steelM, brassM };
const deepM = (m, r = 12) => fade(m, VIOLET, r);
const ironM = () => M.ironLit();

// ---------------------------------------------------------------- decks and catwalks
// A deck: tread plate (or brass, o.mat) on a frame, an iron kerb round it, and under the sides we see a
// lattice of girders falling into the violet dark.
export function deck(ctx, x0, z0, x1, z1, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  add(ctx, box(w, 0.3, d), o.mat || W3.tread(o.tone || '#4a4e5a'), cx, -0.15, cz, { cast: false });
  add(ctx, box(w, 1.2, d), deepM(W3.brass('#5a4628'), 6), cx, -0.9, cz, { cast: false });
  const kerb = steelM();
  for (const s of [0, 1]) { add(ctx, box(w + 0.1, 0.12, 0.14), kerb, cx, 0.02, s ? z1 - 0.07 : z0 + 0.07, { cast: false }); add(ctx, box(0.14, 0.12, d), kerb, s ? x1 - 0.07 : x0 + 0.07, 0.02, cz, { cast: false }); }
  girders(ctx, x0, z0, x1, z1, o.depth ?? 14);
}
// The lattice under a deck's two near faces (+x and +z): columns every 3 m, diagonal braces, rivet plates.
export function girders(ctx, x0, z0, x1, z1, depth = 14) {
  const gm = deepM(steelM(), depth * 0.8);
  for (const f of ['x', 'z']) {
    const len = f === 'x' ? z1 - z0 : x1 - x0; const n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= n; i++) {
      const p = (f === 'x' ? z0 : x0) + i * len / n; const px = f === 'x' ? x1 - 0.2 : p, pz = f === 'x' ? p : z1 - 0.2;
      put(ctx, 'sp-col', gm, px, -1.5 - depth / 2, pz, 0.3, depth, 0.3);
      if (i < n) for (let k = 0; k < 3; k++) {
        const y0 = -1.6 - k * 3.4, y1 = y0 - 3.4; const q = (f === 'x' ? z0 : x0) + (i + 1) * len / n;
        const a = f === 'x' ? [px, y0, p] : [p, y0, pz], b = f === 'x' ? [px, y1, q] : [q, y1, pz];
        bar(ctx, 'sp-brace', gm, a, b, 0.12); bar(ctx, 'sp-brace', gm, f === 'x' ? [px, y0, q] : [q, y0, pz], f === 'x' ? [px, y1, p] : [p, y1, pz], 0.12);
        put(ctx, 'sp-tie', gm, f === 'x' ? px : (p + q) / 2, y0, f === 'x' ? (p + q) / 2 : pz, f === 'x' ? 0.2 : q - p, 0.2, f === 'x' ? q - p : 0.2);
      }
    }
  }
}
// A catwalk of grating with railings both sides (posts, top and mid rails), I-beam stringers, a V-truss
// under it and chains hanging off it into the drop.
export function catwalk(ctx, x0, z0, x1, z1, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const alongZ = d >= w; const st = steelM();
  add(ctx, box(w, 0.1, d), W3.grate(), cx, -0.05, cz, { cast: false });
  const len = alongZ ? d : w, n = Math.max(2, Math.round(len / 1.2));
  for (const s of [-1, 1]) {
    const ex = alongZ ? cx + s * (w / 2 - 0.06) : cx, ez = alongZ ? cz : cz + s * (d / 2 - 0.06);
    add(ctx, box(alongZ ? 0.12 : w, 0.32, alongZ ? d : 0.12), deepM(st, 3), ex, -0.24, ez, { cast: false });
    if (o.rails !== false) {
      for (let i = 0; i <= n; i++) { const t = -len / 2 + i * len / n; put(ctx, '!sp-rpost', st, alongZ ? ex : cx + t, 0.5, alongZ ? cz + t : ez, 0.07, 1.0, 0.07); }
      for (const y of [0.98, 0.52]) put(ctx, '!sp-rail', brassM(), ex, y, ez, alongZ ? 0.06 : w, 0.06, alongZ ? d : 0.06);
    }
  }
  const tr = deepM(st, 6);
  for (let i = 0; i < n; i++) { const t0 = -len / 2 + i * len / n, t1 = t0 + len / n; const P = (t, y, s) => alongZ ? [cx + s * (w / 2 - 0.1), y, cz + t] : [cx + t, y, cz + s * (d / 2 - 0.1)]; const C = (t, y) => alongZ ? [cx, y, cz + t] : [cx + t, y, cz]; bar(ctx, 'sp-vt', tr, P(t0, -0.35, 1), C((t0 + t1) / 2, -1.6), 0.08); bar(ctx, 'sp-vt', tr, C((t0 + t1) / 2, -1.6), P(t1, -0.35, 1), 0.08); }
  if (alongZ) put(ctx, 'sp-keel', tr, cx, -1.6, cz, 0.12, 0.12, d); else put(ctx, 'sp-keel', tr, cx, -1.6, cz, w, 0.12, 0.12);
}

// ---------------------------------------------------------------- gears
// A gear: a toothed wheel with spokes cut through it (R metres to the tooth tips), turning about its axis
// ('x', 'y' or 'z') at o.speed radians a second (stepped to the pixel grid). o.mat: brass by default.
export function gearGeo(R, teeth, thick, spokes = 6) {
  return geo(`sp-gear${R},${teeth},${thick},${spokes}`, () => {
    const s = new THREE.Shape(); const r0 = R - Math.min(0.5, R * 0.12), r1 = R; const n = teeth * 4;
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; const ph = i % 4; const r = ph === 1 || ph === 2 ? r1 : r0; const p = [Math.cos(a) * r, Math.sin(a) * r]; if (i === 0) s.moveTo(...p); else s.lineTo(...p); }
    const rim = r0 - Math.max(0.25, R * 0.12), hub = Math.max(0.35, R * 0.18), sw = Math.max(0.12, R * 0.07);
    if (R > 1) for (let k = 0; k < spokes; k++) {
      const a0 = k / spokes * Math.PI * 2, a1 = (k + 1) / spokes * Math.PI * 2; const h = new THREE.Path();
      const da0 = sw / hub, da1 = sw / rim; h.moveTo(Math.cos(a0 + da0) * hub, Math.sin(a0 + da0) * hub);
      for (let j = 0; j <= 8; j++) { const a = a0 + da1 + (a1 - a0 - 2 * da1) * j / 8; h.lineTo(Math.cos(a) * rim, Math.sin(a) * rim); }
      h.lineTo(Math.cos(a1 - da0) * hub, Math.sin(a1 - da0) * hub); h.lineTo(Math.cos(a0 + da0) * hub, Math.sin(a0 + da0) * hub); s.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -thick / 2); return g;
  });
}
export function gear(ctx, x, y, z, R = 3, o = {}) {
  const teeth = o.teeth ?? Math.max(8, Math.round(R * 5)); const thick = o.thick ?? Math.max(0.2, R * 0.12);
  const grp = new THREE.Group(); grp.position.set(x, y, z); ctx.group.add(grp);
  if (o.axis === 'x') grp.rotation.y = Math.PI / 2; else if (o.axis === 'y') grp.rotation.x = -Math.PI / 2;
  if (o.tilt) grp.rotation.z += o.tilt;
  const spin = new THREE.Group(); grp.add(spin);
  const mat = o.deep ? deepM(o.mat || brassM(), o.deep) : (o.mat || brassM());
  const m = new THREE.Mesh(gearGeo(R, teeth, thick, o.spokes ?? 6), mat); m.castShadow = o.cast !== false; m.receiveShadow = true; spin.add(m);
  const hubM = o.deep ? deepM(steelM(), o.deep) : steelM();
  const hub = new THREE.Mesh(cyl(Math.max(0.3, R * 0.16), Math.max(0.3, R * 0.16), thick * 1.6, 8), hubM); hub.rotation.x = Math.PI / 2; hub.castShadow = o.cast !== false; spin.add(hub);
  if (o.axle) { const ax = new THREE.Mesh(cyl(Math.max(0.12, R * 0.06), Math.max(0.12, R * 0.06), o.axle, 6), hubM); ax.rotation.x = Math.PI / 2; grp.add(ax); }
  let a = o.phase ?? 0; const sp = o.speed ?? (0.3 / R); const step = Math.PI * 2 / (teeth * 8);
  ctx.anims.push({ update(dt) { a += sp * dt; spin.rotation.z = Math.round(a / step) * step; return false; } });
  return grp;
}

// ---------------------------------------------------------------- machinery
// A piston pumping: an iron cylinder, a brass rod and crosshead driving up and down, a hiss at the bottom.
export function piston(ctx, x, z, o = {}) {
  const h = o.h ?? 1.4, r = o.r ?? 0.42, st = steelM(), br = brassM(); const y0 = o.y ?? 0;
  add(ctx, cyl(r + 0.12, r + 0.16, 0.2, 10), st, x, y0 + 0.1, z); add(ctx, cyl(r, r, h, 10), st, x, y0 + h / 2, z);
  for (const y of [0.35, h - 0.15]) add(ctx, cyl(r + 0.05, r + 0.05, 0.1, 10), darkBrassM(), x, y0 + y, z);
  const rod = new THREE.Mesh(cyl(r * 0.32, r * 0.32, h, 8), br); rod.castShadow = true; ctx.group.add(rod);
  const head = new THREE.Mesh(box(r * 2.4, 0.24, r * 1.2), st); head.castShadow = true; ctx.group.add(head);
  const per = o.period ?? 1.6; let t = o.phase ?? Math.random() * per;
  ctx.anims.push({ update(dt) { t += dt; const k = 0.5 - 0.5 * Math.cos(t / per * Math.PI * 2); const top = y0 + h + 0.1 + Math.round(k * (o.stroke ?? 1.2) * 16) / 16; rod.position.set(x, top - h / 2, z); head.position.set(x, top, z); return false; } });
  puffs(ctx, [[x + r + 0.1, y0 + 0.3, z + r * 0.4, per, 0.9, 0.7, 0xd0d0dc, 0.35]]);
  if (o.solid !== false) solidCircle(ctx, x, z, r + 0.15, h + 1);
}
// A steam vent in the deck: a grille, steam bursting up from it in a column, a faint warm glow under it.
export function vent(ctx, x, z, o = {}) {
  add(ctx, box(1.0, 0.04, 1.0), W3.grate('#2e3038'), x, 0.01, z, { cast: false }); add(ctx, box(1.1, 0.06, 1.1), steelM(), x, 0.0, z, { cast: false });
  floorGlow(ctx, x, z, 1.6, 1.6, 0xff8040, 0.25, 0.04);
  puffs(ctx, [[x, 0.2, z, o.every ?? 0.5, o.rise ?? 1.8, o.size ?? 1.1, 0xe4e4ec, o.op ?? 0.32]], { burst: 1 });
}
// A block of machinery (the Wheel's works) with gears turning in its two near faces, pipes, a gauge
// whose needle trembles, and brass plate walls.
export function works(ctx, x0, z0, x1, z1, h = 3, o = {}) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const R = T.rng(Math.round(x0 * 7 + z0 * 11));
  add(ctx, box(w, h, d), W3.brass(o.tone || '#7a5e30'), cx, h / 2, cz); add(ctx, box(w + 0.2, 0.25, d + 0.2), steelM(), cx, h + 0.12, cz); add(ctx, box(w + 0.2, 0.2, d + 0.2), steelM(), cx, 0.1, cz);
  for (const f of ['x', 'z']) {
    const len = f === 'x' ? d : w; const n = Math.max(1, Math.floor(len / 2.4));
    for (let i = 0; i < n; i++) {
      const p = (f === 'x' ? z0 : x0) + (i + 0.5) * len / n, gr = 0.5 + R() * 0.45, gy = 0.8 + R() * (h - 1.6);
      gear(ctx, f === 'x' ? x1 + 0.12 : p, gy, f === 'x' ? p : z1 + 0.12, gr, { axis: f === 'x' ? 'x' : 'z', speed: (i % 2 ? -1 : 1) * (0.6 + R()), mat: i % 2 ? steelM() : brassM(), thick: 0.12 });
      if (R() < 0.6) { const py = 0.4 + R() * (h - 0.8); add(ctx, f === 'x' ? box(0.14, 0.14, len / n * 0.9) : box(len / n * 0.9, 0.14, 0.14), darkBrassM(), f === 'x' ? x1 + 0.08 : p, py, f === 'x' ? p : z1 + 0.08); }
    }
    // a gauge
    const gp = (f === 'x' ? z0 : x0) + len * (0.2 + R() * 0.6), gy = h * 0.72;
    const gx = f === 'x' ? x1 + 0.06 : gp, gz = f === 'x' ? gp : z1 + 0.06, ry = f === 'x' ? Math.PI / 2 : 0;
    add(ctx, cyl(0.28, 0.28, 0.06, 12), brassM(), gx, gy, gz, { rx: Math.PI / 2, ry }); add(ctx, cyl(0.22, 0.22, 0.02, 12), M.flat(0xe8e0c8, { emissive: 0x2a2820 }), gx + (f === 'x' ? 0.03 : 0), gy, gz + (f === 'x' ? 0 : 0.03), { rx: Math.PI / 2, ry, cast: false });
    const needle = new THREE.Mesh(box(0.025, 0.18, 0.01), M.flat(0xa02018)); const pv = new THREE.Group(); pv.position.set(gx + (f === 'x' ? 0.05 : 0), gy, gz + (f === 'x' ? 0 : 0.05)); pv.rotation.y = ry; needle.position.y = 0.08; pv.add(needle); ctx.group.add(pv);
    let t = R() * 9; ctx.anims.push({ update(dt) { t += dt; needle.parent.rotation.z = Math.round((0.6 + Math.sin(t * 2.3) * 0.25 + Math.sin(t * 13) * 0.05) * 16) / 16; return false; } });
  }
  solid(ctx, x0, z0, x1, z1, h);
}
// A row of pipes along a deck edge (along X or Z), with valve wheels and a flange every few metres.
export function pipes(ctx, x0, z0, x1, z1, n = 2) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? x1 - x0 : z1 - z0;
  for (let i = 0; i < n; i++) {
    const r = 0.12 + i * 0.05, y = 0.25 + i * 0.32, off = i * 0.3;
    add(ctx, cyl(r, r, len, 8), i % 2 ? steelM() : darkBrassM(), alongX ? (x0 + x1) / 2 : x0 + off, y, alongX ? z0 + off : (z0 + z1) / 2, alongX ? { rz: Math.PI / 2 } : { rx: Math.PI / 2 });
    for (let t = 1.5; t < len; t += 3) put(ctx, 'sp-flange', brassM(), alongX ? x0 + t : x0 + off, y, alongX ? z0 + off : z0 + t, alongX ? 0.08 : r * 2.6, r * 2.6, alongX ? r * 2.6 : 0.08);
  }
  if (alongX) solid(ctx, x0, z0 - 0.2, x1, z0 + n * 0.3, 1); else solid(ctx, x0 - 0.2, z0, x0 + n * 0.3, z1, 1);
}
// A work lamp on a post: a caged bulb throwing hard light (warm amber by default).
export function workLamp(ctx, x, z, o = {}) {
  const st = steelM(); const h = o.h ?? 2.6;
  add(ctx, box(0.12, h, 0.12), st, x, h / 2, z); add(ctx, box(0.5, 0.08, 0.08), st, x + 0.2, h, z);
  add(ctx, cone(0.22, 0.18, 6), st, x + 0.42, h - 0.06, z); add(ctx, box(0.14, 0.14, 0.14), M.glow(o.glow || '#ffd090', 2.8), x + 0.42, h - 0.2, z, { cast: false });
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) add(ctx, box(0.02, 0.22, 0.02), st, x + 0.42 + dx * 0.1, h - 0.22, z + dz * 0.1);
  ctx.lights.push({ x: x + 0.42, y: h - 0.25, z, color: o.color ?? 0xffb860, intensity: o.intensity ?? 5, dist: o.dist ?? 8, flicker: 0.04, halo: true });
  if (o.solid !== false) solidCircle(ctx, x, z, 0.16, h);
}
// The cage lift the wardens rode up in: an iron cage on its plate, chains climbing out of sight.
export function cageLift(ctx, x, z) {
  const st = steelM(), br = brassM();
  add(ctx, box(2.6, 0.14, 2.6), W3.tread('#3e424e'), x, 0.03, z, { cast: false });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(ctx, box(0.12, 3, 0.12), st, x + dx * 1.24, 1.5, z + dz * 1.24);
  for (let i = -4; i <= 4; i++) { put(ctx, '!sp-cbar', st, x + i * 0.28, 1.5, z - 1.24, 0.04, 3, 0.04); put(ctx, '!sp-cbar', st, x - 1.24, 1.5, z + i * 0.28, 0.04, 3, 0.04); }
  add(ctx, box(2.7, 0.18, 2.7), br, x, 3.05, z); add(ctx, cone(1.0, 0.8, 4), st, x, 3.5, z, { ry: Math.PI / 4 });
  for (const dx of [-0.4, 0.4]) chain(ctx, x + dx, 22, z, 3.9);
  solid(ctx, x - 1.3, z - 1.3, x + 1.3, z - 1.1, 3); solid(ctx, x - 1.3, z - 1.3, x - 1.1, z + 1.3, 3); solidCircle(ctx, x + 1.24, z + 1.24, 0.12, 3);
}

// ---------------------------------------------------------------- the clock and the pendulum
// A clock-face texture: a pale dial, minute ticks, twelve hour marks with numerals (pixel Roman figures).
const clockTex = () => pix('sp-clock', 128, 128, (g, W) => {
  const C = W / 2; const P = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const GL = { I: ['1', '1', '1', '1', '1'], V: ['101', '101', '101', '101', '010'], X: ['101', '101', '010', '101', '101'] };
  const NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + 0.5 - C, y + 0.5 - C); if (d > C - 0.5) continue; const n = ((x * 7 + y * 13) % 17) / 17; P(x, y, d > C - 3 ? '#2a2018' : (d > C - 18 ? (n < 0.1 ? '#d8ccb0' : '#e8dcc0') : (n < 0.1 ? '#cabe9c' : '#ddd0b2'))); if (Math.abs(d - (C - 18)) < 0.6) P(x, y, '#3a2c20'); }
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, l = i % 5 ? 3 : 6; for (let r = C - 4 - l; r < C - 4; r++) P(Math.round(C + Math.sin(a) * r - 0.5), Math.round(C - Math.cos(a) * r - 0.5), '#2a2018'); }
  NUM.forEach((s, i) => { const a = i / 12 * Math.PI * 2; const cx = C + Math.sin(a) * (C - 24), cy = C - Math.cos(a) * (C - 24); const wid = [...s].reduce((q, ch) => q + GL[ch][0].length + 1, -1); let x = Math.round(cx - wid / 2); for (const ch of s) { const gl = GL[ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < gl[r].length; c++) if (gl[r][c] === '1') P(x + c, Math.round(cy - 2.5) + r, '#2a1e16'); x += gl[0].length + 1; } });
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x + 0.5 - C, y + 0.5 - C); if (d < 9 && d > 7.5) P(x, y, '#3a2c20'); }
});
// The great clock face, standing on its edge facing ry (+x+z by default): a lit dial, a brass bezel,
// a ring of small gears behind it, hands that move (the minute hand in ticks), at (x, y, z) its centre.
export function clockFace(ctx, x, y, z, R = 6, ry = Math.PI / 4) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; ctx.group.add(grp);
  const dial = new THREE.Mesh(geo('sp-dial', () => new THREE.CircleGeometry(1, 48)), new THREE.MeshBasicMaterial({ map: clockTex(), color: new THREE.Color(1.05, 1.0, 1.08), fog: false })); dial.scale.set(R, R, 1); dial.position.z = 0.05; grp.add(dial);
  const bez = new THREE.Mesh(geo(`sp-bez${R}`, () => new THREE.TorusGeometry(R + 0.15, 0.35, 6, 48)), brassM()); bez.castShadow = true; grp.add(bez);
  const back = new THREE.Mesh(cyl(R + 0.5, R + 0.5, 1.2, 32), steelM()); back.rotation.x = Math.PI / 2; back.position.z = -0.65; grp.add(back);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const s = new THREE.Mesh(box(0.5, 0.9, 0.3), brassM()); s.position.set(Math.sin(a) * (R + 0.5), Math.cos(a) * (R + 0.5), 0.1); s.rotation.z = -a; grp.add(s); }
  const hand = (len, wid, col) => { const pv = new THREE.Group(); pv.position.z = 0.2; grp.add(pv); const m = new THREE.Mesh(box(wid, len, 0.08), M.flat(col)); m.position.y = len * 0.4; m.castShadow = true; pv.add(m); const tip = new THREE.Mesh(cone(wid * 1.2, wid * 2.5, 4), M.flat(col)); tip.position.y = len * 0.9 + wid; pv.add(tip); return pv; };
  const hr = hand(R * 0.5, 0.36, 0x1a1410), mn = hand(R * 0.78, 0.22, 0x1a1410);
  const cap = new THREE.Mesh(cyl(0.45, 0.45, 0.2, 10), brassM()); cap.rotation.x = Math.PI / 2; cap.position.z = 0.3; grp.add(cap);
  for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, gr = 1.0 + (i % 3) * 0.5; const g = gear(ctx, 0, 0, 0, gr, { speed: (i % 2 ? 1 : -1) * 0.3, mat: i % 2 ? steelM() : brassM(), thick: 0.3 }); grp.add(g); g.position.set(Math.cos(a) * (R + 0.4), Math.sin(a) * (R + 0.4), -0.9); }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; mn.rotation.z = -Math.floor(t) * (Math.PI * 2 / 60); hr.rotation.z = -1.1 - t * (Math.PI * 2 / 720); return false; } });
  return grp;
}
// A great pendulum hung from a beam (yTop), swinging across the drop along ry's axis.
export function pendulum(ctx, x, yTop, z, len = 10, o = {}) {
  const pv = new THREE.Group(); pv.position.set(x, yTop, z); pv.rotation.y = o.ry ?? 0; ctx.group.add(pv); const sw = new THREE.Group(); pv.add(sw);
  const rod = new THREE.Mesh(box(0.22, len, 0.22), steelM()); rod.position.y = -len / 2; rod.castShadow = true; sw.add(rod);
  const bob = new THREE.Mesh(cyl(o.r ?? 1.6, o.r ?? 1.6, 0.5, 24), brassM()); bob.rotation.x = Math.PI / 2; bob.position.y = -len; bob.castShadow = true; sw.add(bob);
  const boss = new THREE.Mesh(cyl((o.r ?? 1.6) * 0.5, (o.r ?? 1.6) * 0.5, 0.6, 12), darkBrassM()); boss.rotation.x = Math.PI / 2; boss.position.y = -len; sw.add(boss);
  add(ctx, box(o.beam ?? 6, 0.5, 0.6), steelM(), x, yTop + 0.3, z, { ry: o.ry ?? 0 });
  let t = o.phase ?? 0; const per = o.period ?? 4.2;
  ctx.anims.push({ update(dt) { t += dt; sw.rotation.z = Math.round(Math.sin(t / per * Math.PI * 2) * (o.amp ?? 0.45) * 64) / 64; return false; } });
}

// The Clockmaster's dial set in the floor (flat, walkable): rings of steel and brass, twelve hour bars,
// a band of glyphs glowing faintly, and two great hands turning slowly across it.
export function floorDial(ctx, x, z, R = 8) {
  const ring = (r0, r1, m, y = 0.012) => add(ctx, geo(`sp-fring${r0},${r1}`, () => new THREE.RingGeometry(r0, r1, 56).rotateX(-Math.PI / 2)), m, x, y, z, { cast: false });
  ring(R - 0.5, R, steelM()); ring(R - 0.8, R - 0.5, W3.tread('#3a3e4a')); ring(R * 0.62 - 0.25, R * 0.62, steelM()); ring(1.2, 1.5, steelM());
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, l = i % 3 ? 0.9 : 1.6; add(ctx, box(i % 3 ? 0.22 : 0.4, 0.02, l), i % 3 ? steelM() : darkBrassM(), x + Math.sin(a) * (R - 0.8 - l / 2), 0.02, z + Math.cos(a) * (R - 0.8 - l / 2), { ry: a, cast: false }); }
  for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const a = i / 60 * Math.PI * 2; put(ctx, 'sp-tick', steelM(), x + Math.sin(a) * (R - 1.05), 0.02, z + Math.cos(a) * (R - 1.05), 0.08, 0.02, 0.3, a); }
  const m = new THREE.Mesh(plane(R * 1.24, R * 1.24), new THREE.MeshBasicMaterial({ map: T.sigil('ring', 96, 433), color: new THREE.Color(0.13, 0.1, 0.24), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.renderOrder = 3; ctx.group.add(m);
  const hands = new THREE.Group(); hands.position.set(x, 0.035, z); ctx.group.add(hands);
  const H = (len, wid, mat) => { const pv = new THREE.Group(); hands.add(pv); const b = new THREE.Mesh(box(wid, 0.03, len), mat); b.position.z = len / 2 - 0.4; b.receiveShadow = true; pv.add(b); const tip = new THREE.Mesh(box(wid * 1.8, 0.03, wid * 1.8), mat); tip.rotation.y = Math.PI / 4; tip.position.z = len - 0.4; pv.add(tip); return pv; };
  const hr = H(R * 0.5, 0.5, darkBrassM()), mn = H(R * 0.78, 0.3, brassM());
  add(ctx, cyl(0.9, 1.0, 0.06, 12), brassM(), x, 0.03, z, { cast: false });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; mn.rotation.y = -Math.round(t * 0.05 * 64) / 64; hr.rotation.y = 1.9 - Math.round(t * 0.005 * 128) / 128; return false; } });
}

// ---------------------------------------------------------------- the far sky
// The rim of the Wheel far above: a vast arc of glyph-bands and eyes in the violet sky, turning slowly,
// drawn behind everything and moving slower than the world. anchor: the level point it is set against.
export function wheelRim(ctx, x, z, o = {}) {
  const grp = new THREE.Group(); grp.position.set(x, o.y ?? 40, z); faceCam(grp); ctx.group.add(grp);
  const spin = new THREE.Group(); grp.add(spin); const R = o.R ?? 46;
  const band = (r0, r1, col) => { const m = new THREE.Mesh(geo(`sp-rim${r0},${r1}`, () => new THREE.RingGeometry(r0, r1, 160, 1)), new THREE.MeshBasicMaterial({ color: col, blending: THREE.AdditiveBlending })); spin.add(m); };
  band(R - 0.15, R + 0.15, new THREE.Color(0.3, 0.22, 0.46)); band(R - 3.3, R - 3.2, new THREE.Color(0.18, 0.13, 0.3)); band(R + 2.6, R + 2.7, new THREE.Color(0.12, 0.09, 0.2));
  const eyes = []; const n = 64;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const e = new THREE.Mesh(plane(1.6, 1.0), new THREE.MeshBasicMaterial({ map: T.eye(2, 16, 10), alphaTest: 0.5, color: new THREE.Color(0.36, 0.3, 0.52) })); e.position.set(Math.cos(a) * (R - 1.6), Math.sin(a) * (R - 1.6), 0.1); e.rotation.z = a - Math.PI / 2; spin.add(e); eyes.push({ e, t: Math.random() * 8 }); }
  skyLayer(ctx, grp, o.k ?? 0.85, o.anchor ?? [x, z]);
  const shut = T.eye(0, 16, 10), open = T.eye(2, 16, 10); let t = 0;
  ctx.anims.push({ update(dt) { t += dt; spin.rotation.z = Math.round(t * (o.speed ?? 0.012) * 512) / 512; for (const q of eyes) { q.t -= dt; if (q.t < 0) q.t = 3 + Math.random() * 7; q.e.material.map = q.t < 0.15 ? shut : open; } return false; } });
  return grp;
}
// Stars of cold light in the violet beyond the drop (sky layer, fixed far off).
export function skyMotes(ctx, x, z, n = 220, o = {}) {
  const R = T.rng(808); const pos = []; for (let i = 0; i < n; i++) pos.push(x + (R() - 0.5) * 120, -20 - R() * 30, z + (R() - 0.5) * 120);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: new THREE.Color(o.color ?? 0x8a78c8).multiplyScalar(o.k ?? 0.9), size: 1, sizeAttenuation: false })); const grp = new THREE.Group(); grp.add(pts); ctx.group.add(grp);
  skyLayer(ctx, grp, 0.5, [x, z]);
}
