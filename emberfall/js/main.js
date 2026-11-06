// EMBERFALL — the loop, input, the state machine, save and load.
(function () {
  const EF = window.EF; const D = EF.DATA; const S = EF.STORY; const R = EF.R; const U = EF.UI; const A = EF.audio;
  const SAVE = 'emberfall.save.v1';
  const M = EF.main = { state: 'loading', t: 0, frac: 0, G: null, combat: null, scene: null, res: null, keys: {}, pressed: {}, stick: null, held: {}, lastHold: {}, fightCtx: null };

  // ---- save -------------------------------------------------------------------------------
  function freshGame() {
    return { started: false, roster: [], heroes: {}, gold: 60, potions: 2, inventory: {}, progress: { a1: 'open' }, sel: 'a1', tab: 'PARTY', selHero: 'rook', actsDone: 0, settings: { music: true, sfx: true, skip: false, auto: false, touch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0 } };
  }
  function addHero(G, id) { if (G.roster.includes(id)) return; G.roster.push(id); G.heroes[id] = { level: 1, xp: 0, points: 0, items: { weapon: null, armor: null, trinket: null }, talents: {} }; }
  M.save = () => { try { localStorage.setItem(SAVE, JSON.stringify(M.G)); } catch (e) { /* private mode */ } };
  M.load = () => { try { const s = localStorage.getItem(SAVE); if (s) { const g = JSON.parse(s); const f = freshGame(); g.settings = { ...f.settings, ...(g.settings || {}) }; return g; } } catch (e) { } return freshGame(); };

  // ---- flow -------------------------------------------------------------------------------
  M.go = function (state) { M.state = state; U.clear(); U.hover = null; };
  M.newGame = function () { M.G = freshGame(); M.G.started = true; addHero(M.G, 'rook'); M.save(); M.startAct('a1'); };
  M.startAct = function (actId) { const a = S.actById(actId); M.stage = { act: actId, step: 'open' }; for (const h of a.party) addHero(M.G, h); M.G.sel = actId; M.save(); M.runStep(); };
  M.runStep = function () {
    const a = S.actById(M.stage.act); const st = M.stage.step;
    if (st === 'open' || st === 'mid' || st === 'end') {
      if (M.G.settings.skip) { M.afterScene(); return; }
      M.scene = new EF.ScenePlayer(a[st], M.G.roster); A.playMusic(null); A.playAmb(A.ambFor(S.PLACES[a[st].place].weather)); M.go('scene'); return;
    }
    if (st === 'fight1' || st === 'boss') M.startFight(a, a[st], st === 'boss');
  };
  M.afterScene = function () {
    const a = S.actById(M.stage.act); const st = M.stage.step;
    if (st === 'open') { M.stage.step = 'fight1'; return M.runStep(); }
    if (st === 'mid') { M.stage.step = 'boss'; return M.runStep(); }
    if (st === 'end') { // act complete
      const G = M.G; if (G.progress[a.id] !== 'done') { G.progress[a.id] = 'done'; G.actsDone++; const i = S.ACTS.indexOf(a); if (S.ACTS[i + 1] && G.progress[S.ACTS[i + 1].id] !== 'done') { G.progress[S.ACTS[i + 1].id] = 'open'; G.sel = S.ACTS[i + 1].id; } }
      M.save(); if (a.final) { M.go('credits'); A.playMusic(null); return; } M.go('map'); A.playMusic(null); A.playAmb('night'); return;
    }
  };
  M.partyFor = function (ids) { return ids.filter(id => M.G.roster.includes(id)).map(id => { const hs = M.G.heroes[id]; return { id, level: hs.level, items: hs.items, talents: hs.talents }; }); };
  M.startFight = function (act, fight, boss, hunt) {
    const party = M.partyFor(act.party); const level = M.G.heroes.rook.level;
    M.fightCtx = { act, fight, boss: !!boss, hunt: !!hunt, place: act.place };
    M.combat = new EF.Combat({ party, waves: fight.waves, seed: (Date.now() & 0xffff) + 1, level, potions: M.G.potions, intro: fight.intro, auto: M.G.settings.auto, width: R.WORLD.w, height: R.WORLD.h });
    R.cam.x = R.WORLD.w / 2; R.cam.y = R.WORLD.h / 2; R.cam.zoom = 1; M.go('fight'); A.playMusic('heartfelt_battle'); A.playAmb(A.ambFor(S.PLACES[act.place].weather));
  };
  M.hunt = function (actId) { const a = S.actById(actId); const pool = S.HUNTS[actId]; const r = () => pool[Math.floor(Math.random() * pool.length)]; const waves = [[r(), r()], [r(), r(), r()], [r(), r(), r(), r()]]; M.stage = { act: actId, step: 'hunt' }; M.startFight(a, { waves, intro: 'HUNT · ' + a.name.toUpperCase() }, false, true); };
  M.endFight = function () {
    const c = M.combat; const ctx = M.fightCtx; const G = M.G; G.potions = c.potions; const res = { result: c.result, stats: c.stats, place: ctx.place, boss: ctx.boss, bossName: c.boss ? c.boss.name : '' };
    if (c.result === 'win') {
      const xp = c.stats.xp; res.xp = xp; res.gold = c.stats.gold; G.gold += c.stats.gold; res.levels = [];
      for (const p of c.heroes) { const hs = G.heroes[p.id]; hs.xp += xp; let ups = 0; while (hs.xp >= D.xpForLevel(hs.level)) { hs.xp -= D.xpForLevel(hs.level); hs.level++; hs.points++; ups++; } res.levels.push({ id: p.id, level: hs.level, ups, frac: hs.xp / D.xpForLevel(hs.level) }); }
      // loot
      const tier = S.ACTS.indexOf(ctx.act); const pool = D.ITEM_ORDER.filter(id => { const it = D.ITEMS[id]; return it.slot !== 'use' && it.price <= 120 + tier * 180; });
      if (ctx.boss || Math.random() < 0.4) { const id = pool[Math.floor(Math.random() * pool.length)]; G.inventory[id] = (G.inventory[id] || 0) + 1; res.loot = D.ITEMS[id]; }
      if (Math.random() < 0.5) { G.potions++; }
      const s = c.stats; const score = (s.maxCombo >= 15 ? 1 : 0) + (s.perfect >= 2 ? 1 : 0) + (s.taken < s.dmg * 0.25 ? 1 : 0) + (s.time < 60 ? 1 : 0); res.rank = ['C', 'B', 'A', 'S', 'S+'][score];
    }
    M.res = res; M.save(); M.go('results'); A.playMusic(null);
  };
  M.afterResults = function () {
    if (M.res.result !== 'win') return; if (M.fightCtx.hunt) { M.go('map'); A.playAmb('night'); return; }
    M.stage.step = M.stage.step === 'fight1' ? 'mid' : 'end'; M.runStep();
  };

  // ---- actions for the screens --------------------------------------------------------------
  const actions = {
    title: { newGame: () => M.newGame(), cont: () => { M.go('map'); A.playAmb('night'); }, settings: () => { M.back = 'title'; M.go('settings'); }, credits: () => { M.back = 'title'; M.go('credits'); } },
    map: { select: id => { M.G.sel = id; }, play: id => M.startAct(id), hunt: id => M.hunt(id), camp: () => { M.go('camp'); }, title: () => { M.go('title'); } },
    camp: { tab: t => { M.G.tab = t; }, back: () => { M.save(); M.go('map'); }, selHero: id => { M.G.selHero = id; },
      talent: (id, tid) => { const hs = M.G.heroes[id]; if (hs.points > 0 && (hs.talents[tid] || 0) < 3) { hs.points--; hs.talents[tid] = (hs.talents[tid] || 0) + 1; A.sfx('magic', 0.5); M.save(); } },
      cycleGear: (id, slot) => { const G = M.G; const hs = G.heroes[id]; const cur = hs.items[slot]; const owned = D.ITEM_ORDER.filter(k => D.ITEMS[k].slot === slot && (G.inventory[k] || 0) > 0); const opts = [null, ...owned]; const i = opts.indexOf(cur); const nxt = opts[(i + 1) % opts.length]; if (cur) G.inventory[cur] = (G.inventory[cur] || 0) + 1; if (nxt) G.inventory[nxt]--; hs.items[slot] = nxt; A.sfx('clang_0', 0.3); M.save(); },
      buy: id => { const G = M.G; const it = D.ITEMS[id]; if (G.gold < it.price) return; G.gold -= it.price; if (it.slot === 'use') G.potions++; else G.inventory[id] = (G.inventory[id] || 0) + 1; A.sfx('magic', 0.4); M.save(); } },
    results: { cont: () => M.afterResults(), retry: () => { const ctx = M.fightCtx; M.startFight(ctx.act, ctx.fight, ctx.boss, ctx.hunt); }, camp: () => { M.go('camp'); } },
    pause: { resume: () => M.go('fight'), auto: () => { M.G.settings.auto = !M.G.settings.auto; M.combat.auto = M.G.settings.auto; M.save(); }, settings: () => { M.back = 'pause'; M.go('settings'); }, leave: () => { M.G.potions = M.combat.potions; M.save(); M.go('map'); A.playMusic(null); A.playAmb('night'); } },
    settings: { toggle: k => { const s = M.G.settings; s[k] = !s[k]; if (k === 'music') { A.vol = s.music ? 1 : 0; A.setVolume(A.vol); } if (k === 'sfx') A.sfxVol = s.sfx ? 1 : 0; if (k === 'touch') R.touch = s.touch; if (k === 'auto' && M.combat) M.combat.auto = s.auto; M.save(); }, back: () => M.go(M.back || 'title') },
    credits: { back: () => M.go(M.back || 'title') },
  };

  // ---- input --------------------------------------------------------------------------------
  const KEYMAP = { KeyJ: 'attack', KeyK: 'heavy', Space: 'dodge', KeyL: 'special', KeyQ: 'surge', Tab: 'switch', KeyE: 'potion', Escape: 'pause', Enter: 'enter', ShiftLeft: 'dodge', KeyU: 'special', KeyI: 'heavy' };
  window.addEventListener('keydown', e => { A.unlock(); M.keys[e.code] = true; const k = KEYMAP[e.code]; if (k) { if (!M.held[k]) M.pressed[k] = true; M.held[k] = true; } if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (M.state === 'scene' && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ')) M.scene.tap(); });
  window.addEventListener('keyup', e => { M.keys[e.code] = false; const k = KEYMAP[e.code]; if (k) M.held[k] = false; });
  const pointers = {};
  function onDown(e) {
    A.unlock(); const p = R.toBuf(e.clientX, e.clientY); pointers[e.pointerId] = p;
    if (M.state === 'fight' && !M.combat.result) {
      const L = R.touchLayout(); if (R.touch) { if (Math.hypot(p.x - L.stick.x, p.y - L.stick.y) < L.stick.r + 20 && M.stick == null) { M.stick = e.pointerId; R.stickPos = p; return; }
        for (const b of L.buttons) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 4) { M.pressed[b.id] = true; M.held[b.id] = true; pointers[e.pointerId].btn = b.id; return; } }
      if (p.x < 60 && p.y < 20 + M.combat.heroes.length * 30) { const i = Math.floor((p.y - 6) / 30); if (M.combat.heroes[i] && !M.combat.heroes[i].dead) M.combat.host = i; return; }
      if (p.x > R.W - 30 && p.y < 24) { M.go('pause'); return; }
      if (!R.touch) { M.pressed.attack = true; return; }
      return;
    }
    if (M.state === 'scene') { if (p.x > R.W - 40 && p.y > R.H - 20) M.scene.skip(); else M.scene.tap(); return; }
    const b = U.hit(p.x, p.y); if (b) { A.sfx('step_0', 0.3); b.onClick(); U.clear(); }
  }
  function onMove(e) { const p = R.toBuf(e.clientX, e.clientY); if (M.stick === e.pointerId) { const L = R.touchLayout(); const dx = p.x - L.stick.x, dy = p.y - L.stick.y; const d = Math.hypot(dx, dy); const k = Math.min(1, d / L.stick.r); R.stickPos = { x: L.stick.x + dx / (d || 1) * Math.min(d, L.stick.r), y: L.stick.y + dy / (d || 1) * Math.min(d, L.stick.r) }; M.stickVec = d > 6 ? { x: dx / d * k, y: dy / d * k } : null; } else if (!R.touch) { const b = U.hit(p.x, p.y); U.hover = b ? b.label : null; } }
  function onUp(e) { if (M.stick === e.pointerId) { M.stick = null; M.stickVec = null; R.stickPos = null; } const q = pointers[e.pointerId]; if (q && q.btn) M.held[q.btn] = false; delete pointers[e.pointerId]; }
  function readInput(dt) {
    const k = M.keys; let mx = 0, my = 0; if (k.KeyA || k.ArrowLeft) mx -= 1; if (k.KeyD || k.ArrowRight) mx += 1; if (k.KeyW || k.ArrowUp) my -= 1; if (k.KeyS || k.ArrowDown) my += 1;
    if (M.stickVec) { mx = M.stickVec.x; my = M.stickVec.y; }
    const inp = { mx, my }; for (const key of ['attack', 'heavy', 'dodge', 'special', 'surge', 'switch', 'potion']) { inp[key] = !!M.pressed[key]; }
    // holding attack repeats
    for (const key of ['attack', 'heavy']) { if (M.held[key]) { M.lastHold[key] = (M.lastHold[key] || 0) + dt; if (M.lastHold[key] > 0.22) { M.lastHold[key] = 0; inp[key] = true; } } else M.lastHold[key] = 0; }
    return inp;
  }

  // ---- loop ---------------------------------------------------------------------------------
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000 || 0.016); last = now; M.t += dt; const ctx = R.ctx; const G = M.G; U.clear();
    switch (M.state) {
      case 'loading': U.loading(ctx, M.frac); break;
      case 'title': U.title(ctx, G, M.t, actions.title); if (M.pressed.enter) (G.started ? actions.title.cont : actions.title.newGame)(); break;
      case 'map': U.map(ctx, G, M.t, actions.map); break;
      case 'camp': U.camp(ctx, G, M.t, actions.camp); break;
      case 'settings': U.settings(ctx, G, M.t, actions.settings); break;
      case 'credits': U.credits(ctx, G, M.t, actions.credits); if (M.pressed.pause) actions.credits.back(); break;
      case 'results': U.results(ctx, G, M.res, M.t, actions.results); if (M.pressed.enter) (M.res.result === 'win' ? actions.results.cont : actions.results.retry)(); break;
      case 'scene': { const sc = M.scene; sc.update(dt); sc.draw(ctx); if (M.pressed.pause) sc.skip(); if (sc.done) { M.scene = null; M.afterScene(); } break; }
      case 'pause': R.drawFight(ctx, M.combat, M.fightCtx.place, M.t); U.pause(ctx, G, M.t, actions.pause); if (M.pressed.pause) actions.pause.resume(); break;
      case 'fight': { const c = M.combat; if (M.pressed.pause) { M.go('pause'); break; }
        const inp = readInput(dt); c.step(dt, inp); for (const ev of c.drainEvents()) A.onEvent(ev);
        R.drawFight(ctx, c, M.fightCtx.place, M.t); R.text(ctx, 'II', R.W - 12, 14, 10, 'rgba(255,255,255,0.6)', 'center', { bold: true });
        if (c.result && c.resultT > (c.result === 'win' ? 2.2 : 1.6)) M.endFight(); break; }
    }
    M.pressed = {}; R.present(); requestAnimationFrame(frame);
  }
  M.boot = async function () {
    R.init(document.getElementById('game')); M.G = M.load(); R.touch = M.G.settings.touch; A.vol = M.G.settings.music ? 1 : 0; A.sfxVol = M.G.settings.sfx ? 1 : 0;
    const c = document.getElementById('game'); c.addEventListener('pointerdown', onDown); window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);
    c.addEventListener('contextmenu', e => e.preventDefault());
    requestAnimationFrame(frame);
    try { await EF.load(D.SETS, f => { M.frac = f; }); } catch (e) { console.error(e); R.ctx.fillStyle = '#300'; R.ctx.fillRect(0, 0, R.W, R.H); R.text(R.ctx, 'Could not load assets: ' + e.message, 10, 40, 8, '#fff'); return; }
    M.go('title');
  };
  window.addEventListener('load', M.boot);
})();
