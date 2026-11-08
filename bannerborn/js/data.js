// Bannerborn — game data. Pure: no DOM. Loaded in the browser (window.BB) and in Node (require).
(function (root) {
  const BB = root.BB = root.BB || {};

  // ---- tints: one palette for every dyeable layer. rot = hue rotation (for two-tone gilded pieces),
  // col = colorize target (for silver plate, helm, shield), l = lightness multiplier.
  BB.TINTS = [
    { id: 'natural', name: 'Natural', rot: 0, col: null, l: 1 },
    { id: 'crimson', name: 'Crimson', rot: -45, col: { h: 355, s: 0.55 }, l: 0.95 },
    { id: 'emerald', name: 'Emerald', rot: 85, col: { h: 140, s: 0.45 }, l: 0.95 },
    { id: 'azure', name: 'Azure', rot: 170, col: { h: 210, s: 0.5 }, l: 1 },
    { id: 'violet', name: 'Violet', rot: 230, col: { h: 275, s: 0.45 }, l: 0.95 },
    { id: 'obsidian', name: 'Obsidian', rot: 0, col: { h: 230, s: 0.12 }, l: 0.45 },
    { id: 'ivory', name: 'Ivory', rot: 0, col: { h: 45, s: 0.18 }, l: 1.35 },
    { id: 'sunfire', name: 'Sunfire', rot: -20, col: { h: 30, s: 0.7 }, l: 1.05 },
  ];
  BB.SKINS = [
    { id: 'fair', name: 'Fair', h: 0, s: 0.8, l: 1.12 },
    { id: 'tan', name: 'Tan', h: 0, s: 1, l: 1 },
    { id: 'bronze', name: 'Bronze', h: -4, s: 1.05, l: 0.78 },
    { id: 'deep', name: 'Deep', h: -6, s: 0.85, l: 0.55 },
    { id: 'ashen', name: 'Ashen', h: 150, s: 0.25, l: 0.92 },
  ];
  BB.HAIRS = [
    { id: 'copper', name: 'Copper', col: null, l: 1 },
    { id: 'raven', name: 'Raven', col: { h: 220, s: 0.15 }, l: 0.42 },
    { id: 'gold', name: 'Golden', col: { h: 46, s: 0.75 }, l: 1.25 },
    { id: 'snow', name: 'Snow', col: { h: 210, s: 0.06 }, l: 1.55 },
    { id: 'rose', name: 'Rose', col: { h: 330, s: 0.55 }, l: 1.1 },
    { id: 'chestnut', name: 'Chestnut', col: { h: 22, s: 0.5 }, l: 0.7 },
  ];

  // ---- callings (classes). weapon = which art layers draw; basic = attack clip
  BB.CALLINGS = {
    vanguard: {
      name: 'Vanguard', role: 'Tank', color: '#5aa9ff', slash: 'azure',
      blurb: 'Sword and shield. Holds the line, draws every blade to itself.',
      weapon: 'sword', offhand: 'shield', basic: ['Attack1', 'Attack2'], range: 1.15, ranged: false,
      base: { hp: 190, atk: 15, def: 9, spd: 3.1, crit: 0.05, aspd: 1 },
      grow: { hp: 24, atk: 2.1, def: 1.1 },
      skill: { id: 'shieldwall', name: 'Shield Wall', cd: 11, desc: 'Taunt nearby foes and halve damage taken for 4 s.' },
    },
    berserker: {
      name: 'Berserker', role: 'Bruiser', color: '#ff5a4a', slash: 'crimson',
      blurb: 'A great axe and no fear. Cleaves crowds, drinks from every wound.',
      weapon: 'axe', offhand: null, basic: ['Attack4', 'Attack1'], range: 1.25, ranged: false, cleave: true,
      base: { hp: 165, atk: 21, def: 5, spd: 3.3, crit: 0.08, aspd: 0.9 },
      grow: { hp: 20, atk: 2.8, def: 0.7 },
      skill: { id: 'leap', name: 'Ravager Leap', cd: 9, desc: 'Leap onto a foe and smash the ground around it.' },
    },
    ranger: {
      name: 'Ranger', role: 'Marksman', color: '#9be15d', slash: 'emerald',
      blurb: 'Bow first, questions never. Picks off casters before they chant.',
      weapon: 'sword', offhand: null, basic: ['Attack3'], range: 5.2, ranged: true, proj: 'arrow',
      base: { hp: 125, atk: 19, def: 4, spd: 3.4, crit: 0.14, aspd: 1 },
      grow: { hp: 15, atk: 2.6, def: 0.5 },
      skill: { id: 'volley', name: 'Arrow Storm', cd: 10, desc: 'Rain arrows on the thickest knot of foes.' },
    },
    arcanist: {
      name: 'Arcanist', role: 'Caster', color: '#c28bff', slash: 'violet',
      blurb: 'Bare hands, burning words. Flames that turn a horde to ash.',
      weapon: null, offhand: null, basic: ['Attack5'], range: 4.6, ranged: true, proj: 'bolt',
      base: { hp: 115, atk: 23, def: 3, spd: 3.2, crit: 0.08, aspd: 0.85 },
      grow: { hp: 13, atk: 3.1, def: 0.4 },
      skill: { id: 'flame', name: 'Dragonbreath', cd: 8, desc: 'A cone of fire that burns everything in front.' },
    },
    warpriest: {
      name: 'Warpriest', role: 'Healer', color: '#ffd35a', slash: 'sunfire',
      blurb: 'Shield in one hand, light in the other. Nobody falls on their watch.',
      weapon: null, offhand: 'shield', basic: ['Attack5'], range: 3.8, ranged: true, proj: 'light',
      base: { hp: 150, atk: 13, def: 7, spd: 3.1, crit: 0.05, aspd: 0.95 },
      grow: { hp: 19, atk: 1.7, def: 0.9 },
      skill: { id: 'sanctuary', name: 'Sanctuary', cd: 12, desc: 'Heal every ally nearby and cleanse their wounds.' },
    },
  };
  BB.CALLING_ORDER = ['vanguard', 'berserker', 'ranger', 'arcanist', 'warpriest'];

  // ---- legendary heroes: fixed art, join through the story
  BB.LEGENDS = {
    sera: { name: 'Sera Nightveil', title: 'the Thorn Witch', art: 'witch', calling: 'arcanist', color: '#b06cff',
      lore: 'Exiled for speaking with the dead, she is the only one who can hear the Cantor sing.' },
    ahmos: { name: 'Ahmos', title: 'the Sunguard', art: 'sunguard', calling: 'vanguard', color: '#ffc240',
      lore: 'Last shield of the drowned Sun Temple. He has not lost a caravan in nineteen years.' },
    kestrel: { name: 'Kestrel', title: 'the Dune Shade', art: 'shade', calling: 'berserker', color: '#8a9bb0',
      lore: 'A knife for hire who sold the wrong secret. Fights like a sandstorm.' },
    talia: { name: 'Talia Sunblade', title: 'of the Ninth Banner', art: 'sunblade', calling: 'ranger', color: '#4fd0e0',
      lore: 'The only other banner-captain alive. She brought the last of her company to your fire.' },
  };

  // ---- foes. art = atlas, scale = draw size, clips mapped per action
  BB.FOES = {
    ghoul: { name: 'Bone Reaver', art: 'ghoul', hp: 70, atk: 10, def: 1, spd: 3.5, range: 1.05, aspd: 1.2, xp: 9, gold: 3,
      atkClips: ['Attack1', 'Attack2'], r: 0.32 },
    warden: { name: 'Bonewarden', art: 'warden', hp: 160, atk: 16, def: 6, spd: 2.4, range: 1.15, aspd: 0.8, xp: 18, gold: 6,
      atkClips: ['Attack4', 'Attack1'], block: 0.4, r: 0.38 },
    necro: { name: 'Gravecaller', art: 'necro', hp: 85, atk: 13, def: 2, spd: 2.7, range: 4.6, aspd: 0.75, xp: 16, gold: 6,
      atkClips: ['Attack1'], ranged: true, proj: 'curse', summons: true, r: 0.32 },
    ballista: { name: 'Bone Ballista', art: null, hp: 140, atk: 18, def: 5, spd: 0, range: 7.5, aspd: 0.45, xp: 14, gold: 5,
      ranged: true, proj: 'bolt', turret: true, r: 0.45 },
    portal: { name: 'Gravegate', art: null, hp: 420, atk: 0, def: 4, spd: 0, range: 0, aspd: 0, xp: 40, gold: 20, gate: true, r: 0.7 },
    // bosses
    ossric: { name: 'Ossric, the Gravewarden', art: 'warden', boss: true, scale: 1.9, tint: 'crimson', hp: 2300, atk: 28, def: 10,
      spd: 2.3, range: 1.9, aspd: 0.7, xp: 260, gold: 160, atkClips: ['Attack4', 'Attack1', 'Attack2'], r: 0.75,
      moves: ['slam', 'charge', 'summon'] },
    sallow: { name: 'Sallow, the Dune Necromancer', art: 'necro', boss: true, scale: 1.75, tint: 'sunfire', hp: 2700, atk: 26, def: 6,
      spd: 2.6, range: 5.5, aspd: 0.9, xp: 340, gold: 220, atkClips: ['Attack1'], ranged: true, proj: 'curse', r: 0.7,
      moves: ['barrage', 'blink', 'summon', 'gas'] },
    kestrelfoe: { name: 'Kestrel, the Dune Shade', art: 'shade', boss: true, scale: 1.25, hp: 1500, atk: 24, def: 6,
      spd: 4.0, range: 1.2, aspd: 1.4, xp: 200, gold: 120, atkClips: ['Attack1', 'Attack2', 'Attack4'], r: 0.4,
      moves: ['dash', 'dash', 'vanish'] },
    vesh: { name: 'Vesh Morrow, the Bone Cantor', art: 'necro', boss: true, scale: 2.15, tint: 'emerald', hp: 6400, atk: 32, def: 9,
      spd: 2.4, range: 6, aspd: 1, xp: 600, gold: 500, atkClips: ['Attack1'], ranged: true, proj: 'curse', r: 0.85,
      moves: ['barrage', 'deathcone', 'gates', 'slam', 'blink'] },
  };
  BB.ELITES = [
    { id: 'blood', name: 'Bloodbound', tint: 'crimson', hp: 1.8, atk: 1.5, scale: 1.2 },
    { id: 'frost', name: 'Frostbone', tint: 'azure', hp: 2.0, atk: 1.2, scale: 1.2, slow: true },
    { id: 'gilded', name: 'Gilded', tint: 'sunfire', hp: 2.6, atk: 1.3, scale: 1.3, gold: 4 },
  ];

  // ---- gear. looks are art layers; weapon type follows the hero's calling
  BB.SLOTS = ['head', 'chest', 'legs', 'weapon', 'offhand', 'charm'];
  BB.SLOT_NAME = { head: 'Head', chest: 'Chest', legs: 'Legs', weapon: 'Weapon', offhand: 'Shield', charm: 'Charm' };
  BB.RARITY = [
    { name: 'Common', color: '#c9c3b5', mult: 1 },
    { name: 'Rare', color: '#5aa9ff', mult: 1.45 },
    { name: 'Epic', color: '#c070ff', mult: 2.0 },
    { name: 'Legendary', color: '#ffb22e', mult: 2.8 },
  ];
  BB.GEAR = {
    head: [
      { look: 'hair', names: ['Bandana', 'Warband Circlet', 'Battle Braid'], stat: { hp: 10, crit: 0.01 } },
      { look: 'helm', names: ['Iron Helm', 'Knight Greathelm', 'Crusader Helm'], stat: { hp: 18, def: 1.5 } },
    ],
    chest: [
      { look: 'chestA', names: ['Gilded Jerkin', 'Sunplate Vest', 'Champion Harness'], stat: { hp: 22, atk: 1.5, def: 1.5 } },
      { look: 'chestB', names: ['Steel Cuirass', 'Bastion Plate', 'Oathguard Mail'], stat: { hp: 30, def: 3 } },
    ],
    legs: [
      { look: 'legsA', names: ['Gilded Breeches', 'Strider Greaves', 'Duelist Leggings'], stat: { hp: 12, spd: 0.08 } },
      { look: 'legsB', names: ['Plate Greaves', 'Bastion Tassets', 'Iron Legguards'], stat: { hp: 18, def: 1.5 } },
    ],
    weapon: {
      sword: { names: ['Arming Sword', 'Banner Blade', 'Oathkeeper'], stat: { atk: 4 } },
      axe: { names: ['War Axe', 'Bonecleaver', 'Headsman'], stat: { atk: 5.5 } },
      bow: { names: ['Hunting Bow', 'Longbow', 'Galeshot'], stat: { atk: 4.5, crit: 0.02 } },
      focus: { names: ['Ember Focus', 'Runed Orb', 'Starglass'], stat: { atk: 5 } },
    },
    offhand: [{ look: 'shield', names: ['Kite Shield', 'Tower Shield', 'Aegis'], stat: { hp: 20, def: 3 } }],
    charm: [{ look: null, names: ['Wolf Fang', 'Saint\'s Ash', 'Bone Dice', 'Gate Shard', 'Banner Pin'], stat: { atk: 1.5, crit: 0.03, hp: 8 } }],
  };
  BB.weaponType = (calling) => ({ vanguard: 'sword', berserker: 'axe', ranger: 'bow', arcanist: 'focus', warpriest: 'focus' })[calling];

  // ---- perks: picked one of three at each level-up
  BB.PERKS = {
    any: [
      { id: 'tough', name: 'Iron Hide', desc: '+12% max health', mod: { hpPct: 0.12 } },
      { id: 'sharp', name: 'Whetstone', desc: '+10% attack', mod: { atkPct: 0.1 } },
      { id: 'quick', name: 'Fleet Foot', desc: '+8% move speed', mod: { spdPct: 0.08 } },
      { id: 'keen', name: 'Keen Eye', desc: '+6% critical chance', mod: { crit: 0.06 } },
      { id: 'guard', name: 'Stout Guard', desc: '+3 defence', mod: { def: 3 } },
      { id: 'fury', name: 'Battle Rhythm', desc: '+10% attack speed', mod: { aspdPct: 0.1 } },
      { id: 'focus', name: 'Drillmaster', desc: '-12% skill cooldown', mod: { cdPct: -0.12 } },
      { id: 'leech', name: 'Bloodthirst', desc: 'Heal 4% of damage dealt', mod: { leech: 0.04 } },
    ],
    vanguard: [
      { id: 'bulwark', name: 'Bulwark', desc: 'Shield Wall lasts 2 s longer', mod: { skillDur: 2 } },
      { id: 'thorns', name: 'Thornplate', desc: 'Reflect 20% of melee damage', mod: { thorns: 0.2 } },
    ],
    berserker: [
      { id: 'rampage', name: 'Rampage', desc: 'Kills reset Ravager Leap by 2 s', mod: { killCd: 2 } },
      { id: 'redmist', name: 'Red Mist', desc: '+25% attack below half health', mod: { lowHpAtk: 0.25 } },
    ],
    ranger: [
      { id: 'pierce', name: 'Piercing Shot', desc: 'Arrows pass through a second foe', mod: { pierce: 1 } },
      { id: 'storm', name: 'Thunderhead', desc: 'Arrow Storm covers a wider area', mod: { skillArea: 0.5 } },
    ],
    arcanist: [
      { id: 'ignite', name: 'Ignite', desc: 'Bolts set foes burning', mod: { burn: 1 } },
      { id: 'wildfire', name: 'Wildfire', desc: 'Dragonbreath deals +40% damage', mod: { skillDmg: 0.4 } },
    ],
    warpriest: [
      { id: 'mercy', name: 'Mercy', desc: 'Sanctuary heals 40% more', mod: { skillDmg: 0.4 } },
      { id: 'aegis', name: 'Aegis of Dawn', desc: 'Sanctuary shields allies too', mod: { shieldHeal: 1 } },
    ],
  };

  // ---- bonds: team synergies from the deployed four
  BB.BONDS = [
    { id: 'full', name: 'Full Banner', desc: 'Four different callings: +10% to every stat.',
      test: (cs) => new Set(cs).size >= 4, mod: { hpPct: 0.1, atkPct: 0.1, def: 1 } },
    { id: 'sorcery', name: 'Shield & Sorcery', desc: 'A Vanguard guards a caster: casters +15% attack.',
      test: (cs) => cs.includes('vanguard') && (cs.includes('arcanist') || cs.includes('warpriest')), mod: { casterAtk: 0.15 } },
    { id: 'blood', name: 'Bloodpact', desc: 'Two or more Berserkers: +12% attack speed for all.',
      test: (cs) => cs.filter((c) => c === 'berserker').length >= 2, mod: { aspdPct: 0.12 } },
    { id: 'line', name: 'Hold the Line', desc: 'Vanguard with a Ranger: ranged heroes +12% crit damage, +5% crit.',
      test: (cs) => cs.includes('vanguard') && cs.includes('ranger'), mod: { rangedCrit: 0.05 } },
    { id: 'blessed', name: 'Blessed', desc: 'A Warpriest marches with you: the first hero to fall rises again.',
      test: (cs) => cs.includes('warpriest'), mod: { revive: 1 } },
    { id: 'steel', name: 'Wall of Steel', desc: 'Two or more shields: +3 defence for all.',
      test: (cs) => cs.filter((c) => c === 'vanguard' || c === 'warpriest').length >= 2, mod: { def: 3 } },
  ];

  // ---- stronghold buildings
  BB.BUILDINGS = {
    barracks: { name: 'Barracks', desc: 'Room for more heroes in the warband.', costs: [0, 120, 320, 700], effect: (l) => 'Roster ' + (5 + l * 2) },
    forge: { name: 'War Forge', desc: 'Finer gear from every victory.', costs: [0, 150, 400, 900], effect: (l) => '+' + l * 8 + '% rare drops' },
    yard: { name: 'Training Yard', desc: 'Heroes learn faster.', costs: [0, 100, 280, 650], effect: (l) => '+' + l * 15 + '% XP' },
    chapel: { name: 'Chapel of Dawn', desc: 'Faster recovery, stronger heals.', costs: [0, 130, 350, 800], effect: (l) => '+' + l * 10 + '% healing' },
    market: { name: 'Market', desc: 'More coin, and a merchant with wares.', costs: [0, 110, 300, 720], effect: (l) => '+' + l * 12 + '% gold' },
  };
  BB.HIRE_COST = (n) => 60 + n * 45;

  // ---- campaign
  BB.REGIONS = [
    { id: 'vale', name: 'Greenvale', biome: 'vale', blurb: 'Farms and forest gone quiet. The Bone Tide came here first.' },
    { id: 'sand', name: 'The Sunscar', biome: 'sand', blurb: 'Palms, ruins and buried temples, and something singing under the dunes.' },
    { id: 'gate', name: 'The Cantor\'s Gate', biome: 'vale', night: true, blurb: 'Where the first Gravegate opened. Where it ends.' },
  ];
  // type: rout (clear every wave) | gates (destroy every gate) | defend (keep the ward alive) | boss | duel
  BB.MISSIONS = [
    { id: 'm1', region: 'vale', name: 'The Burning Hamlet', type: 'rout', level: 1, layout: 'village',
      waves: [['ghoul', 3], ['ghoul', 4], ['ghoul', 3, 'warden', 1]], tutorial: true,
      brief: 'Ashford is burning. Drive the reavers out of the hamlet.', reward: { gold: 60 } },
    { id: 'm2', region: 'vale', name: 'Bones at the Mill', type: 'gates', level: 2, layout: 'mill', gates: 1,
      waves: [['ghoul', 4], ['ghoul', 3, 'necro', 1]],
      brief: 'A Gravegate has torn open beside the old mill. Smash it before it spills more dead.', reward: { gold: 80 } },
    { id: 'm3', region: 'vale', name: 'Witch of the Thornwood', type: 'defend', level: 3, layout: 'grove', ward: 'cage', time: 50,
      waves: [['ghoul', 4], ['warden', 2, 'ghoul', 3], ['necro', 2, 'ghoul', 4], ['warden', 2, 'necro', 1]], recruit: 'sera',
      brief: 'The dead want the caged witch. Keep the cage standing until the spell breaks.', reward: { gold: 100 } },
    { id: 'm4', region: 'vale', name: 'The Old Watch', type: 'gates', level: 4, layout: 'ruins', gates: 3, elites: 1,
      waves: [['ghoul', 4], ['necro', 1, 'ghoul', 3]],
      brief: 'Three gates ring the fallen watchtower. Close them all.', reward: { gold: 130 } },
    { id: 'm5', region: 'vale', name: 'Ossric, the Gravewarden', type: 'boss', level: 5, layout: 'courtyard', boss: 'ossric',
      waves: [['ghoul', 3]],
      brief: 'The warden of Greenvale\'s dead stands in the chapel yard. Break him and the vale is free.', reward: { gold: 200 } },
    { id: 'm6', region: 'sand', name: 'Oasis Ambush', type: 'rout', level: 6, layout: 'oasis', elites: 1,
      waves: [['ghoul', 5], ['warden', 2, 'necro', 2], ['ghoul', 6, 'warden', 1]],
      brief: 'The last oasis on the road east. Something waits in the palms.', reward: { gold: 150 } },
    { id: 'm7', region: 'sand', name: 'Caravan of the Sun', type: 'defend', level: 7, layout: 'caravan', ward: 'cart', time: 60,
      waves: [['ghoul', 5], ['ballista', 1, 'ghoul', 4], ['necro', 2, 'warden', 2], ['ghoul', 6, 'necro', 1]], recruit: 'ahmos',
      brief: 'A Sun Temple caravan is pinned in the dunes. Its guard is one man. Help him.', reward: { gold: 180 } },
    { id: 'm8', region: 'sand', name: 'The Shade in the Dunes', type: 'duel', level: 8, layout: 'dunes', boss: 'kestrelfoe', recruit: 'kestrel',
      waves: [['ghoul', 3]],
      brief: 'A knife for hire has been killing Gravecallers, and now your scouts. Find out why.', reward: { gold: 180 } },
    { id: 'm9', region: 'sand', name: 'Tombs of Glass', type: 'gates', level: 9, layout: 'tombs', gates: 4, elites: 2,
      waves: [['ballista', 2, 'ghoul', 4], ['warden', 2, 'necro', 2]],
      brief: 'Four gates feed the necromancer\'s army from the old tombs.', reward: { gold: 240 } },
    { id: 'm10', region: 'sand', name: 'Sallow, the Dune Necromancer', type: 'boss', level: 10, layout: 'temple', boss: 'sallow',
      waves: [['ghoul', 4], ['necro', 1]],
      brief: 'The singer under the sand. End her chant.', reward: { gold: 320 } },
    { id: 'm11', region: 'gate', name: 'March of Banners', type: 'rout', level: 11, layout: 'march', elites: 3, recruit: 'talia',
      waves: [['ghoul', 6, 'warden', 2], ['necro', 3, 'ghoul', 5], ['warden', 4, 'ballista', 1], ['ghoul', 8, 'necro', 2]],
      brief: 'Every banner left in the world rides with you to the Cantor\'s Gate.', reward: { gold: 300 } },
    { id: 'm12', region: 'gate', name: 'Vesh Morrow, the Bone Cantor', type: 'boss', level: 12, layout: 'gate', boss: 'vesh',
      waves: [['ghoul', 4], ['warden', 2]],
      brief: 'He sang the dead awake. Silence him.', reward: { gold: 600 } },
  ];

  // story cards: before (pre) and after (post) a mission. speaker: 'captain', a legend id, or a name
  BB.STORY = {
    intro: [
      ['narr', 'Nine banners once stood between the living and the dead.'],
      ['narr', 'Then the Gravegates opened, and Vesh Morrow began to sing. The dead got up to listen.'],
      ['narr', 'Eight banners fell. One is left, carried by a captain with no army.'],
      ['narr', 'So build one.'],
    ],
    m1pre: [['captain', 'Smoke over Ashford. Banner up — we start here.']],
    m1post: [['captain', 'First blood for the banner. They came through a gate somewhere north. We find it.']],
    m2post: [['captain', 'A gate dies like anything else: hit it until it stops.'], ['narr', 'A scout rides in: a witch caged in the Thornwood, and the dead closing on her.']],
    m3pre: [['sera', 'You took your time. Keep them off this cage and I will make it worth your while.']],
    m3post: [['sera', 'The Cantor sings and they rise. I can hear the song. I can hear where it comes from.'], ['captain', 'Then you march with us.'], ['narr', 'Sera Nightveil joins the warband.']],
    m4post: [['sera', 'The watchtower stones are cold. Something huge walks the chapel yard beyond.']],
    m5pre: [['narr', 'Ossric the Gravewarden. Once a knight of the Third Banner. Now he guards the dead of the whole vale.']],
    m5post: [['captain', 'Greenvale is free. Raise the banner over Ashford.'], ['sera', 'The song is coming from the south. From under the Sunscar.']],
    m6post: [['captain', 'The oasis holds. East, there\'s smoke — a caravan.']],
    m7pre: [['ahmos', 'Strangers with a banner. Good. Take the left flank — I have the right. I have always had the right.']],
    m7post: [['ahmos', 'Nineteen years, no caravan lost. You kept the count. My shield is yours.'], ['narr', 'Ahmos the Sunguard joins the warband.']],
    m8pre: [['kestrel', 'You\'re the banner everyone talks about. Let\'s see if you\'re worth the trouble.']],
    m8post: [['kestrel', 'Fine. You\'re worth it. Sallow put a price on my head. I\'d like to put one on hers.'], ['narr', 'Kestrel the Dune Shade joins the warband.']],
    m9post: [['sera', 'The tomb gates were feeding her. She is alone now under the temple.']],
    m10pre: [['narr', 'Sallow, the Dune Necromancer, keeps the Cantor\'s song alive in the south.']],
    m10post: [['captain', 'The Sunscar is quiet.'], ['narr', 'Riders come in through the night, under a torn blue banner.']],
    m11pre: [['talia', 'Talia Sunblade, Ninth Banner. What\'s left of it. We heard there was still a captain. We came to march.'], ['narr', 'Talia Sunblade joins the warband.']],
    m11post: [['talia', 'The gate is open ahead. He\'s singing louder.']],
    m12pre: [['narr', 'Vesh Morrow, the Bone Cantor. The first gate. The last song.']],
    m12post: [['captain', 'Silence.'], ['narr', 'The dead lie down. Nine banners are carried home under one. Yours.'], ['narr', 'The campaign is won — but gates still flicker across the land. The Endless Gate awaits warbands that want more.']],
  };

  BB.NAMES = {
    first: ['Aldric', 'Brynn', 'Cassia', 'Dain', 'Edda', 'Faolan', 'Greta', 'Hale', 'Isolde', 'Joren', 'Kaia', 'Lucan', 'Mira',
      'Niall', 'Orla', 'Pell', 'Quill', 'Rhosyn', 'Soren', 'Tamsin', 'Ulric', 'Vala', 'Wren', 'Yara', 'Bram', 'Ingrid', 'Osric', 'Liesl',
      'Rook', 'Maren', 'Theron', 'Ash', 'Elske', 'Garran', 'Hild', 'Ivo'],
    epithet: ['the Bold', 'Ironhand', 'of Ashford', 'Stormborn', 'the Grim', 'Brightshield', 'the Quick', 'Oathsworn', 'Redaxe',
      'the Wanderer', 'Hollowbane', 'the Unbroken', 'Greycloak', 'Dawnblade', 'the Patient', 'Wolfsbane', 'Gravebane', 'the Young'],
  };
  BB.SIGILS = ['crown', 'sword', 'tower', 'sun', 'star', 'wolf', 'flame', 'moon'];
  BB.BANNER_COLORS = ['#b3242c', '#1f5fae', '#2f8a4a', '#6a3aa0', '#c7952b', '#1c1c24', '#e8e1cf', '#c2541c'];

  if (typeof module !== 'undefined') module.exports = BB;
})(typeof window !== 'undefined' ? window : globalThis);
