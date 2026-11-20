// Bannerborn — the battle effects, painted pixel by pixel. Loaded into a blank page by tools/make-vfx.js, which draws
// every frame of every effect, packs them into assets/fx/vfx.webp + vfx.json and the game draws them like any other
// sheet (BB.drawFx; keys start 'v_'). One sprite pixel is one world unit, as the characters are drawn: a hero is
// about 42 pixels tall, so a fireball is 22 and a meteor's blast 120.
// Most effects are a field of heat (soft blobs, noise) read through a hand-picked palette with 4x4 ordered dither:
// that is what makes fire, smoke, shadow and light look painted rather than blurred. Hard things (arrows, ice, rock)
// are drawn as flat-shaded shapes. Every effect is seeded: the sheet comes out the same each time it is made.
(function () {
  // ---------------------------------------------------------------- palettes (dark to bright)
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PAL = {
    fire: ['#3a0c08', '#7a1a0a', '#c22e0e', '#ee6212', '#ffa22a', '#ffd84e', '#fff7cc'],
    smoke: ['#1c1616', '#2e2624', '#463a36', '#615450'],
    arcane: ['#26093f', '#521b86', '#8f3bd0', '#c072ff', '#e8bcff', '#ffffff'],
    bolt: ['#0e1f57', '#2155c4', '#3fa6ff', '#a2e6ff', '#ffffff'],
    shadow: ['#08050e', '#1a0d29', '#33174b', '#5a2a80', '#9550c8', '#d9a6ff'],
    umbra: ['#b57ae6', '#7a3bb0', '#4a1f72', '#2a1042', '#170a26', '#0a0512'], // shadow read the other way: a bright rim, a black heart
    frost: ['#0f2d50', '#1d5d92', '#3f9fdc', '#9fe0ff', '#e8fbff'],
    holy: ['#5c3c08', '#a8740f', '#e8b22c', '#ffdf72', '#fff6cf', '#ffffff'],
    heal: ['#0e3d1c', '#21802f', '#4fc64b', '#a6f27c', '#f2ffd8'],
    poison: ['#18280a', '#375a12', '#64a21c', '#a2dc38', '#e2ff8c'],
    blood: ['#2c0408', '#701018', '#bc2028', '#ff503e', '#ffb6a4'],
    steel: ['#3c4862', '#8a9cba', '#d6e4f6', '#ffffff'],
    gold: ['#6a420a', '#b8801a', '#f0c040', '#ffe890', '#fffbe6'],
    dust: ['#3e2e20', '#6e5a3e', '#a68c66', '#d6c29e'],
    rock: ['#231d1a', '#423833', '#6b5c50', '#9c8a76'],
    wood: ['#4a2e18', '#7a5230', '#b07c48'],
    venom: ['#0e2208', '#2c5410', '#58a018', '#9ce034', '#eaffa0'],
  };
  for (const k in PAL) PAL[k] = PAL[k].map(hex);
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  // ---------------------------------------------------------------- seeded randomness and noise
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function noise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  const fbm = (x, y, s) => noise(x, y, s) * 0.55 + noise(x * 2.1, y * 2.1, s + 7) * 0.3 + noise(x * 4.3, y * 4.3, s + 13) * 0.15;
  const cl = (x) => Math.max(0, Math.min(1, x)), lerp = (a, b, k) => a + (b - a) * k, ease = (k) => 1 - (1 - k) * (1 - k), easeIn = (k) => k * k, TAU = Math.PI * 2;

  // ---------------------------------------------------------------- a frame: a heat field, then pixels
  class Px {
    constructor(w, h) { this.w = w; this.h = h; this.f = new Float32Array(w * h); this.d = new Uint8ClampedArray(w * h * 4); }
    blob(x, y, r, v, sq) { // a soft round heap of heat; sq squashes it vertically (ground effects)
      sq = sq || 1; const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(this.w - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r * sq)), y1 = Math.min(this.h - 1, Math.ceil(y + r * sq));
      for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) { const dx = (i + 0.5 - x) / r, dy = (j + 0.5 - y) / (r * sq), d2 = dx * dx + dy * dy; if (d2 < 1) this.f[j * this.w + i] += v * (1 - d2) * (1 - d2); }
    }
    ring(x, y, r, th, v, sq) { // a ring of heat (a shockwave)
      sq = sq || 1; const R = r + th; for (let j = Math.max(0, Math.floor(y - R * sq)); j <= Math.min(this.h - 1, Math.ceil(y + R * sq)); j++) for (let i = Math.max(0, Math.floor(x - R)); i <= Math.min(this.w - 1, Math.ceil(x + R)); i++) {
        const dx = i + 0.5 - x, dy = (j + 0.5 - y) / sq, d = Math.sqrt(dx * dx + dy * dy), q = 1 - Math.abs(d - r) / th; if (q > 0) this.f[j * this.w + i] += v * q * q; }
    }
    seg(x0, y0, x1, y1, r, v) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / Math.max(0.6, r * 0.5))); for (let k = 0; k <= n; k++) this.blob(lerp(x0, x1, k / n), lerp(y0, y1, k / n), r, v / Math.sqrt(n) * 1.6); }
    mul(fn) { for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) this.f[j * this.w + i] *= fn(i, j); }
    // read the field through a palette: below `cut` nothing; the first step is a little see-through
    paint(pal, cut, gain, soft) {
      cut = cut === undefined ? 0.12 : cut; gain = gain || 1; const n = pal.length;
      for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
        const v = this.f[j * this.w + i] * gain; if (v <= cut) continue;
        const q = (v - cut) / (1 - cut) * n + (BAYER[(j & 3) * 4 + (i & 3)] - 0.5) * 0.9; let k = Math.floor(q); if (k < 0) continue; if (k >= n) k = n - 1;
        this.put(i, j, pal[k], k === 0 ? (soft === undefined ? 190 : soft) : 255);
      }
      this.f.fill(0);
    }
    put(i, j, c, a) { i |= 0; j |= 0; if (i < 0 || j < 0 || i >= this.w || j >= this.h) return; const o = (j * this.w + i) * 4; this.d[o] = c[0]; this.d[o + 1] = c[1]; this.d[o + 2] = c[2]; this.d[o + 3] = a === undefined ? 255 : a; }
    get(i, j) { const o = (j * this.w + i) * 4; return this.d[o + 3]; }
    dot(x, y, c, a) { this.put(Math.round(x), Math.round(y), c, a); }
    line(x0, y0, x1, y1, c, a) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
      for (;;) { this.put(x0, y0, c, a); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
    disc(x, y, r, c, a, sq) { sq = sq || 1; for (let j = Math.floor(y - r * sq) - 1; j <= Math.ceil(y + r * sq) + 1; j++) for (let i = Math.floor(x - r) - 1; i <= Math.ceil(x + r) + 1; i++) { const dx = i + 0.5 - x, dy = (j + 0.5 - y) / sq; if (dx * dx + dy * dy <= r * r) this.put(i, j, c, a); } }
    poly(pts, c, a) { // a filled polygon, scanline
      let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      for (let j = Math.floor(y0); j <= Math.ceil(y1); j++) { const yy = j + 0.5, xs = [];
        for (let k = 0; k < pts.length; k++) { const a0 = pts[k], b0 = pts[(k + 1) % pts.length]; if ((a0[1] <= yy && b0[1] > yy) || (b0[1] <= yy && a0[1] > yy)) xs.push(a0[0] + (yy - a0[1]) / (b0[1] - a0[1]) * (b0[0] - a0[0])); }
        xs.sort((p, q) => p - q); for (let k = 0; k + 1 < xs.length; k += 2) for (let i = Math.round(xs[k]); i < Math.round(xs[k + 1]); i++) this.put(i, j, c, a); }
    }
    outline(c, a) { // a dark rim around everything painted (how pixel art keeps shapes readable over busy ground)
      const w = this.w, h = this.h, src = new Uint8ClampedArray(this.d);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (src[(j * w + i) * 4 + 3]) continue;
        const n = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 200; if (n(i - 1, j) || n(i + 1, j) || n(i, j - 1) || n(i, j + 1)) this.put(i, j, c, a === undefined ? 255 : a); }
    }
  }

  // ---------------------------------------------------------------- the effects
  // Each: w, h (frame size), ax, ay (the anchor: where in the frame the effect's point is), n (frames), draw(p, k, i, r)
  // with k from 0 to 1 over the effect. `loop` effects draw k from 0 up to (n-1)/n so the loop has no seam.
  const V = {};
  const def = (key, o) => { V[key] = o; };

  // ---- fire
  def('v_fireball', { w: 24, h: 14, ax: 18, ay: 7, n: 6, loop: true, draw(p, k, i) {
    for (let s = 0; s < 9; s++) { const t = s / 8, x = 18 - t * 17, y = 7 + Math.sin(k * TAU + s * 1.3) * t * 2.2; p.blob(x, y, 5.6 - t * 3.6, 1.05 - t * 0.55); }
    p.mul((x, y) => 0.7 + fbm(x * 0.35 - k * 6, y * 0.35, 11) * 0.6); p.blob(18.5, 7, 3.4, 0.9); p.paint(PAL.fire, 0.14);
    const r = rng(40 + i); for (let s = 0; s < 4; s++) p.dot(r() * 10, 3 + r() * 8, PAL.fire[4 + (r() * 3 | 0)]);
  } });
  def('v_fireburst', { w: 52, h: 52, ax: 26, ay: 30, n: 10, draw(p, k, i) {
    const r = rng(77), R = 5 + 19 * ease(k), heat = Math.pow(1 - k, 0.9);
    if (k < 0.45) { p.blob(26, 28, 5 + 12 * k, 1.15 * (1 - k * 2)); p.ring(26, 28, 4 + 26 * k, 3, 0.8 * (1 - k * 2)); }
    for (let s = 0; s < 22; s++) { const a = r() * TAU, sp = 0.45 + r() * 0.6, d = R * sp, x = 26 + Math.cos(a) * d, y = 28 + Math.sin(a) * d * 0.8 - k * 6 * r(); p.blob(x, y, (3 + r() * 5) * (1 - k * 0.45), heat * (0.55 + r() * 0.45)); }
    p.mul((x, y) => 0.45 + fbm(x * 0.22 + i, y * 0.22, 5) * 0.9);
    if (k > 0.35) { const sm = new Px(52, 52); for (let s = 0; s < 8; s++) { const a = r() * TAU, d = R * 0.7; sm.blob(26 + Math.cos(a) * d, 26 + Math.sin(a) * d * 0.7 - k * 10, 6 + 6 * k, 0.7 * (1 - k)); } sm.paint(PAL.smoke, 0.12, 1, 150); p.d.set(sm.d); }
    p.paint(PAL.fire, 0.16, 0.95);
    const r2 = rng(90); for (let s = 0; s < 14; s++) { const a = r2() * TAU, d = 4 + (R + 6) * k * (0.6 + r2() * 0.6); if (k < 0.85) p.dot(26 + Math.cos(a) * d, 28 + Math.sin(a) * d * 0.8 + k * k * 8, PAL.fire[4 + (r2() * 3 | 0)]); }
  } });
  const cone = (pal, seed) => ({ w: 100, h: 54, ax: 3, ay: 27, n: 12, draw(p, k, i) { // a breath of fire (or worse), along +x
    const r = rng(seed), grow = ease(cl(k / 0.3)), fade = 1 - cl((k - 0.7) / 0.3);
    for (let s = 0; s < 70; s++) { const a = (r() - 0.5) * 0.8 * (0.5 + r() * 0.5), sp = r(), ph = (sp + k * 1.6) % 1, d = ph * 92 * grow, x = 4 + Math.cos(a) * d, y = 27 + Math.sin(a) * d - ph * ph * 6; if (ph > grow) continue;
      p.blob(x, y, 2.2 + ph * 7.5, (0.95 - ph * 0.7) * fade); }
    p.mul((x, y) => 0.4 + fbm(x * 0.17 - k * 7, y * 0.22, seed) * 1.0); p.blob(6, 27, 5, 0.8 * fade); p.paint(pal, 0.15, 0.95);
    for (let s = 0; s < 12; s++) { const a = (r() - 0.5) * 0.9, d = (r() * 0.7 + k * 0.3) * 96 * grow; if (r() < fade) p.dot(4 + Math.cos(a) * d, 27 + Math.sin(a) * d - r() * 4, pal[pal.length - 2 - (r() * 2 | 0)]); }
  } });
  def('v_flamecone', cone(PAL.fire, 21));
  def('v_venomcone', cone(PAL.venom, 23));

  // ---- arcane (the arcanist's own bolt) and the light (the warpriest's)
  def('v_arcane', { w: 18, h: 18, ax: 9, ay: 9, n: 6, loop: true, draw(p, k, i) {
    p.blob(9, 9, 5.5 + Math.sin(k * TAU) * 0.6, 1.1); p.paint(PAL.arcane, 0.15);
    for (let s = 0; s < 4; s++) { const a = k * TAU + s * TAU / 4; p.dot(9 + Math.cos(a) * 7, 9 + Math.sin(a) * 7, PAL.arcane[4]); p.dot(9 + Math.cos(a + 0.4) * 6, 9 + Math.sin(a + 0.4) * 6, PAL.arcane[3]); }
    p.dot(9, 9, PAL.arcane[5]); p.dot(8, 8, PAL.arcane[5]);
  } });
  def('v_arcanehit', { w: 32, h: 32, ax: 16, ay: 16, n: 7, draw(p, k) {
    const R = 3 + 11 * ease(k); p.ring(16, 16, R, 2.2, 1 - k * 0.8); if (k < 0.3) p.blob(16, 16, 7, 1.2 * (1 - k * 3)); p.paint(PAL.arcane, 0.15);
    for (let s = 0; s < 8; s++) { const a = s * TAU / 8 + 0.3, d0 = R * 0.6, d1 = R + 4; if (k < 0.75) p.line(16 + Math.cos(a) * d0, 16 + Math.sin(a) * d0, 16 + Math.cos(a) * d1, 16 + Math.sin(a) * d1, PAL.arcane[s % 2 ? 4 : 5]); }
  } });
  def('v_lightorb', { w: 18, h: 18, ax: 9, ay: 9, n: 6, loop: true, draw(p, k) {
    p.blob(9, 9, 6 + Math.sin(k * TAU) * 0.7, 1.1); p.paint(PAL.holy, 0.15);
    const L = 3 + Math.round(Math.sin(k * TAU) * 1.5); p.line(9 - L - 2, 9, 9 + L + 2, 9, PAL.holy[5]); p.line(9, 9 - L - 2, 9, 9 + L + 2, PAL.holy[5]);
  } });
  def('v_holyburst', { w: 56, h: 56, ax: 28, ay: 30, n: 9, draw(p, k) {
    const R = 4 + 20 * ease(k); p.ring(28, 30, R, 2.5, 1.1 * (1 - k)); if (k < 0.35) p.blob(28, 30, 9, 1.3 * (1 - k * 2.6)); p.paint(PAL.holy, 0.14);
    for (let s = 0; s < 12; s++) { const a = s * TAU / 12, d0 = R * 0.35, d1 = R * (s % 2 ? 0.9 : 1.15); if (k < 0.8) p.line(28 + Math.cos(a) * d0, 30 + Math.sin(a) * d0, 28 + Math.cos(a) * d1, 30 + Math.sin(a) * d1, PAL.holy[s % 2 ? 4 : 5]); }
  } });
  def('v_pillar', { w: 40, h: 150, ax: 20, ay: 142, n: 13, draw(p, k, i) { // a column of light from the sky (Smite)
    const on = k < 0.15 ? k / 0.15 : 1 - cl((k - 0.55) / 0.45), wdt = 3 + 9 * on;
    for (let j = 0; j < 142; j++) { const wob = Math.sin(j * 0.25 + i * 1.7) * 0.8; for (let x = -Math.ceil(wdt + 3); x <= Math.ceil(wdt + 3); x++) { const q = 1 - Math.abs(x - wob) / (wdt + 2); if (q > 0) p.f[j * 40 + 20 + x] += q * (0.75 + 0.35 * on) * (0.85 + 0.15 * Math.sin(j * 0.6 - i * 2)); } }
    p.blob(20, 142, 16 * on + 2, 1.3 * on, 0.4); p.paint(PAL.holy, 0.15);
    const r = rng(300 + i); for (let s = 0; s < 14; s++) if (r() < on + 0.2) p.dot(20 + (r() - 0.5) * 30, 142 - r() * 120 * (0.4 + k), PAL.holy[4 + (r() * 2 | 0)]);
  } });
  def('v_heal', { w: 34, h: 52, ax: 17, ay: 44, n: 10, draw(p, k, i) {
    p.ring(17, 44, 6 + 8 * ease(k), 2, 0.9 * (1 - k), 0.45); p.paint(PAL.heal, 0.15);
    const r = rng(500); for (let s = 0; s < 9; s++) { const x = 4 + r() * 26, sp = 0.6 + r() * 0.6, ph = cl(k * 1.3 - r() * 0.3), y = 44 - ph * 40 * sp; if (ph <= 0 || ph >= 1) continue;
      const c = PAL.heal[3 + (s % 2)]; if (s % 3 === 0) { p.line(x - 2, y, x + 2, y, c); p.line(x, y - 2, x, y + 2, c); p.dot(x, y, PAL.heal[4]); } else { p.dot(x, y, c); p.dot(x, y + 1, PAL.heal[2]); } }
  } });
  def('v_barrier', { w: 46, h: 52, ax: 23, ay: 46, n: 8, loop: true, draw(p, k, i) { // a shell of light around one hero
    const cx = 23, cy = 26, rx = 18, ry = 22;
    for (let j = 0; j < 52; j++) for (let x = 0; x < 46; x++) { const dx = (x + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy); if (d > 1.06) continue;
      const rim = cl(1 - Math.abs(d - 1) / 0.12), hexl = (Math.abs(Math.sin((x + j * 0.58) * 0.55)) < 0.12 || Math.abs(Math.sin((x - j * 0.58) * 0.55)) < 0.12 || Math.abs(Math.sin(j * 0.5)) < 0.1) ? 0.32 : 0;
      const sweep = Math.max(0, 1 - Math.abs(((j / 52) - k + 1) % 1 - 0.5) * 6) * 0.35; p.f[j * 46 + x] = rim * 0.95 + (d < 1 ? hexl * (0.6 + sweep) + sweep * 0.2 : 0); }
    p.paint([[24, 70, 140], [70, 150, 230], [150, 215, 255], [235, 250, 255]], 0.2, 1, 150);
  } });
  def('v_buff', { w: 34, h: 48, ax: 17, ay: 42, n: 9, draw(p, k) { // rallied: gold chevrons rising
    p.ring(17, 42, 5 + 9 * ease(k), 2, 0.9 * (1 - k), 0.45); p.paint(PAL.gold, 0.15);
    for (let s = 0; s < 3; s++) { const ph = cl(k * 1.5 - s * 0.22); if (ph <= 0 || ph >= 1) continue; const y = 38 - ph * 30, x = 17 + (s - 1) * 9, c = PAL.gold[ph < 0.6 ? 3 : 2];
      p.line(x - 3, y + 2, x, y - 1, c); p.line(x, y - 1, x + 3, y + 2, c); p.line(x - 3, y + 3, x, y, PAL.gold[1]); p.line(x, y, x + 3, y + 3, PAL.gold[1]); }
  } });
  def('v_rage', { w: 42, h: 54, ax: 21, ay: 46, n: 8, loop: true, draw(p, k, i) { // Blood Rush: a red fire around the body
    for (let s = 0; s < 22; s++) { const side = s % 2 ? 1 : -1, ph = (k + s * 0.29) % 1, x = 21 + side * (9 + Math.sin(ph * 5 + s) * 2.5) * (1 - ph * 0.35), y = 47 - ph * 42; p.blob(x, y, 5 * (1 - ph * 0.55), 1.1 * (1 - ph * 0.85)); }
    p.blob(21, 47, 13, 0.7, 0.35); p.mul((x, y) => 0.45 + fbm(x * 0.3, y * 0.25 + k * 5, 9) * 0.9); p.paint(PAL.blood, 0.2, 1.05, 170);
  } });

  // ---- lightning: strips drawn stretched between two points, an impact, and a strike from the sky
  function boltPath(r, len, w, jag) { const pts = [[w / 2, 0]]; const n = Math.max(4, Math.round(len / 7)); for (let s = 1; s < n; s++) pts.push([w / 2 + (r() - 0.5) * jag, s / n * len]); pts.push([w / 2, len - 1]); return pts; }
  function boltDraw(p, pts, r, branch) {
    for (let s = 0; s + 1 < pts.length; s++) p.seg(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], 4, 0.9); p.paint(PAL.bolt, 0.16, 1, 160);
    for (let s = 0; s + 1 < pts.length; s++) { p.line(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], PAL.bolt[3]); p.line(pts[s][0] + 1, pts[s][1], pts[s + 1][0] + 1, pts[s + 1][1], PAL.bolt[4]); }
    p.outline([10, 22, 70], 200);
    if (branch) for (let b = 0; b < 2; b++) { const s = 1 + (r() * (pts.length - 3) | 0), q = pts[s], dir = r() < 0.5 ? -1 : 1; let x = q[0], y = q[1]; for (let t = 0; t < 3; t++) { const nx = x + dir * (2 + r() * 4), ny = y + 3 + r() * 5; p.line(x, y, nx, ny, PAL.bolt[t ? 2 : 3]); x = nx; y = ny; } }
  }
  def('v_bolt_s', { w: 16, h: 64, ax: 8, ay: 0, n: 6, loop: true, draw(p, k, i) { const r = rng(600 + i); boltDraw(p, boltPath(r, 64, 16, 9), r, true); } });
  def('v_bolt_l', { w: 22, h: 128, ax: 11, ay: 0, n: 6, loop: true, draw(p, k, i) { const r = rng(700 + i); boltDraw(p, boltPath(r, 128, 22, 13), r, true); } });
  def('v_stormorb', { w: 20, h: 20, ax: 10, ay: 10, n: 6, loop: true, draw(p, k, i) { // a storm-charged bolt: a ball of light with sparks jumping off it
    p.blob(10, 10, 5.5, 1.1); p.paint(PAL.bolt, 0.15); const r = rng(820 + i);
    for (let s = 0; s < 3; s++) { const a = r() * TAU; let x = 10 + Math.cos(a) * 4, y = 10 + Math.sin(a) * 4; for (let t = 0; t < 2; t++) { const nx = x + Math.cos(a + (r() - 0.5)) * 3, ny = y + Math.sin(a + (r() - 0.5)) * 3; p.line(x, y, nx, ny, PAL.bolt[3 + t % 2]); x = nx; y = ny; } }
    p.dot(10, 10, PAL.bolt[4]); p.dot(9, 9, PAL.bolt[4]);
  } });
  def('v_zap', { w: 34, h: 34, ax: 17, ay: 17, n: 7, draw(p, k, i) {
    if (k < 0.4) p.blob(17, 17, 8, 1.3 * (1 - k * 2.4)); p.ring(17, 17, 4 + 10 * ease(k), 1.6, 0.8 * (1 - k)); p.paint(PAL.bolt, 0.16, 1, 150);
    const r = rng(800 + i); if (k < 0.7) for (let s = 0; s < 5; s++) { const a = r() * TAU; let x = 17, y = 17; for (let t = 0; t < 3; t++) { const d = 3 + r() * 4, nx = x + Math.cos(a + (r() - 0.5) * 1.2) * d, ny = y + Math.sin(a + (r() - 0.5) * 1.2) * d; p.line(x, y, nx, ny, PAL.bolt[t ? 3 : 4]); x = nx; y = ny; } }
  } });
  def('v_strike', { w: 40, h: 136, ax: 20, ay: 130, n: 9, draw(p, k, i) { // a bolt from the sky onto one spot
    const r = rng(900 + (i >> 1)); const on = k < 0.55;
    if (on) { const pts = boltPath(r, 130, 40, 18); boltDraw(p, pts, r, true); }
    p.blob(20, 130, 14 * (1 - k * 0.6), (k < 0.6 ? 1.2 : 0.7) * (1 - k), 0.45); p.paint(PAL.bolt, 0.16, 1, 150);
    if (k > 0.3) { const r2 = rng(950); for (let s = 0; s < 8; s++) { const a = r2() * Math.PI, d = 4 + k * 14 * r2(); p.dot(20 + Math.cos(a) * d * 1.4, 130 - Math.sin(a) * d * 0.8, PAL.bolt[3 + (s % 2)]); } }
  } });

  // ---- the meteor
  def('v_meteor', { w: 40, h: 40, ax: 28, ay: 28, n: 4, loop: true, draw(p, k, i) { // falling down and to the right
    for (let s = 0; s < 10; s++) { const t = s / 9, x = 28 - t * 26 + Math.sin(k * TAU + s) * 1.2 * t, y = 28 - t * 26 + Math.cos(k * TAU + s * 1.7) * 1.2 * t; p.blob(x, y, 7 - t * 4.5, 1.1 - t * 0.6); }
    p.mul((x, y) => 0.6 + fbm(x * 0.25 + k * 5, y * 0.25 + k * 5, 31) * 0.8); p.paint(PAL.fire, 0.15);
    p.disc(28, 28, 5.2, PAL.rock[1]); p.disc(27, 27, 4, PAL.rock[2]); p.disc(26, 26, 2, PAL.rock[3]);
    p.line(26, 30, 30, 27, PAL.fire[5]); p.dot(31, 30, PAL.fire[4]); p.dot(25, 29, PAL.fire[4]); p.outline([28, 8, 4], 255);
  } });
  def('v_meteorblast', { w: 124, h: 92, ax: 62, ay: 64, n: 16, draw(p, k, i) {
    const r = rng(1000);
    // the crater and the shockwave lie on the ground
    if (k > 0.08) { p.ring(62, 64, 8 + 50 * ease(cl((k - 0.08) / 0.6)), 4, 0.9 * (1 - cl((k - 0.08) / 0.6)), 0.45); p.paint(PAL.dust, 0.15, 1, 170); }
    p.disc(62, 64, 18 * cl(k * 6), PAL.rock[0], 255, 0.42); p.disc(62, 63, 13 * cl(k * 6), [52, 22, 12], 255, 0.38);
    // the fire dome, rising into a column of smoke
    const heat = Math.pow(1 - k, 1.1), up = ease(k) * 26;
    if (k > 0.25) { const sm = new Px(124, 92); for (let s = 0; s < 14; s++) { const a = r() * TAU, d = r() * 14; sm.blob(62 + Math.cos(a) * d * 1.3, 56 - up - r() * 18 * k + Math.sin(a) * d * 0.5, 9 + 10 * k, 0.75 * (1 - k * 0.7)); } sm.mul((x, y) => 0.6 + fbm(x * 0.12, y * 0.12 - k * 3, 41) * 0.8); sm.paint(PAL.smoke, 0.15, 1, 170);
      for (let q = 0; q < sm.d.length; q += 4) if (sm.d[q + 3] && !p.d[q + 3]) { p.d[q] = sm.d[q]; p.d[q + 1] = sm.d[q + 1]; p.d[q + 2] = sm.d[q + 2]; p.d[q + 3] = sm.d[q + 3]; } }
    if (k < 0.8) { p.blob(62, 58 - up * 0.6, 14 + 18 * ease(k), 1.4 * heat); for (let s = 0; s < 16; s++) { const a = r() * TAU, d = (10 + 22 * ease(k)) * (0.5 + r() * 0.6); p.blob(62 + Math.cos(a) * d * 1.2, 58 - up * 0.6 + Math.sin(a) * d * 0.55 - r() * 10 * k, 5 + r() * 7, heat * (0.7 + r() * 0.5)); }
      p.mul((x, y) => 0.55 + fbm(x * 0.13 + i * 0.3, y * 0.13, 47) * 0.9); p.paint(PAL.fire, 0.17, 1.05); }
    if (k < 0.12) { p.blob(62, 60, 26, 1.6); p.paint([[255, 230, 160], [255, 250, 220], [255, 255, 255]], 0.1); }
    // rocks thrown out and falling back
    const r2 = rng(1100); for (let s = 0; s < 12; s++) { const a = -Math.PI * (0.1 + r2() * 0.8), sp = 30 + r2() * 30, t = k * 1.2, x = 62 + Math.cos(a) * sp * t * 1.3, y = 60 + Math.sin(a) * sp * t + 70 * t * t; if (t > 0.05 && y < 90) { p.disc(x, y, 1.6, PAL.rock[2]); p.dot(x - 1, y - 1, PAL.rock[3]); if (k < 0.5) p.dot(x - Math.cos(a) * 3, y - Math.sin(a) * 3, PAL.fire[4]); } }
  } });
  def('v_scorch', { w: 56, h: 28, ax: 28, ay: 14, n: 8, draw(p, k) { // what a meteor or a blast leaves on the ground, fading
    const a = Math.round(220 * (1 - k)); if (a < 10) return; const r = rng(1200);
    p.disc(28, 14, 20, [30, 22, 18], a, 0.5); p.disc(28, 14, 13, [18, 12, 10], a, 0.5);
    for (let s = 0; s < 7; s++) { const an = r() * TAU, d = 12 + r() * 10; p.line(28 + Math.cos(an) * 9, 14 + Math.sin(an) * 4.5, 28 + Math.cos(an) * d, 14 + Math.sin(an) * d * 0.5, [24, 18, 14], a); }
    if (k < 0.5) for (let s = 0; s < 6; s++) p.dot(22 + r() * 12, 11 + r() * 6, PAL.fire[3 + (s % 2)], Math.round(255 * (1 - k * 2)));
  } });

  // ---- shadow
  def('v_shadowburst', { w: 52, h: 52, ax: 26, ay: 30, n: 10, draw(p, k, i) {
    const R = 4 + 18 * ease(k);
    for (let s = 0; s < 10; s++) { const a = s / 10 * TAU + k * 1.5, curl = Math.sin(k * 5 + s) * 0.6; for (let t = 0; t < 6; t++) { const d = R * (0.3 + t * 0.15), aa = a + curl * t * 0.25; p.blob(26 + Math.cos(aa) * d, 28 + Math.sin(aa) * d * 0.85 - t * k * 2, 4.5 - t * 0.5, (1 - k) * (1 - t * 0.1)); } }
    if (k < 0.4) p.blob(26, 28, 9, 1.2 * (1 - k * 2.5)); p.mul((x, y) => 0.55 + fbm(x * 0.2 + k * 3, y * 0.2, 61) * 0.9); p.paint(PAL.umbra, 0.16, 1.05, 210);
    const r = rng(1300); for (let s = 0; s < 8; s++) { const a = r() * TAU, d = R * (0.8 + r() * 0.5); if (k < 0.85) p.dot(26 + Math.cos(a) * d, 28 + Math.sin(a) * d * 0.85, PAL.shadow[5]); }
  } });
  def('v_shadowslash', { w: 64, h: 64, ax: 32, ay: 34, n: 7, draw(p, k) { // a dark crescent cut, top right to bottom left
    const sweep = ease(cl(k / 0.55)), fade = 1 - cl((k - 0.45) / 0.55), a0 = -1.9, a1 = a0 + 3.4 * sweep;
    for (let s = 0; s <= 40; s++) { const t = s / 40, a = lerp(a0, a1, t), lag = 1 - t, R = 22; p.blob(32 + Math.cos(a) * R, 34 + Math.sin(a) * R * 0.8, 2 + 3.5 * Math.sin(t * Math.PI) * (0.6 + 0.4 * (1 - lag)), (0.5 + 0.7 * t) * fade); }
    p.mul((x, y) => 0.65 + fbm(x * 0.3, y * 0.3 + k * 3, 67) * 0.7); p.paint(PAL.umbra, 0.16, 1.1, 210);
    for (let s = 0; s <= 30; s++) { const t = s / 30, a = lerp(a0, a1, t); if (t > 0.35 && fade > 0.3) p.dot(32 + Math.cos(a) * 23, 34 + Math.sin(a) * 23 * 0.8, PAL.shadow[t > 0.8 ? 5 : 4]); }
  } });
  def('v_shadowbolt', { w: 22, h: 14, ax: 16, ay: 7, n: 6, loop: true, draw(p, k) {
    for (let s = 0; s < 8; s++) { const t = s / 7, x = 16 - t * 15, y = 7 + Math.sin(k * TAU + s * 1.4) * t * 2.4; p.blob(x, y, 5 - t * 3, 1 - t * 0.5); }
    p.mul((x, y) => 0.65 + fbm(x * 0.4 - k * 6, y * 0.4, 71) * 0.7); p.paint(PAL.umbra, 0.15, 1.1, 210); p.dot(17, 6, PAL.shadow[5]); p.dot(16, 7, PAL.shadow[5]);
  } });
  def('v_blink', { w: 40, h: 52, ax: 20, ay: 44, n: 8, draw(p, k, i) { // vanishing (or arriving): a twist of shadow
    for (let s = 0; s < 16; s++) { const a = s / 16 * TAU + k * 6, h = (s * 0.618) % 1, R = 11 * (1 - k * 0.7) * (0.6 + h * 0.6), y = 44 - h * 38; p.blob(20 + Math.cos(a) * R, y + Math.sin(a) * 3, 3.5, 0.9 * (1 - k)); }
    p.blob(20, 44, 12 * (1 - k * 0.5), 0.8 * (1 - k), 0.4); p.paint(PAL.umbra, 0.16, 1.05, 210);
    const r = rng(1400 + i); for (let s = 0; s < 6; s++) if (k < 0.8) p.dot(10 + r() * 20, 8 + r() * 36, PAL.shadow[4 + (s % 2)]);
  } });

  // ---- frost
  function shard(p, x, y, a, len, wdt) { const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
    p.poly([[x + c * len, y + s * len], [x + nx * wdt, y + ny * wdt], [x - c * len * 0.35, y - s * len * 0.35], [x - nx * wdt, y - ny * wdt]], PAL.frost[2]);
    p.poly([[x + c * len, y + s * len], [x + nx * wdt, y + ny * wdt], [x, y]], PAL.frost[3]); p.line(x, y, x + c * len * 0.8, y + s * len * 0.8, PAL.frost[4]); }
  def('v_frostburst', { w: 52, h: 52, ax: 26, ay: 30, n: 9, draw(p, k, i) {
    const r = rng(1500), R = 3 + 20 * ease(k); p.blob(26, 28, 8 + 12 * k, 0.9 * (1 - k)); p.mul((x, y) => 0.5 + fbm(x * 0.2, y * 0.2 + k, 81)); p.paint(PAL.frost, 0.2, 1, 150);
    for (let s = 0; s < 9; s++) { const a = s / 9 * TAU + r() * 0.4, d = R * (0.7 + r() * 0.4); if (k < 0.9) shard(p, 26 + Math.cos(a) * d, 28 + Math.sin(a) * d * 0.8, a, 4 + 3 * (1 - k), 1.6); }
    p.outline([12, 30, 60], 220);
    for (let s = 0; s < 10; s++) { const a = r() * TAU, d = R * (0.5 + r()); p.dot(26 + Math.cos(a) * d, 28 + Math.sin(a) * d * 0.8 + k * 6, PAL.frost[4]); }
  } });
  def('v_icespikes', { w: 56, h: 44, ax: 28, ay: 36, n: 10, draw(p, k) { // ice bursting from the ground
    const r = rng(1600), up = ease(cl(k / 0.3)), gone = cl((k - 0.65) / 0.35);
    p.disc(28, 36, 22, [40, 90, 140], Math.round(150 * (1 - gone)), 0.38);
    const spikes = []; for (let s = 0; s < 7; s++) spikes.push({ x: 8 + s * 6.6 + (r() - 0.5) * 3, h: (8 + r() * 18) * (1 - Math.abs(s - 3) / 5), lean: (r() - 0.5) * 0.5 });
    spikes.sort((a, b) => b.h - a.h);
    for (const s of spikes) { const h = s.h * up * (1 - gone * 0.6), w = 3, top = [s.x + s.lean * h, 36 - h]; if (h < 1) continue; const dy = gone * 6;
      p.poly([[s.x - w, 37 + dy], top.map((v, q) => v + (q ? dy : 0)), [s.x + w, 37 + dy]], PAL.frost[2]); p.poly([[s.x - w, 37 + dy], [top[0], top[1] + dy], [s.x, 37 + dy]], PAL.frost[3]); p.line(top[0], top[1] + dy, s.x - 1, 35 + dy, PAL.frost[4]); }
    p.outline([12, 30, 60], 230);
  } });
  def('v_shard', { w: 20, h: 8, ax: 16, ay: 4, n: 4, loop: true, draw(p, k) { p.blob(6, 4, 4, 0.7); p.paint(PAL.frost, 0.2, 1, 140); shard(p, 9, 4, 0, 9, 2.4); p.outline([12, 30, 60], 230); if (k > 0.5) p.dot(17, 3, PAL.frost[4]); } });

  // ---- poison
  def('v_poison', { w: 44, h: 36, ax: 22, ay: 28, n: 9, draw(p, k, i) {
    const r = rng(1700); p.blob(22, 28, 9 + 9 * ease(k), 0.9 * (1 - k * 0.8), 0.45); p.mul((x, y) => 0.5 + fbm(x * 0.3, y * 0.3 + k * 2, 91)); p.paint(PAL.poison, 0.18, 1, 190);
    for (let s = 0; s < 10; s++) { const a = -Math.PI * (0.1 + r() * 0.8), sp = 12 + r() * 14, t = k * 1.1, x = 22 + Math.cos(a) * sp * t, y = 26 + Math.sin(a) * sp * t * 1.3 + 30 * t * t; if (y < 34) { p.disc(x, y, 1.4, PAL.poison[3]); p.dot(x - 0.5, y - 0.8, PAL.poison[4]); } }
    for (let s = 0; s < 4; s++) { const ph = cl(k * 1.6 - s * 0.2), x = 14 + s * 5.5, y = 28 - ph * 12; if (ph > 0 && ph < 1) { p.disc(x, y, 1.6, PAL.poison[2]); p.dot(x, y - 1, PAL.poison[4]); } }
    p.outline([10, 22, 6], 200);
  } });
  def('v_venom', { w: 20, h: 12, ax: 15, ay: 6, n: 6, loop: true, draw(p, k) { for (let s = 0; s < 7; s++) { const t = s / 6; p.blob(15 - t * 14, 6 + Math.sin(k * TAU + s) * t * 2, 4.5 - t * 3, 1 - t * 0.55); } p.paint(PAL.poison, 0.15); p.dot(16, 5, PAL.poison[4]); } });

  // ---- steel: cuts, the whirlwind, the charge
  const crescent = (p, cx, cy, R, a0, a1, th, pal, fade, sq) => {
    for (let s = 0; s <= 50; s++) { const t = s / 50, a = lerp(a0, a1, t), w = th * Math.sin(t * Math.PI) * (0.4 + 0.6 * t); p.blob(cx + Math.cos(a) * R, cy + Math.sin(a) * R * (sq || 1), Math.max(0.8, w), (0.4 + 0.8 * t) * fade); }
    p.paint(pal, 0.2, 1.15, 220); p.outline([28, 34, 52], 150); // a dark rim, so a white cut still reads on snow
  };
  def('v_slash', { w: 48, h: 48, ax: 24, ay: 26, n: 6, draw(p, k) { const sw = ease(cl(k / 0.5)), fade = 1 - cl((k - 0.4) / 0.6); crescent(p, 24, 26, 16, -2.2, -2.2 + 3 * sw, 3.2, PAL.steel, fade, 0.85); } });
  def('v_cleave', { w: 70, h: 70, ax: 35, ay: 38, n: 7, draw(p, k) { const sw = ease(cl(k / 0.5)), fade = 1 - cl((k - 0.4) / 0.6); crescent(p, 35, 38, 25, -2.4, -2.4 + 3.6 * sw, 5, [PAL.blood[2], PAL.fire[4], PAL.gold[3], [255, 255, 255]], fade, 0.8); } });
  def('v_spin', { w: 100, h: 56, ax: 50, ay: 32, n: 8, draw(p, k, i) { // a ring of cuts around the hero, on the ground
    const fade = 1 - cl((k - 0.55) / 0.45), a0 = k * TAU * 1.6; for (let s = 0; s <= 60; s++) { const t = s / 60, a = a0 + t * 4.2; p.blob(50 + Math.cos(a) * 38, 30 + Math.sin(a) * 19, 1.5 + 2.5 * t, (0.3 + 0.9 * t) * fade); }
    p.paint(PAL.steel, 0.2, 1.1, 210); p.outline([28, 34, 52], 140); const r = rng(1800 + i); for (let s = 0; s < 10; s++) { const a = r() * TAU, d = 30 + r() * 14; if (fade > 0.3) p.dot(50 + Math.cos(a) * d, 30 + Math.sin(a) * d * 0.5, PAL.dust[2 + (s % 2)]); }
  } });
  def('v_impale', { w: 104, h: 28, ax: 0, ay: 14, n: 8, draw(p, k, i) { // the lancer's charge, along +x
    const r = rng(1900 + i), fade = 1 - cl((k - 0.3) / 0.7);
    for (let s = 0; s < 9; s++) { const y = 14 + (r() - 0.5) * 18, x0 = r() * 40 + k * 30, len = 30 + r() * 40; p.line(x0, y, Math.min(103, x0 + len * fade), y, s % 3 ? PAL.steel[1] : PAL.steel[2], Math.round(220 * fade)); }
    p.seg(10 + k * 40, 14, 100, 14, 3, 1.2 * fade); p.paint([PAL.steel[1], PAL.steel[2], [255, 255, 255]], 0.2, 1, 200); p.line(60 + k * 30, 14, 103, 14, [255, 255, 255], Math.round(255 * fade));
  } });
  def('v_spark', { w: 24, h: 24, ax: 12, ay: 12, n: 5, draw(p, k) { // a blow landing
    const L = Math.round(10 * (1 - k * 0.6)), c = k < 0.4 ? [255, 255, 255] : PAL.gold[3]; if (k < 0.3) p.disc(12, 12, 3.5 - k * 6, [255, 248, 220]);
    p.line(12 - L, 12, 12 + L, 12, c); p.line(12, 12 - L, 12, 12 + L, c); const d = Math.round(L * 0.55); p.line(12 - d, 12 - d, 12 + d, 12 + d, PAL.gold[2]); p.line(12 - d, 12 + d, 12 + d, 12 - d, PAL.gold[2]); p.outline([60, 36, 10], 170);
  } });

  // ---- the ground: slams, war cries, dust
  def('v_slam', { w: 116, h: 64, ax: 58, ay: 36, n: 11, draw(p, k, i) {
    const r = rng(2000), R = 6 + 46 * ease(k);
    p.ring(58, 36, R, 5, 1 - k, 0.48); p.mul((x, y) => 0.6 + fbm(x * 0.15, y * 0.3, 101) * 0.8); p.paint(PAL.dust, 0.16, 1.1, 180);
    const cr = Math.round(240 * (1 - cl((k - 0.5) / 0.5))); if (cr > 10) for (let s = 0; s < 9; s++) { const a = s / 9 * TAU + r() * 0.3; let x = 58, y = 36; const n = 4; for (let t = 0; t < n; t++) { const d = 4 + r() * 4 * Math.min(1, k * 4), nx = x + Math.cos(a + (r() - 0.5) * 0.7) * d, ny = y + Math.sin(a + (r() - 0.5) * 0.7) * d * 0.48; p.line(x, y, nx, ny, [30, 22, 16], cr); x = nx; y = ny; } }
    const r2 = rng(2100); for (let s = 0; s < 12; s++) { const a = r2() * TAU, sp = 18 + r2() * 30, t = k, x = 58 + Math.cos(a) * sp * t, y = 36 + Math.sin(a) * sp * t * 0.48 - (40 * t - 60 * t * t) * (0.5 + r2()); if (t > 0.04 && t < 0.8) { p.disc(x, y, 1.4, PAL.rock[2]); p.dot(x - 0.5, y - 0.5, PAL.rock[3]); } }
  } });
  def('v_warcry', { w: 76, h: 76, ax: 38, ay: 44, n: 9, draw(p, k, i) {
    for (let s = 0; s < 3; s++) { const q = cl(k * 1.4 - s * 0.2); if (q > 0 && q < 1) p.ring(38, 44, 6 + 30 * q, 2.6, 1 - q, 0.55); } p.paint([PAL.blood[2], PAL.fire[3], PAL.gold[3], [255, 250, 220]], 0.16, 1.1, 200);
    for (let s = 0; s < 12; s++) { const a = s / 12 * TAU + 0.15, d0 = 10 + 18 * k, d1 = d0 + 8; if (k < 0.8) p.line(38 + Math.cos(a) * d0, 44 + Math.sin(a) * d0 * 0.7, 38 + Math.cos(a) * d1, 44 + Math.sin(a) * d1 * 0.7, s % 2 ? PAL.gold[3] : PAL.blood[3]); }
  } });
  def('v_dust', { w: 34, h: 22, ax: 17, ay: 16, n: 7, draw(p, k) { // a kicked-up puff (dodges, dashes, landings)
    const r = rng(2200); for (let s = 0; s < 6; s++) { const a = r() * Math.PI + Math.PI, d = 3 + 9 * ease(k) * (0.5 + r() * 0.6); p.blob(17 + Math.cos(a) * d * 1.3, 16 + Math.sin(a) * d * 0.6 - k * 3, 4 + 3 * k, 0.9 * (1 - k)); }
    p.mul((x, y) => 0.6 + fbm(x * 0.3, y * 0.3, 111) * 0.7); p.paint(PAL.dust, 0.16, 1, 170);
  } });
  def('v_wall', { w: 60, h: 60, ax: 30, ay: 46, n: 10, draw(p, k, i) { // Shield Wall: a dome of steel light rising round the hero
    const up = ease(cl(k / 0.35)), fade = 1 - cl((k - 0.6) / 0.4), cx = 30, cy = 46;
    for (let j = 0; j < 60; j++) for (let x = 0; x < 60; x++) { const dx = (x + 0.5 - cx) / 26, dy = (j + 0.5 - cy) / (34 * up + 0.01); if (j > cy + 4) continue; const d = Math.sqrt(dx * dx + dy * dy); if (d > 1.05) continue;
      const rim = cl(1 - Math.abs(d - 1) / 0.13), plate = Math.abs(Math.sin(Math.atan2(dy, dx) * 6)) < 0.18 ? 0.35 : 0; p.f[j * 60 + x] = (rim + plate * (d < 1 ? 1 : 0)) * fade; }
    p.ring(cx, cy, 26, 2.5, 0.9 * fade, 0.4); p.paint([[40, 70, 120], [90, 150, 210], [170, 220, 255], [240, 252, 255]], 0.2, 1, 160);
  } });
  def('v_arrow', { w: 18, h: 5, ax: 16, ay: 2, n: 1, draw(p) { p.line(3, 2, 14, 2, PAL.wood[2]); p.line(3, 3, 13, 3, PAL.wood[1]); p.poly([[14, 0], [18, 2.5], [14, 5]], PAL.steel[2]); p.dot(15, 2, [255, 255, 255]); p.line(0, 0, 3, 2, [220, 214, 200]); p.line(0, 4, 3, 3, [190, 180, 168]); p.dot(1, 2, [240, 236, 226]); } });

  window.VFX = V;
  // draws every frame of one effect; returns [{canvas, ...}]
  window.vfxFrames = function (key) {
    const e = V[key], out = [];
    for (let i = 0; i < e.n; i++) { const p = new Px(e.w, e.h), k = e.n === 1 ? 0 : e.loop ? i / e.n : i / (e.n - 1); e.draw(p, k, i, rng(i + 1)); const c = document.createElement('canvas'); c.width = e.w; c.height = e.h; c.getContext('2d').putImageData(new ImageData(p.d, e.w, e.h), 0, 0); out.push(c); }
    return out;
  };
})();
