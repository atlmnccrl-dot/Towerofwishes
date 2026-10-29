// The wheel's eight heroes, in the order the wheel shows them; the region boss that frees each locked
// one; and each hero's perk for the whole squad when they lead a run. (Proposal: the author may change
// who is on the wheel, the unlock order and the perks.)
export const HEROES = ['corvin', 'wren', 'maren', 'hesta', 'thistle', 'ysolde', 'moraine', 'kesh'];
export const UNLOCKS = { r1: 'hesta', r2: 'thistle', r3: 'ysolde', r4: 'moraine', r5: 'kesh' };   // beaten, the Black Knight joins; Kesh comes from the white pass
export const LEADERS = {
  corvin: { name: 'Shield of the Company', desc: 'Every hero takes 10% less damage.', mods: { dr: 0.1 } },
  wren: { name: "Hunter's Eye", desc: 'Every hero gets +12% critical chance.', mods: { crit: 0.12 } },
  maren: { name: 'Field Hospital', desc: 'Every hero has +10% health; heals and shields are 25% stronger.', mods: { hp: 0.1, healPower: 0.25 } },
  hesta: { name: 'River Charge', desc: 'Every hero attacks 15% faster.', mods: { spd: 0.15 } },
  thistle: { name: 'Pack Leader', desc: 'Summons are 50% stronger; every hero starts with 30 energy.', mods: { summonPower: 0.5, start: 30 } },
  ysolde: { name: 'Deep Study', desc: 'Every ability is 30% stronger.', mods: { power: 0.3 } },
  kesh: { name: 'Cold Blood', desc: 'Every hero gets +12% attack and +8% critical chance.', mods: { atk: 0.12, crit: 0.08 } },
  moraine: { name: 'Black Oath', desc: 'Every hero heals for 8% of the damage they deal.', mods: { lifesteal: 0.08 } },
};
