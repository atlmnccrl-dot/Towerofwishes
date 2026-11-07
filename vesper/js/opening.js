// VESPER — the opening, as an anime sequence in the style of the moon arts: drawn on the 180 px
// pixel buffer with hard cuts, close-ups, speed lines and impact frames. Twelve beats, about 23 s:
// the moon falls · the swordsman's eye · his leap · the first cut · impact · the wound · the dead
// rise · tonight it bleeds out · your hero's eye · the draw · up the Spire past the guardians · title.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, P = VS.PX;
  const O = VS.OPEN = {};
  const RED = '#ff2a44', INK = '#050507', PALE = '#e6e0e6';
  const BEATS = [['black', 0, 1.4], ['fall', 1.4, 4.0], ['eye', 4.0, 5.2], ['leap', 5.2, 6.6], ['cut', 6.6, 8.0], ['impact', 8.0, 8.7], ['wound', 8.7, 11.3],
    ['rise', 11.3, 13.9], ['bleed', 13.9, 16.4], ['hero', 16.4, 17.8], ['draw', 17.8, 19.4], ['spire', 19.4, 23.2]];
  O.BEATS = BEATS; O.dur = BEATS[BEATS.length - 1][2];
  O.next = (t) => { const b = BEATS.find((x) => x[1] > t + 0.01); return b ? b[1] : O.dur; };
  O.cues = function (t0, t1) {
    const out = [], at = (t) => t0 < t && t <= t1;
    const C = { black: [['charge', 0.6]], fall: [['quake', 0.9], ['whoosh', 0.7]], eye: [['clang_1', 0.6]], leap: [['whoosh', 1]], cut: [['slash_0', 1], ['allout', 0.8]], impact: [['blow_big', 1], ['quake', 1]],
      wound: [['charge', 0.7]], rise: [['quake', 0.7], ['horn', 0.5]], bleed: [['clang_1', 0.8]], hero: [['quake', 0.6]], draw: [['whoosh', 1], ['slash_2', 1]], spire: [['allout', 0.7]] };
    for (const b of BEATS) if (at(b[1])) out.push(...(C[b[0]] || []));
    if (at(23.2 - 1.4)) out.push(['blow_big', 0.9], ['clang_1', 0.8]);
    return out;
  };
  const K = () => VS.cine.kit;
  const W = () => P.W, H = () => P.H;
  const hash = (a, b) => K().hash(a, b), ease = (k) => K().ease(k);
  const fill = (ctx, col, a) => K().fill(ctx, col, a);
  const sub = (ctx, text, k, y) => { if (k <= 0) return; ctx.save(); ctx.globalAlpha = Math.min(1, k * 3); P.text(ctx, text, W() / 2, y || H() * 0.86, 8, '#f0e4e8', 'center'); ctx.restore(); };
  function shake(ctx, n) { ctx.translate(Math.round((Math.random() - 0.5) * n), Math.round((Math.random() - 0.5) * n)); }
  // A huge grey close-up whose eye opens (white for the swordsman, red for the hero), cracks running out.
  function eyeShot(ctx, set, k, T, col) {
    fill(ctx, INK);
    const sc = 5.4 + 0.7 * ease(k), bx = A.box(set, 'Idle4', 0, 0, sc) || { x: -32 * sc, y: -60 * sc };
    const head = { x: 22 * sc, y: 6 * sc }, fx = Math.round(W() * 0.58 - bx.x - head.x), fy = Math.round(H() * 0.4 - bx.y - head.y);
    K().embers(ctx, T, 26, 0, W(), col);
    A.actor(ctx, set, 'Idle4', Math.floor(T * 7) % 15, 0, fx + Math.round(Math.sin(T * 2.2) * 2), fy, sc, { grey: true });
    const ex = fx + bx.x + head.x, ey = fy + bx.y + head.y, open = ease((k - 0.15) / 0.35);
    if (open > 0) {
      const g = ctx.createRadialGradient(ex, ey, 1, ex, ey, 30 * open); g.addColorStop(0, col === RED ? 'rgba(255,42,68,0.75)' : 'rgba(200,230,255,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(ex - 40, ey - 40, 80, 80);
      ctx.fillStyle = col; ctx.fillRect(Math.round(ex - 7 * open), ey - 1, Math.round(14 * open), 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(ex - 2 * open), ey, Math.round(4 * open), 1);
      ctx.globalAlpha = Math.min(1, (k - 0.3) * 3);
      for (let i = 0; i < 6; i++) K().crack(ctx, ex + (i % 2 ? 6 : -6), ey + 2, Math.PI / 2 + (i - 2.5) * 0.35, 40 + 50 * ease((k - 0.3) / 0.5), 70 + i, col, 1);
      ctx.globalAlpha = 1;
    }
    const cx = Math.round(W() * 0.3); ctx.fillStyle = INK; ctx.fillRect(cx - 3, 0, 6, H()); ctx.fillStyle = '#ffffff'; ctx.fillRect(cx + 3, 0, 1, H());
    if (k > 0.88) fill(ctx, '#ffffff', (k - 0.88) / 0.12);
  }
  // The draw: the figure huge and grey, the cut thrown across the whole frame.
  function drawShot(ctx, set, k, T, col, fringe) {
    fill(ctx, INK); K().hStreaks(ctx, 40, 'rgba(120,120,135,0.6)', 3, T, 1300);
    const sc = 4.4, fr = Math.min(14, 6 + Math.floor(k * 9)), fx = Math.round(W() * 0.7 - ease(k * 1.6) * W() * 0.08), fy = Math.round(H() * 1.12);
    for (let i = 3; i >= 1; i--) A.actor(ctx, set, 'Special1', Math.max(0, fr - i), Math.PI, fx + i * 10, fy, sc, { shade: col === RED ? '#5a1020' : '#203050', alpha: 0.5 - i * 0.12 });
    A.actor(ctx, set, 'Special1', fr, Math.PI, fx, fy, sc, { grey: true });
    if (k > 0.42) {
      const kk = ease((k - 0.42) / 0.3), y0 = H() * 0.48, x0 = fx - 40;
      ctx.save(); ctx.translate(x0, y0); ctx.rotate(-0.12);
      ctx.fillStyle = fringe; ctx.fillRect(-W() * 1.2 * kk, -6, W() * 1.2 * kk, 12);
      ctx.fillStyle = col; ctx.fillRect(-W() * 1.2 * kk, -3, W() * 1.2 * kk, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-W() * 1.2 * kk, -1, W() * 1.2 * kk, 1);
      for (let i = 0; i < 60; i++) { const px = -hash(i, 1) * W() * 1.1 * kk, py = (hash(i, 2) - 0.5) * 40 * (0.3 + kk) + Math.sin(i + T * 6) * 3; ctx.fillStyle = i % 3 ? col : '#ffffff'; ctx.fillRect(Math.round(px), Math.round(py), 2, 2); }
      ctx.restore();
    }
    if (k > 0.82) { K().line(ctx, 0, H() * 0.15, W(), H() * 0.75, 2, '#ffffff'); K().line(ctx, W() * 0.2, H(), W() * 0.85, 0, 1, '#ffffff'); }
  }
  function moonDisc(ctx, x, y, r, col, gash) {
    P.moon(ctx, x, y, r, col, col === PALE ? 'rgba(220,220,240,0.3)' : 'rgba(255,40,60,0.4)');
    if (gash) { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.36); ctx.fillStyle = '#3a0008'; ctx.fillRect(-r * 0.95, -2, r * 1.9 * gash, 4); ctx.fillStyle = RED; ctx.fillRect(-r * 0.95, -1, r * 1.9 * gash, 1); ctx.restore(); }
  }
  function spireShape(ctx, cx, base, top, wB) { ctx.beginPath(); ctx.moveTo(cx - wB, base); ctx.lineTo(cx - wB * 0.18, top + 8); ctx.lineTo(cx, top); ctx.lineTo(cx + wB * 0.18, top + 8); ctx.lineTo(cx + wB, base); ctx.closePath(); ctx.fill(); }

  const S = {};
  S.black = function (ctx, k) {
    fill(ctx, INK);
    const lw = Math.round(W() * ease(k * 1.3)); ctx.fillStyle = RED; ctx.fillRect(Math.round(W() / 2 - lw / 2), Math.round(H() / 2), lw, 1);
    if (k > 0.3) { ctx.save(); ctx.globalAlpha = Math.min(1, (k - 0.3) * 3); P.text(ctx, 'SEVEN HUNDRED YEARS AGO', W() / 2, H() / 2 - 8, 8, '#e8c8d0', 'center'); ctx.restore(); }
  };
  S.fall = function (ctx, k, T) {
    const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#05040a'); g.addColorStop(0.7, '#2a0a14'); g.addColorStop(1, '#5a1420'); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    ctx.save(); if (k > 0.5) shake(ctx, 3 * k);
    // Streaks rushing up past the camera: the moon is coming down.
    ctx.fillStyle = 'rgba(255,220,220,0.5)'; for (let i = 0; i < 50; i++) { const x = hash(i, 3) * W(), len = 8 + hash(i, 4) * 26, y = H() - ((T * (300 + hash(i, 5) * 300) + hash(i, 6) * H()) % (H() + len)); ctx.fillRect(Math.round(x), Math.round(y), 1, Math.round(len)); }
    const r = 20 + 90 * ease(k), my = -24 + 90 * ease(k);
    // Fire trailing off its edge.
    for (let i = 0; i < 40; i++) { const a = Math.PI + hash(i, 7) * Math.PI, d = r + 2 + hash(i, 8) * 6, y = my + Math.sin(a) * d - ((T * 80 + i * 7) % 30); ctx.fillStyle = i % 3 ? '#ff7a3a' : RED; ctx.fillRect(Math.round(W() / 2 + Math.cos(a) * d), Math.round(y), 2, 2); }
    moonDisc(ctx, W() / 2, my, Math.round(r), PALE);
    // The city and the Spire below, shaking.
    ctx.fillStyle = '#05030a'; for (let i = 0; i < 24; i++) { const x = i * W() / 24, h = 10 + hash(i, 9) * 22; ctx.fillRect(Math.round(x), Math.round(H() - h), Math.ceil(W() / 24) + 1, Math.round(h)); }
    spireShape(ctx, W() * 0.24, H(), H() * 0.28, 22);
    ctx.restore();
    if (k > 0.55) K().title(ctx, 'THE MOON FELL', W() / 2, H() * 0.8, 20, (k - 0.55) / 0.45, T);
  };
  S.eye = (ctx, k, T) => eyeShot(ctx, 'master_knight', k, T, '#cfe8ff');
  S.leap = function (ctx, k, T) {
    const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#1a0c18'); g.addColorStop(1, '#05030a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    moonDisc(ctx, W() * 0.82, H() * 0.12, Math.round(H() * 0.42), PALE);
    K().speedLines(ctx, W() * 0.82, H() * 0.12, 60, 'rgba(255,255,255,0.55)', 9, T, 70);
    ctx.fillStyle = '#05030a'; spireShape(ctx, W() * 0.2, H() + 10, H() * 0.6, 40);
    // He leaps from the tip across the face of the moon: a black shape trailing pale afterimages.
    const kk = ease(k), x = W() * 0.18 + kk * W() * 0.55, y = H() * 1.0 - kk * H() * 0.62;
    for (let i = 5; i >= 0; i--) A.actor(ctx, 'master_knight', 'Attack4', Math.min(14, Math.floor(k * 12)), 0, Math.round(x - i * 16), Math.round(y + i * 12), 2.8, { shade: i ? '#cfe8ff' : '#000000', alpha: i ? 0.22 - i * 0.03 : 1 });
  };
  S.cut = function (ctx, k, T) {
    drawShot(ctx, 'master_knight', k, T, '#ffffff', 'rgba(120,170,255,0.6)');
    if (k > 0.5) K().title(ctx, 'THE FIRST CUT', W() / 2, H() * 0.22, 22, (k - 0.5) / 0.5, T);
  };
  S.impact = function (ctx, k, T) {
    const white = Math.floor(k * 6) % 2 === 0, fg = white ? '#000000' : '#ffffff';
    fill(ctx, white ? '#ffffff' : INK);
    K().speedLines(ctx, W() * 0.55, H() * 0.42, 80, white ? '#000000' : RED, 4, T, 20);
    P.disc(ctx, W() * 0.55, H() * 0.42, Math.round(H() * 0.3), fg);
    A.actor(ctx, 'master_knight', 'Attack3', 9, 0, Math.round(W() * 0.42), Math.round(H() * 0.86), 3, { shade: fg });
    K().line(ctx, 0, H() * 0.9, W(), H() * 0.05, 2, fg);
    P.shake = 6;
  };
  S.wound = function (ctx, k, T) {
    fill(ctx, '#07050c');
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,240,240,${0.2 + hash(i, 2) * 0.5})`; ctx.fillRect(Math.round(hash(i, 3) * W()), Math.round(hash(i, 4) * H() * 0.7), 1, 1); }
    const mx = W() / 2, my = H() * 0.38, mr = Math.round(H() * 0.28), red = ease(k * 1.5);
    moonDisc(ctx, mx, my, mr, red > 0.5 ? '#ff6070' : PALE, 1);
    // It bleeds: drops falling from the gash.
    for (let i = 0; i < 28; i++) { const x = mx - mr * 0.8 + hash(i, 5) * mr * 1.6, y = my + (hash(i, 6) - 0.5) * 12 + ((T * (40 + hash(i, 7) * 50) + hash(i, 8) * 100) % (H() - my)); ctx.fillStyle = RED; ctx.fillRect(Math.round(x), Math.round(y), 1, 3); }
    sub(ctx, 'IT STOPPED.', k, H() * 0.82); sub(ctx, 'BUT THE WOUND NEVER CLOSED.', k - 0.35, H() * 0.9);
  };
  S.rise = function (ctx, k, T) {
    const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#1a0408'); g.addColorStop(1, '#4a0c16'); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    moonDisc(ctx, W() * 0.5, H() * 0.2, Math.round(H() * 0.18), '#ff4a5a', 1);
    const gy = Math.round(H() * 0.8); ctx.fillStyle = '#0a0306'; ctx.fillRect(0, gy, W(), H() - gy);
    ctx.globalAlpha = 0.8; for (let i = 0; i < 7; i++) K().crack(ctx, W() * (0.1 + i * 0.13), gy + 2, Math.PI / 2 + (hash(i, 1) - 0.5), 20, 30 + i, RED, 1); ctx.globalAlpha = 1;
    const keys = ['ghoul', 'raider', 'archer', 'bone', 'ghast', 'spearman'];
    keys.forEach((key, i) => {
      const f = D.FOES[key], x = Math.round(W() * (0.12 + i * 0.155)), rise = ease(k * 1.8 - i * 0.12); if (rise <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W(), gy + 1); ctx.clip();
      const y = Math.round(gy + (1 - rise) * 60);
      A.actor(ctx, f.set, 'Idle4', Math.floor(T * 7 + i) % 15, i % 2 ? Math.PI : 0, x, y, 1.6, { shade: '#000000' });
      ctx.fillStyle = RED; ctx.fillRect(x + (i % 2 ? -3 : 1), y - 50, 2, 1);
      ctx.restore();
    });
    sub(ctx, 'ITS LIGHT RAISES THE DEAD.', k - 0.2, H() * 0.92);
  };
  S.bleed = function (ctx, k, T) {
    fill(ctx, INK);
    const mx = W() / 2, my = H() * 0.3, mr = Math.round(H() * 0.2);
    moonDisc(ctx, mx, my, mr, '#ff3a50', 1);
    for (let i = 0; i < 9; i++) { const x = Math.round(mx - mr * 0.7 + i * mr * 0.17), len = Math.round((20 + hash(i, 3) * 60) * ease(k * 1.4)); ctx.fillStyle = RED; ctx.fillRect(x, Math.round(my + 4), 1, len); P.disc(ctx, x, my + 4 + len, 1, RED); }
    if (k > 0.2) K().title(ctx, 'TONIGHT IT BLEEDS OUT', W() / 2, H() * 0.66, 18, (k - 0.2) / 0.8, T);
    sub(ctx, 'AT DAWN, THE MOON FALLS FOR GOOD.', k - 0.5, H() * 0.82);
  };
  S.hero = (ctx, k, T, set) => eyeShot(ctx, set, k, T, RED);
  S.draw = function (ctx, k, T, set) { drawShot(ctx, set, k, T, RED, 'rgba(120,40,200,0.65)'); sub(ctx, 'ONLY ONE BLADE CAN CLOSE IT.', k - 0.15, H() * 0.9); if (k > 0.94) fill(ctx, '#ffffff', (k - 0.94) / 0.06); };
  // Up the Spire: the camera tilts from the hero at its foot past a guardian on every ledge to the moon.
  S.spire = function (ctx, k, T, set) {
    const tall = H() * 3.2, pan = ease(Math.min(1, k / 0.7)) * (tall - H()), y0 = (wy) => H() - (wy - pan);
    const g = ctx.createLinearGradient(0, 0, 0, H()); g.addColorStop(0, '#0a0610'); g.addColorStop(1, '#2a0a14'); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H());
    for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(255,240,240,${0.2 + hash(i, 2) * 0.5})`; ctx.fillRect(Math.round(hash(i, 3) * W()), Math.round(((hash(i, 4) * tall * 0.6 + pan * 0.4) % H())), 1, 1); }
    moonDisc(ctx, W() / 2, y0(tall + 10), Math.round(H() * 0.3), '#ff3a50', 1);
    ctx.fillStyle = 'rgba(255,42,68,0.35)'; spireShape(ctx, W() / 2 + 2, y0(0), y0(tall - 30) - 2, W() * 0.42 + 2); ctx.fillStyle = '#1c1020'; spireShape(ctx, W() / 2, y0(0), y0(tall - 30), W() * 0.42);
    ctx.fillStyle = 'rgba(255,42,68,0.25)'; for (let i = 0; i < 30; i++) { const wy = hash(i, 5) * (tall - 60), w = W() * 0.42 * (1 - wy / tall); ctx.fillRect(Math.round(W() / 2 + (hash(i, 6) - 0.5) * w * 1.4), Math.round(y0(wy)), 2, 3); }
    // A guardian on each ledge, dark with lit eyes, higher and higher.
    const G = ['warden', 'twinA', 'umbral', 'hunger', 'wing', 'firstCut'];
    G.forEach((key, i) => { const f = D.FOES[key], wy = tall * (0.12 + i * 0.14), side = i % 2 ? 1 : -1, w = W() * 0.42 * (1 - wy / tall), x = Math.round(W() / 2 + side * w * 0.55), y = Math.round(y0(wy)); if (y < -40 || y > H() + 60) return;
      ctx.fillStyle = 'rgba(255,42,68,0.5)'; ctx.fillRect(x - 18, y, 36, 1); ctx.fillStyle = '#05030a'; ctx.fillRect(x - 16, y + 1, 32, 3);
      const gg = ctx.createRadialGradient(x, y - 20, 2, x, y - 20, 34); gg.addColorStop(0, 'rgba(255,60,80,0.35)'); gg.addColorStop(1, 'rgba(255,60,80,0)'); ctx.fillStyle = gg; ctx.fillRect(x - 40, y - 60, 80, 70);
      A.actor(ctx, f.set, 'Idle4', Math.floor(T * 7 + i) % 15, side > 0 ? Math.PI : 0, x, y, 1.3 / Math.max(1, (f.scale || 1) * 0.8) * (f.scale || 1), { shade: '#000000' });
      ctx.fillStyle = f.color || RED; ctx.fillRect(x - 1, y - Math.round(40 * (f.scale || 1)), 2, 1); });
    // The hero at the foot, looking up.
    A.actor(ctx, set, 'Idle4', Math.floor(T * 7) % 15, -Math.PI / 2, Math.round(W() / 2), Math.round(y0(0) - 4), 1.6, { shade: '#000000' });
    if (k > 0.72) { const kk = (k - 0.72) / 0.28; fill(ctx, INK, Math.min(0.55, kk)); K().title(ctx, 'VESPER', W() / 2, H() * 0.44, 40, kk, T); if (kk > 0.3) { ctx.save(); ctx.globalAlpha = Math.min(1, (kk - 0.3) * 3); P.text(ctx, 'CLIMB THE SPIRE BEFORE DAWN', W() / 2, H() * 0.62, 8, '#f0e4e8', 'center'); ctx.restore(); } }
  };

  // Draw the opening at time t onto the pixel buffer's context.
  O.draw = function (ctx, t, heroSet) {
    const b = BEATS.find((x) => t < x[2]) || BEATS[BEATS.length - 1], k = Math.max(0, Math.min(1, (t - b[1]) / (b[2] - b[1])));
    ctx.save(); S[b[0]](ctx, k, t, heroSet); ctx.restore();
    // Letterbox.
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W(), 12); ctx.fillRect(0, H() - 12, W(), 12);
  };
})();
