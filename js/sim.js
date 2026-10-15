/*
 * Tower of Wishes — arena simulation (prototype 0.1)
 *
 * Pure logic: no DOM, no canvas. Runs identically in the browser and in Node
 * (see test/sim-test.js). The renderer only reads state and drains s.fx / s.log.
 *
 * World units are metres. x runs east, y runs south, z is height.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TowSim = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- utils
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  function angDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // ---------------------------------------------------------------- arena
  // Forest clearing from Chapter One: a fallen trunk at Eiryn's back, a few
  // trees and stones, and the path back toward the road in the north-east.
  const ARENA = {
    name: 'Forest Clearing',
    rx: 11,
    ry: 7.5,
    exit: { x: 12.5, y: -6.5 },
    obstacles: [
      { kind: 'trunk', ax: -3.6, ay: 2.9, bx: 1.6, by: 3.9, r: 0.45 },
      { kind: 'tree', x: -6.8, y: -3.2, r: 0.5 },
      { kind: 'tree', x: 5.8, y: 4.0, r: 0.55 },
      { kind: 'tree', x: 7.4, y: -1.2, r: 0.45 },
      { kind: 'rock', x: -2.2, y: -3.6, r: 0.7 },
      { kind: 'rock', x: 3.6, y: -0.6, r: 0.45 },
      { kind: 'rock', x: -8.2, y: 2.6, r: 0.55 },
    ],
  };

  function obstacleCenter(o, px, py) {
    if (o.kind !== 'trunk') return { x: o.x, y: o.y };
    const dx = o.bx - o.ax, dy = o.by - o.ay;
    let t = ((px - o.ax) * dx + (py - o.ay) * dy) / (dx * dx + dy * dy);
    t = clamp(t, 0, 1);
    return { x: o.ax + dx * t, y: o.ay + dy * t };
  }

  // Line of sight: does the segment a->b pass through any obstacle?
  function hasLOS(a, b) {
    const steps = Math.ceil(dist(a, b) / 0.25);
    for (let i = 1; i < steps; i++) {
      const px = a.x + ((b.x - a.x) * i) / steps;
      const py = a.y + ((b.y - a.y) * i) / steps;
      for (const o of ARENA.obstacles) {
        const c = obstacleCenter(o, px, py);
        if (Math.hypot(px - c.x, py - c.y) < o.r) return false;
      }
    }
    return true;
  }

  // ---------------------------------------------------------------- units
  // Each fighter has a "brain": reaction time, how well it reads feints,
  // how often it chooses to parry or dodge, and a personality flag or two.
  const DEFS = {
    kael: {
      name: 'Kael', team: 'hero', r: 0.38, hp: 180, sta: 100, speed: 4.3,
      react: 0.17, read: 0.6, parry: 0.55, dodge: 0.5, feint: 0.1,
      protector: true, riposte: true, cleave: true, superMeter: true,
      attack: { name: 'Slash', range: 1.6, arc: 1.7, windup: 0.34, active: 0.1, recover: 0.38, dmg: [12, 16], knock: 1.0, lunge: 0.45, sta: 12 },
      barks: { start: 'That’s enough.', super: 'Get back!', win: 'They’re gone.', protect: 'Over here!' },
    },
    eiryn: {
      name: 'Eiryn', team: 'hero', guest: true, r: 0.33, hp: 46, sta: 40, speed: 3.4,
      react: 0.3, read: 0.5, parry: 0, dodge: 0.4, feint: 0,
      attack: { name: 'Branch', range: 1.5, arc: 1.5, windup: 0.46, active: 0.1, recover: 0.6, dmg: [3, 5], knock: 0.8, stagger: 0.55, lunge: 0.25, sta: 15 },
      barks: { start: 'Keep your hands off me.', warn: 'Behind you!', swing: 'Back!' },
    },
    brute: {
      name: 'Broad Bandit', team: 'bandit', r: 0.48, hp: 150, sta: 100, speed: 3.3,
      react: 0.36, read: 0.2, parry: 0, dodge: 0.12, feint: 0.05, morale: 1.25,
      punisher: true, opener: 'eiryn',
      attack: { name: 'Haymaker', range: 1.85, arc: 1.7, windup: 0.82, active: 0.14, recover: 0.75, dmg: [28, 36], knock: 2.6, down: true, lunge: 0.5, sta: 20 },
      barks: { start: 'Do another trick.', punish: 'Out of breath?', flee: 'Not worth it!' },
    },
    knife: {
      name: 'Knife Bandit', team: 'bandit', r: 0.34, hp: 90, sta: 100, speed: 4.5,
      react: 0.22, read: 0.4, parry: 0, dodge: 0.55, feint: 0.45, morale: 1.0,
      attack: { name: 'Stab', range: 1.3, arc: 1.2, windup: 0.3, active: 0.08, recover: 0.34, dmg: [12, 16], knock: 0.4, lunge: 0.7, sta: 10 },
      barks: { start: 'Who are you supposed to be?', feint: 'Too slow!', flee: 'Forget this!' },
    },
    hatchet: {
      name: 'Hatchet Bandit', team: 'bandit', r: 0.38, hp: 100, sta: 100, speed: 4.1,
      react: 0.26, read: 0.3, parry: 0, dodge: 0.3, feint: 0.15, morale: 1.0,
      flanker: true, opener: 'eiryn',
      attack: { name: 'Chop', range: 1.4, arc: 1.4, windup: 0.44, active: 0.1, recover: 0.42, dmg: [15, 19], knock: 0.8, lunge: 0.5, sta: 12 },
      barks: { start: 'Round the back.', flee: 'She’s trouble.' },
    },
    lookout: {
      name: 'Lookout', team: 'bandit', r: 0.33, hp: 60, sta: 100, speed: 4.7,
      react: 0.25, read: 0.35, parry: 0, dodge: 0.45, feint: 0, morale: 0.55,
      ranged: true, keepAway: 6,
      attack: { name: 'Sling', range: 8.5, arc: 0.6, windup: 0.62, active: 0.05, recover: 0.5, dmg: [7, 10], knock: 0.3, sta: 0, projectile: 12 },
      barks: { start: 'I’ll watch the road.', flee: 'I’m out!' },
    },
  };

  const FREE = { idle: 1, move: 1, circle: 1 };

  function makeUnit(id, key, x, y, facing, hpFrac) {
    const d = DEFS[key];
    return {
      id, key, def: d, name: d.name, team: d.team, guest: !!d.guest, r: d.r,
      x, y, vx: 0, vy: 0, kx: 0, ky: 0, facing,
      hp: Math.max(1, Math.round(d.hp * (hpFrac == null ? 1 : hpFrac))), maxHp: d.hp,
      sta: d.sta, maxSta: d.sta,
      state: 'idle', st: 0, dur: 0,
      act: null, pending: null, plan: null,
      target: null, aggroUntil: 0, cd: 0.6, combo: 0,
      strafe: 1, strafeT: 0,
      morale: d.morale == null ? 1 : d.morale, hurtOnce: false, fled: false,
      allOut: 0, drained: 0, superMeter: 0,
      walk: 0, icon: null, iconT: 0, bark: null, barkT: 0, flash: 0,
    };
  }

  // ---------------------------------------------------------------- setup
  function createMatch(opts) {
    opts = opts || {};
    const rng = makeRng(opts.seed == null ? (Date.now() & 0xffffffff) : opts.seed);
    const hp = opts.heroHp || {};
    const units = [
      makeUnit('kael', 'kael', -7.5, -1.2, 0.2, hp.kael),
      makeUnit('eiryn', 'eiryn', -0.8, 2.2, -1.6, hp.eiryn),
      makeUnit('brute', 'brute', 0.5, 0.7, 2.3, 1),
      makeUnit('knife', 'knife', -2.4, 0.7, 0.8, 1),
      makeUnit('hatchet', 'hatchet', 2.8, 2.6, 3.0, 1),
      makeUnit('lookout', 'lookout', 6.2, -3.8, 2.6, 1),
    ];
    const s = {
      t: 0, rng, arena: ARENA, units, projectiles: [],
      byId: Object.fromEntries(units.map((u) => [u.id, u])),
      tokens: {}, nextGrant: {},
      allOut: { meter: 0, active: 0, used: false, drainedLeft: 0 },
      cutscene: null, result: null,
      fx: [], log: [],
      stats: { parries: 0, dodges: 0, feintsRead: 0, feintsLanded: 0, hitsTaken: 0, fled: 0, downed: 0, supers: 0 },
    };
    for (const u of units) {
      if (u.def.opener) u.target = s.byId[u.def.opener];
      else if (u.team === 'bandit') u.target = s.byId.eiryn;
    }
    s.byId.kael.target = s.byId.brute;
    bark(s, s.byId.eiryn, 'start', 0.2);
    bark(s, s.byId.brute, 'start', 1.0);
    bark(s, s.byId.kael, 'start', 2.2);
    say(s, 'Four bandits have Eiryn cornered against the fallen trunk.');
    return s;
  }

  // ---------------------------------------------------------------- talk
  function bark(s, u, key, delay) {
    const text = u.def.barks && u.def.barks[key];
    if (!text) return;
    // One voice at a time, so lines can be read.
    const at = s.t + (delay || 0);
    if (Math.abs(at - (s.lastBarkAt == null ? -9 : s.lastBarkAt)) < 1.1 && key !== 'super' && key !== 'win') return;
    s.lastBarkAt = at;
    u.bark = text;
    u.barkT = 1.9 + (delay || 0);
    u.barkDelay = delay || 0;
  }
  function say(s, text) { s.log.push({ t: s.t, text }); }
  function icon(u, ch) { u.icon = ch; u.iconT = 0.8; }

  // ---------------------------------------------------------------- queries
  const alive = (u) => u && u.state !== 'out' && !u.fled;
  const opponents = (s, u) => s.units.filter((o) => o.team !== u.team && alive(o));
  const isDrained = (u) => u.drained > 0;
  const inAllOut = (u) => u.allOut > 0;
  const canDefend = (u) => alive(u) && !isDrained(u) && !inAllOut(u) && u.state !== 'down';

  // ---------------------------------------------------------------- tokens
  // The fight director: only a couple of bandits may swing at the same
  // target at once. Everyone else circles, which keeps exchanges readable.
  function maxTokens(target) { return target.guest ? 1 : 2; }
  function holdsToken(s, u, target) {
    const set = s.tokens[target.id];
    return !!(set && set.has(u.id));
  }
  function requestToken(s, u, target, force) {
    const set = (s.tokens[target.id] = s.tokens[target.id] || new Set());
    if (set.has(u.id)) return true;
    if (!force && (set.size >= maxTokens(target) || s.t < (s.nextGrant[target.id] || 0))) return false;
    set.add(u.id);
    s.nextGrant[target.id] = s.t + 1.2 + s.rng() * 0.9;
    return true;
  }
  function releaseTokens(s, u) {
    for (const k in s.tokens) s.tokens[k].delete(u.id);
  }

  // ---------------------------------------------------------------- state
  function setState(u, state, dur) {
    u.state = state;
    u.st = 0;
    u.dur = dur || 0;
  }

  function startAttack(s, u, target, opts) {
    opts = opts || {};
    const A = u.def.attack;
    const fast = inAllOut(u) ? 0.45 : 1;
    let wind = opts.riposte ? 0.14 : A.windup * fast * (0.9 + s.rng() * 0.2);
    if (opts.combo) wind *= 0.7;
    const feint = !opts.riposte && !inAllOut(u) && s.rng() < (u.def.feint || 0);
    u.act = { A, target, phase: 'windup', t: 0, wind, feint, fake: feint };
    setState(u, 'attack');
    if (!inAllOut(u)) u.sta = Math.max(0, u.sta - (A.sta || 0));
    u.facing = angTo(u, target);
    const travel = A.projectile ? dist(u, target) / A.projectile : 0;
    notifyThreat(s, target, u, wind + travel, feint);
  }

  // A defender sees a wind-up, waits out its reaction time, then decides.
  function notifyThreat(s, d, attacker, timeToHit, feint) {
    if (!canDefend(d)) return;
    d.pending = {
      attacker,
      decideAt: s.t + d.def.react * (0.8 + s.rng() * 0.4),
      hitAt: s.t + timeToHit,
      feint,
    };
    d.plan = null;
  }

  function thinkDefense(s, u) {
    const p = u.pending;
    if (p && s.t >= p.decideAt) {
      u.pending = null;
      const a = p.attacker;
      if (!a.act || a.state !== 'attack' || !canDefend(u)) return;
      if (p.feint) {
        if (s.rng() < u.def.read) {
          icon(u, '?');
          s.stats.feintsRead += u.team === 'hero' ? 1 : 0;
          say(s, `${u.name} reads ${a.name}'s feint.`);
          // Punish the fake: step in while the feinter is still posing.
          if (FREE[u.state] && dist(u, a) <= u.def.attack.range + a.r + 0.2 && u.sta >= (u.def.attack.sta || 0) && !u.def.ranged) {
            startAttack(s, u, a, { riposte: true });
          }
          return;
        }
      }
      const remaining = p.hitAt - s.t;
      if (remaining < 0.05) return;
      icon(u, '!');
      if (u.def.parry > 0 && u.sta >= 10 && s.rng() < u.def.parry) {
        u.plan = { type: 'parry', at: p.hitAt - 0.12, attacker: a };
      } else if (u.sta >= 16 && s.rng() < u.def.dodge) {
        u.plan = { type: 'dodge', at: p.hitAt - 0.15, attacker: a };
      }
    }
    const plan = u.plan;
    if (plan && s.t >= plan.at) {
      u.plan = null;
      if (!FREE[u.state] || !canDefend(u)) return;
      if (plan.type === 'parry') {
        u.sta -= 10;
        u.facing = angTo(u, plan.attacker);
        setState(u, 'parry', 0.55);
      } else {
        u.sta -= 16;
        const away = angTo(plan.attacker, u);
        // Sidestep, choosing the side that keeps us nearer the centre.
        const side = Math.sign(Math.sin(angDiff(away, Math.atan2(-u.y, -u.x)))) || 1;
        const dir = away + side * 1.1;
        u.dodgeDir = dir;
        setState(u, 'dodge', 0.44);
      }
    }
  }

  // ---------------------------------------------------------------- hits
  function resolveStrike(s, u) {
    const A = u.act.A;
    const victims = u.def.cleave
      ? opponents(s, u).filter((v) => v.state !== 'down')
      : [u.act.target].filter(alive);
    let landed = false;
    for (const v of victims) {
      const d = dist(u, v);
      if (d > A.range + v.r) continue;
      if (Math.abs(angDiff(u.facing, angTo(u, v))) > A.arc / 2) continue;
      landed = applyHit(s, u, v, A) || landed;
      if (u.state !== 'attack') break; // parried: strike ended
    }
    if (!landed && !u.def.ranged && u.state === 'attack') {
      s.fx.push({ type: 'whiff', x: u.x, y: u.y, a: u.facing });
    }
  }

  function applyHit(s, u, v, A, projectile) {
    // Dodge i-frames
    if (v.state === 'dodge' && v.st < 0.3) {
      if (v.team === 'hero') { s.stats.dodges++; if (v.superMeter != null) gainSuper(v, 10); }
      s.fx.push({ type: 'dodge', x: v.x, y: v.y });
      return false;
    }
    // Parry window
    if (v.state === 'parry' && v.st < 0.34 && Math.abs(angDiff(v.facing, angTo(v, u))) < 1.3) {
      if (v.team === 'hero') s.stats.parries++;
      gainSuper(v, 25);
      s.fx.push({ type: 'parry', x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });
      if (projectile) { say(s, `${v.name} bats the stone aside.`); return false; }
      say(s, `${v.name} parries ${u.name}.`);
      releaseTokens(s, u);
      u.act = null;
      setState(u, 'stagger', 0.8);
      if (v.def.riposte) startAttack(s, v, u, { riposte: true });
      return false;
    }
    let dmg = A.dmg[0] + s.rng() * (A.dmg[1] - A.dmg[0]);
    if (inAllOut(u)) dmg *= 1.35;
    if (u.act && u.act.wasFeint) {
      dmg *= 1.15;
      if (u.team === 'bandit') s.stats.feintsLanded++;
    }
    dmg = Math.round(dmg);
    v.hp -= dmg;
    v.flash = 0.12;
    if (v.team === 'hero') s.stats.hitsTaken++;
    gainSuper(u, 8);
    gainSuper(v, 5);
    const a = angTo(u, v);
    const kn = A.knock * (inAllOut(u) ? 1.3 : 1);
    v.kx += Math.cos(a) * kn * 2.6;
    v.ky += Math.sin(a) * kn * 2.6;
    s.fx.push({ type: 'hit', x: v.x, y: v.y, dmg, big: dmg >= 18, from: u.team });
    // Being hit by Kael makes a bandit turn on him ("Make it look at me").
    if (u.id === 'kael' && v.team === 'bandit') { v.target = u; v.aggroUntil = s.t + 5; }
    if (v.team === 'bandit' && !v.hurtOnce && v.hp < v.maxHp * 0.4) {
      v.hurtOnce = true;
      v.morale -= 0.15;
    }
    if (v.hp <= 0) {
      v.hp = 0;
      knockOut(s, v, u);
      return true;
    }
    const wasWinding = v.state === 'attack' && v.act && v.act.phase !== 'strike';
    if (v.act) { releaseTokens(s, v); v.act = null; }
    v.pending = null; v.plan = null;
    if (A.down) {
      setState(v, 'down', 1.15);
      say(s, `${u.name}'s ${A.name.toLowerCase()} floors ${v.name}.`);
    } else if (A.stagger || wasWinding) {
      setState(v, 'stagger', A.stagger || 0.45);
      if (wasWinding) say(s, `${u.name} cuts through ${v.name}'s wind-up.`);
    } else {
      setState(v, 'hurt', 0.24);
    }
    return true;
  }

  function knockOut(s, v, by) {
    releaseTokens(s, v);
    v.act = null; v.pending = null; v.plan = null;
    setState(v, 'out');
    s.stats.downed += v.team === 'bandit' ? 1 : 0;
    say(s, `${v.name} is down.`);
    s.fx.push({ type: 'ko', x: v.x, y: v.y });
    if (v.team === 'bandit') {
      for (const o of s.units) if (o.team === 'bandit' && alive(o)) o.morale -= 0.2;
    }
  }

  function gainSuper(u, n) {
    if (u.def.superMeter && !inAllOut(u)) u.superMeter = Math.min(100, u.superMeter + n);
  }

  // ---------------------------------------------------------------- super
  // Kael's heavy move plays as a cutscene: the world freezes, the camera
  // closes in, and the effect lands part-way through.
  const SUPER = { name: 'Rising Cut', dur: 2.5, impactAt: 1.35, radius: 3.6, arc: 3.8, dmg: [26, 32] };

  function trySuper(s, u) {
    if (!u.def.superMeter || u.superMeter < 100 || !FREE[u.state] || inAllOut(u) || isDrained(u)) return false;
    const near = opponents(s, u).filter((o) => dist(u, o) < SUPER.radius - 0.4);
    const t = u.target;
    const wantIt = near.length >= 2 || (t && alive(t) && dist(u, t) < 2.4 && (t.state === 'stagger' || t.state === 'down')) || (u.hp < u.maxHp * 0.35 && near.length >= 1);
    if (!wantIt) return false;
    const focus = near.length ? near : [t];
    let cx = 0, cy = 0;
    for (const o of focus) { cx += o.x; cy += o.y; }
    u.facing = Math.atan2(cy / focus.length - u.y, cx / focus.length - u.x);
    u.superMeter = 0;
    s.stats.supers++;
    s.cutscene = { unit: u, name: SUPER.name, t: 0, dur: SUPER.dur, impactAt: SUPER.impactAt, applied: false, x0: u.x, y0: u.y };
    bark(s, u, 'super');
    say(s, `${u.name} — ${SUPER.name}!`);
    s.fx.push({ type: 'cutscene', unit: u.id });
    return true;
  }

  function applySuper(s) {
    const c = s.cutscene, u = c.unit;
    u.x += Math.cos(u.facing) * 1.6;
    u.y += Math.sin(u.facing) * 1.6;
    collideWorld(u);
    for (const v of opponents(s, u)) {
      if (dist(u, v) > SUPER.radius) continue;
      if (Math.abs(angDiff(u.facing, angTo(u, v))) > SUPER.arc / 2) continue;
      const dmg = Math.round(SUPER.dmg[0] + s.rng() * (SUPER.dmg[1] - SUPER.dmg[0]));
      v.hp -= dmg;
      v.flash = 0.2;
      const a = angTo(u, v);
      v.kx += Math.cos(a) * 7; v.ky += Math.sin(a) * 7;
      if (v.act) { releaseTokens(s, v); v.act = null; }
      v.pending = null; v.plan = null;
      v.morale -= 0.15;
      s.fx.push({ type: 'hit', x: v.x, y: v.y, dmg, big: true, from: u.team });
      if (v.hp <= 0) { v.hp = 0; knockOut(s, v, u); }
      else setState(v, 'down', 1.4);
    }
    for (const o of s.units) if (o.team !== u.team && alive(o)) o.morale -= 0.1;
    setState(u, 'recover', 0.45);
  }

  // ---------------------------------------------------------------- all out
  const ALL_OUT = { dur: 4.5, drained: 3.4, chargeTime: 18 };

  function triggerAllOut(s) {
    const A = s.allOut;
    if (A.used || A.meter < 1 || s.result || s.cutscene) return false;
    A.used = true;
    A.active = ALL_OUT.dur;
    for (const u of s.units) {
      if (u.team !== 'hero' || !alive(u)) continue;
      u.allOut = ALL_OUT.dur;
      u.pending = null; u.plan = null;
      if (u.state === 'parry' || u.state === 'dodge' || u.state === 'hurt') setState(u, 'idle');
    }
    say(s, 'ALL OUT! The team throws everything they have.');
    s.fx.push({ type: 'allout' });
    return true;
  }

  function endAllOut(s, u) {
    u.allOut = 0;
    u.sta = 0;
    u.drained = ALL_OUT.drained;
    icon(u, '…');
  }

  // ---------------------------------------------------------------- brains
  function chooseTargetKael(s, u) {
    const eiryn = s.byId.eiryn;
    // Kael lets a running bandit go.
    const foes = opponents(s, u).filter((f) => !f.fleeing);
    if (!foes.length) return null;
    if (alive(eiryn) && !inAllOut(u)) {
      let threat = null, best = 3.4;
      for (const f of foes) {
        if (f.target !== eiryn) continue;
        const d = dist(f, eiryn);
        if (d < best) { best = d; threat = f; }
      }
      if (threat) {
        if (u.target !== threat) {
          bark(s, u, 'protect');
          if (eiryn.def.barks.warn && s.rng() < 0.5) bark(s, eiryn, 'warn');
          say(s, `Kael moves to cut off ${threat.name}.`);
        }
        return threat;
      }
    }
    if (alive(u.target) && !u.target.fleeing && dist(u, u.target) < 5) return u.target;
    let best = null, score = Infinity;
    for (const f of foes) {
      let sc = dist(u, f) + f.hp * 0.025;
      if (f.state === 'stagger' || f.state === 'down') sc -= 1.5;
      if (f.def.ranged) sc += 3; // chasing the slinger is a last resort
      if (sc < score) { score = sc; best = f; }
    }
    return best;
  }

  function brainKael(s, u, dt) {
    if (trySuper(s, u)) return;
    const t = (u.target = chooseTargetKael(s, u));
    if (!t) return idle(u, dt);
    const A = u.def.attack;
    const d = dist(u, t);
    const reach = A.range + t.r - 0.15;
    // Anticipate: if the foe is still winding up and our blade is faster, cut in.
    if (t.state === 'attack' && t.act && t.act.phase === 'windup' && !t.def.ranged) {
      const left = t.act.wind - t.act.t;
      const mine = A.windup * (inAllOut(u) ? 0.45 : 1) + 0.06;
      if (left > mine && d <= reach + 0.5 && (u.sta >= A.sta || inAllOut(u)) && s.rng() < 0.08) {
        icon(u, '!');
        return startAttack(s, u, t);
      }
    }
    if (d > reach) return moveTo(s, u, t.x, t.y, inAllOut(u) ? 1.35 : 1.05, t);
    // Something is coming at us: hold guard and let the defence play out.
    if (!inAllOut(u) && (u.pending || u.plan)) return circle(s, u, t, Math.max(1.2, d), 0.3, dt);
    if (inAllOut(u)) { u.combo++; return startAttack(s, u, t, { combo: u.combo > 1 }); }
    if (u.cd <= 0 && u.sta >= A.sta + 6 && t.state !== 'dodge') {
      return startAttack(s, u, t, { combo: u.combo > 0 });
    }
    // Hold guard: shuffle sideways, facing the opponent.
    circle(s, u, t, Math.max(1.2, d), 0.35, dt);
  }

  function brainEiryn(s, u, dt) {
    const foes = opponents(s, u);
    if (!foes.length) return idle(u, dt);
    let near = null, nd = Infinity;
    for (const f of foes) { const d = dist(u, f); if (d < nd) { nd = d; near = f; } }
    const A = u.def.attack;
    if (nd < A.range + near.r - 0.1 && (u.sta >= A.sta || inAllOut(u)) && (u.cd <= 0 || inAllOut(u)) && !near.def.ranged) {
      if (s.rng() < 0.35) bark(s, u, 'swing');
      u.cd = 1.4 + s.rng();
      return startAttack(s, u, near);
    }
    if (inAllOut(u)) return moveTo(s, u, near.x, near.y, 1.2, near);
    const kael = s.byId.kael;
    let gx, gy;
    if (alive(kael)) {
      const a = angTo(near, kael);
      gx = kael.x + Math.cos(a) * 1.8;
      gy = kael.y + Math.sin(a) * 1.8;
    } else {
      const a = angTo(near, u);
      gx = u.x + Math.cos(a) * 3;
      gy = u.y + Math.sin(a) * 3;
    }
    if (Math.hypot(gx - u.x, gy - u.y) < 0.6 && nd > 3) { u.facing = angTo(u, near); return idle(u, dt); }
    moveTo(s, u, gx, gy, 0.95, near);
  }

  function chooseTargetBandit(s, u) {
    const kael = s.byId.kael, eiryn = s.byId.eiryn;
    // The Broad Bandit punishes a drained team: All Out has a price.
    if (u.def.punisher) {
      for (const h of [kael, eiryn]) {
        if (alive(h) && isDrained(h) && dist(u, h) < 7) {
          if (u.target !== h) { bark(s, u, 'punish'); say(s, `${u.name} sees ${h.name} gasping for breath.`); }
          return h;
        }
      }
    }
    if (alive(u.target) && s.t < u.aggroUntil) return u.target;
    if (u.def.flanker && alive(eiryn) && alive(kael) && dist(kael, eiryn) > 2.4) return eiryn;
    if (alive(u.target) && u.target === eiryn && s.t < 6) return eiryn;
    return alive(kael) ? kael : alive(eiryn) ? eiryn : null;
  }

  function brainBandit(s, u, dt) {
    if (u.morale < 0.2 && !u.fleeing) {
      u.fleeing = true;
      releaseTokens(s, u);
      bark(s, u, 'flee');
      say(s, `${u.name} breaks and runs for the road.`);
    }
    if (u.fleeing) return moveTo(s, u, ARENA.exit.x, ARENA.exit.y, 1.15, null, true);
    const t = chooseTargetBandit(s, u);
    if (t !== u.target) releaseTokens(s, u);
    u.target = t;
    if (!t) return idle(u, dt);
    const A = u.def.attack;
    const d = dist(u, t);

    if (u.def.ranged) {
      const want = u.def.keepAway;
      if (d < want - 1.2) {
        const a = angTo(t, u);
        return moveTo(s, u, u.x + Math.cos(a) * 2, u.y + Math.sin(a) * 2, 0.9, t);
      }
      if (u.cd <= 0 && d < A.range && hasLOS(u, t)) {
        u.cd = 2.4 + s.rng() * 1.4;
        return startAttack(s, u, t);
      }
      return circle(s, u, t, want, 0.6, dt);
    }

    const punishing = u.def.punisher && isDrained(t);
    const token = holdsToken(s, u, t) || (u.cd <= 0 && requestToken(s, u, t, punishing));
    const reach = A.range + t.r - 0.1;
    if (token) {
      if (d > reach) return moveTo(s, u, t.x, t.y, punishing ? 1.25 : 1, t);
      if (u.cd <= 0) {
        if (s.rng() < 0.25) bark(s, u, 'feint');
        return startAttack(s, u, t);
      }
    }
    const ring = 2.7 + (u.id.length % 3) * 0.35;
    circle(s, u, t, ring, 0.55, dt);
  }

  // ---------------------------------------------------------------- motion
  function idle(u) {
    if (u.state !== 'idle') setState(u, 'idle');
    u.vx *= 0.8; u.vy *= 0.8;
  }

  // ------------------------------------------------------------ pathing
  // A small visibility graph round every obstacle. Units walk straight when
  // they can and otherwise follow the shortest route of corner points.
  function segPointDist(ax, ay, bx, by, px, py) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
  }
  function segSegDist(a, b, c, d) {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
    if (((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))) return 0;
    return Math.min(
      segPointDist(a.x, a.y, b.x, b.y, c.x, c.y), segPointDist(a.x, a.y, b.x, b.y, d.x, d.y),
      segPointDist(c.x, c.y, d.x, d.y, a.x, a.y), segPointDist(c.x, c.y, d.x, d.y, b.x, b.y));
  }
  function clearPath(a, b, rad) {
    for (const o of ARENA.obstacles) {
      const lim = o.r + rad;
      if (o.kind === 'trunk') {
        if (segSegDist(a, b, { x: o.ax, y: o.ay }, { x: o.bx, y: o.by }) < lim) return false;
      } else if (segPointDist(a.x, a.y, b.x, b.y, o.x, o.y) < lim) return false;
    }
    return true;
  }
  const NAV_PAD = 0.75;
  const NAV = (function buildNav() {
    const nodes = [];
    for (const o of ARENA.obstacles) {
      const R = o.r + NAV_PAD;
      if (o.kind === 'trunk') {
        const ax = o.bx - o.ax, ay = o.by - o.ay, al = Math.hypot(ax, ay);
        const ux = ax / al, uy = ay / al, nx = -uy, ny = ux;
        for (const [px, py, k] of [[o.ax, o.ay, -1], [o.bx, o.by, 1]]) {
          nodes.push({ x: px + ux * R * k, y: py + uy * R * k });
          nodes.push({ x: px + (ux * k + nx) * R * 0.75, y: py + (uy * k + ny) * R * 0.75 });
          nodes.push({ x: px + (ux * k - nx) * R * 0.75, y: py + (uy * k - ny) * R * 0.75 });
        }
      } else {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          nodes.push({ x: o.x + Math.cos(a) * R, y: o.y + Math.sin(a) * R });
        }
      }
    }
    const ok = nodes.filter((n) => (n.x / ARENA.rx) ** 2 + (n.y / ARENA.ry) ** 2 < 0.97 &&
      ARENA.obstacles.every((o) => { const c = obstacleCenter(o, n.x, n.y); return Math.hypot(n.x - c.x, n.y - c.y) > o.r + 0.5; }));
    const edges = ok.map(() => []);
    for (let i = 0; i < ok.length; i++) {
      for (let j = i + 1; j < ok.length; j++) {
        if (clearPath(ok[i], ok[j], 0.5)) {
          const w = dist(ok[i], ok[j]);
          edges[i].push([j, w]); edges[j].push([i, w]);
        }
      }
    }
    return { nodes: ok, edges };
  })();

  function findWaypoint(u, gx, gy) {
    const goal = { x: gx, y: gy };
    if (clearPath(u, goal, u.r - 0.04)) return goal;
    const N = NAV.nodes, n = N.length;
    const best = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
    const toGoal = N.map((p) => clearPath(p, goal, 0.45));
    for (let i = 0; i < n; i++) if (clearPath(u, N[i], u.r - 0.04)) best[i] = dist(u, N[i]);
    let bestEnd = -1, bestCost = Infinity;
    for (;;) {
      let i = -1, c = Infinity;
      for (let k = 0; k < n; k++) if (!done[k] && best[k] < c) { c = best[k]; i = k; }
      if (i < 0 || c >= bestCost) break;
      done[i] = true;
      if (toGoal[i]) { const tc = c + dist(N[i], goal); if (tc < bestCost) { bestCost = tc; bestEnd = i; } }
      for (const [j, w] of NAV.edges[i]) if (c + w < best[j]) { best[j] = c + w; prev[j] = i; }
    }
    if (bestEnd < 0) return goal; // no route found: walk straight and slide
    let i = bestEnd;
    while (prev[i] >= 0) i = prev[i];
    return N[i];
  }

  function detour(u, gx, gy, now) {
    const p = u.path;
    if (p && now - p.t < 0.25 && Math.hypot(p.gx - gx, p.gy - gy) < 0.6 && Math.hypot(p.wp.x - u.x, p.wp.y - u.y) > 0.3) return p.wp;
    const wp = findWaypoint(u, gx, gy);
    u.path = { t: now, gx, gy, wp };
    return wp;
  }

  function moveTo(s, u, gx, gy, mul, faceT, noBounds) {
    if (u.state !== 'move') setState(u, 'move');
    let speed = u.def.speed * (mul || 1);
    if (isDrained(u)) speed *= 0.65;
    const wp = detour(u, gx, gy, s.t);
    let dx = wp.x - u.x, dy = wp.y - u.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) { u.vx = 0; u.vy = 0; return; }
    dx /= d; dy /= d;
    // Keep a little personal space.
    for (const o of s.units) {
      if (o === u || !alive(o) || o.state === 'down') continue;
      const ox = u.x - o.x, oy = u.y - o.y, od = Math.hypot(ox, oy);
      if (od < 1.0 && od > 1e-4 && o !== faceT) { dx += (ox / od) * (1 - od) * 0.8; dy += (oy / od) * (1 - od) * 0.8; }
    }
    const n = Math.hypot(dx, dy) || 1;
    u.vx += ((dx / n) * speed - u.vx) * 0.25;
    u.vy += ((dy / n) * speed - u.vy) * 0.25;
    u.noBounds = !!noBounds;
    const face = faceT ? angTo(u, faceT) : Math.atan2(u.vy, u.vx);
    turnToward(u, faceT && dist(u, faceT) < 4 ? face : Math.atan2(u.vy, u.vx), 0.016 * 10);
  }

  function circle(s, u, t, radius, mul, dt) {
    if (u.state !== 'circle') setState(u, 'circle');
    u.strafeT -= dt;
    if (u.strafeT <= 0) { u.strafe = s.rng() < 0.5 ? -1 : 1; u.strafeT = 1.4 + s.rng() * 1.8; }
    const a = angTo(t, u) + (u.strafe * u.def.speed * mul * dt) / Math.max(radius, 0.5) * 1.6;
    const gx = t.x + Math.cos(a) * radius, gy = t.y + Math.sin(a) * radius;
    let dx = gx - u.x, dy = gy - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = Math.min(u.def.speed * mul * (isDrained(u) ? 0.65 : 1), d * 4);
    u.vx += ((dx / d) * sp - u.vx) * 0.2;
    u.vy += ((dy / d) * sp - u.vy) * 0.2;
    turnToward(u, angTo(u, t), 0.18);
  }

  function turnToward(u, a, rate) {
    const d = angDiff(u.facing, a);
    u.facing += clamp(d, -rate, rate);
  }

  function collideWorld(u) {
    for (const o of ARENA.obstacles) {
      const c = obstacleCenter(o, u.x, u.y);
      const dx = u.x - c.x, dy = u.y - c.y;
      const d = Math.hypot(dx, dy);
      const min = o.r + u.r;
      if (d < min) {
        const nx = d > 1e-5 ? dx / d : 1, ny = d > 1e-5 ? dy / d : 0;
        u.x = c.x + nx * min;
        u.y = c.y + ny * min;
      }
    }
    if (!u.fleeing) {
      const e = (u.x / ARENA.rx) ** 2 + (u.y / ARENA.ry) ** 2;
      if (e > 1) { const k = 1 / Math.sqrt(e); u.x *= k; u.y *= k; }
    }
  }

  function separate(s) {
    const live = s.units.filter((u) => alive(u) && u.state !== 'down');
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = a.r + b.r;
        if (d < min && d > 1e-5) {
          const push = (min - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  }

  // ---------------------------------------------------------------- tick
  function stepUnit(s, u, dt) {
    u.st += dt;
    if (u.cd > 0) u.cd -= dt;
    if (u.iconT > 0) u.iconT -= dt;
    if (u.barkDelay > 0) u.barkDelay -= dt; else if (u.barkT > 0) u.barkT -= dt;
    if (u.flash > 0) u.flash -= dt;
    if (u.state === 'out') { u.vx = u.vy = 0; decayKnock(u, dt); return; }
    if (u.fled) return;

    if (u.allOut > 0) { u.allOut -= dt; if (u.allOut <= 0) endAllOut(s, u); }
    if (u.drained > 0) u.drained -= dt;

    // Stamina recovers while not committing to anything.
    if (!isDrained(u) && !inAllOut(u) && u.state !== 'attack') u.sta = Math.min(u.maxSta, u.sta + 16 * dt);
    if (isDrained(u)) u.sta = Math.min(u.maxSta, u.sta + 4 * dt);

    if (u.state !== 'down' && u.state !== 'stagger' && u.state !== 'hurt') thinkDefense(s, u);

    switch (u.state) {
      case 'attack': stepAttack(s, u, dt); break;
      case 'parry':
      case 'recover':
      case 'hurt':
      case 'stagger':
      case 'down':
        u.vx *= 0.82; u.vy *= 0.82;
        if (u.st >= u.dur) { setState(u, 'idle'); if (u.id === 'kael') u.combo = 0; }
        break;
      case 'dodge': {
        const sp = u.st < 0.3 ? 5.8 : 1.5;
        u.vx = Math.cos(u.dodgeDir) * sp; u.vy = Math.sin(u.dodgeDir) * sp;
        if (u.st >= u.dur) setState(u, 'idle');
        break;
      }
      default:
        if (u.team === 'hero') (u.id === 'kael' ? brainKael : brainEiryn)(s, u, dt);
        else brainBandit(s, u, dt);
    }

    u.x += u.vx * dt;
    u.y += u.vy * dt;
    decayKnock(u, dt);
    u.walk += Math.hypot(u.vx, u.vy) * dt * 2.4;
    collideWorld(u);
    if (u.fleeing && Math.hypot(u.x - ARENA.exit.x, u.y - ARENA.exit.y) < 1.2) {
      u.fled = true;
      s.stats.fled++;
      releaseTokens(s, u);
      for (const o of s.units) if (o.team === u.team && alive(o)) o.morale -= 0.1;
    }
  }

  function decayKnock(u, dt) {
    u.x += u.kx * dt; u.y += u.ky * dt;
    const k = Math.pow(0.004, dt);
    u.kx *= k; u.ky *= k;
  }

  function stepAttack(s, u, dt) {
    const a = u.act;
    if (!a) { setState(u, 'idle'); return; }
    a.t += dt;
    u.vx *= 0.7; u.vy *= 0.7;
    const t = a.target;
    if (a.phase === 'windup') {
      if (alive(t)) turnToward(u, angTo(u, t), 0.05);
      if (a.t >= a.wind) {
        if (a.fake) {
          // The fake ends; hold for a beat, then the real strike comes fast.
          a.fake = false;
          a.wasFeint = true;
          a.phase = 'feint';
          a.t = 0;
          icon(u, '✦');
        } else {
          a.phase = 'strike'; a.t = 0;
          if (!a.A.projectile) {
            u.x += Math.cos(u.facing) * a.A.lunge;
            u.y += Math.sin(u.facing) * a.A.lunge;
            collideWorld(u);
            resolveStrike(s, u);
          } else {
            const sp = a.A.projectile;
            const ang = u.facing;
            s.projectiles.push({ x: u.x + Math.cos(ang) * 0.5, y: u.y + Math.sin(ang) * 0.5, z: 1.3, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, from: u, A: a.A, life: 1.2 });
          }
        }
      }
    } else if (a.phase === 'feint') {
      if (a.t >= 0.12) {
        a.phase = 'windup'; a.t = 0; a.wind = 0.2;
        if (alive(t)) {
          u.facing = angTo(u, t);
          // A defender who already read the feint reacts faster to the real one.
          const readIt = t.iconT > 0 && t.icon === '?';
          if (readIt && canDefend(t)) {
            t.pending = { attacker: u, decideAt: s.t + t.def.react * 0.4, hitAt: s.t + 0.2, feint: false };
          } else notifyThreat(s, t, u, 0.2, false);
        }
      }
    } else if (a.phase === 'strike') {
      if (a.t >= a.A.active) { a.phase = 'recover'; a.t = 0; }
    } else if (a.phase === 'recover') {
      const rec = a.A.recover * (inAllOut(u) ? 0.4 : 1);
      if (a.t >= rec) {
        releaseTokens(s, u);
        u.act = null;
        setState(u, 'idle');
        if (u.id === 'kael') {
          u.combo = Math.min(u.combo + 1, 2);
          u.cd = u.combo >= 2 ? 1.5 + s.rng() * 0.9 : 0.2 + s.rng() * 0.2;
          if (u.combo >= 2) u.combo = 0;
        } else if (u.team === 'bandit' && !u.def.ranged) {
          u.cd = 1.6 + s.rng() * 1.0;
        }
      }
    }
  }

  function stepProjectiles(s, dt) {
    for (const p of s.projectiles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      for (const o of ARENA.obstacles) {
        const c = obstacleCenter(o, p.x, p.y);
        if (Math.hypot(p.x - c.x, p.y - c.y) < o.r) { p.life = 0; s.fx.push({ type: 'thunk', x: p.x, y: p.y }); break; }
      }
      if (p.life <= 0) continue;
      for (const v of s.units) {
        if (v.team === p.from.team || !alive(v) || v.state === 'down') continue;
        if (Math.hypot(v.x - p.x, v.y - p.y) < v.r + 0.15) {
          p.life = 0;
          const fake = { act: null, team: p.from.team, x: p.x - p.vx * 0.05, y: p.y - p.vy * 0.05, name: p.from.name, id: p.from.id, def: p.from.def };
          applyHit(s, fake, v, p.A, true);
          break;
        }
      }
    }
    s.projectiles = s.projectiles.filter((p) => p.life > 0);
  }

  function step(s, dt) {
    if (s.result) return;
    if (s.cutscene) {
      const c = s.cutscene;
      c.t += dt;
      if (!c.applied && c.t >= c.impactAt) { c.applied = true; applySuper(s); }
      // After the impact, let the victims fly while the camera holds.
      if (c.applied) for (const u of s.units) if (u.state !== 'out' || u.kx || u.ky) { decayKnock(u, dt); if (alive(u)) collideWorld(u); }
      if (c.t >= c.dur) s.cutscene = null;
      return;
    }
    s.t += dt;
    const A = s.allOut;
    if (!A.used) A.meter = Math.min(1, A.meter + dt / ALL_OUT.chargeTime);
    if (A.active > 0) A.active -= dt;
    for (const u of s.units) stepUnit(s, u, dt);
    separate(s);
    for (const u of s.units) if (alive(u)) collideWorld(u);
    stepProjectiles(s, dt);
    checkEnd(s);
  }

  function checkEnd(s) {
    const kael = s.byId.kael;
    const heroesUp = s.units.some((u) => u.team === 'hero' && !u.guest && alive(u));
    if (!heroesUp) {
      s.result = { outcome: 'loss', time: s.t };
      say(s, `${kael.name} falls. The match is lost.`);
      return;
    }
    const banditsLeft = s.units.some((u) => u.team === 'bandit' && alive(u));
    if (!banditsLeft) {
      s.result = { outcome: 'win', time: s.t };
      bark(s, kael, 'win');
      say(s, 'The clearing is quiet. Victory.');
    }
  }

  function surrender(s) {
    if (s.result) return;
    s.result = { outcome: 'surrender', time: s.t };
    say(s, 'Kael pulls Eiryn back toward the road. Match abandoned.');
  }

  return {
    createMatch, step, triggerAllOut, surrender, makeRng,
    ARENA, DEFS, SUPER, ALL_OUT, NAV, obstacleCenter, hasLOS, alive,
  };
});
