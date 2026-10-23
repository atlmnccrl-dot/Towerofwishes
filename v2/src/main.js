// Vael Company, the battle lab: pick up to five recruits, place them in a 2x3 formation, choose a
// wave, and watch the battle play itself. Sprites load per battle (only the sets on the field).
import { createBattle, step, TIME_LIMIT } from './combat/battle.js';
import { UNITS, ENEMIES, SUMMONS, WAVES, CLASSES } from './data/units.js';
import { loadSprites, loadFx } from './render/assets.js';
import { createView } from './render/view.js';

const DT = 1 / 60, MAX_TEAM = 5, SPEEDS = [1, 2, 3];
const $ = (s) => document.querySelector(s);
const canvas = $('#stage');
const KEYS = Object.keys(UNITS);
// slots 0-2 are the front row, 3-5 the back row; on screen the back row is the left column
const SLOT_GRID = [[3, 0], [0, 0], [4, 1], [1, 1], [5, 2], [2, 2]].map(([slot]) => slot);

let portraits = null, fxAtlas = null, view = null;
const sprites = {};
let save = { team: [], wave: 'ambush', speed: 1 };
try { Object.assign(save, JSON.parse(localStorage.getItem('vael.lab') || '{}')); } catch (e) { /* storage may be blocked */ }
if (!save.team.length) save.team = [{ key: 'corvin', slot: 1 }, { key: 'brann', slot: 0 }, { key: 'ysolde', slot: 4 }, { key: 'maren', slot: 3 }, { key: 'saela', slot: 5 }];
save.team = save.team.filter((m) => UNITS[m.key] && m.slot >= 0 && m.slot < 6);
if (!WAVES[save.wave]) save.wave = 'ambush';
const persist = () => { try { localStorage.setItem('vael.lab', JSON.stringify(save)); } catch (e) { /* fine without */ } };

let battle = null, acc = 0, last = 0, running = false, selSlot = null, focus = save.team[0] ? save.team[0].key : KEYS[0];

// ---- a portrait from the atlas, at any size
function face(set, size = 32) {
  const el = document.createElement('div'); el.className = 'face';
  const p = portraits.sets[set] || [0, 0], k = size / portraits.cell;
  Object.assign(el.style, { width: size + 'px', height: size + 'px', backgroundSize: `${portraits.w * k}px ${portraits.h * k}px`, backgroundPosition: `-${p[0] * k}px -${p[1] * k}px` });
  return el;
}
const clsColor = (cls) => `var(--${cls})`;

// ---- the team screen
function renderTeam() {
  const at = (slot) => save.team.find((m) => m.slot === slot);
  const slots = $('#slots'); slots.innerHTML = '';
  for (const slot of SLOT_GRID) {
    const m = at(slot), b = document.createElement('div');
    b.className = 'slot' + (m ? ' filled' : '') + (selSlot === slot ? ' sel' : '');
    b.setAttribute('role', 'button'); b.tabIndex = 0;
    if (m) {
      const d = UNITS[m.key]; b.style.setProperty('--c', clsColor(d.cls));
      b.append(face(d.set, 30));
      const t = document.createElement('div'); t.style.minWidth = '0';
      t.innerHTML = `<div class="nm">${d.name}</div><div class="cls" style="--c:${clsColor(d.cls)}">${CLASSES[d.cls].name}</div>`;
      b.append(t);
      const x = document.createElement('button'); x.className = 'x'; x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove ' + d.name);
      x.addEventListener('click', (e) => { e.stopPropagation(); save.team = save.team.filter((q) => q !== m); selSlot = null; persist(); renderTeam(); });
      b.append(x);
      b.setAttribute('aria-label', `${d.name}, ${slot < 3 ? 'front' : 'back'} row`);
    } else { b.innerHTML = '<span class="empty">empty</span>'; b.setAttribute('aria-label', `Empty ${slot < 3 ? 'front' : 'back'} slot`); }
    b.addEventListener('click', () => tapSlot(slot));
    slots.append(b);
  }
  const roster = $('#roster'); roster.innerHTML = '';
  for (const key of KEYS) {
    const d = UNITS[key], inTeam = save.team.some((m) => m.key === key), c = document.createElement('button');
    c.type = 'button'; c.className = 'card' + (inTeam ? ' in' : '') + (focus === key ? ' focus' : '');
    c.style.setProperty('--c', clsColor(d.cls)); c.setAttribute('aria-pressed', String(inTeam));
    c.append(face(d.set, 32));
    const t = document.createElement('div');
    t.innerHTML = `<span class="nm">${d.name}</span><span class="cls" style="--c:${clsColor(d.cls)}">${CLASSES[d.cls].name}</span>`;
    c.append(t);
    c.addEventListener('click', () => tapCard(key));
    roster.append(c);
  }
  const d = UNITS[focus];
  $('#detail').innerHTML = d ? `<div class="t">${d.name}<small>${CLASSES[d.cls].name} · ${d.title}</small></div>
    <div class="ab"><b>${d.ability.name}.</b> ${d.ability.desc}</div>${d.passive ? `<div class="ps">${d.passive.name}: ${d.passive.desc}</div>` : ''}` : '';
  const waves = $('#waves'); waves.innerHTML = '';
  for (const [k, w] of Object.entries(WAVES)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'wave'; b.textContent = w.name; b.setAttribute('aria-pressed', String(save.wave === k));
    b.addEventListener('click', () => { save.wave = k; persist(); renderTeam(); });
    waves.append(b);
  }
  $('#count').textContent = `${save.team.length} / ${MAX_TEAM}`;
  $('#fight').disabled = !save.team.length;
}
function tapCard(key) {
  focus = key;
  const m = save.team.find((q) => q.key === key);
  if (m) { selSlot = selSlot === m.slot ? null : m.slot; }
  else if (save.team.length < MAX_TEAM) {
    // front row for those who hold or hunt, back row for the rest; the other row if that one is full
    const front = ['vanguard', 'striker'].includes(UNITS[key].cls), order = front ? [1, 0, 2, 4, 3, 5] : [4, 3, 5, 1, 0, 2];
    const slot = selSlot != null && !save.team.some((q) => q.slot === selSlot) ? selSlot : order.find((s) => !save.team.some((q) => q.slot === s));
    save.team.push({ key, slot }); selSlot = null; persist();
  }
  renderTeam();
}
function tapSlot(slot) {
  const here = save.team.find((m) => m.slot === slot);
  if (selSlot == null) { selSlot = slot; if (here) focus = here.key; }
  else if (selSlot === slot) selSlot = null;
  else {
    // move or swap the selected slot's unit here
    const from = save.team.find((m) => m.slot === selSlot);
    if (from) { if (here) here.slot = selSlot; from.slot = slot; persist(); selSlot = null; }
    else { selSlot = slot; if (here) focus = here.key; }
  }
  renderTeam();
}

// ---- battle
function setsFor(team, wave) {
  const defs = [...team.map((m) => UNITS[m.key]), ...WAVES[wave].foes.map(([k]) => ENEMIES[k])];
  const out = new Set(defs.map((d) => d.set));
  for (const d of defs) for (const e of d.ability ? d.ability.effects : []) if (e.type === 'summon') out.add(SUMMONS[e.key].set);
  return [...out];
}
async function startBattle() {
  if (!save.team.length) return;
  show('loading'); $('#loading').textContent = 'Marching out…';
  const need = setsFor(save.team, save.wave).filter((s) => !sprites[s]);
  Object.assign(sprites, await loadSprites(need));
  battle = createBattle({ team: save.team.map((m) => ({ key: m.key, slot: m.slot, level: 1 })), wave: save.wave, seed: (Math.random() * 1e9) | 0 });
  view.setSprites(sprites); view.reset();
  buildAllies();
  $('#wavename').textContent = WAVES[save.wave].name;
  show('battle'); view.resize();
  acc = 0; last = 0;
  if (!running) { running = true; requestAnimationFrame(frame); }
}
function buildAllies() {
  const el = $('#allies'); el.innerHTML = '';
  for (const u of battle.units.filter((u) => u.team === 'ally')) {
    const c = document.createElement('div'); c.className = 'chip'; c.dataset.id = u.id;
    c.append(face(u.def.set, 26));
    const t = document.createElement('div');
    t.innerHTML = `<span class="nm">${u.def.name.split(' ')[0]}</span><div class="bar"><i class="hp"></i><i class="sh"></i></div><div class="bar en"><i></i></div>`;
    c.append(t); el.append(c); u._chip = c;
  }
}
function updateHud() {
  for (const u of battle.units) {
    if (!u._chip) continue;
    const c = u._chip;
    c.querySelector('.hp').style.width = `${(u.hp / u.max) * 100}%`;
    c.querySelector('.sh').style.width = `${Math.min(1, u.shield / u.max) * 100}%`;
    c.querySelector('.en i').style.width = `${Math.min(100, u.energy)}%`;
    c.classList.toggle('down', u.state === 'ko'); c.classList.toggle('ready', u.energy >= 100 && u.state !== 'ko');
  }
  $('#clock').textContent = `${Math.max(0, Math.ceil(TIME_LIMIT - battle.t))} s`;
}
function frame(now) {
  if (!running) return;
  const real = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  const speed = save.speed || 1;
  acc += real * speed;
  let events = [], ended = false;
  while (acc >= DT) { step(battle, DT); events = events.concat(battle.events); acc -= DT; if (events.some((e) => e.type === 'end')) ended = true; }
  battle.events = events;
  view.draw(battle, real * speed);
  battle.events = [];
  updateHud();
  if (ended) setTimeout(showResult, 1400);
  requestAnimationFrame(frame);
}
function showResult() {
  if (!battle || !battle.result) return;
  const win = battle.result === 'win', timeout = !win && battle.t >= TIME_LIMIT - 0.01;
  $('#rtitle').textContent = win ? 'Victory' : timeout ? 'Time ran out' : 'Defeat';
  $('#rtitle').className = win ? 'win' : '';
  const foes = battle.units.filter((u) => u.team === 'foe' && !u.summoned);
  $('#rsub').textContent = `${WAVES[battle.wave].name} · ${Math.round(battle.t)} s · ${foes.filter((u) => u.state === 'ko').length} of ${foes.length} foes down`;
  const allies = battle.units.filter((u) => u.team === 'ally' && !u.summoned);
  const top = Math.max(1, ...allies.map((u) => Math.max(u.dealt, u.healed)));
  const mvp = allies.reduce((a, u) => (u.dealt + u.healed * 1.2 > a.dealt + a.healed * 1.2 ? u : a), allies[0]);
  const rows = $('#rrows'); rows.innerHTML = '';
  for (const u of allies) {
    const r = document.createElement('div'); r.className = 'rrow';
    r.append(face(u.def.set, 26));
    const n = document.createElement('div'); n.className = 'nm'; n.innerHTML = `${u.def.name.split(' ')[0]}${u === mvp ? '<span class="mvp">MVP</span>' : ''}`;
    if (u.state === 'ko') n.style.opacity = '0.6';
    r.append(n);
    const bars = document.createElement('div'); bars.className = 'rbars';
    bars.innerHTML = `<div class="rb"><i style="width:${(u.dealt / top) * 100}%"></i>${Math.round(u.dealt)}</div>` + (u.healed ? `<div class="rb h"><i style="width:${(u.healed / top) * 100}%"></i>+${Math.round(u.healed)}</div>` : '');
    r.append(bars); rows.append(r);
  }
  $('#result').hidden = false;
}
function leaveBattle() { running = false; battle = null; renderTeam(); show('team'); }

// ---- screens
function show(name) {
  $('#team').hidden = name !== 'team';
  canvas.hidden = $('#hud').hidden = name !== 'battle';
  $('#result').hidden = true;
  $('#loading').hidden = name !== 'loading';
}

$('#fight').addEventListener('click', startBattle);
$('#again').addEventListener('click', startBattle);
$('#toteam').addEventListener('click', leaveBattle);
$('#leave').addEventListener('click', leaveBattle);
$('#speed').addEventListener('click', () => {
  save.speed = SPEEDS[(SPEEDS.indexOf(save.speed) + 1) % SPEEDS.length] || 1; persist();
  $('#speed').textContent = save.speed + '×';
});

async function boot() {
  const [p, fx] = await Promise.all([fetch('assets/portraits.json').then((r) => r.json()), loadFx(),
    new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ok; i.src = 'assets/portraits.png'; })]);
  portraits = Object.assign(p, { w: 256, h: Math.ceil(Object.keys(p.sets).length / 8) * p.cell });
  fxAtlas = fx;
  view = createView(canvas, fxAtlas);
  window.addEventListener('resize', () => view.resize());
  $('#speed').textContent = (save.speed || 1) + '×';
  renderTeam(); show('team');
}

window.__v2 = { get battle() { return battle; }, get save() { return save; }, startBattle, leaveBattle, renderTeam };
boot().catch((e) => { $('#loading').textContent = 'Could not load: ' + e.message; });
