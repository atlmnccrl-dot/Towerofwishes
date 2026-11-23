'use strict';
// HOLLOWLANDS — items, weapons, enemies, recipes and written texts. Pure data (no DOM).
// Names and lore here are WORKING PROPOSALS (see docs/DESIGN.md), not approved canon.

HL.RARITY = { common: 'Common', forged: 'Forged', relic: 'Relic', named: 'Named' };

// Weapon families: each changes reach, rhythm and the ultimate it unlocks.
HL.WEAPONS = {
  rusted_sword: {
    kind: 'sword', dmg: 11, reach: 15, arc: 2.1, wind: 0.07, active: 0.09, rec: 0.2, stam: 11, combo: 3, finisher: 1.6,
    heavy: { mult: 2.1, reach: 19, arc: Math.PI * 2, stam: 26, spinCut: true }, ult: 'grave_arc', step: 22, trail: '#ffc95a',
  },
  ashwood_spear: {
    kind: 'spear', dmg: 13, reach: 25, arc: 0.55, wind: 0.13, active: 0.1, rec: 0.27, stam: 13, combo: 2, finisher: 1.3,
    heavy: { mult: 2.2, reach: 30, arc: 0.6, stam: 26, lunge: 95 }, ult: 'ashen_drive', step: 30, trail: '#7fd8ff',
  },
  bellbreaker: {
    kind: 'axe', dmg: 23, reach: 16, arc: 2.5, wind: 0.22, active: 0.1, rec: 0.38, stam: 20, combo: 2, finisher: 1.4, breaker: true,
    heavy: { mult: 2.3, reach: 26, arc: Math.PI * 2, stam: 32, slam: true }, ult: 'kings_fall', step: 16, trail: '#ff7a2a',
  },
};
// Bare hands, until you find a weapon: weak, but the attack button always does something.
HL.FISTS = { kind: 'fists', dmg: 5, reach: 11, arc: 1.7, wind: 0.05, active: 0.08, rec: 0.17, stam: 8, combo: 2, finisher: 1.4, heavy: { mult: 2, reach: 12, arc: 1.9, stam: 18 }, ult: null, step: 18 };
Object.assign(HL.WEAPONS, {
  twin_blades: {
    kind: 'twin', dmg: 7, reach: 13, arc: 1.9, wind: 0.04, active: 0.07, rec: 0.12, stam: 7, combo: 4, finisher: 1.8,
    heavy: { mult: 1.3, reach: 18, arc: Math.PI * 2, stam: 30, spin: { dur: 0.6, tick: 0.12 } }, ult: 'veilstep', step: 26, trail: '#ff3d3d',
  },
  ashen_bow: {
    kind: 'bow', dmg: 9, reach: 140, arc: 0.3, wind: 0.12, active: 0.05, rec: 0.25, stam: 9, combo: 1, finisher: 1,
    heavy: { mult: 3.2, reach: 170, arc: 0.3, stam: 24, pierce: true }, ult: 'blackflight', step: 0, shoot: { speed: 280, col: '#ece4d1' },
  },
  bell_focus: {
    kind: 'focus', dmg: 10, reach: 80, arc: 0.4, wind: 0.1, active: 0.05, rec: 0.28, stam: 12, combo: 2, finisher: 1.3,
    heavy: { mult: 2.4, reach: 36, arc: Math.PI * 2, stam: 30, nova: true }, ult: 'silence_burst', step: 0, shoot: { speed: 170, col: '#9fd0ff', seek: 2.5 }, trail: '#9fd0ff',
  },
});
HL.ULTS = {
  grave_arc: { name: 'Grave Arc', desc: 'A full circle cleave that staggers everything close.' },
  ashen_drive: { name: 'Ashen Drive', desc: 'A piercing rush through everything in a line.' },
  kings_fall: { name: "King's Fall", desc: 'Leap and crush the ground: a crater and a storm of debris.' },
  veilstep: { name: 'Veilstep', desc: 'Blink from foe to foe, cutting each one.' },
  blackflight: { name: 'Blackflight', desc: 'A rain of black arrows over everything ahead.' },
  silence_burst: { name: 'Silence Burst', desc: 'A soundless shockwave that stuns everything nearby.' },
};

HL.ITEMS = {
  rusted_sword: { name: 'Rusted Sword', kind: 'weapon', rarity: 'common', desc: 'Balanced reach. Three quick cuts, the last one heavier. Hold to cleave.' },
  ashwood_spear: { name: 'Ashwood Spear', kind: 'weapon', rarity: 'forged', desc: 'Long straight reach. Keep them at the point; weak to the flanks.' },
  twin_blades: { name: 'Twin Blades', kind: 'weapon', rarity: 'forged', desc: 'Short, fast, merciless. Four-cut flurries. Hold for a whirlwind.' },
  ashen_bow: { name: 'Ashen Bow', kind: 'weapon', rarity: 'forged', desc: 'Strike from afar: drag to aim. Hold to draw a piercing shot. Arrows can ring resonators.' },
  bell_focus: { name: 'Bell Focus', kind: 'weapon', rarity: 'relic', desc: 'A warden\'s tuning staff. Fires seeking bolts; hold for a shockwave around you.' },
  bellbreaker: { name: 'Bellbreaker', kind: 'weapon', rarity: 'named', desc: "The Keeper's own clapper, hafted. Slow, but it breaks any guard." },
  tattered_cloak: { name: 'Tattered Cloak', kind: 'armor', rarity: 'common', def: 0, desc: 'It keeps off the ash. Not much else.' },
  gravecloth_coat: { name: 'Gravecloth Coat', kind: 'armor', rarity: 'forged', def: 0.15, desc: 'Layered burial linen, waxed stiff. Takes 15% less harm.' },
  rustbound_plate: { name: 'Rustbound Plate', kind: 'armor', rarity: 'forged', def: 0.28, slow: 0.12, desc: 'A warden\'s plate. Takes 28% less harm, but you move 12% slower.' },
  bell_shard: { name: 'Bell Shard', kind: 'relic', rarity: 'relic', desc: 'A splinter of a silenced bell. It hums when you fight. Grants your weapon\'s ultimate.' },
  ember_charm: { name: 'Ember Charm', kind: 'relic', rarity: 'relic', desc: 'Stamina returns 35% faster. (Takes the relic slot.)' },
  poultice: { name: 'Poultice', kind: 'consumable', rarity: 'common', stack: 9, desc: 'Ash-herb packed in linen. Restores 45 health.' },
  dried_meat: { name: 'Dried Meat', kind: 'consumable', rarity: 'common', stack: 9, desc: 'Restores 3 health a second for 15 seconds.' },
  fire_flask: { name: 'Fire Flask', kind: 'consumable', rarity: 'common', stack: 9, desc: 'Thrown at the nearest foe. Bursts for heavy damage.' },
  raw_meat: { name: 'Raw Meat', kind: 'material', rarity: 'common', stack: 20, desc: 'Cook it at a fire.' },
  ash_herb: { name: 'Ash Herb', kind: 'material', rarity: 'common', stack: 30, desc: 'Grows grey where the bells fell. Bitter, and it closes wounds.' },
  cloth_scrap: { name: 'Cloth Scrap', kind: 'material', rarity: 'common', stack: 30, desc: 'Linen torn from something that no longer needs it.' },
  iron_scrap: { name: 'Iron Scrap', kind: 'material', rarity: 'common', stack: 30, desc: 'Smiths can still use it. Improves weapons at an anvil.' },
  bone_dust: { name: 'Bone Dust', kind: 'material', rarity: 'common', stack: 30, desc: 'What the hollow leave behind. Used in tempering.' },
  lamp_oil: { name: 'Lamp Oil', kind: 'material', rarity: 'common', stack: 20, desc: 'Burns hot. Makes fire flasks.' },
  winch_crank: { name: 'Winch Crank', kind: 'key', desc: 'An iron handle, square-socketed. It belongs on something.', use: 'Fit' },
  storehouse_key: { name: 'Storehouse Key', kind: 'key', desc: 'Opens a lock. Stamped with a sheaf of wheat.', use: 'Unlock' },
  gate_key: { name: 'Gate Key', kind: 'key', desc: 'Opens a lock. Heavy and rust-red, from a tower gate.', use: 'Unlock' },
  crypt_key: { name: 'Crypt Key', kind: 'key', desc: 'Opens a lock. Bone handle, iron bit.', use: 'Unlock' },
  bell_key: { name: 'Bell Key', kind: 'key', desc: 'Found inside the Keeper\'s bell. Warm. It opens the way up.', use: 'Unlock' },
  lumen_shard: { name: 'Lumen Shard', kind: 'key', stack: 20, desc: 'A sliver of the old light, still warm. Each one you carry strengthens you: +5 max health.' },
  champion_mantle: { name: "Champion's Mantle", kind: 'armor', rarity: 'named', def: 0.22, desc: 'Torn from the Broken Champion. Takes 22% less harm, and does not slow you.' },
  map_scrap: { name: 'Map Scrap', kind: 'doc', desc: 'A torn road map. A road east, past drowned farms: "Blackfen".' },
};
HL.itemName = (id) => (HL.ITEMS[id] ? HL.ITEMS[id].name : id);

HL.RECIPES = [
  { out: 'poultice', n: 1, need: { ash_herb: 2, cloth_scrap: 1 } },
  { out: 'fire_flask', n: 1, need: { lamp_oil: 1, cloth_scrap: 1 } },
  { out: 'dried_meat', n: 1, need: { raw_meat: 1 } },
];
HL.UPGRADE = { maxLevel: 2, perLevel: 0.18, cost: [{ iron_scrap: 2, bone_dust: 1 }, { iron_scrap: 4, bone_dust: 2 }] };

// Enemy ecology for the slice. Every foe has a different problem to solve.
HL.FOES = {
  drifter: { name: 'Ash Drifter', hp: 30, r: 3, speed: 20, chase: 24, aggro: 70, leash: 160, dmg: 13, poise: 14, drops: [['bone_dust', 0.35], ['cloth_scrap', 0.35], ['ash_herb', 0.15]] },
  hound: { name: 'Carrion Hound', hp: 24, r: 3, speed: 30, chase: 54, aggro: 90, leash: 200, dmg: 11, poise: 10, drops: [['raw_meat', 0.7], ['bone_dust', 0.2]] },
  archer: { name: 'Grave Archer', hp: 24, r: 3, speed: 22, chase: 28, aggro: 105, leash: 180, dmg: 11, poise: 12, drops: [['cloth_scrap', 0.4], ['iron_scrap', 0.3], ['lamp_oil', 0.2]] },
  guard: { name: 'Rustbound Guard', hp: 80, r: 4, speed: 14, chase: 17, aggro: 70, leash: 140, dmg: 24, poise: 40, drops: [['iron_scrap', 1], ['iron_scrap', 0.6], ['bone_dust', 0.5]] },
  lurker: { name: 'Rootlurker', hp: 28, r: 4, speed: 0, chase: 0, aggro: 30, leash: 70, dmg: 13, poise: 16, drops: [['ash_herb', 0.8], ['ash_herb', 0.4]] },
  wraith: { name: 'Bell Wraith', hp: 26, r: 3, speed: 24, chase: 30, aggro: 115, leash: 200, dmg: 12, poise: 14, drops: [['bone_dust', 0.5], ['lamp_oil', 0.3]] },
  brute: { name: 'Hollow Brute', hp: 140, r: 6, speed: 14, chase: 18, aggro: 85, leash: 170, dmg: 26, poise: 70, drops: [['iron_scrap', 1], ['bone_dust', 1], ['poultice', 0.5]] },
  keeper: { name: 'The Bellworn Keeper', hp: 640, r: 10, speed: 13, chase: 16, aggro: 400, leash: 999, dmg: 22, poise: 999, drops: [] },
};

// Written things found in the world (journal). Proposal text.
HL.NOTES = {
  cart_ledger: { title: 'Ledger Page', text: 'Salt, 3 sacks. Lamp oil, 2 jars. For the chapel at Ashwick, by order of the bell-warden.\n\nUnder it, in a hurried hand: "They stopped ringing at dusk. All of them. Turn the cart around."' },
  letter_edda: { title: 'Letter to Edda', text: 'Edda — the smith has jammed the well winch and took the crank to his shop "to keep the children off it". The storehouse key went down the well bucket with the rest of the coin.\n\nIf the bells stop again, we go to the cellar. Do not come looking for me in the chapel.' },
  child_drawing: { title: 'Charcoal Drawing', text: 'A child\'s drawing: a tall tower, a bell inside it, and under the ground a great many red figures with no eyes, all standing very still.' },
  do_not_ring: { title: 'Scratched in the Bell', text: 'DO NOT RING IT.\n\nThe chapel\'s great bell lies cracked in the square, half sunk in ash. Someone dragged it out of the belfry, and the letters are cut deep.' },
  marker_1: { title: 'Waystone', text: 'Worn letters around a carved EYE:\n"The first stone watches the road."' },
  marker_2: { title: 'Waystone', text: 'Worn letters around a carved BELL:\n"The second listens for what is buried."' },
  marker_3: { title: 'Waystone', text: 'Worn letters around a carved MOON:\n"The last keeps the night."' },
  stones_hint: { title: 'Ring of Stones', text: 'Three standing stones, each carved on four faces: eye, bell, moon and sun. A path of trampled roots leads east, into a wall of thorns.' },
  traveller: { title: 'Traveller\'s Journal', text: 'The tower gate key was meant for the warden. He went down and did not come up. Something in the forest walks in armour now, and it will not let me pass.' },
  inscription: { title: 'Underchapel Inscription', text: 'HERE THE BELLS ARE ANSWERED.\nWHILE ONE RINGS ABOVE, NONE RISE BELOW.' },
  scratches: { title: 'Scratches on the Wall', text: 'Three marks scratched over and over: a long deep groove, then a short one, then a middling one.\n\nUnder them: "low, high, between — or it will not open."' },
  bell_truth: { title: 'Warden\'s Last Page', text: 'The bells were never warnings. They were locks. Every toll kept the gates beneath shut, and every bell-warden paid for it with their sleep, then their voice, then the rest.\n\nI could not pay any more. Forgive me.' },
  keeper_fall: { title: 'The Keeper\'s Bell', text: 'Inside the cracked bell of the thing below the chapel: a key, still warm, and a name worn almost smooth — the bell-warden\'s.\n\nThe Silence did not just happen. Somebody stopped paying.' },
  next_region: { title: 'Map Scrap', text: 'A road east, past the drowned farms, marked "Blackfen". Someone has drawn a second tower there, and a bell, and crossed the bell out.' },
};

// Survivor dialogue, chosen by progress flags. (Proposal: Maren, the last of Ashwick.)
HL.MAREN = [
  { when: (f) => f.boss_dead, lines: ['You came up through the chapel floor. Then the thing below is quiet.', 'The warden built that door to keep it in. You opened it from the wrong side and lived.', 'There is a road east, through Blackfen. If more bells fell, that is where they went.'], set: 'maren_end' },
  { when: (f) => f.got_gate_key, lines: ['That key. The warden carried one like it.', 'The tower past the woods goes down a long way. Rest here first. The fire will keep you.'] },
  { when: (f) => f.storehouse_open, lines: ['So you got into the storehouse. Good. Take what helps.', 'East, through Crowshade, there is a tower. The bell-warden went in and never rang again.', 'Something in armour walks the forest now. It took the warden\'s key off a dead man.'] },
  { when: (f) => f.met_maren, lines: ['The well. Edda\'s husband jammed it. The smith took the crank.', 'Rest by the fire when you are hurt. It is the only warm thing left in Ashwick.'] },
  { when: () => true, lines: ['...You are not one of them. Your eyes are still in.', 'I am Maren. I stayed when the rest went to the chapel cellar. None of them came back up.', 'Sit by the fire if you need it. It keeps them off, mostly.', 'And if you find the old shrines, touch them. Some still remember the light.'], set: 'met_maren' },
];

// ------------------------------------------------------------------ story (PROPOSAL text, see docs/DESIGN.md)
HL.NOTES.silence = { title: 'The Great Silence', text: 'Veyr was a kingdom of bells. Every tower rang at dusk, as it had for three hundred years, and nobody remembered why.\n\nOne night every bell in Veyr stopped at once. Roads sank. Towns emptied. Things with hollow eyes walked up out of the ground.\n\nYou were hauling salt and lamp oil to the village of Ashwick when the ringing stopped.' };
HL.NOTES.tower_seen = { title: 'The Warden\'s Tower', text: 'The bell-warden\'s tower stands at the end of Crowshade Trail. Its bell has not rung since the Silence. Maren says the warden went down inside and never came back up.' };
HL.NOTES.crypt_seen = { title: 'Bellroot Underchapel', text: 'Under the tower the stairs keep going: a chapel built upside down, its bells hung over the floor instead of in the sky. The air hums.' };

// Cutscene shots: x, y = what the camera looks at (px), view = how much ground fits on screen, text = the card.
HL.CUTS = {
  intro: {
    note: 'silence',
    shots: [
      { x: 150 * 8, y: 60 * 8, view: 340, text: 'Veyr was a kingdom of bells. Every tower rang at dusk, and nobody remembered why.', dur: 5.5 },
      { x: 120 * 8, y: 48 * 8, view: 360, text: 'One night, every bell fell silent at once.', dur: 4.5, toll: true },
      { x: 40 * 8, y: 52 * 8, view: 260, text: 'The roads sank. The towns emptied. Things with hollow eyes walked up out of the ground.', dur: 5.5 },
      { x: 11 * 8, y: 56 * 8, view: 150, text: 'You were hauling salt and lamp oil to Ashwick when the ringing stopped. Now the cart is broken, and the village ahead is very quiet.', dur: 6 },
    ],
  },
  tower: {
    note: 'tower_seen',
    shots: [
      { x: 166 * 8, y: 52 * 8, view: 300, text: 'The bell-warden\'s tower. Its bell has not rung since the Silence.', dur: 4.5 },
      { x: 166 * 8, y: 47 * 8, view: 200, text: 'The gate at its foot is locked: a big, rust-red keyhole.', dur: 4 },
    ],
  },
  crypt: { note: 'crypt_seen', shots: [{ x: 24 * 8, y: 30 * 8, view: 260, text: 'Beneath the tower, the old wardens kept something shut. Something down here still hums.', dur: 5 }] },
  keeper: { shots: [{ x: 20 * 8, y: 13 * 8, view: 150, text: 'THE BELLWORN KEEPER. It was the warden, once. Now it only guards.', dur: 4.5, toll: true }] },
};

// What to do next, from what you've done. target: an object id on a map, or the boss.
HL.objective = (f, inv, eq, map) => {
  if (map === 'ashwick') {
    if (!f['p:p_sword']) return { text: 'Take the sword lying by the wrecked cart.', id: 'p_sword' };
    if (!f['c:c_cart']) return { text: 'Search the wrecked cart.', id: 'c_cart' };
    if (!f.met_maren) return { text: 'Someone keeps a fire burning in Ashwick\'s square. Find them.', id: 'maren' };
    if (!f.storehouse_open) {
      if (inv.storehouse_key) return { text: 'Unlock the storehouse with its key.', id: 'd_store' };
      if (inv.winch_crank) return { text: 'Fit the crank to the well in the square.', id: 'well' };
      return { text: 'The storehouse is locked; its key fell down the well. The well has no crank: search the smithy.', id: 'c_smithy' };
    }
    if (!f['c:c_store']) return { text: 'Search the storehouse.', id: 'c_store' };
    if (!f.boss_dead) {
      if (!inv.gate_key && !f['d:d_tower']) return { text: 'Head east along Crowshade Trail. The tower key is in the armoured warden\'s camp, south of the road.', id: 'c_traveller' };
      if (!f['d:d_tower']) return { text: 'Unlock the tower at the end of the trail.', id: 'x_tower' };
      return { text: 'Enter the tower.', id: 'x_tower' };
    }
    if (!f.chapel_open) return { text: 'Lift the bar on the chapel door.', id: 'd_chapel' };
    if (!f.maren_end) return { text: 'Tell Maren what happened below.', id: 'maren' };
    if (!f.stones_done) return { text: 'Slice complete. Still hidden: the ring of stones north of the trail.', id: 'stone1', optional: true };
    return { text: 'Slice complete. The road east to Blackfen waits.', id: null };
  }
  if (map === 'crypt1') {
    if (f.waves_done) return { text: 'Take the stairs down.', id: 'x_down1' };
    if (!f['d:d_iron']) return inv.crypt_key ? { text: 'Open the iron door, north of the great hall.', id: 'd_iron' } : { text: 'Find the key to the iron door. Search the ossuary, west of the hall.', id: 'c_ossuary' };
    return { text: 'Turn the crank in the hall beyond the iron door to raise the gate.', id: 'crank' };
  }
  if (map === 'crypt2') {
    if (!f.boss_dead) return { text: 'Defeat the Bellworn Keeper. Strike a glowing resonator to stun it.', id: 'keeper' };
    if (!inv.bell_key && !f['d:d_bell']) return { text: 'Take the key from the Keeper\'s bell.', id: 'p_bellkey' };
    return { text: 'Climb out through the bell door.', id: 'x_chapelUp' };
  }
  return null;
};

// ------------------------------------------------------------------ LUMEN: the light the old kingdom drew from the earth (PROPOSAL)
HL.SIGILS = {
  blink: { name: 'Sigil of Passage', short: 'Blink', desc: 'Your dash becomes a blink: farther, through foes, trailing light.' },
  burst: { name: 'Sigil of Radiance', short: 'Lumen Burst', desc: 'A new skill: tap the light button to blast everything around you.' },
  vessel: { name: 'Sigil of the Vessel', short: 'Vessel', desc: 'Your body holds more light: +30 max health.' },
  ward: { name: 'Sigil of the Ward', short: 'Ward', desc: 'A shell of light blocks one blow, and returns every 10 seconds.' },
  sight: { name: 'Sigil of Sight', short: 'Sight', desc: 'Every hidden shard and shrine is marked on your map.' },
};
HL.SHRINES = {
  shrine_passage: { name: 'Shrine of Passage', trial: 'touch', sigil: 'blink' },
  shrine_trial: { name: 'Shrine of Trials', trial: 'combat', sigil: 'burst', waves: [['drifter', 'drifter', 'hound', 'drifter'], ['wraith', 'archer', 'drifter', 'hound', 'drifter'], ['brute', 'wraith', 'hound', 'hound']] },
  shrine_echo: { name: 'Shrine of Echoes', trial: 'pylons', sigil: 'vessel' },
  shrine_deep: { name: 'Shrine of the Deep', trial: 'touch', sigil: 'ward' },
  shrine_hidden: { name: 'The Hidden Shrine', trial: 'touch', sigil: 'sight' },
};
HL.SHARD_COUNT = 8;
HL.NOTES.silence = { title: 'The Light Below', text: 'Veyr was built on Lumen: a pale light that rose out of the earth through the old shrines. It lit the roads, healed the sick, and kept the dark below where it belonged.\n\nOne night every shrine in Veyr went dark at once. Roads sank. Towns emptied. And out of the dark below came the hollow.\n\nYou were hauling lamp oil to Ashwick when the light went out.' };
HL.NOTES.shrines = { title: 'The Shrines', text: 'Some shrines still remember the light. Touch them and they wake, and give a little of it back: a Sigil, a power of the old kingdom. Awakened shrines can carry you to one another (Map).\n\nFive stand near Ashwick. Eight shards of the light lie scattered where the dark could not swallow them.' };
