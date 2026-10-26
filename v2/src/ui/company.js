// The heroes: the roster as tiles on the left, the chosen hero large in the middle, and three tabs
// on the right: Stats (stats, ability, passive, the upgrade picks), Gear (three slots and the pack),
// Train (ranks bought with gold).
import { UNITS, CLASSES } from '../data/units.js';
import { MISSIONS, regionOf } from '../data/campaign.js';
import { SLOTS, SLOT_NAMES, BASES, itemStats, itemName, statText, upgradeCost, sellValue, MAX_PLUS } from '../data/items.js';
import { statsAt } from '../combat/battle.js';
import * as P from '../game/progress.js';
import { $, h, face, itemTile, slotIcon, tierColor, toast, goldIcon } from './common.js';
import { heroArt } from './heroart.js';

let sel = null, tab = 'stats', gearSlot = 'weapon';
const pct = (v) => `${Math.round(v * 100)}%`;
const clsVar = (cls) => `var(--${cls})`;

export function renderCompany(game, focus) {
  const s = game.save;
  if (focus) sel = focus;
  if (!sel || !s.roster[sel]) sel = Object.keys(s.roster)[0];
  $('#c-gold').replaceChildren(goldIcon(), String(s.gold));
  // the roster: members first (team, then the rest), then those not met yet
  const keys = Object.keys(UNITS), inTeam = (k) => s.team.some((t) => t.key === k);
  const members = keys.filter((k) => s.roster[k]).sort((a, b) => inTeam(b) - inTeam(a));
  const list = $('#c-roster'); list.replaceChildren();
  $('#c-count').textContent = `${members.length} of ${keys.length} recruited`;
  for (const k of members) {
    const d = UNITS[k], m = s.roster[k], pend = P.pendingUpgrade(s, k) >= 0;
    list.append(h('button.rcard' + (k === sel ? '.on' : ''), { type: 'button', vars: { '--c': clsVar(d.cls) }, onclick: () => { sel = k; renderCompany(game); }, 'aria-pressed': String(k === sel), 'aria-label': d.name },
      h('span.lv', null, m.level), face(d.set, 42), h('span.nm', null, d.name.split(' ')[0]),
      pend ? h('span.dot', { title: 'An upgrade to pick', 'aria-label': 'An upgrade to pick' }) : inTeam(k) ? h('span.tm', { title: 'In the team', 'aria-label': 'In the team' }) : null));
  }
  for (const k of keys.filter((k) => !s.roster[k])) {
    const where = MISSIONS.find((m) => m.recruit === k), hint = where ? `Joins in ${regionOf(where).name}` : 'Not met yet';
    list.append(h('div.rcard.locked', { title: hint }, face(UNITS[k].set, 42, true), h('span.nm', null, '???')));
  }
  renderDetail(game);
}

function renderDetail(game) {
  const s = game.save, k = sel, d = UNITS[k], m = s.roster[k], mods = P.modsOf(s, k), st = statsAt(d, m.level, mods);
  const inTeam = s.team.some((t) => t.key === k);
  const det = $('#c-detail'); det.replaceChildren();
  const need = P.xpNeed(m.level), hero = $('#c-hero');
  hero.style.setProperty('--c', clsVar(d.cls));
  hero.replaceChildren(
    h('div.pedestal', null, heroArt(d.set, window.innerHeight > 600 ? 4 : 3)),
    h('div.nm', null, d.name), h('div.ti', null, d.title),
    h('div.cls', { vars: { '--c': clsVar(d.cls) } }, CLASSES[d.cls].name),
    h('div.lvrow', null, h('b', null, 'Lv ' + m.level), h('div.xpbar', { role: 'progressbar', 'aria-label': 'Experience', 'aria-valuenow': String(m.xp), 'aria-valuemax': String(need) }, h('i', { style: { width: `${m.level >= P.MAX_LEVEL ? 100 : (m.xp / need) * 100}%` } })), h('span.xp', null, m.level >= P.MAX_LEVEL ? 'max' : `${m.xp} / ${need}`)),
    h('button.btn.small' + (inTeam ? '' : '.gold'), { type: 'button', onclick: () => {
      if (!inTeam && s.team.length >= P.MAX_TEAM) { toast('The team is full: five at most'); return; }
      if (inTeam && s.team.length <= 1) { toast('The team needs at least one'); return; }
      P.toggleTeam(s, k); game.persist(); renderCompany(game);
    } }, inTeam ? 'In the team ✓' : 'Add to team'));
  const tabs = h('div.tabs', { role: 'tablist' });
  const pend = P.pendingUpgrade(s, k) >= 0;
  for (const [id, label] of [['stats', 'Stats'], ['gear', 'Gear'], ['train', 'Train']]) {
    tabs.append(h('button.tab' + (tab === id ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(tab === id), onclick: () => { tab = id; renderDetail(game); } }, label, id === 'stats' && pend ? h('span.dot') : null));
  }
  det.append(tabs);
  const body = h('div.tabbody'); det.append(body);

  if (tab === 'stats') {
    const extra = ['power', 'energy', 'lifesteal', 'healPower', 'summonPower', 'start'].filter((x) => mods[x] || (d.passive || {})[x]);
    body.append(h('div.stats', null,
      stat('Health', st.max), stat('Attack', Math.round(st.atk)), stat('Defence', Math.round(st.def)),
      stat('Critical', pct(st.crit)), stat('Speed', st.spd.toFixed(2) + '×'), stat('Range', st.range > 3 ? 'Far' : 'Melee'),
      st.dr ? stat('Damage taken', '-' + pct(st.dr)) : null,
      ...extra.map((x) => stat({ power: 'Ability', energy: 'Energy gain', lifesteal: 'Lifesteal', healPower: 'Healing', summonPower: 'Summons', start: 'Start energy' }[x], x === 'start' ? '+' + Math.round(st.start) : '+' + pct((mods[x] || 0) + ((d.passive || {})[x] || 0))))));
    body.append(h('div.ability', null, h('b', null, d.ability.name), ' ', d.ability.desc));
    if (d.passive) body.append(h('div.passive', null, h('b', null, d.passive.name + ':'), ' ', d.passive.desc));
    P.UPGRADE_LEVELS.forEach((lv, tier) => {
      const picked = m.ups[tier], open = m.level >= lv;
      const row = h('div.uprow' + (open ? '' : '.locked'), null, h('span.uplv', null, `Lv ${lv}`));
      for (const c of P.upgradeChoices(k, tier)) {
        const on = picked === c.id;
        row.append(h('button.upg' + (on ? '.on' : '') + (picked && !on ? '.off' : ''), {
          type: 'button', disabled: !open || (picked && !on) ? true : null, 'aria-pressed': String(on),
          onclick: () => { if (picked) return; if (P.pickUpgrade(s, k, tier, c.id)) { game.persist(); toast(`${d.name.split(' ')[0]} learned ${c.name}`); renderCompany(game); } },
        }, h('b', null, c.name), h('span', null, c.desc)));
      }
      if (!open) row.append(h('span.uplock', null, `Unlocks at level ${lv}`));
      else if (!picked) row.append(h('span.upnote', null, 'Pick one (permanent)'));
      body.append(row);
    });
  }

  if (tab === 'gear') {
    const slots = h('div.gslots');
    for (const sl of SLOTS) {
      const it = m.gear[sl] && P.itemByUid(s, m.gear[sl]);
      slots.append(h('button.gslot' + (gearSlot === sl ? '.on' : ''), { type: 'button', onclick: () => { gearSlot = sl; renderDetail(game); }, 'aria-pressed': String(gearSlot === sl) },
        it ? itemTile(it, 26) : h('span.itile', null, slotIcon(sl, 26)),
        h('span.ginfo', null, h('span.gsl', null, SLOT_NAMES[sl]), it ? h('span.gnm', { style: { color: tierColor(it) } }, itemName(it)) : h('span.gnm.none', null, 'Empty'),
          it ? h('span.gst', null, Object.entries(itemStats(it)).map(([a, v]) => statText(a, v)).join(', ')) : null)));
    }
    body.append(slots);
    body.append(h('div.gacts', null, h('button.btn.small', { type: 'button', onclick: () => { const n = P.autoEquip(s); game.persist(); toast(n ? `${n} piece${n > 1 ? 's' : ''} equipped across the team` : 'The team already wears the best'); renderCompany(game); } }, 'Auto-equip the team')));
    const cur = m.gear[gearSlot] && P.itemByUid(s, m.gear[gearSlot]);
    if (cur) {
      const cost = upgradeCost(cur), maxed = (cur.plus || 0) >= MAX_PLUS;
      body.append(h('div.gacts', null,
        h('button.btn.small', { type: 'button', disabled: maxed || s.gold < cost ? true : null, onclick: () => { if (P.upgradeItem(s, cur.uid)) { game.persist(); toast(itemName(cur)); renderCompany(game); } } },
          maxed ? 'Fully upgraded' : h('span', null, `Upgrade `, goldIcon(), String(cost))),
        h('button.btn.small', { type: 'button', onclick: () => { P.unequip(s, k, gearSlot); game.persist(); renderCompany(game); } }, 'Take off')));
    }
    const pack = s.inv.filter((it) => BASES[it.base].slot === gearSlot && it.uid !== m.gear[gearSlot])
      .sort((a, b) => b.tier - a.tier || (b.plus || 0) - (a.plus || 0));
    body.append(h('div.label', null, `Pack: ${SLOT_NAMES[gearSlot].toLowerCase()} (${pack.length})`));
    const pl = h('div.pack');
    if (!pack.length) pl.append(h('div.empty', null, 'Nothing here yet. Missions drop gear: first clears always do.'));
    for (const it of pack) {
      const who = P.wearer(s, it.uid);
      pl.append(h('div.pitem', null, itemTile(it, 24),
        h('span.ginfo', null, h('span.gnm', { style: { color: tierColor(it) } }, itemName(it)), h('span.gst', null, Object.entries(itemStats(it)).map(([a, v]) => statText(a, v)).join(', ') + (who ? ` · on ${UNITS[who].name.split(' ')[0]}` : ''))),
        h('button.btn.small.gold', { type: 'button', onclick: () => { P.equip(s, k, it.uid); game.persist(); renderCompany(game); } }, 'Equip'),
        h('button.btn.small', { type: 'button', 'aria-label': `Sell ${itemName(it)} for ${sellValue(it)} gold`, onclick: () => { P.sellItem(s, it.uid); game.persist(); toast(`Sold for ${sellValue(it)} gold`); renderCompany(game); } }, h('span', null, 'Sell ', goldIcon(), String(sellValue(it))))));
    }
    body.append(pl);
  }

  if (tab === 'train') {
    body.append(h('p.note', null, `Training raises a stat for good. Ranks go up to the recruit's level, ${P.TRAIN_MAX} at most.`));
    for (const [stt, label] of [['hp', 'Health'], ['atk', 'Attack'], ['def', 'Defence']]) {
      const r = m.train[stt], cost = P.trainCost(r), capped = r >= P.TRAIN_MAX || r >= m.level;
      body.append(h('div.trow', null,
        h('span.tl', null, h('b', null, label), h('small', null, `+${Math.round(P.TRAIN[stt] * 100 * r)}% now · +${Math.round(P.TRAIN[stt] * 100)}% a rank`)),
        h('span.rank', null, h('span.rbar', { role: 'progressbar', 'aria-label': `Rank ${r} of ${P.TRAIN_MAX}`, 'aria-valuenow': String(r), 'aria-valuemax': String(P.TRAIN_MAX) },
          h('i.cap', { style: { width: `${(Math.min(m.level, P.TRAIN_MAX) / P.TRAIN_MAX) * 100}%` } }), h('i', { style: { width: `${(r / P.TRAIN_MAX) * 100}%` } })), h('small', null, `${r} / ${P.TRAIN_MAX}`)),
        h('button.btn.small.gold', { type: 'button', disabled: capped || s.gold < cost ? true : null, onclick: () => { if (P.train(s, k, stt)) { game.persist(); renderCompany(game); } } },
          capped ? (r >= P.TRAIN_MAX ? 'Max' : `Level ${r + 1}`) : h('span', null, 'Train ', goldIcon(), String(cost)))));
    }
  }
}
const stat = (label, v) => h('div.stat', null, h('span', null, label), h('b', null, String(v)));
