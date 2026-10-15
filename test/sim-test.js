// Headless balance + sanity run for the arena simulation.
// Usage: node test/sim-test.js [matches]
'use strict';
const Sim = require('../js/sim.js');

const N = Number(process.argv[2]) || 300;
const DT = 1 / 60;
const LIMIT = 240; // seconds

// policy: when (if ever) the "player" presses All Out
const POLICIES = {
  never: () => false,
  asap: (s) => s.allOut.meter >= 1,
  // a smarter viewer: press when Kael is in melee with 2+ bandits
  smart: (s) => {
    if (s.allOut.meter < 1) return false;
    const k = s.byId.kael;
    const near = s.units.filter((u) => u.team === 'bandit' && Sim.alive(u) && Math.hypot(u.x - k.x, u.y - k.y) < 3);
    return near.length >= 2;
  },
};

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; if (failures < 10) console.error('FAIL:', msg); }
}

for (const [name, policy] of Object.entries(POLICIES)) {
  const out = { win: 0, loss: 0, timeout: 0 };
  let time = 0, kaelHp = 0, fled = 0, parries = 0, dodges = 0, read = 0, supers = 0, eirynDown = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = Sim.createMatch({ seed });
    while (!s.result && s.t < LIMIT) {
      if (policy(s)) Sim.triggerAllOut(s);
      Sim.step(s, DT);
      for (const u of s.units) {
        check(Number.isFinite(u.x) && Number.isFinite(u.y), `NaN position seed ${seed} ${u.id}`);
        if (!u.fleeing && !u.fled && u.state !== 'out') {
          const e = (u.x / Sim.ARENA.rx) ** 2 + (u.y / Sim.ARENA.ry) ** 2;
          check(e < 1.05, `${u.id} left arena seed ${seed} (${u.x.toFixed(2)},${u.y.toFixed(2)})`);
        }
        for (const o of Sim.ARENA.obstacles) {
          if (u.state === 'out') continue;
          const c = Sim.obstacleCenter(o, u.x, u.y);
          check(Math.hypot(u.x - c.x, u.y - c.y) > o.r + u.r - 0.08, `${u.id} inside ${o.kind} seed ${seed}`);
        }
      }
      s.fx.length = 0; s.log.length = 0;
    }
    if (!s.result) out.timeout++; else out[s.result.outcome]++;
    time += s.t;
    kaelHp += s.byId.kael.hp / s.byId.kael.maxHp;
    fled += s.stats.fled; parries += s.stats.parries; dodges += s.stats.dodges;
    read += s.stats.feintsRead; supers += s.stats.supers;
    eirynDown += s.byId.eiryn.state === 'out' ? 1 : 0;
  }
  const pct = (n) => ((100 * n) / N).toFixed(0) + '%';
  console.log(`[${name.padEnd(5)}] win ${pct(out.win)}  loss ${pct(out.loss)}  timeout ${out.timeout}  ` +
    `avg ${(time / N).toFixed(0)}s  kaelHP ${(100 * kaelHp / N).toFixed(0)}%  eirynDown ${pct(eirynDown)}  ` +
    `fled ${(fled / N).toFixed(2)}  parries ${(parries / N).toFixed(1)}  dodges ${(dodges / N).toFixed(1)}  ` +
    `feintsRead ${(read / N).toFixed(1)}  supers ${(supers / N).toFixed(2)}`);
}
if (failures) { console.error(`${failures} invariant failures`); process.exit(1); }
console.log('invariants ok');
