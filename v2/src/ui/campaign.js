// The campaign: the region map (a parchment drawing with the missions as seals along the road),
// the mission sheet, the team and formation before a battle, and the rewards after one.
import { UNITS, ENEMIES, CLASSES } from '../data/units.js';
import { MISSIONS, REGIONS, REGION_END, missionById, missionsIn, isOpen, nextMission, regionOpen, regionCleared } from '../data/campaign.js';
import { itemStats, itemName, statText } from '../data/items.js';
import * as P from '../game/progress.js';
import { TIME_LIMIT } from '../combat/battle.js';
import { joinScene, arrivalScene } from '../data/scenes.js';
import { $, h, face, itemIcon, tierColor, toast, goldIcon } from './common.js';

const clsVar = (cls) => `var(--${cls})`;
const stars = (n, of = 3) => h('span.stars', { 'aria-label': `${n} of ${of} stars` }, ...Array.from({ length: of }, (_, i) => h('i' + (i < n ? '.on' : ''))));

// ---- the map: the overworld (render/overworld.js) with the mission sheet beside it
let picked = null, regionId = null;
export let heroicMode = false;
export function renderMap(game, focusId) {
  const s = game.save, next = nextMission(s.cleared), ow = game.ow;
  // the map opens on the next mission unless one is asked for; the company stands where it last went
  const focus = focusId && missionById(focusId) && isOpen(s.cleared, missionById(focusId)) ? missionById(focusId) : null;
  const target = focus || (picked && isOpen(s.cleared, missionById(picked)) && missionById(picked)) || next || MISSIONS[MISSIONS.length - 1];
  picked = target.id; regionId = target.region;
  $('#m-gold').replaceChildren(goldIcon(), String(s.gold));
  $('#m-gems').replaceChildren(gemIcon(), String(s.gems));
  ow.onPick = (id) => { picked = id; regionId = missionById(id).region; s.flags.at = id; game.persist(); header(game); renderSheet(game, missionById(id), regionCleared(s.cleared, regionId)); };
  ow.focus(picked, false);
  header(game);
  renderSheet(game, target, regionCleared(s.cleared, regionId));
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

function renderSheet(game, m, regionDone) {
  const s = game.save, sheet = $('#m-sheet'), H = heroicMode, book = H ? s.heroic : s.cleared, done = book[m.id] || 0;
  const spec = P.battleSpec(m, H);
  const foes = {}; for (const [k] of m.foes) foes[k] = (foes[k] || 0) + 1;
  sheet.replaceChildren(...[
    regionDone ? h('div.modes', { role: 'group', 'aria-label': 'Difficulty' },
      h('button' + (H ? '' : '.on'), { type: 'button', 'aria-pressed': String(!H), onclick: () => { heroicMode = false; renderMap(game, m.id); } }, 'Normal'),
      h('button' + (H ? '.on' : ''), { type: 'button', 'aria-pressed': String(H), onclick: () => { heroicMode = true; renderMap(game, m.id); } }, 'Heroic')) : null,
    h('div.sh-top', null, h('span.lvl', null, `Level ${spec.level}`), m.boss ? h('span.bosstag', null, 'Boss') : null, H ? h('span.bosstag.hero', null, 'Heroic') : null, done ? stars(done) : null),
    h('h2', null, m.name), h('div.place', null, m.place),
    h('p.brief', null, m.text),
    h('div.label', null, 'Foes'),
    h('div.foes', null, ...Object.entries(foes).map(([k, n]) => h('div.foe', { title: ENEMIES[k].name }, face(ENEMIES[k].set, 28), h('span', null, (n > 1 ? n + '× ' : '') + ENEMIES[k].name)))),
    h('div.label', null, done ? 'Replay rewards' : 'First clear'),
    h('div.rewards', null,
      h('span', null, goldIcon(), String(Math.round(P.missionGold(m) * (done ? 1 : 2) * (H ? P.HEROIC.gold : 1)))),
      h('span', null, `${Math.round(P.missionXp(m) * (done ? 1 : 1.5) * (H ? P.HEROIC.xp : 1))} xp`),
      h('span', null, done ? 'Gear: a chance' : H ? 'Better gear' : 'Gear'),
      done < 3 ? h('span', null, gemIcon(), H ? '10 for 3 stars' : (!done && m.boss ? '25 + 5 for 3 stars' : '5 for 3 stars')) : null,
      !H && !done && m.recruit && !s.roster[m.recruit] ? h('span.who', null, face(UNITS[m.recruit].set, 18, true), 'Someone may join') : null),
    h('button.btn.primary', { type: 'button', onclick: () => { game.heroic = H; s.flags.at = m.id; game.persist(); game.go('prep', m.id); } }, 'Prepare')].filter(Boolean));
}
export const gemIcon = () => h('span.gem', { 'aria-hidden': 'true' });

// ---- the team and formation for a mission
const SLOT_GRID = [3, 0, 4, 1, 5, 2]; // on screen: back row on the left, front row on the right
let selSlot = null, focus = null;
export function renderPrep(game, missionId) {
  const s = game.save, m = missionById(missionId);
  if (!focus || !s.roster[focus]) focus = s.team[0] ? s.team[0].key : Object.keys(s.roster)[0];
  $('#p-name').textContent = m.name;
  $('#p-sub').textContent = `Level ${P.battleSpec(m, game.heroic).level} · ${m.foes.length} foes${m.boss ? ' · boss' : ''}${game.heroic ? ' · heroic' : ''}`;
  const slots = $('#p-slots'); slots.replaceChildren();
  for (const slot of SLOT_GRID) {
    const t = s.team.find((q) => q.slot === slot);
    const el = h('div.slot' + (t ? '.filled' : '') + (selSlot === slot ? '.sel' : ''), { role: 'button', tabindex: '0', onclick: () => tapSlot(game, missionId, slot),
      'aria-label': t ? `${UNITS[t.key].name}, ${slot < 3 ? 'front' : 'back'} row` : `Empty ${slot < 3 ? 'front' : 'back'} slot` });
    if (t) {
      const d = UNITS[t.key]; el.style.setProperty('--c', clsVar(d.cls));
      el.append(face(d.set, 30), h('div.si', null, h('div.nm', null, d.name.split(' ')[0]), h('div.cls', { vars: { '--c': clsVar(d.cls) } }, `Lv ${s.roster[t.key].level} · ${CLASSES[d.cls].name}`)),
        h('button.x', { type: 'button', 'aria-label': 'Remove ' + d.name, onclick: (e) => { e.stopPropagation(); if (s.team.length <= 1) { toast('The team needs at least one'); return; } s.team = s.team.filter((q) => q !== t); selSlot = null; game.persist(); renderPrep(game, missionId); } }, '×'));
    } else el.append(h('span.empty', null, 'empty'));
    slots.append(el);
  }
  const roster = $('#p-roster'); roster.replaceChildren();
  for (const k of Object.keys(UNITS).filter((k) => s.roster[k])) {
    const d = UNITS[k], inT = s.team.some((q) => q.key === k);
    roster.append(h('button.card' + (inT ? '.in' : '') + (focus === k ? '.focus' : ''), { type: 'button', vars: { '--c': clsVar(d.cls) }, 'aria-pressed': String(inT), onclick: () => tapCard(game, missionId, k) },
      face(d.set, 30), h('div.ci', null, h('span.nm', null, d.name.split(' ')[0]), h('span.cls', { vars: { '--c': clsVar(d.cls) } }, `Lv ${s.roster[k].level} · ${CLASSES[d.cls].name}`))));
  }
  const d = UNITS[focus];
  $('#p-detail').replaceChildren(h('div.t', null, d.name, h('small', null, `${CLASSES[d.cls].name} · ${d.title}`)), h('div.ab', null, h('b', null, d.ability.name + '.'), ' ', d.ability.desc));
  $('#p-count').textContent = `${s.team.length} / ${P.MAX_TEAM}`;
}
function tapCard(game, missionId, key) {
  const s = game.save; focus = key;
  const t = s.team.find((q) => q.key === key);
  if (t) selSlot = selSlot === t.slot ? null : t.slot;
  else if (s.team.length < P.MAX_TEAM) { P.toggleTeam(s, key, selSlot); selSlot = null; game.persist(); }
  else toast('The team is full: remove someone first');
  renderPrep(game, missionId);
}
function tapSlot(game, missionId, slot) {
  const s = game.save, here = s.team.find((q) => q.slot === slot);
  if (selSlot == null) { selSlot = slot; if (here) focus = here.key; }
  else if (selSlot === slot) selSlot = null;
  else if (s.team.some((q) => q.slot === selSlot)) { P.moveSlot(s, selSlot, slot); selSlot = null; game.persist(); }
  else { selSlot = slot; if (here) focus = here.key; }
  renderPrep(game, missionId);
}

// ---- after a battle
export function renderRewards(game, b, rw, missionId) {
  const m = missionById(missionId), box = $('#r-box');
  box.replaceChildren();
  const allies = b.units.filter((u) => u.team === 'ally' && !u.summoned);
  const mvp = allies.reduce((a, u) => (u.dealt + u.healed * 1.2 > a.dealt + a.healed * 1.2 ? u : a), allies[0]);
  if (rw.win) {
    box.append(h('div.rt.win', null, 'Victory'), stars(rw.stars), h('div.rsub', null, `${m.name} · ${Math.round(b.t)} s · MVP ${mvp.def.name.split(' ')[0]}`));
    box.append(h('div.rgold', null, goldIcon(), `+${rw.gold}`, rw.gems ? h('span', null, gemIcon(), `+${rw.gems}`) : null, rw.first ? h('span.first', null, rw.heroic ? 'Heroic clear' : 'First clear') : null));
    const xs = h('div.xps');
    for (const x of rw.xp.filter((x) => x.team)) {
      const d = UNITS[x.key];
      xs.append(h('div.xrow', null, face(d.set, 24), h('span.nm', null, d.name.split(' ')[0]), h('span.xp', null, `+${x.xp} xp`), x.to > x.from ? h('span.lvup', null, `Level ${x.to}!`) : h('span.lv', null, `Lv ${x.to}`)));
    }
    box.append(xs);
    const bench = rw.xp.filter((x) => !x.team && x.to > x.from);
    if (bench.length) box.append(h('div.rsub', null, `At camp: ${bench.map((x) => `${UNITS[x.key].name.split(' ')[0]} reached level ${x.to}`).join(', ')}`));
    if (rw.loot.length) box.append(h('div.loot', null, ...rw.loot.map((it) => h('div.lcard', null, itemIcon(it, 28), h('span', null, h('b', { style: { color: tierColor(it) } }, itemName(it)), h('small', null, Object.entries(itemStats(it)).map(([a, v]) => statText(a, v)).join(', ')))))));
    box.append(h('div.ractions', null,
      h('button.btn', { type: 'button', onclick: () => game.go('company') }, 'Company'),
      h('button.btn.primary', { type: 'button', onclick: () => afterWin(game, rw, m) }, 'Continue')));
  } else {
    box.append(h('div.rt', null, b.t >= TIME_LIMIT - 0.1 ? 'Time ran out' : 'Defeat'), h('div.rsub', null, `${m.name} · ${allies.filter((u) => u.state !== 'ko').length} of ${allies.length} standing`));
    box.append(h('p.lose', null, 'Nothing is lost. Level up on earlier missions, equip the gear you found, train, or try a different formation.'));
    const top = Math.max(1, ...allies.map((u) => Math.max(u.dealt, u.healed)));
    box.append(h('div.xps', null, ...allies.map((u) => h('div.xrow', null, face(u.def.set, 24), h('span.nm', null, u.def.name.split(' ')[0]),
      h('span.dbar', null, h('i', { style: { width: (u.dealt / top) * 100 + '%' } })), h('span.xp', null, String(Math.round(u.dealt)))))));
    box.append(h('div.ractions', null,
      h('button.btn', { type: 'button', onclick: () => game.go('map') }, 'Map'),
      h('button.btn', { type: 'button', onclick: () => game.go('company') }, 'Company'),
      h('button.btn.primary', { type: 'button', onclick: () => game.go('prep', missionId) }, 'Try again')));
  }
  $('#result').hidden = false;
}

// after a win: who joined, then the story card if that cleared a region, then the map
function afterWin(game, rw, m) {
  const ms = missionsIn(m.region), last = ms[ms.length - 1] === m;
  const toMap = () => {
    if (last && rw.first && !rw.heroic) {
      const ri = REGIONS.findIndex((r) => r.id === m.region), nextR = REGIONS[ri + 1];
      showStory(game, REGIONS[ri].name, REGION_END[m.region], nextR ? `Onward to ${nextR.name}` : 'The end',
        () => (nextR ? game.playScene(arrivalScene(nextR.id, game.save.team.map((t) => t.key))).then(() => game.go('map', missionsIn(nextR.id)[0].id)) : game.go('camp')), !nextR);
    } else game.go('map', m.id);
  };
  // a recruit joins on film; the company's leader greets them
  if (rw.joined) game.playScene(joinScene(rw.joined, game.save.team[0] ? game.save.team[0].key : 'corvin', m.region)).then(toMap);
  else toMap();
}
export function showStory(game, title, text, button, after, ending = false) {
  $('#j-card').replaceChildren(...[
    h('div.jtag', null, ending ? 'The end of the road' : 'Region cleared'),
    h('div.jname', null, title), h('p.story', null, text),
    ending ? h('p.story.dim', null, 'Heroic missions are open in every region for the company that wants more.') : null,
    h('button.btn.primary', { type: 'button', onclick: () => { $('#join').hidden = true; after(); } }, button)].filter(Boolean));
  $('#result').hidden = true; $('#join').hidden = false;
}
export function showRecruit(game, key, after = () => game.go('map')) {
  const d = UNITS[key], m = game.save.roster[key], card = $('#j-card');
  card.replaceChildren(
    h('div.jtag', null, 'Joins the company'),
    face(d.set, 72),
    h('div.jname', null, d.name), h('div.jtitle', null, d.title),
    h('div.cls', { vars: { '--c': clsVar(d.cls) } }, `${CLASSES[d.cls].name} · Level ${m.level}`),
    h('div.ability', null, h('b', null, d.ability.name + '.'), ' ', d.ability.desc),
    h('button.btn.primary', { type: 'button', onclick: () => { $('#join').hidden = true; after(); } }, 'Welcome'));
  $('#result').hidden = true;
  $('#join').hidden = false;
}
