// VESPER — the story, told in clean full-resolution scenes: the side-on stage under the moon,
// crisp figures, slow camera moves, and one caption line at a time at the bottom of the screen.
// Shot kinds: title, moonfall, wound, stage, spire, guardian, clash, seal, dawn. A tap moves on, Esc skips.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, S = VS.STORY;
  const T = VS.TALE = {};
  const RED = '#ff2a44';
  const ease = (k) => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const sp = (who) => S.speaker(who);
  const loop = (clip, t, fps) => Math.floor(t * (fps || D.FPS[clip] || 8)) % 15;

  // ---- shared pieces ----------------------------------------------------------------------------
  function sky(ctx, top, bot) { const g = ctx.createLinearGradient(0, 0, 0, R.H); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H); }
  function stars(ctx, n, a) { for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(255,240,240,${(0.2 + hash(i, 3) * 0.6) * a})`; ctx.beginPath(); ctx.arc(hash(i, 1) * R.W, hash(i, 2) * R.H * 0.7, (hash(i, 4) < 0.9 ? 0.7 : 1.4) * R.dpr, 0, 7); ctx.fill(); } }
  function moon(ctx, x, y, r, col, glow) {
    const g = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 3.2); g.addColorStop(0, R.rgba(col, glow == null ? 0.4 : glow)); g.addColorStop(1, R.rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x - r * 3.3, y - r * 3.3, r * 6.6, r * 6.6);
    const m = ctx.createLinearGradient(x - r, y - r, x + r, y + r); m.addColorStop(0, R.mix(col, '#ffffff', 0.25)); m.addColorStop(1, R.mix(col, '#000000', 0.12)); ctx.fillStyle = m; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (hash(i, 3) - 0.5) * r * 1.2, y + (hash(i, 4) - 0.5) * r * 1.2, r * (0.08 + hash(i, 5) * 0.14), 0, 7); ctx.fill(); }
  }
  function ridge(ctx, base, amp, col, seed, wave) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, R.H); for (let x = 0; x <= R.W + wave; x += wave) ctx.lineTo(x, base - amp * hash((x / wave) | 0, seed)); ctx.lineTo(R.W, R.H); ctx.closePath(); ctx.fill(); }
  function figure(ctx, who, clip, frame, face, x, y, scale, opts) { const s = sp(who); if (!s) return; A.actor(ctx, s.set, clip, frame, face > 0 ? 0 : Math.PI, Math.round(x), Math.round(y), scale * (s.scale || 1), opts || {}); }
  function shadow(ctx, x, y, w) { const g = ctx.createRadialGradient(x, y, 0, x, y, w); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.22); ctx.translate(-x, -y); ctx.fillStyle = g; ctx.fillRect(x - w, y - w, w * 2, w * 2); ctx.restore(); }
  // The caption: a small red eyebrow, one clean line, on a soft dark band at the bottom.
  function caption(ctx, sh, t) {
    if (!sh.say && !sh.eyebrow) return;
    const k = R.k, a = Math.min(1, t / 0.4), y = R.H - 46 * k;
    const g = ctx.createLinearGradient(0, R.H - 120 * k, 0, R.H); g.addColorStop(0, 'rgba(4,2,6,0)'); g.addColorStop(1, `rgba(4,2,6,${0.85 * a})`); ctx.fillStyle = g; ctx.fillRect(0, R.H - 120 * k, R.W, 120 * k);
    ctx.save(); ctx.globalAlpha = a;
    if (sh.eyebrow) { const eb = sh.eyebrow === 'hero' ? ((sp('hero') || {}).name || '').toUpperCase() : sh.eyebrow; R.label(ctx, eb, R.W / 2, y - 30 * k, 11 * k, RED, 'center', 5, 700); }
    if (sh.say) {
      ctx.font = R.fb(21 * k, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#f6f1f3';
      const words = sh.say.split(' '), lines = []; let cur = ''; const maxW = Math.min(R.W * 0.8, 900 * k);
      for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
      if (cur) lines.push(cur);
      lines.forEach((l, i) => ctx.fillText(l, R.W / 2, y + (i - lines.length + 1) * 27 * k));
    }
    ctx.restore();
  }
  function bars(ctx, a) { const h = R.H * 0.075 * a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, h); ctx.fillRect(0, R.H - h, R.W, h); }
  // A full-resolution impact frame: white with black silhouettes and speed lines, then the reverse.
  function impact(ctx, k, cx, cy, draw) {
    const white = k < 0.55; ctx.fillStyle = white ? '#ffffff' : '#050307'; ctx.fillRect(0, 0, R.W, R.H);
    ctx.strokeStyle = white ? '#000000' : RED; ctx.lineWidth = 2 * R.dpr; ctx.beginPath();
    for (let i = 0; i < 60; i++) { const a = hash(i, 9) * Math.PI * 2, r0 = R.H * (0.12 + hash(i, 8) * 0.2), r1 = r0 + R.H * (0.4 + hash(i, 7)); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); }
    ctx.stroke(); draw(white ? '#000000' : '#ffffff');
  }

  // ---- the shots ----------------------------------------------------------------------------------
  const SHOT = {};
  SHOT.title = function (ctx, sh, k, t) {
    sky(ctx, '#06040a', '#14060c'); stars(ctx, 80, 1);
    moon(ctx, R.W * 0.5, R.H * 0.42, R.H * (0.16 + 0.02 * k), '#ff2a44', 0.35);
    ctx.fillStyle = 'rgba(4,2,6,0.55)'; ctx.fillRect(0, 0, R.W, R.H);
    const k2 = R.k, a = Math.min(1, t / 0.6);
    ctx.save(); ctx.globalAlpha = a;
    if (sh.top) R.label(ctx, sh.top, R.W / 2, R.H * 0.44, 13 * k2, RED, 'center', 7, 700);
    ctx.font = R.fd(52 * k2, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; if ('letterSpacing' in ctx) ctx.letterSpacing = 6 * R.dpr + 'px';
    ctx.fillText(sh.title, R.W / 2, R.H * 0.44 + 56 * k2); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const lw = (120 + 120 * ease(t)) * k2; ctx.fillStyle = RED; ctx.fillRect(R.W / 2 - lw / 2, R.H * 0.44 + 74 * k2, lw, 2 * k2);
    if (sh.sub) { ctx.globalAlpha = a * Math.min(1, Math.max(0, (t - 0.5) / 0.5)); ctx.font = R.fb(19 * k2, 500); ctx.fillStyle = '#d8ccd2'; ctx.fillText(sh.sub, R.W / 2, R.H * 0.44 + 108 * k2); }
    ctx.restore();
  };
  // The moon falling; a swordsman leaps from the Spire and cuts it; it stops.
  SHOT.moonfall = function (ctx, sh, k, t) {
    const hit = 0.62;
    sky(ctx, '#05060c', '#1a0c14'); stars(ctx, 70, 1);
    const mr = R.H * 0.2, my = R.H * (-0.1 + 0.42 * Math.min(k, hit) / hit), mx = R.W * 0.6;
    if (k < hit) moon(ctx, mx + Math.sin(t * 30) * (k > 0.4 ? 2 : 0), my, mr, '#f0e8ea', 0.3);
    // The Spire.
    ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.moveTo(R.W * 0.1, R.H); ctx.lineTo(R.W * 0.27, R.H * 0.38); ctx.lineTo(R.W * 0.3, R.H * 0.3); ctx.lineTo(R.W * 0.33, R.H * 0.38); ctx.lineTo(R.W * 0.52, R.H); ctx.fill();
    ridge(ctx, R.H * 0.86, R.H * 0.1, '#0a0810', 3, R.W / 18);
    if (k < hit) {
      const kk = Math.max(0, (k - 0.12) / (hit - 0.12)), px = R.W * 0.3 + (mx - R.W * 0.3 - mr * 0.6) * ease(kk), py = R.H * 0.32 + (my + mr * 0.4 - R.H * 0.32) * kk - Math.sin(kk * Math.PI) * R.H * 0.08;
      if (kk <= 0) figure(ctx, 'swordsman', 'Idle4', loop('Idle4', t), 1, R.W * 0.3, R.H * 0.31, R.S * 0.9, { shade: '#000000' });
      else for (let i = 3; i >= 0; i--) figure(ctx, 'swordsman', 'Attack4', Math.min(14, Math.floor(kk * 12)), 1, px - i * 18 * R.k, py + i * 6 * R.k, R.S * (0.9 + 0.5 * kk), { shade: i ? '#ffffff' : '#000000', alpha: i ? 0.15 : 1 });
      return;
    }
    const f = (k - hit) / (1 - hit);
    if (f < 0.18) { impact(ctx, f / 0.18, mx, my, (c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill(); figure(ctx, 'swordsman', 'Attack3', 9, 1, mx - mr * 0.3, my + mr * 0.9, R.S * 1.6, { shade: c }); }); return; }
    const g = ease((f - 0.18) / 0.4);
    moon(ctx, mx, my, mr, R.mix('#f0e8ea', '#ff2a44', g), 0.3 + 0.2 * g);
    ctx.strokeStyle = R.rgba('#5a0010', 0.9); ctx.lineWidth = 3 * R.dpr; ctx.beginPath(); ctx.moveTo(mx - mr * 0.95, my + mr * 0.35); ctx.lineTo(mx + mr * 0.95, my - mr * 0.35); ctx.stroke();
    for (let i = 0; i < 26; i++) { const x = mx - mr * 0.8 + hash(i, 11) * mr * 1.6, y = my + mr * 0.2 + ((t * 70 + hash(i, 12) * 300) % (R.H * 0.7)) * g; ctx.fillStyle = R.rgba(RED, 0.8); ctx.fillRect(x, y, 2 * R.dpr, 7 * R.dpr); }
  };
  // The bleeding moon over the world; its light raises the dead.
  SHOT.wound = function (ctx, sh, k, t) {
    const st = D.STAGES[0]; R.drawArena(ctx, st, 40 + k * 40);
    ctx.fillStyle = R.rgba(RED, 0.12 + 0.06 * Math.sin(t * 3)); ctx.fillRect(0, 0, R.W, R.H);
    const keys = ['ghoul', 'ghast', 'raider', 'archer', 'bone'];
    keys.forEach((key, i) => { const f = D.FOES[key], x = R.W * (0.12 + i * 0.19), y = R.floorY + 10 * R.k, rise = ease(k * 1.6 - i * 0.15); if (rise <= 0) return; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, R.W, y + 2); ctx.clip(); A.actor(ctx, f.set, 'Idle', loop('Idle', t + i), i % 2 ? Math.PI : 0, Math.round(x), Math.round(y + (1 - rise) * 60 * R.S), R.S * 1.6, rise < 0.6 ? { shade: '#05030a' } : {}); ctx.restore(); });
    bars(ctx, 1);
  };
  // A side-on scene on a stage's set: the cast stands or walks, the camera drifts.
  SHOT.stage = function (ctx, sh, k, t) {
    const st = D.STAGES[Math.min(5, sh.stage || 0)], cam = (sh.cam || 60) + (sh.pan || 0) * ease(k);
    R.drawArena(ctx, st, cam); R.drawWeather(ctx, st, cam, R.t, 0.6);
    for (const c of sh.cast || []) {
      const x = R.W * (c.move ? c.move[0] + (c.move[1] - c.move[0]) * ease(k) : c.x), y = R.floorY + 8 * R.k, sc = R.S * (c.scale || 1.7);
      const clip = c.clip || (c.move ? 'Walk' : 'Idle4'), fr = D.LOOP[clip] ? loop(clip, t) : Math.min(14, Math.floor(t * (c.fps || 10)));
      shadow(ctx, x, y, 22 * sc / R.S);
      if (c.glow) R.glowAt(ctx, c.glow, x, y - 26 * sc, 46 * sc, 0.35 + 0.1 * Math.sin(t * 4));
      figure(ctx, c.who, clip, fr, c.face || 1, x, y, sc, c.silhouette ? { shade: '#05030a' } : {});
    }
    bars(ctx, 1);
  };
  // The climb: the Spire with six guardians up its side, the next one lit.
  SHOT.spire = function (ctx, sh, k, t) {
    sky(ctx, '#05040a', '#160810'); stars(ctx, 60, 1);
    moon(ctx, R.W * 0.8, R.H * 0.2, R.H * 0.09, '#ff2a44', 0.4);
    const base = R.H * 0.8, top = R.H * 0.1, cx = R.W * 0.5, wB = R.W * 0.34;
    ctx.fillStyle = '#0c0912'; ctx.fillRect(0, base, R.W, R.H - base); ctx.beginPath(); ctx.moveTo(cx - wB, base); ctx.lineTo(cx - wB * 0.12, top + 10 * R.k); ctx.lineTo(cx, top); ctx.lineTo(cx + wB * 0.12, top + 10 * R.k); ctx.lineTo(cx + wB, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,42,68,0.25)'; ctx.lineWidth = 1.5 * R.dpr; ctx.stroke();
    const pts = D.STAGES.map((st, i) => { const f = i / 5, y = base - (base - top - 30 * R.k) * (0.06 + f * 0.94), side = i % 2 ? 1 : -1, x = cx + side * wB * (1 - f) * 0.45; return { x, y, st, i }; });
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.setLineDash([5 * R.dpr, 6 * R.dpr]); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); ctx.setLineDash([]);
    const cur = sh.at || 0;
    for (const p of pts) {
      const done = p.i < cur, now = p.i === cur, r = (now ? 9 : 6) * R.k;
      if (now) R.glowAt(ctx, RED, p.x, p.y, 40 * R.k, 0.5 + 0.2 * Math.sin(t * 5));
      ctx.fillStyle = done ? 'rgba(255,255,255,0.35)' : now ? RED : '#2a1a22'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = now ? '#ffffff' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5 * R.dpr; ctx.stroke();
      const f = D.FOES[p.st.bossWave[0]], left = p.x > cx, tx = p.x + (left ? 1 : -1) * 18 * R.k;
      R.label(ctx, p.st.hour, tx, p.y - 5 * R.k, 10 * R.k, now ? RED : done ? '#7a6a72' : '#a99aa2', left ? 'left' : 'right', 3, 700);
      R.label(ctx, done ? p.st.name.toUpperCase() + '  ·  CLEARED' : (p.st.bossWave.length > 1 ? 'THE HOLLOW TWINS' : f.name.toUpperCase()), tx, p.y + 11 * R.k, (now ? 16 : 12) * R.k, now ? '#ffffff' : done ? '#6a5a62' : '#c8b8c0', left ? 'left' : 'right', 2, now ? 700 : 600);
      if (done) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(p.x - r * 0.6, p.y); ctx.lineTo(p.x - r * 0.1, p.y + r * 0.5); ctx.lineTo(p.x + r * 0.6, p.y - r * 0.5); ctx.stroke(); }
    }
    // The hero climbing toward the current guardian.
    const p = pts[cur], h = sp('hero'); if (h) A.actor(ctx, h.set, 'Walk', loop('Walk', t), 0, Math.round(p.x + (p.x > cx ? -1 : 1) * 22 * R.k), Math.round(p.y + 8 * R.k), R.S * 0.6, {});
    bars(ctx, 1);
  };
  // A guardian, revealed: dark at first against its own sky, then lit, its name.
  SHOT.guardian = function (ctx, sh, k, t) {
    const st = D.STAGES[sh.stage], keys = [sh.who].concat(sh.also ? [sh.also] : []);
    R.drawArena(ctx, st, 100 + k * 20); ctx.fillStyle = `rgba(4,2,6,${0.55 - 0.3 * ease(k * 2)})`; ctx.fillRect(0, 0, R.W, R.H);
    keys.forEach((key, i) => {
      const f = D.FOES[key], sc = R.S * (1.8 + 0.2 * ease(k)) * ((f.scale || 1) > 1 ? 0.78 : 1), x = R.W * (keys.length > 1 ? 0.56 + i * 0.2 : 0.64), y = R.floorY + 10 * R.k;
      shadow(ctx, x, y, 30 * sc / R.S); R.glowAt(ctx, f.color || RED, x, y - 30 * sc, 60 * sc, 0.25 * ease(k * 2));
      A.actor(ctx, f.set, k < 0.35 ? 'Idle4' : 'Taunt', loop(k < 0.35 ? 'Idle4' : 'Taunt', t), keys.length > 1 && i === 0 ? 0 : Math.PI, Math.round(x), Math.round(y), sc, k < 0.3 ? { shade: '#05030a' } : {});
    });
    if (k > 0.3) {
      const a = ease((k - 0.3) * 4), f = D.FOES[sh.who], name = sh.also ? 'THE HOLLOW TWINS' : f.name.toUpperCase(), sub = sh.also ? 'THE LEFT HAND AND THE RIGHT' : f.title.toUpperCase();
      ctx.save(); ctx.globalAlpha = a; ctx.font = R.fd(40 * R.k, 700); ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; if ('letterSpacing' in ctx) ctx.letterSpacing = 3 * R.dpr + 'px';
      ctx.fillText(name, R.W * 0.06 + (1 - a) * -30, R.H * 0.24); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      R.label(ctx, sub, R.W * 0.06 + 2, R.H * 0.24 + 24 * R.k, 12 * R.k, '#ff8a9a', 'left', 4, 600);
      ctx.fillStyle = RED; ctx.fillRect(R.W * 0.06, R.H * 0.24 + 34 * R.k, 140 * R.k * a, 2 * R.k); ctx.restore();
    }
    bars(ctx, 1);
  };
  // The hero and the guardian rush each other and meet on an impact frame.
  SHOT.clash = function (ctx, sh, k, t) {
    const st = D.STAGES[sh.stage], hit = 0.45, y = R.floorY + 10 * R.k, f = D.FOES[sh.b], bs = R.S * 2 / Math.max(1, (f.scale || 1) * 0.75) * (f.scale || 1);
    if (k < hit) {
      R.drawArena(ctx, st, 100 + k * 60);
      const kk = ease(k / hit), ax = R.W * (0.05 + 0.4 * kk), bx = R.W * (0.95 - 0.4 * kk);
      for (let i = 3; i >= 1; i--) { figure(ctx, 'hero', 'Attack4', 6, 1, ax - i * 24 * R.k, y, R.S * 2, { shade: RED, alpha: 0.15 }); A.actor(ctx, f.set, 'Attack4', 6, Math.PI, Math.round(bx + i * 24 * R.k), Math.round(y), bs, { shade: '#ffffff', alpha: 0.1 }); }
      figure(ctx, 'hero', 'Attack4', Math.min(9, Math.floor(kk * 10)), 1, ax, y, R.S * 2); A.actor(ctx, f.set, 'Attack4', Math.min(9, Math.floor(kk * 10)), Math.PI, Math.round(bx), Math.round(y), bs, {});
      bars(ctx, 1); return;
    }
    const ff = (k - hit) / (1 - hit);
    if (ff < 0.3) { impact(ctx, ff / 0.3, R.W / 2, y - 40 * R.S, (c) => { figure(ctx, 'hero', 'Attack4', 10, 1, R.W * 0.47, y, R.S * 2.2, { shade: c }); A.actor(ctx, f.set, 'TakeDamage', 4, Math.PI, Math.round(R.W * 0.53), Math.round(y), bs * 1.1, { shade: c }); ctx.strokeStyle = c; ctx.lineWidth = 3 * R.dpr; ctx.beginPath(); ctx.moveTo(0, R.H * 0.9); ctx.lineTo(R.W, R.H * 0.15); ctx.stroke(); }); R.shake = 10; return; }
    ctx.fillStyle = `rgba(255,248,250,${1 - (ff - 0.3) / 0.7})`; R.drawArena(ctx, st, 160); ctx.fillRect(0, 0, R.W, R.H);
  };
  // The ending: the hero leaps at the bleeding moon and strikes the wound; white; the moon is whole.
  SHOT.seal = function (ctx, sh, k, t) {
    const hit = 0.58, mx = R.W * 0.6, my = R.H * 0.3, mr = R.H * 0.2;
    sky(ctx, '#05040a', '#1a0810'); stars(ctx, 70, 1);
    if (k < hit) {
      moon(ctx, mx, my, mr, '#ff2a44', 0.45 + 0.1 * Math.sin(t * 6));
      ctx.strokeStyle = 'rgba(70,0,14,0.95)'; ctx.lineWidth = 4 * R.dpr; ctx.beginPath(); ctx.moveTo(mx - mr * 0.95, my + mr * 0.35); ctx.lineTo(mx + mr * 0.95, my - mr * 0.35); ctx.stroke();
      ctx.fillStyle = '#07050c'; ctx.beginPath(); ctx.moveTo(0, R.H); ctx.lineTo(0, R.H * 0.8); ctx.lineTo(R.W * 0.18, R.H * 0.74); ctx.lineTo(R.W * 0.34, R.H * 0.8); ctx.lineTo(R.W * 0.4, R.H); ctx.fill();
      ridge(ctx, R.H * 0.9, R.H * 0.06, '#0c0912', 7, R.W / 20);
      const kk = Math.max(0, (k - 0.2) / (hit - 0.2)), x0 = R.W * 0.18, y0 = R.H * 0.74, px = x0 + (mx - x0) * ease(kk), py = y0 + (my + mr * 0.2 - y0) * kk - Math.sin(kk * Math.PI) * R.H * 0.15;
      if (kk <= 0) figure(ctx, 'hero', 'Idle4', loop('Idle4', t), 1, x0, y0, R.S * 1.5, { shade: '#05030a' });
      else for (let i = 3; i >= 0; i--) figure(ctx, 'hero', 'Attack4', Math.min(14, Math.floor(kk * 12)), 1, px - i * 16 * R.k, py + i * 7 * R.k, R.S * 1.5, { shade: i ? RED : '#05030a', alpha: i ? 0.22 : 1 });
      return;
    }
    const f = (k - hit) / (1 - hit);
    if (f < 0.2) { impact(ctx, f / 0.2, mx, my, (c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill(); figure(ctx, 'hero', 'Attack4', 10, 1, mx - mr * 0.2, my + mr * 0.9, R.S * 1.7, { shade: c }); }); R.shake = 10; return; }
    const g = ease((f - 0.2) / 0.5);
    moon(ctx, mx, my, mr, R.mix('#ff2a44', '#f6f2ee', g), 0.4);
    ctx.strokeStyle = R.rgba('#46000e', 0.95 * (1 - g)); ctx.lineWidth = 4 * R.dpr; ctx.beginPath(); ctx.moveTo(mx - mr * 0.95 * (1 - g), my + mr * 0.35 * (1 - g)); ctx.lineTo(mx + mr * 0.95 * (1 - g), my - mr * 0.35 * (1 - g)); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - g)})`; ctx.fillRect(0, 0, R.W, R.H);
  };
  // The ending: the wound closes, the moon goes white and rises, dawn.
  SHOT.dawn = function (ctx, sh, k, t) {
    const g = ease(k); sky(ctx, R.mix('#05040a', '#2a3a5a', g), R.mix('#160810', '#e8a070', g)); stars(ctx, 70, 1 - g);
    const col = R.mix('#ff2a44', '#f4f0ec', g); moon(ctx, R.W * 0.5, R.H * (0.42 - 0.18 * g), R.H * 0.16, col, 0.35);
    ridge(ctx, R.H * 0.82, R.H * 0.1, R.mix('#0a0810', '#2a2030', g), 5, R.W / 16);
    ctx.fillStyle = R.mix('#05040a', '#1a1420', g); ctx.fillRect(0, R.H * 0.82, R.W, R.H * 0.18);
    figure(ctx, 'hero', 'Idle', loop('Idle', t), 1, R.W * 0.5, R.H * 0.84, R.S * 1.6, { shade: '#05030a' });
    bars(ctx, 1);
  };

  // ---- playback ------------------------------------------------------------------------------------
  const CUE = { title: [['clang_1', 0.6]], moonfall: [['charge', 0.8]], guardian: [['horn', 0.5]], clash: [['whoosh', 0.9]], dawn: [['allout', 0.6]], seal: [['charge', 0.8]], spire: [['step_2', 0.5]] };
  const durOf = (sh) => Math.max(sh.d || 2.4, sh.say ? 1.6 + sh.say.length * 0.05 : 0);
  T.durOf = durOf; T.kinds = () => Object.keys(SHOT);
  T.start = function (def) { const sc = { def, i: 0, t: 0, done: false, cues: [] }; enter(sc); return sc; };
  function enter(sc) { const sh = sc.def.shots[sc.i]; if (!sh) { sc.done = true; return; } sc.t = 0; sc.cues.push(...(CUE[sh.k] || [])); sc.hitCued = false; }
  T.update = function (sc, dt, inp) {
    if (sc.done) return; if (inp.back) { sc.done = true; return; }
    const sh = sc.def.shots[sc.i]; sc.t += dt; const d = durOf(sh);
    if ((sh.k === 'clash' || sh.k === 'moonfall' || sh.k === 'seal') && !sc.hitCued && sc.t / d > ({ clash: 0.45, moonfall: 0.62, seal: 0.58 })[sh.k]) { sc.hitCued = true; sc.cues.push(['blow_big', 1], ['clang_1', 0.8], ['quake', 0.6]); }
    if (sc.t >= d || (inp.tap && sc.t > 0.35)) { sc.i++; enter(sc); }
  };
  T.draw = function (ctx, sc) {
    const sh = sc.def.shots[Math.min(sc.i, sc.def.shots.length - 1)]; if (!sh) return;
    const k = Math.min(1, sc.t / durOf(sh));
    ctx.save(); ctx.imageSmoothingEnabled = false; SHOT[sh.k](ctx, sh, k, sc.t); ctx.restore();
    caption(ctx, sh, sc.t);
    if (sc.t > 0.6) R.label(ctx, 'CLICK TO CONTINUE  ·  ESC SKIPS', R.W - 18 * R.k, 16 * R.k, 9 * R.k, 'rgba(220,210,214,0.4)', 'right', 2, 500);
  };
})();
