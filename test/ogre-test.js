// The Ogre must fight back (Director's Bible S13): it swings at least every 3 s when it
// isn't staggered, is staggered or down for at most 15% of the fight, every win plays the
// 60% throw and the 35% charge and ends with the ogre dead on screen, and the pair can win
// on auto. With ALLOUT=1 a simple viewer presses All Out when it is ready (the gain).
// Usage: node test/ogre-test.js [matches] [level]
'use strict';
const assert = require('assert');
const Sim = require('../js/sim.js');

const N = Number(process.argv[2]) || 40;
const LEVEL = Number(process.argv[3]) || 3;
const DT = 1 / 60;
let badWins = 0, wins = 0, time = 0, stag = 0, swings = 0, worstGap = 0, gapSum = 0, gapN = 0, timeouts = 0, phases = { throw: 0, charge: 0 };
const loud = process.env.VERBOSE;
for (let seed = 1; seed <= N; seed++) {
  const s = Sim.createMatch({ seed, scenario: 'ogre', party: [{ key: 'kael', level: LEVEL }, { key: 'eirynMage', level: LEVEL }], mods: { approach: 'ready' } });
  Sim.begin(s);
  const allOut = process.env.ALLOUT;
  const ogre = s.units.find((u) => u.key === 'ogre');
  let wasAttacking = false, lastSwing = null, busy = 0, st = 0, gapMax = 0;
  while (!s.result && s.t < 240) {
    if (allOut && Sim.allOutReady(s) && s.lead.sta >= 80 && Math.hypot(ogre.x - s.lead.x, ogre.y - s.lead.y) < 3) Sim.triggerAllOut(s);
    Sim.step(s, DT);
    const free = Sim.inFight(ogre) && !s.cutscene && !s.bossBeat;
    const stun = ogre.state === 'stagger' || ogre.state === 'down';
    if (stun) st += DT;
    const attacking = ogre.state === 'attack';
    if (attacking && !wasAttacking) { swings++; if (lastSwing != null) { gapMax = Math.max(gapMax, s.t - lastSwing - busy); gapSum += s.t - lastSwing - busy; gapN++; } lastSwing = s.t; busy = 0; }
    if (!free || stun) busy += DT;
    wasAttacking = attacking;
    s.fx.length = 0; s.log.length = 0;
  }
  if (!s.result) timeouts++;
  if (s.result && s.result.outcome === 'win') {
    wins++;
    if (!(s.bossBeats.done.throw && s.bossBeats.done.charge && ogre.dead && ogre.state === 'out')) badWins++;
  }
  time += s.t; stag += st / s.t; worstGap = Math.max(worstGap, gapMax);
  for (const k of Object.keys(phases)) if (s.bossBeats && s.bossBeats.done[k]) phases[k]++;
  if (loud) console.log(seed, s.result && s.result.outcome, s.t.toFixed(1), 'stagger', (st / s.t * 100).toFixed(0) + '%', 'gap', gapMax.toFixed(2), s.bossBeats);
}
const pct = (x) => (100 * x / N).toFixed(0) + '%';
console.log(`ogre lv${LEVEL}${process.env.ALLOUT ? ' +All Out' : ''}: win ${pct(wins)}  avg ${(time / N).toFixed(0)}s  swings/fight ${(swings / N).toFixed(1)}  avg gap ${(gapSum / Math.max(1, gapN)).toFixed(2)}s  worst gap ${worstGap.toFixed(2)}s  staggered ${(100 * stag / N).toFixed(1)}%  timeouts ${timeouts}  throw ${phases.throw}/${N} charge ${phases.charge}/${N}`);
if (process.env.MEASURE) process.exit(0);
assert.strictEqual(timeouts, 0, 'no timeouts');
if (!process.env.ALLOUT) {
  assert.ok(stag / N <= 0.15, 'staggered at most 15% of the fight');
  assert.ok(worstGap <= 3.0, 'swings at least every 3 s when free');
  assert.ok(wins / N >= 0.6, 'winnable on auto');
} else assert.ok(wins / N >= 0.85, 'All Out is a clear gain');
assert.strictEqual(badWins, 0, 'every win plays both beats and the ogre dies on screen');
console.log('ogre ok');
