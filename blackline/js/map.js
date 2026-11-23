// BLACKLINE — battlefields seen from above: a height field, woods, ruins, trenches, roads,
// streams and wire on a plane; cover, movement cost, pathfinding and line of sight.
// x runs east, y runs south, h is height. Pure; no DOM.
(function (root) {
  const BL = root.BL || (root.BL = {});
  const { rng, clamp } = BL;

  const CELL = 20;       // feature and height grid
  const NAV = 40;        // pathfinding grid
  const F = { WOOD: 1, RUIN: 2, WATER: 4, ROAD: 8, TRENCH: 16, WIRE: 32, ROCK: 64, BRIDGE: 128 };

  // ---------------------------------------------------------------- map specs
  // Each spec is drawn by hand. symmetric: every feature is mirrored through the centre,
  // so neither side starts with better ground.

  const MAPS = {
    // Skirmish and the last mission: a wide valley with a wooded rise in the middle.
    valley: {
      name: 'THE VALLEY', W: 3600, H: 2000, seed: 11, symmetric: true,
      hills: [{ x: 1800, y: 1000, r: 260, h: 70 }, { x: 1020, y: 640, r: 220, h: 52 }, { x: 620, y: 1500, r: 260, h: 40 }, { x: 1450, y: 1650, r: 200, h: 34 }],
      ridges: [{ pts: [[1250, 300], [1500, 520], [1600, 760]], w: 120, h: 34 }],
      woods: [{ x: 1700, y: 900, r: 110 }, { x: 1890, y: 1110, r: 80 }, { x: 1180, y: 900, r: 120 }, { x: 1080, y: 1060, r: 90 }, { x: 760, y: 420, r: 130 }, { x: 1300, y: 1400, r: 110 }, { x: 420, y: 760, r: 90 }],
      ruins: [{ x: 1875, y: 930, w: 56, d: 40, rot: 0.3 }, { x: 960, y: 740, w: 46, d: 32, rot: -0.2 }, { x: 1390, y: 1180, w: 40, d: 30, rot: 0.6 }],
      trenches: [{ pts: [[1110, 560], [1150, 640], [1130, 720], [1170, 800]] }, { pts: [[1700, 1180], [1780, 1210], [1880, 1190]] }, { pts: [[360, 880], [380, 1000], [360, 1120]] }],
      roads: [{ pts: [[0, 1000], [400, 980], [800, 860], [1200, 760], [1600, 820], [1800, 1000]] }],
      wire: [{ pts: [[1240, 540], [1260, 700]] }, { pts: [[1560, 1240], [1660, 1290]] }],
      rocks: 34,
      sectors: [{ id: 'A', x: 1060, y: 680 }, { id: 'B', x: 1800, y: 1000 }, { id: 'C', x: 2540, y: 1320 }],
      bases: [[170, 1000], [3430, 1000]],
    },
    // Missions 01–02: a stream with a ford, and a wooded hill beyond it.
    ford: {
      name: 'THE FORD', W: 2800, H: 1700, seed: 23,
      hills: [{ x: 1500, y: 760, r: 240, h: 62 }, { x: 1720, y: 560, r: 160, h: 40 }, { x: 2300, y: 1100, r: 260, h: 46 }, { x: 600, y: 1300, r: 220, h: 26 }],
      ridges: [{ pts: [[2050, 200], [2150, 700], [2100, 1300]], w: 140, h: 30 }],
      woods: [{ x: 1420, y: 640, r: 110 }, { x: 1600, y: 860, r: 90 }, { x: 1330, y: 900, r: 80 }, { x: 420, y: 500, r: 150 }, { x: 700, y: 980, r: 110 }, { x: 2350, y: 420, r: 140 }, { x: 1900, y: 1350, r: 130 }, { x: 2600, y: 900, r: 120 }],
      ruins: [{ x: 1565, y: 695, w: 50, d: 36, rot: 0.2 }, { x: 1440, y: 830, w: 28, d: 28, rot: 0.2 }, { x: 980, y: 1180, w: 40, d: 30, rot: -0.4 }, { x: 2420, y: 1080, w: 44, d: 34, rot: 0.5 }],
      trenches: [{ pts: [[1360, 700], [1390, 780], [1370, 860], [1410, 940]] }, { pts: [[1590, 660], [1650, 720]] }],
      roads: [{ pts: [[0, 900], [500, 860], [900, 820], [1100, 800], [1400, 760], [1800, 700], [2200, 760], [2800, 820]] }],
      stream: { pts: [[1080, 0], [1040, 400], [1110, 800], [1060, 1200], [1120, 1700]], w: 46, fords: [[1110, 800]] },
      wire: [{ pts: [[1250, 600], [1270, 760]] }, { pts: [[1260, 860], [1280, 1000]] }],
      rocks: 26,
      sectors: [{ id: 'A', x: 1500, y: 760 }, { id: 'B', x: 2160, y: 700 }, { id: 'C', x: 2380, y: 1120 }],
      bases: [[150, 880], [2660, 820]],
    },
    // Missions 03–04: a long ridge with a radio mast, a village beyond it.
    ridge: {
      name: 'THE RIDGE', W: 3400, H: 1900, seed: 37,
      hills: [{ x: 900, y: 900, r: 220, h: 38 }, { x: 2650, y: 1000, r: 200, h: 30 }],
      ridges: [{ pts: [[1650, 150], [1720, 600], [1700, 1000], [1760, 1450], [1720, 1800]], w: 170, h: 74 }],
      woods: [{ x: 1600, y: 420, r: 100 }, { x: 1820, y: 1280, r: 110 }, { x: 1560, y: 1550, r: 90 }, { x: 600, y: 600, r: 130 }, { x: 1100, y: 1400, r: 140 }, { x: 2300, y: 500, r: 130 }, { x: 2950, y: 1500, r: 140 }, { x: 2200, y: 1600, r: 100 }],
      ruins: [{ x: 1775, y: 895, w: 60, d: 40, rot: 0.1 }, { x: 1645, y: 1035, w: 30, d: 30, rot: 0.1 },
        { x: 2600, y: 900, w: 50, d: 34, rot: 0 }, { x: 2680, y: 960, w: 40, d: 40, rot: 0.2 }, { x: 2560, y: 1040, w: 46, d: 30, rot: -0.1 }, { x: 2720, y: 1080, w: 34, d: 44, rot: 0.3 }, { x: 2640, y: 1150, w: 50, d: 30, rot: 0 }],
      trenches: [{ pts: [[1620, 780], [1640, 900], [1620, 1040], [1650, 1160]] }, { pts: [[860, 760], [900, 880], [870, 1000]] }, { pts: [[2480, 860], [2500, 1000], [2470, 1160]] }],
      roads: [{ pts: [[0, 950], [600, 920], [1200, 960], [1650, 980], [2000, 1000], [2500, 1000], [2900, 980], [3400, 960]] }, { pts: [[2620, 600], [2640, 1000], [2600, 1500]] }],
      wire: [{ pts: [[1480, 820], [1500, 980]] }, { pts: [[2380, 880], [2400, 1060]] }],
      rocks: 30,
      sectors: [{ id: 'A', x: 900, y: 900 }, { id: 'B', x: 1710, y: 960 }, { id: 'C', x: 2640, y: 1010 }],
      bases: [[150, 950], [3250, 960]],
    },
  };

  // ---------------------------------------------------------------- noise

  function noise2(seed) {
    const r = rng(seed);
    const N = 64;
    const v = new Float32Array(N * N);
    for (let i = 0; i < v.length; i++) v[i] = r() * 2 - 1;
    const at = (i, j) => v[((j % N + N) % N) * N + ((i % N + N) % N)];
    return function (x, y) {
      const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }

  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const L2 = dx * dx + dy * dy || 1;
    const t = clamp(((px - ax) * dx + (py - ay) * dy) / L2, 0, 1);
    const qx = ax + dx * t, qy = ay + dy * t;
    return Math.hypot(px - qx, py - qy);
  }
  function lineDist(px, py, pts) {
    let d = 1e9;
    for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(px, py, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
    return d;
  }

  // ---------------------------------------------------------------- build

  function buildMap(specOrId) {
    const base = typeof specOrId === 'string' ? MAPS[specOrId] : specOrId;
    const spec = base.symmetric ? mirror(base) : base;
    const { W, H } = spec;
    const nx = Math.ceil(W / CELL) + 1, ny = Math.ceil(H / CELL) + 1;
    const hgt = new Float32Array(nx * ny);
    const flag = new Uint8Array(nx * ny);
    const cover = new Float32Array(nx * ny);
    const n1 = noise2(spec.seed), n2 = noise2(spec.seed + 7);
    const r = rng(spec.seed * 13 + 1);

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = i * CELL, y = j * CELL;
        let h = noiseH(n1, n2, x, y);
        if (base.symmetric) h = (h + noiseH(n1, n2, W - x, H - y)) / 2;
        for (const hl of spec.hills) {
          const d2 = ((x - hl.x) ** 2 + (y - hl.y) ** 2) / (hl.r * hl.r);
          if (d2 < 9) h += hl.h * Math.exp(-d2 * 1.4);
        }
        for (const rd of spec.ridges || []) {
          const d = lineDist(x, y, rd.pts) / rd.w;
          if (d < 3) h += rd.h * Math.exp(-d * d * 1.6);
        }
        if (spec.stream) {
          const d = lineDist(x, y, spec.stream.pts);
          if (d < spec.stream.w * 1.6) h -= 8 * (1 - d / (spec.stream.w * 1.6));
          if (d < spec.stream.w / 2) flag[j * nx + i] |= F.WATER;
        }
        hgt[j * nx + i] = Math.max(0, h + 12);
      }
    }

    const cellOf = (x, y) => clamp(Math.round(y / CELL), 0, ny - 1) * nx + clamp(Math.round(x / CELL), 0, nx - 1);
    const paintLine = (pts, width, bit) => {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        if (lineDist(i * CELL, j * CELL, pts) <= width) flag[j * nx + i] |= bit;
      }
    };
    for (const w of spec.woods) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const d = Math.hypot(i * CELL - w.x, j * CELL - w.y);
        const edge = w.r * (0.85 + 0.25 * Math.sin(Math.atan2(j * CELL - w.y, i * CELL - w.x) * 3 + w.x));
        if (d < edge) flag[j * nx + i] |= F.WOOD;
      }
    }
    for (const rd of spec.roads || []) paintLine(rd.pts, 14, F.ROAD);
    for (const t of spec.trenches || []) paintLine(t.pts, 11, F.TRENCH);
    for (const w of spec.wire || []) paintLine(w.pts, 10, F.WIRE);
    if (spec.stream) for (const f of spec.stream.fords || []) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (Math.hypot(i * CELL - f[0], j * CELL - f[1]) < 46) { flag[j * nx + i] &= ~F.WATER; flag[j * nx + i] |= F.BRIDGE; }
    }
    // ruins: blocked footprints
    const ruins = spec.ruins.map((ru, k) => ({ ...ru, seed: spec.seed * 100 + k, corners: corners(ru) }));
    for (const ru of ruins) {
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (inRect(i * CELL, j * CELL, ru, 4)) flag[j * nx + i] |= F.RUIN;
    }
    // rocks: scattered, off roads and water
    const rocks = [];
    for (let k = 0; k < (spec.rocks || 0) * 3 && rocks.length < spec.rocks; k++) {
      const x = r.range(200, W - 200), y = r.range(100, H - 100);
      const c = cellOf(x, y);
      if (flag[c] & (F.WATER | F.ROAD | F.RUIN)) continue;
      rocks.push({ x, y, s: r.range(5, 11), seed: r.int(1, 1e6) });
      flag[c] |= F.ROCK;
      if (base.symmetric) { rocks.push({ x: W - x, y: H - y, s: rocks[rocks.length - 1].s, seed: rocks[rocks.length - 1].seed }); flag[cellOf(W - x, H - y)] |= F.ROCK; }
    }
    // cover by cell
    for (let c = 0; c < flag.length; c++) {
      const f = flag[c];
      let v = 0;
      if (f & F.WOOD) v = Math.max(v, 0.3);
      if (f & F.ROCK) v = Math.max(v, 0.35);
      if (f & F.TRENCH) v = Math.max(v, 0.55);
      cover[c] = v;
    }
    // next to a ruin wall
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const c = j * nx + i;
      if (flag[c] & F.RUIN) continue;
      if ((flag[c - 1] | flag[c + 1] | flag[c - nx] | flag[c + nx]) & F.RUIN) cover[c] = Math.max(cover[c], 0.45);
    }

    const field = {
      spec, name: spec.name, W, H, nx, ny, hgt, flag, cover, ruins, rocks,
      sectors: spec.sectors.map((s) => ({ ...s, owner: -1, prog: 0, pts: [0, 0], contested: false })),
      bases: spec.bases.map((b) => ({ x: b[0], y: b[1] })),
      extraCover: [],
    };
    buildNav(field);
    return field;
  }

  function noiseH(n1, n2, x, y) {
    return n1(x / 380, y / 380) * 12 + n2(x / 120, y / 120) * 3.5 + n2(x / 40 + 9, y / 40) * 1;
  }

  function mirror(spec) {
    const { W, H } = spec;
    const m = (p) => [W - p[0], H - p[1]];
    const out = Object.assign({}, spec);
    out.hills = spec.hills.concat(spec.hills.filter((h) => Math.hypot(h.x - W / 2, h.y - H / 2) > 40).map((h) => ({ ...h, x: W - h.x, y: H - h.y })));
    out.ridges = (spec.ridges || []).concat((spec.ridges || []).map((rd) => ({ ...rd, pts: rd.pts.map(m) })));
    out.woods = spec.woods.concat(spec.woods.map((w) => ({ ...w, x: W - w.x, y: H - w.y })));
    out.ruins = spec.ruins.concat(spec.ruins.map((ru) => ({ ...ru, x: W - ru.x, y: H - ru.y })));
    out.trenches = (spec.trenches || []).concat((spec.trenches || []).map((t) => ({ pts: t.pts.map(m) })));
    out.roads = (spec.roads || []).concat((spec.roads || []).map((t) => ({ pts: t.pts.map(m) })));
    out.wire = (spec.wire || []).concat((spec.wire || []).map((t) => ({ pts: t.pts.map(m) })));
    return out;
  }

  function corners(ru) {
    const c = Math.cos(ru.rot), s = Math.sin(ru.rot);
    return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [ru.x + (a * ru.w / 2) * c - (b * ru.d / 2) * s, ru.y + (a * ru.w / 2) * s + (b * ru.d / 2) * c]);
  }
  function inRect(x, y, ru, pad) {
    const c = Math.cos(-ru.rot), s = Math.sin(-ru.rot);
    const dx = x - ru.x, dy = y - ru.y;
    const lx = dx * c - dy * s, ly = dx * s + dy * c;
    return Math.abs(lx) <= ru.w / 2 + pad && Math.abs(ly) <= ru.d / 2 + pad;
  }

  // ---------------------------------------------------------------- queries

  function heightAt(f, x, y) {
    const gx = clamp(x / CELL, 0, f.nx - 1.001), gy = clamp(y / CELL, 0, f.ny - 1.001);
    const i = Math.floor(gx), j = Math.floor(gy), tx = gx - i, ty = gy - j;
    const a = f.hgt[j * f.nx + i], b = f.hgt[j * f.nx + i + 1], c = f.hgt[(j + 1) * f.nx + i], d = f.hgt[(j + 1) * f.nx + i + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  function flagAt(f, x, y) {
    const i = clamp(Math.round(x / CELL), 0, f.nx - 1), j = clamp(Math.round(y / CELL), 0, f.ny - 1);
    return f.flag[j * f.nx + i];
  }
  function coverAt(f, x, y) {
    const i = clamp(Math.round(x / CELL), 0, f.nx - 1), j = clamp(Math.round(y / CELL), 0, f.ny - 1);
    let v = f.cover[j * f.nx + i];
    for (const c of f.extraCover) if (Math.hypot(c.x - x, c.y - y) < c.r) v = Math.max(v, c.v);
    return v;
  }
  function inWoods(f, x, y) { return (flagAt(f, x, y) & F.WOOD) !== 0; }

  // Movement speed factor on this ground for infantry ('inf') or vehicles ('veh').
  function speedAt(f, x, y, kind) {
    const fl = flagAt(f, x, y);
    if (kind === 'inf') {
      let k = 1;
      if (fl & F.WATER) k *= 0.45;
      if (fl & F.WIRE) k *= 0.4;
      if (fl & F.WOOD) k *= 0.8;
      return k;
    }
    let k = fl & F.ROAD ? 1.3 : 1;
    if (fl & F.WOOD) k *= 0.5;
    if (fl & F.TRENCH) k *= 0.6;
    if (fl & F.WATER) k *= 0.15;
    return k;
  }

  // Line of sight: hills, ruin walls and thick woods block it.
  function los(f, x1, y1, h1, x2, y2, h2) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.ceil(d / 14);
    if (n < 2) return true;
    let wood = 0;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      const lh = h1 + (h2 - h1) * t;
      const fl = flagAt(f, x, y);
      let g = heightAt(f, x, y);
      if (fl & F.RUIN) g += 14;
      if (g > lh + 0.5) return false;
      if ((fl & F.WOOD) && d * t > 26 && d * (1 - t) > 26 && lh < g + 12) { wood += 14; if (wood > 84) return false; }
    }
    return true;
  }

  // ---------------------------------------------------------------- pathfinding

  function buildNav(f) {
    const gw = Math.ceil(f.W / NAV), gh = Math.ceil(f.H / NAV);
    const inf = new Float32Array(gw * gh), veh = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      let ci = 0, cv = 0, n = 0, blocked = false, water = false, bridge = false;
      for (let y = j * NAV; y < (j + 1) * NAV; y += CELL) for (let x = i * NAV; x < (i + 1) * NAV; x += CELL) {
        const fl = flagAt(f, x + CELL / 2, y + CELL / 2);
        if (fl & F.RUIN) blocked = true;
        if (fl & F.WATER) water = true;
        if (fl & F.BRIDGE) bridge = true;
        ci += 1 / speedAt(f, x + CELL / 2, y + CELL / 2, 'inf');
        cv += 1 / speedAt(f, x + CELL / 2, y + CELL / 2, 'veh');
        n++;
      }
      const c = j * gw + i;
      inf[c] = blocked ? Infinity : ci / n;
      veh[c] = blocked || (water && !bridge) ? Infinity : cv / n;
    }
    f.nav = { gw, gh, inf, veh };
  }

  function walkable(f, kind, x, y) {
    const N = f.nav;
    const i = clamp(Math.floor(x / NAV), 0, N.gw - 1), j = clamp(Math.floor(y / NAV), 0, N.gh - 1);
    return isFinite((kind === 'inf' ? N.inf : N.veh)[j * N.gw + i]);
  }

  // A* on the coarse grid, then straightened. Returns waypoints ending at the goal.
  function findPath(f, kind, x0, y0, x1, y1) {
    const N = f.nav;
    const cost = kind === 'inf' ? N.inf : N.veh;
    const toCell = (x, y) => [clamp(Math.floor(x / NAV), 0, N.gw - 1), clamp(Math.floor(y / NAV), 0, N.gh - 1)];
    let [si, sj] = toCell(x0, y0);
    let [gi, gj] = toCell(x1, y1);
    if (!isFinite(cost[gj * N.gw + gi])) {
      // goal blocked: aim for the nearest open cell
      let best = null, bd = 1e9;
      for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
        const i = gi + di, j = gj + dj;
        if (i < 0 || j < 0 || i >= N.gw || j >= N.gh || !isFinite(cost[j * N.gw + i])) continue;
        const d = di * di + dj * dj;
        if (d < bd) { bd = d; best = [i, j]; }
      }
      if (!best) return [{ x: x1, y: y1 }];
      [gi, gj] = best;
      x1 = gi * NAV + NAV / 2; y1 = gj * NAV + NAV / 2;
    }
    if (straight(f, kind, x0, y0, x1, y1)) return [{ x: x1, y: y1 }];
    const total = N.gw * N.gh;
    const g = new Float32Array(total).fill(Infinity);
    const from = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const open = [];
    const start = sj * N.gw + si, goal = gj * N.gw + gi;
    g[start] = 0;
    open.push([octile(si, sj, gi, gj), start]);
    let iter = 0;
    while (open.length && iter++ < 6000) {
      // small binary heap
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k;
      const [, cur] = open[bi];
      open[bi] = open[open.length - 1]; open.pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === goal) break;
      const ci = cur % N.gw, cj = (cur / N.gw) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= N.gw || nj >= N.gh) continue;
        const nc = nj * N.gw + ni;
        const cc = cost[nc];
        if (!isFinite(cc) || closed[nc]) continue;
        if (di && dj && (!isFinite(cost[cj * N.gw + ni]) || !isFinite(cost[nj * N.gw + ci]))) continue;
        const ng = g[cur] + cc * (di && dj ? 1.414 : 1);
        if (ng < g[nc]) { g[nc] = ng; from[nc] = cur; open.push([ng + octile(ni, nj, gi, gj), nc]); }
      }
    }
    if (from[goal] < 0 && goal !== start) return [{ x: x1, y: y1 }];
    const cells = [];
    for (let c = goal; c !== start && c >= 0; c = from[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => ({ x: (c % N.gw) * NAV + NAV / 2, y: ((c / N.gw) | 0) * NAV + NAV / 2 }));
    pts[pts.length - 1] = { x: x1, y: y1 };
    // straighten: skip waypoints we can walk past directly
    const out = [];
    let px = x0, py = y0, k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = pts.length - 1; m > k; m--) if (straight(f, kind, px, py, pts[m].x, pts[m].y)) { far = m; break; }
      out.push(pts[far]);
      px = pts[far].x; py = pts[far].y;
      k = far + 1;
    }
    return out;
  }

  function octile(i, j, gi, gj) {
    const dx = Math.abs(i - gi), dy = Math.abs(j - gj);
    return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
  }

  function straight(f, kind, x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.ceil(d / (NAV / 2));
    const N = f.nav;
    const cost = kind === 'inf' ? N.inf : N.veh;
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const c = clamp(Math.floor(y / NAV), 0, N.gh - 1) * N.gw + clamp(Math.floor(x / NAV), 0, N.gw - 1);
      if (!isFinite(cost[c]) || cost[c] > 1.9) return false;
    }
    return true;
  }

  BL.MAPS = MAPS;
  BL.MAPF = F;
  BL.CELL = CELL;
  BL.buildMap = buildMap;
  BL.heightAt = heightAt;
  BL.flagAt = flagAt;
  BL.coverAt = coverAt;
  BL.inWoods = inWoods;
  BL.speedAt = speedAt;
  BL.los = los;
  BL.walkable = walkable;
  BL.findPath = findPath;
  BL.lineDist = lineDist;
})(typeof window !== 'undefined' ? window : globalThis);
