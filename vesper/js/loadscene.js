// THE BLEEDING MOON — the loading screen (2026-11-12, the author: "a far cleaner, better, more epic loading screen with
// epic cutscenes and animations"). A small film in the game's own isometric view that needs nothing but her sheet (the
// first thing the game loads): she walks toward us through the dark under the red moon, mirrored in a wet black floor
// that slides past beneath her; ash falls, embers rise, fog drifts, lightning lights the whole scene now and then, and
// every few steps she stops and cuts the air. Before her sheet is in, the scene plays without her. One line of lore or
// advice at a time, and a thin red line for the progress. The menu plays it too until its own film is ready.
(function () {
  const VS = window.VS, R = VS.R, A = VS.A, D = VS.DATA;
  const L = VS.LOADSCENE = { t: 0, p: null };
  const RED = '#ff2a44';
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const LINES = [
    'The red light of the wounded Moon wakes the dead.',
    'Each king you free climbs beside you as a Bound Soul.',
    'Attack right after a dodge for a dash-cut.',
    'When three foes crowd you, your next blow lands heavy.',
    'Your skills join your combo by themselves. Keep attacking.',
    'A moon art strikes hardest when your health is low.',
    'If she falls, the Moon turns the night back, and she climbs again.',
    'Dawn is six hours away. The First Cut waits at the top.',
  ];
  L.LINES = LINES;
  const STEP = 9.5;   // her walk and her cut, one cycle
  const tr = (s) => (VS.I18N ? VS.I18N.t(s) : s);
  function hero() { const P = VS.PROG || (VS.main && VS.main.save); const H = D.HEROES[(P && P.hero) || 'vesper'] || D.HERO; return H && A.hasSet(H.set) ? H : null; }

  // The red moon: a shaded sphere with a halo, faint seas, and its wound glowing across it, slow drops falling from it;
  // fog drifts across its face.
  L.moon = function (ctx, x, y, r, t) {
    let g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3.2); g.addColorStop(0, 'rgba(255,40,70,0.34)'); g.addColorStop(0.35, 'rgba(160,14,40,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.4, r * 0.05, x, y, r); g.addColorStop(0, '#ff8a94'); g.addColorStop(0.45, '#e8304a'); g.addColorStop(0.85, '#a00e26'); g.addColorStop(1, '#600818');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
    for (let i = 0; i < 7; i++) { const cx = x + (hash(i, 11) - 0.5) * r * 1.3, cy = y + (hash(i, 12) - 0.5) * r * 1.3, cr = r * (0.12 + hash(i, 13) * 0.22); g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr); g.addColorStop(0, 'rgba(90,0,20,0.22)'); g.addColorStop(1, 'rgba(90,0,20,0)'); ctx.fillStyle = g; ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2); }
    // The wound: a gentle curve, dark around a hot core, pulsing.
    const pu = 0.75 + 0.25 * Math.sin(t * 1.7), x0 = x - r * 1.05, y0 = y + r * 0.32, x1 = x + r * 1.05, y1 = y - r * 0.28, qx = x + r * 0.05, qy = y + r * 0.08;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,0,10,0.75)'; ctx.lineWidth = r * 0.075; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(qx, qy, x1, y1); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,60,90,${0.35 * pu})`; ctx.lineWidth = r * 0.06; ctx.stroke();
    ctx.strokeStyle = `rgba(255,215,215,${0.75 * pu})`; ctx.lineWidth = Math.max(1, r * 0.014); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.restore();
    // Drops from the wound, falling slowly and fading.
    for (let i = 0; i < 3; i++) {
      const u = 0.3 + i * 0.2, px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * qx + u * u * x1, py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * qy + u * u * y1, k = ((t * 0.18 + i * 0.37) % 1);
      ctx.fillStyle = `rgba(200,10,36,${0.8 * (1 - k)})`; ctx.fillRect(Math.round(px), Math.round(py + k * r * 1.4), Math.max(2, r * 0.025), Math.max(3, r * 0.06));
    }
    // Fog across its face.
    for (let i = 0; i < 2; i++) { const fx2 = x + ((t * (6 + i * 4) + i * 140) % (r * 5)) - r * 2.5, fy2 = y + r * (0.15 + i * 0.4); g = ctx.createRadialGradient(fx2, fy2, 0, fx2, fy2, r * 1.3); g.addColorStop(0, 'rgba(10,4,10,0.55)'); g.addColorStop(1, 'rgba(10,4,10,0)');
      ctx.save(); ctx.translate(0, fy2); ctx.scale(1, 0.28); ctx.translate(0, -fy2); ctx.fillStyle = g; ctx.fillRect(fx2 - r * 1.3, fy2 - r * 1.3, r * 2.6, r * 2.6); ctx.restore(); }
  };
  // Ash drifting down and embers rising (the menu's film wears them too).
  L.air = function (ctx, t, cx, a) {
    const W = R.W, H = R.H, k = R.k || 1; a = a == null ? 1 : a;
    for (let i = 0; i < 70; i++) {
      const sp = 14 + hash(i, 1) * 26, x = ((hash(i, 2) * (W + 80) - t * (10 + hash(i, 5) * 14) * k) % (W + 80) + W + 80) % (W + 80) - 40, y = ((hash(i, 3) * H + t * sp * k) % H + H) % H;
      ctx.fillStyle = `rgba(190,170,175,${(0.12 + hash(i, 4) * 0.3) * a})`; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, k * (hash(i, 6) < 0.8 ? 1.4 : 2.2)), Math.max(1, k * 1.4));
    }
    for (let i = 0; i < 26; i++) {
      const x = cx + (hash(i, 7) - 0.5) * W * 0.8 + Math.sin(t * 0.8 + i) * 14 * k, y = H - ((hash(i, 8) * H + t * (22 + hash(i, 9) * 30) * k) % H), f = Math.min(1, (H - y) / (H * 0.3)) * (1 - y / H * 0.2);
      ctx.fillStyle = `rgba(255,${80 + (i % 3) * 40},70,${0.55 * f * a})`; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, 2 * k), Math.max(1, 2 * k));
    }
  };
  L.draw = function (ctx, dt, p) {
    const W = R.W, H = R.H, k = R.k || 1, t = (L.t += Math.min(dt, 0.05));
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#040206'; ctx.fillRect(0, 0, W, H);
    const mx = W * 0.8, my = H * 0.13, mr = H * 0.15;
    // The floor: a wet black plane in the game's angle, its seams sliding past as she walks.
    const fx = W * 0.6, fy = H * 0.72, sc = H / 340 * 2.5, walk = t * 26;
    ctx.save(); ctx.translate(fx, fy);
    const cell = 32 * sc, off = (walk * sc) % cell, ext = 14 * cell, P = (x, y) => [(x - y) * 0.7071, (x + y) * 0.7071 * 0.5];
    ctx.lineWidth = Math.max(1, sc * 0.4); ctx.strokeStyle = 'rgba(255,60,90,0.08)'; ctx.beginPath();
    for (let i = -14; i <= 14; i++) {
      const x = i * cell + off; let a = P(x, -ext), b = P(x, ext); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);   // she walks along -x: these slide past
      const y = i * cell; a = P(-ext, y); b = P(ext, y); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    ctx.restore();
    // Light falls off away from her into the dark (one soft radial: no edge anywhere).
    g = ctx.createRadialGradient(fx, fy, H * 0.06, fx, fy, H * 0.85); g.addColorStop(0, 'rgba(4,2,6,0)'); g.addColorStop(0.6, 'rgba(4,2,6,0.8)'); g.addColorStop(1, 'rgba(4,2,6,0.98)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    L.moon(ctx, mx, my, mr, t);
    // A pool of red light under her.
    ctx.save(); ctx.translate(fx, fy); ctx.scale(1, 0.5); g = ctx.createRadialGradient(0, 0, 0, 0, 0, H * 0.26); g.addColorStop(0, 'rgba(255,40,70,0.24)'); g.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, H * 0.26, 0, 7); ctx.fill(); ctx.restore();
    // Her: walking toward us, mirrored in the floor; every few steps she stops and cuts.
    const Hd = hero();
    if (Hd) {
      const c = t % STEP, cutting = c > STEP - 2.2, ang = Math.PI * 0.75;
      let clip = 'Walk', fr = Math.floor(t * 9) % 15;
      if (cutting) { const ct = c - (STEP - 2.2); if (ct < 0.35) { clip = 'Idle4'; fr = Math.floor(ct * 8) % 15; } else if (ct < 1.4) { clip = 'Attack3'; fr = Math.min(14, Math.floor((ct - 0.35) * 14)); } else { clip = 'Idle4'; fr = Math.floor(ct * 8) % 15; } }
      const scale = sc * 1.45 * (Hd.scale || 1);
      ctx.save(); ctx.translate(0, fy * 2); ctx.scale(1, -1); ctx.globalAlpha = 0.16; A.actor(ctx, Hd.set, clip, fr, ang, Math.round(fx), Math.round(fy), scale, {}); ctx.restore();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(fx, fy, 15 * scale, 4 * scale, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      A.actor(ctx, Hd.set, clip, fr, ang, Math.round(fx), Math.round(fy), scale, {});
      // The cut: a crisp crescent and a short white flash on the blade's side.
      if (cutting) { const ct = c - (STEP - 2.2); if (ct > 0.62 && ct < 0.95 && A.hasFx && A.hasFx('slash_l')) A.fx(ctx, 'slash_l', ct - 0.62, fx - 18 * scale, fy - 26 * scale, scale * 0.9, 1); }
    }
    L.air(ctx, t, fx);
    // Fog drifting across.
    for (let i = 0; i < 3; i++) {
      const y = H * (0.5 + i * 0.13), x = ((t * (8 + i * 5) * k + i * 300) % (W * 1.6)) - W * 0.3;
      g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.35); g.addColorStop(0, 'rgba(60,30,44,0.16)'); g.addColorStop(1, 'rgba(60,30,44,0)');
      ctx.save(); ctx.translate(0, y); ctx.scale(1, 0.25); ctx.translate(0, -y); ctx.fillStyle = g; ctx.fillRect(x - W * 0.35, y - W * 0.35, W * 0.7, W * 0.7); ctx.restore();
    }
    // Lightning far off now and then: the whole scene lit for an instant (none with Reduce flashing on).
    const lt = t % 11.3; if (lt < 0.28 && t > 3 && !R.calm) { const a = lt < 0.06 ? 0.22 : lt > 0.12 && lt < 0.17 ? 0.14 : 0.04; ctx.fillStyle = `rgba(230,220,255,${a})`; ctx.fillRect(0, 0, W, H); }
    // Vignette.
    g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.7)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // The words: one line at a time, and the progress as a thin red line.
    if (p != null) {
      const li = Math.floor(t / 5.5) % LINES.length, lk = (t % 5.5) / 5.5, la = Math.min(1, lk * 8, (1 - lk) * 8);
      ctx.globalAlpha = la; ctx.font = R.fb(16 * k, 500); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#e6dde0';
      if ('letterSpacing' in ctx) ctx.letterSpacing = 0.5 * R.dpr + 'px';
      ctx.fillText(tr(LINES[li]), 40 * k, H - 58 * k); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; ctx.globalAlpha = 1;
      R.label(ctx, tr('THE BLEEDING MOON'), 40 * k, H - 86 * k, 10 * k, '#ff5a70', 'left', 6, 700);
      const bw = Math.min(W - 80 * k, 520 * k), bx = 40 * k, by = H - 38 * k;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx, by, bw, Math.max(1, 2 * k));
      ctx.fillStyle = RED; ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, p)), Math.max(1, 2 * k));
      R.glowAt(ctx, RED, bx + bw * Math.max(0, Math.min(1, p)), by + k, 10 * k, 0.6);
      R.label(ctx, Math.round(Math.max(0, Math.min(1, p)) * 100) + '%', bx + bw + 12 * k, by + 5 * k, 10 * k, 'rgba(230,220,224,0.6)', 'left', 2, 600);
    }
    ctx.restore();
  };
})();
