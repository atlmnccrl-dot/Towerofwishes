// Interludes: the boss leaves the fight for a while (Isaac-style) and the warden has a job to do, then it comes
// back changed. Pure logic on top of the World in sim.js, no DOM, no three.js (it runs in Node).
//
// API (docs/ASCENT_DESIGN.md §6):
//   // inside a boss AI (shape of bosses2.js BOSS_AI2 entries):
//   import { interlude, stageOf } from './interlude.js';
//   // stageOf(boss) -> 1 | 2 | 3   (by hp fraction: >0.66, >0.33, else; a boss may set its own thresholds)
//   // interlude(world, boss, spec) starts an interlude; returns a handle { done, t }.
//   // spec = {
//   //   kind: 'waves' | 'targets' | 'gauntlet' | 'chase',
//   //   leave: 'burrow' | 'fly' | 'sink' | 'fade' | 'climb',   // how it leaves (the fx/anim key)
//   //   banner: 'DESTROY THE BELL TOTEMS',                     // short, upper case
//   //   dur: 18,                                               // max seconds (gauntlet: exact)
//   //   waves: [[['hushed', 4], ['ghoul', 1]], ...],           // waves: unit types and counts
//   //   targets: { type: 'totem', n: 4, hp: 60 },              // targets: marked props with hp (hitting one bleeds the boss)
//   //   pattern: (world, t, dt) => {},                         // gauntlet/chase: the boss's hazards each tick
//   //   back: { x, z, entrance: 'slam' },                      // where and how it returns
//   //   onReturn: (world, boss) => {},                         // the stage change: new moves, arena change
//   // }
//   // While away: boss.away = true, untargetable, not drawn (or drawn far off), and its health bar shows the
//   // objective. The HUD reads world.interlude = { banner, progress: [n, of], t, dur }.
//
// More, all optional:
//   stageOf(boss): boss.stageAt = [0.7, 0.3] sets its own thresholds (else its plan's phases, else 0.66 / 0.33).
//     A returning mini-boss (boss.mini) is always stage 1, and interlude() on it is a no-op ({ done: true }).
//   spec.pattern(world, t, dt, H) runs for every kind while the boss is away (t: seconds away); H.every(key, s)
//     is true once each s seconds (a beat for the pattern).
//   spec.tier: the tier of the waves and the decoys (default: the boss's def tier, else 1).
//   spec.waves gap: spec.waveGap (default 9 s): the next wave comes when the last one is down or after the gap.
//   spec.targets = { type, n, hp, r, at: [{x, z}], radius, bleed (fraction of max hp per target, 0.03),
//     hurt (extra fraction when the last falls, 0.04), name, tick(world, t, dt, targets, H) }.
//     Target types (their look: js/actors/interlude_props.js): chain, candle, bone, bell, totem, mirror, lantern,
//     egg, anchor, mould.
//   spec.chase = { hits: 3, surface: 1.8, gap: 1.0, decoys: 0, decoyHp: 1, punish: 14 }: the boss surfaces at a
//     marked spot for `surface` seconds; a blow on it counts; with decoys, look-alikes surface at the same time
//     (striking one makes it burst after a warning).
//   spec.back = { x, z, entrance: 'slam' | 'drop' | 'rise' | 'rush', dmg: 20, r: 2.2 }: the return blow is marked
//     on the stones a full second before it lands. Without x, z it lands near the arena's heart, off the hero.
//   spec.onLeave(world, boss), spec.onDone(world, boss, early): hooks around the stage change.
//   The objective finished early (every target down, every wave dead, every chase hit landed) brings the boss
//   back sooner, hurt and staggered; the timeout always ends it (the boss comes back unhurt).
//   interludeOf(world, boss): the running handle or null. arenaSpot(world, boss, o): a free, reachable point.
//
// The boss's own health never falls past its next stage while it is away (a blow that would skip a stage is
// held at the threshold), so every stage plays. Fair: every return blow and every pattern hazard is telegraphed.
//
// Names, banners and the comments describing what they are: PROPOSAL, for the author.
import { UNITS, UNIT_AI } from './units.js'; // read at call time only (units.js imports ai.js, which imports this)
import { FOES } from './defs.js';

const TAU = Math.PI * 2;
const LEAVE = 1.4, RETURN = 1.25;
const clamp01 = (k) => Math.max(0, Math.min(1, k));

// ------------------------------------------------------------------ stages
function thresholds(boss) {
  if (Array.isArray(boss.stageAt)) return boss.stageAt;
  const P = boss.ai && boss.ai._plan; if (P && Array.isArray(P.phases)) return P.phases.slice(0, 2);
  return [0.66, 0.33];
}
export function stageOf(boss) {
  if (!boss || boss.mini) return 1;
  const f = boss.hp / (boss.maxHp || 1); const th = thresholds(boss);
  return Math.min(3, 1 + th.filter((x) => f <= x).length);
}
// the health the boss may not fall below while away: just above its next stage's threshold (or 1 in its last).
// Its stage is the phase it has just entered (boss.phase, set by ai.js thinkBoss), else read from its health.
function floorHp(boss) {
  const th = thresholds(boss).slice().sort((a, b) => b - a);
  const st = boss.phase || stageOf(boss); const next = th[st - 1];
  return next !== undefined ? Math.ceil((next + 0.015) * boss.maxHp) : 1;
}

// ------------------------------------------------------------------ the target and decoy units
// registered on first use (units.js is still being evaluated when this module is)
let registered = false;
function register() {
  if (registered) return; registered = true;
  UNITS.itarget = {
    name: 'Mark', hp: 60, poise: 999, flinch: 0, speed: 0, r: 0.5, mass: 99, aggro: 99, keep: 0, attacks: [], drop: 0, summon: true, target: true,
    look: { rig: 'imark', kind: 'totem', colors: {} },
  };
  UNITS.idecoy = {
    name: 'Look-alike', hp: 1, poise: 999, flinch: 0, speed: 0, r: 0.6, mass: 99, aggro: 99, keep: 0, attacks: [], drop: 0, summon: true, decoy: true,
    look: { weapon: 'none', colors: {} },
  };
  const still = (w, e) => { e.mx = 0; e.mz = 0; e.moveSpeed = 0; e.anim = e.def.decoy ? (e.ai.pose || 'idle') : 'idle'; e.ai.aggro = true; return true; };
  UNIT_AI.itarget = still; UNIT_AI.idecoy = still;
}

// ------------------------------------------------------------------ places
// the arena's heart: where the boss first stood, a third of the way toward where the warden met it
function heart(w, boss) {
  const A = boss.ai; if (A.ilHeart) return A.ilHeart;
  const s = A.spawnAt || { x: boss.x, z: boss.z }; const h = w.hero || s;
  const c = { x: s.x + (h.x - s.x) * 0.35, z: s.z + (h.z - s.z) * 0.35 };
  A.ilHeart = okSpot(w, c.x, c.z, 0.6) ? c : { x: s.x, z: s.z }; return A.ilHeart;
}
function okSpot(w, x, z, r) {
  const [x0, z0, x1, z1] = w.bounds;
  return x > x0 + r + 0.6 && x < x1 - r - 0.6 && z > z0 + r + 0.6 && z < z1 - r - 0.6 && !w._blocked(x, z, r);
}
// a free point the warden can reach (nothing solid between): o = { from, min, max, r, avoid: [{x, z, d}], near }
export function arenaSpot(w, boss, o = {}) {
  const hero = w.hero; const c = o.near || heart(w, boss); const r = o.r ?? 0.6;
  const min = o.min ?? 2.5, max = o.max ?? 6.5; const avoid = o.avoid || [];
  for (let k = 0; k < 40; k++) {
    const a = w.rand() * TAU, d = min + w.rand() * (max - min) * (k < 30 ? 1 : 0.5);
    const x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
    if (!okSpot(w, x, z, r)) continue;
    if (hero && (Math.hypot(hero.x - x, hero.z - z) < (o.heroGap ?? 2.2) || !w.clear(hero, { x, z }))) continue;
    if (avoid.some((p) => Math.hypot(p.x - x, p.z - z) < (p.d ?? 1.6))) continue;
    return { x, z };
  }
  // the heart itself (or the hero's side of it)
  return okSpot(w, c.x, c.z, r) ? { x: c.x, z: c.z } : { x: hero ? hero.x : c.x, z: hero ? hero.z + 2 : c.z };
}
// n points spread round the heart (targets): even angles with a random turn, each one checked
function spread(w, boss, n, radius, r) {
  const c = heart(w, boss); const out = []; const a0 = w.rand() * TAU;
  for (let i = 0; i < n; i++) {
    let got = null;
    for (let k = 0; k < 14 && !got; k++) {
      const a = a0 + (i + (k ? (w.rand() - 0.5) * 0.6 : 0)) / n * TAU; const d = radius * (k < 7 ? 1 : 0.6 + w.rand() * 0.3);
      const x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      if (okSpot(w, x, z, r + 0.2) && (!w.hero || Math.hypot(w.hero.x - x, w.hero.z - z) > 1.4) && !out.some((p) => Math.hypot(p.x - x, p.z - z) < 1.8)) got = { x, z };
    }
    out.push(got || arenaSpot(w, boss, { min: 1.5, max: radius, avoid: out.map((p) => ({ ...p, d: 1.4 })) }));
  }
  return out;
}

// ------------------------------------------------------------------ the world hook (ticks every step)
function hook(w) {
  if (w._il) return; w._il = { list: [] };
  const heroStep = w._hero;
  w._hero = function (e, h) { tickAll(this, h); heroStep.call(this, e, h); };
}
function tickAll(w, h) {
  const L = w._il.list; if (!L.length) return;
  for (const H of L) if (!H.done) step(w, H, h);
  w._il.list = L.filter((H) => !H.done);
  const live = w._il.list[0]; w.interlude = live ? live.hud : null;
}
const fx = (w, o) => { const q = w.fxq || (w.fxq = []); if (q.length < 300) q.push(o); };

export function interludeOf(w, boss) { return (w._il && w._il.list.find((H) => H.boss === boss && !H.done)) || null; }

// ------------------------------------------------------------------ start
export function interlude(w, boss, spec = {}) {
  if (!boss || boss.mini || boss.dead) return { done: true, t: 0, skipped: true };
  hook(w); register();
  const cur = interludeOf(w, boss); if (cur) return cur;
  const kind = spec.kind || 'gauntlet';
  const H = {
    boss, spec, kind, done: false, t: 0, ph: 'leave', pt: 0, early: false, at: { x: boss.x, z: boss.z },
    beats: {}, ents: [], targets: [], waveI: 0, waveT: 0, total: 0, killed: 0, hits: 0, need: 0,
    hud: { banner: spec.banner || 'SURVIVE', progress: [0, 1], t: 0, dur: spec.dur || 18, kind, boss, phase: 'leave' },
  };
  H.every = (key, s) => { const n = Math.floor(H.t / s); if (n > (H.beats[key] ?? -1)) { H.beats[key] = n; return true; } return false; };
  H.dur = Math.max(4, spec.dur || (kind === 'gauntlet' ? 14 : 20));
  H.hud.dur = H.dur;
  if (kind === 'waves') { H.total = (spec.waves || []).reduce((s, wv) => s + wv.reduce((a, [, n]) => a + n, 0), 0); H.hud.progress = [0, H.total || 1]; }
  if (kind === 'targets') { H.need = (spec.targets && spec.targets.n) || 4; H.hud.progress = [0, H.need]; }
  if (kind === 'chase') { H.need = (spec.chase && spec.chase.hits) || 3; H.hud.progress = [0, H.need]; }
  if (kind === 'gauntlet') H.hud.progress = [0, Math.round(H.dur)];
  // stop whatever it was doing; hold its health at the stage it is in
  boss.hp = Math.max(boss.hp, Math.min(boss.maxHp, floorHp(boss) + 1));
  H.floor = floorHp(boss);
  boss.il = H; boss.state = 'ilv'; boss.t = 0; boss.atk = null; boss.tele = null; boss.iframes = 99; boss.mx = boss.mz = 0; boss.moveSpeed = 0;
  boss.anim = 'roar'; boss.animT = 0; if (boss.ai) boss.ai.chan = null;
  w._il.list.push(H); w.interlude = H.hud;
  fx(w, { k: 'ilLeave', style: spec.leave || 'fade', x: boss.x, z: boss.z, r: boss.r, e: boss });
  w.emit('interlude', { e: boss, kind, banner: H.hud.banner, leave: spec.leave || 'fade' });
  w.emit('shake', { amt: 0.4 });
  return H;
}

// ------------------------------------------------------------------ the three parts: leave, away, return
function step(w, H, h) {
  const B = H.boss; H.pt += h;
  if (B.dead) { cleanup(w, H); H.done = true; return; }
  B.iframes = Math.max(B.iframes, 0.5); B.mx = B.mz = 0; B.moveSpeed = 0; B.tele = null; B.atk = null;
  if (H.ph === 'leave') return leaving(w, H, h);
  if (H.ph === 'away') return away(w, H, h);
  return returning(w, H, h);
}

function leaving(w, H, h) {
  const B = H.boss, k = clamp01(H.pt / LEAVE), st = H.spec.leave || 'fade'; B.state = 'ilv'; B.animT += 0; B.anim = 'roar';
  if (st === 'burrow' || st === 'sink') { const s = clamp01((k - 0.35) / 0.65); B.leapH = -s * s * (B.def.scale || 1) * 2.4; }
  else if (st === 'fly') { const s = clamp01((k - 0.3) / 0.7); B.leapH = s * s * 16; B.anim = s > 0 ? 'leap' : 'roar'; }
  else if (st === 'climb') { const s = clamp01((k - 0.25) / 0.75); B.leapH = s * 9; const a = H.away0 ?? (H.away0 = awayAngle(w, B)); B.x += Math.sin(a) * h * 3 * s; B.z += Math.cos(a) * h * 3 * s; keepIn(w, B); B.anim = 'walk'; }
  else if (st === 'fade') { B.hidden = k > 0.4 && Math.floor(H.pt * (8 + k * 20)) % 2 === 0; }
  if (H.pt < LEAVE) return;
  // gone
  B.away = true; B.hidden = true; B.leapH = 0; B.iframes = 999; B.anim = 'idle';
  H.ph = 'away'; H.pt = 0; H.t = 0; H.hud.phase = 'away';
  if (H.spec.onLeave) H.spec.onLeave(w, B);
  fx(w, { k: 'ilGone', style: H.spec.leave || 'fade', x: B.x, z: B.z, e: B });
  if (H.kind === 'targets') placeTargets(w, H);
  if (H.kind === 'waves') H.waveT = 99; // the first wave at once
}
function awayAngle(w, B) { const h = w.hero; return h ? Math.atan2(B.x - h.x, B.z - h.z) : 0; }
function keepIn(w, e) { const [x0, z0, x1, z1] = w.bounds; e.x = Math.max(x0 + e.r, Math.min(x1 - e.r, e.x)); e.z = Math.max(z0 + e.r, Math.min(z1 - e.r, e.z)); if (w._blocked(e.x, e.z, e.r * 0.5)) { e.x = e.ilPrevX ?? e.x; e.z = e.ilPrevZ ?? e.z; } e.ilPrevX = e.x; e.ilPrevZ = e.z; }

function away(w, H, h) {
  const B = H.boss, S = H.spec; H.t += h; H.hud.t = H.t;
  if (H.kind !== 'chase' || !H.up) { B.hidden = true; B.iframes = 999; }
  if (S.pattern) S.pattern(w, H.t, h, H);
  let done = false;
  if (H.kind === 'waves') done = waves(w, H, h);
  else if (H.kind === 'targets') done = targets(w, H, h);
  else if (H.kind === 'chase') done = chase(w, H, h);
  else { H.hud.progress = [Math.min(Math.round(H.dur), Math.floor(H.t)), Math.round(H.dur)]; done = false; }
  if (done) { H.early = true; return beginReturn(w, H); }
  if (H.t >= H.dur) beginReturn(w, H);
}

// waves of its servants: the next comes when the last is down (or after the gap)
function waves(w, H, h) {
  const S = H.spec, list = S.waves || []; H.waveT += h;
  const mine = H.ents.filter((e) => !e.dead);
  if (H.waveI < list.length && (mine.length === 0 || H.waveT >= (S.waveGap || 9))) {
    const wave = list[H.waveI++]; H.waveT = 0; const tier = S.tier ?? H.boss.def.tier ?? 1;
    const placed = [];
    for (const [type0, n] of wave) {
      const type = FOES[type0] || UNITS[type0] ? type0 : 'hushed';
      for (let i = 0; i < n; i++) {
        const p = arenaSpot(w, H.boss, { min: 3.5, max: 7.5, heroGap: 3, avoid: placed.map((q) => ({ ...q, d: 1.2 })) }); placed.push(p);
        const f = w.spawnFoe(type, p.x, p.z, { tier, aggro: true }); f.ai.locked = true; f.ilWave = H; H.ents.push(f);
      }
    }
    w.emit('summon', { e: H.boss }); fx(w, { k: 'ilWave', n: H.waveI, of: list.length, x: H.boss.x, z: H.boss.z });
  }
  H.killed = H.ents.filter((e) => e.dead).length; H.hud.progress = [H.killed, H.total || 1];
  return H.waveI >= list.length && H.ents.every((e) => e.dead);
}

// marked things to destroy: each one bleeds the boss; the last brings it back
function placeTargets(w, H) {
  const T = H.spec.targets || {}; const n = T.n || 4; const r = T.r || 0.5;
  const pts = T.at && T.at.length >= n ? T.at.slice(0, n) : spread(w, H.boss, n, T.radius || 4.6, r);
  const tier = H.spec.tier ?? H.boss.def.tier ?? 1;
  for (const p of pts) {
    const e = w.spawnFoe('itarget', p.x, p.z, { tier: 0, aggro: true, rise: false });
    const hp = Math.round((T.hp || 60) * (1 + tier * 0.12));
    e.def = { ...e.def, name: T.name || UNITS.itarget.name, r, look: { rig: 'imark', kind: T.type || 'totem', color: T.color, colors: {} } };
    e.r = r; e.hp = e.maxHp = hp; e.ai.locked = true; e.ai.aggro = true; e.anchor = { x: p.x, z: p.z }; e.ilTarget = H; e.face = 0;
    H.targets.push(e); fx(w, { k: 'ilTarget', x: p.x, z: p.z, kind: T.type || 'totem' });
  }
}
function targets(w, H, h) {
  const T = H.spec.targets || {}; const B = H.boss;
  for (const e of H.targets) {
    if (e.dead) { if (!e.ilCounted) { e.ilCounted = true; bleed(w, H, T.bleed ?? 0.03); fx(w, { k: 'ilBreak', x: e.x, z: e.z, kind: e.def.look.kind }); w.emit('shake', { amt: 0.25 }); } continue; }
    if (e.anchor && !e.creep) { e.x = e.anchor.x; e.z = e.anchor.z; } e.kbx = 0; e.kbz = 0; e.vx = 0; e.vz = 0;
  }
  if (T.tick) T.tick(w, H.t, h, H.targets, H);
  const down = H.targets.filter((e) => e.dead).length; H.hud.progress = [down, H.need];
  return H.targets.length > 0 && down >= H.targets.length && !B.dead;
}

// it surfaces at a marked spot for a moment; strike it there
function chase(w, H, h) {
  const C = H.spec.chase || {}; const B = H.boss; H.ct = (H.ct ?? -0.4) + h;
  const surface = C.surface ?? 1.8, gap = C.gap ?? 1.0;
  if (!H.up && !H.mark && H.ct >= gap) {
    const p = arenaSpot(w, B, { min: 2.8, max: 6.5, heroGap: 2.6, near: w.hero ? { x: (w.hero.x + heart(w, B).x) / 2, z: (w.hero.z + heart(w, B).z) / 2 } : null, r: B.r });
    H.mark = { x: p.x, z: p.z, t: 0 }; fx(w, { k: 'ilSurface', x: p.x, z: p.z, r: B.r + 0.5, warn: 0.55 });
    // look-alikes surface at the same time, elsewhere
    H.decoys = [];
    for (let i = 0; i < (C.decoys || 0); i++) {
      const q = arenaSpot(w, B, { min: 2.6, max: 7, heroGap: 2.2, r: B.r, avoid: [{ ...p, d: 2.2 }, ...H.decoys.map((d) => ({ x: d.x, z: d.z, d: 2.2 }))] });
      H.decoys.push({ x: q.x, z: q.z, e: null }); fx(w, { k: 'ilSurface', x: q.x, z: q.z, r: B.r + 0.5, warn: 0.55 });
    }
  }
  if (H.mark && !H.up) {
    H.mark.t += h;
    if (H.mark.t >= 0.55) {
      H.up = true; H.upT = 0; H.hp0 = B.hp; B.x = H.mark.x; B.z = H.mark.z; B.hidden = false; B.iframes = 0; B.leapH = 0;
      B.face = w.hero ? Math.atan2(w.hero.x - B.x, w.hero.z - B.z) : B.face; B.anim = C.pose || 'roar'; B.animT = 0; B.state = 'ilv';
      fx(w, { k: 'ilUp', x: B.x, z: B.z, style: H.spec.leave || 'fade', e: B });
      for (const d of H.decoys || []) {
        const e = w.spawnFoe('idecoy', d.x, d.z, { tier: 0, aggro: true, rise: false });
        e.def = { ...e.def, name: B.def.name, r: B.r, scale: B.def.scale, look: { ...B.def.look, scale: B.def.scale } }; e.r = B.r; e.hp = e.maxHp = C.decoyHp || 1;
        e.face = B.face; e.ai.pose = C.pose || 'roar'; e.anim = e.ai.pose; e.ai.locked = true; e.anchor = { x: d.x, z: d.z }; e.ilDecoy = H; d.e = e; H.ents.push(e);
      }
    }
  }
  if (H.up) {
    H.upT += h; B.iframes = 0; B.hidden = false;
    for (const d of H.decoys || []) if (d.e) {
      if (d.e.dead && !d.popped) { d.popped = true; w.addHazard({ shape: 'circle', x: d.x, z: d.z, r: 2.0, warn: 0.75, life: 0.25, dmg: (C.punish ?? 14) * (B.dmgMul || 1), src: B, kind: C.punishKind || 'slam', kb: 6 }); fx(w, { k: 'ilPop', x: d.x, z: d.z }); }
      else if (!d.e.dead) { d.e.x = d.x; d.e.z = d.z; d.e.kbx = d.e.kbz = 0; }
    }
    const struck = B.hp < H.hp0 - 0.5;
    if (B.hp < H.floor) B.hp = H.floor;
    if (struck || H.upT >= surface) {
      if (struck) { H.hits++; w.emit('shake', { amt: 0.3 }); fx(w, { k: 'ilStruck', x: B.x, z: B.z, e: B }); }
      dive(w, H);
    }
  }
  H.hud.progress = [H.hits, H.need];
  return H.hits >= H.need;
}
function dive(w, H) {
  const B = H.boss; H.up = false; H.mark = null; H.ct = 0; B.hidden = true; B.iframes = 999; B.anim = 'idle';
  fx(w, { k: 'ilDown', x: B.x, z: B.z, style: H.spec.leave || 'fade', e: B });
  for (const d of H.decoys || []) if (d.e && !d.e.dead) { vanish(w, d.e); fx(w, { k: 'ilDown', x: d.x, z: d.z, style: H.spec.leave || 'fade' }); }
  H.decoys = [];
}
// gone without a death (no drop, no kill credit): a target left standing, a decoy that dives
function vanish(w, e) { e.dead = true; e.state = 'dead'; e.hp = 0; e.deadT = 30; e.tele = null; e.anim = 'die'; e.ilGone = true; }

// the boss bleeds (never past its next stage)
function bleed(w, H, frac) {
  const B = H.boss; const dmg = Math.round(B.maxHp * frac);
  const real = Math.max(0, Math.min(dmg, B.hp - H.floor)); if (real <= 0) return;
  B.hp -= real; B.flash = 0.15; w.emit('ilBleed', { e: B, dmg: real, x: B.x, z: B.z }); fx(w, { k: 'ilBleed', dmg: real, e: B });
}

// ------------------------------------------------------------------ return
function beginReturn(w, H) {
  const B = H.boss, S = H.spec, b = S.back || {};
  if (H.kind === 'chase' && H.up) dive(w, H);
  if (H.early && H.kind !== 'targets') bleed(w, H, S.hurt ?? 0.03);
  if (H.early && H.kind === 'targets') bleed(w, H, (S.targets && S.targets.hurt) ?? 0.04);
  let p = b.x !== undefined ? { x: b.x, z: b.z } : arenaSpot(w, B, { min: 0, max: 2.5, heroGap: 3.2, r: B.r });
  if (!okSpot(w, p.x, p.z, B.r)) p = arenaSpot(w, B, { min: 0, max: 3, heroGap: 3, r: B.r });
  H.ret = { x: p.x, z: p.z, ent: b.entrance || 'slam', r: b.r ?? Math.max(2.0, B.r + 1.4) };
  H.ph = 'return'; H.pt = 0; H.hud.phase = 'return';
  B.hidden = true; B.x = p.x; B.z = p.z; B.leapH = 0; B.state = 'ilv';
  // the blow is marked a full second before it lands
  const dmg = (b.dmg ?? 20) * (B.dmgMul || 1);
  const kind = b.kind || ({ rise: 'sand', rush: 'slam', drop: 'drop', slam: 'slam' })[H.ret.ent] || 'slam';
  if (H.ret.ent === 'rush') {
    const a = w.hero ? Math.atan2(p.x - w.hero.x, p.z - w.hero.z) + (w.rand() < 0.5 ? 1.3 : -1.3) : 0; const len = 7;
    let sx = p.x + Math.sin(a) * len, sz = p.z + Math.cos(a) * len; const q = w._lastClear(p.x, p.z, sx, sz, B.r); sx = q.x; sz = q.z;
    H.ret.from = { x: sx, z: sz }; const L = Math.hypot(p.x - sx, p.z - sz);
    w.addHazard({ shape: 'line', x: sx, z: sz, face: Math.atan2(p.x - sx, p.z - sz), len: L + 1.2, width: B.r * 2 + 0.6, warn: 1.0, life: 0.22, dmg, src: B, kind, kb: 8 });
  }
  w.addHazard({ shape: 'circle', x: p.x, z: p.z, r: H.ret.r, warn: 1.0, life: 0.25, dmg, src: B, kind, kb: 8 });
  fx(w, { k: 'ilReturn', ent: H.ret.ent, x: p.x, z: p.z, r: H.ret.r, warn: 1.0, e: B });
  cleanup(w, H, true);
}
function returning(w, H, h) {
  const B = H.boss, R = H.ret, k = H.pt;
  if (R.ent === 'slam' || R.ent === 'drop') { if (k >= 0.7) { B.hidden = false; const s = clamp01((k - 0.7) / 0.3); B.leapH = (1 - s * s) * 13; B.anim = 'leap'; } }
  else if (R.ent === 'rise') { if (k >= 0.65) { B.hidden = false; const s = clamp01((k - 0.65) / 0.35); B.leapH = -(1 - s) * 2.6 * (B.def.scale || 1); B.anim = 'roar'; } }
  else if (R.ent === 'rush') {
    if (k >= 0.45) { B.hidden = false; const s = clamp01((k - 0.75) / 0.25); B.x = R.from.x + (R.x - R.from.x) * s; B.z = R.from.z + (R.z - R.from.z) * s; B.face = Math.atan2(R.x - R.from.x, R.z - R.from.z); B.anim = s > 0 ? 'charge' : 'roar'; }
  }
  if (k >= 1.0 && !H.landed) {
    H.landed = true; B.x = R.x; B.z = R.z; B.leapH = 0; B.hidden = false;
    w.emit('shake', { amt: R.ent === 'drop' ? 0.9 : 0.7 }); fx(w, { k: 'ilLand', ent: R.ent, x: R.x, z: R.z, r: R.r, e: B });
    if (R.ent === 'drop') w.addHazard({ shape: 'ring', x: R.x, z: R.z, r0: R.r, r1: R.r + 6, warn: 0.15, life: 1.0, dmg: 12 * (B.dmgMul || 1), src: B, kind: 'shock', kb: 6 });
  }
  if (k < RETURN) return;
  // back in the fight, in its next stage
  B.away = false; B.hidden = false; B.leapH = 0; B.iframes = 0; B.il = null; H.done = true; H.hud.phase = 'done';
  if (w.hero) B.face = Math.atan2(w.hero.x - B.x, w.hero.z - B.z);
  if (H.early) { B.state = 'stagger'; B.t = 0; B.stagT = 2.4; B.anim = 'stagger'; B.animT = 0; w.emit('stagger', { e: B, interlude: true }); }
  else { B.state = 'idle'; B.t = 0; B.anim = 'idle'; B.animT = 0; }
  if (B.ai) B.ai.cd = H.early ? 1.2 : 0.8;
  if (H.spec.onReturn) H.spec.onReturn(w, B);
  if (H.spec.onDone) H.spec.onDone(w, B, H.early);
  w.emit('interludeEnd', { e: B, early: H.early, kind: H.kind });
  fx(w, { k: 'ilEnd', x: B.x, z: B.z, e: B });
}
// targets and decoys go when the boss comes back (the waves stay to fight)
function cleanup(w, H) {
  for (const e of H.targets) if (!e.dead) { vanish(w, e); fx(w, { k: 'ilBreak', x: e.x, z: e.z, kind: e.def.look.kind, quiet: true }); }
  for (const e of H.ents) if (e.ilDecoy && !e.dead) vanish(w, e);
}
