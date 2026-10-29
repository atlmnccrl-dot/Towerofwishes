// The progression rules: a new save, rewards (a loss costs nothing), levels, recruits joining,
// gear, training, upgrades, and a save surviving a round trip through JSON.
// node v2/test/progress-test.js
import assert from 'assert/strict';
import { rng, statsAt } from '../src/combat/battle.js';
import { UNITS } from '../src/data/units.js';
import { MISSIONS, START_ROSTER, isOpen } from '../src/data/campaign.js';
import { BASES, itemStats } from '../src/data/items.js';
import * as P from '../src/game/progress.js';

const r = rng(5);
const fake = (result, fell = 0, s) => ({ result, units: s.team.map((t, i) => ({ team: 'ally', summoned: false, state: i < fell ? 'ko' : 'idle' })) });

// a new company: one hero, Corvin, on the team and the wheel; everyone else hidden until met. Mission one open, two closed
let s = P.newSave();
assert.deepEqual(Object.keys(s.roster), ['corvin']); assert.deepEqual(START_ROSTER, ['corvin']); assert.equal(s.team.length, 1);
assert.deepEqual(P.unlocked(s), ['corvin']); assert.equal(P.spin(s, r), 'corvin');
assert.ok(isOpen(s.cleared, MISSIONS[0]) && !isOpen(s.cleared, MISSIONS[1]));
for (const m of MISSIONS) for (const [k] of m.foes) assert.ok(k in (await import('../src/data/units.js')).ENEMIES, m.id + ' foe ' + k);

// a loss changes nothing
const strip = (x) => JSON.stringify(Object.assign({}, x, { stats: null, run: null, lastRun: null, runs: null }));   // (a loss ends the run: below)
const before = strip(s);
let rw = P.grantRewards(s, 'r1m1', fake('lose', 0, s), r);
assert.equal(rw.win, false); assert.equal(strip(s), before); assert.equal(s.stats.losses, 1);

// a first clear: three stars, gold, xp, loot, nobody met (a new run: the only hero leads)
assert.equal(P.spin(s, r), 'corvin');
rw = P.grantRewards(s, 'r1m1', fake('win', 0, s), r);
assert.equal(rw.stars, 3); assert.ok(rw.first && rw.gold > 0 && rw.loot.length === 2); assert.equal(rw.gems, 5);
assert.equal(rw.joined, null);
// heroes come slowly: the first is met on mission 4, and no more than four join in any region
assert.equal(MISSIONS.find((m) => m.recruit).id, 'r1m4');
for (const rid of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6']) assert.ok(MISSIONS.filter((m) => m.region === rid && (m.recruit || (P.sealOf(rid) === m && P.UNLOCKS[rid]))).length <= 4, rid);
s.roster.wren = JSON.parse(JSON.stringify(s.roster.corvin)); s.team.push({ key: 'wren', slot: 4 });   // (the tests below use a second hero)
assert.ok(isOpen(s.cleared, MISSIONS[1]));
// a replay: less gold, no second recruit, best stars kept
const g = s.gold; rw = P.grantRewards(s, 'r1m1', fake('win', 2, s), r);
assert.equal(rw.stars, 1); assert.ok(!rw.first && !rw.joined && s.gold - g < 200); assert.equal(s.cleared.r1m1, 3);

// levels: xp carries over, levels rise
const m = s.roster.corvin; m.level = 1; m.xp = 0;
assert.equal(P.addXp(s, 'corvin', P.xpNeed(1) + P.xpNeed(2) + 5), 2); assert.equal(m.level, 3); assert.equal(m.xp, 5);

// gear: equipping moves an item between recruits; mods include it; selling unequips
const it = s.inv[0], sl = BASES[it.base].slot;
assert.ok(P.equip(s, 'corvin', it.uid)); assert.equal(s.roster.corvin.gear[sl], it.uid);
assert.ok(P.equip(s, 'wren', it.uid)); assert.equal(s.roster.corvin.gear[sl], null); assert.equal(P.wearer(s, it.uid), 'wren');
for (const [k, v] of Object.entries(itemStats(it))) assert.ok(Math.abs((P.modsOf(s, 'wren')[k] || 0) - v - ((UNITS.wren.passive || {})[k] ? 0 : 0)) < 1e-9, k);
s.gold = 10000; const plus = it.plus || 0; assert.ok(P.upgradeItem(s, it.uid)); assert.equal(it.plus, plus + 1);
const n = s.inv.length; assert.ok(P.sellItem(s, it.uid)); assert.equal(s.inv.length, n - 1); assert.equal(s.roster.wren.gear[sl], null);

// training: ranks cost gold, cap at the recruit's level, and raise stats
s.roster.wren.level = 2; const hp0 = statsAt(UNITS.wren, 2, P.modsOf(s, 'wren')).max;
assert.ok(P.train(s, 'wren', 'hp')); assert.ok(P.train(s, 'wren', 'hp')); assert.ok(!P.train(s, 'wren', 'hp'));
assert.ok(statsAt(UNITS.wren, 2, P.modsOf(s, 'wren')).max > hp0);
s.gold = 0; s.roster.wren.level = 9; assert.ok(!P.train(s, 'wren', 'atk'));

// upgrades: only at their level, one per tier, only listed choices
s.roster.corvin.level = 3; assert.ok(!P.pickUpgrade(s, 'corvin', 0, 'empower'));
s.roster.corvin.level = 4; assert.equal(P.pendingUpgrade(s, 'corvin'), 0);
assert.ok(!P.pickUpgrade(s, 'corvin', 0, 'nope')); assert.ok(P.pickUpgrade(s, 'corvin', 0, 'empower')); assert.ok(!P.pickUpgrade(s, 'corvin', 0, 'quicken'));
assert.equal(P.modsOf(s, 'corvin').power, 0.55); assert.equal(P.pendingUpgrade(s, 'corvin'), -1);

// the team: at most five, slots swap
s = P.newSave(); for (const k of Object.keys(UNITS)) s.roster[k] = s.roster[k] || { level: 1, xp: 0, gear: { weapon: null, armor: null, charm: null }, train: { hp: 0, atk: 0, def: 0 }, ups: [null, null] };
for (const k of Object.keys(UNITS)) P.toggleTeam(s, k);
assert.equal(s.team.length, P.MAX_TEAM); assert.equal(new Set(s.team.map((t) => t.slot)).size, P.MAX_TEAM);
const a = s.team[0], b = s.team[1], sa = a.slot, sb = b.slot; P.moveSlot(s, sa, sb); assert.equal(a.slot, sb); assert.equal(b.slot, sa);

// a save survives JSON and drops what it no longer knows
const raw = JSON.parse(JSON.stringify(s)); raw.roster.ghost = raw.roster.corvin; raw.inv.push({ uid: 999, base: 'nothing', tier: 0 });
const back = P.loadSave(raw); assert.ok(!back.roster.ghost && !back.inv.some((x) => x.uid === 999)); assert.equal(back.team.length, s.team.length);
assert.equal(P.loadSave(null).gold, P.newSave().gold);
// heroic: tougher, its own stars, no recruit, more gems for three stars
s = P.newSave(); P.grantRewards(s, 'r1m1', fake('win', 0, s), r);
const g0 = s.gems; rw = P.grantRewards(s, 'r1m1', fake('win', 0, s), r, true);
assert.ok(rw.heroic && rw.first && s.heroic.r1m1 === 3 && s.gems - g0 === 10 && !rw.joined);
const spec = P.battleSpec(MISSIONS[0], true); assert.ok(spec.level > MISSIONS[0].level && spec.might > MISSIONS[0].might);
// four upgrade tiers, each with two choices for every recruit
for (const k of Object.keys(UNITS)) for (let t = 0; t < 4; t++) assert.equal(P.upgradeChoices(k, t).length, 2, k + t);
// an old save with two upgrade slots grows to four
const old0 = P.newSave(); P.spin(old0, () => 0); const old = JSON.parse(JSON.stringify(old0)); old.roster.corvin.ups = ['empower', null]; delete old.gems; delete old.stats;
const up = P.loadSave(old); assert.equal(up.roster.corvin.ups.length, 4); assert.equal(up.roster.corvin.ups[0], 'empower'); assert.equal(up.gems, 50); assert.equal(up.stats.wins, 0);
// a save code survives the round trip; a damaged one is refused
s = P.newSave(); s.gold = 777; const code = P.encodeSave(s);
assert.equal(P.decodeSave(code).gold, 777); assert.equal(P.decodeSave(code.slice(0, -2) + 'zz'), null); assert.equal(P.decodeSave('nonsense'), null);
// the Stronghold: materials from missions, level N needs region N's material, the bonuses apply
{
  const k = P.newSave(), win = { result: 'win', t: 30, units: [] }; P.spin(k, () => 0);
  assert.equal(P.buildState(k, 'forge'), 'short'); assert.equal(P.build(k, 'forge'), false);
  const rw = P.grantRewards(k, 'r1m1', win, rng(1)); assert.ok(rw.mats.r1 >= 5 && k.mats.r1 === rw.mats.r1);
  const boss = P.grantRewards(k, P.sealOf('r1').id, win, rng(1)); assert.equal(boss.mats.r1, 12);
  assert.deepEqual(P.sealsTaken(k), ['r1']);
  k.gold = 100000; k.mats.r1 = 100;
  assert.equal(P.buildState(k, 'forge'), 'ok'); assert.ok(P.build(k, 'forge')); assert.equal(P.keepLevel(k, 'forge'), 1);
  assert.equal(k.mats.r1, 100 - P.keepCost(1).n); assert.equal(k.gold, 100000 - P.keepCost(1).gold);
  k.cleared = {}; assert.equal(P.buildState(k, 'forge'), 'locked');     // level 2 needs the Greyfen's material: not reached yet
  k.cleared = Object.fromEntries(P.MISSIONS.filter((m) => m.region === 'r1').map((m) => [m.id, 1])); k.mats.r2 = 50;
  assert.equal(P.buildState(k, 'forge'), 'ok'); P.build(k, 'forge'); assert.equal(P.keepRank(k), 2);
  const it = { base: Object.keys(BASES)[0], tier: 0, plus: 0, uid: 999 };
  assert.ok(P.gearUpgradeCost(k, it) < P.gearUpgradeCost(P.newSave(), it));    // the Forge makes upgrades cheaper
  const before = statsAt(UNITS.corvin, 1, P.modsOf(k, 'corvin')).max;
  k.keep.shrine = 3; assert.ok(statsAt(UNITS.corvin, 1, P.modsOf(k, 'corvin')).max > before);   // the Shrine: more health
  for (const b of P.KEEP) k.keep[b.id] = P.KEEP_MAX; assert.equal(P.keepRank(k), 36); assert.equal(P.rankName(k), P.RANKS[6]);
  assert.equal(P.buildState(k, 'hall'), 'max'); assert.equal(P.nextBuild(k), null);
  const old = P.loadSave(JSON.parse(JSON.stringify(Object.assign(P.newSave(), { keep: undefined, mats: undefined }))));
  assert.deepEqual(old.keep, {}); assert.deepEqual(old.mats, {});          // older saves start with an empty Stronghold
}
// runs: the wheel only lands on unlocked heroes; the leader always fights; a loss ends the run; a seal
// ends it in triumph and frees the next hero
{
  const w = P.newSave(), rr = rng(9), seen = new Set();
  for (let i = 0; i < 50; i++) { w.run = null; seen.add(P.spin(w, rr)); }
  assert.deepEqual([...seen], ['corvin']);                                        // one hero, until others join
  for (const id of ['r1m4', 'r1m8']) { P.spin(w, rr); const j = P.grantRewards(w, id, fake('win', 0, w), rr); assert.ok(j.freed && P.HEROES.includes(j.joined), id); }
  seen.clear(); for (let i = 0; i < 200; i++) { w.run = null; seen.add(P.spin(w, rr)); }
  assert.deepEqual([...seen].sort(), ['corvin', 'maren', 'wren']);                 // never a hidden hero
  P.spin(w, () => 0.99); const lead = w.run.leader;
  assert.ok(w.team.some((t) => t.key === lead)); P.toggleTeam(w, lead); assert.ok(w.team.some((t) => t.key === lead));   // the leader cannot be benched
  P.bestTeam(w); assert.ok(w.team.some((t) => t.key === lead));
  assert.ok(P.modsOf(w, lead).hp >= P.LEAD_EDGE.hp);                              // the leader's own edge
  const won = P.grantRewards(w, 'r1m1', fake('win', 0, w), rr); assert.equal(w.run.wins, 1); assert.ok(!won.runEnded);
  const lost = P.grantRewards(w, 'r1m2', fake('lose', 0, w), rr);
  assert.equal(lost.runEnded.leader, lead); assert.equal(lost.runEnded.wins, 1); assert.equal(w.run, null);
  P.spin(w, rr);
  for (const m of MISSIONS.filter((x) => x.region === 'r1')) w.cleared[m.id] = w.cleared[m.id] || (m.id === 'r1m10' ? 0 : 1);
  delete w.cleared.r1m10;
  const seal = P.grantRewards(w, 'r1m10', fake('win', 0, w), rr);
  assert.equal(seal.joined, P.UNLOCKS.r1); assert.ok(w.roster[P.UNLOCKS.r1]); assert.ok(seal.runEnded && seal.runEnded.triumph); assert.equal(w.run, null);
  assert.ok(P.unlocked(w).includes(P.UNLOCKS.r1)); assert.equal(P.unlockedBy(P.UNLOCKS.r2).region, 'r2');
  for (const k of P.HEROES) assert.ok(UNITS[k] && P.LEADERS[k], k);               // every wheel hero exists and has a perk
  // a recruit met on the road joins the company on the first clear, fights, but never comes up on the wheel
  const rec = MISSIONS.find((x) => x.recruit && !P.HEROES.includes(x.recruit)), r2 = P.newSave(); P.spin(r2, rr);
  const met = P.grantRewards(r2, rec.id, fake('win', 0, r2), rr);
  assert.equal(met.joined, rec.recruit); assert.ok(!met.freed && !met.runEnded); assert.ok(r2.roster[rec.recruit]); assert.ok(!P.onWheel(rec.recruit));
  for (let i = 0; i < 100; i++) { r2.run = null; assert.ok(P.HEROES.includes(P.spin(r2, rr))); }
  assert.equal(P.unlockedBy(rec.recruit), rec);
  const recruits = MISSIONS.filter((x) => x.recruit).map((x) => x.recruit);
  assert.equal(new Set(recruits).size, recruits.length);                           // each recruit is met once
  const freed = Object.values(P.UNLOCKS);                                          // everyone: the first hero, met on the road, or freed by a boss
  assert.deepEqual([...START_ROSTER, ...recruits, ...freed].sort(), Object.keys(UNITS).sort());
}
console.log('progress ok');
