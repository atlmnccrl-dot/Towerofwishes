// VESPER — the moon arts as cinematics, drawn over the frozen fight on the pixel buffer.
//   Last Ditch Effort (6.4 s): snap to black · the visor and the red eye · the title over the
//   falling blade · the blade planted under a pale moon · the draw · Lys's flower · the red moon
//   assault in silhouette · the red frame.  Red Moon (3.4 s): snap · draw · red moon · red frame.
// Also the boss name card and the floating lines used in fights.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R;
  const C = VS.cine = {};
  const W = () => R.W, H = () => R.H;
  const RED = '#ff2a44', INK = '#050507';

  C.BEATS = {
    ldx: [['snap', 0, 0.3], ['eye', 0.3, 1.3], ['title', 1.3, 2.3], ['plant', 2.3, 2.8], ['draw', 2.8, 3.8], ['lys', 3.8, 4.3], ['moon', 4.3, 5.95], ['red', 5.95, 6.4]],
    moon: [['snap', 0, 0.25], ['draw', 0.25, 1.15], ['moon', 1.15, 2.95], ['red', 2.95, 3.4]],
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
      ({ snap: () => out.push(['charge', 0.9]), eye: () => out.push(['quake', 0.6]), title: () => { out.push(['allout', 1]); out.push(['clang_1', 0.7]); },
        plant: () => { out.push(['blow_big', 1]); out.push(['quake', 0.8]); }, draw: () => { out.push(['whoosh', 1]); }, lys: () => out.push(['magic', 0.8]),
        moon: () => out.push(['swish_0', 0.8]), red: () => { out.push(['blow_big', 1]); out.push(['ko', 0.8]); } })[b[0]]();
    }
    const m = C.BEATS[c.kind].find((b) => b[0] === 'moon');
    for (let i = 0; i < 6; i++) { const ht = m[1] + (m[2] - m[1]) * (0.3 + 0.7 * (i + 0.6) / 6); if (at(ht)) out.push([i % 2 ? 'slash_1' : 'slash_2', 0.8]); }
    const d = C.BEATS[c.kind].find((b) => b[0] === 'draw'); if (at(d[1] + (d[2] - d[1]) * 0.45)) out.push(['slash_0', 1]);
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
    const pad = 4; ctx.font = R.font(size); const w = Math.ceil(ctx.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.4);
    const c = title.c || (title.c = document.createElement('canvas')); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.font = R.font(size); g.textBaseline = 'middle'; g.textAlign = 'left';
    g.fillStyle = '#3a000a'; g.fillText(text, pad + 2, h / 2 + 2);
    g.fillStyle = RED; g.fillText(text, pad, h / 2);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, h / 2 - size * 0.42, w, 1);
    const punch = k < 0.12 ? 1 + (0.12 - k) * 3 : 1, sh = k < 0.5 ? (Math.random() - 0.5) * 3 : 0;
    const dw = Math.round(w * punch), dh = Math.round(h * punch), dx = Math.round(x - dw / 2 + sh), dy = Math.round(y - dh / 2);
    for (let row = 0; row < dh; row += 3) {
      const off = (k < 0.25 || (t * 10 | 0) % 7 === 0) && hash(row, (t * 20) | 0) < 0.25 ? Math.round((hash(row, 3) - 0.5) * 14) : 0;
      ctx.drawImage(c, 0, row / punch, w, 3 / punch, dx + off, dy + row, dw, 3);
    }
  }

  // The figures in the shot.
  const hero = (s) => s.hero;
  const target = (s, c) => s.units.find((u) => u.id === c.main) || s.units.find((u) => u.team === 'foe');

  // ---- the beats -----------------------------------------------------------------------------------
  const B = {};
  // The world drops to black; the hero stays lit, a red line cuts across.
  B.snap = function (ctx, s, c, k) {
    fill(ctx, INK, Math.min(0.92, k * 1.6));
    const h = hero(s), x = Math.round(h.x - R.cam), y = R.FLOOR + Math.round(h.y);
    A.actor(ctx, h.set, 'Idle4', 0, h.face > 0 ? 0 : Math.PI, x, y, 1, { shade: RED, alpha: 0.4 + 0.6 * k });
    A.actor(ctx, h.set, 'Idle4', 0, h.face > 0 ? 0 : Math.PI, x, y, 1, { alpha: 1 - k });
    const lw = Math.round(W() * ease(k * 1.4));
    ctx.fillStyle = RED; ctx.fillRect(x - lw / 2, y - 22, lw, 1);
    if (k > 0.75) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, y - 22, W(), 1); }
  };
  // The knight huge and grey; under the visor an eye opens red and the red cracks run out of it.
  B.eye = function (ctx, s, c, k, T) {
    fill(ctx, INK);
    const h = hero(s), sc = 5.4 + 0.7 * ease(k), bx = A.box(h.set, 'Idle4', 0, 0, sc);
    const head = { x: 22 * sc, y: 6 * sc };
    const fx = Math.round(W() * 0.58 - bx.x - head.x), fy = Math.round(H() * 0.4 - bx.y - head.y);
    A.actor(ctx, h.set, 'Idle4', 0, 0, fx, fy, sc, { grey: true });
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
    title(ctx, 'LAST DITCH EFFORT', W() / 2, H() * 0.47, 30, k, T);
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
    const fx = Math.round(W() * 0.66 + (1 - ease(k * 2)) * 30), fy = Math.round(H() * 1.12);
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
    A.actor(ctx, L.set, 'Idle', 0, 0, fx, fy, sc, { grey: true });
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
    const mx = Math.round(W() * 0.6), my = Math.round(H() * 0.4), mr = 62;
    R.moon(ctx, mx, my, mr, '#ff3a52', 'rgba(255,40,70,0.4)');
    // The ground and the foes in silhouette.
    ctx.fillStyle = '#05040a'; ctx.fillRect(0, H() * 0.86, W(), H() * 0.14);
    const tg = target(s, c), others = c.targets.map((id) => s.units.find((u) => u.id === id)).filter((u) => u && u !== tg);
    others.slice(0, 4).forEach((o, i) => A.actor(ctx, o.set, 'TakeDamage', 3, Math.PI, Math.round(W() * (0.78 + i * 0.06)), Math.round(H() * 0.88), o.scale * 1.6, { shade: '#0c0912' }));
    const ts = tg ? Math.min(3.6, 2.3 * tg.scale) : 2.3, tx = Math.round(W() * 0.38), ty = Math.round(H() * 0.9);
    const hitsDone = Math.max(0, Math.min(6, Math.floor((k - 0.3) / 0.7 * 6 + 0.4)));
    if (tg) A.actor(ctx, tg.set, hitsDone ? 'TakeDamage' : 'Idle4', hitsDone ? Math.min(14, 3 + hitsDone) : 0, 0, tx + (hitsDone % 2) * 2, ty, ts, { shade: '#000000' });
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
      const clips = ['Attack1', 'Attack2', 'Attack3', 'Attack6', 'Attack4', 'Special1'];
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
      const bw = 170, bx = Math.round(W() / 2 - bw / 2 + 50), by = 18;
      R.text(ctx, tg.def.name.toUpperCase(), bx, by - 3, 6, '#e8d8dc');
      ctx.fillStyle = '#000000'; ctx.fillRect(bx, by, bw, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, bw, 1);
      ctx.fillStyle = RED; ctx.fillRect(bx, by + 1, Math.round(bw * frac), 2);
      if (frac < h0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + Math.round(bw * frac), by + 1, Math.max(1, Math.round(bw * (h0 - frac))), 2); }
    }
  };
  // All red; the foe black; one white cut through everything.
  B.red = function (ctx, s, c, k) {
    fill(ctx, RED);
    const tg = target(s, c), ts = tg ? Math.min(3.8, 2.6 * tg.scale) : 2.6;
    if (tg) A.actor(ctx, tg.set, 'TakeDamage', 8, 0, Math.round(W() * 0.4), Math.round(H() * 0.95), ts, { shade: '#000000' });
    const h = hero(s);
    A.actor(ctx, h.set, 'Special1', 14, Math.PI, Math.round(W() * 0.86), Math.round(H() * 0.95), 1.9, { shade: '#000000' });
    const kk = ease(k * 2.5);
    line(ctx, W() * 1.05, H() * 0.02, W() * 1.05 - W() * 1.2 * kk, H() * 0.02 + H() * 1.0 * kk, 2, '#ffffff');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(hash(i, 3) * W()), Math.round(hash(i, 4) * H()), 2, 2);
    if (k > 0.75) fill(ctx, '#ffffff', (k - 0.75) / 0.25 * 0.6);
  };

  C.draw = function (ctx, s) {
    const c = s.cine; if (!c) return;
    const b = C.beatAt(c), d = b[2] - b[1], T = c.t - b[1], k = Math.max(0, Math.min(1, T / d));
    B[b[0]](ctx, s, c, k, T, d);
    // Letterbox and the skip hint.
    if (b[0] !== 'snap') { ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W(), 12); ctx.fillRect(0, H() - 12, W(), 12); }
    if (c.t > 0.6 && b[0] !== 'red') R.text(ctx, 'tap to skip', 6, H() - 3, 6, 'rgba(230,220,224,0.55)', 'left', { shadow: false });
  };

  // ---- a boss's name card ---------------------------------------------------------------------------
  C.bossCard = function (ctx, s, keys, t) {
    const k = Math.min(1, t / 0.25), out = t > 1.5 ? Math.min(1, (t - 1.5) / 0.35) : 0;
    ctx.save(); ctx.globalAlpha = 1 - out;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W(), H());
    const y = H() * 0.36, off = (1 - ease(k)) * W();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(-10 + off, y); ctx.lineTo(W() + 10 + off, y - 14); ctx.lineTo(W() + 10 + off, y + 44); ctx.lineTo(-10 + off, y + 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = RED; ctx.fillRect(0, Math.round(y + 50), W(), 1);
    keys.forEach((key, i) => {
      const f = D.FOES[key], u = s.units.find((o) => o.key === key);
      const sc = Math.min(3, 2.2 / (f.scale || 1) * (f.scale || 1)), x = W() * (keys.length > 1 ? 0.64 + i * 0.2 : 0.78) - off * 0.4;
      A.actor(ctx, f.set, 'Idle4', u ? u.frame : 0, Math.PI, Math.round(x), Math.round(y + 56), Math.min(3.2, 2.2 * (f.scale || 1) * 0.8), { grey: true });
    });
    const f = D.FOES[keys[0]];
    R.text(ctx, (keys.length > 1 ? 'THE HOLLOW TWINS' : f.name.toUpperCase()), 20 + off, y + 26, 18, '#ffffff', 'left');
    R.text(ctx, (keys.length > 1 ? 'THE LEFT HAND AND THE RIGHT' : f.title.toUpperCase()), 22 + off, y + 40, 7, '#ff8090', 'left');
    ctx.restore();
  };

  // ---- floating lines (no speech bubbles): beside the speaker, a thin bar in their colour ------
  C.say = function (ctx, x, y, who, col, text, k, o) {
    o = o || {};
    const size = o.shout ? 10 : 8, lines = R.wrap(ctx, text, size, 150), lh = size + 2;
    const left = x > R.W * 0.6, tx = left ? x - 14 : x + 14, top = y - lines.length * lh;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 4);
    const sh = o.shout && k < 0.5 ? (Math.random() - 0.5) * 2 : 0;
    ctx.fillStyle = col; ctx.fillRect(Math.round(left ? tx + 4 : tx - 6), Math.round(top - 9), 2, lines.length * lh + 10);
    ctx.fillStyle = col; ctx.fillRect(Math.round(left ? tx + 4 : x + 2), Math.round(y - 2), Math.abs(tx - x) - 4, 1);
    R.text(ctx, who.toUpperCase(), tx, top - 2, 6, col, left ? 'right' : 'left');
    lines.forEach((l, i) => R.text(ctx, l, tx + sh, top + 7 + i * lh, size, o.shout ? '#fff0f2' : '#f2eef0', left ? 'right' : 'left'));
    ctx.restore();
  };
})();
