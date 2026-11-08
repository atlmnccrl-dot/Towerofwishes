// VESPER — playing on after the story: difficulty, New Game+, the endless survival, the daily
// challenge, achievements and each hero's mastery. Pure data and functions; runs in Node for tests.
(function (root) {
  const VS = root.VS = root.VS || {};
  const M = VS.MODES = {};
  const P = () => VS.PROG, D = () => VS.DATA, L = () => VS.LOOT;
  function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (a, r) => a[Math.floor(r() * a.length)];

  // ---- difficulty and New Game+ ------------------------------------------------------------------
  M.DIFF = {
    story: { name: 'Story', desc: 'Foes hit softer and fall faster. For the tale.', hp: 0.65, dmg: 0.55, reward: 0.8 },
    normal: { name: 'Normal', desc: 'The climb as it was made.', hp: 1, dmg: 1, reward: 1 },
    hard: { name: 'Hard', desc: 'Tougher foes, harder blows. A quarter more gold and experience.', hp: 1.3, dmg: 1.3, reward: 1.25 },
    nightmare: { name: 'Nightmare', desc: 'Every wave led by an elite. Half again the rewards.', hp: 1.6, dmg: 1.55, reward: 1.5, elites: true },
  };
  M.DIFF_ORDER = ['story', 'normal', 'hard', 'nightmare'];
  // What the profile's difficulty and New Game+ level do to a fight's foes and its rewards.
  M.scale = (p) => { const d = M.DIFF[(p.opts && p.opts.diff) || 'normal'] || M.DIFF.normal, ng = p.ng || 0; return { hp: d.hp * (1 + 0.35 * ng), dmg: d.dmg * (1 + 0.3 * ng), reward: d.reward * (1 + 0.5 * ng), elites: !!d.elites, ilvl: ng * 10 }; };
  M.canNg = (p) => !!(p.seen && p.seen.ending);
  // New Game+: the climb starts again from the first battle with everything earned kept (level,
  // skills, heroes, gear, gold); foes are much stronger and drop better gear.
  M.newGamePlus = function (p) {
    if (!M.canNg(p)) return false;
    p.ng = (p.ng || 0) + 1; p.nodes = { 'a0-t': { wins: 1, stars: [true], best: null } }; p.last = 'a0-t'; p.seen.ending = false;
    for (const k in p.seen) if (k.startsWith('act')) delete p.seen[k];
    L().restock(p); return true;
  };

  // ---- the endless survival --------------------------------------------------------------------
  // Wave after wave on one large map, from every act you have reached; a champion every fifth wave,
  // a guardian every tenth; the foes grow stronger with each. It ends when you fall.
  const BOSSES = [['warden'], ['twinA', 'twinB'], ['umbral'], ['hunger'], ['wing'], ['firstCut']];
  M.reachedAct = (p) => Math.max(0, ...P().NODES.filter((n) => P().state(p, n.id) !== 'locked').map((n) => n.act).filter((a) => a <= 5));
  M.endless = function (p, seed) {
    const r = rngOf(seed || 1), top = M.reachedAct(p), lo = Math.max(0, top - 1), acts = P().ACTS.slice(lo, top + 1);   // the two highest acts reached (fewer sets to load)
    const pool = [...new Set(acts.flatMap((A) => A.pool))].filter((k) => D().FOES[k] && !D().FOES[k].passive);
    const champs = P().CHAMPS.slice(lo, top + 1).flat(), bosses = BOSSES.slice(lo, top + 1).flat();
    const act = lo + Math.floor(r() * (top - lo + 1)), stage = P().ACTS[act].stage, kind = pick(['court', 'ring', 'pit', 'cross'], r);
    const base = P().scaleOf ? P().scaleOf({ act: top, y: 1, id: 'endless' }) : { hp: 1, dmg: 1 };
    const next = (k) => {
      const rr = rngOf(seed * 31 + k * 7919), n = Math.min(12, 4 + Math.floor(k * 0.5)), w = [];
      if (k % 10 === 9 && bosses.length) w.push(...pick(BOSSES.slice(lo, top + 1), rr), '+');
      else if (k % 5 === 4 && champs.length) w.push(pick(champs, rr), '+');
      for (let i = 0; i < n; i++) { if (i && i % 4 === 0) w.push('+'); w.push(pick(pool, rr)); }
      return { wave: w, scale: { hp: base.hp * (1 + 0.09 * k), dmg: base.dmg * (1 + 0.06 * k) } };
    };
    const variants = {}; for (const k of pool.concat(champs)) { const V = D().VARIANTS && D().VARIANTS[k]; if (V) variants[k] = V.slice(0, 2); }
    return { stage, champion: null, endless: true, next, node: { waves: [next(0).wave], boss: false, arenas: [kind], scale: next(0).scale, rules: {}, variants, preload: pool.concat(champs, bosses) } };
  };
  // What a run pays: gold and experience per wave cleared, an item every five.
  M.finishEndless = function (p, cleared, rand) {
    const S = M.scale(p), e = p.endless = p.endless || { best: 0, runs: 0 }; e.runs++; const best = cleared > e.best; if (best) e.best = cleared;
    const gold = Math.round(cleared * (8 + cleared * 0.8) * S.reward), xp = Math.round(cleared * (14 + cleared) * S.reward), items = [];
    for (let i = 5; i <= cleared; i += 5) { const it = L().roll(rand, Math.min(40, 4 + M.reachedAct(p) * 5 + i * 0.6 + S.ilvl), { minRar: i >= 20 ? 2 : 1 }); if (p.bag.length < L().BAG_MAX) items.push(L().give(p, it)); }
    p.gold += gold; const lv0 = p.lvl, ups = P().addXp(p, xp);
    return { xp, sp: 0, ups, lv0, lvl: p.lvl, goals: [], stars: [], heroes: P().checkHeroes(p), loot: { gold, items, sold: [] }, best, cleared };
  };

  // ---- the daily challenge ------------------------------------------------------------------------
  // The same fight for everyone on a given day: an act, two twists, three areas and a champion.
  M.TWISTS = ['glass', 'elites', 'noheal', 'time', 'nomoon'];
  M.today = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  M.daily = function (date) {
    const r = rngOf(hashStr('vesper-daily-' + date)), act = Math.floor(r() * 6), A = P().ACTS[act], st = D().STAGES[A.stage];
    const tw = M.TWISTS.slice(); const twists = [tw.splice(Math.floor(r() * tw.length), 1)[0], tw.splice(Math.floor(r() * tw.length), 1)[0]];
    const rules = {}; for (const t of twists) rules[t] = true; if (rules.time) rules.time = 150;
    const area = (k) => { const w = []; for (let i = 0; i < k; i++) { if (i) w.push('+'); for (let j = 0; j < 4; j++) w.push(pick(A.pool, r)); } return w; };
    const champ = pick(P().CHAMPS[act], r), kinds = ['court', 'ring', 'pit', 'cross', 'bridge'];
    const waves = [area(2), area(2), [champ, '+'].concat(area(1))];
    const variants = {}; for (const w of waves) for (const k of w) { const V = k !== '+' && D().VARIANTS && D().VARIANTS[k]; if (V && !variants[k]) variants[k] = [pick(V, r), pick(V, r), pick(V, r)]; }
    const sc = P().scaleOf({ act, y: 2, id: 'daily' });
    return { date, act, twists, stage: A.stage, champion: champ, name: 'Daily · ' + st.name, node: { waves, boss: true, arenas: [pick(kinds, r), pick(kinds, r), pick(kinds, r)], scale: { hp: sc.hp * 1.1, dmg: sc.dmg * 1.05 }, rules, variants } };
  };
  M.TWIST_TEXT = { glass: 'Glass: you deal and take double damage', elites: 'Elites lead every wave', noheal: 'No healing from kills', time: 'Win within 150 seconds', nomoon: 'No moon art' };
  M.finishDaily = function (p, d, r, rand) {
    const rec = p.daily = p.daily && p.daily.date === d.date ? p.daily : { date: d.date, tries: 0, done: false, best: null };
    rec.tries++; const S = M.scale(p), first = r.win && !rec.done;
    let gold = 0, xp = 0; const items = [];
    if (r.win) { if (rec.best == null || r.time < rec.best) rec.best = Math.round(r.time * 10) / 10; }
    if (first) { rec.done = true; p.stats.dailies = (p.stats.dailies || 0) + 1; gold = Math.round((150 + 60 * d.act) * S.reward); xp = Math.round((90 + 40 * d.act) * S.reward); const it = L().roll(rand, Math.min(40, 6 + d.act * 6 + S.ilvl), { minRar: 2 }); if (p.bag.length < L().BAG_MAX) items.push(L().give(p, it)); }
    p.gold += gold; const lv0 = p.lvl, ups = P().addXp(p, xp);
    return { xp, sp: 0, ups, lv0, lvl: p.lvl, goals: [], stars: [], heroes: P().checkHeroes(p), loot: { gold, items, sold: [] }, first };
  };

  // ---- mastery ------------------------------------------------------------------------------------
  // Every win with a hero adds to their mastery: up to level 10, each level +2% damage for that hero.
  M.masteryLvl = (xp) => Math.min(10, Math.floor(Math.sqrt((xp || 0) / 120)));
  M.masteryNext = (lvl) => (lvl >= 10 ? null : 120 * (lvl + 1) * (lvl + 1));
  M.addMastery = (p, hero, xp) => { p.mastery = p.mastery || {}; const l0 = M.masteryLvl(p.mastery[hero]); p.mastery[hero] = (p.mastery[hero] || 0) + Math.round(xp); return M.masteryLvl(p.mastery[hero]) - l0; };
  M.masteryDmg = (p, hero) => 1 + 0.02 * M.masteryLvl((p.mastery || {})[hero]);

  // ---- achievements -------------------------------------------------------------------------------
  const st = (p, k) => (p.stats && p.stats[k]) || 0, cl = (p, id) => P().cleared(p, id);
  M.ACH = [
    { id: 'first', name: 'First Blood', desc: 'Win your first fight.', test: (p) => st(p, 'wins') >= 1 },
    { id: 'gate', name: 'Through the Gate', desc: 'Defeat the Gatewarden.', test: (p) => cl(p, 'a0-b') },
    { id: 'twins', name: 'Both Halves', desc: 'Defeat the Hollow Twins.', test: (p) => cl(p, 'a1-b') },
    { id: 'umbral', name: 'Light in the Dark', desc: 'Defeat the Umbral.', test: (p) => cl(p, 'a2-b') },
    { id: 'hunger', name: 'Fed Up', desc: 'Defeat the Hunger.', test: (p) => cl(p, 'a3-b') },
    { id: 'wing', name: 'Grounded', desc: 'Defeat the Wing.', test: (p) => cl(p, 'a4-b') },
    { id: 'dawn', name: 'Before Dawn', desc: 'Defeat the First Cut and see the ending.', test: (p) => cl(p, 'a5-b') || (p.ng || 0) > 0 },
    { id: 'kills100', name: 'Hundred Cuts', desc: 'Defeat 100 foes.', test: (p) => st(p, 'kills') >= 100 },
    { id: 'kills1000', name: 'Thousand Cuts', desc: 'Defeat 1,000 foes.', test: (p) => st(p, 'kills') >= 1000 },
    { id: 'combo50', name: 'Unbroken', desc: 'Land a 50-hit combo.', test: (p) => st(p, 'maxCombo') >= 50 },
    { id: 'perfect25', name: 'Ghost', desc: 'Make 25 perfect dodges.', test: (p) => st(p, 'perfects') >= 25 },
    { id: 'parry50', name: 'Turned Aside', desc: 'Parry 50 blows.', test: (p) => st(p, 'parries') >= 50 },
    { id: 'untouch', name: 'Untouchable', desc: 'Defeat a guardian without being hit.', test: (p) => !!(p.flags && p.flags.untouchable) },
    { id: 'stars100', name: 'Constellation', desc: 'Earn 100 stars.', test: (p) => P().totalStars(p) >= 100 },
    { id: 'heroes', name: 'Full Company', desc: 'Unlock every hero.', test: (p) => p.heroes.length >= D().HERO_ORDER.length },
    { id: 'legend', name: 'Legendary', desc: 'Find a legendary item.', test: (p) => ((p.loot && p.loot.legends) || 0) >= 1 },
    { id: 'forge', name: 'Master Smith', desc: 'Upgrade an item to +5.', test: (p) => (p.bag || []).some((it) => (it.plus || 0) >= 5) },
    { id: 'rich', name: 'Deep Pockets', desc: 'Hold 2,000 gold.', test: (p) => (p.gold || 0) >= 2000 },
    { id: 'chests', name: 'Treasure Hunter', desc: 'Open 20 chests.', test: (p) => st(p, 'chests') >= 20 },
    { id: 'endless10', name: 'Holding the Line', desc: 'Reach wave 10 in the endless survival.', test: (p) => ((p.endless && p.endless.best) || 0) >= 10 },
    { id: 'endless25', name: 'The Long Night', desc: 'Reach wave 25 in the endless survival.', test: (p) => ((p.endless && p.endless.best) || 0) >= 25 },
    { id: 'daily', name: 'Every Night', desc: 'Win a daily challenge.', test: (p) => st(p, 'dailies') >= 1 },
    { id: 'daily7', name: 'A Week of Nights', desc: 'Win seven daily challenges.', test: (p) => st(p, 'dailies') >= 7 },
    { id: 'ng', name: 'Again', desc: 'Begin a New Game+.', test: (p) => (p.ng || 0) >= 1 },
    { id: 'hard', name: 'Hardened', desc: 'Defeat a guardian on Hard or Nightmare.', test: (p) => !!(p.flags && p.flags.hardBoss) },
    { id: 'master', name: 'Mastery', desc: 'Bring a hero to mastery 10.', test: (p) => Object.values(p.mastery || {}).some((x) => M.masteryLvl(x) >= 10) },
  ];
  // Record a fight's numbers on the profile (all modes).
  M.track = function (p, s, win) {
    const t = p.stats; t.perfects = (t.perfects || 0) + (s.stats.perfects || 0); t.parries = (t.parries || 0) + (s.stats.parries || 0); t.maxCombo = Math.max(t.maxCombo || 0, s.stats.maxCombo || 0);
    t.chests = (t.chests || 0) + ((s.chests || []).length && win ? s.chests.length : 0); t.smashed = (t.smashed || 0) + (s.smashed || 0);
    const d = (p.opts && p.opts.diff) || 'normal'; if (win && s.hasBoss && (d === 'hard' || d === 'nightmare')) p.flags.hardBoss = true;
  };
  // Newly earned achievements (and remember them).
  M.checkAch = function (p) { p.ach = p.ach || {}; const got = []; for (const a of M.ACH) if (!p.ach[a.id] && a.test(p)) { p.ach[a.id] = Date.now(); got.push(a); } return got; };
})(typeof window !== 'undefined' ? window : globalThis);
