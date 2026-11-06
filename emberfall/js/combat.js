// EMBERFALL — the fight. Real-time action: light combos, a charged heavy, a dodge with a perfect
// window, six signature arts, poise breaks, boss phases and the party's Ember Surge.
// Pure logic, no DOM: the renderer reads entities, effects and events; Node runs it for tests.
(function (root) {
  const EF = root.EF = root.EF || {}; const D = EF.DATA;
  const TAU = Math.PI * 2;
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
  const fps = c => D.CLIP_FPS[c] || 12;
  const strikeT = c => (D.STRIKE[c] != null ? D.STRIKE[c] : 6) / fps(c);
  const clipLen = c => D.FRAMES / fps(c);

  class Combat {
    constructor(opts) {
      this.opts = opts; this.rand = rng(opts.seed || 7);
      this.W = opts.width || 600; this.H = opts.height || 340; this.inset = 24;
      this.ents = []; this.fx = []; this.projs = []; this.floaters = []; this.events = []; this.banners = [];
      this.t = 0; this.waves = opts.waves || [[]]; this.wave = -1; this.waveTimer = 0.1;
      this.surge = 0; this.surgeT = 0; this.slow = 1; this.slowT = 0; this.shake = 0; this.hitstop = 0;
      this.result = null; this.resultT = 0; this.potions = opts.potions || 0; this.auto = !!opts.auto;
      this.stats = { dmg: 0, kills: 0, perfect: 0, hits: 0, taken: 0, gold: 0, xp: 0, maxCombo: 0, time: 0 };
      this.combo = 0; this.comboT = 0; this.host = 0; this.bossSay = null; this.sayT = 0; this.introT = 1.6;
      this.heroes = (opts.party || []).map((p, i) => this.makeHero(p, i));
      this.heroes.forEach(h => this.ents.push(h));
      this.boss = null; this.spawnWave();
      if (opts.intro) this.banner(opts.intro, 2.2, true);
    }
    // ---- creation ---------------------------------------------------------------------
    makeHero(p, i) {
      const h = D.HEROES[p.id]; const st = D.levelStats(p.id, p.level || 1); const tal = p.talents || {}; const items = p.items || {};
      const it = Object.values(items).map(id => D.ITEMS[id]).filter(Boolean);
      const sum = k => it.reduce((a, x) => a + (x[k] || 0), 0);
      const n = (opts => opts)(this.opts.party.length); const col = Math.floor(i / 3), row = i % 3;
      const e = { kind: 'hero', id: p.id, name: h.name, set: h.set, team: 0, x: 90 - col * 40, y: this.H / 2 + (row - 1) * 46 + (col ? 23 : 0), r: 9,
        maxHp: Math.round((st.hp + sum('hp')) * (1 + 0.12 * (tal.ironwill || 0))), atk: st.atk + sum('atk'), def: st.def + sum('def') + 2 * (tal.bulwark || 0),
        spd: st.spd * (1 + 0.06 * (tal.windstep || 0)), baseSpd: 0, scale: h.scale || 1, facing: 0, clip: h.stance, animT: 0, animSpeed: 1, state: 'idle', stateT: 0,
        comboIdx: 0, comboWindow: 0, queued: null, cd: 0, cdMax: h.special.cd * (1 - (sum('cdr') || 0)) * (1 - 0.15 * (tal.overcharge || 0) * (h.special.cd / 10)),
        iframes: 0, stagger: 0, poise: 100, maxPoise: 100, flash: 0, status: {}, target: null, atkCd: 0, dead: false, deathT: 0,
        crit: (h.crit || 0) + sum('crit') + 0.08 * (tal.backstab || 0), lifesteal: sum('lifesteal'), surgeGain: 1 + sum('surge'), atkMul: 1 + sum('atkMul'),
        element: (it.find(x => x.element) || {}).element || h.element || null, talents: tal, threat: 1 + 0.4 * (tal.taunt || 0), dodgeWin: 0.3 + 0.1 * (tal.ghost || 0),
        hero: h, level: p.level || 1, vx: 0, vy: 0, hurtT: 0, retarget: 0, aiT: 0, ghost: 0 };
      e.hp = e.maxHp; e.baseSpd = e.spd; if (e.cdMax < 3) e.cdMax = 3; return e;
    }
    makeFoe(id, x, y, lvl) {
      const f = D.FOES[id]; if (!f) throw new Error('no foe ' + id); const k = 1 + 0.05 * ((lvl || 1) - 1); const n = this.opts.party.length; const hpMul = (f.boss ? 2.6 : 1.5) * (0.5 + 0.15 * n) * (D.TUNE.hp || 1), atkMul = 1.6 * (0.7 + 0.1 * n) * (D.TUNE.atk || 1);
      const e = { kind: 'foe', id, name: f.name, set: f.set, team: 1, x, y, r: 9 * (f.scale || 1), maxHp: Math.round(f.hp * k * hpMul), atk: f.atk * k * atkMul, def: 0, spd: f.spd, baseSpd: f.spd,
        scale: f.scale || 1, facing: Math.PI, clip: 'Idle4', animT: 0, animSpeed: 1, state: 'idle', stateT: 0, cd: 0, iframes: 0, stagger: 0, poise: f.poise || 40, maxPoise: f.poise || 40,
        flash: 0, status: {}, target: null, atkCd: 0.6 + this.rand() * 1.2, dead: false, deathT: 0, ai: f.ai, attacks: f.attacks, boss: !!f.boss, phases: (f.phases || []).map(p => ({ ...p, done: false })),
        xp: f.xp, gold: f.gold, element: f.element || null, bolt: f.bolt, boltSpeed: f.boltSpeed, crit: 0.05, atkMul: 1, vx: 0, vy: 0, hurtT: 0, retarget: 0, aiT: 0, threat: 1, dmgMul: 1, aoeCd: 0, dashCd: 0, boltCd: 0 };
      e.hp = e.maxHp; if (e.boss) this.boss = e; return e;
    }
    spawnWave() {
      this.wave++; const list = this.waves[this.wave]; if (!list) return false;
      const lvl = this.opts.level || 1; const n = list.length;
      list.forEach((id, i) => {
        const f = D.FOES[id]; const x = this.W - 110 + (f.boss ? 0 : (i % 2) * 40), y = this.H / 2 + (i - (n - 1) / 2) * 44;
        const e = this.makeFoe(id, clamp(x, this.inset, this.W - this.inset), clamp(y, this.inset, this.H - this.inset), lvl);
        this.ents.push(e); this.addFx('summon', e.x, e.y - 10, 2.5 * e.scale);
      });
      if (this.wave > 0) this.banner('WAVE ' + (this.wave + 1) + ' / ' + this.waves.length, 1.4);
      this.events.push({ type: 'wave', n: this.wave });
      return true;
    }
    summon(ids, by) {
      ids.forEach((id, i) => { const a = this.rand() * TAU; const e = this.makeFoe(id, clamp(by.x + Math.cos(a) * 70, this.inset, this.W - this.inset), clamp(by.y + Math.sin(a) * 50, this.inset, this.H - this.inset), this.opts.level || 1); this.ents.push(e); this.addFx('summon', e.x, e.y - 10, 2.5); });
    }
    // ---- helpers -----------------------------------------------------------------------
    addFx(name, x, y, scale, opts) { const f = { name, x, y, t: 0, scale: scale || 2, ...(opts || {}) }; this.fx.push(f); return f; }
    floater(x, y, text, color, big) { this.floaters.push({ x, y, t: 0, text, color: color || '#fff', big: !!big }); }
    banner(text, dur, big) { this.banners.push({ text, t: 0, dur: dur || 1.5, big: !!big }); }
    say(e, text) { this.bossSay = { who: e, text }; this.sayT = 3.5; }
    alive(team) { return this.ents.filter(e => e.team === team && !e.dead); }
    nearest(e, team, pred) { let best = null, bd = 1e9; for (const o of this.ents) { if (o.team !== team || o.dead || (pred && !pred(o))) continue; const d = Math.hypot(o.x - e.x, o.y - e.y); if (d < bd) { bd = d; best = o; } } return best; }
    dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    hostEnt() { return this.heroes[this.host]; }
    switchHost(dir) {
      const n = this.heroes.length; for (let k = 1; k <= n; k++) { const i = (this.host + k * (dir || 1) + n) % n; if (!this.heroes[i].dead) { this.host = i; this.events.push({ type: 'switch', i }); return; } }
    }
    // ---- attacks -----------------------------------------------------------------------
    startAttack(e, atk, kind) {
      e.state = 'attack'; e.stateT = 0; e.clip = atk.clip; e.animT = 0; e.cur = atk; e.atkKind = kind || 'light'; e.hitDone = false; e.queued = null;
      e.tele = e.kind === 'foe' ? Math.max(atk.tele || 0.4, 0.15) : strikeT(atk.clip) / (this.surgeT > 0 ? 1.4 : 1); e.dashT = 0; e.multi = 0;
      if (e.kind === 'foe') this.events.push({ type: 'tele', e });
      if (atk.dash || atk.aoe) e.vx = e.vy = 0;
    }
    heroLight(e) {
      const h = e.hero; const clip = h.combo[e.comboIdx % h.combo.length]; const last = e.comboIdx % h.combo.length === h.combo.length - 1;
      this.startAttack(e, { clip, mul: last ? 1.5 : 1, reach: h.reach, arc: h.arc, fx: h.kind === 'ranged' ? null : (last ? 'cross_slash' : (e.comboIdx % 2 ? 'slash_l' : 'slash_r')), bolt: h.bolt, boltSpeed: h.boltSpeed, poise: last ? 1.5 : 1, element: e.element, lunge: h.kind === 'melee' ? 26 : 0 }, 'light');
      e.comboIdx++; e.comboWindow = 1.0; this.events.push({ type: 'swing', e, kind: h.kind });
    }
    heroHeavy(e) {
      const h = e.hero; this.startAttack(e, { clip: h.heavy, mul: 2.3, reach: h.kind === 'ranged' ? h.reach : h.reach + 10, arc: h.arc + 0.6, fx: h.kind === 'ranged' ? null : 'hit_big', bolt: h.bolt, boltSpeed: h.boltSpeed, poise: 2.5, element: e.element, lunge: 36, heavy: true }, 'heavy');
      e.comboIdx = 0; this.events.push({ type: 'swing', e, kind: 'heavy' });
    }
    heroSpecial(e) {
      const h = e.hero; e.cd = e.cdMax; this.events.push({ type: 'special', e }); this.banner(h.special.name.toUpperCase(), 1.2);
      const tal = e.talents;
      switch (e.id) {
        case 'rook': this.startAttack(e, { clip: 'Special1', mul: 3, reach: 64, arc: 7, fx: 'hit_crit', poise: 3, special: 'rook' }, 'special'); break;
        case 'ysolde': this.startAttack(e, { clip: 'Special1', mul: 3.5, reach: 220, arc: 0.6, bolt: 'fireball_big', boltSpeed: 220, big: 70 * (1 + 0.2 * (tal.pyre || 0)), element: 'burn', poise: 2, special: 'ysolde' }, 'special'); break;
        case 'brannoc': { const t = this.nearest(e, 1); this.startAttack(e, { clip: 'Attack4', mul: 2.5, reach: 85 * (1 + 0.25 * (tal.quake || 0)), arc: 7, fx: 'rock_burst', poise: 3, knockdown: 1.6, leapTo: t, special: 'brannoc' }, 'special'); break; }
        case 'tamsin': { const t = this.nearest(e, 1); if (t) e.facing = Math.atan2(t.y - e.y, t.x - e.x); this.startAttack(e, { clip: 'Attack4', mul: 2.5, reach: 30, arc: 7, fx: 'chain_lightning', poise: 2, dash: true, dashLen: 260, element: 'shock', stun: 0.8, special: 'tamsin' }, 'special'); break; }
        case 'mouse': { const t = this.nearest(e, 1) && this.alive(1).sort((a, b) => a.hp - b.hp)[0]; if (t) { this.addFx('teleport', e.x, e.y - 12, 2.5); e.x = clamp(t.x + Math.cos(t.facing + Math.PI) * 22, this.inset, this.W - this.inset); e.y = clamp(t.y + Math.sin(t.facing + Math.PI) * 22 + 2, this.inset, this.H - this.inset); e.facing = Math.atan2(t.y - e.y, t.x - e.x); this.addFx('teleport', e.x, e.y - 12, 2.5); } this.startAttack(e, { clip: 'Attack6', mul: 0.9, reach: 40, arc: 2.4, fx: 'multi_hit', poise: 1.2, crit: true, multi: 5, special: 'mouse' }, 'special'); break; }
        case 'wren': { this.startAttack(e, { clip: 'Attack3', mul: 2, reach: 100, arc: 7, fx: 'hit_holy', poise: 1.5, element: 'holy', heal: 0.35 * (1 + 0.15 * (tal.mercy || 0)), special: 'wren' }, 'special'); this.addFx('circle_holy', e.x, e.y, 3, { life: 1.6 }); break; }
      }
    }
    foeChoose(e, target) {
      const d = this.dist(e, target); const A = e.attacks; const melee = A.filter(a => !a.aoe && !a.dash && !a.bolt && !e.bolt);
      if (e.ai === 'boss') {
        const near = this.alive(0).filter(h => this.dist(h, e) < 95).length;
        const aoe = A.find(a => a.aoe), dash = A.find(a => a.dash), bolt = A.find(a => a.bolt);
        if (aoe && e.aoeCd <= 0 && (near >= 2 || this.rand() < 0.25)) { e.aoeCd = 7; return aoe; }
        if (dash && e.dashCd <= 0 && d > 70 && d < dash.reach) { e.dashCd = 5; return dash; }
        if (bolt && e.boltCd <= 0 && d > 80) { e.boltCd = 4; return bolt; }
        const m = A.filter(a => !a.aoe && !a.dash && !a.bolt); if (d <= (m[0] ? m[0].reach + 8 : 50)) return m[Math.floor(this.rand() * m.length)];
        return null;
      }
      if (e.ai === 'ranged' || e.ai === 'caster') { const a = A[0]; return d < a.reach + 20 ? { ...a, bolt: e.bolt, boltSpeed: e.boltSpeed } : null; }
      const a = A[Math.floor(this.rand() * A.length)]; return d <= a.reach + 8 ? a : null;
    }
    // ---- hits --------------------------------------------------------------------------
    strike(e) {
      const a = e.cur; e.hitDone = true;
      if (a.leapTo) { /* already moved during windup */ }
      if (a.bolt) { const t = e.kind === 'foe' ? e.target : (this.nearest(e, 1 - e.team)); let ang = e.facing; if (t) { ang = Math.atan2(t.y - e.y, t.x - e.x); e.facing = ang; }
        const sp = a.boltSpeed || 240; this.projs.push({ x: e.x + Math.cos(ang) * 12, y: e.y - 14 + Math.sin(ang) * 12, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, team: e.team, src: e, atk: a, fx: a.bolt, t: 0, life: (a.reach + 60) / sp, r: a.big ? 14 : 7, ang, homing: a.bolt === 'homing_orb' ? t : null });
        this.events.push({ type: 'bolt', e, name: a.bolt }); return; }
      if (a.dash) { e.state = 'dash'; e.stateT = 0; e.dashHit = new Set(); e.dashLen = a.dashLen || a.reach; e.dashDur = 0.28; this.addFx('dust_run', e.x, e.y, 2.5); this.events.push({ type: 'dash', e }); return; }
      if (a.heal) { for (const h of this.alive(e.team)) { const amt = Math.round(h.maxHp * a.heal); h.hp = Math.min(h.maxHp, h.hp + amt); this.floater(h.x, h.y - 30, '+' + amt, '#a0ffd0'); this.addFx('heal_loop', h.x, h.y - 8, 2, { life: 1 }); } this.events.push({ type: 'heal' }); }
      if (a.special === 'rook') { this.addFx('spin_slash', e.x, e.y - 10, 4); this.addFx('shockwave', e.x, e.y, 3); this.shake = Math.max(this.shake, 0.4); }
      if (a.special === 'brannoc') { this.addFx('shockwave', e.x, e.y, 4); this.addFx('dust_land', e.x, e.y, 3); this.shake = Math.max(this.shake, 0.7); this.hitstop = Math.max(this.hitstop, 0.08); }
      if (a.aoe && e.kind === 'foe') { this.addFx(a.fx || 'shockwave', e.x, e.y, 3 * e.scale); this.shake = Math.max(this.shake, 0.5); }
      const hits = this.ents.filter(o => o.team !== e.team && !o.dead && this.inArc(e, o, a.reach, a.arc));
      if (a.multi) { e.multi = a.multi - 1; e.multiT = 0; }
      for (const o of hits) this.applyHit(e, o, a);
      if (!hits.length && e.kind === 'hero' && a.fx && !a.special) this.addFx(a.fx, e.x + Math.cos(e.facing) * 22, e.y - 12 + Math.sin(e.facing) * 10, 2, { ang: e.facing, alpha: 0.6 });
      if (hits.length) this.events.push({ type: 'hit', e, heavy: !!a.heavy, n: hits.length, fx: a.fx });
    }
    inArc(e, o, reach, arc) {
      const dx = o.x - e.x, dy = o.y - e.y; const d = Math.hypot(dx, dy) - o.r; if (d > reach) return false; if (arc >= 6) return true;
      return Math.abs(angDiff(Math.atan2(dy, dx), e.facing)) <= arc / 2 || d < 10;
    }
    applyHit(src, dst, a, opts) {
      if (dst.dead || dst.team === src.team) return;
      if (dst.iframes > 0) { if (dst.kind === 'hero' && !dst.perfectT) { dst.perfectT = 0.5; this.slow = 0.3; this.slowT = 0.75; this.gainSurge(15 * dst.surgeGain); this.stats.perfect++; this.floater(dst.x, dst.y - 36, 'PERFECT', '#8ef0ff', true); this.addFx('parry', dst.x, dst.y - 14, 2.5); this.events.push({ type: 'perfect' }); } return; }
      const surge = src.kind === 'hero' && this.surgeT > 0 ? 1.6 : 1;
      let dmg = src.atk * a.mul * (src.atkMul || 1) * (src.dmgMul || 1) * surge * (0.9 + this.rand() * 0.2);
      let crit = a.crit || this.rand() < (src.crit || 0); if (crit) dmg *= 1.75;
      if (dst.stagger > 0) dmg *= 1.5 + 0.25 * ((src.talents && src.talents.executioner) || 0);
      if (a.element === 'holy' && src.talents) dmg *= 1 + 0.2 * (src.talents.litany || 0);
      dmg *= 100 / (100 + dst.def * 5); dmg = Math.max(1, Math.round(dmg));
      dst.hp -= dmg; dst.flash = 1; dst.hurtT = 0.2;
      if (src.kind === 'hero') { this.stats.dmg += dmg; this.stats.hits++; this.combo++; this.comboT = 2.2; this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo); this.gainSurge((a.heavy ? 4 : 2) * src.surgeGain); if (src.lifesteal) src.hp = Math.min(src.maxHp, src.hp + dmg * src.lifesteal); }
      else { this.stats.taken += dmg; this.combo = 0; }
      this.floater(dst.x + (this.rand() - 0.5) * 16, dst.y - 30 - dst.r, String(dmg), dst.kind === 'hero' ? '#ff7070' : crit ? '#ffe060' : '#fff', crit || !!a.heavy);
      // poise
      const pd = dmg * 0.9 * (a.poise || 1) * (a.element === 'shock' && src.talents ? 1 + 0.3 * (src.talents.conductor || 0) : 1);
      dst.poise -= pd;
      const strikeNow = dst.state === 'attack' && dst.stateT >= dst.tele - 0.03;
      if (dst.poise <= 0) { dst.poise = dst.maxPoise; this.breakPoise(dst, a.knockdown); }
      else if (a.knockdown && !dst.boss) this.breakPoise(dst, a.knockdown);
      else if (a.stun) { dst.stagger = Math.max(dst.stagger, a.stun); dst.state = 'hurt'; dst.stateT = 0; dst.clip = 'TakeDamage'; dst.animT = 0; }
      else if (!dst.boss && !strikeNow && (dmg >= dst.maxHp * 0.15 || this.rand() < 0.3 || dst.kind === 'hero' && a.heavy)) { dst.state = 'hurt'; dst.stateT = 0; dst.clip = 'TakeDamage'; dst.animT = 0; dst.hurtDur = 0.32; }
      // knockback
      const kb = dst.boss ? 3 : (a.heavy ? 22 : 10); const ang = Math.atan2(dst.y - src.y, dst.x - src.x); dst.x = clamp(dst.x + Math.cos(ang) * kb, this.inset, this.W - this.inset); dst.y = clamp(dst.y + Math.sin(ang) * kb, this.inset, this.H - this.inset);
      // status
      const el = a.element || src.element; if (el === 'burn') dst.status.burn = 3 + ((src.talents && src.talents.kindling) || 0); else if (el === 'frost') dst.status.frost = 3; else if (el === 'shock') { dst.status.shock = 2; }
      const fxName = a.fx && a.fx !== 'thrust' && a.fx !== 'cleave' ? a.fx : (crit ? 'hit_crit' : 'hit_slash'); this.addFx(fxName, dst.x, dst.y - 12 - dst.r * 0.5, 2.5 + (a.heavy ? 1 : 0));
      if (el === 'burn') this.addFx('hit_fire', dst.x, dst.y - 14, 2); if (el === 'frost') this.addFx('hit_ice', dst.x, dst.y - 14, 2); if (el === 'shock') this.addFx('hit_shock', dst.x, dst.y - 14, 2);
      this.hitstop = Math.max(this.hitstop, a.heavy || crit ? 0.08 : 0.035); if (dst.kind === 'hero') this.shake = Math.max(this.shake, 0.25);
      this.events.push({ type: 'damage', src, dst, dmg, crit, heavy: !!a.heavy, fx: a.fx, element: el });
      if (dst.hp <= 0) this.kill(dst, src);
    }
    breakPoise(dst, dur) {
      dst.stagger = Math.max(dst.stagger, dur || (dst.boss ? 2.4 : 1.6)); dst.state = 'hurt'; dst.stateT = 0; dst.clip = 'Slide'; dst.animT = 0; dst.hurtDur = dst.stagger;
      this.floater(dst.x, dst.y - 44 - dst.r, 'BREAK', '#ffb040', true); this.addFx('hit_crit', dst.x, dst.y - 16, 3); this.events.push({ type: 'break', e: dst }); this.hitstop = Math.max(this.hitstop, 0.1);
    }
    kill(e, by) {
      e.dead = true; e.state = 'dead'; e.stateT = 0; e.clip = 'Die'; e.animT = 0; e.hp = 0; e.stagger = 0; e.status = {};
      if (e.kind === 'foe') {
        this.stats.kills++; this.stats.xp += e.xp || 0; const g = Math.round((e.gold || 0) * (1 + 0.15 * ((by && by.talents && by.talents.cutpurse) || 0))); this.stats.gold += g;
        this.gainSurge(8); this.addFx('coin', e.x, e.y - 20, 2); this.addFx('exp', e.x + 8, e.y - 24, 2); this.addFx('dissipate', e.x, e.y - 10, 2.5 * e.scale);
        if (by && by.kind === 'hero' && by.talents && by.talents.secondwind) { const amt = Math.round(by.maxHp * 0.06 * by.talents.secondwind); by.hp = Math.min(by.maxHp, by.hp + amt); this.floater(by.x, by.y - 30, '+' + amt, '#a0ffd0'); }
        if (e.boss) { this.shake = 1.2; this.slow = 0.2; this.slowT = 1.4; this.banner(e.name.toUpperCase() + ' FALLS', 2.6, true); }
        this.events.push({ type: 'kill', e, boss: e.boss });
      } else { this.events.push({ type: 'herodown', e }); this.floater(e.x, e.y - 40, 'DOWN', '#ff6060', true); if (this.heroes[this.host] === e) this.switchHost(1); }
    }
    gainSurge(n) { if (this.surgeT > 0) return; this.surge = Math.min(100, this.surge + n); if (this.surge >= 100 && !this.surgeReady) { this.surgeReady = true; this.events.push({ type: 'surgeready' }); } }
    useSurge() {
      if (this.surge < 100 || this.surgeT > 0) return false; this.surge = 0; this.surgeReady = false; this.surgeT = 7; this.slow = 0.25; this.slowT = 1.0; this.shake = 0.6;
      for (const h of this.alive(0)) { h.cd = 0; this.addFx('buff_up', h.x, h.y - 10, 3); h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.1)); }
      this.banner('EMBER SURGE', 2, true); this.events.push({ type: 'surge' }); return true;
    }
    usePotion() { const h = this.hostEnt(); if (!h || h.dead || this.potions <= 0 || h.hp >= h.maxHp) return false; this.potions--; const amt = Math.round(h.maxHp * 0.4); h.hp = Math.min(h.maxHp, h.hp + amt); this.floater(h.x, h.y - 30, '+' + amt, '#a0ffd0'); this.addFx('heal', h.x, h.y - 10, 2.5); this.events.push({ type: 'potion' }); return true; }
    // ---- the step ----------------------------------------------------------------------
    step(realDt, input) {
      input = input || {}; const dt0 = Math.min(realDt, 0.05);
      let dt = dt0; if (this.hitstop > 0) { this.hitstop -= dt0; dt *= 0.08; }
      if (this.slowT > 0) { this.slowT -= dt0; dt *= this.slow; if (this.slowT <= 0) this.slow = 1; }
      this.t += dt; this.stats.time += dt;
      for (const b of this.banners) b.t += dt0; this.banners = this.banners.filter(b => b.t < b.dur);
      for (const f of this.floaters) { f.t += dt0; f.y -= 22 * dt0; } this.floaters = this.floaters.filter(f => f.t < 1.1);
      for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.life ? f.t < f.life : f.t < 1.5);
      if (this.sayT > 0) this.sayT -= dt0;
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt0 * 1.6);
      if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
      if (this.surgeT > 0) this.surgeT -= dt;
      if (this.introT > 0) this.introT -= dt0;
      if (this.result) { this.resultT += dt0; for (const e of this.ents) this.advanceAnim(e, dt0); return; }
      const host = this.hostEnt();
      if (input.switch) this.switchHost(1);
      if (input.surge) this.useSurge();
      if (input.potion) this.usePotion();
      if (this.auto && host && !host.dead && host.hp < host.maxHp * 0.4) this.usePotion();
      for (const e of this.ents) if (!e.dead) this.updateEnt(e, dt, e === host && !this.auto ? input : null);
      this.updateProjs(dt);
      this.separate();
      // waves and result
      if (!this.alive(1).length) { this.waveTimer -= dt; if (this.waveTimer <= 0) { if (!this.spawnWave()) { this.result = 'win'; this.resultT = 0; for (const h of this.alive(0)) { h.state = 'victory'; h.clip = 'Taunt'; h.animT = 0; } this.events.push({ type: 'win' }); } else this.waveTimer = 1.1; } }
      else this.waveTimer = 1.1;
      if (!this.alive(0).length) { this.result = 'lose'; this.resultT = 0; this.events.push({ type: 'lose' }); }
    }
    advanceAnim(e, dt) { e.animT += dt * (e.animSpeed || 1); if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 6); }
    updateEnt(e, dt, input) {
      // statuses
      const s = e.status;
      if (s.burn > 0) { s.burn -= dt; e.burnTick = (e.burnTick || 0) + dt; if (e.burnTick > 0.5) { e.burnTick = 0; const d = Math.max(1, Math.round(e.maxHp * 0.012)); e.hp -= d; this.floater(e.x, e.y - 26, String(d), '#ff9040'); this.addFx('flame', e.x, e.y - 10, 1.5); if (e.hp <= 0) { this.kill(e, null); return; } } }
      if (s.frost > 0) s.frost -= dt; if (s.shock > 0) s.shock -= dt;
      e.spd = e.baseSpd * (s.frost > 0 ? 0.55 : 1) * (e.kind === 'hero' && this.surgeT > 0 ? 1.3 : 1);
      e.animSpeed = e.kind === 'hero' && this.surgeT > 0 ? 1.4 : 1;
      if (e.iframes > 0) e.iframes -= dt; if (e.perfectT > 0) e.perfectT -= dt; if (e.cd > 0) e.cd -= dt; if (e.atkCd > 0) e.atkCd -= dt; if (e.aoeCd > 0) e.aoeCd -= dt; if (e.dashCd > 0) e.dashCd -= dt; if (e.boltCd > 0) e.boltCd -= dt;
      if (e.comboWindow > 0) { e.comboWindow -= dt; if (e.comboWindow <= 0) e.comboIdx = 0; }
      if (e.stagger > 0) e.stagger -= dt;
      if (e.kind === 'hero' && e.talents && e.talents.vigil) { /* Wren's vigil: allies near her regain hp */ }
      this.advanceAnim(e, dt); e.stateT += dt;
      if (e.kind === 'foe' && e.boss) this.bossPhases(e);
      switch (e.state) {
        case 'hurt': if (e.stateT >= (e.hurtDur || 0.32) && e.stagger <= 0) { e.state = 'idle'; e.stateT = 0; e.clip = e.kind === 'hero' ? e.hero.stance : 'Idle4'; e.animT = 0; } else if (e.stagger <= 0 && e.clip === 'Slide' && e.stateT > 1.0) { e.state = 'idle'; e.clip = e.kind === 'hero' ? e.hero.stance : 'Idle4'; e.animT = 0; } return;
        case 'dodge': { const sp = 250; e.x += Math.cos(e.dodgeAng) * sp * dt; e.y += Math.sin(e.dodgeAng) * sp * dt * 0.8; this.clampIn(e); if (e.stateT >= 0.42) { e.state = 'idle'; e.stateT = 0; e.clip = e.hero ? e.hero.stance : 'Idle4'; e.animT = 0; } return; }
        case 'dash': { const sp = e.dashLen / e.dashDur; e.x += Math.cos(e.facing) * sp * dt; e.y += Math.sin(e.facing) * sp * dt; this.clampIn(e);
          for (const o of this.ents) if (o.team !== e.team && !o.dead && !e.dashHit.has(o) && this.dist(e, o) < e.r + o.r + 10) { e.dashHit.add(o); this.applyHit(e, o, e.cur); }
          if (e.stateT >= e.dashDur) { e.state = 'idle'; e.stateT = 0; e.clip = e.hero ? e.hero.stance : 'Idle4'; e.animT = 0; e.atkCd = 1.2; } return; }
        case 'attack': this.updateAttack(e, dt, input); return;
        case 'victory': case 'dead': return;
      }
      // idle / move
      if (input) this.hostControl(e, dt, input); else this.ai(e, dt);
    }
    clampIn(e) { e.x = clamp(e.x, this.inset, this.W - this.inset); e.y = clamp(e.y, this.inset, this.H - this.inset); }
    move(e, dx, dy, dt, run) {
      const l = Math.hypot(dx, dy); if (l < 0.01) { if (e.state !== 'idle') { e.state = 'idle'; e.clip = e.hero ? e.hero.stance : 'Idle4'; } return; }
      dx /= l; dy /= l; e.x += dx * e.spd * dt; e.y += dy * e.spd * dt * 0.85; this.clampIn(e);
      if (!e.lockFacing) e.facing = Math.atan2(dy, dx);
      const clip = run === false ? 'Walk' : 'Run'; if (e.state !== 'move' || e.clip !== clip) { e.state = 'move'; e.clip = clip; e.animT = e.animT || 0; }
    }
    hostControl(e, dt, input) {
      e.lockFacing = false;
      if (input.dodge) { this.dodge(e, input.mx || input.my ? Math.atan2(input.my, input.mx) : e.facing); return; }
      if (input.special && e.cd <= 0) { this.heroSpecial(e); return; }
      if (input.heavy) { this.aimAtNearest(e); this.heroHeavy(e); return; }
      if (input.attack) { this.aimAtNearest(e); this.heroLight(e); return; }
      this.move(e, input.mx || 0, input.my || 0, dt);
    }
    aimAtNearest(e) { const t = this.nearest(e, 1 - e.team); if (t && this.dist(e, t) < (e.hero ? e.hero.reach + 70 : 80)) e.facing = Math.atan2(t.y - e.y, t.x - e.x); }
    dodge(e, ang) {
      if (e.kind === 'hero' && e.talents && e.talents.ashwalk) this.addFx('burning_ground', e.x, e.y, 2, { life: 2.5, ground: true, burn: e.talents.ashwalk });
      e.state = 'dodge'; e.stateT = 0; e.clip = 'Rolling'; e.animT = 0; e.dodgeAng = ang; e.iframes = e.dodgeWin || 0.3; e.facing = ang; this.addFx('dust_kick', e.x, e.y, 2); this.events.push({ type: 'dodge', e });
    }
    updateAttack(e, dt, input) {
      const a = e.cur; const st = strikeT(a.clip);
      if (e.kind === 'hero' && input && input.dodge && e.stateT > 0.12) { this.dodge(e, input.mx || input.my ? Math.atan2(input.my, input.mx) : e.facing + Math.PI); return; }
      if (e.kind === 'hero' && input) { if (input.attack) e.queued = 'light'; if (input.heavy) e.queued = 'heavy'; if (input.special && e.cd <= 0) e.queued = 'special'; }
      if (!e.hitDone) {
        // wind-up: scale the clip so its contact frame lands at e.tele
        e.animT = Math.min(e.stateT / e.tele, 1) * st;
        if (a.leapTo && !a.leapTo.dead) { const k = Math.min(1, e.stateT / e.tele); const tx = a.leapTo.x + (e.x - a.leapTo.x) * 0.1, ty = a.leapTo.y; e.x += (tx - e.x) * k * 0.25; e.y += (ty - e.y) * k * 0.25; e.facing = Math.atan2(ty - e.y, tx - e.x); this.clampIn(e); }
        else if (a.lunge && e.stateT < e.tele) { e.x += Math.cos(e.facing) * a.lunge * dt / e.tele; e.y += Math.sin(e.facing) * a.lunge * dt / e.tele * 0.8; this.clampIn(e); }
        if (e.stateT >= e.tele) this.strike(e);
        return;
      }
      if (e.state !== 'attack') return; // dash or state change inside strike
      e.animT = st + (e.stateT - e.tele) * (e.kind === 'hero' && this.surgeT > 0 ? 1.4 : 1);
      if (e.multi > 0) { e.multiT += dt; if (e.multiT > 0.11) { e.multiT = 0; e.multi--; for (const o of this.ents) if (o.team !== e.team && !o.dead && this.inArc(e, o, a.reach, a.arc)) this.applyHit(e, o, a); } }
      const rec = e.stateT - e.tele; const len = clipLen(a.clip) - st;
      // cancel the recovery into the next input
      if (e.kind === 'hero' && e.queued && rec > 0.16 && e.multi <= 0) { const q = e.queued; e.queued = null; this.aimAtNearest(e); if (q === 'light') this.heroLight(e); else if (q === 'heavy') this.heroHeavy(e); else if (q === 'special' && e.cd <= 0) this.heroSpecial(e); return; }
      if (rec >= Math.min(len, e.kind === 'hero' ? 0.42 : 0.5) && e.multi <= 0) { e.state = 'idle'; e.stateT = 0; e.clip = e.hero ? e.hero.stance : 'Idle4'; e.animT = 0; if (e.kind === 'foe') e.atkCd = (e.ai === 'brute' ? 1.6 : e.ai === 'boss' ? 1.0 : 1.3) + this.rand() * 0.9; }
    }
    // ---- AI -----------------------------------------------------------------------------
    ai(e, dt) {
      if (this.introT > 0 && e.kind === 'foe') { e.clip = 'Idle4'; return; }
      e.retarget -= dt; if (e.retarget <= 0 || !e.target || e.target.dead) { e.retarget = 0.8 + this.rand() * 0.6; e.target = this.pickTarget(e); }
      const t = e.target; if (!t) { this.move(e, 0, 0, dt); return; }
      const d = this.dist(e, t); const dx = t.x - e.x, dy = t.y - e.y; const ang = Math.atan2(dy, dx);
      if (e.kind === 'foe') {
        const a = e.atkCd <= 0 ? this.foeChoose(e, t) : null;
        if (a) { e.facing = ang; this.startAttack(e, a); return; }
        const ranged = e.ai === 'ranged' || e.ai === 'caster'; const want = ranged ? 150 : (e.attacks[0].reach || 30) - 6;
        if (ranged && d < 95) { this.move(e, -dx, -dy, dt); e.facing = ang; e.lockFacing = true; }
        else if (d > want + 4) { e.lockFacing = false; this.move(e, dx + (this.rand() - 0.5) * 20, dy + (this.rand() - 0.5) * 20, dt); }
        else { this.move(e, 0, 0, dt); e.facing = ang; if (e.ai !== 'boss' && this.rand() < 0.02) { const side = this.rand() < 0.5 ? 1 : -1; this.move(e, -dy * side, dx * side, dt, false); e.facing = ang; e.lockFacing = true; } }
        return;
      }
      // allied hero
      const h = e.hero; e.aiT -= dt;
      // dodge an incoming blow
      for (const f of this.ents) { if (f.team === e.team || f.dead || f.state !== 'attack' || f.hitDone) continue; const left = f.tele - f.stateT; const inRange = this.dist(f, e) < (f.cur.reach || 40) + e.r + 6 || f.cur.aoe && this.dist(f, e) < f.cur.reach + 10; if (inRange && left < 0.22 && left > 0 && (f.target === e || f.cur.aoe) && this.rand() < 0.75) { this.dodge(e, Math.atan2(e.y - f.y, e.x - f.x) + (this.rand() - 0.5)); return; } }
      const near = this.alive(1).filter(o => this.dist(o, e) < 90).length; const party = this.alive(0); const avgHp = party.reduce((s, p) => s + p.hp / p.maxHp, 0) / party.length;
      if (e.cd <= 0 && (e.id === 'wren' ? (avgHp < 0.6 || near >= 3) : (near >= 2 || (t.boss && d < 120) || (e.id === 'ysolde' && d < 200 && near >= 1) || (e.id === 'tamsin' && d < 220 && near >= 1)))) { e.facing = ang; this.heroSpecial(e); return; }
      if (h.kind === 'ranged') {
        if (d < 80) { this.move(e, -dx, -dy, dt); e.facing = ang; e.lockFacing = true; return; }
        if (d > h.reach - 20) { e.lockFacing = false; this.move(e, dx, dy, dt); return; }
        e.facing = ang; if (e.atkCd <= 0) { this.heroLight(e); e.atkCd = 0.25; } else this.move(e, 0, 0, dt); return;
      }
      if (d > h.reach - 4) { e.lockFacing = false; this.move(e, dx, dy, dt); return; }
      e.facing = ang; if (e.atkCd <= 0) { if (this.rand() < 0.2) this.heroHeavy(e); else this.heroLight(e); e.atkCd = 0.15; } else this.move(e, 0, 0, dt);
    }
    pickTarget(e) {
      const foes = this.alive(1 - e.team); if (!foes.length) return null;
      if (e.kind === 'foe') { let best = null, bs = 1e9; for (const h of foes) { const s = this.dist(e, h) / h.threat + this.rand() * 60; if (s < bs) { bs = s; best = h; } } return best; }
      let best = null, bs = 1e9; for (const f of foes) { const s = this.dist(e, f) - (f.stagger > 0 ? 80 : 0) - (f.boss ? 30 : 0) + (f.hp / f.maxHp) * 40; if (s < bs) { bs = s; best = f; } } return best;
    }
    bossPhases(e) {
      for (const p of e.phases) { if (p.done || e.hp / e.maxHp > p.at) continue; p.done = true; if (p.summon) this.summon(p.summon, e); if (p.enrage) { e.dmgMul *= p.enrage; e.baseSpd *= 1.1; this.addFx('charge_up', e.x, e.y - 10, 3 * e.scale, { life: 1.5 }); } if (p.say) this.say(e, p.say); this.shake = Math.max(this.shake, 0.5); this.events.push({ type: 'phase', e, p }); }
    }
    updateProjs(dt) {
      for (const p of this.projs) {
        p.t += dt; if (p.homing && !p.homing.dead) { const a = Math.atan2(p.homing.y - 14 - p.y, p.homing.x - p.x); const sp = Math.hypot(p.vx, p.vy); const cur = Math.atan2(p.vy, p.vx); const na = cur + clamp(angDiff(a, cur), -2.5 * dt, 2.5 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; p.ang = na; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.t > p.life || p.x < 0 || p.x > this.W || p.y < -20 || p.y > this.H) { p.dead = true; if (p.atk.big) this.explode(p); continue; }
        for (const o of this.ents) { if (o.team === p.team || o.dead) continue; if (Math.hypot(o.x - p.x, o.y - 14 - p.y) < o.r + p.r) { p.dead = true; if (p.atk.big) this.explode(p); else this.applyHit(p.src, o, p.atk); break; } }
      }
      this.projs = this.projs.filter(p => !p.dead);
    }
    explode(p) {
      this.addFx('explosion_fire', p.x, p.y + 14, 3.5); this.addFx('fire_ring', p.x, p.y + 14, 3); this.shake = Math.max(this.shake, 0.5); this.hitstop = Math.max(this.hitstop, 0.06);
      for (const o of this.ents) if (o.team !== p.team && !o.dead && Math.hypot(o.x - p.x, o.y - 14 - p.y) < p.atk.big + o.r) this.applyHit(p.src, o, p.atk);
      this.events.push({ type: 'explode' });
    }
    separate() {
      const es = this.ents.filter(e => !e.dead && e.state !== 'dash');
      for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) { const a = es[i], b = es[j]; const dx = b.x - a.x, dy = (b.y - a.y) * 1.4; const d = Math.hypot(dx, dy) || 0.01; const min = a.r + b.r + 2; if (d < min) { const push = (min - d) / d * 0.5; const wa = b.boss ? 1 : a.boss ? 0 : 0.5, wb = 1 - wa; a.x -= dx * push * 2 * wa; a.y -= dy * push / 1.4 * 2 * wa; b.x += dx * push * 2 * wb; b.y += dy * push / 1.4 * 2 * wb; this.clampIn(a); this.clampIn(b); } }
      // burning ground (Ashwalk)
      for (const f of this.fx) if (f.ground && f.burn) { f.tick = (f.tick || 0); if (this.t - f.tick > 0.5) { f.tick = this.t; for (const o of this.alive(1)) if (Math.hypot(o.x - f.x, o.y - f.y) < 26) { const d = Math.max(1, Math.round(o.maxHp * 0.02 * f.burn)); o.hp -= d; this.floater(o.x, o.y - 26, String(d), '#ff9040'); if (o.hp <= 0) this.kill(o, null); } } }
      // Wren's vigil
      const wren = this.heroes.find(h => h.id === 'wren' && !h.dead && h.talents.vigil); if (wren) { for (const h of this.alive(0)) if (h !== wren && this.dist(h, wren) < 90) h.hp = Math.min(h.maxHp, h.hp + wren.talents.vigil * 0.016); }
    }
    drainEvents() { const ev = this.events; this.events = []; return ev; }
  }
  EF.Combat = Combat;
})(typeof window !== 'undefined' ? window : globalThis);
