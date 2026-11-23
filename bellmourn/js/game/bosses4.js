// Act III's bosses: the Bog Mother (the Weeping Marsh), the Clockmaster (the Clockwork Spire) and the
// Wheel (the Empyrean, the final boss). Also, for all fifteen bosses: their Ascended forms (New Game+,
// e.ascended) and their entrances (bossEntrance(type), played by game.js during the boss intro).
// Stats and looks (BOSSES4) and move sets (BOSS_AI4) in the shape of BOSSES2 / BOSS_AI2, merged into those
// two objects by bosses2.js (or here, whichever module is evaluated second), so sim.js, ai.js and game.js
// find them by key. Pure logic: look.extra functions only run in the browser, and every effect an
// entrance makes goes through its fx argument, which is null in Node.
//
// As everywhere, no parry: every blow is marked first and can be dashed through or walked out of.
//
// Names, titles, the comments describing who they are and what they do: PROPOSAL, for the author.
import { strike, ringAt, circleAt, summon, blink, steer } from './ai.js';
import { BOSSES2, BOSS_AI2, free, adds, countOf, roarPause, row, around, combo, quick } from './bosses2.js';
import { FOES } from './defs.js';
import { UNITS } from './units.js';

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const S = Math.sin, C = Math.cos;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const lerp = (a, b, k) => a + (b - a) * k;

// How hard each boss hits and the tier its summons come at.
const POWER = { bogmother: 1.95, clockmaster: 2.0, wheel: 2.05 };
const ADD_TIER = { bogmother: 12, clockmaster: 13, wheel: 14 };

// ------------------------------------------------------------------ helpers (as in bosses3.js)
const known = (type) => !!(FOES[type] || UNITS[type]);
function call(w, e, list, n, tier, radius = 5, cap = 2, total = 5) {
  const type = list.find(known); if (!type) return 0;
  const room = Math.min(n, cap - countOf(w, type), total - adds(w, e)); if (room <= 0) return 0;
  summon(w, e, type, room, tier, radius); return room;
}
function inside(w, x, z, m = 1.2) { const [x0, z0, x1, z1] = w.bounds; return { x: Math.max(x0 + m, Math.min(x1 - m, x)), z: Math.max(z0 + m, Math.min(z1 - m, z)) }; }
function spot(w, e, x, z, r, o) { return w.addHazard({ shape: 'circle', x, z, r, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status }); }
function wave(w, e, x, z, r1, o) { return w.addHazard({ shape: 'ring', x, z, r0: o.r0 ?? 0.6, r1, warn: o.warn ?? 0, life: o.life ?? 1.2, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 6, status: o.status, silence: o.silence }); }
function reach(w, x, z, ang, max) {
  let px = x, pz = z, s = 0;
  for (let k = 0.5; k <= max; k += 0.5) { const cx = x + S(ang) * k, cz = z + C(ang) * k; if (!free(w, cx, cz, 0) || !w.clear({ x: px, z: pz }, { x: cx, z: cz })) break; px = cx; pz = cz; s = k; }
  return s;
}
function lane(w, e, x, z, ang, o) {
  const len = o.through ? o.len : Math.min(o.len || 12, reach(w, x, z, ang, o.len || 12)); if (len < 0.8) return null;
  return w.addHazard({ shape: 'line', x, z, face: ang, len, width: o.width || 1.1, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status, sweep: o.sweep });
}
function lob(w, e, tx, tz, o) {
  const a = Math.atan2(tx - e.x, tz - e.z); const sx = e.x + S(a) * (e.r + 0.3), sz = e.z + C(a) * (e.r + 0.3);
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: sx, z: sz, y: 1.8, vx: (tx - sx) / o.arc, vz: (tz - sz) / o.arc, r: o.size ?? 0.3, dmg: 0, life: o.arc, lob: o.arc, lobT: 0, tx, tz, face: a, hitSet: new Set(), src: e });
  return spot(w, e, tx, tz, o.splash, { warn: o.arc, life: o.pool ?? 0.25, dmg: o.dmg, kind: o.hazard, kb: o.kb ?? 4, status: o.status });
}
function ahead(w, t, k = 0.6) { const h = w.hero; return inside(w, h.x + (h.vx || 0) * t * k, h.z + (h.vz || 0) * t * k, 1.0); }
function hold(w, e, anim) { e.anim = anim; e.animT = anim === 'roar' ? 0.62 + (w.t % 0.4) : 0.56; e.mx = 0; e.mz = 0; }
function startRite(e, id, o = {}) { e.ai.chan = { id, t0: null, next: 0, ...o }; e.tele = null; e.mx = 0; e.mz = 0; }
const riteT = (w, e) => { const c = e.ai.chan; if (c.t0 === null) c.t0 = w.t; else if (w.t - c.last > 0.25) return -1; c.last = w.t; return w.t - c.t0; };
function ward(w, e, k, cap = k) { const top = Math.round(e.maxHp * cap); const s = Math.min(top, (e.shield || 0) + Math.round(e.maxHp * k)); if (s > (e.shield || 0)) { e.shield = s; w.emit('shield', { e }); } }
// a mark on the floor that hurts nobody
function mark(w, o) { const hero = w.hero; return w.addHazard({ warn: 0, dmg: 0, ...o, t: 0.06, life: (o.life ?? 1) + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true }); }
// a spinning projectile flung along ang (gears, bells skimming the water)
function fling(w, e, ang, o) {
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: e.x + S(ang) * (e.r + 0.4), z: e.z + C(ang) * (e.r + 0.4), y: o.y ?? 1.1, vx: S(ang) * o.speed, vz: C(ang) * o.speed, r: o.r ?? 0.32, dmg: o.dmg * e.dmgMul, life: o.life ?? 2, homing: 0, src: e, face: ang, hitSet: new Set() });
}

// ------------------------------------------------------------------ looks
function onFrame(rig, fn) {
  const up = rig.updateCloak.bind(rig); let t = Math.random() * 10;
  rig.updateCloak = (dt, speed, turn) => { up(dt, speed, turn); t += dt; fn(t, dt, speed || 0, turn || 0); };
}
const group = (rig, parent, x = 0, y = 0, z = 0) => { const g = new rig.root.constructor(); g.position.set(x, y, z); parent.add(g); return g; };

// PROPOSAL: the Bog Mother, a witch grown into the leviathan of the marsh: a hag from the waist up with a
// crown of drowned bells and a mane of weed, from the waist down a great black eel's coil and tail; she
// holds a bell-staff hung with the bells she has hoarded.
function bogExtra(rig, part, box) {
  const eel = 0x1e2a24, belly = 0x5a6a4a, weed = 0x3a5a2a, bronze = 0x8a6a2a, verd = 0x4a9a7a, eye = 0x9aff70;
  for (const j of ['hipL', 'hipR']) rig.j[j].visible = false;
  part('hips', box(0.56, 1.0, 0.5), eel, 0, -0.5, -0.02); part('hips', box(0.76, 0.24, 0.76), 0x141c18, 0, -0.86, -0.06);
  for (let i = 0; i < 4; i++) part('hips', box(0.4, 0.1, 0.02), belly, 0, -0.18 - i * 0.18, 0.24);
  const segs = []; let parent = group(rig, rig.body, 0, 0.18, -0.32);
  for (let i = 0; i < 10; i++) {
    const L = 0.44, wd = 0.5 - i * 0.04, ht = 0.32 - i * 0.022;
    const g = i === 0 ? parent : group(rig, parent, 0, 0, -L); parent = g; segs.push(g);
    g.add(part('hips', box(wd, ht, L + 0.04), i % 2 ? eel : 0x26342c, 0, 0, -L / 2));
    g.add(part('hips', box(0.04, 0.1, 0.16), verd, 0, ht / 2 + 0.04, -L / 2, { glow: 1.2 })); // a glowing fin
    if (i === 9) g.add(part('hips', box(0.3, 0.06, 0.3), verd, 0, 0, -L, { glow: 1.4 }));
  }
  // weed hair, a crown of drowned bells, a hag's face
  for (let i = -3; i <= 3; i++) part('head', box(0.05, 0.5 + (3 - Math.abs(i)) * 0.06, 0.05), weed, i * 0.05, -0.12, -0.13);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const g = part('head', box(0.07, 0.08, 0.07), bronze, S(a) * 0.17, 0.34, C(a) * 0.17); part('head', box(0.03, 0.03, 0.03), verd, S(a) * 0.17, 0.29, C(a) * 0.17, { glow: 2 }); void g; }
  for (const sx of [-1, 1]) part('head', box(0.05, 0.04, 0.02), eye, sx * 0.05, 0.13, 0.13, { glow: 3 });
  part('head', box(0.06, 0.07, 0.06), 0x8a9a7a, 0, 0.08, 0.15);
  // bells hung from the staff and from her belt
  rig.weapon.add(part('haR', box(0.05, 0.05, 1.7), 0x2a2018, 0, -0.05, 0.55));
  for (const [y, z] of [[-0.18, 1.3], [-0.3, 1.1], [-0.2, 0.9]]) { rig.weapon.add(part('haR', box(0.14, 0.14, 0.14), bronze, 0, y, z)); rig.weapon.add(part('haR', box(0.06, 0.04, 0.06), verd, 0, y - 0.09, z, { glow: 1.8 })); }
  rig.tip.position.set(0, -0.05, 1.4); rig.bladeLen = 1.4;
  for (const sx of [-1, 0, 1]) part('spine', box(0.08, 0.1, 0.08), bronze, sx * 0.16, -0.06, 0.16);
  onFrame(rig, (t, dt, sp, turn) => { const k = 1.6 + sp * 0.8; segs.forEach((g, i) => { g.rotation.y = S(t * k - i * 0.7) * (0.12 + i * 0.02) - turn * 0.25 * Math.min(1, i / 3); }); });
}

// PROPOSAL: the Clockmaster, the Wheel's timekeeper: tall and thin in a long coat of brass plates, his head
// a clock face with two hands turning, a ring of gears turning behind his shoulders, a pendulum at his back
// and a clock hand for a spear.
function clockExtra(rig, part, box) {
  const brass = 0xc8963a, dark = 0x2a1e10, face = 0xf0e8d0, blue = 0x70d0ff, steel = 0xb8bcc4;
  const hs = 0.26;
  part('head', box(0.36, 0.36, 0.06), brass, 0, hs / 2, hs / 2 + 0.02); part('head', box(0.3, 0.3, 0.02), face, 0, hs / 2, hs / 2 + 0.06);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; part('head', box(0.02, i % 3 ? 0.03 : 0.05, 0.02), dark, S(a) * 0.12, hs / 2 + C(a) * 0.12, hs / 2 + 0.075); }
  const hands = group(rig, rig.j.head, 0, hs / 2, hs / 2 + 0.08); const hh = group(rig, hands); const mh = group(rig, hands);
  hh.add(part('head', box(0.025, 0.09, 0.02), dark, 0, 0.045, 0)); mh.add(part('head', box(0.018, 0.13, 0.02), 0x8a1a1a, 0, 0.065, 0));
  part('head', box(0.03, 0.03, 0.02), blue, 0, hs / 2, hs / 2 + 0.09, { glow: 3 });
  // a ring of gears behind the shoulders
  const ring = group(rig, rig.j.chest, 0, 0.3, -0.22); const gears = [];
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; const g = group(rig, ring, S(a) * 0.42, C(a) * 0.42, 0); gears.push(g); for (let k = 0; k < 6; k++) { const b = k / 6 * TAU; g.add(part('chest', box(0.06, 0.05, 0.03), brass, S(b) * 0.1, C(b) * 0.1, 0, { rz: -b })); } g.add(part('chest', box(0.08, 0.08, 0.04), dark, 0, 0, 0)); }
  // the pendulum
  const pend = group(rig, rig.j.chest, 0, 0.1, -0.2); pend.add(part('chest', box(0.03, 0.7, 0.03), brass, 0, -0.35, 0)); pend.add(part('chest', box(0.16, 0.16, 0.05), blue, 0, -0.72, 0, { glow: 2 }));
  // brass plates on the coat, the clock-hand spear
  for (const s of ['L', 'R']) part('sh' + s, box(0.22, 0.08, 0.22), brass, 0, 0.06, 0);
  for (let i = 0; i < 3; i++) part('chest', box(0.3, 0.03, 0.02), brass, 0, 0.02 + i * 0.1, 0.13);
  rig.weapon.add(part('haR', box(0.05, 0.05, 1.9), dark, 0, -0.05, 0.55)); rig.weapon.add(part('haR', box(0.04, 0.22, 0.5), steel, 0, -0.05, 1.62)); rig.weapon.add(part('haR', box(0.08, 0.08, 0.08), blue, 0, -0.05, 1.32, { glow: 2.4 }));
  rig.tip.position.set(0, -0.05, 1.86); rig.bladeLen = 1.8;
  onFrame(rig, (t) => { hh.rotation.z = -t * 0.5; mh.rotation.z = -t * 3; ring.rotation.z = t * 0.4; gears.forEach((g, i) => { g.rotation.z = (i % 2 ? -1 : 1) * t * 2; }); pend.rotation.x = S(t * 2.2) * 0.35; });
}

// ------------------------------------------------------------------ stats (names and titles: PROPOSAL)
export const BOSSES4 = {
  bogmother: {
    name: 'The Bog Mother', title: 'Who Hoards the Drowned Bells', hp: 9800, poise: 999, speed: 2.8, r: 0.95, mass: 10, scale: 1.95, boss: true,
    look: { weapon: 'none', eyes: 0x9aff70, longHair: true, claws: 0xc8d0b0, bulk: 1.3, skirt: null, colors: { skin: 0x7a8a6a, hair: 0x2a3a22, tunic: 0x2a3424, pants: 0x1e2a24, boots: 0x1e2a24, glove: 0x6a7a5a, shoulder: 0x3a4a30, belt: 0x4a3a1e }, extra: bogExtra },
  },
  clockmaster: {
    name: 'The Clockmaster', title: "Who Keeps the Wheel's Time", hp: 10800, poise: 999, speed: 3.0, r: 0.75, mass: 8, scale: 1.85, boss: true,
    look: { weapon: 'none', eyes: 0x70d0ff, noHair: true, noHead: false, headSize: 0.26, cloak: true, cloakLen: [0.5, 0.52, 0.5], skirt: 0x3a2a1a, colors: { skin: 0xc8963a, tunic: 0x3a2a1a, pants: 0x2a1e12, boots: 0x1a120a, glove: 0x8a6428, shoulder: 0xc8963a, belt: 0xc8963a, trim: 0xc8963a, cloak: 0x4a2e1a, cloakDark: 0x2e1c10 }, extra: clockExtra },
  },
  wheel: {
    name: 'The Wheel', title: 'Jailer of the Voice', hp: 12000, poise: 999, speed: 1.5, r: 1.3, mass: 30, scale: 1.6, boss: true, hover: true,
    look: { rig: 'wheel', eyes: 0xfff2c0, colors: { gold: 0xe8c060, white: 0xf4eee0, dark: 0x3a2a18, eye: 0xf8f4ea, iris: 0xff7a30, voice: 0xffe0a0, spoke: 0xfff0c0 } },
  },
};

// ------------------------------------------------------------------ the Bog Mother (the Weeping Marsh)
// PROPOSAL: she lunges with the leviathan's maw down a long lane; her tail lashes all round; her claws rake
// up close; she throws drowned bells that land and toll; the bog goes foul round you; she sinks into the
// black water and comes up under you. Below two thirds: leeches and a marsh witch, and she sinks more.
// Below a third: a bog troll, and the hoard: her drowned bells toll from the four corners of the marsh.
const LEECH = ['leech', 'rat'], WITCH = ['marshwitch', 'acolyte'], TROLL = ['bogtroll', 'brute'];
function bellToss(w, e, p, K) {
  const t = ahead(w, 1.0); const a = angTo(e, t); const n = p >= 2 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 2.6; const q = inside(w, t.x + C(a) * o, t.z - S(a) * o, 1.2);
    lob(w, e, q.x, q.z, { kind: 'bell', arc: 1.0 + i * 0.12, splash: 1.7, dmg: 20 * K, hazard: 'toll', kb: 7, size: 0.45 });
    wave(w, e, q.x, q.z, 5.5, { r0: 1.7, warn: 1.0 + i * 0.12, life: 0.9, dmg: 11 * K, kind: 'toll' });
  }
  w.emit('fire', { e, kind: 'bell' });
}
function sink(w, e) {
  const K = POWER.bogmother;
  spot(w, e, e.x, e.z, 2.1, { warn: 0.05, life: 0.3, dmg: 13 * K, kind: 'bog', kb: 7 });
  e.hidden = true; e.iframes = 99; e.r = 0.2; e.vx = 0; e.vz = 0; e.tele = null; e.mx = 0; e.mz = 0;
  e.ai.dig = { t: 0, trail: 0.15, lock: null }; w.emit('vanish', { e }); w.emit('shake', { amt: 0.4 });
}
const bogmother = {
  phases: [0.66, 0.33], keep: 3.0, turn: 3.4,
  moves(p) {
    const K = POWER.bogmother; const q = p >= 3 ? 0.88 : 1;
    const claws = strike({ name: 'claws', anim: 'fslash', range: 3.3, arc: deg(150), windup: 0.62, active: 0.74, dur: p >= 3 ? 2.5 : 1.95, dmg: 18 * K, lunge: 3.2, chain: { at: 0.95, windup: 1.32, active: 1.44, lunge: 4 } });
    const m = [
      { id: 'claws', w: 3, max: 3.3, a: p >= 3 ? combo(claws, [{ at: 0.95, windup: 1.32, active: 1.44, lunge: 4 }, { at: 1.7, windup: 2.06, active: 2.18, lunge: 5 }]) : claws },
      { id: 'lash', w: 2, max: 4.4, cd: 3.5, a: quick(strike({ name: 'lash', anim: 'spin', shape: 'circle', offset: 0, radius: 4.4, windup: 0.9, active: 1.2, dur: 1.8, dmg: 19 * K, kb: 9, lunge: 0, tele: 'circle', onStrike: (w, e) => { if (p >= 2) wave(w, e, e.x, e.z, 8, { r0: 4.4, warn: 0.1, life: 1.0, dmg: 11 * K, kind: 'bog', status: { poison: 1 } }); } }), q) },
      // the maw: a long lane; she stops when she reaches you
      { id: 'maw', w: 2, min: 3, max: 10, cd: 3.5, a: quick({ name: 'maw', anim: 'fthrust', shape: 'line', range: 2.4, width: 1.6, windup: 0.8, active: 1.14, dur: 1.7, dmg: 24 * K, kb: 8, lunge: 15, lungeT: [0.8, 1.1], tele: 'line', teleRange: 8, turn: 5, heavy: true }, q) },
      { id: 'bells', w: 1.7, min: 3.5, cd: 4.5, a: { name: 'bells', anim: 'sweep', dur: 1.5, windup: 0.75, active: 0.8, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => bellToss(w, e, p, K) } },
      // the bog goes foul round you and stays foul for a while
      { id: 'mire', w: 1.4, min: 2.5, cd: 6.5, a: { name: 'mire', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => around(w, e, p >= 2 ? 4 : 3, { warn: 0.95, gap: 0.2, r: 1.4, life: 4, dmg: 12 * K, kind: 'bog', kb: 3, near: 2, spread: 2 }) } },
      { id: 'sink', w: p >= 2 ? 1.7 : 1.1, cd: p >= 3 ? 6.5 : (p >= 2 ? 8 : 11), run: (w, e) => sink(w, e) },
    ];
    if (p >= 2) m.push({ id: 'brood', w: 0.9, cd: 20, run: (w, e) => { if (!call(w, e, LEECH, 3, ADD_TIER.bogmother, 4, 4, 6)) call(w, e, WITCH, 1, ADD_TIER.bogmother, 6, 1); roarPause(e); } });
    if (p >= 3) m.push({ id: 'hoard', w: 1.3, cd: 12, run: (w, e) => startRite(e, 'hoard', { k: 0 }) });
    return m;
  },
  // under the black water: a wake runs at you, then the spot where she will come up is marked
  hiddenThink(w, e, h) {
    const d = e.ai.dig; const hero = w.hero; const K = POWER.bogmother; e.anim = 'idle'; e.mx = 0; e.mz = 0;
    if (!d) { e.hidden = false; e.iframes = 0; e.r = e.def.r; return; }
    d.t += h;
    if (!d.lock) {
      const dd = dist(e, hero);
      if (dd > 1.9) { const a = steer(w, e, angTo(e, hero)); const sp = 6.2 * h; const nx = e.x + S(a) * sp, nz = e.z + C(a) * sp; if (free(w, nx, nz, 0.4)) { e.x = nx; e.z = nz; } }
      d.trail -= h; if (d.trail <= 0) { d.trail = 0.18; mark(w, { shape: 'circle', x: e.x, z: e.z, r: 0.7, life: 0.8, kind: 'wake' }); }
      if (d.t > 1.9 || dd < 2.0) { const c = inside(w, hero.x, hero.z, 1.4); d.lock = { x: c.x, z: c.z, t: d.t }; spot(w, e, c.x, c.z, 2.6, { warn: 1.0, life: 0.3, dmg: 25 * K, kind: 'bog', kb: 10 }); }
      return;
    }
    if (d.t - d.lock.t < 1.0) return;
    if (free(w, d.lock.x, d.lock.z, e.def.r * 0.8)) { e.x = d.lock.x; e.z = d.lock.z; }
    e.hidden = false; e.iframes = 0; e.r = e.def.r; e.face = angTo(e, hero); e.ai.dig = null;
    w.emit('appear', { e }); w.emit('shake', { amt: 0.7 });
    if (e.phase >= 2) wave(w, e, e.x, e.z, 8, { r0: 2.6, warn: 0.05, life: 1.0, dmg: 11 * K, kind: 'bog' });
    e.state = 'roar'; e.t = 0.4; e.anim = 'roar'; e.animT = 0; e.ai.cd = 0.6;
  },
  // the hoard: drowned bells toll from the four corners in turn (rings rolling in), then all at once
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.bogmother; hold(w, e, 'cast');
    const [x0, z0, x1, z1] = w.bounds; const cx = (Math.max(x0, e.x - 9) + Math.min(x1, e.x + 9)) / 2, cz = (Math.max(z0, e.z - 9) + Math.min(z1, e.z + 9)) / 2;
    const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => inside(w, cx + a * 6, cz + b * 6, 1.5));
    while (c.next <= t && c.next < 4.0) {
      const i = Math.round(c.next / 0.8); const all = i >= 4;
      for (const [k, q] of P.entries()) if (all || k === i) { mark(w, { shape: 'circle', x: q.x, z: q.z, r: 0.9, life: 0.8, kind: 'bellmark' }); wave(w, e, q.x, q.z, 9, { r0: 0.8, warn: 0.45, life: 1.6, dmg: 13 * K, kind: 'toll' }); }
      c.next = Math.round((c.next + 0.8) * 100) / 100;
    }
    return t < 4.6;
  },
  onPhase(w, e, p) {
    if (p === 2) { e.speed *= 1.1; call(w, e, LEECH, 3, ADD_TIER.bogmother, 4, 4, 6); }
    if (p === 3) { e.speed *= 1.1; call(w, e, TROLL, 1, TROLL.find(known) === 'brute' ? 6 : ADD_TIER.bogmother, 5, 1); }
  },
};

// ------------------------------------------------------------------ the Clockmaster (the Clockwork Spire)
// PROPOSAL: he sweeps the floor with his clock hand (a beam turning round him; two hands from phase two,
// turning opposite ways); he strikes the hours (twelve marks in a ring round you, going off clockwise, the
// centre last); he flings gears; a pendulum swings across you and back; a thrust of the hand up close.
// Below two thirds: he rewinds (back to where he stood three seconds ago, taking back some of the harm
// done since), and calls the spire's machines. Below a third: the gear storm.
const AUTO = ['automaton', 'sentinel'], SPIDERG = ['gearspider', 'cryptspider', 'rat'], CHRONO = ['chronoknight', 'knight'];
function hands(w, e, p, K) {
  const a0 = angTo(e, w.hero) - 1.4; const dir = w.rand() < 0.5 ? 1 : -1;
  lane(w, e, e.x, e.z, a0, { len: 9.5, through: true, width: 1.0, warn: 0.85, life: 1.5, dmg: 18 * K, kind: 'chrono', kb: 6, sweep: { a0: dir > 0 ? a0 : a0 + 2.8, a1: dir > 0 ? a0 + 2.8 : a0 } });
  if (p >= 2) { const b0 = a0 + Math.PI; lane(w, e, e.x, e.z, b0, { len: 6.5, through: true, width: 1.2, warn: 0.85, life: 2.2, dmg: 18 * K, kind: 'chrono', kb: 6, sweep: { a0: b0, a1: b0 - dir * 2.0 } }); }
  w.emit('beam', { e });
}
function hours(w, e, K, c = null) {
  const h = c || inside(w, w.hero.x, w.hero.z, 1.0); const a0 = w.rand() * TAU; const R = 3.4;
  for (let i = 0; i < 12; i++) { const a = a0 + i * TAU / 12; const x = h.x + S(a) * R, z = h.z + C(a) * R; if (free(w, x, z, 0)) spot(w, e, x, z, 0.85, { warn: 0.6 + i * 0.09, life: 0.25, dmg: 15 * K, kind: 'chrono', kb: 4 }); }
  spot(w, e, h.x, h.z, 1.9, { warn: 1.75, life: 0.3, dmg: 22 * K, kind: 'chrono', kb: 8 });
}
function pendulum(w, e, K) {
  const h = w.hero; const across = angTo(e, h) + Math.PI / 2; const piv = inside(w, h.x - S(across) * 0.01 + S(angTo(e, h)) * 5.5, h.z + C(angTo(e, h)) * 5.5, 0.6);
  const a = angTo(piv, h); const len = dist(piv, h) + 3;
  lane(w, e, piv.x, piv.z, a - 0.6, { len, through: true, width: 1.1, warn: 0.8, life: 0.8, dmg: 17 * K, kind: 'chrono', kb: 6, sweep: { a0: a - 0.6, a1: a + 0.6 } });
  lane(w, e, piv.x, piv.z, a + 0.6, { len, through: true, width: 1.1, warn: 1.75, life: 0.8, dmg: 17 * K, kind: 'chrono', kb: 6, sweep: { a0: a + 0.6, a1: a - 0.6 } });
}
function rewind(w, e) {
  const hist = e.ai.hist || []; const then = hist.find((s) => w.t - s.t >= 2.8) || hist[0]; if (!then) return;
  mark(w, { shape: 'circle', x: e.x, z: e.z, r: 1.2, life: 0.6, kind: 'rewind' });
  if (free(w, then.x, then.z, e.r)) { w.emit('blink', { e, fx: e.x, fz: e.z, x: then.x, z: then.z }); e.x = then.x; e.z = then.z; }
  const back = Math.min(e.maxHp * 0.03, Math.max(0, then.hp - e.hp)); e.hp += back; w.emit('rewind', { e, amt: Math.round(back) });
  mark(w, { shape: 'circle', x: e.x, z: e.z, r: 1.4, life: 0.8, kind: 'rewind' });
  roarPause(e, 0.2);
}
const clockmaster = {
  phases: [0.66, 0.33], keep: 4.0, turn: 4,
  moves(p) {
    const K = POWER.clockmaster; const k = p >= 3 ? 0.88 : 1;
    const m = [
      { id: 'hand', w: 2.4, max: 8, cd: 3.4, a: { name: 'hand', anim: 'sweep', dur: 1.6, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => hands(w, e, p, K) } },
      { id: 'hours', w: 2, min: 2.5, cd: 5, a: { name: 'hours', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => hours(w, e, K) } },
      { id: 'gears', w: 2, min: 3, cd: 2.8, a: quick({ name: 'gears', anim: 'aim', dur: 1.2, windup: 0.62, active: 0.64, tele: 'ray', teleRange: 12, ranged: { kind: 'gear', speed: 9.5, r: 0.34, dmg: 13 * K, life: 1.8, fan: p >= 2 ? 7 : 5, spread: deg(14) } }, k) },
      { id: 'pendulum', w: 1.5, min: 2, cd: 6, a: { name: 'pendulum', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => pendulum(w, e, K) } },
      { id: 'thrust', w: 2.4, max: 4, a: quick(strike({ name: 'thrust', anim: 'fthrust', shape: 'line', range: 4.2, width: 1.1, windup: 0.62, active: 0.78, dur: 1.3, dmg: 21 * K, kb: 7, lunge: 4, tele: 'line' }), k) },
      { id: 'tock', w: 1.6, max: 3.2, cd: 4.5, a: quick({ name: 'tock', anim: 'roar', dur: 1.5, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', radius: 3.0, offset: 0, dmg: 19 * K, kb: 9, heavy: true, onStrike: (w, e) => wave(w, e, e.x, e.z, 7.5, { r0: 3, warn: 0.15, life: 0.9, dmg: 11 * K, kind: 'chrono' }) }, k) },
    ];
    if (p >= 2) {
      m.push({ id: 'rewind', w: 1, cd: 14, run: (w, e) => rewind(w, e) });
      m.push({ id: 'machines', w: 0.9, cd: 22, run: (w, e) => { const i = (e.ai.mach = ((e.ai.mach || 0) + 1) % 3); if (i === 0) call(w, e, SPIDERG, 2, ADD_TIER.clockmaster, 5, 2, 4); else if (i === 1) call(w, e, CHRONO, 1, ADD_TIER.clockmaster, 5, 1, 4); else call(w, e, AUTO, 1, ADD_TIER.clockmaster, 5, 1, 4); roarPause(e); } });
    }
    if (p >= 3) m.push({ id: 'storm', w: 1.3, cd: 11, run: (w, e) => startRite(e, 'storm', { a0: w.rand() * TAU, dir: w.rand() < 0.5 ? 1 : -1 }) });
    return m;
  },
  // remembers where it stood (for the rewind)
  tick(w, e) { const H = (e.ai.hist ||= []); if (!H.length || w.t - H[H.length - 1].t > 0.5) { H.push({ t: w.t, x: e.x, z: e.z, hp: e.hp }); if (H.length > 10) H.shift(); } },
  // the gear storm: gears flung out in a turning spiral for three and a half seconds, the hours struck halfway
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.clockmaster; hold(w, e, 'cast');
    while (c.next <= t && c.next < 3.5) {
      for (let k = 0; k < 4; k++) fling(w, e, c.a0 + c.dir * c.next * 1.5 + k * TAU / 4, { kind: 'gear', speed: 6, dmg: 12 * K, life: 2.2 });
      if (Math.abs(c.next - 1.75) < 0.01) hours(w, e, K);
      c.next = Math.round((c.next + 0.25) * 100) / 100;
    }
    return t < 4.0;
  },
  onPhase(w, e, p) {
    if (p === 2) { call(w, e, SPIDERG, 2, ADD_TIER.clockmaster, 5, 2, 4); }
    if (p === 3) { e.speed *= 1.15; call(w, e, CHRONO, 1, ADD_TIER.clockmaster, 5, 1, 4); }
  },
};

// ------------------------------------------------------------------ the Wheel (the Empyrean, the final boss)
// PROPOSAL: the Wheel itself, rings of eyes round the bell that holds the Voice. Its gaze sweeps beams; its
// spokes thrust out of it in a star; rings of light roll out of its rim; spears of judgement fall; its rim
// presses down on whoever comes close. Each phase changes the arena: below three quarters the spokes turn
// (beams sweeping round it that stay); below a half the floor opens its eyes (a checker of the floor goes
// off, then the other half); below a quarter the rim closes (a ring shrinking onto it) and the eclipse (four
// beams wheeling round it). With the true form (the SING ending), below an eighth the Voice sings back:
// circles of song open on the floor, and the Wheel answers with Silence, a wave over the whole arena that
// spares only those standing in song; its eyes close one by one.
const ANGEL = ['hollowangel', 'seraph'], MASK = ['choirmask', 'chanter'], GILD = ['gildedknight', 'knight'];
function spokes(w, e, K, n, warn, a0 = w.rand() * TAU) {
  for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n; lane(w, e, e.x + S(a) * 1.2, e.z + C(a) * 1.2, a, { len: 13, width: 1.0, warn, life: 0.3, dmg: 17 * K, kind: 'eyebeam', kb: 5 }); }
}
// beams that turn round it and stay for six seconds (the arena changes)
function turning(w, e, K, n) {
  const a0 = w.rand() * TAU; const dir = (e.ai.turnDir = -(e.ai.turnDir || 1));
  for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n; lane(w, e, e.x + S(a) * 1.3, e.z + C(a) * 1.3, a, { len: 12, through: true, width: 0.85, warn: 1.1, life: 6, dmg: 15 * K, kind: 'spoke', kb: 4, sweep: { a0: a, a1: a + dir * 1.6 } }); }
}
// the floor opens its eyes: a checker of eyes within reach of it goes off, then the other half
function floorEyes(w, e, K) {
  const G = 2.4; const ox = e.x - Math.floor(e.x / G) * G, oz = e.z - Math.floor(e.z / G) * G; void ox; void oz;
  const h = w.hero; const cx = Math.round(h.x / G) * G, cz = Math.round(h.z / G) * G;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const x = cx + i * G, z = cz + j * G; if (!free(w, x, z, 0) || Math.hypot(x - h.x, z - h.z) > 7.5) continue;
    spot(w, e, x, z, 1.05, { warn: (i + j) & 1 ? 1.0 : 2.0, life: 0.3, dmg: 15 * K, kind: 'eyebeam', kb: 4 });
  }
}
function voiceSongs(w, e) {
  const songs = []; const h = w.hero;
  for (let k = 0; k < 40 && songs.length < 3; k++) {
    const a = w.rand() * TAU, r = 3 + w.rand() * 4; const p = inside(w, h.x + S(a) * r, h.z + C(a) * r, 1.8);
    if (!free(w, p.x, p.z, 0.6) || songs.some((s) => dist(s, p) < 3.4) || dist(p, e) < 3) continue; songs.push(p);
  }
  for (const p of songs) mark(w, { shape: 'circle', x: p.x, z: p.z, r: 1.7, life: 4.2, kind: 'song' });
  e.ai.songs = songs.map((p) => ({ ...p, r: 1.7, until: w.t + 4.2 }));
}
// the Voice's song shelters: a hazard marked silence spares a hero standing in song as it passes
function hookSong(w) {
  if (w._song) return; w._song = true; const base = w._hazards;
  w._hazards = function (h) {
    const hero = this.hero; const boss = this.ents.find((f) => f.type === 'wheel' && !f.dead);
    const songs = boss && boss.ai.songs ? boss.ai.songs.filter((s) => s.until > this.t) : [];
    if (hero && songs.some((s) => Math.hypot(hero.x - s.x, hero.z - s.z) < s.r)) for (const z of this.hazards) if (z.silence) z.hitSet.add(hero.id);
    return base.call(this, h);
  };
}
function phasesOfWheel(e) { return e && e.trueForm ? [0.75, 0.5, 0.25, 0.12] : [0.75, 0.5, 0.25]; }
const wheel = {
  phases: [0.75, 0.5, 0.25], phasesFor: phasesOfWheel, keep: 5.5, turn: 2.6,
  moves(p, e) {
    const K = POWER.wheel; const k = p >= 4 ? 0.88 : 1; const voice = p >= 5 && e && e.trueForm;
    const m = [
      { id: 'gaze', w: 2.2, min: 2.5, cd: 3.2, a: { name: 'gaze', anim: 'gaze', dur: 1.5, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
        const a0 = angTo(e, w.hero); const dir = w.rand() < 0.5 ? 1 : -1;
        for (let i = 0; i < 8; i++) { const a = a0 + dir * (i / 7 - 0.5) * 1.7; lane(w, e, e.x + S(a) * 1.2, e.z + C(a) * 1.2, a, { len: 14, width: 1.0, warn: 0.75 + i * 0.11, life: 0.22, dmg: 17 * K, kind: 'eyebeam', status: { burn: 1 } }); }
        if (p >= 3) for (let i = 0; i < 6; i++) { const a = a0 - dir * (i / 5 - 0.5) * 1.4; lane(w, e, e.x + S(a) * 1.2, e.z + C(a) * 1.2, a, { len: 14, width: 1.0, warn: 1.4 + i * 0.11, life: 0.22, dmg: 17 * K, kind: 'eyebeam' }); }
        w.emit('beam', { e });
      } } },
      { id: 'spokes', w: 2, cd: 4.5, a: { name: 'spokes', anim: 'pulse', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const a0 = w.rand() * TAU; spokes(w, e, K, 6, 0.85, a0); if (p >= 2) spokes(w, e, K, 6, 1.6, a0 + TAU / 12); } } },
      { id: 'rim', w: 1.8, max: 9, cd: 5, a: quick({ name: 'rim', anim: 'pulse', dur: 1.8, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', radius: 2.8, offset: 0, dmg: 20 * K, kb: 10, heavy: true, onStrike: (w, e) => { for (let i = 0; i < (p >= 3 ? 3 : 2); i++) wave(w, e, e.x, e.z, 11, { r0: 2.8, warn: 0.2 + i * 0.7, life: 1.5, dmg: 13 * K, kind: 'radiant' }); } }, k) },
      { id: 'judgement', w: 1.6, min: 2.5, cd: 5, a: { name: 'judgement', anim: 'gaze', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => around(w, e, p >= 3 ? 7 : 5, { warn: 0.95, gap: 0.16, r: 1.1, dmg: 17 * K, kind: 'spear' }) } },
      { id: 'press', w: 2.4, max: 4.2, cd: 2.5, a: quick({ name: 'press', anim: 'slam', dur: 1.5, windup: 0.75, active: 0.8, tele: 'circle', shape: 'circle', radius: 3.6, offset: 0, dmg: 22 * K, kb: 11, heavy: true }, k) },
    ];
    if (p >= 2) {
      m.push({ id: 'turning', w: 1.6, cd: p >= 4 ? 7 : 8.5, a: { name: 'turning', anim: 'pulse', dur: 1.3, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => turning(w, e, K, Math.min(4, p)) } });
      m.push({ id: 'host', w: 0.9, cd: 22, run: (w, e) => { const i = (e.ai.host = ((e.ai.host || 0) + 1) % 3); if (i === 0) call(w, e, MASK, 2, ADD_TIER.wheel, 6, 2, 4); else if (i === 1) call(w, e, ANGEL, 1, ADD_TIER.wheel, 6, 1, 4); else call(w, e, GILD, 1, ADD_TIER.wheel, 5, 1, 4); roarPause(e); } });
    }
    if (p >= 3) m.push({ id: 'eyes', w: 1.5, cd: 7, a: { name: 'eyes', anim: 'gaze', dur: 1.4, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => floorEyes(w, e, K) } });
    if (p >= 4) {
      m.push({ id: 'closing', w: 1.2, cd: 9, a: { name: 'closing', anim: 'pulse', dur: 1.6, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { wave(w, e, e.x, e.z, 1.6, { r0: 11, warn: 0.9, life: 2.4, dmg: 18 * K, kind: 'radiant', kb: 6 }); } } });
      m.push({ id: 'eclipse', w: 1.3, cd: 12, run: (w, e) => startRite(e, 'eclipse', { a0: w.rand() * TAU, dir: w.rand() < 0.5 ? 1 : -1 }) });
    }
    if (voice) {
      // the Voice sings back: circles of song, and the Wheel's answer, Silence over the whole floor
      m.push({ id: 'silence', w: 2.2, cd: 8, a: { name: 'silence', anim: 'pulse', dur: 2.6, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { hookSong(w); voiceSongs(w, e); wave(w, e, e.x, e.z, 18, { r0: 1.2, warn: 1.9, life: 1.8, dmg: 30 * K, kind: 'discord', kb: 8, silence: true }); w.emit('silence', { e }); } } });
      // discord: three arms of eyes spiralling out of it
      m.push({ id: 'discord', w: 1.6, cd: 6, a: { name: 'discord', anim: 'gaze', dur: 1.6, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
        const a0 = w.rand() * TAU; const dir = w.rand() < 0.5 ? 1 : -1;
        for (let i = 0; i < 9; i++) for (let k = 0; k < 3; k++) { const a = a0 + k * TAU / 3 + dir * i * 0.32; const r = 2 + i * 1.05; const x = e.x + S(a) * r, z = e.z + C(a) * r; if (free(w, x, z, 0)) spot(w, e, x, z, 0.85, { warn: 0.6 + i * 0.1, life: 0.25, dmg: 16 * K, kind: 'discord', kb: 4 }); }
      } } });
    }
    return m;
  },
  // the eclipse: four beams wheel round it for four seconds; a ring of light under it keeps the close ones off
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.wheel; hold(w, e, 'gaze');
    if (t === 0) { spot(w, e, e.x, e.z, 3.0, { warn: 0.7, life: 0.3, dmg: 18 * K, kind: 'radiant', kb: 10 }); w.emit('storm', { e }); }
    while (c.next <= t && c.next < 4.0) {
      const a = c.a0 + c.dir * c.next * 0.8;
      for (let k = 0; k < 4; k++) { const b = a + k * TAU / 4; lane(w, e, e.x + S(b) * 1.3, e.z + C(b) * 1.3, b, { len: 15, width: 0.9, warn: 0.5, life: 0.14, dmg: 13 * K, kind: 'eyebeam', kb: 4 }); }
      c.next = Math.round((c.next + 0.1) * 100) / 100;
    }
    return t < 4.7;
  },
  onPhase(w, e, p) {
    const K = POWER.wheel;
    if (p === 2) { turning(w, e, K, 2); call(w, e, MASK, 2, ADD_TIER.wheel, 6, 2, 4); }
    if (p === 3) { floorEyes(w, e, K); call(w, e, ANGEL, 1, ADD_TIER.wheel, 6, 1, 4); }
    if (p === 4) { e.speed *= 1.1; turning(w, e, K, 3); }
    if (p === 5 && e.trueForm) { e.voice = true; hookSong(w); voiceSongs(w, e); w.emit('voice', { e }); }
  },
};

export const BOSS_AI4 = { bogmother, clockmaster, wheel };

// ================================================================== Ascended forms (New Game+)
// Every boss, when e.ascended: a fourth phase (or one more than it has), at least two new moves, all its
// moves quicker in the last phase, a burst of power (speed, a ward) entering that phase, and a crown of
// light and an aura in its own colour (drawn by fx.js from e.ascended / e.ascPeak). Pure data: phases are
// health fractions; each move is a pattern from PAT with its numbers. Tune here.
//   phases: thresholds (omitted: the boss's own plus one at half its lowest); quick: windup factor in the
//   last phase; speed: speed factor on entering it; ward: a shield (fraction of max hp) on entering it;
//   hp, dmg: factors on its health and its blows (New Game+ heroes are at the level cap, so the early
//   bosses are raised to the late ones' measure); adds: [phase, unit list, n, cap] summoned on entering a phase beyond the boss's own; moves: { id, from, w, cd,
//   min, max, pat, ...pattern numbers } (dmg before the boss's power and the district's dmgMul).
export const ASCENDED = {
  gaoler: { hp: 2.6, dmg: 2.0, color: 0xffb040, power: 1.25, phases: [0.66, 0.4, 0.18], quick: 0.85, speed: 1.15, ward: 0.06, adds: [[3, ['hushed'], 2, 3]], moves: [
    { id: 'chainfall', from: 2, w: 1.4, cd: 7, pat: 'lanes', n: 4, gap: 2.4, width: 1.2, kind: 'shock', dmg: 18, anim: 'slam' },
    { id: 'lockdown', from: 3, w: 1.3, cd: 8, pat: 'crown', n: 10, R: 3.2, kind: 'fire', dmg: 17 },
  ] },
  tallow: { hp: 2.3, dmg: 1.9, color: 0xffd060, power: 1.25, phases: [0.66, 0.4, 0.18], quick: 0.85, speed: 1.1, ward: 0.05, adds: [[3, ['ghoul'], 2, 2]], moves: [
    { id: 'wickstorm', from: 2, w: 1.4, cd: 6, pat: 'spiral', arms: 3, n: 8, kind: 'fire', dmg: 15 },
    { id: 'candlefan', from: 3, w: 1.6, cd: 4, pat: 'fan', kind: 'flame', n: 7, spread: 13, speed: 7, dmg: 13 },
  ] },
  harbormaster: { hp: 1.7, dmg: 1.7, color: 0x60f0e0, power: 1.2, phases: [0.66, 0.4, 0.18], quick: 0.85, speed: 1.12, ward: 0.06, adds: [[3, ['hound'], 2, 3]], moves: [
    { id: 'tidewall', from: 2, w: 1.4, cd: 7, pat: 'lanes', n: 5, gap: 2.2, width: 1.4, kind: 'water', dmg: 17, anim: 'slam' },
    { id: 'anchors', from: 3, w: 1.4, cd: 6, pat: 'lobs', n: 3, kind: 'boulder', splash: 1.9, ring: 6, hazard: 'water', dmg: 19 },
  ] },
  deacon: { hp: 1.6, dmg: 1.6, color: 0x40ffe0, power: 1.2, phases: [0.6, 0.3, 0.14], quick: 0.85, speed: 1.12, ward: 0.06, moves: [
    { id: 'maelstrom', from: 2, w: 1.3, cd: 8, pat: 'closing', r0: 9, kind: 'water', dmg: 18 },
    { id: 'baptism', from: 3, w: 1.4, cd: 6, pat: 'cross', n: 6, kind: 'water', dmg: 17 },
  ] },
  silence: { color: 0xf0f0ff, power: 1.3, phases: [0.66, 0.33, 0.15], quick: 0.85, speed: 1.12, ward: 0.05, moves: [
    { id: 'requiem', from: 2, w: 1.3, cd: 7, pat: 'rings', n: 3, gapT: 0.55, kind: 'toll', dmg: 17, anim: 'slam' },
    { id: 'stillness', from: 3, w: 1.4, cd: 6, pat: 'crown', n: 12, R: 3.4, kind: 'lightning', dmg: 18 },
  ] },
  ossuary: { hp: 1.25, dmg: 1.4, color: 0xfff0a0, power: 1.25, phases: [0.66, 0.33, 0.15], quick: 0.85, speed: 1.12, ward: 0.06, moves: [
    { id: 'namefield', from: 2, w: 1.4, cd: 6, pat: 'star', n: 6, len: 8, kind: 'bone', dmg: 18, anim: 'slam' },
    { id: 'ossuary', from: 3, w: 1.4, cd: 5, pat: 'around', n: 8, kind: 'bone', dmg: 17 },
  ] },
  founder: { hp: 1.25, dmg: 1.3, color: 0xff8a20, power: 1.2, phases: [0.66, 0.33, 0.15], quick: 0.85, speed: 1.12, ward: 0.06, moves: [
    { id: 'bellrain', from: 2, w: 1.4, cd: 6, pat: 'lobs', n: 3, kind: 'flame', splash: 2.2, ring: 7, hazard: 'toll', dmg: 22 },
    { id: 'moltencross', from: 3, w: 1.3, cd: 7, pat: 'cross', n: 7, kind: 'fire', life: 2.5, dmg: 16 },
  ] },
  regent: { hp: 1.1, dmg: 1.2, color: 0xc8a8ff, power: 1.45, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.1, ward: 0.05, moves: [
    { id: 'mirror', from: 2, w: 1.3, cd: 7, pat: 'lanes', n: 4, gap: 2.0, width: 1.0, kind: 'toll', dmg: 17, cross: true },
    { id: 'thorns', from: 3, w: 1.3, cd: 6, pat: 'crown', n: 12, R: 2.8, kind: 'bone', dmg: 16 },
  ] },
  frostgiant: { color: 0x9ff6ff, power: 1.8, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.1, ward: 0.05, moves: [
    { id: 'glacier', from: 2, w: 1.4, cd: 7, pat: 'star', n: 5, len: 9, kind: 'ice', dmg: 16, anim: 'slam' },
    { id: 'avalanche', from: 3, w: 1.3, cd: 6, pat: 'around', n: 8, kind: 'frost', dmg: 15, status: { frost: 1 } },
  ] },
  sandwyrm: { color: 0xffc020, power: 1.8, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.1, ward: 0.05, moves: [
    { id: 'quicksand', from: 2, w: 1.3, cd: 8, pat: 'closing', r0: 8, kind: 'sand', dmg: 17 },
    { id: 'dunelash', from: 3, w: 1.4, cd: 6, pat: 'star', n: 5, len: 9, kind: 'sand', dmg: 16, anim: 'slam' },
  ] },
  lich: { color: 0x9aff50, power: 1.85, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.1, ward: 0.06, moves: [
    { id: 'danse', from: 2, w: 1.4, cd: 7, pat: 'spiral', arms: 4, n: 8, kind: 'bone', dmg: 15 },
    { id: 'soulfire', from: 3, w: 1.5, cd: 4, pat: 'fan', kind: 'soul', n: 7, spread: 15, speed: 6.5, homing: 0.6, dmg: 12 },
  ] },
  archon: { hp: 1, dmg: 0.92, color: 0xfff6c0, power: 1.9, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.08, ward: 0.05, moves: [
    { id: 'wheelfire', from: 2, w: 1.3, cd: 7, pat: 'rings', n: 3, gapT: 0.6, kind: 'hellfire', dmg: 15 },
    { id: 'starfall', from: 3, w: 1.3, cd: 6, pat: 'cross', n: 7, kind: 'sigil', dmg: 16 },
  ] },
  bogmother: { hp: 1, dmg: 0.85, color: 0x9aff70, power: 1.95, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.08, ward: 0.05, adds: [[4, ['leech', 'rat'], 3, 4]], moves: [
    { id: 'drownedtide', from: 2, w: 1.3, cd: 7, pat: 'lanes', n: 5, gap: 2.2, width: 1.3, kind: 'bog', dmg: 15, anim: 'sweep' },
    { id: 'knell', from: 3, w: 1.3, cd: 7, pat: 'lobs', n: 4, kind: 'bell', splash: 1.7, ring: 6, hazard: 'toll', dmg: 18 },
  ] },
  clockmaster: { hp: 1, dmg: 0.82, color: 0x70d0ff, power: 2.0, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.08, ward: 0.05, moves: [
    { id: 'midnight', from: 2, w: 1.3, cd: 8, pat: 'closing', r0: 9, kind: 'chrono', dmg: 17 },
    { id: 'escapement', from: 3, w: 1.3, cd: 6, pat: 'star', n: 6, len: 9, kind: 'chrono', dmg: 16, anim: 'slam' },
  ] },
  wheel: { hp: 0.9, dmg: 0.8, color: 0xffe08a, power: 2.05, quick: 0.9, speed: 1.06, ward: 0.04, moves: [
    { id: 'halo', from: 2, w: 1.3, cd: 7, pat: 'crown', n: 12, R: 3.4, kind: 'radiant', dmg: 16 },
    { id: 'thousandeyes', from: 3, w: 1.3, cd: 6, pat: 'spiral', arms: 5, n: 7, kind: 'eyebeam', dmg: 15 },
  ] },
};

// the patterns Ascended moves are made of (m: the move's numbers, K: the boss's power)
const PAT = {
  // rows of hazards radiating from the boss
  star(w, e, m, K) { const a0 = angTo(e, w.hero); for (let i = 0; i < m.n; i++) row(w, e, e.x, e.z, a0 + i * TAU / m.n, { start: 1.6, n: Math.round(m.len / 1.2), step: 1.2, warn: 0.5, gap: 0.07, r: 0.85, dmg: m.dmg * K, kind: m.kind }); },
  around(w, e, m, K) { around(w, e, m.n, { warn: 0.85, gap: 0.14, r: 1.15, dmg: m.dmg * K, kind: m.kind, near: 1.4, spread: 2.8 }); },
  // rings rolling out of the boss, one after another
  rings(w, e, m, K) { for (let i = 0; i < m.n; i++) wave(w, e, e.x, e.z, 11, { r0: 1.2, warn: 0.3 + i * m.gapT, life: 1.5, dmg: m.dmg * K, kind: m.kind }); },
  // a ring that closes on the boss from far out (stand outside it or dash through as it passes)
  closing(w, e, m, K) { wave(w, e, e.x, e.z, 1.4, { r0: m.r0, warn: 0.9, life: 2.2, dmg: m.dmg * K, kind: m.kind, kb: 6 }); },
  // a ring of marks round you, then the heart of it
  crown(w, e, m, K) {
    const h = inside(w, w.hero.x, w.hero.z, 1.0);
    for (let i = 0; i < m.n; i++) { const a = i / m.n * TAU; const x = h.x + S(a) * m.R, z = h.z + C(a) * m.R; if (free(w, x, z, 0)) spot(w, e, x, z, 0.8, { warn: 0.75, life: 0.3, dmg: m.dmg * K, kind: m.kind, kb: 4 }); }
    spot(w, e, h.x, h.z, m.R - 0.7, { warn: 1.35, life: 0.3, dmg: (m.dmg + 4) * K, kind: m.kind, kb: 8 });
  },
  // lanes across the floor towards the boss (one in two at first, the others after); m.cross: also crosswise
  lanes(w, e, m, K) {
    const a = angTo(w.hero, e); const h = w.hero; const back = { x: h.x - S(a) * 7, z: h.z - C(a) * 7 };
    const sets = m.cross ? [a, a + Math.PI / 2] : [a];
    sets.forEach((dir, si) => { for (let i = -m.n; i <= m.n; i++) { const ox = C(dir) * i * m.gap, oz = -S(dir) * i * m.gap; const bx = (si ? h.x - S(dir) * 7 : back.x) + ox, bz = (si ? h.z - C(dir) * 7 : back.z) + oz; lane(w, e, bx, bz, dir, { len: 15, through: true, width: m.width, warn: 0.8 + ((i & 1) ? 0.75 : 0) + si * 0.4, life: 0.3, dmg: m.dmg * K, kind: m.kind, kb: 5 }); } });
  },
  // a plus of rows through where you stand
  cross(w, e, m, K) { const h = inside(w, w.hero.x, w.hero.z, 1.0); const a0 = w.rand() * Math.PI / 2; for (let k = 0; k < 4; k++) row(w, e, h.x, h.z, a0 + k * Math.PI / 2, { start: k ? 1.2 : 0, n: m.n, step: 1.2, warn: 0.6, gap: 0.06, r: 0.8, life: m.life ?? 0.3, dmg: m.dmg * K, kind: m.kind }); },
  // arms of marks spiralling out of the boss
  spiral(w, e, m, K) { const a0 = w.rand() * TAU; const dir = w.rand() < 0.5 ? 1 : -1; for (let i = 0; i < m.n; i++) for (let k = 0; k < m.arms; k++) { const a = a0 + k * TAU / m.arms + dir * i * 0.34; const r = 1.8 + i * 1.1; const x = e.x + S(a) * r, z = e.z + C(a) * r; if (free(w, x, z, 0)) spot(w, e, x, z, 0.8, { warn: 0.6 + i * 0.1, life: 0.25, dmg: m.dmg * K, kind: m.kind, kb: 4 }); } },
  // things lobbed round you, each with a ring rolling out of its landing
  lobs(w, e, m, K) { const t = ahead(w, 1.0); for (let i = 0; i < m.n; i++) { const a = w.rand() * TAU, r = i ? 2.4 + w.rand() * 1.6 : 0; const q = inside(w, t.x + S(a) * r, t.z + C(a) * r, 1.2); lob(w, e, q.x, q.z, { kind: m.kind, arc: 1.0 + i * 0.15, splash: m.splash, dmg: m.dmg * K, hazard: m.hazard, kb: 7, size: 0.45 }); if (m.ring) wave(w, e, q.x, q.z, m.ring, { r0: m.splash, warn: 1.0 + i * 0.15, life: 0.9, dmg: m.dmg * 0.55 * K, kind: m.hazard }); } },
  // a fan of projectiles
  fan(w, e, m, K) { w._fire(e, { kind: m.kind, speed: m.speed, r: 0.3, dmg: m.dmg * K, life: 3, fan: m.n, spread: deg(m.spread), homing: m.homing || 0, reflect: true }); },
};
function ascMove(m, K) {
  return { id: m.id, w: m.w, cd: m.cd, min: m.min, max: m.max, a: { name: m.id, anim: m.anim || 'cast', dur: 1.45, windup: 0.62, active: 0.64, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => PAT[m.pat](w, e, m, K) } };
}
// what an ascended boss becomes on entering a phase beyond its own, or its last
function ascPhase(w, e, p, A, last) {
  for (const [ph, list, n, cap] of A.adds || []) if (ph === p) call(w, e, list, n, Math.max(e.def.tier || 0, 12), 5, cap || n, 5);
  if (p === last) {
    e.speed *= A.speed || 1.1; if (A.ward) ward(w, e, A.ward); e.ascPeak = true;
    w.emit('ascend', { e, color: A.color }); w.emit('shake', { amt: 0.8 });
  }
}

// The plan thinkBoss follows: phases, moves per phase and what happens on a phase change. For a boss that
// is not ascended this is just its own (with the wheel's true form); cached on the boss.
export function bossPlan(e, B) {
  if (e.ai._plan && e.ai._plan.B === B) return e.ai._plan;
  const own = B.phasesFor ? B.phasesFor(e) : B.phases; const ownN = own.length + 1;
  let plan;
  if (!e.ascended || !ASCENDED[e.type]) plan = { B, phases: own, moves: (p) => B.moves(p, e), onPhase: B.onPhase && ((w, e2, p) => B.onPhase(w, e2, p)) };
  else {
    const A = ASCENDED[e.type]; const phases = A.phases && !(e.trueForm && B.phasesFor) ? A.phases : [...own, Math.min(...own) * 0.5];
    const last = phases.length + 1; const K = A.power || 1.5; const extra = A.moves.map((m) => ({ m, mv: ascMove(m, K) }));
    plan = {
      B, phases,
      moves: (p) => {
        const base = B.moves(Math.min(p, ownN), e);
        const list = p >= last ? base.map((mv) => (mv.a ? { ...mv, a: quick(mv.a, A.quick || 0.88) } : mv)) : base;
        for (const { m, mv } of extra) if (p >= m.from) list.push(mv);
        return list;
      },
      onPhase: (w, e2, p) => { if (p <= ownN && B.onPhase) B.onPhase(w, e2, p); if (p > ownN || p === last) ascPhase(w, e2, p, A, last); },
    };
  }
  e.ai._plan = plan; return plan;
}
// how many phases a boss fight has (for the tests and the HUD): own, true form, ascended
export function PHASES_OF(type, o = {}) {
  const B = BOSS_AI2[type] || null; const own = B && B.phasesFor ? B.phasesFor(o) : (B ? B.phases : null);
  const base = own ? own.length + 1 : ({ gaoler: 2, tallow: 2, deacon: 3, silence: 3 })[type] || 3;
  if (!o.ascended) return base;
  const A = ASCENDED[type]; return A.phases && !(o.trueForm && B && B.phasesFor) ? A.phases.length + 1 : base + 1;
}
// called once when an ascended boss first thinks: its title says so (PROPOSAL text)
export function ascendDef(e) {
  if (!e.ascended || e.def.ascended) return;
  e.def = { ...e.def, ascended: true, title: 'Ascended. ' + e.def.title };
  const A = ASCENDED[e.type]; if (!A) return;
  e.ascColor = A.color; // fx.js draws the crown and the aura in it
  if (A.hp && A.hp !== 1) { const k = e.hp / e.maxHp; e.maxHp = Math.round(e.maxHp * A.hp); e.hp = Math.round(e.maxHp * k); }
  if (A.dmg) e.dmgMul *= A.dmg;
}

// ================================================================== entrances
// bossEntrance(type) -> { kind, dur, cam, step(world, boss, t, fx) }. game.js calls step every frame of the
// boss intro with t from 0 to dur (and once past it); while it runs the boss is untouchable and does
// nothing of its own (e.entering: thinkBoss waits), and step places it, poses it (e.anim / e.animT), and
// asks fx for the set piece, the debris and the dust. fx is null in Node: every effect is guarded. step
// returns true while the entrance runs and false once it has ended (the boss is then on its spot, idle).
const once = (S, key, fn) => { if (!S.fired.has(key)) { S.fired.add(key); fn(); } };
// the scripts: (w, e, t, fx, st) with st.home {x, z, face}, st.fired, st.dt; F(fn) runs fn only with fx
const ENTRANCES = {
  // PROPOSAL: the Gaoler kicks his way out through the wall of the gallows square
  gaoler: { kind: 'wall', dur: 3.4, cam: { zoom: 1.15 }, script(w, e, t, F, st) {
    const back = st.at(-3.2), wall = st.at(-2.4);
    once(st, 'piece', () => F((fx) => fx.setPiece('wall', wall.x, wall.z, st.home.face, { life: 4.5, burst: 1.25 })));
    for (const [k, at] of [['k1', 0.35], ['k2', 0.8]]) if (t >= at) once(st, k, () => { w.emit('shake', { amt: 0.3 }); F((fx) => fx.dust(wall.x, wall.z, 14)); });
    if (t < 1.25) { e.hidden = true; st.put(back.x, back.z); return; }
    e.hidden = false;
    once(st, 'burst', () => F((fx) => { fx.debris(wall.x, 1.2, wall.z, 26, [0.42, 0.36, 0.32], { ang: st.home.face, speed: 7, size: 0.22 }); fx.mist(wall.x, 1, wall.z, 30, [0.5, 0.48, 0.44]); fx.shockRing(wall.x, wall.z, 3, [1.6, 1.4, 1.2], 0.4); }));
    const k = ease(clamp01((t - 1.25) / 0.9)); st.put(lerp(back.x, st.home.x, k), lerp(back.z, st.home.z, k));
    if (t < 2.15) st.anim('charge', t - 1.25 + 0.85); else st.anim('roar', t - 2.15);
  } },
  // PROPOSAL: Mother Tallow comes down from the dark in a hanging cage of candles that melts open
  tallow: { kind: 'cage', dur: 3.8, cam: { zoom: 1.1, lift: 2 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('cage', st.home.x, st.home.z, st.home.face, { life: 4.4, drop: [0, 2.0, 9], melt: 2.2 })));
    const k = easeOut(clamp01(t / 2.0)); e.leapH = lerp(9, 0.4, k) * (t < 3.0 ? 1 : 1 - ease(clamp01((t - 3.0) / 0.5)));
    st.put(st.home.x, st.home.z);
    if (t >= 2.2) once(st, 'melt', () => F((fx) => { fx.embers(st.home.x, 1.5, st.home.z, 40, [3, 2, 0.8]); fx.debris(st.home.x, 2, st.home.z, 14, [0.95, 0.9, 0.75], { speed: 3, size: 0.12 }); }));
    if (t < 2.4) st.anim('idle', t); else if (t < 3.2) st.anim('cast', 0.55); else st.anim('roar', t - 3.2);
  } },
  // PROPOSAL: the Harbormaster hauls himself up out of the harbour on his chain, hand over hand
  harbormaster: { kind: 'chain', dur: 3.4, cam: { zoom: 1.15 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('chain', st.home.x, st.home.z, st.home.face, { life: 3.8, pulls: [0.6, 1.2, 1.8, 2.4], depth: 2.6 })));
    st.put(st.home.x, st.home.z);
    const pulls = [0.6, 1.2, 1.8, 2.4]; let h = -2.6;
    pulls.forEach((p0, i) => { const k = ease(clamp01((t - p0) / 0.35)); h += k * 2.6 / pulls.length; if (t >= p0) once(st, 'p' + i, () => F((fx) => { fx.splash(st.home.x, st.home.z, 18); fx.mist(st.home.x, 0.3, st.home.z, 8, [0.4, 0.55, 0.6]); })); });
    e.leapH = Math.min(0, h);
    if (t < 2.75) st.anim('aim', 0.6 + 0.2 * S(t * 9)); else { once(st, 'land', () => F((fx) => { fx.splash(st.home.x, st.home.z, 40); fx.shockRing(st.home.x, st.home.z, 3.5, [0.5, 1.4, 1.5], 0.45); })); st.anim('roar', t - 2.75); }
  } },
  // PROPOSAL: the Drowned Deacon rises out of a pool that floods up through the stones
  deacon: { kind: 'flood', dur: 3.8, cam: { zoom: 1.1 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('pool', st.home.x, st.home.z, st.home.face, { life: 4.6, r: 4.2, grow: 1.4, color: [0.16, 0.42, 0.44] })));
    st.put(st.home.x, st.home.z); e.leapH = -2.4 * (1 - ease(clamp01((t - 1.0) / 2.0)));
    if (st.every(0.35)) F((fx) => { const a = Math.random() * TAU, r = 1 + Math.random() * 3; fx.emit(st.home.x + S(a) * r, 0.1, st.home.z + C(a) * r, { n: 16, speed: 0.6, up: 1, vy: 6, life: 0.8, grav: 10, color: [0.5, 1.3, 1.4], size: 1 }); });
    if (t < 3.0) st.anim('cast', 0.55); else st.anim('roar', t - 3.0);
  } },
  // PROPOSAL: the Ossuary Knight assembles himself out of the bones scattered over the floor
  ossuary: { kind: 'bones', dur: 3.6, cam: { zoom: 1.15 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('bones', st.home.x, st.home.z, st.home.face, { life: 2.2, gather: [0.3, 1.8] })));
    st.put(st.home.x, st.home.z);
    if (t < 1.8) { e.hidden = true; return; }
    e.hidden = false; once(st, 'whole', () => F((fx) => { fx.emit(st.home.x, 1, st.home.z, { n: 40, speed: 2, up: 1, vy: 2, life: 0.8, grav: -1, color: [2.4, 2.2, 1.6], size: 1, jit: 1 }); fx.shockRing(st.home.x, st.home.z, 3, [2.4, 2.2, 1.6], 0.5); }));
    if (t < 2.8) st.anim('rise', t - 1.8); else st.anim('roar', t - 2.8);
  } },
  // PROPOSAL: the Bellfounder bursts out of a furnace in a shower of molten bronze
  founder: { kind: 'furnace', dur: 3.6, cam: { zoom: 1.1 }, script(w, e, t, F, st) {
    const fur = st.at(-3.2);
    once(st, 'piece', () => F((fx) => fx.setPiece('furnace', fur.x, fur.z, st.home.face, { life: 4.4, burst: 1.3 })));
    if (t < 1.3) { e.hidden = true; st.put(fur.x, fur.z); if (st.every(0.12)) F((fx) => fx.embers(fur.x, 1.6, fur.z, 4)); return; }
    e.hidden = false; once(st, 'burst', () => F((fx) => { fx.debris(fur.x, 1.4, fur.z, 22, [0.5, 0.3, 0.16], { ang: st.home.face, speed: 6, size: 0.2 }); fx.emit(fur.x, 1.4, fur.z, { n: 80, speed: 5, up: 1.5, vy: 3, life: 1.2, grav: 9, color: [3.2, 1.4, 0.3], size: 1, jit: 1 }); }));
    const k = clamp01((t - 1.3) / 0.8); st.put(lerp(fur.x, st.home.x, k), lerp(fur.z, st.home.z, k)); e.leapH = S(k * Math.PI) * 2.6;
    if (t < 2.1) st.anim('leap', 0.75 + k * 0.5, { windup: 0.75, active: 1.3, dur: 1.9 });
    else { once(st, 'land', () => F((fx) => { fx.shockRing(st.home.x, st.home.z, 4, [3, 1.4, 0.4], 0.5); fx.emit(st.home.x, 0.2, st.home.z, { n: 40, speed: 4, up: 1.2, vy: 2, life: 0.9, grav: 10, color: [3.2, 1.3, 0.25], size: 1 }); })); st.anim(t < 2.5 ? 'slam' : 'roar', t < 2.5 ? 1.0 + (t - 2.1) : t - 2.5, { windup: 0.9, active: 1.0, dur: 1.6 }); }
  } },
  // PROPOSAL: the Pale Regent waltzes down a staircase of light; at the foot the music stops
  regent: { kind: 'waltz', dur: 4.2, cam: { zoom: 1.1 }, script(w, e, t, F, st) {
    const top = st.at(-4.6);
    once(st, 'piece', () => F((fx) => fx.setPiece('stairs', st.home.x, st.home.z, st.home.face, { life: 4.8, steps: 5, len: 4.6, height: 2.4 })));
    const k = clamp01(t / 2.5); const step = Math.min(5, Math.floor(k * 5 + 0.0001)); const sub = ease(clamp01(k * 5 - step));
    const kk = Math.min(1, (step + sub) / 5); st.put(lerp(top.x, st.home.x, kk), lerp(top.z, st.home.z, kk)); e.leapH = 2.4 * (1 - kk);
    if (t < 2.6) { e.face = st.home.face + t * 5.2; st.anim('walk', t); }
    else if (t < 3.2) { e.face = st.home.face; st.anim('cast', 0.55); }
    else { once(st, 'stop', () => { w.emit('musicStop', { e }); F((fx) => fx.shockRing(st.home.x, st.home.z, 5, [2.2, 1.8, 2.8], 0.6)); }); e.face = st.home.face; st.anim('aim', 0.7); }
  } },
  // PROPOSAL: Saint Silence drops from the bell-frame and lands kneeling, then rises
  silence: { kind: 'drop', dur: 3.6, cam: { zoom: 1.15 }, script(w, e, t, F, st) {
    st.put(st.home.x, st.home.z);
    const k = clamp01((t - 0.3) / 0.75); e.leapH = 13 * (1 - k * k);
    if (t < 1.05) { st.anim('leap', 1.0, { windup: 0.7, active: 1.25, dur: 1.9 }); return; }
    once(st, 'land', () => F((fx) => { fx.shockRing(st.home.x, st.home.z, 6, [2.6, 2.6, 3], 0.6); fx.dust(st.home.x, st.home.z, 30); fx.bolt && fx.bolt(st.home.x, st.home.z); }));
    if (t < 1.1) once(st, 'shk', () => w.emit('shake', { amt: 0.9 }));
    if (t < 2.6) st.anim('kneel', 0.6); else if (t < 3.0) st.anim('rise', 0.6 + (t - 2.6)); else st.anim('roar', t - 3.0);
  } },
  // PROPOSAL: the Hoarfrost King stands frozen in a block of glacier ice; it cracks, and he breaks out
  frostgiant: { kind: 'glacier', dur: 3.6, cam: { zoom: 1.1 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('glacier', st.home.x, st.home.z, st.home.face, { life: 4, burst: 2.0, h: 4.6, w: 3.0 })));
    st.put(st.home.x, st.home.z);
    for (const [k, at] of [['c1', 0.8], ['c2', 1.5]]) if (t >= at) once(st, k, () => F((fx) => fx.emit(st.home.x, 2, st.home.z, { n: 18, speed: 2, up: 1, life: 0.6, grav: 8, color: [1.8, 2.6, 3], size: 1, jit: 1.5 })));
    if (t < 2.0) { st.anim('idle', 0); return; }
    once(st, 'burst', () => F((fx) => { fx.debris(st.home.x, 2, st.home.z, 30, [0.75, 0.9, 1.0], { speed: 7, size: 0.3 }); fx.mist(st.home.x, 1, st.home.z, 40, [0.8, 0.9, 1]); }));
    st.anim('roar', t - 2.0);
  } },
  // PROPOSAL: Ashmaw circles under the sand (mounds racing round), then erupts out of it
  sandwyrm: { kind: 'erupt', dur: 3.0, cam: { zoom: 1.1 }, script(w, e, t, F, st) {
    st.put(st.home.x, st.home.z);
    if (t < 1.4) { e.leapH = -3.5; const a = t * 5; if (st.every(0.08)) F((fx) => fx.emit(st.home.x + S(a) * 2.4 * (1.4 - t), 0.1, st.home.z + C(a) * 2.4 * (1.4 - t), { n: 6, speed: 1.4, up: 1.5, vy: 1.5, life: 0.6, grav: 9, color: [1.5, 1.1, 0.7], size: 2 })); return; }
    const k = clamp01((t - 1.4) / 0.6); e.leapH = k < 0.5 ? lerp(-3.5, 1.8, easeOut(k * 2)) : lerp(1.8, 0, ease((k - 0.5) * 2));
    once(st, 'burst', () => { w.emit('shake', { amt: 0.8 }); F((fx) => { fx.emit(st.home.x, 0.2, st.home.z, { n: 90, speed: 3, up: 3, vy: 5, life: 1.2, grav: 10, color: [1.6, 1.2, 0.7], colorVar: 0.3, size: 2, jit: 1.5 }); fx.shockRing(st.home.x, st.home.z, 5, [2.2, 1.6, 0.8], 0.5); }); });
    st.anim('roar', t - 1.4);
  } },
  // PROPOSAL: Abbot Morrow gathers out of a swirl of souls
  lich: { kind: 'souls', dur: 3.6, cam: { zoom: 1.15 }, script(w, e, t, F, st) {
    st.put(st.home.x, st.home.z);
    if (t < 2.0) {
      e.hidden = true;
      if (st.every(0.03)) F((fx) => { const r = 4 * (1 - t / 2.1); for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; fx.emit(st.home.x + S(a) * r, 0.6 + t * 0.6, st.home.z + C(a) * r, { n: 2, speed: 0.1, life: 0.5, grav: -0.5, color: [0.6, 2.8, 0.6], size: 1 }); } });
      return;
    }
    e.hidden = false; once(st, 'appear', () => F((fx) => { fx.shockRing(st.home.x, st.home.z, 3.5, [0.7, 2.6, 0.6], 0.5); fx.emit(st.home.x, 1.2, st.home.z, { n: 50, speed: 2.4, up: 1, life: 0.8, grav: -1, color: [0.7, 2.8, 0.6], size: 1 }); }));
    if (t < 2.9) st.anim('cast', 0.55); else st.anim('roar', t - 2.9);
  } },
  // PROPOSAL: the Hollow Archon descends in a shaft of light through the open eye of the wheel above
  archon: { kind: 'eye', dur: 4.2, cam: { zoom: 1.0, lift: 3 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('eye', st.home.x, st.home.z, st.home.face, { life: 4.6, y: 10, open: 1.0 })));
    st.put(st.home.x, st.home.z); e.leapH = lerp(10, 0, ease(clamp01((t - 1.0) / 2.2)));
    if (t < 1.0) e.hidden = true; else e.hidden = false;
    if (t < 3.2) st.anim('cast', 0.55); else { once(st, 'land', () => F((fx) => fx.shockRing(st.home.x, st.home.z, 5, [3, 2.6, 1.4], 0.6))); st.anim('roar', t - 3.2); }
  } },
  // PROPOSAL: the Bog Mother surfaces out of black water, dragging her drowned bells up with her
  bogmother: { kind: 'blackwater', dur: 4.0, cam: { zoom: 1.05 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => { fx.setPiece('pool', st.home.x, st.home.z, st.home.face, { life: 4.6, r: 4.6, grow: 0.6, color: [0.04, 0.07, 0.06] }); fx.setPiece('bells', st.home.x, st.home.z, st.home.face, { life: 4.4, n: 5, R: 3.2, rise: [1.0, 2.0] }); }));
    st.put(st.home.x, st.home.z); e.leapH = -3.4 * (1 - ease(clamp01((t - 0.8) / 2.0)));
    for (let i = 0; i < 5; i++) if (t >= 2.0 + i * 0.18) once(st, 'b' + i, () => F((fx) => { const a = i / 5 * TAU; fx.shockRing(st.home.x + S(a) * 3.2, st.home.z + C(a) * 3.2, 2.2, [1.6, 2.2, 1.4], 0.5); }));
    if (st.every(0.2)) F((fx) => fx.splash(st.home.x + (Math.random() - 0.5) * 2, st.home.z + (Math.random() - 0.5) * 2, 6));
    if (t < 3.0) st.anim('rise', clamp01((t - 0.8) / 2.0) * 0.9); else st.anim('roar', t - 3.0);
  } },
  // PROPOSAL: the Clockmaster steps out of a great clock face that swings open like a door
  clockmaster: { kind: 'clock', dur: 4.0, cam: { zoom: 1.1 }, script(w, e, t, F, st) {
    const door = st.at(-2.6);
    once(st, 'piece', () => F((fx) => fx.setPiece('clock', door.x, door.z, st.home.face, { life: 4.6, open: 1.2, r: 2.0 })));
    if (t < 1.4) { e.hidden = true; st.put(door.x, door.z); return; }
    e.hidden = false; const k = ease(clamp01((t - 1.4) / 1.4)); st.put(lerp(door.x, st.home.x, k), lerp(door.z, st.home.z, k));
    if (t < 2.8) st.anim('walk', t); else if (t < 3.4) { once(st, 'tick', () => F((fx) => fx.shockRing(st.home.x, st.home.z, 3, [1.2, 2, 3], 0.4))); st.anim('cast', 0.55); } else st.anim('idle', t);
  } },
  // PROPOSAL: the Wheel unfolds its rings of eyes round the bell that holds the Voice
  wheel: { kind: 'unfold', dur: 4.4, cam: { zoom: 0.95, lift: 2 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('beam', st.home.x, st.home.z, st.home.face, { life: 4.8, color: [3, 2.6, 1.4] })));
    st.put(st.home.x, st.home.z); st.anim('unfold', t);
    if (t >= 3.6) once(st, 'eyes', () => { w.emit('shake', { amt: 0.8 }); F((fx) => fx.shockRing(st.home.x, st.home.z, 8, [3, 2.6, 1.4], 0.7)); });
  } },
};
export function bossEntrance(type) {
  const E = ENTRANCES[type]; if (!E) return null;
  return {
    kind: E.kind, dur: E.dur, cam: E.cam || null,
    step(w, e, t, fx) {
      let st = e.ai.entr;
      if (!st || t < st.last - 0.001) {
        st = e.ai.entr = { home: { x: e.x, z: e.z, face: e.face }, fired: new Set(), last: 0, dt: 0, acc: {} };
        st.at = (d) => ({ x: st.home.x + S(st.home.face) * d, z: st.home.z + C(st.home.face) * d });
        st.put = (x, z) => { e.x = x; e.z = z; e.vx = 0; e.vz = 0; e.kbx = 0; e.kbz = 0; };
        st.anim = (name, at, atk) => { e.anim = name; e.animT = Math.max(0, at); if (atk) e.atk = atk; };
        // true once per `every` seconds (effects that drip)
        st.every = (every, key = 'e' + every) => { st.acc[key] = (st.acc[key] || 0) + st.dt; if (st.acc[key] >= every) { st.acc[key] = 0; return true; } return false; };
      }
      if (st.done) return false;
      st.dt = Math.max(0, t - st.last); st.last = t;
      const F = (fn) => { if (fx) { try { fn(fx); } catch (err) { /* an effect never breaks the fight */ } } };
      if (t >= E.dur) {
        st.done = true; e.entering = false; e.hidden = false; e.leapH = 0; e.iframes = 0; e.atk = null; e.tele = null;
        e.x = st.home.x; e.z = st.home.z; e.face = st.home.face; e.state = 'idle'; e.t = 0; e.anim = 'idle'; e.animT = 0; e.ai.cd = 0.8;
        return false;
      }
      e.entering = true; e.state = 'entrance'; e.iframes = 99; e.tele = null; e.mx = 0; e.mz = 0; e.moveSpeed = 0; e.atk = null; e.face = st.home.face;
      E.script(w, e, t, F, st);
      return true;
    },
  };
}

// the other half of the merge in bosses2.js: when this module is evaluated second
try { Object.assign(BOSSES2, BOSSES4); Object.assign(BOSS_AI2, BOSS_AI4); } catch (err) { /* bosses2.js merges */ }
