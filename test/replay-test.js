'use strict';
// A replay (same options and seed, All Out at the same moments) plays out exactly the same fight.
const Sim = require('../js/sim.js');
const assert = require('assert');
const DT = 1 / 60;
let checked = 0;
for (const sc of ['clearingKael', 'path', 'ogre', 'beasts']) {
  for (let seed = 1; seed <= 6; seed++) {
    const party = sc === 'beasts' ? [{ key: 'kael', level: 6 }, { key: 'eirynAsh', level: 6 }, { key: 'aerys', level: 6 }] : sc === 'clearingKael' ? [{ key: 'kael', level: 3 }] : [{ key: 'kael', level: 4 }, { key: 'eirynMage', level: 4 }];
    const opts = { seed, scenario: sc, party, intro: true };
    const a = Sim.createMatch(opts); Sim.begin(a);
    const inputs = [];
    while (!a.result && a.t < 240) {
      if (Sim.allOutReady(a) && a.t > 6 + seed && Sim.triggerAllOut(a)) inputs.push(a.t);
      Sim.step(a, DT); a.fx.length = 0; a.log.length = 0;
    }
    const b = Sim.createMatch(opts); Sim.begin(b);
    let i = 0;
    while (!b.result && b.t < 240) {
      while (i < inputs.length && b.t >= inputs[i] - 1e-9) { Sim.triggerAllOut(b); i++; }
      Sim.step(b, DT); b.fx.length = 0; b.log.length = 0;
    }
    assert.strictEqual(b.result.outcome, a.result.outcome, `${sc} ${seed}: outcome`);
    assert.strictEqual(b.result.time, a.result.time, `${sc} ${seed}: time`);
    assert.deepStrictEqual(b.stats, a.stats, `${sc} ${seed}: stats`);
    checked++;
  }
}
console.log(`replay ok (${checked} fights replayed exactly)`);
