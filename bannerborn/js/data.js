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
  BB.CALLINGS.monk = {
    name: 'Monk', role: 'Striker', color: '#ffa04a', slash: 'sunfire',
    blurb: 'Fists, feet and an empty mind. Fastest hands in the warband.',
    weapon: null, offhand: null, basic: ['Attack1', 'Attack2', 'Kick'], range: 1.05, ranged: false,
    base: { hp: 150, atk: 16, def: 5, spd: 3.7, crit: 0.1, aspd: 1.3 },
    grow: { hp: 19, atk: 2.3, def: 0.7 },
    skill: { id: 'whirlwind', name: 'Whirlwind Kick', cd: 8, desc: 'A spinning leap that batters and scatters every foe around.' },
  };
  BB.CALLINGS.shadowblade = {
    name: 'Shadowblade', role: 'Assassin', color: '#7d8bff', slash: 'violet',
    blurb: 'Two knives and no shadow. Strikes where the enemy is weakest.',
    weapon: 'sword', offhand: null, basic: ['Attack1', 'Attack2', 'Attack3'], range: 1.1, ranged: false,
    base: { hp: 128, atk: 19, def: 4, spd: 3.6, crit: 0.18, aspd: 1.15 },
    grow: { hp: 16, atk: 2.7, def: 0.5 },
    skill: { id: 'shadowstep', name: 'Shadowstep', cd: 9, desc: 'Vanish, reappear behind the weakest foe and strike for a sure critical.' },
  };
  BB.CALLINGS.lancer = {
    name: 'Lancer', role: 'Skirmisher', color: '#4fd0b0', slash: 'emerald', forge: false,
    blurb: 'A long spear that skewers the front rank and the one behind it.',
    weapon: 'spear', offhand: null, basic: ['Attack1', 'Attack2'], range: 1.75, ranged: false, pierce: true,
    base: { hp: 172, atk: 17, def: 7, spd: 3.25, crit: 0.07, aspd: 0.95 },
    grow: { hp: 22, atk: 2.4, def: 0.9 },
    skill: { id: 'impale', name: 'Impaling Charge', cd: 9, desc: 'Charge in a straight line, spearing everything in the way.' },
  };
  BB.CALLING_ORDER = ['vanguard', 'berserker', 'ranger', 'arcanist', 'warpriest', 'monk', 'shadowblade', 'lancer'];
  BB.FORGE_CALLINGS = BB.CALLING_ORDER.filter((c) => BB.CALLINGS[c].forge !== false);
  // elements carried by mages and wraiths: bolt hue (rotation from the purple bolt) and an on-hit effect
  BB.ELEMENTS = {
    fire: { name: 'Fire', hue: 150, effect: 'burn', col: '#ff7a3a' }, frost: { name: 'Frost', hue: -70, effect: 'slow', col: '#8fd4ff' },
    blood: { name: 'Blood', hue: 110, effect: 'leech', col: '#ff4a5a' }, arcane: { name: 'Arcane', hue: 0, effect: 'crit', col: '#c08bff' },
    shadow: { name: 'Shadow', hue: 30, effect: 'rend', col: '#9a7aff' }, holy: { name: 'Holy', hue: 190, effect: 'heal', col: '#ffe9a0' },
    storm: { name: 'Storm', hue: -110, effect: 'chain', col: '#9ff' }, nature: { name: 'Nature', hue: -160, effect: 'heal', col: '#8f8' },
  };

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
    brenna: { name: 'Brenna Redmane', title: 'the Shieldmaiden', art: 'brenna', calling: 'lancer', color: '#ff6a3a',
      lore: 'She held the river gate of Aldmere alone for a night and a day. The city fell anyway. She did not.' },
    reaper: { name: 'Silas Grey', title: 'the Grave-Reaper', art: 'reaper', calling: 'shadowblade', color: '#9fb0c0',
      lore: 'Gravedigger of the capital. When the dead started walking, he kept digging — with the sickles.' },
  };

  // ---- foes. art = atlas, scale = draw size, clips mapped per action
  BB.FOES = {
    ghoul: { name: 'Bone Reaver', art: 'ghoul', hp: 70, atk: 10, def: 1, spd: 3.5, range: 1.05, aspd: 1.2, xp: 9, gold: 3,
      atkClips: ['Attack1', 'Attack2'], r: 0.32 },
    warden: { name: 'Bonewarden', art: 'warden', hp: 160, atk: 16, def: 6, spd: 2.4, range: 1.15, aspd: 0.8, xp: 18, gold: 6,
      atkClips: ['Attack4', 'Attack1'], block: 0.4, r: 0.38, role: 'tank' },
    necro: { name: 'Gravecaller', art: 'necro', hp: 85, atk: 13, def: 2, spd: 2.7, range: 4.6, aspd: 0.75, xp: 16, gold: 6,
      atkClips: ['Attack1'], ranged: true, proj: 'curse', summons: true, r: 0.32 },
    ballista: { name: 'Bone Ballista', art: null, hp: 140, atk: 18, def: 5, spd: 0, range: 7.5, aspd: 0.45, xp: 14, gold: 5,
      ranged: true, proj: 'bolt', turret: true, r: 0.45 },
    skel: { name: 'Skeleton Soldier', pool: 'skel', hp: 95, atk: 12, def: 3, spd: 2.9, range: 1.1, aspd: 1, xp: 11, gold: 4,
      atkClips: ['Attack1', 'Attack2'], r: 0.33 },
    skelshield: { name: 'Skeleton Shieldbearer', pool: 'skelshield', hp: 140, atk: 12, def: 7, spd: 2.5, range: 1.1, aspd: 0.85, xp: 15, gold: 5,
      atkClips: ['Attack1', 'Attack2'], block: 0.55, r: 0.35, role: 'tank' },
    skelarcher: { name: 'Skeleton Archer', pool: 'skelarcher', hp: 70, atk: 12, def: 1, spd: 2.7, range: 5.5, aspd: 0.7, xp: 13, gold: 5,
      atkClips: ['Attack3'], ranged: true, proj: 'arrow', r: 0.3 },
    wraith: { name: 'Wraith', pool: 'wraith', hp: 90, atk: 14, def: 2, spd: 3.6, range: 4.4, aspd: 0.8, xp: 17, gold: 6,
      atkClips: ['Attack5'], ranged: true, proj: 'curse', phase: true, r: 0.3 },
    warlock: { name: 'Cult Warlock', pool: 'warlock', hp: 110, atk: 15, def: 3, spd: 2.6, range: 5, aspd: 0.7, xp: 20, gold: 8,
      atkClips: ['Attack5'], ranged: true, proj: 'curse', firering: true, r: 0.32 },
    stalker: { name: 'Grave Stalker', art: 'shade', tint: 'crimson', hp: 80, atk: 15, def: 2, spd: 4.0, range: 1.05, aspd: 1.25, xp: 16, gold: 6,
      atkClips: ['Attack1', 'Attack2'], r: 0.3, role: 'assassin' },
    beastkin: { name: 'Beastkin Raider', pool: 'beast', hp: 150, atk: 17, def: 4, spd: 3.3, range: 1.15, aspd: 0.95, xp: 18, gold: 7,
      atkClips: ['Attack1', 'Attack2'], frenzy: true, r: 0.36 },
    regent: { name: 'The Pale Regent', pool: 'wraith', poolPick: 'wraith_005', boss: true, scale: 2.0, hp: 3300, atk: 28, def: 8,
      spd: 2.8, range: 5.5, aspd: 1, xp: 480, gold: 380, atkClips: ['Attack5'], ranged: true, proj: 'curse', r: 0.8,
      moves: ['elements', 'barrage', 'summonw', 'blink', 'firering'] },
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
    vesh: { name: 'Vesh Morrow, the Bone Cantor', art: 'necro', boss: true, scale: 2.15, tint: 'emerald', hp: 4300, atk: 32, def: 9,
      spd: 2.4, range: 6, aspd: 1, xp: 600, gold: 500, atkClips: ['Attack1'], ranged: true, proj: 'curse', r: 0.85,
      moves: ['barrage', 'deathcone', 'gates', 'slam', 'blink'] },
  };
  BB.ELITES = [
    { id: 'blood', name: 'Bloodbound', tint: 'crimson', hp: 1.8, atk: 1.5, scale: 1.2 },
    { id: 'frost', name: 'Frostbone', tint: 'azure', hp: 2.0, atk: 1.2, scale: 1.2, slow: true },
    { id: 'gilded', name: 'Gilded', tint: 'sunfire', hp: 2.6, atk: 1.3, scale: 1.3, gold: 4 },
  ];

  // ---- gear. looks are art layers; weapon type follows the hero's calling
  BB.SLOTS = ['weapon', 'chest', 'head', 'charm'];
  BB.SLOT_NAME = { weapon: 'Weapon', chest: 'Armour', head: 'Helm', charm: 'Charm' };
  BB.RARITY = [
    { name: 'Common', color: '#c9c3b5', mult: 1 },
    { name: 'Rare', color: '#5aa9ff', mult: 1.45 },
    { name: 'Epic', color: '#c070ff', mult: 2.0 },
    { name: 'Legendary', color: '#ffb22e', mult: 2.8 },
  ];
  // hero rarity: the tier a hero comes from
  BB.HERO_RARITY = [
    { name: 'Common', color: '#b9b2a2', mult: 1 },
    { name: 'Rare', color: '#5aa9ff', mult: 1.15 },
    { name: 'Epic', color: '#c070ff', mult: 1.32 },
    { name: 'Legendary', color: '#ffb22e', mult: 1.5 },
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
    weapon: {
      fist: { names: ['Iron Knuckles', 'Tiger Wraps', 'Fists of Dawn'], stat: { atk: 4, crit: 0.02 } },
      spear: { names: ['Boar Spear', 'Guard Lance', 'Dragonpike'], stat: { atk: 4.5, hp: 8 } },
      sword: { names: ['Arming Sword', 'Banner Blade', 'Oathkeeper'], stat: { atk: 4 } },
      axe: { names: ['War Axe', 'Bonecleaver', 'Headsman'], stat: { atk: 5.5 } },
      bow: { names: ['Hunting Bow', 'Longbow', 'Galeshot'], stat: { atk: 4.5, crit: 0.02 } },
      focus: { names: ['Ember Focus', 'Runed Orb', 'Starglass'], stat: { atk: 5 } },
    },
    charm: [{ look: null, names: ['Wolf Fang', 'Saint\'s Ash', 'Bone Dice', 'Gate Shard', 'Banner Pin'], stat: { atk: 1.5, crit: 0.03, hp: 8 } }],
  };
  BB.weaponType = (calling) => ({ vanguard: 'sword', berserker: 'axe', ranger: 'bow', arcanist: 'focus', warpriest: 'focus', monk: 'fist', shadowblade: 'sword', lancer: 'spear' })[calling];

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
    { id: 'shadows', name: 'Knives in the Dark', desc: 'A Shadowblade with a Monk or Ranger: +8% crit for all.',
      test: (cs) => cs.includes('shadowblade') && (cs.includes('monk') || cs.includes('ranger')), mod: { crit: 0.08 } },
    { id: 'pikewall', name: 'Pike Wall', desc: 'A Lancer beside a Vanguard: +15% attack for melee heroes.',
      test: (cs) => cs.includes('lancer') && cs.includes('vanguard'), mod: { meleeAtk: 0.15 } },
    { id: 'steel', name: 'Wall of Steel', desc: 'Two or more shields: +3 defence for all.',
      test: (cs) => cs.filter((c) => c === 'vanguard' || c === 'warpriest').length >= 2, mod: { def: 3 } },
  ];

  // ---- stronghold buildings
  // ---- campaign: chapters of stages. stage ids are 's<chapter>-<n>'
  // type: rout (clear every wave) | gates (destroy every gate) | defend (keep the ward alive) | boss | duel
  BB.CHAPTERS = [
    { id: 1, name: 'Greenvale', biome: 'vale', blurb: 'Farms and forest gone quiet. The Bone Tide came here first.', stages: [
      { name: 'Ashford Road', type: 'rout', layout: 'village', waves: [['ghoul', 2], ['ghoul', 2], ['ghoul', 3]], tutorial: true },
      { name: 'The Burning Hamlet', type: 'rout', layout: 'village', waves: [['ghoul', 2], ['ghoul', 2], ['ghoul', 2, 'skel', 1]] },
      { name: 'Bones at the Mill', type: 'gates', layout: 'mill', gates: 1, waves: [['ghoul', 2], ['skel', 1, 'ghoul', 2], ['skel', 2]] },
      { name: 'Witch of the Thornwood', type: 'defend', layout: 'grove', ward: 'cage', time: 70, legend: 'sera', waves: [['ghoul', 3], ['skel', 2, 'ghoul', 2], ['warden', 1, 'ghoul', 3], ['necro', 1, 'skel', 2], ['ghoul', 4]] },
      { name: 'Thornwood Depths', type: 'rout', layout: 'grove', waves: [['skel', 3, 'ghoul', 2], ['skelshield', 1, 'skelarcher', 2], ['stalker', 1, 'ghoul', 3], ['warden', 1, 'necro', 1, 'skel', 2], ['skel', 3, 'skelarcher', 2]] },
      { name: 'The Old Watch', type: 'gates', layout: 'ruins', gates: 2, waves: [['skel', 2, 'ghoul', 2], ['skelshield', 1, 'skelarcher', 2], ['stalker', 1, 'skel', 2], ['necro', 1, 'ghoul', 3]] },
      { name: 'Chapel Road', type: 'rout', layout: 'courtyard', waves: [['ghoul', 4, 'skel', 2], ['skelshield', 2, 'skelarcher', 2], ['stalker', 2, 'ghoul', 2], ['warden', 1, 'necro', 2, 'skel', 2], ['skelshield', 2, 'skelarcher', 3, 'stalker', 1]] },
      { name: 'Ossric, the Gravewarden', type: 'boss', layout: 'courtyard', boss: 'ossric', waves: [['ghoul', 3, 'skel', 1], ['skelarcher', 2, 'skel', 2], ['stalker', 1, 'ghoul', 3]] },
    ] },
    { id: 2, name: 'The Sunscar', biome: 'sand', elites: 1, blurb: 'Palms, ruins and buried temples, and something singing under the dunes.', stages: [
      { name: 'Oasis Ambush', type: 'rout', layout: 'oasis', waves: [['beastkin', 2, 'ghoul', 3], ['skelshield', 2, 'skelarcher', 2], ['stalker', 2, 'beastkin', 1], ['warden', 2, 'necro', 2], ['beastkin', 3, 'skelarcher', 3]] },
      { name: 'Glass Dunes', type: 'rout', layout: 'dunes', waves: [['ghoul', 4, 'beastkin', 2], ['skelarcher', 3, 'skelshield', 2], ['stalker', 2, 'ghoul', 3], ['beastkin', 3, 'necro', 2], ['warden', 2, 'skelarcher', 3, 'stalker', 1]] },
      { name: 'Caravan of the Sun', type: 'defend', layout: 'caravan', ward: 'cart', time: 85, legend: 'ahmos', waves: [['beastkin', 2, 'ghoul', 3], ['ballista', 1, 'beastkin', 2], ['stalker', 2, 'skel', 3], ['necro', 2, 'warden', 2], ['beastkin', 3, 'skelarcher', 2], ['beastkin', 3, 'necro', 1, 'stalker', 1]] },
      { name: 'Palm Gates', type: 'gates', layout: 'oasis', gates: 2, waves: [['skel', 3, 'beastkin', 2], ['skelshield', 2, 'skelarcher', 2], ['stalker', 2, 'beastkin', 2], ['warden', 2, 'necro', 1]] },
      { name: 'The Shade in the Dunes', type: 'duel', layout: 'dunes', boss: 'kestrelfoe', legend: 'kestrel', waves: [['ghoul', 3], ['stalker', 2]] },
      { name: 'Tombs of Glass', type: 'gates', layout: 'tombs', gates: 2, waves: [['skel', 3, 'skelarcher', 2], ['skelshield', 2, 'wraith', 2], ['stalker', 2, 'skel', 2], ['warden', 1, 'wraith', 2, 'skelarcher', 1]] },
      { name: 'Temple Steps', type: 'rout', layout: 'temple', waves: [['skel', 4, 'beastkin', 2], ['wraith', 2, 'skelshield', 2], ['stalker', 2, 'skelarcher', 3], ['necro', 2, 'beastkin', 3], ['warden', 2, 'wraith', 2, 'stalker', 2]] },
      { name: 'Sallow, the Dune Necromancer', type: 'boss', layout: 'temple', boss: 'sallow', waves: [['ghoul', 4, 'skel', 2], ['necro', 1, 'skelarcher', 2], ['stalker', 2, 'beastkin', 2]] },
    ] },
    { id: 3, name: 'Aldmere', biome: 'vale', floor: 'cobble', elites: 2, blurb: 'The fallen capital. Wraiths walk its streets and warlocks sing in its halls.', stages: [
      { name: 'The River Gate', type: 'gates', layout: 'city', gates: 3, legend: 'brenna', waves: [['skel', 4, 'skelarcher', 2], ['skelshield', 2, 'wraith', 2], ['stalker', 2, 'skel', 3], ['warlock', 1, 'skelshield', 2]] },
      { name: 'Streets of Ash', type: 'rout', layout: 'city', waves: [['wraith', 3, 'skel', 3], ['skelarcher', 3, 'skelshield', 2], ['stalker', 3, 'skel', 2], ['warlock', 2, 'wraith', 3], ['skelshield', 3, 'skelarcher', 3, 'stalker', 1]] },
      { name: 'Market Ruins', type: 'rout', layout: 'city', waves: [['skel', 5, 'warlock', 1], ['wraith', 3, 'skelarcher', 2], ['stalker', 2, 'beastkin', 2], ['skelshield', 3, 'warlock', 2], ['skel', 4, 'wraith', 2, 'stalker', 2]] },
      { name: 'The Warlock Conclave', type: 'defend', layout: 'plaza', ward: 'refugees', time: 90, legend: 'reaper', waves: [['warlock', 2, 'skel', 3], ['wraith', 3, 'skelarcher', 2], ['stalker', 2, 'skel', 3], ['warlock', 3, 'skelshield', 2], ['beastkin', 3, 'wraith', 2], ['wraith', 3, 'warlock', 2, 'stalker', 2]] },
      { name: 'Guild Quarter', type: 'gates', layout: 'city', gates: 3, waves: [['wraith', 3, 'skel', 3], ['warlock', 2, 'skelshield', 2], ['stalker', 3, 'skelarcher', 2], ['skelshield', 2, 'wraith', 3]] },
      { name: 'The Last Square', type: 'rout', layout: 'plaza', waves: [['skel', 5, 'wraith', 2], ['warlock', 3, 'skelarcher', 3], ['stalker', 3, 'skelshield', 2], ['skelshield', 3, 'wraith', 3], ['warden', 2, 'warlock', 2, 'stalker', 2]] },
      { name: 'Halls of the Dead King', type: 'rout', layout: 'throne', waves: [['wraith', 4, 'skelshield', 2], ['warlock', 3, 'skel', 3], ['stalker', 3, 'skelarcher', 2], ['wraith', 3, 'warlock', 2], ['skelshield', 3, 'skelarcher', 3, 'stalker', 2]] },
      { name: 'The Pale Regent', type: 'boss', layout: 'throne', boss: 'regent', waves: [['wraith', 2, 'skel', 2], ['warlock', 2, 'skelshield', 1], ['stalker', 2, 'wraith', 2]] },
    ] },
    { id: 4, name: 'The Cantor\'s Gate', biome: 'vale', night: true, elites: 3, blurb: 'Where the first Gravegate opened. Where it ends.', stages: [
      { name: 'March of Banners', type: 'rout', layout: 'march', legend: 'talia', waves: [['ghoul', 4, 'skel', 3], ['necro', 1, 'wraith', 2, 'beastkin', 2], ['stalker', 3, 'skelarcher', 2], ['warden', 2, 'skelshield', 2], ['beastkin', 3, 'warlock', 2, 'stalker', 1]] },
      { name: 'Field of Graves', type: 'gates', layout: 'endless', gates: 3, waves: [['skel', 4, 'warden', 2], ['wraith', 3, 'warlock', 2], ['stalker', 3, 'skelarcher', 2], ['skelshield', 3, 'necro', 2]] },
      { name: 'The Shattered Wall', type: 'rout', layout: 'ruins', waves: [['warden', 3, 'skelarcher', 3], ['beastkin', 4, 'warlock', 2], ['stalker', 3, 'skel', 3], ['wraith', 4, 'skelshield', 3], ['warden', 2, 'warlock', 2, 'stalker', 2]] },
      { name: 'Before the Gate', type: 'defend', layout: 'grove', ward: 'cage', time: 95, waves: [['wraith', 3, 'skel', 4], ['warlock', 3, 'warden', 2], ['stalker', 3, 'beastkin', 2], ['beastkin', 4, 'necro', 2], ['skelshield', 3, 'skelarcher', 3], ['wraith', 4, 'warlock', 2, 'stalker', 2]] },
      { name: 'Choir of Bones', type: 'rout', layout: 'gate', waves: [['ghoul', 6, 'warlock', 2], ['warden', 3, 'wraith', 3], ['stalker', 3, 'skelarcher', 3], ['skelshield', 3, 'necro', 2, 'skelarcher', 3], ['beastkin', 3, 'warlock', 2, 'stalker', 3]] },
      { name: 'Vesh Morrow, the Bone Cantor', type: 'boss', layout: 'gate', boss: 'vesh', waves: [['ghoul', 3, 'wraith', 1], ['warden', 2, 'warlock', 1], ['stalker', 2, 'skelarcher', 2], ['skelshield', 2, 'wraith', 2]] },
    ] },
  ];
  // the flat list of stages (the battle engine reads these as missions)
  BB.MISSIONS = [];
  BB.CHAPTERS.forEach((ch) => ch.stages.forEach((st, n) => {
    const i = BB.MISSIONS.length;
    BB.MISSIONS.push(Object.assign({ id: 's' + ch.id + '-' + (n + 1), code: ch.id + '-' + (n + 1), chapter: ch.id, region: 'c' + ch.id,
      level: 1 + Math.round(i * 0.8) + [0, 0, 1, 2, 2][ch.id], elites: ch.elites || 0 }, st));
  }));
  BB.REGIONS = BB.CHAPTERS.map((ch) => ({ id: 'c' + ch.id, name: ch.name, biome: ch.biome, night: ch.night, floor: ch.floor, blurb: ch.blurb }));

  // story cards: before (pre) and after (post) a stage. speaker: 'captain', a legend id, or 'narr'
  BB.STORY = {
    intro: [
      ['narr', 'Nine banners once stood between the living and the dead.'],
      ['narr', 'Then the Gravegates opened, and Vesh Morrow began to sing. The dead got up to listen.'],
      ['narr', 'Eight banners fell. One is left, carried by a captain with no army.'],
      ['narr', 'So build one.'],
    ],
    's1-1pre': [['captain', 'Smoke over Ashford. Banner up. We start here.']],
    's1-2post': [['captain', 'First blood for the banner. They came through a gate somewhere north. We find it.']],
    's1-3post': [['captain', 'A gate dies like anything else: hit it until it stops.'], ['narr', 'A scout rides in: a witch caged in the Thornwood, and the dead closing on her.']],
    's1-4pre': [['sera', 'You took your time. Keep them off this cage and I will make it worth your while.']],
    's1-4post': [['sera', 'The Cantor sings and they rise. I can hear where the song comes from.'], ['captain', 'Then you march with us.']],
    's1-6post': [['sera', 'The watchtower stones are cold. Something huge walks the chapel yard beyond.']],
    's1-8pre': [['narr', 'Ossric the Gravewarden. Once a knight of the Third Banner. Now he guards the dead of the whole vale.']],
    's1-8post': [['captain', 'Greenvale is free. Raise the banner over Ashford.'], ['sera', 'The song is coming from the south. From under the Sunscar.']],
    's2-1post': [['captain', 'The oasis holds. East, there\'s smoke. A caravan.']],
    's2-3pre': [['ahmos', 'Strangers with a banner. Good. Take the left flank. I have the right. I have always had the right.']],
    's2-3post': [['ahmos', 'Nineteen years, no caravan lost. You kept the count. My shield is yours.']],
    's2-5pre': [['kestrel', 'You\'re the banner everyone talks about. Let\'s see if you\'re worth the trouble.']],
    's2-5post': [['kestrel', 'Fine. You\'re worth it. Sallow put a price on my head. I\'d like to put one on hers.']],
    's2-6post': [['sera', 'The tomb gates were feeding her. She is alone now under the temple.']],
    's2-8pre': [['narr', 'Sallow, the Dune Necromancer, keeps the Cantor\'s song alive in the south.']],
    's2-8post': [['captain', 'The Sunscar is quiet.'], ['sera', 'The song is louder in the north. In Aldmere. The capital is still singing.']],
    's3-1pre': [['brenna', 'About time somebody came. I\'ve held this gate since the spring. Break those portals.']],
    's3-1post': [['brenna', 'You fight like you mean it. Aldmere was my city. Let me take it back with you.']],
    's3-2post': [['brenna', 'Warlocks in the old guildhall. They\'re gathering the living for something.']],
    's3-4pre': [['reaper', 'Hold them off the fire. I\'ve buried enough people this year.']],
    's3-4post': [['reaper', 'You kept them breathing. I\'ll dig for your enemies from now on.']],
    's3-8pre': [['narr', 'The Pale Regent. Last king of Aldmere, crowned again by the Cantor\'s song.']],
    's3-8post': [['captain', 'Aldmere is free.'], ['narr', 'Riders come in through the night, under a torn blue banner.']],
    's4-1pre': [['talia', 'Talia Sunblade, Ninth Banner. What\'s left of it. We heard there was still a captain. We came to march.']],
    's4-1post': [['talia', 'The gate is open ahead. He\'s singing louder.']],
    's4-6pre': [['narr', 'Vesh Morrow, the Bone Cantor. The first gate. The last song.']],
    's4-6post': [['captain', 'Silence.'], ['narr', 'The dead lie down. Nine banners are carried home under one. Yours.']],
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
