// The newer foes: their stats and looks (UNITS) and their own behaviour (UNIT_AI[type](world, foe, dt);
// return false to fall back to the common melee/ranged pattern in ai.js). Pure logic, no DOM.
//
// Every blow is telegraphed on the stones and can be avoided by dashing or by stepping out of the shape:
// there is no parry. Lobbed flasks and spit mark where they land the moment they are thrown.
import { steer } from './ai.js'; // used at call time only: ai.js imports this module too

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const angDiff = (a, b) => wrap(b - a);
const turn = (a, b, max) => wrap(a + Math.max(-max, Math.min(max, angDiff(a, b))));
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

// ------------------------------------------------------------------ helpers
// a point inside the arena and off the solids, or null
function free(w, x, z, r) {
  const [x0, z0, x1, z1] = w.bounds;
  if (x < x0 + r + 0.3 || x > x1 - r - 0.3 || z < z0 + r + 0.3 || z > z1 - r - 0.3) return null;
  return w._blocked(x, z, r) ? null : { x, z };
}
// a lobbed flask or glob: flies to (tx, tz) in `arc` seconds and marks its landing ring at once
function lob(w, e, tx, tz, o) {
  const a = Math.atan2(tx - e.x, tz - e.z); const sx = e.x + Math.sin(a) * (e.r + 0.3), sz = e.z + Math.cos(a) * (e.r + 0.3);
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: sx, z: sz, y: 1.4, vx: (tx - sx) / o.arc, vz: (tz - sz) / o.arc, r: 0.25, dmg: 0, life: o.arc, lob: o.arc, lobT: 0, tx, tz, face: a, hitSet: new Set(), src: e });
  w.addHazard({ shape: 'circle', x: tx, z: tz, r: o.splash, warn: o.arc, life: o.pool, dmg: o.dmg * e.dmgMul, src: e, kind: o.hazard, kb: 3, status: o.status });
}
// where the hero will roughly be in `t` seconds (only part of the way, so standing still is not safe either)
function lead(w, hero, t) {
  const x = hero.x + hero.vx * t, z = hero.z + hero.vz * t;
  return free(w, x, z, 0.2) || { x: hero.x, z: hero.z };
}
// allies a chanter can ward: close, not bosses, not already well shielded
function wardable(w, e) {
  return w.foes().filter((f) => f !== e && !f.boss && !f.hidden && f.state !== 'spawn' && dist(f, e) < 9 && (f.shield || 0) < f.maxHp * 0.15)
    .sort((a, b) => dist(a, e) - dist(b, e)).slice(0, 3);
}

// ------------------------------------------------------------------ attacks
const ATK = {
  // Grave Hound: a long lunge along a marked line, and a snap at close range
  lunge: { name: 'lunge', anim: 'lunge', dur: 1.2, windup: 0.55, active: 0.82, range: 1.35, arc: deg(110), dmg: 12, kb: 4, lunge: 12, lungeT: [0.55, 0.82], tele: 'line', teleRange: 4.6, width: 1.1, turn: 7 },
  snap: { name: 'snap', anim: 'bite', dur: 0.8, windup: 0.38, active: 0.5, range: 1.45, arc: deg(90), dmg: 8, kb: 2.5, lunge: 3, tele: 'arc' },
  // Plague Rat: a quick nip
  nip: { name: 'nip', anim: 'nip', dur: 0.62, windup: 0.3, active: 0.42, range: 1.0, arc: deg(100), dmg: 5, kb: 1.5, lunge: 5, lungeT: [0.24, 0.42], tele: 'arc' },
  // Gargoyle: a dive from the air onto a marked circle (then grounded), and a raking claw
  dive: { name: 'dive', anim: 'dive', dur: 1.5, windup: 0.8, active: 1.25, leap: true, shape: 'circle', offset: 0, radius: 1.7, dmg: 17, kb: 7, tele: 'circleAt', heavy: true, onStrike: (w, e) => { e.ai.groundT = w.t + 1.6; e.poise = Math.min(e.poise, e.maxPoise * 0.35); } },
  rake: { name: 'rake', anim: 'rake', dur: 1.0, windup: 0.48, active: 0.62, range: 1.9, arc: deg(130), dmg: 12, kb: 4, lunge: 3, tele: 'arc' },
  // Tallow Bomber: a fire flask lobbed ahead of the hero (a burning pool), a flask smashed at its own feet
  flask: { name: 'flask', anim: 'cast', dur: 1.15, windup: 0.55, active: 0.58, tele: 'none', dmg: 0, onStrike: (w, e) => { const p = lead(w, w.hero, 0.45); lob(w, e, p.x, p.z, { kind: 'flask', arc: 0.95, splash: 1.5, pool: 2.6, dmg: 13, hazard: 'fire', status: { burn: 1 } }); w.emit('fire', { e, kind: 'flask' }); } },
  spill: { name: 'spill', anim: 'slam', dur: 0.95, windup: 0.42, active: 0.45, shape: 'circle', offset: 0, radius: 2.1, tele: 'circle', dmg: 0, onStrike: (w, e) => { w.addHazard({ shape: 'circle', x: e.x, z: e.z, r: 2.1, warn: 0.22, life: 2.2, dmg: 12 * e.dmgMul, src: e, kind: 'fire', kb: 4, status: { burn: 1 } }); } },
  // Mire Spitter: three globs across the hero's path (poison puddles), a claw when cornered
  spit: { name: 'spit', anim: 'cast', dur: 1.35, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const hero = w.hero; const p = lead(w, hero, 0.3); const a = angTo(e, p); const sx = Math.cos(a), sz = -Math.sin(a);
    const spots = [[0, 0, 1.0], [sx * 1.9, sz * 1.9, 1.15], [-sx * 1.9, -sz * 1.9, 1.3]];
    for (const [ox, oz, arc] of spots) { const q = free(w, p.x + ox, p.z + oz, 0.2) || p; lob(w, e, q.x, q.z, { kind: 'spit', arc, splash: 1.15, pool: 3.6, dmg: 9, hazard: 'poison', status: { poison: 1 } }); }
    w.emit('fire', { e, kind: 'spit' });
  } },
  swipe: { name: 'swipe', anim: 'pounce', dur: 0.95, windup: 0.45, active: 0.6, range: 1.5, arc: deg(110), dmg: 9, kb: 3, lunge: 4, lungeT: [0.45, 0.6], tele: 'arc' },
  // Shade: a quick cut, a two-blow flurry, and the cut it opens with when it steps out of the dark
  cut: { name: 'cut', anim: 'fslash', dur: 0.85, windup: 0.4, active: 0.52, range: 1.9, arc: deg(120), dmg: 12, kb: 3, lunge: 4, tele: 'arc' },
  flurry: { name: 'flurry', anim: 'fslash', dur: 1.25, windup: 0.4, active: 0.52, range: 1.9, arc: deg(120), dmg: 10, kb: 3, lunge: 4, tele: 'arc', chain: { at: 0.66, windup: 0.86, active: 0.97, lunge: 4 } },
  ambush: { name: 'ambush', anim: 'fslash', dur: 0.95, windup: 0.46, active: 0.58, range: 2.0, arc: deg(130), dmg: 14, kb: 4, lunge: 3.5, tele: 'arc', turn: 7 },
  // Chanter: a chant that wards up to three allies (interrupt it!), and a weak homing mote
  chant: { name: 'chant', anim: 'cast', dur: 1.5, windup: 1.0, active: 1.02, tele: 'none', dmg: 0, onStrike: (w, e) => {
    for (const f of wardable(w, e)) { f.shield = Math.max(f.shield || 0, Math.round(f.maxHp * 0.3)); w.emit('shieldUp', { e: f, src: e, amt: f.shield, x: f.x, z: f.z }); }
  } },
  mote: { name: 'mote', anim: 'cast', dur: 1.2, windup: 0.6, active: 0.62, tele: 'none', ranged: { kind: 'flame', speed: 7, r: 0.26, dmg: 8, life: 3, homing: 1.0, reflect: true } },
  // Bronze Sentinel: a slam that sends a ring rolling out, a wide sweep, and a furnace beam along a marked line
  slam: { name: 'slam', anim: 'slam', dur: 2.1, windup: 1.0, active: 1.1, shape: 'circle', offset: 1.5, radius: 1.9, dmg: 24, kb: 8, lunge: 0.8, tele: 'circle', heavy: true, onStrike: (w, e) => {
    const x = e.x + Math.sin(e.face) * 1.5, z = e.z + Math.cos(e.face) * 1.5;
    w.addHazard({ shape: 'ring', x, z, r0: 1.2, r1: 7.5, warn: 0, life: 1.1, dmg: 12 * e.dmgMul, src: e, kind: 'shock', kb: 6 }); w.emit('shake', { amt: 0.5 });
  } },
  sweep: { name: 'sweep', anim: 'sweep', dur: 1.55, windup: 0.8, active: 0.95, range: 2.7, arc: deg(200), dmg: 18, kb: 7, lunge: 1, tele: 'arc', heavy: true },
  beam: { name: 'beam', anim: 'aim', dur: 2.2, windup: 1.3, active: 1.8, range: 10, width: 1.4, shape: 'line', tele: 'line', teleRange: 10, dmg: 0, turn: 1.8, onStrike: (w, e) => {
    const fx = Math.sin(e.face), fz = Math.cos(e.face); const x = e.x + fx * 0.6, z = e.z + fz * 0.6;
    const end = w._lastClear(x, z, x + fx * 10, z + fz * 10, 0.05); const len = Math.hypot(end.x - x, end.z - z) + 0.3;
    w.addHazard({ shape: 'line', x, z, face: e.face, len, width: 1.4, warn: 0, life: 0.5, dmg: 20 * e.dmgMul, src: e, kind: 'beam', kb: 6, status: { burn: 1 } });
    w.emit('beam', { e, x, z, face: e.face, len, width: 1.4 }); w.emit('shake', { amt: 0.4 });
  } },
  // Pale Knight: a two-blow combo, a shield bash, and a lunging thrust
  combo: { name: 'combo', anim: 'fslash', dur: 1.8, windup: 0.55, active: 0.68, range: 2.0, arc: deg(120), dmg: 14, kb: 3, lunge: 3.2, tele: 'arc', chain: { at: 0.95, windup: 1.22, active: 1.34, lunge: 4 } },
  bash: { name: 'bash', anim: 'bash', dur: 1.15, windup: 0.45, active: 0.6, range: 1.55, arc: deg(90), dmg: 10, kb: 10, lunge: 7, lungeT: [0.42, 0.6], tele: 'arc' },
  thrust: { name: 'thrust', anim: 'fthrust', dur: 1.2, windup: 0.6, active: 0.78, shape: 'line', range: 3.4, width: 0.9, dmg: 15, kb: 5, lunge: 7, lungeT: [0.6, 0.78], tele: 'line' },
};
export const UNIT_ATTACKS = ATK;

// ------------------------------------------------------------------ looks: extra parts on the humanoid rig
const glowEyes = (left, right, size = 0.09) => (rig, part, box) => {
  const hs = 0.24; part('head', box(size, size * 0.75, 0.04), left, hs * 0.25, hs * 0.52, hs / 2 + 0.07, { glow: 7 }); part('head', box(size, size * 0.75, 0.04), right, -hs * 0.25, hs * 0.52, hs / 2 + 0.07, { glow: 7 });
};
const looks = {
  bomber: (rig, part, box) => { // a bandolier of glowing flasks and a satchel
    for (let i = -1; i <= 1; i++) part('chest', box(0.07, 0.1, 0.07), 0xffa040, i * 0.1, 0.1 - i * 0.04, 0.13, { glow: 3 });
    part('chest', box(0.42, 0.05, 0.03), 0x3a2a1a, 0, 0.1, 0.12, { rz: 0.4 });
    part('hips', box(0.14, 0.16, 0.12), 0x4a3424, 0.2, -0.06, 0.04);
  },
  spitter: (rig, part, box) => { // a swollen glowing throat sac and growths on the back
    part('head', box(0.2, 0.12, 0.14), 0x80e040, 0, -0.02, 0.1, { glow: 2.2 });
    part('chest', box(0.12, 0.12, 0.1), 0x4a6a3a, 0.08, 0.24, -0.12); part('chest', box(0.1, 0.1, 0.08), 0x4a6a3a, -0.1, 0.18, -0.13);
  },
  shade: glowEyes(0xff2830, 0x4a90ff, 0.1),
  chanter: (rig, part, box) => { // a crown of candles and a golden stole
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; part('head', box(0.035, 0.09, 0.035), 0xfff0c0, Math.sin(a) * 0.17, 0.34, Math.cos(a) * 0.17 - 0.02, { glow: 4 }); }
    part('chest', box(0.08, 0.36, 0.03), 0xd8b040, 0.07, 0.1, 0.12); part('chest', box(0.08, 0.36, 0.03), 0xd8b040, -0.07, 0.1, 0.12);
  },
  sentinel: (rig, part, box) => { // a furnace in the chest, pauldrons, great fists, a crest
    part('chest', box(0.26, 0.2, 0.04), 0xff8020, 0, 0.14, 0.13, { glow: 3 });
    for (let i = -1; i <= 1; i++) part('chest', box(0.27, 0.025, 0.05), 0x3a2810, 0, 0.14 + i * 0.065, 0.15);
    for (const s of ['L', 'R']) { part('sh' + s, box(0.24, 0.12, 0.26), 0x9a7838, 0, 0.04, 0); part('ha' + s, box(0.2, 0.18, 0.2), 0x6a5028, 0, -0.1, 0.02); }
    part('head', box(0.06, 0.12, 0.26), 0x9a7838, 0, 0.3, -0.01);
  },
  knight: (rig, part, box) => { // a pale shield face with a bell, a helm crest, a visor slit
    for (const x of [0.115, 0.045]) part('elL', box(0.015, 0.5, 0.38), 0xd8d4cc, x, -0.15, 0.08);
    part('elL', box(0.02, 0.14, 0.1), 0xc8a050, 0.125, -0.12, 0.08); part('elL', box(0.02, 0.14, 0.1), 0xc8a050, 0.035, -0.12, 0.08);
    part('head', box(0.04, 0.1, 0.3), 0xa83030, 0, 0.3, -0.02);
    part('head', box(0.2, 0.03, 0.03), 0x08080c, 0, 0.13, 0.14);
  },
};

// ------------------------------------------------------------------ stats and looks
// attacks: what the common pattern would use if this unit ever falls back to it
export const UNITS = {
  hound: {
    name: 'Grave Hound', hp: 40, poise: 14, flinch: 2, speed: 6.0, r: 0.4, mass: 0.9, aggro: 14, keep: 3.6, drop: 6,
    attacks: [{ a: ATK.lunge, w: 1, min: 2.4, max: 4.6 }, { a: ATK.snap, w: 1, min: 0, max: 1.8 }],
    look: { rig: 'hound', scale: 1.15, eyes: 0xff3020, colors: { fur: 0x2e2a2c, dark: 0x1e1b1d, bone: 0xd8d0bc } },
  },
  rat: {
    name: 'Plague Rat', hp: 12, poise: 5, flinch: 1, speed: 5.2, r: 0.26, mass: 0.35, aggro: 12, keep: 1.0, drop: 2,
    attacks: [{ a: ATK.nip, w: 1, min: 0, max: 1.4 }],
    look: { rig: 'rat', scale: 1, eyes: 0xff3020, colors: { fur: 0x6a5c4c, dark: 0x4a3e34, tail: 0xc89088, sore: 0x90e040 } },
  },
  gargoyle: {
    name: 'Gargoyle', hp: 56, poise: 24, flinch: 1, speed: 4.0, r: 0.45, mass: 1.3, aggro: 15, keep: 5, drop: 9,
    attacks: [{ a: ATK.rake, w: 1, min: 0, max: 2.0 }],
    look: { rig: 'gargoyle', scale: 1.05, eyes: 0xff4030, colors: { stone: 0x70727a, dark: 0x4c4e56, wing: 0x55575f, horn: 0x34363c, claw: 0xc8c4b8 } },
  },
  bomber: {
    name: 'Tallow Bomber', hp: 42, poise: 16, flinch: 2, speed: 3.2, r: 0.38, mass: 1, aggro: 15, keep: 7, ranged: true, drop: 7,
    attacks: [{ a: ATK.flask, w: 1, min: 3, max: 13 }],
    look: { weapon: 'none', offhand: 'lantern', hood: true, eyes: 0xffa030, extra: looks.bomber, colors: { skin: 0xd8ccb0, tunic: 0xc8b890, pants: 0x4a3a2a, boots: 0x1a1410, hood: 0x5a4430, glove: 0x3a2a1e, belt: 0x3a2a1a } },
  },
  spitter: {
    name: 'Mire Spitter', hp: 46, poise: 16, flinch: 2, speed: 2.8, r: 0.4, mass: 1.1, aggro: 14, keep: 6, ranged: true, hunch: true, drop: 7,
    attacks: [{ a: ATK.spit, w: 1, min: 2.5, max: 12 }],
    look: { weapon: 'none', claws: 0xa8c070, eyes: 0x90ff60, noHair: true, bulk: 1.2, extra: looks.spitter, colors: { skin: 0x4a6038, tunic: 0x34482a, pants: 0x283a22, boots: 0x1c2a18, glove: 0x4a6038, shoulder: 0x3e5430 } },
  },
  shade: {
    name: 'Shade', hp: 46, poise: 18, flinch: 1, speed: 3.8, r: 0.38, mass: 0.8, aggro: 15, keep: 4, drop: 9,
    attacks: [{ a: ATK.cut, w: 1, min: 0, max: 1.9 }],
    look: { weapon: 'saber', blade: 0x9aa8e0, bladeGlow: 0x203070, hood: true, cloak: true, extra: looks.shade, colors: { skin: 0x10121a, tunic: 0x0c0e16, pants: 0x0a0c12, boots: 0x08090c, cloak: 0x141826, cloakDark: 0x0c0e18, hood: 0x141826, glove: 0x0c0e14 } },
  },
  chanter: {
    name: 'Chanter', hp: 40, poise: 16, flinch: 2, speed: 2.6, r: 0.38, mass: 1, aggro: 15, keep: 8, ranged: true, drop: 10,
    attacks: [{ a: ATK.mote, w: 1, min: 2.5, max: 12 }],
    look: { weapon: 'staff', orb: 0xffe070, hood: true, eyes: 0xffe080, skirt: 0x6a5430, extra: looks.chanter, colors: { skin: 0x4a4440, tunic: 0x7a6440, pants: 0x3a3022, boots: 0x161210, hood: 0x6a5430, glove: 0x3a3022 } },
  },
  sentinel: {
    name: 'Bronze Sentinel', hp: 300, poise: 140, flinch: 0, speed: 1.7, r: 0.66, mass: 3.5, aggro: 13, keep: 2.4, armor: true, scale: 1.5, drop: 26,
    attacks: [{ a: ATK.slam, w: 1, min: 0, max: 3.2 }, { a: ATK.sweep, w: 1, min: 0, max: 2.6 }],
    look: { weapon: 'none', eyes: 0xffa030, mask: 0x5a4420, bulk: 1.45, extra: looks.sentinel, colors: { skin: 0x8a6a34, tunic: 0x7a5c2c, pants: 0x5e4620, boots: 0x4a3818, shoulder: 0x9a7838, glove: 0x6a5028, belt: 0x4a3818 } },
  },
  knight: {
    name: 'Pale Knight', hp: 140, poise: 70, flinch: 1, speed: 2.5, r: 0.44, mass: 1.8, aggro: 13, keep: 1.8, shield: true, drop: 16,
    attacks: [{ a: ATK.combo, w: 2, min: 0, max: 2.0 }, { a: ATK.bash, w: 1, min: 0, max: 1.5 }],
    look: { weapon: 'sword', blade: 0xe0e4ec, offhand: 'shield', mask: 0xc8c4bc, eyes: 0xe8f0ff, extra: looks.knight, bulk: 1.15, colors: { skin: 0xc8c4bc, tunic: 0xb8b4ac, pants: 0x8a8680, boots: 0x6a6660, shoulder: 0xd8d4cc, glove: 0xa8a49c, belt: 0x6a5a40 } },
  },
};

// ------------------------------------------------------------------ behaviour
const move = (w, e, ang, sp) => { const a = steer(w, e, ang); e.mx = Math.sin(a); e.mz = Math.cos(a); e.moveSpeed = sp; e.anim = sp > e.speed * 0.6 ? 'run' : 'walk'; return a; };
const stand = (e, anim = 'idle') => { e.mx = 0; e.mz = 0; e.moveSpeed = 0; e.anim = anim; };
const attack = (w, e, atk) => { w.foeAttack(e, atk); w.attackers++; };
const meleeToken = (w) => w.attackers < w.tokensMax;
const rangedToken = (w) => w.attackers < w.tokensMax + 1;
const facing = (e, ang, tol = 0.5) => Math.abs(angDiff(e.face, ang)) < tol;
const haste = (e) => (e.elite === 'hasted' ? 0.6 : 1);
function strafeFlip(w, e, h) { const ai = e.ai; ai.flip = (ai.flip ?? 1.5 + w.rand() * 2) - h; if (ai.flip <= 0) { ai.flip = 1.5 + w.rand() * 2.5; ai.strafeDir = -(ai.strafeDir || 1); } }

// a foe that loses the hero for a while calms down (as in the common pattern)
function lost(w, e, h, hero, d) {
  e.ai.seeT = (e.ai.seeT || 0) - h; if (e.ai.seeT <= 0) { e.ai.seeT = 0.3; e.ai.sees = w.sees(e, hero); }
  e.ai.lost = (d > e.def.aggro * 1.7 || (!e.ai.sees && d > 6)) ? (e.ai.lost || 0) + h : 0;
  if (e.ai.lost > 4 && !e.ai.locked) { e.ai.aggro = false; e.ai.lost = 0; w.emit('calm', { e }); e.anim = 'idle'; return true; }
  return false;
}
// wraps a behaviour: an idle foe or a dead hero falls back to the common pattern (which wakes it up)
const unit = (fn) => (w, e, h) => {
  const hero = w.hero;
  if (!hero || hero.dead || !e.ai.aggro) { if (e.hidden) unhide(w, e); return false; }
  const d = dist(e, hero);
  if (!e.hidden && lost(w, e, h, hero, d)) return true;
  fn(w, e, h, hero, d, angTo(e, hero));
  return true;
};
function unhide(w, e) { e.hidden = false; e.iframes = 0; w.emit('appear', { e }); }

export const UNIT_AI = {
  // Hunts in packs: circles the hero at its own distance, turns, crouches and lunges along a line,
  // then breaks off and circles again. Snaps when the hero closes in.
  hound: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; ai.ring ??= 3.3 + w.rand() * 1.1; strafeFlip(w, e, h);
    if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ang + Math.PI - 0.8 * ai.strafeDir, e.speed); e.face = turn(e.face, a, 10 * h); return; }
    const ready = ai.cd <= 0.35;
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d < 1.9) { attack(w, e, ATK.snap); ai.backT = 0.35; return; }
      if (d >= 2.3 && d <= 4.9 && ai.sees && w.clear(e, hero)) { attack(w, e, ATK.lunge); ai.backT = 0.55; return; }
    }
    if (d > 6.5) { const a = move(w, e, ang, e.speed); e.face = turn(e.face, a, 10 * h); return; }
    if (ready && d >= 2.3 && d <= 4.9 && meleeToken(w)) { stand(e, 'stalk'); e.face = turn(e.face, ang, 9 * h); return; } // stop and turn to face
    const around = angTo(hero, e) + ai.strafeDir * 0.6;
    const tx = hero.x + Math.sin(around) * ai.ring, tz = hero.z + Math.cos(around) * ai.ring;
    const a = move(w, e, Math.atan2(tx - e.x, tz - e.z), e.speed * 0.72); e.face = turn(e.face, a, 9 * h);
  }),

  // Swarms: scurries in on a zigzag, nips, skitters off. At most three bite at once.
  rat: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai;
    if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ai.backA, e.speed * 0.9); e.face = turn(e.face, a, 14 * h); return; }
    if (ai.cd <= 0 && d < 1.45) {
      let biting = 0; for (const f of w.ents) if (f.type === 'rat' && !f.dead && (f.state === 'windup' || f.state === 'attack')) biting++;
      if (biting < 3) { e.face = turn(e.face, ang, 1.5); attack(w, e, ATK.nip); ai.backT = 0.3 + w.rand() * 0.35; ai.backA = ang + Math.PI + (w.rand() - 0.5) * 2.2; return; }
    }
    const zig = Math.sin(w.t * 7 + e.id * 1.7) * (d > 2.2 ? 0.75 : 0.25);
    const a = move(w, e, ang + zig, e.speed * (d < 1.2 ? 0.35 : 1)); e.face = turn(e.face, d < 1.6 ? ang : a, 14 * h);
  }),

  // Hovers out of reach, drifting round; dives onto a marked circle, then is grounded and
  // vulnerable (easy to break) for a moment. Rakes with its claws when the hero comes close.
  gargoyle: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai;
    if (ai.groundT > w.t) { stand(e, 'grounded'); return; }
    strafeFlip(w, e, h); e.face = turn(e.face, ang, 6 * h);
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.6)) {
      if (d < 2.1) { attack(w, e, ATK.rake); return; }
      if (d >= 3 && d <= 9.5 && (ai.diveAt ?? 0) <= w.t && w.clear(e, hero)) { attack(w, e, ATK.dive); ai.diveAt = w.t + 3.2 * haste(e); return; }
    }
    const want = 5;
    if (d > want + 1.5) move(w, e, ang, e.speed * 0.9);
    else if (d < want - 1.8) move(w, e, ang + Math.PI - 0.5 * ai.strafeDir, e.speed * 0.8);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.5);
  }),

  // Keeps its distance and lobs fire flasks ahead of the hero; runs when the hero gets close and,
  // cornered, smashes a flask at its own feet.
  bomber: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h);
    if (d < 2.3 && (ai.spillAt ?? 0) <= w.t && ai.cd <= 0.5) { e.face = ang; attack(w, e, ATK.spill); ai.spillAt = w.t + 6 * haste(e); ai.fleeT = 1.2; return; }
    if (ai.fleeT > 0 || d < 4.2) {
      ai.fleeT = (ai.fleeT || 0) - h; const a = move(w, e, ang + Math.PI + 0.35 * ai.strafeDir, e.speed * 1.1); e.face = turn(e.face, a, 9 * h); return;
    }
    e.face = turn(e.face, ang, 6 * h);
    if (ai.cd <= 0 && d <= 13 && ai.sees && rangedToken(w) && facing(e, ang, 0.7)) { attack(w, e, ATK.flask); return; }
    if (d > 9.5) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // Squats and spits three globs across the hero's path (poison puddles that linger); claws when
  // the hero is on top of it; backs off slowly.
  spitter: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h);
    if (ai.cd <= 0 && facing(e, ang, 0.6)) {
      if (d < 1.9 && meleeToken(w)) { attack(w, e, ATK.swipe); return; }
      if (d >= 2.5 && d <= 12 && ai.sees && rangedToken(w)) { attack(w, e, ATK.spit); return; }
    }
    if (d < 3.6) move(w, e, ang + Math.PI, e.speed * 0.8);
    else if (d > 8.5) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // Stalks at a distance, then melts into the dark (untargetable) and steps out right behind the
  // hero, always somewhere the hero can reach, cutting at once. Cuts fast when the hero closes in.
  shade: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; ai.blinkAt ??= w.t + 1.2;
    if (e.hidden) {
      stand(e); ai.hideT -= h; if (ai.hideT > 0) return;
      const back = hero.face + Math.PI; let spot = null;
      for (const off of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, Math.PI]) {
        for (const r of [1.7, 2.3]) { const p = free(w, hero.x + Math.sin(back + off) * r, hero.z + Math.cos(back + off) * r, e.r); if (p && w.clear(hero, p)) { spot = p; break; } }
        if (spot) break;
      }
      if (spot) { w.emit('blink', { e, fx: e.x, fz: e.z, x: spot.x, z: spot.z }); e.x = spot.x; e.z = spot.z; }
      unhide(w, e); e.face = angTo(e, hero); attack(w, e, ATK.ambush); ai.blinkAt = w.t + 3.6 * haste(e);
      return;
    }
    strafeFlip(w, e, h); e.face = turn(e.face, ang, 8 * h);
    if (ai.cd <= 0 && meleeToken(w)) {
      if (d < 2.0 && facing(e, ang, 0.5)) { attack(w, e, w.rand() < 0.4 ? ATK.flurry : ATK.cut); return; }
      if (ai.blinkAt <= w.t && d < 11 && ai.sees) { e.hidden = true; e.iframes = 9; e.tele = null; ai.hideT = 0.55; w.emit('vanish', { e }); return; }
    }
    if (d > 6) move(w, e, ang, e.speed);
    else if (d < 3) move(w, e, ang + Math.PI - 0.6 * ai.strafeDir, e.speed * 0.8);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.55);
  }),

  // Stays back and chants: every few seconds it wards up to three nearby allies with a shield (a hit
  // interrupts the chant). Throws weak motes otherwise. A priority target.
  chanter: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h);
    if (ai.cd <= 0 && (ai.chantAt ?? w.t + 0.8) <= w.t && wardable(w, e).length) { attack(w, e, ATK.chant); ai.chantAt = w.t + 6.5 * haste(e); return; }
    ai.chantAt ??= w.t + 0.8;
    if (ai.cd <= 0 && d >= 2.5 && d <= 12 && ai.sees && rangedToken(w) && facing(e, ang, 0.6)) { attack(w, e, ATK.mote); return; }
    if (d < 5.5) { const a = move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed); if (d < 3.5) e.face = turn(e.face, a, 8 * h); }
    else if (d > 10) move(w, e, ang, e.speed);
    else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.4);
  }),

  // Trudges in, turns slowly. Close: a slam whose ring rolls out over the square, or a wide sweep;
  // both leave it open for a long moment. Far: a furnace beam down a long marked line.
  sentinel: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; e.face = turn(e.face, ang, 2.2 * h);
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.45)) {
      if (d <= 2.6) { attack(w, e, w.rand() < 0.5 ? ATK.sweep : ATK.slam); return; }
      if (d <= 3.3) { attack(w, e, ATK.slam); return; }
      if (d <= 11 && (ai.beamAt ?? 0) <= w.t && ai.sees) { attack(w, e, ATK.beam); ai.beamAt = w.t + 6 * haste(e); return; }
    }
    if (d > 2.3) move(w, e, ang, e.speed); else stand(e);
  }),

  // Advances behind its shield (frontal blows are blocked until the guard breaks), always turning to
  // face the hero. A two-blow combo up close, a thrust from further out, and a shield bash right
  // after its guard is struck.
  knight: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 4.5 * h);
    if (e.poise < (ai.lastPoise ?? e.poise) - 0.01) ai.riposte = w.t + 1.2;
    ai.lastPoise = e.poise;
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.5)) {
      if (d < 1.9 && (ai.riposte ?? 0) > w.t) { attack(w, e, ATK.bash); ai.riposte = 0; return; }
      if (d < 2.2) { attack(w, e, w.rand() < 0.7 ? ATK.combo : ATK.bash); return; }
      if (d >= 2.4 && d <= 4.2) { attack(w, e, ATK.thrust); return; }
    }
    if (d > 2.0) move(w, e, ang, e.speed * (d > 5 ? 1 : 0.6)); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.3);
  }),
};
