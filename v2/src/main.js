// Vael: boot, the screens and the loop. The title and the camp share the campfire scene; the
// campaign map leads to a mission's team screen, the battle, and its rewards. The save lives in
// localStorage ('vael.save'); sprites load per screen (only the sets it shows).
import { createBattle, step, TIME_LIMIT } from './combat/battle.js';
import { UNITS, ENEMIES, SUMMONS } from './data/units.js';
import { missionById, nextMission, PREMISE, START_ROSTER } from './data/campaign.js';
import * as P from './game/progress.js';
import { loadSprites, loadFx } from './render/assets.js';
import { createView } from './render/view.js';
import { createCamp } from './render/camp.js';
import { $, h, setPortraits, toast, goldIcon, face } from './ui/common.js';
import { renderCompany } from './ui/company.js';
import { renderMap, renderPrep, renderRewards } from './ui/campaign.js';

const DT = 1 / 60, SPEEDS = [1, 2, 3], KEY = 'vael.save';
const stage = $('#stage'), bg = $('#bg');
const sprites = {};
let view = null, camp = null, screen = 'loading', battle = null, missionId = null, acc = 0, last = 0, ended = false, castKey = '';

// ---- the save
let hasSave = false;
function readSave() { try { const raw = localStorage.getItem(KEY); hasSave = !!raw; return P.loadSave(raw ? JSON.parse(raw) : null); } catch (e) { return P.newSave(); } }
const game = {
  save: readSave(),
  persist() { try { localStorage.setItem(KEY, JSON.stringify(game.save)); hasSave = true; } catch (e) { /* storage may be blocked: play on without saving */ } },
  go, from: 'camp',
};

// ---- screens
const SECTIONS = ['title', 'premise', 'camp', 'map', 'prep', 'company'];
function go(name, arg) {
  // the company screen returns to where it was opened from (after a battle: the map)
  if (name === 'company' && screen !== 'company') game.from = screen === 'battle' ? 'map' : screen;
  screen = name;
  for (const s of SECTIONS) $('#' + s).hidden = s !== name;
  bg.hidden = !['title', 'premise', 'camp'].includes(name);
  stage.hidden = $('#hud').hidden = name !== 'battle';
  $('#result').hidden = true; $('#join').hidden = true; $('#loading').hidden = true;
  if (name === 'title') renderTitle();
  if (name === 'camp') renderCamp();
  if (name === 'map') renderMap(game, arg);
  if (name === 'prep') { missionId = arg; renderPrep(game, arg); }
  if (name === 'company') renderCompany(game, arg);
  if (!bg.hidden) { camp.resize(); refreshCast(); }
}

function renderTitle() {
  $('#t-continue').hidden = !hasSave;
  $('#t-new').classList.toggle('primary', !hasSave);
  $('#t-continue').classList.toggle('primary', hasSave);
}
function renderCamp() {
  const s = game.save, next = nextMission(s.cleared);
  $('#k-gold').replaceChildren(goldIcon(), String(s.gold));
  $('#k-next').textContent = next ? `Next: ${next.name}` : 'The road is clear. More to come.';
  const pend = Object.keys(s.roster).some((k) => P.pendingUpgrade(s, k) >= 0);
  $('#k-company-dot').hidden = !pend;
  $('#k-company-sub').textContent = `${Object.keys(s.roster).length} recruits · ${s.inv.length} items`;
  const team = $('#k-team'); team.replaceChildren();
  for (const t of s.team) { const d = UNITS[t.key]; team.append(h('div.tchip', { vars: { '--c': `var(--${d.cls})` } }, face(d.set, 26), h('span', null, d.name.split(' ')[0], h('small', null, 'Lv ' + s.roster[t.key].level)))); }
}

// the campfire shows whoever has joined (the first three before a game starts)
async function refreshCast() {
  const keys = screen === 'title' && !hasSave ? START_ROSTER : Object.keys(game.save.roster);
  const sets = keys.map((k) => UNITS[k].set), key = sets.join();
  if (key === castKey) return; castKey = key;
  const need = sets.filter((s) => !sprites[s]);
  if (need.length) Object.assign(sprites, await loadSprites(need));
  if (castKey === key) camp.setCast(sets.map((s) => sprites[s]));
}

// ---- the battle
function setsFor(team, foes) {
  const defs = [...team.map((t) => UNITS[t.key]), ...foes.map(([k]) => ENEMIES[k])];
  const out = new Set(defs.map((d) => d.set));
  for (const d of defs) for (const e of d.ability ? d.ability.effects : []) if (e.type === 'summon') out.add(SUMMONS[e.key].set);
  return [...out];
}
async function fight() {
  const s = game.save, m = missionById(missionId);
  if (!s.team.length) { toast('Pick at least one recruit'); return; }
  $('#loading').textContent = 'Marching out…'; $('#loading').hidden = false;
  const need = setsFor(s.team, m.foes).filter((x) => !sprites[x]);
  try { Object.assign(sprites, await loadSprites(need)); } catch (e) { $('#loading').textContent = 'Could not load the art: ' + e.message; return; }
  battle = createBattle({ team: P.teamFor(s), foes: m.foes, level: m.level, might: m.might || 1, seed: (Math.random() * 1e9) | 0 });
  battle.theme = m.theme;
  view.setSprites(sprites); view.reset();
  buildAllies();
  $('#wavename').textContent = m.name;
  go('battle'); view.resize();
  acc = 0; ended = false;
}
function buildAllies() {
  const el = $('#allies'); el.replaceChildren();
  for (const u of battle.units.filter((u) => u.team === 'ally')) {
    const c = h('div.chip', null, face(u.def.set, 26), h('div.ci', null, h('span.nm', null, u.def.name.split(' ')[0]), h('div.bar', null, h('i.hp'), h('i.sh')), h('div.bar.en', null, h('i'))));
    el.append(c); u._chip = c;
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
function finish() {
  if (screen !== 'battle' || !battle) return;
  const rw = P.grantRewards(game.save, missionId, battle, Math.random);
  game.persist();
  renderRewards(game, battle, rw, missionId);
}

// ---- the loop
function frame(now) {
  const real = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  if (screen === 'battle' && battle) {
    const speed = game.save.speed || 1;
    acc += real * speed;
    let events = [];
    while (acc >= DT) { step(battle, DT); events = events.concat(battle.events); acc -= DT; }
    if (!ended && events.some((e) => e.type === 'end')) { ended = true; setTimeout(finish, 1400); }
    battle.events = events;
    view.draw(battle, real * speed);
    battle.events = [];
    updateHud();
  } else if (!bg.hidden) camp.draw(real);
  requestAnimationFrame(frame);
}

// ---- buttons
$('#t-continue').addEventListener('click', () => go('camp'));
$('#t-new').addEventListener('click', () => {
  if (hasSave && $('#t-confirm').hidden) { $('#t-confirm').hidden = false; return; }
  newGame();
});
$('#t-confirm-yes').addEventListener('click', newGame);
$('#t-confirm-no').addEventListener('click', () => ($('#t-confirm').hidden = true));
function newGame() { $('#t-confirm').hidden = true; game.save = P.newSave(); game.persist(); castKey = ''; $('#premise-text').textContent = PREMISE; go('premise'); }
$('#premise-go').addEventListener('click', () => go('camp'));
$('#k-campaign').addEventListener('click', () => go('map'));
$('#k-company').addEventListener('click', () => go('company'));
$('#k-title').addEventListener('click', () => go('title'));
for (const b of document.querySelectorAll('.open-settings')) b.addEventListener('click', () => { $('#settings').hidden = false; $('#reset-confirm').hidden = true; });
$('#set-close').addEventListener('click', () => ($('#settings').hidden = true));
$('#set-reset').addEventListener('click', () => ($('#reset-confirm').hidden = false));
$('#reset-no').addEventListener('click', () => ($('#reset-confirm').hidden = true));
$('#reset-yes').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) { /* fine */ } game.save = P.newSave(); hasSave = false; castKey = ''; $('#settings').hidden = true; go('title'); });
$('#m-back').addEventListener('click', () => go('camp'));
$('#m-company').addEventListener('click', () => go('company'));
$('#p-back').addEventListener('click', () => go('map', missionId));
$('#p-company').addEventListener('click', () => go('company'));
$('#p-fight').addEventListener('click', fight);
$('#c-back').addEventListener('click', () => go(game.from || 'camp', game.from === 'prep' ? missionId : undefined));
$('#leave').addEventListener('click', () => { battle = null; go('prep', missionId); });
$('#speed').addEventListener('click', () => {
  game.save.speed = SPEEDS[(SPEEDS.indexOf(game.save.speed) + 1) % SPEEDS.length] || 1; game.persist();
  $('#speed').textContent = game.save.speed + '×';
});
window.addEventListener('resize', () => { if (screen === 'battle') view.resize(); else if (!bg.hidden) camp.resize(); if (screen === 'map') renderMap(game); });

async function boot() {
  const [p, fx] = await Promise.all([fetch('assets/portraits.json').then((r) => r.json()), loadFx(),
    new Promise((ok) => { const i = new Image(); i.onload = ok; i.onerror = ok; i.src = 'assets/portraits.png'; })]);
  setPortraits(Object.assign(p, { w: 256, h: Math.ceil(Object.keys(p.sets).length / 8) * p.cell }));
  view = createView(stage, fx); camp = createCamp(bg, fx);
  $('#speed').textContent = (game.save.speed || 1) + '×';
  go('title');
  requestAnimationFrame(frame);
}

// for the tests: the game, the screens, and a way to run a battle to its end at once
window.__v2 = { game, get battle() { return battle; }, get screen() { return screen; }, go, fight, finish,
  skip() { if (!battle) return; while (!battle.result) step(battle, DT); if (!ended) { ended = true; setTimeout(finish, 200); } } };
boot().catch((e) => { $('#loading').textContent = 'Could not load: ' + e.message; });
