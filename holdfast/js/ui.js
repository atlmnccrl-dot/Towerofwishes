// HOLDFAST - the interface: HUD, build drawer, selection panel, people, expeditions (world map),
// research and crafting, event dialogs with an animated vignette, settings, game over.
(function () {
  const HF = window.HF, D = HF.D, S = HF.Sim, A = HF.A;
  const U = HF.U = { sel: null, mode: 'normal', place: null, cat: 'core', expSel: null, expParty: [], expFood: 0, tab: 'research', open: null };
  const $ = id => document.getElementById(id);
  const G = () => HF.G;
  const st = () => HF.G.st;
  const ic = (name, size, cls) => '<img class="ic ' + (cls || '') + '" src="' + A.iconURL(name) + '" width="' + (size || 20) + '" height="' + (size || 20) + '" alt="">';
  const RES_ICON = { wood: 'wood', stone: 'stone', food: 'food', water: 'water', metal: 'metal', knowledge: 'knowledge' };
  const costHTML = (cost, have) => Object.entries(cost).map(([k, v]) => '<span class="cost ' + (have && (have[k] || 0) < v ? 'short' : '') + '">' + ic(RES_ICON[k], 14) + v + '</span>').join('');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pct = v => Math.round(v * 100) + '%';

  U.init = function () {
    // Resource bar.
    $('resbar').innerHTML = D.RES.map(k => '<div class="res" id="r-' + k + '" title="' + D.RES_NAME[k] + '">' + ic(RES_ICON[k], 18) + '<b>0</b></div>').join('') +
      '<div class="res" id="r-pop" title="Survivors / beds">' + ic('pop', 18) + '<b>1</b></div>';
    $('actions').innerHTML = [['build', 'build', 'Build'], ['people', 'pop', 'People'], ['map', 'map', 'Explore'], ['research', 'book', 'Research'], ['alarm', 'horn', 'Alarm']]
      .map(([a, i, l]) => '<button class="rb" data-act="' + a + '" id="act-' + a + '">' + ic(i, 30) + '<span>' + l + '</span><i class="badge"></i></button>').join('');
    $('speed').innerHTML = [[0, 'pause'], [1, '1x'], [2, '2x'], [3, '3x']].map(([v, l]) => '<button data-act="speed" data-v="' + v + '" class="sp">' + (l === 'pause' ? ic('pause', 14) : l) + '</button>').join('');
    document.addEventListener('click', onClick);
    document.addEventListener('pointerdown', () => HF.AU && HF.AU.unlock(), { once: false });
  };

  // ---- Click dispatch -------------------------------------------------------------------------
  function onClick(e) {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act; const fn = ACT[a]; if (!fn) return;
    e.stopPropagation();
    if (t.disabled || t.classList.contains('off')) { HF.AU && HF.AU.ui('error'); if (t.dataset.why) U.toast(t.dataset.why, 'warn'); return; }
    HF.AU && HF.AU.ui('click');
    fn(t.dataset, t);
  }
  const ACT = {
    build() { if (U.open === 'drawer') U.closeDrawer(); else U.openBuild(); },
    cat(d) { U.cat = d.v; U.openBuild(); },
    pick(d) { U.startPlace(d.type); },
    placeOk() { U.confirmPlace(); }, placeNo() { U.cancelPlace(); },
    people() { U.openPeople(); }, map() { U.openExpeditions(); }, research() { U.openResearch('research'); },
    alarm() { G().cmd('alarm', {}); },
    speed(d) { G().setSpeed(+d.v); },
    menu() { U.openSettings(); },
    home() { const h = S.heart(st()); const u = S.present(st())[0]; const t = h ? { x: (h.x + 2.5) * D.TILE, y: (h.y + 1.5) * D.TILE } : u ? { x: u.x, y: u.y } : null; if (t) HF.C.returnTo = { from: { x: HF.R.cam.x, y: HF.R.cam.y, z: HF.R.cam.z }, to: { x: t.x, y: t.y, z: Math.max(1.1, Math.min(HF.R.cam.z, 1.8)) }, t: 0 }; },
    close() { U.closeModal(); },
    job(d) { const r = G().cmd('job', { id: d.id, job: d.job }); if (r.ok) { U.closeModal(); U.refreshPanel(true); } },
    jobPick(d) { U.openJobs(d.id); },
    gearPick(d) { U.openGear(d.id); },
    equip(d) { const r = G().cmd('equip', { id: d.id, item: d.item }); if (r.ok) { U.closeModal(); U.refreshPanel(true); } },
    upgrade(d) { const r = G().cmd('upgrade', { id: d.id }); if (r.ok) U.refreshPanel(true); },
    demolish(d) { const b = st().buildings[d.id]; if (!b) return; if (!t2confirm('demolish' + d.id)) { U.toast('Tap again to ' + (b.state === 'site' ? 'cancel' : 'tear down') + ' it.', 'warn'); return; } const r = G().cmd('cancel', { id: d.id }); if (r.ok) U.select(null); },
    selUnit(d) { U.closeModal(); U.select({ uid: d.id }); G().focus(st().units[d.id]); },
    follow(d) { G().follow(d.id); },
    trade(d) { G().cmd('trade', { i: +d.i }); U.refreshPanel(true); },
    tower(d) { const r = G().cmd('post', { id: d.id, bid: d.bid }); if (r.ok) { U.toast('Posted to the tower.', 'good'); U.refreshPanel(true); } },
    craft(d) { const r = G().cmd('craft', { item: d.item }); if (r.ok) U.openResearch('craft'); },
    tech(d) { const r = G().cmd('research', { id: d.id }); if (r.ok) U.openResearch('research'); },
    tab(d) { U.openResearch(d.v); },
    site(d) { U.expSel = d.id; U.openExpeditions(); },
    member(d) { const i = U.expParty.indexOf(d.id); if (i >= 0) U.expParty.splice(i, 1); else if (U.expParty.length < 4) U.expParty.push(d.id); U.openExpeditions(); },
    food(d) { U.expFood = Math.max(0, Math.min(Math.floor(st().res.food), U.expFood + (+d.v))); U.openExpeditions(); },
    depart() { const r = G().cmd('expedition', { site: U.expSel, ids: U.expParty, food: U.expFood }); if (r.ok) { U.expParty = []; U.closeModal(); U.toast('The party sets out.', 'good'); } },
    choose(d) { const r = G().cmd('choose', { choice: +d.i }); if (r.ok) { if (r.res) U.showResult(r.res); else U.closeModal(); } },
    resultOk() { U.closeModal(); },
    vol(d, el) { HF.AU.vol[d.k] = +el.value; HF.AU.applyVol(); G().saveSettings(); },
    skipcine(d, el) { HF.C.skipAll = el.checked; G().saveSettings(); },
    save() { G().save(true); },
    load() { U.closeModal(); G().loadGame(); },
    newgame() { if (!t2confirm('new')) { U.toast('Tap again to abandon this camp and start over.', 'warn'); return; } U.closeModal(); G().toTitle(); },
    title() { U.closeModal(); G().toTitle(); },
    credits() { U.openCredits(); },
  };
  let confirmKey = null, confirmT = 0;
  function t2confirm(k) { const now = Date.now(); if (confirmKey === k && now - confirmT < 2500) { confirmKey = null; return true; } confirmKey = k; confirmT = now; return false; }
  // Inputs (sliders, toggles).
  document.addEventListener('input', e => { const t = e.target.closest('[data-act]'); if (t && ACT[t.dataset.act]) ACT[t.dataset.act](t.dataset, t); });

  // ---- HUD update ---------------------------------------------------------------------------------
  let last = {};
  U.update = function () {
    const s = st(); if (!s) return;
    const cap = S.capacity(s);
    for (const k of D.RES) {
      const v = Math.floor(s.res[k]); const el = $('r-' + k);
      const show = k === 'metal' ? (s.res.metal > 0 || s.era >= 2) : k === 'knowledge' ? (s.res.knowledge > 0 || S.has(s, 'study')) : true;
      el.style.display = show ? '' : 'none';
      const txt = k === 'knowledge' ? '' + v : v + '';
      if (last[k] !== txt) { el.querySelector('b').textContent = txt; if (last[k] != null && +txt > +last[k]) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); } last[k] = txt; }
      el.classList.toggle('full', k !== 'knowledge' && v >= cap);
      el.classList.toggle('low', (k === 'food' || k === 'water') && v < S.present(s).length);
    }
    const pop = S.survivors(s).length, beds = S.beds(s);
    $('r-pop').querySelector('b').textContent = pop + '/' + beds;
    $('r-pop').classList.toggle('low', beds < pop && s.camp);
    // Clock.
    const h = S.hour(s), hh = Math.floor(h), mm = Math.floor((h - hh) * 6) * 10;
    $('dayline').textContent = 'Day ' + S.day(s);
    $('hourline').innerHTML = (S.isNight(s) ? '&#9790; ' : '&#9728; ') + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + (s.weather.rain ? ' · rain' : '');
    document.querySelectorAll('#speed .sp').forEach(b => b.classList.toggle('on', +b.dataset.v === G().speed));
    // Objective.
    const o = D.OBJ[s.obj];
    const TUT = 9; let prog = -1;
    if (o) { $('obj-text').textContent = o.text; $('obj-hint').textContent = o.hint || ''; $('obj-step').textContent = s.obj < TUT ? 'Tutorial · step ' + (s.obj + 1) + ' of ' + TUT : 'Objective'; $('obj-count').textContent = ''; }
    if (o && o.id === 'gather') prog = (Math.min(10, s.res.wood) / 10 + Math.min(6, s.res.stone) / 6) / 2;
    if (o && o.id === 'food') prog = Math.min(1, (s.flags.foraged || 0) / 6);
    if (o && o.id === 'defend') prog = ((S.has(s, 'tower') ? 1 : 0) + Math.min(6, S.count(s, 'wall', true)) / 6) / 2;
    if (o && o.id === 'grow') prog = Math.min(1, pop / 8);
    if (o && o.id === 'stock') prog = ((S.has(s, 'stockpile') ? 1 : 0) + (S.has(s, 'water') ? 1 : 0)) / 2;
    $('obj-bar').style.display = prog >= 0 ? '' : 'none'; if (prog >= 0) $('obj-bar').firstChild.style.width = Math.round(prog * 100) + '%';
    if (o && o.id === 'defend') { const r = s.threat.raid; if (r) $('obj-hint').textContent = 'Raid in ' + Math.max(0, Math.round(r.at - s.hours)) + ' hours.'; }
    if (o && o.id === 'gather') $('obj-hint').textContent = 'Wood ' + Math.min(10, Math.floor(s.res.wood)) + '/10 · Stone ' + Math.min(6, Math.floor(s.res.stone)) + '/6';
    // Actions.
    const early = s.obj < 2;
    $('act-build').classList.toggle('hidden', early);
    $('act-people').classList.toggle('hidden', pop < 2);
    $('act-map').classList.toggle('hidden', s.obj < 11 && pop < 3 && !s.stats.raids);
    $('act-research').classList.toggle('hidden', !S.has(s, 'study') && !S.has(s, 'workshop'));
    $('act-alarm').classList.toggle('hidden', s.obj < 9 && !s.threat.active);
    $('act-alarm').classList.toggle('on', !!s.alarm);
    $('act-build').classList.toggle('pulse', o && ['fire', 'shelter', 'stock', 'defend'].includes(o.id) && U.open !== 'drawer' && U.mode !== 'place');
    $('act-map').classList.toggle('pulse', o && o.id === 'expedition');
    const exp = s.exps.length; $('act-map').querySelector('.badge').textContent = exp ? exp : '';
    // Threat banner.
    const th = $('threat'); const r = s.threat.raid;
    if (s.threat.active) { th.className = 'panel danger'; th.innerHTML = ic('swords', 18) + ' ' + S.foes(s).length + ' foes in camp'; }
    else if (r && r.warned) { th.className = 'panel warn'; th.innerHTML = ic('flag', 18) + ' ' + (r.hollow ? 'The Hollow' : 'Raiders') + ' in ' + Math.max(0, Math.round(r.at - s.hours)) + 'h · ' + r.dirs.map(S.dirName).join(', '); }
    else th.className = 'hidden';
    const boss = S.foes(s).find(e => D.FOE[e.kind].boss && !e.flee);
    const bb = $('boss'); if (boss) { bb.className = ''; bb.innerHTML = '<b>' + D.FOE[boss.kind].name + '</b><div class="bb"><i style="width:' + Math.max(0, boss.hp / boss.maxHp * 100) + '%"></i></div>'; } else bb.className = 'hidden';
    if (U.sel) U.refreshPanel(false);
    if (s.pending.length && U.open !== 'pending' && !HF.C.busy()) U.openPending();
  };

  // ---- Toasts ---------------------------------------------------------------------------------------
  U.toast = function (text, kind) {
    const s0 = st(); if (s0 && s0.obj < 6 && (kind || 'info') === 'info') return;   // keep the tutorial quiet
    const box = $('toasts'); const d = document.createElement('div'); d.className = 'toast ' + (kind || 'info'); d.textContent = text;
    box.appendChild(d); while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => d.classList.add('out'), 3600); setTimeout(() => d.remove(), 4200);
  };
  U.banner = function (title, sub) {
    const b = $('banner'); b.innerHTML = title + (sub ? '<small>' + sub + '</small>' : ''); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  };

  // ---- Build drawer -------------------------------------------------------------------------------
  U.openBuild = function () {
    const s = st(); U.closeModal(); U.open = 'drawer';
    const tabs = D.CATS.map(([k, l]) => '<button class="tab ' + (U.cat === k ? 'on' : '') + '" data-act="cat" data-v="' + k + '">' + l + '</button>').join('');
    const list = D.BUILD_ORDER.filter(t => D.B[t].cat === U.cat || (s.obj < 4));
    const cards = list.map(t => {
      const B = D.B[t]; const ok = S.unlocked(s, t); const why = !ok ? (S.lockReason(s, t) || (t === 'heart' ? 'Already built' : 'Not yet')) : '';
      if (s.obj < 4 && !ok && t !== 'heart' && t !== 'tent') return '';
      const aff = S.canAfford(s, B.cost[0]);
      return '<button class="card ' + (ok ? '' : 'off') + (ok && !aff ? ' poor' : '') + '" data-act="pick" data-type="' + t + '" data-why="' + esc(why) + '">' +
        '<canvas class="thumb" data-thumb="' + t + '" width="64" height="64"></canvas><b>' + B.name[0] + '</b><div class="costs">' + costHTML(B.cost[0], s.res) + '</div>' + (why ? '<em>' + esc(why) + '</em>' : '') + '</button>';
    }).join('');
    $('drawer').innerHTML = '<div class="tabs">' + tabs + '<button class="x" data-act="build">' + ic('x', 18) + '</button></div><div class="cards">' + cards + '</div>';
    $('drawer').className = 'panel';
    $('drawer').querySelectorAll('canvas[data-thumb]').forEach(c => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(A.buildingThumb(c.dataset.thumb, 0, 64), 0, 0); });
  };
  U.closeDrawer = function () { $('drawer').className = 'hidden'; if (U.open === 'drawer') U.open = null; };

  // ---- Placement -----------------------------------------------------------------------------------
  U.startPlace = function (type) {
    const s = st(); const B = D.B[type];
    if (!S.canAfford(s, B.cost[0])) { HF.AU.ui('error'); U.toast('Not enough resources for a ' + B.name[0] + '.', 'warn'); return; }
    U.closeDrawer(); U.select(null);
    const c = HF.R.cam; const tx = Math.floor(c.x / D.TILE - B.w / 2), ty = Math.floor(c.y / D.TILE - B.h / 2);
    U.mode = 'place'; U.place = { type, x: tx, y: ty, tiles: B.drag ? [] : null };
    if (!B.drag) { const p = nearestValid(s, type, tx, ty); if (p) { U.place.x = p.x; U.place.y = p.y; } }
    $('placebar').className = 'panel';
    $('place-label').innerHTML = '<b>' + B.name[0] + '</b> ' + costHTML(B.cost[0], s.res) + '<small>' + (B.drag ? 'Drag to draw a line' : 'Tap or drag to position') + '</small>';
  };
  function nearestValid(s, type, x, y) { for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (S.canPlace(s, type, x + dx, y + dy)) return { x: x + dx, y: y + dy }; } return null; }
  U.placeAt = function (tx, ty, dragStart) {
    const p = U.place; if (!p) return; const B = D.B[p.type];
    if (B.drag) {
      if (dragStart || !p.start) p.start = [tx, ty];
      p.tiles = line(p.start[0], p.start[1], tx, ty).slice(0, 40);
      const n = p.tiles.length, cost = {}; for (const k in B.cost[0]) cost[k] = B.cost[0][k] * n;
      $('place-label').innerHTML = '<b>' + B.name[0] + ' x' + n + '</b> ' + costHTML(cost, st().res) + '<small>Drag to draw a line</small>';
    } else { p.x = tx - Math.floor(B.w / 2); p.y = ty - Math.floor(B.h / 2); }
  };
  function line(x0, y0, x1, y1) { // straight or 45-degree lines
    const dx = x1 - x0, dy = y1 - y0; const out = [];
    let sx = Math.sign(dx), sy = Math.sign(dy);
    if (Math.abs(dx) > Math.abs(dy) * 2) sy = 0; else if (Math.abs(dy) > Math.abs(dx) * 2) sx = 0;
    const n = Math.max(Math.abs(sx ? dx : 0), Math.abs(sy ? dy : 0));
    for (let i = 0; i <= n; i++) out.push([x0 + sx * i, y0 + sy * i]);
    return out;
  }
  U.ghost = function () { const p = U.place; if (!p) return null; return D.B[p.type].drag ? { type: p.type, tiles: p.tiles && p.tiles.length ? p.tiles : [[Math.floor(HF.R.cam.x / D.TILE), Math.floor(HF.R.cam.y / D.TILE)]] } : { type: p.type, x: p.x, y: p.y }; };
  U.confirmPlace = function () {
    const p = U.place; if (!p) return; const B = D.B[p.type];
    let r;
    if (B.drag) { if (!p.tiles || !p.tiles.length) { U.toast('Drag across the ground to draw the wall.', 'warn'); return; } r = G().cmd('placeLine', { type: p.type, tiles: p.tiles }); }
    else r = G().cmd('place', { type: p.type, x: p.x, y: p.y });
    if (r.ok) { if (B.drag) { p.tiles = []; p.start = null; } else U.cancelPlace(); if (!B.drag || !S.canAfford(st(), B.cost[0])) U.cancelPlace(); }
  };
  U.cancelPlace = function () { U.mode = 'normal'; U.place = null; $('placebar').className = 'hidden'; };

  // ---- Selection panel ---------------------------------------------------------------------------------
  U.select = function (sel) { U.sel = sel; U.refreshPanel(true); };
  let panelKey = '';
  U.refreshPanel = function (force) {
    const s = st(); const p = $('panel');
    if (!U.sel) { p.className = 'hidden'; panelKey = ''; return; }
    if (U.sel.uid) {
      const u = s.units[U.sel.uid]; if (!u || u.dead || u.away) { U.sel = null; p.className = 'hidden'; return; }
      const key = 'u' + u.id + (u.side === 'n' ? JSON.stringify(s.trader) + Math.floor(s.res.food) + Math.floor(s.res.wood) + Math.floor(s.res.metal) + Math.floor(s.res.stone) : '') + u.job + (u.gear ? u.gear.w + u.gear.a : '') + (u.injury ? u.injury.name : '') + taskText(s, u) + Math.round(u.hp / 5) + Math.round(u.morale / 5) + (u.downed > 0) + JSON.stringify(u.skills);
      if (!force && key === panelKey) return; panelKey = key;
      p.className = 'panel'; p.innerHTML = u.side === 's' ? survivorHTML(s, u) : u.side === 'e' ? foeHTML(u) : u.side === 'n' ? traderHTML(s, u) : animalHTML(u);
      const pc = p.querySelector('canvas.portrait'); if (pc && u.set) { const c = A.portrait(u.set, 48); if (c) pc.getContext('2d').drawImage(c, 0, 0); }
    } else if (U.sel.bid) {
      const b = s.buildings[U.sel.bid]; if (!b) { U.sel = null; p.className = 'hidden'; return; }
      const key = 'b' + b.id + b.tier + b.state + Math.round(b.hp / b.maxHp * 20) + Math.round(b.prog * 20) + b.up + (b.crop ? b.crop.stage + Math.round(b.crop.g * 10) : '') + S.present(s).filter(x => x.inside === b.id || x.post === b.id).length + JSON.stringify(s.res).length + Math.floor(s.res.wood / 10) + Math.floor(s.res.stone / 10);
      if (!force && key === panelKey) return; panelKey = key;
      p.className = 'panel'; p.innerHTML = buildingHTML(s, b);
      const c = p.querySelector('canvas.thumb'); if (c) { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(A.buildingThumb(b.type, b.tier, 56), 0, 0); }
    }
  };
  function taskText(s, u) {
    if (u.downed > 0) return 'Bleeding out!';
    if (u.stranger) return 'Waiting at the fire';
    if (u.inside) { const b = s.buildings[u.inside]; return (u.task && u.task.t === 'hide' ? 'Hiding in ' : u.task && u.task.t === 'rest' ? 'Recovering in ' : 'Sleeping in ') + (b ? D.B[b.type].name[b.tier] : 'shelter'); }
    const t = u.task; if (!t) return 'Idle';
    const n = t.node && s.nodes[t.node];
    switch (t.t) {
      case 'gather': return u.carry ? 'Hauling ' + u.carry.res : n ? { tree: 'Felling a tree', rock: 'Breaking rock', bush: 'Picking berries', scrap: 'Salvaging metal' }[n.type] : 'Gathering';
      case 'water': return u.carry ? 'Carrying water' : 'Fetching water'; case 'hunt': return u.carry ? 'Hauling meat' : 'Hunting';
      case 'build': return 'Building'; case 'repair': return 'Repairing'; case 'farm': return 'Working the field'; case 'craft': return 'Crafting'; case 'study': return 'Studying';
      case 'treat': return 'Tending the wounded'; case 'sleep': case 'campsleep': return 'Sleeping'; case 'fight': return 'Fighting!'; case 'flee': return 'Running for safety';
      case 'guard': return u.onTower ? 'On watch' : 'Heading to the tower'; case 'patrol': return 'Patrolling'; case 'train': return 'Training'; case 'rescue': return 'Saving a friend';
      case 'move': return 'Walking'; case 'muster': return 'To arms!'; case 'return': return 'Coming home'; case 'leave': return 'Setting out'; case 'hide': return 'Taking cover'; case 'rest': return 'Going to rest';
    }
    return 'Idle';
  }
  U.taskText = taskText;
  function barHTML(v, col, label) { return '<div class="bar"><i style="width:' + Math.max(0, Math.min(100, v * 100)) + '%;background:' + col + '"></i><span>' + label + '</span></div>'; }
  function survivorHTML(s, u) {
    const tr = D.TRAITS[u.trait];
    const skills = D.SKILLS.map(k => '<div class="sk"><span>' + D.SKILL_NAME[k] + '</span><i><b style="width:' + Math.min(100, u.skills[k] * 8.3) + '%"></b></i><em>' + u.skills[k] + '</em></div>').join('');
    const W = D.WEAPON[u.gear.w], Ar = D.ARMOR[u.gear.a];
    const towers = Object.values(s.buildings).filter(b => D.B[b.type].slots && b.state === 'done');
    return '<div class="ph"><canvas class="portrait" width="48" height="48"></canvas><div><b class="nm">' + esc(u.name) + '</b><div class="sub">Lv ' + u.level + ' · <span class="trait" title="' + esc(tr.desc) + '">' + tr.name + '</span>' + (u.leader ? ' · founder' : '') + '</div><div class="sub status">' + taskText(s, u) + '</div></div><button class="x" data-act="close" onclick="HF.U.select(null)">' + ic('x', 16) + '</button></div>' +
      barHTML(u.hp / u.maxHp, u.hp / u.maxHp > 0.5 ? '#5fbf5f' : '#d8a040', 'Health ' + Math.ceil(u.hp)) + barHTML(u.morale / 100, '#d9b85a', 'Morale ' + Math.round(u.morale)) +
      (u.injury ? '<div class="inj">' + ic('potion', 14) + esc(u.injury.name) + ' · ' + Math.ceil(u.injury.t) + 'h</div>' : '') +
      '<div class="row"><button class="pill" data-act="jobPick" data-id="' + u.id + '">' + ic(D.JOBS[u.job].icon, 16) + D.JOBS[u.job].name + '</button>' +
      '<button class="pill" data-act="gearPick" data-id="' + u.id + '">' + ic(W.ranged ? 'bow' : u.gear.w === 'sword' ? 'sword' : u.gear.w === 'none' ? 'swords' : 'spear', 16) + W.name + ' · ' + Ar.name + '</button></div>' +
      (u.job === 'guard' && towers.length ? '<div class="row">' + towers.map(b => '<button class="pill small" data-act="tower" data-id="' + u.id + '" data-bid="' + b.id + '">' + ic('tower', 14) + 'Post: ' + D.B[b.type].name[b.tier] + '</button>').join('') + '</div>' : '') +
      '<details><summary>Skills · joined day ' + u.joined + (u.kills ? ' · ' + u.kills + ' kills' : '') + '</summary>' + skills + '<p class="bio">' + esc(u.name.split(' ')[0]) + ' ' + esc(u.origin) + '.</p></details>';
  }
  function foeHTML(u) { const F = D.FOE[u.kind]; return '<div class="ph"><div><b class="nm foe">' + F.name + '</b><div class="sub">' + { beast: 'A night predator', raider: 'Ash Raiders', hollow: 'The Hollow', dino: F.boss ? 'King of the old forest' : F.charge ? 'Charges through walls' : F.sweep ? 'Tail sweeps hit everyone near' : 'Hunts in packs at night' }[F.faction] + '</div></div><button class="x" onclick="HF.U.select(null)">' + ic('x', 16) + '</button></div>' + barHTML(u.hp / u.maxHp, '#d04838', Math.ceil(u.hp) + ' / ' + u.maxHp) + '<div class="sub">Select a survivor, then tap this foe to attack it.</div>'; }
  function traderHTML(s, u) {
    const T = s.trader; const offers = T ? T.offers.map((o, i) => { const d = D.TRADES[o.i]; const get = d.get.recruit ? ic('people', 14) + (d.label || 'A hand') : d.get.item ? ic(d.get.item === 'bow' ? 'bow' : 'shield', 14) + (D.WEAPON[d.get.item] || D.ARMOR[d.get.item]).name : costHTML(d.get);
      return '<button class="btn ' + (o.used ? 'off' : S.canAfford(s, d.give) ? 'gold' : 'off') + '" data-act="trade" data-i="' + i + '" data-why="' + (o.used ? 'Done' : 'You cannot afford that') + '">' + costHTML(d.give, s.res) + ' &rarr; ' + get + (o.used ? ' · done' : '') + '</button>'; }).join('') : '';
    return '<div class="ph"><canvas class="portrait" width="48" height="48"></canvas><div><b class="nm">Travelling Trader</b><div class="sub">' + (u.arrived ? 'Trading until dusk.' : 'On the way to the fire.') + '</div></div><button class="x" onclick="HF.U.select(null)">' + ic('x', 16) + '</button></div><div class="row" style="flex-direction:column;align-items:stretch">' + offers + '</div>';
  }
  function animalHTML(u) { return '<div class="ph"><div><b class="nm">' + (u.kind === 'para' ? 'Parasaurolophus' : u.kind === 'deer' ? 'Deer' : 'Hare') + '</b><div class="sub">Game. Foragers hunt it for food.</div></div><button class="x" onclick="HF.U.select(null)">' + ic('x', 16) + '</button></div>'; }
  function buildingHTML(s, b) {
    const B = D.B[b.type]; const name = B.name[b.tier];
    let info = '';
    if (b.state === 'site') info = '<div class="sub">Under construction · ' + pct(b.prog) + '</div><div class="sub">Builders and laborers will come.</div>';
    else {
      info = '<div class="sub">' + esc(B.desc[b.tier]) + '</div>';
      if (B.beds) { const n = S.survivors(s).filter(u => u.home === b.id).length; info += '<div class="sub">' + ic('house', 14) + n + ' / ' + B.beds[b.tier] + ' beds</div>'; }
      if (B.store) info += '<div class="sub">' + ic('chest', 14) + '+' + B.store[b.tier] + ' storage (total ' + S.capacity(s) + ')</div>';
      if (b.crop) info += '<div class="sub">' + ic('wheat', 14) + ({ fallow: 'Waiting to be sown', growing: 'Growing · ' + pct(b.crop.g), ripe: 'Ripe! Ready to harvest' })[b.crop.stage] + (S.present(s).some(u => u.job === 'farm') ? '' : ' · no farmers') + '</div>';
      if (B.slots) { const g = S.present(s).filter(u => u.post === b.id); info += '<div class="sub">' + ic('shield', 14) + 'Guards: ' + (g.map(u => esc(u.name.split(' ')[0])).join(', ') || 'none') + ' / ' + B.slots[b.tier] + '</div>'; }
      if (b.type === 'workshop') info += '<div class="sub">' + ic('anvil', 14) + 'Queue: ' + (s.craftQ.map(q => (D.WEAPON[q.item] || D.ARMOR[q.item]).name).join(', ') || 'empty') + (S.present(s).some(u => u.job === 'craft') ? '' : ' · no crafters') + '</div>';
      if (b.type === 'study') info += '<div class="sub">' + ic('book', 14) + Math.floor(s.res.knowledge) + ' Knowledge' + (S.present(s).some(u => u.job === 'research') ? '' : ' · no scholars') + '</div>';
      if (b.type === 'infirmary') info += '<div class="sub">' + ic('potion', 14) + 'Patients: ' + S.present(s).filter(u => u.inside === b.id).length + (S.present(s).some(u => u.job === 'medic') ? '' : ' · no medic') + '</div>';
      if (b.type === 'heart') info += '<div class="sub">' + ic('crown', 14) + 'Era: ' + D.ERAS[s.era] + '</div>';
    }
    let up = '';
    if (b.state === 'done' && B.cost[b.tier + 1] && !b.up) {
      const why = S.upgradeBlock(s, b); const aff = S.canAfford(s, B.cost[b.tier + 1]);
      const req = b.type === 'heart' && D.ERA_REQ[b.tier + 2] ? '<div class="sub req">Needs: ' + D.ERA_REQ[b.tier + 2].text + '</div>' : '';
      up = req + '<button class="btn gold ' + (why ? 'off' : '') + '" data-act="upgrade" data-id="' + b.id + '" data-why="' + esc(why) + '">' + ic('hammer', 16) + 'Upgrade to ' + B.name[b.tier + 1] + ' ' + costHTML(B.cost[b.tier + 1], s.res) + '</button>' + (why ? '<div class="sub req">' + esc(why) + '</div>' : !aff ? '<div class="sub req">Not enough resources</div>' : '');
    }
    if (b.up) up = '<div class="sub">Upgrading · ' + pct(b.prog) + '</div>';
    const extra = b.state === 'done' ? (b.type === 'workshop' ? '<button class="btn" data-act="tab" data-v="craft">' + ic('anvil', 16) + 'Craft</button>' : b.type === 'study' ? '<button class="btn" data-act="tab" data-v="research">' + ic('book', 16) + 'Research</button>' : '') : '';
    const del = b.type === 'heart' && b.state === 'done' ? '' : '<button class="btn red" data-act="demolish" data-id="' + b.id + '">' + ic('x', 14) + (b.state === 'site' ? 'Cancel' : b.up ? 'Stop' : 'Demolish') + '</button>';
    return '<div class="ph"><canvas class="thumb" width="56" height="56"></canvas><div><b class="nm">' + name + '</b><div class="sub">' + (B.name.length > 1 ? 'Tier ' + (b.tier + 1) + ' of ' + B.name.length : '') + '</div></div><button class="x" onclick="HF.U.select(null)">' + ic('x', 16) + '</button></div>' +
      (b.state === 'done' ? barHTML(b.hp / b.maxHp, b.hp / b.maxHp > 0.5 ? '#5fbf5f' : '#d8a040', 'Condition ' + Math.ceil(b.hp) + '/' + b.maxHp) : barHTML(b.prog, '#e0b850', 'Built ' + pct(b.prog))) + info + up + '<div class="row">' + extra + del + '</div>';
  }

  // ---- Modals -------------------------------------------------------------------------------------------
  U.modal = function (html, cls) { const m = $('modal'); m.className = cls || ''; m.innerHTML = '<div class="box panel">' + html + '</div>'; m.classList.add('show'); };
  U.closeModal = function () { const m = $('modal'); m.className = 'hidden'; m.innerHTML = ''; if (U.open !== 'drawer') U.open = null; stopVignette(); };
  const head = (title, iconName) => '<div class="mh">' + (iconName ? ic(iconName, 24) : '') + '<h2>' + title + '</h2><button class="x" data-act="close">' + ic('x', 18) + '</button></div>';

  U.openJobs = function (id) {
    const s = st(); const u = s.units[id];
    const btns = D.JOB_ORDER.map(j => { const J = D.JOBS[j]; const need = J.need && !S.has(s, J.need); const n = S.present(s).filter(x => x.job === j).length;
      return '<button class="jobb ' + (u.job === j ? 'on' : '') + (need ? ' off' : '') + '" data-act="job" data-id="' + id + '" data-job="' + j + '" data-why="' + (need ? 'Needs a ' + D.B[J.need].name[0] : '') + '">' + ic(J.icon, 26) + '<b>' + J.name + '</b><small>' + J.desc + '</small><em>' + n + '</em></button>'; }).join('');
    U.open = 'jobs'; U.modal(head('Job for ' + esc(u.name.split(' ')[0]), 'hammer') + '<div class="jobs">' + btns + '</div>');
  };
  U.openGear = function (id) {
    const s = st(); const u = s.units[id];
    const row = (list, isW) => list.map(k => { const it = isW ? D.WEAPON[k] : D.ARMOR[k]; const have = k === 'none' || (s.items[k] || 0) > 0; const cur = (isW ? u.gear.w : u.gear.a) === k;
      return '<button class="jobb ' + (cur ? 'on' : '') + (have || cur ? '' : ' off') + '" data-act="equip" data-id="' + id + '" data-item="' + k + '" data-why="None in stock. Craft at a Workshop.">' + ic(isW ? ({ none: 'swords', club: 'swords', spear: 'spear', bow: 'bow', sword: 'sword' })[k] : ({ none: 'bag', hide: 'shield', mail: 'helmet' })[k], 24) + '<b>' + it.name + '</b><small>' + (isW ? 'Damage ' + it.dmg + (it.ranged ? ' · ranged' : '') : 'Armour ' + it.def) + '</small><em>' + (k === 'none' ? '' : (s.items[k] || 0)) + '</em></button>'; }).join('');
    U.open = 'gear'; U.modal(head('Gear for ' + esc(u.name.split(' ')[0]), 'shield') + '<h3>Weapon</h3><div class="jobs">' + row(['none', 'club', 'spear', 'bow', 'sword'], true) + '</div><h3>Armour</h3><div class="jobs">' + row(['none', 'hide', 'mail'], false) + '</div>');
  };
  U.openPeople = function () {
    const s = st(); const all = S.survivors(s);
    const rows = all.map(u => '<div class="prow ' + (u.away ? 'away' : '') + '"><canvas class="pp" data-set="' + u.set + '" width="36" height="36"></canvas><div class="pn"><b data-act="selUnit" data-id="' + u.id + '">' + esc(u.name) + '</b><small>' + D.TRAITS[u.trait].name + ' · ' + (u.away ? 'on an expedition' : esc(taskText(s, u))) + (u.injury ? ' · ' + esc(u.injury.name) : '') + '</small><div class="mini"><i style="width:' + (u.hp / u.maxHp * 100) + '%;background:#5fbf5f"></i></div><div class="mini"><i style="width:' + u.morale + '%;background:#d9b85a"></i></div></div>' +
      '<button class="pill" data-act="jobPick" data-id="' + u.id + '" ' + (u.away ? 'disabled' : '') + '>' + ic(D.JOBS[u.job].icon, 16) + D.JOBS[u.job].name + '</button></div>').join('');
    const counts = D.JOB_ORDER.map(j => [j, all.filter(u => u.job === j).length]).filter(x => x[1]).map(([j, n]) => '<span class="cnt">' + ic(D.JOBS[j].icon, 14) + n + '</span>').join('');
    U.open = 'people'; U.modal(head('Survivors · ' + all.length, 'people') + '<div class="counts">' + counts + ' · Beds ' + S.beds(s) + '</div><div class="plist">' + rows + '</div>' + (s.graves.length ? '<details class="graves"><summary>' + ic('skull', 14) + 'The fallen · ' + s.graves.length + '</summary>' + s.graves.map(g => '<div>' + esc(g.name) + ' · day ' + g.day + ' · ' + esc(g.cause) + '</div>').join('') + '</details>' : ''), 'wide');
    document.querySelectorAll('canvas.pp').forEach(c => { const p = A.portrait(c.dataset.set, 36); if (p) c.getContext('2d').drawImage(p, 0, 0); else A.loadCast(c.dataset.set).then(() => { const q = A.portrait(c.dataset.set, 36); if (q) c.getContext('2d').drawImage(q, 0, 0); }); });
  };

  // ---- Expeditions ----------------------------------------------------------------------------------------
  U.openExpeditions = function () {
    const s = st(); U.open = 'exp';
    const known = s.sites.filter(x => x.known);
    if (!U.expSel || !known.find(x => x.id === U.expSel)) U.expSel = known[0] && known[0].id;
    const site = s.sites.find(x => x.id === U.expSel); const SD = site && D.SITE[site.type];
    const avail = S.present(s).filter(u => !u.downed);
    U.expParty = U.expParty.filter(id => avail.find(u => u.id === id));
    const party = U.expParty.map(id => s.units[id]);
    const need = site ? S.supplyNeed(s, site, Math.max(1, party.length)) : 0;
    if (!U.expFood || U.expFood > s.res.food) U.expFood = Math.min(Math.floor(s.res.food), need);
    let right = '';
    if (site) {
      const busy = s.exps.find(x => x.site === site.id);
      const hrs = site.dist * D.HOURS_PER_LEAGUE;
      const locked = SD.locked && s.era < SD.locked;
      const lootHint = Object.keys(SD.loot).map(k => ic(RES_ICON[k], 14)).join('') + (SD.relic && !s.relics[SD.relic] ? ' ' + ic('key', 14) + 'relic' : '') + (SD.clears ? ' ' + ic('flag', 14) + 'ends a threat' : '') + (D.SITE[site.type].enc.includes('survivor') || site.type === 'stranded' || site.type === 'mill' ? ' ' + ic('people', 14) + 'people' : '');
      const checks = [...new Set(D.ENC[SD.enc[0]].choices.filter(c => c.check).map(c => c.check))];
      const odds = party.length ? checks.map(k => '<span class="odd">' + D.SKILL_NAME[k] + ' ' + Math.round(S.partyScore(s, party, k) * 10) / 10 + '</span>').join(' ') : '';
      right = '<h3>' + esc(S.siteName(site)) + '</h3><div class="sub">' + SD.name + ' · ' + '<span class="danger">' + '&#9760;'.repeat(SD.danger) + '</span> · ' + Math.round(hrs * 2) + 'h round trip' + (site.visits ? ' · visited ' + site.visits + 'x' : '') + (site.cleared ? ' · cleared' : '') + '</div>' +
        '<div class="sub">Rewards: ' + lootHint + '</div>' +
        '<h4>Party (' + party.length + '/4)</h4><div class="party">' + avail.map(u => '<button class="mem ' + (U.expParty.includes(u.id) ? 'on' : '') + '" data-act="member" data-id="' + u.id + '"><b>' + esc(u.name.split(' ')[0]) + '</b><small>C' + u.skills.combat + ' S' + u.skills.scout + ' G' + u.skills.gather + (u.injury ? ' · hurt' : '') + '</small></button>').join('') + '</div>' +
        (odds ? '<div class="sub">Party strength: ' + odds + '</div>' : '') +
        '<h4>Rations</h4><div class="row food"><button class="pill" data-act="food" data-v="-1">-</button><b>' + ic('food', 16) + U.expFood + '</b><button class="pill" data-act="food" data-v="1">+</button><small>' + need + ' advised</small></div>' +
        '<button class="btn gold big ' + (busy || locked || !party.length ? 'off' : '') + '" data-act="depart" data-why="' + (busy ? 'A party is already headed there' : locked ? 'You are not ready for this place' : 'Choose who goes') + '">' + ic('compass', 18) + (busy ? 'Party en route' : locked ? 'Not yet' : 'Set out') + '</button>';
    }
    const active = s.exps.map(x => { const si = s.sites.find(q => q.id === x.site); const names = x.party.map(id => s.units[id] && s.units[id].name.split(' ')[0]).filter(Boolean).join(', '); return '<div class="sub">' + ic('compass', 14) + names + ' · ' + esc(S.siteName(si)) + ' · ' + ({ leave: 'leaving camp', out: 'on the road (' + Math.ceil(x.t) + 'h)', site: 'exploring', back: 'returning (' + Math.ceil(x.t) + 'h)' })[x.phase] + '</div>'; }).join('');
    U.modal(head('Expeditions', 'map') + '<div class="exp"><div class="mapwrap"><canvas id="wmap" width="360" height="300"></canvas></div><div class="side">' + right + active + '</div></div>', 'wide');
    drawWorldMap($('wmap'), s);
    $('wmap').onclick = e => { const r = e.target.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * 360, y = (e.clientY - r.top) / r.height * 300; let best = null, bd = 30; for (const p of mapPts) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } } if (best) { HF.AU.ui('page'); U.expSel = best.id; U.openExpeditions(); } };
  };
  let mapPts = [];
  const mapR = d => 0.2 + 0.8 * Math.max(0, d - 1.2) / 6.8;
  function drawWorldMap(c, s) {
    const g = c.getContext('2d'); const W = c.width, H = c.height; g.imageSmoothingEnabled = false;
    g.fillStyle = '#d8c497'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { const h = HF.World.hash(i, 3, 1), h2 = HF.World.hash(i, 7, 2); g.fillStyle = 'rgba(120,90,40,' + (0.05 + h * 0.08) + ')'; g.fillRect(h * W, h2 * H, 2, 2); }
    // Land features drawn in ink: forests, hills, a river.
    g.strokeStyle = 'rgba(80,110,140,0.6)'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x < W; x += 6) { const y = H * 0.78 + Math.sin(x / 40) * 18 + Math.sin(x / 13) * 4; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < 90; i++) { const x = HF.World.hash(i, 11, 5) * W, y = 10 + HF.World.hash(i, 13, 5) * H * 0.68; if (Math.hypot(x - W / 2, y - H / 2) < 34) continue; const k = 4 + HF.World.hash(i, 1, 1) * 3; g.fillStyle = 'rgba(70,100,55,0.45)'; g.strokeStyle = 'rgba(50,40,25,0.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y - k * 1.4); g.lineTo(x - k, y + k * 0.6); g.lineTo(x + k, y + k * 0.6); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y + k * 0.6); g.lineTo(x, y + k * 1.1); g.stroke(); }
    for (let i = 0; i < 14; i++) { const x = W * 0.08 + HF.World.hash(i, 21, 3) * W * 0.3, y = H * 0.12 + HF.World.hash(i, 23, 3) * H * 0.3; const k = 7 + HF.World.hash(i, 2, 2) * 6; g.strokeStyle = 'rgba(80,60,35,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - k, y + k * 0.5); g.lineTo(x, y - k * 0.6); g.lineTo(x + k, y + k * 0.5); g.stroke(); }
    g.fillStyle = 'rgba(90,130,160,0.35)'; g.beginPath(); g.ellipse(W * 0.78, H * 0.3, 26, 14, 0.3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 3; g.strokeRect(3, 3, W - 6, H - 6);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 22;
    mapPts = [];
    for (const site of s.sites) {
      const a = site.dir * Math.PI / 180, r = mapR(site.dist) * R;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.85;
      if (!site.known) { g.fillStyle = 'rgba(80,60,30,0.25)'; g.font = '10px Adventurer'; g.textAlign = 'center'; g.fillText('?', x, y + 3); continue; }
      mapPts.push({ id: site.id, x, y });
      g.setLineDash([3, 4]); g.strokeStyle = U.expSel === site.id ? 'rgba(160,40,30,0.9)' : 'rgba(90,60,30,0.35)'; g.lineWidth = U.expSel === site.id ? 2 : 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
      const SD = D.SITE[site.type];
      g.fillStyle = site.cleared ? 'rgba(80,140,80,0.5)' : 'rgba(255,245,220,0.7)'; g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill();
      if (U.expSel === site.id) { g.strokeStyle = '#a02818'; g.lineWidth = 2; g.stroke(); }
      A.icon(g, SD.icon === 'stone' ? 'skull' : SD.icon === 'tower' ? 'tower' : SD.icon, x - 10, y - 10, 20);
      g.font = '8px Adventurer'; g.textAlign = 'center'; g.fillStyle = '#3a2814'; g.fillText(S.siteName(site), x, y + 21);
    }
    A.icon(g, 'campfire', cx - 12, cy - 12, 24); g.font = '9px Adventurer'; g.fillStyle = '#5a1810'; g.fillText('Camp', cx, cy + 22);
    for (const x of s.exps) { const site = s.sites.find(q => q.id === x.site); const tot = site.dist * D.HOURS_PER_LEAGUE; const f = x.phase === 'out' ? 1 - x.t / tot : x.phase === 'back' ? x.t / tot : x.phase === 'site' ? 1 : 0; const a = site.dir * Math.PI / 180, r = mapR(site.dist) * R * f; g.fillStyle = '#a02818'; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, 4, 0, Math.PI * 2); g.fill(); }
    // Compass rose.
    g.fillStyle = '#6b4a2b'; g.font = '9px Adventurer'; g.fillText('N', W - 22, 18); g.beginPath(); g.moveTo(W - 22, 22); g.lineTo(W - 26, 34); g.lineTo(W - 18, 34); g.fill();
  }

  // ---- Research and crafting ---------------------------------------------------------------------------------
  U.openResearch = function (tab) {
    const s = st(); U.tab = tab || U.tab; U.open = 'research';
    const tabs = '<div class="tabs"><button class="tab ' + (U.tab === 'research' ? 'on' : '') + '" data-act="tab" data-v="research">Research</button><button class="tab ' + (U.tab === 'craft' ? 'on' : '') + '" data-act="tab" data-v="craft">Craft</button><button class="tab ' + (U.tab === 'relics' ? 'on' : '') + '" data-act="tab" data-v="relics">Relics</button></div>';
    let body = '';
    if (U.tab === 'research') {
      body = '<div class="sub">' + ic('book', 16) + Math.floor(s.res.knowledge) + ' Knowledge. Scholars at a Scholar\'s Study earn it; expeditions find it.</div><div class="techs">' + D.TECH_ORDER.map(id => { const T = D.TECH[id]; const done = s.techs[id]; const why = done ? '' : S.techBlock(s, id); const aff = s.res.knowledge >= T.cost;
        return '<div class="tech ' + (done ? 'done' : why ? 'locked' : '') + '"><b>' + T.name + '</b><small>' + T.desc + '</small>' + (done ? '<em>' + ic('check', 14) + 'Known</em>' : '<button class="btn ' + (why || !aff ? 'off' : 'gold') + '" data-act="tech" data-id="' + id + '" data-why="' + esc(why || 'Not enough Knowledge') + '">' + ic('book', 14) + T.cost + '</button>' + (why ? '<em class="req">' + esc(why) + '</em>' : '')) + '</div>'; }).join('') + '</div>';
    } else if (U.tab === 'craft') {
      const ws = S.has(s, 'workshop');
      body = '<div class="sub">' + (ws ? 'Crafters at the Workshop make these. Queue: ' + (s.craftQ.map(q => (D.WEAPON[q.item] || D.ARMOR[q.item]).name + ' ' + pct(q.p)).join(', ') || 'empty') : 'Build a Workshop first.') + '</div><div class="techs">' + D.CRAFT_ORDER.map(k => { const it = D.WEAPON[k] || D.ARMOR[k]; const why = !ws ? 'Needs a Workshop' : it.tech && !s.techs[it.tech] ? 'Research ' + D.TECH[it.tech].name : '';
        return '<div class="tech ' + (why ? 'locked' : '') + '"><b>' + it.name + '</b><small>' + (it.dmg ? 'Damage ' + it.dmg + (it.ranged ? ', ranged' : '') : 'Armour ' + it.def) + ' · in stock ' + (s.items[k] || 0) + '</small><button class="btn ' + (why || !S.canAfford(s, it.cost) ? 'off' : 'gold') + '" data-act="craft" data-item="' + k + '" data-why="' + esc(why || 'Not enough resources') + '">' + costHTML(it.cost, s.res) + '</button>' + (why ? '<em class="req">' + why + '</em>' : '') + '</div>'; }).join('') + '</div>';
    } else {
      body = '<div class="techs">' + Object.entries(D.RELICS).map(([k, r]) => '<div class="tech ' + (s.relics[k] ? 'done' : 'locked') + '"><b>' + (s.relics[k] ? r.name : '???') + '</b><small>' + (s.relics[k] ? r.desc : 'Somewhere out there.') + '</small></div>').join('') + '</div>';
    }
    U.modal(head('Knowledge & Craft', 'book') + tabs + body, 'wide');
  };

  // ---- Events: strangers and expedition encounters ------------------------------------------------------------
  U.openPending = function () {
    const s = st(); const p = s.pending[0]; if (!p) return;
    U.open = 'pending';
    if (p.kind === 'stranger') {
      const u = s.units[p.uid]; if (!u) { G().cmd('choose', { choice: 1 }); return; }
      const tr = D.TRAITS[u.trait];
      U.modal('<div class="mh">' + ic('question', 24) + '<h2>A stranger at the fire</h2></div><div class="stranger"><canvas class="big" width="96" height="96"></canvas><div><b class="nm">' + esc(u.name) + '</b><div class="sub">' + esc(u.name.split(' ')[0]) + ' ' + esc(u.origin) + '.</div><div class="sub"><span class="trait">' + tr.name + '</span> · ' + tr.desc + '</div><div class="sub">Best at: ' + D.SKILLS.slice().sort((a, b) => u.skills[b] - u.skills[a]).slice(0, 2).map(k => D.SKILL_NAME[k] + ' ' + u.skills[k]).join(', ') + '</div><div class="sub">' + (S.beds(s) > S.survivors(s).length ? 'There is a bed free.' : 'There is no bed for them yet.') + ' Another mouth to feed.</div></div></div><div class="choices"><button class="btn gold big" data-act="choose" data-i="0">' + ic('check', 18) + 'Welcome them</button><button class="btn" data-act="choose" data-i="1">Send them away</button></div>', 'event');
      const c = document.querySelector('#modal canvas.big'); A.loadCast(u.set).then(() => { const pc = A.portrait(u.set, 96); if (pc && c) c.getContext('2d').drawImage(pc, 0, 0); });
      HF.AU.ui('notify');
      return;
    }
    const x = s.exps.find(e => e.id === p.exp); const enc = S.pendingEnc(s); if (!x || !enc) return;
    const site = s.sites.find(q => q.id === x.site); const party = x.party.map(id => s.units[id]).filter(Boolean);
    const choices = enc.choices.map((c, i) => { const ch = S.chance(s, party, c); const afford = (!c.trade || S.canAfford(s, c.trade.give)) && (!c.cost || S.canAfford(s, c.cost));
      return '<button class="btn choice ' + (afford ? '' : 'off') + '" data-act="choose" data-i="' + i + '" data-why="You cannot afford that">' + esc(c.text) + (c.check ? '<small>' + D.SKILL_NAME[c.check] + ' · ' + Math.round(ch * 100) + '% chance</small>' : c.trade ? '<small>' + costHTML(c.trade.give) + ' for ' + costHTML(c.trade.get) + '</small>' : c.cost ? '<small>Costs ' + costHTML(c.cost) + '</small>' : '<small>Certain</small>') + '</button>'; }).join('');
    U.modal('<div class="mh">' + ic(p.kind === 'road' ? 'compass' : D.SITE[site.type].icon === 'stone' ? 'skull' : D.SITE[site.type].icon, 24) + '<h2>' + esc(enc.title) + '</h2><small class="where">' + (p.kind === 'road' ? 'On the road to ' : '') + esc(S.siteName(site)) + '</small></div><canvas id="vig" width="360" height="110"></canvas><p class="story">' + esc(enc.text) + '</p><div class="sub">Party: ' + party.map(u => esc(u.name.split(' ')[0])).join(', ') + ' · rations ' + x.food + '</div><div class="choices">' + choices + '</div>', 'event');
    startVignette($('vig'), s, party, p.kind === 'road' ? (enc.title === 'Ambush!' ? 'ambush' : 'road') : D.SITE[site.type].art);
    HF.AU.ui('page');
  };
  U.showResult = function (res) {
    const loot = Object.entries(res.loot).filter(([, v]) => v > 0).map(([k, v]) => '<span class="cost">' + ic(RES_ICON[k], 16) + '+' + v + '</span>').join('');
    U.open = 'pending';
    U.modal('<div class="mh">' + ic(res.ok ? 'check' : 'exclaim', 24) + '<h2>' + esc(res.title) + '</h2></div><p class="story">' + esc(res.text) + '</p>' +
      (loot ? '<div class="loot">' + loot + '<small>(arrives when the party is home)</small></div>' : '') +
      (res.relic ? '<div class="sub good">' + ic('key', 16) + 'Found: ' + D.RELICS[res.relic].name + '</div>' : '') +
      (res.recruits ? '<div class="sub good">' + ic('people', 16) + res.recruits + ' new ' + (res.recruits > 1 ? 'people' : 'person') + ' will come back with the party.</div>' : '') +
      (res.reveal && res.reveal.length ? '<div class="sub good">' + ic('map', 16) + 'New places: ' + res.reveal.map(esc).join(', ') + '</div>' : '') +
      (res.hurt.length ? '<div class="sub bad">' + ic('potion', 16) + 'Hurt: ' + res.hurt.map(esc).join(', ') + '</div>' : '') +
      (res.dead.length ? '<div class="sub bad">' + ic('skull', 16) + 'Lost: ' + res.dead.map(esc).join(', ') + '</div>' : '') +
      (res.lostFood ? '<div class="sub bad">Lost ' + res.lostFood + ' rations.</div>' : '') +
      '<div class="choices"><button class="btn gold big" data-act="resultOk">Continue</button></div>', 'event');
    HF.AU.ui(res.dead.length ? 'error' : res.ok ? 'reward' : 'notify');
  };
  // An animated scene for encounters: the party on a strip of ground with the place behind them.
  let vigRAF = 0;
  function stopVignette() { if (vigRAF) cancelAnimationFrame(vigRAF); vigRAF = 0; }
  function startVignette(c, s, party, art) {
    stopVignette(); if (!c) return; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const props = { grove: [['t', 'tree_a', 60, 1], ['t', 'tree_b', 300, 1], ['t', 'tree_gold_a', 200, 0.8], ['t', 'bush_a', 130, 1]], village: [['t', 'p16_house_red', 70, 0.55], ['t', 'p16_house_blue', 270, 0.5], ['t', 'fv_fence_h', 160, 1], ['t', 'fv_well', 200, 1.2]],
      ruin: [['t', 'ruin_wall', 80, 1], ['t', 'arch_a', 250, 1], ['t', 'pillar_broken', 330, 1], ['t', 'monolith_b', 170, 1]], rocks: [['t', 'rock_big', 70, 1.2], ['t', 'rock_dark', 280, 1.2], ['t', 'pine_a', 330, 1], ['t', 'fv_campfire', 200, 1]],
      camp: [['t', 'cd_war_tent_red', 80, 2], ['x', 'war_tent_blue', 280, 2], ['x', 'flag_red', 180, 2], ['t', 'cd_skull_on_pike', 330, 1.2]], road: [['t', 'tree_c', 40, 1], ['t', 'pine_b', 330, 1], ['t', 'sign_e', 220, 1]], ambush: [['t', 'tree_b', 40, 1], ['t', 'tree_dark_a', 330, 1]] }[art] || [];
    const foes = art === 'ambush' ? ['bandit_knife', 'thug_a'] : art === 'camp' ? ['bandit_broad'] : [];
    foes.forEach(f => A.loadCast(f));
    const t0 = performance.now();
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      g.fillStyle = '#16202a'; g.fillRect(0, 0, 360, 110);
      for (let x = 0; x < 360; x += 32) { A.tile(g, 't', 'g_grass_' + (x / 32 % 4) + '_1', x, 62, 32); A.tile(g, 't', 'g_grass_' + ((x / 32 + 1) % 4) + '_2', x, 94, 32); }
      const sky = g.createLinearGradient(0, 0, 0, 64); sky.addColorStop(0, '#3a4a6a'); sky.addColorStop(1, '#a88a6a'); g.fillStyle = sky; g.fillRect(0, 0, 360, 64);
      for (const p of props) A.draw(g, p[0], p[1], p[2], 78, p[3]);
      party.forEach((u, i) => { const walk = t < 1.6; const x = 40 + i * 30 + Math.min(1.6, t) * 50; A.drawActor(g, u.set, walk ? 'Walk' : 'Idle', A.frame(walk ? 'Walk' : 'Idle', t), 0, x, 96 + (i % 2) * 6, 1); });
      foes.forEach((f, i) => A.drawActor(g, f, 'Idle', A.frame('Idle', t + i), Math.PI, 290 - i * 30, 96 + (i % 2) * 6, 1));
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 360, 4); g.fillRect(0, 106, 360, 4);
      vigRAF = requestAnimationFrame(draw);
    };
    draw();
  }

  // ---- Settings, credits, game over -----------------------------------------------------------------------
  U.openSettings = function () {
    const AU = HF.AU; const sl = (k, l) => '<label class="sl">' + l + '<input type="range" min="0" max="1" step="0.05" value="' + AU.vol[k] + '" data-act="vol" data-k="' + k + '"></label>';
    U.open = 'settings';
    U.modal(head('Camp', 'gear') + sl('master', 'Volume') + sl('music', 'Music') + sl('sfx', 'Effects') + sl('amb', 'Ambience') +
      '<label class="tg"><input type="checkbox" data-act="skipcine" ' + (HF.C.skipAll ? 'checked' : '') + '> Skip cinematics (except the opening)</label>' +
      '<div class="row"><button class="btn gold" data-act="save">' + ic('scroll', 16) + 'Save now</button><button class="btn" data-act="load">Load last save</button></div>' +
      '<div class="row"><button class="btn" data-act="credits">Credits</button><button class="btn red" data-act="newgame">New game</button></div>' +
      '<p class="hint">Drag to look around, pinch or scroll to zoom. Tap a survivor, then tap a tree, rock, foe or the ground to give an order. Keyboard: WASD to pan, Space to pause, B to build, Esc to cancel.</p>');
  };
  U.openCredits = function () {
    U.modal(head('Credits', 'scroll') + '<div class="credits"><p><b>HOLDFAST</b> is a working title.</p>' +
      '<p>Characters: built with the itch.io "Character Creator 2D Fantasy" (the repository\'s packed cast).</p>' +
      '<p>World: Pixel Art Top Down - Basic by Cainos; Pixel 16 village; forest village and castle tile sets; Mixel Topdown RPG ruins (see art_source/tiles licences).</p>' +
      '<p>Effects: the repository\'s effect atlas (Brackeys VFX, Kiln, magic and slash packs; see art_source/fx licences).</p>' +
      '<p>Interface: Medieval Fantasy UI icons by Kibyra; Adventurer font by Brian J Smith; fantasy UI sound pack.</p>' +
      '<p>Music: "Heartfelt Battle" (OpenGameArt, CC0). Fight sounds and ambience: synthesised (tools/make_sfx.py).</p>' +
      '<p>Stand-in art drawn in code: the palisade and the timber lookout.</p></div>');
  };
  U.gameOver = function (s) {
    U.open = 'over';
    U.modal('<div class="mh">' + ic('skull', 28) + '<h2>The camp has fallen</h2></div><p class="story">No one is left to keep the fire. The forest takes the clearing back, slowly, the way it took everything else.</p>' +
      '<div class="stats"><div>Days survived<b>' + s.stats.daysSurvived + '</b></div><div>People who came<b>' + s.stats.recruited + '</b></div><div>Raids repelled<b>' + s.stats.raids + '</b></div><div>Buildings raised<b>' + s.stats.built + '</b></div><div>Expeditions<b>' + s.stats.expeditions + '</b></div><div>Foes slain<b>' + s.stats.kills + '</b></div></div>' +
      (s.graves.length ? '<details class="graves" open><summary>The fallen</summary>' + s.graves.map(g => '<div>' + esc(g.name) + ' · day ' + g.day + ' · ' + esc(g.cause) + '</div>').join('') + '</details>' : '') +
      '<div class="choices"><button class="btn gold big" data-act="load">Load last save</button><button class="btn" data-act="title">Title screen</button></div>', 'event');
  };
})();
