// Plays the whole campaign the way a casual player would, many times over: region by region, as
// expeditions (the wheel's leader, a path through the region's places, wounds, camps, boons), with the
// strongest five, the best gear and the upgrade picks. A lost fight ends the expedition; the next one
// starts from the gate with everything earned kept. Reports, per region, how many expeditions it takes
// and how fights go, so the difficulty can be judged.
// node v2/test/campaign-test.js [runs]
import { rng } from '../src/combat/battle.js';
import { walk, manage } from './player.js';
import { REGIONS, missionsIn } from '../src/data/campaign.js';
import * as P from '../src/game/progress.js';

const RUNS = +process.argv[2] || 8;
const rows = REGIONS.map(() => ({ exps: 0, firstOk: 0, fights: 0, lost: 0, lvl: 0, kinds: {} }));
let stuck = 0; const endings = {};
for (let run = 0; run < RUNS; run++) {
  const s = P.newSave(), r = rng(1000 + run); let seed = run * 7919;
  // half the companies take the forks the other way round (Saltreach before the Greyfen, Frostmarch before the Abbey)
  const order = run % 2 ? ['r1', 'r3', 'r2', 'r5', 'r4', 'r6'] : REGIONS.map((r) => r.id);
  order.map((id) => REGIONS.find((r) => r.id === id)).forEach((R) => {
    const ri = REGIONS.indexOf(R);
    const st = rows[ri], seal = missionsIn(R.id).slice(-1)[0];
    let tries = 0;
    while (!s.cleared[seal.id] && tries < 30) {
      tries++; st.exps++;
      if (!s.run) P.spin(s, r);
      P.startExpedition(s, R.id, r);
      for (let g = 0; g < 30 && s.run; g++) {
        manage(s, r, true);
        const out = walk(s, r, seed++); if (!out) break;
        if (out.battle) { st.fights++; const k = out.node.type; st.kinds[k] = st.kinds[k] || [0, 0]; st.kinds[k][0]++; if (out.win) st.kinds[k][1]++; else st.lost++; }
      }
      if (s.cleared[seal.id] && tries === 1) st.firstOk++;
      if (s.run) P.abandonRun(s);
    }
    if (!s.cleared[seal.id]) { stuck++; console.log('run', run, 'stuck in', R.name); }
    st.lvl += P.avgLevel(s);
  });
  manage(s, r, true); endings[s.story.ending || 'none'] = (endings[s.story.ending || 'none'] || 0) + 1;
}
console.log('region                 expeditions  first-try ok  fights/exp  won   fight/elite/boss win%     company lv');
REGIONS.forEach((R, i) => {
  const st = rows[i], pct = (k) => (st.kinds[k] ? Math.round((st.kinds[k][1] / st.kinds[k][0]) * 100) + '%' : '-');
  console.log(`${R.name.padEnd(22)} ${(st.exps / RUNS).toFixed(1).padStart(11)} ${String(Math.round((st.firstOk / RUNS) * 100) + '%').padStart(13)} ${(st.fights / st.exps).toFixed(1).padStart(11)}  ${String(Math.round(((st.fights - st.lost) / Math.max(1, st.fights)) * 100) + '%').padStart(4)}   ${[pct('fight'), pct('elite'), pct('boss')].join(' / ').padStart(20)}   ${(st.lvl / RUNS).toFixed(1).padStart(8)}`);
});
console.log(stuck ? `${stuck} companies stuck` : 'no company stuck');
console.log('endings', JSON.stringify(endings));
