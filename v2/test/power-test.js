// Checks that the power rating means something: plays the campaign as a casual player and, for every
// battle, compares the team's power with the mission's. Prints the win rate by power ratio and the
// ratio where the team wins three times in four (POWER_PAR in src/game/progress.js should put that at 1).
// node v2/test/power-test.js [runs]
import { rng } from '../src/combat/battle.js';
import { fight, manage } from './player.js';
import { MISSIONS, nextMission } from '../src/data/campaign.js';
import * as P from '../src/game/progress.js';

const RUNS = +process.argv[2] || 6, rows = [];
for (let run = 0; run < RUNS; run++) {
  const s = P.newSave(), r = rng(500 + run); let seed = run * 31337;
  for (let guard = 0; guard < 2000; guard++) {
    const m = nextMission(s.cleared); if (!m) break;
    manage(s, r, true);
    // the same team a few levels behind or ahead, for a spread of power ratios
    for (const off of [-8, -4, 4]) {
      const t = JSON.parse(JSON.stringify(s));
      for (const q of t.team) t.roster[q.key].level = Math.max(1, Math.min(P.MAX_LEVEL, t.roster[q.key].level + off));
      rows.push([P.teamPower(t) / P.missionPower(m), fight(t, m, seed++).result === 'win']);
    }
    const ratio = P.teamPower(s) / P.missionPower(m), b = fight(s, m, seed++);
    rows.push([ratio, b.result === 'win']);
    const rw = P.grantRewards(s, m.id, b, r);
    if (!rw.win) { const prev = MISSIONS[MISSIONS.indexOf(m) - 1]; if (prev) { manage(s, r, true); P.grantRewards(s, prev.id, fight(s, prev, seed++), r); } }
  }
}
const bins = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2, 99];
let lo = 0, par = null, bad = 0, last = -1;
console.log('power ratio   battles  win%');
for (const hi of bins) {
  const inBin = rows.filter(([x]) => x >= lo && x < hi);
  if (inBin.length) {
    const w = inBin.filter(([, win]) => win).length / inBin.length;
    console.log(`${lo.toFixed(2)}-${hi === 99 ? 'up  ' : hi.toFixed(2)}  ${String(inBin.length).padStart(8)}  ${String(Math.round(w * 100)).padStart(4)}%`);
    if (inBin.length >= 80 && last >= 0 && w + 0.12 < last) bad++;   // more power should never mean clearly fewer wins (bins big enough to trust)
    if (inBin.length >= 80) last = w;
    if (par == null && inBin.length >= 20 && w >= 0.75) par = lo;
  }
  lo = hi;
}
console.log('three wins in four from ratio', par);
if (bad) { console.error('FAILED: win rate falls as power rises'); process.exit(1); }
console.log('power ok');
