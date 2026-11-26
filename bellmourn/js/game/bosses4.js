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
import { strike, ringAt, circleAt, summon, blink, steer, BOSS_AI } from './ai.js';
import { BOSSES2, BOSS_AI2, free, adds, countOf, roarPause, row, around, combo, quick } from './bosses2.js';
import { FOES } from './defs.js';
import { UNITS } from './units.js';
import { ASCENDED5, ENTRANCES5 } from './bosses5.js';
import { interlude } from './interlude.js'; // the bosses leave the fight a while (Isaac-style) and come back changed // the five new bosses' Ascended forms and entrances (merged at the end)

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
const POWER = { bogmother: 1.95, clockmaster: 2.0, wheel: 1.85 };
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
  const eel = 0x2e4e42, belly = 0x8aa478, weed = 0x5a7a3a, bronze = 0x8a6a2a, verd = 0x4a9a7a, eye = 0x9aff70;
  for (const j of ['hipL', 'hipR']) rig.j[j].visible = false;
  part('hips', box(0.5, 0.98, 0.46), eel, 0, -0.48, -0.02); part('hips', box(0.7, 0.2, 0.7), 0x22382e, 0, -0.86, -0.06);
  for (let i = 0; i < 4; i++) part('hips', box(0.4, 0.1, 0.02), belly, 0, -0.18 - i * 0.18, 0.24);
  const segs = []; let parent = group(rig, rig.body, 0, 0.18, -0.32);
  for (let i = 0; i < 10; i++) {
    const L = 0.44, wd = 0.5 - i * 0.04, ht = 0.32 - i * 0.022;
    const g = i === 0 ? parent : group(rig, parent, 0, 0, -L); parent = g; segs.push(g);
    g.add(part('hips', box(wd, ht, L + 0.04), i % 2 ? eel : 0x3a5e4e, 0, 0, -L / 2));
    g.add(part('hips', box(0.05, 0.14, 0.2), verd, 0, ht / 2 + 0.05, -L / 2, { glow: 1.8 })); // a glowing fin
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
    look: { weapon: 'none', eyes: 0x9aff70, longHair: true, claws: 0xc8d0b0, bulk: 1.3, skirt: null, colors: { skin: 0x9aac86, hair: 0x4a6a32, tunic: 0x4a5e3e, pants: 0x2e4e42, boots: 0x2e4e42, glove: 0x8a9c76, shoulder: 0x5a7044, belt: 0x6a5a2e }, extra: bogExtra },
  },
  clockmaster: {
    name: 'The Clockmaster', title: "Who Keeps the Wheel's Time", hp: 10800, poise: 999, speed: 3.0, r: 0.75, mass: 8, scale: 1.85, boss: true,
    look: { weapon: 'none', eyes: 0x70d0ff, noHair: true, noHead: false, headSize: 0.26, cloak: true, cloakLen: [0.5, 0.52, 0.5], skirt: 0x3a2a1a, colors: { skin: 0xc8963a, tunic: 0x3a2a1a, pants: 0x2a1e12, boots: 0x1a120a, glove: 0x8a6428, shoulder: 0xc8963a, belt: 0xc8963a, trim: 0xc8963a, cloak: 0x4a2e1a, cloakDark: 0x2e1c10 }, extra: clockExtra },
  },
  wheel: {
    name: 'The Wheel', title: 'Jailer of the Voice', hp: 11400, poise: 999, speed: 1.5, r: 1.3, mass: 30, scale: 1.6, boss: true, hover: true,
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
  moves(p, e) {
    const K = POWER.bogmother; const q = p >= 3 ? 0.88 : 1; const st = e && e.mini ? 1 : p;
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
    if (st < 2) return m;
    // PROPOSAL, stage two (THE RISING WATER): the whirlpool, drowned bells skimming the water, the tide in lanes
    const m2 = m.filter((x) => !(x.id === 'mire' || (st >= 3 && (x.id === 'bells' || x.id === 'claws'))));
    m2.push({ id: 'whirlpool', w: 1.6, cd: 7, a: { name: 'whirlpool', anim: 'cast', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
      const c = inside(w, w.hero.x, w.hero.z, 1.6); pool(w, e, c.x, c.z, 3.4, { warn: 0.7, life: 2.2, dmg: 0, tick: 9, kind: 'bog', pull: 0.75 }); spot(w, e, c.x, c.z, 1.4, { warn: 2.6, life: 0.3, dmg: 24 * K, kind: 'bog', kb: 9, status: { poison: 1 } }); w.emit('splash', { e });
    } } });
    m2.push({ id: 'skim', w: 1.6, min: 2.5, cd: 5, a: quick({ name: 'skim', anim: 'sweep', dur: 1.5, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const a0 = angTo(e, w.hero); for (let i = -2; i <= 2; i++) fling(w, e, a0 + i * 0.28, { kind: 'bell', speed: 7.5, dmg: 15 * K, life: 2.2, r: 0.4, y: 0.4 }); w.emit('fire', { e, kind: 'bell' }); } }, q) });
    m2.push({ id: 'tide', w: 1.4, cd: 7.5, a: { name: 'tide', anim: 'roar', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => sweepLanes(w, e, { n: 2, gap: 2.8, width: 1.5, warn: 0.9, step: 0.3, dmg: 16 * K, kind: 'bog', status: { poison: 1 } }) } });
    if (st >= 2) m2.push({ id: 'brood', w: 0.9, cd: 20, run: (w, e) => { if (!call(w, e, LEECH, 3, ADD_TIER.bogmother, 4, 4, 6)) call(w, e, WITCH, 1, ADD_TIER.bogmother, 6, 1); roarPause(e); } });
    // PROPOSAL, stage three (THE LEVIATHAN): the hag splits open on the eel's maw; she hurls herself across the
    // marsh three times running; the hoard tolls from the corners; the drowned bells ring under the water
    if (st >= 3) {
      m2.push({ id: 'hoard', w: 1.3, cd: 12, run: (w, e) => startRite(e, 'hoard', { k: 0 }) });
      m2.push({ id: 'leviathan', w: 1.7, min: 2.5, cd: 8, run: (w, e) => startRite(e, 'leviathan', { k: 0, at: 0 }) });
      m2.push({ id: 'knell', w: 1.4, cd: 6, a: { name: 'knell', anim: 'roar', dur: 1.6, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => gapRings(w, e, e.x, e.z, { n: 3, r0: 2.6, step: 2.2, warn: 0.6, gapT: 0.5, dmg: 15 * K, kind: 'toll' }) } });
    }
    return sigFirst(e, m2);
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
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.bogmother;
    // the leviathan: three lunges across the marsh, each down a lane marked first
    if (c.id === 'leviathan') {
      e.mx = 0; e.mz = 0;
      if (c.k < 3 && t >= c.at && !c.lane) { const a = angTo(e, w.hero); const len = Math.max(3, Math.min(13, reach(w, e.x, e.z, a, 13))); c.from = { x: e.x, z: e.z }; c.lane = { a, len }; lane(w, e, e.x, e.z, a, { len, width: 2.0, warn: 0.85, life: 0.3, dmg: 24 * K, kind: 'bog', kb: 9 }); c.go = t + 0.85; e.face = a; }
      if (c.lane && t >= c.go) { const k = clamp01((t - c.go) / 0.25); const d = Math.max(0, c.lane.len - 1.4) * easeOut(k); const nx = c.from.x + S(c.lane.a) * d, nz = c.from.z + C(c.lane.a) * d; if (free(w, nx, nz, e.r * 0.6)) { e.x = nx; e.z = nz; } e.anim = 'fthrust'; e.animT = 1.0;
        if (k >= 1) { wave(w, e, e.x, e.z, 5, { r0: 1.2, warn: 0.05, life: 0.7, dmg: 11 * K, kind: 'bog' }); w.emit('shake', { amt: 0.5 }); c.lane = null; c.k++; c.at = t + 0.35; } }
      else if (!c.lane) hold(w, e, 'roar');
      return c.k < 3 || t < c.at + 0.4;
    }
    // the hoard: drowned bells toll from the four corners in turn (rings rolling in), then all at once
    hold(w, e, 'cast');
    const [x0, z0, x1, z1] = w.bounds; const cx = (Math.max(x0, e.x - 9) + Math.min(x1, e.x + 9)) / 2, cz = (Math.max(z0, e.z - 9) + Math.min(z1, e.z + 9)) / 2;
    const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => inside(w, cx + a * 6, cz + b * 6, 1.5));
    while (c.next <= t && c.next < 4.0) {
      const i = Math.round(c.next / 0.8); const all = i >= 4;
      for (const [k, q] of P.entries()) if (all || k === i) { mark(w, { shape: 'circle', x: q.x, z: q.z, r: 0.9, life: 0.8, kind: 'bellmark' }); wave(w, e, q.x, q.z, 9, { r0: 0.8, warn: 0.45, life: 1.6, dmg: 13 * K, kind: 'toll' }); }
      c.next = Math.round((c.next + 0.8) * 100) / 100;
    }
    return t < 4.6;
  },
  // the arena: the water rises (foul pools spreading over the marsh), then the dark and the marsh gas
  tick(w, e) {
    if (e.mini || e.dead || away(e) || w.interlude) return; const K = POWER.bogmother; const h = w.hero; if (!h) return;
    e.dark = e.form >= 3 ? 0.4 : 0;
    if (e.form >= 2 && beat(w, e, 'flood', 2.8) && onFloor(w, e, 'deepwater') < 5) { const q2 = nearPt(w, h.x, h.z, 2.5, 6.5, 0.6); if (q2) pool(w, e, q2.x, q2.z, 1.8, { warn: 1.0, life: 9, dmg: 3 * K, kind: 'deepwater', status: { poison: 1 } }); }
    if (e.form >= 3 && beat(w, e, 'gas', 1.8)) { const q2 = nearPt(w, h.x, h.z, 1, 5.5, 0); if (q2) spot(w, e, q2.x, q2.z, 1.15, { warn: 1.05, life: 0.3, dmg: 13 * K, kind: 'poison', status: { poison: 1 } }); }
  },
  onPhase(w, e, p) {
    const K = POWER.bogmother;
    if (p === 2) {
      e.ai.dig = null; e.hidden = false; e.r = e.def.r;
      // PROPOSAL: she sinks into the black water and her brood comes for you, the tide rolling in lanes
      goAway(w, e, { kind: 'waves', leave: 'sink', banner: 'FEND OFF HER BROOD', dur: 22,
        tier: ADD_TIER.bogmother, waves: [[[LEECH, 3]], [[LEECH, 2], [WITCH, 1]], [[TROLL, 1], [LEECH, 2]]],
        pattern: (w2) => { if (beat(w2, e, 'iltide', 3.4)) sweepLanes(w2, e, { n: 2, gap: 3.0, width: 1.4, warn: 1.1, step: 0.35, dmg: 13 * K, kind: 'bog' }); },
        back: { entrance: 'surface' }, onReturn: (w2, e2) => { form(w2, e2, 2); sig(w2, e2, 'whirlpool'); e2.speed *= 1.1; wave(w2, e2, e2.x, e2.z, 9, { r0: 2, warn: 0.3, life: 1.1, dmg: 12 * K, kind: 'bog' }); } });
      return;
    }
    if (p === 3) { form(w, e, 3); e.speed *= 1.1; call(w, e, TROLL, 1, TROLL.find(known) === 'brute' ? 6 : ADD_TIER.bogmother, 5, 1); startRite(e, 'leviathan', { k: 0, at: 0.4 }); }
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
  moves(p, e) {
    const K = POWER.clockmaster; const k = p >= 3 ? 0.88 : 1; const st = e && e.mini ? 1 : p;
    const m = [
      { id: 'hand', w: 2.4, max: 8, cd: 3.4, a: { name: 'hand', anim: 'sweep', dur: 1.6, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => hands(w, e, p, K) } },
      { id: 'hours', w: 2, min: 2.5, cd: 5, a: { name: 'hours', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => hours(w, e, K) } },
      { id: 'gears', w: 2, min: 3, cd: 2.8, a: quick({ name: 'gears', anim: 'aim', dur: 1.2, windup: 0.62, active: 0.64, tele: 'ray', teleRange: 12, ranged: { kind: 'gear', speed: 9.5, r: 0.34, dmg: 13 * K, life: 1.8, fan: p >= 2 ? 7 : 5, spread: deg(14) } }, k) },
      { id: 'pendulum', w: 1.5, min: 2, cd: 6, a: { name: 'pendulum', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => pendulum(w, e, K) } },
      { id: 'thrust', w: 2.4, max: 4, a: quick(strike({ name: 'thrust', anim: 'fthrust', shape: 'line', range: 4.2, width: 1.1, windup: 0.62, active: 0.78, dur: 1.3, dmg: 21 * K, kb: 7, lunge: 4, tele: 'line' }), k) },
      { id: 'tock', w: 1.6, max: 3.2, cd: 4.5, a: quick({ name: 'tock', anim: 'roar', dur: 1.5, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', radius: 3.0, offset: 0, dmg: 19 * K, kb: 9, heavy: true, onStrike: (w, e) => wave(w, e, e.x, e.z, 7.5, { r0: 3, warn: 0.15, life: 0.9, dmg: 11 * K, kind: 'chrono' }) }, k) },
    ];
    if (st < 2) return m;
    // PROPOSAL, stage two (THE UNWOUND): his coat plates gone, a second ring of gears at his back; he rewinds,
    // calls the machines, stops time (marks laid all round you go off at one stroke, but for one way out) and
    // rolls gears down the floor in lanes
    const m2 = m.filter((x) => !(x.id === 'pendulum' || (st >= 3 && (x.id === 'thrust' || x.id === 'tock' || x.id === 'hours'))));
    m2.push({ id: 'rewind', w: 1, cd: 14, run: (w, e) => rewind(w, e) });
    m2.push({ id: 'machines', w: 0.9, cd: 22, run: (w, e) => { const i = (e.ai.mach = ((e.ai.mach || 0) + 1) % 3); if (i === 0) call(w, e, SPIDERG, 2, ADD_TIER.clockmaster, 5, 2, 4); else if (i === 1) call(w, e, CHRONO, 1, ADD_TIER.clockmaster, 5, 1, 4); else call(w, e, AUTO, 1, ADD_TIER.clockmaster, 5, 1, 4); roarPause(e); } });
    m2.push({ id: 'timestop', w: 1.6, cd: 7, a: { name: 'timestop', anim: 'cast', dur: 1.6, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => timestop(w, e, K) } });
    m2.push({ id: 'gearlanes', w: 1.5, cd: 6, a: { name: 'gearlanes', anim: 'sweep', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => sweepLanes(w, e, { n: 2, gap: 2.7, width: 1.2, warn: 0.85, step: 0.32, dmg: 16 * K, kind: 'chrono', ang: angTo(e, w.hero) + Math.PI / 2 }) } });
    // PROPOSAL, stage three (MIDNIGHT): the face cracked and the blue core of him bare; the gear storm, midnight
    // (twelve hands striking out of him one after another round the dial) and the echo (what he did a moment
    // ago happens again where he stood)
    if (st >= 3) {
      m2.push({ id: 'storm', w: 1.3, cd: 11, run: (w, e) => startRite(e, 'storm', { a0: w.rand() * TAU, dir: w.rand() < 0.5 ? 1 : -1 }) });
      m2.push({ id: 'midnight', w: 1.7, cd: 6, a: { name: 'midnight', anim: 'cast', dur: 1.6, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const a0 = angTo(e, w.hero); for (let i = 0; i < 12; i++) { const a = a0 + i * TAU / 12; lane(w, e, e.x + S(a) * 0.9, e.z + C(a) * 0.9, a, { len: 11, width: 0.9, warn: 0.7 + i * 0.11, life: 0.22, dmg: 16 * K, kind: 'chrono' }); } } } });
      m2.push({ id: 'echo', w: 1.4, max: 6, cd: 7, a: quick({ name: 'echo', anim: 'roar', dur: 1.5, windup: 0.75, active: 0.77, tele: 'circle', shape: 'circle', radius: 3.0, offset: 0, dmg: 19 * K, kb: 9, heavy: true, onStrike: (w, e) => { const x = e.x, z = e.z; mark(w, { shape: 'circle', x, z, r: 1.2, life: 1.4, kind: 'rewind' }); spot(w, e, x, z, 3.0, { warn: 1.4, life: 0.3, dmg: 17 * K, kind: 'chrono', kb: 8 }); wave(w, e, x, z, 8, { r0: 3, warn: 1.45, life: 0.9, dmg: 11 * K, kind: 'chrono' }); } }, k) });
    }
    return sigFirst(e, m2);
  },
  // remembers where it stood (for the rewind); the arena: the floor's gears turn, then the hours strike all over
  tick(w, e) {
    const H = (e.ai.hist ||= []); if (!H.length || w.t - H[H.length - 1].t > 0.5) { H.push({ t: w.t, x: e.x, z: e.z, hp: e.hp }); if (H.length > 10) H.shift(); }
    if (e.mini || e.dead || away(e) || w.interlude) return; const K = POWER.clockmaster; const h = w.hero; if (!h) return;
    const piv = e.ai.home0 || (e.ai.home0 = { x: e.x, z: e.z });
    if (e.form >= 2 && beat(w, e, 'cogs', 8.5)) { const a0 = w.rand() * TAU, dir = (e.ai.cogDir = -(e.ai.cogDir || 1)); for (const b of [a0, a0 + Math.PI]) lane(w, e, piv.x, piv.z, b, { len: 10, through: true, width: 0.8, warn: 1.2, life: 3.0, dmg: 13 * K, kind: 'chrono', kb: 4, sweep: { a0: b, a1: b + dir * 1.7 } }); }
    if (e.form >= 3 && beat(w, e, 'strike', 2.4)) { const q2 = nearPt(w, h.x, h.z, 0.5, 5.5, 0); if (q2) spot(w, e, q2.x, q2.z, 1.0, { warn: 1.0, life: 0.25, dmg: 13 * K, kind: 'chrono' }); }
  },
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
    const K = POWER.clockmaster;
    if (p === 2) {
      // PROPOSAL: he steps back into the great clock; its four escapements tick round the room while the
      // pendulums swing through it; break them and the clock throws him out
      goAway(w, e, { kind: 'targets', leave: 'fade', banner: 'BREAK THE ESCAPEMENTS', dur: 22, targets: { type: 'escapement', n: 4, hp: 85, name: 'Escapement' },
        pattern: (w2) => { if (beat(w2, e, 'ilpend', 2.6)) { const h = w2.hero; const a = w2.rand() * TAU; const piv = inside(w2, h.x + S(a) * 5, h.z + C(a) * 5, 0.6); const b = angTo(piv, h); w2.addHazard({ shape: 'line', x: piv.x, z: piv.z, face: b - 0.7, len: 9, width: 1.1, warn: 1.1, life: 0.9, dmg: 14 * K * e.dmgMul, src: e, kind: 'chrono', kb: 6, sweep: { a0: b - 0.7, a1: b + 0.7 } }); } },
        back: { entrance: 'clock' }, onReturn: (w2, e2) => { form(w2, e2, 2); sig(w2, e2, 'timestop'); call(w2, e2, SPIDERG, 2, ADD_TIER.clockmaster, 5, 2, 4); } });
      return;
    }
    if (p === 3) { form(w, e, 3); e.speed *= 1.15; call(w, e, CHRONO, 1, ADD_TIER.clockmaster, 5, 1, 4); startRite(e, 'storm', { a0: w.rand() * TAU, dir: 1 }); }
  },
};
// time stops: marks laid in a grid round you, all struck at one stroke; one row of them is left open
function timestop(w, e, K) {
  const h = inside(w, w.hero.x, w.hero.z, 1.0); const G = 1.9; const open = Math.floor(w.rand() * 5) - 2; const vert = w.rand() < 0.5;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) { if ((vert ? i : j) === open) continue; const x = h.x + i * G, z = h.z + j * G; if (free(w, x, z, 0)) spot(w, e, x, z, 0.95, { warn: 1.5, life: 0.3, dmg: 18 * K, kind: 'chrono', kb: 5 }); }
  w.emit('timestop', { e });
}

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
      { id: 'press', w: 1.7, max: 4.2, cd: 3.6, a: quick({ name: 'press', anim: 'slam', dur: 1.6, windup: 0.9, active: 0.95, tele: 'circle', shape: 'circle', radius: 3.4, offset: 0, dmg: 22 * K, kb: 11, heavy: true }, k) },
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
    // PROPOSAL, stage three (THE CRACKED BELL, after it falls back out of the sky): the rim rolls across the floor
    // like a wheel of fire, a crown of spears comes down round you, and its eyes weep light in falling rows
    if (p >= 4 && !(e && e.mini)) {
      m.push({ id: 'rimroll', w: 1.5, cd: 7, a: { name: 'rimroll', anim: 'pulse', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => rimRoll(w, e, K) } });
      m.push({ id: 'crown', w: 1.4, cd: 6, a: { name: 'crown', anim: 'gaze', dur: 1.4, windup: 0.55, active: 0.57, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const h = inside(w, w.hero.x, w.hero.z, 1.0); for (const [R, n, warn] of [[4.0, 14, 0.75], [2.4, 9, 1.1]]) for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = h.x + S(a) * R, z = h.z + C(a) * R; if (free(w, x, z, 0)) spot(w, e, x, z, 0.8, { warn, life: 0.3, dmg: 16 * K, kind: 'spear', kb: 4 }); } spot(w, e, h.x, h.z, 1.5, { warn: 1.5, life: 0.3, dmg: 20 * K, kind: 'radiant', kb: 8 }); } } });
      m.push({ id: 'tears', w: 1.3, cd: 7, a: { name: 'tears', anim: 'gaze', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => sweepLanes(w, e, { n: 2, gap: 2.6, width: 1.2, warn: 0.85, step: 0.26, dmg: 16 * K, kind: 'radiant' }) } });
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
    return sigFirst(e, m);
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
  // the arena: from stage two the sky turns (beams wheeling round where it first stood); from stage three the
  // light fails but for the Wheel, and judgement keeps falling
  tick(w, e) {
    if (e.mini || e.dead || away(e) || w.interlude) return; const K = POWER.wheel; const h = w.hero; if (!h) return;
    e.dark = e.form >= 3 ? 0.42 : 0;
    if (e.form >= 2 && beat(w, e, 'sky', 12)) turning(w, e, K, e.form >= 3 ? 3 : 2);
    if (e.form >= 3 && beat(w, e, 'judge', 2.2)) { const q = nearPt(w, h.x, h.z, 0.5, 6, 0); if (q) spot(w, e, q.x, q.z, 1.0, { warn: 1.05, life: 0.3, dmg: 14 * K, kind: 'spear' }); }
  },
  onPhase(w, e, p) {
    const K = POWER.wheel;
    if (p === 2 && !e.mini) {
      // PROPOSAL: the Wheel turns away into the sky; its eyes come down and hang over the floor, watching; put
      // them out while judgement falls; each one put out brings it back sooner and hurt
      goAway(w, e, { kind: 'targets', leave: 'fly', banner: 'PUT OUT ITS EYES', dur: 24, targets: { type: 'eye', n: 6, hp: 70, radius: 5.2, name: 'Eye of the Wheel' },
        pattern: (w2) => { const h = w2.hero; if (beat(w2, e, 'ilspear', 1.1)) { const q = nearPt(w2, h.x, h.z, 0, 4.5, 0); if (q) spot(w2, e, q.x, q.z, 1.0, { warn: 1.0, life: 0.3, dmg: 13 * K, kind: 'spear' }); } if (beat(w2, e, 'ilgaze', 3.2)) { const a = w2.rand() * TAU; lane(w2, e, h.x - S(a) * 8, h.z - C(a) * 8, a, { len: 16, through: true, width: 1.1, warn: 1.1, life: 0.25, dmg: 14 * K, kind: 'eyebeam' }); } },
        back: { entrance: 'descend' }, onReturn: (w2, e2) => { form(w2, e2, 2); sig(w2, e2, 'turning'); turning(w2, e2, K, 2); call(w2, e2, MASK, 2, ADD_TIER.wheel, 6, 2, 4); } });
      return;
    }
    if (p === 4 && !e.mini) {
      // PROPOSAL: it rises again and comes down rolling: its rim crosses the floor from every side and rings of
      // light close in; survive the turning; it lands cracked, the Voice's light leaking out of the bell
      goAway(w, e, { kind: 'gauntlet', leave: 'fly', banner: 'SURVIVE THE TURNING', dur: 16,
        pattern: (w2, t) => turningGauntlet(w2, e, t),
        back: { entrance: 'slam' }, onReturn: (w2, e2) => { form(w2, e2, 3); sig(w2, e2, 'rimroll'); e2.speed *= 1.1; turning(w2, e2, K, 3); call(w2, e2, GILD, 1, ADD_TIER.wheel, 5, 1, 4); } });
      return;
    }
    if (p === 2) { turning(w, e, K, 2); call(w, e, MASK, 2, ADD_TIER.wheel, 6, 2, 4); }
    if (p === 3) { floorEyes(w, e, K); call(w, e, ANGEL, 1, ADD_TIER.wheel, 6, 1, 4); }
    if (p === 4) { e.speed *= 1.1; turning(w, e, K, 3); }
    if (p === 5 && e.trueForm) { e.voice = true; hookSong(w); voiceSongs(w, e); w.emit('voice', { e }); }
  },
};
// the rim rolls: a broad band of fire crossing the floor, the way it rolls marked first
function rimRoll(w, e, K, o = {}) {
  const h = w.hero; const a = o.ang ?? angTo(e, h) + Math.PI / 2 * (w.rand() < 0.5 ? 1 : -1); const side = { x: C(a), z: -S(a) };
  const start = { x: h.x - side.x * 9, z: h.z - side.z * 9 };
  w.addHazard({ shape: 'line', x: start.x - S(a) * 9, z: start.z - C(a) * 9, face: a, len: 18, width: 2.2, warn: o.warn ?? 1.1, life: 0.3, dmg: 20 * K * e.dmgMul, src: e, kind: 'radiant', kb: 9 });
  for (let i = 1; i <= 4; i++) { const x = start.x + side.x * i * 3.6, z = start.z + side.z * i * 3.6; w.addHazard({ shape: 'line', x: x - S(a) * 9, z: z - C(a) * 9, face: a, len: 18, width: 2.2, warn: (o.warn ?? 1.1) + i * 0.32, life: 0.3, dmg: 20 * K * e.dmgMul, src: e, kind: 'radiant', kb: 9 }); }
}
// the turning (the Wheel's second interlude): the rim crosses the floor, rings close in, spokes of light
function turningGauntlet(w, e, t) {
  const K = POWER.wheel; const h = w.hero;
  if (beat(w, e, 'tgrim', 3.6)) rimRoll(w, e, K, { ang: w.rand() * TAU, warn: 1.2 });
  if (t > 4 && beat(w, e, 'tgring', 5.0)) wave(w, e, h.x, h.z, 1.2, { r0: 8, warn: 1.0, life: 2.0, dmg: 15 * K, kind: 'radiant', kb: 6 });
  if (beat(w, e, 'tgspear', 1.2)) { const q = nearPt(w, h.x, h.z, 0, 4, 0); if (q) spot(w, e, q.x, q.z, 1.0, { warn: 1.0, life: 0.3, dmg: 13 * K, kind: 'spear' }); }
}

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
  bogmother: { hp: 1, dmg: 0.78, color: 0x9aff70, power: 1.95, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.08, ward: 0.05, adds: [[4, ['leech', 'rat'], 3, 4]], moves: [
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
  evolveAll(); // Act II's stages (below), laid over bosses3.js the first time
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
  const B = BOSS_AI2[type] || BOSS_AI[type] || null; const own = B && B.phasesFor ? B.phasesFor(o) : (B ? B.phases : null);
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
export const ENTRANCES = {
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
  // (reworked: the Gaoler has the cages now; she comes down on a great iron chandelier of candles)
  tallow: { kind: 'chandelier', dur: 3.8, cam: { zoom: 1.1, lift: 2 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('chandelier', st.home.x, st.home.z, st.home.face, { life: 4.4, drop: [0, 2.0, 9], melt: 2.4 })));
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
    once(st, 'piece', () => F((fx) => fx.setPiece('pool', st.home.x, st.home.z, st.home.face, { life: 4.6, r: 4.2, grow: 1.4, color: [0.05, 0.16, 0.18] })));
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

// ================================================================== stages (the Ascent, docs/ASCENT_DESIGN.md §3)
// Every boss of Acts II and III and the run's five bosses changes at each stage, Isaac-style: a new set of
// moves (not only quicker ones), a new look (e.form, read by its body in js/actors: 1, 2, 3), a changed arena
// (hazards it keeps laying while that stage lasts) and at least one interlude (interlude.js): it leaves the
// fight, the warden destroys targets, fends off waves, survives a pattern or hunts it as it surfaces, and it
// comes back changed. A returning mini-boss (e.mini) keeps its one stage: no interlude, no new form.
// Act III's bosses (above) and the run's five (bosses5.js) carry their stages in their own move lists; Act II's
// (bosses3.js) get theirs here, laid over their move sets in place (evolve2) the first time one thinks.
//
// PROPOSAL: every stage, move, arena change and banner below.
export function form(w, e, f) { if (e.mini || (e.form || 1) >= f) return; e.form = f; w.emit('form', { e, form: f }); w.emit('shake', { amt: 0.8 }); }
// true once every `s` seconds (the first after half of that), per boss and key: the arena's beat
export function beat(w, e, key, s) { const k = 'bt_' + key; if (e.ai[k] === undefined) e.ai[k] = w.t + s * 0.5; if (w.t < e.ai[k]) return false; e.ai[k] = w.t + s; return true; }
// its signature: the first move it makes in a new stage is one of that stage's own (e.ai.sig, set on its return)
export function sigFirst(e, list) {
  const s = e && e.ai && e.ai.sig; if (!s) return list; const m = list.find((x) => x.id === s.id);
  if (!m) return list;
  return [{ id: m.id, w: 1, run: (w, e2) => { e2.ai.sig = null; if (m.cd) e2.ai['cd_' + m.id] = w.t + m.cd; if (m.run) m.run(w, e2); else w.foeAttack(e2, m.a); } }];
}
const sig = (w, e, id) => { e.ai.sig = { id, until: w.t + 8 }; };
// a free point rMin..rMax from (cx, cz), or null
export function nearPt(w, cx, cz, rMin, rMax, m = 0.4) {
  for (let k = 0; k < 16; k++) { const a = w.rand() * TAU, r = rMin + w.rand() * (rMax - rMin); const p = inside(w, cx + S(a) * r, cz + C(a) * r, 1.2); if (free(w, p.x, p.z, m)) return p; }
  return null;
}
// how many of this boss's hazards of a kind are still on the floor (caps what the arena keeps laying)
export const onFloor = (w, e, kind) => w.hazards.reduce((n, z) => n + (z.src === e && z.kind === kind && !z.dead ? 1 : 0), 0);
// a pool that stays: a little harm every half second and its status (never a stagger); warned first
export function pool(w, e, x, z, r, o) { return w.addHazard({ shape: 'circle', x, z, r, warn: o.warn ?? 1.0, life: o.life ?? 6, dmg: (o.dmg ?? 4) * e.dmgMul, tick: o.tick ?? 0.5, src: e, kind: o.kind, status: o.status, pull: o.pull, kb: 0 }); }
// rings of marks round (cx, cz), each with a gap to step through (the Pyre Saint's rings, for anyone)
export function gapRings(w, e, cx, cz, o) {
  for (let i = 0; i < o.n; i++) {
    const R = (o.r0 ?? 2.2) + i * (o.step ?? 2.1); const n = Math.max(5, Math.round(TAU * R / 1.85)); const gap = w.rand() * TAU; const gw = o.gap ?? 0.55;
    for (let k = 0; k < n; k++) { const a = k / n * TAU; let d = a - gap; d = Math.atan2(S(d), C(d)); if (Math.abs(d) < gw) continue; const x = cx + S(a) * R, z = cz + C(a) * R; if (free(w, x, z, 0)) spot(w, e, x, z, 0.82, { warn: (o.warn ?? 0.8) + i * (o.gapT ?? 0.45), life: o.life ?? 0.3, dmg: o.dmg, kind: o.kind, kb: 4, status: o.status }); }
  }
}
// lanes swept across the floor from one side, one after another (a gap between them to stand in)
export function sweepLanes(w, e, o) {
  const h = w.hero; const a = o.ang ?? angTo(e, h); const px = C(a), pz = -S(a); const base = { x: h.x - S(a) * 9, z: h.z - C(a) * 9 }; const off = (w.rand() - 0.5) * 1.4;
  for (let i = -(o.n || 2); i <= (o.n || 2); i++) { const q = i * (o.gap || 2.6) + off; lane(w, e, base.x + px * q, base.z + pz * q, a, { len: 18, through: true, width: o.width || 1.3, warn: (o.warn ?? 0.9) + (i + (o.n || 2)) * (o.step ?? 0.25), life: o.life ?? 0.3, dmg: o.dmg, kind: o.kind, kb: 5, status: o.status }); }
}
// the interlude: interlude.js when it is there (and never for a mini-boss); without it, the stage changes at once
// spec as interlude.js takes it, with three conveniences: back.entrance may name the look of the return (mapped
// onto interlude.js's four), hits: n means a chase of n hits, and waves on any other kind come as adds every
// addsGap seconds while it is away (the targets kind with waves: break the pylons while the wraiths come)
const ENTR = { burst: 'rise', erupt: 'rise', surface: 'rise', souls: 'drop', descend: 'drop', clock: 'rush' };
export function goAway(w, e, spec) {
  if (e.mini) return null;
  const s = { ...spec };
  if (s.back && ENTR[s.back.entrance]) s.back = { ...s.back, entrance: ENTR[s.back.entrance] };
  if (s.hits && !s.chase) s.chase = { hits: s.hits, surface: s.surface ?? 1.9, gap: s.gap ?? 0.9 };
  if (s.waves) s.waves = s.waves.map((wv) => wv.map(([t, n]) => [Array.isArray(t) ? (t.find(known) || 'hushed') : t, n]));
  if (s.kind !== 'waves' && s.waves) {
    const list = s.waves; delete s.waves; const gap = s.addsGap || 7; const pat = s.pattern; let i = 0;
    s.pattern = (w2, t, dt, H) => { if (pat) pat(w2, t, dt, H); if (i < list.length && t >= 1.2 + i * gap) { for (const [type, n] of list[i]) addsNear(w2, e, type, n, s.tier ?? 1); i++; } };
  }
  return interlude(w, e, s);
}
// servants come out of the dark round the warden while the boss is away
function addsNear(w, e, type, n, tier) {
  if (!known(type)) type = 'hushed'; const h = w.hero; if (!h) return;
  for (let i = 0; i < n; i++) { const q = nearPt(w, h.x, h.z, 4.5, 7.5, 0.6); if (!q || !w.clear(h, q)) continue; const f = w.spawnFoe(type, q.x, q.z, { tier, aggro: true }); f.ai.locked = true; }
  w.emit('summon', { e });
}
const away = (e) => !!(e.away || e.hidden);

// ------------------------------------------------------------------ Act II, laid over bosses3.js
const P2 = { frostgiant: 1.8, sandwyrm: 1.8, lich: 1.85, archon: 1.9 };
const WRAITH3 = ['icewraith', 'shade'], WOLF3 = ['frostwolf', 'hound'];
const T2 = { frostgiant: 7, sandwyrm: 8, lich: 8, archon: 9 };
const drop = (list, ids) => list.filter((m) => !ids.includes(m.id));
const STAGES2 = {
  // PROPOSAL: the Hoarfrost King. At two thirds he freezes himself into a block of glacier while frost wraiths
  // come down the pass; break the three ice pylons that feed it and the block bursts. Stage two, RIMECLAD:
  // armoured in glacier plate, his club a glacier; he raises walls of ice spikes, quakes the floor in rings
  // with one gap, flings hail; the frost creeps over the floor in patches that chill. Stage three, SHATTERED:
  // the armour bursts and the heart of ice blazes through the cracks; he smashes the floor three times in
  // stars of spikes, throws an avalanche across the field and swings three times; a blizzard drops icicles.
  frostgiant: {
    moves(p, e, base) {
      if (p < 2 || e.mini) return base; const K = P2.frostgiant; const q = p >= 3 ? 0.88 : 1;
      const m = drop(base, p >= 3 ? ['boulder', 'charge', 'rime', 'stomp', 'icicles', 'pack'] : ['boulder', 'charge', 'rime']);
      // walls of ice: three rows of spikes toward you; the ground they cross stays frozen a while
      m.push({ id: 'glacier', w: 2, min: 2, cd: 6, a: { name: 'glacier', anim: 'slam', dur: 1.7, windup: 0.8, active: 0.85, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => {
        const a0 = angTo(e2, w.hero); for (const o of [-0.5, 0, 0.5]) { row(w, e2, e2.x, e2.z, a0 + o, { start: 1.6, n: 8, step: 1.2, warn: 0.5, gap: 0.08, r: 0.85, dmg: 16 * K, kind: 'ice' }); lane(w, e2, e2.x + S(a0 + o) * 1.6, e2.z + C(a0 + o) * 1.6, a0 + o, { len: 9.6, width: 1.0, warn: 1.3, life: 3.5, dmg: 0, kind: 'frost' }); }
      } } });
      // the quake: rings of ice spikes rolling out of him, each with one gap
      m.push({ id: 'rimequake', w: 1.7, cd: 6.5, a: quick({ name: 'rimequake', anim: 'slam', shape: 'circle', offset: 0, radius: 2.0, windup: 0.85, active: 0.9, dur: 1.7, dmg: 18 * K, kb: 8, tele: 'circle', heavy: true, onStrike: (w, e2) => gapRings(w, e2, e2.x, e2.z, { n: 3, r0: 3.0, step: 2.0, warn: 0.35, gapT: 0.4, dmg: 15 * K, kind: 'ice', status: { frost: 1 } }) }, q) });
      // hail: a fan of ice flung from the club
      m.push({ id: 'hail', w: 1.6, min: 3, cd: 4.5, a: quick({ name: 'hail', anim: 'sweep', dur: 1.4, windup: 0.65, active: 0.67, tele: 'ray', teleRange: 10, ranged: { kind: 'boulder', speed: 8.5, r: 0.32, dmg: 13 * K, life: 2, fan: 7, spread: deg(11), status: { frost: 1 } } }, q) });
      if (p >= 3) {
        m.push({ id: 'shatter', w: 1.6, cd: 8, run: (w, e2) => startRite(e2, 'shatter', { a0: w.rand() * TAU }) });
        m.push({ id: 'avalanche', w: 1.4, min: 2.5, cd: 7, a: { name: 'avalanche', anim: 'slam', dur: 1.6, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => {
          const h = w.hero; const a = angTo(e2, h) + Math.PI / 2; for (let i = -3; i <= 3; i++) { const qq = inside(w, h.x + S(a) * i * 2.1, h.z + C(a) * i * 2.1, 1.2); lob(w, e2, qq.x, qq.z, { kind: 'boulder', arc: 0.9 + Math.abs(i) * 0.12, splash: 1.5, dmg: 18 * K, hazard: 'ice', kb: 7, size: 0.5 }); }
        } } });
        m.push({ id: 'frenzy', w: 2.2, max: 4.4, a: combo(strike({ name: 'frenzy', anim: 'sweep', range: 4.5, arc: deg(220), windup: 0.75, active: 0.9, dur: 2.6, dmg: 19 * K, kb: 7, lunge: 1.4, chain: { at: 1.0, windup: 1.35, active: 1.5, lunge: 2 } }), [{ at: 1.0, windup: 1.35, active: 1.5, lunge: 2 }, { at: 1.8, windup: 2.2, active: 2.35, lunge: 2.5 }]) });
      }
      return m;
    },
    rites: {
      // three smashes, each a star of spike rows turning a little further round
      shatter(w, e) {
        const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = P2.frostgiant; e.anim = 'slam'; e.animT = 0.6 + (t % 0.9) * 0.5; e.mx = 0; e.mz = 0;
        while (c.next <= t && c.next < 2.7) { const a0 = c.a0 + c.next * 0.4; for (let i = 0; i < 6; i++) row(w, e, e.x, e.z, a0 + i * TAU / 6, { start: 1.8, n: 8, step: 1.2, warn: 0.55, gap: 0.06, r: 0.8, dmg: 15 * K, kind: 'ice' }); w.emit('shake', { amt: 0.5 }); c.next = Math.round((c.next + 0.9) * 100) / 100; }
        return t < 3.2;
      },
    },
    arena(w, e) {
      const K = P2.frostgiant; const h = w.hero;
      // stage two: the frost creeps over the floor in patches that chill
      if (e.form >= 2 && beat(w, e, 'creep', 2.6) && onFloor(w, e, 'rime') < 6) { const q = nearPt(w, h.x, h.z, 2.5, 6.5, 0.6); if (q) pool(w, e, q.x, q.z, 1.5, { warn: 1.0, life: 9, dmg: 3 * K, kind: 'rime', status: { frost: 1 } }); }
      // stage three: the blizzard drops icicles all over the field
      if (e.form >= 3 && beat(w, e, 'icicle', 1.4)) { const q = nearPt(w, h.x, h.z, 1.5, 6.5, 0); if (q) spot(w, e, q.x, q.z, 1.0, { warn: 1.1, life: 0.3, dmg: 14 * K, kind: 'frost' }); }
    },
    onPhase(w, e, p, base) {
      if (p === 2) {
        goAway(w, e, { kind: 'targets', leave: 'fade', banner: 'BREAK THE ICE PYLONS', dur: 22, targets: { type: 'icepylon', n: 3, hp: 90, name: 'Ice Pylon' }, tier: T2.frostgiant, addsGap: 7,
          waves: [[[WRAITH3, 2]], [[WRAITH3, 1], [WOLF3, 2]], [[WRAITH3, 2]]],
          pattern: (w2, t) => { if (beat(w2, e, 'ilfall', 1.6)) { const q = nearPt(w2, w2.hero.x, w2.hero.z, 0, 4, 0); if (q) spot(w2, e, q.x, q.z, 1.1, { warn: 1.1, life: 0.3, dmg: 12 * P2.frostgiant, kind: 'frost' }); } },
          back: { entrance: 'burst' }, onReturn: (w2, e2) => { form(w2, e2, 2); sig(w2, e2, 'glacier'); ward(w2, e2, 0.05); wave(w2, e2, e2.x, e2.z, 9, { r0: 1.5, warn: 0.5, life: 1.2, dmg: 12 * P2.frostgiant, kind: 'frost', status: { frost: 1 } }); } });
        return;
      }
      if (p === 3) { form(w, e, 3); e.speed *= 1.15; e.shield = 0; w.emit('storm', { e }); call(w, e, ['yeti', 'brute'], 1, ['yeti'].some(known) ? T2.frostgiant : 3, 5, 1); startRite(e, 'shatter', { a0: w.rand() * TAU }); return; }
      base(w, e, p);
    },
  },

  // PROPOSAL: Ashmaw. At two thirds it dives deep and the dunes heave: it breaks the surface for a moment here
  // and there (a mound, then the wyrm); strike it four times before it rises. Stage two, UNEARTHED: its hood
  // flares and its spines stand; it swallows the sand into whirling pits that drag you in, tunnels across the
  // field in lanes of bursting sand and spits a storm of venom; quicksand pits open over the floor. Stage
  // three, GLASS: the sun has baked it; its hide splits and glows like molten glass; it erupts three times
  // running, flings shards of glass; sand pours down from the cliffs in columns.
  sandwyrm: {
    moves(p, e, base) {
      if (p < 2 || e.mini) return base; const K = P2.sandwyrm; const q = p >= 3 ? 0.88 : 1;
      const m = drop(base, p >= 3 ? ['sinkhole', 'venom', 'surface', 'nest'] : ['sinkhole', 'venom']);
      // the swallow: a whirl of sand that drags you to its heart, which bursts
      m.push({ id: 'swallow', w: 2.1, cd: 6, a: { name: 'swallow', anim: 'roar', dur: 1.5, windup: 0.55, active: 0.57, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => {
        const c = inside(w, w.hero.x, w.hero.z, 1.6); pool(w, e2, c.x, c.z, 3.2, { warn: 0.7, life: 2.0, dmg: 0, kind: 'sand', pull: 0.7, tick: 9 }); spot(w, e2, c.x, c.z, 1.3, { warn: 2.6, life: 0.3, dmg: 24 * K, kind: 'sand', kb: 9 });
      } } });
      // tunnels: it bursts across the field in lanes of sand, one after another
      m.push({ id: 'tunnels', w: 2.1, cd: 5.5, a: { name: 'tunnels', anim: 'slam', dur: 1.5, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => sweepLanes(w, e2, { n: 2, gap: 2.8, width: 1.4, warn: 0.85, step: 0.3, dmg: 17 * K, kind: 'sand' }) } });
      m.push({ id: 'spitstorm', w: 1.9, min: 3, cd: 4.5, a: quick({ name: 'spitstorm', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'ray', teleRange: 10, ranged: { kind: 'sandspit', speed: 6.5, r: 0.3, dmg: 11 * K, life: 3, fan: 9, spread: deg(13), status: { poison: 1 } } }, q) });
      if (p >= 3) {
        m.push({ id: 'erupt3', w: 1.6, cd: 9, run: (w, e2) => { w.emit('tele', { e: e2, atk: { name: 'erupt3' } }); e2.ai.digChain = 2; burrow2(w, e2); } });
        m.push({ id: 'glass', w: 1.6, min: 2.5, cd: 3.5, a: quick({ name: 'glass', anim: 'sweep', dur: 1.3, windup: 0.6, active: 0.62, tele: 'ray', teleRange: 12, ranged: { kind: 'gear', speed: 10, r: 0.28, dmg: 12 * K, life: 1.8, fan: 5, spread: deg(9) } }, q) });
      }
      return m;
    },
    arena(w, e) {
      const K = P2.sandwyrm; const h = w.hero;
      if (e.form >= 2 && beat(w, e, 'pit', 3.2) && onFloor(w, e, 'quicksand') < 3) { const q = nearPt(w, h.x, h.z, 3, 7, 0.8); if (q) pool(w, e, q.x, q.z, 1.7, { warn: 1.2, life: 8, dmg: 3 * K, kind: 'quicksand', pull: 0.35 }); }
      if (e.form >= 3 && beat(w, e, 'fall', 1.5)) { const q = nearPt(w, h.x, h.z, 1, 6, 0); if (q) spot(w, e, q.x, q.z, 1.1, { warn: 1.05, life: 0.3, dmg: 14 * K, kind: 'sand' }); }
    },
    // after an eruption in the chain, under again
    afterSurface(w, e) { if (e.ai.digChain > 0 && e.form >= 3) { e.ai.digChain--; e.state = 'idle'; e.t = 0; burrow2(w, e); } },
    onPhase(w, e, p, base) {
      if (p === 2) {
        e.ai.dig = null; e.hidden = false; e.iframes = 0; e.r = e.def.r;
        goAway(w, e, { kind: 'chase', leave: 'burrow', banner: 'STRIKE ASHMAW WHEN IT SURFACES', dur: 22, hits: 4, surface: 1.9,
          pattern: (w2, t) => { if (beat(w2, e, 'geyser', 1.3)) { const q = nearPt(w2, w2.hero.x, w2.hero.z, 0, 3.5, 0); if (q) spot(w2, e, q.x, q.z, 1.1, { warn: 0.95, life: 0.3, dmg: 13 * P2.sandwyrm, kind: 'sand' }); } },
          back: { entrance: 'erupt' }, onReturn: (w2, e2) => { form(w2, e2, 2); sig(w2, e2, 'swallow'); e2.speed *= 1.1; wave(w2, e2, e2.x, e2.z, 9, { r0: 2, warn: 0.3, life: 1.1, dmg: 12 * P2.sandwyrm, kind: 'sand' }); } });
        return;
      }
      if (p === 3) { form(w, e, 3); sig(w, e, 'erupt3'); e.speed *= 1.1; w.emit('shake', { amt: 0.8 }); call(w, e, ['mummy', 'hushed'], 2, ['mummy'].some(known) ? T2.sandwyrm : 6, 5); return; }
      base(w, e, p);
    },
  },

  // PROPOSAL: Abbot Morrow. At two thirds he withdraws into his phylactery and four reliquaries of bone light
  // round the crypt, each feeding him; the dead rise while you shatter them. Stage two, THE BARE ABBOT: his
  // habit burns away to the ribs, his phylactery cracked and blazing, six skulls about him; he shuts you in a
  // prison of bone, throws lances of souls, sends waves of grave-hands across the floor; the crypt darkens and
  // its graves burst in turn. Stage three, UNBOUND: what is left is a skull and a spine in a green flame; a
  // storm of souls spirals out of him, the dead march across the floor in lines, and the rot spreads.
  lich: {
    moves(p, e, base) {
      if (p < 2 || e.mini) return base; const K = P2.lich; const k = p >= 3 ? 0.85 : 1;
      const m = drop(base, p >= 3 ? ['wither', 'phylactery', 'graves', 'scythe'] : ['wither', 'phylactery']);
      // a prison of bone: two rings of spikes round you, the outer first, then the heart
      m.push({ id: 'prison', w: 1.8, cd: 6, a: { name: 'prison', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => {
        const h = inside(w, w.hero.x, w.hero.z, 1.0); for (const [R, n, warn] of [[4.2, 14, 0.8], [2.6, 10, 1.2]]) for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = h.x + S(a) * R, z = h.z + C(a) * R; if (free(w, x, z, 0)) spot(w, e2, x, z, 0.8, { warn, life: 0.3, dmg: 15 * K, kind: 'bone', kb: 4 }); }
        spot(w, e2, h.x, h.z, 1.5, { warn: 1.6, life: 0.3, dmg: 20 * K, kind: 'bone', kb: 8 });
      } } });
      // lances of souls: three beams from him, one after another
      m.push({ id: 'lances', w: 1.7, min: 2.5, cd: 4.5, a: quick({ name: 'lances', anim: 'aim', dur: 1.5, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => { const a0 = angTo(e2, w.hero); [-0.35, 0.35, 0].forEach((o, i) => lane(w, e2, e2.x + S(a0 + o) * 0.8, e2.z + C(a0 + o) * 0.8, a0 + o, { len: 14, width: 1.0, warn: 0.7 + i * 0.3, life: 0.25, dmg: 17 * K, kind: 'soul' })); } }, k) });
      // grave-hands in lanes across the floor
      m.push({ id: 'handwave', w: 1.5, cd: 7, a: { name: 'handwave', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => sweepLanes(w, e2, { n: 2, gap: 2.6, width: 1.2, warn: 0.9, step: 0.28, dmg: 15 * K, kind: 'poison', ang: angTo(e2, w.hero) + Math.PI / 2 }) } });
      if (p >= 3) {
        m.push({ id: 'soulstorm', w: 1.6, cd: 9, run: (w, e2) => startRite(e2, 'soulstorm', { a0: w.rand() * TAU, dir: w.rand() < 0.5 ? 1 : -1 }) });
        m.push({ id: 'march', w: 1.5, cd: 7, a: { name: 'march', anim: 'cast', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => { const a = angTo(e2, w.hero); sweepLanes(w, e2, { n: 2, gap: 2.4, width: 1.1, warn: 0.85, step: 0.22, dmg: 15 * K, kind: 'bone', ang: a }); sweepLanes(w, e2, { n: 1, gap: 3.2, width: 1.1, warn: 1.9, step: 0.22, dmg: 15 * K, kind: 'bone', ang: a + Math.PI / 2 }); } } });
      }
      return m;
    },
    rites: {
      // the soul storm: souls spiral out of him in four arms for three seconds
      soulstorm(w, e) {
        const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = P2.lich; hold(w, e, 'cast');
        while (c.next <= t && c.next < 3.0) { for (let k = 0; k < 4; k++) fling(w, e, c.a0 + c.dir * c.next * 1.2 + k * TAU / 4, { kind: 'soul', speed: 5, dmg: 11 * K, life: 2.6 }); c.next = Math.round((c.next + 0.3) * 100) / 100; }
        return t < 3.4;
      },
    },
    arena(w, e) {
      const K = P2.lich; const h = w.hero;
      e.dark = e.form >= 3 ? 0.5 : (e.form >= 2 ? 0.35 : 0);
      // the graves burst in turn round where you fight
      if (e.form >= 2 && beat(w, e, 'grave', 2.8)) { const q = nearPt(w, h.x, h.z, 1.5, 5.5, 0); if (q) { spot(w, e, q.x, q.z, 1.25, { warn: 1.0, life: 0.3, dmg: 15 * K, kind: 'poison', kb: 5 }); } }
      if (e.form >= 3 && beat(w, e, 'rot', 3.0) && onFloor(w, e, 'rot') < 5) { const q = nearPt(w, h.x, h.z, 2.5, 6, 0.6); if (q) pool(w, e, q.x, q.z, 1.6, { warn: 1.0, life: 8, dmg: 4 * K, kind: 'rot', status: { poison: 1 } }); }
    },
    onPhase(w, e, p, base) {
      if (p === 2) {
        goAway(w, e, { kind: 'targets', leave: 'fade', banner: 'SHATTER THE RELIQUARIES', dur: 22, targets: { type: 'reliquary', n: 4, hp: 80, name: 'Reliquary' }, tier: T2.lich, addsGap: 7,
          waves: [[[['bonecaster', 'acolyte'], 1], [['cryptspider', 'rat'], 2]], [[['cryptspider', 'rat'], 2]], [[['bonecaster', 'acolyte'], 1]]],
          pattern: (w2) => { if (beat(w2, e, 'ilsoul', 2.2)) { const q = nearPt(w2, w2.hero.x, w2.hero.z, 5, 7, 0); if (q) { const a = angTo(q, w2.hero); w2.projs.push({ id: w2.nextId++, kind: 'soul', team: 'foe', x: q.x, z: q.z, y: 1.2, vx: S(a) * 4.5, vz: C(a) * 4.5, r: 0.3, dmg: 11 * P2.lich * e.dmgMul, life: 3.4, homing: 0.7, src: e, face: a, hitSet: new Set() }); } } },
          back: { entrance: 'souls' }, onReturn: (w2, e2) => { form(w2, e2, 2); sig(w2, e2, 'prison'); wave(w2, e2, e2.x, e2.z, 8, { r0: 1.2, warn: 0.4, life: 1.0, dmg: 12 * P2.lich, kind: 'rot' }); } });
        return;
      }
      if (p === 3) { form(w, e, 3); e.speed *= 1.2; e.ai.cd = 0.3; call(w, e, ['bonecaster', 'acolyte'], 1, T2.lich, 5, 1); startRite(e, 'soulstorm', { a0: w.rand() * TAU, dir: 1 }); return; }
      base(w, e, p);
    },
  },

  // PROPOSAL: the Hollow Archon, two interludes. At two thirds it rises into the eye of the wheel above; four
  // seals burn on the floor and the host comes through them; break the seals. Stage two, THE UNVEILED: its six
  // wings open wide and burn, the halo blazes red; a wheel of hellfire turns round it, brimstone rains, its
  // pentagram doubles; the floor cracks open in lanes of hellfire. At a third, the false sun: it hangs far
  // above the abyss and burns the floor with sweeping beams and falling sigils; survive it. Stage three, THE
  // HOLLOW: the golden mask is gone and an eye of light stares out of the void; it judges you in crosses,
  // spirals its eyes and keeps the false sun; stars fall into the dark.
  archon: {
    moves(p, e, base) {
      if (p < 2 || e.mini) return base; const K = P2.archon; const k = p >= 3 ? 0.88 : 1;
      const m = drop(base, p >= 3 ? ['brand', 'ascend', 'rite', 'sigils'] : ['brand', 'ascend']);
      // the wheel of fire: six spokes of hellfire that turn round it
      m.push({ id: 'wheelfire', w: 1.8, cd: 6, a: { name: 'wheelfire', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => { const a0 = w.rand() * TAU, dir = w.rand() < 0.5 ? 1 : -1; for (let i = 0; i < 6; i++) { const a = a0 + i * TAU / 6; lane(w, e2, e2.x + S(a) * 1.2, e2.z + C(a) * 1.2, a, { len: 11, through: true, width: 0.9, warn: 1.0, life: 2.4, dmg: 15 * K, kind: 'hellfire', kb: 4, sweep: { a0: a, a1: a + dir * 1.3 } }); } } } });
      // brimstone: burning stones lobbed round you, each rolling out a ring
      m.push({ id: 'brimstone', w: 1.6, min: 2.5, cd: 5, a: { name: 'brimstone', anim: 'cast', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => { const t = ahead(w, 1.0); for (let i = 0; i < 4; i++) { const a = w.rand() * TAU, r = i ? 2.2 + w.rand() * 1.8 : 0; const qq = inside(w, t.x + S(a) * r, t.z + C(a) * r, 1.2); lob(w, e2, qq.x, qq.z, { kind: 'flame', arc: 1.0 + i * 0.15, splash: 1.5, dmg: 17 * K, hazard: 'hellfire', kb: 6, size: 0.45 }); wave(w, e2, qq.x, qq.z, 4.5, { r0: 1.5, warn: 1.0 + i * 0.15, life: 0.7, dmg: 9 * K, kind: 'hellfire' }); } } } });
      if (p >= 3) {
        m.push({ id: 'crossjudge', w: 1.7, cd: 5, a: { name: 'crossjudge', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => { const h = inside(w, w.hero.x, w.hero.z, 1.0); const a0 = w.rand() * Math.PI / 2; for (const b of [a0, a0 + Math.PI / 4]) for (let k2 = 0; k2 < 4; k2++) row(w, e2, h.x, h.z, b + k2 * Math.PI / 2, { start: k2 ? 1.2 : 0, n: 7, step: 1.2, warn: b === a0 ? 0.65 : 1.35, gap: 0.05, r: 0.8, dmg: 16 * K, kind: 'lightning' }); } } });
        m.push({ id: 'eyespiral', w: 1.5, cd: 6, a: { name: 'eyespiral', anim: 'aim', dur: 1.6, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => { const a0 = w.rand() * TAU; const dir = w.rand() < 0.5 ? 1 : -1; for (let i = 0; i < 8; i++) for (let k2 = 0; k2 < 4; k2++) { const a = a0 + k2 * TAU / 4 + dir * i * 0.34; const r = 1.8 + i * 1.1; const x = e2.x + S(a) * r, z = e2.z + C(a) * r; if (free(w, x, z, 0)) spot(w, e2, x, z, 0.8, { warn: 0.6 + i * 0.1, life: 0.25, dmg: 15 * K, kind: 'eyebeam', kb: 4 }); } } } });
      }
      return m;
    },
    arena(w, e) {
      const K = P2.archon; const h = w.hero;
      e.dark = e.form >= 3 ? 0.45 : 0;
      // the floor cracks open in lanes of hellfire that burn a while
      if (e.form >= 2 && beat(w, e, 'crack', 4.2) && onFloor(w, e, 'lava') < 2) { const a = w.rand() * TAU; const q = nearPt(w, h.x, h.z, 1.5, 4, 0) || h; const L = lane(w, e, q.x - S(a) * 6, q.z - C(a) * 6, a, { len: 12, through: true, width: 1.0, warn: 1.3, life: 4.5, dmg: 5 * K, kind: 'lava', status: { burn: 1 } }); if (L) { L.tick = 0.5; L.kb = 0; } }
      if (e.form >= 3 && beat(w, e, 'star', 1.7)) { const q = nearPt(w, h.x, h.z, 1, 6, 0); if (q) spot(w, e, q.x, q.z, 1.0, { warn: 1.1, life: 0.3, dmg: 14 * K, kind: 'lightning' }); }
    },
    onPhase(w, e, p, base) {
      const K = P2.archon;
      if (p === 2) {
        goAway(w, e, { kind: 'targets', leave: 'fly', banner: 'BREAK THE FOUR SEALS', dur: 24, targets: { type: 'seal', n: 4, hp: 90, name: 'Seal of the Abyss' }, tier: T2.archon, addsGap: 7,
          waves: [[[['hellhound', 'hound'], 2]], [[['imp', 'acolyte'], 2]], [[['hellhound', 'hound'], 1], [['cultist', 'chanter'], 1]]],
          pattern: (w2) => { if (beat(w2, e, 'ilbeam', 2.6)) { const h = w2.hero; const a = w2.rand() * TAU; lane(w2, e, h.x - S(a) * 8, h.z - C(a) * 8, a, { len: 16, through: true, width: 1.1, warn: 1.1, life: 0.25, dmg: 14 * K, kind: 'eyebeam' }); } },
          back: { entrance: 'descend' }, onReturn: (w2, e2) => { form(w2, e2, 2); sig(w2, e2, 'wheelfire'); ward(w2, e2, 0.04); ringAt(w2, e2, e2.x, e2.z, 10, { r0: 1.5, warn: 0.4, life: 1.3, dmg: 12 * K, kind: 'hellfire' }); } });
        return;
      }
      if (p === 3) {
        goAway(w, e, { kind: 'gauntlet', leave: 'fly', banner: 'SURVIVE THE FALSE SUN', dur: 15,
          pattern: (w2, t) => falseSun(w2, e, t),
          back: { entrance: 'descend' }, onReturn: (w2, e2) => { form(w2, e2, 3); e2.speed *= 1.1; call(w2, e2, ['imp', 'acolyte'], 2, T2.archon, 6, 2, 4); startRite(e2, 'sun', { a0: w2.rand() * TAU, dir: 1 }); } });
        return;
      }
      base(w, e, p);
    },
  },
};
// the false sun (the Archon's second interlude): two beams sweep the floor from above, turning; sigils fall
function falseSun(w, e, t) {
  const K = P2.archon; const h = w.hero; const c = e.ai.sunC || (e.ai.sunC = { x: h.x, z: h.z });
  if (beat(w, e, 'sunsweep', 3.0)) { const a0 = w.rand() * TAU, dir = w.rand() < 0.5 ? 1 : -1; for (const b of [a0, a0 + Math.PI]) w.addHazard({ shape: 'line', x: c.x, z: c.z, face: b, len: 11, width: 1.0, warn: 1.1, life: 1.8, dmg: 15 * K * e.dmgMul, src: e, kind: 'eyebeam', kb: 5, sweep: { a0: b, a1: b + dir * 1.5 } }); }
  if (beat(w, e, 'sunsigil', 0.9)) { const q = nearPt(w, h.x, h.z, 0, 4.5, 0); if (q) spot(w, e, q.x, q.z, 1.0, { warn: 1.0, life: 0.3, dmg: 13 * K, kind: 'sigil' }); }
  if (t > 14.5) e.ai.sunC = null;
}
// Ashmaw under the sand again (the chain of eruptions); bosses3.js's own hiddenThink brings it up
function burrow2(w, e) {
  const K = P2.sandwyrm; spot(w, e, e.x, e.z, 2.0, { warn: 0.05, life: 0.3, dmg: 14 * K, kind: 'sand', kb: 7 });
  e.hidden = true; e.iframes = 99; e.r = 0.2; e.vx = 0; e.vz = 0; e.tele = null; e.mx = 0; e.mz = 0;
  e.ai.dig = { t: 0, trail: 0.15, lock: null }; w.emit('vanish', { e }); w.emit('shake', { amt: 0.4 });
}
// lay a stage spec over a boss's own move set, in place (its object stays the one bosses3.js exported)
export function evolve(B, S) {
  if (!B || !S || B._stages) return; B._stages = true;
  const own = { moves: B.moves, onPhase: B.onPhase, tick: B.tick, channel: B.channel, hiddenThink: B.hiddenThink };
  B.moves = function (p, e) { return sigFirst(e, S.moves(p, e || {}, own.moves.call(B, p, e))); };
  B.onPhase = function (w, e, p) { if (e.mini || !S.onPhase) return own.onPhase && own.onPhase.call(B, w, e, p); return S.onPhase(w, e, p, (w2, e2, p2) => own.onPhase && own.onPhase.call(B, w2, e2, p2)); };
  B.tick = function (w, e, h) { if (own.tick) own.tick.call(B, w, e, h); if (S.arena && !e.mini && !e.dead && !away(e) && !w.interlude) S.arena(w, e, h); };
  if (S.rites) B.channel = function (w, e, h) { const c = e.ai.chan; const R = c && S.rites[c.id]; return R ? R(w, e, h) : (own.channel ? own.channel.call(B, w, e, h) : false); };
  if (S.afterSurface && own.hiddenThink) B.hiddenThink = function (w, e, h) { const r = own.hiddenThink.call(B, w, e, h); if (!e.hidden && e.ai.digChain > 0) S.afterSurface(w, e); return r; };
}
export function evolveAll() { for (const t in STAGES2) evolve(BOSS_AI2[t], STAGES2[t]); }

// the other half of the merge in bosses2.js: when this module is evaluated second
try { Object.assign(BOSSES2, BOSSES4); Object.assign(BOSS_AI2, BOSS_AI4); } catch (err) { /* bosses2.js merges */ }
try { Object.assign(ASCENDED, ASCENDED5); Object.assign(ENTRANCES, ENTRANCES5); } catch (err) { /* bosses5.js merges */ }
try { evolveAll(); } catch (err) { /* bosses3.js not merged yet: bossPlan lays them on */ }
