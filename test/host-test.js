// The host (crown): the player's fighter follows input; defence stays automatic; a fight
// played with the same seed and the same inputs (by sim frame) replays identically.
// Usage: node test/host-test.js
'use strict';
const assert = require('assert');
const Sim = require('../js/sim.js');
const DT = 1 / 60;

function match(seed) {
  const s = Sim.createMatch({ seed, scenario: 'path', party: [{ key: 'kael', level: 2 }, { key: 'eirynMage', level: 2 }] });
  Sim.begin(s);
  return s;
}
const run = (s, sec, each) => { for (let i = 0; i < sec / DT && !s.result; i++) { if (each) each(s); Sim.step(s, DT); s.fx.length = 0; s.log.length = 0; } };

// No input: the host holds still (the AI no longer walks him in).
{
  const s = match(1), k = s.byId.kael;
  assert.ok(Sim.setHost(s, 'kael'));
  const x0 = k.x, y0 = k.y;
  run(s, 0.8);
  assert.ok(Math.hypot(k.x - x0, k.y - y0) < 0.5, 'host idles without input');
}
// Joystick: moves the way it points.
{
  const s = match(2), k = s.byId.kael;
  Sim.setHost(s, 'kael');
  const x0 = k.x;
  Sim.input(s, { mx: -1, my: 0 });
  run(s, 1.2);
  assert.ok(k.x < x0 - 2.5, `moves on the joystick (${(x0 - k.x).toFixed(2)} m)`);
}
// Attack: the nearest foe in reach is struck.
{
  const s = match(3), k = s.byId.kael;
  Sim.setHost(s, 'kael');
  const g = s.units.find((u) => u.team === 'bandit');
  run(s, 1.0); // past the openers
  k.x = g.x + 1.6; k.y = g.y; k.cd = 0;
  Sim.input(s, { attack: true });
  let swung = false;
  run(s, 0.4, () => { if (k.state === 'attack' && k.act) swung = true; });
  assert.ok(swung, 'attack button swings at the nearest foe');
}
// Special: a full meter fires the heavy art.
{
  const s = match(4), k = s.byId.kael;
  Sim.setHost(s, 'kael');
  k.superMeter = 100;
  const g = s.units.find((u) => u.team === 'bandit');
  k.x = g.x + 2; k.y = g.y;
  Sim.input(s, { special: true });
  let fired = false;
  run(s, 0.3, () => { if (s.cutscene && s.cutscene.unit === k) fired = true; });
  assert.ok(fired, 'special fires the heavy art');
}
// Crown off: the AI takes over again.
{
  const s = match(5), k = s.byId.kael;
  Sim.setHost(s, 'kael');
  Sim.setHost(s, null);
  const x0 = k.x;
  run(s, 1.5);
  assert.ok(Math.abs(k.x - x0) > 1, 'AI resumes when the crown is off');
}
// Defence stays automatic for the host.
{
  let defended = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const s = match(seed), k = s.byId.kael;
    Sim.setHost(s, 'kael');
    let dodges = 0;
    for (let i = 0; i < 20 / DT && !s.result; i++) { Sim.step(s, DT); for (const f of s.fx) if ((f.type === 'parry' || f.type === 'dodge') && f.v === 'kael') dodges++; s.fx.length = 0; s.log.length = 0; }
    if (dodges) defended++;
  }
  assert.ok(defended >= 6, `the host still parries and dodges on his own (${defended}/12 fights)`);
}
// Replays: inputs keyed by frame give the same fight.
{
  const script = [[1, { host: 'kael' }], [20, { mx: -1, my: 0.2 }], [70, { mx: 0, my: 0, attack: true }], [200, { attack: false, mx: 0.5, my: -0.5 }], [260, { mx: 0, my: 0, attack: true }], [400, { host: 'eirynMage' }], [401, { attack: true }], [700, { host: null }]];
  const play = () => {
    const s = match(9);
    let i = 0;
    while (!s.result && s.t < 120) {
      while (i < script.length && (s.frame || 0) + 1 >= script[i][0]) {
        const o = script[i][1];
        if ('host' in o) Sim.setHost(s, o.host); else Sim.input(s, o);
        i++;
      }
      Sim.step(s, DT); s.fx.length = 0; s.log.length = 0;
    }
    return JSON.stringify([s.t, s.result, s.units.map((u) => [u.id, u.hp, +u.x.toFixed(5), +u.y.toFixed(5)])]);
  };
  assert.strictEqual(play(), play(), 'same inputs, same fight');
}
console.log('host ok');
