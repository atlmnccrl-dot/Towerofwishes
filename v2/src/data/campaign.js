// The campaign: regions, their missions, who joins the company and when. Pure data.
// Every name and line here is written for the game (Proposal: the author may rename or rewrite any of it).
//
// A mission: id, name, place, text (the briefing), level (the foes' level), foes ([key, slot]),
// boss, recruit (who joins on the first clear), theme (the ground), map ([x, y] in % of the map).

export const START_ROSTER = ['corvin', 'wren', 'maren'];
export const START_TEAM = [{ key: 'corvin', slot: 1 }, { key: 'maren', slot: 3 }, { key: 'wren', slot: 5 }];

export const PREMISE = 'The old kingdom of Vael is gone, and its dead walk the roads. In the border town of Thornwick, three sellswords sign a company charter and take the first job on the board.';

export const REGIONS = [
  { id: 'r1', name: 'The Thornwick Road', blurb: 'Bandits on the river road, and something wrong in the graveyards.', theme: 'meadow' },
  { id: 'r2', name: 'The Greyfen', blurb: 'A drowned country of reeds and lanterns, where the fen feeds on the lost.', theme: 'marsh' },
  { id: 'r3', name: 'Saltreach', blurb: 'White dunes, raider caravans, and a great bird that hunts by the sun.', theme: 'desert' },
  { id: 'r4', name: 'The Sunken Abbey', blurb: 'An order of knights that never stopped guarding, long after they died.', theme: 'ruins' },
  { id: 'r5', name: 'Frostmarch', blurb: 'The white pass to the north, where the cold itself has learned to walk.', theme: 'snow' },
  { id: 'r6', name: 'The Barrow Throne', blurb: 'Where the old kingdom went into the ground, and what still sits on its throne.', theme: 'barrow' },
];
// told when a region is cleared
export const REGION_END = {
  r1: 'The Warlord falls and the Thornwick Road goes quiet. Word of the company spreads east, into the fens.',
  r2: 'The Mire Mother sinks for good. Past the Greyfen, the land dries into salt and sand.',
  r3: 'The Roc falls from the sky. Its feathers point north-east, to an abbey half under water.',
  r4: 'The Black Knight lays down his sword and kneels to the company. The road turns north, into the snow.',
  r5: 'The Colossus cracks and is still. Beyond the pass lies the barrow where Vael was buried.',
  r6: 'The Barrow Wyrm is dead and the throne is empty. The dead of Vael lie down at last. The company is legend.',
};


// A region's missions from a compact list. Foes are placed by type: those who fight up close in the
// front row (a boss in the middle), the rest at the back. Seals wind across the map west to east.
function region(id, theme, list) {
  const RANGED = new Set(['slinger', 'archer', 'caller', 'shade', 'herald']);
  return list.map(([name, place, level, foes, text, x = {}], i) => {
    const front = [1, 0, 2, 4, 3, 5], back = [4, 3, 5, 1, 0, 2], used = new Set();
    const placed = foes.map((k) => { const order = RANGED.has(k) ? back : front; const sl = order.find((o) => !used.has(o)); used.add(sl); return [k, sl]; });
    const t = i / (list.length - 1), wave = Math.sin(i * 1.9 + id.charCodeAt(1)) * 22;
    return Object.assign({ id: `${id}m${i + 1}`, region: id, name, place, level, theme, text, foes: placed,
      map: [Math.round(10 + t * 80), Math.round(Math.max(18, Math.min(78, 48 + wave)))] }, x);
  });
}

export const MISSIONS = [
  { id: 'r1m1', region: 'r1', name: 'The Toll Bridge', place: 'Thornwick River', level: 1, theme: 'meadow', map: [12, 70],
    text: 'Bandits hold the bridge and charge a toll in blood. A ferry guard has been holding them off alone.',
    foes: [['brawler', 1], ['cutthroat', 0], ['slinger', 4]] },
  { id: 'r1m2', region: 'r1', name: 'Smoke over Millbrook', place: 'Millbrook', level: 2, theme: 'meadow', map: [24, 50],
    text: 'The same gang is burning the mill. The baker refuses to leave her ovens.',
    foes: [['bruiser', 1], ['cutthroat', 2], ['slinger', 3], ['slinger', 5]], recruit: 'pell' },
  { id: 'r1m3', region: 'r1', name: 'The Old Watchtower', place: 'Watchtower Hill', level: 3, theme: 'dusk', map: [33, 26], boss: true,
    text: 'Their chief, Garrow, keeps a prisoner in the tower: a mage who set his camp on fire twice.',
    foes: [['chief', 1], ['thug', 0], ['brawler', 2], ['slinger', 4]] },
  { id: 'r1m4', region: 'r1', name: 'Graves That Stir', place: 'Ashby Churchyard', level: 4, theme: 'grave', map: [44, 46],
    text: 'The churchyard at Ashby is empty. Its graves are open from the inside.',
    foes: [['risen', 0], ['risen', 1], ['risen', 2], ['archer', 4]] },
  { id: 'r1m5', region: 'r1', name: 'The Fighting Pit', place: 'Ashby Crossing', level: 5, theme: 'dusk', map: [52, 70],
    text: 'A pit fighter has beaten everyone in the crossing. He will join whoever can stand against his crew.',
    foes: [['thug', 0], ['bruiser', 1], ['brawler', 2], ['thug', 4]], recruit: 'brann' },
  { id: 'r1m6', region: 'r1', name: 'The Bone Caller', place: 'Hollow Lane', level: 6, theme: 'grave', map: [61, 48],
    text: 'Someone is raising the dead on purpose. A hexer in a borrowed hood has been tracking him.',
    foes: [['risen', 0], ['pikeman', 1], ['risen', 2], ['archer', 3], ['caller', 4]], recruit: 'sable' },
  { id: 'r1m7', region: 'r1', name: 'Night on the Road', place: 'The King\'s Road', level: 7, theme: 'night', map: [70, 28],
    text: 'Bandits and the dead on the same road, the same night. A thief has been robbing both.',
    foes: [['cutthroat', 0], ['risen', 1], ['cutthroat', 2], ['archer', 3], ['slinger', 5]], recruit: 'vesk' },
  { id: 'r1m8', region: 'r1', name: 'The Drowned Chapel', place: 'Mere Chapel', level: 8, theme: 'grave', map: [77, 56],
    text: 'The last archer of the dawn order keeps watch over a chapel the water has half taken.',
    foes: [['risen', 0], ['pikeman', 1], ['risen', 2], ['caller', 3], ['archer', 5]], recruit: 'saela' },
  { id: 'r1m9', region: 'r1', name: 'Stone in the Hollow', place: 'The Hollow', level: 9, theme: 'night', map: [84, 32], boss: true,
    text: 'The callers have bound an old guardian of stone. Break the bind and it may remember who it served.',
    foes: [['golem', 1], ['risen', 0], ['risen', 2], ['caller', 4]], recruit: 'cairn' },
  { id: 'r1m10', region: 'r1', name: 'The Grave Warlord', place: 'Barrow Gate', level: 10, theme: 'grave', map: [92, 60], boss: true,
    text: 'At the barrow gate stands the thing that leads the dead of the Thornwick Road.',
    foes: [['warlord', 1], ['risen', 0], ['pikeman', 2], ['archer', 3], ['caller', 5]] },
  // ---- the regions past the Thornwick Road: [name, place, level, foes, text, extras]
  ...region('r2', 'marsh', [
    ['Reedwater Crossing', 'Reedwater', 11, ['hound', 'hound', 'ghoul', 'risen', 'archer'], 'A gate warden from the north is stranded on the crossing with the fen closing in.', { recruit: 'osric' }],
    ['The Drowned Village', 'Low Ashwick', 12, ['ghoul', 'ghoul', 'stalker', 'caller'], 'The village went under in a night. Its people did not stay down.'],
    ['Lanterns in the Fog', 'Lantern Mere', 13, ['hound', 'hound', 'hound', 'stalker', 'archer'], 'A beastfolk wanderer keeps the lanterns lit so the lost can find their way out.'],
    ['The Ferryman\'s Debt', 'Ferry Landing', 14, ['cutthroat', 'bruiser', 'slinger', 'ghoul', 'ghoul'], 'Smugglers use the fen to hide. The fen is hungrier than they think.'],
    ['Stalker Country', 'The Tangle', 15, ['stalker', 'stalker', 'hound', 'hound', 'ghoul'], 'Tracks as wide as a shield, and none of them coming back out.'],
    ['Witchlight Hollow', 'Witchlight', 16, ['caller', 'ghoul', 'ghoul', 'risen', 'risen'], 'A fen-born brute has been holding the hollow against the callers alone.', { recruit: 'grath' }],
    ['The Sunken Road', 'Old King\'s Way', 17, ['risen', 'pikeman', 'archer', 'archer', 'ghoul'], 'The old road runs under the water here, and so does an old army.'],
    ['Rat King\'s Wharf', 'Rotwharf', 18, ['thug', 'cutthroat', 'cutthroat', 'slinger', 'bruiser'], 'A street kid stole from the wrong gang and is about to pay for it.', { recruit: 'pip' }],
    ['Heart of the Fen', 'The Deep Reeds', 19, ['stalker', 'stalker', 'ghoul', 'ghoul', 'caller'], 'Everything in the Greyfen is moving toward one place.'],
    ['The Mire Mother', 'The Mother Pool', 20, ['mire', 'ghoul', 'ghoul', 'hound'], 'She is older than the kingdom, and she is awake.', { boss: true }],
  ]),
  ...region('r3', 'desert', [
    ['The Salt Gate', 'Saltreach Gate', 21, ['duelist', 'cutthroat', 'bruiser', 'slinger'], 'The gate captain lets no one through without paying. In blood, preferably.'],
    ['Caravan Ambush', 'The Spice Road', 22, ['cutthroat', 'cutthroat', 'slinger', 'slinger', 'thug'], 'Raiders on a caravan, and one monk among the merchants who is not running.', { recruit: 'tam' }],
    ['Glass Dunes', 'The Glass Dunes', 23, ['duelist', 'cutthroat', 'bruiser', 'slinger'], 'Lightning made these dunes into glass. The raiders made them into a trap.'],
    ['The Dry Well', 'Ninewells', 24, ['risen', 'risen', 'archer', 'caller', 'pikeman'], 'The town\'s last well is full of bones, and the bones are climbing out.'],
    ['The Burning Library', 'Saltreach Library', 25, ['duelist', 'duelist', 'slinger', 'thug', 'brawler'], 'Raiders are burning the library. One scholar is burning them back.', { recruit: 'nyssa' }],
    ['Mirage Pass', 'Mirage Pass', 26, ['duelist', 'hound', 'hound', 'slinger', 'bruiser'], 'Half of what you see in the pass is not there. The other half bites.'],
    ['Tomb of the Sun Kings', 'Sunken Tombs', 27, ['risen', 'pikeman', 'archer', 'caller', 'caller'], 'The kings of the desert were buried with their armies.'],
    ['The Guildhall', 'Saltreach Guildhall', 28, ['bruiser', 'thug', 'duelist', 'slinger', 'slinger'], 'The raiders took the guildhall. A veteran with a battered shield never left it.', { recruit: 'garrick' }],
    ['Roc\'s Shadow', 'The High Mesa', 29, ['duelist', 'duelist', 'cutthroat', 'cutthroat', 'thug'], 'The raiders worship the bird. They do not want it disturbed.'],
    ['The Roc of Saltreach', 'The Roc\'s Nest', 30, ['roc', 'slinger', 'slinger', 'duelist'], 'It hunts the caravans by the sun. Today it hunts you.', { boss: true }],
  ]),
  ...region('r4', 'ruins', [
    ['The Abbey Steps', 'Abbey Steps', 31, ['revenant', 'templar', 'archer', 'risen'], 'The knights of the abbey still stand guard. None of them are breathing.'],
    ['Cloister of Bells', 'The Cloister', 32, ['templar', 'templar', 'shade', 'risen'], 'The bells ring on their own, and every ring wakes something.'],
    ['Dawn\'s Last Order', 'Chapel of Dawn', 33, ['revenant', 'revenant', 'shade', 'archer'], 'The last of the dawn order is holding the chapel with a bundle of javelins.', { recruit: 'ilse' }],
    ['The Ossuary', 'The Ossuary', 34, ['risen', 'risen', 'risen', 'caller', 'shade'], 'Ten thousand bones, stacked with care. Someone is unstacking them.'],
    ['Flooded Nave', 'The Nave', 35, ['templar', 'revenant', 'ghoul', 'ghoul', 'shade'], 'The water came in through the windows and brought the fen with it.'],
    ['The Climber\'s Rope', 'The Bell Tower', 36, ['templar', 'templar', 'revenant', 'shade', 'archer'], 'A climber is trapped on the tower with the templars below him.', { recruit: 'rhys' }],
    ['Choir of Shades', 'The Choir', 37, ['shade', 'shade', 'shade', 'revenant', 'templar'], 'They still sing. It is not a hymn anymore.'],
    ['The Reliquary', 'The Reliquary', 38, ['revenant', 'revenant', 'templar', 'templar', 'caller'], 'The relics the knights died for, and the knights still dying for them.'],
    ['Black Gate', 'The Black Gate', 39, ['revenant', 'templar', 'templar', 'shade', 'shade'], 'Past the gate waits the knight who swore the oath that keeps them here.'],
    ['The Black Knight', 'The Oath Hall', 40, ['blackknight', 'revenant', 'revenant', 'shade'], 'Break the oath, and maybe the knight inside it can go free.', { boss: true }],
  ]),
  ...region('r5', 'snow', [
    ['The White Pass', 'The White Pass', 41, ['wolf', 'wolf', 'brute', 'archer'], 'The pass is open for one week a year. This is the week.'],
    ['Frozen Watch', 'Frostwatch', 42, ['brute', 'icegolem', 'wolf', 'shade'], 'The watchtower\'s garrison froze at their posts and stood back up.'],
    ['Assassin\'s Debt', 'Hollow Pine', 43, ['wolf', 'wolf', 'brute', 'brute', 'templar'], 'An assassin from the pass owes the brutes a life. She would rather pay with theirs.'],
    ['Rime Barrows', 'Rime Barrows', 44, ['risen', 'risen', 'pikeman', 'caller', 'wolf'], 'Old northern graves, and the callers have followed you here.'],
    ['Glacier Road', 'The Glacier', 45, ['icegolem', 'icegolem', 'wolf', 'wolf', 'brute'], 'The road runs over the glacier. The glacier is not asleep.'],
    ['Howling Ridge', 'Howling Ridge', 46, ['wolf', 'wolf', 'wolf', 'wolf', 'brute'], 'You hear the pack long before you see it.'],
    ['The Ice Chapel', 'The Ice Chapel', 47, ['shade', 'shade', 'revenant', 'icegolem', 'brute'], 'A chapel carved into the ice, and a congregation that never left.'],
    ['Avalanche Gate', 'Avalanche Gate', 48, ['brute', 'brute', 'icegolem', 'wolf', 'wolf'], 'One loud sound and the mountain comes down. Fight quietly.'],
    ['Heart of Winter', 'Winterheart', 49, ['icegolem', 'icegolem', 'brute', 'shade', 'wolf'], 'The cold has a source, and the source has a guardian.'],
    ['The Rime Colossus', 'The Frozen Throne', 50, ['colossus', 'wolf', 'wolf', 'brute'], 'A giant of ice that has stood in the pass since before Vael had a name.', { boss: true }],
  ]),
  ...region('r6', 'barrow', [
    ['The Barrow Road', 'The Barrow Road', 51, ['risen', 'risen', 'revenant', 'ghoul', 'archer'], 'Every road in Vael ends here, under the hill.'],
    ['Gate of Bones', 'The Bone Gate', 52, ['warlord', 'pikeman', 'archer', 'caller'], 'The gate is built from the ones who tried to open it.'],
    ['The Hollow Court', 'The Hollow Court', 53, ['templar', 'templar', 'shade', 'shade', 'revenant'], 'A court in session for three hundred years, waiting for its king.'],
    ['Mourners\' March', 'The Long Gallery', 54, ['ghoul', 'ghoul', 'stalker', 'shade', 'caller'], 'A procession of the dead, carrying something toward the throne.'],
    ['The Pale Herald', 'The Herald\'s Stair', 55, ['herald', 'revenant', 'revenant', 'shade'], 'The voice that called the dead out of their graves. Break the spell, and the man may remain.', { boss: true, recruit: 'aldren' }],
    ['The Dead Garrison', 'The Garrison', 56, ['revenant', 'revenant', 'templar', 'templar', 'warlord'], 'The last army of Vael, still in formation.'],
    ['Wyrm\'s Breath', 'The Scorched Hall', 57, ['brute', 'icegolem', 'shade', 'shade', 'templar'], 'The walls here are melted glass. Something breathed on them.'],
    ['The Hollow King', 'The Throne Room', 58, ['hollowking', 'templar', 'templar', 'shade'], 'The last king of Vael, hollowed out and still wearing the crown.', { boss: true }],
    ['The Last Stair', 'The Last Stair', 59, ['warlord', 'warlord', 'shade', 'shade', 'caller'], 'Below the throne, a stair goes down into the dark and the heat.'],
    ['Vaelor, the Barrow Wyrm', 'The Wyrm\'s Hoard', 60, ['wyrm', 'revenant', 'revenant'], 'The dragon the old kingdom fed with its dead. End it, and Vael can rest.', { boss: true }],
  ]),
];

// how strong each mission's foes are beyond their level (tuned by test/tune.js)
import { MIGHT } from './tuning.js';
for (const m of MISSIONS) m.might = MIGHT[m.id] || 1;

export const missionById = (id) => MISSIONS.find((m) => m.id === id);
export const regionOf = (m) => REGIONS.find((r) => r.id === m.region);
export const missionsIn = (rid) => MISSIONS.filter((m) => m.region === rid);
// a region opens once the last mission of the one before it is cleared
export function regionOpen(cleared, rid) {
  const i = REGIONS.findIndex((r) => r.id === rid);
  if (i <= 0) return true;
  const prev = missionsIn(REGIONS[i - 1].id);
  return !!cleared[prev[prev.length - 1].id];
}
export const regionCleared = (cleared, rid) => missionsIn(rid).every((m) => cleared[m.id]);
// a mission is open once the one before it in its region is cleared
export function isOpen(cleared, m) {
  const i = MISSIONS.indexOf(m);
  return i === 0 || !!cleared[MISSIONS[i - 1].id];
}
export function nextMission(cleared) { return MISSIONS.find((m) => !cleared[m.id]) || null; }
