// VESPER — loot and gear: gold, items in three slots (weapon, armour, charm) with four rarities and
// rolled affixes, what each fight and chest drops, the blacksmith's wares, upgrades and salvage, and
// what a hero's equipped gear does in a fight. Pure data and functions; runs in Node for tests.
(function (root) {
  const VS = root.VS = root.VS || {};
  const L = VS.LOOT = {};

  L.RARITY = [
    { id: 'common', name: 'Common', col: '#c8c0b8', affixes: 0, mul: 1, price: 1 },
    { id: 'magic', name: 'Magic', col: '#6aa8ff', affixes: 1, mul: 1.12, price: 2 },
    { id: 'rare', name: 'Rare', col: '#ffd060', affixes: 2, mul: 1.25, price: 4 },
    { id: 'legend', name: 'Legendary', col: '#ff4a5a', affixes: 3, mul: 1.45, price: 8 }];
  L.SLOTS = ['weapon', 'armour', 'charm'];
  L.SLOT_NAME = { weapon: 'Weapon', armour: 'Armour', charm: 'Charm' };
  // Bases by slot and tier (the tier follows the item's level).
  const TIERS = ['Iron', 'Steel', 'Moonsteel', 'Bloodsteel'];
  const BASES = {
    weapon: [{ id: 'blade', name: 'Blade' }, { id: 'saber', name: 'Saber' }, { id: 'axe', name: 'Axe' }, { id: 'spear', name: 'Spear' }, { id: 'great', name: 'Greatsword' }],
    armour: [{ id: 'coat', name: 'Coat' }, { id: 'mail', name: 'Mail' }, { id: 'plate', name: 'Plate' }, { id: 'cloak', name: 'Cloak' }],
    charm: [{ id: 'locket', name: 'Locket' }, { id: 'ring', name: 'Ring' }, { id: 'fang', name: 'Fang' }, { id: 'talisman', name: 'Talisman' }],
  };
  const CHARM_TIERS = ['Bone', 'Silver', 'Moon', 'Blood'];
  // Stats: the slot's main stat, then affixes. v(ilvl) gives the value at item level 1..40.
  L.STATS = {
    dmg: { name: 'damage', fmt: (v) => '+' + v + '% damage', v: (i) => 3 + i * 0.55, pre: 'Keen', suf: 'of Edges' },
    hp: { name: 'health', fmt: (v) => '+' + v + ' health', v: (i) => 6 + i * 1.5, pre: 'Sturdy', suf: 'of the Wall' },
    armor: { name: 'armour', fmt: (v) => '-' + v + '% damage taken', v: (i) => 2 + i * 0.25, pre: 'Warded', suf: 'of Warding', cap: 40 },
    gain: { name: 'moon', fmt: (v) => '+' + v + '% moon gain', v: (i) => 5 + i * 0.6, pre: 'Moonlit', suf: 'of the Moon' },
    thirst: { name: 'life steal', fmt: (v) => v + '% life steal', v: (i) => 1 + i * 0.07, pre: 'Thirsting', suf: 'of Thirst', cap: 12 },
    cd: { name: 'cooldown', fmt: (v) => '-' + v + '% skill cooldowns', v: (i) => 4 + i * 0.35, pre: 'Swift', suf: 'of Haste', cap: 40 },
    dodge: { name: 'dodge', fmt: (v) => '+' + v + '% dodge distance', v: (i) => 5 + i * 0.4, pre: 'Fleet', suf: 'of Wind', cap: 50 },
    parry: { name: 'parry', fmt: (v) => '+' + v + '% parry window', v: (i) => 8 + i * 0.6, pre: 'Steady', suf: 'of Patience', cap: 80 },
    heal: { name: 'kill heal', fmt: (v) => '+' + v + '% healing from kills', v: (i) => 10 + i * 1.2, pre: 'Mending', suf: 'of Mending' },
    gold: { name: 'gold find', fmt: (v) => '+' + v + '% gold found', v: (i) => 8 + i * 0.8, pre: 'Gilded', suf: 'of Fortune' },
  };
  const MAIN = { weapon: 'dmg', armour: 'hp', charm: 'gain' };
  const POOL = { weapon: ['dmg', 'thirst', 'cd', 'heal', 'gold', 'gain'], armour: ['hp', 'armor', 'dodge', 'heal', 'gold'], charm: ['cd', 'thirst', 'dodge', 'armor', 'gold', 'dmg', 'hp'] };
  // Legendaries carry a name and a fixed pair of affixes on top of the rolled ones.
  const UNIQUES = {
    weapon: [{ name: 'Dawnbreaker', fixed: ['dmg', 'gain'] }, { name: 'The Last Ember', fixed: ['thirst', 'heal'] }, { name: 'Widow Moon', fixed: ['dmg', 'cd'] }],
    armour: [{ name: 'Mantle of the Gate', fixed: ['hp', 'armor'] }, { name: 'Shroud of Ash', fixed: ['dodge', 'armor'] }, { name: 'The Hollow Crown', fixed: ['dodge', 'hp'] }],
    charm: [{ name: 'Tear of the Moon', fixed: ['gain', 'cd'] }, { name: 'Wolf-Tooth of Hrolf', fixed: ['dmg', 'thirst'] }, { name: 'The Gilded Saint', fixed: ['gold', 'heal'] }],
  };
  const r1 = (v) => Math.round(v * 10) / 10;
  const pick = (a, r) => a[Math.floor(r() * a.length)];

  // A new item. o: { slot, rar (index), minRar } — the rarity is rolled unless given.
  L.roll = function (rand, ilvl, o) {
    o = o || {}; ilvl = Math.max(1, Math.min(40, Math.round(ilvl)));
    const slot = o.slot || pick(L.SLOTS, rand);
    let rar = o.rar;
    if (rar == null) { const v = rand(); rar = v < 0.04 + ilvl * 0.0015 ? 3 : v < 0.2 + ilvl * 0.004 ? 2 : v < 0.55 ? 1 : 0; if (o.minRar != null) rar = Math.max(rar, o.minRar); }
    const R = L.RARITY[rar], base = pick(BASES[slot], rand), tier = Math.min(3, Math.floor((ilvl - 1) / 10));
    const stats = {}, add = (k, k2) => { const S = L.STATS[k]; let v = S.v(ilvl) * R.mul * (k2 || 1) * (0.85 + rand() * 0.3); stats[k] = r1((stats[k] || 0) + v); };
    add(MAIN[slot], 1.15);
    const uniq = rar === 3 ? pick(UNIQUES[slot], rand) : null;
    if (uniq) for (const k of uniq.fixed) add(k, 0.8);
    const pool = POOL[slot].filter((k) => k !== MAIN[slot]); let names = [];
    for (let i = 0; i < R.affixes && pool.length; i++) { const j = Math.floor(rand() * pool.length), k = pool.splice(j, 1)[0]; add(k, 0.7); names.push(k); }
    const tierName = slot === 'charm' ? CHARM_TIERS[tier] : TIERS[tier];
    let name = uniq ? uniq.name : (names[0] ? L.STATS[names[0]].pre + ' ' : '') + tierName + ' ' + base.name + (names[1] ? ' ' + L.STATS[names[1]].suf : '');
    return { slot, base: base.id, name, rar, ilvl, plus: 0, stats };
  };
  // An item's stats with its upgrades (+8% each, up to +5).
  L.MAX_PLUS = 5;
  L.statsOf = (it) => { const o = {}; for (const k in it.stats) o[k] = r1(it.stats[k] * (1 + 0.08 * (it.plus || 0))); return o; };
  L.lines = (it) => { const s = L.statsOf(it); return Object.keys(s).map((k) => L.STATS[k].fmt(s[k])); };
  // A rough worth, for comparing and pricing: the main stat counts most.
  L.score = (it) => { const s = L.statsOf(it); let v = 0; for (const k in s) v += s[k] / L.STATS[k].v(20) * (k === MAIN[it.slot] ? 1.4 : 1); return r1(v); };
  L.sellPrice = (it) => Math.round((8 + it.ilvl * 2) * L.RARITY[it.rar].price * (1 + 0.3 * (it.plus || 0)));
  L.buyPrice = (it) => Math.round(L.sellPrice(it) * 3.2);
  L.upgradeCost = (it) => (it.plus || 0) >= L.MAX_PLUS ? null : Math.round((20 + it.ilvl * 4) * L.RARITY[it.rar].price * 0.6 * Math.pow(1.6, it.plus || 0));

  // ---- the profile's gear --------------------------------------------------------------------------
  L.STARTER = { slot: 'weapon', base: 'blade', name: 'Worn Iron Blade', rar: 0, ilvl: 1, plus: 0, stats: { dmg: 4 } };
  L.migrate = function (p) {
    if (p.gold == null) p.gold = 0; if (!p.bag) p.bag = []; if (!p.equip) p.equip = {}; if (p.uid == null) p.uid = 1;
    if (!p.shop) p.shop = { seed: 1, bought: [] }; if (!p.loot) p.loot = { found: 0, legends: 0 };
    for (const it of p.bag) if (it.stats && it.stats.parry != null) { it.stats.dodge = (it.stats.dodge || 0) + it.stats.parry; delete it.stats.parry; }   // parry is gone: its rolls become dodge
    if (VS.PROG && VS.PROG.dropParry) VS.PROG.dropParry(p);
    if (!p.bag.length && !p.gearInit) { p.gearInit = true; const it = L.give(p, Object.assign({}, L.STARTER, { stats: Object.assign({}, L.STARTER.stats) })); L.equip(p, p.hero || 'vesper', it.uid); }
    return p;
  };
  L.BAG_MAX = 48;
  L.give = function (p, it) { it.uid = p.uid++; p.bag.push(it); p.loot.found++; if (it.rar === 3) p.loot.legends++; return it; };
  L.item = (p, uid) => p.bag.find((it) => it.uid === uid);
  L.slotsOf = (p, hero) => p.equip[hero] || (p.equip[hero] = {});
  L.equipped = (p, hero, slot) => { const e = p.equip[hero]; return e && e[slot] ? L.item(p, e[slot]) : null; };
  L.wornBy = (p, uid) => { for (const h in p.equip) for (const sl in p.equip[h]) if (p.equip[h][sl] === uid) return h; return null; };
  // Put an item on a hero (taking it off whoever wore it).
  L.equip = function (p, hero, uid) {
    const it = L.item(p, uid); if (!it) return false;
    for (const h in p.equip) for (const sl in p.equip[h]) if (p.equip[h][sl] === uid) delete p.equip[h][sl];
    L.slotsOf(p, hero)[it.slot] = uid; return true;
  };
  L.unequip = function (p, hero, slot) { const e = p.equip[hero]; if (e) delete e[slot]; };
  L.salvage = function (p, uid) { const i = p.bag.findIndex((it) => it.uid === uid); if (i < 0 || L.wornBy(p, uid)) return 0; const g = L.sellPrice(p.bag[i]); p.bag.splice(i, 1); p.gold += g; return g; };
  L.upgrade = function (p, uid) { const it = L.item(p, uid), c = it && L.upgradeCost(it); if (!c || p.gold < c) return false; p.gold -= c; it.plus = (it.plus || 0) + 1; return true; };
  // Equip the best item in each slot for a hero (used by the test bot, and offered as "Best" in the screen).
  L.autoEquip = function (p, hero) {
    for (const slot of L.SLOTS) { let best = L.equipped(p, hero, slot), bs = best ? L.score(best) : -1; for (const it of p.bag) if (it.slot === slot && !L.wornBy(p, it.uid) && L.score(it) > bs) { best = it; bs = L.score(it); } if (best) L.equip(p, hero, best.uid); }
  };
  // What a hero's gear does in a fight: multipliers and additions the sim applies on top of the kit.
  L.mods = function (p, hero) {
    const t = {}; for (const slot of L.SLOTS) { const it = p && L.equipped(p, hero, slot); if (!it) continue; const s = L.statsOf(it); for (const k in s) t[k] = (t[k] || 0) + s[k]; }
    const cap = (k) => Math.min(L.STATS[k].cap || 999, t[k] || 0);
    return { dmg: 1 + (t.dmg || 0) / 100, hp: Math.round(t.hp || 0), armor: cap('armor') / 100, gain: 1 + (t.gain || 0) / 100, thirst: cap('thirst') / 100, cd: 1 - cap('cd') / 100,
      dodge: 1 + cap('dodge') / 100, parry: 1 + cap('parry') / 100, heal: 1 + (t.heal || 0) / 100, gold: 1 + (t.gold || 0) / 100 };
  };

  // ---- what a fight pays ---------------------------------------------------------------------------
  // o: { type, depth, first, win, stars (new stars), chests: [tier...], smashed, goldMul }
  L.drops = function (rand, o) {
    const ilvl = Math.max(1, Math.round(o.depth * 0.65 + 1)), out = { gold: 0, items: [] };
    if (!o.win) { out.gold = Math.round((4 + o.depth) * (o.progress || 0) * (o.goldMul || 1)); return out; }
    const big = o.type === 'boss' || o.type === 'echo', mid = o.type === 'elite' || o.type === 'challenge';
    out.gold = Math.round((12 + o.depth * 3.2) * (big ? 3 : mid ? 1.7 : 1) * (o.first ? 1 : 0.5) * (o.goldMul || 1)) + (o.smashed || 0) * 2;
    if (o.type === 'trial') return out;
    // A guardian always drops something good the first time; elites and challenges often; battles sometimes.
    if (big) out.items.push(L.roll(rand, ilvl + 2, { minRar: o.first ? 2 : 1 }));
    else if (mid ? rand() < (o.first ? 0.9 : 0.4) : rand() < (o.first ? 0.45 : 0.18)) out.items.push(L.roll(rand, ilvl, { minRar: mid ? 1 : 0 }));
    if (o.stars && o.stars >= 2 && rand() < 0.5) out.items.push(L.roll(rand, ilvl, { minRar: 1 }));
    for (const t of o.chests || []) { out.items.push(L.roll(rand, ilvl + (t === 'gold' ? 2 : 0), { minRar: t === 'gold' ? 2 : t === 'iron' ? 1 : 0 })); out.gold += Math.round((6 + o.depth) * (t === 'gold' ? 4 : t === 'iron' ? 2 : 1) * (o.goldMul || 1)); }
    return out;
  };
  // The blacksmith's wares: four items for the highest act reached, fresh after every new win.
  L.shop = function (p, act) {
    const seed = (p.shop.seed * 2654435761) >>> 0; let a = seed || 1; const rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const ilvl = 3 + act * 5;
    return [0, 1, 2, 3].map((i) => { const it = L.roll(rand, ilvl, { slot: L.SLOTS[i % 3], minRar: i === 3 ? 2 : 1 }); it.offer = i; it.price = L.buyPrice(it); it.sold = p.shop.bought.indexOf(i) >= 0; return it; });
  };
  L.buy = function (p, act, i) {
    const w = L.shop(p, act)[i]; if (!w || w.sold || p.gold < w.price || p.bag.length >= L.BAG_MAX) return null;
    p.gold -= w.price; p.shop.bought.push(i); const it = Object.assign({}, w); delete it.offer; delete it.price; delete it.sold; return L.give(p, it);
  };
  L.restock = (p) => { p.shop.seed++; p.shop.bought = []; };
})(typeof window !== 'undefined' ? window : globalThis);
