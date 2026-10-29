// The company's legacy: Renown from every expedition, won or lost; ranks; a point to spend on a perk at
// every rank; charters (the kind of company it is) that unlock with rank. It outlasts a campaign: a new
// campaign keeps it. (Proposal: names and numbers.)
export const RANKS = [0, 120, 300, 550, 850, 1250, 1750, 2350, 3050, 3900, 4900, 6100];
export const RANK_NAMES = ['Unknown', 'Noticed', 'Spoken Of', 'Trusted', 'Renowned', 'Feared', 'Famed', 'Storied', 'Legendary', 'Mythic', 'Undying', 'Vael\'s Own'];

// perks: one point each (some need a rank first)
export const PERKS = {
  quartermaster: { name: 'Quartermaster', desc: 'Every expedition starts with 150 more gold.', rank: 1 },
  medics: { name: 'Field Medics', desc: 'Heroes recover 15% more health after every fight on the road.', rank: 1 },
  veterans: { name: 'Veterans', desc: 'Every hero has 8% more health and attack.', rank: 1 },
  scholars: { name: 'Scholars', desc: '+20% experience from every fight.', rank: 2 },
  warchest: { name: 'War Chest', desc: '+20% gold from every fight.', rank: 2 },
  provisions: { name: 'Provisions', desc: 'Every expedition starts with a common boon.', rank: 3 },
  banner: { name: 'The Company Banner', desc: 'The leader\'s edge is doubled (+30% health and attack).', rank: 3 },
  fortune: { name: 'Fortune\'s Favour', desc: 'Epic boons come up twice as often.', rank: 4 },
  secondchance: { name: 'Second Chance', desc: 'Once an expedition, a lost fight does not end it: try again.', rank: 5 },
  cartographer: { name: 'Cartographer', desc: 'Elites and ambushes give a boon to choose as well as their spoils.', rank: 6 },
  oathbound: { name: 'Oathbound', desc: 'Heroes start every fight with 30 energy.', rank: 7 },
  legend: { name: 'Living Legend', desc: 'Every hero has 12% more health and attack. (The last perk.)', rank: 9 },
};
// charters: chosen between expeditions; each changes how the company fights and earns
export const CHARTERS = {
  free: { name: 'Free Company', desc: 'No promises, no debts. Nothing changes.', rank: 0, mods: {} },
  mercenaries: { name: 'Mercenaries', desc: '+40% gold, but every hero has 8% less health.', rank: 2, mods: { hp: -0.08 }, gold: 0.4 },
  crusaders: { name: 'Crusaders', desc: 'Heals and shields 30% stronger, +10% defence; 8% less attack.', rank: 4, mods: { healPower: 0.3, def: 0.1, atk: -0.08 } },
  reavers: { name: 'Reavers', desc: '+20% attack and +8% critical chance, but wounds never heal on the road.', rank: 6, mods: { atk: 0.2, crit: 0.08 }, noRecovery: true },
  wardens: { name: 'Wardens', desc: 'Start every expedition with two boons; the foes are 10% stronger.', rank: 8, mods: {}, startBoons: 2, might: 0.1 },
};
// renown for an expedition: what it reached and won, more for a Seal
export function renownFor(run, triumph) {
  const exp = run.exp, row = exp && exp.at ? Number(exp.at.split('.')[0]) + 1 : 0;
  return 15 + run.wins * 12 + row * 6 + (run.elites || 0) * 15 + (triumph ? 90 : 0);
}
export const rankOf = (renown) => RANKS.filter((r) => renown >= r).length - 1;
