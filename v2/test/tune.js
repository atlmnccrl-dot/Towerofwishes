// Tunes every mission's foe strength (might) from simulated playthroughs: several companies play the
// campaign in order; at each mission, might is searched until a casual player (best team, auto-equip,
// upgrade picks; no training or gear upgrades) wins on the first try about TARGET of the time
// (bosses: BOSS), and every company at least FLOOR of the time, so no team makeup is ever stuck.
// Training and upgrading gear then make missions easier. Writes src/data/tuning.js.
// node v2/test/tune.js [runs]
import fs from 'fs';
import { rng } from '../src/combat/battle.js';
import { MISSIONS } from '../src/data/campaign.js';
import * as P from '../src/game/progress.js';
import { fight, manage } from './player.js';

const RUNS = +process.argv[2] || 8, TARGET = 0.75, BOSS = 0.55, SEEDS = 3, FLOOR = 0.33;
// half the companies always take the first upgrade option, half the second: both extremes must stay winnable
const runs = Array.from({ length: RUNS }, (_, i) => ({ s: P.newSave(), r: rng(500 + i), seed: 9000 + i * 7919, pick: i % 2 }));
const clone = (s) => JSON.parse(JSON.stringify(s));
const MIGHT = {};
// the average win rate over every company, and the worst company's (no team may be stuck)
function winRate(m, might) {
  let w = 0, n = 0, worst = 1;
  for (const run of runs) {
    const c = clone(run.s); manage(c, rng(run.seed), true, run.pick); let rw = 0;
    for (let k = 0; k < SEEDS; k++) { rw += fight(c, m, run.seed * 31 + k * 7 + Math.round(might * 1000), false, might).result === 'win' ? 1 : 0; n++; }
    w += rw; worst = Math.min(worst, rw / SEEDS);
  }
  return { avg: w / n, worst };
}
const t0 = Date.now();
for (const [i, m] of MISSIONS.entries()) {
  // the first two missions teach the game: nearly always won
  const target = { r1m1: 0.97, r1m2: 0.9 }[m.id] || (m.boss ? BOSS : TARGET);
  // win rate falls as might rises: bisect in log space
  let lo = Math.log(0.12), hi = Math.log(8);
  for (let it = 0; it < 8; it++) { const mid = (lo + hi) / 2, wr = winRate(m, Math.exp(mid)); if (wr.avg >= target && wr.worst >= FLOOR) lo = mid; else hi = mid; }
  const might = Math.round(Math.exp(lo) * 100) / 100;
  MIGHT[m.id] = might; m.might = might;
  // every company plays it (retrying after a loss, with one replay of the mission before)
  let tries = 0;
  for (const run of runs) {
    for (let g = 0; g < 8; g++) {
      manage(run.s, run.r, true, run.pick); tries++;
      const b = fight(run.s, m, run.seed++);
      if (P.grantRewards(run.s, m.id, b, run.r).win) break;
      if (i > 0) { const prev = MISSIONS[i - 1]; manage(run.s, run.r, true, run.pick); P.grantRewards(run.s, prev.id, fight(run.s, prev, run.seed++), run.r); }
    }
  }
  console.log(`${m.id.padEnd(6)} ${m.name.padEnd(28)} might ${might.toFixed(2)}  tries/run ${(tries / RUNS).toFixed(1)}  company lv ${P.avgLevel(runs[0].s).toFixed(1)}  ${((Date.now() - t0) / 1000) | 0}s`);
}
const body = Object.entries(MIGHT).map(([k, v]) => `${k}: ${v}`).join(', ');
fs.writeFileSync(new URL('../src/data/tuning.js', import.meta.url), `// How strong each mission's foes are beyond their level: health x might, attack x (1 + 0.6 (might - 1)).
// Written by test/tune.js from simulated playthroughs (a casual player wins about ${TARGET * 100}% of missions and
// ${BOSS * 100}% of boss fights on the first try); edit by re-running it.
export const MIGHT = { ${body} };
`);
console.log('wrote src/data/tuning.js');
