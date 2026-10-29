// Hero paths: at level 10 and again at 25 a hero chooses one of two ways to grow, and their special
// changes with it: what it does (effects added), how it looks (its effect), its name. Level 10 is by
// class; level 25 is the same choice for everyone: the special twice, or a finisher with its own
// cinematic. The wheel's eight have their own names for the paths. (Proposal: names and numbers.)
export const PATH_LEVELS = [10, 25];

const CLASS = {
  vanguard: [
    { id: 'bulwark', name: 'Bulwark', desc: 'The special also shields every ally for 12% of their health.', fx: 'shield_bubble',
      add: [{ type: 'shield', pct: 0.12, area: 'allAllies', dur: 5 }], mods: { def: 0.1 } },
    { id: 'warlord', name: 'Warlord', desc: 'The special also slams the ground: damage and a stun around him.', fx: 'shockwave',
      add: [{ type: 'damage', mult: 1.5, area: 'self', radius: 2.3, stun: 0.6, knock: 1.2 }], mods: { atk: 0.1 } },
  ],
  striker: [
    { id: 'duelist', name: 'Duelist', desc: 'The special strikes one more time and cuts deeper (+40%).', fx: 'cross_slash',
      boost: 1.4, add: [{ type: 'damage', mult: 1.0, area: 'target' }], mods: { crit: 0.08 } },
    { id: 'tempest', name: 'Tempest', desc: 'The special also tears through every foe around the target.', fx: 'spin_slash',
      add: [{ type: 'damage', mult: 1.0, area: 'circle', radius: 2.2 }], mods: { spd: 0.1 } },
  ],
  ranger: [
    { id: 'hunter', name: 'Hunter', desc: 'The special marks its target: 30% less armour and a long bleed.', fx: 'hit_pierce',
      add: [{ type: 'debuff', stat: 'def', pct: 0.3, dur: 6 }, { type: 'damage', mult: 0.4, area: 'target', dot: { mult: 0.5, dur: 6 } }], mods: { crit: 0.08 } },
    { id: 'storm', name: 'Arrowstorm', desc: 'The special also rains arrows on every foe.', fx: 'arrow',
      add: [{ type: 'damage', mult: 0.7, area: 'allEnemies' }], mods: { spd: 0.1 } },
  ],
  mystic: [
    { id: 'elemental', name: 'Elementalist', desc: 'The special sets the ground ablaze: everyone it hits keeps burning.', fx: 'explosion_fire',
      add: [{ type: 'damage', mult: 0.6, area: 'circle', radius: 2.4, dot: { mult: 0.6, dur: 5 } }], mods: { power: 0.1 } },
    { id: 'arcanist', name: 'Arcanist', desc: 'The special gives back 45 energy and stuns a little longer.', fx: 'circle_arcane',
      add: [{ type: 'energy', amount: 45 }, { type: 'damage', mult: 0.3, area: 'target', stun: 1.0 }], mods: { energy: 0.1 } },
  ],
  support: [
    { id: 'saint', name: 'Saint', desc: 'The special also shields every ally for 15% of their health.', fx: 'holy_light',
      add: [{ type: 'shield', pct: 0.15, area: 'allAllies', dur: 6 }], mods: { healPower: 0.15 } },
    { id: 'warpriest', name: 'War Priest', desc: 'The special also makes every ally hit 25% harder for 6 seconds.', fx: 'buff_up',
      add: [{ type: 'buff', stat: 'atk', pct: 0.25, dur: 6, area: 'allAllies' }], mods: { atk: 0.1 } },
  ],
};
const ASCEND = [
  { id: 'twin', name: 'Twinned', desc: 'The special goes off twice (the second at 60%).', twice: 0.6, mods: { energy: 0.1 } },
  { id: 'finisher', name: 'Finisher', desc: 'The special becomes a finisher: 80% stronger, with its own cinematic.', boost: 1.8, epic: true, mods: { hp: 0.1 } },
];
// the wheel's eight call their paths by their own names
const NAMES = {
  corvin: [['Bulwark', 'Warlord'], ['Twin Oaths', 'Last Knight']],
  wren: [['Huntress', 'Arrowstorm'], ['Double Draw', 'Heartseeker']],
  maren: [['Saint of the Field', 'War Surgeon'], ['Second Light', 'Miracle']],
  hesta: [['River Duelist', 'Flood Tempest'], ['Twin Spears', 'Clan Breaker']],
  thistle: [['Grove Mother', 'Pack Caller'], ['Two Voices', 'Wild Heart']],
  ysolde: [['Pyromancer', 'Archivist'], ['Echoing Sigil', 'Final Thesis']],
  kesh: [['Cold Duelist', 'White Squall'], ['Twin Fangs', 'Silent End']],
  moraine: [['Black Bastion', 'Dread Lord'], ['Second Oath', 'Oath Unbroken']],
};
// the two choices for a hero at a tier (0: level 10, 1: level 25), named for them
export function pathChoices(key, cls, tier) {
  const list = tier === 0 ? CLASS[cls] : ASCEND, names = NAMES[key] && NAMES[key][tier];
  return list.map((p, i) => Object.assign({}, p, names ? { name: names[i] } : {}));
}
// a hero's special with their paths applied: more effects, a new look, a boost, twice or a finisher
export function pathAbility(ability, key, cls, picks = []) {
  if (!ability || !picks.some(Boolean)) return ability;
  const ab = Object.assign({}, ability, { effects: ability.effects.slice() });
  picks.forEach((id, tier) => {
    const p = id && pathChoices(key, cls, tier).find((c) => c.id === id); if (!p) return;
    if (p.add) ab.effects.push(...p.add);
    if (p.fx) ab.fx = p.fx;
    if (p.boost) ab.boost = (ab.boost || 1) * p.boost;
    if (p.twice) ab.twice = p.twice;
    if (p.epic) ab.epic = true;
    ab.path = (ab.path ? ab.path + ' · ' : '') + p.name;
  });
  return ab;
}
export function pathMods(key, cls, picks = []) {
  const out = {};
  picks.forEach((id, tier) => { const p = id && pathChoices(key, cls, tier).find((c) => c.id === id); if (p) for (const [k, v] of Object.entries(p.mods || {})) out[k] = (out[k] || 0) + v; });
  return out;
}
