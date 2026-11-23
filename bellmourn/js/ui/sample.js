// SAMPLE data shaped exactly like the shared contract (run, meta, map nodes, boon defs and offers, events,
// challenges, the Bell Tower, talents, the merchant's stock, a run summary). The screens use it only while
// the owners' modules (run.js, boons.js, events.js, challenges.js) have not landed, and the screen test
// renders with it. Every text here is a placeholder PROPOSAL, not canon.

export const RES = {
  ember: { name: 'EMBER', color: '#ff7a30' }, rime: { name: 'RIME', color: '#8fe2ff' }, blight: { name: 'BLIGHT', color: '#9ad43a' },
  thunder: { name: 'THUNDER', color: '#ffe04a' }, crimson: { name: 'CRIMSON', color: '#e8283e' }, dawn: { name: 'DAWN', color: '#fff0c4' }, silence: { name: 'SILENCE', color: '#a464ff' },
};
const V = (c, r, e, l) => ({ common: c, rare: r, epic: e, legendary: l });
// PROPOSAL (sample boons)
export const BOONS = {
  cinderStep: { id: 'cinderStep', name: 'CINDER STEP', res: 'ember', slot: 'dash', tier: 1, kind: 'boon', desc: 'YOUR DASH LEAVES A TRAIL OF FIRE THAT BURNS FOR {v} A SECOND.', values: V(8, 12, 16, 22) },
  kindling: { id: 'kindling', name: 'KINDLING EDGE', res: 'ember', slot: 'attack', tier: 1, kind: 'boon', desc: 'HITS SET FOES ALIGHT FOR {v} DAMAGE OVER TIME.', values: V(10, 15, 20, 28) },
  pyreHeart: { id: 'pyreHeart', name: 'PYRE HEART', res: 'ember', slot: 'passive', tier: 2, kind: 'boon', needs: { ember: 2 }, desc: 'BURNING FOES EXPLODE WHEN THEY FALL.', values: V(20, 30, 40, 55) },
  sunfall: { id: 'sunfall', name: 'SUNFALL', res: 'ember', slot: 'ult', tier: 3, kind: 'crown', needs: { ember: 4 }, desc: 'YOUR ULTIMATE CALLS DOWN A FALLING SUN.', values: V(120, 160, 200, 260) },
  frostbite: { id: 'frostbite', name: 'FROSTBITE', res: 'rime', slot: 'attack', tier: 1, kind: 'boon', desc: 'HITS CHILL. THE THIRD CHILLED HIT FREEZES FOR {v}S.', values: V(1, 1.3, 1.6, 2) },
  glacierStep: { id: 'glacierStep', name: 'GLACIER STEP', res: 'rime', slot: 'dash', tier: 1, kind: 'boon', desc: 'DASHING THROUGH FOES CHILLS THEM.', values: V(1, 1, 1, 1) },
  wintersHeart: { id: 'wintersHeart', name: 'WINTER HEART', res: 'rime', slot: 'passive', tier: 2, kind: 'boon', needs: { rime: 2 }, desc: 'FROZEN FOES SHATTER FOR {v} DAMAGE.', values: V(30, 45, 60, 80) },
  rotTouch: { id: 'rotTouch', name: 'ROT TOUCH', res: 'blight', slot: 'attack', tier: 1, kind: 'boon', desc: 'HITS POISON. POISON STACKS UP TO {v} TIMES.', values: V(3, 4, 5, 7) },
  plagueCloud: { id: 'plagueCloud', name: 'PLAGUE CLOUD', res: 'blight', slot: 'skill', tier: 1, kind: 'boon', desc: 'YOUR SKILLS LEAVE A CLOUD OF ROT.', values: V(6, 9, 12, 16) },
  stormcall: { id: 'stormcall', name: 'STORMCALL', res: 'thunder', slot: 'skill', tier: 1, kind: 'boon', desc: 'SKILLS CALL A BOLT ON THE NEAREST FOE FOR {v}.', values: V(18, 26, 34, 46) },
  arcStep: { id: 'arcStep', name: 'ARC STEP', res: 'thunder', slot: 'dash', tier: 1, kind: 'boon', desc: 'YOUR DASH CHAINS LIGHTNING BETWEEN FOES.', values: V(10, 14, 18, 24) },
  bloodPrice: { id: 'bloodPrice', name: 'BLOOD PRICE', res: 'crimson', slot: 'attack', tier: 1, kind: 'boon', desc: 'HITS BLEED. YOU DRINK {v}% OF THE BLOOD.', values: V(2, 3, 4, 6) },
  redTithe: { id: 'redTithe', name: 'RED TITHE', res: 'crimson', slot: 'passive', tier: 2, kind: 'boon', needs: { crimson: 2 }, desc: 'KILLS HEAL YOU FOR {v}.', values: V(3, 5, 7, 10) },
  matins: { id: 'matins', name: 'MATINS', res: 'dawn', slot: 'passive', tier: 1, kind: 'boon', desc: 'A SHIELD OF LIGHT RISES EVERY {v} SECONDS.', values: V(12, 10, 8, 6) },
  smite: { id: 'smite', name: 'SMITE', res: 'dawn', slot: 'ult', tier: 1, kind: 'boon', desc: 'YOUR ULTIMATE ENDS IN A PILLAR OF LIGHT.', values: V(60, 80, 100, 130) },
  hush: { id: 'hush', name: 'THE HUSH', res: 'silence', slot: 'attack', tier: 1, kind: 'boon', desc: 'HITS ON FOES UNDER {v}% HEALTH STRIKE TWICE.', values: V(25, 30, 35, 40) },
  nullStep: { id: 'nullStep', name: 'NULL STEP', res: 'silence', slot: 'dash', tier: 1, kind: 'boon', desc: 'AFTER A DASH YOU VANISH FOR A MOMENT.', values: V(0.5, 0.7, 0.9, 1.2) },
  steamBurst: { id: 'steamBurst', name: 'STEAM BURST', res: 'ember', slot: 'skill', tier: 2, kind: 'duo', duo: ['ember', 'rime'], desc: 'FIRE ON A CHILLED FOE BURSTS INTO SCALDING STEAM.', values: V(30, 40, 50, 70) },
  stormfire: { id: 'stormfire', name: 'STORMFIRE', res: 'thunder', slot: 'attack', tier: 2, kind: 'duo', duo: ['thunder', 'ember'], desc: 'LIGHTNING SETS FOES ALIGHT.', values: V(10, 14, 18, 24) },
  bloodfrost: { id: 'bloodfrost', name: 'RED ICE', res: 'crimson', slot: 'passive', tier: 2, kind: 'duo', duo: ['crimson', 'rime'], desc: 'FROZEN FOES BLEED WHEN THEY THAW.', values: V(12, 16, 20, 28) },
};

// PROPOSAL (sample map of Act I): x is the column (progress), y the lane
const N = (id, kind, x, y, next, o = {}) => ({ id, kind, act: 1, x, y, next, label: o.label || '', icon: kind, ...o });
export const MAP = {
  start: 'n0',
  nodes: [
    N('n0', 'area', 0.0, 0.5, ['n1', 'n2', 'n3'], { area: 'gate', label: 'GALLOWS GATE', variant: 'gate_fog', condition: 'fog' }),
    N('n1', 'event', 0.15, 0.18, ['n4']), N('n2', 'shrine', 0.15, 0.5, ['n4', 'n5']), N('n3', 'merchant', 0.15, 0.82, ['n5']),
    N('n4', 'area', 0.3, 0.3, ['n6', 'n7'], { area: 'market', label: 'LANTERN ROW', variant: 'market_burning', condition: 'burning' }),
    N('n5', 'area', 0.3, 0.72, ['n7', 'n8'], { area: 'docks', label: 'MIREWATER DOCKS', variant: 'docks_flooded', condition: 'flooded' }),
    N('n6', 'trial', 0.45, 0.14, ['n9']), N('n7', 'event', 0.45, 0.5, ['n9', 'n10']), N('n8', 'quest', 0.45, 0.86, ['n10'], { label: "TAM'S TOY BELL" }),
    N('n9', 'area', 0.6, 0.3, ['n11', 'n12'], { area: 'nave', label: 'THE DROWNED NAVE', variant: 'nave_bloodmoon', condition: 'bloodmoon' }),
    N('n10', 'area', 0.6, 0.7, ['n12'], { area: 'foundry', label: 'THE BELL FOUNDRY', variant: 'foundry_plague', condition: 'plague' }),
    N('n11', 'merchant', 0.74, 0.22, ['n13']), N('n12', 'shrine', 0.74, 0.62, ['n13']),
    N('n13', 'area', 0.87, 0.45, ['n14'], { area: 'heights', label: 'THE CROWN HEIGHTS', variant: 'heights_eclipse', condition: 'eclipse' }),
    N('n14', 'boss', 1.0, 0.5, [], { area: 'belfry', label: 'THE BELFRY' }),
  ],
};

export const RUN = {
  seed: 1234, hero: 'warden', act: 1, map: MAP, at: 'n4', visited: ['n0', 'n2', 'n4'], hp: 74, maxHp: 110, tonics: 2, embers: 135,
  boons: [{ id: 'cinderStep', rarity: 'rare' }, { id: 'kindling', rarity: 'common' }, { id: 'frostbite', rarity: 'epic' }, { id: 'matins', rarity: 'common' }, { id: 'steamBurst', rarity: 'legendary' }],
  echoes: ['gaoler'], relics: [], weapon: 'wardenBlade', curses: [], flags: {},
  stats: { kills: 212, freed: 188, healed: 140, tonics: 3, damageTaken: 420, bosses: ['gaoler', 'tallow'], areas: ['gate', 'market', 'docks'] },
  quest: { active: ['vesper_bell'] },
};

// an offer item: { id, rarity, def, chain: { res, tier, held, nextUnlocks } }
export function offers(run = RUN) {
  return [
    { id: 'pyreHeart', rarity: 'rare', def: BOONS.pyreHeart, chain: { res: 'ember', tier: 2, held: 2, nextUnlocks: ['SUNFALL'] } },
    { id: 'stormcall', rarity: 'epic', def: BOONS.stormcall, chain: { res: 'thunder', tier: 1, held: 0, nextUnlocks: ['STORMFIRE'] } },
    { id: 'bloodPrice', rarity: 'legendary', def: BOONS.bloodPrice, chain: { res: 'crimson', tier: 1, held: 0, nextUnlocks: ['RED TITHE', 'RED ICE'] } },
  ];
}

// PROPOSAL (sample events)
export const EVENTS = [
  { id: 'rain_figure', title: 'THE FIGURE IN THE RAIN', art: { scene: 'rain', palette: 'night' }, text: 'A HOODED SHAPE WAITS UNDER THE LAST LAMP. IT HOLDS OUT A HAND, AND IN IT SOMETHING GLOWS LIKE A COAL.',
    choices: [{ label: 'TAKE WHAT IT OFFERS', cost: { hp: 15 }, risk: 'IT MAY BE A CURSE', tags: ['boon'] }, { label: 'PAY IT IN EMBERS', cost: { embers: 40 }, tags: ['boon'] }, { label: 'WALK ON', tags: [] }] },
  { id: 'chapel_choir', title: 'A CHAPEL STILL SINGING', art: { scene: 'chapel', palette: 'gold' }, text: 'BEHIND A CRACKED DOOR A CHOIR OF HUSHED STANDS IN ROWS. THEIR MOUTHS MOVE. NO SOUND COMES OUT.',
    choices: [{ label: 'RING THE HAND BELL', risk: 'THEY MAY WAKE ANGRY', tags: ['fight'] }, { label: 'LEAVE A TONIC AT THE ALTAR', cost: { tonic: 1 }, tags: ['blessing'] }] },
  { id: 'docks_net', title: 'THE DROWNED NET', art: { scene: 'docks', palette: 'cold' }, text: 'A FISHING NET HEAVY WITH SOMETHING. IT STILL TWITCHES.',
    choices: [{ label: 'HAUL IT IN', cost: { hp: 10 }, tags: ['loot'] }, { label: 'CUT IT LOOSE', tags: [] }, { label: 'DIVE AFTER IT', cost: { hp: 25 }, risk: 'THE TIDE IS STRONG', tags: ['relic'] }] },
];
export const EVENT_RESULT = { lines: ['THE COAL BURNS INTO YOUR PALM.', 'SOMETHING ANSWERS IN YOUR BLOOD.'], changes: { hp: -15, embers: 0, boon: 'offer' } };

// PROPOSAL (sample challenges): { id, title, desc, reward, goal } + progress(meta) -> { n, of }
export const CHALLENGES = [
  { id: 'kestrel_gaoler', title: 'NO MERCY, NO TONIC', desc: 'DEFEAT THE GAOLER WITHOUT DRINKING A TONIC.', reward: { hero: 'kestrel' }, goal: 1, progress: () => ({ n: 0, of: 1 }) },
  { id: 'kestrel_free', title: 'A HUNDRED VOICES', desc: 'FREE 100 HUSHED.', reward: { hero: 'kestrel' }, goal: 100, progress: (m) => ({ n: Math.min(100, (m.challenges || {}).kestrel_free || 0), of: 100 }) },
  { id: 'hollis_crab', title: 'BREAK THE SHELL', desc: 'DEFEAT THE DROWNED KING-CRAB.', reward: { hero: 'hollis' }, goal: 1, progress: () => ({ n: 0, of: 1 }) },
  { id: 'hollis_vesper', title: 'BEYOND THE WALLS', desc: 'REACH ACT II WITH VESPER.', reward: { hero: 'hollis' }, goal: 1, progress: () => ({ n: 0, of: 1 }) },
  { id: 'wren_heal', title: 'UNMENDED', desc: 'REACH ACT II WITHOUT HEALING.', reward: { hero: 'wren' }, goal: 1, progress: () => ({ n: 0, of: 1 }) },
  { id: 'wren_three', title: 'ONE VOICE', desc: 'HOLD 3 BOONS OF ONE RESONANCE.', reward: { hero: 'wren' }, goal: 3, progress: () => ({ n: 3, of: 3 }) },
  { id: 'ash_shrines', title: 'THE PILGRIM', desc: 'REST AT 10 SHRINES.', reward: { hero: 'lamplighter' }, goal: 10, progress: (m) => ({ n: Math.min(10, (m.challenges || {}).ash_shrines || 0), of: 10 }) },
  { id: 'ash_tallow', title: 'SNUFF THE WICK', desc: 'DEFEAT MOTHER TALLOW.', reward: { hero: 'lamplighter' }, goal: 1, progress: () => ({ n: 1, of: 1 }) },
  { id: 'res_crimson3', title: 'RED HARVEST', desc: 'HEAL 500 WITH CRIMSON BOONS.', reward: { res: 'crimson' }, goal: 500, progress: () => ({ n: 310, of: 500 }) },
  { id: 'boon_sunfall', title: 'PYRE OF THE CITY', desc: 'BURN 300 FOES.', reward: { boon: 'sunfall' }, goal: 300, progress: () => ({ n: 120, of: 300 }) },
  { id: 'echo_keys', title: 'TURN THE KEY', desc: 'CHAIN 50 FOES WITH THE GAOLER\'S KEYS.', reward: { echo: 'gaoler' }, goal: 50, progress: () => ({ n: 50, of: 50 }) },
  { id: 'colour_carmine', title: 'BLACK CLOAK', desc: 'WIN A RUN WITH CARMINE.', reward: { colour: 'warden:black' }, goal: 1, progress: () => ({ n: 0, of: 1 }) },
];

// PROPOSAL (sample Bell Tower upgrades)
export const TOWER = [
  { id: 'tonic', name: 'ONE MORE TONIC', desc: 'START EVERY RUN WITH ONE MORE TONIC.', max: 2, cost: [60, 140] },
  { id: 'reroll', name: 'SECOND THOUGHTS', desc: 'ONE FREE BOON REROLL PER RUN.', max: 3, cost: [40, 90, 160] },
  { id: 'purse', name: 'EMBER PURSE', desc: 'START WITH 25 EMBERS PER LEVEL.', max: 4, cost: [30, 60, 100, 150] },
  { id: 'vigor', name: 'IRON VIGOR', desc: '+5% HEALTH PER LEVEL.', max: 5, cost: [50, 80, 120, 170, 230] },
  { id: 'rarity', name: 'BRIGHTER BRONZE', desc: 'BOONS ARE MORE OFTEN RARE OR BETTER.', max: 3, cost: [80, 160, 260] },
  { id: 'shrine', name: 'WARM SHRINES', desc: 'SHRINES HEAL 10% MORE.', max: 2, cost: [45, 110] },
];

// PROPOSAL (sample talents): per warden, unlocked by mastery level
const T = (id, name, desc, level) => ({ id, name, desc, level });
export const TALENTS = {
  warden: [T('w_edge', 'KEEN EDGE', 'THE THIRD SWING OF A COMBO HITS 15% HARDER.', 1), T('w_cloak', 'RED CLOAK', 'TAKE 10% LESS DAMAGE WHILE ABOVE HALF HEALTH.', 2), T('w_vow', 'THE OLD VOW', 'START EACH ACT WITH A DAWN SHIELD.', 4), T('w_toll', 'FIRST TOLL', 'YOUR FIRST BOON EACH RUN IS RARE OR BETTER.', 6)],
  huntress: [T('h_eye', 'NIGHT EYE', 'CRITS ON FOES FARTHER THAN 6 M.', 1), T('h_roof', 'ROOFRUNNER', 'ONE MORE DASH CHARGE.', 3), T('h_tam', 'FOR TAM', 'FREED HUSHED GIVE ONE MORE EMBER.', 5)],
  bellbreaker: [T('b_iron', 'IRON SKIN', '+10% HEALTH.', 1), T('b_mould', 'BROKEN MOULD', 'HEAVY BLOWS STAGGER LONGER.', 3), T('b_forge', 'FORGE HEAT', 'EMBER BOONS ARE OFFERED MORE OFTEN.', 5)],
  lamplighter: [T('l_wick', 'LONG WICK', 'THE LANTERN BURNS 20% LONGER.', 1), T('l_ash', 'ASH AND OIL', 'SHRINES HEAL MORE.', 3)],
  kestrel: [T('k_keys', 'HER FATHER\'S KEYS', 'TRIALS DROP A RELIC MORE OFTEN.', 1), T('k_fury', 'FURY', 'ATTACK FASTER BELOW HALF HEALTH.', 3)],
  hollis: [T('o_tide', 'UNDERTOW', 'THE CHAIN PULLS FOES CLOSER.', 1), T('o_bell', 'HARBOUR BELL', 'A TOLL EVERY 20 S CHILLS NEARBY FOES.', 3)],
  wren: [T('r_hymn', 'OLD HYMNS', 'SILENCE BOONS ARE OFFERED MORE OFTEN.', 1), T('r_choir', 'CHOIRMISTRESS', 'NOTES PIERCE ONE MORE FOE.', 3)],
};

export const META = {
  v: 3, unlocked: ['warden', 'huntress', 'bellbreaker', 'lamplighter'],
  mastery: { warden: { xp: 340, level: 4, talents: ['w_edge'] }, huntress: { xp: 120, level: 2, talents: [] }, bellbreaker: { xp: 40, level: 1, talents: [] }, lamplighter: { xp: 0, level: 1, talents: [] } },
  shards: 245, tower: { tonic: 1, reroll: 2, purse: 0, vigor: 1 },
  challenges: { kestrel_free: 64, ash_shrines: 7 }, done: ['ash_tallow', 'wren_three', 'echo_keys'],
  codex: { foes: { hushed: 412, ghoul: 80, crossbow: 33, hound: 51, acolyte: 12, rat: 40 }, bosses: { gaoler: 3, tallow: 2, harbormaster: 1 }, boons: { cinderStep: 1, kindling: 1, frostbite: 1, matins: 1, steamBurst: 1, bloodPrice: 1, stormcall: 1 }, echoes: { gaoler: 1, tallow: 1 }, lore: { l1: true, l2: true }, endings: ['dawn'] },
  friends: ['huntress'], quests: { vesper_bell: 1 }, hints: { docks_toy: true }, runs: 9, best: { act: 2, depth: 11 }, story: { seen: {} }, settings: {},
};

// PROPOSAL (sample lore pages for the Codex)
export const LORE = [
  { id: 'l1', title: 'THE FIRST FOUNDER', text: 'HE CAUGHT THE VOICE OF A DYING GOD IN BRONZE, AND EVERY DAWN SINCE HAS BEEN ITS TOLL.' },
  { id: 'l2', title: 'THE HUSHED', text: 'THEIR VOICES DID NOT DIE. THEY SLEEP IN THEM LIKE SPARKS UNDER ASH.' },
  { id: 'l3', title: 'THE HOLLOW CHOIR', text: 'THEY TEACH THAT THE WORLD IS A PRISON, AND THAT ONLY SILENCE SETS A SOUL FREE.' },
  { id: 'l4', title: 'THE WHEEL', text: 'AN ENGINE OF RINGS AND EYES THAT HAS ALWAYS TURNED AGAINST THE TOLL.' },
];
export const ENDINGS = [{ id: 'dawn', title: 'THE DAWN' }, { id: 'silence', title: 'SILENCE' }, { id: 'song', title: 'THE NEW SONG' }];

// the merchant's stock: { id, kind, name, desc, price, rarity?, res?, sold? }
export const STOCK = [
  { id: 'tonic', kind: 'tonic', name: 'TONIC', desc: 'ONE MORE DRAUGHT FOR THE ROAD.', price: 45 },
  { id: 'relic_lamp', kind: 'relic', name: 'WARDEN\'S LAMP', desc: 'FOES NEAR YOU ARE SLOWER.', price: 120, rarity: 'rare' },
  { id: 'boon_matins', kind: 'boon', name: 'MATINS', desc: 'A SHIELD OF LIGHT EVERY 10 S.', price: 90, rarity: 'rare', res: 'dawn', boon: 'matins' },
  { id: 'wpn_saber', kind: 'weapon', name: 'GALLOWS SABER', desc: 'HITS MAY CAUSE BLEEDING.', price: 160, rarity: 'epic' },
  { id: 'heal', kind: 'heal', name: 'POULTICE', desc: 'HEAL 30 HEALTH.', price: 30 },
];

// endRun's summary { shards, masteryXp, challengesDone, unlocks, lines } plus the run it closes
export const SUMMARY = {
  outcome: 'death', hero: 'warden', act: 2, depth: 11, run: RUN,
  shards: 86, masteryXp: 140, mastery: { level: 4, xp: 340, next: 400, levelAfter: 5 },
  challengesDone: ['wren_three', 'echo_keys'],
  unlocks: [{ kind: 'hero', id: 'kestrel', name: 'KESTREL' }, { kind: 'boon', id: 'sunfall', name: 'SUNFALL' }],
  lines: ['THE ROAD ENDS IN THE FROSTMARCH.', 'THE BELL WILL WAIT FOR YOU.'],
};
