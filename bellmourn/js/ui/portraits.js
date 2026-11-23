// Warden portraits drawn in code: a pixel bust (shoulders, cloak or hood, face, hair, eyes and the weapon
// over the shoulder) from the warden's own look colours in heroes.js, on a backdrop of their colour.
// Cached per warden, size and state; locked wardens are a dark silhouette with a faint rim of light.
import { HEROES } from '../game/heroes.js';
import { mix, hash } from './kit.js';

const hex = (n, d = '#808080') => (typeof n === 'number' ? '#' + n.toString(16).padStart(6, '0') : (n || d));
const cache = new Map();
// each warden's signature colour (cards, glows): the cloak, else the tunic, brightened
export function heroColour(id) {
  const L = (HEROES[id] && HEROES[id].look) || {}; const C = L.colors || {};
  const fix = { warden: '#c8343a', huntress: '#3a9a80', bellbreaker: '#d08a40', lamplighter: '#ffb040', kestrel: '#e0303a', hollis: '#4ab0a0', wren: '#a070e0' };
  return fix[id] || mix(hex(C.cloak ?? C.tunic, '#a09080'), '#ffffff', 0.2);
}

// a w x h portrait (w, h in buffer pixels; drawn at a 2x pixel size when big enough)
export function portrait(ui, id, x, y, w, h, o = {}) {
  const key = id + '|' + w + 'x' + h + '|' + (o.locked ? 'L' : '') + (o.dim ? 'D' : '');
  let c = cache.get(key);
  if (!c) { c = paint(id, w, h, o); if (cache.size > 40) cache.clear(); cache.set(key, c); }
  ui.g.drawImage(c, Math.round(x), Math.round(y));
}

function paint(id, W, H, o) {
  const s = W >= 60 ? 2 : 1; const w = Math.ceil(W / s), h = Math.ceil(H / s);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const mask = new Uint8Array(w * h); let fig = false;
  const R = (x, y, ww, hh, col) => { x = Math.round(x); y = Math.round(y); ww = Math.max(1, Math.round(ww)); hh = Math.max(1, Math.round(hh)); g.fillStyle = col; g.fillRect(x * s, y * s, ww * s, hh * s);
    if (fig) for (let yy = Math.max(0, y); yy < Math.min(h, y + hh); yy++) for (let xx = Math.max(0, x); xx < Math.min(w, x + ww); xx++) mask[yy * w + xx] = 1; };
  const D = HEROES[id] || {}; const L = D.look || {}; const C = L.colors || {};
  const sig = heroColour(id); const lock = !!o.locked;
  // backdrop: a vertical wash of the warden's colour with a dithered halo behind the head
  for (let yy = 0; yy < h; yy++) R(0, yy, w, 1, mix(mix(sig, '#000000', 0.72), '#05060a', yy / h * 0.8));
  const hx = Math.round(w / 2), hy = Math.round(h * 0.4);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const d = Math.hypot(xx - hx, (yy - hy) * 1.1) / (w * 0.55); if (d < 1 && hash(xx * 31 + yy * 7) < (1 - d) * 0.5) R(xx, yy, 1, 1, mix(sig, '#000000', lock ? 0.85 : 0.45)); }
  // rain streaks
  for (let i = 0; i < 12; i++) { const rx = hash(i * 3 + id.length) * w, ry = hash(i * 7) * h; R(rx, ry, 1, 3, mix(sig, '#000000', 0.55)); }
  fig = true;
  const sk = lock ? '#07080a' : hex(C.skin, '#d0b090'), hair = lock ? '#07080a' : hex(C.hair, '#302820');
  const cloak = lock ? '#07080a' : hex(C.cloak ?? C.hood ?? C.shoulder ?? C.tunic, '#403830'), cloakD = lock ? '#07080a' : mix(cloak, '#000000', 0.35);
  const tunic = lock ? '#07080a' : hex(C.tunic, '#403830');
  const bulk = L.bulk || 1; const sw = Math.round(w * 0.36 * Math.min(1.25, bulk)); const by = Math.round(h * 0.66);
  // weapon behind the shoulder
  const wcol = lock ? '#07080a' : hex(L.blade, '#c8ccd4'), wood = lock ? '#07080a' : '#4a3020';
  const wx = hx + Math.round(w * 0.22);
  switch (L.weapon) {
    case 'sword': for (let k = 0; k < h * 0.55; k++) R(wx + k * 0.25 - 4, by - k, 2, 1, wcol); R(wx - 6, by - 2, 7, 1, lock ? '#07080a' : hex(L.guard, '#8a7a58')); break;
    case 'crossbow': R(wx - 6, by - h * 0.42, 2, h * 0.36, wood); R(wx - 10, by - h * 0.4, 10, 2, wood); R(wx - 10, by - h * 0.4 + 2, 1, 4, wcol); break;
    case 'hammer': R(wx - 3, by - h * 0.55, 2, h * 0.5, wood); R(wx - 8, by - h * 0.62, 12, 7, lock ? '#07080a' : '#6a6a74'); R(wx - 8, by - h * 0.62, 12, 1, lock ? '#07080a' : '#9a9aa4'); break;
    case 'staff': R(wx - 3, by - h * 0.62, 2, h * 0.6, wood); R(wx - 5, by - h * 0.66, 6, 5, lock ? '#07080a' : hex(L.orb, '#ffb040')); break;
    case 'knife': R(wx - 4, by - h * 0.3, 1, h * 0.22, wcol); R(wx - 1, by - h * 0.26, 1, h * 0.18, wcol); break;
    case 'anchor': R(wx - 3, by - h * 0.5, 2, h * 0.45, wcol); R(wx - 8, by - h * 0.12, 12, 2, wcol); R(wx - 8, by - h * 0.16, 2, 4, wcol); R(wx + 2, by - h * 0.16, 2, 4, wcol); break;
    case 'fork': R(wx - 3, by - h * 0.6, 2, h * 0.58, lock ? '#07080a' : '#8a7a9a'); R(wx - 6, by - h * 0.66, 2, 6, wcol); R(wx - 1, by - h * 0.66, 2, 6, wcol); R(wx - 6, by - h * 0.6, 7, 1, wcol); R(wx - 4, by - h * 0.7, 3, 3, lock ? '#07080a' : hex(L.orb, '#b070ff')); break;
    default: break;
  }
  // shoulders and chest
  for (let yy = 0; yy < h - by + 1; yy++) { const ww = sw + Math.round(yy * 0.6); R(hx - ww, by + yy, ww * 2, 1, yy < 2 ? cloakD : cloak); }
  R(hx - Math.round(sw * 0.35), by + 1, Math.round(sw * 0.7), h - by, tunic);
  if (!lock) { R(hx - sw, by, sw * 2, 1, mix(cloak, '#ffffff', 0.18)); if (C.belt) R(hx - Math.round(sw * 0.35), h - 3, Math.round(sw * 0.7), 1, hex(C.belt)); if (L.ruff) for (let k = -4; k <= 4; k += 2) R(hx + k, by - 1, 2, 2, hex(L.ruff)); if (L.scarf) R(hx - 5, by - 1, 10, 3, hex(C.cloak)); if (L.backBell) R(hx + sw - 4, by - 6, 5, 6, '#8a6a30'); }
  // neck, head, face
  const hr = Math.round(w * 0.15); R(hx - 2, by - 4, 4, 5, sk);
  for (let yy = -hr; yy <= hr; yy++) { const ww = Math.round(Math.sqrt(hr * hr - yy * yy) * 0.86); R(hx - ww, hy + yy, ww * 2 + 1, 1, sk); }
  if (!lock) R(hx - Math.round(hr * 0.7), hy + 1, 1, Math.round(hr * 0.6), mix(sk, '#000000', 0.2));
  // hair / hood
  if (L.hood) { const hc = lock ? '#07080a' : hex(C.hood, cloak); for (let yy = -hr - 3; yy <= hr + 2; yy++) { const ww = Math.round(Math.sqrt(Math.max(0, (hr + 3) * (hr + 3) - yy * yy))); R(hx - ww, hy + yy, ww * 2 + 1, 1, hc); } for (let yy = -hr + 1; yy <= hr; yy++) { const ww = Math.round(Math.sqrt(Math.max(0, hr * hr - yy * yy)) * 0.7); R(hx - ww, hy + yy + 1, ww * 2 + 1, 1, sk); } R(hx - hr - 2, hy, 2, hr + 4, lock ? '#07080a' : mix(hc, '#000000', 0.35)); R(hx + hr + 1, hy, 2, hr + 4, lock ? '#07080a' : mix(hc, '#000000', 0.35)); }
  else { for (let yy = -hr - 1; yy <= -Math.round(hr * 0.3); yy++) { const ww = Math.round(Math.sqrt(Math.max(0, (hr + 1) * (hr + 1) - yy * yy))); R(hx - ww, hy + yy, ww * 2 + 1, 1, hair); }
    R(hx - hr - 1, hy - Math.round(hr * 0.5), 2, hr, hair); R(hx + hr, hy - Math.round(hr * 0.5), 2, hr, hair);
    if (L.longHair) { R(hx - hr - 1, hy, 3, Math.round(hr * 2.2), hair); R(hx + hr - 1, hy, 3, Math.round(hr * 2.2), hair); } }
  // eyes (red for the night, their own colour if they have one); locked: two faint embers
  const eye = lock ? mix(sig, '#000000', 0.4) : hex(L.eyes, '#ffffff'); const ey = hy + 1;
  if (lock) { R(hx - 3, ey, 1, 1, eye); R(hx + 2, ey, 1, 1, eye); }
  else { R(hx - 4, ey, 2, 1, '#120c0a'); R(hx + 2, ey, 2, 1, '#120c0a'); R(hx - 3, ey, 1, 1, eye); R(hx + 3, ey, 1, 1, eye); R(hx - 1, hy + Math.round(hr * 0.6), 2, 1, mix(sk, '#000000', 0.35)); }
  // a rim of light on the right edge of the silhouette
  fig = false; const rim = lock ? mix(sig, '#000000', 0.25) : mix(sig, '#ffffff', 0.35);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w - 1; xx++) if (mask[yy * w + xx] && !mask[yy * w + xx + 1] && (lock || yy < by + 3)) R(xx, yy, 1, 1, rim);
  if (o.dim) { g.fillStyle = 'rgba(4,5,8,0.45)'; g.fillRect(0, 0, W, H); }
  return c;
}
