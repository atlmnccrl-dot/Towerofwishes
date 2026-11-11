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
  const defOpts = () => ({ music: 1, sfx: 1, shake: 1, auto: false, text: 1, safe: false, diff: 'normal', cam: 'normal', nums: false, nums2: true, auto2: true, calm: false, vibe: true, scenes: 'play' });
  // Damage numbers went off by default (the author, 2026-11-10): older saves switch them off once.
  // ?auto (for the tests) turns the bot on for this visit only; it is never saved.
  const autoOn = () => !!(P().opts.auto || M.autoUrl || M.watch);
  const fixOpts = (o) => { if (!o.nums2) { o.nums = false; o.nums2 = true; } if (!o.auto2) { o.auto = false; o.auto2 = true; } return o; };   // and auto battle starts off for everyone (2026-11-10)
  const fresh = (opts) => Object.assign(PR.fresh(), { opts: opts || defOpts(), seenLdx: false });
  function load() {
    try { const j = JSON.parse(localStorage.getItem(KEY)); if (j && j.v === 2) return VS.LOOT.migrate(Object.assign(fresh(), j, { opts: Object.assign(defOpts(), fixOpts(j.opts || {})) })); } catch (e) { /* storage blocked */ }
    try { const o = JSON.parse(localStorage.getItem(OLD)); if (o && o.opts) return fresh(Object.assign(defOpts(), fixOpts(o.opts))); } catch (e) { /* none */ }
    return fresh();
  }
  M.write = () => { try { localStorage.setItem(KEY, JSON.stringify(M.save)); } catch (e) { /* storage blocked */ } };
  M.save = load();
  // Options: sound, the size of all menu text, and the colour-safe cues (blue and orange for the parry
  // and dodge flashes instead of white and red).
  const applyOpts = () => { const o = M.save.opts; AU.sfxVol = o.sfx; AU.setVolume(o.music); document.documentElement.style.setProperty('--ui-scale', o.text || 1); R.safe = !!o.safe; R.camK = { near: 0.82, far: 1.22 }[o.cam] || 1; R.noNumbers = o.nums === false; R.calm = !!o.calm; if (R.kScale !== (o.text || 1)) { R.kScale = o.text || 1; if (R.canvas) R.resize(); } };

  // ---- input --------------------------------------------------------------------------------------
  // PC: left mouse cuts, right mouse is the heavy, the mouse aims. Keys: J cut, K heavy, Space/Shift dash, E moon, R/F skills.
  const KEYS = { KeyJ: 'atk', KeyZ: 'atk', KeyK: 'heavy', KeyX: 'heavy', ShiftLeft: 'dodge', ShiftRight: 'dodge', Space: 'dodge', KeyC: 'dodge', KeyE: 'art', KeyV: 'art', KeyR: 's1', KeyF: 's2', Digit1: 's1', Digit2: 's2',
    Enter: 'confirm', Escape: 'back', KeyP: 'back', ArrowLeft: 'left', ArrowRight: 'right', KeyA: 'left', KeyD: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyW: 'up', KeyS: 'down' };
  addEventListener('keydown', (e) => {
    if (M.watch && e.isTrusted) { e.preventDefault(); watchStop(); return; }   // any key ends watch mode
    AU.unlock();
    if (M.state === 'map' && mapKey(e)) return;
    if (U.current && U.current !== 'loading') { if (U.key(e)) return; if (e.code === 'Enter' || e.code === 'Space') return; }
    const a = KEYS[e.code]; if (!a) return; e.preventDefault();
    if (!M.held[a]) M.pressed[a] = true; M.held[a] = true;
    if (a === 'atk' || e.code === 'Space') M.pressed.confirm = true;
  });
  addEventListener('keyup', (e) => { const a = KEYS[e.code]; if (a) M.held[a] = false; });
  const pointers = {};
  // A real tap or click anywhere (the canvas or a menu) ends watch mode, and that tap does nothing else.
  addEventListener('pointerdown', (e) => { if (M.watch && e.isTrusted) { e.stopPropagation(); e.preventDefault(); watchStop(); M.swallowClick = performance.now(); } }, true);
  addEventListener('click', (e) => { if (M.swallowClick && performance.now() - M.swallowClick < 800 && e.isTrusted) { e.stopPropagation(); e.preventDefault(); M.swallowClick = 0; } }, true);
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

  // ---- the gamepad -----------------------------------------------------------------------------------
  // Standard mapping: left stick or d-pad moves, right stick aims; A cuts, X or Y heavy, B dash,
  // LB / RB the skills, either trigger the moon art, Start pauses. In menus the d-pad moves between
  // buttons, A presses and B goes back.
  const PAD = { 0: 'atk', 1: 'dodge', 2: 'heavy', 3: 'heavy', 4: 's1', 5: 's2', 6: 'art', 7: 'art', 9: 'back' };
  let padPrev = [], padNav = { t: 0, dir: null };
  M.pad = null;
  function pollPad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let g = null; for (const x of pads || []) if (x && x.connected) { g = x; break; }
    if (!g) { M.pad = null; return; }
    const btn = (i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5)), down = (i) => btn(i) && !padPrev[i];
    const ax = (i) => (Math.abs(g.axes[i] || 0) > 0.22 ? g.axes[i] : 0);
    let mx = ax(0) + (btn(15) ? 1 : 0) - (btn(14) ? 1 : 0), my = ax(1) + (btn(13) ? 1 : 0) - (btn(12) ? 1 : 0);
    const used = g.buttons.some((b) => b.pressed) || Math.abs(mx) + Math.abs(my) > 0.3;
    if (used) { if (!M.padUsed) { M.padUsed = true; R.touch = false; } AU.unlock(); }
    const ui = U.current && U.current !== 'loading';
    if (M.state === 'fight' && !ui && !M.paused) {
      M.pad = { mx, my, aim: Math.hypot(ax(2), ax(3)) > 0.4 ? { x: ax(2), y: ax(3) } : null };
      for (const i in PAD) if (down(+i)) { M.pressed[PAD[i]] = true; if (PAD[i] === 'atk') M.pressed.confirm = true; }
    } else {
      M.pad = null;
      const nav = (code) => { const e = { code, preventDefault() {} }; if (M.state === 'map' && !(U.current && U.current !== 'map')) { if (mapKey(e)) return; } U.key(e); };
      const dir = Math.abs(mx) > 0.6 || Math.abs(my) > 0.6 ? (Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'ArrowRight' : 'ArrowLeft') : (my > 0 ? 'ArrowDown' : 'ArrowUp')) : null;
      if (dir && (dir !== padNav.dir || (padNav.t -= dt) <= 0)) { padNav.t = padNav.dir === dir ? 0.14 : 0.38; padNav.dir = dir; nav(dir); } else if (!dir) padNav.dir = null;
      if (down(0)) { const a = document.activeElement; if (ui && a && a.click && a !== document.body) a.click(); else if (M.state === 'map') { const go = document.querySelector('[data-act="go"]'); if (go) go.click(); } else { M.pressed.tap = true; M.pressed.confirm = true; } }
      if (down(1) || down(9)) { if (ui && U.back) U.back(); else M.pressed.back = true; }
      if (M.state === 'map' && down(2)) gear(); if (M.state === 'map' && down(3)) skills();
    }
    padPrev = g.buttons.map((b) => b.pressed || b.value > 0.5);
  }

  M.go = function (state) { M.state = state; M.t = 0; M.pressed = {}; M.hold = false; M.menuSc = null; if (R.hideCine) R.hideCine(); };
  // The scene behind a menu page (js/menuscene.js): the page's own place, with her, her heroes and her souls in it.
  function menuScene(kind) {
    const p = P(), D0 = D; PR.soulsInit(p);
    M.menuSc = { kind, hero: p.hero, soul: p.soul, souls: Object.keys(p.souls || {}), heroes: p.heroes.slice(), locked: (D0.HERO_ORDER || []).filter((id) => p.heroes.indexOf(id) < 0) };
    const need = [D0.HEROES[p.hero] && D0.HEROES[p.hero].set].concat(M.menuSc.heroes.concat(M.menuSc.locked).map((id) => D0.HEROES[id] && D0.HEROES[id].set), M.menuSc.souls.map((id) => D0.SOULS[id].set)).filter((id, i, a) => id && a.indexOf(id) === i && !A.hasSet(id));
    if (need.length) A.loadSets(need).catch(() => {});
    if (VS.MENU && !A.isoReady(VS.MENU.need)) A.loadIso(VS.MENU.need).catch(() => {});
  }

  // ---- menus -----------------------------------------------------------------------------------------
  const P = () => M.save;
  const hasProgress = () => Object.keys(P().nodes).length > 0;
  function title(confirmNew) {
    M.go('title'); AU.cue('title'); AU.playAmb('night');
    const p = P(), n = PR.node(PR.nextNode(p));
    U.title({ cont: hasProgress() ? `Level ${p.lvl} · Act ${PR.ACTS[n.act].num}, ${PR.ACTS[n.act].name}` : null, confirmNew,
      onContinue: () => map(),
      onNew: () => { if (hasProgress() && !confirmNew) return title(true); const o = P().opts; M.save = fresh(o); M.write(); newGame(); },
      onTheatre: () => cutscenes(title), onSettings: () => settings(null, false, title), onCredits: () => { M.go('menu'); U.credits({ onBack: () => title() }); } });
  }
  // ---- Watch mode (Settings → Dev tools, or ?watch): the bot plays the campaign by itself, from wherever the save
  // is, through the fights, the story scenes, the films, the results and the map. It spends skill points and equips its
  // best gear on the way, grinds a cleared island after two defeats in a row, and stops at any key or tap.
  const WATCH_SKILLS = ['dodge', 'heavy', 'skill1', 'art', 'fourth', 'ghost', 'skill2', 'edge', 'moonblood', 'vigor', 'riposte', 'rising', 'vigor2', 'edge2', 'breath', 'thirst', 'exec', 'quick', 'iron', 'wind'];
  function watchTag(msg) {
    let el = document.getElementById('watchtag');
    if (!M.watch && !msg) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'watchtag'; Object.assign(el.style, { position: 'fixed', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 9, pointerEvents: 'none', font: '14px Adventurer, sans-serif', letterSpacing: '.12em', color: '#ffd0d6', background: 'rgba(8,4,10,.7)', border: '1px solid rgba(255,42,68,.5)', padding: '4px 12px', borderRadius: '4px' }); document.body.appendChild(el); }
    el.textContent = msg || `WATCHING THE BOT  ·  ${M.watch.speed}×  ·  ANY KEY OR TAP TO STOP`;
    if (msg) setTimeout(() => { if (!M.watch && el.textContent === msg) el.remove(); }, 4000);
  }
  function watchUpkeep() { const p = P(); for (const id of WATCH_SKILLS) PR.buy(p, id); PR.checkSouls(p); if (p.soul) while (PR.soulUp(p, p.soul)) { /* every shard into the soul at her side */ } if (VS.LOOT && VS.LOOT.autoEquip) VS.LOOT.autoEquip(p, p.hero); M.write(); }
  function watchStart(speed) {
    M.watch = { t: 0, last: '', speed: speed || 1, losses: 0, fails: {}, node: null }; watchTag(); watchUpkeep();
    if (!P().seen.lastHour) newGame(); else map();
  }
  M.watchStart = watchStart;
  function watchStop(msg) { if (!M.watch) return; M.watch = null; watchTag((msg || 'Watch mode stopped').toUpperCase()); }
  // The next island to play: the open one, or after two defeats in a row a cleared battle to grow stronger on first.
  function watchNext() {
    const p = P(), W = M.watch, open = PR.nextNode(p);
    if (W.node) { if (PR.cleared(p, W.node) || PR.node(W.node).type === 'shrine') W.losses = 0; else if (W.node === open) { W.losses++; W.fails[open] = (W.fails[open] || 0) + 1; } }
    if (W.fails[open] >= 6) { watchStop(`The bot could not clear ${PR.node(open).name} in 6 tries: watch mode stopped`); return null; }
    if (W.losses >= 2) { const done = PR.NODES.filter((n) => n.type === 'battle' && PR.cleared(p, n.id)); if (done.length) { W.losses = 0; return done[Math.floor(Math.random() * done.length)].id; } }
    return open;
  }
  function watchTick(dt) {
    const W = M.watch; if (!W) return;
    const key = M.state + '|' + (U.current || ''); if (key !== W.last) { W.last = key; W.t = 0; } W.t += dt;
    if (M.state === 'map' && W.t > 1.6) { W.t = -999; watchUpkeep(); const id = watchNext(); if (!id) return; W.node = id; M.mapSel = id; playNode(id); return; }
    if (M.state === 'scene' && W.t > 2.4) { W.t = 0; M.pressed.tap = true; return; }   // the next line of a story scene
    const screens = ['title', 'result', 'pause', 'lesson', 'lost', 'boon', 'soulbound'];
    if (U.current && screens.indexOf(U.current) >= 0 && W.t > 2.6) {
      W.t = 0; const b = document.querySelector('#ui .btn.focus-first') || document.querySelector('#ui .ls-ok') || document.querySelector('#ui .btn'); if (b) b.click();
    }
  }
  function settings(focus, confirmReset, back) {
    M.go('menu'); back = back || title;
    const toast = M.toast; M.toast = null;
    U.settings({ opts: P().opts, focus, confirmReset, toast, onBack: () => { M.write(); back(); },
      set: (k) => {
        const o = P().opts, cyc = (list, v) => list[(list.indexOf(v) + 1) % list.length];
        if (k === 'diff') o.diff = cyc(VS.MODES.DIFF_ORDER, o.diff || 'normal');
        if (k === 'text') o.text = o.text >= 1.3 ? 0.9 : o.text >= 1.15 ? 1.3 : o.text >= 1 ? 1.15 : 1;
        if (k === 'cam') o.cam = cyc(['near', 'normal', 'far'], o.cam || 'normal');
        if (k === 'scenes') o.scenes = o.scenes === 'skip' ? 'play' : 'skip';
        if (k === 'nums') o.nums = o.nums === false;
        if (k === 'calm') o.calm = !o.calm;
        if (k === 'vibe') o.vibe = o.vibe === false;
        if (k === 'safe') o.safe = !o.safe;
        if (k === 'export') { exportSave(); return settings(k, false, back); }
        if (k === 'import') { importSave(() => settings(k, false, back)); return; }
        if (k === 'music') o.music = o.music === 1 ? 0.5 : o.music === 0.5 ? 0 : 1;
        if (k === 'sfx') o.sfx = o.sfx ? 0 : 1;
        if (k === 'shake') o.shake = o.shake ? 0 : 1;
        if (k === 'auto') o.auto = !o.auto;
        if (k === 'watch') { M.write(); return watchStart(o.watchSpeed || 1); }
        if (k === 'watchSpeed') o.watchSpeed = { 1: 2, 2: 4, 4: 1 }[o.watchSpeed || 1];
        if (k === 'reset') { if (!confirmReset) return settings(k, true, back); M.save = fresh(o); M.write(); return title(); }
        if (k === 'theatre') { M.write(); return cutscenes(() => settings('theatre', false, back)); }
        applyOpts(); M.write(); settings(k, false, back);
      } });
  }
  // Saves out of the browser: a file to download (or a code on the clipboard), and back in.
  function exportSave() {
    const txt = 'VESPER1:' + btoa(unescape(encodeURIComponent(JSON.stringify(M.save))));
    try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = 'vesper-save-' + new Date().toISOString().slice(0, 10) + '.txt'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (e) { /* no downloads */ }
    try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch (e) { /* no clipboard */ }
    M.toast = 'Save exported: a file was downloaded and the code copied.';
  }
  M.readSave = function (txt) {
    txt = String(txt || '').trim(); if (!txt.startsWith('VESPER1:')) return null;
    try { const j = JSON.parse(decodeURIComponent(escape(atob(txt.slice(8))))); if (!j || j.v !== 2 || !j.nodes) return null; return VS.LOOT.migrate(Object.assign(fresh(), j, { opts: Object.assign(defOpts(), fixOpts(j.opts || {})) })); } catch (e) { return null; }
  };
  function importSave(done) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.txt,text/plain';
    const take = (txt) => { const p = M.readSave(txt); if (p) { M.save = p; M.write(); applyOpts(); M.toast = 'Save loaded: level ' + p.lvl + '.'; } else M.toast = 'That is not a Vesper save.'; done(); };
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return done(); const r = new FileReader(); r.onload = () => take(r.result); r.readAsText(f); };
    // No file picker (some phones): paste the code instead.
    inp.oncancel = () => done();
    try { inp.click(); } catch (e) { const t = prompt('Paste your Vesper save code'); take(t); }
  }
  // A new game: the prologue, then the first trial.
  // The opening's risen dead are turned townsfolk: load them first.
  const OPENING_SETS = ['vh_firstcut', 'vh_townsfolk_001', 'vh_townsfolk_004', 'vh_townsfolk_007', 'vh_townsfolk_010', 'vh_townsfolk_013', 'vh_skeleton_002', 'vh_barbarian_002'];
  function newGame() {
    // The opening's cast, and the summit's tiles for the First Cut's two scenes (js/story.js FC_DEED, FC_WAIT).
    const extra = [D.FOES.ghoul.set, D.FOES.raider.set, D.FOES.ghast.set, (D.HEROES[P().hero] || D.HEROES.vesper).set];
    const play = () => startIntro(() => showcase(() => playNode('a0-t', true))), miss = OPENING_SETS.concat(extra).filter((id, i, a) => a.indexOf(id) === i && !A.hasSet(id)), iso = isoFor(5);
    if (!miss.length && A.isoReady(iso)) return play();
    M.go('load'); U.loading(0); Promise.all([A.loadSets(miss, (f) => U.loading(f)), A.loadIso(iso)]).then(() => { A.warm(R.ctx); A.isoWarm(R.ctx); U.hide(); play(); }, () => { U.hide(); play(); });
  }

  // The opening, played in the engine (js/intro.js).
  function startIntro(then) {
    U.hide(); if (P().opts.scenes === 'skip') return then();
    const I = VS.INTRO, PT = I.PARTS;
    if (!PT || !S.FC_DEED) { M.go('intro'); I.start(() => { R.hideCine(); then(); }); return; }
    // The opening (2026-11-11): three films with the First Cut's two scenes filmed on the summit between them. Esc in any
    // piece skips the rest of the opening.
    const done = () => { R.hideCine(); then(); };
    const film = (f, next) => { M.go('intro'); I.play(f, () => { R.hideCine(); (I.st && I.st.skipped ? done : next)(); }, { skippable: true }); };
    const tale = (def, next) => startScene(5, def, () => (M.scene && M.scene.sc && M.scene.sc.skipped ? done : next)(), true);
    film(PT.a, () => tale(S.FC_DEED, () => film(PT.b, () => tale(S.FC_WAIT, () => film(PT.c, done)))));
  }
  // A guardian's entrance film: in full the first time, a tap skips it after that.
  function startFilm(key, then) {
    const p = P(), seen = !!(p.seen && p.seen['film_' + key]);
    if (seen && p.opts.scenes === 'skip') return then();
    U.hide(); M.go('intro');
    VS.INTRO.play(VS.FILMS[key], () => { p.seen = p.seen || {}; p.seen['film_' + key] = true; M.write(); R.hideCine(); then(); }, { skippable: seen });
  }
  M.startFilm = startFilm;
  // ---- the map hub -------------------------------------------------------------------------------------
  function map(sel) {
    if (!M.bgDone && M.bgLoad) return needAll(() => map(sel));   // the map shows the guardians
    const p = P();
    { const freed = PR.checkSouls(p); if (freed.length) { M.write(); return soulBound(freed, () => map(sel)); } }   // a save from before the souls: free the ones earned
    M.mapSel = sel || M.mapSel || PR.nextNode(p);
    if (M.state !== 'map') { M.go('map'); VS.MAP.open(p, M.mapSel); AU.cue('map'); AU.playAmb('wind');
      A.loadSets(PR.CHAMPS.flat().map((k) => D.FOES[k].set).filter((id) => !A.hasSet(id))).catch(() => {}); }   // the champions shown on the map
    if (VS.MAP.sel !== M.mapSel) VS.MAP.focus(M.mapSel);
    VS.MAP.sel = M.mapSel; VS.MAP.p = p;
    VS.MAP.onSelect = (id) => { AU.sfx('step_0', 0.5); map(id); };
    U.map({ p, sel: M.mapSel, onGo: () => playNode(M.mapSel), onSkills: () => skills(), onHeroes: () => roster(() => map()), onGear: () => gear(), onModes: () => modes(), onSouls: () => souls(),
      onMenu: () => { M.go('menu'); U.menu({ onBack: () => map(), onSettings: () => settings(null, false, () => map()), onTitle: () => title() }); } });
    // The mission card's portraits: one look of each foe of the chosen island (loaded if not yet).
    const sn = PR.node(M.mapSel);
    if (sn && sn.type !== 'shrine') { const b = PR.build(sn), sets = [...new Set(PR.foeKeys(b).map((k) => ((b.node.variants || {})[k] || [D.FOES[k].set])[0]))].filter((id) => !A.hasSet(id)); if (sets.length) A.loadSets(sets).catch(() => {}); }
  }
  function mapKey(e) {
    if (U.current !== 'map') return false;
    const p = P(), open = PR.NODES.filter((n) => PR.state(p, n.id) !== 'locked'), i = open.findIndex((n) => n.id === M.mapSel);
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); const n = open[Math.min(open.length - 1, i + 1)]; if (n) { VS.MAP.focus(n.id); map(n.id); } return true; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); const n = open[Math.max(0, i - 1)]; if (n) { VS.MAP.focus(n.id); map(n.id); } return true; }
    if (e.code === 'KeyK') { e.preventDefault(); skills(); return true; }
    if (e.code === 'KeyH') { e.preventDefault(); roster(() => map()); return true; }
    if (e.code === 'KeyG') { e.preventDefault(); gear(); return true; }
    return false;
  }
  // Gear and the blacksmith.
  function gear(tab, sel, confirm) {
    M.go('menu'); menuScene('gear'); const p = P(), LT = VS.LOOT; LT.migrate(p);
    const act = Math.max(0, ...PR.NODES.filter((n) => PR.state(p, n.id) !== 'locked').map((n) => n.act));
    U.gear({ p, hero: p.hero, tab: tab || 'gear', sel, confirm, act,
      onBack: () => map(), onTab: (t) => gear(t), onSelect: (k) => gear(tab, k),
      onAct: (a, it) => {
        if (a === 'best') { LT.autoEquip(p, p.hero); AU.sfx('clang_1', 0.5); }
        else if (a === 'equip' && it) { LT.equip(p, p.hero, it.uid); AU.sfx('equip_armor_01', 0.7); }
        else if (a === 'unequip' && it) { LT.unequip(p, p.hero, it.slot); AU.sfx('step_1', 0.5); }
        else if (a === 'upgrade' && it) { if (LT.upgrade(p, it.uid)) AU.sfx('anvil_01', 0.8); else AU.sfx('error_01', 0.6); }
        else if (a === 'salvage' && it) { if (!confirm) return gear(tab, sel, true); LT.salvage(p, it.uid); AU.sfx('coin_01', 0.7); M.write(); return gear(tab); }
        else if (a === 'buy' && it) { const got = LT.buy(p, act, it.offer); if (got) { AU.sfx('coin_01', 0.7); M.write(); return gear('gear', 'u' + got.uid); } AU.sfx('thud', 0.5); }
        M.write(); gear(tab, sel);
      } });
  }
  // ---- Bound Souls --------------------------------------------------------------------------------------
  function souls(sel, flash) {
    const p = P(); PR.soulsInit(p); if (!Object.keys(p.souls).length) return map();
    M.go('menu'); menuScene('souls'); if (sel && p.souls[sel]) M.menuSc.soul = sel;
    U.souls({ p, sel, flash,
      onSel: (id) => { AU.sfx('soul', 0.4); souls(id); },
      onBind: (id) => { p.soul = id; M.write(); AU.sfx('allout', 0.5); souls(id, true); },
      onUp: (id) => { if (PR.soulUp(p, id)) { M.write(); AU.sfx(p.souls[id] === 4 || p.souls[id] === 8 || p.souls[id] === PR.SOUL_MAX ? 'level_up' : 'magic', 0.7); souls(id, true); } else AU.sfx('thud', 0.5); },
      onBack: () => map() });
  }
  // Each soul freed rises once, one after another, then on to wherever she was going.
  function soulBound(ids, then) {
    const p = P(), list = ids.slice(), next = () => {
      if (!list.length) return then();
      const id = list.shift(); M.go('menu'); menuScene('souls'); M.menuSc.soul = id; M.menuSc.reveal = true;   // the reveal shows the soul itself; the altar keeps the others
      U.soulBound({ id, first: p.soul === id, onOk: next, onSouls: () => souls(id) });
    };
    next();
  }
  function skills(flash, confirm) {
    M.go('menu'); menuScene('skills'); const p = P();
    U.skills({ p, flash, confirm,
      onBuy: (id) => { if (PR.buy(p, id)) { AU.sfx('allout', 0.5); M.write(); skills(id); } else AU.sfx('thud', 0.5); },
      onRespec: () => { if (!confirm) return skills(null, true); PR.respec(p); M.write(); AU.sfx('magic', 0.5); skills(); },
      onBack: () => map() });
  }
  function roster(back) {
    M.go('menu'); menuScene('roster'); const p = P();
    U.roster({ p, onBack: back, preview: (id) => { if (M.menuSc) M.menuSc.hero = id; }, pick: (id) => { p.hero = id; M.write(); AU.sfx('allout', 0.5); back(); } });
  }

  // ---- playing a node ----------------------------------------------------------------------------------
  // Shrines pay out at once. Fights play the act's intro the first time you climb into it, the
  // guardian's intro before its fight, then the fight.
  function playNode(id, skipIntro) {
    const p = P(), n = PR.node(id); if (!n || PR.state(p, id) === 'locked') return;
    if (n.type === 'shrine') {
      const r = PR.claimShrine(p, id); if (!r) return; M.write(); AU.sfx('allout', 0.7);
      M.go('result'); M.result = { stage: PR.ACTS[n.act].stage };
      U.result({ p, node: n, win: true, r: Object.assign({ goals: [], stars: [] }, r), stats: null, buttons: [{ label: 'Continue', act: () => (r.souls && r.souls.length ? soulBound(r.souls, () => map(PR.nextNode(p))) : map(PR.nextNode(p))) }] });
      return;
    }
    A.loadSets(missingFor(PR.build(n))).catch(() => {}); A.loadIso(isoFor(PR.build(n).stage)).catch(() => {});   // start loading the army and the tiles while the scene plays
    const Ac = S.ACTS[n.act] || {}, scenes = [], bd = PR.build(n);
    // The act's intro casts a few of the army this fight will bring (in the looks it will wear).
    const army = PR.foeKeys(bd).filter((k) => !D.FOES[k].boss && D.FOES[k].set.startsWith('vh_')).slice(0, 3).map((k) => ({ key: k, set: ((bd.node.variants || {})[k] || [D.FOES[k].set])[0] }));
    if (!skipIntro && Ac.intro && !p.seen['act' + n.act]) { scenes.push(Object.assign({}, Ac.intro, { army })); p.seen['act' + n.act] = true; }
    const film = VS.FILM_FOR && VS.FILM_FOR[n.id] && VS.FILMS[VS.FILM_FOR[n.id]] ? VS.FILM_FOR[n.id] : null;   // a guardian's entrance (js/bossfilms.js)
    if (n.type === 'boss' && Ac.boss && !film) scenes.push(Ac.boss);
    M.write();
    const run = () => { if (!scenes.length) return film ? startFilm(film, () => startNode(id)) : startNode(id); startScene(PR.ACTS[n.act].stage, scenes.shift(), run); };
    run();
  }
  const TIPS = {
    heavy: () => ['NEW · HEAVY BLOW', 'It comes on its own: when three or more crowd you, a shield stands in your way, or a combo runs its full length, your attack becomes a heavy blow.'],
    dodge: () => ['NEW ABILITY · DODGE', `${R.touch ? 'Tap DASH' : 'Space'} to dash through danger. Attack right after a dodge for a dash-cut.`],
    skill1: (H) => ['NEW SKILL · ' + H.skills[0].name.toUpperCase(), 'It joins your combo by itself whenever it is ready: keep attacking. Its mark above the attack turns gold when it is ready.'],
    skill2: (H) => ['NEW SKILL · ' + H.skills[1].name.toUpperCase(), 'It joins your combo by itself whenever it is ready: keep attacking.'],
    art: () => ['NEW ABILITY · MOON ART', `When the moon gauge is full, ${R.touch ? 'tap the moon' : 'press E'} for your ultimate. Use it at low health for the strongest version.`],
  };
  // ---- the guided trial ----------------------------------------------------------------------------------
  // One thing at a time, each on its own: the tutorial places the foes for each step itself (the waves
  // wait), shows where to go and which button to press, counts the step down, and cheers when it is done.
  // Every step also moves on by itself after a while, so nobody is ever stuck (and the bot can finish it).
  const key = (pc, touch, pad) => (M.padUsed && pad ? pad : R.touch ? touch : pc);
  const ahead = (f, d, side) => { const s = f.s, h = s.hero, A = VS.arenaOf(s), e = VS.exitOf(A), a = Math.atan2(e.y - h.y, e.x - h.x), c = VS.clampTo(A, h.x + Math.cos(a) * d - Math.sin(a) * (side || 0), h.y + Math.sin(a) * d + Math.cos(a) * (side || 0), 30); return { x: c[0], y: c[1] }; };
  const alive = (f, keys) => (f.tut.units || []).filter((u) => u.alive && (!keys || keys.indexOf(u.key) >= 0));
  const TUT = [
    { title: 'MOVE', text: () => key('Use WASD (or the arrow keys) to walk to the glowing circle.', 'Drag anywhere on the left half of the screen to walk to the glowing circle.', 'Use the left stick to walk to the glowing circle.'), btn: 'stick',
      enter: (f) => { f.tut.mark = ahead(f, 230); f.tut.walked = 0; },
      done: (f) => { const h = f.s.hero, m = f.tut.mark; return Math.hypot(h.x - m.x, h.y - m.y) < 40 || f.tut.walked > 260; }, limit: 25 },
    { title: 'CUT', text: () => key('Left click (or J) to cut. Aim with the mouse. Cut down both training husks.', 'Tap the big sword button to cut. Cut down both training husks.', 'Press A to cut (aim with the right stick). Cut down both training husks.'), btn: 'atk',
      enter: (f) => { const a = ahead(f, 90, -38), b = ahead(f, 90, 38); f.tut.units = [SIM.place(f.s, 'dummy', a.x, a.y), SIM.place(f.s, 'dummy', b.x, b.y)]; },
      prog: (f) => (2 - alive(f).length) + ' / 2', done: (f) => !alive(f).length, limit: 30, leave: (f) => { for (const u of alive(f)) SIM.dismiss(f.s, u); } },
    { title: 'COMBO', text: () => key('Keep clicking without stopping: each cut chains into the next. Land a 6-hit chain on the post.', 'Keep tapping without stopping: each cut chains into the next. Land a 6-hit chain on the post.', 'Keep pressing A without stopping: each cut chains into the next. Land a 6-hit chain on the post.'), btn: 'atk',
      enter: (f) => { const a = ahead(f, 80); f.tut.units = [SIM.place(f.s, 'post', a.x, a.y)]; f.tut.best = 0; },
      prog: (f) => { f.tut.best = Math.max(f.tut.best, f.s.combo); return Math.min(6, f.tut.best) + ' / 6 hits'; }, done: (f) => f.tut.best >= 6 || !alive(f).length, limit: 30,
      leave: (f) => { for (const u of alive(f)) SIM.dismiss(f.s, u); } },
    { title: 'HEAVY', text: () => key('Walk into the group and keep clicking. When three or more crowd you, your combo turns into a HEAVY blow on its own and throws them all back.', 'Walk into the group and keep tapping CUT. When three or more crowd you, your combo turns into a HEAVY blow on its own and throws them all back.', 'Walk into the group and keep pressing A. When three or more crowd you, your combo turns into a HEAVY blow on its own and throws them all back.'), btn: 'atk',
      enter: (f) => { const c = ahead(f, 120); f.tut.units = [0, 1, 2, 3].map((i) => SIM.place(f.s, 'dummy', c.x + Math.cos(i * 1.57) * 26, c.y + Math.sin(i * 1.57) * 26)); f.tut.heavy = 0; },
      prog: (f) => (4 - alive(f).length) + ' / 4', done: (f) => !alive(f).length, limit: 30, leave: (f) => { for (const u of alive(f)) SIM.dismiss(f.s, u); } },
    { title: 'DODGE', text: () => key('The Drill Knight swings slowly. When the RED ring flashes under him, press SPACE to dash through the blow. Dodge 2 swings.', 'The Drill Knight swings slowly. When the RED ring flashes under him, tap DASH to dash through the blow. Dodge 2 swings.', 'The Drill Knight swings slowly. When the RED ring flashes under him, press B to dash through the blow. Dodge 2 swings.'), btn: 'dodge',
      enter: (f) => { const a = ahead(f, 110); f.tut.units = [SIM.place(f.s, 'drill', a.x, a.y)]; f.tut.dodged = 0; },
      prog: (f) => Math.min(2, Math.floor(f.tut.dodged)) + ' / 2', done: (f) => f.tut.dodged >= 2, limit: 35 },
    { title: 'DASH-CUT', text: () => key('Cut right after a dash for a DASH-CUT. The knight is open now: finish him.', 'Tap the sword right after a dash for a DASH-CUT. The knight is open now: finish him.', 'Press A right after a dash (B) for a DASH-CUT. The knight is open now: finish him.'), btn: 'atk',
      enter: (f) => { for (const u of alive(f)) { u.hp = u.maxHp = 46; u.maxPoise = u.poise = 0; } f.tut.dash = 0; },
      prog: (f) => (f.tut.dash ? 'dash-cut ✓' : 'dash-cut ✗'), done: (f) => !alive(f).length, limit: 30, leave: (f) => { for (const u of alive(f)) SIM.dismiss(f.s, u); } },
    { title: 'BARRELS', text: () => key('Barrels, crates and pots break. Smash the powder barrel to blow up the husks around it.', 'Barrels, crates and pots break. Smash the powder barrel to blow up the husks around it.'), btn: 'atk',
      enter: (f) => { const c = ahead(f, 120); f.tut.barrel = SIM.addBreak(f.s, 'barrel', c.x, c.y); f.tut.units = [0, 1, 2].map((i) => SIM.place(f.s, 'dummy', c.x + Math.cos(0.6 + i * 2.1) * 30, c.y + Math.sin(0.6 + i * 2.1) * 30)); f.tut.mark = null; f.tut.goal = { x: f.tut.barrel.x, y: f.tut.barrel.y, hit: true }; },
      done: (f) => !f.tut.barrel || f.tut.barrel.broken, limit: 25, leave: (f) => { for (const u of alive(f)) SIM.dismiss(f.s, u); } },
    { title: 'FIGHT', text: (f) => f.tut.hint || (P().seen.lastHour ? 'You woke with nothing: no skills, no moon art, only your blade and the dash. The dead are coming. Fight your way back to him.' : 'The dead are coming from all sides. Dash through their swings and cut them down. Clear them all.'), btn: null,
      enter: (f) => { for (const u of SIM.foes(f.s)) SIM.dismiss(f.s, u); f.tut.units = []; SIM.release(f.s); f.tut.mark = null; }, done: () => false },
  ];
  // What to say the first time each kind of foe shows up in the trial's fight.
  const FOE_HINT = { husk: 'BLOOD HUSK: it runs at you and bursts. Kill it near the others to blow them up too.', shield: 'SHIELDBEARER: his shield stops cuts from the front. Use HEAVY, or get behind him.', ghoul: 'GHOULS: weak alone, dangerous in a pack. Keep moving, keep cutting.', raider: 'RAIDER: he hits hard. Dash through his swing, then punish.' };
  // The sets a node's fight needs that are not loaded yet.
  // The army's looks, and the bound soul's (it fights beside her).
  const soulSet = () => { const so = PR.soulOf(PR.soulsInit(P())); return so ? [D.SOULS[so.id].set] : []; };
  const missingFor = (b) => PR.setsFor(b).concat(soulSet()).filter((id, i, a) => a.indexOf(id) === i && !A.hasSet(id));
  // The tile groups an hour's arenas are built from.
  const isoFor = (stageIdx) => { const th = VS.ARENA.THEMES[D.STAGES[stageIdx].id]; return ['w', 'a', 'v', th && th.set === 'i' ? 'i' : 'd']; };
  function startNode(id) {
    const n = PR.node(id), b = PR.build(n), miss = missingFor(b), iso = isoFor(b.stage);
    const go = () => startFight(b.stage, { nodeId: id, node: n, build: b });
    if (!miss.length && A.isoReady(iso)) return go();
    M.go('load'); U.loading(0);
    Promise.all([A.loadSets(miss, (f) => U.loading(f)), A.loadIso(iso)]).then(() => { A.warm(R.ctx); A.isoWarm(R.ctx); U.hide(); go(); }, () => { U.hide(); go(); });
  }

  // ---- scenes -------------------------------------------------------------------------------------------
  function startScene(stageIdx, def, then, force) {
    if (!M.bgDone && M.bgLoad) return needAll(() => startScene(stageIdx, def, then, force));
    U.hide();
    // Story scenes off (Settings): straight on to what follows (the theatre forces them on).
    if (!force && P().opts.scenes === 'skip' && then) return then();
    S.heroKey = P().hero || 'vesper';
    M.scene = { sc: VS.TALE.start(def || S.BEFORE[stageIdx]), stage: stageIdx, then: then || (() => startFight(stageIdx)) };
    M.go('scene'); AU.cue('scene'); AU.playAmb(stageIdx === 3 || stageIdx === 4 ? 'wind' : 'night');
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
  // Wait for the background load (the whole cast) before something that may draw any of it.
  function needAll(go) {
    if (M.bgDone || !M.bgLoad) return go();
    M.go('load'); U.loading(0.5);
    M.bgLoad.then(() => { U.hide(); go(); });
  }
  M.needAll = needAll;
  function startFight(stageIdx, opts) {
    if (!M.bgDone && M.bgLoad) return needAll(() => startFight(stageIdx, opts));
    U.hide(); opts = opts || {};
    const p = P(), b = opts.build, kit = opts.kit || (opts.theatre ? null : PR.kit(p)), MD = VS.MODES;
    // The difficulty and New Game+ scale the foes; mastery adds to the hero's damage on top of the gear.
    let node = b ? b.node : null;
    if (node && !opts.theatre) { const S = MD.scale(p); node = Object.assign({}, node, { scale: { hp: (node.scale ? node.scale.hp : 1) * S.hp, dmg: (node.scale ? node.scale.dmg : 1) * S.dmg }, rules: Object.assign({}, node.rules, S.elites ? { elites: true } : {}) }); }
    const gear = opts.gear || (opts.theatre ? null : Object.assign({}, VS.LOOT.mods(p, p.hero))); if (gear && !opts.gear) gear.dmg *= MD.masteryDmg(p, p.hero);
    // The first node teaches only when the last hour (the tutorial) was never played; after it, it is a plain fight.
    const trialTut = !!(opts.node && opts.node.type === 'trial' && !(p.seen && p.seen.lastHour));
    const s = SIM.create(stageIdx, { seed: (Date.now() & 0xffff) + 1, boons: opts.boons || (opts.theatre ? [] : PR.passives(p)), kit, hero: p.hero, node, gear, endlessNext: b && b.next, guided: !!(opts.guided || trialTut),
      soul: opts.theatre || opts.showcase || trialTut || opts.noSoul ? null : PR.soulOf(PR.soulsInit(p)) });
    M.fight = Object.assign({ s, stage: stageIdx, acc: 0, card: null, cardT: 0, say: null, banner: null }, opts); M.hold = false;
    M.paused = false; R.snapCam(s); R.fx = []; R.parts = []; R.floaters = []; R.pfx = []; R.entryDoor = null; R.impactF = null; R.kit = s.mods.can;
    f0 = M.fight; const n = opts.node, AR = VS.arenaOf(s);
    if (n) {
      const bossName = s.hasBoss ? (b && b.champion ? D.FOES[b.champion].name : n.echo ? n.name.replace('Echo: ', '') : n.name) : null;
      s.goal = { reach: trialTut ? 'Finish the trial' : n.type === 'trial' ? 'Clear the dead' : n.rule === 'horde' ? 'Survive the horde' : 'Clear every wave', boss: bossName ? 'Defeat ' + bossName : 'Clear every wave' };
      f0.banner = { text: n.name, sub: (n.rule ? PR.RULES[n.rule](n.n).split(':')[0].toUpperCase() + '  ·  ' : '') + AR.name + '  ·  AREA 1 / ' + s.waves.length, t: -0.4, col: '#ffffff' };
      if (trialTut) { f0.tut = { step: 0, t: 0, walked: 0, seen: {}, dodged: 0 }; s.goal = { reach: 'Finish the trial', boss: 'Finish the trial' }; }
      else if (n.type === 'trial') s.goal = { reach: 'Clear the dead', boss: 'Clear the dead' };
      if (n.type === 'trial') p.tips.heavy = p.tips.dodge = true;   // taught already (the last hour or the trial)
      f0.tips = kit.filter((k) => !p.tips[k]).map((k) => ({ id: k, t: 0 }));
    } else if (opts.mode === 'endless') { s.goal = { reach: 'Survive as long as you can', boss: 'Survive as long as you can' }; f0.banner = { text: 'ENDLESS', sub: AR.name + '  ·  BEST WAVE ' + ((p.endless && p.endless.best) || 0), t: -0.4, col: '#ffffff' }; }
    else if (opts.mode === 'daily') { s.goal = { reach: 'Win the daily challenge', boss: 'Win the daily challenge' }; f0.banner = { text: b.name.toUpperCase(), sub: b.twists.map((t) => t.toUpperCase()).join('  ·  ') + '  ·  ' + AR.name, t: -0.4, col: '#ffd060' }; }
    else if (opts.showcase) {
      const boss = opts.showcase === 'boss'; s.goal = { reach: 'The last hour', boss: boss ? 'Defeat the First Cut' : 'The last hour' };
      f0.banner = boss ? { text: 'THE FIRST CUT', sub: 'THE LAST HOUR  ·  THE TOP OF THE SPIRE', t: -0.6, col: '#ff2a44' } : { text: 'THE LAST HOUR', sub: 'DAWN IS CLOSE  ·  THE SPIRE', t: -0.6, col: '#ffd060' };
      f0.steps = boss ? BOSS : LAST; f0.tut = { step: 0, t: 0, walked: 0, seen: {}, dodged: 0, kills: 0 };
    }
    else f0.banner = { text: AR.name, sub: 'AREA 1 / ' + s.waves.length, t: -0.4, col: '#ffffff' };
    M.go('fight'); AU.playAmb(null); AU.cue(opts.mode || (n && (n.type === 'boss' || n.type === 'echo') ? 'boss' : 'act' + stageIdx));
  }
  function gather(f) {
    const s = f.s, p = M.pressed;
    const inp = { mx: 0, my: 0, atk: !!p.atk, heavy: !!p.heavy, dodge: !!p.dodge, parry: !!p.parry, art: !!p.art, s1: !!p.s1, s2: !!p.s2, skip: !!(p.tap || p.confirm || p.atk) };
    if (M.mouseAim && M.mouse && !R.touch && s.hero.alive) { const q = R.P(s.hero.x, s.hero.y, 20), g = R.screenToGround(M.mouse.x - q.x, M.mouse.y - q.y); if (Math.hypot(g.x, g.y) > 0.01) inp.aim = Math.atan2(g.y, g.x); }
    if (M.held.left) inp.mx -= 1; if (M.held.right) inp.mx += 1; if (M.held.up) inp.my -= 1; if (M.held.down) inp.my += 1;
    if (M.stick && Math.hypot(M.stick.dx, M.stick.dy) > 0.25) { inp.mx = M.stick.dx; inp.my = M.stick.dy; }
    if (M.pad && Math.hypot(M.pad.mx, M.pad.my) > 0.25) { inp.mx = M.pad.mx; inp.my = M.pad.my; }
    if (M.pad && M.pad.aim && s.hero.alive) { const g = R.screenToGround(M.pad.aim.x, M.pad.aim.y); inp.aim = Math.atan2(g.y, g.x); }
    if (inp.mx || inp.my) { const g = R.screenToGround(inp.mx, inp.my); inp.mx = g.x; inp.my = g.y; }
    if (autoOn() || f.auto) {
      const b = SIM.bot(s, 0.7);
      if (!inp.mx && !inp.my && !inp.atk && !inp.heavy && !inp.dodge && !inp.parry && !inp.s1 && !inp.s2) Object.assign(inp, b, { skip: inp.skip, aim: b.aim });
    }
    return inp;
  }
  function pause(on) {
    M.paused = on;
    if (!on) { U.hide(); return; }
    const f = M.fight;
    U.pause({ auto: P().opts.auto, onResume: () => pause(false), onRestart: () => (f.theatre ? theatre(f.theatreHero, f.theatreFull, f.theatreBack) : f.nodeId ? startNode(f.nodeId) : startFight(f.stage)),
      onAuto: () => { P().opts.auto = !P().opts.auto; M.write(); pause(true); }, onQuit: () => { M.paused = false; if (f.theatre) (f.theatreBack || title)(); else map(f.nodeId); } });
  }
  // ---- the last hour: the tutorial, and how the night first ended -----------------------------------------
  // Vesper at full power (every ability, end-game gear) at the top of the Spire, in three stages. Stage 1: the
  // lessons on practice targets (move; attack, with the combo and the heavy blow, the same button; dash; dash-cut;
  // the automatic skills, explained). Stage 2: the end-game horde. Stage 3: his film, then the First Cut himself in
  // the colossus arena: the moon art, and past a threshold of his health (or after a while) his one-shot, THE
  // FIRST CUT, which kills her. The Moon sees her corpse and raises her; it turns the night back to dusk and she
  // wakes at the Black Gate with nothing: the campaign. Each lesson opens with a message that pauses the game; she
  // cannot fall before the one-shot; Esc skips to the Moon raising her.
  const SHOW_NODE = 'a6-1', BOSS_NODE = 'a5-b', ONE_SHOT_AT = 0.55, HORDE_N = 8, HORDE_KEYS = ['ghoul', 'raider', 'ghoul', 'woundblade', 'raider'];
  const SHOW_KIT = ['heavy', 'dodge', 'skill1', 'skill2', 'art'], SHOW_BOONS = ['fourth', 'edge', 'edge2', 'ghost', 'iron', 'wind', 'vigor', 'vigor2', 'moonblood', 'quick', 'thirst', 'riposte'];
  const SHOW_GEAR = { dmg: 2.4, hp: 160, armor: 0.3, gain: 1.6, thirst: 0.08, cd: 0.5, dodge: 1.3, parry: 1, heal: 1, gold: 1 };
  const lineOf = (f, n, gap, dx) => { const a = ahead(f, 110); return Array.from({ length: n }, (_, i) => ({ x: a.x + (i - (n - 1) / 2) * gap * (dx || 1), y: a.y + (i - (n - 1) / 2) * gap * 0.25 })); };
  const bossOf = (s) => s.god || SIM.foes(s).find((u) => D.FOES[u.key] && D.FOES[u.key].boss);
  const LAST = [
    Object.assign({}, TUT[0], { stage: 1 }),
    { stage: 1, title: 'ATTACK', btn: 'atk', text: () => key('Click (or J) to attack. Keep attacking and your cuts chain into a combo. When three or more crowd you, the same button ends the combo with a HEAVY blow that throws them all back. Cut down all four.', 'Tap CUT to attack. Keep tapping and your cuts chain into a combo. When three or more crowd you, the same button ends the combo with a HEAVY blow that throws them all back. Cut down all four.', 'Press A to attack. Keep pressing and your cuts chain into a combo. When three or more crowd you, the same button ends the combo with a HEAVY blow that throws them all back. Cut down all four.'),
      enter: (f) => { const c = ahead(f, 110); f.tut.units = [0, 1, 2, 3].map((i) => SIM.place(f.s, 'dummy', c.x + Math.cos(i * 1.57) * 22, c.y + Math.sin(i * 1.57) * 22)); },
      prog: (f) => (4 - alive(f).length) + ' / 4', done: (f) => !alive(f).length, limit: 60, leave: (f) => { for (const u of alive(f)) SIM.dismiss(f.s, u); } },
    Object.assign({}, TUT[4], { stage: 1 }), Object.assign({}, TUT[5], { stage: 1 }),
    { stage: 1, title: 'AUTO SKILLS', btn: 'atk', text: () => 'Your attack does the rest by itself. When a skill is ready it joins the combo: the CRESCENT WAVE sends a wave of red steel through a whole line, and the PHANTOM STEP vanishes and strikes the nearest foe from behind. The HEAVY blow comes the same way when you are crowded or a shield is in your way. The marks above your attack turn gold when each is ready. Keep attacking the line.',
      enter: (f) => { f.s.cds[0] = f.s.cds[1] = 0; f.tut.used = [false, false]; f.tut.units = lineOf(f, 5, 24).map((p) => SIM.place(f.s, 'dummy', p.x, p.y)); },
      prog: (f) => { const u = f.tut.used || []; return (u[0] ? 1 : 0) + (u[1] ? 1 : 0) + ' / 2 skills'; }, done: (f) => { const u = f.tut.used || []; return (u[0] && u[1]) || !alive(f).length; }, limit: 45, leave: (f) => { for (const u of alive(f)) SIM.dismiss(f.s, u); } },
    // The horde comes a few at a time (the author, 2026-11-10: "cut down 12" was too much at once): groups of two
    // or three of the weaker dead, never more than three standing, eight in all (see showWatch).
    { stage: 2, title: 'THE HORDE', btn: null, text: () => 'The dead of the last hour stand between you and him. Keep attacking, dash through the red swings, and let the heavy blow and your skills come. Cut down 8.',
      enter: (f) => { const s = f.s; for (const u of SIM.foes(s)) SIM.dismiss(s, u); f.tut.units = []; f.tut.mark = null; f.tut.kills = 0; f.tut.horde = { sent: 0, next: s.time + 0.4 }; P().seen.lastHour = true; AU.cue('boss'); },
      prog: (f) => Math.min(HORDE_N, f.tut.kills) + ' / ' + HORDE_N, done: (f) => f.tut.kills >= HORDE_N, limit: 75 },
    { title: '', text: () => '', done: () => true },   // on to the top of the Spire
  ];
  const BOSS = [
    { stage: 3, title: 'THE FIRST CUT', btn: null, text: () => 'He wounded the moon, and he waits at the top of the Spire. Fight him blade to blade: dash through his red swings, and out of the red marks where he calls his blades down from the sky.',
      prog: (f) => { const g = bossOf(f.s); return g ? Math.round(100 * g.hp / g.maxHp) + '%' : ''; }, done: (f) => { const g = bossOf(f.s); return !g || g.hp < g.maxHp * 0.85; }, limit: 50 },
    { stage: 3, title: 'THE MOON ART', btn: 'art', text: () => key('The moon is full. Press E: your ultimate strikes him wherever he stands.', 'The moon is full. Tap the moon: your ultimate strikes him wherever he stands.', 'The moon is full. Pull a trigger: your ultimate strikes him wherever he stands.'),
      enter: (f) => { f.s.moon = 100; AU.sfx('charge', 1); }, done: (f) => !!f.s.cine || f.tut.art, limit: 20, auto: (f) => { if (!f.s.cine) SIM.startArt(f.s); } },
    { title: '', text: () => '', done: (f) => { const g = bossOf(f.s); return !g || g.hp < g.maxHp * ONE_SHOT_AT; }, limit: 35 },
    { title: '', text: () => '', done: () => false },   // his answer (see showWatch)
  ];
  const STAGE_NAME = { 1: 'stage 1  ·  the lessons', 2: 'stage 2  ·  the horde', 3: 'stage 3  ·  the top of the spire' };
  // The short goal under each lesson once it is under way.
  const GOAL = { MOVE: 'Walk to the glowing circle', ATTACK: 'Cut down all four', CUT: 'Cut down both husks', COMBO: 'Land a 6-hit chain', HEAVY: 'Keep attacking in the crowd', DODGE: 'Dash through 2 red swings', 'DASH-CUT': 'Attack right after a dash', BARRELS: 'Smash the powder barrel',
    FIGHT: 'Clear them all', 'AUTO SKILLS': 'Keep attacking: both skills will come', 'THE HORDE': 'Cut down 8', 'THE FIRST CUT': 'Break him', 'THE MOON ART': 'Use the moon art' };
  // Stages 1 and 2: the end-game map, its waves held back for the horde.
  function showcase(then) {
    const n = PR.node(SHOW_NODE), b0 = PR.build(n), b = Object.assign({}, b0, { node: Object.assign({}, b0.node, { script: true }) }), miss = missingFor(b), iso = isoFor(b.stage);
    const go = () => { startFight(b.stage, { build: b, showcase: 'lessons', guided: true, kit: SHOW_KIT, boons: SHOW_BOONS, gear: SHOW_GEAR, then }); };
    loadThen(miss, iso, go);
  }
  M.showcase = showcase;
  // Stage 3: the First Cut's film, then him.
  function showcaseBoss(then) {
    const n = PR.node(BOSS_NODE), b = PR.build(n), miss = missingFor(b), iso = isoFor(b.stage);
    const fight = () => loadThen(miss, iso, () => startFight(b.stage, { build: b, showcase: 'boss', kit: SHOW_KIT, boons: SHOW_BOONS, gear: SHOW_GEAR, then }));
    U.hide(); M.go('intro'); VS.INTRO.play(VS.FILMS.firstCut, () => { R.hideCine(); fight(); }, { skippable: true });
  }
  M.showcaseBoss = showcaseBoss;
  function loadThen(miss, iso, go) {
    if (!miss.length && A.isoReady(iso)) return go();
    M.go('load'); U.loading(0);
    Promise.all([A.loadSets(miss, (x) => U.loading(x)), A.loadIso(iso)]).then(() => { A.warm(R.ctx); A.isoWarm(R.ctx); U.hide(); go(); }, () => { U.hide(); go(); });
  }
  // The last hour's extras on top of the lesson engine: what it counts, the floor under her health, the stages.
  function showWatch(f) {
    const s = f.s, T = f.tut, h = s.hero;
    for (const e of s.events) {
      if (e.type === 'kill') T.kills = (T.kills || 0) + 1;
      if (e.type === 'skill') { const i = (s.heroDef.skills || []).findIndex((k) => k.name === e.name); if (i >= 0 && T.used) T.used[i] = true; }
      if (e.type === 'art') T.art = true;
    }
    if (h.alive) h.hp = Math.max(h.hp, Math.round(h.maxHp * 0.35));   // she cannot fall before his answer
    // The horde, a few at a time: a new group of two or three when fewer than two stand, weaker than in the campaign.
    const HZ = T.horde;
    if (HZ && f.steps[T.step] && f.steps[T.step].title === 'THE HORDE' && HZ.sent < HORDE_N && s.time >= HZ.next) {
      const up = SIM.foes(s).filter((u) => u.alive && !u.def.part).length;
      if (up < 2) {
        const n = Math.min(HORDE_N - HZ.sent, up === 0 ? 3 : 2), a0 = Math.random() * Math.PI * 2;
        for (let i = 0; i < n; i++) {
          const a = a0 + (i - (n - 1) / 2) * 0.5, u = SIM.place(s, HORDE_KEYS[(HZ.sent + i) % HORDE_KEYS.length], h.x + Math.cos(a) * 150, h.y + Math.sin(a) * 150);
          if (u) { u.hp = u.maxHp = Math.max(8, Math.round(u.maxHp * 0.6)); u.dmgMul = (u.dmgMul || 1) * 0.55; u.cd = Math.max(u.cd || 0, 1 + i * 0.4); }
        }
        HZ.sent += n; HZ.next = s.time + 1.4;
      }
    }
    const STEPS = f.steps;
    if (f.showcase === 'lessons' && T.step >= STEPS.length - 1 && !f.showDone) { f.showDone = true; M.hold = false; showcaseBoss(f.then); return; }
    if (f.showcase === 'boss' && T.step >= STEPS.length - 1 && !s.cine && !f.oneShot) {
      // He has had enough: the sword goes up, the sky goes dark, and a moment later the film of the cut.
      f.oneShot = 1.6; R.godPose = { move: 'blade', t: 0 }; R.shake = 10; R.flash = 0.5; R.flashCol = '255,30,50';
      f.banner = { text: 'THE FIRST CUT', sub: 'HE RAISES HIS SWORD', t: 0, col: '#ff2a44' }; AU.sfx('horn', 1); AU.sfx('windup', 1);
    }
  }
  // A lesson learned: a gold ring breaks out from her.
  function lessonFlourish(f, title) {
    const s = f.s, h = s.hero; if (!title) return;
    R.fx.push({ t: 0, kind: 'gring', x: h.x, y: h.y, life: 0.7, col: '#ffd060', r0: 8, r1: 150, w: 5 }, { t: 0, kind: 'ring', x: h.x, y: h.y, z: 22, life: 0.45, col: '#ffffff', r0: 6, r1: 70, w: 3 });
    AU.sfx('level_up', 0.5);
  }
  // The end of the last hour: the cut that kills her (when it got that far), then the Moon raising her, then the campaign.
  function endShowcase(f, cut) {
    if (f.showEnd) return; f.showEnd = f.showDone = true; AU.duck(false); M.hold = false; P().seen.lastHour = true; M.write();
    U.hide(); M.go('intro');
    const rise = () => VS.INTRO.play(VS.FILMS.rise, () => { R.hideCine(); f.then(); }, { skippable: true });
    if (cut) VS.INTRO.play(VS.FILMS.oneShot, rise, { skippable: true }); else rise();
  }

  // The trial's steps, checked against the fight as it plays.
  function tutorial(f) {
    const s = f.s, T = f.tut, h = s.hero, dt = 1 / 60, STEPS = f.steps || TUT;
    if (T.step >= STEPS.length) return;
    const st = STEPS[T.step];
    if (!T.entered && f.banner && !f.banner.low && f.banner.t < 2.2) return;   // the first lesson waits for the title
    if (!T.entered) {
      T.entered = true; T.t = 0; T.goal = null; T.units = T.units || []; if (st.enter) st.enter(f); s.marker = T.mark || T.goal || null;
      // The lesson's message: the game waits behind it until OK.
      if (st.title && !f.noLessonCards && !autoOn()) {   // (auto battle plays on without them)
        T.awaitOk = true; M.hold = true; M.stick = null; M.held = {};
        const n = STEPS.filter((x) => x.title).length, i = STEPS.slice(0, T.step).filter((x) => x.title).length + 1;
        const ok = () => { if (!T.awaitOk) return; U.hide(); T.awaitOk = false; M.hold = false; f.acc = 0; AU.sfx('step_1', 0.6); };
        U.lesson({ eyebrow: f.showcase ? 'The last hour  ·  ' + (STAGE_NAME[st.stage] || '') : P().seen.lastHour && st.title === 'FIGHT' ? 'Dusk  ·  the Black Gate' : 'Trial  ·  step ' + i + ' of ' + n, title: st.title, text: st.text(f), onOk: ok,
          onBack: f.showcase ? () => { U.hide(); T.awaitOk = false; M.hold = false; endShowcase(f, f.showcase === 'boss'); } : ok });
        AU.sfx('notify_01', 0.6);
        return;
      }
    }
    T.t += dt;
    // Count what the steps watch for.
    if (T.lx != null) T.walked += Math.hypot(h.x - T.lx, h.y - T.ly) || 0; T.lx = h.x; T.ly = h.y;
    for (const e of s.events) {
      if (e.type === 'perfect') T.dodged++;
      else if (e.type === 'dodge' && st.title === 'DODGE' && SIM.foes(s).some((u) => u.state === 'attack' && Math.hypot(u.x - h.x, u.y - h.y) < 70)) T.dodged += 0.5;
      else if (e.type === 'dashCut') T.dash = 1;
      else if (e.type === 'spawn' && st.title === 'FIGHT') { const u = s.units.find((x) => x.id === e.id); if (u && FOE_HINT[u.key] && !T.seen[u.key]) { T.seen[u.key] = 1; T.hint = FOE_HINT[u.key]; T.hintT = 0; } }
    }
    if (T.hint) { T.hintT = (T.hintT || 0) + dt; if (T.hintT > 6) T.hint = null; }
    if (T.cheer > 0) { T.cheer -= dt; if (T.cheer <= 0) { T.step++; T.entered = false; } return; }
    if (st.done(f) || (st.limit && T.t > st.limit)) {
      if (!st.done(f) && st.auto) { st.auto(f); return; }
      if (st.leave) st.leave(f);
      if (!st.title) { T.step++; T.entered = false; return; }
      T.cheer = 1.0; T.mark = null; s.marker = null; AU.sfx('step_2', 0.8); AU.sfx('allout', 0.35);
      R.float('✓ ' + st.title, h.x, h.y, 60, f.showcase ? '#ffd060' : '#8ad0ff', true, true);
      if (f.showcase) lessonFlourish(f, st.title);
    }
  }
  function fight(ctx, dt) {
    const f = M.fight, s = f.s;
    if (f.theatre && !M.paused && (M.pressed.back || M.pressed.tap)) { AU.duck(false); (f.theatreBack || title)(); return; }   // the theatre: a tap or Esc leaves the moon art
    if (f.showcase && M.pressed.back && !M.paused) { M.pressed.back = false; endShowcase(f, f.showcase === 'boss'); return; }   // Esc skips to how the night ended
    if (M.pressed.back && !s.cine && !M.paused) { pause(true); M.pressed.back = false; }
    if (!M.paused && !M.hold) {
      f.acc += dt * (M.watch ? M.watch.speed : 1);
      const live = gather(f); f.pend = f.pend || {};
      for (const k of ['atk', 'heavy', 'dodge', 'parry', 'art', 's1', 's2', 'skip']) if (live[k]) f.pend[k] = true;
      while (f.acc >= STEP) {
        const c0 = s.cine ? s.cine.t : null, inp = Object.assign({ mx: live.mx, my: live.my, aim: live.aim }, f.pend); f.pend = {};
        SIM.step(s, STEP, inp); f.acc -= STEP;
        if (f.tut) tutorial(f);
        if (M.hold) break;   // a lesson's message is up
        if (f.showcase) { showWatch(f); if (f.showDone) return; }
        if (s.cine && c0 != null) for (const [n, v] of VS.cine.cues(s.cine, c0, s.cine.t)) AU.sfx(n, v);
        R.consume(s); AU.events(s.events);
        for (const e of s.events) {
          if (e.type === 'boss') { f.card = e.keys; f.cardT = 0; }
          if (P().opts.vibe !== false && navigator.vibrate) { const v = e.type === 'hurt' ? (e.big ? 60 : 30) : e.type === 'kill' && e.boss ? 160 : e.type === 'parry' ? 18 : e.type === 'phase' || e.type === 'landed' && e.boss ? 90 : 0; if (v) try { navigator.vibrate(v); } catch (x) { /* not allowed */ } }
          if (e.type === 'art') { AU.duck(true); if (e.kind === 'ldx') P().seenLdx = true; }
          if (e.type === 'artEnd') { AU.duck(false); if (f.theatre) f.theatreEnd = 2.2; }
          if (e.type === 'portal') f.banner = { text: 'THE WAY OPENS', sub: 'GO THROUGH THE PORTAL', t: 0, col: '#ffffff', low: true };
          if (e.type === 'area') { const last = s.hasBoss && e.n === s.waves.length - 1; f.banner = { text: last && s.goal ? s.goal.boss : VS.arenaOf(s).name, sub: last ? VS.arenaOf(s).name.toUpperCase() + '  ·  THE GUARDIAN' : 'AREA ' + (e.n + 1) + ' / ' + s.waves.length, t: 0, col: last ? '#ff2a44' : '#ffffff' }; }
          if (e.type === 'endlessWave') f.banner = { text: 'WAVE ' + e.n, sub: e.n % 10 === 0 ? 'A GUARDIAN COMES' : e.n % 5 === 0 ? 'A CHAMPION COMES' : 'THEY KEEP COMING', t: 0, col: e.n % 5 === 0 ? '#ff2a44' : '#ffffff' };
          if (e.type === 'gatesOpen') f.banner = { text: 'THE GATES OPEN', sub: 'CUT THEM DOWN TO WOUND HIM', t: 0, col: '#ff2a44' };
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
      if (!M.paused) { R.drawHud(ctx, s, dt, { touch: R.touch, auto: autoOn() }); R.drawSkills(ctx, s, R.touch); }
      if (f.banner) { f.banner.t += dt; if (f.banner.t < 2.2) R.banner(ctx, f.banner.text, f.banner.t, f.banner.col, f.banner.sub, f.banner.low); else f.banner = null; }
      if (f.card) { f.cardT += dt; if (f.cardT < 1.9) R.bossCard(ctx, s, f.card, f.cardT); else f.card = null; }
      // Coaching: the trial's steps, then a card for each newly learned ability.
      if (f.banner && f.banner.t < 2.2 && !f.banner.low) { /* the coach waits for the banner */ }
      else if (f.tut && !M.paused && !f.tut.awaitOk && (f.steps || TUT)[Math.min((f.steps || TUT).length - 1, f.tut.step)].title) {
        const STEPS = f.steps || TUT, T = f.tut, st = STEPS[Math.min(STEPS.length - 1, T.step)];
        R.tutGuide(ctx, s, { mark: T.cheer > 0 ? null : T.mark, targets: T.cheer > 0 ? [] : alive(f), barrel: T.cheer > 0 || !T.barrel || T.barrel.broken ? null : T.barrel, btn: T.cheer > 0 ? null : st.btn, touch: R.touch });
        R.coach(ctx, { title: (f.showcase ? 'THE LAST HOUR  ·  STAGE ' + (st.stage || '') + '  ·  ' : 'TRIAL  ·  ') + st.title, text: GOAL[st.title] || st.text(f), t: T.cheer > 0 ? 1 : T.t + 0.3, step: T.step, of: f.showcase ? STEPS.length - 1 : STEPS.length, col: f.showcase ? '#ffd060' : '#8ad0ff', prog: st.prog && T.cheer <= 0 ? st.prog(f) : null, done: T.cheer > 0 });
      }
      else if (f.tips && f.tips.length && !M.paused && s.time > 1.2) {
        const tp = f.tips[0], H = s.heroDef, [tt, tx] = TIPS[tp.id](H); tp.t += dt;
        R.coach(ctx, { title: tt, text: tx, t: tp.t, life: 6 });
        if (tp.t > 6) { P().tips[tp.id] = true; M.write(); f.tips.shift(); }
      }
      if (R.touch && !M.paused) R.drawTouch(ctx, s, { stick: M.stick, held: M.touchHeld });
      // No crosshair following the mouse (the author, 2026-11-10): the system cursor is enough.
    }
    // The last hour's First Cut: he strikes faster, the summit trembles and red lightning splits the sky.
    if (f.showcase === 'boss' && !M.paused && !M.hold && !s.cine) {
      s.godPace = 0.65; s.noGates = true; R.shake = Math.max(R.shake || 0, 1.2);   // (the storm itself now runs in every First Cut fight: godAmbience in view.js)
    }
    // A heartbeat when she is close to death (the forge's sound).
    if (!M.paused && !s.result && s.hero.alive && s.hero.hp / s.hero.maxHp < 0.25) { f.beat = (f.beat || 0) - dt; if (f.beat <= 0) { f.beat = 0.85; AU.sfx('heartbeat', 0.55); } }
    if (f.oneShot > 0 && !M.paused) { f.oneShot -= dt; if (f.oneShot <= 0) { endShowcase(f, true); return; } }
    if (f.theatreEnd > 0 && !M.paused) { f.theatreEnd -= dt; if (f.theatreEnd <= 0) { (f.theatreBack || title)(); return; } }
    if (s.result && !M.paused) endFight(s.result);
  }
  function endFight(result) {
    const f = M.fight, s = f.s, p = P();
    AU.duck(false);
    if (f.mode) return endMode(result);
    if (f.showcase) { endShowcase(f, f.showcase === 'boss'); return; }
    if (f.theatre) { (f.theatreBack || title)(); return; }
    if (!f.nodeId) { title(); return; }
    const n = f.node, win = result === 'win', groups = s.waves.length;
    const r = { win, time: s.time, hpFrac: s.hero.hp / s.hero.maxHp, bossHits: s.stats.bossHits, maxCombo: s.stats.maxCombo, kills: s.kills || 0, progress: (s.area + (win ? 1 : 0)) / groups, chests: s.chests || [], smashed: s.smashed || 0, rand: Math.random, reward: VS.MODES.scale(p).reward, ilvl: VS.MODES.scale(p).ilvl };
    const res = PR.finish(p, n.id, r); afterFight(p, s, win, res); M.write();
    const stats = [[s.time.toFixed(1) + 's', 'Time'], [s.stats.maxCombo, 'Best combo'], [s.kills || 0, 'Kills']].concat(s.soul ? [[Math.round((s.stats.soul || 0) / Math.max(1, s.stats.dealt) * 100) + '%', D.SOULS[s.soul.soul.id].name.replace(/^The /, '') + ' dealt']] : [[s.stats.perfects, 'Perfect dodges']]);
    const showResult = () => {
      M.go('result'); M.result = { stage: f.stage }; AU.cue('result'); AU.playAmb('night');
      const next = PR.nextNode(p);
      const btns = win ? [{ label: 'Continue', sub: n.type === 'trial' && p.sp ? 'Then open Skills: you have a skill point' : res.souls && res.souls.length ? 'A soul has been freed' : '', act: () => (res.souls && res.souls.length ? soulBound(res.souls, () => map(next)) : map(next)) }, { label: 'Fight again', act: () => startNode(n.id) }]
        : [{ label: 'Try again', act: () => startNode(n.id) }].concat(p.sp ? [{ label: 'Skill tree', sub: p.sp + ' skill point' + (p.sp > 1 ? 's' : '') + ' to spend', act: () => skills() }] : [], [{ label: 'Back to the map', act: () => map(n.id) }]);
      const tip = !win ? (s.rules.time && s.time >= s.rules.time ? 'The clock ran out. Kill faster: heavy attacks and skills clear crowds.' : p.sp ? 'You have skill points to spend. New abilities make a big difference.' : !PR.kit(p).includes('dodge') ? 'Dash through a swing when a foe flashes, then strike back.' : 'Dash through their swings, then punish. Clear easier nodes for experience.') : null;
      U.result({ p, node: n, win, r: res, stats, tip, buttons: btns });
    };
    // The First Cut falls: the ending plays first.
    if (win && n.id === 'a5-b' && !p.seen.ending) { p.seen.ending = true; M.write(); startScene(5, S.ENDING, showResult); return; }
    showResult();
  }

  // After any fight: the numbers on the profile, the hero's mastery, achievements.
  function afterFight(p, s, win, res) {
    const MD = VS.MODES; MD.track(p, s, win);
    if (win) res.mastery = MD.addMastery(p, p.hero, res.xp || 0) ? MD.masteryLvl(p.mastery[p.hero]) : 0;
    res.ach = MD.checkAch(p);
  }
  // ---- the endless survival and the daily challenge ---------------------------------------------------
  function startMode(mode) {
    const p = P(), MD = VS.MODES;
    const b = mode === 'endless' ? MD.endless(p, (Date.now() & 0xffff) + 1) : MD.daily(MD.today());
    const miss = missingFor(b), iso = isoFor(b.stage);
    const go = () => startFight(b.stage, { mode, build: b, node: null });
    if (!miss.length && A.isoReady(iso)) return go();
    M.go('load'); U.loading(0);
    Promise.all([A.loadSets(miss, (f) => U.loading(f)), A.loadIso(iso)]).then(() => { A.warm(R.ctx); A.isoWarm(R.ctx); U.hide(); go(); }, () => { U.hide(); go(); });
  }
  function endMode(result) {
    const f = M.fight, s = f.s, p = P(), MD = VS.MODES, win = result === 'win';
    let res, name, tip = null;
    if (f.mode === 'endless') { const cleared = Math.max(0, s.wave + (VS.sim.foes(s).length ? 0 : 1)); res = MD.finishEndless(p, cleared, Math.random); name = 'Endless · wave ' + cleared + (res.best ? ' · new best' : ' · best ' + p.endless.best); }
    else { res = MD.finishDaily(p, f.build, { win, time: s.time }, Math.random); name = f.build.name; if (!win) tip = 'Twists today: ' + f.build.twists.map((t) => MD.TWIST_TEXT[t]).join('; ') + '.'; else if (!res.first) tip = 'Already won today: no second reward, but your best time is kept.'; }
    afterFight(p, s, win || f.mode === 'endless', res); M.write();
    M.go('result'); M.result = { stage: f.stage }; AU.cue('result'); AU.playAmb('night');
    const stats = [[s.time.toFixed(1) + 's', 'Time'], [s.stats.maxCombo, 'Best combo'], [s.kills || 0, 'Kills'], [s.stats.perfects, 'Perfect dodges']];
    U.result({ p, node: { name }, title: f.mode === 'endless' ? 'Run over' : null, win: f.mode === 'endless' ? true : win, r: res, stats, tip, buttons: [{ label: f.mode === 'endless' ? 'Go again' : 'Try again', act: () => startMode(f.mode) }, { label: 'Back to the map', act: () => map() }] });
  }
  function modes(confirmNg) {
    M.go('menu'); menuScene('modes'); const p = P(), MD = VS.MODES;
    U.modes({ p, daily: MD.daily(MD.today()), confirmNg, onBack: () => map(), onEndless: () => startMode('endless'), onDaily: () => startMode('daily'), onAch: () => { M.go('menu'); U.achievements({ p, onBack: () => modes() }); },
      onNg: () => { if (!MD.canNg(p)) return AU.sfx('thud', 0.5); if (!confirmNg) return modes(true); MD.newGamePlus(p); MD.checkAch(p); M.write(); AU.sfx('allout', 0.7); map('a0-1'); } });
  }
  // A moon art on demand: the last hour, the First Cut alone, the hero (heroKey, else the one being played)
  // at a quarter health (full: at full health, for the art's ordinary form), the moon full. back: where to go after.
  function theatre(heroKey, full, back) {
    const p = P(), was = p.hero; if (heroKey && D.HEROES[heroKey]) p.hero = heroKey;
    startFight(5, { theatre: true });
    p.hero = was;   // the fight has its hero; the save keeps the one being played
    Object.assign(M.fight, { theatreHero: heroKey, theatreFull: !!full, theatreBack: back || title });
    const s = M.fight.s;
    s.wave = s.waves.length - 2; s.area = s.waves.length - 1; s.waveT = 0;
    SIM.step(s, STEP, {}); s.freeze = 0; M.fight.card = null;
    for (const u of SIM.foes(s)) { u.state = 'idle'; u.st = 0; }
    const boss = SIM.foes(s)[0]; if (boss) { boss.x = s.hero.x + 70; boss.face = -1; }
    s.hero.hp = Math.round(s.hero.maxHp * (full ? 1 : 0.25)); s.moon = 100;
    R.snapCam(s);
    M.fight.theatreT = 0.6;
  }

  // ---- the theatre: every cutscene on demand (Settings, or the title screen), nothing to beat first ----------
  const FILM_NAMES = { warden: 'The Gatewarden', twins: 'The Hollow Twins', umbral: 'The Umbral', hunger: 'The Hunger', wing: 'The Pale Wing', firstCut: 'The First Cut' };
  function cutscenes(back, focus) {
    M.go('menu'); AU.cue('title');
    const again = (k) => () => { R.hideCine(); cutscenes(back, k); };
    // Load what a piece needs (its cast, its hour's tiles), then play it.
    const watch = (sets, iso, play) => {
      U.hide(); const miss = sets.filter((id) => id && !A.hasSet(id));
      if (!miss.length && (!iso || A.isoReady(iso))) return play();
      M.go('load'); U.loading(0);
      Promise.all([A.loadSets(miss, (f) => U.loading(f)), iso ? A.loadIso(iso) : null]).then(() => { A.warm(R.ctx); if (iso) A.isoWarm(R.ctx); U.hide(); play(); }, () => { U.hide(); play(); });
    };
    const actName = (i) => (PR.ACTS[i] ? `Act ${PR.ACTS[i].num} · ${PR.ACTS[i].name}` : 'After dawn');
    const story = [{ key: 'opening', label: 'The opening', sub: 'The First Cut wounds the moon',
      act: () => watch(OPENING_SETS, null, () => { M.go('intro'); VS.INTRO.start(again('opening')); }) }];
    S.ACTS.forEach((Ac, i) => {
      if (!Ac.intro) return;
      const n = PR.NODES.find((x) => x.act === i && x.type !== 'shrine'), stage = PR.ACTS[i] ? PR.ACTS[i].stage : 5;
      story.push({ key: 'act' + i, label: actName(i), sub: (PR.ACTS[i] && PR.ACTS[i].hour) || 'The echoes', act: () => {
        const bd = n ? PR.build(n) : null, army = bd ? PR.foeKeys(bd).filter((k) => !D.FOES[k].boss && D.FOES[k].set.startsWith('vh_')).slice(0, 3).map((k) => ({ key: k, set: ((bd.node.variants || {})[k] || [D.FOES[k].set])[0] })) : [];
        watch(army.map((a) => a.set), isoFor(stage), () => startScene(stage, Object.assign({}, Ac.intro, { army }), again('act' + i), true));
      } });
    });
    const film = (k) => () => watch(OPENING_SETS, null, () => { M.go('intro'); VS.INTRO.play(VS.FILMS[k], again(k), { skippable: true }); });
    story.push({ key: 'oneShot', label: 'The last hour: his one-shot', sub: 'The First Cut strikes her down', act: film('oneShot') });
    story.push({ key: 'rise', label: 'The Moon raises her', sub: 'The night turned back to dusk', act: film('rise') });
    story.push({ key: 'ending', label: 'The ending', sub: 'Dawn', act: () => watch([], isoFor(5), () => startScene(5, S.ENDING, again('ending'), true)) });
    const films = Object.keys(VS.FILM_FOR || {}).filter((id) => VS.FILMS[VS.FILM_FOR[id]]).map((id) => {
      const k = VS.FILM_FOR[id], n = PR.node(id);
      return { key: 'film_' + k, label: FILM_NAMES[k] || k, sub: n ? actName(n.act) : '', act: () => watch(OPENING_SETS, null, () => { M.go('intro'); VS.INTRO.play(VS.FILMS[k], again('film_' + k), { skippable: true }); }) };
    });
    const arts = [];
    for (const k of Object.keys(D.HEROES)) {
      const H = D.HEROES[k];
      if (k === 'vesper') {
        arts.push({ key: 'art_vesper', label: 'Vesper · Last Ditch Effort', sub: 'Her moon art at a quarter health', act: () => theatre('vesper', false, again('art_vesper')) });
        arts.push({ key: 'art_vesper_full', label: 'Vesper · Red Moon', sub: 'Her moon art at full health', act: () => theatre('vesper', true, again('art_vesper_full')) });
      } else arts.push({ key: 'art_' + k, label: H.name + ' · Moon art', sub: H.title, act: () => theatre(k, false, again('art_' + k)) });
    }
    U.theatre({ groups: [['Story', story], ['Guardians', films], ['Moon arts', arts]], focus, onBack: () => { AU.cue('title'); back(); } });
  }
  M.cutscenes = cutscenes;

  // ---- loop ------------------------------------------------------------------------------------------------
  let last = 0;
  function backdrop(ctx, dt, stIdx, figure) {
    const st = D.STAGES[stIdx], vw = R.viewW(), cam = Math.max(0, (R.SIDE_W - vw) / 2 + Math.sin(M.t * 0.08) * 40);
    R.drawBackdrop(ctx, st, cam, dt);
    if (figure) R.drawFigure(ctx, (D.HEROES[M.save.hero] || D.HERO).set, 'Idle', Math.floor(M.t * 7) % 15, Math.PI, cam + vw * 0.7, 4, 1, {});
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now; M.t += dt; R.t += dt; R.realDt = dt;
    try { pollPad(dt); } catch (e) { /* no gamepad API */ }
    // The normal cursor stays visible in fights (the crosshair that replaced it was removed, 2026-11-10).
    const ctx = R.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
    if (M.state === 'fight' && M.fight.theatreT > 0) { M.fight.theatreT -= dt; if (M.fight.theatreT <= 0) SIM.startArt(M.fight.s); }
    try {
    watchTick(dt);
    switch (M.state) {
      case 'load': ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, R.W, R.H); break;
      case 'title': ctx.fillStyle = '#05020a'; ctx.fillRect(0, 0, R.W, R.H); if (VS.INTRO && VS.INTRO.menu) VS.INTRO.menu(dt); else backdrop(ctx, dt, 5, true); break;   // the menu's scene (js/intro.js)
      case 'menu': if (VS.MENU) { ctx.fillStyle = '#05020a'; ctx.fillRect(0, 0, R.W, R.H); VS.MENU.draw(dt, M.menuSc); } else { backdrop(ctx, dt, 5, false); ctx.fillStyle = 'rgba(6,3,8,0.62)'; ctx.fillRect(0, 0, R.W, R.H); } break;
      case 'scene': scene(ctx, dt); break;
      case 'intro': VS.INTRO.update(dt, !!(M.pressed.back || M.pressed.tap)); if (M.state === 'intro') VS.INTRO.draw(ctx, dt); break;
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
    R.init(document.getElementById('game')); try { R.touch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches); } catch (e) { /* desktop */ }
    const c = R.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', onDown); c.addEventListener('pointermove', onMove); c.addEventListener('pointerup', onUp); c.addEventListener('pointercancel', onUp);
    requestAnimationFrame(frame);
    U.loading(0);
    // At start only what the title needs: her sheet and the small shared effect pages (2026-11-10: loading
    // every hero and foe first was about 23 MB before the title). The rest streams in behind the menu
    // (M.bgLoad); anything that needs the whole cast waits for it (needAll).
    const mine = (D.HEROES[M.save.hero] || D.HERO).set, first = [...new Set([D.HERO.set, mine])];
    const ids = new Set([D.HERO.set, D.LYS.set, D.CLONE.set]); for (const k in D.FOES) if (!D.FOES[k].set.startsWith('vh_')) ids.add(D.FOES[k].set); for (const k in D.HEROES) ids.add(D.HEROES[k].set);
    await A.load(first, (p) => U.loading(p));
    M.bgLoad = new Promise((res) => setTimeout(res, 300)).then(() => Promise.all([A.loadSets([...ids].filter((id) => !A.hasSet(id))), A.loadIso(['w', 'a', 'v', 'i']).catch(() => {})]))
      .then(() => { M.bgDone = true; A.warm(R.ctx); A.isoWarm(R.ctx); }, () => { M.bgDone = true; });
    try { if (document.fonts) await Promise.race([Promise.all(['20px Adventurer', '700 20px "Chakra Petch"', '500 16px Barlow', '700 16px Barlow'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]); } catch (e) { /* fonts optional */ }
    A.warm(R.ctx); A.isoWarm(R.ctx);
    A.loadCB().catch(() => {});   // the Crowd Breaker effects stream in after the start
    applyOpts();
    if (params.has('auto')) M.autoUrl = true;
    if (params.has('watch')) { setTimeout(() => watchStart(+params.get('watch') || 1), 50); }
    if (params.has('hero') && D.HEROES[params.get('hero')]) M.save.hero = params.get('hero');
    if (params.has('theatre')) theatre();
    else if (params.has('cutscenes')) cutscenes(title);
    else if (params.has('showcase')) showcase(() => title());
    else if (params.has('stage')) startFight(Math.max(0, Math.min(5, +params.get('stage') || 0)));
    else if (params.has('node')) startNode(params.get('node'));
    else if (params.has('intro')) newGame();
    else if (params.has('film')) startFilm(params.get('film'), () => title());
    else if (params.has('scene')) startScene(Math.max(0, Math.min(5, +params.get('scene') || 0)));
    else if (params.has('map')) map();
    else title();
  }
  addEventListener('wheel', (e) => { if (M.state === 'map' && !e.target.closest('.mission')) { VS.MAP.wheel(e.deltaY); } }, { passive: true });
  M.startFight = startFight; M.startScene = startScene; M.theatre = theatre; M.title = title; M.endFight = endFight; M.map = map; M.playNode = playNode; M.startNode = startNode; M.skills = skills; M.roster = roster;
  boot();
})();
