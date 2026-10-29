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
//   b.manual = true  the team's abilities wait at full charge until trigger(b, id) fires one
//   A mission may add (see battleSpec in game/progress.js): kind ('rout' | 'waves' | 'protect' | 'ambush' |
//   'hunt'), waves (more foe lists, each arriving when the field is clear or after WAVE_GAP s), ward
//   ([name, prop sprite]: the thing to protect; it falling loses), mark (the foe to kill; its death wins),
//   limit (seconds), elites ([[foe index, affix]]), hazard ('rockfall' | 'fire' | 'lightning'), and the
//   run's boons ({ id: level }, data/boons.js).
import { UNITS, ENEMIES, SUMMONS, SLOTS, WAVES } from '../data/units.js';

export const TIME_LIMIT = 120;
// after FURY seconds every blow lands harder (+5% a second), so a battle neither side can finish ends
export const FURY = 45;
export const fury = (b) => (b.t > FURY ? 1 + 0.05 * (b.t - FURY) : 1);
const FIELD = { w: 17, h: 7.4 };
export const FIELD_SIZE = FIELD;
const ENERGY_PER_ATTACK = 14, ENERGY_FROM_DAMAGE = 70, CAST_TIME = 0.7, CAST_POINT = 0.45, WAVE_GAP = 20;
// what an elite foe adds: more health and attack, and one trait
export const AFFIXES = {
  shielded: { name: 'Shielded', col: '#9fd8ff' }, enraged: { name: 'Enraged', col: '#ff7a5a' }, splitting: { name: 'Splitting', col: '#b6f07a' },
  vampiric: { name: 'Vampiric', col: '#e05a8a' }, swift: { name: 'Swift', col: '#ffe07a' },
};
// the thing a 'protect' mission guards: it does not fight or move, and the foes go for it
const WARD = { name: 'Supply Cart', cls: 'vanguard', ward: true, stats: { hp: 2400, atk: 0, def: 60, spd: 1, move: 0, range: 0, crit: 0 }, attack: { windup: 1, active: 0.1, recover: 0.5 } };

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
  const s = def.stats, k = 1 + 0.12 * (level - 1), p = def.passive || {};   // each level counts: +12% (foes grow the same way)
  const m = (key) => (p[key] || 0) + (mods[key] || 0);
  return {
    max: Math.round(s.hp * k * (1 + m('hp'))), atk: s.atk * k * (1 + m('atk')), def: s.def * k * (1 + m('def')),
    spd: s.spd * (1 + m('spd')), move: s.move, range: s.range, crit: Math.min(0.75, s.crit + m('crit')),
    dr: Math.min(0.6, m('dr')), heal: 1 + m('healPower'), summon: 1 + m('summonPower'),
    power: 1 + m('power'), energy: 1 + m('energy'), lifesteal: m('lifesteal'), start: m('start'),
  };
}

export function createBattle({ team, wave, seed = 1, foes, level, might = 1, kind = 'rout', waves, ward, mark, limit, elites, hazard, boons }) {
  const W = wave ? WAVES[wave] : { foes, level: level || 1 };
  const foeMods = might !== 1 ? { hp: might - 1, atk: (might - 1) * 0.6 } : undefined;
  const b = { t: 0, rnd: rng(seed), units: [], shots: [], events: [], result: null, wave, field: FIELD, nextId: 1,
    kind, limit: limit || TIME_LIMIT, boons: boons || {}, level: W.level, foeMods, queue: (waves || []).slice(), waveN: 1, waveAt: WAVE_GAP,
    hazard: hazard || null, hz: hazard ? { next: 5 + seed % 3, list: [] } : null, hymnT: 0 };
  b.waveOf = 1 + b.queue.length;
  // an ambush: the company in the middle, the foes on both sides
  const ambush = kind === 'ambush';
  // a hero's special may be their own path's version of it (data/paths.js)
  for (const m of team) { const u = addUnit(b, m.ability ? Object.assign({}, UNITS[m.key], { ability: m.ability }) : UNITS[m.key], m.key, 'ally', SLOTS[m.slot], m.level || 1, null, m.mods); if (ambush) u.x += 3.2; }
  (foes || W.foes).forEach(([key, slot], i) => {
    const u = addUnit(b, ENEMIES[key], key, 'foe', SLOTS[slot], W.level, null, foeMods);
    if (ambush && i % 2) { u.x = -SLOTS[slot][0] - 1.6; u.f = 0; }
    u.hunter = i % 2 === 1 || !!u.def.dive;   // in a 'protect' mission, these go for the ward
  });
  if (kind === 'protect') {
    const [name, prop] = ward || [WARD.name, 'w:cd_supply_cart'];
    b.ward = addUnit(b, Object.assign({}, WARD, { name, prop }), 'ward', 'ally', [3.8, 0], W.level, { ward: true, energy: 0 });
  }
  if (kind === 'hunt') { const foesL = b.units.filter((u) => u.team === 'foe'); b.mark = foesL[Math.min(mark || 0, foesL.length - 1)]; b.mark.mark = true; }
  const foesL = b.units.filter((u) => u.team === 'foe');
  for (const [i, affix] of elites || []) if (foesL[i] && !foesL[i].def.boss) makeElite(b, foesL[i], affix);
  return b;
}
function makeElite(b, u, affix) {
  u.elite = affix; u.max = u.hp = Math.round(u.max * 1.6); u.s.atk *= 1.2; u.size = 1.15;
  if (affix === 'swift') { u.s.spd *= 1.4; u.s.move *= 1.3; }
  if (affix === 'vampiric') u.s.lifesteal += 0.25;
  if (affix === 'shielded') { u.shield = Math.round(u.max * 0.35); u.shieldT = 1e9; u.regen = 8; }
}
// the next wave walks in from the right
function spawnWave(b) {
  const list = b.queue.shift(); b.waveN++; b.waveAt = b.t + WAVE_GAP;
  list.forEach(([key, slot]) => { const u = addUnit(b, ENEMIES[key], key, 'foe', SLOTS[slot], b.level, null, b.foeMods); u.x = FIELD.w / 2 - 0.5; u.y = SLOTS[slot][1]; u.hunter = true; });
  b.events.push({ type: 'wave', n: b.waveN, of: b.waveOf });
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
// the player fires a hero's ability (manual mode); it goes off on the hero's next move
export function trigger(b, id) {
  const u = b.units.find((x) => x.id === id);
  if (!u || !alive(u) || b.result || u.energy < 100 || !u.def.ability) return false;
  u.fire = true; return true;
}
const teamOf = (b, t) => b.units.filter((u) => u.team === t && alive(u));
// the run's boons: the level of one (0: not taken); heroes are the company's own fighters, not the ward
const bo = (b, id) => b.boons[id] || 0;
const hero = (u) => u.team === 'ally' && !u.ward;
// a boon going off, for the renderer; the quiet ones at most once every `gap` seconds
function proc(b, boon, u, fx, gap = 0) {
  b.procAt = b.procAt || {};
  if (gap && b.t - (b.procAt[boon] ?? -99) < gap) return;
  b.procAt[boon] = b.t; b.events.push({ type: 'proc', boon, u: u && u.id, fx });
}
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
  if (b.hz) hazards(b, dt);
  boonTicks(b, dt);
  for (const u of b.units) if (u.regen && alive(u)) { u.regenT = (u.regenT || 0) + dt; if (u.regenT >= u.regen) { u.regenT = 0; u.shield = Math.max(u.shield, Math.round(u.max * 0.25)); u.shieldT = 1e9; b.events.push({ type: 'shield', u: u.id }); } }
  const a = teamOf(b, 'ally').filter((u) => !u.ward).length, f = teamOf(b, 'foe').length;
  if (b.queue.length && (!f || b.t >= b.waveAt)) spawnWave(b);
  else if (b.mark && !alive(b.mark)) end(b, 'win');
  else if (!f) end(b, 'win');
  else if (!a || (b.ward && !alive(b.ward))) end(b, 'lose');
  else if (b.t >= b.limit) end(b, 'lose');
}
// the boons that run on the clock: the hymn's healing, the last hero standing
function boonTicks(b, dt) {
  if (bo(b, 'hymn')) {
    b.hymnT += dt;
    if (b.hymnT >= 8) { b.hymnT = 0; for (const u of teamOf(b, 'ally')) if (!u.ward) { const got = Math.min(u.max - u.hp, Math.round(u.max * 0.04 * bo(b, 'hymn'))); if (got > 0) { u.hp += got; b.events.push({ type: 'heal', u: u.id, amount: got }); } } proc(b, 'hymn', null, 'heal_loop'); }
  }
  if (bo(b, 'laststand') && !b.lastStand) {
    const left = teamOf(b, 'ally').filter((u) => hero(u) && !u.summoned);
    if (left.length === 1 && b.units.some((u) => hero(u) && !u.summoned && !alive(u))) { b.lastStand = left[0]; left[0].lastStand = true; b.events.push({ type: 'proc', boon: 'laststand', u: left[0].id, text: 'Last Stand!', fx: 'fire_shield', col: '#ff9a5a', big: true }); }
  }
}
// rockfall, fire or lightning: a warning ring on the ground, then the strike; everyone in it is hurt
function hazards(b, dt) {
  const H = b.hz; H.next -= dt;
  if (H.next <= 0) {
    H.next = 6 + b.rnd() * 3;
    const live = b.units.filter((u) => alive(u) && !u.ward), v = live[Math.floor(b.rnd() * live.length) % Math.max(1, live.length)];
    if (v) { const w = { x: v.x + (b.rnd() - 0.5) * 1.2, y: v.y + (b.rnd() - 0.5) * 0.8, r: 1.5, t: 1.6 }; H.list.push(w); b.events.push({ type: 'warn', x: w.x, y: w.y, r: w.r, t: w.t, kind: b.hazard }); }
  }
  for (const w of H.list) {
    w.t -= dt; if (w.t > 0) continue;
    w.done = true; b.events.push({ type: 'strike', x: w.x, y: w.y, r: w.r, kind: b.hazard });
    for (const u of b.units) if (alive(u) && Math.hypot(u.x - w.x, u.y - w.y) <= w.r + u.r) damage(b, null, u, 0, { raw: Math.round(u.max * (u.def.boss ? 0.04 : u.ward ? 0.06 : 0.12)), hazard: true });
  }
  H.list = H.list.filter((w) => !w.done);
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
  if (u.def.ward) { u.state = 'idle'; return; }
  if (u.act) return u.act.kind === 'cast' ? tickCast(b, u, dt) : tickAttack(b, u, dt);
  u.atkCd -= dt;
  // the company (and the quick foes) step out of a warning on the ground
  const w = b.hz && (u.team === 'ally' || u.def.dive) && !u.def.boss && b.hz.list.find((w) => Math.hypot(u.x - w.x, u.y - w.y) < w.r + u.r);
  if (w) { const a = Math.atan2(u.y - w.y, u.x - w.x) || 0, sp = u.s.move * mult(u, 'move') * dt; u.x += Math.cos(a) * sp; u.y += Math.sin(a) * sp; u.f = a; u.state = 'move'; return; }
  const t = pickTarget(b, u);
  if (!t) { u.state = 'idle'; return; }
  u.target = t.id;
  // a full charge: the ability (held for the player in manual mode, for the team's own heroes)
  if (u.energy >= 100 && u.def.ability && (!b.manual || u.team !== 'ally' || u.summoned || u.fire)) { u.fire = false; startCast(b, u, t); return; }
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
  if (u.team === 'foe' && u.hunter && b.ward && alive(b.ward)) return b.ward;
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
  const crit = o.raw == null && !o.dot && src && b.rnd() < src.s.crit;
  let d;
  if (o.raw != null) d = o.raw;   // a hazard, thorns, a pyre: a set amount
  else {
    d = atk * m * (100 / (100 + t.s.def * mult(t, 'def'))) * (0.92 + b.rnd() * 0.16) * (crit ? 1.6 : 1);
    d *= 1 - t.s.dr; for (const s of t.statuses) if (s.type === 'dr') d *= 1 - s.pct;
    d *= fury(b);
    if (src && hero(src)) {
      if (bo(b, 'executioner') && t.hp < t.max * 0.3) { d *= 1 + 0.4 * bo(b, 'executioner'); proc(b, 'executioner', t, 'cross_slash', 2); }
      if (bo(b, 'giant') && (t.def.boss || t.elite)) { d *= 1 + 0.3 * bo(b, 'giant'); proc(b, 'giant', t, 'hit_big', 3); }
      if (src.lastStand) d *= 1.6 + 0.4 * bo(b, 'laststand');
    }
  }
  if (t.lastStand) d *= 0.5;
  d = Math.max(1, Math.round(d));
  let left = d;
  if (t.shield > 0) { const ab = Math.min(t.shield, left); t.shield -= ab; left -= ab; }
  t.hp = Math.max(0, t.hp - left);
  if (src) src.dealt += d;
  t.taken += d;
  t.energy = Math.min(100, t.energy + (d / t.max) * ENERGY_FROM_DAMAGE * t.s.energy);
  if (src && src.s.lifesteal && !o.dot && o.raw == null && alive(src)) { const got = Math.min(src.max - src.hp, Math.round(d * src.s.lifesteal)); src.hp += got; src.healed += got; }
  b.events.push({ type: 'hit', u: t.id, src: src && src.id, dmg: d, crit, shielded: left < d, fx: o.fx, dot: o.dot || o.raw != null && !o.hazard });
  if (t.elite === 'enraged' && !t.raged && t.hp > 0 && t.hp < t.max / 2) {
    t.raged = true; addStatus(t, { type: 'buff', stat: 'atk', pct: 0.5, t: 999 }); addStatus(t, { type: 'buff', stat: 'spd', pct: 0.4, t: 999 });
    b.events.push({ type: 'proc', u: t.id, text: 'Enraged!', fx: 'fire_ring', col: '#ff7a5a' });
  }
  if (t.hp <= 0) fall(b, src, t);
  else if (!o.dot) t.hitT = 0.22; // a short flinch for the renderer; it does not interrupt the unit
  if (src && o.raw == null && !o.dot) onHit(b, src, t, d, crit, o);
  return d;
}
// a hero's boons on a hit (and the thorns of a hero who is hit)
function onHit(b, src, t, d, crit, o) {
  if (hero(src) && alive(t)) {
    if (bo(b, 'kindling') && b.rnd() < 0.15 * bo(b, 'kindling')) { addStatus(t, { type: 'dot', t: 3, per: 0.3, src }); proc(b, 'kindling', t, 'ignite'); }
    if (bo(b, 'frostbite') && b.rnd() < 0.12 * bo(b, 'frostbite')) { addStatus(t, { type: 'debuff', stat: 'spd', pct: 0.35, t: 2.5 }); addStatus(t, { type: 'debuff', stat: 'move', pct: 0.35, t: 2.5 }); proc(b, 'frostbite', t, 'ice_shatter'); }
  }
  if (hero(src) && crit && bo(b, 'chain') && !o.chain) {
    const near = foesOf(b, src).filter((v) => v !== t && dist(t, v) < 3.5).sort((p, q) => dist(t, p) - dist(t, q)).slice(0, bo(b, 'chain'));
    for (const v of near) { b.events.push({ type: 'arc', u: v.id, x0: t.x, y0: t.y }); damage(b, src, v, 0.5, { chain: true, fx: 'shock' }); }
  }
  if (hero(t) && src.team === 'foe' && bo(b, 'thorns') && !src.def.attack.projectile && !o.ability && alive(src)) { damage(b, t, src, 0, { raw: Math.round(d * 0.25 * bo(b, 'thorns')) }); proc(b, 'thorns', src, 'hit_pierce', 1); }
}
// a unit falls: the boons and traits that answer a death
function fall(b, src, t) {
  // Second Wind: the first hero to fall gets back up
  if (hero(t) && !t.summoned && bo(b, 'secondwind') && !b.revived) {
    b.revived = true; t.hp = Math.round(t.max * (0.3 + 0.15 * bo(b, 'secondwind'))); t.statuses = []; t.act = null; t.state = 'idle';
    b.events.push({ type: 'proc', boon: 'secondwind', u: t.id, text: 'Second Wind!', fx: 'phoenix', col: '#ffcf6a', big: true }); return;
  }
  t.state = 'ko'; t.st = 0; t.act = null; t.statuses = []; t.shield = 0; b.events.push({ type: 'ko', u: t.id });
  if (hero(t) && !t.summoned && bo(b, 'martyr')) {
    for (const a of teamOf(b, 'ally')) { const got = Math.min(a.max - a.hp, Math.round(a.max * 0.15 * bo(b, 'martyr'))); a.hp += got; a.shield = Math.max(a.shield, Math.round(a.max * 0.15)); a.shieldT = 5; b.events.push({ type: 'heal', u: a.id, amount: got }); }
    b.events.push({ type: 'proc', boon: 'martyr', u: t.id, text: "Martyr's Oath", fx: 'holy_light', col: '#fff2b0' });
  }
  if (t.team === 'foe') {
    if (src && hero(src) && alive(src) && bo(b, 'bloodlust')) { const p = 0.25 + 0.1 * bo(b, 'bloodlust'); addStatus(src, { type: 'buff', stat: 'atk', pct: p, t: 5 }); addStatus(src, { type: 'buff', stat: 'spd', pct: p, t: 5 }); proc(b, 'bloodlust', src, 'buff_up'); }
    if (bo(b, 'pyre')) {
      proc(b, 'pyre', t, 'explosion_fire');
      for (const v of teamOf(b, 'foe')) if (dist(t, v) < 1.8 + v.r) damage(b, null, v, 0, { raw: Math.round(t.max * 0.2 * bo(b, 'pyre')) });
    }
    if (t.elite === 'splitting') {
      b.events.push({ type: 'proc', u: t.id, text: 'Splits!', fx: 'poison_cloud', col: '#b6f07a' });
      for (const s of [-1, 1]) { const c = addUnit(b, t.def, t.key, 'foe', [0, 0], t.level, { split: true, size: 0.75 }); c.x = t.x + s * 0.5; c.y = t.y + s * 0.4; c.max = c.hp = Math.round(t.max * 0.3); c.s.atk = t.s.atk * 0.6; c.hunter = t.hunter; }
    }
  }
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
function resolve(b, u, t, echo = false) {
  const foes = foesOf(b, u), allies = teamOf(b, u.team);
  if (!t || !alive(t)) t = foes.slice().sort((p, q) => dist(u, p) - dist(u, q))[0];
  const ab = u.def.ability, pw = u.s.power * (ab.boost || 1) * (u.twiceK || 1);   // a path's boost; the second of a twinned special is weaker
  b.events.push({ type: 'ability', u: u.id, name: ab.name, fx: ab.fx, x: t ? t.x : u.x, y: t ? t.y : u.y, epic: !!ab.epic && !u.twiceK });
  for (const e of ab.effects) {
    if (e.type === 'blink') {
      const v = foes.slice().sort((p, q) => p.hp / p.max - q.hp / q.max)[0];
      if (v) { const back = v.f + Math.PI; b.events.push({ type: 'blink', u: u.id, x0: u.x, y0: u.y }); u.x = v.x + Math.cos(back) * 0.9; u.y = v.y + Math.sin(back) * 0.9; u.f = angTo(u, v); t = v; u.target = v.id; }
    } else if (e.type === 'damage') {
      const hitList = targetsFor(b, u, t, e, foes);
      for (const v of hitList) {
        for (let i = 0; i < (e.hits || 1); i++) damage(b, u, v, e.mult * pw, { fx: ab.fx, ability: true });
        if (!alive(v)) continue;
        if (e.stun && !v.def.boss) addStatus(v, { type: 'stun', t: e.stun });
        else if (e.stun) addStatus(v, { type: 'stun', t: e.stun * 0.4 });
        if (e.knock) { const a = angTo(u, v); v.knock = { x: Math.cos(a) * e.knock * 4, y: Math.sin(a) * e.knock * 4, t: 0.18 }; }
        if (e.dot) addStatus(v, { type: 'dot', t: e.dot.dur, per: e.dot.mult, src: u });
      }
    } else if (e.type === 'heal') {
      const list = e.area === 'allAllies' ? allies : e.area === 'self' ? [u] : [allies.slice().sort((p, q) => p.hp / p.max - q.hp / q.max)[0]];
      for (const a of list) heal(b, u, a, e.mult * pw);
    } else if (e.type === 'shield') {
      for (const a of e.area === 'allAllies' ? allies : [u]) { a.shield = Math.max(a.shield, Math.round(a.max * e.pct * pw)); a.shieldT = e.dur; b.events.push({ type: 'shield', u: a.id }); }
    } else if (e.type === 'buff') {
      for (const a of e.area === 'allAllies' ? allies : [u]) addStatus(a, { type: 'buff', stat: e.stat, pct: e.pct * (1 + (pw - 1) * 0.5), t: e.dur });
    } else if (e.type === 'debuff') {
      for (const v of e.area === 'allEnemies' ? foes : t ? [t] : []) if (alive(v)) addStatus(v, { type: 'debuff', stat: e.stat, pct: e.pct, t: e.dur });
    } else if (e.type === 'taunt') addStatus(u, { type: 'taunt', t: e.dur });
    else if (e.type === 'dr') addStatus(u, { type: 'dr', pct: e.pct, t: e.dur });
    else if (e.type === 'energy') u.energy = Math.min(100, u.energy + e.amount);
    else if (e.type === 'summon') {
      const def = SUMMONS[e.key];
      for (let i = 0; i < e.n; i++) {
        if (teamOf(b, u.team).filter((o) => o.summoned).length >= 4) break;
        const a = u.f + (i ? 0.9 : -0.9) * (e.n > 1 ? 1 : 0);
        const m = addUnit(b, def, e.key, u.team, [0, 0], u.level, { summoned: true });
        m.x = u.x + Math.cos(a) * 1.2; m.y = u.y + Math.sin(a) * 1.2; m.f = u.f;
        m.max = m.hp = Math.round(m.max * u.s.summon * pw); m.s.atk *= u.s.summon * pw;
        b.events.push({ type: 'summon', u: m.id });
      }
    }
  }
  // a twinned special goes off again, weaker
  if (ab.twice && !u.twiceK) { u.twiceK = ab.twice; b.events.push({ type: 'proc', u: u.id, text: 'Again!', fx: ab.fx, col: '#bfe4ff' }); resolve(b, u, t, true); u.twiceK = 0; }
  if (!hero(u) || echo) return;
  if (bo(b, 'overflow')) { u.energy = Math.min(100, u.energy + 20 * bo(b, 'overflow')); proc(b, 'overflow', u, 'charge_up'); }
  if (bo(b, 'echo') && b.rnd() < 0.25 * bo(b, 'echo') && alive(u)) { b.events.push({ type: 'proc', boon: 'echo', u: u.id, text: 'Echo!', fx: 'arc_gold', col: '#ffe07a' }); resolve(b, u, t, true); }
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
    const p = (m - d) / 2, nx = (c.x - a.x) / d, ny = (c.y - a.y) / d, ka = a.ward ? 0 : c.ward ? 2 : 1, kc = c.ward ? 0 : a.ward ? 2 : 1;
    a.x -= nx * p * ka; a.y -= ny * p * ka; c.x += nx * p * kc; c.y += ny * p * kc;
  }
}
function clamp(u) { const hw = FIELD.w / 2 - u.r, hh = FIELD.h / 2 - u.r; u.x = Math.max(-hw, Math.min(hw, u.x)); u.y = Math.max(-hh, Math.min(hh, u.y)); }
