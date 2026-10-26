// The company's progress: the save, rewards, levels, gear, training and ability upgrades.
// Pure functions over a plain save object (no DOM), so Node tests can play the whole campaign.
import { UNITS, CLASSES } from '../data/units.js';
import { MISSIONS, START_ROSTER, START_TEAM, missionById } from '../data/campaign.js';
import { SLOTS, BASES, itemStats, upgradeCost, sellValue, rollItem, MAX_PLUS } from '../data/items.js';
import { MOD_KEYS } from '../combat/battle.js';

export const SAVE_VERSION = 1;
export const MAX_LEVEL = 60;
export const MAX_TEAM = 5;
export const TRAIN_MAX = 30;
export const TRAIN = { hp: 0.03, atk: 0.03, def: 0.035 };      // per rank
export const UPGRADE_LEVELS = [4, 8, 20, 35];
export const BENCH_XP = 0.7;   // what recruits left at camp learn from a win
export const HEROIC = { level: 5, might: 1.3, gold: 1.6, xp: 1.4, loot: 0.35 };

// Ability upgrades: four picks of one from two, at levels 4, 8, 20 and 35 (8 and 35 depend on the class).
const T1 = [
  { id: 'empower', name: 'Empowered', desc: 'Ability 40% stronger.', mods: { power: 0.4 } },
  { id: 'quicken', name: 'Quickened', desc: 'Gains energy 30% faster.', mods: { energy: 0.3 } },
];
const T2 = {
  vanguard: [{ id: 'bastion', name: 'Bastion', desc: 'Takes 12% less damage.', mods: { dr: 0.12 } },
    { id: 'ironwill', name: 'Iron Will', desc: '+15% health and +10% attack.', mods: { hp: 0.15, atk: 0.1 } }],
  striker: [{ id: 'bloodlust', name: 'Bloodlust', desc: 'Heals for 12% of damage dealt.', mods: { lifesteal: 0.12 } },
    { id: 'precision', name: 'Precision', desc: '+15% critical chance.', mods: { crit: 0.15 } }],
  ranger: [{ id: 'rapid', name: 'Rapid Fire', desc: '+20% attack speed.', mods: { spd: 0.2 } },
    { id: 'deadeye', name: 'Deadeye', desc: '+15% critical chance.', mods: { crit: 0.15 } }],
  mystic: [{ id: 'primed', name: 'Primed', desc: 'Starts each battle with 70 energy.', mods: { start: 70 } },
    { id: 'overcharge', name: 'Overcharge', desc: 'Ability 40% stronger.', mods: { power: 0.4 } }],
  support: [{ id: 'blessing', name: 'Blessing', desc: '+30% healing and shields.', mods: { healPower: 0.3, power: 0.15 } },
    { id: 'ready', name: 'Ready Hands', desc: 'Starts each battle with 60 energy.', mods: { start: 60 } }],
};
const T3 = [
  { id: 'veteran', name: 'Veteran', desc: '+15% health and defence.', mods: { hp: 0.15, def: 0.15 } },
  { id: 'ruthless', name: 'Ruthless', desc: '+15% attack and +5% critical chance.', mods: { atk: 0.15, crit: 0.05 } },
];
const T4 = {
  vanguard: [{ id: 'unbreakable', name: 'Unbreakable', desc: 'Takes 15% less damage, +10% health.', mods: { dr: 0.15, hp: 0.1 } },
    { id: 'juggernaut', name: 'Juggernaut', desc: '+20% health, +10% attack, heals for 6% of damage dealt.', mods: { hp: 0.2, atk: 0.1, lifesteal: 0.06 } }],
  striker: [{ id: 'assassin', name: 'Assassin', desc: '+20% critical chance, +10% attack.', mods: { crit: 0.2, atk: 0.1 } },
    { id: 'whirlwind', name: 'Whirlwind', desc: '+25% attack speed, +20% energy gain.', mods: { spd: 0.25, energy: 0.2 } }],
  ranger: [{ id: 'volley', name: 'Volley Master', desc: 'Ability 50% stronger, +20% energy gain.', mods: { power: 0.5, energy: 0.2 } },
    { id: 'sniper', name: 'Sniper', desc: '+25% attack, +10% critical chance.', mods: { atk: 0.25, crit: 0.1 } }],
  mystic: [{ id: 'archmage', name: 'Archmage', desc: 'Ability 60% stronger.', mods: { power: 0.6 } },
    { id: 'wellspring', name: 'Wellspring', desc: '+45% energy gain, +10% health.', mods: { energy: 0.45, hp: 0.1 } }],
  support: [{ id: 'saint', name: 'Saint', desc: '+40% healing, ability 20% stronger.', mods: { healPower: 0.4, power: 0.2 } },
    { id: 'beacon', name: 'Beacon', desc: '+30% energy gain, +15% health.', mods: { energy: 0.3, hp: 0.15 } }],
};
export const upgradeChoices = (key, tier) => [T1, T2[UNITS[key].cls], T3, T4[UNITS[key].cls]][tier];

// ---- the save
export function newSave() {
  const s = { v: SAVE_VERSION, gold: 120, gems: 50, roster: {}, inv: [], uid: 1, cleared: {}, heroic: {}, team: START_TEAM.map((m) => ({ ...m })), joined: [], speed: 1, seed: 7,
    stats: { wins: 0, losses: 0, kills: 0, bosses: 0, stars3: 0, trained: 0, upgraded: 0, bought: 0 }, flags: {},
    settings: { music: 0.6, sfx: 0.8, shake: true } };
  for (const k of START_ROSTER) s.roster[k] = newMember(1);
  return s;
}
function newMember(level) { return { level, xp: 0, gear: { weapon: null, armor: null, charm: null }, train: { hp: 0, atk: 0, def: 0 }, ups: [null, null, null, null] }; }
// a stored save made whole again (missing fields filled, unknown units and items dropped)
export function loadSave(raw) {
  const s = newSave();
  if (!raw || raw.v !== SAVE_VERSION) return s;
  Object.assign(s, raw);
  for (const k of Object.keys(s.roster)) {
    if (!UNITS[k]) { delete s.roster[k]; continue; }
    const m = s.roster[k] = Object.assign(newMember(1), s.roster[k]);
    while (m.ups.length < UPGRADE_LEVELS.length) m.ups.push(null);
  }
  s.stats = Object.assign(newSave().stats, raw.stats); s.flags = Object.assign({}, raw.flags); s.heroic = Object.assign({}, raw.heroic);
  s.settings = Object.assign(newSave().settings, raw.settings);
  if (typeof s.gems !== 'number') s.gems = 50;
  s.inv = (s.inv || []).filter((it) => BASES[it.base]);
  s.team = (s.team || []).filter((m) => s.roster[m.key] && m.slot >= 0 && m.slot < 6).slice(0, MAX_TEAM);
  for (const m of Object.values(s.roster)) for (const sl of SLOTS) if (m.gear[sl] && !s.inv.some((it) => it.uid === m.gear[sl])) m.gear[sl] = null;
  return s;
}

// ---- levels
export const xpNeed = (level) => 50 + level * 30;
export function addXp(s, key, xp) {
  const m = s.roster[key], from = m.level;
  m.xp += xp;
  while (m.level < MAX_LEVEL && m.xp >= xpNeed(m.level)) { m.xp -= xpNeed(m.level); m.level++; }
  if (m.level >= MAX_LEVEL) m.xp = 0;
  return m.level - from;
}

// ---- what a recruit takes into battle
export function itemByUid(s, uid) { return s.inv.find((it) => it.uid === uid) || null; }
export function modsOf(s, key) {
  const m = s.roster[key], out = {};
  const add = (o) => { for (const [k, v] of Object.entries(o)) out[k] = (out[k] || 0) + v; };
  for (const [k, r] of Object.entries(m.train)) if (r) add({ [k]: TRAIN[k] * r });
  for (const sl of SLOTS) { const it = m.gear[sl] && itemByUid(s, m.gear[sl]); if (it) add(itemStats(it)); }
  m.ups.forEach((id, tier) => { const u = id && upgradeChoices(key, tier).find((c) => c.id === id); if (u) add(u.mods); });
  for (const k of Object.keys(out)) if (!MOD_KEYS.includes(k)) delete out[k];
  return out;
}
export const teamFor = (s) => s.team.map((m) => ({ key: m.key, slot: m.slot, level: s.roster[m.key].level, mods: modsOf(s, m.key) }));
// a rough strength number for the screens (not used by the battle)
export function power(s, key) {
  const m = s.roster[key], mods = modsOf(s, key), d = UNITS[key].stats, k = 1 + 0.08 * (m.level - 1);
  return Math.round((d.hp * (1 + (mods.hp || 0)) / 10 + d.atk * (1 + (mods.atk || 0)) * 2 + d.def * (1 + (mods.def || 0))) * k * (1 + (mods.crit || 0) + (mods.power || 0) * 0.3 + (mods.spd || 0)));
}

// ---- rewards after a battle
// stars: 1 for a win, 2 if at most one recruit fell, 3 if nobody did
export function starsFor(b) {
  if (b.result !== 'win') return 0;
  const fell = b.units.filter((u) => u.team === 'ally' && !u.summoned && u.state === 'ko').length;
  return fell === 0 ? 3 : fell === 1 ? 2 : 1;
}
export const missionXp = (m) => 30 + 18 * m.level;
export const missionGold = (m) => 40 + 20 * m.level;
// what a battle for this mission looks like: its foes, their level and strength (heroic: tougher)
export function battleSpec(m, heroic = false) {
  return { foes: m.foes, level: m.level + (heroic ? HEROIC.level : 0), might: (m.might || 1) * (heroic ? HEROIC.might : 1) };
}

// Applies a finished battle to the save. Returns what to show: stars, gold, xp per recruit with
// level-ups, loot, and who joined. A loss changes nothing (nothing is ever lost).
export function grantRewards(s, missionId, b, rnd, heroic = false) {
  const m = missionById(missionId), stars = starsFor(b), book = heroic ? s.heroic : s.cleared;
  const out = { win: stars > 0, stars, first: false, gold: 0, gems: 0, xp: [], loot: [], joined: null, best: book[missionId] || 0, heroic };
  const kills = b.units.filter((u) => u.team === 'foe' && !u.summoned && u.state === 'ko');
  s.stats.kills += kills.length;
  if (!out.win) { s.stats.losses++; return out; }
  s.stats.wins++; s.stats.bosses += kills.filter((u) => u.def.boss).length; if (stars === 3) s.stats.stars3++;
  out.first = !book[missionId];
  // gems: a first clear of a boss, three stars for the first time, a first heroic clear
  if (out.first && m.boss && !heroic) out.gems += 25;
  if (stars === 3 && (book[missionId] || 0) < 3) out.gems += heroic ? 10 : 5;
  book[missionId] = Math.max(stars, book[missionId] || 0);
  s.gems += out.gems;
  out.gold = Math.round(missionGold(m) * (out.first ? 2 : 1) * (0.8 + stars * 0.1) * (heroic ? HEROIC.gold : 1));
  s.gold += out.gold;
  const xp = Math.round(missionXp(m) * (out.first ? 1.5 : 1) * (heroic ? HEROIC.xp : 1));
  const inTeam = new Set(s.team.map((t) => t.key));
  for (const key of Object.keys(s.roster)) {
    const share = inTeam.has(key) ? xp : Math.round(xp * BENCH_XP);   // the bench learns at camp
    const from = s.roster[key].level, gained = addXp(s, key, share);
    out.xp.push({ key, xp: share, from, to: from + gained, team: inTeam.has(key) });
  }
  const drops = out.first ? 1 + (stars === 3 ? 1 : 0) : rnd() < 0.35 + stars * 0.1 ? 1 : 0;
  for (let i = 0; i < drops; i++) { const it = Object.assign(rollItem(m.level + (heroic ? HEROIC.level : 0), rnd, heroic ? HEROIC.loot : 0), { uid: s.uid++ }); s.inv.push(it); out.loot.push(it); }
  if (out.first && !heroic && m.recruit && !s.roster[m.recruit]) {
    // a recruit joins at the company's level, so new faces are worth fielding
    const lv = Math.max(1, Math.round(avgLevel(s)));
    s.roster[m.recruit] = newMember(lv); s.joined.push(m.recruit); out.joined = m.recruit;
    if (s.team.length < MAX_TEAM) { const slot = freeSlot(s, m.recruit); if (slot != null) s.team.push({ key: m.recruit, slot }); }
  }
  return out;
}
export const avgLevel = (s) => { const l = Object.values(s.roster).map((m) => m.level); return l.reduce((a, b) => a + b, 0) / l.length; };

// ---- the team
export function freeSlot(s, key) {
  const front = ['vanguard', 'striker'].includes(UNITS[key].cls), order = front ? [1, 0, 2, 4, 3, 5] : [4, 3, 5, 1, 0, 2];
  return order.find((sl) => !s.team.some((t) => t.slot === sl));
}
export function toggleTeam(s, key, slot) {
  const i = s.team.findIndex((t) => t.key === key);
  if (i >= 0) { s.team.splice(i, 1); return false; }
  if (s.team.length >= MAX_TEAM || !s.roster[key]) return false;
  const sl = slot != null && !s.team.some((t) => t.slot === slot) ? slot : freeSlot(s, key);
  s.team.push({ key, slot: sl }); return true;
}
export function moveSlot(s, from, to) {
  const a = s.team.find((t) => t.slot === from), b = s.team.find((t) => t.slot === to);
  if (!a) return false;
  if (b) b.slot = from;
  a.slot = to; return true;
}

// ---- one-tap helpers: the strongest team, the best gear on it
const WEIGHT = { atk: 1, hp: 0.8, def: 0.6, spd: 1.2, crit: 2.5, dr: 3, lifesteal: 2.5, power: 0.8, energy: 0.8, summonPower: 0.4, start: 0.004 };
export function gearScore(it, key) {
  let v = 0;
  for (const [k, x] of Object.entries(itemStats(it))) v += x * (k === 'healPower' ? (UNITS[key].healer || UNITS[key].cls === 'support' ? 1 : 0.1) : WEIGHT[k] || 0.5);
  return v;
}
export function bestTeam(s) {
  const keys = Object.keys(s.roster).sort((a, b) => power(s, b) - power(s, a));
  // a balanced five: the strongest healer, at most two who hold the front, then the strongest of the rest
  const pick = [], cap = { vanguard: 2, support: 2 };
  const healer = keys.find((k) => UNITS[k].healer);
  if (healer) pick.push(healer);
  const count = (cls) => pick.filter((k) => UNITS[k].cls === cls).length;
  for (const k of keys) if (pick.length < MAX_TEAM && !pick.includes(k) && count(UNITS[k].cls) < (cap[UNITS[k].cls] || MAX_TEAM)) pick.push(k);
  for (const k of keys) if (pick.length < MAX_TEAM && !pick.includes(k)) pick.push(k);
  s.team = []; for (const k of pick) s.team.push({ key: k, slot: freeSlot(s, k) });
  return pick;
}
export function autoEquip(s, keys = s.team.map((t) => t.key)) {
  let changed = 0;
  for (const k of keys) for (const sl of SLOTS) {
    const cur = s.roster[k].gear[sl] && itemByUid(s, s.roster[k].gear[sl]);
    const best = s.inv.filter((it) => BASES[it.base].slot === sl && (!wearer(s, it.uid) || !keys.includes(wearer(s, it.uid))))
      .sort((a, b) => gearScore(b, k) - gearScore(a, k))[0];
    if (best && (!cur || gearScore(best, k) > gearScore(cur, k) + 1e-9)) { equip(s, k, best.uid); changed++; }
  }
  return changed;
}

// ---- gear
export function wearer(s, uid) { return Object.keys(s.roster).find((k) => SLOTS.some((sl) => s.roster[k].gear[sl] === uid)) || null; }
export function equip(s, key, uid) {
  const it = itemByUid(s, uid); if (!it || !s.roster[key]) return false;
  const sl = BASES[it.base].slot, prev = wearer(s, uid);
  if (prev) s.roster[prev].gear[sl] = null;
  s.roster[key].gear[sl] = uid; return true;
}
export function unequip(s, key, slot) { if (s.roster[key]) s.roster[key].gear[slot] = null; }
export function upgradeItem(s, uid) {
  const it = itemByUid(s, uid); if (!it || (it.plus || 0) >= MAX_PLUS) return false;
  const c = upgradeCost(it); if (s.gold < c) return false;
  s.gold -= c; it.plus = (it.plus || 0) + 1; s.stats.upgraded++; return true;
}
export function sellItem(s, uid) {
  const it = itemByUid(s, uid); if (!it) return false;
  const who = wearer(s, uid); if (who) unequip(s, who, BASES[it.base].slot);
  s.gold += sellValue(it); s.inv = s.inv.filter((x) => x !== it); return true;
}

// ---- training and upgrades
export const trainCost = (rank) => 30 + rank * 30 + rank * rank * 2;
export function train(s, key, stat) {
  const m = s.roster[key]; if (!m || !(stat in TRAIN)) return false;
  const r = m.train[stat]; if (r >= TRAIN_MAX || r >= m.level) return false;   // ranks up to the recruit's level
  const c = trainCost(r); if (s.gold < c) return false;
  s.gold -= c; m.train[stat] = r + 1; s.stats.trained++; return true;
}
export function pickUpgrade(s, key, tier, id) {
  const m = s.roster[key]; if (!m || m.level < UPGRADE_LEVELS[tier] || m.ups[tier]) return false;
  if (!upgradeChoices(key, tier).some((c) => c.id === id)) return false;
  m.ups[tier] = id; return true;
}
// what is waiting for the player's attention on a recruit: an upgrade to pick
export const pendingUpgrade = (s, key) => UPGRADE_LEVELS.findIndex((lv, t) => s.roster[key].level >= lv && !s.roster[key].ups[t]);

export { CLASSES, MISSIONS };

// ---- a save as a text code, to move it between devices by hand: VAEL1.<base64 json>.<checksum>
function sum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return (h >>> 0).toString(36); }
const b64 = (str) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(str))) : Buffer.from(str, 'utf8').toString('base64'));
const unb64 = (str) => (typeof atob === 'function' ? decodeURIComponent(escape(atob(str))) : Buffer.from(str, 'base64').toString('utf8'));
export function encodeSave(s) { const body = b64(JSON.stringify(s)); return `VAEL1.${body}.${sum(body)}`; }
export function decodeSave(code) {
  const parts = String(code || '').trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'VAEL1' || sum(parts[1]) !== parts[2]) return null;
  try { const raw = JSON.parse(unb64(parts[1])); return raw && raw.v === SAVE_VERSION ? loadSave(raw) : null; } catch (e) { return null; }
}
