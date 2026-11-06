// EMBERFALL — the cast, the foes, the loot and the talents. Pure data; runs in Node.
(function (root) {
  const EF = root.EF = root.EF || {};
  const D = EF.DATA = {}; D.TUNE = { hp: 1, atk: 1 };

  // ---- Heroes -------------------------------------------------------------------------
  // combo: the light attack clips in order; heavy: the charged blow; special: the signature art.
  // kind: 'melee' | 'ranged' (light attacks fire a bolt). reach in px, arc in radians.
  D.HEROES = {
    rook: { id: 'rook', name: 'Rook Vane', title: 'the Unburied', set: 'kael_sword', sceneSet: 'kael_unarmed', color: '#f0c060',
      hp: 150, atk: 15, def: 4, spd: 96, kind: 'melee', reach: 36, arc: 1.9,
      combo: ['Attack1', 'Attack2', 'Attack3'], heavy: 'Attack4', stance: 'Idle4',
      special: { name: 'Grave Cleave', clip: 'Special1', cd: 9, desc: 'A spinning cut that hits everything around him for 3x damage and breaks poise.' },
      bio: 'A gravedigger\'s son who died in the first raid on Crowsmoor and stood back up with a dead Ember burning in his chest.' },
    ysolde: { id: 'ysolde', name: 'Ysolde Marr', title: 'the Cinder Witch', set: 'eiryn', color: '#ff7a3c',
      hp: 100, atk: 17, def: 2, spd: 88, kind: 'ranged', reach: 170, arc: 0.4, bolt: 'fireball', boltSpeed: 260, element: 'burn',
      combo: ['Attack5', 'Attack5', 'Attack3'], heavy: 'Attack6', stance: 'Idle4',
      special: { name: 'Cinder Bloom', clip: 'Special1', cd: 11, desc: 'A great fireball that bursts on the nearest foe, burning everything in the blast.' },
      bio: 'Burned out of the Cinder College for asking what the sun used to feel like. She means to find out.' },
    brannoc: { id: 'brannoc', name: 'Old Brannoc', title: 'the Anvil', set: 'braxen', color: '#9fc8ff',
      hp: 240, atk: 20, def: 8, spd: 72, kind: 'melee', reach: 40, arc: 2.2, scale: 1.1,
      combo: ['Attack1', 'Attack2'], heavy: 'Attack4', stance: 'Idle4',
      special: { name: 'Anvil Drop', clip: 'Attack4', cd: 12, desc: 'A leaping slam. A shockwave knocks every foe nearby flat and shatters their poise.' },
      bio: 'The last smith of Frosthold. His whole town is ice now; he kept the hammer warm.' },
    tamsin: { id: 'tamsin', name: 'Tamsin Crow', title: 'the Stormlance', set: 'aerys_spear', color: '#8ef0ff',
      hp: 130, atk: 16, def: 4, spd: 104, kind: 'melee', reach: 46, arc: 1.2, element: 'shock',
      combo: ['Attack1', 'Attack2', 'Attack6'], heavy: 'Attack3', stance: 'Idle4',
      special: { name: 'Stormlance', clip: 'Attack4', cd: 10, desc: 'A lightning dash straight through the line. Everything she passes is shocked and stunned.' },
      bio: 'Captain of the last sky-raider crew. Her ship is wreckage on the Skyreach; her spear still hums.' },
    mouse: { id: 'mouse', name: 'Mouse', title: 'the Knife in the Dark', set: 'nox', color: '#c9a0ff',
      hp: 110, atk: 13, def: 2, spd: 118, kind: 'melee', reach: 30, arc: 1.6, crit: 0.25,
      combo: ['Attack1', 'Attack2', 'Attack6'], heavy: 'Special1', stance: 'Idle4',
      special: { name: 'Shadow Step', clip: 'Attack6', cd: 8, desc: 'Vanishes and reappears behind the weakest foe for a storm of stabs that always crit.' },
      bio: 'A thief with no past and a laugh like a broken bell. The Embers hum when Mouse is near; nobody has asked why.' },
    wren: { id: 'wren', name: 'Sister Wren', title: 'of the Drowned Church', set: 'eloryn', color: '#a0ffd0',
      hp: 120, atk: 12, def: 3, spd: 86, kind: 'ranged', reach: 150, arc: 0.4, bolt: 'holy_light', boltSpeed: 240, element: 'holy',
      combo: ['Attack5', 'Attack5', 'Attack3'], heavy: 'Attack3', stance: 'Idle4',
      special: { name: 'Tidewater', clip: 'Attack3', cd: 14, desc: 'A rising tide of light heals the whole party and scours every foe it touches.' },
      bio: 'She sang the Drowned Bell to sleep once. It remembers her.' },
  };
  D.HERO_ORDER = ['rook', 'ysolde', 'brannoc', 'tamsin', 'mouse', 'wren'];

  // Growth per level.
  D.levelStats = function (hero, level) {
    const h = D.HEROES[hero]; const l = Math.max(1, level) - 1;
    return { hp: Math.round(h.hp * (1 + 0.12 * l)), atk: Math.round(h.atk * (1 + 0.1 * l)), def: h.def + Math.floor(l * 0.6), spd: h.spd };
  };
  D.xpForLevel = level => Math.round(80 * Math.pow(1.35, level - 1));

  // ---- Talents: three per hero, three ranks each --------------------------------------
  D.TALENTS = {
    rook: [
      { id: 'ironwill', name: 'Iron Will', desc: '+12% health per rank.', icon: [2, 3, 1] },
      { id: 'executioner', name: 'Executioner', desc: '+25% damage per rank against broken foes.', icon: [2, 0, 1] },
      { id: 'secondwind', name: 'Second Wind', desc: 'Heal 6% per rank on every kill.', icon: [2, 0, 0] }],
    ysolde: [
      { id: 'kindling', name: 'Kindling', desc: 'Burns last 1s longer and deal +20% per rank.', icon: [2, 5, 2] },
      { id: 'pyre', name: 'Pyre', desc: 'Cinder Bloom blast +20% radius per rank.', icon: [2, 3, 3] },
      { id: 'ashwalk', name: 'Ashwalk', desc: 'Dodge leaves burning ground, 1 rank per cloud.', icon: [2, 6, 1] }],
    brannoc: [
      { id: 'bulwark', name: 'Bulwark', desc: '+2 defence per rank.', icon: [2, 3, 1] },
      { id: 'quake', name: 'Quake', desc: 'Anvil Drop +25% radius per rank.', icon: [2, 2, 3] },
      { id: 'taunt', name: 'Loud Old Man', desc: 'Foes prefer him: +40% threat per rank.', icon: [2, 4, 1] }],
    tamsin: [
      { id: 'conductor', name: 'Conductor', desc: 'Shock deals +30% poise damage per rank.', icon: [2, 7, 2] },
      { id: 'windstep', name: 'Windstep', desc: '+6% speed per rank.', icon: [2, 1, 3] },
      { id: 'overcharge', name: 'Overcharge', desc: 'Stormlance cooldown -1.5s per rank.', icon: [2, 2, 3] }],
    mouse: [
      { id: 'cutpurse', name: 'Cutpurse', desc: '+15% gold per rank.', icon: [2, 3, 0] },
      { id: 'backstab', name: 'Backstab', desc: '+8% crit chance per rank.', icon: [2, 0, 1] },
      { id: 'ghost', name: 'Ghost', desc: 'Dodge window +0.1s per rank.', icon: [2, 1, 7] }],
    wren: [
      { id: 'mercy', name: 'Mercy', desc: 'Tidewater heals +15% per rank.', icon: [2, 0, 0] },
      { id: 'litany', name: 'Litany', desc: 'Holy bolts +20% damage per rank.', icon: [2, 2, 2] },
      { id: 'vigil', name: 'Vigil', desc: 'Allies near her regain 1 hp/s per rank.', icon: [2, 2, 1] }],
  };

  // ---- Items (icon = [sheet, col, row]) ------------------------------------------------
  D.ITEMS = {
    // weapons: atk
    w_rust: { id: 'w_rust', name: 'Rusted Blade', slot: 'weapon', atk: 2, price: 40, icon: [2, 1, 1], desc: 'It cuts. Mostly.' },
    w_ash: { id: 'w_ash', name: 'Ashroad Sabre', slot: 'weapon', atk: 5, price: 140, icon: [2, 0, 1], desc: 'Taken from a bandit who took it from a knight.' },
    w_frost: { id: 'w_frost', name: 'Frostbrand', slot: 'weapon', atk: 8, element: 'frost', price: 320, icon: [2, 6, 2], desc: 'Hits slow the struck.' },
    w_storm: { id: 'w_storm', name: 'Stormpike', slot: 'weapon', atk: 10, element: 'shock', price: 520, icon: [2, 7, 1], desc: 'Hits shock the struck.' },
    w_sun: { id: 'w_sun', name: 'Sunshard Edge', slot: 'weapon', atk: 14, element: 'burn', price: 900, icon: [2, 1, 3], desc: 'A sliver of the broken sun, honed.' },
    w_king: { id: 'w_king', name: 'Kingsbane', slot: 'weapon', atk: 20, price: 1600, icon: [2, 0, 1], desc: 'Forged for one neck.' },
    // armour: hp, def
    a_leather: { id: 'a_leather', name: 'Gravedigger\'s Coat', slot: 'armor', hp: 20, def: 1, price: 50, icon: [2, 5, 1], desc: 'Smells of soil.' },
    a_mail: { id: 'a_mail', name: 'Raider Mail', slot: 'armor', hp: 45, def: 3, price: 180, icon: [2, 3, 1], desc: 'Dented in all the places that matter.' },
    a_frost: { id: 'a_frost', name: 'Frosthold Plate', slot: 'armor', hp: 80, def: 5, price: 420, icon: [2, 4, 1], desc: 'Cold to the touch, warm within.' },
    a_court: { id: 'a_court', name: 'Courtier\'s Harness', slot: 'armor', hp: 120, def: 8, price: 800, icon: [2, 3, 1], desc: 'Black lacquer, gold thread, old blood.' },
    a_dawn: { id: 'a_dawn', name: 'Dawnplate', slot: 'armor', hp: 180, def: 12, price: 1500, icon: [2, 4, 1], desc: 'It glows faintly in the dark.' },
    // trinkets
    t_ring: { id: 't_ring', name: 'Ember Ring', slot: 'trinket', surge: 0.3, price: 200, icon: [2, 7, 7], desc: 'Ember Surge charges 30% faster.' },
    t_hourglass: { id: 't_hourglass', name: 'Cracked Hourglass', slot: 'trinket', cdr: 0.2, price: 260, icon: [2, 2, 7], desc: 'Specials recharge 20% faster.' },
    t_fang: { id: 't_fang', name: 'Wyrm Fang', slot: 'trinket', crit: 0.15, price: 300, icon: [2, 4, 7], desc: '+15% critical chance.' },
    t_heart: { id: 't_heart', name: 'Drowned Heart', slot: 'trinket', lifesteal: 0.08, price: 340, icon: [2, 0, 0], desc: 'Heal 8% of damage dealt.' },
    t_crown: { id: 't_crown', name: 'Hollow Crown', slot: 'trinket', atkMul: 0.15, surge: 0.15, price: 1200, icon: [2, 6, 7], desc: '+15% damage, Surge charges 15% faster.' },
    // consumables
    c_potion: { id: 'c_potion', name: 'Ember Draught', slot: 'use', heal: 0.4, price: 30, icon: [2, 0, 2], desc: 'Heals 40% of the host\'s health. Press E in a fight.' },
  };
  D.ITEM_ORDER = Object.keys(D.ITEMS);

  // ---- Foes ---------------------------------------------------------------------------
  // ai: 'melee' | 'ranged' | 'caster' | 'brute' | 'boss'. attacks: [{clip, mul, reach, arc, poise, tele (telegraph s), fx, aoe}]
  const melee = (clip, mul, reach, tele, fx) => ({ clip, mul: mul || 1, reach: reach || 32, arc: 1.6, tele: tele || 0.45, fx: fx || 'hit_slash' });
  D.FOES = {
    risen: { name: 'Risen Raider', set: 'goblin', hp: 55, atk: 9, spd: 78, ai: 'melee', attacks: [melee('Attack1', 1, 30, 0.4), melee('Attack2', 1.2, 30, 0.5)], xp: 14, gold: 6, poise: 30 },
    risen_spear: { name: 'Risen Pikeman', set: 'goblin_spear', hp: 65, atk: 11, spd: 74, ai: 'melee', attacks: [melee('Attack1', 1.3, 44, 0.55, 'thrust')], xp: 18, gold: 8, poise: 36 },
    risen_archer: { name: 'Risen Archer', set: 'goblin_archer', hp: 45, atk: 10, spd: 80, ai: 'ranged', bolt: 'arrow', boltSpeed: 300, attacks: [{ clip: 'Attack5', mul: 1, reach: 200, tele: 0.7, fx: 'hit_pierce' }], xp: 18, gold: 8, poise: 24 },
    risen_hexer: { name: 'Risen Hexer', set: 'goblin_hexer', hp: 50, atk: 13, spd: 70, ai: 'caster', bolt: 'dark_curse', boltSpeed: 200, attacks: [{ clip: 'Attack5', mul: 1.4, reach: 180, tele: 0.9, fx: 'hit_poison', element: 'frost' }], xp: 24, gold: 12, poise: 24 },
    grum: { name: 'Grum, Warlord of the Risen', set: 'ogre', scale: 1.8, hp: 300, atk: 11, spd: 62, ai: 'boss', poise: 220, boss: true, xp: 300, gold: 150,
      attacks: [melee('Attack1', 1.2, 54, 0.6, 'hit_blunt'), melee('Attack2', 1.4, 54, 0.7, 'hit_blunt'), { clip: 'Attack4', mul: 2.2, reach: 90, arc: 7, tele: 1.1, fx: 'shockwave', aoe: true, poise: 2 }],
      phases: [{ at: 0.5, summon: ['risen', 'risen', 'risen_archer'], say: 'MORE. BRING ME MORE.' }] },
    cutthroat: { name: 'Ashroad Cutthroat', set: 'bandit_knife', hp: 70, atk: 11, spd: 96, ai: 'melee', attacks: [melee('Attack1', 1, 28, 0.35), melee('Attack2', 1, 28, 0.35)], xp: 20, gold: 14, poise: 30 },
    bruiser: { name: 'Ashroad Bruiser', set: 'bandit_broad', scale: 1.15, hp: 140, atk: 15, spd: 70, ai: 'brute', attacks: [melee('Attack5', 1.5, 36, 0.7, 'hit_blunt'), melee('Attack4', 2, 50, 0.9, 'hit_big')], xp: 32, gold: 20, poise: 70 },
    grabber: { name: 'Ashroad Grabber', set: 'bandit_grabber', hp: 85, atk: 12, spd: 92, ai: 'melee', attacks: [melee('Attack5', 1.2, 30, 0.5, 'hit_punch')], xp: 22, gold: 15, poise: 34 },
    lookout: { name: 'Ashroad Lookout', set: 'bandit_lookout', hp: 60, atk: 10, spd: 100, ai: 'ranged', bolt: 'dagger', boltSpeed: 320, attacks: [{ clip: 'Attack5', mul: 1, reach: 170, tele: 0.6, fx: 'hit_pierce' }], xp: 20, gold: 14, poise: 26 },
    mara: { name: 'Red Mara, Queen of the Ashroad', set: 'spearwoman', scale: 1.25, hp: 1100, atk: 24, spd: 104, ai: 'boss', poise: 180, boss: true, xp: 420, gold: 260,
      attacks: [melee('Attack1', 1.2, 48, 0.4, 'thrust'), melee('Attack2', 1.3, 48, 0.45, 'thrust'), { clip: 'Attack4', mul: 2.4, reach: 70, arc: 7, tele: 0.9, fx: 'spin_slash', aoe: true, poise: 1.5 }, { clip: 'Attack6', mul: 1.8, reach: 160, tele: 0.8, fx: 'thrust', dash: true }],
      phases: [{ at: 0.6, summon: ['cutthroat', 'cutthroat'], say: 'Earn your cut, dogs!' }, { at: 0.25, enrage: 1.3, say: 'Fine. FINE. I\'ll do it myself.' }] },
    frostknight: { name: 'Hollow Knight of Frosthold', set: 'frost_knight_a', hp: 150, atk: 16, spd: 76, ai: 'melee', element: 'frost', attacks: [melee('Attack1', 1.1, 36, 0.5, 'hit_ice'), melee('Attack2', 1.3, 36, 0.6, 'hit_ice')], xp: 40, gold: 24, poise: 80 },
    frostguard: { name: 'Hollow Shieldbearer', set: 'frost_knight_b', scale: 1.1, hp: 220, atk: 14, spd: 66, ai: 'brute', element: 'frost', attacks: [melee('Attack1', 1.2, 38, 0.6, 'hit_ice'), melee('Attack4', 1.8, 60, 0.9, 'hit_ice')], xp: 50, gold: 30, poise: 120 },
    frostblade: { name: 'Rime Assassin', set: 'frost_assassin', hp: 95, atk: 15, spd: 118, ai: 'melee', element: 'frost', attacks: [melee('Attack1', 1, 30, 0.3, 'hit_ice'), melee('Attack6', 1.4, 30, 0.35, 'hit_ice')], xp: 38, gold: 26, poise: 30 },
    caedmon: { name: 'Caedmon, the Frost Lord', set: 'frost_knight_b', scale: 1.55, hp: 1600, atk: 28, spd: 74, ai: 'boss', element: 'frost', poise: 300, boss: true, xp: 600, gold: 380,
      attacks: [melee('Attack1', 1.3, 56, 0.6, 'hit_ice'), melee('Attack2', 1.4, 56, 0.6, 'hit_ice'), { clip: 'Attack4', mul: 2.5, reach: 110, arc: 7, tele: 1.2, fx: 'frost_nova', aoe: true, poise: 2, element: 'frost' }, { clip: 'Attack5', mul: 1.6, reach: 220, tele: 0.8, fx: 'hit_ice', bolt: 'ice_shard', boltSpeed: 280, element: 'frost' }],
      phases: [{ at: 0.66, summon: ['frostblade', 'frostblade'], say: 'Kneel. The cold is kinder than I am.' }, { at: 0.33, summon: ['frostknight'], enrage: 1.25, say: 'Then freeze STANDING.' }] },
    cliffhound: { name: 'Cliff Hound', set: 'hamlet_predator', scale: 1.2, hp: 110, atk: 20, spd: 124, ai: 'melee', attacks: [melee('Attack1', 1.1, 32, 0.3, 'claw'), melee('Attack2', 1.2, 32, 0.35, 'claw')], xp: 44, gold: 22, poise: 40 },
    harpy: { name: 'Ridge Harpy', set: 'beastfolk_f', hp: 95, atk: 18, spd: 112, ai: 'ranged', bolt: 'wind_gust', boltSpeed: 280, attacks: [{ clip: 'Attack5', mul: 1.1, reach: 190, tele: 0.6, fx: 'hit_slash' }], xp: 42, gold: 24, poise: 30 },
    skyreaver: { name: 'The Skyreaver', set: 'sky_beast', scale: 2.1, hp: 2300, atk: 32, spd: 110, ai: 'boss', poise: 320, boss: true, xp: 800, gold: 480,
      attacks: [melee('Attack1', 1.4, 70, 0.5, 'claw'), melee('Attack2', 1.5, 70, 0.5, 'claw'), { clip: 'Attack4', mul: 2.6, reach: 120, arc: 7, tele: 1.1, fx: 'dust_land', aoe: true, poise: 2 }, { clip: 'Attack6', mul: 2, reach: 220, tele: 0.7, fx: 'claw', dash: true }],
      phases: [{ at: 0.7, summon: ['cliffhound', 'cliffhound'], say: '(a scream splits the cliffs)' }, { at: 0.4, summon: ['harpy', 'harpy'], enrage: 1.2, say: '(the whole ridge answers it)' }] },
    drowned: { name: 'The Drowned', set: 'caged_creature', hp: 130, atk: 20, spd: 70, ai: 'melee', attacks: [melee('Attack1', 1.2, 30, 0.5, 'water_splash'), melee('Attack5', 1.3, 30, 0.6, 'hit_blunt')], xp: 48, gold: 26, poise: 60 },
    bellringer: { name: 'Bellringer', set: 'hooded_follower', hp: 100, atk: 22, spd: 80, ai: 'caster', bolt: 'arcane_orb', boltSpeed: 220, attacks: [{ clip: 'Attack5', mul: 1.5, reach: 180, tele: 0.9, fx: 'hit_shock', element: 'shock' }], xp: 50, gold: 30, poise: 30 },
    bell: { name: 'The Drowned Bell', set: 'drowned_bell', scale: 1.9, hp: 3000, atk: 34, spd: 58, ai: 'boss', poise: 400, boss: true, xp: 1100, gold: 600,
      attacks: [melee('Attack1', 1.5, 64, 0.7, 'water_splash'), { clip: 'Attack4', mul: 2.8, reach: 140, arc: 7, tele: 1.4, fx: 'shockwave', aoe: true, poise: 2.5 }, { clip: 'Attack5', mul: 1.8, reach: 240, tele: 0.9, fx: 'hit_shock', bolt: 'energy_bolt', boltSpeed: 240, element: 'shock' }],
      phases: [{ at: 0.75, summon: ['drowned', 'drowned'], say: '(the Bell tolls once; the water rises)' }, { at: 0.5, summon: ['bellringer', 'drowned'], say: '(twice)' }, { at: 0.25, enrage: 1.35, say: '(three times, and the dead come up singing)' }] },
    thornbound: { name: 'Thornbound', set: 'labyrinth_citizen', hp: 140, atk: 22, spd: 84, ai: 'melee', attacks: [melee('Attack1', 1.1, 32, 0.45), melee('Attack2', 1.2, 32, 0.5)], xp: 52, gold: 30, poise: 50 },
    sentinel: { name: 'Thorn Sentinel', set: 'golem_a', scale: 1.3, hp: 320, atk: 26, spd: 60, ai: 'brute', attacks: [melee('Attack1', 1.5, 48, 0.8, 'hit_blunt'), melee('Attack4', 2.2, 70, 1, 'rock_burst')], xp: 90, gold: 50, poise: 160 },
    golem_king: { name: 'The Gardener', set: 'golem_b', scale: 1.7, hp: 2600, atk: 30, spd: 64, ai: 'boss', poise: 500, boss: true, xp: 1300, gold: 700,
      attacks: [melee('Attack1', 1.6, 70, 0.8, 'hit_blunt'), melee('Attack2', 1.7, 70, 0.8, 'hit_blunt'), { clip: 'Attack4', mul: 3, reach: 150, arc: 7, tele: 1.5, fx: 'rock_burst', aoe: true, poise: 3 }],
      phases: [{ at: 0.66, summon: ['sentinel'], say: '(the hedges move)' }, { at: 0.33, summon: ['thornbound', 'thornbound', 'thornbound'], enrage: 1.3, say: '(roots burst from the floor)' }] },
    crawler: { name: 'Nightcrawler', set: 'nightcrawler', scale: 1.3, hp: 180, atk: 22, spd: 108, ai: 'melee', attacks: [melee('Attack1', 1.2, 36, 0.35, 'claw'), melee('Attack2', 1.4, 36, 0.4, 'claw')], xp: 70, gold: 36, poise: 60 },
    nightthing: { name: 'Night Thing', set: 'night_creature', scale: 1.4, hp: 260, atk: 24, spd: 90, ai: 'brute', attacks: [melee('Attack1', 1.4, 44, 0.6, 'dark_slash'), melee('Attack4', 2.2, 70, 0.9, 'smoke_dark')], xp: 95, gold: 48, poise: 120 },
    knife: { name: 'One of the Knives', set: 'frost_assassin', hp: 140, atk: 20, spd: 122, ai: 'melee', attacks: [melee('Attack1', 1, 30, 0.3), melee('Attack6', 1.5, 30, 0.3)], xp: 66, gold: 40, poise: 34 },
    mireille: { name: 'Mother Mireille of the Knives', set: 'frost_assassin', scale: 1.35, hp: 3200, atk: 38, spd: 130, ai: 'boss', poise: 260, boss: true, xp: 1500, gold: 800,
      attacks: [melee('Attack1', 1.3, 40, 0.3, 'dark_slash'), melee('Attack2', 1.4, 40, 0.3, 'dark_slash'), { clip: 'Attack6', mul: 2.2, reach: 220, tele: 0.6, fx: 'multi_hit', dash: true }, { clip: 'Attack4', mul: 2.6, reach: 100, arc: 7, tele: 1, fx: 'smoke_dark', aoe: true, poise: 2 }],
      phases: [{ at: 0.7, summon: ['knife', 'knife'], say: 'My daughters. Show them the family trade.' }, { at: 0.4, summon: ['crawler', 'knife'], enrage: 1.3, say: 'Every knife I ever made is coming home.' }] },
    courtknight: { name: 'Knight of the Hollow Court', set: 'gothic_knight_a', scale: 1.1, hp: 260, atk: 26, spd: 82, ai: 'melee', attacks: [melee('Attack1', 1.2, 40, 0.5), melee('Attack2', 1.3, 40, 0.5), melee('Attack3', 1.6, 44, 0.7, 'cleave')], xp: 110, gold: 60, poise: 110 },
    courtguard: { name: 'Hollow Court Halberdier', set: 'gothic_knight_b', scale: 1.1, hp: 300, atk: 24, spd: 76, ai: 'brute', attacks: [melee('Attack1', 1.3, 50, 0.6, 'thrust'), melee('Attack4', 2, 70, 0.9, 'cleave')], xp: 120, gold: 64, poise: 140 },
    dreth: { name: 'Castellan Dreth', set: 'master_knight', scale: 1.5, hp: 4200, atk: 44, spd: 88, ai: 'boss', poise: 420, boss: true, xp: 2000, gold: 1100,
      attacks: [melee('Attack1', 1.4, 56, 0.45, 'hit_slash'), melee('Attack2', 1.5, 56, 0.45, 'hit_slash'), melee('Attack3', 2, 60, 0.7, 'cross_slash'), { clip: 'Attack4', mul: 3, reach: 130, arc: 7, tele: 1.2, fx: 'shockwave', aoe: true, poise: 2.5 }, { clip: 'Attack6', mul: 2.4, reach: 200, tele: 0.6, fx: 'cleave', dash: true }],
      phases: [{ at: 0.66, summon: ['courtknight', 'courtknight'], say: 'The Court does not kneel. The Court is knelt to.' }, { at: 0.33, enrage: 1.4, say: 'I held this door three hundred years. I will hold it one night more.' }] },
    echo: { name: 'Echo of the Sun', set: 'echo', hp: 220, atk: 28, spd: 96, ai: 'caster', bolt: 'fireball_arcane', boltSpeed: 240, attacks: [{ clip: 'Attack5', mul: 1.6, reach: 200, tele: 0.7, fx: 'hit_fire', element: 'burn' }], xp: 150, gold: 70, poise: 60 },
    shardling: { name: 'Shardling', set: 'fragment', hp: 160, atk: 24, spd: 116, ai: 'melee', attacks: [melee('Attack1', 1.2, 32, 0.3, 'hit_crit'), melee('Attack2', 1.3, 32, 0.3, 'hit_crit')], xp: 130, gold: 60, poise: 40 },
    sunwyrm: { name: 'The Sunwyrm', set: 'elder_dragon', scale: 2.3, hp: 6000, atk: 50, spd: 96, ai: 'boss', poise: 600, boss: true, xp: 3000, gold: 1500, element: 'burn',
      attacks: [melee('Attack1', 1.6, 80, 0.6, 'claw'), melee('Attack2', 1.7, 80, 0.6, 'claw'), { clip: 'Attack5', mul: 2.2, reach: 260, tele: 0.9, fx: 'hit_fire', bolt: 'fireball_big', boltSpeed: 260, element: 'burn' }, { clip: 'Attack4', mul: 3.2, reach: 170, arc: 7, tele: 1.4, fx: 'explosion_fire', aoe: true, poise: 3, element: 'burn' }, { clip: 'Attack6', mul: 2.6, reach: 240, tele: 0.7, fx: 'fire_slash', dash: true, element: 'burn' }],
      phases: [{ at: 0.7, summon: ['echo', 'echo'], say: '(it breathes, and the ash catches fire)' }, { at: 0.4, summon: ['shardling', 'shardling'], enrage: 1.3, say: '(the sky goes white)' }] },
    paleking: { name: 'The Pale King', set: 'black_knight', scale: 1.6, hp: 7000, atk: 56, spd: 100, ai: 'boss', poise: 700, boss: true, xp: 5000, gold: 3000,
      attacks: [melee('Attack1', 1.5, 60, 0.4, 'dark_slash'), melee('Attack2', 1.6, 60, 0.4, 'dark_slash'), melee('Attack3', 2.2, 64, 0.6, 'cross_slash'), { clip: 'Attack4', mul: 3.4, reach: 160, arc: 7, tele: 1.2, fx: 'dark_curse', aoe: true, poise: 3 }, { clip: 'Attack6', mul: 2.8, reach: 240, tele: 0.5, fx: 'dark_slash', dash: true }, { clip: 'Attack5', mul: 2.4, reach: 280, tele: 0.8, fx: 'hit_shock', bolt: 'homing_orb', boltSpeed: 220 }],
      phases: [{ at: 0.75, summon: ['shardling', 'shardling'], say: 'I broke the sun so no one would ever again be judged by its light.' }, { at: 0.5, summon: ['echo', 'echo', 'shardling'], enrage: 1.2, say: 'You carry my Ember. You are my heir. KNEEL.' }, { at: 0.25, enrage: 1.5, say: 'Then take the crown. See how it fits.' }] },
  };

  // Which packed sets the game needs (heroes + every foe + scene extras).
  D.SETS = (function () { const s = new Set(); for (const h of Object.values(D.HEROES)) { s.add(h.set); if (h.sceneSet) s.add(h.sceneSet); } for (const f of Object.values(D.FOES)) s.add(f.set); for (const x of ['erdra_vendor', 'ashgate_f1', 'ashgate_m1', 'miller', 'rival_kid', 'shopkeeper', 'guard_gate', 'tavern_keeper', 'cassius', 'lyra']) s.add(x); return [...s]; })();
})(typeof window !== 'undefined' ? window : globalThis);
// Clip timing shared by the simulation (Node) and the renderer.
(function (root) {
  const D = root.EF.DATA;
  D.CLIP_FPS = { Idle: 8, Idle2: 8, Idle3: 8, Idle4: 8, Walk: 12, Run: 16, StrafeLeft: 12, StrafeRight: 12, RunBackwards: 14,
    Rolling: 30, TakeDamage: 20, Slide: 12, Die: 14, Taunt: 10, CrouchIdle: 8, Kick: 14, Special1: 12,
    Attack1: 16, Attack2: 16, Attack3: 16, Attack4: 14, Attack5: 16, Attack6: 16 };
  D.CLIP_LOOP = { Idle: 1, Idle2: 1, Idle3: 1, Idle4: 1, Walk: 1, Run: 1, StrafeLeft: 1, StrafeRight: 1, RunBackwards: 1, Taunt: 1, CrouchIdle: 1 };
  D.STRIKE = { Attack1: 6, Attack2: 7, Attack3: 7, Attack4: 9, Attack5: 3, Attack6: 6, Kick: 7, Special1: 10 };
  D.FRAMES = 15;
})(typeof window !== 'undefined' ? window : globalThis);
