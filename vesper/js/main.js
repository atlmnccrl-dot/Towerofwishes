// VESPER — the loop, input, saves and the screens: title, scenes, fights, boons, defeat, ending,
// settings, credits and the theatre (the Last Ditch Effort on demand).
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, C = VS.cine, S = VS.STORY, AU = VS.audio, SIM = VS.sim;
  const M = VS.main = { state: 'load', t: 0, menu: 0, pressed: {}, held: {}, stick: null, touchHeld: {}, progress: 0 };
  const STEP = 1 / 60, KEY = 'vesper.save.v1';
  const params = new URLSearchParams(location.search);

  // ---- save -----------------------------------------------------------------------------------
  const fresh = () => ({ stage: 0, boons: [], best: {}, cleared: false, seenLdx: false, opts: { music: 1, sfx: 1, shake: 1, auto: false } });
  function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.opts) return Object.assign(fresh(), j); } catch (e) { /* storage blocked */ } return fresh(); }
  M.write = () => { try { localStorage.setItem(KEY, JSON.stringify(M.save)); } catch (e) { /* storage blocked */ } };
  M.save = load();
  const applyOpts = () => { AU.setVolume(M.save.opts.music); AU.sfxVol = M.save.opts.sfx; };

  // ---- input ------------------------------------------------------------------------------------
  const KEYS = { KeyJ: 'atk', KeyZ: 'atk', KeyK: 'parry', KeyX: 'parry', Space: 'dodge', ShiftLeft: 'dodge', KeyC: 'dodge', KeyL: 'art', KeyV: 'art', KeyE: 'art',
    Enter: 'confirm', Escape: 'back', KeyP: 'back', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
  addEventListener('keydown', (e) => {
    AU.unlock(); const a = KEYS[e.code]; if (!a) return; e.preventDefault();
    if (!M.held[a]) M.pressed[a] = true; M.held[a] = true;
    if (a === 'dodge' || a === 'atk') M.pressed.confirm = M.pressed.confirm || a === 'atk' || e.code === 'Space';
  });
  addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) M.held[a] = false; });
  const pointers = {};
  function onDown(e) {
    AU.unlock(); if (e.pointerType === 'touch') R.touch = true;
    const p = R.toBuf(e.clientX, e.clientY); pointers[e.pointerId] = { x: p.x, y: p.y, role: null };
    if (M.state === 'fight' && R.touch && !M.fight.s.cine && !M.paused) {
      const L = R.touchLayout();
      for (const b of L.buttons) if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 5) {
        pointers[e.pointerId].role = b.id; M.touchHeld[b.id] = true;
        if (b.id === 'pause') M.pressed.back = true; else M.pressed[b.id] = true; return;
      }
      if (p.x < R.W * 0.5 && p.y > R.H * 0.35) { pointers[e.pointerId].role = 'stick'; M.stick = { ox: p.x, oy: p.y, dx: 0, dy: 0 }; return; }
    }
    M.tap = p; M.pressed.tap = true;
  }
  function onMove(e) {
    const q = pointers[e.pointerId]; if (!q || q.role !== 'stick' || !M.stick) return;
    const p = R.toBuf(e.clientX, e.clientY), dx = p.x - M.stick.ox, dy = p.y - M.stick.oy, n = Math.hypot(dx, dy), r = 22;
    M.stick.dx = n > r ? dx / n : dx / r; M.stick.dy = n > r ? dy / n : dy / r;
  }
  function onUp(e) {
    const q = pointers[e.pointerId]; if (!q) return;
    if (q.role === 'stick') M.stick = null; else if (q.role) M.touchHeld[q.role] = false;
    delete pointers[e.pointerId];
  }

  // ---- screens --------------------------------------------------------------------------------------
  M.go = function (state) { M.state = state; M.t = 0; M.menu = 0; M.pressed = {}; };
  function menuNav(n) {
    if (M.pressed.up) M.menu = (M.menu + n - 1) % n;
    if (M.pressed.down) M.menu = (M.menu + 1) % n;
    if (M.pressed.up || M.pressed.down) AU.sfx('step_0', 0.4);
  }
  // A vertical list of items; returns the index chosen this frame or -1.
  function list(ctx, items, x, y, gap, size) {
    let chosen = -1;
    items.forEach((it, i) => {
      const yy = y + i * gap, sel = i === M.menu;
      if (M.tap) { ctx.font = R.font(size); const w = ctx.measureText(it).width; if (M.tap.x >= x - 8 && M.tap.x <= x + w + 12 && M.tap.y >= yy - size && M.tap.y <= yy + 4) { M.menu = i; chosen = i; } }
      if (sel) { ctx.fillStyle = '#ff2a44'; ctx.fillRect(x - 8, yy - Math.round(size * 0.45), 4, 2); }
      R.text(ctx, it, x + (sel ? 2 : 0), yy, size, sel ? '#ffffff' : '#a898a0');
    });
    if (M.pressed.confirm) chosen = M.menu;
    return chosen;
  }

  // Title.
  function title(ctx, dt) {
    const st = D.STAGES[5], W = R.W, H = R.H;
    R.drawArena(ctx, st, M.t * 6 % 200, 0.3);
    R.drawWeather(ctx, st, M.t * 6 % 200, M.t);
    // The hero on the floor, small, looking at the moon.
    A.actor(ctx, D.HERO.set, 'Idle', Math.floor(M.t * 6) % 15, 0, 250, R.FLOOR + 30, 1, { shade: '#000000' });
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, 150, H);
    R.text(ctx, 'VESPER', 18, 52, 34, '#ff2a44', 'left', { outline: true });
    R.text(ctx, 'a last ditch effort', 20, 66, 8, '#e8c8d0');
    const cont = M.save.stage > 0;
    const items = (cont ? ['CONTINUE  ·  ' + D.STAGES[M.save.stage].hour] : []).concat(['NEW NIGHT', 'THEATRE', 'SETTINGS', 'CREDITS']);
    menuNav(items.length);
    const i = list(ctx, items, 22, 100, 15, 9);
    R.text(ctx, R.touch ? 'Landscape · touch' : 'WASD move · J cut · K parry · Space dash · L moon', 20, H - 10, 6, '#8a7a82');
    if (i < 0) return;
    AU.sfx('clang_0', 0.5);
    const act = items[i];
    if (act.startsWith('CONTINUE')) startScene(M.save.stage);
    else if (act === 'NEW NIGHT') { const o = M.save.opts, cl = M.save.cleared, b = M.save.best; M.save = fresh(); M.save.opts = o; M.save.cleared = cl; M.save.best = b; M.write(); startScene(0); }
    else if (act === 'THEATRE') theatre();
    else if (act === 'SETTINGS') { M.go('settings'); }
    else if (act === 'CREDITS') M.go('credits');
  }

  // Settings.
  function settings(ctx) {
    ctx.fillStyle = '#08060a'; ctx.fillRect(0, 0, R.W, R.H);
    R.text(ctx, 'SETTINGS', 22, 30, 16, '#ff2a44');
    const o = M.save.opts;
    const items = [`MUSIC  ·  ${o.music ? (o.music < 1 ? 'LOW' : 'ON') : 'OFF'}`, `SOUND  ·  ${o.sfx ? 'ON' : 'OFF'}`, `SCREEN SHAKE  ·  ${o.shake ? 'ON' : 'OFF'}`, `AUTO BATTLE  ·  ${o.auto ? 'ON' : 'OFF'}`, 'RESET PROGRESS', 'BACK'];
    menuNav(items.length);
    const i = list(ctx, items, 30, 62, 16, 9);
    R.text(ctx, 'Auto battle lets the knight fight on his own; you can still press any button.', 30, R.H - 14, 6, '#8a7a82');
    if (M.pressed.back) { M.write(); M.go('title'); return; }
    if (i < 0) return;
    AU.sfx('step_1', 0.5);
    if (i === 0) o.music = o.music === 1 ? 0.5 : o.music === 0.5 ? 0 : 1;
    if (i === 1) o.sfx = o.sfx ? 0 : 1;
    if (i === 2) o.shake = o.shake ? 0 : 1;
    if (i === 3) o.auto = !o.auto;
    if (i === 4) { const keep = o; M.save = fresh(); M.save.opts = keep; }
    if (i === 5) { M.write(); M.go('title'); return; }
    applyOpts(); M.write(); M.menu = i;
  }

  function credits(ctx) {
    ctx.fillStyle = '#08060a'; ctx.fillRect(0, 0, R.W, R.H);
    R.text(ctx, 'CREDITS', 22, 28, 16, '#ff2a44');
    const lines = ['Characters made with Character Creator 2D Fantasy (SmallScaleInt).',
      'Effects: Pixel VFX Essentials; KILN FX Free Sampler; Magic Spells VFX Lite by Willosuna; FX packs 6 and 13.',
      'Tiles: Pixel Art Top Down - Basic (Cainos); TopDownFantasy Forest; reodesuxz tilesets; EPIC RPG World; Dark World.',
      'Adventurer font by Brian J Smith (CC BY 3.0).', 'Music: "Heartfelt Battle", OpenGameArt.org (CC0).',
      'Fight sounds and ambience synthesised for these games (tools/make_sfx.py).', 'The moon arts are drawn in code over the cast and effect packs.'];
    let y = 48; for (const l of lines) for (const w of R.wrap(ctx, l, 7, R.W - 50)) { R.text(ctx, w, 24, y, 7, '#d8c8d0'); y += 11; }
    R.text(ctx, 'tap or press Esc', 24, R.H - 12, 6, '#8a7a82');
    if (M.pressed.back || M.pressed.tap || M.pressed.confirm) M.go('title');
  }

  // Scenes: the cast stands on the stage's floor; lines float beside the speaker; cards go full black.
  function startScene(stageIdx, def, then) {
    const sc = def || S.BEFORE[stageIdx];
    M.scene = { def: sc, i: 0, t: 0, stage: stageIdx, then: then || (() => startFight(stageIdx)) };
    M.go('scene'); AU.playMusic(null); AU.playAmb(stageIdx === 3 || stageIdx === 4 ? 'wind' : 'night');
  }
  function scene(ctx, dt) {
    const sc = M.scene, b = sc.def.beats[sc.i], st = D.STAGES[Math.min(5, sc.stage)];
    sc.t += dt;
    R.drawArena(ctx, st, 60, 0.2);
    const cast = sc.def.cast, n = cast.length, pos = {};
    cast.forEach((key, i) => {
      const sp = S.speaker(key), x = Math.round(120 + i * (n > 2 ? 85 : 140)), y = R.FLOOR + 32;
      const face = i === n - 1 && n > 1 ? Math.PI : 0, sc2 = sp.scale || 1;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - 7 * sc2, y - 1, 14 * sc2, 2);
      A.actor(ctx, sp.set, key === 'vesper' ? 'Idle4' : 'Idle', Math.floor((M.t + i) * 7) % 15, face, x, y, sc2, {});
      pos[key] = { x, y: y - 46 * sc2 };
    });
    R.drawWeather(ctx, st, 60, M.t);
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, R.W, 14); ctx.fillRect(0, R.H - 14, R.W, 14);
    if (b.card) {
      ctx.fillStyle = `rgba(0,0,0,${b.stage ? 0.7 : 0.94})`; ctx.fillRect(0, 0, R.W, R.H);
      const k = Math.min(1, sc.t / 0.5);
      ctx.save(); ctx.globalAlpha = k;
      R.text(ctx, b.card, R.W / 2, R.H / 2 - (b.sub ? 4 : -4), b.stage ? 16 : 12, b.stage ? '#ff2a44' : '#ffffff', 'center');
      if (b.sub) R.text(ctx, b.sub, R.W / 2, R.H / 2 + 12, 8, '#d8c0c8', 'center');
      ctx.restore();
    } else if (pos[b.who]) {
      const sp = S.speaker(b.who); C.say(ctx, pos[b.who].x, pos[b.who].y, sp.name, sp.color, b.line, sc.t, { shout: b.shout });
    }
    R.text(ctx, 'tap · Esc skips', R.W - 6, R.H - 4, 6, 'rgba(220,210,214,0.5)', 'right', { shadow: false });
    if (M.pressed.back) { sc.then(); return; }
    if ((M.pressed.tap || M.pressed.confirm) && sc.t > 0.25) {
      sc.i++; sc.t = 0; AU.sfx('step_2', 0.3);
      if (sc.i >= sc.def.beats.length) sc.then();
    }
  }

  // Fights.
  function startFight(stageIdx, opts) {
    const s = SIM.create(stageIdx, { seed: (Date.now() & 0xffff) + 1, boons: M.save.boons });
    M.fight = Object.assign({ s, stage: stageIdx, acc: 0, card: null, cardT: 0, say: null, banner: null, cineT: 0 }, opts || {});
    M.paused = false; R.cam = Math.max(0, s.hero.x - R.W / 2); R.fx = []; R.floaters = [];
    M.go('fight'); AU.playAmb(null); AU.playMusic('heartfelt_battle');
  }
  function gather(f) {
    const s = f.s;
    const p = M.pressed, inp = { mx: 0, my: 0, atk: !!p.atk, dodge: !!p.dodge, parry: !!p.parry, art: !!p.art, skip: !!(p.tap || p.confirm || p.atk) };
    if (M.held.left) inp.mx -= 1; if (M.held.right) inp.mx += 1; if (M.held.up) inp.my -= 1; if (M.held.down) inp.my += 1;
    if (M.stick) { inp.mx = Math.abs(M.stick.dx) > 0.25 ? M.stick.dx : 0; inp.my = Math.abs(M.stick.dy) > 0.25 ? M.stick.dy : 0; }
    if (M.save.opts.auto || f.auto) {
      const b = SIM.bot(s, 0.7);
      if (!inp.mx && !inp.my && !inp.atk && !inp.dodge && !inp.parry) Object.assign(inp, b, { skip: inp.skip });
    }
    if (f.noSkip) inp.skip = false;
    return inp;
  }
  function fight(ctx, dt) {
    const f = M.fight, s = f.s;
    if (M.pressed.back && !s.cine) { M.paused = !M.paused; M.menu = 0; M.pressed.back = false; }
    if (!M.paused && !M.hold) {
      f.acc += dt;
      const live = gather(f); f.pend = f.pend || {};
      for (const k of ['atk', 'dodge', 'parry', 'art', 'skip']) if (live[k]) f.pend[k] = true;
      while (f.acc >= STEP) {
        const c0 = s.cine ? s.cine.t : null, inp = Object.assign({ mx: live.mx, my: live.my }, f.pend); f.pend = {};
        SIM.step(s, STEP, inp); f.acc -= STEP;
        if (s.cine && c0 != null) for (const [n, v] of C.cues(s.cine, c0, s.cine.t)) AU.sfx(n, v);
        R.consume(s); AU.events(s.events);
        for (const e of s.events) {
          if (e.type === 'boss') { f.card = e.keys; f.cardT = 0; }
          if (e.type === 'phase' && !e.quiet) { const line = S.PHASE[e.key]; if (line) f.say = { id: e.id, key: e.key, text: line, t: 0 }; }
          if (e.type === 'art') { AU.duck(true); if (e.kind === 'ldx') M.save.seenLdx = true; }
          if (e.type === 'artEnd') { AU.duck(false); R.flash = 1; R.flashCol = '255,255,255'; R.shake = 10; if (f.theatre) f.theatreEnd = 2.2; }
          if (e.type === 'wave' && e.n > 1) f.banner = { text: 'WAVE ' + e.n, t: 0 };
          if (e.type === 'clear') f.banner = { text: f.theatre ? '' : 'HOUR CLEARED', t: 0 };
        }
        if (f.acc > STEP * 5) f.acc = 0;
      }
    }
    if (!M.save.opts.shake) R.shake = 0;
    R.drawFight(ctx, s, M.paused ? 0 : dt);
    if (s.cine) C.draw(ctx, s);
    else {
      R.drawHud(ctx, s, { touch: R.touch });
      if (f.say) {
        f.say.t += dt; const u = s.units.find((o) => o.id === f.say.id), sp = S.speaker(f.say.key);
        if (u && f.say.t < 2.6 && f.say.text !== '…') C.say(ctx, u.x - R.cam, R.FLOOR + u.y - 46 * u.scale, sp.name, sp.color, f.say.text, f.say.t, { shout: true });
        if (f.say.t > 2.6) f.say = null;
      }
      if (f.banner) { f.banner.t += dt; if (f.banner.t < 1.6 && f.banner.text) { ctx.save(); ctx.globalAlpha = Math.min(1, f.banner.t * 4, (1.6 - f.banner.t) * 3); R.text(ctx, f.banner.text, R.W / 2, 80, 14, f.banner.text === 'HOUR CLEARED' ? '#ff2a44' : '#ffffff', 'center', { outline: true }); ctx.restore(); } }
      if (f.card) { f.cardT += dt; if (f.cardT < 1.9) C.bossCard(ctx, s, f.card, f.cardT); else f.card = null; }
      if (s.time < 6 && f.stage === 0 && !R.touch && !f.theatre) { ctx.save(); ctx.globalAlpha = Math.min(1, 6 - s.time); R.text(ctx, 'J cut · K parry (white glint) · Space dash (red glint) · L moon', R.W / 2, R.H - 8, 6, '#d8c8d0', 'center'); ctx.restore(); }
      if (R.touch && !M.paused) R.drawTouch(ctx, s, { stick: M.stick, held: M.touchHeld });
      if (M.save.opts.auto) R.text(ctx, 'AUTO', R.W - 8, R.H - 6, 6, '#ff8090', 'right');
    }
    if (M.paused) pauseMenu(ctx);
    if (f.theatreEnd > 0) { f.theatreEnd -= dt; R.text(ctx, 'THEATRE', R.W / 2, R.H - 10, 7, '#ff8090', 'center'); if (f.theatreEnd <= 0) { endFight('win'); return; } }
    if (s.result && !M.paused) endFight(s.result);
  }
  function pauseMenu(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, R.W, R.H);
    R.text(ctx, 'PAUSED', R.W / 2, 60, 16, '#ff2a44', 'center');
    const items = ['RESUME', 'RESTART HOUR', `AUTO  ·  ${M.save.opts.auto ? 'ON' : 'OFF'}`, 'QUIT TO TITLE'];
    menuNav(items.length);
    const i = list(ctx, items, R.W / 2 - 50, 90, 16, 9);
    if (i === 0) M.paused = false;
    if (i === 1) startFight(M.fight.stage);
    if (i === 2) { M.save.opts.auto = !M.save.opts.auto; M.write(); }
    if (i === 3) { M.paused = false; AU.playMusic(null); M.go('title'); AU.playAmb('night'); }
  }
  function endFight(result) {
    const f = M.fight, s = f.s;
    AU.duck(false);
    if (f.theatre) { M.go('title'); AU.playMusic(null); AU.playAmb('night'); return; }
    if (result === 'lose') { M.lost = { stage: f.stage }; M.go('lost'); AU.playMusic(null); return; }
    const best = M.save.best[f.stage]; if (!best || s.time < best) M.save.best[f.stage] = Math.round(s.time * 10) / 10;
    M.result = { stage: f.stage, stats: s.stats, time: s.time };
    if (f.stage >= D.STAGES.length - 1) {
      M.save.cleared = true; M.save.stage = 0; M.save.boons = []; M.write();
      startScene(5, S.ENDING, () => { AU.playMusic(null); M.go('title'); AU.playAmb('night'); });
      return;
    }
    const pool = D.BOONS.filter((b) => M.save.boons.indexOf(b.id) < 0);
    const pick = []; while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    M.boons = pick; M.go('boon'); AU.playMusic(null); AU.playAmb('night');
  }
  function boon(ctx) {
    const st = D.STAGES[M.result.stage];
    R.drawArena(ctx, st, 120, 0.4);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, R.W, R.H);
    R.text(ctx, 'HOUR CLEARED', R.W / 2, 28, 14, '#ff2a44', 'center');
    const ss = M.result.stats;
    R.text(ctx, `${M.result.time.toFixed(1)} s  ·  ${ss.maxCombo} best combo  ·  ${ss.parries} parries  ·  ${ss.perfects} perfect dodges  ·  ${ss.arts} moon arts`, R.W / 2, 42, 6, '#d8c8d0', 'center');
    R.text(ctx, 'The moon gives you one of these.', R.W / 2, 60, 7, '#e8d8dc', 'center');
    if (M.pressed.left) M.menu = (M.menu + M.boons.length - 1) % M.boons.length;
    if (M.pressed.right) M.menu = (M.menu + 1) % M.boons.length;
    let chosen = M.pressed.confirm ? M.menu : -1;
    M.boons.forEach((b, i) => {
      const w = 108, x = R.W / 2 - (M.boons.length * (w + 8)) / 2 + i * (w + 8) + 4, y = 72, h = 100, sel = i === M.menu;
      if (M.tap && M.tap.x >= x && M.tap.x <= x + w && M.tap.y >= y && M.tap.y <= y + h) { M.menu = i; chosen = i; }
      ctx.fillStyle = sel ? '#1a0a10' : '#0c080c'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = sel ? '#ff2a44' : '#4a3038'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      R.moon(ctx, x + w / 2, y + 22, 9, sel ? '#ff2a44' : '#a02030', 'rgba(255,40,60,0.15)');
      R.text(ctx, b.name.toUpperCase(), x + w / 2, y + 46, 8, '#ffffff', 'center');
      R.wrap(ctx, b.desc, 6, w - 12).forEach((l, j) => R.text(ctx, l, x + w / 2, y + 60 + j * 9, 6, '#c8b8c0', 'center'));
    });
    if (M.save.boons.length) R.text(ctx, 'Carried: ' + M.save.boons.map((id) => D.BOONS.find((b) => b.id === id).name).join(' · '), R.W / 2, R.H - 14, 6, '#8a7a82', 'center');
    if (chosen < 0) return;
    AU.sfx('allout', 0.4);
    M.save.boons.push(M.boons[chosen].id); M.save.stage = M.result.stage + 1; M.write();
    startScene(M.save.stage);
  }
  function lost(ctx) {
    const st = D.STAGES[M.lost.stage];
    R.drawArena(ctx, st, 100, 1);
    ctx.fillStyle = 'rgba(30,0,6,0.78)'; ctx.fillRect(0, 0, R.W, R.H);
    R.text(ctx, 'YOU FELL', R.W / 2, 70, 20, '#ff2a44', 'center');
    R.text(ctx, '"Then fall forward."', R.W / 2, 86, 8, '#e8c8d0', 'center');
    R.text(ctx, 'Nothing is lost. Your boons stay with you.', R.W / 2, 100, 6, '#a898a0', 'center');
    const items = ['TRY THE HOUR AGAIN', 'TITLE'];
    menuNav(items.length);
    const i = list(ctx, items, R.W / 2 - 46, 130, 16, 9);
    if (i === 0) startFight(M.lost.stage);
    if (i === 1) { M.go('title'); AU.playAmb('night'); }
  }

  // The theatre: the last hour, the First Cut alone, the knight at a quarter health, the moon full.
  function theatre() {
    startFight(5, { theatre: true, noSkip: false });
    const s = M.fight.s;
    s.wave = s.waves.length - 2; s.waveT = 0;
    SIM.step(s, STEP, {}); s.freeze = 0; M.fight.card = null;
    const boss = SIM.foes(s)[0]; if (boss) { boss.x = s.hero.x + 70; boss.face = -1; }
    s.hero.hp = Math.round(s.hero.maxHp * 0.25); s.moon = 100;
    R.cam = Math.max(0, s.hero.x - R.W / 2 + 35);
    M.fight.theatreT = 0.6;
  }

  function loading(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, R.W, R.H);
    R.moon(ctx, R.W / 2, R.H / 2 - 10, 16, '#ff2a44');
    ctx.fillStyle = '#ff2a44'; ctx.fillRect(R.W / 2 - 50, R.H / 2 + 20, Math.round(100 * M.progress), 1);
  }

  // ---- loop ---------------------------------------------------------------------------------------
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; M.t += dt; R.t += dt;
    const ctx = R.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (M.state === 'fight' && M.fight.theatreT > 0) { M.fight.theatreT -= dt; if (M.fight.theatreT <= 0) SIM.startArt(M.fight.s); }
    switch (M.state) {
      case 'load': loading(ctx); break;
      case 'title': title(ctx, dt); break;
      case 'settings': settings(ctx); break;
      case 'credits': credits(ctx); break;
      case 'scene': scene(ctx, dt); break;
      case 'fight': fight(ctx, dt); break;
      case 'boon': boon(ctx); break;
      case 'lost': lost(ctx); break;
    }
    M.pressed = {}; M.tap = null;
    R.present();
    requestAnimationFrame(frame);
  }

  async function boot() {
    R.init(document.getElementById('game'));
    const c = R.canvas;
    c.addEventListener('pointerdown', onDown); c.addEventListener('pointermove', onMove); c.addEventListener('pointerup', onUp); c.addEventListener('pointercancel', onUp);
    requestAnimationFrame(frame);
    const ids = new Set([D.HERO.set, D.LYS.set]); for (const k in D.FOES) ids.add(D.FOES[k].set);
    await A.load([...ids], (p) => { M.progress = p; });
    applyOpts();
    if (params.has('auto')) M.save.opts.auto = true;
    if (params.has('theatre')) theatre();
    else if (params.has('stage')) startFight(Math.max(0, Math.min(5, +params.get('stage') || 0)));
    else if (params.has('scene')) startScene(Math.max(0, Math.min(5, +params.get('scene') || 0)));
    else { M.go('title'); AU.playAmb('night'); }
  }
  M.startFight = startFight; M.startScene = startScene; M.theatre = theatre;
  boot();
})();
