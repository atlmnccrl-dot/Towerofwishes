// Combat checks: many seeded fights on auto. No NaN, nobody leaves the arena, no timeouts;
// reports the win rate and fight length.  node v2/test/sim-test.js [fights]
import { createFight, step, command } from '../src/combat/sim.js';
const N = +process.argv[2] || 200, DT = 1 / 60;
let wins = 0, timeouts = 0, bad = 0, total = 0, specials = 0;
for (let s = 1; s <= N; s++) {
  const f = createFight('clearing', { seed: s, auto: true });
  while (!f.result) {
    step(f, DT);
    for (const e of f.events) if (e.type === 'special') specials++;
    for (const u of f.units) {
      if (!Number.isFinite(u.x) || !Number.isFinite(u.y) || !Number.isFinite(u.hp)) { bad++; console.error('NaN', s, u.id); break; }
      if (u.state !== 'flee' && !u.fled && (Math.abs(u.x) > f.arena.w / 2 + 0.01 || Math.abs(u.y) > f.arena.h / 2 + 0.01)) { bad++; console.error('outside', s, u.id, u.x, u.y); }
    }
    if (bad) break;
  }
  if (f.result === 'win') wins++;
  if (f.result === 'timeout') timeouts++;
  total += f.t;
  if (bad) break;
}
// the commands work: targeting, regroup, a special from a full meter
{ const f = createFight('clearing', { seed: 7 });
  command(f, { type: 'target', id: 'knife' }); if (f.target !== 'knife') { bad++; console.error('target'); }
  command(f, { type: 'target', id: 'lookout' }); if (f.target !== null) { bad++; console.error('lookout is not a target'); }
  command(f, { type: 'regroup' }); if (!(f.regroupT > 0)) { bad++; console.error('regroup'); }
  const k = f.units.find((u) => u.id === 'kael'); k.meter = 100; command(f, { type: 'special', id: 'kael' }); if (k.state !== 'special') { bad++; console.error('special'); } }
console.log(`win ${Math.round(wins / N * 100)}%  timeouts ${timeouts}  avg ${(total / N).toFixed(1)}s  specials/fight ${(specials / N).toFixed(2)}`);
if (bad || timeouts) { console.error('FAILED'); process.exit(1); }
console.log('sim ok');
