// The fight: pure logic, no DOM. Runs in the browser and in Node (test/).
//
//   const f = createFight('clearing', { seed, auto });
//   step(f, dt)                       advance the fight (call at a fixed 1/60 s)
//   command(f, { type: 'target', id }) | { type: 'special', id } | { type: 'regroup' } | { type: 'auto', on }
//   f.events                          what happened this step (hits, blocks, specials...), for the renderer
//   f.result                          null, then 'win' | 'lose' | 'timeout'
//
// The heroes fight by themselves; the player only gives commands (the author's pick, 2026-10-23).
import { HEROES, FOES, FIGHTS } from '../data/fighters.js';

const TIME_LIMIT = 150;
const METER_PER_HIT = 9, METER_PER_DAMAGE = 0.35;

export function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const roll = (f, [lo, hi]) => Math.round(lo + f.rnd() * (hi - lo));

export function createFight(key, opts = {}) {
  const F = FIGHTS[key];
  const f = {
    key, arena: F.arena, t: 0, rnd: rng(opts.seed == null ? 1 : opts.seed), auto: !!opts.auto,
    units: [], projectiles: [], events: [], result: null, target: null, regroupT: 0, specialT: 0, nextId: 1,
  };
  const add = (def, x, y, key) => {
    const u = {
      id: key, key, def, team: def.team, x, y, f: def.team === 'hero' ? 0 : Math.PI, r: def.r,
      hp: def.hp, max: def.hp, state: 'idle', st: 0, dur: 0, atk: null, cd: 0.4 + f.rnd() * 0.6, meter: 0,
      kx: 0, ky: 0, combo: 0, spec: null, fled: false, post: { x, y },
    };
    f.units.push(u);
    return u;
  };
  for (const h of F.heroes) add(HEROES[h.key], h.x, h.y, h.key);
  for (const e of F.foes) add(FOES[e.key], e.x, e.y, e.key);
  return f;
}

export const alive = (u) => u.state !== 'ko' && !u.fled;
const fighters = (f, team) => f.units.filter((u) => u.team === team && alive(u) && !u.def.noncombat);
const enemiesOf = (f, u) => f.units.filter((o) => o.team !== u.team && alive(o) && !o.def.noncombat);
const byId = (f, id) => f.units.find((u) => u.id === id);

export function command(f, c) {
  if (f.result) return;
  if (c.type === 'target') { const t = byId(f, c.id); f.target = t && alive(t) && t.team !== 'hero' && !t.def.noncombat ? t.id : null; }
  else if (c.type === 'regroup') { f.regroupT = 2.6; f.target = null; }
  else if (c.type === 'auto') f.auto = !!c.on;
  else if (c.type === 'special') startSpecial(f, byId(f, c.id));
}

export function specialReady(u) { return u && alive(u) && u.meter >= 100 && u.def.special && !['special', 'down', 'hit'].includes(u.state); }

// ---- one step
export function step(f, dt) {
  f.events = [];
  if (f.result) { for (const u of f.units) if (alive(u)) { u.st += dt; settle(u, dt); } return; }
  f.t += dt;
  if (f.regroupT > 0) f.regroupT -= dt;
  if (f.specialT > 0) f.specialT -= dt;
  if (f.target && !alive(byId(f, f.target))) f.target = null;
  for (const u of f.units) {
    if (!alive(u)) continue;
    u.st += dt; u.cd -= dt;
    settle(u, dt);
    tick(f, u, dt);
  }
  stepProjectiles(f, dt);
  separate(f);
  for (const u of f.units) clampToArena(f, u);
  if (f.auto) autoCommands(f);
  // the lookout runs once the band is down
  const band = fighters(f, 'bandit');
  if (!band.length) for (const u of f.units) if (u.def.noncombat && alive(u) && u.state !== 'flee') { u.state = 'flee'; u.st = 0; }
  if (!band.length) end(f, 'win');
  else if (!fighters(f, 'hero').length) end(f, 'lose');
  else if (f.t >= TIME_LIMIT) end(f, 'timeout');
}

function end(f, r) {
  f.result = r; f.events.push({ type: 'end', result: r });
  for (const u of f.units) if (alive(u) && u.team === (r === 'win' ? 'hero' : 'bandit') && !u.def.noncombat) { u.state = 'victory'; u.st = 0; u.atk = null; }
}

// knockback slides and fades
function settle(u, dt) {
  if (u.kx || u.ky) {
    u.x += u.kx * dt; u.y += u.ky * dt;
    const k = Math.exp(-dt * 7); u.kx *= k; u.ky *= k;
    if (Math.hypot(u.kx, u.ky) < 0.05) u.kx = u.ky = 0;
  }
}

function tick(f, u, dt) {
  switch (u.state) {
    case 'hit': case 'block': if (u.st >= u.dur) idle(u); return;
    case 'down': if (u.st >= u.dur) { u.state = 'getup'; u.st = 0; } return;
    case 'getup': if (u.st >= 0.45) idle(u); return;
    case 'dodge': u.x += Math.cos(u.dodgeA) * 5.5 * dt; u.y += Math.sin(u.dodgeA) * 5.5 * dt; if (u.st >= 0.4) idle(u); return;
    case 'attack': return tickAttack(f, u, dt);
    case 'special': return tickSpecial(f, u, dt);
    case 'flee': u.f = 0; u.x += 5 * dt; if (u.x > f.arena.w / 2 + 2) u.fled = true; return;
    default: return think(f, u, dt);
  }
}
function idle(u) { u.state = 'idle'; u.st = 0; u.atk = null; }

// ---- deciding what to do
function think(f, u, dt) {
  const d = u.def;
  if (d.noncombat) { moveToward(u, u.post, d.speed * 0.5, dt, 0.3); return; }
  if (u.team === 'hero' && f.regroupT > 0) {
    const spot = { x: -f.arena.w / 2 + 2.2, y: u.id === 'kael' ? 0.6 : -0.6 };
    if (!moveToward(u, spot, d.speed, dt, 0.25)) u.state = 'idle';
    return;
  }
  const t = pickTarget(f, u);
  if (!t) { u.state = 'idle'; return; }
  const dd = dist(u, t), reach = (A) => A.range + t.r;
  u.f = angTo(u, t);
  if (d.role === 'caster') {
    const near = nearestEnemy(f, u);
    if (near && dist(u, near) < 1.7 && d.melee && u.cd <= 0) return startAttack(f, u, d.melee, near);
    if (near && dist(u, near) < d.keepAway) {
      // step back toward her own side, away from the closest foe
      const a = angTo(near, u);
      if (moveToward(u, { x: u.x + Math.cos(a) * 2, y: u.y + Math.sin(a) * 2 }, d.speed * 0.85, dt, 0.1, true)) return;
    }
    if (dd > d.attack.range * 0.9) { moveToward(u, t, d.speed, dt, d.attack.range * 0.8); return; }
    if (u.cd <= 0) return startAttack(f, u, d.attack, t);
    u.state = 'idle'; return;
  }
  // melee: come in to reach; a flanker comes round to the far side of its mark
  if (dd > reach(d.attack) * 0.92) {
    let goal = t;
    if (d.role === 'flanker' && dd > 2.4) {
      const guard = f.units.find((o) => o.team === t.team && o !== t && alive(o) && o.def.role === 'protector');
      if (guard) { const a = angTo(guard, t); goal = { x: t.x + Math.cos(a) * 1.1, y: t.y + Math.sin(a) * 1.1 }; }
    }
    moveToward(u, goal, d.speed, dt, reach(d.attack) * 0.8);
    return;
  }
  if (u.cd <= 0) return startAttack(f, u, d.attack, t);
  u.state = 'idle';
}

function pickTarget(f, u) {
  if (u.team === 'hero') {
    const forced = f.target && byId(f, f.target);
    if (forced && alive(forced)) return forced;
    if (u.def.role === 'protector') {
      // Kael takes whoever is on Eiryn
      const ward = f.units.find((o) => o.team === 'hero' && o !== u && alive(o));
      if (ward) { const on = enemiesOf(f, u).filter((e) => dist(e, ward) < 2.6).sort((a, b) => dist(a, ward) - dist(b, ward))[0]; if (on) return on; }
    }
    return nearestEnemy(f, u);
  }
  if (u.def.firstTarget && f.t < 8) { const ft = byId(f, u.def.firstTarget); if (ft && alive(ft)) return ft; }
  return nearestEnemy(f, u);
}
function nearestEnemy(f, u) { let best = null, bd = 1e9; for (const e of enemiesOf(f, u)) { const d = dist(u, e); if (d < bd) { bd = d; best = e; } } return best; }

// returns true while still moving
function moveToward(u, p, speed, dt, stopAt, backing) {
  const dx = p.x - u.x, dy = p.y - u.y, d = Math.hypot(dx, dy);
  if (d <= stopAt) { if (u.state === 'move') u.state = 'idle'; return false; }
  const s = Math.min(d - stopAt, speed * dt);
  u.x += (dx / d) * s; u.y += (dy / d) * s;
  if (!backing) u.f = Math.atan2(dy, dx);
  u.state = 'move'; u.backing = !!backing; u.speedNow = speed;
  return true;
}

// ---- attacks
function startAttack(f, u, A, t) {
  u.state = 'attack'; u.st = 0; u.atk = { A, t: t.id, done: false, clip: u.combo++ };
  u.f = angTo(u, t);
}
function tickAttack(f, u, dt) {
  const { A } = u.atk, t = byId(f, u.atk.t);
  if (u.st < A.windup && t && alive(t)) u.f = angTo(u, t); // track the target through the wind-up
  if (A.lunge && u.st >= A.windup - 0.08 && u.st < A.windup + A.active) { u.x += Math.cos(u.f) * (A.lunge / (A.active + 0.08)) * dt; u.y += Math.sin(u.f) * (A.lunge / (A.active + 0.08)) * dt; }
  if (!u.atk.done && u.st >= A.windup) {
    u.atk.done = true;
    if (A.projectile) {
      f.projectiles.push({ x: u.x + Math.cos(u.f) * 0.5, y: u.y + Math.sin(u.f) * 0.5, a: u.f, v: A.projectile, left: A.range + 1, src: u.id, team: u.team, A });
      f.events.push({ type: 'cast', u: u.id, fx: A.fx });
    } else {
      f.events.push({ type: 'swing', u: u.id, fx: A.fx });
      for (const e of enemiesOf(f, u)) {
        if (dist(u, e) > A.range + e.r) continue;
        if (Math.abs(angDiff(u.f, angTo(u, e))) > A.arc / 2) continue;
        if (defend(f, e, u)) continue;
        hit(f, u, e, A);
      }
    }
  }
  if (u.st >= A.windup + A.active + A.recover) {
    idle(u);
    u.cd = u.team === 'hero' ? 0.2 + f.rnd() * 0.3 : 0.35 + f.rnd() * 0.6;
  }
}

// a blow it sees coming: block it, or roll away from it
function defend(f, e, src) {
  if (!['idle', 'move'].includes(e.state)) return false;
  const facing = Math.abs(angDiff(e.f, angTo(e, src))) < 1.0;
  if (facing && f.rnd() < e.def.parry * 0.6) {
    e.state = 'block'; e.st = 0; e.dur = 0.35; e.f = angTo(e, src);
    const a = angTo(src, e); e.kx += Math.cos(a) * 1.4; e.ky += Math.sin(a) * 1.4;
    f.events.push({ type: 'block', u: e.id, x: (e.x + src.x) / 2, y: (e.y + src.y) / 2 });
    return true;
  }
  if (f.rnd() < e.def.dodge * 0.45) {
    e.state = 'dodge'; e.st = 0; e.dodgeA = angTo(src, e) + (f.rnd() < 0.5 ? 1.2 : -1.2); e.f = e.dodgeA;
    f.events.push({ type: 'dodge', u: e.id });
    return true;
  }
  return false;
}

function hit(f, src, e, A, mult = 1) {
  const dmg = Math.round(roll(f, A.dmg) * mult);
  e.hp = Math.max(0, e.hp - dmg);
  const a = angTo(src, e);
  e.kx += Math.cos(a) * A.knock * 2.2; e.ky += Math.sin(a) * A.knock * 2.2;
  if (src.team === 'hero') src.meter = Math.min(100, src.meter + METER_PER_HIT);
  if (e.team === 'hero') e.meter = Math.min(100, e.meter + dmg * METER_PER_DAMAGE);
  f.events.push({ type: 'hit', u: e.id, src: src.id, dmg, x: e.x, y: e.y, fx: A.fx, big: dmg >= 30 });
  if (e.state === 'special') return; // a hero mid-art is not stopped
  e.atk = null;
  if (e.hp <= 0) { e.state = 'ko'; e.st = 0; f.events.push({ type: 'ko', u: e.id }); return; }
  if (A.down) { e.state = 'down'; e.st = 0; e.dur = 1.1; return; }
  e.state = 'hit'; e.st = 0; e.dur = 0.28 + (A.stagger || 0) * 0.5;
}

function stepProjectiles(f, dt) {
  for (const p of f.projectiles) {
    const s = p.v * dt; p.x += Math.cos(p.a) * s; p.y += Math.sin(p.a) * s; p.left -= s;
    const src = byId(f, p.src);
    for (const e of f.units) {
      if (e.team === p.team || !alive(e) || e.def.noncombat) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > e.r + 0.3) continue;
      p.left = 0;
      if (!defend(f, e, p)) hit(f, src || p, e, p.A);
      f.events.push({ type: 'impact', x: p.x, y: p.y, fx: p.A.fx });
      break;
    }
    if (Math.abs(p.x) > f.arena.w / 2 + 1 || Math.abs(p.y) > f.arena.h / 2 + 1) p.left = 0;
  }
  f.projectiles = f.projectiles.filter((p) => p.left > 0);
}

// ---- the heavy arts
function startSpecial(f, u) {
  if (!specialReady(u) || f.result) return false;
  const S = u.def.special, t = (f.target && byId(f, f.target)) || nearestEnemy(f, u);
  u.state = 'special'; u.st = 0; u.atk = null; u.meter = 0;
  u.spec = { S, t: t ? t.id : null, done: false, from: { x: u.x, y: u.y } };
  if (t) u.f = angTo(u, t);
  f.specialT = S.dur;
  f.events.push({ type: 'special', u: u.id, kind: S.kind, dur: S.dur, impactAt: S.impactAt });
  return true;
}
function tickSpecial(f, u, dt) {
  const { S } = u.spec, t = u.spec.t && byId(f, u.spec.t);
  if (S.kind === 'blade' && t && alive(t) && u.st < S.impactAt) {
    // the blade: closes on the target before the cut lands
    const a = angTo(u, t), d = dist(u, t) - (t.r + 0.9);
    if (d > 0) { const s = Math.min(d, 9 * dt); u.x += Math.cos(a) * s; u.y += Math.sin(a) * s; }
    u.f = a;
  }
  if (!u.spec.done && u.st >= S.impactAt) {
    u.spec.done = true;
    f.events.push({ type: 'artImpact', u: u.id, kind: S.kind, x: u.x + (S.kind === 'blade' ? Math.cos(u.f) * 1.2 : 0), y: u.y + (S.kind === 'blade' ? Math.sin(u.f) * 1.2 : 0) });
    for (const e of enemiesOf(f, u)) {
      const d = dist(u, e);
      if (S.kind === 'area' ? d > S.radius + e.r : d > S.range + e.r || Math.abs(angDiff(u.f, angTo(u, e))) > S.arc / 2) continue;
      hit(f, u, e, S);
    }
  }
  if (u.st >= S.dur) { idle(u); u.cd = 0.3; }
}

// The auto setting: fire an art when it would land on something.
function autoCommands(f) {
  for (const u of fighters(f, 'hero')) {
    if (!specialReady(u) || f.specialT > 0) continue;
    const S = u.def.special, foes = enemiesOf(f, u);
    const inReach = S.kind === 'area' ? foes.filter((e) => dist(u, e) < S.radius).length >= 2 || foes.length === 1 && dist(u, foes[0]) < S.radius
      : foes.some((e) => dist(u, e) < 4);
    if (inReach) startSpecial(f, u);
  }
}

function separate(f) {
  const us = f.units.filter((u) => alive(u));
  for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
    const a = us[i], b = us[j], d = dist(a, b), m = (a.r + b.r) * 0.9;
    if (d >= m || d < 1e-6) continue;
    const push = (m - d) / 2, nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
    a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
  }
}
function clampToArena(f, u) {
  if (u.state === 'flee') return;
  const hw = f.arena.w / 2 - u.r, hh = f.arena.h / 2 - u.r;
  u.x = Math.max(-hw, Math.min(hw, u.x)); u.y = Math.max(-hh, Math.min(hh, u.y));
}
