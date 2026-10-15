/*
 * Tower of Wishes — growing the team: gear, the inventory, loot and skill
 * trees. Pure functions on a plain save object (save.prog), testable in Node.
 *
 * Fighters start plain: no gear and one skill point. Levels (shared team
 * experience, js/story.js) give skill points; missions drop gear. Both turn
 * into fight modifiers that js/sim.js applies per fighter:
 *   { hp, power, speed, parry, dodge, react, armor, superRate, sta, lifesteal, secondWind }
 * All item names, skills and numbers are Proposals.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowProgression = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SLOTS = ['weapon', 'armor', 'charm'];
  const RARITY = {
    common: { label: 'Common', color: '#b3a19c' },
    fine: { label: 'Fine', color: '#9cc3dd' },
    rare: { label: 'Rare', color: '#a98bff' },
    relic: { label: 'Relic', color: '#e3263a' },
  };
  // Which weapons each fighter can use.
  const CLASS = { ren: 'blade', mara: 'glyph', brannoc: 'shield', kael: 'sword', eirynMage: 'glyph' };
  const STAT_LABEL = {
    hp: 'Health', power: 'Power', speed: 'Speed', parry: 'Parry', dodge: 'Dodge', react: 'Reflexes',
    armor: 'Armour', superRate: 'Heavy-art charge', sta: 'Stamina', lifesteal: 'Lifesteal', secondWind: 'Second wind',
  };

  // ------------------------------------------------------------ items
  const ITEMS = {
    // blades (Ren)
    notchedPair: { name: 'Notched Pair', slot: 'weapon', cls: 'blade', rarity: 'common', mods: { power: 0.05 } },
    couriersFangs: { name: 'Courier’s Fangs', slot: 'weapon', cls: 'blade', rarity: 'fine', mods: { power: 0.08, speed: 0.04 } },
    redwaterKnives: { name: 'Redwater Knives', slot: 'weapon', cls: 'blade', rarity: 'rare', mods: { power: 0.1, lifesteal: 0.06 } },
    afterimageEdges: { name: 'Afterimage Edges', slot: 'weapon', cls: 'blade', rarity: 'relic', mods: { power: 0.12, dodge: 0.08, superRate: 0.1 } },
    // glyph foci (Mara, Eiryn)
    chalkStylus: { name: 'Chalk Stylus', slot: 'weapon', cls: 'glyph', rarity: 'common', mods: { superRate: 0.08 } },
    registryFocus: { name: 'Registry Focus', slot: 'weapon', cls: 'glyph', rarity: 'fine', mods: { power: 0.06, superRate: 0.1 } },
    copiedSlate: { name: 'Copied Glyph Slate', slot: 'weapon', cls: 'glyph', rarity: 'rare', mods: { power: 0.1, react: 0.1 } },
    latticeKey: { name: 'Lattice Key', slot: 'weapon', cls: 'glyph', rarity: 'relic', mods: { power: 0.12, superRate: 0.2 } },
    // shields (Brannoc)
    caravanBuckler: { name: 'Caravan Buckler', slot: 'weapon', cls: 'shield', rarity: 'common', mods: { armor: 0.05 } },
    ironRimmed: { name: 'Iron-Rimmed Round', slot: 'weapon', cls: 'shield', rarity: 'fine', mods: { armor: 0.08, parry: 0.04 } },
    beamBracer: { name: 'Beam-Iron Bracer', slot: 'weapon', cls: 'shield', rarity: 'rare', mods: { power: 0.08, armor: 0.08 } },
    bellBulwark: { name: 'Bell-Bronze Bulwark', slot: 'weapon', cls: 'shield', rarity: 'relic', mods: { armor: 0.12, hp: 0.1, parry: 0.05 } },
    // swords (Kael)
    sharpenedAgain: { name: 'Sharpened Again', slot: 'weapon', cls: 'sword', rarity: 'common', mods: { power: 0.05 } },
    guildBlade: { name: 'Guild-Issue Blade', slot: 'weapon', cls: 'sword', rarity: 'fine', mods: { power: 0.07, parry: 0.03 } },
    millersCleaver: { name: 'Miller’s Cleaver', slot: 'weapon', cls: 'sword', rarity: 'rare', mods: { power: 0.11, superRate: 0.05 } },
    riverbedSteel: { name: 'Riverbed Steel', slot: 'weapon', cls: 'sword', rarity: 'relic', mods: { power: 0.12, react: 0.1, parry: 0.04 } },
    // armour (anyone)
    patchedLeathers: { name: 'Patched Leathers', slot: 'armor', rarity: 'common', mods: { hp: 0.05 } },
    roadCoat: { name: 'Road Coat', slot: 'armor', rarity: 'fine', mods: { hp: 0.07, speed: 0.03 } },
    quarryPlate: { name: 'Quarry Plate', slot: 'armor', rarity: 'rare', mods: { armor: 0.08, hp: 0.06 } },
    drownedMail: { name: 'Drowned Mail', slot: 'armor', rarity: 'relic', mods: { armor: 0.1, hp: 0.1 } },
    // charms (anyone)
    waterskinCork: { name: 'Waterskin Cork', slot: 'charm', rarity: 'common', mods: { hp: 0.04 } },
    grainThread: { name: 'Grain-Sack Thread', slot: 'charm', rarity: 'common', mods: { sta: 0.1 } },
    teaRing: { name: 'Tea-Warmer’s Ring', slot: 'charm', rarity: 'fine', mods: { superRate: 0.1 } },
    straysTooth: { name: 'The Stray’s Tooth', slot: 'charm', rarity: 'rare', mods: { power: 0.06, lifesteal: 0.05 } },
    bellShard: { name: 'Bell Shard', slot: 'charm', rarity: 'relic', mods: { secondWind: 1, react: 0.1 } },
  };

  // ------------------------------------------------------------ loot
  // weights per rarity, rolls, and items guaranteed on the first clear.
  const TABLES = {
    story: { w: { common: 6, fine: 3, rare: 1 }, rolls: 1 },
    yard: { w: { common: 8, fine: 2 }, rolls: 1 },
    contract: { w: { common: 5, fine: 4, rare: 1 }, rolls: 1 },
    beast: { w: { fine: 5, rare: 2 }, rolls: 1, first: ['straysTooth'] },
    relic: { w: { fine: 3, rare: 4, relic: 1 }, rolls: 1, first: ['bellShard'] },
    deep: { w: { common: 3, fine: 5, rare: 2 }, rolls: 1 },
    chief: { w: { fine: 3, rare: 5, relic: 1 }, rolls: 2, first: ['millersCleaver'] },
    gauntlet: { w: { common: 4, fine: 4, rare: 2, relic: 0.3 }, rolls: 0 }, // rolls = waves / 3
  };

  function pickWeighted(w, rng) {
    let sum = 0;
    for (const k in w) sum += w[k];
    let x = rng() * sum;
    for (const k in w) { x -= w[k]; if (x <= 0) return k; }
    return Object.keys(w)[0];
  }

  // Item ids dropped by one clear. opts: { first, extra, score }
  function rollLoot(table, rng, opts) {
    const T = TABLES[table];
    if (!T) return [];
    opts = opts || {};
    const out = [];
    if (opts.first && T.first) out.push(...T.first);
    let rolls = T.rolls + (opts.extra || 0);
    if (table === 'gauntlet') rolls = Math.min(4, Math.floor((opts.score || 0) / 3));
    for (let i = 0; i < rolls; i++) {
      const rar = pickWeighted(T.w, rng);
      const pool = Object.keys(ITEMS).filter((id) => ITEMS[id].rarity === rar);
      if (pool.length) out.push(pool[Math.floor(rng() * pool.length)]);
    }
    return out;
  }

  // ------------------------------------------------------------ skill trees
  // Three branches per fighter, three steps each; each step costs a point
  // and needs the one before it.
  const T3 = (branch, a, b, c) => [{ branch, i: 0, ...a }, { branch, i: 1, ...b }, { branch, i: 2, ...c }];
  const TREES = {
    ren: [
      { name: 'Fang', nodes: T3('Fang', { name: 'Bite Deep', mods: { power: 0.06 } }, { name: 'Chain', mods: { power: 0.08 } }, { name: 'Blood Debt', mods: { lifesteal: 0.08 } }) },
      { name: 'Shadow', nodes: T3('Shadow', { name: 'Light Feet', mods: { dodge: 0.08 } }, { name: 'Gone Already', mods: { speed: 0.06 } }, { name: 'Read the Blade', mods: { react: 0.15 } }) },
      { name: 'Vein', nodes: T3('Vein', { name: 'Hunger', mods: { superRate: 0.15 } }, { name: 'Thick Blood', mods: { hp: 0.08 } }, { name: 'Not Yet', mods: { secondWind: 1 } }) },
    ],
    mara: [
      { name: 'Lattice', nodes: T3('Lattice', { name: 'Clean Lines', mods: { power: 0.08 } }, { name: 'Quick Hands', mods: { superRate: 0.15 } }, { name: 'Overdraw', mods: { power: 0.1 } }) },
      { name: 'Ward', nodes: T3('Ward', { name: 'Shell', mods: { armor: 0.08 } }, { name: 'Steady', mods: { hp: 0.1 } }, { name: 'Last Circle', mods: { secondWind: 1 } }) },
      { name: 'Flow', nodes: T3('Flow', { name: 'Deep Breath', mods: { sta: 0.15 } }, { name: 'Sidestep', mods: { react: 0.12 } }, { name: 'Glide', mods: { speed: 0.06 } }) },
    ],
    brannoc: [
      { name: 'Anvil', nodes: T3('Anvil', { name: 'Heavy Hand', mods: { power: 0.07 } }, { name: 'Ring the Iron', mods: { power: 0.08 } }, { name: 'Forge Heat', mods: { superRate: 0.2 } }) },
      { name: 'Bulwark', nodes: T3('Bulwark', { name: 'Brace', mods: { parry: 0.06 } }, { name: 'Iron Skin', mods: { armor: 0.1 } }, { name: 'Mountain', mods: { hp: 0.12 } }) },
      { name: 'Oath', nodes: T3('Oath', { name: 'Long Road', mods: { sta: 0.2 } }, { name: 'Debtor’s Grit', mods: { lifesteal: 0.05 } }, { name: 'Unbroken', mods: { secondWind: 1 } }) },
    ],
    kael: [
      { name: 'Edge', nodes: T3('Edge', { name: 'Sharpened', mods: { power: 0.07 } }, { name: 'First Move', mods: { react: 0.12 } }, { name: 'Clean Cut', mods: { power: 0.08 } }) },
      { name: 'Guard', nodes: T3('Guard', { name: 'Turn the Blade', mods: { parry: 0.06 } }, { name: 'Shoulder Plate', mods: { armor: 0.08 } }, { name: 'Stubborn', mods: { hp: 0.1 } }) },
      { name: 'Resolve', nodes: T3('Resolve', { name: 'Make It Look at Me', mods: { superRate: 0.15 } }, { name: 'Professional Hazard', mods: { secondWind: 1 } }, { name: 'One More Contract', mods: { sta: 0.15 } }) },
    ],
    eirynMage: [
      { name: 'Force', nodes: T3('Force', { name: 'Compact Glyph', mods: { power: 0.08 } }, { name: 'Old Method', mods: { superRate: 0.15 } }, { name: 'Narrow Path', mods: { power: 0.1 } }) },
      { name: 'Negation', nodes: T3('Negation', { name: 'Thin Air', mods: { armor: 0.1 } }, { name: 'Held Close', mods: { hp: 0.1 } }, { name: 'Preservation', mods: { secondWind: 1 } }) },
      { name: 'Recall', nodes: T3('Recall', { name: 'Rooftops', mods: { dodge: 0.08 } }, { name: 'Quick Study', mods: { react: 0.12 } }, { name: 'Mana Returning', mods: { superRate: 0.12 } }) },
    ],
  };
  const skillId = (b, i) => b + '.' + i;

  // ------------------------------------------------------------ state
  function fresh() { return { v: 1, inv: [], equip: {}, skills: {}, bonus: {}, uid: 1, firsts: {} }; }
  function normalise(p) {
    if (!p || p.v !== 1) return fresh();
    p.inv = p.inv || []; p.equip = p.equip || {}; p.skills = p.skills || {}; p.bonus = p.bonus || {}; p.uid = p.uid || 1; p.firsts = p.firsts || {};
    return p;
  }
  function addItems(p, ids) {
    return ids.filter((id) => ITEMS[id]).map((id) => { const it = { uid: p.uid++, id }; p.inv.push(it); return it; });
  }
  function item(p, uid) { return p.inv.find((it) => it.uid === uid) || null; }
  function canEquip(key, id) {
    const I = ITEMS[id];
    return !!I && (I.slot !== 'weapon' || I.cls === CLASS[key]);
  }
  // Who is wearing an item (or null).
  function wearer(p, uid) {
    for (const k in p.equip) for (const sl of SLOTS) if (p.equip[k][sl] === uid) return k;
    return null;
  }
  function equip(p, key, uid) {
    const it = item(p, uid);
    if (!it || !canEquip(key, it.id)) return false;
    const other = wearer(p, uid);
    if (other) p.equip[other][ITEMS[it.id].slot] = null;
    p.equip[key] = p.equip[key] || {};
    p.equip[key][ITEMS[it.id].slot] = uid;
    return true;
  }
  function unequip(p, key, slot) { if (p.equip[key]) p.equip[key][slot] = null; }

  // Skill points: one to start, one per team level after the first, plus bonuses.
  function points(p, key, level) { return Math.max(0, (level || 1)) + (p.bonus[key] || 0); }
  function spent(p, key) { return (p.skills[key] || []).length; }
  function canLearn(p, key, level, b, i) {
    const have = p.skills[key] || [];
    if (have.includes(skillId(b, i))) return false;
    if (i > 0 && !have.includes(skillId(b, i - 1))) return false;
    return spent(p, key) < points(p, key, level);
  }
  function learn(p, key, level, b, i) {
    if (!canLearn(p, key, level, b, i)) return false;
    (p.skills[key] = p.skills[key] || []).push(skillId(b, i));
    return true;
  }
  function respec(p, key) { p.skills[key] = []; }

  // Fight modifiers for one fighter from gear and skills.
  function modsFor(p, key) {
    const m = {};
    const add = (mods) => { for (const k in mods) m[k] = (m[k] || 0) + mods[k]; };
    const eq = p.equip[key] || {};
    for (const sl of SLOTS) { const it = eq[sl] && item(p, eq[sl]); if (it) add(ITEMS[it.id].mods); }
    const tree = TREES[key] || [];
    for (const sid of p.skills[key] || []) {
      const [b, i] = sid.split('.');
      const br = tree.find((t) => t.name === b);
      if (br && br.nodes[+i]) add(br.nodes[+i].mods);
    }
    return m;
  }
  // A short readable list, e.g. "+8% Power · +4% Speed".
  function describe(mods) {
    return Object.keys(mods).map((k) => (k === 'secondWind' ? 'Second wind (once a fight, rise at 30%)' : `+${Math.round(mods[k] * 100)}% ${STAT_LABEL[k] || k}`)).join(' · ');
  }

  return {
    SLOTS, RARITY, CLASS, ITEMS, TABLES, TREES, STAT_LABEL,
    fresh, normalise, rollLoot, addItems, item, canEquip, wearer, equip, unequip,
    points, spent, canLearn, learn, respec, modsFor, describe, skillId,
  };
});
