// Checks a district in the browser: loads ?level=<id>, then (with every gate open) flood-fills the
// walkable floor from the start and reports whether each lamp, chest, foe, encounter, the boss zone
// and the exit can be reached; also foes or lamps stuck inside walls, unknown gate names, draw calls.
// NODE_PATH=$(npm root -g) node bellmourn/test/level-check.js <levelId> [out.png]
const { chromium } = require('playwright');
(async () => {
  const id = process.argv[2] || 'gate'; const out = process.argv[3]; const port = process.env.PORT || 8790;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html?level=${id}&god=1`);
  await p.waitForFunction(() => window.BM && BM.ready && BM.game.state === 'play' && BM.frames > 5, null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  if (out) await p.screenshot({ path: out });
  const res = await p.evaluate(() => {
    const G = BM.game, L = G.level, def = L.def, w = G.world; const R = 0.4, S = 0.25;
    const solids = L.solids.filter((s) => !s.gate); // all gates open
    const [x0, z0, x1, z1] = def.bounds; const nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S);
    const free = (x, z) => { if (x < x0 + R || x > x1 - R || z < z0 + R || z > z1 - R) return false; for (const s of solids) { if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + R) return false; } else { const cx = Math.max(s.x0, Math.min(s.x1, x)), cz = Math.max(s.z0, Math.min(s.z1, z)); if ((x - cx) ** 2 + (z - cz) ** 2 < R * R) return false; } } return true; };
    const grid = new Uint8Array(nx * nz); // 0 unknown, 1 free-unvisited, 2 blocked, 3 reached
    const idx = (i, j) => j * nx + i; const cell = (x, z) => [Math.floor((x - x0) / S), Math.floor((z - z0) / S)];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) grid[idx(i, j)] = free(x0 + (i + 0.5) * S, z0 + (j + 0.5) * S) ? 1 : 2;
    const [si, sj] = cell(def.start.x, def.start.z); const q = [[si, sj]]; if (grid[idx(si, sj)] !== 1) return { error: 'start is blocked' };
    grid[idx(si, sj)] = 3;
    while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= nz) continue; const k = idx(a, c); if (grid[k] === 1) { grid[k] = 3; q.push([a, c]); } } }
    const reach = (x, z, rad = 1.2) => { for (let dz = -rad; dz <= rad; dz += S) for (let dx = -rad; dx <= rad; dx += S) { const [i, j] = cell(x + dx, z + dz); if (i >= 0 && j >= 0 && i < nx && j < nz && grid[idx(i, j)] === 3) return true; } return false; };
    const zoneReach = (zn) => { for (let z = zn[1]; z <= zn[3]; z += S) for (let x = zn[0]; x <= zn[2]; x += S) { const [i, j] = cell(x, z); if (i >= 0 && j >= 0 && i < nx && j < nz && grid[idx(i, j)] === 3) return true; } return false; };
    const report = { level: def.id, problems: [], counts: {} };
    for (const l of def.lamps || []) if (!reach(l.x, l.z, 1.6)) report.problems.push('lamp unreachable: ' + l.id);
    for (const c of def.items || []) if (!reach(c.x, c.z, 1.4)) report.problems.push('chest unreachable: ' + c.id);
    for (const f of def.foes || []) { if (!free(f.x, f.z)) report.problems.push(`foe inside a wall: ${f.t} at ${f.x},${f.z}`); else if (!reach(f.x, f.z, 0.6)) report.problems.push(`foe unreachable: ${f.t} at ${f.x},${f.z}`); }
    for (const e of def.encounters || []) {
      if (!zoneReach(e.zone)) report.problems.push('encounter zone unreachable: ' + e.id);
      for (const g of [...(e.gates || []), ...(e.opens || [])]) if (!L.marks[g]) report.problems.push(`encounter ${e.id}: unknown gate ${g}`);
      for (const wv of e.waves) for (const f of wv.foes) if (!free(f.x, f.z)) report.problems.push(`encounter ${e.id}: foe inside a wall at ${f.x},${f.z}`);
      // a gate that closes must not cut through the zone that triggers it (the hero would be shoved through it)
      for (const g of e.gates || []) { const s = L.marks[g] && L.marks[g].solid; if (s && s.x1 > e.zone[0] - 0.5 && s.x0 < e.zone[2] + 0.5 && s.z1 > e.zone[1] - 0.5 && s.z0 < e.zone[3] + 0.5) report.problems.push(`encounter ${e.id}: gate ${g} overlaps its trigger zone`); }
    }
    if (def.boss) { for (const g of def.boss.gates || []) { const s = L.marks[g] && L.marks[g].solid; const zn = def.boss.zone; if (s && s.x1 > zn[0] - 0.5 && s.x0 < zn[2] + 0.5 && s.z1 > zn[1] - 0.5 && s.z0 < zn[3] + 0.5) report.problems.push(`boss: gate ${g} overlaps the boss zone`); }
      if (!zoneReach(def.boss.zone)) report.problems.push('boss zone unreachable'); if (!free(def.boss.x, def.boss.z)) report.problems.push('boss spawn blocked'); for (const g of [...(def.boss.gates || []), ...(def.boss.opens || [])]) if (!L.marks[g]) report.problems.push('boss: unknown gate ' + g); }
    if (def.exit && !zoneReach(def.exit.zone)) report.problems.push('exit unreachable');
    for (const g of def.gatesOpen || []) if (!L.marks[g]) report.problems.push('gatesOpen: unknown gate ' + g);
    const info = BM.r.gl.info; report.counts = { drawCalls: info.render.calls, triangles: info.render.triangles, lights: L.lights.length, solids: L.solids.length, foes: (def.foes || []).length, encounters: (def.encounters || []).length, fps: Math.round(BM.fps) };
    return report;
  });
  console.log(JSON.stringify(res, null, 1));
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close(); process.exit(res.problems && res.problems.length || errs.length ? 1 : 0);
})();
