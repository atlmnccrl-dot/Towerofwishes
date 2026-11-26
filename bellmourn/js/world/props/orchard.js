// Props for Act IV, region II: the Glass Orchard (PROPOSAL: names and descriptions are proposals for the author).
// When heaven fell, its orchard fell with it and froze: trees of stained glass on terraces of pale glass-sand,
// trunks of twisted amber held together with gold leading, canopies of coloured panes that throw their colours
// on the ground, and on every branch a fruit of clear glass with a voice frozen inside it, the voices the Great
// Bell took, glowing and singing very softly. A gardener-angel still prunes them with shears of light. Brambles
// of glass at the gate, a press where the fruit were crushed for their song, a greenhouse cathedral of gold ribs
// and broken panes, a vault of seeds in jars, and at the far end the Heart Tree: so big its roots hold the
// terraces up, a frozen choir sealed in its trunk.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, geo, solid, solidCircle } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { once, part, bar, floorGlow, decal } from '../kit2.js';
import { glowSprite } from '../kit3.js';
import { W4, glassM, goldM4, bronzeM, glowM, motes } from '../kit4.js';

const TAU = Math.PI * 2;
export const DUSK = 0x140e24;
// the panes' colours: rose, sky, violet, sea-green, amber, and a white for the fruit
export const HUES = [0xff7aa8, 0x6ab8ff, 0xb07aff, 0x70e8b8, 0xffc060];
const amberM = () => once('or-amber', () => cutout(new THREE.MeshPhongMaterial({ color: 0xc8843a, specular: 0xffd8a0, shininess: 70, emissive: 0x2a1404, transparent: true, opacity: 0.92 })));
const leadM = () => once('or-lead', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3a3440, specular: 0x8a80a0, shininess: 40 })));
const paneM = (hue, k = 0.75) => glassM(hue, 0.62, k);
const fruitM = () => once('or-fruit', () => new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf4f0ff).multiplyScalar(1.6), fog: false }));
const stoneM = () => W4.gsand('#b8b0c8');

// ---------------------------------------------------------------- the glass tree
// A trunk of twisted amber glass in three leaning drums with gold leading at the joints; four to six branches
// out of the top; on each a cluster of stained panes (its canopy) in one or two hues; voice-fruit hanging under
// the panes, bobbing, each a soft white light. o.h height, o.hue (index or colour), o.fruit count, o.broken: the
// canopy shattered, half its panes on the ground; o.lean.
export function glassTree(ctx, x, z, o = {}) {
  const R = T.rng(Math.round(x * 37 + z * 53 + 7)); const h = o.h ?? 3.6 + R() * 1.4; const lean = o.lean ?? (R() - 0.5) * 0.25;
  const hueA = typeof o.hue === 'number' && o.hue > 16 ? o.hue : HUES[(o.hue ?? Math.floor(R() * 5)) % 5]; const hueB = HUES[Math.floor(R() * 5)];
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = R() * TAU; ctx.group.add(g);
  const P = (geom, m, lx, ly, lz, rx = 0, ry = 0, rz = 0, cast = true) => { const me = new THREE.Mesh(geom, m); me.position.set(lx, ly, lz); me.rotation.set(rx, ry, rz); me.castShadow = cast; me.receiveShadow = true; g.add(me); return me; };
  // roots spreading into the sand
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + R(); P(box(0.14, 0.12, 0.9), amberM(), Math.sin(a) * 0.45, 0.06, Math.cos(a) * 0.45, 0, a, 0); }
  // the trunk: three drums, each leaning a little further, leaded at the joints
  let tx = 0, ty = 0;
  for (let k = 0; k < 3; k++) {
    const dh = h * 0.24; const r0 = 0.24 - k * 0.05, r1 = 0.3 - k * 0.05; tx += lean * dh;
    P(cyl(r0, r1, dh, 7), amberM(), tx, ty + dh / 2, 0, 0, k * 0.7, -lean * 0.8);
    P(cyl(r0 + 0.04, r0 + 0.04, 0.07, 7), goldM4(), tx, ty + dh, 0, 0, 0, 0, false);
    ty += dh;
  }
  // branches and canopy
  const top = { x: tx, y: ty }; const nb = 4 + Math.floor(R() * 3); const fruits = [];
  for (let i = 0; i < nb; i++) {
    const a = i / nb * TAU + R() * 0.5; const L = 0.9 + R() * 0.8; const up = 0.5 + R() * 0.6;
    const ex = top.x + Math.sin(a) * L, ez = Math.cos(a) * L, ey = top.y + up;
    const dir = new THREE.Vector3(ex - top.x, ey - top.y, ez); const len = dir.length(); const br = P(box(0.09, len, 0.09), amberM(), (top.x + ex) / 2, (top.y + ey) / 2, ez / 2);
    br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    if (!o.broken || R() < 0.45) {
      // a cluster of panes, leaded at the edges
      for (let k = 0; k < 4; k++) { const hue = k % 2 ? hueB : hueA; const s = 0.6 + R() * 0.5; const px = ex + (R() - 0.5) * 0.7, py = ey + (R() - 0.3) * 0.6, pz = ez + (R() - 0.5) * 0.7; const ry = R() * TAU, rz = (R() - 0.5) * 0.9; P(box(s, s * 0.8, 0.05), paneM(hue), px, py, pz, 0.3, ry, rz, false); P(box(s + 0.06, 0.05, 0.07), leadM(), px, py + s * 0.42, pz, 0.3, ry, rz, false); }
    }
    if (fruits.length < (o.fruit ?? 3) && R() < 0.8) fruits.push({ x: ex + (R() - 0.5) * 0.3, y: ey - 0.55, z: ez + (R() - 0.5) * 0.3 });
  }
  // the voice-fruit: clear glass, a white light inside; they bob on their stems and pulse as they sing
  const fm = []; for (const f of fruits) { P(box(0.03, 0.4, 0.03), leadM(), f.x, f.y + 0.3, f.z, 0, 0, 0, false); fm.push({ m: P(geo('or-fruit', () => new THREE.IcosahedronGeometry(0.16, 0)), fruitM(), f.x, f.y, f.z, 0, 0, 0, false), y: f.y, ph: R() * 9 }); }
  if (fruits.length) glowSprite(ctx, x + tx, ty, z, 2.6, 0xe8e0ff, 0.35);
  if (o.light !== false && fruits.length) ctx.lights.push({ x: x + tx, y: ty + 0.4, z, color: hueA, intensity: o.light ?? 1.6, dist: 5.5, flicker: 0.05 });
  // the colour the canopy throws on the ground
  floorGlow(ctx, x + tx * 0.6, z, 3.4, 3.4, hueA, 0.18);
  if (o.broken) for (let i = 0; i < 7; i++) { const a = R() * TAU, r = 0.6 + R() * 1.6; add(ctx, box(0.3 + R() * 0.3, 0.03, 0.2 + R() * 0.3), paneM(R() < 0.5 ? hueA : hueB, 0.9), x + Math.sin(a) * r, 0.03, z + Math.cos(a) * r, { ry: R() * TAU, cast: false }); }
  let t = R() * 9; ctx.anims.push({ update(dt) { t += dt; for (const f of fm) { f.m.position.y = f.y + Math.round(Math.sin(t * 1.3 + f.ph) * 0.05 * 64) / 64; const k = 1 + 0.15 * Math.sin(t * 2.4 + f.ph); f.m.scale.setScalar(k); } } });
  solidCircle(ctx, x, z, 0.42, h);
}

// ---------------------------------------------------------------- the bell-fruit tree
// A broad tree in the middle of the grove whose fruit are little glass bells; when the wind of the fall moves
// through it, they ring, one after another, and glow as they ring.
export function bellTree(ctx, x, z, o = {}) {
  glassTree(ctx, x, z, { h: o.h ?? 5.4, hue: o.hue ?? 4, fruit: 0, light: 2.4, lean: 0 });
  const R = T.rng(Math.round(x * 11 + z * 29)); const bells = [];
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * TAU + R() * 0.3, r = 1.2 + R() * 0.9, y = 3.6 + R() * 1.6;
    const pv = new THREE.Group(); pv.position.set(x + Math.sin(a) * r, y, z + Math.cos(a) * r); ctx.group.add(pv);
    const st = new THREE.Mesh(box(0.025, 0.4, 0.025), leadM()); st.position.y = -0.2; pv.add(st);
    const b = new THREE.Mesh(geo('or-bell', () => new THREE.CylinderGeometry(0.08, 0.2, 0.32, 8, 1, true)), glassM(HUES[i % 5], 0.8, 0.9)); b.position.y = -0.52; pv.add(b);
    const lip = new THREE.Mesh(geo('or-belllip', () => new THREE.TorusGeometry(0.2, 0.02, 3, 10).rotateX(Math.PI / 2)), glowM(0xffffff, 2)); lip.position.y = -0.68; pv.add(lip); lip.visible = false;
    bells.push({ pv, lip, ph: i * 0.7 });
  }
  let t = R() * 9; ctx.anims.push({ update(dt) { t += dt; for (const b of bells) { const w = Math.sin(t * 0.8 - b.ph); b.pv.rotation.z = Math.round(w * 0.18 * 64) / 64; b.lip.visible = w > 0.92; } } });
}

// ---------------------------------------------------------------- the Heart Tree
// The orchard's first tree: a trunk wider than a house, of amber glass gone dark with age, its roots arching out
// over the terrace; in the trunk, behind the glass, a choir of figures frozen mid-song, lit from within; its
// canopy so wide it is a ceiling of colour; a hundred fruit. Solid at the trunk only.
export function heartTree(ctx, x, z) {
  const R = T.rng(4747);
  // roots: great arches of amber over the floor
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; const L = 3.6 + R() * 1.6; bar(ctx, 'or-root', amberM(), [x + Math.sin(a) * 1.6, 1.2, z + Math.cos(a) * 1.6], [x + Math.sin(a) * L, 0.05, z + Math.cos(a) * L], 0.34); }
  // the trunk: a ring of amber staves round a dark heart, leaded
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; add(ctx, box(0.9, 7.4, 0.32), glassM(0xd8903a, 0.55, 0.5), x + Math.sin(a) * 1.75, 3.7, z + Math.cos(a) * 1.75, { ry: a }); add(ctx, box(0.08, 7.4, 0.36), leadM(), x + Math.sin(a + TAU / 24) * 1.8, 3.7, z + Math.cos(a + TAU / 24) * 1.8, { ry: a }); }
  add(ctx, cyl(0.7, 0.8, 7.2, 10), glowM(0x9a80e0, 0.9), x, 3.6, z, { cast: false }); // the light at its heart, seen through the staves
  // the frozen choir inside, glowing through the staves
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; const fx = x + Math.sin(a) * 1.25, fz = z + Math.cos(a) * 1.25; add(ctx, cyl(0.18, 0.3, 1.5, 6), glowM(0xd8c8ff, 1.3), fx, 1.4 + (i % 2) * 2.6, fz, { cast: false }); add(ctx, geo('or-head', () => new THREE.SphereGeometry(0.17, 6, 5)), glowM(0xf0e8ff, 1.6), fx, 2.35 + (i % 2) * 2.6, fz, { cast: false }); }
  for (const y of [1.2, 3.8, 6.4]) add(ctx, cyl(1.92, 1.92, 0.12, 12), goldM4(), x, y, z, { cast: false });
  // the canopy: big panes on long boughs, a ceiling of colour
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * TAU + R() * 0.2; const L = 4 + R() * 2.4; const ex = x + Math.sin(a) * L, ez = z + Math.cos(a) * L, ey = 8.2 + R() * 1.6;
    bar(ctx, 'or-bough', amberM(), [x, 7.2, z], [ex, ey, ez], 0.22);
    for (let k = 0; k < 4; k++) { const s = 1.1 + R() * 0.8; add(ctx, box(s, s * 0.75, 0.06), paneM(HUES[(i + k) % 5], 0.85), ex + (R() - 0.5) * 1.4, ey + (R() - 0.5) * 0.6, ez + (R() - 0.5) * 1.4, { ry: R() * TAU, rx: 0.5 + R() * 0.4, cast: false }); }
    for (let k = 0; k < 2; k++) add(ctx, geo('or-fruit', () => new THREE.IcosahedronGeometry(0.16, 0)), fruitM(), ex + (R() - 0.5), ey - 0.8 - R() * 0.5, ez + (R() - 0.5), { cast: false });
  }
  floorGlow(ctx, x, z, 16, 16, 0xb090ff, 0.22);
  glowSprite(ctx, x, 3.6, z, 7, 0xd8c8ff, 0.4);
  ctx.lights.push({ x, y: 3.4, z, color: 0xd0c0ff, intensity: 6, dist: 14, flicker: 0.04 });
  ctx.lights.push({ x, y: 8.5, z, color: 0xffb0d0, intensity: 3.4, dist: 14, flicker: 0.03 });
  motes(ctx, [[x - 8, z - 8, x + 8, z + 8]], 70, { vy: -0.12, h: 9, y0: 0, color: 0xe8d8ff, add: true, k: 1.8, blink: true, sway: 0.6, seed: 4748 });
  solidCircle(ctx, x, z, 2.1, 7.5);
}

// ---------------------------------------------------------------- the gate of glass brambles
// An arch of thorned vines of green glass over a way (axis 'x': the way runs along z), small flowers of light.
export function brambleArch(ctx, x, z, w = 4, axis = 'x') {
  const R = T.rng(Math.round(x * 13 + z * 17)); const vine = glassM(0x5ad8a0, 0.85, 0.5); const ax = axis === 'x';
  for (let i = 0; i <= 12; i++) {
    const u = i / 12; const a = Math.PI * u; const lx = -Math.cos(a) * w / 2, ly = Math.sin(a) * 3.4;
    const px = ax ? x + lx : x, pz = ax ? z : z + lx;
    add(ctx, box(0.26, 0.26, 0.26), vine, px, ly + 0.1, pz, { ry: R() * TAU, rx: R() });
    if (i % 2) { add(ctx, box(0.05, 0.3, 0.05), vine, px + (R() - 0.5) * 0.3, ly + 0.35, pz + (R() - 0.5) * 0.3, { rz: R() - 0.5 }); add(ctx, box(0.1, 0.1, 0.1), glowM(HUES[i % 5], 2), px, ly - 0.15, pz, { cast: false }); }
  }
  for (const s of [-1, 1]) { const px = ax ? x + s * w / 2 : x, pz = ax ? z : z + s * w / 2; for (let k = 0; k < 4; k++) add(ctx, box(0.5, 0.4, 0.5), vine, px + (R() - 0.5) * 0.6, 0.2 + k * 0.1, pz + (R() - 0.5) * 0.6, { ry: R() * TAU }); solidCircle(ctx, px, pz, 0.45, 2); }
}

// ---------------------------------------------------------------- terraces and fallen things
// A low terrace wall of glass blocks along an edge, leaded, the light of the pane colours through it (solid).
export function terrace(ctx, x0, z0, x1, z1, h = 1.0) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const n = Math.max(1, Math.round(len / 0.9)); const R = T.rng(Math.round(x0 * 5 + z0 * 3));
  for (let i = 0; i < n; i++) { const c = (ax ? x0 : z0) + (i + 0.5) * len / n; const hh = h * (0.8 + R() * 0.3); add(ctx, box(ax ? len / n - 0.05 : 0.5, hh, ax ? 0.5 : len / n - 0.05), glassM(HUES[i % 5], 0.7, 0.45), ax ? c : x0, hh / 2, ax ? z0 : c); }
  add(ctx, box(ax ? len : 0.56, 0.08, ax ? 0.56 : len), goldM4(), ax ? (x0 + x1) / 2 : x0, h + 0.04, ax ? z0 : (z0 + z1) / 2, { cast: false });
  solid(ctx, ax ? x0 : x0 - 0.3, ax ? z0 - 0.3 : z0, ax ? x1 : x0 + 0.3, ax ? z0 + 0.3 : z1, h);
}
// A glass tree fallen across the ground: the trunk lying, its canopy shattered round it.
export function fallenTree(ctx, x, z, ry = 0, len = 5) {
  const R = T.rng(Math.round(x * 7 + z * 19)); const c = Math.cos(ry), s = Math.sin(ry);
  add(ctx, cyl(0.26, 0.34, len, 7), amberM(), x, 0.3, z, { rz: Math.PI / 2, ry });
  for (let i = 0; i < 3; i++) add(ctx, cyl(0.38, 0.38, 0.07, 7), goldM4(), x + c * (i - 1) * len * 0.3, 0.3, z - s * (i - 1) * len * 0.3, { rz: Math.PI / 2, ry, cast: false });
  const ex = x + c * len / 2, ez = z - s * len / 2;
  for (let i = 0; i < 10; i++) { const a = R() * TAU, r = R() * 2; add(ctx, box(0.4 + R() * 0.4, 0.04, 0.3 + R() * 0.3), paneM(HUES[i % 5], 0.9), ex + Math.sin(a) * r, 0.04, ez + Math.cos(a) * r, { ry: R() * TAU, cast: false }); }
  floorGlow(ctx, ex, ez, 4, 4, HUES[Math.floor(R() * 5)], 0.2);
  for (let k = -2; k <= 2; k++) solidCircle(ctx, x + c * k * len / 5, z - s * k * len / 5, 0.42, 0.7);
}
// Shards of fallen panes scattered over the ground in a rect (no collision): the orchard's leaf-litter.
export function shards(ctx, x0, z0, x1, z1, n = 20) {
  const R = T.rng(Math.round(x0 * 3 + z0 * 7 + n));
  for (let i = 0; i < n; i++) add(ctx, box(0.15 + R() * 0.3, 0.025, 0.1 + R() * 0.25), paneM(HUES[i % 5], 1.0), x0 + R() * (x1 - x0), 0.03, z0 + R() * (z1 - z0), { ry: R() * TAU, cast: false });
}

// ---------------------------------------------------------------- the gardener
// A gardener-angel of white glass, kneeling among the trees with shears of light, pruning a fruit; it turns its
// head now and then, slowly, toward whoever passes. Front toward ry.
export function gardener(ctx, x, z, ry = 0) {
  const g = glassM(0xf0ecff, 0.85, 0.5); const Pp = (geom, m, lx, ly, lz, o) => part(ctx, geom, m, x, z, ry, lx, ly, lz, o);
  Pp(box(1.0, 0.3, 1.0), stoneM(), 0, 0.15, 0); Pp(cyl(0.22, 0.42, 1.0, 7), g, 0, 0.8, 0); Pp(box(0.42, 0.5, 0.3), g, 0, 1.45, 0.05, { rx: 0.25 });
  const head = Pp(geo('or-ghead', () => new THREE.SphereGeometry(0.16, 7, 6)), g, 0, 1.86, 0.12);
  for (const s of [-1, 1]) { Pp(box(0.1, 1.3, 0.6), g, s * 0.36, 1.6, -0.25, { rz: s * 0.35, rx: -0.25 }); Pp(box(0.09, 0.5, 0.09), g, s * 0.2, 1.2, 0.35, { rx: -1.1 }); }
  Pp(box(0.04, 0.04, 0.6), glowM(0xfff0c0, 2.4), 0, 1.15, 0.75, { rx: -0.2 }); Pp(box(0.04, 0.04, 0.5), glowM(0xfff0c0, 2.4), 0.06, 1.15, 0.72, { rx: -0.2, ry: 0.4 });
  glowSprite(ctx, x, 1.9, z, 1.4, 0xf0e8ff, 0.4);
  let t = Math.random() * 9; const r0 = head.rotation.y; ctx.anims.push({ update(dt) { t += dt; head.rotation.y = r0 + Math.round(Math.sin(t * 0.25) * 0.8 * 16) / 16; } });
  solidCircle(ctx, x, z, 0.55, 1.8);
}

// ---------------------------------------------------------------- the press, the greenhouse, the vault
// The press of voices: a great screw press of bronze over a vat; the vat glows with crushed song, the screw turns.
export function voicePress(ctx, x, z) {
  add(ctx, cyl(1.3, 1.4, 1.0, 12), bronzeM(), x, 0.5, z); add(ctx, geo('or-vat', () => new THREE.CircleGeometry(1.15, 16).rotateX(-Math.PI / 2)), glowM(0xe0c8ff, 1.7), x, 1.02, z, { cast: false });
  for (const s of [-1, 1]) add(ctx, box(0.25, 3.2, 0.25), bronzeM(), x + s * 1.3, 1.6, z); add(ctx, box(2.9, 0.3, 0.35), bronzeM(), x, 3.2, z);
  const screw = new THREE.Group(); screw.position.set(x, 2.1, z); ctx.group.add(screw);
  const sh = new THREE.Mesh(cyl(0.12, 0.12, 2.2, 6), goldM4()); screw.add(sh); for (let i = 0; i < 6; i++) { const th = new THREE.Mesh(box(0.5, 0.06, 0.12), goldM4()); th.position.y = -0.9 + i * 0.36; th.rotation.y = i * 0.9; screw.add(th); }
  const plate = new THREE.Mesh(cyl(1.0, 1.0, 0.16, 12), bronzeM()); plate.position.y = -1.0; screw.add(plate);
  motes(ctx, [[x - 1, z - 1, x + 1, z + 1]], 24, { vy: 0.5, h: 4, y0: 1, color: 0xe8d8ff, add: true, k: 1.6, sway: 0.2, seed: 4790 });
  ctx.lights.push({ x, y: 1.6, z, color: 0xd0b8ff, intensity: 3.6, dist: 7, flicker: 0.07 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; screw.rotation.y = Math.round(t * 0.4 * 16) / 16; screw.position.y = 2.1 + Math.round(Math.sin(t * 0.4) * 0.12 * 32) / 32; } });
  solidCircle(ctx, x, z, 1.5, 1.2);
}
// The greenhouse cathedral: gold ribs rising in pointed arches from the walls of a rect, joined at a ridge,
// some bays still glazed in colour, most broken; a solid wall stub between the ribs except at `doors` (a list of
// [side, from, to] gaps: side 'n','s','e','w', from/to along that side).
export function greenhouse(ctx, x0, z0, x1, z1, doors = []) {
  const R = T.rng(Math.round(x0 * 9 + z1 * 13)); const H = 6.4; const cx = (x0 + x1) / 2; const w = x1 - x0;
  const n = Math.max(3, Math.round((z1 - z0) / 3.2));
  for (let i = 0; i <= n; i++) {
    const z = z0 + i * (z1 - z0) / n;
    // a rib: up each wall, then a pointed arch to the ridge
    for (const s of [-1, 1]) { const wx = s < 0 ? x0 : x1; add(ctx, box(0.18, H * 0.5, 0.18), goldM4(), wx, H * 0.25, z); bar(ctx, 'or-rib', goldM4(), [wx, H * 0.5, z], [cx, H, z], 0.14); }
    if (i < n) {
      const zm = z + (z1 - z0) / n / 2; const bayD = (z1 - z0) / n;
      for (const s of [-1, 1]) {
        const wx = s < 0 ? x0 : x1; const glazed = R() < 0.45;
        if (glazed) add(ctx, box(0.05, H * 0.44, bayD * 0.9), paneM(HUES[(i + (s > 0 ? 2 : 0)) % 5], 0.7), wx, H * 0.25, zm, { cast: false });
        const side = s < 0 ? 'w' : 'e'; const door = doors.find((d) => d[0] === side && zm > d[1] && zm < d[2]);
        if (!door) { add(ctx, box(0.3, 0.6, bayD), stoneM(), wx, 0.3, zm); solid(ctx, wx - 0.2, zm - bayD / 2, wx + 0.2, zm + bayD / 2, 2.4); }
        if (R() < 0.35) add(ctx, box(0.05, w * 0.32, bayD * 0.9), paneM(HUES[(i + 1) % 5], 0.6), (wx + cx) / 2, H * 0.76, zm, { rz: s * 0.95, cast: false });
      }
    }
  }
  add(ctx, box(0.16, 0.16, z1 - z0), goldM4(), cx, H, (z0 + z1) / 2);
  floorGlow(ctx, cx, (z0 + z1) / 2, w, z1 - z0, 0xc0a0ff, 0.12);
}
// The seed vault: shelves of jars along a wall, each jar holding a seed of light.
export function seedShelves(ctx, x0, z0, x1, z1) {
  const ax = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = ax ? x1 - x0 : z1 - z0; const R = T.rng(Math.round(x0 + z0 * 3));
  for (const y of [0.5, 1.2, 1.9]) {
    add(ctx, box(ax ? len : 0.6, 0.08, ax ? 0.6 : len), bronzeM(), ax ? (x0 + x1) / 2 : x0, y, ax ? z0 : (z0 + z1) / 2, { cast: false });
    const n = Math.round(len / 0.5); for (let i = 0; i < n; i++) { if (R() < 0.2) continue; const c = (ax ? x0 : z0) + (i + 0.5) * len / n; const jx = ax ? c : x0, jz = ax ? z0 : c; add(ctx, cyl(0.12, 0.13, 0.32, 6), glassM(0xd8e8ff, 0.5, 0.3), jx, y + 0.2, jz, { cast: false }); add(ctx, box(0.07, 0.07, 0.07), glowM(HUES[i % 5], 2.2), jx, y + 0.18, jz, { cast: false }); }
  }
  solid(ctx, ax ? x0 : x0 - 0.35, ax ? z0 - 0.35 : z0, ax ? x1 : x0 + 0.35, ax ? z0 + 0.35 : z1, 2.2);
}
// A lantern of the orchard: a cage of leading on a pole holding a cluster of fruit-light (a light, a glow).
export function fruitLantern(ctx, x, z, hue = 0xe8e0ff) {
  add(ctx, cyl(0.05, 0.07, 1.8, 6), leadM(), x, 0.9, z); add(ctx, box(0.36, 0.42, 0.36), glassM(hue, 0.5, 1.2), x, 2.0, z, { cast: false });
  add(ctx, geo('or-fruit', () => new THREE.IcosahedronGeometry(0.16, 0)), fruitM(), x, 2.0, z, { cast: false });
  glowSprite(ctx, x, 2.0, z, 1.8, hue, 0.45);
  ctx.lights.push({ x, y: 2.0, z, color: hue, intensity: 2.8, dist: 6, flicker: 0.06 });
  solidCircle(ctx, x, z, 0.22, 2);
}
// The sky over the orchard: the underside of heaven's floor, far above, cracked, with light through the cracks
// falling in pale columns (a few) and petals of glass drifting down through them.
export function fallingLight(ctx, x, z, r = 2) {
  const m = new THREE.Mesh(geo('or-shaft', () => new THREE.CylinderGeometry(1, 1.4, 1, 10, 1, true)), new THREE.MeshBasicMaterial({ color: 0xd8c8ff, transparent: true, opacity: 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  m.scale.set(r, 14, r); m.position.set(x, 7, z); ctx.group.add(m);
  decal(ctx, x, z, r * 2.6, T.glow('#ffffff', 64, 1.2), 0xd8c8ff, { k: 0.35, pulse: 0.3 });
}
