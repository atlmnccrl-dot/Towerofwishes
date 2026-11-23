// Five more bosses for the run's boss pools (docs/RUN_DESIGN.md §6): the Drowned King-Crab (the docks), the
// Hollow Mother (the undercroft), the Stilled Ronin (the heights), the Smiling Guest (the market or the nave)
// and the Pyre Saint (the foundry). Stats and looks (BOSSES5), move sets (BOSS_AI5), entrances (ENTRANCES5),
// Ascended forms (ASCENDED5) and their lines (BOSS_LINES5, merged by game.js / scenes/lines.js), in the
// shapes of bosses3.js and bosses4.js; merged into BOSSES2 / BOSS_AI2 by bosses2.js and into the entrance and
// Ascended tables by bosses4.js (or here, whichever module is evaluated second). Also bossPool(levelId,
// variant) and bossOpts(type, levelId): which bosses an area can field and how hard at that tier.
//
// Each boss is its own kind of fight, not a new skin on an old one:
//  - the King-Crab is a siege: a shell to break before it can be hurt, tides that flood half the arena,
//    crabs pouring out from under it;
//  - the Hollow Mother is a hunt in the dark: she climbs out of sight, limbs stab from the black, she drops
//    on you, she calls with the Hushed's voices, the lights fail;
//  - the Stilled Ronin is stillness: he does not walk; he stands, a line of light marks the cut, and he is
//    across the arena before you hear it; strike him while he waits on guard and he answers;
//  - the Smiling Guest only moves when you are not looking at it, in stuttering frames; it wears your shape
//    and laughs in the dark;
//  - the Pyre Saint burns the floor: rings of fire that stay, molten rain, a cross of flame, and at the end it
//    is a pillar of fire that hunts you.
// As everywhere: no parry; every blow is marked first (an arc, a line, a circle, a ring) and can be dashed
// through or walked out of. Pure logic: look.rig bodies are built by js/actors/beasts4.js in the browser, and
// entrances touch effects only through their fx argument (null in Node).
//
// Names, titles, lines and every comment describing who they are: PROPOSAL, for the author.
import { strike, ringAt, circleAt, summon, hookWorld5, later, prop, propsOf, spotFree } from './ai.js';
import { BOSSES2, BOSS_AI2, free, adds, countOf, roarPause, row, around, quick } from './bosses2.js';
import { ASCENDED, ENTRANCES } from './bosses4.js';
import { FOES } from './defs.js';
import { UNITS, UNIT_AI } from './units.js';
import { HEROES, WEAPONS } from './heroes.js';

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const S = Math.sin, C = Math.cos;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const lerp = (a, b, k) => a + (b - a) * k;

// How hard each boss hits (multiplies every number below; the boss's dmgMul still applies on top) and the
// tier its summons come at.
const POWER = { kingcrab: 1.45, hollowmother: 1.35, ronin: 1.6, smiling: 1.4, pyresaint: 1.2 };
const ADD_TIER = { kingcrab: 2, hollowmother: 4, ronin: 6, smiling: 2, pyresaint: 5 };

// ------------------------------------------------------------------ helpers (as in bosses3.js / bosses4.js)
const known = (type) => !!(FOES[type] || UNITS[type]);
function call(w, e, list, n, tier, radius = 5, cap = 2, total = 5) {
  const type = list.find(known); if (!type) return 0;
  const room = Math.min(n, cap - countOf(w, type), total - adds(w, e)); if (room <= 0) return 0;
  summon(w, e, type, room, tier, radius); return room;
}
function inside(w, x, z, m = 1.2) { const [x0, z0, x1, z1] = w.bounds; return { x: Math.max(x0 + m, Math.min(x1 - m, x)), z: Math.max(z0 + m, Math.min(z1 - m, z)) }; }
function spot(w, e, x, z, r, o) { return w.addHazard({ shape: 'circle', x, z, r, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status }); }
function wave(w, e, x, z, r1, o) { return w.addHazard({ shape: 'ring', x, z, r0: o.r0 ?? 0.6, r1, warn: o.warn ?? 0, life: o.life ?? 1.2, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 6, status: o.status }); }
function reach(w, x, z, ang, max) {
  let px = x, pz = z, s = 0;
  for (let k = 0.5; k <= max; k += 0.5) { const cx = x + S(ang) * k, cz = z + C(ang) * k; if (!free(w, cx, cz, 0) || !w.clear({ x: px, z: pz }, { x: cx, z: cz })) break; px = cx; pz = cz; s = k; }
  return s;
}
function lane(w, e, x, z, ang, o) {
  const len = o.through ? o.len : Math.min(o.len || 12, reach(w, x, z, ang, o.len || 12)); if (len < 0.8) return null;
  return w.addHazard({ shape: 'line', x, z, face: ang, len, width: o.width || 1.1, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status });
}
function lob(w, e, tx, tz, o) {
  const a = Math.atan2(tx - e.x, tz - e.z); const sx = e.x + S(a) * (e.r + 0.3), sz = e.z + C(a) * (e.r + 0.3);
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: sx, z: sz, y: o.y ?? 2.2, vx: (tx - sx) / o.arc, vz: (tz - sz) / o.arc, r: o.size ?? 0.3, dmg: 0, life: o.arc, lob: o.arc, lobT: 0, tx, tz, face: a, hitSet: new Set(), src: e });
  return spot(w, e, tx, tz, o.splash, { warn: o.arc, life: o.pool ?? 0.25, dmg: o.dmg, kind: o.hazard, kb: o.kb ?? 4, status: o.status });
}
function ahead(w, t, k = 0.6) { const h = w.hero; return inside(w, h.x + (h.vx || 0) * t * k, h.z + (h.vz || 0) * t * k, 1.0); }
function hold(w, e, anim, at = null) { e.anim = anim; e.animT = at ?? (anim === 'roar' ? 0.62 + (w.t % 0.4) : 0.56); e.mx = 0; e.mz = 0; }
function startRite(e, id, o = {}) { e.ai.chan = { id, t0: null, next: 0, ...o }; e.tele = null; e.mx = 0; e.mz = 0; }
// seconds into the rite, or -1 when a stagger broke it
const riteT = (w, e) => { const c = e.ai.chan; if (c.t0 === null) c.t0 = w.t; else if (w.t - c.last > 0.25) return -1; c.last = w.t; return w.t - c.t0; };
function ward(w, e, k, cap = k) { const top = Math.round(e.maxHp * cap); const s = Math.min(top, (e.shield || 0) + Math.round(e.maxHp * k)); if (s > (e.shield || 0)) { e.shield = s; w.emit('shield', { e }); } }
// a mark on the floor that hurts nobody
function mark(w, o) { const hero = w.hero; return w.addHazard({ warn: 0, dmg: 0, ...o, t: 0.06, life: (o.life ?? 1) + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true }); }
// a move announced by the name of its attack (the tests and the sound read 'tele' events)
const announce = (w, e, name) => w.emit('tele', { e, atk: { name } });
// a point near (x, z) that is free for a body of radius r (rings outwards), or null
function nearFree(w, x, z, r) {
  if (spotFree(w, x, z, r)) return { x, z };
  for (let k = 1; k <= 6; k++) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = k * 0.6; const px = x + S(a) * d, pz = z + C(a) * d; if (spotFree(w, px, pz, r)) return { x: px, z: pz }; }
  return null;
}
// start an attack from inside a rite (the rite ends; thinkBoss must not pick another move this step)
function strikeFromRite(w, e, atk) { e.ai.chan = null; w.foeAttack(e, atk); return true; }
// the end of a rite: a beat of stillness before the next move
function endRite(e, cd) { e.ai.chan = null; e.ai.cd = cd; e.anim = 'idle'; e.animT = 0; return true; }
function home(e) { if (!e.ai.home0) e.ai.home0 = { x: e.x, z: e.z }; return e.ai.home0; }

// ================================================================== stats and looks
// The bodies (look.rig) are js/actors/beasts4.js: the crab and the Mother are creatures of their own, the
// three that stand like people are rigs with their own poses (the Ronin's draw, the Guest's held frames, the
// Saint's cross).
export const BOSSES5 = {
  // PROPOSAL: a crab the size of a house, grown in the harbour mud for a hundred years: a domed shell crusted
  // with barnacles, weed and the wreck of a fishing boat, a crown of coral; one claw a crusher as big as a
  // cart, the other a long cutter; eyes on stalks that glow like harbour lamps under the water.
  kingcrab: {
    name: 'The Drowned King-Crab', title: 'Lord of the Harbour Mud', hp: 2700, poise: 999, speed: 2.3, r: 1.55, mass: 16, scale: 2.5, boss: true,
    look: { rig: 'kingcrab', eyes: 0x70ffe8, colors: { shell: 0x9a3a24, top: 0xc8603a, dark: 0x4a1a10, under: 0xd8b898, claw: 0xb04a2c, tip: 0xf0dcc0, moss: 0x5a8a4a, barnacle: 0xe0d8c4, coral: 0xff6a5a, wood: 0x5a4430, flesh: 0xff7a60, crown: 0xe0b850 } },
  },
  // PROPOSAL: something that lived under the ossuary before the dead were laid there: a long pale body, a
  // smooth white head with no eyes and a mouth that opens down its whole length, and too many limbs, each
  // twice as long as a man, each ending in a hand. It walks on the walls and the vault and drops.
  hollowmother: {
    name: 'The Hollow Mother', title: 'Who Nurses the Dark', hp: 4600, poise: 999, speed: 3.8, r: 0.9, mass: 9, scale: 2.05, boss: true,
    look: { rig: 'hollowmother', eyes: 0xfff4e8, colors: { skin: 0xe8e2d6, shade: 0xb8b0a2, dark: 0x16121a, mouth: 0x2a0408, nail: 0x3a3430, glow: 0xffe8d0 } },
  },
  // PROPOSAL: a swordsman of a foreign order who came to the city to ring the bell for his own dead and
  // found it silent: a wide straw hat, a cloth over his mouth, a long blade he keeps sheathed. He has not
  // moved from the Heights' terrace in a hundred nights. Petals of the dead orchard blow round him.
  ronin: {
    name: 'The Stilled Ronin', title: 'A Hundred Nights Unmoving', hp: 6000, poise: 999, speed: 0.01, r: 0.6, mass: 8, scale: 1.55, boss: true,
    look: { rig: 'ronin', weapon: 'saber', blade: 0xf4f6ff, bladeGlow: 0x203040, guard: 0x2a2a30, eyes: 0xe8f0ff, skirt: 0x22202a, cloak: true, cloakLen: [0.36, 0.38, 0.36], cloakW: [0.15, 0.14, 0.12], longHair: true, bulk: 1.0,
      colors: { skin: 0xc8b49a, hair: 0x1a1618, tunic: 0x2a2632, pants: 0x1c1a22, boots: 0x16141a, cloak: 0x3a2a3a, cloakDark: 0x281c28, glove: 0x2a2632, shoulder: 0x3a3442, belt: 0x8a2a2a, hat: 0xb89a5a, cloth: 0x2a2a30, sheath: 0x1a1414, petal: 0xffb0c8 } },
  },
  // PROPOSAL: it came to the market as a guest, and it is still smiling. A tall, thin figure in a black frock
  // coat and white gloves, a face like a blank white plate, two pin-point eyes and a smile far too wide that
  // never changes. It moves only when you look away. It bows.
  smiling: {
    name: 'The Smiling Guest', title: 'It Is So Glad You Came', hp: 2900, poise: 999, speed: 0.01, r: 0.5, mass: 6, scale: 1.8, boss: true,
    look: { rig: 'guest', eyes: 0xffffff, bulk: 0.78, headSize: 0.27, noHair: true,
      colors: { skin: 0xf2efe8, tunic: 0x121014, pants: 0x0c0a0e, boots: 0x08080a, glove: 0xf0ece4, shoulder: 0x16141a, belt: 0x16141a, trim: 0xe8e4dc, teeth: 0xffffff, mouth: 0x3a0a0e } },
  },
  // PROPOSAL: a saint the foundry's people burned to keep the furnaces lit when the coal ran out. She came
  // back burning and blessing. A charred figure in white robes gone to ash at the hem, arms spread on the
  // beam she was bound to, a crown of fire and broken irons on her wrists; she floats, head bowed.
  pyresaint: {
    name: 'The Pyre Saint', title: 'Who Burns So Others May See', hp: 4200, poise: 999, speed: 2.2, r: 0.7, mass: 8, scale: 1.7, boss: true, hover: true,
    look: { rig: 'saint', eyes: 0xfff0a0, skirt: 0xe0d8c8, noHair: false, longHair: true, hood: false, bulk: 1.0,
      colors: { skin: 0x3a2a24, hair: 0x1a1210, tunic: 0xe8e0d0, pants: 0xd8d0c0, boots: 0x2a2018, glove: 0x3a2a24, shoulder: 0xe0d8c8, belt: 0x8a6a3a, wood: 0x2a1a10, iron: 0x4a4440, ember: 0xff9a30, ash: 0x8a8070 } },
  },
};

// ================================================================== the Drowned King-Crab (the docks)
// PROPOSAL: the crusher claw slams and sticks in the planks for a moment; the cutter sweeps; both snap
// (lines that close like scissors); it scuttles sideways across the dock like a ram; it spits foam. Its shell
// takes every blow until it breaks (a third of its life); broken, it reels and the soft king is open. Below
// two thirds the shell regrows and the tide comes: it rears and slams, and water floods the half of the
// arena you stand in; it leaps. Below a third the shell is gone for good, crabs pour out from under it and it
// spins with both claws out, the tide rolling in from both sides.
const CRABS = ['crab', 'rat'];
function shellUp(w, e, k) { e.shield = Math.round(e.maxHp * k); e.shellOn = true; e.shellMax = e.shield; w.emit('shield', { e }); w.emit('shellUp', { e }); }
function shellCrack(w, e) {
  e.shellOn = false; e.shellBroken = (e.shellBroken || 0) + 1; w.emit('shellBreak', { e }); w.emit('shake', { amt: 0.9 }); w.slow(0.5, 0.35);
  e.state = 'stagger'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.stagT = 3.4; e.atk = null; e.tele = null; e.leapH = 0; e.leapFrom = null; e.ai.chan = null;
}
// the tide: it floods the half of the arena (beside the crab, the side you stand on) in lanes of water
function tide(w, e, p, K, sideOf = null, warn = 1.25) {
  const hero = w.hero; const f = e.face; const fx = S(f), fz = C(f); const rx = C(f), rz = -S(f);
  const lat = (hero.x - e.x) * rx + (hero.z - e.z) * rz; const side = sideOf ?? (lat >= 0 ? 1 : -1);
  for (let o = 0.6; o <= 7.4; o += 1.35) {
    const ox = e.x + rx * o * side - fx * 6, oz = e.z + rz * o * side - fz * 6;
    w.addHazard({ shape: 'line', x: ox, z: oz, face: f, len: 18, width: 1.45, warn, life: 0.55, dmg: 15 * K * e.dmgMul, src: e, kind: 'tide', kb: 9 });
  }
  w.emit('tide', { e, side, x: e.x + rx * 4 * side, z: e.z + rz * 4 * side, face: f, warn });
}
function scissor(w, e, p, K) {
  const a0 = e.face;
  for (const o of [-0.34, 0.34]) lane(w, e, e.x + S(a0 + o) * 1.2, e.z + C(a0 + o) * 1.2, a0 - o * 0.35, { len: 7.5, width: 1.0, warn: 0.5, life: 0.25, dmg: 18 * K, kind: 'water', kb: 6 });
  if (p >= 2) lane(w, e, e.x, e.z, a0, { len: 8.5, width: 1.2, warn: 0.85, life: 0.25, dmg: 18 * K, kind: 'water', kb: 7 });
}
const kingcrab = {
  phases: [0.66, 0.33], keep: 3.6, turn: 2.4,
  tick(w, e) {
    hookWorld5(w); home(e);
    if (!e.ai.init) { e.ai.init = true; shellUp(w, e, 0.3); }
    if (e.shellOn && !(e.shield > 0)) shellCrack(w, e);
  },
  moves(p) {
    const K = POWER.kingcrab; const q = p >= 3 ? 0.85 : 1;
    const sidle = (side) => strike({ name: 'sidle', anim: 'scuttle', shape: 'line', range: 2.6, width: 3.0, windup: 0.95, active: 1.6, dur: 2.15, dmg: 21 * K, kb: 10, lunge: 11, lungeT: [0.95, 1.55], tele: 'line', teleRange: 10, turn: 2.2, side });
    const m = [
      // the crusher comes down; it sticks in the planks a moment (a long recovery: the opening)
      { id: 'crush', w: 3, max: 4.8, a: quick(strike({ name: 'crush', anim: 'crush', shape: 'circle', offset: 2.6, radius: 2.0, windup: 0.95, active: 1.05, dur: 2.4, dmg: 23 * K, kb: 9, lunge: 0.4, tele: 'circle', onStrike: (w, e) => { const x = e.x + S(e.face) * 2.6, z = e.z + C(e.face) * 2.6; wave(w, e, x, z, p >= 2 ? 6 : 4.6, { r0: 1.8, warn: 0.05, life: 0.8, dmg: 10 * K, kind: 'water' }); w.emit('clawStuck', { e, x, z }); } }), q) },
      // eight legs stamp the planks round it: no standing in its shadow
      { id: 'stamp', w: 2.2, max: 3.0, cd: 3, a: strike({ name: 'stamp', anim: 'stamp', shape: 'circle', offset: 0, radius: 3.0, windup: 0.7, active: 0.8, dur: 1.3, dmg: 17 * K, kb: 9, lunge: 0, tele: 'circle' }) },
      // the cutter sweeps the front
      { id: 'sweep', w: 2.4, max: 5, a: quick(strike({ name: 'sweep', anim: 'sweep', range: 5.0, arc: deg(200), windup: 0.85, active: 1.0, dur: 1.6, dmg: 18 * K, kb: 8, lunge: 0.6 }), q) },
      // both claws snap shut: two lanes that close like scissors (and the middle from phase two)
      { id: 'scissor', w: 1.8, max: 7.5, a: { name: 'scissor', anim: 'pinch', dur: 1.5, windup: 0.7, active: 0.75, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => scissor(w, e, p, K) } },
      // a sideways scuttle: the whole shell rams across the dock
      { id: 'sidle', w: 1.6, min: 3.5, max: 13, cd: 5, run: (w, e) => w.foeAttack(e, sidle(w.rand() < 0.5 ? 1 : -1)) },
      // foam spat in a fan of slow bubbles
      { id: 'foam', w: 1.5, min: 3, cd: 4, a: { name: 'foam', anim: 'spit', dur: 1.4, windup: 0.7, active: 0.72, tele: 'none', ranged: { kind: 'bubble', speed: 5.2, r: 0.34, dmg: 11 * K, life: 3, fan: p >= 2 ? 7 : 5, spread: deg(14), homing: 0.35 } } },
      // little crabs pour out from under the shell
      { id: 'brood', w: 1, cd: 14, run: (w, e) => {
        if (!e.ai.broodClock) { e.ai.broodClock = true; e.ai.cd_brood = w.t + 8; return w.foeAttack(e, sidle(1)); }
        call(w, e, CRABS, p >= 3 ? 3 : 2, ADD_TIER.kingcrab, 3, 3, 4); w.emit('brood', { e }); roarPause(e);
      } },
    ];
    if (p >= 2) {
      // the tide: it rears and slams, and the half of the dock you stand on floods
      m.push({ id: 'tide', w: 1.7, cd: p >= 3 ? 7 : 9, a: { name: 'tide', anim: 'rear', dur: 2.2, windup: 0.9, active: 0.92, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { tide(w, e, p, K); if (p >= 3) later(w, e, 1.0, (w2) => tide(w2, e, p, K, null, 1.15)); } } });
      // it leaps, a house of shell, and comes down where you were
      m.push({ id: 'leap', w: 1.2, min: 4, cd: 8, a: { name: 'leap', anim: 'leap', dur: 2.2, windup: 0.85, active: 1.5, leap: true, shape: 'circle', offset: 0, radius: 3.0, dmg: 25 * K, kb: 10, tele: 'circleAt', heavy: true, onStrike: (w, e) => wave(w, e, e.x, e.z, 8, { r0: 3, warn: 0, life: 1, dmg: 11 * K, kind: 'water' }) } });
    }
    // the maelstrom: it spins with both claws out
    if (p >= 3) m.push({ id: 'maelstrom', w: 1.5, max: 5, cd: 6, a: strike({ name: 'maelstrom', anim: 'spin', shape: 'circle', offset: 0, radius: 3.9, windup: 1.0, active: 1.5, dur: 2.3, dmg: 21 * K, kb: 10, lunge: 0, tele: 'circle', onStrike: (w, e) => { wave(w, e, e.x, e.z, 9, { r0: 3.9, warn: 0.3, life: 1.2, dmg: 11 * K, kind: 'water' }); } }) });
    return m;
  },
  onPhase(w, e, p) {
    if (p === 2) { shellUp(w, e, 0.2); call(w, e, CRABS, 2, ADD_TIER.kingcrab, 3, 3, 4); }
    if (p === 3) { e.shield = 0; e.shellOn = false; e.shellGone = true; e.speed *= 1.25; call(w, e, CRABS, 3, ADD_TIER.kingcrab, 3, 3, 4); w.emit('shellBreak', { e, gone: true }); }
  },
};

// ================================================================== the Hollow Mother (the undercroft)
// PROPOSAL: on the floor she rakes, impales with one long limb, needles you with four, embraces all round.
// She climbs: she is gone up the walls and into the vault, limbs stab out of the dark from the edges, and
// then she drops where you stand (its shadow marked first). From two thirds the lights flicker and she
// calls with the voices of the Hushed from three places in the dark, then bursts from one of them; she
// skitters round you; she appears right in front of you. Below a third the lights are out.
function stabFromDark(w, e, K, warn = 0.75) {
  const h = w.hero; const a = w.rand() * TAU; const px = h.x + S(a) * 7.5, pz = h.z + C(a) * 7.5;
  w.addHazard({ shape: 'line', x: px, z: pz, face: a + Math.PI, len: 11, width: 0.85, warn, life: 0.25, dmg: 14 * K * e.dmgMul, src: e, kind: 'limb', kb: 6 });
}
function hideUp(w, e, mode, o = {}) { e.hidden = true; e.ceiling = mode === 'climb'; e.iframes = 99; e.tele = null; e.atk = null; e.ai.hide = { mode, t0: w.t, next: 0.45, k: 0, n: 2, drop: null, ...o }; w.emit(mode === 'climb' ? 'climb' : 'vanish', { e }); }
function surface(w, e, x, z) {
  const p = nearFree(w, x, z, e.r) || { x: e.x, z: e.z }; e.x = p.x; e.z = p.z;
  e.hidden = false; e.ceiling = false; e.iframes = 0; e.ai.hide = null; e.face = angTo(e, w.hero);
}
const hollowmother = {
  phases: [0.66, 0.33], keep: 2.4, turn: 6,
  tick(w, e) {
    hookWorld5(w); home(e);
    // the lights: steady, then failing in fits (phase two), then out (phase three)
    if (e.phase >= 2 && w.t >= (e.ai.flickAt || 0)) { e.ai.flickAt = w.t + 3.5 + w.rand() * 3; e.ai.flickTo = w.t + 1.1; w.emit('flicker', { e }); }
    e.flicker = e.phase >= 2 && w.t < (e.ai.flickTo || 0) ? 1 : 0;
    e.dark = e.phase >= 3 ? 0.72 : (e.hidden ? 0.45 : 0);
  },
  moves(p) {
    const K = POWER.hollowmother; const q = p >= 3 ? 0.88 : 1;
    const m = [
      { id: 'rake', w: 2.6, max: 3.4, a: quick(strike({ name: 'rake', anim: 'rake', range: 3.3, arc: deg(180), windup: 0.6, active: 0.72, dur: 1.2, dmg: 18 * K, kb: 6, lunge: 2.6 }), q) },
      // one limb, twice a man's height, driven down a line
      { id: 'impale', w: 2, max: 6, a: quick(strike({ name: 'impale', anim: 'stab', shape: 'line', range: 6.2, width: 0.95, windup: 0.75, active: 0.85, dur: 1.4, dmg: 21 * K, kb: 7, lunge: 1.0, tele: 'line' }), q) },
      // needles: four limbs, one after another
      { id: 'needles', w: 1.7, max: 8, cd: 4, a: { name: 'needles', anim: 'flurry', dur: 1.6, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
        const a0 = angTo(e, w.hero); [-0.32, 0.18, -0.08, 0.3].forEach((o, i) => lane(w, e, e.x, e.z, a0 + o, { len: 7.5, width: 0.75, warn: 0.5 + i * 0.16, life: 0.2, dmg: 14 * K, kind: 'limb', kb: 5 }));
      } } },
      // the embrace: every limb closes round her
      { id: 'cradle', w: 1.3, max: 3.2, cd: 6, a: strike({ name: 'cradle', anim: 'embrace', range: 3.6, arc: deg(300), windup: 0.95, active: 1.05, dur: 1.8, dmg: 24 * K, kb: 4, lunge: 0.6 }) },
      // up the wall and into the dark; limbs stab from the edges; then she drops on you
      { id: 'climb', w: 1.4, cd: p >= 3 ? 8 : 11, run: (w, e) => hideUp(w, e, 'climb', { n: p >= 3 ? 3 : 2 }) },
    ];
    if (p >= 2) {
      // the voices of the Hushed from three places in the dark; she bursts from one of them
      m.push({ id: 'mimic', w: 1.3, cd: 12, run: (w, e) => {
        const h = w.hero; const spots = []; const a0 = w.rand() * TAU;
        for (let i = 0; i < 3; i++) { const a = a0 + i * TAU / 3 + (w.rand() - 0.5) * 0.5; const r = 4.6 + w.rand() * 1.2; const q2 = nearFree(w, h.x + S(a) * r, h.z + C(a) * r, 0.9); if (q2) spots.push(q2); }
        if (spots.length < 2) return hideUp(w, e, 'climb', { n: 2 });
        hideUp(w, e, 'mimic', { spots, real: Math.floor(w.rand() * spots.length) });
        for (const s of spots) mark(w, { shape: 'circle', x: s.x, z: s.z, r: 0.9, life: 1.9, kind: 'voice', src: e });
        w.emit('mimic', { e, spots });
      } });
      m.push({ id: 'skitter', w: 1.2, cd: 6, run: (w, e) => startRite(e, 'skitter', { dir: w.rand() < 0.5 ? 1 : -1 }) });
      // she is right in front of you
      m.push({ id: 'scare', w: 1.0, cd: 10, run: (w, e) => hideUp(w, e, 'scare') });
    }
    return m;
  },
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false;
    if (c.id === 'skitter') { // she scuttles round you, low and fast
      const h = w.hero; const a = angTo(h, e) + c.dir * 0.9; const tx = h.x + S(a) * 3.2, tz = h.z + C(a) * 3.2; const b = Math.atan2(tx - e.x, tz - e.z);
      e.mx = S(b); e.mz = C(b); e.moveSpeed = 9; e.anim = 'skitter'; e.face = angTo(e, h);
      if (t > 1.1) return strikeFromRite(w, e, strike({ name: 'rake', anim: 'rake', range: 3.3, arc: deg(180), windup: 0.55, active: 0.68, dur: 1.15, dmg: 18 * POWER.hollowmother, kb: 6, lunge: 3 }));
      return true;
    }
    return false;
  },
  hiddenThink(w, e) {
    const H = e.ai.hide; const K = POWER.hollowmother; e.mx = 0; e.mz = 0; e.anim = 'idle'; e.iframes = 99;
    if (!H) { e.hidden = false; e.iframes = 0; return; }
    const t = w.t - H.t0; const hero = w.hero;
    if (H.mode === 'climb') {
      while (H.k < H.n && t >= H.next) { stabFromDark(w, e, K); H.k++; H.next += 0.7; }
      if (!H.drop && t >= 0.5 + H.n * 0.7) { const tg = inside(w, hero.x, hero.z, 1.3); H.drop = { x: tg.x, z: tg.z, at: w.t + 1.0 }; spot(w, e, tg.x, tg.z, 2.0, { warn: 1.0, life: 0.25, dmg: 24 * K, kind: 'drop', kb: 9 }); w.emit('dropWarn', { e, x: tg.x, z: tg.z }); }
      if (H.drop && w.t >= H.drop.at) {
        surface(w, e, H.drop.x, H.drop.z); w.emit('appear', { e }); w.emit('land', { e }); w.emit('shake', { amt: 0.7 });
        e.anim = 'land'; e.animT = 0; e.ai.cd = 0.9; e.state = 'roar'; e.t = 0.6;
      }
      return;
    }
    if (H.mode === 'mimic') {
      if (t < 1.9) return;
      const s = H.spots[H.real]; H.spots.forEach((q, i) => { if (i !== H.real) spot(w, e, q.x, q.z, 1.3, { warn: 0.3, life: 0.25, dmg: 13 * K, kind: 'limb', kb: 5 }); });
      surface(w, e, s.x, s.z); w.emit('appear', { e }); w.emit('scare', { e });
      w.foeAttack(e, strike({ name: 'lunge', anim: 'stab', shape: 'line', range: 6.5, width: 1.2, windup: 0.5, active: 0.8, dur: 1.4, dmg: 20 * K, kb: 8, lunge: 10, lungeT: [0.5, 0.78], tele: 'line', turn: 1.5 }));
      return;
    }
    if (H.mode === 'scare') {
      if (t < 0.9) return;
      const a = hero.face; let p = null;
      for (const d of [2.2, 1.8, 2.8]) { const x = hero.x + S(a) * d, z = hero.z + C(a) * d; if (spotFree(w, x, z, e.r) && w.clear(hero, { x, z })) { p = { x, z }; break; } }
      if (!p) { const b = hero.face + Math.PI; p = nearFree(w, hero.x + S(b) * 2.4, hero.z + C(b) * 2.4, e.r) || { x: e.x, z: e.z }; }
      surface(w, e, p.x, p.z); w.emit('appear', { e }); w.emit('scare', { e, front: true }); w.emit('shake', { amt: 0.5 });
      w.foeAttack(e, strike({ name: 'shriek', anim: 'embrace', range: 3.1, arc: deg(200), windup: 0.6, active: 0.7, dur: 1.4, dmg: 21 * K, kb: 7, lunge: 1.5 }));
      return;
    }
    e.hidden = false; e.iframes = 0; e.ai.hide = null;
  },
  onPhase(w, e, p) {
    if (p === 2) { e.speed *= 1.1; w.emit('flicker', { e }); }
    if (p === 3) { e.speed *= 1.12; w.emit('lightsOut', { e }); }
  },
};

// ================================================================== the Stilled Ronin (the heights)
// PROPOSAL: he does not walk. He stands; his hand is on the hilt; a single line of light runs from him through
// you to the edge of the terrace, and then he is at the end of it, the blade out, and you hear the cut. He
// holds the blade out a moment (the opening), then sheathes it slowly: the click. On guard (a faint ring
// round him) he answers any blow at once; left alone, he cuts the whole ring round him. Up close he draws
// short. From two thirds he cuts twice (the second line from where he landed), steps in three blinks, and
// the wind brings the orchard's petals across the terrace like blades. Below a third, a hundred nights: he
// is gone, and the lines of light come one after another from every side.
function iaiLane(w, e, from, ang, warn) {
  const max = reach(w, from.x, from.z, ang, 17); const len = Math.max(2.5, max);
  w.addHazard({ shape: 'line', x: from.x, z: from.z, face: ang, len, width: 1.25, warn, life: 0.16, dmg: 28 * POWER.ronin * e.dmgMul, src: e, kind: 'iai', kb: 8 });
  return { ang, len };
}
// he crosses the lane in no time and is at its end (a stride short of the wall)
function iaiCut(w, e, from, L) {
  const d = Math.max(0.6, L.len - 0.9); let to = { x: from.x + S(L.ang) * d, z: from.z + C(L.ang) * d };
  to = nearFree(w, to.x, to.z, e.r) || { x: from.x, z: from.z };
  e.x = to.x; e.z = to.z; e.vx = e.vz = 0; e.face = L.ang; e.drawn = true;
  w.emit('hook', { e, x: from.x, z: from.z, hit: false, iai: true }); // the line of light where he passed
  w.emit('iai', { e, x0: from.x, z0: from.z, x1: to.x, z1: to.z }); w.emit('shake', { amt: 0.55 }); w.stop(0.06);
}
const ronin = {
  phases: [0.66, 0.33], keep: 40, turn: 2.6,
  tick(w, e) { hookWorld5(w); home(e); e.mx = 0; e.mz = 0; if (!e.ai.chan) e.stance = null; if (!e.ai.chan && e.drawn && e.state === 'idle') e.drawn = false; },
  moves(p) {
    const K = POWER.ronin;
    const m = [
      // the draw-cut across the whole terrace
      { id: 'iai', w: 3, cd: 3.2, run: (w, e) => startRite(e, 'iai', { n: p >= 2 ? 2 : 1 }) },
      // on guard: strike him and he answers
      { id: 'kamae', w: 1.8, max: 6, cd: 7, run: (w, e) => startRite(e, 'kamae') },
      // a short draw for whoever stands too close
      { id: 'nuki', w: 2.4, max: 3.0, a: strike({ name: 'nuki', anim: 'iaido', range: 3.1, arc: deg(170), windup: 0.5, active: 0.58, dur: 1.6, dmg: 20 * K, kb: 7, lunge: 3.5 }) },
    ];
    if (p >= 2) {
      m.push({ id: 'steps', w: 1.6, min: 2.2, cd: 6, run: (w, e) => startRite(e, 'steps') });
      m.push({ id: 'petals', w: 1.4, cd: 9, run: (w, e) => startRite(e, 'petals', { a: w.rand() * TAU }) });
    }
    if (p >= 3) m.push({ id: 'hundred', w: 1.4, cd: 13, run: (w, e) => { e.hidden = true; e.iframes = 99; e.tele = null; e.drawn = false; e.ai.hundred = { t0: w.t, n: 0, lanes: [] }; w.emit('vanish', { e }); w.emit('stillness', { e }); } });
    return m;
  },
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); const K = POWER.ronin; const p = e.phase;
    if (t < 0) { e.drawn = false; e.stance = null; return false; }
    e.mx = 0; e.mz = 0;
    if (c.id === 'iai') {
      const still = p >= 3 ? 0.85 : (p >= 2 ? 1.0 : 1.25);
      if (!c.lane) { c.from = { x: e.x, z: e.z }; c.lane = iaiLane(w, e, c.from, angTo(e, w.hero), still); c.cuts = 0; c.at = still; announce(w, e, 'iai'); w.emit('stillness', { e }); }
      if (c.cuts < c.n && t >= c.at) {
        iaiCut(w, e, c.from, c.lane); c.cuts++;
        if (c.cuts < c.n) { c.from = { x: e.x, z: e.z }; c.lane = iaiLane(w, e, c.from, angTo(e, w.hero), 0.8); c.at = t + 0.8; }
        else c.done = t;
      }
      if (c.done === undefined) { e.stance = 'iai'; hold(w, e, 'stance', t); return true; }
      // the blade held out (the opening), then the slow sheathe and the click
      e.stance = null; const after = t - c.done;
      if (after < 0.75) { e.anim = 'drawn'; e.animT = after; return true; }
      if (after < 1.55) { e.anim = 'sheathe'; e.animT = after - 0.75; return true; }
      e.drawn = false; w.emit('sheathe', { e }); w.emit('block', { e, x: e.x, z: e.z, sheathe: true });
      return endRite(e, 1.1 + w.rand() * 0.8);
    }
    if (c.id === 'kamae') {
      if (c.hp0 === undefined) { c.hp0 = e.hp + (e.shield || 0); mark(w, { shape: 'circle', x: e.x, z: e.z, r: 3.3, life: 2.3, kind: 'kamae', src: e }); announce(w, e, 'kamae'); }
      e.stance = 'counter'; hold(w, e, 'kamae', t);
      if (e.hp + (e.shield || 0) < c.hp0 - 0.5) { // struck on guard: the answer
        e.stance = null; w.emit('counter', { e }); e.face = angTo(e, w.hero);
        return strikeFromRite(w, e, strike({ name: 'counter', anim: 'iaido', range: 3.5, arc: deg(220), windup: 0.42, active: 0.5, dur: 1.5, dmg: 24 * K, kb: 8, lunge: 6, lungeT: [0.42, 0.5] }));
      }
      if (t >= 2.3) { e.stance = null; return strikeFromRite(w, e, strike({ name: 'tsubame', anim: 'iaido', range: 4.4, arc: deg(250), windup: 0.32, active: 0.4, dur: 1.4, dmg: 21 * K, kb: 8, lunge: 0.5 })); }
      return true;
    }
    if (c.id === 'steps') { // three blinks down three short lanes, each marked a breath before
      if (c.k === undefined) { c.k = 0; c.at = 0; announce(w, e, 'steps'); }
      if (c.k < 3 && t >= c.at && !c.lane) { const a = angTo(e, w.hero) + (c.k === 1 ? 0.45 : (c.k === 2 ? -0.45 : 0)); c.from = { x: e.x, z: e.z }; const len = Math.min(5.5, Math.max(2.5, reach(w, e.x, e.z, a, 5.5))); w.addHazard({ shape: 'line', x: e.x, z: e.z, face: a, len, width: 1.15, warn: 0.5, life: 0.14, dmg: 17 * K * e.dmgMul, src: e, kind: 'iai', kb: 6 }); c.lane = { ang: a, len }; c.cutAt = t + 0.5; }
      if (c.lane && t >= c.cutAt) { iaiCut(w, e, c.from, c.lane); c.lane = null; c.k++; c.at = t + 0.12; }
      if (c.k >= 3) { if (c.end === undefined) c.end = t; const a2 = t - c.end; if (a2 < 0.6) { e.anim = 'drawn'; e.animT = a2; return true; } if (a2 < 1.3) { e.anim = 'sheathe'; e.animT = a2 - 0.6; return true; } e.drawn = false; w.emit('sheathe', { e }); return endRite(e, 1.0); }
      e.stance = 'iai'; hold(w, e, 'stance', 0.5); return true;
    }
    if (c.id === 'petals') { // the wind: lanes of petals across the terrace, one after another
      if (!c.laid) {
        c.laid = true; const h = w.hero; const a = c.a; const px = C(a), pz = -S(a); const base = { x: h.x - S(a) * 9, z: h.z - C(a) * 9 };
        const off = (w.rand() - 0.5) * 1.6;
        for (let i = -2; i <= 2; i++) { const o = i * 2.6 + off; w.addHazard({ shape: 'line', x: base.x + px * o, z: base.z + pz * o, face: a, len: 18, width: 1.3, warn: 0.95 + (i + 2) * 0.28, life: 0.3, dmg: 15 * K * e.dmgMul, src: e, kind: 'petal', kb: 5 }); }
        w.emit('gust', { e, a }); announce(w, e, 'petals');
      }
      hold(w, e, 'kamae', t);
      if (t >= 2.6) { w.emit('sheathe', { e }); return endRite(e, 0.8); }
      return true;
    }
    return false;
  },
  // a hundred nights: lines of light from every side, one after another, then he is there, sheathing
  hiddenThink(w, e) {
    const H = e.ai.hundred; e.mx = 0; e.mz = 0; e.iframes = 99; if (!H) { e.hidden = false; e.iframes = 0; return; }
    const t = w.t - H.t0; const hero = w.hero; const n = 5;
    while (H.n < n && t >= 0.4 + H.n * 0.5) {
      const a = w.rand() * TAU; const from = inside(w, hero.x - S(a) * 8, hero.z - C(a) * 8, 1.0); const ang = angTo(from, hero);
      w.addHazard({ shape: 'line', x: from.x, z: from.z, face: ang, len: 16, width: 1.2, warn: 0.95, life: 0.14, dmg: 18 * POWER.ronin * e.dmgMul, src: e, kind: 'iai', kb: 7 });
      H.lanes.push({ from, ang, at: t + 0.95 }); H.n++; announce(w, e, 'hundred');
    }
    for (const L of H.lanes) if (!L.cut && t >= L.at) { L.cut = true; w.emit('hook', { e, x: L.from.x, z: L.from.z, hit: false, iai: true, x2: L.from.x + S(L.ang) * 16, z2: L.from.z + C(L.ang) * 16 }); w.emit('shake', { amt: 0.35 }); }
    if (H.n >= n && H.lanes.every((L) => L.cut) && t >= 0.4 + n * 0.5 + 0.6) {
      const L = H.lanes[H.lanes.length - 1]; const p2 = nearFree(w, L.from.x + S(L.ang) * 12, L.from.z + C(L.ang) * 12, e.r) || nearFree(w, hero.x + 4, hero.z, e.r) || { x: e.x, z: e.z };
      e.x = p2.x; e.z = p2.z; e.hidden = false; e.iframes = 0; e.ai.hundred = null; e.face = angTo(e, hero); e.drawn = true; w.emit('appear', { e });
      startRite(e, 'iai', { n: 0, done: 0, lane: true, cuts: 0, t0: null }); e.ai.chan.done = 0; // straight to the sheathe
    }
  },
  onPhase(w, e, p) { e.drawn = false; e.stance = null; if (p === 3) w.emit('stillness', { e }); },
};

// ================================================================== the Smiling Guest (the market or the nave)
// PROPOSAL: while you look at it, it stands still and smiles; the smile does the work: teeth close in a ring
// round you, its arm reaches the length of the square, it laughs and the laugh rolls out in rings. Look
// away (or dodge away) and it comes, in stuttering frames, a stride at a time, and takes hold of you. From
// two thirds it wears your shape: four of you stand round you, all smiling, and only one is it (its eyes
// are white); the lights go out, its smile drifts in the dark, laughing, and when they come back it is
// behind you. Below a third the floor itself is full of teeth and it comes faster.
const WATCH = 1.0; // radians either side of where the hero faces
export function watched(w, e) {
  const h = w.hero; if (!h || h.dead || e.hidden || (e.dark || 0) > 0.5) return false;
  return Math.abs(wrap(angTo(h, e) - h.face)) < WATCH && w.clear(h, e);
}
// a stride closer, in no time at all: a frame of a film with frames missing
export function stutter(w, e, step) {
  const h = w.hero; const d = dist(e, h); if (d < 1.6) return false;
  const a = angTo(e, h); const k = Math.min(step, d - 1.5);
  for (const off of [0, 0.5, -0.5, 1.0, -1.0]) { const x = e.x + S(a + off) * k, z = e.z + C(a + off) * k; if (spotFree(w, x, z, e.r) || (!w._blocked(x, z, e.r * 0.8) && free(w, x, z, e.r))) { w.emit('stutter', { e, fx: e.x, fz: e.z, x, z }); e.x = x; e.z = z; e.face = angTo(e, h); e.frame = (e.frame || 0) + 1; return true; } }
  return false;
}
// the look a mask takes: the warden's own, a white smile across the face
export function maskLook(hero, real) {
  const H = HEROES[hero && hero.heroId] || HEROES.warden; const W = WEAPONS[hero && hero.stats && hero.stats.weapon];
  const look = { ...H.look, ...(W && W.look ? W.look : {}) };
  return { ...look, rig: 'guestmask', base: look, eyes: real ? 0xffffff : 0xff3030, grin: true, real: !!real, colors: { ...look.colors, cloak: 0x1a181c, cloakDark: 0x121014, tunic: 0x141216 } };
}
function grab(K, q = 1) { return strike({ name: 'grab', anim: 'grab', range: 2.5, arc: deg(170), windup: 0.5 * q, active: 0.62 * q, dur: 1.35, dmg: 26 * K, kb: 9, lunge: 3 }); }
function masks(w, e) { return w.foes().filter((f) => f.type === 'guestmask' && f.ai.guest === e); }
const smiling = {
  phases: [0.66, 0.33], keep: 2.0, turn: 0,
  tick(w, e, h) {
    hookWorld5(w); home(e); e.mx = 0; e.mz = 0;
    if (e.ai.black) return;
    const seen = watched(w, e); e.watched = seen; const hero = w.hero; e.face = angTo(e, hero);
    e.dark = 0; e.flicker = e.phase >= 3 && Math.floor(w.t * 1.6) % 5 === 0 ? 1 : 0;
    if (seen) { e.ai.seenT = (e.ai.seenT || 0) + h; e.anim = 'smile'; return; }
    e.ai.seenT = 0;
    const every = e.phase >= 3 ? 0.22 : (e.phase >= 2 ? 0.26 : 0.3); const step = e.phase >= 3 ? 1.25 : (e.phase >= 2 ? 1.1 : 0.95);
    e.ai.stepT = (e.ai.stepT || 0) - h; if (e.ai.stepT <= 0) { e.ai.stepT = every; stutter(w, e, step); }
    e.anim = 'held';
  },
  moves(p, e) {
    const K = POWER.smiling; const q = p >= 3 ? 0.88 : 1;
    if (e && !e.watched) return [{ id: 'grab', w: 1, max: 2.6, a: grab(K, q) }];
    const m = [
      // its teeth close in a ring round you, then the middle
      { id: 'grin', w: 2.4, cd: 3.5, a: { name: 'grin', anim: 'smile', dur: 1.4, windup: 0.55, active: 0.57, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => {
        const h = inside(w, w.hero.x, w.hero.z, 1.0); const n = 10;
        for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = h.x + S(a) * 3.0, z = h.z + C(a) * 3.0; if (free(w, x, z, 0)) spot(w, e2, x, z, 0.75, { warn: 0.8, life: 0.25, dmg: 14 * K, kind: 'grin', kb: 4 }); }
        spot(w, e2, h.x, h.z, 2.1, { warn: 1.3, life: 0.25, dmg: 18 * K, kind: 'grin', kb: 7 });
      } } },
      // its arm reaches the length of the square
      { id: 'reach', w: 2, min: 2.5, cd: 3, a: { name: 'reach', anim: 'reach', shape: 'line', range: 10, width: 1.0, windup: 0.7, active: 0.8, dur: 1.5, dmg: 18 * K, kb: 7, lunge: 0, tele: 'line', turn: 2.5, heavy: true } },
      // it laughs, and the laugh rolls out in rings
      { id: 'laugh', w: 1.6, cd: 5, a: { name: 'laugh', anim: 'laugh', dur: 1.9, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => { w.emit('laugh', { e: e2 }); for (let i = 0; i < (p >= 2 ? 3 : 2); i++) wave(w, e2, e2.x, e2.z, 9, { r0: 0.8, warn: 0.15 + i * 0.6, life: 1.5, dmg: 12 * K, kind: 'discord' }); } } },
      // close in, it takes hold of you even while you look
      { id: 'grab', w: 1.4, max: 2.4, a: grab(K, q) },
    ];
    if (p >= 2) {
      m.push({ id: 'masquerade', w: 1.4, cd: 16, run: (w, e2) => masquerade(w, e2) });
      m.push({ id: 'blackout', w: 1.3, cd: 12, run: (w, e2) => { e2.hidden = true; e2.iframes = 99; e2.tele = null; e2.dark = 1; e2.grin = true; e2.ai.black = { t0: w.t, n: 0 }; w.emit('lightsOut', { e: e2 }); w.emit('laugh', { e: e2 }); } });
    }
    if (p >= 3) m.push({ id: 'feast', w: 1.5, cd: 6, a: { name: 'feast', anim: 'laugh', dur: 1.6, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e2) => {
      const h = w.hero; for (let i = 0; i < 7; i++) { const a = w.rand() * TAU, r = i ? 1.2 + w.rand() * 3.4 : 0; const x = h.x + S(a) * r, z = h.z + C(a) * r; if (free(w, x, z, 0)) spot(w, e2, x, z, 1.1, { warn: 0.75 + i * 0.12, life: 0.25, dmg: 14 * K, kind: 'grin', kb: 5 }); }
      w.emit('laugh', { e: e2 });
    } } });
    return m;
  },
  hiddenThink(w, e) {
    const hero = w.hero; e.mx = 0; e.mz = 0; e.iframes = 99;
    const B = e.ai.black, M = e.ai.masq;
    if (B) { // the dark: its smile jumps from place to place, laughing; then the light, and it is behind you
      const t = w.t - B.t0; e.dark = 1;
      while (B.n < 5 && t >= B.n * 0.55) { B.n++; const a = w.rand() * TAU, r = 3.6 + w.rand() * 2.4; const q2 = nearFree(w, hero.x + S(a) * r, hero.z + C(a) * r, e.r); if (q2) { w.emit('stutter', { e, fx: e.x, fz: e.z, x: q2.x, z: q2.z }); e.x = q2.x; e.z = q2.z; e.face = angTo(e, hero); } if (B.n % 2) w.emit('laugh', { e }); }
      if (t < 2.9) return;
      const b = hero.face + Math.PI; const q2 = nearFree(w, hero.x + S(b) * 2.0, hero.z + C(b) * 2.0, e.r) || { x: e.x, z: e.z };
      e.x = q2.x; e.z = q2.z; e.hidden = false; e.iframes = 0; e.dark = 0; e.grin = false; e.ai.black = null; e.face = angTo(e, hero); w.emit('appear', { e }); w.emit('lightsOn', { e });
      w.foeAttack(e, strike({ name: 'grab', anim: 'grab', range: 2.6, arc: deg(180), windup: 0.62, active: 0.74, dur: 1.4, dmg: 24 * POWER.smiling, kb: 9, lunge: 2 }));
      return;
    }
    if (M) { // the masks: strike the one with white eyes; the others laugh and burst
      const t = w.t - M.t0; const list = masks(w, e);
      for (const f of M.all) if (f.dead && !f._done) { f._done = true; if (!f.ai.real) { wave(w, e, f.x, f.z, 3.6, { r0: 0.5, warn: 0.15, life: 0.6, dmg: 10 * POWER.smiling, kind: 'discord' }); w.emit('laugh', { e: f }); } }
      const real = M.all.find((f) => f.ai.real);
      if (real && real.dead) { // found: it comes out of the mask, reeling
        const q2 = nearFree(w, real.x, real.z, e.r) || { x: e.x, z: e.z }; e.x = q2.x; e.z = q2.z; e.hidden = false; e.iframes = 0; e.ai.masq = null; e.face = angTo(e, hero);
        for (const f of list) { f.hp = 0; f.dead = true; f.state = 'dead'; f.anim = 'die'; f.animT = 0; w.emit('vanish', { e: f }); }
        w.emit('appear', { e }); w.emit('unmasked', { e });
        e.hp = Math.max(1, e.hp - Math.round(e.maxHp * 0.06)); w.emit('hit', { src: hero, dst: e, dmg: Math.round(e.maxHp * 0.06), x: e.x, z: e.z, ang: 0, heavy: true });
        e.state = 'stagger'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.stagT = 2.4; e.tele = null; e.atk = null;
        return;
      }
      if (t < 5.0 && list.length) return;
      // no one found it: it steps out of the last mask behind you
      for (const f of list) { f.hp = 0; f.dead = true; f.state = 'dead'; f.anim = 'die'; f.animT = 0; w.emit('vanish', { e: f }); }
      const b = hero.face + Math.PI; const q2 = nearFree(w, hero.x + S(b) * 2.0, hero.z + C(b) * 2.0, e.r) || { x: e.x, z: e.z };
      e.x = q2.x; e.z = q2.z; e.hidden = false; e.iframes = 0; e.ai.masq = null; e.face = angTo(e, hero); w.emit('appear', { e });
      w.foeAttack(e, grab(POWER.smiling)); return;
    }
    e.hidden = false; e.iframes = 0; e.dark = 0; e.grin = false;
  },
  onPhase(w, e, p) { if (p === 2) masquerade(w, e); if (p === 3) w.emit('laugh', { e }); },
};
function masquerade(w, e) {
  const hero = w.hero; const n = 4; const realI = Math.floor(w.rand() * n); const all = []; const a0 = w.rand() * TAU;
  for (let i = 0; i < n; i++) {
    const a = a0 + i * TAU / n; const q2 = nearFree(w, hero.x + S(a) * 3.8, hero.z + C(a) * 3.8, 0.45); if (!q2 || !known('guestmask')) continue;
    const f = w.spawnFoe('guestmask', q2.x, q2.z, { tier: ADD_TIER.smiling, aggro: true, rise: false });
    f.ai.locked = true; f.ai.guest = e; f.ai.real = i === realI; f.def = { ...f.def, look: maskLook(hero, i === realI) };
    if (f.ai.real) { f.maxHp = f.hp = Math.round(f.hp * 1.3); }
    all.push(f);
  }
  if (!all.length) return;
  if (!all.some((f) => f.ai.real)) all[0].ai.real = true;
  e.hidden = true; e.iframes = 99; e.tele = null; e.ai.masq = { t0: w.t, all }; w.emit('masquerade', { e }); w.emit('vanish', { e });
}

// ================================================================== the Pyre Saint (the foundry)
// PROPOSAL: fire that stays: rings of flame spread out from her, wave after wave, each with a gap, and the
// floor burns where they passed; molten bronze rains round you; she brands the floor in lanes of fire; she
// flares up close; embers seek you. The cross: she rises, arms spread on her beam, and a cross of fire is
// laid through the foundry, then the nova rolls out of her. Below a third she is a pillar of flame that
// hunts you, burning a trail, pulsing rings; then she is a saint again, and the cross comes at once.
function pyreRings(w, e, p, K, waves = 3) {
  for (let i = 0; i < waves; i++) {
    const R = 2.2 + i * 2.1; const n = Math.max(5, Math.round(TAU * R / 1.85)); const gap = w.rand() * TAU; const gw = 0.55;
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU; if (Math.abs(wrap(a - gap)) < gw) continue;
      const x = e.x + S(a) * R, z = e.z + C(a) * R; if (!free(w, x, z, 0)) continue;
      spot(w, e, x, z, 0.82, { warn: 0.8 + i * 0.5, life: p >= 2 ? 2.6 : 2.1, dmg: 7 * K, kind: 'pyre', kb: 3, status: { burn: 1 } });
    }
  }
  w.emit('pyreRings', { e });
}
function crossFire(w, e, K, a0, warn) {
  for (let k = 0; k < 4; k++) w.addHazard({ shape: 'line', x: e.x, z: e.z, face: a0 + k * Math.PI / 2, len: 15, width: 1.4, warn, life: 0.35, dmg: 16 * K * e.dmgMul, src: e, kind: 'holyfire', kb: 8, status: { burn: 1 } });
}
const pyresaint = {
  phases: [0.66, 0.33], keep: 4.6, turn: 3.4,
  tick(w, e) {
    hookWorld5(w); home(e); if (!e.ai.chan) { e.pillar = false; e.crossed = false; }
    // her robes flare at whoever stands in her shadow
    const h = w.hero; if (h && !h.dead && dist(e, h) < e.r + 1.5 && w.t >= (e.ai.flareAt || 0)) { e.ai.flareAt = w.t + 1.1; spot(w, e, e.x, e.z, e.r + 1.3, { warn: 0.4, life: 0.2, dmg: 11 * POWER.pyresaint, kind: 'pyre', kb: 7, status: { burn: 1 } }); }
  },
  moves(p) {
    const K = POWER.pyresaint;
    const m = [
      { id: 'rings', w: 2.4, cd: 5, a: { name: 'rings', anim: 'pray', dur: 1.8, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => pyreRings(w, e, p, K, p >= 2 ? 3 : 2) } },
      // molten bronze rains round you
      { id: 'rain', w: 2, cd: 4, a: { name: 'rain', anim: 'cast', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
        const t = ahead(w, 1.0); for (let i = 0; i < (p >= 2 ? 7 : 5); i++) { const a = w.rand() * TAU, r = i ? 1.4 + w.rand() * 3 : 0; const q2 = inside(w, t.x + S(a) * r, t.z + C(a) * r, 1.1); lob(w, e, q2.x, q2.z, { kind: 'flame', arc: 0.95 + i * 0.12, splash: 1.1, dmg: 14 * K, hazard: 'fire', pool: 1.6, kb: 4, size: 0.34 }); }
      } } },
      // the floor branded in three lanes of fire that burn a while
      { id: 'brand', w: 1.8, min: 2, cd: 4.5, a: { name: 'brand', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const a0 = angTo(e, w.hero); for (const o of [-0.38, 0, 0.38]) lane(w, e, e.x, e.z, a0 + o, { len: 10, width: 1.0, warn: 0.7, life: 1.6, dmg: 13 * K, kind: 'brand', kb: 4, status: { burn: 1 } }); } } },
      { id: 'immolate', w: 2.4, max: 3.4, a: strike({ name: 'immolate', anim: 'flare', shape: 'circle', offset: 0, radius: 3.3, windup: 0.75, active: 0.88, dur: 1.4, dmg: 22 * K, kb: 8, lunge: 0, tele: 'circle', onStrike: (w, e) => wave(w, e, e.x, e.z, 6, { r0: 3.3, warn: 0.05, life: 0.8, dmg: 10 * K, kind: 'fire' }) }) },
      { id: 'embers', w: 1.5, min: 3, cd: 3.5, a: { name: 'embers', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', ranged: { kind: 'flame', speed: 5.8, r: 0.3, dmg: 11 * K, life: 3.4, fan: p >= 2 ? 5 : 4, spread: deg(20), homing: 0.9 } } },
      // the cross of fire
      { id: 'cross', w: 1.4, cd: p >= 2 ? 8 : 10, run: (w, e) => startRite(e, 'cross') },
    ];
    if (p >= 3) m.push({ id: 'pillar', w: 1.6, cd: 15, run: (w, e) => startRite(e, 'pillar') });
    return m;
  },
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); const K = POWER.pyresaint; const p = e.phase;
    if (t < 0) { e.pillar = false; e.crossed = false; e.leapH = 0; return false; }
    if (c.id === 'cross') { // she rises on her beam, arms spread; the cross is laid, then the nova
      if (!c.laid) { c.laid = true; c.a0 = angTo(e, w.hero) + Math.PI / 4; crossFire(w, e, K, c.a0, 1.35); if (p >= 3) crossFire(w, e, K, c.a0 + Math.PI / 4, 2.1); announce(w, e, 'cross'); w.emit('crucify', { e }); }
      e.crossed = true; e.leapH = 1.5 * ease(clamp01(t / 0.6)) * (t > 2.0 ? 1 - clamp01((t - 2.0) / 0.4) : 1); hold(w, e, 'cross', t);
      if (!c.nova && t >= 1.35) { c.nova = true; wave(w, e, e.x, e.z, 11, { r0: 0.8, warn: 0.15, life: 1.5, dmg: 14 * K, kind: 'fire' }); w.emit('nova', { e }); w.emit('shake', { amt: 0.6 }); }
      if (t >= 2.4) { e.crossed = false; e.leapH = 0; return endRite(e, 0.8); }
      return true;
    }
    if (c.id === 'pillar') { // a pillar of fire that hunts you
      const h = w.hero; e.pillar = true; e.anim = 'pillar'; e.animT = t;
      if (t < 0.8) { e.mx = 0; e.mz = 0; if (!c.lit) { c.lit = true; w.emit('pillar', { e }); announce(w, e, 'pillar'); } return true; }
      const a = angTo(e, h); const d = dist(e, h); if (d > 1.2) { e.mx = S(a); e.mz = C(a); e.moveSpeed = 2.7; } else { e.mx = 0; e.mz = 0; }
      if (t >= (c.trail || 0.8)) { c.trail = t + 0.38; spot(w, e, e.x, e.z, 1.0, { warn: 0.3, life: 2.4, dmg: 10 * K, kind: 'pyre', kb: 3, status: { burn: 1 } }); }
      if (t >= (c.pulse || 1.6)) { c.pulse = t + 1.7; wave(w, e, e.x, e.z, 5.5, { r0: 1.0, warn: 0.3, life: 1.0, dmg: 12 * K, kind: 'fire' }); }
      if (t >= 5.2) { e.pillar = false; w.emit('pillarEnd', { e }); startRite(e, 'cross'); return true; }
      return true;
    }
    return false;
  },
  onPhase(w, e, p) {
    if (p === 2) { pyreRings(w, e, p, POWER.pyresaint, 2); e.speed *= 1.1; }
    if (p === 3) { e.ai.cd = 0.5; e.ai.cd_pillar = 0; }
  },
};

export const BOSS_AI5 = { kingcrab, hollowmother, ronin, smiling, pyresaint };

// ================================================================== the masks (the Smiling Guest's decoys)
// PROPOSAL: the Guest's masks wear the warden's own shape with its smile. Like the Guest they move only while
// you look away, a stride at a time, and take hold of whoever is close. Struck down, a false one bursts with
// laughter; the true one (white eyes) is the Guest itself.
export const UNITS5 = {
  guestmask: {
    name: 'Mask of the Guest', hp: 70, poise: 20, flinch: 0, speed: 0.01, r: 0.4, mass: 1, aggro: 30, keep: 1.6, home: 2, drop: 0,
    attacks: [], look: { rig: 'guestmask', eyes: 0xff3030, grin: true, colors: { skin: 0xf2efe8, tunic: 0x141216, pants: 0x0c0a0e, boots: 0x08080a, glove: 0xf0ece4 } },
  },
};
export const UNIT_AI5 = {
  guestmask(w, e, h) {
    const hero = w.hero; if (!hero || hero.dead) { e.anim = 'idle'; return; }
    e.mx = 0; e.mz = 0; e.face = angTo(e, hero); const d = dist(e, hero);
    const seen = Math.abs(wrap(angTo(hero, e) - hero.face)) < WATCH && w.clear(hero, e);
    e.ai.cd -= h;
    if (d < 2.0 && e.ai.cd <= 0) { w.foeAttack(e, strike({ name: 'grab', anim: 'grab', range: 2.0, arc: deg(150), windup: 0.55, active: 0.66, dur: 1.3, dmg: 12, kb: 6, lunge: 2.4 })); e.ai.cd = 1.4; return; }
    if (seen) { e.anim = 'smile'; return; }
    e.ai.stepT = (e.ai.stepT || 0) - h; if (e.ai.stepT <= 0) { e.ai.stepT = 0.34; stutter(w, e, 0.8); }
    e.anim = 'held';
  },
};

// ================================================================== Ascended forms (New Game+)
// As in bosses4.js ASCENDED: a fourth phase, two new moves from its patterns, a colour.
export const ASCENDED5 = {
  kingcrab: { hp: 1.7, dmg: 1.7, color: 0x70ffe8, power: 1.2, phases: [0.66, 0.4, 0.18], quick: 0.85, speed: 1.12, ward: 0.08, adds: [[4, ['crab', 'rat'], 3, 4]], moves: [
    { id: 'kingtide', from: 2, w: 1.4, cd: 7, pat: 'lanes', n: 5, gap: 2.2, width: 1.4, kind: 'tide', dmg: 17, anim: 'rear' },
    { id: 'wreckage', from: 3, w: 1.4, cd: 6, pat: 'lobs', n: 4, kind: 'boulder', splash: 1.9, ring: 6, hazard: 'water', dmg: 19 },
  ] },
  hollowmother: { hp: 1.3, dmg: 1.45, color: 0xfff4e8, power: 1.25, phases: [0.66, 0.33, 0.15], quick: 0.85, speed: 1.12, ward: 0.06, moves: [
    { id: 'thicket', from: 2, w: 1.4, cd: 6, pat: 'star', n: 6, len: 8, kind: 'limb', dmg: 17, anim: 'flurry' },
    { id: 'nursery', from: 3, w: 1.4, cd: 6, pat: 'crown', n: 10, R: 3.0, kind: 'limb', dmg: 17 },
  ] },
  ronin: { hp: 1.1, dmg: 1.25, color: 0xffb0c8, power: 1.4, phases: [0.66, 0.33, 0.15], quick: 0.88, speed: 1.0, ward: 0.05, moves: [
    { id: 'orchard', from: 2, w: 1.3, cd: 7, pat: 'lanes', n: 4, gap: 2.4, width: 1.1, kind: 'petal', dmg: 17, cross: true, anim: 'kamae' },
    { id: 'thousand', from: 3, w: 1.3, cd: 6, pat: 'star', n: 8, len: 9, kind: 'iai', dmg: 17, anim: 'iaido' },
  ] },
  smiling: { hp: 1.6, dmg: 1.6, color: 0xfff0f0, power: 1.2, phases: [0.66, 0.33, 0.15], quick: 0.85, speed: 1.0, ward: 0.05, moves: [
    { id: 'jaws', from: 2, w: 1.4, cd: 6, pat: 'crown', n: 12, R: 3.2, kind: 'grin', dmg: 16 },
    { id: 'chorus', from: 3, w: 1.4, cd: 6, pat: 'rings', n: 3, gapT: 0.5, kind: 'discord', dmg: 15, anim: 'laugh' },
  ] },
  pyresaint: { hp: 1.25, dmg: 1.3, color: 0xffa040, power: 1.2, phases: [0.66, 0.33, 0.15], quick: 0.85, speed: 1.1, ward: 0.06, moves: [
    { id: 'martyrdom', from: 2, w: 1.4, cd: 6, pat: 'spiral', arms: 4, n: 8, kind: 'pyre', dmg: 15 },
    { id: 'ashfall', from: 3, w: 1.4, cd: 6, pat: 'lobs', n: 4, kind: 'flame', splash: 2.0, ring: 6, hazard: 'fire', dmg: 19 },
  ] },
};

// ================================================================== entrances
// The same shape as bosses4.js ENTRANCES: { kind, dur, cam, script(w, e, t, F, st) } with st.home, st.at(d),
// st.put(x, z), st.anim(name, at), st.every(s), once(); F(fn) runs an effect only when there is an fx.
const once = (st, key, fn) => { if (!st.fired.has(key)) { st.fired.add(key); fn(); } };
export const ENTRANCES5 = {
  // PROPOSAL: the harbour water bulges; a claw the size of a cart rises out of it first, then the whole
  // shell lifts, water pouring off it, the coral crown dripping; it slams both claws on the planks
  kingcrab: { kind: 'surface', dur: 4.2, cam: { zoom: 0.95, lift: 1.5 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('pool', st.home.x, st.home.z, st.home.face, { life: 4.8, r: 4.8, grow: 1.2, color: [0.04, 0.12, 0.14] })));
    st.put(st.home.x, st.home.z);
    const k = ease(clamp01((t - 1.1) / 1.9)); e.leapH = lerp(-3.4, 0, k);
    if (t < 1.1) { e.hidden = t < 0.5; if (st.every(0.12)) F((fx) => { const a = Math.random() * TAU, r = Math.random() * 3; fx.emit(st.home.x + S(a) * r, 0.1, st.home.z + C(a) * r, { n: 6, speed: 0.6, up: 1, vy: 2.5, life: 0.6, grav: 9, color: [0.5, 1.2, 1.3], size: 1 }); }); st.anim('rise', 0); return; }
    e.hidden = false;
    once(st, 'claw', () => { w.emit('shake', { amt: 0.5 }); F((fx) => { fx.splash(st.home.x + 1.5, st.home.z, 40); fx.emit(st.home.x, 0.2, st.home.z, { n: 60, speed: 2.4, up: 3, vy: 6, life: 1.2, grav: 10, color: [0.5, 1.3, 1.4], size: 2, jit: 2.5 }); }); });
    if (st.every(0.1)) F((fx) => { const a = Math.random() * TAU; fx.emit(st.home.x + S(a) * 2.2, 0.6 + Math.random() * 2, st.home.z + C(a) * 2.2, { n: 3, speed: 0.4, life: 0.8, grav: 12, color: [0.5, 1.1, 1.2], size: 1 }); });
    if (t < 3.0) { st.anim('rise', clamp01((t - 1.1) / 1.9) * 0.9); return; }
    once(st, 'slam', () => { w.emit('shake', { amt: 1.0 }); F((fx) => { fx.shockRing(st.home.x, st.home.z, 6, [0.6, 1.6, 1.7], 0.6); fx.splash(st.home.x, st.home.z, 60); }); });
    st.anim('roar', t - 3.0);
  } },
  // PROPOSAL: the lights fail; something pale uncurls down from the vault, limb after limb, head first; it
  // lands without a sound and rises to its full, wrong height
  hollowmother: { kind: 'ceiling', dur: 4.0, cam: { zoom: 1.1, lift: 2 }, script(w, e, t, F, st) {
    st.put(st.home.x, st.home.z); e.flicker = t < 2.6 ? 1 : 0; e.dark = t < 2.6 ? 0.6 : 0.6 * (1 - clamp01((t - 2.6) / 0.8));
    once(st, 'piece', () => F((fx) => fx.setPiece('descent', st.home.x, st.home.z, st.home.face, { life: 3.0, y: 10 })));
    if (st.every(0.15)) F((fx) => fx.emit(st.home.x + (Math.random() - 0.5) * 2, 8 + Math.random() * 3, st.home.z + (Math.random() - 0.5) * 2, { n: 2, speed: 0.1, life: 1.4, grav: 6, color: [0.5, 0.48, 0.45], size: 1 }));
    const k = clamp01((t - 0.6) / 1.9); e.leapH = 10 * (1 - easeOut(k)); e.hidden = t < 0.6;
    if (t < 2.5) { st.anim('hang', k); return; }
    once(st, 'land', () => { w.emit('shake', { amt: 0.4 }); F((fx) => { fx.dust(st.home.x, st.home.z, 30); fx.shockRing(st.home.x, st.home.z, 3, [1.6, 1.5, 1.4], 0.4); }); });
    st.anim(t < 3.2 ? 'land' : 'roar', t < 3.2 ? t - 2.5 : t - 3.2);
  } },
  // PROPOSAL: he kneels on the terrace in falling petals; he rises without a sound; his hand finds the hilt;
  // one line of light crosses the whole screen; the click of the blade going home
  ronin: { kind: 'kneel', dur: 4.2, cam: { zoom: 1.2 }, script(w, e, t, F, st) {
    st.put(st.home.x, st.home.z);
    if (st.every(0.06)) F((fx) => fx.emit(st.home.x - 5 + Math.random() * 3, 3 + Math.random() * 2, st.home.z - 3 + Math.random() * 6, { n: 1, speed: 0.3, vx: 2.4, vy: -0.4, life: 2.6, grav: 0.3, color: [2.6, 1.2, 1.6], size: 1, drag: 0.2 }));
    if (t < 1.6) { st.anim('kneel', 0.6); e.stance = null; return; }
    if (t < 2.4) { st.anim('rise', 0.6 + (t - 1.6) * 0.5); return; }
    if (t < 3.1) { e.stance = 'iai'; st.anim('stance', t - 2.4); return; }
    once(st, 'cut', () => { w.emit('shake', { amt: 0.6 }); w.emit('iai', { e, x0: st.home.x - S(st.home.face + 1.57) * 9, z0: st.home.z - C(st.home.face + 1.57) * 9, x1: st.home.x + S(st.home.face + 1.57) * 9, z1: st.home.z + C(st.home.face + 1.57) * 9, entrance: true }); F((fx) => fx.slashLine(st.home.x, 1.2, st.home.z, 18, [3, 3, 3.4], 0.5)); });
    e.stance = null; e.drawn = t < 3.7;
    if (t < 3.7) st.anim('drawn', t - 3.1); else { once(st, 'click', () => w.emit('sheathe', { e })); st.anim('sheathe', t - 3.7); }
  } },
  // PROPOSAL: the lights go out; a smile hangs in the dark; it comes closer in three jumps with nothing in
  // between; the lights come back and it is standing there, and it bows
  smiling: { kind: 'stutter', dur: 4.0, cam: { zoom: 1.2 }, script(w, e, t, F, st) {
    const far = st.at(-6);
    e.dark = t < 2.7 ? 1 : 1 - clamp01((t - 2.7) / 0.3); e.grin = t < 2.7; e.hidden = t < 2.7;
    const jumps = [0.7, 1.4, 2.1]; let k = 0; for (const j of jumps) if (t >= j) k++;
    const p = { x: lerp(far.x, st.home.x, k / 3), z: lerp(far.z, st.home.z, k / 3) }; st.put(p.x, p.z);
    jumps.forEach((j, i) => { if (t >= j) once(st, 'j' + i, () => w.emit('stutter', { e, fx: p.x, fz: p.z, x: p.x, z: p.z })); });
    if (t >= 0.9) once(st, 'laugh', () => w.emit('laugh', { e }));
    if (t < 2.7) { st.anim('held', 0); return; }
    once(st, 'on', () => w.emit('lightsOn', { e }));
    st.anim(t < 3.6 ? 'bow' : 'smile', t < 3.6 ? t - 2.7 : t - 3.6);
  } },
  // PROPOSAL: a stake rises out of the foundry floor, already burning; the fire roars up into a column; inside
  // it the saint lifts her head, the irons on her wrists break, she floats up with her arms spread and the
  // floor catches in a ring round her
  pyresaint: { kind: 'pyre', dur: 4.2, cam: { zoom: 1.05, lift: 1.5 }, script(w, e, t, F, st) {
    once(st, 'piece', () => F((fx) => fx.setPiece('pyre', st.home.x, st.home.z, st.home.face, { life: 4.6, rise: [0.0, 1.0], blaze: 1.2 })));
    st.put(st.home.x, st.home.z);
    if (st.every(0.05)) F((fx) => fx.emit(st.home.x + (Math.random() - 0.5) * 1.4, 0.3, st.home.z + (Math.random() - 0.5) * 1.4, { n: 2, speed: 0.4, up: 1, vy: 4 + Math.random() * 3, life: 0.8, grav: -2, color: Math.random() < 0.5 ? [3.4, 1.6, 0.3] : [3, 0.6, 0.12], size: Math.random() < 0.3 ? 2 : 1 }));
    e.pillar = t > 1.0 && t < 2.6; e.hidden = t < 1.0;
    e.leapH = 1.2 * ease(clamp01((t - 2.4) / 0.8));
    if (t < 2.6) { st.anim('pillar', t); return; }
    once(st, 'irons', () => { w.emit('shake', { amt: 0.6 }); F((fx) => { fx.debris(st.home.x, 1.6, st.home.z, 10, [0.3, 0.28, 0.26], { speed: 4, size: 0.12 }); fx.shockRing(st.home.x, st.home.z, 5, [3.2, 1.4, 0.3], 0.6); }); });
    if (t >= 3.2) once(st, 'ring', () => F((fx) => { for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; fx.emit(st.home.x + S(a) * 3.4, 0.2, st.home.z + C(a) * 3.4, { n: 8, speed: 0.4, up: 1, vy: 3, life: 0.9, grav: -2, color: [3.2, 1.2, 0.2], size: 1 }); } }));
    e.crossed = true; st.anim('cross', t - 2.6);
    if (t >= 4.1) { e.crossed = false; e.leapH = 0; }
  } },
};

// ================================================================== their lines (PROPOSAL)
// One line as the fight begins and one as it falls, as in scenes/lines.js (A merges these). Each fits two
// lines of the 5x7 font on a phone (about 40 characters a line). The Ronin and the Guest say almost nothing.
export const BOSS_LINES5 = {
  kingcrab: { intro: 'THE TIDE KNEELS TO ME. THE DROWNED ARE MY COURT.', fall: 'THE MUD... TAKES ITS KING... BACK...' },
  hollowmother: { intro: 'HUSH, LITTLE ONE. MOTHER IS HERE. MOTHER IS ABOVE YOU.', fall: 'SO MANY... CHILDREN... NONE OF THEM MINE.' },
  ronin: { intro: '...', fall: 'A HUNDRED NIGHTS. AT LAST, THE BELL.' },
  smiling: { intro: 'OH. OH, YOU CAME. WE ARE SO VERY GLAD YOU CAME.', fall: 'WHAT A LOVELY... LOVELY EVENING...' },
  pyresaint: { intro: 'I BURNED SO THE FURNACES COULD SING. BURN WITH ME.', fall: 'AT LAST... THE FIRE... IS COOL.' },
};
// how each one is named in a scene (scenes/cast.js SPEAKERS shape; A merges)
export const SPEAKERS5 = {
  kingcrab: { name: 'THE KING-CRAB', color: '#70ffe8' },
  hollowmother: { name: 'THE HOLLOW MOTHER', color: '#f0e8dc' },
  ronin: { name: 'THE STILLED RONIN', color: '#ffb0c8' },
  smiling: { name: 'THE SMILING GUEST', color: '#ffffff' },
  pyresaint: { name: 'THE PYRE SAINT', color: '#ffb050' },
};

// ================================================================== boss pools
// Which bosses each area can field (2 where the district has a second), so runs differ. The Act finales stay
// fixed: the Belfry (Saint Silence), the Abyss (the Archon), the Empyrean (the Wheel). A variant's own
// bossPool (variants.js) wins where it names known bosses; the favourite is first.
export const BOSS_POOLS = {
  gate: ['gaoler'], market: ['tallow', 'smiling'], docks: ['harbormaster', 'kingcrab'], nave: ['deacon', 'smiling'],
  undercroft: ['ossuary', 'hollowmother'], foundry: ['founder', 'pyresaint'], heights: ['regent', 'ronin'],
  belfry: ['silence'], frostmarch: ['frostgiant'], ashdunes: ['sandwyrm'], catacombs: ['lich'], abyss: ['archon'],
  marsh: ['bogmother'], spire: ['clockmaster'], empyrean: ['wheel'],
};
const FINALES = { belfry: 'silence', abyss: 'archon', empyrean: 'wheel' };
const knownBoss = (t) => !!(BOSSES2[t] || BOSSES5[t] || ['gaoler', 'tallow', 'deacon', 'silence'].includes(t));
export function bossPool(levelId, variant) {
  if (FINALES[levelId]) return [FINALES[levelId]];
  const own = (BOSS_POOLS[levelId] || []).slice();
  const v = variant && Array.isArray(variant.bossPool) ? variant.bossPool.filter((t) => knownBoss(t) && (!own.length || own.includes(t) || BOSSES5[t])) : [];
  return v.length ? v : own;
}
// The tier each boss was built for, and what a level should pass to spawnBoss (hpMul, dmgMul) when a boss
// fights at another tier (the Smiling Guest is built for tier 2 and offered at the market, tier 1, and at
// the nave, tier 3). Every other pairing is the boss's own tier: {}.
export const BOSS_TIER = { gaoler: 0, tallow: 1, harbormaster: 2, deacon: 3, ossuary: 4, founder: 5, regent: 6, silence: 7, kingcrab: 2, hollowmother: 4, ronin: 6, smiling: 2, pyresaint: 5 };
const AREA_TIER = { gate: 0, market: 1, docks: 2, nave: 3, undercroft: 4, foundry: 5, heights: 6, belfry: 7 };
export function bossOpts(type, levelId) {
  const bt = BOSS_TIER[type], at = AREA_TIER[levelId]; if (bt === undefined || at === undefined || bt === at) return {};
  const d = at - bt; return { hpMul: Math.round(Math.pow(1.32, d) * 100) / 100, dmgMul: Math.round(Math.pow(1.14, d) * 100) / 100 };
}

// the merges (see the header): whichever module is evaluated second does each of them
try { Object.assign(BOSSES2, BOSSES5); Object.assign(BOSS_AI2, BOSS_AI5); } catch (err) { /* bosses2.js merges */ }
try { Object.assign(UNITS, UNITS5); Object.assign(UNIT_AI, UNIT_AI5); } catch (err) { /* units.js merges */ }
try { Object.assign(ASCENDED, ASCENDED5); Object.assign(ENTRANCES, ENTRANCES5); } catch (err) { /* bosses4.js merges */ }
