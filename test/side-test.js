// Side missions, dungeon rooms, the yard and arcade waves: win rates and invariants.
// Usage: node test/side-test.js [matchesPerCase]
'use strict';
const Sim = require('../js/sim.js');
const N = Number(process.argv[2]) || 20;
const DT = 1 / 60;
const P = (lv, ...keys) => keys.map((key) => ({ key, level: lv }));
const CASES = [
  ['training ren', 'training', P(1, 'ren')],
  ['training mara', 'training', P(1, 'mara')],
  ['training brannoc', 'training', P(1, 'brannoc')],
  ['cart ren+kael+eiryn', 'cart', P(3, 'ren', 'kael', 'eirynMage')],
  ['cart mara+kael+eiryn', 'cart', P(3, 'mara', 'kael', 'eirynMage')],
  ['cart brannoc+kael+eiryn', 'cart', P(3, 'brannoc', 'kael', 'eirynMage')],
  ['stray ren+kael+eiryn', 'stray', P(3, 'ren', 'kael', 'eirynMage')],
  ['stray mara+kael+eiryn', 'stray', P(3, 'mara', 'kael', 'eirynMage')],
  ['stray brannoc+kael+eiryn', 'stray', P(3, 'brannoc', 'kael', 'eirynMage')],
  ['crossing ren+kael+eiryn', 'crossing', P(3, 'ren', 'kael', 'eirynMage')],
  ['crossing mara+kael+eiryn', 'crossing', P(3, 'mara', 'kael', 'eirynMage')],
  ['crossing brannoc+kael+eiryn', 'crossing', P(3, 'brannoc', 'kael', 'eirynMage')],
  ['deep1 brannoc+kael+eiryn', 'deep1', P(4, 'brannoc', 'kael', 'eirynMage')],
  ['deep2 ren+kael+eiryn', 'deep2', P(4, 'ren', 'kael', 'eirynMage')],
  ['deep3 mara+kael+eiryn', 'deep3', P(4, 'mara', 'kael', 'eirynMage')],
  ['deep3 ren+kael+eiryn', 'deep3', P(4, 'ren', 'kael', 'eirynMage')],
];
let failures = 0;
function run(scenario, party, seed, limit) {
  const s = Sim.createMatch({ seed, scenario, party });
  while (!s.result && s.t < limit) {
    Sim.step(s, DT);
    for (const u of s.units) if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) { failures++; break; }
    s.fx.length = 0; s.log.length = 0;
  }
  return s;
}
for (const [name, sc, party] of CASES) {
  let win = 0, time = 0, timeouts = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = run(sc, party, seed, 240);
    if (!s.result) timeouts++; else if (s.result.outcome === 'win') win++;
    time += s.t;
  }
  if (timeouts) failures++;
  console.log(`${name.padEnd(28)} win ${String(Math.round((100 * win) / N)).padStart(3)}%  avg ${(time / N).toFixed(0).padStart(3)}s  timeouts ${timeouts}`);
}
// Arcade: it must end (in a loss) and clear some waves.
let waves = 0;
for (let seed = 1; seed <= Math.min(N, 8); seed++) {
  const s = run('arcade', P(3, 'ren', 'kael', 'eirynMage'), seed, 900);
  if (!s.result) { failures++; console.error('arcade did not end'); }
  waves += s.result ? s.result.waves : 0;
}
console.log(`arcade ren+kael+eiryn lv3: ${(waves / Math.min(N, 8)).toFixed(1)} waves cleared on average`);
if (failures) { console.error(failures + ' failures'); process.exit(1); }
console.log('side ok');
