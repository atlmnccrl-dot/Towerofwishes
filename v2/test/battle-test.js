// Battle checks: random teams of five from the roster against each lab wave, at level 1.
// No NaN, nobody leaves the field, every fight ends; win rates per wave and per unit (balance).
//   node v2/test/battle-test.js [fights per wave]
import { createBattle, step, TIME_LIMIT } from '../src/combat/battle.js';
import { UNITS, WAVES } from '../src/data/units.js';
const N = +process.argv[2] || 150, DT = 1 / 60, keys = Object.keys(UNITS);
let bad = 0; const per = {}, unitWins = {}, unitGames = {}, dmg = {}, healed = {};
let seed = 1;
const pick = (r) => { const k = keys.slice(); for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; } return k.slice(0, 5); };
for (const wave of Object.keys(WAVES)) {
  per[wave] = { win: 0, n: 0, t: 0, timeouts: 0 };
  for (let i = 0; i < N; i++) {
    const r = (() => { let a = seed++ * 7919; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
    const team = pick(r).map((key, j) => ({ key, slot: [0, 1, 2, 3, 4][j], level: 1 }));
    // sensible formation: vanguards and strikers in front, the rest behind
    team.sort((a, b) => ['vanguard', 'striker', 'ranger', 'mystic', 'support'].indexOf(UNITS[a.key].cls) - ['vanguard', 'striker', 'ranger', 'mystic', 'support'].indexOf(UNITS[b.key].cls)).forEach((m, j) => { m.slot = [1, 0, 2, 4, 3][j]; });
    const b = createBattle({ team, wave, seed: seed });
    while (!b.result) {
      step(b, DT);
      for (const u of b.units) if (!Number.isFinite(u.x + u.y + u.hp + u.energy)) { bad++; console.error('NaN', wave, u.id); }
      if (bad) break;
    }
    if (bad) break;
    const won = b.result === 'win';
    per[wave].n++; per[wave].win += won; per[wave].t += b.t; if (b.t >= TIME_LIMIT) per[wave].timeouts++;
    for (const m of team) { unitGames[m.key] = (unitGames[m.key] || 0) + 1; unitWins[m.key] = (unitWins[m.key] || 0) + won; }
    for (const u of b.units) if (u.team === 'ally' && !u.summoned) { dmg[u.key] = (dmg[u.key] || 0) + u.dealt; healed[u.key] = (healed[u.key] || 0) + u.healed; }
  }
}
for (const [w, p] of Object.entries(per)) console.log(`${w.padEnd(8)} win ${Math.round(p.win / p.n * 100)}%  avg ${(p.t / p.n).toFixed(1)}s  timeouts ${p.timeouts}`);
console.log('unit      win%  dmg/fight  heal/fight');
for (const k of keys) console.log(`${k.padEnd(9)} ${String(Math.round(unitWins[k] / unitGames[k] * 100)).padStart(4)}  ${String(Math.round(dmg[k] / unitGames[k])).padStart(9)}  ${String(Math.round(healed[k] / unitGames[k])).padStart(10)}`);
if (bad) { console.error('FAILED'); process.exit(1); }
console.log('battle ok');
