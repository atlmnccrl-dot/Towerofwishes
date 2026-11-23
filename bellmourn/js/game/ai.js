// How foes and bosses think. Pure logic on top of the World in sim.js.
import { ATTACKS as A } from './defs.js';
import { angDiff, angTo, dist, turn } from './sim.js';
import { UNIT_AI } from './units.js';
import { BOSS_AI2, quick } from './bosses2.js';
import { bossPlan, ascendDef } from './bosses4.js'; // Ascended forms, the wheel's true form, entrances

const deg = (d) => (d * Math.PI) / 180;

export function steer(w, e, ang) {
  // try the direct heading, then fan out around obstacles
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
    const a = ang + off * (e.ai.strafeDir || 1); const px = e.x + Math.sin(a) * 0.9, pz = e.z + Math.cos(a) * 0.9;
    if (!w._blocked(px, pz, e.r * 0.9)) return a;
  }
  return ang;
}

export function pick(w, list) {
  const tot = list.reduce((s, o) => s + o.w, 0); let r = w.rand() * tot;
  for (const o of list) { r -= o.w; if (r <= 0) return o; }
  return list[list.length - 1];
}

export function thinkFoe(w, e, h) {
  if (UNIT_AI[e.type] && UNIT_AI[e.type](w, e, h) !== false) return; // units with their own behaviour
  const hero = w.hero; const D = e.def;
  if (!hero || hero.dead) { e.anim = 'idle'; return; }
  const d = dist(e, hero); const ang = angTo(e, hero);
  if (!e.ai.aggro) {
    if ((d < D.aggro && w.sees(e, hero)) || d < 3) { e.ai.aggro = true; w.emit('aggro', { e }); }
    else {
      const hm = e.ai.home; const dh = hm ? Math.hypot(hm.x - e.x, hm.z - e.z) : 0;
      if (dh > 1) { const a = steer(w, e, Math.atan2(hm.x - e.x, hm.z - e.z)); e.mx = Math.sin(a); e.mz = Math.cos(a); e.moveSpeed = e.speed * 0.5; e.face = turn(e.face, a, 5 * h); e.anim = 'walk'; }
      else e.anim = 'idle';
      return;
    }
  }
  // lose interest when the hero is far away or out of reach for a while (stops endless 'combat')
  e.ai.seeT = (e.ai.seeT || 0) - h; if (e.ai.seeT <= 0) { e.ai.seeT = 0.3; e.ai.sees = w.sees(e, hero); }
  const reachable = e.ai.sees;
  e.ai.lost = (d > D.aggro * 1.7 || (!reachable && d > 6)) ? (e.ai.lost || 0) + h : 0;
  if (e.ai.lost > 4 && !e.ai.locked) { e.ai.aggro = false; e.ai.lost = 0; w.emit('calm', { e }); e.anim = 'idle'; return; }
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

export function blink(w, e, hero) {
  for (let i = 0; i < 12; i++) {
    const a = w.rand() * Math.PI * 2; const r = 5.5 + w.rand() * 2.5;
    const x = hero.x + Math.sin(a) * r, z = hero.z + Math.cos(a) * r;
    const [bx0, bz0, bx1, bz1] = w.bounds;
    if (x < bx0 + 1 || x > bx1 - 1 || z < bz0 + 1 || z > bz1 - 1 || w._blocked(x, z, 0.6) || !w.clear(hero, { x, z })) continue;
    w.emit('blink', { e, fx: e.x, fz: e.z, x, z }); e.x = x; e.z = z; e.ai.blinkCd = 3.5; e.ai.cd = Math.max(e.ai.cd, 0.5); return;
  }
  e.ai.blinkCd = 1;
}

// ------------------------------------------------------------------ bosses
// Each boss: phases by health, a move list per phase. Moves are attack defs (melee or ranged, using
// the World's windup/telegraph/strike machinery) plus scripted extras through onStrike.
export function thinkBoss(w, e, h) {
  if (e.entering) return; // its entrance (bosses4.js bossEntrance) places and poses it
  const hero = w.hero; if (!hero || hero.dead) { e.anim = 'idle'; return; }
  const B = BOSS_AI[e.type] || BOSS_AI2[e.type];
  // the plan: its own phases and moves, or its Ascended form's (e.ascended), or the wheel's true form
  if (e.ascended && !e.def.ascended) ascendDef(e);
  const P = bossPlan(e, B);
  if (B.tick) B.tick(w, e, h);
  // phase changes
  const frac = e.hp / e.maxHp;
  const target = 1 + P.phases.filter((p) => frac <= p).length; // phases: [0.66, 0.33] → 2 below 66%, 3 below 33%
  if (target > e.phase) {
    e.phase++; // one phase at a time, so no phase's onPhase is skipped
    e.state = 'roar'; e.t = 0; e.anim = 'roar'; e.animT = 0; e.iframes = 1.4; e.tele = null; e.ai.chan = null;
    w.emit('phase', { e, phase: e.phase }); w.emit('shake', { amt: 0.6 }); w.slow(0.6, 0.4);
    if (P.onPhase) P.onPhase(w, e, e.phase);
    return;
  }
  if (e.state === 'roar') { if (e.t < 1.3) return; e.state = 'idle'; e.anim = 'idle'; e.ai.cd = 0.4; }
  // a channelled rite (bosses3.js): the boss stands and works it out over time; B.channel returns false when done
  if (e.ai.chan && B.channel) { if (B.channel(w, e, h) !== false) return; e.ai.chan = null; e.anim = 'idle'; e.animT = 0; }
  if (e.hidden) { if (B.hiddenThink) return B.hiddenThink(w, e, h); }
  const d = dist(e, hero); const ang = angTo(e, hero);
  e.face = turn(e.face, ang, (B.turn || 4) * h);
  e.ai.cd -= h;
  if (e.ai.cd <= 0 && Math.abs(angDiff(e.face, ang)) < 0.8) {
    const list = P.moves(e.phase).filter((m) => d >= (m.min ?? 0) && d <= (m.max ?? 99) && (!m.cd || (e.ai['cd_' + m.id] || 0) <= w.t));
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
export function ringAt(w, e, x, z, r1, o = {}) { return w.addHazard({ shape: 'ring', x, z, r0: o.r0 ?? 0.6, r1, warn: o.warn ?? 0.5, life: o.life ?? 1.2, dmg: (o.dmg ?? 16) * e.dmgMul, src: e, kind: o.kind || 'shock', kb: 6 }); }
export function circleAt(w, e, x, z, r, o = {}) { return w.addHazard({ shape: 'circle', x, z, r, warn: o.warn ?? 0.9, life: o.life ?? 0.25, dmg: (o.dmg ?? 18) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 7 }); }
export function summon(w, e, type, n, tier, radius = 4) {
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 8; k++) {
      const a = w.rand() * Math.PI * 2; const x = e.x + Math.sin(a) * radius, z = e.z + Math.cos(a) * radius;
      if (!w._blocked(x, z, 0.6) && w.clear(e, { x, z })) { const f = w.spawnFoe(type, x, z, { tier, aggro: true }); f.ai.locked = true; break; }
    }
  }
  w.emit('summon', { e });
}

export const strike = (o) => ({ dur: 1.2, windup: 0.6, active: 0.75, range: 2.5, arc: deg(140), dmg: 18, kb: 6, lunge: 2.5, tele: 'arc', heavy: true, ...o });

// ------------------------------------------------------------------ world hooks and props (shared with bosses5.js)
// hookWorld5(w): installed the first time a boss that needs it thinks. It runs, every simulation step and
// whatever state the boss is in (winding up, staggered, hidden), the actions a boss scheduled with later()
// (a cage that lands, wax that hardens, a cut that falls) and prunes props that ended.
export function hookWorld5(w) {
  if (w._b5) return; w._b5 = true; w._later = [];
  // props go into this world's own list: the level's list is shared by every world made on it (a retry), and a
  // prop must never outlive its world
  w.solids = w.solids.slice();
  const heroStep = w._hero;
  w._hero = function (e, h) { tick5(this); heroStep.call(this, e, h); };
}
function tick5(w) {
  const q = w._later;
  if (q.length) {
    const due = q.filter((a) => a.at <= w.t); if (due.length) { w._later = q.filter((a) => a.at > w.t); for (const a of due) if (!a.src || !a.src.dead || a.always) a.fn(w); }
  }
  if (w.t >= (w._pruneT || 0)) { w._pruneT = w.t + 0.5; for (let i = w.solids.length - 1; i >= 0; i--) { const s = w.solids[i]; if (s.bm && s.off) w.solids.splice(i, 1); } }
}
// run fn(w) `delay` seconds from now (dropped if src has died, unless o.always)
export function later(w, src, delay, fn, o = {}) { hookWorld5(w); w._later.push({ at: w.t + delay, fn, src, always: !!o.always }); }
// A prop the boss leaves standing (a cage, a wall of hardened wax): a round solid that blocks walking, blows
// and projectiles, gone after `life` seconds or when the boss falls (its `off` is read by every collision
// test, so nothing has to remove it in time), and a mark that fx.js draws as the prop.
export function prop(w, e, x, z, r, life, kind, h = 1.8) {
  hookWorld5(w); const until = w.t + life;
  const s = { x, z, r, h, bm: kind, src: e, get off() { return w.t >= until || !!e.dead; } };
  w.solids.push(s);
  const hero = w.hero; const m = w.addHazard({ shape: 'circle', x, z, r, warn: 0, dmg: 0, t: 0.06, life: life + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true, kind, src: e, prop: s });
  s.mark = m; return s;
}
export const propsOf = (w, e, kind) => w.solids.filter((s) => s.bm === kind && s.src === e && !s.off);
// a point inside the arena, off the solids, not on the hero; null when there is none
export function spotFree(w, x, z, r = 0.5) {
  const [x0, z0, x1, z1] = w.bounds;
  if (x < x0 + r + 0.6 || x > x1 - r - 0.6 || z < z0 + r + 0.6 || z > z1 - r - 0.6 || w._blocked(x, z, r)) return false;
  return true;
}

// The Gaoler's cage: marked where it will fall; caught under it, you are shut in for a moment (a dash breaks
// the lock); missed, it stands where it fell, bars and all, for a few seconds.
function cage(w, e, x, z, o) {
  circleAt(w, e, x, z, o.r || 0.95, { warn: o.warn, life: 0.2, dmg: o.dmg, kind: 'cage', kb: 3 });
  later(w, e, o.warn, (w2) => {
    const hero = w2.hero; w2.emit('cageFall', { e, x, z });
    if (hero && !hero.dead && Math.hypot(hero.x - x, hero.z - z) < (o.r || 0.95) + hero.r) {
      if (hero.state !== 'dash') { w2.applyStatus(hero, 'root', { dur: o.hold || 0.9 }); if (hero.status.root) hero.status.root.t = Math.min(hero.status.root.t, o.hold || 0.9); w2.addHazard({ shape: 'circle', x: hero.x, z: hero.z, r: 0.8, warn: 0, dmg: 0, t: 0.06, life: (o.hold || 0.9) + 0.06, hitSet: new Set([hero.id]), vis: true, kind: 'cagehold', src: e }); }
      return;
    }
    if (propsOf(w2, e, 'cagewall').length < (o.cap || 6) && spotFree(w2, x, z, 0.6)) prop(w2, e, x, z, 0.62, o.stay || 7, 'cagewall', 2.2);
  });
}
// a hook flung down a line; whoever it bites is hauled in to a stride in front of him
function gaolerHook(w, e, range, dmg) {
  const hero = w.hero; const caught = hero && !hero.dead && w._inShape(e, { shape: 'line', range, width: 1.1 }, hero) && w.clear(e, hero);
  const hit = caught && w._damage(e, hero, dmg * e.dmgMul, { kb: 0.01, heavy: true }) === true;
  w.emit('hook', { e, x: hit ? hero.x : e.x + Math.sin(e.face) * range, z: hit ? hero.z : e.z + Math.cos(e.face) * range, hit, chain: true });
  if (!hit) return false;
  const a = angTo(hero, e); const d = Math.max(0, dist(hero, e) - e.r - hero.r - 1.0); const kb = d * 5.5;
  hero.kbx = Math.sin(a) * kb; hero.kbz = Math.cos(a) * kb;
  return true;
}
// wax poured where you stand; a moment later it hardens into a wall (cover from her fire, and a cage of her making)
function pour(w, e, x, z, o) {
  circleAt(w, e, x, z, 1.25, { warn: o.warn, life: 0.6, dmg: o.dmg, kind: 'wax', kb: 3 });
  later(w, e, o.warn + 1.3, (w2) => {
    if (propsOf(w2, e, 'waxwall').length >= (o.cap || 6) || !spotFree(w2, x, z, 0.75)) return;
    const hero = w2.hero; if (hero && Math.hypot(hero.x - x, hero.z - z) < 0.75 + hero.r + 0.1) return; // never sealed inside it
    prop(w2, e, x, z, 0.72, o.stay || 8, 'waxwall', 1.7); w2.emit('harden', { e, x, z });
  });
}

const TAU = Math.PI * 2;

export const BOSS_AI = {
  // District I (PROPOSAL, reworked): the Gaoler, a hunched giant with a gibbet cage chained to his back, a
  // meat-hook on a chain in one fist and the great ring of the gaol's keys in the other. His rhythm is the
  // gaol's: he catches you (the hook, chains that drag), he shuts you in (cages drop from the dark above and
  // stay standing, so the yard fills with bars), then he comes down on you. Below 60% he tears the gibbet off
  // his back and swings it; below 25%, lockdown: a ring of cages round you and the hook right after.
  gaoler: {
    phases: [0.6, 0.25], keep: 2.8, turn: 3.4,
    tick(w) { hookWorld5(w); },
    moves(p) {
      const q = p >= 3 ? 0.88 : 1;
      const m = [
        // the key ring swung like a flail
        { id: 'keys', w: 2.6, max: 3.6, a: quick(strike({ name: 'keys', anim: 'sweep', range: 3.5, arc: deg(220), windup: 0.75, active: 0.9, dur: 1.45, dmg: 20, kb: 7, lunge: 1.4 }), q) },
        // the keys, overhand and back: two blows
        { id: 'maul', w: 2.2, max: 3.1, a: quick(strike({ name: 'maul', anim: 'fslash', range: 3.0, arc: deg(130), windup: 0.6, active: 0.7, dur: 1.75, dmg: 17, kb: 6, lunge: 2.4, chain: { at: 0.95, windup: 1.25, active: 1.36, lunge: 3 } }), q) },
        // the hook: caught, you are hauled in, a cage falls where you land and the keys come down
        { id: 'hook', w: 2, min: 3, max: 10, cd: p >= 3 ? 3.5 : 4.5, a: { name: 'hook', anim: 'fthrust', shape: 'line', range: 10, width: 1.0, windup: p >= 3 ? 0.75 : 0.85, active: 0.9, dur: 1.25, dmg: 0, lunge: 0, tele: 'line', turn: 3, heavy: true, onStrike: (w, e) => {
          if (!gaolerHook(w, e, 10, 9)) return;
          const fx = e.x + Math.sin(e.face) * (e.r + 1.5), fz = e.z + Math.cos(e.face) * (e.r + 1.5);
          cage(w, e, fx, fz, { warn: 0.8, dmg: 10, hold: 0.8 });
          w.foeAttack(e, strike({ name: 'keyslam', anim: 'slam', shape: 'circle', offset: 1.6, radius: 1.7, windup: 0.95, active: 1.02, dur: 1.6, dmg: 19, kb: 8, lunge: 0.3, tele: 'circle' }));
        } } },
        // cages from the dark above: the first right where you stand
        { id: 'cages', w: 1.8, cd: 5, a: { name: 'cages', anim: 'cast', dur: 1.5, windup: 0.55, active: 0.57, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
          const h = w.hero; const n = 2 + p;
          for (let i = 0; i < n; i++) { const a = w.rand() * TAU, r = i ? 2.2 + w.rand() * 1.8 : 0; const x = h.x + Math.sin(a) * r, z = h.z + Math.cos(a) * r; if (i && !spotFree(w, x, z, 0.6)) continue; cage(w, e, x, z, { warn: 1.0 + i * 0.16, dmg: 13 }); }
          w.emit('chains', { e });
        } } },
        // chains hurled across the yard: they lie taut for a moment and drag whoever touches them to him
        { id: 'chains', w: 1.6, min: 2.5, cd: 5.5, a: { name: 'chains', anim: 'sweep', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
          const a0 = angTo(e, w.hero); const offs = p >= 2 ? [-0.55, -0.18, 0.18, 0.55] : [-0.45, 0, 0.45];
          for (const o of offs) w.addHazard({ shape: 'line', x: e.x, z: e.z, face: a0 + o, len: 11, width: 0.7, warn: 0.8, life: 0.9, dmg: 8 * e.dmgMul, src: e, kind: 'chain', kb: -7 });
        } } },
        // the stamp of a boot that shakes the yard
        { id: 'stomp', w: 2.1, max: 3.0, cd: 3, a: strike({ name: 'stomp', anim: 'slam', shape: 'circle', offset: 0.6, radius: 2.5, windup: 0.85, active: 0.95, dur: 1.6, dmg: 22, kb: 8, lunge: 0, tele: 'circle', onStrike: (w, e) => ringAt(w, e, e.x, e.z, 7, { warn: 0.05, life: 1.0, dmg: 10, kind: 'shock' }) }) },
        { id: 'charge', w: 1.3, min: 5, max: 15, cd: 6, a: strike({ name: 'charge', anim: 'charge', shape: 'line', range: 9, width: 1.8, windup: 0.9, active: 1.55, dur: 2.0, dmg: 21, lunge: 12.5, lungeT: [0.9, 1.5], tele: 'line', teleRange: 10, turn: 2.4 }) },
      ];
      if (p >= 2) {
        // the gibbet torn off his back and swung round on its chain
        m.push({ id: 'gibbet', w: 1.5, max: 4.6, cd: 6, a: strike({ name: 'gibbet', anim: 'spin', shape: 'circle', offset: 0, radius: 4.0, windup: 1.0, active: 1.3, dur: 2.0, dmg: 20, kb: 9, lunge: 0, tele: 'circle', onStrike: (w, e) => ringAt(w, e, e.x, e.z, 8, { warn: 0.25, life: 1.1, dmg: 10, kind: 'shock' }) }) });
        // lockdown: a ring of cages round you with one way out
        m.push({ id: 'lockdown', w: 1.1, cd: 12, a: { name: 'lockdown', anim: 'roar', dur: 1.7, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
          const h = w.hero; const n = 9; const gap = Math.floor(w.rand() * n);
          for (let i = 0; i < n; i++) { if (i === gap || (p >= 3 ? false : i === (gap + 1) % n)) continue; const a = i / n * TAU; const x = h.x + Math.sin(a) * 3.3, z = h.z + Math.cos(a) * 3.3; if (spotFree(w, x, z, 0.6)) cage(w, e, x, z, { warn: 1.1, dmg: 12, stay: 6, cap: 12 }); }
        } } });
      }
      return m;
    },
    onPhase(w, e, p) { if (p === 2) { summon(w, e, 'hushed', 2, 0, 5); e.speed *= 1.12; w.emit('gibbet', { e }); } if (p === 3) e.speed *= 1.1; },
  },

  // District II (PROPOSAL, reworked): Mother Tallow floats over the market, a crown of a hundred candles on her
  // head and two more arms holding tapers, her body run down into a skirt of wax that never touches the
  // stones. She pours wax that hardens into walls (cover from her fire, or a trap), throws fire, glides. Her
  // rhythm is light and dark: below 60% she snuffs every candle, the square goes black and only drifting
  // wicks hunt you, then she flares back somewhere else. Below 30% her walls catch fire.
  tallow: {
    phases: [0.6, 0.3], keep: 6, turn: 5,
    tick(w, e) { hookWorld5(w); e.dark = 0; },
    moves(p) {
      const m = [
        { id: 'flames', w: 2.6, min: 2.5, a: { ...A.orbFan, name: 'flames', anim: 'cast', dur: 1.3, windup: 0.65, active: 0.67, ranged: { kind: 'flame', speed: 6.8, r: 0.32, dmg: 12, life: 3.2, fan: p >= 2 ? 5 : 3, spread: deg(17), reflect: true } } },
        // wax poured round you; it hardens into walls a moment later
        { id: 'pour', w: 2.2, cd: 4.5, a: { name: 'pour', anim: 'cast', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
          const h = w.hero; const n = p >= 2 ? 4 : 3;
          for (let i = 0; i < n; i++) { const a = w.rand() * TAU, r = i ? 2.0 + w.rand() * 2.2 : 0; const x = h.x + Math.sin(a) * r, z = h.z + Math.cos(a) * r; if (spotFree(w, x, z, 0.8)) pour(w, e, x, z, { warn: 0.85 + i * 0.12, dmg: 12 }); }
        } } },
        { id: 'wick', w: 1.8, a: { name: 'wick', anim: 'cast', dur: 1.5, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, onStrike: (w, e) => { const hero = w.hero; for (let i = 0; i < (p >= 2 ? 5 : 3); i++) { const a = w.rand() * TAU, r = i ? 0.8 + w.rand() * 2.2 : 0; circleAt(w, e, hero.x + Math.sin(a) * r, hero.z + Math.cos(a) * r, 1.15, { warn: 0.9 + i * 0.15, dmg: 15, kind: 'fire' }); } } } },
        { id: 'flare', w: 1.6, max: 3.4, a: strike({ name: 'flare', anim: 'spin', shape: 'circle', offset: 0, radius: 3, windup: 0.6, active: 0.75, dur: 1.2, dmg: 15, lunge: 0, tele: 'circle' }) },
        // she glides down a lane, a trail of molten wax behind her
        { id: 'glide', w: 1.4, min: 3.5, max: 12, cd: 5, a: strike({ name: 'glide', anim: 'cast', shape: 'line', range: 2.2, width: 1.6, windup: 0.7, active: 1.2, dur: 1.6, dmg: 16, kb: 7, lunge: 12, lungeT: [0.7, 1.15], tele: 'line', teleRange: 7.5, turn: 3, onStrike: (w, e) => w.addHazard({ shape: 'line', x: e.x, z: e.z, face: e.face, len: 7, width: 1.2, warn: 0.45, life: 1.4, dmg: 8 * e.dmgMul, src: e, kind: 'wax', kb: 3 }) }) },
      ];
      if (p >= 2) {
        // the dark: every candle snuffed; she drifts unseen while wicks hunt you; then she flares back
        m.push({ id: 'snuff', w: 1.6, cd: p >= 3 ? 9 : 12, run: (w, e) => { e.hidden = true; e.iframes = 99; e.tele = null; e.dark = 1; e.ai.snuff = { t0: w.t, n: 0 }; w.emit('snuff', { e }); w.emit('vanish', { e }); } });
        m.push({ id: 'brood', w: 0.8, cd: 15, run: (w, e) => { if (w.foes().filter((f) => f.type === 'ghoul').length < 2) summon(w, e, 'ghoul', 2, 1, 5); e.ai.cd = 1; e.state = 'roar'; e.t = 0.5; e.anim = 'roar'; e.animT = 0; } });
      }
      // her walls catch fire
      if (p >= 3) m.push({ id: 'kindle', w: 1.5, cd: 7, a: { name: 'kindle', anim: 'roar', dur: 1.6, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
        const walls = propsOf(w, e, 'waxwall'); for (const s of walls) circleAt(w, e, s.x, s.z, 1.7, { warn: 0.85, life: 0.4, dmg: 15, kind: 'fire' });
        if (!walls.length) for (let i = 0; i < 3; i++) { const a = w.rand() * TAU; pour(w, e, w.hero.x + Math.sin(a) * 2.6, w.hero.z + Math.cos(a) * 2.6, { warn: 0.9, dmg: 12 }); }
      } } });
      return m;
    },
    hiddenThink(w, e, h) {
      const S = e.ai.snuff; if (!S) { e.hidden = false; e.iframes = 0; return; }
      const t = w.t - S.t0; e.anim = 'idle'; e.mx = 0; e.mz = 0; e.dark = 1; e.iframes = 99;
      // wicks drift out of the dark at you
      while (S.n < 4 && t >= 0.5 + S.n * 0.7) {
        S.n++; const hero = w.hero; const a = w.rand() * TAU; const x = hero.x + Math.sin(a) * 6.5, z = hero.z + Math.cos(a) * 6.5; const b = Math.atan2(hero.x - x, hero.z - z);
        w.projs.push({ id: w.nextId++, kind: 'wisp', team: 'foe', x, z, y: 1.2, vx: Math.sin(b) * 3.6, vz: Math.cos(b) * 3.6, r: 0.3, dmg: 11 * e.dmgMul, life: 3.6, homing: 1.1, src: e, face: b, hitSet: new Set(), status: { burn: 1 } });
      }
      if (t < 3.4) return;
      // she flares back up, away from you, and the square lights at once
      const hero = w.hero;
      for (let k = 0; k < 12; k++) { const a = w.rand() * TAU, r = 4.5 + w.rand() * 2.5; const x = hero.x + Math.sin(a) * r, z = hero.z + Math.cos(a) * r; if (spotFree(w, x, z, e.r)) { e.x = x; e.z = z; break; } }
      e.hidden = false; e.iframes = 0; e.dark = 0; e.ai.snuff = null; e.face = angTo(e, hero); w.emit('appear', { e }); w.emit('relight', { e });
      ringAt(w, e, e.x, e.z, 9, { r0: 1, warn: 0.45, life: 1.4, dmg: 13, kind: 'fire' }); e.ai.cd = 1.1;
    },
    onPhase(w, e, p) { if (p === 2) summon(w, e, 'ghoul', 2, 1, 5); if (p === 3) e.speed *= 1.15; },
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
        if (!w._blocked(x, z, e.r) && w.clear(hero, { x, z })) { e.x = x; e.z = z; }
        e.hidden = false; e.iframes = 0; e.face = angTo(e, hero); w.emit('appear', { e });
        w.foeAttack(e, strike({ name: 'ambush', anim: 'fslash', range: 3.2, arc: deg(150), windup: 0.55, active: 0.66, dur: 1.2, dmg: 24 }));
      }
    },
    onPhase(w, e, p) { if (p === 2) summon(w, e, 'warden', 2, 3, 5); if (p === 3) { e.speed *= 1.2; w.emit('storm', { e }); } },
  },
};
