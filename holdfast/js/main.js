// HOLDFAST - the game loop: boot, title, starter pick, simulation stepping, events, input, saves.
(function () {
  const HF = window.HF, D = HF.D, S = HF.Sim, A = HF.A, R = HF.R, U = HF.U, C = HF.C, AU = HF.AU;
  const TS = D.TILE, SAVE = 'holdfast.save.v1', SET = 'holdfast.settings.v1';
  const $ = id => document.getElementById(id);
  const G = HF.G = { st: null, speed: 1, mode: 'loading', followId: null, demo: null };
  const STEP = 1 / 20;
  let acc = 0, lastT = 0, uiT = 0, saveT = 0, fullT = 0;

  // ---- Commands with feedback --------------------------------------------------------------
  G.cmd = function (name, args) {
    const r = S.cmd(G.st, name, args);
    if (!r.ok) { AU.ui('error'); if (r.msg) U.toast(r.msg, 'warn'); }
    handleEvents();
    return r;
  };
  G.setSpeed = v => { G.speed = v; };
  G.focus = u => { if (!u) return; C.returnTo = { from: { x: R.cam.x, y: R.cam.y, z: R.cam.z }, to: { x: u.x, y: u.y - 20, z: Math.max(R.cam.z, 1.6) }, t: 0 }; };
  G.follow = id => { G.followId = G.followId === id ? null : id; U.toast(G.followId ? 'Following.' : 'Stopped following.', 'info'); };

  // ---- Boot ---------------------------------------------------------------------------------
  async function boot() {
    R.init($('game'));
    window.addEventListener('resize', () => { R.resize(); });
    try { await A.load(p => { $('lbar').style.width = Math.round(p * 100) + '%'; }); }
    catch (e) { $('lmsg').textContent = 'Could not load: ' + e.message + '. Serve the repository root over HTTP.'; console.error(e); return; }
    U.init();
    $('btn-menu').innerHTML = '<img class="ic" src="' + A.iconURL('gear') + '" width="22" height="22">';
    $('btn-home').innerHTML = '<img class="ic" src="' + A.iconURL('campfire') + '" width="22" height="22">';
    $('place-ok').innerHTML = '<img class="ic" src="' + A.iconURL('check') + '" width="26" height="26">';
    $('place-no').innerHTML = '<img class="ic" src="' + A.iconURL('x') + '" width="26" height="26">';
    loadSettings();
    $('loading').style.display = 'none';
    // Background loading of the rest of the cast.
    setTimeout(() => { for (const [s] of D.CIVIL_SETS.concat(D.FIGHT_SETS)) A.loadCast(s); for (const k in D.FOE) A.loadCast(D.FOE[k].set); A.loadCast('thug_b'); A.loadCast('bandit_grabber'); }, 1500);
    toTitle();
    bindInput();
    requestAnimationFrame(frame);
    if (location.search.includes('autostart')) { newGame(0); }
  }
  function toTitle() {
    G.mode = 'title'; document.body.classList.add('title'); U.closeModal(); U.closeDrawer(); U.cancelPlace(); U.select(null);
    G.demo = S.create(4242, 0); G.demo.fog.fill(1); G.demo.hours = 9.5; S.rebuild(G.demo);
    // A lived-in camp for the title backdrop.
    const c = G.demo.clearing;
    S.addBuilding(G.demo, 'heart', c.x - 2, c.y - 1, 1, true);
    S.addBuilding(G.demo, 'tent', c.x - 6, c.y - 4, 0, true); S.addBuilding(G.demo, 'tent', c.x + 4, c.y - 4, 0, true);
    S.addBuilding(G.demo, 'stockpile', c.x + 4, c.y + 3, 0, true); S.addBuilding(G.demo, 'tower', c.x - 7, c.y + 2, 0, true);
    for (let k = -3; k < 4; k++) S.addBuilding(G.demo, 'wall', c.x + 9, c.y + k, 0, true);
    G.demo.camp = { x: c.x, y: c.y }; G.demo.obj = 17;
    for (let i = 0; i < 3; i++) { const u = S.makeSurvivor(G.demo, { x: (c.x + i * 2 - 2) * TS, y: (c.y + 3) * TS }); u.job = ['wood', 'build', 'forage'][i]; }
    R.reset(); R.cam.x = (c.x - 6) * TS; R.cam.y = c.y * TS; R.cam.z = 1.5;
    G.st = null;
    $('t-continue').style.display = readSave() ? '' : 'none';
    AU.set({ menu: true, battle: false, night: false, fire: 0.2 });
  }
  G.toTitle = toTitle;
  $('t-new').onclick = () => { AU.unlock(); AU.ui('click'); openPicker(); };
  $('t-continue').onclick = () => { AU.unlock(); AU.ui('confirm'); loadGame(); };
  $('t-settings').onclick = () => { AU.unlock(); AU.ui('click'); U.openSettings(); };
  let pick = 0; const starterNames = [];
  function openPicker() {
    const box = $('starters'); box.innerHTML = '';
    D.STARTERS.forEach((s, i) => {
      const tr = D.TRAITS[s.trait];
      const b = document.createElement('button'); b.className = 'panel starter' + (i === pick ? ' on' : '');
      b.innerHTML = '<canvas width="96" height="96"></canvas><b>' + ['The Wanderer', 'The Sellsword', 'The Carpenter'][i] + '</b><span class="trait">' + tr.name + '</span><small>' + s.blurb + '</small>';
      b.onclick = () => { pick = i; AU.ui('click'); box.querySelectorAll('.starter').forEach((x, j) => x.classList.toggle('on', j === i)); };
      box.appendChild(b);
      A.loadCast(s.set).then(() => { const p = A.portrait(s.set, 96); if (p) b.querySelector('canvas').getContext('2d').drawImage(p, 0, 0); });
    });
    $('picker').classList.add('show');
  }
  $('p-begin').onclick = () => { AU.ui('confirm'); $('picker').classList.remove('show'); newGame(pick); };
  function newGame(starter) {
    const seed = (Math.random() * 1e9) | 0;
    G.st = S.create(seed, starter); G.mode = 'play'; G.speed = 1;
    document.body.classList.remove('title'); R.reset();
    C.seen = {}; C.queue = []; C.active = null;
    const u = Object.values(G.st.units).find(x => x.leader);
    R.cam.x = u.x; R.cam.y = u.y; R.cam.z = 1.8;
    C.play('opening', G.st);
    C.onEnd = (id) => { if (id === 'opening') { U.banner('Day 1', 'Find a place to make camp'); } };
    AU.set({ menu: false });
    save(false);
  }
  function loadGame() {
    const raw = readSave(); if (!raw) { U.toast('No saved camp.', 'warn'); return; }
    try {
      const data = JSON.parse(raw);
      G.st = S.load(data.st); C.seen = data.seen || {}; G.mode = 'play'; G.speed = 1;
      document.body.classList.remove('title'); $('picker').classList.remove('show'); R.reset(); C.queue = []; C.active = null;
      const h = S.heart(G.st); const u = S.present(G.st)[0];
      if (h) { R.cam.x = (h.x + 2.5) * TS; R.cam.y = (h.y + 1.5) * TS; } else if (u) { R.cam.x = u.x; R.cam.y = u.y; }
      R.cam.z = 1.5; U.select(null); U.closeModal();
      AU.set({ menu: false });
      U.toast('Camp restored: day ' + S.day(G.st) + '.', 'good');
    } catch (e) { console.error(e); U.toast('The save could not be read.', 'bad'); }
  }
  G.loadGame = loadGame;
  function save(show) {
    if (!G.st || G.st.gameOver) return;
    try { localStorage.setItem(SAVE, JSON.stringify({ st: S.save(G.st), seen: C.seen, t: Date.now() })); if (show) U.toast('Saved.', 'good'); }
    catch (e) { if (show) U.toast('Could not save: ' + e.message, 'bad'); }
  }
  G.save = save;
  function readSave() { try { return localStorage.getItem(SAVE); } catch (e) { return null; } }
  function loadSettings() { try { const s = JSON.parse(localStorage.getItem(SET) || '{}'); if (s.vol) Object.assign(AU.vol, s.vol); C.skipAll = !!s.skipAll; } catch (e) { /* defaults */ } }
  G.saveSettings = () => { try { localStorage.setItem(SET, JSON.stringify({ vol: AU.vol, skipAll: C.skipAll })); } catch (e) { /* ignore */ } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(false); });

  // ---- Events ---------------------------------------------------------------------------------
  function handleEvents() {
    const st = G.st; if (!st) return;
    for (const e of S.drain(st)) {
      R.onEvent(st, e);
      switch (e.type) {
        case 'sfx': AU.sfx(e.s, e.x, e.y); break;
        case 'hit': AU.sfx('hit', e.x, e.y); break;
        case 'bhit': AU.sfx('bhit', e.x, e.y); break;
        case 'roar': AU.roar(e.x, e.y); break;
        case 'stomp': AU.sfx('stomp', e.x, e.y); break;
        case 'impact': AU.sfx('impact', e.x, e.y); break;
        case 'note': U.toast(e.text, e.kind); if (e.kind === 'bad' || e.kind === 'warn') AU.ui('notify'); break;
        case 'cine': C.play(e.id, st, e); break;
        case 'obj': { const o = D.OBJ[e.obj]; const prev = D.OBJ[e.obj - 1]; if (prev && st.objDone[prev.id] && G.mode === 'play' && !C.busy()) U.banner(prev.text, o && o.id !== 'free' ? 'Next: ' + o.text : ''); $('obj').classList.remove('done'); void $('obj').offsetWidth; $('obj').classList.add('done'); break; }
        case 'dawn': U.banner('Day ' + e.day, e.short ? 'Not enough to go round' : 'Ate ' + e.food + ' food · drank ' + e.water + ' water'); break;
        case 'victory': if (e.first || e.big) C.play('held', st); else U.banner('The camp holds', ''); break;
        case 'bossdown': C.play('bossfall', st, e); break;
        case 'bossflee': C.play('bossflee', st, e); break;
        case 'rally': R.addFx('shockwave', e.x, e.y, 1.6); R.marks.push({ x: e.x, y: e.y, t: 0, col: 'rgba(255,200,90,0.95)' }); U.banner('RALLY', 'Fighters to the horn · +30% damage for 20 s'); break;
        case 'warn': U.banner(e.raid.hollow ? 'The Hollow stir' : 'Raiders sighted', 'From the ' + e.raid.dirs.map(S.dirName).join(' and ')); break;
        case 'death': U.banner(e.name, 'is dead'); break;
        case 'gameover': setTimeout(() => U.gameOver(st), 1500); try { localStorage.removeItem(SAVE); } catch (er) { /* */ } break;
        case 'autosave': save(false); break;
        case 'full': if (performance.now() - fullT > 20000) { fullT = performance.now(); U.toast('Storage is full. Build a Stockpile.', 'warn'); } break;
        case 'home': U.banner('The party returns', e.got.join(' · ')); break;
      }
    }
  }

  // ---- Loop ------------------------------------------------------------------------------------
  const prev = new Map();
  // Adaptive resolution: drop the canvas scale when frames run long, raise it again when there is room.
  let ema = 16, slowT = 0, fastT = 0;
  function adapt(dt) {
    ema = ema * 0.92 + dt * 1000 * 0.08;
    if (ema > 26) { slowT += dt; fastT = 0; } else if (ema < 15) { fastT += dt; slowT = 0; } else { slowT = 0; fastT = 0; }
    if (slowT > 1.2) { if (R.richFx !== false) R.richFx = false; else if (R.dpr > 1) R.setScale(R.dpr - 0.25); slowT = 0; ema = 18; }
    if (fastT > 8) { if (R.dpr < R.cap) R.setScale(R.dpr + 0.25); else if (R.richFx === false) R.richFx = true; fastT = 0; }
  }
  let errShown = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    try { tick(t); } catch (e) { console.error(e); if (errShown++ < 1 && U.toast) U.toast('Something went wrong: ' + e.message, 'bad'); }
  }
  function tick(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    if (G.mode === 'title' && G.demo) {
      const d = G.demo; R.cam.x += dt * 9; if (R.cam.x > (d.clearing.x + 14) * TS) R.cam.x = (d.clearing.x - 14) * TS;
      S.step(d, dt * 0.4); S.drain(d); d.hours = 9.5; d.pending.length = 0;
      R.frame(d, dt, { sel: null });
    } else if (G.mode === 'play' && G.st) {
      const st = G.st;
      C.update(dt, st);
      if (R.hitstop > 0) R.hitstop -= dt;
      const paused = (G.speed === 0 && !C.busy()) || R.hitstop > 0;
      if (!paused) {
        acc += dt * (C.busy() ? C.speed() : G.speed);
        let n = 0; while (acc >= STEP && n < 5) { if (acc < STEP * 2) { prev.clear(); for (const id in st.units) { const u = st.units[id]; prev.set(id, [u.x, u.y]); } } S.step(st, STEP); acc -= STEP; n++; } if (n >= 5) acc = 0;
      }
      handleEvents();
      // Camera follow.
      if (G.followId && !C.busy()) { const u = st.units[G.followId]; if (u && !u.dead && !u.away) { R.cam.x += (u.x - R.cam.x) * Math.min(1, dt * 4); R.cam.y += (u.y - 20 - R.cam.y) * Math.min(1, dt * 4); } else G.followId = null; }
      keyPan(dt); if (!C.busy()) cameraFeel(dt);
      if (!C.busy()) R.clampCam();
      R.frame(st, dt, { sel: U.sel, ghost: U.mode === 'place' ? U.ghost() : null, interp: { prev, a: paused ? 1 : Math.min(1, acc / STEP) } });
      adapt(dt);
      uiT -= dt; if (uiT <= 0) { uiT = 0.15; U.update(); audioState(st); }
      saveT += dt; if (saveT > 90) { saveT = 0; save(false); }
    }
  }
  function audioState(st) {
    const h = S.heart(st); let fire = 0;
    if (h) { const d = Math.hypot((h.x + 2.5) * TS - R.cam.x, (h.y + 1.5) * TS - R.cam.y); fire = Math.max(0, 1 - d / 500) * 0.5 * Math.min(1, R.cam.z / 1.5); }
    AU.set({ night: S.isNight(st), rain: !!st.weather.rain, battle: st.threat.active && S.foes(st).some(e => !e.flee) && D.FOE[S.foes(st)[0].kind].faction !== 'beast' || S.foes(st).length > 3, fire: Math.round(fire * 20) / 20, murmur: S.present(st).length > 4 && !S.isNight(st) ? 0.12 : 0 });
  }

  // ---- Input -------------------------------------------------------------------------------------
  const ptrs = new Map(); let drag = null, pinch = null;
  const keys = {};
  function bindInput() {
    const cv = $('game');
    cv.addEventListener('pointerdown', e => {
      AU.unlock(); glide.on = false; glide.vx = glide.vy = 0;
      if (C.busy()) { C.skip(); return; }
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        drag = { x: e.clientX, y: e.clientY, cx: R.cam.x, cy: R.cam.y, moved: false, t: performance.now() };
        if (U.mode === 'place') { const w = R.s2w(e.clientX, e.clientY); U.placeAt(Math.floor(w.x / TS), Math.floor(w.y / TS), true); drag.place = true; }
      } else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: R.cam.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, cx: R.cam.x, cy: R.cam.y }; drag = null;
      }
    });
    cv.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        R.cam.z = Math.max(0.55, Math.min(3.2, pinch.z * d / pinch.d)); R.cam.x = pinch.cx - (mx - pinch.mx) / R.cam.z; R.cam.y = pinch.cy - (my - pinch.my) / R.cam.z; G.followId = null;
      } else if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.hypot(dx, dy) > 8) drag.moved = true;
        if (drag.place) { const w = R.s2w(e.clientX, e.clientY); U.placeAt(Math.floor(w.x / TS), Math.floor(w.y / TS), false); }
        else if (drag.moved) { const nx = drag.cx - dx / R.cam.z, ny = drag.cy - dy / R.cam.z; const now = performance.now(), dtm = Math.max(8, now - (drag.lt || now - 16)); glide.vx = glide.vx * 0.6 + (nx - R.cam.x) / dtm * 1000 * 0.4; glide.vy = glide.vy * 0.6 + (ny - R.cam.y) / dtm * 1000 * 0.4; drag.lt = now; R.cam.x = nx; R.cam.y = ny; G.followId = null; }
      }
    });
    const up = e => {
      if (drag && drag.moved && !drag.place && performance.now() - (drag.lt || 0) < 80) glide.on = true; else if (drag) { glide.vx = glide.vy = 0; }
      if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
      if (drag && !drag.moved && !drag.place && performance.now() - drag.t < 600) tap(e.clientX, e.clientY);
      if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) drag = null;
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); zoomT = { z: Math.max(0.55, Math.min(3.2, (zoomT ? zoomT.z : R.cam.z) * Math.pow(1.0018, -e.deltaY))), sx: e.clientX, sy: e.clientY }; }, { passive: false });
    window.addEventListener('keydown', e => {
      keys[e.key.toLowerCase()] = true;
      if (G.mode !== 'play') return;
      if (e.key === ' ') { G.speed = G.speed === 0 ? 1 : 0; e.preventDefault(); }
      if (e.key === 'Escape') { if (C.busy()) C.skip(); else if (U.mode === 'place') U.cancelPlace(); else if (U.open) U.closeModal(); else U.select(null); U.closeDrawer(); }
      if (e.key === 'b' && !U.open) U.openBuild();
      if (e.key === 'h') document.body.classList.toggle('nohud');
      if (e.key === 'Enter' && U.mode === 'place') U.confirmPlace();
      if (e.key === '+' || e.key === '=') R.cam.z *= 1.15; if (e.key === '-') R.cam.z /= 1.15;
      if (['1', '2', '3'].includes(e.key)) G.speed = +e.key;
    });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    document.addEventListener('gesturestart', e => e.preventDefault());
  }
  const glide = { vx: 0, vy: 0, on: false }; let zoomT = null;
  function cameraFeel(dt) {   // coasting after a fling, eased wheel zoom around the cursor
    if (glide.on) { R.cam.x -= 0; R.cam.x += glide.vx * dt; R.cam.y += glide.vy * dt; const k = Math.exp(-dt * 4.5); glide.vx *= k; glide.vy *= k; if (Math.hypot(glide.vx, glide.vy) < 8) glide.on = false; }
    if (zoomT) { const w0 = R.s2w(zoomT.sx, zoomT.sy); R.cam.z += (zoomT.z - R.cam.z) * Math.min(1, dt * 12); const w1 = R.s2w(zoomT.sx, zoomT.sy); R.cam.x += w0.x - w1.x; R.cam.y += w0.y - w1.y; if (Math.abs(zoomT.z - R.cam.z) < 0.002) zoomT = null; }
  }
  function keyPan(dt) {
    const v = 420 * dt / R.cam.z; let mx = 0, my = 0;
    if (keys.a || keys.arrowleft) mx -= v; if (keys.d || keys.arrowright) mx += v; if (keys.w || keys.arrowup) my -= v; if (keys.s || keys.arrowdown) my += v;
    if (mx || my) { R.cam.x += mx; R.cam.y += my; G.followId = null; }
  }
  // What is under a screen point?
  function pickAt(sx, sy) {
    const st = G.st; const w = R.s2w(sx, sy); const tx = Math.floor(w.x / TS), ty = Math.floor(w.y / TS);
    let best = null, bd = 22 / Math.min(1.4, R.cam.z) + 8;
    for (const id in st.units) { const u = st.units[id]; if (u.dead || u.inside || u.away) continue; let ux = u.x, uy = u.y;
      if (u.onTower && st.buildings[u.onTower]) { const b = st.buildings[u.onTower]; ux = (b.x + b.w / 2) * TS; uy = (b.y + b.h) * TS - 92; }
      const F = u.side === 'e' ? HF.D.FOE[u.kind] : null; const cy = F && F.hpY ? F.hpY * 0.45 : u.kind === 'para' ? 22 : 16; const rr = F && F.hpY ? F.hpY * 0.4 : 0;
      const d = Math.hypot(ux - w.x, uy - cy - w.y) - rr; if (d < bd) { bd = d; best = { unit: u }; } }
    const nodeHere = st._.nodeAt[ty * D.W + tx] || [1, 2, 3].map(k => st._.nodeAt[(ty + k) * D.W + tx]).find(n => n && st.nodes[n].type === 'tree');
    if (best && !(nodeHere && bd > 9 && best.unit.side === 's')) return Object.assign(best, { w, tx, ty });
    // Buildings: footprint, or the tall sprite above it.
    for (const id in st.buildings) { const b = st.buildings[id]; if (tx >= b.x && tx < b.x + b.w && ((ty >= b.y && ty < b.y + b.h) || (!b.wall && ty >= b.y - 2 && ty < b.y))) return { b, w, tx, ty }; }
    const i = ty * D.W + tx; const nid = st._.nodeAt[i];
    if (nid) return { node: st.nodes[nid], w, tx, ty };
    // Tall trees: tap on the canopy above.
    for (let k = 1; k <= 3; k++) { const n2 = st._.nodeAt[(ty + k) * D.W + tx]; if (n2 && st.nodes[n2].type === 'tree') return { node: st.nodes[n2], w, tx, ty }; }
    return { w, tx, ty, water: st.terrain[i] === D.T.WATER };
  }
  function mark(x, y, col) { R.marks.push({ x, y, t: 0, col }); }
  function tap(sx, sy) {
    const st = G.st; if (!st || G.mode !== 'play') return;
    if (U.mode === 'place') return;
    if (U.mode === 'rally') { const w = R.s2w(sx, sy); U.mode = 'normal'; document.body.classList.remove('rallying'); G.cmd('rally', { x: Math.floor(w.x / TS), y: Math.floor(w.y / TS) }); return; }
    if (U.open === 'drawer') U.closeDrawer();
    const p = pickAt(sx, sy);
    if (!st.camp) {
      const c = st.clearing;
      if (Math.hypot(p.tx - c.x, p.ty - c.y) <= 6) { const r = G.cmd('makeCamp', { x: p.tx, y: p.ty }); if (r.ok) { U.banner('Camp', 'This is the place.'); const ld = Object.values(st.units).find(u => u.leader); if (ld) ld.task = { t: 'move', x: c.x, y: c.y + 1, manual: true }; } return; }
    }
    const sel = U.sel && U.sel.uid ? st.units[U.sel.uid] : null;
    const leader = S.present(st).length === 1 ? S.present(st)[0] : null;
    const actor = sel && sel.side === 's' && !sel.stranger ? sel : (!U.sel && leader ? leader : null);
    if (p.unit) {
      const u = p.unit;
      if (actor && u.side === 'e') { G.cmd('order', { ids: [actor.id], kind: 'attack', target: u.id }); mark(u.x, u.y, 'rgba(255,90,60,0.9)'); return; }
      if (actor && u.side === 'a') { G.cmd('order', { ids: [actor.id], kind: 'hunt', target: u.id }); mark(u.x, u.y); U.toast(actor.name.split(' ')[0] + ' goes hunting.', 'info'); return; }
      U.select({ uid: u.id }); AU.ui('click'); return;
    }
    if (actor && p.node) { G.cmd('order', { ids: [actor.id], kind: 'gather', target: p.node.id }); mark((p.node.x + 0.5) * TS, (p.node.y + 1) * TS - 6); U.toast(actor.name.split(' ')[0] + ': ' + ({ tree: 'cutting wood', rock: 'breaking stone', bush: 'picking berries', scrap: 'salvaging metal' })[p.node.type] + '.', 'info'); return; }
    if (actor && p.b && (p.b.state === 'site' || p.b.up)) { G.cmd('order', { ids: [actor.id], kind: 'build', target: p.b.id }); mark(p.w.x, p.w.y); return; }
    if (p.b) { U.select({ bid: p.b.id }); AU.ui('click'); return; }
    if (actor && p.water) { G.cmd('order', { ids: [actor.id], kind: 'water' }); mark(p.w.x, p.w.y, 'rgba(140,200,255,0.9)'); U.toast(actor.name.split(' ')[0] + ': fetching water.', 'info'); return; }
    if (actor && sel) { G.cmd('order', { ids: [actor.id], kind: 'move', x: p.tx, y: p.ty }); mark(p.w.x, p.w.y); return; }
    if (actor && leader && !U.sel) { G.cmd('order', { ids: [actor.id], kind: 'move', x: p.tx, y: p.ty }); mark(p.w.x, p.w.y); return; }
    U.select(null);
  }
  HF.debug = { G, S, R, U, C, tap, pickAt, save, loadGame, newGame };
  boot();
})();
