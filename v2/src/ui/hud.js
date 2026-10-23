// The HUD: a card per hero (health, the art meter, which is also the button that fires the art),
// Regroup and Auto, the target hint, and the result with Retry. DOM over the canvas.
import { specialReady } from '../combat/sim.js';
import { framesOf } from '../render/assets.js';

export function createHud(root, sprites, actions) {
  const $ = (s) => root.querySelector(s);
  const cards = $('#heroes'), result = $('#result');
  let built = null;

  // a hero's face for the card: the top of their idle frame, facing the viewer
  function portrait(set) {
    const c = document.createElement('canvas'); c.width = 28; c.height = 28;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const fr = (framesOf(set, 'Idle', 'S') || [])[0];
    if (fr) { const [pg, sx, sy, w, h, ox, oy] = fr, [ax, ay] = set.data.anchor, k = 1.6; g.drawImage(set.pages[pg], sx, sy, w, h, 14 + (ox - ax) * k, 63 + (oy - ay) * k, w * k, h * k); }
    return c;
  }

  function build(f) {
    cards.innerHTML = '';
    for (const u of f.units.filter((u) => u.team === 'hero')) {
      const el = document.createElement('div');
      el.className = 'hero'; el.style.setProperty('--hero', u.def.color);
      el.innerHTML = `<div class="face"></div><div class="info"><div class="name">${u.def.name}</div><div class="bar"><i></i></div><div class="hpnum"></div></div>
        <button class="art" type="button" id="art-${u.id}" aria-label="${u.def.name}: ${u.def.special.name}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="track" cx="18" cy="18" r="15"></circle><circle class="fill" cx="18" cy="18" r="15"></circle></svg><span>Art</span></button>`;
      el.querySelector('.face').appendChild(portrait(sprites[u.def.set]));
      el.querySelector('.art').addEventListener('click', () => actions.special(u.id));
      cards.appendChild(el);
    }
    built = f;
  }

  function update(f) {
    if (built !== f) build(f);
    for (const u of f.units.filter((u) => u.team === 'hero')) {
      const el = cards.querySelector(`#art-${u.id}`).closest('.hero');
      el.querySelector('.bar i').style.width = `${(u.hp / u.max) * 100}%`;
      el.querySelector('.hpnum').textContent = `${u.hp} / ${u.max}`;
      el.classList.toggle('down', u.state === 'ko');
      const btn = el.querySelector('.art'), ready = specialReady(u);
      btn.disabled = !ready; btn.classList.toggle('ready', ready);
      btn.querySelector('.fill').style.strokeDashoffset = String(94.2 * (1 - u.meter / 100));
    }
    $('#auto').setAttribute('aria-pressed', String(f.auto));
    $('#hint').textContent = f.target ? `Target: ${f.units.find((u) => u.id === f.target).def.name}` : 'Tap a bandit to make it the target';
    if (f.result && result.hidden) {
      result.hidden = false;
      $('#result-title').textContent = f.result === 'win' ? 'The clearing is yours' : f.result === 'lose' ? 'Kael and Eiryn are down' : 'Time ran out';
      $('#result-sub').textContent = `${Math.round(f.t)} s · ${f.units.filter((u) => u.team !== 'hero' && u.state === 'ko').length} bandits down`;
    }
    if (!f.result && !result.hidden) result.hidden = true;
  }
  return { update };
}
