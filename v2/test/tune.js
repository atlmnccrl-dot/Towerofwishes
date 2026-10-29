// Tunes every mission's foe strength (might) from simulated expeditions. Several companies cross the
// regions in order as a casual player would (best team, auto-equip, upgrade picks, a path through each
// region's places, wounds, camps, boons). At each step of a region's road, the might of that step's
// mission is searched until the companies, as they arrive there (hurt or not, with the boons they
// have), win it about TARGET of the time (bosses: BOSS; the first steps of the first region: more), and
// every company at least FLOOR. Then every company takes its next step. A company that loses starts a
// new expedition from where it fell (fresh, without boons). Writes src/data/tuning.js.
// The road forks (Saltreach or the Greyfen second, Frostmarch or the Abbey fourth), and a region's foes
// are as strong as its place on the road: ORDER=alt tunes the other order, stored as id@tier, keeping the rest.
// node v2/test/tune.js [companies]      ORDER=alt node v2/test/tune.js [companies]
import fs from 'fs';
import { rng } from '../src/combat/battle.js';
import { REGIONS, missionsIn, MISSIONS } from '../src/data/campaign.js';
import { MIGHT as LIVE } from '../src/data/tuning.js';
import * as P from '../src/game/progress.js';
import * as X from '../src/game/expedition.js';
import { fight, walk, manage } from './player.js';

const RUNS = +process.argv[2] || 8, TARGET = 0.88, BOSS = 0.72, SEEDS = 5, FLOOR = 0.5;
const EARLY = { r1m1: 0.97, r1m2: 0.93, r1m3: 0.85 };
const companies = Array.from({ length: RUNS }, (_, i) => ({ s: P.newSave(), r: rng(500 + i), seed: 9000 + i * 7919 }));
const clone = (s) => JSON.parse(JSON.stringify(s));
const MIGHT = Object.assign({}, LIVE), t0 = Date.now();
const ORDER = process.env.ORDER === 'alt' ? ['r1', 'r3', 'r2', 'r5', 'r4', 'r6'] : REGIONS.map((r) => r.id);
// a company back on the road after a loss: a new expedition (and leader), placed at the step it fell on
function restart(c, rid, row) {
  if (c.s.run) P.abandonRun(c.s);
  P.spin(c.s, c.r); const exp = P.startExpedition(c.s, rid, c.r);
  if (row > 0) { const at = exp.nodes.find((n) => n.row === row - 1 && n.type === 'fight') || exp.nodes.find((n) => n.row === row - 1); exp.at = at.id; }
}
const rowNode = (c, row) => c.s.run.exp.nodes.find((n) => n.row === row && (n.type === 'fight' || n.type === 'boss'));
function winRate(m, row, might) {
  let w = 0, n = 0, worst = 1;
  for (const c of companies) if (!c.s.run) restart(c, m.region, row);
  for (const c of companies) {
    const s = clone(c.s); manage(s, rng(c.seed), true);
    let cw = 0;
    for (let k = 0; k < SEEDS; k++) { cw += fight(s, m, c.seed * 31 + k * 7 + Math.round(might * 1000), false, might, rowNode({ s }, row)).result === 'win' ? 1 : 0; n++; }
    w += cw; worst = Math.min(worst, cw / SEEDS);
  }
  return { avg: w / n, worst };
}
for (const R of ORDER.map((id) => REGIONS.find((r) => r.id === id))) {
  const list = missionsIn(R.id), seal = list[list.length - 1];
  for (const c of companies) restart(c, R.id, 0);
  for (const [row, m] of list.entries()) {
    const target = EARLY[m.id] || (m.boss ? BOSS : TARGET);
    // win rate falls as might rises: bisect in log space
    let lo = Math.log(0.05), hi = Math.log(10);
    for (let it = 0; it < 8; it++) { const mid = (lo + hi) / 2, wr = winRate(m, row, Math.exp(mid)); if (wr.avg >= target && wr.worst >= FLOOR) lo = mid; else hi = mid; }
    const might = Math.round(Math.exp(lo) * 100) / 100;
    // stored under its own id in its home place on the road, as id@tier elsewhere (the game reads both)
    const key = m.tier === REGIONS.indexOf(R) ? m.id : `${m.id}@${m.tier}`;
    MIGHT[key] = might; LIVE[key] = might; m.might = might;
    // every company takes its next step (and, at the boss, keeps at it until the Seal is taken)
    let losses = 0;
    for (const c of companies) {
      for (let g = 0; g < 12; g++) {
        if (!c.s.run) restart(c, R.id, row);
        manage(c.s, c.r, true);
        const before = c.s.run.exp.at ? X.nodeOf(c.s.run.exp, c.s.run.exp.at).row : -1;
        const out = walk(c.s, c.r, c.seed++);
        if (out && out.battle && !out.win) { losses++; continue; }
        if (m === seal ? c.s.cleared[seal.id] : c.s.run && c.s.run.exp.at && X.nodeOf(c.s.run.exp, c.s.run.exp.at).row > before) break;
      }
    }
    console.log(`${m.id.padEnd(6)} ${m.name.padEnd(28)} ${m.kind.padEnd(8)} might ${might.toFixed(2)}  losses ${losses}/${RUNS}  company lv ${P.avgLevel(companies[0].s).toFixed(1)}  ${((Date.now() - t0) / 1000) | 0}s`);
  }
  for (const c of companies) if (c.s.run) P.abandonRun(c.s);
}
for (const m of MISSIONS) if (MIGHT[m.id] == null) MIGHT[m.id] = 1;
const body = Object.entries(MIGHT).map(([k, v]) => `${/^\w+$/.test(k) ? k : `'${k}'`}: ${v}`).join(', ');
fs.writeFileSync(new URL('../src/data/tuning.js', import.meta.url), `// How strong each mission's foes are beyond their level: health x might, attack x (1 + 0.6 (might - 1)).
// Written by test/tune.js from simulated expeditions (a casual player arriving at a step of the road, as
// hurt and as blessed as the road left them, wins about ${TARGET * 100}% of fights and ${BOSS * 100}% of boss fights); re-run it after changes.
export const MIGHT = { ${body} };
`);
console.log('wrote src/data/tuning.js');
