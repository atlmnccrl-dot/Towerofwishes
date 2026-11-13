// The set kit: every building block of the city. Each builder adds meshes to ctx.group, collision
// shapes to ctx.solids, lights to ctx.lights and animated parts to ctx.anims. Repeated small parts
// (fence bars, spear tips, cobble kerbs) go through ctx.inst so they become one InstancedMesh each.
// World axes: X and Z on the ground, Y up, 1 unit = 1 metre. The camera looks from +X+Z.
import * as THREE from 'three';
import { M } from '../engine/materials.js';
import * as T from '../engine/textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const geoCache = new Map();
export function geo(key, fn) { if (!geoCache.has(key)) geoCache.set(key, fn()); return geoCache.get(key); }
export const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cyl = (rt, rb, h, n = 8) => geo(`c${rt},${rb},${h},${n}`, () => new THREE.CylinderGeometry(rt, rb, h, n));
export const cone = (r, h, n = 4) => geo(`k${r},${h},${n}`, () => new THREE.ConeGeometry(r, h, n));

export function makeCtx() {
  return { group: new THREE.Group(), solids: [], lights: [], anims: [], instances: new Map(), spawns: [], marks: {}, lowSolids: [] };
}

export function add(ctx, geom, mat, x, y, z, opts = {}) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  if (opts.s) m.scale.copy(opts.s);
  m.castShadow = opts.cast !== false; m.receiveShadow = true;
  m.userData.static = opts.dynamic ? false : true;
  (opts.parent || ctx.group).add(m);
  return m;
}

// Instanced repeats: collected, then flushed into InstancedMeshes by finishCtx.
export function inst(ctx, key, geom, mat, matrix) {
  let e = ctx.instances.get(key);
  if (!e) { e = { geom, mat, mats: [] }; ctx.instances.set(key, e); }
  e.mats.push(matrix.clone());
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
export function mat4(x, y, z, ry = 0, rx = 0, rz = 0, s = 1) { _e.set(rx, ry, rz); _q.setFromEuler(_e); _s.set(s, s, s); return _m4.compose(V(x, y, z), _q, _s); }

export function solid(ctx, x0, z0, x1, z1, h = 3) { ctx.solids.push({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h }); }
export function solidCircle(ctx, x, z, r, h = 1) { ctx.solids.push({ x, z, r, h }); }

// ---------------------------------------------------------------- ground
export function floor(ctx, x0, z0, x1, z1, mat = M.flags('#66707e'), y = 0, thick = 0.4) {
  const w = x1 - x0, d = z1 - z0;
  const m = add(ctx, box(w, thick, d), mat, x0 + w / 2, y - thick / 2, z0 + d / 2, { cast: false });
  return m;
}

// A raised kerb or plinth (stone), e.g. under fences.
export function plinth(ctx, x0, z0, x1, z1, h = 0.3, tone = '#4c5666') {
  const w = Math.abs(x1 - x0) || 0.5, d = Math.abs(z1 - z0) || 0.5;
  add(ctx, box(w, h, d), M.ashlar(tone), (x0 + x1) / 2, h / 2, (z0 + z1) / 2);
}

export function steps(ctx, x, z, w, n, dir = 'z-', rise = 0.2, run = 0.4, tone = '#56606e') {
  // dir: the direction the stairs climb toward
  for (let i = 0; i < n; i++) {
    const h = rise * (i + 1);
    if (dir === 'z-') add(ctx, box(w, h, run), M.ashlar(tone), x, h / 2, z - i * run);
    else if (dir === 'z+') add(ctx, box(w, h, run), M.ashlar(tone), x, h / 2, z + i * run);
    else if (dir === 'x-') add(ctx, box(run, h, w), M.ashlar(tone), x - i * run, h / 2, z);
    else add(ctx, box(run, h, w), M.ashlar(tone), x + i * run, h / 2, z);
  }
}

// ---------------------------------------------------------------- walls
// A straight wall from (x0,z0) to (x1,z1) along X or Z, with a stone base, a cap and buttresses.
export function wall(ctx, x0, z0, x1, z1, h = 4, opts = {}) {
  const t = opts.thick || 0.6; const tone = opts.tone || '#384356';
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const W = alongX ? len : t, D = alongX ? t : len;
  add(ctx, box(W, h, D), M.brick(tone), cx, h / 2, cz);
  add(ctx, box(W + 0.1, 0.5, D + 0.1), M.ashlar('#3c4656'), cx, 0.25, cz);
  if (opts.cap !== false) add(ctx, box(W + 0.16, 0.2, D + 0.16), M.ashlar('#4a5464'), cx, h + 0.1, cz);
  solid(ctx, cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2, h);
  // buttresses on the face toward the camera (+X or +Z side unless told otherwise)
  const face = opts.face ?? 1;
  if (opts.buttress) {
    const n = Math.max(1, Math.floor(len / opts.buttress));
    for (let i = 0; i <= n; i++) {
      const p = -len / 2 + (i * len) / n; if (opts.skipEnds && (i === 0 || i === n)) continue;
      const bh = h * 0.8;
      if (alongX) { add(ctx, box(0.5, bh, 0.5), M.ashlar('#3a4454'), cx + p, bh / 2, cz + face * (t / 2 + 0.25)); add(ctx, box(0.5, 0.4, 0.3), M.ashlar('#4a5464'), cx + p, bh + 0.1, cz + face * (t / 2 + 0.1), { rx: face * 0.5 }); solid(ctx, cx + p - 0.25, cz + face * t / 2, cx + p + 0.25, cz + face * (t / 2 + 0.5), bh); }
      else { add(ctx, box(0.5, bh, 0.5), M.ashlar('#3a4454'), cx + face * (t / 2 + 0.25), bh / 2, cz + p); add(ctx, box(0.3, 0.4, 0.5), M.ashlar('#4a5464'), cx + face * (t / 2 + 0.1), bh + 0.1, cz + p, { rz: -face * 0.5 }); solid(ctx, cx + face * t / 2, cz + p - 0.25, cx + face * (t / 2 + 0.5), cz + p + 0.25, bh); }
    }
  }
  // arched recesses / windows along the face
  if (opts.arches) {
    const n = opts.arches; const step = len / (n + 1);
    for (let i = 1; i <= n; i++) {
      const p = -len / 2 + i * step; const lit = opts.litArches && opts.litArches.includes(i - 1);
      const tex = T.lancet(lit, 10, 24); const w = 10 / 16, hh = 24 / 16;
      const pm = M.decal(tex, lit ? 1.6 : 0);
      if (alongX) add(ctx, plane(w, hh), pm, cx + p, h * 0.42 + hh / 2, cz + face * (t / 2 + 0.01), { cast: false, ry: face > 0 ? 0 : Math.PI });
      else add(ctx, plane(w, hh), pm, cx + face * (t / 2 + 0.01), h * 0.42 + hh / 2, cz + p, { cast: false, ry: face > 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
  }
}
export const plane = (w, h) => geo(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));

// ---------------------------------------------------------------- buildings
// A town house: body, steep slate roof with overhang (ridge along the longer side), windows, door, chimney.
export function house(ctx, x, z, w, d, h, opts = {}) {
  const tone = opts.tone || '#384356'; const body = opts.plaster ? M.plaster(opts.plaster) : M.brick(tone);
  add(ctx, box(w, h, d), body, x, h / 2, z);
  add(ctx, box(w + 0.1, 0.6, d + 0.1), M.ashlar('#384252'), x, 0.3, z);
  solid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, h);
  const ridgeX = opts.ridge ? opts.ridge === 'x' : w >= d;
  const rh = opts.roofH || Math.min(w, d) * 0.75;
  roof(ctx, x, h, z, w + 0.5, d + 0.5, rh, ridgeX, opts.roofTone || '#222b38');
  // gable infill
  gableInfill(ctx, x, h, z, w, d, rh * (Math.min(w, d)) / (Math.min(w, d) + 0.5), ridgeX, body);
  // windows on the two camera-facing faces (+X and +Z)
  const lit = opts.lit ?? 0.3; const r = T.rng(Math.round(x * 13 + z * 7));
  const floors = Math.max(1, Math.floor((h - 0.8) / 2.2));
  for (let f = 0; f < floors; f++) {
    const y = 1.4 + f * 2.2 + 0.4;
    for (const side of ['x', 'z']) {
      const len = side === 'x' ? d : w; const n = Math.max(1, Math.floor(len / 2));
      for (let i = 0; i < n; i++) {
        const p = -len / 2 + (i + 0.5) * (len / n);
        if (f === 0 && i === Math.floor(n / 2) && side === (opts.doorSide || 'z')) continue;
        const isLit = r() < lit; const tex = T.houseWindow(isLit); const m = M.decal(tex, isLit ? 1.8 : 0);
        if (side === 'x') add(ctx, plane(0.5, 0.62), m, x + w / 2 + 0.01, y, z + p, { ry: Math.PI / 2, cast: false });
        else add(ctx, plane(0.5, 0.62), m, x + p, y, z + d / 2 + 0.01, { cast: false });
        if (isLit && opts.windowLights !== false && f === 0 && r() < 0.5) ctx.lights.push({ x: side === 'x' ? x + w / 2 + 0.6 : x + p, y: y, z: side === 'x' ? z + p : z + d / 2 + 0.6, color: 0xffa040, intensity: 1.2, dist: 3.5 });
      }
    }
  }
  // door
  const ds = opts.doorSide || 'z';
  if (ds === 'z') add(ctx, plane(1, 2), M.decal(T.door()), x, 1.0, z + d / 2 + 0.02, { cast: false });
  else add(ctx, plane(1, 2), M.decal(T.door()), x + w / 2 + 0.02, 1.0, z, { ry: Math.PI / 2, cast: false });
  if (opts.chimney !== false) add(ctx, box(0.6, 1.6, 0.6), M.brick('#252d3a'), x - w * 0.25, h + rh * 0.6, z - d * 0.2);
}

// Gabled roof: two sloped slabs; ridge along X (ridgeX) or Z.
export function roof(ctx, x, y, z, w, d, rh, ridgeX, tone = '#222b38') {
  const span = ridgeX ? d : w, len = ridgeX ? w : d;
  const half = span / 2; const slope = Math.hypot(half, rh); const ang = Math.atan2(rh, half);
  const mat = M.slate(tone);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(box(ridgeX ? len : slope, 0.14, ridgeX ? slope : len), mat);
    if (ridgeX) { m.position.set(x, y + rh / 2, z + s * half / 2); m.rotation.x = s * ang; }
    else { m.position.set(x + s * half / 2, y + rh / 2, z); m.rotation.z = -s * ang; }
    m.castShadow = true; m.receiveShadow = true; m.userData.static = true; ctx.group.add(m);
  }
  // ridge cap
  add(ctx, box(ridgeX ? len : 0.22, 0.16, ridgeX ? 0.22 : len), M.ashlar('#2a3240'), x, y + rh + 0.02, z);
}

// Triangle walls filling the two gable ends.
function gableInfill(ctx, x, y, z, w, d, rh, ridgeX, mat) {
  const span = ridgeX ? d : w; const shape = new THREE.Shape();
  shape.moveTo(-span / 2, 0); shape.lineTo(span / 2, 0); shape.lineTo(0, rh); shape.lineTo(-span / 2, 0);
  const g = geo(`gable${span},${rh}`, () => new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }));
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; m.userData.static = true;
    if (ridgeX) { m.position.set(x + s * (w / 2) - (s > 0 ? 0.3 : 0), y, z); m.rotation.y = Math.PI / 2; }
    else { m.position.set(x, y, z + s * (d / 2) - (s > 0 ? 0.3 : 0)); }
    ctx.group.add(m);
  }
}

// A gothic chapel: tall nave, steep roof, gable front with a rose window, buttresses, lancets, a bell-cote.
// front: the direction the gable faces: '+z' (screen lower-left) or '+x' (screen lower-right).
export function chapel(ctx, x, z, w, d, h, opts = {}) {
  const front = opts.front || '+z'; const tone = opts.tone || '#353f52';
  const ridgeX = front === '+x'; // ridge runs toward the front
  const mat = M.ashlar('#3a4454'); const wallMat = M.brick(tone);
  add(ctx, box(w, h, d), wallMat, x, h / 2, z);
  add(ctx, box(w + 0.2, 0.8, d + 0.2), M.ashlar('#384252'), x, 0.4, z);
  solid(ctx, x - w / 2 - 0.1, z - d / 2 - 0.1, x + w / 2 + 0.1, z + d / 2 + 0.1, h);
  const span = ridgeX ? d : w; const rh = opts.roofH || span * 1.0;
  roof(ctx, x, h, z, w + 0.6, d + 0.6, rh, ridgeX, opts.roofTone || '#1e2633');
  gableInfill(ctx, x, h, z, w, d, rh * span / (span + 0.6), ridgeX, wallMat);
  // stone coping along the gable edges of the front
  const fz = z + d / 2, fx = x + w / 2;
  const half = span / 2 + 0.3, slope = Math.hypot(half, rh), ang = Math.atan2(rh, half);
  for (const s of [-1, 1]) {
    if (front === '+z') add(ctx, box(slope, 0.25, 0.5), M.ashlar('#56606e'), x + s * half / 2, h + rh / 2, fz + 0.05, { rz: -s * ang });
    else add(ctx, box(0.5, 0.25, slope), M.ashlar('#56606e'), fx + 0.05, h + rh / 2, z + s * half / 2, { rx: s * ang });
  }
  // rose window on the gable front
  const rose = M.decal(T.roseWindow(!!opts.litRose), opts.litRose ? 0.55 : 0); const rs = 3;
  if (front === '+z') add(ctx, plane(rs, rs), rose, x, h + 0.2, fz + 0.32, { cast: false });
  else add(ctx, plane(rs, rs), rose, fx + 0.32, h + 0.2, z, { ry: Math.PI / 2, cast: false });
  // a tall portal below the rose
  if (front === '+z') { add(ctx, plane(1.6, 3), M.decal(T.door('#2c1f18')), x, 1.5, fz + 0.03, { cast: false }); add(ctx, box(2.2, 0.3, 0.4), mat, x, 3.15, fz + 0.15); }
  else { add(ctx, plane(1.6, 3), M.decal(T.door('#2c1f18')), fx + 0.03, 1.5, z, { ry: Math.PI / 2, cast: false }); add(ctx, box(0.4, 0.3, 2.2), mat, fx + 0.15, 3.15, z); }
  // buttresses and lancet windows along the long side facing the camera
  const sideLen = ridgeX ? w : d; const n = Math.max(2, Math.round(sideLen / 3));
  for (let i = 0; i <= n; i++) {
    const p = -sideLen / 2 + (i * sideLen) / n;
    if (front === '+z') { // long side faces +x
      add(ctx, box(0.7, h * 0.85, 0.6), mat, x + w / 2 + 0.35, h * 0.425, z + p);
      add(ctx, box(0.5, 0.6, 0.6), M.ashlar('#4a5464'), x + w / 2 + 0.25, h * 0.85 + 0.2, z + p, { rz: 0.6 });
      if (i < n) add(ctx, plane(0.75, 2.6), M.decal(T.lancet(!!opts.litRose, 12, 42), opts.litRose ? 0.7 : 0), x + w / 2 + 0.02, h * 0.5, z + p + sideLen / n / 2, { ry: Math.PI / 2, cast: false });
    } else {
      add(ctx, box(0.6, h * 0.85, 0.7), mat, x + p, h * 0.425, z + d / 2 + 0.35);
      add(ctx, box(0.6, 0.6, 0.5), M.ashlar('#4a5464'), x + p, h * 0.85 + 0.2, z + d / 2 + 0.25, { rx: -0.6 });
      if (i < n) add(ctx, plane(0.75, 2.6), M.decal(T.lancet(!!opts.litRose, 12, 42), opts.litRose ? 0.7 : 0), x + p + sideLen / n / 2, h * 0.5, z + d / 2 + 0.02, { cast: false });
    }
  }
  // corner pinnacles on the front
  for (const s of [-1, 1]) {
    const px = front === '+z' ? x + s * (w / 2 + 0.1) : fx + 0.1, pz = front === '+z' ? fz + 0.1 : z + s * (d / 2 + 0.1);
    add(ctx, box(0.8, h + 0.8, 0.8), mat, px, (h + 0.8) / 2, pz);
    add(ctx, cone(0.55, 1.6, 4), M.slate('#1e2633'), px, h + 1.6, pz, { ry: Math.PI / 4 });
  }
  if (opts.belfry) { // bell-cote at the back of the ridge
    const bx = front === '+z' ? x : x - w / 2 + 1, bz = front === '+z' ? z - d / 2 + 1 : z;
    add(ctx, box(1.4, 2.2, 1.4), mat, bx, h + rh + 0.6, bz);
    add(ctx, cone(1.1, 3, 4), M.slate('#1e2633'), bx, h + rh + 3.2, bz, { ry: Math.PI / 4 });
  }
}

// ---------------------------------------------------------------- ironwork
// Wrought-iron fence on a stone kerb: bars with spear tips, two rails, posts with finials every ~2 m.
export function fence(ctx, x0, z0, x1, z1, opts = {}) {
  const h = opts.h || 2.0; const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const len = Math.hypot(x1 - x0, z1 - z0); const dx = (x1 - x0) / len, dz = (z1 - z0) / len;
  const kerb = opts.kerb ?? 0.35; const iron = M.ironLit();
  if (kerb > 0) plinth(ctx, x0 - (alongX ? 0 : 0.25), z0 - (alongX ? 0.25 : 0), x1 + (alongX ? 0 : 0.25), z1 + (alongX ? 0.25 : 0), kerb);
  const nb = Math.round(len / 0.25);
  for (let i = 0; i <= nb; i++) {
    const t = i / nb; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    const post = i % 8 === 0;
    if (post) {
      inst(ctx, 'fpost', box(0.14, h + 0.3, 0.14), iron, mat4(x, kerb + (h + 0.3) / 2, z));
      inst(ctx, 'ffinial', cone(0.1, 0.35, 4), iron, mat4(x, kerb + h + 0.45, z, Math.PI / 4));
    } else {
      inst(ctx, 'fbar', box(0.05, h, 0.05), iron, mat4(x, kerb + h / 2, z));
      inst(ctx, 'ftip', cone(0.06, 0.2, 4), iron, mat4(x, kerb + h + 0.1, z, Math.PI / 4));
    }
  }
  for (const ry of [0.25, h - 0.3]) {
    const m = add(ctx, box(alongX ? len : 0.05, 0.05, alongX ? 0.05 : len), iron, (x0 + x1) / 2, kerb + ry, (z0 + z1) / 2);
  }
  // scroll band under the top rail: small rings between bars
  for (let i = 0; i < nb; i += 2) {
    const t = (i + 0.5) / nb; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    inst(ctx, 'fring', torus(0.1, 0.02), iron, mat4(x, kerb + h - 0.48, z, alongX ? 0 : Math.PI / 2));
  }
  const pad = 0.18;
  if (alongX) solid(ctx, Math.min(x0, x1), z0 - pad, Math.max(x0, x1), z0 + pad, h); else solid(ctx, x0 - pad, Math.min(z0, z1), x0 + pad, Math.max(z0, z1), h);
  ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); // see-through: does not block sight lines
}
export const torus = (r, t) => geo(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, 4, 10));

// An ornate double gate with an arched crest. Returns a handle with open(t) for the arena locks.
// axis: 'x' if the gate sits in a fence running along X.
export function gate(ctx, x, z, width = 3.2, axis = 'x', opts = {}) {
  const h = opts.h || 2.6; const iron = M.ironLit();
  const piers = opts.piers !== false;
  const alongX = axis === 'x';
  const along = (p) => alongX ? [x + p, z] : [x, z + p];
  if (piers) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35));
    add(ctx, box(0.7, h + 0.9, 0.7), M.ashlar('#3e4858'), px, (h + 0.9) / 2, pz);
    add(ctx, box(0.85, 0.2, 0.85), M.ashlar('#56606e'), px, h + 1.0, pz);
    add(ctx, cyl(0.18, 0.24, 0.4, 6), M.ashlar('#56606e'), px, h + 1.3, pz);
    solid(ctx, px - 0.35, pz - 0.35, px + 0.35, pz + 0.35, h + 1);
  }
  const leaves = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); const [hx, hz] = along(s * width / 2);
    pivot.position.set(hx, 0, hz); ctx.group.add(pivot);
    const lw = width / 2; const nb = Math.round(lw / 0.22);
    for (let i = 0; i <= nb; i++) {
      const p = -s * (i / nb) * lw; const bh = h - 0.2 + Math.sin((i / nb) * Math.PI * 0.5) * 0.25 * (opts.crest !== false ? 1 : 0);
      const bar = new THREE.Mesh(box(0.05, bh, 0.05), iron); bar.position.set(alongX ? p : 0, bh / 2 + 0.05, alongX ? 0 : p); bar.castShadow = true; pivot.add(bar);
      const tip = new THREE.Mesh(cone(0.06, 0.2, 4), iron); tip.position.set(alongX ? p : 0, bh + 0.15, alongX ? 0 : p); tip.rotation.y = Math.PI / 4; pivot.add(tip);
    }
    for (const ry of [0.3, h * 0.55, h - 0.35]) {
      const rail = new THREE.Mesh(box(alongX ? lw : 0.05, 0.06, alongX ? 0.05 : lw), iron); rail.position.set(alongX ? -s * lw / 2 : 0, ry, alongX ? 0 : -s * lw / 2); pivot.add(rail);
    }
    // a big scroll on each leaf
    const ring = new THREE.Mesh(torus(0.32, 0.03), iron); ring.position.set(alongX ? -s * lw / 2 : 0, h * 0.77, alongX ? 0 : -s * lw / 2); if (!alongX) ring.rotation.y = Math.PI / 2; pivot.add(ring);
    pivot.userData.side = s; leaves.push(pivot);
  }
  // arched crest over the gate
  if (opts.crest !== false) {
    const arch = new THREE.Mesh(geo(`arch${width}`, () => new THREE.TorusGeometry(width / 2, 0.05, 4, 16, Math.PI)), iron);
    arch.position.set(x, h + 0.15, z); arch.scale.set(1, 0.45, 1); if (!alongX) arch.rotation.y = Math.PI / 2; arch.castShadow = true; ctx.group.add(arch);
    for (let i = -2; i <= 2; i++) {
      const sc = new THREE.Mesh(torus(0.16, 0.025), iron); const [sx, sz] = along(i * width * 0.17);
      sc.position.set(sx, h + 0.25 + (1 - Math.abs(i) / 2.5) * width * 0.16, sz); if (!alongX) sc.rotation.y = Math.PI / 2; ctx.group.add(sc);
    }
    const top = new THREE.Mesh(cone(0.1, 0.4, 4), iron); top.position.set(x, h + 0.25 + width * 0.24 + 0.25, z); ctx.group.add(top);
  }
  const sh = { x0: alongX ? x - width / 2 : x - 0.2, z0: alongX ? z - 0.2 : z - width / 2, x1: alongX ? x + width / 2 : x + 0.2, z1: alongX ? z + 0.2 : z + width / 2, h, gate: true, open: false };
  ctx.solids.push(sh); ctx.lowSolids.push(sh);
  const handle = {
    t: opts.open ? 1 : 0, target: opts.open ? 1 : 0, solid: sh, x, z,
    set(open) { this.target = open ? 1 : 0; sh.open = !!open; },
    update(dt) {
      if (this.t === this.target) return false;
      this.t += Math.sign(this.target - this.t) * Math.min(Math.abs(this.target - this.t), dt * 1.2);
      const a = (1 - Math.cos(this.t * Math.PI)) / 2 * (opts.swing || 1.6);
      for (const l of leaves) l.rotation.y = l.userData.side * a * (alongX ? -1 : 1) * (opts.swingDir || 1);
      return true;
    },
  };
  sh.open = !!opts.open; handle.update(0); if (opts.open) { handle.t = 1; for (const l of leaves) l.rotation.y = l.userData.side * (opts.swing || 1.6) * (alongX ? -1 : 1) * (opts.swingDir || 1); }
  ctx.anims.push(handle);
  return handle;
}

// ---------------------------------------------------------------- lights and props
export function lamp(ctx, x, z, opts = {}) {
  const h = opts.h || 3.0; const iron = M.ironLit();
  add(ctx, box(0.36, 0.3, 0.36), M.ashlar('#3a4454'), x, 0.15, z);
  add(ctx, cyl(0.06, 0.08, h, 6), iron, x, h / 2, z);
  add(ctx, cyl(0.12, 0.08, 0.12, 4), iron, x, h + 0.02, z, { ry: Math.PI / 4 });
  // lantern cage
  add(ctx, box(0.3, 0.42, 0.3), M.glow(opts.color || '#ffc46a', 2.6), x, h + 0.3, z, { cast: false });
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(ctx, box(0.04, 0.46, 0.04), iron, x + ox * 0.16, h + 0.3, z + oz * 0.16);
  add(ctx, cone(0.28, 0.24, 4), iron, x, h + 0.62, z, { ry: Math.PI / 4 });
  add(ctx, cone(0.05, 0.16, 4), iron, x, h + 0.82, z);
  solidCircle(ctx, x, z, 0.25, h);
  ctx.lights.push({ x, y: h + 0.2, z, color: opts.color ? new THREE.Color(opts.color).getHex() : 0xffb45a, intensity: opts.intensity || 7, dist: opts.dist || 9, halo: true, flicker: 0.04 });
}

// A torch in an iron bracket on a wall. face: direction the wall faces ('+x','+z').
export function torch(ctx, x, y, z, face = '+x') {
  const iron = M.ironLit(); const fx = face === '+x' ? 1 : 0, fz = face === '+z' ? 1 : 0;
  add(ctx, box(0.1 + fx * 0.3, 0.08, 0.1 + fz * 0.3), iron, x + fx * 0.15, y, z + fz * 0.15);
  add(ctx, cyl(0.06, 0.04, 0.5, 5), M.wood('#4a3020'), x + fx * 0.32, y + 0.15, z + fz * 0.32, { rz: -fx * 0.3, rx: fz * 0.3 });
  const tex = T.flame().clone(); tex.needsUpdate = true; tex.repeat.set(1 / 4, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(2.2, 1.9, 1.6), fog: false }));
  sp.scale.set(0.5, 0.75, 1); sp.position.set(x + fx * 0.4, y + 0.7, z + fz * 0.4); ctx.group.add(sp);
  let t = Math.random() * 10;
  ctx.anims.push({ update(dt) { t += dt; tex.offset.x = (Math.floor(t * 10) % 4) / 4; return false; } });
  ctx.lights.push({ x: x + fx * 0.8, y: y + 0.7, z: z + fz * 0.8, color: 0xff8a30, intensity: 5, dist: 7, halo: true, flicker: 0.25 });
}

export function barrel(ctx, x, z, opts = {}) {
  const y = opts.y || 0; const s = opts.s || 1; const ry = opts.ry || 0;
  const body = new THREE.Mesh(cyl(0.36 * s, 0.36 * s, 0.95 * s, 10), M.wood(opts.tone || '#7a4e2c'));
  body.position.set(x, y + 0.475 * s, z); body.rotation.y = ry; body.castShadow = body.receiveShadow = true; body.userData.static = true; ctx.group.add(body);
  const bulge = new THREE.Mesh(cyl(0.4 * s, 0.4 * s, 0.4 * s, 10), M.wood(opts.tone || '#7a4e2c')); bulge.position.set(x, y + 0.475 * s, z); bulge.castShadow = true; bulge.userData.static = true; ctx.group.add(bulge);
  for (const hy of [0.12, 0.5, 0.83]) add(ctx, cyl(0.385 * s + (hy === 0.5 ? 0.03 : 0), 0.385 * s + (hy === 0.5 ? 0.03 : 0), 0.05, 10), M.flat(0x1a1c20), x, y + hy * s, z);
  add(ctx, cyl(0.33 * s, 0.33 * s, 0.02, 10), M.flat(0x5a3820), x, y + 0.96 * s, z, { cast: false });
  if (opts.solid !== false) solidCircle(ctx, x, z, 0.42 * s, y + 1);
}

export function barrelStack(ctx, x, z) {
  barrel(ctx, x, z); barrel(ctx, x + 0.8, z + 0.1); barrel(ctx, x + 0.35, z + 0.75); barrel(ctx, x + 1.15, z + 0.85); barrel(ctx, x - 0.4, z + 0.8);
}

export function crate(ctx, x, z, opts = {}) {
  const s = opts.s || 0.8; const y = opts.y || 0;
  add(ctx, box(s, s, s), M.wood('#5a3e26'), x, y + s / 2, z, { ry: opts.ry || 0 });
  if (opts.solid !== false) solid(ctx, x - s / 2, z - s / 2, x + s / 2, z + s / 2, y + s);
}

export function table(ctx, x, z, opts = {}) {
  const w = opts.w || 1.8, d = opts.d || 0.9; const along = opts.ry ? true : false;
  const W = along ? d : w, D = along ? w : d;
  add(ctx, box(W, 0.08, D), M.wood('#8a7258'), x, 0.78, z);
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(ctx, box(0.08, 0.74, 0.08), M.wood('#5a4632'), x + ox * (W / 2 - 0.1), 0.37, z + oz * (D / 2 - 0.1));
  // benches either side
  if (opts.benches !== false) for (const s of [-1, 1]) {
    const bx = along ? x + s * (W / 2 + 0.35) : x, bz = along ? z : z + s * (D / 2 + 0.35);
    add(ctx, box(along ? 0.3 : W * 0.9, 0.06, along ? D * 0.9 : 0.3), M.wood('#7a6248'), bx, 0.45, bz);
    for (const o of [-1, 1]) add(ctx, box(0.06, 0.42, 0.06), M.wood('#4a3a2a'), bx + (along ? 0 : o * W * 0.4), 0.21, bz + (along ? o * D * 0.4 : 0));
  }
  solid(ctx, x - W / 2, z - D / 2, x + W / 2, z + D / 2, 0.8);
  if (opts.mugs) for (let i = 0; i < 3; i++) add(ctx, cyl(0.05, 0.05, 0.1, 5), M.flat(0x4a3a2c), x + (i - 1) * 0.4 * (along ? 0.3 : 1), 0.87, z + (i - 1) * 0.3 * (along ? 1 : 0.3), { cast: false });
}

export function chair(ctx, x, z, ry = 0, fallen = false) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.group.add(g);
  const w = M.wood('#6a5440');
  const parts = [[box(0.45, 0.05, 0.45), 0, 0.45, 0], [box(0.45, 0.5, 0.05), 0, 0.72, -0.2]];
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push([box(0.05, 0.45, 0.05), ox * 0.19, 0.22, oz * 0.19]);
  for (const [gm, px, py, pz] of parts) { const m = new THREE.Mesh(gm, w); m.position.set(px, py, pz); m.castShadow = true; g.add(m); }
  if (fallen) { g.rotation.z = Math.PI / 2; g.position.y = 0.25; }
}

// A body on the ground (left from an earlier fight) and its dropped blade.
export function fallenBody(ctx, x, z, ry = 0, tone = 0x15171c) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.group.add(g);
  const cloth = M.flat(tone);
  const parts = [[box(0.5, 0.18, 0.8), 0, 0.1, 0, 0], [box(0.22, 0.18, 0.22), 0, 0.1, -0.55, 0], [box(0.16, 0.12, 0.7), 0.15, 0.07, 0.65, 0.1], [box(0.16, 0.12, 0.7), -0.16, 0.07, 0.62, -0.15], [box(0.14, 0.1, 0.55), 0.38, 0.06, -0.3, 0.8], [box(0.9, 0.04, 1.1), 0.05, 0.02, 0.1, 0.2]];
  for (const [gm, px, py, pz, r] of parts) { const m = new THREE.Mesh(gm, cloth); m.position.set(px, py, pz); m.rotation.y = r; m.castShadow = true; m.receiveShadow = true; g.add(m); }
}

export function droppedSword(ctx, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0.03, z); g.rotation.y = ry; ctx.group.add(g);
  const blade = new THREE.Mesh(box(0.06, 0.03, 1.0), M.flat(0xb8c4d0, { emissive: 0x303844 })); blade.position.z = 0.4; g.add(blade);
  const guard = new THREE.Mesh(box(0.3, 0.04, 0.05), M.flat(0x6a6050)); guard.position.z = -0.12; g.add(guard);
  const grip = new THREE.Mesh(box(0.05, 0.04, 0.22), M.flat(0x2a1e18)); grip.position.z = -0.25; g.add(grip);
}

// Glowing rune circle on the ground (a pickup or a shrine mark).
export function runeMark(ctx, x, z, color = '#5ae0e8') {
  const c = new THREE.Color(color);
  const ring = new THREE.Mesh(geo('rune', () => new THREE.RingGeometry(0.32, 0.42, 16)), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.5), transparent: true, opacity: 0.9, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.03, z); ctx.group.add(ring);
  ctx.lights.push({ x, y: 0.6, z, color: c.getHex(), intensity: 1.6, dist: 3 });
  let t = 0; ctx.anims.push({ update(dt) { t += dt; ring.material.opacity = 0.6 + Math.sin(t * 3) * 0.3; return false; } });
}

export function deadTree(ctx, x, z, s = 1) {
  const bark = M.flat(0x1c1a1a);
  const r = T.rng(Math.round(x * 31 + z * 17));
  add(ctx, cyl(0.12 * s, 0.22 * s, 3 * s, 6), bark, x, 1.5 * s, z);
  for (let i = 0; i < 5; i++) {
    const a = r() * Math.PI * 2, y = (1.6 + r() * 1.4) * s, l = (0.8 + r() * 1.0) * s;
    const m = add(ctx, cyl(0.03 * s, 0.07 * s, l, 4), bark, x + Math.cos(a) * l * 0.4, y + l * 0.3, z + Math.sin(a) * l * 0.4);
    m.rotation.z = Math.cos(a) * 0.9; m.rotation.x = -Math.sin(a) * 0.9;
  }
  solidCircle(ctx, x, z, 0.3 * s, 3);
}

export function well(ctx, x, z) {
  add(ctx, cyl(0.9, 1.0, 0.8, 10), M.ashlar('#4a5464'), x, 0.4, z);
  add(ctx, cyl(0.7, 0.7, 0.05, 10), M.flat(0x080a10), x, 0.79, z, { cast: false });
  for (const s of [-1, 1]) add(ctx, box(0.1, 1.6, 0.1), M.wood('#4a3424'), x + s * 0.85, 1.6, z);
  add(ctx, box(1.9, 0.1, 0.1), M.wood('#4a3424'), x, 2.35, z);
  roofSmall(ctx, x, 2.45, z, 2.2, 1.4);
  solidCircle(ctx, x, z, 1.0, 1);
}
function roofSmall(ctx, x, y, z, w, d) { roof(ctx, x, y, z, w, d, 0.6, true, '#2a2230'); }

export function statue(ctx, x, z, ry = 0) {
  add(ctx, box(1.2, 1.0, 1.2), M.ashlar('#4a5464'), x, 0.5, z);
  add(ctx, box(1.0, 0.2, 1.0), M.ashlar('#56606e'), x, 1.1, z);
  const st = M.flat(0x5a6470);
  add(ctx, box(0.5, 1.0, 0.35), st, x, 1.7, z, { ry }); add(ctx, box(0.28, 0.3, 0.28), st, x, 2.35, z, { ry });
  add(ctx, box(0.7, 0.9, 0.12), st, x, 1.75, z - 0.12, { ry }); // wings / robes
  solid(ctx, x - 0.6, z - 0.6, x + 0.6, z + 0.6, 2.5);
}

export function grave(ctx, x, z, ry = 0) {
  add(ctx, box(0.5, 0.7, 0.14), M.ashlar('#4a5464'), x, 0.35, z, { ry });
  add(ctx, box(0.6, 0.06, 1.0), M.dirt('#2a2c2c'), x + Math.sin(ry) * 0.55, 0.03, z + Math.cos(ry) * 0.55, { ry, cast: false });
}

export function bench(ctx, x, z, ry = 0) {
  const along = Math.abs(Math.sin(ry)) > 0.5;
  add(ctx, box(along ? 0.4 : 1.6, 0.08, along ? 1.6 : 0.4), M.wood('#5a4632'), x, 0.45, z);
  for (const s of [-1, 1]) add(ctx, box(along ? 0.36 : 0.08, 0.42, along ? 0.08 : 0.36), M.iron(), x + (along ? 0 : s * 0.7), 0.21, z + (along ? s * 0.7 : 0));
  solid(ctx, x - (along ? 0.2 : 0.8), z - (along ? 0.8 : 0.2), x + (along ? 0.2 : 0.8), z + (along ? 0.8 : 0.2), 0.5);
}

export function cart(ctx, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.group.add(g);
  const w = M.wood('#5e4430');
  const parts = [[box(1.2, 0.1, 2.0), 0, 0.7, 0], [box(0.06, 0.45, 2.0), -0.6, 0.95, 0], [box(0.06, 0.45, 2.0), 0.6, 0.95, 0], [box(1.2, 0.45, 0.06), 0, 0.95, -1], [box(0.08, 0.08, 1.6), -0.3, 0.6, 1.6], [box(0.08, 0.08, 1.6), 0.3, 0.6, 1.6]];
  for (const [gm, px, py, pz] of parts) { const m = new THREE.Mesh(gm, w); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  for (const s of [-1, 1]) { const wh = new THREE.Mesh(cyl(0.45, 0.45, 0.08, 10), M.wood('#3e2c20')); wh.rotation.z = Math.PI / 2; wh.position.set(s * 0.68, 0.45, 0.2); wh.castShadow = true; g.add(wh); }
  const c = Math.cos(ry), s = Math.sin(ry);
  solid(ctx, x - Math.abs(c * 0.7 + s * 1.1), z - Math.abs(s * 0.7 + c * 1.1), x + Math.abs(c * 0.7 + s * 1.1), z + Math.abs(s * 0.7 + c * 1.1), 1.2);
}

export function banner(ctx, x, y, z, face = '+x', color = 0x5a1418) {
  const cloth = new THREE.Mesh(plane(0.8, 2.0), new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }));
  cloth.position.set(x + (face === '+x' ? 0.05 : 0), y, z + (face === '+z' ? 0.05 : 0)); if (face === '+x') cloth.rotation.y = Math.PI / 2;
  ctx.group.add(cloth);
  add(ctx, box(face === '+x' ? 0.06 : 1.0, 0.06, face === '+x' ? 1.0 : 0.06), M.iron(), cloth.position.x, y + 1.02, cloth.position.z);
}

export function puddle(ctx, x, z, w = 1.6, d = 1.0) {
  const m = new THREE.Mesh(geo(`pud${w},${d}`, () => new THREE.CircleGeometry(0.5, 12)), new THREE.MeshPhongMaterial({ color: 0x141a24, specular: 0x8090a8, shininess: 80, transparent: true, opacity: 0.85 }));
  m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(x, 0.012, z); m.receiveShadow = true; ctx.group.add(m);
  ctx.puddles = ctx.puddles || []; ctx.puddles.push({ x, z, w, d });
}

// ---------------------------------------------------------------- finish
// Flushes instanced parts, merges static meshes per material (fewer draw calls) and returns the group.
export async function finishCtx(ctx) {
  for (const [key, e] of ctx.instances) {
    const im = new THREE.InstancedMesh(e.geom, e.mat, e.mats.length);
    e.mats.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere(); im.frustumCulled = false;
    ctx.group.add(im);
  }
  ctx.instances.clear();
  const { mergeGeometries } = await import('../../vendor/BufferGeometryUtils.js');
  ctx.group.updateMatrixWorld(true);
  const byMat = new Map(); const remove = [];
  ctx.group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.userData.static || o.parent !== ctx.group) return;
    const k = o.material.uuid + (o.castShadow ? 's' : 'n');
    if (!byMat.has(k)) byMat.set(k, { mat: o.material, cast: o.castShadow, geos: [] });
    const g = o.geometry.index ? o.geometry.clone() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.index) { const idx = []; for (let i = 0; i < g.attributes.position.count; i++) idx.push(i); g.setIndex(idx); }
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    byMat.get(k).geos.push(g); remove.push(o);
  });
  for (const o of remove) ctx.group.remove(o);
  for (const { mat, cast, geos } of byMat.values()) {
    const merged = mergeGeometries(geos, false); if (!merged) continue;
    const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; ctx.group.add(m);
    for (const g of geos) g.dispose();
  }
  return ctx.group;
}

// A warden's lamp: the checkpoint. Unlit it holds a dull ember; lit it burns gold and heals.
export function shrineLamp(ctx, x, z) {
  const iron = M.ironLit();
  add(ctx, box(0.9, 0.35, 0.9), M.ashlar('#4a5464'), x, 0.17, z);
  add(ctx, box(0.6, 0.3, 0.6), M.ashlar('#56606e'), x, 0.5, z);
  add(ctx, cyl(0.08, 0.1, 2.6, 6), iron, x, 1.9, z);
  for (const s of [-1, 1]) add(ctx, box(0.05, 0.05, 0.5), iron, x, 3.0, z + s * 0.15, { rx: s * 0.5 });
  const glass = new THREE.Mesh(box(0.42, 0.55, 0.42), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.12, 0.05), fog: false }));
  glass.position.set(x, 3.35, z); ctx.group.add(glass);
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(ctx, box(0.05, 0.6, 0.05), iron, x + ox * 0.22, 3.35, z + oz * 0.22);
  add(ctx, cone(0.38, 0.3, 4), iron, x, 3.8, z, { ry: Math.PI / 4 });
  add(ctx, box(0.08, 0.3, 0.08), iron, x, 4.05, z);
  solidCircle(ctx, x, z, 0.5, 3);
  const light = { x, y: 3.3, z, color: 0xffb24a, intensity: 9, dist: 11, halo: true, flicker: 0.05, on: false };
  ctx.lights.push(light);
  const handle = { x, z, light, glass, lit: false, set(on) { this.lit = on; light.on = on; glass.material.color.setRGB(on ? 3.2 : 0.35, on ? 2.0 : 0.12, on ? 0.7 : 0.05); } };
  return handle;
}

// A reliquary chest for hidden gifts.
export function chest(ctx, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; ctx.group.add(g);
  const body = new THREE.Mesh(box(1.0, 0.55, 0.6), M.wood('#5a3a22')); body.position.y = 0.28; body.castShadow = true; g.add(body);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.55, -0.3); g.add(lidPivot);
  const lid = new THREE.Mesh(box(1.04, 0.2, 0.64), M.wood('#6a4428')); lid.position.set(0, 0.1, 0.3); lid.castShadow = true; lidPivot.add(lid);
  for (const s of [-1, 1]) { const band = new THREE.Mesh(box(0.08, 0.6, 0.66), M.flat(0x8a7040)); band.position.set(s * 0.35, 0.3, 0); g.add(band); }
  const lock = new THREE.Mesh(box(0.12, 0.14, 0.04), M.glow('#e8c060', 1.5)); lock.position.set(0, 0.45, 0.32); g.add(lock);
  solid(ctx, x - 0.55, z - 0.4, x + 0.55, z + 0.4, 0.8);
  return { x, z, open: false, t: 0, lidPivot, lock, update(dt) { if (this.open && this.t < 1) { this.t = Math.min(1, this.t + dt * 2); lidPivot.rotation.x = -this.t * 1.9; lock.visible = false; } return false; } };
}

// The gallows: a timber platform on posts, steps, a crossbeam with ropes.
export function gallows(ctx, x, z) {
  const w = M.wood('#4a3626'), dark = M.wood('#3a2a1e');
  add(ctx, box(4, 0.2, 3), w, x, 1.6, z);
  for (const [ox, oz] of [[-1.85, -1.35], [1.85, -1.35], [-1.85, 1.35], [1.85, 1.35]]) add(ctx, box(0.22, 1.6, 0.22), dark, x + ox, 0.8, z + oz);
  for (let i = 0; i < 6; i++) add(ctx, box(1.2, 0.2 * (i + 1), 0.3), M.wood('#4a3626'), x + 2.6, 0.1 * (i + 1), z + 1.2 - i * 0.3);
  for (const ox of [-1.4, 1.4]) add(ctx, box(0.22, 3.2, 0.22), dark, x + ox, 3.2, z - 0.9);
  add(ctx, box(3.3, 0.24, 0.24), dark, x, 4.8, z - 0.9);
  for (const ox of [-0.7, 0.5]) { add(ctx, box(0.04, 1.2, 0.04), M.flat(0x6a5a44), x + ox, 4.1, z - 0.9); add(ctx, cyl(0.12, 0.12, 0.05, 6), M.flat(0x6a5a44), x + ox, 3.5, z - 0.9); }
  solid(ctx, x - 2, z - 1.5, x + 2, z + 1.5, 1.8); solid(ctx, x + 2, z - 0.6, x + 3.2, z + 1.4, 1.2);
}

// Still, dark water (canals, a flooded floor). Walkable if `floorBelow`; otherwise add solids yourself.
export function water(ctx, x0, z0, x1, z1, y = -0.15, tone = 0x0e161c) {
  const w = x1 - x0, d = z1 - z0;
  const m = new THREE.Mesh(plane(w, d), new THREE.MeshPhongMaterial({ color: tone, specular: 0x6a8098, shininess: 90, transparent: true, opacity: 0.88 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, y, z0 + d / 2); m.receiveShadow = true; ctx.group.add(m);
  ctx.puddles = ctx.puddles || []; ctx.puddles.push({ x: x0 + w / 2, z: z0 + d / 2, w, d, water: true });
  return m;
}
