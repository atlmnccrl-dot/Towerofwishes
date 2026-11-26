// Act V foes: the God's Dream (docs/ASCENT_DESIGN.md §1-§2): the Ribcage Cathedral, the Sea of Unborn Days and
// the Waking City (tiers 18-19), and the First Founder's bronze casts (summoned at the Cradle of Bronze).
// Stats and looks (UNITS_V), behaviour (UNIT_AI_V), moves (UNIT_ATTACKS_V), home tiers and bestiary lines.
// Self-registering (js/game/content.js imports it): merged into UNITS / UNIT_AI (units.js) and HOME /
// BESTIARY_TEXT / SUMMON_ONLY (units2.js) on load. Pure logic, no DOM: the bodies named by look.rig are
// js/actors/beasts6.js, look.extra parts only run in the browser.
//
// The hardest regular foes so far, and every blow still marked on the stones before it lands (arcs, lines,
// circles, rings, landing rings) and dashed through or walked out of:
//  - the bronze homunculi come in a swarm, leap onto marked circles and burst into molten bronze when they
//    die (the splash is marked first);
//  - a thought of the god is a floating eye of light: it lays beams, sweeps a held gaze, drops motes of
//    light round you, and blinks away when you close in;
//  - a memory-knight remembers: its ghost repeats each blow a moment later, and it strikes where you stood;
//  - a sleepwalking giant walks its round with its eyes shut and wakes when you come close or strike it;
//    awake it stamps, sweeps, lurches forward in three marked steps, and nods off again (the opening);
//  - a nightmare hound melts into its shadow and comes up out of a marked pool of dark under you;
//  - an unrisen dawn wards the others in light, lobs little suns and flares when you close in.
//
// Names, the bestiary lines and every comment describing what these things are: PROPOSAL, for the author.
import { UNITS, UNIT_AI, UNIT_ATTACKS } from './units.js';
import { HOME, BESTIARY_TEXT, SUMMON_ONLY, hookWorld } from './units2.js';

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const angDiff = (a, b) => wrap(b - a);
const turn = (a, b, max) => wrap(a + Math.max(-max, Math.min(max, angDiff(a, b))));
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const S = Math.sin, C = Math.cos;

// ------------------------------------------------------------------ helpers (as in units3.js)
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
function spotNear(w, x, z, r, rad = 0.5) {
  const p = free(w, x, z, rad); if (p) return p;
  for (const rr of [r * 0.5, r, r * 1.6]) for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const q = free(w, x + S(a) * rr, z + C(a) * rr, rad); if (q) return q; }
  return null;
}
function reach(w, x, z, ang, max) {
  let s = 0, px = x, pz = z;
  for (let k = 0.5; k <= max; k += 0.5) { const cx = x + S(ang) * k, cz = z + C(ang) * k; if (!free(w, cx, cz, 0) || !w.clear({ x: px, z: pz }, { x: cx, z: cz })) break; px = cx; pz = cz; s = k; }
  return s;
}
function mark(w, o) { const hero = w.hero; return w.addHazard({ warn: 0, dmg: 0, ...o, t: 0.06, life: (o.life ?? 1) + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true }); }
const circle = (w, e, x, z, r, o) => w.addHazard({ shape: 'circle', x, z, r, warn: o.warn ?? 0.6, life: o.life ?? 0.3, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 5, status: o.status });
const ringOut = (w, e, x, z, r0, r1, o) => w.addHazard({ shape: 'ring', x, z, r0, r1, warn: o.warn ?? 0, life: o.life ?? 0.9, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'shock', kb: o.kb ?? 5, status: o.status });
const laneAt = (w, e, x, z, face, o) => w.addHazard({ shape: 'line', x, z, face, len: o.len, width: o.width ?? 1, warn: o.warn ?? 0.6, life: o.life ?? 0.3, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 5, status: o.status, sweep: o.sweep });
function lob(w, e, tx, tz, o) {
  const a = Math.atan2(tx - e.x, tz - e.z); const sx = e.x + S(a) * (e.r + 0.3), sz = e.z + C(a) * (e.r + 0.3);
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: sx, z: sz, y: o.y ?? 1.4, vx: (tx - sx) / o.arc, vz: (tz - sz) / o.arc, r: o.size ?? 0.25, dmg: 0, life: o.arc, lob: o.arc, lobT: 0, tx, tz, face: a, hitSet: new Set(), src: e });
  return w.addHazard({ shape: 'circle', x: tx, z: tz, r: o.splash, warn: o.arc, life: o.pool ?? 0.25, dmg: o.dmg * e.dmgMul, src: e, kind: o.hazard, kb: o.kb ?? 3, status: o.status });
}
const move = (w, e, ang, sp) => { const a = steer(w, e, ang); e.mx = S(a); e.mz = C(a); e.moveSpeed = sp; e.anim = sp > e.speed * 0.6 ? 'run' : 'walk'; return a; };
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
  if (e.ai.lost > 4 && !e.ai.locked) { e.ai.aggro = false; e.ai.lost = 0; w.emit('calm', { e }); e.anim = 'idle'; if (e.hidden) { e.hidden = false; e.iframes = 0; } return true; }
  return false;
}
// the hero's recent footsteps (the memory-knight strikes where you stood): one every half second
function trackSteps(w) {
  const h = w.hero; if (!h) return [];
  const T = w._steps5 || (w._steps5 = { at: 0, list: [] });
  if (w.t >= T.at) { T.at = w.t + 0.5; T.list.push({ x: h.x, z: h.z, t: w.t }); if (T.list.length > 8) T.list.shift(); }
  return T.list;
}
const unit = (fn) => (w, e, h) => {
  hookWorld(w);
  const hero = w.hero;
  if (!hero || hero.dead || !e.ai.aggro) { if (e.hidden) { e.hidden = false; e.iframes = 0; } return false; }
  const d = dist(e, hero);
  if (!e.hidden && lost(w, e, h, hero, d)) return true;
  e.ai.cd -= h;
  fn(w, e, h, hero, d, angTo(e, hero));
  return true;
};

// ------------------------------------------------------------------ attacks
const A = {
  // Bronze Homunculus: a leap onto a marked circle; a rake of claws up close
  hleap: { name: 'hleap', anim: 'leap', dur: 1.15, windup: 0.6, active: 0.92, leap: true, shape: 'circle', offset: 0, radius: 1.05, dmg: 14, kb: 4, tele: 'circleAt' },
  hclaw: { name: 'hclaw', anim: 'fslash', dur: 0.85, windup: 0.4, active: 0.52, range: 1.5, arc: deg(120), dmg: 11, kb: 2.5, lunge: 3.2, tele: 'arc' },
  // Thought of the God: a beam laid down a line, a held gaze that sweeps, motes of light dropped round you
  tbeam: { name: 'tbeam', anim: 'gaze', dur: 1.35, windup: 0.85, active: 0.87, tele: 'none', dmg: 0 },
  tsweep: { name: 'tsweep', anim: 'gaze', dur: 2.2, windup: 1.0, active: 1.9, tele: 'none', dmg: 0, turn: 0.01 },
  tmotes: { name: 'tmotes', anim: 'pulse', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0 },
  // Memory-Knight: a cleave and a lunge whose ghosts strike again; where you stood
  mcleave: { name: 'mcleave', anim: 'sweep', dur: 1.35, windup: 0.62, active: 0.8, range: 2.6, arc: deg(170), dmg: 21, kb: 6, lunge: 1.6, tele: 'arc', heavy: true },
  mlunge: { name: 'mlunge', anim: 'fthrust', dur: 1.3, windup: 0.6, active: 0.82, shape: 'line', range: 4.6, width: 1.0, dmg: 20, kb: 6, lunge: 7, lungeT: [0.6, 0.82], tele: 'line' },
  mrecall: { name: 'mrecall', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0 },
  // Sleepwalking Giant: a stamp (a ring rolls out of it), a sweep of its arm, three lurching steps
  sstamp: { name: 'sstamp', anim: 'slam', dur: 2.1, windup: 1.1, active: 1.2, shape: 'circle', offset: 1.7, radius: 2.4, dmg: 28, kb: 10, lunge: 0.5, tele: 'circle', heavy: true },
  ssweep: { name: 'ssweep', anim: 'sweep', dur: 1.8, windup: 1.0, active: 1.15, range: 3.7, arc: deg(220), dmg: 23, kb: 9, lunge: 0.8, tele: 'arc', heavy: true },
  slurch: { name: 'slurch', anim: 'roar', dur: 2.0, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true },
  // Nightmare Hound: a bite; down into the shadow; a pounce down a marked line
  nbite: { name: 'nbite', anim: 'bite', dur: 0.85, windup: 0.4, active: 0.52, range: 1.7, arc: deg(110), dmg: 14, kb: 3, lunge: 4, tele: 'arc' },
  npounce: { name: 'npounce', anim: 'pounce', shape: 'line', range: 1.5, width: 1.1, dur: 1.3, windup: 0.6, active: 1.0, dmg: 17, kb: 6, lunge: 13, lungeT: [0.6, 0.95], tele: 'line', teleRange: 7.5, turn: 3 },
  nrise: { name: 'nrise', anim: 'pounce', dur: 0.9, windup: 0.05, active: 0.3, tele: 'none', dmg: 0 },
  // Unrisen Dawn: a little sun lobbed; a ward of light on another; a flare up close
  dsun: { name: 'dsun', anim: 'cast', dur: 1.3, windup: 0.65, active: 0.67, tele: 'none', dmg: 0 },
  dward: { name: 'dward', anim: 'cast', dur: 1.2, windup: 0.6, active: 0.62, tele: 'none', dmg: 0 },
  dflare: { name: 'dflare', anim: 'swell', dur: 1.3, windup: 0.85, active: 0.88, shape: 'circle', offset: 0, radius: 2.9, dmg: 0, tele: 'circle', heavy: true },
  // Bronze Cast (the First Founder's moulds): the hammer comes down; a backswing
  cslam: { name: 'cslam', anim: 'slam', dur: 1.7, windup: 0.85, active: 0.95, shape: 'circle', offset: 1.4, radius: 1.7, dmg: 19, kb: 7, lunge: 0.8, tele: 'circle', heavy: true },
  cswing: { name: 'cswing', anim: 'sweep', dur: 1.4, windup: 0.7, active: 0.85, range: 2.7, arc: deg(180), dmg: 17, kb: 6, lunge: 1.2, tele: 'arc', heavy: true },
};
export const UNIT_ATTACKS_V = A;

// the moves that lay their hazards as they begin (their marks are the telegraph)
A.tbeam.onStrike = (w, e) => w.emit('beam', { e }); // the beam itself was laid as the move began (its mark is the warning)
A.tmotes.onStrike = (w, e) => {
  const h = w.hero; if (!h) return; const a0 = w.rand() * TAU; const n = (e.ai.casts = (e.ai.casts || 0) + 1) % 3 === 0 ? 5 : 4;
  for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n; const r = i ? 1.9 : 0; const p = inside(w, h.x + S(a) * r, h.z + C(a) * r); circle(w, e, p.x, p.z, 1.0, { warn: 0.85 + i * 0.18, life: 0.3, dmg: 14, kind: 'spear', kb: 5 }); }
};
A.mcleave.onStrike = (w, e) => { // the ghost of the cleave: a ring of the same reach round where it stood, a breath later
  const x = e.x, z = e.z; circle(w, e, x + S(e.face) * 1.3, z + C(e.face) * 1.3, 2.0, { warn: 0.85, life: 0.25, dmg: 15, kind: 'chrono', kb: 5 }); w.emit('echo', { e });
};
A.mlunge.onStrike = (w, e) => { // the ghost runs the same line again
  laneAt(w, e, e.x, e.z, e.face, { len: Math.max(2, reach(w, e.x, e.z, e.face, 6)), width: 1.1, warn: 0.9, life: 0.22, dmg: 15, kind: 'chrono', kb: 5 });
};
A.mrecall.onStrike = (w, e) => { // it strikes where you stood: your last three footsteps, one after another
  const steps = trackSteps(w).slice(-6); const pick = [steps[0], steps[2], steps[4]].filter(Boolean);
  pick.forEach((p, i) => { const q = spotNear(w, p.x, p.z, 1, 0.1) || p; circle(w, e, q.x, q.z, 1.2, { warn: 0.8 + i * 0.3, life: 0.25, dmg: 16, kind: 'chrono', kb: 5 }); });
  w.emit('echo', { e });
};
A.sstamp.onStrike = (w, e) => { const x = e.x + S(e.face) * 1.7, z = e.z + C(e.face) * 1.7; ringOut(w, e, x, z, 1.4, 7.5, { life: 1.1, dmg: 13, kind: 'shock', kb: 6 }); w.emit('shake', { amt: 0.6 }); };
A.slurch.onStrike = (w, e) => { // three steps forward, each a marked circle, the last the heaviest
  const a = e.face; let px = e.x, pz = e.z;
  for (let i = 0; i < 3; i++) {
    const s = 2.2 + i * 1.9; const x = e.x + S(a) * s, z = e.z + C(a) * s; if (!free(w, x, z, 0) || !w.clear({ x: px, z: pz }, { x, z })) break;
    circle(w, e, x, z, i === 2 ? 2.0 : 1.5, { warn: 0.75 + i * 0.4, life: 0.25, dmg: i === 2 ? 24 : 18, kind: 'slam', kb: 8 }); px = x; pz = z; e.ai.lurchTo = { x, z, at: w.t + 0.75 + i * 0.4 };
  }
  w.emit('shake', { amt: 0.3 });
};
A.dsun.onStrike = (w, e) => {
  const h = w.hero; if (!h) return; const t = inside(w, h.x + (h.vx || 0) * 0.5, h.z + (h.vz || 0) * 0.5);
  lob(w, e, t.x, t.z, { kind: 'fireball', arc: 1.05, splash: 1.6, pool: 1.4, dmg: 15, hazard: 'fire', kb: 4, y: 2.0, size: 0.34, status: { burn: 1 } }); w.emit('fire', { e, kind: 'flame' });
};
A.dward.onStrike = (w, e) => {
  const t = e.ai.wardOn; e.ai.wardOn = null; if (!t || t.dead) return;
  t.shield = Math.max(t.shield || 0, Math.round(t.maxHp * 0.28)); w.emit('shieldUp', { e: t, src: e, amt: t.shield, x: t.x, z: t.z });
};
A.dflare.onStrike = (w, e) => { circle(w, e, e.x, e.z, 2.9, { warn: 0.02, life: 0.25, dmg: 16, kind: 'holy', kb: 8 }); ringOut(w, e, e.x, e.z, 2.9, 4.6, { life: 0.5, dmg: 9, kind: 'holy', kb: 4 }); };
A.cslam.onStrike = (w, e) => { const x = e.x + S(e.face) * 1.4, z = e.z + C(e.face) * 1.4; ringOut(w, e, x, z, 1.1, 4.2, { life: 0.7, dmg: 9, kind: 'fire', kb: 4 }); };

// ------------------------------------------------------------------ looks: extra parts on the humanoid rig
const looks = {
  homunculus: (rig, part, box) => { // a bronze child grown wrong: a cast seam down it, a molten mouth, a funnel in its skull
    const bronze = 0xb07a34, dark = 0x4a2e12, hot = 0xff8a20;
    part('head', box(0.2, 0.05, 0.03), hot, 0, 0.06, 0.13, { glow: 3 }); // the mouth
    part('head', box(0.12, 0.08, 0.12), dark, 0, 0.27, 0); part('head', box(0.06, 0.04, 0.06), hot, 0, 0.32, 0, { glow: 3 }); // the sprue in its skull
    part('chest', box(0.02, 0.36, 0.02), hot, 0, 0.12, 0.125, { glow: 2.4 }); // the seam
    for (const s of ['L', 'R']) { part('ha' + s, box(0.03, 0.16, 0.03), bronze, 0.03, -0.12, 0.03); part('ha' + s, box(0.03, 0.16, 0.03), bronze, -0.03, -0.12, 0.03); }
  },
  memoryknight: (rig, part, box) => { // a warden as the god remembers one: a blank helm, a torn cloak of light, a blade of memory
    const ghost = 0xa8c8ff, white = 0xe8f0ff;
    part('head', box(0.26, 0.14, 0.03), 0x0a0c14, 0, 0.13, 0.13); part('head', box(0.2, 0.03, 0.03), ghost, 0, 0.14, 0.145, { glow: 3 });
    part('head', box(0.04, 0.16, 0.24), white, 0, 0.3, -0.02);
    for (let i = 0; i < 4; i++) part('chest', box(0.08, 0.5 - i * 0.07, 0.02), ghost, -0.15 + i * 0.1, -0.2, -0.15, { glow: 1.2 }); // the cloak of light
    for (const s of ['L', 'R']) part('sh' + s, box(0.26, 0.1, 0.28), 0x6a7a9a, 0, 0.06, 0);
    part('elL', box(0.04, 0.46, 0.4), 0x5a6a8a, 0.12, -0.15, 0.06); part('elL', box(0.02, 0.2, 0.2), ghost, 0.145, -0.15, 0.06, { glow: 2 });
  },
  sleepwalker: (rig, part, box) => { // a Hushed grown to a giant in the god's sleep: eyes sewn shut, a nightcap of a bell, arms out in front
    const cloth = 0x2a2e3a, bronze = 0x8a6a2a, pale = 0xc8c0b0;
    part('head', box(0.22, 0.02, 0.03), 0x1a1418, 0, 0.13, 0.125); for (const sx of [-1, 1]) for (let i = -1; i <= 1; i++) part('head', box(0.01, 0.04, 0.03), pale, sx * 0.06 + i * 0.02, 0.13, 0.13);
    part('head', box(0.3, 0.16, 0.3), bronze, 0, 0.32, -0.02); part('head', box(0.36, 0.05, 0.36), bronze, 0, 0.24, -0.02); part('head', box(0.06, 0.06, 0.06), 0xffd070, 0, 0.2, 0.14, { glow: 2 });
    part('chest', box(0.6, 0.5, 0.36), cloth, 0, 0.06, -0.02); for (let i = 0; i < 3; i++) part('chest', box(0.5, 0.04, 0.02), 0x3a3e4a, 0, -0.1 + i * 0.12, 0.17);
    for (const s of ['L', 'R']) part('ha' + s, box(0.16, 0.18, 0.16), pale, 0, -0.06, 0.02);
  },
  bronzecopy: (rig, part, box) => { // a cast of the First Founder poured from his own mould: still glowing in its seams, a hammer of raw bronze
    const hot = 0xff8a20, bronze = 0xb07a34;
    part('chest', box(0.02, 0.32, 0.02), hot, 0.06, 0.12, 0.125, { glow: 2.6 }); part('chest', box(0.02, 0.26, 0.02), hot, -0.08, 0.1, 0.125, { glow: 2.6 });
    part('head', box(0.22, 0.04, 0.03), hot, 0, 0.12, 0.13, { glow: 3 }); part('head', box(0.3, 0.1, 0.3), bronze, 0, 0.27, 0);
    for (const s of ['L', 'R']) part('sh' + s, box(0.28, 0.12, 0.3), bronze, 0, 0.06, 0);
  },
};

// ------------------------------------------------------------------ stats and looks
// home: the tier where the unit first appears. summon: raised by others, never placed.
export const UNITS_V = {
  homunculus: {
    name: 'Bronze Homunculus', hp: 62, poise: 26, flinch: 1, speed: 4.6, r: 0.32, mass: 0.7, aggro: 14, keep: 1.6, drop: 6, home: 18, hunch: true,
    attacks: [{ a: A.hclaw, w: 1, min: 0, max: 1.5 }],
    look: { weapon: 'none', scale: 0.82, eyes: 0xffb040, noHair: true, claws: 0xd8a050, extra: looks.homunculus, colors: { skin: 0xb07a34, tunic: 0x9a6a2c, pants: 0x7a5224, boots: 0x5a3a18, shoulder: 0xb07a34, glove: 0xb07a34, belt: 0x5a3a18 } },
    // it bursts into molten bronze where it falls (marked a breath before it splashes)
    afterDeath: (w, e) => { circle(w, e, e.x, e.z, 1.45, { warn: 0.55, life: 0.35, dmg: 13, kind: 'fire', kb: 4, status: { burn: 1 } }); w.emit('fire', { e, kind: 'flame' }); },
  },
  thought: {
    name: 'Thought of the God', hp: 96, poise: 99, flinch: 0, speed: 2.7, r: 0.5, mass: 0.8, aggro: 15, keep: 7, ranged: true, drop: 12, home: 18, flier: true,
    attacks: [{ a: A.tmotes, w: 1, min: 2, max: 11 }],
    look: { rig: 'thought', scale: 1.4, eyes: 0xfff4c0, colors: { white: 0xfff4e0, iris: 0xffb040, pupil: 0x140806, ray: 0xffe8a0, lid: 0xc8a050 } },
  },
  memoryknight: {
    name: 'Memory-Knight', hp: 225, poise: 92, flinch: 0.5, speed: 2.7, r: 0.46, mass: 2, aggro: 14, keep: 2.2, shield: true, drop: 22, home: 18,
    attacks: [{ a: A.mcleave, w: 1, min: 0, max: 2.6 }],
    look: { weapon: 'greatsword', blade: 0xc8dcff, bladeGlow: 0x3a5a9a, eyes: 0xa8c8ff, cloak: true, extra: looks.memoryknight, bulk: 1.15, scale: 1.1,
      colors: { skin: 0x8a9ab8, tunic: 0x4a5a7a, pants: 0x2a344a, boots: 0x1e2434, shoulder: 0x6a7a9a, glove: 0x5a6a8a, belt: 0x3a4660, cloak: 0x7a9ad0, cloakDark: 0x4a6aa0 } },
  },
  sleepwalker: {
    name: 'Sleepwalking Giant', hp: 560, poise: 210, flinch: 0, speed: 1.5, r: 0.92, mass: 6.5, aggro: 5, keep: 2.6, armor: true, scale: 2.25, drop: 38, home: 19, hunch: true,
    attacks: [{ a: A.sstamp, w: 1, min: 0, max: 3.6 }],
    look: { weapon: 'none', eyes: null, noHair: true, bulk: 1.5, extra: looks.sleepwalker, colors: { skin: 0xc8c0b0, tunic: 0x2a2e3a, pants: 0x22262e, boots: 0x1a1c22, shoulder: 0x2a2e3a, glove: 0xc8c0b0, belt: 0x3a3e4a } },
  },
  nightmare: {
    name: 'Nightmare Hound', hp: 104, poise: 36, flinch: 1, speed: 5.4, r: 0.45, mass: 1.3, aggro: 15, keep: 3.2, drop: 12, home: 19,
    attacks: [{ a: A.nbite, w: 1, min: 0, max: 1.7 }],
    look: { rig: 'nightmare', scale: 1.25, eyes: 0xff3048, colors: { fur: 0x14101c, dark: 0x0a0810, smoke: 0x3a2a5a, mouth: 0x6a0a1a, teeth: 0xe8e0e8 } },
  },
  dawnling: {
    name: 'Unrisen Dawn', hp: 82, poise: 99, flinch: 0, speed: 2.8, r: 0.4, mass: 0.6, aggro: 15, keep: 7, ranged: true, drop: 12, home: 19, flier: true,
    attacks: [{ a: A.dsun, w: 1, min: 2.5, max: 10 }],
    look: { rig: 'dawnling', scale: 1.2, eyes: 0xffffff, colors: { core: 0xfff8e0, glow: 0xffc860, ray: 0xffe0a0, rose: 0xff9a70, dark: 0x8a5a30 } },
  },
  bronzecopy: {
    name: 'Bronze Cast', hp: 150, poise: 70, flinch: 0.5, speed: 2.4, r: 0.5, mass: 2.2, aggro: 30, keep: 2.2, armor: true, drop: 0, home: 20, summon: true,
    attacks: [{ a: A.cslam, w: 1, min: 0, max: 3 }],
    look: { weapon: 'hammer', blade: 0xb07a34, bladeGlow: 0x4a1a04, eyes: 0xff9a30, noHair: true, bulk: 1.3, scale: 1.3, extra: looks.bronzecopy,
      colors: { skin: 0xb07a34, tunic: 0x8a5a24, pants: 0x6a4420, boots: 0x4a2e14, shoulder: 0xb07a34, glove: 0x9a6a2c, belt: 0x4a2e14 } },
  },
};

// PROPOSAL: the bestiary lines, for the author to revise.
export const BESTIARY_TEXT_V = {
  homunculus: 'A SWARM OF BRONZE. IT BURSTS WHEN IT DIES.',
  thought: 'A THOUGHT OF THE GOD. ITS GAZE IS A BEAM.',
  memoryknight: 'ITS GHOST STRIKES TWICE. IT KNOWS WHERE YOU STOOD.',
  sleepwalker: 'DO NOT WAKE IT. WHEN IT NODS OFF, STRIKE.',
  nightmare: 'IT SINKS INTO SHADOW. WATCH THE DARK UNDER YOU.',
  dawnling: 'A DAWN THAT NEVER CAME. IT WARDS THE OTHERS.',
  bronzecopy: 'POURED FROM THE FOUNDER\'S OWN MOULD.',
};
export const HOME_V = {}; for (const k in UNITS_V) HOME_V[k] = UNITS_V[k].home;

// ------------------------------------------------------------------ behaviour
export const UNIT_AI_V = {
  // Swarms in on a zigzag; leaps onto you from a few strides (two leap at once at most), rakes up close.
  homunculus: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h);
    if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ang + Math.PI + 0.7 * (ai.strafeDir || 1), e.speed * 0.8); e.face = turn(e.face, a, 12 * h); return; }
    e.face = turn(e.face, ang, 10 * h);
    if (ai.cd <= 0 && facing(e, ang, 0.5)) {
      let leaping = 0; for (const f of w.ents) if (f.type === 'homunculus' && !f.dead && f.state === 'windup' && f.atk && f.atk.leap) leaping++;
      if (d < 1.6 && meleeToken(w)) { attack(w, e, A.hclaw); ai.backT = 0.45; return; }
      if (d >= 2.4 && d <= 5.2 && leaping < 2 && (ai.leapAt ?? 0) <= w.t && w.clear(e, hero)) { attack(w, e, A.hleap); ai.leapAt = w.t + 3.2 * haste(e); ai.backT = 0.5; return; }
    }
    const zig = S(w.t * 5 + e.id * 1.7) * 0.6;
    if (d > 3 || ai.cd <= 0) move(w, e, ang + (d > 2.2 ? zig : 0), e.speed * (d < 1.6 ? 0.4 : 1));
    else { const slot = e.id * 2.3 + S(w.t * 0.7) * 0.5; move(w, e, Math.atan2(hero.x + S(slot) * 3 - e.x, hero.z + C(slot) * 3 - e.z), e.speed * 0.7); }
  }),

  // Hangs back and gazes. A beam laid down a line toward you (the line is the warning); a held gaze that
  // sweeps across you; motes of light dropped on and round you. Close in and it blinks away.
  thought: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 4 * h);
    if (d < 2.6 && (ai.blinkAt ?? 0) <= w.t) {
      for (let k = 0; k < 10; k++) {
        const a = w.rand() * TAU, r = 5.5 + w.rand() * 2.5; const p = free(w, hero.x + S(a) * r, hero.z + C(a) * r, 0.6);
        if (p && w.clear(hero, p)) { w.emit('blink', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; ai.blinkAt = w.t + 4.5 * haste(e); ai.cd = Math.max(ai.cd, 0.6); return; }
      }
      ai.blinkAt = w.t + 1;
    }
    if (ai.cd <= 0 && ai.sees && rangedToken(w) && facing(e, ang, 0.5) && d >= 2.5 && d <= 11) {
      if ((ai.sweepAt ?? w.t + 3) <= w.t && d <= 9) {
        const dir = w.rand() < 0.5 ? -1 : 1, half = 0.7;
        laneAt(w, e, e.x, e.z, ang - half * dir, { len: Math.max(2, reach(w, e.x, e.z, ang, 11)), width: 0.85, warn: A.tsweep.windup, life: 0.9, dmg: 16, kind: 'eyebeam', kb: 5, sweep: { a0: ang - half * dir, a1: ang + half * dir } });
        attack(w, e, A.tsweep); ai.sweepAt = w.t + 7 * haste(e); return;
      }
      ai.sweepAt ??= w.t + 3;
      if ((ai.motesAt ?? 0) <= w.t) { attack(w, e, A.tmotes); ai.motesAt = w.t + 5 * haste(e); return; }
      ai.beamA = ang; laneAt(w, e, e.x + S(ang) * 0.5, e.z + C(ang) * 0.5, ang, { len: Math.max(2, reach(w, e.x, e.z, ang, 12)), width: 0.95, warn: A.tbeam.windup, life: 0.3, dmg: 16, kind: 'eyebeam', kb: 5 });
      attack(w, e, A.tbeam); return;
    }
    if (d < 4.8) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 8.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),

  // Advances behind its shield. A cleave whose ghost strikes again round where it stood; a lunge whose
  // ghost runs the same line; and from afar it remembers: it strikes where you stood a moment ago.
  memoryknight: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; trackSteps(w); strafeFlip(w, e, h); e.face = turn(e.face, ang, 4.2 * h);
    if (ai.cd <= 0 && facing(e, ang, 0.5)) {
      if (d < 2.5 && meleeToken(w)) { attack(w, e, w.rand() < 0.6 ? A.mcleave : A.mlunge); return; }
      if (d >= 2.5 && d <= 4.6 && meleeToken(w)) { attack(w, e, A.mlunge); return; }
      if (d > 4.6 && d <= 11 && (ai.recallAt ?? w.t + 2) <= w.t && rangedToken(w)) { attack(w, e, A.mrecall); ai.recallAt = w.t + 6 * haste(e); return; }
      ai.recallAt ??= w.t + 2;
    }
    if (d > 2.3) move(w, e, ang, e.speed * (d > 5 ? 1 : 0.65)); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.3);
  }),

  // Asleep it walks a slow round about where it stood, arms out; it wakes if you come within a few strides or
  // strike it. Awake: a stamp that rolls a ring out, an arm swept wide, three lurching marked steps toward
  // you. After four blows it nods off on its feet for a long breath (the opening), then wakes again.
  sleepwalker: (w, e, h) => {
    hookWorld(w); const ai = e.ai; const hero = w.hero;
    if (!hero || hero.dead) { stand(e); return true; }
    const d = dist(e, hero); const ang = angTo(e, hero);
    if (!ai.aggro) {
      if (d < 4.2 || e.hp < e.maxHp) { ai.aggro = true; w.emit('aggro', { e }); ai.cd = 1.0; return true; }
      const hm = ai.home || { x: e.x, z: e.z }; ai.walkA = (ai.walkA ?? w.rand() * TAU) + h * 0.25;
      const tx = hm.x + S(ai.walkA) * 2.4, tz = hm.z + C(ai.walkA) * 2.4; const a = Math.atan2(tx - e.x, tz - e.z);
      if (Math.hypot(tx - e.x, tz - e.z) > 0.4) { const s = steer(w, e, a); e.mx = S(s); e.mz = C(s); e.moveSpeed = e.speed * 0.45; e.face = turn(e.face, s, 1.5 * h); e.anim = 'walk'; } else stand(e);
      return true;
    }
    if (lost(w, e, h, hero, d)) return true;
    ai.cd -= h;
    if (ai.dozeUntil) { if (w.t < ai.dozeUntil) { stand(e, 'stagger'); e.animT = Math.min(e.animT, 0.6); return true; } ai.dozeUntil = 0; ai.blows = 0; ai.cd = 0.8; w.emit('wake', { e }); }
    if (ai.lurchTo && w.t >= ai.lurchTo.at - 0.2 && w.t < ai.lurchTo.at + 0.1 && e.state !== 'windup') { const p = ai.lurchTo; ai.lurchTo = null; if (free(w, p.x, p.z, e.r * 0.8)) { e.x = p.x; e.z = p.z; } }
    e.face = turn(e.face, ang, 1.9 * h);
    if (ai.cd <= 0 && (ai.blows || 0) >= 4) { ai.dozeUntil = w.t + 2.8; e.state = 'idle'; mark(w, { shape: 'circle', x: e.x, z: e.z, r: 1.4, life: 2.8, kind: 'bubble' }); w.emit('doze', { e }); return true; }
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.5)) {
      if (d <= 3.2) { attack(w, e, w.rand() < 0.5 ? A.ssweep : A.sstamp); ai.blows = (ai.blows || 0) + 1; return true; }
      if (d <= 4.0) { attack(w, e, A.sstamp); ai.blows = (ai.blows || 0) + 1; return true; }
      if (d > 4.4 && d <= 9.5 && (ai.lurchAt ?? 0) <= w.t && w.clear(e, hero)) { attack(w, e, A.slurch); ai.lurchAt = w.t + 6.5 * haste(e); ai.blows = (ai.blows || 0) + 1; return true; }
    }
    if (d > 2.6) move(w, e, ang, e.speed); else stand(e);
    return true;
  },

  // Circles at a distance. Close: a bite. A pounce down a long marked line. Every so often it sinks into its
  // shadow (it cannot be struck there) and slides under you; a pool of dark is marked where it will come up,
  // and it bursts out of it.
  nightmare: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h);
    if (ai.sunk) {
      const s = ai.sunk; e.iframes = 0.2;
      if (w.t < s.until) { const a = Math.atan2(s.x - e.x, s.z - e.z); const dd = Math.hypot(s.x - e.x, s.z - e.z); if (dd > 0.2) { e.mx = S(a); e.mz = C(a); e.moveSpeed = Math.min(9, dd / Math.max(0.1, s.until - w.t)); } else stand(e); e.anim = 'run'; return; }
      ai.sunk = null; e.hidden = false; e.iframes = 0; if (free(w, s.x, s.z, e.r)) { e.x = s.x; e.z = s.z; }
      e.face = angTo(e, hero); attack(w, e, A.nrise); ai.cd = 1.0; ai.backT = 0.6; return;
    }
    e.face = turn(e.face, ang, 9 * h);
    if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ang + Math.PI - 0.8 * ai.strafeDir, e.speed); e.face = turn(e.face, a, 10 * h); return; }
    if (ai.cd <= 0 && (ai.sinkAt ?? w.t + 2.5) <= w.t && d <= 10 && meleeToken(w) && !busy(w, 'nightmare', e)) {
      const p = spotNear(w, hero.x + (hero.vx || 0) * 0.4, hero.z + (hero.vz || 0) * 0.4, 1, e.r);
      if (p) {
        const warn = 1.15; ai.sunk = { x: p.x, z: p.z, until: w.t + warn }; e.hidden = true; e.iframes = 99; e.tele = null; ai.sinkAt = w.t + 7 * haste(e);
        circle(w, e, p.x, p.z, 1.15, { warn, life: 0.25, dmg: 18, kind: 'void', kb: 6 }); w.emit('vanish', { e }); w.attackers++; return;
      }
    }
    ai.sinkAt ??= w.t + 2.5;
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d < 1.8) { attack(w, e, A.nbite); ai.backT = 0.35; return; }
      if (d >= 3 && d <= 7.5 && (ai.pounceAt ?? 0) <= w.t && w.clear(e, hero)) { attack(w, e, A.npounce); ai.pounceAt = w.t + 3.8 * haste(e); ai.backT = 0.6; return; }
    }
    if (d > 6) move(w, e, ang, e.speed);
    else { const around = angTo(hero, e) + ai.strafeDir * 0.6; move(w, e, Math.atan2(hero.x + S(around) * 3.6 - e.x, hero.z + C(around) * 3.6 - e.z), e.speed * 0.75); }
    e.face = turn(e.face, ang, 9 * h);
  }),

  // Drifts out of reach. Lobs little suns (a burning pool where they land); every so often it wards another
  // foe in light (a shield; a thread of light from it to the one it wards); close in, it flares.
  dawnling: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h);
    if (ai.cd <= 0 && d < 3 && (ai.flareAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.dflare); ai.flareAt = w.t + 4.5 * haste(e); return; }
    if (ai.cd <= 0 && (ai.wardAt ?? w.t + 1.5) <= w.t) {
      const allies = w.foes().filter((f) => f !== e && !f.dead && f.state !== 'spawn' && !(f.shield > 0) && f.type !== 'dawnling' && dist(f, e) < 10);
      if (allies.length) { const t = allies.sort((a, b) => b.maxHp - a.maxHp)[0]; ai.wardOn = t; mark(w, { shape: 'line', x: e.x, z: e.z, face: angTo(e, t), len: dist(e, t), width: 0.3, life: A.dward.windup, kind: 'lure' }); attack(w, e, A.dward); ai.wardAt = w.t + 9 * haste(e); return; }
      ai.wardAt = w.t + 2;
    }
    ai.wardAt ??= w.t + 1.5;
    if (ai.cd <= 0 && d >= 2.5 && d <= 10 && ai.sees && rangedToken(w) && facing(e, ang, 0.6)) { attack(w, e, A.dsun); return; }
    if (d < 4.8) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed);
    else if (d > 8.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),

  // Comes on like its maker: the hammer down (a ring of molten bronze rolls out), a wide backswing.
  bronzecopy: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 3.2 * h);
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d <= 2.7) { attack(w, e, w.rand() < 0.5 ? A.cswing : A.cslam); return; }
      if (d <= 3.1) { attack(w, e, A.cslam); return; }
    }
    if (d > 2.4) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.3);
  }),
};

// ------------------------------------------------------------------ registration (docs/ASCENT_DESIGN.md: add-on content)
Object.assign(UNITS, UNITS_V); Object.assign(UNIT_AI, UNIT_AI_V); Object.assign(UNIT_ATTACKS, A);
Object.assign(HOME, HOME_V); Object.assign(BESTIARY_TEXT, BESTIARY_TEXT_V);
for (const k in UNITS_V) if (UNITS_V[k].summon && !SUMMON_ONLY.includes(k)) SUMMON_ONLY.push(k);
