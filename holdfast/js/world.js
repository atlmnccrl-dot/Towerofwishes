// HOLDFAST - world generation and pathfinding. Pure; runs in Node.
(function (root) {
  const HF = root.HF = root.HF || {};
  const D = HF.D;
  const W = HF.World = {};

  // ---- Random -------------------------------------------------------------------------
  W.rng = function (seed) { // mulberry32; state lives in obj.s so it can be saved
    const o = { s: seed >>> 0 };
    o.next = function () { let t = (o.s = (o.s + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    o.range = (a, b) => a + (b - a) * o.next();
    o.int = (a, b) => Math.floor(a + (b - a + 1) * o.next());
    o.pick = arr => arr[Math.floor(o.next() * arr.length)];
    o.chance = p => o.next() < p;
    return o;
  };
  W.hash = function (x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function noise(x, y, s) { // value noise
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = W.hash(xi, yi, s), b = W.hash(xi + 1, yi, s), c = W.hash(xi, yi + 1, s), d = W.hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  W.fbm = function (x, y, s, oct) { let f = 0, amp = 0.5, fr = 1, n = 0; for (let i = 0; i < (oct || 4); i++) { f += noise(x * fr, y * fr, s + i * 17) * amp; n += amp; amp *= 0.5; fr *= 2; } return f / n; };

  // ---- Generation ---------------------------------------------------------------------
  // Returns { terrain, nodes[], ruins[], animals[], clearing:{x,y}, spawns[] }.
  W.generate = function (seed) {
    const T = D.T, N = D.W, M = D.H, cx = N >> 1, cy = M >> 1;
    const r = W.rng(seed * 7 + 3);
    const terrain = new Array(N * M).fill(T.GRASS);
    const occupied = new Uint8Array(N * M);
    const nodes = [];
    const dist = (x, y) => Math.hypot(x - cx, y - cy);
    // Water: two lakes and a stream, kept away from the clearing; one pond within reach.
    const lakeS = seed + 101;
    const pond = { x: cx + 11 + r.int(0, 3), y: cy - 6 + r.int(-2, 2) };
    for (let y = 0; y < M; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, d = dist(x, y);
      const lake = W.fbm(x / 22, y / 22, lakeS, 4);
      const stream = Math.abs(Math.sin(y / 9 + seed) * 7 + (x - cx + 30) * 0.9) < 1.3 && x < cx - 18;
      const pd = Math.hypot((x - pond.x) * 1.2, y - pond.y);
      if ((lake > 0.68 && d > 16) || (stream && d > 18) || pd < 2.6 + W.fbm(x / 3, y / 3, seed, 2)) terrain[i] = T.WATER;
      else {
        const forest = W.fbm(x / 14, y / 14, seed + 7, 4) + Math.max(0, (d - 14) / 60);
        const rock = W.fbm(x / 10, y / 10, seed + 33, 3);
        const meadow = W.fbm(x / 18, y / 18, seed + 55, 3);
        if (rock > 0.69 && d > 9) terrain[i] = T.STONE;
        else if (forest > 0.56 && d > 9) terrain[i] = T.FOREST;
        else if (meadow > 0.62) terrain[i] = T.MEADOW;
      }
    }
    // Sand shores.
    for (let y = 1; y < M - 1; y++) for (let x = 1; x < N - 1; x++) {
      const i = y * N + x; if (terrain[i] === T.WATER) continue;
      for (let k = 0; k < 8; k++) { const dx = [1, -1, 0, 0, 1, 1, -1, -1][k], dy = [0, 0, 1, -1, 1, -1, 1, -1][k]; if (terrain[(y + dy) * N + x + dx] === T.WATER) { terrain[i] = T.SAND; break; } }
    }
    const free = (x, y) => x > 1 && y > 1 && x < N - 2 && y < M - 2 && terrain[y * N + x] !== T.WATER && !occupied[y * N + x];
    let nid = 1;
    const addNode = (type, x, y, extra) => { if (!free(x, y)) return null; occupied[y * N + x] = 1; const n = Object.assign({ id: 'n' + (nid++), type, x, y, v: r.int(0, 7) }, extra); nodes.push(n); return n; };
    // Trees, rocks, bushes.
    for (let y = 2; y < M - 2; y++) for (let x = 2; x < N - 2; x++) {
      const i = y * N + x, d = dist(x, y), t = terrain[i];
      if (d < 7.5) continue;
      if (t === T.FOREST && r.chance(0.42)) addNode('tree', x, y, { amt: 30, max: 30 });
      else if ((t === T.GRASS || t === T.MEADOW) && r.chance(d < 14 ? 0.035 : 0.06)) addNode('tree', x, y, { amt: 30, max: 30 });
      else if (t === T.STONE && r.chance(0.22)) addNode('rock', x, y, { amt: 40, max: 40 });
      else if (t !== T.SAND && r.chance(0.006)) addNode('rock', x, y, { amt: 40, max: 40 });
      else if ((t === T.GRASS || t === T.MEADOW) && r.chance(0.008)) addNode('bush', x, y, { amt: 8, max: 8, regrow: 0 });
    }
    // Guarantees near the clearing: trees, rocks, berry bushes the tutorial can reach.
    const ring = (type, n, rmin, rmax, extra) => { let k = 0, tries = 0; while (k < n && tries++ < 500) { const a = r.next() * Math.PI * 2, rr = r.range(rmin, rmax); if (addNode(type, Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), Object.assign({}, extra))) k++; } };
    ring('tree', 10, 8, 11, { amt: 30, max: 30 });
    ring('rock', 4, 8, 11, { amt: 40, max: 40 });
    ring('bush', 5, 7.5, 10, { amt: 8, max: 8, regrow: 0 });
    // Ruins: landmarks with salvage (metal).
    const ruins = [];
    for (let k = 0; k < 5; k++) {
      let tries = 0;
      while (tries++ < 200) {
        const a = r.next() * Math.PI * 2, rr = r.range(18, 40), x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr);
        if (!free(x, y) || !free(x + 1, y) || !free(x - 1, y)) continue;
        ruins.push({ x, y, kind: r.int(0, 3) });
        addNode('scrap', x, y + 1, { amt: 25, max: 25 });
        for (let j = 0; j < 3; j++) { const ox = x + r.int(-3, 3), oy = y + r.int(-3, 3); if (free(ox, oy)) occupied[oy * N + ox] = 2; }
        break;
      }
    }
    // Wildlife.
    const animals = [];
    for (let k = 0; k < 14; k++) {
      const a = r.next() * Math.PI * 2, rr = r.range(14, 42), x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr);
      if (free(x, y)) animals.push({ kind: k % 3 === 0 ? 'deer' : 'rabbit', x, y });
    }
    return { terrain, nodes, ruins, animals, clearing: { x: cx, y: cy }, pond, decoBlock: occupied };
  };

  // ---- Pathfinding (A*, 8 directions, no corner cutting) ------------------------------------
  // cost(i) returns: <0 impassable, else step cost multiplier. goal: { x0, y0, x1, y1, adj } -
  // reached inside the rect, or (adj) on a tile touching it.
  const N8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let g = null, f = null, from = null, stamp = null, closed = null, cur = 0, heap = null;
  function ensure(n) { if (!g || g.length < n) { g = new Float32Array(n); f = new Float32Array(n); from = new Int32Array(n); stamp = new Uint32Array(n); closed = new Uint32Array(n); heap = new Int32Array(n * 4); } }
  W.path = function (w, h, sx, sy, goal, cost, maxIter) {
    const n = w * h; ensure(n); cur++;
    const inGoal = (x, y) => goal.adj
      ? (x >= goal.x0 - 1 && x <= goal.x1 + 1 && y >= goal.y0 - 1 && y <= goal.y1 + 1 && !(x >= goal.x0 && x <= goal.x1 && y >= goal.y0 && y <= goal.y1))
      : (x >= goal.x0 && x <= goal.x1 && y >= goal.y0 && y <= goal.y1);
    const hx = (x, y) => { const dx = Math.max(goal.x0 - x, 0, x - goal.x1), dy = Math.max(goal.y0 - y, 0, y - goal.y1); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
    const s = sy * w + sx;
    if (inGoal(sx, sy)) return [];
    let hn = 0;
    const push = i => { let k = hn++; heap[k] = i; while (k > 0) { const p = (k - 1) >> 1; if (f[heap[p]] <= f[heap[k]]) break; const t = heap[p]; heap[p] = heap[k]; heap[k] = t; k = p; } };
    const pop = () => { const top = heap[0]; heap[0] = heap[--hn]; let k = 0; for (;;) { const l = k * 2 + 1, rr = l + 1; let m = k; if (l < hn && f[heap[l]] < f[heap[m]]) m = l; if (rr < hn && f[heap[rr]] < f[heap[m]]) m = rr; if (m === k) break; const t = heap[m]; heap[m] = heap[k]; heap[k] = t; k = m; } return top; };
    g[s] = 0; f[s] = hx(sx, sy); from[s] = -1; stamp[s] = cur; push(s);
    let it = 0, best = s, bestH = f[s];
    const lim = maxIter || 9000;
    while (hn > 0 && it++ < lim) {
      const i = pop(); if (closed[i] === cur) continue; closed[i] = cur;
      const x = i % w, y = (i / w) | 0;
      if (inGoal(x, y)) return build(i, s, w);
      const hh = hx(x, y); if (hh < bestH) { bestH = hh; best = i; }
      for (let k = 0; k < 8; k++) {
        const nx = x + N8[k][0], ny = y + N8[k][1]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx; if (closed[j] === cur) continue;
        const c = cost(j); if (c < 0) continue;
        if (k >= 4) { if (cost(y * w + nx) < 0 || cost(ny * w + x) < 0) continue; } // no corner cutting
        const ng = g[i] + N8[k][2] * c;
        if (stamp[j] !== cur || ng < g[j]) { stamp[j] = cur; g[j] = ng; f[j] = ng + hx(nx, ny) * 1.001; from[j] = i; push(j); }
      }
    }
    return goal.partial ? build(best, s, w) : null;
  };
  function build(i, s, w) { const out = []; while (i !== s && i >= 0) { out.push(i); i = from[i]; } out.reverse(); return out; }
})(typeof window !== 'undefined' ? window : globalThis);
