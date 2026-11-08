// Bannerborn — rules: heroes, progression, economy, gear, stages, the save. Pure: no DOM, runs in Node.
(function (root) {
  const BB = root.BB = root.BB || (typeof require !== 'undefined' ? require('./data.js') : {});

  // ---------------------------------------------------------------- basics
  BB.rng = function (seed) {
    let a = seed >>> 0 || 1;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (n) => Math.floor(f() * n);
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.range = (a0, b0) => a0 + f() * (b0 - a0);
    return f;
  };
  let uid = Date.now() % 100000;
  BB.uid = (p) => (p || 'x') + (uid++).toString(36) + Math.floor(Math.random() * 1296).toString(36);
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  BB.hashStr = hashStr;
  BB.randomName = function (r) {
    r = r || BB.rng(Math.random() * 1e9);
    return r.pick(BB.NAMES.first) + ' ' + r.pick(BB.NAMES.epithet);
  };

  // ---------------------------------------------------------------- heroes
  BB.MAX_STARS = 5;
  BB.levelCap = (h) => 10 + (h.stars || 1) * 10;
  BB.levelCost = (h) => Math.round(6 * Math.pow(h.level, 1.45) + 10);
  BB.ascendCost = (h) => (h.stars || 1) * 4;

  // hero: { id, name, calling, level, stars, rarity (0-3), gear, recruit | legend | captain, look (captain only) }
  BB.newHero = function (o) {
    o = o || {};
    const h = {
      id: BB.uid('h'), name: o.name || BB.randomName(BB.rng(o.seed || Math.random() * 1e9)), calling: o.calling || 'vanguard',
      level: o.level || 1, stars: o.stars || 1, rarity: o.rarity || 0,
      gear: { weapon: null, chest: null, head: null, charm: null },
      recruit: o.recruit || null, legend: o.legend || null, captain: !!o.captain, look: o.look || null, elem: o.elem || null, arch: o.arch || null,
    };
    if (h.legend) { const L = BB.LEGENDS[h.legend]; h.name = L.name; h.calling = L.calling; h.rarity = 3; }
    return h;
  };
  BB.newCaptain = function () {
    return BB.newHero({ calling: 'vanguard', captain: true, name: 'The Captain', rarity: 2,
      look: { skin: 'tan', head: 'hair', hair: 'copper', headTint: 'natural', chestTint: 'natural', legsTint: 'natural', shieldTint: 'crimson', chest: 'chestA', legs: 'legsA' } });
  };
  BB.heroColor = (h) => h.legend ? BB.LEGENDS[h.legend].color : BB.CALLINGS[h.calling].color;
  BB.heroTitle = (h) => h.legend ? BB.LEGENDS[h.legend].title : h.captain ? 'Banner-Captain' : BB.CALLINGS[h.calling].name;
  BB.shortName = (h) => { const p = h.name.split(' '); return p[0] === 'The' && p[1] ? p[1] : p[0]; };
  BB.heroElem = (h) => h.elem || (h.legend === 'sera' ? 'shadow' : (h.calling === 'arcanist' ? 'fire' : h.calling === 'warpriest' ? 'holy' : null));

  // ---------------------------------------------------------------- gear
  BB.makeItem = function (r, slot, level, rarity, wtype) {
    let base, look = null;
    if (slot === 'weapon') { wtype = wtype || r.pick(['sword', 'axe', 'bow', 'focus', 'fist', 'spear']); base = BB.GEAR.weapon[wtype]; }
    else { base = r.pick(BB.GEAR[slot]); look = base.look; }
    const mult = BB.RARITY[rarity].mult * (1 + (level - 1) * 0.14);
    const stats = {};
    for (const k in base.stat) {
      const v = base.stat[k] * mult * r.range(0.9, 1.1);
      stats[k] = (k === 'crit' || k === 'spd') ? Math.round(v * 1000) / 1000 : Math.round(v * 10) / 10;
    }
    if (rarity >= 2) {
      const extra = r.pick(['atk', 'hp', 'crit', 'def']);
      const add = { atk: 2 * mult, hp: 14 * mult, crit: 0.02 * rarity, def: 1.2 * mult }[extra];
      stats[extra] = Math.round(((stats[extra] || 0) + add) * (extra === 'crit' ? 1000 : 10)) / (extra === 'crit' ? 1000 : 10);
    }
    // good weapons carry an enchant: an element in every blow, and a visible aura on the hero
    let ench = null;
    if (slot === 'weapon' && (rarity >= 2 || (rarity === 1 && r() < 0.3))) ench = r.pick(BB.ENCHANTS);
    if (ench) stats[BB.ENCH[ench].stat] = Math.round(((stats[BB.ENCH[ench].stat] || 0) + BB.ENCH[ench].amt * BB.RARITY[rarity].mult) * 1000) / 1000;
    const nameIdx = Math.min(base.names.length - 1, Math.max(0, rarity - (r() < 0.5 ? 1 : 0)));
    const tint = rarity === 0 ? 'natural' : r.pick(BB.TINTS.slice(1)).id;
    return { id: BB.uid('i'), slot, wtype: slot === 'weapon' ? wtype : undefined, look, tint, rarity, level, plus: 0, ench,
      name: (ench ? BB.ENCH[ench].prefix + ' ' : rarity === 3 ? 'Legendary ' : '') + base.names[nameIdx], stats };
  };
  BB.MAX_PLUS = 10;
  BB.ENCHANTS = ['fire', 'frost', 'storm', 'shadow', 'holy'];
  BB.ENCH = {
    fire: { prefix: 'Blazing', stat: 'atk', amt: 1.5, desc: 'Blows set foes alight' },
    frost: { prefix: 'Frostbitten', stat: 'def', amt: 1.2, desc: 'Blows slow foes' },
    storm: { prefix: 'Stormcalled', stat: 'crit', amt: 0.02, desc: 'Blows arc to a second foe' },
    shadow: { prefix: 'Shadowed', stat: 'atk', amt: 1.2, desc: 'Blows rend for 20% more' },
    holy: { prefix: 'Hallowed', stat: 'hp', amt: 10, desc: 'Blows heal the weakest ally' },
  };
  BB.AWAKEN_AT = 5; // forging a plain weapon to +5 awakens an enchant
  BB.heroEnch = (h) => (h.gear && h.gear.weapon && h.gear.weapon.ench) || null;
  BB.itemStats = function (it) {
    const k = 1 + (it.plus || 0) * 0.12, out = {};
    for (const s in it.stats) out[s] = (s === 'crit' || s === 'spd') ? Math.round(it.stats[s] * k * 1000) / 1000 : Math.round(it.stats[s] * k * 10) / 10;
    return out;
  };
  BB.itemScore = function (it) {
    if (!it) return 0;
    const s = BB.itemStats(it);
    return Math.round((s.hp || 0) * 0.5 + (s.atk || 0) * 5 + (s.def || 0) * 4 + (s.crit || 0) * 300 + (s.spd || 0) * 60);
  };
  BB.upgradeCost = (it) => Math.round((40 + it.level * 8) * ((it.plus || 0) + 1) * (1 + it.rarity * 0.5));
  BB.salvageValue = (it) => Math.round((10 + it.level * 4) * (1 + it.rarity) * (1 + (it.plus || 0) * 0.4));
  BB.canEquip = function (hero, item) {
    if (!item) return true;
    if (item.slot === 'weapon') return item.wtype === BB.weaponType(hero.calling);
    return true;
  };
  BB.rollLoot = function (r, level, heroes, count) {
    const items = [];
    for (let i = 0; i < count; i++) {
      const h = r.pick(heroes);
      const slot = r.pick(BB.SLOTS);
      const x = r(); const rar = x < 0.04 ? 3 : x < 0.16 ? 2 : x < 0.46 ? 1 : 0;
      items.push(BB.makeItem(r, slot, level, rar, slot === 'weapon' ? BB.weaponType(h.calling) : undefined));
    }
    return items;
  };
  BB.equipBest = function (save, h) {
    for (const slot of BB.SLOTS) {
      let best = h.gear[slot], bs = BB.itemScore(best);
      for (const it of save.inventory) if (it.slot === slot && BB.canEquip(h, it) && BB.itemScore(it) > bs) { best = it; bs = BB.itemScore(it); }
      if (best !== h.gear[slot]) { save.inventory.splice(save.inventory.indexOf(best), 1); if (h.gear[slot]) save.inventory.push(h.gear[slot]); h.gear[slot] = best; }
    }
  };

  // ---------------------------------------------------------------- stats and power
  BB.bondsFor = (callings) => BB.BONDS.filter((b) => b.test(callings));
  BB.heroStats = function (hero, teamCallings) {
    const C = BB.CALLINGS[hero.calling];
    const L = hero.level - 1;
    const k = BB.HERO_RARITY[hero.rarity || 0].mult * (1 + ((hero.stars || 1) - 1) * 0.12);
    const s = {
      hp: (C.base.hp + C.grow.hp * L) * k, atk: (C.base.atk + C.grow.atk * L) * k, def: (C.base.def + C.grow.def * L) * k,
      spd: C.base.spd, crit: C.base.crit, aspd: C.base.aspd, range: C.range,
      hpPct: 0, atkPct: 0, spdPct: 0, aspdPct: 0, cdPct: 0, leech: 0, thorns: 0, skillDur: 0, skillDmg: 0, skillArea: 0,
      killCd: 0, lowHpAtk: 0, pierce: 0, burn: 0, shieldHeal: 0, casterAtk: 0, rangedCrit: 0, revive: 0, heal: 0, meleeAtk: 0, energyGain: 0, startEnergy: 0,
    };
    for (const slot of BB.SLOTS) {
      const it = hero.gear && hero.gear[slot]; if (!it) continue;
      const st = BB.itemStats(it); for (const q in st) s[q] = (s[q] || 0) + st[q];
    }
    for (const id in hero.talents || {}) { const n = BB.TREE_BY_ID[id], r = hero.talents[id]; if (n && r) for (const q in n.mod) s[q] = (s[q] || 0) + n.mod[q] * r; }
    if (teamCallings) for (const b of BB.bondsFor(teamCallings)) for (const q in b.mod) s[q] = (s[q] || 0) + b.mod[q];
    if (C.ranged && hero.calling !== 'warpriest') s.crit += s.rangedCrit;
    if (hero.calling === 'arcanist' || hero.calling === 'warpriest') s.atkPct += s.casterAtk;
    if (!C.ranged) s.atkPct += s.meleeAtk;
    s.hp = Math.round(s.hp * (1 + s.hpPct));
    s.atk = s.atk * (1 + s.atkPct);
    s.spd = s.spd * (1 + s.spdPct);
    s.aspd = s.aspd * (1 + s.aspdPct);
    s.cd = C.skill.cd;
    s.crit = Math.min(0.6, s.crit);
    return s;
  };
  BB.power = function (hero) {
    const s = BB.heroStats(hero, null);
    return Math.round(s.hp * 0.5 + s.atk * 9 * (1 + s.aspdPct * 0.6 + s.skillDmg * 0.25) + s.def * 6 + s.crit * 300 + s.leech * 900 + (s.revive ? 120 : 0));
  };
  BB.teamPower = (heroes) => heroes.reduce((a, h) => a + BB.power(h), 0);
  // what a stage expects: five common heroes at the stage's level
  // early stages expect a smaller team (you start alone)
  BB.recPower = function (stage) {
    const idx = BB.stageIdx(stage.id), n = Math.min(5, 1 + Math.floor(Math.max(0, idx) / 1.5));
    const cs = ['vanguard', 'ranger', 'warpriest', 'berserker', 'arcanist'].slice(0, n);
    let p = 0; for (const c of cs) p += BB.power(BB.newHero({ calling: c, level: Math.max(1, stage.level - 1), rarity: 0, name: 'x' }));
    return Math.round(p * 0.9);
  };

  // ---------------------------------------------------------------- formation (front row 2, back row 3)
  BB.FRONT = 2; BB.BACK = 3;
  BB.teamIds = (save) => save.formation.front.concat(save.formation.back).filter(Boolean);
  BB.teamHeroes = (save) => BB.teamIds(save).map((id) => save.heroes.find((h) => h.id === id)).filter(Boolean);
  BB.formationList = function (save) {
    const out = [];
    save.formation.front.forEach((id, i) => { const h = id && save.heroes.find((x) => x.id === id); if (h) out.push({ hero: h, row: 'front', slot: i }); });
    save.formation.back.forEach((id, i) => { const h = id && save.heroes.find((x) => x.id === id); if (h) out.push({ hero: h, row: 'back', slot: i }); });
    return out;
  };
  BB.placeHero = function (save, id, row, slot) { // a free slot (melee prefer the front), or the slot asked for
    const h = save.heroes.find((x) => x.id === id); if (!h) return false;
    if (row !== undefined) { BB.removeHero(save, id); const old = save.formation[row][slot]; save.formation[row][slot] = id; return old || true; }
    if (BB.teamIds(save).includes(id)) return false;
    const rows = BB.CALLINGS[h.calling].ranged ? ['back', 'front'] : ['front', 'back'];
    for (const r of rows) { const i = save.formation[r].indexOf(null); if (i >= 0) { save.formation[r][i] = id; return true; } }
    return false;
  };
  BB.removeHero = function (save, id) {
    for (const r of ['front', 'back']) { const i = save.formation[r].indexOf(id); if (i >= 0) save.formation[r][i] = null; }
  };

  // ---------------------------------------------------------------- hero tiers and recruiting
  BB.TIERS = [
    { id: 1, name: 'Common', rarity: 0, chapter: 0, cost: 150, arch: ['knight', 'barbarian', 'ranger', 'spearman'], count: 10 },
    { id: 2, name: 'Rare', rarity: 1, chapter: 1, cost: 300, arch: ['monk', 'paladin', 'knight', 'mage', 'spearman', 'barbarian'], count: 10 },
    { id: 3, name: 'Epic', rarity: 2, chapter: 2, cost: 600, arch: ['rogue', 'duelist', 'mage', 'beastfolk', 'monk', 'ranger'], count: 10 },
    { id: 4, name: 'Legendary', rarity: 3, chapter: 3, cost: 1000, arch: null, count: 10 },
  ];
  BB.heroTiers = function (roster) {
    const heroes = (roster || []).filter((c) => c.role === 'hero').slice().sort((a, b) => hashStr(a.key) - hashStr(b.key));
    const used = new Set(), out = [], names = new Set();
    const uniqueName = (key) => { const r = BB.rng(hashStr(key)); let n = BB.randomName(r), g = 0; while (names.has(n.split(' ')[0]) && g++ < 40) n = BB.randomName(r); names.add(n.split(' ')[0]); return n; };
    for (const T of BB.TIERS) {
      const list = []; names.clear();
      const archs = T.arch || [...new Set(heroes.map((c) => c.arch))];
      let guard = 0;
      while (list.length < T.count && guard++ < 400) {
        let added = false;
        for (const a of archs) {
          if (list.length >= T.count) break;
          const c = heroes.find((x) => x.arch === a && !used.has(x.key));
          if (c) { used.add(c.key); list.push(Object.assign({ tier: T.id, rarity: T.rarity, name: uniqueName(c.key) }, c)); added = true; }
        }
        if (!added) break;
      }
      out.push({ tier: T, heroes: list });
    }
    return out;
  };
  BB.chapterCleared = (save, ch) => BB.MISSIONS.filter((m) => m.chapter === ch).every((m) => save.cleared[m.id]);
  BB.tierOpen = (save, T) => T.chapter === 0 || BB.chapterCleared(save, T.chapter);
  BB.startLevel = (save) => { // new heroes join near the team's level so they can fight right away
    const top = save.heroes.map((h) => h.level).sort((a, b) => b - a).slice(0, 5);
    return Math.max(1, Math.round(top.reduce((a, l) => a + l, 0) / Math.max(1, top.length)) - 1);
  };
  BB.heroFromEntry = (save, e) => BB.newHero({ calling: e.calling, recruit: e.key, rarity: e.rarity, stars: 1, level: BB.startLevel(save), name: e.name, elem: e.elem, arch: e.arch });
  // recruit a random hero you don't own from an open tier
  BB.summon = function (save, roster, tierId, r) {
    const t = BB.heroTiers(roster).find((x) => x.tier.id === tierId); if (!t) return null;
    if (!BB.tierOpen(save, t.tier) || save.crystals < t.tier.cost) return null;
    const owned = new Set(save.heroes.map((h) => h.recruit).filter(Boolean));
    const pool = t.heroes.filter((e) => !owned.has(e.key)); if (!pool.length) return null;
    const e = pool[(r || BB.rng(Date.now() & 0xffffff)).int(pool.length)];
    save.crystals -= t.tier.cost;
    const h = BB.heroFromEntry(save, e);
    h.level = Math.min(h.level, BB.levelCap(h));
    save.heroes.push(h); BB.placeHero(save, h.id);
    return h;
  };
  BB.joinLegend = function (save, id) {
    if (save.heroes.some((h) => h.legend === id)) return null;
    const h = BB.newHero({ legend: id, level: BB.startLevel(save) + 1 }); h.level = Math.min(h.level, BB.levelCap(h));
    save.heroes.push(h); BB.placeHero(save, h.id); return h;
  };

  // ---------------------------------------------------------------- skill tree: three branches of linked nodes, a point per level
  BB.TREE_BRANCHES = [
    { id: 'might', name: 'Might', col: '#ff7a59', icon: 'sword' },
    { id: 'guard', name: 'Bulwark', col: '#5aa8ff', icon: 'shield' },
    { id: 'art', name: 'Ultimate', col: '#b57cff', icon: 'star' },
  ];
  // x: column 0..2 (bridges sit between), y: tier 0..3
  BB.TREE = [
    { id: 'm1', b: 0, x: 0, y: 0, name: 'Keen Edge', icon: 'sword', max: 3, mod: { atkPct: 0.06 } },
    { id: 'm2', b: 0, x: 0, y: 1, req: ['m1'], name: 'Precision', icon: 'eye', max: 2, mod: { crit: 0.04 } },
    { id: 'm3', b: 0, x: 0, y: 2, req: ['m2'], name: 'Ferocity', icon: 'bolt', max: 2, mod: { aspdPct: 0.08 } },
    { id: 'm4', b: 0, x: 0, y: 3, req: ['m3'], name: 'Executioner', icon: 'skull', max: 1, cap: true, mod: { lowHpAtk: 0.3, atkPct: 0.05 } },
    { id: 'g1', b: 1, x: 1, y: 0, name: 'Toughness', icon: 'heart', max: 3, mod: { hpPct: 0.08 } },
    { id: 'g2', b: 1, x: 1, y: 1, req: ['g1'], name: 'Iron Skin', icon: 'shield', max: 2, mod: { def: 2.5 } },
    { id: 'g3', b: 1, x: 1, y: 2, req: ['g2'], name: 'Bloodthirst', icon: 'drop', max: 2, mod: { leech: 0.04 } },
    { id: 'g4', b: 1, x: 1, y: 3, req: ['g3'], name: 'Undying', icon: 'ankh', max: 1, cap: true, mod: { revive: 1, thorns: 0.15 } },
    { id: 'u1', b: 2, x: 2, y: 0, name: 'Focus', icon: 'star', max: 3, mod: { skillDmg: 0.1 } },
    { id: 'u2', b: 2, x: 2, y: 1, req: ['u1'], name: 'Surge', icon: 'spark', max: 2, mod: { energyGain: 0.15 } },
    { id: 'u3', b: 2, x: 2, y: 2, req: ['u2'], name: 'Opening Gambit', icon: 'flag', max: 2, mod: { startEnergy: 20 } },
    { id: 'u4', b: 2, x: 2, y: 3, req: ['u3'], name: 'Mastery', icon: 'crown', max: 1, cap: true, mod: { skillDmg: 0.35, skillArea: 0.25, skillDur: 0.3 } },
    { id: 'x1', b: -1, x: 0.5, y: 1.5, req: ['m2', 'g2'], any: true, name: 'Battle-Hardened', icon: 'weave', max: 1, mod: { atkPct: 0.05, hpPct: 0.05 } },
    { id: 'x2', b: -1, x: 1.5, y: 1.5, req: ['g2', 'u2'], any: true, name: 'Rallying Spirit', icon: 'weave', max: 1, mod: { energyGain: 0.1, heal: 0.15 } },
  ];
  BB.TREE_BY_ID = {}; BB.TREE.forEach((n) => (BB.TREE_BY_ID[n.id] = n));
  const MODTXT = { atkPct: ['% attack', 100], crit: ['% crit chance', 100], aspdPct: ['% attack speed', 100], hpPct: ['% health', 100], def: [' defence', 1],
    leech: ['% life steal', 100], skillDmg: ['% ultimate damage', 100], energyGain: ['% ultimate charge rate', 100], startEnergy: [' starting charge', 1],
    lowHpAtk: ['% attack below half health', 100], thorns: ['% damage reflected', 100], skillArea: ['% ultimate area', 100], skillDur: ['% ultimate duration', 100], heal: ['% healing', 100] };
  BB.talentName = (n, hero) => n.id === 'u4' && hero ? BB.CALLINGS[hero.calling].skill.name + ' Mastery' : n.name;
  BB.talentDesc = function (n, rank) {
    const r = Math.max(1, rank);
    const parts = [];
    for (const q in n.mod) {
      if (q === 'revive') { parts.push('the first fallen hero rises once a battle'); continue; }
      const m = MODTXT[q]; if (!m) continue;
      parts.push('+' + Math.round(n.mod[q] * r * m[1] * 10) / 10 + m[0]);
    }
    return parts.join(', ');
  };
  BB.talentPoints = (h) => Math.max(0, h.level - 1);
  BB.talentSpent = (h) => Object.values(h.talents || {}).reduce((a, r) => a + r, 0);
  BB.talentFree = (h) => BB.talentPoints(h) - BB.talentSpent(h);
  BB.talentRank = (h, id) => (h.talents && h.talents[id]) || 0;
  BB.talentOpen = (h, n) => !n.req || (n.any ? n.req.some((q) => BB.talentRank(h, q) > 0) : n.req.every((q) => BB.talentRank(h, q) > 0));
  BB.canLearn = (h, id) => { const n = BB.TREE_BY_ID[id]; return !!n && BB.talentFree(h) > 0 && BB.talentRank(h, id) < n.max && BB.talentOpen(h, n); };
  BB.learn = function (h, id) { if (!BB.canLearn(h, id)) return false; h.talents = h.talents || {}; h.talents[id] = BB.talentRank(h, id) + 1; return true; };
  BB.resetTalents = function (h) { h.talents = {}; };

  // ---------------------------------------------------------------- level up, ascend, forge
  BB.levelUp = function (save, h) {
    if (h.level >= BB.levelCap(h)) return false;
    const c = BB.levelCost(h); if (save.gold < c) return false;
    save.gold -= c; h.level++; return true;
  };
  BB.ascend = function (save, h) {
    if (h.stars >= BB.MAX_STARS) return false;
    const c = BB.ascendCost(h); if (save.sigils < c) return false;
    save.sigils -= c; h.stars++; return true;
  };
  BB.upgradeItem = function (save, it) {
    if ((it.plus || 0) >= BB.MAX_PLUS) return false;
    const c = BB.upgradeCost(it); if (save.gold < c) return false;
    save.gold -= c; it.plus = (it.plus || 0) + 1;
    if (it.slot === 'weapon' && !it.ench && it.plus >= BB.AWAKEN_AT) { // the forge awakens it
      it.ench = BB.ENCHANTS[BB.hashStr(it.id) % BB.ENCHANTS.length];
      const E = BB.ENCH[it.ench]; it.stats[E.stat] = Math.round(((it.stats[E.stat] || 0) + E.amt * BB.RARITY[it.rarity].mult) * 1000) / 1000;
      it.name = E.prefix + ' ' + it.name.replace(/^Legendary /, '');
      return 'awakened';
    }
    return true;
  };

  // ---------------------------------------------------------------- stages
  BB.stageIdx = (id) => BB.MISSIONS.findIndex((m) => m.id === id);
  BB.stageUnlocked = (save, idx) => idx === 0 || !!save.cleared[BB.MISSIONS[idx - 1].id];
  BB.nextStageIdx = (save) => { const i = BB.MISSIONS.findIndex((m) => !save.cleared[m.id]); return i < 0 ? BB.MISSIONS.length - 1 : i; };
  BB.campaignDone = (save) => BB.MISSIONS.every((m) => save.cleared[m.id]);
  BB.stageRewards = function (stage, first) {
    const boss = stage.type === 'boss' || stage.type === 'duel';
    const gold = Math.round((100 + stage.level * 55) * (boss ? 1.8 : 1) * (first ? 1 : 0.4));
    return { gold, crystals: first ? (boss ? 250 : 90) : 0, sigils: boss ? (first ? 8 : 2) : (first ? 1 : 0), items: boss ? 2 : 1 };
  };
  // fewer foes for a small team: a lone captain can win the first stage
  BB.waveScale = (n) => Math.min(1, Math.max(0.35, (n + 1) / 6));
  // how crowded a stage is: the hordes grow chapter by chapter
  BB.crowd = (stage) => [1, stage.code && +stage.code.split('-')[1] >= 5 ? 1.15 : 1, 1.35, 1.5, 1.6][stage.chapter] || 1;

  // ---------------------------------------------------------------- idle spoils: the camp gathers while you are away
  BB.IDLE_CAP = 12 * 3600 * 1000;
  BB.idleRate = function (save) { // per hour
    const best = BB.MISSIONS.filter((m) => save.cleared[m.id]).length;
    return { gold: Math.round(150 + best * 55), sigils: best >= 8 ? 0.5 : 0 };
  };
  BB.idlePending = function (save, now) {
    const ms = Math.min(BB.IDLE_CAP, Math.max(0, now - (save.idleT == null ? now : save.idleT)));
    const h = ms / 3600000, r = BB.idleRate(save);
    return { ms, gold: Math.floor(r.gold * h), sigils: Math.floor(r.sigils * h) };
  };
  BB.idleClaim = function (save, now) {
    const p = BB.idlePending(save, now);
    save.gold += p.gold; save.sigils += p.sigils; save.idleT = now;
    return p;
  };

  // ---------------------------------------------------------------- shop: a few offers a day
  BB.dayKey = (now) => new Date(now).toISOString().slice(0, 10);
  BB.SHOP = [
    { id: 'free', name: 'Daily Crystals', desc: 'A gift from the quartermaster.', give: { crystals: 60 }, cost: null, limit: 1 },
    { id: 'chest', name: 'Armory Chest', desc: 'One piece of gear, Rare or better.', give: { chest: 1 }, cost: { gold: 350 }, limit: 3 },
    { id: 'sigils', name: 'Sigil Bundle', desc: 'Five sigils for ascension.', give: { sigils: 5 }, cost: { gold: 500 }, limit: 2 },
    { id: 'crystals', name: 'Crystal Purse', desc: '120 crystals for recruiting.', give: { crystals: 120 }, cost: { gold: 800 }, limit: 1 },
  ];
  BB.shopLeft = function (save, offer, now) {
    if (!save.shop || save.shop.day !== BB.dayKey(now)) return offer.limit;
    return offer.limit - (save.shop.bought[offer.id] || 0);
  };
  BB.buy = function (save, offerId, now, r) {
    const o = BB.SHOP.find((x) => x.id === offerId); if (!o || BB.shopLeft(save, o, now) <= 0) return null;
    if (o.cost && save.gold < o.cost.gold) return null;
    if (!save.shop || save.shop.day !== BB.dayKey(now)) save.shop = { day: BB.dayKey(now), bought: {} };
    if (o.cost) save.gold -= o.cost.gold;
    save.shop.bought[o.id] = (save.shop.bought[o.id] || 0) + 1;
    const got = {};
    if (o.give.crystals) { save.crystals += o.give.crystals; got.crystals = o.give.crystals; }
    if (o.give.sigils) { save.sigils += o.give.sigils; got.sigils = o.give.sigils; }
    if (o.give.chest) {
      r = r || BB.rng(now & 0xffffff);
      const h = r.pick(save.heroes), slot = r.pick(BB.SLOTS);
      const it = BB.makeItem(r, slot, Math.max(1, BB.startLevel(save)), r() < 0.2 ? 2 : 1, slot === 'weapon' ? BB.weaponType(h.calling) : undefined);
      save.inventory.push(it); got.item = it;
    }
    return got;
  };

  // ---------------------------------------------------------------- milestones: one-time goals that pay crystals, gold and sigils
  const allItems = (s) => s.inventory.concat(...s.heroes.map((h) => BB.SLOTS.map((k) => h.gear[k]).filter(Boolean)));
  BB.QUESTS = [
    { id: 'clear3', name: 'First Blood', desc: 'Clear stage 1-3', test: (s) => !!s.cleared['s1-3'], reward: { crystals: 100 } },
    { id: 'heroes3', name: 'A Warband', desc: 'Have 3 heroes', test: (s) => s.heroes.length >= 3, reward: { crystals: 150 } },
    { id: 'gear4', name: 'Fully Armed', desc: 'Fill all four gear slots on one hero', test: (s) => s.heroes.some((h) => BB.SLOTS.every((k) => h.gear[k])), reward: { crystals: 100 } },
    { id: 'lv10', name: 'Seasoned', desc: 'Raise a hero to level 10', test: (s) => s.heroes.some((h) => h.level >= 10), reward: { gold: 1500 } },
    { id: 'ch1', name: 'Greenvale Freed', desc: 'Clear chapter 1', test: (s) => BB.chapterCleared(s, 1), reward: { crystals: 300 } },
    { id: 'team5', name: 'Full Formation', desc: 'Field five heroes at once', test: (s) => BB.teamIds(s).length >= 5, reward: { crystals: 200 } },
    { id: 'star2', name: 'Ascendant', desc: 'Ascend a hero to 2 stars', test: (s) => s.heroes.some((h) => h.stars >= 2), reward: { crystals: 150 } },
    { id: 'forge5', name: 'Smith', desc: 'Forge a piece of gear to +5', test: (s) => allItems(s).some((it) => (it.plus || 0) >= 5), reward: { sigils: 4 } },
    { id: 'heroes8', name: 'A Growing Banner', desc: 'Have 8 heroes', test: (s) => s.heroes.length >= 8, reward: { crystals: 300 } },
    { id: 'ch2', name: 'The Sunscar Quiet', desc: 'Clear chapter 2', test: (s) => BB.chapterCleared(s, 2), reward: { crystals: 400 } },
    { id: 'kills500', name: 'Bone Breaker', desc: 'Defeat 500 foes', test: (s) => (s.stats.kills || 0) >= 500, reward: { sigils: 6 } },
    { id: 'legends3', name: 'Legends Walk', desc: 'Three legends under your banner', test: (s) => s.heroes.filter((h) => h.legend).length >= 3, reward: { crystals: 300 } },
    { id: 'lv30', name: 'Veteran', desc: 'Raise a hero to level 30', test: (s) => s.heroes.some((h) => h.level >= 30), reward: { sigils: 8 } },
    { id: 'ch3', name: 'Aldmere Freed', desc: 'Clear chapter 3', test: (s) => BB.chapterCleared(s, 3), reward: { crystals: 500 } },
    { id: 'star4', name: 'Paragon', desc: 'Ascend a hero to 4 stars', test: (s) => s.heroes.some((h) => h.stars >= 4), reward: { crystals: 400 } },
    { id: 'heroes20', name: 'Hall of Heroes', desc: 'Have 20 heroes', test: (s) => s.heroes.length >= 20, reward: { crystals: 600 } },
    { id: 'ch4', name: 'The Cantor Silenced', desc: 'Clear the campaign', test: (s) => BB.campaignDone(s), reward: { crystals: 1000, sigils: 10 } },
  ];
  BB.questState = (s, q) => (s.quests && s.quests[q.id] ? 'claimed' : q.test(s) ? 'ready' : 'open');
  BB.questsReady = (s) => BB.QUESTS.filter((q) => BB.questState(s, q) === 'ready').length;
  BB.claimQuest = function (s, id) {
    const q = BB.QUESTS.find((x) => x.id === id); if (!q || BB.questState(s, q) !== 'ready') return null;
    s.quests = s.quests || {}; s.quests[id] = 1;
    s.gold += q.reward.gold || 0; s.crystals += q.reward.crystals || 0; s.sigils += q.reward.sigils || 0;
    return q.reward;
  };
  // the strongest five: tanks and bruisers in front, the rest behind
  BB.autoFill = function (save) {
    const best = save.heroes.slice().sort((a, b) => BB.power(b) - BB.power(a)).slice(0, BB.FRONT + BB.BACK);
    const melee = (h) => !BB.CALLINGS[h.calling].ranged && h.calling !== 'warpriest';
    best.sort((a, b) => (melee(b) - melee(a)) || (BB.CALLINGS[a.calling].role === 'Tank' ? -1 : 0) - (BB.CALLINGS[b.calling].role === 'Tank' ? -1 : 0) || BB.power(b) - BB.power(a));
    save.formation = { front: [null, null], back: [null, null, null] };
    const front = best.filter(melee).slice(0, BB.FRONT), rest = best.filter((h) => !front.includes(h));
    front.forEach((h, i) => (save.formation.front[i] = h.id));
    rest.forEach((h, i) => { if (i < BB.BACK) save.formation.back[i] = h.id; else { const j = save.formation.front.indexOf(null); if (j >= 0) save.formation.front[j] = h.id; } });
  };
  // level up as far as gold and the cap allow
  BB.levelMax = function (save, h) { let n = 0; while (BB.levelUp(save, h)) n++; return n; };

  // ---------------------------------------------------------------- foes
  BB.foeStats = function (kind, level, elite) {
    const F = BB.FOES[kind];
    const g = 1 + (level - 1) * 0.2;
    const s = { hp: Math.round(F.hp * g * (F.boss ? 4.2 : F.gate ? 1.9 : 3.1)), atk: F.atk * (1 + (level - 1) * 0.16) * (F.boss ? 1.45 : 1.7), def: F.def + (level - 1) * 0.6 };
    if (elite) { s.hp = Math.round(s.hp * elite.hp); s.atk *= elite.atk; }
    return s;
  };
  BB.foeLevel = (stage) => stage.level;
  BB.damage = (atk, def, mult) => Math.max(1, atk * (mult || 1) * (100 / (100 + def * 6)));

  // ---------------------------------------------------------------- the save
  BB.SAVE_V = 2;
  BB.newSave = function (now) {
    if (now == null) now = Date.now();
    const cap = BB.newCaptain();
    return {
      v: BB.SAVE_V, created: now, gold: 0, crystals: 0, sigils: 0,
      banner: { name: 'The Last Banner', color: BB.BANNER_COLORS[0], sigil: 'crown', trim: '#e8c66a' },
      heroes: [cap], formation: { front: [cap.id, null], back: [null, null, null] }, inventory: [],
      cleared: {}, seen: {}, idleT: now, shop: null, leader: cap.id,
      settings: { music: 0.5, sfx: 0.8, shake: true, speed: 1, auto: false, dmgNums: true, skipStory: false }, stats: { kills: 0, gates: 0 }, quests: {},
    };
  };

  if (typeof module !== 'undefined') module.exports = BB;
})(typeof window !== 'undefined' ? window : globalThis);
