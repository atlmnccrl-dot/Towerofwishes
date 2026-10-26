// Plays the whole campaign the way a sensible player would, many times over: the five strongest
// recruits, the best gear equipped, gold spent on training, upgrades picked, and a replay of the last
// cleared mission after a loss. Reports how often each mission is won on the first try and the
// company's level when it falls, so the difficulty curve can be tuned.
// node v2/test/campaign-test.js [runs]
import { rng } from '../src/combat/battle.js';
import { fight as F, manage } from './player.js';
import { MISSIONS, nextMission, missionById } from '../src/data/campaign.js';
import * as P from '../src/game/progress.js';

const RUNS = +process.argv[2] || 12;
const fight = (s, m, seed) => F(s, m, seed, false, process.env.MIGHT ? (m.might || 1) * +process.env.MIGHT : undefined);

const stats = MISSIONS.map(() => ({ tries: 0, firstWins: 0, level: 0, n: 0 }));
let battles = 0, grind = 0;
for (let run = 0; run < RUNS; run++) {
  const s = P.newSave(), r = rng(1000 + run);
  let seed = run * 7919;
  for (let guard = 0; guard < 2000; guard++) {
    const m = nextMission(s.cleared); if (!m) break;
    manage(s, r, !process.env.OPTIMAL);
    const i = MISSIONS.indexOf(m), st = stats[i];
    const b = fight(s, m, seed++); battles++;
    const firstTry = !st['run' + run]; st['run' + run] = true; st.tries++;
    const rw = P.grantRewards(s, m.id, b, r);
    if (rw.win) { if (firstTry) st.firstWins++; st.level += P.avgLevel(s); st.n++; }
    else {
      // grind the last cleared mission once before trying again
      const prev = MISSIONS[i - 1];
      if (prev) { manage(s, r, !process.env.OPTIMAL); const g = fight(s, prev, seed++); battles++; grind++; P.grantRewards(s, prev.id, g, r); }
    }
  }
  if (nextMission(s.cleared)) console.log('run', run, 'stuck at', nextMission(s.cleared).id);
}
console.log('mission                         lv  first-try  tries/run  company lv at clear');
MISSIONS.forEach((m, i) => { const st = stats[i]; console.log(`${m.name.padEnd(30)} ${String(m.level).padStart(3)}  ${String(Math.round(st.firstWins / RUNS * 100)).padStart(6)}%  ${(st.tries / RUNS).toFixed(1).padStart(9)}  ${(st.level / Math.max(1, st.n)).toFixed(1).padStart(10)}`); });
console.log(`battles per run ${(battles / RUNS).toFixed(1)}, grind battles per run ${(grind / RUNS).toFixed(1)}`);
