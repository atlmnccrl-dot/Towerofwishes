// The battle: two teams of up to five (plus summons) on a field, fully automatic.
// Pure logic, no DOM; runs in the browser and in Node (test/).
//
//   const b = createBattle({ team: [{ key, slot, level, mods }], wave: 'ambush', seed })
//   const b = createBattle({ team, foes: [[key, slot]], level, might, seed })   (a mission's own foes; might
//                    scales their health, and their attack by 60% as much)
//   mods: what gear, training and upgrades add (see statsAt)
//   step(b, dt)      advance (call at a fixed 1/60 s)
//   b.events         what happened this step, for the renderer
//   b.result         null, then 'win' | 'lose' (the time limit counts as a loss)
import { UNITS, ENEMIES, SUMMONS, SLOTS, WAVES } from '../data/units.js';

export const TIME_LIMIT = 120;
// after FURY seconds every blow lands harder (+5% a second), so a battle neither side can finish ends
export const FURY = 45;
export const fury = (b) => (b.t > FURY ? 1 + 0.05 * (b.t - FURY) : 1);
const FIELD = { w: 17, h: 7.4 };
export const FIELD_SIZE = FIELD;
const ENERGY_PER_ATTACK = 14, ENERGY_FROM_DAMAGE = 70, CAST_TIME = 0.7, CAST_POINT = 0.45;

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

// stats at a level: +8% per level over level 1, then the passive and the mods (gear, training,
// upgrades) on top. Percentages add up: hp, atk, def, spd, healPower, summonPower, power (the
// ability's strength), energy (energy gained); flat: crit, dr, lifesteal, start (energy at the start).
export const MOD_KEYS = ['hp', 'atk', 'def', 'spd', 'crit', 'dr', 'lifesteal', 'healPower', 'summonPower', 'power', 'energy', 'start'];
export function statsAt(def, level = 1, mods = {}) {
  const s = def.stats, k = 1 + 0.08 * (level - 1), p = def.passive || {};
  const m = (key) => (p[key] || 0) + (mods[key] || 0);
  return {
    max: Math.round(s.hp * k * (1 + m('hp'))), atk: s.atk * k * (1 + m('atk')), def: s.def * k * (1 + m('def')),
    spd: s.spd * (1 + m('spd')), move: s.move, range: s.range, crit: Math.min(0.75, s.crit + m('crit')),
    dr: Math.min(0.6, m('dr')), heal: 1 + m('healPower'), summon: 1 + m('summonPower'),
    power: 1 + m('power'), energy: 1 + m('energy'), lifesteal: m('lifesteal'), start: m('start'),
  };
}

export function createBattle({ team, wave, seed = 1, foes, level, might = 1 }) {
  const W = wave ? WAVES[wave] : { foes, level: level || 1 };
  const foeMods = might !== 1 ? { hp: might - 1, atk: (might - 1) * 0.6 } : undefined;
  const b = { t: 0, rnd: rng(seed), units: [], shots: [], events: [], result: null, wave, field: FIELD, nextId: 1 };
  for (const m of team) addUnit(b, UNITS[m.key], m.key, 'ally', SLOTS[m.slot], m.level || 1, null, m.mods);
  for (const [key, slot] of foes || W.foes) addUnit(b, ENEMIES[key], key, 'foe', SLOTS[slot], W.level, null, foeMods);
  return b;
}

function addUnit(b, def, key, team, at, level, extra, mods) {
  const s = statsAt(def, level, mods), side = team === 'ally' ? -1 : 1;
  const u = Object.assign({
    id: key + '#' + b.nextId++, key, def, team, level, x: at[0] * side, y: at[1], f: team === 'ally' ? 0 : Math.PI, r: def.cls === 'vanguard' ? 0.42 : 0.36,
    hp: s.max, max: s.max, s, state: 'idle', st: 0, atkCd: 0.2 + b.rnd() * 0.5, energy: Math.min(100, Math.round(b.rnd() * 20 + s.start)),
    shield: 0, shieldT: 0, statuses: [], target: null, act: null, summoned: false, dealt: 0, healed: 0, taken: 0,
  }, extra);
  b.units.push(u);
  return u;
}

export const alive = (u) => u.state !== 'ko';
const teamOf = (b, t) => b.units.filter((u) => u.team === t && alive(u));
const foesOf = (b, u) => teamOf(b, u.team === 'ally' ? 'foe' : 'ally');
const has = (u, type) => u.statuses.some((s) => s.type === type);
function mult(u, stat) { let m = 1; for (const s of u.statuses) if (s.stat === stat) m *= s.type === 'buff' ? 1 + s.pct : 1 - s.pct; return m; }

// ---- one step
export function step(b, dt) {
  b.events = [];
  if (b.result) { for (const u of b.units) if (alive(u)) u.st += dt; return; }
  if (b.t <= FURY && b.t + dt > FURY) b.events.push({ type: 'fury' });
  b.t += dt;
  for (const u of b.units) {
    if (!alive(u)) continue;
    u.st += dt; if (u.hitT > 0) u.hitT -= dt;
    tickStatuses(b, u, dt);
    if (!alive(u)) continue;
    if (u.knock) { u.x += u.knock.x * dt; u.y += u.knock.y * dt; u.knock.t -= dt; if (u.knock.t <= 0) u.knock = null; }
    if (has(u, 'stun')) { if (u.state !== 'stun') { u.state = 'stun'; u.st = 0; u.act = null; } continue; }
    if (u.state === 'stun') idle(u);
    act(b, u, dt);
  }
  stepShots(b, dt);
  separate(b);
  for (const u of b.units) clamp(u);
  const a = teamOf(b, 'ally').length, f = teamOf(b, 'foe').length;
  if (!f) end(b, 'win'); else if (!a) end(b, 'lose'); else if (b.t >= TIME_LIMIT) end(b, 'lose');
}
function end(b, r) {
  b.result = r; b.events.push({ type: 'end', result: r });
  for (const u of b.units) if (alive(u)) { u.act = null; u.state = u.team === (r === 'win' ? 'ally' : 'foe') ? 'victory' : 'idle'; u.st = 0; }
}
function idle(u) { u.state = 'idle'; u.st = 0; u.act = null; }

function tickStatuses(b, u, dt) {
  for (const s of u.statuses) {
    s.t -= dt;
    if (s.type === 'dot') { s.acc = (s.acc || 0) + dt; if (s.acc >= 1) { s.acc -= 1; damage(b, s.src, u, s.per, { dot: true }); } }
  }
  u.statuses = u.statuses.filter((s) => s.t > 0);
  if (u.shieldT > 0) { u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0; }
}

// ---- what a unit does
function act(b, u, dt) {
  if (u.act) return u.act.kind === 'cast' ? tickCast(b, u, dt) : tickAttack(b, u, dt);
  u.atkCd -= dt;
  const t = pickTarget(b, u);
  if (!t) { u.state = 'idle'; return; }
  u.target = t.id;
  // a full charge: the ability
  if (u.energy >= 100 && u.def.ability) { startCast(b, u, t); return; }
  // a healer heals the most hurt ally in reach
  if (u.def.healer) {
    const hurt = teamOf(b, u.team).filter((a) => a.hp < a.max * 0.75).sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
    if (hurt && dist(u, hurt) <= u.s.range + 0.5) { if (u.atkCd <= 0) return startAttack(b, u, hurt, true); u.f = angTo(u, hurt); u.state = 'idle'; return; }
  }
  const reach = u.s.range + t.r;
  if (dist(u, t) > reach) { move(u, t, dt, reach * 0.9); return; }
  u.f = angTo(u, t);
  if (u.atkCd <= 0) return startAttack(b, u, t, false);
  u.state = 'idle';
}

function pickTarget(b, u) {
  const foes = foesOf(b, u);
  if (!foes.length) return null;
  const taunter = foes.find((o) => has(o, 'taunt'));
  if (taunter) return taunter;
  const cur = u.target && b.units.find((o) => o.id === u.target && alive(o));
  if (u.def.dive) {
    // strikers hunt the weakest they can find, and stick to them
    if (cur) return cur;
    return foes.slice().sort((p, q) => p.hp / p.max - q.hp / q.max || dist(u, p) - dist(u, q))[0];
  }
  // others: the nearest, keeping the current one unless something is much closer
  const near = foes.slice().sort((p, q) => dist(u, p) - dist(u, q))[0];
  if (cur && dist(u, cur) < dist(u, near) + 1.5) return cur;
  return near;
}

function move(u, t, dt, stopAt) {
  const d = dist(u, t);
  if (d <= stopAt) return;
  const sp = u.s.move * mult(u, 'move'), s = Math.min(d - stopAt, sp * dt), a = angTo(u, t);
  u.x += Math.cos(a) * s; u.y += Math.sin(a) * s; u.f = a; u.state = 'move';
}

// ---- basic attacks
function startAttack(b, u, t, heal) {
  const A = u.def.attack, k = 1 / (u.s.spd * mult(u, 'spd'));
  u.act = { kind: 'attack', t: t.id, heal, done: false, wind: A.windup * k, active: A.active * k, recover: A.recover * k, n: (u.act && u.act.n || 0) + 1 };
  u.state = 'attack'; u.st = 0; u.f = angTo(u, t); u.combo = (u.combo || 0) + 1;
}
function tickAttack(b, u, dt) {
  const a = u.act, A = u.def.attack, t = b.units.find((o) => o.id === a.t);
  if (t && alive(t) && u.st < a.wind) u.f = angTo(u, t);
  if (!a.done && u.st >= a.wind) {
    a.done = true;
    if (t && alive(t)) {
      if (A.projectile) {
        b.shots.push({ x: u.x + Math.cos(u.f) * 0.5, y: u.y + Math.sin(u.f) * 0.5, z: 1.0, t: t.id, src: u.id, v: A.projectile, bolt: A.bolt, hit: A.hit, heal: a.heal });
        b.events.push({ type: 'shoot', u: u.id });
      } else if (dist(u, t) <= u.s.range + t.r + 0.4) {
        b.events.push({ type: 'swing', u: u.id, fx: A.fx });
        if (a.heal) heal(b, u, t, 0.9); else damage(b, u, t, 1, { fx: A.fx });
        u.energy = Math.min(100, u.energy + ENERGY_PER_ATTACK * u.s.energy);
      }
    }
  }
  if (u.st >= a.wind + a.active + a.recover) { u.act = null; u.state = 'idle'; u.st = 0; u.atkCd = 0.1 + b.rnd() * 0.15; }
}

function stepShots(b, dt) {
  for (const s of b.shots) {
    const t = b.units.find((o) => o.id === s.t), src = b.units.find((o) => o.id === s.src);
    if (!t || !alive(t)) { s.gone = true; continue; }
    const d = Math.hypot(t.x - s.x, t.y - s.y), step = s.v * dt;
    s.a = Math.atan2(t.y - s.y, t.x - s.x);
    if (d <= step + 0.2) {
      s.gone = true;
      b.events.push({ type: 'impact', x: t.x, y: t.y, fx: s.hit, heal: s.heal });
      if (src) { if (s.heal) heal(b, src, t, 0.9); else damage(b, src, t, 1, { fx: s.hit }); src.energy = Math.min(100, src.energy + ENERGY_PER_ATTACK * src.s.energy); }
    } else { s.x += Math.cos(s.a) * step; s.y += Math.sin(s.a) * step; }
  }
  b.shots = b.shots.filter((s) => !s.gone);
}

// ---- damage, healing, shields
export function damage(b, src, t, m, o = {}) {
  if (!alive(t)) return 0;
  const atk = src ? src.s.atk * mult(src, 'atk') : 40;
  const crit = !o.dot && src && b.rnd() < src.s.crit;
  let d = atk * m * (100 / (100 + t.s.def * mult(t, 'def'))) * (0.92 + b.rnd() * 0.16) * (crit ? 1.6 : 1);
  d *= 1 - t.s.dr; for (const s of t.statuses) if (s.type === 'dr') d *= 1 - s.pct;
  d *= fury(b);
  d = Math.max(1, Math.round(d));
  let left = d;
  if (t.shield > 0) { const ab = Math.min(t.shield, left); t.shield -= ab; left -= ab; }
  t.hp = Math.max(0, t.hp - left);
  if (src) src.dealt += d;
  t.taken += d;
  t.energy = Math.min(100, t.energy + (d / t.max) * ENERGY_FROM_DAMAGE * t.s.energy);
  if (src && src.s.lifesteal && !o.dot && alive(src)) { const got = Math.min(src.max - src.hp, Math.round(d * src.s.lifesteal)); src.hp += got; src.healed += got; }
  b.events.push({ type: 'hit', u: t.id, src: src && src.id, dmg: d, crit, shielded: left < d, fx: o.fx, dot: o.dot });
  if (t.hp <= 0) { t.state = 'ko'; t.st = 0; t.act = null; t.statuses = []; t.shield = 0; b.events.push({ type: 'ko', u: t.id }); }
  else if (!o.dot) t.hitT = 0.22; // a short flinch for the renderer; it does not interrupt the unit
  return d;
}
function heal(b, src, t, m) {
  if (!alive(t)) return 0;
  const h = Math.round(src.s.atk * mult(src, 'atk') * m * src.s.heal);
  const got = Math.min(h, t.max - t.hp); t.hp += got; src.healed += got;
  b.events.push({ type: 'heal', u: t.id, amount: h });
  return got;
}

// ---- abilities
function startCast(b, u, t) {
  u.energy = 0; u.act = { kind: 'cast', t: t.id, done: false }; u.state = 'cast'; u.st = 0; u.f = angTo(u, t);
  b.events.push({ type: 'cast', u: u.id, name: u.def.ability.name, fx: u.def.ability.fx });
}
function tickCast(b, u, dt) {
  const a = u.act;
  if (!a.done && u.st >= CAST_POINT) { a.done = true; resolve(b, u, b.units.find((o) => o.id === a.t)); }
  if (u.st >= CAST_TIME) { u.act = null; u.state = 'idle'; u.st = 0; u.atkCd = 0.2; }
}
function resolve(b, u, t) {
  const foes = foesOf(b, u), allies = teamOf(b, u.team);
  if (!t || !alive(t)) t = foes.slice().sort((p, q) => dist(u, p) - dist(u, q))[0];
  const ab = u.def.ability;
  b.events.push({ type: 'ability', u: u.id, name: ab.name, fx: ab.fx, x: t ? t.x : u.x, y: t ? t.y : u.y });
  for (const e of ab.effects) {
    if (e.type === 'blink') {
      const v = foes.slice().sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
      if (v) { const back = v.f + Math.PI; b.events.push({ type: 'blink', u: u.id, x0: u.x, y0: u.y }); u.x = v.x + Math.cos(back) * 0.9; u.y = v.y + Math.sin(back) * 0.9; u.f = angTo(u, v); t = v; u.target = v.id; }
    } else if (e.type === 'damage') {
      const hitList = targetsFor(b, u, t, e, foes);
      for (const v of hitList) {
        for (let i = 0; i < (e.hits || 1); i++) damage(b, u, v, e.mult * u.s.power, { fx: ab.fx });
        if (!alive(v)) continue;
        if (e.stun && !v.def.boss) addStatus(v, { type: 'stun', t: e.stun });
        else if (e.stun) addStatus(v, { type: 'stun', t: e.stun * 0.4 });
        if (e.knock) { const a = angTo(u, v); v.knock = { x: Math.cos(a) * e.knock * 4, y: Math.sin(a) * e.knock * 4, t: 0.18 }; }
        if (e.dot) addStatus(v, { type: 'dot', t: e.dot.dur, per: e.dot.mult, src: u });
      }
    } else if (e.type === 'heal') {
      const list = e.area === 'allAllies' ? allies : e.area === 'self' ? [u] : [allies.slice().sort((p, q) => p.hp / p.max - q.hp / q.max)[0]];
      for (const a of list) heal(b, u, a, e.mult * u.s.power);
    } else if (e.type === 'shield') {
      for (const a of e.area === 'allAllies' ? allies : [u]) { a.shield = Math.max(a.shield, Math.round(a.max * e.pct * u.s.power)); a.shieldT = e.dur; b.events.push({ type: 'shield', u: a.id }); }
    } else if (e.type === 'buff') {
      for (const a of e.area === 'allAllies' ? allies : [u]) addStatus(a, { type: 'buff', stat: e.stat, pct: e.pct * (1 + (u.s.power - 1) * 0.5), t: e.dur });
    } else if (e.type === 'debuff') {
      for (const v of e.area === 'allEnemies' ? foes : t ? [t] : []) if (alive(v)) addStatus(v, { type: 'debuff', stat: e.stat, pct: e.pct, t: e.dur });
    } else if (e.type === 'taunt') addStatus(u, { type: 'taunt', t: e.dur });
    else if (e.type === 'dr') addStatus(u, { type: 'dr', pct: e.pct, t: e.dur });
    else if (e.type === 'summon') {
      const def = SUMMONS[e.key];
      for (let i = 0; i < e.n; i++) {
        if (teamOf(b, u.team).filter((o) => o.summoned).length >= 4) break;
        const a = u.f + (i ? 0.9 : -0.9) * (e.n > 1 ? 1 : 0);
        const m = addUnit(b, def, e.key, u.team, [0, 0], u.level, { summoned: true });
        m.x = u.x + Math.cos(a) * 1.2; m.y = u.y + Math.sin(a) * 1.2; m.f = u.f;
        m.max = m.hp = Math.round(m.max * u.s.summon * u.s.power); m.s.atk *= u.s.summon * u.s.power;
        b.events.push({ type: 'summon', u: m.id });
      }
    }
  }
}
function targetsFor(b, u, t, e, foes) {
  if (!t) return [];
  if (e.area === 'target') return [t];
  if (e.area === 'allEnemies') return foes;
  if (e.area === 'nearest3') return foes.slice().sort((p, q) => dist(u, p) - dist(u, q)).slice(0, 3);
  if (e.area === 'circle') return foes.filter((v) => dist(t, v) <= e.radius + v.r);
  if (e.area === 'self') return foes.filter((v) => dist(u, v) <= e.radius + v.r);
  if (e.area === 'line') {
    const a = angTo(u, t), cx = Math.cos(a), cy = Math.sin(a);
    return foes.filter((v) => { const dx = v.x - u.x, dy = v.y - u.y, along = dx * cx + dy * cy, across = Math.abs(-dx * cy + dy * cx); return along > 0 && along <= e.length && across <= e.width + v.r; });
  }
  return [t];
}
function addStatus(u, s) {
  // the same effect refreshes rather than stacks
  const old = u.statuses.find((o) => o.type === s.type && o.stat === s.stat);
  if (old) { old.t = Math.max(old.t, s.t); if (s.pct) old.pct = Math.max(old.pct, s.pct); if (s.per) old.per = s.per; return; }
  u.statuses.push(s);
}

// ---- keeping everyone apart and on the field
function separate(b) {
  const us = b.units.filter(alive);
  for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
    const a = us[i], c = us[j], d = dist(a, c), m = (a.r + c.r) * 0.95;
    if (d >= m || d < 1e-6) continue;
    const p = (m - d) / 2, nx = (c.x - a.x) / d, ny = (c.y - a.y) / d;
    a.x -= nx * p; a.y -= ny * p; c.x += nx * p; c.y += ny * p;
  }
}
function clamp(u) { const hw = FIELD.w / 2 - u.r, hh = FIELD.h / 2 - u.r; u.x = Math.max(-hw, Math.min(hw, u.x)); u.y = Math.max(-hh, Math.min(hh, u.y)); }
