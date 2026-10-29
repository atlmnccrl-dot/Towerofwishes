// Expeditions: a region is crossed as one run, on a branching map from its gate to its boss. Each step
// (row) offers one to three places: the row's mission (a fight), an elite (a harder fight for better
// spoils), a camp, a shop, a treasure or an event. Wounds carry from fight to fight; camps and shops heal
// them. The boss at the end holds the region's Seal. A lost fight ends the expedition (levels, gear and
// cleared missions stay). Pure: no DOM; the save's run holds the expedition (s.run.exp).
import { missionsIn, missionById } from '../data/campaign.js';
import { BOONS, offerFor } from '../data/boons.js';
import { UNITS } from '../data/units.js';
import { rollItem } from '../data/items.js';
import { rng } from '../combat/battle.js';
import { FACTION_EVENTS, relicSum } from '../data/story.js';

export const NODE = {
  fight: { name: 'Fight', art: 'cross_slash' },
  elite: { name: 'Elite', art: 'dark_slash', desc: 'A harder fight: an elite foe and tougher ranks. A rare boon and gear if you win.' },
  boss: { name: 'Boss', art: 'fire_ring' },
  camp: { name: 'Camp', art: 'campfire', desc: 'Rest (heal everyone 45%) or train (choose a boon).' },
  shop: { name: 'Pedlar', art: 'coin', desc: 'Buy healing, a boon or gear with gold.' },
  treasure: { name: 'Treasure', art: 'chest_open', desc: 'Gold and a piece of gear, free for the taking.' },
  event: { name: 'Something on the road', art: 'sparkles', desc: 'Who knows. Choose well.' },
};
export const WOUND_FLOOR = 0.15;   // a hero who falls in a won fight gets up with this much health
export const AFTER_FIGHT = 0.25;   // and everyone gets this much back on the road
export const WIN_FLOOR = 0.4;      // after a won fight nobody is lower than this
export const REST = 0.45;

// ---- the map: rows from the gate to the boss. Rows whose mission brings a hero along have only that
// mission (everyone meets them); the others offer side roads.
export function generate(regionId, seed) {
  const r = rng(seed), list = missionsIn(regionId), boss = list[list.length - 1], rows = [];
  list.slice(0, -1).forEach((m, i) => {
    const row = [{ type: 'fight', mission: m.id }];
    if (!m.recruit && i > 0) {
      const opts = ['elite', 'event', 'treasure', ...(i >= 2 ? ['camp', 'shop', 'event'] : [])];
      const n = r() < 0.55 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const pick = opts.splice(Math.floor(r() * opts.length), 1)[0];
        row.push(pick === 'elite' ? { type: 'elite', mission: list[Math.max(0, i - 1 - Math.floor(r() * 2))].id } : { type: pick });
      }
      // the last stretch before the boss always has a fire to rest by
      if (i === list.length - 2 && !row.some((n) => n.type === 'camp')) row[row.length - 1] = { type: 'camp' };
      // shuffle, so the mission is not always on top
      for (let k = row.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [row[k], row[j]] = [row[j], row[k]]; }
    }
    rows.push(row);
  });
  rows.push([{ type: 'boss', mission: boss.id }]);
  // ids, columns and links: a place leads to the places of the next row beside it
  const nodes = [];
  rows.forEach((row, ri) => row.forEach((n, ci) => { n.id = `${ri}.${ci}`; n.row = ri; n.col = row.length === 1 ? 0.5 : ci / (row.length - 1); nodes.push(n); }));
  for (const n of nodes) {
    const next = rows[n.row + 1] || [];
    n.next = next.filter((q) => Math.abs(q.col - n.col) <= 0.55 || next.length === 1).map((q) => q.id);
    if (!n.next.length && next.length) n.next = [next.reduce((a, q) => (Math.abs(q.col - n.col) < Math.abs(a.col - n.col) ? q : a)).id];
  }
  // every place must be reachable
  for (const row of rows.slice(1)) for (const q of row) if (!nodes.some((n) => n.next.includes(q.id))) { const prev = rows[q.row - 1]; prev[Math.floor(q.col * (prev.length - 1) + 0.5)].next.push(q.id); }
  return { region: regionId, seed, nodes, at: null, done: [], rows: rows.length, events: [] };
}
export const nodeOf = (exp, id) => exp.nodes.find((n) => n.id === id);
// the places the company can go next: the first row from the gate, then those the last place leads to
export function reachable(exp) {
  if (exp.at == null) return exp.nodes.filter((n) => n.row === 0).map((n) => n.id);
  return nodeOf(exp, exp.at).next.slice();
}
// how a fight node is fought: the mission's battle, made harder for an elite
export function fightSpec(exp, node, spec) {
  if (node.type !== 'elite') return spec;
  const foes = spec.foes.map((f, i) => i);
  const free = foes.filter((i) => !(spec.elites || []).some(([q]) => q === i));
  const extra = free.length ? [[free[free.length - 1], ['enraged', 'shielded', 'swift', 'vampiric', 'splitting'][exp.seed % 5]]] : [];
  return Object.assign({}, spec, { might: spec.might * 1.25, elites: (spec.elites || []).concat(extra) });
}

// ---- wounds: health carried between fights (a share of each hero's most, 1 = unhurt)
export const hpOf = (s, key) => (s.run && s.run.hp && s.run.hp[key] != null ? s.run.hp[key] : 1);
export function afterFight(s, battle) {
  const hp = s.run.hp || (s.run.hp = {}), L = s.legacy || { perks: {} };
  // the legacy changes the road's mending: Field Medics more, Reavers none (and a lower floor)
  const reaver = L.charter === 'reavers', back = reaver ? 0 : AFTER_FIGHT + (L.perks.medics ? 0.15 : 0) + relicSum(s.story, 'recover'), floor = reaver ? 0.25 : WIN_FLOOR;
  for (const u of battle.units) if (u.team === 'ally' && !u.summoned && !u.ward && UNITS[u.key]) hp[u.key] = Math.min(1, Math.max(floor, (u.state === 'ko' ? WOUND_FLOOR : u.hp / u.max) + back));
}
export function healAll(s, share) { const hp = s.run.hp || (s.run.hp = {}); for (const k of Object.keys(s.roster)) hp[k] = Math.max(0.05, Math.min(1, hpOf(s, k) + share)); }   // a hurt never fells anyone

// ---- moving: arriving at a place. Fights are fought by the caller; the rest resolve here.
export function enter(s, id) {
  const exp = s.run.exp;
  if (!reachable(exp).includes(id)) return null;
  exp.at = id;
  return nodeOf(exp, id);
}
export function complete(s, id) { const exp = s.run.exp; if (!exp.done.includes(id)) exp.done.push(id); }

// treasure: gold and a piece of gear for the level of the row
export function openTreasure(s, node, rnd) {
  const lv = levelAt(s.run.exp, node), gold = 60 + lv * 14;
  const it = Object.assign(rollItem(lv, rnd, 0.3), { uid: s.uid++ });
  s.gold += gold; s.inv.push(it); complete(s, node.id);
  return { gold, item: it };
}
// camp: rest, or train (a boon to choose, as after a win)
export function camp(s, node, choice, rnd) {
  if (choice === 'rest') healAll(s, REST);
  else s.run.pick = offerFor(s, rnd);
  complete(s, node.id);
  return choice;
}
// the pedlar's wares, priced by the region
export function shopWares(s, node) {
  const lv = levelAt(s.run.exp, node), k = 1 + lv / 12;
  return [
    { id: 'heal', name: 'Salves and bandages', desc: 'Heal everyone 35%.', cost: Math.round(60 * k) },
    { id: 'boon', name: 'A charm from the pedlar', desc: 'Choose a boon.', cost: Math.round(140 * k) },
    { id: 'gear', name: 'Gear from the cart', desc: 'A piece of gear for this road.', cost: Math.round(90 * k) },
  ];
}
export function buy(s, node, id, rnd) {
  const w = shopWares(s, node).find((x) => x.id === id), bought = s.run.exp.bought || (s.run.exp.bought = []);
  if (!w || s.gold < w.cost || bought.includes(node.id + id)) return null;
  s.gold -= w.cost; bought.push(node.id + id);
  if (id === 'heal') healAll(s, 0.35);
  else if (id === 'boon') s.run.pick = offerFor(s, rnd);
  else { const it = Object.assign(rollItem(levelAt(s.run.exp, node), rnd, 0.2), { uid: s.uid++ }); s.inv.push(it); return { item: it }; }
  return { ok: true };
}
const levelAt = (exp, node) => { const ms = missionsIn(exp.region), m = ms[Math.min(ms.length - 1, node.row)]; return m.level; };

// an elite's (or an ambush's) extra spoils: a piece of gear a little above the road's level
export function eliteSpoils(s, node, rnd) { const it = Object.assign(rollItem(levelAt(s.run.exp, node) + 2, rnd, 0.35), { uid: s.uid++ }); s.inv.push(it); return it; }
// ---- events on the road: a short scene and two or three choices. Each choice: text, and what it does
// (gold, heal: a share of everyone's health, hurt: the same lost, boon: a boon to choose, item, fight: the
// row's mission as an elite ambush). `need`: a gold price. (Proposal: every word.)
export const EVENTS = [
  { id: 'traveller', title: 'A wounded traveller', text: 'A merchant lies by the road, robbed and bleeding. His cart is gone; his purse is not.',
    choices: [{ text: 'Bandage him (he pays you)', gold: 80 }, { text: 'Take his purse', gold: 160, hurt: 0.1, note: 'The company is quiet the rest of the day.' }] },
  { id: 'shrine', title: 'A forgotten shrine', text: 'Moss over old stone, and a bowl for offerings. Something here is still listening.',
    choices: [{ text: 'Leave an offering (60 gold)', need: 60, gold: -60, boon: true }, { text: 'Pray without paying', heal: 0.15 }, { text: 'Pry out the silver', gold: 100, hurt: 0.15 }] },
  { id: 'deserters', title: 'Deserters', text: 'Three soldiers who ran from the last war, eating stolen bread. They have heard of the company.',
    choices: [{ text: 'Share your fire', heal: 0.2 }, { text: 'Turn them in for the bounty', gold: 140 }] },
  { id: 'well', title: 'The deep well', text: 'Cold water, and at the bottom, something that glints.',
    choices: [{ text: 'Drink and rest', heal: 0.25 }, { text: 'Climb down for it', item: true, hurt: 0.1 }] },
  { id: 'ambush', title: 'Too quiet', text: 'No birds. No wind. The scouts say the trees are full of eyes.',
    choices: [{ text: 'Spring the trap first', fight: true, note: 'A hard fight; a rare boon if you win.' }, { text: 'Go around (lose time and health)', hurt: 0.12 }] },
  { id: 'gambler', title: 'The gambler', text: 'A smiling man with loaded dice offers a game. Double or nothing.',
    choices: [{ text: 'Bet 100 gold', need: 100, gamble: 100 }, { text: 'Walk on' }] },
  { id: 'smith', title: 'A travelling smith', text: 'Her forge is a cart and a bellows. She owes nobody anything.',
    choices: [{ text: 'Buy her best (120 gold)', need: 120, gold: -120, item: true }, { text: 'Ask her to look over your gear', heal: 0.1, note: 'Small mends, small help.' }] },
  { id: 'children', title: 'Lost children', text: 'Two children, far from any village, who will not say where they came from.',
    choices: [{ text: 'Take them home (a day lost)', hurt: 0.08, boon: true, note: 'Their village has a gift for the company.' }, { text: 'Point the way and go on', gold: 0 }] },
  { id: 'cache', title: 'A soldier\'s cache', text: 'A marked stone, a hollow beneath it, a dead man\'s savings.',
    choices: [{ text: 'Take it all', gold: 120 }, { text: 'Leave it for his kin', heal: 0.1, note: 'It feels right.' }] },
  // ---- told only to a company with a name (rank 3, 5, 7)
  { id: 'oracle', rank: 3, title: 'The blind oracle', text: 'An old woman by the road knows the company\'s name before anyone says it.',
    choices: [{ text: 'Hear your fortune (80 gold)', need: 80, gold: -80, boon: true, note: 'She was right about everything. That is the frightening part.' }, { text: 'Ask for her blessing', heal: 0.2 }] },
  { id: 'tourney', rank: 5, title: 'A village tourney', text: 'Banners, a roped-off field, and a prize sword on a cushion. The local champion is enormous.',
    choices: [{ text: 'Enter the tourney', fight: true, note: 'The whole village is watching.' }, { text: 'Cheer from the crowd', heal: 0.15, gold: 30 }] },
  { id: 'ghosts', rank: 7, title: 'The marching dead', text: 'A column of ghostly soldiers passes in silence. Their captain stops, and salutes the company.',
    choices: [{ text: 'Salute back', boon: true, heal: 0.1 }, { text: 'Follow them to their grave', item: true, hurt: 0.2, note: 'Their captain left something for you.' }] },
  { id: 'storm', title: 'The storm', text: 'The sky goes black at noon. Shelter is a cave that smells of something large.',
    choices: [{ text: 'Shelter in the cave', heal: 0.3, fight: true, note: 'Rest, then whatever lives there.' }, { text: 'March through the storm', hurt: 0.15 }] },
];
EVENTS.push(...FACTION_EVENTS);   // the Crown or the Free Towns (data/story.js)
export function eventFor(exp, node) { const pool = EVENTS.filter((e) => (e.rank || 0) <= (exp.rank || 0)); return pool[(exp.seed + node.row * 7 + Math.round(node.col * 3)) % pool.length]; }
// applies a choice; returns what happened, and whether a fight follows
export function choose(s, node, ci, rnd) {
  const ev = eventFor(s.run.exp, node), c = ev.choices[ci];
  if (!c || (c.need && s.gold < c.need)) return null;
  const out = { text: c.note || '', gold: 0 };
  if (c.gold) { s.gold = Math.max(0, s.gold + c.gold); out.gold = c.gold; }
  if (c.gamble) { const won = rnd() < 0.45; s.gold += won ? c.gamble : -c.gamble; out.gold = won ? c.gamble : -c.gamble; out.text = won ? 'The dice love you today.' : 'The dice were loaded. Of course they were.'; }
  if (c.heal) healAll(s, c.heal);
  if (c.crown && s.story) s.story.crown += c.crown;
  if (c.free && s.story) s.story.free += c.free;
  if (c.crown || c.free) out.side = c.crown ? 'crown' : 'free';
  if (c.hurt) healAll(s, -c.hurt);
  if (c.boon) s.run.pick = offerFor(s, rnd);
  if (c.item) { const it = Object.assign(rollItem(levelAt(s.run.exp, node), rnd, 0.25), { uid: s.uid++ }); s.inv.push(it); out.item = it; }
  out.fight = !!c.fight;
  if (!out.fight) complete(s, node.id);
  return out;
}
// the elite ambush an event can start: the row's own mission
export function eventFight(exp, node) { const ms = missionsIn(exp.region); return ms[Math.min(ms.length - 2, node.row)].id; }
export { BOONS, missionById };
