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
  function rgbaHex(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(2)})`;
  }

  // ================================================================ dispatch
  // One dressing per arena, built on first use and cached; the arena of the
  // match being drawn picks which one is live, so switching arenas in one
  // page session just swaps (and size-dependent caches are reset).
  const THEMES = { forest, summit, hill, cave, road, ruins, yard, deep };
  function create(V) {
    const built = new Map();
    let cur = null, curArena = null;
    function pick(s) {
      const A = (s && s.arena) || V.Sim.ARENA;
      if (A !== curArena) {
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
