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

  // ================================================================ forest
  // Chapter One: the dusk forest clearing.
  function forest(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
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

  // ================================================================ shared kit
  // Helpers for the newer arenas: projection-aware primitives (cylinders,
  // boxes, faceted rocks, cast shadows) and a baked screen overlay.
  const TAU = Math.PI * 2;
  const INK = '#0c0808';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function kit(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = {};
    K.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; };
    K.poly = (pts) => { pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
    K.path = (pts) => { ctx.beginPath(); K.poly(pts); };
    K.lw = (k, min) => Math.max(min || 1, V.cam.sc * k);
    K.off = (p, m) => p.x < -m || p.x > V.W + m || p.y < -m || p.y > V.H + m;
    // Depth of a world point along the view direction relative to the arena
    // centre (stable while the camera pans; only rotation changes it).
    // Negative = far side of the arena.
    K.depth = (x, y) => x * Math.sin(V.cam.ang) + y * Math.cos(V.cam.ang);
    // Tall scenery on the near side of the arena is cut down so it never
    // hides the fight (1 = full height on the far side).
    K.tall = (x, y) => clamp(0.62 - 0.85 * K.depth(x, y) / A.ry, 0.1, 1);
    K.shadowOff = (h) => {
      const L = V.light, len = (h * 0.55) / Math.tan(L.elev) * V.cam.sc;
      return { x: -Math.cos(L.ang) * len, y: -Math.sin(L.ang) * len * V.cam.pitch };
    };
    K.inObstacle = (x, y, m) => A.obstacles.some((o) => { const c = Sim.obstacleCenter(o, x, y); return Math.hypot(x - c.x, y - c.y) < o.r + m; });
    K.inArena = (x, y, k) => (x / A.rx) ** 2 + (y / A.ry) ** 2 < k * k;
    // A world ellipse around the arena, k times its size, with optional wobble.
    K.ring = (k, n, wob, amp, ox, oy, z) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, kk = k + (wob ? (wob[i % wob.length] - 0.5) * amp : 0);
        out.push(P((ox || 0) + Math.cos(a) * A.rx * kk, (oy || 0) + Math.sin(a) * A.ry * kk, z || 0));
      }
      return out;
    };
    // Shadow of an upright object: an ellipse at the base swept along the
    // shadow direction. Adds to the current path (screen space).
    K.sweep = (b, rx, ry, o) => {
      ctx.moveTo(b.x + rx, b.y); ctx.ellipse(b.x, b.y, rx, ry, 0, 0, TAU);
      ctx.moveTo(b.x + o.x + rx, b.y + o.y); ctx.ellipse(b.x + o.x, b.y + o.y, rx, ry, 0, 0, TAU);
      const l = Math.hypot(o.x, o.y) || 1, nx = (-o.y / l), ny = (o.x / l);
      const w = Math.hypot(nx * rx, ny * ry);
      const pts = [[b.x + nx * w, b.y + ny * w], [b.x + o.x + nx * w, b.y + o.y + ny * w], [b.x + o.x - nx * w, b.y + o.y - ny * w], [b.x - nx * w, b.y - ny * w]];
      let area = 0;
      for (let i = 0; i < 4; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 4]; area += ax * by - bx * ay; }
      if (area < 0) pts.reverse();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };

    // Faceted rock silhouette in units of its radius (flat base).
    K.rockShape = (r, n) => {
      const pts = [], rot = r() * 0.6;
      n = n || 8;
      for (let i = 0; i < n; i++) {
        const a = rot + (i / n) * TAU, k = 0.84 + r() * 0.26;
        let y = Math.sin(a) * k;
        if (y > 0) y *= 0.6;
        pts.push([Math.cos(a) * k * 1.08, y * 0.92]);
      }
      return { pts, cx: 0.1 + r() * 0.14, cy: -0.3 - r() * 0.14, cracks: [r(), r(), r()] };
    };
    // A rock drawn in facets toned by which way they face the light.
    // pal: {base, mid, lit, rim}; hz: centre height in radii; sy: vertical squash.
    K.drawRock = (x, y, rad, sh, pal, hz, sy) => {
      const sc = V.cam.sc;
      const p = P(x, y, rad * (hz == null ? 0.42 : hz)), rx = rad * sc, ry = rad * sc * (sy || 0.82);
      if (K.off(p, rx * 1.5)) return;
      const pts = sh.pts.map(([px, py]) => ({ x: p.x + px * rx, y: p.y + py * ry }));
      const cpt = { x: p.x + sh.cx * rx, y: p.y + sh.cy * ry };
      K.path(pts); ctx.fillStyle = pal.base; ctx.fill();
      const lx = Math.cos(V.light.ang), ly = Math.sin(V.light.ang);
      const rimP = new Path2D();
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const mx = (a.x + b.x) / 2 - cpt.x, my = (a.y + b.y) / 2 - cpt.y, m = Math.hypot(mx, my) || 1;
        const dot = (mx * lx + my * ly) / m;
        if (dot < -0.25) continue;
        ctx.beginPath(); ctx.moveTo(cpt.x, cpt.y); ctx.lineTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.closePath();
        ctx.fillStyle = dot > 0.45 ? pal.lit : pal.mid; ctx.fill();
        if (dot > 0.45) { rimP.moveTo(a.x, a.y); rimP.lineTo(b.x, b.y); }
      }
      ctx.lineJoin = 'round';
      ctx.strokeStyle = pal.rim; ctx.globalAlpha *= 0.7; ctx.lineWidth = K.lw(0.02); ctx.stroke(rimP); ctx.globalAlpha /= 0.7;
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.016, 0.8);
      ctx.beginPath();
      for (let i = 0; i < pts.length; i += 3) { ctx.moveTo(cpt.x, cpt.y); ctx.lineTo(pts[i].x, pts[i].y); }
      // a crack on the shadow side
      const c0 = sh.cracks;
      ctx.moveTo(p.x + rx * (0.2 + c0[0] * 0.3), p.y + ry * (-0.1 + c0[1] * 0.2));
      ctx.lineTo(p.x + rx * (0.35 + c0[1] * 0.2), p.y + ry * (0.15 + c0[2] * 0.15));
      ctx.lineTo(p.x + rx * (0.3 + c0[2] * 0.3), p.y + ry * 0.4);
      ctx.stroke();
      ctx.lineWidth = K.lw(0.045, 1.5);
      K.path(pts); ctx.stroke();
    };

    // An upright cylinder (pillar, basin rim, post) in screen space: body,
    // two-tone cel shading, rim light, top face. jag(worldAngle) lowers the
    // top edge in metres for a broken top. Returns the screen geometry.
    K.cyl = (x, y, r, z0, z1, pal, jag, opts) => {
      opts = opts || {};
      const sc = V.cam.sc, pitch = V.cam.pitch, ang = V.cam.ang;
      const b = P(x, y, z0), t = P(x, y, z1);
      const rx = r * sc, ry = r * sc * pitch, N = opts.n || 22;
      const top = [], bot = [];
      for (let i = 0; i <= N; i++) {
        const f = (i / N) * TAU, c = Math.cos(f), s = Math.sin(f);
        const j = jag ? jag(f - ang) * sc * 0.9 : 0;
        top.push({ x: t.x + rx * c, y: t.y + ry * s + j });
        bot.push({ x: b.x + rx * c, y: b.y + ry * s });
      }
      const body = () => {
        ctx.beginPath();
        for (let i = 0; i <= N / 2; i++) { const q = bot[i]; i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
        for (let i = N / 2; i <= N; i++) ctx.lineTo(top[i].x, top[i].y);
        ctx.closePath();
      };
      // Flat-sided silhouette: bottom half arc, up the left, back arc, down the right.
      body(); ctx.fillStyle = pal.base; ctx.fill();
      ctx.save(); body(); ctx.clip();
      // Shadow side (away from the upper-left light), hard edged.
      ctx.fillStyle = pal.shade;
      ctx.fillRect(b.x + rx * 0.28, Math.min(t.y - rx * 2, b.y - rx), rx, Math.abs(b.y - t.y) + rx * 4);
      // Lit strip and flutes.
      if (pal.lit) { ctx.fillStyle = pal.lit; ctx.fillRect(b.x - rx * 0.86, Math.min(t.y - rx * 2, b.y - rx), rx * 0.38, Math.abs(b.y - t.y) + rx * 4); }
      if (opts.flutes) {
        ctx.strokeStyle = 'rgba(8,6,7,0.55)'; ctx.lineWidth = K.lw(0.014, 0.8);
        ctx.beginPath();
        for (const f of [0.45, 0.95, 1.55, 2.15, 2.65]) {
          const i = Math.round((f / TAU) * N);
          ctx.moveTo(bot[i].x, bot[i].y); ctx.lineTo(top[i].x, top[i].y + ry * 0.2);
        }
        ctx.stroke();
      }
      if (opts.inside) opts.inside(b, t, rx, ry, bot, top);
      ctx.restore();
      // Rim light up the lit edge.
      if (pal.rim) {
        ctx.strokeStyle = pal.rim; ctx.globalAlpha *= 0.75; ctx.lineWidth = K.lw(0.02);
        ctx.beginPath(); ctx.moveTo(b.x - rx * 0.93, b.y - ry * 0.2); ctx.lineTo(top[N / 2].x + rx * 0.07, top[N / 2].y); ctx.stroke();
        ctx.globalAlpha /= 0.75;
      }
      // Top face.
      if (pal.top) {
        ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
        ctx.fillStyle = pal.top; ctx.fill();
        if (opts.topInside) { ctx.save(); ctx.clip(); opts.topInside(t, rx, ry, top); ctx.restore(); }
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.018, 1); ctx.beginPath(); top.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(opts.ink || 0.045, 1.5); ctx.lineJoin = 'round';
      body(); ctx.stroke();
      return { b, t, rx, ry, top, bot };
    };

    // A box (crate, cut block) rotated by rot, half-sizes hw/hd, from z0 to z1.
    // deco(face, pts, lit) draws on each visible side; face -1 is the top.
    K.box = (x, y, hw, hd, rot, z0, z1, pal, deco) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      const cw = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
      const lo = cw.map(([X, Y]) => P(X, Y, z0)), hi = cw.map(([X, Y]) => P(X, Y, z1));
      const ca = Math.cos(V.cam.ang), sa = Math.sin(V.cam.ang);
      const faces = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const mx = (cw[i][0] + cw[j][0]) / 2 - x, my = (cw[i][1] + cw[j][1]) / 2 - y, l = Math.hypot(mx, my);
        const nx = mx / l, ny = my / l;
        const depth = nx * sa + ny * ca, sx = nx * ca - ny * sa;
        if (depth <= 0.001) continue;
        faces.push({ i, j, lit: sx < -0.15, sx });
      }
      ctx.lineJoin = 'round';
      for (const f of faces) {
        const pts = [lo[f.i], lo[f.j], hi[f.j], hi[f.i]];
        K.path(pts); ctx.fillStyle = f.lit ? pal.lit : pal.shade; ctx.fill();
        if (deco) { ctx.save(); K.path(pts); ctx.clip(); deco(f.i, pts, f.lit); ctx.restore(); }
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1); K.path(pts); ctx.stroke();
      }
      K.path(hi); ctx.fillStyle = pal.top; ctx.fill();
      if (deco) { ctx.save(); K.path(hi); ctx.clip(); deco(-1, hi, true); ctx.restore(); }
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1); K.path(hi); ctx.stroke();
      // Heavy silhouette: the hull of the visible faces and the top.
      const all = lo.concat(hi);
      const hull = convexHull(all);
      ctx.lineWidth = K.lw(0.045, 1.5); K.path(hull); ctx.stroke();
      if (pal.rim) {
        // rim along the top's lit (upper-left) edges
        ctx.strokeStyle = pal.rim; ctx.globalAlpha *= 0.65; ctx.lineWidth = K.lw(0.018);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = hi[i], b = hi[(i + 1) % 4];
          const mx = (a.x + b.x) / 2 - (hi[0].x + hi[2].x) / 2, my = (a.y + b.y) / 2 - (hi[0].y + hi[2].y) / 2;
          if (mx * V.light.sx + my * V.light.sy > 0) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        }
        ctx.stroke(); ctx.globalAlpha /= 0.65;
      }
      return { lo, hi };
    };

    // Is a living fighter behind this screen point (so it should fade)?
    K.behind = (s, p, reach, height) => {
      for (const u of s.units) {
        if (!Sim.alive(u) || u.fled) continue;
        const q = P(u.x, u.y, 0);
        if (q.d < p.d && Math.abs(q.x - p.x) < reach && q.y > p.y - height && q.y < p.y + 4) return true;
      }
      return false;
    };

    // Baked screen overlay: theme paint, vignette, screentone, paper grain.
    // o: {paint(c, W, H, r), vig: [mid, outer], tone, toneCol, vigCol}
    K.overlay = (o) => {
      let over = null, key = '';
      function build() {
        const W = V.W, H = V.H, dpr = V.dpr;
        if (!W || !H) return;
        const cv = over && over.width === Math.round(W * dpr) && over.height === Math.round(H * dpr) ? over : K.canvas(W * dpr, H * dpr);
        const c = cv.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const r = Sim.makeRng(5);
        if (o.paint) o.paint(c, W, H, r);
        const cx = W / 2, cy = H * 0.52, rIn = Math.min(W, H) * 0.42, rOut = Math.hypot(W, H) * 0.62;
        const vc = o.vigCol || '8,6,7';
        const g = c.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
        g.addColorStop(0, `rgba(${vc},0)`); g.addColorStop(0.6, `rgba(${vc},${o.vig[0]})`); g.addColorStop(1, `rgba(${vc},${o.vig[1]})`);
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.fillStyle = o.toneCol || 'rgba(10,8,9,0.38)';
        c.beginPath();
        const step = 5;
        for (let y = step / 2; y < H; y += step) {
          for (let x = ((y / step) & 1 ? step / 2 : 0) + step / 2; x < W; x += step) {
            const k = (Math.hypot(x - cx, (y - cy) * (W / H) * 0.6) - rIn * (o.tone || 1.4)) / (rOut - rIn);
            if (k <= 0) continue;
            const rad = Math.min(step * 0.5, k * step * 0.55);
            if (rad < 0.35) continue;
            c.moveTo(x + rad, y); c.arc(x, y, rad, 0, TAU);
          }
        }
        c.fill();
        c.setTransform(1, 0, 0, 1, 0, 0);
        const n = Math.round(cv.width * cv.height / 70);
        c.fillStyle = 'rgba(237,220,210,0.05)';
        for (let i = 0; i < n / 2; i++) c.fillRect(r() * cv.width, r() * cv.height, 1, 1);
        c.fillStyle = 'rgba(0,0,0,0.08)';
        for (let i = 0; i < n / 2; i++) c.fillRect(r() * cv.width, r() * cv.height, 1.5, 1.5);
        over = cv; key = W + 'x' + H + '@' + dpr;
      }
      return {
        draw() { if (key !== V.W + 'x' + V.H + '@' + V.dpr) build(); if (over) ctx.drawImage(over, 0, 0, V.W, V.H); },
        reset() { key = ''; },
      };
    };

    // Grass / scrub tuft sprites (three sharp blades), anchored at the base.
    K.tuft = (seed, cols, lit, tip) => {
      const r = Sim.makeRng(seed), G = 48;
      const cv = K.canvas(G * 1.8, G * 1.4), c = cv.getContext('2d');
      const ax = cv.width / 2, ay = cv.height - 4, lean = (r() - 0.5) * 0.5, wd = G * 0.1;
      const blade = (x, h, l, col) => {
        c.beginPath(); c.moveTo(x - wd, ay); c.quadraticCurveTo(x + l * h * 0.3, ay - h * 0.6, x + l * h, ay - h); c.quadraticCurveTo(x + l * h * 0.3 + wd * 0.6, ay - h * 0.5, x + wd, ay); c.closePath();
        c.fillStyle = col; c.fill();
        if (col !== cols.ink) { c.strokeStyle = cols.ink; c.lineWidth = G * 0.025; c.stroke(); }
      };
      blade(ax - G * 0.22, G * (0.7 + r() * 0.2), -0.6 + lean, cols.ink);
      blade(ax + G * 0.24, G * (0.55 + r() * 0.2), 0.65 + lean, cols.ink);
      blade(ax + G * 0.05 * (r() - 0.5), G * 1.05, 0.1 + lean, lit ? cols.lit : cols.ink);
      if (tip) {
        c.strokeStyle = cols.tip; c.lineWidth = G * 0.035; c.lineCap = 'round';
        c.beginPath(); c.moveTo(ax + (0.1 + lean) * G * 0.6, ay - G * 0.64); c.lineTo(ax + (0.1 + lean) * G * 1.02, ay - G * 1.02); c.stroke();
      }
      return { cv, ax, ay, G };
    };
    K.drawSprites = (list, sprites, size) => {
      const sc = V.cam.sc;
      for (const t of list) {
        const p = P(t.x, t.y, 0);
        if (K.off(p, 30)) continue;
        const sp = sprites[t.v], k = (t.s * sc * size) / sp.G;
        ctx.drawImage(sp.cv, p.x - sp.ax * k, p.y - sp.ay * k, sp.cv.width * k, sp.cv.height * k);
      }
    };
    // Drifting screen motes.
    K.motes = (n, seed, f) => {
      const r = Sim.makeRng(seed), list = [];
      for (let i = 0; i < n; i++) list.push({ x: r(), y: r(), vx: (r() - 0.5) * 0.012, vy: -0.004 - r() * 0.014, s: 0.8 + r() * 1.8, ph: r() * TAU, c: f ? f(r) : 0 });
      return list;
    };
    K.drawMotes = (list, cols) => {
      const W = V.W, H = V.H, t = V.time;
      const paths = cols.map(() => new Path2D());
      for (const m of list) {
        const x = (((m.x + t * m.vx + Math.sin(t * 0.4 + m.ph) * 0.01) % 1) + 1) % 1 * W;
        const y = (((m.y + t * m.vy) % 1) + 1) % 1 * H;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + m.ph * 3);
        const sz = m.s * (0.6 + tw * 0.6);
        paths[m.c].rect(x - sz / 2, y - sz / 2, sz, sz);
      }
      cols.forEach((col, i) => { ctx.fillStyle = col; ctx.fill(paths[i]); });
    };
    return K;
  }

  function convexHull(pts) {
    const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }

  // A jagged polyline (crack) from a start point: [[x, y], ...] in metres.
  function crackLine(r, x, y, len, a) {
    const pts = [[x, y]];
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      a += (r() - 0.5) * 1.1;
      const l = (len / n) * (0.6 + r() * 0.8);
      x += Math.cos(a) * l; y += Math.sin(a) * l;
      pts.push([x, y]);
    }
    return pts;
  }

  // ================================================================ summit
  // The tutorial: the last floor at the top of the Tower. A broken obsidian
  // platform above a sea of cloud, a crimson sky, pillars, cracked floor with
  // rune light seeping through, and a blinding light pouring down in the
  // north where the stair leads (the climber's exit).
  function summit(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(71);
    const C = {
      sky0: '#3a0d14', sky1: '#1c080b', sky2: '#0c0607',
      cliff: '#191416', cliffLit: '#2f272a', cliffShade: '#0e0b0c', lip: '#3d3438', lipLit: '#5a4f53',
      floor: '#353033', floorLit: '#433b3f', pool: '#544a4e', seam: 'rgba(8,6,7,0.6)', chip: '#1c1719',
      rune: '227,38,58', runeCore: '255,205,200',
      stone: { base: '#3b3337', lit: '#5f5559', shade: '#1f1a1d', rim: '#f0d8cc', top: '#6d6266' },
      shard: { base: '#221c1f', mid: '#3a3236', lit: '#6a5e63', rim: '#f0d8cc' },
      shadowA: 'rgba(8,4,6,0.5)',
    };
    // ---- layout (all world-anchored, built once per arena)
    const wobA = [], wobB = [];
    for (let i = 0; i < 64; i++) { wobA.push(R() < 0.12 ? R() * 0.4 : 0.5 + (R() - 0.5) * 0.3); wobB.push(R()); }
    const EDGE = 1.07; // platform edge, times the arena ellipse
    const STAIR = { x: 0, y0: -A.ry * EDGE + 0.4, y1: A.exit.y - 0.7, w: 1.7, n: 5, h: 0.22 };
    // Clouds: a ring of cel-shaded cloud banks far below.
    const clouds = [];
    for (let i = 0; i < 54; i++) {
      const a = R() * TAU, d = 11 + Math.pow(R(), 0.7) * 30;
      clouds.push({ x: Math.cos(a) * d * 1.15, y: Math.sin(a) * d, z: -6 - R() * 5, w: 7 + R() * 9, v: i % 3 });
    }
    // Floating debris around the platform edge.
    const debris = [];
    for (let i = 0; i < 26; i++) {
      const a = R() * TAU, k = 1.2 + R() * 0.75;
      const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (Math.abs(x) < 2.6 && y < 0) continue; // keep the stair clear
      const pts = [];
      const n = 5 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) { const b = (j / n) * TAU + R() * 0.4; const kk = 0.7 + R() * 0.45; pts.push([Math.cos(b) * kk, Math.sin(b) * kk * 0.8]); }
      debris.push({ x, y, z: -1.8 + R() * 3.4, r: 0.12 + Math.pow(R(), 2) * 0.55, ph: R() * TAU, rot: R() * TAU, pts, rune: R() < 0.3 });
    }
    // Far debris in the sky.
    const farDebris = [];
    for (let i = 0; i < 18; i++) {
      const a = R() * TAU, d = 16 + R() * 18;
      farDebris.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, z: 2 + R() * 9, r: 0.2 + R() * 0.7, ph: R() * TAU });
    }
    // Floor: flagstone rings and radial seams, cracks, rune sigil.
    const seams = [];
    for (const [k0, k1, n, o] of [[0.62, 0.8, 22, 0], [0.8, 0.96, 30, 0.5], [0.96, EDGE, 38, 0.2]]) {
      for (let i = 0; i < n; i++) {
        const a = ((i + o) / n) * TAU + (R() - 0.5) * 0.04;
        seams.push([Math.cos(a) * A.rx * k0, Math.sin(a) * A.ry * k0, Math.cos(a) * A.rx * k1, Math.sin(a) * A.ry * k1]);
      }
    }
    const cracks = [];
    for (let i = 0; i < 26; i++) {
      const a = R() * TAU, k = 0.25 + R() * 0.8;
      const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      cracks.push({ pts: crackLine(R, x, y, 1.2 + R() * 2.8, R() * TAU), glow: R() < 0.55, w: 0.6 + R() * 0.8 });
    }
    // Chips knocked out of the floor.
    const chips = [];
    for (let i = 0; i < 40; i++) {
      const a = R() * TAU, k = Math.sqrt(R()) * 1.02;
      const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (K.inObstacle(x, y, 0.1)) continue;
      chips.push({ x, y, r: 0.05 + R() * 0.12, a: R() * TAU });
    }
    // The rune sigil: rings with gaps (the floor is broken through them).
    const SIG = { r0: 1.5, r1: 3.3, r2: 3.6, spokes: 8 };
    const sigGaps = [];
    for (let i = 0; i < 5; i++) sigGaps.push([R() * TAU, 0.15 + R() * 0.3]);
    const glyphs = [];
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU, kind = Math.floor(R() * 4);
      glyphs.push({ a, kind });
    }
    // Pillars: broken tops (height + jag in metres), cracks.
    const pillar = new Map(), rockSh = new Map();
    for (const o of A.obstacles) {
      if (o.kind === 'pillar') {
        const h = 2.0 + R() * 1.9, ph = R() * TAU, amp = 0.35 + R() * 0.5, f = 1 + Math.floor(R() * 2);
        pillar.set(o, { h, jag: (a) => Math.max(0, Math.sin(a * f + ph) * amp + Math.sin(a * 5 + ph * 2) * 0.12), cr: [R(), R(), R()], band: 0.9 + R() * 0.5 });
      } else if (o.kind === 'rock') rockSh.set(o, K.rockShape(R, 7));
    }
    // Fallen drums outside the ring.
    const drums = [];
    for (let i = 0; i < 4; i++) {
      const a = -0.4 + i * 1.7 + R() * 0.5, k = 0.98 + R() * 0.05;
      drums.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, r: 0.45 + R() * 0.15 });
    }

    // ---- sprites: cloud banks
    const CK = 140;
    function makeCloud(seed) {
      const r = Sim.makeRng(seed);
      const w = CK * 4.4, h = CK * 1.7, cv = K.canvas(w, h), c = cv.getContext('2d');
      const base = h * 0.82, bumps = [];
      const n = 6 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, rr = CK * (0.42 + Math.sin(t * Math.PI) * 0.45 + r() * 0.18);
        bumps.push({ x: w * (0.1 + t * 0.8) + (r() - 0.5) * CK * 0.2, y: base - rr * (0.45 + r() * 0.25), r: rr });
      }
      const shape = (c2, dx, dy, grow) => {
        c2.beginPath();
        for (const b of bumps) { c2.moveTo(b.x + dx + b.r + grow, b.y + dy); c2.arc(b.x + dx, b.y + dy, b.r + grow, 0, TAU); }
      };
      c.save(); c.beginPath(); c.rect(0, 0, w, base + 2); c.clip();
      c.fillStyle = INK; shape(c, 0, 0, CK * 0.05); c.fill();
      c.fillStyle = '#1b0d11'; shape(c, 0, 0, 0); c.fill();
      c.save(); shape(c, 0, 0, 0); c.clip();
      c.fillStyle = '#331a20'; shape(c, -CK * 0.08, -CK * 0.16, -CK * 0.04); c.fill();
      c.fillStyle = '#4c262c'; shape(c, -CK * 0.16, -CK * 0.3, -CK * 0.12); c.fill();
      // screentone hatching on the underside
      c.strokeStyle = 'rgba(8,4,6,0.45)'; c.lineWidth = CK * 0.025;
      c.beginPath();
      for (let x = -h; x < w; x += CK * 0.12) { c.moveTo(x, base); c.lineTo(x + CK * 0.5, base - CK * 0.5); }
      c.stroke();
      c.restore();
      // rim on top from the light above
      const rim = K.canvas(w, h), rc = rim.getContext('2d');
      rc.fillStyle = '#f2b8a8'; shape(rc, 0, 0, 0); rc.fill();
      rc.globalCompositeOperation = 'destination-out'; shape(rc, CK * 0.02, CK * 0.06, 0); rc.fill();
      c.globalAlpha = 0.5; c.drawImage(rim, 0, 0); c.globalAlpha = 1;
      c.restore();
      c.strokeStyle = INK; c.lineWidth = CK * 0.05; c.beginPath(); c.moveTo(w * 0.04, base); c.lineTo(w * 0.96, base); c.stroke();
      return { cv, w, h, base };
    }
    const cloudSp = [makeCloud(901), makeCloud(917), makeCloud(933)];

    // ---- drawing
    function sky() {
      const W = V.W, H = V.H;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.sky0); g.addColorStop(0.55, C.sky1); g.addColorStop(1, C.sky2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // The rift's glow over the sky (world-anchored high in the north).
      const rp = P(RIFT.x, RIFT.y, RIFT.z), rad = Math.max(W, H) * 0.75;
      const rg = ctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, rad);
      rg.addColorStop(0, 'rgba(255,236,226,0.55)'); rg.addColorStop(0.18, 'rgba(240,120,110,0.28)'); rg.addColorStop(0.5, 'rgba(142,22,33,0.18)'); rg.addColorStop(1, 'rgba(142,22,33,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      // far debris silhouettes
      ctx.fillStyle = '#120a0c';
      ctx.beginPath();
      for (const d of farDebris) {
        const p = P(d.x, d.y, d.z + Math.sin(V.time * 0.4 + d.ph) * 0.2), r = d.r * V.cam.sc * 0.6;
        if (K.off(p, r + 4)) continue;
        ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x - r * 0.2, p.y - r * 0.7); ctx.lineTo(p.x + r, p.y - r * 0.2); ctx.lineTo(p.x + r * 0.3, p.y + r * 0.6); ctx.closePath();
      }
      ctx.fill();
    }
    const RIFT = { x: 0, y: A.exit.y - 1.2, z: 16 };
    function drawClouds(near) {
      const sc = V.cam.sc, list = [];
      for (const c of clouds) {
        const p = P(c.x, c.y, c.z);
        const isNear = K.depth(c.x, c.y) > 0;
        if (isNear !== near) continue;
        list.push([p, c]);
      }
      list.sort((a, b) => a[0].d - b[0].d);
      for (const [p, c] of list) {
        const sp = cloudSp[c.v], k = (c.w * sc) / sp.w;
        const w = sp.w * k, h = sp.h * k;
        if (p.x + w / 2 < 0 || p.x - w / 2 > V.W || p.y - sp.base * k > V.H || p.y + h < 0) continue;
        ctx.drawImage(sp.cv, p.x - w / 2, p.y - sp.base * k, w, h);
      }
    }
    // The platform's side: masonry falling away into the cloud.
    function cliff() {
      const sc = V.cam.sc, N = 64;
      const top = [], bot = [], lip = [], nrm = [];
      const ca = Math.cos(V.cam.ang), sa = Math.sin(V.cam.ang);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU, k = EDGE + (wobA[i] - 0.5) * 0.05;
        const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
        top.push(P(x, y, 0)); lip.push(P(x, y, -0.4)); bot.push(P(x * 0.92, y * 0.92, -16));
        const nx = Math.cos(a) / A.rx, ny = Math.sin(a) / A.ry, l = Math.hypot(nx, ny);
        nrm.push([nx / l, ny / l]);
      }
      const faces = [];
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const nx = (nrm[i][0] + nrm[j][0]) / 2, ny = (nrm[i][1] + nrm[j][1]) / 2;
        if (nx * sa + ny * ca <= -0.05) continue;
        faces.push({ i, j, sx: nx * ca - ny * sa });
      }
      // Tower wall below the lip.
      for (const f of faces) {
        ctx.beginPath(); ctx.moveTo(lip[f.i].x, lip[f.i].y); ctx.lineTo(lip[f.j].x, lip[f.j].y); ctx.lineTo(bot[f.j].x, bot[f.j].y); ctx.lineTo(bot[f.i].x, bot[f.i].y); ctx.closePath();
        ctx.fillStyle = f.sx < -0.35 ? C.cliffLit : f.sx > 0.35 ? C.cliffShade : C.cliff;
        ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
      }
      // Masonry courses and seams on the wall.
      ctx.strokeStyle = 'rgba(6,4,5,0.7)'; ctx.lineWidth = K.lw(0.025);
      ctx.beginPath();
      for (const z of [-1.2, -2.3, -3.6, -5.2]) {
        const zz = z / -16;
        for (const f of faces) {
          const a = lip[f.i], b = lip[f.j], a2 = bot[f.i], b2 = bot[f.j];
          ctx.moveTo(a.x + (a2.x - a.x) * zz, a.y + (a2.y - a.y) * zz); ctx.lineTo(b.x + (b2.x - b.x) * zz, b.y + (b2.y - b.y) * zz);
        }
      }
      for (const f of faces) {
        if (f.i % 2) continue;
        const a = lip[f.i], a2 = bot[f.i], z0 = (f.i % 4 ? 0.075 : 0), z1 = z0 + 0.07;
        ctx.moveTo(a.x + (a2.x - a.x) * z0, a.y + (a2.y - a.y) * z0); ctx.lineTo(a.x + (a2.x - a.x) * z1, a.y + (a2.y - a.y) * z1);
      }
      ctx.stroke();
      // Fade the wall into the abyss: crimson haze downward.
      ctx.save();
      ctx.beginPath();
      for (const f of faces) { ctx.moveTo(lip[f.i].x, lip[f.i].y); ctx.lineTo(lip[f.j].x, lip[f.j].y); ctx.lineTo(bot[f.j].x, bot[f.j].y); ctx.lineTo(bot[f.i].x, bot[f.i].y); ctx.closePath(); }
      ctx.clip();
      const c0 = P(0, 0, -0.5), c1 = P(0, 0, -7);
      const g = ctx.createLinearGradient(0, c0.y, 0, c1.y);
      g.addColorStop(0, 'rgba(40,10,14,0)'); g.addColorStop(1, 'rgba(40,10,14,0.85)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
      // The lip: a slab edge, lit on top.
      for (const f of faces) {
        ctx.beginPath(); ctx.moveTo(top[f.i].x, top[f.i].y); ctx.lineTo(top[f.j].x, top[f.j].y); ctx.lineTo(lip[f.j].x, lip[f.j].y); ctx.lineTo(lip[f.i].x, lip[f.i].y); ctx.closePath();
        ctx.fillStyle = f.sx < -0.2 ? C.lipLit : C.lip; ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.5); ctx.lineJoin = 'round';
      ctx.beginPath();
      for (const f of faces) { ctx.moveTo(lip[f.i].x, lip[f.i].y); ctx.lineTo(lip[f.j].x, lip[f.j].y); }
      ctx.stroke();
      return top;
    }
    function floor(top) {
      const sc = V.cam.sc;
      K.path(top); ctx.fillStyle = C.floor; ctx.fill();
      ctx.save(); K.path(top); ctx.clip();
      // Light from the rift: a hard-edged pool on the north half, brighter near the stair.
      ctx.beginPath(); K.poly(K.ring(0.78, 40, wobB, 0.12, 0, -A.ry * 0.32)); ctx.fillStyle = C.floorLit; ctx.fill();
      ctx.beginPath(); K.poly(K.ring(0.36, 32, wobB, 0.18, 0, -A.ry * 0.62)); ctx.fillStyle = C.pool; ctx.fill();
      // Flagstone rings and seams.
      ctx.strokeStyle = C.seam; ctx.lineWidth = K.lw(0.028, 1);
      ctx.beginPath();
      for (const k of [0.62, 0.8, 0.96]) K.poly(K.ring(k, 56));
      for (const [x0, y0, x1, y1] of seams) { const a = P(x0, y0, 0), b = P(x1, y1, 0); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
      // Inner flagstones: a loose grid inside the rings.
      ctx.strokeStyle = 'rgba(8,6,7,0.32)'; ctx.lineWidth = K.lw(0.02, 0.8);
      ctx.beginPath();
      for (let gx = -6; gx <= 6; gx += 1.5) { const a = P(gx, -A.ry * 0.62, 0), b = P(gx, A.ry * 0.62, 0); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      for (let gy = -4.5; gy <= 4.5; gy += 1.5) { const a = P(-A.rx * 0.62, gy, 0), b = P(A.rx * 0.62, gy, 0); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
      ctx.restore();
      // Cast shadows.
      ctx.beginPath();
      for (const o of A.obstacles) {
        if (o.kind === 'pillar') {
          const pl = pillar.get(o);
          K.sweep(P(o.x, o.y, 0), o.r * sc * 0.9, o.r * sc * V.cam.pitch * 0.9, K.shadowOff(pl.h));
        } else {
          const off = K.shadowOff(o.r * 0.9), b = P(o.x, o.y, 0);
          ctx.moveTo(b.x + off.x * 0.5 + o.r * sc, b.y + off.y * 0.5); ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.05, o.r * sc * V.cam.pitch * 0.9, 0, 0, TAU);
        }
      }
      for (const d of drums) { const b = P(d.x, d.y, 0); ctx.moveTo(b.x + d.r * sc * 1.3, b.y); ctx.ellipse(b.x + sc * 0.2, b.y + sc * 0.1, d.r * sc * 1.3, d.r * sc * V.cam.pitch, 0, 0, TAU); }
      ctx.fillStyle = C.shadowA; ctx.fill();
      // Cracks: ink, some with rune light seeping out.
      const t = V.time, pulse = 0.7 + 0.3 * Math.sin(t * 1.4);
      const glowP = new Path2D(), inkP = new Path2D();
      for (const c of cracks) {
        const pts = c.pts.map(([x, y]) => P(x, y, 0));
        if (pts.every((p) => K.off(p, 10))) continue;
        pts.forEach((p, i) => (i ? inkP.lineTo(p.x, p.y) : inkP.moveTo(p.x, p.y)));
        if (c.glow) pts.forEach((p, i) => (i ? glowP.lineTo(p.x, p.y) : glowP.moveTo(p.x, p.y)));
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.05, 1.5); ctx.stroke(inkP);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${C.rune},${0.12 * pulse})`; ctx.lineWidth = K.lw(0.14, 3); ctx.stroke(glowP);
      ctx.strokeStyle = `rgba(${C.runeCore},${0.3 * pulse})`; ctx.lineWidth = K.lw(0.016, 1); ctx.stroke(glowP);
      ctx.restore();
      // Chips.
      ctx.fillStyle = C.chip;
      ctx.beginPath();
      for (const c of chips) {
        const p = P(c.x, c.y, 0), r = c.r * sc;
        if (K.off(p, 6)) continue;
        ctx.moveTo(p.x + r, p.y); ctx.lineTo(p.x, p.y - r * 0.5); ctx.lineTo(p.x - r, p.y + r * 0.1); ctx.lineTo(p.x + r * 0.2, p.y + r * 0.45); ctx.closePath();
      }
      ctx.fill();
      sigil(pulse);
    }
    function sigil(pulse) {
      const sc = V.cam.sc;
      const P2 = (r, a) => P(Math.cos(a) * r, Math.sin(a) * r, 0);
      const inGap = (a) => sigGaps.some(([g, w]) => { let d = Math.abs(((a - g) % TAU + TAU) % TAU); d = Math.min(d, TAU - d); return d < w / 2; });
      const p = new Path2D();
      for (const r of [SIG.r0, SIG.r1, SIG.r2]) {
        let open = false;
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * TAU;
          if (inGap(a + r)) { open = false; continue; }
          const q = P2(r, a);
          open ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y); open = true;
        }
      }
      for (let i = 0; i < SIG.spokes; i++) {
        const a = (i / SIG.spokes) * TAU + 0.2;
        if (inGap(a + SIG.r1)) continue;
        const q0 = P2(SIG.r0, a), q1 = P2(SIG.r1, a);
        p.moveTo(q0.x, q0.y); p.lineTo(q1.x, q1.y);
        // a diamond where the spoke meets the ring
        const m = P2(SIG.r1 - 0.45, a), l = P2(SIG.r1 - 0.25, a - 0.1), rr = P2(SIG.r1 - 0.25, a + 0.1), o = P2(SIG.r1 - 0.05, a);
        p.moveTo(m.x, m.y); p.lineTo(l.x, l.y); p.lineTo(o.x, o.y); p.lineTo(rr.x, rr.y); p.closePath();
      }
      // glyph marks between the outer rings
      const rm = (SIG.r1 + SIG.r2) / 2, gh = (SIG.r2 - SIG.r1) * 0.32;
      for (const g of glyphs) {
        if (inGap(g.a + SIG.r1)) continue;
        const a = g.a, da = 0.05;
        const A0 = P2(rm - gh, a - da), A1 = P2(rm + gh, a - da), B0 = P2(rm - gh, a + da), B1 = P2(rm + gh, a + da), M = P2(rm, a);
        if (g.kind === 0) { p.moveTo(A0.x, A0.y); p.lineTo(A1.x, A1.y); p.lineTo(B0.x, B0.y); }
        else if (g.kind === 1) { p.moveTo(A1.x, A1.y); p.lineTo(M.x, M.y); p.lineTo(B1.x, B1.y); p.moveTo(M.x, M.y); p.lineTo(P2(rm - gh, a).x, P2(rm - gh, a).y); }
        else if (g.kind === 2) { p.moveTo(A0.x, A0.y); p.lineTo(B1.x, B1.y); p.moveTo(A1.x, A1.y); p.lineTo(B0.x, B0.y); }
        else { p.moveTo(A0.x, A0.y); p.lineTo(A1.x, A1.y); p.moveTo(B0.x, B0.y); p.lineTo(B1.x, B1.y); }
      }
      // Engraved first (dark groove), then the light inside it.
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(8,4,6,0.85)'; ctx.lineWidth = K.lw(0.075, 2); ctx.stroke(p);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${C.rune},${0.1 * pulse})`; ctx.lineWidth = K.lw(0.2, 4); ctx.stroke(p);
      ctx.strokeStyle = `rgba(${C.rune},${0.3 * pulse})`; ctx.lineWidth = K.lw(0.045, 1.5); ctx.stroke(p);
      ctx.strokeStyle = `rgba(${C.runeCore},${0.32 * pulse})`; ctx.lineWidth = K.lw(0.014, 0.8); ctx.stroke(p);
      ctx.restore();
      void sc;
    }
    // The stair up to the light, and the light itself.
    function stair() {
      const S = STAIR, n = S.n, sc = V.cam.sc;
      const stepL = (S.y0 - S.y1) / n;
      // Each step is a block from its front edge to the back, stacked.
      for (let i = 0; i < n; i++) {
        const yf = S.y0 - i * stepL;
        K.box(S.x, (yf + S.y1) / 2, S.w * (1 - i * 0.05), (yf - S.y1) / 2, 0, i * S.h, (i + 1) * S.h,
          { lit: '#4a4044', shade: '#211b1e', top: i === n - 1 ? '#8a7c7c' : '#5a4f53', rim: '#f6e6dc' });
      }
      void sc;
    }
    function lightColumn() {
      const W = V.W, H = V.H, sc = V.cam.sc;
      const S = STAIR, top = S.n * S.h;
      const b = P(S.x, S.y1 + 0.3, top), hi = P(RIFT.x, RIFT.y, RIFT.z);
      const t = V.time, flick = 0.9 + 0.1 * Math.sin(t * 7) * Math.sin(t * 2.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      // Ground splash.
      for (const [r, a] of [[2.6, 0.12], [1.5, 0.2], [0.8, 0.35]]) {
        ctx.fillStyle = `rgba(255,224,214,${a * flick})`;
        ctx.beginPath(); ctx.ellipse(b.x, b.y, r * sc, r * sc * V.cam.pitch, 0, 0, TAU); ctx.fill();
      }
      // Column: three nested tapers.
      const dx = hi.x - b.x, dy = hi.y - b.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      const ext = Math.max(W, H) * 2 / l;
      const ex = b.x + dx * ext, ey = b.y + dy * ext;
      for (const [w0, w1, col] of [[1.5, 4.5, `rgba(255,150,140,${0.14 * flick})`], [0.75, 2.2, `rgba(255,226,214,${0.28 * flick})`], [0.28, 0.8, `rgba(255,252,248,${0.85 * flick})`]]) {
        const a = w0 * sc, c = w1 * sc;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(b.x + nx * a, b.y + ny * a * 0.5); ctx.lineTo(ex + nx * c, ey + ny * c); ctx.lineTo(ex - nx * c, ey - ny * c); ctx.lineTo(b.x - nx * a, b.y - ny * a * 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // A starburst where it touches the stair.
      const r = sc * (0.9 + 0.1 * Math.sin(t * 3));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, rr = i % 2 ? r * 0.12 : i % 4 === 0 ? r * 1.4 : r * 0.7; i ? ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr * 0.7) : ctx.moveTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr * 0.7); }
      ctx.closePath(); ctx.fill();
    }

    // Debris below the platform's level is part of the backdrop: behind
    // the platform on the far side, in front of the tower wall on the near.
    function lowDebris(near) {
      for (const db of debris) if (db.z < 0 && (K.depth(db.x, db.y) > 0) === near) drawDebris(db);
    }
    function pier() {
      // The stair runs out past the edge on a pier of masonry.
      const S = STAIR, yb = -A.ry * EDGE;
      K.box(S.x, (yb + S.y1 - 0.2) / 2, S.w + 0.15, (yb - S.y1 + 0.2) / 2, 0, -16, 0, { lit: C.cliffLit, shade: C.cliffShade, top: C.lip });
    }
    const drumPal = { base: C.stone.base, mid: C.stone.base, lit: C.stone.lit, rim: C.stone.rim };
    function drawBackdrop() {
      sky();
      drawClouds(false);
      lowDebris(false);
      pier();
      const top = cliff();
      drawClouds(true);
      lowDebris(true);
      floor(top);
      // drums lying outside the ring
      for (const d of drums) K.drawRock(d.x, d.y, d.r * 1.1, drumShape, drumPal, 0.55, 0.7);
      stair();
      lightColumn();
    }
    const drumShape = K.rockShape(Sim.makeRng(77), 10);

    function drawPillar(o, s) {
      const pl = pillar.get(o), sc = V.cam.sc;
      const p = P(o.x, o.y, 0);
      if (K.off(p, sc * 5)) return;
      const fade = K.behind(s, p, o.r * sc * 1.6, pl.h * sc * 0.95) ? 0.4 : 1;
      ctx.globalAlpha = fade;
      // Plinth (the full collision footprint), then the shaft.
      K.cyl(o.x, o.y, o.r, 0, 0.32, { base: '#3a3236', shade: '#1d181b', lit: '#544a4e', rim: C.stone.rim, top: '#4e4448' });
      const r = o.r * 0.78;
      const g = K.cyl(o.x, o.y, r, 0.32, pl.h, C.stone, pl.jag, {
        flutes: true,
        inside: (b, t, rx) => {
          // a long crack down the shaft
          ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1);
          ctx.beginPath();
          let x = b.x + rx * (pl.cr[0] - 0.3), y = t.y + (b.y - t.y) * 0.15;
          ctx.moveTo(x, y);
          for (let i = 0; i < 4; i++) { x += rx * (pl.cr[(i + 1) % 3] - 0.5) * 0.6; y += (b.y - t.y) * 0.16; ctx.lineTo(x, y); }
          ctx.stroke();
        },
        topInside: (t, rx, ry) => {
          // fracture: rough inner shading
          ctx.fillStyle = 'rgba(30,24,27,0.55)';
          ctx.beginPath(); ctx.ellipse(t.x + rx * 0.25, t.y + ry * 0.35, rx * 0.8, ry * 0.7, 0, 0, TAU); ctx.fill();
        },
      });
      // A band of glyphs cut into the shaft, glowing faintly.
      const bz = P(o.x, o.y, pl.band), pulse = 0.65 + 0.35 * Math.sin(V.time * 1.4 + o.x);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(${C.rune},${0.6 * pulse * fade})`; ctx.lineWidth = K.lw(0.035, 1.2);
      ctx.beginPath(); ctx.ellipse(bz.x, bz.y, g.rx * 0.99, g.ry * 0.99, 0, 0.15, Math.PI - 0.15); ctx.stroke();
      ctx.strokeStyle = `rgba(${C.runeCore},${0.5 * pulse * fade})`; ctx.lineWidth = K.lw(0.012, 0.8);
      ctx.beginPath();
      for (let i = 1; i < 7; i++) {
        const f = (i / 7) * Math.PI, x = bz.x + Math.cos(f) * g.rx, y = bz.y + Math.sin(f) * g.ry;
        ctx.moveTo(x, y - sc * 0.08); ctx.lineTo(x + sc * 0.03, y + sc * 0.06);
      }
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawDebris(d) {
      const sc = V.cam.sc, t = V.time;
      const z = d.z + Math.sin(t * 0.7 + d.ph) * 0.18, rot = d.rot + Math.sin(t * 0.3 + d.ph) * 0.15;
      const p = P(d.x, d.y, z), r = d.r * sc;
      if (K.off(p, r * 2)) return;
      const c = Math.cos(rot), s = Math.sin(rot);
      const pts = d.pts.map(([x, y]) => ({ x: p.x + (x * c - y * s) * r, y: p.y + (x * s + y * c) * r }));
      // shadow-side fill, lit upper half, ink.
      K.path(pts); ctx.fillStyle = C.shard.base; ctx.fill();
      ctx.save(); K.path(pts); ctx.clip();
      ctx.fillStyle = C.shard.lit; ctx.beginPath(); ctx.ellipse(p.x - r * 0.35, p.y - r * 0.45, r * 0.9, r * 0.55, -0.4, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); K.path(pts); ctx.stroke();
      if (d.rune) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(${C.rune},0.7)`; ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.beginPath(); ctx.moveTo(p.x - r * 0.4, p.y); ctx.lineTo(p.x + r * 0.1, p.y - r * 0.2); ctx.lineTo(p.x + r * 0.35, p.y + r * 0.15); ctx.stroke();
        ctx.restore();
      }
      // a thin dust trail falling off it
      ctx.strokeStyle = 'rgba(30,14,18,0.5)'; ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath(); ctx.moveTo(p.x, p.y + r * 0.6); ctx.lineTo(p.x + r * 0.2, p.y + r * 2.4); ctx.stroke();
    }

    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'pillar') out.push({ d, f: () => drawPillar(o, s) });
        else out.push({ d, f: () => K.drawRock(o.x, o.y, o.r, rockSh.get(o), C.shard, 0.5, 0.95) });
      }
      for (const db of debris) if (db.z >= 0) out.push({ d: P(db.x, db.y, 0).d, f: () => drawDebris(db) });
      return out;
    }

    // ---- atmosphere: god rays from the rift, ash and light motes.
    const overlay = K.overlay({ vig: [0.34, 0.78], vigCol: '14,4,6', toneCol: 'rgba(14,6,8,0.4)' });
    const motes = K.motes(46, 77, (r) => (r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2));
    function drawAtmosphere() {
      const W = V.W, H = V.H, t = V.time, sc = V.cam.sc;
      const hi = P(RIFT.x, RIFT.y, RIFT.z);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const a = Math.PI / 2 + (i - 4) * 0.13 + Math.sin(t * 0.15 + i) * 0.02;
        const len = Math.hypot(W, H) * 1.3, wd = 0.02 + (i % 3) * 0.012;
        const al = 0.035 + 0.02 * Math.sin(t * 0.5 + i * 1.7);
        const g = ctx.createLinearGradient(hi.x, hi.y, hi.x + Math.cos(a) * len, hi.y + Math.sin(a) * len);
        g.addColorStop(0, `rgba(255,210,200,${al * 2})`); g.addColorStop(1, 'rgba(255,210,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(hi.x, hi.y); ctx.lineTo(hi.x + Math.cos(a - wd) * len, hi.y + Math.sin(a - wd) * len); ctx.lineTo(hi.x + Math.cos(a + wd) * len, hi.y + Math.sin(a + wd) * len); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      overlay.draw();
      K.drawMotes(motes, ['rgba(20,8,12,0.7)', 'rgba(255,120,120,0.55)', 'rgba(255,236,226,0.6)']);
      void sc;
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ hill
  // Chapter Five: the overgrown path up to the quarry in the late-day sun.
  // Rocky dirt path, dry scrub, boulders, dead trees; the quarry's cut face
  // and a timber hoist on the uphill (north) side.
  function hill(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(53);
    const C = {
      bg: '#221e1b', ground: '#332e2a', lit: '#4c4439', pool: '#62574a', patch: '#2d2926',
      dirt: '#6a5b4a', dirtLit: '#85735d', rut: '#463c32', pebble: '#2a2520', pebbleLit: '#a19583',
      grass: { ink: '#1d1b15', lit: '#7a7352', tip: '#d2bf92' },
      grass2: { ink: '#22201a', lit: '#5d5a40', tip: '#b8a67c' },
      rock: { base: '#463f3a', mid: '#655b53', lit: '#958878', rim: '#efd6bf' },
      wood: '#2a221e', woodLit: '#5a4a3f', rim: '#e8cdb6',
      face: '#3f3832', faceLit: '#4d453d', faceShade: '#2c2723', ledge: '#8c7f6b', topGround: '#4a4136', topEdge: '#a39478',
      block: { lit: '#8a7f70', shade: '#4d453d', top: '#9a8e7c', rim: '#f2dcc4' },
      shadowA: 'rgba(12,10,16,0.45)',
    };
    // The path from the west up to the quarry in the north-east.
    const PATH = [[-15, 1.8, 2.8], [-10, 1.1, 2.5], [-6, 0.6, 2.4], [-2, 0.0, 2.3], [2, -0.8, 2.2], [6, -1.7, 2.1], [9.5, -2.5, 2.0], [12.5, -3.4, 1.9], [16, -5.0, 1.8], [20, -7.6, 1.7]];
    const pathL = [], pathR = [], pathC = [], flecks = [], stones = [];
    {
      const pts = [];
      for (let i = 0; i < PATH.length - 1; i++) for (let k = 0; k < 4; k++) {
        const f = k / 4, a = PATH[i], b = PATH[i + 1];
        pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
      }
      pts.push(PATH[PATH.length - 1]);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty), nx = -ty / l, ny = tx / l, w = pts[i][2] / 2;
        const jl = 1 + (R() - 0.5) * 0.35, jr = 1 + (R() - 0.5) * 0.35;
        pathL.push([pts[i][0] + nx * w * jl, pts[i][1] + ny * w * jl]);
        pathR.push([pts[i][0] - nx * w * jr, pts[i][1] - ny * w * jr]);
        pathC.push([pts[i][0], pts[i][1], nx, ny, w]);
      }
      for (let i = 0; i < 60; i++) {
        const c = pathC[Math.floor(R() * pathC.length)], o = (R() - 0.5) * 1.7;
        flecks.push({ x: c[0] + c[2] * c[4] * o + (R() - 0.5) * 0.8, y: c[1] + c[3] * c[4] * o + (R() - 0.5) * 0.8, r: 0.06 + R() * 0.16, lit: R() < 0.55 });
      }
      for (let i = 0; i < 26; i++) {
        const c = pathC[Math.floor(R() * pathC.length)], o = (R() - 0.5) * 1.6;
        const x = c[0] + c[2] * c[4] * o, y = c[1] + c[3] * c[4] * o;
        if (K.inObstacle(x, y, 0.2)) continue;
        stones.push({ x, y, r: 0.1 + R() * 0.14, sh: K.rockShape(R, 6) });
      }
    }
    function nearPath(x, y, m) {
      for (let i = 0; i < PATH.length - 1; i++) {
        const [ax, ay] = PATH[i], [bx, by] = PATH[i + 1], dx = bx - ax, dy = by - ay;
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
        if (Math.hypot(x - ax - dx * t, y - ay - dy * t) < m) return true;
      }
      return false;
    }
    // The quarry face: two benches cut into the hill along the north.
    const QN = 40, QX0 = -22, QX1 = 22;
    const quarry = [];
    for (let i = 0; i <= QN; i++) {
      const x = QX0 + ((QX1 - QX0) * i) / QN;
      const y = -A.ry * 1.22 - 0.014 * x * x + (R() - 0.5) * 0.25;
      quarry.push({ x, y, h1: 1.6 + R() * 0.35, h2: 3.4 + R() * 0.6, set: 0.9 + R() * 0.25, crack: R(), tone: R() });
    }
    // Rubble heaps at the foot of the face.
    const rubble = [];
    for (let i = 0; i < 30; i++) {
      const q = quarry[2 + Math.floor(R() * (QN - 4))];
      rubble.push({ x: q.x + (R() - 0.5) * 1.2, y: q.y + 0.3 + R() * 0.9, r: 0.12 + R() * 0.32, sh: K.rockShape(R, 6) });
    }
    // Cut blocks stacked by the path near the top.
    const blocks = [
      { x: 13.4, y: -5.8, hw: 0.7, hd: 0.45, rot: 0.25, z0: 0, z1: 0.75 },
      { x: 14.6, y: -5.2, hw: 0.6, hd: 0.45, rot: 0.1, z0: 0, z1: 0.75 },
      { x: 13.9, y: -5.5, hw: 0.55, hd: 0.4, rot: 0.4, z0: 0.75, z1: 1.4 },
      { x: 9.2, y: -6.6, hw: 0.55, hd: 0.5, rot: -0.3, z0: 0, z1: 0.7 },
    ];
    // Timber hoist on the quarry top.
    const HOIST = { x: 6.5, y: -11.6, z: 3.8 };
    // Dead trees: branching skeletons in metres relative to the base.
    function makeDeadTree(r, h) {
      const segs = [];
      function grow(x, y, z, a, el, len, w, depth) {
        const x1 = x + Math.cos(a) * Math.cos(el) * len, y1 = y + Math.sin(a) * Math.cos(el) * len, z1 = z + Math.sin(el) * len;
        segs.push([x, y, z, x1, y1, z1, w, w * 0.62]);
        if (depth <= 0) return;
        const n = depth > 2 ? 2 : 2 + (r() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const da = (i - (n - 1) / 2) * (0.9 + r() * 0.6) + (r() - 0.5) * 0.5;
          grow(x1, y1, z1, a + da, Math.max(0.15, el - 0.25 - r() * 0.35), len * (0.62 + r() * 0.15), w * 0.62, depth - 1);
        }
      }
      // trunk with a lean, then branches
      const lean = r() * TAU;
      grow(0, 0, 0, lean, 1.42, h * 0.5, 0.26, 0);
      const t = segs[0];
      grow(t[3], t[4], t[5], lean + 2.4, 1.0, h * 0.32, 0.17, 3);
      grow(t[3], t[4], t[5], lean - 0.8, 1.1, h * 0.36, 0.18, 3);
      grow(t[3], t[4], t[5], lean + 0.6, 1.35, h * 0.3, 0.15, 2);
      return segs;
    }
    const trees = [];
    for (const o of A.obstacles) if (o.kind === 'tree') trees.push({ x: o.x, y: o.y, w: o.r / 0.26 * 0.9, segs: makeDeadTree(R, 4.2), obstacle: true });
    for (const [x, y] of [[-12.5, -3.4], [-11.8, 4.4], [9.4, 4.9], [12.8, 1.8], [-4.5, -8.6], [2.5, -8.2]]) trees.push({ x, y, w: 0.8 + R() * 0.3, segs: makeDeadTree(R, 3.4 + R() * 1.4) });
    // Ground: sunlit and shaded patches, contour hatching, tufts, shrubs.
    const wob = [], wob2 = [];
    for (let i = 0; i < 48; i++) { wob.push(R()); wob2.push(R()); }
    const patches = [];
    for (let i = 0; i < 12; i++) {
      const a = R() * TAU, k = 0.2 + R() * 0.9, r = 0.8 + R() * 1.6, pts = [];
      for (let j = 0; j < 9; j++) pts.push([Math.cos((j / 9) * TAU) * r * (0.7 + R() * 0.45), Math.sin((j / 9) * TAU) * r * (0.45 + R() * 0.3)]);
      patches.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, pts });
    }
    const contours = [];
    for (let i = 0; i < 16; i++) {
      const y0 = -A.ry * 1.05 + (i % 4) * 0.5 + (R() - 0.5), x0 = -16 + R() * 26, len = 2 + R() * 4;
      contours.push([x0, y0 + (i > 7 ? A.ry * 2.1 : 0), len, R()]);
    }
    const tuftSp = [];
    for (let i = 0; i < 8; i++) tuftSp.push(K.tuft(601 + i * 7, i % 2 ? C.grass : C.grass2, i < 5, i < 3));
    const tufts = [];
    for (let i = 0; i < 700 && tufts.length < 190; i++) {
      const x = (R() - 0.5) * 34, y = (R() - 0.5) * 22;
      const e = (x / A.rx) ** 2 + (y / A.ry) ** 2;
      if (e < 0.35 && R() < 0.8) continue;
      if (nearPath(x, y, 1.0) || K.inObstacle(x, y, 0.15)) continue;
      if (y < -A.ry * 1.18 - 0.014 * x * x) continue;
      tufts.push({ x, y, s: 0.5 + R() * 0.8, v: tufts.length % 8 });
    }
    // Shrubs: twiggy dry bushes, sprite per variant.
    function makeShrub(seed) {
      const r = Sim.makeRng(seed), S = 90;
      const cv = K.canvas(S * 2.4, S * 1.5), c = cv.getContext('2d');
      const bx = cv.width / 2, by = cv.height - 4;
      c.lineCap = 'round';
      const tw = [];
      for (let i = 0; i < 14; i++) {
        const a = -Math.PI * (0.1 + 0.8 * (i / 13)) + (r() - 0.5) * 0.3, l = S * (0.6 + r() * 0.6);
        tw.push([bx + (r() - 0.5) * S * 0.3, by, bx + Math.cos(a) * l, by + Math.sin(a) * l * 0.95]);
      }
      for (const [w, col] of [[S * 0.07, INK], [S * 0.035, '#4b3f35']]) {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath();
        for (const [x0, y0, x1, y1] of tw) { c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + (x1 - x0) * 0.1, (y0 + y1) / 2 + S * 0.1, x1, y1); }
        c.stroke();
      }
      // a few dry leaf clusters
      for (const [, , x1, y1] of tw) {
        if (r() < 0.5) continue;
        c.fillStyle = INK; c.beginPath(); c.ellipse(x1, y1, S * 0.12, S * 0.07, r(), 0, TAU); c.fill();
        c.fillStyle = r() < 0.5 ? '#6d6446' : '#4d4733'; c.beginPath(); c.ellipse(x1, y1, S * 0.09, S * 0.045, r(), 0, TAU); c.fill();
      }
      return { cv, ax: bx, ay: by, G: S };
    }
    const shrubSp = [makeShrub(701), makeShrub(719), makeShrub(733)];
    const shrubs = [];
    for (let i = 0; i < 80 && shrubs.length < 22; i++) {
      const a = R() * TAU, k = 0.95 + R() * 0.5;
      const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (nearPath(x, y, 1.4) || K.inObstacle(x, y, 0.4)) continue;
      shrubs.push({ x, y, s: 0.7 + R() * 0.6, v: shrubs.length % 3 });
    }
    const rockSh = new Map();
    for (const o of A.obstacles) if (o.kind === 'rock') rockSh.set(o, K.rockShape(R, 9));

    // ---- drawing
    function ground() {
      const W = V.W, H = V.H, sc = V.cam.sc;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.beginPath(); K.poly(K.ring(1.7, 48, wob, 0.12, 0, 0)); ctx.fillStyle = C.ground; ctx.fill();
      ctx.beginPath(); K.poly(K.ring(1.02, 48, wob2, 0.12, -0.6, -0.4)); ctx.fillStyle = C.lit; ctx.fill();
      ctx.beginPath(); K.poly(K.ring(0.55, 48, wob, 0.2, -2.4, -1.2)); ctx.fillStyle = C.pool; ctx.fill();
      ctx.fillStyle = C.patch; ctx.beginPath();
      for (const pt of patches) K.poly(pt.pts.map(([x, y]) => P(pt.x + x, pt.y + y, 0)));
      ctx.fill();
      // Downhill contour hatching.
      ctx.strokeStyle = 'rgba(16,13,10,0.45)'; ctx.lineWidth = K.lw(0.025, 0.8); ctx.lineCap = 'round';
      ctx.beginPath();
      for (const [x0, y0, len, b] of contours) {
        for (let k = 0; k < 3; k++) {
          const a = P(x0, y0 + k * 0.22, 0), m = P(x0 + len * 0.5, y0 + k * 0.22 + 0.25 * (b - 0.5), 0), e = P(x0 + len * (0.8 + 0.2 * b) - k * 0.4, y0 + k * 0.22, 0);
          ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y, e.x, e.y);
        }
      }
      ctx.stroke();
      void sc;
    }
    function path() {
      const sc = V.cam.sc;
      const L = pathL.map(([x, y]) => P(x, y, 0)), Rr = pathR.map(([x, y]) => P(x, y, 0));
      ctx.beginPath(); K.poly(L.concat(Rr.slice().reverse())); ctx.fillStyle = C.dirt; ctx.fill();
      // A lit band down the middle.
      const M = pathC.map(([x, y, nx, ny, w]) => P(x + nx * w * 0.35, y + ny * w * 0.35, 0)), M2 = pathC.map(([x, y, nx, ny, w]) => P(x - nx * w * 0.15, y - ny * w * 0.15, 0));
      ctx.beginPath(); K.poly(M.concat(M2.slice().reverse())); ctx.fillStyle = C.dirtLit; ctx.fill();
      const lit = new Path2D(), dark = new Path2D();
      for (const f of flecks) {
        const p = P(f.x, f.y, 0), r = f.r * sc;
        if (K.off(p, 8)) continue;
        const pa = f.lit ? lit : dark;
        pa.moveTo(p.x + r, p.y); pa.ellipse(p.x, p.y, r, r * 0.45, 0, 0, TAU);
      }
      ctx.fillStyle = C.dirtLit; ctx.fill(lit);
      ctx.fillStyle = C.rut; ctx.fill(dark);
      // Worn ruts.
      ctx.strokeStyle = C.rut; ctx.lineWidth = K.lw(0.05); ctx.lineCap = 'round';
      ctx.setLineDash([sc * 0.7, sc * 0.35]);
      for (const side of [-0.4, 0.38]) {
        ctx.beginPath();
        pathC.forEach(([x, y, nx, ny, w], i) => { const p = P(x + nx * w * side, y + ny * w * side, 0); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.035, 1); ctx.lineJoin = 'round';
      ctx.beginPath();
      for (const side of [L, Rr]) for (let i = 0; i < side.length - 1; i++) {
        const p = side[i], q = side[i + 1];
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (q.x - p.x) * 0.55, p.y + (q.y - p.y) * 0.55);
      }
      ctx.stroke();
      for (const st of stones) K.drawRock(st.x, st.y, st.r, st.sh, C.rock, 0.3, 0.7);
    }
    // The quarry face, drawn as a strip of quads from the back.
    function quarryFace() {
      const sc = V.cam.sc;
      const fk = quarry.map((q) => K.tall(q.x, q.y));
      const low = quarry.map((q, i) => P(q.x, q.y, 0)), mid = quarry.map((q, i) => P(q.x, q.y, q.h1 * fk[i]));
      const ledge = quarry.map((q, i) => P(q.x, q.y - q.set, q.h1 * fk[i])), top = quarry.map((q, i) => P(q.x, q.y - q.set, q.h2 * fk[i]));
      const back = quarry.map((q, i) => P(q.x, q.y - q.set - 30, q.h2 * fk[i]));
      // ground above the quarry
      ctx.beginPath(); K.poly(top.concat(back.slice().reverse())); ctx.fillStyle = C.topGround; ctx.fill();
      ctx.beginPath(); K.poly(top.concat(quarry.map((q, i) => P(q.x, q.y - q.set - 1.4, q.h2 * fk[i])).reverse())); ctx.fillStyle = C.topEdge; ctx.fill();
      const strip = (a, b, col) => {
        for (let i = 0; i < QN; i++) {
          ctx.beginPath(); ctx.moveTo(a[i].x, a[i].y); ctx.lineTo(a[i + 1].x, a[i + 1].y); ctx.lineTo(b[i + 1].x, b[i + 1].y); ctx.lineTo(b[i].x, b[i].y); ctx.closePath();
          ctx.fillStyle = typeof col === 'function' ? col(i) : col; ctx.fill();
          ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
        }
      };
      // upper face, ledge, lower face (back to front)
      // The faces look away from the sun (backlit); the benches face up and catch it.
      const tone = (i, o) => { const t = quarry[(i + o) % QN].tone; return t < 0.2 ? C.faceShade : t > 0.72 ? C.faceLit : C.face; };
      strip(ledge, top, (i) => tone(i, 3));
      strip(mid, ledge, C.ledge);
      strip(low, mid, (i) => tone(i, 0));
      // Chisel marks, strata, block seams.
      ctx.strokeStyle = 'rgba(14,10,8,0.6)'; ctx.lineWidth = K.lw(0.02, 0.8); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < QN; i++) {
        for (const [A0, B0] of [[low, mid], [ledge, top]]) {
          for (const f of [0.33, 0.66]) {
            ctx.moveTo(A0[i].x + (B0[i].x - A0[i].x) * f, A0[i].y + (B0[i].y - A0[i].y) * f);
            ctx.lineTo(A0[i + 1].x + (B0[i + 1].x - A0[i + 1].x) * f, A0[i + 1].y + (B0[i + 1].y - A0[i + 1].y) * f);
          }
          if (i % 2 === 0) {
            const f0 = quarry[i].crack * 0.3;
            ctx.moveTo(A0[i].x + (B0[i].x - A0[i].x) * f0, A0[i].y + (B0[i].y - A0[i].y) * f0); ctx.lineTo(B0[i].x, B0[i].y);
          }
        }
      }
      ctx.stroke();
      // Ink: top edges heavy, bench edges.
      ctx.strokeStyle = INK; ctx.lineJoin = 'round';
      for (const [row, w] of [[top, 0.05], [mid, 0.04], [ledge, 0.025], [low, 0.03]]) {
        ctx.lineWidth = K.lw(w, 1.2);
        ctx.beginPath(); row.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      // Bone rim along the sunlit edges of both benches.
      ctx.strokeStyle = C.rim; ctx.globalAlpha = 0.75; ctx.lineWidth = K.lw(0.03, 1.2);
      for (const row of [mid, top]) { ctx.beginPath(); row.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + 1.5) : ctx.moveTo(p.x, p.y + 1.5))); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // Grass hanging over the top edge.
      ctx.fillStyle = '#25221b';
      ctx.beginPath();
      for (let i = 0; i < QN; i++) {
        const a = top[i], b = top[i + 1], n = 3;
        for (let k = 0; k < n; k++) {
          const f = (k + 0.5) / n, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, l = V.cam.sc * (0.15 + ((i * 7 + k * 3) % 5) * 0.05);
          ctx.moveTo(x - l * 0.3, y - 1); ctx.lineTo(x + l * 0.1, y + l); ctx.lineTo(x + l * 0.35, y - 1);
        }
      }
      ctx.fill();
      // Rubble at the foot.
      for (const r of rubble) K.drawRock(r.x, r.y, r.r, r.sh, C.rock, 0.35, 0.75);
      hoist();
      void sc;
    }
    function hoist() {
      const H0 = HOIST, sc = V.cam.sc;
      const q = quarry.reduce((a, b) => (Math.abs(b.x - H0.x) < Math.abs(a.x - H0.x) ? b : a));
      const z0 = q.h2 * K.tall(q.x, q.y);
      if (z0 < 1.5) return;
      const feet = [[H0.x - 1.2, H0.y + 0.4], [H0.x + 1.1, H0.y + 0.5], [H0.x, H0.y - 1.2]].map(([x, y]) => P(x, y, z0));
      const apex = P(H0.x, H0.y + 1.2, z0 + 3.4);
      const hook = P(H0.x, H0.y + 1.2, z0 + 1.2);
      ctx.lineCap = 'round';
      for (const [w, col] of [[0.16, INK], [0.09, C.woodLit]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 1.5);
        ctx.beginPath(); for (const f of feet) { ctx.moveTo(f.x, f.y); ctx.lineTo(apex.x, apex.y); } ctx.stroke();
      }
      ctx.strokeStyle = '#1a1512'; ctx.lineWidth = K.lw(0.02, 1);
      ctx.beginPath(); ctx.moveTo(apex.x, apex.y); ctx.lineTo(hook.x, hook.y); ctx.stroke();
      // hanging block
      const bw = sc * 0.35;
      ctx.fillStyle = INK; ctx.fillRect(hook.x - bw - 2, hook.y - 2, bw * 2 + 4, bw * 1.2 + 4);
      ctx.fillStyle = C.block.lit; ctx.fillRect(hook.x - bw, hook.y, bw * 2, bw * 1.2);
      ctx.fillStyle = C.block.shade; ctx.fillRect(hook.x + bw * 0.2, hook.y, bw * 0.8, bw * 1.2);
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        if (o.kind !== 'rock') continue;
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.r * 1.1);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.1, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.1, o.r * sc * V.cam.pitch * 0.95, 0, 0, TAU);
      }
      for (const t of trees) {
        const b = P(t.x, t.y, 0), off = K.shadowOff(3.6);
        ctx.moveTo(b.x, b.y);
        // branch shadows as thin strokes are costly; one tapered streak instead
        const l = Math.hypot(off.x, off.y) || 1, nx = -off.y / l, ny = off.x / l, w = sc * 0.12 * t.w;
        ctx.moveTo(b.x + nx * w, b.y + ny * w); ctx.lineTo(b.x + off.x, b.y + off.y); ctx.lineTo(b.x - nx * w, b.y - ny * w); ctx.closePath();
      }
      for (const bl of blocks) if (bl.z0 === 0) {
        const b = P(bl.x, bl.y, 0), off = K.shadowOff(0.9);
        ctx.moveTo(b.x + off.x * 0.4 + sc * bl.hw * 1.2, b.y + off.y * 0.4);
        ctx.ellipse(b.x + off.x * 0.4, b.y + off.y * 0.4, sc * bl.hw * 1.2, sc * bl.hw * V.cam.pitch, 0, 0, TAU);
      }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() {
      ground();
      path();
      quarryFace();
      shadows();
      K.drawSprites(tufts, tuftSp, 0.3);
    }

    function drawDeadTree(t, s) {
      const sc = V.cam.sc, b = P(t.x, t.y, 0);
      if (K.off(b, sc * 5)) return;
      const near = !t.obstacle && K.depth(t.x, t.y) > 0;
      if (near) { // trees on the camera side become low scrub
        const sp = shrubSp[(Math.round(t.x) & 1) + 1], k = (1.3 * sc * 0.6) / sp.G;
        ctx.drawImage(sp.cv, b.x - sp.ax * k, b.y - sp.ay * k, sp.cv.width * k, sp.cv.height * k);
        return;
      }
      const fade = K.behind(s, b, sc * 1.6, sc * 3.6) ? 0.4 : 1;
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const segs = t.segs.map(([x0, y0, z0, x1, y1, z1, w0, w1]) => [P(t.x + x0, t.y + y0, z0), P(t.x + x1, t.y + y1, z1), w0 * t.w * sc, w1 * t.w * sc]);
      const quad = (a, c, w0, w1, grow) => {
        const dx = c.x - a.x, dy = c.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
        ctx.moveTo(a.x + nx * (w0 + grow), a.y + ny * (w0 + grow)); ctx.lineTo(c.x + nx * (w1 + grow), c.y + ny * (w1 + grow));
        ctx.lineTo(c.x - nx * (w1 + grow), c.y - ny * (w1 + grow)); ctx.lineTo(a.x - nx * (w0 + grow), a.y - ny * (w0 + grow)); ctx.closePath();
      };
      ctx.beginPath(); for (const [a, c, w0, w1] of segs) quad(a, c, w0 / 2, w1 / 2, 1.6); ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); for (const [a, c, w0, w1] of segs) quad(a, c, w0 / 2, w1 / 2, 0); ctx.fillStyle = C.wood; ctx.fill();
      // lit edge on each limb (toward the upper left)
      ctx.strokeStyle = C.woodLit; ctx.beginPath();
      for (const [a, c, w0] of segs) { const o = w0 * 0.22; ctx.moveTo(a.x - o, a.y - o * 0.3); ctx.lineTo(c.x - o * 0.6, c.y - o * 0.2); }
      ctx.lineWidth = Math.max(1, sc * 0.03 * t.w); ctx.stroke();
      ctx.strokeStyle = C.rim; ctx.globalAlpha = fade * 0.55; ctx.lineWidth = Math.max(0.8, sc * 0.012);
      ctx.beginPath(); { const [a, c, w0] = segs[0]; ctx.moveTo(a.x - w0 * 0.45, a.y); ctx.lineTo(c.x - w0 * 0.3, c.y); } ctx.stroke();
      // root flare
      ctx.globalAlpha = fade;
      const w = segs[0][2];
      ctx.fillStyle = C.wood; ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2);
      ctx.beginPath(); ctx.moveTo(b.x - w * 1.3, b.y + w * 0.15); ctx.quadraticCurveTo(b.x - w * 0.4, b.y - w * 0.3, b.x - w * 0.45, b.y - w * 1.2);
      ctx.lineTo(b.x + w * 0.45, b.y - w * 1.2); ctx.quadraticCurveTo(b.x + w * 0.4, b.y - w * 0.3, b.x + w * 1.35, b.y + w * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const blockPal = C.block;
    function drawBlock(bl) {
      if (K.off(P(bl.x, bl.y, 0), V.cam.sc * 3)) return;
      K.box(bl.x, bl.y, bl.hw, bl.hd, bl.rot, bl.z0, bl.z1, blockPal, (face, pts) => {
        ctx.strokeStyle = 'rgba(20,14,10,0.5)'; ctx.lineWidth = K.lw(0.015, 0.8);
        ctx.beginPath();
        const [a, b, c, d] = pts;
        for (const f of [0.3, 0.55, 0.8]) { ctx.moveTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); ctx.lineTo(d.x + (c.x - d.x) * (f - 0.08), d.y + (c.y - d.y) * (f - 0.08)); }
        ctx.stroke();
      });
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) if (o.kind === 'rock') out.push({ d: P(o.x, o.y, 0).d, f: () => K.drawRock(o.x, o.y, o.r, rockSh.get(o), C.rock, 0.5, 0.95) });
      for (const t of trees) out.push({ d: P(t.x, t.y, 0).d, f: () => drawDeadTree(t, s) });
      for (const sh of shrubs) out.push({ d: P(sh.x, sh.y, 0).d, f: () => K.drawSprites([sh], shrubSp, 0.55) });
      for (const bl of blocks) out.push({ d: P(bl.x, bl.y, 0).d + bl.z0 * 0.01, f: () => drawBlock(bl) });
      return out;
    }
    // ---- atmosphere: warm late sun, dust.
    const overlay = K.overlay({
      vig: [0.26, 0.66], vigCol: '12,8,6',
      paint(c, W, H) {
        const lx = -Math.cos(V.light.ang), ly = -Math.sin(V.light.ang);
        for (const [o, wd, a] of [[-0.15, 0.16, 0.05], [-0.1, 0.1, 0.035], [0.1, 0.07, 0.035], [0.26, 0.12, 0.03], [0.3, 0.07, 0.025]]) {
          const sx = W * (0.05 + o), sy = -H * 0.1, len = Math.hypot(W, H) * 1.1;
          const ex = sx + lx * len, ey = sy + ly * len, px = -ly * W * wd, py = lx * W * wd;
          const g = c.createLinearGradient(sx, sy, sx + lx * len * 0.8, sy + ly * len * 0.8);
          g.addColorStop(0, `rgba(255,214,170,${a})`); g.addColorStop(1, 'rgba(255,214,170,0)');
          c.fillStyle = g;
          c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + px * 0.4, sy + py * 0.4); c.lineTo(ex + px, ey + py); c.lineTo(ex - px * 0.3, ey - py * 0.3); c.closePath(); c.fill();
        }
        // warm haze at the top (uphill, into the sun)
        const g = c.createLinearGradient(0, 0, 0, H * 0.5);
        g.addColorStop(0, 'rgba(230,170,120,0.12)'); g.addColorStop(1, 'rgba(230,170,120,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H * 0.5);
      },
    });
    const motes = K.motes(30, 61, (r) => (r() < 0.5 ? 0 : 1));
    function drawAtmosphere() {
      overlay.draw();
      K.drawMotes(motes, ['rgba(240,214,180,0.4)', 'rgba(230,170,120,0.35)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ cave
  // Chapter Five: the chamber behind the quarry face. Rock walls ring it;
  // daylight spills in from the entrance in the east, torches line the walls,
  // the passage in the west goes deeper, a loading frame of beams stands
  // against the north wall (the ogre tears a beam from it), crates, a basin.
  function cave(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(37);
    const C = {
      bg: '#141110', bgLit: '#1d1816', floor: '#272220', floorLit: '#342d29', warm: '#45382e', warm2: '#56463a', day: '#4f4b48', day2: '#625d58',
      wall: '#221d1b', wallLit: '#3d332d', wallWarm: '#55443a', wallShade: '#141110', wallTop: '#0e0c0b', rim: '#f0b47a',
      rock: { base: '#2c2624', mid: '#433a35', lit: '#6b5c50', rim: '#f0c08e' },
      crate: { lit: '#7a5c40', shade: '#3e2d20', top: '#8f6d4c', rim: '#f6c995' },
      timber: '#4a3525', timberLit: '#7a5939', iron: '#2b2a2e', ironLit: '#8a8a92',
      stone: { base: '#3f3833', shade: '#221d1a', lit: '#5e544b', rim: '#f0c08e', top: '#6a5f55' },
      water: '#121a20', rail: '#55545a', sleeper: '#3b2b1f',
      shadowA: 'rgba(6,4,4,0.5)',
    };
    const WALL_K = 1.07, WALL_N = 72;
    const exitA = Math.atan2(A.exit.y / A.ry, A.exit.x / A.rx);
    const mouthA = 0; // daylight entrance, east
    const angDist = (a, b) => { let d = Math.abs(((a - b) % TAU + TAU) % TAU); return Math.min(d, TAU - d); };
    const wall = [];
    for (let i = 0; i < WALL_N; i++) {
      const a = (i / WALL_N) * TAU;
      const tunnel = angDist(a, exitA) < 0.2, mouth = angDist(a, mouthA) < 0.16;
      wall.push({ a, k: WALL_K + (R() - 0.5) * 0.03, kt: WALL_K + 0.1 + R() * 0.14, h: 3.4 + R() * 1.6, j: R(), tunnel, mouth });
    }
    const wpos = (w, k) => [Math.cos(w.a) * A.rx * k, Math.sin(w.a) * A.ry * k];
    // Torches on the wall (angles), lighting pools on the floor.
    const TORCH = [exitA - 0.32, exitA + 0.34, -2.05, -1.3, -0.55, 0.62].map((a) => ({ a, ph: R() * TAU }));
    // The loading frame against the north wall.
    const FRAME = { x0: -3.2, x1: 0.4, y: -A.ry * 0.985, h: 3.0 };
    // Rails from the entrance to the passage.
    const RAIL = [[A.rx * 1.2, 0.0], [4, -0.15], [0, -0.3], [-4, -0.45], [-A.rx * 1.15, A.exit.y]];
    // Floor dressing.
    const cracks = [];
    for (let i = 0; i < 18; i++) {
      const a = R() * TAU, k = 0.2 + R() * 0.8;
      cracks.push(crackLine(R, Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, 0.8 + R() * 2, R() * TAU));
    }
    const gravel = [];
    for (let i = 0; i < 90; i++) {
      const a = R() * TAU, k = Math.sqrt(R()) * 1.05;
      gravel.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, r: 0.03 + R() * 0.07 });
    }
    const puddles = [];
    for (let i = 0; i < 5; i++) {
      const a = R() * TAU, k = 0.3 + R() * 0.6;
      const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (K.inObstacle(x, y, 0.5) || Math.abs(y + 0.3) < 0.8) continue;
      puddles.push({ x, y, r: 0.4 + R() * 0.5 });
    }
    // Stalagmites and rubble along the wall foot.
    const stal = [];
    for (let i = 0; i < 26; i++) {
      const a = R() * TAU;
      if (angDist(a, exitA) < 0.3 || angDist(a, mouthA) < 0.3) continue;
      const k = 0.97 + R() * 0.06, x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (x > FRAME.x0 - 0.5 && x < FRAME.x1 + 0.5 && y < 0) continue;
      stal.push({ x, y, r: 0.12 + R() * 0.25, h: 0.4 + R() * 1.1, sh: K.rockShape(R, 6) });
    }
    const crate = new Map(), rockSh = new Map();
    for (const o of A.obstacles) {
      if (o.kind === 'crate') crate.set(o, { rot: R() * 1.5, stack: o.r > 0.52 });
      if (o.kind === 'rock') rockSh.set(o, K.rockShape(R, 9));
    }

    // ---- drawing
    function torchPos(t, z) {
      // on the wall face at height z (the wall leans out as it rises)
      const i = Math.round(((t.a % TAU + TAU) % TAU) / TAU * WALL_N) % WALL_N, w = wall[i];
      const h = w.h * K.tall(...wpos(w, w.k));
      const k = w.k + (w.kt - w.k) * Math.min(1, z / h) - 0.02;
      const [x, y] = [Math.cos(t.a) * A.rx * k, Math.sin(t.a) * A.ry * k];
      return { x, y, z: Math.min(z, h * 0.75), h };
    }
    function flick(t) { return 0.85 + 0.15 * Math.sin(V.time * 9 + t.ph) * Math.sin(V.time * 3.7 + t.ph * 2); }
    // Rock mass round the chamber: big flat facets with hatching.
    const facets = [];
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * TAU + R() * 0.1, k = 1.25 + R() * 0.9, r = 1.4 + R() * 2.2, pts = [];
      for (let j = 0; j < 6; j++) { const b = (j / 6) * TAU + R() * 0.5; pts.push([Math.cos(b) * r, Math.sin(b) * r * 0.7]); }
      facets.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, pts, lit: R() < 0.45 });
    }
    function floor() {
      const W = V.W, H = V.H, sc = V.cam.sc;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.bgLit; ctx.beginPath();
      for (const f of facets) if (f.lit) K.poly(f.pts.map(([x, y]) => P(f.x + x, f.y + y, 0)));
      ctx.fill();
      ctx.strokeStyle = 'rgba(4,3,3,0.6)'; ctx.lineWidth = K.lw(0.03, 1); ctx.beginPath();
      for (const f of facets) { const p = P(f.x, f.y, 0); if (K.off(p, sc * 3)) continue; for (let k = 0; k < 4; k++) { ctx.moveTo(p.x + k * sc * 0.16, p.y); ctx.lineTo(p.x + k * sc * 0.16 + sc * 0.3, p.y - sc * 0.26); } }
      ctx.stroke();
      ctx.beginPath(); K.poly(K.ring(WALL_K + 0.02, 56)); ctx.fillStyle = C.floor; ctx.fill();
      ctx.save(); ctx.beginPath(); K.poly(K.ring(WALL_K + 0.02, 56)); ctx.clip();
      // Daylight from the entrance: a wedge across the floor (cool, pale).
      // A fan from the mouth that widens and ends in a rounded edge.
      const fan = (len, spread, x0) => {
        const pts = [P(x0, -0.75, 0)];
        for (let i = 0; i <= 12; i++) { const a = Math.PI - spread + (2 * spread * i) / 12; pts.push(P(x0 + Math.cos(a) * len, Math.sin(a) * len * 0.75 - 0.1, 0)); }
        pts.push(P(x0, 0.75, 0));
        return pts;
      };
      K.path(fan(A.rx * 1.25, 0.42, A.rx * 1.15)); ctx.fillStyle = C.day; ctx.fill();
      K.path(fan(A.rx * 0.75, 0.3, A.rx * 1.15)); ctx.fillStyle = C.day2; ctx.fill();
      // Torch pools: stepped, hard-edged.
      const steps = [[2.3, C.warm], [1.1, C.warm2]];
      for (const [r, col] of steps) {
        ctx.beginPath();
        for (const t of TORCH) {
          const tp = torchPos(t, 2.1), cx = tp.x * 0.86, cy = tp.y * 0.86, q = P(cx, cy, 0), rr = r * sc * (0.96 + 0.04 * flick(t));
          ctx.moveTo(q.x + rr, q.y); ctx.ellipse(q.x, q.y, rr, rr * V.cam.pitch, 0, 0, TAU);
        }
        ctx.fillStyle = col; ctx.fill();
      }
      // Cracks and gravel.
      ctx.strokeStyle = 'rgba(6,4,4,0.75)'; ctx.lineWidth = K.lw(0.03, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const c of cracks) c.forEach(([x, y], i) => { const p = P(x, y, 0); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.stroke();
      const gk = new Path2D(), gl = new Path2D();
      for (const g of gravel) {
        const p = P(g.x, g.y, 0), r = g.r * sc;
        if (K.off(p, 6)) continue;
        gk.moveTo(p.x + r, p.y); gk.ellipse(p.x, p.y, r, r * 0.6, 0, 0, TAU);
        if (r > 2) { gl.moveTo(p.x, p.y - r * 0.3); gl.ellipse(p.x - r * 0.3, p.y - r * 0.3, r * 0.45, r * 0.22, 0, 0, TAU); }
      }
      ctx.fillStyle = '#141110'; ctx.fill(gk);
      ctx.fillStyle = '#8a7a6a'; ctx.fill(gl);
      // Puddles with a light glint.
      for (const pd of puddles) {
        const p = P(pd.x, pd.y, 0), r = pd.r * sc;
        ctx.fillStyle = C.water; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * V.cam.pitch * 0.8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(240,190,140,0.5)'; ctx.lineWidth = K.lw(0.02);
        ctx.beginPath(); ctx.moveTo(p.x - r * 0.4, p.y - r * 0.1); ctx.lineTo(p.x + r * 0.2, p.y - r * 0.1); ctx.stroke();
      }
      rails();
      ctx.restore();
      // Hatching toward the wall foot.
      ctx.strokeStyle = 'rgba(6,4,4,0.6)'; ctx.lineWidth = K.lw(0.025, 0.8);
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const a = (i / 70) * TAU + 0.05, p = P(Math.cos(a) * A.rx * 1.0, Math.sin(a) * A.ry * 1.0, 0), hl = sc * 0.3;
        for (let k = 0; k < 3; k++) { ctx.moveTo(p.x + k * sc * 0.12, p.y); ctx.lineTo(p.x + k * sc * 0.12 + hl * 0.6, p.y - hl * 0.5); }
      }
      ctx.stroke();
    }
    function rails() {
      const sc = V.cam.sc;
      const pts = [];
      for (let i = 0; i < RAIL.length - 1; i++) for (let k = 0; k < 6; k++) {
        const f = k / 6, a = RAIL[i], b = RAIL[i + 1];
        pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      }
      pts.push(RAIL[RAIL.length - 1]);
      const side = (o) => pts.map((q, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty);
        return P(q[0] - ty / l * o, q[1] + tx / l * o, 0);
      });
      // sleepers
      const L = side(0.55), Rr = side(-0.55);
      ctx.lineCap = 'butt';
      for (const [w, col] of [[0.16, INK], [0.11, C.sleeper]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 2);
        ctx.beginPath();
        for (let i = 0; i < L.length; i += 1) { ctx.moveTo(L[i].x, L[i].y); ctx.lineTo(Rr[i].x, Rr[i].y); }
        ctx.stroke();
      }
      const l1 = side(0.38), r1 = side(-0.38);
      for (const [w, col] of [[0.07, INK], [0.03, C.rail]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 1);
        for (const s of [l1, r1]) { ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); }
      }
      void sc;
    }
    function walls(s) {
      const sc = V.cam.sc, ca = Math.cos(V.cam.ang), sa = Math.sin(V.cam.ang);
      const segs = [];
      for (let i = 0; i < WALL_N; i++) {
        const w = wall[i], w2 = wall[(i + 1) % WALL_N];
        const [x0, y0] = wpos(w, w.k), [x1, y1] = wpos(w2, w2.k);
        const f0 = K.tall(x0, y0), f1 = K.tall(x1, y1);
        const [tx0, ty0] = wpos(w, w.k + (w.kt - w.k) * f0), [tx1, ty1] = wpos(w2, w2.k + (w2.kt - w2.k) * f1);
        const nx = -(Math.cos(w.a) / A.rx), ny = -(Math.sin(w.a) / A.ry), l = Math.hypot(nx, ny); // inward normal
        const facing = (nx / l) * sa + (ny / l) * ca; // > 0: the face looks toward the camera
        const sx = (nx / l) * ca - (ny / l) * sa;
        segs.push({ i, w, w2, b0: P(x0, y0, 0), b1: P(x1, y1, 0), t0: P(tx0, ty0, w.h * f0), t1: P(tx1, ty1, w2.h * f1), d: K.depth(x0 + x1, y0 + y1) / 2, facing, sx, f0, f1 });
      }
      segs.sort((a, b) => a.d - b.d);
      // Light on each segment: torchlit near torches, daylight near the mouth.
      const torchNear = (a) => TORCH.reduce((m, t) => Math.min(m, angDist(a, t.a)), 9);
      for (const g of segs) {
        if (g.w.mouth) continue;
        ctx.beginPath(); ctx.moveTo(g.b0.x, g.b0.y); ctx.lineTo(g.b1.x, g.b1.y); ctx.lineTo(g.t1.x, g.t1.y); ctx.lineTo(g.t0.x, g.t0.y); ctx.closePath();
        let col;
        if (g.facing <= 0) col = C.wallTop;
        else {
          const tn = torchNear(g.w.a);
          col = tn < 0.18 ? C.wallWarm : g.sx > 0.35 ? C.wallLit : g.sx < -0.45 ? C.wallShade : (g.i % 3 === 0 ? C.wallLit : C.wall);
          if (tn > 0.18 && tn < 0.4 && g.i % 2) col = C.wallLit;
        }
        ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
      }
      // Strata and cracks on the faces.
      ctx.strokeStyle = 'rgba(4,3,3,0.7)'; ctx.lineWidth = K.lw(0.022, 0.8); ctx.lineCap = 'round';
      ctx.beginPath();
      for (const g of segs) {
        if (g.facing <= 0 || g.w.mouth) continue;
        for (const f of [0.22, 0.47, 0.7]) {
          const jj = (g.w.j - 0.5) * 0.08;
          ctx.moveTo(g.b0.x + (g.t0.x - g.b0.x) * (f + jj), g.b0.y + (g.t0.y - g.b0.y) * (f + jj));
          ctx.lineTo(g.b1.x + (g.t1.x - g.b1.x) * f, g.b1.y + (g.t1.y - g.b1.y) * f);
        }
        if (g.i % 3 === 0) { ctx.moveTo(g.b0.x, g.b0.y); ctx.lineTo(g.t0.x + (g.t1.x - g.t0.x) * g.w.j, g.t0.y + (g.t1.y - g.t0.y) * g.w.j); }
      }
      ctx.stroke();
      // The passage west: a black void in the wall with timber supports.
      tunnel();
      // Daylight entrance east.
      mouth();
      // Ink: wall top silhouette and the foot line.
      ctx.strokeStyle = INK; ctx.lineJoin = 'round';
      ctx.lineWidth = K.lw(0.05, 1.5);
      ctx.beginPath();
      for (const g of segs) { if (g.w.mouth || g.w2.mouth) continue; ctx.moveTo(g.t0.x, g.t0.y); ctx.lineTo(g.t1.x, g.t1.y); }
      ctx.stroke();
      ctx.lineWidth = K.lw(0.03, 1);
      ctx.beginPath();
      for (const g of segs) { if (g.facing <= 0 || g.w.mouth || g.w.tunnel) continue; ctx.moveTo(g.b0.x, g.b0.y); ctx.lineTo(g.b1.x, g.b1.y); }
      ctx.stroke();
      // Warm rim on wall tops near torches.
      ctx.strokeStyle = C.rim; ctx.globalAlpha = 0.45; ctx.lineWidth = K.lw(0.02);
      ctx.beginPath();
      for (const g of segs) { if (g.facing <= 0 || torchNear(g.w.a) > 0.3) continue; ctx.moveTo(g.t0.x, g.t0.y + 2); ctx.lineTo(g.t1.x, g.t1.y + 2); }
      ctx.stroke(); ctx.globalAlpha = 1;
      for (const t of TORCH) torch(t);
      void s; void sc;
    }
    function tunnel() {
      const sc = V.cam.sc;
      const a0 = exitA - 0.17, a1 = exitA + 0.17;
      const at = (a, k, z) => P(Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, z);
      if (K.depth(A.exit.x, A.exit.y) > A.ry * 0.35) return; // seen from behind
      const f = K.tall(A.exit.x, A.exit.y), hh = 2.5 * Math.max(0.35, f);
      const pts = [];
      for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * (i / 10), arch = Math.sin((i / 10) * Math.PI); pts.push(at(a, WALL_K + 0.02, hh * (0.75 + 0.25 * arch))); }
      const foot = [at(a1, WALL_K + 0.02, 0), at(a0, WALL_K + 0.02, 0)];
      ctx.beginPath(); K.poly(pts.concat(foot)); ctx.fillStyle = '#050404'; ctx.fill();
      // depth: a smaller, darker inner opening
      const c0 = at(exitA, WALL_K + 0.2, 0), c1 = at(exitA, WALL_K + 0.2, hh * 0.7);
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse((c0.x + c1.x) / 2, (c0.y + c1.y) / 2, Math.abs(foot[0].x - foot[1].x) * 0.25 + sc * 0.3, Math.abs(c0.y - c1.y) * 0.45, 0, 0, TAU); ctx.fill();
      // timber supports: two posts and a lintel
      const p0b = at(a0 + 0.02, WALL_K, 0), p0t = at(a0 + 0.02, WALL_K, hh * 0.78), p1b = at(a1 - 0.02, WALL_K, 0), p1t = at(a1 - 0.02, WALL_K, hh * 0.78);
      ctx.lineCap = 'butt';
      for (const [w, col] of [[0.24, INK], [0.16, C.timber]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 2);
        ctx.beginPath(); ctx.moveTo(p0b.x, p0b.y); ctx.lineTo(p0t.x, p0t.y); ctx.moveTo(p1b.x, p1b.y); ctx.lineTo(p1t.x, p1t.y);
        ctx.moveTo(p0t.x - (p1t.x - p0t.x) * 0.12, p0t.y - (p1t.y - p0t.y) * 0.12); ctx.lineTo(p1t.x + (p1t.x - p0t.x) * 0.12, p1t.y + (p1t.y - p0t.y) * 0.12);
        ctx.stroke();
      }
      ctx.strokeStyle = C.timberLit; ctx.lineWidth = K.lw(0.04, 1);
      ctx.beginPath(); ctx.moveTo(p0b.x - sc * 0.04, p0b.y); ctx.lineTo(p0t.x - sc * 0.04, p0t.y); ctx.moveTo(p0t.x, p0t.y - sc * 0.05); ctx.lineTo(p1t.x, p1t.y - sc * 0.05); ctx.stroke();
    }
    function mouth() {
      const sc = V.cam.sc;
      const a0 = mouthA - 0.17, a1 = mouthA + 0.17;
      const at = (a, k, z) => P(Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, z);
      if (K.depth(A.rx, 0) > A.ry * 0.35) return; // seen from behind
      const f = K.tall(A.rx, 0), hh = 3.2 * Math.max(0.3, f);
      const pts = [];
      for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * (i / 10), arch = Math.sin((i / 10) * Math.PI); pts.push(at(a, WALL_K + 0.04, hh * (0.65 + 0.35 * arch))); }
      ctx.beginPath(); K.poly(pts.concat([at(a1, WALL_K + 0.04, 0), at(a0, WALL_K + 0.04, 0)]));
      ctx.fillStyle = '#d9cdbf'; ctx.fill();
      ctx.save(); ctx.clip();
      // bright outside: a hint of the quarry floor and sky band
      const g0 = at(mouthA, WALL_K + 0.3, 0);
      ctx.fillStyle = '#f6efe6'; ctx.fillRect(g0.x - sc * 3, g0.y - hh * sc * 1.2, sc * 6, hh * sc * 0.55);
      ctx.fillStyle = '#9b8f82'; ctx.fillRect(g0.x - sc * 3, g0.y - sc * 0.1, sc * 6, sc * 2);
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.05, 1.5);
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    }
    function torch(t) {
      const sc = V.cam.sc;
      const tp = torchPos(t, 2.1);
      if (tp.h < 1.2) return;
      const p = P(tp.x, tp.y, tp.z), base = P(tp.x, tp.y, tp.z - 0.45);
      if (K.off(p, sc * 2)) return;
      // bracket and stick
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.09, 2); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = C.timberLit; ctx.lineWidth = K.lw(0.045, 1);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = C.iron; ctx.fillRect(base.x - sc * 0.08, base.y - sc * 0.04, sc * 0.16, sc * 0.08);
      // flame: two-tone flat licks
      const fk = flick(t), hgt = sc * 0.42 * fk, wd = sc * 0.13, sway = Math.sin(V.time * 6 + t.ph) * sc * 0.04;
      const flame = (w, h, col) => {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.quadraticCurveTo(p.x - w * 0.9, p.y - h * 0.55, p.x + sway, p.y - h);
        ctx.quadraticCurveTo(p.x + w * 0.9, p.y - h * 0.5, p.x + w, p.y); ctx.quadraticCurveTo(p.x, p.y + w * 0.6, p.x - w, p.y); ctx.fill();
      };
      flame(wd * 1.25, hgt * 1.1, INK);
      flame(wd, hgt, '#ff8a3a');
      flame(wd * 0.55, hgt * 0.6, '#ffe2a0');
    }
    function torchGlow() {
      const sc = V.cam.sc;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const t of TORCH) {
        const tp = torchPos(t, 2.1);
        if (tp.h < 1.2) continue;
        const p = P(tp.x, tp.y, tp.z + 0.15), r = sc * 2.4 * flick(t);
        if (K.off(p, r)) continue;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(255,150,70,0.32)'); g.addColorStop(0.35, 'rgba(255,120,50,0.1)'); g.addColorStop(1, 'rgba(255,120,50,0)');
        ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.restore();
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'crate' ? 1.1 : o.r * 0.8);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.1, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.1, o.r * sc * V.cam.pitch, 0, 0, TAU);
      }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop(s) {
      floor();
      shadows();
      walls(s);
    }

    function drawCrate(o) {
      const cr = crate.get(o), hs = o.r * 0.74;
      if (K.off(P(o.x, o.y, 0), V.cam.sc * 3)) return;
      const deco = (face, pts) => {
        const [a, b, c, d] = pts;
        ctx.lineCap = 'butt';
        // planks
        ctx.strokeStyle = 'rgba(20,12,8,0.75)'; ctx.lineWidth = K.lw(0.015, 0.8);
        ctx.beginPath();
        if (face >= 0) for (const f of [0.34, 0.67]) { ctx.moveTo(a.x + (d.x - a.x) * f, a.y + (d.y - a.y) * f); ctx.lineTo(b.x + (c.x - b.x) * f, b.y + (c.y - b.y) * f); }
        else for (const f of [0.25, 0.5, 0.75]) { ctx.moveTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); ctx.lineTo(d.x + (c.x - d.x) * f, d.y + (c.y - d.y) * f); }
        ctx.stroke();
        // frame battens and a diagonal brace
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.075, 2);
        ctx.beginPath(); K.poly(pts); ctx.stroke();
        ctx.strokeStyle = face >= 0 ? '#8d6b49' : '#a07c57'; ctx.lineWidth = K.lw(0.04, 1);
        ctx.beginPath(); K.poly(pts); ctx.stroke();
        if (face >= 0) {
          ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.06, 1.5);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
          ctx.strokeStyle = '#8d6b49'; ctx.lineWidth = K.lw(0.03, 1); ctx.stroke();
          // iron corner plates
          ctx.fillStyle = C.iron;
          for (const q of [a, b, c, d]) ctx.fillRect(q.x - K.lw(0.05), q.y - K.lw(0.05), K.lw(0.1), K.lw(0.1));
        }
      };
      const h = hs * 1.8;
      K.box(o.x, o.y, hs, hs, cr.rot, 0, h, C.crate, deco);
      if (cr.stack) K.box(o.x - 0.05, o.y + 0.04, hs * 0.66, hs * 0.66, cr.rot + 0.5, h, h + hs * 1.15, C.crate, deco);
    }
    function drawBasin(o) {
      const sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 3)) return;
      K.cyl(o.x, o.y, o.r, 0, 0.42, C.stone, null, {
        n: 28,
        inside: (b, t, rx) => {
          // block seams on the rim
          ctx.strokeStyle = 'rgba(8,6,5,0.7)'; ctx.lineWidth = K.lw(0.018, 0.8);
          ctx.beginPath();
          for (const f of [0.35, 0.9, 1.5, 2.1, 2.7]) { const x = b.x + Math.cos(f) * rx; ctx.moveTo(x, b.y + Math.sin(f) * rx * V.cam.pitch); ctx.lineTo(x, t.y + Math.sin(f) * rx * V.cam.pitch); }
          ctx.stroke();
        },
        topInside: (t, rx, ry) => {
          // water inside the rim, catching torch and daylight
          ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(t.x, t.y, rx * 0.78, ry * 0.78, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = C.water; ctx.beginPath(); ctx.ellipse(t.x, t.y + ry * 0.1, rx * 0.74, ry * 0.68, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#2a3a44'; ctx.beginPath(); ctx.ellipse(t.x - rx * 0.12, t.y + ry * 0.2, rx * 0.5, ry * 0.36, 0, 0, TAU); ctx.fill();
          const w = Math.sin(V.time * 1.7 + o.x) * rx * 0.06;
          ctx.strokeStyle = 'rgba(255,200,150,0.75)'; ctx.lineWidth = K.lw(0.022, 1); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(t.x - rx * 0.4 + w, t.y + ry * 0.05); ctx.lineTo(t.x + rx * 0.05 + w, t.y + ry * 0.05);
          ctx.moveTo(t.x - rx * 0.15 - w, t.y + ry * 0.3); ctx.lineTo(t.x + rx * 0.3 - w, t.y + ry * 0.3); ctx.stroke();
          // ore glints in the water
          ctx.fillStyle = '#d7c49a';
          for (const [dx, dy] of [[0.3, 0.35], [-0.35, 0.4], [0.15, 0.55]]) ctx.fillRect(t.x + rx * dx, t.y + ry * dy, K.lw(0.035), K.lw(0.035));
          // inner rim shadow (top-left inside wall is in shade)
          ctx.strokeStyle = 'rgba(8,6,5,0.6)'; ctx.lineWidth = ry * 0.22;
          ctx.beginPath(); ctx.ellipse(t.x, t.y, rx * 0.8, ry * 0.8, 0, Math.PI * 1.0, Math.PI * 1.75); ctx.stroke();
        },
      });
    }
    // The loading frame: posts, beams, iron brackets. In the ogre's fight
    // the middle beam is gone (he has it).
    function drawFrame(s) {
      const F = FRAME, sc = V.cam.sc, f = K.tall((F.x0 + F.x1) / 2, F.y);
      const h = F.h * Math.max(0.3, f);
      const mid = P((F.x0 + F.x1) / 2, F.y, 0);
      if (K.off(mid, sc * 6)) return;
      const fade = K.depth((F.x0 + F.x1) / 2, F.y) > A.ry * 0.2 ? 0.35 : 1;
      ctx.globalAlpha = fade;
      const posts = [F.x0, (F.x0 + F.x1) / 2, F.x1];
      const missing = s.scenario === 'ogre';
      const beam = (x0, z0, x1, z1, w, gone) => {
        const a = P(x0, F.y, z0), b = P(x1, F.y, z1);
        if (gone) return;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(w + 0.06, 2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.strokeStyle = C.timber; ctx.lineWidth = K.lw(w, 1.5); ctx.stroke();
        ctx.strokeStyle = C.timberLit; ctx.lineWidth = K.lw(w * 0.3, 1);
        ctx.beginPath(); ctx.moveTo(a.x, a.y - K.lw(w * 0.3)); ctx.lineTo(b.x, b.y - K.lw(w * 0.3)); ctx.stroke();
      };
      const bracket = (x, z) => {
        const p = P(x, F.y + 0.12, z), w = K.lw(0.1, 2);
        ctx.fillStyle = INK; ctx.fillRect(p.x - w * 0.8, p.y - w * 0.9, w * 1.6, w * 1.8);
        ctx.fillStyle = C.iron; ctx.fillRect(p.x - w * 0.6, p.y - w * 0.7, w * 1.2, w * 1.4);
        ctx.fillStyle = C.ironLit; ctx.fillRect(p.x - w * 0.35, p.y - w * 0.35, w * 0.25, w * 0.25);
      };
      // posts
      for (const x of posts) beam(x, 0, x, h, 0.2);
      // beams: top, middle (missing for the ogre fight), a diagonal brace
      beam(F.x0 - 0.2, h * 0.92, F.x1 + 0.2, h * 0.92, 0.2);
      beam(F.x0, h * 0.5, F.x1, h * 0.5, 0.18, missing);
      beam(posts[1], h * 0.1, F.x1, h * 0.45, 0.12);
      for (const x of posts) { bracket(x, h * 0.92); bracket(x, h * 0.5); }
      // splinters where the beam was torn out
      if (missing) {
        ctx.strokeStyle = C.timberLit; ctx.lineWidth = K.lw(0.03, 1);
        ctx.beginPath();
        for (const x of posts) { const p = P(x, F.y + 0.1, h * 0.5); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + sc * 0.18, p.y - sc * 0.06); ctx.moveTo(p.x, p.y + 2); ctx.lineTo(p.x - sc * 0.15, p.y + sc * 0.05); }
        ctx.stroke();
      }
      // pulley rope hanging from the top beam with a hook
      const r0 = P(F.x1 - 0.6, F.y + 0.1, h * 0.92), r1 = P(F.x1 - 0.6, F.y + 0.1, h * 0.92 - 1.3);
      ctx.strokeStyle = '#8a7356'; ctx.lineWidth = K.lw(0.025, 1);
      ctx.beginPath(); ctx.moveTo(r0.x, r0.y); ctx.lineTo(r1.x, r1.y); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.5);
      ctx.beginPath(); ctx.arc(r1.x, r1.y + sc * 0.08, sc * 0.08, -Math.PI * 0.5, Math.PI * 0.9); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawStal(st) {
      const sc = V.cam.sc, b = P(st.x, st.y, 0);
      if (K.off(b, sc * 2)) return;
      const t = P(st.x, st.y, st.h * K.tall(st.x, st.y)), w = st.r * sc;
      ctx.beginPath(); ctx.moveTo(b.x - w, b.y); ctx.quadraticCurveTo(b.x - w * 0.4, (b.y + t.y) / 2, t.x, t.y); ctx.quadraticCurveTo(b.x + w * 0.3, (b.y + t.y) / 2, b.x + w, b.y); ctx.closePath();
      ctx.fillStyle = C.wall; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = C.wallLit; ctx.fillRect(b.x - w, t.y, w * 0.6, b.y - t.y + 2); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); ctx.stroke();
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'crate') out.push({ d, f: () => drawCrate(o) });
        else if (o.kind === 'basin') out.push({ d, f: () => drawBasin(o) });
        else out.push({ d, f: () => K.drawRock(o.x, o.y, o.r, rockSh.get(o), C.rock, 0.5, 0.95) });
      }
      for (const st of stal) out.push({ d: P(st.x, st.y, 0).d, f: () => drawStal(st) });
      out.push({ d: P((FRAME.x0 + FRAME.x1) / 2, FRAME.y, 0).d, f: () => drawFrame(s) });
      return out;
    }
    // ---- atmosphere: torch glow, a daylight shaft, dust and embers.
    const overlay = K.overlay({ vig: [0.4, 0.85], vigCol: '6,4,4', tone: 1.25, toneCol: 'rgba(6,4,4,0.45)' });
    const motes = K.motes(18, 43, (r) => (r() < 0.6 ? 0 : 1));
    function drawAtmosphere() {
      const sc = V.cam.sc;
      torchGlow();
      // Dusty daylight shaft from the entrance.
      const a = P(A.rx * 1.15, 0, 2.6), b = P(-1.5, -0.6, 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(235,228,215,0.16)'); g.addColorStop(1, 'rgba(235,228,215,0)');
      ctx.fillStyle = g;
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      ctx.beginPath(); ctx.moveTo(a.x + nx * sc * 1.1, a.y + ny * sc * 1.1); ctx.lineTo(b.x + nx * sc * 3, b.y + ny * sc * 3); ctx.lineTo(b.x - nx * sc * 3, b.y - ny * sc * 3); ctx.lineTo(a.x - nx * sc * 1.1, a.y - ny * sc * 1.1); ctx.closePath(); ctx.fill();
      ctx.restore();
      overlay.draw();
      K.drawMotes(motes, ['rgba(225,215,200,0.35)', 'rgba(255,160,80,0.6)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ shared bits for the side arenas
  // A leafy canopy sprite: clumped jagged blobs, two-tone cel, ink, rim.
  function leafySprite(K, Sim, seed, tone) {
    const r = Sim.makeRng(seed), S = 120;
    const cv = K.canvas(S * 2.6, S * 2.4), c = cv.getContext('2d');
    const cx = cv.width / 2, cy = cv.height * 0.52;
    const blobs = [];
    for (let i = 0; i < 7; i++) {
      const a = r() * TAU, d = i ? 0.3 + r() * 0.35 : 0;
      blobs.push({ x: cx + Math.cos(a) * d * S, y: cy + Math.sin(a) * d * 0.7 * S, r: (i ? 0.34 + r() * 0.22 : 0.6) * S, w: Array.from({ length: 10 }, () => 0.9 + r() * 0.16) });
    }
    blobs.sort((p, q) => p.y - q.y);
    const path = (b, dx, dy, k) => {
      c.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * TAU, rr = b.r * k * b.w[j];
        const x = b.x + dx + Math.cos(a) * rr, y = b.y + dy + Math.sin(a) * rr * 0.9;
        j ? c.lineTo(x, y) : c.moveTo(x, y);
        const a2 = ((j + 0.5) / 10) * TAU, r2 = rr * 0.86;
        c.lineTo(b.x + dx + Math.cos(a2) * r2, b.y + dy + Math.sin(a2) * r2 * 0.9);
      }
      c.closePath();
    };
    c.fillStyle = INK; for (const b of blobs) { path(b, 0, 0, 1.06); c.fill(); }
    for (const b of blobs) {
      c.fillStyle = tone.shade; path(b, 0, 0, 1); c.fill();
      c.save(); path(b, 0, 0, 1); c.clip();
      c.fillStyle = tone.lit; path(b, -b.r * 0.22, -b.r * 0.28, 0.88); c.fill();
      c.restore();
      c.strokeStyle = INK; c.lineWidth = S * 0.016; path(b, 0, 0, 1); c.stroke();
    }
    c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.6; c.fillStyle = tone.shade;
    c.beginPath(); c.ellipse(cx + S * 0.6, cy + S * 0.7, S * 1.0, S * 0.7, -0.35, 0, TAU); c.fill(); c.restore();
    c.strokeStyle = tone.rim; c.globalAlpha = 0.7; c.lineWidth = S * 0.025;
    for (const b of blobs) { c.beginPath(); c.arc(b.x, b.y, b.r * 0.95, Math.PI * 1.05, Math.PI * 1.5); c.stroke(); }
    c.globalAlpha = 1;
    return { cv, ax: cx, ay: cy, S };
  }
  // A leafy tree: tapered trunk and a canopy sprite; fades when a fighter is behind.
  function drawLeafyTree(V, K, s, t, sprites, pal) {
    const ctx = V.ctx, P = V.P, sc = V.cam.sc;
    const b = P(t.x, t.y, 0);
    if (K.off(b, sc * 4)) return;
    const h = t.h * (t.obstacle ? 1 : Math.max(0.35, K.tall(t.x, t.y)));
    const top = P(t.x, t.y, h * 0.72), cc = P(t.x, t.y, h * 0.8);
    const fade = K.behind(s, b, sc * 1.5, sc * h * 0.9) ? 0.4 : 1;
    ctx.globalAlpha = fade;
    const wb = t.tr * sc, wt = wb * 0.55;
    K.path([{ x: b.x - wb, y: b.y + wb * 0.1 }, { x: top.x - wt, y: top.y }, { x: top.x + wt, y: top.y }, { x: b.x + wb, y: b.y + wb * 0.15 }]);
    ctx.fillStyle = pal.bark; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.4); ctx.stroke();
    K.path([{ x: b.x - wb * 0.85, y: b.y }, { x: top.x - wt * 0.8, y: top.y }, { x: top.x - wt * 0.1, y: top.y }, { x: b.x - wb * 0.15, y: b.y }]);
    ctx.fillStyle = pal.barkLit; ctx.fill();
    const sp = sprites[t.v], k = (t.R * sc) / sp.S;
    ctx.drawImage(sp.cv, cc.x - sp.ax * k, cc.y - sp.ay * k, sp.cv.width * k, sp.cv.height * k);
    ctx.globalAlpha = 1;
  }
  // A lumpy sack lying on the ground, tied at the neck.
  function drawSack(V, K, x, y, r, rot, pal, spill) {
    const ctx = V.ctx, P = V.P, sc = V.cam.sc;
    const p = P(x, y, r * 0.45);
    if (K.off(p, sc * 2)) return;
    if (spill === 'grain') { grain(); return; }
    const rx = r * sc * 1.25, ry = r * sc * 0.75;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot);
    const body = () => { ctx.beginPath(); ctx.moveTo(-rx, ry * 0.3); ctx.quadraticCurveTo(-rx * 1.05, -ry * 1.1, 0, -ry); ctx.quadraticCurveTo(rx * 0.9, -ry * 1.05, rx * 0.95, -ry * 0.1); ctx.lineTo(rx * 1.35, -ry * 0.35); ctx.lineTo(rx * 1.4, ry * 0.25); ctx.lineTo(rx * 0.95, ry * 0.15); ctx.quadraticCurveTo(rx * 0.8, ry * 0.95, 0, ry * 0.9); ctx.quadraticCurveTo(-rx * 0.95, ry * 0.95, -rx, ry * 0.3); ctx.closePath(); };
    body(); ctx.fillStyle = pal.lit; ctx.fill();
    ctx.save(); body(); ctx.clip(); ctx.fillStyle = pal.shade; ctx.beginPath(); ctx.ellipse(rx * 0.35, ry * 0.55, rx * 1.1, ry * 0.75, 0, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.035, 1.2); ctx.lineJoin = 'round'; body(); ctx.stroke();
    ctx.lineWidth = K.lw(0.025, 1); ctx.beginPath(); ctx.moveTo(rx * 0.95, -ry * 0.3); ctx.lineTo(rx * 0.95, ry * 0.25); ctx.moveTo(-rx * 0.3, -ry * 0.5); ctx.lineTo(rx * 0.2, -ry * 0.2); ctx.stroke();
    ctx.restore();
    function grain() {
      // grain spilled from the open neck
      const q = P(x + Math.cos(rot) * r * 1.9, y + Math.sin(rot) * r * 1.2, 0);
      ctx.fillStyle = pal.grain;
      for (let i = 0; i < 26; i++) { const a = i * 2.39, d = (i % 7) * 0.09 * sc + sc * 0.05; ctx.fillRect(q.x + Math.cos(a) * d * 1.5, q.y + Math.sin(a) * d * 0.5, K.lw(0.04, 1), K.lw(0.03, 1)); }
    }
  }

  // ================================================================ road
  // Side mission: the North Road out of town, through hedged farmland. The
  // missing supply cart lies on its side in the ditch, sacks spilled.
  function road(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(71);
    const C = {
      bg: '#1f211b', field: '#2c2e25', fieldLit: '#3a3b2f', furrow: 'rgba(14,14,10,0.5)', ground: '#383a2f', lit: '#46473a', pool: '#525243',
      dirt: '#5e5243', dirtLit: '#7a6b57', rut: '#3c342b', ditch: '#1d1b16',
      rock: { base: '#433d39', mid: '#615751', lit: '#8f847a', rim: '#efd9c4' },
      wood: { lit: '#7b6046', shade: '#3f2f21', top: '#8e7152', rim: '#f2d2ae' },
      sack: { lit: '#a6916a', shade: '#62553c', grain: '#d8c48e' },
      hedge: { shade: '#1a211b', lit: '#34423a', rim: '#cfc3ae' },
      tree: { shade: '#1b231e', lit: '#3d4c42', rim: '#d8c6b8' }, bark: '#241e1b', barkLit: '#4d423d',
      post: '#4a3a2b', postLit: '#7a644c', grass: { ink: '#1b1d15', lit: '#6f7150', tip: '#c8bc90' },
      shadowA: 'rgba(8,9,6,0.45)',
    };
    // The road: west to east, curving down to the exit.
    const ROAD = [[-18, -0.9], [-10, -0.5], [-4, 0.0], [0, 0.35], [5, 1.3], [9, 2.3], [12.5, 3.1], [18, 4.6]];
    const RW = 1.55;
    const roadAt = (x) => { for (let i = 0; i < ROAD.length - 1; i++) { const [ax, ay] = ROAD[i], [bx, by] = ROAD[i + 1]; if (x <= bx) return ay + ((by - ay) * (x - ax)) / (bx - ax); } return ROAD[ROAD.length - 1][1]; };
    const edgeL = [], edgeR = [];
    for (let x = -18; x <= 18; x += 0.75) { const y = roadAt(x); edgeL.push([x, y - RW * (1 + (R() - 0.5) * 0.18)]); edgeR.push([x, y + RW * (1 + (R() - 0.5) * 0.18)]); }
    const flecks = [];
    for (let i = 0; i < 70; i++) { const x = (R() - 0.5) * 30; flecks.push({ x, y: roadAt(x) + (R() - 0.5) * RW * 1.8, r: 0.05 + R() * 0.14, lit: R() < 0.5 }); }
    // Fields: furrowed strips beyond the hedges.
    const furrows = [];
    for (let i = 0; i < 40; i++) { const y = -A.ry * 1.35 - i * 0.35; furrows.push(y); }
    // Hedgerows along the north and south field edges (outside the arena).
    const hedges = [];
    for (const [k0, side] of [[1.22, -1], [1.3, 1]]) {
      for (let x = -16; x <= 16; x += 1.1 + R() * 0.4) {
        const e = 1 - (x / (A.rx * k0)) ** 2;
        const y = side * (e > 0.05 ? Math.sqrt(e) * A.ry * k0 : A.ry * 0.35 * k0 + Math.abs(x) * 0.12) + (R() - 0.5) * 0.5;
        if (Math.abs(y - roadAt(x)) < RW + 1.2) continue;
        hedges.push({ x, y, R: 0.9 + R() * 0.4, v: hedges.length % 3, h: 1.2 + R() * 0.4 });
      }
    }
    // A post-and-rail fence along the north field.
    const fence = [];
    for (let a = -2.75; a <= -0.45; a += 0.13) fence.push([Math.cos(a) * A.rx * 1.07, Math.sin(a) * A.ry * 1.07]);
    const hedgeSp = [0, 1, 2].map((i) => leafySprite(K, Sim, 911 + i * 13, C.hedge));
    const treeSp = [0, 1, 2].map((i) => leafySprite(K, Sim, 951 + i * 17, C.tree));
    const trees = [];
    for (const o of A.obstacles) if (o.kind === 'tree') trees.push({ x: o.x, y: o.y, R: o.r * 3.4, h: 4.4, tr: o.r * 0.55, v: trees.length % 3, obstacle: true });
    for (const [x, y] of [[-12.5, -6.5], [11.5, -5.5], [-13.5, 5.0], [13.8, 7.2], [3.5, -8.4]]) trees.push({ x, y, R: 1.8 + R() * 0.5, h: 4.6, tr: 0.32, v: trees.length % 3 });
    const rockSh = new Map();
    for (const o of A.obstacles) if (o.kind === 'rock') rockSh.set(o, K.rockShape(R, 9));
    const cart = A.obstacles.find((o) => o.kind === 'cart');
    // Sacks spilled from the cart (just outside its footprint).
    const sacks = cart ? [[1.15, 0.55, 0.32, 0.4, true], [0.6, 1.15, 0.28, -0.6, false], [-1.2, 0.9, 0.3, 2.6, true], [1.6, -0.5, 0.26, 1.2, false]].map(([dx, dy, r, rot, spill]) => ({ x: cart.x + dx, y: cart.y + dy, r, rot, spill })) : [];
    const tuftSp = [];
    for (let i = 0; i < 6; i++) tuftSp.push(K.tuft(811 + i * 7, C.grass, i < 4, i < 2));
    const tufts = [];
    for (let i = 0; i < 600 && tufts.length < 170; i++) {
      const x = (R() - 0.5) * 32, y = (R() - 0.5) * 20;
      if (Math.abs(y - roadAt(x)) < RW + 0.2 || K.inObstacle(x, y, 0.2)) continue;
      if ((x / A.rx) ** 2 + (y / A.ry) ** 2 < 0.4 && R() < 0.7) continue;
      tufts.push({ x, y, s: 0.5 + R() * 0.8, v: tufts.length % 6 });
    }
    const wob = Array.from({ length: 48 }, () => R());

    function ground() {
      const sc = V.cam.sc;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      ctx.beginPath(); K.poly(K.ring(1.9, 48, wob, 0.1)); ctx.fillStyle = C.field; ctx.fill();
      // ploughed furrows on both sides
      ctx.strokeStyle = C.furrow; ctx.lineWidth = K.lw(0.05, 1);
      ctx.beginPath();
      for (const y of furrows) for (const sgn of [1, -1]) { const yy = sgn > 0 ? y : -y + 1.2; const a = P(-20, yy, 0), b = P(20, yy + sgn * 0.6, 0); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
      ctx.beginPath(); K.poly(K.ring(1.14, 48, wob, 0.1)); ctx.fillStyle = C.ground; ctx.fill();
      ctx.beginPath(); K.poly(K.ring(0.98, 48, wob, 0.14, -0.5, -0.3)); ctx.fillStyle = C.lit; ctx.fill();
      ctx.beginPath(); K.poly(K.ring(0.5, 48, wob, 0.2, -2.5, -1.4)); ctx.fillStyle = C.pool; ctx.fill();
      // the road with a ditch on its north side
      const L = edgeL.map(([x, y]) => P(x, y, 0)), Rr = edgeR.map(([x, y]) => P(x, y, 0));
      const D = edgeL.map(([x, y]) => P(x, y - 0.55, 0));
      ctx.beginPath(); K.poly(D.concat(L.slice().reverse())); ctx.fillStyle = C.ditch; ctx.fill();
      ctx.beginPath(); K.poly(L.concat(Rr.slice().reverse())); ctx.fillStyle = C.dirt; ctx.fill();
      const M0 = edgeL.map(([x, y]) => P(x, y + RW * 0.55, 0)), M1 = edgeL.map(([x, y]) => P(x, y + RW * 1.3, 0));
      ctx.beginPath(); K.poly(M0.concat(M1.slice().reverse())); ctx.fillStyle = C.dirtLit; ctx.fill();
      const lit = new Path2D(), dark = new Path2D();
      for (const f of flecks) { const p = P(f.x, f.y, 0), r = f.r * sc; if (K.off(p, 8)) continue; const pa = f.lit ? lit : dark; pa.moveTo(p.x + r, p.y); pa.ellipse(p.x, p.y, r, r * 0.45, 0, 0, TAU); }
      ctx.fillStyle = C.dirtLit; ctx.fill(lit); ctx.fillStyle = C.rut; ctx.fill(dark);
      // wheel ruts
      ctx.strokeStyle = C.rut; ctx.lineWidth = K.lw(0.07, 1.2); ctx.lineCap = 'round';
      for (const o of [-0.55, 0.6]) { ctx.beginPath(); for (let x = -18; x <= 18; x += 1) { const p = P(x, roadAt(x) + o, 0); x > -18 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); }
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.035, 1);
      for (const side of [L, Rr, D]) { ctx.beginPath(); side.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); }
      // the cart's skid marks off the road into the ditch
      if (cart) {
        ctx.strokeStyle = 'rgba(20,16,12,0.7)'; ctx.lineWidth = K.lw(0.08, 1.5);
        ctx.beginPath();
        for (const o of [-0.4, 0.4]) { const a = P(cart.x + 4.2, roadAt(cart.x + 4.2) + o, 0), m = P(cart.x + 2.2, cart.y + 1.2 + o * 0.6, 0), b = P(cart.x + 0.9, cart.y + 0.5 + o * 0.5, 0); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(m.x, m.y, b.x, b.y); }
        ctx.stroke();
      }
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        if (o.kind === 'tree') continue;
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'cart' ? 1.4 : o.r);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.2, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.2, o.r * sc * V.cam.pitch, 0, 0, TAU);
      }
      for (const t of trees) { const b = P(t.x, t.y, 0), off = K.shadowOff(t.h * 0.8), r = t.R * sc * 0.7; ctx.moveTo(b.x + off.x + r, b.y + off.y); ctx.ellipse(b.x + off.x, b.y + off.y, r, r * V.cam.pitch * 0.8, 0, 0, TAU); }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() {
      ground();
      shadows();
      K.drawSprites(tufts, tuftSp, 0.3);
      for (const sk of sacks) if (sk.spill) drawSack(V, K, sk.x, sk.y, sk.r, sk.rot, C.sack, 'grain');
    }
    function drawFence() {
      const sc = V.cam.sc;
      const pts = fence.map(([x, y]) => ({ x, y, k: K.tall(x, y) }));
      ctx.lineCap = 'round';
      for (const [w, col] of [[0.12, INK], [0.07, C.post]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 1.5);
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const q = pts[i], b = P(q.x, q.y, 0), t = P(q.x, q.y, 1.0 * q.k);
          if (i % 2 === 0) { ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); }
          if (i < pts.length - 1 && i % 7 !== 3) {
            const n = pts[i + 1];
            for (const z of [0.45, 0.85]) { const a = P(q.x, q.y, z * q.k), c = P(n.x, n.y, z * n.k); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); }
          }
        }
        ctx.stroke();
      }
      void sc;
    }
    function drawHedge(hd) {
      const sc = V.cam.sc, b = P(hd.x, hd.y, 0);
      if (K.off(b, sc * 3)) return;
      const k = Math.max(0.45, K.tall(hd.x, hd.y));
      const c = P(hd.x, hd.y, hd.h * 0.5 * k), sp = hedgeSp[hd.v], s = (hd.R * sc) / sp.S;
      ctx.drawImage(sp.cv, c.x - sp.ax * s, c.y - sp.ay * s * 0.7 * k, sp.cv.width * s, sp.cv.height * s * 0.7 * k);
    }
    function drawCart(o) {
      const sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 4)) return;
      const rot = 0.35;
      // the bed on its side: floor planks face the road, sideboard on the ground
      K.box(o.x, o.y, 0.95, 0.32, rot, 0, 1.05, C.wood, (face, pts) => {
        const [a, b, c, d] = pts;
        ctx.strokeStyle = 'rgba(20,12,8,0.7)'; ctx.lineWidth = K.lw(0.015, 0.8);
        ctx.beginPath();
        for (const f of [0.25, 0.5, 0.75]) { ctx.moveTo(a.x + (d.x - a.x) * f, a.y + (d.y - a.y) * f); ctx.lineTo(b.x + (c.x - b.x) * f, b.y + (c.y - b.y) * f); }
        ctx.stroke();
        ctx.fillStyle = '#2b2a2e';
        for (const q of [a, b, c, d]) ctx.fillRect(q.x - K.lw(0.04), q.y - K.lw(0.04), K.lw(0.08), K.lw(0.08));
      });
      const ca = Math.cos(rot), sa = Math.sin(rot);
      // the upturned wheel: a flat spoked disc on top, near one end
      const wx = o.x + ca * 0.55 - sa * 0.05, wy = o.y + sa * 0.55 + ca * 0.05;
      const w = P(wx, wy, 1.12), rx = 0.5 * sc, ry = 0.5 * sc * V.cam.pitch * 0.9;
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(w.x, w.y, rx + 2, ry + 2, rot * 0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.wood.lit; ctx.lineWidth = K.lw(0.07, 1.5); ctx.beginPath(); ctx.ellipse(w.x, w.y, rx * 0.9, ry * 0.9, rot * 0.3, 0, TAU); ctx.stroke();
      ctx.lineWidth = K.lw(0.035, 1); ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.4; ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + Math.cos(a) * rx * 0.85, w.y + Math.sin(a) * ry * 0.85); }
      ctx.stroke();
      ctx.fillStyle = '#2b2a2e'; ctx.beginPath(); ctx.ellipse(w.x, w.y, rx * 0.16, ry * 0.16, 0, 0, TAU); ctx.fill();
      // broken shafts sticking out toward the road
      const s0 = P(o.x - ca * 0.9, o.y - sa * 0.9, 0.5);
      ctx.lineCap = 'round';
      for (const [w2, col] of [[0.13, INK], [0.07, C.wood.lit]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w2, 1.5);
        ctx.beginPath();
        for (const [ex, ey, ez] of [[-1.9, 0.5, 0.15], [-1.6, -0.2, 0.75]]) { const e = P(o.x + ca * ex - sa * ey, o.y + sa * ex + ca * ey, ez); ctx.moveTo(s0.x, s0.y); ctx.lineTo(e.x, e.y); }
        ctx.stroke();
      }
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'rock') out.push({ d, f: () => K.drawRock(o.x, o.y, o.r, rockSh.get(o), C.rock, 0.5, 0.9) });
        else if (o.kind === 'cart') out.push({ d, f: () => drawCart(o) });
      }
      for (const t of trees) out.push({ d: P(t.x, t.y, 0).d, f: () => drawLeafyTree(V, K, s, t, treeSp, C) });
      for (const hd of hedges) out.push({ d: P(hd.x, hd.y, 0).d, f: () => drawHedge(hd) });
      for (const sk of sacks) out.push({ d: P(sk.x, sk.y, 0).d, f: () => drawSack(V, K, sk.x, sk.y, sk.r, sk.rot, C.sack, false) });
      out.push({ d: P(0, -A.ry * 1.07, 0).d, f: drawFence });
      return out;
    }
    const overlay = K.overlay({
      vig: [0.24, 0.62], vigCol: '10,10,6',
      paint(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H * 0.55);
        g.addColorStop(0, 'rgba(220,190,140,0.14)'); g.addColorStop(1, 'rgba(220,190,140,0)');
        c.fillStyle = g; c.fillRect(0, 0, W, H * 0.55);
      },
    });
    const motes = K.motes(22, 73, (r) => (r() < 0.6 ? 0 : 1));
    function drawAtmosphere() {
      overlay.draw();
      K.drawMotes(motes, ['rgba(236,220,180,0.4)', 'rgba(210,190,140,0.35)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ ruins
  // Side story: the Old Crossing. A dry riverbed of pale stones where water
  // once ran, the broken stone bridge over it, walls of a town that is gone.
  // Cold blue-violet mist; faint ghosts of water still flowing.
  function ruins(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(83);
    const C = {
      bg: '#121219', bank: '#1e1f27', bankLit: '#282a34', bed: '#3c3d48', bedLit: '#4e505d', cobble: '#6e7080', cobbleLit: '#9a9caa',
      stone: { lit: '#6a6878', shade: '#353442', top: '#7d7b8c', rim: '#cfd6ec', base: '#4c4a58' },
      rock: { base: '#363542', mid: '#4f4d5d', lit: '#77768a', rim: '#cfd6ec' },
      moss: '#3a4a44', mist: '200,210,255', ghost: '170,205,255', shadowA: 'rgba(4,4,10,0.5)',
    };
    // The riverbed runs west to east through the middle of the arena.
    const bedY = (x) => 0.25 * Math.sin(x * 0.25) + 0.08 * x;
    const BW = 2.3;
    const bankN = [], bankS = [];
    for (let x = -20; x <= 20; x += 0.8) { bankN.push([x, bedY(x) - BW * (1 + (R() - 0.5) * 0.25)]); bankS.push([x, bedY(x) + BW * (1 + (R() - 0.5) * 0.25)]); }
    const cobbles = [];
    for (let i = 0; i < 240; i++) { const x = (R() - 0.5) * 34, y = bedY(x) + (R() - 0.5) * BW * 1.9; if (K.inObstacle(x, y, 0.1)) continue; cobbles.push({ x, y, r: 0.07 + R() * 0.17, rot: R() * 3 }); }
    // Water ghosts: faint ribbons that still flow down the dry bed.
    const ribbons = Array.from({ length: 9 }, () => ({ o: (R() - 0.5) * 1.6, ph: R() * 40, sp: 0.8 + R() * 0.6, len: 2 + R() * 3 }));
    // Foundations of houses on the banks (low wall lines on the ground) and
    // low broken walls in the ring.
    const found = [];
    for (let i = 0; i < 9; i++) {
      const a = R() * TAU, k = 1.05 + R() * 0.45, x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (Math.abs(y - bedY(x)) < BW + 0.8) continue;
      found.push({ x, y, w: 1.5 + R() * 1.6, d: 1.2 + R() * 1.2, rot: (R() - 0.5) * 0.4, h: 0.4 + R() * 1.4 });
    }
    const rubble = [];
    for (let i = 0; i < 26; i++) { const a = R() * TAU, k = 0.6 + R() * 0.7; const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k; if (K.inObstacle(x, y, 0.4)) continue; rubble.push({ x, y, hw: 0.12 + R() * 0.2, hd: 0.1 + R() * 0.15, rot: R() * 3, h: 0.12 + R() * 0.2 }); }
    const walls = new Map(), rockSh = new Map();
    for (const o of A.obstacles) {
      if (o.kind === 'wall') walls.set(o, { rot: (R() - 0.5) * 0.8, steps: Array.from({ length: 5 }, () => 0.4 + R() * 1.2) });
      if (o.kind === 'rock') rockSh.set(o, K.rockShape(R, 9));
    }
    const piers = A.obstacles.filter((o) => o.kind === 'pillar');
    const mist = Array.from({ length: 10 }, () => ({ x: (R() - 0.5) * 26, y: (R() - 0.5) * 14, r: 2 + R() * 3, sp: 0.15 + R() * 0.2 }));
    const wob = Array.from({ length: 48 }, () => R());

    function floor() {
      const sc = V.cam.sc, t = V.time;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      ctx.beginPath(); K.poly(K.ring(1.6, 48, wob, 0.12)); ctx.fillStyle = C.bank; ctx.fill();
      ctx.beginPath(); K.poly(K.ring(1.0, 48, wob, 0.14, -0.6, -0.4)); ctx.fillStyle = C.bankLit; ctx.fill();
      const N = bankN.map(([x, y]) => P(x, y, 0)), S = bankS.map(([x, y]) => P(x, y, 0));
      ctx.beginPath(); K.poly(N.concat(S.slice().reverse())); ctx.fillStyle = C.bed; ctx.fill();
      const N2 = bankN.map(([x, y]) => P(x, y + 0.6, 0)), S2 = bankS.map(([x, y]) => P(x, y - 0.9, 0));
      ctx.beginPath(); K.poly(N2.concat(S2.slice().reverse())); ctx.fillStyle = C.bedLit; ctx.fill();
      // pale river stones
      const base = new Path2D(), hi = new Path2D();
      for (const c of cobbles) {
        const p = P(c.x, c.y, 0), r = c.r * sc;
        if (K.off(p, 8)) continue;
        base.moveTo(p.x + r, p.y); base.ellipse(p.x, p.y, r, r * 0.55, c.rot * 0.2, 0, TAU);
        if (r > 2.5) { hi.moveTo(p.x - r * 0.1, p.y - r * 0.2); hi.ellipse(p.x - r * 0.3, p.y - r * 0.2, r * 0.45, r * 0.2, 0, 0, TAU); }
      }
      ctx.fillStyle = C.cobble; ctx.fill(base); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.015, 0.7); ctx.stroke(base);
      ctx.fillStyle = C.cobbleLit; ctx.fill(hi);
      // bank edges: a cut lip with hatching
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.2); ctx.lineJoin = 'round';
      for (const side of [N, S]) { ctx.beginPath(); side.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(4,4,8,0.6)'; ctx.lineWidth = K.lw(0.022, 0.8);
      ctx.beginPath();
      for (let i = 0; i < N.length; i += 1) { const p = N[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + sc * 0.12, p.y + sc * 0.22); }
      ctx.stroke();
      // the water that is not there
      ctx.lineCap = 'round';
      for (const rb of ribbons) {
        const x0 = ((rb.ph + t * rb.sp) % 34) - 17;
        const a = 0.12 + 0.1 * Math.sin(t * 1.3 + rb.ph);
        ctx.strokeStyle = `rgba(${C.ghost},${a.toFixed(3)})`; ctx.lineWidth = K.lw(0.05, 1);
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const x = x0 + (k / 8) * rb.len, p = P(x, bedY(x) + rb.o + Math.sin(x * 1.7 + t * 2) * 0.12, 0.02); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
        ctx.stroke();
      }
      // foundations
      ctx.strokeStyle = C.stone.shade; ctx.lineWidth = K.lw(0.12, 1.5);
      ctx.beginPath();
      for (const f of found) { const c = Math.cos(f.rot), s2 = Math.sin(f.rot); const pts = [[-f.w, -f.d], [f.w, -f.d], [f.w, f.d], [-f.w, f.d]].map(([u, v]) => P(f.x + u * c - v * s2, f.y + u * s2 + v * c, 0)); K.poly(pts); }
      ctx.stroke();
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'pillar' ? 2.2 : o.kind === 'wall' ? 1.2 : o.r);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.2, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.25, o.r * sc * V.cam.pitch, 0, 0, TAU);
      }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() { floor(); shadows(); }
    const stoneDeco = (face, pts) => {
      const [a, b, c, d] = pts;
      ctx.strokeStyle = 'rgba(8,8,14,0.6)'; ctx.lineWidth = K.lw(0.015, 0.8);
      ctx.beginPath();
      for (const f of [0.33, 0.66]) { ctx.moveTo(a.x + (d.x - a.x) * f, a.y + (d.y - a.y) * f); ctx.lineTo(b.x + (c.x - b.x) * f, b.y + (c.y - b.y) * f); }
      if (face >= 0) for (const f of [0.3, 0.7]) { ctx.moveTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); ctx.lineTo(a.x + (b.x - a.x) * f + (d.x - a.x) * 0.33, a.y + (b.y - a.y) * f + (d.y - a.y) * 0.33); }
      ctx.stroke();
      // moss along the foot
      if (face >= 0) { ctx.fillStyle = C.moss; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + (c.x - b.x) * 0.12, b.y + (c.y - b.y) * 0.12); ctx.lineTo(a.x + (d.x - a.x) * 0.2, a.y + (d.y - a.y) * 0.2); ctx.closePath(); ctx.fill(); }
    };
    function drawWall(o) {
      const w = walls.get(o), sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 4)) return;
      const k = Math.max(0.5, K.tall(o.x, o.y));
      const c = Math.cos(w.rot), s2 = Math.sin(w.rot);
      // a run of stacked blocks, each column broken to a different height
      const n = 4, hw = 0.82;
      for (let i = 0; i < n; i++) {
        const u = -hw + ((i + 0.5) * 2 * hw) / n;
        K.box(o.x + u * c, o.y + u * s2, hw / n, 0.3, w.rot, 0, w.steps[i] * 1.4 * k, C.stone, stoneDeco);
      }
    }
    function drawPier(o) {
      const sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 5)) return;
      const k = K.tall(o.x, o.y), h = 2.6 * Math.max(0.3, k);
      K.box(o.x, o.y, 0.45, 0.45, 0, 0, h, C.stone, stoneDeco);
      // the stub of the deck, running away from the riverbed, snapped off
      const dir = Math.sign(o.y - bedY(o.x)) || 1;
      K.box(o.x, o.y + dir * 0.9, 0.6, 1.0, 0, h, h + 0.4, C.stone, stoneDeco);
      // the arch springing toward the middle, broken mid-air
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.3, 3); ctx.lineCap = 'butt';
      const a0 = P(o.x, o.y - dir * 0.45, h * 0.7), a1 = P(o.x, o.y - dir * 1.2, h * 0.92), a2 = P(o.x, o.y - dir * 1.5, h * 1.02);
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.quadraticCurveTo(a1.x, a1.y, a2.x, a2.y); ctx.stroke();
      ctx.strokeStyle = C.stone.lit; ctx.lineWidth = K.lw(0.2, 2); ctx.stroke();
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'wall') out.push({ d, f: () => drawWall(o) });
        else if (o.kind === 'pillar') out.push({ d, f: () => drawPier(o) });
        else out.push({ d, f: () => K.drawRock(o.x, o.y, o.r, rockSh.get(o), C.rock, 0.5, 0.9) });
      }
      for (const f of found) out.push({ d: P(f.x, f.y, 0).d, f: () => { const k = K.tall(f.x, f.y); K.box(f.x, f.y, Math.min(f.w, 1.4), 0.25, f.rot, 0, f.h * Math.max(0.3, k), C.stone, stoneDeco); } });
      for (const r of rubble) out.push({ d: P(r.x, r.y, 0).d, f: () => { if (!K.off(P(r.x, r.y, 0), 20)) K.box(r.x, r.y, r.hw, r.hd, r.rot, 0, r.h, C.stone, null); } });
      void s; void piers;
      return out;
    }
    const overlay = K.overlay({
      vig: [0.4, 0.85], vigCol: '6,6,16', tone: 1.3, toneCol: 'rgba(8,8,18,0.45)',
      paint(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(150,140,230,0.16)'); g.addColorStop(0.5, 'rgba(120,140,220,0.05)'); g.addColorStop(1, 'rgba(90,110,200,0.12)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
    });
    const motes = K.motes(26, 89, (r) => (r() < 0.7 ? 0 : 1));
    function drawAtmosphere() {
      const sc = V.cam.sc, t = V.time;
      // drifting mist banks, world-anchored
      for (const m of mist) {
        const x = ((m.x + t * m.sp + 13) % 26 + 26) % 26 - 13, p = P(x, m.y, 0.6), r = m.r * sc;
        if (K.off(p, r)) continue;
        ctx.fillStyle = `rgba(${C.mist},0.05)`;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.28, 0, 0, TAU); ctx.ellipse(p.x + r * 0.4, p.y - r * 0.06, r * 0.6, r * 0.18, 0, 0, TAU); ctx.fill();
      }
      overlay.draw();
      K.drawMotes(motes, ['rgba(190,205,255,0.45)', 'rgba(170,150,255,0.5)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ yard
  // The Guild's evaluation yard behind the office: packed earth with chalk
  // lines, a low stone wall round it, stone blocks, a wooden target, weapon
  // racks, and the Guild's banner on the back of the office.
  function yard(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(97);
    const C = {
      bg: '#1d1916', earth: '#4b4136', earthLit: '#5d5143', pool: '#6a5d4c', chalk: 'rgba(236,228,214,0.55)',
      wall: { lit: '#7d756b', shade: '#443f3a', top: '#958b7e', rim: '#f2dcc4' },
      block: { lit: '#8a8178', shade: '#4f4842', top: '#a39a8e', rim: '#f2dcc4' },
      office: '#2c2622', officeLit: '#3d3530', timber: '#4a3525', timberLit: '#7a5939', roof: '#231c1a', window: '#e8b070',
      wood: '#6e5236', woodLit: '#9a7a52', banner: '#3c4f6a', bannerSh: '#243246', emblem: '#e6d6b0',
      shadowA: 'rgba(8,6,4,0.45)',
    };
    const XW = A.rx * 1.18, YW = A.ry * 1.22, GATE = 1.3;
    // wall segments (x0, y0, x1, y1), north wall split for the gate
    const segs = [];
    const run = (x0, y0, x1, y1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2.2)); for (let i = 0; i < n; i++) segs.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, x0 + ((x1 - x0) * (i + 1)) / n, y0 + ((y1 - y0) * (i + 1)) / n]); };
    run(-XW, -YW, -GATE, -YW); run(GATE, -YW, XW, -YW); run(XW, -YW, XW, YW); run(XW, YW, -XW, YW); run(-XW, YW, -XW, -YW);
    const racks = [{ x: -XW + 0.7, y: -2.2, rot: Math.PI / 2 }, { x: XW - 0.7, y: 0.6, rot: Math.PI / 2 }, { x: -4.5, y: -YW + 0.6, rot: 0 }];
    const rockSh = new Map();
    const blocks = new Map();
    for (const o of A.obstacles) if (o.kind === 'block') blocks.set(o, { rot: (R() - 0.5) * 0.6, n: 1 + Math.floor(R() * 4) });
    const scuffs = [];
    for (let i = 0; i < 60; i++) { const a = R() * TAU, k = Math.sqrt(R()) * 1.1; scuffs.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, r: 0.04 + R() * 0.1, lit: R() < 0.5 }); }
    const wob = Array.from({ length: 48 }, () => R());
    void rockSh;

    function floor() {
      const sc = V.cam.sc;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      const rect = (k) => [P(-XW * k, -YW * k, 0), P(XW * k, -YW * k, 0), P(XW * k, YW * k, 0), P(-XW * k, YW * k, 0)];
      K.path(rect(1)); ctx.fillStyle = C.earth; ctx.fill();
      ctx.save(); K.path(rect(1)); ctx.clip();
      ctx.beginPath(); K.poly(K.ring(0.95, 48, wob, 0.12, -0.6, -0.4)); ctx.fillStyle = C.earthLit; ctx.fill();
      ctx.beginPath(); K.poly(K.ring(0.45, 48, wob, 0.2, -2.0, -1.2)); ctx.fillStyle = C.pool; ctx.fill();
      ctx.restore();
      const lit = new Path2D(), dark = new Path2D();
      for (const f of scuffs) { const p = P(f.x, f.y, 0), r = f.r * sc; const pa = f.lit ? lit : dark; pa.moveTo(p.x + r, p.y); pa.ellipse(p.x, p.y, r, r * 0.45, 0, 0, TAU); }
      ctx.fillStyle = '#76695a'; ctx.fill(lit); ctx.fillStyle = '#3a322a'; ctx.fill(dark);
      // chalk: the bout rectangle, the centre line and circle, start marks
      ctx.strokeStyle = C.chalk; ctx.lineWidth = K.lw(0.06, 1.2); ctx.lineCap = 'round';
      ctx.setLineDash([sc * 0.9, sc * 0.18]);
      K.path([P(-7, -4.2, 0), P(7, -4.2, 0), P(7, 4.2, 0), P(-7, 4.2, 0)]); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); const c0 = P(0, -4.2, 0), c1 = P(0, 4.2, 0); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.stroke();
      ctx.beginPath(); K.poly(Array.from({ length: 28 }, (_, i) => P(Math.cos((i / 28) * TAU) * 1.8, Math.sin((i / 28) * TAU) * 1.8, 0))); ctx.stroke();
      ctx.beginPath();
      for (const sx of [-5.5, 5.5]) for (const y of [-1.4, 0.2, 1.6]) { const a = P(sx - 0.25, y - 0.25, 0), b = P(sx + 0.25, y + 0.25, 0), c = P(sx - 0.25, y + 0.25, 0), d = P(sx + 0.25, y - 0.25, 0); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); }
      ctx.stroke();
    }
    // The back of the Guild office beyond the north wall, with the banner.
    function office() {
      const sc = V.cam.sc;
      const y = -YW - 1.4, x0 = -XW + 1, x1 = XW - 1;
      const k = K.tall(0, y), h = 4.4 * Math.max(0.3, k);
      if (K.depth(0, y) > 0) return;
      const b0 = P(x0, y, 0), b1 = P(x1, y, 0), t0 = P(x0, y, h), t1 = P(x1, y, h), r0 = P(x0, y - 2.2, h + 1.6), r1 = P(x1, y - 2.2, h + 1.6);
      K.path([r0, r1, t1, t0]); ctx.fillStyle = C.roof; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.05, 1.5); ctx.stroke();
      K.path([b0, b1, t1, t0]); ctx.fillStyle = C.office; ctx.fill(); ctx.stroke();
      // timber framing
      ctx.lineCap = 'butt';
      for (const [w, col] of [[0.2, INK], [0.13, C.timber]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 1.5); ctx.beginPath();
        for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 6) { const a = P(x, y, 0), b = P(x, y, h); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        const m0 = P(x0, y, h * 0.5), m1 = P(x1, y, h * 0.5); ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y);
        ctx.stroke();
      }
      // lit windows and the back door by the gate
      const step = (x1 - x0) / 6;
      for (let i = 0; i < 6; i++) {
        if (i === 2 || i === 3) continue;
        const cx = x0 + step * (i + 0.5);
        const q = [P(cx - 0.4, y, h * 0.62), P(cx + 0.4, y, h * 0.62), P(cx + 0.4, y, h * 0.85), P(cx - 0.4, y, h * 0.85)];
        K.path(q); ctx.fillStyle = INK; ctx.fill(); K.path(q.map((p) => ({ x: p.x, y: p.y + 1 }))); ctx.fillStyle = C.window; ctx.globalAlpha = 0.75; ctx.fill(); ctx.globalAlpha = 1;
      }
      const d = [P(-0.7, y, 0), P(0.7, y, 0), P(0.7, y, h * 0.42), P(-0.7, y, h * 0.42)];
      K.path(d); ctx.fillStyle = '#17110e'; ctx.fill(); ctx.strokeStyle = C.timberLit; ctx.lineWidth = K.lw(0.05, 1); ctx.stroke();
      // the banner: a sword crossed with a staff, scales beneath
      const bx = 2.6, bt = h * 0.95, bb = h * 0.32;
      const tl = P(bx - 0.75, y + 0.05, bt), tr = P(bx + 0.75, y + 0.05, bt), br = P(bx + 0.75, y + 0.05, bb + 0.3), bm = P(bx, y + 0.05, bb), bl = P(bx - 0.75, y + 0.05, bb + 0.3);
      const sway = Math.sin(V.time * 1.3) * sc * 0.03;
      K.path([tl, tr, { x: br.x + sway, y: br.y }, { x: bm.x + sway, y: bm.y }, { x: bl.x + sway, y: bl.y }]);
      ctx.fillStyle = C.banner; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.2); ctx.stroke();
      ctx.save(); ctx.clip(); ctx.fillStyle = C.bannerSh; ctx.fillRect(tl.x + (tr.x - tl.x) * 0.62, tl.y, (tr.x - tl.x) * 0.5, bm.y - tl.y + 4); ctx.restore();
      ctx.strokeStyle = C.timberLit; ctx.lineWidth = K.lw(0.08, 1.5); ctx.beginPath(); ctx.moveTo(tl.x - sc * 0.15, tl.y); ctx.lineTo(tr.x + sc * 0.15, tr.y); ctx.stroke();
      const cx = (tl.x + tr.x) / 2 + sway * 0.5, cy = tl.y + (bm.y - tl.y) * 0.38, e = sc * 0.42;
      ctx.strokeStyle = C.emblem; ctx.lineCap = 'round'; ctx.lineWidth = K.lw(0.06, 1.2);
      ctx.beginPath();
      ctx.moveTo(cx - e * 0.7, cy + e * 0.7); ctx.lineTo(cx + e * 0.7, cy - e * 0.7); // sword
      ctx.moveTo(cx + e * 0.25, cy + e * 0.05); ctx.lineTo(cx + e * 0.05, cy - e * 0.15); // guard
      ctx.moveTo(cx + e * 0.7, cy + e * 0.7); ctx.lineTo(cx - e * 0.7, cy - e * 0.7); // staff
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - e * 0.75, cy - e * 0.75, e * 0.12, 0, TAU); ctx.stroke();
      // scales
      const sy = cy + e * 1.05;
      ctx.lineWidth = K.lw(0.04, 1);
      ctx.beginPath(); ctx.moveTo(cx, sy - e * 0.25); ctx.lineTo(cx, sy + e * 0.25); ctx.moveTo(cx - e * 0.5, sy - e * 0.15); ctx.lineTo(cx + e * 0.5, sy - e * 0.15);
      for (const sx of [-0.5, 0.5]) { ctx.moveTo(cx + sx * e, sy - e * 0.15); ctx.lineTo(cx + sx * e - e * 0.15, sy + e * 0.1); ctx.moveTo(cx + sx * e, sy - e * 0.15); ctx.lineTo(cx + sx * e + e * 0.15, sy + e * 0.1); ctx.moveTo(cx + sx * e - e * 0.18, sy + e * 0.1); ctx.lineTo(cx + sx * e + e * 0.18, sy + e * 0.1); }
      ctx.stroke();
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'target' ? 1.6 : 0.9);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.25, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.25, o.r * sc * V.cam.pitch, 0, 0, TAU);
      }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() { floor(); office(); shadows(); }
    function drawSeg(g) {
      const [x0, y0, x1, y1] = g, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
      if (K.off(P(mx, my, 0), V.cam.sc * 4)) return;
      const len = Math.hypot(x1 - x0, y1 - y0) / 2, rot = Math.atan2(y1 - y0, x1 - x0);
      const k = Math.max(0.35, K.tall(mx, my));
      K.box(mx, my, len + 0.18, 0.28, rot, 0, 0.95 * k, C.wall, (face, pts) => {
        const [a, b, c, d] = pts;
        ctx.strokeStyle = 'rgba(14,10,8,0.55)'; ctx.lineWidth = K.lw(0.015, 0.8); ctx.beginPath();
        ctx.moveTo(a.x + (d.x - a.x) * 0.5, a.y + (d.y - a.y) * 0.5); ctx.lineTo(b.x + (c.x - b.x) * 0.5, b.y + (c.y - b.y) * 0.5);
        if (face >= 0) for (const f of [0.2, 0.45, 0.7, 0.9]) { const o2 = f > 0.5 ? 0.5 : 0; ctx.moveTo(a.x + (b.x - a.x) * f + (d.x - a.x) * o2, a.y + (b.y - a.y) * f + (d.y - a.y) * o2); ctx.lineTo(a.x + (b.x - a.x) * f + (d.x - a.x) * (o2 + 0.5), a.y + (b.y - a.y) * f + (d.y - a.y) * (o2 + 0.5)); }
        ctx.stroke();
      });
    }
    function drawBlock(o) {
      const bl = blocks.get(o);
      if (K.off(P(o.x, o.y, 0), V.cam.sc * 3)) return;
      const hs = o.r * 0.72;
      K.box(o.x, o.y, hs, hs, bl.rot, 0, hs * 1.6, C.block, (face, pts) => {
        if (face !== -1) return;
        // a chalked number on top
        const c = { x: (pts[0].x + pts[2].x) / 2, y: (pts[0].y + pts[2].y) / 2 };
        ctx.strokeStyle = C.chalk; ctx.lineWidth = K.lw(0.04, 1); ctx.beginPath();
        for (let i = 0; i < bl.n; i++) { const x = c.x + (i - (bl.n - 1) / 2) * V.cam.sc * 0.12; ctx.moveTo(x, c.y - V.cam.sc * 0.1); ctx.lineTo(x, c.y + V.cam.sc * 0.08); }
        ctx.stroke();
      });
    }
    function drawTarget(o) {
      const sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 3)) return;
      // tripod legs, then a round straw boss facing the yard
      const c = P(o.x, o.y, 1.15), feet = [[-0.35, 0.25], [0.35, 0.25], [0, -0.4]].map(([dx, dy]) => P(o.x + dx, o.y + dy, 0));
      ctx.lineCap = 'round';
      for (const [w, col] of [[0.12, INK], [0.07, C.wood]]) { ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 1.5); ctx.beginPath(); for (const f of feet) { ctx.moveTo(f.x, f.y); ctx.lineTo(c.x, c.y - sc * 0.2); } ctx.stroke(); }
      const r = 0.58 * sc;
      const rings = [[1, '#b9a273'], [0.78, '#e6dcc4'], [0.56, '#8e1621'], [0.34, '#e6dcc4'], [0.14, '#8e1621']];
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(c.x, c.y, r + 2.5, r * 0.94 + 2.5, 0, 0, TAU); ctx.fill();
      for (const [k, col] of rings) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(c.x, c.y, r * k, r * 0.94 * k, 0, 0, TAU); ctx.fill(); }
      // straw texture and the cel shadow on the lower right
      ctx.fillStyle = 'rgba(30,20,10,0.35)'; ctx.beginPath(); ctx.ellipse(c.x + r * 0.25, c.y + r * 0.25, r * 0.85, r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(40,28,14,0.5)'; ctx.lineWidth = K.lw(0.012, 0.7); ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.moveTo(c.x + Math.cos(a) * r * 0.82, c.y + Math.sin(a) * r * 0.78); ctx.lineTo(c.x + Math.cos(a) * r * 0.98, c.y + Math.sin(a) * r * 0.92); }
      ctx.stroke();
      // two arrows stuck in it
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.2); ctx.beginPath();
      ctx.moveTo(c.x - r * 0.2, c.y + r * 0.1); ctx.lineTo(c.x - r * 0.75, c.y - r * 0.15); ctx.moveTo(c.x + r * 0.3, c.y - r * 0.35); ctx.lineTo(c.x + r * 0.85, c.y - r * 0.65); ctx.stroke();
      ctx.strokeStyle = '#d8c8b0'; ctx.lineWidth = K.lw(0.02, 0.8); ctx.stroke();
    }
    function drawRack(rk) {
      const sc = V.cam.sc;
      if (K.off(P(rk.x, rk.y, 0), sc * 3)) return;
      const c = Math.cos(rk.rot), s2 = Math.sin(rk.rot);
      const at = (u, z) => P(rk.x + c * u, rk.y + s2 * u, z);
      ctx.lineCap = 'round';
      for (const [w, col] of [[0.12, INK], [0.07, C.wood]]) {
        ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 1.5); ctx.beginPath();
        for (const u of [-0.8, 0.8]) { const a = at(u, 0), b = at(u, 1.3); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        for (const z of [0.35, 1.15]) { const a = at(-0.9, z), b = at(0.9, z); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        ctx.stroke();
      }
      // practice swords and staves leaning in it
      for (let i = 0; i < 5; i++) {
        const u = -0.6 + i * 0.3, b = at(u, 0.05), t = at(u + 0.12, i % 2 ? 1.6 : 1.4);
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.08, 1.5); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); ctx.stroke();
        ctx.strokeStyle = i % 2 ? C.woodLit : '#b0a898'; ctx.lineWidth = K.lw(0.04, 1); ctx.stroke();
      }
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'target') out.push({ d, f: () => drawTarget(o) });
        else out.push({ d, f: () => drawBlock(o) });
      }
      for (const g of segs) out.push({ d: P((g[0] + g[2]) / 2, (g[1] + g[3]) / 2, 0).d, f: () => drawSeg(g) });
      for (const rk of racks) out.push({ d: P(rk.x, rk.y, 0).d, f: () => drawRack(rk) });
      void s;
      return out;
    }
    const overlay = K.overlay({
      vig: [0.22, 0.6], vigCol: '12,8,6',
      paint(c, W, H) { const g = c.createLinearGradient(0, 0, 0, H * 0.5); g.addColorStop(0, 'rgba(240,210,170,0.1)'); g.addColorStop(1, 'rgba(240,210,170,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H * 0.5); },
    });
    const motes = K.motes(16, 101);
    function drawAtmosphere() { overlay.draw(); K.drawMotes(motes, ['rgba(240,220,190,0.35)']); }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ deep
  // Dungeon: the Deep Passage behind the quarry cave. A narrow natural
  // cavern, darker than the chamber: goblin scrawls of copied glyphs glowing
  // on the walls, bone and junk piles, stolen goods, a few torches.
  function deep(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(113);
    const C = {
      bg: '#0b0a0a', floor: '#1c1918', floorLit: '#25211f', warm: '#3a2e25', warm2: '#4a3a2e',
      wall: '#1a1716', wallLit: '#2c2522', wallWarm: '#3f3229', wallShade: '#0d0b0b', wallTop: '#080707',
      rock: { base: '#24201e', mid: '#352e2b', lit: '#574a41', rim: '#e8b07a' },
      crate: { lit: '#6a5038', shade: '#35271b', top: '#7d6043', rim: '#f0c08e' },
      bone: '#d8ccb4', boneSh: '#8a7e6a', scrawl: '#e070ff', scrawl2: '#9cf07a', timber: '#4a3525', iron: '#2b2a2e',
      sack: { lit: '#8a7856', shade: '#4e4330', grain: '#c8b47e' }, shadowA: 'rgba(4,3,3,0.55)',
    };
    const WALL_K = 1.08, WALL_N = 64;
    const exitA = Math.atan2(A.exit.y / A.ry, A.exit.x / A.rx);
    const angDist = (a, b) => { const d = Math.abs(((a - b) % TAU + TAU) % TAU); return Math.min(d, TAU - d); };
    const wall = [];
    for (let i = 0; i < WALL_N; i++) {
      const a = (i / WALL_N) * TAU;
      wall.push({ a, k: WALL_K + (R() - 0.5) * 0.06, kt: WALL_K + 0.14 + R() * 0.18, h: 3.2 + R() * 1.4, j: R(), tunnel: angDist(a, exitA) < 0.2 || angDist(a, 0) < 0.14 });
    }
    const wpos = (w, k) => [Math.cos(w.a) * A.rx * k, Math.sin(w.a) * A.ry * k];
    const TORCH = [-1.9, -1.0, 1.25, 2.3].map((a) => ({ a, ph: R() * TAU }));
    const flick = (t) => 0.85 + 0.15 * Math.sin(V.time * 9 + t.ph) * Math.sin(V.time * 3.7 + t.ph * 2);
    // Scrawls: copied glyphs scratched onto the wall faces (angle, height).
    const SCRAWL = Array.from({ length: 11 }, (_, i) => ({ a: -2.9 + i * 0.52 + R() * 0.2, z: 0.9 + R() * 1.2, s: 0.35 + R() * 0.3, kind: i % 3, ph: R() * TAU, c: i % 4 === 3 ? 1 : 0 }));
    // Piles of bones and junk along the wall foot; stolen goods.
    const piles = [];
    for (let i = 0; i < 9; i++) {
      const a = R() * TAU;
      if (angDist(a, exitA) < 0.4 || angDist(a, 0) < 0.3) continue;
      const k = 0.9 + R() * 0.08;
      piles.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, r: 0.4 + R() * 0.4, bones: Array.from({ length: 7 }, () => [R() - 0.5, R() - 0.5, R() * 3, 0.15 + R() * 0.2]) });
    }
    const goods = [[3.8, -3.6, 0.3, 0.5], [6.4, -0.6, 0.28, 2.2], [-6.6, 2.6, 0.32, -0.3]].map(([x, y, r, rot]) => ({ x, y, r, rot }));
    const stal = [];
    for (let i = 0; i < 22; i++) {
      const a = R() * TAU;
      if (angDist(a, exitA) < 0.3 || angDist(a, 0) < 0.25) continue;
      const k = 0.96 + R() * 0.07;
      stal.push({ x: Math.cos(a) * A.rx * k, y: Math.sin(a) * A.ry * k, r: 0.12 + R() * 0.22, h: 0.4 + R() * 1.0 });
    }
    const crate = new Map(), rockSh = new Map();
    for (const o of A.obstacles) { if (o.kind === 'crate') crate.set(o, R() * 1.5); if (o.kind === 'rock') rockSh.set(o, K.rockShape(R, 9)); }
    const cracks = [];
    for (let i = 0; i < 14; i++) { const a = R() * TAU, k = 0.2 + R() * 0.75; cracks.push(crackLine(R, Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, 0.8 + R() * 1.8, R() * TAU)); }
    const wob = Array.from({ length: 48 }, () => R());

    function torchPos(t, z) {
      const i = Math.round(((t.a % TAU + TAU) % TAU) / TAU * WALL_N) % WALL_N, w = wall[i];
      const h = w.h * K.tall(...wpos(w, w.k));
      const k = w.k + (w.kt - w.k) * Math.min(1, z / h) - 0.02;
      return { x: Math.cos(t.a) * A.rx * k, y: Math.sin(t.a) * A.ry * k, z: Math.min(z, h * 0.75), h };
    }
    function floor() {
      const sc = V.cam.sc;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      ctx.beginPath(); K.poly(K.ring(WALL_K + 0.02, 48, wob, 0.04)); ctx.fillStyle = C.floor; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.beginPath(); K.poly(K.ring(0.7, 48, wob, 0.15, -0.5, 0)); ctx.fillStyle = C.floorLit; ctx.fill();
      for (const [r, col] of [[2.1, C.warm], [1.0, C.warm2]]) {
        ctx.beginPath();
        for (const t of TORCH) { const tp = torchPos(t, 2), q = P(tp.x * 0.86, tp.y * 0.86, 0), rr = r * sc * (0.96 + 0.04 * flick(t)); ctx.moveTo(q.x + rr, q.y); ctx.ellipse(q.x, q.y, rr, rr * V.cam.pitch, 0, 0, TAU); }
        ctx.fillStyle = col; ctx.fill();
      }
      ctx.strokeStyle = 'rgba(4,3,3,0.8)'; ctx.lineWidth = K.lw(0.03, 1); ctx.lineCap = 'round';
      ctx.beginPath();
      for (const c of cracks) c.forEach(([x, y], i) => { const p = P(x, y, 0); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
      ctx.stroke();
      // a trail of scattered grain toward the passage, and scratch marks
      ctx.fillStyle = 'rgba(200,180,126,0.5)';
      for (let i = 0; i < 40; i++) { const x = 6 - i * 0.42, y = Math.sin(i * 1.7) * 0.5 + i * 0.012; const p = P(x, y, 0); ctx.fillRect(p.x, p.y, K.lw(0.04, 1), K.lw(0.03, 1)); }
      ctx.restore();
    }
    function walls() {
      const ca = Math.cos(V.cam.ang), sa = Math.sin(V.cam.ang);
      const segs = [];
      for (let i = 0; i < WALL_N; i++) {
        const w = wall[i], w2 = wall[(i + 1) % WALL_N];
        const [x0, y0] = wpos(w, w.k), [x1, y1] = wpos(w2, w2.k);
        const f0 = K.tall(x0, y0), f1 = K.tall(x1, y1);
        const [tx0, ty0] = wpos(w, w.k + (w.kt - w.k) * f0), [tx1, ty1] = wpos(w2, w2.k + (w2.kt - w2.k) * f1);
        const nx = -(Math.cos(w.a) / A.rx), ny = -(Math.sin(w.a) / A.ry), l = Math.hypot(nx, ny);
        segs.push({ i, w, w2, b0: P(x0, y0, 0), b1: P(x1, y1, 0), t0: P(tx0, ty0, w.h * f0), t1: P(tx1, ty1, w2.h * f1), d: K.depth(x0 + x1, y0 + y1) / 2, facing: (nx / l) * sa + (ny / l) * ca, sx: (nx / l) * ca - (ny / l) * sa });
      }
      segs.sort((a, b) => a.d - b.d);
      const torchNear = (a) => TORCH.reduce((m, t) => Math.min(m, angDist(a, t.a)), 9);
      for (const g of segs) {
        ctx.beginPath(); ctx.moveTo(g.b0.x, g.b0.y); ctx.lineTo(g.b1.x, g.b1.y); ctx.lineTo(g.t1.x, g.t1.y); ctx.lineTo(g.t0.x, g.t0.y); ctx.closePath();
        let col = C.wallTop;
        if (g.facing > 0) { const tn = torchNear(g.w.a); col = tn < 0.2 ? C.wallWarm : g.sx > 0.35 ? C.wallLit : g.sx < -0.45 ? C.wallShade : g.i % 3 === 0 ? C.wallLit : C.wall; }
        if (g.w.tunnel && g.facing > 0) col = '#030202';
        ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(2,2,2,0.7)'; ctx.lineWidth = K.lw(0.022, 0.8);
      ctx.beginPath();
      for (const g of segs) {
        if (g.facing <= 0 || g.w.tunnel) continue;
        for (const f of [0.25, 0.55]) { ctx.moveTo(g.b0.x + (g.t0.x - g.b0.x) * f, g.b0.y + (g.t0.y - g.b0.y) * f); ctx.lineTo(g.b1.x + (g.t1.x - g.b1.x) * (f + 0.05), g.b1.y + (g.t1.y - g.b1.y) * (f + 0.05)); }
      }
      ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.05, 1.5); ctx.lineJoin = 'round';
      ctx.beginPath(); for (const g of segs) { ctx.moveTo(g.t0.x, g.t0.y); ctx.lineTo(g.t1.x, g.t1.y); } ctx.stroke();
      ctx.strokeStyle = C.rock.rim; ctx.globalAlpha = 0.35; ctx.lineWidth = K.lw(0.02);
      ctx.beginPath(); for (const g of segs) { if (g.facing <= 0 || torchNear(g.w.a) > 0.3) continue; ctx.moveTo(g.t0.x, g.t0.y + 2); ctx.lineTo(g.t1.x, g.t1.y + 2); } ctx.stroke();
      ctx.globalAlpha = 1;
      scrawls();
      for (const t of TORCH) torch(t);
    }
    // Copied glyphs: crooked rings and strokes, glowing in two wrong colours.
    function scrawls() {
      const sc = V.cam.sc, t = V.time;
      ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
      for (const s of SCRAWL) {
        const w = { a: s.a, k: WALL_K, kt: WALL_K + 0.2 };
        const i = Math.round(((s.a % TAU + TAU) % TAU) / TAU * WALL_N) % WALL_N, ww = wall[i];
        const [x, y] = wpos(w, ww.k + (ww.kt - ww.k) * 0.35 - 0.03);
        const facing = -(Math.cos(s.a) / A.rx) * Math.sin(V.cam.ang) - (Math.sin(s.a) / A.ry) * Math.cos(V.cam.ang);
        const hmax = ww.h * K.tall(x, y);
        if (facing <= 0 || hmax < s.z + s.s * 0.6) continue;
        const c = P(x, y, s.z);
        if (K.off(c, sc)) continue;
        const r = s.s * sc * 0.5, col = s.c ? C.scrawl2 : C.scrawl;
        const a = 0.55 + 0.3 * Math.sin(t * 1.7 + s.ph) + (Math.sin(t * 7 + s.ph) > 0.96 ? -0.4 : 0);
        ctx.fillStyle = rgbaHex(col, 0.12 * a); ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 2, r * 1.6, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgbaHex(col, Math.max(0.15, a)); ctx.lineWidth = K.lw(0.035, 1);
        ctx.beginPath();
        if (s.kind === 0) { ctx.ellipse(c.x, c.y, r, r * 0.85, 0.2, 0.3, TAU - 0.2); ctx.moveTo(c.x - r * 0.5, c.y + r * 0.4); ctx.lineTo(c.x, c.y - r * 0.5); ctx.lineTo(c.x + r * 0.5, c.y + r * 0.4); }
        else if (s.kind === 1) { ctx.moveTo(c.x - r, c.y); ctx.lineTo(c.x + r, c.y - r * 0.2); ctx.moveTo(c.x - r * 0.4, c.y - r * 0.8); ctx.lineTo(c.x - r * 0.2, c.y + r * 0.8); ctx.moveTo(c.x + r * 0.3, c.y - r * 0.7); ctx.lineTo(c.x + r * 0.6, c.y + r * 0.6); ctx.arc(c.x, c.y, r * 0.25, 0, TAU); }
        else { for (let k = 0; k < 5; k++) { const q = (k / 5) * TAU; ctx.moveTo(c.x + Math.cos(q) * r * 0.3, c.y + Math.sin(q) * r * 0.3); ctx.lineTo(c.x + Math.cos(q + 0.5) * r, c.y + Math.sin(q + 0.5) * r * 0.8); } }
        ctx.stroke();
      }
    }
    function torch(t) {
      const sc = V.cam.sc, tp = torchPos(t, 2);
      if (tp.h < 1.2) return;
      const p = P(tp.x, tp.y, tp.z), base = P(tp.x, tp.y, tp.z - 0.45);
      if (K.off(p, sc * 2)) return;
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.09, 2); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = '#7a5939'; ctx.lineWidth = K.lw(0.045, 1); ctx.stroke();
      const fk = flick(t), hgt = sc * 0.4 * fk, wd = sc * 0.12, sway = Math.sin(V.time * 6 + t.ph) * sc * 0.04;
      const flame = (w, h, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.quadraticCurveTo(p.x - w * 0.9, p.y - h * 0.55, p.x + sway, p.y - h); ctx.quadraticCurveTo(p.x + w * 0.9, p.y - h * 0.5, p.x + w, p.y); ctx.quadraticCurveTo(p.x, p.y + w * 0.6, p.x - w, p.y); ctx.fill(); };
      flame(wd * 1.25, hgt * 1.1, INK); flame(wd, hgt, '#ff8a3a'); flame(wd * 0.55, hgt * 0.6, '#ffe2a0');
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) { const b = P(o.x, o.y, 0), off = K.shadowOff(o.r); ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.15, b.y + off.y * 0.5); ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.15, o.r * sc * V.cam.pitch, 0, 0, TAU); }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() { floor(); shadows(); walls(); }
    function drawPile(pl) {
      const sc = V.cam.sc, p = P(pl.x, pl.y, 0);
      if (K.off(p, sc * 2)) return;
      // a heap of junk with bones poking out
      const r = pl.r * sc;
      ctx.fillStyle = '#2a2420'; ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2);
      ctx.beginPath(); ctx.moveTo(p.x - r * 1.3, p.y); ctx.quadraticCurveTo(p.x - r * 0.6, p.y - r * 1.1, p.x, p.y - r * 0.9); ctx.quadraticCurveTo(p.x + r * 0.8, p.y - r * 1.0, p.x + r * 1.3, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.lineCap = 'round';
      for (const [dx, dy, a, l] of pl.bones) {
        const x = p.x + dx * r * 1.6, y = p.y - r * 0.35 + dy * r * 0.7, L2 = l * sc;
        const ex = x + Math.cos(a) * L2, ey = y + Math.sin(a) * L2 * 0.5;
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.07, 2); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = C.bone; ctx.lineWidth = K.lw(0.035, 1); ctx.stroke();
        ctx.fillStyle = C.bone; for (const q of [[x, y], [ex, ey]]) { ctx.beginPath(); ctx.arc(q[0], q[1], K.lw(0.035, 1), 0, TAU); ctx.fill(); }
      }
      // a skull on top
      const sk = { x: p.x + r * 0.1, y: p.y - r * 0.85 };
      ctx.fillStyle = C.bone; ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.025, 1);
      ctx.beginPath(); ctx.ellipse(sk.x, sk.y, sc * 0.11, sc * 0.09, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(sk.x - sc * 0.04, sk.y, sc * 0.025, 0, TAU); ctx.arc(sk.x + sc * 0.04, sk.y, sc * 0.025, 0, TAU); ctx.fill();
    }
    function drawCrate(o) {
      const rot = crate.get(o), hs = o.r * 0.74;
      if (K.off(P(o.x, o.y, 0), V.cam.sc * 3)) return;
      K.box(o.x, o.y, hs, hs, rot, 0, hs * 1.7, C.crate, (face, pts) => {
        const [a, b, c, d] = pts;
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.06, 1.5); ctx.beginPath(); K.poly(pts); ctx.stroke();
        if (face >= 0) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.strokeStyle = '#8d6b49'; ctx.lineWidth = K.lw(0.03, 1); ctx.stroke(); }
        // a goblin mark daubed on the side
        if (face >= 0) { const m = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 }; ctx.strokeStyle = 'rgba(160,30,40,0.8)'; ctx.lineWidth = K.lw(0.04, 1); ctx.beginPath(); ctx.moveTo(m.x - 4, m.y - 4); ctx.lineTo(m.x + 4, m.y + 4); ctx.moveTo(m.x + 4, m.y - 4); ctx.lineTo(m.x - 4, m.y + 4); ctx.stroke(); }
        void b; void d;
      });
    }
    function drawStal(st) {
      const sc = V.cam.sc, b = P(st.x, st.y, 0);
      if (K.off(b, sc * 2)) return;
      const t = P(st.x, st.y, st.h * K.tall(st.x, st.y)), w = st.r * sc;
      ctx.beginPath(); ctx.moveTo(b.x - w, b.y); ctx.quadraticCurveTo(b.x - w * 0.4, (b.y + t.y) / 2, t.x, t.y); ctx.quadraticCurveTo(b.x + w * 0.3, (b.y + t.y) / 2, b.x + w, b.y); ctx.closePath();
      ctx.fillStyle = C.wall; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = C.wallLit; ctx.fillRect(b.x - w, t.y, w * 0.6, b.y - t.y + 2); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); ctx.stroke();
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'crate') out.push({ d, f: () => drawCrate(o) });
        else out.push({ d, f: () => K.drawRock(o.x, o.y, o.r, rockSh.get(o), C.rock, 0.5, 0.95) });
      }
      for (const pl of piles) out.push({ d: P(pl.x, pl.y, 0).d, f: () => drawPile(pl) });
      for (const g of goods) out.push({ d: P(g.x, g.y, 0).d, f: () => drawSack(V, K, g.x, g.y, g.r, g.rot, C.sack, false) });
      for (const st of stal) out.push({ d: P(st.x, st.y, 0).d, f: () => drawStal(st) });
      void s;
      return out;
    }
    const overlay = K.overlay({ vig: [0.5, 0.92], vigCol: '3,2,2', tone: 1.15, toneCol: 'rgba(4,3,3,0.5)' });
    const motes = K.motes(14, 117, (r) => (r() < 0.5 ? 0 : 1));
    function drawAtmosphere() {
      const sc = V.cam.sc;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const t of TORCH) {
        const tp = torchPos(t, 2);
        if (tp.h < 1.2) continue;
        const p = P(tp.x, tp.y, tp.z + 0.15), r = sc * 2.2 * flick(t);
        if (K.off(p, r)) continue;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, 'rgba(255,150,70,0.3)'); g.addColorStop(0.35, 'rgba(255,120,50,0.09)'); g.addColorStop(1, 'rgba(255,120,50,0)');
        ctx.fillStyle = g; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.restore();
      overlay.draw();
      K.drawMotes(motes, ['rgba(225,215,200,0.25)', 'rgba(224,112,255,0.45)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ tavern
  // Chapter One: the tavern by the Guild office, evening. A cutaway set: the
  // walls on the far side of the camera stand full height, the near ones are
  // left out, so the room reads like an anime interior shot. Warm lantern
  // pools, a hearth, the bar, and a window onto the street and the Guild's
  // notice board. Staged scenes can set s.glow (0..1+, the formation's purple
  // light through the window) and s.door (0..1, the street door open).
  function tavern(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A);
    const R = Sim.makeRng(131);
    const C = {
      bg: '#0b0807', floor: '#3b2a1f', floorLit: '#4a3526', rug: ['#5a2420', '#3a1614', '#b08a52'],
      plaster: ['#5c4838', '#463628'], wains: ['#3a281c', '#2a1c14'], timber: '#22160f', timberLit: '#5a3f2c',
      wood: { lit: '#80593a', shade: '#47301f', top: '#946a46', rim: '#f6d6aa' },
      bar: { lit: '#5c3d27', shade: '#2f2018', top: '#86603d', rim: '#f6d6aa' },
      stone: { lit: '#5e524b', shade: '#332b27', top: '#4a403a', rim: '#f2dcc4' },
      keg: { base: '#6a4a30', shade: '#3a2818', lit: '#8c6646', rim: '#f2d2a8', top: '#7a5a3c' },
      stool: ['#6b4a30', '#3a2818'], iron: '#2a2422',
      stew: '#7a3a1c', bowl: ['#b8a084', '#6e5a48'], mug: ['#8a6a48', '#4a3626'], bread: ['#b07a3a', '#6e4620'],
    };
    const XW = 8.6, YN = -5.2, YS = 5.2, WH = 3.0;
    const WALLS = [
      { n: 'N', x0: -XW, y0: YN, x1: XW, y1: YN, nx: 0, ny: 1, lit: 1 },
      { n: 'E', x0: XW, y0: YN, x1: XW, y1: YS, nx: -1, ny: 0, lit: 0.55 },
      { n: 'S', x0: XW, y0: YS, x1: -XW, y1: YS, nx: 0, ny: -1, lit: 0.5 },
      { n: 'W', x0: -XW, y0: YS, x1: -XW, y1: YN, nx: 1, ny: 0, lit: 0.85 },
    ];
    for (const w of WALLS) { w.len = Math.hypot(w.x1 - w.x0, w.y1 - w.y0); w.ux = (w.x1 - w.x0) / w.len; w.uy = (w.y1 - w.y0) / w.len; }
    const wallOf = (n) => WALLS.find((w) => w.n === n);
    // Tables: the two arena tables plus dressing (stages seat people at these).
    const TABLES = [];
    for (const o of A.obstacles) if (o.kind === 'table') TABLES.push({ x: o.x, y: o.y, hw: 1.1, hd: 0.45 });
    TABLES.push({ x: -3.0, y: 2.7, hw: 0.95, hd: 0.42 }, { x: -6.2, y: -3.5, hw: 0.6, hd: 0.42 }, { x: 6.2, y: 2.5, hw: 0.8, hd: 0.42 });
    const bar = A.obstacles.find((o) => o.kind === 'bar') || { x: 4.6, y: -3.2 };
    const BAR = { x: bar.x, y: bar.y, hw: 1.8, hd: 0.36, h: 1.1 };
    const hearth = A.obstacles.find((o) => o.kind === 'hearth') || { x: -6.2, y: 2.6 };
    const HEARTH = { x: (-XW + hearth.x + 0.4) / 2, y: hearth.y, hw: (hearth.x + 0.4 + XW) / 2, hd: 0.95, h: 1.25 };
    // Clutter on the tables: bowls of stew, mugs, bread, candles.
    const CLUTTER = [];
    const put = (kind, x, y) => CLUTTER.push({ kind, x, y, rot: R() * 6 });
    put('bowl', -3.4, -1.48); put('bowl', -3.85, -1.12); put('bowl', -2.15, -1.25); put('mug', -2.9, -1.5); put('mug', -2.4, -0.98);
    put('bread', -2.75, -1.05); put('candle', -3.15, -1.15);
    put('bowl', 1.95, 1.3); put('bowl', 3.0, 1.62); put('mug', 2.5, 1.3); put('mug', 1.75, 1.85); put('candle', 2.4, 1.62);
    put('bowl', -2.4, 2.45); put('mug', -2.9, 2.55); put('bread', -3.5, 2.8); put('candle', -3.1, 2.75);
    put('notes', -6.2, -3.32); put('candle', -6.6, -3.55); put('mug', -5.8, -3.6);
    put('mug', 6.0, 2.4); put('mug', 6.5, 2.65); put('candle', 6.2, 2.5);
    put('mug', 3.4, -3.15); put('mug', 4.7, -3.05); put('mug', 5.6, -3.2); put('jug', 6.1, -3.25);
    const STOOLS = [[-2.6, -0.45], [1.2, 1.6], [3.0, 2.35], [-3.6, 3.35], [-2.0, 3.35], [5.5, 1.85], [6.9, 3.15], [7.05, 2.0], [6.2, -2.4], [-6.9, -3.0]];
    const KEGS = [{ x: 7.75, y: -4.45 }, { x: 7.85, y: -3.6 }, { x: 7.7, y: 4.4 }, { x: 6.9, y: 4.6 }];
    const LANTERNS = [{ x: -3.0, y: -1.2, z: 2.25 }, { x: 2.4, y: 1.6, z: 2.3 }, { x: 4.6, y: -3.0, z: 2.45 }, { x: -3.0, y: 2.7, z: 2.3 }, { x: 6.2, y: 2.5, z: 2.35 }];
    for (const l of LANTERNS) l.ph = R() * 6;
    const cracks = Array.from({ length: 14 }, () => ({ u: R(), v: 1.2 + R() * 1.5, a: R() * 6, l: 0.1 + R() * 0.25 }));
    const planks = Array.from({ length: 60 }, () => R());
    const flick = (ph) => 0.86 + 0.14 * Math.sin(V.time * 9.3 + ph) * Math.sin(V.time * 3.1 + ph * 2);
    const glowOf = (s) => clamp((s && s.glow) || 0, 0, 1.5);
    const lwm = (px) => px / Math.max(1, V.cam.sc); // a screen width in wall-local metres
    const visible = (w) => w.nx * Math.sin(V.cam.ang) + w.ny * Math.cos(V.cam.ang) > 0.06;

    // Draw in a wall's own plane: u metres along the wall, v metres up.
    function onWall(w, fn) {
      const o = P(w.x0, w.y0, 0), a = P(w.x0 + w.ux, w.y0 + w.uy, 0), b = P(w.x0, w.y0, 1);
      ctx.save(); ctx.transform(a.x - o.x, a.y - o.y, b.x - o.x, b.y - o.y, o.x, o.y); fn(); ctx.restore();
    }
    const uOn = (w, x, y) => (x - w.x0) * w.ux + (y - w.y0) * w.uy;

    // ------------------------------------------------------------ floor
    function floor(s) {
      const sc = V.cam.sc;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      const rect = [P(-XW, YN, 0), P(XW, YN, 0), P(XW, YS, 0), P(-XW, YS, 0)];
      K.path(rect); ctx.fillStyle = C.floor; ctx.fill();
      ctx.save(); K.path(rect); ctx.clip();
      // worn, lighter boards down the middle of the room
      ctx.beginPath(); K.poly([P(-6, -3.6, 0), P(6.5, -3.0, 0), P(6.5, 3.2, 0), P(-6, 3.6, 0)]); ctx.fillStyle = C.floorLit; ctx.fill();
      // planks run east-west; staggered joints
      ctx.strokeStyle = 'rgba(14,9,6,0.6)'; ctx.lineWidth = K.lw(0.018, 0.8);
      ctx.beginPath();
      let i = 0;
      for (let y = YN; y <= YS; y += 0.3, i++) {
        const a = P(-XW, y, 0), b = P(XW, y, 0); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        for (let x = -XW + planks[i % 60] * 2.4; x < XW; x += 2.4) { const c = P(x, y, 0), d = P(x, y + 0.3, 0); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); }
      }
      ctx.stroke();
      if (sc > 60) {
        // grain ticks at close range
        ctx.strokeStyle = 'rgba(240,200,150,0.07)'; ctx.beginPath();
        for (let k = 0; k < 60; k++) { const x = -XW + planks[k] * 2 * XW, y = YN + planks[(k * 7) % 60] * (YS - YN); const a = P(x, y + 0.12, 0), b = P(x + 0.7, y + 0.12, 0); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        ctx.stroke();
      }
      // rug before the hearth
      const rug = (k) => [P(-6.4 - k, 1.5 - k, 0), P(-3.9 + k, 1.5 - k, 0), P(-3.9 + k, 3.7 + k, 0), P(-6.4 - k, 3.7 + k, 0)];
      K.path(rug(0)); ctx.fillStyle = C.rug[0]; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1); ctx.stroke();
      K.path(rug(-0.18)); ctx.strokeStyle = C.rug[2]; ctx.globalAlpha = 0.55; ctx.lineWidth = K.lw(0.04, 1); ctx.stroke(); ctx.globalAlpha = 1;
      K.path(rug(-0.4)); ctx.fillStyle = C.rug[1]; ctx.fill();
      // stone hearth slab
      K.path([P(hearth.x + 0.4, 1.4, 0), P(hearth.x + 1.0, 1.4, 0), P(hearth.x + 1.0, 3.8, 0), P(hearth.x + 0.4, 3.8, 0)]);
      ctx.fillStyle = C.stone.shade; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1); ctx.stroke();
      ctx.restore();
      // pooled light on the boards
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pool = (x, y, r, col, a) => {
        const p = P(x, y, 0), rr = r * sc;
        if (K.off(p, rr)) return;
        ctx.save(); ctx.translate(p.x, p.y); ctx.scale(1, V.cam.pitch);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
        g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.55, `rgba(${col},${a * 0.35})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
      };
      for (const l of LANTERNS) pool(l.x, l.y, 2.6, '255,170,90', 0.2 * flick(l.ph));
      pool(hearth.x + 0.8, hearth.y, 3.6, '255,120,50', 0.3 * flick(1.7));
      pool(1.4, YN + 0.9, 1.6, '255,150,70', 0.18);
      // the window's light across the floor: evening blue, or violet
      const g = glowOf(s), gk = Math.min(1, g);
      const wc = g > 0 ? `${Math.round(120 + 50 * gk)},${Math.round(130 - 20 * gk)},255` : '120,140,200';
      const wa = 0.06 + 0.22 * gk;
      const a0 = P(-3, YN, 0), a1 = P(-2.5, YN + 2.6, 0);
      if (Math.hypot(a1.x - a0.x, a1.y - a0.y) > 1) {
        ctx.beginPath(); K.poly([P(-4.1, YN, 0), P(-1.9, YN, 0), P(-1.3, YN + 2.6, 0), P(-3.7, YN + 2.6, 0)]);
        const lg = ctx.createLinearGradient(a0.x, a0.y, a1.x, a1.y);
        lg.addColorStop(0, `rgba(${wc},${wa})`); lg.addColorStop(1, `rgba(${wc},0)`);
        ctx.fillStyle = lg; ctx.fill();
      }
      ctx.restore();
      // shadows under furniture
      ctx.beginPath();
      for (const t of TABLES) { const p = P(t.x + 0.15, t.y + 0.1, 0); ctx.moveTo(p.x + t.hw * sc * 1.1, p.y); ctx.ellipse(p.x, p.y, t.hw * sc * 1.1, (t.hd + 0.3) * sc * V.cam.pitch, 0, 0, TAU); }
      { const p = P(BAR.x, BAR.y + 0.2, 0); ctx.moveTo(p.x + BAR.hw * sc * 1.1, p.y); ctx.ellipse(p.x, p.y, BAR.hw * sc * 1.1, 0.6 * sc * V.cam.pitch, 0, 0, TAU); }
      ctx.fillStyle = 'rgba(8,5,4,0.4)'; ctx.fill();
    }

    // ------------------------------------------------------------ walls
    function wallBase(w) {
      const L = w.len, t = w.lit;
      onWall(w, () => {
        // plaster above, boards below
        ctx.fillStyle = t > 0.7 ? C.plaster[0] : C.plaster[1]; ctx.fillRect(0, 1.0, L, WH - 1.0);
        ctx.fillStyle = t > 0.7 ? C.wains[0] : C.wains[1]; ctx.fillRect(0, 0, L, 1.0);
        // soft light: brighter in the middle, dark towards the top and corners
        const g = ctx.createLinearGradient(0, 0, 0, WH);
        g.addColorStop(0, 'rgba(10,6,4,0.1)'); g.addColorStop(0.45, 'rgba(255,190,120,0.07)'); g.addColorStop(1, 'rgba(8,5,4,0.6)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, L, WH);
        const g2 = ctx.createLinearGradient(0, 0, L, 0);
        g2.addColorStop(0, 'rgba(8,5,4,0.55)'); g2.addColorStop(0.15, 'rgba(8,5,4,0)'); g2.addColorStop(0.85, 'rgba(8,5,4,0)'); g2.addColorStop(1, 'rgba(8,5,4,0.55)');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, L, WH);
        // board seams in the wainscot
        ctx.strokeStyle = 'rgba(8,5,3,0.55)'; ctx.lineWidth = lwm(1);
        ctx.beginPath();
        for (let u = 0.2; u < L; u += 0.24) { ctx.moveTo(u, 0.05); ctx.lineTo(u, 0.95); }
        ctx.stroke();
        // plaster cracks
        ctx.strokeStyle = 'rgba(20,12,8,0.45)'; ctx.beginPath();
        for (const c of cracks) { const u = c.u * L; ctx.moveTo(u, c.v); ctx.lineTo(u + Math.cos(c.a) * c.l, c.v + Math.sin(c.a) * c.l * 0.6); ctx.lineTo(u + Math.cos(c.a + 0.6) * c.l * 1.6, c.v + Math.sin(c.a + 0.6) * c.l); }
        ctx.stroke();
      });
    }
    function wallFrame(w) {
      const L = w.len;
      onWall(w, () => {
        const post = (u) => {
          ctx.fillStyle = INK; ctx.fillRect(u - 0.12, 0, 0.24, WH + 0.1);
          ctx.fillStyle = C.timber; ctx.fillRect(u - 0.1, 0, 0.2, WH + 0.1);
          ctx.fillStyle = C.timberLit; ctx.globalAlpha = 0.5; ctx.fillRect(u - 0.1, 0, 0.05, WH + 0.1); ctx.globalAlpha = 1;
        };
        const n = Math.round(L / 2.15);
        for (let i = 0; i <= n; i++) post((L * i) / n);
        // rails: chair rail and the top plate
        ctx.fillStyle = INK; ctx.fillRect(0, 0.95, L, 0.12); ctx.fillRect(0, WH - 0.2, L, 0.28);
        ctx.fillStyle = C.timber; ctx.fillRect(0, 0.97, L, 0.08); ctx.fillRect(0, WH - 0.18, L, 0.24);
        ctx.fillStyle = C.timberLit; ctx.globalAlpha = 0.45; ctx.fillRect(0, 1.03, L, 0.02); ctx.fillRect(0, WH + 0.04, L, 0.02); ctx.globalAlpha = 1;
        // rafter ends above the plate, then the dark roof
        ctx.fillStyle = '#100a08'; ctx.fillRect(-0.5, WH + 0.1, L + 1, 3);
        for (let u = 0.55; u < L; u += 1.1) { ctx.fillStyle = INK; ctx.fillRect(u - 0.13, WH + 0.08, 0.26, 0.3); ctx.fillStyle = '#2c1d14'; ctx.fillRect(u - 0.1, WH + 0.1, 0.2, 0.24); }
        // a brace in some panels
        ctx.strokeStyle = INK; ctx.lineWidth = 0.16; ctx.beginPath();
        for (let i = 0; i < n; i += 3) { const u = (L * i) / n; ctx.moveTo(u + 0.1, WH - 0.7); ctx.lineTo(u + 0.6, WH - 0.15); }
        ctx.stroke();
        ctx.strokeStyle = C.timber; ctx.lineWidth = 0.11; ctx.stroke();
      });
    }

    function windowOn(w, ua, ub, v0, v1, s, street) {
      const u0 = Math.min(ua, ub), u1 = Math.max(ua, ub);
      const g = glowOf(s), gk = Math.min(1, g);
      onWall(w, () => {
        ctx.fillStyle = INK; ctx.fillRect(u0 - 0.16, v0 - 0.2, u1 - u0 + 0.32, v1 - v0 + 0.36);
        ctx.fillStyle = C.timber; ctx.fillRect(u0 - 0.12, v0 - 0.16, u1 - u0 + 0.24, v1 - v0 + 0.28);
        ctx.save();
        ctx.beginPath(); ctx.rect(u0, v0, u1 - u0, v1 - v0); ctx.clip();
        // evening sky over the street
        const sky = ctx.createLinearGradient(0, v1, 0, v0);
        sky.addColorStop(0, gk > 0 ? `rgb(${Math.round(30 + 40 * gk)},${Math.round(28 + 6 * gk)},${Math.round(60 + 60 * gk)})` : '#1e2040');
        sky.addColorStop(0.65, gk > 0 ? `rgb(${Math.round(80 + 60 * gk)},${Math.round(60 + 10 * gk)},${Math.round(100 + 90 * gk)})` : '#5a4a64');
        sky.addColorStop(1, gk > 0 ? `rgb(${Math.round(150 + 40 * gk)},${Math.round(110 + 20 * gk)},${Math.round(150 + 90 * gk)})` : '#b0705a');
        ctx.fillStyle = sky; ctx.fillRect(u0, v0, u1 - u0, v1 - v0);
        const cx = (u0 + u1) / 2, W2 = u1 - u0, hz = v0 + (v1 - v0) * 0.36;
        // the formation over the trees
        if (gk > 0.01) {
          const fx = cx + W2 * 0.12, fy = hz + 0.45, t = V.time;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 0.9);
          halo.addColorStop(0, `rgba(200,170,255,${0.6 * gk})`); halo.addColorStop(1, 'rgba(120,80,255,0)');
          ctx.fillStyle = halo; ctx.fillRect(fx - 1, fy - 1, 2, 2);
          ctx.lineWidth = lwm(1.6);
          for (let k = 1; k <= 4; k++) {
            const r = 0.08 + k * 0.09, sp = (k % 2 ? 1 : -1) * (0.6 + k * 0.2) * (g > 1.05 && k === 2 ? 0 : 1);
            ctx.strokeStyle = `rgba(200,170,255,${(0.8 - k * 0.1) * gk})`;
            ctx.beginPath();
            ctx.ellipse(fx, fy, r, r * 0.6, 0, t * sp, t * sp + TAU - 0.35);
            ctx.stroke();
          }
          ctx.restore();
        }
        // distant treeline
        ctx.fillStyle = '#141220';
        ctx.beginPath(); ctx.moveTo(u0, hz);
        for (let i = 0; i <= 16; i++) { const u = u0 + (W2 * i) / 16; ctx.lineTo(u, hz + 0.05 + ((i * 37) % 7) * 0.018 + (i % 2) * 0.04); }
        ctx.lineTo(u1, v0); ctx.lineTo(u0, v0); ctx.closePath(); ctx.fill();
        // street: roofs across the way, and the Guild's notice board
        ctx.fillStyle = '#0f0c12';
        ctx.beginPath(); ctx.moveTo(u0, v0); ctx.lineTo(u0, hz - 0.05); ctx.lineTo(u0 + W2 * 0.18, hz + 0.18); ctx.lineTo(u0 + W2 * 0.34, hz - 0.08); ctx.lineTo(u0 + W2 * 0.34, v0); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(u1, v0); ctx.lineTo(u1, hz - 0.02); ctx.lineTo(u1 - W2 * 0.12, hz + 0.12); ctx.lineTo(u1 - W2 * 0.24, hz - 0.04); ctx.lineTo(u1 - W2 * 0.24, v0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8a860'; ctx.fillRect(u0 + W2 * 0.1, hz - 0.3, 0.1, 0.12);
        if (street) {
          const bx = cx - 0.1, bw = 0.62, bb = v0 + 0.08, bt = bb + 0.42;
          ctx.fillStyle = '#1a1210'; ctx.fillRect(bx - bw / 2 + 0.04, v0, 0.05, bt - v0); ctx.fillRect(bx + bw / 2 - 0.09, v0, 0.05, bt - v0);
          ctx.fillStyle = '#3a2618'; ctx.fillRect(bx - bw / 2, bb + 0.1, bw, bt - bb - 0.1);
          ctx.fillStyle = '#20150e'; ctx.fillRect(bx - bw / 2 - 0.04, bt - 0.02, bw + 0.08, 0.06);
          const notes = [[-0.26, 0.36, 0.1, 0.12], [-0.13, 0.34, 0.09, 0.1], [0.0, 0.37, 0.11, 0.13], [0.14, 0.33, 0.1, 0.1], [-0.2, 0.22, 0.1, 0.09], [0.06, 0.21, 0.12, 0.1]];
          for (const [dx, dv, nw, nh] of notes) { ctx.fillStyle = gk > 0.3 ? '#d8c8f0' : '#d4c6aa'; ctx.fillRect(bx + dx, bb + dv - nh, nw, nh); }
          ctx.fillStyle = '#1a1210'; ctx.fillRect(bx + bw / 2 + 0.16, v0, 0.03, 0.62);
          ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.arc(bx + bw / 2 + 0.175, v0 + 0.64, 0.035, 0, TAU); ctx.fill();
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const lg = ctx.createRadialGradient(bx + bw / 2 + 0.175, v0 + 0.64, 0, bx + bw / 2 + 0.175, v0 + 0.64, 0.45);
          lg.addColorStop(0, 'rgba(255,190,110,0.5)'); lg.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = lg; ctx.fillRect(bx - 0.4, v0, 1.4, 1.2);
          ctx.restore();
        }
        // glass: a sheen and two glare streaks
        ctx.fillStyle = gk > 0 ? `rgba(160,130,255,${0.08 + 0.2 * gk})` : 'rgba(120,140,200,0.08)'; ctx.fillRect(u0, v0, W2, v1 - v0);
        ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.05;
        ctx.beginPath(); ctx.moveTo(u0 + W2 * 0.15, v1 - 0.1); ctx.lineTo(u0 + W2 * 0.45, v0 + 0.4); ctx.moveTo(u0 + W2 * 0.3, v1 - 0.05); ctx.lineTo(u0 + W2 * 0.5, v1 - 0.45); ctx.stroke();
        ctx.restore();
        // mullions and sill
        ctx.fillStyle = INK; ctx.fillRect((u0 + u1) / 2 - 0.06, v0, 0.12, v1 - v0); ctx.fillRect(u0, (v0 + v1) / 2 + 0.2, u1 - u0, 0.1);
        ctx.fillStyle = C.timber; ctx.fillRect((u0 + u1) / 2 - 0.04, v0, 0.08, v1 - v0); ctx.fillRect(u0, (v0 + v1) / 2 + 0.22, u1 - u0, 0.06);
        ctx.fillStyle = INK; ctx.fillRect(u0 - 0.24, v0 - 0.24, u1 - u0 + 0.48, 0.14);
        ctx.fillStyle = C.timberLit; ctx.fillRect(u0 - 0.22, v0 - 0.15, u1 - u0 + 0.44, 0.04);
      });
    }

    function kitchenDoor(w, ua, ub) {
      const u0 = Math.min(ua, ub), u1 = Math.max(ua, ub);
      onWall(w, () => {
        const h = 2.15;
        ctx.fillStyle = INK; ctx.fillRect(u0 - 0.16, 0, u1 - u0 + 0.32, h + 0.16);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#a85a24'); g.addColorStop(0.5, '#6a3216'); g.addColorStop(1, '#2a140a');
        ctx.fillStyle = g; ctx.fillRect(u0, 0, u1 - u0, h);
        ctx.fillStyle = '#2a140a'; ctx.fillRect(u0, 1.5, u1 - u0, 0.06);
        ctx.fillStyle = '#1a0c06';
        for (const [du, r] of [[0.25, 0.1], [0.55, 0.13], [0.9, 0.09]]) { ctx.beginPath(); ctx.arc(u0 + du, 1.75, r, Math.PI, TAU); ctx.fill(); ctx.fillRect(u0 + du - 0.01, 1.75, 0.02, 0.3); }
        ctx.fillStyle = 'rgba(255,200,120,0.25)'; ctx.fillRect(u0, 0, u1 - u0, 0.6);
        ctx.fillStyle = '#6e2a22'; ctx.beginPath(); ctx.moveTo(u0, h); ctx.lineTo(u1, h); ctx.lineTo(u1, h - 0.4); ctx.quadraticCurveTo((u0 + u1) / 2, h - 0.55, u0, h - 0.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.timber; ctx.fillRect(u0 - 0.12, 0, 0.12, h + 0.12); ctx.fillRect(u1, 0, 0.12, h + 0.12); ctx.fillRect(u0 - 0.12, h, u1 - u0 + 0.24, 0.14);
      });
    }

    function streetDoor(w, ua, ub, s) {
      const u0 = Math.min(ua, ub), u1 = Math.max(ua, ub);
      const open = clamp((s && s.door) || 0, 0, 1), gk = Math.min(1, glowOf(s));
      onWall(w, () => {
        const h = 2.2;
        ctx.fillStyle = INK; ctx.fillRect(u0 - 0.16, 0, u1 - u0 + 0.32, h + 0.18);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#20182a'); g.addColorStop(1, gk > 0 ? `rgb(${Math.round(70 + 60 * gk)},${Math.round(50 + 10 * gk)},${Math.round(110 + 80 * gk)})` : '#46405a');
        ctx.fillStyle = g; ctx.fillRect(u0, 0, u1 - u0, h);
        const lw = (u1 - u0) * (1 - open * 0.82);
        ctx.fillStyle = '#4a3020'; ctx.fillRect(u0, 0, lw, h);
        ctx.strokeStyle = 'rgba(10,6,4,0.7)'; ctx.lineWidth = lwm(1.2); ctx.beginPath();
        for (let k = 1; k < 5; k++) { ctx.moveTo(u0 + (lw * k) / 5, 0); ctx.lineTo(u0 + (lw * k) / 5, h); }
        ctx.stroke();
        ctx.fillStyle = C.iron; ctx.fillRect(u0, 0.4, lw * 0.85, 0.07); ctx.fillRect(u0, 1.7, lw * 0.85, 0.07);
        ctx.fillStyle = '#b08a52'; ctx.beginPath(); ctx.arc(u0 + lw * 0.85, 1.05, 0.04, 0, TAU); ctx.fill();
        ctx.fillStyle = C.timber; ctx.fillRect(u0 - 0.12, 0, 0.12, h + 0.14); ctx.fillRect(u1, 0, 0.12, h + 0.14); ctx.fillRect(u0 - 0.12, h, u1 - u0 + 0.24, 0.16);
      });
    }

    function shelves(w, ua, ub) {
      const u0 = Math.min(ua, ub), u1 = Math.max(ua, ub);
      onWall(w, () => {
        for (const v of [1.45, 2.05]) {
          ctx.fillStyle = INK; ctx.fillRect(u0 - 0.03, v - 0.06, u1 - u0 + 0.06, 0.1);
          ctx.fillStyle = C.timberLit; ctx.fillRect(u0, v - 0.04, u1 - u0, 0.05);
          let i = 0;
          for (let u = u0 + 0.12; u < u1 - 0.1; u += 0.17 + ((i * 7) % 3) * 0.04, i++) {
            const kind = (i * 5 + Math.round(v * 3)) % 4;
            const col = ['#2c4a32', '#7a4a1c', '#3a2030', '#6a6040'][(i + Math.round(v)) % 4];
            ctx.fillStyle = INK;
            if (kind === 3) { ctx.fillRect(u - 0.07, v, 0.14, 0.16); ctx.fillStyle = '#8a6a48'; ctx.fillRect(u - 0.055, v + 0.01, 0.11, 0.13); continue; }
            const bh = 0.24 + (kind === 1 ? 0.06 : 0);
            ctx.fillRect(u - 0.055, v, 0.11, bh * 0.62); ctx.fillRect(u - 0.025, v, 0.05, bh + 0.02);
            ctx.fillStyle = col; ctx.fillRect(u - 0.04, v + 0.01, 0.08, bh * 0.58); ctx.fillRect(u - 0.012, v, 0.024, bh);
            ctx.fillStyle = 'rgba(255,230,190,0.5)'; ctx.fillRect(u - 0.03, v + 0.04, 0.015, bh * 0.4);
          }
        }
      });
    }

    function chimney(w, ua, ub) {
      const u0 = Math.min(ua, ub), u1 = Math.max(ua, ub);
      onWall(w, () => {
        ctx.fillStyle = INK; ctx.fillRect(u0 - 0.06, 0, u1 - u0 + 0.12, WH + 0.2);
        ctx.fillStyle = C.stone.lit; ctx.fillRect(u0, 0, u1 - u0, WH + 0.2);
        ctx.strokeStyle = 'rgba(20,14,10,0.6)'; ctx.lineWidth = lwm(1.2); ctx.beginPath();
        let row = 0;
        for (let v = 0.25; v < WH + 0.2; v += 0.25, row++) {
          ctx.moveTo(u0, v); ctx.lineTo(u1, v);
          for (let u = u0 + (row % 2 ? 0.2 : 0.4); u < u1; u += 0.4) { ctx.moveTo(u, v - 0.25); ctx.lineTo(u, v); }
        }
        ctx.stroke();
        const g = ctx.createLinearGradient(0, 0, 0, WH);
        g.addColorStop(0, 'rgba(255,120,50,0.25)'); g.addColorStop(0.5, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
        ctx.fillStyle = g; ctx.fillRect(u0, 0, u1 - u0, WH + 0.2);
        ctx.fillStyle = INK; ctx.fillRect(u0 - 0.18, 1.3, u1 - u0 + 0.36, 0.14);
        ctx.fillStyle = C.timberLit; ctx.fillRect(u0 - 0.16, 1.33, u1 - u0 + 0.32, 0.06);
        for (const [du, h, col] of [[0.3, 0.2, '#7a5a3c'], [0.55, 0.14, '#4a6a5a'], [1.4, 0.24, '#6a4030'], [1.65, 0.12, '#b0a080']]) {
          ctx.fillStyle = INK; ctx.fillRect(u0 + du - 0.07, 1.42, 0.14, h + 0.02);
          ctx.fillStyle = col; ctx.fillRect(u0 + du - 0.055, 1.43, 0.11, h - 0.01);
        }
      });
    }

    function pegs(w, u0, n) {
      onWall(w, () => {
        ctx.fillStyle = INK; ctx.fillRect(u0 - 0.1, 1.72, n * 0.45 + 0.1, 0.1);
        ctx.fillStyle = C.timberLit; ctx.fillRect(u0 - 0.08, 1.74, n * 0.45 + 0.06, 0.05);
        const cols = ['#3a4450', '#5a3a2a', '#4a4a34'];
        for (let i = 0; i < n; i++) {
          const u = u0 + i * 0.45 + 0.15;
          if (i % 2 === 0) {
            ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(u - 0.1, 1.8); ctx.lineTo(u + 0.1, 1.8); ctx.lineTo(u + 0.2, 0.95); ctx.lineTo(u - 0.18, 0.92); ctx.closePath(); ctx.fill();
            ctx.fillStyle = cols[i % 3]; ctx.beginPath(); ctx.moveTo(u - 0.08, 1.78); ctx.lineTo(u + 0.08, 1.78); ctx.lineTo(u + 0.17, 0.98); ctx.lineTo(u - 0.15, 0.95); ctx.closePath(); ctx.fill();
          } else { ctx.fillStyle = INK; ctx.fillRect(u - 0.03, 1.66, 0.06, 0.1); }
        }
      });
    }

    function walls(s) {
      for (const w of WALLS) {
        if (!visible(w)) continue;
        wallBase(w);
        if (w.n === 'N') {
          windowOn(w, uOn(w, -4.1, 0), uOn(w, -1.9, 0), 1.05, 2.5, s, true);
          kitchenDoor(w, uOn(w, 0.8, 0), uOn(w, 2.0, 0));
          shelves(w, uOn(w, 2.9, 0), uOn(w, 7.2, 0));
          pegs(w, uOn(w, -7.6, 0), 4);
        } else if (w.n === 'E') {
          streetDoor(w, uOn(w, XW, -2.55), uOn(w, XW, -1.45), s);
          pegs(w, uOn(w, XW, 0.4), 5);
        } else if (w.n === 'S') {
          windowOn(w, uOn(w, 3.6, YS), uOn(w, 1.6, YS), 1.05, 2.4, s, false);
          pegs(w, uOn(w, -0.2, YS), 4);
        } else if (w.n === 'W') {
          chimney(w, uOn(w, -XW, hearth.y + 1.0), uOn(w, -XW, hearth.y - 1.0));
          windowOn(w, uOn(w, -XW, -1.6), uOn(w, -XW, -3.2), 1.05, 2.4, s, false);
        }
        wallFrame(w);
      }
      // the cut edge of the near walls: a dark sill
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.12, 2);
      ctx.beginPath();
      for (const w of WALLS) {
        if (visible(w)) continue;
        const a = P(w.x0, w.y0, 0.05), b = P(w.x1, w.y1, 0.05); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }

    // ------------------------------------------------------------ furniture
    const quad = (pts, s2, t) => {
      const b = { x: pts[0].x + (pts[1].x - pts[0].x) * s2, y: pts[0].y + (pts[1].y - pts[0].y) * s2 };
      const tp = { x: pts[3].x + (pts[2].x - pts[3].x) * s2, y: pts[3].y + (pts[2].y - pts[3].y) * s2 };
      return { x: b.x + (tp.x - b.x) * t, y: b.y + (tp.y - b.y) * t };
    };
    function leg(x, y, z, w) {
      const a = P(x, y, 0), b = P(x, y, z);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(w + 0.04, 2); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = C.wood.shade; ctx.lineWidth = K.lw(w, 1); ctx.stroke();
    }
    function drawTable(t) {
      if (K.off(P(t.x, t.y, 0.7), V.cam.sc * 3)) return;
      const ix = t.hw - 0.12, iy = t.hd - 0.1;
      for (const [dx, dy] of [[-ix, -iy], [ix, -iy], [ix, iy], [-ix, iy]]) leg(t.x + dx, t.y + dy, 0.74, 0.08);
      K.box(t.x, t.y, t.hw, t.hd, 0, 0.72, 0.79, C.wood, (face, pts) => {
        if (face !== -1) return;
        ctx.strokeStyle = 'rgba(30,18,10,0.45)'; ctx.lineWidth = K.lw(0.012, 0.7); ctx.beginPath();
        for (const k of [0.33, 0.66]) { const a = quad(pts, 0, k), b = quad(pts, 1, k); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        ctx.stroke();
      });
      for (const c of CLUTTER) if (Math.abs(c.x - t.x) <= t.hw && Math.abs(c.y - t.y) <= t.hd + 0.05) drawThing(c, 0.79);
    }
    function drawThing(c, z) {
      const sc = V.cam.sc, p = P(c.x, c.y, z);
      const fl = (col, sh, x, y, rx, ry) => { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x, y, rx + 1.2, ry + 1.2, 0, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); if (sh) { ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(x + rx * 0.25, y + ry * 0.2, rx * 0.75, ry * 0.7, 0, 0, TAU); ctx.fill(); } };
      if (c.kind === 'bowl') {
        const r = 0.13 * sc, ry = r * Math.max(0.3, V.cam.pitch);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(p.x, p.y + ry * 0.4, r * 0.85 + 1, ry * 1.4 + 1, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = C.bowl[1]; ctx.beginPath(); ctx.ellipse(p.x, p.y + ry * 0.4, r * 0.82, ry * 1.35, 0, 0, Math.PI); ctx.fill();
        fl(C.bowl[0], null, p.x, p.y, r, ry);
        ctx.fillStyle = C.stew; ctx.beginPath(); ctx.ellipse(p.x, p.y + ry * 0.1, r * 0.78, ry * 0.7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,200,140,0.5)'; ctx.beginPath(); ctx.ellipse(p.x - r * 0.3, p.y - ry * 0.1, r * 0.18, ry * 0.18, 0, 0, TAU); ctx.fill();
        if (sc > 70) {
          ctx.strokeStyle = 'rgba(240,230,220,0.22)'; ctx.lineWidth = Math.max(1, sc * 0.012); ctx.beginPath();
          for (const o of [-0.3, 0.25]) { const x = p.x + o * r, ph = V.time * 1.4 + c.rot + o * 3; ctx.moveTo(x, p.y); ctx.bezierCurveTo(x + Math.sin(ph) * r * 0.4, p.y - r * 0.8, x - Math.sin(ph) * r * 0.4, p.y - r * 1.4, x + Math.sin(ph + 1) * r * 0.3, p.y - r * 2.1); }
          ctx.stroke();
        }
      } else if (c.kind === 'mug' || c.kind === 'jug') {
        const big = c.kind === 'jug' ? 1.4 : 1, w = 0.07 * sc * big, h = 0.15 * sc * big, ry = w * Math.max(0.3, V.cam.pitch);
        ctx.fillStyle = INK; ctx.fillRect(p.x - w - 1.2, p.y - h - 1, w * 2 + 2.4, h + 2);
        ctx.fillStyle = C.mug[0]; ctx.fillRect(p.x - w, p.y - h, w * 2, h);
        ctx.fillStyle = C.mug[1]; ctx.fillRect(p.x + w * 0.2, p.y - h, w * 0.8, h);
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, w * 0.4); ctx.beginPath(); ctx.arc(p.x + w * 1.15, p.y - h * 0.5, h * 0.25, -1.4, 1.4); ctx.stroke();
        fl('#e8dcc0', null, p.x, p.y - h, w, ry);
      } else if (c.kind === 'bread') {
        const r = 0.14 * sc;
        fl(C.bread[0], C.bread[1], p.x, p.y - r * 0.2, r, r * 0.55);
        ctx.strokeStyle = 'rgba(40,20,8,0.7)'; ctx.lineWidth = Math.max(1, sc * 0.01); ctx.beginPath();
        for (const o of [-0.4, 0, 0.4]) { ctx.moveTo(p.x + o * r - r * 0.12, p.y - r * 0.45); ctx.lineTo(p.x + o * r + r * 0.12, p.y - r * 0.05); }
        ctx.stroke();
      } else if (c.kind === 'candle') {
        const w = 0.035 * sc, h = 0.13 * sc;
        ctx.fillStyle = INK; ctx.fillRect(p.x - w - 1, p.y - h - 1, w * 2 + 2, h + 2);
        ctx.fillStyle = '#e8dcc4'; ctx.fillRect(p.x - w, p.y - h, w * 2, h);
        const fk = flick(c.rot), fh = 0.08 * sc * fk;
        ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.ellipse(p.x, p.y - h - fh * 0.5, w * 0.8, fh * 0.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff2c0'; ctx.beginPath(); ctx.ellipse(p.x, p.y - h - fh * 0.4, w * 0.4, fh * 0.35, 0, 0, TAU); ctx.fill();
      } else if (c.kind === 'notes') {
        const a = P(c.x - 0.22, c.y - 0.14, z + 0.002), b = P(c.x + 0.22, c.y - 0.14, z + 0.002), d = P(c.x + 0.22, c.y + 0.14, z + 0.002), e = P(c.x - 0.22, c.y + 0.14, z + 0.002);
        K.path([a, b, d, e]); ctx.fillStyle = '#d8ccb4'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.01, 0.8); ctx.stroke();
        ctx.strokeStyle = 'rgba(169,139,255,0.85)'; ctx.lineWidth = K.lw(0.01, 0.8); ctx.beginPath();
        const m = P(c.x, c.y, z + 0.003), r = 0.08 * sc;
        ctx.ellipse(m.x, m.y, r, r * V.cam.pitch, 0, 0, TAU); ctx.moveTo(m.x - r, m.y); ctx.lineTo(m.x + r, m.y); ctx.moveTo(m.x, m.y - r * V.cam.pitch); ctx.lineTo(m.x + r * 0.7, m.y + r * 0.7 * V.cam.pitch);
        ctx.stroke();
      }
    }
    function drawStool(x, y) {
      if (K.off(P(x, y, 0.4), V.cam.sc * 2)) return;
      for (const [dx, dy] of [[-0.13, -0.1], [0.13, -0.1], [0, 0.14]]) leg(x + dx, y + dy, 0.44, 0.05);
      K.cyl(x, y, 0.2, 0.42, 0.47, { base: C.stool[0], shade: C.stool[1], top: '#7d5838', rim: C.wood.rim }, null, { n: 14, ink: 0.03 });
    }
    function hoops(bt, tp, rx, ry) {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, rx * 0.12);
      ctx.beginPath();
      for (const k of [0.2, 0.8]) { const y = bt.y + (tp.y - bt.y) * k; ctx.moveTo(bt.x + rx, y); ctx.ellipse(bt.x, y, rx, ry, 0, 0, Math.PI); }
      ctx.stroke();
    }
    function drawBar() {
      const b = BAR;
      if (K.off(P(b.x, b.y, 0.6), V.cam.sc * 4)) return;
      K.box(b.x, b.y, b.hw, b.hd, 0, 0, b.h, C.bar, (face, pts, lit) => {
        if (face === -1) {
          ctx.strokeStyle = 'rgba(255,220,170,0.18)'; ctx.lineWidth = K.lw(0.02, 1); ctx.beginPath();
          const a = quad(pts, 0, 0.3), c = quad(pts, 1, 0.3); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
          return;
        }
        ctx.strokeStyle = 'rgba(10,6,4,0.6)'; ctx.lineWidth = K.lw(0.02, 1); ctx.beginPath();
        const n = face % 2 ? 1 : 6;
        for (let i = 0; i < n; i++) {
          const s0 = (i + 0.12) / n, s1 = (i + 0.88) / n;
          K.poly([quad(pts, s0, 0.12), quad(pts, s1, 0.12), quad(pts, s1, 0.8), quad(pts, s0, 0.8)]);
        }
        ctx.stroke();
        ctx.fillStyle = lit ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.4)';
        ctx.beginPath(); K.poly([pts[0], pts[1], quad(pts, 1, 0.08), quad(pts, 0, 0.08)]); ctx.fill();
      });
      for (const c of CLUTTER) if (Math.abs(c.x - b.x) <= b.hw && Math.abs(c.y - b.y) <= b.hd + 0.05) drawThing(c, b.h);
      K.cyl(b.x + b.hw - 0.35, b.y, 0.22, b.h, b.h + 0.42, C.keg, null, { n: 16, inside: hoops });
    }
    function drawKeg(k) {
      if (K.off(P(k.x, k.y, 0.4), V.cam.sc * 2)) return;
      K.cyl(k.x, k.y, 0.34, 0, 0.82, C.keg, null, { n: 18, inside: hoops });
    }
    function drawHearth() {
      const h = HEARTH;
      if (K.off(P(h.x, h.y, 0.6), V.cam.sc * 4)) return;
      const fk = flick(0.4);
      K.box(h.x, h.y, h.hw, h.hd, 0, 0, h.h, C.stone, (face, pts) => {
        if (face === -1) return;
        ctx.strokeStyle = 'rgba(16,10,8,0.55)'; ctx.lineWidth = K.lw(0.015, 0.8); ctx.beginPath();
        for (const t of [0.25, 0.5, 0.75]) { const a = quad(pts, 0, t), b = quad(pts, 1, t); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        ctx.stroke();
        if (face !== 1 && face !== 2) return;
        // the firebox: a dark arch with the fire in it
        K.path([quad(pts, 0.2, 0.05), quad(pts, 0.8, 0.05), quad(pts, 0.8, 0.62), quad(pts, 0.5, 0.78), quad(pts, 0.2, 0.62)]); ctx.fillStyle = '#120806'; ctx.fill();
        const base = quad(pts, 0.5, 0.08), wdt = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) * 0.5;
        const hh = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y);
        const flame = (w, fh0, col, ph) => {
          ctx.fillStyle = col;
          for (const o of [-0.3, 0, 0.3]) {
            const x = base.x + o * wdt * 0.9, s2 = Math.sin(V.time * 7 + ph + o * 5) * w * 0.3, fh = fh0 * (o ? 0.75 : 1) * (0.85 + 0.15 * Math.sin(V.time * 11 + o * 9 + ph));
            ctx.beginPath(); ctx.moveTo(x - w, base.y); ctx.quadraticCurveTo(x - w * 0.8, base.y - fh * 0.6, x + s2, base.y - fh); ctx.quadraticCurveTo(x + w * 0.8, base.y - fh * 0.5, x + w, base.y); ctx.closePath(); ctx.fill();
          }
        };
        flame(wdt * 0.28, hh * 0.5 * fk, '#c2401a', 0);
        flame(wdt * 0.2, hh * 0.38 * fk, '#ff8a3a', 1);
        flame(wdt * 0.1, hh * 0.22 * fk, '#ffe2a0', 2);
        ctx.fillStyle = '#2a160c'; ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1);
        ctx.beginPath(); ctx.ellipse(base.x, base.y, wdt * 0.42, Math.max(2, hh * 0.05), 0.1, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ff9a40'; ctx.beginPath(); ctx.ellipse(base.x - wdt * 0.1, base.y, wdt * 0.18, Math.max(1, hh * 0.02), 0, 0, TAU); ctx.fill();
      });
      // the chimney breast, when the wall behind it is cut away
      if (!visible(wallOf('W'))) K.box(-XW + 0.45, h.y, 0.45, 0.75, 0, h.h, h.h + 0.35, C.stone);
    }
    function drawLantern(l) {
      const sc = V.cam.sc, p = P(l.x, l.y, l.z), top = P(l.x, l.y, 4.2);
      if (K.off(p, sc * 1.5)) return;
      if (sc > 70 && p.d > 1.0) return; // close-ups: no lantern dangling in front of the lens
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1); ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(p.x, p.y - sc * 0.22); ctx.stroke();
      const w = sc * 0.12, h = sc * 0.24, fk = flick(l.ph);
      ctx.fillStyle = INK; ctx.fillRect(p.x - w - 2, p.y - h - 2, w * 2 + 4, h + 4);
      ctx.fillStyle = `rgb(255,${Math.round(190 + 30 * fk)},${Math.round(110 + 30 * fk)})`; ctx.fillRect(p.x - w, p.y - h, w * 2, h);
      ctx.fillStyle = '#fff4d0'; ctx.fillRect(p.x - w * 0.35, p.y - h * 0.7, w * 0.7, h * 0.45);
      ctx.fillStyle = INK; ctx.fillRect(p.x - 1, p.y - h, 2, h);
      ctx.beginPath(); ctx.moveTo(p.x - w * 1.3, p.y - h); ctx.lineTo(p.x, p.y - h - w * 0.9); ctx.lineTo(p.x + w * 1.3, p.y - h); ctx.closePath(); ctx.fill();
      ctx.fillRect(p.x - w * 1.15, p.y - 2, w * 2.3, 3);
    }

    function drawBackdrop(s) { floor(s); walls(s); }
    function items() {
      const out = [];
      const dOf = (x, y) => P(x, y, 0).d;
      for (const t of TABLES) out.push({ d: dOf(t.x, t.y), f: () => drawTable(t) });
      out.push({ d: dOf(BAR.x, BAR.y), f: drawBar });
      out.push({ d: dOf(HEARTH.x, HEARTH.y), f: drawHearth });
      for (const [x, y] of STOOLS) out.push({ d: dOf(x, y), f: () => drawStool(x, y) });
      for (const k of KEGS) out.push({ d: dOf(k.x, k.y), f: () => drawKeg(k) });
      for (const l of LANTERNS) out.push({ d: dOf(l.x, l.y) + 0.01, f: () => drawLantern(l) });
      return out;
    }
    const overlay = K.overlay({
      vig: [0.35, 0.85], vigCol: '10,5,3', tone: 1.25, toneCol: 'rgba(12,6,4,0.42)',
      paint(c, W, H) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(10,6,4,0.35)'); g.addColorStop(0.4, 'rgba(255,170,90,0.04)'); g.addColorStop(1, 'rgba(10,6,4,0.2)'); c.fillStyle = g; c.fillRect(0, 0, W, H); },
    });
    const motes = K.motes(22, 131, (r) => (r() < 0.8 ? 0 : 1));
    function drawAtmosphere(s) {
      const sc = V.cam.sc;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const glow = (x, y, z, r, col, a) => {
        const p = P(x, y, z), rr = r * sc;
        if (K.off(p, rr)) return;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
        g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.35, `rgba(${col},${a * 0.3})`); g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g; ctx.fillRect(p.x - rr, p.y - rr, rr * 2, rr * 2);
      };
      for (const l of LANTERNS) glow(l.x, l.y, l.z - 0.1, 1.6, '255,170,90', 0.32 * flick(l.ph));
      glow(HEARTH.x + HEARTH.hw, HEARTH.y, 0.5, 2.6, '255,110,40', 0.3 * flick(0.4));
      for (const c of CLUTTER) if (c.kind === 'candle') glow(c.x, c.y, 0.95, 0.5, '255,180,90', 0.25 * flick(c.rot));
      const g = glowOf(s);
      if (g > 0.01 && visible(wallOf('N'))) glow(-3, YN, 1.8, 3.6 + g, '150,110,255', 0.3 * Math.min(1.4, g));
      ctx.restore();
      overlay.draw();
      if (g > 0.01) { ctx.fillStyle = `rgba(110,70,200,${(0.1 * Math.min(1.4, g)).toFixed(3)})`; ctx.fillRect(0, 0, V.W, V.H); }
      K.drawMotes(motes, ['rgba(255,214,160,0.4)', 'rgba(200,170,255,0.45)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset };
  }

  // ================================================================ the road to the Tower: shared
  // Helpers for the new manuscript's arenas.
  //
  // bake(): the ground projection is affine in (x, y), so flat ground detail
  // (tiles, frost, scorch, cracks, wings lying in the grass) is painted once
  // in world metres into an offscreen canvas and drawn per frame as a single
  // transformed image. free() drops it when the arena is left.
  function road2(V, K) {
    const { ctx } = V, P = V.P;
    const T = {};
    T.bake = (x0, y0, x1, y1, ppm, paint) => {
      let cv = null;
      return {
        draw() {
          if (!cv) {
            cv = K.canvas((x1 - x0) * ppm, (y1 - y0) * ppm);
            const c = cv.getContext('2d');
            c.setTransform(ppm, 0, 0, ppm, -x0 * ppm, -y0 * ppm);
            c.lineJoin = 'round'; c.lineCap = 'round';
            paint(c);
          }
          const o = P(x0, y0, 0), ex = P(x0 + 1, y0, 0), ey = P(x0, y0 + 1, 0);
          ctx.save();
          ctx.transform((ex.x - o.x) / ppm, (ex.y - o.y) / ppm, (ey.x - o.x) / ppm, (ey.y - o.y) / ppm, o.x, o.y);
          ctx.drawImage(cv, 0, 0);
          ctx.restore();
        },
        free() { cv = null; },
      };
    };
    // Screen row of the ground at view depth -D from the arena centre (a
    // line of constant depth is level on screen): where the land meets the sky.
    T.horizon = (D) => P(-D * Math.sin(V.cam.ang), -D * Math.cos(V.cam.ang), 0).y;
    // Wall segments round a room: [{x0, y0, x1, y1, h, lx, ly}] (lean: top
    // offset in metres). Returns screen quads sorted far to near; near walls
    // are cut down (K.tall, capNear metres at most) so they never hide the fight.
    T.quads = (segs, minF, capNear, fixedF) => {
      const ca = Math.cos(V.cam.ang), sa = Math.sin(V.cam.ang), out = [];
      for (const g of segs) {
        const f0 = fixedF || Math.max(minF || 0.1, K.tall(g.x0, g.y0)), f1 = fixedF || Math.max(minF || 0.1, K.tall(g.x1, g.y1));
        const mx = (g.x0 + g.x1) / 2, my = (g.y0 + g.y1) / 2;
        // inward normal (perpendicular to the segment, toward the middle)
        let nx = -(g.y1 - g.y0), ny = g.x1 - g.x0;
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        if (nx * mx + ny * my > 0) { nx = -nx; ny = -ny; }
        const lx = g.lx || 0, ly = g.ly || 0;
        const z0 = g.z0 || 0, bx = g.bx || 0, by = g.by || 0;
        out.push({
          g, f0, f1, d: K.depth(mx, my),
          b0: P(g.x0 + bx * f0, g.y0 + by * f0, z0 * f0), b1: P(g.x1 + bx * f1, g.y1 + by * f1, z0 * f1),
          t0: P(g.x0 + lx * f0, g.y0 + ly * f0, zt(g.h, f0, capNear)), t1: P(g.x1 + lx * f1, g.y1 + ly * f1, zt(g.h1 || g.h, f1, capNear)),
          facing: nx * sa + ny * ca, sx: nx * ca - ny * sa,
        });
      }
      out.sort((a, b) => a.d - b.d);
      return out;
    };
    // Height of a wall top cut by f; capNear keeps the nearest walls low.
    const zt = (h, f, cap) => (cap ? Math.min(h * f, cap + Math.max(0, f - 0.15) * h * 2) : h * f);
    // A point on a wall quad: u along, v up (0..1).
    T.on = (q, u, v) => {
      const bx = q.b0.x + (q.b1.x - q.b0.x) * u, by = q.b0.y + (q.b1.y - q.b0.y) * u;
      const tx = q.t0.x + (q.t1.x - q.t0.x) * u, ty = q.t0.y + (q.t1.y - q.t0.y) * u;
      return { x: bx + (tx - bx) * v, y: by + (ty - by) * v };
    };
    T.quadPath = (q, p) => { const t = p || ctx; t.moveTo(q.b0.x, q.b0.y); t.lineTo(q.b1.x, q.b1.y); t.lineTo(q.t1.x, q.t1.y); t.lineTo(q.t0.x, q.t0.y); t.closePath(); };
    // A sub-rectangle of a wall quad (u0..u1 along, v0..v1 up) added to a path.
    T.sub = (p, q, u0, u1, v0, v1) => {
      const a = T.on(q, u0, v0), b = T.on(q, u1, v0), c = T.on(q, u1, v1), d = T.on(q, u0, v1);
      p.moveTo(a.x, a.y); p.lineTo(b.x, b.y); p.lineTo(c.x, c.y); p.lineTo(d.x, d.y); p.closePath();
    };
    // Additive light blob from a cached radial sprite (no per-frame gradients).
    T.glow = (col, x, y, rx, ry, a) => {
      if (a <= 0.003 || x + rx < 0 || x - rx > V.W || y + ry < 0 || y - ry > V.H) return;
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowSprite(col), x - rx, y - ry, rx * 2, ry * 2); ctx.globalAlpha = 1;
    };
    // A leaning slab (marker stone, broken post): a box whose top is shifted.
    T.slab = (x, y, hw, hd, rot, h, lx, ly, pal, deco) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      const cw = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
      const lo = cw.map(([X, Y]) => P(X, Y, 0)), hi = cw.map(([X, Y]) => P(X + lx, Y + ly, h));
      const ca = Math.cos(V.cam.ang), sa = Math.sin(V.cam.ang);
      ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        const mx = (cw[i][0] + cw[j][0]) / 2 - x, my = (cw[i][1] + cw[j][1]) / 2 - y, l = Math.hypot(mx, my);
        if ((mx / l) * sa + (my / l) * ca <= 0.001) continue;
        const lit = (mx / l) * ca - (my / l) * sa < -0.15;
        const pts = [lo[i], lo[j], hi[j], hi[i]];
        K.path(pts); ctx.fillStyle = lit ? pal.lit : pal.shade; ctx.fill();
        if (deco) { ctx.save(); K.path(pts); ctx.clip(); deco(i, pts, lit); ctx.restore(); }
        ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1); K.path(pts); ctx.stroke();
      }
      K.path(hi); ctx.fillStyle = pal.top; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1); ctx.stroke();
      ctx.lineWidth = K.lw(0.045, 1.5); K.path(convexHull(lo.concat(hi))); ctx.stroke();
      if (pal.rim) { ctx.strokeStyle = pal.rim; ctx.globalAlpha = 0.6; ctx.lineWidth = K.lw(0.018); ctx.beginPath(); ctx.moveTo(hi[0].x, hi[0].y); ctx.lineTo(hi[3].x, hi[3].y); ctx.stroke(); ctx.globalAlpha = 1; }
      return { lo, hi };
    };
    // Thick inked stroke: an ink pass then a colour pass along the same path.
    T.inked = (build, w, col, inkW) => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(inkW || w * 1.9, 2); ctx.beginPath(); build(); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = K.lw(w, 1); ctx.beginPath(); build(); ctx.stroke();
    };
    // Blob polygon in world metres for bakes: n points with jitter.
    T.blob = (R, x, y, rx, ry, n, j) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, k = 1 + (R() - 0.5) * (j || 0.4); return [x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]; });
    // Clip to the inside of a ring (k times the arena) for the floor of a room.
    T.clipRing = (k) => { ctx.beginPath(); K.poly(K.ring(k, 64)); ctx.clip(); };
    T.fillPoly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
    // Branching frost / scorch veins in world metres (bakes).
    T.branch = (c, R, x, y, a, len, depth, w) => {
      const n = 3 + Math.floor(R() * 3);
      c.beginPath(); c.moveTo(x, y);
      const pts = [];
      for (let i = 0; i < n; i++) { a += (R() - 0.5) * 0.9; x += Math.cos(a) * len / n; y += Math.sin(a) * len / n; c.lineTo(x, y); pts.push([x, y, a]); }
      c.lineWidth = w; c.stroke();
      if (depth > 0) for (const [px, py, pa] of pts) if (R() < 0.55) T.branch(c, R, px, py, pa + (R() < 0.5 ? -1 : 1) * (0.5 + R() * 0.6), len * (0.35 + R() * 0.25), depth - 1, w * 0.62);
    };
    return T;
  }
  const glowCache = {};
  function glowSprite(col) {
    if (!glowCache[col]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.3, `rgba(${col},0.42)`); g.addColorStop(0.65, `rgba(${col},0.1)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      glowCache[col] = cv;
    }
    return glowCache[col];
  }

  // ================================================================ grassland
  // The Open Road: grassland and broken stone under a permanent low cloud
  // layer. Old half-buried mile markers with weather-eaten faces, a low
  // ruined wall, and a young Skyreaver lying dead in the grass, its
  // membrane wings shredded across the ground. The Tower stands on the
  // horizon, far off, going up into the cloud.
  function grassland(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A), T = road2(V, K);
    const R = Sim.makeRng(141);
    const C = {
      bg: '#252a26', grass: '#2f3630', grassLit: '#3b433b', pool: '#465046', dark: '#1d221e',
      flag: '#55575a', flagLit: '#6d6f70', flagInk: 'rgba(10,10,10,0.75)',
      sky0: '#3b3f44', sky1: '#5b6066', sky2: '#868a8c', haze: '120,126,130', far: '#3a4044', far2: '#2c3135',
      cloud: '#2e3236', cloudLit: '#4a4f55', cloudDark: '#202326', tower: '#262a2e', towerLit: '#484d52',
      stone: { lit: '#6f6c68', shade: '#3c3a39', top: '#827e78', rim: '#e6d8c8' },
      rock: { base: '#3c3b3b', mid: '#575454', lit: '#7d7874', rim: '#e6d8c8' },
      bone: '#141112', boneLit: '#6a5f61', wing: '#4b3f45', wingLit: '#5d4f55', vein: '#2a2024', scale: '#2a2729', scaleLit: '#5e5759', flesh: '#4a1a1f',
      grassT: { ink: '#191d18', lit: '#5f6a5a', tip: '#b8b6a0' },
      shadowA: 'rgba(8,10,9,0.45)',
    };
    const HZ = A.ry * 1.3;
    const carcass = A.obstacles.find((o) => o.kind === 'carcass');
    const CX = carcass ? carcass.x : 3.4, CY = carcass ? carcass.y : -2.6;
    // The old road: broken flagstones crossing west to east.
    const roadY = (x) => 0.7 + Math.sin(x * 0.18) * 0.6;
    const flags = [];
    for (let x = -18; x < 18; x += 0.55 + R() * 0.25) {
      for (let k = -1; k <= 1; k++) {
        if (R() < 0.42) continue; // missing, sunk or grassed over
        const y = roadY(x) + k * 0.62 + (R() - 0.5) * 0.15;
        if (K.inObstacle(x, y, 0.2)) continue;
        flags.push({ x, y, w: 0.24 + R() * 0.1, d: 0.26 + R() * 0.06, rot: (R() - 0.5) * 0.25, lit: R() < 0.5, crack: R() < 0.35 });
      }
    }
    // Wings: shoulders on the carcass, finger bones fanning out across the grass.
    const wings = [];
    for (const side of [-1, 1]) {
      const sh = [CX - 0.25, CY + side * 0.55];
      const base = side < 0 ? -1.75 : 1.55, wrist = [sh[0] + Math.cos(base) * 1.5, sh[1] + Math.sin(base) * 1.3];
      const fingers = [];
      for (let i = 0; i < 4; i++) {
        const a = base + side * (-0.9 + i * 0.55) + (R() - 0.5) * 0.2, len = (2.6 - i * 0.35) * (0.85 + R() * 0.2);
        const broken = R() < 0.3;
        fingers.push({ a, len: broken ? len * 0.6 : len, tip: [wrist[0] + Math.cos(a) * len, wrist[1] + Math.sin(a) * len * 0.9] });
      }
      wings.push({ sh, wrist, fingers, side });
    }
    const wob = Array.from({ length: 48 }, () => R());
    const floor = T.bake(-19, -HZ - 3, 19, 11, 40, (c) => {
      const r = Sim.makeRng(143);
      c.fillStyle = C.grass; c.fillRect(-19, -HZ - 3, 38, HZ + 14);
      // lit swathes and darker hollows of grass
      for (let i = 0; i < 26; i++) { c.fillStyle = r() < 0.6 ? C.grassLit : C.dark; T.fillPoly(c, T.blob(r, (r() - 0.5) * 34, -HZ + r() * (HZ + 10), 1 + r() * 2.5, 0.6 + r() * 1.4, 9, 0.5)); c.fill(); }
      c.fillStyle = C.pool; T.fillPoly(c, T.blob(r, -2.2, -0.8, 4.6, 2.6, 14, 0.25)); c.fill();
      // grass strokes, wind-combed east
      for (const [col, n, w] of [[C.dark, 1500, 0.025], [C.grassT.lit, 520, 0.02]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath();
        for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 38, y = -HZ - 2 + r() * (HZ + 12), l = 0.1 + r() * 0.16; c.moveTo(x, y); c.lineTo(x + l * 0.5, y - l * 0.6); }
        c.stroke();
      }
      // broken stone everywhere: chips in the grass
      c.fillStyle = C.flag;
      for (let i = 0; i < 160; i++) { const x = (r() - 0.5) * 36, y = -HZ + r() * (HZ + 9), s = 0.04 + r() * 0.1; c.beginPath(); c.ellipse(x, y, s * 1.4, s, r() * 3, 0, TAU); c.fill(); }
      // the old road's flagstones
      for (const f of flags) {
        c.save(); c.translate(f.x, f.y); c.rotate(f.rot);
        c.fillStyle = f.lit ? C.flagLit : C.flag; c.fillRect(-f.w, -f.d, f.w * 2, f.d * 2);
        c.strokeStyle = C.flagInk; c.lineWidth = 0.025; c.strokeRect(-f.w, -f.d, f.w * 2, f.d * 2);
        if (f.crack) { c.beginPath(); c.moveTo(-f.w * 0.6, -f.d); c.lineTo(-f.w * 0.1, 0); c.lineTo(f.w * 0.3, f.d); c.stroke(); }
        // grass eating the edges
        c.strokeStyle = C.dark; c.lineWidth = 0.02; c.beginPath();
        for (let k = 0; k < 4; k++) { const u = (r() - 0.5) * 2 * f.w; c.moveTo(u, f.d); c.lineTo(u + 0.04, f.d - 0.12); }
        c.stroke();
        c.restore();
      }
      // the Skyreaver: dark ground where it fell, then the wings
      c.fillStyle = 'rgba(14,10,11,0.55)'; T.fillPoly(c, T.blob(r, CX - 0.3, CY, 2.3, 1.7, 16, 0.3)); c.fill();
      for (const w of wings) {
        const f = w.fingers;
        // membrane between the fingers, torn along the trailing edge
        for (let i = 0; i < f.length; i++) {
          const a = i ? f[i - 1].tip : w.sh, b = f[i].tip;
          const pts = [w.wrist, a];
          const n = 6;
          for (let k = 1; k < n; k++) {
            const t = k / n, mx = a[0] + (b[0] - a[0]) * t, my = a[1] + (b[1] - a[1]) * t;
            const inward = (k % 2 ? 0.15 : 0.45) + r() * 0.35; // scallops and tears
            pts.push([mx + (w.wrist[0] - mx) * inward, my + (w.wrist[1] - my) * inward]);
          }
          pts.push(b);
          if (i === 0) pts.push(w.sh);
          c.fillStyle = i % 2 ? C.wingLit : C.wing; T.fillPoly(c, pts); c.fill();
          c.strokeStyle = INK; c.lineWidth = 0.03; c.stroke();
          // veins
          c.strokeStyle = C.vein; c.lineWidth = 0.018; c.beginPath();
          for (let k = 0; k < 3; k++) { const t = 0.3 + k * 0.2; c.moveTo(w.wrist[0], w.wrist[1]); c.lineTo(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); }
          c.stroke();
          // holes ripped through
          c.fillStyle = C.grass;
          for (let k = 0; k < 2; k++) { const t = 0.3 + r() * 0.4, u = 0.3 + r() * 0.4; const hx = w.wrist[0] + ((a[0] + b[0]) / 2 - w.wrist[0]) * u + (b[0] - a[0]) * (t - 0.5) * 0.5, hy = w.wrist[1] + ((a[1] + b[1]) / 2 - w.wrist[1]) * u + (b[1] - a[1]) * (t - 0.5) * 0.5; T.fillPoly(c, T.blob(r, hx, hy, 0.12 + r() * 0.16, 0.08 + r() * 0.1, 6, 0.8)); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.02; c.stroke(); }
        }
        // long black bones: arm to the wrist, fingers to the tips
        const bone = (pts, wd) => {
          c.strokeStyle = INK; c.lineWidth = wd + 0.05; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
          c.strokeStyle = C.bone; c.lineWidth = wd; c.stroke();
          c.strokeStyle = C.boneLit; c.lineWidth = wd * 0.25; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x - wd * 0.2, y - wd * 0.2) : c.moveTo(x - wd * 0.2, y - wd * 0.2))); c.stroke();
        };
        bone([w.sh, w.wrist], 0.13);
        for (const fg of f) bone([w.wrist, fg.tip], 0.065);
        // knuckle at the wrist
        c.fillStyle = C.bone; c.beginPath(); c.arc(w.wrist[0], w.wrist[1], 0.12, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.03; c.stroke();
      }
      // scattered scales
      for (let i = 0; i < 22; i++) { const a = r() * TAU, d = 1.2 + r() * 1.8, x = CX + Math.cos(a) * d * 1.3, y = CY + Math.sin(a) * d * 0.8; c.save(); c.translate(x, y); c.rotate(r() * 3); c.fillStyle = r() < 0.5 ? C.scale : C.scaleLit; c.beginPath(); c.moveTo(-0.08, 0); c.quadraticCurveTo(0, -0.1, 0.08, 0); c.lineTo(0, 0.07); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.015; c.stroke(); c.restore(); }
    });
    // Tufts and the markers along the road outside the ring.
    const tuftSp = [];
    for (let i = 0; i < 6; i++) tuftSp.push(K.tuft(611 + i * 7, C.grassT, i < 4, i < 3));
    const tufts = [];
    for (let i = 0; i < 700 && tufts.length < 190; i++) {
      const x = (R() - 0.5) * 34, y = -HZ + R() * (HZ + 9);
      if (K.inObstacle(x, y, 0.3) || Math.hypot(x - CX, (y - CY) * 1.2) < 2.6) continue;
      if (K.inArena(x, y, 0.75) && R() < 0.75) continue;
      tufts.push({ x, y, s: 0.5 + R() * 0.9, v: tufts.length % 6 });
    }
    const markers = A.obstacles.filter((o) => o.kind === 'marker').map((o) => ({ x: o.x, y: o.y, r: o.r, rot: 0.3, lx: 0.12, ly: -0.05, h: 0.85, obstacle: true }));
    for (const [x, y, rot, lx, h] of [[-13.6, roadY(-13.6) - 1.3, -0.2, -0.2, 0.7], [13.2, roadY(13.2) + 1.3, 0.4, 0.25, 0.55], [-9, -HZ + 1.2, 0.1, 0.1, 0.6]]) markers.push({ x, y, r: 0.32, rot, lx, ly: 0.05, h });
    const walls = new Map(), rockSh = new Map();
    for (const o of A.obstacles) {
      if (o.kind === 'wall') walls.set(o, { rot: -0.5, steps: [0.5, 0.85, 1.0, 0.7, 0.3, 0.55, 0.2] });
      if (o.kind === 'rock') rockSh.set(o, K.rockShape(R, 9));
    }
    const rubble = [];
    for (let i = 0; i < 14; i++) { const a = R() * TAU, k = 0.85 + R() * 0.5; const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k; if (K.inObstacle(x, y, 0.4)) continue; rubble.push({ x, y, r: 0.12 + R() * 0.16, sh: K.rockShape(R, 7) }); }
    // Sky: hills on the horizon (screen space, panned with the view) and the cloud ceiling.
    const hills = Array.from({ length: 40 }, () => [R(), R()]);
    function cloudStrip(seed, dark) {
      const r = Sim.makeRng(seed), w = 1024, h = 220;
      const cv = K.canvas(w, h), c = cv.getContext('2d');
      c.fillStyle = dark; c.fillRect(0, 0, w, h * 0.45);
      // lumpy underside, tiling at the edges
      const lumps = [];
      for (let x = -60; x < w + 60; x += 40 + r() * 50) lumps.push([x, h * (0.42 + r() * 0.25), 40 + r() * 60]);
      for (const [x, y, rr] of lumps) for (const dx of [0, w, -w]) { c.beginPath(); c.ellipse(x + dx, y, rr * 1.4, rr * 0.55, 0, 0, TAU); c.fillStyle = dark; c.fill(); }
      c.globalCompositeOperation = 'source-atop';
      for (const [x, y, rr] of lumps) for (const dx of [0, w, -w]) { c.beginPath(); c.ellipse(x + dx - rr * 0.3, y - rr * 0.25, rr * 1.1, rr * 0.35, 0, 0, TAU); c.fillStyle = C.cloudLit; c.globalAlpha = 0.35; c.fill(); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.strokeStyle = 'rgba(12,12,14,0.55)'; c.lineWidth = 3;
      for (const [x, y, rr] of lumps) for (const dx of [0, w, -w]) { c.beginPath(); c.ellipse(x + dx, y, rr * 1.4, rr * 0.55, 0, 0.15, Math.PI - 0.15); c.stroke(); }
      return cv;
    }
    const clouds = [cloudStrip(151, C.cloud), cloudStrip(157, C.cloudDark)];
    function sky() {
      const W = V.W, H = V.H, hz = T.horizon(HZ);
      if (hz <= 0) return;
      const g = ctx.createLinearGradient(0, hz - Math.max(120, H * 0.5), 0, hz);
      g.addColorStop(0, C.sky0); g.addColorStop(0.7, C.sky1); g.addColorStop(1, C.sky2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 1);
      // the Tower: a needle of dark stone far to the north, into the cloud
      const tx = P(6, -60, 0).x, sc = V.cam.sc;
      const bw = Math.max(7, sc * 0.55), tw = bw * 0.62;
      ctx.fillStyle = C.tower;
      ctx.beginPath(); ctx.moveTo(tx - bw, hz + 1); ctx.lineTo(tx - tw, -20); ctx.lineTo(tx + tw, -20); ctx.lineTo(tx + bw, hz + 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.towerLit; ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.moveTo(tx - bw, hz + 1); ctx.lineTo(tx - tw, -20); ctx.lineTo(tx - tw * 0.55, -20); ctx.lineTo(tx - bw * 0.6, hz + 1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(20,22,24,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let y = hz - 14; y > 0; y -= 18 + (hz - y) * 0.15) { const k = (hz - y) / (hz + 20), w = bw + (tw - bw) * k; ctx.moveTo(tx - w, y); ctx.lineTo(tx + w, y + 1.5); } ctx.stroke();
      // haze over the Tower's foot
      const hg = ctx.createLinearGradient(0, hz - 40, 0, hz);
      hg.addColorStop(0, `rgba(${C.haze},0)`); hg.addColorStop(1, `rgba(${C.haze},0.6)`);
      ctx.fillStyle = hg; ctx.fillRect(0, hz - 40, W, 41);
      // far hills, two bands
      for (const [col, amp, k] of [[C.far, 16, 0.7], [C.far2, 9, 1.3]]) {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-10, hz + 2);
        const off = (tx * k) % 90;
        for (let i = 0; i < hills.length; i++) { const x = -90 + off + i * ((W + 180) / hills.length); ctx.lineTo(x, hz - hills[i][k > 1 ? 1 : 0] * amp - (k > 1 ? 0 : 2)); }
        ctx.lineTo(W + 10, hz + 2); ctx.closePath(); ctx.fill();
      }
      // the low cloud layer: a ceiling over everything, the Tower going into it
      const ch = Math.min(hz * 0.5, 120), drift = V.time * 4;
      for (const [cv, k, dy] of [[clouds[1], 0.6, -0.25], [clouds[0], 1, 0]]) {
        const w = cv.width * (ch / cv.height) * 1.2, x0 = -((drift * k + tx * 0.2) % w + w) % w;
        for (let x = x0; x < W; x += w) ctx.drawImage(cv, x, ch * dy - ch * 0.15, w, ch);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, hz + 1); ctx.lineTo(W, hz + 1); ctx.stroke();
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        if (o.kind === 'carcass') continue;
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'wall' ? 0.9 : o.r * 1.5);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.2, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.2, o.r * sc * V.cam.pitch, 0, 0, TAU);
      }
      { const b = P(CX, CY, 0), off = K.shadowOff(0.7); ctx.moveTo(b.x + off.x * 0.4 + sc * 1.3, b.y + off.y * 0.4); ctx.ellipse(b.x + off.x * 0.4, b.y + off.y * 0.4, sc * 1.3, sc * 0.8 * V.cam.pitch, 0, 0, TAU); }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      floor.draw();
      sky();
      shadows();
      K.drawSprites(tufts, tuftSp, 0.32);
    }
    const stoneDeco = (face, pts) => {
      const [a, b, c, d] = pts;
      ctx.strokeStyle = 'rgba(10,10,10,0.55)'; ctx.lineWidth = K.lw(0.015, 0.8);
      ctx.beginPath();
      for (const f of [0.4, 0.75]) { ctx.moveTo(a.x + (d.x - a.x) * f, a.y + (d.y - a.y) * f); ctx.lineTo(b.x + (c.x - b.x) * f, b.y + (c.y - b.y) * f); }
      ctx.stroke();
      if (face >= 0) { ctx.fillStyle = '#3a4238'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + (c.x - b.x) * 0.15, b.y + (c.y - b.y) * 0.15); ctx.lineTo(a.x + (d.x - a.x) * 0.25, a.y + (d.y - a.y) * 0.25); ctx.closePath(); ctx.fill(); }
    };
    // A mile marker, sunk and leaning; its carved face worn almost smooth.
    function drawMarker(m) {
      const sc = V.cam.sc;
      if (K.off(P(m.x, m.y, 0), sc * 3)) return;
      const k = m.obstacle ? 1 : Math.max(0.5, K.tall(m.x, m.y));
      T.slab(m.x, m.y, m.r * 0.85, m.r * 0.5, m.rot, m.h * k, m.lx * k, m.ly * k, C.stone, (face, pts, lit) => {
        const [a, b, c, d] = pts;
        const at = (u, v) => ({ x: a.x + (b.x - a.x) * u + (d.x - a.x) * v, y: a.y + (b.y - a.y) * u + (d.y - a.y) * v });
        // lichen and weather streaks
        ctx.strokeStyle = 'rgba(10,10,10,0.35)'; ctx.lineWidth = K.lw(0.012, 0.7); ctx.beginPath();
        for (const u of [0.2, 0.45, 0.8]) { const p = at(u, 0.95), q = at(u + 0.05, 0.35); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }
        ctx.stroke();
        if (!lit && face % 2) return;
        // the face: brow, hollow eyes, a nose ridge, a mouth line, half gone
        ctx.fillStyle = 'rgba(14,12,12,0.7)';
        for (const u of [0.32, 0.66]) { const p = at(u, 0.68); ctx.beginPath(); ctx.ellipse(p.x, p.y, sc * 0.045, sc * 0.03, 0, 0, TAU); ctx.fill(); }
        ctx.strokeStyle = 'rgba(14,12,12,0.6)'; ctx.lineWidth = K.lw(0.018, 0.8); ctx.beginPath();
        let p = at(0.22, 0.78), q = at(0.78, 0.8); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        p = at(0.5, 0.66); q = at(0.47, 0.5); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        p = at(0.36, 0.38); q = at(0.6, 0.36); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(230,216,200,0.35)'; ctx.beginPath(); p = at(0.3, 0.73); q = at(0.7, 0.75); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        // the grass it is sinking into
        ctx.fillStyle = '#2b3229'; ctx.beginPath(); p = at(0, 0); q = at(1, 0); const q2 = at(1, 0.14), p2 = at(0, 0.2); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.lineTo(p2.x, p2.y); ctx.closePath(); ctx.fill();
      });
    }
    function drawWall(o) {
      const w = walls.get(o), sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 4)) return;
      const c = Math.cos(w.rot), s2 = Math.sin(w.rot), n = w.steps.length, hw = 1.0;
      for (let i = 0; i < n; i++) {
        const u = -hw + ((i + 0.5) * 2 * hw) / n;
        K.box(o.x + u * c, o.y + u * s2, hw / n, 0.28, w.rot, 0, w.steps[i], C.stone, stoneDeco);
      }
    }
    // The young Skyreaver's body: split scales over a heaped body, black ribs
    // sprung through, a wing bone snapped and standing, the neck flung out.
    function drawCarcass() {
      const sc = V.cam.sc, b = P(CX, CY, 0);
      if (K.off(b, sc * 5)) return;
      // neck and skull lying on the ground, west and toward the road
      const neck = [[CX - 0.9, CY + 0.15, 0.45], [CX - 1.7, CY + 0.6, 0.25], [CX - 2.3, CY + 1.25, 0.14]];
      const np = neck.map(([x, y, z]) => P(x, y, z));
      T.inked(() => { ctx.moveTo(np[0].x, np[0].y); ctx.quadraticCurveTo(np[1].x, np[1].y, np[2].x, np[2].y); }, 0.26, C.scale, 0.36);
      // skull: a long wedge, jaw dropped open
      const sk = P(CX - 2.55, CY + 1.45, 0.12), snout = P(CX - 3.2, CY + 1.75, 0.08), jaw = P(CX - 3.05, CY + 1.95, 0);
      ctx.beginPath(); ctx.moveTo(sk.x - sc * 0.05, sk.y - sc * 0.2); ctx.lineTo(snout.x, snout.y); ctx.lineTo(sk.x + sc * 0.08, sk.y + sc * 0.06); ctx.closePath();
      ctx.fillStyle = C.scaleLit; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sk.x + sc * 0.05, sk.y + sc * 0.04); ctx.lineTo(jaw.x, jaw.y); ctx.lineTo(sk.x - sc * 0.05, sk.y + sc * 0.1); ctx.closePath(); ctx.fillStyle = C.bone; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d8ccc0'; for (let i = 1; i < 5; i++) { const t = i / 5, x = sk.x + (jaw.x - sk.x) * t, y = sk.y + (jaw.y - sk.y) * t; ctx.fillRect(x, y - sc * 0.05, Math.max(1, sc * 0.02), sc * 0.04); }
      // horns swept back
      T.inked(() => { ctx.moveTo(sk.x, sk.y - sc * 0.15); ctx.quadraticCurveTo(sk.x + sc * 0.3, sk.y - sc * 0.45, sk.x + sc * 0.55, sk.y - sc * 0.35); }, 0.05, C.bone, 0.1);
      // the eye socket, dark: it is dead
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(sk.x - sc * 0.18, sk.y - sc * 0.1, sc * 0.05, sc * 0.025, -0.3, 0, TAU); ctx.fill();
      // the heaped body
      const hump = (k, z, col) => {
        const pts = [];
        for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; pts.push(P(CX + Math.cos(a) * 1.15 * k, CY + Math.sin(a) * 0.1, z * Math.sin((i / 16) * Math.PI) * 0.9 + 0.05)); }
        for (let i = 16; i >= 0; i--) { const a = (i / 16) * Math.PI; pts.push(P(CX + Math.cos(a) * 1.15 * k, CY + 0.75 * k * Math.sin(a), 0)); }
        K.path(pts); ctx.fillStyle = col; ctx.fill();
        return pts;
      };
      const body = hump(1, 0.85, C.scale);
      ctx.save(); K.path(body); ctx.clip();
      // lit shoulder, plates and splits
      hump(0.75, 1.1, C.scaleLit);
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.018, 0.8);
      ctx.beginPath();
      for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) {
        const x = CX - 0.9 + i * 0.3 + (j % 2) * 0.15, p = P(x, CY + 0.15 + j * 0.2, 0.6 - j * 0.18), r2 = sc * 0.14;
        ctx.moveTo(p.x - r2, p.y); ctx.quadraticCurveTo(p.x, p.y + r2 * 0.9, p.x + r2, p.y);
      }
      ctx.stroke();
      ctx.fillStyle = C.flesh;
      for (const [x, z] of [[-0.3, 0.55], [0.4, 0.4]]) { const p = P(CX + x, CY + 0.3, z); ctx.beginPath(); ctx.moveTo(p.x - sc * 0.25, p.y); ctx.lineTo(p.x - sc * 0.05, p.y - sc * 0.06); ctx.lineTo(p.x + sc * 0.22, p.y + sc * 0.02); ctx.lineTo(p.x, p.y + sc * 0.07); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.045, 1.5); K.path(body); ctx.stroke();
      // ribs sprung through the hide: long black arcs
      for (let i = 0; i < 6; i++) {
        const x = CX - 0.7 + i * 0.28, s0 = P(x, CY - 0.05, 0.85 - Math.abs(i - 2.5) * 0.06), m = P(x + 0.1, CY + 0.55, 0.95 - i * 0.03), e = P(x + 0.15, CY + 0.95 + (i % 2) * 0.1, 0.05 + (i % 3) * 0.12);
        T.inked(() => { ctx.moveTo(s0.x, s0.y); ctx.quadraticCurveTo(m.x, m.y, e.x, e.y); }, 0.055, C.bone, 0.1);
        ctx.strokeStyle = C.boneLit; ctx.lineWidth = K.lw(0.012, 0.6); ctx.beginPath(); ctx.moveTo(s0.x - 1, s0.y - 1); ctx.quadraticCurveTo(m.x - 1, m.y - 1, e.x - 1, e.y - 1); ctx.stroke();
      }
      // spine spikes
      ctx.fillStyle = C.bone; ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1);
      for (let i = 0; i < 7; i++) { const p = P(CX - 0.95 + i * 0.32, CY - 0.05, 0.8 - Math.abs(i - 3) * 0.08); ctx.beginPath(); ctx.moveTo(p.x - sc * 0.07, p.y + 2); ctx.lineTo(p.x + sc * 0.06, p.y - sc * 0.22); ctx.lineTo(p.x + sc * 0.08, p.y + 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // the near wing's arm bone, snapped and standing up out of the body
      const w0 = P(CX - 0.2, CY - 0.35, 0.7), w1 = P(CX + 0.5, CY - 0.9, 2.0), w2 = P(CX + 0.75, CY - 1.1, 2.15);
      T.inked(() => { ctx.moveTo(w0.x, w0.y); ctx.lineTo(w1.x, w1.y); }, 0.11, C.bone, 0.18);
      T.inked(() => { ctx.moveTo(w1.x, w1.y); ctx.lineTo(w2.x, w2.y); }, 0.05, C.bone, 0.1);
      ctx.strokeStyle = C.boneLit; ctx.lineWidth = K.lw(0.02, 0.8); ctx.beginPath(); ctx.moveTo(w0.x - 2, w0.y); ctx.lineTo(w1.x - 2, w1.y); ctx.stroke();
      // a rag of membrane hanging from it
      ctx.fillStyle = C.wing; ctx.beginPath(); ctx.moveTo(w1.x, w1.y); ctx.lineTo(w1.x + sc * 0.1, w1.y + sc * 0.6); ctx.lineTo(w1.x - sc * 0.05, w1.y + sc * 0.45); ctx.lineTo(w1.x - sc * 0.15, w1.y + sc * 0.8); ctx.lineTo((w0.x + w1.x) / 2, (w0.y + w1.y) / 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1); ctx.stroke();
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'wall') out.push({ d, f: () => drawWall(o) });
        else if (o.kind === 'rock') out.push({ d, f: () => K.drawRock(o.x, o.y, o.r, rockSh.get(o), C.rock, 0.5, 0.9) });
        else if (o.kind === 'carcass') out.push({ d, f: drawCarcass });
      }
      for (const m of markers) out.push({ d: P(m.x, m.y, 0).d, f: () => drawMarker(m) });
      for (const r of rubble) out.push({ d: P(r.x, r.y, 0).d, f: () => K.drawRock(r.x, r.y, r.r, r.sh, C.rock, 0.4, 0.75) });
      void s;
      return out;
    }
    const overlay = K.overlay({
      vig: [0.26, 0.66], vigCol: '10,12,12', tone: 1.35,
      paint(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(30,34,38,0.35)'); g.addColorStop(0.4, 'rgba(160,170,175,0.05)'); g.addColorStop(1, 'rgba(14,16,16,0.25)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
    });
    const motes = K.motes(18, 147, (r) => (r() < 0.7 ? 0 : 1));
    function drawAtmosphere() {
      overlay.draw();
      K.drawMotes(motes, ['rgba(220,222,214,0.35)', 'rgba(180,186,180,0.3)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset, free: floor.free };
  }

  // ================================================================ shadowcity
  // The Shadow City's lower district: several versions of one city stacked
  // on the same bones. Buildings lean, each storey a different age on the
  // one below; alleys narrow into black seams; bridges cross overhead in the
  // distance; smoke rises from vents; lamps burn in a few upper windows.
  // Permanent shade. Oppressive and watchful.
  function shadowcity(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A), T = road2(V, K);
    const R = Sim.makeRng(161);
    const C = {
      bg: '#0c0c10', cob: '#2a2a30', cobLit: '#36353c', cobDark: '#1f1f25', joint: '#111115', wet: '#121820', gleam: 'rgba(170,185,210,0.35)',
      bands: [['#25242b', '#34333c', '#16161b'], ['#2a2425', '#3a3132', '#191516'], ['#212428', '#2f363e', '#131618'], ['#28261f', '#38352e', '#171612']],
      far: ['#1b1b22', '#23232b', '#121216'], farthest: '#121218', back: '#0f0f13', roof: '#0d0d10',
      win: '#08080b', lamp: '#f1b466', lampCore: '#ffe2b0', frame: '#121216',
      stone: { lit: '#3a3940', shade: '#1c1b21', top: '#46444c', rim: '#a8a4b8' },
      crate: { lit: '#5a4838', shade: '#2c231b', top: '#6a5644', rim: '#e0c4a0' },
      shadowA: 'rgba(4,4,8,0.55)',
    };
    const exitA = Math.atan2(A.exit.y / A.ry, A.exit.x / A.rx);
    const angDist = (a, b) => { const d = Math.abs(((a - b) % TAU + TAU) % TAU); return Math.min(d, TAU - d); };
    // Buildings round the street in three depths. Each storey is its own
    // segment, leaning a little further than the one under it.
    function ring(k, hMin, hMax, nBands, leanK, gapEvery, seed) {
      const r = Sim.makeRng(seed), out = [], seams = [];
      let a = -Math.PI + r() * 0.2, i = 0;
      while (a < Math.PI - 0.05) {
        const w = 0.22 + r() * 0.24;
        let a0 = a, a1 = Math.min(Math.PI + 0.05, a + w);
        const alley = (gapEvery && i % gapEvery === gapEvery - 1) || angDist((a0 + a1) / 2, exitA) < 0.18;
        a = a1; i++;
        if (alley) { seams.push((a0 + a1) / 2); a0 += w * 0.42; a1 -= w * 0.42; }
        const p0 = [Math.cos(a0) * A.rx * k, Math.sin(a0) * A.ry * k], p1 = [Math.cos(a1) * A.rx * k, Math.sin(a1) * A.ry * k];
        const tx = p1[0] - p0[0], ty = p1[1] - p0[1], tl = Math.hypot(tx, ty) || 1;
        const lean = (r() - 0.5) * leanK, outK = 0.1 + r() * 0.15;
        const H = hMin + r() * (hMax - hMin), nb = nBands;
        let z = 0, lx = 0, ly = 0;
        const bands = [];
        for (let b = 0; b < nb; b++) {
          const hb = (H / nb) * (0.8 + r() * 0.4);
          const nlx = lx + (tx / tl) * lean + Math.cos((a0 + a1) / 2) * outK * (b + 1) * 0.15, nly = ly + (ty / tl) * lean + Math.sin((a0 + a1) / 2) * outK * (b + 1) * 0.15;
          bands.push({ x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1], z0: z, h: z + hb, bx: lx, by: ly, lx: nlx, ly: nly, tone: Math.floor(r() * 4), cols: 2 + Math.floor(r() * 3), rows: 1 + Math.floor(r() * 2), lit: Array.from({ length: 8 }, () => r() < (b === nb - 1 ? 0.3 : 0.06)), band: b });
          z += hb; lx = nlx; ly = nly;
        }
        out.push({ bands, vent: r() < 0.35, ph: r() * 10, a: (a0 + a1) / 2 });
      }
      return { list: out, seams, segs: out.flatMap((b) => b.bands) };
    }
    const R1 = ring(1.12, 5.5, 8.5, 3, 0.35, 4, 163);
    const R2 = ring(1.55, 9, 13, 3, 0.5, 5, 167);
    const R3 = ring(2.1, 13, 19, 2, 0.6, 0, 173);
    // Bridges overhead between the far buildings.
    const bridges = [];
    for (const [a0, a1, z, k] of [[-2.55, -1.95, 6.2, 1.75], [-1.65, -1.05, 7.4, 1.9], [-0.95, -0.4, 5.6, 1.7], [-2.2, -1.3, 9.5, 2.0]]) bridges.push({ a0, a1, z, k });
    const crates = new Map();
    for (const o of A.obstacles) if (o.kind === 'crate') crates.set(o, { rot: R() * 1.2 });
    const walls = new Map();
    for (const o of A.obstacles) if (o.kind === 'wall') walls.set(o, { rot: (R() - 0.5) * 0.6 + (o.y < 0 ? 0.2 : -0.3), steps: [1.9, 1.4, 0.9, 1.6, 0.6, 0.35] });
    const floor = T.bake(-17, -10, 17, 9, 40, (c) => {
      const r = Sim.makeRng(171);
      c.fillStyle = C.joint; c.fillRect(-17, -10, 34, 19);
      // cobbles in courses, worn and uneven
      for (let y = -10; y < 9; y += 0.26) {
        const off = (Math.round(y / 0.26) & 1) * 0.16;
        for (let x = -17 + off; x < 17; x += 0.3 + r() * 0.06) {
          const t = r();
          c.fillStyle = t < 0.18 ? C.cobLit : t < 0.4 ? C.cobDark : C.cob;
          c.beginPath(); c.ellipse(x, y, 0.13 + r() * 0.02, 0.1, (r() - 0.5) * 0.3, 0, TAU); c.fill();
        }
      }
      // the gutter down the middle of the street, wet
      c.fillStyle = C.wet; c.beginPath(); c.moveTo(-17, 0.15); for (let x = -17; x <= 17; x += 1) c.lineTo(x, 0.15 + Math.sin(x * 0.3) * 0.12); for (let x = 17; x >= -17; x -= 1) c.lineTo(x, 0.55 + Math.sin(x * 0.3) * 0.12); c.closePath(); c.fill();
      c.strokeStyle = C.gleam; c.lineWidth = 0.03; c.beginPath();
      for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 34; c.moveTo(x, 0.3 + Math.sin(x * 0.3) * 0.12); c.lineTo(x + 0.3 + r() * 0.5, 0.3 + Math.sin(x * 0.3) * 0.12); }
      c.stroke();
      // puddles holding the little light there is
      for (let i = 0; i < 9; i++) {
        const x = (r() - 0.5) * 22, y = (r() - 0.5) * 9;
        if (K.inObstacle(x, y, 0.6)) continue;
        c.fillStyle = C.wet; T.fillPoly(c, T.blob(r, x, y, 0.5 + r() * 0.7, 0.3 + r() * 0.3, 10, 0.4)); c.fill();
        c.strokeStyle = C.gleam; c.lineWidth = 0.025; c.beginPath(); c.moveTo(x - 0.3, y - 0.05); c.lineTo(x + 0.15, y - 0.08); c.stroke();
      }
      // soot and damp creeping out from the walls
      for (let i = 0; i < 60; i++) { const a = r() * TAU, k = 0.95 + r() * 0.3; c.fillStyle = 'rgba(6,6,9,0.45)'; T.fillPoly(c, T.blob(r, Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, 0.6 + r() * 1.2, 0.4 + r() * 0.6, 8, 0.6)); c.fill(); }
      // litter: rags, broken boards
      c.strokeStyle = '#3a3029'; c.lineWidth = 0.05;
      for (let i = 0; i < 14; i++) { const a = r() * TAU, k = 0.7 + r() * 0.3, x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k; if (K.inObstacle(x, y, 0.3)) continue; const b = r() * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(b) * 0.4, y + Math.sin(b) * 0.4); c.stroke(); }
    });
    const lampsSeen = [];
    // One ring of facades: faces, storey lines, windows, lamps.
    function facades(Rg, far, minF, cap) {
      const qs = T.quads(Rg.segs, minF, cap);
      const sh = new Path2D(), lit = new Path2D(), win = new Path2D(), lamp = new Path2D(), line = new Path2D(), tex = new Path2D(), ledge = new Path2D();
      for (const q of qs) {
        if (K.off(q.t0, 400) && K.off(q.b1, 400)) continue;
        const g = q.g;
        if (q.facing <= 0 || (far && q.d > 0)) { if (!far) { ctx.fillStyle = C.roof; ctx.beginPath(); T.quadPath(q); ctx.fill(); } continue; }
        const pal = far ? C.far : C.bands[g.tone];
        ctx.fillStyle = q.sx > 0.3 ? pal[1] : q.sx < -0.4 ? pal[2] : pal[0];
        ctx.beginPath(); T.quadPath(q); ctx.fill();
        // the shadow side of each storey: a hard band under the floor above
        T.sub(sh, q, 0, 1, 0.82, 1);
        if (q.sx > 0.3) T.sub(lit, q, 0, 0.06, 0, 1);
        T.quadPath(q, line);
        // each storey built by a different age: coursed stone, timber frame, boards
        const st = (g.band + g.tone) % 3;
        if (st === 0) for (const v of [0.25, 0.5, 0.75]) { const a = T.on(q, 0, v), b = T.on(q, 1, v); tex.moveTo(a.x, a.y); tex.lineTo(b.x, b.y); }
        else if (st === 1) for (let i = 0; i < g.cols; i++) { const a = T.on(q, i / g.cols, 0), b = T.on(q, (i + 1) / g.cols, 1), c = T.on(q, (i + 1) / g.cols, 0), d = T.on(q, i / g.cols, 1); tex.moveTo(a.x, a.y); tex.lineTo(b.x, b.y); tex.moveTo(c.x, c.y); tex.lineTo(d.x, d.y); }
        else for (let i = 1; i < 8; i++) { const a = T.on(q, i / 8, 0), b = T.on(q, i / 8, 1); tex.moveTo(a.x, a.y); tex.lineTo(b.x, b.y); }
        { const a = T.on(q, -0.02, 1), b = T.on(q, 1.02, 1); ledge.moveTo(a.x, a.y); ledge.lineTo(b.x, b.y); }
        // windows, mostly black; a few lamps in the upper storeys
        const fk = Math.min(q.f0, q.f1);
        if (fk < 0.45) continue;
        const cols = far ? g.cols + 1 : g.cols, rows = g.rows;
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
          const u0 = (i + 0.3) / cols, u1 = (i + 0.7) / cols, v0 = 0.2 + (j / rows) * 0.6, v1 = v0 + 0.5 / rows;
          const on = g.lit[(i + j * 3) % 8];
          T.sub(on ? lamp : win, q, u0, u1, v0, v1);
          if (on) { const p = T.on(q, (u0 + u1) / 2, (v0 + v1) / 2); lampsSeen.push({ x: p.x, y: p.y, far }); }
        }
      }
      ctx.strokeStyle = 'rgba(4,4,8,0.4)'; ctx.lineWidth = K.lw(0.02, 0.8); ctx.stroke(tex);
      ctx.fillStyle = 'rgba(4,4,8,0.45)'; ctx.fill(sh);
      ctx.fillStyle = 'rgba(200,196,220,0.12)'; ctx.fill(lit);
      ctx.fillStyle = C.win; ctx.fill(win);
      ctx.fillStyle = C.lamp; ctx.fill(lamp);
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(far ? 0.025 : 0.035, 1); ctx.lineJoin = 'round'; ctx.stroke(line);
      ctx.strokeStyle = C.frame; ctx.lineWidth = K.lw(0.02, 0.8); ctx.stroke(win);
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.07, 1.5); ctx.stroke(ledge);
    }
    // Alleys: the gaps between buildings narrow into black seams.
    function seams(Rg, k) {
      ctx.fillStyle = '#030304';
      ctx.beginPath();
      for (const a of Rg.seams) {
        const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
        if (K.depth(x, y) > 0) continue;
        const f = K.tall(x, y), w = 0.55, tx = -Math.sin(a), ty = Math.cos(a) * (A.ry / A.rx);
        const b0 = P(x - tx * w, y - ty * w, 0), b1 = P(x + tx * w, y + ty * w, 0), d = P(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.2, 0);
        const t0 = P(x - tx * 0.12, y - ty * 0.12, 9 * f), t1 = P(x + tx * 0.12, y + ty * 0.12, 9 * f);
        ctx.moveTo(b0.x, b0.y); ctx.lineTo(d.x, d.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t0.x, t0.y); ctx.closePath();
      }
      ctx.fill();
    }
    function drawBridges() {
      for (const b of bridges) {
        const at = (a, z) => P(Math.cos(a) * A.rx * b.k, Math.sin(a) * A.ry * b.k, z);
        const pts = [], und = [];
        for (let i = 0; i <= 12; i++) { const a = b.a0 + (b.a1 - b.a0) * (i / 12); pts.push(at(a, b.z + 0.9)); und.push(at(a, b.z - 0.2 - Math.sin((i / 12) * Math.PI) * 0.0 + (1 - Math.sin((i / 12) * Math.PI)) * -1.6)); }
        ctx.beginPath(); K.poly(pts.concat(und.reverse())); ctx.fillStyle = C.back; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
        // railing posts
        ctx.strokeStyle = C.back; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = 0; i <= 12; i += 1) { const p = pts[i]; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y - V.cam.sc * 0.5); }
        const r0 = pts[0], r1 = pts[12]; ctx.moveTo(r0.x, r0.y - V.cam.sc * 0.5); ctx.lineTo(r1.x, r1.y - V.cam.sc * 0.5);
        ctx.stroke();
        const mid = pts[6]; lampsSeen.push({ x: mid.x, y: mid.y - V.cam.sc * 0.6, far: true, small: true });
      }
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'wall' ? 1.6 : 0.8);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.3, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.3, o.r * sc * V.cam.pitch, 0, 0, TAU);
      }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() {
      lampsSeen.length = 0;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      ctx.save(); T.clipRing(1.13); floor.draw(); ctx.restore();
      // farthest: the oldest city, nearly black
      const q3 = T.quads(R3.segs, 0.35);
      ctx.fillStyle = C.farthest; ctx.beginPath();
      for (const q of q3) if (q.facing > 0) T.quadPath(q);
      ctx.fill();
      drawBridges();
      facades(R2, true, 0.3);
      seams(R1, 1.12);
      facades(R1, false, 0.12, 0.9);
      shadows();
    }
    const stoneDeco = (face, pts) => {
      const [a, b, c, d] = pts;
      ctx.strokeStyle = 'rgba(6,6,10,0.6)'; ctx.lineWidth = K.lw(0.015, 0.8);
      ctx.beginPath();
      for (const f of [0.25, 0.5, 0.75]) { ctx.moveTo(a.x + (d.x - a.x) * f, a.y + (d.y - a.y) * f); ctx.lineTo(b.x + (c.x - b.x) * f, b.y + (c.y - b.y) * f); }
      ctx.stroke();
    };
    function drawWall(o) {
      const w = walls.get(o), sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 5)) return;
      const k = Math.max(0.45, K.tall(o.x, o.y));
      const c = Math.cos(w.rot), s2 = Math.sin(w.rot), n = w.steps.length, hw = 0.95;
      for (let i = 0; i < n; i++) {
        const u = -hw + ((i + 0.5) * 2 * hw) / n;
        K.box(o.x + u * c, o.y + u * s2, hw / n, 0.24, w.rot, 0, w.steps[i] * k, C.stone, stoneDeco);
      }
    }
    const crateDeco = (face, pts) => {
      const [a, b, c, d] = pts;
      ctx.strokeStyle = 'rgba(14,8,4,0.7)'; ctx.lineWidth = K.lw(0.015, 0.8);
      ctx.beginPath();
      for (const f of [0.33, 0.66]) { ctx.moveTo(a.x + (d.x - a.x) * f, a.y + (d.y - a.y) * f); ctx.lineTo(b.x + (c.x - b.x) * f, b.y + (c.y - b.y) * f); }
      if (face >= 0) { ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); }
      ctx.stroke();
    };
    function drawCrate(o) {
      const cr = crates.get(o);
      if (K.off(P(o.x, o.y, 0), V.cam.sc * 3)) return;
      K.box(o.x, o.y, o.r * 0.72, o.r * 0.72, cr.rot, 0, o.r * 1.4, C.crate, crateDeco);
      K.box(o.x + 0.06, o.y - 0.04, o.r * 0.5, o.r * 0.5, cr.rot + 0.4, o.r * 1.4, o.r * 2.3, C.crate, crateDeco);
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'wall') out.push({ d, f: () => drawWall(o) });
        else if (o.kind === 'crate') out.push({ d, f: () => drawCrate(o) });
      }
      void s;
      return out;
    }
    const overlay = K.overlay({
      vig: [0.45, 0.9], vigCol: '4,4,8', tone: 1.15, toneCol: 'rgba(6,6,10,0.5)',
      paint(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(4,4,8,0.55)'); g.addColorStop(0.45, 'rgba(60,64,90,0.06)'); g.addColorStop(1, 'rgba(4,4,8,0.3)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
    });
    const vents = [];
    for (const [Rg, k] of [[R1, 1.12], [R2, 1.55]]) for (const b of Rg.list) if (b.vent) { const top = b.bands[b.bands.length - 1]; vents.push({ x: (top.x0 + top.x1) / 2 + top.lx, y: (top.y0 + top.y1) / 2 + top.ly, h: top.h, ph: b.ph, k }); }
    const motes = K.motes(16, 179, (r) => (r() < 0.8 ? 0 : 1));
    function drawAtmosphere() {
      const sc = V.cam.sc, t = V.time;
      // smoke from the vents, leaning away on a slow draught
      ctx.fillStyle = 'rgba(70,70,80,0.13)';
      ctx.beginPath();
      for (const v of vents) {
        if (K.depth(v.x, v.y) > 0) continue;
        const f = K.tall(v.x, v.y);
        for (let i = 0; i < 6; i++) {
          const u = ((t * 0.12 + v.ph + i / 6) % 1), p = P(v.x + u * 2.2, v.y, v.h * f + u * 5), r = sc * (0.3 + u * 1.3);
          if (K.off(p, r)) continue;
          ctx.moveTo(p.x + r, p.y); ctx.ellipse(p.x, p.y, r, r * 0.6, 0, 0, TAU);
        }
      }
      ctx.fill();
      // the lamps in the windows: warm, small, watching
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const l of lampsSeen) { const r = sc * (l.small ? 0.5 : l.far ? 0.8 : 1.1); T.glow('241,170,90', l.x, l.y, r, r, l.far ? 0.25 : 0.35); }
      ctx.restore();
      overlay.draw();
      K.drawMotes(motes, ['rgba(160,160,180,0.3)', 'rgba(241,180,102,0.35)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset, free: floor.free };
  }

  // ================================================================ farmland
  // The Dead Farms: black burned lowland fields, dead grass, snapped
  // fences, a collapsed well, a scarecrow hanging from a broken post, and
  // dead beasts, one in a crater of dark earth.
  function farmland(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A), T = road2(V, K);
    const R = Sim.makeRng(181);
    const C = {
      bg: '#120f0d', soil: '#181412', soilLit: '#221d19', ash: '#45403a', ashLit: '#5d574e', char: '#0f0d0b', furrow: 'rgba(8,6,5,0.7)',
      straw: '#6f6650', strawDark: '#3d372b', crater: '#120f0c', craterLip: '#2f2821', clod: '#3a3128',
      sky0: '#2a2420', sky1: '#4a3f36', sky2: '#6d5e50', haze: '110,96,82', far: '#231e1a', tree: '#0d0b0a',
      wood: { lit: '#5d4a38', shade: '#2a2119', top: '#6e5a45', rim: '#e8c8a0' }, woodBurnt: '#1c1612',
      stone: { base: '#3a3633', shade: '#211e1c', lit: '#57524c', rim: '#e0d0c0', top: '#4a4540' },
      rock: { base: '#332f2c', mid: '#4a4541', lit: '#6b645d', rim: '#e0d0c0' },
      hide: '#2e2624', hideLit: '#4a3d38', bone: '#cfc2b0', boneShade: '#857a6c', flesh: '#3d1518',
      cloth: '#3a3430', clothLit: '#544b44', sack: '#6a5e48', sackShade: '#3e3628',
      grassT: { ink: '#16130f', lit: '#6f6650', tip: '#a89c7c' },
      shadowA: 'rgba(6,5,4,0.5)',
    };
    const HZ = A.ry * 1.3;
    const beast = A.obstacles.find((o) => o.kind === 'carcass');
    const BX = beast ? beast.x : -1, BY = beast ? beast.y : -2.8;
    // Decorative dead beasts outside the ring.
    const beasts = [{ x: BX, y: BY, r: beast ? beast.r : 0.9, rot: 0.3, obstacle: true }, { x: -12.5, y: 5.6, r: 0.75, rot: 2.6 }, { x: 12.8, y: -6.4, r: 0.7, rot: -0.6 }, { x: 9.6, y: 6.9, r: 0.6, rot: 1.9 }];
    // Fence runs (posts along a line, some snapped, rails hanging) outside the arena.
    const fences = [];
    const fenceRun = (x0, y0, x1, y1, n, seed) => {
      const r = Sim.makeRng(seed);
      for (let i = 0; i <= n; i++) { const t = i / n; fences.push({ x: x0 + (x1 - x0) * t + (r() - 0.5) * 0.1, y: y0 + (y1 - y0) * t, h: r() < 0.35 ? 0.35 + r() * 0.3 : 1.0 + r() * 0.2, lean: (r() - 0.5) * 0.3, rail: r() < 0.65, sag: r() < 0.3, nx: x0 + (x1 - x0) * ((i + 1) / n), ny: y0 + (y1 - y0) * ((i + 1) / n), last: i === n }); }
    };
    fenceRun(-15, -HZ + 1.0, -2, -HZ + 0.6, 12, 183);
    fenceRun(3, -HZ + 0.4, 15, -HZ + 1.6, 11, 187);
    fenceRun(-15, 8.2, 15, 8.6, 24, 191);
    const fenceO = A.obstacles.filter((o) => o.kind === 'fence');
    const well = A.obstacles.find((o) => o.kind === 'well');
    const crow = A.obstacles.find((o) => o.kind === 'scarecrow');
    const stumps = [];
    for (let i = 0; i < 9; i++) { const a = R() * TAU, k = 1.15 + R() * 0.5; const x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k; if (y < -HZ + 0.5) continue; stumps.push({ x, y, r: 0.15 + R() * 0.12, h: 0.4 + R() * 1.4, sh: R() }); }
    const tuftSp = [];
    for (let i = 0; i < 5; i++) tuftSp.push(K.tuft(711 + i * 7, C.grassT, i < 3, i < 2));
    const tufts = [];
    for (let i = 0; i < 600 && tufts.length < 130; i++) {
      const x = (R() - 0.5) * 34, y = -HZ + R() * (HZ + 9);
      if (K.inObstacle(x, y, 0.4) || Math.hypot(x - BX, y - BY) < 2.4) continue;
      if (K.inArena(x, y, 0.8) && R() < 0.8) continue;
      tufts.push({ x, y, s: 0.5 + R() * 0.7, v: tufts.length % 5 });
    }
    const wellStones = well ? Array.from({ length: 9 }, () => { const a = R() * TAU, d = well.r + 0.25 + R() * 0.7; return { x: well.x + Math.cos(a) * d, y: well.y + Math.sin(a) * d * 0.8, r: 0.1 + R() * 0.14, sh: K.rockShape(R, 6) }; }) : [];
    const floor = T.bake(-19, -HZ - 3, 19, 11, 40, (c) => {
      const r = Sim.makeRng(189);
      c.fillStyle = C.soil; c.fillRect(-19, -HZ - 3, 38, HZ + 14);
      // fields: strips of furrows at different angles, burned black
      const fields = [[-19, -HZ - 3, 12, 8, 0.12], [-7, -HZ - 3, 15, 7, -0.05], [8, -HZ - 3, 11, 9, 0.2], [-19, 3, 16, 8, -0.1], [-3, 2.5, 22, 9, 0.06], [-19, -4, 10, 8, 0.0], [9, -2, 10, 6, -0.15]];
      for (const [x, y, w, h, rot] of fields) {
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
        c.fillStyle = r() < 0.5 ? C.soilLit : C.soil; c.fillRect(x, y, w, h);
        c.translate(x + w / 2, y + h / 2); c.rotate(rot);
        c.strokeStyle = C.furrow; c.lineWidth = 0.09; c.beginPath();
        for (let yy = -h; yy < h; yy += 0.42) { c.moveTo(-w, yy); c.lineTo(w, yy); }
        c.stroke();
        c.strokeStyle = 'rgba(90,82,72,0.25)'; c.lineWidth = 0.03; c.beginPath();
        for (let yy = -h + 0.12; yy < h; yy += 0.42) { c.moveTo(-w, yy); c.lineTo(w, yy); }
        c.stroke();
        c.restore();
        c.strokeStyle = 'rgba(6,5,4,0.6)'; c.lineWidth = 0.05; c.strokeRect(x, y, w, h);
      }
      // char and ash: black burns, grey ash drifts
      for (let i = 0; i < 40; i++) { c.fillStyle = r() < 0.55 ? C.char : 'rgba(80,74,66,0.35)'; T.fillPoly(c, T.blob(r, (r() - 0.5) * 36, -HZ + r() * (HZ + 10), 0.8 + r() * 2.2, 0.5 + r() * 1.2, 10, 0.6)); c.fill(); }
      // dead grass in patches: pale stubble strokes, and burnt stubble
      for (const [col, n, w, l] of [[C.char, 1300, 0.03, 0.12], [C.strawDark, 700, 0.025, 0.16], [C.straw, 420, 0.02, 0.18]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath();
        for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 38, y = -HZ - 2 + r() * (HZ + 12), ll = l * (0.5 + r()); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * ll, y - ll); }
        c.stroke();
      }
      // the crater round the beast: dark thrown earth, a lip, clods
      c.fillStyle = C.craterLip; T.fillPoly(c, T.blob(r, BX, BY, 2.3, 1.7, 18, 0.25)); c.fill();
      c.fillStyle = C.crater; T.fillPoly(c, T.blob(r, BX, BY, 1.8, 1.25, 16, 0.15)); c.fill();
      c.strokeStyle = 'rgba(70,60,50,0.4)'; c.lineWidth = 0.03; c.beginPath();
      for (let i = 0; i < 26; i++) { const a = r() * TAU; c.moveTo(BX + Math.cos(a) * 1.4, BY + Math.sin(a) * 1.0); c.lineTo(BX + Math.cos(a) * 2.5, BY + Math.sin(a) * 1.8); }
      c.stroke();
      c.fillStyle = C.clod;
      for (let i = 0; i < 40; i++) { const a = r() * TAU, d = 1.9 + r() * 1.6; c.beginPath(); c.ellipse(BX + Math.cos(a) * d * 1.2, BY + Math.sin(a) * d * 0.85, 0.05 + r() * 0.1, 0.04 + r() * 0.06, r() * 3, 0, TAU); c.fill(); }
      // a dark stain round each dead beast
      for (const b of beasts) { c.fillStyle = 'rgba(30,8,10,0.45)'; T.fillPoly(c, T.blob(r, b.x + 0.4, b.y + 0.3, b.r * 1.5, b.r * 0.9, 10, 0.5)); c.fill(); }
      // well: a ring of fallen stones on the ground
      if (well) { c.fillStyle = 'rgba(6,5,4,0.6)'; c.beginPath(); c.ellipse(well.x + 0.2, well.y + 0.1, well.r * 1.6, well.r * 1.3, 0, 0, TAU); c.fill(); }
    });
    function sky() {
      const W = V.W, H = V.H, hz = T.horizon(HZ);
      if (hz <= 0) return;
      const g = ctx.createLinearGradient(0, hz - Math.max(120, H * 0.45), 0, hz);
      g.addColorStop(0, C.sky0); g.addColorStop(0.75, C.sky1); g.addColorStop(1, C.sky2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 1);
      // smoke still going up from somewhere beyond the farms
      const t = V.time, sc = V.cam.sc, ox = P(0, -40, 0).x;
      ctx.fillStyle = 'rgba(30,26,24,0.35)';
      ctx.beginPath();
      for (const [dx, ph] of [[-0.3, 0], [0.42, 3]]) {
        const x0 = ox + dx * W;
        for (let i = 0; i < 9; i++) { const u = (i / 9 + t * 0.02 + ph) % 1, x = x0 + u * u * W * 0.25, y = hz - u * hz * 1.1, r = 10 + u * sc * 2.5; ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r * 0.55, 0, 0, TAU); }
      }
      ctx.fill();
      // the far line: low land and dead trees, black against the haze
      ctx.fillStyle = C.far; ctx.fillRect(0, hz - 4, W, 6);
      ctx.strokeStyle = C.tree; ctx.fillStyle = C.tree; ctx.lineCap = 'round';
      const off = ((ox * 0.8) % 140 + 140) % 140;
      for (let i = -1; i < W / 70 + 1; i++) {
        const x = i * 70 + off + ((i * 37) % 23), h = 18 + ((i * 53) % 29);
        ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, hz); ctx.lineTo(x + 1, hz - h);
        ctx.lineWidth = 1.2; ctx.moveTo(x + 1, hz - h * 0.6); ctx.lineTo(x + 8, hz - h * 0.9); ctx.moveTo(x, hz - h * 0.75); ctx.lineTo(x - 6, hz - h); ctx.stroke();
      }
      const hg = ctx.createLinearGradient(0, hz - 30, 0, hz);
      hg.addColorStop(0, `rgba(${C.haze},0)`); hg.addColorStop(1, `rgba(${C.haze},0.4)`);
      ctx.fillStyle = hg; ctx.fillRect(0, hz - 30, W, 31);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, hz + 1); ctx.lineTo(W, hz + 1); ctx.stroke();
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) {
        if (o.kind === 'carcass') continue;
        const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'scarecrow' ? 2 : 0.9);
        ctx.moveTo(b.x + off.x * 0.5 + o.r * sc * 1.2, b.y + off.y * 0.5);
        ctx.ellipse(b.x + off.x * 0.5, b.y + off.y * 0.5, o.r * sc * 1.2, o.r * sc * V.cam.pitch, 0, 0, TAU);
      }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      floor.draw();
      sky();
      shadows();
      K.drawSprites(tufts, tuftSp, 0.3);
    }
    // A post (upright, leaning, maybe snapped to a splintered stump).
    function post(x, y, h, lean, w, burnt) {
      const b = P(x, y, 0), t = P(x + lean, y, h);
      T.inked(() => { ctx.moveTo(b.x, b.y); ctx.lineTo(t.x, t.y); }, w, burnt ? C.woodBurnt : C.wood.lit, w + 0.05);
      ctx.strokeStyle = C.wood.shade; ctx.lineWidth = K.lw(w * 0.4, 1); ctx.beginPath(); ctx.moveTo(b.x + K.lw(w * 0.25), b.y); ctx.lineTo(t.x + K.lw(w * 0.25), t.y); ctx.stroke();
      return t;
    }
    function drawFencePost(f) {
      if (K.off(P(f.x, f.y, 0), 60)) return;
      const k = Math.max(0.5, K.tall(f.x, f.y));
      const top = post(f.x, f.y, f.h * k, f.lean * k, 0.09, f.h < 0.7);
      if (f.h < 0.7) { ctx.strokeStyle = C.wood.lit; ctx.lineWidth = K.lw(0.02, 1); ctx.beginPath(); ctx.moveTo(top.x - 3, top.y + 2); ctx.lineTo(top.x, top.y - 4); ctx.lineTo(top.x + 3, top.y + 1); ctx.stroke(); }
      if (!f.rail || f.last) return;
      const a = P(f.x + f.lean * k * 0.6, f.y, 0.7 * Math.min(f.h, 0.9) * k), z2 = f.sag ? 0.05 : 0.75 * k, b = P(f.nx, f.ny, z2);
      T.inked(() => { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }, 0.06, C.wood.lit, 0.11);
    }
    // The snapped fence obstacle: three posts, rails broken and hanging.
    function drawFence(o) {
      if (K.off(P(o.x, o.y, 0), V.cam.sc * 3)) return;
      const ps = [[-0.55, 0.25, 1.05, 0.1], [0, 0, 0.45, -0.05], [0.5, -0.2, 0.95, -0.2]];
      const tops = ps.map(([dx, dy, h, l]) => post(o.x + dx, o.y + dy, h, l, 0.1, h < 0.6));
      const p0 = P(o.x - 0.55, o.y + 0.25, 0.75), p1 = P(o.x - 0.1, o.y + 0.1, 0.4), p2 = P(o.x + 0.2, o.y, 0.02), p3 = P(o.x + 0.5, o.y - 0.2, 0.7), p4 = P(o.x + 1.1, o.y - 0.3, 0.05);
      T.inked(() => { ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); }, 0.06, C.wood.lit, 0.11);
      T.inked(() => { ctx.moveTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); }, 0.06, C.wood.lit, 0.11);
      T.inked(() => { ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); }, 0.06, C.wood.lit, 0.11);
      void tops;
    }
    // The well: a ring of stones fallen in on one side, the windlass down.
    function drawWell(o) {
      if (K.off(P(o.x, o.y, 0), V.cam.sc * 3)) return;
      const jag = (a) => { const s = Math.sin(a * 1 + 0.6); return s > 0.2 ? -0.55 * (s - 0.2) * 1.6 : -0.05 * Math.sin(a * 7); };
      K.cyl(o.x, o.y, o.r * 0.85, 0, 0.7, C.stone, jag, {
        n: 26,
        inside(b, t, rx, ry) {
          ctx.strokeStyle = 'rgba(8,6,5,0.6)'; ctx.lineWidth = K.lw(0.015, 0.8); ctx.beginPath();
          for (const f of [0.33, 0.66]) { const y = b.y + (t.y - b.y) * f; ctx.moveTo(b.x - rx, y); ctx.lineTo(b.x + rx, y); }
          for (let i = 0; i < 6; i++) { const x = b.x - rx + (i + 0.5) * rx / 3; ctx.moveTo(x, b.y + (t.y - b.y) * ((i % 2) * 0.33)); ctx.lineTo(x, b.y + (t.y - b.y) * ((i % 2) * 0.33 + 0.33)); }
          ctx.stroke();
        },
        topInside(t, rx, ry) { ctx.fillStyle = '#050403'; ctx.beginPath(); ctx.ellipse(t.x, t.y + ry * 0.1, rx * 0.8, ry * 0.75, 0, 0, TAU); ctx.fill(); },
      });
      // the windlass post, one standing, the beam fallen across
      const t1 = post(o.x - o.r * 0.8, o.y - 0.15, 1.4, 0.05, 0.09, true);
      const e = P(o.x + o.r * 1.1, o.y + 0.5, 0.05);
      T.inked(() => { ctx.moveTo(t1.x, t1.y + 4); ctx.lineTo(e.x, e.y); }, 0.08, C.woodBurnt, 0.13);
      const ro = P(o.x - 0.1, o.y, 0.85);
      ctx.strokeStyle = '#7a6a50'; ctx.lineWidth = K.lw(0.015, 1); ctx.beginPath(); ctx.moveTo(ro.x, ro.y); ctx.quadraticCurveTo(ro.x + 6, ro.y + V.cam.sc * 0.4, ro.x + 2, ro.y + V.cam.sc * 0.7); ctx.stroke();
    }
    // The scarecrow hanging from a broken post: sagging, head dropped, coat in rags.
    function drawScarecrow(o) {
      const sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 4)) return;
      const k = Math.max(0.55, K.tall(o.x, o.y));
      const top = post(o.x, o.y, 2.1 * k, 0.35 * k, 0.11, false);
      // splintered top
      ctx.strokeStyle = C.wood.lit; ctx.lineWidth = K.lw(0.025, 1); ctx.beginPath(); ctx.moveTo(top.x - 4, top.y + 3); ctx.lineTo(top.x - 1, top.y - 5); ctx.lineTo(top.x + 2, top.y + 1); ctx.lineTo(top.x + 4, top.y - 3); ctx.stroke();
      // the crossbar, snapped, one arm drooping
      const cb = P(o.x + 0.3 * k, o.y, 1.7 * k), l = P(o.x - 0.5, o.y + 0.05, 1.75 * k), rr = P(o.x + 0.75, o.y - 0.05, 1.15 * k);
      T.inked(() => { ctx.moveTo(l.x, l.y); ctx.lineTo(cb.x, cb.y); ctx.lineTo(rr.x, rr.y); }, 0.07, C.wood.lit, 0.12);
      // the body: hung by the collar, sagging to one side
      const neck = P(o.x + 0.22 * k, o.y + 0.05, 1.6 * k), hip = P(o.x + 0.35 * k, o.y + 0.08, 0.95 * k);
      const coat = [P(o.x + 0.05, o.y, 1.6 * k), P(o.x + 0.45 * k, o.y, 1.62 * k), P(o.x + 0.62 * k, o.y, 0.85 * k), P(o.x + 0.48 * k, o.y, 0.7 * k), P(o.x + 0.38 * k, o.y, 0.82 * k), P(o.x + 0.25 * k, o.y, 0.62 * k), P(o.x + 0.12 * k, o.y, 0.8 * k), P(o.x + 0.02 * k, o.y, 0.68 * k)];
      K.path(coat); ctx.fillStyle = C.cloth; ctx.fill();
      ctx.save(); K.path(coat); ctx.clip(); ctx.fillStyle = C.clothLit; ctx.fillRect(coat[0].x - sc, coat[0].y - sc, (neck.x - coat[0].x) + sc * 0.95, sc * 3); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); K.path(coat); ctx.stroke();
      // arms: one tied to the bar, one hanging loose
      T.inked(() => { ctx.moveTo(neck.x - sc * 0.1, neck.y + sc * 0.05); ctx.lineTo(l.x + sc * 0.15, l.y + sc * 0.08); }, 0.08, C.cloth, 0.13);
      const hand = P(o.x + 0.55 * k, o.y, 0.95 * k);
      T.inked(() => { ctx.moveTo(neck.x + sc * 0.12, neck.y + sc * 0.08); ctx.lineTo(hand.x, hand.y); }, 0.08, C.cloth, 0.13);
      ctx.strokeStyle = C.straw; ctx.lineWidth = K.lw(0.012, 0.8); ctx.beginPath();
      for (let i = 0; i < 5; i++) { ctx.moveTo(hand.x, hand.y); ctx.lineTo(hand.x + (i - 2) * 2, hand.y + sc * 0.15); }
      // straw out of the hem
      for (let i = 0; i < 7; i++) { const q = coat[2 + (i % 5)]; ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + (i - 3) * 1.5, q.y + sc * 0.12); }
      ctx.stroke();
      // the sack head, dropped forward on its chest
      const hd = P(o.x + 0.3 * k, o.y + 0.08, 1.58 * k), hr = sc * 0.17;
      ctx.fillStyle = C.sack; ctx.beginPath(); ctx.ellipse(hd.x + hr * 0.3, hd.y + hr * 0.3, hr, hr * 1.05, 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = C.sackShade; ctx.beginPath(); ctx.ellipse(hd.x + hr * 0.6, hd.y + hr * 0.5, hr * 0.6, hr * 0.8, 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.025, 1.2); ctx.beginPath(); ctx.ellipse(hd.x + hr * 0.3, hd.y + hr * 0.3, hr, hr * 1.05, 0.5, 0, TAU); ctx.stroke();
      ctx.fillStyle = INK; ctx.fillRect(hd.x + hr * 0.0, hd.y + hr * 0.5, hr * 0.25, hr * 0.12); ctx.fillRect(hd.x + hr * 0.5, hd.y + hr * 0.7, hr * 0.25, hr * 0.12);
      // the rope it hangs by
      ctx.strokeStyle = '#7a6a50'; ctx.lineWidth = K.lw(0.018, 1); ctx.beginPath(); ctx.moveTo(cb.x, cb.y); ctx.lineTo(neck.x, neck.y - sc * 0.05); ctx.stroke();
      void hip;
    }
    // A dead beast on its side: hide, ribs showing, stiff legs, head down.
    function drawBeast(b) {
      const sc = V.cam.sc, c = Math.cos(b.rot), s2 = Math.sin(b.rot), r = b.r;
      const at = (u, v, z) => P(b.x + (u * c - v * s2) * r, b.y + (u * s2 + v * c) * r, z * r);
      if (K.off(at(0, 0, 0), sc * 4)) return;
      // body: a long lump
      const body = [];
      for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI; body.push(at(Math.cos(a) * 1.1, 0, -Math.sin(a) * 0.75 + 0.05)); }
      for (let i = 14; i >= 0; i--) { const a = (i / 14) * Math.PI; body.push(at(Math.cos(a) * 1.1, Math.sin(a) * 0.55, 0)); }
      // legs, stiff, out toward the near side
      for (const [u, z] of [[-0.6, 0.35], [-0.3, 0.2], [0.55, 0.35], [0.8, 0.2]]) {
        const h0 = at(u, 0.3, z), h1 = at(u + 0.2, 1.0, z + 0.25), h2 = at(u + 0.15, 1.45, z + 0.1);
        T.inked(() => { ctx.moveTo(h0.x, h0.y); ctx.lineTo(h1.x, h1.y); ctx.lineTo(h2.x, h2.y); }, 0.1 * r, C.hide, 0.16 * r);
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(h2.x, h2.y, K.lw(0.05 * r, 1.5), 0, TAU); ctx.fill();
      }
      K.path(body); ctx.fillStyle = C.hide; ctx.fill();
      ctx.save(); K.path(body); ctx.clip();
      const sh = at(-0.3, -0.1, 0.65); ctx.fillStyle = C.hideLit; ctx.beginPath(); ctx.ellipse(sh.x - sc * r * 0.2, sh.y - sc * r * 0.1, sc * r * 0.8, sc * r * 0.25, 0, 0, TAU); ctx.fill();
      // torn open: dark flesh and pale ribs
      const w0 = at(0.15, 0.25, 0.35); ctx.fillStyle = C.flesh; ctx.beginPath(); ctx.ellipse(w0.x, w0.y, sc * r * 0.45, sc * r * 0.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.bone; ctx.lineWidth = K.lw(0.04 * r, 1); ctx.beginPath();
      for (let i = 0; i < 5; i++) { const p = at(-0.15 + i * 0.12, 0.15, 0.55), q = at(-0.1 + i * 0.12, 0.35, 0.15); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + sc * 0.08, (p.y + q.y) / 2, q.x, q.y); }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.4); K.path(body); ctx.stroke();
      // head on the ground, jaw slack, a horn
      const n0 = at(-1.0, 0.1, 0.35), hd = at(-1.55, 0.45, 0.15), sn = at(-2.0, 0.6, 0.08);
      T.inked(() => { ctx.moveTo(n0.x, n0.y); ctx.lineTo(hd.x, hd.y); }, 0.22 * r, C.hide, 0.3 * r);
      ctx.beginPath(); ctx.moveTo(hd.x, hd.y - sc * r * 0.15); ctx.lineTo(sn.x, sn.y); ctx.lineTo(hd.x + sc * r * 0.05, hd.y + sc * r * 0.12); ctx.closePath(); ctx.fillStyle = C.hideLit; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); ctx.stroke();
      const hn = at(-1.35, 0.3, 0.6); T.inked(() => { ctx.moveTo(hd.x, hd.y - sc * r * 0.1); ctx.quadraticCurveTo(hd.x + sc * r * 0.1, hn.y, hn.x + sc * r * 0.2, hn.y - sc * r * 0.1); }, 0.04, C.bone, 0.08);
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'well') out.push({ d, f: () => drawWell(o) });
        else if (o.kind === 'fence') out.push({ d, f: () => drawFence(o) });
        else if (o.kind === 'scarecrow') out.push({ d, f: () => drawScarecrow(o) });
      }
      for (const b of beasts) out.push({ d: P(b.x, b.y, 0).d, f: () => drawBeast(b) });
      for (const f of fences) out.push({ d: P(f.x, f.y, 0).d, f: () => drawFencePost(f) });
      for (const st of stumps) out.push({ d: P(st.x, st.y, 0).d, f: () => { if (K.off(P(st.x, st.y, 0), 60)) return; const k = Math.max(0.4, K.tall(st.x, st.y)); post(st.x, st.y, st.h * k, (st.sh - 0.5) * 0.4, st.r * 1.4, true); } });
      for (const w of wellStones) out.push({ d: P(w.x, w.y, 0).d, f: () => K.drawRock(w.x, w.y, w.r, w.sh, C.rock, 0.4, 0.75) });
      void s; void fenceO; void crow;
      return out;
    }
    const overlay = K.overlay({
      vig: [0.3, 0.72], vigCol: '10,7,5', tone: 1.3, toneCol: 'rgba(10,7,5,0.4)',
      paint(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(60,40,30,0.25)'); g.addColorStop(0.5, 'rgba(180,130,90,0.05)'); g.addColorStop(1, 'rgba(10,7,5,0.3)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
    });
    const motes = K.motes(30, 193, (r) => (r() < 0.75 ? 0 : 1));
    function drawAtmosphere() {
      overlay.draw();
      // ash drifting down
      K.drawMotes(motes, ['rgba(150,140,128,0.4)', 'rgba(60,54,48,0.6)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset, free: floor.free };
  }

  // ================================================================ nightcamp
  // A camp at night in the trees, under a stone overhang by a shallow
  // ravine. The fire has burned down to embers; a torn canvas shelter hangs
  // off the overhang. Moonlight through the branches.
  function nightcamp(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A), T = road2(V, K);
    const R = Sim.makeRng(201);
    const C = {
      bg: '#06080b', floor: '#12171a', floorLit: '#182024', moon: '#243039', moonLit: '#2d3b45', litter: 'rgba(3,5,7,0.6)', root: '#0b0e10',
      ash: '#33302c', char: '#0a0908', ravine: '#030405', ravineLip: '#222b30', water: 'rgba(160,190,220,0.4)',
      tree: { shade: '#0a0f12', lit: '#1a252a', rim: '#6a8299' }, bark: '#0e0d0e', barkLit: '#252629',
      rock: { base: '#1c2125', mid: '#2a3136', lit: '#44505a', rim: '#b8cde0' },
      slab: { lit: '#2c353c', shade: '#11151a', top: '#36424a', rim: '#9fb8d0' },
      canvas: '#5a5446', canvasShade: '#2e2a22', pole: '#2a2118', poleLit: '#4a3a2a',
      log: '#1a1210', logLit: '#3a2a20', ember: '#ff6a20', emberHot: '#ffcf70', stone: { base: '#262a2d', mid: '#363b3f', lit: '#555b60', rim: '#ffb070' },
      shadowA: 'rgba(2,3,5,0.55)',
    };
    const fire = A.obstacles.find((o) => o.kind === 'fire') || { x: 0, y: 0.4, r: 0.35 };
    const over = A.obstacles.find((o) => o.kind === 'overhang');
    const ravY = (x) => -A.ry * 1.22 + Math.sin(x * 0.35) * 0.4;
    const treeSp = [0, 1, 2].map((i) => leafySprite(K, Sim, 1201 + i * 13, C.tree));
    const trees = [];
    for (const o of A.obstacles) if (o.kind === 'tree') trees.push({ x: o.x, y: o.y, R: o.r * 3.6, h: 5.2, tr: o.r * 0.55, v: trees.length % 3, obstacle: true });
    for (let i = 0; i < 60 && trees.length < 34; i++) {
      const a = R() * TAU, k = 1.12 + R() * 0.55, x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k;
      if (Math.abs(y - ravY(x)) < 1.2 || Math.hypot(x - A.exit.x, y - A.exit.y) < 2.2) continue;
      if (y > 0.5 && Math.abs(x) < A.rx * 1.15) continue; // keep the near side open
      if (over && Math.hypot(x - over.x, y - over.y) < 2.6) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.y - y) < 1.6)) continue;
      trees.push({ x, y, R: 1.6 + R() * 0.6, h: 4.6 + R() * 1.4, tr: 0.25 + R() * 0.1, v: trees.length % 3 });
    }
    const ringStones = Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * TAU + R() * 0.2; return { x: fire.x + Math.cos(a) * (fire.r + 0.12), y: fire.y + Math.sin(a) * (fire.r + 0.08), r: 0.09 + R() * 0.05, sh: K.rockShape(R, 6) }; });
    const overSh = K.rockShape(Sim.makeRng(207), 11);
    const sparks = Array.from({ length: 7 }, () => ({ ph: R(), dx: (R() - 0.5) * 0.6, sp: 0.3 + R() * 0.3 }));
    const floor = T.bake(-16, -11, 16, 10, 40, (c) => {
      const r = Sim.makeRng(203);
      c.fillStyle = C.floor; c.fillRect(-16, -11, 32, 21);
      c.fillStyle = C.floorLit; T.fillPoly(c, T.blob(r, 0, 0.2, A.rx * 0.95, A.ry * 0.9, 20, 0.15)); c.fill();
      // moonlight falling through gaps in the branches: hard-edged pale shapes
      for (let i = 0; i < 18; i++) {
        const x = (r() - 0.5) * 22, y = (r() - 0.5) * 13, rx = 0.6 + r() * 1.4;
        c.fillStyle = C.moon; T.fillPoly(c, T.blob(r, x, y, rx, rx * 0.6, 8, 0.6)); c.fill();
        c.fillStyle = C.moonLit; T.fillPoly(c, T.blob(r, x - rx * 0.15, y - rx * 0.1, rx * 0.45, rx * 0.3, 7, 0.5)); c.fill();
      }
      // needles, twigs and roots
      c.strokeStyle = C.litter; c.lineWidth = 0.02; c.beginPath();
      for (let i = 0; i < 1400; i++) { const x = (r() - 0.5) * 32, y = (r() - 0.5) * 21, a = r() * 3, l = 0.06 + r() * 0.1; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); }
      c.stroke();
      c.strokeStyle = C.root; c.lineWidth = 0.06;
      for (let i = 0; i < 22; i++) { const a = r() * TAU, k = 1.0 + r() * 0.3; c.beginPath(); let x = Math.cos(a) * A.rx * k, y = Math.sin(a) * A.ry * k; c.moveTo(x, y); for (let j = 0; j < 4; j++) { x -= Math.cos(a) * 0.5 + (r() - 0.5) * 0.4; y -= Math.sin(a) * 0.4 + (r() - 0.5) * 0.3; c.lineTo(x, y); } c.stroke(); }
      // the shallow ravine to the north: a cut in the ground, stones, a thread of water
      const top = [], bot = [];
      for (let x = -16; x <= 16; x += 0.5) { top.push([x, ravY(x) - 0.75 - r() * 0.15]); bot.push([x, ravY(x) + 0.75 + r() * 0.15]); }
      c.fillStyle = C.ravineLip; T.fillPoly(c, top.map(([x, y]) => [x, y - 0.25]).concat(bot.slice().reverse().map(([x, y]) => [x, y + 0.3]))); c.fill();
      c.fillStyle = C.ravine; T.fillPoly(c, top.concat(bot.slice().reverse())); c.fill();
      c.strokeStyle = INK; c.lineWidth = 0.05; c.beginPath(); bot.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
      c.fillStyle = '#2a3236';
      for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 32, y = ravY(x) + (r() - 0.5) * 1.3; c.beginPath(); c.ellipse(x, y, 0.06 + r() * 0.12, 0.04 + r() * 0.07, 0, 0, TAU); c.fill(); }
      c.strokeStyle = C.water; c.lineWidth = 0.035; c.beginPath();
      for (let x = -16; x <= 16; x += 0.4) { const y = ravY(x) + 0.1 + Math.sin(x * 1.3) * 0.08; x > -16 ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
      // the fire's scorch and trodden earth round the camp
      c.fillStyle = 'rgba(40,36,32,0.55)'; T.fillPoly(c, T.blob(r, fire.x, fire.y, 1.6, 1.2, 14, 0.3)); c.fill();
      c.fillStyle = C.ash; c.beginPath(); c.ellipse(fire.x, fire.y, fire.r * 1.6, fire.r * 1.3, 0, 0, TAU); c.fill();
      c.fillStyle = C.char; c.beginPath(); c.ellipse(fire.x, fire.y, fire.r * 1.05, fire.r * 0.85, 0, 0, TAU); c.fill();
      if (over) { c.fillStyle = 'rgba(2,3,4,0.7)'; T.fillPoly(c, T.blob(r, over.x + 0.4, over.y - 0.2, 2.0, 1.4, 12, 0.3)); c.fill(); }
    });
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const t of trees) { const b = P(t.x, t.y, 0), off = K.shadowOff(t.h * 0.7), r = t.R * sc * 0.6; if (K.off(b, r * 3)) continue; ctx.moveTo(b.x + off.x + r, b.y + off.y); ctx.ellipse(b.x + off.x, b.y + off.y, r, r * V.cam.pitch * 0.8, 0, 0, TAU); }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      floor.draw();
      shadows();
    }
    const fl = (k) => 0.82 + 0.18 * Math.sin(V.time * 7.3 + k) * Math.sin(V.time * 2.9 + k * 1.7);
    // Embers: stones round the pit, charred logs, a bed of glowing coals.
    function drawFire() {
      const sc = V.cam.sc, c = P(fire.x, fire.y, 0);
      if (K.off(c, sc * 3)) return;
      for (const st of ringStones) if (P(st.x, st.y, 0).d < c.d) K.drawRock(st.x, st.y, st.r, st.sh, C.stone, 0.5, 0.8);
      // coals
      const bed = (k, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(c.x, c.y, fire.r * sc * k, fire.r * sc * k * V.cam.pitch * 0.9, 0, 0, TAU); ctx.fill(); };
      bed(0.9, '#2a0c06');
      bed(0.62, rgbaHex('#c03a12', 0.75 + 0.25 * fl(1)));
      ctx.fillStyle = C.emberHot;
      for (let i = 0; i < 9; i++) { const a = i * 2.4, d = (0.15 + (i % 3) * 0.15) * fire.r * sc, a2 = fl(i * 1.3); if (a2 < 0.8) continue; ctx.fillRect(c.x + Math.cos(a) * d * 1.3, c.y + Math.sin(a) * d * V.cam.pitch, K.lw(0.04, 1.5), K.lw(0.03, 1)); }
      // logs burned through, crossed over the pit
      for (const [a, z] of [[0.4, 0.08], [2.3, 0.12], [-1.1, 0.1]]) {
        const ex = Math.cos(a) * fire.r * 1.5, ey = Math.sin(a) * fire.r * 1.1;
        const p0 = P(fire.x - ex * 0.2, fire.y - ey * 0.2, z + 0.05), p1 = P(fire.x + ex, fire.y + ey, z * 0.4);
        T.inked(() => { ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); }, 0.09, C.log, 0.14);
        ctx.strokeStyle = C.logLit; ctx.lineWidth = K.lw(0.02, 0.8); ctx.beginPath(); ctx.moveTo(p0.x - 1, p0.y - 1.5); ctx.lineTo(p1.x - 1, p1.y - 1.5); ctx.stroke();
        ctx.fillStyle = rgbaHex('#ff8a30', 0.6 + 0.4 * fl(a)); ctx.beginPath(); ctx.arc(p0.x, p0.y, K.lw(0.04, 1.5), 0, TAU); ctx.fill();
      }
      for (const st of ringStones) if (P(st.x, st.y, 0).d >= c.d) K.drawRock(st.x, st.y, st.r, st.sh, C.stone, 0.5, 0.8);
    }
    // The overhang: a shoulder of rock with a slab jutting out over the camp,
    // roots hanging off its lip; the torn shelter tied from it to a pole.
    function drawOverhang(o) {
      const sc = V.cam.sc;
      if (K.off(P(o.x, o.y, 0), sc * 6)) return;
      const k = Math.max(0.55, K.tall(o.x, o.y));
      K.drawRock(o.x - 0.2, o.y + 0.25, o.r * 1.35, overSh, C.rock, 0.75 * k, 1.25 * k);
      const dx = 0.55, dy = -0.45; // out toward the fire
      const sl = K.box(o.x + dx * 0.6, o.y + dy * 0.6, 1.05, 0.7, 0.55, 1.5 * k, 1.95 * k, C.slab, (face, pts) => {
        const [a, b, c2, d] = pts;
        ctx.strokeStyle = 'rgba(2,3,5,0.6)'; ctx.lineWidth = K.lw(0.015, 0.8); ctx.beginPath();
        for (const f of [0.35, 0.7]) { ctx.moveTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f); ctx.lineTo(d.x + (c2.x - d.x) * (f + 0.1), d.y + (c2.y - d.y) * (f + 0.1)); }
        ctx.stroke();
      });
      // hanging roots
      ctx.strokeStyle = C.root; ctx.lineWidth = K.lw(0.02, 1); ctx.beginPath();
      for (let i = 0; i < 4; i++) { const a = sl.lo[i], b = sl.lo[(i + 1) % 4]; for (const f of [0.3, 0.7]) { const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 3, y + sc * 0.25, x - 1, y + sc * (0.35 + f * 0.3)); } }
      ctx.stroke();
      // the shelter: a canvas lean-to from the slab's lip down to the ground
      // outside, one corner up on a pole, torn through and sagging
      const ol = Math.hypot(o.x, o.y) || 1, ox = o.x / ol, oy = o.y / ol, tx = -oy, ty = ox;
      const W3 = (d, s, z) => P(o.x + ox * d + tx * s, o.y + oy * d + ty * s, z);
      const l0 = W3(0.15, -0.85, 1.45 * k), l1 = W3(0.15, 0.85, 1.45 * k);
      const cA = W3(1.9, -0.9, 0), cB = W3(1.7, 0.85, 0.9 * k), pb = W3(1.7, 0.85, 0);
      T.inked(() => { ctx.moveTo(pb.x, pb.y); ctx.lineTo(cB.x, cB.y - sc * 0.15); }, 0.06, C.poleLit, 0.1);
      const sheet = [l0, l1, cB];
      for (let i = 1; i < 6; i++) { const s = 0.85 - (i / 6) * 1.75, d = 1.7 + (i / 6) * 0.2; sheet.push(W3(d - (i % 2) * 0.25, s, (0.9 * k) * (1 - i / 6) + (i % 2 ? 0.12 : 0) * k)); }
      sheet.push(cA);
      K.path(sheet); ctx.fillStyle = C.canvas; ctx.fill();
      ctx.save(); K.path(sheet); ctx.clip();
      const m0 = W3(1.0, -0.9, 0.7 * k), m1 = W3(1.0, 0.9, 0.85 * k);
      ctx.fillStyle = C.canvasShade; ctx.beginPath(); ctx.moveTo(m0.x, m0.y); ctx.lineTo(m1.x, m1.y); ctx.lineTo(cB.x, cB.y); ctx.lineTo(cA.x, cA.y + sc); ctx.lineTo(cA.x - sc, cA.y + sc); ctx.closePath(); ctx.fill();
      // seams, and a rip through the middle
      ctx.strokeStyle = 'rgba(10,8,6,0.5)'; ctx.lineWidth = K.lw(0.015, 0.8); ctx.beginPath();
      for (const s of [-0.3, 0.3]) { const a = W3(0.15, s, 1.45 * k), b = W3(1.8, s, 0.4 * k); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
      const mid = W3(1.0, 0.1, 0.8 * k);
      ctx.fillStyle = C.bg; ctx.beginPath(); ctx.moveTo(mid.x - sc * 0.22, mid.y - sc * 0.1); ctx.lineTo(mid.x - sc * 0.02, mid.y - sc * 0.02); ctx.lineTo(mid.x + sc * 0.06, mid.y - sc * 0.16); ctx.lineTo(mid.x + sc * 0.2, mid.y + sc * 0.06); ctx.lineTo(mid.x, mid.y + sc * 0.08); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); ctx.lineJoin = 'round'; K.path(sheet); ctx.stroke();
      // the torn flap hanging off the pole
      ctx.beginPath(); ctx.moveTo(cB.x, cB.y); ctx.lineTo(cB.x + sc * 0.12, cB.y + sc * 0.55); ctx.lineTo(cB.x - sc * 0.05, cB.y + sc * 0.4); ctx.lineTo(cB.x - sc * 0.16, cB.y + sc * 0.62); ctx.lineTo(cB.x - sc * 0.25, cB.y + sc * 0.1); ctx.closePath();
      ctx.fillStyle = C.canvasShade; ctx.fill(); ctx.stroke();
      // moonlight along the top edge
      ctx.strokeStyle = 'rgba(200,220,240,0.4)'; ctx.lineWidth = K.lw(0.015); ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.stroke();
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'fire') out.push({ d, f: drawFire });
        else if (o.kind === 'overhang') out.push({ d, f: () => drawOverhang(o) });
      }
      for (const t of trees) out.push({ d: P(t.x, t.y, 0).d, f: () => drawLeafyTree(V, K, s, t, treeSp, C) });
      return out;
    }
    const overlay = K.overlay({
      vig: [0.5, 0.92], vigCol: '2,3,8', tone: 1.1, toneCol: 'rgba(2,4,10,0.5)',
      paint(c, W, H) {
        // cold moonlight from the upper left
        const g = c.createLinearGradient(0, 0, W * 0.7, H);
        g.addColorStop(0, 'rgba(150,180,230,0.14)'); g.addColorStop(0.5, 'rgba(40,60,110,0.08)'); g.addColorStop(1, 'rgba(2,4,10,0.35)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
    });
    const motes = K.motes(12, 209, () => 0);
    function drawAtmosphere() {
      const sc = V.cam.sc, t = V.time, p = P(fire.x, fire.y, 0.1), f = fl(0.3);
      // smoke, thin, going straight up in the still air
      ctx.fillStyle = 'rgba(120,130,140,0.07)'; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const u = (t * 0.15 + i / 6) % 1, q = P(fire.x + Math.sin(u * 5 + t) * 0.2 * u, fire.y, 0.3 + u * 3.5), r = sc * (0.15 + u * 0.6); ctx.moveTo(q.x + r, q.y); ctx.ellipse(q.x, q.y, r, r * 0.7, 0, 0, TAU); }
      ctx.fill();
      overlay.draw();
      // the embers' light: warm on the ground round the pit, flickering
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      T.glow('255,110,40', p.x, p.y, sc * 4.2 * f, sc * 4.2 * V.cam.pitch * f, 0.42);
      T.glow('255,150,70', p.x, p.y - sc * 0.2, sc * 1.4, sc * 1.1, 0.4 * f);
      ctx.fillStyle = '#ffb060';
      for (const s of sparks) { const u = (t * s.sp + s.ph) % 1, q = P(fire.x + s.dx * u + Math.sin(t * 3 + s.ph * 9) * 0.1, fire.y, 0.2 + u * 2.6); ctx.globalAlpha = 1 - u; ctx.fillRect(q.x, q.y, 2, 2); }
      ctx.globalAlpha = 1;
      ctx.restore();
      K.drawMotes(motes, ['rgba(200,220,255,0.3)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset, free: floor.free };
  }

  // ================================================================ frosthall
  // Floor One, the Hall of Frost and Mist: carved stone under a skin of
  // frost, an ice-glazed floor with frost crawling over it in branching
  // patterns, pillars, climbers frozen into the walls (one reaching), and a
  // pale mist drifting low.
  function frosthall(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A), T = road2(V, K);
    const R = Sim.makeRng(221);
    const C = {
      bg: '#080b10', tile: '#435264', tileLit: '#506276', tileDark: '#384656', joint: '#1a2330', frost: '#dcebf8', glaze: 'rgba(230,244,255,0.16)',
      wall: '#2f3b49', wallLit: '#455568', wallShade: '#1d2530', wallTop: '#0d1117', frostRim: '#e8f2ff',
      pillar: { base: '#3a4757', shade: '#253040', lit: '#5a6c82', rim: '#e8f2ff', top: '#7a8da4' },
      plinth: { lit: '#4c5c70', shade: '#253040', top: '#5f718a', rim: '#e8f2ff' },
      ice: 'rgba(160,210,238,0.24)', iceLit: 'rgba(220,244,255,0.3)', iceEdge: '#c8ecfa', body: '#0e141c', bodyLit: '#3a4a5c',
      mist: '220,235,250', shadowA: 'rgba(6,10,18,0.45)',
    };
    const WALL_K = 1.12, N = 56, WH = 7;
    const exitA = Math.atan2(A.exit.y / A.ry, A.exit.x / A.rx);
    const angDist = (a, b) => { const d = Math.abs(((a - b) % TAU + TAU) % TAU); return Math.min(d, TAU - d); };
    const segs = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, am = (a0 + a1) / 2;
      segs.push({ x0: Math.cos(a0) * A.rx * WALL_K, y0: Math.sin(a0) * A.ry * WALL_K, x1: Math.cos(a1) * A.rx * WALL_K, y1: Math.sin(a1) * A.ry * WALL_K, h: WH, i, door: angDist(am, exitA) < 0.16, col: i % 4 === 0, climber: [5, 11, 17, 22, 31, 47, 52].includes(i) ? R() : -1 });
    }
    const floor = T.bake(-13, -9, 13, 8, 44, (c) => {
      const r = Sim.makeRng(223);
      c.fillStyle = C.joint; c.fillRect(-13, -9, 26, 17);
      // carved slabs, big, in courses
      const tw = 1.5, td = 1.1;
      for (let y = -9; y < 8; y += td) {
        const off = (Math.round((y + 9) / td) % 2) * tw * 0.5;
        for (let x = -13 - off; x < 13; x += tw) {
          const t = r();
          c.fillStyle = t < 0.25 ? C.tileLit : t < 0.45 ? C.tileDark : C.tile;
          c.fillRect(x + 0.03, y + 0.03, tw - 0.06, td - 0.06);
          // a carved border on some slabs
          if (r() < 0.25) { c.strokeStyle = 'rgba(16,24,34,0.6)'; c.lineWidth = 0.025; c.strokeRect(x + 0.15, y + 0.13, tw - 0.3, td - 0.26); }
        }
      }
      // ice glaze: long pale streaks catching the light
      c.strokeStyle = C.glaze; c.lineWidth = 0.3;
      for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 24, y = (r() - 0.5) * 15, l = 1 + r() * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - l * 0.5); c.stroke(); }
      c.strokeStyle = 'rgba(240,250,255,0.3)'; c.lineWidth = 0.05;
      for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 24, y = (r() - 0.5) * 15, l = 0.4 + r() * 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + l, y - l * 0.5); c.stroke(); }
      // frost crawling in from the walls and up from the pillars' feet
      c.strokeStyle = 'rgba(220,235,250,0.4)';
      for (let i = 0; i < 46; i++) { const a = r() * TAU, k = 1.08; T.branch(c, r, Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, a + Math.PI + (r() - 0.5) * 0.8, 1.6 + r() * 2.4, 3, 0.05); }
      for (const o of A.obstacles) for (let i = 0; i < 7; i++) { const a = r() * TAU; T.branch(c, r, o.x + Math.cos(a) * o.r, o.y + Math.sin(a) * o.r * 0.8, a, 0.9 + r() * 1.3, 2, 0.04); }
      // rime along the wall foot
      c.fillStyle = 'rgba(220,235,250,0.4)';
      for (let i = 0; i < 90; i++) { const a = r() * TAU, k = 1.0 + r() * 0.1; c.beginPath(); c.ellipse(Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, 0.25 + r() * 0.5, 0.12 + r() * 0.2, a, 0, TAU); c.fill(); }
    });
    // A figure in the ice: head, shoulders, arms (one raised and reaching).
    function figure(at, reach, scale, col, lit) {
      const sc = V.cam.sc * scale;
      const hd = at(0, 1.62), nk = at(0, 1.45), hp = at(0, 0.9);
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.ellipse(hd.x, hd.y, sc * 0.11, sc * 0.13, 0, 0, TAU); ctx.fill();
      const sl = at(-0.2, 1.4), sr = at(0.2, 1.4), hl = at(-0.13, 0.9), hr = at(0.13, 0.9);
      ctx.beginPath(); ctx.moveTo(sl.x, sl.y); ctx.lineTo(sr.x, sr.y); ctx.lineTo(hr.x, hr.y); ctx.lineTo(hl.x, hl.y); ctx.closePath(); ctx.fill();
      ctx.lineWidth = sc * 0.09; ctx.beginPath();
      const la = reach ? at(-0.32, 1.9) : at(-0.3, 1.0), lh = reach ? at(-0.36, 2.15) : at(-0.25, 0.75);
      ctx.moveTo(sl.x, sl.y); ctx.lineTo(la.x, la.y); ctx.lineTo(lh.x, lh.y);
      const ra = reach ? at(0.32, 1.1) : at(0.32, 1.15), rh = reach ? at(0.24, 0.9) : at(0.38, 1.4);
      ctx.moveTo(sr.x, sr.y); ctx.lineTo(ra.x, ra.y); ctx.lineTo(rh.x, rh.y);
      ctx.moveTo(hl.x, hl.y); ctx.lineTo(at(-0.16, 0.45).x, at(-0.16, 0.45).y); ctx.lineTo(at(-0.15, 0.02).x, at(-0.15, 0.02).y);
      ctx.moveTo(hr.x, hr.y); ctx.lineTo(at(0.18, 0.45).x, at(0.18, 0.45).y); ctx.lineTo(at(0.22, 0.05).x, at(0.22, 0.05).y);
      ctx.stroke();
      if (lit) { ctx.strokeStyle = lit; ctx.lineWidth = sc * 0.025; ctx.beginPath(); ctx.moveTo(sl.x - 1, sl.y); ctx.lineTo(hl.x - 1, hl.y); ctx.moveTo(hd.x - sc * 0.08, hd.y - sc * 0.08); ctx.lineTo(hd.x - sc * 0.1, hd.y + sc * 0.04); ctx.stroke(); }
      void nk; void hp;
    }
    function walls() {
      const qs = T.quads(segs, 0.12, 0.7);
      const lines = new Path2D(), rime = new Path2D(), cols = new Path2D(), colSh = new Path2D();
      for (const q of qs) {
        const g = q.g;
        if (g.door) continue;
        ctx.fillStyle = q.facing <= 0 ? C.wallTop : q.sx > 0.3 ? C.wallLit : q.sx < -0.4 ? C.wallShade : C.wall;
        ctx.beginPath(); T.quadPath(q); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
        if (q.facing <= 0) continue;
        const fk = Math.min(q.f0, q.f1);
        // carved courses and engaged columns
        for (const v of [0.18, 0.62, 0.66]) { const a = T.on(q, 0, v), b = T.on(q, 1, v); lines.moveTo(a.x, a.y); lines.lineTo(b.x, b.y); }
        if (g.col) { T.sub(cols, q, 0.25, 0.55, 0, 0.62); T.sub(colSh, q, 0.55, 0.75, 0, 0.62); }
        // frost skin: a ragged rime along the foot and the courses
        for (const v0 of [0, 0.62]) {
          const a = T.on(q, 0, v0), b = T.on(q, 1, v0);
          rime.moveTo(a.x, a.y);
          for (let k = 1; k <= 4; k++) { const p = T.on(q, k / 4, v0 + (((g.i * 7 + k * 3) % 5) * 0.009 + 0.006) * (v0 ? 0.6 : 1)); rime.lineTo(p.x, p.y); }
          rime.lineTo(b.x, b.y); rime.closePath();
        }
        // a climber frozen into the wall
        if (g.climber >= 0 && fk > 0.4) {
          const u0 = 0.5 + (g.climber - 0.5) * 0.3, sk = (WH * fk) / 4.2;
          const at = (dx, z) => T.on(q, u0 + dx / (Math.hypot(q.b1.x - q.b0.x, q.b1.y - q.b0.y) / V.cam.sc), (0.2 + z * 0.22) * Math.min(1, 1 / sk) * sk / sk);
          ctx.fillStyle = 'rgba(200,236,252,0.22)'; ctx.beginPath(); T.sub(ctx, q, u0 - 0.28, u0 + 0.28, 0.12, 0.72); ctx.fill();
          figure(at, g.climber > 0.5, 1, C.body, null);
          ctx.strokeStyle = 'rgba(232,248,255,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); T.sub(ctx, q, u0 - 0.28, u0 + 0.28, 0.12, 0.72); ctx.stroke();
        }
      }
      ctx.fillStyle = C.wallLit; ctx.fill(cols); ctx.fillStyle = 'rgba(8,12,18,0.45)'; ctx.fill(colSh);
      ctx.strokeStyle = 'rgba(8,12,18,0.6)'; ctx.lineWidth = K.lw(0.02, 0.8); ctx.stroke(lines);
      ctx.fillStyle = 'rgba(225,240,252,0.5)'; ctx.fill(rime);
      door();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.045, 1.5); ctx.beginPath();
      for (const q of qs) if (!q.g.door) { ctx.moveTo(q.t0.x, q.t0.y); ctx.lineTo(q.t1.x, q.t1.y); if (q.facing > 0) { ctx.moveTo(q.b0.x, q.b0.y); ctx.lineTo(q.b1.x, q.b1.y); } }
      ctx.stroke();
      ctx.strokeStyle = C.frostRim; ctx.globalAlpha = 0.5; ctx.lineWidth = K.lw(0.03); ctx.beginPath();
      for (const q of qs) if (!q.g.door && q.facing > 0) { ctx.moveTo(q.t0.x, q.t0.y + 1.5); ctx.lineTo(q.t1.x, q.t1.y + 1.5); }
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // The way on: a tall doorway in the north wall, cold light beyond.
    function door() {
      if (K.depth(A.exit.x, A.exit.y) > 0) return;
      const at = (a, z) => P(Math.cos(a) * A.rx * WALL_K, Math.sin(a) * A.ry * WALL_K, z);
      const f = K.tall(A.exit.x, A.exit.y), hh = 4.2 * Math.max(0.3, f), a0 = exitA - 0.14, a1 = exitA + 0.14;
      const pts = [at(a0, 0)];
      for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * (i / 10); pts.push(at(a, hh * (0.75 + 0.25 * Math.sin((i / 10) * Math.PI)))); }
      pts.push(at(a1, 0));
      ctx.beginPath(); K.poly(pts); ctx.fillStyle = '#04060a'; ctx.fill();
      const c0 = at(exitA, 0), c1 = at(exitA, hh * 0.85);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; T.glow('150,190,230', (c0.x + c1.x) / 2, (c0.y + c1.y) / 2, Math.abs(pts[0].x - pts[pts.length - 1].x) * 0.6, Math.abs(c0.y - c1.y) * 0.6, 0.35); ctx.restore();
      // the frame: two jambs and a lintel, frosted
      ctx.strokeStyle = C.wallLit; ctx.lineWidth = K.lw(0.18, 3); ctx.beginPath(); K.poly(pts); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.5); ctx.stroke();
      // steps going up into it
      ctx.strokeStyle = 'rgba(200,225,245,0.35)'; ctx.lineWidth = K.lw(0.03, 1); ctx.beginPath();
      for (let i = 1; i < 5; i++) { const p0 = at(a0 + 0.02, hh * 0.05 * i), p1 = at(a1 - 0.02, hh * 0.05 * i); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); }
      ctx.stroke();
    }
    function shadows() {
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const o of A.obstacles) { const b = P(o.x, o.y, 0), off = K.shadowOff(o.kind === 'pillar' ? 3 : 1.6); K.sweep(b, o.r * sc * 1.05, o.r * sc * V.cam.pitch, { x: off.x * 0.6, y: off.y * 0.6 }); }
      ctx.fillStyle = C.shadowA; ctx.fill();
    }
    function drawBackdrop() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      ctx.save(); T.clipRing(WALL_K + 0.01); floor.draw(); ctx.restore();
      walls();
      shadows();
    }
    function drawPillar(o, s) {
      const sc = V.cam.sc, b = P(o.x, o.y, 0);
      if (K.off(b, sc * 5)) return;
      const k = Math.max(0.3, K.tall(o.x, o.y)), h = WH * k;
      const fade = K.behind(s, b, sc * o.r * 1.6, sc * h * 0.9) ? 0.45 : 1;
      ctx.globalAlpha = fade;
      K.box(o.x, o.y, o.r * 0.95, o.r * 0.95, 0.785, 0, 0.35, C.plinth, null);
      K.cyl(o.x, o.y, o.r * 0.72, 0.35, h, C.pillar, null, {
        flutes: true,
        inside(bb, t, rx, ry) {
          // frost climbing the shaft: ragged white from the foot, patches higher up
          ctx.fillStyle = 'rgba(225,240,252,0.6)'; ctx.beginPath(); ctx.moveTo(bb.x - rx, bb.y + ry);
          for (let i = 0; i <= 8; i++) ctx.lineTo(bb.x - rx + (i / 8) * rx * 2, bb.y - sc * (0.35 + (i % 3) * 0.18) * k);
          ctx.lineTo(bb.x + rx, bb.y + ry); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(225,240,252,0.5)'; ctx.lineWidth = K.lw(0.015, 0.8); ctx.beginPath();
          for (let i = 0; i < 5; i++) { const x = bb.x - rx * 0.7 + i * rx * 0.35, y0 = bb.y - sc * 0.5 * k; ctx.moveTo(x, y0); ctx.lineTo(x + (i % 2 ? 3 : -3), y0 - sc * 0.5 * k); ctx.lineTo(x + (i % 2 ? 1 : -5), y0 - sc * 0.8 * k); }
          ctx.stroke();
        },
      });
      // a carved band where the shaft meets the dark
      if (k > 0.6) { const q = P(o.x, o.y, h * 0.8); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1); ctx.beginPath(); ctx.ellipse(q.x, q.y, o.r * 0.74 * sc, o.r * 0.74 * sc * V.cam.pitch, 0, 0, Math.PI); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    // A climber frozen upright in a column of ice.
    const iceSh = new Map();
    for (const o of A.obstacles) if (o.kind === 'frozen') iceSh.set(o, { pts: Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * TAU + R() * 0.3; return [Math.cos(a) * (0.85 + R() * 0.25), Math.sin(a) * (0.85 + R() * 0.25)]; }), h: 2.15 + R() * 0.3, tilt: [(R() - 0.5) * 0.25, (R() - 0.5) * 0.2], reach: o.x > 0 });
    function drawFrozen(o, s) {
      const sc = V.cam.sc, b = P(o.x, o.y, 0);
      if (K.off(b, sc * 4)) return;
      const ic = iceSh.get(o), k = Math.max(0.5, K.tall(o.x, o.y)), h = ic.h * k;
      const fade = K.behind(s, b, sc * 1.0, sc * h * 0.9) ? 0.5 : 1;
      ctx.globalAlpha = fade;
      const lo = ic.pts.map(([u, v]) => P(o.x + u * o.r, o.y + v * o.r, 0)), hi = ic.pts.map(([u, v]) => P(o.x + u * o.r * 0.8 + ic.tilt[0], o.y + v * o.r * 0.8 + ic.tilt[1], h));
      // the figure inside
      const at = (dx, z) => P(o.x + dx * Math.cos(V.cam.ang) * 0.95, o.y - dx * Math.sin(V.cam.ang) * 0.95, z * k * 0.95);
      figure(at, ic.reach, 0.95, C.body, C.bodyLit);
      // ice: faces toward the camera, translucent, lit and shaded
      const hull = convexHull(lo.concat(hi));
      K.path(hull); ctx.fillStyle = C.ice; ctx.fill();
      for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6;
        const a = lo[i], bb = lo[j], c = hi[j], d = hi[i];
        if ((a.y + bb.y) / 2 < b.y - 1) continue; // back faces
        const lit = (bb.x - a.x) * -0.6 + (bb.y - a.y) * 0.8 < 0;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bb.x, bb.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
        ctx.fillStyle = lit ? C.iceLit : 'rgba(120,170,205,0.18)'; ctx.fill();
        ctx.strokeStyle = C.iceEdge; ctx.globalAlpha = fade * 0.6; ctx.lineWidth = K.lw(0.015, 0.8); ctx.stroke(); ctx.globalAlpha = fade;
      }
      K.path(hi); ctx.fillStyle = 'rgba(235,248,255,0.6)'; ctx.fill();
      // glints
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = K.lw(0.02, 1); ctx.beginPath(); ctx.moveTo(hi[3].x + 3, hi[3].y + sc * 0.2); ctx.lineTo(hi[3].x + 2, hi[3].y + sc * 0.8); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.5); ctx.lineJoin = 'round'; K.path(hull); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function items(s) {
      const out = [];
      for (const o of A.obstacles) {
        const d = P(o.x, o.y, 0).d;
        if (o.kind === 'pillar') out.push({ d, f: () => drawPillar(o, s) });
        else if (o.kind === 'frozen') out.push({ d, f: () => drawFrozen(o, s) });
      }
      return out;
    }
    const overlay = K.overlay({
      vig: [0.35, 0.8], vigCol: '4,8,16', tone: 1.25, toneCol: 'rgba(4,8,16,0.45)',
      paint(c, W, H) {
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(4,8,14,0.55)'); g.addColorStop(0.35, 'rgba(150,190,230,0.06)'); g.addColorStop(1, 'rgba(120,160,210,0.12)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
    });
    const mist = Array.from({ length: 14 }, () => ({ x: (R() - 0.5) * 24, y: (R() - 0.5) * 12, r: 1.8 + R() * 2.6, sp: 0.12 + R() * 0.18, ph: R() * TAU }));
    const motes = K.motes(30, 229, (r) => (r() < 0.75 ? 0 : 1));
    function drawAtmosphere() {
      const sc = V.cam.sc, t = V.time;
      // pale mist drifting low over the floor
      ctx.fillStyle = `rgba(${C.mist},0.06)`;
      ctx.beginPath();
      for (const m of mist) {
        const x = ((m.x + t * m.sp + 12) % 24 + 24) % 24 - 12, p = P(x, m.y, 0.25 + 0.1 * Math.sin(t * 0.5 + m.ph)), r = m.r * sc;
        if (K.off(p, r)) continue;
        ctx.moveTo(p.x + r, p.y); ctx.ellipse(p.x, p.y, r, r * 0.22, 0, 0, TAU);
        ctx.moveTo(p.x + r * 0.9, p.y - r * 0.05); ctx.ellipse(p.x + r * 0.3, p.y - r * 0.05, r * 0.6, r * 0.14, 0, 0, TAU);
      }
      ctx.fill();
      overlay.draw();
      K.drawMotes(motes, ['rgba(235,245,255,0.55)', 'rgba(170,210,240,0.45)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset, free: floor.free };
  }

  // ================================================================ calamity
  // Floor Two: a corridor split down the middle. Down one long side an
  // endless thundering waterfall, white water and spray; down the other,
  // slow curtains of molten lava, heat shimmering off them. Shallow
  // channels in the floor, wet on the water side, blackened glassy stone on
  // the lava side.
  function calamity(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A), T = road2(V, K);
    const R = Sim.makeRng(241);
    const C = {
      bg: '#050506', wet: '#1c2832', wetLit: '#26363f', wetDark: '#141d24', water: '#0c161e', sheen: 'rgba(190,220,240,0.22)',
      glass: '#131012', glassLit: '#2a1f1f', glassDark: '#0a0809', glint: 'rgba(255,170,120,0.18)', crack: '#5a1a0e', joint: 'rgba(4,4,5,0.75)',
      fall: '#8ea8b9', fallLit: '#c2d6e2', fallDark: '#4a6272', foam: '#eef6fa',
      lava: '#b0341a', lavaLit: '#ff8a32', lavaHot: '#ffd27a', crust: '#3a0e08',
      lip: { lit: '#3a3a40', shade: '#18181b', top: '#46464c', rim: '#d8d0d0' },
    };
    const YW = -A.ry * 1.12, YL = A.ry * 1.12, X0 = -19, X1 = 19, H = 16;
    const chans = [{ y: -2.7, wet: true }, { y: -1.3, wet: true }, { y: 1.3, wet: false }, { y: 2.7, wet: false }];
    const floor = T.bake(X0, YW - 0.6, X1, YL + 0.6, 40, (c) => {
      const r = Sim.makeRng(243);
      // two halves: wet slate north, blackened glass south
      c.fillStyle = C.wet; c.fillRect(X0, YW - 0.6, X1 - X0, -YW + 0.6);
      c.fillStyle = C.glass; c.fillRect(X0, 0, X1 - X0, YL + 0.6);
      for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 36, y = YW + r() * (-YW); c.fillStyle = r() < 0.5 ? C.wetLit : C.wetDark; T.fillPoly(c, T.blob(r, x, y, 0.8 + r() * 1.6, 0.3 + r() * 0.6, 8, 0.4)); c.fill(); }
      for (let i = 0; i < 30; i++) { const x = (r() - 0.5) * 36, y = r() * YL; c.fillStyle = r() < 0.4 ? C.glassLit : C.glassDark; T.fillPoly(c, T.blob(r, x, y, 0.8 + r() * 1.6, 0.3 + r() * 0.6, 8, 0.4)); c.fill(); }
      // slabs across the corridor
      c.strokeStyle = C.joint; c.lineWidth = 0.05; c.beginPath();
      for (let x = X0; x < X1; x += 1.6) { c.moveTo(x, YW); c.lineTo(x + 0.1, YL); }
      c.stroke();
      // wet sheen and glassy glints
      c.strokeStyle = C.sheen; c.lineWidth = 0.05; c.beginPath();
      for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 36, y = YW + 0.3 + r() * (-YW - 0.5), l = 0.3 + r() * 1; c.moveTo(x, y); c.lineTo(x + l, y); }
      c.stroke();
      c.strokeStyle = C.glint; c.beginPath();
      for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 36, y = 0.3 + r() * (YL - 0.5), l = 0.2 + r() * 0.7; c.moveTo(x, y); c.lineTo(x + l, y - l * 0.3); }
      c.stroke();
      // hairline cracks in the glass, dull red at the bottom
      c.strokeStyle = C.crack;
      for (let i = 0; i < 30; i++) T.branch(c, r, (r() - 0.5) * 36, 0.2 + r() * (YL - 0.4), r() * TAU, 0.8 + r() * 1.4, 1, 0.03);
      // the seam down the middle where the two worlds meet
      c.fillStyle = '#08080a'; c.fillRect(X0, -0.12, X1 - X0, 0.24);
      c.fillStyle = '#2a2a30'; c.fillRect(X0, -0.2, X1 - X0, 0.08);
      // channels: carved lips, water or black glass in the groove
      for (const ch of chans) {
        c.fillStyle = ch.wet ? '#33424d' : '#262022'; c.fillRect(X0, ch.y - 0.22, X1 - X0, 0.44);
        c.fillStyle = ch.wet ? C.water : '#050404'; c.fillRect(X0, ch.y - 0.14, X1 - X0, 0.28);
        c.strokeStyle = INK; c.lineWidth = 0.03; c.beginPath(); c.moveTo(X0, ch.y - 0.14); c.lineTo(X1, ch.y - 0.14); c.stroke();
      }
      // spray-soaked strip under the falls, scorched strip under the lava
      c.fillStyle = 'rgba(200,225,240,0.12)'; c.fillRect(X0, YW - 0.6, X1 - X0, 0.9);
      c.fillStyle = 'rgba(255,120,60,0.12)'; c.fillRect(X0, YL - 0.4, X1 - X0, 1.0);
      // foam scraps and splashes on the wet side
      c.fillStyle = 'rgba(230,242,248,0.45)';
      for (let i = 0; i < 50; i++) { const x = (r() - 0.5) * 36, y = YW + 0.2 + r() * 1.2; c.beginPath(); c.ellipse(x, y, 0.1 + r() * 0.25, 0.04 + r() * 0.06, 0, 0, TAU); c.fill(); }
    });
    // Falling sheets: one wall of water, one of lava. Columns of streaks
    // scroll down at their own speed; near walls are cut low as usual.
    const colsW = [], colsL = [];
    for (let x = X0; x < X1; x += 0.8) {
      colsW.push({ x, w: 0.8, s: Array.from({ length: 4 }, () => ({ ph: R() * H, len: 2.5 + R() * 5, sp: 9 + R() * 5, dark: R() < 0.3 })), tone: R() });
      colsL.push({ x, w: 0.8, s: Array.from({ length: 2 }, () => ({ ph: R() * H, len: 3 + R() * 6, sp: 0.5 + R() * 0.5, dark: R() < 0.5 })), tone: R() });
    }
    function sheet(y, cols, water, near) {
      const t = V.time, sc = V.cam.sc;
      const segs = cols.map((c) => ({ x0: c.x, y0: y, x1: c.x + c.w, y1: y, h: H, c }));
      // a straight wall: one cut for its whole length, from its middle
      const qs = T.quads(segs, 0.12, near ? 0.5 : 0, Math.max(0.12, K.tall(0, y)));
      const base = new Path2D(), lit = new Path2D(), dark = new Path2D(), bright = new Path2D();
      for (const q of qs) {
        if (K.off(q.b0, 200) && K.off(q.t0, 200)) continue;
        T.quadPath(q, q.g.c.tone < 0.4 ? lit : base);
        const hh = H * Math.min(q.f0, q.f1);
        if (near) continue;
        for (const st of q.g.c.s) {
          // streak position: wraps down the face
          const z1 = ((st.ph - t * st.sp) % H + H) % H, z0 = z1 - st.len;
          const v1 = Math.min(1, z1 / H), v0 = Math.max(0, z0 / H);
          if (v1 <= v0 || hh <= 0) continue;
          const u = 0.15 + (st.ph % 1) * 0.6, wd = water ? 0.1 : 0.22;
          T.sub(st.dark ? dark : bright, q, u - wd, u + wd * 0.7, v0, v1);
        }
      }
      ctx.fillStyle = water ? C.fall : C.lava; ctx.fill(base);
      ctx.fillStyle = water ? C.fallLit : C.lavaLit; ctx.fill(lit);
      ctx.fillStyle = water ? C.fallDark : C.crust; ctx.fill(dark);
      ctx.fillStyle = water ? C.foam : C.lavaHot; ctx.globalAlpha = water ? 0.75 : 0.85; ctx.fill(bright); ctx.globalAlpha = 1;
      // the foot: churning foam or a glowing pool
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) { const x = X0 + (i / 48) * (X1 - X0), p = P(x, y + (water ? 0.15 : -0.15), (water ? 0.35 : 0.2) + Math.sin(i * 1.7 + t * (water ? 6 : 1.2)) * (water ? 0.18 : 0.06)); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      for (let i = 48; i >= 0; i--) { const x = X0 + (i / 48) * (X1 - X0), p = P(x, y + (water ? 0.6 : -0.5), 0); ctx.lineTo(p.x, p.y); }
      ctx.closePath(); ctx.fillStyle = water ? C.foam : C.lavaLit; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.03, 1.2); ctx.stroke();
      // ink along the top edge if it is in view; a cut sheet shows its lip
      ctx.lineWidth = K.lw(0.05, 1.5); ctx.beginPath();
      qs.forEach((q, i) => { if (i === 0) ctx.moveTo(q.t0.x, q.t0.y); ctx.lineTo(q.t1.x, q.t1.y); });
      ctx.stroke();
      if (near) {
        ctx.strokeStyle = water ? C.foam : C.lavaHot; ctx.lineWidth = K.lw(0.05, 1.5); ctx.beginPath();
        qs.forEach((q, i) => { const a = T.on(q, 0, 0.82), b = T.on(q, 1, 0.82); if (i === 0) ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); });
        ctx.stroke();
        // slow lumps riding the lip
        ctx.fillStyle = water ? C.fallDark : C.crust;
        for (let i = 0; i < 24; i++) { const x = ((i * 1.73 + t * (water ? 3 : 0.3)) % 38 + 38) % 38 - 19, p = P(x, y, 0.25); if (K.off(p, 20)) continue; ctx.beginPath(); ctx.ellipse(p.x, p.y, sc * 0.3, sc * 0.06, 0, 0, TAU); ctx.fill(); }
      }
      void sc;
    }
    function channels() {
      const t = V.time;
      // water running in the wet channels, ember light pulsing in the black ones
      const glint = new Path2D(), ember = new Path2D();
      for (const ch of chans) for (let i = 0; i < 16; i++) {
        const x = ((i * 2.37 + t * (ch.wet ? 1.6 : 0.25)) % 38 + 38) % 38 - 19, l = ch.wet ? 0.5 : 0.35;
        const a = P(x, ch.y + ((i % 3) - 1) * 0.05, 0), b = P(x + l, ch.y + ((i % 3) - 1) * 0.05, 0);
        if (K.off(a, 20)) continue;
        const pth = ch.wet ? glint : ember;
        pth.moveTo(a.x, a.y); pth.lineTo(b.x, b.y);
      }
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(210,235,250,0.55)'; ctx.lineWidth = K.lw(0.03, 1); ctx.stroke(glint);
      ctx.strokeStyle = `rgba(255,110,40,${(0.35 + 0.2 * Math.sin(t * 1.3)).toFixed(3)})`; ctx.lineWidth = K.lw(0.05, 1.2); ctx.stroke(ember);
    }
    function drawBackdrop() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      // whichever wall is far is drawn first
      const wFar = K.depth(0, YW) < K.depth(0, YL);
      if (wFar) sheet(YW, colsW, true, false); else sheet(YL, colsL, false, false);
      floor.draw();
      channels();
      if (wFar) sheet(YL, colsL, false, true); else sheet(YW, colsW, true, true);
    }
    function items() { return []; }
    const overlay = K.overlay({
      vig: [0.35, 0.82], vigCol: '4,4,6', tone: 1.25, toneCol: 'rgba(6,4,4,0.42)',
      paint(c, W, H2) {
        const g = c.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(0.18, 'rgba(0,0,0,0)'); g.addColorStop(0.82, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
        c.fillStyle = g; c.fillRect(0, 0, W, H2);
      },
    });
    const spray = Array.from({ length: 18 }, () => ({ x: (R() - 0.5) * 32, ph: R(), r: 0.8 + R() * 1.4 }));
    function drawAtmosphere() {
      const sc = V.cam.sc, t = V.time;
      // spray boiling up off the falls
      ctx.fillStyle = 'rgba(225,240,250,0.08)'; ctx.beginPath();
      for (const s of spray) { const u = (t * 0.25 + s.ph) % 1, p = P(s.x + u * 0.8, YW + 0.4 + u * 0.8, 0.3 + u * 2.2), r = s.r * sc * (0.6 + u); if (K.off(p, r)) continue; ctx.moveTo(p.x + r, p.y); ctx.ellipse(p.x, p.y, r, r * 0.45, 0, 0, TAU); }
      ctx.fill();
      // light: the lava's heat along its side, the water's cold glare
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let x = -16; x <= 16; x += 4) {
        const p = P(x, YL - 0.6, 0.3), q = P(x, YW + 0.5, 0.8);
        T.glow('255,90,30', p.x, p.y, sc * 4.6, sc * 3.2 * V.cam.pitch + sc * 0.8, 0.45 + 0.07 * Math.sin(t * 1.1 + x));
        T.glow('170,210,240', q.x, q.y, sc * 3.2, sc * 1.6, 0.12);
      }
      ctx.restore();
      // heat shimmer: faint wavering lines over the lava side
      ctx.strokeStyle = 'rgba(255,190,140,0.09)'; ctx.lineWidth = K.lw(0.04, 1);
      ctx.beginPath();
      for (let row = 0; row < 5; row++) {
        const y = YL - 0.4 - row * 0.5;
        for (let i = 0; i <= 40; i++) { const x = -18 + i * 0.9, p = P(x, y, 0.4 + row * 0.35 + Math.sin(x * 2.1 + t * 4 + row) * 0.08); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      }
      ctx.stroke();
      overlay.draw();
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset, free: floor.free };
  }

  // ================================================================ offering
  // Floor Three, the Hall of Offering: a cathedral-wide ancient hall whose
  // ceiling is lost in darkness. Five enormous stone wheels stand upright in
  // the floor; four hold ancient bodies in old armour, one is empty. Dark
  // old blood lies in the channels carved in the floor. Silent, finished.
  function offering(V, A) {
    const { ctx, Sim } = V;
    const P = V.P;
    const K = kit(V, A), T = road2(V, K);
    const R = Sim.makeRng(261);
    const C = {
      bg: '#050404', flag: '#2a2425', flagLit: '#342d2e', flagDark: '#211c1d', joint: '#0f0c0c', blood: '#2e0b0e', bloodDark: '#1a0507', bloodLit: '#4a1719', groove: '#151011', grooveLip: '#3c3435',
      wall: '#221c1e', wallLit: '#312a2c', wallShade: '#161112', wallTop: '#0a0808', dark1: '#141011', dark2: '#0b0909', colLit: '#3a3234',
      stone: '#4a4244', stoneLit: '#605658', stoneShade: '#272223', stoneRim: '#e8d2c4',
      armour: '#3a3537', armourLit: '#5c5557', armourDark: '#1c191a', cloth: '#3a1c1e', chain: '#232022', chainLit: '#6a6264',
    };
    const WALL_K = 1.14, N = 60, WH = 18;
    const exitA = Math.atan2(A.exit.y / A.ry, A.exit.x / A.rx);
    const angDist = (a, b) => { const d = Math.abs(((a - b) % TAU + TAU) % TAU); return Math.min(d, TAU - d); };
    const segs = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
      segs.push({ x0: Math.cos(a0) * A.rx * WALL_K, y0: Math.sin(a0) * A.ry * WALL_K, x1: Math.cos(a1) * A.rx * WALL_K, y1: Math.sin(a1) * A.ry * WALL_K, h: WH, i, door: angDist((a0 + a1) / 2, exitA) < 0.13, col: i % 3 === 0 });
    }
    const wheels = A.obstacles.filter((o) => o.kind === 'wheel').map((o, i, all) => {
      // each wheel faces the middle of the hall
      let nx = -o.x * 0.2, ny = -o.y; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      return { o, nx, ny, ux: ny, uy: -nx, empty: i === Math.floor(all.length / 2), pose: R(), slump: (R() - 0.5) * 0.12 };
    });
    const DRAIN = { x: 0, y: -1.2 };
    const floor = T.bake(-13, -9, 13, 9, 40, (c) => {
      const r = Sim.makeRng(263);
      c.fillStyle = C.joint; c.fillRect(-13, -9, 26, 18);
      // great flagstones, worn smooth
      const fw = 1.8, fd = 1.2;
      for (let y = -9; y < 9; y += fd) {
        const off = (Math.round((y + 9) / fd) % 2) * fw * 0.5;
        for (let x = -13 - off; x < 13; x += fw) { const t = r(); c.fillStyle = t < 0.22 ? C.flagLit : t < 0.45 ? C.flagDark : C.flag; c.fillRect(x + 0.035, y + 0.035, fw - 0.07, fd - 0.07); }
      }
      c.strokeStyle = 'rgba(8,6,6,0.5)'; c.lineWidth = 0.03;
      for (let i = 0; i < 24; i++) { const a = r() * TAU, k = r() * 0.9; c.save(); T.branch(c, r, Math.cos(a) * A.rx * k, Math.sin(a) * A.ry * k, r() * TAU, 0.6 + r() * 1.2, 1, 0.03); c.restore(); }
      // channels: from each wheel's slot down to one drain
      const groove = (pts, w) => {
        const line = () => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); };
        line(); c.strokeStyle = C.grooveLip; c.lineWidth = w + 0.1; c.stroke();
        line(); c.strokeStyle = C.groove; c.lineWidth = w; c.stroke();
        line(); c.strokeStyle = C.bloodDark; c.lineWidth = w * 0.7; c.stroke();
        line(); c.strokeStyle = C.blood; c.lineWidth = w * 0.35; c.stroke();
      };
      for (const w of wheels) {
        const o = w.o;
        // the slot the wheel stands in, stained
        c.fillStyle = C.bloodDark; T.fillPoly(c, T.blob(r, o.x + 0.1, o.y + 0.5, 1.2, 0.6, 10, 0.4)); c.fill();
        c.save(); c.translate(o.x, o.y); c.rotate(Math.atan2(w.uy, w.ux)); c.fillStyle = '#060404'; c.fillRect(-1.25, -0.22, 2.5, 0.44); c.strokeStyle = C.grooveLip; c.lineWidth = 0.06; c.strokeRect(-1.25, -0.22, 2.5, 0.44); c.restore();
        if (w.empty) continue;
        const sx = o.x + w.nx * 0.5, sy = o.y + w.ny * 0.5;
        groove([[sx, sy], [sx + (DRAIN.x - sx) * 0.4, sy + (DRAIN.y - sy) * 0.5 + 0.1], [DRAIN.x + (sx - DRAIN.x) * 0.15, DRAIN.y - 0.25]], 0.2);
      }
      // a ring channel round the drain, and the drain itself
      c.strokeStyle = C.grooveLip; c.lineWidth = 0.3; c.beginPath(); c.ellipse(DRAIN.x, DRAIN.y, 1.0, 0.8, 0, 0, TAU); c.stroke();
      c.strokeStyle = C.groove; c.lineWidth = 0.2; c.stroke(); c.strokeStyle = C.bloodDark; c.lineWidth = 0.14; c.stroke();
      c.fillStyle = C.groove; c.beginPath(); c.ellipse(DRAIN.x, DRAIN.y, 0.35, 0.3, 0, 0, TAU); c.fill();
      c.strokeStyle = '#3a3233'; c.lineWidth = 0.04; c.beginPath();
      for (let i = -2; i <= 2; i++) { c.moveTo(DRAIN.x + i * 0.12, DRAIN.y - 0.27); c.lineTo(DRAIN.x + i * 0.12, DRAIN.y + 0.27); }
      c.stroke();
      // old stains, long dry
      for (let i = 0; i < 12; i++) { const a = r() * TAU, d = 0.4 + r() * 2.2; c.fillStyle = 'rgba(40,10,12,0.4)'; T.fillPoly(c, T.blob(r, DRAIN.x + Math.cos(a) * d * 1.4, DRAIN.y + Math.sin(a) * d, 0.2 + r() * 0.5, 0.1 + r() * 0.3, 7, 0.6)); c.fill(); }
      c.fillStyle = C.bloodLit; for (let i = 0; i < 40; i++) { const a = r() * TAU, d = 0.9 + r() * 0.15; c.fillRect(DRAIN.x + Math.cos(a) * d - 0.02, DRAIN.y + Math.sin(a) * d * 0.8 - 0.01, 0.05, 0.02); }
    });
    function walls() {
      const qs = T.quads(segs, 0.1, 0.8);
      const cols = new Path2D(), colSh = new Path2D(), d1 = new Path2D(), d2 = new Path2D(), arch = new Path2D();
      for (const q of qs) {
        if (q.g.door) continue;
        ctx.fillStyle = q.facing <= 0 ? C.wallTop : q.sx > 0.3 ? C.wallLit : q.sx < -0.4 ? C.wallShade : C.wall;
        ctx.beginPath(); T.quadPath(q); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke();
        if (q.facing <= 0) continue;
        // the wall climbs into darkness in hard steps
        T.sub(d1, q, 0, 1, 4.5 / WH, 9 / WH); T.sub(d2, q, 0, 1, 9 / WH, 1);
        if (q.g.col) { T.sub(cols, q, 0.3, 0.6, 0, 9 / WH); T.sub(colSh, q, 0.6, 0.78, 0, 9 / WH); }
        else {
          // a blind arch between the columns
          for (let k = 0; k <= 8; k++) { const u = 0.15 + (k / 8) * 0.7, v = (2.2 + Math.sin((k / 8) * Math.PI) * 1.3) / WH, p = T.on(q, u, v); k ? arch.lineTo(p.x, p.y) : arch.moveTo(p.x, p.y); }
          const b0 = T.on(q, 0.15, 0), b1 = T.on(q, 0.85, 0), a0 = T.on(q, 0.15, 2.2 / WH), a1 = T.on(q, 0.85, 2.2 / WH);
          arch.moveTo(b0.x, b0.y); arch.lineTo(a0.x, a0.y); arch.moveTo(b1.x, b1.y); arch.lineTo(a1.x, a1.y);
        }
      }
      ctx.fillStyle = C.colLit; ctx.fill(cols); ctx.fillStyle = 'rgba(6,4,4,0.5)'; ctx.fill(colSh);
      ctx.strokeStyle = 'rgba(6,4,4,0.7)'; ctx.lineWidth = K.lw(0.03, 1); ctx.stroke(arch);
      ctx.fillStyle = C.dark1; ctx.fill(d1); ctx.fillStyle = C.dark2; ctx.fill(d2);
      door();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.4); ctx.beginPath();
      for (const q of qs) if (!q.g.door && q.facing > 0) { ctx.moveTo(q.b0.x, q.b0.y); ctx.lineTo(q.b1.x, q.b1.y); }
      ctx.stroke();
    }
    function door() {
      if (K.depth(A.exit.x, A.exit.y) > A.ry * 0.4) return;
      const at = (a, z) => P(Math.cos(a) * A.rx * WALL_K, Math.sin(a) * A.ry * WALL_K, z);
      const f = Math.max(0.25, K.tall(A.exit.x, A.exit.y)), hh = 5 * f, a0 = exitA - 0.12, a1 = exitA + 0.12;
      const pts = [at(a0, 0)];
      for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * (i / 10); pts.push(at(a, hh * (0.72 + 0.28 * Math.sin((i / 10) * Math.PI)))); }
      pts.push(at(a1, 0));
      ctx.beginPath(); K.poly(pts); ctx.fillStyle = '#000'; ctx.fill();
      ctx.strokeStyle = C.wallLit; ctx.lineWidth = K.lw(0.2, 3); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.4); ctx.stroke();
    }
    function drawBackdrop() {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, V.W, V.H);
      ctx.save(); T.clipRing(WALL_K + 0.01); floor.draw(); ctx.restore();
      walls();
      // shadows of the wheels
      const sc = V.cam.sc;
      ctx.beginPath();
      for (const w of wheels) { const b = P(w.o.x, w.o.y, 0), off = K.shadowOff(2.2); K.sweep(b, sc * 1.1, sc * 0.3 * V.cam.pitch, { x: off.x * 0.5, y: off.y * 0.5 }); }
      ctx.fillStyle = 'rgba(2,1,1,0.5)'; ctx.fill();
    }
    // One wheel: a stone disc on edge in its slot, carved rings and spokes,
    // and (on four of them) a body in old armour bound spread across it.
    const WR = 1.18, ZC = 1.02, TH = 0.22;
    function drawWheel(w, s) {
      const o = w.o, sc = V.cam.sc;
      const F = (a, b, off) => P(o.x + w.ux * a + w.nx * off, o.y + w.uy * a + w.ny * off, ZC + b);
      const base = P(o.x, o.y, 0);
      if (K.off(base, sc * 4)) return;
      const fade = K.behind(s, base, sc * 1.4, sc * 2.4) ? 0.45 : 1;
      ctx.globalAlpha = fade;
      const ring = (rad, off) => { const pts = []; for (let i = 0; i < 32; i++) { const a = (i / 32) * TAU; const b = Math.sin(a) * rad; pts.push(F(Math.cos(a) * rad, Math.max(b, -ZC), off)); } return pts; };
      const front = ring(WR, TH), back = ring(WR, -TH);
      const frontNear = F(0, 0, TH).d > F(0, 0, -TH).d;
      const near = frontNear ? front : back, far = frontNear ? back : front;
      // teeth round the rim
      const teeth = (pts, col) => { ctx.fillStyle = col; for (let i = 0; i < 32; i += 2) { const a = pts[i], b = pts[(i + 1) % 32]; const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; const c = F(0, 0, 0); const dx = m.x - c.x, dy = m.y - c.y, l = Math.hypot(dx, dy) || 1; if (m.y > base.y + 2) continue; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + dx / l * sc * 0.12, a.y + dy / l * sc * 0.12); ctx.lineTo(b.x + dx / l * sc * 0.12, b.y + dy / l * sc * 0.12); ctx.lineTo(b.x, b.y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.015, 0.8); ctx.stroke(); } };
      if (!frontNear && !w.empty) body(w, F, -1);
      K.path(far); ctx.fillStyle = C.stoneShade; ctx.fill();
      const hull = convexHull(front.concat(back));
      K.path(hull); ctx.fillStyle = C.stoneShade; ctx.fill();
      teeth(near, C.stoneShade);
      K.path(near); ctx.fillStyle = C.stone; ctx.fill();
      ctx.save(); K.path(near); ctx.clip();
      // lit upper-left of the face, hard edged
      const lc = F(-WR * 0.35, WR * 0.4, frontNear ? TH : -TH);
      ctx.fillStyle = C.stoneLit; ctx.beginPath(); ctx.ellipse(lc.x, lc.y, WR * sc * 0.95, WR * sc * 0.85, 0, 0, TAU); ctx.fill();
      // carved rings, hub and spokes
      const offF = frontNear ? TH : -TH;
      ctx.strokeStyle = 'rgba(10,6,6,0.75)'; ctx.lineWidth = K.lw(0.03, 1);
      for (const rr of [0.78, 0.22]) { const pp = ring(WR * rr, offF); ctx.beginPath(); K.poly(pp); ctx.stroke(); }
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2, p0 = F(Math.cos(a) * WR * 0.22, Math.sin(a) * WR * 0.22, offF), p1 = F(Math.cos(a) * WR * 0.78, Math.sin(a) * WR * 0.78, offF); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); }
      ctx.stroke();
      // old blood run down the face from where the bound hands and feet were
      ctx.strokeStyle = 'rgba(60,14,16,0.75)'; ctx.lineWidth = K.lw(0.04, 1.2); ctx.beginPath();
      for (const [a, b, l] of [[-0.6, 0.55, 0.9], [0.62, 0.6, 1.1], [-0.3, -0.5, 0.4], [0.35, -0.55, 0.35], [0.05, 0.1, 0.8]]) { const p0 = F(a, b, offF), p1 = F(a + 0.03, b - l, offF); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); }
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = C.stoneRim; ctx.globalAlpha = fade * 0.5; ctx.lineWidth = K.lw(0.025); ctx.beginPath();
      for (let i = 13; i <= 21; i++) { const p = near[i % 32]; i > 13 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }
      ctx.stroke(); ctx.globalAlpha = fade;
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.04, 1.4); ctx.lineJoin = 'round'; K.path(near); ctx.stroke(); K.path(hull); ctx.stroke();
      if (frontNear) { if (w.empty) shackles(w, F); else body(w, F, 1); }
      ctx.globalAlpha = 1;
    }
    // Shackles hanging open on the empty wheel.
    function shackles(w, F) {
      const sc = V.cam.sc;
      for (const [a, b] of [[-0.8, 0.75], [0.8, 0.75], [-0.5, -0.75], [0.5, -0.75]]) {
        const p = F(a, b, TH + 0.03), q = F(a + 0.05, b - 0.3, TH + 0.06);
        T.inked(() => { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); }, 0.025, C.chainLit, 0.05);
        ctx.strokeStyle = C.chainLit; ctx.lineWidth = K.lw(0.025, 1); ctx.beginPath(); ctx.arc(q.x, q.y + sc * 0.05, sc * 0.06, -0.3, Math.PI + 0.6); ctx.stroke();
      }
    }
    // An ancient body in old armour, bound spread on the wheel, head dropped.
    function body(w, F, side) {
      const sc = V.cam.sc, off = side * (TH + 0.06), k = w.pose;
      const at = (a, b) => F(side * a, b, off);
      const limb = (pts, wd, col) => T.inked(() => { pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); }, wd, col, wd + 0.06);
      // legs, spread to the lower rim; arms up to the upper rim
      limb([at(-0.12, -0.22), at(-0.3, -0.5), at(-0.5 - k * 0.05, -0.8)], 0.11, C.armourDark);
      limb([at(0.12, -0.22), at(0.32, -0.52), at(0.52, -0.82)], 0.11, C.armour);
      limb([at(-0.2, 0.32), at(-0.5, 0.52), at(-0.8, 0.74 - k * 0.05)], 0.09, C.armourDark);
      limb([at(0.2, 0.32), at(0.52, 0.55), at(0.82, 0.76)], 0.09, C.armour);
      // a torn tabard over the breastplate
      const tab = [at(-0.14, 0.05), at(0.14, 0.05), at(0.12, -0.55), at(0.04, -0.42), at(-0.02, -0.6), at(-0.12, -0.45)];
      K.path(tab); ctx.fillStyle = C.cloth; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.02, 1); ctx.stroke();
      // breastplate and pauldrons
      const chest = [at(-0.22, 0.38), at(0.22, 0.38), at(0.17, -0.02), at(0, -0.1), at(-0.17, -0.02)];
      K.path(chest); ctx.fillStyle = C.armour; ctx.fill();
      ctx.save(); K.path(chest); ctx.clip(); const cl = at(-0.12, 0.25); ctx.fillStyle = C.armourLit; ctx.beginPath(); ctx.ellipse(cl.x, cl.y, sc * 0.12, sc * 0.16, 0.3, 0, TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.025, 1.2); K.path(chest); ctx.stroke();
      for (const sx of [-1, 1]) { const p = at(sx * 0.24, 0.36); ctx.fillStyle = sx < 0 ? C.armourLit : C.armour; ctx.beginPath(); ctx.ellipse(p.x, p.y, sc * 0.11, sc * 0.08, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
      // helm, dropped to one side
      const hd = at(0.03 + w.slump, 0.55), hr = sc * 0.12;
      ctx.fillStyle = C.armour; ctx.beginPath(); ctx.ellipse(hd.x, hd.y, hr, hr * 1.15, w.slump * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = C.armourLit; ctx.beginPath(); ctx.ellipse(hd.x - hr * 0.3, hd.y - hr * 0.35, hr * 0.45, hr * 0.5, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = K.lw(0.025, 1.2); ctx.beginPath(); ctx.ellipse(hd.x, hd.y, hr, hr * 1.15, w.slump * 3, 0, TAU); ctx.stroke();
      ctx.fillStyle = INK; ctx.fillRect(hd.x - hr * 0.7, hd.y + hr * 0.05, hr * 1.4, Math.max(1.5, hr * 0.16));
      // irons at wrists and ankles
      ctx.fillStyle = C.chain;
      for (const [a, b] of [[-0.8, 0.74], [0.82, 0.76], [-0.5, -0.8], [0.52, -0.82]]) { const p = at(a, b); ctx.beginPath(); ctx.ellipse(p.x, p.y, sc * 0.07, sc * 0.05, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = C.chainLit; ctx.lineWidth = K.lw(0.012, 0.8); ctx.stroke(); }
    }
    function items(s) {
      return wheels.map((w) => ({ d: P(w.o.x, w.o.y, 0).d, f: () => drawWheel(w, s) }));
    }
    const overlay = K.overlay({
      vig: [0.55, 0.95], vigCol: '2,1,1', tone: 1.05, toneCol: 'rgba(4,2,2,0.5)',
      paint(c, W, H) {
        // the ceiling: nothing, just dark coming down
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.3, 'rgba(0,0,0,0.25)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(6,2,2,0.3)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      },
    });
    const motes = K.motes(10, 269, () => 0);
    for (const m of motes) { m.vx *= 0.3; m.vy *= 0.15; }
    function drawAtmosphere() {
      const sc = V.cam.sc;
      // a thin grey light from somewhere far above, on the wheels
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const w of wheels) { const p = P(w.o.x, w.o.y, ZC); T.glow('150,140,150', p.x, p.y, sc * 2.0, sc * 2.0, 0.09); }
      const c = P(DRAIN.x, DRAIN.y, 0); T.glow('120,110,120', c.x, c.y, sc * 6, sc * 6 * V.cam.pitch, 0.07);
      ctx.restore();
      overlay.draw();
      K.drawMotes(motes, ['rgba(200,180,170,0.22)']);
    }
    return { drawBackdrop, items, drawAtmosphere, resize: overlay.reset, free: floor.free };
  }

  function rgbaHex(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(2)})`;
  }

  // ================================================================ dispatch
  // One dressing per arena, built on first use and cached; the arena of the
  // match being drawn picks which one is live, so switching arenas in one
  // page session just swaps (and size-dependent caches are reset).
  const THEMES = { forest, summit, hill, cave, road, ruins, yard, deep, tavern, grassland, shadowcity, farmland, nightcamp, frosthall, calamity, offering };
  function create(V) {
    const built = new Map();
    let cur = null, curArena = null;
    function pick(s) {
      const A = (s && s.arena) || V.Sim.ARENA;
      if (A !== curArena) {
        // Leaving an arena drops its big baked layers; they rebuild on return.
        if (cur && cur.free) cur.free();
        curArena = A;
        cur = built.get(A);
        if (!cur) { cur = (THEMES[A.theme] || forest)(V, A); built.set(A, cur); }
        if (cur.resize) cur.resize();
      }
      return cur;
    }
    return {
      drawBackdrop: (s) => pick(s).drawBackdrop(s),
      items: (s) => pick(s).items(s),
      drawAtmosphere: (s, dt) => pick(s).drawAtmosphere(s, dt),
      resize() { for (const t of built.values()) if (t.resize) t.resize(); },
    };
  }

  NS.world = { create };
})();
