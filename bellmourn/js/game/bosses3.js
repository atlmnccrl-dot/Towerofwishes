// Act II's bosses: the Hoarfrost King (Frostmarch, the snow), Ashmaw (the Ashdunes, the desert), Abbot
// Morrow (the Catacombs, the dungeon) and the Hollow Archon (the Abyss, the ritual hell). Stats and looks
// (BOSSES3) and move sets (BOSS_AI3) in the shape of BOSSES2 / BOSS_AI2, merged into those two objects by
// bosses2.js, so sim.js, ai.js and game.js find them by key. Pure logic: the look.extra functions only run
// in the browser, when the view builds the rig.
//
// No parry exists: every blow is telegraphed (a red shape on the floor or a hazard's warning) and can be
// dashed through or walked out of. Each boss has three phases and reach, so nobody kites them forever.
// Summons use the Act II unit keys and fall back to an older foe while a key is not registered.
//
// Names, titles and the comments describing who they are: PROPOSAL, for the author to revise.
import { strike, ringAt, circleAt, summon, blink, steer } from './ai.js';
import { BOSSES2, BOSS_AI2, free, adds, countOf, roarPause, row, around, combo, quick } from './bosses2.js';
import { FOES } from './defs.js';
import { UNITS } from './units.js';

const deg = (d) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const dist = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
const S = Math.sin, C = Math.cos;

// Hazard and projectile kinds, the same names the Act II units use (units2.js), so fx.js colours them
// alike; until it knows one it draws it as a red slam, which still reads as a blow.
const KIND = { frost: 'frost', ice: 'ice', sand: 'sand', rot: 'poison', bone: 'bone', sigil: 'sigil', hell: 'hellfire', beam: 'eyebeam', light: 'lightning' };
const PROJ = { ice: 'boulder', venom: 'sandspit', soul: 'soul' };

// How hard each boss hits (multiplies every number below; the district's dmgMul still applies on top) and
// the tier their summons come at.
const POWER = { frostgiant: 1.8, sandwyrm: 1.8, lich: 1.85, archon: 1.9 };
const ADD_TIER = { frostgiant: 7, sandwyrm: 8, lich: 8, archon: 9 };

// ------------------------------------------------------------------ helpers
const known = (type) => !!(FOES[type] || UNITS[type]);
// summon the first registered key of `list` (the Act II unit, then its stand-in); capped per type and in all
function call(w, e, list, n, tier, radius = 5, cap = 2, total = 5) {
  const type = list.find(known); if (!type) return 0;
  const room = Math.min(n, cap - countOf(w, type), total - adds(w, e)); if (room <= 0) return 0;
  summon(w, e, type, room, tier, radius); return room;
}
const countAny = (w, list) => list.reduce((s, t) => s + countOf(w, t), 0);
// a point pulled inside the arena by margin m
function inside(w, x, z, m = 1.2) {
  const [x0, z0, x1, z1] = w.bounds;
  return { x: Math.max(x0 + m, Math.min(x1 - m, x)), z: Math.max(z0 + m, Math.min(z1 - m, z)) };
}
// a circle hazard (with an optional status: frost chills, poison rots)
function spot(w, e, x, z, r, o) { return w.addHazard({ shape: 'circle', x, z, r, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status }); }
// an expanding ring
function wave(w, e, x, z, r1, o) { return w.addHazard({ shape: 'ring', x, z, r0: o.r0 ?? 0.6, r1, warn: o.warn ?? 0, life: o.life ?? 1.2, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 6, status: o.status }); }
// how far a straight lane from (x, z) along ang runs before a wall or the arena's edge
function reach(w, x, z, ang, max) {
  let px = x, pz = z, s = 0;
  for (let k = 0.5; k <= max; k += 0.5) {
    const cx = x + S(ang) * k, cz = z + C(ang) * k;
    if (!free(w, cx, cz, 0) || !w.clear({ x: px, z: pz }, { x: cx, z: cz })) break;
    px = cx; pz = cz; s = k;
  }
  return s;
}
// a lane hazard (a breath, a beam, a crack) from (x, z) along ang, stopping at walls unless o.through
function lane(w, e, x, z, ang, o) {
  const len = o.through ? o.len : Math.min(o.len || 12, reach(w, x, z, ang, o.len || 12)); if (len < 0.8) return null;
  return w.addHazard({ shape: 'line', x, z, face: ang, len, width: o.width || 1.1, warn: o.warn, life: o.life ?? 0.3, dmg: o.dmg * e.dmgMul, src: e, kind: o.kind, kb: o.kb ?? 5, status: o.status });
}
// something lobbed (a block of ice, a glob of venom): it flies to (tx, tz) and its landing is marked at once
function lob(w, e, tx, tz, o) {
  const a = Math.atan2(tx - e.x, tz - e.z); const sx = e.x + S(a) * (e.r + 0.3), sz = e.z + C(a) * (e.r + 0.3);
  w.projs.push({ id: w.nextId++, kind: o.kind, team: 'foe', x: sx, z: sz, y: 1.6, vx: (tx - sx) / o.arc, vz: (tz - sz) / o.arc, r: o.size ?? 0.3, dmg: 0, life: o.arc, lob: o.arc, lobT: 0, tx, tz, face: a, hitSet: new Set(), src: e });
  return spot(w, e, tx, tz, o.splash, { warn: o.arc, life: o.pool ?? 0.25, dmg: o.dmg, kind: o.hazard, kb: o.kb ?? 4, status: o.status });
}
// where the hero will be in t seconds (part of the way), kept inside the arena
function ahead(w, t, k = 0.6) { const h = w.hero; return inside(w, h.x + (h.vx || 0) * t * k, h.z + (h.vz || 0) * t * k, 1.0); }
// hold a pose while a rite is channelled (animT is set each step, so the clip stands still; roar keeps its shudder)
function hold(w, e, anim) { e.anim = anim; e.animT = anim === 'roar' ? 0.62 + (w.t % 0.4) : 0.56; e.mx = 0; e.mz = 0; }
function startRite(e, id, o = {}) { e.ai.chan = { id, t0: null, next: 0, ...o }; e.tele = null; e.mx = 0; e.mz = 0; }
// seconds into the rite, or -1 when it was broken: a stagger (the only thing that stops a boss thinking
// mid-rite) breaks it, so a hero who keeps up the pressure can end it early
const riteT = (w, e) => { const c = e.ai.chan; if (c.t0 === null) c.t0 = w.t; else if (w.t - c.last > 0.25) return -1; c.last = w.t; return w.t - c.t0; };
// a fresh shield (it absorbs damage first), not stacked over one that still holds
function ward(w, e, k, cap = k) { const top = Math.round(e.maxHp * cap); const s = Math.min(top, (e.shield || 0) + Math.round(e.maxHp * k)); if (s > (e.shield || 0)) { e.shield = s; w.emit('shield', { e }); } }

// ------------------------------------------------------------------ looks (extra geometry on the rig)
// part(joint, geometry, colour, x, y, z, opts) adds a box to a joint (opts.glow: unlit and bright);
// rig.weapon is the right-hand weapon group (+Z along the weapon). New groups are made with the rig's own
// Group class, so this file never imports three.js. onFrame() hooks the rig's per-frame cloak update to
// move the parts that live (a tail, wings, sigil rings, orbiting skulls).
function onFrame(rig, fn) {
  const up = rig.updateCloak.bind(rig); let t = Math.random() * 10;
  rig.updateCloak = (dt, speed, turn) => { up(dt, speed, turn); t += dt; fn(t, dt, speed || 0, turn || 0); };
}
const group = (rig, parent, x = 0, y = 0, z = 0) => { const g = new rig.root.constructor(); g.position.set(x, y, z); parent.add(g); return g; };

// PROPOSAL: the Hoarfrost King, a frost giant with a club of glacier ice, a beard of icicles and a crown of
// frozen spikes, under a mantle of white fur; a cold blue heart shows through his hide.
function frostExtra(rig, part, box) {
  const ice = 0xbfe8ff, glow = 0x8fe8ff, pale = 0xe8f6ff, fur = 0xe6ecf0, pine = 0x2a2420, iron = 0x5a6068;
  const W = (p) => { rig.weapon.add(p); return p; };
  const ie = { emissive: 0x16364a };
  // the club: a black pine trunk bound in iron, its head a block of glacier bristling with icicles
  W(part('haR', box(0.09, 0.09, 1.05), pine, 0, -0.04, 0.42));
  W(part('haR', box(0.13, 0.13, 0.08), iron, 0, -0.04, 0.12));
  W(part('haR', box(0.13, 0.13, 0.08), iron, 0, -0.04, 0.82));
  W(part('haR', box(0.32, 0.32, 0.52), ice, 0, -0.04, 1.14, ie));
  W(part('haR', box(0.4, 0.24, 0.3), pale, 0.02, 0.02, 1.32, ie));
  for (const [x, y, z, rx, rz] of [[0.2, 0, 1.0, 0, 1.57], [-0.2, 0, 1.12, 0, -1.57], [0.2, 0, 1.3, 0, 1.4], [-0.2, 0.05, 1.36, 0, -1.4], [0, 0.22, 1.08, 0, 0], [0, -0.28, 1.2, 0, 0], [0, 0.2, 1.38, 0.3, 0], [0, -0.04, 1.5, 1.57, 0]]) W(part('haR', box(0.06, 0.24, 0.06), glow, x, y, z, { glow: 1.6, rx, rz }));
  rig.tip.position.set(0, -0.04, 1.5); rig.bladeLen = 1.5;
  // a beard of frozen hair ending in icicles, and a crown of ice spikes
  const hs = 0.3; // look.headSize
  part('head', box(0.28, 0.17, 0.08), pale, 0, 0.05, hs / 2 + 0.02);
  for (let i = -2; i <= 2; i++) part('head', box(0.04, 0.1 + (2 - Math.abs(i)) * 0.05, 0.04), glow, i * 0.055, -0.06 - (2 - Math.abs(i)) * 0.025, hs / 2 + 0.03, { glow: 1.5 });
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; part('head', box(0.05, 0.14 + (i % 2) * 0.09, 0.05), ice, S(a) * 0.15, hs + 0.08 + (i % 2) * 0.04, C(a) * 0.15, { rz: S(a) * 0.35, rx: -C(a) * 0.35, ...ie }); }
  // glacier pauldrons with spikes, ice crusted on the forearms
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    part('sh' + side, box(0.3, 0.15, 0.3), ice, 0, 0.06, 0, ie);
    part('sh' + side, box(0.05, 0.26, 0.05), glow, sx * 0.08, 0.2, 0.02, { glow: 1.4, rz: -sx * 0.5 });
    part('sh' + side, box(0.05, 0.2, 0.05), glow, sx * 0.02, 0.18, -0.08, { glow: 1.4, rz: -sx * 0.2, rx: -0.4 });
    part('el' + side, box(0.21, 0.12, 0.21), ice, 0, -0.08, 0, ie);
  }
  // a fur collar, shards of the glacier grown through his back, and the heart of ice in his chest
  part('chest', box(0.6, 0.08, 0.36), fur, 0, 0.26, -0.02);
  for (const [x, y, rz] of [[-0.18, 0.24, 0.5], [0.05, 0.3, -0.15], [0.2, 0.18, -0.6], [-0.05, 0.08, 0.2]]) part('chest', box(0.09, 0.4, 0.09), ice, x, y, -0.2, { rx: -0.6, rz, ...ie });
  part('chest', box(0.14, 0.14, 0.02), glow, 0, 0.12, 0.205, { glow: 3 });
  for (const sx of [-1, 1]) part('chest', box(0.04, 0.24, 0.02), glow, sx * 0.1, 0.12, 0.204, { glow: 1.6, rz: sx * 0.6 });
  // frost crusted over the belly and thighs, faintly lit from inside
  part('spine', box(0.5, 0.16, 0.03), ice, 0, 0.04, 0.2, ie);
  for (const side of ['L', 'R']) part('hip' + side, box(0.2, 0.2, 0.03), ice, 0, -0.18, 0.115, ie);
  // a belt of trophies: frozen skulls
  for (const sx of [-1, 0, 1]) part('spine', box(0.08, 0.08, 0.07), 0xd8d4c8, sx * 0.16, -0.02, 0.2);
}

// PROPOSAL: Ashmaw, a wyrm of the deep sand that rises like a man from the waist: a hooded serpent head with
// mandibles, scythe-claws on its forearms, a coil where its legs should be and a long tail behind it.
function wyrmExtra(rig, part, box) {
  const sand = 0xc49456, dark = 0x8a5a2c, belly = 0xe2c48e, bone = 0xf0e0c0, eye = 0xffc030, hood = 0xb47e44;
  for (const j of ['hipL', 'hipR']) rig.j[j].visible = false;
  // the coil rising out of the sand into the waist, belly plates in front
  part('hips', box(0.5, 0.98, 0.46), sand, 0, -0.48, -0.02);
  part('hips', box(0.66, 0.24, 0.66), dark, 0, -0.84, -0.06);
  for (let i = 0; i < 4; i++) part('hips', box(0.36, 0.1, 0.02), belly, 0, -0.18 - i * 0.18, 0.215);
  // the tail along the sand behind, segment by segment, spiked along the top; it sways (see onFrame)
  const segs = []; let parent = group(rig, rig.body, 0, 0.16, -0.3);
  for (let i = 0; i < 9; i++) {
    const L = 0.42, wd = 0.46 - i * 0.04, ht = 0.3 - i * 0.022;
    const g = i === 0 ? parent : group(rig, parent, 0, 0, -L); parent = g; segs.push(g);
    const m = part('hips', box(wd, ht, L + 0.04), i % 2 ? sand : dark, 0, 0, -L / 2); g.add(m);
    const sp = part('hips', box(0.05, 0.12, 0.08), bone, 0, ht / 2 + 0.05, -L / 2, { rx: -0.5 }); g.add(sp);
    if (i === 8) { const st = part('hips', box(0.06, 0.06, 0.34), bone, 0, 0.06, -L - 0.12, { rx: -0.5 }); g.add(st); }
  }
  // spines down the back
  for (let i = 0; i < 4; i++) part(i < 2 ? 'chest' : 'spine', box(0.05, 0.18, 0.06), bone, 0, i < 2 ? 0.26 - i * 0.14 : 0.08 - (i - 2) * 0.1, -0.2, { rx: -0.6 });
  // the hood: wide flaps behind the head with eye-spots, a snout, mandibles, horns and four eyes
  part('head', box(0.6, 0.46, 0.05), hood, 0, 0.16, -0.12);
  for (const sx of [-1, 1]) {
    part('head', box(0.14, 0.4, 0.05), dark, sx * 0.3, 0.12, -0.1, { ry: sx * 0.5 });
    part('head', box(0.07, 0.07, 0.02), eye, sx * 0.2, 0.22, -0.09, { glow: 1.6 });
    part('head', box(0.03, 0.16, 0.03), bone, sx * 0.07, -0.02, 0.24, { rx: 0.35, rz: sx * 0.25 });
    part('head', box(0.04, 0.24, 0.04), bone, sx * 0.1, 0.3, -0.06, { rx: -1.0, rz: -sx * 0.3 });
    part('head', box(0.05, 0.04, 0.03), eye, sx * 0.05, 0.2, 0.175, { glow: 2.6 });
  }
  part('head', box(0.2, 0.12, 0.2), sand, 0, 0.08, 0.17);
  part('head', box(0.16, 0.03, 0.18), belly, 0, 0.02, 0.18);
  // scythe-claws along the forearms, plates on the shoulders
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    part('el' + side, box(0.04, 0.5, 0.1), bone, sx * 0.07, -0.26, 0.09, { rx: 0.35 });
    part('el' + side, box(0.04, 0.14, 0.06), bone, sx * 0.07, -0.5, 0.19, { rx: 1.1 });
    part('sh' + side, box(0.24, 0.1, 0.26), dark, 0, 0.05, 0);
  }
  onFrame(rig, (t, dt, sp, turn) => { const k = 2.2 + sp * 0.9; segs.forEach((g, i) => { g.rotation.y = S(t * k - i * 0.75) * (0.1 + i * 0.022) - turn * 0.25 * Math.min(1, i / 3); g.rotation.x = i ? S(t * 1.3 - i) * 0.03 : 0; }); });
}

// PROPOSAL: Abbot Morrow, the last abbot of the catacombs: a floating lich in a rotted habit, a skull under
// the hood, his ribs bare, a green phylactery on a chain and three skulls circling him at prayer.
function lichExtra(rig, part, box) {
  const bone = 0xe4dcc4, old = 0xb0a68c, green = 0x9aff70, dark = 0x0a080c, rag = 0x2a2230;
  // a skull face inside the hood, a jaw of teeth
  part('head', box(0.17, 0.15, 0.02), bone, 0, 0.12, 0.158);
  for (const sx of [-1, 1]) part('head', box(0.05, 0.045, 0.01), dark, sx * 0.045, 0.14, 0.17);
  for (let i = -2; i <= 2; i++) part('head', box(0.022, 0.035, 0.02), bone, i * 0.032, 0.035, 0.16);
  // the habit opened on bare ribs, and the phylactery hanging on its chain
  part('chest', box(0.22, 0.28, 0.02), dark, 0, 0.12, 0.122);
  for (let i = 0; i < 4; i++) part('chest', box(0.2, 0.025, 0.02), bone, 0, 0.04 + i * 0.065, 0.13);
  part('chest', box(0.035, 0.26, 0.02), old, 0, 0.12, 0.132);
  part('chest', box(0.02, 0.18, 0.02), old, 0, 0.18, 0.15, { rz: 0.25 });
  part('chest', box(0.1, 0.14, 0.08), green, 0.02, 0.02, 0.18, { glow: 3 });
  // tatters hanging from the hem of the robe, a cowl of bone over the shoulders
  for (let i = 0; i < 7; i++) part('hips', box(0.07, 0.18 + (i % 3) * 0.08, 0.03), rag, -0.18 + i * 0.06, -0.6 - (i % 3) * 0.04, 0.13);
  for (const side of ['L', 'R']) part('sh' + side, box(0.18, 0.1, 0.18), bone, 0, 0.05, 0);
  // an abbot's mitre of yellowed bone over the hood, a green cross burning on it; green runes on the hem
  part('head', box(0.2, 0.22, 0.14), old, 0, 0.42, -0.02);
  part('head', box(0.14, 0.1, 0.1), old, 0, 0.57, -0.02);
  part('head', box(0.03, 0.14, 0.02), green, 0, 0.45, 0.055, { glow: 2.4 });
  part('head', box(0.1, 0.03, 0.02), green, 0, 0.47, 0.055, { glow: 2.4 });
  for (let i = 0; i < 5; i++) part('hips', box(0.05, 0.05, 0.02), green, -0.16 + i * 0.08, -0.46, 0.15, { glow: 2 });
  // the staff's head: a skull with a crescent of bone round the green flame
  rig.weapon.add(part('haR', box(0.15, 0.15, 0.15), bone, 0, -0.05, 1.38));
  for (const sx of [-1, 1]) { rig.weapon.add(part('haR', box(0.04, 0.04, 0.26), old, sx * 0.12, -0.05, 1.22, { ry: sx * 0.5 })); rig.weapon.add(part('haR', box(0.03, 0.03, 0.02), green, sx * 0.04, -0.03, 1.46, { glow: 3 })); }
  // three skulls circling him at prayer height, eyes lit green
  const ring = group(rig, rig.body, 0, 1.15, 0); const sk = [];
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU; const g = group(rig, ring, S(a) * 0.62, 0, C(a) * 0.62); sk.push(g);
    g.add(part('hips', box(0.13, 0.12, 0.13), bone, 0, 0, 0));
    for (const sx of [-1, 1]) g.add(part('hips', box(0.03, 0.03, 0.02), green, sx * 0.03, 0.01, 0.066, { glow: 3 }));
  }
  onFrame(rig, (t) => { ring.rotation.y = t * 1.1; sk.forEach((g, i) => { g.position.y = S(t * 2 + i * 2) * 0.08; g.rotation.y = -t * 1.1 + Math.PI / 2; }); });
}

// PROPOSAL: the Hollow Archon, the gnostic ruler of the false world: a robed figure with a golden mask and a
// third eye, six wings set with eyes, a burning halo and two rings of sigils turning about it.
function archonExtra(rig, part, box) {
  const gold = 0xe8c060, fire = 0xffa030, white = 0xf0e8d8, crimson = 0x8a1a2a, eye = 0xff2a18;
  // the third eye and a sunburst of gold behind the mask
  part('head', box(0.05, 0.07, 0.03), eye, 0, 0.2, 0.17, { glow: 3 });
  // a burning halo behind the head (outer fire, inner gold) that turns
  const halo = group(rig, rig.j.head, 0, 0.24, -0.2); const inner = group(rig, rig.j.head, 0, 0.24, -0.22);
  for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; halo.add(part('head', box(0.13, 0.045, 0.03), fire, S(a) * 0.4, C(a) * 0.4, 0, { glow: 3, rz: -a })); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; inner.add(part('head', box(0.08, 0.025, 0.02), gold, S(a) * 0.3, C(a) * 0.3, 0, { glow: 2, rz: -a })); }
  // six wings in three pairs, dark crimson edged in gold, each with eyes
  const wings = [];
  for (const [y, rz] of [[0.34, 0.75], [0.22, 0.1], [0.08, -0.55]]) for (const sx of [-1, 1]) {
    const g = group(rig, rig.j.chest, sx * 0.1, y, -0.17); g.rotation.set(0, sx * 0.5, sx * rz); wings.push({ g, sx, rz });
    const L = 0.85 - Math.abs(rz) * 0.2;
    g.add(part('chest', box(L, 0.16, 0.03), crimson, sx * L / 2, 0, 0));
    g.add(part('chest', box(L, 0.035, 0.035), gold, sx * L / 2, 0.08, 0, { glow: 1.3 }));
    for (let k = 0; k < 2; k++) { const x = sx * L * (0.4 + k * 0.32); g.add(part('chest', box(0.08, 0.07, 0.04), white, x, -0.01, 0.005)); g.add(part('chest', box(0.035, 0.035, 0.05), eye, x, -0.01, 0.01, { glow: 3 })); }
  }
  // two rings of sigils round the body at different tilts, turning opposite ways
  const rings = [];
  for (const [R, tilt, col, n] of [[0.78, 0.38, gold, 16], [1.02, -0.3, eye, 20]]) {
    const g = group(rig, rig.body, 0, 0.95, 0); g.rotation.x = tilt; const sp = group(rig, g); rings.push(sp);
    for (let i = 0; i < n; i++) { const a = i / n * TAU; sp.add(part('hips', col === gold ? box(0.16, 0.025, 0.03) : box(0.06, 0.04, 0.04), col, S(a) * R, 0, C(a) * R, { glow: col === gold ? 2.4 : 2, ry: a })); }
  }
  // the sceptre: an eye in a star of gold
  rig.weapon.add(part('haR', box(0.34, 0.03, 0.03), gold, 0, -0.05, 1.28));
  rig.weapon.add(part('haR', box(0.03, 0.34, 0.03), gold, 0, -0.05, 1.28));
  rig.weapon.add(part('haR', box(0.06, 0.06, 0.04), eye, 0, -0.05, 1.3, { glow: 3 }));
  // gold trim at the hem and the shoulders
  part('hips', box(0.42, 0.04, 0.3), gold, 0, -0.52, 0);
  for (const side of ['L', 'R']) part('sh' + side, box(0.2, 0.05, 0.2), gold, 0, 0.07, 0);
  onFrame(rig, (t) => {
    halo.rotation.z = t * 0.7; inner.rotation.z = -t * 1.2;
    rings[0].rotation.y = t * 0.9; rings[1].rotation.y = -t * 0.6;
    for (const wg of wings) wg.g.rotation.z = wg.sx * (wg.rz + S(t * 1.6) * 0.12);
  });
}

// ------------------------------------------------------------------ stats (names and titles: PROPOSAL)
export const BOSSES3 = {
  frostgiant: {
    name: 'The Hoarfrost King', title: 'Whose Breath Stilled the Pass', hp: 7400, poise: 999, speed: 2.3, r: 1.0, mass: 11, scale: 2.15, boss: true,
    look: { weapon: 'none', eyes: 0x9ff6ff, bulk: 1.7, headSize: 0.3, longHair: true, cloak: true, cloakLen: [0.4, 0.4, 0.36], colors: { skin: 0x9ab8cc, hair: 0xeef4f8, tunic: 0x8a9cb0, pants: 0x5a6a7c, boots: 0x46525e, glove: 0x9cc8e0, shoulder: 0xbfe8ff, belt: 0x3a2e24, cloak: 0xdfe6ea, cloakDark: 0xaab4bc }, extra: frostExtra },
  },
  sandwyrm: {
    name: 'Ashmaw', title: 'The Wyrm Beneath the Dunes', hp: 7900, poise: 999, speed: 3.0, r: 0.95, mass: 10, scale: 1.9, boss: true,
    look: { weapon: 'none', eyes: 0xffc020, claws: 0xf0e0c0, noHair: true, bulk: 1.35, colors: { skin: 0xc49456, tunic: 0xa87838, pants: 0x8a6030, boots: 0x8a6030, glove: 0xb88a4e, shoulder: 0x9a6a30, belt: 0x8a6030 }, extra: wyrmExtra },
  },
  lich: {
    name: 'Abbot Morrow', title: 'Who Keeps the Dead at Prayer', hp: 8400, poise: 999, speed: 3.1, r: 0.7, mass: 7, scale: 1.8, boss: true, hover: true,
    look: { weapon: 'staff', orb: 0x9aff70, hood: true, eyes: 0x9aff50, skirt: 0x463a50, cloak: true, cloakLen: [0.42, 0.44, 0.42], cloakGlow: 0x0a1608, claws: 0xe4dcc4, colors: { skin: 0xd8d0bc, tunic: 0x4e405e, pants: 0x3a3046, boots: 0x16121a, hood: 0x4a3e58, glove: 0xd8d0bc, shoulder: 0x3a2e44, belt: 0x6a5a3a, cloak: 0x3e3250, cloakDark: 0x2c2438 }, extra: lichExtra },
  },
  archon: {
    name: 'The Hollow Archon', title: 'Who Tolled the False World into Being', hp: 9000, poise: 999, speed: 2.7, r: 0.9, mass: 9, scale: 2.05, boss: true, hover: true,
    look: { weapon: 'staff', orb: 0xfff0b0, eyes: 0xfff6c0, mask: 0xe8c870, crown: 0xf0d070, crownGlow: true, skirt: 0xe8e0d0, cloak: true, cloakLen: [0.44, 0.46, 0.44], cloakGlow: 0x1a0804, bulk: 1.15, colors: { skin: 0x1a1018, tunic: 0xe8dcc0, pants: 0xc8bca0, boots: 0x2a1a20, glove: 0x2a1a20, shoulder: 0xd8b050, belt: 0xd8b050, trim: 0xd8b050, cloak: 0x7a1020, cloakDark: 0x4a0812 }, extra: archonExtra },
  },
};

// ------------------------------------------------------------------ the Hoarfrost King (Frostmarch)
// PROPOSAL: a giant with a glacier for a club. Wide sweeps; an overhead smash that sends glacier spikes on
// toward you; a stomp that freezes the floor in a rolling ring; frost breath down three lanes (it chills);
// icicles falling round you; a block of ice torn up and thrown; a shoulder charge. Below two thirds: rime
// armour and frost wolves. Below a third: faster, a yeti, and the blizzard (he plants the club and calls
// down icicles for a few seconds: hit him while dodging).
const WOLF = ['frostwolf', 'hound'], WRAITH = ['icewraith', 'shade'], YETI = ['yeti', 'brute'];
function throwIce(w, e, p, K) {
  const t = ahead(w, 1.1);
  lob(w, e, t.x, t.z, { kind: PROJ.ice, arc: 1.1, splash: 2.3, dmg: 24 * K, hazard: KIND.ice, kb: 9, size: 0.6 });
  // it bursts and the shards skitter outward
  wave(w, e, t.x, t.z, p >= 2 ? 7 : 5.5, { r0: 2.3, warn: 1.1, life: 0.8, dmg: 12 * K, kind: KIND.frost, status: { frost: 1 } });
  w.emit('fire', { e, kind: 'ice' });
}
function breath(w, e, p, K) {
  const a0 = angTo(e, w.hero); const offs = p >= 3 ? [-0.5, -0.25, 0, 0.25, 0.5] : [-0.32, 0, 0.32];
  for (const o of offs) lane(w, e, e.x + S(a0 + o) * e.r, e.z + C(a0 + o) * e.r, a0 + o, { len: 9.5, width: 1.15, warn: 0.65 + Math.abs(o) * 0.5, life: 0.45, dmg: 15 * K, kind: KIND.frost, status: { frost: 1 } });
}
const frostgiant = {
  phases: [0.66, 0.33], keep: 3.0, turn: 3.0,
  moves(p) {
    const K = POWER.frostgiant; const q = p >= 3 ? 0.88 : 1;
    const m = [
      { id: 'sweep', w: 3, max: 4.6, a: quick(strike({ name: 'sweep', anim: 'sweep', range: 4.7, arc: deg(230), windup: 0.95, active: 1.12, dur: 1.85, dmg: 21 * K, kb: 9, lunge: 1.0 }), q) },
      // overhead smash: a circle, then glacier spikes run on from it toward you (two rows from phase two)
      { id: 'smash', w: 2, max: 4.8, a: quick(strike({ name: 'smash', anim: 'slam', shape: 'circle', offset: 2.0, radius: 2.4, windup: 1.0, active: 1.06, dur: 1.9, dmg: 25 * K, kb: 9, lunge: 0.6, tele: 'circle', onStrike: (w, e) => {
        const x = e.x + S(e.face) * 2, z = e.z + C(e.face) * 2; const a0 = angTo({ x, z }, w.hero);
        for (const o of p >= 2 ? [-0.3, 0.3] : [0]) row(w, e, x, z, a0 + o, { start: 2.2, n: 7, step: 1.2, warn: 0.35, gap: 0.08, r: 0.85, dmg: 16 * K, kind: KIND.frost });
      } }), q) },
      // stomp: the floor freezes in a ring that rolls out from him and chills whoever it catches
      { id: 'stomp', w: 1.6, max: 3.8, cd: 5, a: quick({ name: 'stomp', anim: 'slam', shape: 'circle', offset: 0, radius: 3.0, windup: 0.85, active: 0.9, dur: 1.6, dmg: 19 * K, kb: 8, tele: 'circle', heavy: true, onStrike: (w, e) => { wave(w, e, e.x, e.z, 9, { r0: 3.0, warn: 0.1, life: 1.2, dmg: 12 * K, kind: KIND.frost, status: { frost: 1 } }); } }, q) },
      // frost breath: lanes in a cone (the lanes are the warning); caught, you are chilled
      { id: 'breath', w: 1.7, max: 11, cd: 5, a: { name: 'breath', anim: 'roar', dur: 1.7, windup: 0.45, active: 0.47, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => breath(w, e, p, K) } },
      // icicles fall round you, the first right where you stand
      { id: 'icicles', w: 1.6, cd: 5, a: { name: 'icicles', anim: 'cast', dur: 1.4, windup: 0.55, active: 0.57, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => around(w, e, p >= 2 ? 6 : 4, { warn: 0.85, gap: 0.16, r: 1.2, dmg: 16 * K, kind: KIND.frost }) } },
      { id: 'boulder', w: 1.5, min: 5, cd: 6, a: { name: 'boulder', anim: 'slam', dur: 1.6, windup: 0.8, active: 0.85, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => throwIce(w, e, p, K) } },
      { id: 'charge', w: 1.3, min: 5, max: 13, cd: 7, a: strike({ name: 'charge', anim: 'charge', shape: 'line', range: 2.4, width: 2.0, windup: 0.9, active: 1.5, dur: 2.0, dmg: 25 * K, kb: 10, lunge: 12, lungeT: [0.9, 1.45], tele: 'line', teleRange: 9, turn: 2.4 }) },
    ];
    if (p >= 2) {
      m.push({ id: 'rime', w: 1, cd: 18, run: (w, e) => { ward(w, e, 0.06); roarPause(e); } });
      m.push({ id: 'pack', w: 0.9, cd: 20, run: (w, e) => { if (!call(w, e, WOLF, 2, ADD_TIER.frostgiant, 5)) call(w, e, WRAITH, 1, ADD_TIER.frostgiant, 6, 1); roarPause(e); } });
    }
    if (p >= 3) m.push({ id: 'blizzard', w: 1.4, cd: 10, run: (w, e) => startRite(e, 'blizzard') });
    return m;
  },
  // the blizzard: icicles every quarter second round you for three seconds, a frost ring halfway through
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.frostgiant; hold(w, e, 'roar');
    if (t === 0) w.emit('storm', { e });
    while (c.next <= t && c.next < 3.2) {
      const h = w.hero; const first = c.next === 0; const a = w.rand() * TAU, r = first ? 0 : 1.2 + w.rand() * 3.2;
      const x = h.x + S(a) * r, z = h.z + C(a) * r; if (free(w, x, z, 0)) spot(w, e, x, z, 1.1, { warn: 0.8, life: 0.3, dmg: 15 * K, kind: KIND.frost });
      if (Math.abs(c.next - 1.5) < 0.01) wave(w, e, e.x, e.z, 10, { r0: 1.2, warn: 0.3, life: 1.4, dmg: 12 * K, kind: KIND.frost, status: { frost: 1 } });
      c.next = Math.round((c.next + 0.25) * 100) / 100;
    }
    return t < 3.6;
  },
  onPhase(w, e, p) {
    if (p === 2) { ward(w, e, 0.08); call(w, e, WOLF, 2, ADD_TIER.frostgiant, 5); }
    if (p === 3) { e.speed *= 1.15; call(w, e, YETI, 1, YETI.find(known) === 'brute' ? 3 : ADD_TIER.frostgiant, 5, 1); }
  },
};

// ------------------------------------------------------------------ Ashmaw (the Ashdunes)
// PROPOSAL: a wyrm that rises from the sand to the waist. Claw combos; a tail lash all round; a cobra lunge
// down a lane; venom spat in globs that leave pools; sand spikes erupting in rows toward you; a sinkhole that
// collapses inward; and it burrows: a mound runs at you under the sand, it marks where it will come up, and
// erupts there. Below two thirds: scorpions and a sandworm, and it burrows more. Below a third: mummies and
// the sandstorm.
const SCORP = ['scorpion', 'rat'], WORM = ['sandworm', 'spitter'], MUMMY = ['mummy', 'hushed'];
function sinkhole(w, e, K) {
  const c = inside(w, w.hero.x, w.hero.z, 1.5);
  for (const [R, n, warn, off] of [[3.5, 10, 1.0, 0], [1.95, 6, 1.35, 0.5]]) for (let i = 0; i < n; i++) {
    const a = (i + off) / n * TAU; const x = c.x + S(a) * R, z = c.z + C(a) * R;
    if (free(w, x, z, 0)) spot(w, e, x, z, 0.85, { warn, life: 0.3, dmg: 15 * K, kind: KIND.sand, kb: 4 });
  }
  spot(w, e, c.x, c.z, 1.4, { warn: 1.7, life: 0.3, dmg: 22 * K, kind: KIND.sand, kb: 8 });
}
function venom(w, e, p, K) {
  const t = ahead(w, 0.9); const a = angTo(e, t); const n = p >= 2 ? 5 : 3;
  for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 1.9; const q = inside(w, t.x + C(a) * o, t.z - S(a) * o, 1.0); lob(w, e, q.x, q.z, { kind: PROJ.venom, arc: 0.85 + i * 0.06, splash: 1.3, pool: 3.2, dmg: 11 * K, hazard: KIND.rot, kb: 3, status: { poison: 1 } }); }
  w.emit('fire', { e, kind: 'spit' });
}
function burrow(w, e) {
  const K = POWER.sandwyrm;
  spot(w, e, e.x, e.z, 2.0, { warn: 0.05, life: 0.3, dmg: 14 * K, kind: KIND.sand, kb: 7 });
  e.hidden = true; e.iframes = 99; e.r = 0.2; e.vx = 0; e.vz = 0; e.tele = null; e.mx = 0; e.mz = 0;
  e.ai.dig = { t: 0, trail: 0.15, lock: null }; w.emit('vanish', { e }); w.emit('shake', { amt: 0.4 });
}
const sandwyrm = {
  phases: [0.66, 0.33], keep: 2.8, turn: 3.6,
  moves(p) {
    const K = POWER.sandwyrm; const q = p >= 3 ? 0.88 : 1;
    const base = strike({ name: 'rake', anim: 'fslash', range: 3.4, arc: deg(150), windup: 0.62, active: 0.74, dur: p >= 3 ? 2.5 : 1.95, dmg: 18 * K, lunge: 3.5, chain: { at: 0.95, windup: 1.32, active: 1.44, lunge: 4 } });
    const m = [
      { id: 'rake', w: 3, max: 3.4, a: p >= 3 ? combo(base, [{ at: 0.95, windup: 1.32, active: 1.44, lunge: 4 }, { at: 1.7, windup: 2.06, active: 2.18, lunge: 5 }]) : base },
      // the tail lashed all the way round
      { id: 'lash', w: 2, max: 4.2, cd: 3.5, a: quick(strike({ name: 'lash', anim: 'spin', shape: 'circle', offset: 0, radius: 4.3, windup: 0.9, active: 1.2, dur: 1.8, dmg: 19 * K, kb: 9, lunge: 0, tele: 'circle' }), q) },
      // the cobra lunge: a long lane; it stops when it reaches you
      { id: 'fang', w: 2, min: 3, max: 10, cd: 3.5, a: quick({ name: 'fang', anim: 'fthrust', shape: 'line', range: 2.3, width: 1.5, windup: 0.78, active: 1.12, dur: 1.65, dmg: 23 * K, kb: 7, lunge: 15, lungeT: [0.78, 1.08], tele: 'line', teleRange: 8, turn: 5, heavy: true }, q) },
      { id: 'venom', w: 1.6, min: 3.5, cd: 4.5, a: { name: 'venom', anim: 'cast', dur: 1.3, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, onStrike: (w, e) => venom(w, e, p, K) } },
      // the sand breaks in rows from it toward you (three rows from phase two)
      { id: 'surface', w: 1.8, cd: 4, a: { name: 'surface', anim: 'slam', dur: 1.5, windup: 0.75, active: 0.8, shape: 'circle', radius: 1.2, offset: 1.4, dmg: 14 * K, kb: 5, tele: 'circle', heavy: true, onStrike: (w, e) => {
        const a0 = angTo(e, w.hero); for (const o of p >= 2 ? [-0.36, 0, 0.36] : [0]) row(w, e, e.x, e.z, a0 + o, { start: 1.8, n: 10, step: 1.25, warn: 0.45, gap: 0.075, r: 0.95, dmg: 17 * K, kind: KIND.sand });
      } } },
      { id: 'sinkhole', w: 1.3, cd: 7, a: { name: 'sinkhole', anim: 'roar', dur: 1.5, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => sinkhole(w, e, K) } },
      { id: 'burrow', w: p >= 2 ? 1.8 : 1.2, cd: p >= 3 ? 6 : (p >= 2 ? 7.5 : 10), run: (w, e) => burrow(w, e) },
    ];
    if (p >= 2) m.push({ id: 'nest', w: 0.9, cd: 20, run: (w, e) => { if (!call(w, e, SCORP, 2, ADD_TIER.sandwyrm, 4.5)) call(w, e, WORM, 1, ADD_TIER.sandwyrm, 6, 1); roarPause(e); } });
    if (p >= 3) m.push({ id: 'storm', w: 1.3, cd: 11, run: (w, e) => startRite(e, 'storm') });
    return m;
  },
  // under the sand: a mound runs at you (its trail bursts behind it), then it marks where it will come up
  hiddenThink(w, e, h) {
    const d = e.ai.dig; const hero = w.hero; const K = POWER.sandwyrm; e.anim = 'idle'; e.mx = 0; e.mz = 0;
    if (!d) { e.hidden = false; e.iframes = 0; e.r = e.def.r; return; }
    d.t += h;
    if (!d.lock) {
      const dd = dist(e, hero);
      if (dd > 1.9) { const a = steer(w, e, angTo(e, hero)); const sp = (e.phase >= 3 ? 7.5 : 6.5) * h; const nx = e.x + S(a) * sp, nz = e.z + C(a) * sp; if (free(w, nx, nz, 0.4)) { e.x = nx; e.z = nz; } }
      d.trail -= h; if (d.trail <= 0) { d.trail = 0.2; spot(w, e, e.x, e.z, 0.8, { warn: 0.4, life: 0.25, dmg: 10 * K, kind: KIND.sand, kb: 4 }); }
      if (d.t > (e.phase >= 3 ? 1.5 : 2.0) || dd < 2.0) { const c = inside(w, hero.x, hero.z, 1.4); d.lock = { x: c.x, z: c.z, t: d.t }; spot(w, e, c.x, c.z, 2.6, { warn: 0.95, life: 0.3, dmg: 26 * K, kind: KIND.sand, kb: 10 }); }
      return;
    }
    if (d.t - d.lock.t < 0.95) return;
    // it erupts where it marked (or where it is, if something stands there), and is open for a moment
    if (free(w, d.lock.x, d.lock.z, e.def.r * 0.8)) { e.x = d.lock.x; e.z = d.lock.z; }
    e.hidden = false; e.iframes = 0; e.r = e.def.r; e.face = angTo(e, hero); e.ai.dig = null;
    w.emit('appear', { e }); w.emit('shake', { amt: 0.7 });
    if (e.phase >= 2) wave(w, e, e.x, e.z, 8, { r0: 2.6, warn: 0.05, life: 1.0, dmg: 12 * K, kind: KIND.sand });
    e.state = 'roar'; e.t = 0.4; e.anim = 'roar'; e.animT = 0; e.ai.cd = 0.6;
  },
  // the sandstorm: spouts round you every fifth of a second, a ring of sand from it every 1.2 s
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.sandwyrm; hold(w, e, 'roar');
    if (t === 0) w.emit('shake', { amt: 0.6 });
    while (c.next <= t && c.next < 3.4) {
      const h = w.hero; const first = Math.abs(c.next % 1) < 0.01; const a = w.rand() * TAU, r = first ? 0 : 1.0 + w.rand() * 3.6;
      const x = h.x + S(a) * r, z = h.z + C(a) * r; if (free(w, x, z, 0)) spot(w, e, x, z, 1.0, { warn: 0.75, life: 0.3, dmg: 14 * K, kind: KIND.sand });
      if (Math.abs((c.next / 1.2) - Math.round(c.next / 1.2)) < 0.01) wave(w, e, e.x, e.z, 9, { r0: 1.0, warn: 0.35, life: 1.3, dmg: 12 * K, kind: KIND.sand });
      c.next = Math.round((c.next + 0.2) * 100) / 100;
    }
    return t < 3.8;
  },
  onPhase(w, e, p) {
    if (p === 2) { e.speed *= 1.1; call(w, e, SCORP, 2, ADD_TIER.sandwyrm, 4.5); }
    if (p === 3) { e.speed *= 1.1; call(w, e, MUMMY, 2, MUMMY.find(known) === 'hushed' ? 6 : ADD_TIER.sandwyrm, 5); }
  },
};

// ------------------------------------------------------------------ Abbot Morrow (the Catacombs)
// PROPOSAL: a lich who floats at a distance. Fans of homing souls; rows of bone spikes; hands from the graves
// round you; a rot that lingers on the floor; a scythe-sweep and a death nova when you close in, and he blinks
// away (leaving rot where he stood). Below two thirds: the phylactery wards him and he raises the dead
// (bonecasters, crypt spiders). Below a third: the requiem, three arms of bone spikes spiralling out from him.
const CASTER = ['bonecaster', 'acolyte'], SPIDER = ['cryptspider', 'rat'], SLIME = ['slime', 'spitter'];
const lich = {
  phases: [0.66, 0.33], keep: 6, turn: 5,
  moves(p) {
    const K = POWER.lich; const k = p >= 3 ? 0.85 : 1;
    const m = [
      { id: 'souls', w: 3, min: 2.5, cd: 1.6, a: quick({ name: 'souls', anim: 'cast', dur: 1.3, windup: 0.65, active: 0.67, tele: 'none', ranged: { kind: PROJ.soul, speed: 6.4, r: 0.3, dmg: 13 * K, life: 3.4, fan: 1 + p * 2, spread: deg(16), homing: 0.9, reflect: true } }, k) },
      { id: 'spikes', w: 2.2, min: 3, cd: 3.6, a: quick({ name: 'spikes', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'circle', shape: 'circle', radius: 1.1, offset: 0, dmg: 0, heavy: true, onStrike: (w, e) => {
        const a0 = angTo(e, w.hero); for (const o of p >= 3 ? [-0.5, 0, 0.5] : (p >= 2 ? [-0.22, 0.22] : [0])) row(w, e, e.x, e.z, a0 + o, { start: 1.4, n: 11, step: 1.2, warn: 0.5, gap: 0.07, r: 0.85, dmg: 17 * K, kind: KIND.bone });
      } }, k) },
      { id: 'graves', w: 1.8, min: 2, cd: 4.5, a: { name: 'graves', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => around(w, e, p >= 2 ? 6 : 4, { warn: 0.85, gap: 0.15, r: 1.15, dmg: 16 * K, kind: KIND.rot, near: 1.4, spread: 2.4 }) } },
      // the floor rots under you and stays rotten for a while
      { id: 'wither', w: 1.2, min: 3, cd: 8, a: { name: 'wither', anim: 'cast', dur: 1.3, windup: 0.55, active: 0.57, tele: 'none', dmg: 0, onStrike: (w, e) => { const t = ahead(w, 0.8); spot(w, e, t.x, t.z, 1.9, { warn: 1.0, life: 4.5, dmg: 10 * K, kind: KIND.rot, kb: 3, status: { poison: 1 } }); } } },
      { id: 'scythe', w: 2.6, max: 3.4, a: quick(strike({ name: 'scythe', anim: 'sweep', range: 3.4, arc: deg(220), windup: 0.7, active: 0.84, dur: 1.4, dmg: 19 * K, lunge: 1.2 }), k) },
      // the death nova round him; then he tends to blink away
      { id: 'nova', w: 2, max: 3.2, cd: 5, a: { name: 'nova', anim: 'roar', dur: 1.5, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', radius: 3.2, offset: 0, dmg: 20 * K, kb: 10, heavy: true, onStrike: (w, e) => { wave(w, e, e.x, e.z, 8, { r0: 3.2, warn: 0.1, life: 1.0, dmg: 12 * K, kind: KIND.rot }); e.ai.cd_blink = 0; } } },
      { id: 'blink', w: 1.5, max: 4.5, cd: p >= 3 ? 3 : 4, run: (w, e) => { const x = e.x, z = e.z; blink(w, e, w.hero); if (e.x !== x || e.z !== z) spot(w, e, x, z, 1.8, { warn: 0.4, life: 3.5, dmg: 9 * K, kind: KIND.rot, kb: 3, status: { poison: 1 } }); e.ai.cd = 0.3; } },
    ];
    if (p >= 2) {
      m.push({ id: 'phylactery', w: 1, cd: 20, run: (w, e) => { ward(w, e, 0.07); roarPause(e); } });
      m.push({ id: 'raise', w: 1, cd: 18, run: (w, e) => { if (!call(w, e, CASTER, 1, ADD_TIER.lich, 5, 1)) if (!call(w, e, SPIDER, 2, ADD_TIER.lich, 4)) call(w, e, SLIME, 1, ADD_TIER.lich, 5, 1); roarPause(e); } });
    }
    if (p >= 3) m.push({ id: 'requiem', w: 1.4, cd: 10, run: (w, e) => startRite(e, 'requiem', { a0: w.rand() * TAU, dir: w.rand() < 0.5 ? 1 : -1 }) });
    return m;
  },
  // the requiem: three arms of bone spikes spiral out from him, turning, for three seconds
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.lich; hold(w, e, 'cast');
    while (c.next <= t && c.next < 3.0) {
      const u = c.next; const rho = 1.8 + ((u % 1.5) / 1.5) * 8;
      for (let k = 0; k < 3; k++) { const a = c.a0 + k * TAU / 3 + c.dir * u * 1.5; const x = e.x + S(a) * rho, z = e.z + C(a) * rho; if (free(w, x, z, 0)) spot(w, e, x, z, 0.75, { warn: 0.5, life: 0.2, dmg: 15 * K, kind: KIND.bone, kb: 4 }); }
      c.next = Math.round((c.next + 0.1) * 100) / 100;
    }
    return t < 3.5;
  },
  onPhase(w, e, p) {
    if (p === 2) { ward(w, e, 0.1); call(w, e, SPIDER, 2, ADD_TIER.lich, 4); }
    if (p === 3) { e.speed *= 1.2; e.ai.cd = 0.3; call(w, e, CASTER, 1, ADD_TIER.lich, 5, 1); }
  },
};

// ------------------------------------------------------------------ the Hollow Archon (the Abyss)
// PROPOSAL: the ruler of the false world, worked like a rite. Its gaze sweeps a fan of eye-beams across the
// floor; rings of sigils close round you; a pentagram is drawn round you in five burning lanes (stand in its
// heart, then leave before the heart burns); the burning halo comes down round it and rolls out in rings of
// fire; pillars of light fall on you; a backhand of the sceptre up close. Below two thirds: cultists come and
// channel into it (beams from each to the archon that feed it a shield: kill them), and the host (hellhounds,
// imps, a seraph). Below a third: the false sun, three beams wheeling round it while it hangs still.
const CULT = ['cultist', 'chanter'], HOUND = ['hellhound', 'hound'], IMP = ['imp', 'acolyte'], SERAPH = ['seraph', 'shade'], DEMON = ['demon', 'brute'];
function gaze(w, e, K, dir, n = 8, span = 1.7, t0 = 0.75) {
  const a0 = angTo(e, w.hero);
  for (let i = 0; i < n; i++) { const a = a0 + dir * (i / (n - 1) - 0.5) * span; lane(w, e, e.x + S(a) * 0.9, e.z + C(a) * 0.9, a, { len: 14, width: 1.0, warn: t0 + i * 0.11, life: 0.22, dmg: 17 * K, kind: KIND.beam, status: { burn: 1 } }); }
  w.emit('beam', { e });
}
function sigilRing(w, e, K, p) {
  const c = inside(w, w.hero.x, w.hero.z, 1.0); const n = 12, R = 3.6;
  for (let i = 0; i < n; i++) { const a = i / n * TAU; const x = c.x + S(a) * R, z = c.z + C(a) * R; if (free(w, x, z, 0)) spot(w, e, x, z, 0.75, { warn: 1.0, life: 0.3, dmg: 16 * K, kind: KIND.sigil, kb: 4 }); }
  spot(w, e, c.x, c.z, 2.6, { warn: 1.7, life: 0.3, dmg: 22 * K, kind: KIND.hell, kb: 8 });
  if (p >= 3) for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * TAU; const x = c.x + S(a) * 5.6, z = c.z + C(a) * 5.6; if (free(w, x, z, 0)) spot(w, e, x, z, 0.9, { warn: 1.7, life: 0.3, dmg: 16 * K, kind: KIND.sigil, kb: 4 }); }
}
// five lanes drawn star-wise round you; the pentagon in its heart is safe until the heart itself burns
function pentagram(w, e, K) {
  const R = 4.2; const c = inside(w, w.hero.x, w.hero.z, R + 0.8); const a0 = w.rand() * TAU;
  const P = []; for (let i = 0; i < 5; i++) { const a = a0 + i * TAU / 5; P.push({ x: c.x + S(a) * R, z: c.z + C(a) * R }); }
  for (let i = 0; i < 5; i++) { const A = P[i], B = P[(i + 2) % 5]; lane(w, e, A.x, A.z, angTo(A, B), { len: dist(A, B), through: true, width: 0.9, warn: 0.95 + i * 0.05, life: 0.4, dmg: 18 * K, kind: KIND.sigil, kb: 5 }); }
  spot(w, e, c.x, c.z, 1.6, { warn: 1.75, life: 0.3, dmg: 22 * K, kind: KIND.hell, kb: 8 });
}
// the cultists feed it: a beam from each to the archon (it burns whoever crosses it) and a shield
function feed(w, e, K) {
  const cult = w.foes().filter((f) => CULT.includes(f.type) && !f.hidden && f.state !== 'spawn'); if (!cult.length) return false;
  for (const f of cult) { const d = dist(f, e) - e.r - f.r; if (d > 0.8) lane(w, e, f.x, f.z, angTo(f, e), { len: d, through: true, width: 0.7, warn: 0.6, life: 1.6, dmg: 12 * K, kind: KIND.sigil, kb: 4 }); }
  ward(w, e, 0.035 * cult.length, 0.15); return true;
}
const archon = {
  phases: [0.66, 0.33], keep: 4.5, turn: 3.2,
  moves(p) {
    const K = POWER.archon; const k = p >= 3 ? 0.88 : 1;
    const m = [
      { id: 'gaze', w: 2.4, min: 2.5, cd: 3.2, a: { name: 'gaze', anim: 'aim', dur: 1.5, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { const dir = w.rand() < 0.5 ? 1 : -1; gaze(w, e, K, dir); if (p >= 2) gaze(w, e, K, -dir, 6, 1.4, 1.35); } } },
      { id: 'sigils', w: 1.8, min: 2, cd: 5, a: { name: 'sigils', anim: 'cast', dur: 1.3, windup: 0.55, active: 0.57, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => sigilRing(w, e, K, p) } },
      { id: 'pentagram', w: 1.5, min: 2, cd: 7, a: { name: 'pentagram', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => pentagram(w, e, K) } },
      // the halo comes down round it and rolls out in rings of fire
      { id: 'halo', w: 1.8, max: 6, cd: 5.5, a: quick({ name: 'halo', anim: 'roar', dur: 1.9, windup: 0.8, active: 0.82, tele: 'circle', shape: 'circle', radius: 2.8, offset: 0, dmg: 21 * K, kb: 10, heavy: true, onStrike: (w, e) => { for (let i = 0; i < (p >= 3 ? 3 : 2); i++) ringAt(w, e, e.x, e.z, 11, { r0: 2.8, warn: 0.2 + i * 0.7, life: 1.5, dmg: 13 * K, kind: KIND.hell }); } }, k) },
      { id: 'judgement', w: 1.5, min: 3, cd: 5, a: { name: 'judgement', anim: 'cast', dur: 1.4, windup: 0.6, active: 0.62, tele: 'none', dmg: 0, heavy: true, onStrike: (w, e) => { around(w, e, p >= 2 ? 7 : 5, { warn: 0.9, gap: 0.17, r: 1.2, dmg: 17 * K, kind: KIND.light }); w.emit('storm', { e }); } } },
      { id: 'brand', w: 2.4, max: 3.6, a: quick(strike({ name: 'brand', anim: 'sweep', range: 3.7, arc: deg(210), windup: 0.7, active: 0.84, dur: 1.4, dmg: 20 * K, kb: 8, lunge: 1.2 }), k) },
    ];
    if (p >= 2) {
      m.push({ id: 'rite', w: 1, cd: 24, run: (w, e) => { call(w, e, CULT, 2, ADD_TIER.archon, 6, 2, 4); roarPause(e); } });
      m.push({ id: 'feed', w: 1.6, cd: 6, run: (w, e) => { if (feed(w, e, K)) roarPause(e, 0.2); else w.foeAttack(e, { name: 'gaze', anim: 'aim', dur: 1.5, windup: 0.5, active: 0.52, tele: 'none', dmg: 0, heavy: true, onStrike: (w2, e2) => gaze(w2, e2, K, 1) }); } });
      m.push({ id: 'host', w: 0.9, cd: 22, run: (w, e) => { const pick = (e.ai.host = ((e.ai.host || 0) + 1) % 3); if (pick === 0) call(w, e, HOUND, 2, ADD_TIER.archon, 5, 2, 4); else if (pick === 1) call(w, e, IMP, 2, ADD_TIER.archon, 6, 2, 4); else call(w, e, SERAPH, 1, ADD_TIER.archon, 6, 1, 4); roarPause(e); } });
      m.push({ id: 'ascend', w: 0.8, max: 3, cd: 8, run: (w, e) => { blink(w, e, w.hero); spot(w, e, e.x, e.z, 2.2, { warn: 0.5, life: 0.3, dmg: 16 * K, kind: KIND.sigil, kb: 8 }); e.ai.cd = 0.4; } });
    }
    if (p >= 3) m.push({ id: 'sun', w: 1.3, cd: 12, run: (w, e) => startRite(e, 'sun', { a0: w.rand() * TAU, dir: w.rand() < 0.5 ? 1 : -1 }) });
    return m;
  },
  // the false sun: three beams wheel round it for four seconds (the red edge runs just ahead of the burn);
  // a ring of sigils under it first keeps the close ones off
  channel(w, e) {
    const c = e.ai.chan; const t = riteT(w, e); if (t < 0) return false; const K = POWER.archon; hold(w, e, 'cast');
    if (t === 0) { spot(w, e, e.x, e.z, 2.4, { warn: 0.7, life: 0.3, dmg: 18 * K, kind: KIND.sigil, kb: 10 }); w.emit('storm', { e }); }
    while (c.next <= t && c.next < 4.0) {
      const a = c.a0 + c.dir * c.next * 0.9;
      for (let k = 0; k < 3; k++) { const b = a + k * TAU / 3; lane(w, e, e.x + S(b) * 1.0, e.z + C(b) * 1.0, b, { len: 15, width: 0.9, warn: 0.5, life: 0.14, dmg: 13 * K, kind: KIND.beam, kb: 4, status: { burn: 1 } }); }
      c.next = Math.round((c.next + 0.1) * 100) / 100;
    }
    return t < 4.7;
  },
  onPhase(w, e, p) {
    if (p === 2) { ward(w, e, 0.06); call(w, e, CULT, 2, ADD_TIER.archon, 6, 2, 4); }
    if (p === 3) { e.speed *= 1.1; call(w, e, IMP, 2, ADD_TIER.archon, 6, 2, 4); startRite(e, 'sun', { a0: w.rand() * TAU, dir: 1 }); }
  },
};

export const BOSS_AI3 = { frostgiant, sandwyrm, lich, archon };

// the other half of the merge in bosses2.js (see there): when this module is evaluated second
try { Object.assign(BOSSES2, BOSSES3); Object.assign(BOSS_AI2, BOSS_AI3); } catch (err) { /* bosses2.js merges */ }
