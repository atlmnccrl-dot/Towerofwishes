/*
 * Tower of Wishes — the painted, animated campaign world map.
 *
 *   const m = TowRender.map.create(canvas);
 *   m.draw(view, t, sel);   // view = TowCampaign.view(Story, st); t = seconds; sel = node id or null
 *   m.pick(cssX, cssY);     // node id under a tap (CSS px relative to the canvas) or null
 *   m.nodeScreen(id);       // {x, y} CSS px of a node centre
 *   m.pan(dxCss);           // horizontal drag pan when the map is wider than the screen
 *
 * Map space is 1000 x 500 units (js/campaign.js), west on the left, the Tower
 * far east. The land is painted once per canvas size into an offscreen layer;
 * the fog of war (desaturated, darkened, hatched copy of the land, masked by
 * which regions are revealed) is baked on top once per reveal state. Each
 * frame only blits that layer and draws the light, moving parts: roads with
 * marching dashes, node markers, labels, drifting fog and cloud shadows,
 * birds, water shimmer, turning water wheels and the Tower's lights.
 *
 * Look (docs/ART_DIRECTION.md): a dark ink-and-cel map. Ink outlines, flat
 * two-tone fills, screentone dots and hatching; crimson marks the next story
 * step, violet is the Tower's (and glyph) light. Region names and terrain
 * details beyond the book's places are Proposals, like the regions themselves.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const TAU = Math.PI * 2;
  const P = {
    ink: '#0c0808', night: '#161212', charcoal: '#1d1718', slate: '#2d292b', ash: '#3d3337',
    dusk: '#4f4449', mauve: '#6e5353', rose: '#997d7b', bone: '#edcac0', white: '#f6f0ec',
    crimson: '#8e1621', blood: '#43171b', glow: '#e3263a', glyph: '#a98bff', steel: '#9cc3dd',
  };
  const TITLE_FONT = '"Shippori Mincho", "Hiragino Mincho ProN", Georgia, serif';
  const SUB_FONT = '"M PLUS 1p", system-ui, sans-serif';
  const TOP = 60; // CSS px kept clear for the title bar
  const VIEW_Y0 = 22, VIEW_Y1 = 462; // world rows that must fit on screen

  // ------------------------------------------------------------------ helpers
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  function mulberry(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  const RGB = new Map();
  function rgb(hex) {
    let v = RGB.get(hex);
    if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; RGB.set(hex, v); }
    return v;
  }
  function rgba(hex, a) { const v = rgb(hex); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; }
  function rad(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }
  function lin(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }
  function poly(ctx, pts, close = true) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  }
  // Catmull-Rom through points, sampled into a polyline.
  function spline(pts, per = 10) {
    if (pts.length < 3) {
      const out = [];
      for (let i = 0; i <= per; i++) out.push([lerp(pts[0][0], pts[1][0], i / per), lerp(pts[0][1], pts[1][1], i / per)]);
      return out;
    }
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const k = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1);
    return Math.hypot(px - ax - dx * k, py - ay - dy * k);
  }
  function distLine(px, py, line) {
    let d = Infinity;
    for (let i = 0; i < line.length - 1; i++) d = Math.min(d, distSeg(px, py, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]));
    return d;
  }
  // Screentone: a hex grid of dots whose radius follows density f(x, y) in 0..1.
  function tone(ctx, x0, y0, x1, y1, cell, color, f) {
    ctx.fillStyle = color;
    ctx.beginPath();
    let row = 0;
    for (let y = y0; y < y1; y += cell * 0.866, row++) {
      const off = row & 1 ? cell / 2 : 0;
      for (let x = x0 + off; x < x1; x += cell) {
        const d = f(x, y);
        if (d <= 0.03) continue;
        const r = cell * 0.5 * Math.sqrt(Math.min(1, d));
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
    }
    ctx.fill();
  }
  // Soft sprites (cached).
  const sprites = {};
  function glowSpr(color) {
    const key = 'g' + color;
    if (sprites[key]) return sprites[key];
    const c = mk(128, 128), x = c.getContext('2d');
    x.fillStyle = rad(x, 64, 64, 0, 64, [[0, rgba(color, 1)], [0.2, rgba(color, 0.55)], [0.5, rgba(color, 0.16)], [1, rgba(color, 0)]]);
    x.fillRect(0, 0, 128, 128);
    return (sprites[key] = c);
  }
  function puffSpr() {
    if (sprites.puff) return sprites.puff;
    const c = mk(160, 110), x = c.getContext('2d'), r = mulberry(7);
    for (let i = 0; i < 9; i++) {
      const px = 30 + r() * 100, py = 40 + r() * 30, pr = 18 + r() * 26;
      x.fillStyle = rad(x, px, py, 0, pr, [[0, 'rgba(70,60,66,0.55)'], [0.6, 'rgba(58,50,56,0.3)'], [1, 'rgba(50,44,48,0)']]);
      x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    }
    // hatch inside the puff so fog reads as ink, not airbrush
    x.globalCompositeOperation = 'source-atop';
    x.strokeStyle = 'rgba(12,8,8,0.35)';
    x.lineWidth = 1;
    x.beginPath();
    for (let k = -110; k < 160; k += 6) { x.moveTo(k, 110); x.lineTo(k + 110, 0); }
    x.stroke();
    return (sprites.puff = c);
  }
  function shadowSpr() {
    if (sprites.shadow) return sprites.shadow;
    const c = mk(256, 128), x = c.getContext('2d');
    x.save();
    x.scale(2, 1);
    x.fillStyle = rad(x, 64, 64, 0, 62, [[0, 'rgba(8,4,6,0.9)'], [0.55, 'rgba(8,4,6,0.55)'], [1, 'rgba(8,4,6,0)']]);
    x.fillRect(0, 0, 128, 128);
    x.restore();
    return (sprites.shadow = c);
  }

  // ------------------------------------------------------------- world data
  // River (world units, east to west): from the eastern mountains past the
  // mill, through the north edge of the forest, under the town's south wall,
  // out to the western sea.
  const RIVER = spline([[880, 40], [820, 95], [760, 128], [690, 150], [630, 190], [575, 228], [505, 244], [445, 252], [385, 256], [335, 246], [282, 262], [240, 300], [196, 330], [140, 336], [92, 338], [40, 350], [-30, 368], [-140, 376]], 8);
  const STREAM = spline([[905, 300], [860, 322], [815, 340], [785, 360]], 8); // feeds the eastern lake
  const DRY_BED = spline([[660, 312], [600, 334], [545, 362], [500, 398], [452, 428], [404, 462], [366, 520]], 8);
  const COAST = (() => { const r = mulberry(31), pts = []; for (let y = -320; y <= 1000; y += 16) pts.push([18 + Math.sin(y * 0.021) * 10 + Math.sin(y * 0.067) * 5 + r() * 5, y]); return pts; })();
  const LAKE = { x: 772, y: 372, rx: 30, ry: 16 };
  const TOWER = { x: 925, base: 274, w0: 30, w1: 13 };
  const TOWN_C = { x: 140, y: 258, r: 63 };
  const CLEARING = { x: 305, y: 300, r: 23 };
  const QUARRY = { x: 518, y: 168 };
  const MILL = { x: 436, y: 238, wx: 450, wy: 252 };
  const TOWN_WHEEL = { x: 112, y: 337 };
  const BRIDGE = { x: 525, y: 378 };
  const GATE = [208, 244]; // the town's east gate: the three roads from the Guild fork here
  // Region-name lettering positions (world).
  const REGION_LABEL = {
    town: [118, 380], forest: [292, 398], north: [140, 54], hills: [405, 168],
    east: [790, 205], // the Old Crossing is named by its node
  };
  // Hand-routed roads (via points between the two nodes). Others bend gently.
  const ROUTES = {
    'c1>c2': [[250, 292]],
    'c2>c4': [[160, 270]],
    'c4>yard': [[88, 268]],
    'c4>gauntlet': [[90, 205]],
    'c4>cart': [GATE, [218, 190], [214, 152]],
    'c4>c5': [GATE, [300, 214], [400, 222]],
    'c4>crossing': [GATE, [262, 330], [330, 372], [410, 396]],
    'cart>stray': [[275, 80]],
    'c5>deep': [[525, 160]],
    'c5>c6': [[560, 232], [640, 260]],
    'c6>prologue': [[790, 268], [880, 262], [925, 238]],
  };
  const FORK_EDGES = { cart: 1, c5: 1, crossing: 1 };

  // ---------------------------------------------------------------- terrain
  function ink(ctx, w) { ctx.strokeStyle = P.ink; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }

  function paintGround(g, regions, roads) {
    const r = mulberry(11);
    g.fillStyle = '#2a2425';
    g.fillRect(-400, -400, 2000, 1400);
    // hard cel patches of slightly different ground
    for (let i = 0; i < 70; i++) {
      const cx = -250 + r() * 1500, cy = -100 + r() * 700, rr = 20 + r() * 70;
      g.fillStyle = r() < 0.5 ? '#2f2829' : '#252021';
      g.beginPath();
      const n = 9;
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU, q = rr * (0.7 + r() * 0.4); k ? g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.6) : g.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 0.6); }
      g.closePath();
      g.fill();
    }
    // biome tints
    const TINT = { town: '#584a46', forest: '#34443b', fields: '#55503c', hills: '#574a4b', ruins: '#5c534e', wilds: '#3b363b', tower: '#211a1e' };
    for (const R of regions) {
      g.fillStyle = rad(g, R.x, R.y, 0, R.r * 1.35, [[0, TINT[R.biome]], [0.62, TINT[R.biome]], [1, rgba(TINT[R.biome], 0)]]);
      g.fillRect(R.x - R.r * 1.4, R.y - R.r * 1.4, R.r * 2.8, R.r * 2.8);
    }
    // grass tufts over open ground
    g.strokeStyle = 'rgba(12,8,8,0.55)';
    g.lineWidth = 0.7;
    g.beginPath();
    for (let i = 0; i < 900; i++) {
      const x = -250 + r() * 1500, y = -60 + r() * 640;
      if (x < 30) continue;
      g.moveTo(x - 1.6, y); g.lineTo(x, y - 2.2); g.lineTo(x + 1.6, y);
    }
    g.stroke();
  }

  function paintSea(g) {
    const r = mulberry(5);
    g.beginPath();
    g.moveTo(-500, -400);
    for (const p of COAST) g.lineTo(p[0], p[1]);
    g.lineTo(-500, 1000);
    g.closePath();
    g.fillStyle = '#1a1f25';
    g.fill();
    // coast ripple lines
    for (let k = 1; k <= 3; k++) {
      g.beginPath();
      COAST.forEach((p, i) => (i ? g.lineTo(p[0] - k * 5, p[1]) : g.moveTo(p[0] - k * 5, p[1])));
      g.strokeStyle = rgba('#6f8796', 0.32 - k * 0.08);
      g.lineWidth = 0.8;
      g.stroke();
    }
    // wave hatching
    g.strokeStyle = 'rgba(111,135,150,0.22)';
    g.lineWidth = 0.7;
    g.beginPath();
    for (let i = 0; i < 160; i++) {
      const x = -260 + r() * 260, y = -300 + r() * 1200, l = 3 + r() * 6;
      g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 1.5, x + l, y);
    }
    g.stroke();
    // coastline ink
    g.beginPath();
    COAST.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    ink(g, 1.5);
    g.stroke();
    g.beginPath();
    COAST.forEach((p, i) => (i ? g.lineTo(p[0] + 1.4, p[1]) : g.moveTo(p[0] + 1.4, p[1])));
    g.strokeStyle = rgba(P.rose, 0.4);
    g.lineWidth = 0.6;
    g.stroke();
  }

  function strokeLine(g, line, w, color) {
    g.beginPath();
    line.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.strokeStyle = color;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  }
  function paintWater(g) {
    // lake
    g.beginPath();
    g.ellipse(LAKE.x, LAKE.y, LAKE.rx + 1.5, LAKE.ry + 1.5, -0.15, 0, TAU);
    g.fillStyle = P.ink;
    g.fill();
    g.beginPath();
    g.ellipse(LAKE.x, LAKE.y, LAKE.rx, LAKE.ry, -0.15, 0, TAU);
    g.fillStyle = '#2b3a44';
    g.fill();
    g.beginPath();
    g.ellipse(LAKE.x + 4, LAKE.y + 3, LAKE.rx * 0.7, LAKE.ry * 0.55, -0.15, 0, TAU);
    g.fillStyle = '#22303a';
    g.fill();
    // rivers, widening downstream
    for (const [line, w0, w1] of [[RIVER, 3, 8], [STREAM, 2, 3.4]]) {
      const n = line.length;
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < n - 1; i++) {
          const w = lerp(w0, w1, i / n);
          const ww = pass === 0 ? w + 2.4 : pass === 1 ? w : w * 0.28;
          g.beginPath();
          g.moveTo(line[i][0] + (pass === 2 ? -w * 0.2 : 0), line[i][1] - (pass === 2 ? w * 0.2 : 0));
          g.lineTo(line[i + 1][0] + (pass === 2 ? -w * 0.2 : 0), line[i + 1][1] - (pass === 2 ? w * 0.2 : 0));
          g.strokeStyle = pass === 0 ? P.ink : pass === 1 ? '#2c3c47' : 'rgba(126,154,170,0.55)';
          g.lineWidth = ww;
          g.lineCap = 'round';
          g.stroke();
        }
      }
    }
  }

  function tree(g, x, y, h, dark, lit) {
    const w = h * 0.55;
    g.beginPath();
    g.moveTo(x, y - h);
    g.lineTo(x + w * 0.42, y - h * 0.5); g.lineTo(x + w * 0.28, y - h * 0.5);
    g.lineTo(x + w * 0.5, y - h * 0.08); g.lineTo(x - w * 0.5, y - h * 0.08);
    g.lineTo(x - w * 0.28, y - h * 0.5); g.lineTo(x - w * 0.42, y - h * 0.5);
    g.closePath();
    g.fillStyle = dark;
    g.fill();
    ink(g, 0.7);
    g.stroke();
    // lit left half (light from the upper left)
    g.beginPath();
    g.moveTo(x, y - h);
    g.lineTo(x - w * 0.42, y - h * 0.5); g.lineTo(x - w * 0.28, y - h * 0.5);
    g.lineTo(x - w * 0.5, y - h * 0.08); g.lineTo(x - w * 0.05, y - h * 0.08);
    g.closePath();
    g.fillStyle = lit;
    g.fill();
    g.fillStyle = P.ink;
    g.fillRect(x - 0.5, y - h * 0.08, 1, h * 0.1);
  }
  function scatter(rng, n, f) { for (let i = 0; i < n; i++) f(rng(), rng(), rng()); }

  function paintForest(g, R, roads) {
    const rng = mulberry(21), list = [];
    // the clearing
    g.beginPath();
    g.ellipse(CLEARING.x, CLEARING.y + 2, CLEARING.r * 1.1, CLEARING.r * 0.8, 0, 0, TAU);
    g.fillStyle = '#4c564e';
    g.fill();
    g.beginPath();
    g.ellipse(CLEARING.x + 3, CLEARING.y + 4, CLEARING.r * 0.85, CLEARING.r * 0.55, 0, 0, TAU);
    g.fillStyle = '#56615a';
    g.fill();
    // the failed formation's scorched ring, faint violet
    g.beginPath();
    g.ellipse(CLEARING.x, CLEARING.y + 2, CLEARING.r * 0.95, CLEARING.r * 0.62, 0, 0, TAU);
    g.strokeStyle = rgba(P.glyph, 0.28);
    g.lineWidth = 0.8;
    g.setLineDash([3, 2]);
    g.stroke();
    g.setLineDash([]);
    // the fallen tree in the clearing
    g.save();
    g.translate(CLEARING.x + 13, CLEARING.y + 10);
    g.rotate(-0.35);
    g.fillStyle = '#4a3c36';
    g.fillRect(-11, -1.6, 22, 3.2);
    ink(g, 0.7);
    g.strokeRect(-11, -1.6, 22, 3.2);
    g.fillStyle = '#7b665c';
    g.beginPath(); g.ellipse(11, 0, 1.2, 1.6, 0, 0, TAU); g.fill(); g.stroke();
    g.restore();
    for (let i = 0; i < 420; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * R.r * 1.12;
      const x = R.x + Math.cos(a) * d, y = R.y + Math.sin(a) * d * 0.95;
      if (Math.hypot(x - CLEARING.x, (y - CLEARING.y) * 1.3) < CLEARING.r + 6) continue;
      if (distLine(x, y, RIVER) < 8) continue;
      if (roads.some((l) => distLine(x, y + 4, l) < 7)) continue;
      if (d > R.r * 0.85 && rng() < (d - R.r * 0.85) / (R.r * 0.3)) continue;
      list.push([x, y, 10 + rng() * 9]);
    }
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, y, h] of list) tree(g, x, y, h, '#1c2621', '#3a4a41');
  }

  function paintTown(g, R, nodes) {
    const rng = mulberry(41);
    const C = TOWN_C;
    // inside the walls: paved ground
    g.beginPath();
    const wall = [];
    for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU; wall.push([C.x + Math.cos(a) * C.r * (0.96 + rng() * 0.08), C.y + Math.sin(a) * C.r * 0.88]); }
    poly(g, wall);
    g.fillStyle = '#4e4441';
    g.fill();
    // streets
    g.strokeStyle = '#625653';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(C.x - C.r, C.y); g.lineTo(C.x + C.r, C.y - 8);
    g.moveTo(C.x - 10, C.y - C.r * 0.85); g.lineTo(C.x + 8, C.y + C.r * 0.85);
    g.stroke();
    // houses: gabled blocks, sorted by y
    const houses = [];
    for (let i = 0; i < 140 && houses.length < 46; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * C.r * 0.82;
      const x = C.x + Math.cos(a) * d, y = C.y + Math.sin(a) * d * 0.86;
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 15)) continue;
      if (Math.hypot(x - 152, y - 226) < 16) continue; // the Guild
      if (houses.some((h) => Math.abs(h[0] - x) < 9 && Math.abs(h[1] - y) < 7)) continue;
      houses.push([x, y, 6 + rng() * 4, 4 + rng() * 2, rng()]);
    }
    houses.push([152, 228, 20, 9, -1]); // the Guild hall
    houses.sort((a, b) => a[1] - b[1]);
    for (const [x, y, w, h, k] of houses) {
      const guild = k < 0;
      const rh = h * 0.9;
      // wall
      g.fillStyle = guild ? '#7a6965' : '#6a5c58';
      g.fillRect(x - w / 2, y - h, w, h);
      g.fillStyle = 'rgba(12,8,8,0.35)';
      g.fillRect(x + w * 0.1, y - h, w * 0.4, h);
      // roof
      g.beginPath();
      g.moveTo(x - w / 2 - 1, y - h); g.lineTo(x - w / 2 + 2, y - h - rh); g.lineTo(x + w / 2 - 2, y - h - rh); g.lineTo(x + w / 2 + 1, y - h);
      g.closePath();
      g.fillStyle = guild ? P.crimson : k < 0.5 ? '#6e4746' : '#5b4a4c';
      g.fill();
      g.beginPath();
      g.moveTo(x - w / 2 - 1, y - h); g.lineTo(x - w / 2 + 2, y - h - rh); g.lineTo(x, y - h - rh); g.lineTo(x, y - h);
      g.closePath();
      g.fillStyle = guild ? '#b23240' : k < 0.5 ? '#8b605c' : '#776466';
      g.fill();
      ink(g, 0.7);
      g.beginPath();
      g.rect(x - w / 2, y - h, w, h);
      g.moveTo(x - w / 2 - 1, y - h); g.lineTo(x - w / 2 + 2, y - h - rh); g.lineTo(x + w / 2 - 2, y - h - rh); g.lineTo(x + w / 2 + 1, y - h);
      g.stroke();
      if (guild) {
        // banner pole + pennant, door
        g.fillStyle = P.ink;
        g.fillRect(x - 1.5, y - 4, 3, 4);
        g.beginPath(); g.moveTo(x + 6, y - h - rh); g.lineTo(x + 6, y - h - rh - 9); ink(g, 0.8); g.stroke();
        g.beginPath(); g.moveTo(x + 6, y - h - rh - 9); g.lineTo(x + 13, y - h - rh - 7); g.lineTo(x + 6, y - h - rh - 5); g.closePath();
        g.fillStyle = P.bone; g.fill(); ink(g, 0.5); g.stroke();
      } else if (k > 0.75) {
        g.fillStyle = 'rgba(237,202,192,0.55)';
        g.fillRect(x - w * 0.3, y - h * 0.6, 1.3, 1.3);
      }
    }
    // the wall itself: a thick ink ring with bone-lit top and towers
    g.beginPath(); poly(g, wall);
    ink(g, 4.2); g.stroke();
    g.strokeStyle = '#8a7570'; g.lineWidth = 2.4; g.stroke();
    g.strokeStyle = 'rgba(237,202,192,0.5)'; g.lineWidth = 0.7; g.stroke();
    for (let i = 0; i < wall.length; i += 2) {
      const [x, y] = wall[i];
      g.fillStyle = '#7a6662';
      g.fillRect(x - 3.2, y - 6, 6.4, 7);
      g.fillStyle = '#5a4a48';
      g.fillRect(x, y - 6, 3.2, 7);
      ink(g, 0.8);
      g.strokeRect(x - 3.2, y - 6, 6.4, 7);
      g.fillStyle = P.ink;
      g.fillRect(x - 3.6, y - 7.4, 7.2, 1.6);
    }
    // gate gap marker on the east side
    g.fillStyle = '#3a3030';
    g.fillRect(GATE[0] - 3, GATE[1] - 4, 6, 8);
    // the wheel house by the south wall (wheel itself animates)
    g.fillStyle = '#5e504d';
    g.fillRect(TOWN_WHEEL.x - 14, TOWN_WHEEL.y - 12, 10, 8);
    g.fillStyle = '#6e4746';
    g.beginPath(); g.moveTo(TOWN_WHEEL.x - 15, TOWN_WHEEL.y - 12); g.lineTo(TOWN_WHEEL.x - 9, TOWN_WHEEL.y - 17); g.lineTo(TOWN_WHEEL.x - 3, TOWN_WHEEL.y - 12); g.closePath(); g.fill();
    ink(g, 0.7); g.stroke(); g.strokeRect(TOWN_WHEEL.x - 14, TOWN_WHEEL.y - 12, 10, 8);
    // the evaluation yard: a fenced square
    g.strokeStyle = '#7a6660'; g.lineWidth = 1;
    g.setLineDash([2, 1.4]);
    g.strokeRect(54, 290, 32, 22);
    g.setLineDash([]);
  }

  function paintFields(g, R, nodes) {
    const rng = mulberry(51);
    const cols = ['#5a5440', '#4e5238', '#62573f', '#555036', '#4a4a3a'];
    const ang = -0.25, ca = Math.cos(ang), sa = Math.sin(ang);
    const cell = 22;
    for (let i = -6; i <= 6; i++) {
      for (let j = -6; j <= 6; j++) {
        const u = i * cell + (j & 1 ? cell * 0.4 : 0), v = j * cell * 0.75;
        const cx = R.x + u * ca - v * sa, cy = R.y + u * sa + v * ca;
        const d = Math.hypot(cx - R.x, (cy - R.y) * 1.1);
        if (d > R.r * (0.85 + rng() * 0.25)) continue;
        if (cy < 30) continue;
        const pts = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([a, b]) => {
          const uu = a * cell * 0.94 + (rng() - 0.5) * 3, vv = b * cell * 0.7 + (rng() - 0.5) * 3;
          return [cx + uu * ca - vv * sa, cy + uu * sa + vv * ca];
        });
        g.beginPath(); poly(g, pts);
        g.fillStyle = cols[Math.floor(rng() * cols.length)];
        g.fill();
        // furrows
        g.save();
        g.clip();
        g.strokeStyle = 'rgba(12,8,8,0.28)';
        g.lineWidth = 0.6;
        g.beginPath();
        const fa = ang + (rng() < 0.5 ? 0 : Math.PI / 2);
        for (let k = -14; k <= 14; k += 2.6) {
          g.moveTo(cx + Math.cos(fa) * -16 - Math.sin(fa) * k, cy + Math.sin(fa) * -16 + Math.cos(fa) * k);
          g.lineTo(cx + Math.cos(fa) * 16 - Math.sin(fa) * k, cy + Math.sin(fa) * 16 + Math.cos(fa) * k);
        }
        g.stroke();
        g.restore();
        g.beginPath(); poly(g, pts);
        ink(g, 0.6); g.stroke();
      }
    }
    // hedgerow trees, haystacks and farmhouses
    scatter(rng, 50, (a, b, c) => {
      const x = R.x + (a - 0.5) * R.r * 1.9, y = R.y + (b - 0.5) * R.r * 1.6;
      if (Math.hypot(x - R.x, y - R.y) > R.r * 0.95 || y < 36) return;
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 16)) return;
      if (c < 0.6) {
        g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fillStyle = '#2f3a2f'; g.fill(); ink(g, 0.6); g.stroke();
        g.beginPath(); g.arc(x - 0.8, y - 0.8, 1.2, 0, TAU); g.fillStyle = '#4a5a48'; g.fill();
      } else if (c < 0.85) {
        g.beginPath(); g.ellipse(x, y, 2.4, 1.8, 0, Math.PI, 0); g.closePath(); g.fillStyle = '#a08a5c'; g.fill(); ink(g, 0.5); g.stroke();
      } else {
        g.fillStyle = '#6a5c58'; g.fillRect(x - 4, y - 3, 8, 4);
        g.beginPath(); g.moveTo(x - 5, y - 3); g.lineTo(x, y - 7); g.lineTo(x + 5, y - 3); g.closePath();
        g.fillStyle = '#7e5a54'; g.fill(); ink(g, 0.6); g.stroke(); g.strokeRect(x - 4, y - 3, 8, 4);
      }
    });
  }

  function mound(g, x, y, w, h, base, shade) {
    g.beginPath();
    g.moveTo(x - w, y);
    g.bezierCurveTo(x - w * 0.6, y - h * 1.2, x + w * 0.5, y - h * 1.25, x + w, y);
    g.closePath();
    g.fillStyle = base;
    g.fill();
    g.beginPath();
    g.moveTo(x + w * 0.05, y - h * 0.9);
    g.bezierCurveTo(x + w * 0.45, y - h * 0.85, x + w * 0.8, y - h * 0.4, x + w, y);
    g.lineTo(x + w * 0.2, y);
    g.closePath();
    g.fillStyle = shade;
    g.fill();
    g.beginPath();
    g.moveTo(x - w, y);
    g.bezierCurveTo(x - w * 0.6, y - h * 1.2, x + w * 0.5, y - h * 1.25, x + w, y);
    ink(g, 0.9);
    g.stroke();
  }

  function paintHills(g, R, nodes) {
    const rng = mulberry(61), list = [];
    for (let i = 0; i < 60 && list.length < 22; i++) {
      const x = R.x + (rng() - 0.5) * R.r * 1.9, y = R.y + (rng() - 0.5) * R.r * 1.5;
      if (Math.hypot(x - R.x, y - R.y) > R.r * 0.98) continue;
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y + 6) < 20)) continue;
      if (Math.hypot(x - QUARRY.x, y - QUARRY.y) < 30 || Math.hypot(x - MILL.x, y - MILL.y) < 18) continue;
      if (distLine(x, y, RIVER) < 10) continue;
      list.push([x, y, 12 + rng() * 14, 6 + rng() * 7]);
    }
    list.sort((a, b) => a[1] - b[1]);
    for (const [x, y, w, h] of list) mound(g, x, y, w, h, '#5d4d4e', '#3f3436');
    // the quarry: a cut, stepped face of pale stone
    const Q = QUARRY;
    const steps = [[-26, 0, 52, 8], [-20, -8, 40, 8], [-13, -16, 26, 7]];
    for (const [dx, dy, w, h] of steps) {
      g.fillStyle = '#8e7c76';
      g.fillRect(Q.x + dx, Q.y + dy - h, w, h);
      g.fillStyle = '#5b4d4c';
      g.fillRect(Q.x + dx, Q.y + dy - h * 0.45, w, h * 0.45);
      g.fillStyle = '#c9aea4';
      g.fillRect(Q.x + dx, Q.y + dy - h, w, 1.2);
      ink(g, 0.8);
      g.strokeRect(Q.x + dx, Q.y + dy - h, w, h);
    }
    // cut marks
    g.strokeStyle = 'rgba(12,8,8,0.5)';
    g.lineWidth = 0.5;
    g.beginPath();
    for (let k = -22; k < 24; k += 5) { g.moveTo(Q.x + k, Q.y - 1); g.lineTo(Q.x + k + 1, Q.y - 6); }
    g.stroke();
    // loading frame
    g.beginPath();
    g.moveTo(Q.x + 30, Q.y + 2); g.lineTo(Q.x + 35, Q.y - 14); g.lineTo(Q.x + 40, Q.y + 2);
    g.moveTo(Q.x + 31.5, Q.y - 4); g.lineTo(Q.x + 38.5, Q.y - 4);
    g.strokeStyle = '#7b5d4c'; g.lineWidth = 1.4; g.stroke();
    ink(g, 0.5); g.stroke();
    // rubble
    scatter(rng, 16, (a, b) => {
      g.beginPath(); g.arc(Q.x - 30 + a * 60, Q.y + 3 + b * 7, 0.8 + a * 1.1, 0, TAU);
      g.fillStyle = '#9a8780'; g.fill(); ink(g, 0.4); g.stroke();
    });
    // the mill (wheel animates)
    g.fillStyle = '#6a5a56';
    g.fillRect(MILL.x - 9, MILL.y - 9, 14, 10);
    g.fillStyle = '#504444';
    g.fillRect(MILL.x - 2, MILL.y - 9, 7, 10);
    g.beginPath(); g.moveTo(MILL.x - 11, MILL.y - 9); g.lineTo(MILL.x - 2, MILL.y - 17); g.lineTo(MILL.x + 7, MILL.y - 9); g.closePath();
    g.fillStyle = '#6e4746'; g.fill(); ink(g, 0.8); g.stroke();
    g.strokeRect(MILL.x - 9, MILL.y - 9, 14, 10);
  }

  function brokenWall(g, x, y, w, h, rng) {
    const pts = [[x, y], [x, y - h]];
    const n = 4;
    for (let k = 1; k <= n; k++) pts.push([x + (w * k) / n, y - h * (0.3 + rng() * 0.8)]);
    pts.push([x + w, y]);
    g.beginPath(); poly(g, pts);
    g.fillStyle = '#7d6f6c'; g.fill();
    g.fillStyle = '#4f4447';
    g.fillRect(x, y - 2.2, w, 2.2);
    ink(g, 0.8); g.stroke();
    g.strokeStyle = 'rgba(12,8,8,0.4)'; g.lineWidth = 0.4;
    g.beginPath();
    for (let k = 2; k < h; k += 2.6) { g.moveTo(x + 0.5, y - k); g.lineTo(x + w - 0.5, y - k); }
    g.stroke();
  }

  function paintRuins(g, R, nodes) {
    const rng = mulberry(71);
    // dusty pale ground patches
    scatter(rng, 30, (a, b, c) => {
      const x = R.x + (a - 0.5) * R.r * 1.8, y = R.y + (b - 0.5) * R.r * 1.4;
      if (Math.hypot(x - R.x, y - R.y) > R.r) return;
      g.beginPath(); g.ellipse(x, y, 8 + c * 14, 3 + c * 5, 0, 0, TAU);
      g.fillStyle = 'rgba(122,108,100,0.28)'; g.fill();
    });
    // the dry riverbed: dark banks, pale cracked floor
    strokeLine(g, DRY_BED, 15, P.ink);
    strokeLine(g, DRY_BED, 13, '#3c3332');
    strokeLine(g, DRY_BED, 8, '#7a6a62');
    g.setLineDash([2.5, 3.5]);
    strokeLine(g, DRY_BED, 0.6, 'rgba(12,8,8,0.7)');
    g.setLineDash([]);
    g.strokeStyle = 'rgba(12,8,8,0.55)';
    g.lineWidth = 0.5;
    g.beginPath();
    for (let i = 2; i < DRY_BED.length - 2; i += 1) {
      const p = DRY_BED[i];
      const a = rng() * TAU, l = 2 + rng() * 2.5;
      g.moveTo(p[0], p[1]); g.lineTo(p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l);
    }
    g.stroke();
    // the old stone bridge across the bed
    g.save();
    g.translate(BRIDGE.x, BRIDGE.y);
    g.rotate(0.62);
    g.fillStyle = '#8e7e78';
    g.fillRect(-4, -12, 8, 24);
    g.fillStyle = '#5f5251';
    g.fillRect(1.5, -12, 2.5, 24);
    ink(g, 0.9);
    g.strokeRect(-4, -12, 8, 24);
    // parapet stones and a broken end
    g.fillStyle = P.ink;
    for (let k = -11; k < 8; k += 3.2) { g.fillRect(-4.6, k, 1.2, 1.8); g.fillRect(3.4, k, 1.2, 1.8); }
    g.fillStyle = '#3c3332';
    g.beginPath(); g.moveTo(-4, 12); g.lineTo(-1, 9); g.lineTo(2, 12.5); g.lineTo(4, 10); g.lineTo(4, 13); g.lineTo(-4, 13); g.closePath(); g.fill();
    g.restore();
    // broken walls and toppled columns
    const walls = [[430, 372, 16, 8], [512, 432, 12, 7], [446, 344, 10, 6], [540, 404, 9, 9], [402, 418, 13, 6], [500, 352, 8, 5]];
    for (const [x, y, w, h] of walls) if (!nodes.some((n) => Math.hypot(n.x - x - w / 2, n.y - y) < 16)) brokenWall(g, x, y, w, h, rng);
    scatter(rng, 12, (a, b) => {
      const x = R.x + (a - 0.5) * R.r * 1.6, y = R.y + (b - 0.5) * R.r * 1.2;
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 14)) return;
      g.beginPath(); g.rect(x - 2, y - 1, 4, 2); g.fillStyle = '#9a8a84'; g.fill(); ink(g, 0.4); g.stroke();
    });
  }

  function mountain(g, x, y, w, h, rng) {
    const peak = x + (rng() - 0.5) * w * 0.3;
    const lpts = [[x - w, y]], rpts = [];
    lpts.push([lerp(x - w, peak, 0.5), y - h * (0.45 + rng() * 0.15)]);
    lpts.push([peak, y - h]);
    rpts.push([lerp(peak, x + w, 0.5), y - h * (0.4 + rng() * 0.15)]);
    rpts.push([x + w, y]);
    const all = lpts.concat(rpts);
    g.beginPath(); poly(g, all);
    g.fillStyle = '#2c272b';
    g.fill();
    // lit west face
    g.beginPath();
    poly(g, lpts.concat([[peak + w * 0.08, y - h * 0.55], [peak - w * 0.1, y]]));
    g.fillStyle = '#5a5055';
    g.fill();
    // snow cap
    g.beginPath();
    g.moveTo(peak, y - h);
    g.lineTo(peak - w * 0.24, y - h * 0.72);
    g.lineTo(peak - w * 0.08, y - h * 0.78);
    g.lineTo(peak + w * 0.02, y - h * 0.68);
    g.lineTo(peak + w * 0.2, y - h * 0.75);
    g.closePath();
    g.fillStyle = '#cdb2aa';
    g.fill();
    g.beginPath(); poly(g, all, false);
    ink(g, 1);
    g.stroke();
    // ridge line
    g.beginPath(); g.moveTo(peak, y - h); g.lineTo(peak + w * 0.06, y - h * 0.5); g.lineTo(peak - w * 0.04, y);
    ink(g, 0.5); g.stroke();
  }

  function paintWilds(g, R, nodes) {
    const rng = mulberry(81), list = [];
    // ranges: north-east, south-east, and beyond the Tower
    const bands = [[560, 860, 70, 150, 26], [610, 1000, 400, 490, 22], [1000, 1250, 60, 480, 30], [800, 880, 150, 200, 5], [-200, -40, 0, 0, 0]];
    for (const [x0, x1, y0, y1, n] of bands) for (let i = 0; i < n; i++) list.push([x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0), 14 + rng() * 16, 18 + rng() * 22]);
    const keep = list.filter(([x, y]) => !nodes.some((n) => Math.hypot(n.x - x, n.y - y + 10) < 26) && Math.abs(x - TOWER.x) > 34 && !(Math.hypot(x - QUARRY.x, y - QUARRY.y) < 50) && distLine(x, y, RIVER) > 8);
    // eastern pine woods
    const trees = [];
    for (let i = 0; i < 160; i++) {
      const cx = [640, 820, 700, 860][i % 4], cy = [330, 250, 200, 440][i % 4];
      const x = cx + (rng() - 0.5) * 70, y = cy + (rng() - 0.5) * 40;
      if (nodes.some((n) => Math.hypot(n.x - x, n.y - y) < 18)) continue;
      if (Math.hypot((x - LAKE.x) / LAKE.rx, (y - LAKE.y) / LAKE.ry) < 1.4) continue;
      if (distLine(x, y, RIVER) < 7 || distLine(x, y, DRY_BED) < 10) continue;
      trees.push([x, y, 8 + rng() * 6, 0]);
    }
    const all = keep.map((m) => m.concat(1)).concat(trees);
    all.sort((a, b) => a[1] - b[1]);
    for (const it of all) {
      if (it[4] === 1) mountain(g, it[0], it[1], it[2], it[3], rng);
      else tree(g, it[0], it[1], it[2], '#202622', '#3a433d');
    }
  }

  function paintTowerGround(g, R) {
    // scorched ground and old shock rings around the base
    g.beginPath();
    g.ellipse(TOWER.x, TOWER.base, 46, 16, 0, 0, TAU);
    g.fillStyle = '#171214';
    g.fill();
    for (let k = 1; k <= 3; k++) {
      g.beginPath();
      g.ellipse(TOWER.x, TOWER.base, 26 + k * 18, 9 + k * 6.5, 0, 0, TAU);
      g.strokeStyle = rgba(P.glyph, 0.18 - k * 0.04);
      g.lineWidth = 0.8;
      g.setLineDash([4, 3]);
      g.stroke();
    }
    g.setLineDash([]);
    const rng = mulberry(91);
    g.strokeStyle = 'rgba(12,8,8,0.7)';
    g.lineWidth = 0.6;
    g.beginPath();
    for (let i = 0; i < 18; i++) {
      const a = rng() * TAU, r0 = 20 + rng() * 10, r1 = r0 + 10 + rng() * 25;
      g.moveTo(TOWER.x + Math.cos(a) * r0, TOWER.base + Math.sin(a) * r0 * 0.35);
      g.lineTo(TOWER.x + Math.cos(a) * r1, TOWER.base + Math.sin(a) * r1 * 0.35);
    }
    g.stroke();
  }

  // The Tower: always visible, painted above the fog.
  function towerX(y, side) {
    const k = clamp((TOWER.base - y) / (TOWER.base + 80), 0, 1);
    return TOWER.x + side * lerp(TOWER.w0, TOWER.w1, Math.sqrt(k)) / 2;
  }
  function paintTower(g) {
    const top = -120;
    // faint violet aura
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.35;
    g.drawImage(glowSpr(P.glyph), TOWER.x - 60, 20, 120, 280);
    g.restore();
    // plinth
    for (let k = 0; k < 3; k++) {
      const w = 46 - k * 8, y = TOWER.base + 4 - k * 4;
      g.fillStyle = k & 1 ? '#3d3337' : '#4f4449';
      g.fillRect(TOWER.x - w / 2, y - 4, w, 4);
      g.fillStyle = '#272023';
      g.fillRect(TOWER.x, y - 4, w / 2, 4);
      ink(g, 0.9);
      g.strokeRect(TOWER.x - w / 2, y - 4, w, 4);
    }
    // shaft
    const L = [], Rr = [];
    for (let y = TOWER.base - 8; y >= top; y -= 8) { L.push([towerX(y, -1), y]); Rr.push([towerX(y, 1), y]); }
    g.beginPath(); poly(g, L.concat(Rr.slice().reverse()));
    g.fillStyle = '#1f191c';
    g.fill();
    g.beginPath(); poly(g, L.concat(Rr.map(([x, y]) => [lerp(TOWER.x, x, 0.05), y]).reverse()));
    g.fillStyle = '#5a4c50';
    g.fill();
    g.beginPath(); poly(g, L.concat(L.map(([x, y]) => [x + 2.2, y]).reverse()));
    g.fillStyle = '#a58c86';
    g.fill();
    // tier bands
    ink(g, 0.7);
    g.beginPath();
    for (let y = TOWER.base - 20; y > top; y -= 18 + (TOWER.base - y) * 0.02) { g.moveTo(towerX(y, -1), y); g.lineTo(towerX(y, 1), y); }
    g.stroke();
    g.beginPath(); poly(g, L.concat(Rr.slice().reverse()));
    ink(g, 1.6);
    g.stroke();
  }
  // Tower windows, in world units (twinkle per frame).
  const TOWER_LIGHTS = (() => { const r = mulberry(17), a = []; for (let y = TOWER.base - 26; y > 30; y -= 13 + r() * 9) a.push([TOWER.x + (r() - 0.6) * 6, y, r() * TAU, r() < 0.3]); return a; })();

  // The cloud ceiling across the top of the map; it swallows the Tower.
  function ceilingY(x) { return 40 + Math.sin(x * 0.013) * 5 + Math.sin(x * 0.041 + 1) * 3 + 22 * Math.exp(-((x - TOWER.x) ** 2) / 4200); }
  function paintCeiling(g) {
    const rng = mulberry(101);
    // body
    g.beginPath();
    g.moveTo(-400, -400);
    for (let x = -400; x <= 1600; x += 10) g.lineTo(x, ceilingY(x) - 8);
    g.lineTo(1600, -400);
    g.closePath();
    g.fillStyle = '#1b1518';
    g.fill();
    // hanging lobes along the edge, lit from beneath near the Tower
    const lobes = [];
    for (let x = -400; x <= 1600; x += 9 + rng() * 14) lobes.push([x, ceilingY(x) - 6 + rng() * 6, 7 + rng() * 9]);
    for (const [x, y, r] of lobes) {
      const near = Math.exp(-((x - TOWER.x) ** 2) / 30000);
      g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.7, 0, 0, TAU);
      g.fillStyle = '#231b1f'; g.fill();
      g.beginPath(); g.ellipse(x, y + r * 0.22, r * 1.1, r * 0.42, 0, 0, Math.PI);
      g.fillStyle = near > 0.15 ? rgba('#7d6680', 0.35 + near * 0.5) : '#2f272b';
      g.fill();
    }
    for (const [x, y, r] of lobes) {
      g.beginPath(); g.ellipse(x, y, r * 1.3, r * 0.7, 0, 0.1, Math.PI - 0.1);
      ink(g, 0.8); g.stroke();
    }
    // horizontal hatching in the cloud body
    g.strokeStyle = 'rgba(12,8,8,0.6)';
    g.lineWidth = 0.6;
    g.beginPath();
    for (let i = 0; i < 260; i++) {
      const x = -400 + rng() * 2000, y = -200 + rng() * 230;
      if (y > ceilingY(x) - 14) continue;
      g.moveTo(x, y); g.lineTo(x + 8 + rng() * 22, y);
    }
    g.stroke();
    // where the Tower enters the clouds: a violet-bone glow
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55;
    g.drawImage(glowSpr(P.glyph), TOWER.x - 70, ceilingY(TOWER.x) - 60, 140, 90);
    g.globalAlpha = 0.3;
    g.drawImage(glowSpr(P.bone), TOWER.x - 26, ceilingY(TOWER.x) - 30, 52, 44);
    g.restore();
  }

  // ------------------------------------------------------------- the painter
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const regionsById = {};
    const NODE_POS = {};
    let L = null;          // layout
    let base = null;       // land, full detail, per size
    let stat = null;       // land + fog + tower + ceiling + vignette, per size and reveal mask
    let statKey = '';
    let panX = 0;
    let roadLines = null;  // world polylines per edge key
    let lastView = null;
    let fogSet = new Set(); // locked nodes in unrevealed lands

    function layout() {
      const dpr = canvas.width / Math.max(1, canvas.clientWidth || canvas.width);
      const W = canvas.width / dpr, H = canvas.height / dpr;
      if (L && L.W === W && L.H === H && L.dpr === dpr && L.panX === panX) return L;
      const availH = Math.max(120, H - TOP - 6);
      // fit the map's rows into the free height; never narrower than the screen allows
      let s = Math.min(W / 1040, availH / (VIEW_Y1 - VIEW_Y0));
      s = Math.max(s, Math.min(W / 1040, 0.5));
      const mapW = 1000 * s;
      let ox;
      if (mapW + 40 <= W) { ox = (W - mapW) / 2; panX = 0; }
      else { panX = clamp(panX, W - mapW - 40, 0); ox = 20 + panX; }
      const oy = TOP + 3 + (availH - (VIEW_Y1 - VIEW_Y0) * s) / 2 - VIEW_Y0 * s;
      L = { dpr, W, H, s, ox, oy, panX, mapW };
      base = null;
      stat = null;
      return L;
    }
    const sx = (x) => L.ox + x * L.s;
    const sy = (y) => L.oy + y * L.s;
    function world(g) { g.setTransform(L.s * L.dpr, 0, 0, L.s * L.dpr, L.ox * L.dpr, L.oy * L.dpr); }
    function screen(g) { g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0); }

    function buildRoads(view) {
      if (roadLines) return roadLines;
      for (const n of view.nodes) NODE_POS[n.id] = [n.x, n.y];
      roadLines = {};
      for (const e of view.edges) {
        const k = e.a + '>' + e.b, A = NODE_POS[e.a], B = NODE_POS[e.b];
        let via = ROUTES[k];
        if (!via) {
          const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1;
          via = [[mx - (dy / l) * l * 0.12, my + (dx / l) * l * 0.12]];
        }
        const pts = [A].concat(via, [B]);
        // the forked roads share the trunk to the gate; draw them from the gate
        roadLines[k] = spline(FORK_EDGES[e.b] && e.a === 'c4' ? pts.slice(1) : pts, 10);
      }
      roadLines.trunk = spline([NODE_POS.c4, [168, 243], GATE], 10);
      return roadLines;
    }

    function buildBase(view) {
      const c = mk(canvas.width, canvas.height), g = c.getContext('2d');
      world(g);
      const roads = Object.values(buildRoads(view));
      const regs = view.regions;
      paintGround(g, regs, roads);
      paintSea(g);
      for (const R of regs) if (R.biome === 'tower') paintTowerGround(g, R);
      paintWater(g);
      const nodes = view.nodes;
      for (const R of regs) {
        if (R.biome === 'wilds') paintWilds(g, R, nodes);
      }
      for (const R of regs) {
        if (R.biome === 'fields') paintFields(g, R, nodes);
        else if (R.biome === 'hills') paintHills(g, R, nodes);
        else if (R.biome === 'ruins') paintRuins(g, R, nodes);
      }
      for (const R of regs) if (R.biome === 'forest') paintForest(g, R, roads);
      for (const R of regs) if (R.biome === 'town') paintTown(g, R, nodes);
      // ground screentone (screen space, so dots stay crisp)
      screen(g);
      g.globalAlpha = 0.2;
      tone(g, 0, 0, L.W, L.H, 4, P.ink, (x, y) => 0.12 + 0.18 * Math.sin(x * 0.011 + y * 0.017) ** 2);
      g.globalAlpha = 1;
      return c;
    }

    function revealed(x, y, k = 0.95) {
      for (const R of lastView.regions) if (R.revealed && Math.hypot(x - R.x, y - R.y) < R.r * k) return true;
      return false;
    }

    function buildStatic(view) {
      if (!base) base = buildBase(view);
      const w = canvas.width, h = canvas.height;
      const c = mk(w, h), g = c.getContext('2d');
      g.drawImage(base, 0, 0);
      // fog: a desaturated, darkened, hatched copy of the land, shown where unrevealed
      const fog = mk(w, h), f = fog.getContext('2d');
      f.drawImage(base, 0, 0);
      f.globalCompositeOperation = 'saturation';
      f.fillStyle = '#808080';
      f.fillRect(0, 0, w, h);
      f.globalCompositeOperation = 'source-over';
      f.fillStyle = 'rgba(16,11,13,0.74)';
      f.fillRect(0, 0, w, h);
      f.strokeStyle = 'rgba(8,4,6,0.6)';
      f.lineWidth = L.dpr * 0.9;
      f.beginPath();
      const step = 4.5 * L.dpr;
      for (let k = -h; k < w; k += step) { f.moveTo(k, h); f.lineTo(k + h, 0); }
      f.stroke();
      f.globalAlpha = 0.5;
      screen(f);
      tone(f, 0, 0, L.W, L.H, 5, '#3a3034', (x, y) => 0.25 + 0.25 * Math.sin(x * 0.03) * Math.sin(y * 0.05));
      f.globalAlpha = 1;
      // mask: everything fogged, cut out the revealed lands with soft edges
      const m = mk(w, h), mg = m.getContext('2d');
      mg.fillStyle = '#fff';
      mg.fillRect(0, 0, w, h);
      mg.globalCompositeOperation = 'destination-out';
      world(mg);
      for (const R of view.regions) {
        if (!R.revealed) continue;
        const rr = R.r * (R.biome === 'tower' ? 1.05 : 1.12);
        mg.fillStyle = rad(mg, R.x, R.y, 0, rr, [[0, 'rgba(0,0,0,1)'], [0.78, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
        mg.fillRect(R.x - rr, R.y - rr, rr * 2, rr * 2);
      }
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.globalCompositeOperation = 'destination-in';
      f.drawImage(m, 0, 0);
      g.drawImage(fog, 0, 0);
      // region names on revealed lands
      world(g);
      paintTower(g);
      paintCeiling(g);
      screen(g);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `600 8px ${SUB_FONT}`;
      for (const R of view.regions) {
        const p = REGION_LABEL[R.id];
        if (!p || !R.revealed) continue;
        const txt = R.name.toUpperCase().split('').join(' ');
        g.fillStyle = 'rgba(12,8,8,0.75)';
        g.fillText(txt, sx(p[0]) + 0.8, sy(p[1]) + 0.8);
        g.fillStyle = rgba(P.bone, 0.62);
        g.fillText(txt, sx(p[0]), sy(p[1]));
      }
      // vignette + darker band under the title bar
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = rad(g, w / 2, h * 0.55, Math.min(w, h) * 0.45, Math.max(w, h) * 0.72, [[0, 'rgba(8,4,6,0)'], [1, 'rgba(8,4,6,0.72)']]);
      g.fillRect(0, 0, w, h);
      g.fillStyle = lin(g, 0, 0, 0, (TOP + 14) * L.dpr, [[0, 'rgba(8,4,6,0.85)'], [0.7, 'rgba(8,4,6,0.45)'], [1, 'rgba(8,4,6,0)']]);
      g.fillRect(0, 0, w, (TOP + 14) * L.dpr);
      return c;
    }

    // fog puffs along the edges of the revealed lands; water shimmer points
    let anim = null;
    function buildAnim(view) {
      const rng = mulberry(3), puffs = [], shimmer = [];
      const rev = view.regions.filter((R) => R.revealed);
      for (const R of rev) {
        const n = Math.round(R.r / 7);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + rng() * 0.2;
          const x = R.x + Math.cos(a) * R.r * 1.08, y = R.y + Math.sin(a) * R.r * 1.0;
          if (rev.some((o) => o !== R && Math.hypot(x - o.x, y - o.y) < o.r * 1.02)) continue;
          puffs.push([x, y, rng() * TAU, 0.7 + rng() * 0.6]);
        }
      }
      for (const line of [RIVER, STREAM]) for (let i = 1; i < line.length - 1; i++) {
        const p = line[i];
        if (revealed(p[0], p[1], 1.05)) shimmer.push([p[0], p[1], rng() * TAU, Math.atan2(line[i + 1][1] - p[1], line[i + 1][0] - p[0])]);
      }
      // sea shimmer
      for (let i = 0; i < 26; i++) shimmer.push([-150 + rng() * 150, -50 + rng() * 520, rng() * TAU, 0]);
      if (revealed(LAKE.x, LAKE.y, 1.05)) for (let i = 0; i < 6; i++) shimmer.push([LAKE.x + (rng() - 0.5) * 40, LAKE.y + (rng() - 0.5) * 16, rng() * TAU, 0]);
      return { puffs, shimmer };
    }

    function viewKey(view) { return view.regions.map((r) => (r.revealed ? 1 : 0)).join(''); }

    // ------------------------------------------------------------- per frame
    function drawWheel(x, y, r, a) {
      const X = sx(x), Y = sy(y), R = r * L.s;
      ctx.save();
      ctx.translate(X, Y);
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
      ctx.fillStyle = '#4a3c36'; ctx.fill();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const q = a + (k / 6) * TAU; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(q) * R, Math.sin(q) * R); }
      ctx.strokeStyle = '#a08a7c'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.25, 0, TAU); ctx.fillStyle = P.ink; ctx.fill();
      ctx.restore();
    }

    function roadStyle(e) {
      if (e.side) return e.open ? { under: 3.4, w: 2.2, dash: [0.1, 4.6], col: P.rose, alpha: 0.95 } : { under: 2.6, w: 1.6, dash: [0.1, 4.6], col: P.dusk, alpha: 0.7 };
      return e.open ? { under: 4.6, w: 2, dash: [6, 4], col: P.bone, alpha: 1 } : { under: 3.4, w: 1.5, dash: [5, 5], col: P.ash, alpha: 0.75 };
    }
    function strokeScreen(line, w, color, dash, off) {
      ctx.beginPath();
      for (let i = 0; i < line.length; i++) { const x = sx(line[i][0]), y = sy(line[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.lineWidth = w;
      ctx.strokeStyle = color;
      ctx.setLineDash(dash || []);
      ctx.lineDashOffset = off || 0;
      ctx.stroke();
    }
    function drawRoads(view, t) {
      const lines = buildRoads(view);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const byB = {};
      for (const e of view.edges) byB[e.a + '>' + e.b] = e;
      // trunk to the fork: main style, open when any of the three is
      const forkOpen = view.edges.some((e) => e.a === 'c4' && FORK_EDGES[e.b] && e.open);
      const items = [{ line: lines.trunk, st: roadStyle({ side: false, open: forkOpen }), march: forkOpen }];
      for (const e of view.edges) items.push({ line: lines[e.a + '>' + e.b], st: roadStyle(e), march: e.open && !e.side });
      // under-strokes first so crossings stay clean
      for (const it of items) { ctx.globalAlpha = it.st.alpha; strokeScreen(it.line, it.st.under + 2, 'rgba(12,8,8,0.85)'); }
      for (const it of items) {
        ctx.globalAlpha = it.st.alpha;
        strokeScreen(it.line, it.st.w, it.st.col, it.st.dash, it.march ? -t * 6 : 0);
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // the signpost at the fork
      const X = sx(GATE[0]) + 3, Y = sy(GATE[1]) - 2;
      ctx.save();
      ctx.translate(X, Y);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, -10); ctx.stroke();
      ctx.strokeStyle = '#8a6f60'; ctx.lineWidth = 1.6; ctx.stroke();
      const arms = [[-1.25, -9], [0, -6], [0.6, -3]];
      for (const [a, y] of arms) {
        ctx.save(); ctx.translate(0, y); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(0, -1.8); ctx.lineTo(8, -1.8); ctx.lineTo(10.5, 0); ctx.lineTo(8, 1.8); ctx.lineTo(0, 1.8); ctx.closePath();
        ctx.fillStyle = forkOpen ? P.bone : P.dusk; ctx.fill();
        ctx.strokeStyle = P.ink; ctx.lineWidth = 0.9; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- icons
    function iconPath(kind, a) {
      const c = ctx;
      c.lineJoin = 'round'; c.lineCap = 'round';
      switch (kind) {
        case 'story': {
          // crest on a banner
          c.beginPath(); c.moveTo(-6, -7); c.lineTo(6, -7); c.lineTo(6, 1); c.quadraticCurveTo(6, 6, 0, 9); c.quadraticCurveTo(-6, 6, -6, 1); c.closePath();
          c.fillStyle = P.crimson; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.4; c.stroke();
          c.beginPath(); c.moveTo(-6, -7); c.lineTo(0, -7); c.lineTo(0, 7.5); c.quadraticCurveTo(-6, 5, -6, 1); c.closePath();
          c.fillStyle = '#b8323f'; c.fill();
          // the tower glyph on the crest
          c.beginPath(); c.moveTo(-1.6, 4); c.lineTo(-0.8, -4.5); c.lineTo(0.8, -4.5); c.lineTo(1.6, 4); c.closePath();
          c.fillStyle = P.bone; c.fill();
          break;
        }
        case 'contract': {
          c.save(); c.rotate(-0.12);
          c.beginPath(); c.rect(-5.5, -7, 11, 14);
          c.fillStyle = P.bone; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.2; c.stroke();
          c.beginPath(); c.moveTo(-3.5, -2); c.lineTo(3.5, -2); c.moveTo(-3.5, 1); c.lineTo(3.5, 1); c.moveTo(-3.5, 4); c.lineTo(1.5, 4);
          c.lineWidth = 0.9; c.stroke();
          c.beginPath(); c.moveTo(5.5, 4); c.lineTo(5.5, 7); c.lineTo(2.5, 7); c.closePath(); c.fillStyle = P.rose; c.fill();
          c.beginPath(); c.arc(0, -6, 1.8, 0, TAU); c.fillStyle = P.glow; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 0.8; c.stroke();
          c.restore();
          break;
        }
        case 'side': {
          c.save(); c.rotate(a * 0.4);
          c.beginPath();
          for (let k = 0; k < 8; k++) { const r = k & 1 ? 2.6 : 8, q = (k / 8) * TAU - Math.PI / 2; k ? c.lineTo(Math.cos(q) * r, Math.sin(q) * r) : c.moveTo(Math.cos(q) * r, Math.sin(q) * r); }
          c.closePath();
          c.fillStyle = P.glyph; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.1; c.stroke();
          c.restore();
          c.beginPath(); c.arc(0, 0, 3.6, 0, TAU); c.strokeStyle = P.white; c.lineWidth = 0.8; c.stroke();
          break;
        }
        case 'dungeon': {
          c.beginPath(); c.moveTo(-9, 6); c.quadraticCurveTo(-8, -8, 0, -8.5); c.quadraticCurveTo(8, -8, 9, 6); c.closePath();
          c.fillStyle = P.dusk; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.2; c.stroke();
          c.beginPath(); c.moveTo(-5.5, 6); c.quadraticCurveTo(-5, -4, 0, -4.6); c.quadraticCurveTo(5, -4, 5.5, 6); c.closePath();
          c.fillStyle = P.ink; c.fill();
          // a little skull in the dark
          c.beginPath(); c.arc(0, 1, 2.4, 0, TAU); c.fillStyle = P.bone; c.fill();
          c.fillRect(-1.4, 2.6, 2.8, 1.6);
          c.fillStyle = P.ink; c.fillRect(-1.3, 0.3, 1, 1); c.fillRect(0.3, 0.3, 1, 1);
          break;
        }
        case 'training': {
          for (const s of [-1, 1]) {
            c.save(); c.rotate(s * 0.78);
            c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -8);
            c.strokeStyle = P.ink; c.lineWidth = 3.4; c.stroke();
            c.strokeStyle = P.steel; c.lineWidth = 1.6; c.stroke();
            c.beginPath(); c.moveTo(-3, 4.5); c.lineTo(3, 4.5);
            c.strokeStyle = P.ink; c.lineWidth = 2.6; c.stroke();
            c.strokeStyle = '#8a6f60'; c.lineWidth = 1.2; c.stroke();
            c.restore();
          }
          break;
        }
        case 'arcade': {
          c.beginPath(); c.ellipse(0, 1.5, 8.5, 5.5, 0, 0, TAU);
          c.fillStyle = P.mauve; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.2; c.stroke();
          c.beginPath(); c.ellipse(0, 1.5, 5.5, 3.2, 0, 0, TAU);
          c.fillStyle = '#c9aea4'; c.fill(); c.stroke();
          for (let k = 0; k < 6; k++) {
            const q = (k / 6) * TAU, x = Math.cos(q) * 8.5, y = 1.5 + Math.sin(q) * 5.5;
            c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 4); c.strokeStyle = P.ink; c.lineWidth = 1.8; c.stroke();
            c.strokeStyle = P.bone; c.lineWidth = 0.8; c.stroke();
          }
          break;
        }
        default: padlock(0, 0, 1, P.rose);
      }
    }
    function padlock(x, y, k, col) {
      const c = ctx;
      c.save(); c.translate(x, y); c.scale(k, k);
      c.beginPath(); c.arc(0, -2, 3.6, Math.PI, 0);
      c.strokeStyle = P.ink; c.lineWidth = 3.2; c.stroke();
      c.strokeStyle = col; c.lineWidth = 1.4; c.stroke();
      c.beginPath(); c.rect(-5, -2, 10, 8);
      c.fillStyle = col; c.fill(); c.strokeStyle = P.ink; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = P.ink; c.fillRect(-0.8, 0.5, 1.6, 3);
      c.restore();
    }
    function medallion(r, fill, rim, rimW) {
      ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, TAU); ctx.fillStyle = P.ink; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = fill; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.82, Math.PI * 1.05, Math.PI * 1.75); ctx.strokeStyle = 'rgba(246,240,236,0.18)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r - 0.8, 0, TAU); ctx.strokeStyle = rim; ctx.lineWidth = rimW; ctx.stroke();
    }

    const R_NODE = 13;
    function nodeRadius(n) { return n.status === 'current' ? 15 : fogSet.has(n.id) ? 9.5 : R_NODE; }

    function drawNode(n, t, sel) {
      const X = sx(n.x), Y = sy(n.y);
      const bob = n.status === 'open' ? Math.sin(t * 2.2 + n.x * 0.05) * 1.6 : 0;
      const r = nodeRadius(n);
      ctx.save();
      ctx.translate(X, Y + bob);
      // ground shadow
      ctx.fillStyle = 'rgba(8,4,6,0.55)';
      ctx.beginPath(); ctx.ellipse(0, r + 3 - bob, r * 0.9, 3, 0, 0, TAU); ctx.fill();
      if (n.status === 'current') {
        const ph = (t * 0.7) % 1;
        ctx.beginPath(); ctx.arc(0, 0, r + 4 + ph * 16, 0, TAU);
        ctx.strokeStyle = rgba(P.glow, 0.7 * (1 - ph)); ctx.lineWidth = 2; ctx.stroke();
        const pulse = 0.5 + 0.5 * Math.sin(t * 4);
        ctx.beginPath(); ctx.arc(0, 0, r + 4.5 + pulse * 1.5, 0, TAU);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 4.5; ctx.stroke();
        ctx.strokeStyle = rgba(P.glow, 0.75 + 0.25 * pulse); ctx.lineWidth = 2.4; ctx.stroke();
      }
      if (sel === n.id) {
        ctx.save();
        ctx.rotate(t * 0.8);
        ctx.beginPath(); ctx.arc(0, 0, r + 9, 0, TAU);
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.stroke();
        ctx.strokeStyle = P.white; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        for (let k = 0; k < 4; k++) {
          const q = (k / 4) * TAU + Math.PI / 4;
          ctx.save(); ctx.rotate(q); ctx.translate(r + 13, 0);
          ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-1, -3); ctx.lineTo(-1, 3); ctx.closePath();
          ctx.fillStyle = P.white; ctx.fill(); ctx.strokeStyle = P.ink; ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
        }
      }
      if (fogSet.has(n.id)) {
        // a dim sealed marker: details hidden
        medallion(r, '#141012', P.ash, 1.2);
        padlock(0, 0.5, 0.7, P.dusk);
      } else if (n.status === 'locked') {
        medallion(r, '#171214', P.dusk, 1.4);
        ctx.globalAlpha = 0.3;
        iconPath(n.kind, 0);
        ctx.globalAlpha = 1;
        if (n.kind !== 'locked') padlock(r * 0.6, r * 0.6, 0.62, P.rose);
      } else if (n.status === 'done') {
        medallion(r, P.slate, P.rose, 1.3);
        ctx.globalAlpha = 0.55;
        iconPath(n.kind, 0);
        ctx.globalAlpha = 1;
        // ink check
        ctx.save(); ctx.translate(r * 0.62, r * 0.55);
        ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, TAU); ctx.fillStyle = P.ink; ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2.6, 0); ctx.lineTo(-0.6, 2.2); ctx.lineTo(3, -2.4);
        ctx.strokeStyle = P.bone; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.stroke();
        ctx.restore();
      } else {
        const cur = n.status === 'current';
        medallion(r, cur ? P.blood : P.charcoal, cur ? P.glow : P.bone, cur ? 2 : 1.6);
        ctx.save();
        if (cur) ctx.scale(1.12, 1.12);
        iconPath(n.kind, t);
        ctx.restore();
      }
      ctx.restore();
    }

    function drawBeam(n, t) {
      const X = sx(n.x), Y = sy(n.y);
      const h = Math.min(130, Y - TOP + 10), a = 0.55 + 0.25 * Math.sin(t * 2.4);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lin(ctx, 0, Y - h, 0, Y, [[0, rgba(P.glow, 0)], [0.7, rgba(P.glow, 0.22 * a)], [1, rgba(P.glow, 0.5 * a)]]);
      ctx.beginPath(); ctx.moveTo(X - 5, Y - h); ctx.lineTo(X + 5, Y - h); ctx.lineTo(X + 11, Y); ctx.lineTo(X - 11, Y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, Y - h, 0, Y, [[0, rgba(P.bone, 0)], [1, rgba(P.bone, 0.55 * a)]]);
      ctx.fillRect(X - 1, Y - h, 2, h);
      ctx.globalAlpha = 0.45 * a;
      ctx.drawImage(glowSpr(P.glow), X - 34, Y - 26, 68, 52);
      // motes rising in the beam
      for (let k = 0; k < 5; k++) {
        const ph = (t * 0.35 + k / 5) % 1;
        ctx.globalAlpha = (1 - ph) * a;
        ctx.fillStyle = P.bone;
        ctx.fillRect(X + Math.sin(k * 7 + t) * 4 - 0.8, Y - ph * h, 1.6, 1.6);
      }
      ctx.restore();
    }

    // ---------------------------------------------------------------- labels
    function labelBoxes(view, sel) {
      ctx.textBaseline = 'alphabetic';
      const nodes = view.nodes.filter((n) => !fogSet.has(n.id) || n.id === sel);
      const pri = (n) => (n.id === sel ? 0 : n.status === 'current' ? 1 : n.kind === 'story' ? 2 : n.status === 'open' ? 3 : 4);
      nodes.sort((a, b) => pri(a) - pri(b));
      const taken = view.nodes.map((n) => { const r = nodeRadius(n) + 2; return [sx(n.x) - r, sy(n.y) - r, sx(n.x) + r, sy(n.y) + r]; });
      const out = [];
      for (const n of nodes) {
        const big = n.id === sel || n.status === 'current';
        ctx.font = `italic 700 ${big ? 13 : 11.5}px ${TITLE_FONT}`;
        const tw = ctx.measureText(n.title).width;
        let sw = 0;
        if (big) { ctx.font = `700 8px ${SUB_FONT}`; sw = ctx.measureText(n.sub.toUpperCase()).width * 1.12; }
        const w = Math.max(tw, sw) + 10, h = big ? 29 : 17;
        const X = sx(n.x), Y = sy(n.y), r = nodeRadius(n) + (n.status === 'current' ? 6 : 3);
        const cands = [
          [X - w / 2, Y + r], [X - w / 2, Y - r - h], [X + r + 2, Y - h / 2], [X - r - 2 - w, Y - h / 2],
          [X - w + 12, Y + r], [X - 12, Y + r], [X - w + 12, Y - r - h], [X - 12, Y - r - h],
        ];
        let best = null, bestScore = Infinity;
        for (let i = 0; i < cands.length; i++) {
          const [x0, y0] = cands[i], box = [x0, y0, x0 + w, y0 + h];
          let score = i * 0.5;
          if (box[0] < 4) score += (4 - box[0]) * 40;
          if (box[2] > L.W - 4) score += (box[2] - L.W + 4) * 40;
          if (box[1] < TOP + 2) score += (TOP + 2 - box[1]) * 40;
          if (box[3] > L.H - 3) score += (box[3] - L.H + 3) * 40;
          for (const o of taken) {
            const ix = Math.min(box[2], o[2]) - Math.max(box[0], o[0]), iy = Math.min(box[3], o[3]) - Math.max(box[1], o[1]);
            if (ix > 0 && iy > 0) score += ix * iy;
          }
          if (score < bestScore) { bestScore = score; best = box; }
        }
        taken.push(best);
        out.push({ n, box: best, big, tw });
      }
      return out;
    }
    function drawLabels(view, sel) {
      const boxes = labelBoxes(view, sel);
      for (const { n, box, big } of boxes) {
        const [x0, y0, x1, y1] = box, cx = (x0 + x1) / 2;
        const dim = n.status === 'locked' || fogSet.has(n.id);
        ctx.fillStyle = dim ? 'rgba(12,8,8,0.6)' : 'rgba(12,8,8,0.78)';
        ctx.beginPath();
        ctx.moveTo(x0 + 4, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1 - 4, y1); ctx.lineTo(x0, y1); ctx.closePath();
        ctx.fill();
        if (n.status === 'current') { ctx.fillStyle = P.glow; ctx.fillRect(x0 + 3, y1 - 1.6, x1 - x0 - 6, 1.6); }
        else if (n.id === sel) { ctx.fillStyle = P.white; ctx.fillRect(x0 + 3, y1 - 1.2, x1 - x0 - 6, 1.2); }
        ctx.textAlign = 'center';
        ctx.font = `italic 700 ${big ? 13 : 11.5}px ${TITLE_FONT}`;
        ctx.fillStyle = dim ? P.rose : n.status === 'done' ? '#c8aaa2' : n.status === 'current' ? P.white : P.bone;
        if (dim) ctx.globalAlpha = 0.8;
        ctx.fillText(n.title, cx, y0 + (big ? 13 : 12.5));
        if (big) {
          ctx.font = `700 8px ${SUB_FONT}`;
          ctx.fillStyle = n.status === 'current' ? '#ff8a96' : P.rose;
          ctx.fillText(n.sub.toUpperCase().split('').join(' '), cx, y0 + 24);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ------------------------------------------------------------------ draw
    function draw(view, t, sel) {
      t = t || 0;
      layout();
      const key = viewKey(view);
      if (lastView !== view) {
        lastView = view;
        fogSet = new Set(view.nodes.filter((n) => n.status === 'locked' && !regionsOf(view)[n.region].revealed && n.region !== 'tower').map((n) => n.id));
      }
      if (!stat || statKey !== key) { stat = buildStatic(view); statKey = key; anim = buildAnim(view); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(stat, 0, 0);
      screen(ctx);
      const s = L.s;

      // water shimmer
      ctx.strokeStyle = rgba('#b9d0dc', 1);
      ctx.lineWidth = 0.9;
      ctx.lineCap = 'round';
      for (const [x, y, ph, a] of anim.shimmer) {
        const k = Math.sin(t * 1.6 + ph);
        if (k < 0.35) continue;
        ctx.globalAlpha = (k - 0.35) * 0.9;
        const X = sx(x) + Math.sin(t * 0.7 + ph) * 1.5, Y = sy(y), l = 2.2 + k * 2.5;
        ctx.beginPath(); ctx.moveTo(X - Math.cos(a) * l, Y - Math.sin(a) * l); ctx.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // water wheels
      if (revealed(TOWN_WHEEL.x, TOWN_WHEEL.y, 1.1)) drawWheel(TOWN_WHEEL.x, TOWN_WHEEL.y, 5.5, t * 0.9);
      if (revealed(MILL.wx, MILL.wy, 1.1)) drawWheel(MILL.wx, MILL.wy, 6, t * 0.9);

      // tower lights: twinkle, plus the slow pulse where it meets the clouds
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y, ph, v] of TOWER_LIGHTS) {
        const k = 0.5 + 0.5 * Math.sin(t * (v ? 3.1 : 1.7) + ph);
        ctx.globalAlpha = 0.25 + 0.75 * k * k;
        ctx.fillStyle = v ? P.glyph : P.bone;
        ctx.fillRect(sx(x) - 0.9, sy(y) - 1.4, 1.8, 2.8);
        if (k > 0.85) { ctx.globalAlpha = (k - 0.85) * 3; ctx.drawImage(glowSpr(v ? P.glyph : P.bone), sx(x) - 7, sy(y) - 7, 14, 14); }
      }
      const cy = sy(ceilingY(TOWER.x));
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 0.9);
      ctx.drawImage(glowSpr(P.glyph), sx(TOWER.x) - 55 * s * 1.4, cy - 40 * s * 1.4, 110 * s * 1.4, 70 * s * 1.4);
      ctx.restore();

      // drifting cloud shadows
      const sh = shadowSpr();
      for (let i = 0; i < 4; i++) {
        const span = 1500, x = ((t * 7 + i * 390) % span) - 300, y = 90 + ((i * 137) % 330);
        ctx.globalAlpha = 0.2;
        ctx.drawImage(sh, sx(x) - 110 * s, sy(y) - 40 * s, 220 * s, 80 * s);
      }
      ctx.globalAlpha = 1;

      drawRoads(view, t);

      // fog drifting at the edge of the known lands
      const pf = puffSpr();
      for (const [x, y, ph, k] of anim.puffs) {
        const X = sx(x + Math.sin(t * 0.21 + ph) * 7), Y = sy(y + Math.cos(t * 0.17 + ph) * 4);
        if (X < -60 || X > L.W + 60 || Y < TOP - 30 || Y > L.H + 40) continue;
        const w = 64 * k * s * 1.3;
        ctx.globalAlpha = 0.38 + 0.18 * Math.sin(t * 0.5 + ph * 2);
        ctx.drawImage(pf, X - w / 2, Y - w * 0.34, w, w * 0.69);
      }
      ctx.globalAlpha = 1;

      // birds over the lands
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (let f = 0; f < 2; f++) {
        const bx = ((t * (14 + f * 5) + f * 600) % 1400) - 200, by = 150 + f * 160 + Math.sin(t * 0.3 + f) * 20;
        for (let i = 0; i < 4; i++) {
          const X = sx(bx - i * 9 - (i & 1) * 3), Y = sy(by + (i & 1 ? 6 : -2) * (i ? 1 : 0) + i * 2), fl = Math.sin(t * 9 + i * 1.7 + f) * 2.2;
          ctx.beginPath(); ctx.moveTo(X - 4, Y - fl); ctx.quadraticCurveTo(X - 2, Y - 1.5, X, Y); ctx.quadraticCurveTo(X + 2, Y - 1.5, X + 4, Y - fl); ctx.stroke();
        }
      }

      // nodes: beam under, then markers, then labels on top
      const cur = view.nodes.find((n) => n.status === 'current' && n.id === view.current);
      if (cur) drawBeam(cur, t);
      const order = view.nodes.slice().sort((a, b) => (a.id === sel) - (b.id === sel) || (a.status === 'current') - (b.status === 'current') || a.y - b.y);
      for (const n of order) drawNode(n, t, sel);
      drawLabels(view, sel);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    function regionsOf(view) {
      for (const R of view.regions) regionsById[R.id] = R;
      return regionsById;
    }

    function pick(cx, cy) {
      if (!lastView) return null;
      layout();
      let best = null, bd = 28;
      for (const n of lastView.nodes) {
        const d = Math.hypot(sx(n.x) - cx, sy(n.y) - cy);
        if (d < bd) { bd = d; best = n.id; }
      }
      return best;
    }
    function nodeScreen(id) {
      layout();
      const n = (lastView && lastView.nodes.find((q) => q.id === id)) || null;
      if (!n) return null;
      return { x: sx(n.x), y: sy(n.y) };
    }
    function pan(dx) {
      layout();
      if (L.mapW + 40 <= L.W) return false;
      panX += dx;
      L = null;
      layout();
      return true;
    }
    return { draw, pick, nodeScreen, pan };
  }

  NS.map = { create };
})();
