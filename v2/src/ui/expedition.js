// The expedition screen: the region's road as a branching map from the gate (left) to the boss (right).
// Places the company can go next glow; a tap goes there: a fight goes to the team screen, the rest open
// here (a camp, the pedlar, a treasure, an event). The company's wounds show along the bottom.
import { UNITS } from '../data/units.js';
import { REGIONS, missionById } from '../data/campaign.js';
import { itemName, itemStats, statText } from '../data/items.js';
import * as P from '../game/progress.js';
import * as X from '../game/expedition.js';
import { $, h, face, goldIcon, itemTile, tierColor, toast } from './common.js';
import { icon } from './icons.js';
import { fxArt, boonRow, showBoons } from './boons.js';

const first = (n) => n.split(' ')[0];
export function renderExpedition(game) {
  const s = game.save, run = s.run, exp = run && run.exp;
  if (!exp) { game.go('map'); return; }
  const R = REGIONS.find((r) => r.id === exp.region), can = new Set(X.reachable(exp)), boss = exp.nodes.find((n) => n.type === 'boss');
  $('#e-title').textContent = R.name;
  $('#e-sub').textContent = `Expedition · ${UNITS[run.leader].name.split(' ')[0]} leads · step ${exp.at ? X.nodeOf(exp, exp.at).row + 1 : 0} of ${exp.rows}`;
  $('#e-gold').replaceChildren(goldIcon(), String(s.gold));
  $('#e-boons').replaceChildren(...boonRow(game, 20));
  // the map: rows across, places down; lines first, then the places over them
  const map = $('#e-map'); map.replaceChildren();
  const X0 = 6, X1 = 94, Y0 = 18, Y1 = 82, pos = (n) => ({ x: X0 + (n.row / (exp.rows - 1)) * (X1 - X0), y: Y0 + n.col * (Y1 - Y0) });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('e-lines');
  const walked = new Set(); let prev = null;
  for (const id of exp.done) { if (prev) walked.add(prev + '>' + id); prev = id; }
  for (const n of exp.nodes) for (const q of n.next) {
    const a = pos(n), b = pos(X.nodeOf(exp, q)), l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
    l.setAttribute('class', walked.has(n.id + '>' + q) ? 'walked' : n.id === exp.at && can.has(q) ? 'open' : '');
    svg.append(l);
  }
  map.append(svg);
  for (const n of exp.nodes) {
    const p = pos(n), done = exp.done.includes(n.id), open = can.has(n.id), here = exp.at === n.id;
    const m = n.mission && missionById(n.mission), label = n.type === 'fight' ? m.name : n.type === 'boss' ? m.name : X.NODE[n.type].name;
    const b = h('button.enode.' + n.type + (done ? '.done' : '') + (open ? '.open' : '') + (here ? '.here' : ''), { type: 'button', style: { left: p.x + '%', top: p.y + '%' }, 'aria-label': label + (open ? '' : done ? ' (done)' : ' (not reachable)'), disabled: !open,
      onclick: () => arrive(game, n) }, fxArt(game, X.NODE[n.type].art, n.type === 'boss' ? 44 : 32), h('span', null, label), done ? h('i.tick', null, icon('check', 12)) : null);
    map.append(b);
  }
  // the company, with its wounds
  $('#e-team').replaceChildren(...s.team.map((t) => {
    const d = UNITS[t.key], hp = X.hpOf(s, t.key), f = face(d.set, 30); f.style.setProperty('--c', `var(--${d.cls})`);
    return h('div.echip' + (hp < 0.35 ? '.hurt' : ''), { title: `${d.name}: ${Math.round(hp * 100)}% health` }, run.leader === t.key ? h('span.crown') : null, f, h('div', null, h('span', null, first(d.name)), h('div.bar', null, h('i', { style: { width: hp * 100 + '%' } }))));
  }));
  $('#e-modal').hidden = true;
  if (run.pick) showBoons(game, () => renderExpedition(game));
}

// arriving somewhere: a fight goes to the team screen; the rest open here
function arrive(game, n) {
  const s = game.save;
  if (['fight', 'elite', 'boss'].includes(n.type)) { game.expNode = n.id; game.go('prep', n.mission); return; }
  X.enter(s, n.id); game.persist();
  if (n.type === 'treasure') {
    const got = X.openTreasure(s, n, Math.random); game.after();
    game.audio.play('chest_open');
    modal(game, X.NODE.treasure.name, 'A strongbox under a dead man\'s cloak.', [h('div.egot', null, h('span', null, goldIcon(), `+${got.gold}`), itemCard(got.item))], [['Take it', () => renderExpedition(game)]]);
  } else if (n.type === 'camp') {
    modal(game, 'A fire for the night', 'The company makes camp. Rest, or spend the night training.', [], [
      ['Rest: heal everyone 45%', () => { X.camp(s, n, 'rest'); game.persist(); game.audio.play('heal_02'); renderExpedition(game); }],
      ['Train: choose a boon', () => { X.camp(s, n, 'train', Math.random); game.persist(); renderExpedition(game); }]]);
  } else if (n.type === 'shop') shop(game, n);
  else if (n.type === 'event') event(game, n);
}
function itemCard(it) { return h('div.lcard', null, itemTile(it, 26), h('span', null, h('b', { style: { color: tierColor(it) } }, itemName(it)), h('small', null, Object.entries(itemStats(it)).map(([a, v]) => statText(a, v)).join(', ')))); }
function modal(game, title, text, body, buttons) {
  const box = $('#e-modal');
  box.replaceChildren(h('div.emcard.glass', null, h('b.emt', null, title), text ? h('p', null, text) : null, ...body,
    h('div.emb', null, ...buttons.map(([label, fn, dis], i) => h('button.btn' + (i === 0 ? '.primary' : ''), { type: 'button', disabled: !!dis, onclick: fn }, label)))));
  box.hidden = false;
}
function shop(game, n) {
  const s = game.save, wares = X.shopWares(s, n), bought = (s.run.exp.bought || []);
  modal(game, 'The pedlar', 'A cart, a mule and a woman who has sold to both sides of every war.', [h('div.ewares', null, ...wares.map((w) => {
    const sold = bought.includes(n.id + w.id), poor = s.gold < w.cost;
    return h('button.eware', { type: 'button', disabled: sold || poor, onclick: () => {
      const r = X.buy(s, n, w.id, Math.random); if (!r) return;
      game.after(); game.audio.play('coin_01');
      if (r.item) toast(`Bought: ${itemName(r.item)}`);
      if (s.run.pick) showBoons(game, () => shop(game, n)); else shop(game, n);
    } }, h('b', null, w.name), h('small', null, w.desc), h('span', null, sold ? 'Sold' : [goldIcon(), String(w.cost)])); }))],
  [['Move on', () => { X.complete(s, n.id); game.persist(); renderExpedition(game); }]]);
}
function event(game, n) {
  const s = game.save, ev = X.eventFor(s.run.exp, n);
  modal(game, ev.title, ev.text, [], ev.choices.map((c, i) => [c.text, () => {
    const out = X.choose(s, n, i, Math.random); if (!out) return;
    game.after();
    const lines = [out.text, out.gold > 0 ? `+${out.gold} gold` : out.gold < 0 ? `${out.gold} gold` : '', out.item ? `Found: ${itemName(out.item)}` : '', out.side ? (out.side === 'crown' ? 'The Crown will remember this.' : 'The Free Towns will remember this.') : ''].filter(Boolean).join(' · ');
    if (out.fight) { modal(game, ev.title, lines || 'Weapons out!', [], [['Fight!', () => { game.expNode = n.id; game.expEventFight = true; game.go('prep', X.eventFight(s.run.exp, n)); }]]); return; }
    modal(game, ev.title, lines || 'The company moves on.', [], [['Continue', () => renderExpedition(game)]]);
  }, c.need && s.gold < c.need]));
}
// starting one: the wheel picks a leader (if there is anyone to pick from), then the map
export function beginExpedition(game, regionId) {
  const s = game.save;
  if (s.run && s.run.exp) { game.go('exp'); return; }
  const start = () => { P.startExpedition(s, regionId, Math.random); game.persist(); game.go('exp'); };
  if (P.unlocked(s).length < 2) { P.spin(s, Math.random); start(); return; }
  s.run = null; game.go('wheel', start);
}
export function abandonExpedition(game) {
  const s = game.save; if (!s.run) return;
  P.abandonRun(s); game.persist(); toast('The company turns back. Levels, gear and cleared missions are kept.'); game.go('map');
}
