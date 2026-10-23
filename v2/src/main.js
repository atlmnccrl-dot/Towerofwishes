// Tower of Wishes v2: boot, the loop, input.
import { createFight, step, command } from './combat/sim.js';
import { loadSprites, loadFx } from './render/assets.js';
import { createView } from './render/view.js';
import { createHud } from './ui/hud.js';
import { HEROES, FOES } from './data/fighters.js';

const DT = 1 / 60;
const canvas = document.getElementById('stage');
let fight = null, view = null, hud = null, acc = 0, last = 0, freeze = 0, slowUntilImpact = 0, seed = 1;
let auto = false;
try { auto = localStorage.getItem('tow2.auto') === '1'; } catch (e) { /* storage may be blocked */ }

function newFight() {
  seed = (Math.random() * 1e9) | 0;
  fight = createFight('clearing', { seed, auto });
  view && view.reset();
}

const actions = {
  special(id) { command(fight, { type: 'special', id }); },
};

async function boot() {
  const sets = [...new Set([...Object.values(HEROES), ...Object.values(FOES)].map((d) => d.set))];
  const [sprites, fx] = await Promise.all([loadSprites(sets), loadFx()]);
  view = createView(canvas, sprites, fx);
  hud = createHud(document.body, sprites, actions);
  newFight();
  view.resize();
  window.addEventListener('resize', () => view.resize());
  document.getElementById('loading').hidden = true;
  requestAnimationFrame(frame);
}

function frame(now) {
  const real = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  // time: a short freeze on big blows; slow motion while an art winds up
  let scale = 1;
  if (freeze > 0) { freeze -= real; scale = 0; }
  else if (slowUntilImpact > 0) { slowUntilImpact -= real; scale = 0.45; }
  acc += real * scale;
  let events = [];
  while (acc >= DT) { step(fight, DT); events = events.concat(fight.events); acc -= DT; }
  for (const e of events) {
    if (e.type === 'special') slowUntilImpact = e.impactAt / 0.45 * 0.9;
    if (e.type === 'artImpact') { freeze = 0.14; slowUntilImpact = 0; }
    if (e.type === 'hit' && e.big) freeze = Math.max(freeze, 0.05);
  }
  fight.events = events;
  view.draw(fight, real * Math.max(scale, 0.2));
  fight.events = [];
  hud.update(fight);
  requestAnimationFrame(frame);
}

// a tap on a bandit makes it the target; a tap on open ground clears it
canvas.addEventListener('pointerdown', (e) => {
  if (!fight || fight.result) return;
  const u = view.pick(fight, e.clientX, e.clientY);
  command(fight, { type: 'target', id: u ? u.id : null });
});
document.getElementById('regroup').addEventListener('click', () => command(fight, { type: 'regroup' }));
document.getElementById('auto').addEventListener('click', () => {
  auto = !fight.auto; command(fight, { type: 'auto', on: auto });
  try { localStorage.setItem('tow2.auto', auto ? '1' : '0'); } catch (e) { /* fine without */ }
});
document.getElementById('retry').addEventListener('click', newFight);

window.__v2 = { get fight() { return fight; }, command: (c) => command(fight, c), newFight };
boot().catch((e) => { document.getElementById('loading').textContent = 'Could not load the art: ' + e.message; });
