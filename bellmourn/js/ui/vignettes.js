// Event vignettes: small pixel scenes painted in code from an event's art spec { scene, palette }. Each
// scene has a still layer (painted once per size and palette, cached) and a live layer drawn every frame
// (rain, flames, snow, gears, embers). Scenes: alley, chapel, docks, fire, rain (a figure in the rain),
// door, shrine, snow, desert, catacomb, hell, machine, heaven, bell, marsh, gallows. Unknown keys fall back
// through ALIAS, then to 'rain'. Palettes: night, cold, gold, blood, ember, sick, void, frost, sand, dawn.
import { hash, mix } from './kit.js';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => BAYER[(x & 3) + ((y & 3) << 2)];

export const PALETTES = {
  night: { sky: ['#06080f', '#0e1424', '#1c2840', '#2a3a56'], far: '#18202e', mid: '#0f141c', near: '#07090d', light: '#ffc46a', warm: '#ff8a3a', moon: '#e8e2cc', fog: '#4a5a72', accent: '#c8242a', ground: '#12161e', wet: '#2a3448' },
  cold: { sky: ['#040a10', '#0a1a26', '#14303e', '#22485a'], far: '#12242e', mid: '#0a161e', near: '#05090c', light: '#b8e8ff', warm: '#ffb060', moon: '#dff2ff', fog: '#3e6070', accent: '#5ab0e0', ground: '#0c1820', wet: '#1e3a48' },
  gold: { sky: ['#140c06', '#2a1a0c', '#4a2e14', '#6a4420'], far: '#2a1c10', mid: '#1a1008', near: '#0c0804', light: '#ffd890', warm: '#ffb040', moon: '#fff0c8', fog: '#7a5a3a', accent: '#e8b860', ground: '#1e140a', wet: '#3a2a18' },
  blood: { sky: ['#0c0204', '#24060a', '#4a0c12', '#6a1418'], far: '#2a0a0c', mid: '#160608', near: '#080203', light: '#ff6a50', warm: '#ff4030', moon: '#ff4a3a', fog: '#5a1a1c', accent: '#ff3030', ground: '#140608', wet: '#3a1014' },
  ember: { sky: ['#0a0402', '#2a0e04', '#5a2008', '#8a3a10'], far: '#2a1006', mid: '#160804', near: '#080302', light: '#ffb050', warm: '#ff7020', moon: '#ffd090', fog: '#6a3018', accent: '#ff8030', ground: '#180a04', wet: '#3a1a0a' },
  sick: { sky: ['#040804', '#0c160a', '#1a2a12', '#2a4018'], far: '#14200e', mid: '#0a1208', near: '#050804', light: '#c8f070', warm: '#e0d060', moon: '#d8f0a0', fog: '#3a5228', accent: '#9ad43a', ground: '#0e160a', wet: '#22341a' },
  void: { sky: ['#06040c', '#120a22', '#22123e', '#341c5a'], far: '#1a1028', mid: '#100a1a', near: '#06040a', light: '#d0a0ff', warm: '#ff70c0', moon: '#e8d8ff', fog: '#4a3a6a', accent: '#a464ff', ground: '#0e0a16', wet: '#2a1e40' },
  frost: { sky: ['#0a1018', '#1a2a3a', '#3a5068', '#6a8aa4'], far: '#4a6070', mid: '#22303c', near: '#101820', light: '#e8f6ff', warm: '#ffc080', moon: '#ffffff', fog: '#8aa4b8', accent: '#a8e8ff', ground: '#c8d8e4', wet: '#8aa0b4' },
  sand: { sky: ['#140a06', '#3a1c0c', '#6a3818', '#a05a28'], far: '#5a3418', mid: '#3a200e', near: '#1a0e06', light: '#ffd8a0', warm: '#ffa040', moon: '#ffd890', fog: '#a06a3a', accent: '#e8a040', ground: '#8a5428', wet: '#6a4020' },
  dawn: { sky: ['#2a3050', '#6a5a7a', '#c88a8a', '#ffd0a0'], far: '#5a4a5a', mid: '#3a2e3e', near: '#1a1420', light: '#fff4d0', warm: '#ffc080', moon: '#fffbe8', fog: '#c8a8a8', accent: '#ffe0a0', ground: '#3a2e34', wet: '#6a5a6a' },
  heaven: { sky: ['#e8dcc0', '#f4ead0', '#fff6e0', '#ffffff'], far: '#e0cfa0', mid: '#c8b080', near: '#a08860', light: '#ffffff', warm: '#ffd870', moon: '#ffffff', fog: '#fff8e8', accent: '#e8b860', ground: '#f0e4c8', wet: '#d8c8a0' },
};
const ALIAS = {
  street: 'alley', city: 'alley', lane: 'alley', market: 'alley', lantern: 'alley', church: 'chapel', nave: 'chapel', choir: 'chapel', cathedral: 'chapel',
  harbor: 'docks', harbour: 'docks', sea: 'docks', pier: 'docks', water: 'docks', campfire: 'fire', pyre: 'fire', camp: 'fire', foundry: 'forge', anvil: 'forge', rooftop: 'roof', roofs: 'roof', ball: 'ballroom', dance: 'ballroom', crows: 'crow', rat: 'rats', sewer: 'rats', note: 'letter', desk: 'letter', trader: 'merchant', cart: 'merchant',
  canal: 'docks', ship: 'docks', gibbet: 'gallows', choir: 'chapel', crypt: 'catacomb', tomb: 'catacomb', figure: 'rain', stranger: 'rain', hooded: 'rain', fog: 'rain', gate: 'door', cell: 'cage', gaol: 'door', vault: 'door', altar: 'shrine', haven: 'shrine', candle: 'shrine',
  frost: 'snow', ice: 'snow', frostmarch: 'snow', mountain: 'snow', dunes: 'desert', sand: 'desert', ashdunes: 'desert', ossuary: 'catacomb', catacombs: 'catacomb', undercroft: 'catacomb',
  abyss: 'hell', fire_pit: 'hell', inferno: 'hell', clock: 'machine', clockwork: 'machine', spire: 'machine', gears: 'machine', empyrean: 'heaven', sky: 'heaven', wheel: 'heaven',
  belfry: 'bell', tower: 'bell', bog: 'marsh', swamp: 'marsh', weeping: 'marsh', noose: 'gallows', scaffold: 'gallows',
};
const DEFAULT_PAL = { alley: 'night', chapel: 'gold', docks: 'cold', fire: 'ember', rain: 'night', door: 'night', shrine: 'gold', snow: 'frost', desert: 'sand', catacomb: 'sick', hell: 'blood', machine: 'gold', heaven: 'heaven', bell: 'night', marsh: 'sick', gallows: 'blood', roof: 'night', well: 'void', ballroom: 'gold', cage: 'night', mirror: 'night', crow: 'blood', merchant: 'gold', procession: 'night', child: 'night', letter: 'gold', rats: 'sick', forge: 'ember', lamp: 'void' };
export const SCENE_KEYS = Object.keys(DEFAULT_PAL);
export function sceneKey(k) { k = String(k || '').toLowerCase(); return DEFAULT_PAL[k] ? k : (ALIAS[k] || 'rain'); }
const PAL_ALIAS = { amber: 'gold', gild: 'gold', brass: 'gold', sea: 'cold', forge: 'ember', bog: 'sick', bone: 'bone' };
PALETTES.bone = { sky: ['#0c0a08', '#1e1a14', '#3a3428', '#5a5040'], far: '#2a261e', mid: '#18150f', near: '#0a0806', light: '#f0e8d0', warm: '#e0c080', moon: '#f4ecd8', fog: '#6a6050', accent: '#c8b890', ground: '#16130e', wet: '#3a3428' };
// a palette from a name, an object of overrides, or C's four colours [dark, mid, accent, highlight]
function paletteFor(scene, p) {
  const base = PALETTES[DEFAULT_PAL[scene]] || PALETTES.night;
  if (!p) return base;
  if (typeof p === 'string') return PALETTES[p] || PALETTES[PAL_ALIAS[p]] || base;
  if (Array.isArray(p) && p.length >= 4) { const [d, m, a, l] = p; return { sky: [d, mix(d, m, 0.45), m, mix(m, a, 0.3)], far: mix(d, m, 0.6), mid: mix(d, m, 0.3), near: mix(d, '#000000', 0.3), light: l, warm: a, moon: l, fog: mix(m, a, 0.25), accent: a, ground: mix(d, m, 0.35), wet: mix(m, d, 0.35) }; }
  return { ...base, ...p };
}

// ------------------------------------------------------------------ the painter
function painter(g, w, h, ox = 0, oy = 0) {
  const R = (v) => Math.round(v);
  const P = {
    g, w, h,
    rect(x, y, ww, hh, c) { g.fillStyle = c; g.fillRect(R(ox + x), R(oy + y), R(ww), R(hh)); },
    px(x, y, c) { g.fillStyle = c; g.fillRect(R(ox + x), R(oy + y), 1, 1); },
    // a vertical gradient through the colours, ordered-dithered between bands
    grad(x, y, ww, hh, cols) {
      x = R(x); y = R(y); ww = R(ww); hh = R(hh); const n = cols.length - 1;
      for (let yy = 0; yy < hh; yy++) { const f = (yy / Math.max(1, hh - 1)) * n; const i = Math.min(n - 1, Math.floor(f)), k = f - i;
        if (k < 0.06 || k > 0.94) { P.rect(x, y + yy, ww, 1, cols[k > 0.5 ? i + 1 : i]); continue; }
        g.fillStyle = cols[i]; g.fillRect(ox + x, oy + y + yy, ww, 1); g.fillStyle = cols[i + 1];
        for (let xx = 0; xx < ww; xx++) if (bay(x + xx, y + yy) < k) g.fillRect(ox + x + xx, oy + y + yy, 1, 1); }
    },
    // a dithered fill at a density 0..1
    dith(x, y, ww, hh, c, d) { g.fillStyle = c; x = R(x); y = R(y); for (let yy = 0; yy < R(hh); yy++) for (let xx = 0; xx < R(ww); xx++) if (bay(x + xx, y + yy) < d) g.fillRect(ox + x + xx, oy + y + yy, 1, 1); },
    // a scanline-filled polygon (crisp pixel edges)
    poly(pts, c, d = 1) {
      let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      g.fillStyle = c;
      for (let y = Math.ceil(y0); y <= Math.floor(y1); y++) {
        const xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
        xs.sort((p, q) => p - q);
        for (let i = 0; i + 1 < xs.length; i += 2) { const xa = R(xs[i]), xb = R(xs[i + 1]); if (d >= 1) g.fillRect(ox + xa, oy + y, xb - xa, 1); else for (let x = xa; x < xb; x++) if (bay(x, y) < d) g.fillRect(ox + x, oy + y, 1, 1); }
      }
    },
    circ(cx, cy, r, c, d = 1) { g.fillStyle = c; for (let y = -r; y <= r; y++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r - y * y))); if (d >= 1) g.fillRect(R(ox + cx - hw), R(oy + cy + y), hw * 2 + 1, 1); else for (let x = -hw; x <= hw; x++) if (bay(R(cx + x), R(cy + y)) < d) g.fillRect(R(ox + cx + x), R(oy + cy + y), 1, 1); } },
    ellipse(cx, cy, rx, ry, c) { g.fillStyle = c; if (ry <= 0) { g.fillRect(R(ox + cx - rx), R(oy + cy), rx * 2 + 1, 1); return; } for (let y = -ry; y <= ry; y++) { const hw = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); g.fillRect(R(ox + cx - hw), R(oy + cy + y), hw * 2 + 1, 1); } },
    // a dithered radial light: dense in the middle, thinning to nothing at r
    glow(cx, cy, r, c, a = 0.8, sy = 1) { g.fillStyle = c; cx = R(cx); cy = R(cy); const ry = Math.ceil(r * sy);
      for (let y = -ry; y <= ry; y++) for (let x = -r; x <= r; x++) { const d = Math.sqrt(x * x + (y / sy) * (y / sy)) / r; if (d < 1 && bay(cx + x, cy + y) < (1 - d) * (1 - d) * a) g.fillRect(ox + cx + x, oy + cy + y, 1, 1); } },
    line(x0, y0, x1, y1, c) { x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; g.fillStyle = c; for (;;) { g.fillRect(ox + x0, oy + y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
    rnd: (i) => hash(i),
  };
  return P;
}

// ------------------------------------------------------------------ shared pieces
function skyline(P, y, hMax, col, seed, o = {}) {
  let x = 0, i = 0; while (x < P.w) { const bw = 6 + Math.floor(P.rnd(seed + i) * 14), bh = 4 + Math.floor(P.rnd(seed + i * 7) * hMax); P.rect(x, y - bh, bw, bh + 2, col);
    if (P.rnd(seed + i * 3) < 0.5) P.rect(x + 2, y - bh - 3, 2, 3, col); // chimney
    if (P.rnd(seed + i * 5) < 0.35) P.poly([[x, y - bh], [x + bw / 2, y - bh - 5], [x + bw, y - bh]], col); // gable
    if (o.lights) for (let k = 0; k < 3; k++) if (P.rnd(seed + i * 11 + k) < 0.3) P.px(x + 2 + Math.floor(P.rnd(i + k * 9) * (bw - 4)), y - bh + 3 + Math.floor(P.rnd(i * 2 + k) * (bh - 3)), o.lights);
    x += bw; i++; }
}
function spire(P, cx, y, h, col) { P.rect(cx - 3, y - h * 0.55, 6, h * 0.55 + 2, col); P.poly([[cx - 4, y - h * 0.55], [cx, y - h], [cx + 4, y - h * 0.55]], col); P.rect(cx - 1, y - h * 0.48, 2, 3, mix(col, '#ffffff', 0.08)); }
// a hooded, cloaked figure standing (feet at x, y), height hh
function figure(P, x, y, hh, col, o = {}) {
  const hw = Math.max(3, Math.round(hh * 0.22)), head = Math.max(2, Math.round(hh * 0.13));
  P.poly([[x - hw, y], [x - hw * 0.8, y - hh * 0.45], [x - hw * 0.62, y - hh * 0.68], [x - hw * 0.3, y - hh * 0.74], [x + hw * 0.3, y - hh * 0.74], [x + hw * 0.62, y - hh * 0.68], [x + hw * 0.8, y - hh * 0.45], [x + hw, y]], col);
  P.circ(x, Math.round(y - hh * 0.8), head, col); P.poly([[x - head - 1, y - hh * 0.72], [x, y - hh - 1], [x + head + 1, y - hh * 0.72]], col);
  if (o.rim) { P.line(x + hw * 0.55, y - hh * 0.72, x + hw, y - 1, o.rim); P.px(x + head, Math.round(y - hh * 0.82), o.rim); }
  if (o.eyes) { P.px(x - 1, Math.round(y - hh * 0.8), o.eyes); P.px(x + 1, Math.round(y - hh * 0.8), o.eyes); }
  if (o.staff) P.rect(x + hw + 1, y - hh * 1.05, 1, hh * 1.05, o.staff);
}
function moon(P, x, y, r, pal) { P.glow(x, y, r * 4, pal.moon, 0.28); P.circ(x, y, r, pal.moon); P.circ(x - Math.ceil(r * 0.3), y - Math.ceil(r * 0.2), Math.max(1, Math.floor(r * 0.35)), mix(pal.moon, '#000000', 0.12)); }
function flame(P, x, y, s, t, seed, pal) {
  const cols = [pal.warm, pal.light, '#fff4d8'];
  for (let i = -s; i <= s; i++) { const hh = Math.max(1, Math.round((s * 2.2 - Math.abs(i) * 1.6) * (0.75 + 0.35 * Math.sin(t * 13 + i * 2.1 + seed) + 0.15 * Math.sin(t * 23 + seed + i)))); P.rect(x + i, y - hh, 1, hh, cols[0]); if (Math.abs(i) < s * 0.6) P.rect(x + i, y - Math.round(hh * 0.65), 1, Math.round(hh * 0.65), cols[1]); if (Math.abs(i) < s * 0.3) P.rect(x + i, y - Math.round(hh * 0.35), 1, Math.round(hh * 0.35), cols[2]); }
}
function rain(P, t, n, col, speed = 160, slant = 0.35, len = 4) {
  for (let i = 0; i < n; i++) { const x0 = hash(i * 3) * (P.w + 40), sp = speed * (0.8 + hash(i * 7) * 0.5); const y = ((t * sp + hash(i * 11) * P.h * 2) % (P.h + 20)) - 10; const x = (x0 - y * slant) % (P.w + 20);
    P.line(x, y, x - slant * len, y + len, col); }
}
function motes(P, t, n, col, sp = 10, up = true) { for (let i = 0; i < n; i++) { const x = (hash(i) * P.w + Math.sin(t * 0.8 + i) * 4 + P.w) % P.w; let y = (hash(i * 5) * P.h + t * sp * (0.5 + hash(i * 9))) % P.h; if (up) y = P.h - y; if (hash(i * 13 + Math.floor(t * 3)) < 0.85) P.px(x, y, col); } }
function gear(P, cx, cy, r, teeth, ang, col, hole) {
  const pts = []; const n = teeth * 4; for (let i = 0; i < n; i++) { const a = ang + (i / n) * Math.PI * 2; const rr = (i % 4 < 2) ? r + Math.max(2, r * 0.18) : r; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  P.poly(pts, col); P.circ(cx, cy, Math.round(r * 0.62), mix(col, '#000000', 0.35)); P.circ(cx, cy, Math.round(r * 0.5), col);
  for (let k = 0; k < 4; k++) { const a = ang + k * Math.PI / 2; P.line(cx, cy, cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, mix(col, '#000000', 0.35)); }
  P.circ(cx, cy, Math.max(1, Math.round(r * 0.16)), hole);
}

// ------------------------------------------------------------------ the scenes: { still(P, pal), live(P, pal, t) }
const SCENES = {
  alley: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.58);
      P.grad(0, 0, w, hz, c.sky); moon(P, w * 0.62, h * 0.16, Math.max(3, Math.round(h * 0.05)), c);
      skyline(P, hz, h * 0.22, c.far, 3, { lights: mix(c.light, c.far, 0.4) }); spire(P, w * 0.5, hz - h * 0.12, h * 0.34, c.far);
      P.grad(0, hz, w, h - hz, [c.ground, mix(c.ground, '#000000', 0.5)]);
      for (let k = 0; k < 9; k++) { const yy = hz + Math.round(Math.pow(k / 9, 1.6) * (h - hz)); P.rect(0, yy, w, 1, mix(c.ground, '#000000', 0.35)); }
      // the two walls in perspective, with windows
      const vx = w * 0.5, vy = hz - 4;
      for (const s of [-1, 1]) { const x0 = s < 0 ? 0 : w, x1 = vx + s * w * 0.2;
        P.poly([[x0, -2], [x1, vy - h * 0.34], [x1, vy + h * 0.06], [x0, h + 2]], c.mid);
        for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { const f = 0.15 + q * 0.28; const xx = x0 + (x1 - x0) * f; const top = -2 + (vy - h * 0.34 + 2) * f, bot = h + 2 + (vy + h * 0.06 - h - 2) * f; const yy = top + (bot - top) * (0.12 + r * 0.2); const ww = Math.max(1, Math.round(5 * (1 - f))), hh2 = Math.max(2, Math.round(8 * (1 - f)));
          P.rect(xx - (s < 0 ? 0 : ww), yy, ww, hh2, P.rnd(r * 9 + q * 3 + (s > 0 ? 50 : 0)) < 0.35 ? c.light : mix(c.mid, '#000000', 0.45)); }
        P.line(x0, h * 0.28, x1, vy - h * 0.18, mix(c.mid, '#ffffff', 0.06)); }
      // the lamp post in the foreground right, its pool of light, the puddle
      const lx = Math.round(w * 0.78), ly = Math.round(h * 0.22);
      P.glow(lx, ly + 2, Math.round(h * 0.28), c.light, 0.55); P.glow(lx - 4, h * 0.9, Math.round(w * 0.16), c.light, 0.35, 0.3);
      P.rect(lx - 1, ly + 4, 2, h - ly, '#050608'); P.rect(lx - 3, ly - 2, 6, 6, '#050608'); P.rect(lx - 2, ly - 1, 4, 4, c.light);
      P.ellipse(w * 0.42, h * 0.86, w * 0.12, 3, c.wet); P.rect(w * 0.42 - 2, h * 0.86 - 1, 4, 1, mix(c.light, c.wet, 0.4));
      figure(P, Math.round(w * 0.36), Math.round(h * 0.74), Math.round(h * 0.2), '#040506', { eyes: c.accent });
    },
    live(P, c, t) { rain(P, t, 70, mix(c.fog, '#ffffff', 0.25)); const lx = Math.round(P.w * 0.78), ly = Math.round(P.h * 0.22); if (Math.sin(t * 9) + Math.sin(t * 23) > 1.6) P.rect(lx - 2, ly - 1, 4, 4, '#ffffff'); },
  },
  chapel: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [mix(c.mid, '#000000', 0.3), c.mid, c.near]);
      const ax = w / 2, aw = w * 0.34, top = h * 0.12, base = h * 0.66;
      P.rect(ax - aw / 2, top + aw / 2, aw, base - top - aw / 2, mix(c.far, '#000000', 0.25)); P.circ(ax, top + aw / 2, Math.round(aw / 2), mix(c.far, '#000000', 0.25));
      // the rose window
      const rx = ax, ry = top + aw / 2, rr = Math.round(aw * 0.32); const glass = [c.accent, '#3a6ab0', c.light, '#8a2a6a', '#2a8a6a'];
      P.circ(rx, ry, rr + 1, '#050403');
      for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, y); if (d > rr) continue; const a = Math.atan2(y, x); const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8); const ring = d < rr * 0.35 ? 0 : 1; const ccol = (d % (rr * 0.35) < 1 || Math.abs(Math.sin(a * 4)) < 0.12) ? '#050403' : glass[(seg + ring * 3) % glass.length]; P.px(rx + x, ry + y, ccol); }
      // light beams down to the floor
      P.poly([[rx - rr, ry], [rx + rr, ry], [rx + rr * 2.6, h], [rx - rr * 0.6, h]], c.light, 0.16);
      // pillars
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const px = ax + s * (aw / 2 + 6 + k * w * 0.12) - 3; const pw = 7 - k; P.rect(px, h * (0.06 + k * 0.04), pw, h, mix(c.far, '#000000', 0.1 + k * 0.15)); P.rect(px, h * (0.06 + k * 0.04), 1, h, mix(c.far, '#ffffff', 0.08)); }
      // floor tiles and pews
      for (let r = 0; r < 6; r++) { const y = base + Math.round(Math.pow(r / 6, 1.4) * (h - base)); P.rect(0, y, w, 1, mix(c.near, '#000000', 0.4)); }
      for (let r = 0; r < 4; r++) { const y = base + 4 + r * (h - base) / 4.2; const sw = w * (0.2 + r * 0.06); for (const s of [-1, 1]) { const x0 = s < 0 ? ax - 8 - sw - r * 6 : ax + 8 + r * 6; P.rect(x0, y, sw, 3 + r, '#0a0705'); P.rect(x0, y, sw, 1, mix(c.warm, '#000000', 0.6)); } }
      P.rect(ax - 10, base - 6, 20, 7, '#120c08'); P.rect(ax - 10, base - 6, 20, 1, c.light);
    },
    live(P, c, t) { const ax = P.w / 2, base = P.h * 0.66; for (const k of [-7, -3, 3, 7]) { P.rect(ax + k, base - 10, 1, 4, '#e8dcc0'); if (Math.sin(t * 12 + k) > -0.6) P.px(ax + k, base - 11 - (Math.sin(t * 17 + k) > 0.5 ? 1 : 0), c.light); }
      motes(P, t, 30, mix(c.light, '#ffffff', 0.4), 3, false); },
  },
  docks: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.5);
      P.grad(0, 0, w, hz, c.sky); moon(P, w * 0.3, h * 0.2, Math.max(3, Math.round(h * 0.06)), c);
      // a ship far out
      const sx = w * 0.72; P.poly([[sx - 18, hz - 3], [sx + 16, hz - 3], [sx + 12, hz + 1], [sx - 14, hz + 1]], c.far); P.rect(sx - 6, hz - 26, 1, 23, c.far); P.rect(sx + 4, hz - 20, 1, 17, c.far); P.poly([[sx - 5, hz - 24], [sx + 3, hz - 12], [sx - 5, hz - 8]], mix(c.far, '#ffffff', 0.06));
      P.grad(0, hz, w, h - hz, [mix(c.sky[2], '#000000', 0.2), c.mid, c.near]);
      for (let i = 0; i < 70; i++) { const y = hz + 2 + Math.pow(hash(i * 3), 1.5) * (h - hz); const x = hash(i * 7) * w; P.rect(x, y, 2 + hash(i) * 6 * (y - hz) / (h - hz), 1, mix(c.fog, c.mid, 0.4)); }
      // the pier
      P.poly([[-4, h * 0.62], [w * 0.55, hz + 6], [w * 0.62, hz + 8], [w * 0.2, h + 4], [-4, h + 4]], '#0e0a08');
      for (let k = 0; k < 10; k++) { const f = k / 10; P.line(-4 + (w * 0.55 + 4) * f * 0.2 + f * 6, h * 0.62 + (hz + 6 - h * 0.62) * f + 2, w * 0.2 * (1 - f) + w * 0.62 * f, h + 4 + (hz + 8 - h - 4) * f, '#1e1610'); }
      for (let k = 0; k < 5; k++) { const f = k / 5; const x = w * 0.2 * (1 - f) + w * 0.6 * f + 2, y = h * (1 - f) + (hz + 8) * f; P.rect(x, y - 10 * (1 - f) - 3, Math.max(1, 3 * (1 - f) + 1), 10 * (1 - f) + 5, '#08060a'); }
      P.glow(w * 0.2, h * 0.5, Math.round(h * 0.26), c.warm, 0.5); P.rect(w * 0.2 - 1, h * 0.52, 2, h * 0.3, '#060506'); P.rect(w * 0.2 - 2, h * 0.47, 4, 5, '#060506'); P.rect(w * 0.2 - 1, h * 0.48, 2, 3, c.light);
      figure(P, Math.round(w * 0.46), Math.round(hz + 10), Math.round(h * 0.12), '#05060a', { eyes: c.accent });
    },
    live(P, c, t) { const hz = Math.round(P.h * 0.5); for (let i = 0; i < 9; i++) { const y = hz + 3 + i * 3; const wob = Math.round(Math.sin(t * 2 + i) * 2); P.rect(P.w * 0.3 - 3 + wob - i, y, 6 + i * 1.4, 1, mix(c.moon, c.mid, 0.3 + i * 0.06)); }
      for (let i = 0; i < 14; i++) { const x = (hash(i) * P.w + t * (6 + hash(i * 3) * 6)) % P.w; const y = hz + 4 + hash(i * 7) * (P.h - hz - 4); P.rect(x, y, 3, 1, mix(c.fog, '#ffffff', 0.15)); } },
  },
  fire: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.55);
      P.grad(0, 0, w, hz, [c.sky[0], c.sky[1], mix(c.sky[2], '#000000', 0.3)]);
      for (let i = 0; i < 40; i++) P.px(hash(i) * w, hash(i * 3) * hz * 0.7, mix(c.moon, c.sky[1], hash(i * 5) * 0.6));
      for (let i = 0; i < 14; i++) { const x = hash(i * 9) * w, th = h * (0.18 + hash(i) * 0.25); P.poly([[x - th * 0.25, hz + 2], [x, hz - th], [x + th * 0.25, hz + 2]], c.far); }
      P.grad(0, hz, w, h - hz, [c.ground, mix(c.ground, '#000000', 0.6)]);
      const fx = w * 0.5, fy = h * 0.8; P.glow(fx, fy - 4, Math.round(h * 0.5), c.warm, 0.5, 0.75); P.glow(fx, fy, Math.round(w * 0.3), c.light, 0.3, 0.3);
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; P.ellipse(fx + Math.cos(a) * 13, fy + 2 + Math.sin(a) * 4, 3, 2, k % 2 ? '#3a3430' : '#2a2420'); }
      P.line(fx - 9, fy + 2, fx + 8, fy - 2, '#3a2010'); P.line(fx - 9, fy + 1, fx + 8, fy - 3, '#5a3418'); P.line(fx + 9, fy + 2, fx - 8, fy - 2, '#3a2010'); P.line(fx + 9, fy + 1, fx - 8, fy - 3, '#5a3418');
      figure(P, Math.round(w * 0.28), Math.round(h * 0.84), Math.round(h * 0.24), '#06040a', { rim: c.warm, staff: '#0c0806' });
    },
    live(P, c, t) { const fx = Math.round(P.w * 0.5), fy = Math.round(P.h * 0.8); flame(P, fx, fy - 1, 6, t, 0, c); flame(P, fx - 4, fy, 3, t, 4, c); flame(P, fx + 4, fy, 3, t, 9, c);
      for (let i = 0; i < 16; i++) { const k = (t * (0.4 + hash(i) * 0.4) + hash(i * 3)) % 1; P.px(fx + Math.sin(t * 2 + i * 3) * 6 * k + (hash(i * 7) - 0.5) * 8, fy - 8 - k * P.h * 0.5, k < 0.6 ? c.light : c.warm); } },
  },
  rain: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.62);
      P.grad(0, 0, w, hz, [c.sky[0], c.sky[1], c.fog]);
      skyline(P, hz - 6, h * 0.25, mix(c.far, c.fog, 0.45), 11); P.dith(0, hz - h * 0.3, w, h * 0.3, c.fog, 0.35);
      P.grad(0, hz, w, h - hz, [c.wet, c.ground, c.near]);
      const lx = Math.round(w * 0.42), ly = Math.round(h * 0.18);
      P.poly([[lx - 3, ly + 3], [lx + 3, ly + 3], [lx + w * 0.2, h * 0.92], [lx - w * 0.2, h * 0.92]], c.light, 0.22); P.ellipse(lx, h * 0.92, Math.round(w * 0.2), 4, mix(c.light, c.wet, 0.6));
      P.glow(lx, ly + 2, Math.round(h * 0.2), c.light, 0.6); P.rect(lx - 1, ly + 3, 2, h * 0.75, '#050608'); P.rect(lx - 3, ly - 3, 6, 6, '#050608'); P.rect(lx - 2, ly - 2, 4, 4, c.light); P.rect(lx - 4, ly + 4, 8, 1, '#050608');
      const fx = Math.round(w * 0.5), fy = Math.round(h * 0.9); figure(P, fx, fy, Math.round(h * 0.42), '#030305', { rim: mix(c.light, '#000000', 0.2) });
      P.rect(fx - 5, fy, 10, 1, '#000000');
      for (let i = 0; i < 6; i++) P.rect(fx - 6 + i * 2, fy + 2 + (i % 2), 1, 3 + (i % 3), mix(c.wet, '#000000', 0.3));
    },
    live(P, c, t) { rain(P, t, 110, mix(c.fog, '#ffffff', 0.35), 190, 0.25, 5); const fx = Math.round(P.w * 0.5), fy = Math.round(P.h * 0.9), hh = Math.round(P.h * 0.42);
      if ((t % 4) > 0.15) { P.px(fx - 1, Math.round(fy - hh * 0.8), c.accent); P.px(fx + 1, Math.round(fy - hh * 0.8), c.accent); }
      for (let i = 0; i < 8; i++) { const k = (t * 1.5 + hash(i)) % 1; const x = hash(i * 3 + Math.floor(t * 1.5 + hash(i))) * P.w; P.px(x - 1, P.h * 0.66 + hash(i * 5) * P.h * 0.3, k < 0.5 ? mix(c.fog, '#ffffff', 0.4) : c.wet); } },
  },
  door: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [c.near, c.mid, c.near]);
      for (let r = 0; r < Math.ceil(h / 8); r++) for (let q = -1; q < Math.ceil(w / 14) + 1; q++) { const x = q * 14 + (r % 2) * 7, y = r * 8; const s = mix(c.far, '#000000', 0.15 + hash(r * 31 + q) * 0.25); P.rect(x + 1, y + 1, 12, 6, s); P.rect(x + 1, y + 1, 12, 1, mix(s, '#ffffff', 0.07)); }
      const dx = w / 2, dw = Math.round(w * 0.3), top = Math.round(h * 0.18), base = Math.round(h * 0.86);
      P.rect(dx - dw / 2 - 4, top + dw / 2, dw + 8, base - top - dw / 2, '#0a0908'); P.circ(dx, top + dw / 2, Math.round(dw / 2) + 4, '#0a0908');
      P.rect(dx - dw / 2, top + dw / 2, dw, base - top - dw / 2, '#2a1a0e'); P.circ(dx, top + dw / 2, Math.round(dw / 2), '#2a1a0e');
      for (let k = 1; k < 5; k++) P.rect(dx - dw / 2 + k * dw / 5, top, 1, base - top, '#160d06');
      for (const f of [0.38, 0.72]) { const y = top + (base - top) * f; P.rect(dx - dw / 2, y, dw, 3, '#3a3a40'); for (let k = 0; k < 5; k++) P.px(dx - dw / 2 + 2 + k * (dw - 4) / 4, y + 1, '#8a8a94'); }
      P.circ(dx + dw * 0.22, (top + base) / 2, 3, '#5a5a62'); P.circ(dx + dw * 0.22, (top + base) / 2, 2, '#2a1a0e');
      P.rect(dx - dw / 2, base, dw, 1, c.light); P.dith(dx - dw / 2 - 6, base + 1, dw + 12, 6, c.light, 0.3);
      for (let s = 0; s < 3; s++) P.rect(dx - dw / 2 - 8 - s * 6, base + 2 + s * 4, dw + 16 + s * 12, 4, mix(c.far, '#000000', 0.2 + s * 0.15));
      for (const s of [-1, 1]) { const tx = dx + s * (dw / 2 + 16); P.glow(tx, h * 0.38, Math.round(h * 0.24), c.warm, 0.45); P.rect(tx - 1, h * 0.4, 3, 10, '#1a1210'); P.rect(tx - 2, h * 0.4, 5, 2, '#3a3a40'); }
    },
    live(P, c, t) { const dx = P.w / 2, dw = Math.round(P.w * 0.3); for (const s of [-1, 1]) flame(P, Math.round(dx + s * (dw / 2 + 16)), Math.round(P.h * 0.4), 2, t, s * 5, c);
      const base = Math.round(P.h * 0.86); if (Math.sin(t * 1.3) > 0.2) P.rect(dx - dw / 2 + 2, base - 1, dw - 4, 1, mix(c.light, '#ffffff', 0.4)); },
  },
  shrine: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.6);
      P.grad(0, 0, w, hz, [c.sky[0], c.sky[1], mix(c.sky[2], '#000000', 0.2)]);
      for (let i = 0; i < 30; i++) P.px(hash(i * 2) * w, hash(i * 9) * hz * 0.8, mix(c.moon, c.sky[1], 0.5));
      skyline(P, hz, h * 0.14, c.far, 21);
      P.grad(0, hz, w, h - hz, [c.ground, c.near]);
      for (let i = 0; i < 90; i++) { const x = hash(i * 5) * w, y = hz + 2 + hash(i * 3) * (h - hz); P.rect(x, y - 2, 1, 2, mix(c.ground, '#000000', 0.4)); }
      const sx = w / 2, sb = Math.round(h * 0.82), sw = Math.round(w * 0.2), sh = Math.round(h * 0.42);
      P.glow(sx, sb - sh * 0.4, Math.round(h * 0.45), c.warm, 0.5);
      P.rect(sx - sw / 2 - 3, sb - 4, sw + 6, 6, '#2a2620'); P.rect(sx - sw / 2, sb - sh, sw, sh - 4, '#3a342c'); P.rect(sx - sw / 2, sb - sh, 2, sh - 4, '#4a4438');
      P.poly([[sx - sw / 2 - 6, sb - sh], [sx, sb - sh - sw * 0.45], [sx + sw / 2 + 6, sb - sh]], '#1e1a16'); P.line(sx - sw / 2 - 6, sb - sh, sx, sb - sh - sw * 0.45, '#4a4438');
      P.rect(sx - sw / 2 + 4, sb - sh + 4, sw - 8, sh - 12, '#120e0a');
      P.ellipse(sx, sb - sh + 10, 4, 4, '#b8903a'); P.rect(sx - 5, sb - sh + 13, 11, 2, '#b8903a'); P.px(sx, sb - sh + 5, '#e8c060');
    },
    live(P, c, t) { const sx = Math.round(P.w / 2), sb = Math.round(P.h * 0.82);
      // the brazier before the shrine: the forge-flame
      const bx = sx, by = Math.round(P.h * 0.93); P.glow(bx, by - 6, Math.round(P.h * 0.22 + Math.sin(t * 7) * 1.5), c.warm, 0.55); P.rect(bx - 7, by - 2, 14, 3, '#2a2018'); P.rect(bx - 5, by + 1, 10, 2, '#1a140e'); P.rect(bx - 7, by - 2, 14, 1, '#5a4430');
      flame(P, bx, by - 2, 5, t, 1, c); flame(P, bx - 3, by - 2, 2, t, 6, c); flame(P, bx + 3, by - 2, 2, t, 11, c);
      for (let i = 0; i < 10; i++) { const k = (t * (0.5 + hash(i) * 0.4) + hash(i * 3)) % 1; P.px(bx + Math.sin(t * 3 + i * 2) * 4 * k + (hash(i * 7) - 0.5) * 6, by - 8 - k * P.h * 0.4, k < 0.5 ? c.light : c.warm); }
      for (const k of [-5, -2, 2, 5]) { P.rect(sx + k, sb - 12, 1, 3 + Math.abs(k) % 2, '#e8dcc0'); flame(P, sx + k, sb - 12, 0, t, k, c); }
      motes(P, t, 14, c.light, 6, true); },
  },
  snow: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.56);
      P.grad(0, 0, w, hz, c.sky); moon(P, w * 0.76, h * 0.16, Math.max(3, Math.round(h * 0.05)), c);
      const mtn = (x, mh, mw, col, cap) => { P.poly([[x - mw, hz + 2], [x, hz - mh], [x + mw, hz + 2]], col); P.poly([[x - mw * 0.28, hz - mh * 0.72], [x, hz - mh], [x + mw * 0.28, hz - mh * 0.72], [x + mw * 0.12, hz - mh * 0.66], [x - mw * 0.05, hz - mh * 0.74]], cap); };
      mtn(w * 0.22, h * 0.36, w * 0.3, mix(c.far, c.sky[2], 0.3), '#e8f2fa'); mtn(w * 0.6, h * 0.46, w * 0.34, c.far, '#f4faff'); mtn(w * 0.92, h * 0.3, w * 0.24, mix(c.far, c.sky[2], 0.2), '#e8f2fa');
      P.grad(0, hz, w, h - hz, [mix(c.ground, c.fog, 0.3), c.ground, mix(c.ground, '#ffffff', 0.4)]);
      for (let i = 0; i < 11; i++) { const x = hash(i * 13) * w, th = h * (0.12 + hash(i * 3) * 0.2), y = hz + 4 + hash(i * 7) * h * 0.18; P.poly([[x - th * 0.3, y], [x, y - th], [x + th * 0.3, y]], c.mid); P.poly([[x - th * 0.12, y - th * 0.6], [x, y - th], [x + th * 0.12, y - th * 0.6]], '#e8f4fc'); P.rect(x - 1, y, 2, 2, c.near); }
      const cx = w * 0.36, cy = h * 0.86; for (let k = 0; k < 4; k++) P.ellipse(cx, cy - k * 4, 7 - k, 2, k % 2 ? '#6a7a88' : '#56646e'); P.rect(cx - 1, cy - 20, 2, 6, '#3a4650');
      figure(P, Math.round(w * 0.62), Math.round(h * 0.84), Math.round(h * 0.2), '#141c24', { rim: '#ffffff' });
    },
    live(P, c, t) { for (let i = 0; i < 90; i++) { const sp = 10 + hash(i) * 14; const y = (t * sp + hash(i * 3) * P.h) % P.h; const x = (hash(i * 7) * P.w + Math.sin(t * 1.2 + i) * 4 - t * 8 + P.w * 4) % P.w; P.px(x, y, hash(i * 5) < 0.3 ? '#c8d8e8' : '#ffffff'); if (hash(i * 9) < 0.15) P.px(x + 1, y, '#ffffff'); } },
  },
  desert: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.55);
      P.grad(0, 0, w, hz, c.sky); P.glow(w * 0.3, hz - 6, Math.round(h * 0.42), c.moon, 0.32); P.circ(w * 0.3, hz - 8, Math.round(h * 0.13), mix(c.moon, c.warm, 0.25));
      for (let i = 0; i < 4; i++) P.rect(w * 0.3 - h * 0.12, hz - 12 + i * 3, h * 0.24, 1, mix(c.sky[2], c.moon, 0.3));
      const dune = (base, amp, fr, ph, col) => { for (let x = 0; x < w; x++) { const y = base + Math.sin(x * fr + ph) * amp + Math.sin(x * fr * 2.3 + ph * 2) * amp * 0.3; P.rect(x, y, 1, h - y + 1, col); P.px(x, y, mix(col, '#ffffff', 0.18)); } };
      dune(hz, 3, 0.05, 1, c.far);
      // a half-buried colossus head
      const hx = w * 0.68, hy = hz + 4; P.ellipse(hx, hy, Math.round(h * 0.13), Math.round(h * 0.16), '#4a2c16'); P.rect(hx - h * 0.13, hy - 2, h * 0.26, h * 0.16, '#4a2c16'); P.rect(hx - h * 0.07, hy - h * 0.04, 4, 2, '#140a04'); P.rect(hx + h * 0.03, hy - h * 0.04, 4, 2, '#140a04'); P.rect(hx - 1, hy + 1, 2, 5, '#3a200e'); P.rect(hx - h * 0.13, hy - h * 0.16, h * 0.26, 2, '#6a4020');
      for (const [px, ph] of [[0.12, 0.2], [0.18, 0.12], [0.88, 0.16]]) { P.rect(w * px, hz - h * ph, 4, h * ph + 6, '#3a220e'); P.rect(w * px - 1, hz - h * ph, 6, 2, '#5a3418'); }
      dune(hz + h * 0.12, 4, 0.035, 3, c.mid); dune(hz + h * 0.28, 5, 0.025, 5, mix(c.ground, c.mid, 0.4));
      figure(P, Math.round(w * 0.4), Math.round(hz + h * 0.3), Math.round(h * 0.18), '#1a0c06', { staff: '#2a160a' });
    },
    live(P, c, t) { for (let i = 0; i < 26; i++) { const y = P.h * 0.55 + hash(i * 3) * P.h * 0.45; const x = (hash(i) * P.w * 2 - t * (30 + hash(i * 5) * 40)) % (P.w + 30); P.rect((x + P.w + 30) % (P.w + 30) - 15, y, 4 + hash(i * 7) * 8, 1, mix(c.light, c.ground, 0.5)); } },
  },
  catacomb: {
    still(P, c) { const { w, h } = P;
      P.rect(0, 0, w, h, '#0a0908');
      const cw = 16, ch = 11;
      for (let r = 0; r < Math.ceil(h / ch); r++) for (let q = 0; q < Math.ceil(w / cw); q++) { const x = q * cw, y = r * ch; P.rect(x, y, cw, ch, (r + q) % 2 ? '#2a2620' : '#24201a'); P.rect(x + 2, y + 2, cw - 4, ch - 3, '#060504');
        if (hash(r * 17 + q) < 0.75) { const sx = x + cw / 2, sy = y + ch / 2 + 1; P.ellipse(sx, sy - 1, 3, 3, '#c8bea8'); P.px(sx - 1, sy - 1, '#060504'); P.px(sx + 1, sy - 1, '#060504'); P.rect(sx - 1, sy + 2, 3, 1, '#a89e88'); } }
      const ax = w / 2, aw = Math.round(w * 0.32), top = Math.round(h * 0.2);
      P.rect(ax - aw / 2 - 3, top + aw / 2, aw + 6, h, '#1a1612'); P.circ(ax, top + aw / 2, Math.round(aw / 2) + 3, '#1a1612');
      P.rect(ax - aw / 2, top + aw / 2, aw, h, '#000000'); P.circ(ax, top + aw / 2, Math.round(aw / 2), '#000000');
      for (let k = 1; k < 6; k++) { const s = 1 - k * 0.15; P.rect(ax - aw / 2 * s, top + aw / 2 + k * 5, aw * s, 1, mix('#2a2620', '#000000', 0.4 + k * 0.1)); }
      P.grad(0, h * 0.85, w, h * 0.15, ['#1a1612', '#0a0908']);
      P.rect(w * 0.12, h * 0.8, w * 0.22, 8, '#3a342a'); P.rect(w * 0.12, h * 0.8, w * 0.22, 2, '#5a5040');
      P.glow(w * 0.82, h * 0.36, Math.round(h * 0.3), c.warm, 0.4); P.rect(w * 0.82 - 1, h * 0.38, 2, 8, '#1a1210');
    },
    live(P, c, t) { flame(P, Math.round(P.w * 0.82), Math.round(P.h * 0.38), 2, t, 3, c);
      for (let k = 0; k < 3; k++) { const x = P.w * (0.42 + k * 0.08) + Math.sin(t * 1.3 + k * 2) * 4, y = P.h * (0.5 + k * 0.06) + Math.sin(t * 2 + k) * 3; P.glow(x, y, 9, c.accent, 0.5); P.circ(x, y, 1, mix(c.accent, '#ffffff', 0.5)); } },
  },
  hell: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.62);
      P.grad(0, 0, w, hz, [c.sky[0], c.sky[1], c.sky[2], c.sky[3]]);
      P.circ(w * 0.5, h * 0.22, Math.round(h * 0.17), mix(c.sky[2], '#000000', 0.25)); P.circ(w * 0.5, h * 0.22, Math.round(h * 0.13), c.sky[1]);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; P.ellipse(w * 0.5 + Math.cos(a) * h * 0.15, h * 0.22 + Math.sin(a) * h * 0.15, 2, 1, c.light); }
      for (let i = 0; i < 9; i++) { const x = hash(i * 7) * w, sh = h * (0.2 + hash(i * 3) * 0.4), sw = 3 + hash(i) * 6; P.poly([[x - sw, hz + 4], [x - sw * 0.3, hz - sh], [x + sw * 0.4, hz - sh * 0.8], [x + sw, hz + 4]], '#060203'); }
      P.rect(0, hz, w, h - hz, '#0a0304');
      P.poly([[0, h * 0.78], [w, h * 0.7], [w, h * 0.82], [0, h * 0.92]], c.warm); P.poly([[0, h * 0.82], [w, h * 0.74], [w, h * 0.77], [0, h * 0.86]], c.light);
      P.glow(w * 0.5, h * 0.8, Math.round(w * 0.6), c.warm, 0.35, 0.3);
      for (const x of [0.18, 0.8]) { for (let y = 0; y < h * 0.4; y += 3) P.rect(w * x + (y / 3 % 2), y, 2, 2, '#2a1a18'); }
    },
    live(P, c, t) { for (let i = 0; i < 40; i++) { const k = (t * (0.15 + hash(i) * 0.2) + hash(i * 3)) % 1; P.px((hash(i * 7) * P.w + Math.sin(t + i) * 5) % P.w, P.h * (0.9 - k * 0.9), k < 0.5 ? c.light : c.warm); }
      for (let i = 0; i < 12; i++) { const x = (hash(i) * P.w + t * 10) % P.w; const f = x / P.w; P.rect(x, P.h * (0.8 - f * 0.08) + hash(i * 3) * 4, 3, 1, '#fff0b0'); } },
  },
  machine: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [c.near, c.mid, c.near]);
      for (let k = 0; k < 5; k++) P.rect(0, h * (0.15 + k * 0.19), w, 3, mix(c.far, '#000000', 0.2)); for (let k = 0; k < 7; k++) P.rect(w * (0.06 + k * 0.15), 0, 3, h, mix(c.far, '#000000', 0.3));
      P.rect(0, h * 0.7, w, 5, '#5a4020'); P.rect(0, h * 0.7, w, 1, '#a07838'); for (let k = 0; k < 8; k++) P.rect(w * k / 8, h * 0.7 - 1, 3, 7, '#3a2810');
      P.rect(w * 0.84, 0, 5, h, '#5a4020'); P.rect(w * 0.84, 0, 1, h, '#a07838');
      const gx = w * 0.14, gy = h * 0.28; P.circ(gx, gy, 9, '#2a1e10'); P.circ(gx, gy, 7, '#e8dcc0'); P.line(gx, gy, gx + 4, gy - 4, '#8a1a10');
      P.grad(0, h * 0.86, w, h * 0.14, ['#1a1208', '#060402']);
    },
    live(P, c, t) { const brass = '#b88a3a', dark = '#7a5a20';
      gear(P, P.w * 0.42, P.h * 0.44, Math.round(P.h * 0.24), 10, t * 0.5, brass, c.near); gear(P, P.w * 0.42 + P.h * 0.43, P.h * 0.32, Math.round(P.h * 0.14), 7, -t * 0.86 + 0.2, dark, c.near);
      gear(P, P.w * 0.72, P.h * 0.72, Math.round(P.h * 0.17), 8, -t * 0.7, '#9a7030', c.near);
      for (let i = 0; i < 6; i++) { const k = (t * 0.6 + i / 6) % 1; P.circ(P.w * 0.84 + 2 + Math.sin(i + t) * 3, P.h * 0.5 - k * P.h * 0.5, Math.round(1 + k * 4), '#c8c0b0', 0.5 * (1 - k)); } },
  },
  heaven: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, c.sky);
      const cl = (y, col, seed) => { for (let i = 0; i < 12; i++) P.circ(hash(seed + i) * w, y + hash(seed + i * 3) * 6, 6 + Math.floor(hash(seed + i * 5) * 9), col); P.rect(0, y + 4, w, h, col); };
      cl(h * 0.62, '#fff6e4', 1); cl(h * 0.76, '#f0e2c0', 7); cl(h * 0.88, '#e4d0a4', 13);
      const rx = w * 0.5, ry = h * 0.34, rr = Math.round(h * 0.22);
      for (let a = 0; a < 200; a++) { const t = a / 200 * Math.PI * 2; P.px(rx + Math.cos(t) * rr, ry + Math.sin(t) * rr * 0.92, c.accent); P.px(rx + Math.cos(t) * (rr - 2), ry + Math.sin(t) * (rr - 2) * 0.92, '#fff4c0'); }
      P.glow(rx, ry, rr, '#ffffff', 0.5);
      for (let s = 0; s < 6; s++) P.rect(rx - 10 + s * 2, h * 0.62 - s * 4, 20 - s * 4, 3, mix('#ffffff', c.accent, s * 0.08));
    },
    live(P, c, t) { const rx = P.w * 0.5, ry = P.h * 0.34, rr = Math.round(P.h * 0.22);
      for (let k = 0; k < 8; k++) { const a = t * 0.15 + k / 8 * Math.PI * 2; const x = rx + Math.cos(a) * rr, y = ry + Math.sin(a) * rr * 0.92; const open = Math.sin(t * 0.9 + k * 1.7) > -0.7; P.ellipse(x, y, 3, open ? 2 : 0, '#ffffff'); if (open) P.px(x, y, '#2a1a10'); } },
  },
  bell: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [c.near, c.mid, mix(c.mid, c.far, 0.5)]);
      for (const s of [-1, 1]) { const x = w / 2 + s * w * 0.36; P.rect(x - 4, 0, 8, h, '#1a1612'); P.rect(x - 4, 0, 1, h, '#3a342a'); }
      P.rect(w * 0.12, h * 0.1, w * 0.76, 5, '#2a1e14'); P.rect(w * 0.12, h * 0.1, w * 0.76, 1, '#5a4430');
      const bx = w / 2, by = h * 0.18, bh = h * 0.56, bw = h * 0.3;
      P.glow(bx, by + bh * 0.6, Math.round(h * 0.6), c.light, 0.18);
      P.poly([[bx - bw * 0.35, by], [bx + bw * 0.35, by], [bx + bw * 0.5, by + bh * 0.6], [bx + bw, by + bh], [bx - bw, by + bh], [bx - bw * 0.5, by + bh * 0.6]], '#6a4a20');
      P.poly([[bx - bw * 0.2, by + 2], [bx - bw * 0.05, by + 2], [bx - bw * 0.2, by + bh * 0.95], [bx - bw * 0.6, by + bh * 0.95]], '#a07838');
      P.rect(bx - bw, by + bh - 3, bw * 2, 3, '#3a2810'); P.line(bx + 4, by + bh * 0.2, bx + 9, by + bh * 0.8, '#1a0c04');
      P.rect(bx - 2, by + bh, 4, 6, '#3a2810'); P.circ(bx, by + bh + 7, 3, '#3a2810');
    },
    live(P, c, t) { motes(P, t, 18, mix(c.light, '#ffffff', 0.3), 3, false); rain(P, t, 20, mix(c.fog, '#ffffff', 0.15)); },
  },
  marsh: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.55);
      P.grad(0, 0, w, hz, c.sky); moon(P, w * 0.7, h * 0.18, Math.max(3, Math.round(h * 0.05)), c);
      P.dith(0, hz - 12, w, 14, c.fog, 0.5); P.grad(0, hz, w, h - hz, [c.wet, c.mid, c.near]);
      const tree = (x, y, s) => { P.rect(x - 1, y - s, 3, s, c.near); P.line(x, y - s * 0.7, x - s * 0.4, y - s, c.near); P.line(x + 1, y - s * 0.55, x + s * 0.45, y - s * 0.85, c.near); P.line(x - s * 0.4, y - s, x - s * 0.5, y - s * 0.9, c.near); for (let k = 0; k < 4; k++) P.rect(x - s * 0.3 + k * s * 0.2, y - s * 0.75, 1, 4 + k % 3, mix(c.near, c.accent, 0.2)); };
      tree(w * 0.16, hz + 8, h * 0.45); tree(w * 0.84, hz + 12, h * 0.5); tree(w * 0.55, hz + 2, h * 0.22);
      for (let i = 0; i < 30; i++) P.rect(hash(i * 3) * w, hz + 4 + hash(i * 7) * (h - hz), 1, 3 + hash(i) * 3, mix(c.mid, c.accent, 0.25));
      P.rect(w * 0.36, h * 0.8, 6, 6, '#3a2c10'); P.poly([[w * 0.36 - 2, h * 0.8], [w * 0.36 + 3, h * 0.74], [w * 0.36 + 8, h * 0.8]], '#5a4418');
    },
    live(P, c, t) { for (let k = 0; k < 4; k++) { const x = P.w * (0.25 + k * 0.17) + Math.sin(t * 0.7 + k * 3) * 8, y = P.h * (0.6 + (k % 2) * 0.1) + Math.sin(t * 1.4 + k) * 3; P.glow(x, y, 7, c.accent, 0.55); P.px(x, y, '#ffffff'); }
      for (let i = 0; i < 10; i++) { const y = P.h * 0.62 + i * 4; P.rect((hash(i) * P.w + t * 4 * (i % 2 ? 1 : -1) + P.w) % P.w, y, 6, 1, mix(c.fog, c.wet, 0.4)); } },
  },
  gallows: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.7);
      P.grad(0, 0, w, hz, c.sky); moon(P, w * 0.3, h * 0.22, Math.max(4, Math.round(h * 0.09)), c);
      skyline(P, hz, h * 0.12, c.far, 41);
      P.rect(0, hz, w, h - hz, c.near);
      const gx = w * 0.6; P.rect(gx - w * 0.2, hz - 10, w * 0.4, 4, '#08040a'); P.rect(gx - w * 0.16, hz - h * 0.6, 3, h * 0.6 - 6, '#08040a'); P.rect(gx - w * 0.16, hz - h * 0.6, w * 0.26, 3, '#08040a'); P.line(gx - w * 0.16 + 2, hz - h * 0.5, gx - w * 0.08, hz - h * 0.6 + 2, '#08040a');
      P.rect(gx + w * 0.08, hz - h * 0.6 + 3, 1, h * 0.2, '#3a2a1a'); P.circ(gx + w * 0.08, hz - h * 0.38, 3, '#3a2a1a'); P.circ(gx + w * 0.08, hz - h * 0.38, 2, c.sky[2]);
      for (let k = 0; k < 4; k++) P.rect(gx - w * 0.2 + 4 + k * 8, hz - 6, 2, 6, '#08040a');
      for (let i = 0; i < 5; i++) { const bx = w * (0.1 + hash(i) * 0.3), by = h * (0.12 + hash(i * 3) * 0.2); P.px(bx, by, '#000000'); P.px(bx - 1, by - 1, '#000000'); P.px(bx + 1, by - 1, '#000000'); }
    },
    live(P, c, t) { const gx = P.w * 0.6 + P.w * 0.08, top = P.h * 0.7 - P.h * 0.6 + 3; const sw = Math.sin(t * 0.8) * 2; P.rect(gx - 1, top, 3, P.h * 0.2, c.sky[2]); P.line(gx, top, gx + sw, top + P.h * 0.2, '#3a2a1a'); P.circ(gx + sw, P.h * 0.32, 3, '#3a2a1a'); P.circ(gx + sw, P.h * 0.32, 2, c.sky[2]); rain(P, t, 30, mix(c.fog, '#ffffff', 0.15)); },
  },
roof: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h * 0.7, c.sky); moon(P, w * 0.7, h * 0.2, Math.max(4, Math.round(h * 0.08)), c);
      skyline(P, h * 0.62, h * 0.2, c.far, 51, { lights: mix(c.light, c.far, 0.3) }); spire(P, w * 0.82, h * 0.6, h * 0.4, c.far);
      // the near roofs: slates in rows, a chimney, a gable
      P.poly([[-2, h * 0.7], [w * 0.55, h * 0.55], [w * 0.75, h * 0.7], [w + 2, h * 0.66], [w + 2, h + 2], [-2, h + 2]], c.near);
      for (let r = 0; r < 8; r++) { const y = h * 0.7 + r * 5; P.line(0, y + r, w * 0.55, y - h * 0.15 + r * 1.2, mix(c.near, c.fog, 0.18)); }
      P.rect(w * 0.3, h * 0.5, 8, h * 0.18, c.near); P.rect(w * 0.3 - 1, h * 0.5, 10, 2, mix(c.near, c.fog, 0.3));
      figure(P, Math.round(w * 0.56), Math.round(h * 0.56), Math.round(h * 0.2), '#030305', { rim: mix(c.moon, '#000', 0.2) });
    },
    live(P, c, t) { rain(P, t, 40, mix(c.fog, '#ffffff', 0.25)); const k = (t * 0.3) % 1; P.px(P.w * 0.1 + k * P.w * 0.3, P.h * 0.15 + Math.sin(k * 8) * 2, '#000000'); P.px(P.w * 0.1 + k * P.w * 0.3 + 1, P.h * 0.15 + Math.sin(k * 8) * 2 - 1, '#000000'); },
  },
  well: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.5);
      P.grad(0, 0, w, hz, c.sky); for (let i = 0; i < 25; i++) P.px(hash(i * 3) * w, hash(i * 5) * hz * 0.8, mix(c.moon, c.sky[1], 0.4));
      for (let r = 0; r < 4; r++) for (let q = 0; q < Math.ceil(w / 12) + 1; q++) { const x = q * 12 + (r % 2) * 6, y = hz - 26 + r * 7; P.rect(x, y, 11, 6, mix(c.far, '#000', 0.1 + hash(q * 7 + r) * 0.2)); }
      P.grad(0, hz + 2, w, h - hz, [c.ground, c.near]);
      for (let k = 0; k < 6; k++) P.rect(0, hz + 4 + k * k * 1.6, w, 1, mix(c.ground, '#000', 0.35));
      const cx = w / 2, cy = h * 0.72, rw = w * 0.2;
      P.ellipse(cx, cy, rw, 6, '#000000'); P.ellipse(cx, cy - 1, rw - 3, 4, '#020203');
      P.rect(cx - rw, cy, rw * 2, 14, '#3a3630'); for (let k = 0; k < 6; k++) P.rect(cx - rw + k * rw / 3, cy + 2 + (k % 2) * 6, rw / 3 - 1, 5, '#4a443c');
      P.rect(cx - rw + 2, cy - 28, 3, 28, '#2a1e14'); P.rect(cx + rw - 5, cy - 28, 3, 28, '#2a1e14'); P.rect(cx - rw, cy - 30, rw * 2, 3, '#3a2a1a');
      P.rect(cx - 1, cy - 27, 1, 20, '#8a7a5a'); P.rect(cx - 3, cy - 8, 5, 4, '#3a2a1a');
    },
    live(P, c, t) { const cx = P.w / 2, cy = P.h * 0.72; P.glow(cx, cy, 10, c.accent, 0.35 + 0.15 * Math.sin(t * 2)); if (Math.sin(t * 0.7) > 0.6) { P.px(cx - 3, cy - 1, c.accent); P.px(cx + 2, cy - 1, c.accent); } },
  },
  ballroom: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [mix(c.mid, '#000', 0.2), c.mid, c.near]);
      for (let k = 0; k < 5; k++) { const x = w * (0.1 + k * 0.2); P.rect(x - 6, h * 0.1, 12, h * 0.55, mix(c.far, '#000', 0.25)); P.circ(x, h * 0.1 + 6, 6, mix(c.far, '#000', 0.25)); P.rect(x - 4, h * 0.14, 8, h * 0.5, mix(c.sky[1], c.far, 0.5)); }
      for (let r = 0; r < 7; r++) for (let q = 0; q < 12; q++) { const y = h * 0.65 + r * r * 1.4, x = q * w / 11 - (r * 3); if ((r + q) % 2) P.rect(x, y, w / 11, r * 2.8 + 2, mix(c.near, c.light, 0.06)); }
      for (const [x, s] of [[0.3, 1], [0.7, 0.8]]) { const cx = w * x; P.line(cx, 0, cx, h * 0.12, '#3a3020'); P.ellipse(cx, h * 0.16, 12 * s, 3, '#6a5a30'); for (let k = -3; k <= 3; k++) P.px(cx + k * 3 * s, h * 0.14, c.light); P.glow(cx, h * 0.16, Math.round(26 * s), c.light, 0.3); }
      // masked dancers in pairs
      for (const [x, y, s] of [[0.22, 0.86, 1], [0.5, 0.8, 0.85], [0.78, 0.88, 1.05]]) { figure(P, Math.round(w * x - 4 * s), Math.round(h * y), Math.round(h * 0.26 * s), '#0a0608'); figure(P, Math.round(w * x + 4 * s), Math.round(h * y), Math.round(h * 0.23 * s), '#140a10'); P.px(w * x - 4 * s, h * y - h * 0.21 * s, '#e8e0d0'); P.px(w * x + 4 * s, h * y - h * 0.19 * s, '#e8e0d0'); }
    },
    live(P, c, t) { motes(P, t, 22, mix(c.light, '#ffffff', 0.3), 2, false); },
  },
  cage: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [c.sky[0], c.sky[1], c.sky[2]]); moon(P, w * 0.25, h * 0.22, Math.max(4, Math.round(h * 0.07)), c);
      skyline(P, h * 0.95, h * 0.2, c.far, 61);
      P.rect(w * 0.55, 0, 3, h * 0.12, '#1a1410');
    },
    live(P, c, t) { const sw = Math.sin(t * 0.9) * 3; const cx = P.w * 0.56 + sw, top = P.h * 0.12, cw = P.w * 0.16, ch = P.h * 0.45;
      P.line(P.w * 0.56, top, cx, top + 6, '#3a3028');
      P.ellipse(cx, top + 8, cw / 2, 3, '#2a2420'); P.rect(cx - cw / 2, top + ch, cw, 3, '#2a2420');
      for (let k = 0; k <= 5; k++) P.rect(cx - cw / 2 + k * cw / 5, top + 8, 1, ch - 8, '#3a342c');
      figure(P, Math.round(cx), Math.round(top + ch), Math.round(ch * 0.6), '#06050a', { eyes: c.accent }); },
  },
  mirror: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [c.near, c.mid, c.near]);
      for (let k = 0; k < 9; k++) P.rect(k * w / 8, 0, 1, h, mix(c.mid, '#000', 0.3));
      const cx = w / 2, mw = w * 0.3, mh = h * 0.7, top = h * 0.12;
      P.ellipse(cx, top + mh / 2, mw / 2 + 5, mh / 2 + 5, '#6a5420'); P.ellipse(cx, top + mh / 2, mw / 2 + 2, mh / 2 + 2, '#a08030');
      P.ellipse(cx, top + mh / 2, mw / 2, mh / 2, mix(c.fog, c.sky[2], 0.5));
      P.poly([[cx - mw * 0.3, top + 8], [cx - mw * 0.05, top + 6], [cx - mw * 0.4, top + mh * 0.7]], mix(c.fog, '#ffffff', 0.25), 0.5);
      figure(P, Math.round(cx), Math.round(top + mh * 0.92), Math.round(mh * 0.55), mix(c.near, c.fog, 0.2));
      P.rect(cx - 1, top - 6, 3, 6, '#a08030');
      P.rect(w * 0.15, h * 0.62, 10, 3, '#3a2a1a'); P.rect(w * 0.15 + 4, h * 0.56, 2, 6, '#e8dcc0');
    },
    live(P, c, t) { const cx = P.w / 2, top = P.h * 0.12, mh = P.h * 0.7; const smile = Math.sin(t * 0.5) > 0.3; P.px(cx - 1, top + mh * 0.92 - mh * 0.55 * 0.8, c.accent); P.px(cx + 1, top + mh * 0.92 - mh * 0.55 * 0.8, c.accent); if (smile) P.rect(cx - 2, top + mh * 0.92 - mh * 0.55 * 0.72, 5, 1, '#e8e0d0');
      flame(P, Math.round(P.w * 0.15 + 5), Math.round(P.h * 0.56), 1, t, 2, { warm: c.warm, light: c.light }); },
  },
  crow: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, c.sky); moon(P, w * 0.62, h * 0.3, Math.max(6, Math.round(h * 0.14)), c);
      P.rect(0, h * 0.9, w, h * 0.1, c.near);
      // a dead branch across, crows along it
      P.poly([[-2, h * 0.5], [w * 0.4, h * 0.46], [w * 0.8, h * 0.52], [w + 2, h * 0.48], [w + 2, h * 0.51], [w * 0.8, h * 0.55], [w * 0.4, h * 0.49], [-2, h * 0.53]], '#06050a');
      P.line(w * 0.4, h * 0.47, w * 0.5, h * 0.36, '#06050a'); P.line(w * 0.7, h * 0.52, w * 0.78, h * 0.62, '#06050a');
      for (const [x, y, s] of [[0.18, 0.49, 1], [0.32, 0.47, 1.2], [0.55, 0.49, 1], [0.66, 0.5, 0.9], [0.88, 0.48, 1.1]]) { const cx = w * x, cy = h * y; P.ellipse(cx, cy - 3 * s, 3 * s, 3 * s, '#000000'); P.circ(cx + 2 * s, cy - 6 * s, Math.max(1, Math.round(2 * s)), '#000000'); P.px(cx + 4 * s, cy - 6 * s, '#000000'); P.line(cx - 3 * s, cy - 2 * s, cx - 6 * s, cy, '#000000'); }
    },
    live(P, c, t) { for (const [x, y] of [[0.32, 0.47], [0.66, 0.5]]) if (Math.sin(t * 1.3 + x * 10) > 0.4) P.px(P.w * x + 2, P.h * y - 7, c.accent);
      const k = (t * 0.15) % 1; const fx = P.w * (1 - k), fy = P.h * 0.2 + Math.sin(k * 10) * 4; const up = Math.sin(t * 12) > 0; P.line(fx - 3, fy + (up ? -2 : 1), fx, fy, '#000'); P.line(fx, fy, fx + 3, fy + (up ? -2 : 1), '#000'); },
  },
  merchant: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.6);
      P.grad(0, 0, w, hz, [c.sky[0], c.sky[1]]); skyline(P, hz, h * 0.2, c.far, 71);
      P.grad(0, hz, w, h - hz, [c.ground, c.near]);
      const cx = w * 0.52, cy = h * 0.82;
      P.rect(cx - w * 0.22, cy - h * 0.2, w * 0.44, h * 0.16, '#2a1a10'); P.rect(cx - w * 0.22, cy - h * 0.2, w * 0.44, 2, '#5a3a20');
      P.poly([[cx - w * 0.26, cy - h * 0.2], [cx - w * 0.2, cy - h * 0.42], [cx + w * 0.2, cy - h * 0.42], [cx + w * 0.26, cy - h * 0.2]], mix(c.accent, '#000', 0.45));
      for (let k = 0; k < 6; k++) P.rect(cx - w * 0.2 + k * w * 0.08, cy - h * 0.42, w * 0.04, h * 0.22, mix(c.accent, '#000', 0.3));
      P.circ(cx - w * 0.17, cy - 1, 6, '#1a120a'); P.circ(cx - w * 0.17, cy - 1, 4, '#3a2a18'); P.circ(cx + w * 0.17, cy - 1, 6, '#1a120a'); P.circ(cx + w * 0.17, cy - 1, 4, '#3a2a18');
      for (let k = 0; k < 5; k++) P.rect(cx - w * 0.18 + k * w * 0.08, cy - h * 0.25, 4, 5, ['#8a6a30', '#5a8a6a', '#a0404a', '#6a5aa0', '#c8a050'][k]);
      figure(P, Math.round(cx + w * 0.3), Math.round(cy + 2), Math.round(h * 0.34), '#08060a', { eyes: c.light, staff: '#2a1e14' });
    },
    live(P, c, t) { const lx = P.w * 0.52 - P.w * 0.2, ly = P.h * 0.82 - P.h * 0.38; const sw = Math.sin(t * 1.5) * 2; P.line(lx, ly - 4, lx + sw, ly, '#2a2018'); P.glow(lx + sw, ly + 3, 16, c.light, 0.5); P.rect(lx + sw - 2, ly, 4, 5, '#2a2018'); P.rect(lx + sw - 1, ly + 1, 2, 3, c.light); },
  },
  procession: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.58);
      P.grad(0, 0, w, hz, c.sky); skyline(P, hz, h * 0.25, c.far, 81); spire(P, w * 0.3, hz, h * 0.42, c.far);
      P.grad(0, hz, w, h - hz, [c.wet, c.ground, c.near]); P.dith(0, hz - 10, w, 14, c.fog, 0.4);
    },
    live(P, c, t) { const n = 7; for (let i = 0; i < n; i++) { const k = ((t * 0.04 + i / n) % 1); const x = P.w * (1.1 - k * 1.2), y = P.h * 0.62 + k * P.h * 0.28; const s = 0.4 + k * 0.7; const fh = Math.round(P.h * 0.24 * s);
        figure(P, Math.round(x), Math.round(y), fh, '#05050a'); const lx = Math.round(x + fh * 0.25), ly = Math.round(y - fh * 0.6); P.glow(lx, ly, Math.round(9 * s + 3), c.light, 0.5); P.px(lx, ly, '#ffffff'); }
      rain(P, t, 30, mix(c.fog, '#ffffff', 0.2)); },
  },
  child: {
    still(P, c) { const { w, h } = P; const hz = Math.round(h * 0.6);
      P.grad(0, 0, w, hz, [c.sky[0], c.sky[1], c.fog]); skyline(P, hz - 4, h * 0.22, mix(c.far, c.fog, 0.4), 91);
      P.grad(0, hz, w, h - hz, [c.wet, c.ground, c.near]);
      const lx = w * 0.62; P.glow(lx, h * 0.2, Math.round(h * 0.25), c.light, 0.5); P.rect(lx - 1, h * 0.22, 2, h * 0.7, '#050608'); P.rect(lx - 2, h * 0.17, 4, 5, '#050608'); P.rect(lx - 1, h * 0.18, 2, 3, c.light);
      P.ellipse(w * 0.45, h * 0.9, w * 0.14, 3, mix(c.light, c.wet, 0.6));
      figure(P, Math.round(w * 0.45), Math.round(h * 0.88), Math.round(h * 0.22), '#030305', { rim: mix(c.light, '#000', 0.3) });
      P.ellipse(w * 0.45 + 5, h * 0.8, 2, 2, '#b8903a'); P.px(w * 0.45 + 5, h * 0.8 + 3, '#b8903a');
    },
    live(P, c, t) { rain(P, t, 80, mix(c.fog, '#ffffff', 0.3), 180, 0.25, 5); if ((t % 3) < 1.5) P.glow(P.w * 0.45 + 5, P.h * 0.8, 6, c.light, 0.4); },
  },
  letter: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, [c.near, c.mid, c.near]);
      P.rect(0, h * 0.62, w, h * 0.38, '#1e140c'); P.rect(0, h * 0.62, w, 2, '#3a2a1a'); for (let k = 0; k < 6; k++) P.rect(0, h * 0.68 + k * 6, w, 1, '#18100a');
      P.poly([[w * 0.3, h * 0.66], [w * 0.68, h * 0.64], [w * 0.72, h * 0.86], [w * 0.28, h * 0.88]], '#d8c8a0'); for (let k = 0; k < 6; k++) P.line(w * 0.33, h * 0.7 + k * 3, w * 0.62, h * 0.69 + k * 3, '#5a4a30');
      P.ellipse(w * 0.6, h * 0.82, 4, 3, '#8a1a18'); P.px(w * 0.6, h * 0.82, '#c83030');
      P.rect(w * 0.18, h * 0.5, 6, h * 0.13, '#e8dcc0'); P.rect(w * 0.16, h * 0.62, 10, 2, '#5a4a30');
      P.line(w * 0.78, h * 0.6, w * 0.86, h * 0.36, '#e8e0d0'); P.rect(w * 0.76, h * 0.58, 6, 5, '#141010');
    },
    live(P, c, t) { const x = Math.round(P.w * 0.18 + 3), y = Math.round(P.h * 0.5); P.glow(x, y - 3, Math.round(P.h * 0.35), c.light, 0.4); flame(P, x, y, 1, t, 4, c); },
  },
  rats: {
    still(P, c) { const { w, h } = P;
      P.rect(0, 0, w, h, '#0a0908'); const ax = w / 2, aw = w * 0.7, top = h * 0.1;
      P.circ(ax, top + aw / 2, Math.round(aw / 2), '#1e1a14'); P.rect(ax - aw / 2, top + aw / 2, aw, h, '#1e1a14');
      for (let r = 0; r < 12; r++) for (let q = 0; q < 10; q++) { const x = ax - aw / 2 + q * aw / 10 + (r % 2) * 4, y = top + r * 7; if (Math.hypot(x - ax, Math.max(0, top + aw / 2 - y)) < aw / 2) P.rect(x, y, aw / 10 - 1, 6, mix('#2a241c', '#000', hash(r * 13 + q) * 0.4)); }
      P.circ(ax, top + aw / 2 + 4, Math.round(aw * 0.3), '#030303'); P.rect(ax - aw * 0.3, top + aw / 2 + 4, aw * 0.6, h, '#030303');
      P.rect(0, h * 0.82, w, h * 0.18, mix(c.wet, '#000', 0.4)); for (let k = 0; k < 8; k++) P.rect(hash(k * 3) * w, h * 0.84 + hash(k) * h * 0.12, 8, 1, mix(c.fog, c.wet, 0.4));
    },
    live(P, c, t) { for (let i = 0; i < 14; i++) { const x = P.w * (0.3 + hash(i * 3) * 0.4), y = P.h * (0.5 + hash(i * 7) * 0.3); if (Math.sin(t * 1.7 + i * 2.3) > -0.3) { P.px(x, y, c.accent); P.px(x + 2, y, c.accent); } }
      const k = (t * 0.25) % 1; const rx = P.w * (k * 1.2 - 0.1), ry = P.h * 0.88; P.ellipse(rx, ry, 4, 2, '#1a1410'); P.px(rx + 4, ry - 1, c.accent); P.line(rx - 4, ry, rx - 9, ry + 1, '#1a1410'); },
  },
  forge: {
    still(P, c) { const { w, h } = P;
      P.grad(0, 0, w, h, ['#0a0604', '#1a0e08', '#0a0604']);
      const fx = w * 0.3, fy = h * 0.55; P.rect(fx - w * 0.16, fy - h * 0.4, w * 0.32, h * 0.5, '#2a1e18'); P.circ(fx, fy - h * 0.15, Math.round(w * 0.09), '#100806'); P.rect(fx - w * 0.09, fy - h * 0.15, w * 0.18, h * 0.2, '#100806');
      P.glow(fx, fy - 4, Math.round(h * 0.5), c.warm, 0.5);
      for (let k = 0; k < 8; k++) P.rect(fx - w * 0.16, fy - h * 0.4 + k * 7, w * 0.32, 1, '#1a120e');
      const ax = w * 0.68, ay = h * 0.78; P.rect(ax - 14, ay - 8, 28, 5, '#3a3a40'); P.poly([[ax - 18, ay - 8], [ax - 14, ay - 8], [ax - 14, ay - 4]], '#3a3a40'); P.rect(ax - 6, ay - 3, 12, 10, '#2a2a30'); P.rect(ax - 14, ay - 8, 28, 1, '#7a7a84');
      P.rect(0, h * 0.86, w, h * 0.14, '#140c08'); P.rect(ax + 6, ay - 14, 10, 4, '#5a5a62'); P.rect(ax + 10, ay - 10, 2, 8, '#3a2010');
    },
    live(P, c, t) { const fx = Math.round(P.w * 0.3), fy = Math.round(P.h * 0.55); flame(P, fx, fy + 4, 7, t, 0, c); flame(P, fx - 6, fy + 4, 3, t, 5, c); flame(P, fx + 6, fy + 4, 3, t, 9, c);
      const ax = P.w * 0.68, ay = P.h * 0.78; if ((t % 1.2) < 0.15) for (let i = 0; i < 8; i++) P.px(ax + (hash(i + Math.floor(t)) - 0.5) * 20, ay - 10 - hash(i * 3) * 10, c.light);
      for (let i = 0; i < 12; i++) { const k = (t * (0.3 + hash(i) * 0.3) + hash(i * 3)) % 1; P.px(fx + Math.sin(t + i) * 8 * k, fy - 10 - k * P.h * 0.5, c.warm); } },
  },
  lamp: {
    still(P, c) { const { w, h } = P; P.grad(0, 0, w, h, [c.sky[0], c.sky[1], c.near]); P.dith(0, h * 0.4, w, h * 0.3, c.fog, 0.3); skyline(P, h * 0.72, h * 0.18, mix(c.far, c.fog, 0.3), 101); P.rect(0, h * 0.72, w, h * 0.28, c.near);
      const lx = w / 2; P.rect(lx - 1, h * 0.3, 3, h * 0.6, '#050608'); P.rect(lx - 6, h * 0.88, 13, 3, '#050608'); P.rect(lx - 5, h * 0.18, 11, 3, '#050608'); P.rect(lx - 4, h * 0.21, 9, 10, '#0a0b0e'); P.poly([[lx - 6, h * 0.18], [lx, h * 0.12], [lx + 6, h * 0.18]], '#050608'); },
    live(P, c, t) { const lx = Math.round(P.w / 2), ly = Math.round(P.h * 0.26); const f = 0.75 + 0.25 * Math.sin(t * 7) * Math.sin(t * 3.1); P.glow(lx, ly, Math.round(P.h * 0.4 * f), c.accent, 0.55); P.rect(lx - 3, ly - 3, 7, 8, mix(c.accent, '#ffffff', 0.3)); P.rect(lx - 1, ly - 2, 2, 5, '#ffffff');
      for (let i = 0; i < 10; i++) { const a = t * 0.8 + i * 0.63; P.px(lx + Math.cos(a) * (10 + i * 2), ly + Math.sin(a) * (6 + i), c.accent); } },
  },
};

// ------------------------------------------------------------------ public: draw an art spec into a rect
const still = new Map();
export function drawVignette(ui, art, x, y, w, h, t = 0) {
  art = art || {}; const key = sceneKey(art.scene); const S = SCENES[key]; const pal = paletteFor(key, art.palette);
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); if (w < 8 || h < 8) return;
  const ck = key + '|' + w + 'x' + h + '|' + JSON.stringify(art.palette || '');
  let c = still.get(ck);
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); try { S.still(painter(g, w, h), pal); } catch (e) { console.error('vignette ' + key, e); } if (still.size > 30) still.clear(); still.set(ck, c); }
  const g = ui.g; g.drawImage(c, x, y);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  try { S.live(painter(g, w, h, x, y), pal, t); } catch (e) { /* a live layer never breaks a menu */ }
  g.restore();
}
