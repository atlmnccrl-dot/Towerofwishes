/*
 * Tower of Wishes — the world map's land as an illustrated parchment map (option B,
 * 2026-10-22): ink line work and watercolour washes like a fantasy novel's map. Paper with a
 * worn edge, washes per land, the river, the road in dashed ink, map symbols for each land
 * (trees, hills, mountains, houses, ruins, spires, fields, tents, snowy pines) and the Tower
 * drawn up the eastern edge. Unreached lands lie under parchment cloud.
 *
 *   NS.inkmap.build(view, Campaign) -> canvas (1600 x 800: map space 1000 x 500, 1.6 px a unit)
 * js/render/overworld.js draws it and puts the stops, labels and Kael on top.
 */
(function () {
  'use strict';
  const NS = (window.TowRender = window.TowRender || {});
  const K = 1.6, BW = 1600, BH = 800;
  const INK = '#2a1c12', PAPER = '#cdb68a', PAPER2 = '#b89c6c';
  // Watercolour per land
  const WASH = {
    forest: '#6f8f58', town: '#c9a46a', fields: '#b9c27c', hills: '#b48a5a', ruins: '#9a978a', city: '#6e6782',
    wilds: '#62704c', farms: '#d6b862', camp: '#7c6c8c', frost: '#d7e3ee', tower: '#80769a',
  };

  function rngOf(seed) { let s = seed % 2147483647 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }
  // A gentle curve per road: one control point off the straight line.
  function curve(a, b, seed) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
    const k = ((seed % 7) - 3) * 0.045;
    return { a, b, c: { x: mx - dy * k, y: my + dx * k } };
  }
  function curvePts(cv, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push({ x: u * u * cv.a.x + 2 * u * t * cv.c.x + t * t * cv.b.x, y: u * u * cv.a.y + 2 * u * t * cv.c.y + t * t * cv.b.y });
    }
    return out;
  }

  function build(view, C) {
    const c = document.createElement('canvas'); c.width = BW; c.height = BH;
    const g = c.getContext('2d');
    const X = (x) => x * K, Y = (y) => y * K;
    const rnd = rngOf(1234);
    const byId = Object.fromEntries(view.nodes.map((n) => [n.id, n]));

    // ---- paper
    g.fillStyle = PAPER; g.fillRect(0, 0, BW, BH);
    for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(120,90,50,0.05)' : 'rgba(255,250,235,0.08)'; g.fillRect(rnd() * BW, rnd() * BH, 1 + rnd() * 2, 1 + rnd() * 2); }
    // aged vellum: big mottled patches, darker toward the edges
    for (let i = 0; i < 40; i++) {
      const x = rnd() * BW, y = rnd() * BH, r = 80 + rnd() * 220, gr = g.createRadialGradient(x, y, r * 0.1, x, y, r);
      const dark = rnd() < 0.55;
      gr.addColorStop(0, dark ? 'rgba(110,78,40,0.10)' : 'rgba(240,222,180,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 14; i++) { // tea stains
      const x = rnd() * BW, y = rnd() * BH, r = 40 + rnd() * 120, gr = g.createRadialGradient(x, y, r * 0.2, x, y, r);
      gr.addColorStop(0, 'rgba(150,110,60,0.07)'); gr.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // ---- where things may not be drawn: roads, river, stops
    const roads = [];
    view.edges.forEach((e, i) => {
      const a = byId[e.a], b = byId[e.b];
      if (!a || !b || (e.a === 'c15' && e.b === 'prologue') || a.region === 'tower' && b.region === 'tower') return;
      roads.push({ cv: curve(a, b, i * 13 + a.x), side: e.side });
    });
    const roadPts = roads.map((r) => curvePts(r.cv, 24));
    const R = C.RIVER;
    function clear(x, y, pad) {
      for (const n of view.nodes) if (Math.hypot(n.x - x, n.y - y) < 24 + pad) return false;
      for (const pts of roadPts) for (let i = 0; i + 1 < pts.length; i++) if (segDist(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < 11 + pad) return false;
      for (let i = 0; i + 1 < R.length; i++) if (segDist(x, y, R[i][0], R[i][1], R[i + 1][0], R[i + 1][1]) < 13 + pad) return false;
      if (x > 905 && x < 965 && y > 25 && y < 360) return false; // the Tower
      return true;
    }
    // ---- washes
    for (const r of view.regions) {
      const col = WASH[r.px] || WASH.fields, rr = r.r * K * 1.05;
      for (let i = 0; i < 4; i++) {
        const ox = (rnd() - 0.5) * rr * 0.4, oy = (rnd() - 0.5) * rr * 0.3;
        const gr = g.createRadialGradient(X(r.x) + ox, Y(r.y) + oy, rr * 0.1, X(r.x) + ox, Y(r.y) + oy, rr);
        gr.addColorStop(0, col + '66'); gr.addColorStop(0.7, col + '3a'); gr.addColorStop(1, col + '00');
        g.fillStyle = gr; g.beginPath(); g.ellipse(X(r.x) + ox, Y(r.y) + oy, rr, rr * 0.82, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // ---- the river
    g.lineCap = 'round'; g.lineJoin = 'round';
    const riverPath = () => {
      g.beginPath(); g.moveTo(X(R[0][0]), Y(R[0][1]));
      for (let i = 1; i < R.length - 1; i++) { const mx = (R[i][0] + R[i + 1][0]) / 2, my = (R[i][1] + R[i + 1][1]) / 2; g.quadraticCurveTo(X(R[i][0]), Y(R[i][1]), X(mx), Y(my)); }
      g.lineTo(X(R[R.length - 1][0]), Y(R[R.length - 1][1]));
    };
    riverPath(); g.strokeStyle = INK; g.lineWidth = 15; g.stroke();
    riverPath(); g.strokeStyle = '#8fb4c6'; g.lineWidth = 12; g.stroke();
    riverPath(); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; g.setLineDash([6, 14]); g.stroke(); g.setLineDash([]);

    // ---- symbols
    const ink = (w) => { g.strokeStyle = INK; g.lineWidth = (w || 1.6) * 1.5; g.stroke(); };
    const sym = {
      tree(x, y, s, col) {
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 0.9); ink(1.4);
        g.beginPath(); g.arc(x, y - s * 1.25, s * 0.62, 0, Math.PI * 2); g.fillStyle = col || '#7f9c62'; g.fill(); ink(1.4);
        g.beginPath(); g.arc(x + s * 0.18, y - s * 1.1, s * 0.4, 0.2, 1.6); g.strokeStyle = 'rgba(40,50,30,0.5)'; g.lineWidth = 1.2; g.stroke();
      },
      pine(x, y, s, snow) {
        g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.7, y - s * 0.3); g.lineTo(x - s * 0.7, y - s * 0.3); g.closePath();
        g.fillStyle = snow ? '#eef2f6' : '#5f7f55'; g.fill(); ink(1.4);
        if (snow) { g.beginPath(); g.moveTo(x, y - s * 1.2); g.lineTo(x + s * 0.5, y - s * 0.5); g.strokeStyle = 'rgba(80,100,120,0.6)'; g.lineWidth = 1; g.stroke(); }
        g.beginPath(); g.moveTo(x, y - s * 0.3); g.lineTo(x, y); ink(1.4);
      },
      dead(x, y, s) {
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.8); g.moveTo(x, y - s * 1.1); g.lineTo(x - s * 0.6, y - s * 1.6);
        g.moveTo(x, y - s * 1.3); g.lineTo(x + s * 0.55, y - s * 1.9); g.moveTo(x, y - s * 0.7); g.lineTo(x + s * 0.4, y - s * 1.0); ink(1.5);
      },
      hill(x, y, s) {
        g.beginPath(); g.moveTo(x - s * 1.4, y); g.quadraticCurveTo(x, y - s * 1.6, x + s * 1.4, y); g.fillStyle = 'rgba(180,140,90,0.35)'; g.fill(); ink(1.6);
        for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + s * (0.3 + i * 0.3), y - s * (0.55 - i * 0.12)); g.lineTo(x + s * (0.45 + i * 0.3), y - s * 0.05); ink(1); }
      },
      mountain(x, y, s, snow) {
        g.beginPath(); g.moveTo(x - s * 1.3, y); g.lineTo(x - s * 0.1, y - s * 2); g.lineTo(x + s * 1.3, y); g.closePath();
        g.fillStyle = '#cdb98e'; g.fill();
        g.beginPath(); g.moveTo(x - s * 0.1, y - s * 2); g.lineTo(x + s * 1.3, y); g.lineTo(x + s * 0.15, y); g.closePath(); g.fillStyle = 'rgba(90,70,45,0.35)'; g.fill();
        if (snow) { g.beginPath(); g.moveTo(x - s * 0.1, y - s * 2); g.lineTo(x - s * 0.5, y - s * 1.35); g.lineTo(x - s * 0.15, y - s * 1.5); g.lineTo(x + s * 0.3, y - s * 1.3); g.closePath(); g.fillStyle = '#f6f2e8'; g.fill(); }
        g.beginPath(); g.moveTo(x - s * 1.3, y); g.lineTo(x - s * 0.1, y - s * 2); g.lineTo(x + s * 1.3, y); ink(1.7);
      },
      house(x, y, s, roof) {
        g.beginPath(); g.rect(x - s * 0.6, y - s * 0.8, s * 1.2, s * 0.8); g.fillStyle = '#efe2c4'; g.fill(); ink(1.3);
        g.beginPath(); g.moveTo(x - s * 0.8, y - s * 0.8); g.lineTo(x, y - s * 1.5); g.lineTo(x + s * 0.8, y - s * 0.8); g.closePath(); g.fillStyle = roof || '#a8553a'; g.fill(); ink(1.3);
        g.fillStyle = INK; g.fillRect(x - s * 0.1, y - s * 0.4, s * 0.2, s * 0.4);
      },
      hall(x, y, s) { // the Guild: a long hall with a banner
        g.beginPath(); g.rect(x - s * 1.3, y - s * 0.9, s * 2.6, s * 0.9); g.fillStyle = '#efe2c4'; g.fill(); ink(1.5);
        g.beginPath(); g.moveTo(x - s * 1.5, y - s * 0.9); g.lineTo(x - s * 1.1, y - s * 1.6); g.lineTo(x + s * 1.1, y - s * 1.6); g.lineTo(x + s * 1.5, y - s * 0.9); g.closePath(); g.fillStyle = '#6d4a8a'; g.fill(); ink(1.5);
        g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x, y - s * 2.4); ink(1.3);
        g.beginPath(); g.moveTo(x, y - s * 2.4); g.lineTo(x + s * 0.6, y - s * 2.2); g.lineTo(x, y - s * 2.0); g.fillStyle = '#b3373a'; g.fill(); ink(1);
      },
      column(x, y, s) {
        g.beginPath(); g.rect(x - s * 0.25, y - s * (1.2 + (x % 3) * 0.3), s * 0.5, s * (1.2 + (x % 3) * 0.3)); g.fillStyle = '#d8d2c2'; g.fill(); ink(1.3);
        g.beginPath(); g.rect(x - s * 0.4, y - s * 0.15, s * 0.8, s * 0.15); ink(1.2);
      },
      spire(x, y, s) {
        g.beginPath(); g.rect(x - s * 0.35, y - s * 1.8, s * 0.7, s * 1.8); g.fillStyle = '#7d7590'; g.fill(); ink(1.3);
        g.beginPath(); g.moveTo(x - s * 0.5, y - s * 1.8); g.lineTo(x, y - s * 2.6); g.lineTo(x + s * 0.5, y - s * 1.8); g.closePath(); g.fillStyle = '#4e4762'; g.fill(); ink(1.3);
        g.fillStyle = '#f0d58a'; g.fillRect(x - s * 0.08, y - s * 1.3, s * 0.16, s * 0.22);
      },
      field(x, y, s, a) {
        g.save(); g.translate(x, y); g.rotate(a);
        g.beginPath(); g.rect(-s * 1.3, -s * 0.6, s * 2.6, s * 1.2); g.fillStyle = 'rgba(214,184,98,0.55)'; g.fill(); ink(1.1);
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-s * 1.2, i * s * 0.35); g.lineTo(s * 1.2, i * s * 0.35); g.strokeStyle = 'rgba(80,60,30,0.45)'; g.lineWidth = 1; g.stroke(); }
        g.restore();
      },
      tent(x, y, s, col) {
        g.beginPath(); g.moveTo(x - s, y); g.lineTo(x, y - s * 1.3); g.lineTo(x + s, y); g.closePath(); g.fillStyle = col; g.fill(); ink(1.4);
        g.beginPath(); g.moveTo(x, y - s * 1.3); g.lineTo(x, y); ink(1);
      },
      rock(x, y, s) {
        g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.7, y - s * 0.7); g.lineTo(x + s * 0.1, y - s * 0.9); g.lineTo(x + s * 0.9, y - s * 0.4); g.lineTo(x + s, y); g.closePath();
        g.fillStyle = '#bdb6a4'; g.fill(); ink(1.3);
      },
    };
    // Each land's symbols (map units: size s), placed with spacing, back to front.
    const DRESS = {
      forest: [[['tree', 1], ['tree', 1.1], ['pine', 1]], 40, 11],
      town: [[['house', 1], ['house', 1.1], ['tree', 0.8]], 16, 10],
      fields: [[['tree', 0.9], ['hill', 0.8], ['tree', 0.8]], 9, 10],
      hills: [[['hill', 1], ['hill', 1.2], ['rock', 0.8], ['mountain', 1.1]], 18, 11],
      ruins: [[['column', 1], ['column', 0.85], ['rock', 0.8]], 12, 10],
      city: [[['spire', 1], ['spire', 1.2], ['house', 0.9], ['column', 0.8]], 18, 10],
      wilds: [[['dead', 1], ['tree', 0.9], ['dead', 0.85]], 18, 10],
      farms: [[['field', 1], ['field', 1.1], ['house', 0.8]], 10, 9],
      camp: [[['tent', 0.9], ['dead', 1], ['tree', 0.9]], 9, 9],
      frost: [[['pine', 1, true], ['pine', 0.9, true], ['rock', 0.8]], 16, 10],
    };
    const placed = [];
    for (const r of view.regions) {
      const D = DRESS[r.px]; if (!D) continue;
      const pr = rngOf(r.x * 31 + r.y * 7); if (!r.revealed) continue; // (under cloud: nothing to draw)
      for (let n = 0, tries = 0; n < D[1] && tries < D[1] * 30; tries++) {
        const a = pr() * Math.PI * 2, d = Math.sqrt(pr()) * r.r * 0.92;
        const x = r.x + Math.cos(a) * d, y = r.y + Math.sin(a) * d * 0.8;
        if (x < 12 || x > 988 || y < 40 || y > 490 || !clear(x, y, 0)) continue;
        if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < D[2] * 1.25)) continue;
        const pick = D[0][Math.floor(pr() * D[0].length)];
        placed.push({ x, y, kind: pick[0], s: pick[1] * D[2], extra: pick[2], px: r.px, a: (pr() - 0.5) * 0.6, roof: pr() < 0.5 ? '#a8553a' : '#5f6f8a' });
        n++;
      }
    }
    // the Guild hall beside The First Contract
    const guild = byId.c4;
    if (guild) placed.push({ x: guild.x + 34, y: guild.y + 6, kind: 'hall', s: 12 });
    // mountains along the north edge
    const mr = rngOf(77);
    for (let x = 20; x < 900; x += 26 + mr() * 14) { const y = 42 + mr() * 12; if (clear(x, y, -10)) placed.push({ x, y, kind: 'mountain', s: 14 + mr() * 7, extra: mr() < 0.45 }); }
    placed.sort((a, b) => a.y - b.y);
    for (const p of placed) {
      const x = X(p.x), y = Y(p.y), s = p.s * K;
      if (p.kind === 'tree') sym.tree(x, y, s, p.px === 'wilds' || p.px === 'camp' ? '#6a7a50' : null);
      else if (p.kind === 'pine') sym.pine(x, y, s, p.extra);
      else if (p.kind === 'house') sym.house(x, y, s, p.px === 'city' ? '#4e4762' : p.roof);
      else if (p.kind === 'field') sym.field(x, y, s, p.a);
      else if (p.kind === 'tent') sym.tent(x, y, s, p.roof === '#a8553a' ? '#b0643e' : '#7a8a5a');
      else if (p.kind === 'mountain') sym.mountain(x, y, s, p.extra);
      else sym[p.kind](x, y, s);
    }

    // ---- roads: side paths dotted, the main road in dashed ink
    for (const side of [true, false]) {
      roads.forEach((r, i) => {
        if (!!r.side !== side) return;
        const cv = r.cv;
        g.beginPath(); g.moveTo(X(cv.a.x), Y(cv.a.y)); g.quadraticCurveTo(X(cv.c.x), Y(cv.c.y), X(cv.b.x), Y(cv.b.y));
        if (side) { g.setLineDash([2, 7]); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke(); }
        else {
          g.setLineDash([]); g.strokeStyle = 'rgba(234,217,180,0.9)'; g.lineWidth = 9; g.stroke();
          g.setLineDash([12, 7]); g.strokeStyle = '#6b4526'; g.lineWidth = 4; g.stroke();
        }
        g.setLineDash([]);
      });
    }
    // the bridge where the road meets the river
    for (const pts of roadPts) for (let i = 0; i + 1 < pts.length; i++) {
      for (let k = 0; k + 1 < R.length; k++) {
        const p = pts[i];
        if (segDist(p.x, p.y, R[k][0], R[k][1], R[k + 1][0], R[k + 1][1]) < 4) {
          const q = pts[i + 1], a = Math.atan2(q.y - p.y, q.x - p.x);
          g.save(); g.translate(X(p.x), Y(p.y)); g.rotate(a);
          g.fillStyle = '#9b7347'; g.fillRect(-14, -6, 28, 12); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(-14, -6, 28, 12);
          for (let j = -10; j <= 10; j += 5) { g.beginPath(); g.moveTo(j, -6); g.lineTo(j, 6); g.lineWidth = 0.8; g.stroke(); }
          g.restore();
          i = pts.length; break;
        }
      }
    }

    // ---- the Tower, up the eastern edge
    const tw = view.regions.find((r) => r.id === 'tower');
    if (tw) {
      const cx = X(tw.x), top = Y(38), bot = Y(365);
      const w0 = 30 * K, w1 = 18 * K;
      g.beginPath(); g.moveTo(cx - w0 / 2, bot); g.lineTo(cx - w1 / 2, top); g.lineTo(cx + w1 / 2, top); g.lineTo(cx + w0 / 2, bot); g.closePath();
      g.fillStyle = '#9890a8'; g.fill();
      g.beginPath(); g.moveTo(cx, bot); g.lineTo(cx, top); g.lineTo(cx + w1 / 2, top); g.lineTo(cx + w0 / 2, bot); g.closePath(); g.fillStyle = 'rgba(40,30,60,0.28)'; g.fill();
      for (let y = top + 14; y < bot; y += 14) { const k = (y - top) / (bot - top), hw = (w1 + (w0 - w1) * k) / 2; g.beginPath(); g.moveTo(cx - hw, y); g.lineTo(cx + hw, y); g.strokeStyle = 'rgba(58,42,28,0.35)'; g.lineWidth = 1; g.stroke(); }
      g.beginPath(); g.moveTo(cx - w0 / 2, bot); g.lineTo(cx - w1 / 2, top); g.lineTo(cx + w1 / 2, top); g.lineTo(cx + w0 / 2, bot); g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke();
      // the crown
      g.beginPath(); g.moveTo(cx - w1 / 2 - 4, top); g.lineTo(cx - w1 / 2 - 4, top - 10); g.lineTo(cx - 4, top - 6); g.lineTo(cx, top - 22); g.lineTo(cx + 4, top - 6); g.lineTo(cx + w1 / 2 + 4, top - 10); g.lineTo(cx + w1 / 2 + 4, top); g.closePath();
      g.fillStyle = '#6a6084'; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
      // rocks round its foot
      for (let i = 0; i < 6; i++) sym.rock(cx - w0 * 0.9 + i * w0 * 0.36, bot + 4 + (i % 2) * 5, 6 * K);
    }

    // ---- cloud over lands nobody has reached
    for (const r of view.regions) {
      if (r.revealed) continue;
      const cr = rngOf(r.x * 7 + 3), rr = r.r * K * 1.15;
      for (let i = 0; i < 22; i++) {
        const a = cr() * Math.PI * 2, d = Math.sqrt(cr()) * rr * 0.85, x = X(r.x) + Math.cos(a) * d, y = Y(r.y) + Math.sin(a) * d * 0.85, rad = rr * (0.3 + cr() * 0.25);
        const gr = g.createRadialGradient(x, y, rad * 0.3, x, y, rad);
        gr.addColorStop(0, 'rgba(196,174,132,0.97)'); gr.addColorStop(0.75, 'rgba(190,168,126,0.9)'); gr.addColorStop(1, 'rgba(190,168,126,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
      }
      // a few curls of ink
      for (let i = 0; i < 3; i++) {
        const x = X(r.x) + (cr() - 0.5) * rr, y = Y(r.y) + (cr() - 0.5) * rr * 0.6, s = 10 + cr() * 8;
        g.beginPath(); g.arc(x, y, s, Math.PI, Math.PI * 2); g.arc(x + s * 1.6, y, s * 0.6, Math.PI, Math.PI * 2); g.strokeStyle = 'rgba(58,42,28,0.35)'; g.lineWidth = 1.4; g.stroke();
      }
    }

    // ---- compass rose and a worn double border
    const ccx = X(40), ccy = Y(455), cs = 26;
    g.beginPath(); g.arc(ccx, ccy, cs * 0.75, 0, Math.PI * 2); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 - Math.PI / 2;
      g.beginPath(); g.moveTo(ccx + Math.cos(a) * cs, ccy + Math.sin(a) * cs);
      g.lineTo(ccx + Math.cos(a + 0.6) * cs * 0.25, ccy + Math.sin(a + 0.6) * cs * 0.25);
      g.lineTo(ccx + Math.cos(a - 0.6) * cs * 0.25, ccy + Math.sin(a - 0.6) * cs * 0.25); g.closePath();
      g.fillStyle = i === 0 ? '#a8553a' : '#efe2c4'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
    }
    g.fillStyle = INK; g.font = 'italic 16px Georgia, serif'; g.textAlign = 'center'; g.fillText('N', ccx, ccy - cs - 6);
    const vg = g.createRadialGradient(BW / 2, BH / 2, BH * 0.45, BW / 2, BH / 2, BW * 0.62);
    vg.addColorStop(0, 'rgba(60,36,16,0)'); vg.addColorStop(0.75, 'rgba(60,36,16,0.35)'); vg.addColorStop(1, 'rgba(24,12,6,0.85)');
    g.fillStyle = vg; g.fillRect(0, 0, BW, BH);
    // scorched, uneven edge
    const er = rngOf(4242);
    g.fillStyle = 'rgba(20,10,5,0.9)';
    for (let x = 0; x < BW; x += 6) { const h1 = 6 + er() * 14, h2 = 6 + er() * 14; g.fillRect(x, 0, 6, h1); g.fillRect(x, BH - h2, 6, h2); }
    for (let y = 0; y < BH; y += 6) { const w1 = 6 + er() * 14, w2 = 6 + er() * 14; g.fillRect(0, y, w1, 6); g.fillRect(BW - w2, y, w2, 6); }
    g.strokeStyle = 'rgba(42,28,18,0.8)'; g.lineWidth = 2; g.strokeRect(26, 26, BW - 52, BH - 52);
    g.lineWidth = 1; g.strokeRect(32, 32, BW - 64, BH - 64);
    return c;
  }
  // The roads as the land draws them (overworld.js lights the travelled ones along the same curves).
  function roads(view) {
    const byId = Object.fromEntries(view.nodes.map((n) => [n.id, n])), out = [];
    view.edges.forEach((e, i) => {
      const a = byId[e.a], b = byId[e.b];
      if (!a || !b || (e.a === 'c15' && e.b === 'prologue') || a.region === 'tower' && b.region === 'tower') return;
      out.push({ a: e.a, b: e.b, side: e.side, pts: curvePts(curve(a, b, i * 13 + a.x), 24) });
    });
    return out;
  }

  NS.inkmap = { build, roads };
})();
