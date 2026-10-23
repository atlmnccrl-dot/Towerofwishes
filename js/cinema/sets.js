/*
 * Tower of Wishes — painted sets for the cinema (js/render/cinema.js), 2026-10-22.
 *
 * Painted in code in the arenas' manner (flat colour, soft light, ink edges), built as a small
 * 3D city the camera can stand in, turn round in and run across: houses are solids (walls,
 * gabled or flat roofs, lit windows) shaded by the low dusk sun and softened with distance;
 * past the houses a ring of skyline, hills and the Tower rising into the cloud ceiling.
 *
 * World: x east, y up, z north (metres). The Tower stands far to the north.
 * A set: { back(view), pieces(view) -> [{ box | p | d, f }], front(view), look(actor), grade }
 * view: { ctx, W, H, cam, project, poly, face, toCam, t, hz }
 */
(function () {
  'use strict';
  const INK = 'rgba(20,12,18,0.85)';
  function rng(seed) { let s = Math.abs(Math.floor(seed)) % 2147483647 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  // ------------------------------------------------------------------ light
  // The sun is low in the west; faces turned to it are warm, the rest fall into violet shade,
  // and everything far away sinks into the dusk haze.
  const SUN = (() => { const v = [-0.85, 0.42, -0.3], l = Math.hypot(...v); return v.map((c) => c / l); })();
  let HAZE = [106, 74, 110]; // each set's back() sets its own (setHaze)
  const setHaze = (rgb) => { HAZE = rgb; };
  function shadeA(rgb, n, dist, warm, dark) {
    const l = Math.hypot(n[0], n[1], n[2]) || 1, dot = (n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]) / l;
    const k = (0.56 + 0.44 * Math.max(0, dot)) * (dark || 1), w = (warm == null ? 1 : warm) * Math.max(0, dot) * (dark || 1);
    const f = 1 - Math.exp(-(dist || 0) / 170);
    const c = [rgb[0] * k + 40 * w, rgb[1] * k + 14 * w, rgb[2] * k - 6 * w];
    return [(c[0] + (HAZE[0] - c[0]) * f) | 0, (c[1] + (HAZE[1] - c[1]) * f) | 0, (c[2] + (HAZE[2] - c[2]) * f) | 0];
  }
  const shade = (rgb, n, dist, warm) => { const c = shadeA(rgb, n, dist, warm); return `rgb(${c[0]},${c[1]},${c[2]})`; };
  // a wall's fill: lit at the eaves, sinking into shadow toward the street
  function wallFill(v, rgb, n, dist, top, bot) {
    if (dist > 55) return shade(rgb, n, dist); // (far away the gradient isn't seen; skip its cost)
    const a = v.project(top[0], top[1], top[2]), b = v.project(bot[0], bot[1], bot[2]);
    const c0 = shadeA(rgb, n, dist), c1 = shadeA(rgb, n, dist, 1, 0.45);
    if (!a || !b || Math.abs(b.y - a.y) < 4) return `rgb(${c0[0]},${c0[1]},${c0[2]})`;
    const g = v.ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, `rgb(${c0[0]},${c0[1]},${c0[2]})`); g.addColorStop(1, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
    return g;
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // ------------------------------------------------------------------ the sky and the far world
  const DUSK = { top: '#191232', mid: '#5a3360', low: '#e08a5e', ground: '#3a2a3e' };
  function sky(v, P, sunAz) {
    const { ctx, W, H, cam } = v, hz = v.hz;
    const g = ctx.createLinearGradient(0, Math.min(hz - H * 1.2, 0), 0, hz + 2);
    g.addColorStop(0, P.top); g.addColorStop(0.62, P.mid); g.addColorStop(1, P.low);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.max(0, hz + 2));
    ctx.fillStyle = P.ground; ctx.fillRect(0, Math.max(0, hz), W, H);
    // the setting sun's glow, where the sun is
    const s = v.project(cam.x + Math.sin(sunAz) * 5000, cam.y + 220, cam.z + Math.cos(sunAz) * 5000);
    const da = Math.abs(wrap(sunAz - cam.yaw));
    const sx = s ? s.x : W / 2 + Math.sign(wrap(sunAz - cam.yaw)) * W * (0.5 + da), sxy = s ? s.y : hz;
    const rg = ctx.createRadialGradient(sx, sxy, 0, sx, sxy, W * 0.75);
    const gl = P.glow || ['255,196,130', '255,150,110'];
    rg.addColorStop(0, `rgba(${gl[0]},0.7)`); rg.addColorStop(0.35, `rgba(${gl[1]},0.25)`); rg.addColorStop(1, `rgba(${gl[1]},0)`);
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, Math.max(0, hz + H * 0.1));
    // stars, faint, high up
    const r = rng(77), F = H * cam.F;
    ctx.fillStyle = 'rgba(255,240,220,0.8)';
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, el = 0.25 + r() * 0.6, x = W / 2 + wrap(a - cam.yaw) * F, y = hz - Math.tan(el) * F * 0.7;
      if (x < 0 || x > W || y < 0) continue;
      ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(v.t * 0.7 + i)); ctx.fillRect(x, y, 1.3, 1.3);
    }
    ctx.globalAlpha = 1;
  }
  // the cloud ceiling: long soft bands overhead, drifting
  function ceiling(v) {
    const { ctx, W, H, cam } = v, F = H * cam.F, r = rng(9);
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, el = 0.42 + r() * 0.5;
      const x = W / 2 + wrap(a - cam.yaw + v.t * 0.004) * F, y = v.hz - Math.tan(el) * F * 0.75;
      const w = W * (0.4 + r() * 0.5), h = H * (0.05 + r() * 0.06);
      if (x < -w || x > W + w || y < -h * 2 || y > H) continue;
      const g = ctx.createRadialGradient(x, y, 0, x, y, w * 0.5);
      const cc = v.cloud || '66,42,84';
      g.addColorStop(0, `rgba(${cc},0.85)`); g.addColorStop(1, `rgba(${cc},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w * 0.5, h, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // the Tower: a tapering spire far to the north, rising into the cloud ceiling
  function tower(v, x, z) {
    const { ctx } = v;
    const b = v.project(x, 0, z), t = v.project(x, 1500, z);
    if (!b || !t) return;
    const wb = 70 * b.s, wt = 24 * t.s;
    if (Math.max(b.x, t.x) + wb < 0 || Math.min(b.x, t.x) - wb > v.W) return;
    const g = ctx.createLinearGradient(b.x - wb, 0, b.x + wb, 0);
    g.addColorStop(0, '#3e3058'); g.addColorStop(0.5, '#56446e'); g.addColorStop(1, '#2a2040');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(b.x - wb / 2, b.y); ctx.lineTo(t.x - wt / 2, t.y); ctx.lineTo(t.x + wt / 2, t.y); ctx.lineTo(b.x + wb / 2, b.y); ctx.closePath(); ctx.fill();
    // window lights climbing it
    ctx.fillStyle = 'rgba(255,214,150,0.85)';
    for (let i = 1; i < 48; i++) {
      const k = i / 48, y = b.y + (t.y - b.y) * k, w = (wb + (wt - wb) * k) * 0.09;
      if ((i * 7) % 5 < 2) ctx.fillRect(b.x + (t.x - b.x) * k - w / 2, y, Math.max(1, w), Math.max(1, w * 0.6));
    }
    // violet light where it pierces the clouds, and a thread of it climbing on
    const gy = t.y + (b.y - t.y) * 0.1, gr = ctx.createRadialGradient(t.x, gy, 0, t.x, gy, v.W * 0.22);
    gr.addColorStop(0, 'rgba(190,150,255,0.5)'); gr.addColorStop(1, 'rgba(190,150,255,0)');
    const R = v.W * 0.22;
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(t.x - R, gy - R, R * 2, R * 2);
    ctx.fillStyle = 'rgba(200,170,255,0.35)'; ctx.fillRect(t.x - 1, Math.min(t.y, gy) - v.H, 2, v.H);
    const L = tinted('light_01', '200,170,255');
    if (L) { const r = v.W * 0.12; ctx.globalAlpha = 0.5; ctx.drawImage(L, t.x - r, gy - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    ctx.globalCompositeOperation = 'source-over';
  }
  // a ring of distant skyline and hills round the city (cheap: culled by bearing)
  function ringOf(seed, R, n, hMin, hMax, roofy) {
    const r = rng(seed), out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.01, w = (Math.PI * 2 / n) * (0.7 + r() * 0.5), h = hMin + r() * (hMax - hMin);
      out.push({ a, w, h, roof: roofy ? r() : 1, lit: r() });
    }
    return { R, list: out };
  }
  function drawRing(v, ring, cx, cz, col, litCol, open) {
    const { cam, ctx } = v, lights = [];
    ctx.beginPath();
    for (const b of ring.list) {
      if (Math.abs(wrap(b.a - cam.yaw)) > 1.3) continue;
      if (open && Math.abs(wrap(b.a - open[0])) < open[1]) continue;
      const a0 = b.a - b.w / 2, a1 = b.a + b.w / 2, R = ring.R;
      const p0 = [cx + Math.sin(a0) * R, 0, cz + Math.cos(a0) * R], p1 = [cx + Math.sin(a1) * R, 0, cz + Math.cos(a1) * R];
      const pts = [p0, [p0[0], b.h, p0[2]]];
      if (b.roof < 0.35) pts.push([(p0[0] + p1[0]) / 2, b.h + b.w * R * 0.4, (p0[2] + p1[2]) / 2]);
      else if (b.roof < 0.45) pts.push([(p0[0] * 0.6 + p1[0] * 0.4), b.h, (p0[2] * 0.6 + p1[2] * 0.4)], [(p0[0] + p1[0]) / 2, b.h + b.w * R * 1.6, (p0[2] + p1[2]) / 2], [(p0[0] * 0.4 + p1[0] * 0.6), b.h, (p0[2] * 0.4 + p1[2] * 0.6)]);
      pts.push([p1[0], b.h, p1[2]], p1);
      if (v.addPoly(pts) && litCol && b.lit < 0.7) lights.push([(p0[0] + p1[0]) / 2, b.h * (0.25 + b.lit * 0.6), (p0[2] + p1[2]) / 2]);
    }
    ctx.fillStyle = col; ctx.fill();
    if (litCol) { ctx.fillStyle = litCol; for (const L of lights) { const q = v.project(L[0], L[1], L[2]); if (q) ctx.fillRect(q.x, q.y, 1.6, 1.6); } }
  }
  // the hills: one continuous ridge round the horizon
  const HILLS = (() => { const r = rng(5), n = 120, h = []; for (let i = 0; i < n; i++) h.push(70 + 120 * Math.abs(Math.sin(i * 0.21) * Math.cos(i * 0.07)) + r() * 40); return { R: 2400, h }; })();
  function ridge(v, cx, cz, col) {
    const { cam } = v, n = HILLS.h.length, R = HILLS.R;
    v.ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      if (Math.abs(wrap((a0 + a1) / 2 - cam.yaw)) > 1.3) continue;
      const p0 = [cx + Math.sin(a0) * R, 0, cz + Math.cos(a0) * R], p1 = [cx + Math.sin(a1) * R, 0, cz + Math.cos(a1) * R];
      v.addPoly([p0, [p0[0], HILLS.h[i], p0[2]], [p1[0], HILLS.h[(i + 1) % n], p1[2]], p1]);
    }
    v.ctx.fillStyle = col; v.ctx.fill();
  }
  const RING_CITY = ringOf(11, 420, 160, 12, 40, true);
  const RING_MID = ringOf(23, 170, 120, 6, 17, true);
  function farWorld(v, cx, cz, opts) {
    ridge(v, cx, cz, opts.hills || '#5e4266');
    if (opts.tower) tower(v, opts.tower[0], opts.tower[1]);
    if (opts.clouds !== false) ceiling(v);
    if (opts.city !== false) {
      drawRing(v, RING_CITY, cx, cz, '#6a4a6c', 'rgba(255,207,122,0.9)', opts.open);
      if (opts.mid !== false) drawRing(v, RING_MID, cx, cz, '#5e4060', 'rgba(255,210,138,0.95)', opts.open);
    }
  }

  // ------------------------------------------------------------------ soft textures
  // assets/vfx/ (from the Brackeys VFX bundle, CC0): white shapes, tinted here on demand.
  const TEX = {}, TINT = {};
  function tex(n) {
    if (!TEX[n] && typeof Image !== 'undefined') { const im = new Image(); im.src = 'assets/vfx/' + n + '.png'; TEX[n] = im; }
    const im = TEX[n];
    return im && im.complete && im.naturalWidth ? im : null;
  }
  function tinted(n, rgb) {
    const k = n + '|' + rgb;
    if (TINT[k]) return TINT[k];
    const im = tex(n);
    if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(${rgb})`; g.fillRect(0, 0, c.width, c.height);
    return (TINT[k] = c);
  }
  // a texture standing in the world at (x, y, z), size in metres
  function sprite3(v, n, rgb, x, y, z, size, alpha, rot, add) {
    const p = v.project(x, y, z); if (!p) return;
    const img = tinted(n, rgb); if (!img) return;
    const sz = size * p.s; if (sz < 1.5 || alpha <= 0.01) return;
    const { ctx } = v;
    ctx.save(); ctx.globalAlpha = Math.min(1, alpha); if (add) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, p.y); if (rot) ctx.rotate(rot);
    ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz); ctx.restore();
  }
  // smoke rising from a chimney and leaning with the wind
  function smoke(v, x, y, z, seed) {
    if (dist3(v, x, y, z) > 70) return;
    for (let i = 0; i < 5; i++) {
      const age = (v.t * 0.18 + i / 5 + seed * 0.37) % 1;
      sprite3(v, i % 2 ? 'smoke_04' : 'smoke_07', '118,100,122', x + age * 1.8, y + 0.3 + age * 4.5, z, 0.7 + age * 2.6, (1 - age) * age * 1.3, seed + age * 1.5);
    }
  }

  // ------------------------------------------------------------------ the city kit
  function glow(v, x, y, z, r, col, a) {
    const p = v.project(x, y, z); if (!p) return;
    const R = r * p.s; if (R < 1) return;
    const g = v.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
    v.ctx.globalCompositeOperation = 'lighter'; v.ctx.fillStyle = g; v.ctx.fillRect(p.x - R, p.y - R, R * 2, R * 2); v.ctx.globalCompositeOperation = 'source-over';
  }
  const dist3 = (v, x, y, z) => Math.hypot(x - v.cam.x, y - v.cam.y, z - v.cam.z);
  // windows on a wall seen through its four projected corners (bottom-left, top-left, top-right, bottom-right)
  function windows(v, Q, wM, hM, seed, litK) {
    const { ctx } = v;
    const span = Math.hypot(Q[3].x - Q[0].x, Q[3].y - Q[0].y);
    if (span < 30) return;
    const r = rng(seed), cols = Math.max(1, Math.floor(wM / 2.3)), rows = Math.max(1, Math.floor((hM - 1.2) / 3));
    const at = (u, w) => { // bilinear across the wall
      const bx = Q[0].x + (Q[3].x - Q[0].x) * u, by = Q[0].y + (Q[3].y - Q[0].y) * u, tx = Q[1].x + (Q[2].x - Q[1].x) * u, ty = Q[1].y + (Q[2].y - Q[1].y) * u;
      return [bx + (tx - bx) * w, by + (ty - by) * w];
    };
    // one path per colour: the dark panes and the door, then the lit ones in two tones
    const groups = [[], [], []];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const lit = r() < litK, tone = r(), u0 = (i + 0.3) / cols, u1 = (i + 0.7) / cols, w0 = (1.4 + j * 3) / hM, w1 = Math.min(0.95, (2.9 + j * 3) / hM);
      if (j === 0 && i === Math.floor(cols / 2)) { groups[0].push([u0, u1, 0, 2.3 / hM]); continue; } // the door
      if (w0 >= 0.95) continue;
      groups[lit ? (tone < 0.5 ? 1 : 2) : 0].push([u0, u1, w0, w1]);
    }
    ['#22161e', '#ffcf7a', '#ffb35e'].forEach((col, g) => {
      if (!groups[g].length) return;
      ctx.beginPath();
      for (const [u0, u1, w0, w1] of groups[g]) { const a = at(u0, w0), b = at(u0, w1), c = at(u1, w1), d = at(u1, w0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); }
      ctx.fillStyle = col; ctx.fill();
    });
  }
  // A house: box b = [x0, x1, y0, y1, z0, z1]; roof 'x' | 'z' (gable ridge along that axis) | 'flat'
  function house(v, h) {
    const [x0, x1, y0, y1, z0, z1] = h.b, rh = h.rh || 0;
    const d = dist3(v, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const W = h.wall, edge = d < 40 ? INK : null;
    const walls = [
      { n: [0, 0, -1], pts: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], w: x1 - x0 },
      { n: [0, 0, 1], pts: [[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], w: x1 - x0 },
      { n: [-1, 0, 0], pts: [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], w: z1 - z0 },
      { n: [1, 0, 0], pts: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], w: z1 - z0 },
    ];
    for (let i = 0; i < 4; i++) {
      const f = walls[i], q = f.pts, vis = (v.cam.x - q[0][0]) * f.n[0] + (v.cam.z - q[0][2]) * f.n[2] > 0;
      if (!vis) continue;
      const mid = [(q[0][0] + q[3][0]) / 2, 0, (q[0][2] + q[3][2]) / 2];
      const P = v.face(q, f.n, wallFill(v, W, f.n, d, [mid[0], y1, mid[2]], [mid[0], y0, mid[2]]), edge);
      if (P && P.length === 4 && h.win !== false && d < 70) {
        // timber bands between the floors
        const { ctx } = v;
        if (d < 45) {
          ctx.strokeStyle = 'rgba(40,24,22,0.55)'; ctx.lineWidth = 1; ctx.beginPath();
          for (let y = y0 + 3.2; y < y1 - 0.5; y += 3) { const a = v.project(f.pts[0][0], y, f.pts[0][2]), b = v.project(f.pts[3][0], y, f.pts[3][2]); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
          ctx.stroke();
        }
        windows(v, [P[0], P[1], P[2], P[3]], f.w, y1 - y0, h.seed * 7 + i, h.lit == null ? 0.5 : h.lit);
      }
    }
    // the roof
    const R = h.roofCol;
    if (h.roof === 'flat' || !rh) {
      const top = v.face([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], shade(R, [0, 1, 0], d), edge);
      if (top && h.tiles && d < 60) tiles(v, h);
      return;
    }
    const o = 0.35, yt = y1 + rh;
    if (h.roof === 'z') {
      const xm = (x0 + x1) / 2;
      v.face([[x0 - o, y1 - 0.2, z0 - o], [xm, yt, z0 - o], [xm, yt, z1 + o], [x0 - o, y1 - 0.2, z1 + o]], [-rh, xm - x0, 0], shade(R, [-rh, xm - x0, 0], d), edge);
      v.face([[x1 + o, y1 - 0.2, z1 + o], [xm, yt, z1 + o], [xm, yt, z0 - o], [x1 + o, y1 - 0.2, z0 - o]], [rh, xm - x0, 0], shade(R, [rh, xm - x0, 0], d), edge);
      v.face([[x0, y1, z0], [xm, yt, z0], [x1, y1, z0]], [0, 0, -1], shade(W, [0, 0, -1], d), edge);
      v.face([[x1, y1, z1], [xm, yt, z1], [x0, y1, z1]], [0, 0, 1], shade(W, [0, 0, 1], d), edge);
    } else {
      const zm = (z0 + z1) / 2;
      v.face([[x1 + o, y1 - 0.2, z0 - o], [x1 + o, yt, zm], [x0 - o, yt, zm], [x0 - o, y1 - 0.2, z0 - o]], [0, zm - z0, -rh], shade(R, [0, zm - z0, -rh], d), edge);
      v.face([[x0 - o, y1 - 0.2, z1 + o], [x0 - o, yt, zm], [x1 + o, yt, zm], [x1 + o, y1 - 0.2, z1 + o]], [0, zm - z0, rh], shade(R, [0, zm - z0, rh], d), edge);
      v.face([[x0, y1, z1], [x0, yt, zm], [x0, y1, z0]], [-1, 0, 0], shade(W, [-1, 0, 0], d), edge);
      v.face([[x1, y1, z0], [x1, yt, zm], [x1, y1, z1]], [1, 0, 0], shade(W, [1, 0, 0], d), edge);
    }
  }
  // roof tiles on a flat terrace: courses across the run, and a coping along both edges
  function tiles(v, h) {
    const [x0, x1, , y1, z0, z1] = h.b, { ctx } = v;
    ctx.strokeStyle = 'rgba(40,18,18,0.5)'; ctx.lineWidth = 1;
    const zs = Math.max(z0, v.cam.z - 6), ze = Math.min(z1, v.cam.z + 60);
    ctx.beginPath();
    for (let z = Math.ceil(zs / 0.6) * 0.6; z < ze; z += 0.6) { const a = v.project(x0, y1, z), b = v.project(x1, y1, z); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
    ctx.stroke();
    for (const x of [x0 + 0.25, x1 - 0.25]) v.poly([[x - 0.25, y1 + 0.02, Math.max(z0, v.cam.z - 30)], [x - 0.25, y1 + 0.02, z1], [x + 0.25, y1 + 0.02, z1], [x + 0.25, y1 + 0.02, Math.max(z0, v.cam.z - 30)]], shade([120, 84, 70], [0, 1, 0], 0));
  }
  function block(v, b, col, ink) {
    const [x0, x1, y0, y1, z0, z1] = b, d = dist3(v, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), e = ink ? INK : null;
    v.face([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], [0, 0, -1], shade(col, [0, 0, -1], d), e);
    v.face([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], [0, 0, 1], shade(col, [0, 0, 1], d), e);
    v.face([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], [-1, 0, 0], shade(col, [-1, 0, 0], d), e);
    v.face([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], shade(col, [1, 0, 0], d), e);
    v.face([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0], shade(col, [0, 1, 0], d), e);
  }
  function chimney(v, x, y, z, s) {
    const w = 0.45 * (s || 1), hh = 1.5 * (s || 1);
    block(v, [x - w, x + w, y, y + hh, z - w, z + w], [92, 54, 50], dist3(v, x, y, z) < 30);
    block(v, [x - w - 0.08, x + w + 0.08, y + hh, y + hh + 0.15, z - w - 0.08, z + w + 0.08], [50, 30, 34]);
    const k = Math.abs(Math.floor(x * 7 + z * 3)) % 3;
    if (k === 0) smoke(v, x, y + hh, z, (x * 0.13 + z * 0.07) % 1);
  }
  // (lit 0..1: an unlit lantern is dark glass; lighting it brings the flame up)
  function lantern(v, x, y, z, lit) {
    const p = v.project(x, y, z); if (!p) return;
    const s = Math.max(1.5, Math.min(14, 0.2 * p.s)), L = lit == null ? 1 : Math.max(0, Math.min(1, lit));
    v.ctx.fillStyle = '#2a1a16'; v.ctx.fillRect(p.x - s * 0.6, p.y - s * 1.1, s * 1.2, s * 0.25);
    v.ctx.fillStyle = L > 0.5 ? '#ffcf7a' : L > 0.05 ? '#b87a48' : '#3a2c34'; v.ctx.fillRect(p.x - s * 0.5, p.y - s * 0.9, s, s * 1.3);
    if (L <= 0.01) return;
    glow(v, x, y - 0.1, z, 2.2, '255,180,100', (0.45 + 0.08 * Math.sin(v.t * 8 + x)) * L);
    sprite3(v, 'star_06', '255,214,150', x, y - 0.1, z, 0.9, (0.55 + 0.1 * Math.sin(v.t * 7 + z)) * L, 0, true);
  }

  // ------------------------------------------------------------------ the rooftops and the overlook
  // The run goes north along x = 0 over a line of flat terraces, [z0, z1, height]; the gaps
  // between them drop to the alleys. The last terrace is the overlook at the city's edge.
  // the last gap (56 -> 63) is the wide one Eiryn misjudges (TW-004); the last roof is where Alric lands with her
  const RUN = [[-70, 8, 14], [11.2, 24, 13.4], [27, 40, 14.2], [43, 56, 14.6], [63, 80, 15.4]];
  const EDGE = 80, TOWER_R = [420, 2600];
  const runAt = (z) => { for (const r of RUN) if (z >= r[0] && z <= r[1]) return r[2]; return null; };
  const WALLS = ['#8a6458', '#7a6050', '#946e5a', '#6e5866', '#8c7460', '#7c5a58'].map(hex);
  const ROOFC = ['#5a2e2e', '#4a3040', '#64382c', '#3e3446'].map(hex);
  const CITY = (() => {
    const r = rng(314), out = [];
    // the run line itself
    RUN.forEach((t, i) => out.push({ b: [-3.4, 3.4, 0, t[2], t[0], t[1]], roof: 'flat', tiles: true, wall: WALLS[i % WALLS.length], roofCol: [128, 72, 58], seed: i + 1, lit: 0.45 }));
    // rows of houses either side, broken by alleys, ending at the city's edge
    for (const side of [-1, 1]) {
      let x = 7;
      for (let col = 0; col < 6; col++) {
        const w = 5.5 + r() * 3.5;
        for (let z = -70 + r() * 4; z < EDGE - 4;) {
          const len = Math.min(EDGE - z, 7 + r() * 9), hgt = 6.5 + r() * 3.5 + col * 0.7, kind = r();
          const xa = side > 0 ? x : -x - w, xb = side > 0 ? x + w : -x;
          out.push({ b: [xa, xb, 0, hgt, z, z + len], roof: kind < 0.55 ? 'z' : kind < 0.85 ? 'x' : 'flat', rh: 1.8 + r() * 1.4, wall: WALLS[Math.floor(r() * WALLS.length)], roofCol: ROOFC[Math.floor(r() * ROOFC.length)], seed: out.length, lit: 0.35 + r() * 0.3, chim: r() < 0.6 });
          z += len + 1.6 + r() * 2.4;
        }
        x += w + 2.2 + r() * 2;
      }
    }
    return out;
  })();
  // fields, a river and village lights beyond the city's edge
  const LANDS = (() => {
    const r = rng(31), f = [];
    const tones = ['#3e4a32', '#4c5636', '#5e5a3a', '#34402e', '#56603c'].map(hex);
    for (let i = 0; i < 70; i++) { const z = EDGE + 20 + Math.pow(r(), 1.6) * 1400, x = (r() - 0.5) * (300 + z * 1.6), w = 20 + r() * 50 + z * 0.06, l = 14 + r() * 30 + z * 0.04; f.push({ x, z, w, l, k: i % tones.length }); }
    const lights = []; for (let i = 0; i < 60; i++) lights.push([(r() - 0.5) * 2400, 0.5, EDGE + 60 + r() * 1500]);
    return { f, lights, tones };
  })();
  function lands(v) {
    const { ctx } = v;
    v.poly([[-4000, 0, EDGE], [-4000, 0, 4000], [4000, 0, 4000], [4000, 0, EDGE]], shade([60, 70, 48], [0, 1, 0], 260));
    LANDS.tones.forEach((c, k) => {
      ctx.beginPath();
      for (const f of LANDS.f) if (f.k === k) v.addPoly([[f.x - f.w / 2, 0, f.z - f.l / 2], [f.x - f.w / 2, 0, f.z + f.l / 2], [f.x + f.w / 2, 0, f.z + f.l / 2], [f.x + f.w / 2, 0, f.z - f.l / 2]]);
      ctx.fillStyle = shade(c, [0, 1, 0], 500); ctx.fill();
    });
    // the river, catching the last light
    const pts = [];
    for (let z = EDGE + 260; z < 3000; z += 30) pts.push([-260 + Math.sin(z / 160) * 120 + z * 0.1, 0.2, z]);
    ctx.strokeStyle = 'rgba(232,160,140,0.55)'; ctx.lineCap = 'butt';
    for (let i = 1; i < pts.length; i++) {
      const a = v.project(...pts[i - 1]), b = v.project(...pts[i]);
      if (!a || !b) continue;
      ctx.lineWidth = Math.max(0.6, Math.min(4, 7 * b.s)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.fillStyle = '#ffcf7a';
    for (const L of LANDS.lights) { const p = v.project(...L); if (p) ctx.fillRect(p.x, p.y, 1.5, 1.5); }
  }
  const roofs = {
    grade: [255, 160, 120, 0.12],
    look: () => ({ ink: 1.6, shade: 0.1, shadeCol: '#2a1430' }),
    back(v) {
      setHaze([106, 74, 110]);
      sky(v, DUSK, -1.35);
      farWorld(v, 0, 0, { tower: TOWER_R, open: [0, 1.25] });
      // the sky splitting (vars.burn 0..1): red flooding down from a white line across it
      const BURN = v.vars.burn || 0;
      if (BURN > 0.01) {
        const { ctx, W, H } = v, ly = Math.max(4, v.hz - H * 0.36);
        const g = ctx.createLinearGradient(0, 0, 0, v.hz);
        g.addColorStop(0, `rgba(150,20,20,${(0.75 * BURN).toFixed(3)})`); g.addColorStop(1, `rgba(255,90,40,${(0.45 * BURN).toFixed(3)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, v.hz);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,250,240,${Math.min(1, BURN * 1.6).toFixed(3)})`; ctx.fillRect(0, ly, W, Math.max(1, H * 0.006));
        const lg = ctx.createLinearGradient(0, ly - H * 0.08, 0, ly + H * 0.08);
        lg.addColorStop(0, 'rgba(255,80,40,0)'); lg.addColorStop(0.5, `rgba(255,120,60,${(0.6 * BURN).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, ly - H * 0.08, W, H * 0.16);
        // fire falling from the line
        for (let i = 0; i < 14; i++) { const fx = ((i * 97 + v.t * 40 * (1 + (i % 3))) % (W + 40)) - 20, fy = ly + ((v.t * (60 + i * 9) + i * 37) % (v.hz - ly + 20)); ctx.fillStyle = `rgba(255,${150 + (i % 4) * 20},80,${(0.8 * BURN).toFixed(3)})`; ctx.fillRect(fx | 0, fy | 0, 2, 4); }
        ctx.restore();
      }
      lands(v);
      // the streets far below
      v.poly([[-60, 0, -90], [-60, 0, EDGE], [60, 0, EDGE], [60, 0, -90]], shade([52, 36, 40], [0, 1, 0], 0));
      // lamplight pooled in the alleys between the terraces, far below
      for (let i = 0; i + 1 < RUN.length; i++) { const z = (RUN[i][1] + RUN[i + 1][0]) / 2; glow(v, 0, 0.3, z, 7, '255,160,80', 0.5); glow(v, 0, 3, z, 3, '255,200,130', 0.35); }
    },
    pieces(v) {
      const out = [];
      for (const h of CITY) {
        const B = h.b, cx = (B[0] + B[1]) / 2, cz = (B[4] + B[5]) / 2;
        // skip what is well behind the lens
        const c = v.toCam(cx, B[3], cz), rad = Math.max(B[1] - B[0], B[5] - B[4]) / 2 + 3;
        if (c[2] < -rad) continue;
        out.push({ box: [B[0], B[1], B[2], B[3] + (h.rh || 0), B[4], B[5]], f: () => house(v, h) });
        if (h.chim && h.roof !== 'flat') out.push({ p: [cx + 0.8, B[3], cz], on: false, f: () => chimney(v, cx + 0.8, B[3] + (h.rh || 0) * 0.45, cz, 0.9) });
      }
      // chimneys and lanterns along the run, sliding past the runner's eye
      for (const t of RUN) for (let z = t[0] + 3; z < t[1] - 2; z += 6.5) {
        const x = ((z * 13) | 0) % 2 ? 2.6 : -2.6;
        out.push({ p: [x, t[2], z], f: () => chimney(v, x, t[2], z) });
      }
      for (let i = 0; i + 1 < RUN.length; i++) {
        const z = RUN[i][1] + 0.2, y = RUN[i][2] - 2.4, z2 = RUN[i + 1][0] - 0.2, y2 = RUN[i + 1][2] - 3;
        out.push({ p: [-3.6, y, z], on: false, f: () => lantern(v, -2.8, y, z) });
        out.push({ p: [3.6, y2, z2], on: false, f: () => lantern(v, 2.8, y2, z2) });
      }
      // the overlook's low wall at the city's edge
      const top = RUN[RUN.length - 1][2];
      out.push({ p: [0, top, EDGE - 0.3], f: () => block(v, [-3.4, 3.4, top, top + 0.85, EDGE - 0.5, EDGE], [120, 80, 70], true) });
      return out;
    },
    front(v) {},
    runAt, RUN, EDGE,
  };

  // ------------------------------------------------------------------ the square (Erdra, evening)
  // A plaza ringed by houses; a street leaves it to the north, and the Tower stands at its end.
  const SQ_TOWER = [240, 2600];
  const SQUARE = (() => {
    const r = rng(41), out = [];
    const add = (b, roof, extra) => out.push(Object.assign({ b, roof, rh: 2.4 + r() * 2.2, wall: WALLS[Math.floor(r() * WALLS.length)], roofCol: ROOFC[Math.floor(r() * ROOFC.length)], seed: out.length + 50, lit: 0.45 + r() * 0.3, awn: r() < 0.6 ? (r() < 0.5 ? '#a84038' : '#3e6a7a') : null }, extra));
    // the north side, broken by the street to the Tower (x 5..11)
    for (let x = -46; x < 52;) { const w = 6 + r() * 4; if (x + w > 5 && x < 11) { x = 11; continue; } add([x, x + w, 0, 10 + r() * 5, 16, 23], 'x'); x += w; }
    // behind them, taller
    for (let x = -60; x < 70;) { const w = 7 + r() * 5; if (x + w > 4 && x < 12) { x = 12; continue; } add([x, x + w, 0, 15 + r() * 7, 28, 36], r() < 0.5 ? 'x' : 'z'); x += w + 0.5; }
    // the street's own houses, receding toward the Tower
    for (let z = 23; z < 160; z += 9 + r() * 3) { add([-1, 4.6, 0, 9 + r() * 5, z, z + 8], 'z', { awn: null }); add([12.4, 18, 0, 9 + r() * 5, z, z + 8], 'z', { awn: null }); }
    // west and east sides
    for (let z = -16; z < 16;) { const l = 6 + r() * 4; add([-44, -36, 0, 10 + r() * 5, z, Math.min(16, z + l)], 'z'); z += l; }
    for (let z = -16; z < 16;) { const l = 6 + r() * 4; add([40, 48, 0, 10 + r() * 5, z, Math.min(16, z + l)], 'z'); z += l; }
    // the south side, behind the lens in most shots
    for (let x = -46; x < 52;) { const w = 6 + r() * 4; add([x, x + w, 0, 10 + r() * 5, -26, -19], 'x'); x += w; }
    return out;
  })();
  function awning(v, h) {
    const [x0, x1, , , z0] = h.b, d = dist3(v, (x0 + x1) / 2, 2.6, z0);
    if (d > 50 || v.cam.z > z0) return;
    const C = hex(h.awn), n = 4;
    for (let i = 0; i < n; i++) {
      const a = x0 + 0.6 + ((x1 - x0 - 1.2) * i) / n, b = x0 + 0.6 + ((x1 - x0 - 1.2) * (i + 1)) / n;
      v.poly([[a, 3.1, z0 - 0.02], [a, 2.5, z0 - 1.2], [b, 2.5, z0 - 1.2], [b, 3.1, z0 - 0.02]], i % 2 ? shade([236, 222, 196], [0, 1, -1], d) : shade(C, [0, 1, -1], d), d < 25 ? INK : null);
    }
  }
  function lampPost(v, x, z, h, lit) {
    block(v, [x - 0.07, x + 0.07, 0, h, z - 0.07, z + 0.07], [30, 22, 26]);
    lantern(v, x, h + 0.25, z, lit);
    if (lit != null && lit > 0.01 && lit < 1) glow(v, x, 0.05, z, 4, '255,170,90', 0.28 * lit);
  }
  // the street to the Tower is lined with lamps; vars.lamps counts how many are lit (all, if unset)
  const STREET_LAMPS = []; for (let i = 0; i < 10; i++) STREET_LAMPS.push([i % 2 ? 10.6 : 5.4, 25 + i * 7]);
  // The rest of the city round the square, so that from above it is all roofs to the skyline:
  // real houses out to 150 m (DISTRICT), then a carpet of roof blocks out to 420 m (ROOFTOPS).
  const BUILT = (x, z) => x > -66 && x < 76 && z > -40 && z < 168; // the square and its street, built above
  const DISTRICT = (() => {
    const r = rng(53), out = [];
    for (let gx = -150; gx <= 166; gx += 13) for (let gz = -110; gz <= 190; gz += 15) {
      const x = gx + (r() - 0.5) * 3, z = gz + (r() - 0.5) * 3, d = Math.hypot(x - 8, z - 40);
      if (d > 150 || BUILT(x, z) || BUILT(x + 10, z + 12)) { r(); r(); r(); continue; }
      const w = 8 + r() * 3, l = 9 + r() * 4, kind = r();
      out.push({ b: [x, x + w, 0, 7 + r() * 6, z, z + l], roof: kind < 0.5 ? 'z' : kind < 0.85 ? 'x' : 'flat', rh: 2 + r() * 2, wall: WALLS[(out.length * 7) % WALLS.length], roofCol: ROOFC[(out.length * 3) % ROOFC.length], seed: out.length + 900, lit: 0.4 + r() * 0.3 });
    }
    return out;
  })();
  const ROOFTOPS = (() => {
    const r = rng(61), out = [];
    for (let gx = -420; gx <= 436; gx += 17) for (let gz = -380; gz <= 460; gz += 19) {
      const x = gx + (r() - 0.5) * 5, z = gz + (r() - 0.5) * 5, d = Math.hypot(x - 8, z - 40);
      if (d < 146 || d > 420) { r(); r(); continue; }
      out.push([x, z, 11 + r() * 4, 12 + r() * 5, 7 + r() * 8, (out.length * 5) % 4, r() < 0.45]);
    }
    return out;
  })();
  const ROOF_TOP = ['#6a3a3a', '#563a4c', '#70443a', '#4a4054'], ROOF_WALL = '#4a3446';
  function rooftops(v) {
    const { ctx, cam } = v, fy = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), walls = [], tops = [[], [], [], []], lit = [];
    if (cam.y < 18) return; // from the street the square's own houses hide them
    for (const R of ROOFTOPS) {
      const [x, z, w, l, h, k, on] = R, dx = x + w / 2 - cam.x, dz = z + l / 2 - cam.z, ahead = dx * fy + dz * fz, side = dx * fz - dz * fy;
      if (ahead < 8 || Math.abs(side) > ahead * 1.15 + 20) continue; // behind the lens, or outside the view
      walls.push([[x, 0, z], [x, h, z], [x + w, h, z], [x + w, 0, z]]);
      tops[k].push([[x, h, z], [x, h, z + l], [x + w, h, z + l], [x + w, h, z]]);
      if (on) lit.push([x + w * 0.5, h * 0.55, z - 0.1]);
    }
    ctx.beginPath(); for (const q of walls) v.addPoly(q); ctx.fillStyle = shade(hex(ROOF_WALL), [0, 0, -1], 260); ctx.fill();
    tops.forEach((list, k) => { ctx.beginPath(); for (const q of list) v.addPoly(q); ctx.fillStyle = shade(hex(ROOF_TOP[k]), [0, 1, 0], 260); ctx.fill(); });
    ctx.fillStyle = 'rgba(255,207,122,0.85)';
    for (const L of lit) { const q = v.project(L[0], L[1], L[2]); if (q) ctx.fillRect(q.x, q.y, 1.4, 1.4); }
  }
  const square = {
    grade: [255, 170, 120, 0.1],
    look: () => ({ ink: 1.6, shade: 0.1, shadeCol: '#2a1430' }),
    back(v) {
      setHaze([106, 74, 110]);
      sky(v, DUSK, -1.25);
      farWorld(v, 8, 40, { tower: SQ_TOWER, mid: false });
      v.poly([[-460, 0, -420], [-460, 0, 500], [480, 0, 500], [480, 0, -420]], shade([58, 42, 52], [0, 1, 0], 120)); // the streets between
      rooftops(v);
      // the cobbled plaza and the street
      v.poly([[-60, 0, -30], [-60, 0, 200], [70, 0, 200], [70, 0, -30]], shade([96, 72, 66], [0, 1, 0], 0));
      const { ctx } = v; ctx.strokeStyle = 'rgba(40,24,26,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let z = -14; z < 16; z += 0.8) { if (z < v.cam.z + 0.5) continue; const a = v.project(-36, 0, z), b = v.project(40, 0, z); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
      for (let x = -36; x <= 40; x += 1.6) { const a = v.project(x, 0, Math.max(-14, v.cam.z + 0.5)), b = v.project(x, 0, 16); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
      ctx.stroke();
      // warm pools of lamplight on the stones
      for (const [x, z] of [[-12, 2], [0, 2.5], [14, 2], [-20, 9], [22, 9], [8, 18], [8, 40]]) glow(v, x, 0.05, z, 4, '255,170,90', 0.28);
    },
    pieces(v) {
      const out = [];
      for (const h of SQUARE) {
        const B = h.b, c = v.toCam((B[0] + B[1]) / 2, B[3], (B[4] + B[5]) / 2);
        if (c[2] < -Math.max(B[1] - B[0], B[5] - B[4])) continue;
        out.push({ box: [B[0], B[1], 0, B[3] + h.rh, B[4], B[5]], f: () => { house(v, h); if (h.awn) awning(v, h); } });
      }
      for (const h of DISTRICT) {
        const B = h.b, c = v.toCam((B[0] + B[1]) / 2, B[3], (B[4] + B[5]) / 2);
        if (c[2] < -14 || Math.abs(c[0]) > c[2] * 1.15 + 18) continue; // behind the lens, or outside the view
        if (v.cam.y < 18 && !(Math.abs((B[0] + B[1]) / 2 - 8) < 16 && B[4] > 150)) continue; // hidden behind the square, but for the street's far end
        out.push({ box: [B[0], B[1], 0, B[3] + h.rh, B[4], B[5]], f: () => house(v, h) });
      }
      // the fountain
      out.push({ box: [1.8, 6.2, 0, 0.8, 4.8, 9.2], f: () => {
        block(v, [1.8, 6.2, 0, 0.8, 4.8, 9.2], [128, 118, 110], true);
        block(v, [3.6, 4.4, 0.8, 2.6, 6.6, 7.4], [138, 128, 118], true);
        block(v, [2.8, 5.2, 2.6, 2.9, 6.0, 8.0], [138, 128, 118], true);
        glow(v, 4, 2.4, 7, 1.8, '170,210,255', 0.22 + 0.1 * Math.sin(v.t * 6));
      } });
      // market stalls
      for (const [x, z, c] of [[-9, 5, '#a84038'], [13, 8, '#3e6a7a'], [-22, 11, '#7a5a2a']]) out.push({ box: [x - 2, x + 2, 0, 3, z - 1, z + 1], f: () => {
        block(v, [x - 2, x + 2, 0, 1, z - 0.8, z + 0.8], [96, 62, 40], true);
        block(v, [x - 1.95, x - 1.8, 1, 2.6, z - 0.75, z - 0.6], [58, 36, 24]);
        block(v, [x + 1.8, x + 1.95, 1, 2.6, z - 0.75, z - 0.6], [58, 36, 24]);
        const d = dist3(v, x, 2.6, z);
        for (let i = 0; i < 6; i++) v.poly([[x - 2.3 + i * 0.77, 2.5, z - 1.2], [x - 2.3 + i * 0.77, 3.0, z + 0.4], [x - 1.53 + i * 0.77, 3.0, z + 0.4], [x - 1.53 + i * 0.77, 2.5, z - 1.2]], i % 2 ? shade([236, 222, 196], [0, 1, -1], d) : shade(hex(c), [0, 1, -1], d), INK);
      } });
      for (const [x, z] of [[-12, 2], [0, 2.5], [14, 2], [-20, 9], [22, 9], [8, 17], [-5.5, -2.2]]) out.push({ p: [x, 0, z], on: false, f: () => lampPost(v, x, z, 3.2) });
      const N = v.vars.lamps;
      STREET_LAMPS.forEach(([x, z], i) => out.push({ p: [x, 0, z], on: false, f: () => lampPost(v, x, z, 3.2, N == null ? 1 : N - i) }));
      return out;
    },
    front(v) {
      // strings of lanterns across the square
      const { ctx } = v;
      for (const [a, b, s] of [[[-36, 7, 3], [40, 7.5, 6], 1], [[-36, 6.5, 12], [40, 7, 13], 2]]) {
        let prev = null;
        for (let i = 0; i <= 40; i++) {
          const k = i / 40, x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k - Math.sin(k * Math.PI) * 1.4, z = a[2] + (b[2] - a[2]) * k;
          const p = v.project(x, y, z);
          if (p && prev) { ctx.strokeStyle = 'rgba(30,20,24,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
          if (p && i % 2 === 0) { const r = Math.max(1, 0.12 * p.s); ctx.fillStyle = (i + s) % 3 ? '#ffcf7a' : '#ff9a6a'; ctx.beginPath(); ctx.arc(p.x, p.y + r, r, 0, Math.PI * 2); ctx.fill(); }
          prev = p;
        }
      }
    },
  };

  window.TowCinemaSets = Object.assign(window.TowCinemaSets || {}, { square, roofs, RUN, EDGE });
  // the kit, for the other places (js/cinema/ashgate.js ...)
  window.TowCinemaKit = { INK, rng, wrap, hex, shade, shadeA, setHaze, wallFill, sky, ceiling, tower, farWorld, ridge, glow, dist3, house, block, chimney, lantern, WALLS, ROOFC, tinted, sprite3, smoke };
})();
