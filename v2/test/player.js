// A sensible simulated player for the balance tools: fields the five strongest, equips the best
// gear, picks upgrades, and spends gold on training. Shared by campaign-test.js and tune.js.
import { createBattle, step } from '../src/combat/battle.js';
import { BASES, SLOTS, itemStats } from '../src/data/items.js';
import * as P from '../src/game/progress.js';

export function fight(s, m, seed, heroic = false, might) {
  const spec = P.battleSpec(m, heroic);
  const b = createBattle({ team: P.teamFor(s), foes: spec.foes, level: spec.level, might: might != null ? might * (heroic ? P.HEROIC.might : 1) : spec.might, seed });
  for (let i = 0; i < 60 * 125 && !b.result; i++) step(b, 1 / 60);
  return b;
}
// casual: the best-team and auto-equip buttons and the upgrade picks, nothing else (the difficulty is
// tuned for this player); otherwise also training and gear upgrades with every coin, and selling spares.
// pick: which upgrade option to take (0, 1), or random when left out
export function manage(s, r, casual = true, pick = process.env.PICK ? +process.env.PICK : undefined) {
  const keys = P.bestTeam(s);
  for (const k of keys) s.roster[k].ups.forEach((u, t) => { if (!u && s.roster[k].level >= P.UPGRADE_LEVELS[t]) P.pickUpgrade(s, k, t, P.upgradeChoices(k, t)[pick != null ? pick : r() < 0.5 ? 0 : 1].id); });
  P.autoEquip(s, keys);
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
