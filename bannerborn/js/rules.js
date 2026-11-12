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
  // heroes grow by fighting: experience from battles, not gold
  BB.xpNeed = (h) => Math.round(25 * Math.pow(h.level || 1, 1.1) + 35);
  BB.gainXp = function (h, n) { // returns how many levels were gained; at the cap, experience waits (up to one level's worth) for an ascension
    h.xp = (h.xp || 0) + Math.max(0, Math.round(n)); let up = 0;
    while (h.level < BB.levelCap(h) && h.xp >= BB.xpNeed(h)) { h.xp -= BB.xpNeed(h); h.level++; up++; }
    if (h.level >= BB.levelCap(h)) h.xp = Math.min(h.xp, BB.xpNeed(h));
    return up;
  };
  BB.ascendWaitingXp = (h) => { if (h.level < BB.levelCap(h)) BB.gainXp(h, 0); };
  // what a battle teaches each hero who fought: more for harder stages, a share for the work done, a little for losing;
  // a hero below the stage's level learns faster, so new recruits catch up by fighting
  BB.battleXp = (M, win, share, mvp, lvl) => Math.round((40 + M.level * 20) * (win ? 1 : 0.4) * (0.75 + Math.min(1, share || 0) * 1.25) * (mvp ? 1.2 : 1) *
    (lvl && lvl < M.level ? Math.min(3, 1 + (M.level - lvl) * 0.2) : 1));
  BB.ascendCost = (h) => (h.stars || 1) * 4;

  // hero: { id, name, calling, level, stars, rarity (0-3), gear, recruit | legend | captain, look (captain only) }
  BB.newHero = function (o) {
    o = o || {};
    const h = {
      id: BB.uid('h'), name: o.name || BB.randomName(BB.rng(o.seed || Math.random() * 1e9)), calling: o.calling || 'vanguard',
      level: o.level || 1, xp: 0, stars: o.stars || 1, rarity: o.rarity || 0,
      gear: { weapon: null, chest: null, head: null, charm: null },
      recruit: o.recruit || null, legend: o.legend || null, captain: !!o.captain, look: o.look || null, elem: o.elem || null, arch: o.arch || null,
    };
    if (h.legend) { const L = BB.LEGENDS[h.legend]; h.name = L.name; h.calling = L.calling; h.rarity = 3; }
    return h;
  };
  // The Captain is the last knight of the opening: the ninth banner's great helm, steel plate, and a shield in the banner's red.
  BB.CAPTAIN_LOOK = { skin: 'tan', head: 'helm', hair: 'copper', headTint: 'natural', chest: 'chestB', chestTint: 'natural', legs: 'legsB', legsTint: 'natural', shieldTint: 'crimson' };
  BB.newCaptain = function () {
    return BB.newHero({ calling: 'vanguard', captain: true, name: 'The Captain', rarity: 2, look: Object.assign({}, BB.CAPTAIN_LOOK) });
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
  BB.ENCHANTS = ['fire', 'frost', 'storm', 'shadow', 'holy', 'poison'];
  BB.ENCH = {
    fire: { prefix: 'Blazing', stat: 'atk', amt: 1.5, desc: 'Blows set foes alight' },
    frost: { prefix: 'Frostbitten', stat: 'def', amt: 1.2, desc: 'Blows slow foes' },
    storm: { prefix: 'Stormcalled', stat: 'crit', amt: 0.02, desc: 'Blows arc to a second foe' },
    shadow: { prefix: 'Shadowed', stat: 'atk', amt: 1.2, desc: 'Blows rend for 20% more' },
    holy: { prefix: 'Hallowed', stat: 'hp', amt: 10, desc: 'Blows heal the weakest ally' },
    poison: { prefix: 'Venomous', stat: 'atk', amt: 1.0, desc: 'Blows poison foes; the venom stacks three deep' },
  };
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
    { const wr = (BB.save && BB.save.rank) || 0; s.hpPct += wr * BB.RANK_STEP; s.atkPct += wr * BB.RANK_STEP; } // the war chest: every rank lifts the whole banner
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
    const idx = BB.stageIdx(stage.id), n = BB.slotsAt(Math.max(0, idx)); // as many heroes as there are places by then
    const cs = ['vanguard', 'ranger', 'warpriest', 'berserker', 'arcanist'].slice(0, n);
    let p = 0; for (const c of cs) p += BB.power(BB.newHero({ calling: c, level: Math.max(1, stage.level - 1), rarity: 0, name: 'x' }));
    const d = BB.diffAt ? BB.diffAt(stage.level) : { hp: 1, atk: 1 }; // the dead are harder than the base tables: so is what a stage asks
    return Math.round(p * 0.9 * Math.sqrt(d.hp * d.atk));
  };

  // ---------------------------------------------------------------- formation: up to five heroes, placed freely on the field
  // Each hero has a place (u, v): u runs from the rear (0) to the enemy's side (1), v across the line (0..1). A hero
  // placed in the front half fights in the front line (they draw the blows); the rest fight behind it.
  BB.FRONT = 2; BB.BACK = 3; BB.TEAM_MAX = 5;
  // ---- places in the team are earned. The banner starts with one; a second opens when a fifth of the campaign is
  // won, a third at two fifths, a fourth at three, the fifth at four. Heroes can be many; who marches is a choice.
  BB.SLOT_AT = [0, 0.2, 0.4, 0.6, 0.8];
  BB.slotStage = (k) => Math.ceil(BB.MISSIONS.length * BB.SLOT_AT[k]);            // stages to clear for place k+1
  BB.slotsAt = (cleared) => { let n = 1; for (let k = 1; k < BB.SLOT_AT.length; k++) if (cleared >= BB.slotStage(k)) n = k + 1; return n; };
  BB.clearedCount = (save) => (save.cleared ? BB.MISSIONS.filter((m) => save.cleared[m.id]).length : 0);
  BB.teamMax = (save) => (save.allSlots ? BB.TEAM_MAX : BB.slotsAt(BB.clearedCount(save)));
  BB.nextSlot = function (save) { // what the next place costs, or null when all five are open
    const n = BB.teamMax(save); if (n >= BB.TEAM_MAX) return null;
    const need = BB.slotStage(n), have = BB.clearedCount(save);
    return { slot: n + 1, need, have, left: need - have, pct: Math.round(BB.SLOT_AT[n] * 100), stage: BB.MISSIONS[need - 1] };
  };
  const DEF_PLACE = { front: [[0.74, 0.36], [0.78, 0.64], [0.66, 0.5], [0.84, 0.2], [0.86, 0.82]], back: [[0.24, 0.24], [0.28, 0.5], [0.32, 0.76], [0.12, 0.4], [0.14, 0.66]] };
  BB.fixFormation = function (save) { // older saves had two front places and three back
    const f = save.formation || (save.formation = { front: [], back: [] });
    for (const r of ['front', 'back']) { f[r] = (f[r] || []).slice(0, BB.TEAM_MAX); while (f[r].length < BB.TEAM_MAX) f[r].push(null); }
    if (!save.place) save.place = {};
    { // no more on the field than there are places: the strongest stay
      const max = BB.teamMax(save), team = BB.teamIds(save);
      if (team.length > max) { const keep = team.map((id) => save.heroes.find((h) => h.id === id)).filter(Boolean).sort((a, b) => BB.power(b) - BB.power(a)).slice(0, max).map((h) => h.id);
        for (const r of ['front', 'back']) f[r] = f[r].map((id) => (id && keep.includes(id) ? id : null)); }
    }
    const ids = BB.teamIds(save); for (const id in save.place) if (!ids.includes(id)) delete save.place[id];
    return save;
  };
  BB.teamIds = (save) => save.formation.front.concat(save.formation.back).filter(Boolean);
  BB.teamHeroes = (save) => BB.teamIds(save).map((id) => save.heroes.find((h) => h.id === id)).filter(Boolean);
  BB.rowOf = (save, id) => (save.formation.front.includes(id) ? 'front' : save.formation.back.includes(id) ? 'back' : null);
  BB.placeOf = function (save, id) {
    if (save.place && save.place[id]) return save.place[id];
    const row = BB.rowOf(save, id); if (!row) return null;
    const d = DEF_PLACE[row][Math.min(DEF_PLACE[row].length - 1, save.formation[row].indexOf(id))];
    return { u: d[0], v: d[1] };
  };
  BB.formationList = function (save) {
    const out = [];
    for (const row of ['front', 'back']) {
      const line = save.formation[row].map((id) => id && save.heroes.find((x) => x.id === id)).filter(Boolean)
        .map((h) => Object.assign({ hero: h, row }, BB.placeOf(save, h.id))).sort((a, b) => a.v - b.v);
      line.forEach((f, i) => { f.slot = i; out.push(f); });
    }
    return out;
  };
  // put a hero at a place on the field (dragging); the half they stand in decides their line
  BB.setPlace = function (save, id, u, v) {
    BB.fixFormation(save);
    const h = save.heroes.find((x) => x.id === id); if (!h) return false;
    const inTeam = BB.teamIds(save).includes(id);
    if (!inTeam && BB.teamIds(save).length >= BB.teamMax(save)) return false;
    u = Math.max(0, Math.min(1, u)); v = Math.max(0, Math.min(1, v));
    const row = u >= 0.5 ? 'front' : 'back';
    if (BB.rowOf(save, id) !== row) { for (const r of ['front', 'back']) { const i = save.formation[r].indexOf(id); if (i >= 0) save.formation[r][i] = null; } save.formation[row][save.formation[row].indexOf(null)] = id; }
    save.place[id] = { u, v };
    return true;
  };
  BB.placeHero = function (save, id, row, slot) { // a free place (melee prefer the front), or the slot asked for
    BB.fixFormation(save);
    const h = save.heroes.find((x) => x.id === id); if (!h) return false;
    if (row !== undefined) { const old = save.formation[row][slot]; if (!old && !BB.teamIds(save).includes(id) && BB.teamIds(save).length >= BB.teamMax(save)) return false;
      BB.removeHero(save, id); if (old) delete save.place[old]; save.formation[row][slot] = id; return old || true; }
    if (BB.teamIds(save).includes(id) || BB.teamIds(save).length >= BB.teamMax(save)) return false;
    const r = BB.CALLINGS[h.calling].ranged || h.calling === 'warpriest' ? 'back' : 'front';
    // the first usual place in that line nobody stands near
    const taken = BB.teamIds(save).map((x) => BB.placeOf(save, x));
    const spot = DEF_PLACE[r].find((d) => !taken.some((t) => Math.hypot(t.u - d[0], t.v - d[1]) < 0.17)) || DEF_PLACE[r][0];
    return BB.setPlace(save, id, spot[0], spot[1]);
  };
  BB.removeHero = function (save, id) {
    for (const r of ['front', 'back']) { const i = save.formation[r].indexOf(id); if (i >= 0) save.formation[r][i] = null; }
    if (save.place) delete save.place[id];
  };

  // ---------------------------------------------------------------- hero tiers and recruiting
  BB.TIERS = [
    { id: 1, name: 'Common', rarity: 0, chapter: 0, cost: 200, arch: ['knight', 'barbarian', 'ranger', 'spearman'], count: 10 },
    { id: 2, name: 'Rare', rarity: 1, chapter: 1, cost: 400, arch: ['monk', 'paladin', 'knight', 'mage', 'spearman', 'barbarian'], count: 10 },
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

  // ---------------------------------------------------------------- ascend
  BB.ascend = function (save, h) {
    if (h.stars >= BB.MAX_STARS) return false;
    const c = BB.ascendCost(h); if (save.sigils < c) return false;
    save.sigils -= c; h.stars++; BB.ascendWaitingXp(h); return true;
  };

  // ---------------------------------------------------------------- stages
  BB.stageIdx = (id) => BB.MISSIONS.findIndex((m) => m.id === id);
  BB.stageUnlocked = (save, idx) => idx === 0 || !!save.cleared[BB.MISSIONS[idx - 1].id];
  BB.nextStageIdx = (save) => { const i = BB.MISSIONS.findIndex((m) => !save.cleared[m.id]); return i < 0 ? BB.MISSIONS.length - 1 : i; };
  BB.campaignDone = (save) => BB.MISSIONS.every((m) => save.cleared[m.id]);
  // ---- the war chest: gold raises the banner's rank, and every rank is a little more attack and health for every
  // hero under it. It is where gold goes once the shop is bought out.
  BB.RANK_MAX = 30; BB.RANK_STEP = 0.015;
  BB.rankCost = (rank) => Math.round(300 * Math.pow(rank + 1, 1.6) / 10) * 10;
  BB.raiseRank = function (save) {
    const r = save.rank || 0; if (r >= BB.RANK_MAX) return false;
    const c = BB.rankCost(r); if (save.gold < c) return false;
    save.gold -= c; save.rank = r + 1; return true;
  };
  // ---- relics: what the lords of the far marches leave behind. One each, on the first victory: a Legendary charm
  // half again as strong as any that drops, under its own name
  BB.RELICS = { hroald: "The Rime Jarl's Crown", maelis: "The Cinder Witch's Ember", morwen: "The Fen Mother's Lantern", aurelian: "The Hollow King's Seal" };
  BB.makeRelic = function (boss, level) {
    const it = BB.makeItem(BB.rng(BB.hashStr('relic' + boss)), 'charm', level, 3);
    it.name = BB.RELICS[boss]; it.relic = boss;
    for (const k in it.stats) it.stats[k] = Math.round(it.stats[k] * 1.5 * 1000) / 1000;
    return it;
  };
  BB.stageRewards = function (stage, first) {
    const boss = stage.type === 'boss' || stage.type === 'duel';
    const gold = Math.round((100 + stage.level * 55) * (boss ? 1.8 : 1) * (first ? 1 : 0.4));
    const far = stage.chapter > 4; // the far marches pay more sigils: their dead are stronger, and heroes need the stars
    return { gold, crystals: first ? (boss ? 120 : 25) : 0, sigils: boss ? (first ? (far ? 12 : 8) : 2) : (first ? (far ? 2 : 1) : 0), items: boss ? 2 : 1 };
  };
  // fewer foes for a small team: a lone captain can win the first stage
  // the horde is sized to the team that meets it: one hero faces a fifth of what five do, and a little less
  // (a lone hero has no healer and no shield beside them, so their foes also hit softer, and bosses and gates are
  // cut down further than the crowd is). By team size 0..5: how many come, how hard they hit, a boss's health, a gate's.
  BB.TEAM_K = { count: [0.2, 0.2, 0.34, 0.52, 0.76, 1], atk: [0.5, 0.5, 0.56, 0.85, 1, 1.05], hp: [0.5, 0.5, 0.6, 0.72, 0.86, 1], boss: [0.1, 0.1, 0.14, 0.36, 0.68, 1], gate: [0.25, 0.25, 0.4, 0.6, 0.8, 1],
    gates: [0.34, 0.34, 0.5, 0.67, 0.84, 1], cap: [2, 2, 4, 6, 8, 9], elite: [0, 0, 0.3, 0.55, 0.8, 1], // gates: how many of a stage's gates stand; cap: how many a gate keeps on the field; elite: how often one comes
    crowd: [0, 0, 1, 2, 3, 4], wait: [5, 5, 2.4, 1.6, 1.2, 1] }; // crowd: a new wave waits until this few are left standing; wait: how much longer before it comes anyway
  BB.teamK = (what, n) => BB.TEAM_K[what][Math.max(0, Math.min(5, n | 0))];
  BB.waveScale = (n) => BB.teamK('count', n);
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
    const k = BB.writActive(save, now) ? 2 : 1; // the Quartermaster's Writ
    return { ms, gold: Math.floor(r.gold * h) * k, sigils: Math.floor(r.sigils * h) * k };
  };
  BB.idleClaim = function (save, now) {
    const p = BB.idlePending(save, now);
    save.gold += p.gold; save.sigils += p.sigils; save.idleT = now;
    return p;
  };


  // ---------------------------------------------------------------- the treasury: what is sold for money, and what an ad is worth
  // Nothing here sells power directly: no hero, no team place, no stage. Money buys time (crystals, a daily
  // allowance) and quiet (no ads). `sku` is the product id to create in App Store Connect and Google Play;
  // `usd` is only the price shown until the store has told the app the real, local one.
  BB.PRODUCTS = [
    { id: 'noads', sku: 'bannerborn.noads', kind: 'once', usd: 3.99, name: 'Quiet March', desc: 'No ads between battles, for good. Every bonus that asks you to watch one is yours at a tap.' },
    { id: 'starter', sku: 'bannerborn.starter', kind: 'once', usd: 4.99, name: 'Captain\'s Chest', give: { crystals: 600, gold: 5000, sigils: 20, weapon: 1 }, desc: 'Once only: 600 crystals, 5,000 gold, 20 sigils and an Epic weapon for your Captain.' },
    { id: 'writ', sku: 'bannerborn.writ30', kind: 'pass', days: 30, usd: 4.99, name: 'Quartermaster\'s Writ', daily: 40, desc: '40 crystals every day for 30 days (1,200 in all), and the camp gathers double while it lasts.' },
    { id: 'c1', sku: 'bannerborn.crystals.200', kind: 'pack', usd: 1.99, name: 'Pouch of Crystals', give: { crystals: 200 }, desc: '200 crystals.' },
    { id: 'c2', sku: 'bannerborn.crystals.550', kind: 'pack', usd: 4.99, name: 'Purse of Crystals', give: { crystals: 550 }, desc: '550 crystals.' },
    { id: 'c3', sku: 'bannerborn.crystals.1200', kind: 'pack', usd: 9.99, name: 'Coffer of Crystals', give: { crystals: 1200 }, desc: '1,200 crystals.' },
    { id: 'c4', sku: 'bannerborn.crystals.2600', kind: 'pack', usd: 19.99, name: 'Chest of Crystals', give: { crystals: 2600 }, desc: '2,600 crystals.' },
    { id: 'c5', sku: 'bannerborn.crystals.7000', kind: 'pack', usd: 49.99, name: 'Hoard of Crystals', give: { crystals: 7000 }, desc: '7,000 crystals.' },
  ];
  BB.product = (id) => BB.PRODUCTS.find((p) => p.id === id || p.sku === id);
  BB.iap = function (save) { // the save's record of what was bought and which ads were watched today
    if (!save.iap) save.iap = { owned: {}, tx: [], writUntil: 0, writDay: '', adDay: '', adN: {}, spent: 0 };
    return save.iap;
  };
  BB.hasNoAds = (save) => !!(save && save.iap && save.iap.owned.noads);
  BB.writLeft = (save, now) => (save && save.iap ? Math.max(0, Math.ceil((save.iap.writUntil - now) / 86400000)) : 0);
  BB.writActive = (save, now) => !!(save && save.iap && save.iap.writUntil > now);
  // A paid product is given once per transaction (`tx`): the store may tell the app about the same purchase again
  // (a restore, a second launch before it is finished), and that must give nothing twice. Returns what was given, or null.
  BB.grantProduct = function (save, id, now, tx) {
    const P = BB.product(id); if (!P) return null;
    const I = BB.iap(save), out = { id: P.id, crystals: 0, gold: 0, sigils: 0, item: null };
    if (tx) { if (I.tx.includes(tx)) return null; I.tx.push(tx); if (I.tx.length > 80) I.tx.shift(); }
    if (P.kind === 'once') { if (I.owned[P.id]) return null; I.owned[P.id] = now || 1; }
    if (P.kind === 'pass') { I.writUntil = Math.max(I.writUntil, now) + P.days * 86400000; out.days = P.days; }
    const g = P.give || {};
    if (g.crystals) { save.crystals += g.crystals; out.crystals = g.crystals; }
    if (g.gold) { save.gold += g.gold; out.gold = g.gold; }
    if (g.sigils) { save.sigils += g.sigils; out.sigils = g.sigils; }
    if (g.weapon) { const cap = save.heroes.find((h) => h.captain) || save.heroes[0]; out.item = BB.makeItem(BB.rng((now || 1) % 100000 + 17), 'weapon', Math.max(3, cap.level), 2, BB.weaponType(cap.calling)); save.inventory.push(out.item); }
    I.spent = Math.round((I.spent + P.usd) * 100) / 100;
    return out;
  };
  // the writ's daily crystals: once a calendar day while it runs
  BB.writClaim = function (save, now) {
    const I = save.iap, day = BB.dayKey(now); if (!I || !(I.writUntil > now) || I.writDay === day) return 0;
    const n = BB.product('writ').daily; I.writDay = day; save.crystals += n; return n;
  };
  // Ads the player chooses to watch. `cap` a day each; what each gives is small next to playing.
  BB.AD_SPOTS = {
    spoils: { cap: 3, name: 'Double the camp\'s spoils' },
    gems: { cap: 3, crystals: 15, name: 'A crier\'s coin' },
    chest: { cap: 1, name: 'A chest from the smith' },
    victory: { cap: 5, name: 'Double the gold of a victory' },
  };
  BB.adLeft = function (save, spot, now) {
    const A = BB.AD_SPOTS[spot]; if (!A) return 0; const I = save.iap;
    return A.cap - (I && I.adDay === BB.dayKey(now) ? I.adN[spot] || 0 : 0);
  };
  BB.adUse = function (save, spot, now) {
    if (BB.adLeft(save, spot, now) <= 0) return false;
    const I = BB.iap(save), day = BB.dayKey(now); if (I.adDay !== day) { I.adDay = day; I.adN = {}; }
    I.adN[spot] = (I.adN[spot] || 0) + 1; return true;
  };
  // An ad between battles: never for those who bought their quiet, never in the first hour of the game (the first
  // road), at most every third battle and never within three minutes of the last ad of any kind.
  BB.INTERSTITIAL = { afterStages: 8, everyBattles: 3, gapMs: 180000 };
  BB.interstitialDue = function (save, st, now) {
    const R = BB.INTERSTITIAL; if (!save || BB.hasNoAds(save)) return false;
    return BB.clearedCount(save) >= R.afterStages && (st.battles || 0) >= R.everyBattles && now - (st.lastAd || 0) >= R.gapMs;
  };
  // what a gate's odds are, said plainly (the stores ask for it where chance is paid for): every hero still behind a
  // gate is as likely as any other, and nobody comes twice
  BB.gateOdds = function (save, tier) {
    const left = BB.heroTiers(BB.ROSTER).find((t) => t.tier.id === tier.id).heroes.filter((e) => !save.heroes.some((h) => h.recruit === e.key)).length;
    return { left, pct: left ? Math.round(1000 / left) / 10 : 0 };
  };

  // ---------------------------------------------------------------- shop: a few offers a day
  BB.dayKey = (now) => new Date(now).toISOString().slice(0, 10);
  BB.SHOP = [
    { id: 'free', name: 'Daily Crystals', desc: 'The first handful of the day is free.', give: { crystals: 30 }, cost: null, limit: 1 },
    { id: 'chest', name: 'Armory Chest', desc: 'One piece of gear, Rare or better.', give: { chest: 1 }, cost: { gold: 350 }, limit: 3 },
    { id: 'arms', name: 'Smith\'s Masterwork', desc: 'A weapon for one of your heroes, Epic or better, often enchanted.', give: { weapon: 1 }, cost: { crystals: 160 }, limit: 2 },
    { id: 'sigils', name: 'Sigil Bundle', desc: 'Five sigils for ascension.', give: { sigils: 5 }, cost: { gold: 500 }, limit: 2 },
    { id: 'crystals', name: 'Crystal Purse', desc: '120 crystals for recruiting.', give: { crystals: 120 }, cost: { gold: 800 }, limit: 1 },
  ];
  BB.shopLeft = function (save, offer, now) {
    if (!save.shop || save.shop.day !== BB.dayKey(now)) return offer.limit;
    return offer.limit - (save.shop.bought[offer.id] || 0);
  };
  // a chest as the smith packs it: one piece, Rare or better, for someone you have
  BB.chestItem = function (save, r) { const h = r.pick(save.heroes), slot = r.pick(BB.SLOTS); return BB.makeItem(r, slot, Math.max(1, BB.startLevel(save)), r() < 0.2 ? 2 : 1, slot === 'weapon' ? BB.weaponType(h.calling) : undefined); };
  BB.buy = function (save, offerId, now, r) {
    const o = BB.SHOP.find((x) => x.id === offerId); if (!o || BB.shopLeft(save, o, now) <= 0) return null;
    if (o.cost && ((o.cost.gold && save.gold < o.cost.gold) || (o.cost.crystals && save.crystals < o.cost.crystals))) return null;
    if (!save.shop || save.shop.day !== BB.dayKey(now)) save.shop = { day: BB.dayKey(now), bought: {} };
    if (o.cost) { save.gold -= o.cost.gold || 0; save.crystals -= o.cost.crystals || 0; }
    save.shop.bought[o.id] = (save.shop.bought[o.id] || 0) + 1;
    const got = {};
    if (o.give.crystals) { save.crystals += o.give.crystals; got.crystals = o.give.crystals; }
    if (o.give.sigils) { save.sigils += o.give.sigils; got.sigils = o.give.sigils; }
    if (o.give.chest) {
      r = r || BB.rng(now & 0xffffff);
      const it = BB.chestItem(save, r);
      save.inventory.push(it); got.item = it;
    }
    if (o.give.weapon) {
      r = r || BB.rng(now & 0xffffff);
      const h = r.pick(save.heroes), it = BB.makeItem(r, 'weapon', Math.max(1, BB.startLevel(save) + 1), r() < 0.25 ? 3 : 2, BB.weaponType(h.calling));
      save.inventory.push(it); got.item = it;
    }
    return got;
  };

  // ---------------------------------------------------------------- the muster roll: a small gift for the day
  // Seven days, then round again. It counts days answered, not days in a row: missing one loses nothing.
  BB.ROLL = [{ gold: 200 }, { sigils: 3 }, { crystals: 20 }, { gold: 400 }, { sigils: 5 }, { crystals: 30 }, { crystals: 50, chest: 1 }];
  BB.rollState = function (save, now) { const R = save.roll || { n: 0, day: '' }; return { day: R.n % BB.ROLL.length, n: R.n, ready: R.day !== BB.dayKey(now) }; };
  BB.rollClaim = function (save, now, r) {
    const st = BB.rollState(save, now); if (!st.ready) return null;
    const g = BB.ROLL[st.day], out = Object.assign({ day: st.day }, g); save.roll = { n: st.n + 1, day: BB.dayKey(now) };
    if (g.gold) save.gold += g.gold; if (g.sigils) save.sigils += g.sigils; if (g.crystals) save.crystals += g.crystals;
    if (g.chest) { out.item = BB.chestItem(save, r || BB.rng(now & 0xffffff)); save.inventory.push(out.item); }
    return out;
  };

  // ---------------------------------------------------------------- milestones: one-time goals that pay crystals, gold and sigils
  BB.QUESTS = [
    { id: 'clear3', name: 'First Blood', desc: 'Clear stage 1-3', test: (s) => !!s.cleared['s1-3'], reward: { crystals: 30 } },
    { id: 'heroes3', name: 'A Warband', desc: 'Have 3 heroes', test: (s) => s.heroes.length >= 3, reward: { crystals: 50 } },
    { id: 'gear4', name: 'Fully Armed', desc: 'Fill all four gear slots on one hero', test: (s) => s.heroes.some((h) => BB.SLOTS.every((k) => h.gear[k])), reward: { crystals: 100 } },
    { id: 'lv10', name: 'Seasoned', desc: 'Raise a hero to level 10', test: (s) => s.heroes.some((h) => h.level >= 10), reward: { gold: 1500 } },
    { id: 'ch1', name: 'Greenvale Freed', desc: 'Clear chapter 1', test: (s) => BB.chapterCleared(s, 1), reward: { crystals: 150 } },
    { id: 'team5', name: 'Full Formation', desc: 'Field five heroes at once', test: (s) => BB.teamIds(s).length >= 5, reward: { crystals: 300 } },
    { id: 'star2', name: 'Ascendant', desc: 'Ascend a hero to 2 stars', test: (s) => s.heroes.some((h) => h.stars >= 2), reward: { crystals: 80 } },
    { id: 'epicgear', name: 'Well Armed', desc: 'Have a hero carry a piece of Epic gear or better', test: (s) => s.heroes.some((h) => BB.SLOTS.some((k) => h.gear[k] && h.gear[k].rarity >= 2)), reward: { sigils: 4 } },
    { id: 'heroes8', name: 'A Growing Banner', desc: 'Have 8 heroes', test: (s) => s.heroes.length >= 8, reward: { crystals: 150 } },
    { id: 'ch2', name: 'The Sunscar Quiet', desc: 'Clear chapter 2', test: (s) => BB.chapterCleared(s, 2), reward: { crystals: 250 } },
    { id: 'kills500', name: 'Bone Breaker', desc: 'Defeat 500 foes', test: (s) => (s.stats.kills || 0) >= 500, reward: { sigils: 6 } },
    { id: 'legends3', name: 'Legends Walk', desc: 'Three legends under your banner', test: (s) => s.heroes.filter((h) => h.legend).length >= 3, reward: { crystals: 300 } },
    { id: 'lv30', name: 'Veteran', desc: 'Raise a hero to level 30', test: (s) => s.heroes.some((h) => h.level >= 30), reward: { sigils: 8 } },
    { id: 'ch3', name: 'Aldmere Freed', desc: 'Clear chapter 3', test: (s) => BB.chapterCleared(s, 3), reward: { crystals: 500 } },
    { id: 'star4', name: 'Paragon', desc: 'Ascend a hero to 4 stars', test: (s) => s.heroes.some((h) => h.stars >= 4), reward: { crystals: 400 } },
    { id: 'heroes20', name: 'Hall of Heroes', desc: 'Have 20 heroes', test: (s) => s.heroes.length >= 20, reward: { crystals: 600 } },
    { id: 'ch4', name: 'The Cantor Silenced', desc: 'Clear chapter 4', test: (s) => BB.chapterCleared(s, 4), reward: { crystals: 1000, sigils: 10 } },
    { id: 'ch5', name: 'The Thaw', desc: 'Clear chapter 5, the Frostmarch', test: (s) => BB.chapterCleared(s, 5), reward: { crystals: 600, sigils: 6 } },
    { id: 'ch6', name: 'Cold Ashes', desc: 'Clear chapter 6, the Cinderfields', test: (s) => BB.chapterCleared(s, 6), reward: { crystals: 700, sigils: 8 } },
    { id: 'ch7', name: 'Dry Land', desc: 'Clear chapter 7, Mirefen', test: (s) => BB.chapterCleared(s, 7), reward: { crystals: 800, sigils: 10 } },
    { id: 'ch8', name: 'Every Gate Shut', desc: 'Clear the campaign', test: (s) => BB.campaignDone(s), reward: { crystals: 1500, sigils: 15 } },
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
    const best = save.heroes.slice().sort((a, b) => BB.power(b) - BB.power(a)).slice(0, BB.teamMax(save));
    const melee = (h) => !BB.CALLINGS[h.calling].ranged && h.calling !== 'warpriest';
    best.sort((a, b) => (melee(b) - melee(a)) || (BB.CALLINGS[a.calling].role === 'Tank' ? -1 : 0) - (BB.CALLINGS[b.calling].role === 'Tank' ? -1 : 0) || BB.power(b) - BB.power(a));
    save.formation = { front: [], back: [] }; save.place = {}; BB.fixFormation(save);
    const front = best.filter(melee).slice(0, BB.FRONT), rest = best.filter((h) => !front.includes(h));
    front.forEach((h, i) => (save.formation.front[i] = h.id));
    rest.forEach((h, i) => { if (i < BB.BACK) save.formation.back[i] = h.id; else { const j = save.formation.front.indexOf(null); if (j >= 0) save.formation.front[j] = h.id; } });
  };

  // ---------------------------------------------------------------- foes
  // How hard the dead are, over the base tables. A player's heroes grow much faster than the tables assumed (gear in
  // every slot, every skill point spent): measured that way, a team never fell below four fifths of its health. So the
  // dead are raised, by how far into the campaign they are: [level, health x, damage x], read between the rows. The
  // far marches (levels 28 to 40) needed the most; the last land was already the tightest. A boss takes a part of
  // the raise (bossHp, bossAtk): it is its own measure.
  BB.DIFF = { knots: [[1, 1.2, 1.5], [4, 1.8, 2.6], [9, 1.7, 2.4], [17, 1.6, 2.2], [24, 2.1, 2.5], [28, 2.9, 2.8], [40, 2.9, 2.8], [44, 2.1, 2.4], [47, 2.0, 2.3]], bossHp: 0.5, bossAtk: 0.4 };
  BB.diffAt = function (level) {
    const D = BB.DIFF; if (D.flat) return { hp: D.flat[0], atk: D.flat[1] };
    const K = D.knots; if (level <= K[0][0]) return { hp: K[0][1], atk: K[0][2] };
    for (let i = 1; i < K.length; i++) if (level <= K[i][0]) { const a = K[i - 1], b = K[i], k = (level - a[0]) / (b[0] - a[0]); return { hp: a[1] + (b[1] - a[1]) * k, atk: a[2] + (b[2] - a[2]) * k }; }
    const L = K[K.length - 1]; return { hp: L[1], atk: L[2] };
  };
  BB.foeStats = function (kind, level, elite) {
    const F = BB.FOES[kind], g = 1 + (level - 1) * 0.2, d = BB.diffAt(level), D = BB.DIFF;
    const hpK = F.boss ? 1 + (d.hp - 1) * D.bossHp : F.gate ? 1 : d.hp, atkK = F.boss ? 1 + (d.atk - 1) * D.bossAtk : d.atk;
    const s = { hp: Math.round(F.hp * g * (F.boss ? 3.5 : F.gate ? 1.6 : 2.5) * hpK), atk: F.atk * (1 + (level - 1) * 0.16) * (F.boss ? 2.5 : 2.9) * atkK, def: F.def + (level - 1) * 0.6 };
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
      heroes: [cap], formation: { front: [cap.id, null, null, null, null], back: [null, null, null, null, null] }, place: {}, inventory: [],
      cleared: {}, seen: {}, idleT: now, shop: null, leader: cap.id,
      settings: { music: 0.5, sfx: 0.8, shake: true, speed: 1, auto: false, numbers: false, gfx: 'auto' }, stats: { kills: 0, gates: 0 }, quests: {},
    };
  };

  if (typeof module !== 'undefined') module.exports = BB;
})(typeof window !== 'undefined' ? window : globalThis);
