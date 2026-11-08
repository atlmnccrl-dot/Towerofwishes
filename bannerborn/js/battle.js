// Bannerborn — the battlefield: entities, AI, skills, bosses, objectives, rendering.
(function () {
  const BB = window.BB;
  const TAU = Math.PI * 2;
  const hyp = Math.hypot;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const CLIP_FPS = { Idle: 10, Run: 20, TakeDamage: 22, Die: 14, Taunt: 16, Special1: 18 };

  function Battle(opts) {
    this.opts = opts;
    this.mission = opts.mission || null;
    this.peaceful = !!opts.peaceful;
    this.map = opts.map;
    this.ents = []; this.projs = []; this.fx = []; this.texts = []; this.tele = []; this.clouds = [];
    this.time = 0; this.rally = 0; this.rallyT = 0; this.shake = 0; this.slow = 0; this.hitstop = 0; this.flash = 0;
    this.cam = { x: this.map.heroSpawn.x, y: this.map.heroSpawn.y, zoom: 1 };
    this.result = null; this.kills = 0; this.goldGot = 0; this.waveIdx = 0; this.events = [];
    this.banners = []; this.timers = []; this.r = BB.rng((opts.seed || 1) + 99);
    this.level = opts.level || 1;
    this.save = opts.save;
    this.revives = 0;
    this.waveK = BB.waveScale ? BB.waveScale((opts.heroes || []).length) : 1;
    this.metrics = { taken: 0, dealt: 0, healed: 0, minFrac: 1 };
    const heroes = opts.heroes || [];
    const callings = heroes.map((h) => h.calling);
    const sp = this.map.heroSpawn;
    heroes.forEach((h, i) => {
      const st = BB.heroStats(h, callings, this.save);
      const e = this.spawnHero(h, st, sp.x + [0, -1, 1, 0][i] * 0.9, sp.y + [0, 0.6, 0.6, 1.2][i] * 0.9);
      if (st.revive) this.revives = 1;
    });
    this.controlled = null; // the player commands the warband; nobody is steered by hand
    this.heroList = this.ents.filter((e) => e.side === 'hero');
    this.order = { mode: 'advance', x: sp.x, y: sp.y, focus: null };
    this.autoSkills = !!(this.save && this.save.settings && this.save.settings.autoSkills);
    this.cutins = []; this.combo = 0; this.lastSkill = null; this.zoomK = 1; this.zoomTarget = 1;
    this.warCenter = { x: sp.x, y: sp.y };
    if (!this.peaceful) this.setupObjective();
    if (!this.peaceful && opts.intro) {
      const m = this.map, g = (m.gateSpots && m.gateSpots[0]) || (this.mission.boss ? m.bossSpot : m.foeSpawns[0]);
      this.intro = { t: 0, dur: 2.8, from: { x: g.x, y: g.y } };
      this.cam.x = g.x; this.cam.y = g.y;
    }
  }
  BB.Battle = Battle;

  Battle.prototype.heroesAlive = function () { return this.ents.filter((e) => e.side === 'hero' && !e.dead && !e.ward); };
  Battle.prototype.foesAlive = function () { return this.ents.filter((e) => e.side === 'foe' && !e.dead && !e.prop); };

  Battle.prototype.spawnHero = function (h, st, x, y) {
    const C = BB.CALLINGS[h.calling];
    if (!this.peaceful) { const fs = BB.freeSpot(this.map, x, y, 0.3); x = fs.x; y = fs.y; }
    const e = {
      id: BB.uid('e'), side: 'hero', hero: h, name: h.name, calling: h.calling, x, y, vx: 0, vy: 0, r: 0.3,
      hp: st.hp, maxhp: st.hp, st, atk: st.atk, def: st.def, spd: st.spd, crit: st.crit, aspd: st.aspd, range: st.range,
      ranged: C.ranged, proj: C.proj, layers: BB.heroLayers(h), sc: 1, dir: 7, clip: 'Idle', ct: 0, state: 'idle', lock: 0,
      cd: st.cd * 0.35, cdMax: st.cd, dodgeCd: 0, buffs: {}, flash: 0, combo: 0, color: BB.heroColor(h), z: 0,
    };
    this.ents.push(e); return e;
  };

  Battle.prototype.spawnFoe = function (kind, x, y, opts) {
    opts = opts || {};
    const F = BB.FOES[kind];
    const elite = opts.elite || null;
    const st = BB.foeStats(kind, opts.level || this.level, elite);
    if (F.boss || F.gate) st.hp = Math.round(st.hp * (0.5 + 0.5 * this.waveK));
    { const fs = BB.freeSpot(this.map, x, y, F.gate ? 0.9 : F.r); x = fs.x; y = fs.y; }
    const e = {
      id: BB.uid('f'), side: 'foe', kind, F, name: (elite ? elite.name + ' ' : '') + F.name, x, y, vx: 0, vy: 0, r: F.r * (elite ? 1.1 : 1),
      hp: st.hp, maxhp: st.hp, atk: st.atk, def: st.def, spd: F.spd * (elite && elite.id === 'blood' ? 1.15 : 1), crit: 0.05,
      aspd: F.aspd, range: F.range, ranged: !!F.ranged, proj: F.proj, art: F.art || this.poolArt(F), tint: (elite && elite.tint) || F.tint || null,
      sc: (F.scale || 1) * (elite ? elite.scale : 1), dir: 3, clip: 'Idle', ct: 0, state: 'idle', lock: 0, buffs: {}, flash: 0,
      boss: !!F.boss, elite, cd: 2 + this.r() * 2, moveCd: 3, gate: !!F.gate, turret: !!F.turret, z: 0, spawnT: opts.rise ? 0.6 : 0,
      summonCd: 6 + this.r() * 4,
    };
    if (e.gate) { e.spawnCd = 2.5; e.sc = 1; }
    if (F.pool && e.art) { const rc = BB.ROSTER.find((c) => 'h/' + c.key === e.art); e.elem = rc && rc.elem; }
    if (F.firering) e.ringCd = 4 + this.r() * 3;
    this.ents.push(e);
    if (opts.rise) this.addFx('portalopen', x, y - 0.1, { sc: 0.55, fps: 18, add: true });
    return e;
  };

  // a look for a pooled foe: a loaded roster character of that kind (a different one each spawn)
  Battle.prototype.poolArt = function (F) {
    if (!F.pool) return null;
    if (F.poolPick && BB.A.chars['h/' + F.poolPick]) return 'h/' + F.poolPick;
    const keys = BB.poolKeys(F.pool); const loaded = keys.filter((k) => BB.A.chars[k]);
    return (loaded.length ? this.r.pick(loaded) : keys.length ? keys[0] : null);
  };

  // ---------------------------------------------------------------- objectives
  Battle.prototype.setupObjective = function () {
    const M = this.mission, m = this.map;
    this.obj = { type: M.type, text: '', waves: M.waves.map((w) => w.slice()), nextWaveT: 1.2 };
    const pool = []; M.waves.forEach((w) => { for (let i = 0; i < w.length; i += 2) if (!BB.FOES[w[i]].turret) pool.push(w[i]); });
    this.obj.pool = pool.length ? pool : ['ghoul'];
    if (M.type === 'gates') {
      const spots = (m.gateSpots || m.foeSpawns).slice(0, M.gates || 1);
      this.obj.gates = spots.map((s) => this.spawnFoe('portal', s.x, s.y));
      this.obj.text = 'Destroy the Gravegates';
    } else if (M.type === 'defend') {
      const w = m.wardSpot;
      const hp = 900 + M.level * 260;
      this.ward = { id: 'ward', side: 'hero', ward: true, prop: true, x: w.x, y: w.y, r: 0.7, hp, maxhp: hp, def: 4, buffs: {}, name: { cart: 'Caravan', refugees: 'Refugees', cage: 'Witch\'s Cage' }[M.ward] || 'Ward', dir: 0, sc: 1 };
      this.ents.push(this.ward);
      this.obj.timeLeft = M.time; this.obj.text = 'Protect the ' + this.ward.name;
      this.obj.waveEvery = M.time / M.waves.length;
      this.obj.nextWaveT = 1.5;
    } else if (M.type === 'boss' || M.type === 'duel') {
      this.obj.text = 'Defeat ' + BB.FOES[M.boss].name.split(',')[0];
      this.obj.bossT = M.type === 'duel' ? 1.2 : 2.5;
    } else if (M.type === 'endless') {
      this.obj.text = 'Survive the Endless Gate';
      const spots = (m.gateSpots || m.foeSpawns).slice(0, 2);
      this.obj.gates = spots.map((s) => this.spawnFoe('portal', s.x, s.y));
      for (const g of this.obj.gates) g.budget = 2;
      this.obj.endlessWave = 0;
    } else {
      this.obj.text = 'Rout the Bone Tide';
    }
    this.chests = (m.chests || []).map((c) => ({ x: c.x, y: c.y, gold: c.gold, opened: false }));
    this.loot = []; this.rays = [];
    this.npcs = (m.npcSpots || []).map((s) => ({ x: s.x, y: s.y, art: this.r.pick(BB.npcKeys().filter((k) => BB.A.chars[k])) || null, clip: 'CrouchIdle', dir: this.r.int(8), ct: this.r() * 3 }));
    for (const b of (m.barrels || [])) {
      this.ents.push({ id: BB.uid('b'), side: 'none', barrel: b.kind, prop: true, x: b.x, y: b.y, r: 0.32, hp: 1, maxhp: 1, def: 0, buffs: {}, dir: 0, sc: 1 });
    }
  };

  Battle.prototype.spawnWave = function (w, spots) {
    spots = spots || this.map.foeSpawns;
    let k = 0;
    const eliteN = this.mission && this.mission.elites ? this.mission.elites : 0;
    for (let i = 0; i < w.length; i += 2) {
      for (let n = 0; n < Math.max(1, Math.round(w[i + 1] * this.waveK)); n++) {
        const s = spots[(k++) % spots.length];
        const a = this.r() * TAU, d = this.r() * 1.4;
        let elite = null;
        if (eliteN && this.r() < 0.12 * eliteN && !BB.FOES[w[i]].turret) elite = this.r.pick(BB.ELITES);
        this.spawnFoe(w[i], s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, { rise: true, elite });
      }
    }
    this.waveIdx++;
    BB.sfx && BB.sfx('portal');
  };

  Battle.prototype.updateObjective = function (dt) {
    const o = this.obj; if (!o || this.result) return;
    const foes = this.foesAlive().filter((f) => !f.gate);
    if (o.type === 'rout') {
      o.nextWaveT -= dt;
      if (o.waves.length && (foes.length <= 1 || o.nextWaveT < -25) && o.nextWaveT <= 0) {
        this.spawnWave(o.waves.shift()); o.nextWaveT = 3;
        this.banner('Wave ' + this.waveIdx + ' / ' + this.mission.waves.length, 1.3, 'small');
      }
      if (!o.waves.length && !foes.length) this.win();
      o.text = 'Rout the Bone Tide — wave ' + Math.max(1, this.waveIdx) + ' of ' + this.mission.waves.length;
    } else if (o.type === 'gates' || o.type === 'endless') {
      o.nextWaveT -= dt;
      if (o.waves.length && o.nextWaveT <= 0 && foes.length < 4) {
        this.spawnWave(o.waves.shift(), o.gates.filter((g) => !g.dead).map((g) => ({ x: g.x + 0.9, y: g.y + 0.9 })));
        o.nextWaveT = 10;
      }
      const left = o.gates.filter((g) => !g.dead).length;
      if (o.type === 'gates') {
        o.text = 'Destroy the Gravegates — ' + left + ' left';
        if (!left && !foes.length) this.win();
      } else {
        o.text = 'Endless Gate — wave ' + (o.endlessWave + 1) + ' · gates ' + left;
        if (!left && foes.length < 2) {
          o.endlessWave++; if (o.endlessWave % 2 === 0) this.level++;
          this.banner('Wave ' + (o.endlessWave + 1), 1.5);
          const spots = this.map.gateSpots.slice(0, Math.min(3, 2 + (o.endlessWave >> 2)));
          o.gates = spots.map((s) => this.spawnFoe('portal', s.x + this.r.range(-1, 1), s.y + this.r.range(-1, 1)));
          for (const g of o.gates) g.budget = 2 + (o.endlessWave >> 1);
          for (const h of this.heroesAlive()) this.heal(null, h, h.maxhp * 0.25);
          o.waves = [[this.r.pick(['ghoul', 'warden', 'necro']), 3 + (o.endlessWave >> 1), 'ghoul', 2]];
          if (o.endlessWave % 5 === 4) this.spawnFoe(this.r.pick(['ossric', 'sallow']), this.map.w / 2, this.map.h / 2 - 3, { rise: true, level: this.level });
          o.nextWaveT = 2;
        }
      }
    } else if (o.type === 'defend') {
      o.timeLeft -= dt; o.nextWaveT -= dt;
      if (o.waves.length && o.nextWaveT <= 0) { this.spawnWave(o.waves.shift()); o.nextWaveT = o.waveEvery; }
      o.text = 'Protect the ' + this.ward.name + ' — ' + Math.max(0, Math.ceil(o.timeLeft)) + ' s';
      if (this.ward.dead) this.lose(this.ward.name + ' destroyed');
      else if (o.timeLeft <= 0) { this.crumbleAll(); this.win(); }
    } else if (o.type === 'boss' || o.type === 'duel') {
      if (o.bossT !== undefined) {
        o.bossT -= dt;
        if (o.bossT <= 0) {
          o.bossT = undefined;
          const s = this.map.bossSpot;
          this.boss = this.spawnFoe(this.mission.boss, s.x, s.y, { rise: true });
          this.banner(this.boss.F.name, 2.6, 'boss'); this.camFocus = { x: s.x, y: s.y, t: 2.2 }; this.zoomPulse(1.18, 2.2);
          this.shake = 0.6; BB.sfx && BB.sfx('boss');
          if (this.mission.waves[0]) this.spawnWave(this.mission.waves[0]);
          this.obj.extra = this.mission.waves.slice(1);
        }
      } else if (this.boss) {
        if (this.boss.dead) { this.crumbleAll(); this.win(); }
        else if (this.obj.extra && this.obj.extra.length && this.boss.hp < this.boss.maxhp * 0.6) this.spawnWave(this.obj.extra.shift());
      }
    }
    if (!this.heroesAlive().length) this.lose('The warband has fallen');
  };
  Battle.prototype.crumbleAll = function () {
    for (const f of this.foesAlive()) if (!f.boss) this.kill(f, null, true);
  };
  Battle.prototype.win = function () {
    if (this.result) return;
    this.result = { win: true, t: 0 }; this.slow = 1.4; this.intro = null;
    for (const h of this.heroesAlive()) { h.state = 'victory'; this.setClip(h, 'Taunt', true); }
    this.zoomPulse(1.22, 9); if (this.rays) this.rays.push({ x: this.warCenter.x, y: this.warCenter.y, t: 0, dur: 3, god: true });
    this.camFocus = { x: this.warCenter.x, y: this.warCenter.y, t: 3 };
    this.banner('VICTORY', 3, 'win'); BB.sfx && BB.sfx('victory');
  };
  Battle.prototype.lose = function (why) {
    if (this.result) return;
    this.result = { win: false, why, t: 0 }; this.slow = 1; this.intro = null;
    this.banner('DEFEAT', 3, 'lose'); BB.sfx && BB.sfx('defeat');
  };

  // ---------------------------------------------------------------- helpers
  Battle.prototype.later = function (delay, fn) { this.timers.push({ t: delay, fn }); };
  Battle.prototype.banner = function (text, dur, kind) { this.banners.push({ text, t: 0, dur: dur || 2, kind: kind || '' }); };
  Battle.prototype.addFx = function (key, x, y, o) {
    const f = Object.assign({ key, x, y, t: 0, fps: 20, sc: 1 }, o || {});
    f.n = BB.fxLen(key); this.fx.push(f); return f;
  };
  Battle.prototype.text = function (x, y, txt, col, big) {
    this.texts.push({ x, y, z: 1.2, txt: String(txt), col: col || '#fff', t: 0, big: big || 0, dx: (this.r() - 0.5) * 0.4 });
  };
  Battle.prototype.setClip = function (e, clip, force) {
    if (e.clip === clip && !force) return;
    e.clip = clip; e.ct = 0;
  };
  Battle.prototype.artKey = function (e) { return e.side === 'hero' ? (e.hero.legend ? BB.LEGENDS[e.hero.legend].art : 'body') : e.art; };
  Battle.prototype.clipLen = function (e, clip) { return BB.clipLen(this.artKey(e), clip) || 15; };
  Battle.prototype.face = function (e, tx, ty) { const d = BB.dirFromVec(tx - e.x, ty - e.y); if (d !== null) e.dir = d; };
  Battle.prototype.nearest = function (e, side, maxD, filter) {
    let best = null, bd = maxD || 1e9;
    for (const o of this.ents) {
      if (o.dead || o.side !== side || o === e || o.hidden) continue;
      if (o.barrel) continue;
      if (filter && !filter(o)) continue;
      const d = hyp(o.x - e.x, o.y - e.y) - (o.r || 0);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  };
  Battle.prototype.inRadius = function (x, y, rad, side) {
    return this.ents.filter((o) => !o.dead && (side ? o.side === side : true) && hyp(o.x - x, o.y - y) < rad + (o.r || 0));
  };

  // ---------------------------------------------------------------- damage
  Battle.prototype.hit = function (src, tgt, mult, o) {
    o = o || {};
    if (!tgt || tgt.dead) return 0;
    if (tgt.barrel) { this.explodeBarrel(tgt); return 0; }
    if (tgt.invuln > 0) {
      if (tgt.side === 'hero' && tgt.dodging && !tgt.perfectDone) {
        tgt.perfectDone = true; this.slow = 0.7; this.addRally(12);
        this.text(tgt.x, tgt.y, 'PERFECT', '#9ff', 1); BB.sfx && BB.sfx('perfect');
      }
      return 0;
    }
    let atk = src ? src.atk : (o.atk || 20);
    if (src && src.buffs.rally > 0) atk *= 1.5;
    if (src && src.buffs.combo > 0) atk *= 1.25;
    if (src && src.side === 'hero' && src.st && src.st.lowHpAtk && src.hp < src.maxhp / 2) atk *= 1 + src.st.lowHpAtk;
    let dmg = BB.damage(atk, tgt.def || 0, mult);
    let crit = false;
    if (src && (o.sureCrit || this.r() < (src.crit || 0) + (o.elem === 'arcane' ? 0.1 : 0))) { dmg *= src.st && src.st.rangedCrit ? 1.9 : 1.75; crit = true; }
    if (o.elem === 'shadow') dmg *= 1.2;
    if (tgt.buffs.guard > 0) dmg *= 0.5;
    if (tgt.side === 'hero' && !tgt.ward && this.heroList.length < 3) dmg *= this.heroList.length === 1 ? 0.6 : 0.8; // the banner steels the few
    if (tgt.F && tgt.F.block && src && !o.aoe) {
      const fd = BB.dirFromVec(src.x - tgt.x, src.y - tgt.y);
      if (fd !== null && Math.min((fd - tgt.dir + 8) % 8, (tgt.dir - fd + 8) % 8) <= 1 && tgt.state !== 'attack') { dmg *= 1 - tgt.F.block; this.text(tgt.x, tgt.y, 'block', '#aab'); }
    }
    if (tgt.shield > 0) { const a = Math.min(tgt.shield, dmg); tgt.shield -= a; dmg -= a; }
    dmg = Math.round(dmg);
    tgt.hp -= dmg; tgt.flash = 0.18;
    if (tgt.side === 'hero' && !tgt.ward) { this.metrics.taken += dmg; this.metrics.minFrac = Math.min(this.metrics.minFrac, Math.max(0, tgt.hp / tgt.maxhp)); } else if (tgt.side === 'foe') this.metrics.dealt += dmg;
    if (src && src.side === 'hero') { src.dealt = (src.dealt || 0) + dmg; this.addRally(dmg * 0.045); if (src.st && src.st.leech) src.hp = Math.min(src.maxhp, src.hp + dmg * src.st.leech); }
    if (tgt.side === 'hero' && tgt.st && tgt.st.thorns && src && !src.ranged && !o.aoe) this.hit(null, src, 1, { atk: dmg * tgt.st.thorns * 3, aoe: true });
    if (o.burn) { tgt.buffs.burn = 3; tgt.burnAtk = Math.max(tgt.burnAtk || 0, atk); }
    if (o.elem && src && tgt.side === 'foe') {
      const E = BB.ELEMENTS[o.elem];
      if (E.effect === 'burn') { tgt.buffs.burn = 3; tgt.burnAtk = Math.max(tgt.burnAtk || 0, atk); }
      else if (E.effect === 'slow') tgt.buffs.slow = 2;
      else if (E.effect === 'leech') src.hp = Math.min(src.maxhp, src.hp + dmg * 0.25);
      else if (E.effect === 'heal') { const a = this.lowestAlly(src, 6); if (a) this.heal(src, a, dmg * 0.2); }
      else if (E.effect === 'chain' && !o.chained) { const n = this.nearest(tgt, 'foe', 3); if (n) { this.later(0.1, () => this.hit(src, n, 0.6, { aoe: true, chained: true })); this.addFx('buff3', n.x, n.y, { sc: 0.4, add: true, hue: -110 }); } }
    }
    if (tgt.F && tgt.F.phase && tgt.hp > 0 && this.r() < 0.18 && !tgt.boss) { // wraiths flicker away
      const a = this.r() * TAU; this.addFx('buff9', tgt.x, tgt.y, { sc: 0.5, add: true, hue: 200 });
      tgt.x += Math.cos(a) * 1.6; tgt.y += Math.sin(a) * 1.6; tgt.invuln = 0.4; BB.collide(this.map, tgt);
    }
    if (tgt.F && tgt.F.frenzy && !tgt.frenzied && tgt.hp > 0 && tgt.hp < tgt.maxhp / 2) { tgt.frenzied = true; tgt.aspd *= 1.5; tgt.spd *= 1.2; this.text(tgt.x, tgt.y, 'FRENZY', '#ff7a3a', 1); }
    if (o.slow) tgt.buffs.slow = 2;
    const col = tgt.side === 'hero' ? '#ff6b5e' : crit ? '#ffd23a' : '#fff';
    if (!tgt.ward || dmg > 5) this.text(tgt.x, tgt.y, dmg + (crit ? '!' : ''), col, crit ? 1 : 0);
    if (crit || (o.heavy)) { this.hitstop = Math.max(this.hitstop, 0.05); this.shake = Math.max(this.shake, 0.15); }
    if (tgt.side === 'foe' && !tgt.boss && !tgt.gate && !tgt.turret && tgt.hp > 0 && tgt.state !== 'attack' && this.r() < 0.5) {
      tgt.state = 'hurt'; tgt.lock = 0.25; this.setClip(tgt, 'TakeDamage', true);
      if (src) { const d = hyp(tgt.x - src.x, tgt.y - src.y) || 1; tgt.x += (tgt.x - src.x) / d * 0.12; tgt.y += (tgt.y - src.y) / d * 0.12; }
    }
    BB.sfx && BB.sfx(tgt.side === 'hero' ? 'hurt' : (crit ? 'crit' : 'hit'));
    if (tgt.hp <= 0) this.kill(tgt, src);
    return dmg;
  };
  Battle.prototype.heal = function (src, tgt, amt) {
    if (!tgt || tgt.dead) return;
    const a = Math.round(Math.min(tgt.maxhp - tgt.hp, amt));
    tgt.hp += a; this.metrics.healed += a; if (a > 0) this.text(tgt.x, tgt.y, '+' + a, '#7dff8a');
  };
  Battle.prototype.addRally = function (v) { if (this.rallyT > 0) return; this.rally = clamp(this.rally + v, 0, 100); };
  Battle.prototype.kill = function (e, src, quiet) {
    if (e.dead) return;
    e.dead = true; e.hp = 0; e.deadT = 0; e.state = 'dead';
    if (e.ward) { this.addFx('x_wood', e.x, e.y - 0.2, { sc: 0.8 }); return; }
    if (e.side === 'hero') {
      if (this.revives > 0) {
        this.revives--; e.reviveT = 2.2; this.text(e.x, e.y, 'Blessed!', '#ffe27a', 1);
      }
      this.setClip(e, 'Die', true);
      if (this.order.focus === e) this.order.focus = null;
      BB.sfx && BB.sfx('herodie');
      return;
    }
    if (e.gate) {
      this.addFx('x_stone', e.x, e.y - 0.3, { sc: 1 }); this.addFx('aoe', e.x, e.y, { sc: 0.5, ground: true, hue: 270, add: true });
      this.shake = 0.5; this.text(e.x, e.y, 'GATE SHATTERED', '#d9a6ff', 2); BB.sfx && BB.sfx('gate');
      this.addRally(15); this.goldGot += e.F.gold; if (this.save) this.save.stats.gates++;
      return;
    }
    this.setClip(e, e.turret ? 'Idle' : 'Die', true);
    if (e.turret) this.addFx('x_wood', e.x, e.y - 0.2, { sc: 0.7 });
    if (!quiet) { this.kills++; this.addRally(3); }
    const gold = Math.round(e.F.gold * (e.elite ? (e.elite.gold || 2) : 1));
    if (!quiet) this.goldGot += gold;
    if (src && src.st && src.st.killCd) src.cd = Math.max(0, src.cd - src.st.killCd);
    if (e.boss) { this.slow = 1.6; this.shake = 0.8; this.addFx('bones', e.x, e.y - 0.2, { sc: 1.6 }); }
    else if (!e.turret && this.r() < 0.35) this.addFx('bones', e.x, e.y - 0.1, { sc: 0.7 });
    BB.sfx && BB.sfx(quiet ? 'crumble' : 'kill');
  };
  Battle.prototype.explodeBarrel = function (b) {
    if (b.dead) return;
    b.dead = true;
    this.addFx(b.barrel, b.x, b.y - 0.15, { sc: 1.1, fps: 22 });
    this.shake = 0.35; BB.sfx && BB.sfx('boom');
    if (b.barrel === 'barrel3') {
      this.clouds.push({ x: b.x, y: b.y, rad: 2, t: 0, dur: 5, side: 'foe', dps: 14 + this.level * 4, key: 'gas' });
    } else {
      for (const o of this.inRadius(b.x, b.y, 2, null)) {
        if (o === b || o.barrel || o.ward) { if (o.barrel && o !== b) this.later(0.15, () => this.explodeBarrel(o)); continue; }
        const mult = o.side === 'hero' ? 0.25 : 1;
        this.hit(null, o, mult, { atk: 55 + this.level * 12, aoe: true, burn: true });
      }
    }
  };
  // ---------------------------------------------------------------- commands (the player is the commander)
  Battle.prototype.screenToWorld = function (px, py) {
    const v = this.view; if (!v) return null;
    const sx = (px - v.ox) / v.z, sy = (py - v.oy) / v.z;
    return BB.unIso(sx, sy);
  };
  // a tap on the field: on a foe -> focus fire; on open ground -> plant the banner there
  Battle.prototype.commandAt = function (wx, wy) {
    if (this.result || this.intro) return null;
    let foe = null, bd = 1.1;
    for (const o of this.ents) {
      if (o.dead || o.side !== 'foe' || o.hidden) continue;
      const d = hyp(o.x - wx, o.y - (wy + 0.25 * (o.sc || 1))) - (o.r || 0.3) * (o.boss ? 1.6 : 1);
      if (d < bd) { bd = d; foe = o; }
    }
    if (foe) {
      this.order.focus = foe; this.order.mode = 'advance'; this.map.bannerProp = null;
      this.text(foe.x, foe.y, 'FOCUS', '#ff8a6a', 1); BB.sfx && BB.sfx('click'); this.focused = true;
      return 'focus';
    }
    const p = BB.freeSpot(this.map, wx, wy, 0.4);
    this.order = { mode: 'hold', x: p.x, y: p.y, focus: null };
    this.map.bannerProp = this.save ? { x: p.x, y: p.y, banner: this.save.banner } : null;
    this.addFx('buff1', p.x, p.y, { sc: 0.7, add: true, ground: true }); BB.sfx && BB.sfx('guard'); this.held = true;
    return 'hold';
  };
  Battle.prototype.advance = function () {
    this.order = { mode: 'advance', x: this.warCenter.x, y: this.warCenter.y, focus: null };
    this.map.bannerProp = null; BB.sfx && BB.sfx('click');
  };
  // the player unleashes hero i's skill
  Battle.prototype.castSkill = function (i) {
    const e = this.heroList[i];
    if (!e || e.dead || e.cd > 0 || this.result || this.intro || e.leap || e.dash || e.state === 'skill') return false;
    e.lock = 0; e.state = 'idle'; e.hitDone = true;
    const ok = this.useSkill(e, true);
    if (ok) this.usedSkill = true;
    return ok;
  };

  // ---------------------------------------------------------------- projectiles
  Battle.prototype.shoot = function (src, tx, ty, kind, mult, o) {
    o = o || {};
    const sp = { arrow: 13, bolt: 9, light: 10, curse: 6.5 }[kind] || 9;
    const d = hyp(tx - src.x, ty - src.y) || 1;
    this.projs.push(Object.assign({ x: src.x, y: src.y, z: 0.9 * (src.sc || 1), vx: (tx - src.x) / d * sp, vy: (ty - src.y) / d * sp,
      kind, src, side: src.side, mult: mult || 1, life: 1.4, pierce: (src.st && src.st.pierce) || 0, hitIds: {} }, o));
    BB.sfx && BB.sfx(kind === 'arrow' ? 'bow' : 'cast');
  };
  Battle.prototype.updateProjs = function (dt) {
    for (const p of this.projs) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.fall) { p.z -= p.fall * dt; if (p.z <= 0) { p.life = 0; this.aoeAt(p.src, p.x, p.y, 0.7, p.mult, 'foe'); this.addFx('x_grass', p.x, p.y, { sc: 0.35 }); } continue; }
      const enemy = p.side === 'hero' ? 'foe' : 'hero';
      for (const o of this.ents) {
        if (o.dead || p.hitIds[o.id] || (o.side !== enemy && !o.barrel) || o.hidden) continue;
        if (o.barrel && p.side !== 'hero') continue;
        if (hyp(o.x - p.x, o.y - p.y) < (o.r || 0.3) + 0.25) {
          p.hitIds[o.id] = 1;
          this.hit(p.src, o, p.mult, { burn: p.burn, slow: p.slow, elem: p.elem });
          if (p.kind === 'bolt' || p.kind === 'curse') this.addFx('buff9', p.x, p.y, { sc: 0.4, hue: p.kind === 'curse' ? (p.hue || 0) : 160, add: true, fps: 30 });
          if (p.pierce > 0) p.pierce--; else { p.life = 0; break; }
        }
      }
      if (this.map.at(p.x, p.y) === undefined) p.life = 0;
    }
    this.projs = this.projs.filter((p) => p.life > 0);
  };
  Battle.prototype.aoeAt = function (src, x, y, rad, mult, side, o) {
    let n = 0;
    for (const t of this.inRadius(x, y, rad, null)) {
      if (t.barrel) { this.explodeBarrel(t); continue; }
      if (t.side !== side) continue;
      this.hit(src, t, mult, Object.assign({ aoe: true }, o || {})); n++;
    }
    return n;
  };

  // ---------------------------------------------------------------- hero actions
  Battle.prototype.basicAttack = function (e, tgt) {
    const C = BB.CALLINGS[e.calling];
    const clips = C.basic;
    const clip = clips[e.combo % clips.length]; e.combo++;
    const dur = 0.62 / (e.aspd * (e.buffs.rally > 0 ? 1.25 : 1));
    e.state = 'attack'; e.lock = dur; e.atkDur = dur; e.hitAt = dur * (C.ranged ? 0.55 : 0.48); e.hitDone = false; e.atkTgt = tgt;
    if (tgt) this.face(e, tgt.x, tgt.y);
    this.setClip(e, clip, true);
    if (!C.ranged) BB.sfx && BB.sfx('swing');
  };
  Battle.prototype.resolveBasic = function (e) {
    const C = BB.CALLINGS[e.calling], t = e.atkTgt;
    if (C.ranged) {
      let tx, ty;
      if (t && !t.dead) { tx = t.x; ty = t.y; } else { const v = dirVec(e.dir); tx = e.x + v.x * 5; ty = e.y + v.y * 5; }
      if (e.calling === 'warpriest') {
        this.shoot(e, tx, ty, 'light', 1);
        const ally = this.lowestAlly(e, 4); if (ally && ally.hp < ally.maxhp) this.heal(e, ally, e.atk * 0.45 * (1 + e.st.heal));
      } else {
        const el = C.proj === 'bolt' ? BB.heroElem(e.hero) : null;
        this.shoot(e, tx, ty, C.proj, 1, { burn: e.st.burn > 0, elem: el, hue: el ? BB.ELEMENTS[el].hue : undefined });
      }
      return;
    }
    // melee arc in facing
    const v = dirVec(e.dir); const reach = e.range + 0.35;
    const cx = e.x + v.x * reach * 0.55, cy = e.y + v.y * reach * 0.55;
    let hitAny = false;
    for (const o of this.ents) {
      if (o.dead || (o.side !== 'foe' && !o.barrel)) continue;
      const dx = o.x - e.x, dy = o.y - e.y, d = hyp(dx, dy);
      if (d > reach + (o.r || 0)) continue;
      const dot = (dx * v.x + dy * v.y) / (d || 1);
      if (dot < (C.cleave ? -0.1 : 0.25) && d > 0.5) continue;
      if (C.pierce && Math.abs(dx * v.y - dy * v.x) > 0.55) continue; // spear: a narrow line
      this.hit(e, o, e.combo % 3 === 0 ? 1.25 : 1); hitAny = true;
      if (!C.cleave && !C.pierce && t && o !== t && !o.barrel) break;
    }
    if (hitAny) BB.sfx && BB.sfx('slash');
  };
  Battle.prototype.lowestAlly = function (e, rad) {
    let best = null, bv = 1.01;
    for (const o of this.ents) {
      if (o.dead || o.side !== 'hero' || o.ward) continue;
      if (hyp(o.x - e.x, o.y - e.y) > rad) continue;
      const v = o.hp / o.maxhp; if (v < bv) { bv = v; best = o; }
    }
    return best;
  };
  Battle.prototype.useSkill = function (e, manual) {
    if (e.cd > 0 || e.dead || e.state === 'skill') return false;
    const id = BB.CALLINGS[e.calling].skill.id;
    e.readyT = 0;
    const say = (t, c) => { if (!manual) this.text(e.x, e.y, t, c, 1); };
    if (!this.peaceful) {
      if (manual) { this.cutins.push({ hero: e.hero, name: BB.CALLINGS[e.calling].skill.name, color: e.color, t: 0 }); this.slow = Math.max(this.slow, 0.32); this.zoomPulse(1.07, 0.6); }
      const L = this.lastSkill;
      if (L && L.e !== e && this.time - L.t < 2.6) {
        this.combo++;
        if (this.combo >= 2) {
          this.banner('COMBO ×' + this.combo, 1.1, 'combo');
          for (const h of this.heroesAlive()) { h.buffs.combo = 4; this.addFx('buff3', h.x, h.y, { sc: 0.5, add: true }); }
          this.addRally(6 * this.combo); BB.sfx && BB.sfx('perfect');
        }
      } else this.combo = 1;
      this.lastSkill = { e, t: this.time };
    }
    const foe = this.nearest(e, 'foe', 9);
    e.cd = e.cdMax; e.state = 'skill'; e.skill = id; e.st0 = 0;
    const big = (k, s, o) => this.addFx(k, e.x, e.y, Object.assign({ sc: s, add: true }, o));
    if (id === 'shieldwall') {
      e.lock = 0.7; this.setClip(e, 'Special1', true);
      e.buffs.guard = 4 + e.st.skillDur;
      big('buff2', 0.9, { hue: 170, ground: true }); big('buff10', 0.7, { hue: 170 });
      for (const f of this.inRadius(e.x, e.y, 4.5, 'foe')) if (!f.boss || this.r() < 0.5) { f.taunt = e; f.tauntT = 4; }
      say('SHIELD WALL', '#8cf'); BB.sfx && BB.sfx('guard');
    } else if (id === 'leap') {
      const t = foe || null;
      const tx = t ? t.x : e.x + dirVec(e.dir).x * 3, ty = t ? t.y : e.y + dirVec(e.dir).y * 3;
      e.leap = { sx: e.x, sy: e.y, tx, ty, t: 0, dur: 0.45 }; e.lock = 0.65; e.invuln = 0.45;
      this.face(e, tx, ty); this.setClip(e, 'AttackRun', true); BB.sfx && BB.sfx('leap');
    } else if (id === 'volley') {
      e.lock = 0.6; this.setClip(e, 'Attack3', true);
      const c = this.bestCluster(e, 'foe', 8) || (foe ? { x: foe.x, y: foe.y } : { x: e.x + dirVec(e.dir).x * 4, y: e.y + dirVec(e.dir).y * 4 });
      this.face(e, c.x, c.y);
      const rad = 2 + e.st.skillArea * 2;
      this.tele.push({ kind: 'circle', x: c.x, y: c.y, rad, t: 0, dur: 0.5, col: '120,255,120', friendly: true });
      for (let i = 0; i < 14; i++) {
        const a = this.r() * TAU, d = Math.sqrt(this.r()) * rad;
        this.projs.push({ x: c.x + Math.cos(a) * d - 1.2, y: c.y + Math.sin(a) * d - 1.2, z: 6 + i * 0.45, vx: 2.4, vy: 2.4, fall: 16, kind: 'arrow', src: e, side: 'hero', mult: 0.65, life: 3, hitIds: {} });
      }
      say('ARROW STORM', '#bf8');
    } else if (id === 'flame') {
      e.lock = 0.6; this.setClip(e, 'Attack5', true);
      if (foe) this.face(e, foe.x, foe.y);
      e.flameAt = 0.25;
      BB.sfx && BB.sfx('flame');
    } else if (id === 'whirlwind') {
      e.lock = 0.75; this.setClip(e, 'Special1', true); e.invuln = 0.4; e.atkDur = 0.75;
      this.later(0.35, () => {
        if (e.dead) return;
        const rad = 1.9 + e.st.skillArea * 1.2;
        for (const f of this.inRadius(e.x, e.y, rad, 'foe')) {
          this.hit(e, f, 1.9 * (1 + e.st.skillDmg), { aoe: true, heavy: true });
          const d = hyp(f.x - e.x, f.y - e.y) || 1; if (!f.boss && !f.gate && !f.turret) { f.x += (f.x - e.x) / d * 1.1; f.y += (f.y - e.y) / d * 1.1; BB.collide(this.map, f); }
        }
        this.addFx('aoe', e.x, e.y, { sc: 0.4 + e.st.skillArea * 0.2, ground: true, add: true, hue: 30, fps: 30, alpha: 0.8 });
        this.shake = 0.3; BB.sfx && BB.sfx('slam');
      });
      say('WHIRLWIND', '#ffb46a'); BB.sfx && BB.sfx('leap');
    } else if (id === 'shadowstep') {
      const tgt = this.nearest(e, 'foe', 8, (o) => !o.gate && !o.hidden) || foe;
      if (tgt) {
        const v = dirVec(tgt.dir);
        this.addFx('buff9', e.x, e.y, { sc: 0.6, add: true, hue: 200 });
        e.x = tgt.x - v.x * 0.9; e.y = tgt.y - v.y * 0.9; BB.collide(this.map, e);
        this.addFx('buff9', e.x, e.y, { sc: 0.6, add: true, hue: 200 });
        this.face(e, tgt.x, tgt.y);
        e.invuln = 0.5; e.lock = 0.7; e.atkDur = 0.7; this.setClip(e, 'Attack6', true);
        this.later(0.3, () => { if (!e.dead && !tgt.dead) this.hit(e, tgt, 3.2 * (1 + e.st.skillDmg), { sureCrit: true, heavy: true }); });
        BB.sfx && BB.sfx('blink');
      } else { e.cd = 0.5; e.state = 'idle'; }
    } else if (id === 'impale') {
      const v = foe ? { x: foe.x - e.x, y: foe.y - e.y } : dirVec(e.dir); const d = hyp(v.x, v.y) || 1;
      const len = 5 + e.st.skillArea * 2;
      e.dash = { vx: v.x / d * 15, vy: v.y / d * 15, t: len / 15 }; e.impaleHit = {}; e.impaleMult = 1.8 * (1 + e.st.skillDmg);
      e.invuln = len / 15; e.lock = len / 15 + 0.15; e.atkDur = e.lock;
      this.face(e, e.x + v.x, e.y + v.y); this.setClip(e, 'AttackRun', true);
      const s = BB.iso(v.x, v.y); this.addFx('dash', e.x, e.y, { sc: 0.6, rot: Math.atan2(s.y, s.x) + Math.PI, fps: 40 });
      say('IMPALE', '#7fe8c8'); BB.sfx && BB.sfx('leap');
    } else if (id === 'sanctuary') {
      e.lock = 0.8; this.setClip(e, 'Special1', true);
      big('buff78', 1, { ground: true });
      big('levelup', 1.2, {});
      for (const a of this.inRadius(e.x, e.y, 5, 'hero')) {
        if (a.ward) continue;
        this.heal(e, a, a.maxhp * 0.3 * (1 + e.st.heal + e.st.skillDmg));
        a.buffs.burn = 0; a.buffs.slow = 0;
        if (e.st.shieldHeal) a.shield = (a.shield || 0) + a.maxhp * 0.15;
        this.addFx('buff10', a.x, a.y, { sc: 0.6, add: true });
      }
      say('SANCTUARY', '#ffe57a'); BB.sfx && BB.sfx('heal');
    }
    return true;
  };
  // walking up to a chest opens it: gold, an item, and a beam of light in the item's rarity colour
  const RAY_HUE = [40, 210, 280, 35];
  Battle.prototype.updateChests = function (dt) {
    for (const r of this.rays || []) r.t += dt;
    if (this.rays) this.rays = this.rays.filter((r) => r.t < r.dur);
    for (const n of this.npcs || []) {
      n.ct += dt;
      if (!n.walker) continue;
      if (n.tgt) {
        const dx = n.tgt.x - n.x, dy = n.tgt.y - n.y, d = hyp(dx, dy);
        if (d < 0.1) { n.tgt = null; n.wait = 2 + this.r() * 5; n.clip = this.r() < 0.3 ? 'Taunt' : 'Idle'; n.ct = 0; }
        else { n.x += dx / d * 0.8 * dt; n.y += dy / d * 0.8 * dt; const dd = BB.dirFromVec(dx, dy); if (dd !== null) n.dir = dd; n.clip = 'Walk'; }
      } else if ((n.wait -= dt) <= 0) {
        const a = this.r() * TAU, rr = 1 + this.r() * 3; n.tgt = { x: n.home.x + Math.cos(a) * rr, y: n.home.y + Math.sin(a) * rr };
      } else if (n.clip === 'Taunt' && n.ct > 1.2) n.clip = 'Idle';
    }
    if (!this.chests || this.result) return;
    for (const c of this.chests) {
      if (c.opened) continue;
      const h = this.ents.find((e) => e.side === 'hero' && !e.dead && !e.ward && hyp(e.x - c.x, e.y - c.y) < 0.95);
      if (!h) continue;
      c.opened = true;
      const team = this.ents.filter((e) => e.side === 'hero' && !e.ward).map((e) => e.hero);
      const save = this.save || BB.newSave();
      const it = BB.rollLoot(this.r, { level: this.level, type: c.gold ? 'boss' : 'rout' }, team, save, 1)[0];
      if (c.gold && it.rarity < 1) it.rarity = 1;
      this.loot.push(it);
      const g = Math.round((c.gold ? 30 : 12) + this.level * (c.gold ? 6 : 3));
      this.goldGot += g;
      this.rays.push({ x: c.x, y: c.y, t: 0, dur: 2.6, hue: RAY_HUE[it.rarity] });
      this.text(c.x, c.y, '+' + g + ' gold', '#ffd23a', 1);
      this.later(0.4, () => this.text(c.x, c.y, it.name, BB.RARITY[it.rarity].color, 2));
      BB.sfx && BB.sfx('coin'); BB.sfx && BB.sfx('levelup');
    }
  };
  Battle.prototype.fireRing = function (src, x, y, rad, delay) {
    const self = this;
    this.tele.push({ kind: 'circle', x, y, rad, t: 0, dur: delay, col: '255,120,40', onEnd() {
      self.fx.push({ key: '_ring', x, y, t: 0, fps: 1, n: 0.8, rad, ring: true });
      for (const o of self.inRadius(x, y, rad, 'hero')) if (!o.ward) self.hit(src, o, 1.3, { aoe: true, burn: true });
      if (self.ward && !self.ward.dead && hyp(self.ward.x - x, self.ward.y - y) < rad + 0.7) self.hit(src, self.ward, 1.3, { aoe: true });
      BB.sfx && BB.sfx('flame');
    } });
  };
  Battle.prototype.bestCluster = function (e, side, maxD) {
    let best = null, bn = 0;
    const foes = this.ents.filter((o) => !o.dead && o.side === side && hyp(o.x - e.x, o.y - e.y) < maxD);
    for (const f of foes) {
      const n = foes.filter((g) => hyp(g.x - f.x, g.y - f.y) < 2).length;
      if (n > bn) { bn = n; best = { x: f.x, y: f.y }; }
    }
    return best;
  };
  Battle.prototype.dodge = function (e, mx, my) {
    if (e.dodgeCd > 0 || e.dead || e.lock > 0.2) return;
    let v = { x: mx, y: my };
    if (hyp(mx, my) < 0.2) v = dirVec(e.dir);
    const d = hyp(v.x, v.y) || 1;
    e.dash = { vx: v.x / d * 11, vy: v.y / d * 11, t: 0.22 };
    e.invuln = 0.32; e.dodging = true; e.perfectDone = false; e.dodgeCd = e.calling === 'monk' ? 0.8 : 1.1; e.state = 'run'; e.lock = 0.22;
    if (BB.hasClip(this.artKey(e), 'Rolling')) { this.setClip(e, 'Rolling', true); e.state = 'roll'; e.atkDur = 0.34; e.lock = 0.3; }
    this.face(e, e.x + v.x, e.y + v.y);
    const s = BB.iso(v.x, v.y);
    this.addFx('dash', e.x, e.y, { sc: 0.45, rot: Math.atan2(s.y, s.x) + Math.PI, alpha: 0.8, fps: 40 });
    BB.sfx && BB.sfx('dodge');
  };
  Battle.prototype.useRally = function () {
    if (this.rally < 100 || this.rallyT > 0 || this.result) return false;
    this.rally = 0; this.rallyT = 8; this.slow = 0.9; this.flash = 0.6; this.shake = 0.5;
    this.banner('FOR THE BANNER!', 2.2, 'rally');
    for (const h of this.heroesAlive()) {
      h.buffs.rally = 8; h.cd = 0; h.state = 'rally'; h.lock = 0.7; h.invuln = 0.8; this.setClip(h, 'Taunt', true);
      this.addFx('buff4', h.x, h.y, { sc: 0.55, add: true, alpha: 0.85 });
      this.addFx('levelup', h.x, h.y, { sc: 0.8, add: true });
    }
    const alive = this.heroesAlive(); const c = alive.length ? { x: this.warCenter.x, y: this.warCenter.y, atk: alive.reduce((a, h) => a + h.atk, 0) / alive.length, side: 'hero', buffs: {}, crit: 0.1 } : null;
    this.rays.push({ x: this.warCenter.x, y: this.warCenter.y, t: 0, dur: 2.4, god: true });
    this.zoomPulse(1.14, 1.3);
    if (c) {
      this.addFx('aoe', c.x, c.y, { sc: 0.7, ground: true, add: true, hue: 30, fps: 24, alpha: 0.8 });
      for (const f of this.inRadius(c.x, c.y, 4, 'foe')) {
        this.hit(c, f, 1.2, { aoe: true });
        const d = hyp(f.x - c.x, f.y - c.y) || 1; if (!f.boss && !f.gate && !f.turret) { f.x += (f.x - c.x) / d * 1.2; f.y += (f.y - c.y) / d * 1.2; }
      }
    }
    BB.sfx && BB.sfx('rally');
    return true;
  };

  function dirVec(d) { // screen facing row -> world unit vector
    const a = d * Math.PI / 4; const sx = Math.cos(a), sy = Math.sin(a);
    // invert iso: x - y = sx, (x + y)/2 = sy  =>  x = sy + sx/2, y = sy - sx/2
    const x = sy + sx / 2, y = sy - sx / 2, l = hyp(x, y) || 1;
    return { x: x / l, y: y / l };
  }
  BB.dirVec = dirVec;

  // ---------------------------------------------------------------- update
  Battle.prototype.zoomPulse = function (k, dur) { this.zoomTarget = k; this.zoomT = dur; };
  Battle.prototype.update = function (dtReal, input) {
    // zoom eases toward a target that relaxes back to 1
    if (this.zoomT > 0) { this.zoomT -= dtReal; if (this.zoomT <= 0) this.zoomTarget = this.result && this.result.win ? 1.22 : 1; }
    this.zoomK += (this.zoomTarget - this.zoomK) * Math.min(1, dtReal * 3);
    for (const c of this.cutins) c.t += dtReal;
    if (this.intro) {
      const I = this.intro; I.t += dtReal;
      const k = Math.min(1, Math.max(0, (I.t - 0.6) / (I.dur - 0.9))); const ease = k * k * (3 - 2 * k);
      const c = this.centroid();
      this.cam.x = I.from.x + (c.x - I.from.x) * ease; this.cam.y = I.from.y + (c.y - I.from.y) * ease;
      for (const a of this.map.anims) a.t += dtReal;
      for (const e of this.ents) { if (!e.dead && !e.prop) { e.ct += dtReal; } }
      if (I.t >= I.dur) { this.intro = null; this.banner('FOR THE BANNER — ADVANCE!', 1.4, 'small'); }
      return;
    }
    if (this.hitstop > 0) { this.hitstop -= dtReal; dtReal *= 0.05; }
    let ts = 1;
    if (this.slow > 0) { this.slow -= dtReal; ts = 0.35; }
    if (this.paused) return;
    const dt = Math.min(0.05, dtReal) * ts;
    this.time += dt; this.dt = dt;
    if (this.result) this.result.t += dtReal;
    if (this.rallyT > 0) this.rallyT -= dt;
    this.shake = Math.max(0, this.shake - dtReal * 1.5); this.flash = Math.max(0, this.flash - dtReal * 1.5);
    for (const tm of this.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
    this.timers = this.timers.filter((tm) => !tm.done);
    if (!this.peaceful) this.updateObjective(dt);
    if (!this.peaceful) {
      this.warCenter = this.centroid();
      // the warband's next objective when advancing: the foe nearest to it
      let best = null, bs = 1e9; const wc = this.warCenter;
      const crowd = this.inRadius(wc.x, wc.y, 4.5, 'foe').filter((o) => !o.gate).length;
      for (const o of this.ents) {
        if (o.dead || o.side !== 'foe' || o.hidden) continue;
        const sc = hyp(o.x - wc.x, o.y - wc.y) - (o.gate && crowd < 3 ? 4 : 0);
        if (sc < bs) { bs = sc; best = o; }
      }
      this.advTarget = best;
      if (this.order.focus && (this.order.focus.dead || this.order.focus.hidden)) this.order.focus = null;
    }
    for (const e of this.ents) this.updateEnt(e, dt, input);
    // separation
    const movers = this.ents.filter((e) => !e.dead && !e.prop && !e.gate && !e.turret && !e.leap);
    for (let i = 0; i < movers.length; i++) for (let j = i + 1; j < movers.length; j++) {
      const a = movers[i], b = movers[j];
      const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy), min = (a.r + b.r) * 0.9;
      if (d < min && d > 1e-4) {
        const push = (min - d) / 2, ux = dx / d, uy = dy / d;
        const wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
        a.x -= ux * push * wa; a.y -= uy * push * wa; b.x += ux * push * wb; b.y += uy * push * wb;
      }
    }
    for (const e of movers) BB.collide(this.map, e);
    this.updateProjs(dt);
    if (this.ents.length > 60) this.ents = this.ents.filter((e) => !(e.dead && e.side === 'foe' && e.deadT > 3));
    for (const c of this.clouds) {
      c.t += dt;
      if (Math.floor(c.t * 2) !== Math.floor((c.t - dt) * 2))
        for (const o of this.inRadius(c.x, c.y, c.rad, c.side)) if (!o.gate && !o.ward) this.hit(null, o, 1, { atk: c.dps * 0.5 * 3, aoe: true });
    }
    this.clouds = this.clouds.filter((c) => c.t < c.dur);
    for (const t of this.tele) { t.t += dt; if (t.t >= t.dur && t.onEnd && !t.fired) { t.fired = true; t.onEnd(); } }
    this.tele = this.tele.filter((t) => t.t < t.dur + 0.15);
    for (const f of this.fx) f.t += dt;
    this.updateChests(dt);
    this.fx = this.fx.filter((f) => f.loop || f.t * f.fps < f.n);
    for (const t of this.texts) { t.t += dtReal; t.z += dtReal * (t.big ? 0.9 : 1.4); }
    this.texts = this.texts.filter((t) => t.t < (t.big ? 1.3 : 0.9));
    for (const b of this.banners) b.t += dtReal;
    this.banners = this.banners.filter((b) => b.t < b.dur);
    for (const a of this.map.anims) a.t += dt;
    // camera
    let c = this.peaceful ? null : this.warCenter;
    if (c && this.order.focus) c = { x: c.x * 0.7 + this.order.focus.x * 0.3, y: c.y * 0.7 + this.order.focus.y * 0.3 };
    else if (c && this.advTarget && hyp(this.advTarget.x - c.x, this.advTarget.y - c.y) < 7) c = { x: c.x * 0.8 + this.advTarget.x * 0.2, y: c.y * 0.8 + this.advTarget.y * 0.2 };
    if (this.camFocus && this.camFocus.t > 0) { this.camFocus.t -= dtReal; c = this.camFocus; }
    if (c) {
      const k = 1 - Math.pow(this.camFocus && this.camFocus.t > 0 ? 0.08 : 0.0015, dtReal);
      this.cam.x += (c.x - this.cam.x) * k; this.cam.y += (c.y - this.cam.y) * k;
    }
  };

  Battle.prototype.centroid = function () {
    const hs = this.heroesAlive(); if (!hs.length) return this.warCenter || { x: this.map.heroSpawn.x, y: this.map.heroSpawn.y };
    let x = 0, y = 0; for (const h of hs) { x += h.x; y += h.y; } return { x: x / hs.length, y: y / hs.length };
  };
  Battle.prototype.updateEnt = function (e, dt, input) {
    if (e.prop && !e.ward) return;
    e.flash = Math.max(0, (e.flash || 0) - dt);
    for (const k in e.buffs) if (e.buffs[k] > 0) e.buffs[k] -= dt;
    if (e.invuln > 0) { e.invuln -= dt; if (e.invuln <= 0) e.dodging = false; }
    if (e.ward) return;
    if (e.dead) {
      e.deadT += dt; e.ct += dt;
      if (e.reviveT !== undefined) {
        e.reviveT -= dt;
        if (e.reviveT <= 0) {
          e.reviveT = undefined; e.dead = false; e.hp = Math.round(e.maxhp * 0.5); e.state = 'idle'; e.lock = 0.5; e.invuln = 1.5;
          this.setClip(e, 'Special1', true); this.addFx('levelup', e.x, e.y, { sc: 1.2, add: true }); BB.sfx && BB.sfx('heal');
        }
      }
      return;
    }
    if (e.spawnT > 0) { e.spawnT -= dt; e.ct += dt; return; }
    if (e.buffs.burn > 0 && Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) {
      const b = Math.max(1, Math.round((e.burnAtk || 20) * 0.22 * (100 / (100 + (e.def || 0) * 3)))); e.hp -= b; this.text(e.x, e.y, b, '#ff9a3a');
      if (e.hp <= 0) this.kill(e, null);
    }
    if (e.dodgeCd > 0) e.dodgeCd -= dt;
    if (e.side === 'hero' && e.cd <= 0) e.readyT = (e.readyT || 0) + dt;
    if (e.cd > 0) e.cd -= dt * (e.buffs.rally > 0 ? 2 : 1);
    e.ct += dt;
    if (e.lock > 0) e.lock -= dt;
    // dash / leap motion
    if (e.dash) {
      e.x += e.dash.vx * dt; e.y += e.dash.vy * dt; e.dash.t -= dt;
      if (e.impaleHit) for (const o of this.inRadius(e.x, e.y, e.r + 0.6, 'foe')) if (!e.impaleHit[o.id]) { e.impaleHit[o.id] = 1; this.hit(e, o, e.impaleMult, { heavy: true, aoe: true }); }
      if (e.chargeHit) for (const o of this.inRadius(e.x, e.y, e.r + 0.45, 'hero')) if (!e.chargeHit[o.id] && !o.ward) { e.chargeHit[o.id] = 1; this.hit(e, o, 1.6, { heavy: true }); }
      if (e.dash.t <= 0) { e.dash = null; e.chargeHit = null; e.impaleHit = null; }
    }
    if (e.leap) {
      const L = e.leap; L.t += dt; const k = Math.min(1, L.t / L.dur);
      e.x = L.sx + (L.tx - L.sx) * k; e.y = L.sy + (L.ty - L.sy) * k; e.z = Math.sin(k * Math.PI) * 1.6;
      if (k >= 1) {
        e.leap = null; e.z = 0;
        this.aoeAt(e, e.x, e.y, 1.9, 2.1, 'foe', { heavy: true });
        this.addFx('x_stone', e.x, e.y - 0.1, { sc: 0.8 }); this.addFx('aoe', e.x, e.y, { sc: 0.45, ground: true, add: true, hue: -40, fps: 30 });
        this.shake = 0.4; BB.sfx && BB.sfx('slam');
      }
      return;
    }
    if (e.flameAt !== undefined) {
      e.flameAt -= dt;
      if (e.flameAt <= 0) {
        e.flameAt = undefined;
        const v = dirVec(e.dir), s = BB.iso(v.x, v.y);
        this.addFx('cone', e.x + v.x * 1.6, e.y + v.y * 1.6, { sc: 0.9, rot: Math.atan2(s.y, s.x) + Math.PI, add: true, fps: 24, hue: -30, sat: 1.2 });
        for (const o of this.ents) {
          if (o.dead || (o.side !== 'foe' && !o.barrel)) continue;
          const dx = o.x - e.x, dy = o.y - e.y, d = hyp(dx, dy);
          if (d > 3.8) continue;
          if ((dx * v.x + dy * v.y) / (d || 1) < 0.55) continue;
          this.hit(e, o, 1.9 * (1 + e.st.skillDmg), { aoe: true, burn: true });
        }
      }
    }
    // attack resolution
    if (e.state === 'attack' && !e.hitDone && e.atkDur - e.lock >= e.hitAt) {
      e.hitDone = true;
      if (e.side === 'hero') this.resolveBasic(e); else this.resolveFoeAttack(e);
    }
    if (e.lock > 0) return;
    if (e.state === 'victory') return;
    if (e.state !== 'idle' && e.state !== 'run') e.state = 'idle';
    if (this.peaceful) { this.peacefulAI(e, dt); return; }
    if (this.result) { this.setClip(e, 'Idle'); return; }
    if (e.side === 'hero') {
      this.heroAI(e, dt);
    } else this.foeAI(e, dt);
  };

  Battle.prototype.moveToward = function (e, tx, ty, dt, speedMul, direct) {
    if (!this.peaceful) { tx = clamp(tx, 2.7, this.map.w - 2.7); ty = clamp(ty, 2.7, this.map.h - 2.7); }
    // route around water and props when the straight line is blocked
    if (e.forcePath > 0) e.forcePath -= dt;
    if (!direct && !this.peaceful && this.map.block && hyp(tx - e.x, ty - e.y) > 1.2 && (e.forcePath > 0 || !BB.lineClear(this.map, e.x, e.y, tx, ty))) {
      const P = e.path;
      if (!P || P.t <= 0 || hyp(P.tx - tx, P.ty - ty) > 1.5 || !P.pts.length) {
        const pts = BB.findPath(this.map, e.x, e.y, tx, ty);
        e.path = { pts: pts || [], t: 1 + this.r() * 0.5, tx, ty };
      } else e.path.t -= dt;
      const pts = e.path.pts;
      while (pts.length > 1 && hyp(pts[0].x - e.x, pts[0].y - e.y) < 0.35) pts.shift();
      if (pts.length) { tx = pts[0].x; ty = pts[0].y; }
    } else if (e.path) e.path = null;
    const dx = tx - e.x, dy = ty - e.y, d = hyp(dx, dy);
    if (d < 0.05) { this.setClip(e, 'Idle'); e.state = 'idle'; return true; }
    const sp = e.spd * (speedMul || 1) * (e.buffs.slow > 0 ? 0.55 : 1);
    const step = Math.min(d, sp * dt);
    // stuck on a prop? slide sideways for a moment
    if (e.lastPos) {
      const moved = hyp(e.x - e.lastPos.x, e.y - e.lastPos.y);
      if (moved < step * 0.35) e.stuckT = (e.stuckT || 0) + dt; else e.stuckT = Math.max(0, (e.stuckT || 0) - dt);
      if (e.stuckT > 0.45 && !(e.sideT > 0)) { e.sideT = 0.6 + this.r() * 0.4; e.sideDir = this.r() < 0.5 ? 1 : -1; e.stuckT = 0; e.stuckN = (e.stuckN || 0) + 1; if (e.stuckN > 1) { e.forcePath = 3; e.path = null; e.stuckN = 0; } }
    }
    let ux = dx / d, uy = dy / d;
    if (e.sideT > 0) { e.sideT -= dt; const a = 1.2 * e.sideDir, c = Math.cos(a), s2 = Math.sin(a); const nx = ux * c - uy * s2; uy = ux * s2 + uy * c; ux = nx; }
    e.px = e.x; e.py = e.y;
    e.x += ux * step; e.y += uy * step; e.vx = ux * sp; e.vy = uy * sp;
    e.lastPos = { x: e.x, y: e.y };
    this.face(e, tx, ty); this.setClip(e, 'Run'); e.state = 'run';
    return false;
  };

  Battle.prototype.nearestBarrel = function (e, rad) {
    return this.ents.find((o) => o.barrel && !o.dead && hyp(o.x - e.x, o.y - e.y) < rad + 0.3) || null;
  };

  const FORM = [[0, 0], [-1.2, 0.9], [1.0, 1.1], [0.1, 1.9]];
  // is (x, y) inside a hostile telegraph that is about to land? returns a point to step out to
  Battle.prototype.dangerAt = function (x, y) {
    for (const t of this.tele) {
      if (t.friendly || t.t > t.dur - 0.05) continue;
      if (t.kind === 'circle') {
        const d = hyp(x - t.x, y - t.y);
        if (d < t.rad + 0.35) { const ux = (x - t.x) / (d || 1), uy = (y - t.y) / (d || 1); return { x: t.x + ux * (t.rad + 0.9), y: t.y + uy * (t.rad + 0.9), left: t.dur - t.t }; }
      } else if (t.kind === 'line') {
        const lx = t.x2 - t.x, ly = t.y2 - t.y, L = hyp(lx, ly) || 1, ux = lx / L, uy = ly / L;
        const px = x - t.x, py = y - t.y, along = px * ux + py * uy, side = px * -uy + py * ux;
        if (along > -0.5 && along < L + 0.5 && Math.abs(side) < t.w * 0.6 + 0.3) { const sg = side >= 0 ? 1 : -1; return { x: x - uy * sg * 1.6, y: y + ux * sg * 1.6, left: t.dur - t.t }; }
      } else if (t.kind === 'cone') {
        const px = x - t.x, py = y - t.y, d = hyp(px, py);
        if (d < t.len + 0.3 && (px * t.vx + py * t.vy) / (d || 1) > Math.cos(t.spread) - 0.08) { const sg = (px * -t.vy + py * t.vx) >= 0 ? 1 : -1; return { x: x - t.vy * sg * 2.2, y: y + t.vx * sg * 2.2, left: t.dur - t.t }; }
      }
    }
    return null;
  };
  // when a hero would use its skill on its own: right away with "auto skills", otherwise after the
  // player has left it unused for a few seconds
  Battle.prototype.wantSkill = function (e, t) {
    if (e.cd > 0) return false;
    if (!this.autoSkills && (e.readyT || 0) < 4) return false;
    if (e.calling === 'warpriest') return this.ents.some((o) => o.side === 'hero' && !o.dead && !o.ward && o.hp < o.maxhp * 0.65 && hyp(o.x - e.x, o.y - e.y) < 5);
    if (!t) return false;
    const near = this.inRadius(e.x, e.y, 4, 'foe').length, d = hyp(t.x - e.x, t.y - e.y);
    switch (e.calling) {
      case 'vanguard': return near >= 2;
      case 'berserker': return d < 6;
      case 'ranger': return d < 8;
      case 'arcanist': return d < 3.5;
      case 'monk': return this.inRadius(e.x, e.y, 2, 'foe').length >= 2 || d < 1.5;
      case 'shadowblade': return d < 7;
      case 'lancer': return d < 5 && d > 1.5;
    }
    return d < 4;
  };
  Battle.prototype.heroAI = function (e, dt) {
    const C = BB.CALLINGS[e.calling], O = this.order;
    // 1. get out of anything that is about to land (a roll if it is close)
    const danger = this.dangerAt(e.x, e.y);
    if (danger) {
      if (danger.left < 0.45 && e.dodgeCd <= 0) { this.dodge(e, danger.x - e.x, danger.y - e.y); return; }
      this.moveToward(e, danger.x, danger.y, dt, 1.15, true); return;
    }
    // 2. pick a target: the commander's focus, else the nearest foe near the banner (holding) or the warband
    const anchor = O.mode === 'hold' ? O : this.warCenter;
    let t = O.focus && !O.focus.dead && !O.focus.hidden ? O.focus : null;
    if (!t) t = this.nearest(e, 'foe', 9, (o) => hyp(o.x - anchor.x, o.y - anchor.y) < (O.mode === 'hold' ? 5.5 : 8) && !o.hidden);
    if (this.ward && !this.ward.dead && !O.focus) {
      const near = this.nearest(this.ward, 'foe', 5); if (near && (e.calling === 'vanguard' || e.calling === 'lancer' || this.r() < 0.02)) t = near;
    }
    // 3. skills
    if (this.wantSkill(e, t)) { this.useSkill(e, false); return; }
    // 4. no target: hold the banner, or march with the warband on the next foe
    const idx = this.heroList.indexOf(e), f = FORM[idx % 4];
    if (!t) {
      if (O.mode === 'hold') {
        const tx = O.x + f[0] * 0.9, ty = O.y + f[1] * 0.9;
        if (hyp(tx - e.x, ty - e.y) > 0.5) this.moveToward(e, tx, ty, dt, hyp(tx - e.x, ty - e.y) > 3 ? 1.2 : 1);
        else { e.state = 'idle'; this.setClip(e, 'Idle'); }
        return;
      }
      const far = this.advTarget;
      if (far) {
        // stay together: the ones far ahead slow down, the ones behind hurry
        const ahead = hyp(far.x - e.x, far.y - e.y) - hyp(far.x - this.warCenter.x, far.y - this.warCenter.y);
        const k = ahead < -1.5 ? 0.75 : ahead > 1.5 ? 1.2 : 1;
        if (hyp(far.x - e.x, far.y - e.y) - (far.r || 0) > e.range) this.moveToward(e, far.x + f[0] * 0.5, far.y + f[1] * 0.5, dt, k); else this.basicAttack(e, far);
        return;
      }
      e.state = 'idle'; this.setClip(e, 'Idle'); return;
    }
    const d = hyp(t.x - e.x, t.y - e.y) - (t.r || 0);
    if (C.ranged && d < 1.8 && e.calling !== 'warpriest') { // kite
      const ux = (e.x - t.x) / (d || 1), uy = (e.y - t.y) / (d || 1);
      this.moveToward(e, e.x + ux, e.y + uy, dt, 0.9); return;
    }
    if (d > e.range) { this.moveToward(e, t.x, t.y, dt); return; }
    this.basicAttack(e, t);
  };

  // ---------------------------------------------------------------- foes
  Battle.prototype.foeTarget = function (e) {
    if (e.taunt && e.tauntT > 0 && !e.taunt.dead) { e.tauntT -= this.dt; return e.taunt; }
    if (this.ward && !this.ward.dead && (e.wardFocus === undefined ? (e.wardFocus = this.r() < 0.45) : e.wardFocus)) return this.ward;
    return this.nearest(e, 'hero', 30, (o) => !o.ward);
  };
  Battle.prototype.foeAI = function (e, dt) {
    if (e.gate) {
      e.spawnCd -= dt;
      const foes = this.foesAlive().length;
      if (e.spawnCd <= 0 && foes < 9 && (e.budget === undefined || e.budget > 0)) {
        e.spawnCd = (8.5 + this.r() * 2.5) / Math.sqrt(this.waveK);
        if (e.budget !== undefined) e.budget--;
        const k = this.r.pick(this.obj.pool);
        this.spawnFoe(k, e.x + this.r.range(0.6, 1.2), e.y + this.r.range(0.6, 1.2), { rise: true });
      }
      return;
    }
    const t = this.foeTarget(e);
    if (!t) { e.state = 'idle'; this.setClip(e, 'Idle'); return; }
    if (e.boss) { this.bossAI(e, t, dt); return; }
    const d = hyp(t.x - e.x, t.y - e.y) - (t.r || 0);
    e.cd -= dt;
    if (e.F.summons) {
      e.summonCd -= dt;
      if (e.summonCd <= 0 && this.foesAlive().length < 14) {
        e.summonCd = 11 + this.r() * 5; e.state = 'attack'; e.lock = 0.8; e.atkDur = 0.8; e.hitAt = 0.5; e.hitDone = true;
        this.setClip(e, 'Special1', true);
        for (let i = 0; i < 2; i++) this.spawnFoe('ghoul', e.x + this.r.range(-1.2, 1.2), e.y + this.r.range(-1.2, 1.2), { rise: true });
        return;
      }
    }
    if (e.F.firering) {
      e.ringCd -= dt;
      if (e.ringCd <= 0 && d < 7) { e.ringCd = 6.5 + this.r() * 2; this.fireRing(e, t.x, t.y, 1.7, 1.2); e.state = 'attack'; e.lock = 0.7; e.atkDur = 0.7; e.hitAt = 99; e.hitDone = true; this.setClip(e, 'Special1', true); return; }
    }
    if (e.turret) {
      if (d < e.range && e.cd <= 0) { e.cd = 1 / e.aspd; this.shoot(e, t.x, t.y, 'bolt', 1, { hue: 0 }); }
      return;
    }
    if (e.ranged && d < 2.2) { const ux = (e.x - t.x) / (d || 1), uy = (e.y - t.y) / (d || 1); this.moveToward(e, e.x + ux, e.y + uy, dt, 0.8); return; }
    if (d > e.range) { this.moveToward(e, t.x, t.y, dt); return; }
    if (e.cd > 0) { this.face(e, t.x, t.y); e.state = 'idle'; this.setClip(e, 'Idle'); return; }
    this.foeAttack(e, t);
  };
  Battle.prototype.foeAttack = function (e, t, clip) {
    const clips = e.F.atkClips || ['Attack1'];
    const dur = 0.75 / e.aspd * (e.boss && e.hp < e.maxhp / 2 ? 0.8 : 1);
    e.state = 'attack'; e.lock = dur; e.atkDur = dur; e.hitAt = dur * 0.55; e.hitDone = false; e.atkTgt = t;
    e.cd = (1 / e.aspd) * (0.9 + this.r() * 0.5);
    this.face(e, t.x, t.y); this.setClip(e, clip || clips[this.r.int(clips.length)], true);
  };
  Battle.prototype.resolveFoeAttack = function (e) {
    const t = e.atkTgt; if (!t) return;
    if (e.ranged) {
      if (e.boss && e.kind === 'vesh') { for (let i = -1; i <= 1; i++) { const a = Math.atan2(t.y - e.y, t.x - e.x) + i * 0.25; this.shoot(e, e.x + Math.cos(a) * 5, e.y + Math.sin(a) * 5, 'curse', 0.8, { hue: 140 }); } return; }
      const eh = e.elem && BB.ELEMENTS[e.elem] ? BB.ELEMENTS[e.elem].hue : (e.kind === 'sallow' ? 160 : 0);
      this.shoot(e, t.x, t.y, e.proj || 'curse', 1, { hue: eh, slow: (e.elite && e.elite.slow) || e.elem === 'frost', burn: e.elem === 'fire' }); return;
    }
    if (hyp(t.x - e.x, t.y - e.y) - (t.r || 0) <= e.range + 0.45) this.hit(e, t, 1, { slow: e.elite && e.elite.slow, heavy: e.boss });
  };

  Battle.prototype.bossAI = function (e, t, dt) {
    e.cd -= dt; e.moveCd -= dt;
    if (!e.enraged && e.hp < e.maxhp * 0.5) {
      e.enraged = true; e.aspd *= 1.3; e.spd *= 1.15; this.banner(e.F.name.split(',')[0] + ' is enraged!', 1.8, 'boss');
      this.addFx('buff9', e.x, e.y, { sc: 1.3, add: true, hue: -60 }); this.shake = 0.5; BB.sfx && BB.sfx('boss');
      if (e.kind === 'vesh') this.bossMove(e, t, 'gates');
    }
    if (e.moveCd <= 0) {
      e.moveCd = (e.enraged ? 4.2 : 5.5) + this.r() * 1.5;
      this.bossMove(e, t, this.r.pick(e.F.moves)); return;
    }
    const d = hyp(t.x - e.x, t.y - e.y) - (t.r || 0);
    if (e.ranged && d < 2.5 && this.r() < 0.02) { this.bossMove(e, t, 'blink'); return; }
    if (d > e.range) { this.moveToward(e, t.x, t.y, dt); return; }
    if (e.cd > 0) { this.face(e, t.x, t.y); e.state = 'idle'; this.setClip(e, 'Idle'); return; }
    this.foeAttack(e, t);
  };
  Battle.prototype.bossMove = function (e, t, mv) {
    const self = this;
    const power = e.atk;
    if (mv === 'slam') {
      const x = t.x, y = t.y, rad = 2.3;
      e.state = 'attack'; e.lock = 1.3; e.atkDur = 1.3; e.hitAt = 99; e.hitDone = true;
      this.face(e, x, y); this.setClip(e, BB.hasClip(e.art, 'Attack4') ? 'Attack4' : 'Attack1', true);
      this.tele.push({ kind: 'circle', x, y, rad, t: 0, dur: 1.1, col: '255,60,40', onEnd() {
        self.aoeAt(e, x, y, rad, 1.7, 'hero', { heavy: true });
        self.addFx('aoe', x, y, { sc: 0.55, ground: true, add: true, hue: -50, fps: 30 }); self.addFx('x_stone', x, y - 0.1, { sc: 0.9 });
        self.shake = 0.6; BB.sfx && BB.sfx('slam');
      } });
    } else if (mv === 'charge') {
      const dx = t.x - e.x, dy = t.y - e.y, d = hyp(dx, dy) || 1, len = Math.min(8, d + 2);
      const tx = e.x + dx / d * len, ty = e.y + dy / d * len;
      e.state = 'attack'; e.lock = 1.6; e.atkDur = 1.6; e.hitAt = 99; e.hitDone = true;
      this.face(e, tx, ty); this.setClip(e, 'Taunt', true);
      this.tele.push({ kind: 'line', x: e.x, y: e.y, x2: tx, y2: ty, w: 1.2, t: 0, dur: 0.9, col: '255,60,40', onEnd() {
        e.dash = { vx: dx / d * 16, vy: dy / d * 16, t: len / 16 }; self.setClip(e, 'Run', true);
        e.chargeHit = {};
        BB.sfx && BB.sfx('leap');
      } });
    } else if (mv === 'summon') {
      e.state = 'attack'; e.lock = 1; e.atkDur = 1; e.hitAt = 99; e.hitDone = true; this.setClip(e, 'Special1', true);
      const n = Math.min(4, 2 + (this.level >> 2));
      for (let i = 0; i < n; i++) { const a = i / n * TAU; this.spawnFoe(this.r() < 0.7 ? 'ghoul' : 'warden', e.x + Math.cos(a) * 2, e.y + Math.sin(a) * 2, { rise: true }); }
      this.text(e.x, e.y, 'RISE!', '#d9a6ff', 1);
    } else if (mv === 'barrage') {
      e.state = 'attack'; e.lock = 1.1; e.atkDur = 1.1; e.hitAt = 99; e.hitDone = true; this.setClip(e, 'Attack1', true);
      const base = Math.atan2(t.y - e.y, t.x - e.x);
      for (let i = 0; i < 7; i++) {
        this.later(i * 0.09, () => { if (e.dead || self.result) return; const a = base + (i - 3) * 0.2; self.shoot(e, e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6, 'curse', 0.75, { hue: e.kind === 'vesh' ? 140 : 160 }); });
      }
    } else if (mv === 'blink') {
      const a = this.r() * TAU, d = 4 + this.r() * 2;
      let nx = clamp(t.x + Math.cos(a) * d, 4, this.map.w - 4), ny = clamp(t.y + Math.sin(a) * d, 4, this.map.h - 4);
      this.addFx('buff9', e.x, e.y, { sc: 1, add: true, hue: 200 });
      e.x = nx; e.y = ny; this.addFx('buff9', e.x, e.y, { sc: 1, add: true, hue: 200 });
      BB.sfx && BB.sfx('blink');
    } else if (mv === 'gas') {
      const x = t.x, y = t.y;
      this.tele.push({ kind: 'circle', x, y, rad: 2.2, t: 0, dur: 0.9, col: '120,255,80', onEnd() {
        self.clouds.push({ x, y, rad: 2.2, t: 0, dur: 5, side: 'hero', dps: power * 0.45, key: 'gas' });
      } });
      e.state = 'attack'; e.lock = 0.8; e.atkDur = 0.8; e.hitAt = 99; e.hitDone = true; this.setClip(e, 'Special1', true);
    } else if (mv === 'deathcone') {
      const v = { x: t.x - e.x, y: t.y - e.y }; const d = hyp(v.x, v.y) || 1; v.x /= d; v.y /= d;
      e.state = 'attack'; e.lock = 1.6; e.atkDur = 1.6; e.hitAt = 99; e.hitDone = true; this.face(e, t.x, t.y); this.setClip(e, 'Special1', true);
      this.tele.push({ kind: 'cone', x: e.x, y: e.y, vx: v.x, vy: v.y, len: 6.5, spread: 0.55, t: 0, dur: 1.2, col: '120,255,140', onEnd() {
        const s = BB.iso(v.x, v.y);
        self.addFx('cone', e.x + v.x * 2.6, e.y + v.y * 2.6, { sc: 1.5, rot: Math.atan2(s.y, s.x) + Math.PI, add: true, hue: 110, fps: 24 });
        for (const o of self.ents) {
          if (o.dead || o.side !== 'hero' || o.ward) continue;
          const dx = o.x - e.x, dy = o.y - e.y, dd = hyp(dx, dy);
          if (dd < 6.5 && (dx * v.x + dy * v.y) / (dd || 1) > 0.82) self.hit(e, o, 2.2, { aoe: true, heavy: true });
        }
        self.shake = 0.5; BB.sfx && BB.sfx('flame');
      } });
    } else if (mv === 'gates') {
      for (let i = 0; i < 2; i++) {
        const a = this.r() * TAU;
        const g = this.spawnFoe('portal', clamp(e.x + Math.cos(a) * 4, 4, this.map.w - 4), clamp(e.y + Math.sin(a) * 4, 4, this.map.h - 4), { level: Math.max(1, this.level - 3) });
        g.maxhp = g.hp = Math.round(g.hp * 0.5);
      }
      if (!this.obj.pool) this.obj.pool = ['ghoul'];
      this.banner('Gravegates open!', 1.6, 'boss');
    } else if (mv === 'firering') {
      this.fireRing(e, t.x, t.y, 2.3, 1.1); this.setClip(e, 'Special1', true); e.state = 'attack'; e.lock = 0.8; e.atkDur = 0.8; e.hitAt = 99; e.hitDone = true;
    } else if (mv === 'summonw') {
      e.state = 'attack'; e.lock = 1; e.atkDur = 1; e.hitAt = 99; e.hitDone = true; this.setClip(e, 'Special1', true);
      for (let i = 0; i < 2; i++) this.spawnFoe(this.r() < 0.5 ? 'wraith' : 'skel', e.x + this.r.range(-2, 2), e.y + this.r.range(-2, 2), { rise: true });
      this.text(e.x, e.y, 'KNEEL!', '#cfe0ff', 1);
    } else if (mv === 'elements') {
      const el = ['fire', 'frost', 'shadow'][(e.elemStep = ((e.elemStep || 0) + 1) % 3)];
      e.state = 'attack'; e.lock = 1.4; e.atkDur = 1.4; e.hitAt = 99; e.hitDone = true; this.setClip(e, 'Special1', true);
      this.banner(BB.ELEMENTS[el].name + ' tide', 1.2, 'boss');
      if (el === 'fire') { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + this.r(); this.fireRing(e, e.x + Math.cos(a) * 3, e.y + Math.sin(a) * 3, 1.6, 1.2); } }
      else if (el === 'frost') {
        this.tele.push({ kind: 'circle', x: e.x, y: e.y, rad: 3.6, t: 0, dur: 1.2, col: '140,210,255', onEnd() {
          for (const o of self.inRadius(e.x, e.y, 3.6, 'hero')) if (!o.ward) { self.hit(e, o, 1.2, { aoe: true }); o.buffs.slow = 3; }
          self.addFx('aoe', e.x, e.y, { sc: 0.85, ground: true, add: true, hue: -70, fps: 26 }); BB.sfx && BB.sfx('slam');
        } });
      } else for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; this.later(0.6 + i * 0.04, () => { if (!e.dead && !self.result) self.shoot(e, e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6, 'curse', 0.7, { hue: 30 }); }); }
    } else if (mv === 'dash') {
      const dx = t.x - e.x, dy = t.y - e.y, d = hyp(dx, dy) || 1;
      e.dash = { vx: dx / d * 14, vy: dy / d * 14, t: Math.max(0.1, (d - 0.8) / 14) };
      this.face(e, t.x, t.y); this.setClip(e, 'AttackRun', true);
      e.state = 'attack'; e.lock = 0.7; e.atkDur = 0.7; e.hitAt = 0.4; e.hitDone = false; e.atkTgt = t;
      const s = BB.iso(dx, dy); this.addFx('dash', e.x, e.y, { sc: 0.5, rot: Math.atan2(s.y, s.x) + Math.PI, fps: 40 });
    } else if (mv === 'vanish') {
      e.hidden = true; this.addFx('buff9', e.x, e.y, { sc: 0.8, add: true, hue: 200 });
      this.later(1.6, () => {
        if (e.dead) return;
        e.hidden = false; const v = dirVec(t.dir); e.x = t.x - v.x * 1; e.y = t.y - v.y * 1;
        self.addFx('buff9', e.x, e.y, { sc: 0.8, add: true, hue: 200 });
        self.foeAttack(e, t, 'Attack4'); self.text(e.x, e.y, 'Behind you.', '#cde', 1);
      });
    }
  };

  // ---------------------------------------------------------------- peaceful (title / camp)
  Battle.prototype.peacefulAI = function (e, dt) {
    if (!e.idleT) e.idleT = 2 + this.r() * 6;
    e.idleT -= dt;
    if (e.wander) {
      if (this.moveToward(e, e.wander.x, e.wander.y, dt, 0.5)) e.wander = null;
      return;
    }
    if (e.idleT <= 0) {
      e.idleT = 3 + this.r() * 6;
      const roll = this.r();
      if (roll < 0.35 && e.home) { e.wander = { x: e.home.x + this.r.range(-1.2, 1.2), y: e.home.y + this.r.range(-1.2, 1.2) }; return; }
      const clip = this.r.pick(['Taunt', 'Special1', 'Attack1', 'Idle']);
      if (clip !== 'Idle' && BB.hasClip(this.artKey(e), clip)) { e.state = 'attack'; e.lock = this.clipLen(e, clip) / 16; e.atkDur = e.lock; e.hitAt = 99; e.hitDone = true; this.setClip(e, clip, true); return; }
    }
    if (e.lookAt) this.face(e, e.lookAt.x, e.lookAt.y);
    e.state = 'idle'; this.setClip(e, 'Idle');
  };

  // ================================================================ render
  Battle.prototype.render = function (ctx, W, H, dpr) {
    const m = this.map, cam = this.cam;
    const z = cam.zoom * dpr;
    let shx = 0, shy = 0;
    if (this.shake > 0 && (!this.save || this.save.settings.shake)) { shx = (Math.random() - 0.5) * this.shake * 14; shy = (Math.random() - 0.5) * this.shake * 10; }
    const cs = BB.iso(cam.x, cam.y);
    const ox = W / 2 - cs.x * z + shx * dpr, oy = H / 2 - cs.y * z + shy * dpr - 20 * z;
    this.view = { ox, oy, z };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = m.biome === 'sand' ? '#6b5434' : '#22301a'; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(z, 0, 0, z, ox, oy);
    // ground
    if (m.groundCanvas) {
      const g = m.groundOrigin;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(m.groundCanvas, g.x, g.y, m.groundCanvas.width / g.scale, m.groundCanvas.height / g.scale);
    }
    const P = (x, y) => BB.iso(x, y);
    // ground fx: anims flagged ground, clouds, telegraphs, shadows
    for (const a of m.anims) if (a.ground) { const s = P(a.x, a.y); BB.drawFx(ctx, a.key, Math.floor(a.t * a.fps) % BB.fxLen(a.key), s.x, s.y, a.sc, { alpha: 0.7, squash: 0.5 }); }
    for (const c of this.clouds) {
      const s = P(c.x, c.y), n = BB.fxLen('gas');
      const al = Math.min(1, c.t * 3, (c.dur - c.t) * 2);
      BB.drawFx(ctx, 'gas', Math.floor(c.t * 12) % n, s.x, s.y, c.rad * 0.55, { alpha: al * 0.8, hue: c.side === 'hero' ? 0 : 0 });
    }
    if (!m.night && !this.peaceful) { // slow cloud shadows
      for (let i = 0; i < 3; i++) {
        const cx = ((this.time * 6 + i * 420) % 1500) - 500 + cs.x - 300, cy = cs.y - 160 + i * 150;
        BB.drawOther(ctx, 'Cloud' + (i + 1), cx, cy, 1.6, { alpha: 0.12, mul: true });
      }
    }
    for (const t of this.tele) this.drawTele(ctx, t);
    for (const f of this.fx) if (f.ground) this.drawFxObj(ctx, f);
    for (const e of this.ents) {
      if (e.dead && e.side !== 'hero' && e.deadT > 2.5) continue;
      if (e.prop && !e.ward && !e.barrel) continue;
      const s = P(e.x, e.y);
      if (e.gate || e.ward) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 11 * (e.sc || 1) * (e.boss ? 1.1 : 1), 5 * (e.sc || 1), 0, 0, TAU); ctx.fill();
      if (this.order && this.order.focus === e && !e.dead) {
        const rr = 16 * (e.sc || 1) * (e.boss ? 1.2 : 1), p = 0.6 + Math.sin(this.time * 7) * 0.3;
        ctx.strokeStyle = 'rgba(255,90,60,' + p + ')'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -this.time * 12;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, rr, rr / 2, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (e.buffs && e.buffs.guard > 0) { ctx.strokeStyle = 'rgba(120,200,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(s.x, s.y, 16, 8, 0, 0, TAU); ctx.stroke(); }
      if (e.buffs && e.buffs.rally > 0) { ctx.strokeStyle = 'rgba(255,210,90,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(s.x, s.y, 13 + Math.sin(this.time * 8) * 2, 6.5, 0, 0, TAU); ctx.stroke(); }
    }
    // depth sorted world
    const list = [];
    // cull to the view (in world pixels) with a margin for tall sprites
    const vx0 = -ox / z - 80, vx1 = (W - ox) / z + 80, vy0 = -oy / z - 20, vy1 = (H - oy) / z + 160;
    for (const p of m.props) if (!p.invisible && p.sx > vx0 && p.sx < vx1 && p.sy > vy0 && p.sy < vy1) list.push({ d: p.depth, p });
    for (const e of this.ents) {
      if (e.prop && !e.barrel) continue;
      if (e.dead && e.side !== 'hero' && e.deadT > 2.5) continue;
      if (e.barrel && e.dead) continue;
      list.push({ d: e.x + e.y + 0.01, e });
    }
    for (const a of m.anims) if (!a.ground) list.push({ d: a.x + a.y + 0.02, a });
    for (const c of this.chests || []) list.push({ d: c.x + c.y, c });
    for (const n of this.npcs || []) if (n.art) list.push({ d: n.x + n.y, n });
    for (const f of this.fx) if (!f.ground) list.push({ d: f.x + f.y + 0.6, f });
    list.sort((a, b) => a.d - b.d);
    const focus = this.ents.filter((e) => e.side === 'hero' && !e.dead && !e.ward);
    for (const it of list) {
      if (it.p) {
        const p = it.p;
        let al;
        if (p.r > 0.25 || /Tree|Wall|Misc B5[56]/.test(p.name)) {
          for (const h of focus) {
            const dd = (p.x + p.y) - (h.x + h.y);
            if (dd > 0 && dd < 3.5 && Math.abs((p.x - p.y) - (h.x - h.y)) < 1.4) { al = 0.45; break; }
          }
        }
        BB.drawEnv(ctx, p.biome, p.name, p.sx, p.sy, p.sc, al);
        if (p.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(p.sx, p.sy - 8, 0, p.sx, p.sy - 8, 18); gr.addColorStop(0, 'rgba(200,120,255,' + (0.35 + Math.sin(this.time * 3 + p.x) * 0.15) + ')'); gr.addColorStop(1, 'rgba(200,120,255,0)'); ctx.fillStyle = gr; ctx.fillRect(p.sx - 20, p.sy - 28, 40, 40); ctx.restore(); }
      } else if (it.e) this.drawEnt(ctx, it.e);
      else if (it.a) { const a = it.a, s = P(a.x, a.y); let yy = s.y; if (a.pole) { const r = BB.envRect('vale', 'Torch2'); yy += r ? r[5] * BB.ENV_DRAW + 3 : -40; } BB.drawFx(ctx, a.key, Math.floor(a.t * a.fps) % BB.fxLen(a.key), s.x, yy, a.sc, { add: a.add }); }
      else if (it.f) this.drawFxObj(ctx, it.f);
      else if (it.c) { const s = P(it.c.x, it.c.y); BB.drawEnv(ctx, 'ground', 'Chest ' + (it.c.gold ? (it.c.opened ? 'B2' : 'B1') : (it.c.opened ? 'A2' : 'A1')) + '_S', s.x, s.y, 1);
        if (!it.c.opened) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(s.x, s.y - 6, 0, s.x, s.y - 6, 16); gr.addColorStop(0, 'rgba(255,220,120,' + (0.25 + Math.sin(this.time * 4) * 0.12) + ')'); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.fillRect(s.x - 18, s.y - 24, 36, 36); ctx.restore(); } }
      else if (it.n) { const s = P(it.n.x, it.n.y); ctx.imageSmoothingEnabled = false; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 9, 4, 0, 0, TAU); ctx.fill();
        BB.drawChar(ctx, it.n.art, null, it.n.clip, it.n.dir, Math.floor(it.n.ct * 8) % (BB.clipLen(it.n.art, it.n.clip) || 15), s.x, s.y, 1); ctx.imageSmoothingEnabled = true; }
    }
    // projectiles
    for (const p of this.projs) this.drawProj(ctx, p);
    for (const r of this.rays || []) {
      const s = P(r.x, r.y), a = Math.min(1, r.t * 4, (r.dur - r.t) * 1.5);
      if (r.god) { for (let i = -2; i <= 2; i++) BB.drawOther(ctx, 'GodRay', s.x + i * 22, s.y - 120, 0.5, { add: true, alpha: a * (0.55 - Math.abs(i) * 0.08), sx: 2.4, rot: i * 0.12 }); continue; }
      BB.drawOther(ctx, 'ItemRay', s.x, s.y - 60, 0.4, { add: true, alpha: a, hue: r.hue, sx: 1.6 + Math.sin(this.time * 6) * 0.2 });
    }
    // lighting
    this.drawLight(ctx, W, H, z, ox, oy);
    ctx.setTransform(z, 0, 0, z, ox, oy);
    // bars and texts
    for (const e of this.ents) this.drawBars(ctx, e);
    for (const t of this.texts) {
      const s = P(t.x + t.dx, t.y); const k = t.t / (t.big ? 1.3 : 0.9);
      ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
      ctx.font = (t.big === 2 ? 'bold 13px ' : t.big ? 'bold 11px ' : 'bold 9px ') + 'Cinzel, Georgia, serif';
      ctx.textAlign = 'center'; ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const y = s.y - t.z * 28;
      ctx.strokeText(t.txt, s.x, y); ctx.fillStyle = t.col; ctx.fillText(t.txt, s.x, y);
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.flash > 0) { ctx.fillStyle = 'rgba(255,230,160,' + this.flash * 0.5 + ')'; ctx.fillRect(0, 0, W, H); }
  };

  Battle.prototype.drawEnt = function (ctx, e) {
    const s = BB.iso(e.x, e.y);
    const y = s.y - (e.z || 0) * 24;
    if (e.barrel) {
      BB.drawFx(ctx, e.barrel, 0, s.x, s.y - 4, 1.1, {}); return;
    }
    if (e.gate) {
      const n = BB.fxLen('portal');
      const sc = 0.8 + Math.sin(this.time * 2) * 0.03;
      if (e.dead) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(s.x, s.y - 18, 0, s.x, s.y - 18, 46);
      gr.addColorStop(0, 'rgba(170,80,255,0.45)'); gr.addColorStop(1, 'rgba(170,80,255,0)'); ctx.fillStyle = gr; ctx.fillRect(s.x - 50, s.y - 70, 100, 100); ctx.restore();
      BB.drawFx(ctx, 'portal', Math.floor(this.time * 12) % n, s.x, s.y - 20, sc, { add: e.flash > 0 });
      return;
    }
    if (e.turret) {
      BB.drawFx(ctx, 'turret', e.dead ? 7 : Math.floor(this.time * 6) % 2, s.x, s.y - 6, 1.1, {});
      if (e.flash > 0) BB.drawFx(ctx, 'turret', 0, s.x, s.y - 6, 1.1, { add: true, alpha: e.flash * 3 });
      return;
    }
    const key = this.artKey(e);
    const n = this.clipLen(e, e.clip);
    let fps = CLIP_FPS[e.clip] || (e.atkDur ? n / e.atkDur : 20);
    if (e.clip === 'Run') fps = 20 * (e.spd / 3.2);
    if (e.clip === 'AttackRun' && e.leap) fps = n / 0.65;
    if (e.clip === 'Rolling') fps = n / 0.34;
    let fr = Math.floor(e.ct * fps);
    const loop = e.clip === 'Idle' || e.clip === 'Run';
    fr = loop ? fr % n : Math.min(n - 1, fr);
    if (e.dead) fr = Math.min(n - 1, Math.floor(e.deadT * 14));
    ctx.imageSmoothingEnabled = false;
    let alpha = 1;
    if (e.hidden) alpha = 0.12;
    if (e.dead && e.side === 'foe') alpha = Math.max(0, 1 - (e.deadT - 1.4) / 1);
    if (e.spawnT > 0) alpha = 1 - e.spawnT / 0.6;
    if (e.invuln > 0 && e.dodging) alpha = 0.6;
    ctx.globalAlpha = alpha;
    const fl = e.flash > 0 ? Math.min(0.9, e.flash * 5) : 0;
    if (e.side === 'hero') BB.drawLayers(ctx, e.layers, e.clip, e.dir, fr, s.x, y, e.sc, { flash: fl });
    else BB.drawChar(ctx, key, e.tint, e.clip, e.dir, fr, s.x, y, e.sc, fl);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
  };

  Battle.prototype.drawFxObj = function (ctx, f) {
    const s = BB.iso(f.x, f.y);
    if (f.ring) { const k = f.t / f.n; BB.drawOther(ctx, 'AoEFire', s.x, s.y, f.rad * BB.TW * 1.02 / 256 * (0.8 + k * 0.3), { add: true, alpha: Math.min(1, (1 - k) * 2.5), sy: 0.55 }); return; }
    const fr = Math.floor(f.t * f.fps);
    BB.drawFx(ctx, f.key, f.loop ? fr % f.n : fr, s.x, s.y, f.sc, { add: f.add, hue: f.hue, rot: f.rot, alpha: f.alpha, squash: f.ground ? 0.55 : 1, sat: f.sat });
  };

  Battle.prototype.drawProj = function (ctx, p) {
    const s = BB.iso(p.x, p.y), y = s.y - p.z * 24;
    if (p.kind === 'arrow') {
      const v = BB.iso(p.vx, p.vy); let vx = v.x, vy = v.y - (p.fall ? p.fall * 24 : 0); const l = hyp(vx, vy) || 1; vx /= l; vy /= l;
      ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(s.x - vx * 9, y - vy * 9); ctx.lineTo(s.x, y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, y, 1, 0, TAU); ctx.fill();
      if (!p.fall) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 3, 1.4, 0, 0, TAU); ctx.fill(); }
      return;
    }
    if (p.kind === 'light') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(s.x, y, 0, s.x, y, 9); gr.addColorStop(0, 'rgba(255,250,200,1)'); gr.addColorStop(0.4, 'rgba(255,210,90,0.7)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = gr; ctx.fillRect(s.x - 10, y - 10, 20, 20); ctx.restore(); return;
    }
    const v = BB.iso(p.vx, p.vy);
    const hue = p.kind === 'bolt' ? (p.side === 'hero' ? 150 : 0) : (p.hue || 0);
    BB.drawFx(ctx, 'bolt', Math.floor(this.time * 30) % BB.fxLen('bolt'), s.x, y, 0.32, { add: true, hue, rot: Math.atan2(v.y, v.x) + Math.PI });
  };

  Battle.prototype.drawTele = function (ctx, t) {
    const k = Math.min(1, t.t / t.dur);
    ctx.save();
    const fill = 'rgba(' + t.col + ',' + (0.12 + 0.18 * k) + ')', edge = 'rgba(' + t.col + ',0.8)';
    if (t.kind === 'circle') {
      const s = BB.iso(t.x, t.y), rx = t.rad * BB.TW / Math.SQRT2 * 0.72, ry = rx / 2;
      ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = 'rgba(' + t.col + ',0.35)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, rx * k, ry * k, 0, 0, TAU); ctx.fill();
    } else if (t.kind === 'line') {
      const a = BB.iso(t.x, t.y), b = BB.iso(t.x2, t.y2);
      ctx.strokeStyle = fill; ctx.lineWidth = t.w * 20; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(' + t.col + ',0.5)'; ctx.lineWidth = t.w * 20 * k; ctx.stroke();
    } else if (t.kind === 'cone') {
      ctx.fillStyle = fill; ctx.beginPath();
      const s0 = BB.iso(t.x, t.y); ctx.moveTo(s0.x, s0.y);
      const base = Math.atan2(t.vy, t.vx);
      for (let i = 0; i <= 12; i++) { const a = base - t.spread + (i / 12) * t.spread * 2; const q = BB.iso(t.x + Math.cos(a) * t.len, t.y + Math.sin(a) * t.len); ctx.lineTo(q.x, q.y); }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  };

  Battle.prototype.drawBars = function (ctx, e) {
    if (e.dead || e.barrel) return;
    if (this.peaceful) return;
    if (e.side === 'foe' && e.hp >= e.maxhp && !e.gate && !e.elite) return;
    if (e.boss) return; // boss bar is in the HUD
    const s = BB.iso(e.x, e.y);
    const h = e.gate ? 62 : e.ward ? 44 : 46 * (e.sc || 1);
    const w = e.gate || e.ward ? 40 : 22;
    const x = s.x - w / 2, y = s.y - h - (e.z || 0) * 24;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 1, y - 1, w + 2, 4);
    const col = e.side === 'hero' ? (e.ward ? '#ffd166' : '#5fe07a') : e.gate ? '#b47aff' : e.elite ? '#ff9f2e' : '#e0473c';
    ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxhp), 2);
    if (e.shield > 0) { ctx.fillStyle = '#cfe8ff'; ctx.fillRect(x, y - 2, w * Math.min(1, e.shield / e.maxhp), 1.2); }
    if (e.elite || e.gate || e.ward) {
      ctx.font = 'bold 7px Cinzel, Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2; ctx.strokeText(e.name, s.x, y - 3); ctx.fillText(e.name, s.x, y - 3);
    }
  };

  Battle.prototype.drawLight = function (ctx, W, H, z, ox, oy) {
    const m = this.map;
    if (!this.lightCanvas || this.lightCanvas.width !== W || this.lightCanvas.height !== H) {
      this.lightCanvas = document.createElement('canvas'); this.lightCanvas.width = W; this.lightCanvas.height = H;
    }
    const night = m.night;
    const lc = this.lightCanvas, g = lc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = night ? 'rgba(10,8,30,0.62)' : m.biome === 'sand' ? 'rgba(60,30,0,0.06)' : 'rgba(10,20,30,0.08)';
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out';
    g.setTransform(z, 0, 0, z, ox, oy);
    const hole = (x, y, rad, a) => {
      const s = BB.iso(x, y); const R = rad * BB.TW * 0.7;
      const gr = g.createRadialGradient(s.x, s.y - 10, 0, s.x, s.y - 10, R);
      gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(s.x, s.y - 10, R, R * 0.6, 0, 0, TAU); g.fill();
    };
    if (night) {
      for (const L of m.lights) hole(L.x, L.y, L.rad, 0.95);
      for (const e of this.ents) if (e.side === 'hero' && !e.dead && !e.ward) hole(e.x, e.y, 3.2, 0.7);
      for (const e of this.ents) if (e.gate && !e.dead) hole(e.x, e.y, 3, 0.8);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(lc, 0, 0);
    // additive glows
    ctx.setTransform(z, 0, 0, z, ox, oy);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const L of m.lights) {
      const s = BB.iso(L.x, L.y); const R = L.rad * BB.TW * 0.45 * (1 + Math.sin(this.time * 9 + L.x) * 0.04);
      const gr = ctx.createRadialGradient(s.x, s.y - 8, 0, s.x, s.y - 8, R);
      gr.addColorStop(0, 'rgba(' + L.col + ',' + (night ? 0.35 : 0.18) + ')'); gr.addColorStop(1, 'rgba(' + L.col + ',0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(s.x, s.y - 8, R, R * 0.65, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.vig || this.vig.w !== W || this.vig.h !== H) {
      const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); this.vig = { g: v, w: W, h: H };
    }
    ctx.fillStyle = this.vig.g; ctx.fillRect(0, 0, W, H);
  };
})();
