// Plays the whole campaign the way a sensible player would, many times over: the five strongest
// recruits, the best gear equipped, gold spent on training, upgrades picked, and a replay of the last
// cleared mission after a loss. Reports how often each mission is won on the first try and the
// company's level when it falls, so the difficulty curve can be tuned.
// node v2/test/campaign-test.js [runs]
import { createBattle, step, rng } from '../src/combat/battle.js';
import { MISSIONS, nextMission, missionById } from '../src/data/campaign.js';
import { BASES, SLOTS, itemStats } from '../src/data/items.js';
import * as P from '../src/game/progress.js';
import { UNITS } from '../src/data/units.js';

const RUNS = +process.argv[2] || 12;
const fight = (s, m, seed) => {
  const b = createBattle({ team: P.teamFor(s), foes: m.foes, level: m.level, might: (m.might || 1) * (+process.env.MIGHT || 1), seed });
  for (let i = 0; i < 60 * 95 && !b.result; i++) step(b, 1 / 60);
  return b;
};
const score = (it) => Object.values(itemStats(it)).reduce((a, v) => a + v, 0);
function manage(s, r) {
  // the five strongest, placed by class
  const keys = Object.keys(s.roster).sort((a, b) => P.power(s, b) - P.power(s, a)).slice(0, 5);
  s.team = []; for (const k of keys) s.team.push({ key: k, slot: P.freeSlot(s, k) });
  for (const k of keys) {
    s.roster[k].ups.forEach((u, t) => { if (!u && s.roster[k].level >= P.UPGRADE_LEVELS[t]) P.pickUpgrade(s, k, t, P.upgradeChoices(k, t)[r() < 0.5 ? 0 : 1].id); });
    for (const sl of SLOTS) {
      const best = s.inv.filter((it) => BASES[it.base].slot === sl && (!P.wearer(s, it.uid) || !keys.includes(P.wearer(s, it.uid)))).sort((a, b) => score(b) - score(a))[0];
      const cur = s.roster[k].gear[sl] && P.itemByUid(s, s.roster[k].gear[sl]);
      if (best && (!cur || score(best) > score(cur))) P.equip(s, k, best.uid);
    }
  }
  // spend gold: training first, then upgrades on worn gear, keeping a little
  for (let guard = 0; guard < 200; guard++) {
    const opts = [];
    for (const k of keys) for (const st of Object.keys(P.TRAIN)) { const rk = s.roster[k].train[st]; if (rk < P.TRAIN_MAX && rk < s.roster[k].level) opts.push([P.trainCost(rk), () => P.train(s, k, st)]); }
    opts.sort((a, b) => a[0] - b[0]);
    if (!opts.length || opts[0][0] > s.gold) break;
    opts[0][1]();
  }
}

const stats = MISSIONS.map(() => ({ tries: 0, firstWins: 0, level: 0, n: 0 }));
let battles = 0, grind = 0;
for (let run = 0; run < RUNS; run++) {
  const s = P.newSave(), r = rng(1000 + run);
  let seed = run * 7919;
  for (let guard = 0; guard < 400; guard++) {
    const m = nextMission(s.cleared); if (!m) break;
    manage(s, r);
    const i = MISSIONS.indexOf(m), st = stats[i];
    const b = fight(s, m, seed++); battles++;
    const firstTry = !st['run' + run]; st['run' + run] = true; st.tries++;
    const rw = P.grantRewards(s, m.id, b, r);
    if (rw.win) { if (firstTry) st.firstWins++; st.level += P.avgLevel(s); st.n++; }
    else {
      // grind the last cleared mission once before trying again
      const prev = MISSIONS[i - 1];
      if (prev) { manage(s, r); const g = fight(s, prev, seed++); battles++; grind++; P.grantRewards(s, prev.id, g, r); }
    }
  }
  if (nextMission(s.cleared)) console.log('run', run, 'stuck at', nextMission(s.cleared).id);
}
console.log('mission                     lv  first-try  tries/run  company lv at clear');
MISSIONS.forEach((m, i) => { const st = stats[i]; console.log(`${m.name.padEnd(26)} ${String(m.level).padStart(3)}  ${String(Math.round(st.firstWins / RUNS * 100)).padStart(6)}%  ${(st.tries / RUNS).toFixed(1).padStart(9)}  ${(st.level / Math.max(1, st.n)).toFixed(1).padStart(10)}`); });
console.log(`battles per run ${(battles / RUNS).toFixed(1)}, grind battles per run ${(grind / RUNS).toFixed(1)}`);
