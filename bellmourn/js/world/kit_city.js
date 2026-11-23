// District styles for the city kit. A level calls K.district(ctx, '<id>') at the top of its build and the
// shared kit pieces (fence, gate, lamp, torch, wall, house) take that district's own form, so no two
// districts share their railings, lamps, walls or houses:
//   gate        Gallows Gate: the reference set (wrought iron, gothic stone, slate): kit.js's own pieces
//   market      Lantern Row: timber rails, plank gates, paper lanterns on gallows posts, timber-framed
//               jettied houses with clay-tile roofs, amber light
//   docks       Mirewater: tarred pilings and rope, slatted plank gates with chains, ship's lanterns on
//               davits, clapboard sheds under corrugated iron, pale whale-oil light
//   nave        the Drowned Nave: stone balustrades, bronze choir-screen grilles, pricket candle-stands
//   undercroft  bone rails on skull posts, portcullises that lift, skull-candle pillars
//   foundry     steel girder rails, sliding riveted doors, caged factory lamps on girders, red factory
//               brick, sawtooth-roofed brick sheds, orange light
//   heights     white marble balustrades with gilt urns, gilded gates, triple-headed pale gas lamps,
//               stucco walls with pilasters, mansard town palaces
//   belfry      lashed scaffold rails, plank barriers that lift like drawbridges, storm lanterns
// Each styled piece only draws: kit.js keeps the collision (solids, low solids, gate solids) exactly as
// before, so a level's walkable floor and its locks are unchanged by its style.
import * as THREE from '../../vendor/three.module.min.js';
import { M, cutout } from '../engine/materials.js';
import * as T from '../engine/textures.js';
import * as X from './tex_city.js';
import { add, box, cyl, cone, plane, torus, inst, mat4, roof, geo } from './kit.js';

// ---------------------------------------------------------------- materials (world-mapped, see-through cut)
const mcache = new Map();
const once = (k, fn) => { if (!mcache.has(k)) mcache.set(k, fn()); return mcache.get(k); };
function worldMat(mat, tex) {
  cutout(mat); mat.map = tex; const ws = tex.userData.worldSize || [2, 2]; const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    base(sh, r); sh.uniforms.worldSize = { value: new THREE.Vector2(ws[0], ws[1]) };
    sh.fragmentShader = sh.fragmentShader.replace('uniform float cutR;', 'uniform float cutR; uniform vec2 worldSize;').replace('#include <map_fragment>', `
        vec3 an = abs(vWNrm); vec2 wuv;
        if (an.y >= an.x && an.y >= an.z) wuv = vec2(vWPos.x, -vWPos.z);
        else if (an.x >= an.z) wuv = vec2(-vWPos.z * sign(vWNrm.x), vWPos.y);
        else wuv = vec2(vWPos.x * sign(vWNrm.z), vWPos.y);
        wuv = floor(wuv * 16.0 + 0.001) / 16.0 + 1.0/32.0;
        diffuseColor *= texture2D(map, wuv / worldSize);`);
  };
  mat.customProgramCacheKey = () => 'bmcw' + ws.join('x');
  return mat;
}
const lam = (k, tex) => once(k, () => worldMat(new THREE.MeshLambertMaterial(), tex));
const pho = (k, tex, o) => once(k, () => worldMat(new THREE.MeshPhongMaterial(o), tex));
export const MC = {
  herring: (t = '#6a4636') => pho('herr' + t, X.herring(101, t), { shininess: 16, specular: 0x403028 }),
  timber: (t = '#b89a70', b = '#3a2618') => lam('tfr' + t + b, X.timberFrame(102, t, b)),
  boards: (t = '#5a5048') => pho('brd' + t, X.boards(103, t), { shininess: 24, specular: 0x404848 }),
  setts: (t = '#5a5c60') => pho('set' + t, X.setts(104, t), { shininess: 20, specular: 0x404650 }),
  plate: (t = '#4a4440') => pho('plt' + t, X.plate(105, t), { shininess: 36, specular: 0x605040 }),
  cinder: (t = '#2e2826') => lam('cin' + t, X.cinder(106, t)),
  inlay: (t = '#cfc8bc', k = '#1c1a20') => pho('inl' + t + k, X.inlay(107, t, k), { shininess: 40, specular: 0x8a8478 }),
  stucco: (t = '#bdb4a6') => lam('stu' + t, X.stucco(108, t)),
  clap: (t = '#3e3a34') => lam('clp' + t, X.clapboard(109, t)),
  corr: (t = '#5a4a3e') => pho('cor' + t, X.corrugated(110, t), { shininess: 30, specular: 0x50443a }),
  tiles: (t = '#7a3e2a') => lam('til' + t, X.tiles(111, t)),
  gaol: (t = '#3c4048') => lam('gst' + t, X.gaolStone(112, t)),
  redBrick: (t = '#6a3426') => lam('rbk' + t, X.redBrick(113, t)),
  sea: (t = '#4a5450') => lam('sea' + t, X.seaStone(114, t)),
};
const flatM = (c, o) => M.flat(c, o);
const gold = () => once('goldLit', () => cutout(new THREE.MeshPhongMaterial({ color: 0xb08a3c, specular: 0xffe0a0, shininess: 60, emissive: 0x2a1a04 })));
const bronze = () => once('bronze', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3a6a5a, specular: 0x8ac0a0, shininess: 40 })));
const steel = () => once('steel', () => cutout(new THREE.MeshPhongMaterial({ color: 0x3a3634, specular: 0x6a5a4a, shininess: 26 })));
const bone = () => once('bone', () => cutout(new THREE.MeshLambertMaterial({ color: 0xb8ab8c })));
const rope = () => M.flat(0x6a5638);
const tar = () => M.wood('#2a2420');
const sph = (r, d = 1) => geo(`cs${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));

// The district's default lamp light (a lamp's own colour option still wins).
export const LIGHT = { market: 0xffa040, docks: 0xd8e8b0, nave: 0x9ad0ff, undercroft: 0xffb050, foundry: 0xff8a34, heights: 0xd6ccff, belfry: 0xfff0d0 };

// A thin straight bar between two points, instanced (ropes, braces, chains).
function rod(ctx, key, mat, a, b, t) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-3;
  const m = new THREE.Matrix4(); const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
  m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), qq, new THREE.Vector3(t, L, t));
  inst(ctx, key, box(1, 1, 1), mat, m);
}
// Points along a run (fences): call fn(x, z, i, n) every `step` metres.
function along(x0, z0, x1, z1, step, fn) { const len = Math.hypot(x1 - x0, z1 - z0); const n = Math.max(1, Math.round(len / step)); for (let i = 0; i <= n; i++) fn(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, i, n); return n; }

// ================================================================= fences (visuals only)
function fenceMarket(ctx, x0, z0, x1, z1) {
  const post = M.wood('#4a3020'), rail = M.wood('#6a4a30'); const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = Math.hypot(x1 - x0, z1 - z0);
  const n = along(x0, z0, x1, z1, 1.5, (x, z, i) => {
    inst(ctx, 'mkf-post', box(0.16, 1.3, 0.16), post, mat4(x, 0.65, z));
    inst(ctx, 'mkf-cap', cone(0.14, 0.18, 4), M.wood('#3a2418'), mat4(x, 1.39, z, Math.PI / 4));
    if (i % 3 === 1) { inst(ctx, 'mkf-lan', cyl(0.1, 0.1, 0.22, 6), M.glow('#ff8a3a', 1.8), mat4(x, 1.62, z)); if (i % 6 === 1) ctx.lights.push({ x, y: 1.7, z, color: 0xff9040, intensity: 1.4, dist: 3.2, flicker: 0.1 }); }
  });
  for (const y of [0.45, 1.05]) add(ctx, box(alongX ? len : 0.07, 0.09, alongX ? 0.07 : len), rail, (x0 + x1) / 2, y, (z0 + z1) / 2);
  // X braces in every bay
  for (let i = 0; i < n; i++) { const a = [x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n], b = [x0 + (x1 - x0) * (i + 1) / n, z0 + (z1 - z0) * (i + 1) / n];
    rod(ctx, 'mkf-brace', rail, [a[0], 0.45, a[1]], [b[0], 1.05, b[1]], 0.05); }
}
function fenceDocks(ctx, x0, z0, x1, z1) {
  const n = along(x0, z0, x1, z1, 2, (x, z, i) => {
    inst(ctx, 'dkf-pile', cyl(0.13, 0.15, 1.3, 7), tar(), mat4(x, 0.65, z));
    inst(ctx, 'dkf-top', cyl(0.14, 0.14, 0.08, 7), M.flat(0x4a4038), mat4(x, 1.3, z));
    if (i % 2 === 0) inst(ctx, 'dkf-wrap', cyl(0.16, 0.16, 0.12, 7), rope(), mat4(x, 1.0, z));
  });
  for (let i = 0; i < n; i++) { const a = [x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n], b = [x0 + (x1 - x0) * (i + 1) / n, z0 + (z1 - z0) * (i + 1) / n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (const [y, sag] of [[1.0, 0.22], [0.55, 0.12]]) { rod(ctx, 'dkf-rope', rope(), [a[0], y, a[1]], [m[0], y - sag, m[1]], 0.035); rod(ctx, 'dkf-rope', rope(), [m[0], y - sag, m[1]], [b[0], y, b[1]], 0.035); } }
}
function fenceNave(ctx, x0, z0, x1, z1) { balustrade(ctx, x0, z0, x1, z1, M.ashlar('#4a5462'), M.ashlar('#5a6472'), flatM(0x56606c), 'nvb'); }
function fenceHeights(ctx, x0, z0, x1, z1) { balustrade(ctx, x0, z0, x1, z1, MC.stucco('#c8c0b2'), MC.stucco('#d8d0c2'), flatM(0xd0c8ba), 'hhb', true); }
function balustrade(ctx, x0, z0, x1, z1, base, rail, bal, key, urns) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = Math.hypot(x1 - x0, z1 - z0); const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  add(ctx, box(alongX ? len + 0.1 : 0.46, 0.22, alongX ? 0.46 : len + 0.1), base, cx, 0.11, cz);
  add(ctx, box(alongX ? len + 0.1 : 0.4, 0.13, alongX ? 0.4 : len + 0.1), rail, cx, 1.0, cz);
  const nb = Math.max(2, Math.round(len / 0.3));
  for (let i = 0; i < nb; i++) { const t = (i + 0.5) / nb; const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
    inst(ctx, key + '-bal', cyl(0.07, 0.11, 0.72, 6), bal, mat4(x, 0.58, z)); inst(ctx, key + '-knob', sph(0.1, 0), bal, mat4(x, 0.5, z)); }
  along(x0, z0, x1, z1, 3, (x, z, i) => {
    inst(ctx, key + '-pier', box(0.48, 1.18, 0.48), base, mat4(x, 0.59, z)); inst(ctx, key + '-pcap', box(0.58, 0.1, 0.58), rail, mat4(x, 1.22, z));
    if (urns) { inst(ctx, key + '-urn', cyl(0.16, 0.08, 0.3, 8), gold(), mat4(x, 1.42, z)); inst(ctx, key + '-urnt', sph(0.08, 0), gold(), mat4(x, 1.64, z)); }
  });
}
function fenceUndercroft(ctx, x0, z0, x1, z1) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = Math.hypot(x1 - x0, z1 - z0);
  along(x0, z0, x1, z1, 1.6, (x, z) => {
    inst(ctx, 'ucf-post', box(0.24, 1.0, 0.24), M.ashlar('#3e3830'), mat4(x, 0.5, z));
    for (let k = 0; k < 3; k++) inst(ctx, 'ucf-skull', sph(0.13, 1), bone(), mat4(x + (k - 1) * 0.06, 1.12 + (k === 1 ? 0.14 : 0), z + (k - 1) * 0.04));
  });
  for (const y of [0.35, 0.8]) for (let t = 0; t < len; t += 0.42) { const f = (t + 0.21) / len; const x = x0 + (x1 - x0) * f, z = z0 + (z1 - z0) * f;
    inst(ctx, 'ucf-femur', cyl(0.035, 0.035, 0.42, 5), bone(), mat4(x, y, z, 0, alongX ? 0 : Math.PI / 2, alongX ? Math.PI / 2 : 0)); }
  for (let t = 0.2; t < len; t += 0.2) { const f = t / len; inst(ctx, 'ucf-bar', box(0.035, 0.75, 0.035), M.ironLit(), mat4(x0 + (x1 - x0) * f, 0.6, z0 + (z1 - z0) * f)); }
}
function fenceFoundry(ctx, x0, z0, x1, z1) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = Math.hypot(x1 - x0, z1 - z0); const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const n = along(x0, z0, x1, z1, 2, (x, z) => {
    inst(ctx, 'fdf-web', box(alongX ? 0.06 : 0.22, 1.4, alongX ? 0.22 : 0.06), steel(), mat4(x, 0.7, z));
    inst(ctx, 'fdf-flange', box(alongX ? 0.2 : 0.24, 1.4, alongX ? 0.24 : 0.2), steel(), mat4(x, 0.7, z, 0, 0, 0, 1));
    inst(ctx, 'fdf-foot', box(0.4, 0.06, 0.4), steel(), mat4(x, 0.03, z));
  });
  for (const y of [0.55, 1.3]) add(ctx, box(alongX ? len : 0.06, 0.1, alongX ? 0.06 : len), steel(), cx, y, cz);
  add(ctx, box(alongX ? len : 0.05, 0.16, alongX ? 0.05 : len), M.flat(0x8a6a1a), cx, 0.12, cz); // a kick plate, warning-painted
  for (let i = 0; i < n; i++) { const a = [x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n], b = [x0 + (x1 - x0) * (i + 1) / n, z0 + (z1 - z0) * (i + 1) / n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    rod(ctx, 'fdf-chain', M.ironLit(), [a[0], 0.95, a[1]], [m[0], 0.8, m[1]], 0.04); rod(ctx, 'fdf-chain', M.ironLit(), [m[0], 0.8, m[1]], [b[0], 0.95, b[1]], 0.04); }
}
function fenceBelfry(ctx, x0, z0, x1, z1) {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0); const len = Math.hypot(x1 - x0, z1 - z0); const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; const pole = M.wood('#6a5236');
  const n = along(x0, z0, x1, z1, 1.8, (x, z) => { inst(ctx, 'bff-pole', cyl(0.07, 0.08, 1.6, 6), pole, mat4(x, 0.8, z)); inst(ctx, 'bff-lash', cyl(0.095, 0.095, 0.1, 6), rope(), mat4(x, 1.12, z)); });
  add(ctx, box(alongX ? len : 0.05, 0.08, alongX ? 0.05 : len), pole, cx, 1.12, cz);
  add(ctx, box(alongX ? len : 0.05, 0.22, alongX ? 0.05 : len), M.wood('#4a3a28'), cx, 0.13, cz);
  for (let i = 0; i < n; i++) { const a = [x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n], b = [x0 + (x1 - x0) * (i + 1) / n, z0 + (z1 - z0) * (i + 1) / n];
    rod(ctx, 'bff-brace', pole, [a[0], 0.25, a[1]], [b[0], 1.1, b[1]], 0.05); }
}

// ================================================================= gates: draw the leaves, return apply(k), k = 0 shut .. 1 open
// along(p) gives the point p metres along the gate's line from its centre. Piers get kit.js's solids.
function pivotLeaves(ctx, x, z, width, alongX, h, opts, along, buildLeaf) {
  const leaves = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); const [hx, hz] = along(s * width / 2); pivot.position.set(hx, 0, hz); ctx.group.add(pivot);
    const lw = width / 2; const P = (p, y, o = 0) => [alongX ? -s * p : o, y, alongX ? o : -s * p];
    buildLeaf(pivot, lw, P, s); pivot.userData.side = s; leaves.push(pivot);
  }
  const sw = opts.swing || 1.6, dir = (alongX ? -1 : 1) * (opts.swingDir || 1);
  return (k) => { for (const l of leaves) l.rotation.y = l.userData.side * k * sw * dir; };
}
const piece = (parent, g, m, [px, py, pz], o = {}) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(px, py, pz); if (o.rz) mesh.rotation.z = o.rz; if (o.rx) mesh.rotation.x = o.rx; if (o.ry) mesh.rotation.y = o.ry; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };

function gateMarket(ctx, x, z, width, alongX, h, opts, along) {
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35)); const post = M.wood('#3e2818');
    add(ctx, box(0.42, h + 0.9, 0.42), post, px, (h + 0.9) / 2, pz); add(ctx, box(0.56, 0.12, 0.56), M.wood('#5a3a24'), px, h + 0.95, pz);
    add(ctx, cyl(0.17, 0.17, 0.36, 8), M.glow('#ff7a34', 2.2), px, h + 1.25, pz, { cast: false }); add(ctx, cone(0.22, 0.16, 8), M.wood('#2a1a10'), px, h + 1.5, pz);
    ctx.lights.push({ x: px, y: h + 1.2, z: pz, color: 0xff8a3a, intensity: 2.6, dist: 4.5, flicker: 0.1, halo: true });
  }
  // a timber lintel with a carved candle board across the top
  const [lx, lz] = [x, z]; add(ctx, box(alongX ? width + 1.2 : 0.3, 0.3, alongX ? 0.3 : width + 1.2), M.wood('#4a2e1c'), lx, h + 0.55, lz);
  const pl = M.wood('#6a4a2e'), br = M.wood('#4a3020');
  return pivotLeaves(ctx, x, z, width, alongX, h, opts, along, (pv, lw, P) => {
    const n = Math.max(2, Math.round(lw / 0.24));
    for (let i = 0; i < n; i++) piece(pv, box(alongX ? lw / n - 0.03 : 0.07, h - 0.3, alongX ? 0.07 : lw / n - 0.03), pl, P((i + 0.5) * lw / n, (h - 0.3) / 2 + 0.12));
    for (const y of [0.5, h - 0.5]) piece(pv, box(alongX ? lw : 0.06, 0.16, alongX ? 0.06 : lw), br, P(lw / 2, y, 0.06));
    const dl = Math.hypot(lw, h - 1); piece(pv, box(alongX ? dl : 0.06, 0.14, alongX ? 0.06 : dl), br, P(lw / 2, h / 2, 0.06), alongX ? { rz: Math.atan2(h - 1, lw) } : { rx: Math.atan2(h - 1, lw) });
  });
}
function gateDocks(ctx, x, z, width, alongX, h, opts, along) {
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35));
    add(ctx, cyl(0.3, 0.34, h + 1.0, 8), tar(), px, (h + 1.0) / 2, pz); add(ctx, cyl(0.33, 0.33, 0.1, 8), M.flat(0x4a4038), px, h + 1.0, pz);
    add(ctx, torus(0.3, 0.06), rope(), px, 1.2, pz, { rx: Math.PI / 2 }); add(ctx, torus(0.3, 0.06), rope(), px, 1.34, pz, { rx: Math.PI / 2 });
  }
  const sl = MC.clap('#4a443c'), fr = M.wood('#2e2620');
  return pivotLeaves(ctx, x, z, width, alongX, h, opts, along, (pv, lw, P) => {
    for (const y of [0.3, h / 2, h - 0.3]) piece(pv, box(alongX ? lw : 0.08, 0.14, alongX ? 0.08 : lw), fr, P(lw / 2, y));
    for (let p = 0.1; p < lw; p += 0.22) piece(pv, box(alongX ? 0.12 : 0.05, h - 0.2, alongX ? 0.05 : 0.12), sl, P(p, (h - 0.2) / 2 + 0.05, 0.05));
    for (let y = 0.6; y < h - 0.3; y += 0.18) piece(pv, torus(0.05, 0.015), M.ironLit(), P(lw * 0.85, y, 0.12), alongX ? {} : { ry: Math.PI / 2 }); // the chain
  });
}
function gateNave(ctx, x, z, width, alongX, h, opts, along) {
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35)); const st = M.ashlar('#46505e');
    add(ctx, box(0.66, h + 1.1, 0.66), st, px, (h + 1.1) / 2, pz); add(ctx, cone(0.46, 1.1, 4), M.ashlar('#56606e'), px, h + 1.65, pz, { ry: Math.PI / 4 });
  }
  const b = bronze();
  const arch = new THREE.Mesh(geo(`narch${width}`, () => new THREE.TorusGeometry(width / 2, 0.08, 4, 14, Math.PI)), b); arch.position.set(x, h - 0.1, z); arch.scale.set(1, 0.55, 1); if (!alongX) arch.rotation.y = Math.PI / 2; ctx.group.add(arch);
  return pivotLeaves(ctx, x, z, width, alongX, h, opts, along, (pv, lw, P) => {
    for (let p = 0.08; p < lw; p += 0.16) piece(pv, box(0.04, h - 0.2, 0.04), b, P(p, (h - 0.2) / 2 + 0.05));
    for (const y of [0.25, h * 0.5, h - 0.2]) piece(pv, box(alongX ? lw : 0.06, 0.07, alongX ? 0.06 : lw), b, P(lw / 2, y));
    for (const y of [h * 0.28, h * 0.72]) for (const p of [lw * 0.3, lw * 0.7]) piece(pv, torus(0.16, 0.025), b, P(p, y), alongX ? {} : { ry: Math.PI / 2 }); // quatrefoils
  });
}
function gateUndercroft(ctx, x, z, width, alongX, h, opts, along) {
  // a portcullis that rises into a stone lintel
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35)); add(ctx, box(0.7, h + 1.4, 0.7), M.ashlar('#3e3830'), px, (h + 1.4) / 2, pz);
    for (let k = 0; k < 3; k++) add(ctx, sph(0.13, 1), bone(), px + (alongX ? 0 : 0.36), 0.5 + k * 0.6, pz + (alongX ? 0.36 : 0));
  }
  add(ctx, box(alongX ? width + 1.4 : 0.8, 0.9, alongX ? 0.8 : width + 1.4), M.ashlar('#3a342c'), x, h + 0.95, z);
  add(ctx, sph(0.22, 1), bone(), x + (alongX ? 0 : 0.42), h + 0.95, z + (alongX ? 0.42 : 0));
  const grid = new THREE.Group(); grid.position.set(x, 0, z); ctx.group.add(grid); const ir = M.ironLit();
  for (let p = -width / 2 + 0.12; p < width / 2; p += 0.26) { piece(grid, box(0.06, h, 0.06), ir, [alongX ? p : 0, h / 2, alongX ? 0 : p]); piece(grid, cone(0.06, 0.24, 4), ir, [alongX ? p : 0, -0.06, alongX ? 0 : p], { rx: Math.PI }); }
  for (let y = 0.4; y < h; y += 0.5) piece(grid, box(alongX ? width : 0.06, 0.06, alongX ? 0.06 : width), ir, [0, y, 0]);
  return (k) => { grid.position.y = k * (h - 0.25); };
}
function gateFoundry(ctx, x, z, width, alongX, h, opts, along) {
  // two riveted plates that slide apart on an overhead rail
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35)); add(ctx, box(0.7, h + 1.0, 0.7), MC.redBrick('#5a2e24'), px, (h + 1.0) / 2, pz);
    add(ctx, box(0.78, 0.16, 0.78), steel(), px, h + 1.05, pz);
  }
  add(ctx, box(alongX ? width * 2 + 0.6 : 0.16, 0.18, alongX ? 0.16 : width * 2 + 0.6), steel(), x + (alongX ? 0 : 0.36), h + 0.2, z + (alongX ? 0.36 : 0));
  const plates = []; const pm = MC.plate('#4a403a');
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); ctx.group.add(g); const lw = width / 2;
    piece(g, box(alongX ? lw : 0.12, h, alongX ? 0.12 : lw), pm, [alongX ? s * lw / 2 : 0, h / 2, alongX ? 0 : s * lw / 2]);
    for (const y of [0.4, h / 2, h - 0.3]) piece(g, box(alongX ? lw : 0.16, 0.12, alongX ? 0.16 : lw), steel(), [alongX ? s * lw / 2 : 0, y, alongX ? 0 : s * lw / 2]);
    piece(g, box(alongX ? 0.1 : 0.2, 0.5, alongX ? 0.2 : 0.1), M.flat(0x8a6a1a), [alongX ? s * 0.12 : 0, h / 2, alongX ? 0 : s * 0.12]);
    g.userData.s = s; plates.push(g);
  }
  return (k) => { for (const g of plates) { const o = g.userData.s * k * (width / 2 + 0.1); if (alongX) g.position.x = x + o; else g.position.z = z + o; g.position[alongX ? 'z' : 'x'] = (alongX ? z : x) + k * 0.36; } };
}
function gateHeights(ctx, x, z, width, alongX, h, opts, along) {
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35)); const st = MC.stucco('#d0c8ba');
    add(ctx, box(0.7, h + 0.9, 0.7), st, px, (h + 0.9) / 2, pz); add(ctx, box(0.86, 0.2, 0.86), MC.stucco('#e0d8ca'), px, h + 1.0, pz);
    add(ctx, cyl(0.2, 0.1, 0.4, 8), gold(), px, h + 1.3, pz); add(ctx, sph(0.13, 1), gold(), px, h + 1.6, pz);
  }
  const g = gold();
  const arch = new THREE.Mesh(geo(`harch${width}`, () => new THREE.TorusGeometry(width / 2, 0.05, 4, 16, Math.PI)), g); arch.position.set(x, h + 0.15, z); arch.scale.set(1, 0.5, 1); if (!alongX) arch.rotation.y = Math.PI / 2; ctx.group.add(arch);
  const crown = new THREE.Mesh(sph(0.2, 1), g); crown.position.set(x, h + 0.25 + width * 0.25, z); ctx.group.add(crown);
  return pivotLeaves(ctx, x, z, width, alongX, h, opts, along, (pv, lw, P) => {
    const nb = Math.round(lw / 0.2);
    for (let i = 0; i <= nb; i++) { const p = (i / nb) * lw; const bh = h - 0.2 + Math.sin((i / nb) * Math.PI * 0.5) * 0.25; piece(pv, box(0.045, bh, 0.045), g, P(p, bh / 2 + 0.05)); piece(pv, cone(0.07, 0.22, 4), g, P(p, bh + 0.15), { ry: Math.PI / 4 }); }
    for (const y of [0.3, h * 0.55, h - 0.35]) piece(pv, box(alongX ? lw : 0.05, 0.06, alongX ? 0.05 : lw), g, P(lw / 2, y));
    piece(pv, torus(0.3, 0.035), g, P(lw / 2, h * 0.77), alongX ? {} : { ry: Math.PI / 2 }); piece(pv, sph(0.1, 0), g, P(lw / 2, h * 0.77));
  });
}
function gateBelfry(ctx, x, z, width, alongX, h, opts, along) {
  // a plank barrier hinged at the bottom on one side: it lifts up and back like a drawbridge
  if (opts.piers !== false) for (const s of [-1, 1]) {
    const [px, pz] = along(s * (width / 2 + 0.35)); const pole = M.wood('#5a4430');
    add(ctx, box(0.36, h + 1.4, 0.36), pole, px, (h + 1.4) / 2, pz); add(ctx, box(0.5, 0.14, 0.5), M.wood('#3a2a1c'), px, h + 1.45, pz);
    add(ctx, cyl(0.2, 0.2, 0.3, 8), rope(), px, h + 0.6, pz);
  }
  const pv = new THREE.Group(); pv.position.set(x, 0, z); ctx.group.add(pv); const pl = M.wood('#5a4630'), br = M.wood('#3a2a1c');
  for (let y = 0.15; y < h; y += 0.36) piece(pv, box(alongX ? width : 0.1, 0.32, alongX ? 0.1 : width), pl, [0, y + 0.16, 0]);
  for (const p of [-width / 3, 0, width / 3]) piece(pv, box(alongX ? 0.14 : 0.16, h, alongX ? 0.16 : 0.14), br, [alongX ? p : 0.06, h / 2, alongX ? 0.06 : p]);
  for (const s of [-1, 1]) rodMesh(pv, [alongX ? s * width / 2 : 0, h, alongX ? 0 : s * width / 2], [alongX ? s * (width / 2 + 0.35) : 0, h + 1.2, alongX ? 0 : s * (width / 2 + 0.35)], 0.04);
  return (k) => { if (alongX) pv.rotation.x = -k * 1.45; else pv.rotation.z = k * 1.45; };
}
function rodMesh(parent, a, b, t) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); const m = new THREE.Mesh(box(t, L, t), rope()); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L)); parent.add(m); }

// ================================================================= lamps (visuals; kit.js adds the solid and the light)
function lampMarket(ctx, x, z, h, color) {
  const post = M.wood('#3e2818');
  add(ctx, box(0.42, 0.3, 0.42), M.wood('#2e1e14'), x, 0.15, z); add(ctx, box(0.16, h + 0.4, 0.16), post, x, (h + 0.4) / 2, z);
  add(ctx, box(0.9, 0.1, 0.1), post, x + 0.4, h + 0.3, z); rod(ctx, 'mkl-brace', post, [x, h - 0.3, z], [x + 0.55, h + 0.28, z], 0.06);
  add(ctx, box(0.02, 0.3, 0.02), rope(), x + 0.75, h + 0.12, z, { cast: false });
  add(ctx, cyl(0.2, 0.2, 0.44, 8), M.glow(new THREE.Color(color).getStyle(), 2.2), x + 0.75, h - 0.24, z, { cast: false });
  for (const y of [-0.02, -0.46]) add(ctx, cyl(0.21, 0.21, 0.04, 8), M.flat(0x2a1a10), x + 0.75, h + y, z);
  return { lx: x + 0.75, ly: h - 0.24, lz: z };
}
function lampDocks(ctx, x, z, h, color) {
  add(ctx, cyl(0.16, 0.2, h + 0.3, 7), tar(), x, (h + 0.3) / 2, z);
  add(ctx, torus(0.18, 0.05), rope(), x, 1.1, z, { rx: Math.PI / 2 });
  // a davit: a bent iron arm with the ship's lantern hanging from it
  add(ctx, box(0.06, 0.06, 0.7), M.ironLit(), x, h + 0.28, z + 0.32); add(ctx, box(0.06, 0.3, 0.06), M.ironLit(), x, h + 0.14, z + 0.66);
  add(ctx, box(0.24, 0.3, 0.24), M.glow(new THREE.Color(color).getStyle(), 2.4), x, h - 0.18, z + 0.66, { cast: false });
  add(ctx, box(0.3, 0.06, 0.3), M.flat(0x2a3028), x, h - 0.02, z + 0.66); add(ctx, box(0.3, 0.05, 0.3), M.flat(0x2a3028), x, h - 0.35, z + 0.66);
  add(ctx, torus(0.07, 0.015), M.ironLit(), x, h + 0.05, z + 0.66);
  return { lx: x, ly: h - 0.18, lz: z + 0.66 };
}
function lampNave(ctx, x, z, h, color) {
  const ir = M.ironLit(); add(ctx, cyl(0.32, 0.4, 0.2, 6), ir, x, 0.1, z); add(ctx, cyl(0.05, 0.07, h - 0.4, 6), ir, x, h / 2 - 0.1, z);
  add(ctx, cyl(0.42, 0.3, 0.08, 8), ir, x, h - 0.4, z);
  for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const cx = x + Math.cos(a) * 0.3, cz = z + Math.sin(a) * 0.3, ch = 0.2 + (k % 2) * 0.12;
    add(ctx, cyl(0.04, 0.04, ch, 5), flatM(0xd8d2c0), cx, h - 0.36 + ch / 2, cz); add(ctx, box(0.04, 0.07, 0.04), M.glow(new THREE.Color(color).getStyle(), 2.6), cx, h - 0.3 + ch, cz, { cast: false }); }
  return { lx: x, ly: h - 0.05, lz: z };
}
function lampUndercroft(ctx, x, z, h, color) {
  const hh = Math.min(h, 1.9);
  add(ctx, box(0.5, hh, 0.5), M.ashlar('#3e3830'), x, hh / 2, z);
  for (const [ox, oz, y] of [[-0.1, -0.1, 0], [0.12, -0.06, 0], [0, 0.12, 0], [0, 0, 0.18]]) add(ctx, sph(0.13, 1), bone(), x + ox, hh + 0.12 + y, z + oz);
  for (const [ox, oz] of [[0.2, 0.2], [-0.18, 0.22], [0.22, -0.16]]) { add(ctx, cyl(0.035, 0.035, 0.22, 5), flatM(0xd8cca8), x + ox, hh + 0.11, z + oz); add(ctx, box(0.035, 0.06, 0.035), M.glow(new THREE.Color(color).getStyle(), 2.6), x + ox, hh + 0.26, z + oz, { cast: false }); }
  return { lx: x, ly: hh + 0.4, lz: z };
}
function lampFoundry(ctx, x, z, h, color) {
  add(ctx, box(0.5, 0.12, 0.5), steel(), x, 0.06, z);
  add(ctx, box(0.08, h + 0.3, 0.22), steel(), x, (h + 0.3) / 2, z); add(ctx, box(0.22, h + 0.3, 0.06), steel(), x, (h + 0.3) / 2, z);
  add(ctx, box(0.06, 0.08, 0.9), steel(), x, h + 0.3, z + 0.4);
  // a caged factory lamp under a shade
  add(ctx, cone(0.32, 0.22, 8), M.flat(0x2a2a26), x, h + 0.12, z + 0.8); add(ctx, sph(0.13, 1), M.glow(new THREE.Color(color).getStyle(), 2.8), x, h - 0.06, z + 0.8, { cast: false });
  for (let k = 0; k < 4; k++) add(ctx, box(0.02, 0.24, 0.02), M.ironLit(), x + Math.cos(k * 1.57) * 0.15, h - 0.06, z + 0.8 + Math.sin(k * 1.57) * 0.15);
  return { lx: x, ly: h - 0.1, lz: z + 0.8 };
}
function lampHeights(ctx, x, z, h, color) {
  const g = gold(); const st = MC.stucco('#d0c8ba');
  add(ctx, box(0.5, 0.5, 0.5), st, x, 0.25, z); add(ctx, cyl(0.07, 0.1, h + 0.2, 8), M.flat(0x1e1c26), x, (h + 0.2) / 2 + 0.3, z);
  for (const y of [0.6, h * 0.6]) add(ctx, cyl(0.12, 0.12, 0.08, 8), g, x, y, z);
  const c = new THREE.Color(color).getStyle();
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.5; const lx = x + Math.cos(a) * 0.45, lz = z + Math.sin(a) * 0.45;
    rod(ctx, 'hhl-arm', g, [x, h + 0.3, z], [lx, h + 0.5, lz], 0.04);
    add(ctx, box(0.2, 0.3, 0.2), M.glow(c, 2.4), lx, h + 0.66, lz, { cast: false }); add(ctx, cone(0.18, 0.2, 4), g, lx, h + 0.92, lz, { ry: Math.PI / 4 }); }
  add(ctx, sph(0.1, 0), g, x, h + 0.9, z);
  return { lx: x, ly: h + 0.66, lz: z };
}
function lampBelfry(ctx, x, z, h, color) {
  const pole = M.wood('#6a5236');
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; rod(ctx, 'bfl-leg', pole, [x + Math.cos(a) * 0.5, 0, z + Math.sin(a) * 0.5], [x, h + 0.3, z], 0.07); }
  add(ctx, cyl(0.1, 0.1, 0.14, 6), rope(), x, h + 0.22, z);
  add(ctx, box(0.02, 0.4, 0.02), rope(), x, h - 0.02, z, { cast: false });
  add(ctx, box(0.24, 0.32, 0.24), M.glow(new THREE.Color(color).getStyle(), 2.4), x, h - 0.38, z, { cast: false });
  add(ctx, cone(0.2, 0.16, 4), M.flat(0x1a1c20), x, h - 0.14, z, { ry: Math.PI / 4 }); add(ctx, box(0.28, 0.05, 0.28), M.flat(0x1a1c20), x, h - 0.56, z);
  return { lx: x, ly: h - 0.38, lz: z };
}

// ================================================================= torches (wall lights)
function torchStyled(ctx, x, y, z, face, style) {
  const fx = face === '+x' ? 1 : 0, fz = face === '+z' ? 1 : 0; const c = new THREE.Color(LIGHT[style]).getStyle();
  const ox = (d) => x + fx * d, oz = (d) => z + fz * d;
  if (style === 'market') { // a paper lantern hung from a carved bracket
    add(ctx, box(0.1 + fx * 0.6, 0.08, 0.1 + fz * 0.6), M.wood('#3e2818'), ox(0.3), y + 0.5, oz(0.3));
    add(ctx, cyl(0.17, 0.17, 0.4, 8), M.glow(c, 2.2), ox(0.55), y + 0.1, oz(0.55), { cast: false });
    add(ctx, cyl(0.18, 0.18, 0.04, 8), M.flat(0x2a1a10), ox(0.55), y + 0.32, oz(0.55));
  } else if (style === 'docks') { // a bulkhead lamp behind a wire guard
    add(ctx, box(0.2 + fx * 0.06, 0.3, 0.2 + fz * 0.06), M.flat(0x2a3028), ox(0.04), y + 0.3, oz(0.04));
    add(ctx, box(0.12 + fx * 0.1, 0.18, 0.12 + fz * 0.1), M.glow(c, 2.4), ox(0.12), y + 0.3, oz(0.12), { cast: false });
  } else if (style === 'foundry') {
    add(ctx, box(0.06 + fx * 0.6, 0.06, 0.06 + fz * 0.6), steel(), ox(0.3), y + 0.4, oz(0.3));
    add(ctx, cone(0.24, 0.18, 8), M.flat(0x2a2a26), ox(0.6), y + 0.32, oz(0.6)); add(ctx, sph(0.1, 1), M.glow(c, 2.8), ox(0.6), y + 0.18, oz(0.6), { cast: false });
  } else if (style === 'heights') { // a gilt sconce with a glass shade
    add(ctx, box(0.2 + fx * 0.04, 0.5, 0.2 + fz * 0.04), gold(), ox(0.02), y + 0.2, oz(0.02));
    add(ctx, box(0.06 + fx * 0.3, 0.05, 0.06 + fz * 0.3), gold(), ox(0.18), y + 0.3, oz(0.18));
    add(ctx, cyl(0.1, 0.14, 0.28, 6), M.glow(c, 2.2), ox(0.36), y + 0.5, oz(0.36), { cast: false });
  } else return false;
  ctx.lights.push({ x: ox(0.8), y: y + 0.4, z: oz(0.8), color: LIGHT[style], intensity: 4.4, dist: 6.5, halo: true, flicker: style === 'market' ? 0.12 : 0.03 });
  return true;
}

// ================================================================= walls (visuals; kit.js keeps the solid)
function wallStyled(ctx, cx, cz, W, D, h, alongX, len, face, opts, style) {
  const t = alongX ? D : W;
  if (style === 'market') {
    add(ctx, box(W, h, D), MC.timber('#b0905e'), cx, h / 2, cz);
    add(ctx, box(W + 0.1, 0.5, D + 0.1), MC.herring('#5a3a2c'), cx, 0.25, cz);
    add(ctx, box(W + 0.4, 0.14, D + 0.4), MC.tiles('#7a3e2a'), cx, h + 0.07, cz); // a little tiled coping
    return true;
  }
  if (style === 'docks') {
    add(ctx, box(W, h, D), MC.clap('#3e3a34'), cx, h / 2, cz);
    add(ctx, box(W + 0.12, 0.9, D + 0.12), MC.sea('#4a5450'), cx, 0.45, cz);
    if (opts.cap !== false) add(ctx, box(W + 0.16, 0.12, D + 0.16), M.wood('#2e2620'), cx, h + 0.06, cz);
    const n = Math.max(1, Math.floor(len / 2.2));
    for (let i = 0; i <= n; i++) { const p = -len / 2 + i * len / n; const [px, pz] = alongX ? [cx + p, cz + face * (t / 2 + 0.1)] : [cx + face * (t / 2 + 0.1), cz + p]; inst(ctx, 'dkw-post', box(0.2, h + 0.2, 0.2), tar(), mat4(px, (h + 0.2) / 2, pz)); }
    return true;
  }
  if (style === 'foundry') {
    add(ctx, box(W, h, D), MC.redBrick('#6a3426'), cx, h / 2, cz);
    add(ctx, box(W + 0.12, 0.5, D + 0.12), MC.redBrick('#3a2a2c'), cx, 0.25, cz);
    if (opts.cap !== false) add(ctx, box(W + 0.18, 0.16, D + 0.18), steel(), cx, h + 0.08, cz);
    // brick pilasters with iron tie plates
    const n = Math.max(1, Math.floor(len / 3));
    for (let i = 0; i <= n; i++) { const p = -len / 2 + i * len / n; const [px, pz] = alongX ? [cx + p, cz + face * (t / 2 + 0.15)] : [cx + face * (t / 2 + 0.15), cz + p];
      inst(ctx, 'fdw-pil', box(0.4, h, 0.4), MC.redBrick('#5e2e22'), mat4(px, h / 2, pz)); inst(ctx, 'fdw-tie', cyl(0.12, 0.12, 0.05, 6), steel(), mat4(px + (alongX ? 0 : face * 0.21), h * 0.7, pz + (alongX ? face * 0.21 : 0), 0, alongX ? Math.PI / 2 : 0, alongX ? 0 : Math.PI / 2)); }
    return true;
  }
  if (style === 'heights') {
    add(ctx, box(W, h, D), MC.stucco('#c4bcae'), cx, h / 2, cz);
    add(ctx, box(W + 0.14, 0.7, D + 0.14), M.ashlar('#8a8478'), cx, 0.35, cz);
    if (opts.cap !== false) { add(ctx, box(W + 0.24, 0.18, D + 0.24), MC.stucco('#ddd5c7'), cx, h + 0.09, cz); add(ctx, box(W + 0.26, 0.05, D + 0.26), gold(), cx, h - 0.2, cz); }
    const n = Math.max(1, Math.floor(len / 2.6));
    for (let i = 0; i <= n; i++) { const p = -len / 2 + i * len / n; const [px, pz] = alongX ? [cx + p, cz + face * (t / 2 + 0.08)] : [cx + face * (t / 2 + 0.08), cz + p];
      inst(ctx, 'hhw-pil', box(0.36, h, 0.36), MC.stucco('#d4ccbe'), mat4(px, h / 2, pz)); inst(ctx, 'hhw-urn', cyl(0.14, 0.07, 0.3, 8), gold(), mat4(px, h + 0.33, pz)); }
    return true;
  }
  return false;
}

// ================================================================= houses (visuals; kit.js keeps the solid)
function windowsOn(ctx, x, z, w, d, y0, floors, gap, lit, decal, dw, dh, skipDoor) {
  const r = T.rng(Math.round(x * 13 + z * 7 + y0 * 3));
  for (let f = 0; f < floors; f++) { const y = y0 + f * gap;
    for (const side of ['x', 'z']) { const len = side === 'x' ? d : w; const n = Math.max(1, Math.floor(len / 1.8));
      for (let i = 0; i < n; i++) { if (f === 0 && skipDoor === side && i === Math.floor(n / 2)) continue; const p = -len / 2 + (i + 0.5) * (len / n); const isLit = r() < lit; const m = decal(isLit);
        if (side === 'x') add(ctx, plane(dw, dh), m, x + w / 2 + 0.02, y, z + p, { ry: Math.PI / 2, cast: false }); else add(ctx, plane(dw, dh), m, x + p, y, z + d / 2 + 0.02, { cast: false });
        if (isLit && f === 0 && r() < 0.4) ctx.lights.push({ x: side === 'x' ? x + w / 2 + 0.6 : x + p, y, z: side === 'x' ? z + p : z + d / 2 + 0.6, color: 0xffa040, intensity: 1.1, dist: 3.2 }); } } }
}
function doorOn(ctx, x, z, w, d, side, tone) { if (side === 'z') add(ctx, plane(1, 2), M.decal(T.door(tone)), x, 1.0, z + d / 2 + 0.03, { cast: false }); else add(ctx, plane(1, 2), M.decal(T.door(tone)), x + w / 2 + 0.03, 1.0, z, { ry: Math.PI / 2, cast: false }); }
const PLASTERS = ['#b89a70', '#a8805a', '#c0a882', '#9a6a4a', '#b48a64'];
function houseMarket(ctx, x, z, w, d, h, opts) {
  // a jettied timber-framed house: brick ground floor, each upper floor oversailing the street
  const r = T.rng(Math.round(x * 31 + z * 11)); const pl = PLASTERS[(r() * PLASTERS.length) | 0];
  const g0 = Math.min(2.6, h * 0.5); add(ctx, box(w, g0, d), MC.herring('#6a4232'), x, g0 / 2, z);
  const floors = Math.max(1, Math.round((h - g0) / 2.2)); const fh = (h - g0) / floors; let ow = w, od = d, ox = x, oz = z;
  for (let f = 0; f < floors; f++) {
    const jut = 0.35; ow += jut; od += jut; ox += jut / 2; oz += jut / 2; // oversail toward the street (+x, +z)
    const y0 = g0 + f * fh; add(ctx, box(ow, fh, od), MC.timber(pl), ox, y0 + fh / 2, oz);
    add(ctx, box(ow + 0.06, 0.16, od + 0.06), M.wood('#3a2618'), ox, y0 + 0.08, oz); // the jetty beam
    for (const [jx, jz] of [[ox + ow / 2 - 0.1, oz + od / 2 - 0.1], [ox + ow / 2 - 0.1, oz - od / 2 + 0.3], [ox - ow / 2 + 0.3, oz + od / 2 - 0.1]]) rod(ctx, 'mkh-strut', M.wood('#3a2618'), [jx - jut * 0.5, y0 - 0.6, jz - jut * 0.5], [jx, y0, jz], 0.08);
  }
  const rh = opts.roofH || Math.min(ow, od) * 0.85; const ridgeX = opts.ridge ? opts.ridge === 'x' : w >= d;
  roofTiled(ctx, ox, h, oz, ow + 0.5, od + 0.5, rh, ridgeX, opts.roofTone || ['#7a3e2a', '#6a4a2a', '#8a4a30'][(r() * 3) | 0], MC.timber(pl));
  windowsOn(ctx, ox, oz, ow, od, g0 + fh * 0.55, floors, fh, opts.lit ?? 0.55, (lit) => M.decal(T.houseWindow(lit), lit ? 1.8 : 0), 0.5, 0.62);
  windowsOn(ctx, x, z, w, d, 1.5, 1, 1, Math.min(1, (opts.lit ?? 0.5) + 0.2), (lit) => M.decal(T.houseWindow(lit), lit ? 1.6 : 0), 0.7, 0.62, opts.doorSide || 'z');
  doorOn(ctx, x, z, w, d, opts.doorSide || 'z', '#4a2a1a');
  if (opts.chimney !== false) add(ctx, box(0.5, 1.4, 0.5), MC.herring('#5a3a2c'), x - w * 0.25, h + rh * 0.6, z - d * 0.2);
  return true;
}
function roofTiled(ctx, x, y, z, w, d, rh, ridgeX, tone, gableMat) {
  const span = ridgeX ? d : w, len = ridgeX ? w : d; const half = span / 2, slope = Math.hypot(half, rh), ang = Math.atan2(rh, half); const mat = MC.tiles(tone);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(box(ridgeX ? len : slope, 0.16, ridgeX ? slope : len), mat);
    if (ridgeX) { m.position.set(x, y + rh / 2, z + s * half / 2); m.rotation.x = s * ang; } else { m.position.set(x + s * half / 2, y + rh / 2, z); m.rotation.z = -s * ang; }
    m.castShadow = m.receiveShadow = true; m.userData.static = true; ctx.group.add(m); }
  add(ctx, box(ridgeX ? len : 0.24, 0.18, ridgeX ? 0.24 : len), MC.tiles('#4a2a1e'), x, y + rh + 0.03, z);
  const shape = new THREE.Shape(); const sp = span - 0.5, h2 = rh * sp / span; shape.moveTo(-sp / 2, 0); shape.lineTo(sp / 2, 0); shape.lineTo(0, h2); shape.lineTo(-sp / 2, 0);
  const g = geo(`mgab${sp},${h2}`, () => new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false }));
  for (const s of [-1, 1]) { const m = new THREE.Mesh(g, gableMat); m.castShadow = m.receiveShadow = true; m.userData.static = true;
    if (ridgeX) { m.position.set(x + s * ((len - 0.5) / 2) - (s > 0 ? 0.3 : 0), y, z); m.rotation.y = Math.PI / 2; } else m.position.set(x, y, z + s * ((len - 0.5) / 2) - (s > 0 ? 0.3 : 0)); ctx.group.add(m); }
}
function houseDocks(ctx, x, z, w, d, h, opts) {
  // a clapboard shed on a stone foot under a shallow corrugated roof, a loft door with its hoist
  add(ctx, box(w, h, d), MC.clap(opts.plaster ? '#4a463e' : '#3a3630'), x, h / 2, z);
  add(ctx, box(w + 0.12, 0.8, d + 0.12), MC.sea('#4a5450'), x, 0.4, z);
  for (const [cx, cz] of [[x + w / 2, z + d / 2], [x + w / 2, z - d / 2], [x - w / 2, z + d / 2]]) add(ctx, box(0.22, h, 0.22), tar(), cx, h / 2, cz);
  const ridgeX = opts.ridge ? opts.ridge === 'x' : w >= d; const rh = Math.min(w, d) * 0.28;
  const span = ridgeX ? d : w, len = ridgeX ? w : d, half = span / 2 + 0.3, slope = Math.hypot(half, rh), ang = Math.atan2(rh, half);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(box(ridgeX ? len + 0.4 : slope, 0.1, ridgeX ? slope : len + 0.4), MC.corr('#5a4a3e')); if (ridgeX) { m.position.set(x, h + rh / 2, z + s * half / 2); m.rotation.x = s * ang; } else { m.position.set(x + s * half / 2, h + rh / 2, z); m.rotation.z = -s * ang; } m.castShadow = m.receiveShadow = true; m.userData.static = true; ctx.group.add(m); }
  for (const s of [-1, 1]) { const shp = new THREE.Shape(); shp.moveTo(-span / 2, 0); shp.lineTo(span / 2, 0); shp.lineTo(0, rh); shp.lineTo(-span / 2, 0); const g = geo(`dgab${span},${rh}`, () => new THREE.ExtrudeGeometry(shp, { depth: 0.2, bevelEnabled: false })); const m = new THREE.Mesh(g, MC.clap('#3a3630')); m.userData.static = true; m.castShadow = true;
    if (ridgeX) { m.position.set(x + s * (w / 2) - (s > 0 ? 0.2 : 0), h, z); m.rotation.y = Math.PI / 2; } else m.position.set(x, h, z + s * (d / 2) - (s > 0 ? 0.2 : 0)); ctx.group.add(m); }
  const ds = opts.doorSide || 'z';
  // big sliding cargo door and a loft door with a hoist beam above it
  if (ds === 'z') { add(ctx, box(Math.min(2.2, w * 0.5), Math.min(2.6, h - 0.6), 0.08), M.wood('#3a2c22'), x, Math.min(2.6, h - 0.6) / 2, z + d / 2 + 0.05); if (h > 4) { add(ctx, box(0.9, 1.2, 0.06), M.wood('#2e2620'), x, h - 1.0, z + d / 2 + 0.04); add(ctx, box(0.14, 0.14, 1.0), M.wood('#2e2620'), x, h - 0.2, z + d / 2 + 0.5); } }
  else { add(ctx, box(0.08, Math.min(2.6, h - 0.6), Math.min(2.2, d * 0.5)), M.wood('#3a2c22'), x + w / 2 + 0.05, Math.min(2.6, h - 0.6) / 2, z); if (h > 4) { add(ctx, box(0.06, 1.2, 0.9), M.wood('#2e2620'), x + w / 2 + 0.04, h - 1.0, z); add(ctx, box(1.0, 0.14, 0.14), M.wood('#2e2620'), x + w / 2 + 0.5, h - 0.2, z); } }
  windowsOn(ctx, x, z, w, d, 1.7, 1, 1, opts.lit ?? 0.3, (lit) => M.decal(T.houseWindow(lit), lit ? 1.6 : 0), 0.5, 0.5, ds);
  return true;
}
function houseFoundry(ctx, x, z, w, d, h, opts) {
  // a red-brick works shed under a sawtooth roof (glazed north lights)
  add(ctx, box(w, h, d), MC.redBrick('#6a3426'), x, h / 2, z); add(ctx, box(w + 0.12, 0.6, d + 0.12), MC.redBrick('#3a2a2c'), x, 0.3, z);
  const ridgeX = w >= d; const len = ridgeX ? w : d, span = ridgeX ? d : w; const n = Math.max(1, Math.round(len / 2.6)), tw = len / n, th = 1.1;
  for (let i = 0; i < n; i++) { const p = -len / 2 + (i + 0.5) * tw; const sl = Math.hypot(tw, th), ang = Math.atan2(th, tw);
    const m = new THREE.Mesh(box(ridgeX ? sl : span + 0.3, 0.1, ridgeX ? span + 0.3 : sl), MC.corr('#3e3632')); if (ridgeX) { m.position.set(x + p, h + th / 2, z); m.rotation.z = ang; } else { m.position.set(x, h + th / 2, z + p); m.rotation.x = -ang; } m.castShadow = m.receiveShadow = true; m.userData.static = true; ctx.group.add(m);
    const glass = M.glow('#ffa050', 0.9); if (ridgeX) add(ctx, box(0.06, th, span), glass, x + p + tw / 2 - 0.03, h + th / 2, z, { cast: false }); else add(ctx, box(span, th, 0.06), glass, x, h + th / 2, z + p + tw / 2 - 0.03, { cast: false }); }
  windowsOn(ctx, x, z, w, d, 1.8, Math.max(1, Math.floor((h - 1) / 2.4)), 2.4, opts.lit ?? 0.6, (lit) => M.decal(T.lancet(lit, 10, 18), lit ? 1.4 : 0), 0.6, 1.1, opts.doorSide || 'z');
  doorOn(ctx, x, z, w, d, opts.doorSide || 'z', '#2a2420');
  if (opts.chimney !== false) { add(ctx, cyl(0.35, 0.45, 4, 8), MC.redBrick('#4a2a22'), x - w * 0.3, h + 2, z - d * 0.25); add(ctx, cyl(0.42, 0.42, 0.2, 8), steel(), x - w * 0.3, h + 4, z - d * 0.25); }
  return true;
}
function houseHeights(ctx, x, z, w, d, h, opts) {
  // a stucco town palace: rusticated base, tall windows with gilt sills, a mansard over a cornice
  add(ctx, box(w, h, d), MC.stucco(opts.plaster ? '#b8b0a2' : '#c4bcae'), x, h / 2, z); add(ctx, box(w + 0.14, 1.0, d + 0.14), M.ashlar('#8a8478'), x, 0.5, z);
  add(ctx, box(w + 0.4, 0.26, d + 0.4), MC.stucco('#ddd5c7'), x, h + 0.13, z); add(ctx, box(w + 0.42, 0.05, d + 0.42), gold(), x, h - 0.05, z);
  const mh = Math.min(2, Math.min(w, d) * 0.4); const mm = M.slate('#2a2838');
  add(ctx, geo(`mans${w},${d},${mh}`, () => { const g = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2 * 1.0, 1, 4, 1); g.rotateY(Math.PI / 4); return g; }), mm, x, h + 0.26 + mh / 2, z, { s: new THREE.Vector3(w + 0.1, mh, d + 0.1) });
  add(ctx, box(w * 0.7, 0.5, d * 0.7), mm, x, h + 0.26 + mh + 0.25, z);
  for (let p = -w * 0.3; p <= w * 0.3 + 0.01; p += 0.45) inst(ctx, 'hhh-crest', cone(0.04, 0.3, 4), gold(), mat4(x + p, h + mh + 0.9, z));
  windowsOn(ctx, x, z, w, d, 2.0, Math.max(1, Math.floor((h - 1) / 2.4)), 2.4, opts.lit ?? 0.5, (lit) => M.decal(T.lancet(lit, 10, 22), lit ? 1.5 : 0), 0.62, 1.4, opts.doorSide || 'z');
  doorOn(ctx, x, z, w, d, opts.doorSide || 'z', '#2a1e18');
  return true;
}

// ================================================================= the registry
const STY = {
  market: { fence: fenceMarket, gate: gateMarket, lamp: lampMarket, house: houseMarket },
  docks: { fence: fenceDocks, gate: gateDocks, lamp: lampDocks, house: houseDocks },
  nave: { fence: fenceNave, gate: gateNave, lamp: lampNave },
  undercroft: { fence: fenceUndercroft, gate: gateUndercroft, lamp: lampUndercroft },
  foundry: { fence: fenceFoundry, gate: gateFoundry, lamp: lampFoundry, house: houseFoundry },
  heights: { fence: fenceHeights, gate: gateHeights, lamp: lampHeights, house: houseHeights },
  belfry: { fence: fenceBelfry, gate: gateBelfry, lamp: lampBelfry },
};
// The styled version of a kit piece for the current district, or null (kit.js draws its own).
export function styled(ctx, part) { const s = ctx.style && STY[ctx.style]; return (s && s[part]) || null; }
export function styledTorch(ctx, x, y, z, face) { return ctx.style && ctx.style !== 'gate' ? torchStyled(ctx, x, y, z, face, ctx.style) : false; }
export function styledWall(ctx, cx, cz, W, D, h, alongX, len, face, opts) { return ctx.style ? wallStyled(ctx, cx, cz, W, D, h, alongX, len, face, opts, ctx.style) : false; }
export function buttressMat(ctx) { return { market: M.wood('#3a2618'), docks: M.wood('#2a2420'), foundry: MC.redBrick('#5e2e22'), heights: MC.stucco('#d4ccbe') }[ctx.style] || M.ashlar('#3a4454'); }
