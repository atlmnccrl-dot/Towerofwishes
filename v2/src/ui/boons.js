// The run's boons on screen: the pick of one from three after a win, their icons (a frame of the boon's
// own effect, from the effects atlas), and the row of what the run has.
import { BOONS, RARITY, MAX_BOON } from '../data/boons.js';
import * as P from '../game/progress.js';
import { $, h } from './common.js';

// a boon's icon: the middle of its effect, drawn at pixel scale into a small canvas
export const boonArt = (game, id, size = 48) => fxArt(game, BOONS[id].art, size);
// any effect of the atlas as a still icon (the boons, the places of an expedition)
export function fxArt(game, art, size = 48) {
  const c = document.createElement('canvas'); c.width = c.height = size; c.className = 'boonart';
  const A = game.fxAtlas, d = A && A.data.fx[art];
  if (!d) return c;
  const fr = d.frames[Math.floor(d.frames.length * 0.45)] || d.frames[0], [pg, sx, sy, w, hh] = fr;
  const k = Math.max(1, Math.floor(Math.min(size / w, size / hh) * 2) / 2), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(A.pages[pg], sx, sy, w, hh, Math.round((size - w * k) / 2), Math.round((size - hh * k) / 2), Math.round(w * k), Math.round(hh * k));
  return c;
}
const pips = (n) => h('span.pips', { 'aria-label': `Level ${n} of ${MAX_BOON}` }, ...Array.from({ length: MAX_BOON }, (_, i) => h('i' + (i < n ? '.on' : ''))));

// the run's boons as a row of small icons (the team screen, the fight)
export function boonRow(game, size = 22) {
  const have = game.save.run ? game.save.run.boons : {};
  return Object.entries(have).map(([id, n]) => h('span.bchip.r' + BOONS[id].rarity, { title: `${BOONS[id].name} ${'I'.repeat(n)}: ${BOONS[id].desc(n)}` }, boonArt(game, id, size), n > 1 ? h('b', null, n) : null));
}

// the choice: three cards; a tap takes one. `then` runs once it is taken
export function showBoons(game, then) {
  const s = game.save, run = s.run;
  if (!run || !run.pick) { if (then) then(); return; }
  const box = $('#boons');
  const take = (id, card) => {
    if (!P.chooseBoon(s, id)) return;
    game.persist(); game.audio.play('level_up', { gain: 0.7 }); if (game.haptics) game.haptics.buzz('big');
    card.classList.add('taken'); box.classList.add('done');
    setTimeout(() => { box.hidden = true; box.classList.remove('done'); if (then) then(); }, 650);
  };
  const cards = run.pick.map((id, i) => {
    const B = BOONS[id], n = (run.boons[id] || 0) + 1;
    const card = h('button.boon.r' + B.rarity, { type: 'button', vars: { '--i': i }, 'aria-label': `${B.name}: ${B.desc(n)}` },
      h('span.rar', null, RARITY[B.rarity]), boonArt(game, id, 64), h('b', null, B.name), pips(n), h('small', null, n > 1 ? `Level ${n}` : 'New'), h('p', null, B.desc(n)));
    card.onclick = () => take(id, card);
    return card;
  });
  const have = Object.keys(run.boons).length;
  box.replaceChildren(h('div.btitle', null, h('b', null, 'Choose a boon'), h('small', null, `${run.wins} win${run.wins === 1 ? '' : 's'} this run · boons last until the run ends${have ? ` · you have ${have}` : ''}`)), h('div.bcards', null, ...cards));
  box.hidden = false;
  game.audio.play('quest_new', { gain: 0.6 });
}
