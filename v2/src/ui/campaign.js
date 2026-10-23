// The campaign: the region map (a parchment drawing with the missions as seals along the road),
// the mission sheet, the team and formation before a battle, and the rewards after one.
import { UNITS, ENEMIES, CLASSES } from '../data/units.js';
import { MISSIONS, REGIONS, missionById, isOpen, nextMission } from '../data/campaign.js';
import { itemStats, itemName, statText } from '../data/items.js';
import * as P from '../game/progress.js';
import { $, h, face, itemIcon, tierColor, toast, goldIcon } from './common.js';

const clsVar = (cls) => `var(--${cls})`;
const stars = (n, of = 3) => h('span.stars', { 'aria-label': `${n} of ${of} stars` }, ...Array.from({ length: of }, (_, i) => h('i' + (i < n ? '.on' : ''))));

// ---- the map
let mapArt = null;
function drawMap(canvas, region) {
  const r = canvas.getBoundingClientRect(), W = 320, H = Math.max(120, Math.round(W * r.height / Math.max(1, r.width)));
  if (mapArt && mapArt.w === W && mapArt.h === H) return;
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  c.fillStyle = '#d9c49a'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(120,90,50,0.07)' : 'rgba(255,240,200,0.08)'; c.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 1 + ((rnd() * 3) | 0), 1); }
  const pt = (m) => [m.map[0] / 100 * W, m.map[1] / 100 * H];
  // the river, wandering from the north-west
  c.strokeStyle = 'rgba(70,110,140,0.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, H * 0.82);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, H * (0.86 - x / W * 0.1) + Math.sin(x / 22) * 6);
  c.stroke();
  // woods and hills as ink marks
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H;
    if (MISSIONS.some((m) => Math.hypot(pt(m)[0] - x, pt(m)[1] - y) < 16)) continue;
    if (rnd() < 0.65) { c.fillStyle = 'rgba(60,80,40,0.55)'; c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x - 4, y + 2); c.lineTo(x + 4, y + 2); c.fill(); c.fillStyle = 'rgba(70,50,30,0.6)'; c.fillRect(x - 0.5, y + 2, 1, 2); }
    else { c.strokeStyle = 'rgba(90,70,45,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 7, y + 2); c.quadraticCurveTo(x, y - 6, x + 7, y + 2); c.stroke(); }
  }
  // the road through every mission
  c.strokeStyle = 'rgba(90,60,30,0.75)'; c.lineWidth = 1.5; c.setLineDash([4, 3]); c.beginPath();
  MISSIONS.filter((m) => m.region === region).forEach((m, i) => { const [x, y] = pt(m); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke(); c.setLineDash([]);
  // edges burnt dark
  const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
  v.addColorStop(0, 'rgba(60,40,20,0)'); v.addColorStop(1, 'rgba(60,35,15,0.55)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  mapArt = { w: W, h: H };
}

let picked = null;
export function renderMap(game, focusId) {
  const s = game.save, region = REGIONS[0];
  $('#m-title').textContent = region.name;
  $('#m-gold').replaceChildren(goldIcon(), String(s.gold));
  mapArt = null; drawMap($('#m-art'), region.id);
  const nodes = $('#m-nodes'); nodes.replaceChildren();
  const next = nextMission(s.cleared);
  // the map opens on the next mission unless one is asked for
  picked = focusId && missionById(focusId) && isOpen(s.cleared, missionById(focusId)) ? focusId : next ? next.id : MISSIONS[MISSIONS.length - 1].id;
  MISSIONS.filter((m) => m.region === region.id).forEach((m, i) => {
    const open = isOpen(s.cleared, m), done = s.cleared[m.id] || 0;
    nodes.append(h('button.seal' + (done ? '.done' : open ? '.open' : '.locked') + (m.boss ? '.boss' : '') + (picked === m.id ? '.on' : ''), {
      type: 'button', style: { left: m.map[0] + '%', top: m.map[1] + '%' }, disabled: !open ? true : null,
      'aria-label': `${i + 1}. ${m.name}${done ? `, ${done} stars` : open ? ', open' : ', locked'}`,
      onclick: () => { picked = m.id; renderMap(game, m.id); },
    }, h('span.n', null, m.boss ? '☠' : String(i + 1)), done ? stars(done) : null));
  });
  renderSheet(game, missionById(picked));
}

function renderSheet(game, m) {
  const s = game.save, sheet = $('#m-sheet'), done = s.cleared[m.id] || 0;
  const foes = {}; for (const [k] of m.foes) foes[k] = (foes[k] || 0) + 1;
  sheet.replaceChildren(
    h('div.sh-top', null, h('span.lvl', null, `Level ${m.level}`), m.boss ? h('span.bosstag', null, 'Boss') : null, done ? stars(done) : null),
    h('h2', null, m.name), h('div.place', null, m.place),
    h('p.brief', null, m.text),
    h('div.label', null, 'Foes'),
    h('div.foes', null, ...Object.entries(foes).map(([k, n]) => h('div.foe', { title: ENEMIES[k].name }, face(ENEMIES[k].set, 28), h('span', null, (n > 1 ? n + '× ' : '') + ENEMIES[k].name)))),
    h('div.label', null, done ? 'Replay rewards' : 'First clear'),
    h('div.rewards', null,
      h('span', null, goldIcon(), String(Math.round(P.missionGold(m) * (done ? 1 : 2)))),
      h('span', null, `${Math.round(P.missionXp(m) * (done ? 1 : 1.5))} xp`),
      h('span', null, done ? 'Gear: a chance' : 'Gear'),
      !done && m.recruit && !s.roster[m.recruit] ? h('span.who', null, face(UNITS[m.recruit].set, 18, true), 'Someone may join') : null),
    h('button.btn.primary', { type: 'button', onclick: () => game.go('prep', m.id) }, 'Prepare'));
}

// ---- the team and formation for a mission
const SLOT_GRID = [3, 0, 4, 1, 5, 2]; // on screen: back row on the left, front row on the right
let selSlot = null, focus = null;
export function renderPrep(game, missionId) {
  const s = game.save, m = missionById(missionId);
  if (!focus || !s.roster[focus]) focus = s.team[0] ? s.team[0].key : Object.keys(s.roster)[0];
  $('#p-name').textContent = m.name;
  $('#p-sub').textContent = `Level ${m.level} · ${m.foes.length} foes${m.boss ? ' · boss' : ''}`;
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
    box.append(h('div.rgold', null, goldIcon(), `+${rw.gold}`, rw.first ? h('span.first', null, 'First clear') : null));
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
      h('button.btn.primary', { type: 'button', onclick: () => (rw.joined ? showRecruit(game, rw.joined) : game.go('map')) }, 'Continue')));
  } else {
    box.append(h('div.rt', null, b.t >= 89.9 ? 'Time ran out' : 'Defeat'), h('div.rsub', null, `${m.name} · ${allies.filter((u) => u.state !== 'ko').length} of ${allies.length} standing`));
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
