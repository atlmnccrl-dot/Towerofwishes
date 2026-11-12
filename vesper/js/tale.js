// VESPER — the story, told in clean full-resolution scenes: the side-on stage under the moon,
// crisp figures, slow camera moves, and one caption line at a time at the bottom of the screen.
// Shot kinds: title, moonfall, film (the fight camera on a real arena), spire, clash, seal. A tap moves on, Esc skips.
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
  // The caption: a small red eyebrow, one clean line, on a soft dark band at the bottom.
  function caption(ctx, sh, t) {
    if (!sh.say && !sh.eyebrow) return;
    if (sh.cine) return cineCaption(ctx, sh, t);
    const k = R.k, a = Math.min(1, t / 0.4), y = R.H - 46 * k;
    const g = ctx.createLinearGradient(0, R.H - 120 * k, 0, R.H); g.addColorStop(0, 'rgba(4,2,6,0)'); g.addColorStop(1, `rgba(4,2,6,${0.85 * a})`); ctx.fillStyle = g; ctx.fillRect(0, R.H - 120 * k, R.W, 120 * k);
    ctx.save(); ctx.globalAlpha = a;
    if (sh.eyebrow) { const eb = sh.eyebrow === 'hero' ? ((sp('hero') || {}).name || '').toUpperCase() : sh.eyebrow; R.label(ctx, eb, R.W / 2, y - 30 * k, 11 * k, RED, 'center', 5, 700); }
    if (sh.say) {
      ctx.font = R.fb(21 * k, 600); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#f6f1f3';
      const words = (VS.I18N ? VS.I18N.t(sh.say) : sh.say).split(' '), lines = []; let cur = ''; const maxW = Math.min(R.W * 0.8, 900 * k);
      for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (ctx.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
      if (cur) lines.push(cur);
      lines.forEach((l, i) => ctx.fillText(l, R.W / 2, y + (i - lines.length + 1) * 27 * k));
    }
    ctx.restore();
  }
  // The filmed opening's caption: one quiet line in the lower letterbox, fading in late and out early; the
  // eyebrow (a place or a name) sits small in the upper bar.
  function cineCaption(ctx, sh, t) {
    const k = R.k, d = durOf(sh), at = sh.sayAt == null ? 0.7 : sh.sayAt, a = Math.max(0, Math.min(1, (t - at) / 0.6, (d - 0.35 - t) / 0.5));
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a;
    if (sh.eyebrow) R.label(ctx, VS.I18N ? VS.I18N.t(sh.eyebrow) : sh.eyebrow, R.W / 2, R.H * 0.058, 10 * k, '#ff5a70', 'center', 6, 700);
    if (sh.say) {
      ctx.font = R.fb(19 * k, 500); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ece4e6';
      if ('letterSpacing' in ctx) ctx.letterSpacing = 0.6 * R.dpr + 'px';
      ctx.fillText(VS.I18N ? VS.I18N.t(sh.say) : sh.say, R.W / 2, R.H * (1 - 0.0575) + (1 - a) * 4 * k);
    }
    ctx.restore();
  }
  function bars(ctx, a, wide) { const h = R.H * (wide ? 0.115 : 0.075) * a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, h); ctx.fillRect(0, R.H - h, R.W, h); }
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
      R.label(ctx, done ? p.st.name.toUpperCase() + '  ·  CLEARED' : (p.st.boss === 'twins' ? 'THE HOLLOW TWINS' : f.name.toUpperCase()), tx, p.y + 11 * R.k, (now ? 16 : 12) * R.k, now ? '#ffffff' : done ? '#6a5a62' : '#c8b8c0', left ? 'left' : 'right', 2, now ? 700 : 600);
      if (done) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2 * R.dpr; ctx.beginPath(); ctx.moveTo(p.x - r * 0.6, p.y); ctx.lineTo(p.x - r * 0.1, p.y + r * 0.5); ctx.lineTo(p.x + r * 0.6, p.y - r * 0.5); ctx.stroke(); }
    }
    // The hero climbing toward the current guardian.
    const p = pts[cur], h = sp('hero'); if (h) A.actor(ctx, h.set, 'Walk', loop('Walk', t), 0, Math.round(p.x + (p.x > cx ? -1 : 1) * 22 * R.k), Math.round(p.y + 8 * R.k), R.S * 0.6, {});
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
  // ---- Filmed shots: the fight camera's high three-quarter view on the real arena --------------------
  // A shot stages its cast on a stage's arena (entering from rifts or dropping from the sky, walking,
  // standing), moves the camera from one point to another and pushes the zoom, then draws it with
  // the fight renderer. Positions are world units on the arena floor.
  const TOWARD_CAM = Math.atan2(Math.cos(VS.R.HELI.ang), Math.sin(VS.R.HELI.ang));
  function nameCard(ctx, who, also, a, sub0) {
    const H = who === 'hero' && D.HEROES ? D.HEROES[S.heroKey] || D.HEROES.vesper : null, f = H || D.FOES[who], name = also ? 'THE HOLLOW TWINS' : f.name.toUpperCase(), sub = sub0 || (also ? 'THE LEFT HAND AND THE RIGHT' : f.title.toUpperCase());   // the hero's card too (the opening)
    ctx.save(); ctx.globalAlpha = a; ctx.font = R.fd(44 * R.k, 700); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffffff'; if ('letterSpacing' in ctx) ctx.letterSpacing = 3 * R.dpr + 'px';
    ctx.lineWidth = 6 * R.dpr; ctx.strokeStyle = 'rgba(6,2,6,0.7)'; ctx.strokeText(name, R.W * 0.06 + (1 - a) * -30, R.H * 0.24); ctx.fillText(name, R.W * 0.06 + (1 - a) * -30, R.H * 0.24); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    R.label(ctx, sub, R.W * 0.06 + 2, R.H * 0.24 + 24 * R.k, 12 * R.k, '#ff8a9a', 'left', 4, 600);
    ctx.fillStyle = RED; ctx.fillRect(R.W * 0.06, R.H * 0.24 + 34 * R.k, 160 * R.k * a, 2 * R.k); ctx.restore();
  }
  function filmOf(sc, sh) {
    if (sc.film && sc.film.sh === sh) return sc.film;
    R.fx = []; R.parts = []; R.floaters = []; R.pfx = []; R.entryDoor = null; R.impactF = null; R.shake = 0; R.flash = 0;
    const s = VS.sim.create(sh.stage, { seed: 7, hero: S.heroKey });
    s.staged = true; s.area = sh.area === 'last' ? s.waves.length - 1 : sh.area || 0; s.wave = s.area; s.units = []; s.hero.hp = s.hero.maxHp;
    const cast = (sh.cast || []).map((c) => {
      // '@armyN': the Nth foe of the army the coming fight brings (given by main.js with its look).
      if (c.who[0] === '@') { const a = (sc.def.army || [])[+c.who.slice(5)]; if (!a) return null; if (!A.hasSet(a.set)) A.loadSets([a.set]).catch(() => {}); const u = VS.sim.makeUnit(s, 'foe', a.key, D.FOES[a.key], c.at[0], c.at[1], 0); u.set = a.set; u.x = c.at[0]; u.y = c.at[1]; u.alive = true; u.state = 'idle'; return { c, u, landed: !c.enter }; }
      const u = c.who === 'hero' ? s.hero : VS.sim.makeUnit(s, 'foe', c.who, D.FOES[c.who], c.at[0], c.at[1], 0);
      u.x = c.at[0]; u.y = c.at[1]; u.alive = true; u.state = 'idle'; u.aura = !!c.aura; s.units.push(u);
      if (c.set) { u.set = c.set; if (!A.hasSet(c.set)) A.loadSets([c.set]).catch(() => {}); }   // a look of its own (townsfolk, for one)
      if (c.scale) { u.scale = c.scale; u.rad = 8 * c.scale; }
      return { c, u, landed: !c.enter };
    }).filter(Boolean);
    s.units = cast.map((m) => m.u).filter((u, i, a) => a.indexOf(u) === i);
    return (sc.film = { sh, s, cast, evd: {} });
  }
  const lerp2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  SHOT.film = function (ctx, sh, k, t, sc) {
    const F = filmOf(sc, sh), s = F.s, sl = sh.slow || 1, t0 = t;
    // ramp: [[at, speed], ...] in real seconds: hit-stops and slow motion. Everything the shot stages (moves, clips,
    // deaths, events, effects) runs on the film's own clock; the camera and the captions stay on the real one.
    const spd = rampAt(sh.ramp, t0), dt = Math.min(0.05, sc.dt || 0.016) * spd;
    t = filmTime(sh.ramp, t0);
    const byId = (id) => F.cast.find((mm) => mm.c.id === id || mm.c.who === id);
    for (const m of F.cast) {
      const { c, u } = m, tt = t - (c.delay || 0), ed = c.edur || (c.enter === 'drop' ? 1.3 : 1.1);
      if (c.enter && tt < ed) {
        if (tt < 0) { u.state = 'dead'; u.deadT = 99; continue; }
        u.state = 'spawn'; u.mode = c.enter; u.st = tt; u.dur = ed; u.from = { x: u.x, y: u.y }; u.to = u.from;
        u.clip = c.enter === 'drop' ? 'Attack4' : 'Idle'; u.frame = c.enter === 'drop' ? Math.min(14, Math.floor(tt / ed * 10)) : loop('Idle', t);
        continue;
      }
      if (!m.landed) {
        m.landed = true; m.landT = t;
        s.events = [{ type: 'landed', id: u.id, x: u.x, y: u.y, boss: !!u.def.boss }]; R.consume(s); s.events = [];
        if (u.def.boss) { R.impactF = { t: 0, dur: 0.12, x: u.x, y: u.y, big: true }; R.shake = 12; sc.cues.push(['quake', 1], ['blow_big', 0.9]); }
      }
      u.state = 'idle';
      const tm = tt - (c.moveAt || 0);   // moveAt: the move starts later than the entrance
      const mv = c.to ? (sh.cine ? smooth : ease)(Math.max(0, Math.min(1, tm / (c.mdur || sh.d || 2.4)))) : 0, p = c.to ? lerp2(c.at, c.to, mv) : c.at, moving = c.to && mv < 0.98 && tm >= 0;
      u.x = p[0]; u.y = p[1];
      // path: [[t, x, y], ...]: marks to move between in one take (eased in and out between each pair).
      let pathDir = null;
      if (c.path) {
        const P0 = c.path; let i = 0; while (i < P0.length - 1 && tt >= P0[i + 1][0]) i++;
        const a = P0[i], b = P0[Math.min(P0.length - 1, i + 1)], seg = b[0] - a[0], f = seg > 0 ? smooth((tt - a[0]) / seg) : 1;
        u.x = a[1] + (b[1] - a[1]) * f; u.y = a[2] + (b[2] - a[2]) * f;
        if (seg > 0 && f > 0.02 && f < 0.96 && Math.hypot(b[1] - a[1], b[2] - a[2]) > 4) pathDir = Math.atan2(b[2] - a[2], b[1] - a[1]);
      }
      // hop: [[from, to, height]]: a leap through the air.
      if (c.hop) { u.z = 0; for (const [a, b, h] of c.hop) if (tt >= a && tt <= b) u.z = Math.sin(Math.PI * (tt - a) / (b - a)) * h; }
      const after = m.landT != null && t - m.landT < 1.4 && c.after;
      // Timed actions (the First Cut's films): [at, clip, seconds, fps, loop].
      let act = null; for (const a of c.acts || []) if (tt >= a[0] && tt < a[0] + (a[2] || 1.2)) act = a;
      const clip = act ? act[1] : moving || pathDir != null ? (c.run ? 'Run' : 'Walk') : after ? c.after : c.clip || 'Idle4';
      // slow: slow motion for the cast's clips (the opening's beats play at a third to half speed).
      u.clip = clip; u.frame = act ? (act[4] ? loop(clip, (tt - act[0]) * sl, act[3]) : Math.min(14, Math.floor((tt - act[0]) * sl * (act[3] || 10)))) : D.LOOP[clip] ? loop(clip, t * sl + u.id * 0.3) : Math.min(14, Math.floor((t - (m.landT || 0)) * sl * (D.FPS[clip] || 10)));
      const fid = typeof c.face === 'string' && c.face !== 'cam' ? byId(c.face) : null;
      const look = pathDir != null && !act ? pathDir : fid ? Math.atan2(fid.u.y - u.y, fid.u.x - u.x) : c.face === 'cam' ? TOWARD_CAM : Array.isArray(c.face) ? Math.atan2(c.face[1] - u.y, c.face[0] - u.x) : typeof c.face === 'number' ? c.face : moving ? Math.atan2(c.to[1] - c.at[1], c.to[0] - c.at[0]) : TOWARD_CAM;
      u.ang = look; u.face = Math.cos(look) >= 0 ? 1 : -1;
      // A dash (a path leg faster than a run) leaves afterimages behind, as a dodge does in a fight.
      if (m.px != null && dt > 0) { const vx = (u.x - m.px) / dt, vy = (u.y - m.py) / dt, v = Math.hypot(vx, vy); if (v > 260) { u.state = 'dodge'; u.dodgeDir = [vx / v, vy / v]; } }
      m.px = u.x; m.py = u.y;
      u.flash = Math.max(0, (u.flash || 0) - dt * 5);
      // die: falls at that moment and stays down, then fades (linger: seconds before the body fades).
      if (c.die != null && tt >= c.die) { const dd = tt - c.die; u.state = 'dead'; u.alive = false; u.deadT = dd - (c.linger == null ? 1.4 : c.linger); u.clip = 'Die'; u.frame = Math.min(14, Math.floor(dd * sl * (c.dfps || D.FPS.Die))); }
      else if (c.die != null) u.alive = true;
    }
    // Timed events: [at, event]: the fight's own effects (a 'cut', a 'strike', a 'spawn' from a rift...), or 'pk' (one
    // effect by name), 'flash', 'shake', 'sfx'.
    (sh.ev || []).forEach(([et, e], i) => {
      if (t < et || F.evd[i]) return; F.evd[i] = true;
      const on = e.on ? byId(e.on) : null; if (on) e = Object.assign({}, e, { x: on.u.x + (e.dx || 0), y: on.u.y + (e.dy || 0), id: on.u.id });
      const by = e.by ? byId(e.by) : null; if (by && on) e.ang = Math.atan2(on.u.y - by.u.y, on.u.x - by.u.x);   // which way a blow travels
      // pk: one effect by name; from: seconds into it to start (skips a slow build-up), end: when to cut it, by: turn it the way a blow goes.
      if (e.type === 'pk') R.pk(e.name, e.x, e.y, e.z || 0, e.scale || 1, { t: e.from || 0, end: e.end, soft: e.soft, angle: e.ang != null && e.turn ? R.screenAng(e.ang) : undefined });
      else if (e.type === 'punch') R.punch = Math.max(R.punch || 0, e.n || 0.12);
      else if (e.type === 'hurt') { if (on) on.u.flash = 1; }
      else if (e.type === 'impact') F.impact = { at: t0, dur: e.dur || 0.16, x: e.x, y: e.y };   // an anime impact frame (real seconds)
      else if (e.type === 'flash') { R.flash = Math.max(R.flash || 0, e.a || 0.7); R.flashCol = e.col || '255,255,255'; }
      else if (e.type === 'shake') R.shake = Math.max(R.shake || 0, e.n || 10);
      else if (e.type === 'sfx') sc.cues.push([e.name, e.v || 1]);
      else { s.events = [Object.assign({}, e)]; R.consume(s); s.events = []; }
    });
    const cam = sh.cam || {}, at = cam.at || [0, 0], ck = (sh.cine ? smooth : ease)(k), c2 = lerp2(at, cam.to || at, ck);
    if (cam.follow) {
      const h = F.cast.find((m) => m.c.who === cam.follow || m.c.id === cam.follow);
      if (h) {
        const o0 = cam.off || [0, 0], o1 = cam.offTo || o0, tx = h.u.x + o0[0] + (o1[0] - o0[0]) * ck, ty = h.u.y + o0[1] + (o1[1] - o0[1]) * ck;   // offTo: the framing drifts over the shot
        // A filmed shot trails its subject softly instead of locking onto it.
        if (sh.cine) { if (!F.fc) F.fc = [tx, ty]; const kf = Math.min(1, dt * (cam.lag || 2.2)); F.fc[0] += (tx - F.fc[0]) * kf; F.fc[1] += (ty - F.fc[1]) * kf; c2[0] = F.fc[0]; c2[1] = F.fc[1]; }
        else { c2[0] = tx; c2[1] = ty; }
      }
    }
    if (cam.breathe) { c2[0] += Math.sin(t * 0.7) * cam.breathe; c2[1] += Math.sin(t * 0.53 + 1) * cam.breathe * 0.6; }   // a slow drift, as if held
    // Aim at chest height, not the feet: shift the camera toward the viewer by the lift.
    const lift = cam.lift == null ? 6 : cam.lift, hs = Math.sin(R.HELI.ang), hc = Math.cos(R.HELI.ang);
    R.hcam.x = c2[0] - hs * lift / R.HELI.pitch; R.hcam.y = c2[1] - hc * lift / R.HELI.pitch;
    const z = cam.zoom || [1.3, 1.5]; s.zoom = z[0] + (z[1] - z[0]) * ck;
    // A hit-stop pushes the camera in a little, and it eases back out as the action runs again.
    if (sh.ramp) { const want = (1 - Math.min(1, spd)) * (cam.push == null ? 0.16 : cam.push); F.push = (F.push || 0) + (want - (F.push || 0)) * Math.min(1, (sc.dt || 0.016) * (want > (F.push || 0) ? 9 : 2.5)); s.zoom *= 1 + F.push; }
    // bolts: [{ at, from, to, dur, fx }]: a spell in flight between two points or cast members.
    s.bolts = [];
    for (const b of sh.bolts || []) {
      const f = (t - b.at) / (b.dur || 0.3); if (f < 0 || f > 1) continue;
      const pa = typeof b.from === 'string' ? byId(b.from).u : { x: b.from[0], y: b.from[1] }, pb = typeof b.to === 'string' ? byId(b.to).u : { x: b.to[0], y: b.to[1] };
      const d = b.dur || 0.3; s.bolts.push({ x: pa.x + (pb.x - pa.x) * f, y: pa.y + (pb.y - pa.y) * f, vx: (pb.x - pa.x) / d, vy: (pb.y - pa.y) / d, t: f * d, fx: b.fx || 'fireball_arcane', big: !!b.big, reflected: !!b.reflected, clean: true });
    }
    s.t += dt; R.t = R.t || 0;
    ctx.save(); if (R.shake > 0.5) ctx.translate((Math.random() - 0.5) * R.shake * R.dpr, (Math.random() - 0.5) * R.shake * R.dpr); R.drawFight(ctx, s, dt); ctx.restore();
    if (sh.tint === 'past') { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(150,160,200)'; ctx.fillRect(0, 0, R.W, R.H); ctx.restore(); ctx.fillStyle = 'rgba(20,24,48,0.18)'; ctx.fillRect(0, 0, R.W, R.H); }   // seven hundred years ago: a cold memory
    if (sh.tint === 'red') { ctx.fillStyle = R.rgba(RED, 0.1 + 0.06 * Math.sin(t * 3)); ctx.fillRect(0, 0, R.W, R.H); }
    if (sh.tint === 'dawn') {
      // Dawn: the red drains out under a warm wash, and light breaks over the top of the frame.
      const g = ease(k); ctx.fillStyle = `rgba(40,60,90,${0.35 * g})`; ctx.fillRect(0, 0, R.W, R.H);
      const gr = ctx.createLinearGradient(0, 0, 0, R.H); gr.addColorStop(0, `rgba(255,214,160,${0.7 * g})`); gr.addColorStop(0.5, `rgba(255,170,120,${0.3 * g})`); gr.addColorStop(1, `rgba(255,140,100,${0.08 * g})`);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, 0, R.W, R.H);
      A.tex(ctx, 'light_01', R.W * 0.5, R.H * 0.02, R.W * 1.2, R.H * 0.7, '#fff0d8', 0.8 * g, 0, true); ctx.restore();
    }
    if (sh.cine) cine(ctx, sh, F, k, t);   // (the grade turns on the film's clock: a hit-stop holds it too)
    if (F.impact && t0 - F.impact.at < F.impact.dur) impactFrame(ctx, F, (t0 - F.impact.at) / F.impact.dur);
    if (sh.card) { const kk = (t0 - (sh.card.at || 1.2)) / 0.4; if (kk > 0) nameCard(ctx, sh.card.who, sh.card.also, ease(kk), sh.card.sub); }
    bars(ctx, 1, sh.cine);
    if (sh.cine && sh.fade) { const d = durOf(sh), f = sh.fade, a = Math.max(f[0] ? 1 - t0 / f[0] : 0, f[1] ? (t0 - (d - f[1])) / f[1] : 0); if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; ctx.fillRect(0, 0, R.W, R.H); } }
  };
  // ---- The cinematic grade for filmed shots (the opening, 2026-11-12) ---------------------------------
  // grade: 'silver' (the night before: the white Moon, cold and drained of colour), 'red' (the bleeding night),
  // or { from, to, at, dur } to turn from one to the other on screen. light: { on: a cast member or [x, y], r, col }
  // leaves a pool of light on the subject and lets the rest of the frame fall into dark.
  const GRADE = {
    silver: (ctx, a) => {
      ctx.globalAlpha = a * 0.55; ctx.globalCompositeOperation = 'color'; ctx.fillStyle = '#7e8cab'; ctx.fillRect(0, 0, R.W, R.H);
      ctx.globalAlpha = a; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#b6bdd0'; ctx.fillRect(0, 0, R.W, R.H);
      ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 0, 0, R.H); g.addColorStop(0, 'rgba(150,170,210,0.16)'); g.addColorStop(0.6, 'rgba(150,170,210,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
    },
    red: (ctx, a) => {
      ctx.globalAlpha = a; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#c87c88'; ctx.fillRect(0, 0, R.W, R.H);
      ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 0, 0, R.H); g.addColorStop(0, 'rgba(255,40,70,0.14)'); g.addColorStop(0.7, 'rgba(255,40,70,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
    },
  };
  // The impact frame: the shot in black silhouettes on white with speed lines toward the blow, then the reverse.
  function impactFrame(ctx, F, k) {
    const z = F.s.zoom || 1, sx = (q) => R.W / 2 + (q.x - R.W / 2) * z, sy = (q) => R.H * 0.56 + (q.y - R.H * 0.56) * z;
    const fq = F.impact.x != null ? R.P(F.impact.x, F.impact.y, 24) : { x: R.W / 2, y: R.H / 2 };
    impact(ctx, k, sx(fq), sy(fq), (col) => {
      for (const m of F.cast) {
        const u = m.u; if (u.state === 'dead' && u.deadT > 0.5) continue; if (u.state === 'spawn') continue;
        const q = R.P(u.x, u.y); A.actor(ctx, u.set, u.clip, u.frame, R.screenAng(u.ang), Math.round(sx(q)), Math.round(sy(q)), R.Sh() * (u.scale || 1) * z, { shade: col });
      }
    });
  }
  const rampAt = (rp, t) => { let v = 1; for (const [a, sp] of rp || []) if (t >= a) v = sp; return v; };
  function filmTime(rp, t) {
    if (!rp) return t;
    let ft = 0, last = 0, v = 1;
    for (const [a, sp] of rp) { if (a >= t) break; ft += (a - last) * v; last = a; v = sp; }
    return ft + (t - last) * v;
  }
  const smooth = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * k * (k * (k * 6 - 15) + 10); };
  function onScreen(F, who) {
    // A cast member's chest on screen, through the shot's zoom.
    const m = F.cast.find((mm) => mm.c.who === who || mm.c.id === who); if (!m) return null;
    const q = R.P(m.u.x, m.u.y, 26 * (m.u.scale || 1)), z = F.s.zoom || 1;
    return { x: R.W / 2 + (q.x - R.W / 2) * z, y: R.H * 0.56 + (q.y - R.H * 0.56) * z };
  }
  function cine(ctx, sh, F, k, t) {
    ctx.save();
    const g = sh.grade;
    if (typeof g === 'string') GRADE[g](ctx, 1);
    else if (g) { const m = smooth((t - g.at) / (g.dur || 0.8)); if (m < 1) GRADE[g.from](ctx, 1 - m); ctx.restore(); ctx.save(); if (m > 0) GRADE[g.to](ctx, m); }
    ctx.restore(); ctx.save();
    const L = sh.light;
    if (L) {
      const p = Array.isArray(L.on) ? { x: R.W * L.on[0], y: R.H * L.on[1] } : onScreen(F, L.on) || { x: R.W / 2, y: R.H / 2 }, r = R.H * (L.r || 0.5);
      const gr = ctx.createRadialGradient(p.x, p.y, r * 0.12, p.x, p.y, r); gr.addColorStop(0, 'rgba(3,2,6,0)'); gr.addColorStop(0.55, `rgba(3,2,6,${(L.dark || 0.8) * 0.45})`); gr.addColorStop(1, `rgba(3,2,6,${L.dark || 0.8})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, R.W, R.H);
      if (L.col) { ctx.globalCompositeOperation = 'lighter'; A.tex(ctx, 'light_01', p.x, p.y, r * 1.1, r * 1.1, L.col, L.glow || 0.22, 0, true); }
    }
    ctx.restore(); ctx.save();
    // A soft vignette on every shot.
    const v = ctx.createRadialGradient(R.W / 2, R.H / 2, R.H * 0.35, R.W / 2, R.H / 2, R.W * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, R.W, R.H);
    ctx.restore();
  }

  // ---- playback ------------------------------------------------------------------------------------
  const CUE = { film: [['magic', 0.4]], title: [['clang_1', 0.6]], moonfall: [['charge', 0.8]], clash: [['whoosh', 0.9]], seal: [['charge', 0.8]], spire: [['step_2', 0.5]] };
  const durOf = (sh) => (sh.k === 'anime' ? VS.OPEN.dur : Math.max(sh.d || 2.4, sh.say ? 1.6 + sh.say.length * 0.05 : 0));
  T.durOf = durOf; T.kinds = () => Object.keys(SHOT).concat(['anime']);
  T.start = function (def) { const sc = { def, i: 0, t: 0, done: false, cues: [] }; enter(sc); return sc; };
  function enter(sc) { const sh = sc.def.shots[sc.i]; if (!sh) { sc.done = true; return; } sc.t = 0; sc.cues.push(...(CUE[sh.k] || [])); sc.hitCued = false; }
  T.update = function (sc, dt, inp) {
    if (sc.done) return; if (inp.back) { sc.done = true; sc.skipped = true; return; }
    const sh = sc.def.shots[sc.i], t0 = sc.t; sc.t += dt; sc.dt = dt; const d = durOf(sh);
    // The anime opening: its own sound cues, and a tap jumps to its next beat rather than past it.
    if (sh.k === 'anime') { sc.cues.push(...VS.OPEN.cues(t0, sc.t)); if (inp.tap && sc.t > 0.35) { sc.t = VS.OPEN.next(sc.t); if (sc.t >= d) { sc.i++; enter(sc); } return; } }
    if ((sh.k === 'clash' || sh.k === 'moonfall' || sh.k === 'seal') && !sc.hitCued && sc.t / d > ({ clash: 0.45, moonfall: 0.62, seal: 0.58 })[sh.k]) { sc.hitCued = true; sc.cues.push(['blow_big', 1], ['clang_1', 0.8], ['quake', 0.6]); }
    if (sc.t >= d || (inp.tap && sc.t > 0.35)) { sc.i++; enter(sc); }
  };
  T.draw = function (ctx, sc) {
    const sh = sc.def.shots[Math.min(sc.i, sc.def.shots.length - 1)]; if (!sh) return;
    const k = Math.min(1, sc.t / durOf(sh));
    if (sh.k === 'anime') {
      VS.OPEN.draw(ctx, sc.t, (sp('hero') || {}).set || 'gothic_knight_b');
      if (sc.t > 0.6 && !R.noSkipHint) R.label(ctx, R.touch ? 'TAP TO SKIP AHEAD  ·  SKIP ›' : 'CLICK TO SKIP AHEAD  ·  ESC SKIPS', R.W - 18 * R.k, 16 * R.k, 9 * R.k, 'rgba(220,210,214,0.4)', 'right', 2, 500);
      return;
    }
    ctx.save(); ctx.imageSmoothingEnabled = false; SHOT[sh.k](ctx, sh, k, sc.t, sc); ctx.restore();
    caption(ctx, sh, sc.t);
    if (sh.cine) { if (sc.t > 0.6 && !R.noSkipHint && sc.def.hint !== false) R.label(ctx, R.touch ? 'SKIP ›' : 'ESC SKIPS', R.W - 18 * R.k, R.H * 0.058, 9 * R.k, 'rgba(220,210,214,0.28)', 'right', 2, 500); return; }
    if (sc.t > 0.6 && !R.noSkipHint) R.label(ctx, R.touch ? 'TAP TO CONTINUE  ·  SKIP ›' : 'CLICK TO CONTINUE  ·  ESC SKIPS', R.W - 18 * R.k, 16 * R.k, 9 * R.k, 'rgba(220,210,214,0.4)', 'right', 2, 500);
  };
})();
