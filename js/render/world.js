/*
 * Tower of Wishes — world layer: ground, trees, rocks, the fallen trunk,
 * light and atmosphere.
 *
 * API (called by core.js):
 *   drawBackdrop(s)        everything flat under the scene (sky, ground, road, grass)
 *   items(s) -> [{d, f}]   depth-sorted standing objects; core sorts them with fighters
 *   drawAtmosphere(s, dt)  screen-wide light, fog, grain, vignette, drawn over the scene
 *   resize()               optional; canvas size changed
 *
 * Look: a webtoon panel background at dusk. Cool desaturated green-grey,
 * ink outlines, hard two-tone cel shadows, a bone rim on the lit (upper-left)
 * side. Foliage, undergrowth and the screen overlay are baked once into
 * offscreen canvases; per frame we only blit them and draw cheap paths.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  // World tones (dusk forest). Characters are dark ink + bone, so the
  // clearing sits in the mid-values to keep them and the telegraphs legible.
  const C = {
    ink: '#0c0d0c', floor: '#121614', floorEdge: '#171c19',
    shade: '#2a322e', lit: '#3d4741', pool: '#47514a', patch: '#333b36',
    bladeInk: '#161c19', bladeLit: '#6b776d', bladeTip: '#b9b0a2',
    dirt: '#554d45', dirtLit: '#73685c', rut: '#38322e',
    bark: '#211c1b', barkLit: '#4a403d', rim: '#d8c6b8',
    log: '#2b2321', logLit: '#5b4c45', logEnd: '#6e5d50', moss: '#4a5640',
    rock: '#3d3537', rockMid: '#585052', rockLit: '#837a76',
    shadowA: 'rgba(6,9,8,0.45)',
  };
  const FOLIAGE = {
    near: { shade: '#18201d', lit: '#3a4942', rim: '#d8c6b8', rimA: 0.8 },
    far: { shade: '#121714', lit: '#26302b', rim: '#9a8e84', rimA: 0.6 },
  };
  const CK = 200; // canopy sprite: px per canopy radius
  const BK = 110; // undergrowth sprite: px per unit
  const GK = 48; // grass tuft sprite: px per blade height

  function create(V) {
    const { ctx, Sim } = V;
    const P = V.P;
    const A = Sim.ARENA;
    const R = Sim.makeRng(11);
    const TAU = Math.PI * 2;

    // ------------------------------------------------------------ static layout
    // The dirt path to the road in the north-east (the bandits flee along it):
    // [x, y, width] in metres, tapering into the clearing.
    const ROAD = [[5.4, -2.7, 0.15], [7.6, -4.0, 1.1], [10, -5.3, 1.6], [12.5, -6.6, 1.75], [15.2, -8.4, 1.85], [18.6, -10.6, 2.0]];
    // Densified centreline with ragged edges and dirt flecks (world-anchored).
    const roadL = [], roadR = [], roadC = [], roadFleck = [];
    {
      const rr = Sim.makeRng(19);
      const pts = [];
      for (let i = 0; i < ROAD.length - 1; i++) {
        for (let k = 0; k < 4; k++) {
          const f = k / 4, a = ROAD[i], b = ROAD[i + 1];
          pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
        }
      }
      pts.push(ROAD[ROAD.length - 1]);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty);
        const nx = -ty / l, ny = tx / l, w = pts[i][2] / 2;
        const jl = 1 + (rr() - 0.5) * 0.3, jr = 1 + (rr() - 0.5) * 0.3;
        roadL.push([pts[i][0] + nx * w * jl, pts[i][1] + ny * w * jl]);
        roadR.push([pts[i][0] - nx * w * jr, pts[i][1] - ny * w * jr]);
        roadC.push([pts[i][0], pts[i][1], nx, ny, w]);
      }
      for (let i = 0; i < 26; i++) {
        const c = roadC[2 + Math.floor(rr() * (roadC.length - 2))], o = (rr() - 0.5) * 1.5;
        roadFleck.push({ x: c[0] + c[2] * c[4] * o + (rr() - 0.5) * 0.6, y: c[1] + c[3] * c[4] * o + (rr() - 0.5) * 0.6, r: 0.08 + rr() * 0.16, lit: rr() < 0.6 });
      }
    }
    function nearRoad(x, y, m) {
      for (let i = 0; i < ROAD.length - 1; i++) {
        const [ax, ay] = ROAD[i], [bx, by] = ROAD[i + 1];
        const dx = bx - ax, dy = by - ay;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
        if (Math.hypot(x - ax - dx * t, y - ay - dy * t) < m) return true;
      }
      return false;
    }
    function inObstacle(x, y, m) {
      return A.obstacles.some((o) => { const c = Sim.obstacleCenter(o, x, y); return Math.hypot(x - c.x, y - c.y) < o.r + m; });
    }

    // Grass tufts: fewer and sharper; thinner in the middle where the fight is.
    const tufts = [];
    for (let i = 0; i < 400 && tufts.length < 150; i++) {
      const a = R() * TAU, k = Math.sqrt(R()) * 1.08;
      const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (k < 0.45 && R() < 0.65) continue;
      if (nearRoad(x, y, 1.1) || inObstacle(x, y, 0.15)) continue;
      tufts.push({ x, y, s: 0.55 + R() * 0.7, v: tufts.length % 8 });
    }
    // Ground detail: bare-earth patches, pebbles and hatch marks (world-anchored).
    const patches = [];
    for (let i = 0; i < 9; i++) {
      const a = R() * TAU, k = 0.25 + R() * 0.6;
      const pts = [];
      const r = 0.8 + R() * 1.3, n = 9;
      for (let j = 0; j < n; j++) pts.push([Math.cos((j / n) * TAU) * r * (0.7 + R() * 0.45), Math.sin((j / n) * TAU) * r * (0.5 + R() * 0.35)]);
      patches.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, pts });
    }
    const pebbles = [];
    for (let i = 0; i < 44; i++) {
      const a = R() * TAU, k = Math.sqrt(R()) * 1.1;
      pebbles.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, r: 0.04 + R() * 0.07 });
    }
    const hatches = [];
    for (let i = 0; i < 46; i++) {
      const a = R() * TAU, k = 0.82 + R() * 0.3;
      hatches.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, n: 3 + Math.floor(R() * 3) });
    }
    // Clearing outline: an outer shade band and a wobbly lit interior.
    const EDGE_N = 48;
    const wob = [], wob2 = [];
    for (let i = 0; i < EDGE_N; i++) { wob.push(R()); wob2.push(R()); }

    // The ring of forest round the clearing; keep the road and its mouth open.
    const ring = [];
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * TAU + R() * 0.08;
      const k = 1.18 + R() * 0.45;
      const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      const r = 0.9 + R() * 0.8, h = 3.4 + R() * 1.6, c = R();
      if (Math.hypot(x - A.exit.x, y - A.exit.y) < 3.2 || nearRoad(x, y, 1.9)) continue;
      ring.push({ x, y, r, h, c, v: i % 4, b: i % 3 });
    }
    const trees = ring.map((t) => ({ x: t.x, y: t.y, R: t.r * 1.5, h: t.h, tr: t.r * 0.42, v: t.v, b: t.b }));
    for (const o of A.obstacles) {
      if (o.kind === 'tree') trees.push({ x: o.x, y: o.y, R: o.r * 2.4, h: 4.6, tr: o.r * 0.62, v: (Math.round(o.x) & 3), b: 0, obstacle: true });
    }

    // Rock shapes: a jittered silhouette in units of the rock radius.
    const rockShape = new Map();
    for (const o of A.obstacles) {
      if (o.kind !== 'rock') continue;
      const pts = [];
      const n = 8, rot = R() * 0.6;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * TAU;
        const k = 0.86 + R() * 0.22;
        let y = Math.sin(a) * k;
        if (y > 0) y *= 0.62; // flat base
        pts.push([Math.cos(a) * k * 1.08, y * 0.9]);
      }
      rockShape.set(o, { pts, cx: 0.12 + R() * 0.12, cy: -0.28 - R() * 0.12 });
    }

    // Shadow direction on screen: away from the light (upper left -> lower right).
    function shadowOff(h) {
      const L = V.light, len = (h * 0.55) / Math.tan(L.elev) * V.cam.sc;
      return { x: -Math.cos(L.ang) * len, y: -Math.sin(L.ang) * len * V.cam.pitch };
    }

    // ------------------------------------------------------------ sprites
    function canvas(w, h) {
      const c = document.createElement('canvas');
      c.width = Math.ceil(w); c.height = Math.ceil(h);
      return c;
    }
    // Scalloped leaf masses: bumps between points on a circle.
    function blobPath(c, blobs, dx, dy, s, grow) {
      c.beginPath();
      for (const b of blobs) {
        const pt = (a, k) => [b.x + dx + Math.cos(a) * (b.r * s * k + grow), b.y + dy + Math.sin(a) * (b.r * s * k + grow) * 0.9];
        for (let i = 0; i <= b.n; i++) {
          const a = b.rot + (i / b.n) * TAU, k = b.w[i % b.n];
          const [x, y] = pt(a, k);
          if (!i) { c.moveTo(x, y); continue; }
          const am = b.rot + ((i - 0.5) / b.n) * TAU;
          const [mx, my] = pt(am, (k + b.w[i - 1]) / 2 * (1 + (1 - b.j) * 1.4));
          c.quadraticCurveTo(mx, my, x, y);
        }
        c.closePath();
      }
    }
    // A canopy: clumped jagged leaf masses, each with its own two-tone cel
    // shape and ink line, a macro shadow on the lower right and a bone rim.
    function makeCanopy(seed, tone) {
      const r = Sim.makeRng(seed);
      const w = CK * 2.7, h = CK * 2.5, cx = w / 2, cy = h * 0.52;
      const cv = canvas(w, h), c = cv.getContext('2d');
      const blobs = [];
      const n = 7 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = i === 0 ? 0 : r() * TAU, d = i === 0 ? 0 : (0.3 + r() * 0.34);
        const b = { x: cx + Math.cos(a) * d * CK, y: cy + Math.sin(a) * d * 0.72 * CK, r: (i === 0 ? 0.62 : 0.32 + r() * 0.24) * CK, n: 8 + Math.floor(r() * 4), j: 0.82 + r() * 0.05, rot: r() * TAU, w: [] };
        for (let k = 0; k < b.n; k++) b.w.push(0.93 + r() * 0.12);
        blobs.push(b);
      }
      blobs.sort((p, q) => p.y - q.y);
      // Heavy outer silhouette line.
      c.fillStyle = C.ink; blobPath(c, blobs, 0, 0, 1, CK * 0.04); c.fill();
      for (const b of blobs) {
        const one = [b];
        c.fillStyle = tone.shade; blobPath(c, one, 0, 0, 1, 0); c.fill();
        c.save(); blobPath(c, one, 0, 0, 1, 0); c.clip();
        c.fillStyle = tone.lit; blobPath(c, one, -b.r * 0.2, -b.r * 0.26, 0.9, 0); c.fill();
        // Leaf ticks in the shadow side.
        c.strokeStyle = C.ink; c.globalAlpha = 0.55; c.lineWidth = CK * 0.012; c.lineCap = 'round';
        c.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = 0.1 + r() * 1.5, d = b.r * (0.55 + r() * 0.3);
          const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d * 0.9, l = CK * (0.05 + r() * 0.05);
          c.moveTo(x - l, y - l * 0.5); c.lineTo(x, y); c.lineTo(x + l * 0.4, y - l);
        }
        c.stroke(); c.globalAlpha = 1;
        c.restore();
        c.strokeStyle = C.ink; c.lineWidth = CK * 0.014; c.lineJoin = 'round';
        blobPath(c, one, 0, 0, 1, 0); c.stroke();
      }
      // Macro cel shadow: the canopy's lower right turns away from the light.
      c.save();
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = tone.shade; c.globalAlpha = 0.72;
      c.beginPath(); c.ellipse(cx + CK * 0.62, cy + CK * 0.7, CK * 1.05, CK * 0.72, -0.35, 0, TAU); c.fill();
      // Hatching inside that shadow.
      c.globalAlpha = 0.3; c.strokeStyle = C.ink; c.lineWidth = CK * 0.028;
      c.beginPath();
      for (let k = -5; k < 9; k++) {
        const x0 = cx + k * CK * 0.15;
        c.moveTo(x0, cy + CK * 1.2); c.lineTo(x0 + CK * 0.7, cy + CK * 0.2);
      }
      c.stroke();
      c.restore();
      // Rim light: union minus itself shifted down-right leaves an upper-left crescent.
      const rim = canvas(w, h), rc = rim.getContext('2d');
      rc.fillStyle = tone.rim; blobPath(rc, blobs, 0, 0, 1, 0); rc.fill();
      rc.globalCompositeOperation = 'destination-out';
      blobPath(rc, blobs, CK * 0.035, CK * 0.045, 1, 0); rc.fill();
      c.globalAlpha = tone.rimA; c.drawImage(rim, 0, 0); c.globalAlpha = 1;
      return { cv, w, h, cx, cy };
    }
    // Undergrowth: a fan of pointed leaves, each split along its midrib into
    // a lit upper half and a shaded lower half. Anchored at the base centre.
    function makeFern(seed) {
      const r = Sim.makeRng(seed);
      const w = BK * 3.2, h = BK * 1.7, bx = w / 2, by = h * 0.92;
      const cv = canvas(w, h), c = cv.getContext('2d');
      const n = 11 + Math.floor(r() * 4), leaves = [];
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        leaves.push({ a: -Math.PI * (0.06 + 0.88 * t) + (r() - 0.5) * 0.25, len: BK * (0.75 + r() * 0.6) * (0.75 + Math.sin(t * Math.PI) * 0.4), wd: BK * (0.1 + r() * 0.06), ox: (r() - 0.5) * BK * 0.5 });
      }
      leaves.sort((p, q) => q.len - p.len);
      for (const L of leaves) {
        const ca = Math.cos(L.a), sa = Math.sin(L.a);
        const B = [bx + L.ox, by];
        const T = [B[0] + ca * L.len, B[1] + sa * L.len + Math.abs(ca) * L.len * 0.3];
        const M = [(B[0] + T[0]) / 2, (B[1] + T[1]) / 2 - L.len * 0.08];
        const px = -sa, py = ca; // perpendicular
        const up = py < 0 ? 1 : -1; // side facing up
        const U = [M[0] + px * L.wd * up, M[1] + py * L.wd * up], D = [M[0] - px * L.wd * up, M[1] - py * L.wd * up];
        c.fillStyle = '#0f1412';
        c.beginPath(); c.moveTo(B[0], B[1]); c.quadraticCurveTo(U[0], U[1], T[0], T[1]); c.quadraticCurveTo(D[0], D[1], B[0], B[1]); c.fill();
        c.fillStyle = '#222c27';
        c.beginPath(); c.moveTo(B[0], B[1]); c.quadraticCurveTo(U[0], U[1], T[0], T[1]); c.quadraticCurveTo(M[0], M[1], B[0], B[1]); c.fill();
        c.strokeStyle = C.ink; c.lineWidth = BK * 0.03; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(B[0], B[1]); c.quadraticCurveTo(U[0], U[1], T[0], T[1]); c.quadraticCurveTo(D[0], D[1], B[0], B[1]); c.stroke();
        c.strokeStyle = 'rgba(205,188,174,0.55)'; c.lineWidth = BK * 0.016;
        c.beginPath(); c.moveTo(B[0] + (U[0] - B[0]) * 0.3, B[1] + (U[1] - B[1]) * 0.3); c.quadraticCurveTo(U[0], U[1], T[0], T[1]); c.stroke();
      }
      return { cv, w, h, bx, by };
    }
    // Grass tufts: three sharp blades; half have a lit centre blade, a few a
    // bone tip catching the low sun. Anchored at the base centre.
    function makeTuft(seed, lit, tip) {
      const r = Sim.makeRng(seed);
      const cv = canvas(GK * 1.8, GK * 1.4), c = cv.getContext('2d');
      const ax = cv.width / 2, ay = cv.height - 4, lean = (r() - 0.5) * 0.5, wd = GK * 0.11;
      const blade = (x, h, l, col) => {
        c.beginPath(); c.moveTo(x - wd, ay); c.quadraticCurveTo(x + l * h * 0.3, ay - h * 0.6, x + l * h, ay - h); c.quadraticCurveTo(x + l * h * 0.3 + wd * 0.6, ay - h * 0.5, x + wd, ay); c.closePath();
        c.fillStyle = col; c.fill();
        if (col !== C.bladeInk) { c.strokeStyle = C.bladeInk; c.lineWidth = GK * 0.025; c.stroke(); }
      };
      blade(ax - GK * 0.22, GK * (0.75 + r() * 0.2), -0.5 + lean, C.bladeInk);
      blade(ax + GK * 0.22, GK * (0.6 + r() * 0.2), 0.55 + lean, C.bladeInk);
      blade(ax + GK * 0.05 * (r() - 0.5), GK * 1.12, 0.06 + lean, lit ? C.bladeLit : C.bladeInk);
      if (tip) {
        c.strokeStyle = C.bladeTip; c.lineWidth = GK * 0.035; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ax + (0.06 + lean) * GK * 0.6, ay - GK * 0.68); c.lineTo(ax + (0.06 + lean) * GK * 1.05, ay - GK * 1.08); c.stroke();
      }
      return { cv, ax, ay };
    }
    const grass = [];
    for (let i = 0; i < 8; i++) grass.push(makeTuft(501 + i * 7, i < 4, i < 2));

    const canopies = { near: [], far: [] };
    for (let i = 0; i < 4; i++) {
      canopies.near.push(makeCanopy(101 + i * 17, FOLIAGE.near));
      canopies.far.push(makeCanopy(101 + i * 17, FOLIAGE.far));
    }
    const ferns = [makeFern(301), makeFern(317), makeFern(333)];

    // ------------------------------------------------------------ ground
    function poly(pts) {
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
    }
    function edgePts(k, wobArr, amp, ox, oy) {
      const out = [];
      for (let i = 0; i < EDGE_N; i++) {
        const a = (i / EDGE_N) * TAU;
        const kk = k + (wobArr[i] - 0.5) * amp + (wobArr[(i + 1) % EDGE_N] - 0.5) * amp * 0.5;
        out.push(P(ox + Math.cos(a) * A.rx * kk, oy + Math.sin(a) * A.ry * kk, 0));
      }
      return out;
    }
    // A band with rounded (ground-flattened) ends, wound clockwise like
    // ctx.ellipse so overlapping shadows union instead of cancelling.
    function capsule(x0, y0, x1, y1, w, caps) {
      const pitch = V.cam.pitch;
      let dx = x1 - x0, dy = y1 - y0; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      // Half-width of a flattened circle across the band direction.
      const hw = w * Math.hypot(dx * pitch, dy);
      const nx = -dy * hw, ny = dx * hw;
      const pts = [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]];
      let area = 0;
      for (let i = 0; i < 4; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 4]; area += ax * by - bx * ay; }
      if (area < 0) pts.reverse();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      if (!caps) return;
      for (const [x, y] of [[x0, y0], [x1, y1]]) { ctx.moveTo(x + w, y); ctx.ellipse(x, y, w, w * pitch, 0, 0, TAU); }
    }
    // Cast shadows of every standing object, one hard-edged path.
    function addShadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const t of trees) {
        const b = P(t.x, t.y, 0);
        const o = shadowOff(t.h * 0.78);
        const rx = t.R * sc * 0.95, ry = t.R * sc * V.cam.pitch * 0.85;
        if (b.x + o.x + rx < -20 || b.x + o.x - rx > V.W + 20 || b.y + o.y + ry < -20 || b.y + o.y - ry > V.H + 20) continue;
        ctx.moveTo(b.x + o.x + rx, b.y + o.y);
        ctx.ellipse(b.x + o.x, b.y + o.y, rx, ry, 0, 0, TAU);
        // Trunk shadow: a band toward the canopy shadow.
        capsule(b.x, b.y, b.x + o.x * 0.8, b.y + o.y * 0.8, t.tr * sc * 0.5, false);
      }
      for (const o of A.obstacles) {
        if (o.kind === 'rock') {
          const b = P(o.x, o.y, 0), off = shadowOff(o.r * 0.9);
          const rx = o.r * sc * 1.05, ry = o.r * sc * V.cam.pitch * 0.9;
          ctx.moveTo(b.x + off.x * 0.5 + rx, b.y + off.y * 0.5);
          ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, rx, ry, 0, 0, TAU);
        } else if (o.kind === 'trunk') {
          const off = shadowOff(o.r * 2.2);
          const a = P(o.ax, o.ay, 0), b = P(o.bx, o.by, 0);
          capsule(a.x + off.x * 0.45, a.y + off.y * 0.45, b.x + off.x * 0.45, b.y + off.y * 0.45, o.r * sc * 1.05, true);
          capsule(a.x, a.y, b.x, b.y, o.r * sc * 0.9, true);
        }
      }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }

    function drawRoad() {
      const sc = V.cam.sc;
      const L = roadL.map(([x, y]) => P(x, y, 0)), Rr = roadR.map(([x, y]) => P(x, y, 0));
      ctx.beginPath(); poly(L.concat(Rr.slice().reverse()));
      ctx.fillStyle = C.dirt; ctx.fill();
      // Flecks: pale dust and dark clods.
      const lit = new Path2D(), dark = new Path2D();
      for (const f of roadFleck) {
        const p = P(f.x, f.y, 0), r = f.r * sc;
        const path = f.lit ? lit : dark;
        path.moveTo(p.x + r, p.y); path.ellipse(p.x, p.y, r, r * 0.45, 0, 0, TAU);
      }
      ctx.fillStyle = C.dirtLit; ctx.fill(lit);
      ctx.fillStyle = C.rut; ctx.fill(dark);
      // Wheel ruts.
      ctx.strokeStyle = C.rut; ctx.lineWidth = Math.max(1, sc * 0.05); ctx.lineCap = 'round';
      ctx.setLineDash([sc * 0.6, sc * 0.3]);
      for (const side of [-0.42, 0.42]) {
        ctx.beginPath();
        roadC.forEach(([x, y, nx, ny, w], i) => { if (i < 3) return; const p = P(x + nx * w * side, y + ny * w * side, 0); i > 3 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // Broken ink edge: short strokes where the grass meets the dirt.
      ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(1, sc * 0.035); ctx.lineJoin = 'round';
      ctx.beginPath();
      for (const side of [L, Rr]) {
        for (let i = 3; i < side.length - 1; i++) {
          const p = side[i], q = side[i + 1];
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (q.x - p.x) * 0.6, p.y + (q.y - p.y) * 0.6);
        }
      }
      ctx.stroke();
    }

    function drawGrass() {
      const W = V.W, H = V.H, sc = V.cam.sc;
      for (const t of tufts) {
        const p = P(t.x, t.y, 0);
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
        const sp = grass[t.v], k = (t.s * sc * 0.27) / GK;
        ctx.drawImage(sp.cv, p.x - sp.ax * k, p.y - sp.ay * k, sp.cv.width * k, sp.cv.height * k);
      }
    }

    function drawBackdrop() {
      const W = V.W, H = V.H, sc = V.cam.sc;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0b0e0d'); g.addColorStop(1, C.floorEdge);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Clearing: outer shade band, lit interior, a hard-edged dusk light pool.
      ctx.beginPath(); poly(edgePts(1.1, wob, 0.08, 0, 0)); ctx.fillStyle = C.shade; ctx.fill();
      ctx.beginPath(); poly(edgePts(0.94, wob2, 0.1, -0.4, -0.3)); ctx.fillStyle = C.lit; ctx.fill();
      ctx.beginPath(); poly(edgePts(0.52, wob, 0.16, -2.2, -1.4)); ctx.fillStyle = C.pool; ctx.fill();

      // Bare-earth patches.
      ctx.fillStyle = C.patch;
      ctx.beginPath();
      for (const pt of patches) poly(pt.pts.map(([x, y]) => P(pt.x + x, pt.y + y, 0)));
      ctx.fill();

      drawRoad();
      addShadows();

      // Hatch marks in the shade band (screen-diagonal ink strokes).
      ctx.strokeStyle = 'rgba(10,13,12,0.55)'; ctx.lineWidth = Math.max(0.8, sc * 0.025); ctx.lineCap = 'round';
      ctx.beginPath();
      const hl = sc * 0.32, hs = sc * 0.14;
      for (const h of hatches) {
        const p = P(h.x, h.y, 0);
        if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) continue;
        for (let k = 0; k < h.n; k++) { const x = p.x + k * hs; ctx.moveTo(x, p.y); ctx.lineTo(x + hl * 0.6, p.y - hl * 0.5); }
      }
      ctx.stroke();

      // Pebbles: ink dot with a lit fleck.
      const pk = new Path2D(), pl = new Path2D();
      for (const q of pebbles) {
        const p = P(q.x, q.y, 0), r = q.r * sc;
        if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) continue;
        pk.moveTo(p.x + r, p.y); pk.ellipse(p.x, p.y, r, r * 0.65, 0, 0, TAU);
        if (r > 2) { pl.moveTo(p.x - r * 0.2, p.y - r * 0.3); pl.ellipse(p.x - r * 0.35, p.y - r * 0.3, r * 0.45, r * 0.25, 0, 0, TAU); }
      }
      ctx.fillStyle = '#232a26'; ctx.fill(pk);
      ctx.fillStyle = '#7d766e'; ctx.fill(pl);

      drawGrass();
    }

    // ------------------------------------------------------------ standing objects
    function drawTrunk(t, b, top, sc) {
      const wb = t.tr * sc, wt = t.tr * sc * 0.6;
      const pts = [
        [b.x - wb * 1.0, b.y + wb * 0.12], [b.x - wb * 0.5, b.y - wb * 0.45], [top.x - wt * 0.5, top.y],
        [top.x + wt * 0.5, top.y], [b.x + wb * 0.5, b.y - wb * 0.35], [b.x + wb * 1.05, b.y + wb * 0.18],
      ];
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = C.bark; ctx.fill();
      ctx.lineWidth = Math.max(1.4, sc * 0.04); ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
      // Lit strip on the left.
      ctx.beginPath();
      ctx.moveTo(b.x - wb * 0.85, b.y + wb * 0.08); ctx.lineTo(b.x - wb * 0.45, b.y - wb * 0.45); ctx.lineTo(top.x - wt * 0.45, top.y);
      ctx.lineTo(top.x - wt * 0.05, top.y); ctx.lineTo(b.x - wb * 0.08, b.y - wb * 0.3); ctx.lineTo(b.x - wb * 0.35, b.y + wb * 0.1);
      ctx.closePath(); ctx.fillStyle = C.barkLit; ctx.fill();
      // Rim and bark lines.
      ctx.strokeStyle = C.rim; ctx.globalAlpha *= 0.65; ctx.lineWidth = Math.max(1, sc * 0.018);
      ctx.beginPath(); ctx.moveTo(b.x - wb * 0.5, b.y - wb * 0.45); ctx.lineTo(top.x - wt * 0.42, top.y); ctx.stroke();
      ctx.globalAlpha /= 0.65;
      ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(0.8, sc * 0.016);
      ctx.beginPath();
      for (const f of [0.15, 0.35, 0.62]) {
        const x0 = b.x + (f - 0.4) * wb, x1 = top.x + (f - 0.4) * wt;
        ctx.moveTo(x0, b.y - wb * 0.3); ctx.quadraticCurveTo((x0 + x1) / 2 + wb * 0.08, (b.y + top.y) / 2, x1, top.y + (b.y - top.y) * 0.25);
      }
      ctx.stroke();
    }

    // far: 0 = near tones, 1 = far tones; in between the two crossfade so
    // trees do not pop as the camera sways.
    function drawTree(t, fade, far) {
      const sc = V.cam.sc;
      const b = P(t.x, t.y, 0), cc = P(t.x, t.y, t.h * 0.78);
      const sp = (far > 0.5 ? canopies.far : canopies.near)[t.v];
      const s = (t.R * sc) / CK;
      if (cc.x + sp.w * s < 0 || cc.x - sp.w * s > V.W || cc.y - sp.h * s > V.H || cc.y + sp.h * s < 0) {
        if (b.y < 0 || b.y > V.H + 40 || b.x < -sp.w * s || b.x > V.W + sp.w * s) return;
      }
      drawTrunk(t, b, P(t.x, t.y, t.h * 0.62), sc);
      const x = cc.x - sp.cx * s, y = cc.y - sp.cy * s, w = sp.w * s, h = sp.h * s;
      if (far > 0 && far < 1) {
        ctx.globalAlpha = fade;
        ctx.drawImage(canopies.near[t.v].cv, x, y, w, h);
        ctx.globalAlpha = fade * far;
        ctx.drawImage(canopies.far[t.v].cv, x, y, w, h);
      } else {
        ctx.globalAlpha = fade;
        ctx.drawImage(sp.cv, x, y, w, h);
      }
      ctx.globalAlpha = 1;
    }

    function drawBush(t) {
      const sc = V.cam.sc, p = P(t.x, t.y, 0);
      const f = ferns[t.b], s = (t.R * 1.0 * sc) / (BK * 1.5);
      if (p.x + f.w * s < 0 || p.x - f.w * s > V.W || p.y - f.h * s > V.H) return;
      ctx.drawImage(f.cv, p.x - f.bx * s, p.y - f.by * s, f.w * s, f.h * s);
    }

    function drawRock(o) {
      const sc = V.cam.sc, sh = rockShape.get(o);
      const p = P(o.x, o.y, o.r * 0.42), rx = o.r * sc, ry = o.r * sc * 0.82;
      const pts = sh.pts.map(([x, y]) => ({ x: p.x + x * rx, y: p.y + y * ry }));
      const cpt = { x: p.x + sh.cx * rx, y: p.y + sh.cy * ry };
      ctx.beginPath(); poly(pts); ctx.fillStyle = C.rock; ctx.fill();
      // Facets: a fan from the ridge point, toned by which way each faces.
      const lx = Math.cos(V.light.ang), ly = Math.sin(V.light.ang);
      const rimP = new Path2D();
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const mx = (a.x + b.x) / 2 - cpt.x, my = (a.y + b.y) / 2 - cpt.y, m = Math.hypot(mx, my) || 1;
        const dot = (mx * lx + my * ly) / m;
        if (dot < -0.25) continue;
        ctx.beginPath(); ctx.moveTo(cpt.x, cpt.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.closePath();
        ctx.fillStyle = dot > 0.45 ? C.rockLit : C.rockMid; ctx.fill();
        if (dot > 0.45) { rimP.moveTo(a.x, a.y); rimP.lineTo(b.x, b.y); }
      }
      ctx.lineJoin = 'round';
      ctx.strokeStyle = C.rim; ctx.globalAlpha = 0.7; ctx.lineWidth = Math.max(1, sc * 0.02); ctx.stroke(rimP); ctx.globalAlpha = 1;
      // Inner ridges (light) and silhouette (heavy).
      ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(0.8, sc * 0.016);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 3) { ctx.moveTo(cpt.x, cpt.y); ctx.lineTo(pts[i].x, pts[i].y); }
      ctx.stroke();
      ctx.lineWidth = Math.max(1.5, sc * 0.045);
      ctx.beginPath(); poly(pts); ctx.stroke();
    }

    // The fallen trunk (Eiryn's back is against it), split into pieces so
    // fighters can stand in front of or behind each part.
    const TRUNK_N = 6;
    function drawTrunkPiece(o, i) {
      const sc = V.cam.sc;
      const t0 = i / TRUNK_N, t1 = (i + 1) / TRUNK_N;
      const ax = o.ax + (o.bx - o.ax) * t0, ay = o.ay + (o.by - o.ay) * t0;
      const bx = o.ax + (o.bx - o.ax) * t1, by = o.ay + (o.by - o.ay) * t1;
      const a = P(ax, ay, o.r), b = P(bx, by, o.r);
      const A0 = P(o.ax, o.ay, o.r), B0 = P(o.bx, o.by, o.r);
      let dx = B0.x - A0.x, dy = B0.y - A0.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      let nx = -dy, ny = dx; if (ny > 0) { nx = -nx; ny = -ny; } // n points up the screen
      const rr = o.r * sc * 0.92;
      const ext = i === 0 ? -0.001 : 0.5, ext1 = i === TRUNK_N - 1 ? 0.001 : 0.5; // overlap seams
      const ax2 = a.x - dx * ext, ay2 = a.y - dy * ext, bx2 = b.x + dx * ext1, by2 = b.y + dy * ext1;
      const q = (x, y, k) => [x + nx * rr * k, y + ny * rr * k];
      const rot = Math.atan2(dy, dx);
      const visB = B0.d > A0.d; // which end face turns toward the camera
      // Hidden end: rounded body.
      ctx.fillStyle = C.log;
      if (i === 0 && visB) { ctx.beginPath(); ctx.ellipse(a.x, a.y, rr * 0.42, rr, rot, 0, TAU); ctx.fill(); }
      if (i === TRUNK_N - 1 && !visB) { ctx.beginPath(); ctx.ellipse(b.x, b.y, rr * 0.42, rr, rot, 0, TAU); ctx.fill(); }
      // Body and the lit upper band.
      const body = [q(ax2, ay2, 1), q(bx2, by2, 1), q(bx2, by2, -1), q(ax2, ay2, -1)];
      ctx.beginPath(); body.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      const band = [q(ax2, ay2, 1), q(bx2, by2, 1), q(bx2, by2, 0.25), q(ax2, ay2, 0.25)];
      ctx.beginPath(); band.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = C.logLit; ctx.fill();
      // Bark: wavy grain lines along the trunk and the odd knot.
      const r = Sim.makeRng(41 + i);
      ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(0.8, sc * 0.016);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const f0 = r() * 0.5, f1 = Math.min(1, f0 + 0.35 + r() * 0.4), h = 0.75 - (k / 5) * 1.5 + (r() - 0.5) * 0.15;
        const [x0, y0] = q(ax2 + (bx2 - ax2) * f0, ay2 + (by2 - ay2) * f0, h);
        const fm = (f0 + f1) / 2, [xm, ym] = q(ax2 + (bx2 - ax2) * fm, ay2 + (by2 - ay2) * fm, h + (r() - 0.5) * 0.3);
        const [x1, y1] = q(ax2 + (bx2 - ax2) * f1, ay2 + (by2 - ay2) * f1, h + (r() - 0.5) * 0.1);
        ctx.moveTo(x0, y0); ctx.quadraticCurveTo(xm, ym, x1, y1);
      }
      ctx.stroke();
      if (i === 2) {
        const [kx, ky] = q(ax2 + (bx2 - ax2) * 0.55, ay2 + (by2 - ay2) * 0.55, -0.25);
        ctx.beginPath(); ctx.ellipse(kx, ky, rr * 0.22, rr * 0.12, rot, 0, TAU);
        ctx.fillStyle = C.ink; ctx.fill();
        ctx.beginPath(); ctx.ellipse(kx, ky, rr * 0.34, rr * 0.2, rot, 0, TAU); ctx.stroke();
      }
      // Moss on the top: a ragged clump.
      if (i === 1 || i === 3 || i === 4) {
        const f = 0.3 + r() * 0.4, [mx, my] = q(ax2 + (bx2 - ax2) * f, ay2 + (by2 - ay2) * f, 0.8);
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * TAU, m = k % 2 ? 0.65 : 1;
          const ex = Math.cos(a) * rr * 0.7 * m, ey = Math.sin(a) * rr * 0.24 * m;
          const x = mx + ex * Math.cos(rot) - ey * Math.sin(rot), y = my + ex * Math.sin(rot) + ey * Math.cos(rot);
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = C.moss; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = Math.max(0.8, sc * 0.014); ctx.stroke();
      }
      // Silhouette lines (top heavier) and the rim along the top.
      const lw = Math.max(1.5, sc * 0.05);
      ctx.strokeStyle = C.ink; ctx.lineWidth = lw;
      ctx.beginPath();
      let [x, y] = q(ax2, ay2, 1); ctx.moveTo(x, y); [x, y] = q(bx2, by2, 1); ctx.lineTo(x, y);
      [x, y] = q(ax2, ay2, -1); ctx.moveTo(x, y); [x, y] = q(bx2, by2, -1); ctx.lineTo(x, y);
      ctx.stroke();
      ctx.strokeStyle = C.rim; ctx.globalAlpha = 0.6; ctx.lineWidth = Math.max(1, sc * 0.02);
      ctx.beginPath(); [x, y] = q(ax2, ay2, 0.88); ctx.moveTo(x, y); [x, y] = q(bx2, by2, 0.88); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = 1;
      // Cut end with growth rings, on whichever end faces the camera.
      const endAt = (i === TRUNK_N - 1 && visB) ? b : (i === 0 && !visB) ? a : null;
      if (endAt) {
        ctx.beginPath(); ctx.ellipse(endAt.x, endAt.y, rr * 0.42, rr, rot, 0, TAU);
        ctx.fillStyle = C.logEnd; ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = lw; ctx.stroke();
        ctx.lineWidth = Math.max(0.7, sc * 0.014);
        for (const k of [0.66, 0.36]) { ctx.beginPath(); ctx.ellipse(endAt.x, endAt.y, rr * 0.42 * k, rr * k, rot, 0, TAU); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(endAt.x, endAt.y, rr * 0.42, rr, rot, Math.PI * 0.9, Math.PI * 1.4); // shade crescent
        ctx.strokeStyle = 'rgba(12,8,8,0.45)'; ctx.lineWidth = rr * 0.18; ctx.stroke();
      }
    }

    function items(s) {
      const out = [];
      const cam = V.cam;
      const live = [];
      for (const u of s.units) if (Sim.alive(u) && !u.fled) live.push(P(u.x, u.y, 0));
      for (const t of trees) {
        const p = P(t.x, t.y, 0);
        // Trees between the camera and the arena become low undergrowth so
        // they never hide the fight.
        if (!t.obstacle && p.d > -1) { out.push({ d: p.d, f: () => drawBush(t) }); continue; }
        // Fade the canopy when a fighter is behind it.
        const reach = t.R * cam.sc * 1.2;
        const behind = live.some((q) => q.d < p.d && Math.abs(q.x - p.x) < reach && p.d - q.d < 6);
        const far = Math.max(0, Math.min(1, (-p.d - 7.5) / 2));
        out.push({ d: p.d, f: () => drawTree(t, behind ? 0.35 : 1, far) });
      }
      for (const o of A.obstacles) {
        if (o.kind === 'trunk') {
          for (let i = 0; i < TRUNK_N; i++) {
            const f = (i + 0.5) / TRUNK_N;
            const m = P(o.ax + (o.bx - o.ax) * f, o.ay + (o.by - o.ay) * f, 0);
            out.push({ d: m.d, f: () => drawTrunkPiece(o, i) });
          }
        } else if (o.kind === 'rock') {
          out.push({ d: P(o.x, o.y, 0).d, f: () => drawRock(o) });
        }
      }
      return out;
    }

    // ------------------------------------------------------------ atmosphere
    // Light shaft, vignette with screentone in the corners and paper grain,
    // baked into one screen-sized canvas; per frame: one blit plus motes.
    let over = null, overKey = '';
    function buildOverlay() {
      const W = V.W, H = V.H, dpr = V.dpr;
      if (!W || !H) return;
      const cv = over && over.width === Math.round(W * dpr) && over.height === Math.round(H * dpr) ? over : canvas(W * dpr, H * dpr);
      const c = cv.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = Sim.makeRng(5);
      // Dusk light shafts from the upper left.
      const lx = -Math.cos(V.light.ang), ly = -Math.sin(V.light.ang);
      // Each shaft is three nested layers, which reads as a soft edge.
      const shafts = [];
      for (const [o, wd, a] of [[-0.12, 0.13, 0.035], [0.08, 0.06, 0.025], [0.22, 0.1, 0.02]]) {
        for (const k of [1, 0.7, 0.4]) shafts.push([o + wd * (1 - k) * 0.5, wd * k, a]);
      }
      for (const [o, wd, a] of shafts) {
        const sx = W * (0.05 + o), sy = -H * 0.1, len = Math.hypot(W, H) * 1.1;
        const ex = sx + lx * len, ey = sy + ly * len;
        const px = -ly * W * wd, py = lx * W * wd;
        const g = c.createLinearGradient(sx, sy, sx + lx * len * 0.8, sy + ly * len * 0.8);
        g.addColorStop(0, `rgba(237,202,192,${a})`); g.addColorStop(1, 'rgba(237,202,192,0)');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + px * 0.4, sy + py * 0.4); c.lineTo(ex + px, ey + py); c.lineTo(ex - px * 0.3, ey - py * 0.3); c.closePath(); c.fill();
      }
      // Vignette.
      const cx = W / 2, cy = H * 0.52, rIn = Math.min(W, H) * 0.42, rOut = Math.hypot(W, H) * 0.62;
      const g = c.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
      g.addColorStop(0, 'rgba(8,6,7,0)'); g.addColorStop(0.6, 'rgba(8,6,7,0.32)'); g.addColorStop(1, 'rgba(8,6,7,0.72)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // Screentone dots in the dark corners, growing toward the edge.
      c.fillStyle = 'rgba(10,8,9,0.38)';
      c.beginPath();
      const step = 5;
      for (let y = step / 2; y < H; y += step) {
        for (let x = ((y / step) & 1 ? step / 2 : 0) + step / 2; x < W; x += step) {
          const k = (Math.hypot(x - cx, (y - cy) * (W / H) * 0.6) - rIn * 1.4) / (rOut - rIn);
          if (k <= 0) continue;
          const rad = Math.min(step * 0.5, k * step * 0.55);
          if (rad < 0.35) continue;
          c.moveTo(x + rad, y); c.arc(x, y, rad, 0, TAU);
        }
      }
      c.fill();
      // Paper grain.
      c.setTransform(1, 0, 0, 1, 0, 0);
      const n = Math.round(cv.width * cv.height / 70);
      c.fillStyle = 'rgba(237,220,210,0.05)';
      for (let i = 0; i < n / 2; i++) c.fillRect(r() * cv.width, r() * cv.height, 1, 1);
      c.fillStyle = 'rgba(0,0,0,0.08)';
      for (let i = 0; i < n / 2; i++) c.fillRect(r() * cv.width, r() * cv.height, 1.5, 1.5);
      over = cv; overKey = W + 'x' + H + '@' + dpr;
    }

    const motes = [];
    for (let i = 0; i < 34; i++) motes.push({ x: R(), y: R(), vx: 0.004 + R() * 0.01, vy: -0.004 - R() * 0.012, s: 0.8 + R() * 1.6, ph: R() * TAU, warm: R() < 0.3 });

    function drawAtmosphere() {
      const W = V.W, H = V.H, t = V.time;
      if (overKey !== W + 'x' + H + '@' + V.dpr) buildOverlay();
      if (over) ctx.drawImage(over, 0, 0, W, H);
      // Drifting dust motes catching the low light.
      const bone = new Path2D(), warm = new Path2D();
      for (const m of motes) {
        const x = (((m.x + t * m.vx + Math.sin(t * 0.4 + m.ph) * 0.01) % 1) + 1) % 1 * W;
        const y = (((m.y + t * m.vy) % 1) + 1) % 1 * H;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + m.ph * 3);
        const sz = m.s * (0.6 + tw * 0.6);
        (m.warm ? warm : bone).rect(x - sz / 2, y - sz / 2, sz, sz);
      }
      ctx.fillStyle = 'rgba(237,214,200,0.45)'; ctx.fill(bone);
      ctx.fillStyle = 'rgba(226,170,130,0.4)'; ctx.fill(warm);
    }

    function resize() { overKey = ''; }

    return { drawBackdrop, items, drawAtmosphere, resize };
  }

  NS.world = { create };
})();
