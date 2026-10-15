// Tests for hearts and injuries. Usage: node test/progress-test.js
'use strict';
const assert = require('assert');
const Pg = require('../js/progress.js');

const MIN = 60 * 1000;
let t = 1_000_000;
let s = Pg.fresh(t);

// Win keeps hearts and heals fully.
s.injury.kael = { frac: 0.3, at: t };
Pg.applyResult(s, 'story', 'win', { kael: 0.2, eiryn: 0.5 }, t);
assert.strictEqual(s.hearts, 5);
assert.strictEqual(Pg.hpFrac(s, 'kael', t), 1);

// Surrender: no heart lost, team leaves injured and heals in under 8 minutes.
Pg.applyResult(s, 'story', 'surrender', { kael: 0.4, eiryn: 0 }, t);
assert.strictEqual(s.hearts, 5);
assert.strictEqual(Pg.hpFrac(s, 'kael', t), 0.4);
assert.strictEqual(Pg.hpFrac(s, 'eiryn', t), 0.1, 'a fallen unit leaves at the floor');
assert.ok(Pg.fullHealIn(s, 'eiryn', t) < Pg.HEART_MS, 'injuries heal faster than a heart refills');
assert.strictEqual(Pg.hpFrac(s, 'kael', t + 2 * MIN), 0.9);
assert.strictEqual(Pg.hpFrac(s, 'kael', t + 10 * MIN), 1);

// Loss (whole team down): exactly one heart, team revived.
Pg.applyResult(s, 'story', 'loss', { kael: 0, eiryn: 0 }, t);
assert.strictEqual(s.hearts, 4);
assert.strictEqual(Pg.hpFrac(s, 'kael', t), 1);
assert.strictEqual(Pg.nextHeartIn(s, t), Pg.HEART_MS);

// Practice never touches hearts.
Pg.applyResult(s, 'practice', 'loss', null, t);
assert.strictEqual(s.hearts, 4);

// Regeneration: one heart per 8 minutes, capped at 5, timer keeps remainder.
for (let i = 0; i < 4; i++) Pg.applyResult(s, 'story', 'loss', null, t);
assert.strictEqual(s.hearts, 0);
assert.strictEqual(Pg.canStartStory(s), false);
Pg.tick(s, t + 8 * MIN - 1);
assert.strictEqual(s.hearts, 0);
Pg.tick(s, t + 8 * MIN);
assert.strictEqual(s.hearts, 1);
Pg.tick(s, t + 19 * MIN);
assert.strictEqual(s.hearts, 2);
assert.strictEqual(Pg.nextHeartIn(s, t + 19 * MIN), 5 * MIN);
Pg.tick(s, t + 500 * MIN);
assert.strictEqual(s.hearts, 5);
assert.strictEqual(Pg.nextHeartIn(s, t + 500 * MIN), 0);

// Losing from full starts the timer at that moment.
const u = t + 600 * MIN;
Pg.applyResult(s, 'story', 'loss', null, u);
assert.strictEqual(s.hearts, 4);
assert.strictEqual(Pg.nextHeartIn(s, u + MIN), 7 * MIN);

// Corrupt or missing saves start fresh.
assert.strictEqual(Pg.normalise(null, t).hearts, 5);
assert.strictEqual(Pg.normalise({ v: 9 }, t).hearts, 5);

console.log('progress tests ok');
