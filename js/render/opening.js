/*
 * Tower of Wishes — the opening cinematic (cold open before the Last Ascent).
 *
 *   const c = TowRender.cinematics.opening.create(canvas);
 *   c.update(dt) -> true when finished;  c.draw();  c.skip();
 *
 * Six shots, about a minute, all drawn in device pixels:
 *   1  Black. The Tower's tone as pressure rings and a waveform.
 *   2  A city at dusk under the cloud ceiling; the Tower far away.
 *   3  Looking up the Tower: the promise as a title card.
 *   4  The Tower sounds: rings over the city, signs rattle, the crowd turns.
 *   5  Inside: climbers on endless stairs, floor numbers flicker, many fall.
 *   6  The logo.
 * On-screen text is quoted from the manuscript only. Static layers are baked
 * once per canvas size; each frame blits them with a slow parallax camera and
 * adds the moving parts (rings, particles, figures, lettering).
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const CINE = (NS.cinematics = NS.cinematics || {});

  const TAU = Math.PI * 2;
  const P = {
    ink: '#0c0808', night: '#161212', charcoal: '#1d1718', slate: '#2d292b', ash: '#3d3337',
    dusk: '#4f4449', mauve: '#6e5353', rose: '#997d7b', bone: '#edcac0', white: '#f6f0ec',
    crimson: '#8e1621', blood: '#43171b', glow: '#e3263a', glyph: '#a98bff',
  };
  const SERIF = '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", Georgia, serif';
  const SANS = '"M PLUS 1p", "Hiragino Sans", system-ui, sans-serif';

  // Manuscript lines (verbatim).
  const TXT = {
    a: 'The Tower had been there longer than any history.',
    b: 'Stories disagreed about nearly everything else \u2014 the floors, the dangers, the people who\u2019d vanished inside \u2014',
    c: 'but they all arrived at the same promise.',
    d1: 'Reach the summit,',
    d2: 'and you could make a wish.',
    e1: 'Another floor.',
    e2: 'Somebody\u2019s always climbing.',
    f: 'Far away, high inside the Tower, a climber reached the last ascent.',
  };

  // Timeline (seconds).
  const S1 = 0, S2 = 8.5, S3 = 22.5, S4 = 29.5, S5 = 39, S6 = 51.5, END = 62.4;
  const PULSES = [0.7, 2.9, 5.1, 7.0];
  const TOLLS = [30.6, 33.6, 36.6];

  // ------------------------------------------------------------------ helpers
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const easeOut3 = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
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
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
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
  // A soft round light sprite, drawn scaled.
  const glowCache = new Map();
  function glowSpr(color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = mk(128, 128);
    const x = c.getContext('2d');
    x.fillStyle = rad(x, 64, 64, 0, 64, [[0, rgba(color, 1)], [0.35, rgba(color, 0.45)], [1, rgba(color, 0)]]);
    x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
    return c;
  }
  function blob(ctx, color, x, y, rx, ry) { ctx.drawImage(glowSpr(color), x - rx, y - (ry || rx), rx * 2, (ry || rx) * 2); }
  // Screentone dots, density f(x, y) in 0..1.
  function tone(ctx, x0, y0, x1, y1, cell, color, f) {
    ctx.fillStyle = color;
    ctx.beginPath();
    let row = 0;
    for (let y = y0; y < y1; y += cell * 0.866, row++) {
      const off = row & 1 ? cell / 2 : 0;
      for (let x = x0 + off; x < x1; x += cell) {
        const d = f(x, y);
        if (d <= 0.04) continue;
        const r = cell * 0.5 * Math.sqrt(Math.min(1, d));
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
    }
    ctx.fill();
  }
  function speedLines(ctx, rng, cx, cy, r0, r1, n, color, wMax) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, ww = wMax * (0.15 + rng()), rr = r0 * (0.7 + rng() * 0.8);
      const ca = Math.cos(a), sa = Math.sin(a);
      ctx.moveTo(cx + ca * rr, cy + sa * rr);
      ctx.lineTo(cx + ca * r1 - sa * ww, cy + sa * r1 + ca * ww);
      ctx.lineTo(cx + ca * r1 + sa * ww, cy + sa * r1 - ca * ww);
      ctx.closePath();
    }
    ctx.fill();
  }

  // ------------------------------------------------------------ shared layers
  function buildCommon(w, h) {
    const u = Math.min(w, h);
    const G = mk(192, 192), g = G.getContext('2d'), r = mulberry(7);
    for (let i = 0; i < 3200; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.9)' : 'rgba(255,238,228,0.75)';
      g.fillRect(Math.floor(r() * 192), Math.floor(r() * 192), 1 + (r() < 0.25), 1);
    }
    const V = mk(w, h), v = V.getContext('2d'), M = Math.max(w, h);
    v.fillStyle = rad(v, w * 0.5, h * 0.48, M * 0.25, M * 0.7, [[0, 'rgba(10,6,7,0)'], [0.55, 'rgba(10,6,7,0.35)'], [1, 'rgba(6,3,4,0.95)']]);
    v.fillRect(0, 0, w, h);
    return { u, grain: G, vig: V };
  }

  // ------------------------------------------------------------------- city
  // Layers: sky (gradient, cloud ceiling, the Tower), far roofs, near roofs.
  function buildCity(w, h) {
    const u = Math.min(w, h), rng = mulberry(31);
    const hy = h * 0.63, tx = w * 0.7;
    const S = { w, h, u, hy, tx };

    // --- sky + ceiling + Tower
    const A = mk(w, h), a = A.getContext('2d');
    a.fillStyle = lin(a, 0, 0, 0, h, [[0, '#0d080b'], [0.22, '#1f1119'], [0.38, '#4a1f29'], [0.5, '#8f3f3a'], [0.58, '#d27b5a'], [0.625, '#f4cfae'], [0.66, '#b0594a'], [0.75, '#3a181d'], [1, '#100809']]);
    a.fillRect(0, 0, w, h);
    a.globalCompositeOperation = 'lighter';
    blob(a, '#ff7a4a', w * 0.32, hy, w * 0.55, h * 0.22);
    blob(a, '#ffd9a8', w * 0.32, hy, u * 0.28, u * 0.07);
    a.globalCompositeOperation = 'source-over';

    // Cloud ceiling: rows of hanging lobes, far rows small and low.
    const rows = 9, tRow = 3; // rows nearer than tRow cover the Tower's top
    const drawRow = (k) => {
      const f = k / (rows - 1); // 0 near .. 1 far
      const by = lerp(h * 0.12, h * 0.5, Math.pow(f, 0.8));
      const bw = lerp(u * 0.34, u * 0.06, f), bh = bw * lerp(0.42, 0.3, f);
      const body = `rgb(${Math.round(lerp(26, 92, f * f))},${Math.round(lerp(14, 40, f * f))},${Math.round(lerp(22, 46, f * f))})`;
      const lit = `rgb(${Math.round(lerp(96, 240, f))},${Math.round(lerp(40, 150, f))},${Math.round(lerp(48, 110, f))})`;
      const mid = `rgb(${Math.round(lerp(64, 170, f))},${Math.round(lerp(28, 80, f))},${Math.round(lerp(38, 70, f))})`;
      const lobes = [];
      for (let x = -bw * rng(); x < w + bw; x += bw * (0.55 + rng() * 0.5)) lobes.push([x, by + (rng() - 0.5) * bh * 0.7, bw * (0.45 + rng() * 0.4), bh * (0.6 + rng() * 0.5)]);
      const pass = (col, dy, sc) => {
        a.fillStyle = col;
        a.beginPath();
        a.rect(0, 0, w, by - bh * 0.2 + dy);
        for (const [x, y, rx, ry] of lobes) { a.moveTo(x + rx * sc, y + dy); a.ellipse(x, y + dy, rx * sc, ry * sc, 0, 0, TAU); }
        a.fill();
      };
      pass(lit, bh * 0.16, 1);
      pass(mid, bh * 0.06, 0.98);
      pass(body, 0, 0.94);
    };
    for (let k = rows - 1; k >= tRow; k--) drawRow(k);
    // The Tower: impossibly narrow, rising into the ceiling.
    const tw0 = u * 0.026, tw1 = u * 0.009, ttop = h * 0.05;
    a.fillStyle = lin(a, tx - tw0, 0, tx + tw0, 0, [[0, '#120a0e'], [0.55, '#1c1015'], [0.56, '#2e1a20'], [1, '#170c11']]);
    a.beginPath();
    a.moveTo(tx - tw0, hy + h * 0.02);
    a.lineTo(tx - tw1, ttop);
    a.lineTo(tx + tw1, ttop);
    a.lineTo(tx + tw0, hy + h * 0.02);
    a.closePath();
    a.fill();
    // rim on the sunward edge
    a.strokeStyle = 'rgba(240,170,140,0.55)';
    a.lineWidth = u * 0.0022;
    a.beginPath();
    a.moveTo(tx - tw0 + u * 0.002, hy);
    a.lineTo(tx - tw1 + u * 0.001, ttop);
    a.stroke();
    // faint bands
    a.strokeStyle = 'rgba(0,0,0,0.35)';
    a.lineWidth = u * 0.0016;
    for (let y = hy - h * 0.04; y > ttop; y -= h * 0.035) {
      const k = (y - ttop) / (hy - ttop), hw = lerp(tw1, tw0, k);
      a.beginPath(); a.moveTo(tx - hw, y); a.lineTo(tx + hw, y); a.stroke();
    }
    for (let k = tRow - 1; k >= 0; k--) drawRow(k);
    // screentone on the near ceiling
    tone(a, 0, 0, w, h * 0.34, u * 0.014, 'rgba(255,200,190,0.07)', (x, y) => 1 - y / (h * 0.34));
    S.A = A;
    S.ttop = ttop;

    // --- far roofs
    const F = mk(w, h), f = F.getContext('2d');
    f.fillStyle = '#4a2a2c';
    f.beginPath();
    f.moveTo(0, h);
    let x = 0;
    const wins = [];
    while (x < w) {
      const bw = u * (0.03 + rng() * 0.06), bh = h * (0.015 + rng() * 0.07), top = hy + h * 0.03 - bh;
      f.lineTo(x, top);
      if (rng() < 0.3) { f.lineTo(x + bw / 2, top - bw * 0.45); }
      else if (rng() < 0.12) { f.lineTo(x + bw * 0.45, top); f.lineTo(x + bw / 2, top - bh * 0.9); f.lineTo(x + bw * 0.55, top); }
      f.lineTo(x + bw, top);
      for (let i = 0; i < 3; i++) if (rng() < 0.45) wins.push([x + bw * (0.2 + rng() * 0.6), top + bh * (0.25 + rng() * 0.6)]);
      x += bw;
    }
    f.lineTo(w, h);
    f.closePath();
    f.fill();
    f.fillStyle = lin(f, 0, hy - h * 0.06, 0, hy + h * 0.1, [[0, 'rgba(210,120,96,0.35)'], [1, 'rgba(60,24,28,0)']]);
    f.globalCompositeOperation = 'source-atop';
    f.fillRect(0, 0, w, h);
    f.globalCompositeOperation = 'source-over';
    f.fillStyle = '#ffc98a';
    for (const [wx, wy] of wins) f.fillRect(wx, wy, u * 0.004, u * 0.005);
    S.F = F;

    // --- near roofs (ink), with rim light and windows
    const N = mk(w, h), n = N.getContext('2d');
    const sk = [];
    x = -u * 0.05;
    while (x < w + u * 0.1) {
      const bw = u * (0.09 + rng() * 0.16);
      const top = h * (0.58 + rng() * 0.17);
      sk.push({ x, bw, top, gable: rng() < 0.55, chim: rng() < 0.5 });
      x += bw * (0.85 + rng() * 0.2);
    }
    n.fillStyle = P.ink;
    n.beginPath();
    for (const b of sk) {
      n.moveTo(b.x, h);
      n.lineTo(b.x, b.top);
      if (b.gable) n.lineTo(b.x + b.bw / 2, b.top - b.bw * 0.32);
      n.lineTo(b.x + b.bw, b.top);
      n.lineTo(b.x + b.bw, h);
      n.closePath();
      if (b.chim) n.rect(b.x + b.bw * 0.7, b.top - b.bw * 0.34, b.bw * 0.09, b.bw * 0.34);
    }
    n.fill();
    n.strokeStyle = 'rgba(237,170,150,0.7)';
    n.lineWidth = u * 0.003;
    n.beginPath();
    for (const b of sk) {
      if (b.gable) { n.moveTo(b.x, b.top); n.lineTo(b.x + b.bw / 2, b.top - b.bw * 0.32); }
      else { n.moveTo(b.x, b.top); n.lineTo(b.x + b.bw * 0.6, b.top); }
    }
    n.stroke();
    n.fillStyle = '#ffb874';
    for (const b of sk) {
      for (let i = 0; i < 3; i++) {
        if (rng() < 0.5) continue;
        const wx = b.x + b.bw * (0.15 + rng() * 0.65), wy = b.top + (h - b.top) * (0.12 + rng() * 0.4);
        n.globalAlpha = 0.5 + rng() * 0.5;
        n.fillRect(wx, wy, u * 0.011, u * 0.016);
      }
    }
    n.globalAlpha = 1;
    // street haze at the bottom
    n.fillStyle = lin(n, 0, h * 0.7, 0, h, [[0, 'rgba(12,8,8,0)'], [1, 'rgba(12,8,8,0.9)']]);
    n.fillRect(0, h * 0.7, w, h * 0.3);
    S.N = N;
    // hanging signs on the near buildings
    S.signs = [];
    for (const b of sk) {
      if (rng() < 0.5 || b.x < 0 || b.x > w * 0.95) continue;
      const left = rng() < 0.5;
      S.signs.push({ x: left ? b.x : b.x + b.bw, y: b.top + (h - b.top) * (0.18 + rng() * 0.2), s: u * (0.035 + rng() * 0.02), dir: left ? -1 : 1, ph: rng() * TAU, mark: Math.floor(rng() * 3) });
    }
    // crowd
    S.crowd = [];
    for (let i = 0; i < 12; i++) {
      const s = u * (0.27 + rng() * 0.09) * (i % 3 === 0 ? 1.15 : 1);
      S.crowd.push({ x: w * (i + 0.2 + rng() * 0.6) / 12, s, face: rng() < 0.5 ? -1 : 1, delay: rng() * 1.3, hood: rng() < 0.35, point: rng() < 0.18, bob: rng() * TAU });
    }
    S.crowd.sort((p, q) => p.s - q.s);
    return S;
  }

  // Draws a layer zoomed by z about (ax, ay), shifted by dx.
  function layer(ctx, L, z, ax, ay, dx, dy) {
    ctx.drawImage(L, ax - ax * z + dx, ay - ay * z + (dy || 0), L.width * z, L.height * z);
  }
  function camPt(x, y, z, ax, ay, dx, dy) { return [ax + (x - ax) * z + dx, ay + (y - ay) * z + (dy || 0)]; }

  function drawSign(ctx, sg, t, shake, u) {
    const ang = Math.sin(t * (1.3 + shake * 9) + sg.ph) * (0.04 + shake * 0.32);
    const bx = sg.x + sg.dir * sg.s * 0.75;
    ctx.save();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = u * 0.004;
    ctx.beginPath(); ctx.moveTo(sg.x, sg.y); ctx.lineTo(bx + sg.dir * sg.s * 0.5, sg.y); ctx.stroke();
    ctx.translate(bx, sg.y);
    ctx.rotate(ang);
    ctx.lineWidth = u * 0.0018;
    ctx.beginPath(); ctx.moveTo(-sg.s * 0.4, 0); ctx.lineTo(-sg.s * 0.4, sg.s * 0.25); ctx.moveTo(sg.s * 0.4, 0); ctx.lineTo(sg.s * 0.4, sg.s * 0.25); ctx.stroke();
    ctx.fillStyle = '#1a1012';
    ctx.fillRect(-sg.s * 0.5, sg.s * 0.25, sg.s, sg.s * 0.62);
    ctx.strokeStyle = 'rgba(237,190,170,0.6)';
    ctx.strokeRect(-sg.s * 0.5, sg.s * 0.25, sg.s, sg.s * 0.62);
    ctx.fillStyle = 'rgba(237,190,170,0.55)';
    ctx.beginPath();
    if (sg.mark === 0) ctx.arc(0, sg.s * 0.56, sg.s * 0.16, 0, TAU);
    else if (sg.mark === 1) { ctx.rect(-sg.s * 0.05, sg.s * 0.36, sg.s * 0.1, sg.s * 0.4); ctx.rect(-sg.s * 0.22, sg.s * 0.46, sg.s * 0.44, sg.s * 0.08); }
    else { ctx.moveTo(0, sg.s * 0.34); ctx.lineTo(sg.s * 0.2, sg.s * 0.56); ctx.lineTo(0, sg.s * 0.78); ctx.lineTo(-sg.s * 0.2, sg.s * 0.56); ctx.closePath(); }
    ctx.fill();
    ctx.restore();
  }

  // A standing figure in silhouette. turn 0..1 = how far they've turned to look
  // up at the Tower (towards +x), lit = crimson rim strength.
  function person(ctx, p, base, t, turn, lit, u) {
    const s = p.s, x = p.x + Math.sin(t * 0.7 + p.bob) * s * 0.01;
    const hx = x + lerp(p.face * s * 0.035, s * 0.045, turn), hy = base - s * 0.86 - turn * s * 0.02;
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    // coat
    ctx.moveTo(x - s * 0.17, base);
    ctx.lineTo(x - s * 0.13, base - s * 0.62);
    ctx.quadraticCurveTo(x - s * 0.12, base - s * 0.76, x, base - s * 0.77);
    ctx.quadraticCurveTo(x + s * 0.12, base - s * 0.76, x + s * 0.13, base - s * 0.62);
    ctx.lineTo(x + s * 0.17, base);
    ctx.closePath();
    // head (tilted up when turned)
    ctx.moveTo(hx + s * 0.075, hy);
    ctx.ellipse(hx, hy, s * 0.072, s * 0.085, turn * 0.5, 0, TAU);
    if (p.hood) { ctx.moveTo(hx - s * 0.1, hy + s * 0.08); ctx.quadraticCurveTo(hx - s * 0.04, hy - s * 0.15, hx + s * 0.1, hy - s * 0.04); ctx.lineTo(hx + s * 0.06, hy + s * 0.1); ctx.closePath(); }
    ctx.fill();
    if (p.point && turn > 0.3) {
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = s * 0.05;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.1, base - s * 0.66);
      ctx.lineTo(x + s * lerp(0.12, 0.34, turn), base - s * lerp(0.4, 0.98, turn));
      ctx.stroke();
    }
    if (lit > 0.01) {
      ctx.strokeStyle = rgba('#ff5a5a', 0.75 * lit);
      ctx.lineWidth = u * 0.0026;
      ctx.beginPath();
      ctx.moveTo(x + s * 0.17, base);
      ctx.lineTo(x + s * 0.13, base - s * 0.62);
      ctx.quadraticCurveTo(x + s * 0.12, base - s * 0.76, x + s * 0.02, base - s * 0.77);
      ctx.moveTo(hx + s * 0.02, hy - s * 0.083);
      ctx.ellipse(hx, hy, s * 0.072, s * 0.085, turn * 0.5, -1.4, 0.9);
      ctx.stroke();
    }
  }

  // ------------------------------------------------------------- title card
  function buildTitle(w, h, ver) {
    const u = Math.min(w, h), rng = mulberry(77);
    const B = mk(w, h), b = B.getContext('2d');
    const vx = w * 0.5, vy = -h * 0.25;
    b.fillStyle = lin(b, 0, 0, 0, h, [[0, '#f6dccb'], [0.1, '#e09070'], [0.26, '#8a2a30'], [0.5, '#2a0f16'], [1, '#070405']]);
    b.fillRect(0, 0, w, h);
    b.globalCompositeOperation = 'lighter';
    blob(b, '#ff9a7a', vx, h * 0.02, w * 0.4, h * 0.3);
    blob(b, '#fff0e0', vx, 0, u * 0.25, u * 0.12);
    b.globalCompositeOperation = 'source-over';
    speedLines(b, rng, vx, vy, h * 0.5, Math.hypot(w, h) * 1.2, 110, 'rgba(237,202,192,0.07)', u * 0.012);
    // the Tower from below: perspective spire into the light
    b.fillStyle = '#080406';
    b.beginPath();
    b.moveTo(vx - u * 0.13, h);
    b.lineTo(vx - u * 0.012, 0);
    b.lineTo(vx + u * 0.012, 0);
    b.lineTo(vx + u * 0.13, h);
    b.closePath();
    b.fill();
    // seams converging up the spire, and a violet glyph line climbing it
    b.lineWidth = u * 0.0025;
    b.strokeStyle = 'rgba(237,170,150,0.5)';
    b.beginPath(); b.moveTo(vx - u * 0.128, h); b.lineTo(vx - u * 0.011, 0); b.stroke();
    b.strokeStyle = 'rgba(169,139,255,0.45)';
    b.beginPath();
    for (const f of [-0.55, 0.3]) { b.moveTo(vx + u * 0.13 * f, h); b.lineTo(vx + u * 0.012 * f, 0); }
    b.stroke();
    b.fillStyle = 'rgba(169,139,255,0.6)';
    for (let i = 0; i < 14; i++) {
      const k = Math.pow(i / 14, 1.6), y = h - k * h, hw = lerp(u * 0.13, u * 0.012, k);
      b.fillRect(vx - hw * 0.12, y, hw * 0.24, u * 0.003);
    }
    // the city's roofs at the Tower's foot
    b.fillStyle = '#050203';
    b.beginPath();
    b.moveTo(0, h);
    for (let x = 0; x <= w; ) {
      const bw = u * (0.08 + rng() * 0.14), dc = Math.abs(x + bw / 2 - vx) / (w / 2);
      const top = h * (0.72 + rng() * 0.1 + (1 - dc) * 0.12);
      b.lineTo(x, top);
      if (rng() < 0.5) b.lineTo(x + bw / 2, top - bw * 0.3);
      b.lineTo(x + bw, top);
      x += bw;
    }
    b.lineTo(w, h);
    b.closePath();
    b.fill();
    // dark cloud wisps across the top
    b.fillStyle = 'rgba(28,10,16,0.92)';
    for (let i = 0; i < 26; i++) {
      const x = rng() * w, y = h * (0.02 + rng() * 0.16), rx = u * (0.08 + rng() * 0.2);
      b.beginPath(); b.ellipse(x, y, rx, rx * 0.22, 0, 0, TAU); b.fill();
    }
    b.fillStyle = lin(b, 0, h * 0.35, 0, h * 0.85, [[0, 'rgba(6,3,4,0)'], [0.5, 'rgba(6,3,4,0.55)'], [1, 'rgba(6,3,4,0.2)']]);
    b.fillRect(0, h * 0.35, w, h * 0.5);

    const line = (text, size, italic, main, shadow, maxW) => {
      const c0 = mk(4, 4).getContext('2d');
      let s = size;
      const font = (ss) => `${italic ? 'italic ' : ''}800 ${ss}px ${SERIF}`;
      c0.font = font(s);
      let tw = c0.measureText(text).width;
      if (tw > maxW) { s *= maxW / tw; c0.font = font(s); tw = c0.measureText(text).width; }
      const pad = s * 0.4;
      const C = mk(tw + pad * 2, s * 1.6), x = C.getContext('2d');
      x.font = font(s);
      x.textBaseline = 'middle';
      const off = s * 0.06;
      if (shadow) { x.fillStyle = shadow; x.fillText(text, pad + off, s * 0.8 + off); }
      x.lineWidth = s * 0.08;
      x.strokeStyle = P.ink;
      x.strokeText(text, pad, s * 0.8);
      x.fillStyle = main;
      x.fillText(text, pad, s * 0.8);
      return C;
    };
    const L1 = line(TXT.d1, u * 0.09, false, P.bone, null, w * 0.8);
    const L2 = line(TXT.d2, u * 0.135, true, P.white, P.crimson, w * 0.9);
    return { B, L1, L2, ver };
  }

  // ------------------------------------------------------------------- logo
  function buildLogo(w, h, ver) {
    const u = Math.min(w, h), rng = mulberry(5);
    const B = mk(w, h), b = B.getContext('2d');
    b.fillStyle = rad(b, w * 0.5, h * 0.5, 0, Math.max(w, h) * 0.65, [[0, '#24101a'], [0.5, '#120a0e'], [1, '#050304']]);
    b.fillRect(0, 0, w, h);
    speedLines(b, rng, w * 0.5, h * 0.5, u * 0.42, Math.hypot(w, h), 90, 'rgba(142,22,33,0.16)', u * 0.01);
    // the spire behind the title
    b.fillStyle = '#070405';
    b.beginPath();
    b.moveTo(w * 0.5 - u * 0.05, h);
    b.lineTo(w * 0.5 - u * 0.006, 0);
    b.lineTo(w * 0.5 + u * 0.006, 0);
    b.lineTo(w * 0.5 + u * 0.05, h);
    b.closePath();
    b.fill();
    // glyph circle (rotated per frame)
    const R = u * 0.44, GS = Math.ceil(R * 2.2);
    const G = mk(GS, GS), g = G.getContext('2d'), c = GS / 2;
    g.strokeStyle = P.glyph;
    g.lineWidth = u * 0.003;
    g.beginPath(); g.arc(c, c, R, 0, TAU); g.stroke();
    g.lineWidth = u * 0.0015;
    g.beginPath(); g.arc(c, c, R * 0.9, 0, TAU); g.stroke();
    g.beginPath(); g.arc(c, c, R * 0.62, 0, TAU); g.stroke();
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU, r0 = i % 6 === 0 ? R * 0.82 : R * 0.9;
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R); g.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, x = c + Math.cos(a) * R * 0.76, y = c + Math.sin(a) * R * 0.76, s = R * 0.05;
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 4); g.strokeRect(-s, -s, s * 2, s * 2); g.restore();
    }
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU - Math.PI / 2;
      const x = c + Math.cos(a) * R * 0.62, y = c + Math.sin(a) * R * 0.62;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.stroke();

    // title text with crimson offset shadow
    const c0 = mk(4, 4).getContext('2d');
    const font = (s) => `italic 800 ${s}px ${SERIF}`;
    const word = 'TOWER OF WISHES';
    let s = u * 0.2;
    c0.font = font(s);
    let tw = c0.measureText(word).width;
    if (tw > w * 0.84) { s *= (w * 0.84) / tw; c0.font = font(s); tw = c0.measureText(word).width; }
    const pad = s * 0.35;
    const T = mk(tw + pad * 2, s * 1.5), x = T.getContext('2d');
    x.font = font(s);
    x.textBaseline = 'middle';
    const off = s * 0.07, cy = T.height / 2;
    x.fillStyle = P.crimson;
    x.fillText(word, pad + off, cy + off);
    x.fillStyle = P.glow;
    x.globalAlpha = 0.6;
    x.fillText(word, pad + off * 0.5, cy + off * 0.5);
    x.globalAlpha = 1;
    x.lineWidth = s * 0.05;
    x.strokeStyle = P.ink;
    x.strokeText(word, pad, cy);
    x.fillStyle = lin(x, 0, cy - s * 0.45, 0, cy + s * 0.45, [[0, '#ffffff'], [0.55, P.bone], [0.56, '#cfa79f'], [1, '#e6bdb2']]);
    x.fillText(word, pad, cy);
    // mask copy of the glyphs for the light sweep
    const M = mk(T.width, T.height), m = M.getContext('2d');
    m.font = font(s);
    m.textBaseline = 'middle';
    m.fillStyle = '#fff';
    m.fillText(word, pad, cy);
    const K = mk(T.width, T.height);
    return { B, G, T, M, K, size: s, ver };
  }

  // ------------------------------------------------------------- lettering
  // Text laid out once per (text, size); each frame draws it letter by letter.
  function layoutText(text, size, maxW, font) {
    const c = mk(4, 4).getContext('2d');
    c.font = font;
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const wd of words) {
      const t = cur ? cur + ' ' + wd : wd;
      if (cur && c.measureText(t).width > maxW) { lines.push(cur); cur = wd; } else cur = t;
    }
    if (cur) lines.push(cur);
    return {
      font, size, lh: size * 1.42,
      lines: lines.map((ln) => {
        const chars = [];
        for (let i = 0; i < ln.length; i++) chars.push([ln[i], c.measureText(ln.slice(0, i)).width]);
        return { chars, w: c.measureText(ln).width };
      }),
    };
  }
  function drawLetters(ctx, L, cx, cy, tl, cps, alpha, color) {
    if (tl <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.font = L.font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    let g = 0;
    const n = L.lines.length;
    for (let li = 0; li < n; li++) {
      const ln = L.lines[li], y0 = cy + (li - (n - 1) / 2) * L.lh, x0 = cx - ln.w / 2;
      for (const [ch, cx2] of ln.chars) {
        const k = clamp((tl - g / cps) / 0.45, 0, 1);
        g++;
        if (k <= 0 || ch === ' ') continue;
        const e = easeOut3(k), y = y0 + (1 - e) * L.size * 0.35;
        ctx.globalAlpha = alpha * e;
        ctx.lineWidth = L.size * 0.16;
        ctx.strokeStyle = 'rgba(8,4,5,0.85)';
        ctx.strokeText(ch, x0 + cx2, y);
        ctx.fillStyle = color;
        ctx.fillText(ch, x0 + cx2, y);
        if (k < 1) {
          ctx.globalAlpha = alpha * (1 - k);
          ctx.fillStyle = '#ff6b6b';
          ctx.fillText(ch, x0 + cx2 + L.size * 0.05 * (1 - k), y);
        }
      }
    }
    ctx.restore();
  }
  // A short crimson brush stroke under a caption.
  function brush(ctx, cx, y, len, k, u, alpha) {
    if (k <= 0 || alpha <= 0) return;
    const x0 = cx - len / 2, x1 = x0 + len * easeOut3(k), th = u * 0.006;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = P.glow;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo((x0 + x1) / 2, y - th * 1.4, x1, y - th * 0.2);
    ctx.lineTo(x1 - th * 2, y + th * 0.4);
    ctx.quadraticCurveTo((x0 + x1) / 2, y + th, x0, y + th * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Manga speech balloon popping in at k (0..1+).
  function balloon(ctx, text, x, y, tailX, tailY, size, k, alpha) {
    if (k <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.font = `800 ${size}px ${SANS}`;
    const tw = ctx.measureText(text).width;
    const rx = tw * 0.62 + size * 0.9, ry = size * 1.25;
    const sc = k < 1 ? easeOut3(k) * (1 + 0.12 * Math.sin(k * Math.PI)) : 1;
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    const tx = (tailX - x) / sc, ty = (tailY - y) / sc;
    ctx.fillStyle = '#f6f0ec';
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = size * 0.16;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.moveTo(-rx * 0.18, ry * 0.7);
    ctx.lineTo(tx, ty);
    ctx.lineTo(rx * 0.12, ry * 0.8);
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, rx - size * 0.06, ry - size * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, size * 0.04);
    ctx.restore();
  }

  // Glitch: slices of the frame shifted sideways plus a red ghost.
  function glitch(ctx, canvas, k, seed) {
    if (k <= 0.02) return;
    const w = canvas.width, h = canvas.height;
    const r = mulberry(seed);
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const sy = r() * h, sh = h * (0.01 + r() * 0.07), dx = (r() - 0.5) * w * 0.06 * k;
      ctx.drawImage(canvas, 0, sy, w, sh, dx, sy, w, sh);
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28 * k;
    ctx.drawImage(canvas, w * 0.008 * k, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.18 * k;
    ctx.fillStyle = P.glow;
    ctx.fillRect(0, r() * h, w, h * 0.004);
    ctx.restore();
  }

  // Deterministic drifting motes (embers / dust).
  function motes(ctx, n, seed, t, w, h, u, color, alpha, rise, size) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = hash(seed + i * 3.1), b = hash(seed + i * 7.7), c = hash(seed + i * 1.3);
      const sp = 0.4 + c * 0.8;
      let y = (b - t * rise * sp * 0.05) % 1; if (y < 0) y += 1;
      const x = (a + Math.sin(t * 0.6 * sp + i) * 0.02) * w;
      const tw = 0.5 + 0.5 * Math.sin(t * 3 * sp + i * 2);
      ctx.globalAlpha = alpha * (0.35 + 0.65 * tw);
      const s = u * size * (0.5 + c);
      ctx.fillRect(x, y * h, s, s);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------- the climb
  // Switchback flights rising forever; the camera climbs with them.
  function stairPath(i, w, FH, base) {
    const dir = i % 2 === 0 ? 1 : -1;
    const xL = w * 0.14, xR = w * 0.86;
    const x0 = dir > 0 ? xL : xR, x1 = dir > 0 ? xR : xL;
    const y0 = base - i * FH, y1 = y0 - FH;
    return { x0, y0, x1, y1, dir };
  }
  function buildClimb(w, h) {
    const rng = mulberry(91), u = Math.min(w, h);
    // wall texture tile (one screen tall, scrolls)
    const W = mk(w, h), x = W.getContext('2d');
    x.fillStyle = '#100a0d';
    x.fillRect(0, 0, w, h);
    const bh = u * 0.07;
    x.strokeStyle = 'rgba(0,0,0,0.55)';
    x.lineWidth = u * 0.003;
    for (let r = 0, y = 0; y < h; r++, y += bh) {
      x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke();
      for (let xx = (r % 2) * bh * 1.2; xx < w; xx += bh * (2 + rng() * 0.8)) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + bh); x.stroke(); }
    }
    x.fillStyle = 'rgba(80,60,80,0.18)';
    for (let i = 0; i < 260; i++) x.fillRect(rng() * w, rng() * h, u * 0.03 * rng(), u * 0.003);
    tone(x, 0, 0, w, h, u * 0.016, 'rgba(169,139,255,0.06)', (px) => 1 - Math.abs(px / w - 0.5) * 2);
    // climbers: per flight, some fall
    const climbers = [];
    for (let i = 0; i < 26; i++) {
      const n = 1 + Math.floor(rng() * 3);
      for (let j = 0; j < n; j++) {
        climbers.push({ f: i, s0: rng() * 0.8, sp: 0.04 + rng() * 0.05, fall: rng() < 0.45 ? S5 + 0.6 + rng() * 6.5 : 1e9, sz: u * (0.11 + rng() * 0.035), kind: Math.floor(rng() * 3) });
      }
    }
    return { W, climbers };
  }
  function climber(ctx, x, y, s, dir, t, kind, rot, rim) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.scale(dir, 1);
    const st = Math.sin(t * 6);
    ctx.fillStyle = P.ink;
    ctx.strokeStyle = P.ink;
    ctx.lineCap = 'round';
    // legs
    ctx.lineWidth = s * 0.09;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.45); ctx.lineTo(s * (0.1 + 0.12 * st), -s * 0.2); ctx.lineTo(s * (0.12 + 0.1 * st), 0);
    ctx.moveTo(0, -s * 0.45); ctx.lineTo(s * (0.02 - 0.12 * st), -s * 0.18); ctx.lineTo(s * (-0.06 - 0.1 * st), 0);
    ctx.stroke();
    // torso, leaning into the climb
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.42);
    ctx.lineTo(s * 0.02, -s * 0.82);
    ctx.lineTo(s * 0.16, -s * 0.78);
    ctx.lineTo(s * 0.1, -s * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.12, -s * 0.9, s * 0.08, 0, TAU); ctx.fill();
    // gear
    if (kind === 0) { ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.95); ctx.lineTo(s * 0.12, -s * 0.35); ctx.stroke(); }
    else if (kind === 1) { ctx.fillRect(-s * 0.16, -s * 0.78, s * 0.14, s * 0.24); }
    else { ctx.beginPath(); ctx.moveTo(-s * 0.06, -s * 0.8); ctx.quadraticCurveTo(-s * 0.32, -s * (0.65 + 0.05 * st), -s * 0.36, -s * 0.4); ctx.lineTo(-s * 0.08, -s * 0.5); ctx.fill(); }
    if (rim) {
      ctx.strokeStyle = rgba(P.bone, rim);
      ctx.lineWidth = s * 0.025;
      ctx.beginPath(); ctx.moveTo(s * 0.02, -s * 0.82); ctx.lineTo(s * 0.16, -s * 0.78); ctx.lineTo(s * 0.1, -s * 0.42); ctx.stroke();
    }
    ctx.restore();
  }

  // ======================================================================
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    let t = 0, done = false, built = null, fontVer = 0;
    const texts = new Map();
    if (document.fonts && document.fonts.load) {
      Promise.all([
        document.fonts.load(`800 40px "Shippori Mincho"`, 'TOWER'),
        document.fonts.load(`700 40px "Shippori Mincho"`, 'Tower'),
        document.fonts.load(`800 40px "M PLUS 1p"`, 'floor'),
      ]).then(() => { fontVer++; }, () => {});
    }
    function ensure() {
      const w = canvas.width, h = canvas.height;
      if (!built || built.w !== w || built.h !== h) {
        built = { w, h, C: buildCommon(w, h), city: buildCity(w, h), climb: buildClimb(w, h), title: null, logo: null };
        texts.clear();
      }
      if (!built.title || built.title.ver !== fontVer) built.title = buildTitle(w, h, fontVer);
      if (!built.logo || built.logo.ver !== fontVer) built.logo = buildLogo(w, h, fontVer);
      return built;
    }
    function caption(key, text, size, maxW, italic) {
      const k = key + '|' + fontVer;
      let L = texts.get(k);
      if (!L) { L = layoutText(text, size, maxW, `${italic ? 'italic ' : ''}700 ${size}px ${SERIF}`); texts.set(k, L); }
      return L;
    }

    // ---------------------------------------------------------- shot 1
    function shot1(B, tl) {
      const { w, h } = B, u = B.C.u;
      ctx.fillStyle = '#060304';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h * 0.42;
      // low glow that breathes with the tone
      let env = 0;
      for (const p of PULSES) env += Math.exp(-Math.max(0, tl - p) * 1.6) * (tl >= p ? 1 : 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25 + env * 0.35;
      blob(ctx, P.crimson, cx, cy, u * 0.9, u * 0.5);
      ctx.globalAlpha = 0.15 + env * 0.2;
      blob(ctx, P.glyph, cx, cy, u * 0.45, u * 0.25);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // pressure rings
      ctx.save();
      for (const p of PULSES) {
        for (let j = 0; j < 3; j++) {
          const age = tl - p - j * 0.22;
          if (age <= 0 || age > 3.4) continue;
          const r = u * 0.04 + age * u * 0.42 * (1 - j * 0.12);
          const a = (1 - age / 3.4) * (j === 0 ? 0.9 : 0.5);
          ctx.strokeStyle = j === 1 ? rgba(P.glyph, a) : rgba(j === 0 ? '#ff4b55' : P.bone, a * 0.8);
          ctx.lineWidth = u * (0.016 - age * 0.004) * (j === 0 ? 1 : 0.5);
          if (ctx.lineWidth <= 0) continue;
          ctx.beginPath();
          ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, TAU);
          ctx.stroke();
        }
      }
      // waveform
      ctx.lineWidth = u * 0.004;
      ctx.strokeStyle = rgba(P.bone, 0.75);
      ctx.beginPath();
      const amp = u * (0.012 + env * 0.07);
      for (let i = 0; i <= 160; i++) {
        const x = (i / 160) * w, d = Math.abs(x - cx) / (w / 2);
        const fall = Math.exp(-d * d * 3.5);
        const y = cy + Math.sin(x * 0.012 + tl * 9) * amp * fall + Math.sin(x * 0.047 - tl * 23) * amp * 0.35 * fall * env;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      motes(ctx, 40, 11, tl, w, h, u, P.bone, 0.3, 0.6, 0.004);
      const L = caption('a', TXT.a, u * 0.062, w * 0.8);
      const fade = 1 - sstep(7.4, 8.2, tl);
      drawLetters(ctx, L, cx, h * 0.72, tl - 1.7, 20, fade, P.bone);
      brush(ctx, cx, h * 0.72 + L.size * 0.85, L.lines[0].w * 0.5, (tl - 4.4) / 0.8, u, fade);
      // flashes on the tone
      return env;
    }

    // ---------------------------------------------------------- city camera
    function drawCity(B, cam, tl, shake, lit) {
      const S = B.city, { w, h } = B, u = B.C.u;
      const ax = S.tx, ay = S.hy;
      const sx = shake ? (hash(Math.floor(tl * 40)) - 0.5) * u * 0.02 * shake : 0;
      const sy = shake ? (hash(Math.floor(tl * 40) + 9) - 0.5) * u * 0.014 * shake : 0;
      const z0 = cam.z, zA = 1 + (z0 - 1) * 0.5, zF = 1 + (z0 - 1) * 0.8, zN = z0 * 1.04;
      layer(ctx, S.A, zA, ax, ay, cam.px * 0.3 + sx * 0.4, sy * 0.4);
      // the Tower glows with the tone
      if (lit > 0.01) {
        const [tx, ty] = camPt(S.tx, (S.hy + S.ttop) / 2, zA, ax, ay, cam.px * 0.3 + sx * 0.4, sy * 0.4);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = lit;
        blob(ctx, '#ff3848', tx, ty, u * 0.12, h * 0.5);
        blob(ctx, P.glyph, tx, ty, u * 0.04, h * 0.45);
        ctx.restore();
      }
      layer(ctx, S.F, zF, ax, ay, cam.px * 0.6 + sx * 0.7, sy * 0.7);
      layer(ctx, S.N, zN, ax, h, cam.px + sx, sy);
      ctx.save();
      ctx.translate(ax - ax * zN + cam.px + sx, h - h * zN + sy);
      ctx.scale(zN, zN);
      for (const sg of S.signs) drawSign(ctx, sg, tl, shake, u);
      ctx.restore();
      return { zA, ax, ay, ox: cam.px * 0.3 + sx * 0.4, oy: sy * 0.4 };
    }

    // ---------------------------------------------------------- shot 2
    function shot2(B, tl) {
      const { w, h } = B, u = B.C.u;
      const k = clamp(tl / (S3 - S2), 0, 1);
      drawCity(B, { z: lerp(1.05, 1.16, sstep(0, 1, k)), px: lerp(u * 0.05, -u * 0.04, k) }, tl, 0, 0.1 + 0.08 * Math.sin(tl * 1.3));
      motes(ctx, 50, 23, tl, w, h, u, '#ffb08a', 0.35, 0.5, 0.0035);
      const La = caption('b', TXT.b, u * 0.052, w * 0.74);
      const Lb = caption('c', TXT.c, u * 0.062, w * 0.8);
      const cy = h * 0.785;
      // dark band behind captions for legibility
      ctx.fillStyle = lin(ctx, 0, h * 0.6, 0, h, [[0, 'rgba(6,3,4,0)'], [0.4, 'rgba(6,3,4,0.6)'], [1, 'rgba(6,3,4,0.8)']]);
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
      drawLetters(ctx, La, w / 2, cy, tl - 2, 30, 1 - sstep(7.6, 8.2, tl), P.bone);
      drawLetters(ctx, Lb, w / 2, cy, tl - 8.6, 22, 1 - sstep(13.3, 14, tl), P.white);
      brush(ctx, w / 2, cy + Lb.size * 0.85, Lb.lines[0].w * 0.6, (tl - 10.6) / 0.9, u, 1 - sstep(13.3, 14, tl));
    }

    // ---------------------------------------------------------- shot 3
    function wipe(img, cx, cy, k, seed, u) {
      if (k <= 0) return;
      const iw = img.width, ih = img.height, x0 = cx - iw / 2, y0 = cy - ih / 2;
      const xr = x0 + (iw + ih * 0.6) * easeOut3(k) - ih * 0.3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x0 - 4, y0 - 4);
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const y = y0 + (ih * i) / n;
        ctx.lineTo(xr + (hash(seed + i) - 0.5) * ih * 0.5 - (i / n) * ih * 0.25, y);
      }
      ctx.lineTo(x0 - 4, y0 + ih + 4);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, x0, y0);
      ctx.restore();
      if (k < 1) {
        // the brush head: a hot streak at the wipe edge
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - k;
        blob(ctx, P.glow, xr, cy, ih * 0.35, ih * 0.6);
        ctx.restore();
      }
    }
    function shot3(B, tl) {
      const { w, h } = B, u = B.C.u, T = B.title;
      const z = 1 + tl * 0.02;
      ctx.drawImage(T.B, w / 2 - (w * z) / 2, h - h * z, w * z, h * z);
      // light pulsing down the spire
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const py = ((tl * 0.5) % 1) * h;
      ctx.globalAlpha = 0.5;
      blob(ctx, P.glyph, w / 2, py, u * 0.05, u * 0.2);
      ctx.restore();
      motes(ctx, 70, 41, tl, w, h, u, '#ff8a7a', 0.5, 1.2, 0.004);
      const out = 1 - sstep(6.4, 7, tl);
      ctx.globalAlpha = out;
      wipe(T.L1, w / 2, h * 0.47, (tl - 0.7) / 0.9, 3, u);
      wipe(T.L2, w / 2, h * 0.47 + T.L1.height * 0.5 + T.L2.height * 0.5, (tl - 1.9) / 1.1, 17, u);
      ctx.globalAlpha = 1;
      // impact frame on the cut
      if (tl < 0.35) {
        ctx.fillStyle = rgba(tl < 0.08 ? P.white : P.bone, 1 - tl / 0.35);
        ctx.fillRect(0, 0, w, h);
      }
      if (tl > 1.85 && tl < 2.2) {
        const r = mulberry(5 + Math.floor(tl * 30));
        speedLines(ctx, r, w / 2, h * 0.55, u * 0.35, Math.hypot(w, h), 40, rgba(P.white, 0.35 * (2.2 - tl) / 0.35), u * 0.01);
      }
    }

    // ---------------------------------------------------------- shot 4
    function shot4(B, tl) {
      const { w, h } = B, u = B.C.u, S = B.city;
      const at = tl + S4;
      let shake = 0, lit = 0.12;
      for (const T0 of TOLLS) {
        const a = at - T0;
        if (a >= 0) { shake += Math.exp(-a * 2.2) * 0.9; lit += Math.exp(-a * 1.5) * 0.85; }
      }
      const k = clamp(tl / (S5 - S4), 0, 1);
      const cam = { z: lerp(1.28, 1.36, k), px: lerp(-u * 0.12, -u * 0.18, k) };
      const C = drawCity(B, cam, at, Math.min(1, shake), lit);
      // sound rings rolling out over the roofs
      const [tx, ty] = camPt(S.tx, S.hy - h * 0.18, C.zA, C.ax, C.ay, C.ox, C.oy);
      ctx.save();
      for (const T0 of TOLLS) {
        for (let j = 0; j < 4; j++) {
          const a = at - T0 - j * 0.16;
          if (a <= 0 || a > 3) continue;
          const r = a * w * 0.5;
          ctx.strokeStyle = j % 2 ? rgba(P.glyph, (1 - a / 3) * 0.7) : rgba('#ff5560', (1 - a / 3) * 0.85);
          ctx.lineWidth = u * 0.012 * (1 - a / 3) * (j ? 0.5 : 1);
          ctx.beginPath();
          ctx.ellipse(tx, ty + r * 0.05, r, r * 0.26, 0, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
      // dust shaken from the roofs
      motes(ctx, 70, 61, tl, w, h * 0.8, u, P.bone, 0.15 + shake * 0.4, -1.4, 0.003);
      // the crowd turns to look
      const base = h * 1.03;
      // lantern-lit haze over the street, so the crowd reads against it
      ctx.fillStyle = lin(ctx, 0, h * 0.5, 0, h, [[0, 'rgba(120,48,40,0)'], [0.45, 'rgba(150,62,48,0.55)'], [0.8, 'rgba(70,26,26,0.7)'], [1, 'rgba(20,8,9,0.9)']]);
      ctx.fillRect(0, h * 0.5, w, h * 0.5);
      const sx = shake ? (hash(Math.floor(at * 40)) - 0.5) * u * 0.01 * shake : 0;
      for (const p of S.crowd) {
        const turn = sstep(TOLLS[0] + 0.2 + p.delay, TOLLS[0] + 0.9 + p.delay, at);
        person(ctx, p, base + sx * 0, at, turn, Math.min(1, lit), u);
      }
      // balloons
      const bs = u * 0.045;
      const a1 = 1 - sstep(8.6, 9.2, tl), a2 = 1 - sstep(8.6, 9.2, tl);
      const p1 = S.crowd[S.crowd.length - 2], p2 = S.crowd[S.crowd.length - 5];
      const head = (p) => [p.x, base - p.s * 1.0];
      const [h1x, h1y] = head(p1), [h2x, h2y] = head(p2);
      const b1x = clamp(h1x + w * 0.08, w * 0.2, w * 0.8), b2x = clamp(h2x - w * 0.06, w * 0.25, w * 0.75);
      balloon(ctx, TXT.e1, b1x, h * 0.3, h1x, h1y, bs, (tl - 2.1) / 0.35, a1);
      balloon(ctx, TXT.e2, b2x, h * 0.46, h2x, h2y, bs, (tl - 4.7) / 0.35, a2);
      return shake;
    }

    // ---------------------------------------------------------- shot 5
    function shot5(B, tl) {
      const { w, h } = B, u = B.C.u, CL = B.climb;
      const FH = h * 0.34, base = h * 0.9, Nf = 22;
      const p = Nf * easeOut3(tl / 8.2); // flights climbed
      const camY = p * FH; // world y + camY = screen y
      // wall (scrolling tile)
      const off = ((camY * 0.6) % h + h) % h;
      ctx.drawImage(CL.W, 0, off - h);
      ctx.drawImage(CL.W, 0, off);
      // the light shaft from far above
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, rgba(P.glyph, 0.35)], [0.6, rgba(P.glyph, 0.06)], [1, rgba(P.glyph, 0)]]);
      ctx.beginPath();
      ctx.moveTo(w * 0.42, 0); ctx.lineTo(w * 0.58, 0); ctx.lineTo(w * 0.74, h); ctx.lineTo(w * 0.26, h); ctx.closePath();
      ctx.fill();
      const fin = sstep(7.5, 10, tl);
      ctx.globalAlpha = 0.25 + fin * 0.75;
      blob(ctx, P.white, w * 0.5, -h * 0.05, u * 0.7, u * 0.35);
      ctx.restore();
      // floor numbers
      const i0 = Math.max(0, Math.floor(p) - 2), i1 = Math.floor(p) + 3;
      ctx.save();
      ctx.font = `italic 800 ${u * 0.2}px ${SERIF}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      for (let i = i0; i <= i1; i++) {
        const sp = stairPath(i, w, FH, base);
        const fl = hash(i * 13 + Math.floor((tl + S5) * 14));
        const a = fl < 0.18 ? 0.05 : fl > 0.9 ? 0.45 : 0.2;
        ctx.globalAlpha = a;
        ctx.strokeStyle = P.glyph;
        ctx.lineWidth = u * 0.003;
        const nx = sp.dir > 0 ? w * 0.78 : w * 0.22, ny = sp.y1 + camY - FH * 0.55;
        ctx.strokeText(String(i + 1), nx + (fl > 0.94 ? u * 0.01 : 0), ny);
      }
      ctx.restore();
      // flights: underside slab + stepped top
      ctx.fillStyle = '#060304';
      ctx.strokeStyle = rgba(P.bone, 0.45);
      ctx.lineWidth = u * 0.0025;
      for (let i = i0; i <= i1; i++) {
        const sp = stairPath(i, w, FH, base);
        const y0 = sp.y0 + camY, y1 = sp.y1 + camY, n = 11, th = h * 0.06;
        ctx.beginPath();
        ctx.moveTo(sp.x0, y0);
        for (let j = 0; j < n; j++) {
          const xa = lerp(sp.x0, sp.x1, j / n), xb = lerp(sp.x0, sp.x1, (j + 1) / n), yb = lerp(y0, y1, (j + 1) / n);
          ctx.lineTo(xa, yb); ctx.lineTo(xb, yb);
        }
        // landing
        ctx.lineTo(sp.x1 + sp.dir * w * 0.12, y1);
        ctx.lineTo(sp.x1 + sp.dir * w * 0.12, y1 + th * 0.6);
        ctx.lineTo(sp.x1, y1 + th * 0.6);
        ctx.lineTo(sp.x0, y0 + th);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        for (let j = 0; j < n; j++) {
          const xa = lerp(sp.x0, sp.x1, j / n), xb = lerp(sp.x0, sp.x1, (j + 1) / n), yb = lerp(y0, y1, (j + 1) / n);
          ctx.moveTo(xa, yb); ctx.lineTo(xb, yb);
        }
        ctx.stroke();
      }
      // climbers
      const at = tl + S5;
      for (const c of CL.climbers) {
        if (c.f < i0 - 1 || c.f > i1) continue;
        const sp = stairPath(c.f, w, FH, base);
        if (at < c.fall) {
          const s = clamp(c.s0 + tl * c.sp, 0, 0.98);
          climber(ctx, lerp(sp.x0, sp.x1, s), lerp(sp.y0, sp.y1, s) + camY, c.sz, sp.dir, at + c.s0 * 5, c.kind, 0, 0.55);
        } else {
          const ft = at - c.fall, s = clamp(c.s0 + (c.fall - S5) * c.sp, 0, 0.98);
          const x = lerp(sp.x0, sp.x1, s) - sp.dir * ft * u * 0.12, y = lerp(sp.y0, sp.y1, s) + camY + ft * ft * h * 1.1;
          if (y > h * 1.3) continue;
          ctx.save();
          ctx.globalAlpha = clamp(1 - ft * 0.7, 0, 1);
          ctx.strokeStyle = rgba(P.glow, 0.5);
          ctx.lineWidth = u * 0.004;
          ctx.beginPath(); ctx.moveTo(x, y - c.sz * 0.5); ctx.lineTo(x + sp.dir * ft * u * 0.05, y - c.sz * 0.5 - ft * h * 0.5); ctx.stroke();
          climber(ctx, x, y, c.sz, sp.dir, at, c.kind, -sp.dir * ft * 3, 0);
          ctx.restore();
        }
      }
      // the last climber, on the final flight
      const sp = stairPath(Nf + 1, w, FH, base);
      const s = clamp(0.25 + tl * 0.035, 0, 0.9);
      climber(ctx, lerp(sp.x0, sp.x1, s), lerp(sp.y0, sp.y1, s) + camY, u * 0.16, sp.dir, at, 2, 0, 0.6 + fin * 0.4);
      // dark falls away below
      ctx.fillStyle = lin(ctx, 0, h * 0.55, 0, h, [[0, 'rgba(4,2,3,0)'], [1, 'rgba(4,2,3,0.95)']]);
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
      motes(ctx, 50, 77, tl, w, h, u, P.glyph, 0.35, 2.2, 0.003);
      // speed lines while racing up
      const spd = 1 - easeOut3(tl / 8.2) + 0.0;
      if (spd > 0.15) {
        ctx.save();
        ctx.globalAlpha = (spd - 0.15) * 0.6;
        ctx.fillStyle = rgba(P.bone, 0.5);
        const r = mulberry(Math.floor(tl * 20) + 3);
        for (let i = 0; i < 26; i++) ctx.fillRect(r() * w, r() * h, u * 0.002, h * (0.1 + r() * 0.3));
        ctx.restore();
      }
      const L = caption('f', TXT.f, u * 0.058, w * 0.72);
      drawLetters(ctx, L, w / 2, h * 0.76, tl - 7.4, 22, 1 - sstep(11.8, 12.4, tl), P.bone);
    }

    // ---------------------------------------------------------- shot 6
    function shot6(B, tl) {
      const { w, h } = B, u = B.C.u, Lg = B.logo;
      const z = 1.06 - tl * 0.005;
      ctx.drawImage(Lg.B, w / 2 - (w * z) / 2, h / 2 - (h * z) / 2, w * z, h * z);
      // glyph circle
      const gk = sstep(0.4, 2.2, tl);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = gk * (0.45 + 0.1 * Math.sin(tl * 2));
      ctx.translate(w / 2, h * 0.5);
      ctx.rotate(tl * 0.08);
      const gs = lerp(1.25, 1, easeOut3(gk));
      ctx.drawImage(Lg.G, (-Lg.G.width / 2) * gs, (-Lg.G.height / 2) * gs, Lg.G.width * gs, Lg.G.height * gs);
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * gk;
      blob(ctx, P.crimson, w / 2, h * 0.5, w * 0.45, h * 0.32);
      ctx.restore();
      motes(ctx, 90, 99, tl, w, h, u, '#ff6a50', 0.65, 1.0, 0.004);
      // title slams in
      const ik = (tl - 0.8) / 0.35;
      if (ik > 0) {
        const sc = ik < 1 ? lerp(1.5, 1, easeOut3(ik)) : 1;
        // sweep of violet light across the glyphs
        const K = Lg.K, kx = K.getContext('2d');
        kx.globalCompositeOperation = 'source-over';
        kx.clearRect(0, 0, K.width, K.height);
        kx.drawImage(Lg.M, 0, 0);
        kx.globalCompositeOperation = 'source-in';
        const sxp = ((tl - 1.6) / 2.4) % 1.6 * K.width * 1.4 - K.width * 0.3;
        kx.fillStyle = lin(kx, sxp - K.width * 0.12, 0, sxp + K.width * 0.12, 0, [[0, 'rgba(169,139,255,0)'], [0.5, 'rgba(220,205,255,0.95)'], [1, 'rgba(169,139,255,0)']]);
        kx.fillRect(0, 0, K.width, K.height);
        ctx.save();
        ctx.globalAlpha = clamp(ik, 0, 1);
        ctx.translate(w / 2, h * 0.5);
        ctx.scale(sc, sc);
        ctx.drawImage(Lg.T, -Lg.T.width / 2, -Lg.T.height / 2);
        if (tl > 1.6) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(K, -K.width / 2, -K.height / 2);
        }
        ctx.restore();
        // thin rules either side, and the impact flash
        const rk = easeOut3((tl - 1.3) / 1);
        if (rk > 0) {
          ctx.fillStyle = rgba(P.bone, 0.7);
          const ry = h * 0.5 + Lg.T.height * 0.42, rl = w * 0.32 * rk;
          ctx.fillRect(w / 2 - rl, ry, rl * 2, u * 0.003);
          ctx.fillStyle = P.glow;
          ctx.save(); ctx.translate(w / 2, ry + u * 0.0015); ctx.rotate(Math.PI / 4); ctx.fillRect(-u * 0.008, -u * 0.008, u * 0.016, u * 0.016); ctx.restore();
        }
        if (ik < 1.6) {
          ctx.fillStyle = rgba(P.white, Math.max(0, 0.85 - ik * 0.55));
          ctx.fillRect(0, 0, w, h);
        }
      }
      return tl > 0.8 && tl < 1.3 ? 1 - (tl - 0.8) / 0.5 : 0;
    }

    // ---------------------------------------------------------- frame
    function draw() {
      const w = canvas.width, h = canvas.height;
      if (w < 2 || h < 2) return;
      const B = ensure(), u = B.C.u;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      let g = 0, seed = 0;
      if (t < S2) {
        const env = shot1(B, t - S1);
        for (const p of PULSES) if (t >= p && t < p + 0.22) { g = 1 - (t - p) / 0.22; seed = p * 100; }
        if (env < 0) g = 0;
      } else if (t < S3) shot2(B, t - S2);
      else if (t < S4) shot3(B, t - S3);
      else if (t < S5) {
        shot4(B, t - S4);
        for (const p of TOLLS) if (t >= p && t < p + 0.3) { g = 1 - (t - p) / 0.3; seed = p * 100; }
      } else if (t < S6) shot5(B, t - S5);
      else { g = shot6(B, t - S6); seed = Math.floor(t * 12); }
      // grain + vignette
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = ctx.createPattern(B.C.grain, 'repeat');
      ctx.save();
      ctx.translate(Math.floor(hash(Math.floor(t * 24)) * 192), Math.floor(hash(Math.floor(t * 24) + 5) * 192));
      ctx.fillRect(-192, -192, w + 192, h + 192);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.drawImage(B.C.vig, 0, 0);
      if (g > 0) glitch(ctx, canvas, g, seed + 1);
      // black dips between shots
      let dark = 0;
      dark = Math.max(dark, 1 - sstep(0, 0.8, t));
      dark = Math.max(dark, sstep(S2 - 0.4, S2, t) * (1 - sstep(S2, S2 + 1.4, t)));
      dark = Math.max(dark, sstep(S4 - 0.5, S4, t) * (1 - sstep(S4, S4 + 0.9, t)));
      dark = Math.max(dark, sstep(S5 - 0.5, S5, t) * (1 - sstep(S5, S5 + 0.6, t)));
      dark = Math.max(dark, sstep(S6 - 0.6, S6, t) * (1 - sstep(S6, S6 + 0.5, t)));
      dark = Math.max(dark, sstep(END - 2.4, END - 0.4, t));
      if (dark > 0) { ctx.fillStyle = rgba('#050203', dark); ctx.fillRect(0, 0, w, h); }
      // letterbox
      const bar = h * 0.085 * sstep(0, 1.2, t);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, bar);
      ctx.fillRect(0, h - bar, w, bar);
      ctx.fillStyle = rgba(P.crimson, 0.5);
      ctx.fillRect(0, bar - u * 0.002, w, u * 0.002);
      ctx.fillRect(0, h - bar, w, u * 0.002);
      ctx.restore();
    }

    return {
      update(dt) {
        t += Math.max(0, +dt || 0);
        return done || t >= END;
      },
      draw,
      skip() { done = true; },
      seek(s) { t = Math.max(0, +s || 0); }, // debug / screenshots
      get time() { return t; },
    };
  }

  CINE.opening = { create, DURATION: END };
})();
