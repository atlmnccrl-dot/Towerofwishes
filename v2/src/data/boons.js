// Boons: after every win in a run the company picks one of three. They last until the run ends.
// Taking a boon again raises its level (to 3). Two kinds: `mods` add to every hero's stats (as gear
// does); the rest are read by the battle (combat/battle.js, through b.boons) and change how fights go.
// rarity: 0 common, 1 rare, 2 epic; art: the effect drawn as its icon and when it goes off;
// desc(n): the text at level n. (Proposal: names and numbers.)
import { RANKS } from './legacy.js';
const pc = (v) => Math.round(v * 100) + '%';

export const BOONS = {
  // ---- common: plain strength
  whetstone: { name: 'Whetstone', rarity: 0, art: 'hit_slash', mods: (n) => ({ atk: 0.1 * n }), desc: (n) => `Every hero deals ${pc(0.1 * n)} more damage.` },
  ironhide: { name: 'Iron Hide', rarity: 0, art: 'block', mods: (n) => ({ dr: 0.07 * n }), desc: (n) => `Every hero takes ${pc(0.07 * n)} less damage.` },
  stew: { name: 'Hearty Stew', rarity: 0, art: 'heal_cross', mods: (n) => ({ hp: 0.12 * n }), desc: (n) => `Every hero has ${pc(0.12 * n)} more health.` },
  drums: { name: 'War Drums', rarity: 0, art: 'wind_gust', mods: (n) => ({ spd: 0.1 * n }), desc: (n) => `Every hero attacks ${pc(0.1 * n)} faster.` },
  keen: { name: 'Keen Eye', rarity: 0, art: 'hit_crit', mods: (n) => ({ crit: 0.08 * n }), desc: (n) => `+${pc(0.08 * n)} critical chance for every hero.` },
  focus: { name: 'Deep Focus', rarity: 0, art: 'arcane_orb', mods: (n) => ({ power: 0.15 * n }), desc: (n) => `Abilities are ${pc(0.15 * n)} stronger.` },
  warcry: { name: 'War Cry', rarity: 0, art: 'shockwave', mods: (n) => ({ start: 25 * n }), desc: (n) => `Every hero starts a fight with ${25 * n} energy.` },
  // ---- rare: fights change
  kindling: { name: 'Kindling', rarity: 1, art: 'ignite', desc: (n) => `Hits have a ${pc(0.15 * n)} chance to set the foe burning.` },
  frostbite: { name: 'Frostbite', rarity: 1, art: 'ice_shatter', desc: (n) => `Hits have a ${pc(0.12 * n)} chance to chill the foe: 35% slower for 2.5 s.` },
  chain: { name: 'Chain Lightning', rarity: 1, art: 'chain_lightning', desc: (n) => `Critical hits arc to ${n} more ${n === 1 ? 'foe' : 'foes'} for half the damage.` },
  bloodlust: { name: 'Bloodlust', rarity: 1, art: 'dark_slash', desc: (n) => `A kill gives the killer +${pc(0.25 + 0.1 * n)} attack and speed for 5 s.` },
  executioner: { name: 'Executioner', rarity: 1, art: 'cross_slash', desc: (n) => `+${pc(0.4 * n)} damage to foes under 30% health.` },
  thorns: { name: 'Thorned Mail', rarity: 1, art: 'parry', desc: (n) => `Heroes return ${pc(0.25 * n)} of the melee damage they take.` },
  overflow: { name: 'Overflow', rarity: 1, art: 'charge_up', desc: (n) => `An ability gives back ${20 * n} energy.` },
  hymn: { name: 'Battle Hymn', rarity: 1, art: 'heal_loop', desc: (n) => `Every 8 s the whole team heals ${pc(0.04 * n)} of its health.` },
  giant: { name: 'Giant Slayer', rarity: 1, art: 'hit_big', desc: (n) => `+${pc(0.3 * n)} damage to bosses and elites.` },
  bounty: { name: 'Bounty Hunter', rarity: 1, art: 'coin', desc: (n) => `+${pc(0.25 * n)} gold from every fight this run.` },
  bloodpact: { name: 'Blood Pact', rarity: 1, art: 'dark_curse', mods: (n) => ({ lifesteal: 0.07 * n }), desc: (n) => `Heroes heal for ${pc(0.07 * n)} of the damage they deal.` },
  // ---- epic: a run is built around these
  secondwind: { name: 'Second Wind', rarity: 2, art: 'lightning_holy', desc: (n) => `Once a fight, the first hero to fall gets back up with ${pc(0.3 + 0.15 * n)} health.` },
  martyr: { name: "Martyr's Oath", rarity: 2, art: 'holy_light', desc: (n) => `When a hero falls, the others heal ${pc(0.15 * n)} and gain a shield.` },
  laststand: { name: 'Last Stand', rarity: 2, art: 'fire_shield', desc: (n) => `The last hero standing deals ${pc(0.6 + 0.4 * n)} more damage and takes half.` },
  echo: { name: 'Echo', rarity: 2, art: 'arc_gold', desc: (n) => `Abilities have a ${pc(0.25 * n)} chance to go off twice.` },
  pyre: { name: 'Pyre', rarity: 2, art: 'explosion_fire', desc: (n) => `Foes burst into flame when they die, burning everyone near them for ${pc(0.5 * n)} of their health.` },
  // ---- unlocked by the company's rank (data/legacy.js)
  vengeance: { name: 'Vengeance', rarity: 1, rank: 2, art: 'slash_arc_blood', desc: (n) => `When a hero falls, the others hit ${pc(0.3 * n)} harder for the rest of the fight.` },
  phalanx: { name: 'Phalanx', rarity: 1, rank: 3, art: 'shield_bubble', desc: (n) => `Heroes who hold the front take ${pc(0.15 * n)} less damage.` },
  midas: { name: 'Midas Touch', rarity: 1, rank: 4, art: 'chest_open', desc: (n) => `Every foe killed drops gold (${5 * n} a level).` },
  stormcall: { name: 'Stormcaller', rarity: 2, rank: 6, art: 'shock_aura', desc: (n) => `Every 6 seconds lightning strikes a foe for ${pc(0.08 * n)} of its health.` },
  salvo: { name: 'Opening Salvo', rarity: 2, art: 'thunder', mods: (n) => ({ start: 100, power: 0.1 * (n - 1) }), desc: (n) => `Every hero starts a fight with a full charge${n > 1 ? `; abilities ${pc(0.1 * (n - 1))} stronger` : ''}.` },
};
export const MAX_BOON = 3;
export const RARITY = ['Common', 'Rare', 'Epic'];

// three different boons to choose from; epics grow likelier the longer the run goes
//   o.rank: the company's rank (boons that need more stay out); o.epic: epics more likely; o.min: the lowest rarity
export function offerBoons(have, wins, rnd, o = {}) {
  const w = [o.min >= 1 ? 0 : 60, o.min >= 2 ? 0 : 32, (8 + Math.min(20, wins * 2)) * (o.epic || 1)];
  const pool = Object.keys(BOONS).filter((id) => (have[id] || 0) < MAX_BOON && (BOONS[id].rank || 0) <= (o.rank || 0) && BOONS[id].rarity >= (o.min || 0));
  const out = [];
  while (out.length < 3 && pool.length) {
    const r = rnd() * (w[0] + w[1] + w[2]), rar = r < w[0] ? 0 : r < w[0] + w[1] ? 1 : 2;
    let opts = pool.filter((id) => BOONS[id].rarity === rar && !out.includes(id));
    if (!opts.length) opts = pool.filter((id) => !out.includes(id));
    if (!opts.length) break;
    out.push(opts[Math.floor(rnd() * opts.length) % opts.length]);
  }
  return out;
}
// the offer for a company: its rank and perks shape it
export function offerFor(s, rnd, o = {}) {
  const L = s.legacy || {}, rank = RANKS.filter((r) => (L.renown || 0) >= r).length - 1;
  return offerBoons(s.run.boons, s.run.wins, rnd, Object.assign({ rank, epic: L.perks && L.perks.fortune ? 2 : 1 }, o));
}
// what every hero's stats gain from the run's boons
export function boonMods(have = {}) {
  const out = {};
  for (const [id, n] of Object.entries(have)) { const B = BOONS[id]; if (B && B.mods) for (const [k, v] of Object.entries(B.mods(n))) out[k] = (out[k] || 0) + v; }
  return out;
}
