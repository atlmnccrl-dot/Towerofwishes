// The run: one warden, one seeded route from Gallows Gate to the Empyrean, death ends it (docs/RUN_DESIGN.md).
// Pure (no DOM): the route map per act, moving along it, what a run carries, the merchant's and the shrine's
// wares, the run summary and what it pays into the permanent save (meta), the Bell Tower's upgrades, each
// warden's talents, and the migration of the old v2 save. The game (game.js) stores `meta` and `run`.
//
// Other owners' pure modules are optional here: the quest nodes (C, quests.js), the area variants (C,
// variants.js) and the challenges (D, challenges.js) are imported when present; each use is guarded, so this
// file runs (and its test passes) without them. setProviders() can also hand them in.
import { HEROES, HERO_ORDER, START_HEROES, WEAPONS, RELICS, START_WEAPON, weaponsOfType, ECHOES, MAX_LEVEL } from './heroes.js';

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
// the Empyrean. Ten areas a run. The middle areas are dealt into rows (two per row in Act I), so no route
// can visit an area twice. `tiers`: how hard each area row fights, whatever district it is (a run's order varies).
export const ACTS = {
  1: { name: 'THE CITY', first: 'gate', pool: ['market', 'docks', 'nave', 'undercroft', 'foundry', 'heights'], rows: [2, 2, 2], boss: 'belfry', tiers: { first: 0, rows: [1.5, 3.5, 5.5], boss: 7 } },
  2: { name: 'BEYOND THE WALLS', pool: ['frostmarch', 'ashdunes', 'catacombs'], rows: 'split', boss: 'abyss', tiers: { rows: [8.5, 10], boss: 11 } },
  3: { name: 'THE WHEEL', pool: ['marsh', 'spire'], rows: [2], boss: 'empyrean', tiers: { rows: [12.5], boss: 14 } },
};
export const AREA_NAMES = {
  prologue: 'THE OLD ROAD', gate: 'GALLOWS GATE', market: 'LANTERN ROW', docks: 'MIREWATER DOCKS', nave: 'THE DROWNED NAVE', undercroft: 'THE UNDERCROFT',
  foundry: 'THE BELL FOUNDRY', heights: 'THE CROWN HEIGHTS', belfry: 'THE BELFRY', frostmarch: 'THE FROSTMARCH', ashdunes: 'THE ASH DUNES',
  catacombs: 'THE CATACOMBS', abyss: 'THE ABYSS', marsh: 'THE WEEPING MARSH', spire: 'THE CLOCKWORK SPIRE', empyrean: 'THE EMPYREAN',
};
// the level's own boss (an area variant may draw another from its pool: game.js asks D's bossPool)
export const AREA_BOSS = { gate: 'gaoler', market: 'tallow', docks: 'harbormaster', nave: 'deacon', undercroft: 'ossuary', foundry: 'founder', heights: 'regent', belfry: 'silence',
  frostmarch: 'frostgiant', ashdunes: 'sandwyrm', catacombs: 'lich', abyss: 'archon', marsh: 'bogmother', spire: 'clockmaster', empyrean: 'wheel' };
export const AREA_TIER = { gate: 0, market: 1, docks: 2, nave: 3, undercroft: 4, foundry: 5, heights: 6, belfry: 7, frostmarch: 8, ashdunes: 9, catacombs: 10, abyss: 11, marsh: 12, spire: 13, empyrean: 14 };
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
  // the rows: [kind, contents]
  const rows = [];
  if (A.first) rows.push({ kind: 'area', areas: [A.first], tier: A.tiers.first });
  else rows.push({ kind: 'start' }); // a shrine at the act's threshold (the act's opening scene plays there)
  areaRows.forEach((areas, i) => { rows.push({ kind: 'small' }); rows.push({ kind: 'area', areas, tier: A.tiers.rows[i] }); });
  rows.push({ kind: 'rest' }); // before the boss: a shrine, or a merchant beside it
  rows.push({ kind: 'boss', areas: [A.boss], tier: A.tiers.boss });
  const nodes = []; const byRow = [];
  const N = rows.length;
  rows.forEach((R, ri) => {
    let specs;
    if (R.kind === 'area' || R.kind === 'boss') specs = R.areas.map((a) => ({ kind: R.kind === 'boss' ? 'boss' : 'area', area: a, tier: R.tier }));
    else if (R.kind === 'start') specs = [{ kind: 'shrine', start: true }];
    else if (R.kind === 'rest') specs = rng() < 0.55 ? [{ kind: 'shrine' }, { kind: 'merchant' }] : [{ kind: 'shrine' }];
    else { const n = 2 + (rng() < 0.55 ? 1 : 0); const used = []; specs = []; for (let i = 0; i < n; i++) { const k = smallKind(rng, used.filter((u) => u !== 'event')); used.push(k); specs.push({ kind: k }); } }
    const row = specs.map((s, ci) => {
      const n = specs.length; const x = n === 1 ? 0.5 : 0.18 + (0.64 * ci) / (n - 1) + (rng() - 0.5) * 0.06;
      const node = { id: act + '-' + ri + '-' + ci, kind: s.kind, act, row: ri, x: +clamp(x, 0.06, 0.94).toFixed(3), y: +(ri / (N - 1)).toFixed(3), next: [] };
      if (s.area) { node.area = s.area; node.tier = s.tier; node.boss = AREA_BOSS[s.area]; }
      if (s.start) node.start = true;
      node.label = s.area ? AREA_NAMES[s.area] : NODE_KINDS[s.kind].label; node.icon = NODE_KINDS[s.kind].icon;
      if (s.kind === 'trial') { node.area = pick(rng, A.first ? [A.first, ...A.pool] : A.pool); node.tier = (A.tiers.rows[Math.min(A.tiers.rows.length - 1, Math.floor(ri / 2))] || 0) + 0.5; }
      return node;
    });
    byRow.push(row); nodes.push(...row);
  });
  // edges between neighbouring rows: each node to the node(s) across from it, no crossings
  for (let ri = 0; ri < byRow.length - 1; ri++) linkRows(rng, byRow[ri], byRow[ri + 1]);
  // area variants (C): picked now so the map can show the condition
  const pv = fn('variants', 'pickVariant');
  if (pv) for (const n of nodes) if (n.area && (n.kind === 'area' || n.kind === 'boss')) {
    try { const v = pv(n.area, rngOf(hashSeed(seed, n.id, 'variant')), run); if (v) { n.variant = v.id; if (v.name || v.condition) n.cond = String(v.name || v.condition).toUpperCase(); } } catch (e) { /* a variant table still being built */ }
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
export const talentSlots = (level) => (level >= 8 ? 3 : (level >= 3 ? 2 : 1));
export function masteryOf(meta, heroId) { const m = (meta && meta.mastery && meta.mastery[heroId]) || { xp: 0, level: 0, talents: [] }; return { xp: m.xp | 0, level: masteryLevel(m.xp | 0), talents: Array.isArray(m.talents) ? m.talents : [] }; }

// Talents: small permanent passives, picked at the start of a run (PROPOSAL: every name and line).
// mods multiply or add to the warden's stats (applyRunStats); run: what the run starts with.
const GENERIC_TALENTS = [
  { id: 'vigor', name: 'IRON VIGOR', desc: '+12% MAX HEALTH.', level: 0, mods: { hpMul: 1.12 } },
  { id: 'edge', name: 'WHETTED EDGE', desc: '+8% DAMAGE.', level: 1, mods: { dmgMul: 1.08 } },
  { id: 'purse', name: 'EMBER PURSE', desc: 'START WITH 60 EMBERS.', level: 2, run: { embers: 60 } },
  { id: 'swift', name: 'LIGHT STEP', desc: '+8% MOVE SPEED.', level: 5, mods: { speedMul: 1.08 } },
  { id: 'flask', name: 'DEEP FLASK', desc: 'CARRY ONE MORE TONIC.', level: 7, mods: { tonics: 1 } },
  { id: 'focus', name: 'BELL FOCUS', desc: 'SKILLS RECHARGE 10% FASTER.', level: 9, mods: { cdMul: 0.9 } },
];
const SIGNATURE = {
  warden: { id: 'oath', name: 'THE REFUSED OATH', desc: 'THE ULTIMATE CHARGES 15% FASTER.', mods: { ultRate: 1.15 } },
  huntress: { id: 'hawk', name: 'ROOFTOP EYES', desc: '+8% CRITICAL CHANCE.', mods: { crit: 0.08 } },
  bellbreaker: { id: 'anvil', name: 'ANVIL HIDE', desc: 'TAKE 8% LESS DAMAGE.', mods: { dmgTaken: 0.92 } },
  lamplighter: { id: 'kindle', name: 'KINDLED CARE', desc: 'TONICS HEAL 25% MORE.', mods: { tonicHeal: 1.25 } },
  kestrel: { id: 'cutpurse', name: 'GAOL-QUICK', desc: '+6% DAMAGE AND +5% SPEED.', mods: { dmgMul: 1.06, speedMul: 1.05 } },
  hollis: { id: 'deep', name: 'THE DEEP HOLDS', desc: '+18% MAX HEALTH.', mods: { hpMul: 1.18 } },
  wren: { id: 'hymn', name: 'OLD HYMNS', desc: 'SKILLS RECHARGE 8% FASTER, ULTIMATE 8% FASTER.', mods: { cdMul: 0.92, ultRate: 1.08 } },
};
export const TALENTS = Object.fromEntries(HERO_ORDER.map((id) => [id, [...GENERIC_TALENTS.slice(0, 3), { ...(SIGNATURE[id] || SIGNATURE.warden), level: 4 }, ...GENERIC_TALENTS.slice(3)]]));
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
export const TOWER = [
  { id: 'flask', name: 'A SECOND FLASK RACK', desc: 'CARRY ONE MORE TONIC EACH RUN.', max: 2, cost: [40, 120] },
  { id: 'reroll', name: "THE RINGER'S DICE", desc: 'ONE MORE BOON REROLL EACH RUN.', max: 3, cost: [30, 80, 160] },
  { id: 'purse', name: 'THE EMBER PURSE', desc: 'START EACH RUN WITH 40 MORE EMBERS.', max: 3, cost: [25, 60, 120] },
  { id: 'vigor', name: 'TEMPERED BODY', desc: '+6% MAX HEALTH.', max: 4, cost: [30, 70, 130, 220] },
  { id: 'shrine', name: 'WARMER SHRINES', desc: 'SHRINES HEAL 15% MORE.', max: 2, cost: [40, 100] },
  { id: 'luck', name: 'GILDED OFFERS', desc: 'BOONS COME RARER MORE OFTEN.', max: 3, cost: [50, 120, 240] },
  { id: 'mercy', name: "SAINT'S MERCY", desc: 'ONCE A RUN, RISE AGAIN AT 30% HEALTH.', max: 1, cost: [300] },
];
export const towerUpgrades = TOWER;
export const towerLevel = (meta, id) => Math.max(0, (meta && meta.tower && meta.tower[id]) | 0);
export function towerCost(meta, id) { const T = TOWER.find((t) => t.id === id); const lv = towerLevel(meta, id); return T && lv < T.max ? T.cost[lv] : null; }
export function buyTower(meta, id) {
  const T = TOWER.find((t) => t.id === id); if (!T) return 'NO SUCH UPGRADE';
  const c = towerCost(meta, id); if (c === null) return 'FULLY BUILT';
  if ((meta.shards | 0) < c) return 'NOT ENOUGH SHARDS';
  meta.shards -= c; meta.tower[id] = towerLevel(meta, id) + 1; return T.name + ' ' + meta.tower[id] + '/' + T.max;
}

// ------------------------------------------------------------------ the run
export function newRun(meta, heroId, seed = (Date.now() >>> 0)) {
  if (!HEROES[heroId]) heroId = 'warden';
  const M = masteryOf(meta, heroId); const L = M.level;
  const talents = M.talents.filter((id) => talentsOf(heroId).some((t) => t.id === id && t.level <= L)).slice(0, talentSlots(L));
  let embers = 40 * towerLevel(meta, 'purse');
  for (const id of talents) { const T = talentsOf(heroId).find((t) => t.id === id); if (T && T.run && T.run.embers) embers += T.run.embers; }
  const run = {
    v: RUN_VERSION, seed: seed >>> 0, hero: heroId, act: 1, map: null, at: null, visited: [], cleared: [],
    hp: null, maxHp: null, tonics: null, embers, boons: [], echoes: [], relics: [], weapon: START_WEAPON[HEROES[heroId].weapon], curses: [],
    flags: {}, talents, rerolls: towerLevel(meta, 'reroll'), mercy: towerLevel(meta, 'mercy'), depth: 0, tier: 0, time: 0,
    stats: { kills: 0, freed: 0, healed: 0, tonics: 0, damageTaken: 0, bosses: [], areas: [], boons: 0, shrines: 0, perfects: 0, elites: 0 },
    quest: { active: [] }, over: null,
  };
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
export function advanceAct(run, meta) {
  if (run.act >= 3) return false;
  run.act++; run.map = buildMap(run.seed, run.act, meta, run); run.at = null;
  return true;
}
export const actOver = (run) => { const n = currentNode(run); return !!(n && n.kind === 'boss' && run.cleared.includes(n.id)); };

// How strong the warden is at this depth: the level and the weapon follow the deepest area tier reached (the curve
// the balance tests use); boons, talents and the Tower come on top. A virtual save for heroes.heroStats().
export function statSave(run, meta) {
  const H = HEROES[run.hero]; const tier = run.tier || 0;
  const level = Math.min(MAX_LEVEL, 1 + Math.round(tier * 2.6));
  const ws = weaponsOfType(H.weapon); const auto = ws[Math.min(ws.length - 1, Math.floor(tier / 2))] || START_WEAPON[H.weapon];
  const own = WEAPONS[run.weapon] ? run.weapon : auto; const weapon = (WEAPONS[own].tier >= WEAPONS[auto].tier) ? own : auto;
  const ranks = {}; for (const a of H.abilities) ranks[a] = clamp(1 + Math.floor(tier / 3), 1, 5); ranks[H.ult] = clamp(1 + Math.floor(tier / 4), 1, 5);
  const heroes = {}; for (const id of HERO_ORDER) heroes[id] = { level, xp: 0, points: 0, weapon: id === run.hero ? weapon : START_WEAPON[HEROES[id].weapon], owned: [weapon], plus: { [weapon]: Math.min(10, Math.round(tier * 0.7)) }, ranks: id === run.hero ? ranks : {}, equipped: HEROES[id].abilities.slice(0, 2) };
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
  const s = { ...stats }; let hpMul = 1 + 0.06 * towerLevel(meta, 'vigor'); let tonics = towerLevel(meta, 'flask');
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
  s.maxHp = Math.round(s.maxHp * hpMul); s.maxTonics = Math.max(1, 2 + tonics); // a run carries fewer tonics than the old game: shrines and the merchant refill them
  s.revives = (s.revives || 0) + ((run.mercy | 0) > 0 ? 1 : 0);
  return s;
}

// ------------------------------------------------------------------ embers: the shrine and the merchant
export const priceK = (run) => 1 + 0.45 * ((run.act || 1) - 1);
export const SHRINE_HEAL = 0.4;
export const shrineHeal = (meta) => SHRINE_HEAL + 0.15 * towerLevel(meta, 'shrine');
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
  return items;
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
  return { ok: true, msg: item.name, then: item.kind };
}
// heal by a fraction of max health (run.hp null = full)
export function healRun(run, frac) { if (run.hp === null || run.maxHp === null) return 0; const before = run.hp; run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * frac)); run.stats.healed += run.hp - before; return run.hp - before; }

// ------------------------------------------------------------------ the end of a run
// outcome: 'death' | 'ending:dawn' | 'ending:silence' | 'ending:song' | 'quit'. Pays into meta, returns the summary.
export function endRun(meta, run, outcome = 'death') {
  const S = run.stats; const areas = S.areas.length, bosses = S.bosses.length; const ending = String(outcome).startsWith('ending:') ? outcome.slice(7) : null;
  const shards = Math.round(areas * 4 + bosses * 6 + (run.act - 1) * 12 + (ending ? 60 : 0) + Math.min(20, S.kills / 25));
  const masteryXp = Math.round(S.kills * 1.5 + areas * 30 + bosses * 50 + S.perfects * 3 + (ending ? 250 : 0));
  const before = { done: (meta.done || []).slice(), unlocked: (meta.unlocked || []).slice(), level: masteryOf(meta, run.hero).level };
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
    ending ? 'THE RUN ENDS IN ' + ({ dawn: 'DAWN', silence: 'SILENCE', song: 'THE NEW SONG' }[ending] || ending.toUpperCase()) : (outcome === 'quit' ? 'THE RUN WAS ABANDONED' : 'FALLEN IN ACT ' + ['I', 'II', 'III'][run.act - 1]),
    'AREAS CLEARED: ' + areas + '   BOSSES: ' + bosses, 'VOICES FREED: ' + S.kills + '   BOONS: ' + (run.boons || []).length,
    '+' + shards + ' BELL SHARDS', '+' + masteryXp + ' MASTERY' + (lvUp ? '   MASTERY ' + m.level + '!' : ''),
    ...challengesDone.map((id) => 'CHALLENGE: ' + chTitle(id)), ...unlocks.map((id) => (HEROES[id] ? HEROES[id].name : id) + ' UNLOCKED'),
  ];
  return { outcome, ending, hero: run.hero, act: run.act, depth: run.depth, areas, bosses, kills: S.kills, boons: (run.boons || []).length, shards, masteryXp, masteryLevel: m.level, levelUp: lvUp, challengesDone, unlocks, lines, seed: run.seed };
}
