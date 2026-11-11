// VESPER — the moon arts as cinematics, drawn over the frozen fight on the pixel buffer.
//   Last Ditch Effort (6.4 s): snap to black · the visor and the red eye · the title over the
//   falling blade · the blade planted under a pale moon · the draw · Lys's flower · the red moon
//   assault in silhouette · the red frame.  Red Moon (3.4 s): snap · draw · red moon · red frame.
// Also the boss name card and the floating lines used in fights.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.PX;
  const C = VS.cine = {};
  const W = () => R.W, H = () => R.H;
  const RED = '#ff2a44', INK = '#050507';

  C.BEATS = {
    ldx: [['snap', 0, 0.3], ['eye', 0.3, 1.3], ['title', 1.3, 2.3], ['plant', 2.3, 2.8], ['draw', 2.8, 3.8], ['lys', 3.8, 4.3], ['moon', 4.3, 5.95], ['red', 5.95, 6.4]],
    moon: [['snap', 0, 0.25], ['draw', 0.25, 1.15], ['moon', 1.15, 2.95], ['red', 2.95, 3.4]],
    petals: [['snap', 0, 0.3], ['bloom', 0.3, 1.5], ['petalstorm', 1.5, 3.5], ['finale', 3.5, 4.2]],
    storm: [['snap', 0, 0.3], ['charge', 0.3, 1.4], ['spear', 1.4, 2.5], ['thunderrain', 2.5, 3.5], ['finale', 3.5, 4.2]],
    cuts: [['snap', 0, 0.3], ['vanish', 0.3, 1.0], ['hundred', 1.0, 3.5], ['finale', 3.5, 4.2]],
  };
  C.beatAt = function (c) {
    for (const b of C.BEATS[c.kind]) if (c.t < b[2]) return b;
    const L = C.BEATS[c.kind]; return L[L.length - 1];
  };
  // Sound cues crossed between two times (for audio): [name, volume].
  C.cues = function (c, t0, t1) {
    const out = [], at = (t) => t0 < t && t <= t1;
    for (const b of C.BEATS[c.kind]) {
      if (!at(b[1])) continue;
      ({ bloom: () => out.push(['magic', 0.9]), petalstorm: () => out.push(['whoosh', 1]), charge: () => out.push(['charge', 1]), spear: () => { out.push(['blow_big', 1]); out.push(['quake', 1]); }, thunderrain: () => out.push(['quake', 0.8]),
        vanish: () => out.push(['whoosh', 0.8]), hundred: () => out.push(['slash_2', 1]), finale: () => { out.push(['blow_big', 1]); out.push(['ko', 0.8]); },
        snap: () => out.push(['charge', 0.9]), eye: () => out.push(['quake', 0.6]), title: () => { out.push(['allout', 1]); out.push(['clang_1', 0.7]); },
        plant: () => { out.push(['blow_big', 1]); out.push(['quake', 0.8]); }, draw: () => { out.push(['whoosh', 1]); }, lys: () => out.push(['magic', 0.8]),
        moon: () => out.push(['swish_0', 0.8]), red: () => { out.push(['blow_big', 1]); out.push(['ko', 0.8]); } })[b[0]]();
    }
    const m = C.BEATS[c.kind].find((b) => b[0] === 'moon');
    if (m) for (let i = 0; i < 6; i++) { const ht = m[1] + (m[2] - m[1]) * (0.3 + 0.7 * (i + 0.6) / 6); if (at(ht)) out.push([i % 2 ? 'slash_1' : 'slash_2', 0.8]); }
    const d = C.BEATS[c.kind].find((b) => b[0] === 'draw'); if (d && at(d[1] + (d[2] - d[1]) * 0.45)) out.push(['slash_0', 1]);
    const many = C.BEATS[c.kind].find((b) => b[0] === 'petalstorm' || b[0] === 'hundred' || b[0] === 'thunderrain');
    if (many) for (let i = 0; i < 8; i++) { const ht = many[1] + (many[2] - many[1]) * (i + 0.5) / 8; if (at(ht)) out.push([c.kind === 'storm' ? 'quake' : i % 2 ? 'slash_1' : 'swish_2', 0.6]); }
    return out;
  };

  // ---- drawing helpers -------------------------------------------------------------------------
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const fill = (ctx, col, a) => { ctx.save(); if (a != null) ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, W(), H()); ctx.restore(); };
  function line(ctx, x0, y0, x1, y1, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); ctx.lineTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5); ctx.stroke();
  }
  function crack(ctx, x, y, dir, len, seed, col, w) {
    let px = x, py = y, a = dir;
    ctx.strokeStyle = col; ctx.lineWidth = w || 1; ctx.beginPath(); ctx.moveTo(px, py);
    for (let i = 0; i < 8; i++) { a += (hash(seed, i) - 0.5) * 1.1; px += Math.cos(a) * len / 8; py += Math.sin(a) * len / 8; ctx.lineTo(Math.round(px), Math.round(py)); }
    ctx.stroke();
  }
  function speedLines(ctx, cx, cy, n, col, seed, t, inner) {
    ctx.strokeStyle = col; ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const a = hash(seed, i) * Math.PI * 2, r0 = (inner || 40) + hash(seed + 1, i) * 60 + ((t * 300 + i * 13) % 80), r1 = r0 + 30 + hash(seed + 2, i) * 90;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
  }
  function hStreaks(ctx, n, col, seed, t, speed) {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const y = Math.floor(hash(seed, i) * H()), len = 20 + hash(seed + 1, i) * 80, x = W() - ((t * (speed || 900) + hash(seed + 2, i) * 1000) % (W() + len * 2));
      ctx.fillRect(Math.round(x), y, Math.round(len), 1);
    }
  }
  function sword(ctx, x, y, len, a, glow, k) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(a); if (k) ctx.scale(k, k);
    if (glow) { ctx.fillStyle = 'rgba(255,42,68,0.35)'; ctx.fillRect(-4, -len, 8, len + 6); }
    ctx.fillStyle = '#d8dce8'; ctx.fillRect(-1, -len, 3, len);      // the blade
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -len, 1, len);
    ctx.fillStyle = RED; ctx.fillRect(-1, -len + 2, 1, len - 4);       // a red edge
    ctx.fillStyle = '#8a8e9a'; ctx.fillRect(-6, 0, 13, 2);             // the guard
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(-1, 2, 3, 9);              // the grip
    ctx.fillStyle = RED; ctx.fillRect(-2, 11, 5, 3);                   // the pommel
    ctx.restore();
  }
  function flower(ctx, cx, cy, r, col, rot) {
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.rotate(rot || 0); ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i * Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, -r * 0.55, r * 0.32, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, Math.max(1, r * 0.14), 0, 7); ctx.fill();
    ctx.restore();
  }
  // Big glitchy title: red, a dark drop, sliced and shifted rows on the punch-in.
  function title(ctx, text, x, y, size, k, t) {
    const pad = 4, key = text + '|' + size;
    let c = title.cache && title.cache[key];
    if (!c) {
      ctx.font = R.font(size); const w = Math.ceil(ctx.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.4);
      c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.font = R.font(size); g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = '#3a000a'; g.fillText(text, pad + 2, h / 2 + 2);
      g.fillStyle = RED; g.fillText(text, pad, h / 2);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, h / 2 - size * 0.42, w, 1);
      (title.cache = title.cache || {})[key] = c;
    }
    const w = c.width, h = c.height;
    const punch = k < 0.12 ? 1 + (0.12 - k) * 3 : 1, sh = k < 0.5 ? (Math.random() - 0.5) * 3 : 0;
    const dw = Math.round(w * punch), dh = Math.round(h * punch), dx = Math.round(x - dw / 2 + sh), dy = Math.round(y - dh / 2);
    for (let row = 0; row < dh; row += 3) {
      const off = (k < 0.25 || (t * 10 | 0) % 7 === 0) && hash(row, (t * 20) | 0) < 0.25 ? Math.round((hash(row, 3) - 0.5) * 14) : 0;
      ctx.drawImage(c, 0, row / punch, w, 3 / punch, dx + off, dy + row, dw, 3);
    }
  }

  // Red embers rising through a shot (the hero's power gathering).
  function embers(ctx, T, n, x0, x1, col) {
    for (let i = 0; i < n; i++) { const x = x0 + hash(i, 61) * (x1 - x0) + Math.sin(T * 3 + i) * 3, y = H() - ((T * (30 + hash(i, 62) * 50) + hash(i, 63) * H()) % (H() + 10)); ctx.fillStyle = i % 4 ? col : '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), i % 3 ? 1 : 2, i % 3 ? 1 : 2); }
  }
  // The figures in the shot.
  const hero = (s) => s.hero;
  const target = (s, c) => s.units.find((u) => u.id === c.main) || s.units.find((u) => u.team === 'foe');

  // ---- the beats -----------------------------------------------------------------------------------
  const B = {};
  // The world drops to black; the hero stays lit, a red line cuts across.
  B.snap = function (ctx, s, c, k) {
    fill(ctx, INK, Math.min(0.92, k * 1.6));
    const h = hero(s), at = R.heroAt || { x: W() / 2, y: H() * 0.8, k: 1 }, x = Math.round(at.x), y = Math.round(at.y);
    const fr = Math.min(6, Math.floor(k * 7)), fa = h.face > 0 ? 0 : Math.PI;
    A.actor(ctx, h.set, 'Special1', fr, fa, x, y, at.k, { shade: RED, alpha: 0.4 + 0.6 * k });
    A.actor(ctx, h.set, 'Special1', fr, fa, x, y, at.k, { alpha: 1 - k });
    for (let i = 0; i < 14; i++) { const px = x + (hash(i, 5) - 0.5) * 30 * at.k, py = y - ((k * 60 + hash(i, 6) * 40) % 50) * at.k; ctx.fillStyle = i % 3 ? RED : '#ffffff'; ctx.fillRect(Math.round(px), Math.round(py), 1, 2); }
    const lw = Math.round(W() * ease(k * 1.4));
    ctx.fillStyle = RED; ctx.fillRect(x - lw / 2, y - Math.round(22 * at.k), lw, 1);
    if (k > 0.75) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, y - Math.round(22 * at.k), W(), 1); }
  };
  // The knight huge and grey; under the visor an eye opens red and the red cracks run out of it.
  B.eye = function (ctx, s, c, k, T) {
    fill(ctx, INK);
    const h = hero(s), sc = 5.4 + 0.7 * ease(k), bx = A.box(h.set, 'Idle4', 0, 0, sc);
    const head = { x: 22 * sc, y: 6 * sc };
    const fx = Math.round(W() * 0.58 - bx.x - head.x), fy = Math.round(H() * 0.4 - bx.y - head.y);
    embers(ctx, T, 26, 0, W(), RED);
    const sway = Math.round(Math.sin(T * 2.2) * 2);
    A.actor(ctx, h.set, 'Idle4', Math.floor(T * 7) % 15, 0, fx + sway, fy, sc, { grey: true });
    const ex = fx + bx.x + head.x, ey = fy + bx.y + head.y;
    // The eye: a red slit, then its glow.
    const open = ease((k - 0.15) / 0.35);
    if (open > 0) {
      const g = ctx.createRadialGradient(ex, ey, 1, ex, ey, 30 * open); g.addColorStop(0, 'rgba(255,42,68,0.75)'); g.addColorStop(1, 'rgba(255,42,68,0)');
      ctx.fillStyle = g; ctx.fillRect(ex - 40, ey - 40, 80, 80);
      ctx.fillStyle = RED; ctx.fillRect(Math.round(ex - 7 * open), ey - 1, Math.round(14 * open), 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(ex - 2 * open), ey, Math.round(4 * open), 1);
      ctx.globalAlpha = Math.min(1, (k - 0.3) * 3);
      for (let i = 0; i < 6; i++) crack(ctx, ex + (i % 2 ? 6 : -6), ey + 2, Math.PI / 2 + (i - 2.5) * 0.35, 40 + 50 * ease((k - 0.3) / 0.5), 70 + i, RED, 1);
      ctx.globalAlpha = 1;
    }
    // A hard vertical cut down the frame, light on its edge.
    const cx = Math.round(W() * 0.3);
    ctx.fillStyle = INK; ctx.fillRect(cx - 3, 0, 6, H()); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 3, 0, 1, H());
    // The flash out.
    if (k > 0.88) fill(ctx, '#ffffff', (k - 0.88) / 0.12);
  };
  // Rain over a dark sea; a red beam; the blade falls; the art's name.
  B.title = function (ctx, s, c, k, T) {
    const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#0b1220'); g.addColorStop(0.7, '#283a52'); g.addColorStop(1, '#0a0e16');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    // The sea.
    ctx.fillStyle = '#070b12'; ctx.fillRect(0, H() * 0.78, W(), H() * 0.22);
    ctx.fillStyle = 'rgba(160,190,230,0.25)';
    for (let i = 0; i < 24; i++) ctx.fillRect(Math.round(hash(i, 8) * W() + Math.sin(T * 3 + i) * 4), Math.round(H() * 0.8 + hash(i, 9) * H() * 0.18), 6 + hash(i, 1) * 12, 1);
    // The beam.
    const bx = W() / 2, bw = 6 + 4 * Math.sin(T * 30);
    const bg = ctx.createLinearGradient(bx - 18, 0, bx + 18, 0); bg.addColorStop(0, 'rgba(255,42,68,0)'); bg.addColorStop(0.5, 'rgba(255,42,68,0.55)'); bg.addColorStop(1, 'rgba(255,42,68,0)');
    ctx.fillStyle = bg; ctx.fillRect(bx - 18, 0, 36, H() * 0.8);
    ctx.fillStyle = '#ffd0d6'; ctx.fillRect(Math.round(bx - bw / 4), 0, Math.max(1, Math.round(bw / 2)), Math.round(H() * 0.3 * (1 - k)));
    // The falling blade.
    const sy = -30 + (H() * 0.62 + 30) * Math.pow(Math.min(1, k * 1.05), 2.2);
    sword(ctx, bx, sy - 30, 34, Math.PI, true, 1.6);
    // Rain in front.
    ctx.fillStyle = 'rgba(190,210,240,0.55)';
    for (let i = 0; i < 90; i++) { const x = hash(i, 4) * W(), y = ((hash(i, 5) * H() + T * (420 + hash(i, 6) * 200)) % (H() + 20)) - 10; ctx.fillRect(Math.round(x - (y * 0.08)), Math.round(y), 1, 6); }
    title(ctx, 'LAST DITCH EFFORT', W() / 2, H() * 0.47, Math.min(30, Math.round(W() / 11)), k, T);
    if (k > 0.2) R.text(ctx, 'VESPER  ·  MOON ART', W() / 2, H() * 0.47 + 26, 7, '#e8c8d0', 'center');
  };
  // The blade stands in the ground under a vast pale moon; the ground rings out.
  B.plant = function (ctx, s, c, k, T) {
    fill(ctx, '#0b0d14');
    const cx = W() / 2, R0 = H() * 2.1, cy = -R0 + H() * 0.34;
    ctx.fillStyle = '#d6dae6'; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 7); ctx.fill();
    ctx.fillStyle = '#b8bccb'; for (let i = 0; i < 14; i++) { const a = Math.PI / 2 + (hash(i, 2) - 0.5) * 0.5, rr = R0 - 4 - hash(i, 3) * 26; ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 3 + hash(i, 4) * 8 | 0, 2); }
    const gy = Math.round(H() * 0.84);
    ctx.fillStyle = '#05060a'; ctx.fillRect(0, gy, W(), H() - gy);
    // Rings.
    for (let i = 0; i < 3; i++) {
      const kk = ease(k * 1.4 - i * 0.18); if (kk <= 0) continue;
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - kk)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, gy, 10 + kk * 160, 2 + kk * 18, 0, Math.PI, Math.PI * 2); ctx.stroke();
    }
    sword(ctx, cx, gy - 52, 30, Math.PI, true, 2);
    // A crosshair at the hilt.
    const hy = gy - 86; ctx.fillStyle = '#ffffff'; R.disc(ctx, cx, hy, 9, '#ffffff'); ctx.fillStyle = INK; ctx.fillRect(cx - 9, hy, 19, 1); ctx.fillRect(cx, hy - 9, 1, 19);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 14; i++) ctx.fillRect(Math.round(cx + (hash(i, 7) - 0.5) * 40), Math.round(gy - 4 - ((T * 60 + hash(i, 8) * 40) % 50)), 1, 2);
    if (k < 0.12) fill(ctx, '#ffffff', 1 - k / 0.12);
  };
  // The draw: the knight large and grey, the red cut thrown across the whole frame.
  B.draw = function (ctx, s, c, k, T) {
    fill(ctx, INK);
    hStreaks(ctx, 40, 'rgba(120,120,135,0.6)', 3, T, 1300);
    const h = hero(s), sc = 4.4, fr = Math.min(14, 6 + Math.floor(k * 9));
    const fx = Math.round(W() * 0.7 - ease(k * 1.6) * W() * 0.08), fy = Math.round(H() * 1.12);
    for (let i = 3; i >= 1; i--) A.actor(ctx, h.set, 'Special1', Math.max(0, fr - i), Math.PI, fx + i * 10, fy, sc, { shade: i === 1 ? '#5a1020' : '#2a0810', alpha: 0.5 - i * 0.12 });
    A.actor(ctx, h.set, 'Special1', fr, Math.PI, fx, fy, sc, { grey: true });
    if (k > 0.42) {
      const kk = ease((k - 0.42) / 0.3), y0 = H() * 0.48, x0 = fx - 40;
      // The red cut, with a purple fringe, a white core and blood-red pixels thrown off it.
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(-0.12);
      ctx.fillStyle = 'rgba(120,40,200,0.65)'; ctx.fillRect(-W() * 1.2 * kk, -6, W() * 1.2 * kk, 12);
      ctx.fillStyle = RED; ctx.fillRect(-W() * 1.2 * kk, -3, W() * 1.2 * kk, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-W() * 1.2 * kk, -1, W() * 1.2 * kk, 1);
      for (let i = 0; i < 70; i++) {
        const px = -hash(i, 1) * W() * 1.1 * kk, py = (hash(i, 2) - 0.5) * 40 * (0.3 + kk) + Math.sin(i + T * 6) * 3;
        ctx.fillStyle = i % 3 ? RED : '#9a4cff'; ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
      }
      ctx.restore();
      A.fx(ctx, 'slash_arc_blood', (k - 0.42) * 0.9, W() * 0.3, y0 - 6, 3.2, 0.9, 0, true);
    }
    if (k > 0.82) { line(ctx, 0, H() * 0.15, W(), H() * 0.75, 2, '#ffffff'); line(ctx, W() * 0.2, H(), W() * 0.85, 0, 1, '#ffffff'); }
    if (k > 0.94) fill(ctx, '#ffffff', (k - 0.94) / 0.06);
  };
  // Lys lends her flower: her figure on a white slant, then the red bloom.
  B.lys = function (ctx, s, c, k, T) {
    fill(ctx, INK);
    ctx.fillStyle = '#e8e8ee'; ctx.beginPath(); ctx.moveTo(0, H() * 0.18); ctx.lineTo(W() * 0.62, H() * 0.08); ctx.lineTo(W() * 0.5, H() * 0.92); ctx.lineTo(0, H()); ctx.closePath(); ctx.fill();
    const L = D.LYS, sc = 4.2, fx = Math.round(W() * 0.27 + (1 - ease(k * 3)) * -20), fy = Math.round(H() * 1.18);
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, H() * 0.18); ctx.lineTo(W() * 0.62, H() * 0.08); ctx.lineTo(W() * 0.5, H() * 0.92); ctx.lineTo(0, H()); ctx.closePath(); ctx.clip();
    A.actor(ctx, L.set, 'Attack5', Math.min(14, Math.floor(T * 22) % 15), 0, fx, fy, sc, { grey: true });
    for (let i = 0; i < 16; i++) { const tt = (T * 1.6 + hash(i, 9)) % 1, px = fx + 20 * sc * 0.3 + tt * W() * 0.5, py = fy - 30 * sc + Math.sin(tt * 6 + i) * 14 - tt * 20; ctx.fillStyle = i % 2 ? '#ffffff' : RED; ctx.fillRect(Math.round(px), Math.round(py), 2, 1); }
    const bx = A.box(L.set, 'Idle', 0, 0, sc);
    flower(ctx, fx + bx.x + 13 * sc, fy + bx.y + 4 * sc, 12, '#ffffff', T * 0.5);
    ctx.restore();
    R.text(ctx, 'LYS', W() * 0.06, H() * 0.86, 10, INK, 'left', { shadow: false });
    // The bloom.
    const kk = ease((k - 0.35) / 0.4);
    if (kk > 0) {
      const cx = W() * 0.72, cy = H() * 0.5;
      ctx.strokeStyle = RED; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx + 40, cy, 30 + i * 9 + kk * 10, -1.2, 1.2); ctx.stroke(); }
      flower(ctx, cx, cy, 8 + 30 * kk, RED, -0.3 + kk * 0.8);
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 3; i++) { const a = i * 2.1 + kk * 2; ctx.fillRect(Math.round(cx + Math.cos(a) * (44 * kk)), Math.round(cy + Math.sin(a) * (44 * kk)), 3, 1); }
    }
  };
  // Under the red moon: the foe a black shape, the hero a red one, cut after cut, the bar draining.
  B.moon = function (ctx, s, c, k, T, d) {
    const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#07060c'); g.addColorStop(1, '#141020');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    const mx = Math.round(W() * 0.6), my = Math.round(H() * 0.42), mr = Math.round(H() * 0.3);
    R.moon(ctx, mx, my, mr, '#ff3a52', 'rgba(255,40,70,0.4)');
    // The ground and the foes in silhouette.
    ctx.fillStyle = '#05040a'; ctx.fillRect(0, H() * 0.86, W(), H() * 0.14);
    const tg = target(s, c), others = c.targets.map((id) => s.units.find((u) => u.id === id)).filter((u) => u && u !== tg);
    others.slice(0, 4).forEach((o, i) => A.actor(ctx, o.set, 'TakeDamage', Math.floor(T * 14 + i * 3) % 15, Math.PI, Math.round(W() * (0.78 + i * 0.06) + Math.sin(T * 9 + i) * 2), Math.round(H() * 0.88), o.scale * 1.6, { shade: '#0c0912' }));
    const ts = 2,   // at most twice the sprite (2026-11-11: larger turned the pixels to blocks)
      tx = Math.round(W() * 0.38), ty = Math.round(H() * 0.9);
    const hitsDone = Math.max(0, Math.min(6, Math.floor((k - 0.3) / 0.7 * 6 + 0.4)));
    const knock = hitsDone * 4 + (hitsDone ? Math.max(0, 6 - ((k - 0.3) / 0.7 * 6 - hitsDone + 1) * 6) : 0);
    if (tg) A.actor(ctx, tg.set, hitsDone ? 'TakeDamage' : 'Idle4', hitsDone ? Math.min(14, Math.floor(((k - 0.3) / 0.7 * 6 % 1) * 10) + 2) : Math.floor(T * 8) % 15, 0, Math.round(tx - knock), ty, ts, { shade: '#000000' });
    const h = hero(s);
    if (k < 0.3) {
      // The leap across the moon.
      const kk = k / 0.3, px = -20 + (W() + 40) * kk, py = my + 30 - Math.sin(kk * Math.PI) * 70;
      for (let i = 4; i >= 1; i--) A.actor(ctx, h.set, 'Attack4', Math.min(14, 4 + i), 0, px - i * 14, py + i * 3, 1.8, { shade: RED, alpha: 0.18 * (5 - i) / 4 });
      A.actor(ctx, h.set, 'Attack4', Math.min(14, Math.floor(kk * 14)), 0, px, py, 1.8, { shade: k > 0.1 && k < 0.2 ? '#000000' : RED });
    } else {
      // Six cuts: the hero appears around the foe in turn, a white arc through it each time.
      const kk = (k - 0.3) / 0.7, i = Math.min(5, Math.floor(kk * 6)), sub = kk * 6 - i;
      const spot = (j) => ({ x: tx + (j % 2 ? 1 : -1) * (40 + hash(j, 1) * 50), y: ty - 10 - hash(j, 2) * 80, f: j % 2 ? Math.PI : 0 });
      const p = spot(i), q = i > 0 ? spot(i - 1) : { x: -20, y: ty - 60, f: 0 };
      for (let j = 1; j <= 4; j++) { const a = Math.max(0, sub * 3 - j * 0.3); if (a <= 0) continue; const ix = q.x + (p.x - q.x) * Math.min(1, j / 4), iy = q.y + (p.y - q.y) * Math.min(1, j / 4); A.actor(ctx, h.set, 'Rolling', 6, p.f, ix, iy, 1.7, { shade: RED, alpha: 0.25 }); }
      const clips = ['Attack1', 'Attack2', 'Attack5', 'Attack6', 'Attack4', 'Special1'];   // no Attack3: it reads as a bow or a cast
      A.actor(ctx, h.set, clips[i], Math.min(14, 5 + Math.floor(sub * 9)), p.f, p.x, p.y, 1.7, { shade: RED });
      // The arcs so far, fading; the newest bright.
      for (let j = 0; j <= i; j++) {
        const age = (i - j) + sub, a = Math.max(0, 1 - age / 2.2); if (a <= 0) continue;
        const an = -0.9 + hash(j, 5) * 1.8, cxx = tx, cyy = ty - 30 * ts * 0.5, L = 90 + hash(j, 6) * 50;
        ctx.globalAlpha = a; line(ctx, cxx - Math.cos(an) * L, cyy - Math.sin(an) * L, cxx + Math.cos(an) * L, cyy + Math.sin(an) * L, j === i && sub < 0.4 ? 3 : 1, '#ffffff');
        ctx.globalAlpha = a * 0.6; line(ctx, cxx - Math.cos(an) * L * 0.8, cyy - Math.sin(an) * L * 0.8 + 2, cxx + Math.cos(an) * L * 0.8, cyy + Math.sin(an) * L * 0.8 + 2, 1, RED);
        ctx.globalAlpha = 1;
      }
      if (sub < 0.12) { fill(ctx, '#ffffff', 0.25); R.shake = Math.max(R.shake, 4); }
    }
    // The foe's bar at the top, draining with each cut.
    if (tg) {
      const total = Math.min(tg.hp, VS.artDamage(s, c.kind, tg)), h0 = tg.hp / tg.maxHp, h1 = Math.max(0, (tg.hp - total) / tg.maxHp);
      const frac = h0 - (h0 - h1) * hitsDone / 6;
      const bw = 170, bx = Math.round(W() / 2 - bw / 2 + 50), by = 23;
      R.text(ctx, tg.def.name.toUpperCase(), bx, by - 3, 6, '#e8d8dc');
      ctx.fillStyle = '#000000'; ctx.fillRect(bx, by, bw, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, bw, 1);
      ctx.fillStyle = RED; ctx.fillRect(bx, by + 1, Math.round(bw * frac), 2);
      if (frac < h0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + Math.round(bw * frac), by + 1, Math.max(1, Math.round(bw * (h0 - frac))), 2); }
    }
  };
  // All red; the foe black; one white cut through everything.
  B.red = function (ctx, s, c, k) {
    fill(ctx, RED);
    const tg = target(s, c), ts = 2;
    if (tg) A.actor(ctx, tg.set, 'Die', Math.min(14, Math.floor(k * 16)), 0, Math.round(W() * 0.4 - k * 10), Math.round(H() * 0.95), ts, { shade: '#000000' });
    const h = hero(s);
    A.actor(ctx, h.set, k < 0.5 ? 'Special1' : 'Idle4', k < 0.5 ? 14 : Math.floor(k * 10) % 15, Math.PI, Math.round(W() * 0.86), Math.round(H() * 0.95), 2, { shade: '#000000' });
    const kk = ease(k * 2.5);
    line(ctx, W() * 1.05, H() * 0.02, W() * 1.05 - W() * 1.2 * kk, H() * 0.02 + H() * 1.0 * kk, 2, '#ffffff');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(hash(i, 3) * W()), Math.round(hash(i, 4) * H()), 2, 2);
    if (k > 0.75) fill(ctx, '#ffffff', (k - 0.75) / 0.25 * 0.6);
  };

  // ---- the other heroes' ultimates -------------------------------------------------------------
  const ART_COL = { petals: '#ff7aa0', storm: '#ffd060', cuts: '#c9a0ff' };
  const others = (s, c) => c.targets.map((id) => s.units.find((u) => u.id === id)).filter(Boolean);
  function silhouettes(ctx, s, c, k, T, col, react) {
    const tg = others(s, c);
    tg.slice(0, 5).forEach((o, i) => { const main = i === 0, sc = main ? Math.min(3.2, 2.2 * o.scale) : 1.5 * o.scale, x = main ? W() * 0.5 : W() * (0.15 + i * 0.2), y = H() * (main ? 0.94 : 0.9); A.actor(ctx, o.set, react ? 'TakeDamage' : 'Idle4', react ? Math.floor(T * 16 + i * 3) % 15 : Math.floor(T * 8) % 15, Math.PI, Math.round(x + (react ? Math.sin(T * 40 + i) * 2 : 0)), Math.round(y), sc, { shade: col }); });
  }
  // A grey close-up of the hero casting (Lys), with a flower sigil blooming.
  B.bloom = function (ctx, s, c, k, T) {
    fill(ctx, '#0a0408'); embers(ctx, T, 30, 0, W(), '#ff7aa0');
    const h = hero(s), sc = 4.2;
    A.actor(ctx, h.set, 'Attack5', Math.floor(T * 18) % 15, 0, Math.round(W() * 0.3), Math.round(H() * 1.12), sc, { grey: true });
    const kk = ease(k * 1.3), cx = W() * 0.68, cy = H() * 0.46;
    ctx.strokeStyle = 'rgba(255,122,160,0.8)'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, 20 + i * 14 + kk * 10, T * (i % 2 ? 1 : -1), T * (i % 2 ? 1 : -1) + 5); ctx.stroke(); }
    flower(ctx, cx, cy, 8 + 34 * kk, '#ff7aa0', T * 0.8); flower(ctx, cx, cy, 4 + 16 * kk, '#ffffff', -T);
    if (k > 0.9) fill(ctx, '#ffffff', (k - 0.9) / 0.1);
  };
  // A storm of petals tearing through the foes.
  B.petalstorm = function (ctx, s, c, k, T) {
    const g = ctx.createLinearGradient(0, 0, W(), H()); g.addColorStop(0, '#1a0610'); g.addColorStop(1, '#3a0a1c'); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    silhouettes(ctx, s, c, k, T, '#05020a', true);
    for (let i = 0; i < 220; i++) {
      const sp = 0.6 + hash(i, 1) * 1.4, ph = (hash(i, 2) + T * sp * 0.9) % 1, x = -40 + ph * (W() + 80), y = hash(i, 3) * H() + Math.sin(T * 4 + i) * 8 - ph * 30, sz = 1 + (i % 3);
      ctx.fillStyle = i % 5 ? (i % 2 ? '#ff7aa0' : '#ffb8d0') : '#ffffff'; ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(T * 6 + i); ctx.fillRect(-sz, -sz / 2, sz * 2, sz); ctx.restore();
    }
    for (let j = 0; j < 4; j++) { const kk = (k * 4 - j); if (kk < 0 || kk > 1) continue; const yy = H() * (0.3 + j * 0.15); ctx.globalAlpha = 1 - kk; line(ctx, 0, yy + 20, W(), yy - 20, 2, '#ffffff'); ctx.globalAlpha = 1; if (kk < 0.15) R.shake = 3; }
  };
  // The spear raised in a thunderstorm (Kestrel).
  B.charge = function (ctx, s, c, k, T) {
    fill(ctx, '#05060c'); const h = hero(s);
    if (Math.floor(T * 14) % 5 === 0) fill(ctx, 'rgba(255,240,180,0.25)');
    A.actor(ctx, h.set, 'Special1', Math.min(9, Math.floor(k * 10)), 0, Math.round(W() * 0.5), Math.round(H() * 1.1), 4.0, { grey: true });
    for (let i = 0; i < 5; i++) { const sx = W() * 0.5 + (hash(i, Math.floor(T * 12)) - 0.5) * 60, sy = H() * 0.2; ctx.strokeStyle = i % 2 ? '#ffffff' : '#ffd060'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, 0); let x = sx, y = 0; while (y < sy + 40) { x += (hash(i, y | 0) - 0.5) * 14; y += 8; ctx.lineTo(x, y); } ctx.stroke(); }
    embers(ctx, T, 26, 0, W(), '#ffd060');
  };
  // One colossal bolt from the sky onto the foe, an impact frame.
  B.spear = function (ctx, s, c, k, T) {
    const white = k > 0.25 && k < 0.36, dark = k >= 0.36 && k < 0.45;
    fill(ctx, white ? '#ffffff' : dark ? '#000000' : '#0a0a14');
    silhouettes(ctx, s, c, k, T, white ? '#000000' : dark ? '#ffffff' : '#000000', k > 0.3);
    if (k > 0.2 && !white && !dark) {
      const cx = W() * 0.5, w = 6 + 10 * Math.max(0, 1 - (k - 0.45) * 2);
      for (const [col, ww] of [['rgba(255,208,96,0.45)', w * 3], ['#ffffff', w]]) { ctx.strokeStyle = col; ctx.lineWidth = ww; ctx.beginPath(); ctx.moveTo(cx, 0); let x = cx; for (let y = 0; y <= H() * 0.9; y += 10) { x = cx + (hash(Math.floor(T * 20), y) - 0.5) * 18; ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,240,180,0.35)'; ctx.beginPath(); ctx.ellipse(cx, H() * 0.9, 80, 14, 0, 0, 7); ctx.fill();
    }
    if (white || dark) { ctx.strokeStyle = white ? '#000' : '#ffd060'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 50; i++) { const a = hash(i, 9) * 6.28, r0 = 30 + hash(i, 8) * 30; ctx.moveTo(W() / 2 + Math.cos(a) * r0, H() * 0.6 + Math.sin(a) * r0); ctx.lineTo(W() / 2 + Math.cos(a) * (r0 + 200), H() * 0.6 + Math.sin(a) * (r0 + 200)); } ctx.stroke(); R.shake = 7; }
  };
  B.thunderrain = function (ctx, s, c, k, T) {
    fill(ctx, '#07070f'); silhouettes(ctx, s, c, k, T, '#000000', true);
    for (let i = 0; i < 9; i++) { const ph = (T * 3 + hash(i, 4)) % 1; if (ph > 0.3) continue; const x = hash(i, Math.floor(T * 3 + hash(i, 4))) * W(); ctx.strokeStyle = ph < 0.1 ? '#ffffff' : '#ffd060'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 0); let xx = x; for (let y = 0; y < H() * 0.92; y += 9) { xx += (hash(i * 7, y) - 0.5) * 12; ctx.lineTo(xx, y); } ctx.stroke(); if (ph < 0.08) fill(ctx, 'rgba(255,240,200,0.25)'); }
  };
  // Wisp vanishes into smoke, then a hundred cuts land from every side.
  B.vanish = function (ctx, s, c, k, T) {
    fill(ctx, '#08060c'); const h = hero(s);
    A.actor(ctx, h.set, 'Idle4', Math.floor(T * 8) % 15, 0, Math.round(W() * 0.5), Math.round(H() * 1.05), 3.8, { grey: true, alpha: 1 - ease(k * 1.2) });
    for (let i = 0; i < 60; i++) { const a = hash(i, 2) * 6.28, r = ease(k) * (20 + hash(i, 3) * 90); ctx.fillStyle = `rgba(${i % 3 ? '60,40,80' : '201,160,255'},${0.8 - k * 0.6})`; const sz = 3 + hash(i, 4) * 6; ctx.fillRect(Math.round(W() * 0.5 + Math.cos(a) * r), Math.round(H() * 0.6 + Math.sin(a) * r * 0.6), sz, sz); }
  };
  B.hundred = function (ctx, s, c, k, T) {
    fill(ctx, '#050307'); silhouettes(ctx, s, c, k, T, '#e8e0f0', true);
    const n = Math.floor(k * 60), h = hero(s);
    for (let i = 0; i < n; i++) { const age = (k * 60 - i) / 60, a = hash(i, 5) * Math.PI, cx = W() * (0.3 + hash(i, 6) * 0.4), cy = H() * (0.45 + hash(i, 7) * 0.4), L = 60 + hash(i, 8) * 80; if (age > 0.25) continue; ctx.globalAlpha = 1 - age / 0.25; line(ctx, cx - Math.cos(a) * L, cy - Math.sin(a) * L, cx + Math.cos(a) * L, cy + Math.sin(a) * L, age < 0.03 ? 2 : 1, i % 4 ? '#ffffff' : '#c9a0ff'); }
    ctx.globalAlpha = 1;
    const j = Math.floor(T * 14); A.actor(ctx, h.set, ['Attack1', 'Attack2', 'Attack6', 'Kick'][j % 4], 8, j % 2 ? 0 : Math.PI, Math.round(W() * (0.2 + hash(j, 1) * 0.6)), Math.round(H() * (0.5 + hash(j, 2) * 0.35)), 1.6, { shade: '#c9a0ff' });
    if (Math.floor(T * 14) % 4 === 0) R.shake = 2;
  };
  // The last frame: the art's colour, the foes falling in black, its name.
  B.finale = function (ctx, s, c, k, T) {
    const col = ART_COL[c.kind] || RED; fill(ctx, col);
    const tg = others(s, c)[0], h = hero(s);
    if (tg) A.actor(ctx, tg.set, 'Die', Math.min(14, Math.floor(k * 16)), 0, Math.round(W() * 0.4), Math.round(H() * 0.95), 2, { shade: '#000000' });
    A.actor(ctx, h.set, 'Idle4', Math.floor(T * 8) % 15, Math.PI, Math.round(W() * 0.84), Math.round(H() * 0.95), 2, { shade: '#000000' });
    line(ctx, W() * 1.05, H() * 0.05, W() * 1.05 - W() * 1.2 * ease(k * 2.5), H() * 0.05 + H() * ease(k * 2.5), 2, '#ffffff');
    title(ctx, VS.ART[c.kind].name, W() / 2, H() * 0.22, Math.min(20, Math.round(W() / (VS.ART[c.kind].name.length * 0.62 + 2))), k, T);
    if (k > 0.8) fill(ctx, '#ffffff', (k - 0.8) / 0.2 * 0.6);
  };
  C.kit = { title, sword, flower, crack, speedLines, hStreaks, line, fill, ease, embers, hash };
  C.draw = function (ctx, s) {
    const c = s.cine; if (!c) return;
    const b = C.beatAt(c), d = b[2] - b[1], T = c.t - b[1], k = Math.max(0, Math.min(1, T / d));
    B[b[0]](ctx, s, c, k, T, d);
    // Letterbox and the skip hint.
    if (b[0] !== 'snap') { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W(), 12); ctx.fillRect(0, H() - 12, W(), 12); }
    if (c.t > 0.6 && b[0] !== 'red' && !VS.R.noSkipHint) R.text(ctx, 'tap to skip', 6, H() - 3, 6, 'rgba(230,220,224,0.55)', 'left', { shadow: false });
  };

})();
