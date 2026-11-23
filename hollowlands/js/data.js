'use strict';
// HOLLOWLANDS — items, weapons, enemies, recipes and written texts. Pure data (no DOM).
// Names and lore here are WORKING PROPOSALS (see docs/DESIGN.md), not approved canon.

HL.RARITY = { common: 'Common', forged: 'Forged', relic: 'Relic', named: 'Named' };

// Weapon families: each changes reach, rhythm and the ultimate it unlocks.
HL.WEAPONS = {
  rusted_sword: {
    kind: 'sword', dmg: 11, reach: 15, arc: 2.1, wind: 0.07, active: 0.09, rec: 0.2, stam: 11, combo: 3, finisher: 1.6,
    heavy: { mult: 2.3, reach: 18, arc: 2.6, stam: 26 }, ult: 'grave_arc', step: 22,
  },
  ashwood_spear: {
    kind: 'spear', dmg: 13, reach: 25, arc: 0.55, wind: 0.13, active: 0.1, rec: 0.27, stam: 13, combo: 2, finisher: 1.3,
    heavy: { mult: 2.1, reach: 30, arc: 0.5, stam: 26 }, ult: 'ashen_drive', step: 30,
  },
  bellbreaker: {
    kind: 'axe', dmg: 23, reach: 16, arc: 2.5, wind: 0.22, active: 0.1, rec: 0.38, stam: 20, combo: 2, finisher: 1.4, breaker: true,
    heavy: { mult: 2.2, reach: 20, arc: 3.2, stam: 32 }, ult: 'kings_fall', step: 16,
  },
};
// Bare hands, until you find a weapon: weak, but the attack button always does something.
HL.FISTS = { kind: 'fists', dmg: 5, reach: 11, arc: 1.7, wind: 0.05, active: 0.08, rec: 0.17, stam: 8, combo: 2, finisher: 1.4, heavy: { mult: 2, reach: 12, arc: 1.9, stam: 18 }, ult: null, step: 18 };
HL.ULTS = {
  grave_arc: { name: 'Grave Arc', desc: 'A full circle cleave that staggers everything close.' },
  ashen_drive: { name: 'Ashen Drive', desc: 'A piercing rush through everything in a line.' },
  kings_fall: { name: "King's Fall", desc: 'A committed overhead blow that crushes the ground.' },
};

HL.ITEMS = {
  rusted_sword: { name: 'Rusted Sword', kind: 'weapon', rarity: 'common', desc: 'Balanced reach. Three quick cuts, the last one heavier. Hold to cleave.' },
  ashwood_spear: { name: 'Ashwood Spear', kind: 'weapon', rarity: 'forged', desc: 'Long straight reach. Keep them at the point; weak to the flanks.' },
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
  { when: () => true, lines: ['...You are not one of them. Your eyes are still in.', 'I am Maren. I stayed when the rest went to the chapel cellar. None of them came back up.', 'Sit by the fire if you need it. It keeps them off, mostly.'], set: 'met_maren' },
];
