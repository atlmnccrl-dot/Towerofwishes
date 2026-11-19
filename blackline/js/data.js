// BLACKLINE — unit, weapon and support tables. Pure data.
// Distances are world units (about 5 per metre); times are seconds.
(function (root) {
  const BL = root.BL || (root.BL = {});

  // Damage multiplier by weapon class (rows) against armour class (columns).
  const ARMOR = {
    small:  { inf: 1.0, light: 0.12, heavy: 0.02, air: 0.22 },
    cannon: { inf: 1.0, light: 0.85, heavy: 0.22, air: 1.1 },
    rocket: { inf: 1.0, light: 1.0,  heavy: 0.8,  air: 0.9 },
    shell:  { inf: 1.0, light: 1.15, heavy: 1.0,  air: 0.5 },
    arty:   { inf: 1.0, light: 0.7,  heavy: 0.4,  air: 0.0 },
  };

  // proj: bullet (straight, fast), rocket (slow, trail), shell (fast, slight arc).
  // burst: shots per trigger; gap: seconds between burst shots; cd: seconds between triggers.
  // acc: hit chance at point blank; it falls to acc*0.45 at max range.
  // vsAir: can it aim at aircraft. splash: radius of an explosion (0 = none).
  const WEAPONS = {
    rifle:  { name: 'rifle', cls: 'small', proj: 'bullet', range: 300, dmg: 10, burst: [1, 3], gap: 0.13, cd: [0.9, 1.6], acc: 0.42, supp: 6, speed: 1100, vsAir: true },
    mg:     { name: 'machine gun', cls: 'small', proj: 'bullet', range: 400, dmg: 7, burst: [6, 10], gap: 0.07, cd: [0.8, 1.2], acc: 0.3, supp: 14, speed: 1150, setup: 1.4, vsAir: true },
    dmr:    { name: 'marksman rifle', cls: 'small', proj: 'bullet', range: 390, dmg: 24, burst: [1, 1], gap: 0, cd: [2.0, 2.6], acc: 0.72, supp: 9, speed: 1300, vsAir: true },
    at:     { name: 'AT rocket', cls: 'rocket', proj: 'rocket', range: 270, dmg: 150, burst: [1, 1], gap: 0, cd: [8, 10], acc: 0.62, supp: 30, speed: 380, splash: 22, splashDmg: 34, vsAir: true, airAcc: 0.3, prefers: 'veh' },
    cannon: { name: 'autocannon', cls: 'cannon', proj: 'bullet', range: 390, dmg: 15, burst: [3, 4], gap: 0.18, cd: [1.1, 1.5], acc: 0.5, supp: 18, speed: 1000, splash: 9, splashDmg: 8, vsAir: true },
    gun:    { name: 'main gun', cls: 'shell', proj: 'shell', range: 540, dmg: 260, burst: [1, 1], gap: 0, cd: [4.2, 5.0], acc: 0.7, supp: 40, speed: 950, splash: 34, splashDmg: 62, vsAir: false, prefers: 'veh' },
    coax:   { name: 'coaxial MG', cls: 'small', proj: 'bullet', range: 360, dmg: 7, burst: [5, 8], gap: 0.075, cd: [1.0, 1.5], acc: 0.3, supp: 12, speed: 1150, vsAir: true },
    hrocket:{ name: 'rocket pods', cls: 'rocket', proj: 'rocket', range: 430, dmg: 90, burst: [4, 4], gap: 0.16, cd: [7, 8.5], acc: 0.55, supp: 34, speed: 520, splash: 26, splashDmg: 44, vsAir: false },
    chin:   { name: 'chin gun', cls: 'small', proj: 'bullet', range: 390, dmg: 10, burst: [7, 10], gap: 0.06, cd: [1.0, 1.4], acc: 0.32, supp: 14, speed: 1150, vsAir: true },
  };

  // Units. kind: inf (squad of soldiers), veh (ground vehicle), air (helicopter).
  // load: weapons of each soldier (inf) or mounted weapons (veh/air).
  const UNITS = {
    rifle: {
      kind: 'inf', name: 'RIFLE SQUAD', short: 'RIFLE', cost: 100, cd: 5, hp: 40, speed: 26,
      sight: 380, armor: 'inf', load: ['rifle', 'rifle', 'rifle', 'rifle', 'rifle', 'at'], tickets: 2,
      blurb: 'All-rounder. Carries one AT rocket.',
    },
    mg: {
      kind: 'inf', name: 'MACHINE-GUN TEAM', short: 'MG', cost: 140, cd: 7, hp: 40, speed: 21,
      sight: 400, armor: 'inf', load: ['mg', 'rifle', 'rifle', 'rifle'], tickets: 2,
      blurb: 'Pins infantry. Must set up to fire.',
    },
    scout: {
      kind: 'inf', name: 'SCOUT TEAM', short: 'SCOUT', cost: 80, cd: 4, hp: 34, speed: 36,
      sight: 600, armor: 'inf', load: ['dmr', 'dmr', 'rifle'], tickets: 2,
      blurb: 'Fast, sees far, accurate. Fragile.',
    },
    apc: {
      kind: 'veh', name: 'ARMORED CARRIER', short: 'APC', cost: 260, cd: 16, hp: 430, speed: 54,
      sight: 420, armor: 'light', load: ['cannon'], tickets: 18, len: 38, hgt: 15,
      blurb: 'Fast autocannon. Kills infantry and aircraft.',
    },
    tank: {
      kind: 'veh', name: 'BATTLE TANK', short: 'TANK', cost: 420, cd: 28, hp: 950, speed: 32,
      sight: 460, armor: 'heavy', load: ['gun', 'coax'], tickets: 30, len: 48, hgt: 17,
      blurb: 'Heavy armour and gun. Slow. Cannot hit aircraft.',
    },
    heli: {
      kind: 'air', name: 'ATTACK HELICOPTER', short: 'HELI', cost: 480, cd: 40, hp: 540, speed: 95,
      sight: 520, armor: 'air', load: ['hrocket', 'chin'], tickets: 30, len: 66, hgt: 16,
      blurb: 'Rockets and gun from the air.',
    },
  };

  // Support calls: they cost RP but are not units.
  const SUPPORT = {
    arty:   { name: 'ARTILLERY', short: 'ARTY', cost: 220, cd: 45, shells: 6, spread: 120, delay: 3.2, dmg: 95, radius: 44, blurb: 'Six shells after a warning. Hits friends too.' },
    insert: { name: 'AIR INSERTION', short: 'DROP', cost: 180, cd: 35, unit: 'rifle', blurb: 'A rifle squad by rope, anywhere you can see.' },
  };

  const RULES = {
    startRP: 350,
    baseIncome: 3,
    sectorIncome: 2.5,
    tickets: 400,
    drainPerSector: 0.9,     // tickets per second per sector of advantage
    popCap: 10,
    captureRadius: 115,
    sightTick: 0.2,
    baseHealRadius: 110,
  };

  BL.ARMOR = ARMOR;
  BL.WEAPONS = WEAPONS;
  BL.UNITS = UNITS;
  BL.SUPPORT = SUPPORT;
  BL.RULES = RULES;
  BL.DEPLOY_ORDER = ['rifle', 'mg', 'scout', 'apc', 'tank', 'heli', 'arty', 'insert'];
})(typeof window !== 'undefined' ? window : globalThis);
