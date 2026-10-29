// Expeditions: every region's map, for many seeds, can be crossed from the gate to the boss; rows that
// bring a hero along have only that mission; every place resolves (treasure, camp, pedlar, events) and
// wounds stay between 5% and 100%.
// node v2/test/expedition-test.js
import assert from 'assert';
import { REGIONS, missionsIn } from '../src/data/campaign.js';
import { rng } from '../src/combat/battle.js';
import * as P from '../src/game/progress.js';
import * as X from '../src/game/expedition.js';

const kinds = {};
for (const R of REGIONS) for (let seed = 1; seed <= 40; seed++) {
  const exp = X.generate(R.id, seed * 977), ms = missionsIn(R.id);
  assert.equal(exp.rows, ms.length, `${R.id}: a row per mission`);
  const boss = exp.nodes.find((n) => n.type === 'boss');
  assert.equal(boss.mission, ms[ms.length - 1].id);
  for (const n of exp.nodes) {
    kinds[n.type] = (kinds[n.type] || 0) + 1;
    assert.ok(X.NODE[n.type], 'type ' + n.type);
    if (n !== boss) assert.ok(n.next.length, `${R.id}/${seed} ${n.id} leads nowhere`);
    for (const q of n.next) assert.equal(X.nodeOf(exp, q).row, n.row + 1, 'links go one row on');
    if (n.row > 0) assert.ok(exp.nodes.some((p) => p.next.includes(n.id)), `${n.id} unreachable`);
    if (n.mission) assert.ok(ms.some((m) => m.id === n.mission));
  }
  // a row whose mission brings a hero: that mission alone
  ms.slice(0, -1).forEach((m, i) => { if (m.recruit) { const row = exp.nodes.filter((n) => n.row === i); assert.equal(row.length, 1); assert.equal(row[0].mission, m.id); } });
  assert.ok(exp.nodes.some((n) => n.row === exp.rows - 2 && n.type === 'camp') || exp.nodes.filter((n) => n.row === exp.rows - 2).length === 1, 'a fire before the boss');
  // walk it: random choices, every place resolved
  const s = P.newSave(); P.spin(s, () => 0.3); s.run.exp = exp; s.gold = 2000; const r = rng(seed);
  for (let guard = 0; guard < 20; guard++) {
    const opts = X.reachable(exp); if (!opts.length) break;
    const n = X.enter(s, opts[Math.floor(r() * opts.length)]); assert.ok(n);
    if (n.type === 'treasure') { const t = X.openTreasure(s, n, r); assert.ok(t.gold > 0 && t.item); }
    else if (n.type === 'camp') { X.camp(s, n, r() < 0.5 ? 'rest' : 'train', r); if (s.run.pick) P.chooseBoon(s, s.run.pick[0]); }
    else if (n.type === 'shop') { for (const w of X.shopWares(s, n)) X.buy(s, n, w.id, r); if (s.run.pick) P.chooseBoon(s, s.run.pick[0]); }
    else if (n.type === 'event') { const ev = X.eventFor(exp, n); const out = X.choose(s, n, Math.floor(r() * ev.choices.length), r) || X.choose(s, n, ev.choices.length - 1, r); assert.ok(out, ev.id); if (s.run.pick) P.chooseBoon(s, s.run.pick[0]); if (out.fight) X.complete(s, n.id); }
    else { // a fight: some wounds
      const fake = { units: Object.keys(s.roster).map((k) => ({ key: k, team: 'ally', hp: 300, max: 1000, state: r() < 0.3 ? 'ko' : 'idle' })) };
      X.afterFight(s, fake); X.complete(s, n.id);
    }
    for (const k of Object.keys(s.roster)) { const h = X.hpOf(s, k); assert.ok(h >= 0.05 && h <= 1, `wound ${h}`); }
    if (n.type === 'boss') break;
  }
  assert.ok(exp.done.includes(boss.id), `${R.id}/${seed}: never reached the boss`);
}
// an elite is the mission, harder
{ const exp = X.generate('r2', 5), m = missionsIn('r2')[3], spec = P.battleSpec(m), e = X.fightSpec(exp, { type: 'elite' }, spec);
  assert.ok(e.might > spec.might && e.elites.length >= spec.elites.length); }
console.log('places', JSON.stringify(kinds));
console.log('events', X.EVENTS.length);
console.log('expedition ok');
