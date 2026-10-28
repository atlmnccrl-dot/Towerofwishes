// The Stronghold: the company's camp rebuilt into a keep, building by building. Each building has six
// levels; level N costs gold and region N's material (missions in that region drop it). The rank is the
// sum of the levels; the camp scene behind shows what has been built (render/camp.js).
import { REGIONS, regionOpen } from '../data/campaign.js';
import * as P from '../game/progress.js';
import { $, h, toast, goldIcon, matIcon, sprite, icon } from './common.js';

export const LOOK = { barracks: 'cd_war_tent_red', treasury: 'cd_chest_gold', forge: 'cd_forge', yard: 'cd_training_dummy', shrine: 'cd_statue_gold', hall: 'cd_banner_red' };
const regionName = (rid) => REGIONS.find((r) => r.id === rid).name;

export function renderKeep(game) {
  const s = game.save, rank = P.keepRank(s);
  $('#s-rank').textContent = `Rank ${rank} of ${P.KEEP.length * P.KEEP_MAX} · ${P.rankName(s)}`;
  $('#s-gold').replaceChildren(goldIcon(), String(s.gold));
  // the materials: one per region; a region not reached yet shows where it will come from
  $('#s-mats').replaceChildren(...REGIONS.map((r) => {
    const open = regionOpen(s.cleared, r.id);
    return h('span.matpill' + (open ? '' : '.locked'), { title: open ? `${P.MATS[r.id]}: from missions in ${r.name}` : `${P.MATS[r.id]}: reach ${r.name}` },
      matIcon(r.id), h('b', null, open ? String(s.mats[r.id] || 0) : '–'), h('small', null, P.MATS[r.id]));
  }));
  $('#s-bar').style.width = `${(rank / (P.KEEP.length * P.KEEP_MAX)) * 100}%`;
  const list = $('#s-list'); list.replaceChildren();
  for (const b of P.KEEP) {
    const l = P.keepLevel(s, b.id), st = P.buildState(s, b.id), c = st === 'max' ? null : P.keepCost(l + 1);
    const pips = h('span.pips', { 'aria-label': `Level ${l} of ${P.KEEP_MAX}` }, ...Array.from({ length: P.KEEP_MAX }, (_, i) => h('i' + (i < l ? '.on' : ''))));
    const have = c ? s.mats[c.mat] || 0 : 0;
    const cost = c && st !== 'locked' ? h('span.cost', null,
      h('span' + (s.gold >= c.gold ? '' : '.short'), null, goldIcon(), String(c.gold)),
      h('span' + (have >= c.n ? '' : '.short'), null, matIcon(c.mat), `${have}/${c.n}`)) : null;
    const btn = st === 'max' ? h('span.done', null, icon('check', 16), 'Complete')
      : st === 'locked' ? h('span.lockline', null, icon('lock', 14), `Needs ${P.MATS[c.mat]} · reach ${regionName(c.mat)}`)
      : h('button.btn.small' + (st === 'ok' ? '.primary' : ''), { type: 'button', disabled: st === 'ok' ? null : true, onclick: () => {
        if (!P.build(s, b.id)) return;
        game.after(); game.audio.play('chest_open'); game.haptics.buzz('hit');
        toast(`${b.name} level ${P.keepLevel(s, b.id)}: ${b.bonus(P.keepLevel(s, b.id))}`);
        game.refreshKeep(); renderKeep(game);
      } }, icon('hammer', 16), l ? 'Upgrade' : 'Build');
    list.append(h('div.bld' + (l ? '' : '.unbuilt') + (st === 'ok' ? '.ready' : ''), null,
      h('span.bart', null, sprite(LOOK[b.id], 3)),
      h('div.binfo', null, h('div.bname', null, b.name, pips),
        h('div.bnow', null, l ? b.bonus(l) : b.what),
        st !== 'max' ? h('div.bnext', null, icon('up', 12), `Level ${l + 1}: ${b.bonus(l + 1)}`) : null),
      h('div.bact', null, cost, btn)));
  }
}
