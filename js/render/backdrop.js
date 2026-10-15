/*
 * Tower of Wishes — painted, animated full-screen backdrops for the story's
 * dialogue scenes.
 *
 *   const bd = TowRender.backdrop.create(canvas);
 *   bd.draw(bg, t);   // bg: one of TowRender.backdrop.NAMES, t: seconds since the scene began
 *
 * draw() paints the whole canvas in device pixels. Everything static is baked
 * once per (bg, size) into offscreen canvases; each frame only blits those and
 * draws the light, moving parts (drifting cloud bands, flicker, embers, the
 * reset's fire and the failing formation). Layout randomness is seeded, so a
 * scene always looks the same.
 *
 * Look (docs/ART_DIRECTION.md): dark manhwa establishing panels. Ink-black
 * silhouettes with a bone/rose rim, hard cel bands instead of soft shading,
 * screentone dots, speed lines on the big moments, strong vignette. Red and
 * violet are kept for meaning (fire / Eiryn's magic). The HTML text box covers
 * the bottom ~35%, so each composition keeps its focus in the upper middle.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});

  const TAU = Math.PI * 2;
  const P = {
    ink: '#0c0808', night: '#161212', charcoal: '#1d1718', slate: '#2d292b', ash: '#3d3337',
    dusk: '#4f4449', mauve: '#6e5353', rose: '#997d7b', bone: '#edcac0', white: '#f6f0ec',
    crimson: '#8e1621', blood: '#43171b', glow: '#e3263a', glyph: '#a98bff',
  };

  // ------------------------------------------------------------------ helpers
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const easeIn = (k) => k * k;
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
    if (!v) {
      const n = parseInt(hex.slice(1), 16);
      v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      RGB.set(hex, v);
    }
    return v;
  }
  function mix(a, b, k) {
    const A = rgb(a), B = rgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
  }
  function mixHex(a, b, k) {
    const A = rgb(a), B = rgb(b);
    const h = (i) => Math.round(lerp(A[i], B[i], k)).toString(16).padStart(2, '0');
    return '#' + h(0) + h(1) + h(2);
  }
  function rgba(hex, a) { const v = rgb(hex); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; }
  function lin(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }
  function rad(ctx, x, y, r0, r1, stops) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
  }
  function poly(ctx, pts, close = true) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
  }

  // Soft round light sprite (cached by colour); drawn scaled, usually 'lighter'.
  const glowCache = new Map();
  function glow(color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = mk(128, 128);
    const x = c.getContext('2d');
    x.fillStyle = rad(x, 64, 64, 0, 64, [[0, rgba(color, 1)], [0.18, rgba(color, 0.62)], [0.45, rgba(color, 0.2)], [0.75, rgba(color, 0.05)], [1, rgba(color, 0)]]);
    x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
    return c;
  }
  function blob(ctx, spr, x, y, rx, ry) { ctx.drawImage(spr, x - rx, y - (ry || rx), rx * 2, (ry || rx) * 2); }

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

  // Manga focus lines: thin wedges pointing at (cx, cy).
  function speedLines(ctx, rng, cx, cy, r0, r1, n, color, wMax, sy = 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, ww = wMax * (0.15 + rng()), rr = r0 * (0.75 + rng() * 0.7);
      const ca = Math.cos(a), sa = Math.sin(a) * sy;
      ctx.moveTo(cx + ca * rr, cy + sa * rr);
      ctx.lineTo(cx + ca * r1 - sa * ww, cy + sa * r1 + ca * ww);
      ctx.lineTo(cx + ca * r1 + sa * ww, cy + sa * r1 - ca * ww);
      ctx.closePath();
    }
    ctx.fill();
  }

  // Film grain, baked into static layers.
  let grainC = null;
  function grain(ctx, w, h, a) {
    if (!grainC) {
      grainC = mk(160, 160);
      const g = grainC.getContext('2d'), r = mulberry(99);
      for (let i = 0; i < 2600; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.9)' : 'rgba(255,240,230,0.7)';
        g.fillRect(Math.floor(r() * 160), Math.floor(r() * 160), 1 + (r() < 0.2), 1);
      }
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = ctx.createPattern(grainC, 'repeat');
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // ------------------------------------------------------------ cloud ceiling
  // The permanent cloud ceiling seen from below: rows of hanging lobes, far rows
  // small and low near the horizon, near rows huge at the top. Each row is
  // three hard cel bands: lit crescent at the bottom of each lobe, mid, dark.
  function scallopPts(rng, W, bw, bh, x0) {
    const pts = [];
    let x = 0;
    while (x < W) {
      const ww = bw * (0.4 + rng() * 1.3);
      const big = rng() < 0.22 ? 2.1 + rng() : 1;
      pts.push([x, ww, bh * (0.2 + rng() * 1.0) * big, (rng() - 0.5) * bh * 0.6]);
      x += ww;
    }
    const k = W / x; // stretch so the row tiles exactly over W
    // A slow swell along the row (whole cycles over W, so tiles stay seamless)
    // keeps the rows from reading as parallel stripes.
    const cyc = Math.max(1, Math.round(W / (bw * (4 + rng() * 4)))), ph = rng() * TAU, amp = bh * (0.5 + rng() * 0.7);
    const cyc2 = cyc * 2 + 1, ph2 = rng() * TAU;
    for (const p of pts) {
      p[0] *= k;
      p[1] *= k;
      p[3] += Math.sin((p[0] / W) * cyc * TAU + ph) * amp + Math.sin((p[0] / W) * cyc2 * TAU + ph2) * amp * 0.35;
      p[0] += x0;
    }
    return pts;
  }
  // Hanging (dir 1) or rising (dir -1, cloud tops) scalloped band, filled toward `edge`.
  function scallop(ctx, r, dy, dk, dx) {
    const p = r.pts, n = p.length, dir = r.dir || 1;
    ctx.moveTo(p[0][0] + dx, r.edge);
    ctx.lineTo(p[0][0] + dx, r.y + p[0][3] + dy);
    for (let i = 0; i < n; i++) {
      const [x, ww, d, j] = p[i];
      const y0 = r.y + j + dy, y1 = r.y + p[(i + 1) % n][3] + dy, dd = d * dk * 1.33 * dir;
      ctx.bezierCurveTo(x + dx + ww * 0.04, y0 + dd, x + dx + ww * 0.96, y1 + dd, x + dx + ww, y1);
    }
    ctx.lineTo(p[n - 1][0] + p[n - 1][1] + dx, r.edge);
    ctx.closePath();
  }
  function makeRows(rng, w, h, u, o) {
    const rows = [];
    for (let i = 0; i < o.n; i++) {
      const k = o.n > 1 ? i / (o.n - 1) : 1;
      const y = lerp(o.yHor, o.yTop, Math.pow(k, o.pow || 1.5));
      const kk = Math.pow(k, o.sizePow || 2);
      const bw = u * lerp(o.bw[0], o.bw[1], kk), bh = u * lerp(o.bh[0], o.bh[1], kk);
      const tile = i >= o.n - (o.nearN || 0);
      const W = tile ? w : w + bw * 4;
      const hz = o.haze ? Math.pow(1 - k, 2) * 0.55 : 0;
      const hm = (c) => (hz ? mixHex(c, o.haze, hz) : c);
      rows.push({
        k, y, bh, tile, W, dir: o.dir || 1, sunX: tile ? null : o.sunX, sunW: o.sunW || w * 0.5,
        pts: scallopPts(rng, W, bw, bh, tile ? 0 : -bw * 2),
        edge: (o.dir || 1) > 0 ? -h * 0.2 : h * 1.2,
        r1: bh * 0.3 + u * 0.0025, r2: bh * 0.75 + u * 0.006,
        lit: hm(mixHex(o.far.lit, o.near.lit, k)), mid: hm(mixHex(o.far.mid, o.near.mid, k)), dark: hm(mixHex(o.far.dark, o.near.dark, k)),
      });
    }
    return rows;
  }
  function paintRow(ctx, r, cols) {
    const offs = r.tile ? [-r.W, 0, r.W] : [0];
    const c = cols ? cols(r) : r;
    const s = r.dir || 1;
    let lit = c.lit;
    if (r.sunX != null) {
      // the lit rim is brightest under the sun and dulls away from it
      const W = ctx.canvas.width, dull = mixHex(c.lit, c.mid, 0.7);
      lit = lin(ctx, 0, 0, W, 0, [[0, dull], [clamp((r.sunX - r.sunW) / W, 0, 1), dull], [clamp(r.sunX / W, 0, 1), c.lit], [clamp((r.sunX + r.sunW) / W, 0, 1), dull], [1, dull]]);
    }
    const bands = [[lit, 0, 1], [c.mid, -r.r1 * s, 0.85], [c.dark, -r.r2 * s, 0.55]];
    for (const [col, dy, dk] of bands) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (const dx of offs) scallop(ctx, r, dy, dk, dx);
      ctx.fill();
    }
  }

  // ------------------------------------------------------------- silhouettes
  // A roofline: gables, flat tops, steep hips and the odd spire.
  function skyline(rng, x0, x1, base, u, o) {
    const pts = [[x0, base]], chims = [], lights = [];
    let x = x0;
    while (x < x1) {
      const bw = u * o.bw * (0.55 + rng() * 0.9), bh = u * o.bh * (0.45 + rng() * 0.75), top = base - bh;
      const ty = rng();
      if (ty < 0.55) {
        const pitch = bw * (0.28 + rng() * 0.32);
        pts.push([x, top], [x - bw * 0.04, top], [x + bw / 2, top - pitch], [x + bw * 1.04, top], [x + bw, top]);
        if (rng() < 0.55) chims.push([x + bw * (0.18 + rng() * 0.5), top - pitch * 0.85, bw * 0.1, pitch * 0.8]);
      } else if (ty < 0.78) {
        pts.push([x, top], [x, top - u * 0.004], [x + bw, top - u * 0.004], [x + bw, top]);
      } else if (ty < 0.93 || !o.spires) {
        pts.push([x, top], [x + bw * 0.22, top - bw * 0.42], [x + bw * 0.78, top - bw * 0.42], [x + bw, top]);
      } else {
        const sp = bh * 0.9;
        pts.push([x, top], [x + bw * 0.3, top], [x + bw * 0.3, top - sp], [x + bw * 0.5, top - sp - bw * 0.9], [x + bw * 0.7, top - sp], [x + bw * 0.7, top], [x + bw, top]);
      }
      const nl = o.lights ? Math.floor(rng() * o.lights + 0.3) : 0;
      for (let i = 0; i < nl; i++) lights.push([x + bw * (0.15 + rng() * 0.7), top + bh * (0.15 + rng() * 0.6), rng()]);
      x += bw;
    }
    pts.push([x, base]);
    return { pts, chims, lights };
  }
  function fillSkyline(ctx, sk, bottom, color, rim, rdx, rdy) {
    const path = (dx, dy) => {
      ctx.beginPath();
      ctx.moveTo(sk.pts[0][0] + dx, bottom);
      for (const p of sk.pts) ctx.lineTo(p[0] + dx, p[1] + dy);
      ctx.lineTo(sk.pts[sk.pts.length - 1][0] + dx, bottom);
      ctx.closePath();
      for (const c of sk.chims) ctx.rect(c[0] + dx, c[1] + dy, c[2], c[3]);
      ctx.fill();
    };
    if (rim) { ctx.fillStyle = rim; path(0, 0); }
    ctx.fillStyle = color;
    path(rim ? rdx : 0, rim ? rdy : 0);
  }
  // A filled ridge with a sum-of-sines top; returns the height function.
  function ridge(rng, w, y, amp, n) {
    const waves = [];
    for (let i = 0; i < n; i++) waves.push([(0.6 + rng() * 2.5) * (i + 1) * TAU / w, rng() * TAU, amp / (i + 1)]);
    return (x) => { let v = y; for (const [f, p, a] of waves) v += Math.sin(x * f + p) * a; return v; };
  }
  function fillRidge(ctx, fn, w, bottom, color, step) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-2, bottom);
    for (let x = -2; x <= w + step; x += step) ctx.lineTo(x, fn(x));
    ctx.lineTo(w + step, bottom);
    ctx.closePath();
    ctx.fill();
  }
  // Conifer treeline (ink) with a rim on the upper-left edges: drooping tiers.
  function conifers(ctx, rng, x0, x1, base, u, hMin, hMax, bottom, color, rim, rdx, rdy) {
    const trees = [];
    let x = x0;
    while (x < x1) {
      const tall = rng() < 0.2 ? 1.25 : 1;
      const th = u * lerp(hMin, hMax, rng() * rng() * 0.6 + rng() * 0.4) * tall, tw = th * (0.34 + rng() * 0.14);
      const T = 5 + Math.floor(rng() * 3), jit = [];
      for (let i = 0; i < T; i++) jit.push([0.85 + rng() * 0.3, 0.85 + rng() * 0.3]);
      trees.push([x, base + rng() * u * 0.03, th, tw, T, jit]);
      x += tw * (0.3 + rng() * 0.45);
    }
    const path = (dx, dy) => {
      ctx.beginPath();
      ctx.rect(x0 - 10 + dx, base + dy, x1 - x0 + 20, bottom - base);
      for (const [cx, b, th, tw, T, jit] of trees) {
        const L = [], R = [], tierH = (th * 0.92) / T;
        for (let i = 0; i < T; i++) {
          const y = b - th * 0.08 - tierH * i, wi = (tw / 2) * Math.pow(1 - i / T, 0.9);
          // each tier: a skirt of branches drooping to a tip, notch back in above it
          L.push([cx - wi * jit[i][0], y + tierH * 0.12], [cx - wi * 0.3, y - tierH * 0.75]);
          R.unshift([cx + wi * 0.3, y - tierH * 0.75], [cx + wi * jit[i][1], y + tierH * 0.12]);
        }
        const pts = [[cx - tw * 0.05, b + u * 0.03], ...L, [cx, b - th], ...R, [cx + tw * 0.05, b + u * 0.03]];
        ctx.moveTo(pts[0][0] + dx, pts[0][1] + dy);
        for (const p of pts) ctx.lineTo(p[0] + dx, p[1] + dy);
        ctx.closePath();
      }
      ctx.fill();
    };
    if (rim) { ctx.fillStyle = rim; path(0, 0); }
    ctx.fillStyle = color;
    path(rim ? rdx : 0, rim ? rdy : 0);
  }
  // Round-canopied tree silhouette (deciduous): trunk + lobed crown.
  function broadTree(ctx, rng, x, base, th, color) {
    const tw = th * 0.07;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - tw, base);
    ctx.lineTo(x - tw * 0.5, base - th * 0.55);
    ctx.lineTo(x + tw * 0.5, base - th * 0.55);
    ctx.lineTo(x + tw, base);
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * (0.05 + 0.9 * rng()), rr = th * (0.18 + rng() * 0.14);
      const cx = x + Math.cos(a) * th * 0.25, cy = base - th * 0.68 + Math.sin(a) * th * 0.18;
      ctx.moveTo(cx + rr, cy);
      ctx.arc(cx, cy, rr, 0, TAU);
    }
    ctx.fill();
  }

  // Pinhole camera for the street and interior scenes: metres -> pixels.
  function camera(w, h, cx, cy, f, eye) {
    const F = f * h, CX = cx * w, CY = cy * h;
    return (X, Y, Z) => [CX + (X * F) / Z, CY + ((eye - Y) * F) / Z];
  }
  function quad3(ctx, Pj, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => { const q = Pj(p[0], p[1], p[2]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
    ctx.closePath();
  }

  // The Guild's sign: a sword crossed with a staff, scales beneath.
  function emblem(ctx, cx, cy, r, color, lw) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    // sword (blade up-right)
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(-lw * 0.9, -r * 0.2);
    ctx.lineTo(0, -r * 0.95);
    ctx.lineTo(lw * 0.9, -r * 0.2);
    ctx.lineTo(lw * 0.9, r * 0.32);
    ctx.lineTo(-lw * 0.9, r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * 0.32);
    ctx.lineTo(r * 0.22, r * 0.32);
    ctx.moveTo(0, r * 0.32);
    ctx.lineTo(0, r * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, r * 0.6, lw * 0.9, 0, TAU);
    ctx.fill();
    ctx.restore();
    // staff (head up-left)
    ctx.save();
    ctx.rotate(-Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.lineTo(0, r * 0.62);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.82, r * 0.11, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.82, r * 0.04, 0, TAU);
    ctx.fill();
    ctx.restore();
    // scales beneath
    const sy = r * 0.78;
    ctx.beginPath();
    ctx.moveTo(0, sy - r * 0.14);
    ctx.lineTo(0, sy + r * 0.26);
    ctx.moveTo(-r * 0.12, sy + r * 0.26);
    ctx.lineTo(r * 0.12, sy + r * 0.26);
    ctx.moveTo(-r * 0.42, sy);
    ctx.lineTo(r * 0.42, sy);
    for (const s of [-1, 1]) {
      ctx.moveTo(s * r * 0.42, sy);
      ctx.lineTo(s * r * 0.3, sy + r * 0.18);
      ctx.moveTo(s * r * 0.42, sy);
      ctx.lineTo(s * r * 0.54, sy + r * 0.18);
    }
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * r * 0.28, sy + r * 0.18);
      ctx.quadraticCurveTo(s * r * 0.42, sy + r * 0.3, s * r * 0.56, sy + r * 0.18);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Deterministic drifting particles: positions are a pure function of t.
  function makeMotes(rng, n, o) {
    const m = [];
    for (let i = 0; i < n; i++) m.push({ x: rng(), y: rng(), v: lerp(o.v[0], o.v[1], rng()), sw: rng() * TAU, sf: 0.3 + rng() * 0.9, r: lerp(o.r[0], o.r[1], rng()), a: 0.4 + rng() * 0.6, c: rng() });
    return m;
  }
  // Motes inside a box (x0,y0)-(x1,y1); v is vertical speed in box-heights/s (negative rises).
  function drawMotes(ctx, m, t, x0, y0, x1, y1, u, colors, alpha, sway) {
    const H = y1 - y0, W = x1 - x0;
    for (const p of m) {
      let yy = (p.y + p.v * t) % 1;
      if (yy < 0) yy += 1;
      const x = x0 + ((p.x * W + Math.sin(t * p.sf + p.sw) * u * (sway || 0.02)) % W + W) % W;
      const y = y0 + yy * H;
      const edge = Math.min(yy, 1 - yy) * 8;
      ctx.globalAlpha = alpha * p.a * Math.min(1, edge) * (0.65 + 0.35 * Math.sin(t * 3 * p.sf + p.sw * 3));
      ctx.fillStyle = colors[Math.floor(p.c * colors.length)];
      const r = p.r * u;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  // Shared vignette + bottom shade for the text box (per size).
  const vigCache = new Map();
  function vignette(w, h) {
    const key = w + 'x' + h;
    let c = vigCache.get(key);
    if (c) return c;
    if (vigCache.size > 3) vigCache.clear();
    c = mk(w, h);
    const x = c.getContext('2d'), M = Math.max(w, h);
    x.fillStyle = rad(x, w * 0.5, h * 0.4, M * 0.28, M * 0.72, [[0, 'rgba(12,8,8,0)'], [0.6, 'rgba(12,8,8,0.38)'], [1, 'rgba(8,5,5,0.92)']]);
    x.fillRect(0, 0, w, h);
    x.fillStyle = lin(x, 0, h * 0.55, 0, h, [[0, 'rgba(8,5,5,0)'], [0.6, 'rgba(8,5,5,0.32)'], [1, 'rgba(8,5,5,0.66)']]);
    x.fillRect(0, h * 0.55, w, h * 0.45);
    // thin ink frame, like a panel border
    x.strokeStyle = 'rgba(8,5,5,0.9)';
    x.lineWidth = Math.min(w, h) * 0.008;
    x.strokeRect(0, 0, w, h);
    vigCache.set(key, c);
    return c;
  }

  // ======================================================== TOWER (and RESET)
  // Dusk over a city: the ceiling lit gold and rose from beneath, the
  // impossibly narrow Tower rising into it far away, rooftops below.
  function buildCity(w, h) {
    const u = Math.min(w, h), rng = mulberry(11);
    const hy = h * 0.6;
    const S = { w, h, u, hy };
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, h, [[0, '#0e090b'], [0.2, '#24121a'], [0.36, '#4a2228'], [0.47, '#94503e'], [0.54, '#e8a46c'], [0.595, '#ffe4b4'], [0.63, '#d48562'], [0.72, '#4a2124'], [1, '#120a0b']]);
    a.fillRect(0, 0, w, h);
    const sunX = (S.sunX = w * 0.3);
    a.globalCompositeOperation = 'lighter';
    a.globalAlpha = 0.5;
    blob(a, glow('#ff8a50'), sunX, hy, w * 0.6, h * 0.32);
    a.globalAlpha = 0.85;
    blob(a, glow('#ffe2a8'), sunX, hy, u * 0.3, u * 0.12);
    a.globalCompositeOperation = 'source-over';
    a.globalAlpha = 1;
    a.fillStyle = '#fff6e2';
    a.beginPath();
    a.arc(sunX, hy + u * 0.006, u * 0.03, Math.PI, 0);
    a.fill();

    const rows = (S.rows = makeRows(rng, w, h, u, {
      yHor: hy - h * 0.065, yTop: -h * 0.03, n: 9, nearN: 3, pow: 1.5, bw: [0.05, 0.6], bh: [0.006, 0.08],
      sunX: w * 0.3, sunW: w * 0.55, haze: '#e8a07a',
      far: { lit: '#fff0c4', mid: '#f0a476', dark: '#b8604e' }, near: { lit: '#e08a6a', mid: '#5c2c2e', dark: '#1c0e11' },
    }));
    const towerTop = h * 0.4;
    let split = rows.findIndex((r) => r.y < towerTop);
    if (split < 0) split = rows.length;
    const nStatic = rows.length - 3;
    // The Tower: too narrow to be real, rising out of sight.
    const tx = (S.tx = w * 0.655);
    const tower = (ctx, col, rim) => {
      const b = hy + h * 0.004, wb = u * 0.0105, wt = u * 0.0045;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(tx - wb, b);
      ctx.lineTo(tx - wt, -h * 0.1);
      ctx.lineTo(tx + wt, -h * 0.1);
      ctx.lineTo(tx + wb, b);
      ctx.closePath();
      ctx.fill();
      if (rim) {
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.moveTo(tx - wb, b);
        ctx.lineTo(tx - wt, -h * 0.1);
        ctx.lineTo(tx - wt + u * 0.0018, -h * 0.1);
        ctx.lineTo(tx - wb + u * 0.003, b);
        ctx.closePath();
        ctx.fill();
      }
    };
    S.tower = tower;
    S.split = split;
    for (let i = 0; i < split; i++) paintRow(a, rows[i]);
    tower(a, '#2a181d', 'rgba(255,214,160,0.75)');
    for (let i = split; i < nStatic; i++) paintRow(a, rows[i]);
    // horizon haze
    a.fillStyle = lin(a, 0, hy - h * 0.09, 0, hy + h * 0.03, [[0, 'rgba(255,214,160,0)'], [0.7, 'rgba(255,214,160,0.22)'], [1, 'rgba(255,214,160,0)']]);
    a.fillRect(0, hy - h * 0.09, w, h * 0.12);
    // far city
    const far = skyline(rng, -u * 0.05, w + u * 0.05, hy + h * 0.012, u, { bw: 0.035, bh: 0.03, spires: true });
    fillSkyline(a, far, h, '#3e2228', '#c27258', u * 0.002, u * 0.002);
    a.fillStyle = lin(a, 0, hy, 0, hy + h * 0.12, [[0, 'rgba(240,150,110,0.25)'], [1, 'rgba(60,24,28,0.9)']]);
    a.fillRect(0, hy - h * 0.02, w, h * 0.14);
    // screentone on the dark upper sky / clouds
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, hy, u * 0.009, 'rgba(10,5,6,0.5)', (x, y) => sstep(0.42, 0, y / h) * 0.8 - 0.2);
    a.globalCompositeOperation = 'source-over';
    grain(a, w, h, 0.07);
    S.A = A;

    // Near ceiling rows: tileable band that drifts.
    const N = mk(w, h), n = N.getContext('2d');
    for (let i = nStatic; i < rows.length; i++) paintRow(n, rows[i]);
    n.globalCompositeOperation = 'source-atop';
    tone(n, 0, 0, w, h * 0.4, u * 0.009, 'rgba(10,5,6,0.6)', (x, y) => 0.75 - y / (h * 0.3));
    S.N = N;

    // Mid row and front row of the city (transparent canvas, drawn over effects).
    const C = mk(w, h), c = C.getContext('2d');
    const mid = skyline(rng, -u * 0.05, w + u * 0.05, h * 0.8, u, { bw: 0.07, bh: 0.1, lights: 2, spires: true });
    fillSkyline(c, mid, h, '#22141a', '#d88a64', u * 0.003, u * 0.003);
    const front = skyline(rng, -u * 0.1, w + u * 0.1, h * 1.02, u, { bw: 0.13, bh: 0.24, lights: 2 });
    fillSkyline(c, front, h, P.ink, '#e8a070', u * 0.0045, u * 0.004);
    c.globalCompositeOperation = 'source-atop';
    tone(c, 0, h * 0.6, w, h, u * 0.008, 'rgba(120,60,50,0.35)', (x, y) => 0.5 - (y - h * 0.7) / (h * 0.3));
    c.globalCompositeOperation = 'source-over';
    // dim baked windows
    S.lights = [];
    for (const [lx, ly, r] of mid.lights.concat(front.lights)) {
      if (ly > h * 0.98) continue;
      c.fillStyle = '#5a2a1c';
      c.fillRect(lx - u * 0.004, ly - u * 0.005, u * 0.008, u * 0.01);
      S.lights.push([lx, ly, r]);
    }
    S.C = C;
    // Buildings that will fall during the reset (standing in the tower scene).
    S.houses = [];
    const hr = mulberry(31);
    for (const [fx, t0] of [[0.13, 5.1], [0.36, 6.3], [0.55, 7.4], [0.8, 8.3], [0.93, 9.3]]) {
      const bw = u * (0.07 + hr() * 0.05), bh = u * (0.17 + hr() * 0.09), pitch = bw * 0.55;
      const pad = u * 0.01, cv = mk(bw + pad * 2, bh + pitch + pad * 2), x = cv.getContext('2d');
      const shape = (dx, dy) => {
        x.beginPath();
        x.moveTo(pad + dx, pad + pitch + bh + dy);
        x.lineTo(pad + dx, pad + pitch + dy);
        x.lineTo(pad + bw / 2 + dx, pad + dy);
        x.lineTo(pad + bw + dx, pad + pitch + dy);
        x.lineTo(pad + bw + dx, pad + pitch + bh + dy);
        x.closePath();
        x.rect(pad + bw * 0.68 + dx, pad + pitch * 0.15 + dy, bw * 0.12, pitch * 0.7);
        x.fill();
      };
      x.fillStyle = '#e09068';
      shape(0, 0);
      x.fillStyle = '#1a1014';
      shape(u * 0.003, u * 0.003);
      x.fillStyle = '#5a2a1c';
      for (let i = 0; i < 3; i++) x.fillRect(pad + bw * (0.2 + i * 0.25), pad + pitch + bh * 0.2, bw * 0.1, bh * 0.12);
      S.houses.push({ cv, x: w * fx, base: h * 0.81, bw, pad, t0, dir: hr() < 0.5 ? -1 : 1, bh: bh + pitch });
    }
    S.lanternGlow = glow('#ffbf70');
    return S;
  }
  function drawHouses(ctx, S, t, reset) {
    for (const hs of S.houses) {
      const p = reset ? easeIn(sstep(hs.t0, hs.t0 + 1.8, t)) : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, S.w, hs.base);
      ctx.clip();
      ctx.translate(hs.x + (hs.dir > 0 ? hs.bw : 0), hs.base + p * hs.bh * 0.75);
      ctx.rotate(hs.dir * p * 0.55);
      ctx.drawImage(hs.cv, -(hs.dir > 0 ? hs.bw : 0) - hs.pad, -hs.cv.height + hs.pad);
      ctx.restore();
    }
  }
  function drawLanterns(ctx, S, t, k) {
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of S.lights) {
      const f = 0.65 + 0.25 * Math.sin(t * (2 + r * 3) + r * 40) + 0.1 * Math.sin(t * 13 + r * 90);
      ctx.globalAlpha = f * k;
      blob(ctx, S.lanternGlow, x, y, S.u * 0.022);
      ctx.fillStyle = '#ffe0a8';
      ctx.fillRect(x - S.u * 0.0035, y - S.u * 0.0045, S.u * 0.007, S.u * 0.009);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawTower(ctx, S, t) {
    const { w, u } = S;
    ctx.drawImage(S.A, 0, 0);
    // a slow breathing of the sunlight under the ceiling
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 0.7);
    blob(ctx, glow('#ffb070'), S.sunX, S.hy - S.h * 0.05, w * 0.4, S.h * 0.14);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const off = (t * u * 0.012) % w;
    ctx.drawImage(S.N, -off, 0);
    ctx.drawImage(S.N, w - off, 0);
    drawHouses(ctx, S, t, false);
    ctx.drawImage(S.C, 0, 0);
    drawLanterns(ctx, S, t, 1);
    // birds wheeling far off, near the Tower
    ctx.strokeStyle = 'rgba(20,10,12,0.85)';
    ctx.lineWidth = u * 0.0025;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const bx = S.tx + Math.sin(t * 0.25 + i * 1.7) * u * (0.08 + i * 0.03) - u * 0.12, by = S.hy - S.h * (0.2 + 0.03 * i) + Math.cos(t * 0.3 + i) * u * 0.015;
      const fl = Math.sin(t * 6 + i * 2) * u * 0.006, s = u * 0.009;
      ctx.moveTo(bx - s, by - fl);
      ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.2, bx, by + s * 0.15);
      ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.2, bx + s, by - fl);
    }
    ctx.stroke();
  }

  // ------------------------------------------------------------------- RESET
  function buildReset(w, h) {
    const S = buildCity(w, h);
    const { u, rows } = S;
    const rng = mulberry(77);
    const fireCols = (r) => ({
      lit: mixHex('#ffe0a0', '#ff7a30', r.k), mid: mixHex('#c8401e', '#5a1418', r.k), dark: mixHex('#5a1418', '#16060a', r.k),
    });
    const nStatic = rows.length - 3;
    const AB = mk(w, h), ab = AB.getContext('2d');
    for (let i = 0; i < S.split; i++) paintRow(ab, rows[i], fireCols);
    ab.globalCompositeOperation = 'destination-out';
    S.tower(ab, '#000', null);
    ab.globalCompositeOperation = 'source-over';
    for (let i = S.split; i < nStatic; i++) paintRow(ab, rows[i], fireCols);
    ab.globalCompositeOperation = 'source-atop';
    tone(ab, 0, 0, w, S.hy, u * 0.009, 'rgba(60,8,10,0.6)', (x, y) => 0.8 - y / (S.hy * 0.9));
    S.AB = AB;
    const NB = mk(w, h), nb = NB.getContext('2d');
    for (let i = nStatic; i < rows.length; i++) paintRow(nb, rows[i], fireCols);
    nb.globalCompositeOperation = 'source-atop';
    tone(nb, 0, 0, w, h * 0.4, u * 0.009, 'rgba(40,4,8,0.7)', (x, y) => 0.8 - y / (h * 0.3));
    S.NB = NB;

    // The tear: jagged edges along the straight line.
    S.ty = h * 0.25;
    S.jagT = [];
    S.jagB = [];
    // ragged edges: smoothed noise plus the odd sharp spike
    const jag = () => {
      let a = [];
      for (let i = 0; i <= 120; i++) a.push(rng());
      for (let pass = 0; pass < 2; pass++) a = a.map((v, i) => (a[Math.max(0, i - 1)] + v * 2 + a[Math.min(a.length - 1, i + 1)]) / 4);
      return a.map((v) => v * 0.8 + (rng() < 0.12 ? 0.6 * rng() : 0));
    };
    S.jagT = jag();
    S.jagB = jag();
    // Focus lines around the tear.
    const SL = mk(w, h), sl = SL.getContext('2d');
    speedLines(sl, rng, w * 0.5, S.ty, Math.max(w, h) * 0.22, Math.max(w, h) * 0.9, 150, 'rgba(255,240,225,0.9)', u * 0.006, 0.6);
    speedLines(sl, rng, w * 0.5, S.ty, Math.max(w, h) * 0.3, Math.max(w, h) * 0.9, 90, 'rgba(10,4,6,0.9)', u * 0.008, 0.6);
    S.SL = SL;

    // Fire texture: vertical streaks, tileable top to bottom, soft sides.
    const FT = mk(64, 512), ft = FT.getContext('2d');
    const cols = ['#fffaf0', '#ffe6a8', '#ffb868', '#ff7a36', '#e3263a'];
    for (let i = 0; i < 220; i++) {
      const cx = 64 * (0.05 + 0.9 * rng()), lw = 1 + rng() * rng() * 9, y0 = rng() * 512, len = 512 * (0.08 + rng() * 0.5);
      const cen = 1 - Math.abs(cx / 64 - 0.5) * 2;
      ft.fillStyle = cols[Math.min(4, Math.floor((1 - cen) * 3 + rng() * 2))];
      ft.globalAlpha = 0.2 + 0.7 * rng() * (0.4 + cen * 0.6);
      ft.fillRect(cx - lw / 2, y0, lw, len);
      if (y0 + len > 512) ft.fillRect(cx - lw / 2, y0 - 512, lw, len);
    }
    ft.globalAlpha = 1;
    ft.globalCompositeOperation = 'destination-in';
    ft.fillStyle = lin(ft, 0, 0, 64, 0, [[0, 'rgba(0,0,0,0)'], [0.18, 'rgba(0,0,0,0.85)'], [0.5, '#000'], [0.82, 'rgba(0,0,0,0.85)'], [1, 'rgba(0,0,0,0)']]);
    ft.fillRect(0, 0, 64, 512);
    S.FT = FT;
    // Columns of fire: x, width, start time, ground y.
    S.cols = [];
    const xs = [0.47, 0.27, 0.66, 0.12, 0.84, 0.38, 0.57, 0.2, 0.75, 0.94, 0.05, 0.31];
    xs.slice(0, 9).forEach((fx, i) => {
      S.cols.push({ x: w * (fx + (rng() - 0.5) * 0.03), cw: u * (i === 0 ? 0.13 : 0.04 + rng() * 0.08), t0: 3.9 + i * 0.38 + rng() * 0.2, yg: h * (0.72 + rng() * 0.06), v: 0.8 + rng() * 0.5, ph: rng() * TAU });
    });
    // the darkened sky, baked (cheaper than a multiply pass per frame)
    const AD = mk(w, h), ad = AD.getContext('2d');
    ad.drawImage(S.A, 0, 0);
    ad.globalCompositeOperation = 'multiply';
    ad.fillStyle = 'rgba(80,22,28,0.85)';
    ad.fillRect(0, 0, w, h);
    S.AD = AD;
    // once fully burning, the sky and the near band are single blits
    const ABD = mk(w, h), abd = ABD.getContext('2d');
    abd.drawImage(AD, 0, 0);
    abd.globalAlpha = 0.92;
    abd.drawImage(AB, 0, 0);
    S.ABD = ABD;
    const NBD = mk(w, h), nbd = NBD.getContext('2d');
    nbd.drawImage(S.N, 0, 0);
    nbd.globalAlpha = 0.92;
    nbd.drawImage(NB, 0, 0);
    S.NBD = NBD;
    S.embers = makeMotes(rng, 140, { v: [-0.25, -0.08], r: [0.0018, 0.0045] });
    S.ash = makeMotes(rng, 60, { v: [0.03, 0.08], r: [0.002, 0.004] });
    S.spray = [];
    for (let i = 0; i < 70; i++) S.spray.push([rng(), rng(), rng()]);
    return S;
  }
  // The tear: a lens across the whole sky, widest in the middle, ragged edges.
  function tearPath(ctx, S, ext, hh, grow, t) {
    const { w, ty, u } = S, n = S.jagT.length - 1;
    const x0 = w * 0.5 - ext, x1 = w * 0.5 + ext;
    const amp = grow * 0.9 + hh * 0.22;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = lerp(x0, x1, i / n), k = 0.12 + 0.88 * Math.sin((Math.PI * i) / n);
      const j = S.jagT[i] * amp + Math.sin(t * 6 + i * 0.9) * u * 0.0012;
      const y = ty - hh * k - grow * (0.5 + 0.5 * k) - j;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    for (let i = n; i >= 0; i--) {
      const x = lerp(x0, x1, i / n), k = 0.12 + 0.88 * Math.sin((Math.PI * i) / n);
      const j = S.jagB[i] * amp * 1.2 + Math.sin(t * 5 + i * 1.3) * u * 0.0012;
      ctx.lineTo(x, ty + hh * k * 0.8 + grow * (0.5 + 0.5 * k) + j);
    }
    ctx.closePath();
  }
  function drawReset(ctx, S, t) {
    const { w, h, u, hy, ty } = S;
    // Shake after the first impacts.
    let shake = 0;
    for (const s of [1.6, 3.9, 6.6]) if (t > s) shake += Math.exp(-(t - s) * 2.2) * (s === 1.6 ? 0.5 : 1);
    shake += sstep(4, 7, t) * 0.12;
    const sk = Math.min(shake, 1) * u * 0.007;
    const sx = Math.round(Math.sin(t * 47) * sk), sy = Math.round(Math.cos(t * 39) * sk);
    if (sx || sy) {
      ctx.fillStyle = P.ink;
      ctx.fillRect(0, 0, w, h);
      ctx.setTransform(1, 0, 0, 1, sx, sy);
    }

    // The world darkens and reddens, and the ceiling catches fire.
    const off = (t * u * 0.012 + Math.min(t, 12) * Math.min(t, 12) * u * 0.002) % w;
    if (t >= 4.5) {
      ctx.drawImage(S.ABD, 0, 0);
      ctx.drawImage(S.NBD, -off, 0);
      ctx.drawImage(S.NBD, w - off, 0);
    } else {
      const dk = sstep(0.2, 3, t);
      if (dk < 1) ctx.drawImage(S.A, 0, 0);
      if (dk > 0) {
        ctx.globalAlpha = dk;
        ctx.drawImage(S.AD, 0, 0);
      }
      const burn = sstep(0.3, 4.5, t) * 0.92;
      ctx.globalAlpha = burn;
      ctx.drawImage(S.AB, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(S.N, -off, 0);
      ctx.drawImage(S.N, w - off, 0);
      if (burn > 0) {
        ctx.globalAlpha = burn;
        ctx.drawImage(S.NB, -off, 0);
        ctx.drawImage(S.NB, w - off, 0);
      }
      ctx.globalAlpha = 1;
    }

    // The line, then the tear.
    const lineK = sstep(1.5, 1.85, t);
    const open = sstep(2.2, 8, t);
    const hh = u * (0.001 + open * 0.042) + Math.sin(t * 5) * u * 0.0012 * open;
    if (lineK > 0) {
      const ext = lineK * w * 0.56;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.5 * open;
      blob(ctx, glow('#ff5a30'), w * 0.5, ty, ext * 1.1, hh * 3 + u * 0.08);
      ctx.globalAlpha = 0.7;
      blob(ctx, glow('#ffd9a0'), w * 0.5, ty, ext, hh * 1.6 + u * 0.03);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const edge = u * 0.004 + hh * 0.35;
      ctx.fillStyle = P.blood;
      tearPath(ctx, S, ext, hh, edge * 1.9, t);
      ctx.fill();
      ctx.fillStyle = P.glow;
      tearPath(ctx, S, ext, hh, edge, t);
      ctx.fill();
      ctx.fillStyle = '#ffa050';
      tearPath(ctx, S, ext, hh, edge * 0.45, t);
      ctx.fill();
      ctx.fillStyle = '#fffaf2';
      tearPath(ctx, S, ext, hh * 0.85, 0, t);
      ctx.fill();
      if (open < 0.05) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(w * 0.5 - ext, ty - u * 0.0015, ext * 2, u * 0.003);
      }
    }
    // Focus lines while it opens.
    const slA = sstep(1.55, 1.7, t) * (1 - sstep(2.6, 4.2, t)) + 0.35 * sstep(3.8, 4.0, t) * (1 - sstep(4.2, 5.5, t));
    if (slA > 0.01) {
      ctx.globalAlpha = slA * 0.75;
      ctx.drawImage(S.SL, 0, 0);
      ctx.globalAlpha = 1;
    }

    // Columns of fire pour down in sheets.
    ctx.globalCompositeOperation = 'lighter';
    const y0 = ty + hh * 0.6;
    let groundGlow = 0;
    for (const c of S.cols) {
      const p = (t - c.t0) / 0.55;
      if (p <= 0) continue;
      const yF = lerp(y0, c.yg, easeIn(clamp(p, 0, 1)));
      const cw = c.cw * (0.9 + 0.1 * Math.sin(t * 9 + c.ph)) * (0.6 + 0.4 * clamp(p, 0, 1));
      const sc = cw / 64, th = 512 * sc * 2.4;
      const scroll = (t * c.v * u * 1.4) % th;
      ctx.globalAlpha = 0.25;
      ctx.drawImage(S.FT, c.x - cw * 1.4, y0, cw * 2.8, yF - y0);
      ctx.globalAlpha = 0.95;
      for (let y = y0 - th + scroll; y < yF; y += th) {
        const ya = Math.max(y, y0), yb = Math.min(y + th, yF);
        if (yb <= ya) continue;
        ctx.drawImage(S.FT, 0, ((ya - y) / th) * 512, 64, ((yb - ya) / th) * 512, c.x - cw / 2, ya, cw, yb - ya);
      }
      if (p < 1) {
        ctx.globalAlpha = 1;
        blob(ctx, glow('#fff0d0'), c.x, yF, cw * 1.2, cw * 1.6);
      } else {
        const g = Math.min(1, (p - 1) * 2) * (0.8 + 0.2 * Math.sin(t * 13 + c.ph));
        groundGlow += 0.12;
        ctx.globalAlpha = g * 0.9;
        blob(ctx, glow('#ff8a3a'), c.x, c.yg, cw * 3.2, u * 0.09);
        ctx.globalAlpha = g * 0.8;
        blob(ctx, glow('#fff0c0'), c.x, c.yg, cw * 1.3, u * 0.035);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // The flood: a dark wall rising beyond the rooftops.
    const fk = sstep(6.3, 10.5, t);
    if (fk > 0) {
      const sc = u / 780;
      const top = lerp(hy + h * 0.06, hy - h * 0.13, fk);
      const wave = (x) => top + Math.sin(x * 0.006 / sc + t * 1.7) * u * 0.006 + Math.sin(x * 0.017 / sc - t * 2.9) * u * 0.003 + Math.sin(x * 0.0021 / sc + t * 0.6) * u * 0.02 - Math.pow(Math.max(0, Math.sin(x * 0.0042 / sc - t * 0.5)), 4) * u * 0.06 * fk;
      const step = w / 72;
      const crest = (dy) => { ctx.beginPath(); for (let x = 0; x <= w + step; x += step) { const y = wave(x) + dy; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); } };
      ctx.fillStyle = lin(ctx, 0, top - u * 0.03, 0, h * 0.8, [[0, '#b0603e'], [0.05, '#4a2a28'], [0.18, '#1e1418'], [0.5, '#0c0a0d'], [1, '#050405']]);
      crest(0);
      ctx.lineTo(w + step, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      // the face of the wave: hard bands of reflected fire
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = u * 0.003;
      for (let k = 1; k <= 4; k++) {
        ctx.strokeStyle = rgba('#ff8a50', (0.28 / k) * fk);
        crest(k * k * u * 0.012);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // where the fire meets the water
      ctx.globalCompositeOperation = 'lighter';
      for (const c of S.cols) {
        if (t < c.t0 + 0.55) continue;
        ctx.globalAlpha = fk * (0.6 + 0.3 * Math.sin(t * 11 + c.ph));
        blob(ctx, glow('#ff9a50'), c.x, wave(c.x), c.cw * 2.2, u * 0.05);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // curling crest
      ctx.strokeStyle = P.bone;
      ctx.lineWidth = u * 0.005;
      crest(0);
      ctx.stroke();
      // foam curls hooking forward off the crest
      ctx.lineWidth = u * 0.003;
      ctx.beginPath();
      for (let i = 0; i < 28; i++) {
        const x = ((i + 0.5) / 28) * w + Math.sin(i * 7.1) * w * 0.012, y = wave(x), r = u * (0.008 + ((i * 37) % 10) * 0.0012);
        ctx.moveTo(x - r, y);
        ctx.arc(x, y + r, r, -Math.PI, -Math.PI * 0.1 - ((t * 0.7 + i) % 1) * 0.4);
      }
      ctx.stroke();
      ctx.fillStyle = P.bone;
      for (const [rx, ry, rs] of S.spray) {
        const x = rx * w, ph = (t * (0.6 + rs) + ry) % 1;
        const y = wave(x) - ph * u * 0.07 * (0.5 + rs);
        ctx.globalAlpha = (1 - ph) * fk * 0.9;
        const r = u * 0.003 * (1 + rs);
        ctx.fillRect(x + ph * u * 0.02, y, r, r);
      }
      ctx.globalAlpha = 1;
    }

    // Roofs, backlit; some collapse.
    drawHouses(ctx, S, t, true);
    ctx.drawImage(S.C, 0, 0);
    // fire light on the city
    if (groundGlow > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(0.5, groundGlow) * (0.85 + 0.15 * Math.sin(t * 8));
      ctx.fillStyle = lin(ctx, 0, h * 0.6, 0, h, [[0, 'rgba(255,90,40,0)'], [0.45, 'rgba(255,90,40,0.4)'], [1, 'rgba(120,20,20,0)']]);
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    drawLanterns(ctx, S, t, 1 - sstep(3.5, 6, t));
    // Embers and ash.
    const ek = sstep(1.0, 6, t);
    if (ek > 0) {
      ctx.globalCompositeOperation = 'lighter';
      drawMotes(ctx, S.embers.slice(0, Math.ceil(S.embers.length * ek)), t, 0, 0, w, h, u, ['#ffd08a', '#ff8a3a', '#ff5a2a', '#fff2d0'], 1, 0.05);
      ctx.globalCompositeOperation = 'source-over';
      drawMotes(ctx, S.ash, t, 0, 0, w, h, u, ['#120a0a', '#2a1a1a'], ek * 0.8, 0.04);
    }
    // Flashes: white when the line opens, an inverted impact frame when fire lands.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const f1 = t > 1.55 ? Math.exp(-(t - 1.55) * 7) : 0;
    const f2 = t > 3.9 + 0.55 ? Math.exp(-(t - 4.45) * 5) * 0.7 : 0;
    if (f1 + f2 > 0.01) {
      ctx.fillStyle = rgba('#fff4e8', Math.min(1, f1 * 0.95 + f2 * 0.6));
      ctx.fillRect(0, 0, w, h);
    }
    if ((t > 4.45 && t < 4.53) || (t > 1.5 && t < 1.56)) {
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ------------------------------------------------------------------ SUMMIT
  function buildSummit(w, h) {
    const u = Math.min(w, h), rng = mulberry(5), S = { w, h, u };
    const L = (S.L = [w * 0.5, h * 0.12]);
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = rad(a, L[0], L[1], 0, Math.hypot(w, h) * 0.62, [[0, '#ffffff'], [0.1, '#fffaf2'], [0.22, '#f4dccf'], [0.4, '#b08e88'], [0.62, '#4f4449'], [0.85, '#1d1718'], [1, '#0c0808']]);
    a.fillRect(0, 0, w, h);
    // speed lines toward the light (static, faint)
    speedLines(a, rng, L[0], L[1], u * 0.35, Math.max(w, h), 120, 'rgba(12,8,8,0.22)', u * 0.006);
    // sea of clouds: tops lit from above
    const hz = h * 0.56;
    const sea = makeRows(rng, w, h, u, {
      yHor: hz, yTop: h * 0.92, n: 7, nearN: 0, pow: 1.4, bw: [0.05, 0.4], bh: [0.008, 0.06], dir: -1,
      far: { lit: '#fff4ea', mid: '#e8c8bc', dark: '#b8968e' }, near: { lit: '#d9b6aa', mid: '#7a5e5e', dark: '#3a2e33' },
    });
    for (const r of sea) paintRow(a, r);
    // the summit floor (dark stone) fanning out from the stairs
    a.fillStyle = '#1d1718';
    a.beginPath();
    a.moveTo(w * 0.3, h * 0.66);
    a.lineTo(w * 0.7, h * 0.66);
    a.lineTo(w * 1.1, h);
    a.lineTo(-w * 0.1, h);
    a.closePath();
    a.fill();
    a.fillStyle = '#3d3337';
    a.fillRect(w * 0.3, h * 0.655, w * 0.4, u * 0.008);
    // flagstone joints converging on the stairs
    a.strokeStyle = 'rgba(237,202,192,0.12)';
    a.lineWidth = u * 0.002;
    a.beginPath();
    for (let i = -6; i <= 6; i++) { a.moveTo(w * 0.5 + i * w * 0.035, h * 0.66); a.lineTo(w * 0.5 + i * w * 0.14, h); }
    for (const fy of [0.72, 0.8, 0.9]) { a.moveTo(0, h * fy); a.lineTo(w, h * fy); }
    a.stroke();
    // the final steps, rising into the light
    const steps = 13;
    for (let i = steps - 1; i >= 0; i--) {
      const k0 = i / steps, k1 = (i + 1) / steps;
      const yb = lerp(h * 1.02, h * 0.4, Math.pow(k0, 0.8)), yt = lerp(h * 1.02, h * 0.4, Math.pow(k1, 0.8));
      const wb = lerp(w * 0.24, w * 0.035, Math.pow(k0, 0.7)), wt = lerp(w * 0.24, w * 0.035, Math.pow(k1, 0.7));
      const riser = (yb - yt) * 0.42;
      const fade = sstep(0.35, 1, k1);
      a.fillStyle = mix('#3d3337', '#e8d2c8', fade * 0.8);
      a.fillRect(w * 0.5 - wb, yb - riser, wb * 2, riser);
      a.fillStyle = mix('#c7aaa2', '#fff8f0', fade);
      a.beginPath();
      a.moveTo(w * 0.5 - wb, yb - riser);
      a.lineTo(w * 0.5 - wt, yt);
      a.lineTo(w * 0.5 + wt, yt);
      a.lineTo(w * 0.5 + wb, yb - riser);
      a.closePath();
      a.fill();
      a.fillStyle = rgba('#0c0808', 0.6 * (1 - fade));
      a.fillRect(w * 0.5 - wb, yb - riser, wb * 2, u * 0.003);
    }
    // stair walls (ink) with rim on the inner edge
    for (const s of [-1, 1]) {
      a.fillStyle = '#e6c8bc';
      a.beginPath();
      a.moveTo(w * 0.5 + s * w * 0.24, h * 1.02);
      a.lineTo(w * 0.5 + s * w * 0.035, h * 0.4);
      a.lineTo(w * 0.5 + s * w * 0.05, h * 0.4);
      a.lineTo(w * 0.5 + s * w * 0.3, h * 1.02);
      a.closePath();
      a.fill();
      a.fillStyle = P.ink;
      a.beginPath();
      a.moveTo(w * 0.5 + s * (w * 0.24 + u * 0.008), h * 1.02);
      a.lineTo(w * 0.5 + s * (w * 0.035 + u * 0.003), h * 0.4);
      a.lineTo(w * 0.5 + s * w * 0.05, h * 0.4);
      a.lineTo(w * 0.5 + s * w * 0.3, h * 1.02);
      a.closePath();
      a.fill();
    }
    // broken pillars, receding in two rows
    const pillars = [[-0.42, 0.98, 0.25, 0.55], [-0.27, 0.8, 0.16, 0.92], [-0.18, 0.69, 0.11, 0.4], [-0.125, 0.62, 0.075, 1], [0.13, 0.62, 0.075, 0.7], [0.19, 0.69, 0.11, 1], [0.29, 0.8, 0.16, 0.48], [0.44, 0.98, 0.25, 0.8]];
    for (const [fx, fy, fs, intact] of pillars.sort((p, q) => q[2] < p[2] ? 1 : -1)) {
      const x = w * 0.5 + fx * w, base = h * fy, pw = u * fs * 0.42, full = u * fs * 4.2;
      const top = base - full * intact;
      const side = fx < 0 ? 1 : -1; // inner side faces the light
      const jag = [];
      for (let i = 0; i <= 6; i++) jag.push(top + (intact < 1 ? (rng() - 0.3) * pw * 0.9 : 0));
      const body = (dx) => {
        a.beginPath();
        a.moveTo(x - pw / 2 + dx, base);
        for (let i = 0; i <= 6; i++) a.lineTo(x - pw / 2 + (pw * i) / 6 + dx, jag[i]);
        a.lineTo(x + pw / 2 + dx, base);
        a.closePath();
        a.fill();
      };
      a.fillStyle = '#efd6ca';
      body(0);
      a.fillStyle = '#1d1718';
      body(-side * u * fs * 0.06);
      a.fillStyle = '#2d292b';
      a.fillRect(x - pw * 0.62, base - pw * 0.25, pw * 1.24, pw * 0.25);
      if (intact >= 1) { a.fillRect(x - pw * 0.62, top - pw * 0.05, pw * 1.24, pw * 0.22); }
      a.strokeStyle = 'rgba(237,202,192,0.18)';
      a.lineWidth = Math.max(1, pw * 0.03);
      a.beginPath();
      for (let i = 1; i < 4; i++) { a.moveTo(x - pw / 2 + (pw * i) / 4, base - pw * 0.3); a.lineTo(x - pw / 2 + (pw * i) / 4, Math.max(...jag) + pw * 0.1); }
      a.stroke();
      // a fallen drum at the foot of broken ones
      if (intact < 1) {
        a.fillStyle = '#1d1718';
        a.beginPath();
        a.ellipse(x - side * pw * 0.9, base - pw * 0.25, pw * 0.65, pw * 0.3, side * 0.2, 0, TAU);
        a.fill();
        a.fillStyle = '#6e5353';
        a.beginPath();
        a.ellipse(x - side * pw * 1.45, base - pw * 0.27, pw * 0.13, pw * 0.3, side * 0.2, 0, TAU);
        a.fill();
      }
    }
    // tone on the dark lower corners
    tone(a, 0, h * 0.5, w, h, u * 0.009, 'rgba(12,8,8,0.6)', (x, y) => Math.abs(x / w - 0.5) * 2.2 - 0.6 + (y / h - 0.6));
    grain(a, w, h, 0.06);
    S.A = A;
    // rays from the light (rotated a little per frame)
    const RC = mk(w, h), r = RC.getContext('2d');
    r.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const ang = Math.PI * (0.02 + 0.96 * rng()), wd = 0.01 + rng() * 0.04, len = Math.hypot(w, h);
      r.fillStyle = lin(r, L[0], L[1], L[0] + Math.cos(ang) * len * 0.7, L[1] + Math.sin(ang) * len * 0.7, [[0, 'rgba(255,248,236,0.5)'], [1, 'rgba(255,248,236,0)']]);
      r.beginPath();
      r.moveTo(L[0], L[1]);
      r.lineTo(L[0] + Math.cos(ang - wd) * len, L[1] + Math.sin(ang - wd) * len);
      r.lineTo(L[0] + Math.cos(ang + wd) * len, L[1] + Math.sin(ang + wd) * len);
      r.closePath();
      r.fill();
    }
    S.RC = RC;
    S.shards = [];
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      S.shards.push({ x: 0.5 + side * (0.12 + rng() * 0.36), y: 0.12 + rng() * 0.45, s: 0.006 + rng() * 0.018, r: rng() * TAU, ph: rng() * TAU, v: 0.2 + rng() * 0.5, pts: [0, 1, 2, 3].map((k) => [Math.cos((k / 4) * TAU + rng() * 0.8), Math.sin((k / 4) * TAU + rng() * 0.8) * (0.5 + rng())]) });
    }
    S.motes = makeMotes(rng, 70, { v: [-0.08, -0.02], r: [0.0012, 0.003] });
    return S;
  }
  function drawSummit(ctx, S, t) {
    const { w, h, u, L } = S;
    ctx.drawImage(S.A, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 + 0.15 * Math.sin(t * 0.8);
    ctx.translate(L[0], L[1]);
    ctx.rotate(Math.sin(t * 0.12) * 0.04);
    ctx.translate(-L[0], -L[1]);
    ctx.drawImage(S.RC, 0, 0);
    ctx.restore();
    // the brightness itself, too pale to see through
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7 + 0.1 * Math.sin(t * 1.3);
    blob(ctx, glow('#fff8ee'), L[0], L[1] + h * 0.08, w * 0.22, h * 0.32);
    ctx.globalAlpha = 1;
    blob(ctx, glow('#ffffff'), L[0], L[1] + h * 0.12, w * 0.07, h * 0.16);
    ctx.globalCompositeOperation = 'source-over';
    // fragments hanging in the air
    for (const s of S.shards) {
      const x = s.x * w + Math.sin(t * 0.3 + s.ph) * u * 0.01, y = s.y * h + Math.sin(t * s.v + s.ph) * u * 0.02;
      const sz = s.s * u * 2, rot = s.r + t * 0.15 * (s.v - 0.4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      poly(ctx, s.pts.map((p) => [p[0] * sz, p[1] * sz]));
      ctx.fillStyle = '#1d1718';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,236,0.85)';
      ctx.lineWidth = Math.max(1, sz * 0.12);
      ctx.beginPath();
      ctx.moveTo(s.pts[3][0] * sz, s.pts[3][1] * sz);
      ctx.lineTo(s.pts[0][0] * sz, s.pts[0][1] * sz);
      ctx.lineTo(s.pts[1][0] * sz, s.pts[1][1] * sz);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    drawMotes(ctx, S.motes, t, w * 0.15, h * 0.1, w * 0.85, h * 0.9, u, ['#fff4e8', '#edcac0'], 0.9, 0.03);
    ctx.globalCompositeOperation = 'source-over';
  }

  // -------------------------------------------------------------------- DAWN
  function buildDawn(w, h) {
    const u = Math.min(w, h), rng = mulberry(22), S = { w, h, u };
    const hz = (S.hz = h * 0.56);
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, hz, [[0, '#2c2c34'], [0.35, '#5a5a64'], [0.7, '#a89c9e'], [0.9, '#e6cfc2'], [1, '#f6e4d6']]);
    a.fillRect(0, 0, w, h);
    a.globalCompositeOperation = 'lighter';
    a.globalAlpha = 0.45;
    blob(a, glow('#ffd8b8'), w * 0.36, hz, w * 0.4, h * 0.2);
    a.globalCompositeOperation = 'source-over';
    a.globalAlpha = 1;
    const rows = makeRows(rng, w, h, u, {
      yHor: hz - h * 0.11, yTop: -h * 0.02, n: 8, nearN: 3, pow: 1.5, bw: [0.05, 0.55], bh: [0.006, 0.065],
      sunX: w * 0.36, sunW: w * 0.5, haze: '#e6d2c6',
      far: { lit: '#f3dfd2', mid: '#bdaaaa', dark: '#8c7e84' }, near: { lit: '#9a8e94', mid: '#4e4a54', dark: '#2a2830' },
    });
    const tx = w * 0.7;
    let split = rows.findIndex((r) => r.y < h * 0.2);
    if (split < 0) split = rows.length - 3;
    split = Math.min(split, rows.length - 3);
    for (let i = 0; i < split; i++) paintRow(a, rows[i]);
    // the Tower, a thin dark line far away
    a.fillStyle = 'rgba(52,48,58,0.9)';
    a.beginPath();
    a.moveTo(tx - u * 0.004, hz);
    a.lineTo(tx - u * 0.0022, 0);
    a.lineTo(tx + u * 0.0022, 0);
    a.lineTo(tx + u * 0.004, hz);
    a.fill();
    for (let i = split; i < rows.length - 3; i++) paintRow(a, rows[i]);
    S.A = A;
    const N = mk(w, h), n = N.getContext('2d');
    for (let i = rows.length - 3; i < rows.length; i++) paintRow(n, rows[i]);
    n.globalCompositeOperation = 'source-atop';
    tone(n, 0, 0, w, h * 0.3, u * 0.009, 'rgba(20,18,24,0.4)', (x, y) => 0.6 - y / (h * 0.3));
    S.N = N;
    // hills, far to near, each with a lit crest
    const B = mk(w, h), b = B.getContext('2d');
    const hills = [
      [hz + h * 0.005, 0.012, '#8e9290', '#c8c0b6', 3],
      [hz + h * 0.04, 0.025, '#6d7670', '#b4b0a2', 3],
      [hz + h * 0.1, 0.035, '#4e5a52', '#9aa08e', 3],
      [hz + h * 0.19, 0.045, '#333f38', '#7d8a74', 2],
      [hz + h * 0.32, 0.05, '#1e2722', '#5c6a56', 2],
    ];
    const fns = [];
    hills.forEach(([y, amp, col, rim, nw], i) => {
      const fn = ridge(rng, w, y, u * amp, nw);
      fns.push(fn);
      const tgt = i < 2 ? a : b;
      fillRidge(tgt, fn, w, h, rim, w / 120);
      fillRidge(tgt, (x) => fn(x) + u * (0.004 + i * 0.002), w, h, col, w / 120);
      if (i === 2) {
        // the new road over the middle hill
        const rx = (y2) => w * 0.58 + (y2 - hz) * 0.4;
        b.fillStyle = '#c9bfae';
        b.beginPath();
        b.moveTo(w * 0.615, fn(w * 0.615) + u * 0.006);
        b.lineTo(w * 0.632, fn(w * 0.632) + u * 0.006);
        b.lineTo(rx(hz + h * 0.25) + u * 0.04, hz + h * 0.25);
        b.lineTo(rx(hz + h * 0.25) - u * 0.0, hz + h * 0.25);
        b.closePath();
        b.fill();
      }
    });
    // the road on the near slope: wide at the bottom, curving up to the crest
    const yc = fns[3](w * 0.47) + u * 0.006;
    b.fillStyle = '#d7cdbb';
    b.beginPath();
    b.moveTo(w * 0.28, h * 1.01);
    b.bezierCurveTo(w * 0.36, h * 0.86, w * 0.52, h * 0.84, w * 0.455, yc);
    b.lineTo(w * 0.49, yc);
    b.bezierCurveTo(w * 0.6, h * 0.84, w * 0.56, h * 0.9, w * 0.62, h * 1.01);
    b.closePath();
    b.fill();
    b.fillStyle = 'rgba(30,39,34,0.35)';
    b.beginPath();
    b.moveTo(w * 0.42, h * 1.01);
    b.bezierCurveTo(w * 0.45, h * 0.9, w * 0.52, h * 0.86, w * 0.47, yc);
    b.lineTo(w * 0.473, yc);
    b.bezierCurveTo(w * 0.53, h * 0.87, w * 0.48, h * 0.92, w * 0.46, h * 1.01);
    b.fill();
    // near hill over the road's lower edge
    fillRidge(b, (x) => fns[4](x) + h * 0.06, w, h, '#141a17', w / 120);
    b.globalCompositeOperation = 'source-atop';
    tone(b, 0, hz, w, h, u * 0.009, 'rgba(10,14,12,0.5)', (x, y) => (y - hz) / (h - hz) - 0.25);
    b.globalCompositeOperation = 'source-over';
    grain(a, w, h, 0.05);
    S.B = B;
    // mist band (tileable)
    const M = mk(w, h * 0.16), m = M.getContext('2d');
    for (let i = 0; i < 40; i++) {
      const x = rng() * w, y = M.height * (0.3 + rng() * 0.4), rx = u * (0.1 + rng() * 0.25), ry = M.height * (0.15 + rng() * 0.2);
      m.globalAlpha = 0.18 + rng() * 0.2;
      for (const dx of [-w, 0, w]) blob(m, glow('#f2e6dc'), x + dx, y, rx, ry);
    }
    S.M = M;
    S.blades = [];
    for (let i = 0; i < 70; i++) S.blades.push([rng(), 0.012 + rng() * 0.05, rng() * TAU, rng() < 0.5 ? -1 : 1]);
    return S;
  }
  function drawDawn(ctx, S, t) {
    const { w, h, u, hz } = S;
    ctx.drawImage(S.A, 0, 0);
    const off = (t * u * 0.006) % w;
    ctx.drawImage(S.N, -off, 0);
    ctx.drawImage(S.N, w - off, 0);
    const m1 = (t * u * 0.01) % w;
    ctx.globalAlpha = 0.9;
    ctx.drawImage(S.M, -m1, hz - S.M.height * 0.35);
    ctx.drawImage(S.M, w - m1, hz - S.M.height * 0.35);
    ctx.globalAlpha = 1;
    ctx.drawImage(S.B, 0, 0);
    const m2 = (t * u * 0.02 + w * 0.4) % w;
    ctx.globalAlpha = 0.45;
    ctx.drawImage(S.M, -m2, hz + h * 0.13, w, S.M.height * 1.4);
    ctx.drawImage(S.M, w - m2, hz + h * 0.13, w, S.M.height * 1.4);
    ctx.globalAlpha = 1;
    // birds over the hills
    ctx.strokeStyle = 'rgba(30,30,36,0.8)';
    ctx.lineWidth = u * 0.0028;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const bx = ((w * (0.2 + i * 0.07) + t * u * 0.03 * (1 + i * 0.1)) % (w * 1.2)) - w * 0.1, by = h * (0.3 + i * 0.04) + Math.sin(t * 0.7 + i) * u * 0.01;
      const fl = Math.sin(t * 5 + i * 2) * u * 0.006, s = u * 0.011;
      ctx.moveTo(bx - s, by - fl);
      ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.2, bx, by + s * 0.15);
      ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.2, bx + s, by - fl);
    }
    ctx.stroke();
    // grass in the foreground, swaying
    ctx.strokeStyle = '#0e1311';
    ctx.lineWidth = u * 0.004;
    ctx.beginPath();
    for (const [fx, len, ph, s] of S.blades) {
      const x = fx * w, y = h, L = len * u * 3;
      const sw = Math.sin(t * 1.4 + ph + fx * 6) * L * 0.18 + s * L * 0.15;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sw * 0.3, y - L * 0.6, x + sw, y - L);
    }
    ctx.stroke();
  }

  // -------------------------------------------------------------- FORMATION
  function buildFormation(w, h) {
    const u = Math.min(w, h), rng = mulberry(41), S = { w, h, u };
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, h, [[0, '#0e0a12'], [0.3, '#22172a'], [0.55, '#4a2c3c'], [0.68, '#8a4c4e'], [0.75, '#c87c66'], [1, '#2a1418']]);
    a.fillRect(0, 0, w, h);
    const rows = makeRows(rng, w, h, u, {
      yHor: h * 0.62, yTop: -h * 0.04, n: 8, nearN: 0, pow: 1.5, bw: [0.05, 0.55], bh: [0.006, 0.065], sunX: w * 0.5, sunW: w * 0.5, haze: '#8a4c4e',
      far: { lit: '#e8a080', mid: '#a05a58', dark: '#5a3240' }, near: { lit: '#5a3a52', mid: '#24182a', dark: '#120c16' },
    });
    for (const r of rows) paintRow(a, r);
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, h * 0.6, u * 0.009, 'rgba(8,4,10,0.55)', (x, y) => 0.7 - y / (h * 0.5));
    a.globalCompositeOperation = 'source-over';
    grain(a, w, h, 0.06);
    S.A = A;
    // Treeline twice: dusk rim, and violet rim lit by the formation.
    const ty = h * 0.7;
    const T1 = mk(w, h), T2 = mk(w, h);
    const tr = rng() * 1e9;
    conifers(T1.getContext('2d'), mulberry(tr), -u * 0.05, w + u * 0.05, ty, u, 0.12, 0.3, h, P.ink, '#c08070', u * 0.002, u * 0.0015);
    conifers(T2.getContext('2d'), mulberry(tr), -u * 0.05, w + u * 0.05, ty, u, 0.12, 0.3, h, P.ink, '#c8b4ff', -u * 0.0012, u * 0.0035);
    for (const T of [T1, T2]) {
      const c = T.getContext('2d');
      conifers(c, mulberry(tr + 1), -u * 0.05, w + u * 0.05, h * 0.86, u, 0.12, 0.22, h, '#070505', null);
    }
    S.T1 = T1;
    S.T2 = T2;

    // The formation: concentric rings, each pre-drawn flat, drawn tilted and rotating.
    const R = (S.R = Math.min(w * 0.4, h * 1.1));
    S.cx = w * 0.5;
    S.cy = h * 0.33;
    S.sq = 0.4;
    const lw = Math.max(1, u * 0.0022);
    const ring = (rr, fn) => {
      const pad = u * 0.03, D = Math.ceil(2 * (rr + pad)), c = mk(D, D), x = c.getContext('2d');
      x.translate(D / 2, D / 2);
      x.lineCap = 'round';
      const pass = (path, k = 1, core = '#e6dcff') => {
        x.strokeStyle = P.glyph;
        x.globalAlpha = 0.14;
        x.lineWidth = lw * 7 * k;
        path(); x.stroke();
        x.globalAlpha = 0.4;
        x.lineWidth = lw * 2.6 * k;
        path(); x.stroke();
        x.globalAlpha = 1;
        x.strokeStyle = core;
        x.lineWidth = lw * k;
        path(); x.stroke();
      };
      fn(x, pass);
      return { c, r: rr, D };
    };
    const circle = (x, r) => () => { x.beginPath(); x.arc(0, 0, r, 0, TAU); };
    const rr = mulberry(8);
    S.rings = [
      ring(R, (x, pass) => {
        pass(circle(x, R), 1.3);
        pass(circle(x, R * 0.93));
        pass(() => {
          x.beginPath();
          for (let i = 0; i < 180; i++) {
            const a = (i / 180) * TAU, l = i % 5 === 0 ? 0.035 : 0.015;
            x.moveTo(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93);
            x.lineTo(Math.cos(a) * R * (0.93 + l), Math.sin(a) * R * (0.93 + l));
          }
        }, 0.6);
        // little geometric marks around the band
        pass(() => {
          x.beginPath();
          for (let i = 0; i < 36; i++) {
            const a = ((i + 0.5) / 36) * TAU, rm = R * 0.965, s = R * 0.014;
            const cx = Math.cos(a) * rm, cy = Math.sin(a) * rm, k = Math.floor(rr() * 4);
            if (k === 0) { x.moveTo(cx + s, cy); x.arc(cx, cy, s, 0, TAU); }
            else if (k === 1) { x.moveTo(cx - s, cy - s); x.lineTo(cx + s, cy + s); x.moveTo(cx + s, cy - s); x.lineTo(cx - s, cy + s); }
            else if (k === 2) { x.moveTo(cx, cy - s); x.lineTo(cx + s, cy + s); x.lineTo(cx - s, cy + s); x.closePath(); }
            else { x.moveTo(cx - s, cy); x.lineTo(cx + s, cy); x.moveTo(cx, cy - s); x.lineTo(cx, cy + s); }
          }
        }, 0.7);
      }),
      ring(R * 0.86, (x, pass) => {
        const r = R * 0.86;
        pass(circle(x, r), 1.1);
        pass(() => {
          x.beginPath();
          const n = 16, k = 7;
          for (let i = 0; i <= n; i++) { const a = ((i * k) / n) * TAU; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
        }, 0.7);
        pass(() => {
          x.beginPath();
          for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; x.moveTo(Math.cos(a) * r + R * 0.018, Math.sin(a) * r); x.arc(Math.cos(a) * r, Math.sin(a) * r, R * 0.018, 0, TAU); }
        }, 0.9);
      }),
      ring(R * 0.58, (x, pass) => {
        const r = R * 0.58;
        pass(circle(x, r), 1.2);
        pass(circle(x, r * 0.92));
        pass(circle(x, r * 0.55), 0.8);
        pass(() => {
          x.beginPath();
          for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; x.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); x.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); }
        }, 0.6);
        pass(() => {
          x.beginPath();
          for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; const px = Math.cos(a) * r * 0.74, py = Math.sin(a) * r * 0.74; x.moveTo(px + R * 0.03, py); x.arc(px, py, R * 0.03, 0, TAU); }
        }, 1);
      }),
      ring(R * 0.3, (x, pass) => {
        const r = R * 0.3;
        pass(circle(x, r), 1.2);
        for (const off of [0, Math.PI]) {
          pass(() => {
            x.beginPath();
            for (let i = 0; i <= 3; i++) { const a = off + (i / 3) * TAU - Math.PI / 2; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
          }, 1);
        }
        pass(circle(x, r * 0.42), 1);
        pass(() => { x.beginPath(); x.rect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6); }, 0.8);
      }),
    ];
    // The light that scatters when it fails.
    S.sparks = [];
    for (let i = 0; i < 70; i++) S.sparks.push({ a: rng() * TAU, t0: 4.35 + rng() * 1.2, v: 0.15 + rng() * 0.35, life: 0.3 + rng() * 0.5 });
    S.bits = [];
    for (let i = 0; i < 220; i++) {
      const ri = Math.floor(rng() * 4), rr2 = S.rings[ri].r / R;
      S.bits.push({ a: rng() * TAU, r: rr2 * (0.9 + rng() * 0.15), v: 0.15 + rng() * 0.6, life: 1.2 + rng() * 2.6, s: 0.0015 + rng() * 0.003, fall: rng() * 0.08 });
    }
    S.SL = mk(w, h);
    speedLines(S.SL.getContext('2d'), rng, S.cx, S.cy, R * 0.45, Math.max(w, h), 140, 'rgba(230,220,255,0.9)', u * 0.006, 0.7);
    S.motes = makeMotes(rng, 40, { v: [0.01, 0.04], r: [0.0012, 0.0025] });
    return S;
  }
  function ringAngles(t) {
    // Inner ring (index 2) decelerates to a stop between 4.0 and 4.6 s.
    const d = clamp(t - 4, 0, 0.6);
    const a2 = t < 4 ? 0.16 * t : 0.64 + 0.16 * (d - (d * d) / 1.2);
    return [0.045 * t, -0.08 * t, a2, -0.22 * t];
  }
  function drawFormation(ctx, S, t) {
    const { w, h, u, R, cx, cy, sq } = S;
    ctx.drawImage(S.A, 0, 0);
    // intensity: steady, flickering after the stall, gone after the break
    const BREAK = 5.6;
    let I = 1 - sstep(BREAK, BREAK + 2.2, t);
    if (t > 4.6 && t < BREAK) I *= 0.65 + 0.35 * Math.abs(Math.sin(t * 31) * Math.sin(t * 13));
    const flash = t > BREAK ? Math.exp(-(t - BREAK) * 3) : 0;
    const shud = t > 4.5 && t < BREAK + 0.3 ? u * 0.006 * sstep(4.5, 5.2, t) : 0;
    const ox = Math.sin(t * 61) * shud, oy = Math.cos(t * 53) * shud;
    // light on the sky around it
    ctx.globalCompositeOperation = 'lighter';
    if (I + flash > 0.01) {
      ctx.globalAlpha = 0.5 * I + flash * 0.8;
      blob(ctx, glow('#7a5ad0'), cx, cy, R * 1.25, R * 0.75);
      ctx.globalAlpha = 0.6 * I + flash;
      blob(ctx, glow('#c8b4ff'), cx, cy, R * 0.4, R * 0.22);
    }
    const ang = ringAngles(t);
    const spread = t > BREAK ? sstep(BREAK, BREAK + 2.2, t) * 0.7 + easeIn(sstep(BREAK, BREAK + 2.6, t)) * 0.5 : 0;
    S.rings.forEach((rg, i) => {
      const a = I * (i === 2 && t > 4.6 && t < BREAK ? 0.6 + 0.4 * Math.sin(t * 40) : 1);
      if (a <= 0.01) return;
      ctx.save();
      ctx.translate(cx + ox, cy + oy);
      ctx.scale(1, sq);
      ctx.rotate(ang[i]);
      ctx.globalAlpha = a;
      if (spread <= 0) {
        ctx.drawImage(rg.c, -rg.D / 2, -rg.D / 2);
      } else {
        // break apart into wedges flying outward
        const n = 7 + i * 2;
        for (let k = 0; k < n; k++) {
          const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, am = (a0 + a1) / 2;
          const d = spread * R * (0.25 + ((k * 7 + i * 3) % 5) * 0.08);
          ctx.save();
          ctx.translate(Math.cos(am) * d, Math.sin(am) * d);
          ctx.rotate(spread * 0.3 * (k % 2 ? 1 : -1));
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, rg.D, a0, a1);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(rg.c, -rg.D / 2, -rg.D / 2);
          ctx.restore();
        }
      }
      ctx.restore();
    });
    // the core
    if (I > 0.01) {
      ctx.globalAlpha = I * (0.85 + 0.15 * Math.sin(t * 5));
      blob(ctx, glow('#f2ecff'), cx + ox, cy + oy, R * 0.09, R * 0.06);
    }
    // sparks from the stalled ring
    const r2 = S.rings[2].r;
    for (const s of S.sparks) {
      const p = (t - s.t0) / s.life;
      if (p < 0 || p > 1) continue;
      const rr = r2 * (1 + p * s.v);
      const x = cx + Math.cos(s.a) * rr, y = cy + Math.sin(s.a) * rr * sq + p * p * u * 0.05;
      const x2 = cx + Math.cos(s.a) * r2 * (1 + Math.max(0, p - 0.25) * s.v), y2 = cy + Math.sin(s.a) * r2 * (1 + Math.max(0, p - 0.25) * s.v) * sq;
      ctx.globalAlpha = 1 - p;
      ctx.strokeStyle = '#f0e8ff';
      ctx.lineWidth = u * 0.003;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    // scattering light after the break
    if (t > BREAK) {
      const dt = t - BREAK;
      for (const b of S.bits) {
        const p = dt / b.life;
        if (p > 1) continue;
        const rr = R * (b.r + p * b.v * 0.6);
        const x = cx + Math.cos(b.a) * rr, y = cy + Math.sin(b.a) * rr * sq + dt * dt * u * b.fall;
        ctx.globalAlpha = (1 - p) * (1 - p) * (0.7 + 0.3 * Math.sin(t * 20 + b.a * 9));
        ctx.fillStyle = b.s > 0.0035 ? '#ffffff' : '#c8b4ff';
        const s = b.s * u * (1 - p * 0.5);
        ctx.fillRect(x - s, y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = flash * 0.8;
      ctx.drawImage(S.SL, 0, 0);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // treeline: dusk rim, violet rim while the formation burns
    ctx.drawImage(S.T1, 0, 0);
    const vk = clamp(I + flash, 0, 1);
    if (vk > 0.01) {
      ctx.globalAlpha = vk;
      ctx.drawImage(S.T2, 0, 0);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    if (vk > 0.01) {
      ctx.globalAlpha = vk * 0.35;
      ctx.fillStyle = lin(ctx, 0, h * 0.55, 0, h * 0.8, [[0, 'rgba(169,139,255,0.5)'], [1, 'rgba(169,139,255,0)']]);
      ctx.fillRect(0, h * 0.55, w, h * 0.25);
    }
    ctx.globalAlpha = 1;
    drawMotes(ctx, S.motes, t, 0, h * 0.1, w, h * 0.7, u, ['#c8b4ff', '#edcac0'], 0.5 * (0.3 + 0.7 * vk), 0.04);
    ctx.globalCompositeOperation = 'source-over';
    // white flash when it fails
    if (flash > 0.02) {
      ctx.fillStyle = rgba('#f4f0ff', flash * 0.45);
      ctx.fillRect(0, 0, w, h);
    }
  }

  // -------------------------------------------------------------------- TOWN
  // A western market town at evening, looking down the main street.
  function buildTown(w, h) {
    const u = Math.min(w, h), rng = mulberry(60), S = { w, h, u };
    const Pj = (S.Pj = camera(w, h, 0.5, 0.5, 0.8, 1.7));
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, h * 0.55, [[0, '#120c12'], [0.4, '#3a2030'], [0.8, '#9a5048'], [1, '#d8906a']]);
    a.fillRect(0, 0, w, h);
    const rows = makeRows(rng, w, h, u, {
      yHor: h * 0.42, yTop: -h * 0.05, n: 9, nearN: 0, pow: 1.4, bw: [0.05, 0.45], bh: [0.006, 0.06],
      far: { lit: '#f0b080', mid: '#b86a5a', dark: '#6a3640' }, near: { lit: '#8a4a50', mid: '#3a2028', dark: '#160c12' },
    });
    for (const r of rows) paintRow(a, r);
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, h * 0.45, u * 0.009, 'rgba(10,5,8,0.5)', (x, y) => 0.7 - y / (h * 0.4));
    a.globalCompositeOperation = 'source-over';
    // far end of the street: low roofs against the glow
    const far = skyline(rng, w * 0.3, w * 0.7, h * 0.51, u, { bw: 0.04, bh: 0.035, lights: 1 });
    fillSkyline(a, far, h, '#2a1820', '#d08a6a', u * 0.002, u * 0.002);
    // street and channel
    a.fillStyle = '#1d1718';
    quad3(a, Pj, [[-5, 0, 2], [5, 0, 2], [5, 0, 80], [-5, 0, 80]]);
    a.fill();
    a.fillStyle = lin(a, 0, h * 0.5, 0, h, [[0, 'rgba(216,144,106,0.35)'], [0.3, 'rgba(110,83,83,0.15)'], [1, 'rgba(0,0,0,0)']]);
    a.fillRect(0, h * 0.5, w, h * 0.5);
    a.strokeStyle = 'rgba(237,202,192,0.08)';
    a.lineWidth = u * 0.002;
    a.beginPath();
    for (let z = 3; z < 60; z *= 1.12) { const p0 = Pj(-3.2, 0, z), p1 = Pj(5, 0, z); a.moveTo(p0[0], p0[1]); a.lineTo(p1[0], p1[1]); }
    a.stroke();
    // channel: water strip along the left
    a.fillStyle = '#0e1012';
    quad3(a, Pj, [[-5, 0, 2], [-3.4, 0, 2], [-3.4, 0, 80], [-5, 0, 80]]);
    a.fill();
    a.fillStyle = '#4f4449';
    quad3(a, Pj, [[-3.4, 0.05, 2], [-3.1, 0.05, 2], [-3.1, 0.05, 80], [-3.4, 0.05, 80]]);
    a.fill();
    S.chan = { x0: -5, x1: -3.4 };

    // Buildings: rows along both sides, painted far to near.
    const side = (sgn) => {
      const list = [];
      let z = 4;
      while (z < 60) { const len = 4 + rng() * 4; list.push([z, z + len, 6 + rng() * 5, 2.4 + rng() * 2]); z += len; }
      return list.reverse();
    };
    S.windows = [];
    const facade = (sgn, z0, z1, H, pitch, guild) => {
      const X = 5 * sgn, Xb = X + sgn * 7;
      // gable end facing us
      a.fillStyle = '#2d292b';
      quad3(a, Pj, [[X, 0, z0], [Xb, 0, z0], [Xb, H, z0], [(X + Xb) / 2, H + pitch, z0], [X, H, z0]]);
      a.fill();
      a.strokeStyle = '#d0907a';
      a.lineWidth = u * 0.003;
      quad3(a, Pj, [[Xb, H, z0], [(X + Xb) / 2, H + pitch, z0], [X - sgn * 0.3, H - 0.25, z0]]);
      a.stroke();
      // facade on the street
      a.fillStyle = '#1d1718';
      quad3(a, Pj, [[X, 0, z0], [X, 0, z1], [X, H, z1], [X, H, z0]]);
      a.fill();
      // eave underside
      a.fillStyle = '#0c0808';
      quad3(a, Pj, [[X, H, z0], [X, H, z1], [X - sgn * 0.6, H - 0.3, z1], [X - sgn * 0.6, H - 0.3, z0]]);
      a.fill();
      // timber framing
      a.strokeStyle = '#0c0808';
      a.lineWidth = u * 0.004;
      a.beginPath();
      for (const yy of [3.2, H - 0.4]) { const p = Pj(X, yy, z0), q = Pj(X, yy, z1); a.moveTo(p[0], p[1]); a.lineTo(q[0], q[1]); }
      for (let zz = z0; zz <= z1 + 0.01; zz += (z1 - z0) / 3) { const p = Pj(X, 0, zz), q = Pj(X, H, zz); a.moveTo(p[0], p[1]); a.lineTo(q[0], q[1]); }
      a.stroke();
      // windows
      const nz = Math.max(2, Math.round((z1 - z0) / 1.8));
      for (let i = 0; i < nz; i++) {
        const za = z0 + ((z1 - z0) * (i + 0.3)) / nz, zb = za + ((z1 - z0) / nz) * 0.4;
        for (const [ya, yb] of [[4, 5.3], [1, 2.3]]) {
          if (yb > H - 0.6) continue;
          if (guild && ya < 3) continue;
          const lit = rng() < 0.6;
          a.fillStyle = lit ? '#f0a860' : '#2d292b';
          quad3(a, Pj, [[X, ya, za], [X, ya, zb], [X, yb, zb], [X, yb, za]]);
          a.fill();
          if (lit) {
            a.fillStyle = 'rgba(12,8,8,0.8)';
            const zm = (za + zb) / 2;
            quad3(a, Pj, [[X, ya, zm - 0.05], [X, ya, zm + 0.05], [X, yb, zm + 0.05], [X, yb, zm - 0.05]]);
            a.fill();
            const c = Pj(X, (ya + yb) / 2, (za + zb) / 2);
            S.windows.push([c[0], c[1], (u * 0.6) / ((za + zb) / 2), rng()]);
          }
        }
      }
    };
    const L = side(-1), Rr = side(1);
    // painter's order across both sides: far first
    const all = L.map((b) => [-1, ...b]).concat(Rr.map((b) => [1, ...b])).sort((p, q) => q[1] - p[1]);
    S.guildZ = null;
    for (const [sgn, z0, z1, H, pitch] of all) {
      const guild = sgn > 0 && z0 <= 9 && z1 > 9;
      facade(sgn, z0, z1, H, pitch, guild);
      if (guild) S.guildZ = [z0, z1];
    }
    // the Guild's awning on the right
    const gz0 = 6.2, gz1 = 11.5;
    for (let i = 0; i < 8; i++) {
      const za = lerp(gz0, gz1, i / 8), zb = lerp(gz0, gz1, (i + 1) / 8);
      a.fillStyle = i % 2 ? '#e2c2b6' : '#7a2a30';
      quad3(a, Pj, [[5, 3.4, za], [5, 3.4, zb], [3.4, 2.7, zb], [3.4, 2.7, za]]);
      a.fill();
      // scalloped valance
      const p0 = Pj(3.4, 2.7, za), p1 = Pj(3.4, 2.7, zb), pm = Pj(3.4, 2.35, (za + zb) / 2);
      a.beginPath();
      a.moveTo(p0[0], p0[1]);
      a.quadraticCurveTo(pm[0], pm[1] + (pm[1] - p0[1]) * 0.6, p1[0], p1[1]);
      a.closePath();
      a.fill();
    }
    a.fillStyle = 'rgba(12,8,8,0.75)';
    quad3(a, Pj, [[5, 0, gz0], [5, 0, gz1], [5, 2.7, gz1], [5, 2.7, gz0]]);
    a.fill();
    // warm doorway under the awning
    a.fillStyle = '#f0a860';
    quad3(a, Pj, [[5, 0, 8.2], [5, 0, 9.4], [5, 2.3, 9.4], [5, 2.3, 8.2]]);
    a.fill();
    S.windows.push([...Pj(5, 1.2, 8.8), u * 0.15, 0.3]);
    // hanging sign facing down the street
    const b0 = Pj(5, 4.4, 6), b1 = Pj(3.3, 4.4, 6);
    a.strokeStyle = P.ink;
    a.lineWidth = u * 0.006;
    a.beginPath();
    a.moveTo(b0[0], b0[1]);
    a.lineTo(b1[0], b1[1]);
    a.stroke();
    const q0 = Pj(3.45, 4.25, 6), q1 = Pj(4.75, 2.85, 6);
    const sx0 = Math.min(q0[0], q1[0]), sx1 = Math.max(q0[0], q1[0]), sy0 = q0[1], sy1 = q1[1];
    a.lineWidth = u * 0.003;
    a.beginPath();
    a.moveTo(sx0 + u * 0.01, b0[1]);
    a.lineTo(sx0 + u * 0.01, sy0);
    a.moveTo(sx1 - u * 0.01, b0[1]);
    a.lineTo(sx1 - u * 0.01, sy0);
    a.stroke();
    a.fillStyle = '#e8a070';
    a.fillRect(sx0 - u * 0.004, sy0 - u * 0.004, sx1 - sx0 + u * 0.008, sy1 - sy0 + u * 0.008);
    a.fillStyle = '#2a1a1c';
    a.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    emblem(a, (sx0 + sx1) / 2, (sy0 + sy1) / 2 - (sy1 - sy0) * 0.06, Math.min(sx1 - sx0, sy1 - sy0) * 0.4, '#edcac0', u * 0.004);
    // tone on the shadowed facades
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, h, u * 0.008, 'rgba(12,8,8,0.45)', (x, y) => Math.abs(x / w - 0.5) * 2 - 0.45);
    a.globalCompositeOperation = 'source-over';
    grain(a, w, h, 0.06);
    S.A = A;
    S.glowW = glow('#ffb060');
    // the water wheel: rim points in its plane (X = -4.2), centre Y 2, Z 8
    S.wheel = { X: -4.25, Y: 1.7, Z: 7.2, R: 2.0 };
    S.strings = [8.5, 15, 24].map((z) => ({ z, sag: 1 + rng() * 0.6, ph: rng() * TAU }));
    S.motes = makeMotes(rng, 30, { v: [-0.04, -0.01], r: [0.0015, 0.003] });
    return S;
  }
  function drawWheel(ctx, Pj, wh, t, u, col, rim, axis) {
    // axis 'x': wheel plane is X = const (seen from the street); 'z': facing the camera
    const pt = (r, a) => axis === 'x' ? Pj(wh.X, wh.Y + Math.sin(a) * r, wh.Z + Math.cos(a) * r) : Pj(wh.X + Math.cos(a) * r, wh.Y + Math.sin(a) * r, wh.Z);
    const rot = -t * 0.7;
    const ring = (r) => { ctx.beginPath(); for (let i = 0; i <= 40; i++) { const p = pt(r, (i / 40) * TAU); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); } };
    const c = pt(0, 0);
    const scale = Math.abs(pt(wh.R, Math.PI / 2)[1] - c[1]) / wh.R;
    ctx.lineCap = 'round';
    for (const [color, wmul] of [[rim, 1.9], [col, 1]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = scale * 0.16 * wmul;
      ring(wh.R);
      ctx.stroke();
      ring(wh.R * 0.78);
      ctx.stroke();
      ctx.lineWidth = scale * 0.1 * wmul;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const p = pt(wh.R * 0.78, rot + (i / 8) * TAU); ctx.moveTo(c[0], c[1]); ctx.lineTo(p[0], p[1]); }
      ctx.stroke();
      ctx.lineWidth = scale * 0.14 * wmul;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * TAU; const p = pt(wh.R * 0.78, a), q = pt(wh.R * 1.12, a); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); }
      ctx.stroke();
    }
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(c[0], c[1], scale * 0.25, 0, TAU);
    ctx.fill();
  }
  function drawTown(ctx, S, t) {
    const { w, h, u, Pj } = S;
    ctx.drawImage(S.A, 0, 0);
    // water shimmer in the channel
    ctx.strokeStyle = 'rgba(240,168,96,0.5)';
    ctx.lineWidth = u * 0.002;
    ctx.beginPath();
    for (let i = 0; i < 26; i++) {
      const z = 2.5 + ((i * 2.3 + t * 2.2) % 50), x = -4.9 + ((i * 0.37) % 1.4);
      const p = Pj(x, 0, z), q = Pj(x + 0.25, 0, z);
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    drawWheel(ctx, Pj, S.wheel, t, u, '#1d1214', '#c47a5e', 'x');
    // splash at the wheel's foot
    ctx.fillStyle = 'rgba(237,202,192,0.8)';
    for (let i = 0; i < 14; i++) {
      const ph = (t * 1.6 + i * 0.137) % 1, p = Pj(S.wheel.X + Math.sin(i) * 0.3, 0.1 + ph * 0.9 * (1 - ph) * 2, S.wheel.Z - 1.8 + (i % 5) * 0.2);
      ctx.globalAlpha = 1 - ph;
      ctx.fillRect(p[0], p[1], u * 0.004, u * 0.004);
    }
    ctx.globalAlpha = 1;
    // windows flicker
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r, k] of S.windows) {
      ctx.globalAlpha = 0.35 + 0.12 * Math.sin(t * (1.5 + k * 3) + k * 30);
      blob(ctx, S.glowW, x, y, Math.min(r, u * 0.2));
    }
    ctx.globalAlpha = 1;
    // strings of lanterns across the street, swaying
    for (const s of S.strings) {
      const sw = Math.sin(t * 0.9 + s.ph) * 0.25;
      const pts = [];
      for (let i = 0; i <= 14; i++) { const k = i / 14, X = lerp(-5, 5, k), Y = 6 - s.sag * (1 - (2 * k - 1) ** 2); pts.push(Pj(X, Y, s.z + sw * Math.sin(k * Math.PI))); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = u * 0.002;
      ctx.beginPath();
      poly(ctx, pts, false);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < 14; i += 1) {
        const p = pts[i], r = (u * 0.5) / s.z;
        ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3 + i * 1.7 + s.ph);
        blob(ctx, S.glowW, p[0], p[1] + r * 0.4, r * 1.6);
        ctx.fillStyle = '#ffe2b0';
        ctx.fillRect(p[0] - r * 0.12, p[1] + r * 0.2, r * 0.24, r * 0.34);
      }
    }
    ctx.globalAlpha = 1;
    drawMotes(ctx, S.motes, t, 0, h * 0.2, w, h * 0.9, u, ['#ffcf90'], 0.6, 0.03);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ TAVERN
  function buildTavern(w, h) {
    const u = Math.min(w, h), rng = mulberry(70), S = { w, h, u };
    const Pj = (S.Pj = camera(w, h, 0.5, 0.5, 0.75, 1.5));
    const A = mk(w, h), a = A.getContext('2d');
    const X0 = -7, X1 = 7, Y1 = 4.2, Z1 = 15;
    a.fillStyle = '#161212';
    a.fillRect(0, 0, w, h);
    // back wall, floor, side walls, ceiling
    a.fillStyle = '#2d292b';
    quad3(a, Pj, [[X0, 0, Z1], [X1, 0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]]);
    a.fill();
    a.fillStyle = '#1d1718';
    quad3(a, Pj, [[X0, 0, 1], [X1, 0, 1], [X1, 0, Z1], [X0, 0, Z1]]);
    a.fill();
    a.fillStyle = '#231c1d';
    quad3(a, Pj, [[X0, 0, 1], [X0, 0, Z1], [X0, Y1, Z1], [X0, Y1, 1]]);
    a.fill();
    quad3(a, Pj, [[X1, 0, 1], [X1, 0, Z1], [X1, Y1, Z1], [X1, Y1, 1]]);
    a.fill();
    a.fillStyle = '#100c0c';
    quad3(a, Pj, [[X0, Y1, 1], [X1, Y1, 1], [X1, Y1, Z1], [X0, Y1, Z1]]);
    a.fill();
    // floorboards
    a.strokeStyle = 'rgba(12,8,8,0.8)';
    a.lineWidth = u * 0.002;
    a.beginPath();
    for (let x = X0; x <= X1; x += 0.7) { const p = Pj(x, 0, 1), q = Pj(x, 0, Z1); a.moveTo(p[0], p[1]); a.lineTo(q[0], q[1]); }
    a.stroke();
    // hearth on the back wall, right of centre
    const hx = 2.6;
    a.fillStyle = '#3d3337';
    quad3(a, Pj, [[hx - 1.8, 0, Z1 - 0.05], [hx + 1.8, 0, Z1 - 0.05], [hx + 1.4, 2.4, Z1 - 0.05], [hx + 0.8, Y1, Z1 - 0.05], [hx - 0.8, Y1, Z1 - 0.05], [hx - 1.4, 2.4, Z1 - 0.05]]);
    a.fill();
    // stones
    a.strokeStyle = 'rgba(12,8,8,0.7)';
    a.lineWidth = u * 0.0025;
    a.beginPath();
    for (let y = 0.3; y < 4; y += 0.45) { const p = Pj(hx - 1.7, y, Z1 - 0.05), q = Pj(hx + 1.7, y, Z1 - 0.05); a.moveTo(p[0], p[1]); a.lineTo(q[0], q[1]); }
    a.stroke();
    a.fillStyle = '#0c0808';
    quad3(a, Pj, [[hx - 1.1, 0, Z1 - 0.1], [hx + 1.1, 0, Z1 - 0.1], [hx + 1.1, 1.3, Z1 - 0.1], [hx, 1.55, Z1 - 0.1], [hx - 1.1, 1.3, Z1 - 0.1]]);
    a.fill();
    // mantel
    a.fillStyle = '#4f4449';
    quad3(a, Pj, [[hx - 1.9, 1.7, Z1 - 0.3], [hx + 1.9, 1.7, Z1 - 0.3], [hx + 1.9, 1.9, Z1 - 0.3], [hx - 1.9, 1.9, Z1 - 0.3]]);
    a.fill();
    S.fire = Pj(hx, 0.45, Z1 - 0.2);
    S.fireS = (u * 0.75 * 1.0) / (Z1 - 0.2) * 1.5;
    // window on the back wall left: night outside
    a.fillStyle = '#1e2430';
    quad3(a, Pj, [[-5, 1.4, Z1 - 0.02], [-3, 1.4, Z1 - 0.02], [-3, 3.2, Z1 - 0.02], [-5, 3.2, Z1 - 0.02]]);
    a.fill();
    a.strokeStyle = '#0c0808';
    a.lineWidth = u * 0.006;
    quad3(a, Pj, [[-5, 1.4, Z1 - 0.02], [-3, 1.4, Z1 - 0.02], [-3, 3.2, Z1 - 0.02], [-5, 3.2, Z1 - 0.02]]);
    a.stroke();
    a.beginPath();
    const wm = Pj(-4, 1.4, Z1), wt = Pj(-4, 3.2, Z1), wl = Pj(-5, 2.3, Z1), wr = Pj(-3, 2.3, Z1);
    a.moveTo(wm[0], wm[1]); a.lineTo(wt[0], wt[1]); a.moveTo(wl[0], wl[1]); a.lineTo(wr[0], wr[1]);
    a.stroke();
    // shelves with jugs on the left wall
    a.fillStyle = '#0c0808';
    for (const y of [2.0, 2.9]) {
      quad3(a, Pj, [[X0, y, 5], [X0 + 0.4, y, 5], [X0 + 0.4, y, 12], [X0, y, 12]]);
      a.fill();
      for (let z = 5.3; z < 12; z += 0.55 + rng() * 0.5) {
        const p = Pj(X0 + 0.2, y, z), r = (u * 0.75 * 0.16) / z * (0.8 + rng() * 0.6);
        a.beginPath();
        a.ellipse(p[0], p[1] - r, r * 0.6, r, 0, 0, TAU);
        a.fill();
      }
    }
    // beams: cross beams and two long ones
    for (let z = 2.5; z < Z1; z += 2.2) {
      a.fillStyle = '#0c0808';
      quad3(a, Pj, [[X0, Y1 - 0.45, z], [X1, Y1 - 0.45, z], [X1, Y1, z], [X0, Y1, z]]);
      a.fill();
      a.fillStyle = '#4a3434';
      quad3(a, Pj, [[X0, Y1 - 0.45, z], [X1, Y1 - 0.45, z], [X1, Y1 - 0.45, z + 0.3], [X0, Y1 - 0.45, z + 0.3]]);
      a.fill();
    }
    for (const x of [-3.5, 3.5]) {
      a.fillStyle = '#0c0808';
      quad3(a, Pj, [[x - 0.25, Y1 - 0.3, 1], [x + 0.25, Y1 - 0.3, 1], [x + 0.25, Y1 - 0.3, Z1], [x - 0.25, Y1 - 0.3, Z1]]);
      a.fill();
    }
    // posts
    for (const [x, z] of [[-4.5, 6], [4.5, 6], [-4.5, 11], [4.5, 11]]) {
      a.fillStyle = '#0c0808';
      quad3(a, Pj, [[x - 0.18, 0, z], [x + 0.18, 0, z], [x + 0.18, Y1, z], [x - 0.18, Y1, z]]);
      a.fill();
      a.fillStyle = 'rgba(232,150,96,0.55)';
      quad3(a, Pj, [[x + 0.1, 0, z], [x + 0.18, 0, z], [x + 0.18, Y1 - 0.5, z], [x + 0.1, Y1 - 0.5, z]]);
      a.fill();
    }
    grain(a, w, h, 0.05);
    S.A = A;
    // Foreground: the long table and benches, silhouetted against the hearth
    const F = mk(w, h), f = F.getContext('2d');
    const tz0 = 3.2, tz1 = 13;
    const top = [[-1.1, 0.85, tz0], [1.1, 0.85, tz0], [1.1, 0.85, tz1], [-1.1, 0.85, tz1]];
    f.fillStyle = '#e09868';
    quad3(f, Pj, top.map(([x, y, z]) => [x, y + 0.03, z]));
    f.fill();
    f.fillStyle = '#2a1c1c';
    quad3(f, Pj, top);
    f.fill();
    f.fillStyle = P.ink;
    quad3(f, Pj, [[-1.1, 0.85, tz0], [1.1, 0.85, tz0], [1.1, 0.7, tz0], [-1.1, 0.7, tz0]]);
    f.fill();
    for (const [x, z] of [[-0.9, tz0 + 0.2], [0.9, tz0 + 0.2]]) { quad3(f, Pj, [[x - 0.1, 0, z], [x + 0.1, 0, z], [x + 0.1, 0.72, z], [x - 0.1, 0.72, z]]); f.fill(); }
    for (const sx of [-1, 1]) {
      const bx = sx * 1.7;
      f.fillStyle = P.ink;
      quad3(f, Pj, [[bx - 0.3, 0.45, tz0 - 0.3], [bx + 0.3, 0.45, tz0 - 0.3], [bx + 0.3, 0.45, tz1], [bx - 0.3, 0.45, tz1]]);
      f.fill();
      quad3(f, Pj, [[bx - 0.3, 0, tz0 - 0.3], [bx + 0.3, 0, tz0 - 0.3], [bx + 0.3, 0.45, tz0 - 0.3], [bx - 0.3, 0.45, tz0 - 0.3]]);
      f.fill();
    }
    // mugs and a candle on the table
    S.candles = [];
    for (let z = tz0 + 0.8; z < tz1; z += 1.1 + rng() * 0.8) {
      const x = (rng() - 0.5) * 1.6, p = Pj(x, 0.85, z), s = (u * 0.75 * 0.14) / z;
      f.fillStyle = P.ink;
      f.fillRect(p[0] - s * 0.5, p[1] - s * 1.2, s, s * 1.2);
      f.fillStyle = '#e09868';
      f.fillRect(p[0] + s * 0.3, p[1] - s * 1.2, s * 0.2, s * 1.2);
      if (rng() < 0.3) S.candles.push(Pj(x + 0.3, 1.05, z));
    }
    S.F = F;
    S.lamps = [[-2.2, 4.5], [2.2, 7.2], [-2.2, 9.6], [0, 12]].map(([x, z]) => ({ x, z, ph: rng() * TAU }));
    S.motes = makeMotes(rng, 40, { v: [-0.03, -0.01], r: [0.0012, 0.0025] });
    S.gF = glow('#ff9a48');
    S.gW = glow('#ffd8a0');
    return S;
  }
  function drawTavern(ctx, S, t) {
    const { w, h, u, Pj } = S;
    ctx.drawImage(S.A, 0, 0);
    const fl = 0.8 + 0.12 * Math.sin(t * 7.1) + 0.08 * Math.sin(t * 17.3);
    // hearth light over the room
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55 * fl;
    blob(ctx, S.gF, S.fire[0], S.fire[1], w * 0.45, h * 0.6);
    ctx.globalAlpha = fl;
    blob(ctx, S.gW, S.fire[0], S.fire[1], S.fireS * 1.4, S.fireS);
    ctx.globalCompositeOperation = 'source-over';
    // flames (cel tongues)
    const [fx, fy] = S.fire, s = S.fireS;
    for (const [col, k] of [['#e3263a', 1], ['#ff8a3a', 0.72], ['#ffe8b8', 0.4]]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(fx - s * 0.9 * k, fy + s * 0.25);
      for (let i = 0; i <= 6; i++) {
        const xx = fx - s * 0.9 * k + (i / 6) * s * 1.8 * k;
        const hgt = s * k * (1.1 + 0.6 * Math.sin(t * 9 + i * 1.9) * Math.sin(t * 3.3 + i)) * Math.sin(((i + 0.5) / 7) * Math.PI);
        ctx.lineTo(xx - s * 0.08, fy - hgt);
        ctx.lineTo(xx + s * 0.1, fy - hgt * 0.4);
      }
      ctx.lineTo(fx + s * 0.9 * k, fy + s * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    // hanging lanterns, swaying
    for (const L of S.lamps) {
      const sw = Math.sin(t * 1.2 + L.ph) * 0.12;
      const top = Pj(L.x, 3.75, L.z), p = Pj(L.x + sw, 2.9, L.z), r = (u * 0.75 * 0.22) / L.z;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = u * 0.002;
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.lineTo(p[0], p[1] - r);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.65 + 0.1 * Math.sin(t * 5 + L.ph);
      blob(ctx, S.gF, p[0], p[1], r * 7);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = P.ink;
      ctx.fillRect(p[0] - r * 0.7, p[1] - r, r * 1.4, r * 2);
      ctx.fillStyle = '#ffdca0';
      ctx.fillRect(p[0] - r * 0.45, p[1] - r * 0.7, r * 0.9, r * 1.4);
    }
    ctx.drawImage(S.F, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const c of S.candles) {
      ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 8 + c[0]);
      blob(ctx, S.gW, c[0], c[1], u * 0.05);
    }
    ctx.globalAlpha = 1;
    drawMotes(ctx, S.motes, t, w * 0.2, h * 0.1, w * 0.9, h * 0.8, u, ['#ffcf90', '#edcac0'], 0.5, 0.03);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ FOREST
  function buildForest(w, h) {
    const u = Math.min(w, h), rng = mulberry(90), S = { w, h, u };
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, h, [[0, '#3a2a36'], [0.3, '#7a5058'], [0.5, '#5a4a4a'], [0.62, '#2a302c'], [1, '#121614']]);
    a.fillRect(0, 0, w, h);
    a.globalCompositeOperation = 'lighter';
    a.globalAlpha = 0.5;
    blob(a, glow('#e0a080'), w * 0.3, h * 0.35, w * 0.35, h * 0.3);
    a.globalAlpha = 1;
    a.globalCompositeOperation = 'source-over';
    // background tree layers
    const layers = [['#4a4648', 0.035, 0.5, 0.25], ['#2f3330', 0.05, 0.56, 0.4], ['#1c201e', 0.07, 0.6, 0.6]];
    for (const [col, tw, base, dens] of layers) {
      a.fillStyle = col;
      for (let x = -u * 0.05; x < w + u * 0.05; x += u * tw * (2 + rng() * 3) / dens) {
        const ww = u * tw * (0.5 + rng() * 0.7);
        a.fillRect(x, 0, ww, h * base + rng() * h * 0.05);
      }
      fillRidge(a, ridge(rng, w, h * base, u * 0.02, 3), w, h, col, w / 80);
    }
    // canopy across the top
    a.fillStyle = '#0e100f';
    a.beginPath();
    a.rect(0, 0, w, h * 0.06);
    for (let i = 0; i < 40; i++) {
      const x = rng() * w, cxk = Math.abs(x / w - 0.42);
      const r = u * (0.06 + rng() * 0.1) * (0.6 + cxk * 1.5);
      const y = h * 0.02 + rng() * h * 0.1 * (0.5 + cxk * 2);
      a.moveTo(x + r, y);
      a.arc(x, y, r, 0, TAU);
    }
    a.fill();
    // ground: clearing with a lit patch
    fillRidge(a, ridge(rng, w, h * 0.62, u * 0.01, 2), w, h, '#1e2420', w / 80);
    a.fillStyle = '#3d4741';
    a.beginPath();
    a.ellipse(w * 0.4, h * 0.72, w * 0.3, h * 0.07, -0.05, 0, TAU);
    a.fill();
    a.fillStyle = '#56645a';
    a.beginPath();
    a.ellipse(w * 0.36, h * 0.71, w * 0.17, h * 0.035, -0.05, 0, TAU);
    a.fill();
    // ancient masonry on the right: a broken wall and an arch stub, moss on top
    const block = (x, y, bw, bh, lit) => {
      a.fillStyle = '#5c5654';
      a.fillRect(x, y, bw, bh);
      a.fillStyle = '#2f2b2c';
      a.fillRect(x + bw * 0.12, y + bh * 0.2, bw * 0.88, bh * 0.8);
      a.strokeStyle = P.ink;
      a.lineWidth = u * 0.003;
      a.strokeRect(x, y, bw, bh);
      if (lit) { a.fillStyle = '#4a5a40'; a.beginPath(); a.ellipse(x + bw * 0.5, y + bh * 0.04, bw * 0.55, bh * 0.16, 0, Math.PI, 0); a.fill(); }
    };
    const wx = w * 0.66, wy = h * 0.66, bs = u * 0.07;
    const heights = [5, 6, 4, 3, 3, 2, 1];
    heights.forEach((n, i) => {
      for (let j = 0; j < n; j++) {
        const off = j % 2 ? bs * 0.5 : 0;
        block(wx + i * bs + off - bs * 0.25, wy - (j + 1) * bs * 0.62, bs * (0.9 + rng() * 0.2), bs * 0.62, j === n - 1);
      }
    });
    // a broken column standing behind the wall
    const cx0 = wx + bs * 0.4, cb = wy - bs * 3.0, cw2 = bs * 0.75;
    a.fillStyle = '#6a6462';
    a.beginPath();
    a.moveTo(cx0, cb);
    a.lineTo(cx0, cb - bs * 2.4);
    a.lineTo(cx0 + cw2 * 0.4, cb - bs * 2.7);
    a.lineTo(cx0 + cw2 * 0.6, cb - bs * 2.35);
    a.lineTo(cx0 + cw2, cb - bs * 2.5);
    a.lineTo(cx0 + cw2, cb);
    a.closePath();
    a.fill();
    a.fillStyle = '#2f2b2c';
    a.fillRect(cx0 + cw2 * 0.35, cb - bs * 2.35, cw2 * 0.65, bs * 2.35);
    a.strokeStyle = 'rgba(12,8,8,0.6)';
    a.lineWidth = u * 0.002;
    a.beginPath();
    for (let i = 1; i < 4; i++) { a.moveTo(cx0 + (cw2 * i) / 4, cb); a.lineTo(cx0 + (cw2 * i) / 4, cb - bs * 2.3); }
    a.stroke();
    a.fillStyle = '#4a5a40';
    a.beginPath();
    a.ellipse(cx0 + cw2 * 0.45, cb - bs * 2.45, cw2 * 0.45, bs * 0.12, -0.2, 0, TAU);
    a.fill();
    // a fallen carved block
    a.save();
    a.translate(wx - bs * 1.4, wy + bs * 0.1);
    a.rotate(-0.18);
    block(-bs * 0.6, -bs * 0.7, bs * 1.3, bs * 0.75, true);
    a.strokeStyle = 'rgba(237,202,192,0.4)';
    a.lineWidth = u * 0.002;
    a.beginPath();
    a.arc(0, -bs * 0.32, bs * 0.2, 0, TAU);
    a.moveTo(-bs * 0.35, -bs * 0.32);
    a.lineTo(bs * 0.35, -bs * 0.32);
    a.stroke();
    a.restore();
    // the fallen trunk across the clearing
    const tr = (p0, p1, r0, r1) => {
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
      const path = (k, off) => {
        a.beginPath();
        a.moveTo(p0[0] + nx * r0 * k, p0[1] + ny * r0 * k + off);
        a.lineTo(p1[0] + nx * r1 * k, p1[1] + ny * r1 * k + off);
        a.lineTo(p1[0] - nx * r1 * k, p1[1] - ny * r1 * k + off);
        a.lineTo(p0[0] - nx * r0 * k, p0[1] - ny * r0 * k + off);
        a.closePath();
        a.fill();
      };
      a.fillStyle = '#0c0d0c';
      path(1.08, 0);
      a.fillStyle = '#2b2321';
      path(1, 0);
      a.fillStyle = '#5b4c45';
      a.beginPath();
      a.moveTo(p0[0] - nx * r0, p0[1] - ny * r0);
      a.lineTo(p1[0] - nx * r1, p1[1] - ny * r1);
      a.lineTo(p1[0] - nx * r1 * 0.45, p1[1] - ny * r1 * 0.45);
      a.lineTo(p0[0] - nx * r0 * 0.45, p0[1] - ny * r0 * 0.45);
      a.closePath();
      a.fill();
      // moss along the top
      a.fillStyle = '#4a5640';
      a.beginPath();
      for (let i = 0; i <= 12; i++) {
        const k = i / 12, x = lerp(p0[0], p1[0], k) - nx * lerp(r0, r1, k) * 0.95, y = lerp(p0[1], p1[1], k) - ny * lerp(r0, r1, k) * 0.95;
        a.moveTo(x + u * 0.02, y);
        a.ellipse(x, y, u * (0.02 + rng() * 0.02), u * 0.01, Math.atan2(dy, dx), 0, TAU);
      }
      a.fill();
      // bark lines
      a.strokeStyle = 'rgba(12,8,8,0.7)';
      a.lineWidth = u * 0.0025;
      a.beginPath();
      for (let i = 0; i < 9; i++) {
        const o = (rng() - 0.5) * 1.4, k0 = rng() * 0.8, k1 = k0 + 0.1 + rng() * 0.2;
        a.moveTo(lerp(p0[0], p1[0], k0) + nx * r0 * o, lerp(p0[1], p1[1], k0) + ny * r0 * o);
        a.lineTo(lerp(p0[0], p1[0], k1) + nx * r0 * o, lerp(p0[1], p1[1], k1) + ny * r0 * o);
      }
      a.stroke();
      // broken end with rings
      a.fillStyle = '#6e5d50';
      a.beginPath();
      a.ellipse(p1[0], p1[1], r1 * 0.45, r1, Math.atan2(dy, dx), 0, TAU);
      a.fill();
      a.strokeStyle = '#3a302a';
      a.lineWidth = u * 0.002;
      for (const k of [0.65, 0.35]) { a.beginPath(); a.ellipse(p1[0], p1[1], r1 * 0.45 * k, r1 * k, Math.atan2(dy, dx), 0, TAU); a.stroke(); }
    };
    tr([w * 0.04, h * 0.66], [w * 0.5, h * 0.6], u * 0.07, u * 0.055);
    // foreground ferns and roots in the corners
    a.fillStyle = '#070807';
    for (const [cx, dir] of [[w * 0.02, 1], [w * 0.98, -1]]) {
      a.beginPath();
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI / 2 + dir * (0.1 + i * 0.17), L = u * (0.2 + rng() * 0.15);
        const ex = cx + Math.cos(ang) * L, ey = h + Math.sin(ang) * L;
        a.moveTo(cx, h);
        a.quadraticCurveTo(cx + Math.cos(ang - dir * 0.4) * L * 0.6, h + Math.sin(ang - dir * 0.4) * L * 0.6, ex, ey);
        a.quadraticCurveTo(cx + Math.cos(ang + dir * 0.1) * L * 0.5, h + Math.sin(ang + dir * 0.1) * L * 0.5, cx + dir * u * 0.02, h);
      }
      a.fill();
    }
    // near trunks framing
    a.fillStyle = '#0a0b0a';
    a.fillRect(w * 0.0, 0, u * 0.09, h);
    a.fillRect(w * 0.92, 0, w * 0.08 + 2, h);
    a.fillStyle = 'rgba(216,198,184,0.5)';
    a.fillRect(w * 0.92, 0, u * 0.004, h);
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, h, u * 0.008, 'rgba(8,10,9,0.5)', (x, y) => Math.max(1 - y / (h * 0.25), Math.abs(x / w - 0.45) * 2.2 - 0.7));
    a.globalCompositeOperation = 'source-over';
    grain(a, w, h, 0.06);
    S.A = A;
    // light shafts from the upper left
    const SH = mk(w, h), s = SH.getContext('2d');
    s.globalCompositeOperation = 'lighter';
    for (const [x0, ww, al] of [[0.18, 0.05, 0.3], [0.27, 0.025, 0.4], [0.33, 0.07, 0.22], [0.45, 0.03, 0.3]]) {
      s.fillStyle = lin(s, w * x0, 0, w * x0 + w * 0.2, h * 0.75, [[0, rgba('#ffd8b0', al)], [1, rgba('#ffd8b0', 0)]]);
      s.beginPath();
      s.moveTo(w * x0, 0);
      s.lineTo(w * (x0 + ww), 0);
      s.lineTo(w * (x0 + ww * 2.2 + 0.22), h * 0.78);
      s.lineTo(w * (x0 + 0.2), h * 0.78);
      s.closePath();
      s.fill();
    }
    S.SH = SH;
    S.motes = makeMotes(rng, 50, { v: [-0.02, 0.02], r: [0.0012, 0.0028] });
    return S;
  }
  function drawForest(ctx, S, t) {
    const { w, h, u } = S;
    ctx.drawImage(S.A, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.6);
    ctx.drawImage(S.SH, 0, 0);
    ctx.globalAlpha = 1;
    drawMotes(ctx, S.motes, t, w * 0.2, h * 0.1, w * 0.65, h * 0.75, u, ['#ffe6c8', '#d8c6b8'], 0.8, 0.03);
    ctx.globalCompositeOperation = 'source-over';
  }

  // -------------------------------------------------------------------- ROAD
  function buildRoad(w, h) {
    const u = Math.min(w, h), rng = mulberry(100), S = { w, h, u };
    const hz = h * 0.52;
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, hz, [[0, '#1a1018'], [0.45, '#4a2a34'], [0.85, '#b06a58'], [1, '#e8a476']]);
    a.fillRect(0, 0, w, h);
    const rows = makeRows(rng, w, h, u, {
      yHor: hz - h * 0.06, yTop: -h * 0.04, n: 8, nearN: 3, pow: 1.5, bw: [0.05, 0.55], bh: [0.006, 0.065],
      sunX: w * 0.72, sunW: w * 0.45, haze: '#e8a476',
      far: { lit: '#ffd0a0', mid: '#c8786a', dark: '#7a3e46' }, near: { lit: '#9a5a5a', mid: '#3e2230', dark: '#1a0e14' },
    });
    for (let i = 0; i < rows.length - 3; i++) paintRow(a, rows[i]);
    // far hills, the town's first roofs, then the fields in front of them
    fillRidge(a, ridge(rng, w, hz + h * 0.01, u * 0.012, 3), w, h, '#5a3c40', w / 100);
    const tb = hz + h * 0.1;
    const town = skyline(rng, w * 0.56, w * 0.94, tb + h * 0.02, u, { bw: 0.07, bh: 0.09, lights: 2 });
    fillSkyline(a, town, h, '#1d1214', '#e8a070', u * 0.003, u * 0.003);
    S.lights = town.lights.filter((l) => l[1] < tb - u * 0.01);
    S.smoke = town.chims.slice(0, 5).map((c) => [c[0] + c[2] / 2, c[1]]);
    if (S.smoke.length < 3) S.smoke.push([w * 0.68, tb - u * 0.12], [w * 0.82, tb - u * 0.13]);
    for (const [x, y] of S.lights) { a.fillStyle = '#f0a860'; a.fillRect(x - u * 0.004, y - u * 0.005, u * 0.008, u * 0.01); }
    const f2 = (x) => tb + Math.sin(x * 0.004 / (u / 780)) * u * 0.006 + (x < w * 0.5 ? (w * 0.5 - x) * -0.03 : 0);
    fillRidge(a, f2, w, h, '#b88068', w / 100);
    fillRidge(a, (x) => f2(x) + u * 0.004, w, h, '#4a3634', w / 100);
    a.strokeStyle = 'rgba(12,8,8,0.35)';
    a.lineWidth = u * 0.002;
    a.beginPath();
    for (let i = 0; i < 16; i++) { const y = tb + h * 0.015 + i * i * h * 0.0016; a.moveTo(w * 0.35, y); a.lineTo(w, y + h * 0.01); }
    a.stroke();
    // the road: from the bottom left, curving away to the town
    a.fillStyle = '#8a7066';
    a.beginPath();
    a.moveTo(w * 0.05, h * 1.01);
    a.bezierCurveTo(w * 0.3, h * 0.78, w * 0.48, h * 0.66, w * 0.6, tb + u * 0.004);
    a.lineTo(w * 0.612, tb + u * 0.004);
    a.bezierCurveTo(w * 0.56, h * 0.7, w * 0.6, h * 0.85, w * 0.66, h * 1.01);
    a.closePath();
    a.fill();
    a.fillStyle = 'rgba(12,8,8,0.35)';
    a.beginPath();
    a.moveTo(w * 0.32, h * 1.01);
    a.bezierCurveTo(w * 0.42, h * 0.8, w * 0.52, h * 0.7, w * 0.604, tb + u * 0.004);
    a.lineTo(w * 0.607, tb + u * 0.004);
    a.bezierCurveTo(w * 0.53, h * 0.72, w * 0.46, h * 0.85, w * 0.38, h * 1.01);
    a.fill();
    // fence posts along the road
    a.fillStyle = P.ink;
    for (let i = 0; i < 9; i++) {
      const k = i / 9, x = lerp(w * 0.7, w * 0.618, Math.sqrt(k)), y = lerp(h * 0.98, tb + h * 0.01, Math.sqrt(k)), s = lerp(1, 0.1, Math.sqrt(k));
      a.fillRect(x, y - u * 0.09 * s, u * 0.012 * s, u * 0.09 * s);
      if (i) { a.fillRect(x, y - u * 0.07 * s, (w * 0.7 - x) * 0 + u * 0.06 * s, u * 0.006 * s); }
    }
    // grass bank at the bottom
    fillRidge(a, ridge(rng, w, h * 0.93, u * 0.02, 3), w, h, '#0e100e', w / 80);
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, h, u * 0.009, 'rgba(10,6,8,0.5)', (x, y) => Math.max(0.7 - y / (h * 0.4), 0.6 - x / (w * 0.5)));
    a.globalCompositeOperation = 'source-over';
    grain(a, w, h, 0.06);
    S.A = A;
    const N = mk(w, h), n = N.getContext('2d');
    for (let i = rows.length - 3; i < rows.length; i++) paintRow(n, rows[i]);
    S.N = N;
    // the forest edge, over the drifting clouds
    const FE = mk(w, h), e = FE.getContext('2d');
    // forest edge on the left: trunks, canopy overhanging the top
    const fe = (x0, x1, col) => {
      e.fillStyle = col;
      for (let x = x0; x < x1; x += u * (0.05 + rng() * 0.08)) { const tw = u * (0.015 + rng() * 0.04); e.fillRect(x, 0, tw, h * (0.62 + rng() * 0.2)); }
    };
    fe(-u * 0.05, w * 0.22, '#1d1c1c');
    conifers(e, rng, -u * 0.1, w * 0.28, h * 0.7, u, 0.3, 0.55, h, '#141414', '#c08a70', u * 0.002, u * 0.002);
    fe(-u * 0.05, w * 0.12, '#0a0a0a');
    e.fillStyle = '#080808';
    e.beginPath();
    e.rect(0, 0, w * 0.45, h * 0.04);
    for (let i = 0; i < 26; i++) {
      const x = rng() * w * 0.48, r = u * (0.05 + rng() * 0.1) * (1.2 - x / (w * 0.5));
      const y = rng() * h * 0.12 * (1.4 - x / (w * 0.5));
      e.moveTo(x + r, y);
      e.arc(x, y, r, 0, TAU);
    }
    e.fill();
    e.fillRect(0, 0, u * 0.12, h);
    fillRidge(e, (x) => h * 0.7 + Math.max(0, x - w * 0.12) * 0.35 + Math.sin(x * 0.03) * u * 0.008, w * 0.45, h, '#0c0b0b', w / 120);
    e.globalCompositeOperation = 'source-atop';
    tone(e, 0, 0, w * 0.5, h, u * 0.009, 'rgba(60,40,40,0.35)', (x, y) => 0.5 - Math.abs(y / h - 0.45));
    e.globalCompositeOperation = 'source-over';
    S.FE = FE;
    S.puffs = [];
    for (let i = 0; i < 60; i++) S.puffs.push([Math.floor(rng() * S.smoke.length), rng(), 0.5 + rng() * 0.5]);
    S.gS = glow('#7a5a60');
    S.gW = glow('#ffb060');
    return S;
  }
  function drawRoad(ctx, S, t) {
    const { w, h, u } = S;
    ctx.drawImage(S.A, 0, 0);
    const off = (t * u * 0.01) % w;
    ctx.drawImage(S.N, -off, 0);
    ctx.drawImage(S.N, w - off, 0);
    ctx.drawImage(S.FE, 0, 0);
    // kitchen smoke rising and leaning with the wind
    for (const [ci, ph, sz] of S.puffs) {
      const [x0, y0] = S.smoke[ci];
      const p = (t * 0.12 * sz + ph) % 1;
      const x = x0 + p * p * u * 0.25 + Math.sin(t * 0.8 + ph * 9) * u * 0.006, y = y0 - p * u * 0.3;
      ctx.globalAlpha = (1 - p) * Math.min(1, p * 6) * 0.55;
      blob(ctx, S.gS, x, y, u * (0.012 + p * 0.06) * sz);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of S.lights) {
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * (2 + r * 3) + r * 30);
      blob(ctx, S.gW, x, y, u * 0.02);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ MARKET
  function buildMarket(w, h) {
    const u = Math.min(w, h), rng = mulberry(120), S = { w, h, u };
    const Pj = (S.Pj = camera(w, h, 0.5, 0.52, 0.85, 1.6));
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, h * 0.5, [[0, '#4f4449'], [0.6, '#a8948e'], [1, '#d8c4ba']]);
    a.fillRect(0, 0, w, h);
    const rows = makeRows(rng, w, h, u, {
      yHor: h * 0.44, yTop: -h * 0.04, n: 7, nearN: 3, pow: 1.5, bw: [0.06, 0.55], bh: [0.006, 0.05], haze: '#d8c4ba',
      far: { lit: '#f2e4da', mid: '#c8b4ac', dark: '#a08c88' }, near: { lit: '#a89490', mid: '#6e6064', dark: '#4a4046' },
    });
    for (let i = 0; i < rows.length - 3; i++) paintRow(a, rows[i]);
    // far end: buildings and the market hall roof
    const far = skyline(rng, w * 0.3, w * 0.7, h * 0.5, u, { bw: 0.05, bh: 0.06 });
    fillSkyline(a, far, h, '#6e6064', '#d8c4ba', u * 0.002, u * 0.002);
    // paving
    a.fillStyle = '#6e6064';
    quad3(a, Pj, [[-8, 0, 1.5], [8, 0, 1.5], [8, 0, 60], [-8, 0, 60]]);
    a.fill();
    a.fillStyle = lin(a, 0, h * 0.5, 0, h, [[0, 'rgba(216,196,186,0.4)'], [1, 'rgba(45,41,43,0.5)']]);
    a.fillRect(0, h * 0.5, w, h * 0.5);
    a.strokeStyle = 'rgba(29,23,24,0.25)';
    a.lineWidth = u * 0.002;
    a.beginPath();
    for (let x = -8; x <= 8; x += 1) { const p = Pj(x, 0, 1.5), q = Pj(x, 0, 60); a.moveTo(p[0], p[1]); a.lineTo(q[0], q[1]); }
    a.stroke();
    S.A = A;
    const N = mk(w, h), n = N.getContext('2d');
    for (let i = rows.length - 3; i < rows.length; i++) paintRow(n, rows[i]);
    S.N = N;
    // Stalls (foreground layer, over the drifting clouds).
    const F = mk(w, h), f = F.getContext('2d');
    const canv = ['#edcac0', '#997d7b', '#e8dcd2', '#6e5353', '#c8b0a8'];
    const stalls = [];
    for (const sgn of [-1, 1]) for (let z = 3.5; z < 40; z += 3.6 + rng() * 1.2) stalls.push([sgn, z, canv[Math.floor(rng() * canv.length)], rng()]);
    stalls.sort((p, q) => q[1] - p[1]);
    S.bunting = [];
    for (const [sgn, z, col, r] of stalls) {
      if (sgn > 0 && z < 6) continue; // tea stall stands here
      const z1 = z + 3;
      const xo = sgn * 2.4, xi = sgn * 5.2, yf = 2.5, yb = 3.4;
      // counter and goods
      f.fillStyle = '#2d292b';
      quad3(f, Pj, [[xo + sgn * 0.2, 0, z], [xo + sgn * 0.2, 0, z1], [xo + sgn * 0.2, 0.95, z1], [xo + sgn * 0.2, 0.95, z]]);
      f.fill();
      f.fillStyle = '#1d1718';
      quad3(f, Pj, [[xo, 0, z], [xi, 0, z], [xi, 2.6, z], [xo, 2.6, z]]);
      f.fill();
      f.fillStyle = '#4f4449';
      quad3(f, Pj, [[xo, 0.95, z], [xi, 0.95, z], [xi, 0.95, z1], [xo, 0.95, z1]]);
      f.fill();
      for (let k = 0; k < 6; k++) {
        const zz = z + 0.3 + k * 0.45, p = Pj(xo + sgn * 0.5, 0.95, zz), rr = (u * 0.85 * 0.16) / zz;
        f.fillStyle = ['#8e1621', '#997d7b', '#edcac0', '#4f4449'][(k + Math.floor(r * 4)) % 4];
        f.beginPath();
        f.arc(p[0], p[1] - rr * 0.6, rr * 0.6, 0, TAU);
        f.fill();
      }
      // canopy: underside shadow then the striped top seen from below edge
      f.fillStyle = '#2d292b';
      quad3(f, Pj, [[xo - sgn * 0.3, yf, z], [xi, yb, z], [xi, yb, z1], [xo - sgn * 0.3, yf, z1]]);
      f.fill();
      for (let k = 0; k < 6; k++) {
        const za = lerp(z, z1, k / 6), zb = lerp(z, z1, (k + 1) / 6);
        f.fillStyle = k % 2 ? col : mixHex(col, '#1d1718', 0.35);
        quad3(f, Pj, [[xo - sgn * 0.3, yf, za], [xo - sgn * 0.3, yf, zb], [xo - sgn * 0.3, yf - 0.35, zb], [xo - sgn * 0.3, yf - 0.35, za]]);
        f.fill();
        const p0 = Pj(xo - sgn * 0.3, yf - 0.35, za), p1 = Pj(xo - sgn * 0.3, yf - 0.35, zb), pm = Pj(xo - sgn * 0.3, yf - 0.6, (za + zb) / 2);
        f.beginPath();
        f.moveTo(p0[0], p0[1]);
        f.quadraticCurveTo(pm[0], pm[1], p1[0], p1[1]);
        f.fill();
      }
      // front gable end of the canopy (we see it edge-on from the aisle)
      f.fillStyle = col;
      quad3(f, Pj, [[xo - sgn * 0.3, yf, z], [xi, yb, z], [xi, yb + 0.15, z], [xo - sgn * 0.3, yf + 0.15, z]]);
      f.fill();
      // poles
      f.fillStyle = P.ink;
      for (const zz of [z, z1]) { quad3(f, Pj, [[xo - 0.06, 0, zz], [xo + 0.06, 0, zz], [xo + 0.06, yf, zz], [xo - 0.06, yf, zz]]); f.fill(); }
      if (sgn < 0 && z < 30) S.bunting.push(z + 0.2);
    }
    // a few townsfolk in the aisle
    for (let i = 0; i < 9; i++) {
      const z = 5 + rng() * 26, x = (rng() - 0.5) * 3.2, p = Pj(x, 0, z), s = (u * 0.85 * 1.7) / z;
      f.fillStyle = mix('#1d1718', '#6e6064', clamp((z - 5) / 30, 0, 0.8));
      f.beginPath();
      f.moveTo(p[0] - s * 0.15, p[1]);
      f.lineTo(p[0] - s * 0.13, p[1] - s * 0.8);
      f.quadraticCurveTo(p[0], p[1] - s * 0.9, p[0] + s * 0.13, p[1] - s * 0.8);
      f.lineTo(p[0] + s * 0.15, p[1]);
      f.closePath();
      f.fill();
      f.beginPath();
      f.arc(p[0], p[1] - s * 0.9, s * 0.08, 0, TAU);
      f.fill();
    }
    // the tea stall, front right
    {
      const z0 = 2.4, z1 = 5.4, xo = 1.9, xi = 4.6;
      f.fillStyle = '#1d1718';
      quad3(f, Pj, [[xo, 0, z0], [xi, 0, z0], [xi, 1.0, z0], [xo, 1.0, z0]]);
      f.fill();
      f.fillStyle = '#e8dcd2';
      quad3(f, Pj, [[xo, 1.0, z0], [xi, 1.0, z0], [xi, 1.0, z1], [xo, 1.0, z1]]);
      f.fill();
      f.fillStyle = '#0c0808';
      quad3(f, Pj, [[xo, 1.0, z0], [xi, 1.0, z0], [xi, 0.94, z0], [xo, 0.94, z0]]);
      f.fill();
      // kettle on a little brazier
      const k = Pj(2.6, 1.0, z0 + 0.7), s = (u * 0.85) / (z0 + 0.7);
      f.fillStyle = '#0c0808';
      f.fillRect(k[0] - s * 0.22, k[1] - s * 0.22, s * 0.44, s * 0.22);
      f.fillStyle = '#e3263a';
      f.fillRect(k[0] - s * 0.16, k[1] - s * 0.2, s * 0.32, s * 0.05);
      f.fillStyle = '#2d292b';
      f.beginPath();
      f.ellipse(k[0], k[1] - s * 0.38, s * 0.2, s * 0.16, 0, 0, TAU);
      f.fill();
      f.fillStyle = '#edcac0';
      f.fillRect(k[0] - s * 0.17, k[1] - s * 0.44, s * 0.04, s * 0.1);
      f.strokeStyle = '#2d292b';
      f.lineWidth = s * 0.05;
      f.beginPath();
      f.moveTo(k[0] + s * 0.16, k[1] - s * 0.4);
      f.lineTo(k[0] + s * 0.34, k[1] - s * 0.55);
      f.stroke();
      f.beginPath();
      f.arc(k[0], k[1] - s * 0.52, s * 0.12, Math.PI, 0);
      f.stroke();
      S.spout = [k[0] + s * 0.34, k[1] - s * 0.56, s];
      // cups
      for (let i = 0; i < 4; i++) {
        const c = Pj(3.2 + i * 0.3, 1.0, z0 + 0.4 + (i % 2) * 0.3), cs = (u * 0.85 * 0.09) / (z0 + 0.5);
        f.fillStyle = '#edcac0';
        f.fillRect(c[0] - cs * 0.5, c[1] - cs, cs, cs);
        f.fillStyle = '#6e5353';
        f.fillRect(c[0] - cs * 0.5, c[1] - cs, cs, cs * 0.2);
      }
      // canopy over the tea stall: low, close, and dark beneath
      f.fillStyle = '#1d1718';
      quad3(f, Pj, [[xo - 0.4, 2.3, z0], [xi + 2, 3.2, z0], [xi + 2, 3.2, z1], [xo - 0.4, 2.3, z1]]);
      f.fill();
      for (let i = 0; i < 5; i++) {
        const xa = lerp(xo - 0.4, xi + 2, i / 5), xb = lerp(xo - 0.4, xi + 2, (i + 1) / 5);
        const ya = lerp(2.3, 3.2, i / 5), yb2 = lerp(2.3, 3.2, (i + 1) / 5);
        f.fillStyle = i % 2 ? '#8e1621' : '#edcac0';
        quad3(f, Pj, [[xa, ya, z0], [xb, yb2, z0], [xb, yb2 - 0.45, z0], [xa, ya - 0.45, z0]]);
        f.fill();
      }
      f.fillStyle = P.ink;
      quad3(f, Pj, [[xo - 0.35, 0, z0], [xo - 0.25, 0, z0], [xo - 0.25, 2.3, z0], [xo - 0.35, 2.3, z0]]);
      f.fill();
      // a hanging cup-shaped sign
      const sg = Pj(xo + 0.3, 1.75, z0);
      f.fillStyle = '#edcac0';
      f.beginPath();
      f.arc(sg[0], sg[1], u * 0.035, 0, TAU);
      f.fill();
      f.fillStyle = '#2d292b';
      f.fillRect(sg[0] - u * 0.015, sg[1] - u * 0.008, u * 0.03, u * 0.02);
      f.fillRect(sg[0] + u * 0.012, sg[1] - u * 0.004, u * 0.008, u * 0.01);
    }
    // left foreground canopy edge framing the top-left
    f.fillStyle = '#2d292b';
    f.beginPath();
    f.moveTo(0, 0);
    f.lineTo(w * 0.24, 0);
    f.lineTo(w * 0.14, h * 0.12);
    f.lineTo(0, h * 0.2);
    f.fill();
    for (let i = 0; i < 6; i++) {
      f.fillStyle = i % 2 ? '#997d7b' : '#edcac0';
      const x0 = (w * 0.15 * i) / 6;
      f.beginPath();
      f.moveTo(lerp(0, w * 0.14, i / 6), lerp(h * 0.2, h * 0.12, i / 6));
      f.lineTo(lerp(0, w * 0.14, (i + 1) / 6), lerp(h * 0.2, h * 0.12, (i + 1) / 6));
      f.lineTo(lerp(0, w * 0.14, (i + 1) / 6), lerp(h * 0.2, h * 0.12, (i + 1) / 6) + h * 0.05);
      f.quadraticCurveTo(lerp(0, w * 0.14, (i + 0.5) / 6), lerp(h * 0.2, h * 0.12, (i + 0.5) / 6) + h * 0.09, x0, lerp(h * 0.2, h * 0.12, i / 6) + h * 0.05);
      f.fill();
    }
    f.globalCompositeOperation = 'source-atop';
    tone(f, 0, 0, w, h, u * 0.008, 'rgba(12,8,8,0.35)', (x, y) => (y / h) * 0.9 - 0.25);
    f.globalCompositeOperation = 'source-over';
    grain(f, w, h, 0.05);
    S.F = F;
    S.gS = glow('#f6f0ec');
    return S;
  }
  function drawMarket(ctx, S, t) {
    const { w, h, u, Pj } = S;
    ctx.drawImage(S.A, 0, 0);
    const off = (t * u * 0.01) % w;
    ctx.drawImage(S.N, -off, 0);
    ctx.drawImage(S.N, w - off, 0);
    ctx.drawImage(S.F, 0, 0);
    // bunting across the aisle, fluttering
    const cols = ['#8e1621', '#edcac0', '#997d7b'];
    for (const z of S.bunting) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push(Pj(lerp(-2.4, 2.4, k), 3.3 - 0.5 * (1 - (2 * k - 1) ** 2), z)); }
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = u * 0.0018;
      ctx.beginPath();
      poly(ctx, pts, false);
      ctx.stroke();
      const s = (u * 0.85 * 0.3) / z;
      for (let i = 0; i < 12; i++) {
        const p = pts[i], q = pts[i + 1], fl = Math.sin(t * 4 + i * 1.3 + z) * s * 0.25;
        ctx.fillStyle = cols[i % 3];
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
        ctx.lineTo((p[0] + q[0]) / 2 + fl, (p[1] + q[1]) / 2 + s);
        ctx.closePath();
        ctx.fill();
      }
    }
    // steam from the kettle
    const [sx, sy, s] = S.spout;
    for (let i = 0; i < 12; i++) {
      const p = (t * 0.35 + i / 12) % 1;
      const x = sx + Math.sin(t * 1.5 + i * 2.1 + p * 4) * s * 0.12 * p + p * s * 0.2, y = sy - p * s * 1.4;
      ctx.globalAlpha = (1 - p) * Math.min(1, p * 5) * 0.45;
      blob(ctx, S.gS, x, y, s * (0.06 + p * 0.22));
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------- GUILD
  function buildGuild(w, h) {
    const u = Math.min(w, h), rng = mulberry(130), S = { w, h, u };
    const Pj = (S.Pj = camera(w, h, 0.48, 0.55, 0.7, 1.6));
    const A = mk(w, h), a = A.getContext('2d');
    const X0 = -8, X1 = 8, Y1 = 4.6, Z1 = 12;
    a.fillStyle = '#161212';
    a.fillRect(0, 0, w, h);
    // back wall: plaster above, wainscot below
    a.fillStyle = '#4f4449';
    quad3(a, Pj, [[X0, 0, Z1], [X1, 0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]]);
    a.fill();
    a.fillStyle = '#2d2224';
    quad3(a, Pj, [[X0, 0, Z1], [X1, 0, Z1], [X1, 1.2, Z1], [X0, 1.2, Z1]]);
    a.fill();
    // floor, walls, ceiling
    a.fillStyle = '#1d1718';
    quad3(a, Pj, [[X0, 0, 1], [X1, 0, 1], [X1, 0, Z1], [X0, 0, Z1]]);
    a.fill();
    a.fillStyle = '#2d292b';
    quad3(a, Pj, [[X0, 0, 1], [X0, 0, Z1], [X0, Y1, Z1], [X0, Y1, 1]]);
    a.fill();
    a.fillStyle = '#3d3337';
    quad3(a, Pj, [[X1, 0, 1], [X1, 0, Z1], [X1, Y1, Z1], [X1, Y1, 1]]);
    a.fill();
    a.fillStyle = '#120e0e';
    quad3(a, Pj, [[X0, Y1, 1], [X1, Y1, 1], [X1, Y1, Z1], [X0, Y1, Z1]]);
    a.fill();
    // tall window on the right wall
    a.fillStyle = '#d8dce0';
    quad3(a, Pj, [[X1, 1.2, 6], [X1, 1.2, 9], [X1, 3.6, 9], [X1, 3.6, 6]]);
    a.fill();
    a.strokeStyle = '#1d1718';
    a.lineWidth = u * 0.008;
    a.beginPath();
    for (const z of [7, 8]) { const p = Pj(X1, 1.2, z), q = Pj(X1, 3.6, z); a.moveTo(p[0], p[1]); a.lineTo(q[0], q[1]); }
    for (const y of [2.0, 2.8]) { const p = Pj(X1, y, 6), q = Pj(X1, y, 9); a.moveTo(p[0], p[1]); a.lineTo(q[0], q[1]); }
    a.stroke();
    S.win = [Pj(X1, 1.2, 6), Pj(X1, 1.2, 9), Pj(X1, 3.6, 9), Pj(X1, 3.6, 6)];
    S.shaftTo = [Pj(2.5, 0, 6.5), Pj(1.0, 0, 9.5), Pj(-1, 0, 9.5), Pj(0.8, 0, 6.5)];
    // beams
    for (let z = 2.5; z <= Z1; z += 2.4) {
      a.fillStyle = '#0c0808';
      quad3(a, Pj, [[X0, Y1 - 0.4, z], [X1, Y1 - 0.4, z], [X1, Y1, z], [X0, Y1, z]]);
      a.fill();
    }
    // notice board covered in pinned contracts
    const bx0 = -6.4, bx1 = -1.2, by0 = 1.5, by1 = 3.7, bz = Z1 - 0.05;
    a.fillStyle = '#1d1214';
    quad3(a, Pj, [[bx0 - 0.15, by0 - 0.15, bz], [bx1 + 0.15, by0 - 0.15, bz], [bx1 + 0.15, by1 + 0.15, bz], [bx0 - 0.15, by1 + 0.15, bz]]);
    a.fill();
    a.fillStyle = '#5a4446';
    quad3(a, Pj, [[bx0, by0, bz], [bx1, by0, bz], [bx1, by1, bz], [bx0, by1, bz]]);
    a.fill();
    const sheets = [];
    for (let i = 0; i < 46; i++) sheets.push([lerp(bx0 + 0.25, bx1 - 0.25, rng()), lerp(by0 + 0.3, by1 - 0.25, rng()), 0.3 + rng() * 0.25, 0.4 + rng() * 0.25, (rng() - 0.5) * 0.25, rng()]);
    for (const [x, y, sw, sh, rot, r] of sheets) {
      const p = Pj(x, y, bz), sc = (u * 0.7) / bz;
      a.save();
      a.translate(p[0], p[1]);
      a.rotate(rot);
      a.fillStyle = 'rgba(12,8,8,0.5)';
      a.fillRect(-sw * sc * 0.5 + sc * 0.03, -sh * sc * 0.5 + sc * 0.04, sw * sc, sh * sc);
      a.fillStyle = r < 0.15 ? '#c8a890' : r < 0.6 ? '#edcac0' : '#f6f0ec';
      a.fillRect(-sw * sc * 0.5, -sh * sc * 0.5, sw * sc, sh * sc);
      a.fillStyle = 'rgba(45,41,43,0.55)';
      for (let k = 0; k < 5; k++) a.fillRect(-sw * sc * 0.38, -sh * sc * 0.3 + k * sh * sc * 0.14, sw * sc * (0.5 + ((k * 37 + r * 100) % 30) / 100), Math.max(1, sc * 0.015));
      a.fillStyle = r < 0.3 ? '#8e1621' : '#2d292b';
      a.beginPath();
      a.arc(0, -sh * sc * 0.42, sc * 0.035, 0, TAU);
      a.fill();
      a.restore();
    }
    // the Guild sign: round plaque, sword crossed with staff, scales beneath; banners
    const gc = Pj(2.4, 3.0, Z1 - 0.05), gr = (u * 0.7 * 1.05) / Z1;
    for (const sx of [-1, 1]) {
      const bx = 2.4 + sx * 1.7, b0 = Pj(bx - 0.4, 4.1, Z1 - 0.04), b1 = Pj(bx + 0.4, 1.5, Z1 - 0.04);
      a.fillStyle = '#8e1621';
      a.beginPath();
      a.moveTo(b0[0], b0[1]);
      a.lineTo(b1[0], b0[1]);
      a.lineTo(b1[0], b1[1]);
      a.lineTo((b0[0] + b1[0]) / 2, b1[1] - (b1[0] - b0[0]) * 0.4);
      a.lineTo(b0[0], b1[1]);
      a.closePath();
      a.fill();
      a.fillStyle = '#43171b';
      a.fillRect(b0[0], b0[1], (b1[0] - b0[0]) * 0.32, b1[1] - b0[1] - (b1[0] - b0[0]) * 0.2);
      a.fillStyle = '#e3263a';
      a.fillRect(b1[0] - (b1[0] - b0[0]) * 0.12, b0[1], (b1[0] - b0[0]) * 0.06, b1[1] - b0[1] - (b1[0] - b0[0]) * 0.3);
      a.fillStyle = P.ink;
      a.fillRect(b0[0] - u * 0.006, b0[1] - u * 0.006, b1[0] - b0[0] + u * 0.012, u * 0.008);
    }
    a.fillStyle = '#0c0808';
    a.beginPath();
    a.arc(gc[0], gc[1], gr * 1.12, 0, TAU);
    a.fill();
    a.fillStyle = '#c89a6a';
    a.beginPath();
    a.arc(gc[0], gc[1], gr * 1.04, 0, TAU);
    a.fill();
    a.fillStyle = '#2a1a1c';
    a.beginPath();
    a.arc(gc[0], gc[1], gr * 0.94, 0, TAU);
    a.fill();
    emblem(a, gc[0], gc[1] - gr * 0.1, gr * 0.68, '#edcac0', Math.max(1.5, gr * 0.05));
    S.gc = gc;
    S.gr = gr;
    // shelves of scrolls behind the counter (back wall, right)
    a.fillStyle = '#1d1214';
    for (const y of [1.5, 2.2]) {
      quad3(a, Pj, [[4.6, y, Z1 - 0.1], [7.4, y, Z1 - 0.1], [7.4, y + 0.1, Z1 - 0.1], [4.6, y + 0.1, Z1 - 0.1]]);
      a.fill();
      for (let x = 4.7; x < 7.3; x += 0.22) {
        const p = Pj(x, y + 0.2, Z1 - 0.1), r = (u * 0.7 * 0.09) / Z1;
        a.fillStyle = '#c8a890';
        a.beginPath();
        a.arc(p[0], p[1], r, 0, TAU);
        a.fill();
        a.fillStyle = '#1d1214';
      }
    }
    grain(a, w, h, 0.05);
    S.A = A;
    // foreground: the counters
    const F = mk(w, h), f = F.getContext('2d');
    const cz = 6.5, ch = 1.1;
    for (const [x0, x1] of [[-7.5, -0.9], [0.9, 7.5]]) {
      f.fillStyle = '#2a1c1c';
      quad3(f, Pj, [[x0, 0, cz], [x1, 0, cz], [x1, ch, cz], [x0, ch, cz]]);
      f.fill();
      f.strokeStyle = 'rgba(12,8,8,0.9)';
      f.lineWidth = u * 0.003;
      f.beginPath();
      for (let x = x0 + 0.6; x < x1; x += 0.6) { const p = Pj(x, 0.1, cz), q = Pj(x, ch - 0.15, cz); f.moveTo(p[0], p[1]); f.lineTo(q[0], q[1]); }
      f.stroke();
      f.fillStyle = '#e0b090';
      quad3(f, Pj, [[x0 - 0.1, ch, cz - 0.1], [x1 + 0.1, ch, cz - 0.1], [x1 + 0.1, ch, cz + 0.7], [x0 - 0.1, ch, cz + 0.7]]);
      f.fill();
      f.fillStyle = '#6e5353';
      quad3(f, Pj, [[x0 - 0.1, ch, cz - 0.1], [x1 + 0.1, ch, cz - 0.1], [x1 + 0.1, ch - 0.1, cz - 0.1], [x0 - 0.1, ch - 0.1, cz - 0.1]]);
      f.fill();
    }
    // ledger, inkwell and bell
    const lp = Pj(-3, ch, cz + 0.3), ls = (u * 0.7) / (cz + 0.3);
    f.fillStyle = '#1d1718';
    f.fillRect(lp[0] - ls * 0.35, lp[1] - ls * 0.04, ls * 0.7, ls * 0.06);
    f.fillStyle = '#f6f0ec';
    f.fillRect(lp[0] - ls * 0.32, lp[1] - ls * 0.07, ls * 0.31, ls * 0.04);
    f.fillRect(lp[0] + ls * 0.01, lp[1] - ls * 0.07, ls * 0.31, ls * 0.04);
    f.fillStyle = P.ink;
    f.beginPath();
    f.arc(lp[0] + ls * 0.5, lp[1] - ls * 0.06, ls * 0.05, 0, TAU);
    f.fill();
    const bp = Pj(3, ch, cz + 0.3);
    f.fillStyle = '#c89a6a';
    f.beginPath();
    f.arc(bp[0], bp[1], ls * 0.08, Math.PI, 0);
    f.fill();
    f.fillRect(bp[0] - ls * 0.1, bp[1] - ls * 0.01, ls * 0.2, ls * 0.02);
    f.globalCompositeOperation = 'source-atop';
    tone(f, 0, 0, w, h, u * 0.008, 'rgba(12,8,8,0.4)', (x, y) => (y / h) - 0.55);
    f.globalCompositeOperation = 'source-over';
    S.F = F;
    S.lamps = [[-4, 5], [4, 5], [0, 9]].map(([x, z]) => ({ x, z, ph: rng() * TAU }));
    S.motes = makeMotes(rng, 50, { v: [-0.015, 0.015], r: [0.001, 0.0024] });
    S.gW = glow('#ffc890');
    return S;
  }
  function drawGuild(ctx, S, t) {
    const { w, h, u, Pj } = S;
    ctx.drawImage(S.A, 0, 0);
    // daylight shaft from the window
    ctx.globalCompositeOperation = 'lighter';
    const k = 0.22 + 0.04 * Math.sin(t * 0.5);
    const [w0, w1, w2, w3] = S.win, [f0, f1, f2, f3] = S.shaftTo;
    ctx.fillStyle = `rgba(226,232,240,${k})`;
    ctx.beginPath();
    poly(ctx, [w3, w2, f1, f2, f3, w0]);
    ctx.fill();
    ctx.fillStyle = `rgba(226,232,240,${k * 0.8})`;
    ctx.beginPath();
    poly(ctx, [f0, f1, f2, f3]);
    ctx.fill();
    // warm glow on the sign
    ctx.globalAlpha = 0.25 + 0.05 * Math.sin(t * 2);
    blob(ctx, S.gW, S.gc[0], S.gc[1], S.gr * 3);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // hanging lamps
    for (const L of S.lamps) {
      const sw = Math.sin(t * 1.1 + L.ph) * 0.06;
      const top = Pj(L.x, 4.4, L.z), p = Pj(L.x + sw, 3.4, L.z), r = (u * 0.7 * 0.2) / L.z;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = u * 0.002;
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]);
      ctx.lineTo(p[0], p[1] - r);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + 0.08 * Math.sin(t * 4 + L.ph);
      blob(ctx, S.gW, p[0], p[1], r * 8);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = P.ink;
      ctx.beginPath();
      ctx.moveTo(p[0] - r, p[1]);
      ctx.lineTo(p[0], p[1] - r);
      ctx.lineTo(p[0] + r, p[1]);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe0b0';
      ctx.fillRect(p[0] - r * 0.6, p[1], r * 1.2, r * 0.7);
    }
    ctx.drawImage(S.F, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const xs = S.shaftTo.map((p) => p[0]).concat(S.win.map((p) => p[0]));
    drawMotes(ctx, S.motes, t, Math.min(...xs), S.win[2][1], Math.max(...xs), S.shaftTo[1][1], u, ['#f6f0ec', '#dfe6ee'], 0.7, 0.03);
    ctx.globalCompositeOperation = 'source-over';
  }

  // -------------------------------------------------------------------- HILL
  function buildHill(w, h) {
    const u = Math.min(w, h), rng = mulberry(140), S = { w, h, u };
    const hz = h * 0.3;
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, hz, [[0, '#4f4449'], [0.6, '#9a8a88'], [1, '#e0cfc4']]);
    a.fillRect(0, 0, w, h);
    const rows = makeRows(rng, w, h, u, {
      yHor: hz - h * 0.04, yTop: -h * 0.04, n: 7, nearN: 2, pow: 1.4, bw: [0.06, 0.5], bh: [0.006, 0.055],
      sunX: w * 0.25, sunW: w * 0.6, haze: '#e0cfc4',
      far: { lit: '#f4e6dc', mid: '#c4b0aa', dark: '#9a8686' }, near: { lit: '#a8949a', mid: '#625a62', dark: '#3a3440' },
    });
    for (let i = 0; i < rows.length - 2; i++) paintRow(a, rows[i]);
    const N = mk(w, h), n = N.getContext('2d');
    for (let i = rows.length - 2; i < rows.length; i++) paintRow(n, rows[i]);
    S.N = N;
    // far ridges
    fillRidge(a, ridge(rng, w, hz, u * 0.015, 3), w, h, '#8a8486', w / 100);
    fillRidge(a, ridge(rng, w, hz + h * 0.04, u * 0.02, 3), w, h, '#6a6a66', w / 100);
    // the quarry hill on the right, with the cut limestone face
    const qh = (x) => hz + h * 0.13 - sstep(w * 0.2, w * 1.05, x) * h * 0.2 + Math.sin(x * 0.009 / (u / 780)) * u * 0.008;
    fillRidge(a, qh, w, h, '#9aa58e', w / 100);
    fillRidge(a, (x) => qh(x) + u * 0.005, w, h, '#4e5a50', w / 100);
    const fx0 = w * 0.6, fx1 = w * 0.9, fy1 = hz + h * 0.19;
    const fy0 = (x) => qh(x) + u * 0.012;
    // the cut: a pale wall stepped back in benches, shadowed on its right flank
    const cut = () => {
      a.beginPath();
      a.moveTo(fx0 - u * 0.03, fy1 + u * 0.01);
      for (let x = fx0; x <= fx1; x += w / 120) a.lineTo(x, fy0(x));
      a.lineTo(fx1 + u * 0.04, fy1 + u * 0.01);
      a.closePath();
    };
    a.fillStyle = '#2d292b';
    cut();
    a.fill();
    a.save();
    cut();
    a.clip();
    let ytop = Infinity;
    for (let x = fx0; x <= fx1; x += w / 120) ytop = Math.min(ytop, fy0(x));
    const benches = 4;
    for (let i = 0; i < benches; i++) {
      const y0 = lerp(ytop, fy1, i / benches) + u * 0.008, y1 = lerp(ytop, fy1, (i + 1) / benches);
      const xl = fx0 + i * u * 0.035, xr = fx1 - i * u * 0.02;
      a.fillStyle = '#ecdfd2';
      a.fillRect(xl, y0, xr - xl, y1 - y0);
      a.fillStyle = '#a8968e';
      a.fillRect(xl + (xr - xl) * 0.72, y0, (xr - xl) * 0.28, y1 - y0);
      a.fillStyle = '#5c5652';
      a.fillRect(xl - u * 0.02, y1 - u * 0.006, xr - xl + u * 0.04, u * 0.008);
      a.strokeStyle = 'rgba(61,51,55,0.5)';
      a.lineWidth = u * 0.002;
      a.beginPath();
      for (let x = xl + u * 0.05; x < xr - u * 0.02; x += u * (0.05 + rng() * 0.09)) { a.moveTo(x, y0 + (y1 - y0) * rng() * 0.3); a.lineTo(x + u * 0.002, y0 + (y1 - y0) * (0.5 + rng() * 0.4)); }
      a.stroke();
      a.fillStyle = '#fff6ee';
      a.fillRect(xl, y0, xr - xl, u * 0.004);
    }
    a.restore();
    // grass lip over the top of the cut
    a.strokeStyle = '#4e5a50';
    a.lineWidth = u * 0.008;
    a.beginPath();
    for (let x = fx0 - u * 0.02; x <= fx1 + u * 0.02; x += w / 120) { const y = fy0(x) - u * 0.004; if (x === fx0 - u * 0.02) a.moveTo(x, y); else a.lineTo(x, y); }
    a.stroke();
    // cut blocks lying at the foot
    for (let i = 0; i < 6; i++) {
      const bx2 = lerp(fx0, fx1, rng()), bw2 = u * (0.02 + rng() * 0.02);
      a.fillStyle = '#d8ccc0';
      a.fillRect(bx2, fy1 + u * 0.004 - bw2 * 0.6, bw2, bw2 * 0.6);
      a.fillStyle = '#6a625e';
      a.fillRect(bx2 + bw2 * 0.65, fy1 + u * 0.004 - bw2 * 0.6, bw2 * 0.35, bw2 * 0.6);
    }
    // cave mouth at the foot of the face
    a.fillStyle = '#0c0808';
    a.beginPath();
    a.moveTo(w * 0.7, fy1);
    a.lineTo(w * 0.705, fy1 - h * 0.06);
    a.quadraticCurveTo(w * 0.73, fy1 - h * 0.09, w * 0.76, fy1 - h * 0.055);
    a.lineTo(w * 0.765, fy1);
    a.closePath();
    a.fill();
    // the loading frame beside the face
    a.strokeStyle = '#1d1718';
    a.lineWidth = u * 0.007;
    a.beginPath();
    const lx = w * 0.58, ly = fy1 + h * 0.01;
    a.moveTo(lx, ly); a.lineTo(lx + u * 0.03, ly - u * 0.16);
    a.moveTo(lx + u * 0.09, ly); a.lineTo(lx + u * 0.06, ly - u * 0.16);
    a.moveTo(lx - u * 0.02, ly - u * 0.16); a.lineTo(lx + u * 0.16, ly - u * 0.16);
    a.moveTo(lx + u * 0.01, ly - u * 0.08); a.lineTo(lx + u * 0.08, ly - u * 0.08);
    a.stroke();
    a.lineWidth = u * 0.002;
    a.beginPath();
    a.moveTo(lx + u * 0.14, ly - u * 0.16);
    a.lineTo(lx + u * 0.14, ly - u * 0.07);
    a.stroke();
    a.fillStyle = '#c8b8a8';
    a.fillRect(lx + u * 0.125, ly - u * 0.07, u * 0.03, u * 0.025);
    // spoil heap
    a.fillStyle = '#a8a098';
    a.beginPath();
    a.moveTo(w * 0.86, fy1 + h * 0.06);
    a.quadraticCurveTo(w * 0.92, fy1 - h * 0.01, w * 0.99, fy1 + h * 0.06);
    a.fill();
    // the mill valley: middle slope
    const mid = ridge(rng, w, h * 0.5, u * 0.02, 2);
    fillRidge(a, (x) => mid(x) - sstep(w * 0.4, w, x) * h * 0.06 - u * 0.004, w, h, '#7a8a70', w / 100);
    fillRidge(a, (x) => mid(x) - sstep(w * 0.4, w, x) * h * 0.06, w, h, '#3e4a42', w / 100);
    // the stream
    a.strokeStyle = '#b8c4c8';
    a.lineWidth = u * 0.012;
    a.beginPath();
    a.moveTo(-10, h * 0.6);
    a.bezierCurveTo(w * 0.1, h * 0.58, w * 0.18, h * 0.64, w * 0.25, h * 0.62);
    a.bezierCurveTo(w * 0.32, h * 0.6, w * 0.4, h * 0.7, w * 0.5, h * 0.72);
    a.stroke();
    a.strokeStyle = '#1e2424';
    a.lineWidth = u * 0.004;
    a.stroke();
    // the mill (stone, gabled), wheel on its left side
    const mx = w * 0.27, my = h * 0.6, mw = u * 0.2, mh = u * 0.13;
    a.fillStyle = '#efe0d4';
    a.beginPath();
    a.moveTo(mx - u * 0.01, my - mh);
    a.lineTo(mx + mw * 0.5, my - mh - mw * 0.36);
    a.lineTo(mx + mw + u * 0.01, my - mh);
    a.fill();
    a.fillStyle = '#3d3337';
    a.beginPath();
    a.moveTo(mx - u * 0.004, my - mh + u * 0.004);
    a.lineTo(mx + mw * 0.5 + u * 0.006, my - mh - mw * 0.36 + u * 0.01);
    a.lineTo(mx + mw + u * 0.01, my - mh);
    a.fill();
    a.fillStyle = '#9a8a84';
    a.fillRect(mx, my - mh, mw, mh);
    a.fillStyle = '#5a4e4e';
    a.fillRect(mx + mw * 0.55, my - mh, mw * 0.45, mh);
    a.fillStyle = '#1d1718';
    a.fillRect(mx + mw * 0.2, my - mh * 0.55, mw * 0.12, mh * 0.55);
    a.fillRect(mx + mw * 0.7, my - mh * 0.75, mw * 0.1, mh * 0.18);
    a.strokeStyle = P.ink;
    a.lineWidth = u * 0.003;
    a.strokeRect(mx, my - mh, mw, mh);
    // the race (wooden chute) feeding the wheel
    a.fillStyle = '#2d2224';
    a.fillRect(mx - u * 0.24, my - mh * 1.08, u * 0.17, u * 0.018);
    S.wheel = { x: mx - u * 0.05, y: my - mh * 0.45, r: u * 0.085 };
    // path from the mill up to the quarry
    a.strokeStyle = '#cbbfae';
    a.lineWidth = u * 0.008;
    a.setLineDash([u * 0.02, u * 0.01]);
    a.beginPath();
    a.moveTo(mx + mw, my - u * 0.01);
    a.bezierCurveTo(w * 0.5, h * 0.62, w * 0.42, h * 0.5, w * 0.52, h * 0.47);
    a.bezierCurveTo(w * 0.6, h * 0.45, w * 0.56, fy1 + h * 0.06, w * 0.7, fy1 + h * 0.01);
    a.stroke();
    a.setLineDash([]);
    // scrub on the slopes
    for (let i = 0; i < 22; i++) {
      const x = rng() * w, y = lerp(h * 0.55, h * 0.72, rng()), r = u * (0.008 + rng() * 0.012);
      if (Math.abs(x - mx - mw / 2) < mw * 0.8) continue;
      for (const [col, d] of [['#8a9a7a', -r * 0.25], ['#26302a', 0]]) {
        a.fillStyle = col;
        a.beginPath();
        for (let k = 0; k < 4; k++) { const cx = x + (k - 1.5) * r * 0.7 + d, cy = y - Math.sin((k / 3) * Math.PI) * r * 0.5 + d; a.moveTo(cx + r * 0.6, cy); a.arc(cx, cy, r * 0.6, 0, TAU); }
        a.fill();
      }
    }
    // the foreground hillside we stand on
    const fg = ridge(rng, w, h * 0.8, u * 0.03, 3);
    fillRidge(a, (x) => fg(x) - (x / w) * h * 0.06, w, h, '#8a9a7a', w / 100);
    fillRidge(a, (x) => fg(x) - (x / w) * h * 0.06 + u * 0.006, w, h, '#1a201c', w / 100);
    for (let i = 0; i < 14; i++) {
      const x = rng() * w, y = fg(x) - (x / w) * h * 0.06 + u * 0.02, r = u * (0.03 + rng() * 0.04);
      a.fillStyle = '#0c100e';
      a.beginPath();
      for (let k = 0; k < 5; k++) { const cx = x + (k - 2) * r * 0.5, cy = y - Math.sin((k / 4) * Math.PI) * r * 0.6; a.moveTo(cx + r * 0.5, cy); a.arc(cx, cy, r * 0.5, 0, TAU); }
      a.fill();
    }
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, h, u * 0.009, 'rgba(12,10,12,0.45)', (x, y) => (y - h * 0.62) / (h * 0.3));
    a.globalCompositeOperation = 'source-over';
    grain(a, w, h, 0.05);
    S.A = A;
    S.blades = [];
    for (let i = 0; i < 60; i++) S.blades.push([rng(), 0.015 + rng() * 0.04, rng() * TAU]);
    S.fg = (x) => fg(x) - (x / w) * h * 0.06;
    return S;
  }
  function drawHill(ctx, S, t) {
    const { w, h, u } = S;
    // clouds drift behind everything: draw sky part first
    ctx.drawImage(S.A, 0, 0);
    const off = (t * u * 0.008) % w;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h * 0.22);
    ctx.clip();
    ctx.drawImage(S.N, -off, 0);
    ctx.drawImage(S.N, w - off, 0);
    ctx.restore();
    // the waterwheel turning
    const { x, y, r } = S.wheel, rot = t * 0.8;
    ctx.fillStyle = 'rgba(184,196,200,0.85)';
    ctx.fillRect(x - r * 1.9, y - r * 1.1, r * 1.0, r * 0.12);
    for (let i = 0; i < 10; i++) {
      const p = (t * 1.2 + i * 0.1) % 1;
      ctx.globalAlpha = 1 - p;
      ctx.fillRect(x - r * 0.9 + p * r * 0.3, y - r * 1.0 + p * r * 2, u * 0.004, u * 0.01);
    }
    ctx.globalAlpha = 1;
    for (const [col, k] of [['#e8d8c8', 1.7], [P.ink, 1]]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = r * 0.07 * k;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.moveTo(x + r * 0.75, y);
      ctx.arc(x, y, r * 0.75, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = r * 0.05 * k;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = rot + (i / 8) * TAU; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); }
      ctx.stroke();
      ctx.lineWidth = r * 0.09 * k;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * TAU; ctx.moveTo(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75); ctx.lineTo(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * 1.15); }
      ctx.stroke();
    }
    // spray at the foot
    ctx.fillStyle = '#f6f0ec';
    for (let i = 0; i < 16; i++) {
      const p = (t * 1.4 + i * 0.0625) % 1, a = Math.PI * (0.35 + (i % 5) * 0.08);
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.fillRect(x + Math.cos(a) * r * (1 + p * 0.4), y + Math.sin(a) * r * (1 + p * 0.3) - p * (1 - p) * r * 0.6, u * 0.004, u * 0.004);
    }
    ctx.globalAlpha = 1;
    // grass on the near slope
    ctx.strokeStyle = '#0c100e';
    ctx.lineWidth = u * 0.004;
    ctx.beginPath();
    for (const [fx, len, ph] of S.blades) {
      const bx = fx * w, by = S.fg(bx) + u * 0.01, L = len * u * 2.5, sw = Math.sin(t * 1.6 + ph + fx * 5) * L * 0.22;
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sw * 0.3, by - L * 0.6, bx + sw, by - L);
    }
    ctx.stroke();
  }

  // --------------------------------------------------------------------- CAVE
  function buildCave(w, h) {
    const u = Math.min(w, h), rng = mulberry(150), S = { w, h, u };
    const A = mk(w, h), a = A.getContext('2d');
    const fire = (S.fire = [w * 0.34, h * 0.66]);
    a.fillStyle = '#100c0c';
    a.fillRect(0, 0, w, h);
    // back wall with the fire's light painted in hard bands
    a.fillStyle = rad(a, fire[0], fire[1], 0, w * 0.6, [[0, '#6e4a3e'], [0.3, '#3d2a28'], [0.6, '#1d1515'], [1, '#0c0808']]);
    a.fillRect(0, 0, w, h);
    // rock masses (wall facets)
    const facet = (pts, lit) => {
      a.fillStyle = lit;
      a.beginPath();
      poly(a, pts);
      a.fill();
    };
    for (let i = 0; i < 26; i++) {
      const x = rng() * w, y = h * (0.2 + rng() * 0.45), r = u * (0.06 + rng() * 0.12);
      const d = Math.hypot(x - fire[0], (y - fire[1]) * 1.5) / (w * 0.6);
      const pts = [];
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * TAU + rng() * 0.5; pts.push([x + Math.cos(ang) * r, y + Math.sin(ang) * r * 0.7]); }
      facet(pts, mix('#5a3c34', '#120c0c', clamp(d * 1.2 + 0.15, 0, 1)));
      const dx = (x - fire[0]) / Math.max(1, Math.abs(x - fire[0])) * r * 0.25;
      facet(pts.map(([px, py]) => [px + dx, py + r * 0.18]), mix('#2a1c1a', '#0c0808', clamp(d + 0.2, 0, 1)));
    }
    // the deep passage, right of centre
    const px = (S.px = w * 0.76), py = h * 0.47;
    a.fillStyle = '#2a1e1c';
    a.beginPath();
    a.ellipse(px, py, u * 0.17, u * 0.22, 0, 0, TAU);
    a.fill();
    a.fillStyle = rad(a, px + u * 0.03, py + u * 0.02, 0, u * 0.18, [[0, '#000000'], [0.6, '#050404'], [1, '#140e0e']]);
    a.beginPath();
    a.moveTo(px - u * 0.15, py + u * 0.2);
    a.bezierCurveTo(px - u * 0.17, py - u * 0.12, px - u * 0.05, py - u * 0.22, px + u * 0.05, py - u * 0.19);
    a.bezierCurveTo(px + u * 0.15, py - u * 0.15, px + u * 0.16, py + u * 0.05, px + u * 0.14, py + u * 0.2);
    a.closePath();
    a.fill();
    a.strokeStyle = '#7a5040';
    a.lineWidth = u * 0.004;
    a.beginPath();
    a.moveTo(px - u * 0.15, py + u * 0.2);
    a.bezierCurveTo(px - u * 0.17, py - u * 0.12, px - u * 0.05, py - u * 0.22, px + u * 0.05, py - u * 0.19);
    a.stroke();
    // floor
    const floorFn = ridge(rng, w, h * 0.68, u * 0.015, 3);
    fillRidge(a, floorFn, w, h, '#1d1515', w / 80);
    fillRidge(a, floorFn, w, h, rad(a, fire[0], fire[1] + h * 0.04, 0, w * 0.35, [[0, 'rgba(160,90,60,0.6)'], [1, 'rgba(160,90,60,0)']]), w / 80);
    // the low roof: jagged rock mass across the top
    const r2 = mulberry(5), roofPts = [];
    for (let x = -u * 0.02; x <= w + u * 0.04; x += u * 0.025) {
      const sag = Math.sin((x / w) * Math.PI) * -h * 0.08;
      let y = h * 0.3 + sag + Math.sin(x * 0.011 / (u / 780)) * h * 0.035 + Math.sin(x * 0.031 / (u / 780) + 2) * h * 0.012 + (r2() - 0.5) * u * 0.012;
      roofPts.push([x, y]);
      if (r2() < 0.22) { const L = u * (0.03 + r2() * 0.07); roofPts.push([x + u * 0.008, y + L], [x + u * 0.016, y]); }
    }
    const roof = (dy, col) => {
      a.fillStyle = col;
      a.beginPath();
      a.moveTo(-10, -10);
      for (const [x, y] of roofPts) a.lineTo(x, y + dy);
      a.lineTo(w + 10, -10);
      a.closePath();
      a.fill();
    };
    roof(u * 0.012, '#8a5a44');
    roof(0, '#0c0808');
    a.globalCompositeOperation = 'source-atop';
    tone(a, 0, 0, w, h * 0.45, u * 0.008, 'rgba(110,74,62,0.35)', (x, y) => 0.55 - Math.abs(x - fire[0]) / (w * 0.6) - Math.max(0, (y - h * 0.28) / (h * 0.14)));
    a.globalCompositeOperation = 'source-over';
    // stolen crates, stacked left, faces lit by the fire
    const crate = (x, y, s) => {
      const lit = x < fire[0];
      a.fillStyle = '#0c0808';
      a.fillRect(x - s / 2 - u * 0.003, y - s - u * 0.003, s + u * 0.006, s + u * 0.006);
      a.fillStyle = '#3a2620';
      a.fillRect(x - s / 2, y - s, s, s);
      a.fillStyle = '#b07050';
      if (lit) a.fillRect(x + s * 0.2, y - s, s * 0.3, s); else a.fillRect(x - s / 2, y - s, s * 0.3, s);
      a.strokeStyle = '#0c0808';
      a.lineWidth = u * 0.004;
      a.beginPath();
      a.moveTo(x - s / 2, y - s);
      a.lineTo(x + s / 2, y);
      a.moveTo(x - s / 2, y - s * 0.5);
      a.lineTo(x + s / 2, y - s * 0.5);
      a.stroke();
    };
    const cs = u * 0.1;
    crate(w * 0.1, h * 0.78, cs * 1.2);
    crate(w * 0.17, h * 0.79, cs * 1.1);
    crate(w * 0.13, h * 0.78 - cs * 1.2, cs);
    crate(w * 0.2, h * 0.72, cs * 0.8);
    crate(w * 0.56, h * 0.74, cs * 0.75);
    // a sack
    a.fillStyle = '#4a3028';
    a.beginPath();
    a.ellipse(w * 0.06, h * 0.8, cs * 0.5, cs * 0.6, 0.2, 0, TAU);
    a.fill();
    // stone basin, centre right
    const bx = w * 0.62, by = h * 0.66;
    a.fillStyle = '#2d2424';
    a.fillRect(bx - u * 0.04, by, u * 0.08, u * 0.08);
    a.fillStyle = '#7a5a4c';
    a.beginPath();
    a.ellipse(bx, by, u * 0.1, u * 0.03, 0, 0, TAU);
    a.fill();
    a.fillStyle = '#3d2a26';
    a.beginPath();
    a.ellipse(bx, by + u * 0.025, u * 0.1, u * 0.05, 0, 0, Math.PI);
    a.fill();
    a.fillStyle = '#141616';
    a.beginPath();
    a.ellipse(bx, by, u * 0.08, u * 0.02, 0, 0, TAU);
    a.fill();
    S.basin = [bx, by];
    // fire stones and a pot on a tripod
    a.fillStyle = '#2a1e1c';
    for (let i = 0; i < 7; i++) { const ang = Math.PI * (i / 6); a.beginPath(); a.ellipse(fire[0] + Math.cos(ang) * u * 0.07, fire[1] + u * 0.01 + Math.sin(ang) * u * 0.015, u * 0.022, u * 0.014, 0, 0, TAU); a.fill(); }
    a.strokeStyle = '#0c0808';
    a.lineWidth = u * 0.005;
    a.beginPath();
    a.moveTo(fire[0] - u * 0.07, fire[1] + u * 0.01);
    a.lineTo(fire[0], fire[1] - u * 0.14);
    a.lineTo(fire[0] + u * 0.07, fire[1] + u * 0.01);
    a.moveTo(fire[0], fire[1] - u * 0.14);
    a.lineTo(fire[0], fire[1] - u * 0.09);
    a.stroke();
    grain(a, w, h, 0.06);
    S.A = A;
    S.smoke = [];
    for (let i = 0; i < 18; i++) S.smoke.push([rng(), 0.6 + rng() * 0.6]);
    S.embers = makeMotes(rng, 30, { v: [-0.5, -0.2], r: [0.0015, 0.003] });
    S.gF = glow('#ff8a40');
    S.gS = glow('#3a302e');
    return S;
  }
  function drawCave(ctx, S, t) {
    const { w, h, u, fire } = S;
    ctx.drawImage(S.A, 0, 0);
    const fl = 0.8 + 0.13 * Math.sin(t * 6.3) + 0.07 * Math.sin(t * 15.7);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.45 * fl;
    blob(ctx, S.gF, fire[0], fire[1] - h * 0.05, w * 0.4, h * 0.5);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // the pot
    ctx.fillStyle = '#0c0808';
    ctx.beginPath();
    ctx.ellipse(fire[0], fire[1] - u * 0.07, u * 0.035, u * 0.03, 0, 0, TAU);
    ctx.fill();
    // flames
    const s = u * 0.06;
    for (const [col, k] of [['#e3263a', 1], ['#ff8a3a', 0.72], ['#ffe8b8', 0.42]]) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(fire[0] - s * k, fire[1] + s * 0.1);
      for (let i = 0; i <= 5; i++) {
        const xx = fire[0] - s * k + (i / 5) * s * 2 * k;
        const hg = s * k * (0.9 + 0.5 * Math.sin(t * 10 + i * 2.3) * Math.sin(t * 3.7 + i)) * Math.sin(((i + 0.5) / 6) * Math.PI);
        ctx.lineTo(xx - s * 0.07, fire[1] - hg);
        ctx.lineTo(xx + s * 0.1, fire[1] - hg * 0.35);
      }
      ctx.lineTo(fire[0] + s * k, fire[1] + s * 0.1);
      ctx.closePath();
      ctx.fill();
    }
    // smoke rising to the roof and creeping along it toward the passage
    for (const [ph, sz] of S.smoke) {
      const p = (t * 0.07 * sz + ph) % 1;
      const rise = Math.min(1, p * 3);
      const x = fire[0] + Math.max(0, p - 0.3) * w * 0.65 + Math.sin(t + ph * 9) * u * 0.01;
      const y = lerp(fire[1] - u * 0.1, h * 0.27, rise) + Math.sin(p * 7 + ph) * u * 0.01;
      ctx.globalAlpha = Math.min(1, p * 8) * (1 - p) * 0.5;
      blob(ctx, S.gS, x, y, u * (0.04 + p * 0.12) * sz, u * (0.03 + p * 0.06) * sz);
    }
    ctx.globalAlpha = 1;
    // glint on the basin water
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 3);
    ctx.fillStyle = '#ffb070';
    ctx.fillRect(S.basin[0] - u * 0.04, S.basin[1] - u * 0.004, u * 0.03, u * 0.003);
    ctx.globalAlpha = 1;
    drawMotes(ctx, S.embers, t, fire[0] - u * 0.08, h * 0.35, fire[0] + u * 0.08, fire[1], u, ['#ffd08a', '#ff8a3a'], 0.9, 0.03);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ registry
  const SCENES = {
    tower: { build: buildCity, draw: drawTower },
    summit: { build: buildSummit, draw: drawSummit },
    reset: { build: buildReset, draw: drawReset },
    dawn: { build: buildDawn, draw: drawDawn },
    town: { build: buildTown, draw: drawTown },
    tavern: { build: buildTavern, draw: drawTavern },
    formation: { build: buildFormation, draw: drawFormation },
    forest: { build: buildForest, draw: drawForest },
    road: { build: buildRoad, draw: drawRoad },
    market: { build: buildMarket, draw: drawMarket },
    guild: { build: buildGuild, draw: drawGuild },
    hill: { build: buildHill, draw: drawHill },
    cave: { build: buildCave, draw: drawCave },
  };

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const cache = new Map(); // key -> built scene (kept small: big canvases)
    function scene(bg, w, h) {
      const key = bg + '|' + w + 'x' + h;
      let S = cache.get(key);
      if (S) { cache.delete(key); cache.set(key, S); return S; }
      S = SCENES[bg].build(w, h);
      cache.set(key, S);
      while (cache.size > 3) cache.delete(cache.keys().next().value);
      return S;
    }
    return {
      draw(bg, t) {
        if (!SCENES[bg]) bg = 'tower';
        const w = canvas.width, h = canvas.height;
        if (w < 2 || h < 2) return;
        t = Math.max(0, +t || 0);
        const S = scene(bg, w, h);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        SCENES[bg].draw(ctx, S, t);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(vignette(w, h), 0, 0);
        ctx.restore();
      },
      // Build a scene's layers ahead of time (e.g. while the previous scene fades).
      prepare(bg) { if (SCENES[bg]) scene(bg, canvas.width, canvas.height); },
    };
  }

  NS.backdrop = { create, NAMES: Object.keys(SCENES) };
})();
