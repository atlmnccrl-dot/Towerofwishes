// Vael: boot, the screens and the loop. The title and the camp share the campfire scene; the
// campaign map leads to a mission's team screen, the battle, and its rewards; the camp's tents hold
// the shop, the bounties and the achievements. The save lives in localStorage ('vael.save'); sprites
// load per screen (only the sets it shows). Music and sounds start on the first tap.
import { createBattle, step, TIME_LIMIT, FURY, fury } from './combat/battle.js';
import { UNITS, ENEMIES, SUMMONS } from './data/units.js';
import { MISSIONS, missionById, nextMission, regionOf, PREMISE, START_ROSTER } from './data/campaign.js';
import * as P from './game/progress.js';
import { loadSprites, loadFx, loadAtlas } from './render/assets.js';
import { createView } from './render/view.js';
import { createCamp } from './render/camp.js';
import * as E from './game/economy.js';
import { createAudio } from './game/audio.js';
import { createStore } from './game/store.js';
import { $, h, setPortraits, toast, goldIcon, face } from './ui/common.js';
import { renderCompany } from './ui/company.js';
import { renderMap, renderPrep, renderRewards, gemIcon } from './ui/campaign.js';
import { renderExtras, tip } from './ui/extras.js';

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
  // after anything that changes the save: store it, award achievements, refresh the coin counts
  after() {
    for (const a of E.checkAchievements(game.save)) { toast(`Feat: ${a.name} (+${a.gems} gems)`); game.audio.play('quest_complete'); }
    game.persist(); currency();
  },
  go, from: 'camp', heroic: false,
};
game.audio = createAudio(() => game.save.settings);
game.store = { available: false, price: (id) => (E.PRODUCTS.find((p) => p.id === id) || {}).price, buy() {}, restore() {} };
function currency() {
  for (const [g, m] of [['#k-gold', '#k-gems'], ['#m-gold', '#m-gems'], ['#x-gold', '#x-gems'], ['#c-gold', null]]) {
    if ($(g)) $(g).replaceChildren(goldIcon(), String(game.save.gold));
    if (m && $(m)) $(m).replaceChildren(gemIcon(), String(game.save.gems));
  }
}

// ---- screens
const SECTIONS = ['title', 'premise', 'camp', 'map', 'prep', 'company', 'extras'];
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
  if (name === 'extras') renderExtras(game, arg);
  if (!bg.hidden) { camp.resize(); refreshCast(); }
  game.audio.setScene(name === 'battle' ? 'battle' : 'camp');
  $('#tip').hidden = true;
  if (name === 'map') tip(game, 'map');
  if (name === 'prep') tip(game, 'prep');
  if (name === 'battle') tip(game, 'battle');
  if (name === 'camp' && Object.keys(game.save.cleared).length >= 2) tip(game, 'extras');
}

function renderTitle() {
  $('#t-continue').hidden = !hasSave;
  $('#t-new').classList.toggle('primary', !hasSave);
  $('#t-continue').classList.toggle('primary', hasSave);
}
function renderCamp() {
  const s = game.save, next = nextMission(s.cleared);
  $('#k-gold').replaceChildren(goldIcon(), String(s.gold));
  $('#k-gems').replaceChildren(gemIcon(), String(s.gems));
  $('#k-region').textContent = (next ? regionOf(next).name : 'Every road walked').toUpperCase();
  $('#k-next').textContent = next ? `Next: ${next.name}` : 'Every region cleared · heroic missions open';
  const pend = Object.keys(s.roster).some((k) => P.pendingUpgrade(s, k) >= 0);
  $('#k-company-dot').hidden = !pend;
  $('#k-company-sub').textContent = `${Object.keys(s.roster).length} recruits · ${s.inv.length} items`;
  $('#k-bounty-dot').hidden = !E.bountiesReady(s);
  $('#k-banner').hidden = !E.owns(s, 'vael.supporter');
  const team = $('#k-team'); team.replaceChildren();
  for (const t of s.team) { const d = UNITS[t.key]; team.append(h('div.tchip', { vars: { '--c': `var(--${d.cls})` } }, face(d.set, 26), h('span', null, d.name.split(' ')[0], h('small', null, 'Lv ' + s.roster[t.key].level)))); }
}

// the campfire shows whoever has joined (the first three before a game starts)
async function refreshCast() {
  // the team first, then others, ten at most around one fire
  const s = game.save, keys = screen === 'title' && !hasSave ? START_ROSTER
    : [...s.team.map((t) => t.key), ...Object.keys(s.roster).filter((k) => !s.team.some((t) => t.key === k))].slice(0, 10);
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
  const spec = P.battleSpec(m, game.heroic);
  battle = createBattle({ team: P.teamFor(s), foes: spec.foes, level: spec.level, might: spec.might, seed: (Math.random() * 1e9) | 0 });
  battle.theme = m.theme;
  view.setSprites(sprites); view.reset();
  buildAllies();
  $('#wavename').textContent = m.name + (game.heroic ? ' · Heroic' : '');
  game.audio.play('unsheathe_01');
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
  $('#clock').textContent = `${Math.max(0, Math.ceil(TIME_LIMIT - battle.t))} s` + (battle.t > FURY ? ` · Fury ×${fury(battle).toFixed(1)}` : '');
  $('#clock').classList.toggle('fury', battle.t > FURY);
}
function finish() {
  if (screen !== 'battle' || !battle) return;
  const rw = P.grantRewards(game.save, missionId, battle, Math.random, !!game.heroic);
  game.after();
  renderRewards(game, battle, rw, missionId);
  if (rw.xp.some((x) => x.to > x.from)) game.audio.play('level_up');
  else if (rw.win) game.audio.play('coin_01');
  // the tips that a result can bring
  setTimeout(() => {
    if (!rw.win) tip(game, 'lose');
    else if (rw.loot.length && tip(game, 'loot')) return;
    else if (Object.keys(game.save.roster).some((k) => P.pendingUpgrade(game.save, k) >= 0)) tip(game, 'upgrade');
  }, 600);
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
    game.audio.battleEvents(battle);
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
$('#k-shop').addEventListener('click', () => go('extras', 'shop'));
$('#k-bounties').addEventListener('click', () => go('extras', 'bounties'));
$('#k-ach').addEventListener('click', () => go('extras', 'ach'));
$('#x-back').addEventListener('click', () => go('camp'));
// ---- settings: volumes, screen shake, the save code, reset
function openSettings() {
  const st = game.save.settings;
  $('#set-music').value = String(Math.round(st.music * 100)); $('#set-sfx').value = String(Math.round(st.sfx * 100));
  $('#set-shake').setAttribute('aria-pressed', String(st.shake)); $('#set-shake').textContent = st.shake ? 'On' : 'Off';
  $('#settings').hidden = false; $('#reset-confirm').hidden = true; $('#save-box').hidden = true;
}
for (const b of document.querySelectorAll('.open-settings')) b.addEventListener('click', openSettings);
$('#set-close').addEventListener('click', () => ($('#settings').hidden = true));
for (const [id, key] of [['#set-music', 'music'], ['#set-sfx', 'sfx']]) $(id).addEventListener('input', (e) => { game.save.settings[key] = +e.target.value / 100; game.audio.setVolumes(); game.persist(); });
$('#set-shake').addEventListener('click', () => { const st = game.save.settings; st.shake = !st.shake; game.persist(); openSettings(); });
$('#set-export').addEventListener('click', async () => {
  const code = P.encodeSave(game.save); $('#save-box').hidden = false; $('#save-code').value = code;
  try { await navigator.clipboard.writeText(code); toast('Save code copied'); } catch (e) { $('#save-code').select(); toast('Copy the code from the box'); }
});
$('#set-import').addEventListener('click', () => { $('#save-box').hidden = false; $('#save-code').value = ''; $('#save-code').focus(); });
$('#save-load').addEventListener('click', () => {
  const s = P.decodeSave($('#save-code').value);
  if (!s) { toast('That code is damaged or from another game'); game.audio.play('error_01'); return; }
  game.save = s; game.audio.setVolumes(); castKey = ''; game.persist(); $('#settings').hidden = true; toast('Save loaded'); go('camp');
});
$('#set-reset').addEventListener('click', () => ($('#reset-confirm').hidden = false));
$('#reset-no').addEventListener('click', () => ($('#reset-confirm').hidden = true));
$('#reset-yes').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch (e) { /* fine */ } game.save = P.newSave(); hasSave = false; castKey = ''; $('#settings').hidden = true; go('title'); });
// a soft click on every button; louder cues are played where they happen
document.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled && !b.matches('#p-fight')) game.audio.play('click_wood_01', { gain: 0.35, gap: 0.03 }); });
$('#m-back').addEventListener('click', () => go('camp'));
$('#m-company').addEventListener('click', () => go('company'));
$('#p-back').addEventListener('click', () => go('map', missionId));
$('#p-company').addEventListener('click', () => go('company'));
$('#p-fight').addEventListener('click', fight);
$('#p-best').addEventListener('click', () => { P.bestTeam(game.save); P.autoEquip(game.save); game.persist(); renderPrep(game, missionId); toast('The strongest five, best gear on'); });
$('#p-equip').addEventListener('click', () => { const n = P.autoEquip(game.save); game.persist(); renderPrep(game, missionId); if (n) game.audio.play('equip_armor_01'); toast(n ? `${n} piece${n > 1 ? 's' : ''} of gear equipped` : 'Already wearing the best'); });
$('#c-back').addEventListener('click', () => go(game.from || 'camp', game.from === 'prep' ? missionId : undefined));
$('#leave').addEventListener('click', () => { battle = null; go('prep', missionId); });
$('#speed').addEventListener('click', () => {
  game.save.speed = SPEEDS[(SPEEDS.indexOf(game.save.speed) + 1) % SPEEDS.length] || 1; game.persist();
  $('#speed').textContent = game.save.speed + '×';
});
window.addEventListener('resize', () => { if (screen === 'battle') view.resize(); else if (!bg.hidden) camp.resize(); if (screen === 'map') renderMap(game); });

async function boot() {
  const [p, fx, tiles] = await Promise.all([fetch('assets/portraits.json').then((r) => r.json()), loadFx(), loadAtlas('tiles'),
    new Promise((ok) => { const i = new Image(); i.onload = ok; i.onerror = ok; i.src = 'assets/portraits.png'; })]);
  setPortraits(Object.assign(p, { w: 256, h: Math.ceil(Object.keys(p.sets).length / 8) * p.cell }));
  view = createView(stage, fx, tiles, () => game.save.settings); camp = createCamp(bg, fx);
  // the app stores, inside the iOS and Android app (cordova plugins are ready after 'deviceready')
  const startStore = () => {
    game.store = createStore({
      onGrant(id, tx) { const p = E.grantProduct(game.save, id, tx); if (p) { toast(`${p.name}: thank you!`); game.audio.play('chest_open'); game.after(); } },
      onChange() { if (screen === 'extras') renderExtras(game); },
      onError(msg) { toast(msg); },
    });
  };
  if (window.cordova) document.addEventListener('deviceready', startStore, { once: true }); else startStore();
  $('#speed').textContent = (game.save.speed || 1) + '×';
  go('title');
  requestAnimationFrame(frame);
}

// for the tests: the game, the screens, and a way to run a battle to its end at once
window.__v2 = { game, get battle() { return battle; }, get screen() { return screen; }, go, fight, finish, missions: MISSIONS.map((m) => m.id),
  pickUpgrades() { const s = game.save; for (const k of Object.keys(s.roster)) s.roster[k].ups.forEach((u, t) => { if (!u && s.roster[k].level >= P.UPGRADE_LEVELS[t]) P.pickUpgrade(s, k, t, P.upgradeChoices(k, t)[0].id); }); game.persist(); },
  skip() { if (!battle) return; while (!battle.result) step(battle, DT); if (!ended) { ended = true; setTimeout(finish, 200); } } };
boot().catch((e) => { $('#loading').textContent = 'Could not load: ' + e.message; });
