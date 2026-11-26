// Acts IV and V's areas (docs/ASCENT_DESIGN.md §1, §2), laid out by one generator from a theme each: a chain of
// halls running away from the start, each bigger than the last, joined by narrow ways with a gate on each; side
// halls off the chain with fights of their own; a fight in every hall after the first (two waves from the act's
// foes, harder the deeper you go), echoes of old bosses in some halls, and at the end the exit or the act's boss.
// Act IV: THE GLASS ORCHARD, THE HALL OF ECHOES, THE BROKEN HALO (the Last Seraph). Act V: THE RIBCAGE
// CATHEDRAL, THE SEA OF UNBORN DAYS, THE WAKING CITY, THE CRADLE OF BRONZE (the First Founder). Each is 1.5–2
// times an Act III area; Act V's are the largest. (The Sunken Choir is hand-built: choir.js.)
//
// PROPOSAL: every name, line and text in this file.
import * as THREE from '../../../vendor/three.module.min.js';
import * as E from '../props/empyrean.js';
import * as CH from '../props/choir.js';
import * as D from '../props/dream.js';
import { add, box } from '../kit.js';
import { slab, span, voidFill, deepFloor, barrier4, motes, shaft, W4, glassM, goldM4, bronzeM } from '../kit4.js';

const TAU = Math.PI * 2;
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), a | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ the layout
// halls: [w, d] per main hall; the chain runs down -z from the start, each hall shifted a little left or right
function layout(T) {
  const R = rng(T.seed); const rooms = [], ways = [], sides = [];
  let z = 18;
  T.halls.forEach(([w, d], i) => {
    const off = i === 0 ? 0 : Math.round((R() - 0.5) * Math.max(0, w - 8) * 0.6);
    const r = [off - w / 2, z - d, off + w / 2, z]; rooms.push(r);
    z -= d;
    if (i < T.halls.length - 1) { ways.push([-1.8, z - 6, 1.8, z]); z -= 6; }
  });
  // side halls: off the east or west of the chosen main halls, reached by a short way
  for (const [hi, sx, sw, sd] of T.sides || []) {
    const m = rooms[hi]; const cz = (m[1] + m[3]) / 2;
    const x0 = sx > 0 ? m[2] + 5 : m[0] - 5 - sw; const r = [x0, cz - sd / 2, x0 + sw, cz + sd / 2];
    const way = sx > 0 ? [m[2], cz - 1.8, m[2] + 5, cz + 1.8] : [m[0] - 5, cz - 1.8, m[0], cz + 1.8];
    sides.push({ room: r, way, hi, sx });
  }
  const all = [...rooms, ...ways, ...sides.map((s) => s.room), ...sides.map((s) => s.way)];
  const b = [Math.min(...all.map((r) => r[0])) - 6, Math.min(...all.map((r) => r[1])) - 8, Math.max(...all.map((r) => r[2])) + 6, Math.max(...all.map((r) => r[3])) + 4];
  return { rooms, ways, sides, bounds: b, walks: all };
}

// foes scattered in a rect, kept off its edges
function scatter(R, r, n, pool, inset = 2.6) {
  const out = []; const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
  for (let i = 0; i < n; i++) {
    let x, z, k = 0; do { x = r[0] + inset + R() * (r[2] - r[0] - inset * 2); z = r[1] + inset + R() * (r[3] - r[1] - inset * 2); } while (Math.hypot(x - cx, z - cz) < 2.4 && ++k < 12); // the hall's centrepiece stands in the middle
    out.push({ t: pool[Math.floor(R() * pool.length)], x: +x.toFixed(1), z: +z.toFixed(1) });
  }
  return out;
}

// ------------------------------------------------------------------ the level def
export function makeLevel(T) {
  const L = layout(T); const R = rng(T.seed + 7); const last = L.rooms.length - 1;
  const gate = (i) => 'g' + i, sgate = (i) => 's' + i;
  const encounters = []; const minibosses = [];
  L.rooms.forEach((r, i) => {
    if (i === 0 || (T.boss && i === last)) return;
    const n = Math.round(3 + i * 0.5 + (T.act - 4) * 1.2);
    encounters.push({ id: 'hall' + i, zone: r, gates: [gate(i - 1)], opens: [gate(i - 1), ...(i < last ? [gate(i)] : ['exitGate'])], msg: T.msgs[i % T.msgs.length], done: 'THE WAY ON OPENS',
      waves: [{ pre: true, foes: scatter(R, r, n, T.foes) }, { foes: scatter(R, r, n + 1, T.foes) }] });
    if (T.echoes && T.echoes.includes(i)) minibosses.push({ from: T.act === 4 ? 'act1' : (i % 2 ? 'act2' : 'act3'), x: +((r[0] + r[2]) / 2).toFixed(1), z: +((r[1] + r[3]) / 2).toFixed(1) });
  });
  L.sides.forEach((s, k) => encounters.push({ id: 'side' + k, zone: s.room, gates: [sgate(k)], opens: [sgate(k)], msg: 'SOMETHING STIRS OFF THE PATH', done: 'IT IS QUIET AGAIN',
    waves: [{ pre: true, foes: scatter(R, s.room, 3 + (T.act - 4), T.foes) }, { foes: scatter(R, s.room, 4 + (T.act - 4), T.foes) }] }));
  const first = L.rooms[0], end = L.rooms[last];
  const ex = (end[0] + end[2]) / 2;
  const def = {
    id: T.id, name: T.name, tagline: T.tagline, tier: T.tier, act: T.act,
    start: { x: (first[0] + first[2]) / 2, z: first[3] - 2.5, face: Math.PI },
    bounds: L.bounds, apron: false,
    gatesOpen: [gate(0), ...L.sides.map((_, k) => sgate(k)), ...(T.boss ? [gate(last - 1)] : [])],
    ambience: T.ambience,
    lamps: [{ id: 'l0', x: first[0] + 1.6, z: first[3] - 4, sx: 1.3, sz: 0.3 }, ...L.sides.slice(0, 1).map((s) => ({ id: 'ls', x: (s.room[0] + s.room[2]) / 2, z: s.room[1] + 1.4, sx: 0, sz: 1.3 }))],
    items: L.sides.map((s, k) => ({ id: 'i' + k, x: +((s.room[0] + s.room[2]) / 2).toFixed(1), z: +((s.room[1] + s.room[3]) / 2).toFixed(1), ry: 0, kind: k % 2 ? 'tonic' : 'embers', amount: 400 + 120 * (T.act - 4) })),
    hints: T.hints.map((text, k) => ({ zone: k === 0 ? [first[0], first[3] - 6, first[2], first[3]] : L.ways[Math.min(L.ways.length - 1, k * 2 - 1)], text })),
    foes: scatter(R, first, 2, T.foes.slice(0, 2)),
    encounters,
    minibosses,
    exit: { zone: [ex - 1.6, end[1] + 0.4, ex + 1.6, end[1] + 2], to: T.next || 'end', requires: T.boss ? 'boss' : undefined },
    build(K, ctx) { buildIt(K, ctx, T, L); },
  };
  if (!T.boss) delete def.exit.requires;
  if (T.boss) { const cz = (end[1] + end[3]) / 2; def.boss = { type: T.boss, x: ex, z: cz - 2, face: 0, zone: [end[0] + 0.4, end[1] + 2.4, end[2] - 0.4, end[3] - 0.4], gates: [gate(last - 1)], opens: ['exitGate', gate(last - 1)] }; }
  return def;
}

// ------------------------------------------------------------------ building it
function buildIt(K, ctx, T, L) {
  const R = rng(T.seed + 13);
  deepFloor(ctx, L.bounds, T.deep, { y: -16 });
  const floorM = T.floor(), wayM = T.way();
  for (const r of [...L.rooms, ...L.sides.map((s) => s.room)]) slab(ctx, ...r, floorM, T.deep, { kerb: T.kerb ? T.kerb() : undefined });
  for (const r of [...L.ways, ...L.sides.map((s) => s.way)]) span(ctx, ...r, wayM, T.deep);
  voidFill(ctx, L.bounds, L.walks);
  // gates: one on each way of the chain, one on each side way, the exit's at the far end
  const bar = (x, z, w, axis, o) => (T.act === 5 ? D.barrier5(ctx, x, z, w, axis, T.barrier || 'ribs', o) : barrier4(ctx, x, z, w, axis, T.barrier || 'glass', o));
  L.ways.forEach((w, i) => { ctx.marks['g' + i] = bar(0, (w[1] + w[3]) / 2, 4, 'x', i === 0 || (T.boss && i === L.ways.length - 1) ? { open: true } : {}); });
  L.sides.forEach((s, k) => { ctx.marks['s' + k] = bar((s.way[0] + s.way[2]) / 2, (s.way[1] + s.way[3]) / 2, 4, 'z', { open: true }); });
  const end = L.rooms[L.rooms.length - 1]; const ex = (end[0] + end[2]) / 2;
  ctx.marks.exitGate = bar(ex, end[1] + 2.6, 3.8, 'x', {});
  // the halls' dressing: the theme's props round the edges, its centrepiece in the middle
  for (const r of [...L.rooms, ...L.sides.map((s) => s.room)]) {
    const [x0, z0, x1, z1] = r; const per = Math.round(((x1 - x0) + (z1 - z0)) / 5);
    for (let i = 0; i < per; i++) {
      const side = Math.floor(R() * 4); const u = R();
      const x = side === 0 ? x0 + 0.9 : side === 1 ? x1 - 0.9 : x0 + 1.5 + u * (x1 - x0 - 3);
      const z = side === 2 ? z0 + 0.9 : side === 3 ? z1 - 0.9 : z0 + 1.5 + u * (z1 - z0 - 3);
      if (Math.abs(x) < 2.6 && (side >= 2)) continue; // keep the ways clear
      T.edge(ctx, x, z, R);
    }
    T.centre(ctx, (x0 + x1) / 2, (z0 + z1) / 2, R, r);
  }
  T.sky(ctx, L, R);
}

// ------------------------------------------------------------------ the themes
const DEEP4 = 0x061a1e, DEEP5 = 0x0c0806;
const AMB4 = (fog, sky, ground, grade) => ({ fog, fogNear: 62, fogFar: 140, background: fog, moon: 1.5, moonColor: 0xb8f0e0, moonDir: [0.3, 1, -0.5], hemi: 1.35, hemiSky: sky, hemiGround: ground, fill: 1.3, fillColor: sky, ambient: 0x14302e, ambientI: 0.9, rain: 0, lightning: false, weather: 'dust', grade, beams: [] });
const AMB5 = (fog, sky, ground, grade) => ({ fog, fogNear: 60, fogFar: 140, background: fog, moon: 1.4, moonColor: 0xffd0a0, moonDir: [0.4, 1, -0.4], hemi: 1.3, hemiSky: sky, hemiGround: ground, fill: 1.25, fillColor: sky, ambient: 0x2a1a10, ambientI: 0.9, rain: 0, lightning: false, weather: 'embers', grade, beams: [] });
const FOES4 = ['drownedangel', 'choirwraith', 'belljelly', 'glassknight'];
const FOES5 = ['homunculus', 'thought', 'memoryknight', 'sleepwalker', 'nightmare', 'dawnling'];

const orchard = {
  id: 'orchard', name: 'The Glass Orchard', tagline: 'TREES OF STAINED GLASS. THEIR FRUIT ARE FROZEN VOICES.', tier: 16, act: 4, seed: 4611, next: 'echoes',
  halls: [[16, 12], [22, 18], [20, 16], [24, 20], [22, 18], [26, 22]], sides: [[2, -1, 12, 12], [4, 1, 12, 14]],
  foes: ['glassknight', 'choirwraith', 'belljelly', 'drownedangel'], echoes: [4],
  msgs: ['THE GLASS TREES RING', 'THE FRUIT CRACK OPEN AND SING', 'SHARDS FALL LIKE RAIN'],
  hints: ['EVERY FRUIT HERE IS A VOICE THE BELL TOOK.', 'DO NOT LISTEN TOO LONG.', 'THE GLASS REMEMBERS THE LIGHT.'],
  ambience: AMB4(0x1a1630, 0x9a8ad8, 0x0e0a18, { gain: [0.98, 0.95, 1.08], lift: [0.012, 0.0, 0.02], sat: 0.95, vignette: 0.45, bloom: 0.4 }),
  deep: 0x0a0818, floor: () => W4.gsand('#a8a0c0'), way: () => W4.leaded(), kerb: () => W4.gold('#9a7a3a'),
  edge(ctx, x, z, R) { if (R() < 0.6) glassTree(ctx, x, z, R); else CH.pillar(ctx, x, z, 3 + R() * 2); },
  centre(ctx, x, z, R) { glassTree(ctx, x, z, R, 1.6); },
  sky(ctx, L) { motes(ctx, [L.bounds], 200, { vy: -0.1, h: 9, y0: 0, color: 0xd8c0ff, add: true, k: 1.6, blink: true, sway: 0.5, seed: 4612 }); },
};
const echoes = {
  id: 'echoes', name: 'The Hall of Echoes', tagline: 'THE VOICE REMEMBERS EVERY BATTLE. IT PLAYS THEM AGAIN.', tier: 17, act: 4, seed: 4711, next: 'halo',
  halls: [[16, 12], [20, 18], [22, 18], [22, 18], [22, 18], [24, 20]], sides: [[3, 1, 12, 12]],
  foes: ['echoknight', 'choirwraith', 'glassknight', 'echoknight'], echoes: [1, 2, 3, 4, 5],
  msgs: ['AN ECHO TAKES SHAPE', 'THE MIRRORS SHOW YOU YOUR OLD FIGHTS', 'THE HALL REMEMBERS'],
  hints: ['THE HALL OF ECHOES. EVERY FOE YOU FELLED IS HERE.', 'THEY KNOW YOUR TRICKS NOW.', 'THE LAST MIRROR IS CRACKED.'],
  ambience: AMB4(0x141420, 0xa8a8c8, 0x0a0a12, { gain: [0.95, 0.96, 1.04], lift: [0.01, 0.01, 0.018], sat: 0.7, vignette: 0.5, bloom: 0.35 }),
  deep: 0x08080e, floor: () => W4.mirror('#1a1824'), way: () => W4.mirror('#24202e'), kerb: () => W4.gold('#8a8aa0'), barrier: 'mirror',
  edge(ctx, x, z, R) { mirrorPane(ctx, x, z, R); },
  centre(ctx, x, z) { E.ring(ctx, x, z, 4.4); E.ring(ctx, x, z, 2.4); },
  sky(ctx, L) { motes(ctx, [L.bounds], 160, { vy: 0.05, h: 8, y0: 0, color: 0xc8c8ff, add: true, k: 1.4, blink: true, seed: 4712 }); },
};
const halo = {
  id: 'halo', name: 'The Broken Halo', tagline: 'A SHATTERED RING OF GOLD OVER THE BRONZE SEA. SHE KEEPS ITS GATE.', tier: 18.5, act: 4, seed: 4811, boss: 'seraph', next: 'end',
  halls: [[16, 12], [20, 16], [22, 18], [30, 28]], sides: [[1, 1, 12, 12]],
  foes: ['drownedangel', 'belljelly', 'glassknight', 'choirwraith'],
  msgs: ['THE RING SINGS A WARNING', 'ANGELS FALL FROM THE RING'],
  hints: ['THE HALO OF HEAVEN, BROKEN WHEN THE WHEEL FELL.', 'THE LAST OF THE ANGELS WAITS AT ITS GATE.', 'BEYOND HER: HIS DREAM.'],
  ambience: AMB4(0x1e2a24, 0xd8c890, 0x0e1410, { gain: [1.04, 1.0, 0.92], lift: [0.02, 0.016, 0.0], sat: 0.9, vignette: 0.45, bloom: 0.45 }),
  deep: 0x10140c, floor: () => W4.gold('#a8843a'), way: () => W4.gold('#8a6a2a'), kerb: () => W4.verd(),
  edge(ctx, x, z, R) { if (R() < 0.5) E.column(ctx, x, z, 3 + R() * 2.5, { broken: R() < 0.5 }); else CH.drownLamp(ctx, x, z); },
  centre(ctx, x, z, R, r) { E.halo(ctx, x, 3.4, z, Math.min(6, (r[2] - r[0]) / 4), { tilt: 0.25, ry: R() * TAU, speed: 0.05, light: 3 }); },
  sky(ctx, L) { E.feathers(ctx, L.rooms, 50); },
};
const ribs = {
  id: 'ribs', name: 'The Ribcage Cathedral', tagline: 'A CHURCH GROWN INSIDE THE RIBS OF A BRONZE GIANT.', tier: 20, act: 5, seed: 5111, next: 'unborn',
  halls: [[18, 14], [24, 20], [26, 22], [24, 20], [28, 24], [26, 22], [30, 26]], sides: [[2, -1, 14, 14], [4, 1, 14, 14]],
  foes: FOES5, echoes: [3, 5],
  msgs: ['THE RIBS CREAK AND BREATHE', 'THE GIANT\'S HEART BEATS ONCE', 'SOMETHING CRAWLS OUT OF THE BRONZE'],
  hints: ['YOU ARE INSIDE HIM NOW. LISTEN: HE BREATHES.', 'THE RIBS ARE WARM.', 'THE HEART IS STILL FAR.'],
  ambience: AMB5(0x1c100a, 0xd89a60, 0x100806, { gain: [1.06, 0.96, 0.86], lift: [0.02, 0.008, 0.0], sat: 0.95, vignette: 0.5, bloom: 0.4 }),
  deep: DEEP5, floor: () => W4.gold('#7a5226'), way: () => D.darkBronze(), kerb: () => D.dreamBronze(),
  edge(ctx, x, z, R) { rib(ctx, x, z, R); },
  centre(ctx, x, z) { D.breathGlow(ctx, x, 0.4, z, 3.2, 0xff7a30, 1); },
  sky(ctx, L) { D.motes(ctx, [L.bounds], 140, { color: 0xffa060 }); },
};
const unborn = {
  id: 'unborn', name: 'The Sea of Unborn Days', tagline: 'EVERY DAWN THE BELL EVER STOLE, ADRIFT AS ISLANDS OF LIGHT.', tier: 20.5, act: 5, seed: 5211, next: 'wake',
  halls: [[18, 14], [24, 20], [26, 22], [28, 24], [26, 22], [30, 26], [28, 24]], sides: [[1, 1, 14, 12], [3, -1, 14, 14], [5, 1, 12, 14]],
  foes: FOES5, echoes: [2, 5],
  msgs: ['A DAY THAT NEVER CAME RISES', 'THE LIGHT TURNS AGAINST YOU', 'THE ISLAND TREMBLES'],
  hints: ['THESE ARE THE DAWNS YOU NEVER HAD.', 'STEP ONLY WHERE THE LIGHT HOLDS.', 'THE CITY IS DREAMING AHEAD.'],
  ambience: AMB5(0x2a1e2a, 0xffd8a8, 0x140a10, { gain: [1.05, 1.0, 0.95], lift: [0.03, 0.02, 0.02], sat: 0.85, vignette: 0.4, bloom: 0.55 }),
  deep: 0x140a10, floor: () => W4.marble('#c8b8a0'), way: () => W4.gold('#c8a058'), kerb: () => W4.gold('#d8b060'),
  edge(ctx, x, z, R) { if (R() < 0.5) D.breathGlow(ctx, x, 0.5, z, 1.2, 0xffd890, 1.2); else E.column(ctx, x, z, 2 + R() * 2, { broken: true }); },
  centre(ctx, x, z) { D.breathGlow(ctx, x, 0.6, z, 4.2, 0xffe0a0, 1.4); E.ring(ctx, x, z, 3.6); },
  sky(ctx, L, R) { for (let i = 0; i < 14; i++) E.shard(ctx, L.bounds[0] + R() * (L.bounds[2] - L.bounds[0]), -3 - R() * 5, L.bounds[1] + R() * (L.bounds[3] - L.bounds[1]), 0.8 + R()); D.motes(ctx, [L.bounds], 160, { color: 0xffe8b0 }); },
};
const wake = {
  id: 'wake', name: 'The Waking City', tagline: 'BELLMOURN AS HE DREAMS IT: WRONG, TILTED, UPSIDE DOWN.', tier: 21.5, act: 5, seed: 5311, next: 'cradle',
  halls: [[18, 14], [26, 20], [28, 24], [26, 22], [30, 26], [28, 24], [32, 28]], sides: [[2, 1, 14, 14], [4, -1, 14, 14]],
  foes: ['sleepwalker', 'memoryknight', 'nightmare', 'thought', 'homunculus'], echoes: [2, 4, 6],
  msgs: ['THE HUSHED OF HIS DREAM WAKE', 'THE STREETS TURN UNDER YOU', 'A BELL RINGS BACKWARDS'],
  hints: ['THIS IS BELLMOURN. IT IS NOT BELLMOURN.', 'THE HOUSES HANG FROM THE SKY.', 'THE CRADLE LIES BEYOND THE LAST SQUARE.'],
  ambience: AMB5(0x1a1424, 0xc0a0ff, 0x0c0814, { gain: [0.98, 0.92, 1.06], lift: [0.02, 0.0, 0.03], sat: 0.8, vignette: 0.55, bloom: 0.35 }),
  deep: 0x0c0814, floor: () => W4.drown('#4a4258'), way: () => W4.drown('#3a3448'), kerb: () => W4.verd('#5a4a7a'), barrier: 'bars',
  edge(ctx, x, z, R) { dreamHouse(ctx, x, z, R); },
  centre(ctx, x, z) { CH.hangBell(ctx, x, 4.4, z, 1.4); },
  sky(ctx, L, R) { for (let i = 0; i < 10; i++) dreamHouse(ctx, L.bounds[0] + R() * (L.bounds[2] - L.bounds[0]), L.bounds[1] + R() * (L.bounds[3] - L.bounds[1]), R, 9 + R() * 4); D.motes(ctx, [L.bounds], 120, { color: 0xc8a0ff }); },
};
const cradle = {
  id: 'cradle', name: 'The Cradle of Bronze', tagline: 'WHERE THE GOD SLEEPS IN THE BELL. WHERE THE FOUNDER KEEPS HIM.', tier: 23, act: 5, seed: 5411, boss: 'firstfounder', next: 'end',
  halls: [[18, 14], [24, 20], [26, 22], [34, 30]], sides: [[1, -1, 14, 12], [2, 1, 14, 12]],
  foes: FOES5,
  msgs: ['THE MOULDS POUR', 'THE BRONZE RIVER RISES'],
  hints: ['THE FORGE WHERE THE BELL WAS CAST. A THOUSAND YEARS AGO.', 'HE NEVER LEFT.', 'HE WILL NOT LET YOU WAKE HIM.'],
  ambience: AMB5(0x1e0e06, 0xff9a50, 0x120604, { gain: [1.08, 0.94, 0.82], lift: [0.03, 0.008, 0.0], sat: 1.0, vignette: 0.5, bloom: 0.5 }),
  deep: 0x1a0804, floor: () => W4.gold('#6a4420'), way: () => D.darkBronze(), kerb: () => D.dreamBronze(),
  edge(ctx, x, z, R) { if (R() < 0.5) mouldProp(ctx, x, z, R); else D.breathGlow(ctx, x, 0.3, z, 1.0, 0xff6a20, 1.4); },
  centre(ctx, x, z) { D.breathGlow(ctx, x, 0.3, z, 4.4, 0xff5a10, 1.2); },
  sky(ctx, L) { D.motes(ctx, [L.bounds], 200, { color: 0xff9a40 }); },
};

// ------------------------------------------------------------------ small props of these places
function glassTree(ctx, x, z, R, s = 1) {
  const cols = [0xc890e8, 0x80c8ff, 0xff90b0, 0xa8ffd0, 0xffd080]; const c = cols[Math.floor(R() * cols.length)];
  add(ctx, box(0.22 * s, 2.2 * s, 0.22 * s), goldM4(), x, 1.1 * s, z);
  for (let i = 0; i < 4; i++) { const a = R() * TAU, h = (1.6 + R() * 1.2) * s; add(ctx, box(0.9 * s, 0.9 * s, 0.12), glassM(c, 0.7, 0.9), x + Math.sin(a) * 0.5 * s, h, z + Math.cos(a) * 0.5 * s, { ry: a, rz: R() * 0.6 }); }
  add(ctx, box(0.2, 0.2, 0.2), glassM(0xffffff, 0.9, 1.6), x, (2.4 + R() * 0.4) * s, z); // a fruit: a voice in glass
}
function mirrorPane(ctx, x, z, R) { add(ctx, box(1.4, 2.6, 0.12), W4.mirror('#2a2840'), x, 1.3, z, { ry: R() * TAU }); add(ctx, box(1.6, 0.14, 0.2), goldM4(), x, 2.66, z); }
function rib(ctx, x, z, R) { const h = 4 + R() * 3; add(ctx, box(0.5, h, 0.6), bronzeM(), x, h / 2, z, { rz: (x > 0 ? -1 : 1) * (0.25 + R() * 0.2) }); }
function dreamHouse(ctx, x, z, R, y = 0) {
  const w = 2 + R() * 1.5, h = 2.4 + R() * 2, up = y > 0; const wall = W4.drown('#5a5068');
  add(ctx, box(w, h, w), wall, x, (up ? y : h / 2), z, { ry: R() * 0.6, rz: up ? Math.PI + (R() - 0.5) * 0.4 : (R() - 0.5) * 0.25 });
  add(ctx, box(0.4, 0.5, 0.06), glassM(0xffc870, 0.9, 1.6), x, up ? y - h * 0.15 : h * 0.6, z + w / 2 + 0.04);
}
function mouldProp(ctx, x, z, R) { add(ctx, box(1.4, 1.6, 1.4), D.darkBronze(), x, 0.8, z, { ry: R() * TAU }); add(ctx, box(0.6, 0.08, 0.6), D.glowM(0xff6a20, 2), x, 1.62, z); }

export const ORCHARD = makeLevel(orchard), ECHOES = makeLevel(echoes), HALO = makeLevel(halo);
export const RIBS = makeLevel(ribs), UNBORN = makeLevel(unborn), WAKE = makeLevel(wake), CRADLE = makeLevel(cradle);
