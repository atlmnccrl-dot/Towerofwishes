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

// a new company: three recruits, all on the team, mission one open and two closed
let s = P.newSave();
assert.deepEqual(Object.keys(s.roster).sort(), [...START_ROSTER].sort());
assert.equal(s.team.length, 3);
assert.ok(isOpen(s.cleared, MISSIONS[0]) && !isOpen(s.cleared, MISSIONS[1]));
for (const m of MISSIONS) for (const [k] of m.foes) assert.ok(k in (await import('../src/data/units.js')).ENEMIES, m.id + ' foe ' + k);
for (const m of MISSIONS) if (m.recruit) assert.ok(UNITS[m.recruit], m.id + ' recruit');

// a loss changes nothing
const before = JSON.stringify(s);
let rw = P.grantRewards(s, 'r1m1', fake('lose', 0, s), r);
assert.equal(rw.win, false); assert.equal(JSON.stringify(s), before);

// a first clear: three stars, gold, xp, loot, a recruit who joins the team
rw = P.grantRewards(s, 'r1m1', fake('win', 0, s), r);
assert.equal(rw.stars, 3); assert.ok(rw.first && rw.gold > 0 && rw.loot.length === 2);
assert.equal(rw.joined, 'hesta'); assert.ok(s.roster.hesta && s.team.some((t) => t.key === 'hesta'));
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
s.roster.maren.level = 2; const hp0 = statsAt(UNITS.maren, 2, P.modsOf(s, 'maren')).max;
assert.ok(P.train(s, 'maren', 'hp')); assert.ok(P.train(s, 'maren', 'hp')); assert.ok(!P.train(s, 'maren', 'hp'));
assert.ok(statsAt(UNITS.maren, 2, P.modsOf(s, 'maren')).max > hp0);
s.gold = 0; s.roster.maren.level = 9; assert.ok(!P.train(s, 'maren', 'atk'));

// upgrades: only at their level, one per tier, only listed choices
s.roster.corvin.level = 3; assert.ok(!P.pickUpgrade(s, 'corvin', 0, 'empower'));
s.roster.corvin.level = 4; assert.equal(P.pendingUpgrade(s, 'corvin'), 0);
assert.ok(!P.pickUpgrade(s, 'corvin', 0, 'nope')); assert.ok(P.pickUpgrade(s, 'corvin', 0, 'empower')); assert.ok(!P.pickUpgrade(s, 'corvin', 0, 'quicken'));
assert.equal(P.modsOf(s, 'corvin').power, 0.3); assert.equal(P.pendingUpgrade(s, 'corvin'), -1);

// the team: at most five, slots swap
s = P.newSave(); for (const k of Object.keys(UNITS)) s.roster[k] = s.roster[k] || { level: 1, xp: 0, gear: { weapon: null, armor: null, charm: null }, train: { hp: 0, atk: 0, def: 0 }, ups: [null, null] };
for (const k of Object.keys(UNITS)) P.toggleTeam(s, k);
assert.equal(s.team.length, P.MAX_TEAM); assert.equal(new Set(s.team.map((t) => t.slot)).size, P.MAX_TEAM);
const a = s.team[0], b = s.team[1], sa = a.slot, sb = b.slot; P.moveSlot(s, sa, sb); assert.equal(a.slot, sb); assert.equal(b.slot, sa);

// a save survives JSON and drops what it no longer knows
const raw = JSON.parse(JSON.stringify(s)); raw.roster.ghost = raw.roster.corvin; raw.inv.push({ uid: 999, base: 'nothing', tier: 0 });
const back = P.loadSave(raw); assert.ok(!back.roster.ghost && !back.inv.some((x) => x.uid === 999)); assert.equal(back.team.length, s.team.length);
assert.equal(P.loadSave(null).gold, P.newSave().gold);
console.log('progress ok');
