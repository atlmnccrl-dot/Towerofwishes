/*
 * Tower of Wishes — the heroes' anime bust portraits (Proposal art, tools/portraits/).
 *
 * assets/portraits/<hero>_<expr>.webp, 768 px square with alpha, the hero facing right.
 * 'calm' is used on the VS card and in the fight HUD chips; 'cry' (a battle cry) in the
 * combat cut-ins. Images load on first use; get() returns null until one is ready, and
 * the callers fall back to the pixel sprite.
 *
 * window.TowPortraits:
 *   keyFor(u|key)      the portrait set for a unit (aliases: Eiryn's variants, frost Braxen) or null
 *   get(u|key, expr)   a loaded HTMLImageElement or null (starts the load)
 *   failed(u|key)      true once that hero's portraits failed to load
 *   preload(keys)      start loading these heroes' portraits
 *   FACE, EYES         [x, y, w, h] of the face and the eye band, as fractions of the image
 *   EYE_POS            the two irises [x, y], for glints
 *   ACCENT             each hero's colour (rim light, cut-in speed lines)
 *   cutins             combat cut-ins on (Settings; main.js keeps it in sync)
 */
(function () {
  'use strict';
  const HEROES = ['kael', 'eiryn', 'eloryn', 'braxen', 'aerys', 'nox'];
  const ALIAS = { eirynAsh: 'eiryn', eirynMage: 'eiryn', braxenFrost: 'braxen' };
  const ACCENT = { kael: '#9cc3dd', eiryn: '#a98bff', eloryn: '#f3a58c', braxen: '#ffb24a', aerys: '#ffcf5a', nox: '#9a6bff' };
  // Measured in tools/portraits (the SVG frame is 700 units from (160, 170); mirrored at export).
  const FACE = [0.2971, 0.1857, 0.3714, 0.4];
  const EYES = [0.3571, 0.3286, 0.3, 0.1286];
  const EYE_POS = [[0.459, 0.4], [0.573, 0.399]]; // the irises, for glints
  const imgs = {}, bad = {};

  function keyFor(u) {
    const k = typeof u === 'string' ? u : u && u.key;
    if (!k) return null;
    const h = ALIAS[k] || k;
    return HEROES.indexOf(h) >= 0 ? h : null;
  }
  function load(h, expr) {
    const id = h + '_' + expr;
    if (imgs[id] || typeof Image === 'undefined') return imgs[id];
    const im = new Image();
    im.onerror = () => { bad[h] = true; };
    im.src = 'assets/portraits/' + id + '.webp';
    imgs[id] = im;
    return im;
  }
  function get(u, expr) {
    const h = keyFor(u);
    if (!h || bad[h]) return null;
    const im = load(h, expr || 'calm');
    return im && im.complete && im.naturalWidth > 0 ? im : null;
  }
  function preload(keys) { for (const k of keys || HEROES) { const h = keyFor(k); if (h) { load(h, 'calm'); load(h, 'cry'); } } }
  function failed(u) { const h = keyFor(u); return !!(h && bad[h]); }

  window.TowPortraits = { HEROES, ACCENT, FACE, EYES, EYE_POS, keyFor, get, failed, preload, cutins: true };
})();
