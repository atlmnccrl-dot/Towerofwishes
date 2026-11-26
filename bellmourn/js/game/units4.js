// Act IV foes: the Drowned Heaven (docs/ASCENT_DESIGN.md §1-§2): the Sunken Choir, the Glass Orchard, the Hall
// of Echoes and the Broken Halo. Stats and looks (UNITS_IV), behaviour (UNIT_AI_IV), moves, home tiers and
// bestiary lines. Self-registering (js/game/content.js imports it). Pure logic: the bodies named by look.rig are
// js/actors/beasts5.js (bell-jelly, glass hound, shard swarm); the others wear the bodies of heaven's own.
//
// Harder than Act III's, every blow marked on the stones before it lands:
//  - the bell-jelly drifts in the water, tolls a ring of sound round itself and lashes three tendrils at you;
//    when it dies its bell cracks and rings one last time;
//  - the glass hound hunts in packs: they circle you, one bites while another leaps a marked landing; dead,
//    a hound shatters into a ring of shards;
//  - the shard swarm drifts at you and shreds the ground under you three times running, then sprays shards;
//  - the drowned angel blows its trumpet down a long marked lane (a wall of sound that throws you), buffets
//    with its wings close in, and calls the current: a slow ring that drags you toward it;
//  - the choir-wraith sings in pairs: rings with a gap in each, rising one after another; alone, a held note;
//  - the mirror knight copies you: struck while its mirror is raised it answers with a riposte; it steps
//    through its own reflection and comes out behind you (the spot is marked).
//
// Names, bestiary lines and every comment describing what these things are: PROPOSAL, for the author.
import { UNITS, UNIT_AI, UNIT_ATTACKS } from './units.js';
import { HOME, BESTIARY_TEXT, hookWorld } from './units2.js';

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
const wrap = (a) => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const turn = (a, b, max) => wrap(a + Math.max(-max, Math.min(max, wrap(b - a))));
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

// ------------------------------------------------------------------ helpers
function steer(w, e, ang) { for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9]) { const a = ang + off * (e.ai.strafeDir || 1); if (!w._blocked(e.x + S(a) * 0.9, e.z + C(a) * 0.9, e.r * 0.9)) return a; } return ang; }
function free(w, x, z, r) { const [x0, z0, x1, z1] = w.bounds; if (x < x0 + r + 0.3 || x > x1 - r - 0.3 || z < z0 + r + 0.3 || z > z1 - r - 0.3) return null; return w._blocked(x, z, r) ? null : { x, z }; }
function spotNear(w, x, z, r, rad = 0.5) { const p = free(w, x, z, rad); if (p) return p; for (const rr of [r * 0.5, r, r * 1.6]) for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; const q = free(w, x + S(a) * rr, z + C(a) * rr, rad); if (q) return q; } return null; }
function mark(w, o) { const hero = w.hero; return w.addHazard({ warn: 0, dmg: 0, ...o, t: 0.06, life: (o.life ?? 1) + 0.06, hitSet: new Set(hero ? [hero.id] : []), vis: true }); }
const circle = (w, e, x, z, r, o) => w.addHazard({ shape: 'circle', x, z, r, warn: o.warn ?? 0.6, life: o.life ?? 0.3, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 5, status: o.status, pull: o.pull, tick: o.tick });
const ringOut = (w, e, x, z, r0, r1, o) => w.addHazard({ shape: 'ring', x, z, r0, r1, warn: o.warn ?? 0, life: o.life ?? 0.9, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'shock', kb: o.kb ?? 5, status: o.status, pull: o.pull });
const laneAt = (w, e, x, z, face, o) => w.addHazard({ shape: 'line', x, z, face, len: o.len, width: o.width ?? 1, warn: o.warn ?? 0.6, life: o.life ?? 0.3, dmg: (o.dmg ?? 12) * e.dmgMul, src: e, kind: o.kind || 'slam', kb: o.kb ?? 5, status: o.status });
const move = (w, e, ang, sp) => { const a = steer(w, e, ang); e.mx = S(a); e.mz = C(a); e.moveSpeed = sp; e.anim = sp > e.speed * 0.6 ? 'run' : 'walk'; return a; };
const stand = (e, anim = 'idle') => { e.mx = 0; e.mz = 0; e.moveSpeed = 0; e.anim = anim; };
const attack = (w, e, atk) => { w.foeAttack(e, atk); w.attackers++; };
const meleeToken = (w) => w.attackers < w.tokensMax;
const rangedToken = (w) => w.attackers < w.tokensMax + 1;
const facing = (e, ang, tol = 0.5) => Math.abs(wrap(e.face - ang)) < tol;
const haste = (e) => (e.elite === 'hasted' ? 0.6 : 1);
const busy = (w, type, e) => w.ents.some((f) => f !== e && f.type === type && !f.dead && (f.state === 'windup' || f.state === 'attack'));
function strafeFlip(w, e, h) { const ai = e.ai; ai.flip = (ai.flip ?? 1.5 + w.rand() * 2) - h; if (ai.flip <= 0) { ai.flip = 1.5 + w.rand() * 2.5; ai.strafeDir = -(ai.strafeDir || 1); } }
function lost(w, e, h, hero, d) {
  e.ai.seeT = (e.ai.seeT || 0) - h; if (e.ai.seeT <= 0) { e.ai.seeT = 0.3; e.ai.sees = w.sees(e, hero); }
  e.ai.lost = (d > e.def.aggro * 1.7 || (!e.ai.sees && d > 6)) ? (e.ai.lost || 0) + h : 0;
  if (e.ai.lost > 4 && !e.ai.locked) { e.ai.aggro = false; e.ai.lost = 0; w.emit('calm', { e }); e.anim = 'idle'; if (e.hidden) { e.hidden = false; e.iframes = 0; } return true; }
  return false;
}
const unit = (fn) => (w, e, h) => {
  hookWorld(w); const hero = w.hero;
  if (!hero || hero.dead || !e.ai.aggro) { if (e.hidden) { e.hidden = false; e.iframes = 0; } return false; }
  const d = dist(e, hero); if (!e.hidden && lost(w, e, h, hero, d)) return true;
  e.ai.cd -= h; fn(w, e, h, hero, d, angTo(e, hero)); return true;
};

// ------------------------------------------------------------------ attacks
const A = {
  // the bell-jelly
  jtoll: { name: 'jtoll', anim: 'toll', dur: 1.3, windup: 0.75, active: 0.77, tele: 'circle', shape: 'circle', offset: 0, radius: 3.6, dmg: 0, onStrike: (w, e) => { ringOut(w, e, e.x, e.z, 0.6, 3.8, { life: 0.7, dmg: 15, kind: 'toll', kb: 7, status: { shock: 1 } }); w.emit('toll', { e }); } },
  jsting: { name: 'jsting', anim: 'sting', dur: 1.2, windup: 0.6, active: 0.68, tele: 'none', dmg: 0, onStrike: (w, e) => { const a = e.face; for (const o of [-0.32, 0, 0.32]) laneAt(w, e, e.x, e.z, a + o, { len: 5.6, width: 0.6, warn: 0.0, life: 0.25, dmg: 14, kind: 'deepsong', kb: 3, status: { shock: 1 } }); } },
  // the glass hound
  gbite: { name: 'gbite', anim: 'bite', dur: 0.85, windup: 0.42, active: 0.54, range: 1.7, arc: deg(110), dmg: 15, kb: 3, lunge: 4, tele: 'arc' },
  gleap: { name: 'gleap', anim: 'leap', dur: 1.1, windup: 0.55, active: 0.9, leap: true, shape: 'circle', offset: 0, radius: 1.15, dmg: 17, kb: 5, tele: 'circleAt' },
  // the shard swarm
  sshred: { name: 'sshred', anim: 'shred', dur: 1.6, windup: 0.7, active: 0.72, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const h = w.hero; if (!h) return; for (let i = 0; i < 3; i++) { const p = spotNear(w, h.x + (h.vx || 0) * 0.3 * i, h.z + (h.vz || 0) * 0.3 * i, 1, 0.3) || h; circle(w, e, p.x, p.z, 1.35, { warn: 0.55 + i * 0.42, life: 0.25, dmg: 12, kind: 'glass', kb: 2, status: { bleed: 1 } }); }
  } },
  sspray: { name: 'sspray', anim: 'shred', dur: 1.2, windup: 0.6, active: 0.62, tele: 'ray', teleRange: 9, ranged: { kind: 'gear', speed: 9, r: 0.24, dmg: 10, life: 1.6, fan: 7, spread: deg(9), status: { bleed: 1 } } },
  // the drowned angel
  dtrumpet: { name: 'dtrumpet', anim: 'cast', dur: 1.5, windup: 0.85, active: 0.9, tele: 'none', dmg: 0, onStrike: (w, e) => { laneAt(w, e, e.x, e.z, e.face, { len: 13, width: 1.6, warn: 0.0, life: 0.45, dmg: 19, kind: 'deepsong', kb: 11 }); w.emit('shake', { amt: 0.35 }); } },
  dbuffet: { name: 'dbuffet', anim: 'roar', dur: 1.3, windup: 0.7, active: 0.72, tele: 'circle', shape: 'circle', offset: 0, radius: 3.2, dmg: 0, onStrike: (w, e) => ringOut(w, e, e.x, e.z, 0.7, 3.4, { life: 0.6, dmg: 15, kind: 'water', kb: 9 }) },
  dcurrent: { name: 'dcurrent', anim: 'cast', dur: 1.8, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, onStrike: (w, e) => { circle(w, e, e.x, e.z, 6, { warn: 0.4, life: 2.2, dmg: 0, kind: 'tide', kb: 0, pull: 0.55, tick: 9 }); circle(w, e, e.x, e.z, 1.8, { warn: 2.4, life: 0.3, dmg: 20, kind: 'water', kb: 9 }); } },
  // the choir-wraith
  wsong: { name: 'wsong', anim: 'shriek', dur: 1.7, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, onStrike: (w, e) => {
    const h = w.hero; if (!h) return; for (let i = 0; i < 3; i++) { const R = 2 + i * 1.8; const gap = angTo(h, e) + Math.PI + (w.rand() - 0.5) * 1.2; const n = Math.max(6, Math.round(TAU * R / 1.4));
      for (let k = 0; k < n; k++) { const a = k / n * TAU; if (Math.abs(wrap(a - gap)) < 0.5) continue; const x = h.x + S(a) * R, z = h.z + C(a) * R; if (free(w, x, z, 0)) circle(w, e, x, z, 0.7, { warn: 0.8 + i * 0.4, life: 0.25, dmg: 13, kind: 'deepsong', kb: 4 }); } }
  } },
  wshriek: { name: 'wshriek', anim: 'shriek', dur: 1.3, windup: 0.75, active: 0.77, tele: 'circle', shape: 'circle', offset: 0, radius: 3.4, dmg: 0, onStrike: (w, e) => ringOut(w, e, e.x, e.z, 0.6, 3.6, { life: 0.6, dmg: 14, kind: 'deepsong', kb: 7, status: { blind: 1 } }) },
  // the mirror knight
  mcut: { name: 'mcut', anim: 'fslash', dur: 1.05, windup: 0.5, active: 0.62, range: 2.3, arc: deg(140), dmg: 18, kb: 5, lunge: 3.2, tele: 'arc' },
  mriposte: { name: 'mriposte', anim: 'thrust', dur: 0.8, windup: 0.22, active: 0.34, shape: 'line', range: 3.6, width: 1.0, dmg: 24, kb: 7, lunge: 5, tele: 'line' },
  mstep: { name: 'mstep', anim: 'cast', dur: 1.0, windup: 0.55, active: 0.57, tele: 'none', dmg: 0 },
};

// ------------------------------------------------------------------ the foes
export const UNITS_IV = {
  belljelly: {
    name: 'Bell Jelly', hp: 170, poise: 99, flinch: 0, speed: 2.4, r: 0.55, mass: 1.2, aggro: 15, keep: 3.4, drop: 16, home: 15.5, flier: true, hover: true,
    attacks: [{ a: A.jsting, w: 1, min: 2.5, max: 6 }],
    look: { rig: 'belljelly', scale: 1.15, eyes: 0x9af0ff, colors: { glass: 0xa8e0ff, lip: 0x80d8ff, core: 0xe8fcff, thread: 0x60c0ff } },
    afterDeath: (w, e) => { ringOut(w, e, e.x, e.z, 0.5, 2.6, { warn: 0.45, life: 0.5, dmg: 10, kind: 'toll', kb: 5 }); w.emit('toll', { e }); },
  },
  glasshound: {
    name: 'Glass Hound', hp: 120, poise: 40, flinch: 1, speed: 5.6, r: 0.45, mass: 1.3, aggro: 15, keep: 3.4, drop: 12, home: 16,
    attacks: [{ a: A.gbite, w: 1, min: 0, max: 1.7 }],
    look: { rig: 'glasshound', scale: 1.3, eyes: 0xfff0ff, colors: { paneA: 0xb07aff, paneB: 0x6ab8ff, lead: 0x2a2438, core: 0xffe0ff, amber: 0xd8903a } },
    afterDeath: (w, e) => { ringOut(w, e, e.x, e.z, 0.4, 2.3, { warn: 0.45, life: 0.4, dmg: 11, kind: 'glass', kb: 3, status: { bleed: 1 } }); w.emit('shatter', { e }); },
  },
  shardswarm: {
    name: 'Shard Swarm', hp: 110, poise: 99, flinch: 0, speed: 3.1, r: 0.6, mass: 0.6, aggro: 15, keep: 4.5, drop: 12, home: 16, flier: true, hover: true,
    attacks: [{ a: A.sshred, w: 1, min: 0, max: 8 }],
    look: { rig: 'shardswarm', scale: 1.2, eyes: 0xffffff, colors: { core: 0xfff0ff } },
  },
  drownedangel: {
    name: 'Drowned Angel', hp: 230, poise: 70, flinch: 0.5, speed: 2.8, r: 0.5, mass: 1.8, aggro: 15, keep: 6, ranged: true, drop: 22, home: 15.5, hover: true, flier: true,
    attacks: [{ a: A.dtrumpet, w: 1, min: 3, max: 11 }],
    look: null, // laid over the Hollow Angel's body (below), in the colours of the deep
  },
  choirwraith: {
    name: 'Choir Wraith', hp: 130, poise: 99, flinch: 0, speed: 2.8, r: 0.45, mass: 0.8, aggro: 15, keep: 7, ranged: true, drop: 16, home: 15.5, flier: true,
    attacks: [{ a: A.wsong, w: 1, min: 2.5, max: 10 }],
    look: null, // the Choir Mask's body, sea-pale, its ribbons weed-green
  },
  mirrorknight: {
    name: 'Mirror Knight', hp: 280, poise: 95, flinch: 0.5, speed: 2.9, r: 0.46, mass: 2, aggro: 14, keep: 2.2, shield: true, drop: 24, home: 17,
    attacks: [{ a: A.mcut, w: 1, min: 0, max: 2.3 }],
    look: null, // a knight in armour of mirror: the Chrono Knight's frame, silvered
  },
};
function lookOf(base, colors, extra) { const B = UNITS[base]; return B ? { ...B.look, ...extra, colors: { ...(B.look.colors || {}), ...colors } } : null; }
function looks() {
  UNITS_IV.drownedangel.look = lookOf('hollowangel', { skin: 0x7aa89a, tunic: 0x3a6a62, pants: 0x2a4a46, boots: 0x18302e, shoulder: 0x9ad8c0, glove: 0x7aa89a, belt: 0x60c0a8, trim: 0x60c0a8 }, { skirt: 0x3a6a62, eyes: 0x60ffd8, scale: 1.3 });
  UNITS_IV.choirwraith.look = lookOf('choirmask', { mask: 0xc8e8d8, gold: 0x60c0a8, song: 0x80ffd0, ribbon: 0x1e6a5a, mouth: 0x02100c }, { scale: 1.6 });
  UNITS_IV.mirrorknight.look = lookOf('chronoknight', { skin: 0xc8ccd8, tunic: 0x8a90a8, pants: 0x5a6078, boots: 0x3a3e50, shoulder: 0xe8ecf8, glove: 0xb8bccc, belt: 0x4a4e60 }, { blade: 0xf0f4ff, bladeGlow: 0x8a90c8, eyes: 0xe0e8ff, mask: 0xd8dcec, bulk: 1.15 });
}

export const BESTIARY_TEXT_IV = {
  belljelly: 'A BELL THAT SWIMS. IT TOLLS, AND IT STINGS.',
  glasshound: 'THEY HUNT IN PACKS. DEAD, THEY SHATTER.',
  shardswarm: 'A STORM OF BROKEN PANES. DO NOT STAND STILL.',
  drownedangel: 'ITS TRUMPET IS A WALL OF SOUND. THE CURRENT PULLS.',
  choirwraith: 'THEY SING IN RINGS. FIND THE GAP.',
  mirrorknight: 'STRIKE ITS MIRROR AND IT STRIKES BACK.',
};

// ------------------------------------------------------------------ behaviour
export const UNIT_AI_IV = {
  // Drifts at the edge of reach, turning slowly round you; close, it tolls; at a few strides it lashes.
  belljelly: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 3 * h);
    if (ai.cd <= 0 && d < 3.2 && (ai.tollAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.jtoll); ai.tollAt = w.t + 4 * haste(e); return; }
    if (ai.cd <= 0 && d >= 2.4 && d <= 5.8 && facing(e, ang, 0.4) && meleeToken(w)) { attack(w, e, A.jsting); ai.cd = 1.4 * haste(e); return; }
    if (d > 4.6) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),
  // A pack: they circle you three strides out; one bites while another leaps (never two leaping at once).
  glasshound: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 9 * h);
    if (ai.backT > 0) { ai.backT -= h; const a = move(w, e, ang + Math.PI - 0.7 * (ai.strafeDir || 1), e.speed); e.face = turn(e.face, a, 10 * h); return; }
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.5)) {
      if (d < 1.8) { attack(w, e, A.gbite); ai.backT = 0.45; return; }
      if (d >= 3 && d <= 7 && (ai.leapAt ?? 0) <= w.t && !busy(w, 'glasshound', e) && w.clear(e, hero)) { attack(w, e, A.gleap); ai.leapAt = w.t + 3.6 * haste(e); ai.backT = 0.5; return; }
    }
    if (d > 6) move(w, e, ang, e.speed);
    else { const around = angTo(hero, e) + ai.strafeDir * 0.7; move(w, e, Math.atan2(hero.x + S(around) * 3.2 - e.x, hero.z + C(around) * 3.2 - e.z), e.speed * 0.8); }
    e.face = turn(e.face, ang, 9 * h);
  }),
  // Drifts in, shreds the ground under you three times, sprays shards from a distance.
  shardswarm: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 5 * h);
    if (ai.cd <= 0 && d <= 8 && (ai.shredAt ?? w.t + 1) <= w.t && meleeToken(w)) { attack(w, e, A.sshred); ai.shredAt = w.t + 4.5 * haste(e); return; }
    ai.shredAt ??= w.t + 1;
    if (ai.cd <= 0 && d >= 3 && d <= 9 && ai.sees && rangedToken(w) && facing(e, ang, 0.5)) { attack(w, e, A.sspray); ai.cd = 1.8 * haste(e); return; }
    if (d > 4) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.7);
    e.anim = 'walk';
  }),
  // Hangs back on its wings: the trumpet down a long lane; close, a buffet; now and then the current.
  drownedangel: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 3.4 * h);
    if (ai.cd <= 0 && d < 3 && (ai.buffetAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.dbuffet); ai.buffetAt = w.t + 4 * haste(e); return; }
    if (ai.cd <= 0 && d <= 8 && (ai.currentAt ?? w.t + 3) <= w.t && !busy(w, 'drownedangel', e) && meleeToken(w)) { attack(w, e, A.dcurrent); ai.currentAt = w.t + 9 * haste(e); return; }
    ai.currentAt ??= w.t + 3;
    if (ai.cd <= 0 && d >= 3 && d <= 12 && ai.sees && facing(e, ang, 0.35) && rangedToken(w)) { mark(w, { shape: 'line', x: e.x, z: e.z, face: e.face, len: 13, width: 1.6, life: A.dtrumpet.windup, kind: 'lure' }); attack(w, e, A.dtrumpet); ai.cd = 2.2 * haste(e); return; }
    if (d < 4.5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed); else if (d > 9) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),
  // Floats and sings rings round you, each with a gap; two wraiths together sing over each other.
  choirwraith: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 3.5 * h);
    if (ai.cd <= 0 && d < 3 && (ai.shriekAt ?? 0) <= w.t && meleeToken(w)) { attack(w, e, A.wshriek); ai.shriekAt = w.t + 4 * haste(e); return; }
    if (ai.cd <= 0 && d >= 2.5 && d <= 10 && ai.sees && (ai.songAt ?? 0) <= w.t && rangedToken(w)) { attack(w, e, A.wsong); ai.songAt = w.t + 5.5 * haste(e); return; }
    if (d < 5) move(w, e, ang + Math.PI + 0.4 * ai.strafeDir, e.speed); else if (d > 9) move(w, e, ang, e.speed); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.45);
    e.anim = 'walk';
  }),
  // Advances behind its mirror. Struck from the front while the mirror is up, it answers with a riposte; at a
  // few strides it steps into its own reflection and comes out behind you (marked); close, a cut.
  mirrorknight: unit((w, e, h, hero, d, ang) => {
    const ai = e.ai; strafeFlip(w, e, h); e.face = turn(e.face, ang, 4 * h);
    if (ai.stepTo && w.t >= ai.stepTo.at) { const p = ai.stepTo; ai.stepTo = null; e.hidden = false; e.iframes = 0; if (free(w, p.x, p.z, e.r)) { e.x = p.x; e.z = p.z; } e.face = angTo(e, hero); attack(w, e, A.mcut); return; }
    if (ai.stepTo) { stand(e, 'cast'); return; }
    if (e.hp < (ai.lastHp ?? e.hp) && facing(e, ang, 0.6) && (ai.ripAt ?? 0) <= w.t && e.state !== 'windup' && e.state !== 'attack') { ai.ripAt = w.t + 2.4; ai.lastHp = e.hp; attack(w, e, A.mriposte); return; }
    ai.lastHp = e.hp;
    if (ai.cd <= 0 && meleeToken(w) && facing(e, ang, 0.5)) {
      if (d < 2.3) { attack(w, e, A.mcut); return; }
      if (d >= 3 && d <= 8 && (ai.stepAt ?? w.t + 2) <= w.t) {
        const back = angTo(hero, e) + Math.PI; const p = spotNear(w, hero.x + S(back) * 1.6, hero.z + C(back) * 1.6, 1, e.r);
        if (p) { ai.stepTo = { x: p.x, z: p.z, at: w.t + 0.9 }; ai.stepAt = w.t + 6 * haste(e); e.hidden = true; e.iframes = 99; mark(w, { shape: 'circle', x: p.x, z: p.z, r: 1.0, life: 0.9, kind: 'lure' }); w.emit('vanish', { e }); return; }
      }
      ai.stepAt ??= w.t + 2;
    }
    if (d > 2.1) move(w, e, ang, e.speed * (d > 5 ? 1 : 0.6)); else move(w, e, ang + Math.PI / 2 * ai.strafeDir, e.speed * 0.3);
  }),
};

// ------------------------------------------------------------------ registration
looks();
for (const k in UNITS_IV) if (UNITS_IV[k].look) { UNITS[k] = UNITS_IV[k]; UNIT_AI[k] = UNIT_AI_IV[k]; HOME[k] = UNITS_IV[k].home; BESTIARY_TEXT[k] = BESTIARY_TEXT_IV[k]; }
Object.assign(UNIT_ATTACKS, A);
