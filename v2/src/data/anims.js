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
  kael_sword: { attacks: ['Attack1', 'Attack2'] },
  eiryn: { attacks: ['Attack5'], cast: 'Attack5' },
  bandit_broad: { attacks: ['Attack5'], scale: 1.15 },
  bandit_knife: { attacks: ['Attack1', 'Attack2'] },
  bandit_grabber: { attacks: ['Attack5'] },
  bandit_lookout: { stance: 'Idle3' },
};

// The eight directions in the order the sheets store them, clockwise from east (screen space).
export const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
