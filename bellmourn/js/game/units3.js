// Act III foes: the Weeping Marsh (tier 12), the Clockwork Spire (tier 13) and the Empyrean (tier 14).
// Stats and looks (UNITS3), behaviour (UNIT_AI3), moves (UNIT_ATTACKS3), home tiers and bestiary lines,
// merged into UNITS2 / UNIT_AI2 / HOME / BESTIARY_TEXT by units2.js (and so into UNITS / UNIT_AI by
// units.js). Pure logic, no DOM, and a leaf module (it imports nothing) for the same reason as units2.js:
// import it only from units2.js.
//
// As everywhere: every blow is marked on the stones before it lands (arcs, lines, circles, rings, landing
// rings for anything lobbed or dropped from above) and the hero dashes through or steps out. The rules
// sim.js cannot express (a leech that clings and drains, a troll that regrows, a bubble of slow time, a
// halo that wards) go through hookWorld3(w), installed the first time one of these units thinks.
//
// Names, the bestiary lines and the comments describing what each one is: PROPOSAL, for the author.

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const angDiff = (a, b) => wrap(b - a);
const turn = (a, b, max) => wrap(a + Math.max(-max, Math.min(max, angDiff(a, b))));
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const S = Math.sin, C = Math.cos;
// blows that burn (a burning troll cannot regrow)
const BURNING = new Set(['fire', 'pillar', 'sun', 'lantern', 'hfire', 'wisp', 'hellfire']);

// ------------------------------------------------------------------ world hooks
//  - a time bubble (hazard kind 'bubble', a mark) slows the hero inside it to half speed (not the dash);
//  - a line hazard with sweep { a0, a1 } turns over its life (also done by units2.js; doing it twice is
//    harmless, the angle is absolute);
//  - def.beforeDeath / def.afterDeath as in units2.js (installed there too; this hook only adds its own
//    wrapper when units2.js has not).
export function hookWorld3(w) {
  if (w._u3) return; w._u3 = true;
  const heroStep = w._hero, hazards = w._hazards;
  w._hero = function (e, h) {
    lureTick(this);
    for (const f of this.ents) if (f.type === 'bogtroll' && !f.dead && f.state !== 'spawn') regrow(this, f, h); // every step, attacking or not
    heroStep.call(this, e, h);
    if (e.state === 'dash' || e.state === 'special') return;
    for (const z of this.hazards) if (z.kind === 'bubble' && z.t < z.warn + z.life && Math.hypot(e.x - z.x, e.z - z.z) < z.r) { e.moveSpeed *= 0.5; e.inBubble = true; return; }
    e.inBubble = false;
  };
  w._hazards = function (h) {
    for (const z of this.hazards) if (z.sweep) { const k = clamp01((z.t + h - z.warn) / z.life); z.face = z.sweep.a0 + (z.sweep.a1 - z.sweep.a0) * k; }
    return hazards.call(this, h);
  };
  if (!w._u2) {
    const kill = w._kill;
    w._kill = function (e, src, o = {}) {
      const D = e.def;
      if (D && D.beforeDeath && D.beforeDeath(this, e, src, o)) return 'rise';
      const r = kill.call(this, e, src, o);
      if (D && D.afterDeath) D.afterDeath(this, e, src, o);
      return r;
    };
    w._u2 = 'u3';
  }
}

// ------------------------------------------------------------------ helpers (copies: this module is a leaf)
function steer(w, e, ang) {
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
    const a = ang + off * (e.ai.strafeDir || 1); const px = e.x + S(a) * 0.9, pz = e.z + C(a) * 0.9;
    if (!w._blocked(px, pz, e.r * 0.9)) return a;
  }
  return ang;
}
function free(w, x, z, r) {
  const [x0, z0, x1, z1] = w.bounds;
  if (x < x0 + r + 0.3 || x > x1 - r - 0.3 || z < z0 + r + 0.3 || z > z1 - r - 0.3) return null;
  return w._blocked(x, z, r) ? null : { x, z };
}
function inside(w, x, z, m = 1.0) { const [x0, z0, x1, z1] = w.bounds; return { x: Math.max(x0 + m, Math.min(x1 - m, x)), z: Math.max(z0 + m, Math.min(z1 - m, z)) }; }
function lob(w, e, tx, tz, o) {
  const a = Math.atan2(tx - e.x, tz - e.z); const sx = e.x + S(a) * (e.r + 0.3), sz = e.z + C(a) * (e.r + 0.3);
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: sx, z: sz, y: o.y ?? 1.4, vx: (tx - sx) / o.arc, vz: (tz - sz) / o.arc, r: o.size ?? 0.25, dmg: 0, life: o.arc, lob: o.arc, lobT: 0, tx, tz, face: a, hitSet: new Set(), src: e });
  return w.addHazard({ shape: 'circle', x: tx, z: tz, r: o.splash, warn: o.arc, life: o.pool ?? 0.25, dmg: o.dmg * e.dmgMul, src: e, kind: o.hazard, kb: o.kb ?? 3, status: o.status });
}
function lead(w, e, hero, t, near = 2.2) {
  const a = angTo(e, hero); const sa = S(a), ca = C(a);
  const dx = hero.x + hero.vx * t - e.x, dz = hero.z + hero.vz * t - e.z;
  const along = Math.max(near, dx * sa + dz * ca), lat = dx * ca - dz * sa;
  return free(w, e.x + sa * along + ca * lat, e.z + ca * along - sa * lat, 0.2) || { x: hero.x, z: hero.z };
}
// a mark on the stones that hurts nobody
function mark(w, o) {
  const hero = w.hero;
  return w.addHazard({ warn: 0, dmg: 0, ...o, t: 0.06, life: (o.life ?? 1) + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true });
}
const circle = (w, e, x, z, r, o) => w.addHazard({ shape: 'circle', x, z, r, warn: o.warn ?? 0.6, life: o.life ?? 0.3, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 5, status: o.status });
const ringOut = (w, e, x, z, r0, r1, o) => w.addHazard({ shape: 'ring', x, z, r0, r1, warn: o.warn ?? 0, life: o.life ?? 0.9, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'shock', kb: o.kb ?? 5, status: o.status });
const laneAt = (w, e, x, z, face, o) => w.addHazard({ shape: 'line', x, z, face, len: o.len, width: o.width ?? 1, warn: o.warn ?? 0.6, life: o.life ?? 0.3, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 5, status: o.status, sweep: o.sweep });
// how far a lane runs from (x, z) along ang before a wall or the edge
function reach(w, x, z, ang, max) {
  let s = 0, px = x, pz = z;
  for (let k = 0.5; k <= max; k += 0.5) { const cx = x + S(ang) * k, cz = z + C(ang) * k; if (!free(w, cx, cz, 0) || !w.clear({ x: px, z: pz }, { x: cx, z: cz })) break; px = cx; pz = cz; s = k; }
  return s;
}
const burst = (v) => (w, e) => { e.vx = S(e.face) * v; e.vz = C(e.face) * v; };

const move = (w, e, ang, sp) => { const a = steer(w, e, ang); e.mx = S(a); e.mz = C(a); e.moveSpeed = sp; e.anim = sp > e.speed * 0.6 ? 'run' : 'walk'; return a; };
const stand = (e, anim = 'idle') => { e.mx = 0; e.mz = 0; e.moveSpeed = 0; e.anim = anim; };
const attack = (w, e, atk) => { w.foeAttack(e, atk); w.attackers++; };
const meleeToken = (w) => w.attackers < w.tokensMax;
const rangedToken = (w) => w.attackers < w.tokensMax + 1;
const facing = (e, ang, tol = 0.5) => Math.abs(angDiff(e.face, ang)) < tol;
const haste = (e) => (e.elite === 'hasted' ? 0.6 : 1);
const busy = (w, type, e) => w.ents.some((f) => f !== e && f.type === type && !f.dead && (f.state === 'windup' || f.state === 'attack'));
const count = (w, type) => w.foes().filter((f) => f.type === type).length;
function strafeFlip(w, e, h) { const ai = e.ai; ai.flip = (ai.flip ?? 1.5 + w.rand() * 2) - h; if (ai.flip <= 0) { ai.flip = 1.5 + w.rand() * 2.5; ai.strafeDir = -(ai.strafeDir || 1); } }
function lost(w, e, h, hero, d) {
  e.ai.seeT = (e.ai.seeT || 0) - h; if (e.ai.seeT <= 0) { e.ai.seeT = 0.3; e.ai.sees = w.sees(e, hero); }
  e.ai.lost = (d > e.def.aggro * 1.7 || (!e.ai.sees && d > 6)) ? (e.ai.lost || 0) + h : 0;
  if (e.ai.lost > 4 && !e.ai.locked) { e.ai.aggro = false; e.ai.lost = 0; w.emit('calm', { e }); e.anim = 'idle'; return true; }
  return false;
}
// a leech lets go (struck, shaken off by a dash, or full)
function letGo(w, e, why) {
  const ai = e.ai; if (!ai.latched) return;
  ai.latched = null; e.leapH = 0; if (e._r) { e.r = e._r; e._r = 0; } if (e._m) { e.mass = e._m; e._m = 0; }
  const hero = w.hero; const a = hero ? angTo(hero, e) : 0; e.kbx = S(a) * 6; e.kbz = C(a) * 6;
  e.state = 'hurt'; e.t = 0; e.anim = 'hurt'; e.animT = 0; e.stun = why === 'dash' ? 0.8 : 0.5; ai.backT = 0.6; ai.cd = Math.max(ai.cd, 1.2);
  if (why === 'dash') w.emit('breakFree', { e: hero });
}
const unit = (fn) => (w, e, h) => {
  hookWorld3(w);
  const hero = w.hero;
  if (!hero || hero.dead || !e.ai.aggro) { if (e.ai.latched) letGo(w, e, 'calm'); if (e.hidden) { e.hidden = false; e.iframes = 0; } return false; }
  const d = dist(e, hero);
  if (!e.hidden && !e.ai.latched && lost(w, e, h, hero, d)) return true;
  e.ai.cd -= h;
  fn(w, e, h, hero, d, angTo(e, hero));
  return true;
};
function spotNear(w, x, z, r, rad = 0.5) {
  const p = free(w, x, z, rad); if (p) return p;
  for (const rr of [r * 0.5, r, r * 1.6]) for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const q = free(w, x + S(a) * rr, z + C(a) * rr, rad); if (q) return q; }
  return null;
}
function raiseAt(w, e, type, p) { const f = w.spawnFoe(type, p.x, p.z, { tier: e.def.tier || 0, aggro: true }); f.ai.master = e.id; f.ai.locked = !!e.ai.locked; return f; }
const summoned = (w, e, type) => w.foes().filter((f) => f.type === type && f.ai.master === e.id).length;
// a thing thrown out along a line that comes back: the out-throw is a projectile, the return is
// launched from where it stopped when its time is up (see returning())
function throwBack(w, e, kind, o) {
  const a = angTo(e, w.hero); const len = Math.max(2, reach(w, e.x, e.z, a, o.range));
  const p = { id: w.nextId++, kind, team: 'foe', x: e.x + S(a) * (e.r + 0.3), z: e.z + C(a) * (e.r + 0.3), y: o.y ?? 1.0, vx: S(a) * o.speed, vz: C(a) * o.speed, r: o.r, dmg: o.dmg * e.dmgMul, life: len / o.speed, homing: 0, src: e, face: a, hitSet: new Set(), pierce: true };
  w.projs.push(p); e.ai.back = { at: w.t + len / o.speed + (o.hang ?? 0.25), x: p.x + p.vx * p.life, z: p.z + p.vz * p.life, kind, o };
  w.emit('fire', { e, kind });
}
function returning(w, e) {
  const b = e.ai.back; if (!b || w.t < b.at) return;
  e.ai.back = null; const a = Math.atan2(e.x - b.x, e.z - b.z); const len = Math.hypot(e.x - b.x, e.z - b.z);
  w.projs.push({ id: w.nextId++, kind: b.kind, team: 'foe', x: b.x, z: b.z, y: b.o.y ?? 1.0, vx: S(a) * b.o.speed, vz: C(a) * b.o.speed, r: b.o.r, dmg: b.o.dmg * e.dmgMul, life: Math.max(0.1, len / b.o.speed - 0.15), homing: 0, src: e, face: a, hitSet: new Set() });
  // its way home is marked a moment before it comes
  w.addHazard({ shape: 'line', x: b.x, z: b.z, face: a, len, width: 0.5, warn: 0.01, life: 0.05, dmg: 0, src: e, kind: 'saw', hitSet: new Set(w.hero ? [w.hero.id] : []) });
}

// ------------------------------------------------------------------ attacks
const A = {
  // Bog Leech: a hop onto a marked circle; caught, it clings and drains (see latchOn)
  latch: { name: 'latch', anim: 'hop', dur: 1.1, windup: 0.55, active: 0.88, leap: true, shape: 'circle', offset: 0, radius: 0.85, dmg: 5, kb: 0.5, tele: 'circleAt', onStrike: (w, e) => latchOn(w, e) },
  suck: { name: 'suck', anim: 'bite', dur: 0.8, windup: 0.38, active: 0.5, range: 1.2, arc: deg(100), dmg: 6, kb: 1.5, lunge: 4, tele: 'arc' },
  // Bog Troll: a club smash that throws a ring of mud, a backhand sweep, a clod of bog hurled far
  club: { name: 'club', anim: 'slam', dur: 2.0, windup: 1.0, active: 1.1, shape: 'circle', offset: 1.7, radius: 2.1, dmg: 24, kb: 9, lunge: 0.8, tele: 'circle', heavy: true, onStrike: (w, e) => {
    const x = e.x + S(e.face) * 1.7, z = e.z + C(e.face) * 1.7; ringOut(w, e, x, z, 1.2, 6.5, { life: 1.0, dmg: 12, kind: 'bog', kb: 6, status: { poison: 1 } }); w.emit('shake', { amt: 0.5 });
  } },
  backhand: { name: 'backhand', anim: 'sweep', dur: 1.5, windup: 0.78, active: 0.93, range: 2.9, arc: deg(200), dmg: 18, kb: 8, lunge: 1, tele: 'arc', heavy: true },
  clod: { name: 'clod', anim: 'slam', dur: 1.5, windup: 0.85, active: 0.87, tele: 'none', dmg: 0, onStrike: (w, e) => { const p = lead(w, e, w.hero, 0.9, 3); lob(w, e, p.x, p.z, { kind: 'mud', arc: 1.1, splash: 1.8, pool: 3.0, dmg: 16, hazard: 'bog', kb: 6, y: 2.2, size: 0.5, status: { poison: 1 } }); w.emit('fire', { e, kind: 'boulder' }); } },
  // Will-o'-Wisp: a slow seeking flame; the lure; the flare it rushes in with, and the burst that ends it
  wispbolt: { name: 'wispbolt', anim: 'cast', dur: 1.1, windup: 0.55, active: 0.57, tele: 'ray', teleRange: 9, ranged: { kind: 'wispbolt', speed: 6.2, r: 0.28, dmg: 9, life: 3, homing: 1.1, reflect: true } },
  lure: { name: 'lure', anim: 'lure', dur: 1.9, windup: 1.6, active: 1.62, tele: 'none', dmg: 0 },
  flare: { name: 'flare', anim: 'flare', shape: 'line', range: 1.4, width: 1.2, dur: 1.15, windup: 0.5, active: 0.95, dmg: 0, lunge: 11, lungeT: [0.5, 0.9], tele: 'line', teleRange: 5.5, turn: 6 },
  burst: { name: 'burst', anim: 'swell', dur: 1.2, windup: 0.95, active: 0.97, shape: 'circle', offset: 0, radius: 2.4, tele: 'circle', dmg: 0, heavy: true, onStrike: (w, e) => {
    circle(w, e, e.x, e.z, 2.4, { warn: 0.02, life: 0.25, dmg: 24, kind: 'wispfire', kb: 9, status: { burn: 1 } }); ringOut(w, e, e.x, e.z, 2.4, 4.2, { life: 0.5, dmg: 10, kind: 'wispfire', kb: 4 });
    w.emit('shake', { amt: 0.45 }); e.ai.popAt = w.t + 0.05;
  } },
  // Marsh Witch: a hex that seeks; pools of the bog cursed round you (the drowned rise from them); a
  // grasp of weed that binds
  hexbolt: { name: 'hexbolt', anim: 'cast', dur: 1.2, windup: 0.6, active: 0.62, tele: 'ray', teleRange: 10, ranged: { kind: 'hexbolt', speed: 7, r: 0.28, dmg: 10, life: 2.8, homing: 0.9, status: { poison: 1 }, reflect: true } },
  pools: { name: 'pools', anim: 'cast', dur: 1.5, windup: 0.75, active: 0.77, tele: 'none', dmg: 0, onStrike: (w, e) => cursePools(w, e) },
  grasp: { name: 'grasp', anim: 'aim', dur: 1.3, windup: 0.8, active: 0.82, tele: 'ray', teleRange: 9, ranged: { kind: 'weed', speed: 8.5, r: 0.32, dmg: 7, life: 1.4, homing: 0.4, status: { root: 1 } } },
  raise: { name: 'raise', anim: 'cast', dur: 1.5, windup: 1.05, active: 1.07, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const p = e.ai.raiseSpot; if (p && !w._blocked(p.x, p.z, 0.4)) { raiseAt(w, e, 'drowned', p); w.emit('summon', { e }); } e.ai.raiseSpot = null;
  } },
  // the Drowned: a clumsy two-hand blow
  dslash: { name: 'dslash', anim: 'fslash', dur: 1.1, windup: 0.55, active: 0.68, range: 1.8, arc: deg(110), dmg: 11, kb: 3.5, lunge: 2.6, tele: 'arc' },
  // Brass Automaton: piston punches down a line (one, or two), a ground-pound, the fist fired off its arm
  piston: { name: 'piston', anim: 'fthrust', dur: 1.25, windup: 0.62, active: 0.78, shape: 'line', range: 3.6, width: 1.1, dmg: 20, kb: 8, lunge: 5, lungeT: [0.62, 0.78], tele: 'line', heavy: true, onStrike: burst(6) },
  piston2: { name: 'piston2', anim: 'fthrust', dur: 1.9, windup: 0.62, active: 0.78, shape: 'line', range: 3.6, width: 1.1, dmg: 17, kb: 6, lunge: 5, lungeT: [0.62, 0.78], tele: 'line', heavy: true, chain: { at: 1.0, windup: 1.38, active: 1.52, lunge: 6 } },
  pound: { name: 'pound', anim: 'slam', dur: 1.9, windup: 0.95, active: 1.05, shape: 'circle', offset: 1.2, radius: 2.2, dmg: 24, kb: 8, lunge: 0.6, tele: 'circle', heavy: true, onStrike: (w, e) => {
    const x = e.x + S(e.face) * 1.2, z = e.z + C(e.face) * 1.2; ringOut(w, e, x, z, 1.2, 7, { life: 1.0, dmg: 12, kind: 'spark', kb: 6 }); w.emit('shake', { amt: 0.5 });
  } },
  rocket: { name: 'rocket', anim: 'aim', dur: 1.6, windup: 1.0, active: 1.02, tele: 'ray', teleRange: 14, ranged: { kind: 'fist', speed: 15, r: 0.38, dmg: 18, life: 1.2 } },
  vent: { name: 'vent', anim: 'roar', dur: 1.3, windup: 0.6, active: 0.62, shape: 'circle', offset: 0, radius: 3.0, tele: 'circle', dmg: 0, heavy: true, onStrike: (w, e) => {
    circle(w, e, e.x, e.z, 3.0, { warn: 0.02, life: 1.0, dmg: 16, kind: 'steam', kb: 7, status: { burn: 1 } }); w.emit('vent', { e });
  } },
  // Gear Spider: rolls down a long marked line as a wheel; throws a sawblade that comes back; leg cuts
  roll: { name: 'roll', anim: 'roll', shape: 'line', range: 1.6, width: 1.3, dur: 1.75, windup: 0.75, active: 1.45, dmg: 17, kb: 7, lunge: 14, lungeT: [0.75, 1.4], tele: 'line', teleRange: 10, turn: 3, heavy: true, onStrike: burst(8) },
  saw: { name: 'saw', anim: 'throw', dur: 1.2, windup: 0.62, active: 0.64, tele: 'ray', teleRange: 9, dmg: 0, onStrike: (w, e) => throwBack(w, e, 'saw', { speed: 11, range: 9, r: 0.42, dmg: 12 }) },
  legs: { name: 'legs', anim: 'slice', dur: 0.9, windup: 0.42, active: 0.56, range: 1.7, arc: deg(140), dmg: 11, kb: 3, lunge: 3, tele: 'arc' },
  // Chrono Knight: a cut; a thrust whose ghost strikes the same line again; tick-tock (three marked
  // strikes round you, one after another); the bubble of slow time
  ccut: { name: 'ccut', anim: 'fslash', dur: 1.0, windup: 0.5, active: 0.62, range: 2.1, arc: deg(130), dmg: 15, kb: 4, lunge: 3.5, tele: 'arc' },
  echo: { name: 'echo', anim: 'fthrust', dur: 1.3, windup: 0.6, active: 0.76, shape: 'line', range: 3.8, width: 1.0, dmg: 16, kb: 5, lunge: 5, lungeT: [0.6, 0.76], tele: 'line', onStrike: (w, e) => {
    for (const k of [1, 2]) laneAt(w, e, e.x, e.z, e.face, { len: 4.4, width: 1.1, warn: 0.75 * k, life: 0.2, dmg: 13, kind: 'chrono', kb: 4 });
  } },
  ticktock: { name: 'ticktock', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const h = w.hero; const a0 = w.rand() * TAU;
    for (let i = 0; i < 3; i++) { const a = a0 + i * TAU / 3; const r = i ? 1.7 : 0; const p = inside(w, h.x + S(a) * r, h.z + C(a) * r); circle(w, e, p.x, p.z, 1.3, { warn: 0.8 + i * 0.45, life: 0.25, dmg: 15, kind: 'chrono', kb: 5 }); }
  } },
  bubble: { name: 'bubble', anim: 'cast', dur: 1.4, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const h = w.hero; const p = inside(w, h.x, h.z, 1.5); mark(w, { shape: 'circle', x: p.x, z: p.z, r: 3.0, life: 4.0, kind: 'bubble' }); w.emit('bubble', { e });
  } },
  // Hollow Angel: spears of light dropped on you from above; a dive down a lane; a ring of feathers
  spears: { name: 'spears', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const h = w.hero; const n = (e.ai.casts = (e.ai.casts || 0) + 1) % 3 === 0 ? 5 : 3;
    for (let i = 0; i < n; i++) { const a = w.rand() * TAU, r = i ? 1.4 + w.rand() * 2.2 : 0; const p = inside(w, h.x + S(a) * r, h.z + C(a) * r); circle(w, e, p.x, p.z, 0.95, { warn: 0.95 + i * 0.16, life: 0.3, dmg: 15, kind: 'spear', kb: 5 }); }
  } },
  adive: { name: 'adive', anim: 'charge', shape: 'line', range: 1.8, width: 1.2, dur: 1.6, windup: 0.75, active: 1.3, dmg: 18, kb: 7, lunge: 13, lungeT: [0.75, 1.25], tele: 'line', teleRange: 8.5, turn: 3, heavy: true },
  feathers: { name: 'feathers', anim: 'roar', dur: 1.5, windup: 0.85, active: 0.87, tele: 'circle', shape: 'circle', offset: 0, radius: 4.5, dmg: 0, onStrike: (w, e) => { ringOut(w, e, e.x, e.z, 0.8, 5, { life: 0.8, dmg: 14, kind: 'radiant', kb: 6 }); } },
  // Choir Mask: a chord (three beams fanned, sung one after another), a held note that sweeps, a shriek up close
  chord: { name: 'chord', anim: 'sing', dur: 1.7, windup: 0.6, active: 0.62, tele: 'none', dmg: 0 },
  hold: { name: 'hold', anim: 'sing', dur: 2.3, windup: 1.05, active: 1.9, tele: 'none', dmg: 0, turn: 0.01 },
  shriek: { name: 'shriek', anim: 'shriek', dur: 1.4, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', offset: 0, radius: 3.6, dmg: 0, onStrike: (w, e) => { ringOut(w, e, e.x, e.z, 0.6, 3.8, { life: 0.6, dmg: 13, kind: 'choir', kb: 7 }); } },
  // Gilded Knight: a halberd reap, an impaling thrust, an overhead chop that splits the floor in light,
  // and the halo thrown out and called back
  reap: { name: 'reap', anim: 'sweep', dur: 1.45, windup: 0.72, active: 0.88, range: 3.3, arc: deg(220), dmg: 20, kb: 7, lunge: 1.5, tele: 'arc', heavy: true },
  impale: { name: 'impale', anim: 'fthrust', dur: 1.3, windup: 0.66, active: 0.84, shape: 'line', range: 4.3, width: 0.9, dmg: 21, kb: 6, lunge: 6, lungeT: [0.66, 0.84], tele: 'line', onStrike: burst(6) },
  chop: { name: 'chop', anim: 'slam', dur: 1.6, windup: 0.85, active: 0.95, shape: 'line', range: 3.4, width: 1.2, dmg: 22, kb: 7, lunge: 1, tele: 'line', heavy: true, onStrike: (w, e) => {
    const L = reach(w, e.x, e.z, e.face, 9); if (L > 3.6) laneAt(w, e, e.x + S(e.face) * 3.4, e.z + C(e.face) * 3.4, e.face, { len: L - 3.4, width: 1.0, warn: 0.3, life: 0.3, dmg: 14, kind: 'radiant', kb: 5 });
  } },
  halothrow: { name: 'halothrow', anim: 'aim', dur: 1.2, windup: 0.62, active: 0.64, tele: 'ray', teleRange: 9, dmg: 0, onStrike: (w, e) => throwBack(w, e, 'halo', { speed: 10, range: 8.5, r: 0.45, dmg: 13, y: 1.4 }) },
};
export const UNIT_ATTACKS3 = A;

// ------------------------------------------------------------------ the special rules
// the leech lands on you: it clings (riding on your back), drains you and swells; a dash shakes it off,
// a blow knocks it loose, three at most cling at once and each lets go by itself after five seconds
function latchOn(w, e) {
  const h = w.hero; if (!h || h.dead || !e.hitSet.has(h.id) || h.iframes < 0.53) return;
  if (w.foes().filter((f) => f.ai.latched).length >= 3) return;
  e.ai.latched = { a: w.rand() * TAU, t: 0, tick: 0.5, hp: e.hp };
  e._r = e.r; e.r = 0.06; e._m = e.mass; e.mass = 0.01; e.tele = null;
  w.emit('latch', { e });
}
function clinging(w, e, h, hero) {
  const L = e.ai.latched; L.t += h; L.a += h * 0.4;
  stand(e, 'latch'); e.x = hero.x + S(L.a) * 0.42; e.z = hero.z + C(L.a) * 0.42; e.vx = hero.vx; e.vz = hero.vz; e.face = angTo(e, hero); e.leapH = 0.75;
  if (hero.state === 'dash') return letGo(w, e, 'dash');
  if (e.hp < L.hp) return letGo(w, e, 'hit');
  if (L.t > 5) return letGo(w, e, 'full');
  if ((L.tick -= h) <= 0) {
    L.tick += 0.5; const amt = Math.max(1, Math.round(1.3 * e.dmgMul));
    w._dotHero(hero, amt, 'bleed'); e.hp = Math.min(e.maxHp * 1.6, e.hp + amt); L.hp = e.hp; e.ai.fed = Math.min(1, (e.ai.fed || 0) + 0.12);
  }
}
// the troll regrows: after a breath without being struck it heals, unless it burns (or was burned
// lately); struck down unburned, it sinks into a mound of moss and rises once
function regrow(w, e, h) {
  const ai = e.ai; if (e.hp < (ai.lastHp ?? e.hp)) ai.hurtAt = w.t; ai.lastHp = e.hp;
  if (e.status.burn) ai.burnAt = w.t;
  if (w.t - (ai.hurtAt ?? -9) > 2.2 && w.t - (ai.burnAt ?? -99) > 4 && e.hp < e.maxHp) {
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * h); ai.lastHp = e.hp;
    if ((ai.regrowT = (ai.regrowT || 0) - h) <= 0) { ai.regrowT = 1.2; mark(w, { shape: 'circle', x: e.x, z: e.z, r: 1.2, life: 1.0, kind: 'regrow' }); }
  }
}
// three pools of the bog go foul round you (they linger and poison); the witch remembers them to raise
// the drowned and to slip away through
function cursePools(w, e) {
  const h = w.hero; const a0 = w.rand() * TAU; e.ai.pools = [];
  for (let i = 0; i < 3; i++) {
    const a = a0 + i * TAU / 3; const r = i ? 2.4 : 0.6; const p = spotNear(w, h.x + S(a) * r, h.z + C(a) * r, 1, 0.3); if (!p) continue;
    circle(w, e, p.x, p.z, 1.35, { warn: 0.9 + i * 0.2, life: 4.5, dmg: 7, kind: 'bog', kb: 2, status: { poison: 1 } });
    e.ai.pools.push({ x: p.x, z: p.z, until: w.t + 5.5 });
  }
  w.emit('fire', { e, kind: 'spit' });
}
// the choir masks sing a chord: three beams in a fan, one after another; masks close by join in
function singChord(w, e, hero) {
  const a0 = angTo(e, hero); const n = e.ai.n = (e.ai.n || 0) + 1; const wide = n % 2 ? 0.42 : 0.3;
  [-wide, 0, wide].forEach((o, i) => laneAt(w, e, e.x + S(a0 + o) * 0.5, e.z + C(a0 + o) * 0.5, a0 + o, { len: Math.max(1, reach(w, e.x, e.z, a0 + o, 11)), width: 0.85, warn: 0.75 + i * 0.22, life: 0.3, dmg: 14, kind: 'choir', kb: 4 }));
  w.emit('beam', { e });
}
function singHold(w, e, ang) {
  const dir = w.rand() < 0.5 ? -1 : 1; const half = 0.75;
  laneAt(w, e, e.x, e.z, ang - half * dir, { len: 10, width: 0.85, warn: A.hold.windup, life: 0.85, dmg: 16, kind: 'choir', kb: 5, sweep: { a0: ang - half * dir, a1: ang + half * dir } });
}

// ------------------------------------------------------------------ looks: extra parts on the humanoid rig
const looks = {
  bogtroll: (rig, part, box) => { // moss and reeds growing out of it, a mossy club, a jaw of tusks, fungus that glows
    const moss = 0x4a6a2a, reed = 0x7a8a3a, fung = 0xc8ff70;
    for (const s of ['L', 'R']) { const sx = s === 'L' ? 1 : -1; part('sh' + s, box(0.28, 0.14, 0.3), moss, 0, 0.06, 0); part('sh' + s, box(0.04, 0.3, 0.04), reed, sx * 0.06, 0.24, -0.04, { rz: -sx * 0.3 }); part('el' + s, box(0.06, 0.06, 0.06), fung, 0.06 * sx, -0.1, 0.07, { glow: 2.2 }); }
    part('chest', box(0.56, 0.16, 0.3), moss, 0, 0.3, -0.06);
    for (const [x, y] of [[-0.14, 0.38], [0.1, 0.42], [0.2, 0.34]]) part('chest', box(0.04, 0.34, 0.04), reed, x, y, -0.18, { rx: -0.4 });
    for (const sx of [-1, 1]) part('head', box(0.04, 0.1, 0.04), 0xe0d8b8, sx * 0.08, 0.02, 0.15, { rz: sx * 0.2 });
    part('chest', box(0.06, 0.06, 0.02), fung, -0.12, 0.08, 0.17, { glow: 2.2 }); part('chest', box(0.05, 0.05, 0.02), fung, 0.1, 0.18, 0.17, { glow: 2.2 });
    // the club: a drowned log with roots
    rig.weapon.add(part('haR', box(0.1, 0.1, 1.0), 0x3a2a1a, 0, -0.05, 0.4)); rig.weapon.add(part('haR', box(0.26, 0.26, 0.4), 0x2e2416, 0, -0.05, 0.95)); rig.weapon.add(part('haR', box(0.3, 0.06, 0.3), moss, 0, 0.1, 0.98));
    rig.tip.position.set(0, -0.05, 1.15); rig.bladeLen = 1.2;
  },
  marshwitch: (rig, part, box) => { // hair of weed, a crooked staff with a lantern of marsh-light, charms of bone
    const weed = 0x3a5a2a, light = 0x80ffb0;
    for (let i = -2; i <= 2; i++) part('head', box(0.05, 0.36 + (2 - Math.abs(i)) * 0.06, 0.04), weed, i * 0.06, -0.06, -0.12);
    part('head', box(0.05, 0.08, 0.06), 0xb8a888, 0, 0.12, 0.16); // a long nose
    for (let i = 0; i < 3; i++) part('chest', box(0.04, 0.07, 0.03), 0xe0d8c0, -0.1 + i * 0.1, 0.0 + (i % 2) * 0.03, 0.13);
    rig.weapon.add(part('haR', box(0.18, 0.04, 0.04), 0x2a2018, 0.06, -0.05, 1.18, { rz: 0.5 }));
    rig.weapon.add(part('haR', box(0.16, 0.2, 0.16), light, 0.1, -0.18, 1.2, { glow: 4 }));
  },
  drowned: (rig, part, box) => { // weed hanging off it, a barnacled skull, water still running out
    for (const s of ['L', 'R']) part('el' + s, box(0.03, 0.22, 0.04), 0x3a5a3a, 0.03, -0.22, -0.04, { rz: 0.15 });
    part('head', box(0.07, 0.05, 0.07), 0xd0c8b0, 0.06, 0.24, 0.06); part('chest', box(0.04, 0.4, 0.02), 0x3a5a3a, 0.1, -0.02, 0.12);
  },
  automaton: (rig, part, box) => { // a boiler on its back with a stack, piston arms, a grille face with a furnace eye
    const brass = 0xc8963a, dark = 0x4a3418, hot = 0xff9a30;
    part('chest', box(0.38, 0.5, 0.26), brass, 0, 0.2, -0.26); part('chest', box(0.12, 0.34, 0.12), dark, 0.1, 0.56, -0.3); part('chest', box(0.08, 0.04, 0.08), hot, 0.1, 0.74, -0.3, { glow: 2.4 });
    part('chest', box(0.24, 0.12, 0.03), hot, 0, 0.16, 0.16, { glow: 3 }); for (let i = -1; i <= 1; i++) part('chest', box(0.26, 0.02, 0.04), dark, 0, 0.16 + i * 0.045, 0.175);
    for (const s of ['L', 'R']) { part('sh' + s, box(0.3, 0.16, 0.3), brass, 0, 0.06, 0); part('el' + s, box(0.07, 0.36, 0.07), 0xd8d8d0, 0, -0.18, -0.08); part('ha' + s, box(0.24, 0.22, 0.24), brass, 0, -0.12, 0.02); part('ha' + s, box(0.26, 0.04, 0.26), dark, 0, -0.04, 0.02); }
    part('head', box(0.2, 0.08, 0.03), 0x1a1208, 0, 0.12, 0.13); part('head', box(0.07, 0.05, 0.02), hot, 0, 0.13, 0.145, { glow: 4 });
    for (const sx of [-1, 1]) part('head', box(0.03, 0.12, 0.2), brass, sx * 0.13, 0.2, 0);
  },
  chronoknight: (rig, part, box) => { // a clock-face shield, a pendulum on the back, hourglass pauldrons
    const bronze = 0x9a7a4a, face = 0xe8e0c8, blue = 0x60c8ff;
    part('elL', box(0.04, 0.5, 0.5), bronze, 0.12, -0.15, 0.08); part('elL', box(0.02, 0.42, 0.42), face, 0.145, -0.15, 0.08);
    part('elL', box(0.025, 0.18, 0.025), 0x1a1a20, 0.16, -0.08, 0.08); part('elL', box(0.025, 0.025, 0.14), 0x1a1a20, 0.16, -0.15, 0.13);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; part('elL', box(0.02, 0.04, 0.04), blue, 0.16, -0.15 + C(a) * 0.17, 0.08 + S(a) * 0.17, { glow: 2.4 }); }
    part('chest', box(0.04, 0.6, 0.04), bronze, 0, -0.1, -0.16); part('chest', box(0.16, 0.16, 0.05), blue, 0, -0.42, -0.16, { glow: 2 });
    for (const s of ['L', 'R']) { part('sh' + s, box(0.16, 0.06, 0.16), bronze, 0, 0.1, 0); part('sh' + s, box(0.08, 0.06, 0.08), blue, 0, 0.16, 0, { glow: 2 }); }
    part('head', box(0.2, 0.03, 0.03), blue, 0, 0.13, 0.14, { glow: 3 });
  },
  hollowangel: (rig, part, box) => { // a void for a face under a cracked halo, wings of light, a spear
    const light = 0xfff2c8, gold = 0xe8c060;
    part('head', box(0.17, 0.18, 0.02), 0x020204, 0, 0.12, 0.125);
    for (let i = 0; i < 9; i++) { if (i === 4) continue; const a = i / 9 * TAU; part('head', box(0.06, 0.03, 0.03), gold, S(a) * 0.2, 0.34 + C(a) * 0.2, -0.08, { glow: 2.6, rz: -a }); }
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) part('chest', box(0.62 - k * 0.1, 0.05, 0.03), light, sx * (0.36 - k * 0.04), 0.36 - k * 0.11, -0.18, { glow: 2.2 - k * 0.3, rz: sx * (0.55 - k * 0.3) });
    rig.weapon.add(part('haR', box(0.04, 0.04, 1.7), gold, 0, -0.05, 0.5)); rig.weapon.add(part('haR', box(0.08, 0.04, 0.34), light, 0, -0.05, 1.45, { glow: 3 }));
    rig.tip.position.set(0, -0.05, 1.6); rig.bladeLen = 1.6;
  },
  gildedknight: (rig, part, box) => { // gilded plate, a halberd, a halo behind the helm (the ward)
    const gold = 0xe8c060, white = 0xfff4d8;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; part('head', box(0.07, 0.03, 0.03), gold, S(a) * 0.24, 0.16 + C(a) * 0.24, -0.16, { glow: 2.4, rz: -a }); }
    part('head', box(0.04, 0.12, 0.28), white, 0, 0.3, -0.02); part('head', box(0.2, 0.03, 0.03), 0x101010, 0, 0.13, 0.14);
    for (const s of ['L', 'R']) part('sh' + s, box(0.26, 0.1, 0.28), gold, 0, 0.06, 0);
    part('chest', box(0.1, 0.1, 0.02), white, 0, 0.16, 0.13, { glow: 2.6, rz: Math.PI / 4 });
    rig.weapon.add(part('haR', box(0.05, 0.05, 1.9), 0x5a4a2a, 0, -0.05, 0.55)); rig.weapon.add(part('haR', box(0.04, 0.36, 0.34), gold, 0, -0.2, 1.36));
    rig.weapon.add(part('haR', box(0.04, 0.04, 0.3), white, 0, -0.05, 1.66)); rig.tip.position.set(0, -0.05, 1.8); rig.bladeLen = 1.8;
  },
};

// ------------------------------------------------------------------ stats and looks
// home: the tier where the unit first appears. summon: raised by others, never placed.
export const UNITS3 = {
  leech: {
    name: 'Bog Leech', hp: 20, poise: 99, flinch: 0, speed: 4.4, r: 0.3, mass: 0.4, aggro: 12, keep: 1.4, drop: 2, home: 12,
    attacks: [{ a: A.suck, w: 1, min: 0, max: 1.3 }],
    look: { rig: 'leech', scale: 1.7, eyes: 0xffd040, colors: { skin: 0x6a5a6a, dark: 0x4a3a4a, belly: 0xb88a7a, teeth: 0xf0e0c0, blood: 0xff2a2a } },
  },
  bogtroll: {
    name: 'Bog Troll', hp: 300, poise: 140, flinch: 0, speed: 2.0, r: 0.66, mass: 3.6, aggro: 13, keep: 2.4, armor: true, scale: 1.6, drop: 28, home: 12, hunch: true,
    attacks: [{ a: A.club, w: 1, min: 0, max: 3.3 }, { a: A.backhand, w: 1, min: 0, max: 2.8 }],
    look: { weapon: 'none', claws: 0xd0c8a0, eyes: 0xd0ff60, noHair: true, bulk: 1.6, extra: looks.bogtroll, colors: { skin: 0x5a6a44, tunic: 0x4a5a36, pants: 0x3a4628, boots: 0x2a3420, shoulder: 0x4a6a2a, glove: 0x4a5a3a, belt: 0x3a2a1a } },
    // struck down unburned, it sinks into the moss and rises once (as the mummy does)
    beforeDeath: (w, e, src, o) => {
      if (e.ai.rose || e.status.burn || BURNING.has(o.kind) || w.t - (e.ai.burnAt ?? -99) < 4) return false;
      e.ai.rose = true; e.ai.risePending = true; e.hp = Math.round(e.maxHp * 0.35);
      e.state = 'stagger'; e.t = 0; e.stagT = 2.0; e.anim = 'dieHard'; e.animT = 0; e.atk = null; e.tele = null; e.status = {}; e.poise = e.maxPoise;
      mark(w, { shape: 'circle', x: e.x, z: e.z, r: 1.4, life: 2.6, kind: 'regrow' }); w.emit('collapse', { e });
      return true;
    },
  },
  wisp: {
    name: "Will-o'-Wisp", hp: 40, poise: 99, flinch: 0, speed: 3.4, r: 0.32, mass: 0.4, aggro: 15, keep: 6, ranged: true, drop: 8, home: 12, flier: true,
    attacks: [{ a: A.wispbolt, w: 1, min: 2.5, max: 9 }],
    look: { rig: 'wisp', scale: 1, eyes: 0x103018, colors: { flame: 0x80ffc0, core: 0xe8fff0, dark: 0x2a6a50, mote: 0x60e0a0 } },
  },
  marshwitch: {
    name: 'Marsh Witch', hp: 72, poise: 22, flinch: 2, speed: 2.5, r: 0.38, mass: 0.9, aggro: 15, keep: 7, ranged: true, drop: 12, home: 12, hunch: true,
    attacks: [{ a: A.hexbolt, w: 1, min: 2.5, max: 10 }],
    look: { weapon: 'staff', orb: 0x80ffb0, hood: true, eyes: 0x80ffb0, skirt: 0x4a5a3a, extra: looks.marshwitch, colors: { skin: 0xa8b894, tunic: 0x5a6a44, pants: 0x3a4a2e, boots: 0x22281a, hood: 0x6a7a4a, glove: 0x8a9a74, belt: 0x5a4a2a } },
  },
  drowned: {
    name: 'Drowned', hp: 46, poise: 24, flinch: 2, speed: 2.4, r: 0.38, mass: 1, aggro: 13, keep: 1.4, drop: 3, home: 12, summon: true,
    attacks: [{ a: A.dslash, w: 1, min: 0, max: 1.9 }],
    look: { weapon: 'none', claws: 0xc8d0c0, eyes: 0x60ffd0, noHair: true, hood: true, extra: looks.drowned, colors: { skin: 0x7aa89a, tunic: 0x3a5e56, pants: 0x2a4440, boots: 0x18282a, hood: 0x3a5e56, glove: 0x7aa89a } },
  },
  automaton: {
    name: 'Brass Automaton', hp: 330, poise: 150, flinch: 0, speed: 2.0, r: 0.66, mass: 3.8, aggro: 13, keep: 2.6, armor: true, scale: 1.55, drop: 30, home: 13,
    attacks: [{ a: A.piston, w: 1, min: 0, max: 3.6 }, { a: A.pound, w: 1, min: 0, max: 3.2 }],
    look: { weapon: 'none', eyes: 0xffa030, mask: 0x8a6428, bulk: 1.5, noHair: true, extra: looks.automaton, colors: { skin: 0xb88a3a, tunic: 0xa87a30, pants: 0x7a5a24, boots: 0x5a4018, shoulder: 0xc8963a, glove: 0x8a6428, belt: 0x4a3418 } },
  },
  gearspider: {
    name: 'Gear Spider', hp: 82, poise: 34, flinch: 1, speed: 4.8, r: 0.5, mass: 1.2, aggro: 15, keep: 4.5, drop: 10, home: 13,
    attacks: [{ a: A.legs, w: 1, min: 0, max: 1.7 }],
    look: { rig: 'gearspider', scale: 1.45, eyes: 0xffb030, colors: { brass: 0xc8963a, dark: 0x4a3418, steel: 0xb8bcc4, blade: 0xe8ecf0, hot: 0xff9a30 } },
  },
  chronoknight: {
    name: 'Chrono Knight', hp: 150, poise: 70, flinch: 0.5, speed: 2.6, r: 0.44, mass: 1.8, aggro: 13, keep: 2, shield: true, drop: 18, home: 13,
    attacks: [{ a: A.ccut, w: 1, min: 0, max: 2.1 }],
    look: { weapon: 'sword', blade: 0xb8e8ff, bladeGlow: 0x1a4a7a, eyes: 0x80d8ff, mask: 0x8a6a40, extra: looks.chronoknight, bulk: 1.15, colors: { skin: 0x8a6a40, tunic: 0x2a3a5a, pants: 0x1e2a40, boots: 0x3a2e1e, shoulder: 0x9a7a4a, glove: 0x6a5434, belt: 0x6a5434 } },
  },
  hollowangel: {
    name: 'Hollow Angel', hp: 125, poise: 50, flinch: 0.5, speed: 3.0, r: 0.5, mass: 1.6, aggro: 15, keep: 6, ranged: true, drop: 16, home: 14, hover: true, flier: true,
    attacks: [{ a: A.feathers, w: 1, min: 0, max: 3.2 }],
    look: { weapon: 'none', eyes: 0x000000, skirt: 0xf0ead8, extra: looks.hollowangel, scale: 1.2, colors: { skin: 0xe8e0d0, tunic: 0xf4eedc, pants: 0xd8d0bc, boots: 0xc8bea8, shoulder: 0xe8c060, glove: 0xe8e0d0, belt: 0xe8c060, trim: 0xe8c060 } },
  },
  choirmask: {
    name: 'Choir Mask', hp: 70, poise: 99, flinch: 0, speed: 2.6, r: 0.45, mass: 0.8, aggro: 15, keep: 7, ranged: true, drop: 12, home: 14, flier: true,
    attacks: [{ a: A.shriek, w: 1, min: 0, max: 3.2 }],
    look: { rig: 'choirmask', scale: 1.5, eyes: 0x080406, colors: { mask: 0xf4ece0, gold: 0xe8c060, mouth: 0x1a0a10, song: 0xffb0e0, ribbon: 0xa02848 } },
  },
  gildedknight: {
    name: 'Gilded Knight', hp: 190, poise: 85, flinch: 0.5, speed: 2.5, r: 0.46, mass: 2, aggro: 13, keep: 2.2, shield: true, drop: 20, home: 14,
    attacks: [{ a: A.reap, w: 1, min: 0, max: 3.3 }],
    look: { weapon: 'none', eyes: 0xfff0b0, mask: 0xe8c060, extra: looks.gildedknight, bulk: 1.2, colors: { skin: 0xd8b050, tunic: 0xe8c060, pants: 0xc8a040, boots: 0x8a6a28, shoulder: 0xe8c060, glove: 0xb89038, belt: 0xfff4d8 } },
  },
};

// PROPOSAL: the bestiary lines, for the author to revise.
export const BESTIARY_TEXT3 = {
  leech: 'LEAPS ON AND DRINKS. DASH TO SHAKE IT OFF.',
  bogtroll: 'REGROWS AND RISES AGAIN. ONLY FIRE ENDS IT.',
  wisp: 'LURES YOU IN, THEN BURSTS. KEEP AWAY.',
  marshwitch: 'CURSES THE POOLS. THE DROWNED RISE FROM THEM.',
  drowned: 'RAISED FROM A CURSED POOL.',
  automaton: 'PISTON FISTS. WHEN IT VENTS, STRIKE.',
  gearspider: 'ROLLS DOWN A LINE. ITS SAW COMES BACK.',
  chronoknight: 'ITS BLOWS STRIKE TWICE. TIME SLOWS IN ITS BUBBLE.',
  hollowangel: 'SPEARS OF LIGHT FALL FROM ABOVE.',
  choirmask: 'SINGS BEAMS IN CHORDS. THEY JOIN IN.',
  gildedknight: 'A HALO WARDS IT. BREAK THE WARD.',
};
export const HOME3 = {}; for (const k in UNITS3) HOME3[k] = UNITS3[k].home;

// ------------------------------------------------------------------ behaviour
export const UNIT_AI3 = {
  // Swarms in on a zigzag, hops onto you from a short way off and clings (two hop at once at most).
  leech: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai;
    if (ai.latched) return clinging(w, e, h, hero);
    if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ang + Math.PI + 0.6 * (ai.strafeDir || 1), e.speed * 0.8); e.face = turn(e.face, a, 12 * h); return; }
    e.face = turn(e.face, ang, 10 * h);
    if (ai.cd <= 0 && facing(e, ang, 0.5)) {
      let hopping = 0; for (const f of w.ents) if (f.type === 'leech' && !f.dead && (f.state === 'windup' || f.state === 'attack')) hopping++;
      if (d < 1.2 && hopping < 3) { attack(w, e, A.suck); ai.backT = 0.4; return; }
      if (d >= 1.4 && d <= 3.8 && hopping < 2 && w.clear(e, hero)) { attack(w, e, A.latch); return; }
    }
    const zig = S(w.t * 6 + e.id * 1.9) * 0.7;
    if (d > 2.6 || ai.cd <= 0) move(w, e, ang + (d > 2 ? zig : 0), e.speed * (d < 1.4 ? 0.4 : 1));
    else { const slot = e.id * 2.1 + S(w.t * 0.6) * 0.5; move(w, e, Math.atan2(hero.x + S(slot) * 2.6 - e.x, hero.z + C(slot) * 2.6 - e.z) + zig * 0.4, e.speed * 0.7); }
    e.anim = 'walk';
  }),

  // Wades in slowly and regrows while left alone. Close: the club smash (a ring of mud) or a backhand.
  // Far: tears up a clod of the bog and hurls it (a foul pool where it lands).
  bogtroll: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai;
    if (ai.risePending) { ai.risePending = false; e.state = 'spawn'; e.t = 0; e.anim = 'rise'; e.animT = 0; e.iframes = 0.9; w.emit('spawn', { e }); return; }
    e.face = turn(e.face, ang, 2.3 * h);
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d <= 2.8) { attack(w, e, w.rand() < 0.5 ? A.backhand : A.club); return; }
      if (d <= 3.4) { attack(w, e, A.club); return; }
      if (d >= 4.5 && d <= 11 && (ai.throwAt ?? 0) <= w.t && ai.sees) { attack(w, e, A.clod); ai.throwAt = w.t + 6 * haste(e); return; }
    }
    if (d > 2.4) move(w, e, ang, e.speed); else stand(e);
  }),

  // Drifts out of reach and throws seeking flames. Every so often it lures: a thread of light from it
  // to you draws you in for a long breath (walk against it, or dash); then it flares at you and bursts.
  // Hurt badly, it goes straight for the burst.
  wisp: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 6 * h); ai.lureAt ??= w.t + 2.5 + w.rand() * 2;
    if (ai.popAt && w.t >= ai.popAt) { ai.popAt = 0; e.def = { ...e.def, drop: 1 }; w._kill(e, null, { burst: true }); return; }
    if (ai.luring) { ai.luring = false; ai.lureAt = w.t + 3; } // the lure was broken off
    if (ai.flared) { ai.flared = false; attack(w, e, A.burst); return; }
    const desperate = e.hp < e.maxHp * 0.4;
    if (ai.cd <= 0 && (ai.lureAt <= w.t || desperate) && d <= 9 && ai.sees && meleeToken(w)) {
      if (desperate || d < 3) { attack(w, e, A.flare); ai.flared = true; ai.lureAt = w.t + 99; return; }
      attack(w, e, A.lure); ai.luring = true; ai.lureAt = w.t + 99; mark(w, { shape: 'line', x: e.x, z: e.z, face: ang, len: d, width: 0.25, life: A.lure.windup, kind: 'lure' }); return;
    }
    if (ai.cd <= 0 && d >= 2.5 && d <= 9 && ai.sees && rangedToken(w) && facing(e, ang, 0.6)) { attack(w, e, A.wispbolt); return; }
    if (d < 4.5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 8) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.5);
    e.anim = 'walk';
  }),

  // Keeps back; hexes that seek and poison; curses three pools round you; raises the drowned from a
  // cursed pool (two at most; the pool glows first, strike her to stop it); a grasp of weed that binds;
  // and when you close in she slips away through one of her pools.
  marshwitch: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h); ai.poolAt ??= w.t + 1.5; ai.raiseAt ??= w.t + 5;
    const pools = (ai.pools || []).filter((p) => p.until > w.t);
    if (d < 2.6 && pools.length && (ai.slipAt ?? 0) <= w.t) {
      const far = pools.sort((a, b) => dist(b, hero) - dist(a, hero))[0]; const p = spotNear(w, far.x, far.z, 1, e.r);
      if (p && dist(p, hero) > 3.5) { w.emit('blink', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; ai.slipAt = w.t + 5 * haste(e); ai.cd = Math.max(ai.cd, 0.5); return; }
    }
    if (ai.cd <= 0 && ai.raiseAt <= w.t && pools.length && summoned(w, e, 'drowned') < 2 && count(w, 'drowned') < 3) {
      const p = spotNear(w, pools[0].x, pools[0].z, 1, 0.45);
      if (p) { ai.raiseSpot = p; mark(w, { shape: 'circle', x: p.x, z: p.z, r: 0.9, life: A.raise.windup, kind: 'raise' }); attack(w, e, A.raise); ai.raiseAt = w.t + 9 * haste(e); return; }
    }
    if (ai.cd <= 0 && facing(e, ang, 0.6) && ai.sees && rangedToken(w) && d >= 2.5 && d <= 10) {
      if (ai.poolAt <= w.t) { attack(w, e, A.pools); ai.poolAt = w.t + 7 * haste(e); return; }
      if (d >= 3 && (ai.graspAt ?? 0) <= w.t) { attack(w, e, A.grasp); ai.graspAt = w.t + 6 * haste(e); return; }
      attack(w, e, A.hexbolt); return;
    }
    if (d < 4.5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 9) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // Comes straight on, swings.
  drowned: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 6 * h);
    if (ai.cd <= 0 && d < 1.9 && meleeToken(w) && facing(e, ang, 0.5)) { attack(w, e, A.dslash); return; }
    if (d > (meleeToken(w) ? 1.5 : 3)) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // A brass brute. Piston punches down a marked line (one, or two in a row), a ground-pound that rolls a
  // ring of sparks out; far off it fires its fist. Every blow heats it: after the third it must vent
  // (a scalding cloud round it), then it stands open, cooling, for a long moment.
  automaton: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; ai.heat ??= 0;
    if (ai.vented) { ai.vented = false; ai.heat = 0; w._stagger(e, 2.2); w.emit('cool', { e }); return; }
    e.face = turn(e.face, ang, 2.4 * h);
    if (ai.cd <= 0 && ai.heat >= 3) { attack(w, e, A.vent); ai.vented = true; return; }
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d <= 2.6) { attack(w, e, w.rand() < 0.5 ? A.pound : A.piston2); ai.heat++; return; }
      if (d <= 3.6) { attack(w, e, A.piston); ai.heat++; return; }
      if (d >= 5 && d <= 13 && (ai.fistAt ?? 0) <= w.t && ai.sees) { attack(w, e, A.rocket); ai.fistAt = w.t + 6.5 * haste(e); ai.heat++; return; }
    }
    if (d > 2.4) move(w, e, ang, e.speed); else stand(e);
  }),

  // Skitters round at a distance; curls up and rolls at you down a long marked line; throws a sawblade
  // that flies out and comes back along its line (step off it both ways); cuts with its legs up close.
  gearspider: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; returning(w, e); strafeFlip(w, e, h); e.face = turn(e.face, ang, 8 * h);
    if (ai.cd <= 0 && facing(e, ang, 0.45)) {
      if (d < 1.8 && meleeToken(w)) { attack(w, e, A.legs); ai.backT = 0.4; return; }
      if (d >= 3 && d <= 10 && (ai.rollAt ?? 0) <= w.t && meleeToken(w) && w.clear(e, hero) && !busy(w, 'gearspider', e)) { attack(w, e, A.roll); ai.rollAt = w.t + 4.5 * haste(e); return; }
      if (d >= 3 && d <= 9 && !ai.back && (ai.sawAt ?? 0) <= w.t && ai.sees && rangedToken(w)) { attack(w, e, A.saw); ai.sawAt = w.t + 4 * haste(e); return; }
    }
    if (ai.backT > 0) { ai.backT -= h; move(w, e, ang + Math.PI + 0.6 * ai.strafeDir, e.speed); return; }
    if (d < 3) move(w, e, ang + Math.PI - 0.7 * ai.strafeDir, e.speed * 0.8);
    else if (d > 7.5) move(w, e, ang, e.speed);
    else { const around = angTo(hero, e) + ai.strafeDir * 0.7; move(w, e, Math.atan2(hero.x + S(around) * 4.8 - e.x, hero.z + C(around) * 4.8 - e.z), e.speed * 0.7); }
    e.face = turn(e.face, ang, 8 * h);
  }),

  // A knight out of time behind a clock-face shield. A cut; a thrust whose ghost strikes the same line
  // twice more; tick-tock, three marked strikes round you one after another; and a bubble of slow time
  // laid round you (you walk at half speed inside it; a dash still carries you out).
  chronoknight: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 4.5 * h);
    if (ai.cd <= 0 && facing(e, ang, 0.5)) {
      if ((ai.bubbleAt ?? w.t + 2) <= w.t && d <= 9 && rangedToken(w)) { attack(w, e, A.bubble); ai.bubbleAt = w.t + 9 * haste(e); return; }
      ai.bubbleAt ??= w.t + 2;
      if (d < 2.2 && meleeToken(w)) { attack(w, e, w.rand() < 0.6 ? A.ccut : A.echo); return; }
      if (d >= 2.4 && d <= 4.2 && meleeToken(w)) { attack(w, e, A.echo); return; }
      if (d > 4.2 && d <= 10 && (ai.tickAt ?? 0) <= w.t && rangedToken(w)) { attack(w, e, A.ticktock); ai.tickAt = w.t + 5 * haste(e); return; }
    }
    if (d > 2.1) move(w, e, ang, e.speed * (d > 5 ? 1 : 0.6)); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.3);
  }),

  // Hangs in the air on wings of light. Spears of light fall on and round you (five every third time);
  // it dives down a long marked lane; close in, a ring of feathers bursts from it.
  hollowangel: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 4 * h);
    if (ai.cd <= 0 && d < 3.2 && (ai.ringAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.feathers); ai.ringAt = w.t + 4.5 * haste(e); return; }
    if (ai.cd <= 0 && facing(e, ang, 0.5) && ai.sees) {
      if (d >= 4 && d <= 9 && (ai.diveAt ?? 0) <= w.t && meleeToken(w) && w.clear(e, hero)) { attack(w, e, A.adive); ai.diveAt = w.t + 5.5 * haste(e); return; }
      if (d >= 2.5 && d <= 11 && rangedToken(w)) { attack(w, e, A.spears); return; }
    }
    if (d < 4.5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 8.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),

  // Floats and sings. A chord: three beams fanned out, sung one after another; any mask near by that is
  // ready joins in, so their beams cross. A held note sweeps a beam across the floor. Close in, a shriek.
  choirmask: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 3.5 * h);
    if (ai.join && ai.cd <= 0.6 && e.state !== 'windup' && e.state !== 'attack') { ai.join = false; singChord(w, e, hero); attack(w, e, A.chord); ai.chordAt = w.t + 4 * haste(e); return; }
    ai.join = false;
    if (ai.cd <= 0 && d < 3 && (ai.shriekAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.shriek); ai.shriekAt = w.t + 4 * haste(e); return; }
    if (ai.cd <= 0 && d >= 2.5 && d <= 11 && ai.sees && rangedToken(w) && facing(e, ang, 0.45)) {
      if ((ai.holdAt ?? 0) <= w.t && d <= 9) { singHold(w, e, ang); attack(w, e, A.hold); ai.holdAt = w.t + 6 * haste(e); return; }
      if ((ai.chordAt ?? 0) <= w.t) {
        singChord(w, e, hero); attack(w, e, A.chord); ai.chordAt = w.t + 4 * haste(e);
        for (const f of w.foes()) if (f !== e && f.type === 'choirmask' && dist(f, e) < 9 && !f.ai.latched) f.ai.join = true;
        return;
      }
    }
    if (d < 5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 9) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),

  // Advances behind its halo (frontal blows glance off until the guard breaks). A halberd reap, an
  // impaling thrust, an overhead chop that splits the floor in light beyond it; far off it throws its
  // halo, which comes back. Its halo also wards it with a gold shield; broken, the ward returns later.
  gildedknight: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; returning(w, e); strafeFlip(w, e, h); e.face = turn(e.face, ang, 4 * h);
    if (!(e.shield > 0) && (ai.wardAt ?? w.t + 1) <= w.t) { e.shield = Math.round(e.maxHp * 0.25); ai.wardAt = w.t + 12 * haste(e); w.emit('shieldUp', { e, src: e, amt: e.shield, x: e.x, z: e.z }); }
    ai.wardAt ??= w.t + 1;
    if (ai.cd <= 0 && facing(e, ang, 0.5)) {
      if (d < 2.4 && meleeToken(w)) { attack(w, e, w.rand() < 0.55 ? A.reap : A.chop); return; }
      if (d >= 2.4 && d <= 4.4 && meleeToken(w)) { attack(w, e, A.impale); return; }
      if (d > 4.4 && d <= 9 && !ai.back && (ai.haloAt ?? 0) <= w.t && ai.sees && rangedToken(w)) { attack(w, e, A.halothrow); ai.haloAt = w.t + 5 * haste(e); return; }
    }
    if (d > 2.2) move(w, e, ang, e.speed * (d > 5 ? 1 : 0.6)); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.3);
  }),
};

// the wisp's lure: while a wisp winds up its lure, the hero is drawn toward it at a walking pace (walk
// against it, or dash); called every step from the hero hook in hookWorld3
function lureTick(w) {
  const hero = w.hero; if (!hero || hero.dead || hero.state === 'dash') return;
  for (const f of w.ents) {
    if (f.type !== 'wisp' || f.dead || f.state !== 'windup' || !f.atk || f.atk.name !== 'lure') continue;
    const a = angTo(hero, f); if (dist(hero, f) < 1.4) continue;
    hero.kbx += S(a) * 0.96; hero.kbz += C(a) * 0.96;
    const sp = Math.hypot(hero.kbx, hero.kbz); if (sp > 3.4) { hero.kbx *= 3.4 / sp; hero.kbz *= 3.4 / sp; }
  }
}
// when the lure ends the wisp flares in at once
A.lure.onStrike = (w, e) => { if (e.ai.luring) { e.ai.luring = false; e.ai.cd = 0; w.foeAttack(e, A.flare); e.ai.flared = true; } };
