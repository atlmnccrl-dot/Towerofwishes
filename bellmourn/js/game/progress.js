// Progression rules on the save: experience and levels, skill ranks, loot, boss rewards, the merchant.
// Pure functions (no DOM); the game persists the save.
import { HEROES, HERO_ORDER, ABILITIES, WEAPONS, RELICS, MAX_LEVEL, MAX_RANK, xpFor, newHeroSave, weaponsOfType, weaponPrice, upgradeCost, MAX_PLUS } from './heroes.js';
import { DISTRICTS } from './story.js';

export const SAVE_VERSION = 2;

export function freshSave(heroId = 'warden') {
  const heroes = {}; for (const id of HERO_ORDER) heroes[id] = newHeroSave(id);
  return {
    v: SAVE_VERSION, hero: heroId, heroes, unlocked: ['warden', 'huntress', 'bellbreaker'],
    level: 'gate', lamp: null, litLamps: {}, cleared: {}, items: {}, bosses: {}, visited: [], bought: {},
    embers: 0, relicsOwned: [], relicsOn: [null, null], bossTonics: 0, tonicUp: 0,
    deaths: 0, time: 0, done: false, tutorial: false,
  };
}

// keep older or partial saves usable
export function upgradeSave(s) {
  if (!s || s.v !== SAVE_VERSION) return null;
  const f = freshSave(s.hero || 'warden');
  const out = { ...f, ...s, heroes: { ...f.heroes, ...(s.heroes || {}) } };
  if (!Array.isArray(out.relicsOn)) out.relicsOn = [null, null];
  return out;
}

export const districtIndex = (id) => Math.max(0, DISTRICTS.indexOf(id));
export const relicSlots = (save) => (save.bosses.nave ? 3 : 2);

// Add experience to the current hero; returns the number of levels gained.
export function addXp(save, amount) {
  const P = save.heroes[save.hero]; let gained = 0;
  P.xp += Math.round(amount);
  while (P.level < MAX_LEVEL && P.xp >= xpFor(P.level)) { P.xp -= xpFor(P.level); P.level++; P.points++; gained++; }
  if (P.level >= MAX_LEVEL) P.xp = 0;
  return gained;
}
export const xpFrac = (save) => { const P = save.heroes[save.hero]; return P.level >= MAX_LEVEL ? 1 : P.xp / xpFor(P.level); };

// Skill rows of the current hero: each ability and the ultimate, with what pressing it does.
export function skillRows(save) {
  const H = HEROES[save.hero]; const P = save.heroes[save.hero]; const rows = [];
  for (const id of H.abilities) {
    const A = ABILITIES[id]; const rank = (P.ranks || {})[id] || 0; const slot = P.equipped.indexOf(id);
    const locked = A.level && P.level < A.level && rank === 0;
    rows.push({ id, name: A.name, desc: A.desc, rank, slot, locked, needLevel: A.level || 1, ult: false });
  }
  rows.push({ id: H.ult, name: 'ULTIMATE: ' + H.ult.toUpperCase(), desc: 'THE ULTIMATE GROWS STRONGER.', rank: (P.ranks || {})[H.ult] || 1, slot: -1, locked: false, ult: true });
  return rows;
}

// Spend a point on a row, or equip a learned ability that is not in a slot. Returns a message or null.
export function useSkillRow(save, row) {
  const P = save.heroes[save.hero]; P.ranks = P.ranks || {};
  if (row.locked) return 'REACH LEVEL ' + row.needLevel;
  if (!row.ult && row.rank > 0 && row.slot < 0) { P.equipped[1] = row.id; return 'EQUIPPED IN SLOT 2'; }
  if (P.points <= 0) return 'NO SKILL POINTS';
  if (row.rank >= MAX_RANK) return 'ALREADY MASTERED';
  P.ranks[row.id] = row.rank + 1; P.points--;
  if (row.rank === 0 && !row.ult && P.equipped.indexOf(row.id) < 0) P.equipped[1] = row.id;
  return row.rank === 0 ? 'LEARNED' : 'RANK ' + (row.rank + 1);
}

// Loot: a weapon of the current hero's kind near the district's strength, or a relic not owned yet.
export function rollWeapon(save, tierCap, rand) {
  const type = HEROES[save.hero].weapon; const P = save.heroes[save.hero];
  const pool = weaponsOfType(type).filter((id) => WEAPONS[id].tier <= tierCap && !P.owned.includes(id));
  if (!pool.length) return null;
  pool.sort((a, b) => WEAPONS[b].tier - WEAPONS[a].tier);
  return pool[Math.floor(rand() * Math.min(2, pool.length))];
}
export function rollRelic(save, rand) {
  const pool = Object.keys(RELICS).filter((id) => !save.relicsOwned.includes(id));
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}
export function giveWeapon(save, id) { const P = save.heroes[save.hero]; if (!P.owned.includes(id)) P.owned.push(id); }
export function giveRelic(save, id) {
  if (!id || save.relicsOwned.includes(id)) return;
  save.relicsOwned.push(id);
  const slots = relicSlots(save); for (let i = 0; i < slots; i++) if (!save.relicsOn[i]) { save.relicsOn[i] = id; break; }
}

// What a boss leaves behind (applied to the save); returns lines for the toasts.
export function bossReward(save, districtId, rand) {
  const n = districtIndex(districtId); const lines = [];
  const embers = 150 + n * 90; save.embers += embers; lines.push('+' + embers + ' EMBERS');
  const lv = addXp(save, 220 + n * 160); if (lv) lines.push('LEVEL ' + save.heroes[save.hero].level);
  if (n < 3) { save.bossTonics = Math.min(3, (save.bossTonics || 0) + 1); lines.push('A NEW TONIC FLASK'); }
  if (districtId === 'nave') lines.push('A THIRD RELIC SLOT');
  if (districtId === 'market' && !save.unlocked.includes('lamplighter')) { save.unlocked.push('lamplighter'); lines.push('SISTER ASH JOINS YOU (CHANGE HERO AT A LAMP)'); }
  const w = rollWeapon(save, Math.min(4, Math.floor(n / 2) + 1), rand); if (w) { giveWeapon(save, w); lines.push('WEAPON: ' + WEAPONS[w].name); }
  const r = rollRelic(save, rand); if (r) { giveRelic(save, r); lines.push('RELIC: ' + RELICS[r].name); }
  return lines;
}

// A chest: embers, a tonic flask, or (sometimes) a weapon or a relic.
export function chestLoot(save, item, districtId, rand) {
  const n = districtIndex(districtId);
  if (item.kind === 'tonic') { save.tonicUp = Math.min(4, (save.tonicUp || 0) + 1); return ['A TONIC FLASK']; }
  const lines = []; const amt = item.amount || (60 + n * 30); save.embers += amt; lines.push('+' + amt + ' EMBERS');
  const roll = rand();
  if (roll < 0.25) { const r = rollRelic(save, rand); if (r) { giveRelic(save, r); lines.push('RELIC: ' + RELICS[r].name); } }
  else if (roll < 0.5) { const w = rollWeapon(save, Math.min(4, Math.floor(n / 2)), rand); if (w) { giveWeapon(save, w); lines.push('WEAPON: ' + WEAPONS[w].name); } }
  return lines;
}

// The merchant at the lamps: weapons for the current hero up to the district's strength, two relics, a flask, a tome.
export function shopStock(save, districtId) {
  const n = districtIndex(districtId); const type = HEROES[save.hero].weapon; const P = save.heroes[save.hero]; const items = [];
  for (const id of weaponsOfType(type)) if (WEAPONS[id].tier >= 1 && WEAPONS[id].tier <= Math.floor(n / 2) + 1 && !P.owned.includes(id)) items.push({ kind: 'weapon', id, name: WEAPONS[id].name, price: weaponPrice(id), desc: WEAPONS[id].desc });
  const relics = Object.keys(RELICS).filter((id) => !save.relicsOwned.includes(id));
  for (let k = 0; k < 2 && relics.length; k++) { const id = relics[(n * 5 + k * 3) % relics.length]; relics.splice(relics.indexOf(id), 1); items.push({ kind: 'relic', id, name: RELICS[id].name, price: RELICS[id].price + n * 30, desc: RELICS[id].desc }); }
  if ((save.tonicUp || 0) < 4 && !save.bought['tonic:' + districtId]) items.push({ kind: 'tonic', id: 'tonic', name: 'TONIC FLASK', price: 180 + n * 60, desc: 'ONE MORE TONIC TO CARRY.' });
  if (!save.bought['tome:' + districtId]) items.push({ kind: 'tome', id: 'tome', name: 'WARDEN\'S TOME', price: 260 + n * 80, desc: 'ONE SKILL POINT FOR THE CURRENT HERO.' });
  return items;
}
export function buy(save, item, districtId) {
  if (save.embers < item.price) return 'NOT ENOUGH EMBERS';
  save.embers -= item.price;
  if (item.kind === 'weapon') giveWeapon(save, item.id);
  else if (item.kind === 'relic') giveRelic(save, item.id);
  else if (item.kind === 'tonic') { save.tonicUp = (save.tonicUp || 0) + 1; save.bought['tonic:' + districtId] = true; }
  else if (item.kind === 'tome') { save.heroes[save.hero].points++; save.bought['tome:' + districtId] = true; }
  return 'BOUGHT: ' + item.name;
}

export function upgradeWeapon(save) {
  const P = save.heroes[save.hero]; P.plus = P.plus || {}; const plus = P.plus[P.weapon] || 0;
  if (plus >= MAX_PLUS) return 'FULLY TEMPERED';
  const c = upgradeCost(P.weapon, plus); if (save.embers < c) return 'NOT ENOUGH EMBERS';
  save.embers -= c; P.plus[P.weapon] = plus + 1; return WEAPONS[P.weapon].name + ' +' + (plus + 1);
}
export function toggleRelic(save, id) {
  const slots = relicSlots(save); const i = save.relicsOn.indexOf(id);
  if (i >= 0) { save.relicsOn[i] = null; return 'TAKEN OFF'; }
  for (let k = 0; k < slots; k++) if (!save.relicsOn[k]) { save.relicsOn[k] = id; return 'PUT ON'; }
  save.relicsOn[slots - 1] = id; return 'SWAPPED IN';
}
