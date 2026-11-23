// The menus' style kit: one visual language for every screen in js/ui. Dark iron frames with crisp pixel
// borders and rivets, parchment-and-ink panels, cards with rarity glows, buttons with hover, press and
// focus states, chips, bars, rays, sparks, and a Screen base class that turns the last frame's drawn
// hit areas into hover, taps, keyboard and pad focus, and selection feedback (a flash, a shake, a sound).
// Everything is drawn on the UI canvas (buffer pixels, scaled up without smoothing) in the 5x7 font.
import { DATA } from './data.js';
import { HEROES } from '../game/heroes.js';

// ------------------------------------------------------------------ palette
export const PAL = {
  bg0: '#06070a', bg1: '#0c0e13', bg2: '#141821', bg3: '#1c212c',
  ironK: '#040506', iron0: '#15181e', iron1: '#232832', iron2: '#3a414d', iron3: '#5d6573', iron4: '#8b93a1', rivet: '#9aa2ae',
  text: '#e8dfcc', soft: '#c4baa6', dim: '#8a8376', faint: '#5a554d', dark: '#36332e',
  gold: '#e8b860', goldHi: '#ffe4a0', goldLo: '#8a6232', blood: '#c8242a', bloodLo: '#5a1014', ok: '#7ad88a', bad: '#e0504a',
  parch: '#d8c398', parch2: '#c9b080', parchLo: '#a68a5a', parchEdge: '#6e5030', ink: '#2a1c10', inkSoft: '#5a4028', inkRed: '#8c2416',
  hp: '#d83a40', ember: '#ff9a40', shard: '#9adcf0', tonic: '#e05060',
};

export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
export const RARITY = {
  common: { name: 'COMMON', col: '#b8af9c', glow: '#8a8478', n: 0 },
  rare: { name: 'RARE', col: '#5ab4ff', glow: '#2f78d0', n: 1 },
  epic: { name: 'EPIC', col: '#c47cff', glow: '#8a3ad8', n: 2 },
  legendary: { name: 'LEGENDARY', col: '#ffbc40', glow: '#e07a10', n: 3 },
};
export const rarityOf = (r) => RARITY[r] || RARITY.common;

// The Resonances: B's RES wins (colour, name, icon); this is the fallback until it lands.
export const RES_ORDER = ['ember', 'rime', 'blight', 'thunder', 'crimson', 'dawn', 'silence'];
const RES_FALLBACK = {
  ember: { name: 'EMBER', col: '#ff7a30', el: 'FIRE' },
  rime: { name: 'RIME', col: '#8fe2ff', el: 'FROST' },
  blight: { name: 'BLIGHT', col: '#9ad43a', el: 'POISON' },
  thunder: { name: 'THUNDER', col: '#ffe04a', el: 'STORM' },
  crimson: { name: 'CRIMSON', col: '#e8283e', el: 'BLOOD' },
  dawn: { name: 'DAWN', col: '#fff0c4', el: 'HOLY' },
  silence: { name: 'SILENCE', col: '#a464ff', el: 'VOID' },
};
const ELEMENT_RES = { fire: 'ember', frost: 'rime', poison: 'blight', storm: 'thunder', blood: 'crimson', holy: 'dawn', void: 'silence' };
export const resOfElement = (el) => ELEMENT_RES[el] || el;
const colStr = (c) => (typeof c === 'number' ? '#' + c.toString(16).padStart(6, '0') : c);
const resCache = new Map();
export function resOf(id) {
  id = resOfElement(id) || 'ember';
  const src = DATA.RES && DATA.RES[id]; const key = id + (src ? ':b' : '');
  if (resCache.has(key)) return resCache.get(key);
  const fb = RES_FALLBACK[id] || { name: String(id).toUpperCase(), col: '#c8c0b0', el: '' };
  const col = colStr((src && (src.color ?? src.colour ?? src.col ?? src.hex)) ?? fb.col);
  const r = { id, name: String((src && (src.name || src.title)) || fb.name).toUpperCase(), col, el: fb.el, hi: mix(col, '#ffffff', 0.45), lo: mix(col, '#000000', 0.55), deep: mix(col, '#06070a', 0.82), icon: (src && typeof src.icon === 'string') ? src.icon : id };
  resCache.set(key, r); return r;
}

// the run's health: A keeps hp and maxHp null for 'full, not yet known' (the warden's own health stands in)
export function hpOf(run) {
  run = run || {}; const max = run.maxHp ?? (HEROES[run.hero] ? HEROES[run.hero].hp : 100); const hp = run.hp ?? max;
  return { hp: Math.round(hp), max: Math.round(max), k: max > 0 ? hp / max : 1, full: hp >= max };
}

// what a handler's answer means: false, { ok: false } or a refusal message ('NOT ENOUGH EMBERS', 'NO ...',
// 'FULLY BUILT', 'ALREADY ...', 'SOLD OUT') refuse; anything else (true, a message, nothing) is done
export const refused = (r) => r === false || (!!r && typeof r === 'object' && r.ok === false) || (typeof r === 'string' && /^(NOT |NO |NOTHING|FULLY|ALREADY|SOLD|YOU HAVE|YOUR FLASK IS FULL|IT CANNOT)/.test(r));

// ------------------------------------------------------------------ colour and maths
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = {
  out: (t) => 1 - Math.pow(1 - clamp(t), 3),
  in: (t) => Math.pow(clamp(t), 3),
  inOut: (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  back: (t) => { t = clamp(t); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  elastic: (t) => { t = clamp(t); return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; },
};
export function rgb(c) { c = colStr(c); if (c[0] !== '#') return [200, 190, 170]; const n = parseInt(c.length === 4 ? c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(a, b, k) { const A = rgb(a), B = rgb(b); const f = (i) => Math.round(A[i] + (B[i] - A[i]) * k).toString(16).padStart(2, '0'); return '#' + f(0) + f(1) + f(2); }
export function rgba(c, a) { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; }
export function hash(i) { let x = (i | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }
export const inside = (r, p) => !!(r && p && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);

// ------------------------------------------------------------------ text
export function fit(ui, s, w) { s = String(s); if (ui.measure(s) <= w) return s; while (s.length > 1 && ui.measure(s + '.') > w) s = s.slice(0, -1); return s.trimEnd() + '.'; }
export function dots(ui, s, w) { s = String(s).trimEnd().replace(/[.,:;]+$/, ''); while (s.length && ui.measure(s + '...') > w) { const k = s.lastIndexOf(' '); s = k > 0 ? s.slice(0, k) : s.slice(0, -1); } return s.replace(/[.,:;]+$/, '') + '...'; }
// wrapped lines, at most max of them (the last one ends in dots when the text runs on)
export function lines(ui, s, w, max = 99) {
  let L = ui.wrapEven(String(s || '').toUpperCase(), w);
  if (L.length > max) { L = ui.wrap(String(s || '').toUpperCase(), w); const keep = L.slice(0, max); keep[max - 1] = dots(ui, L.slice(max - 1).join(' '), w); return keep; }
  return L.map((l) => fit(ui, l, w));
}
// a paragraph; reveal (0..1) types it in letter by letter; returns the height used
export function para(ui, s, x, y, w, o = {}) {
  const L = o.lines || lines(ui, s, w, o.max); const lh = o.lh || 9; let left = o.reveal === undefined ? 1e9 : Math.floor(o.reveal * L.join('').length);
  L.forEach((l, i) => {
    if (left <= 0) return; const part = l.slice(0, left); left -= l.length;
    const tx = o.align === 'center' ? x + Math.floor(w / 2) : x;
    ui.text(part, tx, y + i * lh, { color: o.color || PAL.text, align: o.align, shadow: o.shadow, alpha: o.alpha });
  });
  return L.length * lh;
}
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// ------------------------------------------------------------------ offscreen canvases (cards, parchment)
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return { c, g }; }
// draw with the UI's helpers into another context (ui.rect, ui.text... all use ui.g)
export function into(ui, g, fn) { const g0 = ui.g; ui.g = g; try { fn(); } finally { ui.g = g0; } }
export function alpha(ui, a, fn) { const g = ui.g, a0 = g.globalAlpha; g.globalAlpha = a0 * clamp(a); try { fn(); } finally { g.globalAlpha = a0; } }

// ------------------------------------------------------------------ frames and panels
// The iron frame: a black outer line with cut corners, a bevel (light top-left, dark bottom-right), a dark
// inner line, a fill with a faint top sheen, and rivets in the corners. o: fill, accent (a coloured inner
// line), rivets (default on for frames bigger than 30x24), edge (outer colour), notch (cut corners).
export function iron(ui, x, y, w, h, o = {}) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w < 4 || h < 4) return;
  const k = o.edge || PAL.ironK; const fill = o.fill || PAL.iron0;
  ui.rect(x + 1, y, w - 2, 1, k); ui.rect(x + 1, y + h - 1, w - 2, 1, k); ui.rect(x, y + 1, 1, h - 2, k); ui.rect(x + w - 1, y + 1, 1, h - 2, k);
  ui.rect(x + 1, y + 1, w - 2, h - 2, o.bevelLo || PAL.iron1);
  ui.rect(x + 1, y + 1, w - 2, 1, o.bevelHi || PAL.iron3); ui.rect(x + 1, y + 1, 1, h - 2, o.bevelHi || PAL.iron3);
  ui.rect(x + 2, y + h - 2, w - 3, 1, PAL.ironK); ui.rect(x + w - 2, y + 2, 1, h - 3, PAL.ironK);
  ui.rect(x + 2, y + 2, w - 4, h - 4, PAL.ironK);
  ui.rect(x + 3, y + 3, w - 6, h - 6, fill);
  if (o.sheen !== false && h > 10) ui.rect(x + 3, y + 3, w - 6, 1, mix(fill, '#ffffff', 0.08));
  if (o.accent) { const a = o.accent; ui.outline(x + 3, y + 3, w - 6, h - 6, a); }
  const riv = o.rivets ?? (w > 30 && h > 24);
  if (riv) for (const [rx, ry] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) { ui.rect(rx, ry, 2, 2, PAL.iron2); ui.rect(rx, ry, 1, 1, PAL.rivet); ui.rect(rx + 1, ry + 1, 1, 1, PAL.ironK); }
}
// gold corner brackets around a rect (focus, the selected card); they breathe out by `pulse` px
export function brackets(ui, x, y, w, h, col = PAL.gold, len = 5, pulse = 0) {
  const p = Math.round(pulse); x -= p; y -= p; w += p * 2; h += p * 2;
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
    ui.rect(dx > 0 ? cx : cx - len + 1, cy, len, 1, col); ui.rect(cx, dy > 0 ? cy : cy - len + 1, 1, len, col);
  }
}
// a soft glow: outlines of falling alpha around a rect
export function glow(ui, x, y, w, h, col, strength = 1, rings = 4) {
  for (let i = rings; i >= 1; i--) alpha(ui, strength * (0.5 / i) * (1 - i / (rings + 1)) * 1.6, () => ui.outline(x - i, y - i, w + i * 2, h + i * 2, col));
}
// a title plate: a dark strip with a gold rule underneath and diamond ends
export function plate(ui, x, y, w, label, o = {}) {
  const h = o.h || 13; ui.rect(x, y, w, h, o.fill || 'rgba(6,7,10,0.92)');
  ui.rect(x, y + h, w, 1, o.rule || PAL.goldLo); ui.rect(x + 3, y + h, w - 6, 1, o.ruleHi || PAL.gold);
  for (const ex of [x - 2, x + w + 1]) { ui.rect(ex, y + h - 1, 1, 3, o.ruleHi || PAL.gold); ui.rect(ex - 1, y + h, 3, 1, o.ruleHi || PAL.gold); }
  if (label) ui.text(label, x + Math.floor(w / 2), y + Math.floor((h - 7) / 2), { align: 'center', color: o.color || PAL.goldHi, scale: 1 });
}
// a header: big title (scale 2) with a short subtitle line to its right or below
export function header(ui, x, y, title, sub, o = {}) {
  ui.text(title, x, y, { color: o.color || PAL.text, scale: 2, shadow: '#000' });
  const tw = ui.measure(title, 2);
  if (sub && !(o.maxW && tw + 6 + ui.measure(sub) > o.maxW)) ui.text(sub, o.below ? x : x + tw + 6, o.below ? y + 17 : y + 7, { color: o.subCol || PAL.dim });
  ui.rect(x, y + 16, Math.max(24, Math.min(tw, 60)), 1, o.rule || PAL.blood);
  return tw;
}

// Parchment: an aged sheet with fibres, stains and a burnt, ragged edge, cached per size and seed.
const parchCache = new Map();
export function parchment(ui, x, y, w, h, seed = 1) {
  w = Math.round(w); h = Math.round(h); const key = w + 'x' + h + ':' + seed;
  let c = parchCache.get(key);
  if (!c) {
    const o = canvas(w, h); const g = o.g; c = o.c;
    const P = (px, py, col) => { g.fillStyle = col; g.fillRect(px, py, 1, 1); };
    g.fillStyle = PAL.parch; g.fillRect(0, 0, w, h);
    // broad mottling (big soft blotches in two tones)
    for (let i = 0; i < (w * h) / 900; i++) { const cx = hash(seed * 31 + i) * w, cy = hash(seed * 57 + i * 3) * h, r = 6 + hash(i * 7 + seed) * 18; const col = hash(i + seed * 13) < 0.5 ? PAL.parch2 : '#e2cfa6';
      for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const d = (xx * xx + yy * yy) / (r * r); if (d < 1 && hash((cx + xx) * 73 + (cy + yy) * 9157 + seed) > 0.35 + d * 0.6) P(Math.round(cx + xx), Math.round(cy + yy), col); } }
    // fibres
    for (let i = 0; i < (w * h) / 40; i++) { const px = Math.floor(hash(i * 3 + seed) * w), py = Math.floor(hash(i * 5 + seed * 7) * h); P(px, py, hash(i + 99) < 0.5 ? PAL.parchLo : '#e8d8b4'); if (hash(i * 11) < 0.3) P(px + 1, py, PAL.parch2); }
    // ragged, burnt edge: per column/row a depth from a hash, then darkening toward it
    const depth = (i, s) => 2 + Math.floor(hash(i * 13 + s) * 2.2 + hash(Math.floor(i / 5) * 7 + s) * 2.5);
    for (let xx = 0; xx < w; xx++) { const dt = depth(xx, seed + 1), db = depth(xx, seed + 2); for (let k = 0; k < dt + 3; k++) P(xx, k, k < dt ? 'rgba(0,0,0,0)' : (k < dt + 1 ? PAL.parchEdge : PAL.parchLo)); for (let k = 0; k < db + 3; k++) P(xx, h - 1 - k, k < db ? 'rgba(0,0,0,0)' : (k < db + 1 ? PAL.parchEdge : PAL.parchLo)); }
    for (let yy = 0; yy < h; yy++) { const dl = depth(yy, seed + 3), dr = depth(yy, seed + 4); for (let k = 0; k < dl + 3; k++) P(k, yy, k < dl ? 'rgba(0,0,0,0)' : (k < dl + 1 ? PAL.parchEdge : PAL.parchLo)); for (let k = 0; k < dr + 3; k++) P(w - 1 - k, yy, k < dr ? 'rgba(0,0,0,0)' : (k < dr + 1 ? PAL.parchEdge : PAL.parchLo)); }
    g.globalCompositeOperation = 'destination-out';
    for (let xx = 0; xx < w; xx++) { g.fillRect(xx, 0, 1, depth(xx, seed + 1)); g.fillRect(xx, h - depth(xx, seed + 2), 1, depth(xx, seed + 2)); }
    for (let yy = 0; yy < h; yy++) { g.fillRect(0, yy, depth(yy, seed + 3), 1); g.fillRect(w - depth(yy, seed + 4), yy, depth(yy, seed + 4), 1); }
    g.globalCompositeOperation = 'source-over';
    // a few tea stains (rings)
    for (let i = 0; i < 2; i++) { const cx = (0.2 + hash(seed * 3 + i) * 0.6) * w, cy = (0.25 + hash(seed * 5 + i) * 0.5) * h, r = 7 + hash(i + seed) * 9; g.fillStyle = 'rgba(120,80,40,0.16)'; for (let a = 0; a < 80; a++) { const t = a / 80 * Math.PI * 2; if (hash(a * 7 + i) < 0.7) g.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r * 0.8), 1, 1); } }
    if (parchCache.size > 24) parchCache.clear(); parchCache.set(key, c);
  }
  ui.g.drawImage(c, Math.round(x), Math.round(y));
}

// The backdrop of a full screen: a deep gradient with a dithered vignette and slow drifting motes.
// o.veil: over the live game view (lets it show faintly through); o.tint: a colour mixed into the glow.
export function backdrop(ui, t, o = {}) {
  const w = ui.w, h = ui.h, g = ui.g;
  if (o.veil) ui.rect(0, 0, w, h, 'rgba(4,5,8,' + (o.veil === true ? 0.78 : o.veil) + ')');
  else { const steps = 8; for (let i = 0; i < steps; i++) ui.rect(0, Math.floor(h * i / steps), w, Math.ceil(h / steps) + 1, mix(PAL.bg2, PAL.bg0, i / (steps - 1))); }
  const tint = o.tint || '#3a1418';
  // a low glow behind the content
  const cx = w * (o.cx ?? 0.5), cy = h * (o.cy ?? 0.55);
  for (let r = 5; r >= 1; r--) { g.globalAlpha = 0.05; g.fillStyle = tint; const rw = w * 0.16 * r, rh = h * 0.13 * r; g.fillRect(Math.round(cx - rw), Math.round(cy - rh), Math.round(rw * 2), Math.round(rh * 2)); }
  g.globalAlpha = 1;
  // dithered corners
  g.fillStyle = '#000000';
  for (let yy = 0; yy < h; yy += 2) { const dy = Math.abs(yy - h / 2) / (h / 2); for (let xx = (yy >> 1) & 1; xx < w; xx += 2) { const dx = Math.abs(xx - w / 2) / (w / 2); const d = dx * dx * 0.7 + dy * dy * 0.6; if (d > 0.55 + hash(xx * 7 + yy * 131) * 0.4) g.fillRect(xx, yy, 1, 1); } }
  // motes
  const n = o.motes ?? 26; const mc = o.moteCol || '#ffb070';
  for (let i = 0; i < n; i++) { const sp = 4 + hash(i * 3) * 8; const x = (hash(i) * w + Math.sin(t * 0.5 + i) * 6) % w; const y = h - ((t * sp + hash(i * 7) * h) % (h + 10)); g.globalAlpha = 0.25 + 0.35 * hash(i * 11) * (0.6 + 0.4 * Math.sin(t * 2 + i)); g.fillStyle = mc; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ buttons, chips, bars
// st: { hover, press, focus, disabled } (from Screen.hit). o: primary (gold), danger, icon (fn(ui, x, y)
// drawing a 7x7 icon), sub (second line), cost ({ draw(ui, x, y), n, ok }), align, small, col.
export function button(ui, r, label, st = {}, o = {}) {
  let { x, y, w, h } = r; x = Math.round(x); y = Math.round(y);
  const dis = st.disabled || o.disabled; const hot = !dis && (st.hover || st.focus); const down = !dis && st.press;
  if (down) y += 1; else if (hot) y -= 1;
  const prim = o.primary, dang = o.danger;
  const fill = dis ? '#101114' : prim ? (hot ? '#4a3018' : '#33210f') : dang ? (hot ? '#3a1416' : '#260d10') : (hot ? '#232833' : PAL.iron0);
  const hi = dis ? '#25272c' : prim ? (hot ? PAL.goldHi : PAL.gold) : dang ? (hot ? '#ff7a70' : '#a8403a') : (hot ? PAL.iron4 : PAL.iron3);
  const lo = prim ? PAL.goldLo : dang ? '#5a1a1a' : PAL.iron1;
  ui.rect(x + 1, y, w - 2, h, PAL.ironK); ui.rect(x, y + 1, w, h - 2, PAL.ironK); // cut corners
  ui.rect(x + 1, y + 1, w - 2, h - 2, lo); ui.rect(x + 1, y + 1, w - 2, 1, hi); ui.rect(x + 1, y + 1, 1, h - 2, hi);
  ui.rect(x + 2, y + 2, w - 4, h - 4, fill);
  if (!dis && !down) ui.rect(x + 2, y + h - 1, w - 4, 1, '#000');
  if (hot && !dis) { ui.rect(x + 2, y + 2, w - 4, 1, mix(fill, '#ffffff', 0.12)); }
  if (st.focus && !st.hover && !dis) brackets(ui, x - 2, y - 2, w + 4, h + 4, PAL.gold, 3);
  const col = o.col || (dis ? '#55524c' : prim ? (hot ? '#fff2cc' : PAL.goldHi) : dang ? '#ffb0a8' : (hot ? '#ffffff' : PAL.text));
  let tx = x + 6; const ty = o.sub ? y + Math.round((h - 16) / 2) : y + Math.round((h - 7) / 2);
  const iw = o.icon ? 10 : 0; const cw = o.cost ? costW(ui, o.cost) + 6 : 0;
  if (o.icon) { alpha(ui, dis ? 0.4 : 1, () => o.icon(ui, x + 6, y + Math.round((h - 7) / 2))); tx += iw; }
  const avail = w - 12 - iw - cw; const center = o.align !== 'left';
  const lbl = fit(ui, label, avail);
  if (center) ui.text(lbl, x + 6 + iw + Math.floor(avail / 2), ty, { align: 'center', color: col, shadow: '#000' });
  else ui.text(lbl, tx, ty, { color: col, shadow: '#000' });
  if (o.sub) { const sl = fit(ui, o.sub, avail); if (center) ui.text(sl, x + 6 + iw + Math.floor(avail / 2), ty + 9, { align: 'center', color: dis ? '#45423d' : (o.subCol || PAL.dim), shadow: false }); else ui.text(sl, tx, ty + 9, { color: dis ? '#45423d' : (o.subCol || PAL.dim), shadow: false }); }
  if (o.cost) drawCost(ui, o.cost, x + w - 6 - costW(ui, o.cost), y + Math.round((h - 7) / 2), dis);
  return { x, y, w, h };
}
// a cost: { icon: fn(ui,x,y), n, ok } drawn as icon + number (red when it cannot be paid)
export function costW(ui, c) { return (c.icon ? 9 : 0) + ui.measure(String(c.n ?? '')); }
export function drawCost(ui, c, x, y, dim) {
  if (c.icon) { alpha(ui, dim ? 0.45 : 1, () => c.icon(ui, x, y)); x += 9; }
  ui.text(String(c.n ?? ''), x, y, { color: dim ? '#55524c' : (c.ok === false ? PAL.bad : (c.col || PAL.goldHi)), shadow: '#000' });
}
// a small tag: coloured text on a dark strip with a coloured left notch; returns its width
export function chip(ui, x, y, label, col, o = {}) {
  const w = ui.measure(label) + 6 + (o.icon ? 9 : 0); x = Math.round(x); y = Math.round(y);
  ui.rect(x, y, w, 9, o.fill || mix(col, '#000000', 0.78)); ui.rect(x, y, 1, 9, col); ui.rect(x + 1, y + 8, w - 1, 1, mix(col, '#000000', 0.5));
  let tx = x + 3; if (o.icon) { o.icon(ui, tx, y + 1); tx += 9; }
  ui.text(label, tx, y + 1, { color: o.text || col, shadow: false });
  return w;
}
export function bar(ui, x, y, w, h, k, col, o = {}) {
  x = Math.round(x); y = Math.round(y); ui.rect(x - 1, y - 1, w + 2, h + 2, PAL.ironK); ui.rect(x, y, w, h, o.back || '#17191f');
  const fw = Math.round(w * clamp(k)); if (fw > 0) { ui.rect(x, y, fw, h, col); ui.rect(x, y, fw, 1, mix(col, '#ffffff', 0.35)); if (h > 2) ui.rect(x, y + h - 1, fw, 1, mix(col, '#000000', 0.3)); }
  if (o.ticks) for (let i = 1; i < o.ticks; i++) ui.rect(x + Math.round(w * i / o.ticks), y, 1, h, PAL.ironK);
}
// rotating light rays from a point (unlock reveals, legendary cards)
export function rays(ui, cx, cy, r, col, t, n = 12, a = 0.25) {
  const g = ui.g; g.save(); g.globalAlpha *= a; g.fillStyle = col; g.translate(Math.round(cx), Math.round(cy)); g.rotate(t * 0.4);
  for (let i = 0; i < n; i++) { g.rotate(Math.PI * 2 / n); g.beginPath(); g.moveTo(0, 0); g.lineTo(r, -r * 0.09); g.lineTo(r, r * 0.09); g.closePath(); g.fill(); }
  g.restore();
}
// a pixel diamond (map nodes, tier pips)
export function diamond(ui, cx, cy, r, col, edge) {
  for (let i = -r; i <= r; i++) { const hw = r - Math.abs(i); ui.rect(cx - hw, cy + i, hw * 2 + 1, 1, col); }
  if (edge) for (let i = -r; i <= r; i++) { const hw = r - Math.abs(i); ui.rect(cx - hw, cy + i, 1, 1, edge); ui.rect(cx + hw, cy + i, 1, 1, edge); }
}
// a dashed or solid pixel line
export function line(ui, x0, y0, x1, y1, col, dash = 0, gap = 0, phase = 0) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy, i = Math.floor(phase);
  ui.g.fillStyle = col;
  for (;;) { if (!dash || (i % (dash + gap)) < dash) ui.g.fillRect(x0, y0, 1, 1); i++; if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}

// ------------------------------------------------------------------ the Screen base
// A screen is new XScreen(game).open(data, handlers); update(dt, inp) each frame; draw(ui); close().
// Drawing registers hit areas with this.hit(id, x, y, w, h, o) (o.nav: false keeps it out of keyboard focus,
// o.disabled shakes and refuses). The next update hit-tests them: the pointer hovers (a finger presses),
// a tap activates (onTap(id, item, how)), arrows and the pad move focus to the nearest item that way,
// confirm activates the focus, back calls onBack(). Feedback: flash(), shake(), burst(), ring(), pop().
export class Screen {
  constructor(game) { this.game = game || {}; this.t = 0; this.items = []; this.fx = []; this.isOpen = false; this.focusId = null; this.hoverId = null; this.pressId = null; this.keyMode = false; this.shakeT = 0; this.shakeA = 0; }
  open(data, handlers) { this.data = data || {}; this.handlers = handlers || {}; this.t = 0; this.isOpen = true; this.fx = []; this.items = []; this.focusId = null; this.hoverId = null; this.keyMode = false; this.onOpen(this.data); return this; }
  close() { this.isOpen = false; this.onClose(); }
  onOpen() {} onClose() {} onTap() {} onBack() {} onUpdate() {} render() {}
  get touch() { return !!this.lastTouch; }
  sound(name, o) { try { if (this.game.sound && this.game.sound.play) this.game.sound.play(name, o); } catch (e) { /* no sound */ } }
  call(name, ...a) { const f = this.handlers && this.handlers[name]; if (typeof f === 'function') { try { return f(...a); } catch (e) { console.error(e); } } return undefined; }

  update(dt, inp) {
    if (!this.isOpen) return; dt = Math.min(dt || 0, 0.1); this.t += dt; this.dt = dt; inp = inp || {};
    if (inp.touch !== undefined) this.lastTouch = !!inp.touch;
    const items = this.items; const p = inp.pointer || null; this.pointer = p;
    let hov = null; if (p) for (const it of items) if (inside(it, p)) hov = it;
    const hid = hov ? hov.id : null;
    if (p && !p.touch && hid !== this.hoverId && hov && !hov.disabled && hov.tick !== false) this.sound('ui');
    this.hoverId = p && !p.touch ? hid : null; this.pressId = p && p.down && !p.moved ? hid : null;
    if (p && !p.touch && hov && hov.nav !== false && this.mouseMoved(p)) { this.focusId = hov.id; this.keyMode = false; }
    const nav = items.filter((it) => it.nav !== false);
    const dir = inp.left ? [-1, 0] : inp.right ? [1, 0] : inp.up ? [0, -1] : inp.down ? [0, 1] : null;
    if (dir && nav.length && !this.onDir(dir, inp)) {
      this.keyMode = true; const cur = nav.find((it) => it.id === this.focusId);
      const next = cur ? nearest(nav, cur, dir) : nav[0];
      if (next && next.id !== this.focusId) { this.focusId = next.id; this.sound('ui'); this.onFocus(next.id, next); }
    }
    if (inp.confirm) { const cur = nav.find((it) => it.id === this.focusId); if (cur) this.activate(cur, { key: true }); else if (nav[0]) { this.focusId = nav[0].id; this.keyMode = true; } }
    if (inp.back) this.onBack();
    for (const tp of inp.taps || []) { let top = null; for (const it of items) if (inside(it, tp)) top = it; if (top) { this.focusId = top.id; this.activate(top, { tap: true, touch: !!inp.touch }); break; } else this.onTapNothing(tp); }
    this.onUpdate(dt, inp);
    this.shakeT = Math.max(0, this.shakeT - dt);
    for (const f of this.fx) { f.t += dt; if (f.vx !== undefined) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.grav ?? 40) * dt; f.vx *= 1 - 2 * dt; } }
    this.fx = this.fx.filter((f) => f.t < f.life);
  }
  mouseMoved(p) { const m = this.lastMouse; this.lastMouse = { x: p.x, y: p.y }; return !m || m.x !== p.x || m.y !== p.y || p.down; }
  onDir() { return false; } onFocus() {} onTapNothing() {}
  activate(it, how) { if (it.disabled) { this.deny(it); return; } if (it.onTap) it.onTap(how); else this.onTap(it.id, it, how); }
  deny(it) { this.shake(2, 0.22); this.sound('block'); if (it) this.fx.push({ kind: 'deny', x: it.x, y: it.y, w: it.w, h: it.h, t: 0, life: 0.3 }); }

  draw(ui) {
    if (!this.isOpen) return; this.ui = ui; this.items = [];
    const g = ui.g; g.save();
    if (this.shakeT > 0) { const k = this.shakeT / this.shakeDur; g.translate(Math.round(Math.sin(this.t * 61) * this.shakeA * k), Math.round(Math.cos(this.t * 47) * this.shakeA * k * 0.5)); }
    try { this.render(ui); this.drawFx(ui); } finally { g.restore(); }
  }
  // register a hit area; returns its state for drawing
  hit(id, x, y, w, h, o = {}) {
    const it = { id, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), ...o }; this.items.push(it);
    return { hover: this.hoverId === id, press: this.pressId === id, focus: this.focusId === id && (this.keyMode || this.hoverId === id), disabled: !!o.disabled, kfocus: this.focusId === id && this.keyMode };
  }
  // feedback
  shake(a = 3, dur = 0.3) { this.shakeA = a; this.shakeT = dur; this.shakeDur = dur; }
  flash(x, y, w, h, col = '#ffffff', life = 0.3) { this.fx.push({ kind: 'flash', x, y, w, h, col, t: 0, life }); }
  ring(x, y, col, r1 = 30, life = 0.5) { this.fx.push({ kind: 'ring', x, y, r1, col, t: 0, life }); }
  burst(x, y, col, n = 16, sp = 60, o = {}) { for (let i = 0; i < n; i++) { const a = hash(i * 7 + this.t * 100) * Math.PI * 2, s = sp * (0.3 + hash(i * 13 + this.t * 50) * 0.9); this.fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (o.up || 20), grav: o.grav ?? 60, col: hash(i * 3) < 0.3 ? '#ffffff' : col, t: 0, life: 0.5 + hash(i) * 0.6, size: hash(i * 5) < 0.25 ? 2 : 1 }); } }
  pop(text, x, y, col = PAL.goldHi, life = 1.1) { this.fx.push({ kind: 'text', text, x, y, col, t: 0, life }); }
  drawFx(ui) {
    for (const f of this.fx) {
      const k = f.t / f.life;
      if (f.kind === 'flash') alpha(ui, (1 - k) * 0.85, () => ui.rect(f.x, f.y, f.w, f.h, f.col));
      else if (f.kind === 'deny') alpha(ui, 1 - k, () => ui.outline(f.x - 1, f.y - 1, f.w + 2, f.h + 2, PAL.bad));
      else if (f.kind === 'ring') alpha(ui, 1 - k, () => { const r = Math.round(2 + ease.out(k) * f.r1); ui.ring(f.x, f.y, r, f.col); if (r > 3) ui.ring(f.x, f.y, r - 1, f.col); });
      else if (f.kind === 'spark') alpha(ui, 1 - k * k, () => ui.rect(f.x, f.y, f.size, f.size, f.col));
      else if (f.kind === 'text') ui.text(f.text, f.x, f.y - Math.round(ease.out(k) * 12), { align: 'center', color: f.col, alpha: Math.min(1, (1 - k) * 3) });
    }
  }
  // safe content box (notch and home bar)
  box(ui, m = 6) { const s = ui.safe || { l: 0, r: 0, b: 0 }; return { L: m + Math.round(s.l), R: ui.w - m - Math.round(s.r), T: m, B: ui.h - m - Math.round(s.b || 0) }; }
}
function nearest(items, cur, [dx, dy]) {
  const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2; let best = null, bs = Infinity;
  for (const it of items) { if (it === cur) continue; const ix = it.x + it.w / 2 - cx, iy = it.y + it.h / 2 - cy; const along = ix * dx + iy * dy; if (along <= 2) continue; const perp = Math.abs(ix * dy - iy * dx); const s = along + perp * 2.2; if (s < bs) { bs = s; best = it; } }
  return best;
}
