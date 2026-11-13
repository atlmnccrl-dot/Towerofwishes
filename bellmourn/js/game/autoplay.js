// Autoplay for end-to-end tests: walks a district on a grid path (closed gates block), opens chests,
// fights with the bot, rests at the last lamp before the boss (lamps are checkpoints only: growing
// happens at the Haven, which game.autoInput plays through), enters the boss arena and leaves by the
// exit. Pure logic.
import { makeBot } from './bot.js';

const S = 0.25, R = 0.39;

export function makeAutoplay(seed = 3) {
  const bot = makeBot(1, seed);
  const st = { grid: null, key: '', path: null, pathT: 0, target: null, visited: new Set(), stuckT: 0, lastPos: null, wiggle: 0 };

  function buildGrid(L, w) {
    const def = L.def; const [x0, z0, x1, z1] = def.bounds; const nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S);
    const solids = L.solids.filter((s) => !s.open);
    const g = new Uint8Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * S, z = z0 + (j + 0.5) * S; let ok = x > x0 + R && x < x1 - R && z > z0 + R && z < z1 - R;
      if (ok) for (const s of solids) { if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + R) { ok = false; break; } } else { const cx = Math.max(s.x0, Math.min(s.x1, x)), cz = Math.max(s.z0, Math.min(s.z1, z)); if ((x - cx) ** 2 + (z - cz) ** 2 < R * R) { ok = false; break; } } }
      g[j * nx + i] = ok ? 1 : 0;
    }
    return { g, nx, nz, x0, z0 };
  }
  const cellOf = (G, x, z) => [Math.max(0, Math.min(G.nx - 1, Math.floor((x - G.x0) / S))), Math.max(0, Math.min(G.nz - 1, Math.floor((z - G.z0) / S)))];
  function nearestFree(G, i, j) { if (G.g[j * G.nx + i]) return [i, j]; for (let r = 1; r < 14; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < G.nx && b < G.nz && G.g[b * G.nx + a]) return [a, b]; } return [i, j]; }
  function bfs(G, from, to) {
    const [si, sj] = nearestFree(G, ...from), [ti, tj] = nearestFree(G, ...to);
    const prev = new Int32Array(G.nx * G.nz).fill(-1); const q = [sj * G.nx + si]; prev[q[0]] = q[0]; let head = 0; const T = tj * G.nx + ti;
    while (head < q.length) { const k = q[head++]; if (k === T) break; const i = k % G.nx, j = (k / G.nx) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= G.nx || b >= G.nz) continue; const n = b * G.nx + a; if (prev[n] !== -1 || !G.g[n]) continue; if (di && dj && (!G.g[j * G.nx + a] || !G.g[b * G.nx + i])) continue; prev[n] = k; q.push(n); } }
    if (prev[T] === -1) return null;
    const path = []; let k = T; while (k !== prev[k]) { path.push({ x: G.x0 + (k % G.nx + 0.5) * S, z: G.z0 + (((k / G.nx) | 0) + 0.5) * S }); k = prev[k]; } return path.reverse();
  }
  const center = (zn) => ({ x: (zn[0] + zn[2]) / 2, z: (zn[1] + zn[3]) / 2 });

  function targets(game) {
    const L = game.level, def = L.def; const out = [];
    // the training on the Old Road: walk on, light the lamp when told, leave only when it says go
    const T = game.tutorial && game.tutorial.step;
    if (T) {
      if (T.id === 'move') return [{ id: 'north', x: 0, z: 18 }];
      if (T.id === 'lamp') for (const l of L.lamps) if (!l.h.lit) out.push({ id: 'lamp:' + l.id, x: l.x + 1.2, z: l.z + 0.6, lamp: l });
      if (T.id !== 'go') return out;
    }
    for (const c of L.chests) if (!c.h.open && !st.visited.has('chest:' + c.id)) out.push({ id: 'chest:' + c.id, x: c.x, z: c.z + 1.0, chest: c });
    for (const e of game.encs || []) if (e.state === 'idle') { const c = center(e.zone); out.push({ id: 'enc:' + e.id, x: c.x, z: c.z }); }
    if (def.boss && game.bossState === 'idle' && !out.length && !st.rested && L.lamps.length) { const l = L.lamps[L.lamps.length - 1]; out.push({ id: 'rest', x: l.x + 1.2, z: l.z + 0.6, lamp: l, rest: true }); }
    if (def.boss && game.bossState === 'idle') { const z = def.boss.zone; out.push({ id: 'boss', x: (z[0] + z[2]) / 2, z: z[3] - 1.5 }); }
    if (def.exit && (!def.exit.requires || game.bossState === 'done')) { const c = center(def.exit.zone); out.push({ id: 'exit', x: c.x, z: c.z, last: true }); }
    return out;
  }

  return function frame(game, dt) {
    const w = game.world, h = w.hero; const inp = bot(w, dt);
    // the training asks for things a fight alone may not bring: two dashes, the ultimate, a tonic
    const T = game.tutorial && game.tutorial.step; st.tT = (st.tT || 0) + dt;
    if (T) {
      if (T.id === 'dash' && game.tutorial.dashes < 2 && st.tT > 0.9) { st.tT = 0; inp.dashPressed = true; }
      if (T.id === 'ult' && w.meter >= 100) inp.ultPressed = true;
      if (T.id === 'tonic' && h.tonics > 0 && st.tT > 0.5) { st.tT = 0; inp.healPressed = true; }
    }
    const fighting = w.foes().some((f) => f.ai.aggro && Math.hypot(f.x - h.x, f.z - h.z) < 14) || (game.boss && !game.boss.dead) || (!!T && w.foes().length > 0);
    if (fighting) {
      // fight with the bot, but walk around walls and fences to reach the nearest foe
      st.path = null;
      const foes = w.foes().filter((f) => f.ai.aggro && !f.hidden); let near = null, nd = 1e9;
      for (const f of foes) { const d = Math.hypot(f.x - h.x, f.z - h.z); if (d < nd) { nd = d; near = f; } }
      if (near && nd > 2.6 && !inp.dashPressed && !inp.parryPressed) {
        const key2 = game.levelId + L_key(game); if (key2 !== st.key) { st.grid = buildGrid(game.level, w); st.key = key2; }
        st.fightT = (st.fightT || 0) - dt;
        if (!st.fightPath || st.fightT <= 0) { st.fightPath = bfs(st.grid, cellOf(st.grid, h.x, h.z), cellOf(st.grid, near.x, near.z)); st.fightT = 0.5; }
        const fp = st.fightPath;
        while (fp && fp.length > 1 && Math.hypot(fp[0].x - h.x, fp[0].z - h.z) < 0.7) fp.shift();
        if (fp && fp.length) { const wp = fp[Math.min(1, fp.length - 1)]; const dx = wp.x - h.x, dz = wp.z - h.z, d = Math.hypot(dx, dz); if (d > 0.2) { inp.mx = dx / d; inp.mz = dz / d; } }
      }
      return inp;
    }
    // gates or level changed: rebuild the walk grid
    const key = game.levelId + L_key(game);
    if (game.levelId !== st.levelId) { st.levelId = game.levelId; st.visited.clear(); st.rested = false; }
    if (key !== st.key) { st.grid = buildGrid(game.level, w); st.key = key; st.path = null; }
    st.pathT -= dt;
    // idle too long without a fight: rebuild the walk grid and forget the target that held it
    if (st.lastPos2 && Math.hypot(st.lastPos2.x - h.x, st.lastPos2.z - h.z) < 0.3) st.idleT = (st.idleT || 0) + dt; else { st.idleT = 0; st.lastPos2 = { x: h.x, z: h.z }; }
    if (st.idleT > 4) { st.idleT = 0; st.key = ''; st.path = null; if (st.target) { st.skip = st.skip || {}; st.skip[st.target.id] = 20; } st.grid = buildGrid(game.level, w); st.key = game.levelId + L_key(game); }
    if (st.skip) for (const k in st.skip) { st.skip[k] -= dt; if (st.skip[k] <= 0) delete st.skip[k]; }
    if (!st.path || st.pathT <= 0) {
      const T = targets(game); let best = null, bestLen = 1e9;
      for (const t of T) { if (st.skip && st.skip[t.id] && T.length > 1) continue; const p = bfs(st.grid, cellOf(st.grid, h.x, h.z), cellOf(st.grid, t.x, t.z)); if (p && p.length + (t.last ? 400 : 0) < bestLen) { best = { t, p }; bestLen = p.length + (t.last ? 400 : 0); } }
      st.target = best ? best.t : null; st.path = best ? best.p : null; st.pathT = 1.0;
    }
    const t = st.target;
    game.autoDebug = { target: t && t.id, path: st.path ? st.path.length : -1, n: targets(game).map((x) => x.id).join(',') };
    if (t) {
      const dT = Math.hypot(t.x - h.x, t.z - h.z);
      // use it only from where the game offers the prompt (lamps 1.9 m, chests 1.7 m from the object itself)
      const obj = t.lamp || t.chest; const dObj = obj ? Math.hypot(obj.x - h.x, obj.z - h.z) : 9;
      if (obj && dObj < (t.lamp ? 1.7 : 1.5)) { inp.interactPressed = true; st.visited.add(t.id); if (t.rest) st.rested = true; st.path = null; return inp; }
      if (obj && dT < 0.5) { const dx = obj.x - h.x, dz = obj.z - h.z; inp.mx = dx / dObj; inp.mz = dz / dObj; return inp; }
      if (t.id.startsWith('enc:') && dT < 1.5) st.path = null;
      while (st.path && st.path.length > 1 && Math.hypot(st.path[0].x - h.x, st.path[0].z - h.z) < 0.5) st.path.shift();
      const wp = st.path && st.path[0] ? st.path[Math.min(1, st.path.length - 1)] : t;
      const dx = wp.x - h.x, dz = wp.z - h.z, d = Math.hypot(dx, dz);
      if (d > 0.2) { inp.mx = dx / d; inp.mz = dz / d; }
      // unstick
      if (st.lastPos && Math.hypot(st.lastPos.x - h.x, st.lastPos.z - h.z) < dt * 0.5) st.stuckT += dt; else st.stuckT = 0;
      st.lastPos = { x: h.x, z: h.z };
      if (st.stuckT > 1.2) { st.path = null; st.stuckT = 0; inp.dashPressed = true; const a = Math.random() * 6.28; inp.mx = Math.sin(a); inp.mz = Math.cos(a); }
    }
    return inp;
  };
}
function L_key(game) { return Object.values(game.level.marks).map((g) => (g && g.solid && g.solid.open ? 1 : 0)).join(''); }
