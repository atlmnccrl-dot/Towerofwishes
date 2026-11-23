// Gallows Gate's own pieces: the gaol along the lane (cell blocks of rough prison stone with barred
// windows and iron-studded doors, a crenellated parapet), the gaol's watchtower with its timber hoarding
// and beacon (the district's landmark, seen from the courtyard and the gallows square), gibbet cages
// hanging over the lane, and standing cages on the square.
import * as THREE from '../../../vendor/three.module.min.js';
import { add, box, cyl, cone, plane, geo, inst, mat4, solid, solidCircle, roof } from '../kit.js';
import { M } from '../../engine/materials.js';
import { MC } from '../kit_city.js';
import * as T from '../../engine/textures.js';

const STONE = '#3c4048';
const iron = () => M.ironLit();

// A barred window: a black recess, a stone sill and lintel, four iron bars and a cross bar.
// face: '+x' or '+z' (the wall it sits on faces that way); (x, z) on the wall's surface.
function barred(ctx, x, y, z, face, w = 0.6, h = 0.8) {
  const fx = face === '+x'; const o = (d) => fx ? [x + d, z] : [x, z + d];
  { const [px, pz] = o(0.01); add(ctx, plane(w, h), M.flat(0x07080b), px, y, pz, { ry: fx ? Math.PI / 2 : 0, cast: false }); }
  for (const [dy, hh] of [[-h / 2 - 0.07, 0.14], [h / 2 + 0.07, 0.14]]) { const [px, pz] = o(0.06); add(ctx, box(fx ? 0.14 : w + 0.24, hh, fx ? w + 0.24 : 0.14), M.ashlar('#4c5058'), px, y + dy, pz); }
  for (let i = 0; i < 4; i++) { const u = -w / 2 + (i + 0.5) * w / 4; const [px, pz] = fx ? [x + 0.06, z + u] : [x + u, z + 0.06]; inst(ctx, 'gt-bar', box(0.04, h, 0.04), iron(), mat4(px, y, pz)); }
  { const [px, pz] = o(0.06); inst(ctx, 'gt-xbar', box(fx ? 0.04 : w, 0.04, fx ? w : 0.04), iron(), mat4(px, y + h * 0.15, pz)); }
}

// A cell block (front toward +x or +z): prison stone, two storeys of barred slits, an iron-studded door
// under a stone arch, a parapet of merlons. Same footprint and solid as a K.house of that size.
export function cellBlock(ctx, x, z, w, d, h, opts = {}) {
  const front = opts.front || '+x', fx = front === '+x';
  const wallM = MC.gaol(opts.tone || STONE);
  add(ctx, box(w, h, d), wallM, x, h / 2, z);
  add(ctx, box(w + 0.2, 0.8, d + 0.2), M.ashlar('#34383f'), x, 0.4, z);
  solid(ctx, x - w / 2, z - d / 2, x + w / 2, z + d / 2, h);
  // parapet: a walk wall and merlons
  add(ctx, box(w + 0.3, 0.3, d + 0.3), M.ashlar('#474b53'), x, h + 0.15, z);
  for (const [len, ax, cx, cz] of [[w, 'x', x, z + d / 2], [w, 'x', x, z - d / 2], [d, 'z', x + w / 2, z], [d, 'z', x - w / 2, z]]) {
    const n = Math.max(2, Math.round(len / 0.9));
    for (let i = 0; i < n; i++) { const u = -len / 2 + (i + 0.5) * len / n; if (i % 2) continue; inst(ctx, 'gt-merlon', box(0.5, 0.6, 0.5), M.ashlar('#474b53'), mat4(ax === 'x' ? cx + u : cx, h + 0.6, ax === 'x' ? cz : cz + u)); }
  }
  // the barred windows, two rows, on both faces toward the camera
  const rows = Math.max(1, Math.floor((h - 1.2) / 2.2));
  for (const side of ['+x', '+z']) {
    const len = side === '+x' ? d : w, n = Math.max(1, Math.floor(len / 1.6));
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
      const u = -len / 2 + (i + 0.5) * len / n; if (r === 0 && side === front && i === Math.floor(n / 2)) continue;
      const y = 2.0 + r * 2.2; if (side === '+x') barred(ctx, x + w / 2, y, z + u, '+x', 0.42, 0.7); else barred(ctx, x + u, y, z + d / 2, '+z', 0.42, 0.7);
    }
  }
  // the door: oak, banded and studded, under a heavy round arch
  const [dx, dz] = fx ? [x + w / 2, z] : [x, z + d / 2];
  add(ctx, plane(1.1, 2.1), M.decal(T.door('#2a2018')), dx + (fx ? 0.03 : 0), 1.05, dz + (fx ? 0 : 0.03), { ry: fx ? Math.PI / 2 : 0, cast: false });
  for (const y of [0.5, 1.1, 1.7]) add(ctx, box(fx ? 0.04 : 1.1, 0.06, fx ? 1.1 : 0.04), iron(), dx + (fx ? 0.05 : 0), y, dz + (fx ? 0 : 0.05));
  for (const s of [-1, 1]) add(ctx, box(fx ? 0.3 : 0.32, 2.5, fx ? 0.32 : 0.3), M.ashlar('#4c5058'), dx + (fx ? 0.12 : s * 0.72), 1.25, dz + (fx ? s * 0.72 : 0.12));
  add(ctx, box(fx ? 0.34 : 1.8, 0.4, fx ? 1.8 : 0.34), M.ashlar('#4c5058'), dx + (fx ? 0.13 : 0), 2.6, dz + (fx ? 0 : 0.13));
  // a ring of keys painted over the door (the Gaoler's mark) and a chain hanging by it
  add(ctx, geo('gt-keyring', () => new THREE.TorusGeometry(0.22, 0.03, 4, 12)), M.flat(0x8a7040), dx + (fx ? 0.04 : 0), 3.2, dz + (fx ? 0 : 0.04), { ry: fx ? Math.PI / 2 : 0 });
  if (opts.lamp !== false) { const [lx, lz] = fx ? [dx + 0.3, dz + 1.2] : [dx + 1.2, dz + 0.3]; add(ctx, box(0.22, 0.3, 0.22), M.glow('#ffb45a', 2.2), lx, 2.5, lz, { cast: false }); ctx.lights.push({ x: lx + (fx ? 0.4 : 0), y: 2.4, z: lz + (fx ? 0 : 0.4), color: 0xffa040, intensity: 3, dist: 5, halo: true, flicker: 0.05 }); }
}

// The gaol's watchtower: a tall square tower of prison stone with arrow slits, a corbelled timber
// hoarding on top under a slate pyramid, and a beacon burning in the hoarding. The landmark.
export function watchtower(ctx, x, z, w = 4.4, H = 12) {
  const wallM = MC.gaol(STONE);
  add(ctx, box(w, H, w), wallM, x, H / 2, z);
  add(ctx, box(w + 0.3, 1.0, w + 0.3), M.ashlar('#34383f'), x, 0.5, z);
  solid(ctx, x - w / 2, z - w / 2, x + w / 2, z + w / 2, H);
  for (let y = 3; y < H - 1.5; y += 2.6) { barred(ctx, x + w / 2, y, z, '+x', 0.22, 0.9); barred(ctx, x, y, z + w / 2, '+z', 0.22, 0.9); }
  // corbels and the hoarding
  for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) { inst(ctx, 'gt-corbel', box(0.3, 0.5, 0.5), M.ashlar('#474b53'), mat4(x + i * w / 5, H - 0.25, z + s * (w / 2 + 0.2))); inst(ctx, 'gt-corbel', box(0.5, 0.5, 0.3), M.ashlar('#474b53'), mat4(x + s * (w / 2 + 0.2), H - 0.25, z + i * w / 5)); }
  const hw = w + 1.0, hh = 2.4;
  add(ctx, box(hw, 0.3, hw), M.wood('#3a2a1e'), x, H + 0.15, z);
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [1, 0], [0, -1], [-1, 0]]) add(ctx, box(0.24, hh, 0.24), M.wood('#3a2a1e'), x + ox * hw / 2, H + 0.3 + hh / 2, z + oz * hw / 2);
  for (const [ox, oz, sw, sd] of [[0, 1, hw, 0.1], [1, 0, 0.1, hw], [0, -1, hw, 0.1], [-1, 0, 0.1, hw]]) add(ctx, box(sw, 1.0, sd), M.wood('#4a3626'), x + ox * hw / 2, H + 0.8, z + oz * hw / 2);
  // the beacon inside, seen between the posts
  add(ctx, cyl(0.6, 0.45, 0.5, 8), iron(), x, H + 1.0, z);
  add(ctx, geo('gt-fire', () => new THREE.ConeGeometry(0.5, 1.1, 6)), M.glow('#ff8a30', 2.6), x, H + 1.75, z, { cast: false });
  ctx.lights.push({ x: x + 1.6, y: H + 1.6, z: z + 1.6, color: 0xff8a30, intensity: 8, dist: 13, halo: true, flicker: 0.3 });
  roof(ctx, x, H + 0.3 + hh, z, hw + 0.6, hw + 0.6, 2.6, true, '#1e2633');
  add(ctx, cone(0.12, 1.2, 4), iron(), x, H + 0.3 + hh + 3.1, z);
}

// A gibbet: a post with an arm, a cage of iron hoops and bars hanging from it by a chain. arm: the
// direction the arm reaches ('+x', '-x', '+z', '-z'); the cage hangs well over head height.
export function gibbet(ctx, x, z, arm = '+x', bones = true) {
  const d = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[arm]; const wood = M.wood('#3a2a1e');
  add(ctx, box(0.24, 4.2, 0.24), wood, x, 2.1, z); add(ctx, box(0.5, 0.3, 0.5), M.ashlar('#3e4250'), x, 0.15, z);
  const ax = x + d[0] * 0.75, az = z + d[1] * 0.75; add(ctx, box(d[0] ? 1.7 : 0.16, 0.16, d[1] ? 1.7 : 0.16), wood, ax, 4.1, az);
  const brace = add(ctx, box(0.1, 1.1, 0.1), wood, x + d[0] * 0.35, 3.65, z + d[1] * 0.35); brace.rotation.z = -d[0] * 0.75; brace.rotation.x = d[1] * 0.75;
  const cx = x + d[0] * 1.4, cz = z + d[1] * 1.4;
  add(ctx, box(0.04, 0.6, 0.04), iron(), cx, 3.75, cz);
  const g = new THREE.Group(); g.position.set(cx, 3.45, cz); ctx.group.add(g);
  const hoop = geo('gt-hoop', () => new THREE.TorusGeometry(0.34, 0.025, 4, 12));
  for (const y of [-0.05, -0.7, -1.35]) { const m = new THREE.Mesh(hoop, iron()); m.rotation.x = Math.PI / 2; m.position.y = y; g.add(m); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; const m = new THREE.Mesh(box(0.03, 1.4, 0.03), iron()); m.position.set(Math.cos(a) * 0.34, -0.7, Math.sin(a) * 0.34); g.add(m); }
  const top = new THREE.Mesh(geo('gt-cap', () => new THREE.ConeGeometry(0.36, 0.3, 8)), iron()); top.position.y = 0.1; g.add(top);
  if (bones) { const sk = new THREE.Mesh(geo('gt-skull', () => new THREE.IcosahedronGeometry(0.12, 1)), M.flat(0xb0a68a)); sk.position.set(0.05, -1.2, 0.04); g.add(sk); const rib = new THREE.Mesh(box(0.2, 0.3, 0.12), M.flat(0x9a907a)); rib.position.set(-0.04, -1.25, -0.06); rib.rotation.z = 0.5; g.add(rib); }
  let t = Math.random() * 6; ctx.anims.push({ update(dt) { t += dt; g.rotation.z = Math.sin(t * 0.9) * 0.05; g.rotation.x = Math.sin(t * 0.7 + 1) * 0.04; return false; } });
  solidCircle(ctx, x, z, 0.3, 4);
}

// A standing cage on the square: a cell of bars on a stone sill, its door hanging open.
export function cage(ctx, x, z, w = 1.6, h = 2.2) {
  add(ctx, box(w + 0.2, 0.25, w + 0.2), M.ashlar('#3e4250'), x, 0.125, z);
  for (const s of [-1, 1]) { add(ctx, box(w + 0.1, 0.08, 0.08), iron(), x, h, z + s * w / 2); add(ctx, box(0.08, 0.08, w + 0.1), iron(), x + s * w / 2, h, z); }
  const n = Math.round(w / 0.2);
  for (let i = 0; i <= n; i++) { const u = -w / 2 + i * w / n;
    inst(ctx, 'gt-cbar', box(0.04, h - 0.25, 0.04), iron(), mat4(x + u, 0.25 + (h - 0.25) / 2, z - w / 2)); inst(ctx, 'gt-cbar', box(0.04, h - 0.25, 0.04), iron(), mat4(x - w / 2, 0.25 + (h - 0.25) / 2, z + u));
    if (u < w * 0.1) inst(ctx, 'gt-cbar', box(0.04, h - 0.25, 0.04), iron(), mat4(x + u, 0.25 + (h - 0.25) / 2, z + w / 2));
    inst(ctx, 'gt-cbar', box(0.04, h - 0.25, 0.04), iron(), mat4(x + w / 2, 0.25 + (h - 0.25) / 2, z + u)); }
  // the door swung open on the +z side
  const dg = new THREE.Group(); dg.position.set(x + w * 0.1, 0, z + w / 2); dg.rotation.y = -1.1; ctx.group.add(dg);
  for (let u = 0.1; u < w * 0.4; u += 0.2) { const m = new THREE.Mesh(box(0.04, h - 0.3, 0.04), iron()); m.position.set(u, 0.25 + (h - 0.3) / 2, 0); dg.add(m); }
  add(ctx, cone(w * 0.75, 0.5, 4), iron(), x, h + 0.25, z, { ry: Math.PI / 4 });
  add(ctx, geo('gt-skull', () => new THREE.IcosahedronGeometry(0.12, 1)), M.flat(0xb0a68a), x - 0.2, 0.37, z - 0.3);
  solid(ctx, x - w / 2 - 0.1, z - w / 2 - 0.1, x + w / 2 + 0.1, z + w / 2 + 0.1, h);
}
