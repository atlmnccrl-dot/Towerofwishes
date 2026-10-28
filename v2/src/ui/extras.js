// The camp's other tents: the shop (gold and gems, and gem packs inside the app), the bounty board
// (three a day) and the achievements. One screen with three tabs. Also the first-time tips.
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
  $('#x-title').textContent = { shop: 'Shop', bounties: 'Bounties', ach: 'Feats' }[tab];
  const tabs = $('#x-tabs'); tabs.replaceChildren();
  const ready = E.bountiesReady(s);
  for (const [id, label] of [['shop', 'Shop'], ['bounties', 'Bounties'], ['ach', 'Feats']]) {
    tabs.append(h('button.tab' + (tab === id ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; renderExtras(game); } }, label, id === 'bounties' && ready ? h('span.dot') : null));
  }
  const body = $('#x-body'); body.replaceChildren();
  if (tab === 'shop') renderShop(game, body);
  if (tab === 'bounties') renderBounties(game, body);
  if (tab === 'ach') renderAch(game, body);
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
    game.store.available ? h('button.btn.small', { type: 'button', onclick: () => { game.store.restore(); toast('Restoring purchases…'); } }, 'Restore purchases') : null);
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
  map: 'Each marker is a mission. Tap one to read it, then Prepare. Cleared missions can be replayed for gold, experience and gear.',
  prep: 'Fighters hold the front row; archers, mages and healers the back. Drag a hero from below onto a place, or tap them. Drag between places to swap.',
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
  el.className = 'glass at-' + (game.screen || id);   // placed by the screen it shows on
  el.replaceChildren(h('p', null, TIPS[id]), h('button.btn.small.gold', { type: 'button', onclick: () => { el.hidden = true; } }, 'Got it'));
  el.hidden = false;
  return true;
}
