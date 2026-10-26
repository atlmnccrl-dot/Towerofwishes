// The economy: daily bounties (three a day, counted from the day's start, claimed once), achievements
// (earned once, gems added), the shop (costs, what it gives) and store purchases (granted once).
// node v2/test/economy-test.js
import assert from 'assert/strict';
import { rng } from '../src/combat/battle.js';
import * as P from '../src/game/progress.js';
import * as E from '../src/game/economy.js';

const r = rng(3);
let s = P.newSave();
// bounties
const day = '2026-10-26', list = E.dailyBounties(s, day);
assert.equal(list.length, 3); assert.equal(new Set(list.map((b) => b.id)).size, 3);
assert.deepEqual(E.dailyBounties(s, day).map((b) => b.id), list.map((b) => b.id));       // same day, same three
const b0 = list[0]; assert.equal(E.claimBounty(s, b0.id), null);                          // not done yet
s.stats[b0.stat] += b0.need; s.daily.day = day;
const g = s.gold, gems = s.gems, got = E.claimBounty(s, b0.id);
assert.ok(got && s.gold === g + got.gold && s.gems === gems + got.gems); assert.equal(E.claimBounty(s, b0.id), null);
for (const b of list.slice(1)) s.stats[b.stat] += b.need;
const before = s.gems; for (const b of list.slice(1)) E.claimBounty(s, b.id);
assert.equal(s.gems - before, 2 * E.BOUNTY_GEMS + E.BOUNTY_ALL_GEMS);
assert.notDeepEqual(E.dailyBounties(s, '2026-10-27').map((b) => b.claimed), [true, true, true]);   // a new day resets
// achievements
s = P.newSave(); assert.equal(E.checkAchievements(s).length, 0);
s.stats.wins = 1; const a = E.checkAchievements(s); assert.ok(a.some((x) => x.id === 'first')); assert.equal(E.checkAchievements(s).length, 0);
// shop
s = P.newSave(); s.gold = 0; s.gems = 0; assert.equal(E.buy(s, 'crate', r), null);
s.gold = 10000; s.gems = 1000; const n = s.inv.length;
assert.equal(E.buy(s, 'crate', r).items.length, 1); assert.equal(E.buy(s, 'royal', r).items.length, 3); assert.equal(s.inv.length, n + 4);
assert.ok(s.inv.slice(-3).every((it) => it.tier >= 1));
const gold0 = s.gold; E.buy(s, 'pouch', r); assert.ok(s.gold > gold0);
const lv0 = s.roster.corvin.level; E.buy(s, 'tome', r); assert.ok(s.roster.corvin.level >= lv0);
assert.ok(s.stats.bought >= 4);
// store purchases: once per transaction, non-consumables once ever
s = P.newSave(); const gm = s.gems;
assert.ok(E.grantProduct(s, 'vael.gems.small', 'tx1')); assert.equal(E.grantProduct(s, 'vael.gems.small', 'tx1'), null); assert.equal(s.gems, gm + 100);
assert.ok(E.grantProduct(s, 'vael.starter', 'tx2')); assert.equal(E.grantProduct(s, 'vael.starter', 'tx3'), null); assert.ok(E.owns(s, 'vael.starter'));
assert.equal(E.grantProduct(s, 'nope', 'tx4'), null);
console.log('economy ok');
