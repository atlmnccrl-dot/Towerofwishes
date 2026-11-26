// Act VI, the Throne of the Toll: God, the Voice, and the two great bells He summons to fight you
// (docs/ASCENT_DESIGN.md §2 "Act VI" and §3). Stats and looks (BOSSES8), the fight (BOSS_AI8), the two bells as
// boss-class units with their own health bars (UNITS8 / UNIT_AI8), God's arrival (ENTRANCES8), His Ascended form
// (ASCENDED8), lines and speakers (BOSS_LINES8 / SPEAKERS8). Self-registering (docs/ASCENT_DESIGN.md §6): every
// table is merged into the shared ones at the end of this file; js/game/content.js imports it.
//
// The fight, in three stages:
//  1. God sits on His throne at the far end of the heaven and fights from it with light: judgement beams, the
//     toll (rings of sound rolling out of Him), spears of light round you, a hand of light pressing down. He
//     summons THE DAWN BELL (gold, sun and fire: it rolls, leaps and slams, tolls flame) and THE DUSK BELL (iron,
//     night and void: void rings, a gravity well, an eclipse that hunts you). While both bells live He cannot be
//     touched; a bell's fall staggers Him, and His health cannot pass the stage line while a bell still rings.
//  2. The bells fallen, He rises. He tolls the world: the heaven cracks into islands, and He stays above the
//     arena while the Hushed come in waves and echoes of earlier bosses return (the first interlude: still the
//     echoes). He comes down on His islands with new moves: a sweeping beam, the judgement of the island you
//     stand on, the toll in threes, He strides from island to island.
//  3. He rises again into the sun while bells rain from the sky and the edge of heaven falls away (the second
//     interlude: endure). He comes back vast. The arena is small now: an eclipse of four wheeling beams, the
//     dawnfall (rows of sun pillars marching across the floor), the last toll, both hands, and the Word, a
//     judgement on the whole floor that spares only those standing in the circles of song He leaves open.
// As everywhere: no parry; every blow is marked first (an arc, a line, a circle, a ring) and can be dashed
// through or walked out of. Pure logic (no DOM): the bodies are js/actors/beasts7.js, the arena changes are
// state on the boss (e.arena) that the level (js/world/levels/throne.js) reads to crack and drop its floor.
//
// Every name, title, line and every comment describing who they are and what they do: PROPOSAL, for the author.
import { strike, summon, hookWorld5, later } from './ai.js';
import { BOSSES2, BOSS_AI2, free, countOf, around, quick } from './bosses2.js';
import { ASCENDED, ENTRANCES } from './bosses4.js';
import { interlude } from './interlude.js';
import { FOES, BOSSES } from './defs.js';
import { UNITS, UNIT_AI } from './units.js';
import { BOSS_LINES } from './scenes/lines.js';
import { SPEAKERS } from './scenes/cast.js';

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const S = Math.sin, C = Math.cos;
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const turn = (a, b, max) => wrap(a + Math.max(-max, Math.min(max, wrap(b - a))));
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const lerp = (a, b, k) => a + (b - a) * k;

// how hard they hit (multiplies every number below; the boss's dmgMul applies on top) and the tier of summons
const POWER = { god: 2.2, dawnbell: 2.0, duskbell: 2.0 };
const ADD_TIER = 16;

// ================================================================== the arena (shared with the level)
// The Throne of the Toll, in the level's own coordinates (js/world/levels/throne.js builds it from these): the
// fight floor, God's seat at the throne's foot, where the bells come down, the cracks of the second stage (rects
// that become chasms: solid, the void under them) and the floor that is left in the third. A fight anywhere else
// (a test arena, a debug ?bossType=god) uses the same layout moved to God's spot and cut to the world's bounds.
export const THRONE = {
  home: { x: 2, z: -28.5 },
  floor: [-13, -31, 17, -2],
  bells: [{ x: -6, z: -20 }, { x: 10, z: -20 }],
  // the cracks: a cross of chasms with gaps (2.6 m) between four islands
  chasms: [
    [1.4, -25, 2.6, -21.3], [1.4, -18.7, 2.6, -15.6],          // up the middle, towards the throne
    [-13, -15.6, -7.3, -14.4], [-4.7, -15.6, 8.7, -14.4], [11.3, -15.6, 17, -14.4], // across
    [1.4, -14.4, 2.6, -9.3], [1.4, -6.7, 2.6, -4],             // down the middle, towards the way in
  ],
  shrink: [-7.5, -30.6, 11.5, -6.2],
  // where God may stand in the second stage (His seat, the far end of each upper island)
  perches: [{ x: 2, z: -28.5 }, { x: -6.5, z: -24 }, { x: 10.5, z: -24 }],
};
// the layout as it stands for this fight: moved to God's first spot and cut to the world's bounds (cached)
function arenaOf(w, e) {
  if (e.ai.A && e.ai.A.w === w) return e.ai.A;
  const h0 = e.ai.home0 || (e.ai.home0 = { x: e.x, z: e.z }); const dx = h0.x - THRONE.home.x, dz = h0.z - THRONE.home.z;
  const [bx0, bz0, bx1, bz1] = w.bounds; const cut = (r) => [Math.max(bx0, r[0] + dx), Math.max(bz0, r[1] + dz), Math.min(bx1, r[2] + dx), Math.min(bz1, r[3] + dz)];
  const ok = (r) => r[2] - r[0] > 0.5 && r[3] - r[1] > 0.5;
  const floor = cut(THRONE.floor); let shrink = cut(THRONE.shrink); if (!ok(shrink) || shrink[2] - shrink[0] < 8) shrink = floor.slice();
  const A = { w, dx, dz, floor, shrink, bounds0: w.bounds.slice(),
    chasms: THRONE.chasms.map(cut).filter(ok), bells: THRONE.bells.map((p) => ({ x: p.x + dx, z: p.z + dz })), perches: THRONE.perches.map((p) => ({ x: p.x + dx, z: p.z + dz })),
    mid: { x: 2 + dx, z: -15 + dz } };
  e.ai.A = A; return A;
}

// ------------------------------------------------------------------ helpers (as in bosses4.js / bosses5.js)
const known = (type) => !!(FOES[type] || UNITS[type]);
function inside(w, x, z, m = 1.2) { const [x0, z0, x1, z1] = w.bounds; return { x: Math.max(x0 + m, Math.min(x1 - m, x)), z: Math.max(z0 + m, Math.min(z1 - m, z)) }; }
function spot(w, e, x, z, r, o) { return w.addHazard({ shape: 'circle', x, z, r, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status, tick: o.tick, pull: o.pull, godWord: o.word }); }
function wave(w, e, x, z, r1, o) { return w.addHazard({ shape: 'ring', x, z, r0: o.r0 ?? 0.6, r1, warn: o.warn ?? 0, life: o.life ?? 1.2, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 6, status: o.status }); }
function beam(w, e, x, z, ang, o) { return w.addHazard({ shape: 'line', x, z, face: ang, len: o.len ?? 30, width: o.width || 1.1, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status }); }
// a mark on the floor that hurts nobody (circles of song, a gravity well's eye, a crack about to open)
function mark(w, o) { const hero = w.hero; return w.addHazard({ warn: 0, dmg: 0, ...o, t: 0.06, life: (o.life ?? 1) + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true }); }
function fling(w, e, ang, o) {
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: e.x + S(ang) * (e.r + 0.4), z: e.z + C(ang) * (e.r + 0.4), y: o.y ?? 1.4, vx: S(ang) * o.speed, vz: C(ang) * o.speed, r: o.r ?? 0.32, dmg: o.dmg * e.dmgMul, life: o.life ?? 3, homing: o.homing || 0, src: e, face: ang, hitSet: new Set() });
}
function ahead(w, t, k = 0.6) { const h = w.hero; return inside(w, h.x + (h.vx || 0) * t * k, h.z + (h.vz || 0) * t * k, 1.0); }
function hold(w, e, anim, at) { e.anim = anim; e.animT = at ?? 0.56; e.mx = 0; e.mz = 0; }
function startRite(e, id, o = {}) { e.ai.chan = { id, t0: null, next: 0, ...o }; e.tele = null; e.mx = 0; e.mz = 0; }
const riteT = (w, e) => { const c = e.ai.chan; if (c.t0 === null) c.t0 = w.t; else if (w.t - c.last > 0.25) return -1; c.last = w.t; return w.t - c.t0; };
const announce = (w, e, name) => w.emit('tele', { e, atk: { name } });
// a free point near (x, z) for a body of radius r (rings outwards), or null
function nearFree(w, x, z, r) {
  if (free(w, x, z, r)) return { x, z };
  for (let k = 1; k <= 7; k++) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = k * 0.7; if (free(w, x + S(a) * d, z + C(a) * d, r)) return { x: x + S(a) * d, z: z + C(a) * d }; }
  return null;
}
// a cast: the boss works a gesture, and at its end onStrike lays the hazards (which carry their own warning)
const cast = (name, anim, onStrike, o = {}) => ({ name, anim, dur: o.dur ?? 1.5, windup: o.windup ?? 0.6, active: (o.windup ?? 0.6) + 0.02, tele: 'none', dmg: 0, heavy: true, onStrike });

// World hooks (installed once per world): an echo of an old boss never ends the fight when it falls (it dies as a
// foe, not as the area's boss), and the Word spares a hero standing in one of God's circles of song.
function hookGod(w) {
  if (w._god8) return; w._god8 = true;
  const kill = w._kill; w._kill = function (e, src, o) { if (e && e.godEcho) e.boss = false; return kill.call(this, e, src, o); };
  const hz = w._hazards; w._hazards = function (h) {
    const g = this.ents.find((f) => f.type === 'god' && !f.dead); const safe = g && g.ai.safe ? g.ai.safe.filter((s) => s.until > this.t) : [];
    if (safe.length) for (const hero of this.heroTeam()) if (safe.some((s) => Math.hypot(hero.x - s.x, hero.z - s.z) < s.r)) for (const z of this.hazards) if (z.godWord) z.hitSet.add(hero.id);
    return hz.call(this, h);
  };
}

// ================================================================== stats and looks
// The bodies (look.rig) are js/actors/beasts7.js.
export const BOSSES8 = {
  // PROPOSAL: God, the Voice that was caught in the Great Bell. Taller than the throne's columns, a figure of
  // white light in robes that flare at the hem into the mouth of a bronze bell (cracked, light pouring out of the
  // crack); bronze gauntlets and a breastplate with a sun on it; where a face should be, a smooth oval of light
  // with nothing in it; behind the head a crown of bronze rays; six wings of light folded behind. He floats.
  god: {
    name: 'The Voice', title: 'God of the Toll', hp: 19000, poise: 999, speed: 0.01, r: 1.7, mass: 60, scale: 3.1, boss: true, hover: true,
    look: { rig: 'god', eyes: 0xfff4d0, colors: { light: 0xfff6e2, robe: 0xf2ecdc, shade: 0xc8bea8, bronze: 0xb8863a, dark: 0x5a3a18, verd: 0x5a8a70, gold: 0xf0c860, sun: 0xffd890, face: 0xfff8ec } },
  },
};

// The two bells: boss-class units (spawned by God; their own health bars on the HUD), not bosses (their fall
// never ends the fight).
export const UNITS8 = {
  // PROPOSAL: a bell of gold as tall as two men, alive: a sun in relief on its shoulder, a ring of bronze rays
  // round its crown, two slits of fire for eyes under the shoulder, fire in its mouth, its clapper a tongue of flame.
  dawnbell: {
    name: 'The Dawn Bell', hp: 2600, poise: 999, flinch: 0, speed: 2.4, r: 1.15, mass: 22, aggro: 99, keep: 2.8, home: 99, drop: 0, armor: true, bell: true,
    attacks: [], look: { rig: 'dawnbell', eyes: 0xffc040, scale: 1, colors: { metal: 0xd8a83a, light: 0xffe08a, dark: 0x6a4410, rim: 0xf0c860, fire: 0xff8a20, core: 0xfff0b0 } },
  },
  // PROPOSAL: its twin of black iron, alive: a crescent moon in relief, chains hanging from its crown, rust, and in
  // its mouth a night with stars; its clapper a weight of void; two violet eyes.
  duskbell: {
    name: 'The Dusk Bell', hp: 2600, poise: 999, flinch: 0, speed: 2.2, r: 1.15, mass: 22, aggro: 99, keep: 3.4, home: 99, drop: 0, armor: true, bell: true,
    attacks: [], look: { rig: 'duskbell', eyes: 0xc070ff, scale: 1, colors: { metal: 0x3a3a44, light: 0x8a8aa0, dark: 0x16161c, rim: 0x5a5a6a, rust: 0x6a3a2a, void: 0x8a40ff, core: 0xe0c0ff } },
  },
};

// ================================================================== God
const ECHO_POOL = [['gaoler', 2.3], ['silence', 1.8], ['archon', 1.05], ['lich', 1.15], ['frostgiant', 1.15], ['regent', 1.6]];
const HUSHED = ['hushed', 'choirmask', 'gildedknight', 'hollowangel'];
const nameOfBoss = (t) => ((BOSSES[t] || BOSSES2[t] || {}).name || t).replace(/^The /, 'the ').toUpperCase();

// the bells come down out of the sky on either side of the throne
function summonBells(w, e) {
  const A = arenaOf(w, e); e.ai.bells = [];
  ['dawnbell', 'duskbell'].forEach((type, i) => {
    if (!known(type)) return; const p = nearFree(w, A.bells[i].x, A.bells[i].z, 1.2) || nearFree(w, e.x + (i ? 5 : -5), e.z + 6, 1.2); if (!p) return;
    const b = w.spawnFoe(type, p.x, p.z, { tier: ADD_TIER, aggro: true, rise: false });
    b.maxHp = b.hp = Math.round(e.maxHp * 0.15); b.dmgMul = e.dmgMul; b.ai.locked = true; b.ai.god = e; b.bossBar = b.def.name; b.armor = true;
    b.ai.arrive = { t0: w.t, delay: i * 0.7 }; b.leapH = 14; b.iframes = 3; b.face = angTo(b, w.hero || e);
    spot(w, b, p.x, p.z, 2.4, { warn: 1.5 + i * 0.7, life: 0.3, dmg: 18 * POWER[type], kind: 'toll', kb: 9 });
    e.ai.bells.push(b);
  });
  e.ai.alive = e.ai.bells.length; w.emit('summon', { e }); announce(w, e, 'bells');
}
// a bell has fallen: God reels (and can be struck once the first is gone); the other bell grieves and rages
function bellFell(w, e, alive) {
  w.emit('bellFall', { e, alive }); w.emit('shake', { amt: 1.0 }); w.slow(0.7, 0.35);
  if (!e.il && e.state !== 'stagger') { e.state = 'stagger'; e.t = 0; e.anim = 'stagger'; e.animT = 0; e.stagT = alive ? 3.0 : 3.6; e.atk = null; e.tele = null; e.ai.chan = null; e.leapH = 0; }
  for (const b of e.ai.bells || []) if (!b.dead && !b.ai.mourn) { b.ai.mourn = true; b.speed *= 1.15; b.ai.cdK = 0.75; w.emit('rage', { e: b }); }
}

// the toll cracks the heaven: the cracks glow, then open (chasms: solid, the void under them)
function crack(w, e, warn = 1.6) {
  const A = arenaOf(w, e); if (e.arena.crack !== null) return; e.arena.crack = w.t + warn;
  for (const r of A.chasms) {
    const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2, wx = r[2] - r[0], wz = r[3] - r[1]; const along = wz >= wx;
    beam(w, e, along ? cx : r[0], along ? r[1] : cz, along ? 0 : Math.PI / 2, { len: along ? wz : wx, through: true, width: (along ? wx : wz) + 0.4, warn, life: 0.4, dmg: 14 * POWER.god, kind: 'radiant', kb: 6 });
  }
  later(w, e, warn, (w2) => {
    for (const r of A.chasms) w2.solids.push({ x0: r[0], z0: r[1], x1: r[2], z1: r[3], h: 3, chasm: true, src: e });
    w2.emit('crack', { e }); w2.emit('shake', { amt: 1.2 });
  }, { always: true });
}
// the edge of heaven falls away: the bounds close in on the floor that is left (k 0..1)
function shrinkTo(w, e, k) {
  const A = arenaOf(w, e); e.arena.shrink = k; const f = A.floor, s = A.shrink;
  w.bounds = [lerp(f[0], s[0], k), lerp(f[1], s[1], k), lerp(f[2], s[2], k), lerp(f[3], s[3], k)];
}

// ------------------------------------------------------------------ God's moves
// judgement: beams of light from Him through the arena, fanned at you
function judgement(w, e, K, n, warn = 0.95, spread = 0.2) {
  const a0 = angTo(e, w.hero);
  for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; beam(w, e, e.x + S(a) * 1.6, e.z + C(a) * 1.6, a, { len: 34, width: 1.15, warn: warn + Math.abs(i - (n - 1) / 2) * 0.12, life: 0.25, dmg: 18 * K, kind: 'eyebeam', status: { burn: 1 } }); }
  w.emit('beam', { e });
}
// the toll: rings of sound roll out of Him
function toll(w, e, K, n, gapT = 0.85, r1 = 26) { for (let i = 0; i < n; i++) wave(w, e, e.x, e.z, r1, { r0: 1.8, warn: 0.35 + i * gapT, life: 2.6, dmg: 15 * K, kind: 'toll', kb: 7 }); w.emit('toll', { e }); }
// a hand of light presses down where you stand (and where you are going)
function hand(w, e, K, n = 1, warn = 1.15) { const h = w.hero; spot(w, e, h.x, h.z, 2.5, { warn, life: 0.3, dmg: 22 * K, kind: 'radiant', kb: 10 }); if (n > 1) { const p = ahead(w, 1.6, 1); spot(w, e, p.x, p.z, 2.5, { warn: warn + 0.55, life: 0.3, dmg: 22 * K, kind: 'radiant', kb: 10 }); } w.emit('hand', { e }); }
// the sweep: a beam drawn across the floor in steps (a fan of short beams one after another)
function sweep(w, e, K, arc = 1.7, steps = 9) {
  const a0 = angTo(e, w.hero); const dir = w.rand() < 0.5 ? 1 : -1;
  for (let i = 0; i < steps; i++) { const a = a0 + dir * (i / (steps - 1) - 0.5) * arc; beam(w, e, e.x + S(a) * 1.6, e.z + C(a) * 1.6, a, { len: 32, width: 1.3, warn: 0.85 + i * 0.13, life: 0.16, dmg: 17 * K, kind: 'holyfire', kb: 5, status: { burn: 1 } }); }
}
// the judgement of the island: the island you stand on is filled with fire; cross to another
function islandJudgement(w, e, K) {
  const A = arenaOf(w, e); const h = w.hero; const m = A.mid; const [bx0, bz0, bx1, bz1] = w.bounds;
  const sx = h.x < m.x ? [bx0, m.x - 0.6] : [m.x + 0.6, bx1]; const sz = h.z < m.z ? [bz0, m.z - 0.6] : [m.z + 0.6, bz1];
  for (let x = sx[0] + 1.1; x < sx[1] - 0.4; x += 2.1) for (let z = sz[0] + 1.1; z < sz[1] - 0.4; z += 2.1) { if (!free(w, x, z, 0)) continue; spot(w, e, x, z, 1.25, { warn: 1.7 + ((x + z) % 2 > 1 ? 0.15 : 0), life: 0.35, dmg: 19 * K, kind: 'holyfire', kb: 6, status: { burn: 1 } }); }
  announce(w, e, 'island');
}
// a crown of spears round Himself (keeps the close ones off)
function crown(w, e, K, R = 3.2, n = 10, warn = 0.85) { for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = e.x + S(a) * R, z = e.z + C(a) * R; if (free(w, x, z, 0)) spot(w, e, x, z, 1.05, { warn, life: 0.3, dmg: 17 * K, kind: 'spear', kb: 7 }); } }
// the dawnfall: rows of sun pillars marching across the floor
function dawnfall(w, e, K, rows = 3) {
  const [bx0, bz0, bx1, bz1] = w.bounds; const alongX = w.rand() < 0.5; const gap = Math.floor(w.rand() * 4);
  for (let r = 0; r < rows; r++) {
    const o = r * 2.6 + w.rand() * 0.6;
    for (let k = 0; k * 2.2 < (alongX ? bx1 - bx0 : bz1 - bz0); k++) {
      if ((k + r * 2) % 5 === gap) continue; // a way through each row
      const x = alongX ? bx0 + 1.1 + k * 2.2 : bx0 + 1.4 + ((o + w.t * 0) % (bx1 - bx0 - 2.8));
      const z = alongX ? bz0 + 1.4 + ((o) % (bz1 - bz0 - 2.8)) : bz0 + 1.1 + k * 2.2;
      if (!free(w, x, z, 0)) continue;
      spot(w, e, x, z, 1.15, { warn: 1.0 + r * 0.55 + k * 0.03, life: 0.3, dmg: 18 * K, kind: 'holyfire', kb: 5, status: { burn: 1 } });
    }
  }
  w.emit('dawnfall', { e });
}
// the Word: the whole floor judged, but for three circles of song He leaves open (and a dash through it)
function theWord(w, e, K) {
  const h = w.hero; const safe = [];
  for (let k = 0; k < 50 && safe.length < 3; k++) {
    const a = w.rand() * TAU, r = 2.6 + w.rand() * 4.5; const p = inside(w, h.x + S(a) * r, h.z + C(a) * r, 1.8);
    if (!free(w, p.x, p.z, 0.8) || safe.some((s) => dist(s, p) < 3.4) || dist(p, e) < e.r + 2.6) continue; safe.push(p);
  }
  if (!safe.length) safe.push({ x: h.x, z: h.z });
  for (const p of safe) mark(w, { shape: 'circle', x: p.x, z: p.z, r: 1.8, life: 3.2, kind: 'song' });
  e.ai.safe = safe.map((p) => ({ ...p, r: 1.8, until: w.t + 3.2 }));
  spot(w, e, e.x, e.z, 40, { warn: 2.4, life: 0.4, dmg: 30 * K, kind: 'radiant', kb: 8, word: true });
  w.emit('word', { e }); announce(w, e, 'word');
}
// He strides to another of His perches in a flash (the second stage)
function stride(w, e) {
  const A = arenaOf(w, e); const opts = A.perches.filter((p) => dist(p, e) > 3 && free(w, p.x, p.z, e.r * 0.8));
  if (!opts.length) return false; const p = opts[Math.floor(w.rand() * opts.length)];
  w.emit('stride', { e, fx: e.x, fz: e.z, x: p.x, z: p.z }); e.x = p.x; e.z = p.z; e.vx = e.vz = 0; e.face = angTo(e, w.hero);
  crown(w, e, POWER.god, 3.0, 9, 0.75); return true;
}

const god = {
  phases: [0.66, 0.33], keep: 99, turn: 1.4,
  tick(w, e) {
    hookWorld5(w); hookGod(w); arenaOf(w, e);
    if (!e.arena) e.arena = { crack: null, shrink: 0, rise: 0, stage: 1 };
    if (!e.ai.bells) summonBells(w, e);
    const alive = e.ai.bells.filter((b) => !b.dead).length;
    if (alive < e.ai.alive) bellFell(w, e, alive);
    e.ai.alive = alive;
    // shielded while both bells ring; never past the stage line while one still does
    e.shielded = alive >= 2 && e.ai.bells.length >= 2;
    e.team = e.shielded ? 'throne' : 'foe';
    if (alive > 0 && e.hp < e.maxHp * 0.665) e.hp = Math.ceil(e.maxHp * 0.665);
    if (e.ai.safe && e.ai.safe.every((s) => s.until <= w.t)) e.ai.safe = null;
  },
  moves(p, e) {
    const K = POWER.god; const q = p >= 3 ? 0.85 : 1;
    if (p <= 1) return [ // from the throne
      { id: 'judgement', w: 2.4, cd: 3.2, a: cast('judgement', 'judge', (w, e) => judgement(w, e, K, 3)) },
      { id: 'toll', w: 2.0, cd: 5.5, a: cast('toll', 'toll', (w, e) => toll(w, e, K, 2), { dur: 1.7, windup: 0.75 }) },
      { id: 'spears', w: 2.0, cd: 3.6, a: cast('spears', 'raise', (w, e) => around(w, e, 5, { warn: 1.0, gap: 0.16, r: 1.15, dmg: 17 * K, kind: 'spear' })) },
      { id: 'hand', w: 1.8, cd: 4.2, a: cast('hand', 'hand', (w, e) => hand(w, e, K, 1)) },
      { id: 'orbs', w: 1.4, cd: 4, a: { name: 'orbs', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', ranged: { kind: 'halo', speed: 5.4, r: 0.34, dmg: 13 * K, life: 4.5, fan: 5, spread: deg(16), homing: 0.4 } } },
    ];
    const m = [
      { id: 'judgement', w: 2.0, cd: 3.6, a: quick(cast('judgement', 'judge', (w, e) => judgement(w, e, K, p >= 3 ? 5 : 3, 0.9, p >= 3 ? 0.28 : 0.2)), q) },
      { id: 'toll', w: 1.8, cd: 5.5, a: quick(cast('toll', 'toll', (w, e) => toll(w, e, K, 3, p >= 3 ? 0.7 : 0.85), { dur: 1.8, windup: 0.75 }), q) },
      { id: 'hand', w: 1.8, cd: 3.8, a: quick(cast('hand', 'hand', (w, e) => hand(w, e, K, 2)), q) },
      { id: 'sweep', w: 1.7, cd: 5, a: cast('sweep', 'sweep', (w, e) => sweep(w, e, K, p >= 3 ? 2.2 : 1.7, p >= 3 ? 11 : 9), { dur: 1.9 }) },
      { id: 'spears', w: 1.4, cd: 4, a: cast('spears', 'raise', (w, e) => around(w, e, p >= 3 ? 7 : 5, { warn: 0.95, gap: 0.14, r: 1.15, dmg: 17 * K, kind: 'spear' })) },
      { id: 'crown', w: 1.6, max: 6, cd: 3.5, a: cast('crown', 'raise', (w, e) => crown(w, e, K, 3.2, 11, 0.8), { dur: 1.3, windup: 0.5 }) },
    ];
    if (p === 2) {
      m.push({ id: 'island', w: 1.5, cd: 8, a: cast('island', 'judge', (w, e) => islandJudgement(w, e, K), { dur: 2.0 }) });
      m.push({ id: 'stride', w: 1.1, cd: 7, run: (w, e) => { if (!stride(w, e)) e.ai.cd = 0.4; else { e.ai.cd = 1.4; e.anim = 'roar'; e.animT = 0.4; } } });
      m.push({ id: 'host', w: 0.8, cd: 16, run: (w, e) => { const n = Math.min(2, 4 - countOf(w, 'hushed')); if (n > 0) summon(w, e, 'hushed', n, ADD_TIER, 6); e.ai.cd = 1; } });
    }
    if (p >= 3) {
      m.push({ id: 'eclipse', w: 1.4, cd: 11, run: (w, e) => startRite(e, 'eclipse', { a0: w.rand() * TAU, dir: w.rand() < 0.5 ? 1 : -1 }) });
      m.push({ id: 'dawnfall', w: 1.6, cd: 7, a: cast('dawnfall', 'raise', (w, e) => dawnfall(w, e, K, 3), { dur: 1.8 }) });
      m.push({ id: 'word', w: 1.2, cd: 14, a: cast('word', 'word', (w, e) => theWord(w, e, K), { dur: 3.0, windup: 0.6 }) });
      m.push({ id: 'lasttoll', w: 1.2, cd: 9, a: cast('lasttoll', 'toll', (w, e) => toll(w, e, K, 4, 0.75, 22), { dur: 1.8, windup: 0.75 }) });
    }
    return m;
  },
  channel(w, e) {
    const c = e.ai.chan; const K = POWER.god;
    const t = riteT(w, e); if (t < 0) return false;
    if (c.id === 'eclipse') { // four beams wheel round Him; spears guard His feet
      hold(w, e, 'eclipse', t);
      if (!c.lit) { c.lit = true; crown(w, e, K, 2.8, 10, 0.7); announce(w, e, 'eclipse'); w.emit('eclipse', { e }); }
      while (c.next <= t && c.next < 4.2) {
        const a = c.a0 + c.dir * c.next * 0.75;
        for (let k = 0; k < 4; k++) { const b = a + k * TAU / 4; beam(w, e, e.x + S(b) * 1.8, e.z + C(b) * 1.8, b, { len: 22, width: 1.0, warn: 0.55, life: 0.14, dmg: 14 * K, kind: 'eyebeam', kb: 4 }); }
        c.next = Math.round((c.next + 0.1) * 100) / 100;
      }
      return t < 4.9;
    }
    return false;
  },
  onPhase(w, e, p) {
    e.arena.stage = p;
    if (p === 2) { rise(w, e); w.emit('godRise', { e }); } // He rises and tolls the world: the heaven cracks; the Hushed and the echoes come
    if (p === 3) { endure(w, e); w.emit('godRise', { e }); } // He rises into the sun; bells rain, the edge of heaven falls; He comes back vast
  },
};

// ------------------------------------------------------------------ the interludes (js/game/interlude.js)
// 'rise' (the second stage): the heaven cracks as He rises out of sight; two waves of the Hushed and two echoes
// of old bosses (counted with the waves); spears of His judgement fall now and then, marked. It ends when they
// are all still (or after dur). 'endure' (the third): bells rain for dur seconds while the edge of heaven falls
// away; He comes back vast. Both end with a marked blow where He lands, at His seat.
const WAVES2 = [[['hushed', 4], ['choirmask', 1]], [['hushed', 3], ['gildedknight', 1], ['hollowangel', 1]]];
function spawnEchoes(w, e, H) {
  const A = arenaOf(w, e); const met = ECHO_POOL.filter(([type]) => BOSSES[type] || BOSSES2[type]); if (!met.length) return;
  const a = Math.floor(w.rand() * met.length); const picks = [met[a], met[(a + 1 + Math.floor(w.rand() * Math.max(1, met.length - 1))) % met.length]];
  picks.forEach(([type, dk], i) => {
    const p = nearFree(w, A.perches[1 + i].x, A.perches[1 + i].z + 3, 0.9); if (!p) return;
    let b = null; try { b = w.spawnBoss(type, p.x, p.z, { face: angTo(p, w.hero || e), dmgMul: e.dmgMul * dk }); } catch (err) { b = null; }
    if (!b) return; b.godEcho = true; b.maxHp = b.hp = Math.round(e.maxHp * 0.07); b.bossBar = 'ECHO OF ' + nameOfBoss(type); b.echoOf = type; b.ai.cd = 1.6; b.ilWave = H;
    w.emit('echo', { e: b, x: p.x, z: p.z }); if (H && H.ents) { H.ents.push(b); H.total = (H.total || 0) + 1; }
  });
}
function rise(w, e) {
  const A = arenaOf(w, e); const K = POWER.god; const home = A.perches[0]; let H = null;
  crack(w, e, 1.8); toll(w, e, K * 0.6, 1, 0, 30);
  H = interlude(w, e, {
    kind: 'waves', leave: 'fly', banner: 'STILL THE ECHOES', dur: 34, waveGap: 10, tier: ADD_TIER, waves: WAVES2,
    onLeave: (w2, b) => spawnEchoes(w2, b, H),
    pattern: (w2, t, dt, IH) => { if (t > 4 && IH.every('spear', 3.4)) around(w2, e, 3, { warn: 1.2, gap: 0.2, r: 1.1, dmg: 14 * K, kind: 'spear' }); },
    back: { x: home.x, z: home.z, entrance: 'drop', dmg: 24 * K, r: 3.4, kind: 'radiant' },
    onReturn: (w2, b) => { b.team = 'foe'; w2.emit('godLand', { e: b }); },
  });
  return H;
}
function endure(w, e) {
  const A = arenaOf(w, e); const K = POWER.god; const home = A.perches[0]; const dur = 13;
  return interlude(w, e, {
    kind: 'gauntlet', leave: 'fly', banner: 'THE HEAVEN FALLS: ENDURE', dur,
    pattern: (w2, t, dt, IH) => {
      shrinkTo(w2, e, clamp01((t - 1) / (dur - 3)));
      if (t > 0.8 && IH.every('bell', 0.42)) {
        const h = w2.hero; if (!h) return; const aim = (IH.bellN = (IH.bellN || 0) + 1) % 3 === 0;
        const a = w2.rand() * TAU, r = aim ? 0 : 1.5 + w2.rand() * 5; const p = aim ? ahead(w2, 1.0, 0.8) : inside(w2, h.x + S(a) * r, h.z + C(a) * r, 1.0);
        if (free(w2, p.x, p.z, 0)) { spot(w2, e, p.x, p.z, 1.4, { warn: 1.15, life: 0.3, dmg: 16 * K, kind: 'toll', kb: 7 }); w2.emit('bellDrop', { e, x: p.x, z: p.z, warn: 1.15 }); }
      }
    },
    back: { x: home.x, z: home.z, entrance: 'drop', dmg: 26 * K, r: 3.6, kind: 'radiant' },
    onReturn: (w2, b) => { shrinkTo(w2, b, 1); b.vast = true; b.team = 'foe'; w2.emit('vast', { e: b }); w2.emit('godLand', { e: b }); },
  });
}

export const BOSS_AI8 = { god };

// ================================================================== the two bells
// Shared bones: a bell glides at you (it has no feet; it hops and slides), turns its mouth to you, and picks a
// move by weight, range and cooldown; some moves are rites it works out over time (e.ai.rite). It falls out of
// the sky when God summons it (e.ai.arrive: a marked slam where it lands).
const BELL_MOVES = {
  dawnbell(p, e) {
    const K = POWER.dawnbell; const q = e.ai.mourn ? 0.85 : 1;
    return [
      // it tips onto its side and rolls at you down a marked lane, leaving fire behind
      { id: 'roll', w: 2.4, min: 2.5, max: 13, cd: 4.5, a: quick(strike({ name: 'roll', anim: 'roll', shape: 'line', range: 2.4, width: 2.5, windup: 0.95, active: 1.75, dur: 2.4, dmg: 20 * K, kb: 10, lunge: 12, lungeT: [0.95, 1.6], tele: 'line', teleRange: 10, turn: 1.6,
        onStrike: (w, e) => beam(w, e, e.x, e.z, e.face, { len: 9, width: 1.3, warn: 0.6, life: 2.2, dmg: 9 * K, kind: 'fire', kb: 2, status: { burn: 1 } }) }), q) },
      // it leaps and comes down mouth first: a ring of flame rolls out
      { id: 'slam', w: 2.0, min: 2, max: 10, cd: 5, a: quick({ name: 'slam', anim: 'leap', dur: 2.2, windup: 0.85, active: 1.5, leap: true, shape: 'circle', offset: 0, radius: 2.6, dmg: 24 * K, kb: 11, tele: 'circleAt', heavy: true,
        onStrike: (w, e) => wave(w, e, e.x, e.z, 7.5, { r0: 2.4, warn: 0, life: 1.1, dmg: 13 * K, kind: 'holyfire', status: { burn: 1 } }) }, q) },
      // it rings close by: a burst of sun round it
      { id: 'ring', w: 2.2, max: 3.6, cd: 3, a: quick(strike({ name: 'ring', anim: 'toll', shape: 'circle', offset: 0, radius: 3.2, windup: 0.75, active: 0.9, dur: 1.5, dmg: 21 * K, kb: 10, lunge: 0, tele: 'circle' }), q) },
      // the flame toll: two rings of fire and a fan of fireballs
      { id: 'flametoll', w: 1.8, cd: 6, a: { name: 'flametoll', anim: 'toll', dur: 1.7, windup: 0.75, active: 0.77, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => {
        for (let i = 0; i < 2; i++) wave(w, e, e.x, e.z, 10, { r0: 1.4, warn: 0.25 + i * 0.8, life: 1.6, dmg: 13 * K, kind: 'holyfire', status: { burn: 1 } });
        const a0 = angTo(e, w.hero); for (let i = 0; i < (e.ai.mourn ? 7 : 5); i++) fling(w, e, a0 + (i - (e.ai.mourn ? 3 : 2)) * 0.26, { kind: 'fireball', speed: 6, dmg: 11 * K, r: 0.34 });
      } } },
      // grieving: suns rain round you
      ...(e.ai.mourn ? [{ id: 'sunrain', w: 1.6, cd: 6, a: { name: 'sunrain', anim: 'toll', dur: 1.5, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => around(w, e, 6, { warn: 0.95, gap: 0.14, r: 1.2, dmg: 15 * K, kind: 'holyfire' }) } }] : []),
    ];
  },
  duskbell(p, e) {
    const K = POWER.duskbell; const q = e.ai.mourn ? 0.85 : 1;
    return [
      // rings of void roll out of its mouth, one after another
      { id: 'voidring', w: 2.2, cd: 4.5, a: { name: 'voidring', anim: 'toll', dur: 1.7, windup: 0.75, active: 0.77, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { for (let i = 0; i < (e.ai.mourn ? 4 : 3); i++) wave(w, e, e.x, e.z, 9, { r0: 1.2, warn: 0.2 + i * 0.6, life: 1.5, dmg: 13 * K, kind: 'discord' }); } } },
      // the gravity well: the floor round it drags you in, then it implodes
      { id: 'gravity', w: 1.8, cd: 9, run: (w, e) => { e.ai.rite = { id: 'gravity', t0: w.t }; announce(w, e, 'gravity'); } },
      // the eclipse: a disc of night follows you, then falls
      { id: 'eclipse', w: 2.0, min: 2, cd: 5.5, run: (w, e) => { e.ai.rite = { id: 'eclipse', t0: w.t }; announce(w, e, 'eclipse'); } },
      // a heavy slam of iron close by
      { id: 'slam', w: 2.2, max: 3.8, cd: 3, a: quick(strike({ name: 'slam', anim: 'toll', shape: 'circle', offset: 0, radius: 3.3, windup: 0.8, active: 0.95, dur: 1.6, dmg: 22 * K, kb: 11, lunge: 0, tele: 'circle' }), q) },
      // night shards spat in a fan
      { id: 'shards', w: 1.5, min: 3, cd: 4, a: { name: 'shards', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', ranged: { kind: 'hex', speed: 5.6, r: 0.32, dmg: 11 * K, life: 3.4, fan: e.ai.mourn ? 7 : 5, spread: deg(15), homing: 0.5 } } },
    ];
  },
};
function bellRite(w, e, h) {
  const R = e.ai.rite; const t = w.t - R.t0; const hero = w.hero; const K = POWER[e.type];
  e.mx = 0; e.mz = 0;
  if (R.id === 'gravity') {
    e.anim = 'pull'; e.animT = t;
    if (!R.on) { R.on = true; spot(w, e, e.x, e.z, 7.5, { warn: 0.5, life: 1.9, dmg: 2, kind: 'curse', tick: 0.5, pull: 1.25 }); mark(w, { shape: 'circle', x: e.x, z: e.z, r: 7.5, life: 2.4, kind: 'curse' }); spot(w, e, e.x, e.z, 2.8, { warn: 2.4, life: 0.35, dmg: 24 * K, kind: 'discord', kb: 12 }); w.emit('gravity', { e }); }
    return t < 2.7;
  }
  if (R.id === 'eclipse') {
    e.anim = 'cast'; e.animT = Math.min(0.56, t);
    if (t < 1.1) { R.x = hero.x; R.z = hero.z; if (!R.m || t - R.mt > 0.18) { R.mt = t; R.m = true; mark(w, { shape: 'circle', x: hero.x, z: hero.z, r: 2.5, life: 0.24, kind: 'curse' }); } return true; }
    if (!R.fell) { R.fell = true; spot(w, e, R.x, R.z, 2.5, { warn: 0.8, life: 0.35, dmg: 24 * K, kind: 'discord', kb: 9 }); w.emit('eclipseFall', { e, x: R.x, z: R.z }); }
    return t < 1.6;
  }
  return false;
}
function bellThink(w, e, h) {
  const hero = w.hero; e.mx = 0; e.mz = 0;
  if (!hero || hero.dead) { e.anim = 'idle'; return; }
  if (e.ai.arrive) { // falling out of the sky onto its marked circle
    const A = e.ai.arrive; const t = w.t - A.t0 - A.delay; const fall = 1.5;
    e.leapH = t < 0 ? 14 : 14 * (1 - easeOut(clamp01(t / fall)) ** 1); e.iframes = 0.3; e.anim = t < fall ? 'fall' : 'land'; e.animT = Math.max(0, t < fall ? t : t - fall);
    if (t >= fall && !A.landed) { A.landed = true; e.leapH = 0; w.emit('bellLand', { e }); w.emit('shake', { amt: 0.9 }); }
    if (t >= fall + 0.6) { e.ai.arrive = null; e.ai.cd = 0.8; e.anim = 'idle'; }
    return;
  }
  if (e.ai.rite) { if (bellRite(w, e, h) !== false) return; e.ai.rite = null; e.ai.cd = 0.6; e.anim = 'idle'; }
  const d = dist(e, hero), ang = angTo(e, hero);
  e.face = turn(e.face, ang, 3.0 * h); e.ai.cd -= h * (e.ai.cdK ? 1 / e.ai.cdK : 1);
  if (e.ai.cd <= 0 && Math.abs(wrap(ang - e.face)) < 0.7) {
    const list = BELL_MOVES[e.type](1, e).filter((m) => d >= (m.min ?? 0) && d <= (m.max ?? 99) && (!m.cd || (e.ai['cd_' + m.id] || 0) <= w.t));
    if (list.length) {
      let r = w.rand() * list.reduce((s, m) => s + m.w, 0); let m = list[list.length - 1]; for (const o of list) { r -= o.w; if (r <= 0) { m = o; break; } }
      if (m.cd) e.ai['cd_' + m.id] = w.t + m.cd * (e.ai.cdK || 1);
      if (m.run) { m.run(w, e); return; }
      w.foeAttack(e, m.a); return;
    }
  }
  // glide: in to its distance, then circle (a bell slides on its lip, in hops)
  const want = e.def.keep || 3; let mv, sp = e.speed;
  if (d > want + 0.6) mv = ang; else { mv = ang + Math.PI / 2 * (e.ai.strafeDir || 1); sp *= 0.4; }
  e.ai.flip = (e.ai.flip ?? 3) - h; if (e.ai.flip <= 0) { e.ai.flip = 2 + w.rand() * 3; e.ai.strafeDir = -(e.ai.strafeDir || 1); }
  e.mx = S(mv); e.mz = C(mv); e.moveSpeed = sp; e.anim = 'glide';
}
export const UNIT_AI8 = { dawnbell: bellThink, duskbell: bellThink };

// ================================================================== Ascended (New Game+)
// As in bosses4.js ASCENDED: a fourth stage, two new moves from its patterns, a colour.
export const ASCENDED8 = {
  god: { hp: 1.2, dmg: 1.15, color: 0xfff0c0, power: 2.3, phases: [0.66, 0.33, 0.14], quick: 0.85, speed: 1.0, ward: 0.05, moves: [
    { id: 'firmament', from: 2, w: 1.3, cd: 8, pat: 'star', n: 8, len: 14, kind: 'eyebeam', dmg: 17, anim: 'judge' },
    { id: 'genesis', from: 3, w: 1.3, cd: 7, pat: 'spiral', arms: 5, n: 9, kind: 'holyfire', dmg: 15, anim: 'raise' },
  ] },
};

// ================================================================== God's arrival
// The shape of bosses4.js ENTRANCES: { kind, dur, cam, script(w, e, t, F, st) }.
const once = (st, key, fn) => { if (!st.fired.has(key)) { st.fired.add(key); fn(); } };
export const ENTRANCES8 = {
  // PROPOSAL: the throne stands empty in the light. A column of light comes down onto it out of the sky; in it a
  // shape of light sits, and slowly it is Him: the robe-bell, the gauntlets, the faceless oval. The crown of rays
  // unfolds behind His head one ray at a time; the six wings open; He lifts both hands and the whole heaven tolls
  // once, a ring of sound rolling out over the floor.
  god: { kind: 'descend', dur: 6.6, cam: { zoom: 0.78, lift: 3.2 }, script(w, e, t, F, st) {
    st.put(st.home.x, st.home.z);
    once(st, 'piece', () => F((fx) => fx.setPiece('beam', st.home.x, st.home.z, st.home.face, { life: 4.4, color: [3.2, 2.9, 2.0] })));
    if (st.every(0.05)) F((fx) => { const a = Math.random() * TAU, r = 1 + Math.random() * 4; fx.emit(st.home.x + S(a) * r, 8 + Math.random() * 4, st.home.z + C(a) * r, { n: 1, speed: 0.2, vy: -6, life: 1.3, grav: 0, color: [3, 2.7, 1.8], size: Math.random() < 0.3 ? 2 : 1 }); });
    e.hidden = t < 0.9; e.form = clamp01((t - 0.9) / 2.0); e.crownK = clamp01((t - 2.6) / 1.6); e.wingK = clamp01((t - 3.4) / 1.4);
    if (t < 4.6) { st.anim('enthroned', t); return; }
    once(st, 'toll', () => { w.emit('shake', { amt: 1.2 }); w.emit('toll', { e }); F((fx) => { fx.shockRing(st.home.x, st.home.z, 14, [3, 2.7, 1.8], 1.0); fx.embers(st.home.x, 4, st.home.z, 80, [3, 2.6, 1.4]); }); });
    st.anim('toll', t - 4.6);
    if (t > 6.4) { e.form = 1; e.crownK = 1; e.wingK = 1; }
  } },
};

// ================================================================== lines and speakers (PROPOSAL)
export const BOSS_LINES8 = {
  god: { intro: 'I WAS THE DAWN. YOU MADE ME A BELL.', fall: 'SO THIS... IS WHAT AN ENDING SOUNDS LIKE.' },
};
export const SPEAKERS8 = {
  god: { name: 'THE VOICE', color: '#ffe8a8' },
  dawnbell: { name: 'THE DAWN BELL', color: '#ffc850' },
  duskbell: { name: 'THE DUSK BELL', color: '#c890ff' },
};

// ================================================================== self-registration (docs/ASCENT_DESIGN.md §6)
Object.assign(BOSSES2, BOSSES8); Object.assign(BOSS_AI2, BOSS_AI8);
Object.assign(UNITS, UNITS8); Object.assign(UNIT_AI, UNIT_AI8);
Object.assign(ENTRANCES, ENTRANCES8); Object.assign(ASCENDED, ASCENDED8);
for (const k in BOSS_LINES8) if (!BOSS_LINES[k]) BOSS_LINES[k] = BOSS_LINES8[k];
for (const k in SPEAKERS8) if (!SPEAKERS[k]) SPEAKERS[k] = SPEAKERS8[k];
