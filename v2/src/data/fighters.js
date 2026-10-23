// The fighters of milestone 1, with their attacks and abilities carried over as data.
// Distances in metres, times in seconds. dmg is a [min, max] range.
//   attack   the basic attack (melee unless it has projectile: speed in m/s)
//   melee    a second, close-range attack used when a foe is on top of a caster
//   special  the heavy art, fired from a full meter
// AI fields: role (how it fights), keepAway (a caster's preferred distance), parry / dodge
// (chances to block or roll from a melee blow it sees coming), firstTarget.

export const HEROES = {
  kael: {
    name: 'Kael', set: 'kael_sword', team: 'hero', r: 0.38, hp: 180, speed: 4.3,
    role: 'protector', parry: 0.45, dodge: 0.3, color: '#8fb8e6',
    attack: { name: 'Slash', range: 1.6, arc: 1.7, windup: 0.34, active: 0.1, recover: 0.38, dmg: [12, 16], knock: 1.0, lunge: 0.45, fx: 'slash' },
    special: { name: 'Heavy art', kind: 'blade', range: 2.6, arc: 2.6, dmg: [60, 75], knock: 4.5, dur: 1.6, impactAt: 1.0 },
  },
  eiryn: {
    name: 'Eiryn', set: 'eiryn', team: 'hero', r: 0.33, hp: 150, speed: 4.0,
    role: 'caster', keepAway: 3.6, parry: 0.4, dodge: 0.5, color: '#b9a0ff',
    attack: { name: 'Pressure', range: 6.5, arc: 0.7, windup: 0.4, active: 0.05, recover: 0.5, dmg: [14, 18], knock: 3, stagger: 0.6, projectile: 20, fx: 'pressure' },
    melee: { name: 'Pressure', range: 1.8, arc: 2.2, windup: 0.2, active: 0.08, recover: 0.4, dmg: [8, 10], knock: 4.2, stagger: 0.8, lunge: 0.1, fx: 'burst' },
    special: { name: 'Pressure', kind: 'area', radius: 5, dmg: [70, 85], knock: 5, dur: 1.6, impactAt: 0.9 },
  },
};

export const FOES = {
  brute: {
    name: 'Broad Bandit', set: 'bandit_broad', team: 'bandit', r: 0.48, hp: 172, speed: 3.3,
    role: 'melee', firstTarget: 'eiryn', parry: 0, dodge: 0.12,
    attack: { name: 'Fist', range: 1.7, arc: 1.7, windup: 0.8, active: 0.14, recover: 0.75, dmg: [39, 50], knock: 2.6, down: true, lunge: 0.6, fx: 'blunt' },
  },
  knife: {
    name: 'Knife Bandit', set: 'bandit_knife', team: 'bandit', r: 0.34, hp: 104, speed: 4.5,
    role: 'melee', parry: 0, dodge: 0.45,
    attack: { name: 'Stab', range: 1.3, arc: 1.2, windup: 0.3, active: 0.08, recover: 0.34, dmg: [18, 24], knock: 0.4, lunge: 0.7, fx: 'stab' },
  },
  grabber: {
    name: 'Flanking Bandit', set: 'bandit_grabber', team: 'bandit', r: 0.38, hp: 115, speed: 4.1,
    role: 'flanker', firstTarget: 'eiryn', parry: 0, dodge: 0.3,
    attack: { name: 'Grab', range: 1.3, arc: 1.4, windup: 0.44, active: 0.1, recover: 0.42, dmg: [15, 21], knock: 0.6, lunge: 0.55, fx: 'blunt' },
  },
  lookout: {
    name: 'Lookout', set: 'bandit_lookout', team: 'bandit', r: 0.33, hp: 60, speed: 4.7,
    role: 'lookout', noncombat: true, parry: 0, dodge: 0.45, attack: null,
  },
};

// The first fight: a clearing, Kael and Eiryn on the west side, the band to the east.
export const FIGHTS = {
  clearing: {
    name: 'The Clearing', arena: { w: 16, h: 8 },
    heroes: [{ key: 'kael', x: -4.2, y: 0.4 }, { key: 'eiryn', x: -5.6, y: -0.6 }],
    foes: [
      { key: 'brute', x: 4.0, y: 0.2 }, { key: 'knife', x: 3.4, y: -1.8 },
      { key: 'grabber', x: 4.6, y: 2.0 }, { key: 'lookout', x: 7.0, y: -3.0 },
    ],
  },
};
