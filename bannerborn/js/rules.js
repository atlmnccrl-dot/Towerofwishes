// Bannerborn — rules: heroes, stats, levels, loot, the save. Pure: no DOM, runs in Node.
(function (root) {
  const BB = root.BB = root.BB || (typeof require !== 'undefined' ? require('./data.js') : {});

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

  BB.xpNext = (lvl) => Math.round(60 * Math.pow(lvl, 1.45));
  BB.MAX_LEVEL = 30;

  BB.randomName = function (r) {
    r = r || BB.rng(Math.random() * 1e9);
    return r.pick(BB.NAMES.first) + ' ' + r.pick(BB.NAMES.epithet);
  };

  // a forged hero. look: {skin, head:'none'|'hair'|'helm', hair, chest:'none'|'chestA'|'chestB', legs, tints...}
  BB.randomLook = function (r, calling) {
    r = r || BB.rng(Math.random() * 1e9);
    const tint = () => r.pick(BB.TINTS).id;
    return {
      skin: r.pick(BB.SKINS).id,
      head: r.pick(['hair', 'hair', 'helm']), hair: r.pick(BB.HAIRS).id,
      headTint: tint(), chestTint: tint(), legsTint: tint(), shieldTint: tint(),
      chest: r.pick(['chestA', 'chestB']), legs: r.pick(['legsA', 'legsB']),
    };
  };

  BB.newHero = function (opts) {
    opts = opts || {};
    const r = BB.rng(opts.seed || Math.random() * 1e9);
    const calling = opts.calling || r.pick(BB.CALLING_ORDER);
    const h = {
      id: BB.uid('h'), name: opts.name || BB.randomName(r), calling,
      level: opts.level || 1, xp: 0, perks: [], pendingPerks: 0,
      look: opts.look || BB.randomLook(r, calling),
      gear: { head: null, chest: null, legs: null, weapon: null, offhand: null, charm: null },
      legend: opts.legend || null, captain: !!opts.captain,
    };
    if (h.legend) { h.name = BB.LEGENDS[h.legend].name; h.calling = BB.LEGENDS[h.legend].calling; }
    return h;
  };

  BB.heroColor = (h) => h.legend ? BB.LEGENDS[h.legend].color : BB.CALLINGS[h.calling].color;
  BB.heroTitle = (h) => h.legend ? BB.LEGENDS[h.legend].title : (h.captain ? 'Banner-Captain' : BB.CALLINGS[h.calling].name);

  BB.itemScore = function (it) {
    if (!it) return 0;
    const s = it.stats; return Math.round((s.hp || 0) * 0.5 + (s.atk || 0) * 5 + (s.def || 0) * 4 + (s.crit || 0) * 300 + (s.spd || 0) * 60);
  };

  BB.makeItem = function (r, slot, level, rarity, wtype) {
    let base, look = null;
    if (slot === 'weapon') {
      wtype = wtype || r.pick(['sword', 'axe', 'bow', 'focus']);
      base = BB.GEAR.weapon[wtype];
    } else {
      base = r.pick(BB.GEAR[slot]); look = base.look;
    }
    const mult = BB.RARITY[rarity].mult * (1 + (level - 1) * 0.16);
    const stats = {};
    for (const k in base.stat) {
      const v = base.stat[k] * mult * r.range(0.9, 1.1);
      stats[k] = (k === 'crit' || k === 'spd') ? Math.round(v * 1000) / 1000 : Math.round(v * 10) / 10;
    }
    if (rarity >= 2) { // epic+: a bonus stat
      const extra = r.pick(['atk', 'hp', 'crit', 'def']);
      const add = { atk: 2 * mult, hp: 14 * mult, crit: 0.02 * rarity, def: 1.2 * mult }[extra];
      stats[extra] = Math.round(((stats[extra] || 0) + add) * (extra === 'crit' ? 1000 : 10)) / (extra === 'crit' ? 1000 : 10);
    }
    const nameIdx = Math.min(base.names.length - 1, Math.max(0, rarity - (r() < 0.5 ? 1 : 0)));
    const tint = rarity === 0 ? 'natural' : r.pick(BB.TINTS.slice(1)).id;
    return { id: BB.uid('i'), slot, wtype: slot === 'weapon' ? wtype : undefined, look, tint, rarity, level,
      name: (rarity === 3 ? 'Legendary ' : '') + base.names[nameIdx], stats };
  };

  BB.canEquip = function (hero, item) {
    if (!item) return true;
    if (item.slot === 'weapon') return item.wtype === BB.weaponType(hero.calling);
    if (item.slot === 'offhand') return !!BB.CALLINGS[hero.calling].offhand;
    return true;
  };

  BB.bondsFor = function (callings) {
    return BB.BONDS.filter((b) => b.test(callings));
  };

  // final fight stats for a hero inside a team
  BB.heroStats = function (hero, teamCallings, save) {
    const C = BB.CALLINGS[hero.calling];
    const L = hero.level - 1;
    const s = {
      hp: C.base.hp + C.grow.hp * L, atk: C.base.atk + C.grow.atk * L, def: C.base.def + C.grow.def * L,
      spd: C.base.spd, crit: C.base.crit, aspd: C.base.aspd, range: C.range,
      hpPct: 0, atkPct: 0, spdPct: 0, aspdPct: 0, cdPct: 0, leech: 0, thorns: 0, skillDur: 0, skillDmg: 0, skillArea: 0,
      killCd: 0, lowHpAtk: 0, pierce: 0, burn: 0, shieldHeal: 0, casterAtk: 0, rangedCrit: 0, revive: 0, heal: 0,
    };
    if (hero.legend) { s.hp *= 1.12; s.atk *= 1.1; s.def += 1; }
    for (const slot of BB.SLOTS) {
      const it = hero.gear[slot]; if (!it) continue;
      for (const k in it.stats) s[k] = (s[k] || 0) + it.stats[k];
    }
    const add = (mod) => { for (const k in mod) s[k] = (s[k] || 0) + mod[k]; };
    const all = BB.PERKS.any.concat(BB.PERKS[hero.calling] || []);
    for (const pid of hero.perks) { const p = all.find((x) => x.id === pid); if (p) add(p.mod); }
    if (teamCallings) for (const b of BB.bondsFor(teamCallings)) add(b.mod);
    if (save && save.buildings) s.heal += (save.buildings.chapel || 0) * 0.1;
    if (C.ranged && hero.calling !== 'warpriest') s.crit += s.rangedCrit;
    if (hero.calling === 'arcanist' || hero.calling === 'warpriest') s.atkPct += s.casterAtk;
    s.hp = Math.round(s.hp * (1 + s.hpPct));
    s.atk = s.atk * (1 + s.atkPct);
    s.spd = s.spd * (1 + s.spdPct);
    s.aspd = s.aspd * (1 + s.aspdPct);
    s.cd = C.skill.cd * Math.max(0.4, 1 + s.cdPct);
    s.crit = Math.min(0.6, s.crit);
    return s;
  };

  BB.power = function (hero) {
    const s = BB.heroStats(hero, null, null);
    return Math.round(s.hp * 0.25 + s.atk * 4 + s.def * 3 + s.crit * 200);
  };

  // returns list of levels gained
  BB.grantXp = function (hero, xp) {
    const gained = [];
    if (hero.level >= BB.MAX_LEVEL) return gained;
    hero.xp += Math.round(xp);
    while (hero.level < BB.MAX_LEVEL && hero.xp >= BB.xpNext(hero.level)) {
      hero.xp -= BB.xpNext(hero.level); hero.level++; hero.pendingPerks++; gained.push(hero.level);
    }
    if (hero.level >= BB.MAX_LEVEL) hero.xp = 0;
    return gained;
  };

  BB.perkChoices = function (hero, seed) {
    const r = BB.rng(seed || (hero.level * 7919 + hero.perks.length * 31 + hero.id.length));
    const pool = BB.PERKS.any.concat(BB.PERKS[hero.calling] || []).filter((p) => {
      const own = hero.perks.filter((x) => x === p.id).length;
      return own < (BB.PERKS.any.includes(p) ? 3 : 1);
    });
    const out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(r.int(pool.length), 1)[0]);
    return out;
  };

  BB.rollRarity = function (r, forgeLvl, bonus) {
    const x = r() - (forgeLvl || 0) * 0.08 - (bonus || 0);
    if (x < 0.03) return 3; if (x < 0.15) return 2; if (x < 0.45) return 1; return 0;
  };

  // loot after a won mission: items for the deployed heroes' callings
  BB.rollLoot = function (r, mission, team, save, count) {
    const items = [];
    const n = count || (mission.type === 'boss' || mission.type === 'duel' ? 3 : 2);
    const lvl = Math.max(mission.level, Math.round(team.reduce((a, h) => a + h.level, 0) / Math.max(1, team.length)));
    for (let i = 0; i < n; i++) {
      const hero = r.pick(team);
      const slot = r.pick(BB.SLOTS);
      const rar = BB.rollRarity(r, save.buildings.forge, mission.type === 'boss' ? 0.15 : 0);
      if (slot === 'offhand' && !BB.CALLINGS[hero.calling].offhand) { items.push(BB.makeItem(r, 'chest', lvl, rar)); continue; }
      items.push(BB.makeItem(r, slot, lvl, rar, slot === 'weapon' ? BB.weaponType(hero.calling) : undefined));
    }
    return items;
  };

  BB.rosterCap = (save) => 5 + (save.buildings.barracks || 0) * 2;

  BB.newSave = function () {
    return {
      v: 1, created: Date.now(), gold: 0, banner: { name: 'The Last Banner', color: BB.BANNER_COLORS[0], sigil: 'crown', trim: '#e8c66a' },
      heroes: [], team: [], inventory: [], cleared: {}, seen: {}, buildings: { barracks: 0, forge: 0, yard: 0, chapel: 0, market: 0 },
      endlessBest: 0, settings: { music: 0.5, sfx: 0.8, auto: false, shake: true }, stage: 'new', freeHires: 2, stats: { kills: 0, gates: 0 },
    };
  };

  BB.missionUnlocked = function (save, idx) {
    if (idx === 0) return true;
    return !!save.cleared[BB.MISSIONS[idx - 1].id];
  };
  BB.regionUnlocked = function (save, rid) {
    const first = BB.MISSIONS.findIndex((m) => m.region === rid);
    return BB.missionUnlocked(save, first);
  };
  BB.campaignDone = (save) => !!save.cleared.m12;

  // enemy level for a mission: the mission's own level, raised toward the team's for replays
  BB.foeLevel = function (mission, team) {
    const avg = team.reduce((a, h) => a + h.level, 0) / Math.max(1, team.length);
    return Math.max(mission.level, Math.round(avg - 0.5));
  };
  BB.foeStats = function (kind, level, elite) {
    const F = BB.FOES[kind];
    const g = 1 + (level - 1) * 0.2;
    const s = { hp: Math.round(F.hp * g * (F.boss ? 5.6 * (1 + (level - 1) * 0.05) : F.gate ? 1.5 : 2.5)), atk: F.atk * (1 + (level - 1) * 0.16) * (F.boss ? 1.6 : 1.7), def: F.def + (level - 1) * 0.6 };
    if (elite) { s.hp = Math.round(s.hp * elite.hp); s.atk *= elite.atk; }
    return s;
  };

  BB.damage = function (atk, def, mult) {
    return Math.max(1, atk * (mult || 1) * (100 / (100 + def * 6)));
  };

  if (typeof module !== 'undefined') module.exports = BB;
})(typeof window !== 'undefined' ? window : globalThis);
