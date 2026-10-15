// Gear, loot and skill-tree rules, and that growth actually helps in a fight.
'use strict';
const assert = require('assert');
const P = require('../js/progression.js');
const Sim = require('../js/sim.js');

const p = P.fresh();
// Weapons are class-locked; armour and charms fit anyone.
const [fangs, focus, coat] = P.addItems(p, ['couriersFangs', 'registryFocus', 'roadCoat']);
assert(P.equip(p, 'ren', fangs.uid));
assert(!P.equip(p, 'ren', focus.uid), 'Ren cannot use a glyph focus');
assert(P.equip(p, 'mara', focus.uid));
assert(P.equip(p, 'ren', coat.uid));
assert(P.equip(p, 'kael', coat.uid), 'moving armour to Kael');
assert.strictEqual(P.wearer(p, coat.uid), 'kael');
assert.strictEqual(p.equip.ren.armor, null);

// Skills: one point at level 1, in order along a branch.
assert(!P.canLearn(p, 'ren', 1, 'Fang', 1), 'needs the first step');
assert(P.learn(p, 'ren', 1, 'Fang', 0));
assert(!P.learn(p, 'ren', 1, 'Fang', 1), 'out of points at level 1');
assert(P.learn(p, 'ren', 3, 'Fang', 1));
const m = P.modsFor(p, 'ren');
assert(Math.abs(m.power - (0.08 + 0.06 + 0.08)) < 1e-9, 'gear + skills add up: ' + JSON.stringify(m));
assert(P.describe(m).includes('Power'));

// Loot: deterministic with a seeded rng; first clears give their item.
const rng = Sim.makeRng(5);
const drop = P.rollLoot('chief', rng, { first: true });
assert(drop.includes('millersCleaver') && drop.length === 3);
for (const id of drop) assert(P.ITEMS[id], 'unknown item ' + id);
assert.strictEqual(P.rollLoot('gauntlet', rng, { score: 7 }).length, 2);
for (const t in P.TABLES) for (const id of P.TABLES[t].first || []) assert(P.ITEMS[id]);

// Every tree node has mods, every fighter class has weapons of every rarity.
for (const k in P.TREES) for (const b of P.TREES[k]) for (const n of b.nodes) assert(Object.keys(n.mods).length);
for (const cls of new Set(Object.values(P.CLASS))) {
  for (const r of ['common', 'fine', 'rare', 'relic']) assert(Object.values(P.ITEMS).some((I) => I.cls === cls && I.rarity === r), cls + ' ' + r);
}

// Growth helps: a fully kitted Ren beats the clearing more often than a bare one.
function rate(mods) {
  let w = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const s = Sim.createMatch({ seed, scenario: 'cart', party: [{ key: 'ren', level: 2, mods }, { key: 'kael', level: 2 }] });
    while (!s.result && s.t < 240) { Sim.step(s, 1 / 60); s.fx.length = 0; s.log.length = 0; }
    if (s.result && s.result.outcome === 'win') w++;
  }
  return w / 40;
}
const bare = rate(null);
const kit = rate({ power: 0.22, hp: 0.1, armor: 0.08, dodge: 0.08 });
console.log(`cart ren+kael: bare ${Math.round(bare * 100)}%, kitted ${Math.round(kit * 100)}%`);
assert(kit >= bare, 'gear should not make things worse');
console.log('progression ok');
