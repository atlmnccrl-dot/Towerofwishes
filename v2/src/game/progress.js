// The company's progress: the save, rewards, levels, gear, training and ability upgrades.
// Pure functions over a plain save object (no DOM), so Node tests can play the whole campaign.
import { UNITS, CLASSES } from '../data/units.js';
import { MISSIONS, START_ROSTER, START_TEAM, missionById } from '../data/campaign.js';
import { SLOTS, BASES, itemStats, upgradeCost, sellValue, rollItem, MAX_PLUS } from '../data/items.js';
import { MOD_KEYS } from '../combat/battle.js';

export const SAVE_VERSION = 1;
export const MAX_LEVEL = 20;
export const MAX_TEAM = 5;
export const TRAIN_MAX = 10;
export const TRAIN = { hp: 0.04, atk: 0.04, def: 0.05 };       // per rank
export const UPGRADE_LEVELS = [4, 8];

// Ability upgrades: at level 4 every recruit picks one of two; at level 8, one of two for their class.
const T1 = [
  { id: 'empower', name: 'Empowered', desc: 'Ability 30% stronger.', mods: { power: 0.3 } },
  { id: 'quicken', name: 'Quickened', desc: 'Gains energy 30% faster.', mods: { energy: 0.3 } },
];
const T2 = {
  vanguard: [{ id: 'bastion', name: 'Bastion', desc: 'Takes 12% less damage.', mods: { dr: 0.12 } },
    { id: 'vengeance', name: 'Vengeance', desc: '+20% attack.', mods: { atk: 0.2 } }],
  striker: [{ id: 'bloodlust', name: 'Bloodlust', desc: 'Heals for 12% of damage dealt.', mods: { lifesteal: 0.12 } },
    { id: 'precision', name: 'Precision', desc: '+15% critical chance.', mods: { crit: 0.15 } }],
  ranger: [{ id: 'rapid', name: 'Rapid Fire', desc: '+20% attack speed.', mods: { spd: 0.2 } },
    { id: 'deadeye', name: 'Deadeye', desc: '+15% critical chance.', mods: { crit: 0.15 } }],
  mystic: [{ id: 'primed', name: 'Primed', desc: 'Starts each battle with 70 energy.', mods: { start: 70 } },
    { id: 'overcharge', name: 'Overcharge', desc: 'Ability 40% stronger.', mods: { power: 0.4 } }],
  support: [{ id: 'blessing', name: 'Blessing', desc: '+30% healing and shields.', mods: { healPower: 0.3, power: 0.15 } },
    { id: 'ready', name: 'Ready Hands', desc: 'Starts each battle with 60 energy.', mods: { start: 60 } }],
};
export const upgradeChoices = (key, tier) => (tier === 0 ? T1 : T2[UNITS[key].cls]);

// ---- the save
export function newSave() {
  const s = { v: SAVE_VERSION, gold: 120, roster: {}, inv: [], uid: 1, cleared: {}, team: START_TEAM.map((m) => ({ ...m })), joined: [], speed: 1, seed: 7 };
  for (const k of START_ROSTER) s.roster[k] = newMember(1);
  return s;
}
function newMember(level) { return { level, xp: 0, gear: { weapon: null, armor: null, charm: null }, train: { hp: 0, atk: 0, def: 0 }, ups: [null, null] }; }
// a stored save made whole again (missing fields filled, unknown units and items dropped)
export function loadSave(raw) {
  const s = newSave();
  if (!raw || raw.v !== SAVE_VERSION) return s;
  Object.assign(s, raw);
  for (const k of Object.keys(s.roster)) if (!UNITS[k]) delete s.roster[k]; else s.roster[k] = Object.assign(newMember(1), s.roster[k]);
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

// Applies a finished battle to the save. Returns what to show: stars, gold, xp per recruit with
// level-ups, loot, and who joined. A loss changes nothing (nothing is ever lost).
export function grantRewards(s, missionId, b, rnd) {
  const m = missionById(missionId), stars = starsFor(b);
  const out = { win: stars > 0, stars, first: false, gold: 0, xp: [], loot: [], joined: null, best: s.cleared[missionId] || 0 };
  if (!out.win) return out;
  out.first = !s.cleared[missionId];
  s.cleared[missionId] = Math.max(stars, s.cleared[missionId] || 0);
  out.gold = Math.round(missionGold(m) * (out.first ? 2 : 1) * (0.8 + stars * 0.1));
  s.gold += out.gold;
  const xp = Math.round(missionXp(m) * (out.first ? 1.5 : 1));
  const inTeam = new Set(s.team.map((t) => t.key));
  for (const key of Object.keys(s.roster)) {
    const share = inTeam.has(key) ? xp : Math.round(xp * 0.4);       // the bench learns at camp
    const from = s.roster[key].level, gained = addXp(s, key, share);
    out.xp.push({ key, xp: share, from, to: from + gained, team: inTeam.has(key) });
  }
  const drops = out.first ? 1 + (stars === 3 ? 1 : 0) : rnd() < 0.35 + stars * 0.1 ? 1 : 0;
  for (let i = 0; i < drops; i++) { const it = Object.assign(rollItem(m.level, rnd), { uid: s.uid++ }); s.inv.push(it); out.loot.push(it); }
  if (out.first && m.recruit && !s.roster[m.recruit]) {
    // a recruit joins a level or two behind the company, never at 1 when the company is far ahead
    const lv = Math.max(1, Math.round(avgLevel(s)) - 1);
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
  s.gold -= c; it.plus = (it.plus || 0) + 1; return true;
}
export function sellItem(s, uid) {
  const it = itemByUid(s, uid); if (!it) return false;
  const who = wearer(s, uid); if (who) unequip(s, who, BASES[it.base].slot);
  s.gold += sellValue(it); s.inv = s.inv.filter((x) => x !== it); return true;
}

// ---- training and upgrades
export const trainCost = (rank) => 30 + rank * 30;
export function train(s, key, stat) {
  const m = s.roster[key]; if (!m || !(stat in TRAIN)) return false;
  const r = m.train[stat]; if (r >= TRAIN_MAX || r >= m.level) return false;   // ranks up to the recruit's level
  const c = trainCost(r); if (s.gold < c) return false;
  s.gold -= c; m.train[stat] = r + 1; return true;
}
export function pickUpgrade(s, key, tier, id) {
  const m = s.roster[key]; if (!m || m.level < UPGRADE_LEVELS[tier] || m.ups[tier]) return false;
  if (!upgradeChoices(key, tier).some((c) => c.id === id)) return false;
  m.ups[tier] = id; return true;
}
// what is waiting for the player's attention on a recruit: an upgrade to pick
export const pendingUpgrade = (s, key) => UPGRADE_LEVELS.findIndex((lv, t) => s.roster[key].level >= lv && !s.roster[key].ups[t]);

export { CLASSES, MISSIONS };
