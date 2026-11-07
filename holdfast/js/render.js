// HOLDFAST - world renderer: cached terrain chunks, depth-sorted sprites, effects, night lighting,
// weather and fog of war. Reads the simulation state; never changes it.
(function () {
  const HF = window.HF, D = HF.D, A = HF.A, S = HF.Sim, Wd = HF.World;
  const TS = D.TILE, N = D.W, M = D.H, T = D.T;
  const R = HF.R = { cam: { x: N * TS / 2, y: M * TS / 2, z: 1.6 }, fx: [], birds: [], texts: [], shake: 0, letter: 0, marks: [], time: 0, dpr: 1, W: 0, H: 0, fogA: 1, fogTarget: 1 };
  const CH = 16; const chunks = {}; let chunkDirty = new Set();
  let canvas, ctx, lightC, lightG, fogC, fogG, tintC, tintG;

  R.init = function (cv) {
    canvas = cv; ctx = cv.getContext('2d');
    lightC = document.createElement('canvas'); lightG = lightC.getContext('2d');
    fogC = document.createElement('canvas'); fogC.width = N; fogC.height = M; fogG = fogC.getContext('2d');
    tintC = document.createElement('canvas'); tintC.width = N; tintC.height = M; tintG = tintC.getContext('2d');
    R.resize();
  };
  R.resize = function () {
    R.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    R.W = window.innerWidth; R.H = window.innerHeight;
    canvas.width = Math.round(R.W * R.dpr); canvas.height = Math.round(R.H * R.dpr);
    canvas.style.width = R.W + 'px'; canvas.style.height = R.H + 'px';
    lightC.width = Math.ceil(R.W / 3); lightC.height = Math.ceil(R.H / 3);
  };
  R.reset = function () { for (const k in chunks) delete chunks[k]; R.fx = []; R.texts = []; R.tintBuilt = false; };
  R.s2w = (sx, sy) => ({ x: (sx - R.W / 2) / R.cam.z + R.cam.x, y: (sy - R.H / 2) / R.cam.z + R.cam.y });
  R.w2s = (x, y) => ({ x: (x - R.cam.x) * R.cam.z + R.W / 2, y: (y - R.cam.y) * R.cam.z + R.H / 2 });
  R.clampCam = function () {
    const c = R.cam; c.z = Math.max(0.55, Math.min(3.2, c.z));
    const hw = R.W / 2 / c.z, hh = R.H / 2 / c.z;
    c.x = Math.max(hw * 0.4, Math.min(N * TS - hw * 0.4, c.x)); c.y = Math.max(hh * 0.4, Math.min(M * TS - hh * 0.4, c.y));
  };
  R.addFx = (name, x, y, k, opts) => { if (!A.fx || !A.fx.fx[name]) return; const f = Object.assign({ name, x, y, t: 0, k: k || 1 }, opts || {}); if (!f.life && A.fxLoop(name)) f.life = 1.6; R.fx.push(f); if (R.fx.length > 160) R.fx.shift(); };
  R.addText = (text, x, y, col, size) => { R.texts.push({ text, x, y, t: 0, col: col || '#fff', size: size || 9 }); if (R.texts.length > 60) R.texts.shift(); };

  // ---- Terrain ----------------------------------------------------------------------------
  const H = (x, y, s) => Wd.hash(x, y, s || 0);
  const rank = t => t === T.WATER ? 0 : t === T.SAND ? 1 : (t === T.STONE || t === T.DIRT) ? 2 : 3;
  function groundTex(g, st, t, x, y, dx, dy) {
    const h = H(x, y, 9);
    if (t === T.WATER) { g.fillStyle = '#2b5f7e'; g.fillRect(dx, dy, TS, TS); A.tile(g, 'x', 'water_1', dx, dy, TS); }
    else if (t === T.SAND) A.tile(g, 'x', 'sand', dx, dy, TS);
    else if (t === T.DIRT) A.tile(g, 'x', h < 0.5 ? 'dirt_1' : 'dirt_2', dx, dy, TS);
    else if (t === T.STONE) A.tile(g, 'x', 'stone_ground', dx, dy, TS, [Math.floor(h * 4) * 32, Math.floor(H(x, y, 3) * 4) * 32, 32, 32]);
    else { const c = t === T.MEADOW && h > 0.55 ? 4 + Math.floor(H(x, y, 5) * 4) : Math.floor(h * 4); A.tile(g, 't', 'g_grass_' + c + '_' + Math.floor(H(x, y, 7) * 4), dx, dy, TS); }
  }
  function band(g, side, dx, dy, x, y) { // wobbly strip along one side of a tile, as a clip path
    g.beginPath();
    const n = 6, dep = i => 5 + 4 * H(x * 7 + i, y * 13 + side, 21);
    if (side === 0) { g.moveTo(dx, dy); for (let i = 0; i <= n; i++) g.lineTo(dx + i * TS / n, dy + dep(i)); g.lineTo(dx + TS, dy); }
    if (side === 1) { g.moveTo(dx, dy + TS); for (let i = 0; i <= n; i++) g.lineTo(dx + i * TS / n, dy + TS - dep(i)); g.lineTo(dx + TS, dy + TS); }
    if (side === 2) { g.moveTo(dx, dy); for (let i = 0; i <= n; i++) g.lineTo(dx + dep(i), dy + i * TS / n); g.lineTo(dx, dy + TS); }
    if (side === 3) { g.moveTo(dx + TS, dy); for (let i = 0; i <= n; i++) g.lineTo(dx + TS - dep(i), dy + i * TS / n); g.lineTo(dx + TS, dy + TS); }
    g.closePath();
  }
  const DECO = ['tuft_0', 'tuft_1', 'tuft_2', 'tuft_3', 'tuft_4', 'tuft_5', 'tuft_6', 'tuft_7', 'tuft_8', 'tuft_9', 'tuft_10', 'tuft_11', 'tuft_12', 'tuft_13', 'tuft_14', 'tuft_15'];
  const DECO_F = ['fern_a', 'fern_b', 'fern_c', 'fern_d', 'mush_a', 'mush_b', 'mush_c', 'mush_d', 'mush_e', 'shrub_s', 'shrub_t'];
  let maskC = null, layC = null, pats = {};
  function pattern(g, key) {
    if (pats[key]) return pats[key];
    const c = document.createElement('canvas'); c.width = c.height = 64; const cg = c.getContext('2d'); cg.imageSmoothingEnabled = false;
    if (key === 'dirt') { A.tile(cg, 'x', 'dirt_1', 0, 0, 32); A.tile(cg, 'x', 'dirt_2', 32, 0, 32); A.tile(cg, 'x', 'dirt_2', 0, 32, 32); A.tile(cg, 'x', 'dirt_1', 32, 32, 32); }
    else for (let k = 0; k < 4; k++) A.tile(cg, 'x', 'cobble', (k % 2) * 32, (k >> 1) * 32, 32);
    return pats[key] = g.createPattern(c, 'repeat');
  }
  function pathLayer(g, st, x0, y0, lo, span, key) {
    const W2 = CH + 2;
    if (!maskC) { maskC = document.createElement('canvas'); maskC.width = maskC.height = W2; layC = document.createElement('canvas'); layC.width = layC.height = CH * TS; }
    const mg = maskC.getContext('2d'); const im = mg.createImageData(W2, W2); let any = false;
    for (let j = 0; j < W2; j++) for (let i = 0; i < W2; i++) {
      const x = x0 + i - 1, y = y0 + j - 1; if (x < 0 || y < 0 || x >= N || y >= M) continue;
      const k = y * N + x; if (st.terrain[k] === T.WATER) continue;
      const a = Math.max(0, Math.min(1, (st.wear[k] - lo) / span)); if (a > 0) any = true;
      im.data[(j * W2 + i) * 4 + 3] = Math.round(a * 235);
    }
    if (!any) return;
    mg.putImageData(im, 0, 0);
    const lg = layC.getContext('2d'); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, layC.width, layC.height);
    lg.fillStyle = pattern(lg, key); lg.fillRect(0, 0, layC.width, layC.height);
    lg.globalCompositeOperation = 'destination-in'; lg.imageSmoothingEnabled = true; lg.drawImage(maskC, 0, 0, W2, W2, -TS, -TS, W2 * TS, W2 * TS);
    lg.globalCompositeOperation = 'source-over';
    g.drawImage(layC, 0, 0);
  }
  function drawChunk(st, cx, cy) {
    let c = chunks[cx + ',' + cy];
    if (!c) { c = document.createElement('canvas'); c.width = c.height = CH * TS; chunks[cx + ',' + cy] = c; }
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const x0 = cx * CH, y0 = cy * CH;
    const tAt = (x, y) => (x < 0 || y < 0 || x >= N || y >= M) ? T.GRASS : st.terrain[y * N + x];
    for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) groundTex(g, st, tAt(x, y), x, y, (x - x0) * TS, (y - y0) * TS);
    // Soft edges: a higher-rank neighbour spills a wobbly strip into this tile.
    for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) {
      const t = tAt(x, y), dx = (x - x0) * TS, dy = (y - y0) * TS;
      const nb = [tAt(x, y - 1), tAt(x, y + 1), tAt(x - 1, y), tAt(x + 1, y)];
      for (let s = 0; s < 4; s++) if (rank(nb[s]) > rank(t)) { g.save(); band(g, s, dx, dy, x, y); g.clip(); groundTex(g, st, nb[s], x, y, dx, dy); g.restore(); }
      if (t === T.WATER) for (let s = 0; s < 4; s++) if (nb[s] !== T.WATER) { g.fillStyle = 'rgba(220,240,255,0.35)'; const k = 3; if (s === 0) g.fillRect(dx, dy + 8, TS, 1); if (s === 1) g.fillRect(dx, dy + TS - 9, TS, 1); if (s === 2) g.fillRect(dx + 8, dy, 1, TS); if (s === 3) g.fillRect(dx + TS - 9, dy, 1, TS); void k; }
    }
    // Worn paths: a smoothed wear mask cuts dirt (and later stone road) out of a texture layer.
    pathLayer(g, st, x0, y0, 25, 45, H(cx, cy, 1) < 2 ? 'dirt' : 'dirt');
    if (st.techs.roads) pathLayer(g, st, x0, y0, 60, 25, 'cobble');
    // Ground clutter (purely visual).
    for (let y = y0; y < y0 + CH; y++) for (let x = x0; x < x0 + CH; x++) {
      const i = y * N + x, t = st.terrain[i]; if (st._.nodeAt[i] || st.wear[i] > 25) continue;
      const h = H(x, y, 31), dx = (x - x0) * TS, dy = (y - y0) * TS;
      if ((t === T.GRASS || t === T.MEADOW) && h < 0.22) A.draw(g, 't', DECO[Math.floor(H(x, y, 2) * 16)], dx + 6 + H(x, y, 4) * 20, dy + 12 + H(x, y, 6) * 18, 1);
      else if (t === T.FOREST && h < 0.3) A.draw(g, 't', DECO_F[Math.floor(H(x, y, 2) * DECO_F.length)], dx + 8 + H(x, y, 4) * 16, dy + 16 + H(x, y, 6) * 14, 1);
      else if (t === T.SAND && h < 0.08) A.draw(g, 't', h < 0.04 ? 'pebble_a' : 'pebble_c', dx + 16, dy + 22, 1);
      else if (t === T.STONE && h < 0.2) A.draw(g, 't', ['stone_a', 'stone_b', 'pebble_b'][Math.floor(H(x, y, 2) * 3)], dx + 16, dy + 22, 1);
      if (t === T.SAND && h > 0.85) { for (let s = 0; s < 4; s++) { const nx = x + [0, 0, -1, 1][s], ny = y + [-1, 1, 0, 0][s]; if (nx >= 0 && ny >= 0 && nx < N && ny < M && st.terrain[ny * N + nx] === T.WATER) { A.draw(g, 't', ['reeds_a', 'reeds_b', 'reeds_c', 'reeds_d'][Math.floor(H(x, y, 8) * 4)], dx + 16, dy + 26, 1); break; } } }
    }
    chunkDirty.delete(cx + ',' + cy);
    return c;
  }
  function buildTint(st) {
    tintG.clearRect(0, 0, N, M);
    const im = tintG.createImageData(N, M);
    for (let i = 0; i < N * M; i++) {
      const t = st.terrain[i];
      if (t === T.FOREST) { im.data[i * 4] = 8; im.data[i * 4 + 1] = 28; im.data[i * 4 + 2] = 14; im.data[i * 4 + 3] = 96; }
      else if (t === T.MEADOW) { im.data[i * 4] = 230; im.data[i * 4 + 1] = 200; im.data[i * 4 + 2] = 80; im.data[i * 4 + 3] = 26; }
    }
    tintG.putImageData(im, 0, 0); R.tintBuilt = true;
  }
  function buildFog(st) {
    const im = fogG.createImageData(N, M);
    for (let i = 0; i < N * M; i++) { im.data[i * 4] = 4; im.data[i * 4 + 1] = 6; im.data[i * 4 + 2] = 10; im.data[i * 4 + 3] = st.fog[i] ? 0 : 255; }
    fogG.putImageData(im, 0, 0); st._.fogDirty = false;
  }

  // ---- Objects ------------------------------------------------------------------------------
  const TREES_F = ['tree_a', 'tree_b', 'tree_c', 'tree_dark_a', 'tree_dark_b', 'pine_a', 'pine_b'];
  const TREES_G = ['tree_a', 'tree_b', 'tree_c', 'tree_young', 'tree_gold_a'];
  const ROCKS = ['rock_big', 'rock_dark', 'fv_rock_mossy', 'rock_a', 'rock_b', 'rock_c', 'rock_m1', 'fv_boulder'];
  function treeKey(st, n) { const forest = st.terrain[n.y * N + n.x] === T.FOREST; const arr = forest ? TREES_F : TREES_G; return arr[n.v % arr.length]; }
  function drawNode(g, st, n, survivorsNear) {
    const x = n.x * TS + 16, y = (n.y + 1) * TS - 2;
    if (n.type === 'tree') {
      const k = treeKey(st, n); const sz = A.size('t', k);
      let alpha = 1;
      for (const u of survivorsNear) if (Math.abs(u.x - x) < sz.w * 0.42 && u.y < y - 6 && u.y > y - sz.h + 10) { alpha = 0.55; break; }
      const shake = n.hitT > 0 ? Math.sin(R.time * 60) * 1.2 : 0;
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x, y - 2, 16, 6, 0, 0, Math.PI * 2); g.fill();
      A.draw(g, 't', k, x + shake, y + 2, 1, alpha);
    } else if (n.type === 'rock') { A.draw(g, 't', ROCKS[n.v % ROCKS.length], x, y + 2, n.amt < n.max * 0.4 ? 0.8 : 1); }
    else if (n.type === 'bush') { A.draw(g, 'x', n.amt >= 2 ? (n.v % 2 ? 'berry_blue' : 'berry_red') : 'bush_green_fv', x, y + 2, 1); }
    else if (n.type === 'scrap') { A.draw(g, 't', 'ruin_stone_b', x, y + 2, 1); A.draw(g, 't', 'crate_b', x + 8, y - 2, 0.7); if (Math.sin(R.time * 3 + n.x) > 0.92) R.addFx('sparkles', x, y - 18, 0.6); }
  }
  const RUIN = [[['t', 'ruin_wall', 0, 0, 1], ['t', 'pillar_broken', 50, 4, 1]], [['t', 'ruin_pillar', -20, 0, 1], ['t', 'pillar_broken', 18, 6, 1], ['t', 'slabs', 0, 14, 1]], [['t', 'monolith_b', -14, 0, 1], ['t', 'monolith_a', 14, 4, 1], ['t', 'monolith_c', 0, 10, 1]], [['t', 'arch_a', 0, 2, 1], ['t', 'ruin_stone_a', -40, 10, 1]]];

  function drawBuilding(g, st, b, sel) {
    const B = D.B[b.type]; const bx = (b.x + b.w / 2) * TS, by = (b.y + b.h) * TS;
    const parts = B.parts[b.tier];
    // Ground under the building.
    if (b.type === 'farm') drawField(g, st, b);
    else if (!b.wall) { g.fillStyle = 'rgba(40,30,20,0.18)'; g.beginPath(); g.ellipse(bx, by - b.h * TS * 0.42, b.w * TS * 0.5, b.h * TS * 0.42, 0, 0, Math.PI * 2); g.fill(); }
    if (b.state === 'site') {
      g.strokeStyle = 'rgba(255,230,160,0.55)'; g.setLineDash([4, 3]); g.lineWidth = 1; g.strokeRect(b.x * TS + 1, b.y * TS + 1, b.w * TS - 2, b.h * TS - 2); g.setLineDash([]);
      for (const [cx, cy] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]) { g.fillStyle = '#5a3d22'; g.fillRect(cx * TS - 2, cy * TS - 10, 3, 10); }
      // The building rises from the ground as it is built.
      const p = Math.max(0.02, b.prog);
      let top = 0; for (const q of parts) { const s = q[0] === 'f' ? { h: 30 } : A.size(q[0], q[1], q[4]); top = Math.max(top, s.h - q[3]); }
      g.save(); g.beginPath(); g.rect(bx - b.w * TS, by - top * p - 2, b.w * TS * 2, top * p + 30); g.clip();
      drawParts(g, parts, bx, by, 0.85, true);
      g.restore();
      scaffold(g, b, bx, by, Math.max(18, top * p));
      bar(g, bx, by - Math.max(24, top * p) - 8, b.prog, '#e8c050');
      return;
    }
    drawParts(g, parts, bx, by, 1, false, b);
    if (b.hitT > 0) { b.hitT -= 1 / 60; }
    if (b.up) { scaffold(g, b, bx, by, 40); bar(g, bx, by - 60, b.prog, '#e8c050'); }
    if (S.isNight(st) && D.B[b.type].beds && S.present(st).some(u => u.inside === b.id)) { g.font = '8px Adventurer'; g.fillStyle = 'rgba(220,230,255,0.8)'; g.textAlign = 'center'; const p = (R.time * 0.6 + b.x) % 1; g.globalAlpha = 1 - p; g.fillText('z', bx + 10 + p * 6, by - b.h * TS - 4 - p * 14); g.globalAlpha = 1; }
    // Damage: smoke, then fire.
    const f = b.hp / b.maxHp;
    if (f < 0.55 && !b.wall) A.drawFx(g, 'smoke_puff', (R.time + b.x) % A.fxLen('smoke_puff'), bx - 8, by - b.h * TS * 0.7, 1.2, 0.7);
    if (f < 0.3) A.drawFx(g, 'flame', (R.time * 1.1 + b.y) % Math.max(0.1, A.fxLen('flame')), bx + 6, by - b.h * TS * 0.5, 1.3);
    if ((f < 0.98 && f > 0) || sel) bar(g, bx, by - b.h * TS - 22, f, f > 0.5 ? '#6fd26f' : f > 0.25 ? '#e8c050' : '#e05040');
  }
  function drawParts(g, parts, bx, by, alpha, ghost, b) {
    for (const p of parts) {
      if (p[0] === 'f') { if (!ghost) { A.drawFx(g, p[1], R.time % Math.max(0.1, A.fxLen(p[1])), bx + p[2], by + p[3] - 12 * p[4], p[4], alpha); } else A.drawFx(g, p[1], 0, bx + p[2], by + p[3] - 12 * p[4], p[4], alpha * 0.6); continue; }
      A.draw(g, p[0], p[1], bx + p[2], by + p[3], p[4], alpha);
    }
    if (b && b.hitT > 0) { /* hit flash handled by fx */ }
  }
  function scaffold(g, b, bx, by, h) {
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 2;
    const x0 = b.x * TS + 4, x1 = (b.x + b.w) * TS - 4, yb = by - 2, yt = by - h;
    g.beginPath(); g.moveTo(x0, yb); g.lineTo(x0, yt); g.moveTo(x1, yb); g.lineTo(x1, yt);
    for (let y = yb - 14; y > yt; y -= 16) { g.moveTo(x0, y); g.lineTo(x1, y); }
    g.moveTo(x0, yb); g.lineTo(x1, Math.max(yt, yb - 30)); g.stroke();
  }
  function bar(g, x, y, f, col) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 14, y, 28, 4); g.fillStyle = col; g.fillRect(x - 13, y + 1, Math.max(0, 26 * Math.min(1, f)), 2); }
  function drawField(g, st, b) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { A.tile(g, 'x', (x + y) % 2 ? 'dirt_1' : 'dirt_2', x * TS, y * TS, TS); g.fillStyle = 'rgba(60,35,15,0.35)'; for (let k = 4; k < 32; k += 8) g.fillRect(x * TS, y * TS + k, TS, 2); }
    if (b.state !== 'done' || !b.crop) return;
    const c = b.crop;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) for (let k = 0; k < 2; k++) {
      const px = x * TS + 8 + k * 16, py = y * TS + 24;
      if (c.stage === 'growing') { if (c.g < 0.45) A.draw(g, 't', 'tuft_' + ((x + y + k) % 16), px, py, 1); else A.draw(g, 't', 'shrub_t', px, py, 0.6 + c.g * 0.4); }
      else if (c.stage === 'ripe') A.draw(g, 't', 'bush_gold', px, py + 2, 0.42);
    }
  }

  function clipFor(u) {
    if (u.side === 'e') {
      const F = D.FOE[u.kind];
      if (u.dead) return 'Die';
      if (u.hurtT > 0.05 && u.anim !== 'attack') return 'TakeDamage';
      return { idle: 'Idle', walk: 'Walk', run: 'Run', attack: F.clip, work: F.clip }[u.anim] || 'Idle';
    }
    if (u.dead || u.downed > 0) return 'Die';
    if (u.hurtT > 0.05 && u.anim !== 'attack') return 'TakeDamage';
    if (!u.gear) return { walk: 'Walk', run: 'Run', crouch: 'CrouchIdle' }[u.anim] || 'Idle';
    const armed = D.ARMED[u.set];
    const atk = D.WEAPON[u.gear.w].ranged ? (A.cast[u.set] && A.cast[u.set].anims.Attack3 && (u.set === 'poacher') ? 'Attack3' : 'Attack5') : armed ? 'Attack1' : 'Attack5';
    return { idle: 'Idle', walk: 'Walk', run: 'Run', attack: atk, work: 'Attack5', crouch: 'CrouchIdle', down: 'Die' }[u.anim] || 'Idle';
  }
  function drawUnit(g, st, u, view) {
    let x = u.x, y = u.y;
    if (u.onTower && st.buildings[u.onTower]) { const b = st.buildings[u.onTower]; const k = st.units ? S.present(st).filter(m => m.onTower === b.id).indexOf(u) : 0; x = (b.x + b.w / 2) * TS + (k ? 16 : -10) * (b.w > 2 ? 1 : 0.6); y = (b.y + b.h) * TS - (D.B[b.type].platform || [92])[b.tier]; }
    if (u.side === 'a') {
      const k = u.kind === 'deer' ? 1.15 : 0.8; const bob = u.anim === 'walk' || u.anim === 'run' ? Math.abs(Math.sin(R.time * 14 + x)) * 2 : 0;
      if (u.dead) { g.save(); g.globalAlpha = Math.max(0, 1 - (u.deadT || 0) / 6); A.draw(g, 'x', u.kind, x, y + 4, k * 0.95, 1, Math.cos(u.dir) > 0); g.restore(); return; }
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(x, y + 2, 8 * k, 3, 0, 0, Math.PI * 2); g.fill();
      A.draw(g, 'x', u.kind, x, y + 4 - bob, k, 1, Math.cos(u.dir) > 0);
      return;
    }
    const sel = view.sel && view.sel.uid === u.id;
    const scale = u.side === 'e' ? (D.FOE[u.kind].scale || 1) : 1;
    // Shadow, selection ring.
    if (!u.dead) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(x, y + 1, 9 * scale, 3.5 * scale, 0, 0, Math.PI * 2); g.fill(); }
    if (sel) { g.strokeStyle = '#ffd36a'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y + 1, 13, 5.5, 0, 0, Math.PI * 2); g.stroke(); }
    if (u.side === 's' && u.downed > 0) { g.strokeStyle = 'rgba(255,60,40,' + (0.5 + 0.5 * Math.sin(R.time * 8)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(x, y - 4, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (u.downed / 30)); g.stroke(); }
    const clip = clipFor(u);
    let t = u.at;
    if (clip === 'Die') t = u.dead ? (u.deadT || 0) + 0.01 : 10;
    const fr = A.frame(clip, clip === 'Walk' || clip === 'Run' ? R.time + (x + y) * 0.001 : t);
    const set = u.set;
    const alpha = u.dead ? Math.max(0, 1 - Math.max(0, (u.deadT || 0) - 3) / 3) : 1;
    const opts = { alpha, flash: u.hurtT > 0 ? 0.8 : 0 };
    if (u.side === 'e' && S.isNight(st)) { opts.tint = '#401020'; opts.tintA = 0.25; }
    if (!A.drawActor(g, set, clip, fr, u.dir, x, y, scale, opts)) { g.fillStyle = u.side === 'e' ? '#402020' : '#30302a'; g.fillRect(x - 5, y - 30, 10, 30); }
    if (u.dead) return;
    // Overlays: carried load, health, status.
    if (u.carry && u.carry.amt > 0) { if (u.carry.res === 'wood') A.draw(g, 't', 'log_a', x, y - 38, 0.4); else if (u.carry.res === 'stone') A.draw(g, 't', 'rock_m3', x, y - 38, 0.6); else A.icon(g, u.carry.res === 'water' ? 'water' : u.carry.res === 'metal' ? 'anvil' : 'meat', x - 6, y - 50, 12); }
    if (u.side === 'e') { if (u.hp < u.maxHp || S.foes(st).length < 30) { const big = D.FOE[u.kind].boss; const w = big ? 40 : 20; g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillRect(x - w / 2, y - 46 * scale, w, 3); g.fillStyle = '#e04838'; g.fillRect(x - w / 2 + 1, y - 46 * scale + 1, (w - 2) * Math.max(0, u.hp / u.maxHp), 1.5); } if (u.carry) A.draw(g, 'x', 'berry_red', x + 8, y - 38, 0.5); }
    else if (u.hp < u.maxHp - 1 || sel) { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - 10, y - 46, 20, 3); g.fillStyle = u.hp / u.maxHp > 0.5 ? '#6fd26f' : '#e8c050'; g.fillRect(x - 9, y - 45, 18 * Math.max(0, u.hp / u.maxHp), 1.5); }
    if (u.side === 's' && u.injury && !u.downed) { g.fillStyle = '#e05040'; g.fillRect(x + 9, y - 42, 2, 6); g.fillRect(x + 7, y - 40, 6, 2); }
    if (u.stranger) { g.font = '10px Adventurer'; g.fillStyle = '#ffe9a8'; g.textAlign = 'center'; g.fillText('?', x, y - 46 + Math.sin(R.time * 4) * 2); }
    if (u.side === 'n') { A.icon(g, 'trade', x - 7, y - 60 + Math.sin(R.time * 3) * 2, 14); if (u.arrived) A.draw(g, 't', 'fv_hand_cart', x + 22, y + 4, 1); }
    if (sel && u.name) { g.font = '8px Adventurer'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,0.6)'; const w = g.measureText(u.name).width; g.fillRect(x - w / 2 - 3, y - 60, w + 6, 10); g.fillStyle = '#ffe9a8'; g.fillText(u.name, x, y - 52); }
  }

  // ---- Frame ------------------------------------------------------------------------------
  R.frame = function (st, dt, view) {
    R.time += dt;
    R.fogA += (R.fogTarget - R.fogA) * Math.min(1, dt * 0.8);
    const c = R.cam, dpr = R.dpr;
    if (!R.tintBuilt) buildTint(st);
    if (st._.fogDirty) buildFog(st);
    for (const i of st._.dirty) { const x = i % N, y = Math.floor(i / N); for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < M) chunkDirty.add(Math.floor(xx / CH) + ',' + Math.floor(yy / CH)); } }
    st._.dirty.clear();
    let sx = 0, sy = 0; if (R.shake > 0) { R.shake = Math.max(0, R.shake - dt * 10); sx = (Math.random() - 0.5) * R.shake * 4; sy = (Math.random() - 0.5) * R.shake * 4; }
    const z = c.z * dpr;
    const ox = Math.round(R.W * dpr / 2 - c.x * z + sx), oy = Math.round(R.H * dpr / 2 - c.y * z + sy);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(z, 0, 0, z, ox, oy);
    const vw = R.W / c.z, vh = R.H / c.z, wx0 = c.x - vw / 2, wy0 = c.y - vh / 2;
    // Terrain.
    const cx0 = Math.max(0, Math.floor(wx0 / (CH * TS))), cx1 = Math.min(N / CH - 1, Math.floor((wx0 + vw) / (CH * TS)));
    const cy0 = Math.max(0, Math.floor(wy0 / (CH * TS))), cy1 = Math.min(M / CH - 1, Math.floor((wy0 + vh) / (CH * TS)));
    let built = 0;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const k = cx + ',' + cy; let ch = chunks[k];
      if ((!ch || chunkDirty.has(k)) && built < 3) { ch = drawChunk(st, cx, cy); built++; }
      if (ch) ctx.drawImage(ch, cx * CH * TS, cy * CH * TS);
    }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(tintC, 0, 0, N * TS, M * TS); ctx.imageSmoothingEnabled = false;
    const tx0 = Math.max(0, Math.floor(wx0 / TS) - 2), tx1 = Math.min(N - 1, Math.ceil((wx0 + vw) / TS) + 2);
    const ty0 = Math.max(0, Math.floor(wy0 / TS) - 2), ty1 = Math.min(M - 1, Math.ceil((wy0 + vh) / TS) + 6);
    // Water shimmer.
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (st.terrain[y * N + x] !== T.WATER) continue;
      const h = H(x, y, 77); const p = (R.time * 0.6 + h * 6) % 6;
      if (p < 2) { ctx.fillStyle = 'rgba(200,235,255,' + (0.25 * (1 - Math.abs(p - 1))) + ')'; ctx.fillRect(x * TS + 4 + h * 18, y * TS + 6 + ((h * 97) % 1) * 18, 8, 1); }
    }
    // Clearing beacon (before the camp exists).
    if (!st.camp) { const cx = (st.clearing.x + 0.5) * TS, cy = (st.clearing.y + 0.5) * TS; const p = 0.5 + 0.5 * Math.sin(R.time * 3); ctx.strokeStyle = 'rgba(255,220,140,' + (0.35 + p * 0.4) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, 52 + p * 6, 26 + p * 3, 0, 0, Math.PI * 2); ctx.stroke(); if (Math.random() < 0.15) R.addFx('motes', cx + (Math.random() - 0.5) * 80, cy + (Math.random() - 0.5) * 40, 1); }
    // Deco on the ground: stumps, rubble, graves.
    for (const d of st.deco) { if (d.x < tx0 || d.x > tx1 || d.y < ty0 || d.y > ty1) continue; if (d.k === 'stump') A.draw(ctx, 'p', 'stump', d.x * TS + 16, (d.y + 1) * TS - 6, 1); else A.draw(ctx, 't', 'ruin_stone_c', d.x * TS + 16, (d.y + 1) * TS, 1); }
    // Placement ghost footprint.
    if (view.ghost) drawGhostFloor(ctx, st, view.ghost);
    // Selected building footprint, tower range.
    if (view.sel && view.sel.bid && st.buildings[view.sel.bid]) { const b = st.buildings[view.sel.bid]; ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 1.5; ctx.strokeRect(b.x * TS, b.y * TS, b.w * TS, b.h * TS); if (D.B[b.type].range) { ctx.strokeStyle = 'rgba(255,211,106,0.4)'; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc((b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS, D.B[b.type].range[b.tier] * TS, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } if (b.type === 'heart') { ctx.strokeStyle = 'rgba(255,170,80,0.25)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc((b.x + 2.5) * TS, (b.y + 1.5) * TS, D.B.heart.light[b.tier] * TS, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); } }
    // Collect and sort visible objects.
    const objs = [];
    const inView = (x, y, m) => x > wx0 - m && x < wx0 + vw + m && y > wy0 - m && y < wy0 + vh + m * 3;
    const surv = S.present(st).filter(u => !u.inside);
    for (const id in st.nodes) { const n = st.nodes[id]; if (n.x < tx0 || n.x > tx1 || n.y < ty0 || n.y > ty1) continue; objs.push({ k: (n.y + 1) * TS - 3, n }); }
    for (const r of st.ruins) if (r.x >= tx0 - 2 && r.x <= tx1 + 2 && r.y >= ty0 && r.y <= ty1) objs.push({ k: (r.y + 1) * TS, r });
    for (const g of st.graves) if (g.x >= tx0 && g.x <= tx1 && g.y >= ty0 && g.y <= ty1) objs.push({ k: (g.y + 1) * TS, grave: g });
    for (const id in st.buildings) { const b = st.buildings[id]; if (b.x + b.w < tx0 - 3 || b.x > tx1 + 3 || b.y > ty1 || b.y + b.h < ty0 - 1) continue; objs.push({ k: (b.y + b.h) * TS - (b.type === 'farm' ? 200 : 0), b }); }
    for (const id in st.units) { const u = st.units[id]; if (u.inside || u.away) continue; if (!inView(u.x, u.y, 60)) continue; let k = u.y; if (u.onTower && st.buildings[u.onTower]) { const b = st.buildings[u.onTower]; k = (b.y + b.h) * TS + 0.5; } objs.push({ k, u }); }
    objs.sort((a, b) => a.k - b.k);
    // Warm glow under fires (drawn before sprites).
    lightsList.length = 0; collectLights(st);
    if (S.light(st) < 0.9) { ctx.globalCompositeOperation = 'lighter'; for (const L of lightsList) { const gr = ctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, L.r * 0.7); gr.addColorStop(0, 'rgba(255,150,60,' + (0.22 * (1 - S.light(st))) + ')'); gr.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = gr; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); } ctx.globalCompositeOperation = 'source-over'; }
    for (const o of objs) {
      if (o.n) drawNode(ctx, st, o.n, surv);
      else if (o.b) drawBuilding(ctx, st, o.b, view.sel && view.sel.bid === o.b.id);
      else if (o.u) drawUnit(ctx, st, o.u, view);
      else if (o.r) { for (const p of RUIN[o.r.kind % RUIN.length]) A.draw(ctx, p[0], p[1], (o.r.x + 0.5) * TS + p[2], (o.r.y + 1) * TS + p[3], p[4]); }
      else if (o.grave) A.draw(ctx, 't', 'grave_cross', (o.grave.x + 0.5) * TS, (o.grave.y + 1) * TS, 1);
    }
    if (view.ghost) drawGhostParts(ctx, st, view.ghost);
    // Life: fireflies at night, birds by day.
    const Lt = S.light(st);
    if (Lt < 0.5 && Math.random() < dt * 2.5) { const x = wx0 + Math.random() * vw, y = wy0 + Math.random() * vh; const t = st.terrain[Math.floor(y / TS) * N + Math.floor(x / TS)]; if (t === T.FOREST || t === T.MEADOW || t === T.GRASS) R.addFx('fireflies', x, y, 1, { life: 4, alpha: 0.9 }); }
    if (Lt > 0.8 && !st.weather.rain && Math.random() < dt * 0.04 && R.birds.length < 2) { const dir = Math.random() < 0.5 ? 1 : -1; const fl = { x: dir > 0 ? wx0 - 60 : wx0 + vw + 60, y: wy0 + Math.random() * vh * 0.7, vx: dir * (60 + Math.random() * 30), vy: (Math.random() - 0.5) * 20, n: 4 + Math.floor(Math.random() * 4), t: 0 }; R.birds.push(fl); }
    for (let i = R.birds.length - 1; i >= 0; i--) { const f = R.birds[i]; f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t > 30) { R.birds.splice(i, 1); continue; }
      for (let k = 0; k < f.n; k++) { const bx = f.x - Math.sign(f.vx) * (k % 2 ? k * 9 : k * 6) , by = f.y + (k % 2 ? k * 5 : -k * 4); const w = 3 + Math.sin(R.time * 14 + k) * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(bx + 50, by + 70, 4, 2);
        ctx.strokeStyle = 'rgba(30,25,20,0.85)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx - 4, by - w + 2); ctx.lineTo(bx, by); ctx.lineTo(bx + 4, by - w + 2); ctx.stroke(); } }
    // Projectiles.
    for (const p of st.proj) {
      if (p.kind === 'rock') { ctx.fillStyle = '#9a9488'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a || 0);
      if (p.kind === 'dark') A.drawFx(ctx, 'arcane_orb', R.time % 0.5, 0, 0, 0.8); else A.drawFx(ctx, p.kind === 'dagger' ? 'dagger' : p.kind === 'bolt' ? 'spear' : 'arrow', 0, 0, 0, p.kind === 'bolt' ? 1.6 : 1);
      ctx.restore();
    }
    // Effects.
    for (let i = R.fx.length - 1; i >= 0; i--) {
      const f = R.fx[i]; f.t += dt;
      if (!A.drawFx(ctx, f.name, f.t, f.x, f.y, f.k, f.alpha) || (f.life && f.t > f.life)) R.fx.splice(i, 1);
    }
    // Tap markers.
    for (let i = R.marks.length - 1; i >= 0; i--) { const m = R.marks[i]; m.t += dt; if (m.t > 0.6) { R.marks.splice(i, 1); continue; } ctx.strokeStyle = m.col || 'rgba(255,230,150,' + (1 - m.t / 0.6) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(m.x, m.y, 6 + m.t * 18, 3 + m.t * 9, 0, 0, Math.PI * 2); ctx.stroke(); }
    // Floating texts.
    ctx.textAlign = 'center';
    for (let i = R.texts.length - 1; i >= 0; i--) { const t = R.texts[i]; t.t += dt; if (t.t > 1.3) { R.texts.splice(i, 1); continue; } ctx.font = t.size + 'px Adventurer'; ctx.globalAlpha = Math.min(1, 2.2 - t.t * 1.7); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(t.text, t.x + 0.7, t.y - t.t * 22 + 0.7); ctx.fillStyle = t.col; ctx.fillText(t.text, t.x, t.y - t.t * 22); ctx.globalAlpha = 1; }
    // Fog of war.
    if (R.fogA > 0.01) { ctx.globalAlpha = R.fogA; ctx.imageSmoothingEnabled = true; ctx.drawImage(fogC, 0, 0, N * TS, M * TS); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; }
    // Screen-space passes.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawLighting(st);
    if (st.weather.rain) drawRain(dt);
    if (R.letter > 0) { const h = Math.round(canvas.height * 0.11 * R.letter); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, h); ctx.fillRect(0, canvas.height - h, canvas.width, h); }
    if (R.fade > 0) { ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, R.fade) + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  };

  const lightsList = [];
  function collectLights(st) {
    const h = S.heart(st);
    if (h && h.state === 'done') lightsList.push({ x: (h.x + 2.5) * TS, y: (h.y + 1.3) * TS, r: D.B.heart.light[h.tier] * TS * 0.75 * (1 + Math.sin(R.time * 9) * 0.03 + Math.sin(R.time * 23) * 0.015) });
    for (const id in st.buildings) {
      const b = st.buildings[id]; if (b.state !== 'done' || b === h) continue;
      if (D.B[b.type].range) lightsList.push({ x: (b.x + b.w / 2) * TS, y: (b.y + 0.6) * TS, r: 3.5 * TS });
      else if (b.type === 'fountain' || b.type === 'market') lightsList.push({ x: (b.x + b.w / 2) * TS, y: (b.y + b.h) * TS - 16, r: 3 * TS });
      else if (b.type === 'cabin' || b.type === 'workshop' || b.type === 'barracks' || b.type === 'infirmary' || b.type === 'study') lightsList.push({ x: (b.x + b.w / 2) * TS, y: (b.y + b.h) * TS - 20, r: 3 * TS });
      else if (b.type === 'tent' && S.present(st).some(u => u.inside === b.id)) lightsList.push({ x: (b.x + 1) * TS, y: (b.y + 1.5) * TS, r: 1.6 * TS });
    }
    for (const id in st.units) { const u = st.units[id]; if (u.side === 'e' && !u.dead && D.FOE[u.kind].faction === 'raider') lightsList.push({ x: u.x, y: u.y - 20, r: 2.2 * TS }); if (u.side === 's' && u.job === 'guard' && !u.inside && !u.away) lightsList.push({ x: u.x, y: u.y - 20, r: 1.8 * TS }); }
    for (const f of R.fx) if (f.name === 'explosion_fire' || f.name === 'fire_burst') lightsList.push({ x: f.x, y: f.y, r: 3 * TS });
  }
  function drawLighting(st) {
    const L = S.light(st); const h = S.hour(st);
    const dusk = h > 16.5 && h < 20.5 ? Math.max(0, 1 - Math.abs(h - 18.6) / 2) : h > 4 && h < 7.5 ? Math.max(0, 1 - Math.abs(h - 5.6) / 1.6) : 0;
    if (dusk > 0) { ctx.fillStyle = 'rgba(255,110,40,' + (dusk * 0.16) + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const dark = (1 - L) * 0.78 + (st.weather.rain ? 0.08 : 0);
    if (dark <= 0.01) return;
    const lw = lightC.width, lh = lightC.height; const k = lw / R.W;
    lightG.globalCompositeOperation = 'source-over'; lightG.clearRect(0, 0, lw, lh);
    lightG.fillStyle = 'rgba(6,10,32,' + dark + ')'; lightG.fillRect(0, 0, lw, lh);
    lightG.globalCompositeOperation = 'destination-out';
    for (const Lt of lightsList) {
      const p = R.w2s(Lt.x, Lt.y); const r = Lt.r * R.cam.z * k; const x = p.x * k, y = p.y * k;
      if (x < -r || y < -r || x > lw + r || y > lh + r) continue;
      const g = lightG.createRadialGradient(x, y, r * 0.08, x, y, r); g.addColorStop(0, 'rgba(0,0,0,0.92)'); g.addColorStop(0.35, 'rgba(0,0,0,0.62)'); g.addColorStop(0.7, 'rgba(0,0,0,0.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lightG.fillStyle = g; lightG.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(lightC, 0, 0, canvas.width, canvas.height); ctx.imageSmoothingEnabled = false;
  }
  const drops = []; for (let i = 0; i < 140; i++) drops.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.6 });
  function drawRain(dt) {
    ctx.fillStyle = 'rgba(40,50,70,0.12)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(180,200,230,0.35)'; ctx.lineWidth = R.dpr; ctx.beginPath();
    for (const d of drops) { d.y += dt * 1.6 * d.s; d.x -= dt * 0.25 * d.s; if (d.y > 1) { d.y -= 1; d.x = Math.random() * 1.2; } if (d.x < 0) d.x += 1.2; const x = d.x * canvas.width, y = d.y * canvas.height; ctx.moveTo(x, y); ctx.lineTo(x - 4 * R.dpr, y + 14 * R.dpr); }
    ctx.stroke();
  }

  // ---- Placement ghost ------------------------------------------------------------------------
  function drawGhostFloor(g, st, gh) {
    const B = D.B[gh.type];
    const tiles = gh.tiles || [[gh.x, gh.y]];
    for (const [x, y] of tiles) {
      const ok = S.canPlace(st, gh.type, x, y);
      g.fillStyle = ok ? 'rgba(120,230,120,0.28)' : 'rgba(240,80,60,0.35)';
      g.fillRect(x * TS, y * TS, B.w * TS, B.h * TS);
      g.strokeStyle = ok ? 'rgba(160,255,160,0.8)' : 'rgba(255,120,100,0.9)'; g.lineWidth = 1; g.strokeRect(x * TS + 0.5, y * TS + 0.5, B.w * TS - 1, B.h * TS - 1);
    }
  }
  function drawGhostParts(g, st, gh) {
    const B = D.B[gh.type]; const tiles = gh.tiles || [[gh.x, gh.y]];
    for (const [x, y] of tiles) drawParts(g, B.parts[0], (x + B.w / 2) * TS, (y + B.h) * TS, 0.6, true);
  }

  // ---- Simulation events -> effects ---------------------------------------------------------------
  R.onEvent = function (st, e) {
    switch (e.type) {
      case 'hit': R.addFx(e.fx === 'dark_curse' ? 'dark_curse' : e.fx === 'hit_pierce' ? 'hit_pierce' : 'hit_slash', e.x, e.y, 1); R.addText('' + e.dmg, e.x, e.y - 6, e.side === 's' ? '#ff8a70' : '#fff2c0', 9); if (e.side === 's') R.shake = Math.max(R.shake, 0.6); break;
      case 'bhit': R.addFx('hit_blunt', e.x, e.y, 1.1); if (Math.random() < 0.3) R.addFx('dust_cloud', e.x, e.y + 10, 0.8); break;
      case 'fx': if (e.small && e.fx === 'leaves' && Math.random() < 0.5) break; R.addFx(e.fx, e.x, e.y, e.small ? 0.45 : 1.2, e.small ? { alpha: 0.7 } : null); break;
      case 'gain': if (e.amt > 0) R.addText('+' + e.amt + ' ' + e.res, e.x, e.y, { wood: '#e0b070', stone: '#d0d0c8', food: '#ff9a80', water: '#8fd0ff', metal: '#b8c8d8' }[e.res] || '#fff', 8); break;
      case 'built': { const b = st.buildings[e.id]; if (b) { R.addFx('dust_cloud', (b.x + b.w / 2) * TS, (b.y + b.h) * TS - 6, 1.6); R.addFx('sparkles', (b.x + b.w / 2) * TS, (b.y + b.h / 2) * TS - 16, 1.4); } break; }
      case 'death': R.shake = 1.2; break;
    }
    if (e.type === 'sfx' && e.s === 'chop') { const n = Object.values(st.nodes).find(n => n.type === 'tree' && Math.abs(n.x * TS + 16 - e.x) < 48 && Math.abs((n.y + 1) * TS - e.y) < 48); if (n) n.hitT = 0.15; }
  };
  R.tickNodes = dt => { /* hit shake decays */ };
})();
