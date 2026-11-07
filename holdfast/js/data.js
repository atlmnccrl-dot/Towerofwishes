// HOLDFAST (working title) - game data. Pure; runs in the browser and in Node.
// Buildings, eras, research, equipment, survivors, enemies, expedition sites and encounters.
(function (root) {
  const HF = root.HF = root.HF || {};
  const D = HF.D = {};
  D.TILE = 32;
  D.W = 96; D.H = 96;               // world size in tiles
  D.DAY = 300;                       // seconds of real time per game day at 1x
  D.RES = ['wood', 'stone', 'food', 'water', 'metal', 'knowledge'];
  D.RES_NAME = { wood: 'Wood', stone: 'Stone', food: 'Food', water: 'Water', metal: 'Metal', knowledge: 'Knowledge' };

  // ---- Terrain ------------------------------------------------------------------------
  D.T = { GRASS: 0, FOREST: 1, DIRT: 2, SAND: 3, WATER: 4, STONE: 5, MEADOW: 6 };

  // ---- Buildings ----------------------------------------------------------------------
  // Each building has tiers (arrays are per tier). parts: what is drawn, per tier:
  //   [atlas, key, dx, dy, scale]  atlas 't' = shared tile atlas, 'x' = extra atlas, 'f' = fx animation,
  //   'p' = procedural sprite; (dx, dy) = bottom-centre of the sprite relative to the footprint's
  //   bottom-centre, in px. era: the era a tier needs; tech: the research a tier needs.
  D.B = {
    heart: {
      name: ['Campfire', 'Hearth', 'Longhall'], w: 5, h: 3, unique: true, cat: 'core',
      cost: [{ wood: 5, stone: 3 }, { wood: 80, stone: 50, food: 20 }, { wood: 220, stone: 180, metal: 30 }],
      work: [5, 50, 120], hp: [160, 450, 1000], era: [1, 1, 2], light: [6, 8, 10], store: [80, 160, 320],
      desc: ['The heart of the camp. Warmth, light and a place to store what you gather.',
        'A stone hearth: the camp becomes a Settlement. Unlocks new buildings.',
        'A great hall: the Settlement becomes a Village. Unlocks advanced works.'],
      parts: [
        [['t', 'log_a', -44, -30, 1], ['t', 'log_b', 44, -34, 1], ['t', 'rock_m3', -2, -50, 0.9], ['f', 'campfire', 0, -30, 1.1], ['t', 'rock_m1', -18, -32, 0.9], ['t', 'rock_m2', 16, -32, 0.9], ['t', 'stone_b', 0, -28, 1.2]],
        [['t', 'stone_circle', 0, -10, 1], ['f', 'campfire', 0, -40, 1.6], ['t', 'cd_brazier', -66, -4, 1.5], ['t', 'cd_brazier', 66, -4, 1.5], ['t', 'log_a', -40, 4, 1], ['t', 'log_b', 40, 4, 1]],
        [['t', 'p16_house_blue', 0, 0, 0.72], ['t', 'cd_brazier', -76, 4, 1.5], ['t', 'cd_brazier', 76, 4, 1.5], ['t', 'cd_banner_blue', -50, 6, 1.5], ['t', 'cd_banner_blue', 50, 6, 1.5]],
      ],
    },
    tent: {
      name: ['Lean-to'], w: 2, h: 2, cat: 'home', cost: [{ wood: 12 }], work: [8], hp: [90], era: [1], beds: [2],
      desc: ['A hide-and-pole shelter. Sleeps 2.'], parts: [[['t', 'fv_tent_green', 0, 2, 2]]],
    },
    cabin: {
      name: ['Cabin'], w: 5, h: 3, cat: 'home', cost: [{ wood: 60, stone: 20 }], work: [36], hp: [320], era: [2], beds: [5],
      desc: ['A timber house with a hearth. Sleeps 5 and lifts spirits.'], parts: [[['t', 'p16_house_red', 0, 4, 1]]],
    },
    stockpile: {
      name: ['Stockpile', 'Storehouse'], w: 3, h: 2, cat: 'core', cost: [{ wood: 15 }, { wood: 50, stone: 25 }], work: [8, 26],
      hp: [120, 300], era: [1, 2], store: [150, 380],
      desc: ['Crates and sacks. More room for resources; workers drop loads here.', 'A covered store. Much more room.'],
      parts: [
        [['t', 'fv_crate', -30, -4, 1.2], ['t', 'fv_grain_sack', -2, -16, 1.2], ['t', 'fv_barrel', 28, -6, 1], ['t', 'log_b', 4, 4, 0.9]],
        [['t', 'p16_stall', 0, -4, 1], ['t', 'crate', -42, 6, 1], ['t', 'crate_b', 44, 6, 1], ['t', 'barrel', 30, 10, 1]],
      ],
    },
    water: {
      name: ['Rain Barrel', 'Well'], w: 2, h: 2, cat: 'core', cost: [{ wood: 10 }, { wood: 20, stone: 35 }], work: [6, 24],
      hp: [70, 260], era: [1, 2], waterDay: [7, 18],
      desc: ['Catches rain. +7 water a day (more in rain).', 'A dug well. +18 water a day.'],
      parts: [[['t', 'p16_water_barrel', -6, -6, 1.5], ['t', 'pot', 18, -2, 1]], [['t', 'cd_castle_well', 0, 0, 2]]],
    },
    woodcamp: {
      name: ["Woodcutter's Camp"], w: 2, h: 2, cat: 'work', cost: [{ wood: 15, stone: 4 }], work: [10], hp: [110], era: [1],
      desc: ['Woodcutters drop logs here and cut 25% more wood nearby.'], drop: 'wood', parts: [[['t', 'fv_log_pile', 0, -6, 2], ['t', 'fv_tree_stump', 22, 4, 1]]],
    },
    quarry: {
      name: ["Stonecutter's Camp"], w: 2, h: 2, cat: 'work', cost: [{ wood: 20 }], work: [10], hp: [140], era: [1],
      desc: ['Stonecutters drop stone here and cut 25% more nearby.'], drop: 'stone', parts: [[['t', 'rock_big', -4, -4, 1], ['t', 'brick_a', 20, 4, 1], ['t', 'slabs', -20, 6, 1]]],
    },
    farm: {
      name: ['Field'], w: 3, h: 3, cat: 'work', cost: [{ wood: 15, food: 4 }], work: [10], hp: [60], era: [2],
      desc: ['Farmers sow and harvest grain. ~20 food a crop.'], crop: true, parts: [[['t', 'fv_scarecrow', 30, -60, 1.5]]],
    },
    wall: {
      name: ['Barricade', 'Stone Wall'], w: 1, h: 1, cat: 'defense', cost: [{ wood: 3 }, { stone: 6 }], work: [2, 6], hp: [140, 600],
      era: [1, 2], tech: [null, 'masonry'], wall: true, drag: true,
      desc: ['Sharpened stakes and fencing. Blocks raiders until broken.', 'Dressed stone. Very hard to break.'],
      parts: [[['p', 'palisade', 0, 2, 1]], [['t', 'cdw_wall_face_stone', 0, 0, 1], ['t', 'cdw_wall_top_stone', 0, -32, 1]]],
    },
    gate: {
      name: ['Gate', 'Iron Gate'], w: 1, h: 1, cat: 'defense', cost: [{ wood: 8 }, { stone: 10, metal: 3 }], work: [3, 8], hp: [180, 700],
      era: [1, 2], tech: [null, 'metalwork'], wall: true, gate: true,
      desc: ['Your people pass; raiders do not.', 'Iron-banded and set in stone.'],
      parts: [[['x', 'fence_gate', 0, 2, 1]], [['t', 'cdw_wooden_gate', 0, 0, 1], ['x', 'battlement_h', 0, -32, 1]]],
    },
    tower: {
      name: ['Lookout', 'Watchtower'], w: 3, h: 3, cat: 'defense', cost: [{ wood: 30, stone: 6 }, { wood: 30, stone: 80 }], work: [16, 40],
      hp: [220, 800], era: [1, 2], tech: [null, 'masonry'], range: [7, 10], slots: [1, 2], reveal: [12, 16],
      desc: ['A raised platform. A guard here shoots farther and sees raiders coming.', 'Stone tower for two archers. Long range.'],
      parts: [[['p', 'lookout', 0, 2, 1]], [['t', 'temple', 0, 4, 0.66]]],
    },
    workshop: {
      name: ['Workshop', 'Smithy'], w: 3, h: 2, cat: 'work', cost: [{ wood: 30, stone: 10 }, { wood: 40, stone: 40, metal: 10 }], work: [14, 30],
      hp: [160, 360], era: [1, 2], tech: [null, 'metalwork'],
      desc: ['Craftsfolk make weapons and armour here.', 'A forge for iron: swords and mail.'],
      parts: [[['t', 'cd_anvil', 26, 6, 1.5], ['t', 'log_a', -24, 2, 1], ['t', 'cd_weapon_rack', -14, -22, 1.5]],
        [['t', 'cd_forge', -20, -6, 2], ['t', 'cd_anvil', 28, 6, 1.5], ['t', 'cd_weapon_rack', 34, -26, 1.5]]],
    },
    infirmary: {
      name: ["Healer's Tent"], w: 3, h: 2, cat: 'work', cost: [{ wood: 30, food: 10 }], work: [14], hp: [150], era: [2],
      desc: ['Medics treat the wounded here. Injuries heal 3x faster.'], parts: [[['t', 'fv_tent_red', -14, 0, 2], ['t', 'cd_cauldron', 32, 6, 1.4]]],
    },
    training: {
      name: ['Training Yard'], w: 3, h: 2, cat: 'defense', cost: [{ wood: 35 }], work: [12], hp: [140], era: [2],
      desc: ['Guards drill here when quiet. Combat skill rises.'], parts: [[['t', 'cd_training_dummy', -26, 2, 2], ['t', 'cd_archery_target', 26, -4, 2]]],
    },
    study: {
      name: ["Scholar's Study"], w: 3, h: 2, cat: 'work', cost: [{ wood: 30, stone: 20 }], work: [14], hp: [140], era: [2],
      desc: ['Researchers study salvaged books and relics: Knowledge for research.'],
      parts: [[['t', 'cd_bookshelf', -26, -10, 2], ['t', 'p16_table', 14, 6, 1], ['t', 'cd_candelabra', 40, -12, 1.4], ['t', 'p16_books', 6, -14, 1]]],
    },
    barracks: {
      name: ['Barracks'], w: 4, h: 3, cat: 'defense', cost: [{ wood: 80, stone: 40 }], work: [30], hp: [380], era: [2], tech: ['drill'], beds: [3],
      desc: ['Quarters for soldiers. Guards gain +20% damage; sleeps 3.'],
      parts: [[['t', 'cd_war_tent_red', -30, -8, 2], ['x', 'war_tent_blue', 30, -8, 2], ['t', 'cd_weapon_rack', 0, 10, 1.5], ['x', 'flag_red', -58, 10, 1.5], ['x', 'flag_blue', 58, 10, 1.5]]],
    },
  };
  D.BUILD_ORDER = ['heart', 'tent', 'stockpile', 'water', 'woodcamp', 'quarry', 'wall', 'gate', 'tower', 'workshop', 'cabin', 'farm', 'infirmary', 'training', 'study', 'barracks'];
  D.CATS = [['core', 'Camp'], ['home', 'Homes'], ['work', 'Work'], ['defense', 'Defense']];

  // ---- Eras ---------------------------------------------------------------------------
  D.ERAS = ['', 'Camp', 'Settlement', 'Village'];
  // What raising the Heart to a tier needs (beyond its cost).
  D.ERA_REQ = {
    2: { pop: 4, raids: 1, text: '4 survivors, one raid repelled' },
    3: { pop: 8, tech: 'masonry', relic: 'banner', text: '8 survivors, Masonry, the Old Guard Banner' },
  };

  // ---- Research -----------------------------------------------------------------------
  D.TECH = {
    masonry: { name: 'Masonry', cost: 30, era: 2, desc: 'Stone walls, watchtowers.' },
    bowcraft: { name: 'Bowcraft', cost: 20, era: 2, desc: 'Craft bows. Tower guards +25% damage.' },
    herbalism: { name: 'Herbalism', cost: 20, era: 2, desc: 'Healers work twice as fast; injuries mend sooner.' },
    agriculture: { name: 'Crop Rotation', cost: 25, era: 2, desc: 'Fields grow 50% more grain.' },
    roads: { name: 'Paved Roads', cost: 25, era: 2, desc: 'Well-trodden paths become stone roads: +35% walking speed.' },
    watchfires: { name: 'Watch Fires', cost: 15, era: 2, desc: 'Raids are spotted half a day sooner; lookouts see farther.' },
    drill: { name: 'Drill & Discipline', cost: 35, era: 2, req: ['bowcraft'], desc: 'Barracks. Soldiers learn faster.' },
    metalwork: { name: 'Metalworking', cost: 45, era: 2, req: ['masonry'], relic: 'schematics', desc: 'Smithy, swords, mail, iron gates. Needs Old World Schematics.' },
  };
  D.TECH_ORDER = ['masonry', 'bowcraft', 'herbalism', 'agriculture', 'watchfires', 'roads', 'drill', 'metalwork'];

  D.RELICS = {
    schematics: { name: 'Old World Schematics', desc: 'Drawings of forges and alloys from before the Fall.' },
    banner: { name: 'The Old Guard Banner', desc: 'The standard of the last garrison. People rally to it.' },
    map: { name: 'Surveyor\'s Map', desc: 'Marks places no one has walked to in a century.' },
  };

  // ---- Equipment ----------------------------------------------------------------------
  D.WEAPON = {
    none: { name: 'Fists', dmg: 5, range: 0.9, cd: 1.0 },
    club: { name: 'Club', dmg: 9, range: 1.0, cd: 1.0, cost: { wood: 6 } },
    spear: { name: 'Spear', dmg: 11, range: 1.35, cd: 1.05, cost: { wood: 10, stone: 2 } },
    bow: { name: 'Bow', dmg: 9, range: 6, cd: 1.3, ranged: true, cost: { wood: 14 }, tech: 'bowcraft' },
    sword: { name: 'Sword', dmg: 16, range: 1.05, cd: 0.85, cost: { metal: 8, wood: 2 }, tech: 'metalwork' },
  };
  D.ARMOR = {
    none: { name: 'Rags', def: 0 },
    hide: { name: 'Hide Armour', def: 3, cost: { food: 10, wood: 2 } },
    mail: { name: 'Mail Shirt', def: 7, cost: { metal: 14 }, tech: 'metalwork' },
  };
  D.CRAFT_ORDER = ['club', 'spear', 'bow', 'hide', 'sword', 'mail'];

  // ---- Survivors ----------------------------------------------------------------------
  D.JOBS = {
    labor: { name: 'Laborer', icon: 'labor', desc: 'Builds, repairs, gathers whatever is short.' },
    wood: { name: 'Woodcutter', icon: 'wood', desc: 'Fells trees.' },
    stone: { name: 'Stonecutter', icon: 'stone', desc: 'Breaks rock.' },
    forage: { name: 'Forager', icon: 'food', desc: 'Picks berries, hunts game, fetches water.' },
    farm: { name: 'Farmer', icon: 'farm', desc: 'Works the fields.', need: 'farm' },
    build: { name: 'Builder', icon: 'build', desc: 'Builds and repairs first.' },
    guard: { name: 'Guard', icon: 'guard', desc: 'Mans towers, patrols, fights first.' },
    medic: { name: 'Medic', icon: 'medic', desc: 'Tends the wounded.', need: 'infirmary' },
    craft: { name: 'Crafter', icon: 'craft', desc: 'Makes gear at the workshop.', need: 'workshop' },
    research: { name: 'Scholar', icon: 'research', desc: 'Studies for Knowledge.', need: 'study' },
  };
  D.JOB_ORDER = ['labor', 'wood', 'stone', 'forage', 'farm', 'build', 'guard', 'medic', 'craft', 'research'];
  D.SKILLS = ['build', 'gather', 'combat', 'medic', 'scout', 'craft'];
  D.SKILL_NAME = { build: 'Building', gather: 'Gathering', combat: 'Combat', medic: 'Medicine', scout: 'Scouting', craft: 'Crafting' };
  D.JOB_SKILL = { labor: 'gather', wood: 'gather', stone: 'gather', forage: 'gather', farm: 'gather', build: 'build', guard: 'combat', medic: 'medic', craft: 'craft', research: 'craft' };

  D.TRAITS = {
    tough: { name: 'Tough', desc: '+30% health.', hp: 1.3 },
    quick: { name: 'Quick', desc: '+15% speed.', spd: 1.15 },
    keen: { name: 'Keen-Eyed', desc: 'Better scout; sees farther.', skill: { scout: 3 } },
    handy: { name: 'Handy', desc: 'Builds and crafts faster.', skill: { build: 2, craft: 2 } },
    green: { name: 'Green Thumb', desc: 'Better forager and farmer.', skill: { gather: 3 } },
    brave: { name: 'Brave', desc: 'Never flees; steadies others.', skill: { combat: 2 }, brave: true },
    gentle: { name: 'Gentle Hands', desc: 'Natural healer.', skill: { medic: 4 } },
    cheerful: { name: 'Cheerful', desc: 'Raises morale around them.', morale: 8 },
    scholar: { name: 'Bookish', desc: 'Learns and studies faster.', skill: { craft: 3 } },
    grim: { name: 'Grim', desc: 'Hard to shake, hard to please.', moraleLock: true },
  };
  D.TRAIT_KEYS = Object.keys(D.TRAITS);
  D.NAMES_F = ['Mara', 'Ilse', 'Tova', 'Wren', 'Edda', 'Saoirse', 'Brielle', 'Nessa', 'Liv', 'Odette', 'Ysa', 'Hild', 'Runa', 'Calla', 'Petra', 'Ash', 'Fenna', 'Juno', 'Kestrel', 'Maeve', 'Neve', 'Orla', 'Sable', 'Tamsin'];
  D.NAMES_M = ['Bram', 'Corin', 'Dag', 'Emeric', 'Finn', 'Gareth', 'Hob', 'Ivo', 'Joss', 'Kell', 'Lorne', 'Milo', 'Niall', 'Oren', 'Piet', 'Quill', 'Roan', 'Sten', 'Tobin', 'Ulf', 'Vance', 'Wade', 'Yorick', 'Zeb'];
  D.SURNAMES = ['Ashby', 'Barrow', 'Cole', 'Dunmore', 'Ember', 'Fallow', 'Greaves', 'Hale', 'Ironwood', 'Kettle', 'Lark', 'Marsh', 'Noll', 'Oakes', 'Pike', 'Rook', 'Stave', 'Thorne', 'Vale', 'Wick'];
  D.ORIGINS = ['walked out of the drowned lowlands', 'was a ferryman before the river turned', 'grew up in a cellar under a dead city',
    'buried a whole village and kept walking', 'traded salt along the old roads', 'deserted a raider band', 'was raised by hermits in the hills',
    'lost a family to the Hollow', 'mended nets on the grey coast', 'kept bees in a ruined abbey', 'ran messages between dying towns', 'hunted the deep woods alone'];
  // Appearance sets (the Character Creator cast). 'f' = female-presenting, 'm' = male-presenting.
  D.CIVIL_SETS = [['ashgate_f1', 'f'], ['ashgate_m1', 'm'], ['ashgate_m2', 'm'], ['erdra_baker', 'f'], ['erdra_f1', 'f'], ['erdra_f2', 'f'], ['erdra_m1', 'm'],
    ['erdra_m2', 'm'], ['erdra_musician', 'm'], ['erdra_vendor', 'f'], ['hamlet_people', 'm'], ['miller', 'm'], ['sword_smith', 'm'], ['tavern_keeper', 'f'],
    ['shopkeeper', 'm'], ['labyrinth_citizen', 'f'], ['hooded_follower', 'm'], ['beastfolk_f', 'f'], ['guard_officer', 'm']];
  D.FIGHT_SETS = [['guild_adventurer', 'm'], ['ashgate_f2', 'f'], ['spearwoman', 'f'], ['guard_gate', 'm'], ['beastfolk_m', 'm'], ['poacher', 'm']];
  // The three survivors offered at the start.
  D.STARTERS = [
    { set: 'ashgate_f2', sex: 'f', trait: 'quick', skills: { gather: 3, scout: 3, combat: 2 }, blurb: 'A wanderer. Fast on her feet, good at finding things.' },
    { set: 'guild_adventurer', sex: 'm', trait: 'tough', skills: { combat: 4, build: 2, gather: 1 }, blurb: 'A sellsword with a shield and a bad knee. Hard to kill.' },
    { set: 'spearwoman', sex: 'f', trait: 'handy', skills: { build: 3, craft: 2, combat: 3 }, blurb: 'A hunter and carpenter. Builds fast, fights with a spear.' },
  ];
  // Sets that carry a weapon in their clips (they fight with Attack1; archers draw with Attack3).
  D.ARMED = { guild_adventurer: 1, ashgate_f2: 1, spearwoman: 1, guard_gate: 1, beastfolk_m: 1, poacher: 1 };

  // ---- Enemies ------------------------------------------------------------------------
  // faction: beast | raider | hollow. bdmg: damage multiplier against buildings.
  D.FOE = {
    stalker: { name: 'Stalker', set: 'hamlet_predator', faction: 'beast', hp: 40, dmg: 4.5, cd: 1.1, range: 0.9, spd: 66, bdmg: 0.5, clip: 'Attack1', scale: 1, power: 2, night: true },
    pale: { name: 'Pale Thing', set: 'night_creature', faction: 'beast', hp: 80, dmg: 7, cd: 1.2, range: 1.0, spd: 58, bdmg: 0.8, clip: 'Attack1', scale: 1.3, power: 4, night: true },
    raider: { name: 'Ash Raider', set: 'bandit_knife', faction: 'raider', hp: 45, dmg: 5, cd: 0.95, range: 0.95, spd: 56, bdmg: 1, clip: 'Attack1', power: 3, loot: true },
    thug: { name: 'Raider Thug', set: 'thug_a', faction: 'raider', hp: 55, dmg: 6, cd: 1.0, range: 1.0, spd: 54, bdmg: 1.2, clip: 'Attack1', power: 3.5, loot: true },
    brute: { name: 'Raider Brute', set: 'bandit_broad', faction: 'raider', hp: 100, dmg: 10, cd: 1.5, range: 1.1, spd: 46, bdmg: 2.2, clip: 'Attack1', scale: 1.15, power: 6 },
    thrower: { name: 'Knife Thrower', set: 'bandit_lookout', faction: 'raider', hp: 38, dmg: 5, cd: 1.5, range: 5, spd: 56, bdmg: 0.4, clip: 'Attack5', ranged: 'dagger', power: 4 },
    hollow: { name: 'Hollow', set: 'goblin', faction: 'hollow', hp: 44, dmg: 5, cd: 1.0, range: 0.95, spd: 58, bdmg: 1, clip: 'Attack1', power: 3, night: true },
    hspear: { name: 'Hollow Spear', set: 'goblin_spear', faction: 'hollow', hp: 54, dmg: 6.5, cd: 1.1, range: 1.35, spd: 54, bdmg: 1, clip: 'Attack1', power: 4, night: true },
    harcher: { name: 'Hollow Archer', set: 'goblin_archer', faction: 'hollow', hp: 38, dmg: 5, cd: 1.6, range: 6, spd: 54, bdmg: 0.3, clip: 'Attack3', ranged: 'arrow', power: 4.5, night: true },
    hexer: { name: 'Hexer', set: 'goblin_hexer', faction: 'hollow', hp: 46, dmg: 8, cd: 2.0, range: 5.5, spd: 50, bdmg: 0.8, clip: 'Attack5', ranged: 'dark', power: 6, night: true },
    warlord: { name: 'Bone Warlord', set: 'ogre', faction: 'hollow', hp: 420, dmg: 18, cd: 2.0, range: 1.3, spd: 40, bdmg: 4, clip: 'Attack1', scale: 1.7, power: 22, night: true, boss: true },
  };

  // ---- Expeditions --------------------------------------------------------------------
  // Site types. loot: base rewards (scaled by outcome); enc: encounter ids to draw from.
  D.SITE = {
    orchard: { name: 'Overgrown Orchard', danger: 1, icon: 'tree', loot: { food: 24, wood: 6 }, enc: ['orchard'], art: 'grove' },
    hamlet: { name: 'Abandoned Hamlet', danger: 2, icon: 'house', loot: { wood: 30, food: 10, stone: 8 }, enc: ['hamlet', 'survivor'], art: 'village' },
    cache: { name: 'Buried Cache', danger: 1, icon: 'chest', loot: { food: 12, metal: 6, wood: 10 }, enc: ['cache'], art: 'ruin' },
    quarry: { name: 'Old Quarry', danger: 2, icon: 'stone', loot: { stone: 40, metal: 4 }, enc: ['quarry'], art: 'rocks' },
    tower: { name: 'Fallen Watchtower', danger: 2, icon: 'tower', loot: { metal: 10, stone: 10 }, enc: ['tower'], art: 'ruin', reveal: 3 },
    archive: { name: 'Sunken Archive', danger: 3, icon: 'book', loot: { knowledge: 25, metal: 6 }, enc: ['archive'], art: 'ruin', relic: 'schematics' },
    den: { name: 'Stalker Den', danger: 3, icon: 'skull', loot: { food: 30 }, enc: ['den'], art: 'grove', clears: 'beast' },
    camp: { name: 'Ash Raider Camp', danger: 4, icon: 'flag', loot: { food: 30, wood: 30, metal: 16 }, enc: ['raidcamp'], art: 'camp', clears: 'raider' },
    garrison: { name: 'Fallen Garrison', danger: 4, icon: 'castle', loot: { metal: 30, stone: 20 }, enc: ['garrison'], art: 'ruin', relic: 'banner' },
    mill: { name: 'Millbrook Free Folk', danger: 1, icon: 'people', loot: {}, enc: ['millbrook'], art: 'village', friendly: true },
    stranded: { name: 'Smoke on the Ridge', danger: 2, icon: 'fire', loot: { food: 4 }, enc: ['stranded'], art: 'rocks' },
    spire: { name: 'The Black Spire', danger: 5, icon: 'dragon', loot: {}, enc: ['spire'], art: 'ruin', locked: 3 },
  };
  // The world around the camp: fixed layout, revealed by exploring. dist in leagues, dir in degrees (0 = east).
  D.SITES = [
    { id: 's1', type: 'orchard', dist: 1.5, dir: 200, known: true },
    { id: 's2', type: 'hamlet', dist: 2.2, dir: 70, known: true },
    { id: 's3', type: 'cache', dist: 2.0, dir: 320 },
    { id: 's4', type: 'stranded', dist: 2.8, dir: 150 },
    { id: 's5', type: 'tower', dist: 3.0, dir: 20 },
    { id: 's6', type: 'quarry', dist: 3.2, dir: 255 },
    { id: 's7', type: 'mill', dist: 4.0, dir: 110 },
    { id: 's8', type: 'den', dist: 3.8, dir: 290 },
    { id: 's9', type: 'archive', dist: 4.6, dir: 40 },
    { id: 's10', type: 'camp', dist: 5.0, dir: 175 },
    { id: 's11', type: 'hamlet', dist: 5.4, dir: 230 },
    { id: 's12', type: 'garrison', dist: 6.2, dir: 345 },
    { id: 's13', type: 'stranded', dist: 5.8, dir: 85 },
    { id: 's14', type: 'spire', dist: 8.0, dir: 60 },
  ];
  D.SITE_NAMES = { s1: 'Crabapple Hollow', s2: 'Fernmoor', s3: 'The Stone Cairn', s4: 'Kettle Ridge', s5: 'Greywatch', s6: 'Marrowcut Quarry', s7: 'Millbrook',
    s8: 'The Gnawing Dark', s9: 'Lantern Deep', s10: 'Cinder Hold', s11: 'Lowfold', s12: 'Fort Hallow', s13: 'Brightwater Ford', s14: 'The Black Spire' };
  D.HOURS_PER_LEAGUE = 2.2;

  // Encounters. Each choice: text, check (skill), diff, and outcomes for ok / fail.
  // Outcome fields: loot multiplier, extra loot, hurt (injury chance per member), kill (death chance),
  // recruit (number), relic, reveal, clear, rep (Millbrook goodwill), trade, text.
  D.ENC = {
    orchard: { title: 'The Orchard', text: 'Gnarled apple trees, heavy with small sour fruit. Something has been feeding here: deep claw marks score the bark.',
      choices: [
        { text: 'Pick quickly and leave', check: 'gather', diff: 2, ok: { loot: 1, text: 'Sacks full, nobody bitten.' }, fail: { loot: 0.6, hurt: 0.3, text: 'A stalker charged out of the brush. You got away with half a load and a few scratches.' } },
        { text: 'Hunt whatever made those marks', check: 'combat', diff: 4, ok: { loot: 1.6, text: 'You found the beast asleep and ate well that night. Meat and fruit both.' }, fail: { loot: 0.8, hurt: 0.6, text: 'It found you first.' } },
      ] },
    hamlet: { title: 'Empty Houses', text: 'A dozen houses under a carpet of ivy. Doors hang open. In one window, a candle stub that someone lit not long ago.',
      choices: [
        { text: 'Strip the houses for timber', check: 'build', diff: 3, ok: { loot: 1.2, text: 'Good beams and planks, carefully pulled.' }, fail: { loot: 0.7, hurt: 0.25, text: 'A roof gave way under you.' } },
        { text: 'Follow the candle', check: 'scout', diff: 3, ok: { loot: 0.6, recruit: 1, text: 'A survivor, hiding in a root cellar. After a long time, they agreed to come with you.' }, fail: { loot: 0.5, text: 'Whoever it was had gone.' } },
      ] },
    survivor: { title: 'A Voice in the Well', text: 'Someone is calling from the bottom of the village well. Weak, hoarse, asking for help.',
      choices: [
        { text: 'Climb down with a rope', check: 'gather', diff: 2, ok: { loot: 0.6, recruit: 1, text: 'You hauled them up, half-drowned. They will not forget it.' }, fail: { loot: 0.6, hurt: 0.3, recruit: 1, text: 'The rope snapped once. You got them out anyway, bruised.' } },
        { text: 'It could be a trap. Leave.', check: null, ok: { loot: 1, text: 'You took what timber you could and left the voice behind.' } },
      ] },
    cache: { title: 'The Cairn', text: 'A pile of carved stones marks something buried. Old symbols warn, or welcome. Hard to say which.',
      choices: [
        { text: 'Dig carefully', check: 'craft', diff: 2, ok: { loot: 1.3, text: 'Wrapped bundles: dried food, iron nails, tools.' }, fail: { loot: 0.8, text: 'Most of it had rotted. You saved some.' } },
        { text: 'Read the stones first', check: 'scout', diff: 3, ok: { loot: 1, reveal: 2, text: 'The carvings are a map. Two places you did not know of.' }, fail: { loot: 1, text: 'They meant nothing to you.' } },
      ] },
    quarry: { title: 'Marrowcut', text: 'Cut blocks lie where the masons left them a hundred years ago. The cliff face is cracked and unstable.',
      choices: [
        { text: 'Haul the cut blocks', check: 'gather', diff: 3, ok: { loot: 1.2, text: 'Heavy going, but every block came home.' }, fail: { loot: 0.6, hurt: 0.4, text: 'A slide of scree caught you.' } },
        { text: 'Search the masons\' hut', check: 'scout', diff: 3, ok: { loot: 0.8, extra: { metal: 10, knowledge: 6 }, text: 'Chisels, a ledger, iron wedges.' }, fail: { loot: 0.8, text: 'Only rust and mouse nests.' } },
      ] },
    tower: { title: 'Greywatch', text: 'Half the tower has fallen. The top still stands, and from up there you could see for leagues.',
      choices: [
        { text: 'Climb to the top', check: 'scout', diff: 3, ok: { loot: 0.8, reveal: 3, extra: { knowledge: 4 }, text: 'You mapped the land for miles: new places to explore.' }, fail: { loot: 0.6, hurt: 0.5, reveal: 1, text: 'The stairs gave way. You saw a little before you fell.' } },
        { text: 'Salvage the iron fittings', check: 'craft', diff: 3, ok: { loot: 1.5, text: 'Hinges, brackets, arrowheads. Good iron.' }, fail: { loot: 0.9, text: 'Most of it was rusted through.' } },
      ] },
    archive: { title: 'Lantern Deep', text: 'Steps lead down into a flooded hall of shelves. Dry books on the upper rows. In the dark water, something moves.',
      choices: [
        { text: 'Wade in for the deep shelves', check: 'combat', diff: 5, ok: { loot: 1.4, relic: 'schematics', text: 'You beat back the thing in the water and found a case of drawings: forges, alloys, gears.' }, fail: { loot: 0.6, hurt: 0.6, kill: 0.08, text: 'It dragged at you in the dark. You fled with what you held.' } },
        { text: 'Take only the dry books', check: 'scout', diff: 3, ok: { loot: 1.0, text: 'Armfuls of books: farming, stonework, medicine.' }, fail: { loot: 0.5, text: 'Most crumbled to dust.' } },
      ] },
    den: { title: 'The Gnawing Dark', text: 'A cave mouth littered with bones. The smell is unbearable. The stalkers that hunt your camp at night sleep in here by day.',
      choices: [
        { text: 'Burn them out', check: 'combat', diff: 6, ok: { loot: 1, clear: 'beast', text: 'Smoke and fire and screaming. The den is empty. Nights will be quieter.' }, fail: { loot: 0.3, hurt: 0.8, kill: 0.15, text: 'They came out faster than you expected.' } },
        { text: 'Seal the cave mouth', check: 'build', diff: 4, ok: { loot: 0.4, clear: 'beast', text: 'Rocks and timber. Whatever is inside stays inside, for now.' }, fail: { loot: 0.2, hurt: 0.4, text: 'You could not finish before dusk.' } },
      ] },
    raidcamp: { title: 'Cinder Hold', text: 'The Ash Raiders\' camp: tents, a stockade, stolen goods piled high. Most of the band is out. A few guards play dice by the fire.',
      choices: [
        { text: 'Attack the guards', check: 'combat', diff: 7, ok: { loot: 1.3, clear: 'raider', text: 'You burned the stockade and took back what they stole. The raiders will think twice.' }, fail: { loot: 0.2, hurt: 0.9, kill: 0.18, text: 'More of them than you thought.' } },
        { text: 'Sneak in and steal', check: 'scout', diff: 5, ok: { loot: 0.9, text: 'In and out with full packs. They never saw you.' }, fail: { loot: 0.2, hurt: 0.6, kill: 0.06, text: 'A dog barked.' } },
      ] },
    garrison: { title: 'Fort Hallow', text: 'The last fort of the old Guard. Hollow things walk its walls in rusted armour. In the keep, a banner still hangs.',
      choices: [
        { text: 'Fight through to the keep', check: 'combat', diff: 8, ok: { loot: 1.2, relic: 'banner', text: 'You cut down the dead guards and took the banner. It is heavier than it looks.' }, fail: { loot: 0.4, hurt: 1, kill: 0.2, text: 'The dead do not tire.' } },
        { text: 'Scale the wall at night', check: 'scout', diff: 7, ok: { loot: 0.7, relic: 'banner', text: 'Over the wall, into the keep, out with the banner before dawn.' }, fail: { loot: 0.4, hurt: 0.7, kill: 0.1, text: 'They hear better than you hoped.' } },
      ] },
    millbrook: { title: 'Millbrook', text: 'A palisaded village around a working mill. Free folk, wary but not hostile. Their headwoman offers trade, and asks for help.',
      choices: [
        { text: 'Trade 20 food for 12 metal', check: null, trade: { give: { food: 20 }, get: { metal: 12 } }, ok: { loot: 0, rep: 1, text: 'A fair deal. They will remember you.' } },
        { text: 'Help repair their mill', check: 'build', diff: 4, ok: { loot: 0, recruit: 1, rep: 2, extra: { stone: 10, knowledge: 6 }, text: 'The wheel turns again. A young millwright asks to come back with you.' }, fail: { loot: 0, rep: 1, text: 'You did what you could.' } },
      ] },
    stranded: { title: 'Smoke on the Ridge', text: 'A signal fire. Around it, a small group: hungry, frightened, a child among them. They watch your weapons.',
      choices: [
        { text: 'Share your food and bring them home', check: null, ok: { loot: 0, recruit: 2, text: 'They follow you back. Two more mouths, two more pairs of hands.' }, cost: { food: 8 } },
        { text: 'Ask what they have seen', check: 'scout', diff: 2, ok: { loot: 0, reveal: 2, recruit: 1, text: 'They talk of places to the east, and one of them asks to come along.' }, fail: { loot: 0, reveal: 1, text: 'They told you a little, then left in the night.' } },
      ] },
    spire: { title: 'The Black Spire', text: 'A needle of black glass taller than any tree, humming. The ground around it is dead. You are not ready for whatever this is.',
      choices: [{ text: 'Turn back', check: null, ok: { loot: 0, text: 'Not yet.' } }] },
  };
  // Road events (rolled on the way to a site).
  D.ROAD = [
    { title: 'Ambush!', text: 'Ash Raiders step out of the trees, blades drawn. "Packs on the ground."',
      choices: [
        { text: 'Fight', check: 'combat', diff: 4, ok: { extra: { metal: 4 }, text: 'They broke and ran. You took their knives.' }, fail: { hurt: 0.7, kill: 0.05, lose: 0.4, text: 'They beat you and took a share of your supplies.' } },
        { text: 'Hand over some food', check: null, ok: { lose: 0.5, text: 'They took half your rations and laughed.' } },
      ] },
    { title: 'A Storm', text: 'The sky turns green-black. Hail the size of eggs.',
      choices: [
        { text: 'Push on through', check: 'scout', diff: 3, ok: { text: 'You found shelter under a ledge and lost no time.' }, fail: { hurt: 0.4, text: 'Bruised and soaked.' } },
        { text: 'Wait it out', check: null, ok: { delay: 3, text: 'You lost a few hours, nothing more.' } },
      ] },
    { title: 'An Injured Traveller', text: 'A man by the road with a broken leg, begging for help.',
      choices: [
        { text: 'Splint his leg', check: 'medic', diff: 3, ok: { recruit: 1, text: 'He limps along with you. He says he can cook.' }, fail: { text: 'You did your best. He would not come.' } },
        { text: 'Walk on', check: null, ok: { text: 'You did not look back.' } },
      ] },
  ];

  // ---- Objectives (the opening, then the long road) --------------------------------------
  D.OBJ = [
    { id: 'camp', text: 'Find a place to make camp', hint: 'Tap the clearing marked with light.' },
    { id: 'gather', text: 'Gather 10 wood and 6 stone', hint: 'Tap a tree or a rock.' },
    { id: 'fire', text: 'Light a campfire', hint: 'Tap BUILD, then place the Campfire.' },
    { id: 'shelter', text: 'Build a lean-to', hint: 'BUILD a Lean-to near the fire.' },
    { id: 'food', text: 'Forage 6 food', hint: 'Tap a berry bush.' },
    { id: 'night', text: 'Survive the night', hint: 'Stay near the fire.' },
    { id: 'stranger', text: 'Welcome the stranger', hint: '' },
    { id: 'jobs', text: 'Give someone a job', hint: 'Tap a survivor, then pick a job.' },
    { id: 'stock', text: 'Build a stockpile and a rain barrel', hint: '' },
    { id: 'defend', text: 'Build a lookout and 6 barricades', hint: 'Raiders are coming.' },
    { id: 'raid', text: 'Repel the raid', hint: 'Sound the alarm if needed.' },
    { id: 'expedition', text: 'Send an expedition', hint: 'Tap the map button.' },
    { id: 'era2', text: 'Raise the Hearth', hint: 'Tap the campfire, then Upgrade.' },
    { id: 'grow', text: 'Grow to 8 survivors', hint: '' },
    { id: 'masonry', text: 'Research Masonry', hint: 'Build a Scholar\'s Study.' },
    { id: 'banner', text: 'Recover the Old Guard Banner', hint: 'It lies at Fort Hallow.' },
    { id: 'era3', text: 'Raise the Longhall', hint: '' },
    { id: 'free', text: 'Hold fast', hint: 'Grow, explore, defend.' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
