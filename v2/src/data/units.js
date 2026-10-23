// Vael: the units. Stats are at level 1; distances in metres, times in seconds.
//
// A unit: name, title (a short line about who they are), set (sprite set), cls (class), stats
// (hp, atk, def, spd: attacks per second scale, move: m/s, range, crit: chance), attack (the basic
// attack: timing, projectile fx or melee), ability (fires when energy reaches 100), passive.
//
// Ability effects (an ability lists one or more, applied in order):
//   damage  { mult, area: 'target'|'circle'|'line'|'self'|'allEnemies'|'nearest3', radius, length, width,
//             stun, knock, dot: { mult, dur } , hits }
//   heal    { mult, area: 'lowest'|'allAllies'|'self' }       (mult of atk)
//   shield  { pct, area: 'self'|'allAllies', dur }             (pct of the shielded unit's max hp)
//   buff    { stat, pct, dur, area: 'self'|'allAllies' }
//   debuff  { stat, pct, dur, area: 'allEnemies'|'target' }
//   taunt   { dur }  dr { pct, dur }  (damage reduction, self)
//   blink   { to: 'lowestEnemy' }                              (moves behind it before the rest)
//   summon  { key, n }
// Passives: { def: pct } { hp: pct } { crit: add } { dr: pct } { lifesteal: pct } { healPower: pct }

const C = {
  vanguard: { hp: 900, atk: 52, def: 60, spd: 1, move: 3.4, range: 1.5, crit: 0.05 },
  striker: { hp: 640, atk: 82, def: 32, spd: 1.15, move: 4.4, range: 1.4, crit: 0.15 },
  ranger: { hp: 520, atk: 72, def: 22, spd: 1, move: 3.6, range: 6.5, crit: 0.12 },
  mystic: { hp: 520, atk: 78, def: 22, spd: 0.9, move: 3.4, range: 5.5, crit: 0.08 },
  support: { hp: 600, atk: 48, def: 30, spd: 1, move: 3.6, range: 5.0, crit: 0.05 },
};
export const CLASSES = {
  vanguard: { name: 'Vanguard', blurb: 'Holds the front and takes the hits' },
  striker: { name: 'Striker', blurb: 'Fast blades that hunt the weak' },
  ranger: { name: 'Ranger', blurb: 'Strikes from afar' },
  mystic: { name: 'Mystic', blurb: 'Spells that hit many at once' },
  support: { name: 'Support', blurb: 'Heals, shields and strengthens' },
};
const stats = (cls, o = {}) => Object.assign({}, C[cls], o);
// basic attacks: melee or a projectile (speed m/s, fx for the bolt and its impact)
const MELEE = (o) => Object.assign({ windup: 0.32, active: 0.1, recover: 0.4, fx: 'slash' }, o);
const SHOT = (o) => Object.assign({ windup: 0.36, active: 0.05, recover: 0.45, projectile: 16, bolt: 'arrow', hit: 'hit_pierce' }, o);

export const UNITS = {
  corvin: {
    name: 'Corvin Hale', title: 'Knight without a lord', set: 'kael_sword', cls: 'vanguard', stats: stats('vanguard'),
    attack: MELEE({ fx: 'slash' }),
    ability: { name: 'Rallying Guard', desc: 'Draws every foe to him and raises a shield worth a quarter of his health.', fx: 'shield_bubble',
      effects: [{ type: 'taunt', dur: 3 }, { type: 'shield', pct: 0.25, area: 'self', dur: 6 }] },
    passive: { name: 'Steadfast', desc: '+15% defence.', def: 0.15 },
  },
  ysolde: {
    name: 'Ysolde', title: 'Mage of the old school', set: 'eiryn', cls: 'mystic', stats: stats('mystic'),
    attack: SHOT({ projectile: 18, bolt: 'energy_bolt', hit: 'spell_impact' }),
    ability: { name: 'Force Wave', desc: 'Crushing force around her target: heavy damage, a stun and a shove.', fx: 'shockwave',
      effects: [{ type: 'damage', mult: 2.2, area: 'circle', radius: 2.4, stun: 0.8, knock: 2.5 }] },
    passive: { name: 'Deep Focus', desc: '+10% critical chance.', crit: 0.1 },
  },
  saela: {
    name: 'Saela', title: 'Archer of the dawn order', set: 'aerys', cls: 'ranger', stats: stats('ranger'),
    attack: SHOT({ bolt: 'magic_missile', hit: 'hit_holy' }),
    ability: { name: 'Lance of Dawn', desc: 'A beam of light through every foe in a line.', fx: 'lightning_holy',
      effects: [{ type: 'damage', mult: 2.6, area: 'line', length: 9, width: 0.9 }] },
    passive: { name: 'Keen Eye', desc: '+15% attack.', atk: 0.15 },
  },
  vesk: {
    name: 'Vesk', title: 'Knife for hire', set: 'nox', cls: 'striker', stats: stats('striker', { crit: 0.2 }), dive: true,
    attack: MELEE({ windup: 0.2, recover: 0.24, fx: 'dagger' }),
    ability: { name: 'Shadow Step', desc: 'Steps behind the weakest foe and cuts three times.', fx: 'teleport',
      effects: [{ type: 'blink', to: 'lowestEnemy' }, { type: 'damage', mult: 0.95, area: 'target', hits: 3 }] },
    passive: { name: 'Killer Instinct', desc: '+15% critical chance.', crit: 0.15 },
  },
  maren: {
    name: 'Maren', title: 'Field healer', set: 'eloryn', cls: 'support', stats: stats('support'), healer: true,
    attack: SHOT({ projectile: 14, bolt: 'arcane_orb', hit: 'spell_impact' }),
    ability: { name: 'Mending Light', desc: 'Heals every ally for twice her attack.', fx: 'spell_heal',
      effects: [{ type: 'heal', mult: 2.0, area: 'allAllies' }] },
    passive: { name: 'Gentle Hands', desc: '+20% healing.', healPower: 0.2 },
  },
  brann: {
    name: 'Brann', title: 'Pit fighter with stone fists', set: 'braxen', cls: 'vanguard', stats: stats('vanguard', { hp: 980, atk: 58, def: 50 }),
    attack: MELEE({ windup: 0.34, fx: 'blunt' }),
    ability: { name: 'Earthbreaker', desc: 'Slams the ground: damage and a long stun around him.', fx: 'rock_burst',
      effects: [{ type: 'damage', mult: 1.8, area: 'self', radius: 2.2, stun: 1.2 }] },
    passive: { name: 'Thick Hide', desc: 'Takes 10% less damage.', dr: 0.1 },
  },
  osric: {
    name: 'Osric', title: 'Warden of the north gate', set: 'guard_gate', cls: 'vanguard', stats: stats('vanguard', { def: 70 }),
    attack: MELEE({ fx: 'thrust' }),
    ability: { name: 'Shield Wall', desc: 'Shields every ally for 15% of their health.', fx: 'shield_bubble',
      effects: [{ type: 'shield', pct: 0.15, area: 'allAllies', dur: 6 }] },
    passive: { name: 'Gatekeeper', desc: '+15% health.', hp: 0.15 },
  },
  hesta: {
    name: 'Hesta', title: 'Spear of the river clans', set: 'spearwoman', cls: 'striker', stats: stats('striker', { range: 1.9 }),
    attack: MELEE({ windup: 0.28, fx: 'thrust' }),
    ability: { name: 'Skewer', desc: 'A lunging thrust through everything in a line.', fx: 'thrust',
      effects: [{ type: 'damage', mult: 2.4, area: 'line', length: 4.5, width: 0.9, knock: 1.5 }] },
    passive: { name: 'Reach', desc: '+10% attack.', atk: 0.1 },
  },
  wren: {
    name: 'Wren', title: 'Poacher turned scout', set: 'poacher', cls: 'ranger', stats: stats('ranger'),
    attack: SHOT({ bolt: 'arrow', hit: 'hit_pierce' }),
    ability: { name: 'Barbed Volley', desc: 'Three arrows at the three nearest foes; their wounds keep bleeding.', fx: 'arrow',
      effects: [{ type: 'damage', mult: 1.0, area: 'nearest3', dot: { mult: 0.4, dur: 4 } }] },
    passive: { name: 'Woodcraft', desc: '+10% attack speed.', spd: 0.1 },
  },
  pell: {
    name: 'Pell', title: 'Baker who would not leave', set: 'erdra_baker', cls: 'support', stats: stats('support', { range: 1.4, hp: 700 }),
    attack: MELEE({ fx: 'blunt' }),
    ability: { name: 'Warm Bread', desc: 'Every ally heals and hits 30% harder for 7 seconds.', fx: 'buff_up',
      effects: [{ type: 'heal', mult: 1.3, area: 'allAllies' }, { type: 'buff', stat: 'atk', pct: 0.3, dur: 7, area: 'allAllies' }] },
    passive: { name: 'Hearty', desc: '+20% health.', hp: 0.2 },
  },
  sable: {
    name: 'Sable', title: 'Hexer in a borrowed hood', set: 'hooded_follower', cls: 'mystic', stats: stats('mystic'),
    attack: SHOT({ projectile: 15, bolt: 'homing_orb', hit: 'debuff' }),
    ability: { name: 'Withering Hex', desc: 'Every foe takes damage and hits 25% softer for 5 seconds.', fx: 'dark_curse',
      effects: [{ type: 'damage', mult: 0.8, area: 'allEnemies' }, { type: 'debuff', stat: 'atk', pct: 0.25, dur: 5, area: 'allEnemies' }] },
    passive: { name: 'Malice', desc: '+10% attack.', atk: 0.1 },
  },
  cairn: {
    name: 'Cairn', title: 'A golem that chose a side', set: 'golem_a', cls: 'vanguard', stats: stats('vanguard', { hp: 1150, atk: 44, move: 2.9 }),
    attack: MELEE({ windup: 0.42, recover: 0.5, fx: 'blunt' }),
    ability: { name: 'Bulwark', desc: 'Draws every foe to it and takes half damage for 4 seconds.', fx: 'shield_bubble',
      effects: [{ type: 'taunt', dur: 4 }, { type: 'dr', pct: 0.5, dur: 4 }] },
    passive: { name: 'Stoneskin', desc: '+20% health.', hp: 0.2 },
  },
  thistle: {
    name: 'Thistle', title: 'Beastfolk wanderer', set: 'beastfolk_f', cls: 'support', stats: stats('support', { atk: 56 }),
    attack: SHOT({ projectile: 14, bolt: 'leaves', hit: 'hit_poison' }),
    ability: { name: 'Call of the Thicket', desc: 'Calls a briarhound to fight beside the team.', fx: 'summon',
      effects: [{ type: 'summon', key: 'briarhound', n: 1 }] },
    passive: { name: 'Wild Kin', desc: 'Her summons are 25% stronger.', summonPower: 0.25 },
  },
};

// Summoned creatures (scale with the summoner's level)
export const SUMMONS = {
  briarhound: { name: 'Briarhound', set: 'caged_creature', cls: 'striker', stats: stats('striker', { hp: 520, atk: 54, def: 26, move: 4.6 }), attack: MELEE({ fx: 'claw' }), scale: 0.75 },
  risen: { name: 'Risen Soldier', set: 'goblin', cls: 'vanguard', stats: stats('vanguard', { hp: 360, atk: 34, def: 30 }), attack: MELEE({ fx: 'slash' }) },
};

// The foes of the first lab fights.
export const ENEMIES = {
  bruiser: { name: 'Bruiser', set: 'bandit_broad', cls: 'vanguard', stats: stats('vanguard', { hp: 1000, atk: 58, def: 45, move: 3.1 }),
    attack: MELEE({ windup: 0.6, recover: 0.6, fx: 'blunt' }),
    ability: { name: 'Haymaker', fx: 'hit_blunt', effects: [{ type: 'damage', mult: 2.5, area: 'target', stun: 1.0, knock: 2 }] } },
  cutthroat: { name: 'Cutthroat', set: 'bandit_knife', cls: 'striker', stats: stats('striker'), dive: true,
    attack: MELEE({ windup: 0.22, recover: 0.28, fx: 'dagger' }),
    ability: { name: 'Backstab', fx: 'dark_slash', effects: [{ type: 'blink', to: 'lowestEnemy' }, { type: 'damage', mult: 2.4, area: 'target' }] } },
  brawler: { name: 'Brawler', set: 'bandit_grabber', cls: 'vanguard', stats: stats('vanguard', { hp: 820, atk: 54 }),
    attack: MELEE({ fx: 'blunt' }),
    ability: { name: 'Grapple', fx: 'hit_punch', effects: [{ type: 'damage', mult: 1.2, area: 'target', stun: 1.6 }] } },
  slinger: { name: 'Slinger', set: 'bandit_lookout', cls: 'ranger', stats: stats('ranger', { atk: 60 }),
    attack: SHOT({ bolt: 'rock', hit: 'hit_blunt' }),
    ability: { name: 'Stone Rain', fx: 'rock_burst', effects: [{ type: 'damage', mult: 1.4, area: 'circle', radius: 2 }] } },
  thug: { name: 'Thug', set: 'thug_a', cls: 'striker', stats: stats('striker', { hp: 700, atk: 70 }),
    attack: MELEE({ fx: 'blunt' }),
    ability: { name: 'Rally', fx: 'buff_up', effects: [{ type: 'buff', stat: 'atk', pct: 0.25, dur: 6, area: 'allAllies' }] } },
  risen: { name: 'Risen Soldier', set: 'goblin', cls: 'vanguard', stats: stats('vanguard', { hp: 760, atk: 48 }),
    attack: MELEE({ fx: 'slash' }),
    ability: { name: 'Bone Rattle', fx: 'smoke_dark', effects: [{ type: 'damage', mult: 1.3, area: 'self', radius: 1.8 }] } },
  pikeman: { name: 'Risen Pikeman', set: 'goblin_spear', cls: 'striker', stats: stats('striker', { range: 1.9 }),
    attack: MELEE({ fx: 'thrust' }),
    ability: { name: 'Bone Pike', fx: 'thrust', effects: [{ type: 'damage', mult: 2.0, area: 'line', length: 4, width: 0.8 }] } },
  archer: { name: 'Risen Archer', set: 'goblin_archer', cls: 'ranger', stats: stats('ranger'),
    attack: SHOT({ bolt: 'arrow', hit: 'hit_pierce' }),
    ability: { name: 'Grave Volley', fx: 'arrow', effects: [{ type: 'damage', mult: 0.9, area: 'nearest3' }] } },
  caller: { name: 'Bone Caller', set: 'goblin_hexer', cls: 'mystic', stats: stats('mystic', { atk: 64 }),
    attack: SHOT({ projectile: 14, bolt: 'homing_orb', hit: 'debuff' }),
    ability: { name: 'Raise the Fallen', fx: 'summon', effects: [{ type: 'summon', key: 'risen', n: 2 }] } },
  warlord: { name: 'Grave Warlord', set: 'ogre', cls: 'vanguard', boss: true, stats: stats('vanguard', { hp: 5200, atk: 105, def: 70, move: 2.8, range: 1.9 }),
    attack: MELEE({ windup: 0.7, recover: 0.7, fx: 'blunt' }),
    ability: { name: 'Grave Slam', fx: 'rock_burst', effects: [{ type: 'damage', mult: 1.7, area: 'self', radius: 3, stun: 1.0, knock: 2 }] } },
};

// Formation slots: 0-2 the front row (top, middle, bottom), 3-5 the back row.
export const SLOTS = [[2.4, -2.2], [2.4, 0], [2.4, 2.2], [5.2, -2.2], [5.2, 0], [5.2, 2.2]];

// Enemy waves for the battle lab: [key, slot] and a level.
export const WAVES = {
  ambush: { name: 'Roadside Ambush', level: 1, foes: [['bruiser', 1], ['brawler', 0], ['cutthroat', 2], ['slinger', 3], ['thug', 5]] },
  risen: { name: 'The Risen', level: 3, foes: [['risen', 0], ['risen', 2], ['pikeman', 1], ['archer', 3], ['caller', 4]] },
  warlord: { name: 'The Grave Warlord', level: 1, foes: [['warlord', 1], ['risen', 0], ['risen', 2], ['archer', 4]] },
};
