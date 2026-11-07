// VESPER — the cast, the foes, the stages, the boons. Pure data; runs in Node.
(function (root) {
  const VS = root.VS = root.VS || {};
  const D = VS.DATA = {};

  // Creator clip timing (15 frames per clip; STRIKE is the contact frame).
  D.FRAMES = 15;
  D.FPS = { Idle: 8, Idle2: 8, Idle3: 8, Idle4: 8, Walk: 12, Run: 16, StrafeLeft: 12, StrafeRight: 12, RunBackwards: 14,
    Rolling: 30, TakeDamage: 22, Slide: 12, Die: 14, Taunt: 10, CrouchIdle: 8, Kick: 14, Special1: 12,
    Attack1: 16, Attack2: 16, Attack3: 16, Attack4: 14, Attack5: 16, Attack6: 16 };
  D.LOOP = { Idle: 1, Idle2: 1, Idle3: 1, Idle4: 1, Walk: 1, Run: 1, StrafeLeft: 1, StrafeRight: 1, RunBackwards: 1, Taunt: 1, CrouchIdle: 1 };
  D.STRIKE = { Attack1: 6, Attack2: 7, Attack3: 7, Attack4: 9, Attack5: 3, Attack6: 6, Kick: 7, Special1: 10 };

  // The arena: a floor band seen from the side. x across, y is depth (0 = back wall, DEPTH = front).
  // Arenas seen from a high camera: x across, y toward the camera, centre at 0,0. Each area of an hour
  // is one of these. spawn: how foes arrive there (rise from rifts, drop from the sky, run in from the sides).
  D.ARENA = { r: 185 };
  D.ARENAS = {
    ring: { name: 'THE RING', shape: 'circle', r: 185, spawn: ['rift', 'drop'] },
    court: { name: 'THE COURTYARD', shape: 'rect', hw: 200, hh: 140, spawn: ['side', 'drop'] },
    bridge: { name: 'THE BRIDGE', shape: 'rect', hw: 290, hh: 62, spawn: ['side', 'drop'] },
    pit: { name: 'THE PIT', shape: 'donut', r: 200, inner: 62, spawn: ['drop', 'rift'] },
    cross: { name: 'THE CROSSROADS', shape: 'cross', arm: 225, hw: 68, spawn: ['side', 'rift'] },
  };

  // ---- The hero -------------------------------------------------------------------------
  D.HERO = {
    id: 'vesper', name: 'Vesper', set: 'gothic_knight_b', color: '#ff3048',
    hp: 120, spd: 118,
    // The cut combo: slash, slash, kick, cut (and a fifth with the Fourth Cut boon). fx: the pack effect on contact.
    combo: [
      { clip: 'Attack1', wind: 0.1, recover: 0.18, reach: 30, dmg: 6, poise: 6, kb: 4, step: 7, fx: 'slash' },
      { clip: 'Attack2', wind: 0.1, recover: 0.2, reach: 30, dmg: 6, poise: 6, kb: 4, step: 7, fx: 'slash' },
      { clip: 'Kick', wind: 0.12, recover: 0.22, reach: 26, dmg: 7, poise: 10, kb: 16, step: 6, fx: 'kick' },
      { clip: 'Attack3', wind: 0.16, recover: 0.3, reach: 34, dmg: 11, poise: 13, kb: 18, step: 10, fx: 'finisher', finisher: true },
      { clip: 'Attack6', wind: 0.15, recover: 0.34, reach: 38, dmg: 15, poise: 16, kb: 24, step: 12, fx: 'finisher', finisher: true }],
    // The heavy: a spinning cut all around him (right mouse button, or K).
    heavy: { clip: 'Special1', wind: 0.28, recover: 0.4, aoe: 36, at: 0, dmg: 14, poise: 22, kb: 26, fx: 'spin' },
    // The dash-cut: cut during or just after a dash.
    dashCut: { clip: 'Attack4', wind: 0.1, recover: 0.3, reach: 30, dmg: 11, poise: 16, kb: 20, lunge: 56, fx: 'dash' },
    dodge: { dur: 0.34, dist: 96, iframes: [0.02, 0.3], perfect: 0.16, cd: 0.12 },
    parry: { win: 0.2, dur: 0.42 },
    lastDitch: 0.3, // the Last Ditch Effort opens at or below this share of health
  };

  // The ally who lends her flower to the Last Ditch Effort (she does not fight).
  D.LYS = { id: 'lys', name: 'Lys', set: 'lyra', color: '#ff7aa0' };

  // ---- Foes ------------------------------------------------------------------------------
  // An attack: clip, wind (seconds to contact), recover, reach (px in front), dmg, kb.
  //  lunge: px travelled through the contact; aoe: radius around a point `at` px in front;
  //  bolt: fires a projectile; unparry: cannot be parried (red glint), only dodged;
  //  next: chains into another attack of the same foe; range: [min, max] distance it is chosen at;
  //  phase: only from phase 2.
  D.FOES = {
    ghoul: { name: 'Ghoul', set: 'thug_a', hp: 34, spd: 52, poise: 0, minion: true, color: '#b9a2d8',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.45, reach: 26, dmg: 7, kb: 8 }] },
    ghast: { name: 'Ghast', set: 'thug_b', hp: 48, spd: 58, poise: 0, minion: true, color: '#c7b0e8',
      atks: [{ clip: 'Attack2', wind: 0.5, recover: 0.5, reach: 28, dmg: 8, kb: 10 },
        { clip: 'Attack4', wind: 0.62, recover: 0.6, reach: 26, dmg: 10, kb: 18, lunge: 64, range: [46, 100], unparry: true }] },
    knife: { name: 'Night Knife', set: 'frost_assassin', hp: 40, spd: 84, poise: 0, minion: true, color: '#9fc4e8',
      atks: [{ clip: 'Attack1', wind: 0.32, recover: 0.4, reach: 24, dmg: 6, kb: 6 },
        { clip: 'Attack4', wind: 0.5, recover: 0.5, reach: 24, dmg: 9, kb: 12, lunge: 80, range: [50, 120] }] },
    bone: { name: 'Gilded Bones', set: 'echo', hp: 62, spd: 66, poise: 20, minion: true, color: '#e8d08a',
      atks: [{ clip: 'Attack6', wind: 0.42, recover: 0.45, reach: 28, dmg: 8, kb: 8, next: 1 },
        { clip: 'Attack2', wind: 0.24, recover: 0.5, reach: 30, dmg: 9, kb: 14, chainOnly: true }] },

    warden: { name: 'The Gatewarden', title: 'Keeper of the Black Gate', set: 'black_knight', hp: 300, spd: 56, poise: 46, boss: true, color: '#9a8cff',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.45, reach: 34, dmg: 11, kb: 10, next: 1 },
        { clip: 'Attack2', wind: 0.32, recover: 0.6, reach: 34, dmg: 11, kb: 14, chainOnly: true },
        { clip: 'Attack3', wind: 0.8, recover: 0.7, reach: 38, dmg: 18, kb: 26 },
        { clip: 'Attack4', wind: 0.72, recover: 0.7, reach: 30, dmg: 16, kb: 24, lunge: 96, range: [56, 150], unparry: true },
        { clip: 'Special1', wind: 0.9, recover: 0.8, dmg: 20, kb: 30, aoe: 46, at: 16, unparry: true, phase: 2 }] },
    twinA: { name: 'Hollow Twin', title: 'the Left Hand', set: 'frost_knight_a', hp: 190, spd: 64, poise: 34, boss: true, color: '#a8d8ff',
      atks: [{ clip: 'Attack1', wind: 0.42, recover: 0.5, reach: 32, dmg: 10, kb: 10 },
        { clip: 'Attack3', wind: 0.7, recover: 0.6, reach: 36, dmg: 15, kb: 22 },
        { clip: 'Attack4', wind: 0.64, recover: 0.66, reach: 28, dmg: 14, kb: 22, lunge: 100, range: [56, 150], unparry: true }] },
    twinB: { name: 'Hollow Twin', title: 'the Right Hand', set: 'frost_knight_b', hp: 190, spd: 64, poise: 34, boss: true, color: '#c8e8ff',
      atks: [{ clip: 'Attack2', wind: 0.4, recover: 0.5, reach: 32, dmg: 10, kb: 10, next: 1 },
        { clip: 'Attack6', wind: 0.26, recover: 0.6, reach: 34, dmg: 10, kb: 14, chainOnly: true },
        { clip: 'Special1', wind: 0.86, recover: 0.8, dmg: 17, kb: 26, aoe: 42, at: 14, unparry: true }] },
    umbral: { name: 'The Umbral', title: 'Who Walks Behind', set: 'cassius', hp: 270, spd: 60, poise: 36, boss: true, color: '#c070ff',
      atks: [{ clip: 'Attack5', wind: 0.5, recover: 0.5, dmg: 10, kb: 12, bolt: { fx: 'arcane_orb', speed: 150 }, range: [50, 400] },
        { clip: 'Attack1', wind: 0.36, recover: 0.5, reach: 28, dmg: 10, kb: 12 },
        { clip: 'Rolling', wind: 0.3, recover: 0.25, blink: true, range: [0, 60] },
        { clip: 'Special1', wind: 0.8, recover: 0.7, dmg: 11, kb: 14, bolt: { fx: 'arcane_orb', speed: 130, fan: 3 }, phase: 2, range: [40, 400] }] },
    hunger: { name: 'The Hunger', title: 'It Eats the Light', set: 'nightcrawler', scale: 1.45, hp: 380, spd: 70, poise: 54, boss: true, color: '#ff6a5a',
      atks: [{ clip: 'Attack1', wind: 0.44, recover: 0.4, reach: 40, dmg: 12, kb: 12, next: 1 },
        { clip: 'Attack2', wind: 0.28, recover: 0.6, reach: 42, dmg: 12, kb: 16, chainOnly: true },
        { clip: 'Attack4', wind: 0.7, recover: 0.8, reach: 40, dmg: 20, kb: 30, lunge: 150, range: [70, 220], unparry: true },
        { clip: 'Special1', wind: 0.95, recover: 0.8, dmg: 22, kb: 30, aoe: 58, at: 18, unparry: true, phase: 2 }] },
    wing: { name: 'The Pale Wing', title: 'Throat of the Wind', set: 'sky_beast', scale: 1.6, hp: 430, spd: 62, poise: 60, boss: true, color: '#e8f0ff',
      atks: [{ clip: 'Attack2', wind: 0.5, recover: 0.5, reach: 52, dmg: 13, kb: 18 },
        { clip: 'Attack3', wind: 0.75, recover: 0.6, reach: 54, dmg: 18, kb: 26 },
        { clip: 'Attack4', wind: 0.75, recover: 0.8, reach: 44, dmg: 20, kb: 30, lunge: 170, range: [80, 260], unparry: true },
        { clip: 'Special1', wind: 1.0, recover: 0.9, dmg: 24, kb: 34, aoe: 66, at: 10, unparry: true },
        { clip: 'Attack5', wind: 0.55, recover: 0.5, dmg: 12, kb: 12, bolt: { fx: 'wind_gust', speed: 170 }, phase: 2, range: [90, 400] }] },
    firstCut: { name: 'The First Cut', title: 'Who Wounded the Moon', set: 'master_knight', hp: 560, spd: 74, poise: 70, boss: true, color: '#ffffff',
      atks: [{ clip: 'Attack1', wind: 0.4, recover: 0.4, reach: 34, dmg: 12, kb: 10, next: 1 },
        { clip: 'Attack2', wind: 0.24, recover: 0.4, reach: 34, dmg: 12, kb: 10, next: 2, chainOnly: true },
        { clip: 'Attack3', wind: 0.3, recover: 0.7, reach: 38, dmg: 16, kb: 24, chainOnly: true },
        { clip: 'Attack4', wind: 0.6, recover: 0.7, reach: 32, dmg: 18, kb: 28, lunge: 130, range: [60, 220], unparry: true },
        { clip: 'Attack6', wind: 0.75, recover: 0.6, reach: 40, dmg: 20, kb: 26 },
        { clip: 'Special1', wind: 0.9, recover: 0.9, dmg: 26, kb: 36, aoe: 64, at: 12, unparry: true, phase: 2 },
        { clip: 'Attack5', wind: 0.5, recover: 0.5, dmg: 14, kb: 14, bolt: { fx: 'dark_slash', speed: 210 }, phase: 2, range: [80, 400] }] },
  };

  // ---- Stages: the six hours of the night ---------------------------------------------
  // look: sky colours, moon size and colour, ground tiles, silhouettes behind the arena.
  D.STAGES = [
    { id: 'gate', arenas: ['court', 'bridge', 'ring'], portal: 'gate', scale: { hp: 1, dmg: 1 }, hour: 'DUSK', name: 'The Black Gate', boss: 'warden',
      waves: [['ghoul', 'ghoul'], ['ghoul', 'ghast', 'ghoul']], bossWave: ['warden'],
      look: { sky: ['#140d1c', '#3a1622', '#6a2a2a'], moon: 22, moonCol: '#e8a0a0', ground: ['g_flagstone_dark', 'g_flagstone_2', 'g_cobble'], props: ['cdw_gate_arch', 'ruin_pillar', 'fv_tree_dead', 'cdw_pillar', 'monolith_b'], fog: '#3a1a24' } },
    { id: 'cloister', arenas: ['cross', 'court', 'pit'], portal: 'gate', scale: { hp: 1.1, dmg: 1.1 }, hour: 'THE FIRST HOUR', name: 'Cloister of Frost', boss: 'twins',
      waves: [['knife', 'ghoul', 'knife'], ['ghast', 'knife', 'ghast']], bossWave: ['twinA', 'twinB'],
      look: { sky: ['#0a1020', '#18283c', '#30485c'], moon: 26, moonCol: '#f0b0b0', ground: ['g_marble_white', 'g_flagstone_1', 'g_stone_floor'], props: ['fv_tree_pine_snow', 'cdw_arched_window', 'statue', 'cd_statue_knight', 'pillar'], fog: '#1a2a3a', snow: true } },
    { id: 'stair', arenas: ['bridge', 'cross', 'ring'], portal: 'stairs', scale: { hp: 1.25, dmg: 1.25 }, hour: 'THE SECOND HOUR', name: 'The Umbral Stair', boss: 'umbral',
      waves: [['bone', 'ghoul'], ['knife', 'bone', 'knife']], bossWave: ['umbral'],
      look: { sky: ['#0c0814', '#221430', '#3a1c40'], moon: 30, moonCol: '#ff8a8a', ground: ['g_flagstone_dark', 'g_slab_0_0', 'g_floor_grate'], props: ['temple', 'shrine_b', 'monolith_a', 'cdw_stained_glass', 'cd_candelabra'], fog: '#2a1430' } },
    { id: 'waste', arenas: ['court', 'pit', 'ring'], portal: 'rift', scale: { hp: 1.3, dmg: 1.25 }, hour: 'THE THIRD HOUR', name: 'The Ashen Waste', boss: 'hunger',
      waves: [['ghast', 'ghast', 'ghoul'], ['bone', 'knife', 'bone']], bossWave: ['hunger'],
      look: { sky: ['#0e0c10', '#24202a', '#4a3a40'], moon: 34, moonCol: '#ff6060', ground: ['g_dirt_dark', 'g_gravel', 'g_trampled_dirt'], props: ['fv_tree_dead', 'rock_big', 'ruin_stone_a', 'fv_boulder', 'grave_cross'], fog: '#2a2228', ash: true } },
    { id: 'throat', arenas: ['bridge', 'cross', 'pit'], portal: 'rift', scale: { hp: 1.35, dmg: 1.3 }, hour: 'THE FOURTH HOUR', name: "The Wind's Throat", boss: 'wing',
      waves: [['knife', 'knife', 'ghast'], ['bone', 'bone', 'ghast']], bossWave: ['wing'],
      look: { sky: ['#06080e', '#141c2c', '#2c3448'], moon: 40, moonCol: '#ff4a50', ground: ['g_stone_floor', 'g_gravel', 'g_slab_1_1'], props: ['rock_m1', 'monolith_c', 'ruin_wall', 'rock_dark', 'stone_circle'], fog: '#1a2030', wind: true } },
    { id: 'shadow', arenas: ['bridge', 'ring'], portal: 'stairs', scale: { hp: 1.2, dmg: 1.25 }, hour: 'THE LAST HOUR', name: "The Moon's Shadow", boss: 'firstCut',
      waves: [['bone', 'knife', 'ghast', 'knife']], bossWave: ['firstCut'],
      look: { sky: ['#040306', '#0e0610', '#200a14'], moon: 58, moonCol: '#ff2a44', ground: ['g_marble_checker', 'g_flagstone_dark', 'g_slab_0_1'], props: ['altar', 'cd_throne', 'ruin_pillar', 'pillar_broken', 'cdw_pillar'], fog: '#200810', embers: true } },
  ];

  // ---- Boons: one of three after each won hour ------------------------------------------
  D.BOONS = [
    { id: 'edge', name: 'Whetted Edge', desc: 'Your cuts deal 20% more damage.' },
    { id: 'vigor', name: 'Second Heart', desc: '+30 health, and you heal to full.' },
    { id: 'guard', name: 'Steady Hand', desc: 'The parry window is 60% wider.' },
    { id: 'moonblood', name: 'Moonblood', desc: 'The moon fills 40% faster.' },
    { id: 'thirst', name: 'Red Thirst', desc: 'Heal 5% of the damage you deal.' },
    { id: 'fourth', name: 'Fifth Cut', desc: 'Your combo gains a fifth, heavier cut.' },
    { id: 'ghost', name: 'Ghoststep', desc: 'Dodges go farther; the perfect dodge is easier.' },
    { id: 'riposte', name: 'Riposte', desc: 'After a parry, your next cut deals triple damage.' },
    { id: 'breath', name: 'Last Breath', desc: 'The Last Ditch Effort opens at 45% health.' },
    { id: 'rising', name: 'Rising Moon', desc: 'Start every fight with the moon half full.' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
