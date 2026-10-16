/*
 * Tower of Wishes — arena simulation (prototype 0.1)
 *
 * Pure logic: no DOM, no canvas. Runs identically in the browser and in Node
 * (see test/sim-test.js). The renderer only reads state and drains s.fx / s.log.
 *
 * World units are metres. x runs east, y runs south, z is height.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowSim = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- utils
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  function angDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // ---------------------------------------------------------------- arenas
  // Each arena is an ellipse of open ground with obstacles and an exit
  // (where fleeing fighters run). `theme` tells the renderer how to dress it.
  const ARENAS = {
    // Chapter One: the forest clearing, a fallen trunk at Eiryn's back, the
    // path back toward the road in the north-east.
    clearing: {
      name: 'The Clearing', theme: 'forest', rx: 11, ry: 7.5, exit: { x: 12.5, y: -6.5 },
      obstacles: [
        { kind: 'trunk', ax: -3.6, ay: 2.9, bx: 1.6, by: 3.9, r: 0.45 },
        { kind: 'tree', x: -6.8, y: -3.2, r: 0.5 },
        { kind: 'tree', x: 5.8, y: 4.0, r: 0.55 },
        { kind: 'tree', x: 7.4, y: -1.2, r: 0.45 },
        { kind: 'rock', x: -2.2, y: -3.6, r: 0.7 },
        { kind: 'rock', x: 3.6, y: -0.6, r: 0.45 },
        { kind: 'rock', x: -8.2, y: 2.6, r: 0.55 },
      ],
    },
    // The tutorial: the last floor of the Tower, open to the sky, broken
    // pillars, and the light the climber reaches for in the north.
    summit: {
      name: 'The Last Floor', theme: 'summit', rx: 9, ry: 6.4, exit: { x: 0, y: -8.6 },
      obstacles: [
        { kind: 'pillar', x: -6.0, y: -3.0, r: 0.6 },
        { kind: 'pillar', x: 6.2, y: -2.7, r: 0.6 },
        { kind: 'pillar', x: -5.7, y: 3.3, r: 0.55 },
        { kind: 'pillar', x: 5.9, y: 3.5, r: 0.6 },
        { kind: 'rock', x: 0.6, y: 4.4, r: 0.5 },
      ],
    },
    // Chapter Five: the overgrown path up to the quarry.
    hillpath: {
      name: 'The Quarry Path', theme: 'hill', rx: 10, ry: 5.6, exit: { x: 11.5, y: -3 },
      obstacles: [
        { kind: 'rock', x: -3.5, y: -2.6, r: 0.8 },
        { kind: 'rock', x: 2.8, y: 2.4, r: 0.7 },
        { kind: 'rock', x: 6.2, y: -1.4, r: 0.55 },
        { kind: 'tree', x: -7.0, y: 2.2, r: 0.5 },
        { kind: 'rock', x: -0.4, y: 3.8, r: 0.5 },
      ],
    },
    // Chapter Five: the cave chamber behind the quarry face; the passage on
    // the west goes deeper into the hill.
    cave: {
      name: 'The Quarry Cave', theme: 'cave', rx: 8.6, ry: 5.8, exit: { x: -9.8, y: -0.5 },
      obstacles: [
        { kind: 'crate', x: 4.6, y: -2.6, r: 0.55 },
        { kind: 'crate', x: 5.6, y: -1.6, r: 0.5 },
        { kind: 'basin', x: -2.6, y: 2.6, r: 0.85 },
        { kind: 'rock', x: 2.2, y: 3.4, r: 0.6 },
        { kind: 'crate', x: -4.8, y: -3.0, r: 0.5 },
      ],
    },
    // Side missions (Proposals). The road north of town where the supply cart
    // went missing; a cart lies on its side in the ditch.
    road: {
      name: 'The North Road', theme: 'road', rx: 10.5, ry: 6, exit: { x: 12, y: 3 },
      obstacles: [
        { kind: 'cart', x: -1.2, y: -1.4, r: 0.9 },
        { kind: 'rock', x: 4.2, y: 2.6, r: 0.6 },
        { kind: 'tree', x: -6.4, y: 3.2, r: 0.5 },
        { kind: 'tree', x: 7.0, y: -3.0, r: 0.5 },
        { kind: 'rock', x: -5.0, y: -3.6, r: 0.5 },
      ],
    },
    // The old crossing: the stone bridge Eiryn remembers, standing over a
    // dry riverbed; broken walls of the town that was.
    ruins: {
      name: 'The Old Crossing', theme: 'ruins', rx: 10, ry: 6.2, exit: { x: -11.5, y: 0 },
      obstacles: [
        { kind: 'wall', x: -4.6, y: -2.8, r: 0.75 },
        { kind: 'wall', x: 3.8, y: 3.0, r: 0.7 },
        { kind: 'pillar', x: 0.2, y: -3.9, r: 0.55 },
        { kind: 'pillar', x: 0.4, y: 3.9, r: 0.55 },
        { kind: 'rock', x: 6.6, y: -1.6, r: 0.55 },
      ],
    },
    // The Guild's evaluation yard behind the office: a low stone wall, marked
    // lines, stone blocks and a wooden target.
    yard: {
      name: 'The Evaluation Yard', theme: 'yard', rx: 9, ry: 5.6, exit: { x: 0, y: -7.5 },
      obstacles: [
        { kind: 'block', x: -4.2, y: -2.2, r: 0.55 },
        { kind: 'block', x: 4.4, y: 2.2, r: 0.55 },
        { kind: 'target', x: 4.8, y: -2.8, r: 0.4 },
        { kind: 'block', x: -3.8, y: 2.8, r: 0.5 },
      ],
    },
    // Behind the quarry cave: the natural passage the goblins fled into.
    deep: {
      name: 'The Deep Passage', theme: 'deep', rx: 9, ry: 5.2, exit: { x: -10.5, y: 0.5 },
      obstacles: [
        { kind: 'rock', x: -3.0, y: -2.4, r: 0.75 },
        { kind: 'rock', x: 2.6, y: 2.6, r: 0.7 },
        { kind: 'crate', x: 5.2, y: -2.2, r: 0.5 },
      ],
    },
    // Staged scenes only: the tavern by the Guild office (Chapter One).
    tavern: {
      name: 'The Tavern', theme: 'tavern', rx: 8, ry: 5, exit: { x: 9.5, y: -2 },
      obstacles: [
        { kind: 'table', x: -3.0, y: -1.2, r: 0.8 },
        { kind: 'table', x: 2.4, y: 1.6, r: 0.75 },
        { kind: 'bar', x: 4.6, y: -3.2, r: 0.9 },
        { kind: 'hearth', x: -6.2, y: 2.6, r: 0.8 },
      ],
    },
  };
  let ARENA = ARENAS.clearing;
  // Heavy arts are once per match, so they land hard.
  const HEAVY_MUL = 1.7;
  let NAV = null;

  function obstacleCenter(o, px, py) {
    if (o.kind !== 'trunk') return { x: o.x, y: o.y };
    const dx = o.bx - o.ax, dy = o.by - o.ay;
    let t = ((px - o.ax) * dx + (py - o.ay) * dy) / (dx * dx + dy * dy);
    t = clamp(t, 0, 1);
    return { x: o.ax + dx * t, y: o.ay + dy * t };
  }

  // Line of sight: does the segment a->b pass through any obstacle?
  function hasLOS(a, b) {
    const steps = Math.ceil(dist(a, b) / 0.25);
    for (let i = 1; i < steps; i++) {
      const px = a.x + ((b.x - a.x) * i) / steps;
      const py = a.y + ((b.y - a.y) * i) / steps;
      for (const o of ARENA.obstacles) {
        const c = obstacleCenter(o, px, py);
        if (Math.hypot(px - c.x, py - c.y) < o.r) return false;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- units
  // Each fighter has a "brain": reaction time, how well it reads feints,
  // how often it chooses to parry or dodge, and a personality flag or two.
  // Lines in `barks` and `intro` are quoted from the manuscript (Chapter One).
  // `intro.epithet` is a short description for the face-off card, taken from
  // how the chapter describes each person.
  const DEFS = {
    kael: {
      name: 'Kael', team: 'hero', r: 0.38, hp: 180, sta: 100, speed: 4.3,
      react: 0.17, read: 0.6, parry: 0.55, dodge: 0.5, feint: 0.1,
      protector: true, riposte: true, cleave: true, superMeter: true, opener: 'rush',
      attack: { name: 'Slash', range: 1.6, arc: 1.7, windup: 0.34, active: 0.1, recover: 0.38, dmg: [12, 16], knock: 1.0, lunge: 0.45, sta: 12 },
      barks: {
        super: 'Back away.', win: 'They\u2019re gone.', protect: 'Let go.',
        distracted: 'Where do you think you\u2019re going?', reply: 'Then you should have left her alone.',
      },
      intro: { epithet: 'Guild adventurer', line: 'Somebody who asked nicely.' },
    },
    eiryn: {
      name: 'Eiryn', team: 'hero', guest: true, r: 0.33, hp: 70, sta: 40, speed: 3.4,
      react: 0.3, read: 0.5, parry: 0, dodge: 0.4, feint: 0, opener: 'brace', startsUnarmed: true,
      attack: { name: 'Branch', range: 1.5, arc: 1.5, windup: 0.46, active: 0.1, recover: 0.6, dmg: [3, 5], knock: 0.8, stagger: 0.55, lunge: 0.25, sta: 15 },
      barks: { warn: 'Behind you!' },
      intro: { epithet: 'Mage \u00b7 mana spent', line: 'I said no.' },
    },
    brute: {
      name: 'Broad Bandit', team: 'bandit', r: 0.48, hp: 172, sta: 100, speed: 3.3,
      react: 0.36, read: 0.2, parry: 0, dodge: 0.12, feint: 0.05, morale: 1.25,
      punisher: true, firstTarget: 'eiryn', opener: 'advance',
      attack: { name: 'Fist', range: 1.7, arc: 1.7, windup: 0.8, active: 0.14, recover: 0.75, dmg: [39, 50], knock: 2.6, down: true, lunge: 0.6, sta: 20 },
      barks: { punish: 'That\u2019s what I thought.' },
      intro: { epithet: 'Broad-shouldered', line: 'Then do another trick. The big one.' },
    },
    knife: {
      name: 'Knife Bandit', team: 'bandit', r: 0.34, hp: 104, sta: 100, speed: 4.5,
      react: 0.22, read: 0.4, parry: 0, dodge: 0.55, feint: 0.45, morale: 1.0, opener: 'dip',
      attack: { name: 'Stab', range: 1.3, arc: 1.2, windup: 0.3, active: 0.08, recover: 0.34, dmg: [18, 24], knock: 0.4, lunge: 0.7, sta: 10 },
      barks: {},
      intro: { epithet: 'Short knife', line: 'Who are you supposed to be?' },
    },
    grabber: {
      name: 'Flanking Bandit', team: 'bandit', r: 0.38, hp: 115, sta: 100, speed: 4.1,
      react: 0.26, read: 0.3, parry: 0, dodge: 0.3, feint: 0.15, morale: 1.0,
      flanker: true, firstTarget: 'eiryn', opener: 'flank',
      attack: { name: 'Grab', range: 1.3, arc: 1.4, windup: 0.44, active: 0.1, recover: 0.42, dmg: [15, 21], knock: 0.6, lunge: 0.55, sta: 12 },
      barks: { flee: 'She\u2019s trouble.' },
      intro: { epithet: 'Circling the trunk', line: null },
    },
    lookout: {
      name: 'Lookout', team: 'bandit', r: 0.33, hp: 60, sta: 100, speed: 4.7,
      react: 0.25, read: 0.35, parry: 0, dodge: 0.45, feint: 0, morale: 0.55,
      noncombat: true, post: { x: 7.4, y: -4.4 }, opener: 'hangback',
      attack: null,
      barks: {},
      intro: { epithet: 'Hanging back by the path', line: null },
    },
    // Town folk for staged scenes (never fight).
    spearwoman: {
      name: 'Spearwoman', team: 'hero', r: 0.36, hp: 100, sta: 100, speed: 4.2, guest: true,
      react: 0.3, read: 0.3, parry: 0, dodge: 0, feint: 0, noncombat: true, attack: null, weapon: 'spear',
      barks: {}, intro: { epithet: 'Two contracts with Kael', line: null },
    },
    cook: {
      name: 'The Cook', team: 'hero', r: 0.38, hp: 100, sta: 100, speed: 3.5, guest: true,
      react: 0.3, read: 0.3, parry: 0, dodge: 0, feint: 0, noncombat: true, attack: null,
      barks: {}, intro: { epithet: 'Can hear you', line: null },
    },
    patron: {
      name: 'Patron', team: 'hero', r: 0.36, hp: 100, sta: 100, speed: 3.8, guest: true,
      react: 0.3, read: 0.3, parry: 0, dodge: 0, feint: 0, noncombat: true, attack: null,
      barks: {}, intro: { epithet: 'Regular', line: null },
    },
  };

  // ---- Starting characters (Proposals: names, looks, powers and lines
  // need the author's approval; see docs/STORY.md).
  Object.assign(DEFS, {
    ren: {
      name: 'Ren Ashgrove', team: 'hero', r: 0.36, hp: 150, sta: 110, speed: 5.0,
      react: 0.15, read: 0.5, parry: 0.25, dodge: 0.7, feint: 0.25,
      brain: 'duelist', protector: true, superMeter: true, opener: 'rush', combo: 3,
      blink: { range: 6, cd: 4.5 },
      attack: { name: 'Twin Fang', range: 1.35, arc: 1.5, windup: 0.24, active: 0.08, recover: 0.26, dmg: [9, 12], knock: 0.6, lunge: 0.75, sta: 9 },
      heavy: { name: 'Hundredfold Step', radius: 4.2, arc: 6.3, dmg: [30, 38] },
      barks: { super: 'Keep up.', protect: 'Behind me.', win: 'That all of you?' },
      intro: { epithet: 'Vampire-blooded runner', line: 'I\u2019ll be quick.' },
    },
    mara: {
      name: 'Mara Quill', team: 'hero', r: 0.34, hp: 125, sta: 100, speed: 4.1,
      react: 0.19, read: 0.6, parry: 0.45, dodge: 0.35, feint: 0,
      brain: 'caster', superMeter: true, opener: 'retreat', keepAway: 4.6,
      attack: { name: 'Force Bolt', range: 7.5, arc: 0.6, windup: 0.5, active: 0.05, recover: 0.42, dmg: [12, 15], knock: 1.5, sta: 10, projectile: 14 },
      melee: { name: 'Shove', range: 1.7, arc: 1.9, windup: 0.24, active: 0.08, recover: 0.4, dmg: [5, 7], knock: 3.4, stagger: 0.7, lunge: 0.1, sta: 12 },
      heavy: { name: 'Lattice Lance', radius: 8, arc: 0.7, dmg: [55, 68], line: true },
      barks: { super: 'Hold still.', win: 'Registered and done.' },
      intro: { epithet: 'Licensed glyph-caster', line: 'I have a permit for this.' },
    },
    brannoc: {
      name: 'Brannoc Vell', team: 'hero', r: 0.44, hp: 240, sta: 120, speed: 3.5,
      react: 0.2, read: 0.5, parry: 0.78, dodge: 0.1, feint: 0.05,
      brain: 'duelist', protector: true, riposte: true, superMeter: true, opener: 'advance', taunt: true,
      attack: { name: 'Shield Bash', range: 1.5, arc: 1.9, windup: 0.4, active: 0.12, recover: 0.48, dmg: [17, 22], knock: 1.8, stagger: 0.4, lunge: 0.4, sta: 12 },
      heavy: { name: 'Anvilfall', radius: 4.0, arc: 6.3, dmg: [34, 42] },
      barks: { super: 'Down you go.', protect: 'On me!', win: 'Road\u2019s clear.' },
      intro: { epithet: 'Dwarven shield-bearer', line: 'You\u2019ll go through me first.' },
    },
    // Eiryn once her mana has partly returned (Chapter Four on): force glyphs.
    eirynMage: {
      name: 'Eiryn', team: 'hero', r: 0.33, hp: 95, sta: 80, speed: 3.8,
      react: 0.22, read: 0.6, parry: 0.4, dodge: 0.4, feint: 0,
      brain: 'caster', superMeter: true, opener: 'retreat', keepAway: 4.2,
      attack: { name: 'Pressure Glyph', range: 6.5, arc: 0.6, windup: 0.45, active: 0.05, recover: 0.5, dmg: [9, 12], knock: 2.2, stagger: 0.5, sta: 10, projectile: 16 },
      melee: { name: 'Shove', range: 1.6, arc: 1.8, windup: 0.22, active: 0.08, recover: 0.4, dmg: [4, 6], knock: 3.6, stagger: 0.7, lunge: 0.1, sta: 12 },
      // The book's narrow path of force that put the ogre through the wall.
      heavy: { name: 'Force Lance', radius: 8, arc: 0.6, dmg: [70, 85], line: true },
      barks: {},
      intro: { epithet: 'Mage \u00b7 force glyphs', line: null },
    },
    // ---- The tutorial: the climber at the top of the Tower (a mystery).
    climber: {
      name: 'The Climber', team: 'hero', r: 0.38, hp: 420, sta: 140, speed: 5.2,
      react: 0.12, read: 0.85, parry: 0.7, dodge: 0.6, feint: 0.2,
      brain: 'duelist', riposte: true, cleave: true, superMeter: true, startSuper: 100, opener: 'rush', combo: 3,
      blink: { range: 7, cd: 3.5 },
      attack: { name: 'Broken Blade', range: 1.7, arc: 1.9, windup: 0.26, active: 0.1, recover: 0.3, dmg: [26, 32], knock: 1.4, lunge: 0.6, sta: 10 },
      heavy: { name: 'Final Ascent', radius: 5.0, arc: 6.3, dmg: [80, 95] },
      barks: {},
      intro: { epithet: 'The last floor', line: null },
    },
    // ---- The Tower's unseen guardian: never shown whole.
    shade: {
      name: 'Fragment', team: 'bandit', r: 0.34, hp: 80, sta: 100, speed: 5.0,
      react: 0.2, read: 0.4, parry: 0, dodge: 0.45, feint: 0.35, morale: 99, noFlee: true, dissolve: true,
      blink: { range: 7, cd: 3 }, opener: 'blink',
      attack: { name: 'Rend', range: 1.4, arc: 1.4, windup: 0.38, active: 0.08, recover: 0.4, dmg: [18, 24], knock: 0.8, lunge: 0.6, sta: 10 },
      barks: {}, intro: { epithet: 'A piece of something', line: null },
    },
    veil: {
      name: 'The Unseen', team: 'bandit', r: 0.85, hp: 620, sta: 200, speed: 2.8,
      react: 0.3, read: 0.5, parry: 0, dodge: 0, feint: 0.1, morale: 99, noFlee: true, dissolve: true, boss: true, punisher: true,
      blink: { range: 8, cd: 5 }, opener: 'none',
      attack: { name: 'Collapse', range: 2.7, arc: 2.6, windup: 1.0, active: 0.16, recover: 0.8, dmg: [42, 56], knock: 3, down: true, lunge: 0.3, sta: 20 },
      barks: {}, intro: { epithet: 'What guards the top', line: null },
    },
    // ---- Chapter Five: goblins and the ogre.
    goblin: {
      name: 'Goblin', team: 'bandit', r: 0.3, hp: 58, sta: 100, speed: 4.7,
      react: 0.24, read: 0.3, parry: 0, dodge: 0.4, feint: 0.2, morale: 0.75, opener: 'dip',
      attack: { name: 'Stab', range: 1.2, arc: 1.3, windup: 0.3, active: 0.08, recover: 0.35, dmg: [10, 13], knock: 0.4, lunge: 0.6, sta: 10 },
      barks: {}, intro: { epithet: 'Grain thief', line: null },
    },
    goblinSpear: {
      name: 'Goblin Spearman', team: 'bandit', r: 0.32, hp: 70, sta: 100, speed: 4.3,
      react: 0.26, read: 0.3, parry: 0, dodge: 0.3, feint: 0.15, morale: 0.85, opener: 'advance',
      attack: { name: 'Spear Thrust', range: 1.95, arc: 1.0, windup: 0.46, active: 0.1, recover: 0.45, dmg: [13, 16], knock: 0.8, lunge: 0.8, sta: 12 },
      barks: {}, intro: { epithet: 'Holds the narrow path', line: null },
    },
    goblinArcher: {
      name: 'Goblin Archer', team: 'bandit', r: 0.3, hp: 48, sta: 100, speed: 4.5,
      react: 0.25, read: 0.35, parry: 0, dodge: 0.45, feint: 0, morale: 0.6, ranged: true, keepAway: 6, opener: 'hangback',
      attack: { name: 'Arrow', range: 9, arc: 0.6, windup: 0.7, active: 0.05, recover: 0.5, dmg: [11, 14], knock: 0.4, sta: 0, projectile: 15 },
      barks: {}, intro: { epithet: 'A rough wooden bow', line: null },
    },
    ogre: {
      name: 'Ogre', team: 'bandit', r: 0.78, hp: 560, sta: 200, speed: 3.0,
      react: 0.45, read: 0.1, parry: 0, dodge: 0, feint: 0, morale: 99, noFlee: true, boss: true, punisher: true, cleave: true, opener: 'advance',
      attack: { name: 'Beam Sweep', range: 2.7, arc: 2.6, windup: 1.05, active: 0.16, recover: 0.9, dmg: [42, 55], knock: 3.2, down: true, lunge: 0.4, sta: 20 },
      barks: {}, intro: { epithet: 'Not in the contract', line: null },
    },

    // ---- side missions and the Guild yard (all Proposals)
    thug: {
      name: 'Road Thug', team: 'bandit', r: 0.4, hp: 120, sta: 100, speed: 4.0,
      react: 0.28, read: 0.25, parry: 0.15, dodge: 0.15, feint: 0.15, morale: 0.7, opener: 'advance',
      attack: { name: 'Cudgel', range: 1.45, arc: 1.6, windup: 0.45, active: 0.1, recover: 0.45, dmg: [12, 16], knock: 1.2, lunge: 0.4, sta: 12 },
      barks: {}, intro: { epithet: 'Hired for the road', line: null },
    },
    beast: {
      name: 'The Stray', team: 'bandit', r: 0.62, hp: 380, sta: 160, speed: 5.4,
      react: 0.22, read: 0.3, parry: 0, dodge: 0.35, feint: 0.25, morale: 99, noFlee: true, boss: true, opener: 'rush',
      attack: { name: 'Three Rows of Teeth', range: 1.7, arc: 1.5, windup: 0.5, active: 0.1, recover: 0.55, dmg: [22, 30], knock: 1.6, lunge: 1.1, sta: 14 },
      barks: {}, intro: { epithet: 'Enough teeth for three animals', line: null },
    },
    echo: {
      name: 'Echo', team: 'bandit', r: 0.34, hp: 70, sta: 100, speed: 4.6,
      react: 0.24, read: 0.35, parry: 0, dodge: 0.4, feint: 0.3, morale: 99, noFlee: true, dissolve: true,
      blink: { range: 6, cd: 4 }, opener: 'blink',
      attack: { name: 'Cold Hand', range: 1.35, arc: 1.4, windup: 0.4, active: 0.08, recover: 0.42, dmg: [11, 15], knock: 0.7, lunge: 0.6, sta: 10 },
      barks: {}, intro: { epithet: 'What the Reset left behind', line: null },
    },
    warden: {
      name: 'The Drowned Bell', team: 'bandit', r: 0.7, hp: 460, sta: 200, speed: 2.9,
      react: 0.4, read: 0.25, parry: 0.2, dodge: 0, feint: 0.1, morale: 99, noFlee: true, boss: true, punisher: true, cleave: true, dissolve: true, opener: 'advance',
      attack: { name: 'Tolling Flood', range: 2.4, arc: 2.4, windup: 0.95, active: 0.16, recover: 0.8, dmg: [30, 40], knock: 2.8, down: true, lunge: 0.3, sta: 18 },
      barks: {}, intro: { epithet: 'It still rings for the town', line: null },
    },
    golem: {
      name: 'Practice Block', team: 'bandit', r: 0.48, hp: 90, sta: 100, speed: 3.0,
      react: 0.5, read: 0.1, parry: 0, dodge: 0, feint: 0, morale: 99, noFlee: true, dissolve: true, opener: 'advance',
      attack: { name: 'Shove', range: 1.4, arc: 1.6, windup: 0.8, active: 0.1, recover: 0.7, dmg: [6, 9], knock: 1.4, lunge: 0.3, sta: 12 },
      barks: {}, intro: { epithet: 'A stone block, glyph-driven', line: null },
    },
    goblinHexer: {
      name: 'Goblin Hexer', team: 'bandit', r: 0.3, hp: 60, sta: 100, speed: 4.2,
      react: 0.25, read: 0.35, parry: 0, dodge: 0.45, feint: 0, morale: 0.7, ranged: true, keepAway: 5.5, opener: 'hangback',
      attack: { name: 'Stolen Glyph', range: 8, arc: 0.6, windup: 0.75, active: 0.05, recover: 0.5, dmg: [13, 16], knock: 1.2, sta: 0, projectile: 13 },
      barks: {}, intro: { epithet: 'Scratches glyphs it copied', line: null },
    },
    goblinChief: {
      name: 'Goblin Chief', team: 'bandit', r: 0.46, hp: 340, sta: 160, speed: 4.4,
      react: 0.24, read: 0.4, parry: 0.3, dodge: 0.25, feint: 0.3, morale: 99, noFlee: true, boss: true, punisher: true, opener: 'advance',
      attack: { name: 'Miller’s Cleaver', range: 1.6, arc: 1.7, windup: 0.5, active: 0.1, recover: 0.5, dmg: [20, 27], knock: 1.4, lunge: 0.6, sta: 14 },
      barks: {}, intro: { epithet: 'Wears a grain sack as a cloak', line: null },
    },
  });

  // Face-off order for the default Chapter One match.
  const INTRO_ORDER = ['eiryn', 'brute', 'knife', 'grabber', 'lookout', 'kael'];

  // ---------------------------------------------------------------- scenarios
  // Each match is a scenario: an arena, a cast, and slots for the player's
  // party ({slot: n}). Positions are metres; f is the starting facing.
  const SCENARIOS = {
    clearing: {
      chapter: 'Chapter One', title: 'The Clearing', arena: 'clearing', allOutUses: 1, vs: 'brute', scale: { hp: 1.1, dmg: 1.35 },
      units: [
        { slot: 0, x: -8.8, y: 0.7, f: 0.1 },
        { key: 'kael', x: -7.5, y: -1.2, f: 0.2 },
        { key: 'eiryn', x: -0.8, y: 2.2, f: -1.6 },
        { key: 'brute', x: 0.5, y: 0.7, f: 2.3 },
        { key: 'knife', x: -2.4, y: 0.7, f: 0.8 },
        { key: 'grabber', x: 2.8, y: 2.6, f: 3.0 },
        { key: 'lookout', x: 6.2, y: -3.8, f: 2.6 },
      ],
      // How the player chose to go in (Chapter One choice).
      mods: {
        charge: { slot0: { x: -4.4, y: 0.2 }, kael: { x: -11, y: -2.6 }, surprise: true },
        circle: { slot0: { x: 3.6, y: 5.6, f: -2.4 }, noDistract: true },
        follow: { slot0: { x: -9.6, y: 0.2 }, kaelSuper: 40 },
      },
    },
    tutorial: {
      chapter: 'Prologue', title: 'The Last Ascent', arena: 'summit', allOutUses: 2, allOutStart: 1, vs: 'veil', scale: { hp: 2.2, dmg: 1.0 },
      units: [
        { key: 'climber', x: -4.6, y: 1.0, f: 0 },
        { key: 'shade', x: 1.2, y: -1.8, f: 3.1 },
        { key: 'shade', x: 1.8, y: 2.0, f: 3.1 },
        { key: 'shade', x: 3.6, y: 0.2, f: 3.1 },
        { key: 'veil', x: 6.0, y: -0.4, f: 3.1 },
      ],
    },
    path: {
      chapter: 'Chapter Five', title: 'The Quarry Path', arena: 'hillpath', allOutUses: 1, vs: 'goblinSpear', scale: { hp: 2.1, dmg: 1.9 },
      units: [
        { slot: 0, x: -7.2, y: 0.2, f: 0 }, { slot: 1, x: -8.0, y: -1.4, f: 0 }, { slot: 2, x: -8.2, y: 1.6, f: 0 },
        { key: 'goblinSpear', x: 1.5, y: -0.4, f: 3.1 },
        { key: 'goblinArcher', x: 6.5, y: 1.4, f: 3.1 },
        { key: 'goblin', x: 2.6, y: 1.8, f: 3.1 },
      ],
      // Chapter Five: which way up the hill.
      mods: {
        long: {},
        wade: { surprise: true },
      },
    },
    cave: {
      chapter: 'Chapter Five', title: 'The Cave Chamber', arena: 'cave', allOutUses: 2, vs: 'goblinArcher', scale: { hp: 3.0, dmg: 2.4 },
      units: [
        { slot: 0, x: 6.6, y: 0.6, f: 3.1 }, { slot: 1, x: 7.2, y: 2.0, f: 3.1 }, { slot: 2, x: 7.4, y: -0.8, f: 3.1 },
        { key: 'goblinArcher', x: -4.2, y: 0.4, f: 0 },
        { key: 'goblin', x: -1.2, y: -1.2, f: 0, morale: 0.45 },
        { key: 'goblin', x: -1.6, y: 1.4, f: 0, morale: 0.45 },
      ],
    },
    ogre: {
      chapter: 'Chapter Five', title: 'Not in the Contract', arena: 'cave', allOutUses: 2, vs: 'ogre', scale: { hp: 1.0, dmg: 2.4 },
      units: [
        { slot: 0, x: 4.8, y: 0.4, f: 3.1 }, { slot: 1, x: 5.6, y: 1.8, f: 3.1 }, { slot: 2, x: 5.8, y: -1.0, f: 3.1 },
        { key: 'ogre', x: -5.4, y: -0.3, f: 0 },
      ],
      // Chapter Five: backing toward the entrance, or caught at the crates.
      mods: {
        ready: { heroSuper: 35 },
        caught: { ambush: true },
      },
    },

    // ---- side missions, dungeon rooms, the yard (all Proposals)
    training: {
      chapter: 'The Guild', title: 'The Evaluation Yard', arena: 'yard', allOutUses: 1, allOutStart: 1, vs: 'golem', scale: { hp: 1.0, dmg: 1.0 },
      units: [
        { slot: 0, x: -5.5, y: 0.2, f: 0 }, { slot: 1, x: -6.2, y: -1.4, f: 0 }, { slot: 2, x: -6.2, y: 1.6, f: 0 },
        { key: 'golem', x: 2.2, y: -1.2, f: 3.1 },
        { key: 'golem', x: 2.6, y: 1.4, f: 3.1 },
      ],
    },
    cart: {
      chapter: 'Guild contract', title: 'The Missing Supply Cart', arena: 'road', allOutUses: 2, vs: 'knife', scale: { hp: 1.5, dmg: 1.6 },
      units: [
        { slot: 0, x: -7.4, y: 0.4, f: 0 }, { slot: 1, x: -8.0, y: -1.2, f: 0 }, { slot: 2, x: -8.2, y: 1.8, f: 0 },
        { key: 'knife', x: 1.4, y: 0.6, f: 3.1 },
        { key: 'thug', x: 3.0, y: -2.0, f: 3.1 },
        { key: 'thug', x: 3.6, y: 2.4, f: 3.1 },
      ],
    },
    stray: {
      chapter: 'Guild contract', title: 'Enough Teeth for Three', arena: 'clearing', allOutUses: 2, vs: 'beast', scale: { hp: 1.75, dmg: 1.8 },
      units: [
        { slot: 0, x: -7.6, y: 0.4, f: 0 }, { slot: 1, x: -8.2, y: -1.4, f: 0 }, { slot: 2, x: -8.4, y: 1.6, f: 0 },
        { key: 'beast', x: 4.0, y: -1.0, f: 3.1 },
      ],
    },
    crossing: {
      chapter: 'Side story', title: 'The Old Crossing', arena: 'ruins', allOutUses: 2, vs: 'warden', scale: { hp: 0.95, dmg: 1.25 },
      units: [
        { slot: 0, x: -7.0, y: 0.2, f: 0 }, { slot: 1, x: -7.6, y: -1.4, f: 0 }, { slot: 2, x: -7.8, y: 1.6, f: 0 },
        { key: 'echo', x: 0.6, y: -1.8, f: 3.1 },
        { key: 'echo', x: 1.2, y: 2.0, f: 3.1 },
        { key: 'warden', x: 5.4, y: 0.0, f: 3.1 },
      ],
    },
    deep1: {
      chapter: 'Dungeon', title: 'The Deep Passage I', arena: 'deep', allOutUses: 1, vs: 'goblinSpear', scale: { hp: 2.2, dmg: 2.0 },
      units: [
        { slot: 0, x: 6.4, y: 0.4, f: 3.1 }, { slot: 1, x: 7.0, y: 1.8, f: 3.1 }, { slot: 2, x: 7.2, y: -1.0, f: 3.1 },
        { key: 'goblinSpear', x: -1.0, y: -1.0, f: 0 }, { key: 'goblin', x: -1.6, y: 1.6, f: 0 }, { key: 'goblin', x: -4.0, y: 0.2, f: 0 },
      ],
    },
    deep2: {
      chapter: 'Dungeon', title: 'The Deep Passage II', arena: 'deep', allOutUses: 1, vs: 'goblinHexer', scale: { hp: 2.4, dmg: 2.1 },
      units: [
        { slot: 0, x: 6.4, y: 0.4, f: 3.1 }, { slot: 1, x: 7.0, y: 1.8, f: 3.1 }, { slot: 2, x: 7.2, y: -1.0, f: 3.1 },
        { key: 'goblinHexer', x: -5.0, y: -1.4, f: 0 }, { key: 'goblinArcher', x: -5.4, y: 2.0, f: 0 }, { key: 'goblinSpear', x: -0.8, y: 0.4, f: 0 },
      ],
    },
    deep3: {
      chapter: 'Dungeon', title: 'The Chief’s Hall', arena: 'deep', allOutUses: 2, vs: 'goblinChief', scale: { hp: 1.05, dmg: 1.8 },
      units: [
        { slot: 0, x: 6.4, y: 0.4, f: 3.1 }, { slot: 1, x: 7.0, y: 1.8, f: 3.1 }, { slot: 2, x: 7.2, y: -1.0, f: 3.1 },
        { key: 'goblinChief', x: -4.6, y: 0.2, f: 0 }, { key: 'goblin', x: -2.0, y: -2.0, f: 0 }, { key: 'goblin', x: -2.4, y: 2.2, f: 0 },
      ],
    },
    // Arcade: endless waves in the yard; the score is how many you clear.
    arcade: {
      chapter: 'Arcade', title: 'Yard Gauntlet', arena: 'yard', allOutUses: 3, vs: 'thug', scale: { hp: 1.0, dmg: 1.2 }, endless: true,
      units: [
        { slot: 0, x: -5.5, y: 0.2, f: 0 }, { slot: 1, x: -6.2, y: -1.4, f: 0 }, { slot: 2, x: -6.2, y: 1.6, f: 0 },
        { key: 'thug', x: 2.4, y: 0.2, f: 3.1 }, { key: 'golem', x: 3.4, y: -2.0, f: 3.1 },
      ],
    },
  };

  // Arcade waves: more foes and tougher each wave.
  const WAVE_POOL = ['goblin', 'goblinSpear', 'goblinArcher', 'thug', 'knife', 'echo', 'goblinHexer', 'golem'];
  const WAVE_BOSSES = ['beast', 'goblinChief', 'ogre', 'warden'];

  const FREE = { idle: 1, move: 1, circle: 1 };

  // Level scaling: +10% health and +7% damage per level above 1.
  const levelHp = (lv) => 1 + 0.1 * ((lv || 1) - 1);
  const levelPower = (lv) => 1 + 0.07 * ((lv || 1) - 1);

  // mods (gear and skills, js/progression.js): fractions added to the base,
  //   { hp, power, speed, parry, dodge, react, armor, superRate, sta, lifesteal, secondWind }
  function makeUnit(id, key, x, y, facing, hpFrac, level, mods) {
    const base = DEFS[key], m = mods || {};
    const d = mods ? Object.assign({}, base, {
      speed: base.speed * (1 + (m.speed || 0)),
      parry: Math.min(0.92, (base.parry || 0) + (m.parry || 0)),
      dodge: Math.min(0.9, (base.dodge || 0) + (m.dodge || 0)),
      react: Math.max(0.08, base.react * (1 - (m.react || 0))),
      sta: Math.round(base.sta * (1 + (m.sta || 0))),
    }) : base;
    const maxHp = Math.round(d.hp * levelHp(level) * (1 + (m.hp || 0)));
    return {
      id, key, def: d, name: d.name, team: d.team, guest: !!d.guest, r: d.r,
      level: level || 1, power: levelPower(level) * (1 + (m.power || 0)),
      armor: Math.min(0.5, m.armor || 0), superRate: 1 + (m.superRate || 0), lifesteal: m.lifesteal || 0, secondWind: m.secondWind ? 1 : 0,
      x, y, vx: 0, vy: 0, kx: 0, ky: 0, facing,
      hp: Math.max(1, Math.round(maxHp * (hpFrac == null ? 1 : hpFrac))), maxHp,
      sta: d.sta, maxSta: d.sta,
      state: 'idle', st: 0, dur: 0,
      act: null, pending: null, plan: null,
      target: null, aggroUntil: 0, cd: 0.6, combo: 0,
      strafe: 1, strafeT: 0,
      morale: d.morale == null ? 1 : d.morale, hurtOnce: false, fled: false,
      allOut: 0, drained: 0, superMeter: d.startSuper || 0, blinkCd: 1.5,
      walk: 0, icon: null, iconT: 0, bark: null, barkT: 0, flash: 0,
      armed: !d.startsUnarmed, fizzles: 0, beaten: false,
    };
  }

  // ---------------------------------------------------------------- setup
  // opts: { scenario, party: [{key, level, hpFrac, super}], mods: {approach}, enemyLevel,
  //         seed, intro, allOutUses, heroHp (legacy: {kael, eiryn} health fractions) }
  function createMatch(opts) {
    opts = opts || {};
    const rng = makeRng(opts.seed == null ? (Date.now() & 0xffffffff) : opts.seed);
    // A staged scene passes its own cast and arena instead of a scenario.
    const sc = opts.cast ? { arena: opts.arena || 'clearing', units: opts.cast, title: opts.title || '', allOutUses: 0 } : SCENARIOS[opts.scenario || 'clearing'];
    const party = opts.party || [];
    const mod = (sc.mods && opts.mods && sc.mods[opts.mods.approach]) || {};
    const hp = opts.heroHp || {};
    const units = [], count = {};
    for (const spec of sc.units) {
      let key = spec.key, level = spec.team === 'hero' ? 1 : opts.enemyLevel || 1, hpFrac = 1, x = spec.x, y = spec.y, f = spec.f;
      let slot = null;
      if (spec.slot != null) {
        const m = party[spec.slot];
        if (!m) continue;
        key = m.key; level = m.level || 1; hpFrac = m.hpFrac == null ? 1 : m.hpFrac; slot = spec.slot;
        const o = mod['slot' + spec.slot];
        if (o) { x = o.x; y = o.y; if (o.f != null) f = o.f; }
      } else {
        if (DEFS[key].team === 'hero') level = (opts.allyLevel || 1);
        if (hp[key] != null) hpFrac = hp[key];
        if (mod[key]) { x = mod[key].x; y = mod[key].y; }
      }
      count[key] = (count[key] || 0) + 1;
      const id = spec.id || (count[key] > 1 ? key + count[key] : key);
      const u = makeUnit(id, key, x, y, f, hpFrac, level, slot != null ? party[slot].mods : null);
      u.slot = slot;
      if (slot != null && party[slot].super) u.superMeter = Math.min(100, party[slot].super);
      if (spec.morale != null) u.morale = spec.morale;
      units.push(u);
    }
    useArena({ arena: ARENAS[sc.arena] });
    const heroes = units.filter((u) => u.team === 'hero');
    // Enemies scale with the scenario's difficulty and the size of the party:
    // each fighter beyond the first adds health and a little damage.
    const fighters = heroes.filter((u) => !u.guest).length;
    // (Scenario difficulty applies when the player brings a party; the bare
    // Chapter One match keeps its original tuning.)
    const base = Object.assign({ hp: 1, dmg: 1 }, party.length ? sc.scale : null, opts.scale);
    const hpMul = base.hp * (1 + 0.85 * (fighters - 1)), dmgMul = base.dmg * (1 + 0.35 * (fighters - 1));
    for (const u of units) if (u.team !== 'hero') scaleFoe(u, hpMul, dmgMul);
    // The lead is the player's own fighter (slot 0), else the first non-guest hero.
    const lead = units.find((u) => u.slot === 0) || heroes.find((u) => !u.guest) || heroes[0] || units[0];
    const foes = units.filter((u) => u.team !== 'hero');
    const s = {
      t: 0, rng, arena: ARENA, units, projectiles: [], scenario: opts.scenario || 'clearing', title: opts.title || sc.title, chapter: opts.chapter || sc.chapter,
      byId: Object.fromEntries(units.map((u) => [u.id, u])),
      lead, mods: mod,
      tokens: {}, nextGrant: {}, phase: 'intro',
      // All Out: charges during the fight; usable a few times per match.
      allOut: { meter: sc.allOutStart || 0, uses: 0, maxUses: opts.allOutUses == null ? (sc.allOutUses == null ? 2 : sc.allOutUses) : opts.allOutUses, active: 0 },
      cutscene: null, result: null,
      fx: [], log: [],
      stats: { parries: 0, dodges: 0, feintsRead: 0, feintsLanded: 0, hitsTaken: 0, fled: 0, beaten: 0, supers: 0, waves: 0 },
    };
    // Face-off order: guests, then the opposition, then allies, the lead last.
    const allies = heroes.filter((u) => !u.guest && u !== lead);
    s.introOrder = [...heroes.filter((u) => u.guest), ...foes, ...allies, lead].map((u) => u.id);
    const boss = s.byId[sc.vs] || foes.find((u) => u.def.boss) || foes[0] || lead;
    s.vs = [lead.id, boss.id];
    s.foeScale = { hp: hpMul, dmg: dmgMul };
    s.endless = !!sc.endless; s.wave = 1;
    const guest = heroes.find((u) => u.guest);
    for (const u of units) {
      if (u.def.firstTarget) u.target = s.byId[u.def.firstTarget] || guest || lead;
      else if (u.team === 'bandit') u.target = guest || lead;
    }
    for (const u of heroes) if (!u.guest) u.target = boss;
    if (mod.kaelSuper && s.byId.kael) s.byId.kael.superMeter = mod.kaelSuper;
    if (mod.heroSuper) for (const u of heroes) u.superMeter = Math.max(u.superMeter, mod.heroSuper);
    // With opts.intro the match waits for begin() so the face-off can play.
    if (!opts.intro) begin(s);
    return s;
  }

  function scaleFoe(u, hpMul, dmgMul) {
    u.maxHp = Math.round(u.maxHp * hpMul); u.hp = u.maxHp;
    u.power *= dmgMul;
  }

  // Arcade: the next wave walks (or blinks) in from the far side.
  function spawnWave(s) {
    s.wave++;
    s.stats.waves = s.wave - 1;
    const n = Math.min(6, 1 + Math.ceil(s.wave * 0.7));
    const keys = [];
    if (s.wave % 5 === 0) keys.push(WAVE_BOSSES[(s.wave / 5 - 1) % WAVE_BOSSES.length]);
    while (keys.length < n) keys.push(WAVE_POOL[Math.floor(s.rng() * Math.min(WAVE_POOL.length, 3 + s.wave))]);
    const grow = 1 + 0.12 * (s.wave - 1);
    keys.forEach((key, i) => {
      const a = (i / keys.length) * Math.PI - Math.PI / 2;
      const u = makeUnit(key + 'w' + s.wave + '_' + i, key, s.arena.rx * 0.6 + Math.cos(a) * 1.5, Math.sin(a) * s.arena.ry * 0.6, Math.PI, 1, 1);
      scaleFoe(u, s.foeScale.hp * grow, s.foeScale.dmg * (1 + 0.06 * (s.wave - 1)));
      u.target = s.lead;
      s.units.push(u); s.byId[u.id] = u;
      s.fx.push({ type: 'blink', unit: u.id, x0: u.x + 3, y0: u.y, x1: u.x, y1: u.y });
    });
    // Survivors catch their breath between waves.
    for (const u of s.units) if (u.team === 'hero' && alive(u)) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.15); u.sta = u.maxSta; }
    s.allOut.meter = Math.min(1, s.allOut.meter + 0.25);
    say(s, `Wave ${s.wave}.`);
  }

  // ---------------------------------------------------------------- openers
  // When the countdown ends, everyone makes their first move at once.
  function begin(s) {
    if (s.phase === 'fight') return;
    s.phase = 'fight';
    useArena(s);
    if (s.scenario === 'clearing') say(s, 'Four bandits have Eiryn cornered against the fallen trunk.');
    const lead = s.lead, guest = s.units.find((u) => u.guest) || lead;
    for (const u of s.units) {
      const t = u.target || lead;
      const a = angTo(u, t);
      let goal = null, mul = 1, dur = 0.6, dash = false;
      switch (u.def.opener) {
        case 'rush': // straight at the biggest threat
          goal = { x: t.x - Math.cos(a) * 1.4, y: t.y - Math.sin(a) * 1.4 }; mul = 1.8; dur = 0.95; dash = true; break;
        case 'dip': { // slip sideways off the line before engaging
          const side = s.rng() < 0.5 ? 1 : -1, b = angTo(u, lead) + side * 1.9;
          goal = { x: u.x + Math.cos(b) * 2.2, y: u.y + Math.sin(b) * 2.2 }; mul = 1.6; dur = 0.5; dash = true; break;
        }
        case 'advance': // turn from Eiryn to face the newcomer
          goal = { x: u.x + Math.cos(angTo(u, t)) * 0.9, y: u.y + Math.sin(angTo(u, t)) * 0.9 }; mul = 0.8; dur = 0.7; break;
        case 'flank': // head round the trunk toward Eiryn
          goal = { x: guest.x + 1.2, y: guest.y + 0.4 }; mul = 1.2; dur = 0.8; break;
        case 'retreat': { // back off to casting range
          const b = angTo(t, u);
          goal = { x: u.x + Math.cos(b) * 1.6, y: u.y + Math.sin(b) * 1.6 }; mul = 1.2; dur = 0.5; break;
        }
        case 'blink': // appear right in front of the target
          blink(s, u, t, true); break;
        case 'hangback': // edge back toward the path
          goal = u.def.post; mul = 0.6; dur = 1.2; break;
        case 'brace': // back against the trunk
          goal = { x: u.x - 0.3, y: u.y + 0.5 }; mul = 0.6; dur = 0.5; break;
      }
      if (!goal) continue;
      if (u.def.noncombat && s.mods.noDistract) { u.fleeing = true; continue; }
      u.openGoal = goal; u.openMul = mul;
      setState(u, 'opener', dur);
      if (dash) s.fx.push({ type: 'dash', unit: u.id, x: u.x, y: u.y, a: angTo(u, goal) });
    }
    // Charging straight in catches the bandits off guard.
    if (s.mods.surprise) for (const u of s.units) if (u.team === 'bandit' && !u.def.noncombat) setState(u, 'stagger', 0.9);
    // Caught off guard: the party loses its first beat.
    if (s.mods.ambush) for (const u of s.units) if (u.team === 'hero') setState(u, 'stagger', 0.8);
  }

  // ---------------------------------------------------------------- blink
  // Teleport-step: vanish and reappear beside the target.
  function blink(s, u, t, free) {
    if (!u.def.blink || (!free && u.blinkCd > 0) || !alive(t)) return false;
    const side = s.rng() < 0.5 ? 1 : -1;
    const a = angTo(t, u) + side * 0.9;
    const reach = (u.def.attack ? u.def.attack.range : 1.2) + t.r * 0.5;
    const nx = t.x + Math.cos(a) * reach, ny = t.y + Math.sin(a) * reach;
    if ((nx / ARENA.rx) ** 2 + (ny / ARENA.ry) ** 2 > 0.92) return false;
    for (const o of ARENA.obstacles) { const c = obstacleCenter(o, nx, ny); if (Math.hypot(nx - c.x, ny - c.y) < o.r + u.r) return false; }
    s.fx.push({ type: 'blink', unit: u.id, x0: u.x, y0: u.y, x1: nx, y1: ny });
    u.x = nx; u.y = ny; u.vx = 0; u.vy = 0;
    u.facing = angTo(u, t);
    u.blinkCd = u.def.blink.cd * (0.8 + s.rng() * 0.4);
    if (!free) setState(u, 'recover', 0.12);
    return true;
  }

  // ---------------------------------------------------------------- talk
  function bark(s, u, key, delay) {
    const text = u.def.barks && u.def.barks[key];
    if (!text) return;
    // One voice at a time, so lines can be read.
    const at = s.t + (delay || 0);
    if (Math.abs(at - (s.lastBarkAt == null ? -9 : s.lastBarkAt)) < 1.1 && key !== 'super' && key !== 'win') return;
    s.lastBarkAt = at;
    u.bark = text;
    u.barkT = 1.9 + (delay || 0);
    u.barkDelay = delay || 0;
  }
  function say(s, text) { s.log.push({ t: s.t, text }); }
  function icon(u, ch) { u.icon = ch; u.iconT = 0.8; }

  // ---------------------------------------------------------------- queries
  const alive = (u) => u && u.state !== 'out' && !u.fled;
  // Fighting bandits: not running, not beaten, not a bystander.
  const inFight = (u) => alive(u) && !u.fleeing && !u.beaten && !u.def.noncombat;
  const opponents = (s, u) => s.units.filter((o) => o.team !== u.team && alive(o));
  const isDrained = (u) => u.drained > 0;
  const inAllOut = (u) => u.allOut > 0;
  const canDefend = (u) => alive(u) && !isDrained(u) && !inAllOut(u) && u.state !== 'down';

  // ---------------------------------------------------------------- tokens
  // The fight director: only a couple of bandits may swing at the same
  // target at once. Everyone else circles, which keeps exchanges readable.
  function maxTokens(target) { return target.guest ? 1 : 2; }
  function holdsToken(s, u, target) {
    const set = s.tokens[target.id];
    return !!(set && set.has(u.id));
  }
  function requestToken(s, u, target, force) {
    const set = (s.tokens[target.id] = s.tokens[target.id] || new Set());
    if (set.has(u.id)) return true;
    if (!force && (set.size >= maxTokens(target) || s.t < (s.nextGrant[target.id] || 0))) return false;
    set.add(u.id);
    s.nextGrant[target.id] = s.t + 1.2 + s.rng() * 0.9;
    return true;
  }
  function releaseTokens(s, u) {
    for (const k in s.tokens) s.tokens[k].delete(u.id);
  }

  // ---------------------------------------------------------------- state
  function setState(u, state, dur) {
    u.state = state;
    u.st = 0;
    u.dur = dur || 0;
  }

  function startAttack(s, u, target, opts) {
    opts = opts || {};
    const A = opts.A || u.def.attack;
    const fast = inAllOut(u) ? 0.45 : 1;
    let wind = opts.riposte ? 0.14 : A.windup * fast * (0.9 + s.rng() * 0.2);
    if (opts.combo) wind *= 0.7;
    const feint = !opts.riposte && !inAllOut(u) && s.rng() < (u.def.feint || 0);
    u.act = { A, target, phase: 'windup', t: 0, wind, feint, fake: feint };
    setState(u, 'attack');
    if (!inAllOut(u)) u.sta = Math.max(0, u.sta - (A.sta || 0));
    u.facing = angTo(u, target);
    const travel = A.projectile ? dist(u, target) / A.projectile : 0;
    notifyThreat(s, target, u, wind + travel, feint);
  }

  // A defender sees a wind-up, waits out its reaction time, then decides.
  function notifyThreat(s, d, attacker, timeToHit, feint) {
    if (!canDefend(d)) return;
    d.pending = {
      attacker,
      decideAt: s.t + d.def.react * (0.8 + s.rng() * 0.4),
      hitAt: s.t + timeToHit,
      feint,
    };
    d.plan = null;
  }

  function thinkDefense(s, u) {
    const p = u.pending;
    if (p && s.t >= p.decideAt) {
      u.pending = null;
      const a = p.attacker;
      if (!a.act || a.state !== 'attack' || !canDefend(u)) return;
      if (p.feint) {
        if (s.rng() < u.def.read) {
          icon(u, '?');
          s.stats.feintsRead += u.team === 'hero' ? 1 : 0;
          say(s, `${u.name} reads ${a.name}'s feint.`);
          // Punish the fake: step in while the feinter is still posing.
          if (FREE[u.state] && u.def.attack && dist(u, a) <= u.def.attack.range + a.r + 0.2 && u.sta >= (u.def.attack.sta || 0) && !u.def.ranged) {
            startAttack(s, u, a, { riposte: true });
          }
          return;
        }
      }
      const remaining = p.hitAt - s.t;
      if (remaining < 0.05) return;
      icon(u, '!');
      if (u.def.parry > 0 && u.sta >= 10 && s.rng() < u.def.parry) {
        u.plan = { type: 'parry', at: p.hitAt - 0.12, attacker: a };
      } else if (u.sta >= 16 && s.rng() < u.def.dodge) {
        u.plan = { type: 'dodge', at: p.hitAt - 0.15, attacker: a };
      }
    }
    const plan = u.plan;
    if (plan && s.t >= plan.at) {
      u.plan = null;
      if (!FREE[u.state] || !canDefend(u)) return;
      if (plan.type === 'parry') {
        u.sta -= 10;
        u.facing = angTo(u, plan.attacker);
        setState(u, 'parry', 0.55);
      } else {
        u.sta -= 16;
        const away = angTo(plan.attacker, u);
        // Sidestep, choosing the side that keeps us nearer the centre.
        const side = Math.sign(Math.sin(angDiff(away, Math.atan2(-u.y, -u.x)))) || 1;
        const dir = away + side * 1.1;
        u.dodgeDir = dir;
        setState(u, 'dodge', 0.44);
      }
    }
  }

  // ---------------------------------------------------------------- hits
  function resolveStrike(s, u) {
    const A = u.act.A;
    const victims = u.def.cleave
      ? opponents(s, u).filter((v) => v.state !== 'down' && !v.beaten && !v.fleeing)
      : [u.act.target].filter(alive);
    let landed = false;
    for (const v of victims) {
      const d = dist(u, v);
      if (d > A.range + v.r) continue;
      if (Math.abs(angDiff(u.facing, angTo(u, v))) > A.arc / 2) continue;
      landed = applyHit(s, u, v, A) || landed;
      if (u.state !== 'attack') break; // parried: strike ended
    }
    if (!landed && !u.def.ranged && u.state === 'attack') {
      s.fx.push({ type: 'whiff', x: u.x, y: u.y, a: u.facing });
    }
  }

  function applyHit(s, u, v, A, projectile) {
    // A projectile passes a stand-in for its shooter; credit the real one.
    const src = s.byId[u.id] || u;
    // Dodge i-frames
    if (v.state === 'dodge' && v.st < 0.3) {
      if (v.team === 'hero') { s.stats.dodges++; if (v.superMeter != null) gainSuper(v, 10); }
      s.fx.push({ type: 'dodge', x: v.x, y: v.y });
      return false;
    }
    // Parry window
    if (v.state === 'parry' && v.st < 0.34 && Math.abs(angDiff(v.facing, angTo(v, u))) < 1.3) {
      if (v.team === 'hero') { s.stats.parries++; chargeAllOut(s, 0.06); }
      gainSuper(v, 25);
      s.fx.push({ type: 'parry', x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });
      if (projectile) { say(s, `${v.name} bats the stone aside.`); return false; }
      say(s, `${v.name} parries ${u.name}.`);
      releaseTokens(s, u);
      u.act = null;
      setState(u, 'stagger', 0.8);
      if (v.def.riposte) startAttack(s, v, u, { riposte: true });
      return false;
    }
    let dmg = (A.dmg[0] + s.rng() * (A.dmg[1] - A.dmg[0])) * (u.power || 1);
    if (inAllOut(u)) dmg *= ALL_OUT.dmg * (u.aoPower || 1);
    if (u.act && u.act.wasFeint) {
      dmg *= 1.15;
      if (u.team === 'bandit') s.stats.feintsLanded++;
    }
    dmg = Math.round(dmg * (1 - (v.armor || 0)));
    v.hp -= dmg;
    v.flash = 0.12;
    if (src.lifesteal && alive(src)) src.hp = Math.min(src.maxHp, src.hp + dmg * src.lifesteal);
    // Second wind: once a match, a fighter about to fall steadies at a third.
    if (v.secondWind && v.hp <= 0) { v.secondWind = 0; v.hp = Math.round(v.maxHp * 0.3); s.fx.push({ type: 'blink', unit: v.id, x0: v.x, y0: v.y, x1: v.x, y1: v.y }); say(s, `${v.name} refuses to fall.`); }
    if (v.team === 'hero') s.stats.hitsTaken++;
    gainSuper(src, 8);
    gainSuper(v, 5);
    if (u.team === 'hero') chargeAllOut(s, 0.03);
    const a = angTo(u, v);
    const kn = A.knock * (inAllOut(u) ? 1.3 : 1);
    v.kx += Math.cos(a) * kn * 2.6;
    v.ky += Math.sin(a) * kn * 2.6;
    s.fx.push({ type: 'hit', x: v.x, y: v.y, dmg, big: dmg >= 18, from: u.team });
    // Being hit by Kael makes a bandit turn on him ("Make it look at me").
    if (u.team === 'hero' && !u.guest && v.team === 'bandit') {
      v.target = src; v.aggroUntil = s.t + 5;
      if (!s.firstBlood) {
        s.firstBlood = true;
        for (const o of s.units) if (o.def.noncombat) o.morale -= 0.4; // the lookout loses his nerve
      }
    }
    if (v.team === 'bandit' && !v.hurtOnce && v.hp < v.maxHp * 0.4) {
      v.hurtOnce = true;
      v.morale -= 0.15;
    }
    if (v.hp <= 0) {
      v.hp = 0;
      knockOut(s, v);
      return true;
    }
    const wasWinding = v.state === 'attack' && v.act && v.act.phase !== 'strike';
    if (v.act) { releaseTokens(s, v); v.act = null; }
    v.pending = null; v.plan = null;
    if (A.down) {
      setState(v, 'down', 1.15);
      say(s, `${u.name}'s ${A.name.toLowerCase()} floors ${v.name}.`);
    } else if (A.stagger || wasWinding) {
      setState(v, 'stagger', A.stagger || 0.45);
      if (wasWinding) say(s, `${u.name} cuts through ${v.name}'s wind-up.`);
    } else {
      setState(v, 'hurt', 0.24);
    }
    return true;
  }

  function knockOut(s, v) {
    releaseTokens(s, v);
    v.act = null; v.pending = null; v.plan = null;
    s.fx.push({ type: 'ko', x: v.x, y: v.y });
    if (v.team !== 'bandit') {
      setState(v, 'out');
      say(s, `${v.name} is down.`);
      return;
    }
    if (v.def.dissolve) {
      // The Tower's fragments simply come apart.
      v.beaten = true; v.fled = true; s.stats.beaten++;
      s.fx.push({ type: 'dissolve', x: v.x, y: v.y, big: !!v.def.boss });
      say(s, v.def.boss ? 'The Unseen comes apart into light.' : 'A fragment comes apart.');
      return;
    }
    // In the chapter nobody is killed: a beaten bandit goes down, then scrambles off.
    v.beaten = true;
    v.fleeing = true;
    setState(v, 'down', 1.3);
    s.stats.beaten++;
    say(s, `${v.name} has had enough.`);
    if (v.def.barks.flee) {
      bark(s, v, 'flee', 1.0);
      if (v.id === 'grabber' && s.byId.kael) bark(s, s.byId.kael, 'reply', 2.4);
    }
    for (const o of s.units) if (o.team === 'bandit' && alive(o) && o !== v) o.morale -= 0.2;
  }

  function gainSuper(u, n) {
    if (u.def.superMeter && !inAllOut(u)) u.superMeter = Math.min(100, u.superMeter + n * (u.superRate || 1));
  }

  // ---------------------------------------------------------------- super
  // Kael's heavy move plays as a cutscene: the world freezes, the camera
  // closes in, and the effect lands part-way through.
  // Kael's heavy art; other fighters define def.heavy (merged over this).
  const SUPER = { name: 'Rising Cut', dur: 3.4, impactAt: 2.0, radius: 3.6, arc: 3.8, dmg: [26, 32] };
  const heavyOf = (u) => Object.assign({}, SUPER, u.def.heavy || {});

  function trySuper(s, u) {
    // Once per fighter per match: a heavy art is a finisher, not a routine.
    if (!u.def.superMeter || u.superUsed || u.superMeter < 100 || !FREE[u.state] || inAllOut(u) || isDrained(u)) return false;
    const H = heavyOf(u);
    const near = opponents(s, u).filter((o) => inFight(o) && dist(u, o) < (H.line ? H.radius : H.radius - 0.4));
    const t = u.target;
    let wantIt;
    if (H.line) wantIt = near.length >= 1 && t && inFight(t) && hasLOS(u, t);
    else wantIt = near.length >= 2 || (t && alive(t) && dist(u, t) < 2.4 && (t.state === 'stagger' || t.state === 'down')) || (u.hp < u.maxHp * 0.35 && near.length >= 1) || (near.some((o) => o.def.boss) && near.length >= 1);
    if (!wantIt) return false;
    const focus = H.line ? [t] : near.length ? near : [t];
    let cx = 0, cy = 0;
    for (const o of focus) { cx += o.x; cy += o.y; }
    u.facing = Math.atan2(cy / focus.length - u.y, cx / focus.length - u.x);
    u.superMeter = 0;
    u.superUsed = true;
    s.stats.supers++;
    s.cutscene = { unit: u, name: H.name, t: 0, dur: H.dur, impactAt: H.impactAt, applied: false, x0: u.x, y0: u.y, line: !!H.line };
    bark(s, u, 'super');
    say(s, `${u.name} \u2014 ${H.name}!`);
    s.fx.push({ type: 'cutscene', unit: u.id });
    return true;
  }

  function applySuper(s) {
    const c = s.cutscene, u = c.unit, H = heavyOf(u);
    if (!H.line) {
      u.x += Math.cos(u.facing) * 1.6;
      u.y += Math.sin(u.facing) * 1.6;
      collideWorld(u);
    }
    for (const v of opponents(s, u)) {
      if (v.beaten || v.fleeing || dist(u, v) > H.radius) continue;
      if (Math.abs(angDiff(u.facing, angTo(u, v))) > H.arc / 2) continue;
      const dmg = Math.round((H.dmg[0] + s.rng() * (H.dmg[1] - H.dmg[0])) * (u.power || 1) * HEAVY_MUL);
      v.hp -= dmg;
      v.flash = 0.2;
      const a = angTo(u, v);
      v.kx += Math.cos(a) * 7; v.ky += Math.sin(a) * 7;
      if (v.act) { releaseTokens(s, v); v.act = null; }
      v.pending = null; v.plan = null;
      v.morale -= 0.15;
      s.fx.push({ type: 'hit', x: v.x, y: v.y, dmg, big: true, from: u.team });
      if (v.hp <= 0) { v.hp = 0; knockOut(s, v); }
      else setState(v, 'down', 1.4);
    }
    for (const o of s.units) if (o.team !== u.team && alive(o)) o.morale -= 0.1;
    setState(u, 'recover', 0.45);
  }

  // ---------------------------------------------------------------- all out
  // Every hero pours all their stamina and ability power into attacking.
  // Stamina burns fast; when it runs out the fighter is exhausted and can't
  // dodge, block or parry until enough stamina has come back.
  const ALL_OUT = {
    chargeTime: 11,   // seconds of fighting to charge from empty (hits and parries speed it up)
    drain: 30,        // stamina burned per second while all out (~3.3 s from full)
    dmg: 1.6,         // base damage multiplier
    power: 0.7,       // extra multiplier from a full ability meter, spent on trigger
    regen: 16,        // stamina per second while exhausted
    recoverAt: 30,    // stamina needed to defend again
  };

  function allOutReady(s) {
    const A = s.allOut;
    return A.meter >= 1 && A.uses < A.maxUses && !s.result && !s.cutscene && s.phase === 'fight' && !A.active;
  }

  function triggerAllOut(s) {
    if (!allOutReady(s)) return false;
    const A = s.allOut;
    A.uses++;
    A.meter = 0;
    for (const u of s.units) {
      if (u.team !== 'hero' || !alive(u) || u.sta < 5) continue;
      u.allOut = 1;
      u.aoPower = 1 + ALL_OUT.power * (u.superMeter / 100);
      u.superMeter = 0;
      u.pending = null; u.plan = null;
      if (u.state === 'parry' || u.state === 'dodge' || u.state === 'hurt') setState(u, 'idle');
    }
    A.active = s.units.filter((u) => u.allOut > 0).length;
    say(s, 'ALL OUT! The team throws everything they have.');
    s.fx.push({ type: 'allout' });
    return true;
  }

  function chargeAllOut(s, n) {
    const A = s.allOut;
    if (A.uses < A.maxUses && !A.active) A.meter = Math.min(1, A.meter + n);
  }

  function endAllOut(s, u) {
    u.allOut = 0;
    u.sta = 0;
    u.drained = 1; // exhausted until stamina recovers
    icon(u, '\u2026');
    say(s, `${u.name} is spent.`);
  }

  // "Where do you think you're going?" It was a mistake to look away: the
  // broad man charges while Kael is watching the lookout run.
  function distractKael(s) {
    const k = s.lead;
    if (s.mods.noDistract || !alive(k) || !FREE[k.state] || inAllOut(k)) return;
    bark(s, k, 'distracted');
    k.pending = null; k.plan = null;
    setState(k, 'distracted', 0.6);
    const b = s.units.find((o) => o.def.punisher && inFight(o));
    if (b) {
      b.target = k; b.aggroUntil = s.t + 3; b.distractPunish = s.t + 1.5; b.cd = 0;
      say(s, `${k.name} looks away. ${b.name === 'Broad Bandit' ? 'The broad man' : b.name} charges.`);
    }
  }

  // ---------------------------------------------------------------- brains
  function chooseTargetKael(s, u) {
    // A running bandit is let go.
    const foes = opponents(s, u).filter(inFight);
    if (!foes.length) return null;
    // Protectors cut off anyone going for a guest ("Make it look at me").
    const guests = u.def.protector ? s.units.filter((h) => h.team === u.team && h.guest && alive(h)) : [];
    if (guests.length && !inAllOut(u)) {
      let threat = null, best = 3.4, ward = null;
      for (const g of guests) for (const f of foes) {
        if (f.target !== g) continue;
        const d = dist(f, g);
        if (d < best) { best = d; threat = f; ward = g; }
      }
      // Only the protector nearest the guest answers it.
      const nearer = threat && s.units.some((h) => h !== u && h.team === u.team && !h.guest && h.def.protector && alive(h) && dist(h, ward) < dist(u, ward) - 0.5);
      if (threat && !nearer) {
        if (u.target !== threat) {
          if (threat.def.flanker && dist(threat, ward) < 2) bark(s, u, 'protect');
          if (ward.def.barks.warn && dist(threat, ward) > 1.2 && s.rng() < 0.5) bark(s, ward, 'warn');
          say(s, `${u.name} moves to cut off ${threat.name}.`);
        }
        return threat;
      }
    }
    if (inFight(u.target) && dist(u, u.target) < 5) return u.target;
    let best = null, score = Infinity;
    for (const f of foes) {
      let sc = dist(u, f) + f.hp * 0.025;
      if (f.state === 'stagger' || f.state === 'down') sc -= 1.5;
      if (f.def.ranged) sc += 3; // chasing the slinger is a last resort
      if (sc < score) { score = sc; best = f; }
    }
    return best;
  }

  function brainKael(s, u, dt) {
    if (trySuper(s, u)) return;
    const t = (u.target = chooseTargetKael(s, u));
    if (!t) return idle(u, dt);
    const A = u.def.attack;
    const d = dist(u, t);
    const reach = A.range + t.r - 0.15;
    // Blinkers close the gap in a single step.
    if (d > 3.5 && d < u.def.blink?.range && blink(s, u, t)) return;
    // Anticipate: if the foe is still winding up and our blade is faster, cut in.
    if (t.state === 'attack' && t.act && t.act.phase === 'windup' && !t.def.ranged) {
      const left = t.act.wind - t.act.t;
      const mine = A.windup * (inAllOut(u) ? 0.45 : 1) + 0.06;
      if (left > mine && d <= reach + 0.5 && (u.sta >= A.sta || inAllOut(u)) && s.rng() < 0.08) {
        icon(u, '!');
        return startAttack(s, u, t);
      }
    }
    if (d > reach) return moveTo(s, u, t.x, t.y, inAllOut(u) ? 1.35 : 1.05, t);
    // Something is coming at us: hold guard and let the defence play out.
    if (!inAllOut(u) && (u.pending || u.plan)) return circle(s, u, t, Math.max(1.2, d), 0.3, dt);
    if (inAllOut(u)) { u.combo++; return startAttack(s, u, t, { combo: u.combo > 1 }); }
    if (u.cd <= 0 && u.sta >= A.sta + 6 && t.state !== 'dodge') {
      return startAttack(s, u, t, { combo: u.combo > 0 });
    }
    // Hold guard: shuffle sideways, facing the opponent.
    circle(s, u, t, Math.max(1.2, d), 0.35, dt);
  }

  function brainEiryn(s, u, dt) {
    const foes = opponents(s, u).filter(inFight);
    if (!foes.length) return idle(u, dt);
    let near = null, nd = Infinity;
    for (const f of foes) { const d = dist(u, f); if (d < nd) { nd = d; near = f; } }
    const A = u.def.attack;
    const close = nd < A.range + near.r + 0.3;
    // Chapter One: she tries to cast, her fingers shake, no glyph appears.
    if (close && !inAllOut(u) && (u.cd <= 0 || u.fizzles === 0) && u.fizzles < 3 && (u.fizzles === 0 || s.rng() < 0.12)) {
      u.fizzles++;
      u.facing = angTo(u, near);
      u.cd = 0.9;
      setState(u, 'cast', 0.75);
      s.fx.push({ type: 'fizzle', unit: u.id, x: u.x, y: u.y });
      say(s, u.fizzles === 1 ? 'Eiryn tries to cast. A violet line curls into half a circle and winks out.' : 'Eiryn tries again. Her fingers shake. No glyph appears.');
      return;
    }
    if (close && !u.armed && (u.fizzles > 0 || inAllOut(u))) {
      u.armed = true;
      u.facing = angTo(u, near);
      setState(u, 'pickup', 0.4);
      say(s, 'Eiryn snatches a broken branch from the ground.');
      return;
    }
    if (u.armed && nd < A.range + near.r - 0.1 && (u.sta >= A.sta || inAllOut(u)) && (u.cd <= 0 || inAllOut(u))) {
      u.cd = 1.4 + s.rng();
      return startAttack(s, u, near);
    }
    if (inAllOut(u)) return moveTo(s, u, near.x, near.y, 1.2, near);
    // Stay behind the nearest of the party's fighters.
    let kael = null, kd = Infinity;
    for (const h of s.units) if (h.team === u.team && !h.guest && alive(h) && dist(h, u) < kd) { kd = dist(h, u); kael = h; }
    let gx, gy;
    if (kael) {
      const a = angTo(near, kael);
      gx = kael.x + Math.cos(a) * 1.8;
      gy = kael.y + Math.sin(a) * 1.8;
    } else {
      const a = angTo(near, u);
      gx = u.x + Math.cos(a) * 3;
      gy = u.y + Math.sin(a) * 3;
    }
    if (Math.hypot(gx - u.x, gy - u.y) < 0.6 && nd > 3) { u.facing = angTo(u, near); return idle(u, dt); }
    moveTo(s, u, gx, gy, 0.95, near);
  }

  // Casters keep their distance, shoot force bolts, and shove anyone who
  // gets on top of them.
  function brainCaster(s, u, dt) {
    if (trySuper(s, u)) return;
    const foes = opponents(s, u).filter(inFight);
    if (!foes.length) return idle(u, dt);
    let near = null, nd = Infinity;
    for (const f of foes) { const d = dist(u, f); if (d < nd) { nd = d; near = f; } }
    const M = u.def.melee, A = u.def.attack;
    if (M && nd < M.range + near.r && (u.sta >= M.sta || inAllOut(u)) && (u.cd <= 0 || inAllOut(u))) {
      u.cd = inAllOut(u) ? 0 : 0.9;
      return startAttack(s, u, near, { A: M });
    }
    // Pick a target: whoever is pressing an ally hardest, else the weakest in sight.
    let t = inFight(u.target) && hasLOS(u, u.target) && s.t < (u.keepUntil || 0) ? u.target : null;
    if (!t) {
      let best = Infinity;
      for (const f of foes) {
        if (!hasLOS(u, f)) continue;
        let sc = f.hp / f.maxHp * 4 + dist(u, f) * 0.3;
        if (f.target && f.target.team === u.team && f.target !== u) sc -= 1.5;
        if (f.def.boss) sc -= 1;
        if (sc < best) { best = sc; t = f; }
      }
      u.keepUntil = s.t + 2.5;
    }
    t = u.target = t || near;
    const want = u.def.keepAway;
    if (nd < want - 1.4 && !inAllOut(u)) {
      const a = angTo(near, u);
      return moveTo(s, u, u.x + Math.cos(a) * 2.2, u.y + Math.sin(a) * 2.2, 1.0, near);
    }
    const d = dist(u, t);
    if ((u.cd <= 0 || inAllOut(u)) && (u.sta >= A.sta || inAllOut(u)) && d < A.range && hasLOS(u, t)) {
      u.cd = inAllOut(u) ? 0.15 : 1.0 + s.rng() * 0.6;
      return startAttack(s, u, t);
    }
    if (d > A.range * 0.9 || !hasLOS(u, t)) return moveTo(s, u, t.x, t.y, 0.9, t);
    circle(s, u, t, Math.min(d, want), 0.45, dt);
  }

  function chooseTargetBandit(s, u) {
    const heroes = s.units.filter((h) => h.team === 'hero' && alive(h));
    const lead = alive(s.lead) ? s.lead : heroes.find((h) => !h.guest) || heroes[0];
    const guest = heroes.find((h) => h.guest);
    // Punishers go for anyone drained: All Out has a price.
    if (u.def.punisher) {
      for (const h of heroes) {
        if (alive(h) && isDrained(h) && dist(u, h) < 7) {
          if (u.target !== h) { bark(s, u, 'punish'); say(s, `${u.name} sees ${h.name} gasping for breath.`); }
          return h;
        }
      }
    }
    if (alive(u.target) && s.t < u.aggroUntil) return u.target;
    if (u.def.flanker && guest && lead && !heroes.some((h) => !h.guest && dist(h, guest) < 2.4)) return guest;
    if (u.distractPunish && s.t < u.distractPunish && lead) return lead;
    if (alive(u.target) && u.target === guest && s.t < 6) return guest;
    // Otherwise the nearest of the party's fighters, keeping to the current one.
    let best = null, bd = Infinity;
    for (const h of heroes) {
      if (h.guest && heroes.some((o) => !o.guest)) continue;
      const d = dist(u, h) - (h === u.target ? 1.5 : 0) - (h.def.taunt ? 1.2 : 0);
      if (d < bd) { bd = d; best = h; }
    }
    return best || null;
  }

  function brainBandit(s, u, dt) {
    const fighting = s.units.filter((o) => o.team === 'bandit' && inFight(o)).length;
    if (!u.fleeing && !u.def.noFlee && (u.morale < 0.2 || (u.def.noncombat && fighting <= 1))) {
      u.fleeing = true;
      releaseTokens(s, u);
      bark(s, u, 'flee');
      say(s, u.def.noncombat ? `${u.name} edges toward the path, then runs.` : `${u.name} breaks and runs for the road.`);
      if (u.def.noncombat) distractKael(s);
    }
    if (u.fleeing) return moveTo(s, u, ARENA.exit.x, ARENA.exit.y, u.beaten ? 1.0 : 1.15, null, true);
    if (u.def.noncombat) {
      // Hangs back by the path and watches.
      const kael = s.lead;
      if (Math.hypot(u.x - u.def.post.x, u.y - u.def.post.y) > 0.6) return moveTo(s, u, u.def.post.x, u.def.post.y, 0.5, kael);
      if (alive(kael)) u.facing = angTo(u, kael);
      return idle(u, dt);
    }
    const t = chooseTargetBandit(s, u);
    if (t !== u.target) releaseTokens(s, u);
    u.target = t;
    if (!t) return idle(u, dt);
    const A = u.def.attack;
    const d = dist(u, t);

    // Blinkers step in from anywhere, and sometimes away again after striking.
    if (d > 3 && blink(s, u, t)) return;
    if (u.def.ranged) {
      const want = u.def.keepAway;
      // It backs off for a few seconds at most, then stands and shoots,
      // so a slow fighter can always run it down.
      if (d < want - 1.2 && (u.kiteT || 0) < 2.5) {
        u.kiteT = (u.kiteT || 0) + dt;
        const a = angTo(t, u);
        return moveTo(s, u, u.x + Math.cos(a) * 2, u.y + Math.sin(a) * 2, 0.9, t);
      }
      u.kiteT = Math.max(0, (u.kiteT || 0) - dt * 0.5);
      if (u.cd <= 0 && d < A.range && hasLOS(u, t)) {
        u.cd = 2.4 + s.rng() * 1.4;
        return startAttack(s, u, t);
      }
      return circle(s, u, t, want, 0.6, dt);
    }

    const punishing = (u.def.punisher && isDrained(t)) || (u.distractPunish && s.t < u.distractPunish && t === s.lead) || u.def.boss;
    const token = holdsToken(s, u, t) || (u.cd <= 0 && requestToken(s, u, t, punishing));
    const reach = A.range + t.r - 0.1;
    if (token) {
      if (d > reach) return moveTo(s, u, t.x, t.y, punishing ? 1.25 : 1, t);
      if (u.cd <= 0) {
        if (s.rng() < 0.25) bark(s, u, 'feint');
        return startAttack(s, u, t);
      }
    }
    const ring = 2.7 + (u.id.length % 3) * 0.35;
    circle(s, u, t, ring, 0.55, dt);
  }

  // ---------------------------------------------------------------- motion
  function idle(u) {
    if (u.state !== 'idle') setState(u, 'idle');
    u.vx *= 0.8; u.vy *= 0.8;
  }

  // ------------------------------------------------------------ pathing
  // A small visibility graph round every obstacle. Units walk straight when
  // they can and otherwise follow the shortest route of corner points.
  function segPointDist(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }
  function segSegDist(a, b, c, d) {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
    if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
    return Math.min(
      segPointDist(a.x, a.y, b.x, b.y, c.x, c.y), segPointDist(a.x, a.y, b.x, b.y, d.x, d.y),
      segPointDist(c.x, c.y, d.x, d.y, a.x, a.y), segPointDist(c.x, c.y, d.x, d.y, b.x, b.y));
  }
  function clearPath(a, b, rad) {
    for (const o of ARENA.obstacles) {
      const lim = o.r + rad;
      if (o.kind === 'trunk') {
        if (segSegDist(a, b, { x: o.ax, y: o.ay }, { x: o.bx, y: o.by }) < lim) return false;
      } else if (segPointDist(a.x, a.y, b.x, b.y, o.x, o.y) < lim) return false;
    }
    return true;
  }
  const NAV_PAD = 0.75;
  function buildNav() {
    const nodes = [];
    for (const o of ARENA.obstacles) {
      const R = o.r + NAV_PAD;
      if (o.kind === 'trunk') {
        const ax = o.bx - o.ax, ay = o.by - o.ay, al = Math.hypot(ax, ay);
        const ux = ax / al, uy = ay / al, nx = -uy, ny = ux;
        for (const [px, py, k] of [[o.ax, o.ay, -1], [o.bx, o.by, 1]]) {
          nodes.push({ x: px + ux * R * k, y: py + uy * R * k });
          nodes.push({ x: px + (ux * k + nx) * R * 0.75, y: py + (uy * k + ny) * R * 0.75 });
          nodes.push({ x: px + (ux * k - nx) * R * 0.75, y: py + (uy * k - ny) * R * 0.75 });
        }
      } else {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          nodes.push({ x: o.x + Math.cos(a) * R, y: o.y + Math.sin(a) * R });
        }
      }
    }
    const ok = nodes.filter((n) => (n.x / ARENA.rx) ** 2 + (n.y / ARENA.ry) ** 2 < 0.97 &&
      ARENA.obstacles.every((o) => { const c = obstacleCenter(o, n.x, n.y); return Math.hypot(n.x - c.x, n.y - c.y) > o.r + 0.5; }));
    const edges = ok.map(() => []);
    for (let i = 0; i < ok.length; i++) {
      for (let j = i + 1; j < ok.length; j++) {
        if (clearPath(ok[i], ok[j], 0.5)) {
          const w = dist(ok[i], ok[j]);
          edges[i].push([j, w]); edges[j].push([i, w]);
        }
      }
    }
    return { nodes: ok, edges };
  }

  // Point the module at a match's arena (and its cached path graph).
  function useArena(s) {
    ARENA = s.arena;
    NAV = ARENA.nav || (ARENA.nav = buildNav());
  }

  function findWaypoint(u, gx, gy) {
    const goal = { x: gx, y: gy };
    if (clearPath(u, goal, u.r - 0.04)) return goal;
    const N = NAV.nodes, n = N.length;
    const best = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    const toGoal = N.map((p) => clearPath(p, goal, 0.45));
    for (let i = 0; i < n; i++) if (clearPath(u, N[i], u.r - 0.04)) best[i] = dist(u, N[i]);
    let bestEnd = -1, bestCost = Infinity;
    for (;;) {
      let i = -1, c = Infinity;
      for (let k = 0; k < n; k++) if (!done[k] && best[k] < c) { c = best[k]; i = k; }
      if (i < 0 || c >= bestCost) break;
      done[i] = true;
      if (toGoal[i]) { const tc = c + dist(N[i], goal); if (tc < bestCost) { bestCost = tc; bestEnd = i; } }
      for (const [j, w] of NAV.edges[i]) if (c + w < best[j]) { best[j] = c + w; prev[j] = i; }
    }
    if (bestEnd < 0) return goal; // no route found: walk straight and slide
    let i = bestEnd;
    while (prev[i] >= 0) i = prev[i];
    return N[i];
  }

  function detour(u, gx, gy, now) {
    const p = u.path;
    if (p && now - p.t < 0.25 && Math.hypot(p.gx - gx, p.gy - gy) < 0.6 && Math.hypot(p.wp.x - u.x, p.wp.y - u.y) > 0.3) return p.wp;
    const wp = findWaypoint(u, gx, gy);
    u.path = { t: now, gx, gy, wp };
    return wp;
  }

  function moveTo(s, u, gx, gy, mul, faceT, noBounds) {
    if (u.state !== 'move') setState(u, 'move');
    steer(s, u, gx, gy, mul, faceT, noBounds);
  }

  function steer(s, u, gx, gy, mul, faceT, noBounds) {
    let speed = u.def.speed * (mul || 1);
    if (isDrained(u)) speed *= 0.65;
    const wp = detour(u, gx, gy, s.t);
    let dx = wp.x - u.x, dy = wp.y - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) { u.vx = 0; u.vy = 0; return; }
    dx /= d; dy /= d;
    // Keep a little personal space.
    for (const o of s.units) {
      if (o === u || !alive(o) || o.state === 'down') continue;
      const ox = u.x - o.x, oy = u.y - o.y, od = Math.hypot(ox, oy);
      if (od < 1.0 && od > 1e-4 && o !== faceT) { dx += (ox / od) * (1 - od) * 0.8; dy += (oy / od) * (1 - od) * 0.8; }
    }
    const n = Math.hypot(dx, dy) || 1;
    u.vx += ((dx / n) * speed - u.vx) * 0.25;
    u.vy += ((dy / n) * speed - u.vy) * 0.25;
    u.noBounds = !!noBounds;
    const face = faceT ? angTo(u, faceT) : Math.atan2(u.vy, u.vx);
    turnToward(u, faceT && dist(u, faceT) < 4 ? face : Math.atan2(u.vy, u.vx), 0.016 * 10);
  }

  function circle(s, u, t, radius, mul, dt) {
    if (u.state !== 'circle') setState(u, 'circle');
    u.strafeT -= dt;
    if (u.strafeT <= 0) { u.strafe = s.rng() < 0.5 ? -1 : 1; u.strafeT = 1.4 + s.rng() * 1.8; }
    const a = angTo(t, u) + (u.strafe * u.def.speed * mul * dt) / Math.max(radius, 0.5) * 1.6;
    const gx = t.x + Math.cos(a) * radius, gy = t.y + Math.sin(a) * radius;
    let dx = gx - u.x, dy = gy - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = Math.min(u.def.speed * mul * (isDrained(u) ? 0.65 : 1), d * 4);
    u.vx += ((dx / d) * sp - u.vx) * 0.2;
    u.vy += ((dy / d) * sp - u.vy) * 0.2;
    turnToward(u, angTo(u, t), 0.18);
  }

  function turnToward(u, a, rate) {
    const d = angDiff(u.facing, a);
    u.facing += clamp(d, -rate, rate);
  }

  function collideWorld(u) {
    for (const o of ARENA.obstacles) {
      const c = obstacleCenter(o, u.x, u.y);
      const dx = u.x - c.x, dy = u.y - c.y;
      const d = Math.hypot(dx, dy);
      const min = o.r + u.r;
      if (d < min) {
        const nx = d > 1e-5 ? dx / d : 1, ny = d > 1e-5 ? dy / d : 0;
        u.x = c.x + nx * min;
        u.y = c.y + ny * min;
      }
    }
    if (!u.fleeing) {
      const e = (u.x / ARENA.rx) ** 2 + (u.y / ARENA.ry) ** 2;
      if (e > 1) { const k = 1 / Math.sqrt(e); u.x *= k; u.y *= k; }
    }
  }

  function separate(s) {
    const live = s.units.filter((u) => alive(u) && u.state !== 'down');
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d < min && d > 1e-5) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  }

  // ---------------------------------------------------------------- tick
  function stepUnit(s, u, dt) {
    u.st += dt;
    if (u.cd > 0) u.cd -= dt;
    if (u.blinkCd > 0) u.blinkCd -= dt;
    if (u.iconT > 0) u.iconT -= dt;
    if (u.barkDelay > 0) u.barkDelay -= dt; else if (u.barkT > 0) u.barkT -= dt;
    if (u.flash > 0) u.flash -= dt;
    if (u.state === 'out') { u.vx = u.vy = 0; decayKnock(u, dt); return; }
    if (u.fled) return;

    if (u.allOut > 0) { u.sta -= ALL_OUT.drain * dt; if (u.sta <= 0) endAllOut(s, u); }

    // Stamina recovers while not committing to anything.
    if (!isDrained(u) && !inAllOut(u) && u.state !== 'attack') u.sta = Math.min(u.maxSta, u.sta + 16 * dt);
    if (isDrained(u)) {
      u.sta = Math.min(u.maxSta, u.sta + ALL_OUT.regen * dt);
      if (u.sta >= ALL_OUT.recoverAt) u.drained = 0;
    }

    if (u.state !== 'down' && u.state !== 'stagger' && u.state !== 'hurt') thinkDefense(s, u);

    switch (u.state) {
      case 'attack': stepAttack(s, u, dt); break;
      case 'opener':
        steer(s, u, u.openGoal.x, u.openGoal.y, u.openMul, u.target);
        if (u.st >= u.dur) setState(u, 'idle');
        break;
      case 'parry':
      case 'recover':
      case 'hurt':
      case 'stagger':
      case 'down':
      case 'distracted':
      case 'cast':
      case 'pickup':
        u.vx *= 0.82; u.vy *= 0.82;
        if (u.st >= u.dur) { setState(u, 'idle'); if (u.team === 'hero') u.combo = 0; }
        break;
      case 'dodge': {
        const sp = u.st < 0.3 ? 5.8 : 1.5;
        u.vx = Math.cos(u.dodgeDir) * sp; u.vy = Math.sin(u.dodgeDir) * sp;
        if (u.st >= u.dur) setState(u, 'idle');
        break;
      }
      default:
        if (u.team === 'hero') (u.def.brain === 'caster' ? brainCaster : u.guest ? brainEiryn : brainKael)(s, u, dt);
        else brainBandit(s, u, dt);
    }

    u.x += u.vx * dt;
    u.y += u.vy * dt;
    decayKnock(u, dt);
    u.walk += Math.hypot(u.vx, u.vy) * dt * 2.4;
    collideWorld(u);
    if (u.fleeing && Math.hypot(u.x - ARENA.exit.x, u.y - ARENA.exit.y) < 1.2) {
      u.fled = true;
      s.stats.fled++;
      releaseTokens(s, u);
      for (const o of s.units) if (o.team === u.team && alive(o)) o.morale -= 0.1;
    }
  }

  function decayKnock(u, dt) {
    u.x += u.kx * dt; u.y += u.ky * dt;
    const k = Math.pow(0.004, dt);
    u.kx *= k; u.ky *= k;
  }

  function stepAttack(s, u, dt) {
    const a = u.act;
    if (!a) { setState(u, 'idle'); return; }
    a.t += dt;
    u.vx *= 0.7; u.vy *= 0.7;
    const t = a.target;
    if (a.phase === 'windup') {
      if (alive(t)) turnToward(u, angTo(u, t), 0.05);
      if (a.t >= a.wind) {
        if (a.fake) {
          // The fake ends; hold for a beat, then the real strike comes fast.
          a.fake = false;
          a.wasFeint = true;
          a.phase = 'feint';
          a.t = 0;
          icon(u, '✦');
        } else {
          a.phase = 'strike'; a.t = 0;
          if (!a.A.projectile) {
            u.x += Math.cos(u.facing) * a.A.lunge;
            u.y += Math.sin(u.facing) * a.A.lunge;
            collideWorld(u);
            resolveStrike(s, u);
          } else {
            const sp = a.A.projectile;
            const ang = u.facing;
            s.projectiles.push({ x: u.x + Math.cos(ang) * 0.5, y: u.y + Math.sin(ang) * 0.5, z: 1.3, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, from: u, A: a.A, life: 1.2 });
          }
        }
      }
    } else if (a.phase === 'feint') {
      if (a.t >= 0.12) {
        a.phase = 'windup'; a.t = 0; a.wind = 0.2;
        if (alive(t)) {
          u.facing = angTo(u, t);
          // A defender who already read the feint reacts faster to the real one.
          const readIt = t.iconT > 0 && t.icon === '?';
          if (readIt && canDefend(t)) {
            t.pending = { attacker: u, decideAt: s.t + t.def.react * 0.4, hitAt: s.t + 0.2, feint: false };
          } else notifyThreat(s, t, u, 0.2, false);
        }
      }
    } else if (a.phase === 'strike') {
      if (a.t >= a.A.active) { a.phase = 'recover'; a.t = 0; }
    } else if (a.phase === 'recover') {
      const rec = a.A.recover * (inAllOut(u) ? 0.4 : 1);
      if (a.t >= rec) {
        releaseTokens(s, u);
        u.act = null;
        setState(u, 'idle');
        if (u.team === 'hero' && !u.guest && u.def.brain !== 'caster') {
          const cmax = u.def.combo || 2;
          u.combo = Math.min(u.combo + 1, cmax);
          u.cd = u.combo >= cmax ? 1.5 + s.rng() * 0.9 : 0.2 + s.rng() * 0.2;
          if (u.combo >= cmax) u.combo = 0;
        } else if (u.team === 'bandit' && !u.def.ranged) {
          u.cd = 1.6 + s.rng() * 1.0;
        }
      }
    }
  }

  function stepProjectiles(s, dt) {
    for (const p of s.projectiles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      for (const o of ARENA.obstacles) {
        const c = obstacleCenter(o, p.x, p.y);
        if (Math.hypot(p.x - c.x, p.y - c.y) < o.r) { p.life = 0; s.fx.push({ type: 'thunk', x: p.x, y: p.y }); break; }
      }
      if (p.life <= 0) continue;
      for (const v of s.units) {
        if (v.team === p.from.team || !alive(v) || v.state === 'down') continue;
        if (Math.hypot(v.x - p.x, v.y - p.y) < v.r + 0.15) {
          p.life = 0;
          const fake = { act: null, team: p.from.team, x: p.x - p.vx * 0.05, y: p.y - p.vy * 0.05, name: p.from.name, id: p.from.id, def: p.from.def };
          applyHit(s, fake, v, p.A, true);
          break;
        }
      }
    }
    s.projectiles = s.projectiles.filter((p) => p.life > 0);
  }

  function step(s, dt) {
    if (s.result || s.phase !== 'fight') return;
    useArena(s);
    if (s.cutscene) {
      const c = s.cutscene;
      c.t += dt;
      if (!c.applied && c.t >= c.impactAt) { c.applied = true; applySuper(s); }
      // After the impact, let the victims fly while the camera holds.
      if (c.applied) for (const u of s.units) if (u.state !== 'out' || u.kx || u.ky) { decayKnock(u, dt); if (alive(u)) collideWorld(u); }
      if (c.t >= c.dur) s.cutscene = null;
      return;
    }
    s.t += dt;
    chargeAllOut(s, dt / ALL_OUT.chargeTime);
    s.allOut.active = s.units.filter((u) => u.allOut > 0).length;
    for (const u of s.units) stepUnit(s, u, dt);
    separate(s);
    for (const u of s.units) if (alive(u)) collideWorld(u);
    stepProjectiles(s, dt);
    checkEnd(s);
  }

  function checkEnd(s) {
    const kael = s.lead;
    const heroesUp = s.units.some((u) => u.team === 'hero' && !u.guest && alive(u));
    if (!heroesUp) {
      s.result = { outcome: 'loss', time: s.t, waves: s.endless ? s.wave - 1 : undefined };
      say(s, s.endless ? `Fallen on wave ${s.wave}.` : `${kael.name} falls. The match is lost.`);
      return;
    }
    const banditsLeft = s.units.some((u) => u.team === 'bandit' && inFight(u));
    if (!banditsLeft && s.endless) { spawnWave(s); return; }
    if (!banditsLeft) {
      for (const u of s.units) if (u.team === 'bandit' && alive(u)) u.fleeing = true;
      s.result = { outcome: 'win', time: s.t };
      bark(s, kael, 'win');
      say(s, 'The last of them retreat into the trees. Victory.');
    }
  }

  function surrender(s) {
    if (s.result) return;
    s.result = { outcome: 'surrender', time: s.t };
    say(s, `${s.lead.name} pulls back. Match abandoned.`);
  }

  return {
    createMatch, begin, step, triggerAllOut, allOutReady, surrender, makeRng, SCENARIOS, heavyOf,
    get ARENA() { return ARENA; }, ARENAS, DEFS, INTRO_ORDER, SUPER, ALL_OUT, get NAV() { return NAV; }, obstacleCenter, hasLOS, alive, inFight,
  };
});
