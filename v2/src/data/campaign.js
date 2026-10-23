// The campaign: regions, their missions, who joins the company and when. Pure data.
// Every name and line here is written for the game (Proposal: the author may rename or rewrite any of it).
//
// A mission: id, name, place, text (the briefing), level (the foes' level), foes ([key, slot]),
// boss, recruit (who joins on the first clear), theme (the ground), map ([x, y] in % of the map).

export const START_ROSTER = ['corvin', 'wren', 'maren'];
export const START_TEAM = [{ key: 'corvin', slot: 1 }, { key: 'maren', slot: 3 }, { key: 'wren', slot: 5 }];

export const PREMISE = 'The old kingdom of Vael is gone, and its dead walk the roads. In the border town of Thornwick, three sellswords sign a company charter and take the first job on the board.';

export const REGIONS = [
  { id: 'r1', name: 'The Thornwick Road', blurb: 'Bandits on the river road, and something wrong in the graveyards.' },
  { id: 'r2', name: 'The Greyfen', blurb: 'Coming later.', locked: true },
];

export const MISSIONS = [
  { id: 'r1m1', region: 'r1', name: 'The Toll Bridge', place: 'Thornwick River', level: 1, might: 1, theme: 'meadow', map: [12, 70],
    text: 'Bandits hold the bridge and charge a toll in blood. A ferry guard has been holding them off alone.',
    foes: [['brawler', 1], ['cutthroat', 0], ['slinger', 4]], recruit: 'hesta' },
  { id: 'r1m2', region: 'r1', name: 'Smoke over Millbrook', place: 'Millbrook', level: 2, might: 1.1, theme: 'meadow', map: [24, 50],
    text: 'The same gang is burning the mill. The baker refuses to leave her ovens.',
    foes: [['bruiser', 1], ['cutthroat', 2], ['slinger', 3], ['slinger', 5]], recruit: 'pell' },
  { id: 'r1m3', region: 'r1', name: 'The Old Watchtower', place: 'Watchtower Hill', level: 3, might: 1.15, theme: 'dusk', map: [33, 26], boss: true,
    text: 'Their chief, Garrow, keeps a prisoner in the tower: a mage who set his camp on fire twice.',
    foes: [['chief', 1], ['thug', 0], ['brawler', 2], ['slinger', 4]], recruit: 'ysolde' },
  { id: 'r1m4', region: 'r1', name: 'Graves That Stir', place: 'Ashby Churchyard', level: 4, might: 1.55, theme: 'grave', map: [44, 46],
    text: 'The churchyard at Ashby is empty. Its graves are open from the inside.',
    foes: [['risen', 0], ['risen', 1], ['risen', 2], ['archer', 4]] },
  { id: 'r1m5', region: 'r1', name: 'The Fighting Pit', place: 'Ashby Crossing', level: 5, might: 1.55, theme: 'dusk', map: [52, 70],
    text: 'A pit fighter has beaten everyone in the crossing. He will join whoever can stand against his crew.',
    foes: [['thug', 0], ['bruiser', 1], ['brawler', 2], ['thug', 4]], recruit: 'brann' },
  { id: 'r1m6', region: 'r1', name: 'The Bone Caller', place: 'Hollow Lane', level: 6, might: 1.4, theme: 'grave', map: [61, 48],
    text: 'Someone is raising the dead on purpose. A hexer in a borrowed hood has been tracking him.',
    foes: [['risen', 0], ['pikeman', 1], ['risen', 2], ['archer', 3], ['caller', 4]], recruit: 'sable' },
  { id: 'r1m7', region: 'r1', name: 'Night on the Road', place: 'The King\'s Road', level: 7, might: 1.55, theme: 'night', map: [70, 28],
    text: 'Bandits and the dead on the same road, the same night. A thief has been robbing both.',
    foes: [['cutthroat', 0], ['risen', 1], ['cutthroat', 2], ['archer', 3], ['slinger', 5]], recruit: 'vesk' },
  { id: 'r1m8', region: 'r1', name: 'The Drowned Chapel', place: 'Mere Chapel', level: 8, might: 1.75, theme: 'grave', map: [77, 56],
    text: 'The last archer of the dawn order keeps watch over a chapel the water has half taken.',
    foes: [['risen', 0], ['pikeman', 1], ['risen', 2], ['caller', 3], ['archer', 5]], recruit: 'saela' },
  { id: 'r1m9', region: 'r1', name: 'Stone in the Hollow', place: 'The Hollow', level: 9, might: 1.65, theme: 'night', map: [84, 32], boss: true,
    text: 'The callers have bound an old guardian of stone. Break the bind and it may remember who it served.',
    foes: [['golem', 1], ['risen', 0], ['risen', 2], ['caller', 4]], recruit: 'cairn' },
  { id: 'r1m10', region: 'r1', name: 'The Grave Warlord', place: 'Barrow Gate', level: 10, might: 1.3, theme: 'grave', map: [92, 60], boss: true,
    text: 'At the barrow gate stands the thing that leads the dead of the Thornwick Road.',
    foes: [['warlord', 1], ['risen', 0], ['pikeman', 2], ['archer', 3], ['caller', 5]] },
];

// recruits not found in region 1 yet
export const LATER = { osric: 'r2', thistle: 'r2' };

export const missionById = (id) => MISSIONS.find((m) => m.id === id);
// a mission is open once the one before it in its region is cleared
export function isOpen(cleared, m) {
  const i = MISSIONS.indexOf(m);
  return i === 0 || !!cleared[MISSIONS[i - 1].id];
}
export function nextMission(cleared) { return MISSIONS.find((m) => !cleared[m.id]) || null; }
