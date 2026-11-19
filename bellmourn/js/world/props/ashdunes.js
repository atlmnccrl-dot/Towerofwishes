// Props for Act II, region II: the Ash Dunes. Sandstone mesas cut with tomb fronts on the far sides, dune
// ridges on the near ones, a sunken colonnade, colossal heads and guardian beasts half drowned in sand,
// fallen obelisks, a dry cistern, dead palms, a caravan that did not make it, and the broken feet of a
// colossus over the sinking bowl. Gold glyphs, braziers of amber fire.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane, cart } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { W2, once, part, put, boulder, mound, q16, pix, flame, floorGlow, solidRot, snag } from '../kit2.js';

export const SAND = '#a49274', SAND2 = '#96866c', DUNE = '#ac9a7a', STONE = '#a8784c', STONE2 = '#94683e', PAVE = '#9c7650';
// every sandstone tone is pulled a third of the way to grey: in moonlight the warm stone stays warm, not orange
const soft = (t) => { const n = parseInt(t.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, l = r * 0.3 + g * 0.55 + b * 0.15; const k = (v) => Math.round(v + (l - v) * 0.36).toString(16).padStart(2, '0'); return '#' + k(r) + k(g) + k(b); };
const stone = (t = STONE) => W2.sandstone(soft(t));
const gold = () => M.glow('#ffc860', 1.6);
const dark = () => M.flat(0x0c0806);

// ---------------------------------------------------------------- sand and dunes
export const dune = (ctx, x, z, w, d, h, o = {}) => mound(ctx, x, z, w, d, h, W2.sand(o.tone || DUNE), o);
// sand drifted against something (a low ramp: a squashed half-dome)
export const spill = (ctx, x, z, w, d, h = 0.35) => mound(ctx, x, z, w, d, h, W2.sand(SAND), { solid: false });

// ---------------------------------------------------------------- the mesas and their tombs
// A sandstone mesa along a far side: the cliff in bands of strata (each course stepping back a little),
// boulders fallen at its foot, sand heaped against it. face: '+x' or '+z'. tombs: positions along the face
// where a rock-cut tomb front opens (pilasters, a lintel with gold glyphs, a black doorway).
export function mesa(ctx, x0, z0, x1, z1, h, o = {}) {
  const R = T.rng(Math.round(x0 * 13 + z0 * 7 + h)); const face = o.face || '+x'; const alongZ = face === '+x';
  const tones = [STONE, STONE2, '#b4845a', '#8c6440']; let y = 0; let k = 0;
  while (y < h - 0.01) {
    const bh = Math.min(h - y, 0.9 + R() * 1.3), inset = k * 0.12 + R() * 0.15;
    const w = x1 - x0 - (alongZ ? inset : 0), d = z1 - z0 - (alongZ ? 0 : inset);
    add(ctx, box(w, bh, d), stone(tones[k % 4]), x0 + w / 2, y + bh / 2, z0 + d / 2); y += bh; k++;
  }
  solid(ctx, x0, z0, x1, z1, h);
  const len = alongZ ? z1 - z0 : x1 - x0;
  for (let i = 0; i < Math.round(len / 2.2); i++) {
    const p = (alongZ ? z0 : x0) + R() * len; const s = 0.6 + R() * 0.9;
    boulder(ctx, alongZ ? x1 + 0.3 + R() * 0.6 : p, alongZ ? p : z1 + 0.3 + R() * 0.6, s, W2.rock('sandstone', soft(STONE2)), { solid: false });
  }
  for (let i = 0; i < Math.round(len / 3); i++) { const p = (alongZ ? z0 : x0) + (i + 0.5) * 3 + (R() - 0.5); spill(ctx, alongZ ? x1 + 0.2 : p, alongZ ? p : z1 + 0.2, alongZ ? 2 : 2.6, alongZ ? 2.6 : 2, 0.5 + R() * 0.4); }
  for (const t of o.tombs || []) tombFront(ctx, alongZ ? x1 : t, alongZ ? t : z1, face, o.tombH || Math.min(4.2, h * 0.7));
  if (o.solidFace !== false) { if (alongZ) solid(ctx, x1, z0, x1 + 0.6, z1, 1.2); else solid(ctx, x0, z1, x1, z1 + 0.6, 1.2); }
}
// A rock-cut tomb front on a cliff face (facing +x or +z at x/z): stepped jambs, a black doorway, a lintel
// carved with a row of gold glyphs, a winged disc above.
export function tombFront(ctx, x, z, face = '+x', h = 4) {
  const fx = face === '+x'; const P = (g, m, a, y, off, o = {}) => fx ? add(ctx, g, m, x + off, y, z + a, { ry: Math.PI / 2, ...o }) : add(ctx, g, m, x + a, y, z + off, o);
  const w = 2.2, st = stone('#b48a5c'), st2 = stone('#9a7048');
  P(box(w + 1.2, h, 0.3), st2, 0, h / 2, 0.15);
  for (const s of [-1, 1]) { P(box(0.5, h * 0.78, 0.5), st, s * (w / 2 + 0.25), h * 0.39, 0.4); P(box(0.62, 0.22, 0.6), st2, s * (w / 2 + 0.25), h * 0.78 + 0.1, 0.42); }
  P(box(w + 1.4, 0.5, 0.6), st, 0, h * 0.82 + 0.25, 0.42);
  P(plane(w * 0.7, h * 0.62), dark(), 0, h * 0.31, 0.31, { cast: false });
  for (let i = 0; i < 7; i++) P(box(0.14, 0.18, 0.02), gold(), -0.9 + i * 0.3, h * 0.82 + 0.25 + (i % 2) * 0.04, 0.73, { cast: false });
  P(cyl(0.22, 0.22, 0.05, 10), gold(), 0, h * 0.95 + 0.25, 0.48, { rx: Math.PI / 2, cast: false });
  for (const s of [-1, 1]) P(box(0.7, 0.12, 0.03), M.flat(0x8a6a3c), s * 0.5, h * 0.95 + 0.25, 0.47, { rz: s * 0.15, cast: false });
}
// A ruined wall of big sandstone blocks along a line, its top broken (h between hMin and hMax).
export function ruinWall(ctx, x0, z0, x1, z1, hMin, hMax, o = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1), a1 = alongX ? Math.max(x0, x1) : Math.max(z0, z1), c = alongX ? z0 : x0;
  const R = T.rng(Math.round(a0 * 19 + c * 23)); const t = o.thick || 0.8; let p = a0;
  while (p < a1 - 0.01) {
    const len = Math.min(a1 - p, q16(0.9 + R() * 1.4)); const hh = q16(hMin + (hMax - hMin) * R());
    if (alongX) add(ctx, box(len, hh, t), stone(R() < 0.5 ? STONE : STONE2), p + len / 2, hh / 2, c); else add(ctx, box(t, hh, len), stone(R() < 0.5 ? STONE : STONE2), c, hh / 2, p + len / 2);
    if (R() < 0.3) boulder(ctx, alongX ? p + len / 2 : c + (o.side ?? 1) * (t / 2 + 0.4), alongX ? c + (o.side ?? 1) * (t / 2 + 0.4) : p + len / 2, 0.5 + R() * 0.3, W2.rock('sandstone', soft(STONE2)), { solid: false });
    p += len;
  }
  if (alongX) solid(ctx, a0, c - t / 2, a1, c + t / 2, Math.max(1.1, hMax)); else solid(ctx, c - t / 2, a0, c + t / 2, a1, Math.max(1.1, hMax));
}

// ---------------------------------------------------------------- the colonnade
// A column of drums with a lotus capital and an abacus; broken: the height it snapped at (drums lie by it).
export function column(ctx, x, z, h = 5, o = {}) {
  const R = T.rng(Math.round(x * 29 + z * 31)); const top = o.broken ? q16(o.broken) : h; const st = stone(o.tone || '#b08458');
  add(ctx, box(1.2, 0.4, 1.2), stone(STONE2), x, 0.2, z);
  for (let y = 0.4; y < top - 0.05; y += 0.7) { const hh = Math.min(0.7, top - y); add(ctx, cyl(0.42, 0.44, hh - 0.04, 10), st, x, y + hh / 2, z, { ry: R() }); inst(ctx, 'ad-band', cyl(0.45, 0.45, 0.05, 10), M.flat(0x6a4e2a), mat4(x, y + hh - 0.06, z)); }
  if (!o.broken) {
    add(ctx, cyl(0.7, 0.42, 0.7, 10), st, x, h + 0.35, z); add(ctx, box(1.4, 0.3, 1.4), stone(STONE2), x, h + 0.85, z);
    if (o.beam) add(ctx, box(o.beam[0], 0.6, o.beam[1]), stone('#a07648'), x + (o.beamOff?.[0] || 0), h + 1.3, z + (o.beamOff?.[1] || 0));
  } else {
    for (let i = 0; i < 2; i++) { const a = R() * 6, d = 1 + R() * 0.8; add(ctx, cyl(0.42, 0.44, 0.66, 10), st, x + Math.sin(a) * d, 0.42, z + Math.cos(a) * d, { rz: Math.PI / 2, ry: R() * 3 }); }
    spill(ctx, x + 0.6, z + 0.6, 1.8, 1.6, 0.3);
  }
  solidCircle(ctx, x, z, 0.62, top);
}
// A column lying where it fell: drums in a broken row, its capital at the end.
export function fallenColumn(ctx, x, z, ry, n = 5) {
  const st = stone('#a8804e'); const R = T.rng(Math.round(x * 3 + z * 17));
  for (let i = 0; i < n; i++) { const d = i * 0.72 + R() * 0.12; const m = part(ctx, cyl(0.42, 0.44, 0.68, 10), st, x, z, ry, (R() - 0.5) * 0.15, 0.38, d); m.rotation.set(Math.PI / 2, ry + (R() - 0.5) * 0.15, 0, 'YXZ'); }
  part(ctx, cyl(0.7, 0.42, 0.7, 10), st, x, z, ry, 0, 0.62, n * 0.72 + 0.3, { rx: Math.PI / 2.3 });
  const c = Math.cos(ry), s = Math.sin(ry); const L = n * 0.72 + 0.6; solidRot(ctx, x + s * L / 2, z + c * L / 2, ry, 0.5, L / 2, 0.9);
}

// ---------------------------------------------------------------- the old kings, half drowned
// A colossal head sunk to the chin in sand, facing ry: striped headcloth, brow, sockets, nose, a cracked
// cheek, a gold band at the brow. s scales it (1 = about 3 m tall above the sand).
export function colossalHead(ctx, x, z, ry = 0, s = 1) {
  const st = stone('#b48a5c'), st2 = stone('#9c7048'), P = (g, m, lx, ly, lz, o) => part(ctx, g, m, x, z, ry, lx * s, ly * s, lz * s, o);
  const head = P(box(2.4 * s, 2.6 * s, 2.4 * s), st, 0, 1.1, 0);
  for (let i = 0; i < 6; i++) { P(box(0.5 * s, (2.6 - i * 0.05) * s, 0.3 * s), i % 2 ? st2 : st, -1.4, 0.9, 0.9 - i * 0.42); P(box(0.5 * s, (2.6 - i * 0.05) * s, 0.3 * s), i % 2 ? st2 : st, 1.4, 0.9, 0.9 - i * 0.42); }
  P(box(2.9 * s, 0.6 * s, 2.7 * s), st2, 0, 2.55, -0.1);
  P(box(2.5 * s, 0.14 * s, 0.1 * s), gold(), 0, 2.2, 1.22);
  P(box(2.3 * s, 0.3 * s, 0.4 * s), st, 0, 1.8, 1.25);
  for (const sx of [-1, 1]) { P(box(0.55 * s, 0.24 * s, 0.1 * s), dark(), sx * 0.55, 1.5, 1.21); P(box(0.6 * s, 0.1 * s, 0.14 * s), st2, sx * 0.55, 1.66, 1.24); }
  P(box(0.4 * s, 0.8 * s, 0.5 * s), st, 0, 1.1, 1.38);
  P(box(0.9 * s, 0.14 * s, 0.1 * s), M.flat(0x4a3220), 0, 0.5, 1.22);
  P(box(0.06 * s, 1.2 * s, 0.02 * s), M.flat(0x3a2818), 0.8, 1.1, 1.215, { rz: 0.3 });
  mound(ctx, x, z, 4.6 * s, 4.6 * s, 0.8 * s, W2.sand(DUNE), { solid: false });
  solidCircle(ctx, x, z, 1.5 * s, 2.5 * s);
}
// A guardian beast couched in the sand facing ry (a lion body, a crowned head): low, for the avenue.
export function guardian(ctx, x, z, ry = 0, o = {}) {
  const st = stone(o.tone || '#ac8256'), st2 = stone('#946a40'); const P = (g, m, lx, ly, lz, oo) => part(ctx, g, m, x, z, ry, lx, ly, lz, oo);
  P(box(1.2, 0.3, 2.6), st2, 0, 0.15, -0.1);
  P(box(1.0, 0.8, 1.9), st, 0, 0.7, -0.3); P(box(0.95, 0.6, 0.5), st, 0, 0.5, -1.25);
  for (const s of [-1, 1]) P(box(0.28, 0.26, 0.9), st, s * 0.33, 0.43, 0.9);
  P(box(0.7, 0.8, 0.7), st, 0, 1.45, 0.62); P(box(0.86, 0.6, 0.5), st2, 0, 1.4, 0.4);
  P(box(0.5, 0.22, 0.04), dark(), 0, 1.55, 0.98); P(box(0.62, 0.08, 0.04), gold(), 0, 1.78, 0.98);
  P(box(0.5, 0.3, 0.45), st2, 0, 1.95, 0.55);
  if (o.sunk) mound(ctx, x, z, 2.4, 3.4, o.sunk, W2.sand(DUNE), { solid: false, ry });
  solidRot(ctx, x, z, ry, 0.6, 1.4, 1.6);
}
// An obelisk (standing, or fallen and broken in two): a tapering shaft, a gilded cap, glyph columns.
export function obelisk(ctx, x, z, h = 6, o = {}) {
  const st = stone('#b08a5e'); const s0 = 0.9, s1 = 0.6;
  const shaft = geo(`ad-obl${h}`, () => { const g = new THREE.CylinderGeometry(s1 / Math.SQRT2, s0 / Math.SQRT2, h, 4); g.rotateY(Math.PI / 4); return g; });
  if (!o.fallen) {
    add(ctx, box(1.4, 0.5, 1.4), stone(STONE2), x, 0.25, z); add(ctx, shaft, st, x, 0.5 + h / 2, z);
    add(ctx, cone(s1 * 0.72, 0.7, 4), gold(), x, 0.5 + h + 0.35, z, { ry: Math.PI / 4 });
    for (let i = 0; i < 6; i++) { add(ctx, box(0.16, 0.2, 0.02), gold(), x, 1.3 + i * h * 0.13, z + s0 * 0.5 - i * 0.025, { cast: false }); add(ctx, box(0.02, 0.2, 0.16), gold(), x + s0 * 0.5 - i * 0.025, 1.3 + i * h * 0.13, z, { cast: false }); }
    solid(ctx, x - 0.7, z - 0.7, x + 0.7, z + 0.7, h);
  } else {
    const ry = o.ry || 0; const a = part(ctx, shaft, st, x, z, ry, 0, 0.45, 0); a.rotation.set(Math.PI / 2, ry, 0.08, 'YXZ');
    const c = part(ctx, cone(s1 * 0.72, 0.7, 4), gold(), x, z, ry, 0.5, 0.35, h / 2 + 0.6); c.rotation.set(Math.PI / 2 + 0.3, ry, 0, 'YXZ');
    spill(ctx, x + Math.sin(ry) * 1, z + Math.cos(ry) * 1, 2, 2.4, 0.4);
    solidRot(ctx, x, z, ry, 0.5, h / 2, 0.9);
  }
}
// The broken legs of a colossus on its plinth, feet planted (shins snapped at different heights).
export function colossusFeet(ctx, x, z, ry = 0) {
  const st = stone('#b08458'), st2 = stone('#94683e'); const P = (g, m, lx, ly, lz, o) => part(ctx, g, m, x, z, ry, lx, ly, lz, o);
  P(box(6, 1.4, 4.2), st2, 0, 0.7, 0); P(box(6.4, 0.3, 4.6), st, 0, 1.55, 0);
  for (let i = 0; i < 9; i++) P(box(0.3, 0.36, 0.03), gold(), -2.4 + i * 0.6, 0.8, 2.11);
  for (const [sx, hh] of [[-1.3, 4.6], [1.4, 2.8]]) {
    P(box(1.5, 0.9, 2.6), st, sx, 2.15, 0.4); for (let t = 0; t < 4; t++) P(box(0.32, 0.4, 0.4), st, sx - 0.55 + t * 0.37, 1.9, 1.75);
    P(box(1.1, hh, 1.2), st, sx, 1.7 + hh / 2, -0.2);
    for (let k = 0; k < 3; k++) P(box(0.5, 0.4, 0.4), st2, sx + (k - 1) * 0.35, 1.7 + hh + 0.12, -0.2 + (k % 2) * 0.3, { rz: (k - 1) * 0.4 });
  }
  boulder(ctx, x + 3.6, z + 2.4, 1.4, W2.rock('sandstone', soft(STONE2)), { solid: false }); boulder(ctx, x - 3.4, z + 2.6, 1.1, W2.rock('sandstone', soft(STONE2)), { solid: false });
  solidRot(ctx, x, z, ry, 3.1, 2.2, 6);
}
// A pylon gate (far side): two tapering towers with a cornice, a lintel across with a winged disc, the
// way between them dark and breathing cold air from the stair below.
export function pylon(ctx, x, z, gap = 3.6, h = 8) {
  const st = stone('#ac8256'), st2 = stone('#946a40');
  for (const s of [-1, 1]) {
    const cx = x + s * (gap / 2 + 2.2);
    add(ctx, geo(`ad-pyl${h}`, () => { const g = new THREE.CylinderGeometry(2.0, 2.9, h, 4); g.rotateY(Math.PI / 4); g.scale(1, 1, 0.6); return g; }), st, cx, h / 2, z);
    add(ctx, box(3.4, 0.5, 2.3), st2, cx, h + 0.2, z); add(ctx, box(3.0, 0.14, 0.04), gold(), cx, h - 0.5, z + 1.03);
    for (let i = 0; i < 4; i++) add(ctx, box(0.16, 0.24, 0.02), gold(), cx - 0.9 + i * 0.6, h * 0.45, z + 1.4 - 0.05, { cast: false });
    solid(ctx, cx - 2.2, z - 1.6, cx + 2.2, z + 1.6, h);
  }
  add(ctx, box(gap + 0.6, 1.0, 1.6), st, x, h * 0.7, z); add(ctx, cyl(0.4, 0.4, 0.05, 12), gold(), x, h * 0.7, z + 0.82, { rx: Math.PI / 2 });
  for (const s of [-1, 1]) add(ctx, box(1.2, 0.18, 0.04), M.flat(0x8a6a3c), x + s * 0.85, h * 0.7, z + 0.82, { rz: s * 0.18 });
  add(ctx, plane(gap, h * 0.65), dark(), x, h * 0.33, z - 0.6, { cast: false });
}
// A dry cistern sunk in the court: a round stone kerb, steps going down into black, a broken well-house.
export function cistern(ctx, x, z, r = 2) {
  const st = stone('#a07448'), st2 = stone('#8a6440');
  for (let i = 0; i < 14; i++) { const a = (i + 0.5) / 14 * Math.PI * 2; add(ctx, box(0.5, 0.6, (r + 0.25) * 2 * Math.PI / 14 + 0.05), st, x + Math.cos(a) * (r + 0.25), 0.3, z + Math.sin(a) * (r + 0.25), { ry: -a }); }
  add(ctx, geo(`ad-cistr${r}`, () => { const g = new THREE.RingGeometry(r, r + 0.5, 16); g.rotateX(-Math.PI / 2); return g; }), st2, x, 0.61, z);
  add(ctx, geo(`ad-cisth${r}`, () => { const g = new THREE.CircleGeometry(r, 16); g.rotateX(-Math.PI / 2); return g; }), dark(), x, 0.02, z, { cast: false });
  for (let i = 0; i < 5; i++) add(ctx, box(1.2, 0.2, 0.4), st2, x - r * 0.4 + i * 0.05, -0.1 - i * 0.18 + 0.4, z - r + 0.4 + i * 0.36, { cast: false });
  for (const s of [-1, 1]) { add(ctx, box(0.4, 2.6, 0.4), st, x + s * (r + 0.1), 1.3, z - 0.4); }
  add(ctx, box(r * 2 + 0.8, 0.4, 0.6), st2, x - 0.4, 2.7, z - 0.4, { rz: 0.12 });
  solidCircle(ctx, x, z, r + 0.4, 1.2);
}
// A dead palm, bent by the wind, its fronds hanging dry.
export function palm(ctx, x, z, h = 5, lean = 0.25, ry = 0) {
  const bark = M.flat(0x5a4632), frond = M.flat(0x6a5a34), dry = M.flat(0x4a3e26); const R = T.rng(Math.round(x * 17 + z * 11));
  const segs = 6; let px = x, pz = z, py = 0;
  for (let i = 0; i < segs; i++) { const l = h / segs, a = lean * (i / segs) * 1.4; add(ctx, cyl(0.13 - i * 0.012, 0.16 - i * 0.012, l, 6), bark, px + Math.sin(ry) * Math.sin(a) * l / 2, py + Math.cos(a) * l / 2, pz + Math.cos(ry) * Math.sin(a) * l / 2, { rx: Math.cos(ry) * a, rz: -Math.sin(ry) * a }); px += Math.sin(ry) * Math.sin(a) * l; pz += Math.cos(ry) * Math.sin(a) * l; py += Math.cos(a) * l; }
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + R(); const m = add(ctx, box(0.16, 0.04, 1.5), R() < 0.5 ? frond : dry, px + Math.sin(a) * 0.6, py - 0.2, pz + Math.cos(a) * 0.6, { ry: a }); m.rotation.set(0.6 + R() * 0.4, a, 0, 'YXZ'); }
  solidCircle(ctx, x, z, 0.25, h);
}
// A caravan that did not make it: a cart sunk to its axle, a beast's ribs, jars spilled, a torn awning.
export function caravan(ctx, x, z, ry = 0) {
  cart(ctx, x, z, ry); mound(ctx, x + Math.sin(ry) * 0.4, z + Math.cos(ry) * 0.4, 2.4, 2.8, 0.6, W2.sand(DUNE), { solid: false, ry });
  const bone = M.flat(0xc8bca0);
  for (let i = 0; i < 6; i++) { const lz = -1.6 - i * 0.32; const r = new THREE.Mesh(geo('ad-rib', () => new THREE.TorusGeometry(0.5, 0.04, 3, 8, Math.PI)), bone); r.position.set(x + Math.sin(ry) * lz + 1.2 * Math.cos(ry), 0, z + Math.cos(ry) * lz - 1.2 * Math.sin(ry)); r.rotation.y = ry + Math.PI / 2; r.scale.setScalar(1 - Math.abs(i - 2.5) * 0.1); r.userData.static = true; r.castShadow = true; ctx.group.add(r); }
  add(ctx, box(0.36, 0.3, 0.6), bone, x + Math.cos(ry) * 1.2 + Math.sin(ry) * -0.9, 0.15, z - Math.sin(ry) * 1.2 + Math.cos(ry) * -0.9, { ry: ry + 0.4 });
  for (let i = 0; i < 4; i++) jar(ctx, x + Math.cos(ry) * (-1.2) + (i - 1.5) * 0.4, z - Math.sin(ry) * (-1.2) + (i % 2) * 0.4, i === 2);
  const aw = add(ctx, box(1.6, 0.03, 1.4), M.flat(0x6a2a1e), x, 1.4, z, { ry, rz: 0.4 }); aw.castShadow = true;
}
export function jar(ctx, x, z, fallen = false) {
  const m = add(ctx, geo('ad-jar', () => new THREE.SphereGeometry(0.22, 7, 5)), M.flat(0x8a5a36), x, fallen ? 0.18 : 0.26, z); m.scale.set(1, 1.3, 1);
  if (fallen) m.rotation.z = 1.4; else add(ctx, cyl(0.09, 0.12, 0.14, 6), M.flat(0x7a4e2e), x, 0.6, z);
}
// A brazier of amber fire on a stone stand.
export function fireBowl(ctx, x, z, o = {}) {
  const st = stone(STONE2); add(ctx, box(0.7, 0.9, 0.7), st, x, 0.45, z); add(ctx, cyl(0.5, 0.32, 0.36, 8), M.flat(0x5a3a1e), x, 1.08, z);
  add(ctx, cyl(0.42, 0.42, 0.05, 8), M.glow('#ff9a3a', 2.2), x, 1.24, z, { cast: false });
  flame(ctx, x, 1.62, z, 1.2, [2.4, 1.7, 1.0]);
  ctx.lights.push({ x, y: 1.8, z, color: 0xffa040, intensity: o.intensity || 5, dist: o.dist || 8, halo: true, flicker: 0.18 });
  solid(ctx, x - 0.4, z - 0.4, x + 0.4, z + 0.4, 1.3);
}
// A stela with gold glyphs; a scatter of potsherds; a row of half-sunk paving slabs.
export function stela(ctx, x, z, ry = 0, h = 2) {
  part(ctx, box(0.9, h, 0.3), stone('#b48a5c'), x, z, ry, 0, h / 2, 0, { rz: 0.05 });
  part(ctx, cyl(0.45, 0.45, 0.3, 10, 1), stone('#b48a5c'), x, z, ry, 0, h, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) part(ctx, box(0.5, 0.06, 0.02), gold(), x, z, ry, 0, h * 0.4 + i * 0.25, 0.16, { cast: false });
  solidCircle(ctx, x, z, 0.5, h);
}
export function sherds(ctx, x, z, n = 8) {
  const R = T.rng(Math.round(x * 5 + z * 9));
  for (let i = 0; i < n; i++) inst(ctx, 'ad-sherd', box(0.16, 0.03, 0.12), M.flat(0x7a4a2c), mat4(x + (R() - 0.5) * 1.4, 0.02, z + (R() - 0.5) * 1.4, R() * 3, (R() - 0.5) * 0.4));
}
// Bones bleached by the sun: a skull and a scatter of long bones.
export function bones(ctx, x, z, n = 5) {
  const R = T.rng(Math.round(x * 41 + z * 3)); const b = M.flat(0xd0c4a8);
  for (let i = 0; i < n; i++) inst(ctx, 'ad-bone', box(0.05, 0.05, 0.42), b, mat4(x + (R() - 0.5) * 1.2, 0.03, z + (R() - 0.5) * 1.2, R() * 3));
  inst(ctx, 'ad-skull', box(0.2, 0.17, 0.22), b, mat4(x, 0.08, z, R() * 3));
}

// ---------------------------------------------------------------- scattering
// The desert round the walks: dune ridges near the camera, mesas' rubble and dead palms far; nothing tall
// where it would hide a walk (the camera looks along (-1, -1)).
export function wastes(ctx, bounds, walks, o = {}) {
  const R = T.rng(o.seed || 707); const [bx0, bz0, bx1, bz1] = bounds;
  const inWalk = (x, z, p) => walks.some((r) => x > r[0] - p && x < r[2] + p && z > r[1] - p && z < r[3] + p);
  const room = (x, z) => { for (let t = 0; t < 12; t += 0.5) { const k = t / Math.SQRT2; if (inWalk(x - k, z - k, 0.8)) return t / 1.25; } return 99; };
  const skip = o.skip || [];
  for (let z = bz0 - 6; z < bz1 + 8; z += 2.2) for (let x = bx0 - 8; x < bx1 + 8; x += 2.2) {
    const jx = x + (R() - 0.5) * 2, jz = z + (R() - 0.5) * 2;
    if (inWalk(jx, jz, 1.0) || skip.some((s) => jx > s[0] && jx < s[2] && jz > s[1] && jz < s[3])) continue;
    const k = R(), hMax = room(jx, jz);
    if (k < 0.42) dune(ctx, jx, jz, 3 + R() * 3, 2.4 + R() * 2.4, Math.min(hMax * 0.8, 0.6 + R() * 1.0), { solid: false, ry: 0.7 });
    else if (k < 0.52) boulder(ctx, jx, jz, 0.6 + R() * 0.8, W2.rock('sandstone', soft(STONE2)), { solid: false });
    else if (k < 0.57 && hMax > 4) palm(ctx, jx, jz, Math.min(hMax, 3.6 + R() * 2), 0.2 + R() * 0.3, R() * 6);
    else if (k < 0.6) bones(ctx, jx, jz, 4);
  }
}
