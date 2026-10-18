// Tests for injuries (there are no hearts). Usage: node test/progress-test.js
'use strict';
const assert = require('assert');
const Pg = require('../js/progress.js');

const MIN = 60 * 1000;
const t = 1_000_000;
const s = Pg.fresh(t);
assert.strictEqual(s.hearts, undefined, 'no hearts');

// Win heals fully.
s.injury.kael = { frac: 0.3, at: t };
Pg.applyResult(s, 'story', 'win', { kael: 0.2, eiryn: 0.5 }, t);
assert.strictEqual(Pg.hpFrac(s, 'kael', t), 1);

// Withdraw: team leaves injured and heals over time.
Pg.applyResult(s, 'story', 'surrender', { kael: 0.4, eiryn: 0 }, t);
assert.strictEqual(Pg.hpFrac(s, 'kael', t), 0.4);
assert.strictEqual(Pg.hpFrac(s, 'eiryn', t), 0.1, 'a fallen unit leaves at the floor');
assert.strictEqual(Pg.hpFrac(s, 'kael', t + 2 * MIN), 0.9);
assert.strictEqual(Pg.hpFrac(s, 'kael', t + 10 * MIN), 1);
assert.ok(Pg.fullHealIn(s, 'eiryn', t) <= Pg.HEAL_MS);

// Loss costs nothing: everyone is back on their feet, ready to retry.
Pg.applyResult(s, 'story', 'loss', { kael: 0, eiryn: 0 }, t);
assert.strictEqual(Pg.hpFrac(s, 'kael', t), 1);
assert.strictEqual(Pg.hpFrac(s, 'eiryn', t), 1);

// Practice never touches injuries.
s.injury.kael = { frac: 0.5, at: t };
Pg.applyResult(s, 'practice', 'win', null, t);
assert.strictEqual(Pg.hpFrac(s, 'kael', t), 0.5);

// Old saves with hearts keep their injuries and lose the hearts.
const old = { v: 1, hearts: 2, heartAt: t, injury: { kael: { frac: 0.6, at: t } } };
const n = Pg.normalise(old, t);
assert.strictEqual(n.hearts, undefined);
assert.strictEqual(n.v, 2);
assert.strictEqual(Pg.hpFrac(n, 'kael', t), 0.6);
assert.strictEqual(Pg.hpFrac(n, 'eiryn', t), 1);

// Corrupt or missing saves start fresh.
assert.strictEqual(Pg.normalise(null, t).v, 2);
assert.strictEqual(Pg.normalise({ v: 9 }, t).v, 2);

console.log('progress tests ok');
