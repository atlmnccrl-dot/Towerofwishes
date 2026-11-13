// How foes and bosses think. Pure logic on top of the World in sim.js.
import { ATTACKS as A } from './defs.js';
import { angDiff, angTo, dist, turn } from './sim.js';

const deg = (d) => (d * Math.PI) / 180;

function steer(w, e, ang) {
  // try the direct heading, then fan out around obstacles
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
    const a = ang + off * (e.ai.strafeDir || 1); const px = e.x + Math.sin(a) * 0.9, pz = e.z + Math.cos(a) * 0.9;
    if (!w._blocked(px, pz, e.r * 0.9)) return a;
  }
  return ang;
}

function pick(w, list) {
  const tot = list.reduce((s, o) => s + o.w, 0); let r = w.rand() * tot;
  for (const o of list) { r -= o.w; if (r <= 0) return o; }
  return list[list.length - 1];
}

export function thinkFoe(w, e, h) {
  const hero = w.hero; const D = e.def;
  if (!hero || hero.dead) { e.anim = 'idle'; return; }
  const d = dist(e, hero); const ang = angTo(e, hero);
  if (!e.ai.aggro) {
    if ((d < D.aggro && w.sees(e, hero)) || d < 3) { e.ai.aggro = true; w.emit('aggro', { e }); }
    else { e.anim = 'idle'; return; }
  }
  e.ai.cd -= h; e.ai.flip = (e.ai.flip || 2 + w.rand() * 2) - h;
  if (e.ai.flip <= 0) { e.ai.flip = 1.5 + w.rand() * 2.5; e.ai.strafeDir *= -1; }
  e.face = turn(e.face, ang, 7 * h);
  // attack?
  if (e.ai.cd <= 0 && Math.abs(angDiff(e.face, ang)) < 0.6) {
    const opts = D.attacks.filter((o) => d >= o.min && d <= o.max);
    const token = D.ranged ? w.attackers < w.tokensMax + 1 : w.attackers < w.tokensMax;
    if (opts.length && token && (D.ranged ? w.sees(e, hero) : true)) { const o = pick(w, opts); w.foeAttack(e, o.a); w.attackers++; return; }
  }
  // move
  let mv = null, sp = e.speed;
  if (D.ranged) {
    if (d < 3 && D.blink && (e.ai.blinkCd || 0) <= 0) { blink(w, e, hero); return; }
    if (d < D.keep - 2) { mv = ang + Math.PI; sp *= 0.9; }
    else if (d > D.keep + 2 || !w.sees(e, hero)) mv = ang;
    else { mv = ang + Math.PI / 2 * e.ai.strafeDir; sp *= 0.45; }
    e.ai.blinkCd = (e.ai.blinkCd || 0) - h;
  } else {
    const crowded = w.attackers >= w.tokensMax && e.state !== 'windup';
    const want = crowded ? 3.2 : D.keep;
    if (d > want + 0.5) mv = ang;
    else if (d < want - 0.8 && crowded) { mv = ang + Math.PI; sp *= 0.6; }
    else { mv = ang + Math.PI / 2 * e.ai.strafeDir; sp *= 0.4; }
  }
  if (mv !== null) { const a = steer(w, e, mv); e.mx = Math.sin(a); e.mz = Math.cos(a); e.moveSpeed = sp; e.anim = sp > e.speed * 0.6 ? 'run' : 'walk'; }
  else e.anim = 'idle';
}

function blink(w, e, hero) {
  for (let i = 0; i < 12; i++) {
    const a = w.rand() * Math.PI * 2; const r = 5.5 + w.rand() * 2.5;
    const x = hero.x + Math.sin(a) * r, z = hero.z + Math.cos(a) * r;
    const [bx0, bz0, bx1, bz1] = w.bounds;
    if (x < bx0 + 1 || x > bx1 - 1 || z < bz0 + 1 || z > bz1 - 1 || w._blocked(x, z, 0.6)) continue;
    w.emit('blink', { e, fx: e.x, fz: e.z, x, z }); e.x = x; e.z = z; e.ai.blinkCd = 3.5; e.ai.cd = Math.max(e.ai.cd, 0.5); return;
  }
  e.ai.blinkCd = 1;
}

// ------------------------------------------------------------------ bosses
// Each boss: phases by health, a move list per phase. Moves are attack defs (melee or ranged, using
// the World's windup/telegraph/strike machinery) plus scripted extras through onStrike.
export function thinkBoss(w, e, h) {
  const hero = w.hero; if (!hero || hero.dead) { e.anim = 'idle'; return; }
  const B = BOSS_AI[e.type];
  // phase changes
  const frac = e.hp / e.maxHp;
  const next = B.phases.findIndex((p) => frac <= p) + 2; // phases: [0.5] → phase 2 below 50%
  if (next > e.phase && next <= B.phases.length + 1) {
    e.phase = next; e.state = 'roar'; e.t = 0; e.anim = 'roar'; e.animT = 0; e.iframes = 1.4; e.tele = null;
    w.emit('phase', { e, phase: e.phase }); w.emit('shake', { amt: 0.6 }); w.slow(0.6, 0.4);
    if (B.onPhase) B.onPhase(w, e, e.phase);
    return;
  }
  if (e.state === 'roar') { if (e.t < 1.3) return; e.state = 'idle'; e.anim = 'idle'; e.ai.cd = 0.4; }
  if (e.hidden) { if (B.hiddenThink) return B.hiddenThink(w, e, h); }
  const d = dist(e, hero); const ang = angTo(e, hero);
  e.face = turn(e.face, ang, (B.turn || 4) * h);
  e.ai.cd -= h;
  if (e.ai.cd <= 0 && Math.abs(angDiff(e.face, ang)) < 0.8) {
    const list = B.moves(e.phase).filter((m) => d >= (m.min ?? 0) && d <= (m.max ?? 99) && (!m.cd || (e.ai['cd_' + m.id] || 0) <= w.t));
    if (list.length) {
      const m = pick(w, list); if (m.cd) e.ai['cd_' + m.id] = w.t + m.cd;
      if (m.run) { m.run(w, e); return; }
      w.foeAttack(e, m.a); return;
    }
  }
  // approach / circle
  const want = B.keep || 2.4; let mv = null, sp = e.speed;
  if (d > want + 0.6) mv = ang; else { mv = ang + Math.PI / 2 * (e.ai.strafeDir || 1); sp *= 0.35; }
  e.ai.flip = (e.ai.flip ?? 3) - h; if (e.ai.flip <= 0) { e.ai.flip = 2 + w.rand() * 3; e.ai.strafeDir = -(e.ai.strafeDir || 1); }
  const a = steer(w, e, mv); e.mx = Math.sin(a); e.mz = Math.cos(a); e.moveSpeed = sp; e.anim = d > want + 0.6 ? 'walk' : 'walk';
}

// boss helpers
function ringAt(w, e, x, z, r1, o = {}) { return w.addHazard({ shape: 'ring', x, z, r0: o.r0 ?? 0.6, r1, warn: o.warn ?? 0.5, life: o.life ?? 1.2, dmg: (o.dmg ?? 16) * e.dmgMul, src: e, kind: o.kind || 'shock', kb: 6 }); }
function circleAt(w, e, x, z, r, o = {}) { return w.addHazard({ shape: 'circle', x, z, r, warn: o.warn ?? 0.9, life: o.life ?? 0.25, dmg: (o.dmg ?? 18) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 7 }); }
function summon(w, e, type, n, tier, radius = 4) {
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 8; k++) {
      const a = w.rand() * Math.PI * 2; const x = e.x + Math.sin(a) * radius, z = e.z + Math.cos(a) * radius;
      if (!w._blocked(x, z, 0.6)) { w.spawnFoe(type, x, z, { tier, aggro: true }); break; }
    }
  }
  w.emit('summon', { e });
}

const strike = (o) => ({ dur: 1.2, windup: 0.6, active: 0.75, range: 2.5, arc: deg(140), dmg: 18, kb: 6, lunge: 2.5, tele: 'arc', heavy: true, ...o });

export const BOSS_AI = {
  // District I: a giant gaoler with a cleaver and a burning lantern on a chain.
  gaoler: {
    phases: [0.5], keep: 2.6, turn: 3.5,
    moves(p) {
      const m = [
        { id: 'chop', w: 3, max: 3.4, a: strike({ name: 'chop', anim: 'slam', range: 3.2, arc: deg(70), shape: 'line', width: 1.4, windup: 0.8, active: 0.9, dur: 1.45, dmg: 22, lunge: 1.5, tele: 'line' }) },
        { id: 'sweep', w: 2, max: 3.6, a: strike({ name: 'sweep', anim: 'sweep', range: 3.4, arc: deg(210), windup: 0.7, active: 0.86, dur: 1.4, dmg: 20 }) },
        { id: 'combo', w: 2, max: 3.0, a: strike({ name: 'combo', anim: 'fslash', range: 3.0, arc: deg(130), windup: 0.55, active: 0.66, dur: 1.75, dmg: 16, chain: { at: 0.9, windup: 1.2, active: 1.32, lunge: 3 } }) },
        { id: 'charge', w: 1.6, min: 5, max: 16, cd: 5, a: strike({ name: 'charge', anim: 'charge', shape: 'line', range: 9, width: 1.8, windup: 0.85, active: 1.55, dur: 2.0, dmg: 22, lunge: 13, lungeT: [0.85, 1.5], tele: 'line', teleRange: 10, turn: 2.5 }) },
        { id: 'lantern', w: 1.2, max: 4.5, cd: 6, a: strike({ name: 'lantern', anim: 'spin', shape: 'circle', offset: 0, radius: 3.6, windup: 0.9, active: 1.2, dur: 1.9, dmg: 18, lunge: 0, tele: 'circle', onStrike: (w, e) => { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; circleAt(w, e, e.x + Math.sin(a) * 4.2, e.z + Math.cos(a) * 4.2, 1.1, { warn: 0.6, life: 2.4, dmg: 10, kind: 'fire', kb: 3 }); } } }) },
      ];
      if (p >= 2) {
        m.push({ id: 'quake', w: 1.5, max: 20, cd: 7, a: strike({ name: 'quake', anim: 'slam', shape: 'circle', offset: 1.5, radius: 2.2, windup: 0.95, active: 1.05, dur: 1.8, dmg: 26, lunge: 0.5, tele: 'circle', onStrike: (w, e) => { ringAt(w, e, e.x + Math.sin(e.face) * 1.5, e.z + Math.cos(e.face) * 1.5, 9, { warn: 0, life: 1.1, dmg: 14 }); } }) });
        m.push({ id: 'chains', w: 0.8, max: 30, cd: 16, run: (w, e) => { summon(w, e, 'hushed', 2, 0); e.ai.cd = 1.2; e.state = 'roar'; e.t = 0.4; e.anim = 'roar'; e.animT = 0; } });
      }
      return m;
    },
    onPhase(w, e) { summon(w, e, 'hushed', 2, 0, 5); e.speed *= 1.18; },
  },

  // District II: the candle-witch of the market. Floats, blinks, rains wax and fire.
  tallow: {
    phases: [0.55], keep: 6, turn: 5,
    moves(p) {
      const m = [
        { id: 'orbs', w: 3, min: 2.5, a: { ...A.orbFan, name: 'orbs', dur: 1.3, windup: 0.65, active: 0.67, ranged: { kind: 'flame', speed: 6.8, r: 0.32, dmg: 13, life: 3.2, fan: p >= 2 ? 5 : 3, spread: deg(18), reflect: true } } },
        { id: 'wick', w: 2, min: 0, a: { name: 'wick', anim: 'cast', dur: 1.6, windup: 0.5, active: 0.52, tele: 'none', ranged: null, onStrike: (w, e) => { const hero = w.hero; for (let i = 0; i < (p >= 2 ? 5 : 3); i++) { const a = w.rand() * Math.PI * 2, r = w.rand() * 2.2; circleAt(w, e, hero.x + Math.sin(a) * r, hero.z + Math.cos(a) * r, 1.2, { warn: 0.9 + i * 0.15, dmg: 16, kind: 'fire' }); } } } },
        { id: 'flare', w: 1.6, max: 3.2, a: strike({ name: 'flare', anim: 'spin', shape: 'circle', offset: 0, radius: 3, windup: 0.6, active: 0.75, dur: 1.2, dmg: 15, lunge: 0, tele: 'circle' }) },
        { id: 'blink', w: 1.5, max: 4, cd: 3, run: (w, e) => { blink(w, e, w.hero); e.ai.cd = 0.35; } },
        { id: 'wax', w: 1, cd: 9, a: { name: 'wax', anim: 'roar', dur: 1.8, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', radius: 1.5, offset: 0, dmg: 0, onStrike: (w, e) => { ringAt(w, e, e.x, e.z, 10, { warn: 0, life: 1.6, dmg: 15, kind: 'wax' }); if (p >= 2) ringAt(w, e, e.x, e.z, 10, { warn: 0.7, life: 1.6, dmg: 15, kind: 'wax' }); } } },
      ];
      if (p >= 2) m.push({ id: 'brood', w: 0.8, cd: 14, run: (w, e) => { summon(w, e, 'ghoul', 3, 1, 5); e.ai.cd = 1; e.state = 'roar'; e.t = 0.5; e.anim = 'roar'; e.animT = 0; } });
      return m;
    },
    onPhase(w, e) { summon(w, e, 'ghoul', 2, 1, 5); },
  },

  // District III: the drowned priest of the flooded nave. Tides, geysers, a censer that drags you in.
  deacon: {
    phases: [0.6, 0.3], keep: 3.2, turn: 3.2,
    moves(p) {
      const m = [
        { id: 'censer', w: 3, max: 4, a: strike({ name: 'censer', anim: 'sweep', range: 3.8, arc: deg(230), windup: 0.75, active: 0.92, dur: 1.45, dmg: 20 }) },
        { id: 'smite', w: 2, max: 3.6, a: strike({ name: 'smite', anim: 'slam', shape: 'line', range: 3.6, width: 1.3, windup: 0.7, active: 0.8, dur: 1.4, dmg: 24, tele: 'line' }) },
        { id: 'geyser', w: 2, cd: 4, a: { name: 'geyser', anim: 'cast', dur: 1.4, windup: 0.5, active: 0.52, tele: 'none', onStrike: (w, e) => { const hero = w.hero; const n = 3 + p; for (let i = 0; i < n; i++) { const t = i / n; circleAt(w, e, e.x + (hero.x - e.x) * (0.3 + t), e.z + (hero.z - e.z) * (0.3 + t), 1.3, { warn: 0.7 + i * 0.12, dmg: 17, kind: 'water' }); } } } },
        { id: 'tide', w: 1.2, cd: 7, a: { name: 'tide', anim: 'roar', dur: 1.8, windup: 0.9, active: 0.92, tele: 'circle', shape: 'circle', radius: 1.8, offset: 0, dmg: 0, onStrike: (w, e) => { ringAt(w, e, e.x, e.z, 11, { warn: 0, life: 1.8, dmg: 16, kind: 'water' }); } } },
        { id: 'orbs', w: 1.5, min: 4, a: { ...A.orbFan, name: 'souls', ranged: { kind: 'soul', speed: 6, r: 0.3, dmg: 12, life: 3.4, fan: 3 + p, spread: deg(20), homing: 0.8, reflect: true } } },
      ];
      if (p >= 2) m.push({ id: 'drown', w: 0.8, cd: 15, run: (w, e) => { summon(w, e, 'hushed', 2, 2, 5); summon(w, e, 'acolyte', 1, 2, 7); e.ai.cd = 1; e.state = 'roar'; e.t = 0.4; e.anim = 'roar'; e.animT = 0; } });
      return m;
    },
    onPhase(w, e, p) { if (p === 3) e.speed *= 1.25; },
  },

  // District IV: the final boss at the bell. Bell-hammer, tolls that ripple outward, vanishing in the fog.
  silence: {
    phases: [0.66, 0.33], keep: 2.8, turn: 4.2,
    moves(p) {
      const m = [
        { id: 'swing', w: 3, max: 3.6, a: strike({ name: 'swing', anim: 'sweep', range: 3.6, arc: deg(200), windup: 0.6, active: 0.76, dur: 1.3, dmg: 22 }) },
        { id: 'toll', w: 2, max: 4, a: strike({ name: 'toll', anim: 'slam', shape: 'circle', offset: 1.6, radius: 2.2, windup: 0.8, active: 0.9, dur: 1.6, dmg: 26, tele: 'circle', onStrike: (w, e) => { ringAt(w, e, e.x + Math.sin(e.face) * 1.6, e.z + Math.cos(e.face) * 1.6, 10, { warn: 0, life: 1.3, dmg: 16, kind: 'toll' }); if (p >= 2) ringAt(w, e, e.x, e.z, 10, { warn: 0.6, life: 1.3, dmg: 16, kind: 'toll' }); } }) },
        { id: 'combo', w: 2, max: 3.2, a: strike({ name: 'combo', anim: 'fslash', range: 3.2, arc: deg(140), windup: 0.45, active: 0.56, dur: 1.6, dmg: 17, chain: { at: 0.8, windup: 1.05, active: 1.16, lunge: 4 } }) },
        { id: 'leap', w: 1.4, min: 4, cd: 6, a: { name: 'leap', anim: 'leap', dur: 1.9, windup: 0.7, active: 1.25, leap: true, shape: 'circle', offset: 0, radius: 2.6, dmg: 28, kb: 9, tele: 'circleAt', heavy: true, onStrike: (w, e) => { if (p >= 2) ringAt(w, e, e.x, e.z, 8, { warn: 0, life: 1, dmg: 14, kind: 'toll' }); } } },
      ];
      if (p >= 2) m.push({ id: 'vanish', w: 1.2, cd: 9, run: (w, e) => { e.hidden = true; e.iframes = 9; e.ai.hideT = 1.4; e.tele = null; w.emit('vanish', { e }); } });
      if (p >= 3) m.push({ id: 'storm', w: 1.2, cd: 8, a: { name: 'storm', anim: 'roar', dur: 2.2, windup: 0.7, active: 0.72, tele: 'none', onStrike: (w, e) => { const hero = w.hero; for (let i = 0; i < 7; i++) { const a = w.rand() * Math.PI * 2, r = 1 + w.rand() * 5; circleAt(w, e, hero.x + Math.sin(a) * r * (i ? 1 : 0), hero.z + Math.cos(a) * r * (i ? 1 : 0), 1.3, { warn: 0.8 + i * 0.18, dmg: 18, kind: 'lightning' }); } w.emit('storm', { e }); } } });
      return m;
    },
    hiddenThink(w, e, h) {
      e.ai.hideT -= h; e.anim = 'idle'; e.mx = 0; e.mz = 0;
      if (e.ai.hideT <= 0) {
        const hero = w.hero; const back = hero.face + Math.PI; const x = hero.x + Math.sin(back) * 2.4, z = hero.z + Math.cos(back) * 2.4;
        if (!w._blocked(x, z, e.r)) { e.x = x; e.z = z; }
        e.hidden = false; e.iframes = 0; e.face = angTo(e, hero); w.emit('appear', { e });
        w.foeAttack(e, strike({ name: 'ambush', anim: 'fslash', range: 3.2, arc: deg(150), windup: 0.55, active: 0.66, dur: 1.2, dmg: 24 }));
      }
    },
    onPhase(w, e, p) { if (p === 2) summon(w, e, 'warden', 2, 3, 5); if (p === 3) { e.speed *= 1.2; w.emit('storm', { e }); } },
  },
};
