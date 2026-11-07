// VESPER — story scenes as anime sequences, drawn on the cinematics' pixel buffer: title cards in
// the glitch red, reveals against the moon, grey close-ups with the red eye, speed lines, clashes
// that land on impact frames, the first cut across the moon. Shots play on a timer; a tap moves on.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, P = VS.PX, S = VS.STORY;
  const SC = VS.SC = {};
  const RED = '#ff2a44', INK = '#050507';
  const W = () => P.W, H = () => P.H, kit = () => VS.cine.kit;
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const sp = (who) => S.speaker(who);
  const loop = (clip, T, fps) => Math.floor(T * (fps || (D.FPS[clip] || 8))) % 15;
  const once = (T, fps) => Math.min(14, Math.floor(T * (fps || 14)));
  const fill = (ctx, c, a) => { ctx.save(); if (a != null) ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(0, 0, W(), H()); ctx.restore(); };

  // ---- backgrounds ----------------------------------------------------------------------------
  function stageBg(ctx, idx, T, pan, moonK) {
    const L = D.STAGES[Math.min(5, idx || 0)].look, F = Math.round(H() * 0.84);
    const g = ctx.createLinearGradient(0, 0, 0, F); g.addColorStop(0, L.sky[0]); g.addColorStop(0.7, L.sky[1]); g.addColorStop(1, L.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W(), F);
    for (let i = 0; i < 30; i++) { ctx.fillStyle = 'rgba(255,240,240,0.5)'; ctx.fillRect(Math.round(hash(i, 1) * W()), Math.round(hash(i, 2) * F * 0.6), 1, 1); }
    P.moon(ctx, Math.round(W() * 0.7 - (pan || 0) * 0.3), Math.round(30 + L.moon * 0.4), Math.round(L.moon * 0.75 * (moonK || 1)), L.moonCol);
    for (const [col, amp, base, seed] of [[R2(L.sky[1], 0.35), 26, F - 6, 3], [R2(L.sky[0], 0.6), 14, F, 7]]) {
      ctx.fillStyle = col; let y = base - amp * 0.5;
      for (let x = 0; x < W(); x++) { if (x % 6 === 0) y = base - amp * (0.3 + 0.7 * hash(((x + (pan || 0)) / 6) | 0, seed)); ctx.fillRect(x, Math.round(y), 1, H()); }
    }
    ctx.fillStyle = R2(L.sky[0], 0.75); ctx.fillRect(0, F, W(), H() - F);
    ctx.fillStyle = 'rgba(255,42,68,0.35)'; ctx.fillRect(0, F, W(), 1);
    return F;
  }
  function R2(c, k) { const p = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return '#' + p.map((v) => Math.round(v * (1 - k)).toString(16).padStart(2, '0')).join(''); }
  function bars(ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W(), 11); ctx.fillRect(0, H() - 11, W(), 11); }
  function radial(ctx, cx, cy, n, col, seed, T) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < n; i++) { const a = hash(i, seed) * Math.PI * 2, r0 = 24 + hash(i, seed + 1) * 40 + ((T * 260 + i * 9) % 30), r1 = r0 + 60 + hash(i, seed + 2) * 140; ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); } ctx.stroke(); }

  // ---- a figure ------------------------------------------------------------------------------------
  function fig(ctx, who, clip, frame, face, x, y, scale, opts) {
    const s = sp(who); if (!s) return;
    A.actor(ctx, s.set, clip, frame, face > 0 ? 0 : Math.PI, Math.round(x), Math.round(y), scale * (s.scale || 1), opts || {});
  }

  // ---- the shots ----------------------------------------------------------------------------------
  const SHOT = {};
  SHOT.card = function (ctx, sh, k, T) {
    fill(ctx, INK); kit().embers(ctx, T, 30, 0, W(), RED);
    if (sh.top) P.text(ctx, sh.top, W() / 2, H() * 0.36, 8, RED, 'center');
    kit().title(ctx, sh.title, W() / 2, H() * 0.5, Math.min(sh.size || 24, Math.round(W() / (sh.title.length * 0.62 + 2))), k, T);
    if (sh.sub) P.text(ctx, sh.sub, W() / 2, H() * 0.64, 7, '#e8c8d0', 'center');
  };
  SHOT.wide = function (ctx, sh, k, T) {
    const pan = (sh.pan || 0) * k, F = stageBg(ctx, sh.stage, T, pan);
    for (const c of sh.cast) {
      const x = (c.move ? c.move[0] + (c.move[1] - c.move[0]) * ease(k) : c.x) * W(), sc = c.scale || 1.5;
      const clip = c.clip || (c.move ? 'Run' : 'Idle'), fr = D.LOOP[clip] ? loop(clip, T) : once(T, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(Math.round(x - 8 * sc), F + 2, Math.round(16 * sc), 2);
      fig(ctx, c.who, clip, fr, c.face, x, F + 3, sc, c.silhouette ? { shade: '#05030a' } : {});
    }
    bars(ctx);
    sh.anchor = sh.line && sh.cast.find((c) => c.who === sh.line.who);
  };
  SHOT.close = function (ctx, sh, k, T) {
    // A grey close-up: the speaker huge on one side, a slow push, embers or speed lines behind.
    const right = sh.side !== 'left';
    fill(ctx, sh.bg === 'red' ? '#2a0610' : INK);
    if (sh.bg === 'speed') kit().hStreaks(ctx, 30, 'rgba(120,110,130,0.5)', 5, T, 900); else kit().embers(ctx, T, 18, 0, W(), RED);
    const s = sp(sh.who), base = 4.4 / Math.max(1, (s.scale || 1) * 0.8), sc = base + 0.5 * ease(k), clip = sh.clip || (sh.who === 'vesper' ? 'Idle4' : 'Idle');
    const bx = A.box(s.set, clip, 0, right ? Math.PI : 0, sc * (s.scale || 1)) || { x: -20, y: -40, w: 40, h: 40 };
    const fx = Math.round((right ? W() * 0.7 : W() * 0.3) - bx.x - bx.w / 2 + Math.sin(T * 2) * 2), fy = Math.round(H() * 0.42 - bx.y - bx.h * 0.18);
    fig(ctx, sh.who, clip, D.LOOP[clip] ? loop(clip, T, 7) : once(T, 10), right ? -1 : 1, fx, fy, sc, { grey: true });
    if (sh.eye && sh.who === 'vesper') {
      // The eye under the visor (Idle4 frame: head at 22,6; mirrored when he faces left).
      const hx = right ? fx + bx.x + bx.w - 22 * sc : fx + bx.x + 22 * sc, hy = fy + bx.y + 6 * sc, o = ease((k - 0.1) / 0.3);
      const g = ctx.createRadialGradient(hx, hy, 1, hx, hy, 24 * o); g.addColorStop(0, 'rgba(255,42,68,0.7)'); g.addColorStop(1, 'rgba(255,42,68,0)');
      ctx.fillStyle = g; ctx.fillRect(hx - 30, hy - 30, 60, 60); ctx.fillStyle = RED; ctx.fillRect(Math.round(hx - 6 * o), hy - 1, Math.round(12 * o), 3);
    }
    const cut = Math.round(right ? W() * 0.42 : W() * 0.58); ctx.fillStyle = INK; ctx.fillRect(cut - 2, 0, 4, H()); ctx.fillStyle = '#ffffff'; ctx.fillRect(right ? cut + 2 : cut - 3, 0, 1, H());
    bars(ctx);
    sh.textAt = { x: right ? W() * 0.06 : W() * 0.62, y: H() * 0.42, align: 'left', w: W() * 0.32 };
  };
  SHOT.reveal = function (ctx, sh, k, T) {
    // The foe against a vast moon: fog, a slow push in, then the eye of light.
    const L = D.STAGES[Math.min(5, sh.stage || 0)].look;
    fill(ctx, '#07050c');
    const mr = Math.round(H() * (0.42 + 0.06 * k)); P.moon(ctx, W() / 2, Math.round(H() * 0.46), mr, L.moonCol, 'rgba(255,40,70,0.45)');
    const who = [sh.who].concat(sh.also ? [sh.also] : []);
    who.forEach((w, i) => {
      const s = sp(w), sc = (2.6 + 0.5 * ease(k)) / Math.max(1, (s.scale || 1) * 0.75), x = W() / 2 + (who.length > 1 ? (i ? 1 : -1) * W() * 0.14 : 0);
      fig(ctx, w, 'Idle4', loop('Idle4', T, 6), who.length > 1 ? (i ? -1 : 1) : -1, x, H() * 0.98, sc, { shade: '#000000' });
    });
    ctx.fillStyle = 'rgba(10,6,14,0.7)'; ctx.fillRect(0, H() * 0.86, W(), H() * 0.14);
    for (let i = 0; i < 6; i++) { const y = H() * (0.8 + hash(i, 4) * 0.15), x = ((T * 14 * (1 + hash(i, 5))) + hash(i, 6) * W()) % (W() + 120) - 60; ctx.fillStyle = 'rgba(80,60,80,0.25)'; ctx.fillRect(Math.round(x), Math.round(y), 90, 4); }
    if (k > 0.72) { const a = Math.min(1, (k - 0.72) / 0.1), gx = W() / 2 + 6, gy = H() * 0.98 - 44 * 2.9; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(gx - 9 * a, gy, 18 * a, 1); ctx.fillRect(gx, gy - 9 * a, 1, 18 * a); ctx.fillStyle = RED; ctx.fillRect(gx - 1, gy - 1, 3, 3); }
    if (k > 0.94) fill(ctx, '#ffffff', (k - 0.94) / 0.06);
    bars(ctx);
  };
  SHOT.speed = function (ctx, sh, k, T) {
    fill(ctx, '#0a0810'); kit().hStreaks(ctx, 50, 'rgba(160,150,170,0.55)', 9, T, 1400);
    const dir = sh.dir || 1, x = W() * (0.5 - dir * 0.08 + dir * 0.16 * k), y = H() * 0.78;
    for (let i = 4; i >= 1; i--) fig(ctx, sh.who, 'Run', loop('Run', T - i * 0.03), dir, x - dir * i * 16, y, 2.6, { shade: RED, alpha: 0.12 + 0.05 * (4 - i) });
    fig(ctx, sh.who, 'Run', loop('Run', T, 18), dir, x, y, 2.6, { grey: true });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, Math.round(y + 2), W(), 1);
    bars(ctx);
  };
  // Two figures rush in and meet: white impact frame, black frame, sparks, both thrown apart.
  SHOT.clash = function (ctx, sh, k, T) {
    const hit = 0.42, cx = W() / 2, y = H() * 0.84;
    if (k < hit) {
      stageBg(ctx, sh.stage, T, k * 40); kit().hStreaks(ctx, 24, 'rgba(255,255,255,0.35)', 4, T, 1600);
      const kk = ease(k / hit), ax = -20 + (cx - 14 + 20) * kk, bx = W() + 20 - (W() + 20 - cx - 14) * kk;
      for (let i = 3; i >= 1; i--) { fig(ctx, sh.a, 'Attack4', 6, 1, ax - i * 14, y, 2.1, { shade: RED, alpha: 0.18 }); fig(ctx, sh.b, 'Attack4', 6, -1, bx + i * 14, y, 2.1 / Math.max(1, (sp(sh.b).scale || 1) * 0.7), { shade: '#ffffff', alpha: 0.12 }); }
      fig(ctx, sh.a, 'Attack4', Math.min(9, Math.floor(kk * 10)), 1, ax, y, 2.1);
      fig(ctx, sh.b, sh.bClip || 'Attack4', Math.min(9, Math.floor(kk * 10)), -1, bx, y, 2.1 / Math.max(1, (sp(sh.b).scale || 1) * 0.7));
      bars(ctx); return;
    }
    const f = (k - hit) / (1 - hit), white = f < 0.16, black = f >= 0.16 && f < 0.3;
    if (white || black) {
      fill(ctx, white ? '#ffffff' : INK); radial(ctx, cx, y - 40, 60, white ? '#000000' : RED, 21, T);
      fig(ctx, sh.a, 'Attack4', 10, 1, cx - 12, y, 2.3, { shade: white ? '#000000' : '#ffffff' });
      fig(ctx, sh.b, 'TakeDamage', 4, -1, cx + 14, y, 2.3 / Math.max(1, (sp(sh.b).scale || 1) * 0.7), { shade: white ? '#000000' : '#ffffff' });
      kit().line(ctx, 0, H() * 0.95, W(), H() * 0.08, 2, white ? '#000000' : '#ffffff');
      P.shake = 6; return;
    }
    // After: thrown apart, sparks, the dust settling.
    const g = ease((f - 0.3) / 0.7);
    stageBg(ctx, sh.stage, T, 40);
    fig(ctx, sh.a, 'Slide', Math.min(14, 2 + Math.floor(g * 8)), 1, cx - 14 - g * W() * 0.22, y, 2.1);
    fig(ctx, sh.b, 'Slide', Math.min(14, 2 + Math.floor(g * 8)), -1, cx + 14 + g * W() * 0.22, y, 2.1 / Math.max(1, (sp(sh.b).scale || 1) * 0.7));
    for (let i = 0; i < 40; i++) { const a = hash(i, 31) * Math.PI * 2, r = g * (30 + hash(i, 32) * 90); ctx.fillStyle = i % 3 ? '#ffd0a0' : '#ffffff'; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(y - 30 + Math.sin(a) * r * 0.6), 1 + (i % 2), 1); }
    ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 0.6 - g)})`; ctx.fillRect(0, 0, W(), H());
    bars(ctx);
  };
  SHOT.impact = function (ctx, sh, k, T) {
    const white = k < 0.55, n = sh.cast.length;
    fill(ctx, white ? '#ffffff' : INK); radial(ctx, W() / 2, H() * 0.55, 70, white ? '#000000' : RED, 41, T);
    sh.cast.forEach((w, i) => { const x = W() * ((i + 1) / (n + 1)), s = sp(w); fig(ctx, w, i === 0 ? 'Attack3' : 'Attack1', 8, i < n / 2 ? 1 : -1, x, H() * 0.92, 2.4 / Math.max(1, (s.scale || 1) * 0.7), { shade: white ? '#000000' : '#ffffff' }); });
    kit().line(ctx, W() * 0.1, 0, W() * 0.9, H(), 2, white ? '#000000' : '#ffffff');
    P.shake = 4;
  };
  // The prologue: a swordsman leaps at the moon and cuts it; it bleeds.
  SHOT.moonbreak = function (ctx, sh, k, T) {
    const hit = 0.5, mx = W() * 0.6, my = H() * 0.42, mr = Math.round(H() * 0.36);
    fill(ctx, '#06050a');
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,240,240,0.6)'; ctx.fillRect(Math.round(hash(i, 3) * W()), Math.round(hash(i, 4) * H()), 1, 1); }
    if (k < hit) {
      P.moon(ctx, mx, my, mr, '#f0e8ea', 'rgba(255,255,255,0.25)');
      const kk = k / hit, px = W() * 0.1 + W() * 0.5 * kk, py = H() * 0.9 - Math.sin(kk * Math.PI * 0.9) * H() * 0.6;
      for (let i = 3; i >= 1; i--) fig(ctx, 'swordsman', 'Attack4', Math.min(14, Math.floor(kk * 12)), 1, px - i * 12, py + i * 4, 1.9, { shade: '#000000', alpha: 0.2 });
      fig(ctx, 'swordsman', 'Attack4', Math.min(14, Math.floor(kk * 12)), 1, px, py, 1.9, { shade: '#000000' });
      return;
    }
    const f = (k - hit) / (1 - hit);
    if (f < 0.12) { fill(ctx, '#ffffff'); radial(ctx, mx, my, 70, '#000000', 51, T); fig(ctx, 'swordsman', 'Attack3', 9, 1, mx + 10, my + 50, 2, { shade: '#000000' }); P.shake = 8; return; }
    if (f < 0.2) { fill(ctx, INK); P.disc(ctx, mx, my, mr, '#ffffff'); kit().line(ctx, mx - mr * 1.4, my + mr * 1.1, mx + mr * 1.4, my - mr * 1.1, 2, RED); return; }
    const g = ease((f - 0.2) / 0.5);
    P.moon(ctx, mx, my, mr, g > 0.4 ? '#ff2a44' : '#f0a0a8', 'rgba(255,40,70,0.5)');
    ctx.fillStyle = '#7a0010'; kit().line(ctx, mx - mr * 1.1, my + mr * 0.8, mx + mr * 1.1, my - mr * 0.8, 1, '#3a0008');
    for (let i = 0; i < 8; i++) kit().crack(ctx, mx + (hash(i, 7) - 0.5) * mr, my + (hash(i, 8) - 0.5) * mr * 0.5, Math.PI / 2, mr * 0.9 * g, 90 + i, '#7a0010', 1);
    for (let i = 0; i < 26; i++) { const x = mx - mr + hash(i, 11) * mr * 2, y = my + mr * 0.3 + ((T * 60 + hash(i, 12) * 200) % (H() * 0.7)) * g; ctx.fillStyle = RED; ctx.fillRect(Math.round(x), Math.round(y), 1, 3); }
    fig(ctx, 'swordsman', 'Idle4', loop('Idle4', T, 6), -1, W() * 0.2, H() * 0.96, 1.9, { shade: '#000000' });
  };
  // The ending: the red moon goes white.
  SHOT.moonwhite = function (ctx, sh, k, T) {
    const g = ease(k), r = Math.round(255), gc = Math.round(42 + (232 - 42) * g), b = Math.round(68 + (236 - 68) * g);
    fill(ctx, `rgb(${Math.round(8 + 20 * g)},${Math.round(6 + 14 * g)},${Math.round(12 + 26 * g)})`);
    P.moon(ctx, W() / 2, Math.round(H() * 0.4), Math.round(H() * 0.3), `rgb(${r},${gc},${b})`, `rgba(255,${gc},${b},0.4)`);
    if (k > 0.45 && k < 0.52) fill(ctx, '#ffffff', 1 - Math.abs(k - 0.485) / 0.035);
    fig(ctx, 'lys', 'Idle', loop('Idle', T), 1, W() * 0.44, H() * 0.95, 1.4, { shade: '#000000' });
    fig(ctx, 'vesper', 'Idle', loop('Idle', T), -1, W() * 0.56, H() * 0.95, 1.4, { shade: '#000000' });
    bars(ctx);
  };

  // ---- the spoken line --------------------------------------------------------------------------------
  function drawLine(ctx, sh, t) {
    const L = sh.line; if (!L) return;
    const s = sp(L.who), size = L.shout ? 10 : 8, at = sh.textAt || { x: W() * 0.06, y: H() - 34, align: 'left', w: W() * 0.6 };
    if (sh.anchor) { const ax = (sh.anchor.move ? sh.anchor.move[1] : sh.anchor.x) * W(); at.x = ax > W() / 2 ? ax - W() * 0.36 : ax + 14; at.y = H() * 0.38; at.w = W() * 0.34; }
    const lines = P.wrap(ctx, L.text, size, at.w), lh = size + 3, top = at.y - lines.length * lh / 2;
    ctx.save(); ctx.globalAlpha = Math.min(1, t * 5);
    const sh2 = L.shout && t < 0.4 ? Math.round((Math.random() - 0.5) * 2) : 0;
    ctx.fillStyle = s.color; ctx.fillRect(Math.round(at.x - 5), Math.round(top - 10), 2, lines.length * lh + 12);
    P.text(ctx, s.name.toUpperCase(), Math.round(at.x), Math.round(top - 3), 6, s.color, 'left');
    lines.forEach((l, i) => P.text(ctx, l, Math.round(at.x + sh2), Math.round(top + 8 + i * lh), size, L.shout ? '#ffffff' : '#f2eef0', 'left', { outline: true }));
    ctx.restore();
  }

  // ---- playback ------------------------------------------------------------------------------------------
  const CUE = { card: [['clang_1', 0.7]], reveal: [['horn', 0.5], ['quake', 0.5]], speed: [['whoosh', 0.8]], clash: [['whoosh', 0.9]], impact: [['blow_big', 1], ['clang_0', 0.7]], moonbreak: [['charge', 0.8]], moonwhite: [['allout', 0.6]] };
  const durOf = (sh) => Math.max(sh.d || 1.6, sh.line ? 1.3 + sh.line.text.length * 0.045 : 0);
  SC.start = function (def) { const sc = { def, i: 0, t: 0, done: false, cues: [] }; enter(sc); return sc; };
  function enter(sc) { const sh = sc.def.shots[sc.i]; if (!sh) { sc.done = true; return; } sc.t = 0; sc.cues.push(...(CUE[sh.k] || [])); sh.anchor = null; sh.textAt = null; sc.hitCued = false; }
  SC.update = function (sc, dt, inp) {
    if (sc.done) return;
    if (inp.back) { sc.done = true; return; }
    const sh = sc.def.shots[sc.i]; sc.t += dt;
    const d = durOf(sh);
    if ((sh.k === 'clash' || sh.k === 'moonbreak') && !sc.hitCued && sc.t / d > (sh.k === 'clash' ? 0.42 : 0.5)) { sc.hitCued = true; sc.cues.push(['blow_big', 1], ['clang_1', 0.8], ['quake', 0.6]); }
    if (sc.t >= d || (inp.tap && sc.t > 0.3)) { sc.i++; enter(sc); }
  };
  SC.draw = function (ctx, sc) {
    const sh = sc.def.shots[Math.min(sc.i, sc.def.shots.length - 1)]; if (!sh) return;
    const d = durOf(sh), k = Math.min(1, sc.t / d);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
    SHOT[sh.k](ctx, sh, k, sc.t);
    drawLine(ctx, sh, sc.t);
    if (sc.t > 0.5) P.text(ctx, 'tap · esc skips', W() - 4, H() - 3, 6, 'rgba(230,220,224,0.45)', 'right', { shadow: false });
  };
  SC.kinds = Object.keys(SHOT); SC.durOf = durOf;
})();
