// Animation data carried over from the Character Creator exports: which clip plays for each
// action, at what speed, and the attack timing (wind-up frames, the contact frame, recovery).
// Every set has the same 30 clips in eight directions (E, SE, S, SW, W, NW, N, NE).

// action -> [creator clip, frames per second, loops]
export const CLIPS = {
  idle: ['Idle4', 8, true],
  walk: ['Walk', 12, true],
  run: ['Run', 16, true],
  back: ['RunBackwards', 14, true],
  hit: ['TakeDamage', 20, false],
  down: ['Slide', 12, false],
  ko: ['Die', 14, false],
  dodge: ['Rolling', 30, false],
  victory: ['Taunt', 10, true],
  special: ['Special1', 12, false],
};

// The attack clips: wind-up frames, the contact frame, recovery.
export const PHASES = {
  Attack1: { windup: [0, 5], strike: [6, 6], recover: [7, 14] },
  Attack2: { windup: [0, 6], strike: [7, 7], recover: [8, 14] },
  Attack3: { windup: [0, 6], strike: [7, 7], recover: [8, 14] },
  Attack4: { windup: [0, 8], strike: [9, 9], recover: [10, 14] },
  Attack5: { windup: [0, 2], strike: [3, 3], recover: [4, 14] },
  Attack6: { windup: [0, 5], strike: [6, 6], recover: [7, 14] },
  Kick: { windup: [0, 6], strike: [7, 7], recover: [8, 14] },
  Special1: { windup: [0, 9], strike: [10, 10], recover: [11, 14] },
};

// Per sprite set: the attack clips it alternates through, the clip it casts with, its stance and size.
export const SETS = {
  // recruits
  kael_sword: { attacks: ['Attack1', 'Attack2'] },
  eiryn: { attacks: ['Attack5'], cast: 'Attack5' },
  aerys: { attacks: ['Attack5'], cast: 'Attack5', heavy: 'Attack3' },
  nox: { attacks: ['Attack1', 'Attack2', 'Attack6'] },
  eloryn: { attacks: ['Attack5'], cast: 'Attack3', heavy: 'Attack3' },
  braxen: { attacks: ['Attack5', 'Attack1', 'Kick'] },
  guard_gate: { attacks: ['Attack1', 'Attack2'] },
  spearwoman: { attacks: ['Attack3', 'Attack1'] },
  poacher: { attacks: ['Attack3'], cast: 'Attack3' },
  // the three smaller exports have one attack clip and no Special1: they cast with it too
  erdra_baker: { attacks: ['Attack5'], cast: 'Attack5', heavy: 'Attack5' },
  hooded_follower: { attacks: ['Attack5'], cast: 'Attack5', heavy: 'Attack5', scale: 0.9 },
  beastfolk_f: { attacks: ['Attack5'], cast: 'Attack5', heavy: 'Attack5' },
  golem_a: { attacks: ['Attack5', 'Attack4'], scale: 1.5 },
  caged_creature: { attacks: ['Attack1', 'Attack2'], scale: 1.5 },
  beastfolk_m: { attacks: ['Attack1', 'Attack2'] },
  guild_adventurer: { attacks: ['Attack1', 'Attack2'] },
  black_knight: { attacks: ['Attack1', 'Attack2'] },
  rival_kid: { attacks: ['Attack1', 'Attack2'] },
  kael_unarmed: { attacks: ['Attack1', 'Attack2', 'Kick'] },
  frost_assassin: { attacks: ['Attack1', 'Attack2'] },
  climber: { attacks: ['Attack1', 'Attack2'] },
  aerys_spear: { attacks: ['Attack1'], cast: 'Attack1', heavy: 'Attack3' },
  lyra: { attacks: ['Attack5'], cast: 'Attack5', heavy: 'Attack3' },
  alric: { attacks: ['Attack5'], cast: 'Attack5' },
  // foes
  bandit_broad: { attacks: ['Attack5'], scale: 1.15 },
  bandit_knife: { attacks: ['Attack1', 'Attack2'] },
  bandit_grabber: { attacks: ['Attack5'] },
  bandit_lookout: { stance: 'Idle3' },
  thug_a: { attacks: ['Attack5'], scale: 1.1 },
  goblin: { attacks: ['Attack1', 'Attack2'] },
  goblin_spear: { attacks: ['Attack3'] },
  goblin_archer: { attacks: ['Attack3'], cast: 'Attack3' },
  goblin_hexer: { attacks: ['Attack5'], cast: 'Attack5' },
  night_creature: { attacks: ['Attack1', 'Attack2'] },
  hamlet_predator: { attacks: ['Attack1', 'Attack2'] },
  nightcrawler: { attacks: ['Attack1', 'Attack2'] },
  cassius: { attacks: ['Attack1', 'Attack2'] },
  sky_beast: { attacks: ['Attack1', 'Attack2'] },
  gothic_knight_a: { attacks: ['Attack1', 'Attack2'] },
  gothic_knight_b: { attacks: ['Attack1', 'Attack2'] },
  fragment: { attacks: ['Attack5'], cast: 'Attack5' },
  braxen_frost: { attacks: ['Attack5', 'Attack1', 'Kick'] },
  golem_b: { attacks: ['Attack5', 'Attack4'], scale: 1.5 },
  alric_beast: { attacks: ['Attack1', 'Attack2'] },
  elder_dragon: { attacks: ['Attack1', 'Attack2'] },
  ogre: { attacks: ['Attack1', 'Attack2', 'Attack5'], scale: 1.8 },
};

// The eight directions in the order the sheets store them, clockwise from east (screen space).
export const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
