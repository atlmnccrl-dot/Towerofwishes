// The run: one warden, one seeded route from Gallows Gate to the Empyrean, death ends it (docs/RUN_DESIGN.md).
// Pure (no DOM): the route map per act, moving along it, what a run carries, the merchant's and the shrine's
// wares, the run summary and what it pays into the permanent save (meta), the Bell Tower's upgrades, each
// warden's talents, and the migration of the old v2 save. The game (game.js) stores `meta` and `run`.
//
// Other owners' pure modules are optional here: the quest nodes (C, quests.js), the area variants (C,
// variants.js) and the challenges (D, challenges.js) are imported when present; each use is guarded, so this
// file runs (and its test passes) without them. setProviders() can also hand them in.
import { HEROES, HERO_ORDER, START_HEROES, WEAPONS, RELICS, START_WEAPON, weaponsOfType, ECHOES, MAX_LEVEL, MAX_ARMOR, armorName, ARMOR_DESC } from './heroes.js';

const P = {}; // optional providers: { quests, variants, challenges }
async function tryImport(key, path) {
  try { P[key] = await import(path); } catch (e) {
    const m = String(e && e.message || e); if (!/find module|Failed to fetch|ERR_MODULE_NOT_FOUND|Importing a module script failed|404/i.test(m)) console.warn('bellmourn run: ' + path + ' failed to load: ' + m);
  }
}
await Promise.all([tryImport('quests', './quests.js'), tryImport('variants', './variants.js'), tryImport('challenges', './challenges.js'), tryImport('events', './events.js')]);
export function setProviders(o) { Object.assign(P, o || {}); }
export const providers = P;
// what a curse multiplies (C's CURSES mods; 1 or 0 when none): emberMul, boonChoicesAdd ...
export function curseMod(run, key, base = 1) { const CU = (P.events && P.events.CURSES) || {}; let v = base; for (const c of (run && run.curses) || []) { const m = (CU[c] || {}).mods; if (m && m[key] !== undefined) v = key.endsWith('Add') ? v + m[key] : v * m[key]; } return v; }
const fn = (mod, name) => (P[mod] && typeof P[mod][name] === 'function' ? P[mod][name] : null);

export const META_VERSION = 3, RUN_VERSION = 3;

// ------------------------------------------------------------------ random
export function rngOf(seed) { // mulberry32
  let a = (seed >>> 0) || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hashSeed(...parts) { let h = 2166136261 >>> 0; for (const p of parts) for (const ch of String(p)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ the acts
// Act I: Gallows Gate, 3 of the 6 middle districts, the Belfry. Act II: 2 of 3 regions, the Abyss. Act III: 1 of 2,
// the Empyrean (the Wheel). Act IV: 2 of 3, the Broken Halo (the Last Seraph). Act V: 2 of 3, the Cradle of Bronze
// (the First Founder). Act VI: a shrine, then the Throne (God). About twenty areas in a full run (ASCENT_DESIGN §1).
// The middle areas are dealt into rows (two per row in Act I), so no route can visit an area twice. `tiers`: how
// hard each area row fights, whatever district it is (a run's order varies). PROPOSAL: the new acts' names.
export const ACTS = {
  1: { name: 'THE CITY', first: 'gate', pool: ['market', 'docks', 'nave', 'undercroft', 'foundry', 'heights'], rows: [2, 2, 2], boss: 'belfry', tiers: { first: 0, rows: [1.5, 3.5, 5.5], boss: 7 } },
  2: { name: 'BEYOND THE WALLS', pool: ['frostmarch', 'ashdunes', 'catacombs'], rows: 'split', boss: 'abyss', tiers: { rows: [8.5, 10], boss: 11 } },
  3: { name: 'THE WHEEL', pool: ['marsh', 'spire'], rows: [2], boss: 'empyrean', tiers: { rows: [12.5], boss: 14 } },
  4: { name: 'THE DROWNED HEAVEN', pool: ['choir', 'orchard', 'echoes'], rows: 'split', boss: 'halo', tiers: { rows: [15.5, 17], boss: 18.5 } },
  5: { name: "THE GOD'S DREAM", pool: ['ribs', 'unborn', 'wake'], rows: 'split', boss: 'cradle', tiers: { rows: [20, 21.5], boss: 23 } },
  6: { name: 'THE THRONE', pool: [], rows: [], boss: 'throne', noRest: true, tiers: { rows: [], boss: 26 } },
};
export const LAST_ACT = 6;
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
export const actRoman = (a) => ROMAN[a] || String(a);
export const AREA_NAMES = {
  prologue: 'THE OLD ROAD', gate: 'GALLOWS GATE', market: 'LANTERN ROW', docks: 'MIREWATER DOCKS', nave: 'THE DROWNED NAVE', undercroft: 'THE UNDERCROFT',
  foundry: 'THE BELL FOUNDRY', heights: 'THE CROWN HEIGHTS', belfry: 'THE BELFRY', frostmarch: 'THE FROSTMARCH', ashdunes: 'THE ASH DUNES',
  catacombs: 'THE CATACOMBS', abyss: 'THE ABYSS', marsh: 'THE WEEPING MARSH', spire: 'THE CLOCKWORK SPIRE', empyrean: 'THE EMPYREAN',
  choir: 'THE SUNKEN CHOIR', orchard: 'THE GLASS ORCHARD', echoes: 'THE HALL OF ECHOES', halo: 'THE BROKEN HALO',
  ribs: 'THE RIBCAGE CATHEDRAL', unborn: 'THE SEA OF UNBORN DAYS', wake: 'THE WAKING CITY', cradle: 'THE CRADLE OF BRONZE', throne: 'THE THRONE OF THE TOLL',
};
// the level's own boss (an area variant may draw another from its pool: game.js asks D's bossPool). The new
// acts' middle areas name no boss of their own here: their level defs carry it.
export const AREA_BOSS = { gate: 'gaoler', market: 'tallow', docks: 'harbormaster', nave: 'deacon', undercroft: 'ossuary', foundry: 'founder', heights: 'regent', belfry: 'silence',
  frostmarch: 'frostgiant', ashdunes: 'sandwyrm', catacombs: 'lich', abyss: 'archon', marsh: 'bogmother', spire: 'clockmaster', empyrean: 'wheel',
  halo: 'seraph', cradle: 'firstfounder', throne: 'god' };
export const AREA_TIER = { gate: 0, market: 1, docks: 2, nave: 3, undercroft: 4, foundry: 5, heights: 6, belfry: 7, frostmarch: 8, ashdunes: 9, catacombs: 10, abyss: 11, marsh: 12, spire: 13, empyrean: 14,
  choir: 15.5, orchard: 16, echoes: 17, halo: 18.5, ribs: 20, unborn: 20.5, wake: 21.5, cradle: 23, throne: 26 };
// the act of an area (0: none)
export const actOfArea = (id) => { for (const [a, A] of Object.entries(ACTS)) if (A.first === id || A.boss === id || A.pool.includes(id)) return +a; return 0; };
// The boss that closes each act, and which act's gate its first fall opens (meta.codex.bosses): Act IV after the
// first Wheel, V after the first Seraph, VI after the first First Founder.
export const ACT_GATE = { 4: 'wheel', 5: 'seraph', 6: 'firstfounder' };
export function actUnlocked(meta, act) {
  if (act <= 3) return true; const b = ACT_GATE[act]; if (!b) return false;
  return !!(meta && ((meta.codex && meta.codex.bosses && meta.codex.bosses[b]) || meta.allActs));
}
// Which areas can be played (their level is built and, for an act's last area, its boss exists). game.js hands
// in the real test (setPlayable); without one (the Node tests) every area plays.
let PLAYABLE = null;
export function setPlayable(f) { PLAYABLE = typeof f === 'function' ? f : null; }
export const areaPlayable = (id) => { if (!PLAYABLE) return true; try { return !!PLAYABLE(id); } catch (e) { return false; } };
// an act can be played when its boss area can (a missing middle area is skipped)
export const actPlayable = (act) => !!ACTS[act] && areaPlayable(ACTS[act].boss);
// the deepest act this save can reach in a run: unlocked and built, in order
export function lastOpenAct(meta) { let a = 1; while (a < LAST_ACT && actUnlocked(meta, a + 1) && actPlayable(a + 1)) a++; return a; }
// small nodes: PROPOSAL labels
export const NODE_KINDS = {
  area: { label: 'AREA', icon: 'area' }, boss: { label: 'BOSS', icon: 'boss' }, event: { label: 'EVENT', icon: 'event' }, shrine: { label: 'SHRINE', icon: 'shrine' },
  merchant: { label: 'MERCHANT', icon: 'merchant' }, trial: { label: 'TRIAL', icon: 'trial' }, quest: { label: 'QUEST', icon: 'quest' },
};
const SMALL_W = [['event', 0.44], ['shrine', 0.16], ['merchant', 0.18], ['trial', 0.22]];
function smallKind(rng, no) { const opts = SMALL_W.filter(([k]) => !no.includes(k)); const tot = opts.reduce((s, [, w]) => s + w, 0); let r = rng() * tot; for (const [k, w] of opts) { if ((r -= w) <= 0) return k; } return opts[0][0]; }

// The route map of one act: rows of nodes from the bottom (y 0) to the boss at the top (y 1); x across 0..1.
// Area rows alternate with rows of small nodes. Every node leads on to at least one node of the next row, and
// every node of a row after the first is reached from the row before it, so every node can be reached and
// every route ends at the act's boss.
export function buildMap(seed, act, meta = null, run = null) {
  const A = ACTS[act]; if (!A) throw new Error('no act ' + act);
  const rng = rngOf(hashSeed(seed, 'act', act));
  const pool = shuffle(rng, A.pool);
  let areaRows;
  if (A.rows === 'split') { const one = rng() < 0.5; areaRows = one ? [pool.slice(0, 1), pool.slice(1)] : [pool.slice(0, 2), pool.slice(2)]; }
  else { let k = 0; areaRows = A.rows.map((n) => pool.slice(k, (k += n))); }
  // an area whose level is not built yet is left out; a row left empty goes (its small nodes with it)
  const tiersOf = []; areaRows = areaRows.map((r, i) => { tiersOf.push(A.tiers.rows[i]); return r; });
  if (PLAYABLE) { const keep = areaRows.map((r) => r.filter(areaPlayable)); const t2 = []; areaRows = []; keep.forEach((r, i) => { if (r.length) { areaRows.push(r); t2.push(tiersOf[i]); } }); tiersOf.length = 0; tiersOf.push(...t2); }
  // the rows: [kind, contents]
  const rows = [];
  if (A.first) rows.push({ kind: 'area', areas: [A.first], tier: A.tiers.first });
  else rows.push({ kind: 'start' }); // a shrine at the act's threshold (the act's opening scene plays there)
  areaRows.forEach((areas, i) => { rows.push({ kind: 'small' }); rows.push({ kind: 'area', areas, tier: tiersOf[i] }); });
  if (!A.noRest) rows.push({ kind: 'rest' }); // before the boss: a shrine, or a merchant beside it
  rows.push({ kind: 'boss', areas: [A.boss], tier: A.tiers.boss });
  const nodes = []; const byRow = [];
  const N = rows.length; const fewShrines = tollMods(runToll(run)).fewShrines;
  rows.forEach((R, ri) => {
    let specs;
    if (R.kind === 'area' || R.kind === 'boss') specs = R.areas.map((a) => ({ kind: R.kind === 'boss' ? 'boss' : 'area', area: a, tier: R.tier }));
    else if (R.kind === 'start') specs = [{ kind: 'shrine', start: true }];
    else if (R.kind === 'rest') specs = rng() < 0.55 ? [{ kind: 'shrine' }, { kind: 'merchant' }] : [{ kind: fewShrines && rng() < 0.5 ? 'merchant' : 'shrine' }];
    else { const n = 2 + (rng() < 0.55 ? 1 : 0); const used = []; specs = []; for (let i = 0; i < n; i++) { const k = smallKind(rng, used.filter((u) => u !== 'event').concat(fewShrines ? ['shrine'] : [])); used.push(k); specs.push({ kind: k }); } }
    const row = specs.map((s, ci) => {
      const n = specs.length; const x = n === 1 ? 0.5 : 0.18 + (0.64 * ci) / (n - 1) + (rng() - 0.5) * 0.06;
      const node = { id: act + '-' + ri + '-' + ci, kind: s.kind, act, row: ri, x: +clamp(x, 0.06, 0.94).toFixed(3), y: +(ri / (N - 1)).toFixed(3), next: [] };
      if (s.area) { node.area = s.area; node.tier = s.tier; node.boss = AREA_BOSS[s.area]; }
      if (s.start) node.start = true;
      node.label = s.area ? AREA_NAMES[s.area] : NODE_KINDS[s.kind].label; node.icon = NODE_KINDS[s.kind].icon;
      if (s.kind === 'trial') { const tp = (A.first ? [A.first, ...A.pool] : A.pool).filter(areaPlayable); node.area = tp.length ? pick(rng, tp) : 'gate'; node.tier = (A.tiers.rows[Math.min(A.tiers.rows.length - 1, Math.floor(ri / 2))] || 0) + 0.5; }
      return node;
    });
    byRow.push(row); nodes.push(...row);
  });
  // edges between neighbouring rows: each node to the node(s) across from it, no crossings
  for (let ri = 0; ri < byRow.length - 1; ri++) linkRows(rng, byRow[ri], byRow[ri + 1]);
  // area variants (C): picked now so the map can show the condition
  const pv = fn('variants', 'pickVariant');
  if (pv) for (const n of nodes) if (n.area && (n.kind === 'area' || n.kind === 'boss')) {
    try { const v = pv(n.area, rngOf(hashSeed(seed, n.id, 'variant')), run); if (v) { n.variant = v.id; if (v.condition) n.condition = v.condition; if (v.name || v.condition) n.cond = String(v.name || v.condition).toUpperCase(); } } catch (e) { /* a variant table still being built */ }
  }
  const map = { act, nodes, start: byRow[0].map((n) => n.id), rows: byRow.length, name: A.name };
  // quest nodes (C): only when a hint was found; each sits in a row of small nodes
  const qn = fn('quests', 'questNodes');
  if (qn) { try { insertQuests(rng, map, byRow, rows, (qn(run || { act, seed }, meta || {}) || []).filter((q) => !q.act || q.act === act)); } catch (e) { /* quests still being built */ } }
  return map;
}
function linkRows(rng, A, B) {
  const a = A.length, b = B.length;
  if (a === 1) { for (const n of B) A[0].next.push(n.id); return; }
  if (b === 1) { for (const n of A) n.next.push(B[0].id); return; }
  // node i of A to the node(s) of B across from it: monotonic, so no two paths cross
  A.forEach((n, i) => { const f = i / (a - 1) * (b - 1); for (const j of new Set([Math.floor(f), Math.ceil(f)])) n.next.push(B[j].id); });
  // now and then a crossing-free diagonal (i to i + 1) so routes can change lanes
  if (rng() < 0.6) { const i = Math.floor(rng() * (a - 1)); const f = (i + 1) / (a - 1) * (b - 1); const j = Math.min(b - 1, Math.floor(f)); if (j > 0) A[i].next.push(B[j].id); }
  B.forEach((m, j) => { if (!A.some((n) => n.next.includes(m.id))) { const i = Math.round(j / (b - 1) * (a - 1)); A[i].next.push(m.id); } });
  for (const n of A) n.next = [...new Set(n.next)].sort((x, y) => B.findIndex((q) => q.id === x) - B.findIndex((q) => q.id === y));
}
function insertQuests(rng, map, byRow, rows, quests) {
  const small = rows.map((R, i) => (R.kind === 'small' ? i : -1)).filter((i) => i > 0 && i < byRow.length - 1);
  if (!small.length) return;
  quests.slice(0, 2).forEach((q, k) => {
    const ri = q.row && small.includes(q.row) ? q.row : small[(k + Math.floor(rng() * small.length)) % small.length];
    const row = byRow[ri];
    const node = { ...q, id: map.act + '-' + ri + '-q' + k, kind: 'quest', act: map.act, row: ri, next: [], label: q.label || NODE_KINDS.quest.label, icon: q.icon || 'quest' };
    // squeeze it in at the side with more room
    const left = row[0].x > 1 - row[row.length - 1].x; node.x = left ? Math.max(0.04, row[0].x - 0.14) : Math.min(0.96, row[row.length - 1].x + 0.14); node.y = row[0].y;
    const prev = byRow[ri - 1], nxt = byRow[ri + 1];
    const from = left ? prev[0] : prev[prev.length - 1]; from.next.push(node.id);
    node.next.push((left ? nxt[0] : nxt[nxt.length - 1]).id);
    if (left) row.unshift(node); else row.push(node);
    map.nodes.push(node);
  });
}
export const nodeById = (map, id) => (map && map.nodes ? map.nodes.find((n) => n.id === id) : null) || null;

// ------------------------------------------------------------------ the permanent save
export function freshMeta() {
  return {
    v: META_VERSION, unlocked: START_HEROES.slice(), mastery: {}, shards: 0, tower: {},
    challenges: {}, done: [], codex: { foes: {}, bosses: {}, boons: {}, echoes: {}, lore: {}, endings: [] },
    friends: [], quests: {}, hints: {}, runs: 0, best: { act: 0, depth: 0 }, story: { seen: {} }, settings: {},
    tolls: { max: 0, clear: -1 }, toll: 0,
  };
}
// keep a stored meta (any version 3) whole and well-formed
export function upgradeMeta(m) {
  if (!m || m.v !== META_VERSION) return null;
  const f = freshMeta(); const out = { ...f, ...m };
  out.codex = { ...f.codex, ...(m.codex || {}) }; if (!Array.isArray(out.codex.endings)) out.codex.endings = [];
  for (const k of ['unlocked', 'done', 'friends']) if (!Array.isArray(out[k])) out[k] = f[k].slice();
  for (const id of START_HEROES) if (!out.unlocked.includes(id)) out.unlocked.push(id);
  for (const k of ['mastery', 'tower', 'challenges', 'quests', 'hints', 'settings']) if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {};
  out.story = { seen: {}, ...(m.story || {}) }; if (!out.story.seen || typeof out.story.seen !== 'object') out.story.seen = {};
  out.best = { act: 0, depth: 0, ...(m.best || {}) }; out.runs = out.runs | 0; out.shards = Math.max(0, out.shards | 0);
  out.tolls = { max: 0, clear: -1, ...(m.tolls && typeof m.tolls === 'object' ? m.tolls : {}) }; out.toll = Math.max(0, Math.min(out.tolls.max | 0, out.toll | 0));
  return out;
}

// The old v2 save (the linear game) into meta v3: the wardens it unlocked and the story it saw are kept; the rest
// is carried over as fairly as it goes: levels become mastery, embers and fallen bosses become Bell Shards, the
// bestiary, the Echoes and the endings go into the Codex.
export function migrateSave(v2) {
  const m = freshMeta(); if (!v2 || typeof v2 !== 'object') return m;
  for (const id of v2.unlocked || []) if (HEROES[id] && !m.unlocked.includes(id)) m.unlocked.push(id);
  const seen = v2.seen && typeof v2.seen === 'object' ? v2.seen : {};
  for (const k of Object.keys(seen)) if (seen[k]) m.story.seen[k.split('@')[0]] = true;
  if (v2.tutorial) m.story.seen.tutorial = true;
  for (const [id, P] of Object.entries(v2.heroes || {})) { const lv = (P && P.level) | 0; if (HEROES[id] && lv > 1) m.mastery[id] = { xp: (lv - 1) * 60, level: masteryLevel((lv - 1) * 60), talents: [] }; }
  const bosses = Object.keys(v2.bosses || {}).filter((k) => v2.bosses[k]);
  m.shards = Math.floor((v2.embers | 0) / 40) + bosses.length * 8 + (v2.endings || []).length * 25;
  if (v2.bestiary && typeof v2.bestiary === 'object') m.codex.foes = { ...v2.bestiary };
  for (const a of bosses) if (AREA_BOSS[a]) m.codex.bosses[AREA_BOSS[a]] = 1;
  for (const t of v2.echoes || []) if (ECHOES[t]) m.codex.echoes[t] = true;
  m.codex.endings = Array.isArray(v2.endings) ? v2.endings.slice() : [];
  m.best = { act: v2.bosses && v2.bosses.abyss ? 3 : (v2.bosses && v2.bosses.belfry ? 2 : (bosses.length ? 1 : 0)), depth: 0 };
  m.migrated = 2;
  return m;
}

// ------------------------------------------------------------------ mastery and talents
// mastery level L needs 75 * L * (L + 1) xp in all (150, 450, 900, 1500 ...), up to level 12
export const MASTERY_MAX = 12;
export const masteryNeed = (L) => 75 * L * (L + 1);
export function masteryLevel(xp) { let L = 0; while (L < MASTERY_MAX && xp >= masteryNeed(L + 1)) L++; return L; }
export const talentSlots = (level) => (level >= 6 ? 3 : (level >= 2 ? 2 : 1));
export function masteryOf(meta, heroId) { const m = (meta && meta.mastery && meta.mastery[heroId]) || { xp: 0, level: 0, talents: [] }; return { xp: m.xp | 0, level: masteryLevel(m.xp | 0), talents: Array.isArray(m.talents) ? m.talents : [] }; }

// Traits: what a warden learns by fighting (the mastery each match earns). Each warden has five, their own, each a
// new way to fight rather than a bigger number (sim_traits.js makes them real); picked at the start of a run, one
// slot at first, two at mastery 2, three at mastery 6. level: the mastery that unlocks it. trait: its id in the fight.
// PROPOSAL: every name and line.
const TRAIT_LIST = {
  warden: [
    { id: 'riposte', name: 'RIPOSTE', desc: 'A PERFECT DODGE READIES A RIPOSTE: YOUR NEXT BLOW HITS 3X AND STAGGERS.', level: 1 },
    { id: 'thirdbell', name: 'THE THIRD BELL', desc: 'THE LAST CUT OF YOUR COMBO SENDS A CRESCENT OF STEEL FLYING ON.', level: 2 },
    { id: 'laststand', name: 'THE REFUSED OATH', desc: 'ONCE AN AREA, A BLOW THAT WOULD FELL YOU LEAVES YOU STANDING, UNTOUCHABLE.', level: 4 },
    { id: 'rushsteel', name: 'RUSH OF STEEL', desc: 'YOUR DASH CUTS EVERY FOE YOU PASS THROUGH, AND THEY BLEED.', level: 6 },
    { id: 'requiem', name: 'REQUIEM\'S ECHO', desc: 'AFTER YOUR ULTIMATE, EVERY FINISHING CUT STRIKES TWICE FOR 6 SECONDS.', level: 9 },
  ],
  huntress: [
    { id: 'stillhand', name: 'STILL HAND', desc: 'STAND STILL A MOMENT: YOUR NEXT THREE BOLTS PIERCE AND HIT FAR HARDER.', level: 1 },
    { id: 'ricochet', name: 'RICOCHET', desc: 'A BOLT THAT KILLS FLIES ON TO THE NEXT FOE.', level: 2 },
    { id: 'caltrops', name: 'CALTROPS', desc: 'DASHING SCATTERS CALTROPS: FOES WHO CROSS THEM ARE PINNED AND BLEED.', level: 4 },
    { id: 'markedprey', name: 'MARKED PREY', desc: 'EVERY FIFTH BOLT IN THE SAME FOE BURSTS FOR HEAVY DAMAGE.', level: 6 },
    { id: 'rooftop', name: 'ROOFTOP VOLLEY', desc: 'A PERFECT DODGE LOOSES A FAN OF FIVE BOLTS.', level: 9 },
  ],
  bellbreaker: [
    { id: 'aftershock', name: 'AFTERSHOCK', desc: 'YOUR QUAKING BLOW CRACKS THE GROUND, AND IT ERUPTS AGAIN A MOMENT LATER.', level: 1 },
    { id: 'revenge', name: 'ANVIL\'S ANSWER', desc: 'WHEN YOU ARE STRUCK, YOUR NEXT BLOW HITS TWICE AS HARD.', level: 2 },
    { id: 'bellringer', name: 'BELLRINGER', desc: 'EVERY FOURTH HEAVY BLOW TOLLS A BELL THAT STUNS EVERYTHING AROUND YOU.', level: 4 },
    { id: 'scatter', name: 'SCATTER', desc: 'FOES KILLED BY YOUR HAMMER ARE FLUNG APART, SMASHING THOSE NEAR THEM.', level: 6 },
    { id: 'lasttoll', name: 'THE LAST TOLL', desc: 'WHEN YOUR ULTIMATE ENDS, ONE LAST GREAT TOLL BREAKS AND STUNS ALL AROUND.', level: 9 },
  ],
  lamplighter: [
    { id: 'kindling', name: 'KINDLING', desc: 'BURNING FOES BURST INTO FLAME WHEN THEY FALL.', level: 1 },
    { id: 'warmhands', name: 'WARM HANDS', desc: 'EVERY BURNING FOE NEAR YOU HEALS YOU A LITTLE EACH SECOND.', level: 2 },
    { id: 'wildfire', name: 'WILDFIRE', desc: 'YOUR FLAMES LEAP FROM FOE TO FOE.', level: 4 },
    { id: 'sunspot', name: 'SUNSPOT', desc: 'EVERY SIXTH FIREBOLT IS A SUNSPOT THAT BURSTS WHERE IT STRIKES.', level: 6 },
    { id: 'dawnbreak', name: 'DAWNBREAK', desc: 'AFTER YOUR ULTIMATE, FOR FIVE SECONDS EVERY FIREBOLT SPLITS IN THREE.', level: 9 },
  ],
  kestrel: [
    { id: 'backstab', name: 'OPEN VEINS', desc: 'STRIKING A BLEEDING FOE FROM BEHIND DEALS DOUBLE DAMAGE.', level: 1 },
    { id: 'hemorrhage', name: 'HEMORRHAGE', desc: 'A FOE BLEEDING ITS WORST, STRUCK THREE TIMES MORE, BURSTS.', level: 2 },
    { id: 'shadowstep', name: 'SHADOWSTEP', desc: 'A PERFECT DODGE PUTS YOU BEHIND YOUR ATTACKER. YOUR NEXT BLOW LANDS HARD.', level: 4 },
    { id: 'keys', name: 'THE GAOLER\'S KEYS', desc: 'KILLING A BLEEDING FOE TAKES TIME OFF YOUR ABILITIES.', level: 6 },
    { id: 'gallowsdance', name: 'GALLOWS DANCE', desc: 'YOUR DASHING STAB THROWS A KNIFE TO EITHER SIDE.', level: 9 },
  ],
  hollis: [
    { id: 'colddeep', name: 'THE COLD DEEP', desc: 'FOES YOUR ANCHOR DRAGS IN ARE CHILLED, AND SOON FREEZE.', level: 1 },
    { id: 'barnaclehide', name: 'BARNACLE HIDE', desc: 'WHEN STRUCK, SHELLS GROW OVER YOU AND TURN ASIDE MUCH OF THE HURT.', level: 2 },
    { id: 'tidesurge', name: 'TIDE SURGE', desc: 'YOUR SLAM LEAVES A POOL OF COLD WATER THAT GRINDS AND SLOWS.', level: 4 },
    { id: 'anchordrop', name: 'ANCHOR DROP', desc: 'EVERY DASH ENDS IN A SLAM THAT STUNS THE FOES AROUND YOU.', level: 6 },
    { id: 'highwater', name: 'HIGH WATER', desc: 'AFTER YOUR ULTIMATE, YOUR BLOWS ARC LIGHTNING FOR 8 SECONDS.', level: 9 },
  ],
  wren: [
    { id: 'chorus', name: 'CHORUS', desc: 'A BLOW ON A RESONATING FOE RINGS THROUGH THE OTHERS NEAR IT.', level: 1 },
    { id: 'crescendo', name: 'CRESCENDO', desc: 'A FOE AT FULL RESONANCE, STRUCK AGAIN, SHATTERS IN A BURST OF SONG.', level: 2 },
    { id: 'lullgrace', name: 'LULLABY\'S GRACE', desc: 'A PERFECT DODGE SINGS THE FOES AROUND YOU TO SLEEP.', level: 4 },
    { id: 'sanctus', name: 'SANCTUS', desc: 'STRIKING A FOE AT FULL RESONANCE HEALS YOU.', level: 6 },
    { id: 'amen', name: 'AMEN', desc: 'WHEN YOUR ULTIMATE ENDS, EVERY RESONATING FOE TAKES A BLOW PER NOTE.', level: 9 },
  ],
};
export const TALENTS = Object.fromEntries(HERO_ORDER.map((id) => [id, (TRAIT_LIST[id] || TRAIT_LIST.warden).map((t) => ({ ...t, trait: t.id }))]));
export const talentsOf = (heroId) => TALENTS[heroId] || TALENTS.warden;
// which talents a warden can pick now, and toggle one (keeps within the slots; the oldest falls out)
export function availableTalents(meta, heroId) { const L = masteryOf(meta, heroId).level; return talentsOf(heroId).map((t) => ({ ...t, locked: t.level > L })); }
export function toggleTalent(meta, heroId, id) {
  const m = meta.mastery[heroId] = meta.mastery[heroId] || { xp: 0, level: 0, talents: [] };
  const T = talentsOf(heroId).find((t) => t.id === id); const L = masteryLevel(m.xp | 0);
  if (!T) return 'NO SUCH TALENT'; if (T.level > L) return 'MASTERY ' + T.level + ' NEEDED';
  m.talents = (m.talents || []).filter((t) => talentsOf(heroId).some((x) => x.id === t && x.level <= L));
  const i = m.talents.indexOf(id); if (i >= 0) { m.talents.splice(i, 1); return 'TALENT SET ASIDE'; }
  m.talents.push(id); while (m.talents.length > talentSlots(L)) m.talents.shift();
  return 'TALENT CHOSEN';
}

// ------------------------------------------------------------------ the Bell Tower (meta upgrades, PROPOSAL texts)
// A deep chained tree in five branches (ASCENT_DESIGN §4). Each node needs its parent built to a level (`req`);
// costs grow along a chain. `row` is its depth in its branch (the tower screen draws the chains top-down),
// `col` a small sideways offset. Effects are read by applyRunStats (stats), newRun (what a run starts with), the
// shrine, the boss heal, the merchant and endRun (shards). Old ids (flask, reroll, purse, vigor, shrine, luck,
// mercy) are kept so an old save keeps what it bought.
export const BRANCHES = [
  { id: 'vigour', name: 'VIGOUR', desc: 'HEALTH AND HEALING' },
  { id: 'arms', name: 'ARMS', desc: 'DAMAGE AND CRITS' },
  { id: 'grace', name: 'GRACE', desc: 'SPEED, DASH, HIDE' },
  { id: 'fortune', name: 'FORTUNE', desc: 'EMBERS, BOONS, SHARDS' },
  { id: 'faith', name: 'FAITH', desc: 'BLESSINGS AND THE SECOND TOLL' },
];
const TN = (id, branch, row, col, name, desc, cost, req = null) => ({ id, branch, row, col, name, desc, max: cost.length, cost, req });
export const TOWER = [
  // VIGOUR
  TN('vigor', 'vigour', 0, 0, 'TEMPERED BODY', '+5% MAX HEALTH.', [15, 35, 65]),
  TN('flask', 'vigour', 1, -1, 'A SECOND FLASK RACK', 'CARRY ONE MORE TONIC.', [60, 160], ['vigor', 1]),
  TN('heart', 'vigour', 1, 1, 'IRON HEART', '+6% MAX HEALTH.', [90, 150, 240], ['vigor', 3]),
  TN('draught', 'vigour', 2, -1, 'STRONGER DRAUGHT', 'TONICS HEAL 10% MORE.', [45, 90, 160], ['flask', 1]),
  TN('mend', 'vigour', 2, 1, 'THE TOLL MENDS', 'A FALLEN BOSS HEALS 8% MORE.', [80, 170], ['heart', 1]),
  TN('shrine', 'vigour', 3, 0, 'WARMER SHRINES', 'SHRINES HEAL 8% MORE.', [70, 150], ['draught', 1]),
  // ARMS
  TN('edge', 'arms', 0, 0, 'WHETSTONE', '+4% DAMAGE.', [15, 40, 75]),
  TN('crit', 'arms', 1, -1, 'KEEN EYE', '+3% CRITICAL CHANCE.', [45, 90, 150], ['edge', 1]),
  TN('steel', 'arms', 1, 1, 'TEMPERED STEEL', '+5% DAMAGE.', [100, 170, 270], ['edge', 3]),
  TN('focus', 'arms', 2, -1, 'BELL FOCUS', 'SKILLS RECHARGE 5% FASTER.', [70, 150], ['crit', 1]),
  TN('ult', 'arms', 2, 1, 'THE GREAT TOLL', 'THE ULTIMATE CHARGES 8% FASTER.', [90, 190], ['steel', 1]),
  // GRACE
  TN('swift', 'grace', 0, 0, 'LIGHT STEP', '+3% MOVE SPEED.', [25, 60]),
  TN('hide', 'grace', 1, -1, "WARDEN'S HIDE", 'TAKE 4% LESS DAMAGE.', [40, 85, 150], ['swift', 1]),
  TN('wind', 'grace', 1, 1, 'A SECOND WIND', 'ONE MORE DASH CHARGE.', [220], ['swift', 2]),
  TN('breath', 'grace', 2, 1, 'CAUGHT BREATH', 'ARRIVE IN AN AREA WITH 6% MORE HEALTH AT LEAST.', [60, 130], ['wind', 1]),
  TN('bulwark', 'grace', 2, -1, 'BULWARK', 'TAKE 5% LESS DAMAGE.', [140, 240], ['hide', 3]),
  // FORTUNE
  TN('purse', 'fortune', 0, 0, 'THE EMBER PURSE', 'START EACH RUN WITH 30 MORE EMBERS.', [15, 45, 90]),
  TN('reroll', 'fortune', 1, -1, "THE RINGER'S DICE", 'ONE MORE BOON REROLL EACH RUN.', [35, 80, 150], ['purse', 1]),
  TN('greed', 'fortune', 1, 1, 'EMBER GREED', 'FOES DROP 10% MORE EMBERS.', [40, 90, 160], ['purse', 2]),
  TN('luck', 'fortune', 2, -1, 'GILDED OFFERS', 'BOONS COME RARER MORE OFTEN.', [60, 130, 240], ['reroll', 1]),
  TN('haggle', 'fortune', 2, 1, 'THE HAGGLER', 'SHRINE AND MERCHANT PRICES -8%.', [70, 150], ['greed', 1]),
  TN('shardk', 'fortune', 3, 0, 'SHARD SENSE', '+10% BELL SHARDS FROM EACH RUN.', [90, 180, 300], ['luck', 1]),
  // FAITH
  TN('blessing', 'faith', 0, 0, 'A BLESSING', 'BEGIN EACH RUN WITH A BOON OF THREE.', [120]),
  TN('choice', 'faith', 1, -1, 'A WIDER CHOICE', 'BOON PICKS OFFER ONE MORE.', [260], ['blessing', 1]),
  TN('mercy', 'faith', 1, 1, 'THE SECOND TOLL', 'ONCE A RUN, RISE AGAIN AT 40% HEALTH.', [400], ['blessing', 1]),
  TN('anoint', 'faith', 2, -1, 'ANOINTED', 'THE STARTING BOON IS RARE OR BETTER.', [200], ['choice', 1]),
  TN('vow', 'faith', 2, 1, 'THE WARDEN\'S VOW', 'EACH NEW ACT REFILLS YOUR FLASK.', [240], ['mercy', 1]),
];
export const towerUpgrades = TOWER;
const towerNode = (id) => TOWER.find((t) => t.id === id) || null;
export const towerLevel = (meta, id) => { const T = towerNode(id); return Math.max(0, Math.min(T ? T.max : 99, (meta && meta.tower && meta.tower[id]) | 0)); };
// is the node's chain open (its parent built far enough)?
export function towerOpen(meta, id) { const T = towerNode(id); if (!T) return false; if (!T.req) return true; return towerLevel(meta, T.req[0]) >= T.req[1]; }
export function towerCost(meta, id) { const T = towerNode(id); const lv = towerLevel(meta, id); return T && lv < T.max ? T.cost[lv] : null; }
export function buyTower(meta, id) {
  const T = towerNode(id); if (!T) return 'NO SUCH UPGRADE';
  const c = towerCost(meta, id); if (c === null) return 'FULLY BUILT';
  if (!towerOpen(meta, id)) { const P = towerNode(T.req[0]); return 'NEEDS ' + (P ? P.name : T.req[0]) + ' ' + T.req[1]; }
  if ((meta.shards | 0) < c) return 'NOT ENOUGH SHARDS';
  meta.tower = meta.tower || {}; meta.shards -= c; meta.tower[id] = towerLevel(meta, id) + 1; return T.name + ' ' + meta.tower[id] + '/' + T.max;
}
// how many of the tower's open floors the shards in hand can raise now (the title and the run's end call to it)
export const towerAffordable = (meta) => TOWER.filter((t) => towerOpen(meta, t.id) && towerCost(meta, t.id) !== null && towerCost(meta, t.id) <= (meta.shards | 0)).length;
// what the whole tower costs, and what is built (levels)
export const towerTotal = () => TOWER.reduce((s, t) => s + t.cost.reduce((a, b) => a + b, 0), 0);
export const towerBuilt = (meta) => TOWER.reduce((s, t) => s + towerLevel(meta, t.id), 0);
// tests and the balance check: build about `frac` of the tower, cheapest first, in chain order
export function towerPreset(meta, frac = 1) {
  meta.tower = {}; const budget = Math.round(towerTotal() * frac); let spent = 0;
  for (;;) {
    let best = null; for (const t of TOWER) { const c = towerCost(meta, t.id); if (c !== null && towerOpen(meta, t.id) && (!best || c < best.c)) best = { id: t.id, c }; }
    if (!best || spent + best.c > budget) break; spent += best.c; meta.tower[best.id] = towerLevel(meta, best.id) + 1;
  }
  return spent;
}

// ------------------------------------------------------------------ Ascension: the Tolls (PROPOSAL, ASCENT_DESIGN §4)
// After the first full clear Toll 1 opens; each clear at Toll N opens N + 1, up to 20. A run is played at one Toll
// (chosen on the warden select) and every Toll up to it applies: each stacks one rule.
export const TOLLS = [
  null,
  { name: 'THE FIRST TOLL', desc: 'FOES HAVE 10% MORE HEALTH.', mods: { foeHp: 1.1 } },
  { name: 'EARLY TEETH', desc: 'ELITES FROM THE FIRST AREA.', mods: { eliteEarly: true } },
  { name: 'A THINNER FLASK', desc: 'ONE TONIC LESS.', mods: { tonicAdd: -1 } },
  { name: 'SHARPER BLADES', desc: 'FOES DEAL 10% MORE DAMAGE.', mods: { foeDmg: 1.1 } },
  { name: 'FEWER FIRES', desc: 'FEWER SHRINES ON THE ROAD.', mods: { fewShrines: true } },
  { name: 'HARDER HIDES', desc: 'BOSSES HAVE 15% MORE HEALTH.', mods: { bossHp: 1.15 } },
  { name: 'COLD SHRINES', desc: 'SHRINES HEAL HALF AS MUCH.', mods: { shrineMul: 0.5 } },
  { name: 'THE CROWD', desc: 'FOES COME IN LARGER GROUPS.', mods: { crowdAdd: 0.3 } },
  { name: 'THE QUICKENING', desc: 'BOSSES HIT 15% HARDER.', mods: { bossDmg: 1.15 } },
  { name: 'NO MERCY', desc: 'A FALLEN BOSS HEALS NOTHING.', mods: { bossHeal: 0 } },
  { name: 'A CURSED ROAD', desc: 'EACH RUN BEGINS WITH A CURSE.', mods: { startCurse: true } },
  { name: 'THICKER SKULLS', desc: 'FOES HAVE 15% MORE HEALTH.', mods: { foeHp: 1.15 } },
  { name: 'LEAN EMBERS', desc: 'FOES DROP 25% FEWER EMBERS.', mods: { emberMul: 0.75 } },
  { name: 'MANY CROWNS', desc: 'ELITES COME FAR MORE OFTEN.', mods: { eliteMul: 1.6 } },
  { name: 'THE ASCENDED', desc: 'THE ACT BOSSES COME ASCENDED.', mods: { ascended: true } },
  { name: 'CRUEL STEEL', desc: 'FOES DEAL 15% MORE DAMAGE.', mods: { foeDmg: 1.15 } },
  { name: 'DARK LAMPS', desc: 'THE OLD LAMPS DO NOT HEAL.', mods: { lampMul: 0 } },
  { name: 'A NARROW CHOICE', desc: 'BOON PICKS OFFER ONE FEWER.', mods: { boonAdd: -1 } },
  { name: 'THE RETURNING', desc: 'ECHOES OF OLD BOSSES TWICE AS OFTEN.', mods: { miniMul: 2 } },
  { name: 'THE LAST TOLL', desc: 'BOSSES HAVE 25% MORE HEALTH AND DAMAGE.', mods: { bossHp: 1.25, bossDmg: 1.25 } },
];
export const MAX_TOLL = 20;
export const tollsOpen = (meta) => Math.max(0, Math.min(MAX_TOLL, (meta && meta.tolls && meta.tolls.max) | 0));
// every rule of the Tolls up to `toll`, folded: multipliers multiply, adds add, flags stay set
export function tollMods(toll) {
  const out = { foeHp: 1, foeDmg: 1, bossHp: 1, bossDmg: 1, shrineMul: 1, lampMul: 1, emberMul: 1, eliteMul: 1, miniMul: 1, crowdAdd: 0, tonicAdd: 0, boonAdd: 0, bossHeal: null, eliteEarly: false, fewShrines: false, startCurse: false, ascended: false };
  for (let i = 1; i <= Math.min(MAX_TOLL, toll | 0); i++) for (const [k, v] of Object.entries(TOLLS[i].mods)) {
    if (typeof v === 'boolean') out[k] = out[k] || v; else if (k.endsWith('Add')) out[k] += v; else if (k === 'bossHeal') out[k] = v; else out[k] *= v;
  }
  return out;
}
export const runToll = (run) => Math.max(0, Math.min(MAX_TOLL, (run && run.toll) | 0));
// the Toll a new run is played at: the one chosen, within what is open
export const chosenToll = (meta) => Math.max(0, Math.min(tollsOpen(meta), (meta && meta.toll) | 0));
export function setToll(meta, n) { meta.toll = Math.max(0, Math.min(tollsOpen(meta), n | 0)); return meta.toll; }

// ------------------------------------------------------------------ the challenge (ASCENT_DESIGN §4)
// The base challenge, the same for every run before the Tolls: foes hit harder and come in larger groups,
// healing is scarce, bosses are tougher. Depth grows it on (per area cleared), across all six acts. Tuned with
// the autoplay balance check (test/balance-run.mjs).
export const DIFF = {
  foeHp: 1.2, foeDmg: 1.3,          // every foe, before depth
  depthHp: 0.07, depthDmg: 0.035,   // per area cleared in the run
  lateHp: 0.05, lateDmg: 0.03,      // more per area cleared past the eleventh (Acts IV-VI are brutal)
  crowd: 0.22, crowdDepth: 0.02,    // the chance of one more foe in a wave (and per area cleared)
  bossHp: 1.3, bossDmg: 1.25,       // every boss
  bossHeal: 0.25,                   // a fallen boss gives back this much health (was 40%)
  shrineHeal: 0.3,                  // a shrine's rest (was 40%)
  lampHeal: 0.12,                   // an old lamp (was 20%)
  arrival: 0.3,                     // the floor on arriving in an area (kept from before: no unfair arrivals)
  baseTonics: 2, startTonics: 1,    // the flask holds two; a run starts with one in it
};
const depthOf = (run) => (run && run.stats && Array.isArray(run.stats.areas) ? run.stats.areas.length : 0);
// how much tougher a regular foe is now: { hp, dmg }
export function foeScale(run, depth = depthOf(run)) {
  const T = tollMods(runToll(run)); const late = Math.max(0, depth - 11);
  return { hp: DIFF.foeHp * T.foeHp * (1 + depth * DIFF.depthHp + late * DIFF.lateHp), dmg: DIFF.foeDmg * T.foeDmg * (1 + depth * DIFF.depthDmg + late * DIFF.lateDmg) };
}
export function bossScale(run) { const T = tollMods(runToll(run)); return { hp: DIFF.bossHp * T.bossHp, dmg: DIFF.bossDmg * T.bossDmg }; }
// the chance that a wave brings one more foe (above 1: one more for sure, and the rest as a chance)
export function crowdChance(run, depth = depthOf(run)) { return DIFF.crowd + depth * DIFF.crowdDepth + tollMods(runToll(run)).crowdAdd; }
export function bossHealFrac(run, meta) { const T = tollMods(runToll(run)); return T.bossHeal === 0 ? 0 : DIFF.bossHeal + 0.08 * towerLevel(meta, 'mend'); }
export function lampHealFrac(run) { return DIFF.lampHeal * tollMods(runToll(run)).lampMul; }
export function arrivalFloor(meta) { return DIFF.arrival + 0.06 * towerLevel(meta, 'breath'); }
export function emberMul(run, meta) { return tollMods(runToll(run)).emberMul * (1 + 0.1 * towerLevel(meta, 'greed')); }
// elites: none in the first two areas (the first one at Toll 2+), then a chance that grows with depth
export function eliteChance(run, depth = depthOf(run)) { const T = tollMods(runToll(run)); const d = T.eliteEarly ? depth + 2 : depth; if (d < 2) return 0; return Math.min(0.45, (d - 1) * 0.045 * T.eliteMul); }
export function boonChoices(run, meta) { return 3 + towerLevel(meta, 'choice') + tollMods(runToll(run)).boonAdd; }

// ------------------------------------------------------------------ mini-bosses (ASCENT_DESIGN §5)
// From Act II on an area may field a returning boss: one stage, about 45% of its health, an ECHO OF THE <NAME>
// banner. The pools by act; a level def's `minibosses: [{ from }]` names a pool or a boss type.
export const MINI_POOLS = {
  act1: ['gaoler', 'tallow', 'harbormaster', 'deacon', 'ossuary', 'founder', 'regent', 'silence', 'kingcrab', 'hollowmother', 'ronin', 'smiling', 'pyresaint'],
  act2: ['frostgiant', 'sandwyrm', 'lich', 'archon'],
  act3: ['bogmother', 'clockmaster'],
};
// the tier each returning boss was made for (its own area's), so an echo is scaled to the area it returns in
export const MINI_TIER = { gaoler: 0, tallow: 1, harbormaster: 2, deacon: 3, ossuary: 4, founder: 5, regent: 6, silence: 7, kingcrab: 2, hollowmother: 4, ronin: 6, smiling: 1, pyresaint: 5,
  frostgiant: 8, sandwyrm: 9, lich: 10, archon: 11, bogmother: 12, clockmaster: 13 };
// the pool of echoes for an area of this act: everything from the acts before it
export const miniPoolFor = (act) => (act <= 2 ? MINI_POOLS.act1 : (act === 3 ? [...MINI_POOLS.act1, ...MINI_POOLS.act2] : [...MINI_POOLS.act1, ...MINI_POOLS.act2, ...MINI_POOLS.act3]));
// The echoes an area fields this time (seeded per node): the level def's own (`minibosses: [{ from, x, z }]`, placed
// where it says) and the automatic ones (miniCount), each tied to one of the area's fights (`encs`: their ids, the
// first left out when there are more). known(type): the boss can be fielded. Returns [{ type, x, z } | { type, enc }].
export function miniPlan(run, meta, node, { encs = [], defMinis = [], known = null, exclude = [] } = {}) {
  if (!run || !node) return [];
  const rng = rngOf(hashSeed(run.seed, node.id || node.area, 'minis')); const act = node.act || run.act || 1; const out = []; const used = [...exclude];
  for (const m of defMinis || []) {
    const from = m.from || (act >= 3 ? null : 'act1'); const t = MINI_POOLS[from] ? pickMini(rng, from, meta, { exclude: used, known }) : (known && !known(from) ? null : from);
    if (t) { used.push(t); out.push({ type: t, x: m.x, z: m.z }); }
  }
  const c = miniCount(run, act); let n = Math.floor(c) + (rng() < c % 1 ? 1 : 0); n = Math.max(0, n - out.length);
  const slots = encs.length > 1 ? encs.slice(1) : encs.slice();
  for (let i = 0; i < n && slots.length; i++) {
    const pool = miniPoolFor(act).filter((t) => !used.includes(t) && (!known || known(t))); if (!pool.length) break;
    const met = pool.filter((t) => meta && meta.codex && meta.codex.bosses && meta.codex.bosses[t]); const src = met.length && rng() < 0.75 ? met : pool;
    const t = src[Math.floor(rng() * src.length)]; used.push(t);
    const k = Math.floor(rng() * slots.length); out.push({ type: t, enc: slots.splice(k, 1)[0] });
  }
  return out;
}
// how strong an echo is: about 45% of the health its boss would have here, its damage scaled to this tier
export function miniScale(run, type, tier) {
  const own = MINI_TIER[type] ?? tier; const B = bossScale(run);
  return { hp: 0.45 * B.hp * (1 + tier * 0.32) / (1 + own * 0.32), dmg: B.dmg * Math.max(0.8, (1 + tier * 0.16) / (1 + own * 0.16)) };
}
// how many automatic echoes an area of this act fields (a fraction is a chance): none in Act I, about one from
// Act II, rising with depth
export function miniCount(run, act, depth = depthOf(run)) { if ((act | 0) < 2) return 0; return Math.min(3, (0.5 + (act - 2) * 0.3 + Math.max(0, depth - 5) * 0.03) * tollMods(runToll(run)).miniMul); }
// pick a returning boss from a pool: prefer those this warden has met (meta.codex.bosses), never the area's own boss
export function pickMini(rng, from, meta, { exclude = [], known = null } = {}) {
  let pool = MINI_POOLS[from] ? MINI_POOLS[from].slice() : (from ? [from] : [...MINI_POOLS.act1, ...MINI_POOLS.act2]);
  pool = pool.filter((t) => !exclude.includes(t) && (!known || known(t))); if (!pool.length) return null;
  const met = pool.filter((t) => meta && meta.codex && meta.codex.bosses && meta.codex.bosses[t]);
  const src = met.length && rng() < 0.75 ? met : pool; return src[Math.floor(rng() * src.length)];
}

// ------------------------------------------------------------------ the run
export function newRun(meta, heroId, seed = (Date.now() >>> 0)) {
  if (!HEROES[heroId]) heroId = 'warden';
  const M = masteryOf(meta, heroId); const L = M.level;
  const talents = M.talents.filter((id) => talentsOf(heroId).some((t) => t.id === id && t.level <= L)).slice(0, talentSlots(L));
  let embers = 30 * towerLevel(meta, 'purse');
  for (const id of talents) { const T = talentsOf(heroId).find((t) => t.id === id); if (T && T.run && T.run.embers) embers += T.run.embers; }
  const run = {
    v: RUN_VERSION, seed: seed >>> 0, hero: heroId, act: 1, map: null, at: null, visited: [], cleared: [],
    hp: null, maxHp: null, tonics: null, embers, boons: [], echoes: [], relics: [], weapon: START_WEAPON[HEROES[heroId].weapon], curses: [],
    flags: {}, talents, rerolls: towerLevel(meta, 'reroll'), mercy: towerLevel(meta, 'mercy'), depth: 0, tier: 0, time: 0, toll: chosenToll(meta),
    blessing: towerLevel(meta, 'blessing') > 0 ? (towerLevel(meta, 'anoint') > 0 ? 'rare' : 'common') : null,
    stats: { kills: 0, freed: 0, healed: 0, tonics: 0, damageTaken: 0, bosses: [], areas: [], boons: 0, shrines: 0, perfects: 0, elites: 0 },
    quest: { active: [] }, over: null, metaTower: { haggle: towerLevel(meta, 'haggle') },
  };
  // Toll 11: a run begins under a curse (C's events CURSES), seeded
  if (tollMods(run.toll).startCurse) { const CU = Object.keys((P.events && P.events.CURSES) || {}); if (CU.length) run.curses.push(CU[Math.floor(rngOf(hashSeed(seed, 'curse'))() * CU.length)]); }
  run.map = buildMap(run.seed, 1, meta, run);
  return run;
}
export const currentNode = (run) => (run && run.at ? nodeById(run.map, run.at) : null);
// the nodes the player may go to now: the act's first row, or the current node's next ones once it is cleared
export function nextNodes(run) {
  if (!run || !run.map) return [];
  if (!run.at) return run.map.start.map((id) => nodeById(run.map, id)).filter(Boolean);
  const cur = currentNode(run); if (!cur) return [];
  if (!run.cleared.includes(cur.id)) return [];
  return cur.next.map((id) => nodeById(run.map, id)).filter(Boolean);
}
// step onto a node (one of nextNodes); returns the node, or null if it cannot be reached from here
export function enterNode(run, id) {
  const n = nextNodes(run).find((x) => x.id === id); if (!n) return null;
  run.at = id; run.visited.push(id); run.depth++;
  if (n.tier !== undefined && (n.kind === 'area' || n.kind === 'boss')) run.tier = Math.max(run.tier || 0, n.tier);
  return n;
}
// the node is done (its fight won, its event answered, the shrine left)
export function completeNode(run, extra = {}) {
  const n = currentNode(run); if (!n || run.cleared.includes(n.id)) return n;
  run.cleared.push(n.id);
  if (n.kind === 'area' || n.kind === 'boss') { if (!run.stats.areas.includes(n.area)) run.stats.areas.push(n.area); if (extra.boss && !run.stats.bosses.includes(extra.boss)) run.stats.bosses.push(extra.boss); }
  if (extra.echo && ECHOES[extra.echo] && !run.echoes.includes(extra.echo)) run.echoes.push(extra.echo);
  if (n.kind === 'shrine') run.stats.shrines++;
  return n;
}
// After an act's boss: the next act's map (true), or the end of the road (false: the ending)
// (an act still locked for this save, or not built yet, ends the run there: the road goes on, another time)
export function advanceAct(run, meta) {
  const next = (run.act | 0) + 1;
  if (next > LAST_ACT || !actUnlocked(meta, next) || !actPlayable(next)) return false;
  run.act = next; run.map = buildMap(run.seed, run.act, meta, run); run.at = null;
  return true;
}
// why the road stops after this act: 'end' (the last act), 'locked' (the next act's gate is shut), 'unbuilt'
export function roadEnd(run, meta) { const next = (run.act | 0) + 1; return next > LAST_ACT ? 'end' : (!actUnlocked(meta, next) ? 'locked' : (!actPlayable(next) ? 'unbuilt' : null)); }
export const actOver = (run) => { const n = currentNode(run); return !!(n && n.kind === 'boss' && run.cleared.includes(n.id)); };

// the armor tier a warden has earned by this depth: the first pieces in Act I's second area, the full harness deep in
export const autoArmor = (tier) => Math.max(0, Math.min(MAX_ARMOR, Math.floor((tier + 1) / 3)));
// How strong the warden is at this depth: the level and the weapon follow the deepest area tier reached (the curve
// the balance tests use); boons, talents and the Tower come on top. A virtual save for heroes.heroStats().
export function statSave(run, meta) {
  const H = HEROES[run.hero]; const tier = run.tier || 0;
  const level = Math.min(MAX_LEVEL, 1 + Math.round(tier * 2.6));
  const ws = weaponsOfType(H.weapon); const auto = ws[Math.min(ws.length - 1, Math.floor(tier / 2))] || START_WEAPON[H.weapon];
  const own = WEAPONS[run.weapon] ? run.weapon : auto; const weapon = (WEAPONS[own].tier >= WEAPONS[auto].tier) ? own : auto;
  const armor = Math.max(run.armorTier | 0, autoArmor(tier)); // the armor, like the weapon, follows the depth
  const ranks = {}; for (const a of H.abilities) ranks[a] = clamp(1 + Math.floor(tier / 3), 1, 5); ranks[H.ult] = clamp(1 + Math.floor(tier / 4), 1, 5);
  const heroes = {}; for (const id of HERO_ORDER) heroes[id] = { level, xp: 0, points: 0, weapon: id === run.hero ? weapon : START_WEAPON[HEROES[id].weapon], owned: [weapon], plus: { [weapon]: Math.min(10, Math.round(tier * 0.7)) }, ranks: id === run.hero ? ranks : {}, equipped: HEROES[id].abilities.slice(0, 2), armor: id === run.hero ? armor : autoArmor(tier) };
  const echoes = [...new Set([...(run.echoes || [])])];
  return {
    v: 2, hero: run.hero, heroes, unlocked: [run.hero, ...((meta && meta.friends) || []).filter((h) => h !== run.hero)],
    relicsOn: (run.relics || []).slice(0, 4), relicsOwned: (run.relics || []).slice(), echoes: [...new Set([...echoes, ...Object.keys((meta && meta.codex && meta.codex.echoes) || {})])],
    echoesOn: echoes.slice(-3), echoesAsc: [], ngPlus: echoes.length > 2 ? 1 : 0, tonicUp: 0, bossTonics: 0, embers: run.embers | 0, flags: run.flags,
    bosses: {}, cleared: {}, items: {}, bestiary: (meta && meta.codex && meta.codex.foes) || {}, seen: {}, endings: (meta && meta.codex && meta.codex.endings) || [],
  };
}
// talents, the Tower and curses on top of heroStats() (pure: returns a new stats object)
export function applyRunStats(stats, run, meta) {
  const s = { ...stats }; const tl = (id) => towerLevel(meta, id);
  let hpMul = (1 + 0.05 * tl('vigor')) * (1 + 0.06 * tl('heart')); let tonics = tl('flask') + tollMods(runToll(run)).tonicAdd;
  // the Bell Tower: ARMS, GRACE, VIGOUR
  s.dmgMul *= (1 + 0.04 * tl('edge')) * (1 + 0.05 * tl('steel')); s.crit = (s.crit || 0) + 0.03 * tl('crit');
  s.cdMul = (s.cdMul || 1) * (1 - 0.05 * tl('focus')); s.ultRate = (s.ultRate || 1) * (1 + 0.08 * tl('ult'));
  s.speedMul = (s.speedMul || 1) * (1 + 0.03 * tl('swift')); s.dashCharges = (s.dashCharges || 1) + tl('wind');
  s.dmgTaken = (s.dmgTaken || 1) * (1 - 0.04 * tl('hide')) * (1 - 0.05 * tl('bulwark')); s.tonicHeal = (s.tonicHeal || 0.45) * (1 + 0.1 * tl('draught'));
  s.traits = (run.talents || []).filter((id) => talentsOf(run.hero).some((t) => t.id === id && t.trait)); // sim_traits.js
  for (const id of run.talents || []) {
    const T = talentsOf(run.hero).find((t) => t.id === id); const m = T && T.mods; if (!m) continue;
    if (m.hpMul) hpMul *= m.hpMul; if (m.dmgMul) s.dmgMul *= m.dmgMul; if (m.speedMul) s.speedMul = (s.speedMul || 1) * m.speedMul;
    if (m.tonics) tonics += m.tonics; if (m.cdMul) s.cdMul = (s.cdMul || 1) * m.cdMul; if (m.crit) s.crit = (s.crit || 0) + m.crit;
    if (m.dmgTaken) s.dmgTaken = (s.dmgTaken || 1) * m.dmgTaken; if (m.tonicHeal) s.tonicHeal = (s.tonicHeal || 0.45) * m.tonicHeal; if (m.ultRate) s.ultRate = (s.ultRate || 1) * m.ultRate;
  }
  // curses (C's events.js CURSES: a drawback with an upside)
  const CU = (P.events && P.events.CURSES) || {};
  for (const c of run.curses || []) {
    const m = (CU[typeof c === 'string' ? c : c && c.id] || {}).mods; if (!m) continue;
    if (m.maxHpMul) hpMul *= m.maxHpMul; if (m.dmgMul) s.dmgMul *= m.dmgMul; if (m.dmgTakenMul) s.dmgTaken = (s.dmgTaken || 1) * m.dmgTakenMul;
    if (m.speedMul) s.speedMul = (s.speedMul || 1) * m.speedMul; if (m.tonicHealMul) s.tonicHeal = (s.tonicHeal || 0.45) * m.tonicHealMul; if (m.tonicAdd) tonics += m.tonicAdd;
    if (m.critAdd) s.crit = (s.crit || 0) + m.critAdd; if (m.skillCdMul) s.cdMul = (s.cdMul || 1) * m.skillCdMul; if (m.ultChargeMul) s.ultRate = (s.ultRate || 1) * m.ultChargeMul;
  }
  // past the deepest level (tier 11, Act II's end) the warden still grows a little with each tier: the Ascent's
  // foes grow faster, so Acts IV-VI stay brutal
  const past = Math.max(0, (run.tier || 0) - 11); if (past) { hpMul *= 1 + 0.04 * past; s.dmgMul *= 1 + 0.06 * past; }
  s.maxHp = Math.round(s.maxHp * hpMul); s.maxTonics = Math.max(1, DIFF.baseTonics + tonics); // a run carries few tonics: shrines and the merchant refill them
  s.revives = (s.revives || 0) + ((run.mercy | 0) > 0 ? 1 : 0);
  return s;
}

// ------------------------------------------------------------------ embers: the shrine and the merchant
export const priceK = (run) => (1 + 0.45 * ((run.act || 1) - 1)) * (1 - 0.08 * ((run && run.metaTower && run.metaTower.haggle) | 0));
export const SHRINE_HEAL = DIFF.shrineHeal;
export const shrineHeal = (meta, run = null) => (DIFF.shrineHeal + 0.08 * towerLevel(meta, 'shrine')) * tollMods(runToll(run)).shrineMul;
export const UPGRADE_COST = { common: 60, rare: 100, epic: 160 };
export const upgradeCost = (run, rarity) => (UPGRADE_COST[rarity] ? Math.round(UPGRADE_COST[rarity] * priceK(run)) : null);
export const rerollCost = (run) => Math.round(35 * priceK(run));
// The merchant's wares for this node (stable for the node: seeded). kind: tonic, heal, boon, upgrade, relic, weapon.
export function merchantStock(run, seed) {
  const rng = rngOf(hashSeed(run.seed, seed || run.at, 'shop')); const k = priceK(run); const items = [];
  items.push({ id: 'tonic', kind: 'tonic', name: 'TONIC', desc: 'ONE MORE TONIC IN YOUR FLASK.', price: Math.round(45 * k) });
  items.push({ id: 'heal', kind: 'heal', name: 'BINDINGS', desc: 'HEAL 40% OF YOUR HEALTH.', price: Math.round(40 * k) });
  items.push({ id: 'boon', kind: 'boon', name: 'A BOTTLED VOICE', desc: 'CHOOSE ONE OF THREE BOONS.', price: Math.round(110 * k) });
  if ((run.boons || []).some((b) => b.rarity !== 'legendary')) items.push({ id: 'upgrade', kind: 'upgrade', name: 'WHETSTONE OF ECHOES', desc: 'RAISE A BOON\'S RARITY.', price: Math.round(90 * k) });
  const relics = shuffle(rng, Object.keys(RELICS).filter((id) => !(run.relics || []).includes(id)));
  for (const id of relics.slice(0, 2)) items.push({ id: 'relic:' + id, kind: 'relic', relic: id, name: RELICS[id].name, desc: RELICS[id].desc, price: Math.round((RELICS[id].price * 0.45) * k) });
  const H = HEROES[run.hero]; const ws = weaponsOfType(H.weapon); const cur = statSave(run).heroes[run.hero].weapon; const next = ws.find((w) => WEAPONS[w].tier === WEAPONS[cur].tier + 1);
  if (next) items.push({ id: 'weapon:' + next, kind: 'weapon', weapon: next, name: WEAPONS[next].name, desc: WEAPONS[next].desc, price: Math.round(150 * (1 + WEAPONS[next].tier * 0.4) * k) });
  const at = statSave(run).heroes[run.hero].armor | 0;
  if (at < MAX_ARMOR) items.push({ id: 'armor:' + (at + 1), kind: 'armor', armor: at + 1, name: armorName(run.hero, at + 1), desc: ARMOR_DESC[at + 1] + ' LESS DAMAGE TAKEN.', price: Math.round(130 * (1 + at * 0.45) * k) });
  return items;
}
// Mastery earned by one match (an area or a boss won), given at once, so a warden can learn a trait mid-run.
// Returns { xp, level, levelAfter, frac0, frac1, learned: [traits unlocked], equipped: [of those, put in a free slot] }.
export function matchXp(meta, run, o = {}) {
  const amt = Math.round(30 + (o.boss ? 50 : 0) + Math.min(30, (o.kills | 0) * 1.5) + Math.min(15, (o.perfects | 0) * 3));
  const m = meta.mastery[run.hero] = meta.mastery[run.hero] || { xp: 0, level: 0, talents: [] };
  const L0 = masteryLevel(m.xp | 0); const frac = (xp, L) => (L >= MASTERY_MAX ? 1 : (xp - masteryNeed(L)) / Math.max(1, masteryNeed(L + 1) - masteryNeed(L)));
  const f0 = frac(m.xp | 0, L0); m.xp = (m.xp | 0) + amt; const L1 = m.level = masteryLevel(m.xp); run.xpGiven = (run.xpGiven | 0) + amt;
  const learned = talentsOf(run.hero).filter((t) => t.level > L0 && t.level <= L1); const equipped = [];
  // a trait learned mid-run goes straight into a free slot, for the rest of this run and the next ones
  for (const t of learned) { m.talents = m.talents || []; run.talents = run.talents || []; if (run.talents.length < talentSlots(L1)) { run.talents.push(t.id); if (!m.talents.includes(t.id)) m.talents.push(t.id); equipped.push(t.id); } }
  return { xp: amt, level: L0, levelAfter: L1, frac0: f0, frac1: frac(m.xp, L1), learned, equipped };
}
// Pay for an item; the run changes where it can by itself (tonic, relic, weapon). Returns { ok, msg, then }:
// then = 'heal' | 'boon' | 'upgrade' for what the game finishes (it knows the health and the boon offers).
export function buyItem(run, item, maxTonics = 99) {
  if (!item) return { ok: false, msg: 'NOTHING THERE' };
  if ((run.bought || []).includes(item.id) && item.kind !== 'tonic') return { ok: false, msg: 'SOLD OUT' };
  if ((run.embers | 0) < item.price) return { ok: false, msg: 'NOT ENOUGH EMBERS' };
  if (item.kind === 'tonic' && run.tonics !== null && run.tonics >= maxTonics) return { ok: false, msg: 'YOUR FLASK IS FULL' };
  run.embers -= item.price; run.bought = run.bought || []; run.bought.push(item.id);
  if (item.kind === 'tonic') { run.tonics = (run.tonics ?? maxTonics - 1) + 1; return { ok: true, msg: 'A TONIC' }; }
  if (item.kind === 'relic') { run.relics.push(item.relic); return { ok: true, msg: 'RELIC: ' + item.name }; }
  if (item.kind === 'weapon') { run.weapon = item.weapon; return { ok: true, msg: 'WEAPON: ' + item.name }; }
  if (item.kind === 'armor') { run.armorTier = Math.max(run.armorTier | 0, item.armor); return { ok: true, msg: 'ARMOR: ' + item.name }; }
  return { ok: true, msg: item.name, then: item.kind };
}
// heal by a fraction of max health (run.hp null = full)
export function healRun(run, frac) { if (run.hp === null || run.maxHp === null) return 0; const before = run.hp; run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * frac)); run.stats.healed += run.hp - before; return run.hp - before; }

// ------------------------------------------------------------------ the end of a run
// Bell Shards by depth: every area and boss pays, deeper acts more, so every failed run buys something in the
// tower; an ending or the end of the open road pays a bonus; the Toll and SHARD SENSE raise it all.
export function shardsFor(run, meta, outcome) {
  const S = run.stats; const ending = String(outcome).startsWith('ending:'); const act = run.act | 0 || 1;
  const areaPay = (S.areas || []).reduce((s, a) => s + 6 + 2 * Math.max(0, (actOfArea(a) || act) - 1), 0);
  const bossPay = (S.bosses || []).length * (10 + 2 * (act - 1)) + ((S.minis | 0) * 4);
  const base = areaPay + bossPay + (act - 1) * 15 + Math.min(25, (S.kills | 0) / 20) + (outcome === 'victory' ? 40 : 0) + (ending ? 100 : 0);
  return Math.round(base * (1 + 0.1 * runToll(run)) * (1 + 0.1 * towerLevel(meta, 'shardk')));
}
// outcome: 'death' | 'victory' (the end of the open road) | 'ending:dawn' | 'ending:silence' | 'ending:song' | 'quit'.
// Pays into meta, returns the summary.
export function endRun(meta, run, outcome = 'death') {
  const S = run.stats; const areas = S.areas.length, bosses = S.bosses.length; const ending = String(outcome).startsWith('ending:') ? outcome.slice(7) : null;
  const shards = shardsFor(run, meta, outcome);
  const masteryXp = Math.max(0, Math.round(S.kills * 1.5 + areas * 30 + bosses * 50 + S.perfects * 3 + (ending ? 250 : 0)) - (run.xpGiven | 0)); // what each match gave is already in (matchXp)
  const before = { done: (meta.done || []).slice(), unlocked: (meta.unlocked || []).slice(), level: masteryOf(meta, run.hero).level, acts: [4, 5, 6].filter((a) => actUnlocked(meta, a)) };
  meta.shards = (meta.shards | 0) + shards;
  const m = meta.mastery[run.hero] = meta.mastery[run.hero] || { xp: 0, level: 0, talents: [] };
  m.xp = (m.xp | 0) + masteryXp; m.level = masteryLevel(m.xp);
  meta.runs = (meta.runs | 0) + 1;
  if (run.act > (meta.best.act | 0) || (run.act === (meta.best.act | 0) && run.depth > (meta.best.depth | 0))) meta.best = { act: run.act, depth: run.depth };
  const cx = meta.codex;
  for (const b of S.bosses) cx.bosses[b] = (cx.bosses[b] | 0) + 1;
  for (const b of run.boons || []) cx.boons[b.id] = true;
  for (const e of run.echoes || []) cx.echoes[e] = true;
  if (ending && !cx.endings.includes(ending)) cx.endings.push(ending);
  // the Tolls: the first full clear opens Toll 1; a clear at Toll N opens N + 1
  const tollBefore = tollsOpen(meta); const toll = runToll(run);
  if (ending && ending !== 'silence') { meta.tolls = meta.tolls || { max: 0, clear: -1 }; meta.tolls.clear = Math.max(meta.tolls.clear ?? -1, toll); meta.tolls.max = Math.min(MAX_TOLL, Math.max(meta.tolls.max | 0, toll + 1)); } // SILENCE ends before the last fight: no Toll
  const tollUp = tollsOpen(meta) > tollBefore ? tollsOpen(meta) : 0;
  // the acts this run opened (the first Wheel, Seraph or First Founder down)
  const actsOpened = [4, 5, 6].filter((a) => actUnlocked(meta, a) && !(before.acts || []).includes(a));
  // challenges (D): tracked at the run's end too; their rewards may unlock wardens
  const track = fn('challenges', 'trackChallenges'); if (track) { try { track(meta, run, { type: 'runEnd', outcome, ending }); } catch (e) { /* */ } }
  const cu = fn('challenges', 'challengeUnlocks'); if (cu) { try { const u = cu(meta); const heroes = Array.isArray(u) ? u : (u && Array.isArray(u.heroes) ? u.heroes : []); for (const h of heroes) if (typeof h === 'string' && HEROES[h] && !meta.unlocked.includes(h)) meta.unlocked.push(h); } catch (e) { /* */ } }
  const CH = (P.challenges && P.challenges.CHALLENGES) || [];
  const chTitle = (id) => { const c = Array.isArray(CH) ? CH.find((x) => x.id === id) : CH[id]; return c ? String(c.title || id).toUpperCase() : String(id).toUpperCase(); };
  const challengesDone = (meta.done || []).filter((id) => !before.done.includes(id));
  const unlocks = (meta.unlocked || []).filter((id) => !before.unlocked.includes(id));
  const lvUp = m.level > before.level;
  run.over = outcome;
  // PROPOSAL: the summary's lines
  const lines = [
    ending ? 'THE RUN ENDS IN ' + ({ dawn: 'DAWN', silence: 'SILENCE', song: 'THE NEW SONG' }[ending] || ending.toUpperCase()) : (outcome === 'quit' ? 'THE RUN WAS ABANDONED' : (outcome === 'victory' ? 'ACT ' + actRoman(run.act) + ' CLEARED. THE ROAD GOES ON' : 'FALLEN IN ACT ' + actRoman(run.act))),
    ...(toll ? ['TOLL ' + toll + ': ' + TOLLS[toll].name] : []),
    'AREAS CLEARED: ' + areas + '   BOSSES: ' + bosses, 'VOICES FREED: ' + S.kills + '   BOONS: ' + (run.boons || []).length,
    '+' + shards + ' BELL SHARDS', '+' + masteryXp + ' MASTERY' + (lvUp ? '   MASTERY ' + m.level + '!' : ''),
    ...challengesDone.map((id) => 'CHALLENGE: ' + chTitle(id)), ...unlocks.map((id) => (HEROES[id] ? HEROES[id].name : id) + ' UNLOCKED'),
    ...actsOpened.map((a) => 'ACT ' + actRoman(a) + ' OPENS: ' + ACTS[a].name), ...(tollUp ? ['TOLL ' + tollUp + ' OPENS: ' + TOLLS[tollUp].name] : []),
  ];
  const mastery = { level: before.level, levelAfter: m.level, xp: m.xp, xpBefore: m.xp - masteryXp, prev: masteryNeed(m.level), next: m.level >= MASTERY_MAX ? null : masteryNeed(m.level + 1) };
  return { outcome, ending, toll, tollUp, actsOpened, victory: outcome === 'victory' || !!ending, hero: run.hero, act: run.act, depth: run.depth, areas, bosses, kills: S.kills, boons: (run.boons || []).length, shards, masteryXp, masteryLevel: m.level, levelUp: lvUp, challengesDone, unlocks, lines, seed: run.seed,
    mastery, stats: { ...S }, run: { hero: run.hero, act: run.act, depth: run.depth, stats: { ...S }, boons: (run.boons || []).slice(), echoes: (run.echoes || []).slice(), relics: (run.relics || []).slice() } };
}
