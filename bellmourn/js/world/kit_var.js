// The variants' set dressing: what a condition lays over a district after the district's own build (FLOODED: a
// sheet of water over every street, things afloat; BURNING: fires against the walls, scorch and smoke; FROZEN OVER:
// frost on the stones, ice growing at the walls; ...), the layout's blocks across the way (rubble, fire, flood, ice,
// bones, a barricade, roots, black glass, an ash drift; every one solid) and the touches (small glowing props the
// hero can walk into: quest hints, a trapped survivor, a cursed lamp). Called by the build applyVariant wraps
// (js/game/variants.js) as K.variantDress(K, ctx, def), so it works for every level without the level knowing.
// Ground sheets follow the walkable floor: a 1 m grid over the bounds, cells clear of the district's solids, merged
// into one mesh per sheet (one draw call), world-mapped so the texture runs on across cells.
import * as THREE from '../../vendor/three.module.min.js';
import { add, box, cyl, cone, plane, solid, puddle } from './kit.js';
import { M } from '../engine/materials.js';
import * as T from '../engine/textures.js';
import { pix, flame, floorGlow, decal, lowSolid, q16 } from './kit2.js';
import { glowSprite, puffs, mistTex, fogBank } from './kit3.js';
import { rubble, bonePile, skull } from './props/undercroft.js';
import { CONDITIONS } from '../game/variants.js';

// ---------------------------------------------------------------- the walkable grid
function grid(ctx, def) {
  const [x0, z0, x1, z1] = def.bounds; const S = 1; const nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S);
  const sol = ctx.solids.filter((s) => !s.gate);
  const freeAt = (x, z, pad = 0) => { for (const s of sol) { if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + pad) return false; } else if (x > s.x0 - pad && x < s.x1 + pad && z > s.z0 - pad && z < s.z1 + pad) return false; } return true; };
  const cells = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) cells[j * nx + i] = freeAt(x0 + i + 0.5, z0 + j + 0.5) ? 1 : 0;
  // the sheets (water, frost, ash) run under small props too: only walls and buildings (tall solids) cut them
  // (and large solids of any height: rock fill, deep water, the void beyond a walkway: a sheet never lies over those)
  const tall = sol.filter((s) => (s.r !== undefined ? s.r >= 0.8 : ((s.h ?? 3) >= 2.2 && !(s.x1 - s.x0 < 1.2 && s.z1 - s.z0 < 1.2)) || (s.x1 - s.x0) * (s.z1 - s.z0) >= 3));
  const sheetCells = []; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i + 0.5, z = z0 + j + 0.5; let ok = true; for (const s of tall) { if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r) { ok = false; break; } } else if (x > s.x0 + 0.1 && x < s.x1 - 0.1 && z > s.z0 + 0.1 && z < s.z1 - 0.1) { ok = false; break; } } if (ok) sheetCells.push({ x, z }); }
  const isFree = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && cells[j * nx + i] === 1;
  const list = []; for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (cells[j * nx + i]) {
    const edge = !isFree(i - 1, j) || !isFree(i + 1, j) || !isFree(i, j - 1) || !isFree(i, j + 1);
    const open = isFree(i - 1, j) && isFree(i + 1, j) && isFree(i, j - 1) && isFree(i, j + 1) && isFree(i - 1, j - 1) && isFree(i + 1, j + 1);
    list.push({ i, j, x: x0 + i + 0.5, z: z0 + j + 0.5, edge, open });
  }
  return { x0, z0, nx, nz, cells, list, sheetCells, freeAt, isFree };
}
// spread picks: cells in a seeded order, each at least `gap` metres from the others (and from avoid points)
// The first two picks are made 3.5-9 m from the start when there is room (the condition shows from the first step).
let FOCUS = null;
function spread(cands, n, gap, R, avoid = []) {
  const c = cands.slice(); for (let i = c.length - 1; i > 0; i--) { const k = Math.floor(R() * (i + 1)); [c[i], c[k]] = [c[k], c[i]]; }
  if (FOCUS) { const d = (p) => Math.hypot(p.x - FOCUS.x, p.z - FOCUS.z); const nearby = c.filter((p) => d(p) > 3.5 && d(p) < 9).slice(0, 2); c.unshift(...nearby); }
  const out = []; for (const p of c) { if (out.length >= n) break; if (out.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < gap)) continue; if (avoid.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < (q.r || 2.2))) continue; out.push(p); }
  return out;
}

// One merged sheet over the free cells (y above the floor), world-mapped UVs (tile metres per texture repeat).
function sheet(ctx, G, y, mat, tile = 6, keep = () => true) {
  const pos = [], uv = [], nor = [], idx = []; let n = 0;
  for (const c of G.sheetCells) {
    if (!keep(c)) continue; const xa = c.x - 0.5, xb = c.x + 0.5, za = c.z - 0.5, zb = c.z + 0.5;
    pos.push(xa, y, za, xb, y, za, xb, y, zb, xa, y, zb); for (let k = 0; k < 4; k++) nor.push(0, 1, 0);
    uv.push(xa / tile, -za / tile, xb / tile, -za / tile, xb / tile, -zb / tile, xa / tile, -zb / tile);
    idx.push(n, n + 2, n + 1, n, n + 3, n + 2); n += 4;
  }
  if (!n) return null;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.receiveShadow = true; m.castShadow = false; m.userData.static = false; ctx.group.add(m); return m;
}

// ---------------------------------------------------------------- textures (drawn in code, 16 texels a metre)
const rippleTex = () => pix('kv-ripple', 96, 96, (g, W) => {
  const R = T.rng(901); g.fillStyle = '#5a7480'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 70; i++) { const x = R() * W, y = R() * W, l = 4 + R() * 12; g.fillStyle = R() < 0.5 ? '#8aa8b4' : '#3c5460'; g.fillRect(Math.floor(x), Math.floor(y), Math.ceil(l), 1); }
  for (let i = 0; i < 26; i++) { g.fillStyle = '#c8dce4'; g.fillRect(Math.floor(R() * W), Math.floor(R() * W), 2, 1); }
}, true);
const glintTex = () => pix('kv-glint', 64, 64, (g, W) => { const R = T.rng(907); for (let i = 0; i < 40; i++) { g.fillStyle = R() < 0.3 ? '#ffffff' : '#9ab8c8'; g.fillRect(Math.floor(R() * W), Math.floor(R() * W), 2 + Math.floor(R() * 6), 1); } }, true);
const frostTex = () => pix('kv-frost', 96, 96, (g, W) => {
  const R = T.rng(902); g.fillStyle = '#c8d8ea'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 900; i++) { const v = R(); g.fillStyle = v < 0.35 ? '#a8bed6' : v < 0.7 ? '#e4eef8' : '#f8fcff'; g.fillRect(Math.floor(R() * W), Math.floor(R() * W), 1, 1); }
  g.strokeStyle = '#ffffff'; g.lineWidth = 1; for (let i = 0; i < 18; i++) { let x = R() * W, y = R() * W; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (R() - 0.5) * 14; y += (R() - 0.5) * 14; g.lineTo(Math.round(x), Math.round(y)); } g.stroke(); }
}, true);
const ashTex = () => pix('kv-ash', 96, 96, (g, W) => {
  const R = T.rng(903); g.fillStyle = '#6a6460'; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 1300; i++) { const v = R(); g.fillStyle = v < 0.4 ? '#58524e' : v < 0.8 ? '#7a746e' : (v < 0.97 ? '#8e8882' : '#ff7a30'); g.fillRect(Math.floor(R() * W), Math.floor(R() * W), 1, 1); }
}, true);
// a soft irregular blot (white on clear): pools of blood, bile, scorch
const blotTex = (seed) => pix('kv-blot' + seed, 32, 32, (g, W) => {
  const R = T.rng(seed); const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; const lumps = []; for (let i = 0; i < 5; i++) lumps.push([W * (0.3 + R() * 0.4), W * (0.3 + R() * 0.4), 4 + R() * 6]);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { let v = 0; for (const [bx, by, br] of lumps) v += Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (br * br)); if (v * 1.5 > (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16) { g.fillStyle = '#ffffff'; g.fillRect(x, y, 1, 1); } }
});
// a jagged crack (white lines on clear) that glows when tinted additive
const crackTex = () => pix('kv-crack', 48, 48, (g, W) => {
  const R = T.rng(905); g.strokeStyle = '#ffffff'; g.lineWidth = 1;
  for (let b = 0; b < 4; b++) { let x = W / 2, y = W / 2; const a0 = b * 1.57 + R(); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 7; k++) { const a = a0 + (R() - 0.5) * 1.2; x += Math.cos(a) * 3.4; y += Math.sin(a) * 3.4; g.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); } g.stroke(); }
  g.fillStyle = '#ffffff'; g.fillRect(W / 2 - 1, W / 2 - 1, 3, 3);
});
// rings of sound (a voice): three thin circles
const ringsTex = () => pix('kv-rings', 48, 48, (g, W) => { g.strokeStyle = '#ffffff'; g.lineWidth = 1; for (const r of [7, 13, 20]) { g.beginPath(); g.arc(W / 2, W / 2, r, 0, Math.PI * 2); g.stroke(); } });

const darkBlot = (ctx, x, z, s, color, op, seed, o = {}) => {
  const mat = o.gloss ? new THREE.MeshPhongMaterial({ map: blotTex(seed), color, transparent: true, opacity: op, depthWrite: false, shininess: 70, specular: o.gloss, alphaTest: 0.5 })
    : new THREE.MeshBasicMaterial({ map: blotTex(seed), color, transparent: true, opacity: op, depthWrite: false, alphaTest: 0.5 });
  const m = new THREE.Mesh(plane(s, s * (o.d ?? 0.8)), mat); m.rotation.x = -Math.PI / 2; m.rotation.z = o.rz || 0; m.position.set(x, o.y ?? 0.035, z); m.renderOrder = 2; ctx.group.add(m); return m;
};

// ---------------------------------------------------------------- condition overlays
function waterOver(ctx, G, color) {
  const t = rippleTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshPhongMaterial({ map: t, color, transparent: true, opacity: 0.66, shininess: 100, specular: 0x9ac0d0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  sheet(ctx, G, 0.07, mat, 6);
  // the light running on the water: thin additive glints drifting the other way
  const h = glintTex().clone(); h.needsUpdate = true; h.wrapS = h.wrapT = THREE.RepeatWrapping;
  sheet(ctx, G, 0.09, new THREE.MeshBasicMaterial({ map: h, color: 0x6a9aaa, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 5);
  let ox = 0; ctx.anims.push({ update(dt) { ox += dt * 0.025; t.offset.set(Math.round(ox * 96) / 96, Math.round(ox * 0.6 * 96) / 96); h.offset.set(-Math.round(ox * 1.3 * 64) / 64, Math.round(ox * 0.4 * 64) / 64); return false; } });
}
// a drifting dithered mist over the walkable cells only (fog, miasma)
function mistOver(ctx, G, y, op, color, tile) {
  const t = mistTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  sheet(ctx, G, y, new THREE.MeshBasicMaterial({ map: t, color, transparent: true, opacity: op, depthWrite: false, fog: false }), tile);
  let ox = Math.random(), oz = Math.random(); ctx.anims.push({ update(dt) { ox += dt * 0.03; oz += dt * 0.012; t.offset.set(Math.round(ox * 96) / 96, Math.round(oz * 96) / 96); return false; } });
}
function wetOver(ctx, G) {
  sheet(ctx, G, 0.045, new THREE.MeshPhongMaterial({ color: 0x0c121a, transparent: true, opacity: 0.32, shininess: 110, specular: 0x8ca0c0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 6);
}
function frostOver(ctx, G, color) {
  const mat = new THREE.MeshLambertMaterial({ map: frostTex(), color, transparent: true, opacity: 0.62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  sheet(ctx, G, 0.05, mat, 6);
}
function ashOver(ctx, G, color) {
  const mat = new THREE.MeshLambertMaterial({ map: ashTex(), color, transparent: true, opacity: 0.68, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  sheet(ctx, G, 0.05, mat, 6);
}
function fires(ctx, G, n, R, avoid) {
  const char = M.flat(0x1a1210); const at = spread(G.list.filter((c) => c.edge), n, 6, R, avoid);
  for (const c of at) {
    for (let k = 0; k < 3; k++) { const a = R() * 6.28, r = R() * 0.5; flame(ctx, c.x + Math.cos(a) * r, 0.35 + R() * 0.25, c.z + Math.sin(a) * r, 0.9 + R() * 0.7); }
    for (let k = 0; k < 2; k++) add(ctx, box(1.4, 0.16, 0.18), char, c.x, 0.12, c.z, { ry: R() * 3, rz: (R() - 0.5) * 0.3 });
    floorGlow(ctx, c.x, c.z, 3.2, 3.2, 0xff6a20, 0.9);
    ctx.lights.push({ x: c.x, y: 1.1, z: c.z, color: 0xff7a2a, intensity: 5, dist: 7, flicker: 0.35, halo: true });
  }
  return at;
}
function scorch(ctx, G, n, R, avoid) { for (const c of spread(G.list.filter((c) => c.open), n, 3, R, avoid)) darkBlot(ctx, c.x, c.z, 1.6 + R() * 1.4, 0x0a0806, 0.75, 911 + (n % 3), { rz: R() * 3 }); }
function pools(ctx, G, n, R, avoid, color, gloss, seed) { for (const c of spread(G.list.filter((c) => c.open), n, 3.5, R, avoid)) darkBlot(ctx, c.x, c.z, 1.2 + R() * 1.2, color, 0.82, seed, { rz: R() * 3, gloss }); }
function cracks(ctx, G, n, R, avoid, color) {
  for (const c of spread(G.list.filter((c) => c.open), n, 5, R, avoid)) { decal(ctx, c.x, c.z, 2.2 + R(), crackTex(), color, { k: 1.4, pulse: 1.3, phase: R() * 6, rz: R() * 6 }); floorGlow(ctx, c.x, c.z, 2.4, 2.4, color, 0.35); }
}
function sigils(ctx, G, n, R, avoid, color) {
  for (const c of spread(G.list.filter((c) => c.open), n, 6, R, avoid)) { decal(ctx, c.x, c.z, 2.4, T.sigil('circle', 48, 61 + Math.floor(R() * 4)), color, { k: 1.1, pulse: 1.1, phase: R() * 6, spin: 0.08 }); glowSprite(ctx, c.x, 1.4 + R(), c.z, 0.9, color, 0.6); }
}
function icicles(ctx, G, n, R, avoid) {
  const m = new THREE.MeshPhongMaterial({ color: 0x9ed0f0, emissive: 0x1a3a58, specular: 0xffffff, shininess: 100, flatShading: true });
  for (const c of spread(G.list.filter((c) => c.edge), n, 4, R, avoid)) for (let k = 0; k < 4; k++) { const h = 0.4 + R() * 0.8; add(ctx, cone(0.12 + R() * 0.1, h, 5), m, c.x + (R() - 0.5) * 0.8, h / 2, c.z + (R() - 0.5) * 0.8, { rx: (R() - 0.5) * 0.5, rz: (R() - 0.5) * 0.5 }); }
}
function cinders(ctx, G, n, R, avoid) {
  const m = M.flat(0x4a4642);
  for (const c of spread(G.list.filter((c) => c.edge), n, 4, R, avoid)) { const s = add(ctx, cyl(0.1, 0.9 + R() * 0.5, 0.35, 7), m, c.x, 0.1, c.z); s.scale.z = 0.6; floorGlow(ctx, c.x, c.z, 1.2, 1.2, 0xff5a18, 0.6); }
}
function debris(ctx, G, n, R, avoid) {
  const wood = M.wood('#4a3626'); const items = [];
  for (const c of spread(G.list.filter((c) => c.open), n, 4, R, avoid)) {
    const g = new THREE.Group(); g.position.set(c.x, 0.08, c.z); g.rotation.y = R() * 6; ctx.group.add(g);
    if (R() < 0.5) { const b = new THREE.Mesh(box(1.2, 0.08, 0.26), wood); g.add(b); } else { const b = new THREE.Mesh(cyl(0.22, 0.22, 0.5, 8), wood); b.rotation.z = Math.PI / 2; g.add(b); }
    items.push({ g, ph: R() * 6 });
  }
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const it of items) { it.g.position.y = 0.08 + Math.round(Math.sin(t * 1.3 + it.ph) * 0.03 * 16) / 16; it.g.rotation.y += dt * 0.03; } return false; } });
}
function motes(ctx, G, n, R, avoid, color) {
  const list = []; for (const c of spread(G.list.filter((c) => c.open), n, 6, R, avoid)) list.push({ sp: glowSprite(ctx, c.x, 1.2, c.z, 0.7, color, 0.7), y: 0.8 + R() * 1.4, ph: R() * 6 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; for (const m of list) m.sp.position.y = m.y + Math.sin(t * 0.9 + m.ph) * 0.25; return false; } });
}

function overlay(ctx, G, def, C, R, avoid) {
  const o = C.overlay || {}; const b = def.bounds;
  if (o.water) { waterOver(ctx, G, o.water); }
  if (o.wet) wetOver(ctx, G);
  if (o.debris) debris(ctx, G, 9, R, avoid);
  if (o.frost) frostOver(ctx, G, o.frost);
  if (o.icicles) icicles(ctx, G, o.icicles, R, avoid);
  if (o.ash) ashOver(ctx, G, o.ash);
  if (o.cinders) cinders(ctx, G, o.cinders, R, avoid);
  if (o.fires) { const at = fires(ctx, G, o.fires, R, avoid); if (o.smoke) puffs(ctx, at.slice(0, o.smoke).map((c) => [c.x, 1.2, c.z, 1.1, 1.3, 1.6, 0x2a2420, 0.45])); }
  if (o.scorch) scorch(ctx, G, o.scorch, R, avoid);
  if (o.fog) { for (const c of spread(G.list, 8, 12, R, [])) fogBank(ctx, c.x - 7, c.z - 5, c.x + 7, c.z + 5, { color: o.fog, opacity: 0.11, per: 30 }); }
  if (o.mist) mistOver(ctx, G, 1.4, 0.08, o.mist, 16);
  if (o.blood) pools(ctx, G, o.blood, R, avoid, 0x5a0a0c, 0x803030, 921);
  if (o.miasma) mistOver(ctx, G, 0.45, 0.16, o.miasma, 14);
  if (o.bile) pools(ctx, G, o.bile, R, avoid, 0x3a5a14, 0x8ac040, 922);
  if (o.fumes) puffs(ctx, spread(G.list.filter((c) => c.open), o.fumes, 8, R, avoid).map((c) => [c.x, 0.2, c.z, 1.4, 0.7, 1.4, 0x7aa050, 0.35]));
  if (o.cracks) cracks(ctx, G, o.cracks, R, avoid, o.glow || 0x9a60ff);
  if (o.sigils) sigils(ctx, G, o.sigils, R, avoid, o.glow || 0xffd070);
  if (o.puddles) for (const c of spread(G.list.filter((c) => c.open), o.puddles, 3, R, avoid)) puddle(ctx, c.x, c.z, 1.4 + R() * 1.4, 0.9 + R() * 0.8);
  if (o.struck) for (const c of spread(G.list.filter((c) => c.open), o.struck, 6, R, avoid)) { darkBlot(ctx, c.x, c.z, 1.8, 0x08080c, 0.8, 913); decal(ctx, c.x, c.z, 2, crackTex(), o.glow || 0x80b8ff, { k: 1.2, pulse: 4, phase: R() * 6 }); }
  if (o.glow && !o.cracks && !o.sigils) motes(ctx, G, 7, R, avoid, o.glow);
}

// ---------------------------------------------------------------- blocks (solid; [x, z, w, d, kind])
const iceMat0 = () => new THREE.MeshPhongMaterial({ color: 0x8ec4e8, emissive: 0x1a3a58, specular: 0xe8f6ff, shininess: 90, flatShading: true });
// walkable ice laid by a level's build under a layout flag (a frozen canal, the frozen marsh's bridges)
let iceFloor = null; export function iceMat() { return iceFloor || (iceFloor = new THREE.MeshPhongMaterial({ map: frostTex(), color: 0xb4d0e8, specular: 0xe8f6ff, shininess: 80 })); }
function block(ctx, b, R) {
  const [x, z, w, d, kind] = b; const n = Math.max(3, Math.round(w * d * 2));
  if (kind === 'rubble') rubble(ctx, x, z, w, d, { h: 1.2, solid: false });
  else if (kind === 'fire') {
    const char = M.flat(0x1e1410);
    for (let k = 0; k < 4; k++) add(ctx, box(Math.max(w, d) * 1.1, 0.2, 0.22), char, x + (R() - 0.5) * w * 0.4, 0.2 + k * 0.18, z + (R() - 0.5) * d * 0.4, { ry: R() * 3, rz: (R() - 0.5) * 0.5 });
    for (let k = 0; k < 5; k++) flame(ctx, x + (R() - 0.5) * w * 0.8, 0.5 + R() * 0.6, z + (R() - 0.5) * d * 0.8, 1.2 + R() * 0.8);
    floorGlow(ctx, x, z, w + 3, d + 3, 0xff6a20, 1.0); ctx.lights.push({ x, y: 1.4, z, color: 0xff7a2a, intensity: 6, dist: 8, flicker: 0.35, halo: true });
    puffs(ctx, [[x, 1.6, z, 1.2, 1.2, 1.8, 0x2a2420, 0.4]]);
  } else if (kind === 'flood') {
    const t = rippleTex(); const m = new THREE.Mesh(plane(w + 0.6, d + 0.6), new THREE.MeshPhongMaterial({ map: t, color: 0x0e2a34, specular: 0x8ab0c0, shininess: 90, transparent: true, opacity: 0.92 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.09, z); ctx.group.add(m);
    for (let k = 0; k < n; k++) { const s = q16(0.3 + R() * 0.3); const a = R() * 6.28; add(ctx, box(s, 0.12, s * 0.8), M.ashlar('#4a5262'), x + Math.cos(a) * (w / 2 + 0.2), 0.08, z + Math.sin(a) * (d / 2 + 0.2), { ry: R() * 3, rx: (R() - 0.5) * 0.4 }); }
    lowSolid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, 1); return;
  } else if (kind === 'ice') {
    const m = iceMat0(); for (let k = 0; k < n + 2; k++) { const h = 0.9 + R() * 1.6, r = 0.22 + R() * 0.18; add(ctx, cone(r, h, 5), m, x + (R() - 0.5) * w, h / 2, z + (R() - 0.5) * d, { rx: (R() - 0.5) * 0.4, rz: (R() - 0.5) * 0.4, ry: R() * 3 }); }
    floorGlow(ctx, x, z, w + 1.6, d + 1.6, 0x60a8e0, 0.4);
  } else if (kind === 'bones') {
    bonePile(ctx, x, z, Math.max(w, d) * 0.55, 14); bonePile(ctx, x + w * 0.25, z - d * 0.2, 0.5, 8);
    for (let k = 0; k < 4; k++) skull(ctx, x + (R() - 0.5) * w * 0.8, 0.12 + R() * 0.3, z + (R() - 0.5) * d * 0.8, R() * 6);
    const m = add(ctx, cone(0.5, 1, 7), M.dirt('#3a3430'), x, 0.3, z); m.scale.set(w, 0.7, d);
  } else if (kind === 'barricade') {
    const wd = M.wood('#4a3626'), dk = M.wood('#3a2a1e');
    for (let k = 0; k < n; k++) { const s = q16(0.5 + R() * 0.35); add(ctx, box(s, s, s), k % 2 ? wd : dk, x + (R() - 0.5) * w * 0.8, s / 2 + (k > n / 2 ? s * 0.8 : 0), z + (R() - 0.5) * d * 0.8, { ry: R() * 3 }); }
    for (let k = 0; k < 3; k++) add(ctx, box(Math.max(w, d) * 1.1, 0.12, 0.2), dk, x, 0.4 + k * 0.4, z, { ry: (w > d ? 0 : Math.PI / 2) + (R() - 0.5) * 0.6, rz: (R() - 0.5) * 0.6 });
  } else if (kind === 'roots') {
    const m = M.flat(0x2a2218); for (let k = 0; k < n + 3; k++) { const l = 1 + R() * 1.4; add(ctx, cyl(0.06, 0.18, l, 5), m, x + (R() - 0.5) * w, l * 0.35, z + (R() - 0.5) * d, { rx: (R() - 0.5) * 1.6, rz: (R() - 0.5) * 1.6 }); }
    const mm = add(ctx, cone(0.5, 1, 7), M.dirt('#2a2c22'), x, 0.25, z); mm.scale.set(w, 0.6, d);
  } else if (kind === 'glass') {
    const m = new THREE.MeshPhongMaterial({ color: 0x1c1428, emissive: 0x2a0a40, specular: 0xc8a0ff, shininess: 110, flatShading: true });
    for (let k = 0; k < n + 2; k++) { const h = 0.8 + R() * 1.7, r = 0.2 + R() * 0.16; add(ctx, cone(r, h, 4), m, x + (R() - 0.5) * w, h / 2, z + (R() - 0.5) * d, { rx: (R() - 0.5) * 0.4, rz: (R() - 0.5) * 0.4, ry: R() * 3 }); }
    floorGlow(ctx, x, z, w + 1.6, d + 1.6, 0x9a40ff, 0.5);
  } else if (kind === 'ash') {
    const mm = add(ctx, cone(0.5, 1, 8), M.dirt('#6a6460'), x, 0.4, z); mm.scale.set(w * 1.1, 0.9, d * 1.1);
    for (let k = 0; k < 3; k++) add(ctx, box(Math.max(w, d), 0.16, 0.18), M.flat(0x1a1410), x + (R() - 0.5) * w * 0.5, 0.5 + k * 0.12, z + (R() - 0.5) * d * 0.5, { ry: R() * 3, rz: (R() - 0.5) * 0.6 });
    floorGlow(ctx, x, z, w + 1, d + 1, 0xff5a18, 0.4);
  }
  solid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, 1.4);
}

// ---------------------------------------------------------------- touches (glowing props the hero walks into)
const TOUCH_COL = { note: 0xffc860, mark: 0x7ad0ff, voice: 0xc890ff, survivor: 0xff9a40, cursedlamp: 0xa050ff };
function touch(ctx, t) {
  const col = TOUCH_COL[t.kind] ?? 0xffffff; const g = new THREE.Group(); g.position.set(t.x, 0, t.z); ctx.group.add(g);
  const P = (geom, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = true; g.add(m); return m; };
  // the floor glow every touch shares: a soft disc that breathes (how a player notices it from a distance)
  const disc = new THREE.Mesh(plane(2.4, 2.4), new THREE.MeshBasicMaterial({ map: T.glow('#ffffff', 32, 1.4), color: new THREE.Color(col).multiplyScalar(0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.04; disc.renderOrder = 3; g.add(disc);
  const mote = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow('#ffffff', 32, 1.5), color: new THREE.Color(col).multiplyScalar(1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  mote.scale.set(0.55, 0.55, 1); mote.position.y = 1.1; g.add(mote);
  let ring = null;
  if (t.kind === 'note') { P(box(0.34, 0.03, 0.26), M.flat(0xd8ccb0), 0, 0.03, 0, { ry: 0.5 }); P(box(0.3, 0.02, 0.22), M.flat(0xc0b498), 0.12, 0.05, 0.08, { ry: -0.3 }); }
  else if (t.kind === 'mark') { const s = new THREE.Mesh(plane(1.1, 1.1), new THREE.MeshBasicMaterial({ map: T.sigil('ring', 48, 71), color: new THREE.Color(col).multiplyScalar(1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.rotation.x = -Math.PI / 2; s.position.y = 0.05; s.renderOrder = 4; g.add(s); }
  else if (t.kind === 'voice') { ring = new THREE.Mesh(plane(1.6, 1.6), new THREE.MeshBasicMaterial({ map: ringsTex(), color: new THREE.Color(col).multiplyScalar(1.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.renderOrder = 4; g.add(ring); }
  else if (t.kind === 'survivor') {
    // a Hushed kneeling, head bowed, chained to an iron ring in the stones
    const cloth = M.flat(0x252933), skin = M.flat(0x4a4448), iron = M.ironLit();
    P(cone(0.32, 0.7, 6), cloth, 0, 0.35, 0); P(new THREE.SphereGeometry(0.15, 6, 5), skin, 0.06, 0.78, 0.02); P(cone(0.19, 0.3, 6), cloth, 0.05, 0.88, 0.02);
    P(cyl(0.12, 0.12, 0.05, 8), iron, -0.55, 0.03, 0.2); for (let k = 0; k < 5; k++) P(box(0.05, 0.05, 0.12), iron, -0.45 + k * 0.1, 0.06 + k * 0.05, 0.16 - k * 0.03, { ry: 0.4 });
  } else if (t.kind === 'cursedlamp') {
    const iron = M.ironLit(); P(cyl(0.06, 0.08, 1.8, 6), iron, 0, 0.9, 0); P(box(0.3, 0.36, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.4), fog: false }), 0, 1.95, 0); P(cone(0.24, 0.22, 4), iron, 0, 2.24, 0, { ry: Math.PI / 4 });
    mote.position.y = 1.95; mote.scale.set(1.1, 1.1, 1);
  }
  const light = { x: t.x, y: 1.2, z: t.z, color: col, intensity: 2.6, dist: 4.5, flicker: 0.1 }; ctx.lights.push(light);
  let tt = Math.random() * 6; const anim = { update(dt) {
    if (!g.visible) return false; tt += dt; disc.material.opacity = 0.55 + 0.45 * Math.sin(tt * 2.2); mote.position.y = (t.kind === 'cursedlamp' ? 1.95 : 1.0) + Math.sin(tt * 1.6) * 0.12;
    if (ring) { const k = (tt * 0.5) % 1; ring.scale.setScalar(0.6 + k * 1.2); ring.material.opacity = 1 - k; }
    return false;
  } };
  ctx.anims.push(anim);
  return { ...t, group: g, light, hidden: false, hide() {
    this.hidden = true; g.visible = false; light.on = false;
    try { const G = typeof window !== 'undefined' && window.BM && window.BM.game; const s = G && G.atmos && G.atmos.sources.find((q) => q.x === light.x && q.y === light.y && q.z === light.z); if (s) s.on = false; } catch (e) { /* no game: nothing else to dim */ }
  } };
}

// ---------------------------------------------------------------- the entry point
export function dress(K, ctx, def) {
  const v = def.variant; const C = v && CONDITIONS[v.condition];
  const R = T.rng(Math.abs((v ? v.id : def.id).split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 100000 + 1);
  const touches = def.touches || []; const blocks = (def.layout && def.layout.blocks) || [];
  const avoid = [{ ...def.start, r: 2.5 }, ...touches.map((t) => ({ x: t.x, z: t.z, r: 2.2 })), ...(def.lamps || []).map((l) => ({ x: l.x, z: l.z, r: 2 })), ...(def.items || []).map((l) => ({ x: l.x, z: l.z, r: 1.6 })), ...blocks.map((b) => ({ x: b[0], z: b[1], r: Math.max(b[2], b[3]) }))];
  if (C) { const G = grid(ctx, def); FOCUS = def.start; overlay(ctx, G, def, C, R, avoid); FOCUS = null; }
  for (const b of blocks) block(ctx, b, R);
  for (const t of touches) ctx.marks['touch:' + t.id] = touch(ctx, t);
}
