// The company's economy beyond missions: daily bounties, achievements, the shop (gold and gems) and
// the catalog of real-money gem packs. Pure functions over the save, like progress.js.
import { UNITS } from '../data/units.js';
import { MISSIONS, REGIONS, missionsIn } from '../data/campaign.js';
import { rollItem, TIERS } from '../data/items.js';
import { avgLevel, addXp, xpNeed, MAX_LEVEL } from './progress.js';

// ---- daily bounties: three a day from the pool, counted from the day's first look
export const BOUNTIES = {
  wins3: { text: 'Win 3 battles', stat: 'wins', need: 3 },
  wins6: { text: 'Win 6 battles', stat: 'wins', need: 6 },
  kills30: { text: 'Defeat 30 foes', stat: 'kills', need: 30 },
  stars: { text: 'Win a battle with 3 stars', stat: 'stars3', need: 1 },
  train3: { text: 'Train recruits 3 times', stat: 'trained', need: 3 },
  upgrade2: { text: 'Upgrade gear twice', stat: 'upgraded', need: 2 },
  boss: { text: 'Defeat a boss', stat: 'bosses', need: 1 },
  shop: { text: 'Buy something in the shop', stat: 'bought', need: 1 },
};
export const BOUNTY_GEMS = 5, BOUNTY_ALL_GEMS = 10;
export const bountyGold = (s) => Math.round(80 + 30 * avgLevel(s));
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function hash(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
export function dailyBounties(s, day = today()) {
  if (!s.daily || s.daily.day !== day) {
    const pool = Object.keys(BOUNTIES).filter((k) => k !== 'boss' || s.stats.bosses > 0 || Object.keys(s.cleared).length >= 2);
    const ids = [], h = hash(day + (s.seed || 0));
    for (let i = 0; ids.length < 3 && i < 40; i++) { const k = pool[(h + i * 2654435761) % pool.length >>> 0]; if (!ids.includes(k) && !(k.startsWith('wins') && ids.some((x) => x.startsWith('wins')))) ids.push(k); }
    s.daily = { day, base: { ...s.stats }, ids, claimed: [], bonus: false };
  }
  return s.daily.ids.map((id) => {
    const b = BOUNTIES[id], got = Math.min(b.need, (s.stats[b.stat] || 0) - (s.daily.base[b.stat] || 0));
    return { id, ...b, got, done: got >= b.need, claimed: s.daily.claimed.includes(id) };
  });
}
export function claimBounty(s, id) {
  const b = dailyBounties(s).find((x) => x.id === id);
  if (!b || !b.done || b.claimed) return null;
  s.daily.claimed.push(id);
  const out = { gold: bountyGold(s), gems: BOUNTY_GEMS };
  if (s.daily.claimed.length === s.daily.ids.length && !s.daily.bonus) { s.daily.bonus = true; out.gems += BOUNTY_ALL_GEMS; }
  s.gold += out.gold; s.gems += out.gems;
  return out;
}
export const bountiesReady = (s) => dailyBounties(s).some((b) => b.done && !b.claimed);

// ---- achievements: earned once, each worth gems
const regionDone = (s, rid) => missionsIn(rid).every((m) => s.cleared[m.id]);
const maxLevel = (s) => Math.max(...Object.values(s.roster).map((m) => m.level));
export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Blood', desc: 'Win a battle.', gems: 10, test: (s) => s.stats.wins >= 1 },
  ...REGIONS.map((r, i) => ({ id: 'region_' + r.id, name: r.name, desc: `Clear ${r.name}.`, gems: 30 + i * 10, test: (s) => regionDone(s, r.id) })),
  { id: 'stars_r1', name: 'Flawless Road', desc: 'Three stars on every mission of the Thornwick Road.', gems: 30, test: (s) => missionsIn('r1').every((m) => s.cleared[m.id] === 3) },
  { id: 'stars_all', name: 'Without a Scratch', desc: 'Three stars on all sixty missions.', gems: 150, test: (s) => MISSIONS.every((m) => s.cleared[m.id] === 3) },
  { id: 'heroic1', name: 'Heroic', desc: 'Win a heroic mission.', gems: 20, test: (s) => Object.keys(s.heroic).length >= 1 },
  { id: 'heroic_all', name: 'Legend of Vael', desc: 'Win every heroic mission.', gems: 300, test: (s) => MISSIONS.every((m) => s.heroic[m.id]) },
  { id: 'recruit10', name: 'A Real Company', desc: 'Have ten recruits.', gems: 20, test: (s) => Object.keys(s.roster).length >= 10 },
  { id: 'recruit_all', name: 'Every Sword in Vael', desc: `Recruit all ${Object.keys(UNITS).length}.`, gems: 60, test: (s) => Object.keys(s.roster).length >= Object.keys(UNITS).length },
  { id: 'level20', name: 'Seasoned', desc: 'A recruit reaches level 20.', gems: 15, test: (s) => maxLevel(s) >= 20 },
  { id: 'level40', name: 'Veteran', desc: 'A recruit reaches level 40.', gems: 30, test: (s) => maxLevel(s) >= 40 },
  { id: 'level60', name: 'Living Legend', desc: `A recruit reaches level ${MAX_LEVEL}.`, gems: 60, test: (s) => maxLevel(s) >= MAX_LEVEL },
  { id: 'wins100', name: 'Hundred Battles', desc: 'Win 100 battles.', gems: 40, test: (s) => s.stats.wins >= 100 },
  { id: 'kills1000', name: 'Thousand Foes', desc: 'Defeat 1000 foes.', gems: 40, test: (s) => s.stats.kills >= 1000 },
  { id: 'bosses10', name: 'Giant Killer', desc: 'Defeat 10 bosses.', gems: 30, test: (s) => s.stats.bosses >= 10 },
  { id: 'mythic', name: 'Mythic', desc: 'Find a mythic item.', gems: 25, test: (s) => s.inv.some((it) => it.tier === TIERS.length - 1) },
  { id: 'plus5', name: 'Masterwork', desc: 'Upgrade an item to +5.', gems: 20, test: (s) => s.inv.some((it) => it.plus >= 5) },
  { id: 'train50', name: 'Drillmaster', desc: 'Train 50 ranks.', gems: 20, test: (s) => s.stats.trained >= 50 },
  { id: 'upgrades', name: 'Master of Arts', desc: 'A recruit with all four upgrades.', gems: 30, test: (s) => Object.values(s.roster).some((m) => m.ups.every(Boolean)) },
];
// newly earned achievements: their gems are added at once
export function checkAchievements(s) {
  s.ach = s.ach || {};
  const fresh = ACHIEVEMENTS.filter((a) => !s.ach[a.id] && a.test(s));
  for (const a of fresh) { s.ach[a.id] = true; s.gems += a.gems; }
  return fresh;
}

// ---- the shop (bought with gold or gems)
export const SHOP = [
  { id: 'crate', name: 'Supply Crate', desc: 'One piece of gear for the company\'s level.', cost: (s) => ({ gold: Math.round(150 + 25 * avgLevel(s)) }), give: (s, rnd) => ({ items: gear(s, rnd, 1, 0) }) },
  { id: 'officer', name: 'Officer\'s Chest', desc: 'One piece of gear, likely rare or better.', cost: () => ({ gems: 40 }), give: (s, rnd) => ({ items: gear(s, rnd, 1, 0.45) }) },
  { id: 'royal', name: 'Royal Chest', desc: 'Three pieces of fine gear or better.', cost: () => ({ gems: 120 }), give: (s, rnd) => ({ items: gear(s, rnd, 3, 0.6) }) },
  { id: 'pouch', name: 'Purse of Gold', desc: 'Gold for training and upgrades.', cost: () => ({ gems: 30 }), give: (s) => { const g = Math.round(400 + 120 * avgLevel(s)); s.gold += g; return { gold: g }; } },
  { id: 'tome', name: 'Tome of Tactics', desc: 'Experience for every recruit on the team.', cost: () => ({ gems: 35 }), give: (s) => {
    const ups = []; for (const t of s.team) { const m = s.roster[t.key], from = m.level; addXp(s, t.key, Math.round(xpNeed(m.level) * 0.8)); if (m.level > from) ups.push(`${UNITS[t.key].name.split(' ')[0]} reached level ${m.level}`); }
    return { text: ups.length ? ups.join(', ') : 'The team grows wiser' };
  } },
];
function gear(s, rnd, n, bonus) {
  const out = [];
  for (let i = 0; i < n; i++) { const it = Object.assign(rollItem(Math.round(avgLevel(s)) + 2, rnd, bonus), { uid: s.uid++ }); if (bonus >= 0.6 && it.tier < 1) it.tier = 1; s.inv.push(it); out.push(it); }
  return out;
}
export function canAfford(s, cost) { return (cost.gold || 0) <= s.gold && (cost.gems || 0) <= s.gems; }
export function buy(s, id, rnd) {
  const item = SHOP.find((x) => x.id === id); if (!item) return null;
  const cost = item.cost(s); if (!canAfford(s, cost)) return null;
  s.gold -= cost.gold || 0; s.gems -= cost.gems || 0; s.stats.bought = (s.stats.bought || 0) + 1;
  return Object.assign({ item }, item.give(s, rnd));
}

// ---- real-money products (granted by the app stores through src/game/store.js; nothing is sold on the web)
export const PRODUCTS = [
  { id: 'vael.gems.small', name: 'Handful of Gems', gems: 100, type: 'consumable', price: '$0.99' },
  { id: 'vael.gems.medium', name: 'Pouch of Gems', gems: 550, type: 'consumable', price: '$4.99' },
  { id: 'vael.gems.large', name: 'Chest of Gems', gems: 1200, type: 'consumable', price: '$9.99' },
  { id: 'vael.gems.huge', name: 'Hoard of Gems', gems: 2600, type: 'consumable', price: '$19.99' },
  { id: 'vael.starter', name: 'Starter Pack', gems: 250, gold: 2000, type: 'non-consumable', price: '$1.99', desc: '250 gems and 2000 gold, once.' },
  { id: 'vael.supporter', name: 'Supporter\'s Banner', gems: 600, type: 'non-consumable', price: '$4.99', desc: '600 gems, a gold banner at camp, and our thanks.' },
];
// grants a purchase once per transaction (the store may report the same one again)
export function grantProduct(s, productId, transactionId) {
  const p = PRODUCTS.find((x) => x.id === productId); if (!p) return null;
  s.purchases = s.purchases || { tx: [], owned: [] };
  if (transactionId && s.purchases.tx.includes(transactionId)) return null;
  if (p.type === 'non-consumable' && s.purchases.owned.includes(p.id)) return null;
  if (transactionId) s.purchases.tx.push(transactionId);
  if (p.type === 'non-consumable') s.purchases.owned.push(p.id);
  s.gems += p.gems || 0; s.gold += p.gold || 0;
  return p;
}
export const owns = (s, id) => !!(s.purchases && s.purchases.owned.includes(id));
