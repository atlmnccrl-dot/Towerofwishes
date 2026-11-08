// VESPER — the opening, played in the game itself: the fall of the moon told over the night sky, then
// a real fight on the Gatehouse at the Black Gate. Vesper walks in, the dead rise from rifts all
// around her and she cuts through them with her real kit (driven by the test bot at full skill), the
// Gatewarden crashes down, and the Last Ditch Effort ends it. The camera is directed shot by shot:
// low and tight on her, wide for the swarm, a shake for the landing; the title slams in at the end.
// A tap (or Esc) skips straight to the trial.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R;
  const I = VS.INTRO = {};
  const RED = '#ff2a44';
  // The beats, in seconds.
  const T = { sky: 0, fight: 7.5, boss: 18, ldx: 21.5, title: 0, end: 0 };
  const LINES = [
    [0.4, 3.4, 'Seven hundred years ago, the moon began to fall.'],
    [3.6, 7.0, 'A swordsman cut it. It stopped. The wound never closed.'],
    [8.2, 11.8, 'Its red light raises the dead.'],
    [12.4, 16.2, 'Tonight the wound bleeds out. At dawn, the moon falls for good.'],
    [16.6, 19.4, 'One blade can close it.'],
  ];
  const NODE = { waves: [['ghoul', 'ghoul', 'thrall', 'ghoul', 'thrall', '+', 'raider', 'ghoul', 'thrall', 'ghoul', 'ghast', '+', 'ghoul', 'raider', 'thrall', 'ghoul']], boss: false, arenas: ['lair_warden'], scale: { hp: 0.55, dmg: 0.4 }, rules: {},
    variants: { thrall: ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013'] } };

  I.start = function (then) {
    const kit = ['heavy', 'dodge', 'parry', 'skill1', 'skill2', 'art'];
    const s = VS.sim.create(0, { seed: 1337, hero: 'vesper', node: NODE, kit, boons: ['edge', 'fourth', 'ghost', 'vigor'], arenaSeed: 7 });
    s.staged = true; s.waveT = 1e9;   // the dead wait for their cue
    const h = s.hero, A0 = VS.arenaOf(s);
    h.x = A0.entry.x - 60; h.y = A0.entry.y;
    I.st = { s, t: 0, then, cam: { x: h.x + 120, y: h.y, z: 2.1 }, shake: 0, title: 0, boss: false, ldx: false, done: false, flash: 0 };
    R.fx = []; R.parts = []; R.floaters = []; R.pfx = []; R.impactF = null; R.entryDoor = null;
    VS.audio.playAmb('wind'); VS.audio.playMusic(null);
  };
  const STEP = 1 / 60;
  I.update = function (dt, skip) {
    const S = I.st; if (!S || S.done) return;
    if (skip) { finish(); return; }
    const s = S.s, h = s.hero, t = S.t;
    S.acc = (S.acc || 0) + dt;
    while (S.acc >= STEP) {
      S.acc -= STEP; S.t += STEP;
      const c0 = s.cine ? s.cine.t : null;
      let inp = { mx: 0, my: 0 };
      if (S.t < T.fight) { if (S.t > 5.5) { inp.mx = 1; } }                                    // she walks in
      else if (!S.title) { inp = VS.sim.bot(s, 0.95); inp.art = false; if (s.moon > 90 && !S.ldx) s.moon = 90; }   // the ultimate waits for its cue
      // Cues: the dead rise, the music starts; the guardian lands; the last ditch effort.
      if (S.t >= T.fight && s.waveT > 100 && s.wave < 0) { s.waveT = 0.1; VS.audio.cue('act0'); }
      if (s.wave >= 0) s.scripted = true;   // once the dead are up, the director decides what comes next
      if (S.t >= T.boss && !S.boss) { S.boss = true; VS.sim.place(s, 'warden', h.x + 130, h.y - 40); S.shake = 1; }
      if (S.t >= T.ldx && !S.ldx && !s.cine) { S.ldx = true; h.hp = Math.round(h.maxHp * 0.24); s.moon = 100; if (!VS.sim.startArt(s)) S.ldx = false; }
      if (S.t > T.ldx + 3 && !S.ldx && !S.title) { s.reinf = []; for (const u of VS.sim.foes(s)) VS.sim.dismiss(s, u); S.title = S.t; }   // nothing left to strike: straight to the title
      // She cannot fall in the opening.
      if (h.hp < h.maxHp * 0.2 && !S.ldx) h.hp = h.maxHp * 0.6;
      if (h.hp <= 1) h.hp = 1;
      VS.sim.step(s, STEP, inp);
      if (s.cine && c0 != null) for (const [n, v] of VS.cine.cues(s.cine, c0, s.cine.t)) VS.audio.sfx(n, v);
      R.consume(s); VS.audio.events(s.events);
      for (const e of s.events) { if (e.type === 'landed' && e.boss) { S.shake = 1; S.flash = 0.6; } if (e.type === 'artEnd') { s.reinf = []; for (const u of VS.sim.foes(s)) VS.sim.dismiss(s, u); S.title = S.t; } }
      if (s.result || s.endT > 0) { s.result = null; s.endT = 0; }
      if (S.title && S.t - S.title > 6.5) { finish(); return; }
    }
    void t;
  };
  function finish() { const S = I.st; if (!S || S.done) return; S.done = true; R.hideCine(); VS.audio.duck(false); S.then(); }

  // ---- the camera ------------------------------------------------------------------------------------
  function direct(S, dt) {
    const s = S.s, h = s.hero, t = S.t, c = S.cam;
    let tx = h.x, ty = h.y, tz = 1.25;
    if (t < T.fight) { tx = h.x + 30; tz = 2.0 - (t - 4.5) * 0.08 * (t > 4.5); }               // tight on her as she walks in
    else if (t < T.fight + 1.6) tz = 1.35;                                                           // the dead rise: pull out
    else if (t < T.boss) { const f = VS.sim.foes(s).filter((u) => u.alive); if (f.length) { let mx = 0, my = 0; for (const u of f) { mx += u.x; my += u.y; } tx = h.x * 0.6 + mx / f.length * 0.4; ty = h.y * 0.6 + my / f.length * 0.4; } tz = 1.2 + 0.1 * Math.sin(t * 0.7); }
    else if (!S.title) { const b = VS.sim.foes(s).find((u) => u.def.boss); if (b) { tx = (h.x + b.x) / 2; ty = (h.y + b.y) / 2; } tz = 1.5; }
    else { tz = 1.0 + Math.min(0.6, (t - S.title) * 0.25); }
    const k = Math.min(1, dt * 3); c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * Math.min(1, dt * 2);
    R.hcam.x = c.x; R.hcam.y = c.y; s.zoom = c.z;
    if (S.shake > 0) { R.shake = Math.max(R.shake, 14 * S.shake); S.shake = Math.max(0, S.shake - dt * 2); }
  }

  // ---- drawing -----------------------------------------------------------------------------------------
  function sky(ctx, a) {
    const g = ctx.createLinearGradient(0, 0, 0, R.H); g.addColorStop(0, '#07040a'); g.addColorStop(0.6, '#1c0a12'); g.addColorStop(1, '#050307');
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H);
    const r = R.H * 0.26, x = R.W * 0.5, y = R.H * (0.46 - a * 0.06);
    A.tex(ctx, 'light_01', x, y, r * 6, r * 6, RED, 0.3 + 0.15 * a, 0, true);
    const m = ctx.createLinearGradient(x - r, y - r, x + r, y + r); m.addColorStop(0, '#ff8a9a'); m.addColorStop(1, '#8a1022'); ctx.fillStyle = m; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (a > 0.45) { const k = Math.min(1, (a - 0.45) * 3); ctx.strokeStyle = `rgba(30,0,6,${0.9 * k})`; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(x - r * k, y + r * 0.4 * k); ctx.lineTo(x + r * k, y - r * 0.4 * k); ctx.stroke(); A.tex(ctx, 'light_01', x, y, r * 2.6, r * 0.5, '#ffffff', 0.25 * k, -0.38, true); }
    // The swordsman's leap across the moon, a black shape against the red, and the cut that stops it.
    const lk = (a - 0.5) / 0.32, F = D.FOES.firstCut;
    if (lk > 0 && lk < 1 && F && A.hasSet(F.set)) {
      const fx = x - r * 1.4 + r * 2.8 * lk, fy = y + r * 0.5 - Math.sin(lk * Math.PI) * r * 0.9;
      for (let i = 4; i >= 1; i--) A.actor(ctx, F.set, 'Attack4', Math.min(14, Math.floor(lk * 15)), 0, Math.round(fx - i * r * 0.08), Math.round(fy), R.H / 140, { shade: '#050307', alpha: 0.12 * (5 - i) });
      A.actor(ctx, F.set, 'Attack4', Math.min(14, Math.floor(lk * 15)), 0, Math.round(fx), Math.round(fy), R.H / 140, { shade: '#050307' });
    }
    for (let i = 0; i < 120; i++) { const h = (i * 2654435761 >>> 0) / 4294967296, h2 = (i * 40503 % 997) / 997; ctx.fillStyle = `rgba(255,236,240,${0.25 + 0.5 * h2})`; ctx.fillRect(Math.round(h * R.W), Math.round(h2 * R.H * 0.8), Math.max(1, R.dpr), Math.max(1, R.dpr)); }
  }
  function caption(ctx, S) {
    for (const [a, b, text] of LINES) {
      if (S.t < a || S.t > b) continue;
      const al = Math.min(1, (S.t - a) * 3, (b - S.t) * 3), y = S.t < T.fight ? R.H * 0.82 : R.H * 0.86;
      ctx.save(); ctx.globalAlpha = al; R.label(ctx, text, R.W / 2, y, 20 * R.k, '#f6eef0', 'center', 1); ctx.restore();
    }
  }
  function letterbox(ctx, k) { const h = Math.round(R.H * 0.1 * k); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, h); ctx.fillRect(0, R.H - h, R.W, h); }
  function titleCard(ctx, S) {
    const k = S.t - S.title; if (!S.title || k < 0.6) return;
    const a = Math.min(1, (k - 0.6) * 4), slam = Math.max(0, 1 - (k - 0.6) * 5);
    ctx.save(); ctx.fillStyle = `rgba(5,3,7,${0.55 * a})`; ctx.fillRect(0, 0, R.W, R.H);
    if (k < 0.75) { ctx.fillStyle = `rgba(255,250,252,${1 - (k - 0.6) / 0.15})`; ctx.fillRect(0, 0, R.W, R.H); }
    const sz = 120 * R.k * (1 + slam * 0.6), y = R.H * 0.3;
    ctx.globalAlpha = a; ctx.font = `${Math.round(sz)}px Adventurer, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const o = Math.max(3, Math.round(sz / 22)); ctx.fillStyle = '#050307'; for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [o, o]]) ctx.fillText('VESPER', R.W / 2 + dx, y + dy);
    const g = ctx.createLinearGradient(0, y - sz / 2, 0, y + sz / 2); g.addColorStop(0, '#ff9aaa'); g.addColorStop(0.5, '#ff2a44'); g.addColorStop(1, '#7a0c1e'); ctx.fillStyle = g; ctx.fillText('VESPER', R.W / 2, y);
    const dv = R.uiImg && R.uiImg('divider'); if (dv) { const ps = R.px(); ctx.imageSmoothingEnabled = false; ctx.drawImage(dv, Math.round(R.W / 2 - dv.naturalWidth * ps / 2), Math.round(y + sz * 0.5), dv.naturalWidth * ps, dv.naturalHeight * ps); }
    if (k > 1.2) { ctx.globalAlpha = Math.min(1, (k - 1.2) * 2); R.label(ctx, 'A last ditch effort', R.W / 2, y + sz * 0.5 + 44 * R.k, 22 * R.k, '#ffb8c4', 'center', 1); }
    if (k > 2.2) { ctx.globalAlpha = Math.min(1, (k - 2.2) * 2); R.label(ctx, 'Six guardians. One night. Close the wound before dawn.', R.W / 2, R.H * 0.82, 18 * R.k, '#f6eef0', 'center', 1); }
    ctx.restore();
  }
  I.draw = function (ctx, dt) {
    const S = I.st; if (!S) return;
    const s = S.s;
    if (S.t < T.fight - 1.2) {
      sky(ctx, S.t / (T.fight - 1.2)); caption(ctx, S); letterbox(ctx, 1);
    } else {
      direct(S, dt);
      ctx.save(); if (R.shake > 0.5) ctx.translate((Math.random() - 0.5) * R.shake * R.dpr, (Math.random() - 0.5) * R.shake * R.dpr);
      if (!R.cineCovers(s)) R.drawFight(ctx, s, dt);
      ctx.restore();
      if (s.cine) R.drawCine(ctx, s); else R.hideCine();
      // From the sky into the arena: a fade through black.
      const into = S.t - (T.fight - 1.2); if (into < 1.4) { ctx.fillStyle = `rgba(0,0,0,${into < 0.7 ? into / 0.7 : 1 - (into - 0.7) / 0.7})`; ctx.fillRect(0, 0, R.W, R.H); }
      if (S.boss && S.t - T.boss < 2.6) R.bossCard(ctx, s, ['warden'], S.t - T.boss);
      if (S.flash > 0) { ctx.fillStyle = `rgba(255,240,244,${S.flash})`; ctx.fillRect(0, 0, R.W, R.H); S.flash = Math.max(0, S.flash - dt * 2.5); }
      if (!s.cine) { caption(ctx, S); letterbox(ctx, S.title ? Math.max(0, 1 - (S.t - S.title) * 1.5) : 1); }
      titleCard(ctx, S);
    }
    R.label(ctx, R.touch ? 'Tap to skip' : 'Esc to skip', R.W - 16 * R.k, R.H - 12 * R.k, 11 * R.k, 'rgba(255,255,255,0.45)', 'right', 1);
    R.shake = Math.max(0, R.shake - dt * 30);
  };
})();
