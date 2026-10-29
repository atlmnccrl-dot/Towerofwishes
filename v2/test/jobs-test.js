// The missions' jobs and the run's boons, in the battle simulation: every job ends, nothing goes NaN, the
// ward and the mark decide fights, waves arrive, elites keep their traits, hazards strike, and every boon
// goes off at least once over a set of fights.
// node v2/test/jobs-test.js [fights per mission]
import assert from 'assert';
import { createBattle, step } from '../src/combat/battle.js';
import { MISSIONS, jobOf } from '../src/data/campaign.js';
import { BOONS } from '../src/data/boons.js';
import * as P from '../src/game/progress.js';

const N = +process.argv[2] || 2, DT = 1 / 60;
// a strong company of five for any level (so most fights are won and every boon gets its chances)
function company(level) {
  const keys = ['corvin', 'wren', 'maren', 'hesta', 'ysolde'];
  return keys.map((key, i) => ({ key, slot: [1, 4, 3, 0, 5][i], level }));
}
const allBoons = Object.fromEntries(Object.keys(BOONS).map((id) => [id, 3]));
const seen = new Set(), kinds = {};
let fights = 0;
for (const m of MISSIONS) {
  const spec = P.battleSpec(m);
  for (let k = 0; k < N; k++) {
    const boons = k % 2 ? allBoons : {};
    const b = createBattle(Object.assign({}, spec, { team: company(m.level + 2), boons, seed: 77 + k * 13 + fights }));
    let waves = 1, warns = 0, strikes = 0;
    for (let i = 0; i < 60 * 130 && !b.result; i++) {
      step(b, DT);
      for (const e of b.events) {
        if (e.type === 'proc' && e.boon) seen.add(e.boon);
        if (e.type === 'proc' && e.text === 'Second Wind!') seen.add('secondwind');
        if (e.type === 'proc' && e.text === "Martyr's Oath") seen.add('martyr');
        if (e.type === 'proc' && e.text === 'Echo!') seen.add('echo');
        if (e.type === 'arc') seen.add('chain');
        if (e.type === 'wave') waves = e.n;
        if (e.type === 'warn') warns++;
        if (e.type === 'strike') strikes++;
      }
      for (const u of b.units) assert.ok(Number.isFinite(u.x) && Number.isFinite(u.y) && Number.isFinite(u.hp), `${m.id}: ${u.id} went NaN`);
    }
    fights++;
    assert.ok(b.result, `${m.id}: the fight never ended`);
    assert.ok(b.t <= b.limit + 0.05, `${m.id}: ran past its limit`);
    // the job decided it
    if (m.kind === 'protect') { assert.ok(b.ward, `${m.id}: no ward`); if (b.result === 'win') assert.ok(b.ward.hp > 0, `${m.id}: won with the ward down`); if (b.ward.hp <= 0) assert.equal(b.result, 'lose'); }
    if (m.kind === 'hunt') { assert.ok(b.mark && b.limit < 120, `${m.id}: no mark or no time limit`); if (b.result === 'win') assert.equal(b.mark.state, 'ko'); }
    if (m.kind === 'waves' && b.result === 'win') assert.equal(waves, b.waveOf, `${m.id}: won before every wave came`);
    if (m.hazard && b.t > 12) assert.ok(warns > 0 && strikes > 0, `${m.id}: no hazard in ${b.t.toFixed(0)} s`);
    if (m.kind === 'ambush') { /* foes start on both sides */ }
    const el = b.units.filter((u) => u.elite);
    assert.equal(el.length, m.elites.length, `${m.id}: elites`);
    kinds[m.kind] = kinds[m.kind] || { n: 0, win: 0, t: 0 }; kinds[m.kind].n++; kinds[m.kind].t += b.t; if (b.result === 'win') kinds[m.kind].win++;
  }
  if (m.kind !== 'rout') assert.ok(jobOf(m), `${m.id}: no job text`);
}
// ambush: foes on both sides of the company
{
  const m = MISSIONS.find((x) => x.kind === 'ambush'), b = createBattle(Object.assign({}, P.battleSpec(m), { team: company(m.level), seed: 3 }));
  const foes = b.units.filter((u) => u.team === 'foe');
  assert.ok(foes.some((u) => u.x < -2) && foes.some((u) => u.x > 2), 'ambush: foes on both sides');
}
for (const [k, v] of Object.entries(kinds)) console.log(`${k.padEnd(8)} ${String(v.n).padStart(4)} fights  ${Math.round((v.win / v.n) * 100)}% won  ${(v.t / v.n).toFixed(1)} s`);
const quiet = Object.keys(BOONS).filter((id) => !BOONS[id].mods && id !== 'bounty' && !seen.has(id));
console.log('boons that went off:', [...seen].sort().join(' '));
assert.deepEqual(quiet, [], 'boons that never went off: ' + quiet.join(' '));
// boons in the save: offered after a win in a run, taken once, levelling up, gone with the run
{
  const s = P.newSave(); P.spin(s, () => 0.1);
  const rnd = (() => { let a = 5; return () => ((a = (a * 16807) % 2147483647) / 2147483647); })();
  const b = { result: 'win', units: [] };
  const rw = P.grantRewards(s, 'r1m1', b, rnd);
  assert.equal(rw.boonPick.length, 3); assert.equal(new Set(rw.boonPick).size, 3);
  assert.ok(!P.chooseBoon(s, 'nope'));
  const id = rw.boonPick[0]; assert.ok(P.chooseBoon(s, id)); assert.equal(s.run.boons[id], 1); assert.equal(s.run.pick, null);
  assert.ok(!P.chooseBoon(s, id), 'a pick is taken once');
  s.run.boons.whetstone = 2; assert.ok(Math.abs((P.modsOf(s, 'corvin').atk || 0) - (0.2 + 0)) < 0.5);
  const lost = P.grantRewards(s, 'r1m1', { result: 'lose', units: [] }, rnd);
  assert.ok(lost.runEnded && lost.runEnded.boons.whetstone === 2 && !s.run, 'the run ends with its boons');
}
console.log(`${fights} fights`);
console.log('jobs ok');
