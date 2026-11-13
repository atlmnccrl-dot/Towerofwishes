// The fight simulation: pure logic (no DOM, no three.js), fixed 60 Hz steps, deterministic for a
// given seed and input stream. Runs in the browser and in Node tests.
//
// The view reads entities (x, z, face, anim, animT, state, tele...) and drains `events` each frame.
import { HERO, FOES, BOSSES, scaleFoe } from './defs.js';
import { UNITS } from './units.js';
import { BOSSES2 } from './bosses2.js';
import { thinkFoe, thinkBoss } from './ai.js';

const TAU = Math.PI * 2;
export const STEP = 1 / 60;
export function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
export function angTo(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
export function dist(a, b) { return Math.hypot(b.x - a.x, b.z - a.z); }
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class World {
  constructor(opts = {}) {
    this.solids = opts.solids || []; this.bounds = opts.bounds || [-60, -60, 60, 60];
    this.ents = []; this.projs = []; this.hazards = []; this.events = [];
    this.t = 0; this.nextId = 1; this.rand = mulberry(opts.seed || 7);
    this.hitstop = 0; this.slowT = 0; this.slowScale = 1; this.acc = 0;
    this.meter = 0; this.embers = 0; this.tokensMax = 2; this.paused = false;
    this.hero = null; this.combat = false;
    this.stats = { hits: 0, kills: 0, parries: 0, perfects: 0, damageTaken: 0, finishers: 0 };
  }

  emit(type, data = {}) { this.events.push({ type, t: this.t, ...data }); }
  drain() { const e = this.events; this.events = []; return e; }
  foes() { return this.ents.filter((e) => e.team === 'foe' && !e.dead); }
  alive(e) { return e && !e.dead; }

  // ------------------------------------------------------------------ spawning
  _ent(o) {
    const e = Object.assign({
      id: this.nextId++, x: 0, z: 0, vx: 0, vz: 0, kbx: 0, kbz: 0, face: 0, r: 0.4, mass: 1, hp: 1, maxHp: 1, poise: 1, maxPoise: 1,
      state: 'idle', t: 0, anim: 'idle', animT: 0, atk: null, hitSet: new Set(), iframes: 0, flash: 0, dead: false, deadT: 0,
      team: 'foe', type: 'x', def: null, ai: {}, mx: 0, mz: 0, speed: 3, tele: null, dmgMul: 1, stun: 0, armor: false, moveSpeed: 0,
    }, o);
    this.ents.push(e); return e;
  }

  spawnHero(x, z, stats = {}) {
    const s = { maxHp: HERO.maxHp, dmgMul: 1, maxTonics: HERO.tonics, unlock: {}, ...stats };
    const e = this._ent({ team: 'hero', type: 'hero', x, z, r: HERO.r, hp: s.hp ?? s.maxHp, maxHp: s.maxHp, speed: HERO.speed, poise: 999, maxPoise: 999, mass: 1.2 });
    e.stats = s; e.tonics = s.tonics ?? s.maxTonics; e.combo = 0; e.comboT = 0; e.dashCd = 0; e.buf = {}; e.charge = 0; e.face = stats.face ?? Math.PI;
    this.hero = e; return e;
  }

  spawnFoe(type, x, z, opts = {}) {
    const base = FOES[type] || UNITS[type]; if (!base) throw new Error('unknown foe ' + type);
    const def = scaleFoe(base, opts.tier || 0);
    const e = this._ent({ team: 'foe', type, def, x, z, r: def.r, mass: def.mass, hp: def.hp, maxHp: def.hp, poise: def.poise, maxPoise: def.poise, speed: def.speed, dmgMul: def.dmgMul, armor: !!def.armor, flinch: def.flinch ?? 2 });
    e.face = opts.face ?? angTo(e, this.hero || { x, z: z + 1 });
    if (opts.rise !== false) { e.state = 'spawn'; e.anim = 'rise'; e.iframes = 0.9; }
    e.ai = { cd: 0.6 + this.rand() * 0.8, strafeDir: this.rand() < 0.5 ? -1 : 1, aggro: !!opts.aggro, home: { x, z } };
    this.emit('spawn', { e }); return e;
  }

  spawnBoss(type, x, z, opts = {}) {
    const def = BOSSES[type] || BOSSES2[type]; if (!def) throw new Error('unknown boss ' + type);
    const e = this._ent({ team: 'foe', type, def, boss: true, x, z, r: def.r, mass: def.mass, hp: def.hp * (opts.hpMul || 1), maxHp: def.hp * (opts.hpMul || 1), poise: 300, maxPoise: 300, speed: def.speed, dmgMul: opts.dmgMul || 1, armor: true });
    e.face = opts.face ?? 0; e.phase = 1; e.ai = { cd: 1.5, step: 0, aggro: true }; e.state = 'idle';
    this.emit('spawn', { e, boss: true }); return e;
  }

  // ------------------------------------------------------------------ main update
  // dt in real seconds. Handles hitstop and slow motion, then advances in fixed steps.
  update(dt, input) {
    if (this.paused) return;
    if (this.hitstop > 0) { this.hitstop -= dt; this._input(input); return; }
    let scale = 1;
    if (this.slowT > 0) { this.slowT -= dt; scale = this.slowScale; }
    this.acc += Math.min(dt, 0.1) * scale;
    while (this.acc >= STEP) { this.acc -= STEP; this.step(STEP, input); input = null; }
    this._input(input);
  }

  slow(time, scale) { if (time > this.slowT) { this.slowT = time; this.slowScale = scale; } }
  stop(time) { this.hitstop = Math.max(this.hitstop, time); }

  // buffered presses survive between steps
  _input(inp) {
    if (!inp || !this.hero) return; const b = this.hero.buf;
    for (const k of ['attack', 'dash', 'parry', 'heal', 'special', 'heavy']) if (inp[k + 'Pressed']) b[k] = this.t;
    this.hero.inp = inp;
  }

  step(h, input) {
    this.t += h; this._input(input);
    const hero = this.hero;
    // AI decides first
    let attackers = 0;
    for (const e of this.ents) if (e.team === 'foe' && !e.dead && (e.state === 'windup' || e.state === 'attack')) attackers++;
    this.attackers = attackers;
    for (const e of this.ents) {
      if (e.dead) { e.deadT += h; continue; }
      e.t += h; e.animT += h;
      if (e.iframes > 0) e.iframes -= h;
      if (e.flash > 0) e.flash -= h;
      if (e === hero) this._hero(e, h);
      else if (e.boss) this._foe(e, h, true);
      else this._foe(e, h, false);
    }
    this._move(h);
    this._projectiles(h);
    this._hazards(h);
    // corpse cleanup: keep the latest 14
    const dead = this.ents.filter((e) => e.dead && e !== hero);
    if (dead.length > 14) { const old = dead.sort((a, b) => b.deadT - a.deadT).slice(0, dead.length - 14); this.ents = this.ents.filter((e) => !old.includes(e)); }
    this.combat = this.foes().some((f) => f.ai.aggro);
  }

  // ------------------------------------------------------------------ the hero
  _hero(e, h) {
    const inp = e.inp || {}; const b = e.buf; const H = HERO;
    const mlen = Math.min(1, Math.hypot(inp.mx || 0, inp.mz || 0));
    const mdir = mlen > 0.15 ? Math.atan2(inp.mx, inp.mz) : null;
    const fresh = (k, w = 0.22) => b[k] !== undefined && this.t - b[k] <= w;
    const take = (k) => { delete b[k]; };
    if (e.dashCd > 0) e.dashCd -= h;
    if (e.comboT > 0) { e.comboT -= h; if (e.comboT <= 0) e.combo = 0; }
    e.mx = 0; e.mz = 0; e.moveSpeed = 0;
    if (e.dead) return;

    const canAct = e.state === 'idle' || e.state === 'run';
    const free = () => { e.state = mlen > 0.15 ? 'run' : 'idle'; e.t = 0; e.atk = null; e.anim = e.state; };

    // global actions from neutral (or from cancel windows)
    const cancelable = canAct || (e.state === 'attack' && e.t >= e.atk.cancel) || (e.state === 'heavy' && e.t >= e.atk.cancel) || (e.state === 'parry' && e.t > H.parry.window + 0.08);
    if (cancelable && fresh('special', 0.2) && this.meter >= H.special.cost) { take('special'); return this._special(e); }
    const canDash = e.dashCd <= 0 || (e.stats.unlock.dash2 && e.dashCharges > 0 && (e.state === 'dash' ? e.t > 0.12 : true));
    if ((cancelable || (e.state === 'hurt' && e.t > 0.2) || (e.state === 'dash' && e.stats.unlock.dash2 && e.t > 0.12)) && fresh('dash', 0.2) && canDash) { take('dash'); e.dashCharges = e.dashCd > 0 ? 0 : 1; return this._dash(e, mdir); }
    if (cancelable && fresh('parry', 0.15)) { take('parry'); e.state = 'parry'; e.t = 0; e.anim = 'parry'; e.animT = 0; e.atk = null; this.emit('parryStart', { e }); return; }
    if (canAct && fresh('heal', 0.2) && e.tonics > 0 && e.hp < e.maxHp) { take('heal'); e.state = 'heal'; e.t = 0; e.anim = 'heal'; e.animT = 0; e.healed = false; return; }
    if (cancelable && inp.heavyDown && fresh('heavy', 0.3)) { take('heavy'); e.state = 'charge'; e.t = 0; e.charge = 0; e.anim = 'charge'; e.animT = 0; this._aim(e, mdir, 4.5); return; }
    if (cancelable && fresh('attack', 0.25)) {
      take('attack');
      const fin = this._finisherTarget(e);
      if (fin) return this._finisher(e, fin);
      const next = e.state === 'attack' && e.atk && e.atk.name.startsWith('L') ? e.combo : (e.comboT > 0 ? e.combo : 0);
      const atk = H.combo[next % 3];
      e.combo = (next + 1) % 3; e.comboT = atk.dur + 0.35;
      this._aim(e, mdir, 3.6);
      return this._startAttack(e, atk);
    }

    switch (e.state) {
      case 'idle': case 'run': {
        if (mdir !== null) { e.face = turn(e.face, mdir, 18 * h); e.mx = Math.sin(mdir) * mlen; e.mz = Math.cos(mdir) * mlen; e.moveSpeed = e.speed; if (e.state !== 'run') { e.state = 'run'; e.anim = 'run'; } }
        else if (e.state !== 'idle') { e.state = 'idle'; e.anim = 'idle'; }
        break;
      }
      case 'attack': case 'heavy': {
        const a = e.atk; this._lunge(e, a, h);
        if (e.t >= a.windup && e.t <= a.active) this._melee(e, a);
        if (a.name === 'H' && a.wave && !e.waved && e.t >= a.windup) { e.waved = true; this._shootWave(e); }
        if (e.t >= a.dur) free();
        break;
      }
      case 'charge': {
        e.charge = Math.min(H.heavy.chargeMax, e.charge + h);
        if (mdir !== null) { e.face = turn(e.face, mdir, 6 * h); e.mx = Math.sin(mdir) * mlen; e.mz = Math.cos(mdir) * mlen; e.moveSpeed = 1.2; }
        if (!inp.heavyDown) {
          const f = e.charge / H.heavy.chargeMax; const full = f >= 0.99;
          const a = { ...H.heavy, dmg: H.heavy.dmg + H.heavy.chargeDmg * f, poise: H.heavy.poise * (1 + f), wave: full && e.stats.unlock.wave, full };
          e.waved = false; this._startAttack(e, a, 'heavy');
          if (full) this.emit('fullCharge', { e });
        }
        break;
      }
      case 'dash': {
        const D = H.dash; e.mx = Math.sin(e.dashDir); e.mz = Math.cos(e.dashDir); e.moveSpeed = D.speed * (e.t < D.dur * 0.7 ? 1 : 0.4);
        if (e.t >= D.dur) {
          if (fresh('attack', 0.18)) { take('attack'); this._aim(e, e.dashDir, 4); return this._startAttack(e, H.dashAttack); }
          free();
        }
        break;
      }
      case 'parry': if (e.t >= H.parry.dur) free(); break;
      case 'hurt': if (e.t >= 0.36) free(); break;
      case 'heal': {
        if (mdir !== null) { e.face = turn(e.face, mdir, 8 * h); e.mx = Math.sin(mdir) * mlen; e.mz = Math.cos(mdir) * mlen; e.moveSpeed = 1.8; }
        if (!e.healed && e.t >= H.heal.at) { e.healed = true; e.tonics--; const amt = Math.round(e.maxHp * H.heal.amount); e.hp = Math.min(e.maxHp, e.hp + amt); this.emit('heal', { e, amt }); }
        if (e.t >= H.heal.dur) free();
        break;
      }
      case 'finisher': {
        const tg = e.target; const F = H.finisher;
        if (tg && !e.finHit && e.t >= F.hitAt) {
          e.finHit = true; const dmg = Math.round(HERO.combo[2].dmg * F.dmgMul * e.stats.dmgMul);
          this._damage(e, tg, dmg, { poise: 0, kb: 6, heavy: true, finisher: true });
          e.hp = Math.min(e.maxHp, e.hp + F.heal); this.meter = Math.min(100, this.meter + F.meter);
          this.stop(0.14); this.emit('shake', { amt: 0.5 });
        }
        if (e.t >= F.dur) { e.iframes = 0.15; free(); }
        break;
      }
      case 'special': {
        const S = H.special; const k = Math.floor((e.t - 0.3) / 0.15);
        if (e.t > 0.3 && k < S.hits && k !== e.spK) {
          e.spK = k;
          for (const f of this.foes()) if (dist(e, f) <= S.radius) this._damage(e, f, S.dmg * e.stats.dmgMul, { poise: 25, kb: 1.5, special: true });
          this.emit('specialHit', { e, k });
        }
        if (e.t >= S.dur) { e.iframes = 0.3; free(); }
        break;
      }
    }
  }

  _aim(e, mdir, range) {
    // soft lock: nearest foe in reach, preferring the stick direction
    let best = null, bs = Infinity;
    for (const f of this.foes()) {
      if (f.state === 'spawn' || f.hidden) continue;
      const d = dist(e, f); if (d > range + f.r) continue;
      const a = angTo(e, f); const off = Math.abs(angDiff(mdir ?? e.face, a));
      const score = d + off * 1.6;
      if (score < bs) { bs = score; best = f; }
    }
    if (best) e.face = angTo(e, best); else if (mdir !== null && mdir !== undefined) e.face = mdir;
    if (this.hero?.inp?.aim && this.hero.inp.mouse && !best) { const p = this.hero.inp.aim; e.face = Math.atan2(p.x - e.x, p.z - e.z); }
    e.lockOn = best;
  }

  _startAttack(e, atk, state = 'attack') {
    e.state = state; e.t = 0; e.atk = atk; e.anim = atk.anim; e.animT = 0; e.hitSet = new Set(); e.chained = false;
    this.emit('swing', { e, atk });
  }

  _lunge(e, a, h) {
    const lt = a.lungeT || [0, a.active];
    if (e.t >= lt[0] && e.t <= lt[1] && a.lunge) {
      let sp = a.lunge;
      const tg = e.team === 'hero' ? e.lockOn : this.hero;
      if (tg && !tg.dead) { const d = dist(e, tg) - e.r - tg.r; if (d < 0.5) sp *= Math.max(0, d / 0.5); }
      e.mx = Math.sin(e.face); e.mz = Math.cos(e.face); e.moveSpeed = sp;
    }
  }

  _dash(e, mdir) {
    const D = HERO.dash; e.state = 'dash'; e.t = 0; e.anim = 'dash'; e.animT = 0; e.atk = null;
    e.dashDir = mdir ?? e.face; e.face = e.dashDir; e.iframes = D.iframes; e.perfected = false; e.dashCd = D.dur + D.cooldown; e.dashAt = this.t;
    this.emit('dash', { e });
  }

  _special(e) {
    this.meter = 0; e.state = 'special'; e.t = 0; e.anim = 'special'; e.animT = 0; e.iframes = HERO.special.dur + 0.3; e.spK = -1;
    this.emit('special', { e }); this.slow(0.35, 0.35);
  }

  _finisherTarget(e) {
    let best = null, bd = 2.4;
    for (const f of this.foes()) { if (f.state !== 'stagger' || f.boss && f.stagT === undefined) continue; const d = dist(e, f) - f.r; if (d < bd) { bd = d; best = f; } }
    return best;
  }
  _finisher(e, tg) {
    e.state = 'finisher'; e.t = 0; e.anim = 'finisher'; e.animT = 0; e.target = tg; e.finHit = false; e.iframes = HERO.finisher.dur + 0.1;
    e.face = angTo(e, tg); tg.state = 'finished'; tg.t = 0; tg.anim = 'finished'; tg.animT = 0; tg.face = angTo(tg, e);
    // step into place
    const d = dist(e, tg); const want = tg.r + e.r + 0.35; e.x = tg.x - Math.sin(e.face) * want; e.z = tg.z - Math.cos(e.face) * want;
    if (d > 6) { e.x = tg.x; e.z = tg.z; }
    this.stats.finishers++; this.emit('finisher', { e, target: tg }); this.slow(0.6, 0.45);
  }

  _shootWave(e) {
    this.projs.push({ id: this.nextId++, kind: 'wave', team: 'hero', x: e.x + Math.sin(e.face) * 0.8, z: e.z + Math.cos(e.face) * 0.8, vx: Math.sin(e.face) * 13, vz: Math.cos(e.face) * 13, r: 1.1, dmg: 18 * e.stats.dmgMul, life: 0.55, hitSet: new Set(), pierce: true, face: e.face, src: e });
    this.emit('wave', { e });
  }

  // ------------------------------------------------------------------ hits
  _inShape(a, atk, t) {
    const dx = t.x - a.x, dz = t.z - a.z; const d = Math.hypot(dx, dz);
    const shape = atk.shape || 'arc';
    if (shape === 'circle') { const cx = a.x + Math.sin(a.face) * (atk.offset || 0), cz = a.z + Math.cos(a.face) * (atk.offset || 0); return Math.hypot(t.x - cx, t.z - cz) <= atk.radius + t.r; }
    if (shape === 'line') { const fx = Math.sin(a.face), fz = Math.cos(a.face); const along = dx * fx + dz * fz; const lat = Math.abs(dx * fz - dz * fx); return along >= -t.r && along <= atk.range + t.r && lat <= atk.width / 2 + t.r; }
    if (d > atk.range + t.r) return false;
    if (d < t.r + a.r * 0.5) return true;
    return Math.abs(angDiff(a.face, Math.atan2(dx, dz))) <= atk.arc / 2 + Math.atan2(t.r, d);
  }

  _melee(a, atk) {
    const targets = a.team === 'hero' ? this.foes() : [this.hero].filter((x) => x && !x.dead);
    for (const t of targets) {
      if (a.hitSet.has(t.id) || t.state === 'spawn' || t.hidden) continue;
      if (!this._inShape(a, atk, t)) continue;
      a.hitSet.add(t.id);
      if (a.team === 'hero') this._damage(a, t, atk.dmg * a.stats.dmgMul, { poise: atk.poise, kb: atk.kb, heavy: atk.heavy, atk });
      else this._damage(a, t, atk.dmg * a.dmgMul, { kb: atk.kb, heavy: atk.heavy, atk, melee: true });
    }
  }

  // The one place damage happens.
  _damage(src, dst, dmg, o = {}) {
    if (dst.dead) return false;
    const hero = this.hero;
    if (dst === hero) {
      // perfect dodge: a blow that lands inside the first part of a dash
      if (dst.state === 'dash' && dst.iframes > 0) {
        if (this.t - dst.dashAt <= HERO.dash.perfectWindow + 0.06 && !dst.perfected) { dst.perfected = true; this.meter = Math.min(100, this.meter + HERO.meter.onPerfect); this.stats.perfects++; this.slow(0.7, 0.3); this.emit('perfect', { e: dst, src }); }
        return false;
      }
      if (dst.state === 'parry' && dst.t <= HERO.parry.window && (o.melee || o.proj) && !o.unparryable) {
        this.stats.parries++; this.meter = Math.min(100, this.meter + HERO.meter.onParry);
        this.emit('parry', { e: dst, src, x: (src.x + dst.x) / 2, z: (src.z + dst.z) / 2 }); this.stop(0.13);
        if (o.melee && src) {
          if (src.boss) { src.stun = 0.9; src.state = 'stagger'; src.t = 0; src.anim = 'stagger'; src.animT = 0; src.stagT = 0.9; src.tele = null; }
          else this._stagger(src, 1.7);
        }
        dst.t = HERO.parry.window; // keep the parry window open briefly for a follow-up
        return 'parried';
      }
      if (dst.iframes > 0 || dst.state === 'finisher' || dst.state === 'special') return false;
      const real = Math.round(dmg);
      dst.hp -= real; dst.flash = 0.15; dst.iframes = 0.55; this.stats.damageTaken += real;
      this.meter = Math.min(100, this.meter + HERO.meter.onHurt);
      const ang = src ? Math.atan2(dst.x - src.x, dst.z - src.z) : 0; const kb = (o.kb || 3);
      dst.kbx = Math.sin(ang) * kb; dst.kbz = Math.cos(ang) * kb;
      this.emit('hit', { src, dst, dmg: real, x: dst.x, z: dst.z, ang, heavy: o.heavy, hero: true });
      this.stop(o.heavy ? 0.1 : 0.06); this.emit('shake', { amt: o.heavy ? 0.45 : 0.25 });
      if (dst.hp <= 0) { dst.hp = 0; dst.dead = true; dst.state = 'dead'; dst.anim = 'die'; dst.animT = 0; this.emit('heroDeath', { e: dst }); this.slow(1.2, 0.25); }
      else if (dst.state !== 'heal' || o.heavy) { dst.state = 'hurt'; dst.t = 0; dst.anim = 'hurt'; dst.animT = 0; dst.atk = null; }
      return true;
    }
    // a foe
    if (dst.state === 'spawn' || dst.state === 'finished' && !o.finisher) return false;
    if (dst.iframes > 0 && !o.finisher) return false;
    const ang = Math.atan2(dst.x - src.x, dst.z - src.z);
    // shield: frontal light blows are blocked until the guard breaks
    if (dst.def.shield && !o.special && !o.finisher && dst.state !== 'stagger' && dst.state !== 'attack' && dst.state !== 'windup' && Math.abs(angDiff(dst.face, ang + Math.PI)) < 1.2) {
      dst.poise -= (o.poise || 10) * (o.heavy ? 1.2 : 0.5); dst.flash = 0.06;
      this.emit('block', { e: dst, src, x: dst.x - Math.sin(ang) * 0.5, z: dst.z - Math.cos(ang) * 0.5 });
      if (src === hero && !o.heavy) { hero.kbx = -Math.sin(ang) * 3; hero.kbz = -Math.cos(ang) * 3; }
      if (dst.poise <= 0) this._stagger(dst, 1.8);
      this.stop(0.05);
      return false;
    }
    let real = dmg;
    if (dst.state === 'stagger') real *= 1.4;
    real = Math.round(real);
    dst.hp -= real; dst.flash = 0.12; this.stats.hits++;
    if (src === hero) this.meter = Math.min(100, this.meter + HERO.meter.onHit);
    const kb = (o.kb || 2) / Math.max(0.6, dst.mass) * (dst.boss ? 0.15 : 1);
    if (!(dst.armor && (dst.state === 'windup' || dst.state === 'attack'))) { dst.kbx = Math.sin(ang) * kb; dst.kbz = Math.cos(ang) * kb; }
    this.emit('hit', { src, dst, dmg: real, x: dst.x, z: dst.z, ang, heavy: o.heavy, finisher: o.finisher, special: o.special, wave: o.wave });
    if (!o.special) this.stop(o.finisher ? 0.16 : (o.heavy ? 0.085 : 0.045));
    if (o.heavy) this.emit('shake', { amt: 0.3 });
    if (dst.hp <= 0) return this._kill(dst, src, o);
    // poise and interrupts
    if (!dst.boss) {
      dst.poise -= o.poise || 0;
      if (dst.poise <= 0 && dst.state !== 'stagger') this._stagger(dst, 1.7);
      else if (!dst.armor && dst.state !== 'stagger' && (dst.flinch >= 1 || o.heavy && dst.flinch >= 0.5)) {
        // a foe flinches a few times, then fights through the blows (button mashing gets punished)
        dst.flinch -= o.heavy ? 0.5 : 1;
        dst.state = 'hurt'; dst.t = 0; dst.anim = 'hurt'; dst.animT = 0; dst.atk = null; dst.tele = null; dst.stun = o.heavy ? 0.55 : 0.32;
      }
    } else {
      dst.poise -= (o.poise || 0) * 0.5;
      if (dst.poise <= 0 && dst.state !== 'stagger') { dst.poise = dst.maxPoise; dst.state = 'stagger'; dst.t = 0; dst.anim = 'stagger'; dst.animT = 0; dst.stagT = 2.2; dst.tele = null; dst.atk = null; this.emit('stagger', { e: dst }); }
    }
    return true;
  }

  _stagger(e, time) {
    e.state = 'stagger'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.atk = null; e.tele = null; e.stagT = time; e.poise = e.maxPoise;
    this.emit('stagger', { e });
  }

  _kill(e, src, o) {
    e.hp = 0; e.dead = true; e.state = 'dead'; e.anim = o.finisher ? 'dieHard' : 'die'; e.animT = 0; e.tele = null; e.deadT = 0;
    this.stats.kills++; this.meter = Math.min(100, this.meter + HERO.meter.onKill);
    const drop = e.boss ? 0 : (e.def.drop || 5); this.embers += drop;
    this.emit('kill', { e, src, drop, x: e.x, z: e.z, boss: !!e.boss });
    if (this.foes().length === 0 || e.boss) this.slow(e.boss ? 2.2 : 0.55, e.boss ? 0.2 : 0.35);
    return 'kill';
  }

  // ------------------------------------------------------------------ foes
  _foe(e, h, boss) {
    if (e.stun > 0) e.stun -= h;
    if (!boss) e.flinch = Math.min(e.def.flinch ?? 2, (e.flinch ?? (e.def.flinch ?? 2)) + h / 1.1);
    e.mx = 0; e.mz = 0; e.moveSpeed = 0;
    switch (e.state) {
      case 'spawn': if (e.t >= 0.9) { e.state = 'idle'; e.t = 0; e.anim = 'idle'; } return;
      case 'hurt': if (e.stun <= 0) { e.state = 'idle'; e.anim = 'idle'; e.t = 0; e.ai.cd = Math.max(e.ai.cd, 0.35); } return;
      case 'stagger': if (e.t >= e.stagT) { e.state = 'idle'; e.anim = 'idle'; e.t = 0; e.ai.cd = 0.5; } return;
      case 'finished': if (e.t > 1.1) { e.state = 'idle'; e.anim = 'idle'; e.t = 0; e.ai.cd = 0.8; } return;
      case 'windup': case 'attack': return this._foeAttack(e, h);
    }
    if (boss) thinkBoss(this, e, h); else thinkFoe(this, e, h);
  }

  // Foes (and bosses) begin an attack: windup with a telegraph, then the hit.
  foeAttack(e, atk) {
    e.state = 'windup'; e.t = 0; e.atk = atk; e.anim = atk.anim; e.animT = 0; e.hitSet = new Set(); e.chainDone = false; e.fired = false;
    e.tele = atk.tele === 'none' ? null : { shape: atk.tele === 'circleAt' ? 'circle' : (atk.tele || atk.shape || 'arc'), range: atk.teleRange || atk.range || atk.radius, arc: atk.arc, width: atk.width, radius: atk.radius, offset: atk.offset, dur: atk.windup };
    this.emit('tele', { e, atk });
  }

  _foeAttack(e, h) {
    const a = e.atk; const hero = this.hero;
    // track the hero during the first part of the windup
    if (e.t < a.windup * 0.7 && hero && !hero.dead) e.face = turn(e.face, angTo(e, hero), (a.turn || 5) * h);
    if (!a.leap) this._lunge(e, a, h);
    if (a.leap) {
      if (e.t < a.windup * 0.85 && hero && !hero.dead) { e.leapTo = { x: hero.x, z: hero.z }; if (e.tele) e.tele.at = e.leapTo; }
      if (e.t >= a.windup && !e.leapFrom) { e.leapFrom = { x: e.x, z: e.z }; e.iframes = a.active - a.windup; e.landed = false; }
      if (e.leapFrom && !e.landed) {
        const k = Math.min(1, (e.t - a.windup) / (a.active - a.windup));
        e.x = e.leapFrom.x + (e.leapTo.x - e.leapFrom.x) * k; e.z = e.leapFrom.z + (e.leapTo.z - e.leapFrom.z) * k; e.leapH = Math.sin(k * Math.PI) * 3.5;
        if (k >= 1) { e.landed = true; e.leapH = 0; e.leapFrom = null; e.hitSet = new Set(); this._melee(e, { ...a, shape: 'circle', offset: 0 }); if (a.onStrike) a.onStrike(this, e); this.emit('land', { e }); this.emit('shake', { amt: 0.6 }); }
      }
    }
    if (e.t >= a.windup && e.state === 'windup') { e.state = 'attack'; if (!a.leap) e.tele = null; this.emit('foeStrike', { e, atk: a }); if (a.onStrike && !a.leap) a.onStrike(this, e); }
    if (a.ranged) { if (!e.fired && e.t >= a.windup) { e.fired = true; this._fire(e, a.ranged); } }
    else if (!a.leap && a.dmg && e.t >= a.windup && e.t <= a.active) this._melee(e, a);
    if (a.chain && !e.chainDone && e.t >= a.chain.at) {
      // second blow of a combo
      e.chainDone = true; e.hitSet = new Set(); e.state = 'windup';
      e.tele = { shape: 'arc', range: a.range, arc: a.arc, dur: a.chain.windup - a.chain.at };
      e.atk = { ...a, windup: a.chain.windup, active: a.chain.active, lungeT: [a.chain.at, a.chain.active], chain: null, anim: a.anim };
      e.animT = 0; e.t = a.chain.at; this.emit('tele', { e, atk: e.atk });
    }
    if (e.t >= a.dur) { e.state = 'idle'; e.anim = 'idle'; e.t = 0; e.atk = null; e.tele = null; e.leapH = 0; e.ai.cd = (e.def.ranged ? 1.2 : 0.7) + this.rand() * 0.9; }
  }

  _fire(e, r) {
    const hero = this.hero; const n = r.fan || 1;
    const base = hero ? angTo(e, hero) : e.face;
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i - (n - 1) / 2) * r.spread : 0);
      const sx = e.x + Math.sin(a) * (e.r + 0.4), sz = e.z + Math.cos(a) * (e.r + 0.4);
      this.projs.push({ id: this.nextId++, kind: r.kind, team: 'foe', x: sx, z: sz, y: r.y ?? 1.2, vx: Math.sin(a) * r.speed, vz: Math.cos(a) * r.speed, r: r.r, dmg: r.dmg * e.dmgMul, life: r.life, homing: r.homing || 0, reflect: r.reflect, src: e, face: a, hitSet: new Set() });
    }
    this.emit('fire', { e, kind: r.kind });
  }

  // ------------------------------------------------------------------ projectiles and hazards
  _projectiles(h) {
    const hero = this.hero;
    for (const p of this.projs) {
      p.life -= h; if (p.life <= 0) { p.dead = true; continue; }
      if (p.homing && hero && !hero.dead && p.team === 'foe') {
        const want = Math.atan2(hero.x - p.x, hero.z - p.z); const cur = Math.atan2(p.vx, p.vz); const sp = Math.hypot(p.vx, p.vz);
        const na = turn(cur, want, p.homing * h); p.vx = Math.sin(na) * sp; p.vz = Math.cos(na) * sp; p.face = na;
      }
      p.x += p.vx * h; p.z += p.vz * h;
      if (p.kind !== 'wave' && this._blocked(p.x, p.z, 0.05)) { p.dead = true; this.emit('projHit', { p, wall: true }); continue; }
      if (p.team === 'foe') {
        if (hero && !hero.dead && Math.hypot(hero.x - p.x, hero.z - p.z) < hero.r + p.r) {
          const res = this._damage(p.src, hero, p.dmg, { kb: 3, proj: true });
          if (res === 'parried' && p.reflect) { p.team = 'hero'; p.vx = -p.vx * 1.4; p.vz = -p.vz * 1.4; p.dmg *= 2.5; p.homing = 0; p.life = 2; p.hitSet = new Set(); this.emit('reflect', { p }); }
          else if (res !== false || hero.state !== 'dash') { p.dead = true; this.emit('projHit', { p }); }
        }
      } else {
        for (const f of this.foes()) {
          if (p.hitSet.has(f.id) || Math.hypot(f.x - p.x, f.z - p.z) > f.r + p.r) continue;
          p.hitSet.add(f.id); this._damage(hero, f, p.dmg, { poise: 20, kb: 4, wave: p.kind === 'wave' });
          if (!p.pierce) { p.dead = true; this.emit('projHit', { p }); break; }
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  // hazard: { shape:'circle'|'ring'|'line', x, z, r, r0, r1, warn, life, dmg, face, len, width }
  addHazard(hz) { const h = { t: 0, hitSet: new Set(), ...hz }; this.hazards.push(h); this.emit('hazard', { h }); return h; }
  _hazards(h) {
    const hero = this.hero;
    for (const z of this.hazards) {
      z.t += h; if (z.t >= z.warn + z.life) { z.dead = true; continue; }
      if (z.t < z.warn || !hero || hero.dead || z.hitSet.has(hero.id)) continue;
      if (!z.started) { z.started = true; this.emit('hazardGo', { h: z }); }
      const d = Math.hypot(hero.x - z.x, hero.z - z.z); let hit = false;
      if (z.shape === 'circle') hit = d < z.r + hero.r;
      else if (z.shape === 'ring') { const k = (z.t - z.warn) / z.life; const rr = z.r0 + (z.r1 - z.r0) * k; hit = Math.abs(d - rr) < 0.45 + hero.r; }
      else if (z.shape === 'line') { const fx = Math.sin(z.face), fz = Math.cos(z.face); const dx = hero.x - z.x, dz = hero.z - z.z; const al = dx * fx + dz * fz; hit = al > 0 && al < z.len && Math.abs(dx * fz - dz * fx) < z.width / 2 + hero.r; }
      if (hit) { const res = this._damage(z.src || null, hero, z.dmg, { kb: z.kb || 5, heavy: true, unparryable: true }); if (res !== false || z.once) z.hitSet.add(hero.id); }
    }
    this.hazards = this.hazards.filter((z) => !z.dead);
  }

  // ------------------------------------------------------------------ movement and collision
  _move(h) {
    for (const e of this.ents) {
      if (e.dead) { e.kbx *= Math.pow(0.02, h); e.kbz *= Math.pow(0.02, h); this._push(e, e.kbx * h, e.kbz * h); continue; }
      const sp = e.moveSpeed; const accel = e.team === 'hero' ? (e.state === 'dash' ? 200 : 60) : 22;
      const tvx = e.mx * sp, tvz = e.mz * sp;
      e.vx += clamp(tvx - e.vx, accel * h); e.vz += clamp(tvz - e.vz, accel * h);
      e.kbx *= Math.pow(0.004, h); e.kbz *= Math.pow(0.004, h);
      this._push(e, (e.vx + e.kbx) * h, (e.vz + e.kbz) * h);
    }
    // separation
    const L = this.ents;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (a.dead || b.dead) continue;
      if ((a.state === 'dash' || b.state === 'dash') && a.team !== b.team) continue;
      const dx = b.x - a.x, dz = b.z - a.z; const d = Math.hypot(dx, dz); const min = a.r + b.r;
      if (d < min && d > 1e-5) {
        const push = (min - d); const ma = a.mass, mb = b.mass; const ka = mb / (ma + mb), kb = ma / (ma + mb);
        this._push(a, -dx / d * push * ka, -dz / d * push * ka); this._push(b, dx / d * push * kb, dz / d * push * kb);
      }
    }
  }

  _push(e, dx, dz) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.25));
    for (let s = 0; s < steps; s++) { e.x += dx / steps; e.z += dz / steps; this._resolve(e); }
  }

  _resolve(e) {
    const [bx0, bz0, bx1, bz1] = this.bounds;
    e.x = Math.max(bx0 + e.r, Math.min(bx1 - e.r, e.x)); e.z = Math.max(bz0 + e.r, Math.min(bz1 - e.r, e.z));
    for (const s of this.solids) {
      if (s.open || s.off) continue;
      if (s.r !== undefined) {
        const dx = e.x - s.x, dz = e.z - s.z; const d = Math.hypot(dx, dz); const min = s.r + e.r;
        if (d < min) { if (d < 1e-5) { e.x += min; continue; } e.x = s.x + dx / d * min; e.z = s.z + dz / d * min; }
      } else {
        const cx = Math.max(s.x0, Math.min(s.x1, e.x)), cz = Math.max(s.z0, Math.min(s.z1, e.z));
        const dx = e.x - cx, dz = e.z - cz; const d2 = dx * dx + dz * dz;
        if (d2 < e.r * e.r) {
          if (d2 > 1e-8) { const d = Math.sqrt(d2); e.x = cx + dx / d * e.r; e.z = cz + dz / d * e.r; }
          else { // centre inside the box: push out the shortest way
            const l = e.x - s.x0, r = s.x1 - e.x, t = e.z - s.z0, b = s.z1 - e.z; const m = Math.min(l, r, t, b);
            if (m === l) e.x = s.x0 - e.r; else if (m === r) e.x = s.x1 + e.r; else if (m === t) e.z = s.z0 - e.r; else e.z = s.z1 + e.r;
          }
        }
      }
    }
  }

  _blocked(x, z, r = 0) {
    for (const s of this.solids) {
      if (s.open || s.off || s.h < 1.0) continue;
      if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r + r) return true; }
      else if (x > s.x0 - r && x < s.x1 + r && z > s.z0 - r && z < s.z1 + r) return true;
    }
    return false;
  }

  // line of sight for AI, ignoring see-through solids (fences, gates)
  sees(a, b) {
    const d = dist(a, b); const n = Math.ceil(d / 0.5);
    for (let i = 1; i < n; i++) {
      const x = a.x + (b.x - a.x) * i / n, z = a.z + (b.z - a.z) * i / n;
      for (const s of this.solids) {
        if (s.open || s.off || s.low || s.h < 1.6) continue;
        if (s.r !== undefined) { if (Math.hypot(x - s.x, z - s.z) < s.r) return false; }
        else if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1) return false;
      }
    }
    return true;
  }
}

export function turn(a, b, max) { const d = angDiff(a, b); return a + Math.max(-max, Math.min(max, d)); }
function clamp(v, m) { return Math.max(-m, Math.min(m, v)); }
