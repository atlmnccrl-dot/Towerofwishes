// Where the screens get the data they do not receive in open(): B's RES and BOONS, D's CHALLENGES, A's
// Bell Tower upgrades and talents, C's EVENTS. A can hand them over with provide({...}); otherwise
// loadData() looks for the owners' modules and takes what it finds. Anything still missing falls back to
// the SAMPLE data shaped like the contract (js/ui/sample.js), so every screen always draws.
import * as S from './sample.js';

export const DATA = { RES: null, BOONS: null, CHALLENGES: null, EVENTS: null, TOWER: null, TALENTS: null, LORE: null, ENDINGS: null, MASTERY: null, loaded: false, sample: [] };
export function provide(o) { Object.assign(DATA, o || {}); }

// the first export that exists under any of the names
const pick = (m, names) => { for (const n of names) if (m && m[n] !== undefined) return m[n]; return null; };
let loading = null;
export function loadData() {
  if (loading) return loading;
  const tryMod = (path, fn) => import(path).then(fn, () => {});
  loading = Promise.all([
    tryMod('../game/boons.js', (m) => { DATA.RES = DATA.RES || pick(m, ['RES', 'RESONANCES']); DATA.BOONS = DATA.BOONS || pick(m, ['BOONS']); DATA.BOONTEXT = DATA.BOONTEXT || (typeof m.boonText === 'function' ? m.boonText : null); }),
    tryMod('../game/challenges.js', (m) => { DATA.CHALLENGES = DATA.CHALLENGES || pick(m, ['CHALLENGES']); }),
    tryMod('../game/run.js', (m) => { DATA.TOWER = DATA.TOWER || pick(m, ['towerUpgrades', 'TOWER_UPGRADES', 'TOWER']); DATA.TALENTS = DATA.TALENTS || pick(m, ['TALENTS', 'talents']);
      if (!DATA.MASTERY && m.masteryLevel && m.masteryNeed) DATA.MASTERY = { masteryLevel: m.masteryLevel, masteryNeed: m.masteryNeed, talentSlots: m.talentSlots }; }),
    tryMod('../game/events.js', (m) => { DATA.EVENTS = DATA.EVENTS || pick(m, ['EVENTS', 'DECK']); DATA.LORE = DATA.LORE || pick(m, ['LORE']); }),
  ]).then(() => { DATA.loaded = true; });
  return loading;
}

const list = (x) => (!x ? [] : Array.isArray(x) ? x : Object.keys(x).map((k) => ({ id: k, ...x[k] })));
const use = (key, fallback) => { const v = DATA[key]; if (v) return v; if (!DATA.sample.includes(key)) DATA.sample.push(key); return fallback; };
export const boonList = () => list(use('BOONS', S.BOONS));
export function boonDef(id) { const B = use('BOONS', S.BOONS); if (!id) return null; if (Array.isArray(B)) return B.find((b) => b.id === id) || null; return B[id] ? { id, ...B[id] } : null; }
export const challengeList = () => list(use('CHALLENGES', S.CHALLENGES));
export const towerList = () => list(use('TOWER', S.TOWER));
export const loreList = () => list(use('LORE', S.LORE));
export const endingList = () => list(use('ENDINGS', S.ENDINGS));
export function talentsOf(hero) { const T = use('TALENTS', S.TALENTS); const t = typeof T === 'function' ? T(hero) : T[hero]; return list(t || []); }
// a warden's mastery: level, xp, the fraction of the way to the next level, talents, talent slots
// (A's curve from run.js when it is there; otherwise the meta's own level and next)
export function masteryInfo(meta, hero) {
  const m = ((meta && meta.mastery) || {})[hero] || { xp: 0 }; const xp = m.xp | 0; const M = DATA.MASTERY;
  if (M) { const L = M.masteryLevel(xp); const a = M.masteryNeed(L), b = M.masteryNeed(L + 1); return { level: L, xp, frac: b > a ? (xp - a) / (b - a) : 1, talents: m.talents || [], slots: M.talentSlots ? M.talentSlots(L) : 2, need: M.masteryNeed }; }
  const L = m.level ?? 1; return { level: L, xp, frac: m.next ? xp / m.next : (xp % 100) / 100, talents: m.talents || [], slots: 2 };
}
// a challenge's progress as { n, of } (D's progress(meta), else the meta's tracking against its goal)
export function challengeProgress(c, meta) {
  const done = (meta.done || []).includes(c.id);
  try { if (typeof c.progress === 'function') { const p = c.progress(meta) || {}; const of = Math.max(1, +p.of || +c.goal || 1); return { n: done ? of : clampN(+p.n || 0, of), of, done }; } } catch (e) { /* fall through */ }
  const raw = (meta.challenges || {})[c.id]; const of = Math.max(1, +(typeof c.goal === 'number' ? c.goal : (c.goal && c.goal.n)) || 1);
  const n = typeof raw === 'number' ? raw : (raw && typeof raw.n === 'number' ? raw.n : 0);
  return { n: done ? of : clampN(n, of), of, done };
}
const clampN = (n, of) => Math.max(0, Math.min(of, n));
// what a challenge rewards, as { kind, id }
export function rewardOf(c) { const r = c.reward || {}; for (const k of ['hero', 'boon', 'res', 'echo', 'colour', 'color', 'event', 'talent']) if (r[k] !== undefined) return { kind: k === 'color' ? 'colour' : k, id: r[k] }; return { kind: 'none', id: null }; }
// a tower upgrade's cost at a level (cost may be an array, a function or a number)
export function towerCost(u, lv) { const c = u.cost ?? u.costs ?? u.price; if (Array.isArray(c)) return c[lv] ?? null; if (typeof c === 'function') return c(lv); if (typeof c === 'number') return Math.round(c * (lv + 1)); return null; }
export const towerMax = (u) => u.max ?? u.maxLevel ?? (Array.isArray(u.cost) ? u.cost.length : 1);
export { S as SAMPLE };
