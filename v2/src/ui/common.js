// Small DOM helpers shared by the screens: an element builder, portraits from the atlas, drawn
// item icons, and a toast.
import { BASES, TIERS } from '../data/items.js';

export const $ = (s, root = document) => root.querySelector(s);
// h('div.card', { onclick, style, ... }, child, 'text', ...)
export function h(tag, attrs, ...kids) {
  const [name, ...cls] = tag.split('.'), el = document.createElement(name || 'div');
  if (cls.length) el.className = cls.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'vars') for (const [n, x] of Object.entries(v)) el.style.setProperty(n, x);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}

let atlas = null;
export function setPortraits(p) { atlas = p; }
// a recruit's or foe's face from the portrait atlas; a dark silhouette when not met yet
export function face(set, size = 32, hidden = false) {
  const el = h('div.face' + (hidden ? '.unknown' : ''));
  const p = atlas.sets[set] || [0, 0], k = size / atlas.cell;
  Object.assign(el.style, { width: size + 'px', height: size + 'px', backgroundSize: `${atlas.w * k}px ${atlas.h * k}px`, backgroundPosition: `-${p[0] * k}px -${p[1] * k}px` });
  return el;
}

// Item icons, drawn at 16x16 and scaled up: the shape by base, the colour by tier.
const SHAPES = {
  blade: ['......Wa', '.....Wa.', '....Wa..', '...Wa...', 'h.Wa....', '.hh.....', '.Gh.....', 'G..h....'],
  edge: ['.......W', '......Wa', '.....Wa.', '....Wa..', '.h.Wa...', '..h.....', '.Gh.....', 'G.......'],
  maul: ['....aaa.', '...aWWa.', '...aWaa.', '....hh..', '...h....', '..h.....', '.h......', 'G.......'],
  focus: ['......aW', '.....aWa', '......a.', '.....h..', '....h...', '...h....', '..h.....', '.G......'],
  mail: ['.aa..aa.', 'aWaaaaWa', 'aaWaaWaa', '.aaWWaa.', '.aaaaaa.', '.aWaaWa.', '.aaaaaa.', '..aaaa..'],
  leathers: ['.hh..hh.', 'hhhhhhhh', '.hhaahh.', '.hhhhhh.', '.hhaahh.', '.hhhhhh.', '.hGGGGh.', '..hhhh..'],
  robe: ['..aaaa..', '.aWaaWa.', '.aaWWaa.', '.aaaaaa.', 'aaaWWaaa', 'aaaaaaaa', 'aaaaaaaa', 'aa.aa.aa'],
  fang: ['..h..h..', '...hh...', '...a....', '..aW....', '..aWa...', '...aa...', '...a....', '........'],
  ember: ['...G....', '..GaG...', '.GaWaG..', '.aWWWa..', '.aWWWa..', '..aWa...', '...a....', '........'],
  feather: ['......aW', '.....aWa', '....aWa.', '...aWa..', '..aWa...', '.aWa....', '.h......', 'h.......'],
  leech: ['..aaaa..', '.a....a.', 'a..WW..a', 'a.W..W.a', 'a.W..W.a', 'a..WW..a', '.a....a.', '..aaaa..'],
  ward: ['...aa...', '..aWWa..', '.aWaaWa.', '.aWaaWa.', '.aWaaWa.', '..aWWa..', '...aa...', '........'],
};
export function itemIcon(it, size = 28) {
  const c = h('canvas.icon', { width: 8, height: 8, 'aria-hidden': 'true' }); c.style.width = c.style.height = size + 'px';
  const g = c.getContext('2d'), col = TIERS[it.tier].color;
  const pal = { a: col, W: '#fff6dc', h: '#8a6a44', G: '#d9b04a' };
  (SHAPES[it.base] || SHAPES.blade).forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}
export const slotIcon = (slot, size = 28) => { const base = { weapon: 'blade', armor: 'mail', charm: 'ward' }[slot]; const c = itemIcon({ base, tier: 0 }, size); c.style.opacity = '0.25'; return c; };
export const tierColor = (it) => TIERS[it.tier].color;
export const baseSlot = (it) => BASES[it.base].slot;

let toastT = 0;
export function toast(text) {
  const el = $('#toast'); el.textContent = text; el.hidden = false; el.classList.remove('out');
  clearTimeout(toastT); toastT = setTimeout(() => { el.classList.add('out'); toastT = setTimeout(() => (el.hidden = true), 300); }, 1800);
}
export const goldIcon = () => h('span.coin', { 'aria-hidden': 'true' });
