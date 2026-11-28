// The gaol-house on the gallows square (Gallows Gate): a squat fortress of brick against the square's west wall,
// crenellated, two barred windows burning in its upper floor, and in the middle of its front a great doorway that
// was bricked up long ago, iron straps bolted across it. The Gaoler is behind that brickwork. When the warden
// steps onto the square he breaks out through it (game/bosses4.js ENTRANCES.gaoler, level def boss.breakout):
// the blocks of the bricked-up door are real pieces: they jolt when he hits them from inside (hit), and fly out
// across the square when he comes through (burst), tumble, bounce and lie where they land for the whole fight;
// the doorway stays open and dark behind him, a brazier glowing inside, rubble on its threshold.
//
// gaolHouse(ctx, K, { x: the front face, z: the door's middle }) -> the breakable door (ctx.marks[name]):
//   { hit(k), burst(), update(dt), broken, door: { x, z }, inside: { x, z } }
// PROPOSAL: the look.
import * as THREE from '../../../vendor/three.module.min.js';
import { M } from '../../engine/materials.js';

const DOOR_W = 3.4, DOOR_H = 3.8, COLS = 4, ROWS = 4;

export function gaolHouse(ctx, K, o = {}) {
  const fx = o.x ?? -8.2, dz = o.z ?? -36; const half = 3.6, depth = 5.4, H = 6.6, front = 1.0;
  const brick = M.brick('#343e50'), stone = M.ashlar('#46505f'), dark = M.ashlar('#2a323e'), iron = M.ironLit();
  const add = (g, m, x, y, z, op) => K.add(ctx, g, m, x, y, z, op);
  // ---- the body, set back behind the front wall (so the doorway is a real opening with depth)
  add(K.box(depth - front, H, half * 2), brick, fx - front - (depth - front) / 2, H / 2, dz);
  // ---- the front wall in three parts round the doorway: two piers and the wall over the door
  const pierW = half - DOOR_W / 2;
  for (const s of [-1, 1]) add(K.box(front, H, pierW), brick, fx - front / 2, H / 2, dz + s * (DOOR_W / 2 + pierW / 2));
  add(K.box(front, H - DOOR_H, DOOR_W), brick, fx - front / 2, DOOR_H + (H - DOOR_H) / 2, dz);
  // the plinth, a string course, the parapet and its merlons
  add(K.box(depth + 0.2, 0.5, half * 2 + 0.2), dark, fx - depth / 2, 0.25, dz);
  add(K.box(front + 0.16, 0.2, half * 2 + 0.16), stone, fx - front / 2, 4.5, dz);
  add(K.box(depth + 0.3, 0.3, half * 2 + 0.3), stone, fx - depth / 2, H + 0.15, dz);
  for (let i = 0; i < 7; i++) add(K.box(0.5, 0.55, 0.62), stone, fx - 0.25, H + 0.57, dz - half + 0.45 + i * ((half * 2 - 0.9) / 6));
  for (let i = 0; i < 4; i++) add(K.box(0.62, 0.55, 0.5), stone, fx - 0.9 - i * 1.3, H + 0.57, dz + half - 0.25);
  // the door's frame: stone jambs, a heavy lintel, a keystone with an iron ring
  for (const s of [-1, 1]) add(K.box(front + 0.14, DOOR_H + 0.2, 0.36), stone, fx - front / 2, (DOOR_H + 0.2) / 2, dz + s * (DOOR_W / 2 + 0.12));
  add(K.box(front + 0.2, 0.55, DOOR_W + 0.9), stone, fx - front / 2, DOOR_H + 0.3, dz);
  add(K.box(front + 0.3, 0.8, 0.6), dark, fx - front / 2, DOOR_H + 0.42, dz);
  add(K.box(0.06, 0.3, 0.3), iron, fx + 0.14, DOOR_H + 0.3, dz);
  // the upper floor: two barred windows, lit from inside
  for (const s of [-1, 1]) {
    const wz = dz + s * 2.1;
    add(K.box(0.04, 1.0, 0.7), M.glow('#ff8a3a', 2.2), fx + 0.01, 5.35, wz, { cast: false });
    add(K.box(0.1, 0.16, 0.95), stone, fx + 0.04, 4.78, wz); add(K.box(0.1, 0.16, 0.95), stone, fx + 0.04, 5.92, wz);
    for (let b = -1; b <= 1; b++) add(K.box(0.06, 1.0, 0.06), iron, fx + 0.05, 5.35, wz + b * 0.2, { cast: false });
  }
  // the window in the side that faces the camera, and a chimney
  add(K.box(0.7, 1.0, 0.04), M.glow('#ff8a3a', 1.8), fx - 2.6, 5.35, dz + half + 0.01, { cast: false });
  for (let b = -1; b <= 1; b++) add(K.box(0.06, 1.0, 0.06), iron, fx - 2.6 + b * 0.2, 5.35, dz + half + 0.05, { cast: false });
  add(K.box(0.7, 1.6, 0.7), brick, fx - 3.9, H + 0.8, dz - 2.2); add(K.box(0.86, 0.16, 0.86), stone, fx - 3.9, H + 1.66, dz - 2.2);
  // inside the doorway: the dark, and a brazier's glow deep in it (seen once the door is broken)
  add(K.box(0.04, DOOR_H, DOOR_W), new THREE.MeshBasicMaterial({ color: 0x050507 }), fx - front + 0.03, DOOR_H / 2, dz, { cast: false });
  add(K.box(0.04, 0.5, DOOR_W), M.glow('#ff5a20', 0.5), fx - front + 0.05, 0.25, dz, { cast: false });
  add(K.box(0.3, 0.5, 0.3), iron, fx - front + 0.3, 0.25, dz - 1.0); add(K.box(0.24, 0.16, 0.24), M.glow('#ff7a28', 2.6), fx - front + 0.3, 0.56, dz - 1.0, { cast: false });
  K.solid(ctx, fx - depth, dz - half, fx, dz + half, H);
  ctx.lights.push({ x: fx + 0.8, y: 5.2, z: dz, color: 0xff8a3a, intensity: 5, dist: 8, flicker: 0.1 });

  // ---- the bricked-up door: blocks of newer brick and two iron straps, each its own piece
  const g = new THREE.Group(); ctx.group.add(g); const parts = [];
  const bw = DOOR_W / COLS, bh = DOOR_H / ROWS, bt = 0.5; const px = fx - 0.3;
  const mats = [M.brick('#6e6862'), M.brick('#625c58')]; // paler, newer brick than the gaol's: the door reads from across the square
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const off = r % 2 ? 0 : 0; const m = new THREE.Mesh(K.box(bt, bh - 0.12, bw - 0.12), mats[(r + c) % 2]);
    m.position.set(px, bh / 2 + r * bh, dz - DOOR_W / 2 + bw / 2 + c * bw + off); m.castShadow = true; m.receiveShadow = true; g.add(m);
    parts.push({ m, home: m.position.clone(), hy: (bh - 0.12) / 2, row: r, col: c, v: null });
  }
  for (const y of [1.2, 2.7]) { const m = new THREE.Mesh(K.box(0.07, 0.2, DOOR_W + 0.3), iron); m.position.set(px + bt / 2 + 0.04, y, dz); m.castShadow = true; g.add(m); parts.push({ m, home: m.position.clone(), hy: 0.1, strap: true, row: 2, col: 1.5, v: null }); }
  // the light behind the brickwork: it shows in the seams, brighter with every blow from inside
  const seamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.25, 0.07), fog: false });
  const seam = new THREE.Mesh(K.box(0.04, DOOR_H - 0.04, DOOR_W - 0.04), seamMat); seam.position.set(px - bt / 2 + 0.06, DOOR_H / 2, dz); g.add(seam);
  let heat = 0.7, flare = 0; let hits = 0;
  ctx.lights.push({ x: fx + 1.6, y: 2.4, z: dz, color: 0xffa060, intensity: 7, dist: 7, flicker: 0.12 }); // the doorway is lit: it is where to look
  // which blocks each blow knocks clean out (row, col), leaving holes the light pours through
  const POPS = [[], [[2, 1]], [[3, 2], [1, 3], [2, 0]]];
  const fling = (p, pow) => { const up = p.row / (ROWS - 1), side = ((p.col ?? 1.5) - (COLS - 1) / 2) / ((COLS - 1) / 2); p.v = { x: (7 + R() * 7 + up * 2) * pow, y: (2.5 + R() * 4 + up * 3) * (0.5 + 0.5 * pow), z: side * (2 + R() * 2.5) + (R() - 0.5) * 2, sx: (R() - 0.5) * 12, sy: (R() - 0.5) * 9, sz: (R() - 0.5) * 12, n: 0, rest: false }; };
  // rubble that lies on the threshold once he is through (hidden until then)
  const rub = new THREE.Group(); rub.visible = false; ctx.group.add(rub); const r0 = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let i = 0; i < 9; i++) { const s = 0.18 + r0(i) * 0.3; const m = new THREE.Mesh(K.box(s, s * 0.7, s * 1.2), mats[i % 2]); m.position.set(fx - 0.5 + r0(i + 20) * 1.3, s * 0.3, dz - DOOR_W / 2 + 0.3 + r0(i + 40) * (DOOR_W - 0.6)); m.rotation.set(r0(i + 5), r0(i + 9) * 3, r0(i + 13)); m.castShadow = true; rub.add(m); }

  let jolt = 0; const R = Math.random;
  const door = {
    broken: false, door: { x: fx, z: dz }, inside: { x: fx - 2.4, z: dz }, width: DOOR_W, height: DOOR_H,
    // a blow from inside: the brickwork jumps outward and stays a little further out each time; mortar cracks
    hit(k = 1) {
      if (door.broken) return; jolt = 0.22; heat += 0.9 * k; flare = 1;
      for (const [r, c] of POPS[Math.min(2, hits)]) { const p = parts.find((q) => q.row === r && q.col === c && !q.v); if (p) fling(p, 0.45); } hits++;
      for (const p of parts) { if (p.v) continue; const d = (0.03 + R() * 0.06) * k * (p.strap ? 0.6 : 1); p.home.x += d; p.m.rotation.y += (R() - 0.5) * 0.05 * k; p.m.rotation.z += (R() - 0.5) * 0.04 * k; }
    },
    // he comes through: every piece is thrown out across the square
    burst() {
      if (door.broken) return; door.broken = true; rub.visible = true; seam.visible = false;
      for (const p of parts) if (!p.v) fling(p, 1);
    },
    update(dt) {
      if (!door.broken) {
        flare = Math.max(0, flare - dt * 2.5); const hk = heat * (0.85 + 0.15 * Math.sin(performance.now() * 0.012)) + flare * 3; seamMat.color.setRGB(hk, hk * 0.36, hk * 0.1);
        if (jolt > 0) { jolt -= dt; const k = Math.max(0, jolt / 0.22); for (const p of parts) if (!p.v) p.m.position.x = p.home.x + Math.sin(jolt * 90 + p.row * 2 + p.col) * 0.035 * k; }
      }
      for (const p of parts) {
        const v = p.v; if (!v || v.rest) continue; const m = p.m;
        v.y -= 24 * dt; m.position.x += v.x * dt; m.position.y += v.y * dt; m.position.z += v.z * dt;
        m.rotation.x += v.sx * dt; m.rotation.y += v.sy * dt; m.rotation.z += v.sz * dt;
        if (m.position.x > fx + 10.5) { m.position.x = fx + 10.5; v.x *= -0.2; } // it stays on the square
        if (m.position.y <= p.hy) {
          m.position.y = p.hy; v.n++;
          if (Math.abs(v.y) > 2.2 && v.n < 4) { v.y = -v.y * 0.34; v.x *= 0.62; v.z *= 0.62; v.sx *= 0.5; v.sy *= 0.5; v.sz *= 0.5; }
          else { v.rest = true; m.rotation.x = Math.round(m.rotation.x / (Math.PI / 2)) * (Math.PI / 2) + (R() - 0.5) * 0.12; m.rotation.z = Math.round(m.rotation.z / (Math.PI / 2)) * (Math.PI / 2) + (R() - 0.5) * 0.12; }
        }
      }
    },
  };
  ctx.anims.push(door);
  return door;
}
