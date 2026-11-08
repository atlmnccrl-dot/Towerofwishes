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
  // ---- The roster: four playable heroes, each with a combo, a heavy, two skills and an ultimate.
  // Skill kinds (sim.js): wave, blinkStrike, zone, blink, chain, leapSlam, clones, smoke.
  // art: the ultimate's cinematic (cine.js). Vesper's is the Red Moon / the Last Ditch Effort.
  const base = D.HERO;
  D.HEROES = {
    vesper: Object.assign({}, base, { id: 'vesper', pow: 1.12, name: 'Vesper', title: 'The Moonblade', weapon: 'Sword', color: '#ff3048', art: 'moon',
      blurb: 'A knight in a red hood. Combos, parries, and the moon itself.',
      skills: [
        { name: 'Crescent Wave', kind: 'wave', cd: 6, clip: 'Attack3', dmg: 14, speed: 300, r: 16, fx: 'dark_slash', poise: 14 },
        { name: 'Phantom Step', kind: 'blinkStrike', cd: 7, clip: 'Attack6', dmg: 18, range: 150, r: 34, poise: 20 }] }),
    lys: Object.assign({}, base, { id: 'lys', pow: 1.32, name: 'Lys', title: 'The Bloom Witch', weapon: 'Spells', color: '#ff7aa0', set: 'lyra', art: 'petals', hp: 135, spd: 116, ranged: true, dodge: { dur: 0.34, dist: 128, iframes: [0.02, 0.34], perfect: 0.18, cd: 0.12 },
      blurb: 'Fights from range with bolts, frost and blight. Fragile up close.',
      combo: [
        { clip: 'Attack5', wind: 0.09, recover: 0.14, dmg: 8, poise: 7, kb: 8, bolt: { fx: 'magic_missile', speed: 320 } },
        { clip: 'Attack5', wind: 0.09, recover: 0.14, dmg: 8, poise: 7, kb: 8, bolt: { fx: 'magic_missile', speed: 320 } },
        { clip: 'Attack3', wind: 0.18, recover: 0.28, dmg: 13, poise: 14, kb: 18, bolt: { fx: 'fireball_arcane', speed: 240, burst: 26 }, finisher: true },
        { clip: 'Attack3', wind: 0.2, recover: 0.3, dmg: 16, poise: 16, kb: 22, bolt: { fx: 'fireball_big', speed: 240, burst: 34, fan: 3 }, finisher: true }],
      heavy: { clip: 'Special1', wind: 0.26, recover: 0.36, aoe: 54, at: 0, dmg: 13, poise: 20, kb: 34, fx: 'frost', slow: 3 },
      dashCut: { clip: 'Attack5', wind: 0.08, recover: 0.2, dmg: 9, poise: 8, kb: 10, bolt: { fx: 'arcane_orb', speed: 320, fan: 3 } },
      skills: [
        { name: 'Blight Bloom', kind: 'zone', cd: 8, clip: 'Attack3', r: 44, dur: 4.5, dps: 10, slow: 1, fx: 'poison_cloud', range: 140 },
        { name: 'Petal Blink', kind: 'blink', cd: 5, clip: 'Attack5', range: 110, r: 36, dmg: 9, poise: 12 }] }),
    kestrel: Object.assign({}, base, { id: 'kestrel', pow: 0.94, name: 'Kestrel', title: 'The Stormlancer', weapon: 'Spear', color: '#ffd060', set: 'aerys_spear', art: 'storm', hp: 125, spd: 122,
      blurb: 'Long reach and lightning. Chains bolts through crowds, drops thunder from the sky.',
      combo: [
        { clip: 'Attack1', wind: 0.12, recover: 0.2, reach: 44, arc: 0.8, dmg: 7, poise: 7, kb: 6, step: 9, fx: 'slash' },
        { clip: 'Attack2', wind: 0.12, recover: 0.22, reach: 44, arc: 0.8, dmg: 7, poise: 7, kb: 6, step: 9, fx: 'slash' },
        { clip: 'Attack6', wind: 0.14, recover: 0.24, reach: 40, dmg: 8, poise: 10, kb: 14, step: 8, fx: 'kick', stun: 0.25 },
        { clip: 'Attack3', wind: 0.18, recover: 0.32, reach: 50, arc: 0.7, dmg: 12, poise: 14, kb: 22, step: 12, fx: 'finisher', finisher: true, stun: 0.4 },
        { clip: 'Attack6', wind: 0.16, recover: 0.34, reach: 50, dmg: 15, poise: 16, kb: 24, step: 12, fx: 'finisher', finisher: true }],
      heavy: { clip: 'Attack4', wind: 0.22, recover: 0.38, reach: 34, dmg: 14, poise: 22, kb: 26, lunge: 90, fx: 'dash', stun: 0.6 },
      skills: [
        { name: 'Chain Lightning', kind: 'chain', cd: 6, clip: 'Attack5', dmg: 15, jumps: 5, range: 150, hop: 90, stun: 0.5 },
        { name: 'Thunder Drop', kind: 'leapSlam', cd: 8, clip: 'Attack4', range: 140, r: 50, dmg: 20, poise: 26, stun: 0.9 }] }),
    wisp: Object.assign({}, base, { id: 'wisp', pow: 0.8, name: 'Wisp', title: 'The Shadow', weapon: 'Daggers', color: '#c9a0ff', set: 'nox', art: 'cuts', hp: 90, spd: 138,
      blurb: 'Fast and fragile. Knife fans, shadow clones, smoke that blinds.',
      combo: [
        { clip: 'Attack1', wind: 0.07, recover: 0.12, reach: 26, dmg: 4, poise: 4, kb: 3, step: 8, fx: 'slash' },
        { clip: 'Attack2', wind: 0.07, recover: 0.12, reach: 26, dmg: 4, poise: 4, kb: 3, step: 8, fx: 'slash' },
        { clip: 'Attack6', wind: 0.07, recover: 0.14, reach: 26, dmg: 5, poise: 5, kb: 4, step: 8, fx: 'slash' },
        { clip: 'Kick', wind: 0.1, recover: 0.2, reach: 26, dmg: 7, poise: 10, kb: 16, step: 6, fx: 'kick' },
        { clip: 'Attack3', wind: 0.12, recover: 0.26, reach: 30, dmg: 11, poise: 14, kb: 20, step: 12, fx: 'finisher', finisher: true }],
      heavy: { clip: 'Attack5', wind: 0.16, recover: 0.3, dmg: 6, poise: 6, kb: 8, bolt: { fx: 'dagger', speed: 360, fan: 5 } },
      skills: [
        { name: 'Shadow Clones', kind: 'clones', cd: 10, clip: 'Taunt', n: 2, dur: 6 },
        { name: 'Smoke Veil', kind: 'smoke', cd: 8, clip: 'Rolling', r: 56, stun: 1.3 }] }),
    // Unlocked at level 12: a frost duelist who slows everything she cuts.
    rime: Object.assign({}, base, { id: 'rime', pow: 0.95, name: 'Rime', title: 'The Frost Blade', weapon: 'Twin blades', color: '#8ad0ff', set: 'frost_assassin', art: 'cuts', hp: 110, spd: 132,
      blurb: 'Quick twin blades that chill. Frost fields, ice dashes, everything slows around her.',
      combo: [
        { clip: 'Attack1', wind: 0.08, recover: 0.14, reach: 28, dmg: 5, poise: 5, kb: 4, step: 8, fx: 'slash' },
        { clip: 'Attack2', wind: 0.08, recover: 0.14, reach: 28, dmg: 5, poise: 5, kb: 4, step: 8, fx: 'slash' },
        { clip: 'Attack6', wind: 0.1, recover: 0.18, reach: 28, dmg: 7, poise: 8, kb: 8, step: 8, fx: 'slash', slow: 1.5 },
        { clip: 'Attack3', wind: 0.14, recover: 0.28, reach: 32, dmg: 12, poise: 14, kb: 20, step: 10, fx: 'finisher', finisher: true, slow: 2.5 },
        { clip: 'Attack5', wind: 0.14, recover: 0.3, reach: 34, dmg: 14, poise: 16, kb: 22, step: 12, fx: 'finisher', finisher: true, slow: 3 }],
      heavy: { clip: 'Special1', wind: 0.24, recover: 0.36, aoe: 46, at: 0, dmg: 13, poise: 20, kb: 28, fx: 'frost', slow: 3 },
      skills: [
        { name: 'Frost Field', kind: 'zone', cd: 8, clip: 'Special1', r: 50, dur: 4.5, dps: 9, slow: 1, fx: 'frost_nova', range: 120 },
        { name: 'Glacial Step', kind: 'blinkStrike', cd: 6, clip: 'Attack4', dmg: 16, range: 150, r: 34, poise: 18 }] }),
    // Unlocked by defeating him: the swordsman who cut the moon, seven hundred years of practice.
    firstcut: Object.assign({}, base, { id: 'firstcut', pow: 1.0, name: 'The First Cut', title: 'Who Wounded the Moon', weapon: 'Longsword', color: '#ffffff', set: 'master_knight', art: 'moon', hp: 140, spd: 120,
      blurb: 'The swordsman himself. Long, heavy cuts and the moon art he invented.',
      combo: [
        { clip: 'Attack1', wind: 0.11, recover: 0.2, reach: 36, arc: 1.7, dmg: 8, poise: 8, kb: 6, step: 8, fx: 'slash' },
        { clip: 'Attack2', wind: 0.11, recover: 0.22, reach: 36, arc: 1.7, dmg: 8, poise: 8, kb: 6, step: 8, fx: 'slash' },
        { clip: 'Attack6', wind: 0.13, recover: 0.24, reach: 38, dmg: 10, poise: 12, kb: 14, step: 9, fx: 'slash' },
        { clip: 'Attack3', wind: 0.17, recover: 0.32, reach: 40, dmg: 14, poise: 16, kb: 22, step: 11, fx: 'finisher', finisher: true },
        { clip: 'Attack4', wind: 0.18, recover: 0.36, reach: 44, dmg: 18, poise: 20, kb: 28, step: 14, fx: 'finisher', finisher: true }],
      skills: [
        { name: 'Moon Cleave', kind: 'wave', cd: 6, clip: 'Attack3', dmg: 18, speed: 320, r: 20, fx: 'dark_slash', poise: 18 },
        { name: 'Seven Centuries', kind: 'blinkStrike', cd: 7, clip: 'Attack4', dmg: 22, range: 170, r: 38, poise: 24 }] }),
    // Earned with stars: a paladin who holds the line.
    halden: Object.assign({}, base, { id: 'halden', pow: 1.0, name: 'Halden', title: 'The Dawn Shield', weapon: 'Mace and shield', color: '#ffe08a', set: 'vh_paladin_008', art: 'storm', hp: 160, spd: 108,
      blurb: 'Slow and unbreakable. Heavy mace blows, holy ground, and judgment from the sky.',
      combo: [
        { clip: 'Attack1', wind: 0.13, recover: 0.22, reach: 32, arc: 1.6, dmg: 8, poise: 9, kb: 8, step: 7, fx: 'slash' },
        { clip: 'Attack2', wind: 0.13, recover: 0.24, reach: 32, arc: 1.6, dmg: 8, poise: 9, kb: 8, step: 7, fx: 'slash' },
        { clip: 'Attack3', wind: 0.16, recover: 0.3, reach: 34, dmg: 13, poise: 16, kb: 22, step: 9, fx: 'finisher', finisher: true, stun: 0.4 },
        { clip: 'Attack4', wind: 0.2, recover: 0.36, reach: 36, dmg: 17, poise: 22, kb: 30, step: 12, fx: 'finisher', finisher: true, stun: 0.6 }],
      heavy: { clip: 'Special1', wind: 0.3, recover: 0.42, aoe: 44, at: 0, dmg: 16, poise: 26, kb: 30, fx: 'spin', stun: 0.5 },
      skills: [
        { name: 'Holy Ground', kind: 'zone', cd: 9, clip: 'Taunt', r: 50, dur: 5, dps: 11, slow: 1, fx: 'circle_holy', range: 60 },
        { name: 'Judgment', kind: 'leapSlam', cd: 8, clip: 'Attack4', range: 150, r: 54, dmg: 22, poise: 28, stun: 1.0 }] }),
    // Earned by felling the Hollow Twins: a monk whose fists burn.
    ember: Object.assign({}, base, { id: 'ember', pow: 0.95, name: 'Ember', title: 'The Ash Monk', weapon: 'Fists', color: '#ff9a4a', set: 'vh_monk_001', art: 'cuts', hp: 112, spd: 136,
      blurb: 'Fast, close and relentless. Chains of strikes, a burning palm, a step through fire.',
      combo: [
        { clip: 'Attack1', wind: 0.07, recover: 0.11, reach: 26, dmg: 5, poise: 5, kb: 3, step: 8, fx: 'slash' },
        { clip: 'Attack2', wind: 0.07, recover: 0.11, reach: 26, dmg: 5, poise: 5, kb: 3, step: 8, fx: 'slash' },
        { clip: 'Attack5', wind: 0.08, recover: 0.13, reach: 28, dmg: 6, poise: 7, kb: 6, step: 8, fx: 'kick' },
        { clip: 'Kick', wind: 0.1, recover: 0.2, reach: 28, dmg: 9, poise: 12, kb: 20, step: 8, fx: 'kick', finisher: true },
        { clip: 'Attack3', wind: 0.12, recover: 0.26, reach: 30, dmg: 12, poise: 15, kb: 24, step: 12, fx: 'finisher', finisher: true }],
      heavy: { clip: 'Special1', wind: 0.22, recover: 0.34, aoe: 40, at: 0, dmg: 12, poise: 20, kb: 26, fx: 'spin' },
      skills: [
        { name: 'Burning Palm', kind: 'wave', cd: 5, clip: 'Attack5', dmg: 15, speed: 280, r: 18, fx: 'fireball', poise: 16 },
        { name: 'Step Through Fire', kind: 'blinkStrike', cd: 6, clip: 'Attack6', dmg: 16, range: 150, r: 34, poise: 18 }] }),
  };
  D.HERO_ORDER = ['vesper', 'lys', 'kestrel', 'wisp', 'ember', 'halden', 'rime', 'firstcut'];
  // Snappier: every hero's cuts wind up and recover faster, and they move quicker.
  for (const id of D.HERO_ORDER) { const H = D.HEROES[id] = Object.assign({}, D.HEROES[id]); H.spd = Math.round(H.spd * 1.12);
    const quick = (k) => Object.assign({}, k, { wind: +(k.wind * 0.8).toFixed(3), recover: +(k.recover * 0.75).toFixed(3) });
    H.combo = H.combo.map(quick); H.heavy = quick(H.heavy); H.dashCut = quick(H.dashCut); }
  // Wisp's shadow clones.
  D.CLONE = { name: 'Shadow', set: 'nox', hp: 30, spd: 130, poise: 0, ally: true,
    atks: [{ clip: 'Attack1', wind: 0.12, recover: 0.22, reach: 26, dmg: 5, poise: 5, kb: 6 }, { clip: 'Attack6', wind: 0.12, recover: 0.22, reach: 26, dmg: 5, poise: 5, kb: 6 }] };

  // The ally who lends her flower to the Last Ditch Effort (she does not fight).
  D.LYS = { id: 'lys', name: 'Lys', set: 'lyra', color: '#ff7aa0' };

  // ---- Foes ------------------------------------------------------------------------------
  // An attack: clip, wind (seconds to contact), recover, reach (px in front), dmg, kb.
  //  lunge: px travelled through the contact; aoe: radius around a point `at` px in front;
  //  bolt: fires a projectile; unparry: cannot be parried (red glint), only dodged;
  //  next: chains into another attack of the same foe; range: [min, max] distance it is chosen at;
  //  phase: only from phase 2.
  D.FOES = {
    // A training dummy for the first trial: stands, takes cuts, never strikes back.
    dummy: { name: 'Training Husk', set: 'thug_a', hp: 26, spd: 0, poise: 0, minion: true, passive: true, color: '#9a8a92', atks: [{ clip: 'Attack1', wind: 9, recover: 1, reach: 1, dmg: 0, kb: 0 }] },
    // The guided trial's own: a post to chain a combo on, and a knight who swings slowly for you to dodge.
    post: { name: 'Training Post', set: 'thug_a', hp: 120, spd: 0, poise: 0, minion: true, passive: true, color: '#9a8a92', atks: [{ clip: 'Attack1', wind: 9, recover: 1, reach: 1, dmg: 0, kb: 0 }] },
    drill: { name: 'Drill Knight', set: 'black_knight', hp: 9999, spd: 40, poise: 400, color: '#c8c0b0', keep: 30,
      atks: [{ clip: 'Attack4', wind: 1.05, recover: 1.1, reach: 36, arc: 1.8, dmg: 3, kb: 12, unparry: true }] },
    // A shield wall in one man: blocks cuts from the front. A heavy blow, or getting behind him, breaks the guard.
    shield: { name: 'Shieldbearer', set: 'gothic_knight_a', hp: 80, spd: 44, poise: 0, minion: true, color: '#c8c0b0', guard: { arc: 1.15, mul: 0.15 },
      atks: [{ clip: 'Attack1', wind: 0.45, recover: 0.5, reach: 28, dmg: 9, kb: 20 },
        { clip: 'Attack4', wind: 0.6, recover: 0.6, reach: 26, dmg: 12, kb: 26, lunge: 70, range: [40, 100] }] },
    // A charging brute: a long telegraphed rush you must sidestep, and a slam that shakes the floor.
    brute: { name: 'Grave Brute', set: 'golem_b', scale: 1.35, hp: 150, spd: 46, poise: 60, minion: true, color: '#c89070',
      atks: [{ clip: 'Attack4', wind: 0.85, recover: 1.0, reach: 30, dmg: 22, kb: 44, lunge: 210, range: [70, 240], unparry: true },
        { clip: 'Attack3', wind: 0.75, recover: 0.9, aoe: 44, at: 18, dmg: 18, kb: 30, unparry: true }] },
    // Fast and swollen with red light: it runs at you and bursts. Kill it near its friends.
    husk: { name: 'Blood Husk', set: 'thug_a', hp: 22, spd: 104, poise: 0, minion: true, color: '#ff4a5a', blast: { r: 56, dmg: 40 }, tint: '#ff2a44',
      atks: [{ clip: 'Attack2', wind: 0.7, recover: 0.2, aoe: 46, at: 0, dmg: 26, kb: 44, unparry: true, explode: true }] },
    // ---- The armies of the six acts (random-cast sets, vh_*: loaded when a fight needs them) ----
    // Act I, the Black Gate: raiders and the first of the dead.
    reaver: { name: 'Gate Reaver', set: 'vh_barbarian_002', hp: 58, spd: 62, poise: 0, minion: true, color: '#c89070',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 32, arc: 1.6, dmg: 10, kb: 14 }, { clip: 'Special1', wind: 0.7, recover: 0.7, aoe: 40, at: 0, dmg: 12, kb: 26, unparry: true }] },
    chieftain: { name: 'Raider Chieftain', set: 'vh_barbarian_008', scale: 1.15, hp: 140, spd: 58, poise: 40, minion: true, color: '#ffd060',
      atks: [{ clip: 'Attack2', wind: 0.55, recover: 0.55, reach: 34, arc: 1.7, dmg: 14, kb: 20, next: 1 }, { clip: 'Attack3', wind: 0.3, recover: 0.6, reach: 34, dmg: 14, kb: 26, chainOnly: true },
        { clip: 'Attack4', wind: 0.75, recover: 0.8, reach: 30, dmg: 18, kb: 34, lunge: 130, range: [60, 170], unparry: true }] },
    bulwark: { name: 'Bone Bulwark', set: 'vh_skeleton_002', hp: 70, spd: 46, poise: 0, minion: true, color: '#e0d8c8', guard: { arc: 1.15, mul: 0.15 },
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 28, dmg: 9, kb: 18 }] },
    pikeman: { name: 'Bone Pikeman', set: 'vh_skeleton_001', hp: 40, spd: 56, poise: 0, minion: true, color: '#e0d8c8',
      atks: [{ clip: 'Attack1', wind: 0.55, recover: 0.5, reach: 50, arc: 0.5, dmg: 9, kb: 14 }, { clip: 'Attack4', wind: 0.6, recover: 0.6, reach: 44, dmg: 11, kb: 20, lunge: 90, range: [60, 140], unparry: true }] },
    gateguard: { name: 'Black Gate Guard', set: 'vh_knight_003', hp: 90, spd: 48, poise: 0, minion: true, color: '#8a8aa0', guard: { arc: 1.1, mul: 0.2 },
      atks: [{ clip: 'Attack2', wind: 0.6, recover: 0.6, reach: 32, dmg: 13, kb: 22 }, { clip: 'Attack6', wind: 0.55, recover: 0.6, reach: 30, dmg: 12, kb: 20, lunge: 70, range: [40, 110] }] },
    // Act II, the Cloister of Frost: the frost order.
    acolyte: { name: 'Rime Acolyte', set: 'vh_mage_009', hp: 38, spd: 54, poise: 0, minion: true, keep: 130, color: '#8ad0ff',
      atks: [{ clip: 'Attack5', wind: 0.6, recover: 0.6, dmg: 8, kb: 8, slow: 1.5, bolt: { fx: 'ice_shard', speed: 230 }, range: [40, 320] },
        { clip: 'Special1', wind: 0.9, recover: 0.8, rain: { n: 3, r: 22, spread: 50, dmg: 11, fx: 'frost_nova', delay: 0.9 }, range: [40, 320], rare: true }] },
    seer: { name: 'Frost Seer', set: 'vh_mage_017', hp: 46, spd: 50, poise: 0, minion: true, keep: 140, color: '#a8e0ff',
      atks: [{ clip: 'Attack5', wind: 0.8, recover: 0.7, dmg: 0, zone: { r: 36, dur: 3.5, dps: 7, delay: 0.7, fx: 'frost_nova', slow: 1.5 }, range: [30, 300] },
        { clip: 'Special1', wind: 0.9, recover: 0.9, summon: { key: 'pikeman', n: 2 }, range: [0, 400], rare: true }] },
    cloisterknight: { name: 'Cloister Knight', set: 'vh_knight_004', hp: 88, spd: 50, poise: 0, minion: true, color: '#7aa0d0', guard: { arc: 1.1, mul: 0.2 },
      atks: [{ clip: 'Attack6', wind: 0.5, recover: 0.6, reach: 32, dmg: 12, kb: 18, next: 1 }, { clip: 'Attack3', wind: 0.25, recover: 0.6, reach: 32, dmg: 12, kb: 22, chainOnly: true }] },
    duelist: { name: 'Mirror Duelist', set: 'vh_duelist_008', hp: 52, spd: 74, poise: 0, minion: true, color: '#5ac8b0', counter: 0.4,
      atks: [{ clip: 'Attack1', wind: 0.32, recover: 0.4, reach: 30, dmg: 9, kb: 10, next: 1 }, { clip: 'Attack2', wind: 0.22, recover: 0.5, reach: 30, dmg: 10, kb: 14, chainOnly: true }] },
    frostpike: { name: 'Frost Pike', set: 'vh_spearman_014', hp: 44, spd: 58, poise: 0, minion: true, color: '#8ac0e8',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 48, arc: 0.5, dmg: 9, kb: 14, slow: 1.2 }] },
    // Act III, the Umbral Stair: the shadow cult.
    wraith: { name: 'Umbral Wraith', set: 'vh_wraith_004', hp: 48, spd: 70, poise: 0, minion: true, color: '#9a8ac8', fade: 0.45,
      atks: [{ clip: 'Attack1', wind: 0.45, recover: 0.5, reach: 34, arc: 1.6, dmg: 11, kb: 14 }, { clip: 'Special1', wind: 0.7, recover: 0.7, aoe: 38, at: 0, dmg: 12, kb: 22, unparry: true }] },
    shade: { name: 'Violet Shade', set: 'vh_wraith_001', hp: 40, spd: 66, poise: 0, minion: true, keep: 110, color: '#c070ff', fade: 0.5,
      atks: [{ clip: 'Attack5', wind: 0.6, recover: 0.6, dmg: 9, kb: 10, bolt: { fx: 'arcane_orb', speed: 170 }, range: [40, 320] }, { clip: 'Attack1', wind: 0.4, recover: 0.5, reach: 30, dmg: 9, kb: 12 }] },
    cutthroat: { name: 'Cutthroat', set: 'vh_rogue_002', hp: 36, spd: 84, poise: 0, minion: true, color: '#5a5a6a',
      atks: [{ clip: 'Rolling', wind: 0.3, recover: 0.2, blink: true, range: [60, 220] }, { clip: 'Attack1', wind: 0.28, recover: 0.4, reach: 26, dmg: 9, kb: 10, next: 2 }, { clip: 'Attack6', wind: 0.2, recover: 0.5, reach: 28, dmg: 11, kb: 16, chainOnly: true }] },
    warlock: { name: 'Stair Warlock', set: 'vh_warlock_005', hp: 60, spd: 52, poise: 0, minion: true, keep: 140, color: '#9a6aff',
      atks: [{ clip: 'Attack5', wind: 0.7, recover: 0.6, dmg: 9, kb: 10, bolt: { fx: 'arcane_orb', speed: 150, fan: 3 }, range: [40, 320] }, { clip: 'Special1', wind: 1.0, recover: 0.9, summon: { key: 'cutthroat', n: 2 }, range: [0, 400], rare: true }] },
    shadowbulwark: { name: 'Shadow Bulwark', set: 'vh_skeleton_015', hp: 76, spd: 46, poise: 0, minion: true, color: '#6a6a7a', guard: { arc: 1.15, mul: 0.15 },
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 30, dmg: 10, kb: 18 }] },
    // Act IV, the Ashen Waste: beasts and fire.
    hound: { name: 'Ash Hound', set: 'vh_beastfolk_003', hp: 34, spd: 96, poise: 0, minion: true, color: '#b07a4a',
      atks: [{ clip: 'Attack4', wind: 0.45, recover: 0.6, reach: 26, dmg: 11, kb: 18, lunge: 150, range: [50, 190] }, { clip: 'Attack1', wind: 0.3, recover: 0.4, reach: 26, dmg: 8, kb: 10 }] },
    ram: { name: 'Bone Ram', set: 'vh_beastfolk_007', scale: 1.15, hp: 90, spd: 56, poise: 30, minion: true, color: '#e8dcc8',
      atks: [{ clip: 'Attack4', wind: 0.7, recover: 0.8, reach: 30, dmg: 18, kb: 40, lunge: 180, range: [70, 220], unparry: true }, { clip: 'Attack2', wind: 0.45, recover: 0.5, reach: 30, dmg: 11, kb: 18 }] },
    cinder: { name: 'Cinder Mage', set: 'vh_mage_001', hp: 40, spd: 52, poise: 0, minion: true, keep: 130, color: '#ff6a3a',
      atks: [{ clip: 'Attack5', wind: 0.65, recover: 0.6, dmg: 10, kb: 12, bolt: { fx: 'fireball', speed: 210, burst: 24, burstFx: 'explosion_fire', ground: { r: 24, dur: 2.2, dps: 7, fx: 'burning_ground' } }, range: [40, 320] }] },
    ashlock: { name: 'Ash Warlock', set: 'vh_warlock_002', hp: 64, spd: 50, poise: 0, minion: true, keep: 150, color: '#ff8a40',
      atks: [{ clip: 'Special1', wind: 0.9, recover: 0.8, rain: { n: 4, r: 24, spread: 70, dmg: 12, fx: 'explosion_fire', delay: 0.9 }, range: [40, 340] }, { clip: 'Attack5', wind: 1.0, recover: 0.9, summon: { key: 'hound', n: 2 }, range: [0, 400], rare: true }] },
    ravager: { name: 'Ash Ravager', set: 'vh_barbarian_013', hp: 66, spd: 60, poise: 0, minion: true, color: '#a06050',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 32, arc: 1.6, dmg: 11, kb: 16 }, { clip: 'Special1', wind: 0.65, recover: 0.7, aoe: 42, at: 0, dmg: 13, kb: 28, unparry: true }] },
    // Act V, the Wind's Throat: the hunters.
    ranger: { name: 'Throat Ranger', set: 'vh_ranger_013', hp: 36, spd: 62, poise: 0, minion: true, keep: 160, color: '#7ab060',
      atks: [{ clip: 'Attack1', wind: 0.75, recover: 0.7, dmg: 7, kb: 10, bolt: { fx: 'arrow', speed: 300, fan: 3 }, range: [50, 340] }] },
    sniper: { name: 'Gale Sniper', set: 'vh_ranger_006', hp: 34, spd: 56, poise: 0, minion: true, keep: 220, color: '#5aa0a0',
      atks: [{ clip: 'Attack1', wind: 1.05, recover: 0.8, dmg: 15, kb: 26, bolt: { fx: 'arrow', speed: 440, big: true }, range: [80, 420] }] },
    windmonk: { name: 'Wind Monk', set: 'vh_monk_002', hp: 50, spd: 82, poise: 0, minion: true, color: '#9ab070',
      atks: [{ clip: 'Attack1', wind: 0.3, recover: 0.3, reach: 26, dmg: 7, kb: 6, next: 1 }, { clip: 'Attack2', wind: 0.18, recover: 0.3, reach: 26, dmg: 7, kb: 8, chainOnly: true, next: 2 }, { clip: 'Kick', wind: 0.2, recover: 0.6, reach: 28, dmg: 11, kb: 26, chainOnly: true }] },
    stormfist: { name: 'Storm Fist', set: 'vh_monk_003', hp: 56, spd: 80, poise: 0, minion: true, color: '#7a9ad0', counter: 0.25,
      atks: [{ clip: 'Attack5', wind: 0.35, recover: 0.4, reach: 28, dmg: 9, kb: 14, next: 1 }, { clip: 'Kick', wind: 0.2, recover: 0.6, reach: 28, dmg: 12, kb: 30, chainOnly: true, stun: 0.2 }] },
    ridgepike: { name: 'Ridge Pikeman', set: 'vh_spearman_008', hp: 46, spd: 58, poise: 0, minion: true, color: '#8ab070',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 50, arc: 0.5, dmg: 10, kb: 16 }, { clip: 'Attack4', wind: 0.6, recover: 0.6, reach: 44, dmg: 12, kb: 22, lunge: 100, range: [60, 150], unparry: true }] },
    harpy: { name: 'Gale Harpy', set: 'vh_beastfolk_005', hp: 44, spd: 78, poise: 0, minion: true, color: '#c8a070',
      atks: [{ clip: 'Attack4', wind: 0.7, recover: 0.8, reach: 28, dmg: 11, kb: 24, lunge: 230, range: [90, 260], unparry: true }, { clip: 'Attack1', wind: 0.35, recover: 0.4, reach: 28, dmg: 9, kb: 12 }] },
    // Act VI, the Moon's Shadow: the Knights of the Wound.
    paladin: { name: 'Wound Paladin', set: 'vh_paladin_007', hp: 96, spd: 48, poise: 0, minion: true, color: '#ffd060', guard: { arc: 1.1, mul: 0.2 }, heal: { every: 7, r: 100, pct: 0.13 },
      atks: [{ clip: 'Attack1', wind: 0.55, recover: 0.55, reach: 32, dmg: 13, kb: 22 }, { clip: 'Attack4', wind: 0.7, recover: 0.8, aoe: 40, at: 20, dmg: 15, kb: 26, unparry: true }] },
    woundknight: { name: 'Knight of the Wound', set: 'vh_knight_014', scale: 1.1, hp: 92, spd: 52, poise: 40, minion: true, color: '#c070c0',
      atks: [{ clip: 'Attack2', wind: 0.5, recover: 0.5, reach: 36, arc: 1.6, dmg: 14, kb: 20, next: 1 }, { clip: 'Attack3', wind: 0.25, recover: 0.6, reach: 36, dmg: 15, kb: 26, chainOnly: true }, { clip: 'Special1', wind: 0.7, recover: 0.8, aoe: 44, at: 0, dmg: 16, kb: 30, unparry: true }] },
    woundblade: { name: 'Wound Duelist', set: 'vh_duelist_012', hp: 60, spd: 78, poise: 0, minion: true, color: '#c050a0', counter: 0.38,
      atks: [{ clip: 'Attack1', wind: 0.3, recover: 0.4, reach: 32, dmg: 11, kb: 12, next: 1 }, { clip: 'Attack6', wind: 0.2, recover: 0.5, reach: 34, dmg: 12, kb: 18, chainOnly: true }] },
    bloodlock: { name: 'Blood Warlock', set: 'vh_warlock_003', hp: 70, spd: 52, poise: 0, minion: true, keep: 150, color: '#ff2a44',
      atks: [{ clip: 'Special1', wind: 0.9, recover: 0.8, rain: { n: 4, r: 24, spread: 80, dmg: 11, fx: 'blast', delay: 0.95 }, range: [40, 340] }, { clip: 'Attack5', wind: 1.0, recover: 0.9, summon: { key: 'redwraith', n: 1 }, range: [0, 400], rare: true }] },
    redwraith: { name: 'Blood Wraith', set: 'vh_wraith_003', hp: 54, spd: 72, poise: 0, minion: true, color: '#ff4a5a', fade: 0.45,
      atks: [{ clip: 'Attack1', wind: 0.42, recover: 0.5, reach: 34, arc: 1.6, dmg: 13, kb: 14 }, { clip: 'Special1', wind: 0.65, recover: 0.7, aoe: 40, at: 0, dmg: 14, kb: 24, unparry: true }] },
    // More of the random cast: the turned townsfolk, axe skeletons, blight mages, stalkers, gate spearmen.
    thrall: { name: 'Thrall', set: 'vh_townsfolk_001', hp: 24, spd: 70, poise: 0, minion: true, color: '#ff6a6a', tint: '#ff2a44',
      atks: [{ clip: 'Attack5', wind: 0.45, recover: 0.5, reach: 24, dmg: 7, kb: 8 }] },
    boneguard: { name: 'Bone Guard', set: 'vh_skeleton_003', hp: 52, spd: 58, poise: 0, minion: true, color: '#e0d8c8',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 32, arc: 1.5, dmg: 10, kb: 16 }, { clip: 'Attack4', wind: 0.65, recover: 0.7, reach: 30, dmg: 13, kb: 24, lunge: 80, range: [50, 120], unparry: true }] },
    blight: { name: 'Blight Mage', set: 'vh_mage_006', hp: 40, spd: 52, poise: 0, minion: true, keep: 130, color: '#9ac040',
      atks: [{ clip: 'Attack5', wind: 0.65, recover: 0.6, dmg: 7, kb: 8, bolt: { fx: 'magic_missile', speed: 200, ground: { r: 26, dur: 3, dps: 7, fx: 'poison_cloud' } }, range: [40, 320] }] },
    stalker: { name: 'Stalker', set: 'vh_rogue_009', hp: 40, spd: 88, poise: 0, minion: true, color: '#7a6a8a',
      atks: [{ clip: 'Rolling', wind: 0.3, recover: 0.2, blink: true, range: [60, 220] }, { clip: 'Attack6', wind: 0.25, recover: 0.45, reach: 28, dmg: 12, kb: 14, next: 2 }, { clip: 'Attack2', wind: 0.18, recover: 0.5, reach: 28, dmg: 11, kb: 18, chainOnly: true }] },
    gatespear: { name: 'Gate Spearman', set: 'vh_spearman_001', hp: 42, spd: 58, poise: 0, minion: true, color: '#c8a080',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 48, arc: 0.5, dmg: 9, kb: 14 }, { clip: 'Attack4', wind: 0.6, recover: 0.6, reach: 42, dmg: 11, kb: 20, lunge: 90, range: [60, 140], unparry: true }] },

    // ---- The desert raiders and the graveyard dead (the tile packs' own characters) ----
    risen: { name: 'Risen Dead', set: 'vh_iso_ghoul', hp: 44, spd: 54, poise: 0, minion: true, color: '#9a9aa8',
      atks: [{ clip: 'Attack1', wind: 0.55, recover: 0.5, reach: 28, arc: 1.6, dmg: 10, kb: 14, next: 1 }, { clip: 'Attack2', wind: 0.3, recover: 0.6, reach: 28, dmg: 11, kb: 18, chainOnly: true }] },
    sunguard: { name: 'Sun Warden', set: 'vh_sand_guard', hp: 74, spd: 50, poise: 0, minion: true, color: '#ffd060', guard: { arc: 1.0, mul: 0.25 },
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 50, arc: 0.5, dmg: 10, kb: 16 }, { clip: 'Attack4', wind: 0.65, recover: 0.6, reach: 44, dmg: 13, kb: 22, lunge: 100, range: [60, 150], unparry: true }] },
    dunereaver: { name: 'Dune Reaver', set: 'vh_sand_horn', hp: 64, spd: 64, poise: 0, minion: true, color: '#d0a070',
      atks: [{ clip: 'Attack2', wind: 0.45, recover: 0.5, reach: 32, arc: 1.7, dmg: 11, kb: 16, next: 1 }, { clip: 'Attack3', wind: 0.3, recover: 0.6, reach: 32, dmg: 12, kb: 22, chainOnly: true },
        { clip: 'Special1', wind: 0.7, recover: 0.7, aoe: 42, at: 0, dmg: 13, kb: 28, unparry: true }] },
    scrapper: { name: 'Sand Imp', set: 'vh_sand_imp', scale: 0.9, hp: 24, spd: 108, poise: 0, minion: true, color: '#c87a4a',
      atks: [{ clip: 'Attack1', wind: 0.26, recover: 0.35, reach: 22, dmg: 7, kb: 8, next: 1 }, { clip: 'Attack3', wind: 0.18, recover: 0.5, reach: 24, dmg: 8, kb: 12, chainOnly: true }] },
    dunebrute: { name: 'Dune Brute', set: 'vh_sand_brute', scale: 1.2, hp: 130, spd: 48, poise: 50, minion: true, color: '#d8b080',
      atks: [{ clip: 'Attack4', wind: 0.8, recover: 0.9, reach: 30, dmg: 20, kb: 40, lunge: 180, range: [70, 220], unparry: true },
        { clip: 'Attack3', wind: 0.7, recover: 0.85, aoe: 46, at: 16, dmg: 17, kb: 30, unparry: true }, { clip: 'Attack1', wind: 0.45, recover: 0.6, reach: 30, arc: 1.6, dmg: 12, kb: 20 }] },

    // ---- Champions: named elites with a name card and a health bar, two to an act ----
    ch_gatebreaker: { name: 'Hrolf the Gatebreaker', title: 'Champion of the Raiders', set: 'vh_barbarian_016', scale: 1.4, hp: 300, spd: 60, poise: 50, boss: true, champion: true, color: '#ffb060',
      atks: [{ clip: 'Attack2', wind: 0.5, recover: 0.5, reach: 38, arc: 1.7, dmg: 14, kb: 22, next: 1 }, { clip: 'Attack3', wind: 0.3, recover: 0.6, reach: 38, dmg: 15, kb: 28, chainOnly: true },
        { clip: 'Special1', wind: 0.75, recover: 0.8, aoe: 54, at: 0, dmg: 18, kb: 34, unparry: true }, { clip: 'Attack4', wind: 0.7, recover: 0.8, reach: 32, dmg: 18, kb: 36, lunge: 160, range: [70, 200], unparry: true }] },
    ch_bonecaptain: { name: 'The Bone Captain', title: 'Who Drills the Dead', set: 'vh_skeleton_007', scale: 1.35, hp: 280, spd: 54, poise: 50, boss: true, champion: true, color: '#e8e0c8', guard: { arc: 1.1, mul: 0.25 },
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 34, dmg: 14, kb: 22 }, { clip: 'Taunt', wind: 0.9, recover: 0.9, summon: { key: 'boneguard', n: 2 }, range: [0, 400], rare: true }] },
    ch_mother: { name: 'Mother Rime', title: 'Abbess of the Frozen Cloister', set: 'vh_mage_007', scale: 1.3, hp: 260, spd: 52, poise: 40, boss: true, champion: true, keep: 150, color: '#a8e8ff',
      atks: [{ clip: 'Attack5', wind: 0.55, recover: 0.5, dmg: 11, kb: 12, slow: 2, bolt: { fx: 'ice_shard', speed: 240, fan: 3 }, range: [40, 340] },
        { clip: 'Special1', wind: 0.85, recover: 0.8, rain: { n: 6, r: 24, spread: 90, dmg: 13, fx: 'frost_nova', delay: 0.9 }, range: [40, 340] }, { clip: 'Rolling', wind: 0.3, recover: 0.3, blink: true, range: [0, 70] }] },
    ch_saber: { name: 'Saber of the Cloister', title: 'Undefeated in Seven Centuries', set: 'vh_duelist_007', scale: 1.25, hp: 250, spd: 82, poise: 40, boss: true, champion: true, counter: 0.55, color: '#5ad0c0',
      atks: [{ clip: 'Attack1', wind: 0.28, recover: 0.4, reach: 34, dmg: 12, kb: 12, next: 1 }, { clip: 'Attack2', wind: 0.2, recover: 0.4, reach: 34, dmg: 12, kb: 14, chainOnly: true, next: 2 }, { clip: 'Attack6', wind: 0.2, recover: 0.6, reach: 36, dmg: 15, kb: 22, chainOnly: true },
        { clip: 'Attack4', wind: 0.6, recover: 0.7, reach: 32, dmg: 16, kb: 28, lunge: 150, range: [70, 190], unparry: true }] },
    ch_bishop: { name: 'The Hollow Bishop', title: 'Shepherd of the Stair', set: 'vh_warlock_006', scale: 1.35, hp: 270, spd: 50, poise: 40, boss: true, champion: true, keep: 150, color: '#9a6aff',
      atks: [{ clip: 'Attack5', wind: 0.6, recover: 0.6, dmg: 11, kb: 12, bolt: { fx: 'arcane_orb', speed: 160, fan: 5 }, range: [40, 340] }, { clip: 'Special1', wind: 0.9, recover: 0.9, summon: { key: 'wraith', n: 2 }, range: [0, 400], rare: true },
        { clip: 'Rolling', wind: 0.3, recover: 0.3, blink: true, range: [0, 80] }] },
    ch_widow: { name: "Night's Widow", title: 'The Wraith Who Waits', set: 'vh_wraith_002', scale: 1.35, hp: 240, spd: 76, poise: 30, boss: true, champion: true, fade: 0.35, color: '#a0ff80',
      atks: [{ clip: 'Attack1', wind: 0.4, recover: 0.45, reach: 38, arc: 1.7, dmg: 13, kb: 14, next: 1 }, { clip: 'Attack2', wind: 0.25, recover: 0.5, reach: 38, dmg: 13, kb: 18, chainOnly: true }, { clip: 'Special1', wind: 0.6, recover: 0.7, aoe: 50, at: 0, dmg: 16, kb: 26, unparry: true }] },
    ch_carrion: { name: 'The Carrion King', title: 'Lord of the Ashen Packs', set: 'vh_beastfolk_001', scale: 1.4, hp: 300, spd: 80, poise: 50, boss: true, champion: true, color: '#c8a070',
      atks: [{ clip: 'Attack4', wind: 0.55, recover: 0.7, reach: 32, dmg: 17, kb: 30, lunge: 240, range: [80, 270], unparry: true }, { clip: 'Attack1', wind: 0.35, recover: 0.45, reach: 32, dmg: 12, kb: 14, next: 2 }, { clip: 'Attack2', wind: 0.22, recover: 0.5, reach: 32, dmg: 13, kb: 20, chainOnly: true },
        { clip: 'Taunt', wind: 0.9, recover: 0.8, summon: { key: 'hound', n: 3 }, range: [0, 400], rare: true }] },
    ch_ashmother: { name: 'The Ashmother', title: 'She Who Kindles', set: 'vh_mage_020', scale: 1.3, hp: 260, spd: 50, poise: 40, boss: true, champion: true, keep: 150, color: '#ff8a40',
      atks: [{ clip: 'Attack5', wind: 0.6, recover: 0.6, dmg: 12, kb: 14, bolt: { fx: 'fireball_big', speed: 200, big: true, burst: 34, burstFx: 'explosion_fire', ground: { r: 30, dur: 3, dps: 8, fx: 'burning_ground' } }, range: [40, 340] },
        { clip: 'Special1', wind: 0.9, recover: 0.8, rain: { n: 6, r: 26, spread: 100, dmg: 14, fx: 'explosion_fire', delay: 0.9 }, range: [40, 340] }] },
    ch_huntmaster: { name: 'The Huntmaster', title: 'First Bow of the Throat', set: 'vh_ranger_016', scale: 1.3, hp: 240, spd: 66, poise: 40, boss: true, champion: true, keep: 190, color: '#9ad070',
      atks: [{ clip: 'Attack1', wind: 0.6, recover: 0.55, dmg: 10, kb: 12, bolt: { fx: 'arrow', speed: 320, fan: 5 }, range: [50, 380] }, { clip: 'Attack1', wind: 1.0, recover: 0.7, dmg: 22, kb: 30, bolt: { fx: 'arrow', speed: 480, big: true }, range: [80, 420] },
        { clip: 'Rolling', wind: 0.25, recover: 0.3, blink: true, range: [0, 80] }] },
    ch_gale: { name: 'Grandmaster Gale', title: 'The Storm That Walks', set: 'vh_monk_006', scale: 1.3, hp: 260, spd: 90, poise: 40, boss: true, champion: true, counter: 0.35, color: '#c8e0ff',
      atks: [{ clip: 'Attack1', wind: 0.25, recover: 0.3, reach: 30, dmg: 10, kb: 8, next: 1 }, { clip: 'Attack2', wind: 0.16, recover: 0.3, reach: 30, dmg: 10, kb: 10, chainOnly: true, next: 2 }, { clip: 'Kick', wind: 0.18, recover: 0.6, reach: 32, dmg: 15, kb: 32, chainOnly: true, stun: 0.3 },
        { clip: 'Special1', wind: 0.6, recover: 0.7, aoe: 52, at: 0, dmg: 16, kb: 30, unparry: true }] },
    ch_woundlord: { name: 'Lord of the Wound', title: 'First Knight of the Moon', set: 'vh_knight_016', scale: 1.4, hp: 320, spd: 56, poise: 60, boss: true, champion: true, guard: { arc: 1.0, mul: 0.3 }, color: '#ff5a6a',
      atks: [{ clip: 'Attack2', wind: 0.45, recover: 0.5, reach: 40, arc: 1.7, dmg: 16, kb: 22, next: 1 }, { clip: 'Attack3', wind: 0.25, recover: 0.6, reach: 40, dmg: 17, kb: 30, chainOnly: true },
        { clip: 'Special1', wind: 0.75, recover: 0.8, aoe: 56, at: 0, dmg: 20, kb: 36, unparry: true }] },
    ch_saint: { name: 'The Last Saint', title: 'Who Prays to the Wound', set: 'vh_paladin_006', scale: 1.35, hp: 300, spd: 50, poise: 50, boss: true, champion: true, guard: { arc: 1.1, mul: 0.25 }, heal: { every: 6, r: 140, pct: 0.12 }, color: '#ffe08a',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.5, reach: 36, dmg: 15, kb: 22 }, { clip: 'Attack4', wind: 0.7, recover: 0.8, aoe: 48, at: 20, dmg: 18, kb: 30, unparry: true }, { clip: 'Taunt', wind: 0.9, recover: 0.9, summon: { key: 'paladin', n: 1 }, range: [0, 400], rare: true }] },
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

    raider: { name: 'Bone Raider', set: 'goblin', hp: 36, spd: 66, poise: 0, minion: true, color: '#e0d8c8',
      atks: [{ clip: 'Attack1', wind: 0.42, recover: 0.4, reach: 26, dmg: 7, kb: 8, next: 1 }, { clip: 'Attack2', wind: 0.3, recover: 0.5, reach: 26, dmg: 7, kb: 10, chainOnly: true }] },
    spearman: { name: 'Bone Spearman', set: 'goblin_spear', hp: 42, spd: 58, poise: 0, minion: true, color: '#e0d8c8',
      atks: [{ clip: 'Attack1', wind: 0.55, recover: 0.5, reach: 46, arc: 0.6, dmg: 9, kb: 14 }, { clip: 'Attack4', wind: 0.65, recover: 0.6, reach: 40, dmg: 11, kb: 20, lunge: 80, range: [60, 130], unparry: true }] },
    archer: { name: 'Bone Archer', set: 'goblin_archer', hp: 30, spd: 60, poise: 0, minion: true, keep: 120, color: '#e0d8c8',
      atks: [{ clip: 'Attack1', wind: 0.7, recover: 0.6, dmg: 8, kb: 10, bolt: { fx: 'arrow', speed: 260 }, range: [40, 320] }] },
    hexer: { name: 'Hexer', set: 'goblin_hexer', hp: 44, spd: 52, poise: 0, minion: true, keep: 110, color: '#c070ff',
      atks: [{ clip: 'Attack5', wind: 0.8, recover: 0.7, dmg: 0, zone: { r: 34, dur: 3.2, dps: 8, delay: 0.7, fx: 'poison_cloud', slow: 1 }, range: [30, 300] },
        { clip: 'Special1', wind: 0.9, recover: 0.9, summon: { key: 'raider', n: 2 }, range: [0, 400], rare: true }] },
    golem: { name: 'Golem', set: 'golem_a', scale: 1.3, hp: 110, spd: 40, poise: 40, minion: true, color: '#d8b060',
      atks: [{ clip: 'Attack1', wind: 0.7, recover: 0.7, reach: 36, dmg: 14, kb: 26 },
        { clip: 'Special1', wind: 0.9, recover: 0.8, dmg: 16, kb: 30, aoe: 44, at: 10, unparry: true },
        { clip: 'Attack4', wind: 0.8, recover: 0.7, dmg: 14, kb: 24, bolt: { fx: 'rock', speed: 190, burst: 26, burstFx: 'rock_burst' }, range: [70, 260] }] },
    pyre: { name: 'Pyre Priest', set: 'demon_dealer', limited: true, hp: 46, spd: 50, poise: 0, minion: true, keep: 120, color: '#ff8040',
      atks: [{ clip: 'Attack5', wind: 0.7, recover: 0.6, dmg: 9, kb: 12, bolt: { fx: 'fireball', speed: 200, burst: 22, burstFx: 'explosion_fire', ground: { r: 26, dur: 2.5, dps: 7, fx: 'burning_ground' } }, range: [40, 320] }] },
    poacher: { name: 'Poacher', set: 'poacher', hp: 40, spd: 70, poise: 0, minion: true, keep: 90, color: '#a0c070',
      atks: [{ clip: 'Attack1', wind: 0.55, recover: 0.5, dmg: 6, kb: 8, bolt: { fx: 'dart', speed: 280, fan: 3 }, range: [40, 260] }, { clip: 'Attack2', wind: 0.4, recover: 0.5, reach: 26, dmg: 7, kb: 10 }] },

    warden: { name: 'The Gatewarden', title: 'Keeper of the Black Gate', set: 'black_knight', hp: 300, spd: 56, poise: 46, boss: true, color: '#9a8cff',
      atks: [{ clip: 'Attack1', wind: 0.5, recover: 0.45, reach: 34, dmg: 11, kb: 10, next: 1 },
        { clip: 'Attack2', wind: 0.32, recover: 0.4, reach: 34, dmg: 11, kb: 14, chainOnly: true, next: 7 },
        { clip: 'Attack3', wind: 1.15, hold: 0.5, recover: 0.7, reach: 40, dmg: 20, kb: 28 },
        { clip: 'Attack4', wind: 0.72, recover: 0.7, reach: 30, dmg: 16, kb: 24, lunge: 96, range: [56, 150], unparry: true },
        { clip: 'Special1', wind: 0.9, recover: 0.8, dmg: 20, kb: 30, aoe: 46, at: 16, unparry: true, phase: 2 },
        { sig: 'EARTHSPLITTER', clip: 'Special1', wind: 0.6, recover: 1.0, quake: { rings: 4, step: 36, dmg: 15, fx: 'rock_burst' } },
        { sig: 'CALL OF THE GATE', clip: 'Taunt', wind: 0.6, recover: 0.6, summon: { key: 'raider', n: 3 }, phase: 2 },
        { clip: 'Attack6', wind: 0.75, hold: 0.32, recover: 0.75, reach: 42, dmg: 16, kb: 24, chainOnly: true },
        { clip: 'Attack4', wind: 1.05, recover: 0.9, dmg: 22, kb: 32, aoe: 50, at: 0, leap: { h: 120 }, unparry: true, range: [90, 300] }] },
    twinA: { name: 'Hollow Twin', title: 'the Left Hand', set: 'frost_knight_a', hp: 190, spd: 64, poise: 34, boss: true, color: '#a8d8ff',
      atks: [{ clip: 'Attack1', wind: 0.42, recover: 0.5, reach: 32, dmg: 10, kb: 10 },
        { clip: 'Attack3', wind: 1.0, hold: 0.36, recover: 0.6, reach: 36, dmg: 15, kb: 22 },
        { clip: 'Attack4', wind: 0.64, recover: 0.66, reach: 28, dmg: 14, kb: 22, lunge: 100, range: [56, 150], unparry: true },
        { clip: 'Attack4', wind: 0.95, recover: 0.8, dmg: 17, kb: 26, aoe: 40, at: 0, leap: { h: 95 }, unparry: true, range: [90, 260] },
        { sig: 'ICE LANCE RAIN', clip: 'Attack5', wind: 0.6, recover: 0.9, rain: { n: 7, r: 26, spread: 70, dmg: 12, fx: 'ice_shatter', delay: 0.8, slow: 1.5 } }] },
    twinB: { name: 'Hollow Twin', title: 'the Right Hand', set: 'frost_knight_b', hp: 190, spd: 64, poise: 34, boss: true, color: '#c8e8ff',
      atks: [{ clip: 'Attack2', wind: 0.4, recover: 0.5, reach: 32, dmg: 10, kb: 10, next: 1 },
        { clip: 'Attack6', wind: 0.26, recover: 0.4, reach: 34, dmg: 10, kb: 14, chainOnly: true, next: 4 },
        { clip: 'Special1', wind: 0.86, recover: 0.8, dmg: 17, kb: 26, aoe: 42, at: 14, unparry: true },
        { sig: 'FROST BLOOM', clip: 'Special1', wind: 0.9, recover: 0.9, dmg: 14, kb: 30, aoe: 70, at: 0, unparry: true, slow: 2.5, fx: 'frost' },
        { clip: 'Attack1', wind: 0.7, hold: 0.3, recover: 0.7, reach: 36, dmg: 14, kb: 20, chainOnly: true }] },
    umbral: { name: 'The Umbral', title: 'Who Walks Behind', set: 'cassius', hp: 270, spd: 60, poise: 36, boss: true, color: '#c070ff',
      atks: [{ clip: 'Attack5', wind: 0.5, recover: 0.5, dmg: 10, kb: 12, bolt: { fx: 'arcane_orb', speed: 150 }, range: [50, 400] },
        { clip: 'Attack1', wind: 0.36, recover: 0.5, reach: 28, dmg: 10, kb: 12 },
        { clip: 'Rolling', wind: 0.3, recover: 0.25, blink: true, range: [0, 60] },
        { clip: 'Attack3', wind: 0.9, hold: 0.42, recover: 0.6, reach: 34, dmg: 16, kb: 20 },
        { clip: 'Special1', wind: 0.8, recover: 0.7, dmg: 11, kb: 14, bolt: { fx: 'arcane_orb', speed: 130, fan: 3 }, phase: 2, range: [40, 400] },
        { sig: 'SHADOW COURT', clip: 'Taunt', wind: 0.6, recover: 0.6, clones: 3 },
        { sig: 'NIGHTFALL', clip: 'Attack5', wind: 0.6, recover: 0.9, rain: { n: 9, r: 24, spread: 110, dmg: 11, fx: 'smoke_dark', delay: 0.9 }, phase: 2 }] },
    hunger: { name: 'The Hunger', title: 'It Eats the Light', set: 'nightcrawler', scale: 1.45, hp: 380, spd: 70, poise: 54, boss: true, color: '#ff6a5a',
      atks: [{ clip: 'Attack1', wind: 0.44, recover: 0.4, reach: 40, dmg: 12, kb: 12, next: 1 },
        { clip: 'Attack2', wind: 0.28, recover: 0.6, reach: 42, dmg: 12, kb: 16, chainOnly: true },
        { clip: 'Attack4', wind: 0.7, recover: 0.8, reach: 40, dmg: 20, kb: 30, lunge: 150, range: [70, 220], unparry: true },
        { clip: 'Special1', wind: 0.95, recover: 0.8, dmg: 22, kb: 30, aoe: 58, at: 18, unparry: true, phase: 2 },
        { clip: 'Attack3', wind: 1.15, hold: 0.48, recover: 0.7, reach: 44, dmg: 21, kb: 28 },
        { clip: 'Attack4', wind: 1.1, recover: 0.9, dmg: 24, kb: 34, aoe: 58, at: 0, leap: { h: 85 }, unparry: true, range: [110, 320] },
        { sig: 'BLIGHT', clip: 'Special1', wind: 0.7, recover: 0.9, rain: { n: 6, r: 30, spread: 120, dmg: 6, fx: 'poison_cloud', delay: 0.7, zone: { dur: 3.5, dps: 7 } } },
        { sig: 'DEVOUR', clip: 'Attack4', wind: 0.7, recover: 0.9, reach: 44, dmg: 26, kb: 40, lunge: 220, unparry: true, range: [60, 320], phase: 2 }] },
    wing: { name: 'The Pale Wing', title: 'Throat of the Wind', set: 'sky_beast', scale: 1.6, hp: 430, spd: 62, poise: 60, boss: true, color: '#e8f0ff',
      atks: [{ clip: 'Attack2', wind: 0.5, recover: 0.5, reach: 52, dmg: 13, kb: 18 },
        { clip: 'Attack3', wind: 1.1, hold: 0.42, recover: 0.6, reach: 54, dmg: 18, kb: 26 },
        { clip: 'Attack4', wind: 0.75, recover: 0.8, reach: 44, dmg: 20, kb: 30, lunge: 170, range: [80, 260], unparry: true },
        { clip: 'Special1', wind: 1.3, recover: 1.0, dmg: 26, kb: 36, aoe: 68, at: 0, leap: { h: 170 }, unparry: true, range: [110, 340] },
        { clip: 'Special1', wind: 1.0, recover: 0.9, dmg: 24, kb: 34, aoe: 66, at: 10, unparry: true },
        { clip: 'Attack5', wind: 0.55, recover: 0.5, dmg: 12, kb: 12, bolt: { fx: 'wind_gust', speed: 170 }, phase: 2, range: [90, 400] },
        { sig: 'GALE', clip: 'Special1', wind: 0.7, recover: 0.9, tornado: { n: 2, r: 26, dur: 5, speed: 60, dmg: 10 } },
        { sig: 'FEATHERSTORM', clip: 'Attack5', wind: 0.6, recover: 0.9, rain: { n: 10, r: 22, spread: 120, dmg: 11, fx: 'wind_gust', delay: 0.8 }, phase: 2 }] },
    firstCut: { name: 'The First Cut', title: 'Who Wounded the Moon', set: 'master_knight', hp: 560, spd: 74, poise: 70, boss: true, color: '#ffffff',
      atks: [{ clip: 'Attack1', wind: 0.4, recover: 0.4, reach: 34, dmg: 12, kb: 10, next: 1 },
        { clip: 'Attack2', wind: 0.24, recover: 0.4, reach: 34, dmg: 12, kb: 10, next: 2, chainOnly: true },
        { clip: 'Attack3', wind: 0.3, recover: 0.7, reach: 38, dmg: 16, kb: 24, chainOnly: true },
        { clip: 'Attack4', wind: 0.6, recover: 0.7, reach: 32, dmg: 18, kb: 28, lunge: 130, range: [60, 220], unparry: true },
        { clip: 'Attack6', wind: 0.75, recover: 0.6, reach: 40, dmg: 20, kb: 26 },
        { clip: 'Special1', wind: 0.9, recover: 0.9, dmg: 26, kb: 36, aoe: 64, at: 12, unparry: true, phase: 2 },
        { clip: 'Attack5', wind: 0.5, recover: 0.5, dmg: 14, kb: 14, bolt: { fx: 'dark_slash', speed: 210 }, phase: 2, range: [80, 400] },
        { sig: 'CRESCENT', clip: 'Attack6', wind: 0.6, recover: 0.8, dmg: 18, kb: 20, bolt: { fx: 'dark_slash', speed: 240, fan: 5, big: true }, unparry: true, range: [0, 400] },
        { sig: 'MOONFALL', clip: 'Special1', wind: 0.7, recover: 1.0, rain: { n: 12, r: 28, spread: 140, dmg: 16, fx: 'blast', delay: 0.9 }, phase: 2 },
        { sig: 'MIRROR OF THE FIRST', clip: 'Taunt', wind: 0.6, recover: 0.6, clones: 2, phase: 2 }] },
  };

  // ---- Looks: each army foe spawns in one of these looks (the whole random cast has a place) ----
  const V = (pre, nums) => nums.map((n) => `vh_${pre}_${String(n).padStart(3, '0')}`);
  D.VARIANTS = {
    sunguard: ['vh_sand_guard', 'vh_sand_warden'], dunereaver: ['vh_sand_horn', 'vh_sand_nomad'], risen: ['vh_iso_ghoul'],
    reaver: V('barbarian', [2, 1, 3, 4, 5, 6, 7]), ravager: V('barbarian', [13, 9, 10, 11, 12, 14, 15]), chieftain: V('barbarian', [8, 17]),
    hound: V('beastfolk', [3, 2, 4, 8, 9]), harpy: V('beastfolk', [5, 6]), ram: V('beastfolk', [7, 10]),
    duelist: V('duelist', [8, 1, 2, 3, 4, 5, 6]).concat(['vh_iso_rover']), woundblade: V('duelist', [12, 9, 10, 11, 13, 14]),
    gateguard: V('knight', [3, 1, 2, 5, 6]), cloisterknight: V('knight', [4, 7, 9, 10, 12, 13]), woundknight: V('knight', [14, 8, 11, 15]),
    acolyte: V('mage', [9, 2, 8, 17, 18, 19, 24]).concat(['vh_iso_cultist']), seer: V('mage', [17, 5, 11, 15, 21, 22]), cinder: V('mage', [1, 3, 4, 10, 16, 23]), blight: V('mage', [6, 12, 13, 14]),
    windmonk: V('monk', [2, 4]), stormfist: V('monk', [3, 5]), paladin: V('paladin', [7, 1, 2, 3, 4, 5]),
    ranger: V('ranger', [13, 1, 2, 3, 4, 5, 7, 8, 9]), sniper: V('ranger', [6, 10, 11, 12, 14, 15, 17]),
    cutthroat: V('rogue', [2, 1, 3, 4, 5, 6, 7, 8]), stalker: V('rogue', [9, 10, 11, 12, 13, 14, 15]),
    bulwark: V('skeleton', [2, 4, 9]).concat(['vh_iso_knight']), shadowbulwark: V('skeleton', [15, 12, 16]).concat(['vh_iso_knight']), pikeman: V('skeleton', [1, 5, 8, 11, 14, 17]), boneguard: V('skeleton', [3, 6, 10, 13, 18]),
    frostpike: V('spearman', [14, 3, 6, 7, 16, 17]), ridgepike: V('spearman', [8, 9, 10, 11, 12, 13, 15, 18, 19]), gatespear: V('spearman', [1, 2, 4, 5]),
    thrall: V('townsfolk', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]).concat(['vh_iso_folk1', 'vh_iso_folk2', 'vh_iso_folk3']),
    warlock: V('warlock', [5, 4, 9, 10, 12]).concat(['vh_iso_cultist']), ashlock: V('warlock', [2, 1, 8, 11]), bloodlock: V('warlock', [3, 7]),
    wraith: V('wraith', [4, 6, 7]), shade: V('wraith', [1, 9, 10, 11]), redwraith: V('wraith', [3, 5, 8]),
  };

  // ---- Stages: the six hours of the night ---------------------------------------------
  // look: sky colours, moon size and colour, ground tiles, silhouettes behind the arena.
  D.STAGES = [
    { id: 'gate', arenas: ['court', 'bridge', 'ring'], portal: 'gate', scale: { hp: 1, dmg: 1 }, hour: 'DUSK', name: 'The Black Gate', boss: 'warden',
      waves: [['raider', 'ghoul', 'raider', 'ghoul', '+', 'ghoul', 'raider', 'ghast'], ['ghoul', 'archer', 'ghast', 'archer', 'raider', '+', 'raider', 'ghoul', 'spearman', 'ghoul']], bossWave: ['warden', '+', 'raider', 'raider', 'ghoul'],
      look: { sky: ['#140d1c', '#3a1622', '#6a2a2a'], moon: 22, moonCol: '#e8a0a0', fog: '#3a1a24' } },
    { id: 'cloister', arenas: ['cross', 'court', 'pit'], portal: 'gate', scale: { hp: 1.1, dmg: 1.1 }, hour: 'THE FIRST HOUR', name: 'Cloister of Frost', boss: 'twins',
      waves: [['knife', 'spearman', 'knife', 'archer', 'raider', '+', 'knife', 'knife', 'hexer', 'spearman'], ['hexer', 'raider', 'spearman', 'raider', 'archer', '+', 'golem', 'knife', 'knife']], bossWave: ['twinA', 'twinB', '+', 'knife', 'knife', 'spearman'],
      look: { sky: ['#0a1020', '#18283c', '#30485c'], moon: 26, moonCol: '#f0b0b0', fog: '#1a2a3a', snow: true } },
    { id: 'stair', arenas: ['bridge', 'cross', 'ring'], portal: 'stairs', scale: { hp: 1.25, dmg: 1.25 }, hour: 'THE SECOND HOUR', name: 'The Umbral Stair', boss: 'umbral',
      waves: [['bone', 'poacher', 'raider', 'bone', '+', 'knife', 'knife', 'poacher', 'archer', 'raider'], ['golem', 'archer', 'hexer', 'raider', '+', 'bone', 'bone', 'spearman', 'hexer']], bossWave: ['umbral', '+', 'knife', 'knife', 'hexer', 'knife'],
      look: { sky: ['#0c0814', '#221430', '#3a1c40'], moon: 30, moonCol: '#ff8a8a', fog: '#2a1430' } },
    { id: 'waste', arenas: ['court', 'pit', 'ring'], portal: 'rift', scale: { hp: 1.3, dmg: 1.25 }, hour: 'THE THIRD HOUR', name: 'The Ashen Waste', boss: 'hunger',
      waves: [['pyre', 'ghast', 'raider', 'pyre', 'ghoul', '+', 'bone', 'golem', 'ghast', 'ghoul', 'ghoul'], ['golem', 'hexer', 'bone', 'raider', '+', 'pyre', 'pyre', 'archer', 'spearman', 'bone']], bossWave: ['hunger', '+', 'ghoul', 'ghoul', 'ghast', 'ghoul'],
      look: { sky: ['#0e0c10', '#24202a', '#4a3a40'], moon: 34, moonCol: '#ff6060', fog: '#2a2228', ash: true } },
    { id: 'throat', arenas: ['bridge', 'cross', 'pit'], portal: 'rift', scale: { hp: 1.35, dmg: 1.3 }, hour: 'THE FOURTH HOUR', name: "The Wind's Throat", boss: 'wing',
      waves: [['poacher', 'knife', 'spearman', 'poacher', 'archer', '+', 'knife', 'knife', 'bone', 'golem'], ['golem', 'pyre', 'archer', 'bone', 'spearman', '+', 'hexer', 'poacher', 'raider', 'raider', 'archer']], bossWave: ['wing', '+', 'archer', 'archer', 'poacher'],
      look: { sky: ['#06080e', '#141c2c', '#2c3448'], moon: 40, moonCol: '#ff4a50', fog: '#1a2030', wind: true } },
    { id: 'shadow', arenas: ['bridge', 'ring'], portal: 'stairs', scale: { hp: 1.2, dmg: 1.25 }, hour: 'THE LAST HOUR', name: "The Moon's Shadow", boss: 'firstCut',
      waves: [['golem', 'hexer', 'pyre', 'spearman', 'archer', '+', 'golem', 'knife', 'knife', 'bone', 'hexer', '+', 'pyre', 'archer', 'spearman', 'raider']], bossWave: ['firstCut', '+', 'golem', 'hexer', 'knife', 'knife'],
      look: { sky: ['#040306', '#0e0610', '#200a14'], moon: 58, moonCol: '#ff2a44', fog: '#200810', embers: true } },
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
