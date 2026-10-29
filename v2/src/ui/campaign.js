// The campaign: the world map (render/overworld.js) with markers over the missions and the mission
// card beside it, the formation before a battle, the rewards after one, and the new recruit's reveal.
import { UNITS, ENEMIES, CLASSES } from '../data/units.js';
import { MISSIONS, REGIONS, REGION_END, missionById, missionsIn, isOpen, nextMission, regionOpen, regionCleared } from '../data/campaign.js';
import { itemStats, itemName, statText } from '../data/items.js';
import * as P from '../game/progress.js';
import { TIME_LIMIT } from '../combat/battle.js';
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
      !H && !done && P.sealOf(m.region) === m && P.UNLOCKS[m.region] && !s.roster[P.UNLOCKS[m.region]] ? reward(face(UNITS[P.UNLOCKS[m.region]].set, 22, true), 'Frees a hero', '.who') : null,
      !H && !done && m.recruit && !s.roster[m.recruit] ? reward(face(UNITS[m.recruit].set, 22, true), 'Recruit', '.who') : null)].filter(Boolean));
  sheet.replaceChildren(body, h('button.btn.big.primary', { type: 'button', onclick: () => { game.heroic = H; s.flags.at = m.id; game.persist(); game.needRun(() => game.go('prep', m.id)); } }, icon('swords', 20), s.run ? 'Prepare' : 'Spin & prepare'));
}

// ---- power: the team's against the mission's (equal power wins about three times in four)
const powerClass = (tp, mp) => (tp >= mp ? 'ok' : tp >= mp * 0.85 ? 'close' : 'low');
function powerChip(label, n, cls) { return h('span.power.' + cls, { title: label }, icon('power', 14), h('b', null, n.toLocaleString('en')), h('small', null, label)); }
function powerRow(game, m, H) {
  const tp = P.teamPower(game.save), mp = P.missionPower(m, H), c = powerClass(tp, mp);
  return h('div.powers', { title: { ok: 'Ready', close: 'A close fight', low: 'Too strong for now' }[c] }, powerChip('Your team', tp, c), h('span.vs', null, 'vs'), powerChip('Enemies', mp, 'foe'));
}

// ---- the formation: two rows of three places on a lit floor, the collection below. A hero gets in by a
// tap (the best free place, or the place picked first) or by dragging them onto a place; drag between
// places to swap, back onto the collection to take them out.
const PADS = [  // slot -> where its place stands (fractions of the formation area): the front row nearer the foes, above
  { s: 0, x: 0.37, y: 0.5 }, { s: 1, x: 0.61, y: 0.5 }, { s: 2, x: 0.85, y: 0.5 },   // the rows are staggered so the back
  { s: 3, x: 0.25, y: 0.98 }, { s: 4, x: 0.49, y: 0.98 }, { s: 5, x: 0.73, y: 0.98 },  // row stands between the front row's places
];
const FRONT = ['vanguard', 'striker'];
const rowOf = (slot) => (slot < 3 ? 'front' : 'back');
const misplaced = (key, slot) => FRONT.includes(UNITS[key].cls) !== (slot < 3);
let selSlot = null, focus = null, dragged = 0;
export function renderPrep(game, missionId) {
  const s = game.save, m = missionById(missionId), spec = P.battleSpec(m, game.heroic);
  if (!focus || !s.roster[focus]) focus = s.team[0] ? s.team[0].key : Object.keys(s.roster)[0];
  $('#p-name').textContent = m.name;
  $('#p-sub').textContent = `Level ${spec.level}${m.boss ? ' · boss' : ''}${game.heroic ? ' · heroic' : ''}`;
  const foes = {}; for (const [k] of m.foes) foes[k] = (foes[k] || 0) + 1;
  $('#p-foes').replaceChildren(h('em', null, 'VS'), ...Object.keys(foes).map((k) => face(ENEMIES[k].set, 28)));
  const full = s.team.length >= P.MAX_TEAM, placing = !s.team.some((q) => q.key === focus) && !full;   // a hero chosen and not yet in: the free places light up
  const slots = $('#p-slots');
  slots.className = placing ? 'placing' : '';
  slots.replaceChildren(
    h('div.rowband.front', null, h('b', null, 'Front row'), h('span', null, 'Takes the blows')),
    h('div.rowband.back', null, h('b', null, 'Back row'), h('span', null, 'Archers, mages, healers')));
  const big = artPx();
  for (const pd of PADS) {
    const slot = pd.s, t = s.team.find((q) => q.slot === slot), row = rowOf(slot);
    const el = h('div.pad.' + row + (t ? '.filled' : '.open') + (selSlot === slot ? '.sel' : ''), { role: 'button', tabindex: '0', 'data-slot': slot,
      onclick: () => { if (Date.now() - dragged > 300) tapSlot(game, missionId, slot); },
      onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapSlot(game, missionId, slot); } },
      style: { left: pd.x * 100 + '%', top: pd.y * 100 + '%' },
      'aria-label': t ? `${UNITS[t.key].name}, ${row} row` : `Empty ${row} place` },
      h('span.plat'));
    if (t) {
      const d = UNITS[t.key]; el.style.setProperty('--c', clsVar(d.cls));
      el.addEventListener('pointerdown', (e) => startDrag(e, game, missionId, t.key, slot));
      if (s.run && s.run.leader === t.key) el.append(h('span.crown', { title: 'Leader of this run' }));
      el.append(heroArt(d.set, big), h('span.nameplate', null, h('i', null, 'Lv ' + s.roster[t.key].level), first(d.name)));
      if (misplaced(t.key, slot)) el.append(h('span.warn', { title: FRONT.includes(d.cls) ? 'Fights best in the front row' : 'Safer in the back row' }, '!'));
      el.append(h('button.x', { type: 'button', 'aria-label': 'Remove ' + d.name, onclick: (e) => { e.stopPropagation(); removeHero(game, missionId, t.key); } }, icon('close', 14)));
    } else {
      el.append(h('span.beam'), h('span.addplus', null, icon('plus', 16)),
        h('span.slotlabel', null, placing || selSlot === slot ? 'Place here' : row === 'front' ? 'Fighter' : 'Ranged · Healer'));
    }
    slots.append(el);
  }
  const roster = $('#p-roster'); roster.replaceChildren();
  const keys = Object.keys(UNITS).filter((k) => s.roster[k]).sort((a, b) => s.team.some((q) => q.key === b) - s.team.some((q) => q.key === a));
  for (const k of keys) {
    const d = UNITS[k], inT = s.team.some((q) => q.key === k);
    const card = h('button.card' + (inT ? '.in' : '') + (focus === k ? '.focus' : ''), { type: 'button', vars: { '--c': clsVar(d.cls) }, 'aria-pressed': String(inT), 'aria-label': d.name,
      onclick: () => { if (Date.now() - dragged > 300) tapCard(game, missionId, k); } },
      h('span.lv', null, s.roster[k].level), s.run && s.run.leader === k ? h('span.crown') : null, face(d.set, 42), h('span.nm', null, first(d.name)));
    card.addEventListener('pointerdown', (e) => startDrag(e, game, missionId, k, null));
    roster.append(card);
  }
  const d = UNITS[focus];
  $('#p-detail').replaceChildren(h('div.t', null, d.name), h('div.sub', null, h('span.cls', { vars: { '--c': clsVar(d.cls) } }, CLASSES[d.cls].name), h('span.place', null, d.title)),
    h('div.ability', null, h('b', null, d.ability.name + '. '), d.ability.desc),
    ...(s.run && s.run.leader === focus ? [h('div.perk', null, h('b', null, 'Leader: ' + P.LEADERS[focus].name), h('span', null, P.LEADERS[focus].desc))] : []));
  $('#p-count').replaceChildren(`Team ${s.team.length}/${P.MAX_TEAM} · `, powerChip('Power', P.teamPower(s), powerClass(P.teamPower(s), P.missionPower(m, game.heroic))), h('span.vs', null, 'vs'), powerChip('Enemies', P.missionPower(m, game.heroic), 'foe'));
}
function removeHero(game, missionId, key) {
  const s = game.save;
  if (s.run && s.run.leader === key) { toast('The leader of the run always fights'); return; }
  if (s.team.length <= 1) { toast('The team needs at least one'); return; }
  s.team = s.team.filter((q) => q.key !== key); selSlot = null; game.persist(); renderPrep(game, missionId);
}
// put a hero on a place: from the collection (taking over the place, or the best free one), or from another place (a swap)
function placeHero(game, missionId, key, slot) {
  const s = game.save, mine = s.team.find((q) => q.key === key), here = s.team.find((q) => q.slot === slot);
  if (mine) { if (mine.slot !== slot) P.moveSlot(s, mine.slot, slot); }
  else if (here && s.run && s.run.leader === here.key) { toast('The leader of the run always fights'); return; }
  else if (here) { s.team = s.team.filter((q) => q !== here); s.team.push({ key, slot }); }
  else if (s.team.length >= P.MAX_TEAM) { toast('The team is full: take someone out first'); return; }
  else s.team.push({ key, slot });
  focus = key; selSlot = null; game.persist(); game.audio.play('equip_armor_01', { gain: 0.4 }); renderPrep(game, missionId);
}
function tapCard(game, missionId, key) {
  const s = game.save; focus = key;
  const t = s.team.find((q) => q.key === key);
  if (t) selSlot = selSlot === t.slot ? null : t.slot;
  else if (selSlot != null) { placeHero(game, missionId, key, selSlot); return; }
  else if (s.team.length < P.MAX_TEAM) { P.toggleTeam(s, key); game.persist(); }
  else toast('The team is full: take someone out first');
  renderPrep(game, missionId);
}
function tapSlot(game, missionId, slot) {
  const s = game.save, here = s.team.find((q) => q.slot === slot);
  // a hero picked from the collection and not yet in: this is where they go
  if (selSlot == null && focus && !s.team.some((q) => q.key === focus) && s.team.length < P.MAX_TEAM && !here) { placeHero(game, missionId, focus, slot); return; }
  if (selSlot == null) { selSlot = slot; if (here) focus = here.key; }
  else if (selSlot === slot) selSlot = null;
  else if (s.team.some((q) => q.slot === selSlot)) { P.moveSlot(s, selSlot, slot); selSlot = null; game.persist(); }
  else { selSlot = slot; if (here) focus = here.key; }
  renderPrep(game, missionId);
}
// dragging: a face follows the finger; the place under it lights up; letting go places the hero
function startDrag(e, game, missionId, key, fromSlot) {
  if (e.button > 0) return;
  const x0 = e.clientX, y0 = e.clientY, fromRoster = fromSlot == null;
  let ghost = null, over = null;
  const target = (ev) => { const el = document.elementFromPoint(ev.clientX, ev.clientY); return el && (el.closest('.pad') || el.closest('#p-roster')); };
  const move = (ev) => {
    const dx = ev.clientX - x0, dy = ev.clientY - y0;
    if (!ghost) {
      if (Math.hypot(dx, dy) < 10) return;
      if (fromRoster && Math.abs(dx) > Math.abs(dy)) { end(); return; }   // sideways on the collection: it scrolls
      ghost = h('div.dragghost', { vars: { '--c': clsVar(UNITS[key].cls) } }, face(UNITS[key].set, 52));
      document.body.append(ghost); $('#prep').classList.add('dragging');
    }
    ev.preventDefault();
    ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px';
    const t = target(ev); if (over && over !== t) over.classList.remove('over'); over = t; if (t) t.classList.add('over');
  };
  const up = (ev) => {
    const t = ghost && target(ev); end();
    if (!t) return;
    dragged = Date.now();
    if (t.classList.contains('pad')) placeHero(game, missionId, key, +t.dataset.slot);
    else if (!fromRoster) removeHero(game, missionId, key);
  };
  function end() {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', end);
    if (ghost) { ghost.remove(); ghost = null; dragged = Date.now(); }
    if (over) over.classList.remove('over');
    $('#prep').classList.remove('dragging');
  }
  window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', end);
}

// ---- after a battle
export function renderRewards(game, b, rw, missionId) {
  const m = missionById(missionId), box = $('#r-box');
  box.replaceChildren(); $('#tip').hidden = true;
  const allies = b.units.filter((u) => u.team === 'ally' && !u.summoned);
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
    for (const x of rw.xp.filter((x) => x.team)) {
      const d = UNITS[x.key];
      xs.append(h('div.xrow', { vars: { '--c': clsVar(d.cls) } }, face(d.set, 26), h('span.nm', null, first(d.name)), h('span.xp', null, `+${x.xp} xp`), x.to > x.from ? h('span.lvup', null, `Level ${x.to}`) : h('span.lv', null, `Lv ${x.to}`)));
    }
    right.append(xs);
    const bench = rw.xp.filter((x) => !x.team && x.to > x.from);
    if (bench.length) right.append(h('div.rsub', null, `At camp: ${bench.map((x) => `${first(UNITS[x.key].name)} reached level ${x.to}`).join(', ')}`));
    if (rw.loot.length) right.append(h('div.loot', null, ...rw.loot.map((it) => h('div.lcard', null, itemTile(it, 26), h('span', null, h('b', { style: { color: tierColor(it) } }, itemName(it)), h('small', null, Object.entries(itemStats(it)).map(([a, v]) => statText(a, v)).join(', ')))))));
    // what next: straight on to the next mission (the usual way), the map, the same mission again, or the heroes
    const nx = !rw.heroic && nextMission(game.save.cleared), onward = nx && nx !== m;
    box.append(h('div.ractions', null,
      h('button.btn', { id: 'r-heroes', type: 'button', onclick: () => afterWin(game, rw, m, 'heroes') }, icon('heroes', 18), 'Heroes'),
      h('button.btn', { id: 'r-map', type: 'button', onclick: () => afterWin(game, rw, m, 'map') }, icon('map', 18), 'Map'),
      h('button.btn', { id: 'r-replay', type: 'button', onclick: () => afterWin(game, rw, m, 'replay') }, 'Replay'),
      h('button.btn.primary', { id: 'r-next', type: 'button', onclick: () => afterWin(game, rw, m, onward ? 'next' : 'map') }, onward ? 'Next mission' : 'Continue', icon('right', 18))));
  } else {
    box.append(h('div.rt.lose', null, b.t >= TIME_LIMIT - 0.1 ? 'Time ran out' : 'Defeat'), h('div.rsub', null, `${m.name} · ${allies.filter((u) => u.state !== 'ko').length} of ${allies.length} standing`));
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
      h('button.btn.primary', { type: 'button', onclick: () => game.needRun(() => game.go('prep', missionId)) }, game.save.run ? 'Try again' : 'Spin again', icon('right', 18))));
  }
  $('#result').hidden = false;
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
    h('div.jtag', null, P.onWheel(key) ? 'A hero is freed · now on the wheel' : 'A new recruit joins the company'),
    h('div.jart', null, heroArt(d.set, artPx() + 1)),
    h('div.jname', null, d.name), h('div.jtitle', null, d.title),
    h('div.cls', { vars: { '--c': clsVar(d.cls) } }, `${CLASSES[d.cls].name} · Level ${m.level}`),
    h('div.ability', null, h('b', null, d.ability.name + '. '), d.ability.desc),
    h('button.btn.big.primary', { type: 'button', onclick: () => { $('#join').hidden = true; after(); } }, 'Welcome'));
  $('#result').hidden = true;
  $('#join').hidden = false;
}
