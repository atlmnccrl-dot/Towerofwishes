// Vael: boot, the screens and the loop. The title and the camp share the campfire scene; the
// campaign map leads to a mission's team screen, the battle, and its rewards; the camp's tents hold
// the shop, the bounties and the achievements. The save lives in localStorage ('vael.save'); sprites
// load per screen (only the sets it shows). Music and sounds start on the first tap.
import { createBattle, step, trigger, TIME_LIMIT, FURY, fury } from './combat/battle.js';
import { UNITS, ENEMIES, SUMMONS } from './data/units.js';
import { MISSIONS, REGIONS, missionById, nextMission, regionOf, PREMISE, START_ROSTER } from './data/campaign.js';
import * as P from './game/progress.js';
import { loadSprites, loadFx, loadAtlas } from './render/assets.js';
import { createView } from './render/view.js';
import { createDirector } from './render/director.js';
import { createCamp } from './render/camp.js';
import { createOverworld } from './render/overworld.js';
import { arenaFor } from './data/arenas.js';
import { createScenePlayer } from './render/scene.js';
import { OPENING, bossScene } from './data/scenes.js';
import * as E from './game/economy.js';
import { createAudio } from './game/audio.js';
import { createStore } from './game/store.js';
import { $, h, setPortraits, toast, goldIcon, gemIcon, face, fillIcons, setWorld, sprite, matIcon } from './ui/common.js';
import { loadHeroArt, heroArt } from './ui/heroart.js';
import { createHaptics } from './game/haptics.js';
import { VERSION, BUILD } from './version.js';
import { renderCompany } from './ui/company.js';
import { renderMap, renderPrep, renderRewards, drawMarks } from './ui/campaign.js';
import { renderExtras, tip } from './ui/extras.js';
import { renderKeep, LOOK } from './ui/keep.js';
import { renderWheel } from './ui/wheel.js';
import { showBoons, boonRow } from './ui/boons.js';
import { VOICES, CLASS_VOICES, PAIRS } from './data/voices.js';
import * as X from './game/expedition.js';
import { renderExpedition, beginExpedition, abandonExpedition } from './ui/expedition.js';
import { HAZARD_NAMES } from './data/campaign.js';

const DT = 1 / 60, SPEEDS = [1, 2, 3], KEY = 'vael.save', BAK = 'vael.save.bak';
const stage = $('#stage'), bg = $('#bg');
const sprites = {};
let player = null, view = null, director = null, lastEvents = [], drama = {}, camp = null, screen = 'loading', battle = null, missionId = null, acc = 0, last = 0, ended = false, castKey = '', paused = false, slow = 0;

// ---- the save
let hasSave = false;
// the save, and a copy of the last one that loaded cleanly: a damaged save falls back to the copy
function readSave() {
  for (const k of [KEY, BAK]) {
    try {
      const raw = localStorage.getItem(k); if (!raw) continue;
      const data = JSON.parse(raw), s = P.loadSave(data);
      if (data.v === s.v) { hasSave = true; if (k === KEY) localStorage.setItem(BAK, raw); else { localStorage.setItem(KEY, raw); recovered = true; } return s; }
    } catch (e) { /* damaged: try the copy */ }
  }
  return P.newSave();
}
let recovered = false, saveWarned = false;
const game = {
  save: readSave(),
  persist() {
    try { localStorage.setItem(KEY, JSON.stringify(game.save)); hasSave = true; }
    catch (e) { if (!saveWarned) { saveWarned = true; toast('Progress could not be saved on this device (storage is full or blocked)'); } }
  },
  // after anything that changes the save: store it, award achievements, refresh the coin counts
  after() {
    for (const a of E.checkAchievements(game.save)) { toast(`Feat: ${a.name} (+${a.gems} gems)`); game.audio.play('quest_complete'); }
    game.persist(); currency();
  },
  go, from: 'camp', heroic: false,
};
game.audio = createAudio(() => game.save.settings);
game.haptics = createHaptics(() => game.save.settings);
game.store = { available: false, price: (id) => (E.PRODUCTS.find((p) => p.id === id) || {}).price, buy() {}, restore() {} };
function currency() {
  for (const [g, m] of [['#k-gold', '#k-gems'], ['#m-gold', '#m-gems'], ['#x-gold', '#x-gems'], ['#c-gold', null]]) {
    if ($(g)) $(g).replaceChildren(goldIcon(), String(game.save.gold));
    if (m && $(m)) $(m).replaceChildren(gemIcon(), String(game.save.gems));
  }
}

// ---- screens
const SECTIONS = ['title', 'premise', 'camp', 'map', 'prep', 'company', 'extras', 'keep', 'wheel', 'exp'];
function go(name, arg) {
  // the company screen returns to where it was opened from (after a battle: the map)
  if (name === 'company' && screen !== 'company') game.from = screen === 'battle' ? 'map' : screen;
  screen = name; game.screen = name;
  for (const s of SECTIONS) $('#' + s).hidden = s !== name;
  bg.hidden = !['title', 'premise', 'camp', 'keep', 'prep', 'exp'].includes(name);
  stage.hidden = name !== 'battle' && name !== 'scene'; $('#hud').hidden = name !== 'battle';
  $('#result').hidden = true; $('#join').hidden = true; $('#loading').hidden = true; $('#boons').hidden = true;   // a boon left on offer waits for the next fight
  if (name === 'title') renderTitle();
  if (name === 'camp') renderCamp();
  if (name === 'map') { game.ow.resize(); game.ow.setState({ save: game.save }); teamSprites(); renderMap(game, arg); }
  if (name === 'prep') { missionId = arg; renderPrep(game, arg); }
  if (name === 'company') renderCompany(game, arg);
  if (name === 'extras') renderExtras(game, arg);
  if (name === 'keep') renderKeep(game);
  if (name === 'wheel') renderWheel(game, arg || (() => go('camp')));
  if (name === 'exp') renderExpedition(game);
  if (name !== 'prep' && name !== 'battle' && name !== 'exp' && name !== 'scene') game.expNode = null;   // left the road: the next fight is a replay
  if (!bg.hidden) { camp.setFocus(name === 'camp' ? 0.4 : name === 'keep' ? 0.27 : name === 'prep' ? 0.36 : name === 'exp' ? 0.5 : 0.64); game.refreshKeep(); camp.resize(); refreshCast(); }
  game.audio.setScene(name === 'battle' ? (battle && battle.boss ? 'boss' : 'battle') : name === 'title' ? 'title' : 'camp');
  $('#tip').hidden = true;
  // a tip left by the last result comes first, on whatever screen follows it
  const pend = name !== 'battle' && name !== 'scene' && game.pendingTip;
  if (pend) game.pendingTip = null;
  if (pend && tip(game, pend)) return;
  if (name === 'map') tip(game, 'map');
  if (name === 'prep') tip(game, 'prep');
  if (name === 'exp') tip(game, 'exp');
  if (name === 'keep') tip(game, 'keep');
  if (name === 'camp' && Object.keys(game.save.cleared).length >= 2) tip(game, 'extras');
}

function renderTitle() {
  $('#t-version').textContent = 'v' + VERSION;
  $('#t-continue').hidden = !hasSave;
  $('#t-new').classList.toggle('primary', !hasSave);
  $('#t-continue').classList.toggle('primary', hasSave);
}
function renderCamp() {
  const s = game.save, next = nextMission(s.cleared);
  $('#k-gold').replaceChildren(goldIcon(), String(s.gold));
  $('#k-gems').replaceChildren(gemIcon(), String(s.gems));
  const cleared = Object.keys(s.cleared).length;
  const nh = Object.keys(s.roster).length;
  $('#k-region').textContent = `${nh} ${nh === 1 ? 'hero' : 'heroes'} · ${cleared} of ${MISSIONS.length} missions`;
  // after the sixth seal the goal is Heroic: every mission again, harder, for better loot
  const hn = !next && MISSIONS.find((m) => !s.heroic[m.id]), hc = Object.keys(s.heroic).length;
  const stars = Object.values(s.cleared).reduce((a, n) => a + n, 0);
  $('#k-cta-region').textContent = next ? regionOf(next).name : hn ? regionOf(hn).name : 'Vael is reclaimed';
  $('#k-next').textContent = next ? `Next: ${next.name}` : hn ? `${hc} of ${MISSIONS.length} on Heroic · next: ${hn.name}` : `Every mission won on Heroic · ${stars} of ${MISSIONS.length * 3} stars`;
  const run = s.run, rc = $('#k-run');
  if (run && run.exp) { const ex = run.exp; $('#k-cta-region').textContent = REGIONS.find((r) => r.id === ex.region).name; $('#k-next').textContent = `Expedition · step ${ex.at ? X.nodeOf(ex, ex.at).row + 1 : 0} of ${ex.rows}`; }
  if (run) { const d = UNITS[run.leader], f = face(d.set, 30); f.style.setProperty('--c', `var(--${d.cls})`); rc.replaceChildren(f, h('span', null, `${d.name.split(' ')[0]} leads`, h('small', null, `${P.LEADERS[run.leader].name} · ${run.wins} win${run.wins === 1 ? '' : 's'}` + (Object.keys(run.boons).length ? ` · ${Object.keys(run.boons).length} boon${Object.keys(run.boons).length === 1 ? '' : 's'}` : '') + (run.pick ? ' · a boon to choose' : '')))); }
  else rc.replaceChildren(h('span', null, 'No expedition', h('small', null, P.unlocked(s).length > 1 ? 'Begin one from the map: the wheel picks its leader' : 'Begin one from the map')));
  $('#k-go-label').textContent = run && run.exp ? 'Continue expedition' : 'To the map';
  // the long goal: the six seals, one for each region's boss
  const taken = P.sealsTaken(s), nextR = next && next.region;
  // after the sixth seal the card's headline is the Heroic count (phones have no room for the line below the region)
  $('#k-goal').textContent = next ? 'Reclaim Vael' : 'Heroic Vael';
  $('#k-seal-count').textContent = next ? `${taken.length} of ${REGIONS.length} seals` : `${hc} of ${MISSIONS.length} won`;
  $('#k-seals').replaceChildren(...REGIONS.map((r, i) => h('span.seal' + (taken.includes(r.id) ? '.on' : r.id === nextR ? '.next' : ''), { title: `${r.name}: ${taken.includes(r.id) ? 'seal taken' : 'its boss guards a seal'}` }, ['I', 'II', 'III', 'IV', 'V', 'VI'][i])));
  // the Stronghold: its rank and the next thing to build
  const nb = P.nextBuild(s), ready = P.KEEP.some((b) => P.buildState(s, b.id) === 'ok');
  $('#k-keep-rank').textContent = `Rank ${P.keepRank(s)} ${P.rankName(s)}`;
  $('#k-keep-dot').hidden = $('#k-keep-dot2').hidden = !ready;
  if (nb) {
    const l = P.keepLevel(s, nb.id) + 1, c = P.keepCost(l), have = s.mats[c.mat] || 0;
    $('#k-keep-art').replaceChildren(sprite(LOOK[nb.id], 2));
    $('#k-keep-next').textContent = `${ready ? 'Build' : 'Next'}: ${nb.name}${l > 1 ? ' level ' + l : ''}`;
    $('#k-keep-cost').replaceChildren(h('span' + (s.gold >= c.gold ? '' : '.short'), null, goldIcon(), String(c.gold)), h('span' + (have >= c.n ? '' : '.short'), null, matIcon(c.mat), `${have}/${c.n} ${P.MATS[c.mat]}`));
  } else {
    $('#k-keep-art').replaceChildren(sprite('cd_banner_red', 2));
    $('#k-keep-next').textContent = P.keepRank(s) >= 36 ? 'The Citadel stands' : 'Reach a new region for new materials';
    $('#k-keep-cost').replaceChildren();
  }
  const pend = Object.keys(s.roster).some((k) => P.pendingUpgrade(s, k) >= 0);
  $('#k-company-dot').hidden = !pend;
  $('#k-bounty-dot').hidden = !E.bountiesReady(s);
  $('#k-banner').hidden = !E.owns(s, 'vael.supporter');

}

// the campfire shows whoever has joined (before a game starts, the first hero); on the team screen, the team
async function refreshCast() {
  // the team first, then others, ten at most around one fire
  const s = game.save, keys = screen === 'title' && !hasSave ? START_ROSTER : screen === 'prep' ? s.team.map((t) => t.key)
    : [...s.team.map((t) => t.key), ...Object.keys(s.roster).filter((k) => !s.team.some((t) => t.key === k))].slice(0, 10);
  const sets = keys.map((k) => UNITS[k].set), key = keys.join();
  if (key === castKey) return; castKey = key;
  const need = sets.filter((s) => !sprites[s]);
  if (need.length) Object.assign(sprites, await loadSprites(need));
  if (castKey === key) camp.setCast(keys.map((k) => ({ set: sprites[UNITS[k].set], cls: UNITS[k].cls })));
}
game.refreshCast = () => { if (!bg.hidden) refreshCast(); };

// the team walking the overworld: their sprites, loaded once
async function teamSprites() {
  const sets = game.save.team.map((t) => UNITS[t.key].set), need = sets.filter((x) => !sprites[x]);
  if (need.length) Object.assign(sprites, await loadSprites(need));
  game.ow.setState({ team: sets.map((x) => sprites[x]) });
}

// ---- filmed scenes: the cast's sprites load first; the stage canvas shows the scene
async function playScene(sc) {
  const need = [...new Set(Object.values(sc.cast).map((c) => c.set))].filter((x) => !sprites[x]);
  if (game.save.settings.scenes === false) return;   // Settings: story scenes off
  if (need.length) { loading('Loading…'); Object.assign(sprites, await loadSprites(need)); $('#loading').hidden = true; }
  const back = screen; go('scene');
  game.audio.setScene('camp');
  await player.play(sc, sprites);
  void back;
}
game.playScene = playScene;

// ---- the battle
function setsFor(team, foes) {
  const defs = [...team.map((t) => UNITS[t.key]), ...foes.map(([k]) => ENEMIES[k])];
  const out = new Set(defs.map((d) => d.set));
  for (const d of defs) for (const e of d.ability ? d.ability.effects : []) if (e.type === 'summon') out.add(SUMMONS[e.key].set);
  return [...out];
}
async function fight() {
  const s = game.save, m = missionById(missionId);
  const node = s.run && s.run.exp && game.expNode ? X.nodeOf(s.run.exp, game.expNode) : null;
  if (s.run && !node) { toast('The company is on an expedition: finish it or turn back first'); go('exp'); return; }
  if (!s.team.length) { toast('Pick at least one hero'); return; }
  if (s.run && s.run.pick) { showBoons(game, fight); return; }   // a boon still on offer: taken before the next fight
  loading('Marching out…');
  const need = setsFor(s.team, m.foes.concat(...(m.waves || []))).filter((x) => !sprites[x]);
  try { Object.assign(sprites, await loadSprites(need)); } catch (e) { loading('Could not load the art. Check the connection and try again.', true); return; }
  // a boss's first meeting: the face-off, then the fight in the same place
  if (m.boss && !game.heroic && !s.flags['met_' + m.id]) { s.flags['met_' + m.id] = true; game.persist(); await playScene(bossScene(m, s.team.map((t) => t.key))); }
  let spec = P.battleSpec(m, game.heroic);
  if (node) spec = X.fightSpec(s.run.exp, node.type === 'event' ? { type: 'elite' } : node, spec);
  battle = createBattle(Object.assign({}, spec, { team: P.teamFor(s), boons: P.boonsOf(s), seed: (Math.random() * 1e9) | 0 }));
  // on the road, wounds come along
  if (node) for (const u of battle.units) if (u.team === 'ally' && !u.ward && !u.summoned) u.hp = Math.max(1, Math.round(u.max * X.hpOf(s, u.key)));
  battle.node = node;
  battle.theme = m.theme; battle.arena = arenaFor(m);
  battle.manual = game.save.settings.auto === false;
  view.setSprites(sprites); view.reset();
  buildAllies();
  $('#wavename').textContent = m.name + (game.heroic ? ' · Heroic' : '');
  const boss = battle.units.find((u) => u.team === 'foe' && u.def.boss);
  $('#bossbar').hidden = !boss; battle.boss = boss || null;
  if (boss) $('#boss-name').textContent = boss.def.name;
  $('#hud-boons').replaceChildren(...boonRow(game, 18));
  setAuto(game.save.settings.auto !== false);
  game.audio.play('unsheathe_01');
  go('battle'); view.resize();
  combo.n = 0; combo.best = 0; $('#combo').hidden = true;
  talk.cd = 0; talk.low.clear(); talk.queue = []; for (const l of talk.list) l.el.remove(); talk.list = [];
  acc = 0; ended = false; paused = false; slow = 0; lastEvents = []; $('#paused').hidden = true; $('#cutin').replaceChildren(); $('#danger').hidden = true;
  drama = { allies: battle.units.filter((u) => u.team === 'ally' && !u.ward).length, foes: battle.units.filter((u) => u.team === 'foe').length, m };
  // the start, filmed: a fight fought before gets the short version
  director.start(battle, { quick: !!s.cleared[m.id] || !!game.heroic });
  $('#hud').classList.add('intro');
}
// the director's cues: the faces of both sides, the company's turn, then FIGHT
function onCue(c) {
  const m = drama.m;
  if (c === 'vs') {
    const side = (team, cls) => h('div.side.' + cls, null, ...battle.units.filter((u) => u.team === team && !u.summoned).map((u) => { const f = face(u.def.set, 54); if (u.team === 'ally') f.style.setProperty('--c', `var(--${u.def.cls})`); return f; }));
    $('#vs').replaceChildren(side('ally', 'a'), h('div.mid', null, h('b', null, 'VS'), h('span', null, m.name + (game.heroic ? ' · Heroic' : '')), battle.boss && !m.name.includes(battle.boss.def.name) && !battle.boss.def.name.includes(m.name) ? h('small', null, battle.boss.def.name) : null), side('foe', 'f'));
    $('#vs').classList.remove('out'); $('#vs').hidden = false;
    game.audio.play('whoosh', { gain: 0.8 }); game.audio.play('unsheathe_01', { gain: 0.6 });
    if (battle.boss) { view.shake(4); game.audio.play('quake', { gain: 0.6 }); }
  } else if (c === 'heroes') { game.audio.play('charge', { gain: 0.6 }); game.haptics.buzz('tap'); }
  else if (c === 'fight') {
    $('#vs').classList.add('out'); setTimeout(() => ($('#vs').hidden = true), 400);
    banner({ waves: 'Hold the line!', protect: 'Protect it!', hunt: 'Hunt!', ambush: 'Ambush!' }[battle.kind] || (battle.boss ? 'Boss fight' : 'Fight!'), 'fight');
    view.spawn('shockwave', 0, 0, 0.05, { add: true, ground: true, scale: 3.2 }); view.flash(0.45, '255,236,200'); view.shake(6);
    game.audio.play('horn', { gain: 0.9 }); game.audio.play('allout', { gain: 0.6 }); game.haptics.buzz('big');
  } else if (c === 'go') { $('#hud').classList.remove('intro'); tip(game, 'battle'); openingLines(); }
}
// a word across the field at the start and the end
function banner(text, cls = '') { const b = $('#banner'); b.textContent = text; b.className = cls; b.hidden = false; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(banner.t); banner.t = setTimeout(() => (b.hidden = true), 1100); }
// Auto: abilities fire on their own; off: the player taps a ready hero's card
function setAuto(on) {
  game.save.settings.auto = on; $('#auto').setAttribute('aria-pressed', String(on)); $('#auto').textContent = on ? 'Auto' : 'Manual';
  $('#hud').classList.toggle('manual', !on); if (battle) battle.manual = !on;
}
// a hero's ability: their art slides in with its name
function cutIn(u) {
  const box = $('#cutin'); if (box.children.length >= 2) box.firstChild.remove();
  const el = h('div.cut' + (u.team === 'foe' ? '.foe' : ''), { vars: u.team === 'ally' ? { '--c': `var(--${u.def.cls})` } : {} }, heroArt(u.def.set, 2, { shadow: false }), h('div', null, h('small', null, u.def.name.split(' ')[0]), h('b', null, u.def.ability.name)));
  box.append(el); setTimeout(() => el.remove(), 1300);
}
function pause(on) {
  if (screen !== 'battle' || !battle || battle.result) on = false;
  paused = on; $('#paused').hidden = !on; last = 0; if (on) $('#tip').hidden = true;
}
function buildAllies() {
  const el = $('#allies'); el.replaceChildren();
  for (const u of battle.units.filter((u) => u.team === 'ally' && !u.ward)) {
    const f = face(u.def.set, 30); f.style.setProperty('--c', `var(--${u.def.cls})`);
    const c = h('div.chip', { role: 'button', 'aria-label': `${u.def.name}: ${u.def.ability.name}`, onclick: () => {
      if (!battle.manual || !trigger(battle, u.id)) return;
      c.classList.add('armed'); game.audio.play('unsheathe_01', { gain: 0.5 }); game.haptics.buzz('hit');
    } }, game.save.run && u.key === game.save.run.leader ? h('span.crown') : null, f, h('div.ci', null, h('span.nm', null, u.def.name.split(' ')[0]), h('div.bar', null, h('i.hp'), h('i.sh')), h('div.bar.en', null, h('i'))));
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
    c.classList.toggle('down', u.state === 'ko'); c.classList.toggle('ready', u.energy >= 100 && u.state !== 'ko' && !u.fire);
    if (u.energy < 100 || u.state === 'ko') c.classList.remove('armed');
  }
  if (battle.boss) $('#boss-hp').style.width = `${Math.max(0, battle.boss.hp / battle.boss.max) * 100}%`;
  // the tug of war: each side's share of the health still standing; the edges pulse when the company is nearly down
  const side = (team) => { let hp = 0, max = 0; for (const u of battle.units) if (u.team === team && !u.summoned && !u.ward) { hp += Math.max(0, u.hp); max += u.max; } return max ? hp / max : 0; };
  const a = side('ally'), f = side('foe'), sum = Math.max(0.0001, a + f);
  $('#tug .a').style.width = `${(a / sum) * 100}%`; $('#tug .f').style.width = `${(f / sum) * 100}%`;
  $('#danger').hidden = !(a < 0.3 && a > 0 && !battle.result);
  // the last of a side: called out once
  const up = (team) => battle.units.filter((u) => u.team === team && !u.summoned && !u.ward && u.state !== 'ko').length;
  if (!battle.result && !drama.last && drama.allies > 1 && up('ally') === 1) { drama.last = true; banner('Last stand'); }
  else if (!battle.result && !drama.one && drama.foes > 1 && up('foe') === 1) { drama.one = true; banner('One left!'); }
  $('#clock').textContent = `${Math.max(0, Math.ceil(battle.limit - battle.t))} s` + (battle.t > FURY ? ` · Fury ×${fury(battle).toFixed(1)}` : '');
  $('#clock').classList.toggle('fury', battle.t > FURY || battle.limit - battle.t < 10);
  // the job, live: the wave, the ward's health, the target
  const B = battle, hz = B.hazard ? HAZARD_NAMES[B.hazard] : null;
  const job = { waves: `Wave ${B.waveN} of ${B.waveOf}`, protect: B.ward && `${B.ward.def.name} ${Math.max(0, Math.round((B.ward.hp / B.ward.max) * 100))}%`, hunt: B.mark && (B.mark.state === 'ko' ? 'Target down' : 'Kill the target'), ambush: 'Ambush' }[B.kind];
  const text = [job, hz].filter(Boolean).join(' · ');
  $('#job').hidden = !text; if ($('#job').textContent !== text) $('#job').textContent = text;
  $('#job').classList.toggle('warn', B.kind === 'protect' && B.ward && B.ward.hp < B.ward.max * 0.35);
}
// ---- the heroes talk: a line beside the speaker at the moments that matter (data/voices.js)
const talk = { cd: 0, low: new Set(), list: [], queue: [] };
const pickLine = (u, moment) => { const v = (VOICES[u.key] && VOICES[u.key][moment]) || (CLASS_VOICES[u.def.cls] || {})[moment]; return v && v[Math.floor(Math.random() * v.length)]; };
const heroesUp = () => battle.units.filter((u) => u.team === 'ally' && !u.summoned && !u.ward && u.state !== 'ko');
function say(u, text, delay = 0) {
  if (!u || !text) return;
  if (delay) { talk.queue.push({ u, text, at: delay }); return; }
  const el = h('div.say', { vars: { '--c': `var(--${u.def.cls})` } }, h('small', null, u.def.name.split(' ')[0]), h('span', null, text));
  $('#says').append(el); talk.list.push({ u, el, t: 0, life: 1.6 + text.length * 0.045 });
  talk.cd = 2.6;
}
// when the fight starts: two heroes trading words, or the leader's call
function openingLines() {
  const up = heroesUp(), has = (k) => up.find((u) => u.key === k);
  const pairs = PAIRS.filter(([a, b]) => has(a) && has(b));
  if (!up.length || battle.result) return;
  if (pairs.length && Math.random() < 0.45) { const [a, b, la, lb] = pairs[Math.floor(Math.random() * pairs.length)]; say(has(a), la); say(has(b), lb, 1.7); return; }
  const lead = (game.save.run && has(game.save.run.leader)) || up[0];
  if (lead && !battle.result) say(lead, pickLine(lead, battle.boss ? 'boss' : 'start'));
}
function talkTick(events, dt) {
  if (!battle) return;
  talk.cd -= dt;
  for (const q of talk.queue) q.at -= dt;
  for (const q of talk.queue.filter((q) => q.at <= 0)) say(q.u, q.text);
  talk.queue = talk.queue.filter((q) => q.at > 0);
  const U = (id) => battle.units.find((x) => x.id === id), hero = (u) => u && u.team === 'ally' && !u.summoned && !u.ward;
  if (!$('#hud').classList.contains('intro')) for (const e of events) {
    const u = e.u && U(e.u);
    if (e.type === 'cast' && hero(u) && talk.cd <= 0 && Math.random() < 0.35) say(u, pickLine(u, 'ability'));
    else if (e.type === 'ko' && hero(u)) { const others = heroesUp(); const o = others[Math.floor(Math.random() * others.length)]; if (o) say(o, pickLine(o, 'fallen')); }
    else if (e.type === 'ko' && u && u.team === 'foe' && (u.def.boss || u.elite)) {
      const blow = events.filter((x) => x.type === 'hit' && x.u === u.id && x.src).pop(), k = blow && U(blow.src);
      if (hero(k) && k.state !== 'ko') say(k, pickLine(k, 'kill'));
    } else if (e.type === 'proc' && e.boon === 'secondwind' && hero(u)) say(u, pickLine(u, 'revive'));
    else if (e.type === 'end' && e.result === 'win') { const up = heroesUp(); const w = up[Math.floor(Math.random() * up.length)]; if (w) { talk.cd = 0; say(w, pickLine(w, 'win')); } }
  }
  if (talk.cd <= 0) for (const u of heroesUp()) if (!talk.low.has(u.id) && u.hp < u.max * 0.25) { talk.low.add(u.id); say(u, pickLine(u, 'low')); break; }
  // the lines follow their speakers, then fade
  talk.list = talk.list.filter((l) => {
    l.t += dt;
    if (l.t > l.life || l.u.state === 'ko' && l.t > 0.6) { l.el.remove(); return false; }
    // kept on the screen: clear of the edges and below the bar at the top
    const p = view.project(l.u.x, l.u.y, 3.1), w = l.el.offsetWidth, hh = l.el.offsetHeight;
    const x = Math.max(w / 2 + 8, Math.min(innerWidth - w / 2 - 8, p.x)), y = Math.max(hh + 52, Math.min(innerHeight - 70, p.y));
    l.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -100%)`;
    l.el.style.opacity = String(Math.min(1, (l.life - l.t) / 0.3, l.t / 0.12));
    return true;
  });
}
// the company's combo: hits landing one after another, counted until the blows stop for a moment
const combo = { n: 0, idle: 0, best: 0 };
function comboTick(events, dt) {
  const el = $('#combo'); let hit = false;
  for (const e of events) {
    if (e.type !== 'hit' || e.dot) continue;
    const src = e.src && battle.units.find((u) => u.id === e.src);
    if (src && src.team === 'ally' && !src.ward) { combo.n++; hit = true; }
  }
  if (hit) {
    combo.idle = 0; combo.best = Math.max(combo.best, combo.n);
    if (combo.n >= 5) {
      el.hidden = false; el.classList.remove('fade', 'pop'); void el.offsetWidth; el.classList.add('pop');
      el.querySelector('b').textContent = combo.n;
      const big = combo.n >= 25; el.classList.toggle('big', big);
      if ([10, 25, 50, 100].includes(combo.n)) { game.audio.play('coin_01', { gain: 0.5, vary: 0 }); view.shake(2); }
    }
  } else if (combo.n) {
    combo.idle += dt;
    if (combo.idle > 1.6) { combo.n = 0; el.classList.add('fade'); setTimeout(() => { if (!combo.n) el.hidden = true; }, 400); }
  }
}
function finish() {
  if (screen !== 'battle' || !battle) return;
  const s0 = game.save, node = battle.node;
  const rw = P.grantRewards(game.save, missionId, battle, Math.random, !!game.heroic);
  // on the road: the place is passed, the wounds carried on; an elite or an ambush pays extra
  if (node && rw.win) {
    if (node.type !== 'event' && s0.run) X.enter(s0, node.id);   // (a boss's Seal has already ended the run)
    if (s0.run && s0.run.exp) { X.complete(s0, node.id); X.afterFight(s0, battle); }
    if (node.type === 'elite' || node.type === 'event') rw.loot.push(X.eliteSpoils(s0, node, Math.random));
    rw.exp = true;
  }
  if (node && !rw.win) rw.exp = true;
  game.expNode = null;
  game.haptics.buzz(rw.win ? 'big' : 'hit');
  renderRewards(game, battle, rw, missionId);
  game.after();   // after the result is up, so a feat's news lands in its card
  if (rw.xp.some((x) => x.to > x.from)) game.audio.play('level_up');
  else if (rw.win) game.audio.play('coin_01');
  // the tips a result can bring, shown on the next screen so they never cover the result
  const s = game.save;
  game.pendingTip = !rw.win ? 'lose' : rw.loot.length && !(s.flags || {}).tip_loot ? 'loot' : Object.keys(s.roster).some((k) => P.pendingUpgrade(s, k) >= 0) ? 'upgrade' : null;
}

// ---- the loop
function frame(now) {
  requestAnimationFrame(frame);   // first, so one bad frame never stops the game
  const real = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  if (screen === 'battle' && battle && (paused || !$('#tip').hidden)) { /* the picture holds while paused, or while a tip is read */ }
  else if (screen === 'battle' && battle) {
    // the director: the intro, the camera, and slow time for the big moments (the last blow most of all)
    const d = director.update(real, lastEvents); for (const c of d.cues) onCue(c);
    battle.camera = director.camera;
    const speed = (game.save.speed || 1) * (slow > 0 ? 0.3 : 1) * d.scale; if (slow > 0) slow -= real;
    acc += real * speed;
    let events = [];
    while (acc >= DT) { step(battle, DT); events = events.concat(battle.events); acc -= DT; }
    for (const e of events) if (e.type === 'cast') { const u = battle.units.find((x) => x.id === e.u); if (u && u.def.ability && !u.summoned && (u.team === 'ally' || u.def.boss)) cutIn(u); }
    const end = events.find((e) => e.type === 'end');
    if (!ended && end) {
      ended = true; slow = 1.4; banner(end.result === 'win' ? 'Victory' : 'Defeat', end.result === 'win' ? 'fight' : '');
      const lastKo = events.filter((e) => e.type === 'ko').map((e) => battle.units.find((x) => x.id === e.u)).pop(); director.slowFinal(lastKo);
      $('#danger').hidden = true; setTimeout(finish, 2200);
    }
    battle.events = events; lastEvents = events;
    for (const e of events) if (e.type === 'wave') { banner(`Wave ${e.n} of ${e.of}`, 'fight'); view.shake(4); game.haptics.buzz('hit'); }
    comboTick(events, real);
    talkTick(events, real);
    game.audio.battleEvents(battle);
    view.draw(battle, real * speed);
    battle.events = [];
    updateHud();
  } else if (screen === 'map') { game.ow.draw(real); drawMarks(game); }
  else if (!bg.hidden) camp.draw(real);
}

// ---- buttons
// a tap during a fight's intro cuts straight to the fight
stage.addEventListener('pointerdown', () => { if (screen === 'battle' && director && director.playing) director.skip(); });
$('#t-continue').addEventListener('click', () => go('camp'));
$('#t-new').addEventListener('click', () => {
  if (hasSave && $('#t-confirm').hidden) { $('#t-confirm').hidden = false; return; }
  newGame();
});
$('#t-confirm-yes').addEventListener('click', newGame);
$('#t-confirm-no').addEventListener('click', () => ($('#t-confirm').hidden = true));
function newGame() { $('#t-confirm').hidden = true; game.save = P.newSave(); game.persist(); castKey = ''; playScene(OPENING).then(() => go('camp')); }
$('#premise-go').addEventListener('click', () => go('camp'));
$('#k-campaign').addEventListener('click', () => (game.save.run && game.save.run.exp ? go('exp') : go('map')));
// a run needs a leader: the wheel picks one, but with one hero on it there is nothing to spin for
game.needRun = (then) => {
  if (game.save.run) return then();
  if (P.unlocked(game.save).length < 2) { P.spin(game.save, Math.random); game.persist(); return then(); }
  go('wheel', then);
};
$('#k-keep').addEventListener('click', () => go('keep'));
$('#e-back').addEventListener('click', () => go('camp'));
$('#e-heroes').addEventListener('click', () => go('company'));
$('#e-abandon').addEventListener('click', () => { $('#e-confirm').hidden = false; });
$('#e-confirm-no').addEventListener('click', () => { $('#e-confirm').hidden = true; });
$('#e-confirm-yes').addEventListener('click', () => { $('#e-confirm').hidden = true; abandonExpedition(game); });
game.beginExpedition = (rid) => beginExpedition(game, rid);
$('#k-keep2').addEventListener('click', () => go('keep'));
$('#s-back').addEventListener('click', () => go('camp'));
game.refreshKeep = () => camp && camp.setKeep(game.save.keep || {}, P.keepRank(game.save));
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
  for (const [id, key] of [['#set-shake', 'shake'], ['#set-auto', 'auto'], ['#set-scenes', 'scenes'], ['#set-haptics', 'haptics']]) { const on = st[key] !== false; $(id).setAttribute('aria-pressed', String(on)); $(id).textContent = on ? 'On' : 'Off'; }
  $('#set-version').textContent = `Vael ${VERSION} (build ${BUILD})`;
  $('#settings').hidden = false; $('#reset-confirm').hidden = true; $('#save-box').hidden = true;
}
for (const b of document.querySelectorAll('.open-settings')) b.addEventListener('click', openSettings);
$('#set-close').addEventListener('click', () => ($('#settings').hidden = true));
for (const [id, key] of [['#set-music', 'music'], ['#set-sfx', 'sfx']]) $(id).addEventListener('input', (e) => { game.save.settings[key] = +e.target.value / 100; game.audio.setVolumes(); game.persist(); });
for (const [id, key] of [['#set-shake', 'shake'], ['#set-auto', 'auto'], ['#set-scenes', 'scenes'], ['#set-haptics', 'haptics']]) {
  $(id).addEventListener('click', () => { const st = game.save.settings; st[key] = st[key] === false; game.persist(); openSettings(); if (key === 'auto' && battle) setAuto(st.auto); if (key === 'haptics') game.haptics.buzz('tap'); });
}
$('#set-export').addEventListener('click', async () => {
  // copied straight away; the code itself only shows when the clipboard is not available
  const code = P.encodeSave(game.save); $('#save-code').value = code;
  try { await navigator.clipboard.writeText(code); $('#save-box').hidden = true; toast('Save code copied'); } catch (e) { $('#save-box').hidden = false; $('#save-code').select(); toast('Copy the code from the box'); }
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
$('#p-back').addEventListener('click', () => (game.expNode ? go('exp') : go('map', missionId)));
$('#p-company').addEventListener('click', () => go('company'));
$('#p-fight').addEventListener('click', fight);
$('#p-best').addEventListener('click', () => { P.bestTeam(game.save); P.autoEquip(game.save); game.persist(); renderPrep(game, missionId); toast('The strongest five, best gear on'); });
$('#p-equip').addEventListener('click', () => { const n = P.autoEquip(game.save); game.persist(); renderPrep(game, missionId); if (n) game.audio.play('equip_armor_01'); toast(n ? `${n} piece${n > 1 ? 's' : ''} of gear equipped` : 'Already wearing the best'); });
$('#c-back').addEventListener('click', () => go(game.from || 'camp', game.from === 'prep' ? missionId : undefined));
$('#leave').addEventListener('click', () => { pause(false); battle = null; go('prep', missionId); });
$('#pause').addEventListener('click', () => pause(true));
$('#resume').addEventListener('click', () => pause(false));
$('#auto').addEventListener('click', () => { setAuto(!(game.save.settings.auto !== false)); game.persist(); toast(game.save.settings.auto ? 'Auto: abilities fire on their own' : 'Manual: tap a glowing hero to fire their ability'); });
// the game stops when it is not seen (the app in the background, another tab)
document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'battle' && battle && !battle.result) pause(true); });   // (the sound stops itself: game/audio.js)
$('#speed').addEventListener('click', () => {
  game.save.speed = SPEEDS[(SPEEDS.indexOf(game.save.speed) + 1) % SPEEDS.length] || 1; game.persist();
  $('#speed').textContent = game.save.speed + '×';
});
window.addEventListener('resize', () => { if (screen === 'battle') view.resize(); else if (!bg.hidden) camp.resize(); if (screen === 'map') game.ow.resize(); });

// the loading screen: a line of text and a bar (step / of); 'failed' adds a Reload button
function loading(text, failed = false, step = 0, of = 0) {
  const el = $('#loading'); el.hidden = false; $('#ld-text').textContent = text;
  $('#ld-bar').style.width = of ? `${(step / of) * 100}%` : '100%'; $('#ld-bar').parentNode.hidden = failed;
  $('#ld-retry').hidden = !failed;
}
async function boot() {
  let done = 0; const tick = (x) => { done++; loading('Loading…', false, done, 6); return x; };
  loading('Loading…', false, 0, 6);
  const [p, fx, tiles, world] = await Promise.all([fetch('assets/portraits.json').then((r) => r.json()).then(tick), loadFx().then(tick), loadAtlas('tiles').then(tick), loadAtlas('world').then(tick),
    new Promise((ok) => { const i = new Image(); i.onload = ok; i.onerror = ok; i.src = 'assets/portraits.png'; }).then(tick)]);
  setPortraits(Object.assign(p, { w: 256, h: Math.ceil(Object.keys(p.sets).length / 8) * p.cell }));
  game.fxAtlas = fx;
  await loadHeroArt(); tick();
  fillIcons();
  setWorld(world);
  view = createView(stage, fx, tiles, () => game.save.settings, world); director = createDirector(view); camp = createCamp(bg, fx, world);
  game.ow = createOverworld($('#world'), { world, tiles, fx });
  player = createScenePlayer({ view, root: $('#scene'), audio: game.audio });
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
  if (recovered) toast('Your last save was damaged: the copy before it was restored');
  requestAnimationFrame(frame);
}

// ---- something went wrong: say so, and offer a reload (progress is saved after every change)
let crashed = false;
function crash(e) {
  if (crashed || !e) return; crashed = true;
  const el = $('#crash'); el.hidden = false; $('#crash-msg').textContent = String(e.message || e).slice(0, 160);
}
window.addEventListener('error', (e) => crash(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => crash(e.reason));
$('#crash-reload').addEventListener('click', () => location.reload());
$('#crash-close').addEventListener('click', () => { $('#crash').hidden = true; crashed = false; });
$('#ld-retry').addEventListener('click', () => location.reload());

// ---- Android's back button: closes what is on top, pauses a battle, goes back a screen, leaves from the title
function back() {
  if (!$('#settings').hidden) { $('#settings').hidden = true; return; }
  if (!$('#crash').hidden) { $('#crash').hidden = true; return; }
  if (!$('#tip').hidden) { $('#tip').hidden = true; return; }
  if (screen === 'scene') { $('#sc-skip').click(); return; }
  if (!$('#result').hidden || !$('#join').hidden) return;   // the result needs its own buttons
  if (screen === 'battle') { pause(!paused); return; }
  if (screen === 'wheel') return;   // the wheel decides; no way round it
  const btn = { map: '#m-back', prep: '#p-back', company: '#c-back', extras: '#x-back', keep: '#s-back', camp: '#k-title', exp: '#e-back' }[screen];
  if (btn) { $(btn).click(); return; }
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (screen === 'title' && App) App.exitApp();
}
const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
if (CapApp) CapApp.addListener('backButton', back);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') back(); });

// for the tests: the game, the screens, and a way to run a battle to its end at once
window.__v2 = { game, spin() { if (!game.save.run) P.spin(game.save, Math.random); game.persist(); }, get battle() { return battle; }, get screen() { return screen; }, go, fight, finish, play(id) { missionId = id; return fight(); }, startExp(rid, seed) { P.startExpedition(game.save, rid, () => (seed * 0.0137) % 1); game.persist(); }, missions: MISSIONS.map((m) => m.id),
  pickUpgrades() { const s = game.save; for (const k of Object.keys(s.roster)) s.roster[k].ups.forEach((u, t) => { if (!u && s.roster[k].level >= P.UPGRADE_LEVELS[t]) P.pickUpgrade(s, k, t, P.upgradeChoices(k, t)[0].id); }); game.persist(); },
  skip() { if (!battle) return; if (director.playing) director.skip(); while (!battle.result) step(battle, DT); if (!ended) { ended = true; setTimeout(finish, 200); } } };
boot().catch((e) => { loading('Vael could not start: ' + e.message, true); });
