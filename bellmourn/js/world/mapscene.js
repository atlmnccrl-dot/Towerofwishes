// The act's route as a place, not a sheet: the whole road of the act built as a dark diorama in the game's own
// look, under the act's own weather. Every stop is a landmark on the ground: an area a little cluster of its own
// buildings (slate and lit windows in the city, snow in the Frostmarch, domes in the dunes, obsidian in the Abyss,
// white pillars in heaven...), the boss a tall tower with its bell burning red at the top, a shrine a brazier, a
// merchant a lantern cart, an event a standing stone in mist, a trial a ring of torches, a quest a gold banner.
// The roads between them are flagstone paths with a lamp on each: walked roads are lit, the roads open now glow
// and pulse, the rest are dark. game.js stages it (stageMap) and drives the camera; ui/map.js draws the panel.
//
// buildMapScene(map, run) -> { group, def, solids, lights, nodePos(id) -> {x, z}, top(id) -> y, update(dt, state) }
// state: { visited:Set, walked:Set('a>b'), next:Set, at, sel, t }
// PROPOSAL: every landmark.
import * as THREE from '../../vendor/three.module.min.js';
import * as K from './kit.js';
import { M } from '../engine/materials.js';
import * as T from '../engine/textures.js';
import LEVELS from './levels/index.js';

const RIGHT = new THREE.Vector3(Math.SQRT1_2, 0, -Math.SQRT1_2), DOWN = new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
const ROW = 6.2, WIDE = 17;

// each area's look on the map: walls, roofs, the colour of its lit windows, and its shape
const STYLE = {
  town: { wall: '#3c4452', roof: '#222a36', glow: '#ffb050', shape: 'town' },
  gate: { wall: '#3a3e48', roof: '#1e2430', glow: '#ff9a40', shape: 'town', gallows: true },
  docks: { wall: '#34403e', roof: '#1e2a2c', glow: '#ffc060', shape: 'town', water: true },
  nave: { wall: '#3e4250', roof: '#1c2232', glow: '#9ac8ff', shape: 'chapel' },
  undercroft: { wall: '#3a3630', roof: '#26201a', glow: '#ff8a40', shape: 'ruin' },
  foundry: { wall: '#44382e', roof: '#2a2018', glow: '#ff7020', shape: 'forge' },
  heights: { wall: '#4a4e5a', roof: '#262e3c', glow: '#ffd080', shape: 'town', tall: true },
  belfry: { wall: '#3a3e4a', roof: '#1a1e28', glow: '#ff4030', shape: 'tower' },
  frostmarch: { wall: '#7a8494', roof: '#e8eef6', glow: '#9ad8ff', shape: 'town', snow: true },
  ashdunes: { wall: '#8a6a44', roof: '#a0804e', glow: '#ffa040', shape: 'dome' },
  catacombs: { wall: '#8a8478', roof: '#4a463e', glow: '#80ff90', shape: 'ruin' },
  abyss: { wall: '#2a1414', roof: '#140a0a', glow: '#ff3a20', shape: 'spikes' },
  marsh: { wall: '#3a4a3a', roof: '#24301e', glow: '#70ffc0', shape: 'stilts', water: true },
  spire: { wall: '#6a5434', roof: '#3e3220', glow: '#ffd060', shape: 'clock' },
  empyrean: { wall: '#d8d0b8', roof: '#f0e8d0', glow: '#fff0a0', shape: 'temple' },
  choir: { wall: '#4a6a72', roof: '#2a4048', glow: '#a0e8ff', shape: 'chapel', water: true },
  orchard: { wall: '#4a6a5a', roof: '#2a4a3a', glow: '#c0ffd0', shape: 'grove' },
  echoes: { wall: '#5a6a80', roof: '#344050', glow: '#c0d0ff', shape: 'ruin', water: true },
  halo: { wall: '#e0d8c0', roof: '#f8f0d8', glow: '#ffe080', shape: 'temple' },
  ribs: { wall: '#c8bca8', roof: '#8a7e6a', glow: '#d090ff', shape: 'arches' },
  unborn: { wall: '#6a5a7a', roof: '#3a2e4a', glow: '#ff90d0', shape: 'arches' },
  wake: { wall: '#5a5068', roof: '#2e2838', glow: '#b0a0ff', shape: 'ruin' },
  cradle: { wall: '#7a5a30', roof: '#4a3418', glow: '#ff9030', shape: 'forge' },
  throne: { wall: '#d8c070', roof: '#f0d890', glow: '#fff0c0', shape: 'temple' },
};
const styleOf = (area) => STYLE[area] || STYLE.town;
// the ground of each act
const GROUND = { 1: '#3a4250', 2: '#4a4a4e', 3: '#3a3a40', 4: '#34484e', 5: '#3e3648', 6: '#5a5040' };

export async function buildMapScene(map, run) {
  const ctx = K.makeCtx(); const r = T.rng(9100 + (map.act || 1) * 17 + ((run && run.seed) || 0) % 1000);
  const act = map.act || 1; const nodes = map.nodes || []; const rows = Math.max(2, map.rows || 1 + Math.max(...nodes.map((n) => n.row || 0)));
  const LEN = (rows - 1) * ROW;
  const at = (n) => { const p = RIGHT.clone().multiplyScalar((n.y - 0.5) * LEN).add(DOWN.clone().multiplyScalar((n.x - 0.5) * WIDE)); return { x: p.x, z: p.z }; };
  const pos = new Map(nodes.map((n) => [n.id, at(n)])); const tops = new Map();
  // ------------------------------------------------ the ground: one long dark land under the road, a cliff at its edge
  const span = LEN / 2 + 15, side = WIDE / 2 + 8; const corners = [[-span, -side], [span, -side], [span, side], [-span, side]].map(([a, b]) => RIGHT.clone().multiplyScalar(a).add(DOWN.clone().multiplyScalar(b)));
  const xs = corners.map((c) => c.x), zs = corners.map((c) => c.z); const X0 = Math.min(...xs), X1 = Math.max(...xs), Z0 = Math.min(...zs), Z1 = Math.max(...zs);
  const ground = M.flags(GROUND[act] || GROUND[1]);
  const slab = K.add(ctx, K.box(span * 2, 2.2, side * 2), ground, 0, -1.1, 0, { ry: Math.PI / 4, cast: false });
  K.add(ctx, K.box(span * 2 + 0.6, 0.3, side * 2 + 0.6), M.ashlar('#2a303a'), 0, -2.3, 0, { ry: Math.PI / 4, cast: false });
  // the land breaks off into the mist below: rocks round the rim
  for (let i = 0; i < 40; i++) { const k = i / 40; const edge = Math.floor(k * 4); const t = (k * 4) % 1; const a = corners[edge], b = corners[(edge + 1) % 4]; const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; K.add(ctx, K.box(1 + r() * 1.6, 1.2 + r() * 2.4, 1 + r() * 1.6), M.ashlar('#262c36'), x, -1.6 - r() * 1.4, z, { ry: r() * 3 }); }
  // scattered ruin over the land: broken walls, dead trees, stones (kept off the roads and the stops)
  const near = (x, z, d) => [...pos.values()].some((p) => Math.hypot(p.x - x, p.z - z) < d) || nodes.some((n) => (n.next || []).some((m) => { const a = pos.get(n.id), b = pos.get(m); if (!b) return false; return segDist(x, z, a, b) < d * 0.6; }));
  for (let i = 0; i < 70; i++) {
    const u = (r() - 0.5) * span * 2, v = (r() - 0.5) * side * 2; const p = RIGHT.clone().multiplyScalar(u).add(DOWN.clone().multiplyScalar(v)); if (near(p.x, p.z, 3.2)) continue;
    const k = r();
    if (k < 0.35) { // a dead tree
      const h = 1.6 + r() * 1.8; K.add(ctx, K.cyl(0.08, 0.16, h, 5), M.flat(act === 2 ? 0x4a4440 : 0x2a2622), p.x, h / 2, p.z);
      for (let b = 0; b < 3; b++) K.add(ctx, K.box(0.06, 0.06, 0.7 + r() * 0.5), M.flat(0x2a2622), p.x, h * (0.55 + b * 0.15), p.z, { ry: r() * 6, rx: 0.6 });
    } else if (k < 0.65) { // a broken wall
      const w = 1.2 + r() * 2.4, h = 0.6 + r() * 1.8; K.add(ctx, K.box(w, h, 0.4), M.ashlar(styleOf((nodes.find((n) => n.area) || {}).area).wall), p.x, h / 2, p.z, { ry: r() * 3 });
    } else if (k < 0.85) { K.add(ctx, K.box(0.5 + r() * 0.6, 0.3 + r() * 0.5, 0.5 + r() * 0.6), M.ashlar('#3a4250'), p.x, 0.2, p.z, { ry: r() * 3 }); }
    else { K.add(ctx, K.cone(0.6 + r() * 0.5, 0.8 + r() * 0.8, 5), M.flat(act === 2 ? 0xd8dce4 : 0x2e3440), p.x, 0.5, p.z); }
  }
  // ------------------------------------------------ the roads: flagstones from stop to stop, a lamp at each road's middle
  const roads = []; const tileGeo = K.box(0.7, 0.06, 0.55); const dark = new THREE.Color(0.14, 0.13, 0.12);
  for (const n of nodes) for (const m of n.next || []) {
    const a = pos.get(n.id), b = pos.get(m); if (!b) continue; const L = Math.hypot(b.x - a.x, b.z - a.z); const ang = Math.atan2(b.x - a.x, b.z - a.z);
    const mat = new THREE.MeshBasicMaterial({ color: dark.clone(), fog: true }); const tiles = [];
    const n0 = Math.floor(L / 0.75); for (let i = 1; i < n0; i++) { const k = i / n0; if (k < 0.16 || k > 0.84) continue; const t = new THREE.Mesh(tileGeo, mat); t.position.set(a.x + (b.x - a.x) * k + (r() - 0.5) * 0.08, 0.03, a.z + (b.z - a.z) * k + (r() - 0.5) * 0.08); t.rotation.y = ang + (r() - 0.5) * 0.2; ctx.group.add(t); tiles.push(t); }
    // the lamp beside the road's middle
    const mx = (a.x + b.x) / 2 + Math.cos(ang) * 0.8, mz = (a.z + b.z) / 2 - Math.sin(ang) * 0.8; const iron = M.ironLit();
    K.add(ctx, K.box(0.3, 0.2, 0.3), M.ashlar('#2e3440'), mx, 0.1, mz); K.add(ctx, K.cyl(0.05, 0.07, 1.8, 6), iron, mx, 0.9, mz);
    const cage = new THREE.Mesh(K.box(0.24, 0.3, 0.24), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.08, 0.05) })); cage.position.set(mx, 1.95, mz); ctx.group.add(cage);
    K.add(ctx, K.cone(0.22, 0.2, 4), iron, mx, 2.2, mz, { ry: Math.PI / 4 });
    const key = 'road:' + n.id + '>' + m; ctx.lights.push({ key, x: mx, y: 2.1, z: mz, color: 0xffb45a, intensity: 5, dist: 7, halo: true, flicker: 0.05, on: false });
    roads.push({ key, from: n.id, to: m, mat, tiles, cage });
  }
  // ------------------------------------------------ the stops
  const rings = new Map(); const ringGeo = new THREE.RingGeometry(1.25, 1.55, 24); const fx = [];
  for (const n of nodes) {
    const p = pos.get(n.id); const top = landmark(ctx, n, p.x, p.z, r, fx, act); tops.set(n.id, top);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.25, 0.2), transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const ring = new THREE.Mesh(ringGeo, mat); ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.06, p.z); ring.scale.setScalar(n.kind === 'boss' ? 1.8 : 1); ctx.group.add(ring); rings.set(n.id, ring);
  }
  const group = await K.finishCtx(ctx);
  // the ambience: the act boss's own weather, a little darker, mist low over the land
  const bossNode = nodes.find((n) => n.kind === 'boss'); const BL = bossNode && LEVELS[bossNode.area]; const base = (BL && BL.ambience) || {};
  const ambience = { ...base, fog: base.fog ?? 0x10141c, fogNear: 74, fogFar: 150, beams: [], lightning: base.lightning ?? act === 1, rain: Math.min(1, base.rain ?? (act === 1 ? 1 : 0)), moon: Math.max(2.2, base.moon ?? 2.2), hemi: Math.max(0.9, base.hemi ?? 0.9), fill: Math.max(1.2, base.fill ?? 1.2), ambientI: Math.max(0.6, base.ambientI ?? 0.6) };
  const def = { id: 'map', name: 'The Road', bounds: [X0, Z0, X1, Z1], ambience, start: { x: 0, z: 0, face: Math.PI } };
  let lit = null; // atmos sources by key, found once the level is set
  const api = {
    group, def, solids: [], lights: ctx.lights, len: LEN, anims: [], marks: {}, lamps: [], chests: [], // what the game asks of any level
    nodePos: (id) => pos.get(id), top: (id) => tops.get(id) || 2,
    bind(atmos) { lit = new Map((atmos.sources || []).filter((s) => s.key).map((s) => [s.key, s])); },
    update(dt, S) {
      const t = S.t || 0;
      for (const R of roads) {
        const walked = S.walked.has(R.from + '>' + R.to); const open = S.at === R.from && S.next.has(R.to) || (!S.at && S.next.has(R.to) && false); const sel = open && S.sel === R.to;
        let c; if (walked) c = [0.9, 0.42, 0.16]; else if (open) { const k = 0.55 + 0.45 * Math.sin(t * 4 - R.tiles.length * 0.2); c = sel ? [1.6, 0.6, 0.25] : [0.75 * k + 0.3, 0.6 * k + 0.2, 0.25 * k + 0.1]; } else c = [0.14, 0.13, 0.12];
        R.mat.color.setRGB(c[0], c[1], c[2]);
        if (open) R.tiles.forEach((tl, i) => { const k = 0.5 + 0.5 * Math.sin(t * 6 - i * 0.7); tl.position.y = 0.03 + k * 0.02; });
        const on = walked || open; R.cage.material.color.setRGB(on ? 3 : 0.1, on ? 2.2 : 0.08, on ? 1.1 : 0.05);
        const s = lit && lit.get(R.key); if (s) s.on = on;
      }
      for (const [id, ring] of rings) {
        const m = ring.material; const isNext = S.next.has(id), isSel = S.sel === id, isAt = S.at === id, isVis = S.visited.has(id);
        if (isSel) { m.color.setRGB(3, 1.3, 0.5); m.opacity = 0.9; ring.scale.setScalar((id.includes('boss') ? 1.8 : 1) * (1.05 + 0.08 * Math.sin(t * 8))); }
        else if (isNext) { const k = 0.5 + 0.5 * Math.sin(t * 4); m.color.setRGB(2.6, 2.0, 0.9); m.opacity = 0.35 + 0.45 * k; ring.scale.setScalar(1 + 0.06 * k); }
        else if (isAt) { m.color.setRGB(2.4, 0.6, 0.4); m.opacity = 0.6; }
        else if (isVis) { m.color.setRGB(0.8, 0.3, 0.2); m.opacity = 0.3; }
        else m.opacity = 0;
      }
      for (const f of fx) f(dt, t);
    },
  };
  return api;
}

function segDist(x, z, a, b) { const dx = b.x - a.x, dz = b.z - a.z; const L2 = dx * dx + dz * dz || 1; const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)); return Math.hypot(x - (a.x + dx * k), z - (a.z + dz * k)); }

// one stop's landmark at (x, z); returns the height of its top (where its name floats)
function landmark(ctx, n, x, z, r, fx, act) {
  const add = (geo, mat, dx, y, dz, o) => K.add(ctx, geo, mat, x + dx, y, z + dz, o);
  const glow = (c, k = 2.4) => M.glow(c, k); const light = (dx, y, dz, color, intensity = 6, dist = 7, flicker = 0.08) => ctx.lights.push({ x: x + dx, y, z: z + dz, color: new THREE.Color(color).getHex(), intensity, dist, halo: true, flicker });
  const S = styleOf(n.area);
  if (n.kind === 'boss') return bossTower(ctx, n, x, z, S, add, glow, light, fx);
  if (n.kind === 'area' || (n.kind === 'trial' && false)) return district(n, S, add, glow, light, r, fx);
  if (n.kind === 'shrine') { // a brazier on a round step, its fire leaping
    add(K.cyl(1.0, 1.15, 0.25, 10), M.ashlar('#3a4250'), 0, 0.12, 0); add(K.cyl(0.35, 0.25, 0.7, 8), M.ironLit(), 0, 0.6, 0);
    const f = add(K.cone(0.32, 0.7, 6), glow('#ff9a30', 3), 0, 1.3, 0, { cast: false, dynamic: true }); const f2 = add(K.cone(0.18, 0.5, 6), glow('#fff0a0', 3.5), 0, 1.3, 0, { cast: false, dynamic: true });
    fx.push((dt, t) => { const k = 1 + 0.18 * Math.sin(t * 11 + x) + 0.1 * Math.sin(t * 23); f.scale.set(1, k, 1); f2.scale.set(1, 2 - k, 1); });
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; add(K.box(0.3, 0.5, 0.3), M.ashlar('#34404e'), Math.sin(a) * 1.0, 0.4, Math.cos(a) * 1.0); }
    light(0, 1.5, 0, '#ff9a40', 9, 8, 0.15); return 2.0;
  }
  if (n.kind === 'merchant') { // a covered cart with a lantern hanging off its pole
    add(K.box(1.4, 0.5, 0.9), M.wood('#4a3424'), 0, 0.55, 0); for (const sx of [-1, 1]) add(K.cyl(0.3, 0.3, 0.1, 8), M.wood('#2a1e14'), sx * 0.5, 0.3, 0.5, { rx: Math.PI / 2 });
    add(K.box(1.5, 0.08, 1.0), M.flat(0x6a2a1a), 0, 1.35, 0, { rz: 0.1 }); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(K.box(0.06, 0.8, 0.06), M.wood('#3a2a1a'), sx * 0.65, 0.95, sz * 0.4);
    add(K.box(0.06, 1.6, 0.06), M.ironLit(), 0.9, 0.8, -0.6); add(K.box(0.2, 0.26, 0.2), glow('#ffc060', 2.8), 0.9, 1.5, -0.6, { cast: false });
    for (let i = 0; i < 3; i++) add(K.box(0.3, 0.3, 0.3), M.wood('#5a4028'), -0.4 + i * 0.4, 0.95, 0.1, { ry: i });
    light(0.9, 1.6, -0.6, '#ffc060', 7, 7, 0.06); return 2.0;
  }
  if (n.kind === 'event') { // a standing stone, a mark glowing on it, mist curling round its foot
    add(K.box(0.7, 2.2, 0.45), M.ashlar('#4a505c'), 0, 1.1, 0, { rz: 0.06 }); add(K.box(0.5, 0.2, 0.36), M.ashlar('#3a404c'), 0.1, 2.25, 0, { rz: 0.2 });
    const q = add(K.box(0.12, 0.5, 0.05), glow('#a0d8ff', 2.6), 0, 1.3, 0.25, { cast: false, dynamic: true }); add(K.box(0.12, 0.12, 0.05), glow('#a0d8ff', 2.6), 0, 0.9, 0.25, { cast: false });
    fx.push((dt, t) => { q.material.color.setRGB(0.6 + 0.4 * Math.sin(t * 2.5 + x), 1.4, 2.2); });
    for (let i = 0; i < 5; i++) add(K.box(0.4, 0.15, 0.4), M.ashlar('#3a404c'), Math.sin(i * 1.3) * 1.1, 0.07, Math.cos(i * 1.3) * 1.1, { ry: i });
    light(0, 1.2, 0.5, '#80c0ff', 4, 6, 0.1); return 2.6;
  }
  if (n.kind === 'trial') { // a ring of pillars and torches, swords crossed in the middle
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(K.box(0.3, 1.4, 0.3), M.ashlar('#4a3e3a'), Math.sin(a) * 1.3, 0.7, Math.cos(a) * 1.3); if (i % 2 === 0) add(K.cone(0.1, 0.3, 5), glow('#ff6a30', 3), Math.sin(a) * 1.3, 1.6, Math.cos(a) * 1.3, { cast: false }); }
    for (const s of [-1, 1]) add(K.box(0.06, 1.3, 0.12), M.flat(0xc8ccd4), 0, 0.8, 0, { rz: s * 0.5 });
    light(0, 1.6, 0, '#ff6a30', 7, 7, 0.1); return 2.2;
  }
  if (n.kind === 'quest') { // a gold banner on a tall pole
    add(K.box(0.08, 2.8, 0.08), M.wood('#3a2a1a'), 0, 1.4, 0); const b = add(K.box(0.03, 0.9, 0.7), M.flat(0xd8a838), 0, 2.3, 0.38, { dynamic: true }); add(K.box(0.04, 0.2, 0.2), glow('#ffe080', 2.6), 0.03, 2.4, 0.4, { cast: false });
    fx.push((dt, t) => { b.rotation.y = Math.sin(t * 2 + x) * 0.25; }); light(0, 2.2, 0.3, '#ffd060', 5, 6, 0.05); return 3.0;
  }
  return 1.5;
}

// an area as a small cluster of its own kind of buildings
function district(n, S, add, glow, light, r, fx) {
  const wall = M.ashlar(S.wall), roof = M.slate(S.roof), win = glow(S.glow, 2.4); let top = 2.4;
  const house = (dx, dz, w, d, h, ry = 0) => {
    add(K.box(w, h, d), wall, dx, h / 2, dz, { ry });
    add(K.cone(Math.max(w, d) * 0.78, h * 0.55 + 0.4, 4), roof, dx, h + (h * 0.55 + 0.4) / 2, dz, { ry: ry + Math.PI / 4 });
    if (S.snow) add(K.cone(Math.max(w, d) * 0.5, 0.3, 4), M.flat(0xf0f4fa), dx, h + h * 0.55 + 0.3, dz, { ry: ry + Math.PI / 4 });
    for (let i = 0; i < 2; i++) add(K.box(0.18, 0.24, 0.05), win, dx + (i - 0.5) * w * 0.45, h * 0.55, dz + d / 2 + 0.03, { cast: false });
    top = Math.max(top, h + h * 0.55 + 0.6);
  };
  switch (S.shape) {
    case 'town': house(-0.7, 0.3, 1.1, 1.0, S.tall ? 2.2 : 1.5); house(0.6, -0.4, 1.0, 1.1, S.tall ? 2.8 : 1.9, 0.1); house(0.5, 0.9, 0.8, 0.8, 1.2, -0.1);
      if (S.gallows) { add(K.box(0.12, 2.2, 0.12), M.wood('#3a2a1a'), -1.5, 1.1, -0.8); add(K.box(0.9, 0.1, 0.1), M.wood('#3a2a1a'), -1.1, 2.15, -0.8); add(K.box(0.03, 0.5, 0.03), M.flat(0x8a7a5a), -0.75, 1.85, -0.8); }
      if (S.water) add(K.box(3.4, 0.05, 1.2), M.glow('#1a3a48', 1.2), 0, 0.03, 1.8, { cast: false }); break;
    case 'chapel': add(K.box(1.4, 2.0, 2.2), wall, 0, 1.0, 0); add(K.cone(1.3, 1.2, 4), roof, 0, 2.6, 0, { ry: Math.PI / 4 }); add(K.box(0.8, 3.6, 0.8), wall, 0, 1.8, -1.3); add(K.cone(0.62, 1.6, 4), roof, 0, 4.4, -1.3, { ry: Math.PI / 4 });
      add(K.box(0.4, 0.6, 0.05), win, 0, 1.2, 1.12, { cast: false }); add(K.box(0.3, 0.4, 0.05), win, 0, 2.8, -0.88, { cast: false }); top = 5.4;
      if (S.water) add(K.box(3.6, 0.05, 3.6), M.glow('#1a3a48', 1.2), 0, 0.03, 0, { cast: false }); break;
    case 'ruin': for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const h = 0.6 + r() * 1.8; add(K.box(0.5, h, 0.5), wall, Math.sin(a) * 1.0, h / 2, Math.cos(a) * 1.0, { rz: (r() - 0.5) * 0.2 }); }
      add(K.box(1.6, 0.3, 1.6), wall, 0, 0.15, 0); add(K.box(0.3, 0.3, 0.3), win, 0, 0.45, 0, { cast: false }); top = 2.6;
      if (S.water) add(K.box(3.6, 0.05, 3.6), M.glow('#1a3a48', 1.2), 0, 0.03, 0, { cast: false }); break;
    case 'forge': house(-0.5, 0.2, 1.6, 1.4, 1.5); add(K.box(0.5, 3.2, 0.5), M.brick('#4a3424'), 0.8, 1.6, -0.6); add(K.box(0.3, 0.3, 0.05), glow('#ff6a20', 3), -0.5, 0.5, 0.92, { cast: false });
      { const sm = add(K.box(0.4, 0.4, 0.4), M.flat(0x3a3430), 0.8, 3.6, -0.6, { dynamic: true, cast: false }); fx.push((dt, t) => { sm.position.y = 3.4 + ((t * 0.6) % 1.2); sm.scale.setScalar(1 + ((t * 0.6) % 1.2)); }); } top = 4.2; break;
    case 'tower': add(K.box(1.4, 4.2, 1.4), wall, 0, 2.1, 0); add(K.cone(1.1, 1.6, 4), roof, 0, 5.0, 0, { ry: Math.PI / 4 }); add(K.cyl(0.25, 0.45, 0.5, 8), M.flat(0x6a5a3a), 0, 3.6, 0.72); top = 6.2; break;
    case 'dome': for (const [dx, dz, s] of [[-0.6, 0.2, 1], [0.7, -0.3, 1.3], [0.4, 1.0, 0.8]]) { add(K.box(1.0 * s, 1.0 * s, 1.0 * s), wall, dx, 0.5 * s, dz); add(K.cyl(0.1, 0.55 * s, 0.6 * s, 8), roof, dx, 1.0 * s + 0.3 * s, dz); add(K.box(0.16, 0.24, 0.05), win, dx, 0.5 * s, dz + 0.52 * s, { cast: false }); }
      add(K.cone(0.9, 0.5, 6), M.flat(0xb8945a), -1.5, 0.25, -0.8); top = 2.8; break;
    case 'spikes': for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; const h = 1.2 + r() * 2.4; add(K.cone(0.3, h, 4), M.flat(0x1a0c0c), Math.sin(a) * 0.9, h / 2, Math.cos(a) * 0.9, { rx: Math.sin(a) * 0.2, rz: Math.cos(a) * 0.2 }); }
      add(K.box(1.2, 0.08, 1.2), glow(S.glow, 2.2), 0, 0.05, 0, { cast: false }); top = 3.8; break;
    case 'stilts': for (const [dx, dz] of [[-0.6, 0.2], [0.7, -0.3]]) { for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(K.box(0.08, 1.0, 0.08), M.wood('#3a2e20'), dx + sx * 0.4, 0.5, dz + sz * 0.4); add(K.box(1.0, 0.8, 1.0), M.wood('#4a3a28'), dx, 1.4, dz); add(K.cone(0.8, 0.7, 4), roof, dx, 2.15, dz, { ry: Math.PI / 4 }); add(K.box(0.16, 0.2, 0.05), win, dx, 1.4, dz + 0.52, { cast: false }); }
      add(K.box(3.6, 0.05, 3.6), M.glow('#123a2e', 1.2), 0, 0.03, 0, { cast: false }); top = 3.0; break;
    case 'clock': add(K.box(1.0, 3.6, 1.0), wall, 0, 1.8, 0); add(K.cone(0.8, 1.2, 4), roof, 0, 4.2, 0, { ry: Math.PI / 4 });
      { const g = add(new THREE.TorusGeometry(0.42, 0.06, 4, 12), M.flat(0xd8b048), 0, 2.9, 0.55, { dynamic: true }); fx.push((dt, t) => { g.rotation.z = t * 0.8; }); } add(K.box(0.3, 0.3, 0.05), win, 0, 2.9, 0.52, { cast: false }); top = 5.2; break;
    case 'temple': for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(K.cyl(0.14, 0.16, 2.2, 8), wall, Math.sin(a) * 1.1, 1.3, Math.cos(a) * 1.1); }
      add(K.cyl(1.4, 1.5, 0.25, 12), wall, 0, 0.12, 0); add(K.cyl(1.35, 1.35, 0.2, 12), roof, 0, 2.5, 0); add(K.box(0.5, 0.5, 0.5), glow(S.glow, 3), 0, 1.0, 0, { cast: false }); top = 3.2; break;
    case 'grove': for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const h = 1.2 + r(); add(K.cyl(0.07, 0.1, h, 5), M.wood('#3a2a1a'), Math.sin(a) * 1.0, h / 2, Math.cos(a) * 1.0); add(K.box(0.7, 0.6, 0.7), M.flat(0x3a6a4a), Math.sin(a) * 1.0, h + 0.2, Math.cos(a) * 1.0); add(K.box(0.12, 0.12, 0.12), glow(S.glow, 2.4), Math.sin(a) * 1.0 + 0.3, h, Math.cos(a) * 1.0, { cast: false }); }
      add(K.box(3.4, 0.05, 3.4), M.glow('#1a3a48', 1.2), 0, 0.03, 0, { cast: false }); top = 2.8; break;
    case 'arches': for (let i = 0; i < 4; i++) { const dz = -1.2 + i * 0.8; for (const s of [-1, 1]) add(K.box(0.18, 2.2 - i * 0.2, 0.18), wall, s * 0.8, 1.1 - i * 0.1, dz, { rz: -s * 0.25 }); add(K.box(1.7, 0.18, 0.18), wall, 0, 2.1 - i * 0.2, dz); }
      add(K.box(0.4, 0.4, 0.4), glow(S.glow, 2.6), 0, 0.5, 0, { cast: false }); top = 3.0; break;
    default: house(0, 0, 1.2, 1.2, 1.6);
  }
  light(0, 1.2, 0.9, S.glow, 6, 7, 0.06);
  return top;
}

// the act's boss: a tall dark tower, a bell at its top burning red, a red light that beats like a heart
function bossTower(ctx, n, x, z, S, add, glow, light, fx) {
  const wall = M.ashlar(n.area === 'throne' || n.area === 'halo' ? '#8a7e60' : '#2e323c'), dark = M.ashlar('#1e222a');
  add(K.box(3.2, 0.6, 3.2), dark, 0, 0.3, 0); add(K.box(2.4, 6.5, 2.4), wall, 0, 3.6, 0); add(K.box(2.7, 0.3, 2.7), dark, 0, 6.9, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { add(K.box(0.6, 8.2, 0.6), wall, sx * 1.3, 4.1, sz * 1.3); add(K.cone(0.45, 1.4, 4), M.slate('#1a1e28'), sx * 1.3, 8.9, sz * 1.3, { ry: Math.PI / 4 }); }
  // the open belfry and its bell
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(K.box(0.3, 1.8, 0.3), wall, sx * 0.95, 7.95, sz * 0.95);
  add(K.box(2.4, 0.3, 2.4), dark, 0, 9.0, 0); add(K.cone(1.7, 2.6, 4), M.slate('#14181f'), 0, 10.4, 0, { ry: Math.PI / 4 });
  const bell = add(K.cyl(0.32, 0.62, 0.9, 10), M.flat(0x6a3a1a, { emissive: 0x401008 }), 0, 7.9, 0, { dynamic: true });
  const heart = add(K.box(0.5, 0.06, 0.5), glow('#ff3020', 3), 0, 7.42, 0, { cast: false, dynamic: true });
  fx.push((dt, t) => { const k = Math.pow(Math.max(0, Math.sin(t * 2.2)), 6); bell.rotation.z = Math.sin(t * 1.1) * 0.12; heart.scale.setScalar(1 + k * 0.6); heart.material.color.setRGB(2 + k * 2, 0.35, 0.2); });
  for (let i = 0; i < 4; i++) add(K.box(0.3, 0.5, 0.05), glow('#ff4030', 2.2), 0, 2.5 + i * 1.2, 1.22, { cast: false });
  light(0, 7.6, 0, '#ff3a20', 14, 12, 0.12); light(0, 1.2, 1.8, S.glow, 6, 7, 0.08);
  return 11.5;
}
