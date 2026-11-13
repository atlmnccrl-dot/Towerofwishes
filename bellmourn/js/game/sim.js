// The fight simulation: pure logic (no DOM, no three.js), fixed 60 Hz steps, deterministic for a
// given seed and input stream. Runs in the browser and in Node tests.
//
// The view reads entities (x, z, face, anim, animT, state, tele, status...) and drains `events` each frame.
import { FOES, BOSSES, scaleFoe } from './defs.js';
import { UNITS } from './units.js';
import { BOSSES2 } from './bosses2.js';
import { thinkFoe, thinkBoss } from './ai.js';
import { HEROES, AFFIXES, rankDmg, rankCd, heroStats } from './heroes.js';

const TAU = Math.PI * 2;
export const STEP = 1 / 60;
export function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
export function angTo(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
export function dist(a, b) { return Math.hypot(b.x - a.x, b.z - a.z); }
export function wrap(a) { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; }
export function turn(a, b, max) { const d = angDiff(a, b); return wrap(a + Math.max(-max, Math.min(max, d))); }
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const DASH = { dur: 0.24, speed: 15, iframes: 0.2, recharge: 0.7, perfectWindow: 0.16 };
const HEAL = { dur: 0.95, at: 0.5 };
const FIN = { dur: 0.95, hitAt: 0.55, mul: 4.5, heal: 8, meter: 10 };
const METER = { onHit: 2.2, onPerfect: 22, onKill: 5, onHurt: 1.5 };
const NONE = { mx: 0, mz: 0 };
const PRESS = ['attack', 'dash', 'skill1', 'skill2', 'ult', 'heal'];

export class World {
  constructor(opts = {}) {
    this.solids = opts.solids || []; this.bounds = opts.bounds || [-60, -60, 60, 60];
    this.ents = []; this.projs = []; this.hazards = []; this.zones = []; this.events = [];
    this.t = 0; this.nextId = 1; this.rand = mulberry(opts.seed || 7);
    this.hitstop = 0; this.slowT = 0; this.slowScale = 1; this.acc = 0;
    this.meter = 0; this.embers = 0; this.tokensMax = 2; this.paused = false;
    this.hero = null; this.combat = false;
    this.stats = { hits: 0, kills: 0, perfects: 0, damageTaken: 0, finishers: 0, crits: 0 };
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
      team: 'foe', type: 'x', def: null, ai: {}, mx: 0, mz: 0, speed: 3, tele: null, dmgMul: 1, stun: 0, armor: false, moveSpeed: 0, status: {},
    }, o);
    this.ents.push(e); return e;
  }

  // stats: the result of heroStats(save, heroId) (or a partial object in tests)
  spawnHero(x, z, stats = {}) {
    const kit = stats.kit || HEROES[stats.heroId || 'warden'];
    const s = { maxHp: kit.hp, dmgMul: 1, maxTonics: 3, tonicHeal: 0.45, dashCharges: 1, crit: 0, cdMul: 1, ultRate: 1, speedMul: 1, dmgTaken: 1 - (kit.armor || 0), revives: 0, relics: [], trait: {},
      abilities: kit.abilities.slice(0, 2).map((id) => ({ id, rank: 1 })), ult: { id: kit.ult, rank: 1 }, ...stats, kit };
    const e = this._ent({ team: 'hero', type: 'hero', heroId: kit.id, x, z, r: 0.38, hp: s.hp ?? s.maxHp, maxHp: s.maxHp, speed: kit.speed * s.speedMul, poise: 999, maxPoise: 999, mass: 1.2 });
    e.stats = s; e.kit = kit; e.tonics = s.tonics ?? s.maxTonics; e.combo = 0; e.comboT = 0; e.buf = {}; e.face = stats.face ?? Math.PI;
    e.cds = [0, 0]; e.dashCharges = s.dashCharges; e.dashT = 0; e.revives = s.revives; e.buffs = {}; e.shotT = 0;
    this.hero = e; return e;
  }

  spawnFoe(type, x, z, opts = {}) {
    const base = FOES[type] || UNITS[type]; if (!base) throw new Error('unknown foe ' + type);
    const def = scaleFoe(base, opts.tier || 0);
    const e = this._ent({ team: 'foe', type, def, x, z, r: def.r, mass: def.mass, hp: def.hp, maxHp: def.hp, poise: def.poise, maxPoise: def.poise, speed: def.speed, dmgMul: def.dmgMul, armor: !!def.armor, flinch: def.flinch ?? 2 });
    e.face = opts.face ?? angTo(e, this.hero || { x, z: z + 1 });
    if (opts.rise !== false) { e.state = 'spawn'; e.anim = 'rise'; e.iframes = 0.9; }
    e.ai = { cd: 0.6 + this.rand() * 0.8, strafeDir: this.rand() < 0.5 ? -1 : 1, aggro: !!opts.aggro, home: { x, z }, passive: !!opts.passive };
    if (opts.elite && AFFIXES[opts.elite]) this._makeElite(e, opts.elite);
    this.emit('spawn', { e }); return e;
  }

  _makeElite(e, affix) {
    const A = AFFIXES[affix]; e.elite = affix;
    e.maxHp = e.hp = Math.round(e.hp * 1.8); e.dmgMul *= 1.25; e.r *= 1.12; e.poise = e.maxPoise = e.maxPoise * 1.5;
    if (A.speed) e.speed *= A.speed;
    if (A.shield) e.shield = Math.round(e.maxHp * A.shield);
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

  // Buffered presses survive between steps. A null input keeps the last one; pass NONE to stop the hero.
  _input(inp) {
    if (!inp || !this.hero) return; const b = this.hero.buf;
    for (const k of PRESS) if (inp[k + 'Pressed']) b[k] = this.t;
    this.hero.inp = inp;
  }
  // Clear the hero's held input (cutscenes, death, the ending).
  idle() { if (this.hero) { this.hero.inp = NONE; this.hero.buf = {}; } }

  step(h, input) {
    this.t += h; this._input(input);
    const hero = this.hero;
    let attackers = 0;
    for (const e of this.ents) if (e.team === 'foe' && !e.dead && (e.state === 'windup' || e.state === 'attack')) attackers++;
    this.attackers = attackers;
    for (const e of this.ents) {
      if (e.dead) { e.deadT += h; continue; }
      e.t += h; e.animT += h;
      if (e.iframes > 0) e.iframes -= h;
      if (e.flash > 0) e.flash -= h;
      this._status(e, h);
      if (e.dead) continue;
      if (e === hero) this._hero(e, h);
      else if (e.boss) this._foe(e, h, true);
      else this._foe(e, h, false);
    }
    this._move(h);
    this._projectiles(h);
    this._hazards(h);
    this._zones(h);
    const dead = this.ents.filter((e) => e.dead && e !== hero);
    if (dead.length > 14) { const old = new Set(dead.sort((a, b) => b.deadT - a.deadT).slice(0, dead.length - 14)); this.ents = this.ents.filter((e) => !old.has(e)); }
    this.combat = this.foes().some((f) => f.ai.aggro);
  }

  // ------------------------------------------------------------------ statuses
  // burn/bleed/poison: damage over time; frost: slow; stun: no action; root: no movement.
  applyStatus(e, kind, o = {}) {
    if (e.dead || (e.boss && (kind === 'stun' || kind === 'root'))) return;
    const s = e.status; const dur = o.dur ?? { burn: 3, bleed: 4, poison: 4, frost: 2, stun: 1.2, root: 2.2 }[kind];
    if (kind === 'bleed') { const cur = s.bleed; const stacks = Math.min(3, (cur ? cur.stacks : 0) + 1); s.bleed = { t: dur, dps: o.dps ?? 4, stacks, tick: cur ? cur.tick : 0.5 }; }
    else if (kind === 'burn' || kind === 'poison') s[kind] = { t: Math.max(dur, s[kind]?.t || 0), dps: Math.max(o.dps ?? 5, s[kind]?.dps || 0), tick: s[kind]?.tick ?? 0.5 };
    else s[kind] = { t: Math.max(dur, s[kind]?.t || 0) };
    if (kind === 'stun' && e.team === 'foe' && !e.boss) { e.state = 'hurt'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.atk = null; e.tele = null; e.stun = dur; }
    this.emit('status', { e, kind });
  }
  _status(e, h) {
    const s = e.status;
    for (const k in s) {
      const v = s[k]; v.t -= h;
      if ((k === 'burn' || k === 'bleed' || k === 'poison') && (v.tick -= h) <= 0) {
        v.tick += 0.5; const amt = Math.max(1, Math.round(v.dps * (v.stacks || 1) * 0.5));
        if (e.team === 'hero') this._dotHero(e, amt, k); else this._dot(e, amt, k);
      }
      if (v.t <= 0) delete s[k];
    }
  }
  _dot(e, amt, kind) {
    if (e.dead) return; e.hp -= amt; this.emit('dot', { e, dmg: amt, kind });
    if (e.hp <= 0) this._kill(e, this.hero, { dot: true });
  }
  _dotHero(e, amt, kind) {
    if (e.dead || e.state === 'special') return;
    e.hp -= Math.max(1, Math.round(amt * e.stats.dmgTaken * (e.buffs.ward > 0 ? 0.5 : 1))); this.emit('dot', { e, dmg: amt, kind });
    if (e.hp <= 0) this._heroDown(e);
  }

  // ------------------------------------------------------------------ the hero
  _hero(e, h) {
    const inp = e.inp || NONE; const b = e.buf; const K = e.kit; const S = e.stats;
    const mlen = Math.min(1, Math.hypot(inp.mx || 0, inp.mz || 0));
    const mdir = mlen > 0.15 ? Math.atan2(inp.mx, inp.mz) : null;
    const fresh = (k, w = 0.22) => b[k] !== undefined && this.t - b[k] <= w;
    const take = (k) => { delete b[k]; };
    if (e.dashCharges < S.dashCharges) { e.dashT += h; if (e.dashT >= DASH.recharge) { e.dashCharges++; e.dashT = 0; } }
    for (let i = 0; i < 2; i++) if (e.cds[i] > 0) e.cds[i] -= h;
    for (const k in e.buffs) { e.buffs[k] -= h; if (e.buffs[k] <= 0) delete e.buffs[k]; }
    if (e.comboT > 0) { e.comboT -= h; if (e.comboT <= 0) e.combo = 0; }
    if (e.shotT > 0) e.shotT -= h;
    e.mx = 0; e.mz = 0; e.moveSpeed = 0;
    const slowK = (e.status.frost ? 0.6 : 1);
    const walk = (k) => { if (mdir !== null) { e.mx = Math.sin(mdir) * mlen; e.mz = Math.cos(mdir) * mlen; e.moveSpeed = e.speed * k * slowK; } };

    const canAct = e.state === 'idle' || e.state === 'run' || (e.state === 'shoot' && e.t > 0.05);
    const free = () => { e.state = mlen > 0.15 ? 'run' : 'idle'; e.t = 0; e.atk = null; e.anim = e.state; };
    const cancelable = canAct || (e.state === 'attack' && e.t >= e.atk.cancel) || (e.state === 'cast' && e.t >= (e.castCancel ?? 0.2));

    if (cancelable && fresh('ult', 0.2) && this.meter >= 100) { take('ult'); return this._ult(e); }
    const dashOK = e.dashCharges > 0 && (cancelable || (e.state === 'hurt' && e.t > 0.2) || (e.state === 'dash' && e.t > 0.12) || ((e.state === 'rush' || e.state === 'whirl') && e.t > 0.2));
    if (dashOK && fresh('dash', 0.2)) { take('dash'); return this._dash(e, mdir); }
    for (let i = 0; i < 2; i++) if (cancelable && fresh('skill' + (i + 1), 0.2) && e.cds[i] <= 0 && S.abilities[i]) { take('skill' + (i + 1)); return this._ability(e, i, mdir); }
    if (canAct && fresh('heal', 0.2) && e.tonics > 0 && e.hp < e.maxHp) { take('heal'); e.state = 'heal'; e.t = 0; e.anim = 'heal'; e.animT = 0; e.healed = false; return; }
    const wantAttack = fresh('attack', 0.25) || (K.attack.kind === 'shoot' && inp.attackDown);
    if (wantAttack && (cancelable || e.state === 'shoot')) {
      const fin = this._finisherTarget(e);
      if (fin && (fresh('attack', 0.25) || K.attack.kind === 'combo')) { take('attack'); return this._finisher(e, fin); }
      if (K.attack.kind === 'combo' && cancelable) {
        take('attack');
        const next = e.state === 'attack' && e.atk && e.atk.combo ? e.combo : (e.comboT > 0 ? e.combo : 0);
        const C = K.attack.combo; const atk = { ...C[next % C.length], combo: true };
        e.combo = (next + 1) % C.length; e.comboT = atk.dur + 0.35;
        this._aim(e, mdir, 3.6);
        return this._startAttack(e, atk);
      }
      if (K.attack.kind === 'shoot' && e.shotT <= 0) { take('attack'); this._shoot(e, mdir); }
    }

    switch (e.state) {
      case 'idle': case 'run': {
        if (mdir !== null) { e.face = turn(e.face, mdir, 18 * h); walk(1); if (e.state !== 'run') { e.state = 'run'; e.anim = 'run'; } }
        else if (e.state !== 'idle') { e.state = 'idle'; e.anim = 'idle'; }
        break;
      }
      case 'shoot': { walk(0.62); if (e.t > 0.24) free(); break; }
      case 'attack': {
        const a = e.atk; this._lunge(e, a, h);
        if (e.t >= a.windup && e.t <= a.active) this._melee(e, a);
        if (a.quake && !e.quaked && e.t >= a.active) { e.quaked = true; this.addZone({ shape: 'circle', x: e.x + Math.sin(e.face) * 1.6, z: e.z + Math.cos(e.face) * 1.6, r: a.quake, life: 0.12, dmg: a.dmg * 0.5, kb: 6, kind: 'quake' }); }
        if (e.t >= a.dur) free();
        break;
      }
      case 'dash': {
        e.mx = Math.sin(e.dashDir); e.mz = Math.cos(e.dashDir); e.moveSpeed = DASH.speed * (e.t < DASH.dur * 0.7 ? 1 : 0.4);
        if (S.relics.includes('rosary') && (e.trailT = (e.trailT || 0) - h) <= 0) { e.trailT = 0.06; this.addZone({ shape: 'circle', x: e.x, z: e.z, r: 0.7, life: 1.4, dmg: 4, tick: 0.5, status: { burn: 1 }, kind: 'fire' }); }
        if (e.t >= DASH.dur) {
          if (fresh('attack', 0.18) && K.attack.dashAttack) { take('attack'); this._aim(e, e.dashDir, 4); return this._startAttack(e, { ...K.attack.dashAttack }); }
          free();
        }
        break;
      }
      case 'hurt': if (e.t >= 0.36) free(); break;
      case 'heal': {
        walk(0.3); if (mdir !== null) e.face = turn(e.face, mdir, 8 * h);
        if (!e.healed && e.t >= HEAL.at) { e.healed = true; e.tonics--; const amt = Math.round(e.maxHp * S.tonicHeal); e.hp = Math.min(e.maxHp, e.hp + amt); this.emit('heal', { e, amt }); }
        if (e.t >= HEAL.dur) free();
        break;
      }
      case 'finisher': {
        const tg = e.target;
        if (tg && !e.finHit && e.t >= FIN.hitAt) {
          e.finHit = true; const base = K.attack.kind === 'combo' ? K.attack.combo[K.attack.combo.length - 1].dmg : K.attack.proj.dmg * 2;
          this._damage(e, tg, Math.round(base * FIN.mul * S.dmgMul), { poise: 0, kb: 6, heavy: true, finisher: true });
          e.hp = Math.min(e.maxHp, e.hp + FIN.heal); this.meter = Math.min(100, this.meter + FIN.meter * S.ultRate);
          this.stop(0.14); this.emit('shake', { amt: 0.5 });
        }
        if (e.t >= FIN.dur) { e.iframes = 0.15; free(); }
        break;
      }
      case 'cast': { walk(e.castMove ?? 0); if (e.t >= (e.castDur ?? 0.3)) free(); break; }
      case 'rush': this._rush(e, h, free); break;
      case 'whirl': this._whirl(e, h, free); break;
      case 'charging': this._charging(e, h, free); break;
      case 'special': this._special(e, h, free); break;
    }
  }

  // damage the hero deals: weapon, level, rank, crits, wrath
  heroDmg(e, base, rank = 1) {
    let d = base * e.stats.dmgMul * rankDmg(rank);
    if (e.stats.relics.includes('wick') && e.hp < e.maxHp * 0.4) d *= 1.25;
    return d;
  }

  _aim(e, mdir, range) {
    // soft lock: nearest foe in reach, preferring the stick direction
    let best = null, bs = Infinity;
    for (const f of this.foes()) {
      if (f.state === 'spawn' || f.hidden) continue;
      const d = dist(e, f); if (d > range + f.r) continue;
      const a = angTo(e, f); const off = Math.abs(angDiff(mdir ?? e.face, a));
      const score = d + off * 1.6;
      if (score < bs && this.clear(e, f)) { bs = score; best = f; }
    }
    if (best) e.face = angTo(e, best); else if (mdir !== null && mdir !== undefined) e.face = mdir;
    if (e.inp?.aim && e.inp.mouse && !best) { const p = e.inp.aim; e.face = Math.atan2(p.x - e.x, p.z - e.z); }
    e.lockOn = best; return best;
  }

  _startAttack(e, atk, state = 'attack') {
    e.state = state; e.t = 0; e.atk = atk; e.anim = atk.anim; e.animT = 0; e.hitSet = new Set(); e.quaked = false;
    this.emit('swing', { e, atk });
  }

  _shoot(e, mdir) {
    const A = e.kit.attack; const P = A.proj; const tr = e.stats.trait;
    this._aim(e, mdir, 13);
    e.state = 'shoot'; e.t = 0; if (e.anim !== A.anim) { e.anim = A.anim; e.animT = 0.5; }
    e.shotT = A.rate * (tr.rate || 1);
    const a = e.face;
    this.projs.push({ id: this.nextId++, kind: P.kind, team: 'hero', x: e.x + Math.sin(a) * 0.6, z: e.z + Math.cos(a) * 0.6, y: 1.15, vx: Math.sin(a) * P.speed, vz: Math.cos(a) * P.speed, r: P.r, dmg: this.heroDmg(e, P.dmg), poise: P.poise, life: P.life, pierce: !!tr.pierce, status: P.status, basic: true, hitSet: new Set(), face: a, src: e });
    this.emit('shoot', { e, kind: P.kind });
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
    e.state = 'dash'; e.t = 0; e.anim = 'dash'; e.animT = 0; e.atk = null; e.dashCharges--; e.dashT = 0;
    e.dashDir = mdir ?? e.face; e.face = e.dashDir; e.iframes = DASH.iframes; e.perfected = false; e.dashAt = this.t;
    this.emit('dash', { e });
  }

  // ------------------------------------------------------------------ abilities
  _ability(e, slot, mdir) {
    const ab = e.stats.abilities[slot]; const A = ab.def; const r = ab.rank; const S = e.stats;
    e.cds[slot] = A.cd * rankCd(r) * S.cdMul; e.cdMax = e.cdMax || [1, 1]; e.cdMax[slot] = e.cds[slot];
    const cast = (anim, dur, move = 0, cancel = 0.2) => { e.state = 'cast'; e.t = 0; e.anim = anim; e.animT = 0; e.castDur = dur; e.castMove = move; e.castCancel = cancel; e.atk = null; };
    const fx = Math.sin(e.face), fz = Math.cos(e.face);
    this.emit('ability', { e, id: ab.id, kind: A.kind, slot });
    switch (A.kind) {
      case 'wave': {
        this._aim(e, mdir, 9); cast('slash3', 0.36, 0, 0.22);
        const a = e.face;
        this.projs.push({ id: this.nextId++, kind: 'wave', team: 'hero', x: e.x + Math.sin(a) * 0.8, z: e.z + Math.cos(a) * 0.8, vx: Math.sin(a) * 14, vz: Math.cos(a) * 14, r: 1.15, dmg: this.heroDmg(e, A.dmg, r), poise: 30, life: 0.6, hitSet: new Set(), pierce: true, face: a, src: e });
        break;
      }
      case 'rush': { this._aim(e, mdir, 7); e.state = 'rush'; e.t = 0; e.anim = 'thrust'; e.animT = 0.06; e.iframes = 0.34; e.hitSet = new Set(); e.rushDmg = this.heroDmg(e, A.dmg, r); e.rushDist = A.dist; break; }
      case 'whirl': { e.state = 'whirl'; e.t = 0; e.anim = 'whirl'; e.animT = 0; e.whirlK = -1; e.whirl = { dmg: this.heroDmg(e, A.dmg, r), hits: A.hits, radius: A.radius, status: A.status }; break; }
      case 'volley': {
        this._aim(e, mdir, 12); cast(e.kit.attack.anim || 'aim', 0.32, 0.4);
        for (let i = 0; i < A.n; i++) {
          const a = e.face + (i - (A.n - 1) / 2) * A.spread;
          this.projs.push({ id: this.nextId++, kind: 'hbolt', team: 'hero', x: e.x + Math.sin(a) * 0.6, z: e.z + Math.cos(a) * 0.6, y: 1.15, vx: Math.sin(a) * 21, vz: Math.cos(a) * 21, r: 0.25, dmg: this.heroDmg(e, A.dmg, r), poise: 8, life: 0.7, pierce: !!S.trait.pierce, hitSet: new Set(), face: a, src: e });
        }
        break;
      }
      case 'smoke': {
        const near = this._nearestFoe(e, 8); const away = near ? angTo(near, e) : e.face + Math.PI;
        this.addZone({ shape: 'circle', x: e.x, z: e.z, r: A.radius, warn: 0.45, life: 0.15, dmg: this.heroDmg(e, A.dmg, r), stun: A.stun, kind: 'smoke' });
        const tx = e.x + Math.sin(away) * A.dist, tz = e.z + Math.cos(away) * A.dist;
        const p = this._lastClear(e.x, e.z, tx, tz, e.r); this.emit('blinkHero', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; e.face = wrap(away + Math.PI);
        e.iframes = 0.3; cast('dash', 0.22, 0);
        break;
      }
      case 'trap': { cast('cast', 0.3); this.addZone({ shape: 'circle', x: e.x + fx * 1.2, z: e.z + fz * 1.2, r: A.radius, life: A.life, dmg: this.heroDmg(e, A.dmg, r), root: A.root, trigger: true, kind: 'trap' }); break; }
      case 'shock': { cast('hsmash2', 0.5, 0, 0.42); this.addZone({ shape: 'ring', x: e.x + fx * 1.2, z: e.z + fz * 1.2, r0: 0.8, r1: A.r1, warn: 0.3, life: 0.5, dmg: this.heroDmg(e, A.dmg, r), kb: 7, kind: 'shock' }); this.emit('shake', { amt: 0.4 }); break; }
      case 'charge': { this._aim(e, mdir, 8); e.state = 'charging'; e.t = 0; e.anim = 'charge'; e.animT = 0; e.hitSet = new Set(); e.iframes = 0.25; e.chargeA = { dmg: this.heroDmg(e, A.dmg, r), slam: this.heroDmg(e, A.slam, r), radius: A.radius, dist: A.dist, slammed: false }; break; }
      case 'ward': { cast('roar', 0.4); e.buffs.ward = A.dur; e.wardPulse = 0; e.wardDmg = this.heroDmg(e, A.dmg, r); e.wardR = A.radius; this.addZone({ shape: 'circle', follow: e, r: A.radius, life: A.dur, dmg: e.wardDmg, tick: 0.6, kind: 'ward' }); break; }
      case 'pillar': {
        const tg = this._aim(e, mdir, 11) || null; cast('cast', 0.34);
        const px = tg ? tg.x : e.x + fx * 4, pz = tg ? tg.z : e.z + fz * 4;
        this.addZone({ shape: 'circle', x: px, z: pz, r: A.radius, warn: A.delay, life: 0.2, dmg: this.heroDmg(e, A.dmg, r), status: A.status, kind: 'pillar' });
        break;
      }
      case 'lantern': {
        cast('heal', 0.4, 0.3); const amt = Math.round(e.maxHp * A.heal * rankDmg(r) * 0.8 + e.maxHp * 0.02); e.hp = Math.min(e.maxHp, e.hp + amt); this.emit('heal', { e, amt });
        this.addZone({ shape: 'circle', follow: e, r: A.radius, life: A.dur, dmg: this.heroDmg(e, A.dmg, r), tick: 0.5, status: { burn: 1 }, kind: 'lantern' });
        break;
      }
      case 'wisps': {
        cast('cast', 0.3);
        for (let i = 0; i < A.n; i++) { const a = e.face + (i / A.n) * TAU; this.projs.push({ id: this.nextId++, kind: 'wisp', team: 'hero', x: e.x + Math.sin(a), z: e.z + Math.cos(a), y: 1.4, vx: Math.sin(a) * 3, vz: Math.cos(a) * 3, r: 0.35, dmg: this.heroDmg(e, A.dmg, r), poise: 15, life: 4, homing: 7, seekAfter: 0.35 + i * 0.12, status: { burn: 1 }, hitSet: new Set(), src: e }); }
        break;
      }
    }
  }

  _rush(e, h, free) {
    e.mx = Math.sin(e.face); e.mz = Math.cos(e.face); e.moveSpeed = e.rushDist / 0.3;
    for (const f of this.foes()) { if (e.hitSet.has(f.id) || f.state === 'spawn' || dist(e, f) > f.r + 1.1) continue; e.hitSet.add(f.id); this._damage(e, f, e.rushDmg, { poise: 25, kb: 3, heavy: true }); }
    if (e.t >= 0.3) { e.iframes = Math.max(e.iframes, 0.08); free(); }
  }
  _whirl(e, h, free) {
    const W = e.whirl; const k = Math.floor((e.t - 0.1) / 0.2);
    if (e.t > 0.1 && k < W.hits && k !== e.whirlK) { e.whirlK = k; for (const f of this.foes()) if (dist(e, f) <= W.radius + f.r && f.state !== 'spawn') this._damage(e, f, W.dmg, { poise: 12, kb: 2.5, status: W.status, aoe: true }); this.emit('whirlHit', { e, k }); }
    if (e.t >= 0.12 + W.hits * 0.2) free();
  }
  _charging(e, h, free) {
    const C = e.chargeA;
    if (e.t < 0.48) {
      e.mx = Math.sin(e.face); e.mz = Math.cos(e.face); e.moveSpeed = C.dist / 0.48;
      for (const f of this.foes()) { if (e.hitSet.has(f.id) || dist(e, f) > f.r + 1.2) continue; e.hitSet.add(f.id); this._damage(e, f, C.dmg, { poise: 40, kb: 9, heavy: true }); }
    } else if (!C.slammed) { C.slammed = true; e.anim = 'hsmash2'; e.animT = 0.28; this.addZone({ shape: 'circle', x: e.x + Math.sin(e.face) * 1.2, z: e.z + Math.cos(e.face) * 1.2, r: C.radius, life: 0.12, dmg: C.slam, kb: 8, kind: 'quake' }); this.emit('shake', { amt: 0.5 }); }
    if (e.t >= 0.85) free();
  }

  // ------------------------------------------------------------------ ultimates
  _ult(e) {
    const U = e.stats.ult; const D = U.def; const r = U.rank;
    this.meter = 0; e.state = 'special'; e.t = 0; e.animT = 0; e.atk = null; e.spK = -1; e.ultDef = D; e.ultDmg = this.heroDmg(e, D.dmg, r);
    e.anim = { requiem: 'special', rain: 'aim', toll: 'hsmash2', sunburst: 'roar' }[D.kind] || 'special';
    e.iframes = D.dur + 0.3;
    this.emit('special', { e, kind: D.kind }); this.slow(0.35, 0.35);
  }
  _special(e, h, free) {
    const D = e.ultDef;
    if (D.kind === 'requiem') {
      const k = Math.floor((e.t - 0.3) / 0.15);
      if (e.t > 0.3 && k < D.hits && k !== e.spK) { e.spK = k; for (const f of this.foes()) if (dist(e, f) <= D.radius) this._damage(e, f, e.ultDmg, { poise: 25, kb: 1.5, special: true }); this.emit('specialHit', { e, k }); }
    } else if (D.kind === 'rain') {
      if ((e.rainT = (e.rainT || 0) - h) <= 0 && e.t > 0.2) {
        e.rainT = D.rate; const foes = this.foes().filter((f) => dist(e, f) < D.radius); let x, z;
        if (foes.length && this.rand() < 0.7) { const f = foes[(this.rand() * foes.length) | 0]; x = f.x + (this.rand() - 0.5) * 1.2; z = f.z + (this.rand() - 0.5) * 1.2; }
        else { const a = this.rand() * TAU, d = Math.sqrt(this.rand()) * D.radius; x = e.x + Math.sin(a) * d; z = e.z + Math.cos(a) * d; }
        this.addZone({ shape: 'circle', x, z, r: D.r, warn: 0.12, life: 0.06, dmg: e.ultDmg, kind: 'bolt', special: true });
      }
      if (e.t > 0.3) { const inp = e.inp || NONE; const ml = Math.hypot(inp.mx || 0, inp.mz || 0); if (ml > 0.15) { e.mx = inp.mx / ml; e.mz = inp.mz / ml; e.moveSpeed = e.speed * 0.5; } }
    } else if (D.kind === 'toll') {
      const k = Math.floor((e.t - 0.2) / 0.5);
      if (e.t > 0.2 && k < D.rings && k !== e.spK) { e.spK = k; this.addZone({ shape: 'ring', x: e.x, z: e.z, r0: 0.6, r1: D.r1, life: 0.55, dmg: e.ultDmg, kb: 8, kind: 'shock', special: true }); this.emit('shake', { amt: 0.7 }); e.animT = 0.1; }
    } else if (D.kind === 'sunburst') {
      if (e.t > 0.45 && e.spK < 0) { e.spK = 1; this.addZone({ shape: 'circle', x: e.x, z: e.z, r: D.radius, life: 0.15, dmg: e.ultDmg, status: D.status, kb: 6, kind: 'sun', special: true }); const amt = Math.round(e.maxHp * D.heal); e.hp = Math.min(e.maxHp, e.hp + amt); this.emit('heal', { e, amt }); this.emit('shake', { amt: 0.8 }); }
    }
    if (e.t >= D.dur) { e.iframes = 0.3; free(); }
  }

  // ------------------------------------------------------------------ finishers
  _finisherTarget(e) {
    let best = null, bd = 2.4;
    for (const f of this.foes()) { if (f.state !== 'stagger') continue; const d = dist(e, f) - f.r; if (d < bd && this.clear(e, f)) { bd = d; best = f; } }
    return best;
  }
  _finisher(e, tg) {
    e.state = 'finisher'; e.t = 0; e.anim = 'finisher'; e.animT = 0; e.target = tg; e.finHit = false; e.iframes = FIN.dur + 0.1;
    e.face = angTo(e, tg); tg.state = 'finished'; tg.t = 0; tg.anim = 'finished'; tg.animT = 0; tg.face = angTo(tg, e);
    // step into place, only where it is free and on this side of any bars
    const want = tg.r + e.r + 0.35; const nx = tg.x - Math.sin(e.face) * want, nz = tg.z - Math.cos(e.face) * want;
    if (!this._blocked(nx, nz, e.r) && this.clear({ x: nx, z: nz }, tg)) { e.x = nx; e.z = nz; }
    this.stats.finishers++; this.emit('finisher', { e, target: tg }); this.slow(0.6, 0.45);
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
      if (!this._inShape(a, atk, t) || !this.clear(a, t)) continue;
      a.hitSet.add(t.id);
      if (a.team === 'hero') this._damage(a, t, this.heroDmg(a, atk.dmg), { poise: atk.poise * (a.stats.trait.poise || 1), kb: atk.kb, heavy: atk.heavy, atk, basic: true });
      else this._damage(a, t, atk.dmg * a.dmgMul, { kb: atk.kb, heavy: atk.heavy, atk, melee: true, src: a });
    }
  }

  // The one place damage happens.
  _damage(src, dst, dmg, o = {}) {
    if (dst.dead) return false;
    const hero = this.hero;
    if (dst === hero) {
      // perfect dodge: a blow that lands inside the first part of a dash
      if (dst.state === 'dash' && dst.iframes > 0) {
        if (this.t - dst.dashAt <= DASH.perfectWindow + 0.06 && !dst.perfected) { dst.perfected = true; this.meter = Math.min(100, this.meter + METER.onPerfect * dst.stats.ultRate); this.stats.perfects++; this.slow(0.7, 0.3); this.emit('perfect', { e: dst, src }); }
        return false;
      }
      if (dst.iframes > 0 || dst.state === 'finisher' || dst.state === 'special') return false;
      let real = dmg * dst.stats.dmgTaken * (dst.buffs.ward > 0 ? 0.5 : 1); real = Math.max(1, Math.round(real));
      dst.hp -= real; dst.flash = 0.15; dst.iframes = 0.55; this.stats.damageTaken += real;
      this.meter = Math.min(100, this.meter + METER.onHurt * dst.stats.ultRate);
      const ang = src ? Math.atan2(dst.x - src.x, dst.z - src.z) : 0; const kb = (o.kb || 3) * (dst.kit.armor ? 0.5 : 1);
      dst.kbx = Math.sin(ang) * kb; dst.kbz = Math.cos(ang) * kb;
      this.emit('hit', { src, dst, dmg: real, x: dst.x, z: dst.z, ang, heavy: o.heavy, hero: true });
      this.stop(o.heavy ? 0.1 : 0.06); this.emit('shake', { amt: o.heavy ? 0.45 : 0.25 });
      // elite foes' touch
      if (src && src.elite) { const A = AFFIXES[src.elite]; if (A.hit) for (const k in A.hit) this.applyStatus(dst, k, { dps: 5 }); if (A.leech) { src.hp = Math.min(src.maxHp, src.hp + real * A.leech); } }
      if (o.status) for (const k in o.status) this.applyStatus(dst, k, { dps: o.dps || 5 });
      if (dst.hp <= 0) return this._heroDown(dst);
      // the armoured hero keeps swinging through blows
      const armored = dst.kit.armor && (dst.state === 'attack' || dst.state === 'charging');
      if (!armored && (dst.state !== 'heal' || o.heavy) && dst.state !== 'rush') { dst.state = 'hurt'; dst.t = 0; dst.anim = 'hurt'; dst.animT = 0; dst.atk = null; }
      return true;
    }
    // a foe
    if (dst.state === 'spawn' || dst.state === 'finished' && !o.finisher) return false;
    if (dst.iframes > 0 && !o.finisher) return false;
    const ang = Math.atan2(dst.x - src.x, dst.z - src.z);
    // shield: frontal blows are blocked until the guard breaks
    if (dst.def.shield && !o.special && !o.finisher && !o.aoe && dst.state !== 'stagger' && dst.state !== 'attack' && dst.state !== 'windup' && Math.abs(angDiff(dst.face, ang + Math.PI)) < 1.2) {
      dst.poise -= (o.poise || 10) * (o.heavy ? 1.2 : 0.6); dst.flash = 0.06;
      this.emit('block', { e: dst, src, x: dst.x - Math.sin(ang) * 0.5, z: dst.z - Math.cos(ang) * 0.5 });
      if (src === hero && !o.heavy && !o.proj) { hero.kbx = -Math.sin(ang) * 3; hero.kbz = -Math.cos(ang) * 3; }
      if (dst.poise <= 0) this._stagger(dst, 1.8);
      this.stop(0.04);
      return false;
    }
    let real = dmg; let crit = false;
    if (src === hero && hero && this.rand() < hero.stats.crit) { real *= 2; crit = true; this.stats.crits++; }
    if (dst.state === 'stagger') real *= 1.4;
    real = Math.round(real);
    if (dst.shield > 0) { const ab = Math.min(dst.shield, real); dst.shield -= ab; real -= ab; if (dst.shield <= 0) this.emit('shieldBreak', { e: dst }); }
    dst.hp -= real; dst.flash = 0.12; this.stats.hits++;
    if (src === hero) this.meter = Math.min(100, this.meter + METER.onHit * (o.special ? 0 : 1) * hero.stats.ultRate);
    const kb = (o.kb || 2) / Math.max(0.6, dst.mass) * (dst.boss ? 0.15 : 1);
    if (!(dst.armor && (dst.state === 'windup' || dst.state === 'attack'))) { dst.kbx = Math.sin(ang) * kb; dst.kbz = Math.cos(ang) * kb; }
    this.emit('hit', { src, dst, dmg: real, x: dst.x, z: dst.z, ang, heavy: o.heavy, finisher: o.finisher, special: o.special, crit, kind: o.kind });
    if (!o.special && !o.dotLike) this.stop(o.finisher ? 0.16 : (o.heavy ? 0.085 : (o.proj ? 0.02 : 0.045)));
    if (o.heavy) this.emit('shake', { amt: 0.3 });
    // what the blow carries: statuses, weapon traits, relics
    if (src === hero && hero) this._onHeroHit(hero, dst, real, o);
    if (dst.hp <= 0) return this._kill(dst, src, o);
    if (o.stun) this.applyStatus(dst, 'stun', { dur: o.stun });
    if (o.root) this.applyStatus(dst, 'root', { dur: o.root });
    // poise and interrupts
    if (!dst.boss) {
      dst.poise -= o.poise || 0;
      if (dst.poise <= 0 && dst.state !== 'stagger') this._stagger(dst, 1.7);
      else if (!dst.armor && !dst.shield && dst.state !== 'stagger' && dst.state !== 'hurt' && (dst.flinch >= 1 || o.heavy && dst.flinch >= 0.5)) {
        // a foe flinches a few times, then fights through the blows (button mashing gets punished)
        dst.flinch -= o.heavy ? 0.5 : 1;
        dst.state = 'hurt'; dst.t = 0; dst.anim = 'hurt'; dst.animT = 0; dst.atk = null; dst.tele = null; dst.stun = o.heavy ? 0.55 : 0.32;
      }
    } else {
      dst.poise -= (o.poise || 0) * 0.5;
      if (dst.poise <= 0 && dst.state !== 'stagger' && !dst.hidden) { dst.poise = dst.maxPoise; dst.state = 'stagger'; dst.t = 0; dst.anim = 'stagger'; dst.animT = 0; dst.stagT = 2.2; dst.tele = null; dst.atk = null; dst.leapFrom = null; dst.leapH = 0; this.emit('stagger', { e: dst }); }
    }
    return true;
  }

  _onHeroHit(hero, dst, real, o) {
    const T = hero.stats.trait; const R = hero.stats.relics; const base = real || 1;
    if (o.status) for (const k in o.status) if (o.status[k] && this.rand() < o.status[k]) this.applyStatus(dst, k, { dps: Math.max(3, base * (k === 'burn' ? 0.22 : 0.15)) });
    if (o.basic || o.proj) {
      for (const k of ['burn', 'bleed', 'frost']) if (T[k] && this.rand() < T[k]) this.applyStatus(dst, k, { dps: Math.max(3, base * (k === 'burn' ? 0.22 : 0.15)) });
      if (T.leech) hero.hp = Math.min(hero.maxHp, hero.hp + base * T.leech);
    }
    if (!o.chain && ((T.shock && (o.basic || o.proj) && this.rand() < T.shock) || (R.includes('storm') && this.rand() < 0.1))) {
      let n = 0;
      for (const f of this.foes()) { if (f === dst || n >= 2 || dist(f, dst) > 4.5) continue; n++; this.emit('chain', { from: dst, to: f }); this._damage(hero, f, base * 0.5, { chain: true, kb: 1, dotLike: true }); }
    }
  }

  _heroDown(e) {
    if (e.revives > 0) { e.revives--; e.hp = Math.round(e.maxHp * 0.3); e.iframes = 2; e.state = 'idle'; e.anim = 'idle'; this.emit('revive', { e }); this.slow(0.8, 0.3); return true; }
    e.hp = 0; e.dead = true; e.state = 'dead'; e.anim = 'die'; e.animT = 0; this.emit('heroDeath', { e }); this.slow(1.2, 0.25); return true;
  }

  _stagger(e, time) {
    e.state = 'stagger'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.atk = null; e.tele = null; e.stagT = time; e.poise = e.maxPoise;
    this.emit('stagger', { e });
  }

  _kill(e, src, o) {
    e.hp = 0; e.dead = true; e.state = 'dead'; e.anim = o.finisher ? 'dieHard' : 'die'; e.animT = 0; e.tele = null; e.deadT = 0; e.leapH = 0; e.status = {};
    this.stats.kills++; const hero = this.hero;
    if (hero && !hero.dead) {
      this.meter = Math.min(100, this.meter + METER.onKill * hero.stats.ultRate);
      if (hero.stats.relics.includes('thread')) hero.hp = Math.min(hero.maxHp, hero.hp + 3);
      if (hero.stats.relics.includes('crown') && this.rand() < 0.12) { hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * 0.08)); this.emit('crown', { x: e.x, z: e.z }); }
    }
    const drop = e.boss ? 0 : Math.round((e.def.drop || 5) * (e.elite ? 2.5 : 1)); this.embers += drop;
    const xp = e.boss ? 0 : Math.round((e.def.drop || 5) * 2.2 * (e.elite ? 2.5 : 1) * (1 + (e.def.tier || 0) * 0.25));
    this.emit('kill', { e, src, drop, xp, x: e.x, z: e.z, boss: !!e.boss, elite: e.elite });
    if (this.foes().length === 0 || e.boss) this.slow(e.boss ? 2.2 : 0.55, e.boss ? 0.2 : 0.35);
    return 'kill';
  }

  _nearestFoe(e, range = 99) { let best = null, bd = range; for (const f of this.foes()) { const d = dist(e, f); if (d < bd && !f.hidden) { bd = d; best = f; } } return best; }

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
      case 'windup': case 'attack': return this._foeAttack(e, h * (e.status.frost ? 0.7 : 1));
    }
    if (e.ai.passive) { e.anim = 'idle'; return; }
    if (e.elite === 'hasted' && e.ai.cd > 0) e.ai.cd -= h * 0.6;
    if (boss) thinkBoss(this, e, h); else thinkFoe(this, e, h);
  }

  // Foes (and bosses) begin an attack: windup with a telegraph, then the hit.
  foeAttack(e, atk) {
    e.state = 'windup'; e.t = 0; e.atk = atk; e.anim = atk.anim; e.animT = 0; e.hitSet = new Set(); e.chainDone = false; e.fired = false;
    e.leapFrom = null; e.landed = false;
    e.tele = atk.tele === 'none' ? null : { shape: atk.tele === 'circleAt' ? 'circle' : (atk.tele || atk.shape || 'arc'), range: atk.teleRange || atk.range || atk.radius, arc: atk.arc, width: atk.width, radius: atk.radius, offset: atk.offset, dur: atk.windup, t0: 0 };
    this.emit('tele', { e, atk });
  }

  _foeAttack(e, h) {
    const a = e.atk; const hero = this.hero;
    // track the hero during the first part of the windup
    if (e.t < a.windup * 0.7 && hero && !hero.dead) e.face = turn(e.face, angTo(e, hero), (a.turn || 5) * h);
    if (!a.leap) this._lunge(e, a, h);
    if (a.leap) {
      if (e.t < a.windup * 0.85 && hero && !hero.dead) { e.leapTo = { x: hero.x, z: hero.z }; if (e.tele) e.tele.at = e.leapTo; }
      if (e.t >= a.windup && !e.leapFrom && !e.landed) { e.leapFrom = { x: e.x, z: e.z }; e.iframes = a.active - a.windup; }
      if (e.leapFrom && !e.landed) {
        const k = Math.min(1, (e.t - a.windup) / (a.active - a.windup));
        e.x = e.leapFrom.x + (e.leapTo.x - e.leapFrom.x) * k; e.z = e.leapFrom.z + (e.leapTo.z - e.leapFrom.z) * k; e.leapH = Math.sin(k * Math.PI) * 3.5;
        if (k >= 1) { e.landed = true; e.leapH = 0; e.leapFrom = null; e.iframes = 0; e.tele = null; e.hitSet = new Set(); this._melee(e, { ...a, shape: 'circle', offset: 0 }); if (a.onStrike) a.onStrike(this, e); this.emit('land', { e }); this.emit('shake', { amt: 0.6 }); }
      }
    }
    if (e.t >= a.windup && e.state === 'windup') { e.state = 'attack'; if (!a.leap) e.tele = null; this.emit('foeStrike', { e, atk: a }); if (a.onStrike && !a.leap) a.onStrike(this, e); }
    if (a.ranged) { if (!e.fired && e.t >= a.windup) { e.fired = true; this._fire(e, a.ranged); } }
    else if (!a.leap && a.dmg && e.t >= a.windup && e.t <= a.active) this._melee(e, a);
    if (a.chain && !e.chainDone && e.t >= a.chain.at) {
      // second blow of a combo: keep the clip running (anims read atk.chained)
      const c = a.chain; e.chainDone = true; e.hitSet = new Set(); e.state = 'windup';
      e.tele = { shape: 'arc', range: a.range, arc: a.arc, dur: c.windup - c.at, t0: c.at };
      e.atk = { ...a, windup: c.windup, active: c.active, lungeT: [c.at, c.active], lunge: c.lunge ?? a.lunge, chain: null, chained: c, anim: a.anim };
      this.emit('tele', { e, atk: e.atk });
    }
    if (e.t >= a.dur) { e.state = 'idle'; e.anim = 'idle'; e.t = 0; e.atk = null; e.tele = null; e.leapH = 0; e.leapFrom = null; e.ai.cd = e.boss ? 0.4 + this.rand() * 0.6 : (e.def.ranged ? 1.2 : 0.7) + this.rand() * 0.9; }
  }

  _fire(e, r) {
    const hero = this.hero; const n = r.fan || 1;
    const base = hero ? angTo(e, hero) : e.face;
    for (let i = 0; i < n; i++) {
      const a = base + (n > 1 ? (i - (n - 1) / 2) * r.spread : 0);
      const sx = e.x + Math.sin(a) * (e.r + 0.4), sz = e.z + Math.cos(a) * (e.r + 0.4);
      const p = { id: this.nextId++, kind: r.kind, team: 'foe', x: sx, z: sz, y: r.y ?? 1.2, vx: Math.sin(a) * r.speed, vz: Math.cos(a) * r.speed, r: r.r, dmg: r.dmg * e.dmgMul, life: r.life, homing: r.homing || 0, src: e, face: a, hitSet: new Set(), status: r.status, onLand: r.onLand };
      if (r.arc && hero) { // lobbed: flies to where the hero stands, lands there
        const d = Math.max(2, dist(e, hero)); p.vx = Math.sin(a) * d / r.arc; p.vz = Math.cos(a) * d / r.arc; p.life = r.arc; p.lob = r.arc; p.lobT = 0; p.y = 1.2; p.tx = hero.x; p.tz = hero.z;
        this.addHazard({ shape: 'circle', x: hero.x, z: hero.z, r: r.splash || 1.4, warn: r.arc, life: r.burn || 0.2, dmg: r.dmg * e.dmgMul, src: e, kind: r.kind === 'flask' ? 'fire' : (r.kind === 'spit' ? 'poison' : 'slam'), kb: 3, status: r.status });
      }
      this.projs.push(p);
    }
    this.emit('fire', { e, kind: r.kind });
  }

  // ------------------------------------------------------------------ projectiles, hazards, zones
  _projectiles(h) {
    const hero = this.hero;
    for (const p of this.projs) {
      p.life -= h; if (p.life <= 0) { p.dead = true; if (p.lob) this.emit('projHit', { p, landed: true }); continue; }
      if (p.lob) { p.lobT += h; const k = p.lobT / p.lob; p.y = 1.2 + Math.sin(Math.min(1, k) * Math.PI) * 3; p.x += p.vx * h; p.z += p.vz * h; continue; }
      if (p.homing && p.team === 'foe' && hero && !hero.dead) {
        const want = Math.atan2(hero.x - p.x, hero.z - p.z); const cur = Math.atan2(p.vx, p.vz); const sp = Math.hypot(p.vx, p.vz);
        const na = turn(cur, want, p.homing * h); p.vx = Math.sin(na) * sp; p.vz = Math.cos(na) * sp; p.face = na;
      }
      if (p.homing && p.team === 'hero') {
        p.seekAfter = (p.seekAfter || 0) - h;
        if (p.seekAfter <= 0) { const tg = this._nearestFoe(p, 14); if (tg) { const sp = Math.max(9, Math.hypot(p.vx, p.vz) + h * 20); const want = Math.atan2(tg.x - p.x, tg.z - p.z); const na = turn(Math.atan2(p.vx, p.vz), want, p.homing * h); p.vx = Math.sin(na) * sp; p.vz = Math.cos(na) * sp; } }
        else if (p.src) { const a = Math.atan2(p.x - p.src.x, p.z - p.src.z) + h * 5; p.x = p.src.x + Math.sin(a) * 1.1; p.z = p.src.z + Math.cos(a) * 1.1; continue; }
      }
      p.x += p.vx * h; p.z += p.vz * h;
      if (p.kind !== 'wave' && this._blocked(p.x, p.z, 0.05)) { p.dead = true; this.emit('projHit', { p, wall: true }); continue; }
      if (p.team === 'foe') {
        if (hero && !hero.dead && Math.hypot(hero.x - p.x, hero.z - p.z) < hero.r + p.r) {
          const res = this._damage(p.src, hero, p.dmg, { kb: 3, proj: true, status: p.status });
          if (res !== false || hero.state !== 'dash') { p.dead = true; this.emit('projHit', { p }); }
        }
      } else {
        for (const f of this.foes()) {
          if (p.hitSet.has(f.id) || f.state === 'spawn' || Math.hypot(f.x - p.x, f.z - p.z) > f.r + p.r) continue;
          p.hitSet.add(f.id); this._damage(hero, f, p.dmg, { poise: p.poise ?? 20, kb: p.kind === 'wave' ? 4 : 1.5, proj: true, basic: p.basic, status: p.status, kind: p.kind });
          if (!p.pierce) { p.dead = true; this.emit('projHit', { p }); break; }
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  // hazard (hurts the hero): { shape:'circle'|'ring'|'line', x, z, r, r0, r1, warn, life, dmg, face, len, width, kind, status }
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
      if (hit) {
        const st = z.status || (z.kind === 'fire' ? { burn: 1 } : (z.kind === 'poison' ? { poison: 1 } : null));
        const res = this._damage(z.src || null, hero, z.dmg, { kb: z.kb || 5, heavy: true, status: st, dps: 5 });
        if (res !== false || z.once) z.hitSet.add(hero.id);
      }
    }
    this.hazards = this.hazards.filter((z) => !z.dead);
  }

  // zone (the hero's area attacks; hurts foes): { shape:'circle'|'ring', x, z, r | r0,r1, warn, life, dmg, tick?, trigger?, follow?, status, stun, root, kb, kind }
  addZone(zn) { const z = { t: 0, warn: 0, hitSet: new Set(), lastHit: new Map(), ...zn }; if (z.follow) { z.x = z.follow.x; z.z = z.follow.z; } this.zones.push(z); this.emit('zone', { z }); return z; }
  _zones(h) {
    const hero = this.hero;
    for (const z of this.zones) {
      z.t += h; if (z.follow) { z.x = z.follow.x; z.z = z.follow.z; }
      if (z.trigger && !z.sprung) {
        if (z.t > z.life) { z.dead = true; continue; }
        if (this.foes().some((f) => Math.hypot(f.x - z.x, f.z - z.z) < z.r + f.r && f.state !== 'spawn')) { z.sprung = true; z.t = 0; z.warn = 0; z.life = 0.15; this.emit('zoneGo', { z }); }
        continue;
      }
      if (z.t >= z.warn + z.life) { z.dead = true; continue; }
      if (z.t < z.warn) continue;
      if (!z.started) { z.started = true; this.emit('zoneGo', { z }); }
      for (const f of this.foes()) {
        if (f.state === 'spawn' || f.hidden) continue;
        const d = Math.hypot(f.x - z.x, f.z - z.z); let hit = false;
        if (z.shape === 'circle') hit = d < z.r + f.r;
        else { const k = (z.t - z.warn) / z.life; const rr = z.r0 + (z.r1 - z.r0) * k; hit = Math.abs(d - rr) < 0.6 + f.r; }
        if (!hit) continue;
        if (z.tick) { const last = z.lastHit.get(f.id) ?? -9; if (this.t - last < z.tick) continue; z.lastHit.set(f.id, this.t); }
        else { if (z.hitSet.has(f.id)) continue; z.hitSet.add(f.id); }
        this._damage(hero || { x: z.x, z: z.z }, f, z.dmg, { aoe: true, kb: z.kb || 2, status: z.status, stun: z.stun, root: z.root, special: z.special, dotLike: !!z.tick, poise: 15, kind: z.kind });
      }
    }
    this.zones = this.zones.filter((z) => !z.dead);
  }

  // ------------------------------------------------------------------ movement and collision
  _move(h) {
    for (const e of this.ents) {
      if (e.dead) { e.kbx *= Math.pow(0.02, h); e.kbz *= Math.pow(0.02, h); this._push(e, e.kbx * h, e.kbz * h); continue; }
      let sp = e.moveSpeed;
      if (e.team === 'foe') { if (e.status.frost) sp *= 0.55; if (e.status.root || e.status.stun) sp = 0; }
      const accel = e.team === 'hero' ? (e.state === 'dash' ? 200 : 60) : 22;
      const tvx = e.mx * sp, tvz = e.mz * sp;
      e.vx += clamp(tvx - e.vx, accel * h); e.vz += clamp(tvz - e.vz, accel * h);
      e.kbx *= Math.pow(0.004, h); e.kbz *= Math.pow(0.004, h);
      this._push(e, (e.vx + e.kbx) * h, (e.vz + e.kbz) * h);
    }
    // separation
    const L = this.ents;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j]; if (a.dead || b.dead) continue;
      if ((a.state === 'dash' || b.state === 'dash' || a.state === 'rush' || b.state === 'rush') && a.team !== b.team) continue;
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

  // nothing solid (walls, fences, closed gates) on the straight line between two points
  clear(a, b) {
    const d = Math.hypot(b.x - a.x, b.z - a.z); const n = Math.ceil(d / 0.25);
    for (let i = 1; i < n; i++) { const k = i / n; if (this._blocked(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, 0)) return false; }
    return true;
  }
  // the farthest free point along a line (for blinks and leaps)
  _lastClear(x0, z0, x1, z1, r) {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.25); let px = x0, pz = z0;
    for (let i = 1; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (this._blocked(x, z, r)) break; px = x; pz = z; }
    return { x: px, z: pz };
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

function clamp(v, m) { return Math.max(-m, Math.min(m, v)); }
export { heroStats, NONE };
