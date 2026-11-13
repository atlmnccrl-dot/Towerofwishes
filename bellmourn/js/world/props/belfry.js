// Props for District IV, the Belfry: the set below the walkways (kit builds sunk into the dark, sheer
// faces, lean-to aisle roofs, the city far down and the storm mist over it), flying buttresses,
// pinnacles, gargoyles, railings broken over the drop, flights of steps, wind-torn pennants, hanging
// lanterns, rubble and the great bell in its timber frame.
import * as THREE from 'three';
import { add, box, cyl, cone, geo, inst, mat4, solid, solidCircle, plane, torus } from '../kit.js';
import { M, cutout } from '../../engine/materials.js';
import * as T from '../../engine/textures.js';
import { mergeGeometries } from '../../../vendor/BufferGeometryUtils.js';

const q16 = (v) => Math.round(v * 16) / 16;

// A part at a local offset of a prop turned by ry around (x, z); its own tilt (rx, rz) is applied first.
function part(ctx, g, mat, x, y, z, ry, lx, ly, lz, rx = 0, rz = 0, o = {}) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const m = add(ctx, g, mat, x + lx * c + lz * s, y + ly, z - lx * s + lz * c, o);
  m.rotation.set(rx, ry, rz, 'YXZ'); return m;
}

// ---------------------------------------------------------------- below the walkways
// Runs kit builders, then lowers everything they made by dy: set dressing under the walks (no solids, no lights).
export function sunk(ctx, dy, fn, opts = {}) {
  const n0 = ctx.group.children.length, s0 = ctx.solids.length, w0 = ctx.lowSolids.length, l0 = ctx.lights.length;
  fn();
  const kids = ctx.group.children;
  for (let i = n0; i < kids.length; i++) { kids[i].position.y += dy; if (opts.noShadow) kids[i].castShadow = false; }
  ctx.solids.length = s0; ctx.lowSolids.length = w0; ctx.lights.length = l0;
}

// A sheet of storm mist below the walkways: everything under it sinks into the dark.
export function mist(ctx, x0, z0, x1, z1, y, opacity, color = 0x121a24, order = -10) {
  const m = new THREE.Mesh(plane(x1 - x0, z1 - z0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.renderOrder = order; ctx.group.add(m);
  return m;
}

// Torn cloud racing east under the walkways on the wind (dithered pixel wisps).
const cloudTex = new Map();
function cloudImg(seed, density = 0.8) {
  const key = seed + ':' + density; if (cloudTex.has(key)) return cloudTex.get(key);
  const S = 128; const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const r = T.rng(seed); const blobs = [];
  for (let i = 0; i < 22; i++) blobs.push([r() * S, r() * S, 6 + r() * 16, 0.35 + r() * 0.65, 1.8 + r() * 1.6]);
  const img = g.createImageData(S, S); const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0;
    for (const [bx, by, br, bs, st] of blobs) { let dx = Math.abs(x - bx); dx = Math.min(dx, S - dx) / st; let dy = Math.abs(y - by); dy = Math.min(dy, S - dy); v += bs * Math.exp(-(dx * dx + dy * dy) / (br * br)); }
    const k = (y * S + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
    img.data[k + 3] = v * density > (B[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? 255 : 0;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cloudTex.set(key, t); return t;
}
export function clouds(ctx, x0, z0, x1, z1, y, opts = {}) {
  const w = x1 - x0, d = z1 - z0; const tile = opts.tile || 16;
  const tex = cloudImg(opts.seed || 41, opts.density ?? 0.8).clone(); tex.needsUpdate = true; tex.repeat.set(w / tile, d / tile);
  const m = new THREE.Mesh(plane(w, d), new THREE.MeshBasicMaterial({ map: tex, color: opts.color ?? 0x2c3848, transparent: true, opacity: opts.opacity ?? 0.5, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, y, z0 + d / 2); m.renderOrder = opts.order ?? -9; ctx.group.add(m);
  const speed = (opts.speed ?? 2.2) / tile; let ox = 0, oy = 0;
  ctx.anims.push({ update(dt) { ox -= dt * speed; oy += dt * speed * 0.35; tex.offset.set(Math.round(ox * 128) / 128, Math.round(oy * 128) / 128); return false; } });
  return m;
}

// The sheer stone face under a walkway's edge, falling into the dark; lancets on the sides the camera sees.
export function drop(ctx, x0, z0, x1, z1, depth, opts = {}) {
  const tone = opts.tone || '#303a4c'; const w = x1 - x0, d = z1 - z0; const top = opts.top ?? -0.02;
  add(ctx, box(w, depth, d), M.brick(tone), x0 + w / 2, top - depth / 2, z0 + d / 2, { cast: false });
  // a string course a little below the walk
  add(ctx, box(w + 0.12, 0.25, d + 0.12), M.ashlar('#3c4656'), x0 + w / 2, top - 0.9, z0 + d / 2, { cast: false });
  const r = T.rng(Math.round(x0 * 13 + z0 * 7 + depth)); const lit = opts.lit ?? 0.2; const gap = opts.gap || 3.2;
  const faces = opts.faces || [];
  for (const f of faces) {
    const len = f === 'x' ? d : w; const n = Math.max(1, Math.floor(len / gap));
    for (let row = 0; row < (opts.rows || 2); row++) for (let i = 0; i < n; i++) {
      const p = -len / 2 + (i + 0.5) * (len / n); const isLit = r() < lit; const y = top - 3.2 - row * 5;
      const mat = M.decal(T.lancet(isLit, 12, 42), isLit ? 0.45 : 0);
      if (f === 'x') add(ctx, plane(0.75, 2.6), mat, x1 + 0.01, y, z0 + d / 2 + p, { ry: Math.PI / 2, cast: false });
      else add(ctx, plane(0.75, 2.6), mat, x0 + w / 2 + p, y, z1 + 0.01, { cast: false });
    }
  }
  // buttress strips down the face
  if (opts.strips) for (const f of faces) {
    const len = f === 'x' ? d : w; const n = Math.max(1, Math.round(len / opts.strips));
    for (let i = 0; i <= n; i++) {
      const p = -len / 2 + (i * len) / n;
      if (f === 'x') add(ctx, box(0.5, depth, 0.6), M.ashlar('#343e50'), x1 + 0.25, top - 0.4 - depth / 2, z0 + d / 2 + p, { cast: false });
      else add(ctx, box(0.6, depth, 0.5), M.ashlar('#343e50'), x0 + w / 2 + p, top - 0.4 - depth / 2, z1 + 0.25, { cast: false });
    }
  }
}

// A lean-to roof below a walk: slate falling from yHigh at a0 to yLow at a1, running from b0 to b1.
// axis 'x': the slope runs along X (b is Z); 'z': along Z (b is X).
export function leanRoof(ctx, a0, a1, yHigh, yLow, b0, b1, axis = 'x', tone = '#1c2430') {
  const run = Math.abs(a1 - a0), fall = yHigh - yLow, len = Math.abs(b1 - b0); const slope = Math.hypot(run, fall); const ang = Math.atan2(fall, run) * Math.sign(a1 - a0);
  const mat = M.slate(tone);
  if (axis === 'x') add(ctx, box(slope, 0.16, len), mat, (a0 + a1) / 2, (yHigh + yLow) / 2, (b0 + b1) / 2, { rz: -ang, cast: false });
  else add(ctx, box(len, 0.16, slope), mat, (b0 + b1) / 2, (yHigh + yLow) / 2, (a0 + a1) / 2, { rx: ang, cast: false });
}

// The city far below: rows of houses sunk deep under the mist, a few windows still lit.
export function city(ctx, K, x0, z0, x1, z1, y, opts = {}) {
  const r = T.rng(opts.seed || 77); const skip = opts.skip || [];
  const cell = opts.cell || 7.5;
  sunk(ctx, y, () => {
    for (let z = z0; z < z1; z += cell) for (let x = x0; x < x1; x += cell) {
      const cx = x + cell / 2 + (r() - 0.5) * 1.2, cz = z + cell / 2 + (r() - 0.5) * 1.2;
      if (skip.some(([a, b, c, d]) => cx > a && cx < c && cz > b && cz < d)) continue;
      if (r() < 0.15) continue;
      const w = 3.5 + r() * 2.5, d = 3.5 + r() * 2.5, h = 4 + r() * 5;
      K.house(ctx, cx, cz, w, d, h, { lit: 0.45, windowLights: false, chimney: r() < 0.5, plaster: r() < 0.3 ? '#3a404c' : undefined, tone: '#2c3444', roofTone: '#1a212c' });
    }
  }, { noShadow: true });
}

// ---------------------------------------------------------------- the cathedral's stonework
// A pinnacle: square shaft, a cornice, a crocketed spire and a finial; y0 is its foot.
export function pinnacle(ctx, x, z, y0, h = 3, s = 0.8, tone = '#3a4454') {
  const st = M.ashlar(tone); const shaft = q16(h * 0.42); const sp = h - shaft;
  add(ctx, box(s, shaft, s), st, x, y0 + shaft / 2, z);
  add(ctx, box(s + 0.18, 0.16, s + 0.18), M.ashlar('#4a5464'), x, y0 + shaft, z);
  // gablets on the four faces of the shaft top
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; add(ctx, cone(s * 0.32, 0.5, 3), st, x + Math.sin(a) * s * 0.42, y0 + shaft + 0.3, z + Math.cos(a) * s * 0.42, { ry: a }); }
  add(ctx, cone(s * 0.6, sp, 4), st, x, y0 + shaft + sp / 2, z, { ry: Math.PI / 4 });
  const hw = s * 0.6 * Math.SQRT1_2;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4.2, k = hw * (1 - t) + 0.05, yy = y0 + shaft + t * sp;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) inst(ctx, 'crocket', box(0.12, 0.1, 0.12), st, mat4(x + sx * k, yy, z + sz * k, Math.PI / 4));
  }
  add(ctx, cone(0.09, 0.4, 4), M.ashlar('#56606e'), x, y0 + h + 0.15, z);
}

// A flying buttress: from the wall under a parapet at (wx, wz) out along +X or +Z to a pier rising out of
// the dark, crowned by a pinnacle. yTop is the height where the flyer meets the wall.
export function flyer(ctx, wx, wz, axis, len, opts = {}) {
  const yTop = opts.yTop ?? -0.3, fall = opts.fall ?? 2.2, depth = opts.depth ?? 26; const L = len - 0.6;
  const yWall = yTop - 1.3, ySpring = yTop - fall - 2.8, H = yWall - ySpring;
  const g = geo(`flyer${len},${yTop},${fall}`, () => {
    const s = new THREE.Shape(); s.moveTo(0, yTop); s.lineTo(L, yTop - fall); s.lineTo(L, ySpring);
    for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; s.lineTo(L * Math.cos(a), ySpring + H * Math.sin(a)); }
    s.lineTo(0, yTop);
    return new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false });
  });
  const st = M.ashlar(opts.tone || '#3a4454');
  if (axis === 'x') add(ctx, g, st, wx, 0, wz - 0.3);
  else add(ctx, g, st, wx + 0.3, 0, wz, { ry: -Math.PI / 2 });
  // coping along the top of the flyer
  const cl = Math.hypot(L, fall), ca = Math.atan2(fall, L);
  if (axis === 'x') add(ctx, box(cl, 0.16, 0.72), M.ashlar('#4a5464'), wx + L / 2, yTop - fall / 2 + 0.08, wz, { rz: -ca });
  else add(ctx, box(0.72, 0.16, cl), M.ashlar('#4a5464'), wx, yTop - fall / 2 + 0.08, wz + L / 2, { rx: ca });
  // the pier and its pinnacle
  const px = axis === 'x' ? wx + len : wx, pz = axis === 'x' ? wz : wz + len; const pTop = yTop - fall + 0.6;
  add(ctx, box(1.2, depth, 1.3), M.ashlar('#343e50'), px, pTop - depth / 2, pz, { cast: false });
  add(ctx, box(1.36, 0.2, 1.46), M.ashlar('#4a5464'), px, pTop, pz);
  pinnacle(ctx, px, pz, pTop + 0.1, opts.pin ?? 3.2, 0.9);
  if (opts.gargoyle !== false) gargoyle(ctx, axis === 'x' ? px + 0.55 : px, pTop - 0.9, axis === 'x' ? pz : pz + 0.55, axis === 'x' ? Math.PI / 2 : 0, { stream: 1.8 });
}

// A square tower body rising from the dark, its top at y1 (the crossing's lantern tower).
export function tower(ctx, x0, z0, x1, z1, y1, opts = {}) {
  const w = x1 - x0, d = z1 - z0, depth = opts.depth ?? 26; const tone = opts.tone || '#323c4e';
  add(ctx, box(w, y1 + depth, d), M.brick(tone), x0 + w / 2, (y1 - depth) / 2, z0 + d / 2);
  add(ctx, box(w + 0.3, 0.3, d + 0.3), M.ashlar('#4a5464'), x0 + w / 2, y1, z0 + d / 2);
  // corner buttresses
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) add(ctx, box(0.9, y1 + depth - 0.4, 0.9), M.ashlar('#3a4454'), cx, (y1 - 0.4 - depth) / 2, cz);
  solid(ctx, x0 - 0.45, z0 - 0.45, x1 + 0.45, z1 + 0.45, y1);
}

// A tall octagonal slate spire on a tower top at height y0, with lucarnes and a finial cross.
export function spire(ctx, x, z, y0, r, h) {
  add(ctx, cyl(r * 0.92, r, 0.6, 8), M.ashlar('#3a4454'), x, y0 + 0.3, z, { ry: Math.PI / 8 });
  add(ctx, cone(r * 0.9, h, 8), M.slate('#1c2430'), x, y0 + 0.6 + h / 2, z, { ry: Math.PI / 8 });
  for (let i = 0; i < 4; i++) { // lucarnes on the four main faces
    const a = i * Math.PI / 2 + Math.PI / 4; const lx = Math.sin(a) * r * 0.62, lz = Math.cos(a) * r * 0.62;
    add(ctx, box(0.7, 1.0, 0.7), M.ashlar('#3a4454'), x + lx, y0 + 2.4, z + lz, { ry: a });
    add(ctx, cone(0.55, 0.9, 4), M.slate('#1c2430'), x + lx, y0 + 3.3, z + lz, { ry: a + Math.PI / 4 });
  }
  add(ctx, box(0.08, 1.2, 0.08), M.ironLit(), x, y0 + 0.6 + h + 0.5, z);
  add(ctx, box(0.6, 0.08, 0.08), M.ironLit(), x, y0 + 0.6 + h + 0.7, z, { ry: Math.PI / 4 });
}

// A gargoyle crouched at height y, leaning out toward ry (0 = +Z), spitting rain into the dark.
export function gargoyle(ctx, x, y, z, ry = 0, opts = {}) {
  const st = M.flat(opts.tone ?? 0x4a5462), dark = M.flat(0x343c48);
  part(ctx, box(0.5, 0.22, 0.8), M.ashlar('#4a5464'), x, y, z, ry, 0, 0.11, 0.05);       // corbel
  part(ctx, box(0.46, 0.34, 0.4), st, x, y, z, ry, 0, 0.38, -0.12);                      // haunches
  part(ctx, box(0.36, 0.34, 0.5), st, x, y, z, ry, 0, 0.56, 0.16, 0.45);                 // hunched back
  part(ctx, box(0.28, 0.24, 0.3), st, x, y, z, ry, 0, 0.66, 0.46, 0.1);                  // head
  part(ctx, box(0.18, 0.12, 0.24), dark, x, y, z, ry, 0, 0.6, 0.66, 0.15);               // snout
  for (const s of [-1, 1]) {
    part(ctx, cone(0.05, 0.22, 4), dark, x, y, z, ry, s * 0.1, 0.84, 0.4, -0.5);          // horns
    part(ctx, box(0.06, 0.44, 0.5), dark, x, y, z, ry, s * 0.24, 0.74, -0.08, -0.3, s * 0.45); // folded wings
    part(ctx, box(0.09, 0.3, 0.09), st, x, y, z, ry, s * 0.13, 0.32, 0.36);               // forelegs
  }
  if (opts.stream) { // the spout: a thread of rain falling out of the mouth
    const m = part(ctx, box(0.04, opts.stream, 0.04), streamMat(), x, y, z, ry, 0, 0.56 - opts.stream / 2, 0.8, 0, 0, { cast: false, dynamic: true });
    m.renderOrder = 1;
  }
}
let _stream;
function streamMat() { return _stream || (_stream = new THREE.MeshBasicMaterial({ color: 0x8ea4c0, transparent: true, opacity: 0.3, depthWrite: false, fog: false })); }

// ---------------------------------------------------------------- railings and steps
// A railing along X or Z on a stone kerb over the drop. style 'iron' (bars and spear tips, see-through) or
// 'stone' (balusters and a coping rail). broken: [[t0, t1], ...] spans (fractions of the length) where the
// kerb is cracked and the rail gone or bent out over the edge (out: '+x', '-x', '+z' or '-z').
export function railing(ctx, x0, z0, x1, z1, opts = {}) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  const a0 = alongX ? Math.min(x0, x1) : Math.min(z0, z1); const c = alongX ? z0 : x0;
  const h = opts.h ?? 1.15, kerb = opts.kerb ?? 0.45, style = opts.style || 'iron'; const broken = opts.broken || [];
  const out = opts.out || (alongX ? '+z' : '+x'); const od = out[0] === '+' ? 1 : -1;
  const at = (p) => alongX ? [p, c] : [c, p];
  const iron = M.ironLit(), st = M.ashlar(opts.tone || '#4a5464');
  const isBroken = (p) => broken.some(([t0, t1]) => p >= a0 + t0 * len && p <= a0 + t1 * len);
  // kerb (always there: it is what stops a fall)
  const [kx, kz] = at(a0 + len / 2); const kw = opts.kw ?? 0.5;
  add(ctx, box(alongX ? len : kw, kerb, alongX ? kw : len), st, kx, kerb / 2, kz);
  // the rail itself, run by run
  const runs = []; let start = a0;
  const edges = broken.map(([t0, t1]) => [a0 + t0 * len, a0 + t1 * len]).sort((p, q) => p[0] - q[0]);
  for (const [b0, b1] of edges) { if (b0 > start) runs.push([start, b0]); start = Math.max(start, b1); }
  if (start < a0 + len) runs.push([start, a0 + len]);
  const r = T.rng(Math.round(x0 * 31 + z0 * 17 + len * 7));
  for (const [p0, p1] of runs) {
    const rl = p1 - p0; if (rl < 0.2) continue;
    const [mx, mz] = at((p0 + p1) / 2);
    if (style === 'iron') {
      const nb = Math.max(1, Math.round(rl / 0.24));
      for (let i = 0; i <= nb; i++) {
        const [bx, bz] = at(p0 + (i / nb) * rl); const post = i % 8 === 0 || i === nb;
        if (post) { inst(ctx, 'rpost', box(0.12, h + 0.2, 0.12), iron, mat4(bx, kerb + (h + 0.2) / 2, bz)); inst(ctx, 'rfin', cone(0.09, 0.3, 4), iron, mat4(bx, kerb + h + 0.35, bz, Math.PI / 4)); }
        else { inst(ctx, 'rbar', box(0.05, h, 0.05), iron, mat4(bx, kerb + h / 2, bz)); inst(ctx, 'rtip', cone(0.06, 0.2, 4), iron, mat4(bx, kerb + h + 0.1, bz, Math.PI / 4)); }
      }
      for (const yy of [0.12, h - 0.25]) add(ctx, box(alongX ? rl : 0.05, 0.05, alongX ? 0.05 : rl), iron, mx, kerb + yy, mz);
      for (let i = 0; i < nb; i += 2) { const [bx, bz] = at(p0 + ((i + 0.5) / nb) * rl); inst(ctx, 'rring', torus(0.09, 0.02), iron, mat4(bx, kerb + h - 0.42, bz, alongX ? 0 : Math.PI / 2)); }
    } else {
      const nb = Math.max(1, Math.round(rl / 0.32));
      for (let i = 0; i < nb; i++) { const [bx, bz] = at(p0 + ((i + 0.5) / nb) * rl); inst(ctx, 'baluster', cyl(0.07, 0.1, h - 0.2, 6), st, mat4(bx, kerb + (h - 0.2) / 2, bz)); }
      add(ctx, box(alongX ? rl : 0.42, 0.2, alongX ? 0.42 : rl), M.ashlar('#56606e'), mx, kerb + h - 0.1, mz);
      for (const p of [p0 + 0.2, p1 - 0.2]) { const [bx, bz] = at(p); add(ctx, box(0.4, h, 0.4), st, bx, kerb + h / 2, bz); }
    }
  }
  // broken spans: bars bent out over the edge, a few stones on the kerb
  for (const [b0, b1] of edges) {
    const n = Math.max(1, Math.round((b1 - b0) / 0.7));
    for (let i = 0; i < n; i++) {
      const p = b0 + (i + 0.5) / n * (b1 - b0) + (r() - 0.5) * 0.2; const [bx, bz] = at(p); const lean = 0.5 + r() * 0.9;
      if (style === 'iron' && r() < 0.75) {
        const hh = h * (0.4 + r() * 0.6);
        const m = add(ctx, box(0.05, hh, 0.05), iron, bx + (alongX ? 0 : od * Math.sin(lean) * hh / 2), kerb + Math.cos(lean) * hh / 2, bz + (alongX ? od * Math.sin(lean) * hh / 2 : 0));
        if (alongX) m.rotation.x = od * lean; else m.rotation.z = -od * lean;
      } else add(ctx, box(q16(0.25 + r() * 0.2), q16(0.15 + r() * 0.15), q16(0.25 + r() * 0.2)), st, bx, kerb + 0.08, bz, { ry: r() * 3 });
    }
  }
  // collision: the full rail where it stands, the kerb alone where it is broken (both see-through)
  const pad = Math.max(0.2, kw / 2);
  const seg = (p0, p1, hh) => { const s0 = alongX ? [p0, c - pad, p1, c + pad] : [c - pad, p0, c + pad, p1]; solid(ctx, ...s0, hh); ctx.lowSolids.push(ctx.solids[ctx.solids.length - 1]); };
  for (const [p0, p1] of runs) seg(p0, p1, kerb + h);
  for (const [b0, b1] of edges) seg(b0, b1, kerb);
}

// A flight of steps climbing toward dir ('z-' or 'x-'), laid flat (the walk stays level): bright risers,
// dark treads, and cheek walls that step up beside it.
export function flight(ctx, x0, z0, x1, z1, dir = 'z-', opts = {}) {
  const alongZ = dir[0] === 'z'; const len = alongZ ? z1 - z0 : x1 - x0; const wid = alongZ ? x1 - x0 : z1 - z0;
  const n = opts.n || Math.round(len / 0.5); const step = len / n; const tone = opts.tone || '#56606e';
  const tread = M.ashlar('#4a5464'), riser = M.ashlar(tone), shade = M.flat(0x1a1e26);
  for (let i = 0; i < n; i++) {
    // i = 0 is the bottom step (nearest the camera)
    const a = alongZ ? z1 - i * step : x1 - i * step;
    const parts = [[0.06, shade], [step * 0.38, riser], [step * 0.62 - 0.06, tread]]; let o = 0;
    for (const [dp, mat] of parts) {
      const c = a - o - dp / 2; o += dp;
      if (alongZ) add(ctx, box(wid, 0.03, dp), mat, (x0 + x1) / 2, 0.015, c, { cast: false });
      else add(ctx, box(dp, 0.03, wid), mat, c, 0.015, (z0 + z1) / 2, { cast: false });
    }
  }
  // cheeks: low walls either side, stepping up toward the top
  const cw = opts.cheek ?? 0.5; const h0 = opts.h0 ?? 0.9, h1 = opts.h1 ?? 1.9;
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const a = (alongZ ? z1 : x1) - (i + 0.5) * step; const hh = q16(h0 + (h1 - h0) * (i / (n - 1 || 1)));
      if (alongZ) add(ctx, box(cw, hh, step + 0.01), M.ashlar('#3e4858'), side < 0 ? x0 - cw / 2 : x1 + cw / 2, hh / 2, a);
      else add(ctx, box(step + 0.01, hh, cw), M.ashlar('#3e4858'), a, hh / 2, side < 0 ? z0 - cw / 2 : z1 + cw / 2);
    }
    if (alongZ) solid(ctx, side < 0 ? x0 - cw : x1, z0, side < 0 ? x0 : x1 + cw, z1, h1);
    else solid(ctx, x0, side < 0 ? z0 - cw : z1, x1, side < 0 ? z0 : z1 + cw, h1);
  }
}

// ---------------------------------------------------------------- wind and light
// A torn pennant on a pole, snapping in the wind (which blows toward +X). y is the pole's top.
export function pennant(ctx, x, y, z, opts = {}) {
  const ph = opts.pole ?? 2.4; const len = opts.len ?? 1.6, w = opts.w ?? 0.5;
  add(ctx, cyl(0.04, 0.05, ph, 5), M.ironLit(), x, y - ph / 2, z);
  add(ctx, cone(0.06, 0.2, 4), M.ironLit(), x, y + 0.1, z);
  const g = new THREE.PlaneGeometry(len, w, 8, 1); g.translate(len / 2, -w / 2, 0);
  const pos = g.attributes.position; const base = Float32Array.from(pos.array);
  // taper and tear the fly end
  for (let i = 0; i < pos.count; i++) { const u = base[i * 3] / len; const vy = base[i * 3 + 1]; base[i * 3 + 1] = vy * (1 - u * 0.45) - (u > 0.8 && vy < -w * 0.5 ? 0.12 : 0); }
  const m = new THREE.Mesh(g, cutout(new THREE.MeshLambertMaterial({ color: opts.color ?? 0x6a161a, side: THREE.DoubleSide })));
  m.position.set(x, y - 0.05, z); m.rotation.y = opts.ry ?? 0; m.castShadow = true; ctx.group.add(m);
  let t = Math.random() * 10; const sp = opts.speed ?? 9;
  ctx.anims.push({ update(dt) {
    t += dt; const gust = 0.7 + 0.3 * Math.sin(t * 0.7);
    for (let i = 0; i < pos.count; i++) { const u = base[i * 3] / len; pos.array[i * 3] = base[i * 3] * (0.92 + 0.08 * gust); pos.array[i * 3 + 1] = base[i * 3 + 1]; pos.array[i * 3 + 2] = Math.sin(t * sp - u * 5) * 0.16 * u * gust; }
    pos.needsUpdate = true; return false;
  } });
}

// A lantern hanging from a hook at (x, y, z), rocking in the wind (an iron cage and its glass: two meshes).
const lanternIron = () => geo('lanternIron', () => {
  const parts = [[box(0.03, 0.5, 0.03), 0, -0.25, 0], [cone(0.26, 0.22, 4), 0, -0.42, 0], [box(0.36, 0.05, 0.36), 0, -0.95, 0]];
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push([box(0.035, 0.46, 0.035), ox * 0.15, -0.72, oz * 0.15]);
  return mergeGeometries(parts.map(([g, px, py, pz], i) => { const c = (g.index ? g.toNonIndexed() : g.clone()); if (i === 1) c.rotateY(Math.PI / 4); c.translate(px, py, pz); for (const k of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(k)) c.deleteAttribute(k); return c; }), false);
});
export function hangLantern(ctx, x, y, z, opts = {}) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); ctx.group.add(pivot);
  const cage = new THREE.Mesh(lanternIron(), M.ironLit()); cage.castShadow = true; pivot.add(cage);
  const glass = new THREE.Mesh(box(0.28, 0.4, 0.28), M.glow(opts.color || '#ffc46a', 2.4)); glass.position.y = -0.72; pivot.add(glass);
  let t = Math.random() * 10;
  ctx.anims.push({ update(dt) { t += dt; pivot.rotation.z = Math.sin(t * 1.6) * 0.1 + Math.sin(t * 3.7) * 0.03; pivot.rotation.x = Math.sin(t * 1.1) * 0.05; return false; } });
  ctx.lights.push({ x, y: y - 0.7, z, color: 0xffb45a, intensity: opts.intensity || 6, dist: opts.dist || 8.5, halo: true, flicker: 0.06 });
}

// An iron bracket on a wall face for a hanging lantern: face '+x' or '+z'.
export function bracketLantern(ctx, x, y, z, face = '+x', opts = {}) {
  const fx = face === '+x' ? 1 : 0, fz = 1 - fx; const iron = M.ironLit();
  add(ctx, box(0.1 + fx * 0.8, 0.07, 0.1 + fz * 0.8), iron, x + fx * 0.4, y, z + fz * 0.4);
  add(ctx, box(0.05 + fx * 0.5, 0.05, 0.05 + fz * 0.5), iron, x + fx * 0.25, y - 0.25, z + fz * 0.25, fx ? { rz: 0.8 } : { rx: -0.8 });
  hangLantern(ctx, x + fx * 0.75, y, z + fz * 0.75, opts);
}

// Fallen masonry scattered over the leads (no collision: small enough to walk through).
export function rubble(ctx, x, z, w, d, n = 8, opts = {}) {
  const r = T.rng(Math.round(x * 37 + z * 19 + 5)); const tones = ['#3c4656', '#4a5464', '#56606e'];
  for (let i = 0; i < n; i++) {
    const s = q16(0.18 + r() * (opts.big ? 0.5 : 0.3));
    add(ctx, box(s, q16(s * (0.5 + r() * 0.4)), q16(s * (0.7 + r() * 0.5))), M.ashlar(tones[(r() * 3) | 0]), x + (r() - 0.5) * w, s * 0.22, z + (r() - 0.5) * d, { ry: r() * 3, rx: (r() - 0.5) * 0.5 });
  }
  if (opts.solid) solid(ctx, x - w * 0.4, z - d * 0.4, x + w * 0.4, z + d * 0.4, opts.solid);
}

// A fallen pinnacle lying across the leads: the drum of its shaft and its broken spire.
export function fallenPinnacle(ctx, x, z, ry = 0) {
  const st = M.ashlar('#3e4858');
  part(ctx, box(0.9, 0.9, 1.8), st, x, 0, z, ry, 0, 0.45, 0, 0, 0.08);
  part(ctx, cone(0.55, 1.8, 4), st, x, 0, z, ry, 0.1, 0.42, -1.7, -Math.PI / 2 + 0.1);
  part(ctx, box(1.0, 0.16, 1.0), M.ashlar('#4a5464'), x, 0, z, ry, 0, 0.9, 0.95, 0.3);
  rubble(ctx, x + 0.6, z + 0.9, 2, 1.6, 7);
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)); const hw = 0.5, hd = 1.6;
  solid(ctx, x - (c * hw + s * hd), z - (s * hw + c * hd), x + (c * hw + s * hd), z + (s * hw + c * hd), 1);
}

// A coil of bell-rope dropped on the stones.
export function rope(ctx, x, z) {
  const m = M.flat(0x6a5a40);
  for (let i = 0; i < 3; i++) add(ctx, torus(0.22 + i * 0.07, 0.03), m, x + i * 0.04, 0.04 + i * 0.03, z, { rx: Math.PI / 2, cast: false });
  add(ctx, box(0.05, 0.04, 1.4), m, x + 0.5, 0.03, z + 0.6, { ry: 0.6, cast: false });
}

// ---------------------------------------------------------------- the great bell
// The great bell of St. Orrin hanging still in its timber frame; the frame runs along X, the wheel on +X.
export function greatBell(ctx, x, z, opts = {}) {
  const lip = opts.lip ?? 1.2; const oak = M.wood('#4a3626'), dark = M.wood('#36281c'); const iron = M.ironLit();
  const prof = [[0, 3.2], [0.55, 3.18], [0.86, 3.04], [1.0, 2.74], [1.05, 2.2], [1.12, 1.62], [1.25, 1.02], [1.44, 0.52], [1.62, 0.18], [1.72, 0.04], [1.7, 0], [1.52, 0.06], [1.32, 0.4], [1.12, 1.0], [0.96, 1.8], [0.86, 2.6], [0, 2.8]];
  const g = geo('greatbell', () => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20));
  const bronze = cutout(new THREE.MeshPhongMaterial({ color: 0x5a4426, specular: 0xb09660, shininess: 36 }));
  add(ctx, g, bronze, x, lip, z);
  // bands: the sound bow, the waist inscription, the shoulder
  const band = cutout(new THREE.MeshPhongMaterial({ color: 0x6e5630, specular: 0xc8ac70, shininess: 40 }));
  add(ctx, geo('bb0', () => new THREE.TorusGeometry(1.5, 0.05, 4, 20)), band, x, lip + 0.42, z, { rx: Math.PI / 2 });
  add(ctx, geo('bb1', () => new THREE.TorusGeometry(1.08, 0.04, 4, 20)), band, x, lip + 2.2, z, { rx: Math.PI / 2 });
  add(ctx, geo('bb2', () => new THREE.TorusGeometry(1.02, 0.05, 4, 20)), band, x, lip + 2.75, z, { rx: Math.PI / 2 });
  add(ctx, geo('bb3', () => new THREE.TorusGeometry(1.2, 0.03, 4, 20)), M.flat(0x3a5a4a), x, lip + 1.35, z, { rx: Math.PI / 2 }); // verdigris
  // crown and the clapper hanging below the lip
  for (const a of [0, Math.PI / 2]) add(ctx, torus(0.28, 0.07), bronze, x, lip + 3.42, z, { ry: a });
  add(ctx, cyl(0.06, 0.06, 1.6, 6), iron, x, lip + 0.6, z);
  add(ctx, cyl(0.22, 0.16, 0.4, 8), iron, x, lip - 0.18, z);
  // the headstock the bell hangs from
  add(ctx, box(6.6, 0.5, 0.6), dark, x, lip + 3.75, z);
  // the frame: two trestles, sills, a top plate and braces
  const fx = 3.1, fz = 1.05, top = lip + 4.2;
  for (const s of [-1, 1]) {
    add(ctx, box(6.8, 0.32, 0.36), oak, x, 0.16, z + s * fz);
    add(ctx, box(0.36, 0.32, 2.5), oak, x + s * fx, 0.16, z);
    for (const t of [-1, 1]) add(ctx, box(0.34, top, 0.34), oak, x + s * fx, top / 2, z + t * fz);
    add(ctx, box(0.4, 0.34, 2.5), oak, x + s * fx, top + 0.17, z);
    add(ctx, box(0.5, 0.3, 0.7), iron, x + s * fx, lip + 3.75, z); // bearings
    // X braces in each trestle
    const bl = Math.hypot(2 * fz, top * 0.62), ba = Math.atan2(2 * fz, top * 0.62);
    for (const t of [-1, 1]) add(ctx, box(0.18, bl, 0.18), dark, x + s * fx, top * 0.36, z, { rx: t * ba });
    // knee braces under the top plate
    for (const t of [-1, 1]) add(ctx, box(1.2, 0.16, 0.16), dark, x + s * (fx - 0.5), top - 0.45, z + t * fz, { rz: s * 0.7 });
  }
  for (const t of [-1, 1]) add(ctx, box(6.6, 0.3, 0.3), oak, x, top + 0.15, z + t * fz);
  // the bell wheel on the +X side, its rope hanging down
  const wx = x + fx + 0.55;
  add(ctx, geo('bwheel', () => new THREE.TorusGeometry(1.7, 0.07, 4, 20)), dark, wx, lip + 3.75, z, { ry: Math.PI / 2 });
  for (let i = 0; i < 4; i++) add(ctx, box(0.08, 3.3, 0.08), dark, wx, lip + 3.75, z, { rx: i * Math.PI / 4 });
  add(ctx, box(0.05, lip + 3.7, 0.05), M.flat(0x6a5a40), wx, (lip + 3.7) / 2 + 0.05, z + 1.7);
  add(ctx, box(0.36, 0.3, 0.36), oak, wx, 0.15, z + 1.7);
  solid(ctx, x - fx - 0.3, z - fz - 0.3, x + fx + 0.3, z + fz + 0.3, top);
  solid(ctx, wx - 0.3, z - 1.8, wx + 0.3, z + 1.95, 2);
}

// ---------------------------------------------------------------- the bridge, the oculus, braziers
// A bridge deck carried on a pointed arch between two piers that fall into the dark; runs along Z.
export function archBridge(ctx, x0, x1, z0, z1, opts = {}) {
  const u0 = -z1, u1 = -z0, pw = opts.pier ?? 1, deep = opts.depth ?? 26; const a = u0 + pw, b = u1 - pw, S = b - a;
  const vs = (opts.apex ?? -2.4) - S * Math.sin(Math.PI / 3);
  const g = geo(`archBridge${u0},${u1},${vs},${deep},${x1 - x0}`, () => {
    const s = new THREE.Shape(); s.moveTo(u0, 0); s.lineTo(u1, 0); s.lineTo(u1, -deep); s.lineTo(b, -deep); s.lineTo(b, vs);
    for (let i = 1; i <= 8; i++) { const al = (i / 8) * Math.PI / 3; s.lineTo(a + S * Math.cos(al), vs + S * Math.sin(al)); }
    for (let i = 1; i <= 8; i++) { const al = Math.PI * 2 / 3 + (i / 8) * Math.PI / 3; s.lineTo(b + S * Math.cos(al), vs + S * Math.sin(al)); }
    s.lineTo(a, -deep); s.lineTo(u0, -deep); s.lineTo(u0, 0);
    return new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false });
  });
  add(ctx, g, M.ashlar(opts.tone || '#384252'), x0, -0.05, 0, { ry: Math.PI / 2, cast: false });
  // a string course along the deck's edge
  add(ctx, box(x1 - x0 + 0.1, 0.22, z1 - z0), M.ashlar('#4a5464'), (x0 + x1) / 2, -0.75, (z0 + z1) / 2, { cast: false });
}

// The crossing's oculus: an iron grille over the vault, candlelight rising from the nave below.
export function oculus(ctx, x, z, r = 1.3) {
  add(ctx, cyl(r + 0.3, r + 0.3, 0.06, 16), M.ashlar('#4a5464'), x, 0.02, z, { cast: false });
  add(ctx, cyl(r, r, 0.02, 16), M.glow('#ff7a30', 0.2), x, 0.05, z, { cast: false });
  const iron = M.ironLit();
  add(ctx, geo('ocring' + r, () => new THREE.TorusGeometry(r, 0.07, 4, 20)), iron, x, 0.08, z, { rx: Math.PI / 2 });
  add(ctx, geo('ocring2' + r, () => new THREE.TorusGeometry(r * 0.55, 0.05, 4, 14)), iron, x, 0.08, z, { rx: Math.PI / 2 });
  for (let i = -3; i <= 3; i++) { const o = i * r / 3.5, l = 2 * Math.sqrt(Math.max(0, r * r - o * o)); add(ctx, box(l, 0.05, 0.06), iron, x, 0.08, z + o); add(ctx, box(0.06, 0.05, l), iron, x + o, 0.09, z); }
  ctx.lights.push({ x, y: 0.9, z, color: 0xff8a3a, intensity: 2.5, dist: 4.5 });
}

// A brazier on three iron legs.
export function brazier(ctx, x, z) {
  const iron = M.ironLit();
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4; add(ctx, box(0.05, 1.05, 0.05), iron, x + Math.sin(a) * 0.24, 0.5, z + Math.cos(a) * 0.24, { rx: -Math.cos(a) * 0.22, rz: Math.sin(a) * 0.22 }); }
  add(ctx, cyl(0.4, 0.22, 0.32, 8), iron, x, 1.08, z);
  add(ctx, cyl(0.35, 0.35, 0.04, 8), M.glow('#ff8a30', 1.6), x, 1.22, z, { cast: false });
  const t0 = T.flame().clone(); t0.needsUpdate = true; t0.repeat.set(1 / 4, 1);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t0, color: new THREE.Color(2.2, 1.9, 1.6), fog: false }));
  sp.scale.set(0.75, 1.0, 1); sp.position.set(x, 1.68, z); ctx.group.add(sp);
  let t = Math.random() * 10; ctx.anims.push({ update(dt) { t += dt; t0.offset.x = (Math.floor(t * 10) % 4) / 4; return false; } });
  ctx.lights.push({ x, y: 2, z, color: 0xff8a30, intensity: 5.5, dist: 7.5, halo: true, flicker: 0.25 });
  solidCircle(ctx, x, z, 0.42, 1.2);
}
