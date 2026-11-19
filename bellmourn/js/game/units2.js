// Act II foes and the small ones of Act I: beasts, the dead, demons and the things beyond (UNITS2,
// UNIT_AI2, merged into UNITS / UNIT_AI by units.js), the home tier of every foe (HOME, read by
// progress.js for unitPool) and the bestiary lines. Pure logic, no DOM, and on purpose a leaf module
// (it imports nothing) so progress.js can read it without pulling in the simulation.
//
// As everywhere: every blow is marked on the stones before it lands (arcs, lines, circles, rings,
// landing rings for anything lobbed) and the hero dashes through or steps out. Things that cannot be
// shown by the rules of sim.js alone (a root that holds the hero, a slime that splits, a mummy that gets
// up again, a beam that sweeps) go through hookWorld(w), installed the first time one of these units
// thinks.

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const angDiff = (a, b) => wrap(b - a);
const turn = (a, b, max) => wrap(a + Math.max(-max, Math.min(max, angDiff(a, b))));
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const clamp01 = (k) => Math.max(0, Math.min(1, k));

// ------------------------------------------------------------------ world hooks
// Installed once per World. Kept here (not in sim.js) so the units stay self-contained:
//  - def.beforeDeath(w, e, src, o) returning true cancels a death (the mummy); def.afterDeath runs after
//    one (the slime splits);
//  - root on the hero holds them in place (a dash tears free and ends it; capped at 1.3 s);
//  - a line hazard with sweep: { a0, a1 } turns from a0 to a1 over its life (the seraph's gaze).
const BURNING = new Set(['fire', 'pillar', 'sun', 'lantern', 'hfire', 'wisp']);
export function hookWorld(w) {
  if (w._u2) return; w._u2 = true;
  const kill = w._kill, heroStep = w._hero, hazards = w._hazards;
  w._kill = function (e, src, o = {}) {
    const D = e.def;
    if (D && D.beforeDeath && D.beforeDeath(this, e, src, o)) return 'rise';
    const r = kill.call(this, e, src, o);
    if (D && D.afterDeath) D.afterDeath(this, e, src, o);
    return r;
  };
  w._hero = function (e, h) {
    heroStep.call(this, e, h);
    const s = e.status.root; if (!s) { if (e._bind) { e._bind.t = 1e9; e._bind = null; } return; }
    if (!s.capped) { s.capped = true; s.t = Math.min(s.t, 1.3); e._bind = mark(this, { shape: 'circle', x: e.x, z: e.z, r: 0.75, life: s.t, kind: 'bind' }); }
    if (e.state === 'dash') { delete e.status.root; if (e._bind) { e._bind.t = 1e9; e._bind = null; } this.emit('breakFree', { e }); return; }
    if (e.state !== 'special') { e.mx = 0; e.mz = 0; e.moveSpeed = 0; }
  };
  w._hazards = function (h) {
    for (const z of this.hazards) if (z.sweep) { const k = clamp01((z.t + h - z.warn) / z.life); z.face = z.sweep.a0 + (z.sweep.a1 - z.sweep.a0) * k; }
    return hazards.call(this, h);
  };
}

// ------------------------------------------------------------------ helpers (copies of the ones in units.js: this module is a leaf)
function steer(w, e, ang) {
  for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) {
    const a = ang + off * (e.ai.strafeDir || 1); const px = e.x + Math.sin(a) * 0.9, pz = e.z + Math.cos(a) * 0.9;
    if (!w._blocked(px, pz, e.r * 0.9)) return a;
  }
  return ang;
}
function free(w, x, z, r) {
  const [x0, z0, x1, z1] = w.bounds;
  if (x < x0 + r + 0.3 || x > x1 - r - 0.3 || z < z0 + r + 0.3 || z > z1 - r - 0.3) return null;
  return w._blocked(x, z, r) ? null : { x, z };
}
function lob(w, e, tx, tz, o) {
  const a = Math.atan2(tx - e.x, tz - e.z); const sx = e.x + Math.sin(a) * (e.r + 0.3), sz = e.z + Math.cos(a) * (e.r + 0.3);
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: sx, z: sz, y: o.y ?? 1.4, vx: (tx - sx) / o.arc, vz: (tz - sz) / o.arc, r: 0.25, dmg: 0, life: o.arc, lob: o.arc, lobT: 0, tx, tz, face: a, hitSet: new Set(), src: e });
  return w.addHazard({ shape: 'circle', x: tx, z: tz, r: o.splash, warn: o.arc, life: o.pool, dmg: o.dmg * e.dmgMul, src: e, kind: o.hazard, kb: o.kb ?? 3, status: o.status });
}
function lead(w, e, hero, t, near = 2.2) {
  const a = angTo(e, hero); const sa = Math.sin(a), ca = Math.cos(a);
  const dx = hero.x + hero.vx * t - e.x, dz = hero.z + hero.vz * t - e.z;
  const along = Math.max(near, dx * sa + dz * ca), lat = dx * ca - dz * sa;
  return free(w, e.x + sa * along + ca * lat, e.z + ca * along - sa * lat, 0.2) || { x: hero.x, z: hero.z };
}
// a mark on the stones that hurts nobody (burrow trails, sigils, a web round the hero's feet)
function mark(w, o) {
  const hero = w.hero;
  return w.addHazard({ warn: 0, dmg: 0, ...o, t: 0.06, life: (o.life ?? 1) + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true });
}
// a damaging circle (a hazard; status as { burn: 1 })
const circle = (w, e, x, z, r, o) => w.addHazard({ shape: 'circle', x, z, r, warn: o.warn ?? 0.6, life: o.life ?? 0.3, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 5, status: o.status });
const ringOut = (w, e, x, z, r0, r1, o) => w.addHazard({ shape: 'ring', x, z, r0, r1, warn: o.warn ?? 0, life: o.life ?? 0.9, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'shock', kb: o.kb ?? 5, status: o.status });
const burst = (v) => (w, e) => { e.vx = Math.sin(e.face) * v; e.vz = Math.cos(e.face) * v; };
// a melee blow that carries a status: the attack has dmg 0 (so sim.js swings nothing) and this lays a
// short hazard in the same shape the moment it strikes
function venomLine(len, width, dmg, kind, status) {
  return (w, e) => w.addHazard({ shape: 'line', x: e.x, z: e.z, face: e.face, len, width, warn: 0, life: 0.12, dmg: dmg * e.dmgMul, src: e, kind, kb: 4, status });
}
// the hero was caught by a leap that just landed: add a status
const onLand = (kind) => (w, e) => { const h = w.hero; if (h && !h.dead && e.hitSet.has(h.id)) w.applyStatus(h, kind, { dps: 5 }); };

const move = (w, e, ang, sp) => { const a = steer(w, e, ang); e.mx = Math.sin(a); e.mz = Math.cos(a); e.moveSpeed = sp; e.anim = sp > e.speed * 0.6 ? 'run' : 'walk'; return a; };
const stand = (e, anim = 'idle') => { e.mx = 0; e.mz = 0; e.moveSpeed = 0; e.anim = anim; };
const attack = (w, e, atk) => { w.foeAttack(e, atk); w.attackers++; };
const meleeToken = (w) => w.attackers < w.tokensMax;
const rangedToken = (w) => w.attackers < w.tokensMax + 1;
const facing = (e, ang, tol = 0.5) => Math.abs(angDiff(e.face, ang)) < tol;
const haste = (e) => (e.elite === 'hasted' ? 0.6 : 1);
const busy = (w, type, e) => w.ents.some((f) => f !== e && f.type === type && !f.dead && (f.state === 'windup' || f.state === 'attack'));
function strafeFlip(w, e, h) { const ai = e.ai; ai.flip = (ai.flip ?? 1.5 + w.rand() * 2) - h; if (ai.flip <= 0) { ai.flip = 1.5 + w.rand() * 2.5; ai.strafeDir = -(ai.strafeDir || 1); } }
function lost(w, e, h, hero, d) {
  e.ai.seeT = (e.ai.seeT || 0) - h; if (e.ai.seeT <= 0) { e.ai.seeT = 0.3; e.ai.sees = w.sees(e, hero); }
  e.ai.lost = (d > e.def.aggro * 1.7 || (!e.ai.sees && d > 6)) ? (e.ai.lost || 0) + h : 0;
  if (e.ai.lost > 4 && !e.ai.locked) { e.ai.aggro = false; e.ai.lost = 0; w.emit('calm', { e }); e.anim = 'idle'; return true; }
  return false;
}
// hidden (in the dark, under the sand): untargetable, sheds burns and bleeds, and all but bodiless (r tiny)
// so it pushes nobody from where it hides
function unhide(w, e, ev = 'appear') { e.hidden = false; e.iframes = 0; if (e._r) { e.r = e._r; e._r = 0; } if (ev) w.emit(ev, { e }); }
function hide(w, e) { e.hidden = true; e.iframes = 99; e.tele = null; e.status = {}; if (!e._r) { e._r = e.r; e.r = 0.05; } }
// an idle foe or a dead hero falls back to the common pattern in ai.js (which wakes it up)
const unit = (fn) => (w, e, h) => {
  hookWorld(w);
  const hero = w.hero;
  if (!hero || hero.dead || !e.ai.aggro) { if (e.hidden) { unhide(w, e); e.anim = 'idle'; e.ai.ph = e.ai.ph && 'up'; e.ai.to = null; e.ai.dig = 0; } return false; }
  const d = dist(e, hero);
  if (!e.hidden && lost(w, e, h, hero, d)) return true;
  e.ai.cd -= h;
  fn(w, e, h, hero, d, angTo(e, hero));
  return true;
};
// circle the hero at a distance, as the hounds do
function circleHero(w, e, h, hero, ring, sp) {
  const around = angTo(hero, e) + (e.ai.strafeDir || 1) * 0.6;
  const tx = hero.x + Math.sin(around) * ring, tz = hero.z + Math.cos(around) * ring;
  const a = move(w, e, Math.atan2(tx - e.x, tz - e.z), sp); e.face = turn(e.face, a, 9 * h); return a;
}
function blinkAway(w, e, hero, rmin = 5.5, rmax = 8) {
  for (let i = 0; i < 12; i++) {
    const a = w.rand() * TAU; const r = rmin + w.rand() * (rmax - rmin);
    const p = free(w, hero.x + Math.sin(a) * r, hero.z + Math.cos(a) * r, 0.6);
    if (!p || !w.clear(hero, p)) continue;
    w.emit('blink', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; e.ai.cd = Math.max(e.ai.cd, 0.5); return true;
  }
  return false;
}
// a free spot near (x, z), trying rings outward
function spotNear(w, x, z, r, rad = 0.5) {
  const p = free(w, x, z, rad); if (p) return p;
  for (const rr of [r * 0.5, r, r * 1.6]) for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const q = free(w, x + Math.sin(a) * rr, z + Math.cos(a) * rr, rad); if (q) return q; }
  return null;
}
const summoned = (w, e, type) => w.foes().filter((f) => f.type === type && f.ai.master === e.id).length;
function raiseAt(w, e, type, p, o = {}) {
  const f = w.spawnFoe(type, p.x, p.z, { tier: e.def.tier || 0, aggro: true, ...o }); f.ai.master = e.id; f.ai.locked = !!e.ai.locked; return f;
}

// ------------------------------------------------------------------ attacks
const A = {
  // Bat: a swooping dive along a short marked line
  swoop: { name: 'swoop', anim: 'dive', dur: 0.95, windup: 0.5, active: 0.78, shape: 'line', range: 1.0, width: 0.8, dmg: 6, kb: 2, lunge: 10, lungeT: [0.5, 0.78], tele: 'line', teleRange: 3.8, turn: 6, onStrike: burst(10) },
  // Drowned Crab: a quick pinch, and a wide sweep of both claws
  pinch: { name: 'pinch', anim: 'pinch', dur: 0.85, windup: 0.42, active: 0.54, range: 1.6, arc: deg(90), dmg: 9, kb: 3, lunge: 3, tele: 'arc' },
  claws: { name: 'claws', anim: 'sweep', dur: 1.35, windup: 0.7, active: 0.88, range: 2.1, arc: deg(200), dmg: 13, kb: 6, lunge: 1, tele: 'arc', heavy: true },
  // Frost Wolf: a leap onto a marked circle that chills and leaves rime; a snap up close
  pounce: { name: 'pounce', anim: 'leap', dur: 1.3, windup: 0.62, active: 0.98, leap: true, shape: 'circle', offset: 0, radius: 1.3, dmg: 13, kb: 4, tele: 'circleAt', onStrike: (w, e) => {
    onLand('frost')(w, e); circle(w, e, e.x, e.z, 1.5, { warn: 0.2, life: 1.6, dmg: 4, kind: 'frost', kb: 1, status: { frost: 1 } });
  } },
  wsnap: { name: 'wsnap', anim: 'bite', dur: 0.8, windup: 0.38, active: 0.5, range: 1.45, arc: deg(90), dmg: 9, kb: 2.5, lunge: 3, tele: 'arc' },
  // Ice Wraith: frost bolts (one, or a fan of three) and a freezing ring that rolls out from it
  frostbolt: { name: 'frostbolt', anim: 'cast', dur: 1.2, windup: 0.6, active: 0.62, tele: 'ray', teleRange: 10, ranged: { kind: 'frostbolt', speed: 9, r: 0.26, dmg: 10, life: 2.4, status: { frost: 1 }, reflect: true } },
  shardfan: { name: 'shardfan', anim: 'cast', dur: 1.35, windup: 0.72, active: 0.74, tele: 'ray', teleRange: 10, ranged: { kind: 'frostbolt', speed: 8, r: 0.24, dmg: 8, life: 2.4, fan: 3, spread: deg(17), status: { frost: 1 }, reflect: true } },
  nova: { name: 'nova', anim: 'nova', dur: 1.6, windup: 0.95, active: 0.97, tele: 'circle', shape: 'circle', offset: 0, radius: 4.6, dmg: 0, onStrike: (w, e) => {
    ringOut(w, e, e.x, e.z, 0.6, 4.8, { life: 0.8, dmg: 12, kind: 'frost', status: { frost: 1 } }); w.emit('shake', { amt: 0.25 });
  } },
  // Yeti: a slam that throws ice shards all round, a wide swipe, and an ice boulder hurled far
  yslam: { name: 'yslam', anim: 'slam', dur: 2.0, windup: 1.0, active: 1.1, shape: 'circle', offset: 1.5, radius: 2.0, dmg: 22, kb: 8, lunge: 0.8, tele: 'circle', heavy: true, onStrike: (w, e) => {
    const cx = e.x + Math.sin(e.face) * 1.5, cz = e.z + Math.cos(e.face) * 1.5; const a0 = w.rand() * TAU;
    for (let i = 0; i < 5; i++) { const a = a0 + i / 5 * TAU; const r = 3.4 + w.rand() * 1.4; const p = free(w, cx + Math.sin(a) * r, cz + Math.cos(a) * r, 0.2); if (p) lob(w, e, p.x, p.z, { kind: 'iceshard', arc: 0.75 + i * 0.07, splash: 1.0, pool: 0.4, dmg: 11, hazard: 'ice', status: { frost: 1 } }); }
    w.emit('shake', { amt: 0.5 });
  } },
  yswipe: { name: 'yswipe', anim: 'sweep', dur: 1.5, windup: 0.78, active: 0.93, range: 2.6, arc: deg(190), dmg: 17, kb: 7, lunge: 1, tele: 'arc', heavy: true },
  boulder: { name: 'boulder', anim: 'slam', dur: 1.5, windup: 0.85, active: 0.87, tele: 'none', dmg: 0, onStrike: (w, e) => { const p = lead(w, e, w.hero, 0.9, 3); lob(w, e, p.x, p.z, { kind: 'boulder', arc: 1.15, splash: 1.7, pool: 0.45, dmg: 18, hazard: 'ice', kb: 7, y: 2.2 }); w.emit('fire', { e, kind: 'boulder' }); } },
  // Dune Scorpion: a tail jab over its head that poisons, a pinch, and the strike it surfaces with
  sting: { name: 'sting', anim: 'sting', dur: 1.25, windup: 0.62, active: 0.76, shape: 'line', range: 2.9, width: 0.8, tele: 'line', dmg: 0, lunge: 1.5, onStrike: venomLine(2.9, 0.8, 13, 'venom', { poison: 1 }) },
  spinch: { name: 'spinch', anim: 'pinch', dur: 0.85, windup: 0.4, active: 0.52, range: 1.6, arc: deg(110), dmg: 9, kb: 3, lunge: 3, tele: 'arc' },
  // Sandworm: a bite when surfaced, and a spray of sand lobbed around the hero
  wbite: { name: 'wbite', anim: 'bite', dur: 1.3, windup: 0.7, active: 0.85, range: 2.7, arc: deg(140), dmg: 16, kb: 6, lunge: 0, tele: 'arc', heavy: true },
  wspit: { name: 'wspit', anim: 'spit', dur: 1.25, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const hero = w.hero; const p = lead(w, e, hero, 0.7, 2.5); const a = angTo(e, p); const sx = Math.cos(a), sz = -Math.sin(a);
    for (const [k, arc] of [[0, 0.8], [1.8, 0.9], [-1.8, 1.0]]) { const q = free(w, p.x + sx * k, p.z + sz * k, 0.2) || p; lob(w, e, q.x, q.z, { kind: 'sandspit', arc, splash: 1.15, pool: 0.4, dmg: 11, hazard: 'sand' }); }
    w.emit('fire', { e, kind: 'sandspit' });
  } },
  // Mummy: a raking claw, and a curse of grave-cloth that binds the hero where they stand
  mclaw: { name: 'mclaw', anim: 'fslash', dur: 1.15, windup: 0.6, active: 0.74, range: 1.8, arc: deg(120), dmg: 15, kb: 4, lunge: 2.5, tele: 'arc' },
  wrap: { name: 'wrap', anim: 'cast', dur: 1.4, windup: 0.85, active: 0.87, tele: 'ray', teleRange: 9, ranged: { kind: 'wrap', speed: 8, r: 0.32, dmg: 8, life: 1.6, homing: 0.5, status: { root: 1 } } },
  // Bonecaster: rows of bone spikes bursting up towards the hero; raises skeletons
  bones: { name: 'bones', anim: 'cast', dur: 1.3, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const hero = w.hero; const p = lead(w, e, hero, 0.5, 3); const base = angTo(e, p); const three = (e.ai.casts = (e.ai.casts || 0) + 1) % 3 === 0;
    for (const off of three ? [-0.42, 0, 0.42] : [0]) {
      const a = base + off; const n = three ? 5 : 6;
      for (let i = 0; i < n; i++) { const r = 1.6 + i * 1.15; const x = e.x + Math.sin(a) * r, z = e.z + Math.cos(a) * r; if (!free(w, x, z, 0.1)) break; circle(w, e, x, z, 0.75, { warn: 0.6 + i * 0.08, life: 0.45, dmg: three ? 11 : 14, kind: 'bone', kb: 5 }); }
    }
    w.emit('fire', { e, kind: 'bones' });
  } },
  raise: { name: 'raise', anim: 'cast', dur: 1.6, windup: 1.15, active: 1.17, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const p = e.ai.raiseSpot; if (p && !w._blocked(p.x, p.z, 0.4)) { raiseAt(w, e, 'skeleton', p); w.emit('summon', { e }); }
    e.ai.raiseSpot = null;
  } },
  // Skeleton: a plain cut
  bslash: { name: 'bslash', anim: 'fslash', dur: 1.0, windup: 0.5, active: 0.62, range: 1.75, arc: deg(110), dmg: 10, kb: 3.5, lunge: 3, tele: 'arc' },
  // Slime: a hop onto a marked circle that leaves acid, and a squash all round; the little ones hop too
  hop: { name: 'hop', anim: 'hop', dur: 1.55, windup: 0.72, active: 1.12, leap: true, shape: 'circle', offset: 0, radius: 1.45, dmg: 14, kb: 5, tele: 'circleAt', heavy: true, onStrike: (w, e) => {
    circle(w, e, e.x, e.z, 1.35, { warn: 0.25, life: 2.2, dmg: 5, kind: 'acid', kb: 1, status: { poison: 1 } });
  } },
  squish: { name: 'squish', anim: 'squish', dur: 1.1, windup: 0.55, active: 0.66, shape: 'circle', offset: 0, radius: 1.35, dmg: 10, kb: 5, tele: 'circle' },
  lhop: { name: 'lhop', anim: 'hop', dur: 1.2, windup: 0.55, active: 0.88, leap: true, shape: 'circle', offset: 0, radius: 0.95, dmg: 7, kb: 3, tele: 'circleAt' },
  // Crypt Spider: a web shot that binds, a leaping bite that poisons, fangs up close
  web: { name: 'web', anim: 'spit', dur: 1.1, windup: 0.55, active: 0.57, tele: 'ray', teleRange: 10, ranged: { kind: 'web', speed: 11, r: 0.3, dmg: 4, life: 1.4, status: { root: 1 } } },
  sbite: { name: 'sbite', anim: 'leap', dur: 1.3, windup: 0.55, active: 0.9, leap: true, shape: 'circle', offset: 0, radius: 1.2, dmg: 12, kb: 4, tele: 'circleAt', onStrike: onLand('poison') },
  fangs: { name: 'fangs', anim: 'bite', dur: 0.8, windup: 0.36, active: 0.48, range: 1.5, arc: deg(90), dmg: 9, kb: 2.5, lunge: 3, tele: 'arc' },
  // Imp: fireballs (one, or three), blinking away from blades
  fireball: { name: 'fireball', anim: 'cast', dur: 1.15, windup: 0.6, active: 0.62, tele: 'ray', teleRange: 9, ranged: { kind: 'fireball', speed: 7.5, r: 0.3, dmg: 11, life: 2.6, status: { burn: 1 }, reflect: true } },
  firefan: { name: 'firefan', anim: 'cast', dur: 1.3, windup: 0.7, active: 0.72, tele: 'ray', teleRange: 9, ranged: { kind: 'fireball', speed: 7, r: 0.28, dmg: 9, life: 2.6, fan: 3, spread: deg(18), status: { burn: 1 }, reflect: true } },
  // Hellhound: fire breath in a marked cone, a bite
  breath: { name: 'breath', anim: 'breath', dur: 1.45, windup: 0.65, active: 1.2, range: 3.8, arc: deg(64), tele: 'arc', dmg: 0, turn: 4, onStrike: (w, e) => {
    const fx = Math.sin(e.face), fz = Math.cos(e.face);
    for (const [r, rad, t] of [[1.2, 0.75, 0], [2.2, 0.95, 0.06], [3.2, 1.15, 0.12]]) circle(w, e, e.x + fx * r, e.z + fz * r, rad, { warn: t, life: 0.5, dmg: 11, kind: 'hellfire', kb: 3, status: { burn: 1 } });
    w.emit('fire', { e, kind: 'breath' });
  } },
  hbite: { name: 'hbite', anim: 'bite', dur: 0.8, windup: 0.38, active: 0.5, range: 1.5, arc: deg(90), dmg: 10, kb: 3, lunge: 3, tele: 'arc' },
  // Cultist: the ritual (interrupt it!), and a slow seeking hex
  ritual: { name: 'ritual', anim: 'cast', dur: 2.7, windup: 2.4, active: 2.42, tele: 'none', dmg: 0, onStrike: (w, e) => ritualDone(w, e) },
  hex: { name: 'hex', anim: 'cast', dur: 1.2, windup: 0.6, active: 0.62, tele: 'ray', teleRange: 10, ranged: { kind: 'hex', speed: 6.5, r: 0.28, dmg: 9, life: 3, homing: 0.9, reflect: true } },
  // Horned Demon: a charge down a long marked line, then a fire slam; a claw sweep
  dcharge: { name: 'dcharge', anim: 'charge', shape: 'line', range: 9, width: 1.8, windup: 0.85, active: 1.5, dur: 1.75, dmg: 22, kb: 9, lunge: 13, lungeT: [0.85, 1.45], tele: 'line', teleRange: 10, turn: 2.5, heavy: true },
  hslam: { name: 'hslam', anim: 'slam', dur: 1.75, windup: 0.8, active: 0.9, shape: 'circle', offset: 1.4, radius: 2.3, dmg: 24, kb: 8, lunge: 0.6, tele: 'circle', heavy: true, onStrike: (w, e) => {
    const x = e.x + Math.sin(e.face) * 1.4, z = e.z + Math.cos(e.face) * 1.4;
    ringOut(w, e, x, z, 1.0, 6.5, { life: 1.0, dmg: 13, kind: 'hellfire', kb: 6, status: { burn: 1 } });
    circle(w, e, x, z, 1.8, { warn: 0.1, life: 2.0, dmg: 6, kind: 'fire', kb: 2 }); w.emit('shake', { amt: 0.5 });
  } },
  dclaw: { name: 'dclaw', anim: 'sweep', dur: 1.45, windup: 0.72, active: 0.88, range: 2.7, arc: deg(190), dmg: 18, kb: 7, lunge: 1.2, tele: 'arc', heavy: true },
  // Seraph: a gaze that sweeps a beam across the floor (the sweep is laid when it starts), a radiant ring
  gaze: { name: 'gaze', anim: 'gaze', dur: 2.3, windup: 1.05, active: 1.9, tele: 'none', dmg: 0, turn: 0.01 },
  pulse: { name: 'pulse', anim: 'pulse', dur: 1.6, windup: 0.9, active: 0.92, tele: 'circle', shape: 'circle', offset: 0, radius: 5, dmg: 0, onStrike: (w, e) => {
    ringOut(w, e, e.x, e.z, 0.8, 5.2, { life: 0.8, dmg: 14, kind: 'holy', kb: 6 }); w.emit('shake', { amt: 0.3 });
  } },
};
export const UNIT_ATTACKS2 = A;

// the cultist's ritual completes: empower the allies around it, or (alone) call up imps
function ritualDone(w, e) {
  const ai = e.ai; if (ai.sigil) { ai.sigil.t = 1e9; ai.sigil = null; }
  const allies = w.foes().filter((f) => f !== e && !f.boss && !f.hidden && f.state !== 'spawn' && f.type !== 'cultist' && dist(f, e) < 9).sort((a, b) => dist(a, e) - dist(b, e));
  mark(w, { shape: 'circle', x: e.x, z: e.z, r: 2.6, life: 0.5, kind: 'sigilGo' });
  if (allies.length >= 2) {
    for (const f of allies.slice(0, 3)) {
      if (!f.empowered) { f.empowered = true; f.dmgMul *= 1.25; f.speed *= 1.15; }
      f.shield = Math.max(f.shield || 0, Math.round(f.maxHp * 0.25)); w.emit('shieldUp', { e: f, src: e, amt: f.shield, x: f.x, z: f.z });
    }
  } else if (summoned(w, e, 'imp') < 3) {
    for (let i = 0; i < 2; i++) { const a = e.face + (i ? 1.3 : -1.3); const p = spotNear(w, e.x + Math.sin(a) * 1.8, e.z + Math.cos(a) * 1.8, 1, 0.4); if (p) raiseAt(w, e, 'imp', p); }
    w.emit('summon', { e });
  }
}

// ------------------------------------------------------------------ looks: extra parts on the humanoid rig
const looks = {
  yeti: (rig, part, box) => { // a blue face, curled horns, shaggy shoulders and back, icicles on the arms
    const hs = 0.24;
    part('head', box(hs * 0.82, hs * 0.62, 0.04), 0x4a6a92, 0, hs * 0.42, hs / 2 + 0.02);
    for (const sx of [-1, 1]) {
      part('head', box(0.07, 0.07, 0.04), 0x90e0ff, sx * hs * 0.24, hs * 0.55, hs / 2 + 0.05, { glow: 3 });
      part('head', box(0.07, 0.22, 0.07), 0xc8c0a8, sx * hs * 0.55, hs * 0.85, -0.02, { rz: -sx * 1.0 });
      part('head', box(0.06, 0.14, 0.06), 0xc8c0a8, sx * hs * 0.85, hs * 0.62, 0.02, { rz: sx * 0.4 });
      part('sh' + (sx > 0 ? 'L' : 'R'), box(0.2, 0.12, 0.22), 0xeef2f8, 0, 0.06, -0.02);
      part('el' + (sx > 0 ? 'L' : 'R'), box(0.04, 0.12, 0.04), 0xa8e8ff, 0, -0.2, -0.07, { glow: 1.4 });
    }
    part('chest', box(0.44, 0.22, 0.12), 0xe8ecf2, 0, 0.2, -0.13);
    part('chest', box(0.3, 0.12, 0.06), 0x4a6a92, 0, 0.06, 0.13); // a bare blue chest
  },
  mummy: (rig, part, box) => { // loose grave-cloth trailing from the arms and waist, a glowing scarab
    for (const s of ['L', 'R']) { part('el' + s, box(0.03, 0.2, 0.05), 0xcabc98, 0.03, -0.24, -0.04, { rz: 0.2 }); part('sh' + s, box(0.12, 0.03, 0.12), 0x6a5e48, 0, -0.08, 0); }
    part('hips', box(0.06, 0.26, 0.03), 0xcabc98, 0.1, -0.18, 0.1, { rz: 0.15 }); part('hips', box(0.05, 0.18, 0.03), 0xcabc98, -0.12, -0.14, -0.1);
    part('chest', box(0.08, 0.08, 0.03), 0x40e0b0, 0, 0.14, 0.13, { glow: 3 });
    for (let i = 0; i < 3; i++) part('chest', box(0.38, 0.025, 0.24), 0x6a5e48, 0, 0.02 + i * 0.1, 0);
    part('head', box(0.26, 0.03, 0.26), 0x6a5e48, 0, 0.1, 0); part('head', box(0.26, 0.03, 0.26), 0x6a5e48, 0, 0.19, 0);
  },
  bonecaster: (rig, part, box) => { // a skull in the hood, ribs under the robe, bone charms
    const hs = 0.24;
    part('head', box(hs * 0.82, hs * 0.7, 0.03), 0xe8e2d0, 0, hs * 0.42, hs / 2 + 0.05);
    for (const sx of [-1, 1]) part('head', box(0.06, 0.06, 0.02), 0x80ff60, sx * hs * 0.22, hs * 0.5, hs / 2 + 0.075, { glow: 4 });
    part('head', box(0.1, 0.03, 0.02), 0x1a1612, 0, hs * 0.22, hs / 2 + 0.075);
    for (let i = 0; i < 4; i++) part('chest', box(0.3 - i * 0.03, 0.025, 0.03), 0xe0dac8, 0, 0.22 - i * 0.065, 0.13);
    for (let i = -1; i <= 1; i += 2) part('chest', box(0.05, 0.09, 0.03), 0xe0dac8, i * 0.12, -0.02, 0.13, { rz: i * 0.3 });
  },
  skeleton: (rig, part, box) => { // ribs, a dark jaw, sockets with embers
    const hs = 0.24;
    for (const sx of [-1, 1]) { part('head', box(0.07, 0.07, 0.02), 0x1a1410, sx * hs * 0.24, hs * 0.52, hs / 2 + 0.01); part('head', box(0.035, 0.035, 0.02), 0x80ff60, sx * hs * 0.24, hs * 0.52, hs / 2 + 0.025, { glow: 4 }); }
    part('head', box(0.14, 0.04, 0.02), 0x1a1410, 0, hs * 0.16, hs / 2 + 0.01);
    for (let i = 0; i < 4; i++) part('chest', box(0.3, 0.03, 0.2), i % 2 ? 0x2a2620 : 0xd8d2c0, 0, 0.24 - i * 0.07, 0);
    part('spine', box(0.06, 0.2, 0.06), 0xd8d2c0, 0, 0.04, 0);
  },
  imp: (rig, part, box) => { // bat wings, a tail with a barb, big ears
    for (const sx of [-1, 1]) {
      part('chest', box(0.42, 0.04, 0.3), 0x6a1410, sx * 0.3, 0.26, -0.18, { rz: sx * 0.5, ry: -sx * 0.3 });
      part('chest', box(0.04, 0.04, 0.36), 0x2a0806, sx * 0.48, 0.38, -0.2, { rz: sx * 0.5 });
      part('head', box(0.04, 0.12, 0.08), 0xa02818, sx * 0.15, 0.17, -0.02, { rz: -sx * 0.9 });
    }
    part('hips', box(0.04, 0.04, 0.42), 0x8a2014, 0, -0.04, -0.28, { rx: 0.5 }); part('hips', box(0.1, 0.1, 0.04), 0x2a0806, 0, -0.16, -0.48, { rx: 0.8 });
  },
  cultist: (rig, part, box) => { // a sigil burning on the chest, a ritual knife at the hip, a red stole
    part('chest', box(0.12, 0.12, 0.02), 0xff3090, 0, 0.14, 0.125, { glow: 3.5, rz: Math.PI / 4 });
    part('chest', box(0.05, 0.05, 0.02), 0x18060c, 0, 0.14, 0.135, { rz: Math.PI / 4 });
    for (const x of [0.08, -0.08]) part('chest', box(0.06, 0.4, 0.02), 0xa01830, x, 0.06, 0.12);
    part('hips', box(0.04, 0.2, 0.05), 0xc8c0b0, 0.2, -0.1, 0.05);
  },
  demon: (rig, part, box) => { // great curved horns, lava cracks, wings, a tail
    for (const sx of [-1, 1]) {
      part('head', box(0.08, 0.26, 0.08), 0x2a1a12, sx * 0.17, 0.32, 0.0, { rz: -sx * 0.7 });
      part('head', box(0.06, 0.16, 0.06), 0x1a100a, sx * 0.3, 0.46, -0.06, { rz: sx * 0.3, rx: -0.6 });
      part('chest', box(0.62, 0.05, 0.5), 0x3a0c08, sx * 0.42, 0.3, -0.22, { rz: sx * 0.45, ry: -sx * 0.25 });
      part('chest', box(0.05, 0.05, 0.56), 0x1a0606, sx * 0.68, 0.48, -0.24, { rz: sx * 0.45 });
      part('el' + (sx > 0 ? 'L' : 'R'), box(0.03, 0.18, 0.03), 0xff8020, 0.05, -0.12, 0.05, { glow: 2.6 });
    }
    part('chest', box(0.04, 0.24, 0.02), 0xff8020, 0.04, 0.12, 0.13, { glow: 2.6, rz: 0.3 }); part('chest', box(0.16, 0.03, 0.02), 0xff8020, -0.04, 0.2, 0.13, { glow: 2.6 });
    part('hips', box(0.06, 0.06, 0.5), 0x5a120c, 0, -0.02, -0.32, { rx: 0.6 }); part('hips', box(0.12, 0.12, 0.04), 0x1a0606, 0, -0.18, -0.55, { rx: 0.9 });
  },
};

// ------------------------------------------------------------------ stats and looks
// home: the tier (district) where the unit first appears. summon: raised by others, never placed.
export const UNITS2 = {
  bat: {
    name: 'Belfry Bat', hp: 12, poise: 99, flinch: 0, speed: 5.4, r: 0.28, mass: 0.3, aggro: 13, keep: 2.6, drop: 2, home: 1, flier: true,
    attacks: [{ a: A.swoop, w: 1, min: 1.5, max: 4 }],
    look: { rig: 'bat', scale: 1.4, eyes: 0xff5030, colors: { fur: 0x5a4650, dark: 0x3a2a30, wing: 0x8a3a44, bone: 0xb08a80 } },
  },
  crab: {
    name: 'Drowned Crab', hp: 60, poise: 40, flinch: 1, speed: 2.5, r: 0.46, mass: 1.5, aggro: 11, keep: 1.6, drop: 8, home: 2, shield: true,
    attacks: [{ a: A.pinch, w: 2, min: 0, max: 1.7 }, { a: A.claws, w: 1, min: 0, max: 2.2 }],
    look: { rig: 'crab', scale: 1.3, eyes: 0xffd060, colors: { shell: 0x7a3426, dark: 0x4a1e18, under: 0xc8a888, claw: 0x8a3c2a, tip: 0x2a1410, moss: 0x5a7a4a } },
  },
  frostwolf: {
    name: 'Frost Wolf', hp: 62, poise: 30, flinch: 1, speed: 6.2, r: 0.42, mass: 0.95, aggro: 15, keep: 3.8, drop: 7, home: 8,
    attacks: [{ a: A.pounce, w: 1, min: 2.4, max: 6 }, { a: A.wsnap, w: 1, min: 0, max: 1.8 }],
    look: { rig: 'frostwolf', scale: 1.2, eyes: 0x60d8ff, colors: { fur: 0xd8e0ea, dark: 0x8a9ab0, bone: 0xa8ecff, tail: 0xe8eef4 } },
  },
  icewraith: {
    name: 'Ice Wraith', hp: 52, poise: 20, flinch: 2, speed: 3.0, r: 0.38, mass: 0.7, aggro: 15, keep: 6.5, ranged: true, drop: 9, home: 8,
    attacks: [{ a: A.frostbolt, w: 1, min: 2.5, max: 11 }],
    look: { rig: 'wraith', scale: 1.1, eyes: 0x80f0ff, colors: { robe: 0xb8d4ee, dark: 0x5a7094, rag: 0xe0eefa, claw: 0xd0f4ff, ice: 0x90e8ff } },
  },
  yeti: {
    name: 'Yeti', hp: 260, poise: 130, flinch: 0, speed: 2.1, r: 0.64, mass: 3.4, aggro: 13, keep: 2.4, armor: true, scale: 1.5, drop: 24, home: 8,
    attacks: [{ a: A.yslam, w: 1, min: 0, max: 3.2 }, { a: A.yswipe, w: 1, min: 0, max: 2.6 }],
    look: { weapon: 'none', claws: 0xe8f0ff, eyes: 0x90e0ff, noHair: true, bulk: 1.6, extra: looks.yeti, colors: { skin: 0xd8dde6, tunic: 0xccd2dc, pants: 0xbcc2ce, boots: 0x9aa2b0, shoulder: 0xe6eaf0, glove: 0x8a92a4, belt: 0xb0b6c4 } },
  },
  scorpion: {
    name: 'Dune Scorpion', hp: 70, poise: 40, flinch: 1, speed: 3.6, r: 0.48, mass: 1.4, aggro: 14, keep: 2.2, drop: 9, home: 9,
    attacks: [{ a: A.sting, w: 1, min: 0, max: 2.8 }, { a: A.spinch, w: 1, min: 0, max: 1.6 }],
    look: { rig: 'scorpion', scale: 1.1, eyes: 0xff5020, colors: { shell: 0xb88a48, dark: 0x6a4a24, under: 0xd8b878, claw: 0xa07838, tip: 0x2a1a0c, sting: 0xb8ff40 } },
  },
  sandworm: {
    name: 'Sandworm', hp: 150, poise: 80, flinch: 0, speed: 4.2, r: 0.62, mass: 4, aggro: 14, keep: 3, armor: true, drop: 18, home: 9,
    attacks: [{ a: A.wbite, w: 1, min: 0, max: 2.6 }],
    look: { rig: 'worm', scale: 1, eyes: 0xff8030, colors: { skin: 0xc8946a, dark: 0xe8c89a, ring: 0x5a3422, maw: 0x2a0e0a, teeth: 0xf0e4c8, sand: 0xc8a46a } },
  },
  mummy: {
    name: 'Mummy', hp: 110, poise: 60, flinch: 0.5, speed: 1.75, r: 0.42, mass: 1.4, aggro: 12, keep: 1.6, drop: 12, home: 9, hunch: true,
    attacks: [{ a: A.mclaw, w: 1, min: 0, max: 1.8 }],
    look: { weapon: 'none', claws: 0xd8ccb0, eyes: 0x60ffb0, noHair: true, extra: looks.mummy, colors: { skin: 0xe0cfa2, tunic: 0xd4c294, pants: 0xc8b688, boots: 0xa89870, glove: 0xe0cfa2, shoulder: 0xdccb9c, belt: 0x8a7650 } },
    // rises again once, unless it was burning or the killing blow was fire
    beforeDeath: (w, e, src, o) => {
      if (e.ai.rose || e.status.burn || BURNING.has(o.kind)) return false;
      e.ai.rose = true; e.ai.risePending = true; e.hp = Math.round(e.maxHp * 0.45);
      e.state = 'stagger'; e.t = 0; e.stagT = 1.7; e.anim = 'dieHard'; e.animT = 0; e.atk = null; e.tele = null; e.status = {}; e.poise = e.maxPoise;
      mark(w, { shape: 'circle', x: e.x, z: e.z, r: 1.1, life: 2.4, kind: 'curse' }); w.emit('collapse', { e });
      return true;
    },
  },
  bonecaster: {
    name: 'Bonecaster', hp: 66, poise: 22, flinch: 2, speed: 2.4, r: 0.38, mass: 0.9, aggro: 15, keep: 7, ranged: true, drop: 11, home: 10,
    attacks: [{ a: A.bones, w: 1, min: 2.5, max: 11 }],
    look: { weapon: 'staff', orb: 0x80ff60, hood: true, eyes: 0x80ff60, skirt: 0x22201c, extra: looks.bonecaster, colors: { skin: 0xe0dccc, tunic: 0x2c2822, pants: 0x1c1a16, boots: 0x121110, hood: 0x2a2620, glove: 0xd8d2c0, belt: 0x4a3e2a } },
  },
  skeleton: {
    name: 'Skeleton', hp: 30, poise: 15, flinch: 2, speed: 3.2, r: 0.36, mass: 0.8, aggro: 14, keep: 1.5, drop: 2, home: 10, summon: true,
    attacks: [{ a: A.bslash, w: 1, min: 0, max: 1.8 }],
    look: { weapon: 'saber', blade: 0x9a8a70, noHair: true, bulk: 0.8, extra: looks.skeleton, colors: { skin: 0xd8d2c0, tunic: 0xccc6b4, pants: 0x3a342a, boots: 0xc8c2b0, glove: 0xd8d2c0, shoulder: 0xd0cab8, belt: 0x4a3e2a } },
  },
  slime: {
    name: 'Grave Slime', hp: 80, poise: 99, flinch: 0, speed: 2.4, r: 0.56, mass: 1.6, aggro: 12, keep: 2, drop: 8, home: 10,
    attacks: [{ a: A.squish, w: 1, min: 0, max: 1.6 }],
    look: { rig: 'slime', scale: 1, eyes: 0x102008, colors: { jelly: 0x6ad040, dark: 0x2a6a1a, core: 0xc8ff60, bone: 0xe0dac8 } },
    afterDeath: (w, e) => {
      const a = e.face + Math.PI / 2;
      for (const s of [-1, 1]) {
        const p = free(w, e.x + Math.sin(a) * 0.6 * s, e.z + Math.cos(a) * 0.6 * s, 0.32) || { x: e.x, z: e.z };
        const f = w.spawnFoe('slimelet', p.x, p.z, { tier: e.def.tier || 0, aggro: true, rise: false });
        f.ai.locked = !!e.ai.locked; f.ai.cd = 0.9 + w.rand() * 0.5; f.kbx = Math.sin(a) * 5 * s; f.kbz = Math.cos(a) * 5 * s; f.anim = 'hurt'; f.state = 'hurt'; f.stun = 0.35;
      }
      w.emit('split', { e, x: e.x, z: e.z });
    },
  },
  slimelet: {
    name: 'Slimeling', hp: 26, poise: 99, flinch: 0, speed: 3.2, r: 0.33, mass: 0.6, aggro: 13, keep: 1.4, drop: 2, home: 10, summon: true,
    attacks: [{ a: A.lhop, w: 1, min: 0, max: 3.5 }],
    look: { rig: 'slime', scale: 0.58, eyes: 0x102008, colors: { jelly: 0x7ae050, dark: 0x2a6a1a, core: 0xd8ff70, bone: 0xe0dac8 } },
  },
  cryptspider: {
    name: 'Crypt Spider', hp: 66, poise: 28, flinch: 1, speed: 5.0, r: 0.46, mass: 1.0, aggro: 15, keep: 4.2, drop: 9, home: 10,
    attacks: [{ a: A.fangs, w: 1, min: 0, max: 1.6 }],
    look: { rig: 'spider', scale: 1.15, eyes: 0xff2030, colors: { shell: 0x4a4650, dark: 0x26232a, under: 0x6a6670, claw: 0x34303a, tip: 0x0c0a0e, mark: 0xf0e8d8 } },
  },
  imp: {
    name: 'Imp', hp: 42, poise: 14, flinch: 2, speed: 4.0, r: 0.3, mass: 0.6, aggro: 15, keep: 6, ranged: true, drop: 6, home: 11, hunch: true,
    attacks: [{ a: A.fireball, w: 1, min: 2.5, max: 10 }],
    look: { weapon: 'none', claws: 0x2a0806, eyes: 0xffd040, noHair: true, horns: 0x2a1a10, scale: 0.72, extra: looks.imp, colors: { skin: 0xc83a22, tunic: 0xa82e1c, pants: 0x7a1e12, boots: 0x2a0806, glove: 0xc83a22, shoulder: 0xb8321e } },
  },
  hellhound: {
    name: 'Hellhound', hp: 76, poise: 32, flinch: 1, speed: 5.8, r: 0.44, mass: 1.0, aggro: 15, keep: 3.4, drop: 9, home: 11,
    attacks: [{ a: A.hbite, w: 1, min: 0, max: 1.8 }],
    look: { rig: 'hellhound', scale: 1.2, eyes: 0xffb020, colors: { fur: 0x2a1614, dark: 0x160a0a, bone: 0xff7020, skull: 0x4a3830, tail: 0x3a1a14, sore: 0xff6010 } },
  },
  cultist: {
    name: 'Cultist', hp: 64, poise: 18, flinch: 3, speed: 2.5, r: 0.38, mass: 0.9, aggro: 15, keep: 7, ranged: true, drop: 11, home: 11,
    attacks: [{ a: A.hex, w: 1, min: 2.5, max: 11 }],
    look: { weapon: 'staff', orb: 0xff3090, hood: true, eyes: 0xff40a0, skirt: 0x5a0e1a, extra: looks.cultist, colors: { skin: 0x3a2a2c, tunic: 0x6a1220, pants: 0x3a0a12, boots: 0x120608, hood: 0x5a0e1a, glove: 0x2a1a1c, belt: 0x2a0a10 } },
  },
  demon: {
    name: 'Horned Demon', hp: 320, poise: 150, flinch: 0, speed: 2.3, r: 0.66, mass: 3.6, aggro: 13, keep: 2.4, armor: true, scale: 1.55, drop: 30, home: 11,
    attacks: [{ a: A.hslam, w: 1, min: 0, max: 3.3 }, { a: A.dclaw, w: 1, min: 0, max: 2.7 }],
    look: { weapon: 'none', claws: 0xff9030, clawGlow: true, eyes: 0xffa020, noHair: true, bulk: 1.5, extra: looks.demon, colors: { skin: 0xb02a18, tunic: 0x8a2012, pants: 0x3a0e0a, boots: 0x1a0806, shoulder: 0xa02616, glove: 0x6a160c, belt: 0x2a0a06 } },
  },
  seraph: {
    name: 'Seraph', hp: 140, poise: 60, flinch: 0.5, speed: 2.2, r: 0.6, mass: 2, aggro: 15, keep: 6, ranged: true, drop: 20, home: 11, flier: true,
    attacks: [{ a: A.pulse, w: 1, min: 0, max: 3.2 }],
    look: { rig: 'seraph', scale: 1.25, eyes: 0xffd860, colors: { eye: 0xf4f0e4, iris: 0xffc040, ring: 0xd8b860, dark: 0x8a6a30, wing: 0xf0ece0, wingDark: 0xc8c0a8 } },
  },
};

// Where every foe first appears (the district tier), Act I included; bosses are not units.
export const HOME = {
  hushed: 0, ghoul: 0, crossbow: 0, acolyte: 1, brute: 1, hound: 2, bomber: 2, spitter: 2, warden: 3,
  rat: 4, shade: 4, chanter: 4, knight: 4, gargoyle: 5, sentinel: 5,
};
for (const k in UNITS2) HOME[k] = UNITS2[k].home;
// raised by other foes, never placed or pooled on their own
export const SUMMON_ONLY = Object.keys(UNITS2).filter((k) => UNITS2[k].summon);

// PROPOSAL: the bestiary lines (a short note on how each foe fights), for the author to revise.
export const BESTIARY_TEXT = {
  hushed: 'THE VOICELESS OF THE CITY. A CUT, OR TWO.',
  ghoul: 'LEAPS IN ALONG A LINE. STEP ASIDE.',
  crossbow: 'AIMS A LONG RAY, THEN LOOSES.',
  acolyte: 'THROWS RED ORBS AND BLINKS AWAY.',
  brute: 'SLOW AND HEAVY. EVERY BLOW IS MARKED.',
  hound: 'CIRCLES, CROUCHES, LUNGES DOWN A LINE.',
  bomber: 'LOBS FIRE AHEAD OF YOU. CORNERED, IT SPILLS.',
  spitter: 'SPITS POISON ACROSS YOUR PATH.',
  warden: 'A SHIELD IN FRONT. STRIKE AS IT SWINGS.',
  rat: 'NIPS AND SCURRIES. NEVER ALONE.',
  shade: 'MELTS INTO THE DARK, CUTS FROM BEHIND.',
  chanter: 'WARDS ITS KIN. INTERRUPT THE CHANT.',
  knight: 'GUARDS, THRUSTS, BASHES BACK.',
  gargoyle: 'DIVES FROM THE AIR, THEN LIES OPEN.',
  sentinel: 'A FURNACE BEAM AND A ROLLING SLAM.',
  bat: 'A SWARM THAT SWOOPS DOWN SHORT LINES.',
  crab: 'ARMOURED IN FRONT. COME AT IT FROM THE SIDE.',
  frostwolf: 'HUNTS IN PACKS. ITS LEAP LEAVES RIME.',
  icewraith: 'FROST BOLTS, AND A RING OF COLD.',
  yeti: 'ITS SLAM THROWS ICE ALL AROUND.',
  scorpion: 'BURROWS, SURFACES UNDER YOU, STINGS.',
  sandworm: 'UNSEEN BELOW. ERUPTS ALONG A LINE.',
  mummy: 'ITS CURSE BINDS. RISES ONCE UNLESS BURNED.',
  bonecaster: 'BONE SPIKES IN ROWS. RAISES THE DEAD.',
  skeleton: 'RAISED BY A BONECASTER.',
  slime: 'HOPS AND BURNS. SPLITS IN TWO.',
  slimelet: 'WHAT IS LEFT OF A SLIME.',
  cryptspider: 'WEBS THAT BIND, THEN A LEAPING BITE.',
  imp: 'FIREBALLS. BLINKS AWAY FROM BLADES.',
  hellhound: 'BREATHES FIRE. ITS TRACKS BURN.',
  cultist: 'A RITUAL THAT EMPOWERS OR SUMMONS. BREAK IT.',
  demon: 'CHARGES DOWN A LINE, THEN SLAMS FIRE.',
  seraph: 'ITS GAZE SWEEPS THE FLOOR. DASH THROUGH.',
};
export const DASH_BREAKS = 'A DASH TEARS YOU FREE OF A WEB OR A CURSE.'; // PROPOSAL (a hint line)

// ------------------------------------------------------------------ behaviour
// the hound's pattern, shared by the wolves and the hellhounds: circle, stop and face, strike, break off
function packHunt(w, e, h, hero, d, ang, o) {
  const ai = e.ai; ai.ring ??= o.ring + w.rand() * 1.1; strafeFlip(w, e, h);
  if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ang + Math.PI - 0.8 * ai.strafeDir, e.speed); e.face = turn(e.face, a, 10 * h); return; }
  if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
    if (d < 1.9) { attack(w, e, o.close); ai.backT = 0.35; return; }
    if (o.far(w, e, d) && ai.sees && w.clear(e, hero)) { attack(w, e, o.farAtk); o.used(w, e); e.flinch = 0; ai.backT = 0.6; return; }
  }
  if (d < 2.2) {
    if (ai.cd <= 0.2 && meleeToken(w)) { stand(e, 'stalk'); e.face = turn(e.face, ang, 12 * h); return; }
    const a = move(w, e, ang + Math.PI - 0.5 * ai.strafeDir, e.speed); e.face = turn(e.face, a, 10 * h); return;
  }
  if (d > 7) { const a = move(w, e, ang, e.speed); e.face = turn(e.face, a, 10 * h); return; }
  if (ai.cd <= 0.35 && o.far(w, e, d) && meleeToken(w)) { stand(e, 'stalk'); e.face = turn(e.face, ang, 9 * h); return; }
  circleHero(w, e, h, hero, ai.ring, e.speed * 0.72);
}

export const UNIT_AI2 = {
  // Flutters round the hero on a wobbling circle and dives along a short marked line; at most two dive
  // at once, then they climb away again.
  bat: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai;
    if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ai.backA, e.speed); e.face = turn(e.face, a, 12 * h); return; }
    if (ai.cd <= 0 && d >= 1.5 && d <= 4.2 && facing(e, ang, 0.5) && w.clear(e, hero)) {
      let diving = 0; for (const f of w.ents) if (f.type === 'bat' && !f.dead && (f.state === 'windup' || f.state === 'attack')) diving++;
      if (diving < 2) { attack(w, e, A.swoop); ai.backT = 0.45 + w.rand() * 0.3; ai.backA = ang + Math.PI + (w.rand() - 0.5) * 1.8; return; }
    }
    ai.ring ??= 2.6 + w.rand() * 1.2; strafeFlip(w, e, h);
    const around = angTo(hero, e) + ai.strafeDir * 0.7 + Math.sin(w.t * 3 + e.id) * 0.35;
    const tx = hero.x + Math.sin(around) * ai.ring, tz = hero.z + Math.cos(around) * ai.ring;
    const a = move(w, e, Math.atan2(tx - e.x, tz - e.z), e.speed * (d > 6 ? 1 : 0.75));
    e.face = turn(e.face, ai.cd <= 0.4 && d < 5 ? ang : a, 10 * h);
  }),

  // Scuttles sideways with its armoured front to the hero; pinches up close, sweeps both claws when
  // the hero lingers. Blows from the front glance off until the guard breaks.
  crab: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 4.5 * h);
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.5)) {
      if (d < 1.7) { attack(w, e, w.rand() < 0.6 ? A.pinch : A.claws); return; }
      if (d < 2.3) { attack(w, e, A.claws); return; }
    }
    if (d > 2.0) { move(w, e, ang + ai.strafeDir * 0.9, e.speed); e.face = turn(e.face, ang, 4.5 * h); }
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.5);
    e.anim = 'walk';
  }),

  // A pack hunter: circles, crouches and leaps onto a marked circle (rime where it lands); one wolf of
  // a pack leaps at a time. Snaps when the hero closes in.
  frostwolf: unit((w, e, h, hero, d, ang) => packHunt(w, e, h, hero, d, ang, {
    ring: 3.6, close: A.wsnap, farAtk: A.pounce,
    far: (w2, e2, dd) => dd >= 2.6 && dd <= 6 && (e2.ai.leapAt ?? 0) <= w2.t && !busy(w2, 'frostwolf', e2),
    used: (w2, e2) => { e2.ai.leapAt = w2.t + 2.6 * haste(e2); },
  })),

  // Floats out of reach; frost bolts (a fan of three every third cast). A hero who comes close gets a
  // freezing ring rolled out at them, and the wraith drifts off again.
  icewraith: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 6 * h);
    if (ai.cd <= 0 && d < 3.2 && (ai.novaAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.nova); ai.novaAt = w.t + 5 * haste(e); return; }
    if (ai.cd <= 0 && d >= 2.5 && d <= 11 && ai.sees && rangedToken(w) && facing(e, ang, 0.6)) { ai.n = (ai.n || 0) + 1; attack(w, e, ai.n % 3 === 0 ? A.shardfan : A.frostbolt); return; }
    if (d < 4.5) move(w, e, ang + Math.PI + 0.5 * ai.strafeDir, e.speed);
    else if (d > 9) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),

  // Lumbers in. Close: a slam that throws ice shards all round, or a wide swipe. Far: hurls a boulder.
  yeti: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; e.face = turn(e.face, ang, 2.4 * h);
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d <= 2.6) { attack(w, e, w.rand() < 0.5 ? A.yswipe : A.yslam); return; }
      if (d <= 3.3) { attack(w, e, A.yslam); return; }
      if (d >= 4.5 && d <= 11 && (ai.throwAt ?? 0) <= w.t && ai.sees) { attack(w, e, A.boulder); ai.throwAt = w.t + 6.5 * haste(e); return; }
    }
    if (d > 2.3) move(w, e, ang, e.speed); else stand(e);
  }),

  // Stalks close and stings over its head down a marked line (poison), pinches up close. Every few
  // seconds it burrows, runs under the sand (a trail of mounds) and bursts up under the hero.
  scorpion: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; ai.burrowAt ??= w.t + 3 + w.rand() * 2;
    if (ai.dig > 0) { // sinking into the sand (it can still be struck)
      stand(e, 'burrow'); ai.dig -= h;
      if (ai.dig <= 0) { hide(w, e); ai.hideT = ai.hideT0 = 0.55; ai.to = null; }
      return;
    }
    if (e.hidden) {
      stand(e, 'idle'); ai.hideT -= h;
      // a trail of mounds runs towards where it will surface
      if (ai.to && (ai.trailT = (ai.trailT || 0) - h) <= 0) { ai.trailT = 0.1; const k = clamp01(1 - ai.hideT / ai.hideT0); mark(w, { shape: 'circle', x: e.x + (ai.to.x - e.x) * k, z: e.z + (ai.to.z - e.z) * k, r: 0.45, life: 0.7, kind: 'mound' }); }
      if (ai.hideT > 0) return;
      if (!ai.to) { const p = lead(w, e, hero, 0.6, 0); ai.to = spotNear(w, p.x, p.z, 1.2, e._r || 0.5) || { x: e.x, z: e.z }; circle(w, e, ai.to.x, ai.to.z, 1.5, { warn: 0.8, life: 0.25, dmg: 14, kind: 'sand', kb: 6 }); ai.hideT = ai.hideT0 = 0.8; return; }
      e.x = ai.to.x; e.z = ai.to.z; ai.to = null; unhide(w, e, 'emerge'); e.state = 'spawn'; e.t = 0.4; e.anim = 'emerge'; e.animT = 0; e.face = angTo(e, hero); ai.cd = 0.25;
      return;
    }
    strafeFlip(w, e, h); e.face = turn(e.face, ang, 6 * h);
    if (ai.cd <= 0 && ai.burrowAt <= w.t && d <= 10) {
      mark(w, { shape: 'circle', x: e.x, z: e.z, r: 0.9, life: 0.6, kind: 'sandburst' }); ai.dig = 0.4; ai.burrowAt = w.t + 7 * haste(e);
      e.anim = 'burrow'; e.animT = 0; stand(e, 'burrow'); w.emit('burrow', { e }); return;
    }
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d < 1.7) { attack(w, e, w.rand() < 0.55 ? A.spinch : A.sting); return; }
      if (d < 2.9) { attack(w, e, A.sting); return; }
    }
    if (d > 2.4) move(w, e, ang, e.speed * (d > 5 ? 1 : 0.7)); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // Unseen under the sand: only a trail of mounds runs towards the hero. Then it erupts along a marked
  // line through where the hero stands and surfaces at its end, bites and spits sand for a while (now
  // it can be struck), and dives again.
  sandworm: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; ai.ph ??= 'up'; ai.upT ??= w.t + 1.5;
    if (ai.ph === 'up') {
      e.face = turn(e.face, ang, 3 * h); stand(e, 'idle');
      if (ai.upT <= w.t && ai.cd <= 0.2) { ai.ph = 'dive'; ai.diveT = 0.6; e.anim = 'burrow'; e.animT = 0; mark(w, { shape: 'circle', x: e.x, z: e.z, r: 1.2, life: 0.7, kind: 'sandburst' }); w.emit('burrow', { e }); return; }
      if (ai.cd <= 0 && facing(e, ang, 0.5) && meleeToken(w)) {
        if (d < 2.7) { attack(w, e, A.wbite); return; }
        if (d < 9 && ai.sees) { attack(w, e, A.wspit); return; }
      }
      return;
    }
    if (ai.ph === 'dive') { stand(e, 'burrow'); ai.diveT -= h; if (ai.diveT <= 0) { hide(w, e); ai.ph = 'under'; ai.underT = 0; } return; }
    if (ai.ph === 'under') {
      stand(e, 'idle'); ai.underT += h;
      // travel unseen to a spot about 4.5 m from the hero (bodiless while hidden: it pushes nobody)
      const ta = angTo(hero, e); const want = { x: hero.x + Math.sin(ta) * 4.5, z: hero.z + Math.cos(ta) * 4.5 };
      const dx = want.x - e.x, dz = want.z - e.z, dd = Math.hypot(dx, dz); const step = Math.min(dd, e.speed * h);
      if (dd > 0.01) { const nx = e.x + dx / dd * step, nz = e.z + dz / dd * step; if (free(w, nx, nz, 0.3)) { e.x = nx; e.z = nz; } }
      if ((ai.trailT = (ai.trailT || 0) - h) <= 0) { ai.trailT = 0.14; mark(w, { shape: 'circle', x: e.x, z: e.z, r: 0.6, life: 0.9, kind: 'mound' }); }
      if ((dd < 0.5 && ai.underT > 1.0) || ai.underT > 3.2) {
        // erupt: a row of bursts from the spot through the hero and 2 m beyond; it surfaces at the end
        const a = angTo(e, hero); const len = Math.min(9, d + 2.2);
        let end = { x: e.x, z: e.z }; const n = Math.max(3, Math.round(len / 1.1));
        for (let i = 0; i <= n; i++) { const r = len * i / n; const p = free(w, e.x + Math.sin(a) * r, e.z + Math.cos(a) * r, 0.3); if (!p) break; end = p; circle(w, e, p.x, p.z, 1.05, { warn: 0.75 + i * 0.07, life: 0.25, dmg: 16, kind: 'sand', kb: 7 }); }
        ai.ph = 'rise'; ai.riseT = 0.75 + n * 0.07; ai.end = spotNear(w, end.x, end.z, 1, e._r || 0.6) || end;
      }
      return;
    }
    if (ai.ph === 'rise') {
      stand(e, 'idle'); ai.riseT -= h; if (ai.riseT > 0) return;
      e.x = ai.end.x; e.z = ai.end.z; unhide(w, e, 'emerge'); e.state = 'spawn'; e.t = 0.35; e.anim = 'emerge'; e.animT = 0; e.face = angTo(e, hero);
      ai.ph = 'up'; ai.upT = w.t + 3.4 * haste(e); ai.cd = 0.5; w.emit('shake', { amt: 0.35 });
    }
  }),

  // Shambles in slowly; claws up close; from afar a curse of grave-cloth that binds the hero for a
  // moment (a dash tears free). Rises once after it falls, unless it burned.
  mummy: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai;
    if (ai.risePending) { ai.risePending = false; e.state = 'spawn'; e.t = 0; e.anim = 'rise'; e.animT = 0; e.iframes = 0.9; w.emit('spawn', { e }); return; }
    strafeFlip(w, e, h); e.face = turn(e.face, ang, 4 * h);
    if (ai.cd <= 0 && facing(e, ang, 0.5)) {
      if (d < 1.9 && meleeToken(w)) { attack(w, e, A.mclaw); return; }
      if (d >= 3 && d <= 9 && (ai.curseAt ?? 0) <= w.t && ai.sees && rangedToken(w)) { attack(w, e, A.wrap); ai.curseAt = w.t + 5 * haste(e); return; }
    }
    if (d > 1.7) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.3);
    e.anim = 'walk';
  }),

  // Keeps back; rows of bone spikes burst up towards the hero (three rows every third cast). Raises
  // skeletons, two at most; the spot glows first. Hit it while it raises to stop it.
  bonecaster: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h); ai.raiseAt ??= w.t + 2;
    if (ai.cd <= 0 && ai.raiseAt <= w.t && summoned(w, e, 'skeleton') < 2) {
      const a = angTo(e, hero) + (w.rand() - 0.5) * 1.6; const p = spotNear(w, e.x + Math.sin(a) * 2, e.z + Math.cos(a) * 2, 1, 0.45);
      if (p) { ai.raiseSpot = p; mark(w, { shape: 'circle', x: p.x, z: p.z, r: 0.8, life: A.raise.windup, kind: 'raise' }); attack(w, e, A.raise); ai.raiseAt = w.t + 8 * haste(e); return; }
    }
    if (ai.cd <= 0 && d >= 2.5 && d <= 11 && ai.sees && rangedToken(w) && facing(e, ang, 0.6)) { attack(w, e, A.bones); return; }
    if (d < 4.5) { const a = move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed); if (d < 3) e.face = turn(e.face, a, 8 * h); }
    else if (d > 9.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // Comes straight on, cuts.
  skeleton: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 7 * h);
    if (ai.cd <= 0 && d < 1.9 && meleeToken(w) && facing(e, ang, 0.5)) { attack(w, e, A.bslash); return; }
    const crowded = !meleeToken(w);
    if (d > (crowded ? 3 : 1.5)) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // Moves in hops; hops onto a marked circle (acid where it lands), squashes all round up close.
  // Splits into two slimelings when it dies (afterDeath).
  slime: unit((w, e, h, hero, d, ang) => slimeThink(w, e, h, hero, d, ang, A.hop, A.squish)),
  slimelet: unit((w, e, h, hero, d, ang) => slimeThink(w, e, h, hero, d, ang, A.lhop, null)),

  // Skitters round at a distance; shoots a web that binds (a dash tears free), then leaps on a bound
  // hero at once; fangs up close.
  cryptspider: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 8 * h);
    const bound = !!hero.status.root;
    if (ai.cd <= 0 && facing(e, ang, 0.5)) {
      if (d < 1.7 && meleeToken(w)) { attack(w, e, A.fangs); ai.backT = 0.4; return; }
      if (d >= 2.4 && d <= 6.5 && (bound || (ai.leapAt ?? 0) <= w.t) && meleeToken(w) && w.clear(e, hero)) { attack(w, e, A.sbite); ai.leapAt = w.t + 3.5 * haste(e); return; }
      if (d >= 3 && d <= 10 && (ai.webAt ?? 0) <= w.t && !bound && ai.sees && rangedToken(w)) { attack(w, e, A.web); ai.webAt = w.t + 4.5 * haste(e); ai.cd = 0; return; }
    }
    if (ai.backT > 0) { ai.backT -= h; move(w, e, ang + Math.PI + 0.6 * ai.strafeDir, e.speed); return; }
    if (d < 3) move(w, e, ang + Math.PI - 0.7 * ai.strafeDir, e.speed * 0.8);
    else if (d > 7) move(w, e, ang, e.speed);
    else { const tx = hero.x + Math.sin(angTo(hero, e) + ai.strafeDir * 0.7) * 4.5, tz = hero.z + Math.cos(angTo(hero, e) + ai.strafeDir * 0.7) * 4.5; move(w, e, Math.atan2(tx - e.x, tz - e.z), e.speed * 0.7); }
    e.face = turn(e.face, ang, 8 * h);
  }),

  // Keeps its distance and throws fireballs (three at once every third throw); blinks away in a puff
  // of brimstone when the hero gets close.
  imp: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 7 * h);
    if (d < 2.8 && (ai.blinkAt ?? 0) <= w.t) { ai.blinkAt = w.t + 4 * haste(e); if (blinkAway(w, e, hero)) return; }
    if (ai.cd <= 0 && d >= 2.5 && d <= 10 && ai.sees && rangedToken(w) && facing(e, ang, 0.6)) { ai.n = (ai.n || 0) + 1; attack(w, e, ai.n % 3 === 0 ? A.firefan : A.fireball); return; }
    if (d < 4) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 8.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.5);
  }),

  // Hunts like a hound; breathes fire in a marked cone; leaves burning tracks where it runs.
  hellhound: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; ai.tracks ??= [];
    const sp = Math.hypot(e.vx, e.vz);
    if (sp > 3.5 && (ai.trackT = (ai.trackT || 0) - h) <= 0) {
      ai.trackT = 0.3; ai.tracks = ai.tracks.filter((z) => z.t < z.warn + z.life);
      if (ai.tracks.length < 6 && dist(e, hero) > 1.6) ai.tracks.push(circle(w, e, e.x - Math.sin(e.face) * 0.4, e.z - Math.cos(e.face) * 0.4, 0.55, { warn: 0.3, life: 2.0, dmg: 5, kind: 'fire', kb: 1, status: { burn: 1 } }));
    }
    packHunt(w, e, h, hero, d, ang, {
      ring: 3.2, close: A.hbite, farAtk: A.breath,
      far: (w2, e2, dd) => dd >= 1.8 && dd <= 3.6 && (e2.ai.breathAt ?? 0) <= w2.t,
      used: (w2, e2) => { e2.ai.breathAt = w2.t + 3.2 * haste(e2); },
    });
  }),

  // Stays back. Every so often it kneels into a ritual: a sigil burns on the stones around it for a
  // long breath; struck enough, it breaks off. Completed, it empowers the foes around it (harder,
  // faster, warded) or, with none near, calls up imps. Hexes that seek the hero otherwise.
  cultist: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h); ai.ritualAt ??= w.t + 1.5 + w.rand() * 1.5;
    if (ai.sigil) { ai.sigil.t = 1e9; ai.sigil = null; w.emit('interrupt', { e }); } // still standing here with a sigil: it was broken off
    if (ai.cd <= 0 && ai.ritualAt <= w.t) {
      attack(w, e, A.ritual); ai.ritualAt = w.t + 9 * haste(e);
      ai.sigil = mark(w, { shape: 'circle', x: e.x, z: e.z, r: 2.6, life: A.ritual.windup * 1.5, kind: 'sigil' }); return;
    }
    if (ai.cd <= 0 && d >= 2.5 && d <= 11 && ai.sees && rangedToken(w) && facing(e, ang, 0.6)) { attack(w, e, A.hex); return; }
    if (d < 4.5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 9.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // A horned brute. From afar it charges down a long marked line and slams fire where it stops (a ring
  // of fire rolls out). Close: a claw sweep or the slam.
  demon: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; e.face = turn(e.face, ang, (ai.slamNext ? 6 : 2.4) * h);
    if (ai.slamNext) { ai.slamNext = false; attack(w, e, A.hslam); return; }
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d <= 2.7) { attack(w, e, w.rand() < 0.5 ? A.dclaw : A.hslam); return; }
      if (d <= 3.3) { attack(w, e, A.hslam); return; }
      if (d >= 4.5 && d <= 11 && (ai.chargeAt ?? 0) <= w.t && ai.sees && w.clear(e, hero)) { attack(w, e, A.dcharge); ai.chargeAt = w.t + 6.5 * haste(e); ai.slamNext = true; return; }
    }
    if (d > 2.4) move(w, e, ang, e.speed); else stand(e);
  }),

  // Floats at a distance, wings and eyes turning. Its gaze lays a fan on the floor, then a beam sweeps
  // across it; up close a radiant ring rolls out.
  seraph: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 3 * h);
    if (ai.cd <= 0 && d < 3.2 && (ai.pulseAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.pulse); ai.pulseAt = w.t + 4.5 * haste(e); return; }
    if (ai.cd <= 0 && d >= 2.5 && d <= 10 && (ai.gazeAt ?? 0) <= w.t && ai.sees && rangedToken(w) && facing(e, ang, 0.4)) {
      const dir = w.rand() < 0.5 ? -1 : 1; const half = 0.8;
      w.addHazard({ shape: 'line', x: e.x, z: e.z, face: ang - half * dir, len: 9.5, width: 0.9, warn: A.gaze.windup, life: 0.85, dmg: 18 * e.dmgMul, src: e, kind: 'eyebeam', kb: 5, status: { burn: 1 }, sweep: { a0: ang - half * dir, a1: ang + half * dir } });
      attack(w, e, A.gaze); ai.gazeAt = w.t + 4 * haste(e); return;
    }
    if (d < 4.5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 8.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),
};

function slimeThink(w, e, h, hero, d, ang, hop, squish) {
  const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h);
  if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.6)) {
    if (squish && d < 1.6) { attack(w, e, squish); return; }
    if (d >= (squish ? 1.8 : 0.8) && d <= (squish ? 5.2 : 3.6) && w.clear(e, hero) && (ai.hopAt ?? 0) <= w.t) { attack(w, e, hop); ai.hopAt = w.t + (squish ? 2.4 : 1.6) * haste(e); return; }
  }
  // moves in little hops: half the beat on the move, half settling
  const beat = (w.t * 1.4 + e.id * 0.37) % 1;
  if (beat < 0.5) move(w, e, d > 1.5 ? ang : ang + Math.PI / 2 * ai.strafeDir, e.speed * (d > 1.5 ? 1 : 0.5)); else stand(e, 'idle');
  e.anim = 'walk';
}
