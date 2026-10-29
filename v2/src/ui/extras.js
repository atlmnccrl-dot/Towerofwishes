// The camp's other tents: the shop (gold and gems, and gem packs inside the app), the bounty board
// (three a day) and the achievements. One screen with three tabs. Also the first-time tips.
import * as P from '../game/progress.js';
import { UNITS } from '../data/units.js';
import { itemName, itemStats, statText } from '../data/items.js';
import * as E from '../game/economy.js';
import { $, h, toast, goldIcon, gemIcon, icon } from './common.js';

let tab = 'shop';
const price = (c) => h('span.price', null, c.gems ? gemIcon() : goldIcon(), String(c.gems || c.gold));

export function renderExtras(game, which) {
  const s = game.save;
  if (which) tab = which;
  $('#x-gold').replaceChildren(goldIcon(), String(s.gold));
  $('#x-gems').replaceChildren(gemIcon(), String(s.gems));
  $('#x-title').textContent = { shop: 'Shop', bounties: 'Bounties', ach: 'Feats', legacy: 'Legacy' }[tab];
  const tabs = $('#x-tabs'); tabs.replaceChildren();
  const ready = E.bountiesReady(s);
  for (const [id, label] of [['legacy', 'Legacy'], ['shop', 'Shop'], ['bounties', 'Bounties'], ['ach', 'Feats']]) {
    tabs.append(h('button.tab' + (tab === id ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; renderExtras(game); } }, label, (id === 'bounties' && ready) || (id === 'legacy' && P.legacyPoints(s) > 0) ? h('span.dot') : null));
  }
  const body = $('#x-body'); body.replaceChildren();
  if (tab === 'shop') renderShop(game, body);
  if (tab === 'bounties') renderBounties(game, body);
  if (tab === 'ach') renderAch(game, body);
  if (tab === 'legacy') renderLegacy(game, body);
}

// the company's legacy: Renown and rank, a perk for every rank, the charter it sails under
function renderLegacy(game, body) {
  const s = game.save, L = s.legacy, rank = P.legacyRank(s), R = P.LEGACY_RANKS, next = R[rank + 1], pts = P.legacyPoints(s);
  const into = L.renown - R[rank], span = next ? next - R[rank] : 1;
  body.append(h('div.lg-head', null,
    h('div', null, h('small', null, `Rank ${rank}`), h('b', null, P.LEGACY_NAMES[rank])),
    h('div.lg-bar', null, h('i', { style: { width: (next ? Math.min(100, (into / span) * 100) : 100) + '%' } })),
    h('span', null, next ? `${L.renown} / ${next} Renown` : `${L.renown} Renown · the last rank`),
    h('span.lg-pts' + (pts > 0 ? '.on' : ''), null, pts > 0 ? `${pts} perk${pts === 1 ? '' : 's'} to choose` : 'Every expedition earns Renown, won or lost')));
  body.append(h('div.label', null, 'Perks'));
  body.append(h('div.lg-grid', null, ...Object.entries(P.PERKS).map(([id, p]) => {
    const have = P.hasPerk(s, id), locked = rank < p.rank, can = !have && !locked && pts > 0;
    return h('button.lg-card' + (have ? '.on' : '') + (locked ? '.locked' : ''), { type: 'button', disabled: can ? null : true,
      onclick: () => { if (P.buyPerk(s, id)) { game.persist(); game.audio.play('level_up'); toast(`${p.name}: the company will remember`); renderExtras(game); } } },
      h('b', null, p.name), h('span', null, p.desc), h('small', null, have ? 'Taken' : locked ? `Rank ${p.rank}` : can ? 'Take it' : 'No point to spend'));
  })));
  body.append(h('div.label', null, s.run ? 'Charter (changes between expeditions)' : 'Charter'));
  body.append(h('div.lg-grid', null, ...Object.entries(P.CHARTERS).map(([id, c]) => {
    const on = L.charter === id, locked = rank < c.rank;
    return h('button.lg-card.charter' + (on ? '.on' : '') + (locked ? '.locked' : ''), { type: 'button', disabled: on || locked || s.run ? true : null,
      onclick: () => { if (P.setCharter(s, id)) { game.persist(); game.audio.play('confirm_01'); toast(`The company sails as ${c.name}`); renderExtras(game); } } },
      h('b', null, c.name), h('span', null, c.desc), h('small', null, on ? 'Our charter' : locked ? `Rank ${c.rank}` : s.run ? 'After this expedition' : 'Sign it'));
  })));
}

function renderShop(game, body) {
  const s = game.save;
  const grid = h('div.shop');
  for (const it of E.SHOP) {
    const cost = it.cost(s), ok = E.canAfford(s, cost);
    grid.append(h('div.ware', null, h('span.wi', null, (it.id === 'pouch' ? goldIcon() : icon({ crate: 'bag', officer: 'shield', royal: 'trophy', tome: 'up', wagon: 'castle' }[it.id] || 'shop', 22))), h('b', null, it.name), h('span.wd', null, it.desc),
      h('button.btn.small' + (ok ? '.gold' : ''), { type: 'button', disabled: ok ? null : true, onclick: () => {
        const got = E.buy(s, it.id, Math.random); if (!got) return;
        game.audio.play(got.items ? 'chest_open' : 'coin_01');
        game.after(); renderExtras(game);
        showGot(got);
      } }, 'Buy ', price(cost))));
  }
  body.append(h('div.label', null, 'Supplies'), grid);
  // gem packs: real money, only through the app stores
  const packs = h('div.shop');
  for (const p of E.PRODUCTS) {
    const owned = E.owns(s, p.id);
    packs.append(h('div.ware.pack' + (owned ? '.owned' : ''), null, h('span.wi', null, gemIcon()), h('b', null, p.name),
      h('span.wd', null, p.desc || `${p.gems} gems`),
      h('button.btn.small' + (game.store.available && !owned ? '.gold' : ''), { type: 'button', disabled: !game.store.available || owned ? true : null,
        onclick: () => game.store.buy(p.id) }, owned ? 'Owned' : game.store.available ? game.store.price(p.id) : p.price)));
  }
  body.append(h('div.label', null, 'Gem packs'), packs,
    h('p.note', null, game.store.available ? 'Purchases go through your app store account.' : 'Gem packs can be bought in the iOS and Android app. Everything in the game can also be earned by playing.'),
    ...(game.store.available ? [h('button.btn.small', { type: 'button', onclick: () => { game.store.restore(); toast('Restoring purchases…'); } }, 'Restore purchases')] : []));
}
function showGot(got) {
  if (got.items) toast(got.items.map(itemName).join(', '));
  else if (got.gold) toast(`+${got.gold} gold`);
  else if (got.text) toast(got.text);
}

function renderBounties(game, body) {
  const s = game.save, list = E.dailyBounties(s);
  body.append(h('p.note', null, `New bounties every day. Each pays ${E.bountyGold(s)} gold and ${E.BOUNTY_GEMS} gems; all three add ${E.BOUNTY_ALL_GEMS} more.`));
  for (const b of list) {
    body.append(h('div.trow.bounty', null,
      h('span.tl', null, h('b', null, b.text), h('small', null, `${b.got} / ${b.need}`)),
      h('span.rbar', { role: 'progressbar', 'aria-valuenow': String(b.got), 'aria-valuemax': String(b.need) }, h('i', { style: { width: `${(b.got / b.need) * 100}%` } })),
      h('button.btn.small' + (b.done && !b.claimed ? '.gold' : ''), { type: 'button', disabled: !b.done || b.claimed ? true : null, onclick: () => {
        const got = E.claimBounty(s, b.id); if (!got) return;
        game.audio.play('quest_complete'); game.after(); toast(`+${got.gold} gold, +${got.gems} gems`); renderExtras(game);
      } }, b.claimed ? 'Claimed' : 'Claim')));
  }
}

function renderAch(game, body) {
  const s = game.save, got = s.ach || {};
  const n = E.ACHIEVEMENTS.filter((a) => got[a.id]).length;
  body.append(h('p.note', null, `${n} of ${E.ACHIEVEMENTS.length} earned. Gems are added the moment one is earned.`));
  const grid = h('div.achs');
  for (const a of E.ACHIEVEMENTS) grid.append(h('div.ach' + (got[a.id] ? '.on' : ''), null, h('span.ai', null, icon(got[a.id] ? 'trophy' : 'lock', 18)), h('b', null, a.name), h('span', null, a.desc), h('span.price', null, gemIcon(), String(a.gems))));
  body.append(grid);
}

// ---- first-time tips: shown once each, near what they explain
const TIPS = {
  map: 'Each marker is a mission. Tap one to read it, then Prepare. Some missions have a job (hold out against waves, protect a cart, hunt a target) and elite foes with a trait. Cleared missions can be replayed for gold, experience and gear.',
  path: 'A hero has reached a turning point. Open Heroes and choose their path: it changes their special for good (what it does, how it looks), at level 10 and again at 25.',
  exp: 'The road through the region, from its gate to its boss. Pick where to go next: fights, elites (harder, better spoils), camps to rest by, the pedlar, treasure and strange events. Wounds carry from fight to fight. Take the Seal from the boss; lose a fight and the expedition ends, but levels, gear and cleared missions are kept.',
  prep: 'Your team waits at the fire. Tap a hero below to see them, tap again to take them along or leave them at camp. Fighters take the front, archers, mages and healers the back.',
  battle: 'Battles play themselves. When a hero\'s gold bar fills they use their ability; switch Auto to Manual to pick the moment yourself by tapping their card.',
  loot: 'New gear goes to the Heroes screen. Auto-equip puts the best on the team in one tap.',
  upgrade: 'A hero can learn an upgrade. Open Heroes and look for the red dot.',
  lose: 'Losing costs nothing. Replay earlier missions for experience, equip gear, train, and come back.',
  extras: 'The camp has a shop, daily bounties and feats. Gems come from three-star wins, bosses, bounties and feats.',
  keep: 'Missions drop their region\'s material. Build here to grow the camp into a citadel: each building helps for good, and each level needs the material of a region further along the road.',
};
export function tip(game, id) {
  const s = game.save; s.flags = s.flags || {};
  if (s.flags['tip_' + id] || !TIPS[id] || game.noTips) return false;
  s.flags['tip_' + id] = true; game.persist();
  const el = $('#tip');
  el.replaceChildren(h('div.tipcard.glass', null, h('p', null, TIPS[id]), h('button.btn.primary', { type: 'button', onclick: () => { el.hidden = true; } }, 'Got it')));
  el.hidden = false;
  return true;
}
