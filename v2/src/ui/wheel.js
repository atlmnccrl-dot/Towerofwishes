// The wheel: eight heroes round a wheel, the locked ones dark. A spin picks who leads the next run (only
// unlocked heroes can come up: game/progress.js spin; the others stay hidden until met); the wheel turns, ticks past every wedge, slows,
// lands on them, and the leader is revealed with their perk for the squad.
import { UNITS, CLASSES } from '../data/units.js';
import * as P from '../game/progress.js';
import { $, h, face, icon } from './common.js';
import { heroArt, artPx } from './heroart.js';

const N = P.HEROES.length, STEP = 360 / N;
let angle = 0, spinning = false;

export function renderWheel(game, after) {
  const s = game.save, wheel = $('#w-wheel');
  spinning = false;
  wheel.style.transform = `rotate(${angle}deg)`;
  wheel.replaceChildren(...P.HEROES.map((k, i) => {
    const d = UNITS[k], open = !!s.roster[k];
    return h('div.wedge' + (open ? '' : '.locked'), { vars: { '--a': i * STEP + 'deg', '--c': `var(--${d.cls})` } },
      // a hero not met yet stays hidden: a question mark, no face
      open ? h('div.wface', null, face(d.set, 64)) : h('div.wface.hidden', null, h('b', null, '?'), h('span.wlock', null, icon('lock', 18))),
      h('div.wname', null, open ? d.name.split(' ')[0] : '???'));
  }), ...P.HEROES.map((_, i) => h('i.peg', { vars: { '--a': i * STEP + STEP / 2 + 'deg' } })),   // the rim's pegs, between the wedges
  h('div.hub', null, h('span', null, 'VAEL')));
  const lockedN = P.HEROES.length - P.unlocked(s).length;
  $('#w-info').replaceChildren(...[
    h('div.jtag', null, s.runs && s.runs.count ? `Run ${s.runs.count + 1}` : 'Your first run'),
    h('h2.w-h', null, 'Who leads the company?'),
    h('p.w-p', null, 'The wheel picks the hero who leads this run. They always fight, fight harder, and give the whole squad their perk. The run lasts until a battle is lost or a Seal of Vael is taken.'),
    lockedN ? h('p.w-p.dim', null, `${lockedN} places on the wheel are still hidden. Find them on the road.`) : h('p.w-p.dim', null, 'Every hero is free.'),
    h('button.btn.big.primary', { id: 'w-spin', type: 'button', onclick: () => doSpin(game, after) }, icon('play', 18), 'Spin the wheel')].filter(Boolean));
  $('#w-burst').replaceChildren();
}

function doSpin(game, after) {
  if (spinning) return; spinning = true;
  $('#w-spin').disabled = true;
  const s = game.save, leader = P.spin(s, Math.random); game.after();
  const i = P.HEROES.indexOf(leader), jitter = (Math.random() - 0.5) * STEP * 0.6;
  // the wheel turns clockwise; wedge i is under the pointer when the angle is -i * STEP (mod 360)
  const from = angle, base = ((-i * STEP - from) % 360 + 360) % 360, to = from + 360 * 5 + base + jitter;
  const dur = game.fastWheel ? 250 : 5200, t0 = performance.now(); let lastPeg = Math.floor((from + STEP / 2) / STEP);
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const pointer = $('#w-pointer'), wheel = $('#w-wheel');
  function tick(now) {
    const t = Math.min(1, (now - t0) / dur); angle = from + (to - from) * ease(t);
    wheel.style.transform = `rotate(${angle}deg)`;
    const peg = Math.floor((angle + STEP / 2) / STEP);
    if (peg !== lastPeg) { lastPeg = peg; pointer.classList.remove('kick'); void pointer.offsetWidth; pointer.classList.add('kick'); game.audio.play('click_wood_01', { gain: 0.5, gap: 0.02 }); if (t > 0.6) game.haptics.buzz('tap'); }
    if (t < 1) requestAnimationFrame(tick); else land(game, leader, after);
  }
  requestAnimationFrame(tick);
}

function land(game, leader, after) {
  angle = ((angle % 360) + 360) % 360;
  $('#w-wheel').style.transform = `rotate(${angle}deg)`;
  const i = P.HEROES.indexOf(leader), d = UNITS[leader], lead = P.LEADERS[leader];
  $('#w-wheel').children[i].classList.add('won');
  game.audio.play('level_up'); game.haptics.buzz('big');
  // sparks from the pointer
  const burst = $('#w-burst'); burst.replaceChildren();
  for (let k = 0; k < 28; k++) {
    const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 140;
    burst.append(h('i', { style: { '--x': Math.cos(a) * r + 'px', '--y': Math.sin(a) * r + 'px', animationDelay: Math.random() * 0.15 + 's', background: k % 3 ? 'var(--gold)' : `var(--${d.cls})` } }));
  }
  setTimeout(() => {
    $('#w-info').replaceChildren(
      h('div.jtag', null, 'Leader of this run'),
      h('div.w-art', { vars: { '--c': `var(--${d.cls})` } }, heroArt(d.set, artPx() + 1)),
      h('div.jname', null, d.name), h('div.jtitle', null, d.title),
      h('div.cls', { vars: { '--c': `var(--${d.cls})` } }, `${CLASSES[d.cls].name} · leads with +${Math.round(P.LEAD_EDGE.hp * 100)}% health and attack`),
      h('div.perk', null, h('b', null, lead.name), h('span', null, lead.desc)),
      h('button.btn.big.primary', { id: 'w-go', type: 'button', onclick: () => after() }, 'Lead the company', icon('right', 18)));
    spinning = false;
  }, game.fastWheel ? 50 : 700);
}
