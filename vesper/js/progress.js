// VESPER — progression: the profile (level, XP, skill points), the skill tree, which heroes are
// unlocked and how, and the campaign: seven acts up the Spire, each a branching map of fights,
// elites, challenges, shrines and a guardian. Pure data and functions; runs in Node for tests.
(function (root) {
  const VS = root.VS = root.VS || {};
  const P = VS.PROG = {};
  const D = () => VS.DATA;
  if (!VS.LOOT && typeof require === 'function') require('./loot.js');
  if (!VS.MODES && typeof require === 'function') require('./modes.js');
  const LT = () => VS.LOOT;

  // ---- levels -------------------------------------------------------------------------------
  P.MAX_LVL = 40;
  P.need = (lvl) => 60 + 50 * (lvl - 1);                 // XP from this level to the next
  P.fresh = () => LT().migrate({ v: 2, xp: 0, lvl: 1, sp: 0, skills: ['heavy', 'dodge'], heroes: ['vesper'], hero: 'vesper', nodes: {}, flags: {}, seen: {}, tips: {}, last: 'a0-t',
    stats: { wins: 0, kills: 0, bosses: 0, stars: 0 } });
  // Add XP; every level gives a skill point. Returns the number of levels gained.
  P.addXp = function (p, n) {
    let ups = 0; p.xp += Math.round(n);
    while (p.lvl < P.MAX_LVL && p.xp >= P.need(p.lvl)) { p.xp -= P.need(p.lvl); p.lvl++; p.sp++; ups++; }
    if (p.lvl >= P.MAX_LVL) p.xp = 0;
    return ups;
  };

  // ---- the skill tree -----------------------------------------------------------------------------
  // Three branches. The base kit is the light-attack combo, the dash and the heavy; both
  // skills and the ultimate are bought here with skill points, from the level shown.
  P.BRANCHES = [
    { id: 'blade', name: 'Blade', desc: 'Strikes and damage', col: '#ff3048' },
    { id: 'shadow', name: 'Shadow', desc: 'Evasion and endurance', col: '#c9a0ff' },
    { id: 'moon', name: 'Moon', desc: 'Skills and the ultimate', col: '#ffd060' }];
  P.SKILLS = [
    { id: 'heavy', br: 'blade', core: true, base: true, name: 'Heavy Attack', desc: 'Comes on its own from your combo: when three or more crowd you, a shield is in your way, or a combo runs its full length, your attack becomes a heavy blow that hits all around and breaks shields.', cost: 0, lvl: 1, req: [] },
    { id: 'fourth', br: 'blade', name: 'Fifth Cut', desc: 'Your combo gains a fifth, heavier cut.', cost: 1, lvl: 4, req: ['heavy'] },
    { id: 'edge', br: 'blade', name: 'Whetted Edge', desc: 'Deal 20% more damage.', cost: 2, lvl: 6, req: ['fourth'] },
    { id: 'riposte', br: 'blade', name: 'Counter Cut', desc: 'After a perfect dodge, your next cut deals triple damage.', cost: 2, lvl: 9, req: ['edge', 'ghost'] },
    { id: 'edge2', br: 'blade', name: 'Keen Edge', desc: 'Deal 15% more damage again.', cost: 3, lvl: 12, req: ['edge'] },
    { id: 'exec', br: 'blade', name: 'Executioner', desc: 'Deal 50% more damage to foes under a quarter health.', cost: 3, lvl: 15, req: ['edge2'] },
    { id: 'dodge', br: 'shadow', core: true, base: true, name: 'Dodge', desc: 'Space: dash through danger, untouchable for a moment. Cut right after for a dash-cut.', cost: 0, lvl: 1, req: [] },
    { id: 'iron', br: 'shadow', name: 'Iron Skin', desc: 'Take 15% less damage.', cost: 1, lvl: 2, req: ['dodge'] },
    { id: 'ghost', br: 'shadow', name: 'Ghoststep', desc: 'Dashes go farther; the perfect dodge is easier.', cost: 1, lvl: 5, req: ['dodge'] },
    { id: 'wind', br: 'shadow', name: 'Second Wind', desc: 'A perfect dodge heals 8 health.', cost: 2, lvl: 7, req: ['ghost'] },
    { id: 'vigor', br: 'shadow', name: 'Second Heart', desc: '30 more health.', cost: 2, lvl: 8, req: ['ghost'] },
    { id: 'vigor2', br: 'shadow', name: 'Third Heart', desc: '30 more health again.', cost: 3, lvl: 11, req: ['vigor'] },
    { id: 'thirst', br: 'shadow', name: 'Red Thirst', desc: 'Heal 5% of the damage you deal.', cost: 3, lvl: 14, req: ['vigor2', 'wind'] },
    { id: 'skill1', br: 'moon', core: true, hero: 0, name: 'First Skill', desc: 'Your hero\'s first skill. It joins your combo by itself whenever it is ready.', cost: 1, lvl: 2, req: [] },
    { id: 'art', br: 'moon', core: true, name: 'Moon Art', desc: 'E when the moon is full: your hero\'s ultimate, a cinematic strike.', cost: 2, lvl: 3, req: ['skill1'] },
    { id: 'skill2', br: 'moon', core: true, hero: 1, name: 'Second Skill', desc: 'Your hero\'s second skill. It joins your combo by itself whenever it is ready.', cost: 1, lvl: 5, req: ['skill1'] },
    { id: 'moonblood', br: 'moon', name: 'Moonblood', desc: 'The moon fills 40% faster.', cost: 2, lvl: 8, req: ['art'] },
    { id: 'rising', br: 'moon', name: 'Rising Moon', desc: 'Start every fight with the moon half full.', cost: 2, lvl: 10, req: ['moonblood'] },
    { id: 'breath', br: 'moon', name: 'Last Breath', desc: 'Low-health ultimates open at 45% health instead of 30%.', cost: 3, lvl: 13, req: ['art'] },
    { id: 'quick', br: 'moon', name: 'Quick Hands', desc: 'Skills recharge 30% faster.', cost: 3, lvl: 16, req: ['skill2', 'rising'] },
  ];
  P.skill = (id) => P.SKILLS.find((k) => k.id === id);
  // Parry was taken out of the game (the author, 2026-11-10): a save that learned it, or Steady Hand, gets the points back.
  P.dropParry = function (p) { if (!p || !p.skills) return p; for (const [id, c] of [['parry', 1], ['guard', 2]]) { const i = p.skills.indexOf(id); if (i >= 0) { p.skills.splice(i, 1); p.sp = (p.sp || 0) + c; } } return p; };
  P.has = (p, id) => p.skills.indexOf(id) >= 0;
  P.canBuy = function (p, id) {
    const k = P.skill(id); if (!k) return { ok: false, why: 'Unknown' };
    if (P.has(p, id)) return { ok: false, why: 'Learned', owned: true };
    if (p.lvl < k.lvl) return { ok: false, why: 'Reach level ' + k.lvl };
    const miss = k.req.filter((r) => !P.has(p, r)); if (miss.length) return { ok: false, why: 'Needs ' + miss.map((r) => P.skill(r).name).join(' and ') };
    if (p.sp < k.cost) return { ok: false, why: k.cost + ' skill point' + (k.cost > 1 ? 's' : '') };
    return { ok: true };
  };
  P.buy = function (p, id) { const c = P.canBuy(p, id); if (!c.ok) return false; p.sp -= P.skill(id).cost; p.skills.push(id); return true; };
  // Take every point back (free): spent points return, abilities are unlearned.
  P.respec = function (p) { for (const id of p.skills) p.sp += P.skill(id).cost; p.skills = P.SKILLS.filter((k) => k.base).map((k) => k.id); };
  P.spent = (p) => p.skills.reduce((n, id) => n + P.skill(id).cost, 0);
  P.kit = (p) => p.skills.filter((id) => P.skill(id).core);
  P.passives = (p) => p.skills.filter((id) => !P.skill(id).core);

  // ---- heroes ------------------------------------------------------------------------------------
  // Vesper starts. The others are earned: by level, by felling a guardian, or by a feat.
  P.UNLOCKS = {
    vesper: { kind: 'start', text: 'Your first hero' },
    lys: { kind: 'level', n: 4, text: 'Reach level 4' },
    kestrel: { kind: 'boss', node: 'a2-b', text: 'Defeat the Umbral' },
    wisp: { kind: 'feat', flag: 'untouchable', text: 'Defeat a guardian without taking a single hit' },
    ember: { kind: 'boss', node: 'a1-b', text: 'Defeat the Hollow Twins' },
    halden: { kind: 'stars', n: 60, text: 'Earn 60 stars' },
    rime: { kind: 'level', n: 12, text: 'Reach level 12' },
    firstcut: { kind: 'boss', node: 'a5-b', text: 'Defeat the First Cut' },
  };
  P.heroOk = (p, id) => p.heroes.indexOf(id) >= 0;
  P.heroGoal = function (p, id) {
    const u = P.UNLOCKS[id] || { kind: 'start', text: '' };
    if (u.kind === 'level') return { text: u.text, now: Math.min(p.lvl, u.n), of: u.n };
    if (u.kind === 'boss') return { text: u.text, now: P.cleared(p, u.node) ? 1 : 0, of: 1 };
    if (u.kind === 'feat') return { text: u.text, now: p.flags[u.flag] ? 1 : 0, of: 1 };
    if (u.kind === 'stars') return { text: u.text, now: Math.min(u.n, P.totalStars(p)), of: u.n };
    return { text: u.text, now: 1, of: 1 };
  };
  // Grant whatever has been earned; returns the newly unlocked hero ids.
  P.checkHeroes = function (p) {
    const got = [];
    for (const id in P.UNLOCKS) { if (P.heroOk(p, id) || !(D().HEROES && D().HEROES[id])) continue; const g = P.heroGoal(p, id); if (g.now >= g.of) { p.heroes.push(id); got.push(id); } }
    return got;
  };

  // ---- the campaign ------------------------------------------------------------------------------
  // Acts are the hours of the night (the stage whose arenas and foes they use). Echoes is the
  // post-game: every guardian again, stronger, and the endless night.
  P.ACTS = [
    { stage: 0, num: 'I', hour: 'DUSK', name: 'The Black Gate', pool: ['thrall', 'reaver', 'thrall', 'bulwark', 'gatespear', 'husk', 'risen', 'pikeman', 'boneguard', 'gateguard', 'chieftain'] },
    { stage: 1, num: 'II', hour: 'THE FIRST HOUR', name: 'Cloister of Frost', pool: ['frostpike', 'acolyte', 'cloisterknight', 'knife', 'duelist', 'husk', 'seer', 'brute'] },
    { stage: 2, num: 'III', hour: 'THE SECOND HOUR', name: 'The Umbral Stair', pool: ['cutthroat', 'wraith', 'boneguard', 'shadowbulwark', 'sunguard', 'shade', 'stalker', 'husk', 'warlock', 'brute'] },
    { stage: 3, num: 'IV', hour: 'THE THIRD HOUR', name: 'The Ashen Waste', pool: ['hound', 'ravager', 'dunereaver', 'cinder', 'scrapper', 'blight', 'husk', 'ram', 'dunebrute', 'ashlock', 'golem'] },
    { stage: 4, num: 'V', hour: 'THE FOURTH HOUR', name: "The Wind's Throat", pool: ['ridgepike', 'ranger', 'windmonk', 'scrapper', 'harpy', 'stalker', 'husk', 'stormfist', 'sniper', 'dunereaver', 'brute'] },
    { stage: 5, num: 'VI', hour: 'THE LAST HOUR', name: "The Moon's Shadow", pool: ['woundknight', 'woundblade', 'paladin', 'redwraith', 'husk', 'bloodlock', 'shield', 'brute'] },
    { stage: 5, num: 'VII', hour: 'AFTER DAWN', name: 'Echoes of the Night', pool: ['woundknight', 'duelist', 'wraith', 'ram', 'harpy', 'paladin', 'ashlock', 'sniper', 'cutthroat', 'chieftain'], echoes: true },
  ];
  P.RULES = {
    time: (n) => 'Against the clock: clear it within ' + n + ' seconds',
    glass: () => 'Glass Blade: half your health, double your damage',
    nohit: () => 'Untouchable: a single hit and you fall',
    elites: () => 'Every wave is led by an elite',
    noheal: () => 'No Mercy: kills do not heal you',
    nomoon: () => 'Moonless: no ultimate',
    horde: () => 'The Horde: wave after wave after wave',
  };
  // [id, type, name, x, y, next, extra]. x: -1..1 across the map; y: 0..1 up the act.
  const L = [
    // Act I: dusk at the Black Gate. The trial teaches the basics.
    [0, 'a0-t', 'trial', 'First Steps', 0, 0.04, ['a0-1'], { sub: 'Learn to move and fight' }],
    [0, 'a0-1', 'battle', 'The Outer Court', 0, 0.16, ['a0-2', 'a0-s'], { sub: 'The dead stir in the courtyard' }],
    [0, 'a0-2', 'battle', 'Ghoul Pits', -0.56, 0.3, ['a0-3'], { sub: 'Where the risen crawl out' }],
    [0, 'a0-s', 'shrine', 'Shrine of Dusk', 0.56, 0.29, ['a0-3']],
    [0, 'a0-3', 'elite', 'The Raider Captain', 0, 0.44, ['a0-4', 'a0-c'], { sub: 'A captain still leads his dead' }],
    [0, 'a0-4', 'battle', 'Archers on the Wall', -0.52, 0.6, ['a0-5'], { sub: 'Arrows from the battlements' }],
    [0, 'a0-c', 'challenge', 'Hold the Gate', 0.56, 0.6, ['a0-5'], { rule: 'time', n: 100, sub: 'Before the gate seals' }],
    [0, 'a0-5', 'battle', 'The Gate Bridge', 0, 0.75, ['a0-b'], { sub: 'One narrow way across' }],
    [0, 'a0-b', 'boss', 'The Gatewarden', 0, 0.9, ['a1-1'], { sub: 'Keeper of the Black Gate' }],
    // Act II: the frozen cloister.
    [1, 'a1-1', 'battle', 'Frozen Steps', 0, 0.06, ['a1-2', 'a1-s'], { sub: 'Ice over old blood' }],
    [1, 'a1-2', 'battle', 'Hall of Knives', -0.54, 0.2, ['a1-3'], { sub: 'Blades in the dark' }],
    [1, 'a1-s', 'shrine', 'Shrine of Frost', 0.54, 0.2, ['a1-3']],
    [1, 'a1-3', 'elite', 'The Hexer Choir', 0, 0.34, ['a1-4', 'a1-x'], { sub: 'Their hymn is a curse' }],
    [1, 'a1-x', 'challenge', 'Untouchable', 0.78, 0.44, [], { rule: 'nohit', echo: 'warden', sub: 'The Gatewarden\'s echo. Do not get hit.' }],
    [1, 'a1-4', 'challenge', 'Glass Blade', -0.5, 0.5, ['a1-5'], { rule: 'glass', sub: 'Strike first, strike hard' }],
    [1, 'a1-5', 'battle', 'The Bell Tower', 0.06, 0.62, ['a1-6', 'a1-7'], { sub: 'The bells still ring for them' }],
    [1, 'a1-6', 'battle', 'Spears in the Snow', -0.52, 0.76, ['a1-b'], { sub: 'A shield wall of the dead' }],
    [1, 'a1-7', 'elite', 'Frostbound Golem', 0.52, 0.76, ['a1-b'], { sub: 'Stone that walks' }],
    [1, 'a1-b', 'boss', 'The Hollow Twins', 0, 0.9, ['a2-1'], { sub: 'The Left Hand and the Right' }],
    // Act III: the stair into darkness.
    [2, 'a2-1', 'battle', 'The First Landing', 0, 0.06, ['a2-2', 'a2-s'], { sub: 'The light ends here' }],
    [2, 'a2-2', 'battle', 'Bone Gallery', -0.54, 0.2, ['a2-3'], { sub: 'Skeletons in their thousands' }],
    [2, 'a2-s', 'shrine', 'Shrine of Shadow', 0.54, 0.19, ['a2-3']],
    [2, 'a2-3', 'elite', 'The Poacher King', 0, 0.34, ['a2-4', 'a2-c'], { sub: 'He hunts what climbs' }],
    [2, 'a2-4', 'battle', 'Stair of Echoes', -0.52, 0.49, ['a2-5'], { sub: 'Footsteps that are not yours' }],
    [2, 'a2-c', 'challenge', 'Moonless', 0.54, 0.49, ['a2-5'], { rule: 'nomoon', sub: 'The moon is hidden. Fight without it.' }],
    [2, 'a2-5', 'challenge', 'Eclipse Horde', 0, 0.62, ['a2-6', 'a2-7'], { rule: 'horde', sub: 'They pour down the stair' }],
    [2, 'a2-6', 'battle', 'The Black Chapel', -0.52, 0.76, ['a2-b'], { sub: 'Prayers to nothing' }],
    [2, 'a2-7', 'elite', 'Twin Golems', 0.52, 0.76, ['a2-b'], { sub: 'Two of them, back to back' }],
    [2, 'a2-b', 'boss', 'The Umbral', 0, 0.9, ['a3-1'], { sub: 'Who Walks Behind' }],
    // Act IV: the ashen waste.
    [3, 'a3-1', 'battle', 'Cinder Road', 0, 0.06, ['a3-2', 'a3-3'], { sub: 'Ash to the ankles' }],
    [3, 'a3-2', 'elite', 'Pyre Lords', -0.54, 0.2, ['a3-4', 'a3-s'], { sub: 'They burn and do not die' }],
    [3, 'a3-3', 'battle', 'Ash Graves', 0.54, 0.2, ['a3-4'], { sub: 'Every grave is open' }],
    [3, 'a3-s', 'shrine', 'Shrine of Embers', -0.84, 0.36, ['a3-4']],
    [3, 'a3-4', 'challenge', 'No Mercy', 0, 0.36, ['a3-5', 'a3-6'], { rule: 'noheal', sub: 'Nothing here will mend you' }],
    [3, 'a3-5', 'battle', 'The Burning Field', -0.52, 0.52, ['a3-7'], { sub: 'Fire on every side' }],
    [3, 'a3-6', 'elite', 'The Ghast Mother', 0.52, 0.52, ['a3-7'], { sub: 'Her brood follows' }],
    [3, 'a3-7', 'challenge', 'Ashstorm', 0, 0.66, ['a3-8'], { rule: 'time', n: 115, sub: 'Through the storm before it buries you' }],
    [3, 'a3-8', 'battle', 'Edge of the Waste', 0, 0.78, ['a3-b'], { sub: 'Something is hungry' }],
    [3, 'a3-b', 'boss', 'The Hunger', 0, 0.91, ['a4-1'], { sub: 'It Eats the Light' }],
    // Act V: the wind's throat.
    [4, 'a4-1', 'battle', 'Gale Steps', 0, 0.06, ['a4-2', 'a4-s'], { sub: 'The wind wants you off the Spire' }],
    [4, 'a4-2', 'battle', 'Hunters\' Ridge', -0.54, 0.2, ['a4-3'], { sub: 'Snares on the ridge' }],
    [4, 'a4-s', 'shrine', 'Shrine of the Wind', 0.54, 0.2, ['a4-3']],
    [4, 'a4-3', 'elite', 'The Storm Riders', 0, 0.34, ['a4-4', 'a4-5'], { sub: 'They ride the gale' }],
    [4, 'a4-4', 'challenge', 'Elite Gauntlet', -0.52, 0.5, ['a4-6'], { rule: 'elites', sub: 'The strongest of them, one after another' }],
    [4, 'a4-5', 'battle', 'The Narrow Path', 0.52, 0.5, ['a4-6'], { sub: 'A ledge above nothing' }],
    [4, 'a4-6', 'challenge', 'Glass Storm', 0, 0.63, ['a4-7'], { rule: 'glass', sub: 'Fragile as the air' }],
    [4, 'a4-7', 'elite', 'The Last Watch', 0, 0.77, ['a4-b'], { sub: 'They have never let anyone pass' }],
    [4, 'a4-b', 'boss', 'The Pale Wing', 0, 0.91, ['a5-1'], { sub: 'Throat of the Wind' }],
    // Act VI: the moon's shadow, the top of the Spire.
    [5, 'a5-1', 'battle', 'Blood Stair', 0, 0.06, ['a5-2', 'a5-3'], { sub: 'The steps are wet and red' }],
    [5, 'a5-2', 'elite', 'Knights of the Wound', -0.54, 0.2, ['a5-4'], { sub: 'Sworn to the cut' }],
    [5, 'a5-3', 'shrine', 'Shrine of the Moon', 0.54, 0.2, ['a5-4']],
    [5, 'a5-4', 'challenge', 'The Long Night', 0, 0.36, ['a5-5', 'a5-6'], { rule: 'horde', sub: 'Hold until they stop coming' }],
    [5, 'a5-5', 'battle', 'Throne Hall', -0.52, 0.52, ['a5-7'], { sub: 'An empty throne under the moon' }],
    [5, 'a5-6', 'challenge', 'Last Light', 0.52, 0.52, ['a5-7'], { rule: 'time', n: 120, sub: 'Dawn will not wait' }],
    [5, 'a5-7', 'elite', 'The Wound\'s Guard', 0, 0.67, ['a5-8'], { sub: 'The last of his knights' }],
    [5, 'a5-8', 'battle', 'Under the Moon', 0, 0.79, ['a5-b'], { sub: 'Close enough to touch it' }],
    [5, 'a5-b', 'boss', 'The First Cut', 0, 0.92, ['a6-1'], { sub: 'Who Wounded the Moon' }],
    // Act VII (post-game): echoes of every guardian, stronger, and the endless night.
    [6, 'a6-1', 'echo', 'Echo: The Gatewarden', 0, 0.08, ['a6-2', 'a6-3'], { echo: 'warden' }],
    [6, 'a6-2', 'echo', 'Echo: The Hollow Twins', -0.56, 0.22, ['a6-4'], { echo: 'twins' }],
    [6, 'a6-3', 'echo', 'Echo: The Umbral', 0.56, 0.22, ['a6-4'], { echo: 'umbral' }],
    [6, 'a6-4', 'challenge', 'Glass Echo', 0, 0.38, ['a6-5', 'a6-6'], { rule: 'glass', sub: 'Everything you learned, twice as sharp' }],
    [6, 'a6-5', 'echo', 'Echo: The Hunger', -0.56, 0.54, ['a6-7'], { echo: 'hunger' }],
    [6, 'a6-6', 'echo', 'Echo: The Pale Wing', 0.56, 0.54, ['a6-7'], { echo: 'wing' }],
    [6, 'a6-7', 'echo', 'Echo: The First Cut', 0, 0.7, ['a6-8'], { echo: 'firstCut', rule: 'nohit', sub: 'The cleanest cut of all. Do not get hit.' }],
    [6, 'a6-8', 'challenge', 'The Endless Night', 0, 0.86, [], { rule: 'horde', big: true, sub: 'The last and longest fight' }],
  ];
  P.NODES = L.map(([act, id, type, name, x, y, next, ex]) => Object.assign({ act, id, type, name, x, y, next }, ex || {}));
  P.node = (id) => P.NODES.find((n) => n.id === id);
  P.TYPES = {
    trial: { label: 'Trial', col: '#8ad0ff' }, battle: { label: 'Battle', col: '#f3eef0' }, elite: { label: 'Elite', col: '#ff8a40' },
    challenge: { label: 'Challenge', col: '#c9a0ff' }, shrine: { label: 'Shrine', col: '#ffd060' }, boss: { label: 'Guardian', col: '#ff2a44' }, echo: { label: 'Echo', col: '#ff6a9a' } };
  const prevOf = {}; for (const n of P.NODES) for (const m of n.next) (prevOf[m] = prevOf[m] || []).push(n.id);
  P.prev = (id) => prevOf[id] || [];

  // ---- node state ---------------------------------------------------------------------------------
  P.rec = (p, id) => p.nodes[id] || null;
  P.cleared = (p, id) => !!(p.nodes[id] && p.nodes[id].wins > 0);
  P.state = function (p, id) {
    if (P.cleared(p, id)) return 'cleared';
    const pv = P.prev(id); if (!pv.length) return 'open';
    return pv.some((q) => P.cleared(p, q)) ? 'open' : 'locked';
  };
  P.actOpen = (p, a) => P.NODES.some((n) => n.act === a && P.state(p, n.id) !== 'locked');
  P.starsOf = (p, id) => { const r = p.nodes[id]; return r && r.stars ? r.stars.filter(Boolean).length : 0; };
  P.totalStars = (p) => P.NODES.reduce((n, nd) => n + P.starsOf(p, nd.id), 0);
  P.maxStars = () => P.NODES.reduce((n, nd) => n + P.goals(nd).length, 0);

  // ---- difficulty, waves and stars for a node ------------------------------------------------------
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rngOf = (seed) => { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  P.depth = (n) => n.act + n.y * 0.9;            // 0 at the first trial, about 6 at the First Cut
  // Foe health and damage for a node: gentle while the kit is small, full strength at the top.
  P.TUNE = { hp0: 0.72, hpK: 0.27, dmg0: 0.62, dmgK: 0.31 };
  P.scaleOf = (n) => { const d = Math.min(7, P.depth(n)), T = P.TUNE; return { hp: T.hp0 + T.hpK * d, dmg: T.dmg0 + T.dmgK * d }; };
  const CHAMPS = [['ch_gatebreaker', 'ch_bonecaptain'], ['ch_mother', 'ch_saber'], ['ch_bishop', 'ch_widow'], ['ch_carrion', 'ch_ashmother'], ['ch_huntmaster', 'ch_gale'], ['ch_woundlord', 'ch_saint'], ['ch_saber', 'ch_widow', 'ch_carrion', 'ch_woundlord']];
  P.CHAMPS = CHAMPS;
  const BOSS = { warden: ['warden'], twins: ['twinA', 'twinB'], umbral: ['umbral'], hunger: ['hunger'], wing: ['wing'], firstCut: ['firstCut'] };
  const LAIR = { warden: 'lair_warden', twins: 'lair_twins', umbral: 'lair_umbral', hunger: 'lair_hunger', wing: 'lair_wing', firstCut: 'lair_firstCut' };
  function pick(pool, n, r, early) { const out = []; for (let i = 0; i < n; i++) out.push(pool[Math.floor(Math.pow(r(), early ? 1.6 : 1) * pool.length)]); return out; }
  // The fight a node holds: waves (pulses split by '+'), whether its last wave is a guardian, arenas, rules.
  // Each mission's ground is fixed (the map shows the very arena the fight opens in).
  P.arenaSeed = (n) => hashStr(n.id + '|arena') % 99991;
  P.build = function (n) {
    const A = P.ACTS[n.act], st = D().STAGES[A.stage], r = rngOf(hashStr(n.id)), d = P.depth(n), pool = A.pool, ar = st.arenas;
    const per = Math.min(5, 3 + Math.floor(d * 0.4)), early = d < 1.5, idx = P.NODES.indexOf(n);
    const area = (k) => { const w = []; for (let i = 0; i < k; i++) { if (i) w.push('+'); w.push(...pick(pool, per - (i ? 1 : 0), r, early)); } return w; };
    const rules = {}; if (n.rule) rules[n.rule] = n.rule === 'time' ? true : true;
    if (n.rule === 'time') rules.time = n.n;
    let waves, boss = false, champion = null, arenas = [ar[idx % ar.length], ar[(idx + 1) % ar.length]];
    switch (n.id === 'a5-b' ? 'god' : n.type) {
      // The guided trial: the tutorial places each foe itself, then lets this wave loose for the last step.
      case 'trial': waves = [['ghoul', 'husk', 'ghoul', '+', 'shield', 'raider', 'ghoul']]; arenas = ['court']; break;
      case 'battle': waves = [area(2), area(2)]; break;
      case 'elite': { // the act's champion leads the second area
        const ch = CHAMPS[n.act][P.NODES.filter((x) => x.act === n.act && x.type === 'elite').indexOf(n) % 2];
        rules.elites = true; waves = [area(2), [ch, '+'].concat(pick(pool, per - 1, r))]; boss = true; champion = ch; break; }
      // The guardian waits in its own hand-built lair (js/arenas.js).
      case 'boss': waves = [st.waves[st.waves.length - 1].slice(), st.bossWave.slice()]; boss = true; arenas = [ar[ar.length - 2] || ar[0], 'lair_' + st.boss]; break;
      // The last guardian is the god himself, on the summit (the Lamb-style fight in js/sim.js).
      case 'god': waves = [['godCut']]; boss = true; arenas = ['lair_firstCut']; break;
      case 'echo': waves = [area(2), BOSS[n.echo].concat(['+'], pick(pool, 3, r))]; boss = true; arenas = [ar[0], LAIR[n.echo] || ar[ar.length - 1]]; break;
      case 'challenge':
        if (n.echo) { waves = [BOSS[n.echo].slice()]; boss = true; arenas = [LAIR[n.echo] || D().STAGES[0].arenas[2]]; }
        else if (n.rule === 'horde') { const k = n.big ? 6 : 4; waves = [area(k)]; arenas = [ar[idx % ar.length]]; if (n.big) { const all = CHAMPS.flat(); waves[0].push('+', all[Math.floor(r() * all.length)], all[Math.floor(r() * all.length)]); } }
        else waves = [area(2), area(2)];
        break;
      default: waves = [];
    }
    // Looks: up to three of each army foe's looks for this fight (chosen by the node, so a replay looks the same).
    const variants = {}, seen = new Set(); const want = (k) => { if (seen.has(k) || !D().FOES[k]) return; seen.add(k); const L = D().VARIANTS && D().VARIANTS[k];
      if (L) { const pool2 = L.slice(), out = [], nv = Math.min(3, L.length); while (out.length < nv) out.push(pool2.splice(Math.floor(r() * pool2.length), 1)[0]); variants[k] = out; }
      for (const a of D().FOES[k].atks) if (a.summon) want(a.summon.key); };
    for (const w of waves) for (const k of w) if (k !== '+') want(k);
    const sc = P.scaleOf(n);
    if (n.type === 'echo') { sc.hp *= 1.15; sc.dmg *= 1.05; }
    if (n.echo && n.rule === 'nohit') { sc.hp *= n.act >= 6 ? 0.45 : 0.6; }
    const adj = { 'a1-b': [0.78, 0.8], 'a5-b': [0.9, 0.95], 'a6-2': [0.85, 0.9] }[n.id]; if (adj) { sc.hp *= adj[0]; sc.dmg *= adj[1]; }   // two guardians at once; the finale
    if (n.rule === 'glass') sc.dmg *= 0.75;
    if (n.big) { sc.hp *= 0.85; sc.dmg *= 0.85; } else if (n.rule === 'horde') { sc.hp *= 0.85; sc.dmg *= 0.85; }
    // The god calls his dead and the echoes of the guardians: load them with the fight.
    const preload = n.id === 'a5-b' ? ['woundknight', 'woundblade', 'husk', 'redwraith', 'ghoul', 'raider', 'warden', 'twinA', 'umbral', 'hunger', 'wing'] : undefined;
    return { stage: A.stage, champion, node: { waves, boss, arenas, scale: sc, rules, variants, script: n.type === 'trial', arenaSeed: P.arenaSeed(n), preload } };
  };
  // Every foe key a fight can put on the floor (its waves and what they summon), for loading their sets.
  P.foeKeys = function (b) { const out = new Set(); const add = (k) => { if (out.has(k) || !D().FOES[k]) return; out.add(k); for (const a of D().FOES[k].atks) if (a.summon) add(a.summon.key); };
    for (const w of b.node.waves) for (const k of w) if (k !== '+') add(k); for (const k of b.node.preload || []) add(k); return [...out]; };
  P.setsFor = function (b) { const out = new Set(); for (const k of P.foeKeys(b)) { out.add(D().FOES[k].set); for (const v of (b.node.variants && b.node.variants[k]) || []) out.add(v); } return [...out]; };
  P.foeCount = (b) => b.node.waves.reduce((n, w) => n + w.filter((k) => k !== '+').length, 0);
  // Three stars: win, then two goals that depend on the kind of node.
  P.goals = function (n) {
    if (n.type === 'shrine') return [];
    if (n.type === 'trial') return [{ id: 'win', text: 'Finish the trial' }];
    const b = P.build(n), par = Math.round(25 + P.foeCount(b) * 4.2 + (b.node.boss ? 40 : 0));
    const win = { id: 'win', text: n.type === 'boss' || n.type === 'echo' ? 'Defeat the guardian' : 'Win the fight' };
    if (n.rule === 'nohit') return [win, { id: 'hp50', text: 'Finish above half health' }, { id: 'time', n: par, text: 'Win within ' + par + ' seconds' }];
    if (n.type === 'boss' || n.type === 'echo') return [win, { id: 'hp50', text: 'Finish above half health' }, { id: 'nohit', text: 'Defeat the guardian without being hit' }];
    if (n.type === 'elite') return [win, { id: 'hp50', text: 'Finish above half health' }, { id: 'combo', n: 20, text: 'Land a 20-hit combo' }];
    return [win, { id: 'hp50', text: 'Finish above half health' }, { id: 'time', n: par, text: 'Win within ' + par + ' seconds' }];
  };
  // r: { win, time, hpFrac, hitsTaken, bossHits, maxCombo }
  P.judge = (n, r) => P.goals(n).map((g) => r.win && (g.id === 'win' || (g.id === 'hp50' && r.hpFrac > 0.5) || (g.id === 'time' && r.time <= g.n) || (g.id === 'combo' && r.maxCombo >= g.n) || (g.id === 'nohit' && r.bossHits === 0)));
  P.baseXp = function (n) {
    const d = P.depth(n), b = 30 + 12 * d;
    return Math.round({ trial: 60, battle: b, elite: b * 1.4, challenge: b * 1.5, boss: b * 2.4, echo: b * 2.0, shrine: 20 + 12 * n.act }[n.type] || b);
  };
  P.spOf = (n) => (n.type === 'shrine' || n.type === 'boss' ? 1 : 0);

  // ---- finishing a node ---------------------------------------------------------------------------
  // Records the result and pays out. Returns what happened, for the results screen.
  P.finish = function (p, id, r) {
    const n = P.node(id), rec = p.nodes[id] = p.nodes[id] || { wins: 0, stars: [], best: null };
    const first = r.win && !rec.wins, stars = P.judge(n, r), base = P.baseXp(n);
    let xp = 0, sp = 0; const newStars = stars.map((s, i) => s && !rec.stars[i]);
    const RM = r.reward || 1;
    if (r.win) {
      xp += first ? base : Math.round(base * 0.3);
      xp += newStars.filter(Boolean).length * Math.round(base * 0.25) - (first && newStars[0] ? Math.round(base * 0.25) : 0);
      if (first) sp += P.spOf(n);
      rec.wins++; rec.stars = stars.map((s, i) => s || !!rec.stars[i]); if (rec.best == null || r.time < rec.best) rec.best = Math.round(r.time * 10) / 10;
      p.stats.wins++; if (n.type === 'boss' || n.type === 'echo') p.stats.bosses++;
      if ((n.type === 'boss' || n.type === 'echo' || n.echo) && r.bossHits === 0) p.flags.untouchable = true;
      p.last = id;
    } else xp += Math.round(base * 0.15 * Math.min(1, r.progress || 0));     // a little for trying
    p.stats.kills += r.kills || 0;
    xp = Math.round(xp * RM);
    const lv0 = p.lvl; p.sp += sp; const ups = P.addXp(p, xp);
    const heroes = P.checkHeroes(p);
    p.stats.stars = P.totalStars(p);
    // Loot: gold, and items from the fight, its chests and its guardian. A full bag turns spare finds into gold.
    LT().migrate(p);
    const g = LT().mods(p, p.hero), drop = LT().drops(r.rand || Math.random, { type: n.type, depth: P.depth(n) + (r.ilvl || 0) / 0.65, first, win: r.win, progress: r.progress, stars: newStars.filter(Boolean).length, chests: r.win ? r.chests || [] : [], smashed: r.smashed || 0, goldMul: g.gold * RM });
    const got = [], sold = [];
    for (const it of drop.items) { if (p.bag.length < LT().BAG_MAX) got.push(LT().give(p, it)); else { const v = LT().sellPrice(it); drop.gold += v; sold.push(it); } }
    p.gold += drop.gold; if (r.win) LT().restock(p);
    return { xp, sp, ups, lv0, lvl: p.lvl, stars, newStars, first, heroes, goals: P.goals(n), loot: { gold: drop.gold, items: got, sold } };
  };
  P.claimShrine = function (p, id) {
    const n = P.node(id); if (P.cleared(p, id) || P.state(p, id) !== 'open') return null;
    p.nodes[id] = { wins: 1, stars: [], best: null }; p.last = id;
    const xp = P.baseXp(n), sp = P.spOf(n), lv0 = p.lvl; p.sp += sp; const ups = P.addXp(p, xp);
    return { xp, sp, ups, lv0, lvl: p.lvl, heroes: P.checkHeroes(p) };
  };
  // The next thing to do: the first open node, in map order.
  P.nextNode = (p) => (P.NODES.find((n) => P.state(p, n.id) === 'open') || P.node(p.last) || P.NODES[0]).id;
})(typeof window !== 'undefined' ? window : globalThis);
