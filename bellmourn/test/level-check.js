// Checks a district in the browser: loads ?level=<id>, then (with every gate open) flood-fills the
// walkable floor from the start and reports whether each lamp, chest, foe, encounter, the boss zone
// and the exit can be reached; also foes or lamps stuck inside walls, unknown gate names, draw calls.
// With a variant (js/game/variants.js) the level is rebuilt under it first (?variant=<id> when game.js reads it,
// else this harness swaps the level's def for applyVariant(def, variant) and reloads it): the variant's blocks,
// gates, start and touches (the glowing props of quest hints and in-level events) are checked too.
// NODE_PATH=$(npm root -g) node bellmourn/test/level-check.js <levelId> [out.png] [--variant=<id>|all] [--short]
//   --variant=all   checks the base level and every variant of it in one browser (out.png gets a -<variant> suffix)
//   --short         applies the run cut (layout.short: one or two fights, the boss, the exit)
const { chromium } = require('playwright');
(async () => {
  const pos = process.argv.slice(2).filter((a) => !a.startsWith('--')); const flag = (n) => { const a = process.argv.find((x) => x.startsWith('--' + n)); return a ? (a.includes('=') ? a.split('=')[1] : true) : null; };
  const id = pos[0] || 'gate'; const out = pos[1]; const port = process.env.PORT || 8790; const want = flag('variant'); const short = !!flag('short');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  const vq = want && want !== 'all' ? `&variant=${want}${short ? '&short=1' : ''}` : '';
  // the game first; when it cannot reach play (another part being rebuilt, or --viewer), the standalone viewer
  // (test/variant-view.html) builds the level exactly as the game does, so the check still runs
  let viewer = !!flag('viewer');
  const toPlay = () => p.waitForFunction(() => {
    if (window.VV) return VV.ready && VV.level && VV.frames > 5;
    if (!(window.BM && BM.ready)) return false; const G = BM.game;
    if (G.state === 'cutscene' && G.cut) { try { if (G.cut.pick) G.cut.choose(0); else if (!G.cut.skipping) G.cut.skip(); } catch (e) { /* the scene ends on its own */ } }
    return G.state === 'play' && BM.frames > 5 && !G.loading;
  }, null, { timeout: viewer ? 120000 : 60000, polling: 500 });
  if (!viewer) {
    await p.goto(`http://127.0.0.1:${port}/bellmourn/index.html?level=${id}&god=1${vq}`);
    try { await toPlay(); } catch (e) { viewer = true; console.log('the game did not reach play (' + (errs[0] || 'timeout') + '): checking in the standalone viewer'); errs.length = 0; }
  }
  if (viewer) { await p.goto(`http://127.0.0.1:${port}/bellmourn/test/variant-view.html?level=${id}${out ? '' : '&norender=1'}`); await toPlay(); }
  const list = want === 'all' ? [null, ...(await p.evaluate(async (lid) => (await import('/bellmourn/js/game/variants.js')).variantsOf(lid).map((v) => v.id), id))] : [want || null];
  let bad = 0;
  for (const vid of list) {
    // rebuild under the variant unless the game already did (A's ?variant= parsing)
    const how = await p.evaluate(async ({ lid, vid, short }) => {
      if (window.VV) { await VV.load(lid, vid, short); return 'viewer'; }
      const G = BM.game; const cur = G.level && G.level.def; if (!vid && !short && !(cur && cur.variant)) return 'base';
      if (vid && cur && cur.variant && cur.variant.id === vid && !!(cur.layout && cur.layout.short) === short) return 'game';
      const V = await import('/bellmourn/js/game/variants.js'); const LV = (await import('/bellmourn/js/world/levels/index.js')).default;
      window.__baseDefs = window.__baseDefs || {}; const base = window.__baseDefs[lid] || (window.__baseDefs[lid] = (LV[lid].base || LV[lid]));
      LV[lid] = vid || short ? V.applyVariant(base, vid ? V.getVariant(lid, vid) : null, { short }) : base;
      await G.loadLevel(lid, { fromStart: true }); return 'harness';
    }, { lid: id, vid, short });
    await toPlay(); if (out) await p.waitForTimeout(1500);
    if (out) await p.screenshot({ path: list.length > 1 || vid ? out.replace(/\.png$/, '') + '-' + (vid || 'base') + (short ? '-short' : '') + '.png' : out });
    const res = await p.evaluate(() => {
      const L = window.VV ? VV.level : BM.game.level, def = L.def; const R = 0.4, S = 0.25;
      const solids = L.solids.filter((s) => !s.gate); // all gates open
      const [x0, z0, x1, z1] = def.bounds; const nx = Math.ceil((x1 - x0) / S), nz = Math.ceil((z1 - z0) / S);
      const free = (x, z) => { if (x < x0 + R || x > x1 - R || z < z0 + R || z > z1 - R) return false; for (const s of solids) { if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + R) return false; } else { const cx = Math.max(s.x0, Math.min(s.x1, x)), cz = Math.max(s.z0, Math.min(s.z1, z)); if ((x - cx) ** 2 + (z - cz) ** 2 < R * R) return false; } } return true; };
      const grid = new Uint8Array(nx * nz); // 0 unknown, 1 free-unvisited, 2 blocked, 3 reached
      const idx = (i, j) => j * nx + i; const cell = (x, z) => [Math.floor((x - x0) / S), Math.floor((z - z0) / S)];
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) grid[idx(i, j)] = free(x0 + (i + 0.5) * S, z0 + (j + 0.5) * S) ? 1 : 2;
      const [si, sj] = cell(def.start.x, def.start.z); const q = [[si, sj]]; if (grid[idx(si, sj)] !== 1) return { level: def.id, variant: def.variant && def.variant.id, problems: ['start is blocked'], counts: {} };
      grid[idx(si, sj)] = 3;
      while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= nz) continue; const k = idx(a, c); if (grid[k] === 1) { grid[k] = 3; q.push([a, c]); } } }
      const reach = (x, z, rad = 1.2) => { for (let dz = -rad; dz <= rad; dz += S) for (let dx = -rad; dx <= rad; dx += S) { const [i, j] = cell(x + dx, z + dz); if (i >= 0 && j >= 0 && i < nx && j < nz && grid[idx(i, j)] === 3) return true; } return false; };
      const zoneReach = (zn) => { for (let z = zn[1]; z <= zn[3]; z += S) for (let x = zn[0]; x <= zn[2]; x += S) { const [i, j] = cell(x, z); if (i >= 0 && j >= 0 && i < nx && j < nz && grid[idx(i, j)] === 3) return true; } return false; };
      const report = { level: def.id, variant: def.variant ? def.variant.id : null, short: !!(def.layout && def.layout.short), problems: [], counts: {} };
      for (const l of def.lamps || []) if (!reach(l.x, l.z, 1.6)) report.problems.push('lamp unreachable: ' + l.id);
      // the prompt appears within 1.7 m of the chest; a lamp lights itself within 3.5 m: a walkable cell must lie that close
      const reachR = (x, z, r) => { for (let dz = -r; dz <= r; dz += S) for (let dx = -r; dx <= r; dx += S) { if (dx * dx + dz * dz > r * r) continue; const [i, j] = cell(x + dx, z + dz); if (i >= 0 && j >= 0 && i < nx && j < nz && grid[idx(i, j)] === 3) return true; } return false; };
      for (const c of def.items || []) if (!reachR(c.x, c.z, 1.55)) report.problems.push('chest cannot be opened (no floor within 1.55 m): ' + c.id);
      for (const l of def.lamps || []) if (!reachR(l.x, l.z, 3.2)) report.problems.push('lamp cannot light (no floor within 3.2 m): ' + l.id);
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
      // the variant's touches (glowing props walked into) must stand on reachable floor and have their prop built
      for (const t of def.touches || []) { if (!reachR(t.x, t.z, 1.0)) report.problems.push('touch unreachable: ' + t.id + ' at ' + t.x + ',' + t.z); if (!L.marks['touch:' + t.id]) report.problems.push('touch prop missing: ' + t.id); }
      // with the gates as the game has them at the start (only gatesOpen open), the first fight must be reachable
      if (def.variant || (def.layout && def.layout.short)) {
        const shut = L.solids.filter((s) => s.gate && !(def.gatesOpen || []).some((g) => L.marks[g] && L.marks[g].solid === s));
        const blocked = (x, z) => shut.some((s) => x > s.x0 - R && x < s.x1 + R && z > s.z0 - R && z < s.z1 + R);
        const g2 = new Uint8Array(nx * nz); const q2 = [[si, sj]]; g2[idx(si, sj)] = 1;
        while (q2.length) { const [i, j] = q2.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a >= nx || c >= nz) continue; const k = idx(a, c); if (!g2[k] && grid[k] === 3 && !blocked(x0 + (a + 0.5) * S, z0 + (c + 0.5) * S)) { g2[k] = 1; q2.push([a, c]); } } }
        const first = (def.encounters || []).filter((e) => !e.ambush)[0]; const target = first ? first.zone : def.boss && def.boss.zone;
        let ok = false; if (target) for (let z = target[1]; z <= target[3] && !ok; z += S) for (let x = target[0]; x <= target[2]; x += S) { const [i, j] = cell(x, z); if (i >= 0 && j >= 0 && i < nx && j < nz && g2[idx(i, j)]) { ok = true; break; } }
        if (target && !ok) report.problems.push('from the start, with the gates shut, the first fight cannot be reached');
      }
      const info = (window.VV ? VV.r : BM.r).gl.info; report.counts = { drawCalls: info.render.calls, triangles: info.render.triangles, lights: L.lights.length, solids: L.solids.length, foes: (def.foes || []).length, encounters: (def.encounters || []).length, touches: (def.touches || []).length, fps: Math.round(window.BM ? BM.fps : 0) };
      return report;
    });
    console.log(JSON.stringify(res, null, list.length > 1 ? 0 : 1));
    if (res.problems && res.problems.length) bad++;
  }
  console.log('errors:', errs.length ? errs.slice(0, 10) : 'none');
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
