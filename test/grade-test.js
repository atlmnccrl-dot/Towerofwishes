'use strict';
const Sim = require('../js/sim.js');
const G = require('../js/grade.js');
const assert = require('assert');
// Win-only: a loss or a withdrawal has no grade.
let ranks = {}, graded = 0;
for (let seed = 1; seed <= 40; seed++) {
  const s = Sim.createMatch({ seed, scenario: 'clearingKael', party: [{ key: 'kael', level: 3 }] });
  while (!s.result && s.t < 240) { Sim.step(s, 1 / 60); s.fx.length = 0; s.log.length = 0; }
  const g = G.grade(s);
  if (s.result.outcome === 'win') { assert(g && 'SABCD'.includes(g.rank) && g.notes.length, 'a win is graded'); ranks[g.rank] = (ranks[g.rank] || 0) + 1; graded++; }
  else assert(g === null, 'a loss is not graded');
}
console.log('ranks over ' + graded + ' wins:', JSON.stringify(ranks));
assert(Object.keys(ranks).length >= 2, 'grades should vary with how the fight went');
assert(G.better('S', 'A') && !G.better('B', 'A') && G.better('D', undefined), 'ordering');
console.log('grade ok');
