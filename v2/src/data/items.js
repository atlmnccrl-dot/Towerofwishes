// Gear: three slots per recruit (weapon, armour, charm). An item is { uid, base, tier, plus }:
// its base gives the stats, its tier multiplies them, and each upgrade (+1 to +5) adds 12% more.
// Stat keys are the battle mods (see statsAt in combat/battle.js). Pure data and functions.

export const SLOTS = ['weapon', 'armor', 'charm'];
export const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armour', charm: 'Charm' };

export const TIERS = [
  { name: 'Worn', k: 1, color: '#b8b2a0' },
  { name: 'Fine', k: 1.6, color: '#7fd07a' },
  { name: 'Rare', k: 2.3, color: '#7fb6ff' },
  { name: 'Heirloom', k: 3.1, color: '#e0a2ff' },
  { name: 'Mythic', k: 4.0, color: '#ffb347' },
];
export const MAX_PLUS = 5;

export const BASES = {
  blade: { slot: 'weapon', name: 'Blade', stats: { atk: 0.08 } },
  edge: { slot: 'weapon', name: 'Keen Edge', stats: { atk: 0.05, crit: 0.03 } },
  maul: { slot: 'weapon', name: 'Heavy Maul', stats: { atk: 0.1, hp: 0.03 } },
  focus: { slot: 'weapon', name: 'Focus Rod', stats: { atk: 0.05, power: 0.06 } },
  mail: { slot: 'armor', name: 'Mail Coat', stats: { hp: 0.06, def: 0.05 } },
  leathers: { slot: 'armor', name: 'Leathers', stats: { hp: 0.05, spd: 0.03 } },
  robe: { slot: 'armor', name: 'Warded Robe', stats: { hp: 0.04, healPower: 0.06 } },
  fang: { slot: 'charm', name: 'Wolf Fang', stats: { crit: 0.035 } },
  ember: { slot: 'charm', name: 'Ember Stone', stats: { power: 0.08 } },
  feather: { slot: 'charm', name: 'Lark Feather', stats: { energy: 0.08 } },
  leech: { slot: 'charm', name: 'Leech Ring', stats: { lifesteal: 0.035 } },
  ward: { slot: 'charm', name: 'Ward Token', stats: { dr: 0.025 } },
};

export const STAT_NAMES = {
  hp: 'Health', atk: 'Attack', def: 'Defence', spd: 'Attack speed', crit: 'Critical', dr: 'Damage taken',
  lifesteal: 'Lifesteal', healPower: 'Healing', summonPower: 'Summons', power: 'Ability power', energy: 'Energy gain', start: 'Starting energy',
};
// how a stat reads: '+8% Attack', '-3% Damage taken', '+20 Starting energy'
export function statText(key, v) {
  if (key === 'start') return `+${Math.round(v)} ${STAT_NAMES[key]}`;
  if (key === 'dr') return `-${(v * 100).toFixed(1).replace(/\.0$/, '')}% ${STAT_NAMES[key]}`;
  return `+${(v * 100).toFixed(1).replace(/\.0$/, '')}% ${STAT_NAMES[key]}`;
}

export function itemStats(it) {
  const b = BASES[it.base], k = TIERS[it.tier].k * (1 + 0.12 * (it.plus || 0)), out = {};
  for (const [key, v] of Object.entries(b.stats)) out[key] = v * k;
  return out;
}
export const itemName = (it) => `${TIERS[it.tier].name} ${BASES[it.base].name}${it.plus ? ' +' + it.plus : ''}`;
export const upgradeCost = (it) => Math.round(40 * (it.tier + 1) * (1 + (it.plus || 0) * 0.8));
export const sellValue = (it) => Math.round(15 * (it.tier + 1) * (it.tier + 1) * (1 + (it.plus || 0) * 0.5));

// A loot roll for a mission of this level: the tier leans higher as the level rises (bonus: heroic, chests).
export function rollItem(level, rnd, bonus = 0) {
  const keys = Object.keys(BASES), base = keys[Math.floor(rnd() * keys.length)];
  const r = rnd() + level * 0.022 + bonus;
  const tier = r > 1.75 ? 4 : r > 1.3 ? 3 : r > 0.95 ? 2 : r > 0.6 ? 1 : 0;
  return { base, tier, plus: 0 };
}
