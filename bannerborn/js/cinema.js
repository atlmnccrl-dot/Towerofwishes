// Bannerborn — cutscenes. A cutscene is a list of shots on its own canvas:
//   scene   — a real map with scripted actors, the camera flying between keyframes, effects on cue
//   closeup — an extreme pixel close-up of one face in a slanted panel, speed lines, light streaks
//   split   — two faces in diagonal panels, facing off
//   impact  — anime impact frames: inverted silhouettes, radial lines, flashing black/white
//   title   — a word slammed onto the screen with sparks
// plus letterbox, shake, flashes, lightning and screen-space sparks over everything. Tap Skip to leave.
(function () {
  const BB = window.BB;
  const CV = () => document.getElementById('cineCv');
  const C = BB.Cinema = { on: false };
  const ease = (k) => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  // ---------------------------------------------------------------- actors: who appears, drawn how
  // an actor is { hero } (paper-doll or recruit) or { foe: kind } (fixed art, maybe tinted)
  function actorArt(a) {
    if (a.hero) return { layers: BB.heroLayers(a.hero) };
    const F = BB.FOES[a.foe]; const key = F.art || (F.poolPick ? 'h/' + F.poolPick : null);
    return { key, tint: F.tint || '' };
  }
  function drawActor(g, a, clip, dir, fr, x, y, sc, opts) {
    const art = a._art || (a._art = actorArt(a));
    if (art.layers) BB.drawLayers(g, art.layers, clip, dir, fr, x, y, sc, Object.assign({ noSlash: true }, opts || {}));
    else if (art.key) BB.drawChar(g, art.key, art.tint, clip, dir, fr, x, y, sc, opts && opts.flash);
  }
  // how far above the feet the face sits, read from the frame itself (frames are trimmed; FOOT_Y is 90)
  function headLift(a, clip, dir, fr) {
    const art = a._art || (a._art = actorArt(a)), keys = art.layers ? art.layers.map((L) => L.key) : [art.key];
    let top = 90;
    for (const k of keys) { const A = BB.A.chars[k]; if (!A) continue; const c = BB.resolveClip(k, clip), n = A.meta.clips[c]; if (!n) continue; const r = A.meta.f[c][dir * n + Math.min(n - 1, fr)]; if (r && r[2] > 1) top = Math.min(top, r[5]); }
    return Math.max(10, 90 - top - 7);
  }
  const clipLen = (a, clip) => { const art = a._art || (a._art = actorArt(a)); return BB.clipLen(art.layers ? art.layers[0].key : art.key, clip) || 15; };
  const silCache = {};
  function silhouette(a, clip, dir, fr, sc, col) { // the actor as a flat cut-out
    const S = Math.ceil(128 * sc), k = S + col; let c = silCache[k];
    if (!c) { c = silCache[k] = document.createElement('canvas'); c.width = S; c.height = S; }
    const x = c.getContext('2d'); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, S, S); x.imageSmoothingEnabled = false;
    drawActor(x, a, clip, dir, fr, S / 2, 90 * sc, sc);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, S, S);
    return c;
  }

  // ---------------------------------------------------------------- screen-space effects
  function speedLines(g, cx, cy, W, H, n, col, seed, inner) {
    g.save(); g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const r = Math.sin((i + seed) * 91.7) * 0.5 + 0.5, a = (i / n) * Math.PI * 2 + r * 0.05, w = 0.004 + r * 0.012;
      const r0 = Math.max(W, H) * (inner + r * 0.18), r1 = Math.max(W, H) * 1.2;
      g.beginPath(); g.moveTo(cx + Math.cos(a - w) * r1, cy + Math.sin(a - w) * r1); g.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a + w) * r1, cy + Math.sin(a + w) * r1); g.fill();
    }
    g.restore();
  }
  function lightning(g, x, y0, y1, w, col, seed) {
    let x0 = x; g.save(); g.strokeStyle = col; g.lineWidth = w; g.shadowColor = col; g.shadowBlur = w * 6; g.beginPath(); g.moveTo(x0, y0);
    const n = 12; for (let i = 1; i <= n; i++) { x0 += (Math.sin(seed * 13 + i * 7.1) * 0.5) * w * 14; g.lineTo(x0, y0 + (y1 - y0) * i / n); }
    g.stroke(); g.restore();
  }
  function sparks(n, x, y, col, spd, up) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random()); C.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (up || 0), t: 0, life: 0.5 + Math.random() * 0.8, col, r: 1 + Math.random() * 2.5 }); }
  }
  function embers(W, H, col, n) { for (let i = 0; i < n; i++) C.parts.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 120, t: 0, life: 2 + Math.random() * 2, col, r: 1 + Math.random() * 2, drift: true }); }

  // ---------------------------------------------------------------- shot renderers
  // a slanted panel; returns the panel polygon so callers can clip to it
  function panelPath(g, x0, y0, x1, y1, slant) { g.beginPath(); g.moveTo(x0 + slant, y0); g.lineTo(x1 + slant, y0); g.lineTo(x1 - slant, y1); g.lineTo(x0 - slant, y1); g.closePath(); }
  function closeupBody(g, a, k, t, cx, cy, ph, dir, flip, col1, col2, fromX) {
    // background: a colour wash, speed lines, a streak of light
    const W = g.canvas.width;
    const bg = g.createLinearGradient(0, cy - ph, 0, cy + ph); bg.addColorStop(0, col2); bg.addColorStop(0.5, col1); bg.addColorStop(1, col2);
    g.fillStyle = bg; g.fillRect(-W, cy - ph, W * 3, ph * 2);
    speedLines(g, cx, cy, W, ph * 2, 70, 'rgba(255,255,255,0.10)', Math.floor(t * 12), 0.15);
    const sx = lerp(-W * 0.2, W * 1.2, (t * 0.7) % 1);
    const st = g.createLinearGradient(sx - 200, 0, sx + 200, 0); st.addColorStop(0, 'rgba(255,255,255,0)'); st.addColorStop(0.5, 'rgba(255,255,255,0.18)'); st.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = st; g.fillRect(sx - 200, cy - ph, 400, ph * 2);
    // the face: a whole-number scale so the pixels stay square; the head sits on the focal point
    const S = Math.max(4, Math.round(ph * 1.15 / 14)), slide = (1 - easeOut(clamp01(k * 3))) * fromX;
    const clip = 'Idle', fr = Math.floor(t * 8) % clipLen(a, clip), lift = headLift(a, clip, dir, fr);
    g.save(); g.imageSmoothingEnabled = false;
    if (flip) { g.translate(cx * 2, 0); g.scale(-1, 1); }
    const push = 1 + k * 0.06;
    g.translate(cx + slide * (flip ? -1 : 1), cy); g.scale(push, push);
    drawActor(g, a, clip, dir, fr, 0, lift * S, S);
    g.restore();
  }
  function drawCloseup(g, W, H, sh, k, t) {
    const ph = H * 0.3, cy = H * 0.5;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.save(); panelPath(g, -40, cy - ph, W + 40, cy + ph, W * 0.03); g.clip();
    closeupBody(g, sh.who, k, t, W * (sh.x || 0.5), cy, ph, sh.dir === undefined ? 2 : sh.dir, false, sh.col1, sh.col2, W * 0.3 * (sh.from || 1));
    g.restore();
    g.strokeStyle = sh.edge || 'rgba(255,255,255,0.85)'; g.lineWidth = 3; panelPath(g, -40, cy - ph, W + 40, cy + ph, W * 0.03); g.stroke();
    if (sh.label) titleText(g, sh.label, W * 0.07, cy + ph - 24, Math.round(H * 0.035), k, 'left', sh.edge || '#fff', true);
  }
  function drawSplit(g, W, H, sh, k, t) {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const sl = W * 0.08;
    // left: the hero; right: the foe
    g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2 + sl, 0); g.lineTo(W / 2 - sl, H); g.lineTo(0, H); g.closePath(); g.clip();
    closeupBody(g, sh.a, k, t, W * 0.27, H * 0.5, H * 0.42, 1, false, sh.colA[0], sh.colA[1], -W * 0.25);
    g.restore();
    g.save(); g.beginPath(); g.moveTo(W / 2 + sl, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W / 2 - sl, H); g.closePath(); g.clip();
    closeupBody(g, sh.b, k, t, W * 0.73, H * 0.5, H * 0.42, 3, false, sh.colB[0], sh.colB[1], W * 0.25);
    g.restore();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 20; g.beginPath(); g.moveTo(W / 2 + sl, -10); g.lineTo(W / 2 - sl, H + 10); g.stroke(); g.shadowBlur = 0;
    if (k > 0.35) titleText(g, 'VS', W / 2, H * 0.56, Math.round(H * 0.16), clamp01((k - 0.35) * 4), 'center', '#fff');
  }
  function drawImpact(g, W, H, sh, k, t) {
    const inv = Math.floor(t / 0.06) % 2 === 1;
    g.fillStyle = inv ? '#f4f1ea' : '#050505'; g.fillRect(0, 0, W, H);
    speedLines(g, W / 2, H * 0.5, W, H, 90, inv ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)', Math.floor(t * 20), 0.05);
    const list = sh.who2 ? [[sh.who, W * 0.32, 1], [sh.who2, W * 0.68, 3]] : [[sh.who, W / 2, sh.dir === undefined ? 2 : sh.dir]];
    for (const [a, x, dir] of list) {
      const S = Math.max(3, Math.round(H * 0.85 / 60)), clip = sh.clip || 'Attack1';
      const fr = Math.min(clipLen(a, clip) - 1, Math.floor(clipLen(a, clip) * 0.6));
      const sv = silhouette(a, clip, dir, fr, S, inv ? '#050505' : '#ffffff');
      const z = 1 + (1 - k) * 0.15;
      g.save(); g.translate(x, H * 0.62); g.scale(z, z); g.drawImage(sv, -64 * S, -90 * S); g.restore();
    }
    if (sh.accent) { g.fillStyle = sh.accent; g.globalAlpha = 0.85; g.fillRect(0, H * 0.48, W, H * 0.02); g.globalAlpha = 1; }
  }
  function titleText(g, s, x, y, size, k, align, col, small) {
    g.save();
    const z = small ? 1 : lerp(2.4, 1, easeOut(clamp01(k * 5)));
    g.translate(x, y); g.scale(z, z);
    g.font = (small ? 700 : 900) + ' ' + size + 'px Outfit, sans-serif'; g.textAlign = align; g.textBaseline = 'middle';
    g.letterSpacing = (small ? size * 0.2 : size * 0.12) + 'px';
    g.globalAlpha = small ? clamp01(k * 4) : clamp01(k * 8);
    if (!small) for (let i = 3; i >= 1; i--) { g.globalAlpha = clamp01(k * 8) * 0.12; g.fillStyle = col; g.fillText(s, -i * 10 * (1 - clamp01(k * 4)), 0); }
    g.globalAlpha = small ? clamp01(k * 4) : clamp01(k * 8);
    g.shadowColor = col; g.shadowBlur = small ? 10 : 30; g.fillStyle = small ? col : '#fff'; g.fillText(s, 0, 0);
    if (!small) { g.shadowBlur = 0; g.strokeStyle = col; g.lineWidth = 2; g.strokeText(s, 0, 0); }
    g.restore();
  }
  function drawTitle(g, W, H, sh, k, t) {
    if (!sh.over) { const bg = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7); bg.addColorStop(0, sh.bg || '#1a1208'); bg.addColorStop(1, '#000'); g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    else { g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 0, W, H); }
    if (k < 0.35) speedLines(g, W / 2, H / 2, W, H, 60, 'rgba(255,255,255,' + (0.25 * (1 - k / 0.35)) + ')', 3, 0.2);
    const fl = g.createLinearGradient(0, 0, W, 0); fl.addColorStop(0, 'rgba(255,255,255,0)'); fl.addColorStop(0.5, sh.col || '#ffbe55'); fl.addColorStop(1, 'rgba(255,255,255,0)');
    const lw = W * 0.6 * easeOut(clamp01((k - 0.08) * 3));
    g.fillStyle = fl; g.fillRect(W / 2 - lw / 2, H * 0.5 + H * 0.085, lw, 3);
    if (sh.sup) titleText(g, sh.sup, W / 2, H * 0.37, Math.round(H * 0.03), clamp01((k - 0.05) * 2), 'center', sh.col || '#ffbe55', true);
    titleText(g, sh.text, W / 2, H * 0.5, Math.round(H * (sh.size || 0.12)), k, 'center', sh.col || '#ffbe55');
    if (sh.sub) titleText(g, sh.sub, W / 2, H * 0.64, Math.round(H * 0.032), clamp01((k - 0.25) * 2), 'center', '#c8d0dc', true);
  }
  function drawScene(g, W, H, sh, k, t, dt, dpr) {
    const sc = C.scene; if (!sc) return;
    const ks = sh.cam, n = ks.length - 1, kk = ease(k) * n, i = Math.min(n - 1, Math.floor(kk)), f = kk - i;
    const A = ks[i], B = ks[Math.min(n, i + 1)];
    const base = Math.min(W / dpr / (10.5 * BB.TW), H / dpr / (8.5 * BB.TH));
    sc.cam.x = lerp(A.x, B.x, f); sc.cam.y = lerp(A.y, B.y, f); sc.cam.zoom = base * lerp(A.z, B.z, f);
    // scripted actors walk to their marks
    for (const e of sc.ents) if (e.goTo && !e.dead) {
      const dx = e.goTo.x - e.x, dy = e.goTo.y - e.y, d = Math.hypot(dx, dy), step = (e.goTo.spd || 2.4) * dt;
      if (d <= step) { e.x = e.goTo.x; e.y = e.goTo.y; const then = e.goTo.then; e.goTo = null; sc.setClip(e, then || 'Idle', true); if (then && then.startsWith('Attack')) e.loopAtk = then; }
      else { e.x += dx / d * step; e.y += dy / d * step; sc.face(e, e.x + dx, e.y + dy); if (e.clip !== 'Run') sc.setClip(e, 'Run', true); }
    }
    for (const e of sc.ents) if (e.loopAtk && !e.dead && e.ct > 0.75) sc.setClip(e, e.loopAtk, true); // keep swinging
    sc.update(dt, null);
    sc.render(g, W, H, dpr);
    // banners on their poles, in the world; a falling one tips over from its base
    if (C.banners && C.banners.length && sc.view) {
      const v = sc.view; g.setTransform(v.z, 0, 0, v.z, v.ox, v.oy);
      for (const b of C.banners.slice().sort((p, q) => (p.x + p.y) - (q.x + q.y))) {
        if (b.fallT !== undefined) b.fallT += dt;
        const ang = b.fallT !== undefined ? Math.min(1, b.fallT / 0.9) ** 2 * 1.45 * b.side : 0;
        if (!b.cv) { b.cv = document.createElement('canvas'); b.cv.width = 100; b.cv.height = 140; }
        BB.UI.drawBanner(b.cv.getContext('2d'), b, 100, 140, C.t + b.x);
        const p = BB.iso(b.x, b.y);
        g.save(); g.translate(p.x, p.y); g.rotate(ang); g.globalAlpha = b.fallT !== undefined ? Math.max(0.35, 1 - b.fallT * 0.25) : 1; g.drawImage(b.cv, -5, -42, 28, 40); g.restore();
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (sh.tint) { g.fillStyle = sh.tint; g.fillRect(0, 0, W, H); }
    if (sh.tintFrom) { const a = sh.tintFrom, b = sh.tintTo || a, q = clamp01(t / (sh.tintIn || sh.dur)); g.fillStyle = 'rgba(' + [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], q))).join(',') + ',' + lerp(a[3], b[3], q) + ')'; g.fillRect(0, 0, W, H); }
  }

  // ---------------------------------------------------------------- the player
  C.play = async function (name, opts, done) {
    const build = SCENES[name]; if (!build) { done && done(); return; }
    const el = document.getElementById('cine'); el.classList.add('on');
    Object.assign(C, { on: true, loading: true, t: 0, done, parts: [], shake: 0, flash: 0, flashCol: '#fff', bolts: [], cued: {}, scene: null, shots: [], banners: [] });
    try { const def = await build(opts || {}); C.shots = def.shots; C.scene = def.scene || null; C.total = C.shots.reduce((a, s) => a + s.dur, 0); }
    catch (e) { console.warn('cutscene skipped', e); C.end(); return; }
    C.loading = false;
    BB.music(opts.music || 'boss');
  };
  C.end = function () {
    if (!C.on) return;
    C.on = false; document.getElementById('cine').classList.remove('on');
    const d = C.done; C.done = null; C.scene = null; d && d();
  };
  C.render = function (dt) {
    const cv = CV(); if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr); if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);
    if (C.loading) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H); return; }
    C.t += dt;
    if (C.t >= C.total) { C.end(); return; }
    // the current shot, and its cues (sounds, shakes, flashes, sparks) fired once
    let acc = 0, sh = C.shots[0], si = 0;
    for (let i = 0; i < C.shots.length; i++) { if (C.t < acc + C.shots[i].dur) { sh = C.shots[i]; si = i; break; } acc += C.shots[i].dur; }
    const lt = C.t - acc, k = clamp01(lt / sh.dur);
    for (const cue of sh.cues || []) { const id = si + ':' + cue[0]; if (!C.cued[id] && lt >= cue[0]) { C.cued[id] = 1; cue[1]({ W, H, dpr }); } }
    g.save();
    if (C.shake > 0) { C.shake = Math.max(0, C.shake - dt * 1.6); g.translate((Math.random() - 0.5) * C.shake * 40 * dpr, (Math.random() - 0.5) * C.shake * 30 * dpr); }
    g.imageSmoothingEnabled = false;
    if (sh.kind === 'scene') drawScene(g, W, H, sh, k, lt, dt, dpr);
    else if (sh.kind === 'closeup') drawCloseup(g, W, H, sh, k, lt);
    else if (sh.kind === 'split') drawSplit(g, W, H, sh, k, lt);
    else if (sh.kind === 'impact') drawImpact(g, W, H, sh, k, lt);
    else if (sh.kind === 'title') { if (sh.over && C.scene) drawScene(g, W, H, Object.assign({}, sh, { cam: sh.cam }), k, lt, dt, dpr); drawTitle(g, W, H, sh, k, lt); }
    g.restore();
    g.setTransform(1, 0, 0, 1, 0, 0);
    // lightning
    for (const b of C.bolts) { b.t += dt; if (b.t < 0.18) lightning(g, b.x * W, 0, b.y * H, 3 * dpr, '#e8f4ff', b.seed); }
    C.bolts = C.bolts.filter((b) => b.t < 0.2);
    // sparks and embers, screen space
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of C.parts) { p.t += dt; p.x += p.vx * dt * dpr; p.y += p.vy * dt * dpr; if (!p.drift) p.vy += 220 * dt; else p.vx += Math.sin(p.t * 3 + p.y) * 10 * dt; const a = Math.max(0, 1 - p.t / p.life); g.globalAlpha = a; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r * dpr, 0, 7); g.fill(); }
    g.restore(); C.parts = C.parts.filter((p) => p.t < p.life);
    // fades from and to black
    if (sh.fadeIn && lt < sh.fadeIn) { g.fillStyle = 'rgba(0,0,0,' + (1 - lt / sh.fadeIn) + ')'; g.fillRect(0, 0, W, H); }
    if (sh.fadeOut && lt > sh.dur - sh.fadeOut) { g.fillStyle = 'rgba(0,0,0,' + clamp01((lt - (sh.dur - sh.fadeOut)) / sh.fadeOut) + ')'; g.fillRect(0, 0, W, H); }
    // vignette, letterbox, flash
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    const lb = H * 0.11; g.fillStyle = '#000'; g.fillRect(0, 0, W, lb); g.fillRect(0, H - lb, W, lb);
    if (C.flash > 0) { g.globalAlpha = Math.min(1, C.flash); g.fillStyle = C.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; C.flash = Math.max(0, C.flash - dt * 3); }
    // the subtitle: one line in the lower bar, in and out with its shot
    if (sh.caption) {
      const c0 = sh.capAt || 0.3, c1 = sh.capEnd || sh.dur - 0.25;
      const a = clamp01(Math.min((lt - c0) / 0.45, (c1 - lt) / 0.4));
      if (a > 0) {
        g.globalAlpha = a; g.font = 'italic 500 ' + Math.round(Math.max(14, H * 0.034)) + 'px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#eef1f6'; g.shadowColor = 'rgba(0,0,0,0.9)'; g.shadowBlur = 8; g.fillText(sh.caption, W / 2, H - lb / 2 + (1 - a) * 6); g.shadowBlur = 0; g.globalAlpha = 1;
      }
    }
  };
  // cue helpers
  const SFX = (n) => () => BB.sfx(n);
  const SHAKE = (v) => () => { C.shake = Math.max(C.shake, v); };
  const FLASH = (v, col) => () => { C.flash = v; C.flashCol = col || '#fff'; };
  const BOLT = () => () => { C.bolts.push({ x: 0.2 + Math.random() * 0.6, y: 0.5 + Math.random() * 0.3, t: 0, seed: Math.random() * 99 }); C.flash = 0.35; C.flashCol = '#cfe6ff'; BB.sfx('slam'); };
  const SPARKS = (n, col, fx, fy, spd) => (o) => sparks(n, o.W * (fx || 0.5), o.H * (fy || 0.5), col, (spd || 500) * o.dpr, 0);
  const EMBERS = (n, col) => (o) => embers(o.W, o.H, col, n);
  const MUSIC = (m) => () => BB.music(m);

  // a stage set: a map, some actors
  async function stage(layout, biome, night, seed, cast, villagers) {
    const keys = new Set();
    const npc = villagers ? BB.npcKeys().slice(0, villagers) : [];
    npc.forEach((k) => keys.add(k));
    for (const c of cast) { const art = actorArt(c.who || c); if (art.key) keys.add(art.key); }
    await Promise.all([BB.loadEnv(biome), BB.loadEnv('vale'), BB.loadEnv('ground'), BB.loadOther()].concat([...keys].map((k) => BB.loadChar(k).catch(() => null))));
    const map = BB.buildMap(layout, biome, seed, { night });
    BB.renderGround(map);
    const sc = new BB.Battle({ map, heroes: [], peaceful: true, save: BB.save, seed: 5 });
    sc.noBars = true;
    sc.npcs = npc.filter((k) => BB.A.chars[k]).map((art, i) => { const x = map.w / 2 - 5 + i * 2.2, y = map.h / 2 + 2 + (i % 2) * 1.5; return { x, y, home: { x, y }, art, clip: 'Idle', dir: 2, ct: i, walker: true, wait: 0.5 + i * 0.7 }; });
    return sc;
  }
  function place(sc, who, x, y, dir, opts) {
    opts = opts || {};
    let e;
    if (who.hero) { e = sc.spawnHero(who.hero, BB.heroStats(who.hero), x, y); }
    else { e = sc.spawnFoe(who.foe, x, y, { rise: !!opts.rise }); }
    e.scripted = true; e.dir = dir; sc.setClip(e, opts.clip || 'Idle', true);
    if (opts.scale) e.sc = opts.scale;
    return e;
  }
  const leader = () => (BB.UI && BB.UI.leader ? BB.UI.leader() : BB.save.heroes[0]);

  // ---------------------------------------------------------------- the cutscenes
  const SCENES = {
    // a new game: what the nine banners were, how they fell, and why one is left
    async intro() {
      const cap = { hero: leader() }, vesh = { foe: 'vesh' }, ghoul = { foe: 'ghoul' }, skel = { foe: 'warden' };
      const knights = BB.ROSTER.filter((c) => c.role === 'hero' && (c.arch === 'knight' || c.arch === 'spearman')).slice(0, 4)
        .map((c) => ({ hero: BB.newHero({ calling: c.calling, recruit: c.key, name: c.name }) }));
      await Promise.all(knights.map((k) => BB.loadChar('h/' + k.hero.recruit).catch(() => null)));
      const sc = await stage('village', 'vale', false, 9, [cap, vesh, ghoul, skel], 4);
      const m = sc.map, c = m.w / 2;
      // nine banners on the ridge; the ninth is yours
      const cols = BB.BANNER_COLORS.concat(['#3a6a8a']), sig = BB.SIGILS;
      for (let i = 0; i < 9; i++) {
        const mine = i === 8, bx = c - 4.6 + i * 1.15, by = c - 2.2 + i * 0.05;
        C.banners.push(Object.assign({ x: bx, y: by, side: i % 2 ? 1 : -1 }, mine ? BB.save.banner : { color: cols[i], sigil: sig[i % sig.length], trim: '#e8c66a' }));
      }
      const gateAt = { x: c + 6, y: c - 6 };
      const kn = knights.map((k, i) => place(sc, k, C.banners[1 + i * 2].x + 0.3, C.banners[1 + i * 2].y + 1.1, 1));
      const captain = place(sc, cap, C.banners[8].x + 0.5, C.banners[8].y + 1.0, 1, { clip: 'CrouchIdle' });
      const dead = [];
      const raise = (n, cx, cy, spread) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = Math.random() * spread; dead.push(place(sc, Math.random() < 0.2 ? skel : ghoul, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5, { rise: true })); } };
      const march = (spd) => dead.forEach((d, i) => { if (d.dead) return; const t = C.banners[i % 9]; d.goTo = { x: t.x + (Math.random() - 0.5) * 1.2, y: t.y + 1.6 + Math.random() * 1.5, spd: spd * (0.8 + Math.random() * 0.4), then: 'Attack1' }; });
      const fall = (i) => () => { const b = C.banners[i]; if (b && b.fallT === undefined) { b.fallT = 0; BB.sfx('slam'); } };
      const slay = (k) => () => { if (k && !k.dead) { k.dead = true; k.deadT = 0; sc.setClip(k, 'Die', true); } };
      const dusk = [70, 34, 10, 0.16], dark = [14, 22, 50, 0.34], ash = [64, 46, 44, 0.24];
      return { scene: sc, shots: [
        { kind: 'scene', dur: 7, fadeIn: 1.2, cam: [{ x: c - 7, y: c + 2, z: 1.05 }, { x: c - 1.2, y: c - 1.4, z: 1.25 }], tintFrom: dusk, tintTo: dusk,
          caption: 'For three hundred years, nine banners kept the dead in their graves.', capAt: 0.9, cues: [[0, MUSIC('calm')]] },
        { kind: 'scene', dur: 6.5, cam: [{ x: c - 1.2, y: c - 1.4, z: 1.25 }, { x: gateAt.x - 2, y: gateAt.y + 2, z: 1.35 }], tintFrom: dusk, tintTo: dark, tintIn: 2.2,
          caption: 'Then, one night, the Gravegates opened.', capAt: 2.2, cues: [
            [1.6, () => { sc.npcs = []; }], [2.4, BOLT()], [3.2, () => { const gt = sc.spawnFoe('portal', gateAt.x, gateAt.y, { rise: true }); gt.scripted = true; SHAKE(0.5)(); BB.sfx('portal'); MUSIC('boss')(); }], [4.8, BOLT()]] },
        { kind: 'scene', dur: 4.5, cam: [{ x: gateAt.x - 1.5, y: gateAt.y + 1.5, z: 1.7 }, { x: gateAt.x - 0.8, y: gateAt.y + 0.8, z: 2.1 }], tintFrom: dark,
          caption: 'Out of the first one walked Vesh Morrow, the Bone Cantor.', capAt: 0.8, cues: [
            [0.4, () => { const v = place(sc, vesh, gateAt.x - 0.4, gateAt.y + 0.6, 2, { rise: true, scale: 2.1 }); C.vesh = v; BB.sfx('charge'); }], [2.4, () => { if (C.vesh) sc.setClip(C.vesh, 'Taunt', true); SHAKE(0.4)(); BB.sfx('boss'); }]] },
        { kind: 'closeup', dur: 2.4, who: vesh, dir: 2, col1: 'rgba(40,120,70,1)', col2: 'rgba(4,16,10,1)', edge: '#7dffb0', caption: 'He sang —', capAt: 0.6, cues: [[0, SFX('charge')], [0.3, EMBERS(40, '#7dffb0')]] },
        { kind: 'impact', dur: 0.4, who: vesh, clip: 'Attack1', accent: '#7dffb0', cues: [[0, SHAKE(0.8)], [0, SFX('burst')], [0, FLASH(0.6, '#c8ffe0')]] },
        { kind: 'scene', dur: 6, cam: [{ x: c + 3.5, y: c - 2.5, z: 1.45 }, { x: c + 1, y: c - 1, z: 1.3 }], tintFrom: dark,
          caption: '— and the dead rose to listen.', capAt: 0.6, cues: [
            [0.2, () => raise(6, gateAt.x - 1, gateAt.y + 2, 2.5)], [1.2, () => raise(6, c + 4, c + 1, 3)], [2.2, () => raise(5, c + 1, c - 6, 2.5)], [3.0, () => march(1.6)], [3.6, BOLT()]] },
        { kind: 'scene', dur: 7.5, cam: [{ x: C.banners[1].x + 0.4, y: C.banners[1].y + 0.6, z: 2.0 }, { x: C.banners[7].x + 0.4, y: C.banners[7].y + 0.6, z: 2.0 }], tintFrom: dark,
          caption: 'Eight banners fell before dawn.', capAt: 4.4, capEnd: 7.3, cues: [
            [0.1, () => kn.forEach((k) => { k.loopAtk = 'Attack1'; sc.setClip(k, 'Attack1', true); })], [0.2, () => march(2.4)],
            [1.2, fall(0)], [1.8, slay(kn[0])], [2.0, fall(1)], [2.6, fall(2)], [3.1, slay(kn[1])], [3.3, fall(3)], [3.9, fall(4)], [4.4, slay(kn[2])], [4.6, fall(5)], [5.2, fall(6)], [5.7, slay(kn[3])], [5.9, fall(7)], [6.3, SHAKE(0.3)]] },
        { kind: 'scene', dur: 5, cam: [{ x: C.banners[8].x, y: C.banners[8].y + 0.9, z: 2.0 }, { x: C.banners[8].x + 0.2, y: C.banners[8].y + 0.7, z: 2.5 }], tintFrom: dark, tintTo: ash, tintIn: 2.5,
          caption: 'One banner still stood. Its bearer had no army left.', capAt: 0.8, cues: [
            [0.2, () => dead.forEach((d) => { if (!d.dead) d.goTo = { x: captain.x + (Math.random() - 0.5) * 3.5, y: captain.y + 1.6 + Math.random() * 1.6, spd: 1.1, then: 'Idle' }; })]] },
        { kind: 'closeup', dur: 2.3, who: cap, dir: 1, col1: 'rgba(200,110,30,1)', col2: 'rgba(30,12,4,1)', edge: '#ffbe55', from: -1, cues: [[0.1, EMBERS(50, '#ffb347')], [1.4, SFX('charge')]] },
        { kind: 'impact', dur: 0.4, who: cap, clip: 'Taunt', accent: '#ffbe55', cues: [[0, SHAKE(0.8)], [0, SFX('slam')], [0, FLASH(0.8)]] },
        { kind: 'scene', dur: 4.5, cam: [{ x: C.banners[8].x, y: C.banners[8].y + 1.2, z: 2.3 }, { x: C.banners[8].x, y: C.banners[8].y + 1.4, z: 1.6 }], tintFrom: ash, tintTo: [60, 40, 10, 0.12], tintIn: 1.5, fadeOut: 0.8,
          caption: 'So the Captain raised it, and swore to build a new one.', capAt: 0.9, capEnd: 3.8, cues: [
            [0, () => { sc.setClip(captain, 'Taunt', true); sc.addFx('aoe', captain.x, captain.y, { sc: 1.4, ground: true, add: true, hue: 30, fps: 22 }); sc.addFx('levelup', captain.x, captain.y, { sc: 1.2, add: true }); BB.sfx('rally'); }],
            [0.15, () => dead.forEach((d) => { if (d.dead) return; const dx = d.x - captain.x, dy = d.y - captain.y, l = Math.hypot(dx, dy) || 1; if (l < 6) { d.goTo = { x: d.x + dx / l * 2.5, y: d.y + dy / l * 2.5, spd: 9, then: 'Idle' }; setTimeout(() => { d.dead = true; d.deadT = 0; sc.setClip(d, 'Die', true); }, 250 + Math.random() * 300); } })],
            [0.2, SHAKE(0.6)], [0.25, SPARKS(90, '#ffcf7a', 0.5, 0.55, 600)], [1.2, EMBERS(40, '#ffb347')]] },
        { kind: 'title', dur: 3.6, text: 'BANNERBORN', sub: 'Raise your banner. Earn your heroes. Shut the Gravegates.', size: 0.13, col: '#ffbe55', bg: '#1d1206', fadeOut: 0.6,
          cues: [[0, SFX('burst')], [0, SHAKE(0.5)], [0.02, SPARKS(120, '#ffcf7a', 0.5, 0.5, 700)], [0.05, EMBERS(60, '#ffb347')], [0, MUSIC('calm')]] },
      ] };
    },
    // before a boss: the camera finds them, they rise, a close-up, impact, the name, the face-off
    async boss(o) {
      const M = o.stage, F = BB.FOES[M.boss], R = BB.REGIONS.find((r) => r.id === M.region) || BB.REGIONS[0];
      const boss = { foe: M.boss }, hero = { hero: leader() }, grunt = { foe: M.waves && M.waves[0] ? M.waves[0][0] : 'ghoul' };
      const sc = await stage(M.layout, R.biome, !!R.night, BB.hashStr(M.id) % 999, [boss, hero, grunt]);
      const m = sc.map, b = m.bossSpot, h = m.heroSpawn;
      place(sc, hero, h.x, h.y, 7);
      const name = F.name.split(',')[0].toUpperCase(), epi = (F.name.split(',')[1] || '').trim().toUpperCase();
      const red = M.boss === 'vesh' ? ['rgba(40,130,80,1)', 'rgba(4,16,10,1)', '#7dffb0'] : M.boss === 'regent' ? ['rgba(90,70,160,1)', 'rgba(10,6,22,1)', '#c9a8ff'] : M.boss === 'sallow' ? ['rgba(170,120,40,1)', 'rgba(24,14,4,1)', '#ffd27a'] : ['rgba(160,30,24,1)', 'rgba(20,4,4,1)', '#ff7a6a'];
      let be = null;
      return { scene: sc, shots: [
        { kind: 'scene', dur: 2.8, cam: [{ x: h.x, y: h.y - 1, z: 1.3 }, { x: (h.x + b.x) / 2, y: (h.y + b.y) / 2, z: 1.0 }, { x: b.x, y: b.y + 0.6, z: 1.8 }], cues: [
          [0.1, SFX('charge')], [1.2, () => { be = place(sc, boss, b.x, b.y, 3, { rise: true, scale: (F.scale || 1.8) }); sc.addFx('aoe', b.x, b.y, { sc: 0.9, ground: true, add: true, hue: -40, fps: 24 }); BB.sfx('portal'); }],
          [1.8, () => { for (let i = 0; i < 4; i++) place(sc, grunt, b.x + Math.cos(i * 1.6) * 2.2, b.y + 1.5 + Math.sin(i * 1.6), 1, { rise: true }); }],
          [2.2, () => { if (be) sc.setClip(be, 'Taunt', true); SHAKE(0.6)(); BB.sfx('boss'); }]] },
        { kind: 'closeup', dur: 1.5, who: boss, dir: 3, col1: red[0], col2: red[1], edge: red[2], cues: [[0, SFX('charge')], [0.1, EMBERS(30, red[2])]] },
        { kind: 'impact', dur: 0.35, who: boss, clip: F.atkClips ? F.atkClips[0] : 'Attack1', dir: 3, accent: red[2], cues: [[0, SHAKE(0.9)], [0, SFX('burst')], [0, FLASH(0.6)]] },
        { kind: 'title', dur: 1.9, over: true, cam: [{ x: b.x, y: b.y + 0.6, z: 1.8 }, { x: b.x, y: b.y + 0.4, z: 2.0 }], text: name, sup: 'STAGE ' + M.code, sub: epi, size: 0.11, col: red[2], cues: [[0, SFX('slam')], [0, SHAKE(0.5)], [0.02, SPARKS(80, red[2], 0.5, 0.5, 600)]] },
        { kind: 'split', dur: 1.5, a: hero, b: boss, colA: ['rgba(200,110,30,1)', 'rgba(30,12,4,1)'], colB: [red[0], red[1]], cues: [[0, SFX('rally')], [0.5, SHAKE(0.3)]] },
        { kind: 'impact', dur: 0.3, who: hero, who2: boss, clip: 'Attack1', accent: '#ffffff', cues: [[0, SHAKE(1)], [0, SFX('slam')], [0, FLASH(0.9)]] },
      ] };
    },
    // a new chapter: a fly-over of the region and its name
    async chapter(o) {
      const ch = o.chapter, st = BB.MISSIONS.find((m) => m.chapter === ch.id), R = BB.REGIONS.find((r) => r.id === 'c' + ch.id);
      const sc = await stage(st.layout, R.biome, !!R.night, ch.id * 31, []);
      const m = sc.map, c = m.w / 2;
      const roman = ['', 'I', 'II', 'III', 'IV'][ch.id];
      return { scene: sc, shots: [
        { kind: 'scene', dur: 3.2, cam: [{ x: c - 6, y: c + 5, z: 0.75 }, { x: c + 2, y: c - 2, z: 1.15 }], cues: [[0, SFX('charge')]] },
        { kind: 'title', dur: 2.4, over: true, cam: [{ x: c + 2, y: c - 2, z: 1.15 }, { x: c + 3, y: c - 3, z: 1.25 }], sup: 'CHAPTER ' + roman, text: ch.name.toUpperCase(), sub: ch.blurb, size: 0.1, col: '#ffbe55', cues: [[0, SFX('burst')], [0, SHAKE(0.4)], [0.02, SPARKS(60, '#ffcf7a', 0.5, 0.5, 500)]] },
      ] };
    },
    // a boss falls
    async bossDown(o) {
      const M = o.stage, F = BB.FOES[M.boss], boss = { foe: M.boss };
      const art = actorArt(boss); if (art.key) await BB.loadChar(art.key).catch(() => null);
      return { shots: [
        { kind: 'impact', dur: 0.5, who: boss, clip: 'TakeDamage', dir: 3, accent: '#ffffff', cues: [[0, SHAKE(1)], [0, SFX('burst')], [0, FLASH(1)]] },
        { kind: 'closeup', dur: 1.3, who: boss, dir: 3, col1: 'rgba(120,120,130,1)', col2: 'rgba(8,8,10,1)', edge: '#ffffff', cues: [[0.2, SPARKS(120, '#e8e8f0', 0.5, 0.5, 400)], [0.2, SFX('slam')], [0.6, SHAKE(0.4)]] },
        { kind: 'title', dur: 2.0, text: F.name.split(',')[0].toUpperCase() + ' FALLS', sub: 'STAGE ' + M.code + ' CLEARED', size: 0.09, col: '#ffbe55', bg: '#140d05', cues: [[0, SFX('burst')], [0, SHAKE(0.5)], [0.02, SPARKS(100, '#ffcf7a', 0.5, 0.5, 650)], [0.05, EMBERS(50, '#ffb347')]] },
      ] };
    },
  };
  C.has = (name) => !!SCENES[name];
  const skip = document.getElementById('cineSkip');
  if (skip) skip.addEventListener('click', (e) => { e.stopPropagation(); BB.sfx('click'); C.end(); });
})();
