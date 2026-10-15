// Win rates and invariants for every campaign scenario with each starter.
// Usage: node test/scenario-test.js [matchesPerCase]
'use strict';
const Sim = require('../js/sim.js');

const N = Number(process.argv[2]) || 60;
const DT = 1 / 60;
const STARTERS = ['ren', 'mara', 'brannoc'];

// A sensible viewer: All Out when the lead has stamina and two foes are close.
function policy(s) {
  if (!Sim.allOutReady(s)) return false;
  const k = s.lead;
  if (!k || k.sta < 80) return false;
  return s.units.filter((u) => u.team !== 'hero' && Sim.inFight(u) && Math.hypot(u.x - k.x, u.y - k.y) < 3.5).length >= 1;
}

const CASES = [
  { name: 'tutorial', scenario: 'tutorial' },
  ...STARTERS.flatMap((k) => ['charge', 'circle', 'follow'].map((ap) => ({ name: `clearing ${k} ${ap}`, scenario: 'clearing', party: [{ key: k, level: 1 }], mods: { approach: ap } }))),
  ...STARTERS.map((k) => ({ name: `path ${k}+kael`, scenario: 'path', party: [{ key: k, level: 2 }, { key: 'kael', level: 2 }] })),
  ...STARTERS.map((k) => ({ name: `path ${k}+eiryn`, scenario: 'path', party: [{ key: k, level: 2 }, { key: 'eirynMage', level: 2 }] })),
  ...STARTERS.map((k) => ({ name: `cave ${k}+kael+eiryn`, scenario: 'cave', party: [{ key: k, level: 3 }, { key: 'kael', level: 3 }, { key: 'eirynMage', level: 3 }] })),
  ...STARTERS.map((k) => ({ name: `ogre ${k}+kael+eiryn`, scenario: 'ogre', party: [{ key: k, level: 3 }, { key: 'kael', level: 3 }, { key: 'eirynMage', level: 3 }] })),
  ...STARTERS.map((k) => ({ name: `ogre ${k}+kael`, scenario: 'ogre', party: [{ key: k, level: 3 }, { key: 'kael', level: 3 }] })),
];

let failures = 0;
for (const c of CASES) {
  let win = 0, time = 0, timeouts = 0, supers = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = Sim.createMatch({ seed, scenario: c.scenario, party: c.party, mods: c.mods });
    while (!s.result && s.t < 240) {
      if (policy(s)) Sim.triggerAllOut(s);
      Sim.step(s, DT);
      for (const u of s.units) {
        if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) { failures++; if (failures < 5) console.error('NaN', c.name, u.id); }
      }
      s.fx.length = 0; s.log.length = 0;
    }
    if (!s.result) timeouts++; else if (s.result.outcome === 'win') win++;
    time += s.t; supers += s.stats.supers;
  }
  if (timeouts) failures++;
  console.log(`${c.name.padEnd(28)} win ${String(Math.round((100 * win) / N)).padStart(3)}%  avg ${(time / N).toFixed(0).padStart(3)}s  timeouts ${timeouts}  heavy arts ${(supers / N).toFixed(1)}`);
}
if (failures) { console.error(`${failures} failures`); process.exit(1); }
console.log('scenarios ok');
