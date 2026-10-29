// The campaign: the world map (render/overworld.js) with markers over the missions and the mission
// card beside it, the formation before a battle, the rewards after one, and the new recruit's reveal.
import { UNITS, ENEMIES, CLASSES } from '../data/units.js';
import { MISSIONS, REGIONS, REGION_END, missionById, missionsIn, isOpen, nextMission, regionOpen, regionCleared, jobOf, HAZARD_NAMES } from '../data/campaign.js';
import { AFFIXES } from '../combat/battle.js';
import { showBoons, boonRow } from './boons.js';
import { itemStats, itemName, statText } from '../data/items.js';
import * as P from '../game/progress.js';
import { joinScene, arrivalScene } from '../data/scenes.js';
import { $, h, face, itemTile, tierColor, toast, goldIcon, gemIcon, icon, matIcon } from './common.js';
import { heroArt, artPx } from './heroart.js';

export { gemIcon };
const clsVar = (cls) => `var(--${cls})`;
const stars = (n, of = 3) => h('span.stars', { 'aria-label': `${n} of ${of} stars` }, ...Array.from({ length: of }, (_, i) => h('i' + (i < n ? '.on' : ''))));
const first = (name) => name.split(' ')[0];

// ---- the map: the world, markers over the open missions, the card at the right
let picked = null, regionId = null;
export let heroicMode = false;
export function renderMap(game, focusId) {
  const s = game.save, next = nextMission(s.cleared), ow = game.ow;
  // the map opens on the next mission unless one is asked for
  const focus = focusId && missionById(focusId) && isOpen(s.cleared, missionById(focusId)) ? missionById(focusId) : null;
  const target = focus || (picked && isOpen(s.cleared, missionById(picked)) && missionById(picked)) || next || MISSIONS[MISSIONS.length - 1];
  picked = target.id; regionId = target.region;
  $('#m-gold').replaceChildren(goldIcon(), String(s.gold));
  $('#m-gems').replaceChildren(gemIcon(), String(s.gems));
  ow.onPick = (id) => { picked = id; regionId = missionById(id).region; s.flags.at = id; game.persist(); header(game); renderSheet(game, missionById(id), regionCleared(s.cleared, regionId)); };
  const sheetW = $('#m-sheet').getBoundingClientRect().width, W = $('#map').getBoundingClientRect().width || 1;
  ow.setPad(Math.min(0.5, (sheetW + 24) / W));
  ow.focus(picked, false);
  header(game);
  renderSheet(game, target, regionCleared(s.cleared, regionId));
}
// the markers follow the map every frame (called from the main loop)
const markEls = new Map();
export function drawMarks(game) {
  const s = game.save, layer = $('#m-marks'), next = nextMission(s.cleared), seen = new Set();
  for (const mk of game.ow.marks()) {
    const m = mk.m, done = (heroicMode ? s.heroic : s.cleared)[m.id] || 0;
    let el = markEls.get(m.id);
    if (!el) {
      el = h('button.mark', { type: 'button', 'aria-label': m.name, onclick: () => game.ow.pick(m.id) });
      layer.append(el); markEls.set(m.id, el); el._k = '';
    }
    const key = [done, m.id === picked, next && next.id === m.id, heroicMode].join();
    if (el._k !== key) {
      el._k = key;
      const n = missionsIn(m.region).indexOf(m) + 1;
      el.className = 'mark' + (done ? ' done' : '') + (m.boss ? ' boss' : '') + (m.id === picked ? ' on' : '') + (next && next.id === m.id && !done ? ' next' : '');
      el.replaceChildren(...[h('b', null, m.boss ? icon('skull', 18) : String(n)), done ? stars(done) : null, m.id === picked ? h('span', null, m.name) : null].filter(Boolean));
    }
    el.style.left = mk.x + 'px'; el.style.top = mk.y + 'px'; el.hidden = false;
    seen.add(m.id);
  }
  for (const [id, el] of markEls) if (!seen.has(id)) el.hidden = true;
}
// the region named at the top, with arrows to look at the one before or after
function header(game) {
  const s = game.save, region = REGIONS.find((r) => r.id === regionId), ri = REGIONS.indexOf(region);
  if (!regionCleared(s.cleared, region.id)) heroicMode = false;
  $('#m-title').textContent = region.name;
  $('#m-region').textContent = `Region ${ri + 1} of ${REGIONS.length}`;
  $('#m-prev').disabled = ri === 0;
  $('#m-next').disabled = ri === REGIONS.length - 1 || !regionOpen(s.cleared, REGIONS[ri + 1].id);
  const go = (r) => { const ms = missionsIn(r.id), m = ms.find((x) => !s.cleared[x.id] && isOpen(s.cleared, x)) || ms[ms.length - 1]; picked = m.id; regionId = r.id; game.ow.focus(m.id, false); header(game); renderSheet(game, m, regionCleared(s.cleared, r.id)); };
  $('#m-prev').onclick = () => go(REGIONS[ri - 1]);
  $('#m-next').onclick = () => go(REGIONS[ri + 1]);
  $('#m-field').classList.toggle('heroic', heroicMode);
}

// the job and its twists: what to do, the elites' traits, the hazard
export function jobChips(m) {
  const list = [jobOf(m) && h('span.jobchip', null, jobOf(m)), ...m.elites.map(([, a]) => h('span.jobchip.elite', { title: 'An elite foe: more health and attack, and this trait' }, `Elite: ${AFFIXES[a].name}`)),
    m.hazard && h('span.jobchip.hz', { title: 'Strikes the field; a warning ring shows where' }, HAZARD_NAMES[m.hazard])].filter(Boolean);
  return list.length ? h('div.jobs', null, ...list) : null;
}
const reward = (iconEl, text, cls = '') => h('span.rw' + cls, null, iconEl, h('span', null, text));
function renderSheet(game, m, regionDone) {
  const s = game.save, sheet = $('#m-sheet'), H = heroicMode, book = H ? s.heroic : s.cleared, done = book[m.id] || 0;
  const spec = P.battleSpec(m, H);
  const foes = {}; for (const [k] of m.foes) foes[k] = (foes[k] || 0) + 1;
  const n = missionsIn(m.region).indexOf(m) + 1;
  const body = h('div.sheet-body');
  body.replaceChildren(...[
    regionDone ? h('div.modes', { role: 'group', 'aria-label': 'Difficulty' },
      h('button' + (H ? '' : '.on'), { type: 'button', 'aria-pressed': String(!H), onclick: () => { heroicMode = false; renderMap(game, m.id); } }, 'Normal'),
      h('button' + (H ? '.on' : ''), { type: 'button', 'aria-pressed': String(H), onclick: () => { heroicMode = true; renderMap(game, m.id); } }, 'Heroic')) : null,
    h('div.sh-top', null, h('span.tag-chip', null, `Mission ${n}`), h('span.tag-chip', null, `Lv ${spec.level}`), m.boss ? h('span.tag-chip.boss', null, 'Boss') : null, m.boss && !H ? h('span.tag-chip.seal', { title: 'Beat the boss to take this region\'s Seal of Vael' }, 'Seal') : null, H ? h('span.tag-chip.hero', null, 'Heroic') : null, h('span.grow'), stars(done)),
    h('h2', null, m.name), h('div.place', null, m.place),
    h('p.brief', null, m.text),
    jobChips(m),
    powerRow(game, m, H),
    h('div.label', null, 'Enemies'),
    h('div.foes', null, ...Object.entries(foes).map(([k, c]) => h('span.foe' + (ENEMIES[k].boss ? '.boss' : ''), { title: ENEMIES[k].name }, face(ENEMIES[k].set, 36), c > 1 ? h('em', null, '×' + c) : null))),
    h('div.label', null, done ? 'Replay rewards' : 'First clear'),
    h('div.rewards', null,
      reward(goldIcon(), String(Math.round(P.missionGold(m) * (done ? 1 : 2) * (H ? P.HEROIC.gold : 1)))),
      reward(icon('up', 18), `${Math.round(P.missionXp(m) * (done ? 1 : 1.5) * (H ? P.HEROIC.xp : 1))} xp`),
      reward(icon('bag', 18), done ? 'Chance' : H ? 'Rare+' : 'Gear'),
      reward(matIcon(m.region), (done ? '1-3' : m.boss ? '12' : '5') + (H ? ' ×2' : ''), '.matrw'),
      done < 3 ? reward(gemIcon(), H ? '10' : (!done && m.boss ? '30' : '5')) : null,
      // someone waits here: who stays hidden until they join
      !H && !done && ((P.sealOf(m.region) === m && P.UNLOCKS[m.region] && !s.roster[P.UNLOCKS[m.region]]) || (m.recruit && !s.roster[m.recruit])) ? reward(h('b.q', null, '?'), 'A hero', '.who') : null)].filter(Boolean));
  sheet.replaceChildren(body, h('button.btn.big.primary', { type: 'button', onclick: () => { game.heroic = H; s.flags.at = m.id; game.persist(); game.needRun(() => game.go('prep', m.id)); } }, icon('swords', 20), s.run || P.unlocked(s).length < 2 ? 'Prepare' : 'Spin & prepare'));
}

// ---- power: the team's against the mission's (equal power wins about three times in four)
const powerClass = (tp, mp) => (tp >= mp ? 'ok' : tp >= mp * 0.85 ? 'close' : 'low');
function powerChip(label, n, cls) { return h('span.power.' + cls, { title: label }, icon('power', 14), h('b', null, n.toLocaleString('en')), h('small', null, label)); }
function powerRow(game, m, H) {
  const tp = P.teamPower(game.save), mp = P.missionPower(m, H), c = powerClass(tp, mp);
  return h('div.powers', { title: { ok: 'Ready', close: 'A close fight', low: 'Too strong for now' }[c] }, powerChip('Your team', tp, c), h('span.vs', null, 'vs'), powerChip('Enemies', mp, 'foe'));
}

// ---- the team: the company lives round the fire behind (render/camp.js: the team drilling, resting,
// sleeping), the collection below. A tap on a card takes a hero along or leaves them at camp; who stands in
// front and who stays back is worked out from their class (fighters front, archers, mages and healers back).
const FRONT = ['vanguard', 'striker'];
let focus = null;
export function renderPrep(game, missionId) {
  const s = game.save, m = missionById(missionId), spec = P.battleSpec(m, game.heroic);
  if (!focus || !s.roster[focus]) focus = s.team[0] ? s.team[0].key : Object.keys(s.roster)[0];
  $('#p-name').textContent = m.name;
  $('#p-sub').textContent = `Level ${spec.level}${m.boss ? ' · boss' : ''}${game.heroic ? ' · heroic' : ''}`;
  const foes = {}; for (const [k] of m.foes) foes[k] = (foes[k] || 0) + 1;
  $('#p-foes').replaceChildren(h('em', null, 'VS'), ...Object.keys(foes).map((k) => face(ENEMIES[k].set, 28)));
  // who is going: front and back, in the order they will stand
  const row = (front) => s.team.filter((t) => FRONT.includes(UNITS[t.key].cls) === front).map((t) => first(UNITS[t.key].name));
  const boons = boonRow(game, 20);
  $('#p-slots').replaceChildren(h('div.lineup', null,
    h('span', null, h('b', null, 'Front'), row(true).join(' · ') || '—'), h('span', null, h('b', null, 'Back'), row(false).join(' · ') || '—'),
    jobOf(m) ? h('span', null, h('b', null, 'Job'), jobOf(m)) : null,
    boons.length ? h('div.boonrow', null, h('small', null, 'Boons'), ...boons) : null));
  const roster = $('#p-roster'); roster.replaceChildren();
  const keys = Object.keys(UNITS).filter((k) => s.roster[k]).sort((a, b) => s.team.some((q) => q.key === b) - s.team.some((q) => q.key === a));
  for (const k of keys) {
    const d = UNITS[k], inT = s.team.some((q) => q.key === k);
    roster.append(h('button.card' + (inT ? '.in' : '') + (focus === k ? '.focus' : ''), { type: 'button', vars: { '--c': clsVar(d.cls) }, 'aria-pressed': String(inT), 'aria-label': (inT ? 'Leave at camp: ' : 'Take along: ') + d.name,
      onclick: () => tapCard(game, missionId, k) },
      h('span.lv', null, s.roster[k].level), s.run && s.run.leader === k ? h('span.crown') : null, face(d.set, 42), h('span.nm', null, first(d.name))));
  }
  const d = UNITS[focus];
  $('#p-detail').replaceChildren(h('div.t', null, d.name), h('div.sub', null, h('span.cls', { vars: { '--c': clsVar(d.cls) } }, CLASSES[d.cls].name), h('span.place', null, d.title)),
    h('div.ability', null, h('b', null, d.ability.name + '. '), d.ability.desc),
    ...(s.run && s.run.leader === focus ? [h('div.perk', null, h('b', null, 'Leader: ' + P.LEADERS[focus].name), h('span', null, P.LEADERS[focus].desc))] : []));
  $('#p-count').replaceChildren(`Team ${s.team.length}/${P.MAX_TEAM} · `, powerChip('Power', P.teamPower(s), powerClass(P.teamPower(s), P.missionPower(m, game.heroic))), h('span.vs', null, 'vs'), powerChip('Enemies', P.missionPower(m, game.heroic), 'foe'));
  if (game.refreshCast) game.refreshCast();
}
// a tap: the hero is shown; a second tap takes them along, or leaves them at camp
function tapCard(game, missionId, key) {
  const s = game.save, inT = s.team.some((q) => q.key === key);
  if (focus !== key) { focus = key; renderPrep(game, missionId); return; }
  if (inT) {
    if (s.run && s.run.leader === key) { toast('The leader of the run always fights'); return; }
    if (s.team.length <= 1) { toast('The team needs at least one'); return; }
    P.toggleTeam(s, key);
  } else if (s.team.length >= P.MAX_TEAM) { toast('The team is full: leave someone at camp first'); return; }
  else P.toggleTeam(s, key);
  P.autoFormation(s); game.persist(); game.audio.play('equip_armor_01', { gain: 0.4 }); renderPrep(game, missionId);
}

// ---- after a battle
export function renderRewards(game, b, rw, missionId) {
  const m = missionById(missionId), box = $('#r-box');
  box.replaceChildren(); $('#tip').hidden = true;
  const allies = b.units.filter((u) => u.team === 'ally' && !u.summoned && !u.ward);
  const mvp = allies.reduce((a, u) => (u.dealt + u.healed * 1.2 > a.dealt + a.healed * 1.2 ? u : a), allies[0]);
  if (rw.win) {
    const runNote = rw.runEnded ? ` · ${first(UNITS[rw.runEnded.leader].name)}'s run ends in triumph` : game.save.run ? ` · run: ${game.save.run.wins} win${game.save.run.wins === 1 ? '' : 's'}` : '';
    box.append(h('div.rays'), h('div.rt.win', null, 'Victory'), stars(rw.stars), h('div.rsub', null, `${m.name} · ${Math.round(b.t)} s${runNote}`));
    const left = h('div.r-left', null,
      h('div.mvp', null, heroArt(mvp.def.set, 2), h('div', null, h('div.label', null, 'MVP'), h('div.mvp-n', null, first(mvp.def.name)))),
      h('div.rgold', null, reward(goldIcon(), `+${rw.gold}`), rw.gems ? reward(gemIcon(), `+${rw.gems}`) : null, ...Object.entries(rw.mats || {}).map(([r, n]) => reward(matIcon(r), `+${n}`, '.matrw'))),
      rw.first ? h('span.first', null, rw.heroic ? 'Heroic clear' : 'First clear') : null);
    const right = h('div.r-right'); box.append(h('div.r-body', null, left, right));
    const xs = h('div.xps');
    for (const [i, x] of rw.xp.filter((x) => x.team).entries()) {
      const d = UNITS[x.key];
      xs.append(h('div.xrow', { vars: { '--c': clsVar(d.cls), '--i': i } }, face(d.set, 26), h('span.nm', null, first(d.name)), h('span.xp', null, `+${x.xp} xp`), x.to > x.from ? h('span.lvup', null, `Level ${x.to}`) : h('span.lv', null, `Lv ${x.to}`)));
    }
    right.append(xs);
    const bench = rw.xp.filter((x) => !x.team && x.to > x.from);
    if (bench.length) right.append(h('div.rsub', null, `At camp: ${bench.map((x) => `${first(UNITS[x.key].name)} reached level ${x.to}`).join(', ')}`));
    if (rw.loot.length) right.append(h('div.loot', null, ...rw.loot.map((it, i) => h('div.lcard', { vars: { '--i': i } }, itemTile(it, 26), h('span', null, h('b', { style: { color: tierColor(it) } }, itemName(it)), h('small', null, Object.entries(itemStats(it)).map(([a, v]) => statText(a, v)).join(', ')))))));
    // what next: straight on to the next mission (the usual way), the map, the same mission again, or the heroes
    const nx = !rw.heroic && nextMission(game.save.cleared), onward = nx && nx !== m;
    box.append(h('div.ractions', null,
      h('button.btn', { id: 'r-heroes', type: 'button', onclick: () => afterWin(game, rw, m, 'heroes') }, icon('heroes', 18), 'Heroes'),
      h('button.btn', { id: 'r-map', type: 'button', onclick: () => afterWin(game, rw, m, 'map') }, icon('map', 18), 'Map'),
      h('button.btn', { id: 'r-replay', type: 'button', onclick: () => afterWin(game, rw, m, 'replay') }, 'Replay'),
      // a boon on offer comes first: the pick, then on
      game.save.run && game.save.run.pick
        ? h('button.btn.primary.boonbtn', { id: 'r-next', type: 'button', onclick: () => showBoons(game, () => afterWin(game, rw, m, onward ? 'next' : 'map')) }, icon('star', 18), 'Choose a boon')
        : h('button.btn.primary', { id: 'r-next', type: 'button', onclick: () => afterWin(game, rw, m, onward ? 'next' : 'map') }, onward ? 'Next mission' : 'Continue', icon('right', 18))));
  } else {
    const why = b.ward && b.ward.state === 'ko' ? `${b.ward.def.name} was lost` : b.mark && b.t >= b.limit - 0.1 ? 'The target got away' : b.t >= b.limit - 0.1 ? 'Time ran out' : 'Defeat';
    box.append(h('div.rt.lose', null, why), h('div.rsub', null, `${m.name} · ${allies.filter((u) => u.state !== 'ko').length} of ${allies.length} standing`));
    const tp = P.teamPower(game.save), mp = P.missionPower(m, !!game.heroic);
    // the run is over: who led it, how far it went
    if (rw.runEnded) { const d = UNITS[rw.runEnded.leader], f = face(d.set, 30); f.style.setProperty('--c', `var(--${d.cls})`);
      box.append(h('div.runover', null, f, h('span', null, h('b', null, `${first(d.name)}'s run is over`), h('small', null, `${rw.runEnded.wins} win${rw.runEnded.wins === 1 ? '' : 's'} · best run ${game.save.runs.best}`)))); }
    box.append(h('div.powers', null, powerChip('Your team', tp, tp >= mp ? 'ok' : tp >= mp * 0.85 ? 'close' : 'low'), h('span.vs', null, 'vs'), powerChip('Enemies', mp, 'foe')));
    box.append(h('p.lose-note', null, tp < mp ? 'Your team is under-powered here. Nothing is lost: replay earlier missions for levels, equip and upgrade gear, train, then come back.'
      : 'Nothing is lost. Try a different formation, put the healer in the back row, or use Manual to time the abilities.'));
    const top = Math.max(1, ...allies.map((u) => Math.max(u.dealt, u.healed)));
    box.append(h('div.xps', null, ...allies.map((u) => h('div.xrow', { vars: { '--c': clsVar(u.def.cls || 'striker') } }, face(u.def.set, 26), h('span.nm', null, first(u.def.name)),
      h('span.dbar', null, h('i', { style: { width: (u.dealt / top) * 100 + '%' } })), h('span.xp', null, String(Math.round(u.dealt)))))));
    box.append(h('div.ractions', null,
      h('button.btn', { type: 'button', onclick: () => game.go('map') }, icon('map', 18), 'Map'),
      h('button.btn', { type: 'button', onclick: () => game.go('company') }, icon('heroes', 18), 'Heroes'),
      h('button.btn.primary', { type: 'button', onclick: () => game.needRun(() => game.go('prep', missionId)) }, game.save.run || P.unlocked(game.save).length < 2 ? 'Try again' : 'Spin again', icon('right', 18))));
  }
  $('#result').classList.toggle('lose', !rw.win);
  $('#result').hidden = false;
  // the reveal, heard: a chime per star, the coins counting up, a chest for the loot
  if (rw.win) {
    for (let i = 0; i < rw.stars; i++) setTimeout(() => game.audio.play('coin_01', { gain: 0.55, vary: 0.02 + i * 0.08 }), 260 + i * 150);
    if (rw.loot.length) setTimeout(() => game.audio.play('chest_open', { gain: 0.6 }), 900);
    countUp(box.querySelector('.rgold'), rw.gold);
  } else game.audio.play('cancel_01', { gain: 0.5 });
}
// the gold of a win counts up from nothing
function countUp(row, to) {
  const el = row && [...row.querySelectorAll('*')].find((n) => n.childNodes.length === 1 && n.textContent === `+${to}`); if (!el || !to) return;
  const t0 = performance.now(), dur = 700;
  const tick = (now) => { const k = Math.min(1, (now - t0 - 350) / dur); el.textContent = '+' + Math.round(Math.max(0, k) * to); if (k < 1) requestAnimationFrame(tick); };
  el.textContent = '+0'; requestAnimationFrame(tick);
}

// after a win: who joined (on film, then the reveal), then the region's story if that cleared it, then the map
function afterWin(game, rw, m, then = 'map') {
  const ms = missionsIn(m.region), last = ms[ms.length - 1] === m;
  const toMap = () => {
    if (last && rw.first && !rw.heroic) {
      const ri = REGIONS.findIndex((r) => r.id === m.region), nextR = REGIONS[ri + 1];
      showStory(game, REGIONS[ri].name, REGION_END[m.region], nextR ? `Onward to ${nextR.name}` : 'The end',
        () => (nextR ? game.playScene(arrivalScene(nextR.id, game.save.team.map((t) => t.key))).then(() => game.go('map', missionsIn(nextR.id)[0].id)) : game.go('camp')), !nextR);
    } else if (then === 'next') { const nx = nextMission(game.save.cleared); game.go('prep', nx ? nx.id : m.id); }
    else if (then === 'replay') game.go('prep', m.id);
    else if (then === 'heroes') game.go('company');
    else game.go('map', m.id);
  };
  if (rw.joined) game.playScene(joinScene(rw.joined, rw.runEnded ? rw.runEnded.leader : game.save.run ? game.save.run.leader : game.save.team[0] ? game.save.team[0].key : 'corvin', m.region)).then(() => showRecruit(game, rw.joined, toMap));
  else toMap();
}
export function showStory(game, title, text, button, after, ending = false) {
  $('#j-card').replaceChildren(...[
    h('div.rays'),
    h('div.jtag', null, ending ? 'The sixth seal · Vael is reclaimed' : 'Region cleared · a Seal of Vael taken'),
    h('div.jname', null, title), h('p.story', null, text),
    ending ? h('p.story.dim', null, 'Heroic missions are open in every region for the company that wants more.') : null,
    h('button.btn.big.primary', { type: 'button', onclick: () => { $('#join').hidden = true; after(); } }, button)].filter(Boolean));
  $('#result').hidden = true; $('#join').hidden = false;
}
export function showRecruit(game, key, after = () => game.go('map')) {
  const d = UNITS[key], m = game.save.roster[key], card = $('#j-card');
  card.style.setProperty('--c', clsVar(d.cls));
  card.replaceChildren(
    h('div.rays'),
    h('div.jtag', null, P.onWheel(key) ? 'A new hero · now on the wheel' : 'A new recruit joins the company'),
    h('div.jart', null, heroArt(d.set, artPx() + 1)),
    h('div.jname', null, d.name), h('div.jtitle', null, d.title),
    h('div.cls', { vars: { '--c': clsVar(d.cls) } }, `${CLASSES[d.cls].name} · Level ${m.level}`),
    h('div.ability', null, h('b', null, d.ability.name + '. '), d.ability.desc),
    h('button.btn.big.primary', { type: 'button', onclick: () => { $('#join').hidden = true; after(); } }, 'Welcome'));
  $('#result').hidden = true;
  $('#join').hidden = false;
}
