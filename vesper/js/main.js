// VESPER — the loop, input, saves and the flow: title, scenes, fights, the boon pick, defeat, the
// ending, settings, credits and the theatre (the Last Ditch Effort on demand).
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A, R = VS.R, S = VS.STORY, AU = VS.audio, SIM = VS.sim, U = VS.ui;
  const M = VS.main = { state: 'load', t: 0, pressed: {}, held: {}, stick: null, touchHeld: {} };
  const STEP = 1 / 60;
  const params = new URLSearchParams(location.search);

  // ---- save -----------------------------------------------------------------------------------
  // The profile (progress.js) plus the options. Saves from before the campaign keep their options.
  const PR = VS.PROG, KEY = 'vesper.save.v2', OLD = 'vesper.save.v1';
  const defOpts = () => ({ music: 1, sfx: 1, shake: 1, auto: false });
  const fresh = (opts) => Object.assign(PR.fresh(), { opts: opts || defOpts(), seenLdx: false });
  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 2) return Object.assign(fresh(), j, { opts: Object.assign(defOpts(), j.opts) }); } catch (e) { /* storage blocked */ }
    try { const o = JSON.parse(localStorage.getItem(OLD)); if (o && o.opts) return fresh(Object.assign(defOpts(), o.opts)); } catch (e) { /* none */ }
    return fresh();
  }
  M.write = () => { try { localStorage.setItem(KEY, JSON.stringify(M.save)); } catch (e) { /* storage blocked */ } };
  M.save = load();
  const applyOpts = () => { AU.sfxVol = M.save.opts.sfx; AU.setVolume(M.save.opts.music); };

  // ---- input --------------------------------------------------------------------------------------
  // PC: left mouse cuts, right mouse is the heavy, the mouse aims. Keys: J cut, K heavy, Q/Shift/L parry, Space dash, E/R moon.
  const KEYS = { KeyJ: 'atk', KeyZ: 'atk', KeyK: 'heavy', KeyX: 'heavy', KeyQ: 'parry', ShiftLeft: 'parry', ShiftRight: 'parry', KeyL: 'parry', Space: 'dodge', KeyC: 'dodge', KeyE: 'art', KeyV: 'art', KeyR: 's1', KeyF: 's2', Digit1: 's1', Digit2: 's2',
    Enter: 'confirm', Escape: 'back', KeyP: 'back', ArrowLeft: 'left', ArrowRight: 'right', KeyA: 'left', KeyD: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyW: 'up', KeyS: 'down' };
  addEventListener('keydown', (e) => {
    AU.unlock();
    if (M.state === 'map' && mapKey(e)) return;
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
    if (M.state === 'map') { pointers[e.pointerId].role = 'map'; VS.MAP.down(p.x, p.y); return; }
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
    if (M.state === 'map') { const p = R.toDev(e.clientX, e.clientY); VS.MAP.move(p.x, p.y); return; }
    const q = pointers[e.pointerId]; if (!q || q.role !== 'stick' || !M.stick) return;
    const p = R.toDev(e.clientX, e.clientY), dx = p.x - M.stick.ox, dy = p.y - M.stick.oy, r = 36 * R.k, n = Math.hypot(dx, dy);
    M.stick.dx = n > r ? dx / n : dx / r; M.stick.dy = n > r ? dy / n : dy / r;
  }
  function onUp(e) {
    const q = pointers[e.pointerId]; if (!q) return;
    if (q.role === 'map') { const p = R.toDev(e.clientX, e.clientY); VS.MAP.up(p.x, p.y); delete pointers[e.pointerId]; return; }
    if (q.role === 'stick') M.stick = null; else if (q.role) M.touchHeld[q.role] = false;
    delete pointers[e.pointerId];
  }

  M.go = function (state) { M.state = state; M.t = 0; M.pressed = {}; if (R.hideCine) R.hideCine(); };

  // ---- menus -----------------------------------------------------------------------------------------
  const P = () => M.save;
  const hasProgress = () => Object.keys(P().nodes).length > 0;
  function title(confirmNew) {
    M.go('title'); AU.playMusic(null); AU.playAmb('night');
    const p = P(), n = PR.node(PR.nextNode(p));
    U.title({ cont: hasProgress() ? `Level ${p.lvl} · Act ${PR.ACTS[n.act].num}, ${PR.ACTS[n.act].name}` : null, confirmNew,
      onContinue: () => map(),
      onNew: () => { if (hasProgress() && !confirmNew) return title(true); const o = P().opts; M.save = fresh(o); M.write(); newGame(); },
      onTheatre: () => theatre(), onSettings: () => settings(null, false, title), onCredits: () => { M.go('menu'); U.credits({ onBack: () => title() }); } });
  }
  function settings(focus, confirmReset, back) {
    M.go('menu'); back = back || title;
    U.settings({ opts: P().opts, focus, confirmReset, onBack: () => { M.write(); back(); },
      set: (k) => {
        const o = P().opts, idx = { music: 0, sfx: 1, shake: 2, auto: 3, reset: 4 }[k];
        if (k === 'music') o.music = o.music === 1 ? 0.5 : o.music === 0.5 ? 0 : 1;
        if (k === 'sfx') o.sfx = o.sfx ? 0 : 1;
        if (k === 'shake') o.shake = o.shake ? 0 : 1;
        if (k === 'auto') o.auto = !o.auto;
        if (k === 'reset') { if (!confirmReset) return settings(idx, true, back); M.save = fresh(o); M.write(); return title(); }
        applyOpts(); M.write(); settings(idx, false, back);
      } });
  }
  // A new game: the prologue, then the first trial.
  // The opening's risen dead are turned townsfolk: load them first.
  const OPENING_SETS = ['vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013', 'vh_skeleton_002', 'vh_barbarian_002'];
  function newGame() {
    const play = () => startScene(0, S.PROLOGUE, () => playNode('a0-t', true)), miss = OPENING_SETS.filter((id) => !A.hasSet(id));
    if (!miss.length) return play();
    M.go('load'); U.loading(0); A.loadSets(miss, (f) => U.loading(f)).then(() => { A.warm(R.ctx); U.hide(); play(); }, () => { U.hide(); play(); });
  }

  // ---- the map hub -------------------------------------------------------------------------------------
  function map(sel) {
    const p = P(); M.mapSel = sel || M.mapSel || PR.nextNode(p);
    if (M.state !== 'map') { M.go('map'); VS.MAP.open(p, M.mapSel); AU.playMusic(null); AU.playAmb('wind');
      A.loadSets(PR.CHAMPS.flat().map((k) => D.FOES[k].set).filter((id) => !A.hasSet(id))).catch(() => {}); }   // the champions shown on the map
    VS.MAP.sel = M.mapSel; VS.MAP.p = p;
    VS.MAP.onSelect = (id) => { AU.sfx('step_0', 0.5); map(id); };
    U.map({ p, sel: M.mapSel, onGo: () => playNode(M.mapSel), onSkills: () => skills(), onHeroes: () => roster(() => map()),
      onMenu: () => { M.go('menu'); U.menu({ onBack: () => map(), onSettings: () => settings(null, false, () => map()), onTitle: () => title() }); } });
  }
  function mapKey(e) {
    if (U.current !== 'map') return false;
    const p = P(), open = PR.NODES.filter((n) => PR.state(p, n.id) !== 'locked'), i = open.findIndex((n) => n.id === M.mapSel);
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); const n = open[Math.min(open.length - 1, i + 1)]; if (n) { VS.MAP.focus(n.id); map(n.id); } return true; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); const n = open[Math.max(0, i - 1)]; if (n) { VS.MAP.focus(n.id); map(n.id); } return true; }
    if (e.code === 'KeyK') { e.preventDefault(); skills(); return true; }
    if (e.code === 'KeyH') { e.preventDefault(); roster(() => map()); return true; }
    return false;
  }
  function skills(flash, confirm) {
    M.go('menu'); const p = P();
    U.skills({ p, flash, confirm,
      onBuy: (id) => { if (PR.buy(p, id)) { AU.sfx('allout', 0.5); M.write(); skills(id); } else AU.sfx('thud', 0.5); },
      onRespec: () => { if (!confirm) return skills(null, true); PR.respec(p); M.write(); AU.sfx('magic', 0.5); skills(); },
      onBack: () => map() });
  }
  function roster(back) {
    M.go('menu'); const p = P();
    U.roster({ p, onBack: back, pick: (id) => { p.hero = id; M.write(); AU.sfx('allout', 0.5); back(); } });
  }

  // ---- playing a node ----------------------------------------------------------------------------------
  // Shrines pay out at once. Fights play the act's intro the first time you climb into it, the
  // guardian's intro before its fight, then the fight.
  function playNode(id, skipIntro) {
    const p = P(), n = PR.node(id); if (!n || PR.state(p, id) === 'locked') return;
    if (n.type === 'shrine') {
      const r = PR.claimShrine(p, id); if (!r) return; M.write(); AU.sfx('allout', 0.7);
      M.go('result'); M.result = { stage: PR.ACTS[n.act].stage };
      U.result({ p, node: n, win: true, r: Object.assign({ goals: [], stars: [] }, r), stats: null, buttons: [{ label: 'Continue', act: () => map(PR.nextNode(p)) }] });
      return;
    }
    A.loadSets(missingFor(PR.build(n))).catch(() => {}); A.loadIso(isoFor(PR.build(n).stage)).catch(() => {});   // start loading the army and the tiles while the scene plays
    const Ac = S.ACTS[n.act] || {}, scenes = [], bd = PR.build(n);
    // The act's intro casts a few of the army this fight will bring (in the looks it will wear).
    const army = PR.foeKeys(bd).filter((k) => !D.FOES[k].boss && D.FOES[k].set.startsWith('vh_')).slice(0, 3).map((k) => ({ key: k, set: ((bd.node.variants || {})[k] || [D.FOES[k].set])[0] }));
    if (!skipIntro && Ac.intro && !p.seen['act' + n.act]) { scenes.push(Object.assign({}, Ac.intro, { army })); p.seen['act' + n.act] = true; }
    if (n.type === 'boss' && Ac.boss) scenes.push(Ac.boss);
    M.write();
    const run = () => { if (!scenes.length) return startNode(id); startScene(PR.ACTS[n.act].stage, scenes.shift(), run); };
    run();
  }
  const TIPS = {
    heavy: (H) => ['NEW ABILITY · HEAVY ATTACK', `${R.touch ? 'Tap HEAVY' : 'Right click'}: ${H.heavy && H.heavy.bolt ? 'a fan of blades' : 'a heavy blow all around you'}. It breaks guards and staggers.`],
    dodge: () => ['NEW ABILITY · DODGE', `${R.touch ? 'Tap DASH' : 'Space'} to dash through danger. Cut right after a dodge for a dash-cut.`],
    parry: () => ['NEW ABILITY · PARRY', `${R.touch ? 'Tap PARRY' : 'Q'} as a white flash lands to turn the blow aside. Red attacks cannot be parried: dodge those.`],
    skill1: (H) => ['NEW SKILL · ' + H.skills[0].name.toUpperCase(), `${R.touch ? 'The first skill button' : 'R'} uses it. It recharges after each use.`],
    skill2: (H) => ['NEW SKILL · ' + H.skills[1].name.toUpperCase(), `${R.touch ? 'The second skill button' : 'F'} uses it.`],
    art: () => ['NEW ABILITY · MOON ART', `When the moon gauge is full, ${R.touch ? 'tap the moon' : 'press E'} for your ultimate. Use it at low health for the strongest version.`],
  };
  const TUT = [
    { title: 'TRIAL · MOVE', text: () => (R.touch ? 'Drag the left side of the screen to move.' : 'Use WASD to move.') },
    { title: 'TRIAL · CUT', text: () => (R.touch ? 'Tap the big button to cut, again and again for a combo. Destroy a training husk.' : 'Left click to cut; keep clicking for a combo. Aim with the mouse. Destroy a training husk.') },
    { title: 'TRIAL · HEAVY', text: () => (R.touch ? 'Tap HEAVY for a heavy blow all around you.' : 'Right click for a heavy blow all around you. It breaks shields.') },
    { title: 'TRIAL · DODGE', text: () => (R.touch ? 'Tap DASH to dodge. You cannot be hit while dashing.' : 'Press Space to dodge. You cannot be hit while dashing; cut right after for a dash-cut.') },
    { title: 'TRIAL · FIGHT', text: () => 'The dead are coming. Red flashes cannot be blocked: dodge them. Shields block from the front: use a heavy or get behind. Kill the Blood Husk near the others.' },
  ];
  // The sets a node's fight needs that are not loaded yet.
  const missingFor = (b) => PR.setsFor(b).filter((id) => !A.hasSet(id));
  // The tile groups an hour's arenas are built from.
  const isoFor = (stageIdx) => { const th = VS.ARENA.THEMES[D.STAGES[stageIdx].id]; return ['w', 'a', th && th.set === 'i' ? 'i' : 'd']; };
  function startNode(id) {
    const n = PR.node(id), b = PR.build(n), miss = missingFor(b), iso = isoFor(b.stage);
    const go = () => startFight(b.stage, { nodeId: id, node: n, build: b });
    if (!miss.length && A.isoReady(iso)) return go();
    M.go('load'); U.loading(0);
    Promise.all([A.loadSets(miss, (f) => U.loading(f)), A.loadIso(iso)]).then(() => { A.warm(R.ctx); A.isoWarm(R.ctx); U.hide(); go(); }, () => { U.hide(); go(); });
  }

  // ---- scenes -------------------------------------------------------------------------------------------
  function startScene(stageIdx, def, then) {
    U.hide();
    S.heroKey = P().hero || 'vesper';
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
    U.hide(); opts = opts || {};
    const p = P(), b = opts.build, kit = opts.theatre ? null : PR.kit(p);
    const s = SIM.create(stageIdx, { seed: (Date.now() & 0xffff) + 1, boons: opts.theatre ? [] : PR.passives(p), kit, hero: p.hero, node: b ? b.node : null });
    M.fight = Object.assign({ s, stage: stageIdx, acc: 0, card: null, cardT: 0, say: null, banner: null }, opts);
    M.paused = false; R.snapCam(s); R.fx = []; R.parts = []; R.floaters = []; R.pfx = []; R.entryDoor = null; R.impactF = null; R.kit = s.mods.can;
    f0 = M.fight; const n = opts.node, AR = VS.arenaOf(s);
    if (n) {
      const bossName = s.hasBoss ? (b && b.champion ? D.FOES[b.champion].name : n.echo ? n.name.replace('Echo: ', '') : n.name) : null;
      s.goal = { reach: n.type === 'trial' ? 'Finish the trial' : n.rule === 'horde' ? 'Survive the horde' : 'Clear every wave', boss: bossName ? 'Defeat ' + bossName : 'Clear every wave' };
      f0.banner = { text: n.name, sub: (n.rule ? PR.RULES[n.rule](n.n).split(':')[0].toUpperCase() + '  ·  ' : '') + AR.name + '  ·  AREA 1 / ' + s.waves.length, t: -0.4, col: '#ffffff' };
      if (n.type === 'trial') { f0.tut = { step: 0, x0: s.hero.x, y0: s.hero.y, t: 0 }; p.tips.heavy = p.tips.dodge = true; }
      f0.tips = kit.filter((k) => !p.tips[k]).map((k) => ({ id: k, t: 0 }));
    } else f0.banner = { text: AR.name, sub: 'AREA 1 / ' + s.waves.length, t: -0.4, col: '#ffffff' };
    M.go('fight'); AU.playAmb(null); AU.playMusic('heartfelt_battle');
  }
  function gather(f) {
    const s = f.s, p = M.pressed;
    const inp = { mx: 0, my: 0, atk: !!p.atk, heavy: !!p.heavy, dodge: !!p.dodge, parry: !!p.parry, art: !!p.art, s1: !!p.s1, s2: !!p.s2, skip: !!(p.tap || p.confirm || p.atk) };
    if (M.mouseAim && M.mouse && !R.touch && s.hero.alive) { const q = R.P(s.hero.x, s.hero.y, 20), g = R.screenToGround(M.mouse.x - q.x, M.mouse.y - q.y); if (Math.hypot(g.x, g.y) > 0.01) inp.aim = Math.atan2(g.y, g.x); }
    if (M.held.left) inp.mx -= 1; if (M.held.right) inp.mx += 1; if (M.held.up) inp.my -= 1; if (M.held.down) inp.my += 1;
    if (M.stick && Math.hypot(M.stick.dx, M.stick.dy) > 0.25) { inp.mx = M.stick.dx; inp.my = M.stick.dy; }
    if (inp.mx || inp.my) { const g = R.screenToGround(inp.mx, inp.my); inp.mx = g.x; inp.my = g.y; }
    if (P().opts.auto || f.auto) {
      const b = SIM.bot(s, 0.7);
      if (!inp.mx && !inp.my && !inp.atk && !inp.heavy && !inp.dodge && !inp.parry && !inp.s1 && !inp.s2) Object.assign(inp, b, { skip: inp.skip, aim: b.aim });
    }
    return inp;
  }
  function pause(on) {
    M.paused = on;
    if (!on) { U.hide(); return; }
    const f = M.fight;
    U.pause({ auto: P().opts.auto, onResume: () => pause(false), onRestart: () => (f.nodeId ? startNode(f.nodeId) : startFight(f.stage, { theatre: f.theatre })),
      onAuto: () => { P().opts.auto = !P().opts.auto; M.write(); pause(true); }, onQuit: () => { M.paused = false; if (f.theatre) title(); else map(f.nodeId); } });
  }
  // The trial's steps, checked against the fight as it plays.
  function tutorial(f) {
    const s = f.s, T = f.tut, h = s.hero, foes = SIM.foes(s);
    T.t += 1 / 60; const next = () => { T.step++; T.t = 0; AU.sfx('step_2', 0.6); };
    if (T.step === 0 && Math.hypot(h.x - T.x0, h.y - T.y0) > 60) next();
    else if (T.step === 1 && foes.filter((u) => u.key === 'dummy').length < 4 && s.wave >= 0) next();
    else if (T.step === 2 && h.state === 'attack' && h.atk === s.heroDef.heavy) next();
    else if (T.step === 3 && h.state === 'dodge') next();
    else if (T.step === 4 && T.t < 0.02) AU.sfx('horn', 0.5);
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
        if (f.tut) tutorial(f);
        if (s.cine && c0 != null) for (const [n, v] of VS.cine.cues(s.cine, c0, s.cine.t)) AU.sfx(n, v);
        R.consume(s); AU.events(s.events);
        for (const e of s.events) {
          if (e.type === 'boss') { f.card = e.keys; f.cardT = 0; }
          if (e.type === 'art') { AU.duck(true); if (e.kind === 'ldx') P().seenLdx = true; }
          if (e.type === 'artEnd') { AU.duck(false); if (f.theatre) f.theatreEnd = 2.2; }
          if (e.type === 'portal') f.banner = { text: 'THE WAY OPENS', sub: 'GO THROUGH THE PORTAL', t: 0, col: '#ffffff', low: true };
          if (e.type === 'area') { const last = s.hasBoss && e.n === s.waves.length - 1; f.banner = { text: last && s.goal ? s.goal.boss : VS.arenaOf(s).name, sub: last ? VS.arenaOf(s).name.toUpperCase() + '  ·  THE GUARDIAN' : 'AREA ' + (e.n + 1) + ' / ' + s.waves.length, t: 0, col: last ? '#ff2a44' : '#ffffff' }; }
          if (e.type === 'reinforce') f.banner = { text: 'REINFORCEMENTS', sub: e.left ? 'MORE ARE COMING' : 'THE LAST OF THEM', t: 0, col: '#ff2a44' };
          if (e.type === 'timeout') f.banner = { text: 'OUT OF TIME', t: 0, col: '#ff2a44' };
          if (e.type === 'clear' && !f.theatre) f.banner = { text: 'VICTORY', t: 0, col: '#ffd060' };
        }
        if (f.acc > STEP * 5) f.acc = 0;
      }
    }
    if (!P().opts.shake) R.shake = 0;
    if (!R.cineCovers(s)) R.drawFight(ctx, s, M.paused ? 0 : dt);
    if (s.cine) R.drawCine(ctx, s);
    else {
      if (!R.drawBossArt(s, dt)) R.hideCine();
      if (!M.paused) { R.drawHud(ctx, s, dt, { touch: R.touch, auto: P().opts.auto }); R.drawSkills(ctx, s, R.touch); }
      if (f.banner) { f.banner.t += dt; if (f.banner.t < 2.2) R.banner(ctx, f.banner.text, f.banner.t, f.banner.col, f.banner.sub, f.banner.low); else f.banner = null; }
      if (f.card) { f.cardT += dt; if (f.cardT < 1.9) R.bossCard(ctx, s, f.card, f.cardT); else f.card = null; }
      // Coaching: the trial's steps, then a card for each newly learned ability.
      if (f.banner && f.banner.t < 2.2 && !f.banner.low) { /* the coach waits for the banner */ }
      else if (f.tut && !M.paused) { const st = TUT[Math.min(4, f.tut.step)]; R.coach(ctx, { title: st.title, text: st.text(), t: f.tut.t + 0.3, step: f.tut.step, of: 5, col: '#8ad0ff' }); }
      else if (f.tips && f.tips.length && !M.paused && s.time > 1.2) {
        const tp = f.tips[0], H = s.heroDef, [tt, tx] = TIPS[tp.id](H); tp.t += dt;
        R.coach(ctx, { title: tt, text: tx, t: tp.t, life: 6 });
        if (tp.t > 6) { P().tips[tp.id] = true; M.write(); f.tips.shift(); }
      }
      if (R.touch && !M.paused) R.drawTouch(ctx, s, { stick: M.stick, held: M.touchHeld });
      if (!R.touch && M.mouseAim && M.mouse && !M.paused) R.drawReticle(ctx, M.mouse.x, M.mouse.y);
    }
    if (f.theatreEnd > 0 && !M.paused) { f.theatreEnd -= dt; if (f.theatreEnd <= 0) { title(); return; } }
    if (s.result && !M.paused) endFight(s.result);
  }
  function endFight(result) {
    const f = M.fight, s = f.s, p = P();
    AU.duck(false);
    if (f.theatre || !f.nodeId) { title(); return; }
    const n = f.node, win = result === 'win', groups = s.waves.length;
    const r = { win, time: s.time, hpFrac: s.hero.hp / s.hero.maxHp, bossHits: s.stats.bossHits, maxCombo: s.stats.maxCombo, kills: s.kills || 0, progress: (s.area + (win ? 1 : 0)) / groups };
    const res = PR.finish(p, n.id, r); M.write();
    const stats = [[s.time.toFixed(1) + 's', 'Time'], [s.stats.maxCombo, 'Best combo'], [s.kills || 0, 'Kills'], [s.stats.parries, 'Parries']];
    const showResult = () => {
      M.go('result'); M.result = { stage: f.stage }; AU.playMusic(null); AU.playAmb('night');
      const next = PR.nextNode(p);
      const btns = win ? [{ label: 'Continue', sub: n.type === 'trial' && p.sp ? 'Then open Skills: you have a skill point' : '', act: () => map(next) }, { label: 'Fight again', act: () => startNode(n.id) }]
        : [{ label: 'Try again', act: () => startNode(n.id) }].concat(p.sp ? [{ label: 'Skill tree', sub: p.sp + ' skill point' + (p.sp > 1 ? 's' : '') + ' to spend', act: () => skills() }] : [], [{ label: 'Back to the map', act: () => map(n.id) }]);
      const tip = !win ? (s.rules.time && s.time >= s.rules.time ? 'The clock ran out. Kill faster: heavy attacks and skills clear crowds.' : p.sp ? 'You have skill points to spend. New abilities make a big difference.' : !PR.kit(p).includes('dodge') ? 'Step out of reach when a foe flashes white, then strike back.' : 'Dodge through red attacks, parry the white ones. Clear easier nodes for experience.') : null;
      U.result({ p, node: n, win, r: res, stats, tip, buttons: btns });
    };
    // The First Cut falls: the ending plays first.
    if (win && n.id === 'a5-b' && !p.seen.ending) { p.seen.ending = true; M.write(); startScene(5, S.ENDING, showResult); return; }
    showResult();
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
    if (figure) R.drawFigure(ctx, (D.HEROES[M.save.hero] || D.HERO).set, 'Idle', Math.floor(M.t * 7) % 15, Math.PI, cam + vw * 0.7, 4, 1, {});
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
      case 'title': backdrop(ctx, dt, 5, true); break;
      case 'menu': backdrop(ctx, dt, 5, false); ctx.fillStyle = 'rgba(6,3,8,0.62)'; ctx.fillRect(0, 0, R.W, R.H); break;
      case 'scene': scene(ctx, dt); break;
      case 'fight': fight(ctx, dt); break;
      case 'map': VS.MAP.draw(ctx, dt); break;
      case 'result': backdrop(ctx, dt, M.result.stage, false); ctx.fillStyle = 'rgba(6,3,8,0.45)'; ctx.fillRect(0, 0, R.W, R.H); break;
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
    // At start: every hero and the original foes. The act armies (vh_*) load when a fight needs them.
    const ids = new Set([D.HERO.set, D.LYS.set, D.CLONE.set]); for (const k in D.FOES) if (!D.FOES[k].set.startsWith('vh_')) ids.add(D.FOES[k].set); for (const k in D.HEROES) ids.add(D.HEROES[k].set);
    await Promise.all([A.load([...ids], (p) => U.loading(p)), A.loadIso(['w', 'a', 'i']).catch(() => {})]);
    try { if (document.fonts) await Promise.race([Promise.all(['700 20px "Chakra Petch"', '600 16px "Chakra Petch"', '500 16px Barlow', '700 16px Barlow'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fonts optional */ }
    A.warm(R.ctx); A.isoWarm(R.ctx);
    applyOpts();
    if (params.has('auto')) M.save.opts.auto = true;
    if (params.has('hero') && D.HEROES[params.get('hero')]) M.save.hero = params.get('hero');
    if (params.has('theatre')) theatre();
    else if (params.has('stage')) startFight(Math.max(0, Math.min(5, +params.get('stage') || 0)));
    else if (params.has('node')) startNode(params.get('node'));
    else if (params.has('scene')) startScene(Math.max(0, Math.min(5, +params.get('scene') || 0)));
    else if (params.has('map')) map();
    else title();
  }
  addEventListener('wheel', (e) => { if (M.state === 'map' && !e.target.closest('.map-panel')) { VS.MAP.wheel(e.deltaY); } }, { passive: true });
  M.startFight = startFight; M.startScene = startScene; M.theatre = theatre; M.title = title; M.endFight = endFight; M.map = map; M.playNode = playNode; M.startNode = startNode; M.skills = skills; M.roster = roster;
  boot();
})();
