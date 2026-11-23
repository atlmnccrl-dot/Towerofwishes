// The fight simulation: pure logic (no DOM, no three.js), fixed 60 Hz steps, deterministic for a
// given seed and input stream. Runs in the browser and in Node tests.
//
// The view reads entities (x, z, face, anim, animT, state, tele, status...) and drains `events` each frame.
import { FOES, BOSSES, scaleFoe } from './defs.js';
import { UNITS } from './units.js';
import { BOSSES2 } from './bosses2.js';
import { thinkFoe, thinkBoss } from './ai.js';
import { HEROES, ABILITIES, ULTS, AFFIXES, rankDmg, rankCd, heroStats, applyBoonStats } from './heroes.js';
import { installBoons } from './sim_boons.js';
import { makeBot } from './bot.js';

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
// onBreak: breaking a foe's poise (or a guard, or a boss's poise) feeds the ultimate
const METER = { onHit: 2.2, onPerfect: 22, onKill: 5, onHurt: 1.5, onBreak: 15 };
const NONE = { mx: 0, mz: 0 };
// The two equipped abilities have no buttons: the sim casts them in place of a basic attack (see _autoCast),
// except movement abilities (def.move), which the dash press casts instead of a plain dash (see _moveSlot).
const PRESS = ['attack', 'dash', 'ult', 'heal'];
// elements (elemental foes, boons): the status a foe of that element leaves on whoever it strikes
export const EL_STATUS = { fire: 'burn', frost: 'frost', poison: 'poison', storm: 'shock', blood: 'bleed', holy: 'sear', void: 'mark' };
// the allies' minds by warden (allies.js ALLY_AI registers itself here through setAllyAI)
const ALLY_AI_REG = {};
export function setAllyAI(map) { Object.assign(ALLY_AI_REG, map || {}); }
// D's allies.js, when it exists, registers its ALLY_AI (loaded lazily, so the sim never depends on it)
import('./allies.js').then((m) => { if (m && m.ALLY_AI) setAllyAI(m.ALLY_AI); }).catch(() => {});

export class World {
  constructor(opts = {}) {
    this.solids = opts.solids || []; this.bounds = opts.bounds || [-60, -60, 60, 60];
    this.ents = []; this.projs = []; this.hazards = []; this.zones = []; this.events = [];
    this.t = 0; this.nextId = 1; this.rand = mulberry(opts.seed || 7);
    this.hitstop = 0; this.slowT = 0; this.slowScale = 1; this.acc = 0;
    this.meter = 0; this.embers = 0; this.tokensMax = 2; this.paused = false;
    this.hero = null; this.combat = false;
    // 'attack': a ready, useful ability replaces the next basic attack; 'auto': also cast during combat unprompted
    this.abilityMode = opts.abilityMode || 'attack';
    this.stats = { hits: 0, kills: 0, perfects: 0, damageTaken: 0, crits: 0, abilities: 0, boon: {}, allyKills: 0 };
    this.fxq = []; // looks for the view (sim_boons.js): drained by the view, capped, never read by the sim
    this.allies = []; this.allyAI = opts.allyAI || null;
  }
  // the warden the player plays (world.hero is swapped for a moment while a foe that hunts an ally thinks)
  get main() { return this._realHero || this.hero; }
  heroTeam() { const m = this.main; const L = m && !m.dead ? [m] : []; for (const a of this.allies) if (!a.dead) L.push(a); return L; }

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
  spawnHero(x, z, stats = {}) { const e = this._heroEnt(x, z, stats); this.hero = e; return e; }
  // stats.boons: boonMods(run) from boons.js (its plain stat parts are folded in here, once)
  _heroEnt(x, z, stats = {}) {
    const kit = stats.kit || HEROES[stats.heroId || 'warden'];
    if (stats.boons && !stats.boonsApplied) stats = applyBoonStats({ ...stats }, stats.boons);
    const s = { maxHp: kit.hp, dmgMul: 1, maxTonics: 3, tonicHeal: 0.45, dashCharges: 1, crit: 0, cdMul: 1, ultRate: 1, speedMul: 1, dmgTaken: 1 - (kit.armor || 0), revives: 0, relics: [], trait: { ...(kit.attack.trait || {}) }, echo: {},
      abilities: kit.abilities.slice(0, 2).map((id) => ({ id, def: ABILITIES[id], rank: 1 })), ult: { id: kit.ult, def: ULTS[kit.ult], rank: 1 }, ...stats, kit };
    const e = this._ent({ team: 'hero', type: 'hero', heroId: kit.id, x, z, r: 0.38, hp: s.hp ?? s.maxHp, maxHp: s.maxHp, speed: kit.speed * s.speedMul, poise: 999, maxPoise: 999, mass: 1.2 });
    e.stats = s; e.kit = kit; e.tonics = s.tonics ?? s.maxTonics; e.combo = 0; e.comboT = 0; e.buf = {}; e.face = stats.face ?? Math.PI;
    e.cds = [0, 0]; e.cdMax = [1, 1]; e.autoT = 0; e.dashCharges = s.dashCharges; e.dashT = 0; e.revives = s.revives; e.buffs = {}; e.shotT = 0;
    e.echo = s.echo || {}; e.boneWard = 0; e.boneT = 0; e.hookT = 0; e.castN = 0; e.shotN = 0;
    e.B = s.boons || null; e.aegis = 0; e.aegisMax = e.B ? e.B.shieldMax : 0; e.lastHurt = -99; e.meter = 0;
    return e;
  }

  // An AI warden on the hero's side (side quests' friends: RUN_DESIGN.md section 5). Uses that warden's kit; thinks with
  // opts.think, else world.allyAI[heroId] / setAllyAI() (allies.js ALLY_AI), else a built-in follower.
  // think(world, ally, dt) returns an input frame like the player's ({ mx, mz, attackPressed, attackDown,
  // dashPressed, ultPressed }) or nothing (it then drives ally itself). Modest by design: opts.dmg and opts.hp
  // scale the warden's damage and health (default 0.6 each; opts.scale sets both). The ally's ultimate has its
  // own meter (ally.meter, filled at opts.ultRate, default 0.6). Foes hunt allies too.
  spawnAlly(heroId, x, z, opts = {}) {
    const kit = HEROES[heroId]; if (!kit) throw new Error('unknown warden ' + heroId);
    const k = opts.scale ?? 0.6; const hpK = opts.hp ?? k, dmgK = opts.dmg ?? k;
    const base = opts.stats || {};
    const e = this._heroEnt(x, z, { heroId, maxTonics: 0, tonics: 0, revives: 0, ultRate: opts.ultRate ?? 0.6, ...base,
      maxHp: Math.round((base.maxHp || kit.hp) * hpK), dmgMul: (base.dmgMul || 1) * dmgK, face: opts.face ?? Math.PI });
    e.ally = true; e.type = 'ally'; e.inp = { mx: 0, mz: 0 };
    const bot = makeBot(1, 977 + e.id, { self: e });
    e.think = opts.think || (this.allyAI && this.allyAI[heroId]) || ALLY_AI_REG[heroId] || ((w, a, dt) => bot(w, dt));
    this.allies.push(e); this.emit('spawn', { e, ally: true }); return e;
  }
  _allyStep(e, h) {
    let inp = null;
    try { inp = e.think(this, e, h); } catch (err) { inp = null; }
    if (inp) { const b = e.buf; for (const k of PRESS) if (inp[k + 'Pressed']) b[k] = this.t; e.inp = inp; } else e.inp = e.inp || NONE;
    this._caster = e; this._hero(e, h); this._caster = null;
  }

  spawnFoe(type, x, z, opts = {}) {
    const base = FOES[type] || UNITS[type]; if (!base) throw new Error('unknown foe ' + type);
    const def = scaleFoe(base, opts.tier || 0);
    const e = this._ent({ team: 'foe', type, def, x, z, r: def.r, mass: def.mass, hp: def.hp, maxHp: def.hp, poise: def.poise, maxPoise: def.poise, speed: def.speed, dmgMul: def.dmgMul, armor: !!def.armor, flinch: def.flinch ?? 2 });
    e.face = opts.face ?? angTo(e, this.hero || { x, z: z + 1 });
    if (opts.rise !== false) { e.state = 'spawn'; e.anim = 'rise'; e.iframes = 0.9; }
    e.ai = { cd: 0.6 + this.rand() * 0.8, strafeDir: this.rand() < 0.5 ? -1 : 1, aggro: !!opts.aggro, home: { x, z }, passive: !!opts.passive };
    if (opts.elite && AFFIXES[opts.elite]) this._makeElite(e, opts.elite);
    // an elemental foe: its blows carry the element and leave a small hazard; tinted, with an aura (view.js)
    if (opts.element && EL_STATUS[opts.element]) { e.element = opts.element; e.maxHp = e.hp = Math.round(e.hp * 1.15); e.elT = 0; }
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
    // New Game+: an Ascended boss (extra moves, a fourth phase); the final boss's true-ending form (ai reads both)
    e.ascended = !!opts.ascended; e.trueForm = !!opts.trueForm;
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
      if (e.dead) { e.deadT += h; e.animT += h; if (e.flash > 0) e.flash -= h; continue; }
      e.t += h; e.animT += h;
      if (e.iframes > 0) e.iframes -= h;
      if (e.flash > 0) e.flash -= h;
      if (e.status.freeze) e.animT -= h; // frozen: the pose holds
      this._status(e, h);
      if (e.dead) continue;
      if (e === hero) { this._hero(e, h); if (e.B) this._boonTick(e, h); }
      else if (e.ally) this._allyStep(e, h);
      else if (e.boss) this._foe(e, h, true);
      else this._foe(e, h, false);
    }
    this._move(h);
    this._projectiles(h);
    this._hazards(h);
    this._zones(h);
    this._boonWorld(h);
    if (this.allies.length) this.allies = this.allies.filter((a) => this.ents.includes(a));
    const dead = this.ents.filter((e) => e.dead && e !== hero);
    if (dead.length > 14) { const old = new Set(dead.sort((a, b) => b.deadT - a.deadT).slice(0, dead.length - 14)); this.ents = this.ents.filter((e) => !old.has(e)); }
    this.combat = this.foes().some((f) => f.ai.aggro);
  }

  // ------------------------------------------------------------------ statuses
  // burn/bleed/poison: damage over time; frost: slow; stun: no action; root: no movement.
  // chill: stacks (o.stacks); at o.at stacks (3) it freezes. freeze: a foe stands locked in ice (a great foe is only
  // slowed). shock: crackles (lightning bites harder, boons). mark: the void's stacks. blind: deals less. sear: holy
  // fire on the hero. A foe of an element shrugs off its own status.
  applyStatus(e, kind, o = {}) {
    if (e.dead || (e.boss && (kind === 'stun' || kind === 'root'))) return;
    if (e.element && EL_STATUS[e.element] === kind) return;
    if (e.element === 'frost' && (kind === 'chill' || kind === 'freeze')) return;
    const s = e.status; const dur = o.dur ?? { burn: 3, bleed: 4, poison: 4, frost: 2, stun: 1.2, root: 2.2, chill: 3, freeze: 1.6, shock: 2, mark: 6, blind: 3, sear: 3 }[kind];
    if (kind === 'resonate') { s.resonate = { t: o.dur ?? 4, stacks: Math.min(3, (s.resonate ? s.resonate.stacks : 0) + (o.stacks || 1)) }; this.emit('status', { e, kind }); return; }
    if (kind === 'chill') {
      if (s.freeze) return;
      const stacks = (s.chill ? s.chill.stacks : 0) + (o.stacks || 1); s.frost = { t: Math.max(dur, s.frost?.t || 0) };
      if (stacks >= (o.at || 3) && e.team === 'foe') { delete s.chill; return this.applyStatus(e, 'freeze', { src: o.src }); }
      s.chill = { t: dur, stacks: Math.min(o.at ? o.at - 1 : 2, stacks) }; this.emit('status', { e, kind }); return;
    }
    if (kind === 'freeze') {
      if (e.team !== 'foe') { s.frost = { t: 2 }; return; }
      // a great foe is never frozen: the cold makes it brittle instead (it takes more for a while)
      if (e.boss) { s.frost = { t: Math.max(2.5, s.frost?.t || 0) }; s.brittle = { t: 2.5 }; s.chill = { t: 2.5, stacks: 2 }; this.emit('status', { e, kind: 'brittle' }); this._fx({ k: 'brittle', e }); return; }
      s.freeze = { t: dur }; delete s.chill; e.state = 'hurt'; e.t = 0; e.atk = null; e.tele = null; e.stun = dur; e.leapH = 0;
      this.emit('status', { e, kind }); this._fx({ k: 'freeze', e }); this._onStatus(e, kind, o); return;
    }
    if (kind === 'mark') { s.mark = { t: dur, stacks: Math.min(o.max || 5, (s.mark ? s.mark.stacks : 0) + (o.stacks || 1)) }; this.emit('status', { e, kind }); if (e.team === 'foe') this._onStatus(e, kind, o); return; }
    if (kind === 'bleed') { const cur = s.bleed; const stacks = Math.min(o.max || 3, (cur ? cur.stacks : 0) + 1); s.bleed = { t: dur, dps: o.dps ?? 4, stacks, tick: cur ? cur.tick : 0.5 }; }
    else if (kind === 'poison' && o.stack) { const cur = s.poison; s.poison = { t: Math.max(dur, cur?.t || 0), dps: Math.max(o.dps ?? 5, cur?.dps || 0), tick: cur?.tick ?? 0.5, stacks: Math.min(o.max || 5, (cur?.stacks || 0) + (o.stacks || 1)) }; }
    else if (kind === 'burn' || kind === 'poison' || kind === 'sear') s[kind] = { t: Math.max(dur, s[kind]?.t || 0), dps: Math.max(o.dps ?? 5, s[kind]?.dps || 0), tick: s[kind]?.tick ?? 0.5, stacks: s[kind]?.stacks };
    else s[kind] = { t: Math.max(dur, s[kind]?.t || 0) };
    if (kind === 'stun' && e.team === 'foe' && !e.boss) { e.state = 'hurt'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.atk = null; e.tele = null; e.stun = dur; }
    this.emit('status', { e, kind });
  }
  _status(e, h) {
    const s = e.status;
    for (const k in s) {
      const v = s[k]; v.t -= h;
      if ((k === 'burn' || k === 'bleed' || k === 'poison' || k === 'sear') && (v.tick -= h) <= 0) {
        v.tick += 0.5; const amt = Math.max(1, Math.round(v.dps * (v.stacks || 1) * 0.5));
        if (e.team === 'hero') this._dotHero(e, amt, k); else this._dot(e, amt, k);
      }
      if (v.t <= 0) delete s[k];
    }
  }
  _dot(e, amt, kind) {
    if (e.dead) return; amt = this._boonDot(e, amt, kind); e.hp -= amt; this.emit('dot', { e, dmg: amt, kind });
    if (e.hp <= 0) this._kill(e, this.hero, { dot: true });
  }
  _dotHero(e, amt, kind) {
    if (e.dead || e.state === 'special') return;
    let d = amt * e.stats.dmgTaken * (e.buffs.ward > 0 ? 0.5 : 1) * (e.buffs.barnacle > 0 ? 1 - e.barnReduce : 1);
    if (e.aegis > 0) { const ab = Math.min(e.aegis, d); e.aegis -= ab; d -= ab; if (d <= 0) return; }
    e.hp -= Math.max(1, Math.round(d)); this.emit('dot', { e, dmg: amt, kind });
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
    this._dashAbility(e);
    for (const k in e.buffs) { e.buffs[k] -= h; if (e.buffs[k] <= 0) delete e.buffs[k]; }
    if (e.buffs.echo > 0 && (e.echoT -= h) <= 0) this._echoVoice(e);
    if (e.hookT > 0) e.hookT -= h;
    if (e.comboT > 0) { e.comboT -= h; if (e.comboT <= 0) e.combo = 0; }
    if (e.shotT > 0) e.shotT -= h;
    e.mx = 0; e.mz = 0; e.moveSpeed = 0;
    const slowK = (e.status.frost ? 0.6 : 1) * (e.status.shock ? 0.85 : 1);
    const walk = (k) => { if (mdir !== null) { e.mx = Math.sin(mdir) * mlen; e.mz = Math.cos(mdir) * mlen; e.moveSpeed = e.speed * k * slowK; } };

    const canAct = e.state === 'idle' || e.state === 'run' || (e.state === 'shoot' && e.t > 0.05);
    const free = () => { e.state = mlen > 0.15 ? 'run' : 'idle'; e.t = 0; e.atk = null; e.anim = e.state; };
    const cancelable = canAct || (e.state === 'attack' && e.t >= e.atk.cancel) || (e.state === 'cast' && e.t >= (e.castCancel ?? 0.2));

    if (cancelable && fresh('ult', 0.2) && this._meterOf(e) >= 100) { take('ult'); return this._ult(e); }
    const dashOK = e.dashCharges > 0 && (cancelable || (e.state === 'hurt' && e.t > 0.2) || (e.state === 'dash' && e.t > 0.12) || ((e.state === 'rush' || e.state === 'whirl') && e.t > 0.2));
    if (dashOK && fresh('dash', 0.2)) {
      take('dash'); const mv = e.status.root ? -1 : this._moveSlot(e); // held fast: the dash tears free instead
      if (mv >= 0) { // a ready movement ability rides on the dash (no charge spent)
        if (e.B) this._boonDashStart(e, true);
        this._ability(e, mv, mdir, null, true);
        if (e.B && e.state !== 'rush' && e.state !== 'charging') this._boonDashEnd(e); // a blink lands at once
        return;
      }
      return this._dash(e, mdir);
    }
    if (canAct && fresh('heal', 0.2) && e.tonics > 0 && e.hp < e.maxHp) { take('heal'); e.state = 'heal'; e.t = 0; e.anim = 'heal'; e.animT = 0; e.healed = false; this.emit('drink', { e }); return; }
    const wantAttack = fresh('attack', 0.25) || (K.attack.kind === 'shoot' && inp.attackDown);
    // abilities ride on the attack: where a new attack could start (a fresh press for combos, the next shot
    // for shooters), a ready ability that would be useful right now goes off instead. Slot 0 first.
    if (wantAttack && cancelable && (K.attack.kind === 'combo' ? fresh('attack', 0.25) : e.shotT <= 0)) {
      const c = this._autoCast(e, mdir, false);
      if (c) { take('attack'); return this._ability(e, c.slot, mdir, c.tg); }
    } else if (!wantAttack && cancelable && (this.abilityMode === 'auto' || e.ally) && this.combat && (e.autoT -= h) <= 0) {
      e.autoT = 0.1; const c = this._autoCast(e, mdir, true);
      if (c) return this._ability(e, c.slot, mdir, c.tg);
    }
    if (wantAttack && (cancelable || e.state === 'shoot')) {
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
        // the hammer's last blow quakes (wider and harder with a quake weapon); scaled like every hero blow
        // (Hollis's anchor splashes where it lands, at the end of its chain: quakeAt, quakeKind)
        if (a.quake && !e.quaked && e.t >= a.active) { e.quaked = true; const qk = S.trait.quake ? 1.4 : 1; const at = a.quakeAt ?? 1.6; this.addZone({ shape: 'circle', x: e.x + Math.sin(e.face) * at, z: e.z + Math.cos(e.face) * at, r: a.quake * qk, life: 0.12, dmg: this.heroDmg(e, a.dmg * 0.5 * qk), kb: 6, kind: a.quakeKind || 'quake', slot: 'attack' }); }
        if (e.t >= a.dur) free();
        break;
      }
      case 'dash': {
        e.mx = Math.sin(e.dashDir); e.mz = Math.cos(e.dashDir); e.moveSpeed = DASH.speed * (e.t < DASH.dur * 0.7 ? 1 : 0.4);
        if (S.relics.includes('rosary') && (e.trailT = (e.trailT || 0) - h) <= 0) { e.trailT = 0.06; this.addZone({ shape: 'circle', x: e.x, z: e.z, r: 0.7, life: 1.4, dmg: 4, tick: 0.5, status: { burn: 1 }, kind: 'fire' }); }
        // Ashmaw's Echo: the dash leaves a burrowing trail that bursts up a moment later
        if (e.echo.sandwyrm && (e.sandT = (e.sandT || 0) - h) <= 0) { const up = e.echo.sandwyrm > 1; e.sandT = 0.08; this.addZone({ shape: 'circle', x: e.x, z: e.z, r: 1.0, warn: 0.4, life: 0.12, dmg: this.heroDmg(e, up ? 15 : 9), kb: 4, poise: 12, status: up ? { frost: 1 } : null, kind: 'sandtrail' }); }
        if (e.B) this._boonDashStep(e, h);
        if (e.t >= DASH.dur) {
          if (e.B) this._boonDashEnd(e);
          if (e.echo.harbormaster && e.hookT <= 0) this._echoHook(e);
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
      case 'cast': { walk(e.castMove ?? 0); if (e.t >= (e.castDur ?? 0.3)) free(); break; }
      case 'rush': this._slotCtx = 'skill'; this._rush(e, h, free); this._slotCtx = null; if (e.B) { this._boonDashStep(e, h); if (e.state !== 'rush') this._boonDashEnd(e); } break;
      case 'whirl': this._slotCtx = 'skill'; this._whirl(e, h, free); this._slotCtx = null; break;
      case 'charging': this._slotCtx = 'skill'; this._charging(e, h, free); this._slotCtx = null; if (e.B) { this._boonDashStep(e, h); if (e.state !== 'charging') this._boonDashEnd(e); } break;
      case 'special': this._special(e, h, free); break;
    }
  }

  // damage the hero deals: weapon, level, rank, crits, wrath
  heroDmg(e, base, rank = 1) {
    let d = base * e.stats.dmgMul * rankDmg(rank);
    if (e.stats.relics.includes('wick') && e.hp < e.maxHp * 0.4) d *= 1.25;
    if (e.buffs && e.buffs.hush > 0) d *= e.echo.silence > 1 ? 1.7 : 1.5; // the Stilled Hand: after a perfect dodge
    return d;
  }

  // the ultimate's meter: the world's for the player's warden, each ally's own
  _meterOf(e) { return e === this.main ? this.meter : (e.meter || 0); }
  _gain(src, amt) {
    if (!src || src.team !== 'hero' || !src.stats) return;
    if (src === this.main) this.meter = Math.min(100, this.meter + amt * src.stats.ultRate);
    else if (src.ally) src.meter = Math.min(100, (src.meter || 0) + amt * src.stats.ultRate);
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
    this.projs.push({ id: this.nextId++, kind: P.kind, team: 'hero', x: e.x + Math.sin(a) * 0.6, z: e.z + Math.cos(a) * 0.6, y: 1.15, vx: Math.sin(a) * P.speed, vz: Math.cos(a) * P.speed, r: P.r, dmg: this.heroDmg(e, P.dmg), poise: P.poise, life: P.life, pierce: !!tr.pierce, status: P.status, resonate: P.resonate, basic: true, hitSet: new Set(), face: a, src: e });
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
    if (e.B) this._boonDashStart(e, false);
    this._emitBy(e, 'dash', { e });
  }
  // allies' own moves are told apart ('ally' events), so the player's sounds and camera do not answer them
  _emitBy(e, type, data) { if (e && e.ally) this.emit('ally', { what: type, ...data }); else this.emit(type, data); }

  // ------------------------------------------------------------------ abilities
  // Which equipped ability (if any) to cast right now: the first ready one, slot 0 first, that would be
  // useful. Returns { slot, tg } (tg: the foe that made it useful, to aim at) or null.
  _autoCast(e, mdir, auto) {
    const S = e.stats;
    for (let i = 0; i < 2; i++) {
      const ab = S.abilities[i]; if (!ab || !ab.def || ab.def.move || e.cds[i] > 0) continue; // movement abilities wait for the dash
      const tg = this._useful(e, ab.def, mdir, auto);
      if (tg) return { slot: i, tg: tg === true ? null : tg };
    }
    return null;
  }

  // The slot of the movement ability the dash would cast now (the first ready one), or -1.
  _moveSlot(e) {
    const A = e.stats.abilities;
    for (let i = 0; i < 2; i++) if (A[i] && A[i].def && A[i].def.move && e.cds[i] <= 0) return i;
    return -1;
  }
  // hero.dashAbility for the HUD: the movement ability on the dash button ({ id, ready, cd, cdMax }) or null
  _dashAbility(e) {
    const A = e.stats.abilities; let pick = -1;
    for (let i = 0; i < 2; i++) if (A[i] && A[i].def && A[i].def.move) { if (pick < 0) pick = i; if (e.cds[i] <= 0) { pick = i; break; } }
    if (pick < 0) { e.dashAbility = null; return; }
    const d = e.dashAbility && e.dashAbility.slot === pick ? e.dashAbility : (e.dashAbility = { slot: pick });
    d.id = A[pick].id; d.cd = Math.max(0, e.cds[pick]); d.cdMax = e.cdMax[pick] || 1; d.ready = d.cd <= 0;
  }

  // Would this ability do something right now? Returns the foe it is for, true (no particular foe) or null.
  //  - aimed and area abilities: a living, aggro'd foe within reach (and in the clear for aimed ones);
  //  - self-heal / ward: the hero is hurt (below 75%) or foes are close;
  //  - trap / summon: a foe within about 8 m;
  //  - moves (rush, charge, smoke step): never into a hazard.
  _useful(e, A, mdir, auto) {
    const foes = this.foes().filter((f) => f.ai.aggro && f.state !== 'spawn' && !f.hidden);
    if (!foes.length) return null;
    const within = (r) => foes.filter((f) => dist(e, f) <= r + f.r);
    const nearest = (r) => { let b = null, bd = Infinity; for (const f of within(r)) { const d = dist(e, f) - f.r; if (d < bd) { bd = d; b = f; } } return b; };
    const hurt = e.hp < e.maxHp * 0.75;
    // the same soft lock the basic attack uses, among foes that are fighting
    const pick = (range) => {
      let best = null, bs = Infinity;
      for (const f of foes) {
        const d = dist(e, f); if (d > range + f.r) continue;
        const score = d + Math.abs(angDiff(mdir ?? e.face, angTo(e, f))) * 1.6;
        if (score < bs && this.clear(e, f)) { bs = score; best = f; }
      }
      return best;
    };
    // in auto mode a move never pulls the hero against the stick
    const along = (tg) => !auto || mdir === null || mdir === undefined || Math.abs(angDiff(mdir, angTo(e, tg))) < 1.6;
    // where a move toward tg would carry the hero (walls stop it); from: the part of the path that is not covered by i-frames
    const ahead = (tg, len, from = 0) => { const a = angTo(e, tg); const p = this._lastClear(e.x, e.z, e.x + Math.sin(a) * len, e.z + Math.cos(a) * len, e.r); return this._safePath(e.x + (p.x - e.x) * from, e.z + (p.z - e.z) * from, p.x, p.z) ? tg : null; };
    switch (A.kind) {
      case 'wave': return pick(8.5);
      case 'volley': return pick(11);
      case 'pillar': return pick(11);
      case 'shock': return pick(A.r1 - 0.5);
      case 'whirl': return nearest(A.radius - 0.1);
      case 'rush': { const tg = pick(A.dist); return tg && along(tg) ? ahead(tg, A.dist, 0.75) : null; } // untouchable while it cuts: only the landing counts
      case 'charge': { const tg = pick(A.dist + 0.5); return tg && along(tg) ? ahead(tg, A.dist) : null; }
      case 'smoke': {
        const tg = nearest(A.radius); if (!tg) return null;
        const away = angTo(tg, e); const p = this._lastClear(e.x, e.z, e.x + Math.sin(away) * A.dist, e.z + Math.cos(away) * A.dist, e.r);
        return Math.hypot(p.x - e.x, p.z - e.z) > 1.5 && !this._hazardAt(p.x, p.z, e.r + 0.4) ? tg : null;
      }
      case 'trap': case 'wisps': return nearest(8);
      case 'ward': return nearest(A.radius + 0.3) || (hurt && nearest(6)) || null;
      case 'lantern': {
        const close = within(A.radius + 0.6);
        return (hurt || close.length >= 2 || close.some((f) => f.boss)) ? (close[0] || true) : null;
      }
      // Kestrel
      case 'fan': return pick(9);
      case 'noose': return pick(A.range);
      case 'shadow': { // a foe in reach, and a free, safe spot behind it
        const tg = pick(A.range); if (!tg || !along(tg)) return null; const p = this._behind(e, tg);
        return p && !this._hazardAt(p.x, p.z, e.r + 0.4) ? tg : null;
      }
      // Hollis
      case 'undertow': return pick(A.range);
      case 'tide': return pick(7.5);
      case 'barnacle': return nearest(3) || (hurt && nearest(6)) || null;
      // Mother Wren
      case 'shatter': return pick(11);
      case 'lullaby': return nearest(A.radius - 0.2);
      case 'echo': return nearest(9);
    }
    return null;
  }

  // where Shadow Step lands: just behind tg as seen from e (null when walls leave no room)
  _behind(e, tg) {
    const a = angTo(e, tg); const d = tg.r + e.r + 0.45; const tx = tg.x + Math.sin(a) * d, tz = tg.z + Math.cos(a) * d;
    const p = this._lastClear(tg.x, tg.z, tx, tz, e.r); if (Math.hypot(p.x - tg.x, p.z - tg.z) < tg.r + e.r * 0.6) return null;
    const [bx0, bz0, bx1, bz1] = this.bounds; if (p.x < bx0 + e.r || p.x > bx1 - e.r || p.z < bz0 + e.r || p.z > bz1 - e.r) return null;
    return p;
  }

  // is a spot inside a hazard that is on its way or still burning?
  _hazardAt(x, z, pad = 0.4) {
    for (const hz of this.hazards) {
      if (hz.t >= hz.warn + hz.life) continue;
      const d = Math.hypot(x - hz.x, z - hz.z);
      if (hz.shape === 'circle' && d < hz.r + pad) return true;
      if (hz.shape === 'ring') { const k = Math.max(0, (hz.t - hz.warn) / hz.life); const rr = hz.r0 + (hz.r1 - hz.r0) * k; if (d < hz.r1 + pad && Math.abs(d - rr) < 1.3 + pad) return true; } // the band, about to roll over
      if (hz.shape === 'line') { const fx = Math.sin(hz.face), fz = Math.cos(hz.face); const dx = x - hz.x, dz = z - hz.z; const al = dx * fx + dz * fz; if (al > -pad && al < hz.len + pad && Math.abs(dx * fz - dz * fx) < hz.width / 2 + pad) return true; }
    }
    return false;
  }
  _safePath(x0, z0, x1, z1) {
    if (!this.hazards.length) return true;
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5));
    for (let i = 1; i <= n; i++) if (this._hazardAt(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, 0.5)) return false;
    return true;
  }

  // slot: 0 or 1; tg: the foe the cast is for (from _autoCast), aimed at like the old manual cast's soft lock
  // viaDash: cast from the dash press (movement abilities): aimed by the stick, or the facing, like the dash
  _ability(e, slot, mdir, tg = null, viaDash = false) {
    const ab = e.stats.abilities[slot]; const A = ab.def; const r = ab.rank; const S = e.stats;
    const dir = mdir ?? e.face;
    if (viaDash) { tg = null; e.face = dir; e.lockOn = null; }
    e.cds[slot] = A.cd * rankCd(r) * S.cdMul; e.cdMax[slot] = e.cds[slot];
    const cast = (anim, dur, move = 0, cancel = 0.2) => { e.state = 'cast'; e.t = 0; e.anim = anim; e.animT = 0; e.castDur = dur; e.castMove = move; e.castCancel = cancel; e.atk = null; };
    if (tg && tg.dead) tg = null;
    if (tg) { e.face = angTo(e, tg); e.lockOn = tg; }
    const aim = (range) => tg || this._aim(e, mdir, range);
    const fx = Math.sin(e.face), fz = Math.cos(e.face);
    if (e === this.main) this.stats.abilities++; this._emitBy(e, 'ability', { e, id: ab.id, kind: A.kind, slot });
    const np = this.projs.length, nz = this.zones.length; this._slotCtx = 'skill';
    try { this._abilityCast(e, ab, A, r, S, slot, dir, viaDash, tg, aim, cast, fx, fz); } finally { this._slotCtx = null; }
    // what the skill made counts as the skill (boons: skill riders)
    for (let i = np; i < this.projs.length; i++) this.projs[i].slot = this.projs[i].slot || 'skill';
    let at = null; for (let i = nz; i < this.zones.length; i++) { const z = this.zones[i]; z.slot = z.slot || 'skill'; if (!z.follow && !at) at = { x: z.x, z: z.z }; }
    if (e.B) this._boonSkill(e, slot, A, e.lockOn || tg, at);
    // from the dash: the opening of the move is untouchable like a dash, and a blow dodged in it is a perfect dodge
    if (viaDash) { e.iframes = Math.max(e.iframes, DASH.iframes); e.dashAt = this.t; e.perfected = false; e.dodgeUntil = this.t + DASH.iframes; this._emitBy(e, 'dash', { e, ability: ab.id }); }
    // the Deacon's Echo: a pool of black water where the skill went
    if (e.echo.deacon) {
      const up = e.echo.deacon > 1; const at = tg && !tg.dead ? tg : null; const px = at ? at.x : e.x + fx * 2, pz = at ? at.z : e.z + fz * 2;
      this.addZone({ shape: 'circle', x: px, z: pz, r: up ? 2.6 : 2.0, life: 2.6, dmg: this.heroDmg(e, up ? 7 : 4), tick: 0.5, status: { frost: 1 }, kind: 'tidepool' });
    }
    // the Clockmaster's Echo: every third skill winds the other one back
    if (e.echo.clockmaster && ++e.castN % 3 === 0) { const o = 1 - slot; e.cds[o] = 0; }
  }

  _abilityCast(e, ab, A, r, S, slot, dir, viaDash, tg, aim, cast, fx, fz) {
    switch (A.kind) {
      case 'wave': {
        aim(9); cast('slash3', 0.36, 0, 0.22);
        const a = e.face;
        this.projs.push({ id: this.nextId++, kind: 'wave', team: 'hero', x: e.x + Math.sin(a) * 0.8, z: e.z + Math.cos(a) * 0.8, vx: Math.sin(a) * 14, vz: Math.cos(a) * 14, r: 1.15, dmg: this.heroDmg(e, A.dmg, r), poise: 30, life: 0.6, hitSet: new Set(), pierce: true, face: a, src: e });
        break;
      }
      case 'rush': { if (!viaDash) aim(7); e.state = 'rush'; e.t = 0; e.anim = 'thrust'; e.animT = 0.06; e.iframes = 0.34; e.hitSet = new Set(); e.rushDmg = this.heroDmg(e, A.dmg, r); e.rushDist = A.dist; break; }
      case 'whirl': { e.state = 'whirl'; e.t = 0; e.anim = 'whirl'; e.animT = 0; e.whirlK = -1; e.whirl = { dmg: this.heroDmg(e, A.dmg, r), hits: A.hits, radius: A.radius, status: A.status }; break; }
      case 'volley': {
        aim(12); cast(e.kit.attack.anim || 'aim', 0.32, 0.4);
        for (let i = 0; i < A.n; i++) {
          const a = e.face + (i - (A.n - 1) / 2) * A.spread;
          this.projs.push({ id: this.nextId++, kind: 'hbolt', team: 'hero', x: e.x + Math.sin(a) * 0.6, z: e.z + Math.cos(a) * 0.6, y: 1.15, vx: Math.sin(a) * 21, vz: Math.cos(a) * 21, r: 0.25, dmg: this.heroDmg(e, A.dmg, r), poise: 8, life: 0.7, pierce: !!S.trait.pierce, hitSet: new Set(), face: a, src: e });
        }
        break;
      }
      case 'smoke': {
        const near = viaDash ? null : (tg || this._nearestFoe(e, 8)); const away = viaDash ? dir : (near ? angTo(near, e) : e.face + Math.PI);
        this.addZone({ shape: 'circle', x: e.x, z: e.z, r: A.radius, warn: 0.45, life: 0.15, dmg: this.heroDmg(e, A.dmg, r), stun: A.stun, kind: 'smoke' });
        const tx = e.x + Math.sin(away) * A.dist, tz = e.z + Math.cos(away) * A.dist;
        const p = this._lastClear(e.x, e.z, tx, tz, e.r); this._emitBy(e, 'blinkHero', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; e.face = wrap(away + Math.PI);
        e.iframes = 0.3; cast('dash', 0.22, 0);
        break;
      }
      case 'trap': { cast('cast', 0.3); this.addZone({ shape: 'circle', x: e.x + fx * 1.2, z: e.z + fz * 1.2, r: A.radius, life: A.life, dmg: this.heroDmg(e, A.dmg, r), root: A.root, trigger: true, kind: 'trap' }); break; }
      case 'shock': { cast('hsmash2', 0.5, 0, 0.42); this.addZone({ shape: 'ring', x: e.x + fx * 1.2, z: e.z + fz * 1.2, r0: 0.8, r1: A.r1, warn: 0.3, life: 0.5, dmg: this.heroDmg(e, A.dmg, r), kb: 7, kind: 'shock' }); this.emit('shake', { amt: 0.4 }); break; }
      case 'charge': { if (!viaDash) aim(8); e.state = 'charging'; e.t = 0; e.anim = 'charge'; e.animT = 0; e.hitSet = new Set(); e.iframes = 0.25; e.chargeA = { dmg: this.heroDmg(e, A.dmg, r), slam: this.heroDmg(e, A.slam, r), radius: A.radius, dist: A.dist, slammed: false }; break; }
      case 'ward': { cast('roar', 0.4); e.buffs.ward = A.dur; e.wardPulse = 0; e.wardDmg = this.heroDmg(e, A.dmg, r); e.wardR = A.radius; this.addZone({ shape: 'circle', follow: e, r: A.radius, life: A.dur, dmg: e.wardDmg, tick: 0.6, kind: 'ward' }); break; }
      case 'pillar': {
        const at = aim(11) || null; cast('cast', 0.34);
        const px = at ? at.x : e.x + Math.sin(e.face) * 4, pz = at ? at.z : e.z + Math.cos(e.face) * 4;
        this.addZone({ shape: 'circle', x: px, z: pz, r: A.radius, warn: A.delay, life: 0.2, dmg: this.heroDmg(e, A.dmg, r), status: A.status, kind: 'pillar' });
        break;
      }
      case 'lantern': {
        cast('cast', 0.4, 0.3); const amt = Math.round(e.maxHp * A.heal * rankDmg(r) * 0.8 + e.maxHp * 0.02); e.hp = Math.min(e.maxHp, e.hp + amt); this.emit('heal', { e, amt });
        this.addZone({ shape: 'circle', follow: e, r: A.radius, life: A.dur, dmg: this.heroDmg(e, A.dmg, r), tick: 0.5, status: { burn: 1 }, kind: 'lantern' });
        break;
      }
      case 'wisps': {
        cast('cast', 0.3);
        for (let i = 0; i < A.n; i++) { const a = e.face + (i / A.n) * TAU; this.projs.push({ id: this.nextId++, kind: 'wisp', team: 'hero', x: e.x + Math.sin(a), z: e.z + Math.cos(a), y: 1.4, vx: Math.sin(a) * 3, vz: Math.cos(a) * 3, r: 0.35, dmg: this.heroDmg(e, A.dmg, r), poise: 15, life: 4, homing: 7, seekAfter: 0.35 + i * 0.12, status: { burn: 1 }, hitSet: new Set(), src: e }); }
        break;
      }
      // ---- Kestrel
      case 'fan': {
        aim(10); cast('kthrow', 0.3, 0.3);
        for (let i = 0; i < A.n; i++) {
          const a = e.face + (i - (A.n - 1) / 2) * A.spread;
          this.projs.push({ id: this.nextId++, kind: 'knife', team: 'hero', x: e.x + Math.sin(a) * 0.6, z: e.z + Math.cos(a) * 0.6, y: 1.1, vx: Math.sin(a) * 20, vz: Math.cos(a) * 20, r: 0.25, dmg: this.heroDmg(e, A.dmg, r), poise: 8, life: 0.55, pierce: !!S.trait.pierce, status: A.status, hitSet: new Set(), face: a, src: e });
        }
        break;
      }
      case 'shadow': {
        const t = viaDash ? this._foeToward(e, dir, A.range) : aim(A.range); const p = t && this._behind(e, t);
        if (!t || !p) { // nobody that way: a long blink along the dash, no strike
          const q = this._lastClear(e.x, e.z, e.x + Math.sin(dir) * 5, e.z + Math.cos(dir) * 5, e.r);
          this._emitBy(e, 'blinkHero', { e, fx: e.x, fz: e.z, x: q.x, z: q.z }); e.x = q.x; e.z = q.z; e.iframes = 0.3; cast('kstab', 0.26, 0, 0.2); break;
        }
        this._emitBy(e, 'blinkHero', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; e.face = angTo(e, t); e.lockOn = t;
        e.iframes = 0.4; cast('kstab', 0.34, 0, 0.26);
        this._damage(e, t, this.heroDmg(e, A.dmg, r), { poise: 35, kb: 3, heavy: true, status: A.status, kind: 'backstab' });
        break;
      }
      case 'noose': {
        const t = aim(A.range); const px = t ? t.x : e.x + fx * 5, pz = t ? t.z : e.z + fz * 5; cast('kthrow', 0.3);
        this.emit('hook', { e, x: px, z: pz, hit: !!t });
        this.addZone({ shape: 'circle', x: px, z: pz, r: A.radius, warn: 0.15, life: 0.15, dmg: this.heroDmg(e, A.dmg, r), root: A.root, status: { bleed: 1 }, kind: 'noose' });
        break;
      }
      // ---- Hollis
      case 'undertow': {
        const t = aim(A.range); const px = t ? t.x : e.x + fx * 6, pz = t ? t.z : e.z + fz * 6; cast('athrow', 0.45, 0, 0.32);
        this.emit('hook', { e, x: px, z: pz, hit: !!t }); this.emit('shake', { amt: 0.25 });
        const dmg = this.heroDmg(e, A.dmg, r);
        for (const f of this.foes()) {
          if (f.state === 'spawn' || f.hidden || Math.hypot(f.x - px, f.z - pz) > A.radius + f.r || !this.clear(e, f)) continue;
          this._damage(e, f, dmg, { poise: 20, pull: dist(e, f), heavy: true, aoe: true, kind: 'undertow' });
        }
        this.addZone({ shape: 'circle', x: px, z: pz, r: A.radius, life: 0.3, dmg: 0, visual: true, kind: 'tidepool' });
        break;
      }
      case 'tide': {
        aim(8); cast('aslam', 0.5, 0, 0.42); const a = e.face;
        this.projs.push({ id: this.nextId++, kind: 'tide', team: 'hero', x: e.x + Math.sin(a) * 0.9, z: e.z + Math.cos(a) * 0.9, y: 0.6, vx: Math.sin(a) * 11, vz: Math.cos(a) * 11, r: 1.45, dmg: this.heroDmg(e, A.dmg, r), poise: 26, kb: 5, life: 0.7, hitSet: new Set(), pierce: true, ghost: true, status: A.status, face: a, src: e });
        this.emit('shake', { amt: 0.3 });
        break;
      }
      case 'barnacle': { cast('roar', 0.4); e.buffs.barnacle = A.dur; e.barnReduce = A.reduce; e.barnDmg = this.heroDmg(e, A.dmg, r); this.emit('shieldUp', { e, x: e.x, z: e.z }); break; }
      // ---- Mother Wren
      case 'shatter': {
        const t = aim(11); cast('chant', 0.34, 0.3);
        const px = t ? t.x : e.x + fx * 5, pz = t ? t.z : e.z + fz * 5;
        this.addZone({ shape: 'circle', x: px, z: pz, r: A.radius, warn: A.delay, life: 0.18, dmg: this.heroDmg(e, A.dmg, r), shatter: this.heroDmg(e, A.per, r), resonate: 1, kind: 'hymn' });
        break;
      }
      case 'lullaby': { cast('chant', 0.42, 0.2); this.addZone({ shape: 'circle', x: e.x, z: e.z, r: A.radius, life: 0.2, dmg: this.heroDmg(e, A.dmg, r), stun: A.stun, resonate: 1, kind: 'lull' }); break; }
      case 'echo': { cast('chant', 0.3, 0.4); e.buffs.echo = A.dur; e.echoT = 0.25; e.echoRate = A.rate; e.echoDmg = this.heroDmg(e, A.dmg, r); e.echoSide = 1; break; }
    }
  }

  // the foe a dash-cast Shadow Step goes for: in reach, near the dash direction, in the clear
  _foeToward(e, dir, range) {
    let best = null, bs = Infinity;
    for (const f of this.foes()) {
      if (f.state === 'spawn' || f.hidden) continue; const d = dist(e, f); if (d > range + f.r) continue;
      const off = Math.abs(angDiff(dir, angTo(e, f))); if (off > 1.0) continue;
      const sc = d + off * 2; if (sc < bs && this.clear(e, f)) { bs = sc; best = f; }
    }
    return best;
  }

  // Echo Choir: one of the two echoes beside Mother Wren sings a note at the nearest foe
  _echoVoice(e) {
    e.echoT = e.echoRate || 0.5; e.echoSide = -(e.echoSide || 1);
    const tg = this._nearestFoe(e, 11); if (!tg || tg.state === 'spawn') return;
    const ox = e.x + Math.sin(e.face + e.echoSide * 1.6) * 0.9, oz = e.z + Math.cos(e.face + e.echoSide * 1.6) * 0.9;
    if (!this.clear({ x: ox, z: oz }, tg)) return;
    const a = Math.atan2(tg.x - ox, tg.z - oz);
    this.projs.push({ id: this.nextId++, kind: 'note', team: 'hero', x: ox, z: oz, y: 1.7, vx: Math.sin(a) * 13, vz: Math.cos(a) * 13, r: 0.3, dmg: e.echoDmg, poise: 6, life: 1.0, resonate: 1, homing: 4, seekAfter: 0.05, hitSet: new Set(), face: a, src: e, slot: 'skill' });
    this._emitBy(e, 'shoot', { e, kind: 'note' });
  }

  // the Harbormaster's Echo: the end of a dash throws a hook at the nearest foe (two when Ascended) and drags it in
  _echoHook(e) {
    const up = e.echo.harbormaster > 1; let n = 0;
    const list = this.foes().filter((f) => f.state !== 'spawn' && !f.hidden && f.ai.aggro && dist(e, f) < 7 + f.r && this.clear(e, f)).sort((a, b) => dist(e, a) - dist(e, b));
    for (const f of list) {
      if (n >= (up ? 2 : 1)) break; n++;
      this.emit('hook', { e, x: f.x, z: f.z, hit: true });
      this._damage(e, f, this.heroDmg(e, 8), { poise: 12, pull: dist(e, f), kind: 'hook' });
    }
    if (n) e.hookT = up ? 2 : 3;
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
    if (e === this.main) this.meter = 0; else e.meter = 0;
    e.state = 'special'; e.t = 0; e.animT = 0; e.atk = null; e.spK = -1; e.ultDef = D; e.ultDmg = this.heroDmg(e, D.dmg, r);
    e.anim = { requiem: 'special', rain: 'aim', toll: 'hsmash2', sunburst: 'roar', cutstorm: 'kstorm', flood: 'bellring', choir: 'choir' }[D.kind] || 'special';
    e.iframes = D.dur + 0.3; e.ultFin = D.finale ? this.heroDmg(e, D.finale, r) : 0; e.stormAt = { x: e.x, z: e.z };
    this._emitBy(e, 'special', { e, kind: D.kind }); if (!e.ally) this.slow(0.35, 0.35);
    if (e.B) this._boonUlt(e, 'start');
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
    } else if (D.kind === 'cutstorm') {
      // Kestrel flickers from foe to foe around where she stood, cutting each one she lands behind
      const step = (D.dur - 0.35) / D.hits; const k = Math.floor((e.t - 0.2) / step);
      if (e.t > 0.2 && k < D.hits && k !== e.spK) {
        e.spK = k; const c = e.stormAt;
        const near = this.foes().filter((f) => f.state !== 'spawn' && !f.hidden && Math.hypot(f.x - c.x, f.z - c.z) < D.radius + f.r).sort((a, b) => dist(e, a) - dist(e, b));
        const tg = near.length ? near[(k * 7) % Math.min(near.length, 4)] : null;
        if (tg) {
          const p = this._behind(e, tg); if (p) { if (k % 2 === 0) this._emitBy(e, 'blinkHero', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; }
          e.face = angTo(e, tg); e.animT = 0.2 + (k % 3) * 0.05;
          for (const f of near) if (Math.hypot(f.x - tg.x, f.z - tg.z) < 1.9 + f.r) this._damage(e, f, e.ultDmg, { poise: 18, kb: 1.5, special: true, status: D.status, aoe: true });
        }
        this.emit('whirlHit', { e, k });
      }
    } else if (D.kind === 'flood') {
      // the bell on Hollis's back tolls three times: each toll drags the street in, then a ring of water rolls out
      const k = Math.floor((e.t - 0.25) / 0.6);
      if (e.t > 0.25 && k < D.rings && k !== e.spK) {
        e.spK = k;
        for (const f of this.foes()) { if (f.state === 'spawn' || f.hidden || dist(e, f) > D.radius + f.r) continue; this._damage(e, f, e.ultDmg * 0.35, { pull: dist(e, f), special: true, aoe: true, kind: 'undertow' }); }
        this.addZone({ shape: 'ring', x: e.x, z: e.z, r0: 0.8, r1: D.radius * 0.8, warn: 0.12, life: 0.5, dmg: e.ultDmg, kb: 7, status: D.status, kind: 'tidering', special: true });
        this.emit('toll', { e, k }); this.emit('shake', { amt: 0.6 });
      }
    } else if (D.kind === 'choir') {
      // Mother Wren sings: notes fall on every foe near her, then the last chord shatters the resonance
      if ((e.rainT = (e.rainT || 0) - h) <= 0 && e.t > 0.2 && e.t < D.dur - 0.4) {
        e.rainT = D.rate; const foes = this.foes().filter((f) => f.state !== 'spawn' && !f.hidden && dist(e, f) < D.radius);
        const f = foes.length ? foes[(this.rand() * foes.length) | 0] : null; let x, z;
        if (f) { x = f.x; z = f.z; } else { const a = this.rand() * TAU, d = Math.sqrt(this.rand()) * D.radius * 0.7; x = e.x + Math.sin(a) * d; z = e.z + Math.cos(a) * d; }
        this.addZone({ shape: 'circle', x, z, r: D.r, warn: 0.18, life: 0.08, dmg: e.ultDmg, resonate: 1, kind: 'hymn', special: true });
      }
      if (e.t >= D.dur - 0.4 && e.spK < 0) { e.spK = 1; this.addZone({ shape: 'circle', x: e.x, z: e.z, r: D.radius, life: 0.15, dmg: e.ultFin, shatter: e.ultFin * 0.25, kb: 6, kind: 'hymn', special: true }); this.emit('shake', { amt: 0.8 }); }
      if (e.t > 0.3) { const inp = e.inp || NONE; const ml = Math.hypot(inp.mx || 0, inp.mz || 0); if (ml > 0.15) { e.mx = inp.mx / ml; e.mz = inp.mz / ml; e.moveSpeed = e.speed * 0.4; } }
    }
    if (e.t >= D.dur) {
      e.iframes = 0.3; if (e.B) this._boonUlt(e, 'end');
      // the Hollow Crown: every ultimate ends in a burst of void
      if (e.echo.archon) { const up = e.echo.archon > 1; this.addZone({ shape: 'circle', x: e.x, z: e.z, r: up ? 6 : 5, life: 0.15, dmg: this.heroDmg(e, up ? 70 : 40), kb: 6, kind: 'void', special: true }); this.emit('shake', { amt: 0.5 }); }
      free();
    }
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
    const targets = a.team === 'hero' ? this.foes() : this.heroTeam();
    for (const t of targets) {
      if (a.hitSet.has(t.id) || t.state === 'spawn' || t.hidden) continue;
      if (!this._inShape(a, atk, t) || !this.clear(a, t)) continue;
      a.hitSet.add(t.id);
      if (a.team === 'hero') this._damage(a, t, this.heroDmg(a, atk.dmg), { poise: atk.poise * (a.stats.trait.poise || 1), kb: atk.kb, heavy: atk.heavy, atk, basic: true, pull: atk.pull ? Math.min(atk.pull, dist(a, t)) : 0 });
      else this._damage(a, t, atk.dmg * a.dmgMul, { kb: atk.kb, heavy: atk.heavy, atk, melee: true, src: a });
    }
  }

  // The one place damage happens.
  _damage(src, dst, dmg, o = {}) {
    if (dst.dead) return false;
    const main = this.main;
    if (dst.team === 'hero') {
      const isMain = dst === main;
      // perfect dodge: a blow that lands inside the first part of a dash
      if ((dst.state === 'dash' || this.t < (dst.dodgeUntil || 0)) && dst.iframes > 0) {
        if (this.t - dst.dashAt <= DASH.perfectWindow + 0.06 && !dst.perfected) {
          dst.perfected = true; this._gain(dst, METER.onPerfect);
          if (isMain) { this.stats.perfects++; this.slow(0.7, 0.3); this.emit('perfect', { e: dst, src }); }
          if (dst.echo.silence) { const up = dst.echo.silence > 1; dst.buffs.hush = up ? 3 : 2; if (isMain) { this.slow(up ? 1.2 : 1.0, 0.25); this.emit('hush', { e: dst }); } }
          if (dst.B) this._boonPerfect(dst);
        }
        return false;
      }
      if (dst.iframes > 0 || dst.state === 'special') return false;
      // Ten Thousand Names: a ward of bone turns the blow aside
      if (dst.boneWard > 0) { dst.boneWard--; dst.iframes = 0.4; this.emit('block', { e: dst, src, x: dst.x, z: dst.z }); this.emit('boneWard', { e: dst, n: dst.boneWard }); this.stop(0.05); return false; }
      let real = dmg * dst.stats.dmgTaken * (dst.buffs.ward > 0 ? 0.5 : 1) * (dst.buffs.barnacle > 0 ? 1 - dst.barnReduce : 1);
      if (dst.status.mark) real *= 1.15; // a void foe's mark: the marked take more
      real = this._boonGuard(dst, src, real, o); // boons: shields, mail, the poisoned's weakness (shields soak first)
      if (real <= 0.5) { dst.iframes = Math.max(dst.iframes, 0.25); dst.flash = 0.08; this.emit('block', { e: dst, src, x: dst.x, z: dst.z, shield: true }); if (src && src.element) this._elOnHero(src, dst, 0); return false; }
      real = Math.max(1, Math.round(real));
      // Barnacle Guard: what strikes Hollis in close is cut and chilled
      if (dst.buffs.barnacle > 0 && o.melee && src && !src.dead && src.team === 'foe') this._damage(dst, src, dst.barnDmg, { kb: 3, aoe: true, status: { frost: 1 }, kind: 'barnacle' });
      dst.hp -= real; dst.flash = 0.15; dst.iframes = 0.55; if (isMain) this.stats.damageTaken += real;
      this._gain(dst, METER.onHurt);
      const ang = src ? Math.atan2(dst.x - src.x, dst.z - src.z) : 0; const kb = (o.kb || 3) * (dst.kit.armor ? 0.5 : 1);
      dst.kbx = Math.sin(ang) * kb; dst.kbz = Math.cos(ang) * kb;
      this.emit('hit', { src, dst, dmg: real, x: dst.x, z: dst.z, ang, heavy: o.heavy, hero: isMain, ally: !isMain });
      if (isMain) { this.stop(o.heavy ? 0.1 : 0.06); this.emit('shake', { amt: o.heavy ? 0.45 : 0.25 }); }
      // elite foes' touch
      if (src && src.elite) { const A = AFFIXES[src.elite]; if (A.hit) for (const k in A.hit) this.applyStatus(dst, k, { dps: 5 }); if (A.leech) { src.hp = Math.min(src.maxHp, src.hp + real * A.leech); } }
      if (src && src.element) this._elOnHero(src, dst, real);
      if (o.status) for (const k in o.status) this.applyStatus(dst, k, { dps: o.dps || 5 });
      if (dst.hp <= 0) return this._heroDown(dst);
      // the armoured hero keeps swinging through blows
      const armored = dst.kit.armor && (dst.state === 'attack' || dst.state === 'charging');
      if (!armored && (dst.state !== 'heal' || o.heavy) && dst.state !== 'rush') { dst.state = 'hurt'; dst.t = 0; dst.anim = 'hurt'; dst.animT = 0; dst.atk = null; }
      return true;
    }
    // a foe
    if (dst.state === 'spawn' || dst.iframes > 0) return false;
    const ang = Math.atan2(dst.x - src.x, dst.z - src.z);
    const byHero = src && src.team === 'hero' && !!src.stats; // the player's warden or an ally
    const byMain = byHero && src === main;
    // shield: frontal blows are blocked until the guard breaks
    if (dst.def.shield && !o.special && !o.aoe && dst.state !== 'stagger' && dst.state !== 'attack' && dst.state !== 'windup' && Math.abs(angDiff(dst.face, ang + Math.PI)) < 1.2) {
      dst.poise -= (o.poise || 10) * (o.heavy ? 1.2 : 0.6); dst.flash = 0.06;
      this.emit('block', { e: dst, src, x: dst.x - Math.sin(ang) * 0.5, z: dst.z - Math.cos(ang) * 0.5 });
      if (byHero && !o.heavy && !o.proj) { src.kbx = -Math.sin(ang) * 3; src.kbz = -Math.cos(ang) * 3; }
      if (dst.poise <= 0) { this._gain(src, METER.onBreak); this._stagger(dst, 1.8); }
      if (byMain) this.stop(0.04);
      return false;
    }
    let real = dmg; let crit = false;
    if (byHero && (this.rand() < (src.stats.crit || 0) || this._veilCrit(src, o))) { real *= 2; crit = true; if (byMain) this.stats.crits++; }
    if (dst.state === 'stagger') real *= 1.4;
    if (byHero) {
      if (dst.status.resonate) real *= 1 + 0.1 * dst.status.resonate.stacks; // Mother Wren: resonating foes take more
      if (dst.status.frost && src.echo && src.echo.frostgiant) real *= src.echo.frostgiant > 1 ? 1.25 : 1.15; // Hoarfrost Breath
      if (dst.status.brittle) real *= 1.2; // frozen through, a great foe cracks
      if (src.B) real *= this._boonMul(src, dst, o);
    }
    real = Math.round(real);
    if (dst.shield > 0) { const ab = Math.min(dst.shield, real); dst.shield -= ab; real -= ab; if (dst.shield <= 0) this.emit('shieldBreak', { e: dst }); }
    dst.hp -= real; dst.flash = 0.12; if (byMain) this.stats.hits++;
    if (byHero && !o.special) this._gain(src, METER.onHit);
    const kb = (o.kb || 2) / Math.max(0.6, dst.mass) * (dst.boss ? 0.15 : 1);
    if (!(dst.armor && (dst.state === 'windup' || dst.state === 'attack'))) {
      if (o.pull && src) { // dragged toward the source, to just in front of it (the anchor's undertow, hooks)
        const d = Math.hypot(dst.x - src.x, dst.z - src.z); const gap = Math.max(0, d - (src.r || 0.4) - dst.r - 0.35);
        const k = Math.min(o.pull, gap) * 5.5 / Math.max(1, dst.mass * 0.7) * (dst.boss ? 0.15 : 1);
        dst.kbx = -Math.sin(ang) * k; dst.kbz = -Math.cos(ang) * k;
      } else { dst.kbx = Math.sin(ang) * kb; dst.kbz = Math.cos(ang) * kb; }
    }
    this.emit('hit', { src, dst, dmg: real, x: dst.x, z: dst.z, ang, heavy: o.heavy, special: o.special, crit, kind: o.kind, ally: byHero && !byMain, boon: !!o.boon });
    if (!o.special && !o.dotLike && (byMain || !byHero)) this.stop(o.heavy ? 0.085 : (o.proj ? 0.02 : 0.045));
    if (o.heavy && (byMain || !byHero)) this.emit('shake', { amt: 0.3 });
    // what the blow carries: statuses, weapon traits, relics, boons
    if (byHero) { const pc = this._caster; this._caster = src; this._onHeroHit(src, dst, real, o); this._caster = pc; }
    if (dst.hp <= 0) return this._kill(dst, src, o);
    if (o.resonate) this.applyStatus(dst, 'resonate', { stacks: o.resonate });
    if (o.stun) this.applyStatus(dst, 'stun', { dur: o.stun });
    if (o.root) this.applyStatus(dst, 'root', { dur: o.root });
    // poise and interrupts
    if (!dst.boss) {
      dst.poise -= o.poise || 0;
      if (dst.poise <= 0 && dst.state !== 'stagger') { this._gain(src, METER.onBreak); this._stagger(dst, 1.7); }
      else if (!dst.armor && !dst.shield && dst.state !== 'stagger' && dst.state !== 'hurt' && (dst.flinch >= 1 || o.heavy && dst.flinch >= 0.5)) {
        // a foe flinches a few times, then fights through the blows (button mashing gets punished)
        dst.flinch -= o.heavy ? 0.5 : 1;
        dst.state = 'hurt'; dst.t = 0; dst.anim = 'hurt'; dst.animT = 0; dst.atk = null; dst.tele = null; dst.stun = o.heavy ? 0.55 : 0.32;
      }
    } else {
      dst.poise -= (o.poise || 0) * 0.5;
      if (dst.poise <= 0 && dst.state !== 'stagger' && !dst.hidden) { this._gain(src, METER.onBreak); dst.staggers = (dst.staggers || 0) + 1; dst.maxPoise = 300 * Math.min(2, 1 + 0.25 * dst.staggers); dst.poise = dst.maxPoise; dst.state = 'stagger'; dst.t = 0; dst.anim = 'stagger'; dst.animT = 0; dst.stagT = 2.2; dst.tele = null; dst.atk = null; dst.leapFrom = null; dst.leapH = 0; this.emit('stagger', { e: dst }); }
    }
    return true;
  }

  // an elemental foe's blow on the hero's side: its element's status (blood drinks, storm leaps to a friend beside)
  _elOnHero(src, dst, real) {
    const el = src.element; const st = EL_STATUS[el]; const lvl = 1 + (src.def && src.def.tier ? src.def.tier * 0.15 : 0);
    if (el === 'frost') this.applyStatus(dst, 'frost', { dur: 1.6 });
    else if (el === 'storm') { this.applyStatus(dst, 'shock', { dur: 1.5 }); for (const o of this.heroTeam()) if (o !== dst && dist(o, dst) < 4) { this._fx({ k: 'arc', x0: dst.x, z0: dst.z, x1: o.x, z1: o.z, el: 'storm' }); this._dotHero(o, Math.round(3 * lvl), 'shock'); break; } }
    else if (el === 'blood') { this.applyStatus(dst, 'bleed', { dps: 3 * lvl }); if (real > 0) src.hp = Math.min(src.maxHp, src.hp + real * 0.35); }
    else if (el === 'void') this.applyStatus(dst, 'mark', { dur: 4, stacks: 1, max: 1 });
    else this.applyStatus(dst, st, { dps: (el === 'holy' ? 3 : 4) * lvl });
  }
  // an elemental foe strikes: a small hazard of its element where the blow fell (one every couple of seconds)
  _elHazard(e, x, z) {
    if (!e.element || this.t < (e.elT || 0)) return; e.elT = this.t + 2.2; const m = e.dmgMul || 1;
    const H = {
      fire: { r: 1.2, warn: 0.3, life: 2.4, tick: 0.5, dmg: 3 * m, status: { burn: 1 }, kind: 'fire' },
      frost: { r: 1.4, warn: 0.3, life: 3, tick: 0.5, dmg: 1, status: { frost: 1 }, kind: 'frost' },
      poison: { r: 1.3, warn: 0.3, life: 3.4, tick: 0.5, dmg: 2 * m, status: { poison: 1 }, kind: 'acid' },
      storm: { r: 1.1, warn: 0.75, life: 0.12, dmg: 9 * m, status: { shock: 1 }, kind: 'lightning' },
      blood: { r: 1.2, warn: 0.3, life: 3, tick: 0.5, dmg: 2 * m, status: { bleed: 1 }, kind: 'blood' },
      holy: { r: 1.7, warn: 0.85, life: 0.15, dmg: 10 * m, status: { sear: 1 }, kind: 'holy' },
      void: { r: 1.4, warn: 0.3, life: 2.2, tick: 0.5, dmg: 2 * m, status: { mark: 1 }, kind: 'curse', pull: 1.4 },
    }[e.element];
    if (H) this.addHazard({ shape: 'circle', x, z, src: e, el: e.element, ...H });
  }

  _onHeroHit(hero, dst, real, o) {
    const T = hero.stats.trait; const R = hero.stats.relics; const base = real || 1;
    const B = hero.B;
    if (o.status) for (const k in o.status) if (o.status[k] && this.rand() < o.status[k]) this.applyStatus(dst, k, { dps: Math.max(3, base * (k === 'burn' ? 0.22 : 0.15)) * (k === 'burn' && B ? B.burnMul : 1), stack: !!B, max: B ? (k === 'poison' ? B.poisonMax : (k === 'bleed' ? B.bleedMax : 5)) : undefined, at: B ? B.freezeAt : 3, src: hero });
    if (o.basic || o.proj) {
      for (const k of ['burn', 'bleed', 'frost']) if (T[k] && this.rand() < T[k]) this.applyStatus(dst, k, { dps: Math.max(3, base * (k === 'burn' ? 0.22 : 0.15)) });
      if (T.leech) hero.hp = Math.min(hero.maxHp, hero.hp + base * T.leech);
    }
    // the Echoes that ride on a blow
    const E = hero.echo || {};
    if ((o.basic || o.proj) && !o.chain) {
      const ch = (k, a, b) => E[k] && this.rand() < (E[k] > 1 ? b : a);
      if (ch('gaoler', 0.14, 0.22)) { if (dst.boss) this.applyStatus(dst, 'frost', { dur: 1 }); else this.applyStatus(dst, 'root', { dur: E.gaoler > 1 ? 1.6 : 1.0 }); this.emit('hook', { e: hero, x: dst.x, z: dst.z, hit: true, echo: 'gaoler' }); }
      if (ch('tallow', 0.18, 0.28)) this.applyStatus(dst, 'burn', { dps: Math.max(3, base * 0.22) * (E.tallow > 1 ? 1.4 : 1) });
      if (ch('frostgiant', 0.25, 0.4)) this.applyStatus(dst, 'frost', {});
      if (ch('bogmother', 0.2, 0.32)) this.applyStatus(dst, 'poison', { dps: Math.max(3, base * 0.2) * (E.bogmother > 1 ? 1.5 : 1) });
      if (E.founder && !o.aoe && ((o.basic && o.heavy) || (o.proj && o.basic && ++hero.shotN % 4 === 0))) {
        const up = E.founder > 1; this.addZone({ shape: 'circle', x: dst.x, z: dst.z, r: up ? 2.2 : 1.6, life: 0.12, dmg: base * (up ? 0.45 : 0.3), status: { burn: 1 }, kb: 3, kind: 'fire' });
      }
    }
    if (!o.chain && ((T.shock && (o.basic || o.proj) && this.rand() < T.shock) || (R.includes('storm') && this.rand() < 0.1))) {
      let n = 0;
      for (const f of this.foes()) { if (f === dst || n >= 2 || dist(f, dst) > 4.5) continue; n++; this.emit('chain', { from: dst, to: f }); this._fx({ k: 'arc', x0: dst.x, z0: dst.z, x1: f.x, z1: f.z, el: 'storm' }); this._damage(hero, f, base * 0.5, { chain: true, kb: 1, dotLike: true }); }
    }
    if (B) this._boonHit(hero, dst, real, o);
  }

  _heroDown(e) {
    if (e.ally || e !== this.main) { // an ally falls: out of this fight
      e.hp = 0; e.dead = true; e.state = 'dead'; e.anim = 'die'; e.animT = 0; e.deadT = 0; e.status = {}; this.emit('allyDown', { e }); return true;
    }
    if (e.revives > 0) { e.revives--; e.hp = Math.round(e.maxHp * 0.3); e.iframes = 2; e.state = 'idle'; e.anim = 'idle'; this.emit('revive', { e }); this.slow(0.8, 0.3); return true; }
    e.hp = 0; e.dead = true; e.state = 'dead'; e.anim = 'die'; e.animT = 0; this.emit('heroDeath', { e }); this.slow(1.2, 0.25); return true;
  }

  _stagger(e, time) {
    e.state = 'stagger'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.atk = null; e.tele = null; e.stagT = time; e.poise = e.maxPoise;
    this.emit('stagger', { e });
  }

  _kill(e, src, o) {
    const burning = !!(e.status && e.status.burn); const st = e.status || {};
    e.hp = 0; e.dead = true; e.state = 'dead'; e.anim = o.heavy && !e.boss ? 'dieHard' : 'die'; e.animT = 0; e.tele = null; e.deadT = 0; e.leapH = 0; e.status = {};
    this.stats.kills++; if (src && src.ally) this.stats.allyKills++; const hero = this.main;
    if (hero && !hero.dead) {
      this.meter = Math.min(100, this.meter + METER.onKill * hero.stats.ultRate);
      if (hero.stats.relics.includes('thread')) hero.hp = Math.min(hero.maxHp, hero.hp + 3);
      if (hero.stats.relics.includes('crown') && this.rand() < 0.12) { hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * 0.08)); this.emit('crown', { x: e.x, z: e.z }); }
      if (e.team === 'foe') this._echoKill(hero, e, burning);
      if (e.team === 'foe' && hero.B) this._boonKill(hero, e, st);
    }
    const drop = e.boss ? 0 : Math.round((e.def.drop || 5) * (e.elite ? 2.5 : 1)); this.embers += drop;
    const xp = e.boss ? 0 : Math.round((e.def.drop || 5) * 2.2 * (e.elite ? 2.5 : 1) * (1 + (e.def.tier || 0) * 0.25));
    this.emit('kill', { e, src, drop, xp, x: e.x, z: e.z, boss: !!e.boss, elite: e.elite });
    if (this.foes().length === 0 || e.boss) this.slow(e.boss ? 2.2 : 0.55, e.boss ? 0.2 : 0.35);
    return 'kill';
  }

  // the Echoes that answer a kill
  _echoKill(hero, e, burning) {
    const E = hero.echo || {};
    if (E.tallow && burning) { const up = E.tallow > 1; this.addZone({ shape: 'circle', x: e.x, z: e.z, r: up ? 2.4 : 1.8, life: 0.12, dmg: this.heroDmg(hero, up ? 26 : 16), status: { burn: 1 }, kb: 4, kind: 'fire' }); }
    if (E.regent) { const amt = Math.round(hero.maxHp * (E.regent > 1 ? 0.05 : 0.03)); hero.hp = Math.min(hero.maxHp, hero.hp + amt); this.emit('crown', { x: e.x, z: e.z }); }
    if (E.ossuary && this.t >= hero.boneT) { const max = E.ossuary > 1 ? 2 : 1; if (hero.boneWard < max) { hero.boneWard++; hero.boneT = this.t + 4; this.emit('boneWard', { e: hero, n: hero.boneWard }); this.emit('shieldUp', { e: hero, x: hero.x, z: hero.z }); } }
    if (E.lich && this.projs.filter((p) => p.spirit).length < 3) {
      this.projs.push({ id: this.nextId++, kind: 'soul', team: 'hero', spirit: true, x: e.x, z: e.z, y: 1.3, vx: 0, vz: 2, r: 0.35, dmg: this.heroDmg(hero, E.lich > 1 ? 22 : 14), poise: 12, life: 4, homing: 6, seekAfter: 0.3, hitSet: new Set(), src: null, face: 0 });
    }
  }

  _nearestFoe(e, range = 99) { let best = null, bd = range; for (const f of this.foes()) { const d = dist(e, f); if (d < bd && !f.hidden) { bd = d; best = f; } } return best; }

  // ------------------------------------------------------------------ foes
  // with allies about, a foe hunts whoever is nearest (the player's warden a little preferred, a great foe much
  // more): the AI reads world.hero, so while it thinks world.hero is its quarry (world.main stays the player's)
  _foe(e, h, boss) {
    if (!this.allies.length || this._realHero) return this._foeThink(e, h, boss);
    const tg = this._foeTarget(e, boss); if (!tg || tg === this.hero) return this._foeThink(e, h, boss);
    this._realHero = this.hero; this.hero = tg;
    try { this._foeThink(e, h, boss); } finally { this.hero = this._realHero; this._realHero = null; }
  }
  _foeTarget(e, boss) {
    const main = this.hero; const ai = e.ai;
    if (ai.tg && !ai.tg.dead && this.t < (ai.tgT || 0) && (ai.tg === main || this.allies.includes(ai.tg))) return ai.tg;
    let best = main && !main.dead ? main : null, bs = best ? dist(e, best) : Infinity;
    for (const a of this.allies) { if (a.dead || a.untargetable) continue; const d = dist(e, a) * (boss ? 2.2 : 1.3); if (d < bs) { bs = d; best = a; } }
    ai.tg = best; ai.tgT = this.t + 1.2 + this.rand() * 0.8; return best;
  }
  _foeThink(e, h, boss) {
    if (e.stun > 0) e.stun -= h;
    if (!boss) e.flinch = Math.min(e.def.flinch ?? 2, (e.flinch ?? (e.def.flinch ?? 2)) + h / 1.1);
    e.mx = 0; e.mz = 0; e.moveSpeed = 0;
    switch (e.state) {
      case 'spawn': if (e.t >= 0.9) { e.state = 'idle'; e.t = 0; e.anim = 'idle'; } return;
      case 'hurt': if (e.stun <= 0) { e.state = 'idle'; e.anim = 'idle'; e.t = 0; e.ai.cd = Math.max(e.ai.cd, 0.35); } return;
      case 'stagger': if (e.t >= e.stagT) { e.state = 'idle'; e.anim = 'idle'; e.t = 0; e.ai.cd = 0.5; } return;
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
    if (e.t >= a.windup && e.state === 'windup') {
      e.state = 'attack'; if (!a.leap) e.tele = null; this.emit('foeStrike', { e, atk: a }); if (a.onStrike && !a.leap) a.onStrike(this, e);
      if (e.element && !a.ranged) { const at = a.leap ? 0 : Math.min(2.4, (a.range || a.radius || 1.6) * 0.7 + (a.offset || 0)); this._elHazard(e, e.x + Math.sin(e.face) * at, e.z + Math.cos(e.face) * at); }
    }
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
      const p = { id: this.nextId++, kind: r.kind, team: 'foe', x: sx, z: sz, y: r.y ?? 1.2, vx: Math.sin(a) * r.speed, vz: Math.cos(a) * r.speed, r: r.r, dmg: r.dmg * e.dmgMul, life: r.life, homing: r.homing || 0, src: e, face: a, hitSet: new Set(), status: r.status, onLand: r.onLand, el: e.element };
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
      p.life -= h; if (p.life <= 0) { p.dead = true; if (p.lob) this.emit('projHit', { p, landed: true }); if (p.el && p.src) this._elHazard(p.src, p.x, p.z); continue; }
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
      if (p.kind !== 'wave' && !p.ghost && this._blocked(p.x, p.z, 0.05)) { p.dead = true; this.emit('projHit', { p, wall: true }); if (p.el && p.src) this._elHazard(p.src, p.x, p.z); continue; }
      if (p.team === 'foe') {
        for (const t of this.heroTeam()) {
          if (Math.hypot(t.x - p.x, t.z - p.z) >= t.r + p.r) continue;
          const res = this._damage(p.src, t, p.dmg, { kb: 3, proj: true, status: p.status });
          if (res !== false || t.state !== 'dash') { p.dead = true; this.emit('projHit', { p }); if (p.el && p.src) this._elHazard(p.src, p.x, p.z); break; }
        }
      } else {
        const by = p.src && p.src.team === 'hero' && p.src.stats ? p.src : hero;
        for (const f of this.foes()) {
          if (p.hitSet.has(f.id) || f.state === 'spawn' || Math.hypot(f.x - p.x, f.z - p.z) > f.r + p.r) continue;
          p.hitSet.add(f.id); this._damage(by, f, p.dmg, { poise: p.poise ?? 20, kb: p.kb ?? (p.kind === 'wave' ? 4 : 1.5), proj: true, basic: p.basic, status: p.status, resonate: p.resonate, kind: p.kind, slot: p.slot });
          if (!p.pierce) { p.dead = true; this.emit('projHit', { p }); break; }
        }
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  // hazard (hurts the hero): { shape:'circle'|'ring'|'line', x, z, r, r0, r1, warn, life, dmg, face, len, width, kind, status }
  addHazard(hz) { const h = { t: 0, hitSet: new Set(), ...hz }; this.hazards.push(h); this.emit('hazard', { h }); return h; }
  // tick: a lingering pool that bites every `tick` seconds (light: no knockback, no stagger); pull: drags toward its middle
  _hazards(h) {
    const team = this.heroTeam();
    for (const z of this.hazards) {
      z.t += h; if (z.t >= z.warn + z.life) { z.dead = true; continue; }
      if (z.t < z.warn || !team.length) continue;
      if (!z.started) { z.started = true; this.emit('hazardGo', { h: z }); }
      for (const hero of team) {
        if (!z.tick && z.hitSet.has(hero.id)) continue;
        const d = Math.hypot(hero.x - z.x, hero.z - z.z); let hit = false;
        if (z.shape === 'circle') hit = d < z.r + hero.r;
        else if (z.shape === 'ring') { const k = (z.t - z.warn) / z.life; const rr = z.r0 + (z.r1 - z.r0) * k; hit = Math.abs(d - rr) < 0.45 + hero.r; }
        else if (z.shape === 'line') { const fx = Math.sin(z.face), fz = Math.cos(z.face); const dx = hero.x - z.x, dz = hero.z - z.z; const al = dx * fx + dz * fz; hit = al > 0 && al < z.len && Math.abs(dx * fz - dz * fx) < z.width / 2 + hero.r; }
        if (!hit) continue;
        const st = z.status || (z.kind === 'fire' ? { burn: 1 } : (z.kind === 'poison' ? { poison: 1 } : null));
        if (z.pull && d > 0.3 && hero.state !== 'dash') { hero.kbx += (z.x - hero.x) / d * z.pull * h * 8; hero.kbz += (z.z - hero.z) / d * z.pull * h * 8; }
        if (z.tick) { // a pool: a little hurt and its status, every tick, and never a stagger
          const lm = z.lastHit || (z.lastHit = new Map()); if (this.t - (lm.get(hero.id) ?? -9) < z.tick) continue; lm.set(hero.id, this.t);
          if (hero.state === 'dash' && hero.iframes > 0) continue;
          if (z.dmg) this._dotHero(hero, Math.max(1, Math.round(z.dmg)), z.kind);
          if (st) for (const k in st) this.applyStatus(hero, k, { dps: z.dps || 4, dur: k === 'mark' ? 3 : undefined, max: 1 });
          continue;
        }
        const res = this._damage(z.src || null, hero, z.dmg, { kb: z.kb || 5, heavy: true, status: st, dps: 5 });
        if (res !== false || z.once) z.hitSet.add(hero.id);
      }
    }
    this.hazards = this.hazards.filter((z) => !z.dead);
  }

  // zone (the hero's area attacks; hurts foes): { shape:'circle'|'ring', x, z, r | r0,r1, warn, life, dmg, tick?, trigger?, follow?, status, stun, root, kb, kind }
  // src: who made it (the player's warden unless an ally did); slot: 'attack' | 'skill' | 'ult' | 'dash' (boon riders);
  // boon: made by a boon (no riders of its own); onHit(world, zone, foe): a boon's touch; fxOwn: drawn by fx_elements.js
  addZone(zn) { const z = { t: 0, warn: 0, hitSet: new Set(), lastHit: new Map(), src: this._caster || null, slot: this._slotCtx || null, ...zn }; if (z.follow) { z.x = z.follow.x; z.z = z.follow.z; } this.zones.push(z); this.emit('zone', { z }); return z; }
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
      if (z.visual) continue;
      for (const f of this.foes()) {
        if (f.state === 'spawn' || f.hidden) continue;
        const d = Math.hypot(f.x - z.x, f.z - z.z); let hit = false;
        if (z.shape === 'circle') hit = d < z.r + f.r;
        else { const k = (z.t - z.warn) / z.life; const rr = z.r0 + (z.r1 - z.r0) * k; hit = Math.abs(d - rr) < 0.6 + f.r; }
        if (!hit) continue;
        if (z.tick) { const last = z.lastHit.get(f.id) ?? -9; if (this.t - last < z.tick) continue; z.lastHit.set(f.id, this.t); }
        else { if (z.hitSet.has(f.id)) continue; z.hitSet.add(f.id); }
        // a Hymn of Shattering breaks the resonance it finds for more
        const res = z.shatter && f.status.resonate ? f.status.resonate.stacks : 0;
        if (res) this.emit('shatter', { e: f, n: res });
        const by = z.src && !z.src.dead ? z.src : (hero || { x: z.x, z: z.z });
        this._damage(by, f, z.dmg + (z.shatter || 0) * res, { aoe: true, kb: z.kb || 2, status: z.status, stun: z.stun, root: z.root, special: z.special, dotLike: !!z.tick, poise: z.poise ?? 15, kind: z.kind, resonate: res ? 0 : z.resonate, boon: z.boon, slot: z.slot });
        if (z.onHit && !f.dead) z.onHit(this, z, f);
        if (res && !f.dead) delete f.status.resonate;
      }
    }
    this.zones = this.zones.filter((z) => !z.dead);
  }

  // ------------------------------------------------------------------ movement and collision
  _move(h) {
    for (const e of this.ents) {
      if (e.dead) { e.kbx *= Math.pow(0.02, h); e.kbz *= Math.pow(0.02, h); this._push(e, e.kbx * h, e.kbz * h); continue; }
      let sp = e.moveSpeed;
      if (e.team === 'foe') { if (e.status.frost) sp *= 0.55; if (e.status.root || e.status.stun || e.status.freeze) sp = 0; }
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
installBoons(World);
export { heroStats, NONE };
