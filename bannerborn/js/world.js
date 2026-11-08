// Bannerborn — isometric world: projection, procedural maps per layout, painted ground, props.
(function () {
  const BB = window.BB;
  const TW = BB.TW, TH = BB.TH;
  BB.iso = (x, y) => ({ x: (x - y) * TW / 2, y: (x + y) * TH / 2 });
  BB.unIso = (sx, sy) => ({ x: sy / TH + sx / TW, y: sy / TH - sx / TW });

  // prop catalogue: name -> [collision radius (tiles), solid, layer]
  const R = (name) => {
    if (/^Tree [AD]\d/.test(name) || /^Tree C1/.test(name) || /^Tree E[136]/.test(name)) return 0.35;
    if (/^Tree B[45]/.test(name)) return 0.5;
    if (/^Tree B/.test(name)) return 0.3;
    if (/^Tree (A4|E[245])/.test(name)) return 0.25;
    if (/^Stone B(10|11|6)/.test(name)) return 0;
    if (/^Stone A(6|7|8)/.test(name)) return 0.9;
    if (/^Stone/.test(name)) return 0.4;
    if (/^Misc B(12|19|46|43|14|17|18|55|56|42|48|6)_/.test(name)) return 0.8;
    if (/^Misc E(10|11|5|6|7|8|9)_/.test(name)) return 0;
    if (/^Misc D/.test(name)) return 0.15;
    if (/^Misc/.test(name)) return 0.35;
    if (/^Wall/.test(name)) return 0.5;
    if (/^Torch/.test(name)) return 0.1;
    return 0.3;
  };

  function Map(w, h, biome, seed) {
    this.w = w; this.h = h; this.biome = biome; this.seed = seed;
    this.ground = new Uint8Array(w * h); // 0 base, 1 alt, 2 path, 3 water, 4 stone floor
    this.props = []; this.anims = []; this.lights = [];
    this.r = BB.rng(seed);
  }
  Map.prototype.at = function (x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.ground[y * this.w + x]; };
  Map.prototype.set = function (x, y, v) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.ground[y * this.w + x] = v; };
  Map.prototype.free = function (x, y, rad) {
    if (x < 2 || y < 2 || x > this.w - 2 || y > this.h - 2) return false;
    if (this.at(x, y) === 3) return false;
    for (const p of this.props) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < (p.r || 0.3) + rad) return false;
    }
    return true;
  };
  Map.prototype.add = function (name, x, y, opts) {
    opts = opts || {};
    const p = Object.assign({ name, x, y, r: opts.r !== undefined ? opts.r : R(name), biome: opts.biome || this.biome, sc: 1 }, opts);
    p.solid = p.r > 0.05;
    this.props.push(p); return p;
  };
  Map.prototype.tryAdd = function (name, x, y, opts, rad) {
    if (!this.free(x, y, rad !== undefined ? rad : R(name) * 0.8)) return null;
    return this.add(name, x, y, opts);
  };
  Map.prototype.anim = function (key, x, y, opts) {
    const a = Object.assign({ key, x, y, sc: 1, t: this.r() * 10, fps: 12 }, opts || {});
    this.anims.push(a); return a;
  };

  const DIRS = ['S', 'E', 'N', 'W'];
  const VALE = {
    trees: ['Tree A1', 'Tree A2', 'Tree A3', 'Tree D1', 'Tree D2', 'Tree D3', 'Tree A1', 'Tree A3', 'Tree C1'],
    edge: ['Tree D1', 'Tree D2', 'Tree D3', 'Tree A1', 'Tree A2', 'Tree A3', 'Tree C1'],
    rocks: ['Stone A1', 'Stone A2', 'Stone A3', 'Stone A9', 'Stone A10', 'Stone A11', 'Stone A12'],
    small: ['Tree B1', 'Tree A4', 'Tree E2', 'Tree E4', 'Misc E5', 'Misc E6', 'Misc E7', 'Misc E9', 'Stone A12'],
    dead: ['Tree E1', 'Tree E3'],
  };
  const SAND = {
    trees: ['Tree A1', 'Tree A2', 'Tree A3', 'Tree A4', 'Tree C1', 'Tree E1', 'Tree E2'],
    edge: ['Stone B1', 'Stone B3', 'Stone B7', 'Stone B8', 'Tree A1', 'Tree A2', 'Stone B9', 'Tree A3'],
    rocks: ['Stone B2', 'Stone B4', 'Stone B5', 'Stone B9', 'Stone B3'],
    small: ['Tree B1', 'Tree D1', 'Tree D2', 'Tree D3', 'Tree E3', 'Tree E4', 'Tree E5', 'Tree E6', 'Stone B4', 'Stone B10'],
    dead: ['Tree E6'],
  };
  BB.SET = (biome) => biome === 'sand' ? SAND : VALE;
  const dir = (r) => r.pick(DIRS);
  const nm = (base, r) => base + '_' + dir(r);

  const MARGIN = 7;
  function edgeForest(m, set, thick) {
    const r = m.r;
    for (let y = -MARGIN; y < m.h + MARGIN; y++) for (let x = -MARGIN; x < m.w + MARGIN; x++) {
      const e = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
      if (e < thick && r() < (e < 0 ? 0.55 : e < thick - 1 ? 0.75 : 0.45)) {
        const jx = x + 0.5 + r.range(-0.3, 0.3), jy = y + 0.5 + r.range(-0.3, 0.3);
        m.add(nm(r.pick(set.edge), r), jx, jy, { edge: true, outside: e < 0, sc: r.range(0.9, 1.15) });
      }
    }
  }
  function scatter(m, list, n, area, opts) {
    const r = m.r; let tries = n * 8;
    while (n > 0 && tries-- > 0) {
      const x = r.range(area[0], area[2]), y = r.range(area[1], area[3]);
      if (m.tryAdd(nm(r.pick(list), r), x, y, Object.assign({ sc: r.range(0.85, 1.1) }, opts || {}))) n--;
    }
  }
  function path(m, pts, wdt, v) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 3);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        for (let dy = -wdt; dy <= wdt; dy++) for (let dx = -wdt; dx <= wdt; dx++)
          if (dx * dx + dy * dy <= wdt * wdt + 0.5) m.set(x + dx, y + dy, v === undefined ? 2 : v);
      }
    }
  }
  function blob(m, cx, cy, rad, v) {
    for (let y = Math.floor(cy - rad - 1); y <= cy + rad + 1; y++) for (let x = Math.floor(cx - rad - 1); x <= cx + rad + 1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) + (m.r() - 0.5) * 0.9;
      if (d < rad) m.set(x, y, v);
    }
  }
  function camp(m, cx, cy, big) {
    const r = m.r;
    const tents = ['Misc B12', 'Misc B19', 'Misc B46', 'Misc B43'];
    const slots = big ? [[-2.2, -1.2], [1.8, -2.2], [-2.6, 1.8], [2.4, 1.4]] : [[-2, -1], [2, -1.6]];
    for (const [dx, dy] of slots) m.tryAdd(nm(r.pick(tents), r), cx + dx, cy + dy, { biome: 'vale' }, 0.6);
    m.add('Misc B8_S', cx, cy, { biome: 'vale', r: 0.4 });
    m.anim('fire', cx + 0.03, cy + 0.03, { sc: 0.7, fps: 14, light: 1 });
    m.lights.push({ x: cx, y: cy, rad: 5, col: '255,170,80' });
  }
  function village(m, cx, cy) {
    const r = m.r;
    const stuff = ['Misc B17', 'Misc B18', 'Misc B14', 'Misc B3', 'Misc A4', 'Misc A9', 'Misc B28', 'Misc B11', 'Misc B6', 'Misc A3', 'Misc B5', 'Misc E3', 'Misc E2'];
    m.add('Misc B42_S', cx, cy, { biome: 'vale', r: 0.7 });
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2, d = r.range(2.2, 5);
      m.tryAdd(nm(r.pick(stuff), r), cx + Math.cos(a) * d, cy + Math.sin(a) * d, { biome: 'vale' }, 0.55);
    }
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2, d = r.range(3, 5.5);
      m.tryAdd(nm(r.pick(['Misc B12', 'Misc B19', 'Misc B46', 'Misc B43']), r), cx + Math.cos(a) * d, cy + Math.sin(a) * d, { biome: 'vale' }, 0.8);
    }
  }
  function ruins(m, cx, cy, rad, sand) {
    const r = m.r;
    const pieces = sand ? ['Wall H9', 'Wall H3', 'Wall I4', 'Wall I20', 'Wall K2', 'Wall K8', 'Wall J10', 'Wall H13', 'Wall J19', 'Wall J13', 'Wall K20']
      : ['Wall A1', 'Wall A2', 'Wall A4', 'Wall A6', 'Wall A8', 'Wall A16', 'Wall A18', 'Stone A14', 'Stone A15', 'Misc C7'];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + r.range(-0.2, 0.2), d = rad + r.range(-0.6, 0.6);
      m.tryAdd(nm(r.pick(pieces), r), cx + Math.cos(a) * d, cy + Math.sin(a) * d, { biome: sand ? 'sand' : 'vale' }, 0.6);
    }
  }
  function graves(m, cx, cy, n) {
    const r = m.r;
    for (let i = 0; i < n; i++) m.tryAdd(nm(r.pick(['Stone A4', 'Stone A5', 'Stone A13', 'Stone A15']), r), cx + r.range(-3, 3), cy + r.range(-3, 3), { biome: 'vale', r: 0.25 }, 0.4);
  }

  // layout -> builder. returns map with .heroSpawn, .foeSpawns, .gateSpots, .wardSpot, .bossSpot
  BB.buildMap = function (layout, biome, seed, opts) {
    opts = opts || {};
    const big = { courtyard: 22, temple: 22, gate: 24, dunes: 22, camp: 20, title: 22 }[layout] || 26;
    const m = new Map(big, big, biome, seed);
    const r = m.r, set = BB.SET(biome);
    const W = m.w, H = m.h, c = W / 2;
    m.layout = layout; m.night = !!opts.night;
    // base ground variation
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() < 0.18) m.set(x, y, 1);
    m.heroSpawn = { x: 6, y: H - 6.5 };
    m.foeSpawns = [{ x: W - 5.5, y: 5.5 }, { x: W - 5, y: c }, { x: c, y: 5 }];
    m.bossSpot = { x: W * 0.62, y: H * 0.38 };
    const inner = [3.5, 3.5, W - 3.5, H - 3.5];
    switch (layout) {
      case 'village':
        path(m, [[2, H - 3], [c, c], [W - 3, 3]], 1); path(m, [[2, c - 2], [c, c]], 0.8);
        village(m, c, c); camp(m, W - 7, 7, false);
        m.anims.push({ key: 'fire2', x: c + 3, y: c - 4, sc: 0.8, t: 0, fps: 12 });
        m.anim('fire', c - 4, c + 2.5, { sc: 0.6 }); m.anim('fire', c + 4.5, c + 1.5, { sc: 0.5 });
        m.lights.push({ x: c - 4, y: c + 2.5, rad: 4, col: '255,140,60' }, { x: c + 4.5, y: c + 1.5, rad: 4, col: '255,140,60' });
        scatter(m, set.trees, 16, inner); scatter(m, set.small, 26, inner);
        break;
      case 'mill':
        path(m, [[2, H - 3], [c - 1, c + 2], [W - 3, 5]], 1);
        m.add('Misc E3_S', c - 2, c - 3, { biome: 'vale' });
        m.anim('mill', c - 3.4, c - 1.2, { sc: 1, fps: 10, solid: 1.3 });
        m.add('_mill', c - 3.4, c - 1.2, { r: 1.3, invisible: true });
        for (let i = 0; i < 9; i++) m.tryAdd(nm(r.pick(['Misc E10', 'Misc E11', 'Misc E1', 'Misc E2', 'Misc E4']), r), c + r.range(-6, 4), c + r.range(1, 6), { biome: 'vale' }, 0.6);
        m.gateSpots = [{ x: W - 6, y: 6 }];
        scatter(m, set.trees, 14, inner); scatter(m, set.small, 22, inner); graves(m, W - 8, 9, 5);
        break;
      case 'grove':
        blob(m, c, c, 4.5, 1);
        m.wardSpot = { x: c, y: c };
        m.add('Misc C12_S', c, c, { biome: 'vale', r: 0.6, ward: true });
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; m.tryAdd(nm('Stone A' + r.pick([16, 21, 22]), r), c + Math.cos(a) * 3.2, c + Math.sin(a) * 3.2, { biome: 'vale', r: 0.25, glow: 1 }, 0.3); }
        scatter(m, set.trees.concat(set.dead), 30, inner); scatter(m, set.small, 26, inner);
        m.heroSpawn = { x: c - 1.5, y: c + 2.5 };
        m.foeSpawns = [{ x: W - 4.5, y: 4.5 }, { x: 4.5, y: 4.5 }, { x: W - 4.5, y: H - 4.5 }, { x: 4.5, y: H - 5 }];
        break;
      case 'ruins':
        blob(m, c, c, 6, 4);
        ruins(m, c, c, 5.2, false);
        m.add('Misc B56_S', c, c, { biome: 'vale', r: 0.9 });
        m.gateSpots = [{ x: W - 6, y: 5.5 }, { x: 5.5, y: 6 }, { x: W - 5.5, y: H - 7 }];
        scatter(m, set.trees, 14, inner); scatter(m, set.small, 18, inner); graves(m, 7, 8, 6);
        break;
      case 'courtyard':
        blob(m, c, c, 7, 4);
        ruins(m, c, c, 7.2, false);
        m.add('Misc C1_S', c - 4, c - 4, { biome: 'vale', r: 0.5 }); m.add('Misc C5_S', c + 4, c - 4, { biome: 'vale', r: 0.5 });
        m.add('Stone A8_S', c + 3.5, c + 3, { biome: 'vale', r: 0.9 });
        graves(m, c - 3, c + 3, 8);
        m.add('Torch2', c - 2, c - 5, { biome: 'vale' }); m.add('Torch2', c + 2, c - 5, { biome: 'vale' });
        m.lights.push({ x: c - 2, y: c - 5, rad: 3, col: '255,170,80' }, { x: c + 2, y: c - 5, rad: 3, col: '255,170,80' });
        m.anim('torch', c - 1.98, c - 4.98, { sc: 0.7, fps: 14, pole: 1 }); m.anim('torch', c + 2.02, c - 4.98, { sc: 0.7, fps: 14, pole: 1 });
        m.bossSpot = { x: c + 1, y: c - 2 };
        m.heroSpawn = { x: c - 3, y: c + 5 };
        scatter(m, set.dead, 6, inner);
        break;
      case 'oasis':
        blob(m, c + 1, c - 1, 3.4, 3);
        for (let i = 0; i < 10; i++) { const a = r() * Math.PI * 2; m.tryAdd(nm(r.pick(['Tree A1', 'Tree A2', 'Tree A3', 'Tree A4']), r), c + 1 + Math.cos(a) * 4.4, c - 1 + Math.sin(a) * 4.4, {}, 0.5); }
        for (let i = 0; i < 5; i++) m.anim('ripple', c + 1 + r.range(-2, 2), c - 1 + r.range(-2, 2), { sc: 0.45, fps: 8, ground: true });
        scatter(m, set.rocks, 12, inner); scatter(m, set.small, 22, inner);
        camp(m, 7, H - 9, false);
        break;
      case 'caravan':
        path(m, [[2, c + 1], [W - 2, c - 1]], 1.2);
        m.wardSpot = { x: c, y: c };
        m.add('Misc B6_E', c, c, { biome: 'vale', r: 0.8, ward: true });
        m.add('Misc B11_E', c - 2.2, c + 0.5, { biome: 'vale', r: 0.5 }); m.add('Misc B3_S', c + 1.8, c + 1.2, { biome: 'vale' });
        m.heroSpawn = { x: c - 2, y: c + 2.5 };
        m.foeSpawns = [{ x: W - 4.5, y: 4.5 }, { x: 4.5, y: 4.5 }, { x: W - 4.5, y: H - 4.5 }, { x: c, y: H - 4 }];
        scatter(m, set.rocks, 16, inner); scatter(m, set.small, 20, inner); scatter(m, set.trees, 6, inner);
        break;
      case 'dunes':
        for (let i = 0; i < 6; i++) blob(m, r.range(4, W - 4), r.range(4, H - 4), r.range(1.5, 3), 1);
        ruins(m, c, c - 1, 4.5, true);
        scatter(m, set.rocks, 14, inner); scatter(m, set.small, 18, inner);
        m.bossSpot = { x: c + 1, y: c - 2 };
        break;
      case 'tombs':
        blob(m, c, c, 6, 4);
        ruins(m, c, c, 4, true); ruins(m, c, c, 7.5, true);
        m.gateSpots = [{ x: W - 5.5, y: 5.5 }, { x: 5.5, y: 6 }, { x: W - 5.5, y: H - 7 }, { x: c, y: 4.5 }];
        m.add('Wall J6_S', c, c, { biome: 'sand', r: 1, sc: 1.2 });
        scatter(m, set.rocks, 10, inner); scatter(m, set.small, 14, inner);
        break;
      case 'temple':
        blob(m, c, c, 7, 4);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; m.add(nm(r.pick(['Wall I20', 'Wall K20', 'Wall H3']), r), c + Math.cos(a) * 7.4, c + Math.sin(a) * 7.4, { biome: 'sand' }); }
        m.add('Wall J3_S', c - 5, c - 5, { biome: 'sand', r: 1 }); m.add('Wall J6_S', c + 5, c - 5, { biome: 'sand', r: 1 });
        m.add('Torch2', c - 2.5, c - 3, { biome: 'vale' }); m.add('Torch2', c + 2.5, c - 3, { biome: 'vale' });
        m.anim('torch', c - 2.48, c - 2.98, { sc: 0.7, pole: 1 }); m.anim('torch', c + 2.52, c - 2.98, { sc: 0.7, pole: 1 });
        m.lights.push({ x: c - 2.5, y: c - 3, rad: 3, col: '255,170,80' }, { x: c + 2.5, y: c - 3, rad: 3, col: '255,170,80' });
        m.bossSpot = { x: c + 0.5, y: c - 1.5 }; m.heroSpawn = { x: c - 3, y: c + 5 };
        break;
      case 'march':
        path(m, [[2, H - 3], [W - 3, 3]], 1.6);
        for (let i = 0; i < 8; i++) m.tryAdd(nm(r.pick(['Misc B44', 'Misc B45', 'Misc D1', 'Misc D2', 'Misc D4']), r), r.range(4, W - 4), r.range(4, H - 4), { biome: 'vale' }, 0.4);
        scatter(m, set.dead, 10, inner); scatter(m, set.rocks, 10, inner); graves(m, c + 4, c - 4, 10); graves(m, c - 5, c + 3, 8);
        camp(m, 7, H - 8, true);
        break;
      case 'gate':
        blob(m, c, c, 7.5, 4);
        m.add('Misc C14_S', c + 1, c - 3, { biome: 'vale', r: 1.1, sc: 1.6 });
        m.anim('portal', c + 1, c - 3.6, { sc: 1.2, fps: 10, add: true });
        m.lights.push({ x: c + 1, y: c - 3, rad: 6, col: '170,90,255' });
        ruins(m, c, c, 7.6, false);
        graves(m, c - 4, c + 2, 10); scatter(m, set.dead, 6, inner);
        for (const [dx, dy] of [[-3, -1], [4, 1], [-1, 3], [3, -5]]) { m.add('Torch2', c + dx, c + dy, { biome: 'vale' }); m.anim('torch', c + dx + 0.02, c + dy + 0.02, { sc: 0.7, pole: 1 }); m.lights.push({ x: c + dx, y: c + dy, rad: 3, col: '120,255,160' }); }
        m.bossSpot = { x: c + 0.5, y: c - 1 }; m.heroSpawn = { x: c - 3, y: c + 5 };
        break;
      case 'city': {
        // two crossing cobbled streets, a flagstone square, house fronts along the streets
        m.floor = 'cobble';
        path(m, [[2, c], [W - 2, c]], 1.3, 4); path(m, [[c, 2], [c, H - 2]], 1.3, 4);
        blob(m, c, c, 3.2, 5);
        const fronts = ['Wall D2', 'Wall D4', 'Wall F1', 'Wall F3', 'Wall F7', 'Wall F9', 'Wall D8', 'Wall C4', 'Wall G2', 'Wall G6'];
        for (let i = 0; i < 26; i++) {
          const along = r.range(4, W - 4), side = r() < 0.5 ? -1 : 1, hor = r() < 0.5;
          const x = hor ? along : c + side * r.range(2.8, 3.6), y = hor ? c + side * r.range(2.8, 3.6) : along;
          if (Math.hypot(x - c, y - c) < 4.5) continue;
          m.tryAdd(r.pick(fronts) + '_' + (hor ? (side < 0 ? 'S' : 'N') : (side < 0 ? 'E' : 'W')), x, y, { biome: 'vale', r: 0.5 }, 0.55);
        }
        const clutter = ['Misc B3', 'Misc A4', 'Misc A9', 'Misc B28', 'Misc B17', 'Misc B18', 'Misc B11', 'Misc A3', 'Misc B14'];
        for (let i = 0; i < 14; i++) m.tryAdd(nm(r.pick(clutter), r), r.range(4, W - 4), r.range(4, H - 4), { biome: 'vale' }, 0.5);
        for (let i = 0; i < 5; i++) m.tryAdd(nm(r.pick(['Misc D1', 'Misc D2', 'Misc D3', 'Misc D4', 'Misc B44']), r), c + r.range(-4, 4), c + r.range(-4, 4), { biome: 'vale' }, 0.3);
        m.add('Misc C6_S', c, c, { biome: 'vale', r: 0.5 });
        for (let i = 0; i < 4; i++) m.tryAdd('Door ' + r.pick(['A1', 'A2', 'C1', 'C3']) + '_' + r.pick(DIRS), r.range(4, W - 4), r.range(4, H - 4), { biome: 'ground', r: 0.3 }, 0.6);
        m.gateSpots = [{ x: W - 5.5, y: c + 0.5 }, { x: c + 0.5, y: 5.5 }, { x: 5.5, y: 5.5 }];
        m.heroSpawn = { x: c - 1, y: H - 5 };
        scatter(m, set.trees, 6, inner);
        break;
      }
      case 'plaza':
        m.floor = 'cobble';
        blob(m, c, c, 5.5, 5); path(m, [[2, c], [W - 2, c]], 1, 4); path(m, [[c, 2], [c, H - 2]], 1, 4);
        m.wardSpot = { x: c, y: c };
        m.add('FirePlace', c, c, { biome: 'ground', r: 0.6, ward: true });
        m.anim('fire', c + 0.03, c + 0.03, { sc: 0.7, fps: 14 });
        m.lights.push({ x: c, y: c, rad: 5, col: '255,160,70' });
        m.npcSpots = [[-1.2, 0.4], [0.9, 1], [1.1, -0.9], [-0.6, -1.1], [0.2, 1.4]].map(([dx, dy]) => ({ x: c + dx, y: c + dy }));
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; m.tryAdd(nm(r.pick(['Misc B3', 'Misc A4', 'Misc B28', 'Misc A9', 'Wall F1', 'Wall D2']), r), c + Math.cos(a) * 6.3, c + Math.sin(a) * 6.3, { biome: 'vale' }, 0.6); }
        m.heroSpawn = { x: c - 2, y: c + 2.5 };
        m.foeSpawns = [{ x: W - 4.5, y: 4.5 }, { x: 4.5, y: 4.5 }, { x: W - 4.5, y: H - 4.5 }, { x: 4.5, y: H - 5 }];
        scatter(m, set.trees, 6, inner);
        break;
      case 'throne':
        m.floor = 'tiles';
        blob(m, c, c, 8, 6);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.39; m.add(r.pick(['Misc C7_S', 'Stone A14_S']), c + Math.cos(a) * 5.4, c + Math.sin(a) * 5.4, { biome: 'vale', r: 0.4 }); }
        m.add('Misc C1_S', c + 2.5, c - 4.5, { biome: 'vale', r: 0.6, sc: 1.2 });
        for (const [dx, dy] of [[-3, -4], [4, -1], [-4, 3], [2, 4]]) { m.add('Torch2', c + dx, c + dy, { biome: 'vale' }); m.anim('torch', c + dx + 0.02, c + dy + 0.02, { sc: 0.7, pole: 1 }); m.lights.push({ x: c + dx, y: c + dy, rad: 3, col: '160,200,255' }); }
        for (let i = 0; i < 6; i++) m.tryAdd(nm(r.pick(['Misc D1', 'Misc D3', 'Misc D5']), r), c + r.range(-6, 6), c + r.range(-6, 6), { biome: 'vale' }, 0.4);
        ruins(m, c, c, 8.4, false);
        m.bossSpot = { x: c + 1, y: c - 2 }; m.heroSpawn = { x: c - 3, y: c + 5 };
        break;
      case 'endless':
        blob(m, c, c, 6, 4); ruins(m, c, c, 6.4, biome === 'sand');
        m.gateSpots = [{ x: W - 5.5, y: 5.5 }, { x: 5.5, y: 6 }, { x: W - 5.5, y: H - 7 }];
        scatter(m, set.trees, 10, inner); scatter(m, set.small, 16, inner);
        m.heroSpawn = { x: c, y: c + 2 };
        break;
      case 'camp':
      case 'title':
        blob(m, c, c, 4.5, 2);
        scatter(m, set.trees, 8, [3, 3, W - 3, 6]); scatter(m, set.small, 14, inner);
        break;
    }
    // treasure: wooden chests, sometimes a golden one
    if (!/camp|title/.test(layout)) {
      m.chests = [];
      const n = 1 + (r() < 0.6 ? 1 : 0);
      for (let i = 0; i < n * 6 && m.chests.length < n; i++) {
        const x = r.range(5, W - 5), y = r.range(5, H - 5);
        if (Math.hypot(x - m.heroSpawn.x, y - m.heroSpawn.y) < 4 || !m.free(x, y, 0.7)) continue;
        m.chests.push({ x, y, gold: r() < 0.25 });
      }
    }
    // ground plants on grass (no collision)
    if (biome === 'vale' && !/throne/.test(layout)) for (let i = 0; i < W * H * 0.05; i++) {
      const x = r.range(3, W - 3), y = r.range(3, H - 3);
      if (m.at(x, y) <= 1 && m.free(x, y, 0.3)) m.add('Flora ' + r.pick(['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B3', 'B5']) + '_' + r.pick(DIRS), x, y, { biome: 'ground', r: 0 });
    }
    // explosive barrels in fights
    if (!/camp|title/.test(layout)) {
      for (let i = 0; i < 4; i++) {
        const x = r.range(5, W - 5), y = r.range(5, H - 5);
        if (Math.hypot(x - m.heroSpawn.x, y - m.heroSpawn.y) < 3) continue;
        if (m.free(x, y, 0.6)) m.barrels = (m.barrels || []).concat([{ x, y, kind: r() < 0.5 ? 'barrel1' : 'barrel3' }]);
      }
    }
    // keep every key spot reachable: no props on spawns, gates, wards or boss spots
    const keys = [m.heroSpawn, m.bossSpot].concat(m.foeSpawns || [], m.gateSpots || []);
    m.props = m.props.filter((p) => p.ward || /Misc C14|Misc B42|Misc C12|Misc B6_E/.test(p.name) || !keys.some((k) => Math.hypot(p.x - k.x, p.y - k.y) < 1.6 + (p.r || 0)));
    edgeForest(m, set, 3);
    for (const p of m.props) { const s = BB.iso(p.x, p.y); p.depth = p.x + p.y; p.sx = s.x; p.sy = s.y; }
    m.props.sort((a, b) => a.depth - b.depth);
    // spatial index for collisions
    m.grid = [];
    for (let i = 0; i < W * H; i++) m.grid.push([]);
    for (const p of m.props) {
      if (!p.solid) continue;
      const rr = Math.ceil(p.r + 0.5);
      for (let y = Math.floor(p.y) - rr; y <= Math.floor(p.y) + rr; y++) for (let x = Math.floor(p.x) - rr; x <= Math.floor(p.x) + rr; x++)
        if (x >= 0 && y >= 0 && x < W && y < H) m.grid[y * W + x].push(p);
    }
    BB.buildBlock(m);
    return m;
  };

  // ---- walkability grid + A* (used when the straight line to a target is blocked)
  BB.buildBlock = function (m) {
    const W = m.w, H = m.h, b = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || m.at(x, y) === 3) { b[y * W + x] = 1; continue; }
      const cx = x + 0.5, cy = y + 0.5;
      for (const p of m.grid[y * W + x]) if (p.r >= 0.15 && (Math.hypot(p.x - cx, p.y - cy) < p.r + 0.2 || ((p.x | 0) === x && (p.y | 0) === y))) { b[y * W + x] = 1; break; }
    }
    m.block = b;
  };
  BB.blocked = (m, x, y) => { x |= 0; y |= 0; return x < 0 || y < 0 || x >= m.w || y >= m.h || m.block[y * m.w + x] === 1; };
  // is the straight walk open? with a radius, the walker's whole width must pass
  BB.lineClear = function (m, x0, y0, x1, y1, r) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.25);
    const ox = r ? -(y1 - y0) / (d || 1) * r * 0.9 : 0, oy = r ? (x1 - x0) / (d || 1) * r * 0.9 : 0;
    for (let i = 1; i < n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (BB.blocked(m, x, y)) return false;
      if (r && (BB.blocked(m, x + ox, y + oy) || BB.blocked(m, x - ox, y - oy))) return false;
    }
    return true;
  };
  BB.findPath = function (m, sx, sy, tx, ty) {
    const W = m.w, H = m.h;
    const cl = (v, n) => Math.max(0, Math.min(n - 1, v | 0));
    tx = Math.max(3.2, Math.min(W - 3.2, tx)); ty = Math.max(3.2, Math.min(H - 3.2, ty));
    const s = cl(sy, H) * W + cl(sx, W), g = cl(ty, H) * W + cl(tx, W);
    if (s === g) return [{ x: tx, y: ty }];
    const open = [s], came = new Int32Array(W * H).fill(-1), gs = new Float32Array(W * H).fill(1e9), closed = new Uint8Array(W * H);
    gs[s] = 0;
    const gx = g % W, gy = (g / W) | 0;
    const hf = (i) => Math.hypot((i % W) - gx, ((i / W) | 0) - gy);
    const fs = new Float32Array(W * H).fill(1e9); fs[s] = hf(s);
    let iter = 0;
    while (open.length && iter++ < 4000) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (fs[open[i]] < fs[open[bi]]) bi = i;
      const cur = open[bi]; open.splice(bi, 1);
      if (cur === g) break;
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (closed[ni] || (m.block[ni] && ni !== g)) continue;
        if (dx && dy && (m.block[cy * W + nx] || m.block[ny * W + cx])) continue;
        const ng = gs[cur] + (dx && dy ? 1.414 : 1);
        if (ng < gs[ni]) { gs[ni] = ng; fs[ni] = ng + hf(ni); came[ni] = cur; if (!open.includes(ni)) open.push(ni); }
      }
    }
    if (!(came[g] >= 0)) return null;
    const pts = []; let c = g, guard = 0;
    while (c !== s && c >= 0) {
      pts.push({ x: (c % W) + 0.5, y: ((c / W) | 0) + 0.5 }); c = came[c];
      if (++guard > W * H) { if (BB.debugPath) throw new Error('path cycle ' + JSON.stringify([sx, sy, tx, ty, s, g])); return null; }
    }
    pts.reverse(); pts[pts.length - 1] = { x: tx, y: ty };
    // string-pull
    const out = []; let ax = sx, ay = sy, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !BB.lineClear(m, ax, ay, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]); ax = pts[j].x; ay = pts[j].y; i = j + 1;
    }
    return out;
  };

  BB.mapPropsNear = function (m, x, y) {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= m.w || y >= m.h) return [];
    return m.grid[y * m.w + x];
  };
  // push a circle out of solid props and the map edge; also water
  BB.collide = function (m, e) {
    const b = 2.6;
    if (e.x < b) e.x = b; if (e.y < b) e.y = b; if (e.x > m.w - b) e.x = m.w - b; if (e.y > m.h - b) e.y = m.h - b;
    for (const p of BB.mapPropsNear(m, e.x, e.y)) {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), min = p.r + e.r;
      if (d < min && d > 1e-5) { e.x = p.x + dx / d * min; e.y = p.y + dy / d * min; }
    }
    if (m.at(e.x, e.y) === 3) { // water: nudge back toward the centre of the nearest dry tile
      const cx = Math.floor(e.x) + 0.5, cy = Math.floor(e.y) + 0.5;
      e.x -= (cx - e.x) * 0.3 + (e.vx || 0) * 0.02; e.y -= (cy - e.y) * 0.3 + (e.vy || 0) * 0.02;
      if (e.px !== undefined && m.at(e.x, e.y) === 3) { e.x = e.px; e.y = e.py; }
    }
  };
  BB.lineBlocked = function () { return false; };
  // nearest walkable point (not in water, not inside a solid prop)
  BB.freeSpot = function (m, x, y, rad) {
    rad = rad || 0.35;
    const ok = (px, py) => px > 3 && py > 3 && px < m.w - 3 && py < m.h - 3 && m.at(px, py) !== 3 &&
      !BB.mapPropsNear(m, px, py).some((p) => Math.hypot(p.x - px, p.y - py) < p.r + rad);
    if (ok(x, y)) return { x, y };
    for (let r = 0.5; r < 6; r += 0.5) for (let a = 0; a < 12; a++) {
      const px = x + Math.cos(a / 12 * Math.PI * 2) * r, py = y + Math.sin(a / 12 * Math.PI * 2) * r;
      if (ok(px, py)) return { x: px, y: py };
    }
    return { x: Math.max(3.5, Math.min(m.w - 3.5, x)), y: Math.max(3.5, Math.min(m.h - 3.5, y)) };
  };

  // ---- painted ground: one canvas per map, drawn under everything
  const PAL = {
    vale: { base: [86, 122, 58], alt: [104, 134, 62], path: [138, 112, 76], water: [52, 98, 128], floor: [126, 122, 112], dark: [56, 84, 44], light: [140, 160, 80] },
    sand: { base: [204, 172, 116], alt: [214, 184, 128], path: [182, 146, 98], water: [58, 128, 150], floor: [170, 150, 118], dark: [176, 140, 92], light: [232, 206, 150] },
  };
  // ground from the tile kit: a dirt block per tile, then an overlay (grass, dry grass, cobbles, flagstones, tiles)
  let sandAtlas = null;
  function drawTiles(m, g, r, MG) {
    const G = BB.A.env.ground, f = G.meta.f, k = BB.ENV_DRAW;
    if (m.biome === 'sand' && !sandAtlas) {
      const c = document.createElement('canvas'); c.width = G.img.width; c.height = G.img.height;
      const x = c.getContext('2d'); x.filter = 'none'; x.drawImage(G.img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { // warm, light sand from the brown dirt
        const l = (p[i] * 0.3 + p[i + 1] * 0.55 + p[i + 2] * 0.15) / 255;
        p[i] = Math.min(255, 120 + l * 230); p[i + 1] = Math.min(255, 92 + l * 205); p[i + 2] = Math.min(255, 55 + l * 150);
      }
      x.putImageData(d, 0, 0); sandAtlas = c;
    }
    const put = (img, name, x, y, alpha) => {
      const q = f[name]; if (!q) return;
      const s = BB.iso(x + 0.5, y + 0.5);
      if (alpha !== undefined) g.globalAlpha = alpha;
      g.drawImage(img, q[0], q[1], q[2], q[3], s.x + q[4] * k, s.y + q[5] * k, q[2] * k, q[3] * k);
      if (alpha !== undefined) g.globalAlpha = 1;
    };
    const D = ['_N', '_E', '_S', '_W'];
    const dd = () => D[r.int(4)];
    const sand = m.biome === 'sand';
    const base = sand ? sandAtlas : G.img;
    const tiles = [];
    for (let y = -MG; y < m.h + MG; y++) for (let x = -MG; x < m.w + MG; x++) tiles.push([x, y]);
    tiles.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    const near = (x, y, v) => [m.at(x - 1, y), m.at(x + 1, y), m.at(x, y - 1), m.at(x, y + 1)].some((t) => t === v);
    for (const [x, y] of tiles) {
      const t = m.at(x, y);
      if (t === 3) continue;
      if (t === 2) { put(sand ? sandAtlas : G.img, 'Ground A1' + dd(), x, y); if (r() < 0.45) put(G.img, 'Ground ' + r.pick(['E10', 'E11', 'E13']) + dd(), x, y, sand ? 0.5 : 0.8); continue; }
      const edgeDist = Math.min(x, y, m.w - 1 - x, m.h - 1 - y);
      if (t === 4 || t === 5 || t === 6) {
        put(base, 'Ground A1' + dd(), x, y);
        const style = t === 5 ? 'flag' : t === 6 ? 'tiles' : m.floor || (sand ? 'tiles' : 'flag');
        if (style === 'cobble') put(G.img, 'Ground E1' + dd(), x, y);
        else if (style === 'tiles') put(sand ? sandAtlas : G.img, 'Ground ' + r.pick(['H1', 'H4', 'H4', 'H9']) + dd(), x, y);
        else put(sand ? sandAtlas : G.img, 'Ground D1' + dd(), x, y);
        continue;
      }
      put(base, 'Ground A1' + dd(), x, y);
      if (sand) {
        if (r() < 0.1) put(G.img, 'Ground ' + r.pick(['E10', 'E11', 'E14']) + dd(), x, y, 0.45);
      } else {
        const edge = near(x, y, 2) || near(x, y, 4) || near(x, y, 5);
        if (edgeDist < 2) put(G.img, 'Ground A18' + dd(), x, y);
        else if (edge) put(G.img, 'Ground ' + r.pick(['A3', 'A5', 'A6']) + dd(), x, y);
        else { put(G.img, 'Ground A2' + dd(), x, y); if (t === 1 && r() < 0.5) put(G.img, 'Ground ' + r.pick(['A20', 'A21', 'A10', 'A11']) + dd(), x, y, 0.9); }
        if (r() < 0.04) put(G.img, 'Ground ' + r.pick(['A22', 'A23', 'E11', 'E12']) + dd(), x, y, 0.85);
      }
    }
    m.tiled = true;
  }
  BB.renderGround = function (m, scale) {
    scale = scale || 1.5;
    const P = PAL[m.biome];
    const MG = MARGIN;
    const minX = -(m.h + MG) * TW / 2 - MG * TW / 2, maxX = (m.w + MG) * TW / 2 + MG * TW / 2, minY = -MG * TH, maxY = (m.w + m.h + MG) * TH / 2 + MG * TH / 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil((maxX - minX) * scale); c.height = Math.ceil((maxY - minY) * scale + 4);
    const g = c.getContext('2d');
    g.scale(scale, scale); g.translate(-minX, -minY);
    const r = BB.rng(m.seed + 7);
    const col = (a, j) => 'rgb(' + a.map((v) => Math.max(0, Math.min(255, v + j))).join(',') + ')';
    const diamond = (x, y, grow) => {
      const s = BB.iso(x, y), gw = grow || 0;
      g.beginPath(); g.moveTo(s.x, s.y - gw); g.lineTo(s.x + TW / 2 + gw, s.y + TH / 2); g.lineTo(s.x, s.y + TH + gw); g.lineTo(s.x - TW / 2 - gw, s.y + TH / 2); g.closePath();
    };
    for (let y = -MG; y < m.h + MG; y++) for (let x = -MG; x < m.w + MG; x++) {
      const t = m.at(x, y);
      const base = t === 2 ? P.path : t === 3 ? P.water : t === 4 ? P.floor : t === 1 ? P.alt : P.base;
      g.fillStyle = col(base, (r() - 0.5) * 14); diamond(x, y, 0.6); g.fill();
    }
    // soft blotches for a painted look
    for (let i = 0; i < (m.w + MG * 2) * (m.h + MG * 2) * 0.5; i++) {
      const x = r() * (m.w + MG * 2) - MG, y = r() * (m.h + MG * 2) - MG, t = m.at(x, y); if (t === 3) continue;
      const s = BB.iso(x, y), rad = r.range(10, 40);
      const tone = r() < 0.5 ? P.dark : P.light;
      const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
      gr.addColorStop(0, 'rgba(' + tone.join(',') + ',' + (t === 4 ? 0.08 : 0.16) + ')'); gr.addColorStop(1, 'rgba(' + tone.join(',') + ',0)');
      g.fillStyle = gr; g.save(); g.translate(s.x, s.y); g.scale(1, 0.5); g.translate(-s.x, -s.y); g.beginPath(); g.arc(s.x, s.y, rad, 0, 7); g.fill(); g.restore();
    }
    // paths and floors: soften edges with feathered dabs
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const t = m.at(x, y); if (t !== 2 && t !== 4) continue;
      const s = BB.iso(x + 0.5, y + 0.5);
      for (let k = 0; k < 3; k++) {
        const ox = r.range(-14, 14), oy = r.range(-7, 7), rad = r.range(8, 16);
        g.fillStyle = col(t === 2 ? P.path : P.floor, (r() - 0.5) * 20);
        g.globalAlpha = 0.35; g.beginPath(); g.ellipse(s.x + ox, s.y + oy, rad, rad / 2, 0, 0, 7); g.fill(); g.globalAlpha = 1;
      }
      if (t === 4 && r() < 0.6) { // flagstones
        g.strokeStyle = 'rgba(60,55,50,0.35)'; g.lineWidth = 0.8; diamond(x + 0.08, y + 0.08); g.save(); g.translate(0, 0); g.stroke(); g.restore();
      }
      if (t === 2 && r() < 0.5) { // pebbles
        for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(90,80,64,0.5)'; g.beginPath(); g.ellipse(s.x + r.range(-12, 12), s.y + r.range(-6, 6), 1.4, 0.8, 0, 0, 7); g.fill(); }
      }
    }
    // water: depth gradient and shore foam
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (m.at(x, y) !== 3) continue;
      const shore = [m.at(x - 1, y), m.at(x + 1, y), m.at(x, y - 1), m.at(x, y + 1)].some((v) => v !== 3);
      const s = BB.iso(x + 0.5, y + 0.5);
      if (shore) { g.strokeStyle = 'rgba(230,240,230,0.35)'; g.lineWidth = 1.4; diamond(x, y, -1); g.stroke(); }
      else { g.fillStyle = 'rgba(20,50,90,0.25)'; diamond(x, y, 0.5); g.fill(); }
      if (r() < 0.4) { g.strokeStyle = 'rgba(200,230,255,0.25)'; g.lineWidth = 0.8; g.beginPath(); g.ellipse(s.x + r.range(-8, 8), s.y + r.range(-4, 4), 5, 1.6, 0, 0, 7); g.stroke(); }
    }
    if (BB.A.env.ground) drawTiles(m, g, r, MG);
    // grass tufts / sand ripples
    if (m.tiled) { // soft light and shade over the tiles so the grid does not read too strongly
      for (let i = 0; i < (m.w + MG * 2) * (m.h + MG * 2) * 0.25; i++) {
        const x = r() * (m.w + MG * 2) - MG, y = r() * (m.h + MG * 2) - MG; if (m.at(x, y) === 3) continue;
        const s = BB.iso(x, y), rad = r.range(14, 46), tone = r() < 0.55 ? P.dark : P.light;
        const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, rad);
        gr.addColorStop(0, 'rgba(' + tone.join(',') + ',0.10)'); gr.addColorStop(1, 'rgba(' + tone.join(',') + ',0)');
        g.fillStyle = gr; g.save(); g.translate(s.x, s.y); g.scale(1, 0.5); g.translate(-s.x, -s.y); g.beginPath(); g.arc(s.x, s.y, rad, 0, 7); g.fill(); g.restore();
      }
    }
    for (let i = 0; i < m.w * m.h * (m.tiled ? (m.biome === 'vale' ? 0.25 : 1.2) : m.biome === 'vale' ? 3.2 : 1.6); i++) {
      const x = r() * m.w, y = r() * m.h, t = m.at(x, y); if (t === 3 || t >= 4 || t === 2) continue;
      const s = BB.iso(x, y);
      if (m.tiled && m.biome === 'vale') { if (r() < 0.5) { g.fillStyle = r.pick(['#e8d46a', '#e07a9a', '#f2f2f2', '#9ab6ff']); g.beginPath(); g.arc(s.x, s.y - 2, 1.1, 0, 7); g.fill(); } continue; }
      if (m.tiled && m.biome === 'vale') continue;
      if (m.biome === 'vale') {
        const j = (r() - 0.5) * 30;
        g.strokeStyle = col([r() < 0.5 ? 70 : 120, r() < 0.5 ? 104 : 150, 50], j); g.lineWidth = 0.9;
        g.beginPath();
        for (let k = 0; k < 3; k++) { const bx = s.x + (k - 1) * 1.6; g.moveTo(bx, s.y); g.lineTo(bx + (k - 1) * 1.4 + r.range(-0.6, 0.6), s.y - r.range(2.5, 5)); }
        g.stroke();
        if (r() < 0.04) { g.fillStyle = r.pick(['#e8d46a', '#e07a9a', '#f2f2f2', '#9ab6ff']); g.beginPath(); g.arc(s.x, s.y - 3, 1.1, 0, 7); g.fill(); }
      } else {
        g.strokeStyle = 'rgba(150,110,70,0.25)'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(s.x - 8, s.y); g.quadraticCurveTo(s.x, s.y - 2, s.x + 8, s.y); g.stroke();
      }
    }
    m.groundCanvas = c; m.groundOrigin = { x: minX, y: minY, scale };
    return c;
  };
})();
