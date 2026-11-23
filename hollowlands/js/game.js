'use strict';
// HOLLOWLANDS — the game: state, interactions, puzzles, waves, the boss, saving, the frame.
const G = (HL.G = {
  state: 'boot', W: 400, H: 200, scale: 1, safe: { l: 0, r: 0, t: 0, b: 0 },
  world: null, player: null, enemies: [], shots: [], drops: [],
  flags: {}, inv: {}, eq: {}, wlv: {}, journal: [], quick: 'poultice', fire: null, fogs: {}, worlds: {},
  settings: { shake: true, mute: false, guide: true }, time: 0, playtime: 0, hitstop: 0, shake: 0, hurtVig: 0,
  cam: { x: 0, y: 0 }, prompt: null, dialog: null, waves: null, bossAwake: false, deadT: 0, fade: 0, saved: null,
});
const Au = HL.Audio;
let store;
try { store = window.localStorage; store.setItem('hl.test', '1'); store.removeItem('hl.test'); } catch (e) { const m = {}; store = { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; }

// ------------------------------------------------------------------ setup
G.boot = function () {
  G.screen = document.getElementById('game');
  G.sg = G.screen.getContext('2d');
  G.glc = document.getElementById('gl');
  G.resize();
  setTimeout(G.boot2, 30); // let the loading screen paint first
};
G.boot2 = function () {
  HL.buildArt();
  try { G.use3d = HL.R3.init && HL.R3.init(G.glc); } catch (e) { G.use3d = false; }
  if (!G.use3d) G.glc.style.display = 'none';
  G.resize();
  window.addEventListener('resize', G.resize);
  window.addEventListener('orientationchange', () => setTimeout(G.resize, 200));
  G.bindInput();
  G.saved = HL.Save.read(store);
  if (G.saved && G.saved.settings) { Object.assign(G.settings, G.saved.settings); HL.Audio.setMuted(!!G.settings.mute); }
  G.toTitle();
  if (G.use3d) HL.R3.setWorld(G.world);
  const ld = document.getElementById('loading'); if (ld) ld.remove();
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.isPlaying()) G.save(); });
  window.addEventListener('pagehide', () => { if (G.isPlaying()) G.save(); });
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    G.frame(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};
G.isPlaying = () => G.player && G.world && ['play', 'menu', 'dialog', 'fire', 'anvil'].includes(G.state);
G.readSafe = () => {
  const d = document.getElementById('safe'); if (!d) return { l: 0, r: 0, t: 0, b: 0 };
  const cs = getComputedStyle(d); const n = (v) => parseFloat(v) || 0;
  return { l: n(cs.paddingLeft), r: n(cs.paddingRight), t: n(cs.paddingTop), b: n(cs.paddingBottom) };
};
G.resize = function () {
  const vw = window.innerWidth, vh = window.innerHeight;
  if (!vw || !vh) { setTimeout(G.resize, 120); return; }
  // held upright (or a viewer that will not rotate): draw the game turned a quarter, so turning the phone shows it in landscape
  G.rot = vh > vw;
  const dpr = Math.min(window.devicePixelRatio || 1, 3), cw = G.rot ? vh : vw, ch = G.rot ? vw : vh;
  G.cssW = cw; G.cssH = ch;
  const st = document.getElementById('stage');
  if (st) { st.style.width = cw + 'px'; st.style.height = ch + 'px'; st.style.transform = G.rot ? 'translateX(' + vw + 'px) rotate(90deg)' : 'none'; }
  const dw = Math.round(cw * dpr), dh = Math.round(ch * dpr);
  G.scale = Math.max(1, Math.round(dh / 200));
  G.W = Math.ceil(dw / G.scale); G.H = Math.ceil(dh / G.scale);
  G.screen.width = dw; G.screen.height = dh; G.screen.style.width = cw + 'px'; G.screen.style.height = ch + 'px';
  G.sg.imageSmoothingEnabled = false;
  G.buf = HL.canvas(G.W, G.H);
  G.blur = HL.canvas(G.W, G.H); G.blurS = HL.canvas(Math.ceil(G.W / 3), Math.ceil(G.H / 3));
  G.light = HL.canvas(Math.ceil(G.W / 2), Math.ceil(G.H / 2));
  const s = G.rot ? { l: 0, r: 0, t: 0, b: 0 } : G.readSafe(), k = dpr / G.scale;
  G.safe = { l: Math.round(s.l * k), r: Math.round(s.r * k), t: Math.round(s.t * k), b: Math.round(s.b * k) };
  if (G.glc) { G.glc.style.width = cw + 'px'; G.glc.style.height = ch + 'px'; if (G.use3d) HL.R3.resize(G.W, G.H); }
  HL.UI.layoutControls(G.W, G.H, G.safe);
  G.makePost();
  G.portrait = false;
};
G.makePost = function () {
  // rounded dark vignette (the reference's frame) and film grain
  const W = G.W, H = G.H, v = HL.canvas(W, H), g = v.g;
  g.fillStyle = 'rgba(18,14,15,1)';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = Math.abs(x / W - 0.5) * 2, ny = Math.abs(y / H - 0.5) * 2;
    const q = Math.pow(Math.pow(nx, 4) + Math.pow(ny, 4), 0.25);
    const a = HL.clamp((q - 0.9) * 3, 0, 0.85);
    if (a > 0 && HL.bayer(x, y) < a) g.fillRect(x, y, 1, 1);
  }
  G.vig = v;
  const gr = HL.canvas(64, 64), r = HL.rng(5);
  for (let i = 0; i < 64 * 64 * 0.08; i++) { gr.g.fillStyle = r() < 0.5 ? 'rgba(255,250,240,0.06)' : 'rgba(0,0,0,0.07)'; gr.g.fillRect((r() * 64) | 0, (r() * 64) | 0, 1, 1); }
  G.grain = gr;
  if (!G.cloud) {
    const c = HL.canvas(256, 256), cg = c.g, per = 8;
    const pn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf); const h = (a, b) => HL.hash(((a % per) + per) % per, ((b % per) + per) % per, 61); const A = h(xi, yi), B = h(xi + 1, yi), C = h(xi, yi + 1), D = h(xi + 1, yi + 1); return A + (B - A) * u + (C - A) * w + (A - B - C + D) * u * w; };
    cg.fillStyle = 'rgba(28,22,24,0.2)';
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const n = pn(x / 32, y / 32) * 0.7 + pn(x / 16 + 3, y / 16 + 3) * 0.3; const a = HL.clamp((n - 0.5) * 4, 0, 1); if (a > 0 && HL.bayer(x, y) < a) cg.fillRect(x, y, 1, 1); }
    G.cloud = c;
  }
};

// ------------------------------------------------------------------ input wiring
G.toBuf = (e) => {
  const lx = G.rot ? e.clientY : e.clientX, ly = G.rot ? window.innerWidth - e.clientX : e.clientY;
  return { x: (lx / G.cssW) * G.W, y: (ly / G.cssH) * G.H };
};
G.bindInput = function () {
  const I = HL.Input, cv = G.screen;
  const capture = (id) => { try { cv.setPointerCapture(id); } catch (e) { /* some browsers refuse; input still works */ } };
  window.addEventListener('keydown', (e) => { Au.unlock(); const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['Tab', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault(); I.down(k); });
  window.addEventListener('keyup', (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; I.up(k); });
  window.addEventListener('blur', () => { for (const k in I.keys) I.keys[k] = false; I.clearTouches(); });
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); Au.unlock();
    const p = G.toBuf(e);
    if (G.state !== 'play') { HL.UI.tap(p.x, p.y); return; }
    for (const c of I.layout) {
      if (c.id === 'ult' && G.eq.relic !== 'bell_shard') continue;
      if (c.id === 'interact' && !G.prompt) continue;
      if (HL.dist(p.x, p.y, c.x, c.y) <= c.r + 5) { I.st.btn[c.id] = { held: true, press: true, pid: e.pointerId, cx: c.x, cy: c.y, ax: null, ay: null }; capture(e.pointerId); return; }
    }
    if (p.x < G.W * 0.5) { I.st.joy = { pid: e.pointerId, ox: p.x, oy: p.y, dx: 0, dy: 0, mag: 0 }; capture(e.pointerId); }
    else { I.st.btn.attack = { held: true, press: true, pid: e.pointerId, cx: p.x, cy: p.y, ax: null, ay: null }; capture(e.pointerId); } // right side: strike
  }, { passive: false });
  cv.addEventListener('pointermove', (e) => {
    const ab = I.st.btn.attack;
    if (ab && ab.held && ab.pid === e.pointerId) { // drag from the attack button to aim
      const p = G.toBuf(e), dx = p.x - ab.cx, dy = p.y - ab.cy, d = Math.hypot(dx, dy);
      if (d > 7) { ab.ax = dx / d; ab.ay = dy / d; ab.dd = Math.min(1, d / 26); } else if (ab.ax != null && d < 4) { ab.ax = ab.ay = null; }
      return;
    }
    const j = I.st.joy; if (!j || j.pid !== e.pointerId) return;
    const p = G.toBuf(e); let dx = p.x - j.ox, dy = p.y - j.oy; const d = Math.hypot(dx, dy), R = 20;
    if (d > R * 1.6) { j.ox += (dx / d) * (d - R * 1.6); j.oy += (dy / d) * (d - R * 1.6); dx = p.x - j.ox; dy = p.y - j.oy; }
    const m = HL.clamp((Math.hypot(dx, dy) / R - 0.12) / 0.6, 0, 1), a = Math.atan2(dy, dx);
    j.mag = m; j.dx = Math.cos(a) * m; j.dy = Math.sin(a) * m;
  });
  const end = (e) => {
    const j = I.st.joy; if (j && j.pid === e.pointerId) I.st.joy = null;
    for (const n in I.st.btn) { const b = I.st.btn[n]; if (b && b.pid === e.pointerId && b.held) { b.held = false; b.release = true; } }
  };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
};

// ------------------------------------------------------------------ game lifecycle
G.freshState = function () {
  Object.assign(G, { flags: {}, inv: { tattered_cloak: 1 }, eq: { weapon: null, armor: 'tattered_cloak', relic: null }, wlv: {}, journal: [], quick: 'poultice', fogs: {}, worlds: {}, playtime: 0, waves: null, bossAwake: false, objText: null, cut: null });
  G.fire = { map: 'ashwick', x: HL.getMap('ashwick').start.x, y: HL.getMap('ashwick').start.y };
};
G.toTitle = function () {
  G.state = 'title'; HL.UI.regions = [];
  G.saved = HL.Save.read(store); G.confirmNew = false;
  if (!G.worlds.ashwick) { G.freshState(); }
  G.world = G.getWorld('ashwick'); G.player = null; G.enemies = []; G.shots = []; G.drops = [];
  G.titleCam = { x: 26 * 8, y: 40 * 8 };
  Au.ambient('wind');
};
G.newGame = function () {
  HL.Save.clear(store);
  G.freshState();
  const s = HL.getMap('ashwick').start;
  G.player = new HL.Player(s.x, s.y); G.player.face = -Math.PI / 2;
  G.loadMap('ashwick', s.x, s.y);
  G.state = 'play'; G.time = 0;
  G.save();
  G.playCut('intro', () => { HL.UI.showBanner('Ashwick Vale', 'You wake beside a wrecked cart.'); HL.UI.toast('Left thumb: move. Follow the objective at the top left.', 5); });
};
// ------------------------------------------------------------------ cutscenes: camera moves over the world with a card
G.playCut = function (id, onEnd) {
  const def = HL.CUTS[id]; if (!def) { if (onEnd) onEnd(); return; }
  G.flags['cut:' + id] = 1;
  if (def.note) G.addJournal(def.note);
  G.cut = { def, i: 0, t: 0, onEnd, fromX: G.player ? G.player.x : def.shots[0].x, fromY: G.player ? G.player.y : def.shots[0].y, fromV: 165 };
  G.state = 'cut'; HL.Input.clearTouches();
  if (def.shots[0].toll) Au.play('toll');
};
G.cutShot = function () {
  const c = G.cut; if (!c) return null;
  const s = c.def.shots[c.i], prev = c.i ? c.def.shots[c.i - 1] : { x: c.fromX, y: c.fromY, view: c.fromV };
  const k = HL.clamp(c.t / Math.min(2.2, s.dur * 0.6), 0, 1), e = k * k * (3 - 2 * k);
  return { x: HL.lerp(prev.x, s.x, e), y: HL.lerp(prev.y, s.y, e), view: HL.lerp(prev.view || 165, s.view || 165, e), text: s.text, k: c.t };
};
G.nextShot = function (skipAll) {
  const c = G.cut; if (!c) return;
  const last = c.def.shots[c.i];
  if (!skipAll && c.i < c.def.shots.length - 1) { c.fromX = last.x; c.fromY = last.y; c.fromV = last.view; c.i++; c.t = 0; Au.play('page'); if (c.def.shots[c.i].toll) Au.play('toll'); return; }
  G.cut = null; G.state = 'play'; HL.Input.clearTouches(); G.snapCam();
  if (c.onEnd) c.onEnd();
};
// ------------------------------------------------------------------ objective and guide
G.objective = function () {
  if (!G.player || !G.world) return null;
  const o = HL.objective(G.flags, G.inv, G.eq, G.world.id); if (!o) return null;
  let tgt = null;
  if (o.id === 'keeper') tgt = G.enemies.find((e) => e.type === 'keeper' && !e.dead) || null;
  else if (o.id) { const ob = G.world.obj(o.id); if (ob && !ob.taken && !(ob.t === 'container' && ob.opened)) tgt = ob; }
  return { text: o.text, tgt, optional: o.optional };
};
G.continueGame = function () {
  const d = HL.Save.read(store); if (!d) return G.newGame();
  G.freshState();
  Object.assign(G, { flags: d.flags, inv: d.inv, eq: Object.assign({ weapon: null, armor: 'tattered_cloak', relic: null }, d.eq), wlv: d.wlv || {}, journal: d.journal, fire: d.fire || G.fire, playtime: d.playtime || 0 });
  G.quick = d.quick || 'poultice';
  for (const [k, s] of Object.entries(d.fog || {})) { const m = HL.getMap(k); G.fogs[k] = HL.Save.unpackFog(s, Math.ceil(m.W / 2) * Math.ceil(m.H / 2)); }
  G.player = new HL.Player(d.x, d.y); G.player.hp = Math.max(1, d.hp); G.player.ult = d.ult || 0;
  G.loadMap(d.map, d.x, d.y);
  G.state = 'play'; G.time = 60;
  HL.UI.showBanner(G.world.name);
};
G.save = function (manual) {
  if (!G.player || !G.world || G.player.state === 'dead') return false;
  const ok = HL.Save.write(store, G);
  if (manual) HL.UI.toast(ok ? 'Saved.' : 'Could not save on this device.');
  return ok;
};
G.getWorld = function (id) { return G.worlds[id] || (G.worlds[id] = new HL.World(HL.getMap(id))); };

G.loadMap = function (id, x, y) {
  const w = G.getWorld(id);
  G.world = w;
  w.fog = G.fogs[id] || (G.fogs[id] = new Uint8Array(Math.ceil(w.W / 2) * Math.ceil(w.H / 2)));
  w.mapImg = null;
  G.player.x = x; G.player.y = y; G.player.vx = G.player.vy = 0;
  G.enemies = []; G.shots = []; G.drops = []; HL.fx.list = [];
  G.waves = null; G.bossAwake = false; G.region = null;
  for (const s of w.def.enemies) {
    if (s.id && G.flags['k:' + s.id]) continue;
    G.enemies.push(new HL.Enemy(s));
  }
  G.applyState();
  G.snapCam();
  Au.ambient(w.amb);
};
// world objects follow the saved flags
G.applyState = function () {
  const w = G.world, f = G.flags;
  for (const o of w.objects) {
    if (o.t === 'container') o.opened = !!f['c:' + o.id];
    if (o.t === 'pickup') o.taken = !!f['p:' + o.id];
    if (o.t === 'stone') o.face = f['stone:' + o.idx] != null ? f['stone:' + o.idx] : o.face0 != null ? o.face0 : (o.face0 = o.face);
    if (o.t === 'roots') { o.gone = !!f.stones_done; if (o.rect) { if (o.gone) G.setSolid(o, false); else G.setSolid(o, true); } }
    if (o.t === 'resonator') o.charge = 0;
    if (o.t === 'well') o.sprite = HL.ART.spr[f.well_done ? 'wellBucket' : 'well'];
    if (o.t === 'door') G.setDoor(o, G.doorOpen(o));
  }
  for (const b of w.buildings) b.fade = b.inside(G.player.x, G.player.y) ? 0 : 1;
  // persistent drops that were never picked up
  const persist = [['crypt2', 'boss_dead', 'p_bellkey', 'bell_key', 19 * 8, 13 * 8], ['crypt2', 'boss_dead', 'p_breaker', 'bellbreaker', 21 * 8, 14 * 8], ['ashwick', 'k:guard_camp', 'p_plate', 'rustbound_plate', 141 * 8, 64 * 8]];
  for (const [m, cond, id, item, x, y] of persist) if (w.id === m && f[cond] && !f['p:' + id] && !w.obj(id)) w.objects.push({ t: 'pickup', id, item, n: 1, x, y });
};
G.setSolid = (o, on) => { const r = o.rect; G.world.rectCells(r.x0, r.y0, r.x1, r.y1, (k) => { G.world.col[k] = on ? 3 : 0; }); };
G.doorOpen = function (o) {
  const f = G.flags;
  if (o.id === 'd_chapel') return !!f.chapel_open;
  if (o.puzzle === 'bells') return !!f.bells_done;
  if (o.puzzle === 'waves') return !!f.waves_done;
  if (o.puzzle === 'arena') return !G.bossAwake;
  if (o.id === 'd_iron' && G.waves && G.waves.active) return false;
  if (o.locked) return !!f['d:' + o.id];
  return true;
};
G.setDoor = function (o, open) { o.open = open; G.world.setDyn(o.rect, !open); if (o.building) o.building.doorOpen = open; };
G.refreshDoors = function () { for (const o of G.world.objects) if (o.t === 'door') G.setDoor(o, G.doorOpen(o)); };

G.transition = function (to, x, y, after) {
  if (G.state === 'fade') return;
  G.state = 'fade'; G.fadeT = 0; G.fadeTo = { to, x, y, after };
  HL.Input.clearTouches();
};

// ------------------------------------------------------------------ items, journal, dialogue
G.give = function (id, n = 1, quiet) {
  const added = HL.Inv.add(G.inv, id, n);
  const it = HL.ITEMS[id];
  if (added < n) G.dropItem(id, n - added, G.player.x + 6, G.player.y + 2, true);
  if (added && !quiet) { HL.UI.pushFeed(id, added); Au.play(it.kind === 'material' ? 'pickup' : 'item'); }
  if (it.kind === 'weapon' && !G.eq.weapon) { G.eq.weapon = id; }
  if (it.kind === 'consumable' && !G.inv[G.quick]) G.quick = id;
  if (id === 'rusted_sword') HL.UI.toast('ATTACK: tap to strike the nearest foe, or press and drag to aim. Hold to charge a heavy blow. DASH slips through attacks.', 6);
  if (id === 'ashwood_spear' || id === 'bellbreaker') HL.UI.toast('A new weapon. Open your pack (top right) to wield it.');
  if (it.kind === 'armor' && id !== 'tattered_cloak') HL.UI.toast(it.name + ': open your pack to wear it.');
  if (id === 'bell_shard') { G.eq.relic = 'bell_shard'; HL.UI.toast('The shard hums. Fighting fills it; when full, unleash your weapon\'s ultimate.'); }
  if (id === 'gate_key') G.flags.got_gate_key = 1;
  return added;
};
G.dropItem = function (item, n, x, y, noMerge) { G.drops.push({ item, n, x, y, t: 0, delay: noMerge ? 1.2 : 0.4 }); };
G.addJournal = function (id) { if (!G.journal.includes(id)) { G.journal.push(id); return true; } return false; };
G.showNote = function (id) { G.addJournal(id); G.dialog = { kind: 'note', id }; G.state = 'dialog'; Au.play('page'); };
G.talk = function (name, lines, onEnd) { G.dialog = { kind: 'talk', name, lines, i: 0, onEnd }; G.state = 'dialog'; };
G.advanceDialog = function () {
  const d = G.dialog; if (!d) { G.state = 'play'; return; }
  if (d.kind === 'talk' && d.i < d.lines.length - 1) { d.i++; Au.play('tick'); return; }
  G.dialog = null; G.state = 'play';
  if (d.onEnd) d.onEnd();
  if (d.then) d.then();
};
G.openMenu = (tab) => { G.state = 'menu'; HL.UI.menu.tab = tab || 'items'; HL.Input.clearTouches(); Au.play('page'); };
G.closeMenu = () => { G.state = 'play'; HL.Input.clearTouches(); };
G.useQuick = function () {
  const p = G.player, id = G.quick;
  if (!id || !G.inv[id] || p.state !== 'move') return;
  if (id === 'poultice') { if (p.hp >= p.maxhp) return HL.UI.toast('You are not hurt.'); HL.Inv.remove(G.inv, id); p.state = 'heal'; p.t = 0; Au.play('eat'); }
  else if (id === 'dried_meat') { HL.Inv.remove(G.inv, id); p.regen = 15; Au.play('eat'); HL.fx.text(p.x, p.y - 16, '+regen', P.cream2, 1); }
  else if (id === 'fire_flask') {
    HL.Inv.remove(G.inv, id);
    const t = p.nearestFoe(110), a = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.face, d = t ? HL.dist(p.x, p.y, t.x, t.y) : 50;
    G.shots.push({ x: p.x, y: p.y - 6, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, flask: true, t: 0, dur: 0.45, life: 1 });
    Au.play('swing');
  }
  if (!G.inv[id]) { const next = ['poultice', 'dried_meat', 'fire_flask'].find((c) => G.inv[c]); if (next) G.quick = next; }
};

// ------------------------------------------------------------------ interaction
G.interactables = function () {
  const w = G.world, f = G.flags, out = [];
  for (const o of w.objects) {
    let label = null, r = 15;
    switch (o.t) {
      case 'container': if (!o.opened) label = o.label || 'Search'; break;
      case 'note': label = 'Read'; break;
      case 'door': if (!o.open) { label = o.id === 'd_chapel' ? (G.player.y < o.y ? 'Lift the bar' : 'Examine') : o.locked ? (G.inv[o.locked] ? 'Unlock' : 'Locked') : 'Examine'; r = 14; } break;
      case 'exit': label = o.locked && !f['d:' + o.doorId] ? (G.inv[o.locked] ? 'Unlock' : 'Locked') : o.label; r = 14; break;
      case 'fire': label = 'Fire'; r = 17; break;
      case 'npc': label = 'Talk'; r = 17; break;
      case 'well': label = f.well_done ? 'Look' : G.inv.winch_crank ? 'Fit the crank' : 'Examine'; r = 17; break;
      case 'stone': label = 'Turn'; r = 14; break;
      case 'roots': if (!o.gone) { label = 'Examine'; r = 16; } break;
      case 'bell': label = 'Strike'; r = 13; break;
      case 'crank': if (!f.waves_done && !(G.waves && G.waves.active)) label = 'Turn the crank'; r = 15; break;
      case 'anvil': label = 'Anvil'; r = 15; break;
    }
    if (!label) continue;
    const d = HL.dist(G.player.x, G.player.y, o.x, o.y - 2);
    if (d < r) out.push({ o, label, d });
  }
  out.sort((a, b) => a.d - b.d);
  return out[0] || null;
};
G.interact = function (it) {
  const o = it.o, f = G.flags, p = G.player;
  switch (o.t) {
    case 'container': {
      o.opened = true; f['c:' + o.id] = 1; Au.play('open');
      if (!o.loot.length && !o.note) HL.UI.toast('Nothing.');
      for (const [id, n] of o.loot) G.give(id, n);
      if (o.note) G.showNote(o.note);
      G.save();
      break;
    }
    case 'note': G.showNote(o.note); break;
    case 'door': {
      if (o.id === 'd_chapel') {
        if (p.y < o.y) { f.chapel_open = 1; G.setDoor(o, true); Au.play('unlock'); HL.UI.toast('You lift the bar. The chapel opens onto Ashwick: a way back.'); G.save(); }
        else HL.UI.toast('Chained shut. The chain is fixed on the inside.');
      } else if (o.puzzle === 'bells') HL.UI.toast('A sealed vault door, cast with bells. Three bells hang along the wall.');
      else if (o.puzzle === 'waves') HL.UI.toast('A heavy gate, lowered. The crank in the hall must raise it.');
      else if (o.puzzle === 'arena') HL.UI.toast('The bars will not move.');
      else if (o.locked) {
        if (G.inv[o.locked]) { f['d:' + o.id] = 1; G.setDoor(o, true); Au.play('unlock'); HL.UI.toast('Unlocked with the ' + HL.itemName(o.locked) + '.'); if (o.id === 'd_store') f.storehouse_open = 1; G.save(); }
        else { Au.play('locked'); HL.UI.toast('Locked.' + (o.id === 'd_store' ? ' A sheaf of wheat is stamped on the lock.' : '')); }
      }
      break;
    }
    case 'exit': {
      if (o.locked && !f['d:' + o.doorId]) {
        if (!G.inv[o.locked]) { Au.play('locked'); HL.UI.toast('The tower gate is locked. A big, rust-red keyhole.'); return; }
        f['d:' + o.doorId] = 1; Au.play('unlock'); HL.UI.toast('The gate key turns. Light spills out below.'); G.save();
        return;
      }
      if (o.setFlag) f[o.setFlag] = 1;
      G.transition(o.to, o.tx, o.ty);
      break;
    }
    case 'fire': {
      if (!f['lit:' + o.id]) { f['lit:' + o.id] = 1; Au.play('fire'); HL.UI.toast('You light the fire.'); }
      G.fire = { map: G.world.id, x: o.x, y: o.y + 12 };
      G.state = 'fire'; Au.play('rest');
      break;
    }
    case 'npc': {
      const entry = HL.MAREN.find((e) => e.when(f));
      G.talk('Maren', entry.lines, () => { if (entry.set) f[entry.set] = 1; if (entry.set === 'maren_end' && !f.end_seen) { f.end_seen = 1; G.addJournal('next_region'); G.state = 'end'; } G.save(); });
      break;
    }
    case 'well': {
      if (f.well_done) { HL.UI.toast('The bucket is up. The well is dry and quiet.'); break; }
      if (!G.inv.winch_crank) { HL.UI.toast('The winch has no handle. Its socket is square, and the rope goes down into the dark.'); break; }
      HL.Inv.remove(G.inv, 'winch_crank'); f.well_done = 1; o.spr = 'wellBucket'; o.sprite = HL.ART.spr.wellBucket;
      Au.play('ratchet'); setTimeout(() => Au.play('ratchet'), 550);
      HL.UI.toast('The crank fits. The bucket comes up out of the dark.');
      G.give('storehouse_key', 1); G.give('iron_scrap', 1); G.save();
      break;
    }
    case 'stone': {
      if (f.stones_done) { HL.UI.toast('The stones are set. Eye, bell, moon.'); break; }
      if (!f.seen_stones) { f.seen_stones = 1; G.showNote('stones_hint'); }
      o.face = (o.face + 1) % 4; f['stone:' + o.idx] = o.face; Au.play('rumble'); HL.fx.dust(o.x, o.y, 5);
      HL.fx.text(o.x, o.y - 22, ['eye', 'bell', 'moon', 'sun'][o.face], P.cream, 0.9);
      const st = G.world.objects.filter((s) => s.t === 'stone').sort((a, b) => a.idx - b.idx);
      if (st.map((s) => s.face).join() === '0,1,2') {
        f.stones_done = 1; const roots = G.world.obj('roots'); roots.gone = true; G.setSolid(roots, false);
        Au.play('rumble'); G.shake = 3; HL.UI.toast('The ground shudders. To the east, roots draw back into the earth.'); G.save();
      }
      break;
    }
    case 'roots': HL.UI.toast('A wall of living roots. They flinch from your blade but close again. The stones nearby may know why.'); break;
    case 'bell': {
      Au.play(['bellLow', 'bellMid', 'bellHigh'][o.tone]);
      HL.fx.text(o.x, o.y - 20, ['a low toll', 'a middle toll', 'a high toll'][o.tone], P.cream, 1.2);
      HL.fx.ring(o.x, o.y - 6, 8 + (2 - o.tone) * 4, P.lt1, 0.6);
      if (f.bells_done) break;
      G.bellSeq = (G.bellSeq || []).concat(o.tone);
      const want = [0, 2, 1];
      if (G.bellSeq.every((t, i) => t === want[i]) && G.bellSeq.length === 3) {
        f.bells_done = 1; G.refreshDoors(); Au.play('rumble'); G.shake = 3; G.bellSeq = [];
        setTimeout(() => HL.UI.toast('The three tones settle into one. The vault door swings open.'), 400); G.save();
      } else if (G.bellSeq.some((t, i) => t !== want[i])) { setTimeout(() => Au.play('bad'), 300); G.bellSeq = o.tone === want[0] ? [o.tone] : []; HL.fx.text(o.x, o.y - 30, 'discord', P.red0, 1); }
      break;
    }
    case 'crank': G.startWaves(o); break;
    case 'anvil': G.state = 'anvil'; break;
  }
};
G.targetProp = function (p, reach) {
  for (const o of G.world.objects) if (o.t === 'resonator' && o.charge > 0 && HL.dist(p.x, p.y, o.x, o.y) < reach) return o;
  return null;
};
G.hitProps = function (p, reach, arc, atk) {
  for (const o of G.world.objects) {
    if (o.t !== 'resonator' || atk.hit.has(o)) continue;
    const d = HL.dist(p.x, p.y, o.x, o.y); if (d > reach + 5) continue;
    if (Math.abs(HL.angDiff(p.face, Math.atan2(o.y - p.y, o.x - p.x))) > arc / 2 + 0.3) continue;
    atk.hit.add(o);
    if (o.charge > 0) {
      o.charge = 0; Au.play('toll'); G.shake = 3; G.hitstop = 0.1;
      const k = G.enemies.find((e) => e.type === 'keeper' && !e.dead);
      HL.fx.ring(o.x, o.y - 6, 60, P.lt0, 0.6, 2);
      if (k) { k.stunned = 4.2; k.state = 'stunned'; k.tele = null; k.wave = null; HL.fx.text(k.x, k.y - 42, 'stunned', P.lt0, 1.2); }
    } else { Au.play('clank'); HL.fx.burst(o.x, o.y - 8, P.bronze, 3, 30, 0.2); }
  }
};

// ------------------------------------------------------------------ waves: the crank hall
G.WAVES = [['drifter', 'drifter', 'drifter', 'drifter'], ['drifter', 'drifter', 'archer', 'archer', 'drifter'], ['guard', 'hound', 'hound', 'drifter', 'drifter']];
G.startWaves = function () {
  if (G.flags.waves_done) return;
  G.waves = { active: true, wave: 0, queue: [], spawnT: 0, pause: 0.8, alive: [], progress: 0 };
  G.refreshDoors(); Au.play('ratchet'); Au.play('toll'); G.shake = 2;
  HL.UI.toast('The crank catches. The gate begins to rise, and the echo carries down every tunnel.');
};
G.updateWaves = function (dt) {
  const W = G.waves; if (!W || !W.active) return;
  const pts = G.world.obj('waves').points;
  if (W.pause > 0) { W.pause -= dt; if (W.pause <= 0) W.queue = G.WAVES[W.wave].slice(); return; }
  if (W.queue.length) {
    W.spawnT -= dt;
    if (W.spawnT <= 0) {
      W.spawnT = 0.5;
      const far = pts.filter(([x, y]) => HL.dist(x, y, G.player.x, G.player.y) > 40);
      const [x, y] = (far.length ? far : pts)[Math.floor(Math.random() * (far.length || pts.length))];
      const e = G.spawnEnemy({ foe: W.queue.shift(), x, y, summoned: true }); W.alive.push(e);
      HL.fx.ring(x, y, 10, P.red0, 0.5); HL.fx.burst(x, y, P.st1, 6, 30);
    }
  }
  const left = W.alive.filter((e) => !e.dead).length + W.queue.length, total = G.WAVES[W.wave].length;
  W.progress = (W.wave + (total - left) / total) / G.WAVES.length;
  if (!left && !W.queue.length && W.alive.length) {
    W.wave++; W.alive = [];
    if (W.wave >= G.WAVES.length) {
      W.active = false; W.progress = 1; G.flags.waves_done = 1; G.refreshDoors(); Au.play('rumble'); G.shake = 4;
      HL.UI.toast('The gate grinds fully open. Stairs lead down.'); G.save();
    } else { W.pause = 2.2; HL.UI.toast('Wave ' + W.wave + ' of 3 broken. The gate keeps rising.'); Au.play('ratchet'); }
  }
};
G.spawnEnemy = function (spec) { const e = new HL.Enemy(spec); G.enemies.push(e); return e; };
G.onEnemyDeath = function (e) {
  if (e.id === 'guard_camp') { G.world.objects.push({ t: 'pickup', id: 'p_plate', item: 'rustbound_plate', n: 1, x: e.x, y: e.y }); }
  if (e.type === 'keeper') {
    G.flags.boss_dead = 1; G.bossAwake = false; G.refreshDoors();
    Au.ambient('crypt'); Au.play('toll'); G.shake = 5;
    for (const o of G.enemies) if (o.summoned && !o.dead) HL.killEnemy(o);
    G.applyState();
    HL.UI.showBanner('The Keeper falls', 'Something rattles inside its bell.');
    setTimeout(() => { if (G.state === 'play') G.showNote('keeper_fall'); }, 1800);
    G.save();
  }
};
G.onDeath = function () { G.deadT = 0; setTimeout(() => { if (G.player.state === 'dead') G.state = 'dead'; }, 700); };
G.respawn = function () {
  const f = G.fire, p = G.player;
  p.hp = p.maxhp; p.st = p.maxst; p.state = 'move'; p.inv = 1; p.regen = 0;
  G.transition(f.map, f.x, f.y, () => { HL.UI.toast('You wake by the fire. The hollow you felled stand again.'); });
  G.state = 'fade';
};
G.rest = function () {
  const p = G.player; p.hp = p.maxhp; p.st = p.maxst;
  Au.play('rest');
  G.loadMap(G.world.id, p.x, p.y);
  G.save(); HL.UI.toast('You rest. Wounds close; the dark fills up again.');
  G.state = 'play';
};

// ------------------------------------------------------------------ frame
G.frame = function (dt) {
  G.time += dt;
  const inp = HL.Input.poll();
  if (G.state === 'play') G.update(dt, inp);
  else if (G.state === 'fade') {
    G.fadeT += dt;
    if (G.fadeT > 0.35 && G.fadeTo) { const t = G.fadeTo; G.fadeTo = null; G.loadMap(t.to, t.x, t.y); HL.UI.showBanner(G.world.name); if (t.after) t.after(); G.save(); if (t.to === 'crypt1' && !G.flags['cut:crypt']) G.pendingCut = 'crypt'; }
    if (G.fadeT > 0.7) { G.state = 'play'; if (G.pendingCut) { const c = G.pendingCut; G.pendingCut = null; G.playCut(c); } }
    HL.fx.update(dt);
  } else if (G.state === 'cut') {
    G.cut.t += dt;
    if (inp.esc) G.nextShot(true);
    else if (inp.attack || inp.interact || inp.enter || inp.dodge || G.cut.t > G.cut.def.shots[G.cut.i].dur) G.nextShot();
    HL.fx.update(dt);
  } else {
    if (G.state === 'dead') G.deadT += dt;
    if ((G.state === 'menu') && (inp.menu || inp.esc)) G.closeMenu();
    else if (G.state === 'dialog' && (inp.interact || inp.enter || inp.attack || inp.esc)) G.advanceDialog();
    else if ((G.state === 'fire' || G.state === 'anvil' || G.state === 'end') && inp.esc) G.state = 'play';
    if (G.state === 'menu' && inp.map) UI_tab('map');
    HL.fx.update(dt * 0.3);
  }
  G.render(dt);
};
function UI_tab(t) { HL.UI.menu.tab = t; }

G.update = function (dt, inp) {
  const p = G.player;
  G.playtime += dt;
  if (inp.menu || inp.esc) { G.openMenu('items'); return; }
  if (inp.map) { G.openMenu('map'); return; }
  G.prompt = p.state === 'move' ? G.interactables() : null;
  if (inp.interact && G.prompt) { G.interact(G.prompt); return; }
  if (inp.item) G.useQuick();
  if (inp.swap) { const ws = Object.keys(HL.WEAPONS).filter((w) => G.inv[w]); if (ws.length > 1) { G.eq.weapon = ws[(ws.indexOf(G.eq.weapon) + 1) % ws.length]; HL.UI.toast(HL.itemName(G.eq.weapon)); } }
  if (G.hitstop > 0) { G.hitstop -= dt; G.shake = Math.max(0, G.shake - dt * 10); return; }
  p.update(dt, inp);
  for (const e of G.enemies) e.update(dt);
  // soft separation
  for (let i = 0; i < G.enemies.length; i++) {
    const a = G.enemies[i]; if (a.dead || a.hidden || a.type === 'lurker') continue;
    for (let j = i + 1; j < G.enemies.length; j++) { const b = G.enemies[j]; if (b.dead || b.hidden || b.type === 'lurker') continue; const d = HL.dist(a.x, a.y, b.x, b.y), m = a.r + b.r + 1; if (d < m && d > 0.01) { const k = ((m - d) / d) * 0.5; G.world.move(a, -(b.x - a.x) * k, -(b.y - a.y) * k); G.world.move(b, (b.x - a.x) * k, (b.y - a.y) * k); } }
    const d = HL.dist(a.x, a.y, p.x, p.y), m = a.r + p.r; if (d < m && d > 0.01 && p.state !== 'roll') { const k = (m - d) / d; G.world.move(p, (p.x - a.x) * k * 0.5, (p.y - a.y) * k * 0.5); }
  }
  G.enemies = G.enemies.filter((e) => !(e.dead && e.deadT > 2 && e.type !== 'keeper'));
  G.updateShots(dt);
  G.updateDrops(dt);
  G.updateWaves(dt);
  HL.fx.update(dt);
  G.updateBoss(dt);
  G.updateRegion();
  if (G.world.id === 'ashwick' && p.x > 150 * 8 && !G.flags['cut:tower']) { G.playCut('tower'); return; }
  const ob = G.objective(), txt = ob && ob.text;
  if (txt !== G.objText) { if (G.objText != null && txt) { HL.UI.objFlash = 2.5; Au.play('item'); } G.objText = txt; }
  // buildings fade their roofs while you're inside
  for (const b of G.world.buildings) b.fade = HL.approach(b.fade, b.inside(p.x, p.y) ? 0 : 1, dt * 4);
  // reveal the map around you
  const w = G.world, fw = Math.ceil(w.W / 2), R = w.dark ? 4 : 6, cx = Math.floor(p.x / 16), cy = Math.floor(p.y / 16);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= R * R) { const x = cx + i, y = cy + j; if (x >= 0 && y >= 0 && x < fw && y < Math.ceil(w.H / 2)) w.fog[y * fw + x] = 1; }
  G.shake = Math.max(0, G.shake - dt * 10); G.hurtVig = Math.max(0, G.hurtVig - dt);
  G.autoT = (G.autoT || 0) + dt; if (G.autoT > 45) { G.autoT = 0; if (!G.enemies.some((e) => !e.dead && (e.state === 'chase' || e.state === 'tele'))) G.save(); }
};
G.updateShots = function (dt) {
  const p = G.player;
  for (const s of G.shots) {
    if (s.flask) {
      s.t += dt; const q = Math.min(1, s.t / s.dur);
      s.cx = HL.lerp(s.x, s.tx, q); s.cy = HL.lerp(s.y + 6, s.ty, q) - Math.sin(q * Math.PI) * 18;
      if (q >= 1) {
        s.life = 0; Au.play('fire'); G.shake = 2; HL.fx.burst(s.tx, s.ty, P.fire, 14, 50); HL.fx.burst(s.tx, s.ty, P.red0, 8, 40); HL.fx.ring(s.tx, s.ty, 18, P.fire, 0.4);
        for (const e of G.enemies) if (!e.dead && !e.hidden && HL.dist(e.x, e.y, s.tx, s.ty) < 18 + e.r) HL.hitEnemy(e, 38, { heavy: true, breaker: true, fx: s.tx, fy: s.ty, poise: 30 });
      }
      continue;
    }
    s.life -= dt;
    const n = 3;
    for (let k = 0; k < n && s.life > 0; k++) {
      s.x += (s.vx * dt) / n; s.y += (s.vy * dt) / n;
      if (G.world.sightBlocked(s.x, s.y + 4)) { s.life = 0; HL.fx.burst(s.x, s.y, P.st1, 3, 20, 0.2); break; }
      if (HL.dist(s.x, s.y + 5, p.x, p.y) < p.r + 2) { if (p.hurt(s.dmg, s.x - s.vx, s.y - s.vy)) s.life = 0; }
    }
  }
  G.shots = G.shots.filter((s) => s.life > 0);
};
G.updateDrops = function (dt) {
  const p = G.player;
  for (const d of G.drops) {
    d.t += dt; if (d.t < d.delay) continue;
    const dist = HL.dist(d.x, d.y, p.x, p.y);
    if (dist < 22) { d.x += (p.x - d.x) * dt * 8; d.y += (p.y - d.y) * dt * 8; }
    if (dist < 5) { d.gone = true; G.give(d.item, d.n); }
  }
  G.drops = G.drops.filter((d) => !d.gone);
  for (const o of G.world.objects) if (o.t === 'pickup' && !o.taken && HL.dist(o.x, o.y, p.x, p.y) < 8 && p.state !== 'dead') { o.taken = true; G.flags['p:' + o.id] = 1; G.give(o.item, o.n); G.save(); }
};
G.updateBoss = function (dt) {
  const ar = G.world.def.arena; if (!ar || G.flags.boss_dead) return;
  const p = G.player;
  if (!G.bossAwake && p.y < ar.y - 6 && p.state !== 'dead') { G.bossAwake = true; G.refreshDoors(); Au.ambient('boss'); if (!G.flags['cut:keeper']) G.playCut('keeper', () => HL.UI.showBanner('The Bellworn Keeper', 'Strike a glowing resonator to stun it.')); else HL.UI.showBanner('The Bellworn Keeper', 'Strike a glowing resonator to stun it.'); }
  if (!G.bossAwake) return;
  G.resoT = (G.resoT || 6) - dt;
  const rs = G.world.objects.filter((o) => o.t === 'resonator');
  for (const r of rs) if (r.charge > 0) r.charge -= dt;
  if (G.resoT <= 0 && !rs.some((r) => r.charge > 0)) { G.resoT = 9 + Math.random() * 3; const r = rs[Math.floor(Math.random() * rs.length)]; r.charge = 6.5; Au.play('bellHigh'); }
};
G.updateRegion = function () {
  if (G.world.id !== 'ashwick') return;
  const x = G.player.x / 8, y = G.player.y / 8;
  const r = x > 150 && y < 66 ? 'The Tower' : x > 112 && x < 132 && y < 36 ? 'Ring of Stones' : x > 64 ? 'Crowshade Trail' : 'Ashwick';
  if (G.region && r !== G.region) HL.UI.showBanner(r);
  G.region = r;
};

// ------------------------------------------------------------------ render
G.snapCam = function () { const c = G.camTarget(); G.cam.x = c.x; G.cam.y = c.y; if (G.use3d) HL.R3.snap(); };
G.camTarget = function () {
  const w = G.world, cs = G.state === 'cut' && G.cutShot(), p = cs ? { x: cs.x, y: cs.y, vx: 0, vy: 0 } : G.player || { x: G.titleCam.x, y: G.titleCam.y, vx: 0, vy: 0 };
  let x = p.x + p.vx * 0.3 - G.W / 2, y = p.y - 8 + p.vy * 0.3 - G.H / 2;
  x = w.pw < G.W ? (w.pw - G.W) / 2 : HL.clamp(x, 0, w.pw - G.W);
  y = w.ph < G.H ? (w.ph - G.H) / 2 : HL.clamp(y, 0, w.ph - G.H);
  return { x, y };
};
G.drawObject = function (g, o) {
  const s = (n) => HL.ART.spr[n];
  const blit = (sp, x = o.x, y = o.y) => sp && g.drawImage(sp.c, Math.round(x - sp.ox), Math.round(y - sp.oy));
  switch (o.t) {
    case 'container': if (o.spr) blit(s(o.opened ? o.open : o.spr)); break;
    case 'note': case 'anvil': case 'crank': case 'well': blit(o.sprite || s(o.spr));
      if (o.glyph != null) G.drawGlyph(g, o.x - 2, o.y - 9, o.glyph);
      break;
    case 'stone': blit(s('standStone')); G.drawGlyph(g, o.x - 2, o.y - 12, o.face, true); break;
    case 'roots': blit(s(o.gone ? 'rootsGone' : 'roots')); break;
    case 'bell': blit(s(o.spr)); break;
    case 'resonator': {
      blit(s('resonator'));
      if (o.charge > 0) { const k = Math.floor(G.time * 8) % 2; HL.ringPx(g, o.x, o.y - 18, 5 + k, P.lt0); g.fillStyle = P.lt0; g.fillRect(Math.round(o.x) - 2, Math.round(o.y) - 19, 4, 2); }
      break;
    }
    case 'door': if (o.building) break; if (!o.open) blit(s(o.spr)); else if (o.spr === 'gateBars') { g.fillStyle = P.st3; g.fillRect(Math.round(o.x - 8), Math.round(o.y - 13), 16, 2); } break;
    case 'exit': if (o.spr) blit(s(o.spr)); break;
    case 'pickup': {
      if (o.taken) break;
      if (o.pedestal) blit(s('pedestal'), o.x, o.y + 1);
      const bob = Math.round(Math.sin(G.time * 3) * 1);
      const ic = HL.ART.icons[o.item];
      if (!o.pedestal) { g.fillStyle = 'rgba(20,16,16,0.3)'; g.fillRect(Math.round(o.x - 3), Math.round(o.y), 6, 1); }
      g.drawImage(ic, Math.round(o.x - 6), Math.round(o.y - 13 + bob - (o.pedestal ? 8 : 0)));
      if (Math.floor(G.time * 2) % 3 === 0) { g.fillStyle = P.cream; g.fillRect(Math.round(o.x + 4), Math.round(o.y - 13 + bob - (o.pedestal ? 8 : 0)), 1, 1); }
      break;
    }
    case 'fire': {
      blit(s('fireRing'), o.x, o.y + 1);
      if (G.flags['lit:' + o.id]) G.drawFlame(g, o.x, o.y - 1, 1);
      else { g.fillStyle = P.ash3; g.fillRect(Math.round(o.x - 1), Math.round(o.y - 2), 3, 1); }
      break;
    }
    case 'brazier': blit(s('brazier')); G.drawFlame(g, o.x, o.y - 8, 0.6); break;
    case 'npc': {
      HL.drawFigure(g, o.x, o.y, { dir: 2, look: { c0: P.st2, c1: P.st3, c2: P.tan1, face: P.cream2, leg: P.ink }, moving: false, t: 0 });
      g.fillStyle = P.st3; g.fillRect(Math.round(o.x - 3), Math.round(o.y - 3), 7, 3);
      break;
    }
  }
};
G.drawFlame = function (g, x, y, s) {
  const t = G.time;
  for (let i = 0; i < 9 * s; i++) {
    const ph = (t * 1.7 + i * 0.37) % 1, h = ph * 8 * s, sx = Math.sin(t * 7 + i * 2.1) * (1 - ph) * 2 * s + (HL.hash(i, 0, 3) - 0.5) * 4 * s;
    g.fillStyle = ph < 0.3 ? P.lt0 : ph < 0.6 ? P.fire : P.red1;
    g.fillRect(Math.round(x + sx), Math.round(y - h), 1, ph < 0.4 ? 2 : 1);
  }
};
G.drawGlyph = function (g, x, y, k, big) {
  const glyphs = ['.###./#.#.#/.###.', '..#../.###./#####', '.##../#..../.##..', '#.#.#/.###./#.#.#'];
  const rows = glyphs[k].split('/');
  g.fillStyle = big ? P.cream2 : P.ch1;
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') g.fillRect(Math.round(x + i), Math.round(y + j), 1, 1); });
};
G.shadow = function (g, x, y, w) { g.fillStyle = 'rgba(30,22,24,0.28)'; g.fillRect(Math.round(x - w / 2) + 1, Math.round(y), w - 2, 1); g.fillRect(Math.round(x - w / 2), Math.round(y) - 1 + 1, w, 1); };

G.renderWorld = function (g, dt) {
  const w = G.world, P_ = P;
  if (G.player) {
    const t = G.camTarget(), k = Math.min(1, dt * 7);
    G.cam.x += (t.x - G.cam.x) * k; G.cam.y += (t.y - G.cam.y) * k;
  } else { G.titleCam.x += dt * 9; if (G.titleCam.x > 70 * 8) G.titleCam.x = 20 * 8; const t = G.camTarget(); G.cam.x = t.x; G.cam.y = t.y; }
  let cx = Math.round(G.cam.x), cy = Math.round(G.cam.y);
  if (G.shake > 0.05 && G.settings.shake) { cx += Math.round((Math.random() - 0.5) * G.shake * 2); cy += Math.round((Math.random() - 0.5) * G.shake * 2); }
  const W = G.W, H = G.H;
  g.fillStyle = P_.void; g.fillRect(0, 0, W, H);
  g.setTransform(1, 0, 0, 1, -cx, -cy);
  const sx = HL.clamp(cx, 0, w.pw), sy = HL.clamp(cy, 0, w.ph);
  g.drawImage(w.ground, sx, sy, Math.min(W, w.pw - sx), Math.min(H, w.ph - sy), sx, sy, Math.min(W, w.pw - sx), Math.min(H, w.ph - sy));
  for (const b of w.buildings) if (b.fade < 1) { g.globalAlpha = 1 - b.fade; g.drawImage(b.art.back, b.x0, b.y0 - b.H); g.globalAlpha = 1; }
  for (const e of G.enemies) e.drawTele(g);
  HL.fx.draw(g, true);
  // gather drawables
  const vis = w.query(cx - 40, cy - 30, cx + W + 40, cy + H + 220, []);
  const list = [];
  for (const s of vis) list.push({ y: s.y, s });
  for (const o of w.objects) if (o.x > cx - 40 && o.x < cx + W + 40 && o.y > cy - 30 && o.y < cy + H + 40 && o.t !== 'tower' && o.t !== 'waves') list.push({ y: o.y, o });
  for (const e of G.enemies) { list.push({ y: e.y, e }); if (!e.hidden && !(e.dead && e.type !== 'keeper')) G.shadow(g, e.x, e.y, e.type === 'keeper' ? 26 : e.type === 'hound' ? 9 : 7); }
  for (const d of G.drops) list.push({ y: d.y, d });
  const p = G.player;
  if (p) { list.push({ y: p.y, p }); G.shadow(g, p.x, p.y, 7); }
  list.sort((a, b) => a.y - b.y);
  let pDrawn = false, occluded = false;
  const pb = p && { x0: p.x - 3, y0: p.y - 11, x1: p.x + 3, y1: p.y };
  for (const it of list) {
    if (it.s) {
      const s = it.s;
      if (pDrawn && s.x0 < pb.x1 && s.x1 > pb.x0 && s.y0 < pb.y0 + 4 && s.y1 > pb.y1 - 2 && (s.tall || s.kind === 'building')) occluded = true;
      if (s.kind === 'building') {
        const b = s.b;
        if (b.fade > 0.01) { g.globalAlpha = b.fade; g.drawImage(b.doorOpen && b.artOpen ? b.artOpen.ext : b.art.ext, b.x0 - 1, b.y0 - b.H - 1); g.globalAlpha = 1; }
        if (b.fade < 1) { g.fillStyle = P_.ink; g.fillRect(b.x0, b.y1 - 4, b.def.door.x * 8, 4); g.fillRect(b.x0 + (b.def.door.x + b.def.door.w) * 8, b.y1 - 4, b.x1 - b.x0 - (b.def.door.x + b.def.door.w) * 8, 4); if (!b.doorOpen) { g.fillStyle = P_.wd1; g.fillRect(b.x0 + b.def.door.x * 8, b.y1 - 3, b.def.door.w * 8, 3); } }
      } else {
        const sp = s.tower && G.flags['d:d_tower'] ? s.sprLit : s.spr;
        g.drawImage(sp.c, Math.round(s.x - sp.ox), Math.round(s.y - sp.oy));
      }
    } else if (it.o) G.drawObject(g, it.o);
    else if (it.e) it.e.draw(g);
    else if (it.d) { const ic = HL.ART.icons[it.d.item]; g.drawImage(ic, Math.round(it.d.x - 6), Math.round(it.d.y - 11 + Math.sin(G.time * 4 + it.d.x) * 1)); }
    else if (it.p) { it.p.draw(g); pDrawn = true; }
  }
  if (p && occluded && p.state !== 'dead') { g.globalAlpha = 0.55; p.draw(g, P_.cream2); g.globalAlpha = 1; }
  // projectiles
  for (const s of G.shots) {
    if (s.flask) { g.fillStyle = P_.fire; g.fillRect(Math.round(s.cx || s.x), Math.round(s.cy || s.y), 2, 2); continue; }
    const a = Math.atan2(s.vy, s.vx); g.fillStyle = P_.cream2;
    for (let i = 0; i < 4; i++) g.fillRect(Math.round(s.x - Math.cos(a) * i), Math.round(s.y - Math.sin(a) * i), 1, 1);
  }
  HL.fx.draw(g, false);
  // interaction marker
  if (G.prompt && G.state === 'play') { const o = G.prompt.o, by = Math.round(o.y - (o.sprite ? o.sprite.oy : HL.ART.spr[o.spr] ? HL.ART.spr[o.spr].oy : 12) - 5 + Math.sin(G.time * 5)); g.fillStyle = P_.cream; g.fillRect(Math.round(o.x) - 1, by, 3, 1); g.fillRect(Math.round(o.x), by + 1, 1, 1); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  // atmosphere
  if (!w.dark) {
    const ox = ((-cx + G.time * 5) % 256 + 256) % 256 - 256, oy = ((-cy + G.time * 2) % 256 + 256) % 256 - 256;
    for (let y = oy; y < H; y += 256) for (let x = ox; x < W; x += 256) g.drawImage(G.cloud, x, y);
    G.ash = G.ash || Array.from({ length: 50 }, () => ({ x: Math.random() * 600, y: Math.random() * 400, s: 0.4 + Math.random() }));
    g.fillStyle = 'rgba(236,228,209,0.55)';
    for (const a of G.ash) { a.x += (6 + a.s * 6) * dt; a.y += (3 + a.s * 4) * dt; const x = ((a.x - cx * 0.2) % (W + 20) + W + 20) % (W + 20) - 10, y = ((a.y - cy * 0.2) % (H + 20) + H + 20) % (H + 20) - 10; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  } else G.renderLight(g, cx, cy);
};
G.renderLight = function (g, cx, cy) {
  const L = G.light, lg = L.g, W = L.width, H = L.height;
  lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, W, H);
  lg.fillStyle = 'rgba(10,7,8,0.93)'; lg.fillRect(0, 0, W, H);
  lg.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a = 1) => { const gx = (x - cx) / 2, gy = (y - cy) / 2, rr = r / 2; if (gx < -rr || gy < -rr || gx > W + rr || gy > H + rr) return; const gr = lg.createRadialGradient(gx, gy, 0, gx, gy, rr); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.75 + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.fillRect(gx - rr, gy - rr, rr * 2, rr * 2); };
  if (G.player) hole(G.player.x, G.player.y - 5, 74);
  for (const l of G.world.lights) hole(l.x, l.y, l.r * (1 + Math.sin(G.time * 9 + l.flick) * 0.04));
  for (const o of G.world.objects) if (o.t === 'resonator' && o.charge > 0) hole(o.x, o.y - 14, 40, 0.8);
  for (const e of G.enemies) if (e.type === 'keeper' && !e.dead) hole(e.x, e.y - 24, 34, 0.5);
  lg.globalCompositeOperation = 'source-over';
  g.imageSmoothingEnabled = false;
  g.drawImage(L, 0, 0, W * 2, H * 2);
  // warm spill from fires
  g.globalCompositeOperation = 'lighter';
  for (const l of G.world.lights) { const x = l.x - cx, y = l.y - cy; if (x < -60 || y < -60 || x > G.W + 60 || y > G.H + 60) continue; const gr = g.createRadialGradient(x, y, 0, x, y, l.r * 0.6); gr.addColorStop(0, 'rgba(120,60,20,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2); }
  g.globalCompositeOperation = 'source-over';
};
G.post = function (g) {
  // tilt-shift: soft focus at the top and bottom of the frame, as in the reference
  const W = G.W, H = G.H, b = G.blur, bs = G.blurS;
  bs.g.imageSmoothingEnabled = true; bs.g.clearRect(0, 0, bs.width, bs.height); bs.g.drawImage(G.buf, 0, 0, bs.width, bs.height);
  b.g.globalCompositeOperation = 'source-over'; b.g.imageSmoothingEnabled = true; b.g.clearRect(0, 0, W, H); b.g.drawImage(bs, 0, 0, W, H);
  b.g.globalCompositeOperation = 'destination-in';
  const gr = b.g.createLinearGradient(0, 0, 0, H);
  const k = G.world && G.world.dark ? 0.5 : 1;
  gr.addColorStop(0, 'rgba(0,0,0,' + 0.9 * k + ')'); gr.addColorStop(0.2, 'rgba(0,0,0,0)'); gr.addColorStop(0.84, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,' + 0.6 * k + ')');
  b.g.fillStyle = gr; b.g.fillRect(0, 0, W, H);
  g.drawImage(b, 0, 0);
  g.drawImage(G.vig, 0, 0);
  const gx = -Math.floor(Math.random() * 64), gy = -Math.floor(Math.random() * 64);
  for (let y = gy; y < H; y += 64) for (let x = gx; x < W; x += 64) g.drawImage(G.grain, x, y);
};
G.render = function (dt) {
  const g = G.buf.g;
  HL.UI.regions = [];
  if (G.portrait) {
    g.fillStyle = P.ui; g.fillRect(0, 0, G.W, G.H);
    HL.text(g, 'Turn your phone sideways', G.W / 2, G.H / 2 - 10, P.cream, 0.5);
    HL.text(g, 'HOLLOWLANDS plays in landscape.', G.W / 2, G.H / 2 + 4, P.cream3, 0.5);
  } else {
    if (G.use3d) { HL.R3.render(dt); g.clearRect(0, 0, G.W, G.H); if (G.state !== 'title') HL.R3.overlay(g); }
    else { G.renderWorld(g, dt); G.post(g); }
    const UI = HL.UI;
    if (G.state === 'title') UI.drawTitle(g, G);
    else {
      if (G.state !== 'menu' && G.state !== 'cut') UI.drawHUD(g, G, dt);
      if (G.state === 'play') UI.drawGuide(g, G);
      if (G.state === 'play') UI.drawControls(g, G);
      if (G.state === 'menu') UI.drawMenu(g, G);
      if (G.state === 'dialog') UI.drawDialog(g, G);
      if (G.state === 'fire') UI.drawFire(g, G);
      if (G.state === 'anvil') UI.drawAnvil(g, G);
      if (G.state === 'dead') UI.drawDead(g, G);
      if (G.state === 'end') UI.drawEnd(g, G);
      if (G.state === 'cut') UI.drawCut(g, G);
      if (G.state === 'fade' && !G.use3d) { g.fillStyle = 'rgba(12,9,10,' + HL.clamp(G.fadeT < 0.35 ? G.fadeT / 0.35 : 1 - (G.fadeT - 0.35) / 0.35, 0, 1) + ')'; g.fillRect(0, 0, G.W, G.H); }
    }
  }
  G.sg.clearRect(0, 0, G.screen.width, G.screen.height);
  G.sg.drawImage(G.buf, 0, 0, G.W * G.scale, G.H * G.scale);
};

// test/debug hook (used by the automated browser checks; harmless in play)
window.HLDebug = {
  G, tp(x, y) { G.player.x = x; G.player.y = y; G.snapCam(); },
  give(id, n = 1) { G.give(id, n); }, flags: () => G.flags,
  interactNearest() { const it = G.interactables(); if (it) G.interact(it); return it && it.o.id; },
};
window.addEventListener('load', () => G.boot());
