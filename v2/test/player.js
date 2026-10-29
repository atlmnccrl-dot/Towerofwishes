// A sensible simulated player for the balance tools: fields the five strongest, equips the best
// gear, picks upgrades, and spends gold on training. Shared by campaign-test.js and tune.js.
import { createBattle, step } from '../src/combat/battle.js';
import { BASES, SLOTS, itemStats } from '../src/data/items.js';
import * as P from '../src/game/progress.js';
import { UNITS } from '../src/data/units.js';
import * as X from '../src/game/expedition.js';
import { missionById } from '../src/data/campaign.js';

// one battle; on an expedition (node given) as the game fights it: an elite's extra strength, the wounds
export function fight(s, m, seed, heroic = false, might, node = null) {
  let spec = P.specFor(s, m, heroic);
  if (might != null) spec = Object.assign({}, spec, { might: might * (heroic ? P.HEROIC.might : 1) });
  if (node && s.run && s.run.exp) spec = X.fightSpec(s.run.exp, node.type === 'event' ? { type: 'elite' } : node, spec);
  const b = createBattle(Object.assign({}, spec, { team: P.teamFor(s), boons: P.boonsOf(s), seed }));
  if (node && s.run && s.run.exp) for (const u of b.units) if (u.team === 'ally' && !u.ward && !u.summoned) u.hp = Math.max(1, Math.round(u.max * X.hpOf(s, u.key)));
  for (let i = 0; i < 60 * 125 && !b.result; i++) step(b, 1 / 60);
  return b;
}
const avgHp = (s) => { const k = s.team.map((t) => X.hpOf(s, t.key)); return k.reduce((a, v) => a + v, 0) / Math.max(1, k.length); };
// a casual player on the road: picks a place (a camp when hurt, mostly the row's fight otherwise) and
// resolves it. Returns { node, battle, win } (battle only for fights), or null when there is nowhere to go.
export function walk(s, r, seed, might) {
  const exp = s.run.exp, opts = X.reachable(exp).map((id) => X.nodeOf(exp, id)); if (!opts.length) return null;
  const hurt = avgHp(s) < 0.6, score = (n) => ({ camp: hurt ? 5 : 0.5, shop: hurt && s.gold > 100 ? 3 : 0.6, fight: 2, boss: 9, elite: hurt ? 0.3 : 1, treasure: 1.2, event: 1 }[n.type] || 1) * (0.6 + r());
  const node = opts.sort((a, b) => score(b) - score(a))[0];
  if (['fight', 'elite', 'boss'].includes(node.type)) return fightAt(s, r, node, node.mission, seed, might);
  X.enter(s, node.id);
  if (node.type === 'treasure') X.openTreasure(s, node, r);
  else if (node.type === 'camp') X.camp(s, node, hurt ? 'rest' : 'train', r);
  else if (node.type === 'shop') { if (hurt) X.buy(s, node, 'heal', r); else if (s.gold > 400) X.buy(s, node, 'boon', r); X.complete(s, node.id); }
  else if (node.type === 'event') {
    const ev = X.eventFor(exp, node), ok = ev.choices.map((c, i) => i).filter((i) => !ev.choices[i].need || s.gold >= ev.choices[i].need);
    const out = X.choose(s, node, ok[Math.floor(r() * ok.length)], r);
    if (out && out.fight) return fightAt(s, r, node, X.eventFight(exp, node), seed, might);
  }
  if (s.run && s.run.pick) P.chooseBoon(s, s.run.pick[Math.floor(r() * s.run.pick.length) % s.run.pick.length]);
  return { node };
}
function fightAt(s, r, node, missionId, seed, might) {
  const m = missionById(missionId), b = fight(s, m, seed, false, might != null ? might(m) : undefined, node);
  const rw = P.grantRewards(s, m.id, b, r);
  if (rw.win && s.run && s.run.exp) { if (node.type !== 'event') X.enter(s, node.id); X.complete(s, node.id); X.afterFight(s, b); }
  if (rw.win && s.run && node.type !== 'fight' && node.type !== 'boss') { X.eliteSpoils(s, node, r); s.run.elites = (s.run.elites || 0) + 1; }
  return { node, battle: b, win: rw.win, mission: m };
}
// casual: the best-team and auto-equip buttons and the upgrade picks, nothing else (the difficulty is
// tuned for this player); otherwise also training and gear upgrades with every coin, and selling spares.
// pick: which upgrade option to take (0, 1), or random when left out
export function manage(s, r, casual = true, pick = process.env.PICK ? +process.env.PICK : undefined) {
  if (s.run && s.run.pick) P.chooseBoon(s, s.run.pick[Math.floor(r() * s.run.pick.length) % s.run.pick.length]);   // a boon on offer: any of the three
  const keys = P.bestTeam(s);
  for (const k of keys) s.roster[k].ups.forEach((u, t) => { if (!u && s.roster[k].level >= P.UPGRADE_LEVELS[t]) P.pickUpgrade(s, k, t, P.upgradeChoices(k, t)[pick != null ? pick : r() < 0.5 ? 0 : 1].id); });
  for (const k of keys) for (let t = 0; t < 2; t++) { const c = P.pathChoices(k, UNITS[k].cls, t); if (s.roster[k].level >= P.PATH_LEVELS[t] && !s.roster[k].paths[t]) P.pickPath(s, k, t, c[pick != null ? pick : r() < 0.5 ? 0 : 1].id); }
  P.autoEquip(s, keys);
  // the story: a verdict on every beaten boss, whichever way the dice fall
  for (const rid of Object.keys(P.VERDICTS)) if (P.verdictDue(s, rid)) P.giveVerdict(s, rid, r() < 0.5 ? 'mercy' : 'dread');
  // the legacy: a perk for every point, in the order a casual player would take them
  for (const id of Object.keys(P.PERKS)) P.buyPerk(s, id);
  // the Stronghold: anyone builds what the camp offers when it is affordable
  for (let b = P.nextBuild(s); b && P.buildState(s, b.id) === 'ok'; b = P.nextBuild(s)) P.build(s, b.id);
  if (casual) return;
  for (const sl of SLOTS) s.inv.filter((it) => BASES[it.base].slot === sl && !P.wearer(s, it.uid)).sort((a, b) => score(b) - score(a)).slice(4).forEach((it) => P.sellItem(s, it.uid));
  for (let guard = 0; guard < 400; guard++) {
    const opts = [];
    for (const k of keys) for (const st of Object.keys(P.TRAIN)) { const rk = s.roster[k].train[st]; if (rk < P.TRAIN_MAX && rk < s.roster[k].level) opts.push([P.trainCostFor(s, rk), () => P.train(s, k, st)]); }
    for (const k of keys) for (const sl of SLOTS) { const it = s.roster[k].gear[sl] && P.itemByUid(s, s.roster[k].gear[sl]); if (it && (it.plus || 0) < 5) opts.push([(1 + (it.plus || 0)) * 40 * (it.tier + 1) * 1.2, () => P.upgradeItem(s, it.uid)]); }
    opts.sort((a, b) => a[0] - b[0]);
    if (!opts.length || opts[0][0] > s.gold) break;
    opts[0][1]();
  }
}
const score = (it) => Object.values(itemStats(it)).reduce((a, v) => a + v, 0);
