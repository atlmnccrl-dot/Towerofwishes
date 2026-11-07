// VESPER — the loop, input, saves and the flow: title, scenes, fights, the boon pick, defeat, the
// ending, settings, credits and the theatre (the Last Ditch Effort on demand).
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, S = VS.STORY, AU = VS.audio, SIM = VS.sim, U = VS.ui;
  const M = VS.main = { state: 'load', t: 0, pressed: {}, held: {}, stick: null, touchHeld: {} };
  const STEP = 1 / 60, KEY = 'vesper.save.v1';
  const params = new URLSearchParams(location.search);

  // ---- save -----------------------------------------------------------------------------------
  const fresh = () => ({ stage: 0, boons: [], best: {}, cleared: false, seenLdx: false, hero: 'vesper', opts: { music: 1, sfx: 1, shake: 1, auto: false } });
  function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.opts) return Object.assign(fresh(), j); } catch (e) { /* storage blocked */ } return fresh(); }
  M.write = () => { try { localStorage.setItem(KEY, JSON.stringify(M.save)); } catch (e) { /* storage blocked */ } };
  M.save = load();
  const applyOpts = () => { AU.sfxVol = M.save.opts.sfx; AU.setVolume(M.save.opts.music); };

  // ---- input --------------------------------------------------------------------------------------
  // PC: left mouse cuts, right mouse is the heavy, the mouse aims. Keys: J cut, K heavy, Q/Shift/L parry, Space dash, E/R moon.
  const KEYS = { KeyJ: 'atk', KeyZ: 'atk', KeyK: 'heavy', KeyX: 'heavy', KeyQ: 'parry', ShiftLeft: 'parry', ShiftRight: 'parry', KeyL: 'parry', Space: 'dodge', KeyC: 'dodge', KeyE: 'art', KeyV: 'art', KeyR: 's1', KeyF: 's2', Digit1: 's1', Digit2: 's2',
    Enter: 'confirm', Escape: 'back', KeyP: 'back', ArrowLeft: 'left', ArrowRight: 'right', KeyA: 'left', KeyD: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyW: 'up', KeyS: 'down' };
  addEventListener('keydown', (e) => {
    AU.unlock();
    if (U.current && U.current !== 'loading') { if (U.key(e)) return; if (e.code === 'Enter' || e.code === 'Space') return; }
    const a = KEYS[e.code]; if (!a) return; e.preventDefault();
    if (!M.held[a]) M.pressed[a] = true; M.held[a] = true;
    if (a === 'atk' || e.code === 'Space') M.pressed.confirm = true;
  });
  addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) M.held[a] = false; });
  const pointers = {};
  function onDown(e) {
    AU.unlock(); if (e.pointerType === 'touch') R.touch = true;
    if (e.pointerType === 'mouse') {
      R.touch = false; M.mouse = R.toDev(e.clientX, e.clientY); M.mouseAim = true;
      if (M.state === 'fight' && !M.paused && !M.fight.s.cine) { if (e.button === 2) { M.pressed.heavy = true; return; } if (e.button === 0) { M.pressed.atk = true; return; } }
    }
    const p = R.toDev(e.clientX, e.clientY); pointers[e.pointerId] = { role: null };
    if (M.state === 'fight' && R.touch && !M.fight.s.cine && !M.paused) {
      const L = R.touchLayout();
      for (const b of L.buttons) if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r * 1.25) {
        pointers[e.pointerId].role = b.id; M.touchHeld[b.id] = true;
        if (b.id === 'pause') M.pressed.back = true; else M.pressed[b.id] = true; return;
      }
      if (p.x < R.W * 0.45) { pointers[e.pointerId].role = 'stick'; M.stick = { ox: p.x, oy: p.y, dx: 0, dy: 0 }; return; }
    }
    M.pressed.tap = true;
  }
  function onMove(e) {
    if (e.pointerType === 'mouse') { M.mouse = R.toDev(e.clientX, e.clientY); M.mouseAim = true; }
    const q = pointers[e.pointerId]; if (!q || q.role !== 'stick' || !M.stick) return;
    const p = R.toDev(e.clientX, e.clientY), dx = p.x - M.stick.ox, dy = p.y - M.stick.oy, r = 36 * R.k, n = Math.hypot(dx, dy);
    M.stick.dx = n > r ? dx / n : dx / r; M.stick.dy = n > r ? dy / n : dy / r;
  }
  function onUp(e) {
    const q = pointers[e.pointerId]; if (!q) return;
    if (q.role === 'stick') M.stick = null; else if (q.role) M.touchHeld[q.role] = false;
    delete pointers[e.pointerId];
  }

  M.go = function (state) { M.state = state; M.t = 0; M.pressed = {}; if (R.hideCine) R.hideCine(); };

  // ---- menus -----------------------------------------------------------------------------------------
  function title() {
    M.go('title'); AU.playMusic(null); AU.playAmb('night');
    U.title({ touch: R.touch, heroName: D.HEROES[M.save.hero || 'vesper'].name, onHeroes: () => heroes(title), cont: M.save.stage > 0 ? D.STAGES[M.save.stage].hour + ' · ' + D.STAGES[M.save.stage].name : null,
      onContinue: () => startScene(M.save.stage),
      onNew: () => heroes(() => title(), () => { const o = M.save.opts, cl = M.save.cleared, b = M.save.best, hr = M.save.hero; M.save = fresh(); M.save.opts = o; M.save.cleared = cl; M.save.best = b; M.save.hero = hr; M.write(); startScene(0); }),
      onTheatre: () => theatre(), onSettings: () => settings(), onCredits: () => { M.go('menu'); U.credits({ onBack: title }); } });
  }
  function heroes(back, then) {
    M.go('menu');
    U.heroes({ current: M.save.hero || 'vesper', onBack: back, pick: (id) => { M.save.hero = id; M.write(); AU.sfx('allout', 0.5); (then || back)(); } });
  }
  function settings(focus, confirmReset) {
    M.go('menu');
    U.settings({ opts: M.save.opts, focus, confirmReset, onBack: () => { M.write(); title(); },
      set: (k) => {
        const o = M.save.opts, idx = { music: 0, sfx: 1, shake: 2, auto: 3, reset: 4 }[k];
        if (k === 'music') o.music = o.music === 1 ? 0.5 : o.music === 0.5 ? 0 : 1;
        if (k === 'sfx') o.sfx = o.sfx ? 0 : 1;
        if (k === 'shake') o.shake = o.shake ? 0 : 1;
        if (k === 'auto') o.auto = !o.auto;
        if (k === 'reset') { if (!confirmReset) return settings(idx, true); const keep = o; M.save = fresh(); M.save.opts = keep; }
        applyOpts(); M.write(); settings(idx, false);
      } });
  }

  // ---- scenes -------------------------------------------------------------------------------------------
  function startScene(stageIdx, def, then) {
    U.hide();
    S.heroKey = M.save.hero || 'vesper';
    M.scene = { sc: VS.TALE.start(def || S.BEFORE[stageIdx]), stage: stageIdx, then: then || (() => startFight(stageIdx)) };
    M.go('scene'); AU.playMusic(null); AU.playAmb(stageIdx === 3 || stageIdx === 4 ? 'wind' : 'night');
  }
  function scene(ctx, dt) {
    const m = M.scene;
    VS.TALE.update(m.sc, dt, { tap: M.pressed.tap || M.pressed.confirm || M.pressed.atk, back: M.pressed.back });
    for (const [n, v] of m.sc.cues.splice(0)) AU.sfx(n, v);
    if (m.sc.done) { R.hideCine(); m.then(); return; }
    R.hideCine(); R.shake = Math.max(0, (R.shake || 0) - dt * 40);
    ctx.save(); if (R.shake > 0.5) ctx.translate((Math.random() - 0.5) * R.shake * R.dpr, (Math.random() - 0.5) * R.shake * R.dpr);
    VS.TALE.draw(ctx, m.sc); ctx.restore();
  }

  // ---- fights --------------------------------------------------------------------------------------------
  let f0;
  function startFight(stageIdx, opts) {
    U.hide();
    const s = SIM.create(stageIdx, { seed: (Date.now() & 0xffff) + 1, boons: M.save.boons, hero: M.save.hero });
    M.fight = Object.assign({ s, stage: stageIdx, acc: 0, card: null, cardT: 0, say: null, banner: null }, opts || {});
    M.paused = false; R.snapCam(s); R.fx = []; R.parts = []; R.floaters = []; R.pfx = []; R.entryDoor = null; R.impactF = null;
    f0 = M.fight; const G = S.GOALS[stageIdx]; f0.banner = { text: G ? G.reach : VS.arenaOf(s).name, sub: VS.arenaOf(s).name.toUpperCase() + '  ·  AREA 1 / ' + s.waves.length, t: -0.4, col: '#ffffff' };
    M.go('fight'); AU.playAmb(null); AU.playMusic('heartfelt_battle');
  }
  function gather(f) {
    const s = f.s, p = M.pressed;
    const inp = { mx: 0, my: 0, atk: !!p.atk, heavy: !!p.heavy, dodge: !!p.dodge, parry: !!p.parry, art: !!p.art, s1: !!p.s1, s2: !!p.s2, skip: !!(p.tap || p.confirm || p.atk) };
    // Aim at the mouse: the direction from the knight to the cursor, on the ground.
    if (M.mouseAim && M.mouse && !R.touch && s.hero.alive) { const q = R.P(s.hero.x, s.hero.y, 20), g = R.screenToGround(M.mouse.x - q.x, M.mouse.y - q.y); if (Math.hypot(g.x, g.y) > 0.01) inp.aim = Math.atan2(g.y, g.x); }
    if (M.held.left) inp.mx -= 1; if (M.held.right) inp.mx += 1; if (M.held.up) inp.my -= 1; if (M.held.down) inp.my += 1;
    if (M.stick && Math.hypot(M.stick.dx, M.stick.dy) > 0.25) { inp.mx = M.stick.dx; inp.my = M.stick.dy; }
    // The stick and the keys move on screen; turn that into the ground's directions under the camera.
    if (inp.mx || inp.my) { const g = R.screenToGround(inp.mx, inp.my); inp.mx = g.x; inp.my = g.y; }
    if (M.save.opts.auto || f.auto) {
      const b = SIM.bot(s, 0.7);
      if (!inp.mx && !inp.my && !inp.atk && !inp.heavy && !inp.dodge && !inp.parry && !inp.s1 && !inp.s2) Object.assign(inp, b, { skip: inp.skip, aim: undefined });
    }
    return inp;
  }
  function pause(on) {
    M.paused = on;
    if (!on) { U.hide(); return; }
    U.pause({ auto: M.save.opts.auto, onResume: () => pause(false), onRestart: () => startFight(M.fight.stage),
      onAuto: () => { M.save.opts.auto = !M.save.opts.auto; M.write(); pause(true); }, onQuit: () => { M.paused = false; title(); } });
  }
  function fight(ctx, dt) {
    const f = M.fight, s = f.s;
    if (M.pressed.back && !s.cine && !M.paused) { pause(true); M.pressed.back = false; }
    if (!M.paused && !M.hold) {
      f.acc += dt;
      const live = gather(f); f.pend = f.pend || {};
      for (const k of ['atk', 'heavy', 'dodge', 'parry', 'art', 's1', 's2', 'skip']) if (live[k]) f.pend[k] = true;
      while (f.acc >= STEP) {
        const c0 = s.cine ? s.cine.t : null, inp = Object.assign({ mx: live.mx, my: live.my, aim: live.aim }, f.pend); f.pend = {};
        SIM.step(s, STEP, inp); f.acc -= STEP;
        if (s.cine && c0 != null) for (const [n, v] of VS.cine.cues(s.cine, c0, s.cine.t)) AU.sfx(n, v);
        R.consume(s); AU.events(s.events);
        for (const e of s.events) {
          if (e.type === 'boss') { f.card = e.keys; f.cardT = 0; }
          if (e.type === 'phase' && !e.quiet) { const line = S.PHASE[e.key]; if (line && line !== '…') f.say = { id: e.id, key: e.key, text: line, t: 0 }; }
          if (e.type === 'art') { AU.duck(true); if (e.kind === 'ldx') M.save.seenLdx = true; }
          if (e.type === 'artEnd') { AU.duck(false); if (f.theatre) f.theatreEnd = 2.2; }
          if (e.type === 'portal') f.banner = { text: 'THE WAY OPENS', sub: 'GO THROUGH THE DOOR', t: 0, col: '#ffffff', low: true };
          if (e.type === 'area') { const last = e.n === s.waves.length - 1; const G = S.GOALS[f.stage]; f.banner = { text: last && G ? G.boss : VS.arenaOf(s).name, sub: last ? VS.arenaOf(s).name.toUpperCase() + '  ·  THE GUARDIAN' : 'AREA ' + (e.n + 1) + ' / ' + s.waves.length, t: 0, col: last ? '#ff2a44' : '#ffffff' }; }
          if (e.type === 'clear' && !f.theatre) f.banner = { text: 'HOUR CLEARED', t: 0, col: '#ff2a44' };
        }
        if (f.acc > STEP * 5) f.acc = 0;
      }
    }
    if (!M.save.opts.shake) R.shake = 0;
    if (!R.cineCovers(s)) R.drawFight(ctx, s, M.paused ? 0 : dt);
    if (s.cine) R.drawCine(ctx, s);
    else {
      if (!R.drawBossArt(s, dt)) R.hideCine();
      if (!M.paused) { R.drawHud(ctx, s, dt, { touch: R.touch, auto: M.save.opts.auto }); R.drawSkills(ctx, s, R.touch); }
      if (f.say) {
        f.say.t += dt; const u = s.units.find((o) => o.id === f.say.id), sp = S.speaker(f.say.key);
        if (u && f.say.t < 2.6) { const hd = R.headOf(u); R.say(ctx, hd.x, hd.y, sp.name, sp.color, f.say.text, f.say.t, { shout: true }); }
        if (f.say.t > 2.6) f.say = null;
      }
      if (f.banner) { f.banner.t += dt; if (f.banner.t < 2.2) R.banner(ctx, f.banner.text, f.banner.t, f.banner.col, f.banner.sub, f.banner.low); else f.banner = null; }
      if (f.card) { f.cardT += dt; if (f.cardT < 1.9) R.bossCard(ctx, s, f.card, f.cardT); else f.card = null; }
      if (s.time < 7 && f.stage === 0 && !f.theatre) R.hint(ctx, R.touch ? 'PARRY white danger  ·  DASH out of red danger  ·  two SKILL buttons on the left' : 'WASD move  ·  LEFT CLICK attack  ·  RIGHT CLICK heavy  ·  R  F skills  ·  Q parry  ·  SPACE dash  ·  E ultimate', Math.min(1, 7 - s.time));
      if (R.touch && !M.paused) R.drawTouch(ctx, s, { stick: M.stick, held: M.touchHeld });
      if (!R.touch && M.mouseAim && M.mouse && !M.paused) R.drawReticle(ctx, M.mouse.x, M.mouse.y);
    }
    if (f.theatreEnd > 0 && !M.paused) { f.theatreEnd -= dt; if (f.theatreEnd <= 0) { title(); return; } }
    if (s.result && !M.paused) endFight(s.result);
  }
  function endFight(result) {
    const f = M.fight, s = f.s;
    AU.duck(false);
    if (f.theatre) { title(); return; }
    if (result === 'lose') {
      M.lost = { stage: f.stage }; M.go('lost'); AU.playMusic(null);
      U.lost({ onRetry: () => startFight(f.stage), onTitle: title }); return;
    }
    const best = M.save.best[f.stage]; if (!best || s.time < best) M.save.best[f.stage] = Math.round(s.time * 10) / 10;
    if (f.stage >= D.STAGES.length - 1) {
      M.save.cleared = true; M.save.stage = 0; M.save.boons = []; M.write();
      startScene(5, S.ENDING, title); return;
    }
    const pool = D.BOONS.filter((b) => M.save.boons.indexOf(b.id) < 0), pick = [];
    while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    M.result = { stage: f.stage }; M.go('boon'); AU.playMusic(null); AU.playAmb('night');
    U.boon({ hour: D.STAGES[f.stage].hour + ' · ' + D.STAGES[f.stage].name, stats: s.stats, time: s.time, boons: pick,
      carried: M.save.boons.map((id) => D.BOONS.find((b) => b.id === id).name),
      pick: (b) => { M.save.boons.push(b.id); M.save.stage = f.stage + 1; M.write(); AU.sfx('allout', 0.4); startScene(M.save.stage); } });
  }

  // The theatre: the last hour, the First Cut alone, the knight at a quarter health, the moon full.
  function theatre() {
    startFight(5, { theatre: true });
    const s = M.fight.s;
    s.wave = s.waves.length - 2; s.area = s.waves.length - 1; s.waveT = 0;
    SIM.step(s, STEP, {}); s.freeze = 0; M.fight.card = null;
    for (const u of SIM.foes(s)) { u.state = 'idle'; u.st = 0; }
    const boss = SIM.foes(s)[0]; if (boss) { boss.x = s.hero.x + 70; boss.face = -1; }
    s.hero.hp = Math.round(s.hero.maxHp * 0.25); s.moon = 100;
    R.snapCam(s);
    M.fight.theatreT = 0.6;
  }

  // ---- loop ------------------------------------------------------------------------------------------------
  let last = 0;
  function backdrop(ctx, dt, stIdx, figure) {
    const st = D.STAGES[stIdx], vw = R.viewW(), cam = Math.max(0, (R.SIDE_W - vw) / 2 + Math.sin(M.t * 0.08) * 40);
    R.drawBackdrop(ctx, st, cam, dt);
    if (figure) R.drawFigure(ctx, D.HERO.set, 'Idle', Math.floor(M.t * 7) % 15, Math.PI, cam + vw * 0.7, 4, 1, {});
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; M.t += dt; R.t += dt; R.realDt = dt;
    R.canvas.style.cursor = M.state === 'fight' && !M.paused && !R.touch ? 'none' : '';
    const ctx = R.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
    if (M.state === 'fight' && M.fight.theatreT > 0) { M.fight.theatreT -= dt; if (M.fight.theatreT <= 0) SIM.startArt(M.fight.s); }
    try {
    switch (M.state) {
      case 'load': ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, R.W, R.H); break;
      case 'title': case 'menu': backdrop(ctx, dt, 5, true); break;
      case 'scene': scene(ctx, dt); break;
      case 'fight': fight(ctx, dt); break;
      case 'boon': backdrop(ctx, dt, M.result.stage, false); break;
      case 'lost': backdrop(ctx, dt, M.lost.stage, false); ctx.fillStyle = 'rgba(40,0,8,0.55)'; ctx.fillRect(0, 0, R.W, R.H); break;
    }
    } catch (err) { if (!M.lastErr || M.t - M.lastErr > 2) { M.lastErr = M.t; console.error(err); } }   // one bad frame must not stop the game
    M.pressed = {};
    R.present();
    requestAnimationFrame(frame);
  }

  async function boot() {
    R.init(document.getElementById('game'));
    const c = R.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', onDown); c.addEventListener('pointermove', onMove); c.addEventListener('pointerup', onUp); c.addEventListener('pointercancel', onUp);
    requestAnimationFrame(frame);
    U.loading(0);
    const ids = new Set([D.HERO.set, D.LYS.set, D.CLONE.set]); for (const k in D.FOES) ids.add(D.FOES[k].set); for (const k in D.HEROES) ids.add(D.HEROES[k].set);
    await A.load([...ids], (p) => U.loading(p));
    try { if (document.fonts) await Promise.race([Promise.all(['700 20px "Chakra Petch"', '600 16px "Chakra Petch"', '500 16px Barlow', '700 16px Barlow'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fonts optional */ }
    A.warm(R.ctx);
    applyOpts();
    if (params.has('auto')) M.save.opts.auto = true;
    if (params.has('hero') && D.HEROES[params.get('hero')]) M.save.hero = params.get('hero');
    if (params.has('theatre')) theatre();
    else if (params.has('stage')) startFight(Math.max(0, Math.min(5, +params.get('stage') || 0)));
    else if (params.has('scene')) startScene(Math.max(0, Math.min(5, +params.get('scene') || 0)));
    else title();
  }
  M.startFight = startFight; M.startScene = startScene; M.theatre = theatre; M.title = title; M.endFight = endFight;
  boot();
})();
