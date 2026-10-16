// The new manuscript's road and Tower fights: win rates and invariants.
// Usage: node test/book-test.js [matchesPerCase]
'use strict';
const Sim = require('../js/sim.js');
const N = Number(process.argv[2]) || 16;
const P = (lv, ...keys) => keys.map((key) => ({ key, level: lv }));
const CASES = [
  ['skyreaver', 'skyreaver', P(4, 'kael', 'eirynAsh'), 4],
  ['beasts', 'beasts', P(5, 'kael', 'eirynAsh', 'aerys', 'eloryn'), 5],
  ['night creature', 'nightcreature', P(5, 'kael', 'aerys', 'eloryn', 'braxen', 'eirynAsh'), 5],
  ['duel kael', 'duelKael', P(6, 'kael'), 6],
  ['duel braxen', 'duelBraxen', P(6, 'braxen'), 6],
  ['duel aerys', 'duelAerys', P(6, 'aerys'), 6],
  ['duel eloryn', 'duelEloryn', P(6, 'eloryn'), 6],
  ['duel nox', 'duelNox', P(6, 'nox'), 6],
  ['duel eiryn', 'duelEiryn', [{ key: 'eirynAsh', level: 6, super: 100 }], 6],
  ['calamity', 'calamity', P(6, 'kael', 'eirynAsh', 'aerys', 'nox', 'eloryn', 'braxen'), 6],
];
let failures = 0;
for (const [name, scenario, party, allyLevel] of CASES) {
  let win = 0, time = 0, timeouts = 0, supers = 0, arrived = 0;
  for (let seed = 1; seed <= N; seed++) {
    const s = Sim.createMatch({ seed, scenario, party, allyLevel });
    while (!s.result && s.t < 240) {
      Sim.step(s, 1 / 60);
      for (const u of s.units) if (!Number.isFinite(u.x) || !Number.isFinite(u.y)) { failures++; console.error('NaN', name, u.id); break; }
      s.fx.length = 0; s.log.length = 0;
    }
    if (!s.result) timeouts++; else if (s.result.outcome === 'win') win++;
    time += s.t; supers += s.stats.supers; if (s.arrived) arrived++;
  }
  if (timeouts) failures++;
  console.log(`${name.padEnd(16)} win ${String(Math.round((100 * win) / N)).padStart(3)}%  avg ${(time / N).toFixed(0).padStart(3)}s  timeouts ${timeouts}  heavy arts ${(supers / N).toFixed(1)}${arrived ? `  arrivals ${arrived}` : ''}`);
}
if (failures) { console.error(failures + ' failures'); process.exit(1); }
console.log('book fights ok');
