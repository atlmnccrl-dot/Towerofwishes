'use strict';
// HOLLOWLANDS — every picture in the game is drawn here, from code, at boot.
// Palette taken from the reference's mood: ash-white ground, stone greys, charcoal, one red accent.
const P = (HL.P = {
  ash0: '#d8d3ca', ash1: '#c6c0b7', ash2: '#b1aba2', ash3: '#9a948c', ash4: '#837d76',
  st0: '#a69a97', st1: '#8a7e7e', st2: '#6b6061', st3: '#524848',
  ch0: '#463e3f', ch1: '#332c2d', ink: '#221d1e', void: '#120f10',
  ui: '#2b2727', ui2: '#3a3434', cream: '#ece4d1', cream2: '#bfb6a3', cream3: '#8d8678',
  tan0: '#d0a578', tan1: '#a8754e', tan2: '#6e4732',
  red0: '#c4473f', red1: '#94322e', red2: '#5f1f1f', red3: '#3b1516',
  mo0: '#878a7c', mo1: '#686c60', mo2: '#4b4f46', mo3: '#33362f',
  wa0: '#6a7276', wa1: '#4e555a', wa2: '#3a4044',
  wd0: '#8d7664', wd1: '#665445', wd2: '#463a30',
  lt0: '#f6e9c2', lt1: '#e7c98d', fire: '#e99a4c', rust: '#8c5f40', bronze: '#8f7a5a', bronze2: '#5f503b',
});

function pen(c) {
  const g = c.g;
  const o = {
    g,
    p(x, y, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); },
    r(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, w | 0, h | 0); },
    line(x0, y0, x1, y1, col) {
      x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      g.fillStyle = col;
      for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    },
    disc(cx, cy, rx, ry, col) {
      ry = ry || rx; g.fillStyle = col;
      for (let y = -Math.ceil(ry); y <= ry; y++) for (let x = -Math.ceil(rx); x <= rx; x++)
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) g.fillRect((cx + x) | 0, (cy + y) | 0, 1, 1);
    },
    // ramp-shaded, dithered fill of a shape. f(x,y) returns shade 0..1 or <0 for empty
    shade(x0, y0, w, h, ramp, f) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = f(x, y); if (v < 0) continue;
        const i = HL.clamp(Math.floor(v * (ramp.length - 1) + HL.bayer(x0 + x, y0 + y)), 0, ramp.length - 1);
        g.fillStyle = ramp[i]; g.fillRect(x0 + x, y0 + y, 1, 1);
      }
    },
  };
  return o;
}
HL.pen = pen;

const ART = (HL.ART = { spr: {}, icons: {} });
function spr(name, w, h, ox, oy, draw) {
  const c = HL.canvas(w, h);
  draw(pen(c), w, h);
  ART.spr[name] = { c, ox, oy, w, h };
  return ART.spr[name];
}

// ------------------------------------------------------------------ trees
function canopy(name, seed, R, ramp, opts = {}) {
  const rnd = HL.rng(seed);
  const blobs = [{ x: 0, y: 0, r: R }];
  const n = 4 + ((rnd() * 4) | 0);
  for (let i = 0; i < n; i++) { const a = rnd() * HL.TAU, d = R * (0.35 + rnd() * 0.4); blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.85, r: R * (0.45 + rnd() * 0.3) }); }
  const W = R * 2 + 8, H = R * 2 + 10;
  return spr(name, W, H, W / 2, H - 2, (pe) => {
    const cx = W / 2, cy = H / 2 - 2;
    pe.r(cx - 1, H - 5, 2, 3, P.ch1); // trunk foot
    pe.shade(0, 0, W, H, ramp, (x, y) => {
      let best = -1;
      for (const b of blobs) {
        const dx = x - cx - b.x, dy = y - cy - b.y, d = (dx * dx + dy * dy) / (b.r * b.r);
        if (d < 1) {
          const hgt = Math.sqrt(1 - d);
          const lit = HL.clamp(0.5 + (-(dx / b.r) * 0.35 - (dy / b.r) * 0.45), 0, 1);
          best = Math.max(best, hgt * 0.45 + lit * 0.55);
        }
      }
      if (best < 0) return -1;
      const leaf = HL.vnoise(x * 0.7, y * 0.7, seed) * 0.35 - 0.12;
      return HL.clamp(best + leaf, 0, 1);
    });
    if (opts.speck) for (let i = 0; i < R * 2; i++) { const a = rnd() * HL.TAU, d = rnd() * R * 0.8; pe.p(cx + Math.cos(a) * d - R * 0.2, cy + Math.sin(a) * d - R * 0.3, opts.speck); }
  });
}
function deadTree(name, seed, H) {
  const rnd = HL.rng(seed);
  return spr(name, 26, H + 4, 13, H + 2, (pe) => {
    const bx = 13, by = H + 1;
    pe.r(bx - 1, by - H * 0.45, 3, H * 0.45, P.ch0);
    pe.r(bx - 1, by - H * 0.45, 1, H * 0.45, P.st2);
    const branch = (x, y, a, len, depth) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      pe.line(x, y, x2, y2, depth > 1 ? P.ch0 : P.ch1);
      if (depth > 0) for (let i = 0; i < 2; i++) branch(x2, y2, a + (rnd() - 0.5) * 1.4, len * (0.55 + rnd() * 0.2), depth - 1);
    };
    for (let i = 0; i < 3; i++) branch(bx, by - H * 0.42, -Math.PI / 2 + (i - 1) * 0.7 + (rnd() - 0.5) * 0.3, H * 0.32, 3);
  });
}

// ------------------------------------------------------------------ props
function buildProps() {
  const ramps = {
    pine: [P.mo3, P.mo2, P.mo1, P.mo0],
    dark: [P.ink, P.mo3, P.mo2, P.mo1],
    ash: [P.ink, P.ch1, '#6f6b63', P.ash4],
  };
  for (let i = 0; i < 6; i++) canopy('tree' + i, 101 + i * 13, 9 + (i % 3) * 2, i % 2 ? ramps.pine : ramps.dark);
  for (let i = 0; i < 2; i++) canopy('treeA' + i, 301 + i * 7, 10 + i * 2, ramps.ash);
  for (let i = 0; i < 3; i++) deadTree('dead' + i, 501 + i * 31, 18 + i * 4);
  canopy('bush0', 71, 4, ramps.dark); canopy('bush1', 77, 5, ramps.pine);

  spr('rock0', 12, 9, 6, 7, (pe) => pe.shade(0, 0, 12, 9, [P.st3, P.st2, P.st1, P.st0, P.ash3], (x, y) => { const d = ((x - 6) ** 2) / 30 + ((y - 4.5) ** 2) / 14; return d < 1 ? HL.clamp(0.9 - d * 0.4 - (x - 6) * 0.05 - (y - 4) * 0.08, 0, 1) : -1; }));
  spr('rock1', 7, 6, 3, 5, (pe) => pe.shade(0, 0, 7, 6, [P.st3, P.st2, P.st1, P.st0], (x, y) => { const d = ((x - 3) ** 2) / 10 + ((y - 3) ** 2) / 7; return d < 1 ? HL.clamp(0.9 - d * 0.5 - (x - 3) * 0.06 - (y - 3) * 0.1, 0, 1) : -1; }));
  spr('rubble', 14, 8, 7, 6, (pe) => { const r = HL.rng(9); for (let i = 0; i < 9; i++) { const x = r() * 11, y = 2 + r() * 5, w = 2 + r() * 3; pe.r(x, y, w, 2, [P.st1, P.st2, P.ash3][i % 3]); pe.r(x, y + 2, w, 1, P.ch1); } });

  spr('cart', 26, 16, 13, 13, (pe) => {
    pe.r(3, 3, 18, 8, P.wd1); for (let x = 3; x < 21; x += 3) pe.r(x, 3, 1, 8, P.wd2);
    pe.r(3, 3, 18, 1, P.wd0); pe.r(5, 11, 14, 2, P.ch1);
    pe.line(21, 6, 25, 4, P.wd1); pe.line(21, 9, 25, 10, P.wd1); // shafts
    pe.disc(5, 12, 3, 3, P.wd2); pe.disc(5, 12, 1.5, 1.5, P.wd1); pe.p(5, 12, P.ink);
    pe.line(14, 13, 19, 15, P.wd2); pe.line(15, 15, 18, 12, P.wd2); // broken wheel on the ground
    pe.r(8, 1, 6, 3, P.cream3); pe.r(8, 1, 6, 1, P.cream2); // cloth sack
  });
  spr('barrel', 7, 9, 3, 8, (pe) => { pe.r(0, 1, 7, 7, P.wd1); pe.r(1, 0, 5, 9, P.wd1); pe.r(0, 1, 2, 7, P.wd0); pe.r(5, 1, 2, 7, P.wd2); pe.r(0, 2, 7, 1, P.ch1); pe.r(0, 6, 7, 1, P.ch1); pe.r(1, 0, 5, 1, P.wd0); });
  spr('crate', 8, 8, 4, 7, (pe) => { pe.r(0, 0, 8, 8, P.wd1); pe.r(0, 0, 8, 1, P.wd0); pe.r(0, 7, 8, 1, P.wd2); pe.line(0, 0, 7, 7, P.wd2); pe.r(0, 0, 1, 8, P.wd0); pe.r(7, 0, 1, 8, P.wd2); });
  spr('crateOpen', 8, 8, 4, 7, (pe) => { pe.r(0, 1, 8, 7, P.wd2); pe.r(1, 2, 6, 5, P.ink); pe.r(0, 7, 8, 1, P.wd1); pe.line(9, 2, 6, 0, P.wd1); });
  spr('chest', 10, 8, 5, 7, (pe) => { pe.r(0, 1, 10, 7, P.wd1); pe.r(0, 1, 10, 3, P.wd0); pe.r(0, 4, 10, 1, P.ch1); pe.r(2, 1, 1, 7, P.st2); pe.r(7, 1, 1, 7, P.st2); pe.r(4, 4, 2, 2, P.cream2); pe.r(1, 0, 8, 1, P.wd0); });
  spr('chestOpen', 10, 9, 5, 8, (pe) => { pe.r(0, 0, 10, 3, P.wd2); pe.r(0, 3, 10, 6, P.wd1); pe.r(1, 3, 8, 3, P.ink); pe.r(2, 3, 1, 6, P.st2); pe.r(7, 3, 1, 6, P.st2); });
  spr('urn', 6, 8, 3, 7, (pe) => { pe.r(1, 0, 4, 1, P.st2); pe.r(0, 2, 6, 5, P.st1); pe.r(0, 2, 2, 5, P.st0); pe.r(1, 7, 4, 1, P.st3); pe.r(2, 1, 2, 1, P.st3); });
  spr('urnBroken', 7, 5, 3, 4, (pe) => { pe.r(0, 2, 3, 3, P.st1); pe.r(4, 3, 3, 2, P.st2); pe.p(3, 1, P.st0); });
  spr('corpse', 12, 6, 6, 4, (pe) => { pe.r(1, 1, 8, 3, P.ch0); pe.r(1, 1, 8, 1, P.st2); pe.r(9, 1, 3, 3, P.cream3); pe.p(10, 2, P.ink); pe.r(0, 4, 5, 1, P.red2); pe.r(3, 0, 3, 1, P.wd1); });
  spr('corpseOpen', 12, 6, 6, 4, (pe) => { pe.r(1, 1, 8, 3, P.ch1); pe.r(9, 1, 3, 3, P.cream3); pe.p(10, 2, P.ink); pe.r(0, 4, 5, 1, P.red2); });
  spr('bones', 10, 5, 5, 3, (pe) => { pe.line(0, 3, 6, 1, P.ash1); pe.line(3, 4, 9, 3, P.ash2); pe.r(6, 0, 3, 3, P.ash1); pe.p(7, 1, P.ink); });
  spr('well', 18, 22, 9, 17, (pe) => {
    pe.disc(9, 14, 8, 6, P.st2); pe.disc(9, 13, 8, 6, P.st0); pe.disc(9, 13, 5.5, 4, P.ch1); pe.disc(9, 13, 4, 3, P.wa2);
    for (let a = 0; a < 12; a++) { const x = 9 + Math.cos(a / 12 * HL.TAU) * 7, y = 13 + Math.sin(a / 12 * HL.TAU) * 5; pe.p(x, y, P.st2); }
    pe.r(1, 2, 2, 12, P.wd1); pe.r(15, 2, 2, 12, P.wd2); pe.r(1, 3, 16, 2, P.wd0); pe.r(1, 4, 16, 1, P.wd2);
    pe.line(9, 5, 9, 11, P.cream3);
  });
  spr('wellBucket', 18, 22, 9, 17, (pe) => {
    pe.g.drawImage(ART.spr.well.c, 0, 0);
    pe.r(7, 7, 5, 4, P.wd1); pe.r(7, 7, 5, 1, P.wd0); pe.r(16, 5, 2, 2, P.st1);
  });
  spr('fireRing', 11, 6, 5, 4, (pe) => { for (let a = 0; a < 8; a++) pe.r(5 + Math.cos(a / 8 * HL.TAU) * 4, 3 + Math.sin(a / 8 * HL.TAU) * 2, 2, 2, a % 2 ? P.st2 : P.st1); pe.r(3, 2, 5, 2, P.ch1); pe.line(3, 2, 7, 3, P.wd2); });
  ['grave0', 'grave1', 'grave2'].forEach((n, i) => spr(n, 7, 10, 3, 9, (pe) => {
    if (i === 0) { pe.r(1, 1, 5, 8, P.st1); pe.r(2, 0, 3, 1, P.st1); pe.r(1, 1, 1, 8, P.st0); pe.r(5, 1, 1, 8, P.st2); pe.r(2, 3, 3, 1, P.st3); }
    else if (i === 1) { pe.r(3, 0, 1, 9, P.st1); pe.r(1, 2, 5, 1, P.st1); pe.p(4, 0, P.st2); }
    else { pe.r(0, 4, 7, 5, P.st2); pe.r(0, 4, 7, 1, P.st0); pe.line(2, 5, 4, 8, P.st3); }
    pe.r(0, 9, 7, 1, P.ch1);
  }));
  spr('mound', 10, 5, 5, 3, (pe) => { pe.disc(5, 2, 5, 2, P.ash4); pe.disc(5, 2, 3, 1, P.st2); });
  spr('fenceH', 9, 6, 4, 5, (pe) => { pe.r(0, 0, 1, 6, P.wd2); pe.r(8, 0, 1, 6, P.wd2); pe.r(0, 1, 9, 1, P.wd1); pe.r(0, 3, 9, 1, P.wd1); });
  spr('fenceB', 9, 6, 4, 5, (pe) => { pe.r(0, 0, 1, 6, P.wd2); pe.r(0, 1, 4, 1, P.wd1); pe.line(4, 3, 8, 5, P.wd1); });
  spr('fenceV', 3, 10, 1, 9, (pe) => { pe.r(1, 0, 1, 10, P.wd2); pe.r(0, 0, 1, 10, P.wd1); });
  spr('anvil', 9, 7, 4, 6, (pe) => { pe.r(0, 0, 9, 2, P.st2); pe.r(0, 0, 9, 1, P.st0); pe.r(3, 2, 3, 3, P.st3); pe.r(1, 5, 7, 2, P.ch1); });
  spr('forge', 14, 14, 7, 12, (pe) => { pe.r(0, 3, 14, 10, P.st2); pe.r(0, 3, 14, 1, P.st0); pe.r(3, 7, 8, 4, P.ink); pe.r(4, 9, 6, 2, P.red2); pe.r(5, 0, 4, 4, P.st3); });
  spr('wayStone', 7, 12, 3, 11, (pe) => { pe.r(1, 1, 5, 10, P.st1); pe.r(2, 0, 3, 1, P.st1); pe.r(1, 1, 1, 10, P.st0); pe.r(5, 1, 1, 10, P.st2); pe.r(0, 11, 7, 1, P.ch1); });
  spr('standStone', 9, 18, 4, 17, (pe) => { pe.shade(0, 0, 9, 18, [P.st3, P.st2, P.st1, P.st0], (x, y) => (x > 0 && x < 8 && y > 0 && y < 17 && !(y < 2 && (x < 2 || x > 6))) ? HL.clamp(0.8 - x * 0.08 - y * 0.015 + HL.vnoise(x, y * 0.5, 4) * 0.25, 0, 1) : -1); pe.r(0, 17, 9, 1, P.ch1); });
  spr('log', 26, 8, 13, 6, (pe) => { pe.r(1, 1, 23, 5, P.wd1); pe.r(1, 1, 23, 1, P.wd0); pe.r(1, 5, 23, 1, P.wd2); pe.disc(23, 3, 2, 2.5, P.wd0); pe.p(23, 3, P.wd2); pe.line(6, 2, 10, 3, P.wd2); pe.line(14, 4, 18, 3, P.wd2); pe.r(0, 6, 25, 1, P.ch1); });
  spr('stump', 8, 6, 4, 4, (pe) => { pe.disc(4, 3, 3.5, 2.5, P.wd1); pe.disc(4, 2, 3, 2, P.wd0); pe.p(4, 2, P.wd2); });
  spr('leanTo', 20, 16, 10, 13, (pe) => { pe.r(1, 2, 1, 12, P.wd2); pe.r(18, 2, 1, 12, P.wd2); pe.r(0, 0, 20, 8, P.cream3); for (let x = 0; x < 20; x += 3) pe.r(x, 0, 1, 8, P.ash4); pe.r(0, 7, 20, 1, P.st3); pe.r(2, 11, 6, 3, P.wd1); });
  spr('table', 12, 8, 6, 7, (pe) => { pe.r(0, 0, 12, 5, P.wd0); pe.r(0, 4, 12, 1, P.wd2); pe.r(1, 5, 1, 3, P.wd2); pe.r(10, 5, 1, 3, P.wd2); pe.r(3, 1, 2, 2, P.cream3); });
  spr('bed', 8, 13, 4, 12, (pe) => { pe.r(0, 0, 8, 13, P.wd1); pe.r(1, 1, 6, 3, P.cream2); pe.r(1, 4, 6, 8, P.st2); pe.r(1, 4, 6, 1, P.st3); });
  spr('shelf', 12, 9, 6, 8, (pe) => { pe.r(0, 0, 12, 9, P.wd2); pe.r(1, 1, 10, 3, P.ink); pe.r(1, 5, 10, 3, P.ink); pe.r(2, 2, 2, 2, P.cream3); pe.r(6, 1, 1, 3, P.tan1); pe.r(3, 5, 3, 3, P.st1); });
  spr('brazier', 7, 9, 3, 8, (pe) => { pe.r(0, 0, 7, 3, P.st3); pe.r(1, 1, 5, 1, P.ink); pe.r(3, 3, 1, 5, P.ch0); pe.r(1, 8, 5, 1, P.ch1); });
  spr('pillar', 10, 24, 5, 21, (pe) => { pe.shade(1, 2, 8, 20, [P.ch1, P.st3, P.st2, P.st1], (x) => HL.clamp(0.85 - x * 0.1, 0, 1)); pe.r(0, 0, 10, 3, P.st1); pe.r(0, 0, 10, 1, P.st0); pe.r(0, 21, 10, 3, P.st3); });
  const bell = (n, w, h, tone) => spr(n, w + 6, h + 9, (w + 6) / 2, h + 8, (pe) => {
    const W = w + 6; pe.r(0, 0, W, 2, P.wd1); pe.r(0, 0, 1, h + 9, P.wd2); pe.r(W - 1, 0, 1, h + 9, P.wd2);
    pe.r(W / 2, 2, 1, 2, P.ch1);
    pe.shade(3, 4, w, h, [P.bronze2, P.bronze, tone], (x, y) => { const half = (w / 2) * (0.55 + 0.45 * (y / h)); return Math.abs(x - w / 2 + 0.5) <= half ? HL.clamp(0.8 - (x / w) * 0.6, 0, 1) : -1; });
    pe.r(3, h + 3, w, 1, P.bronze2);
  });
  bell('bellS', 5, 5, '#b9a57e'); bell('bellM', 7, 7, '#ad9872'); bell('bellL', 9, 9, '#a08b66');
  spr('bigBell', 22, 18, 11, 14, (pe) => {
    pe.shade(0, 0, 22, 18, [P.bronze2, P.bronze, '#a5916b', P.st1], (x, y) => { const d = ((x - 11) ** 2) / 100 + ((y - 9) ** 2) / 64; return d < 1 ? HL.clamp(0.85 - (x - 11) * 0.04 - (y - 9) * 0.04 + HL.vnoise(x * 0.6, y * 0.6, 3) * 0.2, 0, 1) : -1; });
    pe.disc(11, 9, 6, 4, P.ink); pe.line(14, 2, 10, 8, P.ch1); pe.r(0, 16, 22, 2, P.ash4);
  });
  spr('resonator', 10, 22, 5, 20, (pe) => { pe.r(2, 4, 6, 16, P.st2); pe.r(2, 4, 2, 16, P.st1); pe.r(7, 4, 1, 16, P.st3); pe.disc(5, 4, 4, 3, P.bronze); pe.disc(5, 4, 2, 1.5, P.bronze2); pe.r(1, 20, 8, 2, P.ch1); });
  spr('crank', 11, 12, 5, 11, (pe) => { pe.r(4, 4, 3, 8, P.st3); pe.disc(5, 5, 5, 5, P.st2); pe.disc(5, 5, 3, 3, P.ch1); pe.line(5, 0, 5, 10, P.st1); pe.line(0, 5, 10, 5, P.st1); pe.r(4, 4, 3, 3, P.st0); });
  spr('stairsDown', 16, 12, 8, 11, (pe) => { for (let i = 0; i < 4; i++) { pe.r(i, i * 3, 16 - i * 2, 3, [P.st2, P.st3, P.ch1, P.ink][i]); } pe.r(0, 0, 16, 1, P.st1); });
  spr('stairsUp', 16, 12, 8, 11, (pe) => { for (let i = 0; i < 4; i++) { pe.r(3 - i, i * 3, 10 + i * 2, 3, [P.ink, P.ch1, P.st3, P.st2][i]); } });
  spr('lamp', 5, 18, 2, 17, (pe) => { pe.r(2, 2, 1, 16, P.ch0); pe.r(0, 0, 5, 3, P.ch1); pe.r(1, 1, 3, 1, P.st3); });
  spr('roots', 32, 30, 16, 28, (pe) => {
    const r = HL.rng(77);
    for (let i = 0; i < 26; i++) { let x = 2 + r() * 28, y = 28; for (let s = 0; s < 14; s++) { const nx = x + (r() - 0.5) * 4, ny = y - 2; pe.line(x, y, nx, ny, i % 3 ? P.mo3 : P.wd2); x = HL.clamp(nx, 0, 31); y = ny; } }
    pe.p(12, 14, P.red1); pe.p(19, 9, P.red1); pe.p(25, 16, P.red1);
  });
  spr('rootsGone', 32, 6, 16, 4, (pe) => { const r = HL.rng(78); for (let i = 0; i < 14; i++) pe.line(r() * 32, 5, r() * 32, 2 + r() * 2, P.mo3); });
  spr('scratch', 10, 6, 5, 5, (pe) => { pe.r(0, 0, 10, 6, P.st2); pe.r(0, 0, 10, 1, P.st1); for (let i = 1; i < 9; i += 2) pe.line(i, 1, i + 1, 4, P.ink); });
  spr('tent', 22, 16, 11, 14, (pe) => { for (let y = 0; y < 14; y++) { const w = 4 + y * 1.3; pe.r(11 - w / 2, y, w, 1, y % 3 ? P.cream3 : P.ash4); } pe.r(9, 8, 4, 6, P.ink); pe.r(0, 14, 22, 1, P.ch1); });
  spr('gateBars', 16, 14, 8, 13, (pe) => { pe.r(0, 0, 16, 2, P.st3); for (let x = 1; x < 16; x += 3) pe.r(x, 2, 1, 12, P.st1); pe.r(0, 7, 16, 1, P.st2); });
  spr('doorIron', 16, 14, 8, 13, (pe) => { pe.r(0, 0, 16, 14, P.st3); pe.r(1, 1, 14, 13, P.ch0); for (let x = 3; x < 15; x += 4) pe.r(x, 1, 1, 13, P.st2); pe.r(1, 5, 14, 1, P.st2); pe.r(7, 7, 2, 2, P.cream2); });
  spr('doorVault', 16, 14, 8, 13, (pe) => { pe.r(0, 0, 16, 14, P.st2); pe.r(1, 1, 14, 13, P.st3); pe.disc(8, 7, 4, 4, P.bronze2); pe.disc(8, 7, 2, 2, P.bronze); for (let i = 0; i < 3; i++) pe.p(4 + i * 4, 2, P.cream3); });
  spr('pedestal', 10, 12, 5, 11, (pe) => { pe.r(1, 3, 8, 8, P.st2); pe.r(1, 3, 8, 1, P.st0); pe.r(0, 0, 10, 3, P.st1); pe.r(0, 11, 10, 1, P.ch1); });
}

// ------------------------------------------------------------------ the tower (the landmark from the reference)
function buildTower() {
  const R = 30, HT = 190, W = R * 2 + 6, H = HT + 16;
  for (const lit of [false, true]) spr(lit ? 'towerLit' : 'tower', W, H, W / 2, H - 8, (pe) => {
    const cx = W / 2, baseY = H - 10;
    for (let x = -R; x <= R; x++) {
      const nx = x / R, curve = Math.sqrt(1 - nx * nx);
      const top = 8 + Math.round(curve * 4 + (HL.hash(x + 40, 1, 5) < 0.4 ? 3 : 0) + (Math.abs(x) % 10 < 4 ? 0 : 4));
      const bot = baseY + Math.round(curve * 6);
      for (let y = top; y < bot; y++) {
        const by = Math.floor((y - top) / 5), bx = Math.floor((x + R + (by % 2) * 4) / 8);
        let v = 0.62 - nx * 0.38 + curve * 0.12;
        if ((y - top) % 5 === 0 || (x + R + (by % 2) * 4) % 8 === 0) v -= 0.18; // mortar
        if (HL.fbm(bx * 0.6, by * 0.35, 21, 2) > 0.62) v -= 0.32; // the dark blocky patches
        v += (HL.hash(bx, by, 9) - 0.5) * 0.12 + (y - top) / HT * 0.08;
        const ramp = [P.ink, P.ch1, P.ch0, P.st3, P.st2, P.st1, P.st0];
        pe.p(cx + x, y, ramp[HL.clamp(Math.floor(v * 6 + HL.bayer(x, y)), 0, 6)]);
      }
      pe.p(cx + x, top, P.ch1);
    }
    // inner top rim
    pe.disc(cx, 13, R - 4, 4, P.ink);
    // window slits
    for (const [wx, wy] of [[-14, 40], [8, 70], [-4, 110], [14, 140], [-18, 160]]) { pe.r(cx + wx, wy, 2, 6, P.ink); pe.p(cx + wx, wy, P.ch1); }
    // door arch
    const dw = 10, dh = 15, dy = baseY + 6 - dh;
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      const ex = (x - dw / 2 + 0.5) / (dw / 2); if (y < 4 && ex * ex + ((4 - y) / 4) ** 2 > 1) continue;
      pe.p(cx - dw / 2 + x, dy + y, lit ? (y > 1 && Math.abs(ex) < 0.8 ? P.lt0 : P.lt1) : P.ink);
    }
    pe.r(cx - dw / 2 - 1, dy + 3, 1, dh - 3, P.st0);
  });
}

// ------------------------------------------------------------------ buildings
// def: {w,d (px), H (wall px), roof:'thatch'|'slate'|'wood'|'none', ruined, door:{x,w}, doorState:'open'|'locked'|'chained', belfry}
HL.makeBuilding = function (def) {
  const W = def.w, D = def.d, H = def.H || 12, seed = def.seed || 1;
  const ext = HL.canvas(W + 2, D + H + 2);
  const pe = pen(ext);
  // front wall
  const wy = D + 1;
  const stone = def.roof === 'slate';
  pe.shade(1, wy, W, H, stone ? [P.st3, P.st2, P.st1, P.st0] : [P.ch0, P.st3, P.st2, P.st1], (x, y) => {
    let v = 0.55 + HL.vnoise(x * 0.5, y * 0.5, seed) * 0.35;
    if (stone && (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0)) v -= 0.25;
    return HL.clamp(v, 0, 1);
  });
  if (!stone) for (let x = 0; x < W; x += 8) pe.r(1 + x, wy, 1, H, P.wd2);
  pe.r(1, wy + H - 1, W, 1, P.ch1);
  for (let x = 6; x < W - 6; x += 14) if (!def.door || x + 3 < def.door.x || x > def.door.x + def.door.w) pe.r(1 + x, wy + 3, 3, 4, P.ink);
  if (def.door) {
    const dx = 1 + def.door.x, dw = def.door.w, dh = H - 2;
    pe.r(dx, wy + 2, dw, dh, P.ink);
    if (def.doorState === 'locked' || def.doorState === 'chained') {
      pe.r(dx + 1, wy + 3, dw - 2, dh - 1, P.wd1);
      for (let x = 2; x < dw - 1; x += 3) pe.r(dx + x, wy + 3, 1, dh - 1, P.wd2);
      if (def.doorState === 'locked') pe.r(dx + dw / 2 - 1, wy + 6, 2, 2, P.cream2);
      else { pe.line(dx, wy + 3, dx + dw - 1, wy + H - 2, P.st0); pe.line(dx + dw - 1, wy + 3, dx, wy + H - 2, P.st0); }
    }
  }
  // roof (top-down, gable ridge horizontal)
  if (def.roof !== 'none') {
    const rampR = def.roof === 'slate' ? [P.ink, P.ch1, P.ch0, P.st3, P.st2] : def.roof === 'wood' ? [P.wd2, P.wd1, P.wd0, P.st1] : [P.ash4, P.ash3, P.st1, P.ash2, P.ash1];
    const ridge = Math.floor(D / 2);
    pe.shade(0, 0, W + 2, D + 1, rampR, (x, y) => {
      if (def.ruined && HL.fbm(x * 0.18, y * 0.18, seed, 2) > 0.66) return -1;
      const north = y < ridge;
      let v = north ? 0.78 - (ridge - y) / ridge * 0.15 : 0.48 - (y - ridge) / (D - ridge) * 0.2;
      if (y % 3 === 0) v -= 0.18;
      v += (HL.hash(Math.floor(x / 3) + (y % 6 < 3 ? 0 : 1), Math.floor(y / 3), seed) - 0.5) * 0.18;
      if (x === 0 || x === W + 1 || y === 0) v -= 0.3;
      return HL.clamp(v, 0, 1);
    });
    pe.r(0, ridge, W + 2, 1, rampR[0]);
    if (def.ruined) {
      // beams across the holes
      for (let x = 5; x < W; x += 9) for (let y = 1; y < D; y++) if (HL.fbm(x * 0.18, y * 0.18, seed, 2) > 0.66) pe.p(x, y, P.wd2);
    }
    if (def.belfry) {
      const bx = Math.floor(W / 2) - 7, bh = 22;
      pe.r(bx, -0 + 0, 0, 0, P.ink);
      const bw = 16;
      pe.shade(bx, Math.max(0, ridge - 14), bw, 16, [P.ink, P.ch1, P.st3, P.st2, P.st1], (x, y) => HL.clamp(0.75 - x * 0.04 - (y % 4 === 0 ? 0.2 : 0), 0, 1));
      pe.r(bx + 4, ridge - 10, 8, 6, P.ink);
      pe.r(bx + 6, ridge - 9, 4, 4, P.bronze);
      void bh;
    }
  }
  // interior floor
  const flo = HL.canvas(W, D);
  const fp = pen(flo);
  if (stone) fp.shade(0, 0, W, D, [P.st3, P.st2, P.st1], (x, y) => HL.clamp(0.6 + HL.hash(Math.floor(x / 6), Math.floor(y / 6), seed) * 0.3 - (x % 6 === 0 || y % 6 === 0 ? 0.4 : 0), 0, 1));
  else fp.shade(0, 0, W, D, [P.wd2, P.wd1, P.wd0], (x, y) => HL.clamp(0.55 + HL.hash(Math.floor((x + (Math.floor(y / 3) % 2) * 5) / 10), Math.floor(y / 3), seed) * 0.35 - (y % 3 === 0 ? 0.35 : 0), 0, 1));
  // inner walls: wall tops as dark rim, back wall face as a band (drawn above the floor)
  fp.r(0, 0, W, 3, P.ink); fp.r(0, 0, 3, D, P.ink); fp.r(W - 3, 0, 3, D, P.ink);
  const back = HL.canvas(W, H);
  const bp = pen(back);
  bp.shade(0, 0, W, H, stone ? [P.st3, P.st2, P.st1] : [P.ch0, P.st3, P.st2], (x, y) => HL.clamp(0.5 + HL.vnoise(x * 0.4, y * 0.4, seed + 3) * 0.4 - (y === H - 1 ? 0.5 : 0), 0, 1));
  bp.r(0, 0, W, 1, P.ink);
  return { ext, floor: flo, back, W, D, H };
};

// ------------------------------------------------------------------ item icons (12x12)
function buildIcons() {
  const icon = (id, draw) => { const c = HL.canvas(12, 12); draw(pen(c)); ART.icons[id] = c; };
  icon('rusted_sword', (pe) => { pe.line(2, 10, 9, 3, P.st0); pe.line(3, 10, 10, 3, P.st2); pe.p(10, 2, P.st0); pe.line(1, 7, 4, 10, P.wd1); pe.p(1, 11, P.ch0); pe.p(6, 6, P.rust); });
  icon('ashwood_spear', (pe) => { pe.line(1, 11, 9, 3, P.wd0); pe.line(2, 11, 9, 4, P.wd1); pe.r(9, 1, 2, 2, P.st0); pe.p(11, 0, P.cream); pe.p(9, 3, P.st1); });
  icon('bellbreaker', (pe) => { pe.line(2, 11, 7, 4, P.wd1); pe.shade(5, 0, 7, 7, [P.bronze2, P.bronze, '#b5a07a'], (x, y) => (x + y > 2 && x + y < 11) ? 1 - y / 8 : -1); pe.p(7, 4, P.red0); });
  icon('tattered_cloak', (pe) => { pe.r(3, 1, 6, 3, P.ch0); pe.r(2, 4, 8, 7, P.ch0); pe.r(6, 4, 4, 7, P.ch1); pe.p(3, 11, P.ch0); pe.p(8, 11, P.ch1); pe.p(5, 2, P.st2); });
  icon('gravecloth_coat', (pe) => { pe.r(3, 1, 6, 3, '#6b5f5c'); pe.r(2, 4, 8, 8, '#6b5f5c'); pe.r(6, 4, 4, 8, '#4d4342'); pe.r(2, 7, 8, 1, P.cream3); });
  icon('rustbound_plate', (pe) => { pe.r(1, 2, 10, 3, P.st1); pe.r(3, 5, 6, 6, P.st2); pe.r(5, 5, 2, 6, P.red1); pe.r(1, 2, 10, 1, P.st0); pe.p(2, 4, P.rust); });
  icon('bell_shard', (pe) => { pe.shade(2, 1, 8, 10, [P.bronze2, P.bronze, P.lt1], (x, y) => (x < 8 - y * 0.5 + 2 && x > y * 0.3) ? 1 - y / 10 : -1); pe.p(5, 4, P.lt0); });
  icon('ember_charm', (pe) => { pe.disc(6, 7, 3, 3, P.red1); pe.disc(6, 7, 1.5, 1.5, P.fire); pe.line(6, 1, 6, 4, P.cream3); });
  icon('poultice', (pe) => { pe.disc(6, 7, 4, 3.5, P.cream2); pe.disc(5, 6, 2, 2, P.cream); pe.line(3, 4, 9, 4, P.mo1); pe.p(6, 3, P.mo1); });
  icon('dried_meat', (pe) => { pe.disc(6, 6, 4, 3, P.red2); pe.disc(5, 5, 2, 1.5, P.red1); pe.line(8, 8, 11, 11, P.cream2); });
  icon('raw_meat', (pe) => { pe.disc(6, 6, 4, 3, P.red1); pe.disc(5, 5, 2, 1.5, P.red0); pe.line(8, 8, 11, 11, P.cream); });
  icon('fire_flask', (pe) => { pe.disc(6, 8, 3.5, 3, P.st2); pe.disc(6, 8, 2, 2, P.fire); pe.r(5, 2, 2, 3, P.st1); pe.r(5, 1, 2, 1, P.wd1); });
  icon('ash_herb', (pe) => { pe.line(6, 11, 6, 4, P.mo1); pe.line(6, 6, 3, 3, P.mo0); pe.line(6, 7, 9, 4, P.mo0); pe.p(6, 3, P.ash1); });
  icon('cloth_scrap', (pe) => { pe.r(2, 3, 8, 6, P.cream3); pe.r(2, 3, 8, 1, P.cream2); pe.line(2, 9, 5, 7, P.ash4); pe.p(9, 9, P.ash4); });
  icon('iron_scrap', (pe) => { pe.r(2, 5, 4, 4, P.st2); pe.r(6, 3, 4, 3, P.st1); pe.r(5, 8, 4, 2, P.rust); pe.p(7, 3, P.st0); });
  icon('bone_dust', (pe) => { pe.disc(6, 8, 4, 2.5, P.ash1); pe.disc(6, 7, 2, 1.5, P.ash0); pe.line(3, 3, 8, 5, P.ash2); });
  icon('lamp_oil', (pe) => { pe.r(3, 4, 6, 7, P.st3); pe.r(3, 4, 2, 7, P.st2); pe.r(5, 2, 2, 2, P.ch1); pe.r(4, 7, 4, 2, P.tan1); });
  const key = (id, col) => icon(id, (pe) => { pe.disc(3, 3, 2.5, 2.5, col); pe.p(3, 3, P.ui); pe.line(5, 5, 10, 10, col); pe.line(8, 10, 9, 9, col); pe.p(10, 8, col); });
  key('storehouse_key', P.st0); key('gate_key', P.rust); key('crypt_key', P.cream2); key('bell_key', P.bronze);
  icon('winch_crank', (pe) => { pe.line(2, 10, 8, 4, P.st1); pe.line(8, 4, 10, 6, P.st1); pe.r(9, 6, 2, 3, P.wd1); pe.disc(2, 10, 1.5, 1.5, P.st2); });
  icon('note', (pe) => { pe.r(2, 1, 8, 10, P.cream2); pe.r(2, 1, 8, 1, P.cream); for (let y = 3; y < 10; y += 2) pe.r(3, y, 5, 1, P.cream3); });
  icon('map_scrap', (pe) => { pe.r(1, 2, 10, 8, P.tan0); pe.line(2, 8, 9, 3, P.tan2); pe.p(8, 4, P.red0); pe.r(1, 2, 10, 1, P.tan1); });
}

HL.buildArt = function () {
  buildProps();
  buildTower();
  buildIcons();
};

// ------------------------------------------------------------------ figures, drawn live at native pixel size
// Every character is ~11 px tall: small against the world, but with a clear silhouette.
HL.LOOKS = {
  player: { c0: P.ch0, c1: P.ch1, c2: P.st1, face: P.cream2, leg: P.ink },
  gravecloth_coat: { c0: '#6b5f5c', c1: '#4d4342', c2: P.cream3, face: P.cream2, leg: P.ink, hem: true },
  rustbound_plate: { c0: P.st1, c1: P.st3, c2: P.rust, face: P.cream2, leg: P.ink, plate: true },
  drifter: { c0: P.red0, c1: P.red1, c2: P.red2, face: P.ink, leg: P.red3, hunch: true },
  archer: { c0: P.red1, c1: P.red2, c2: P.ch0, face: P.ink, leg: P.red3 },
  guard: { c0: P.st2, c1: P.st3, c2: P.red0, face: P.ink, leg: P.ch1, plate: true, helm: true },
};

// d: 0 down, 1 up, 2 right, 3 left
HL.drawFigure = function (g, x, y, f) {
  x = Math.round(x); y = Math.round(y);
  const L = f.look, flash = f.flash;
  const col = (c) => (flash ? flash : c);
  const px = (dx, dy, c) => { g.fillStyle = col(c); g.fillRect(x + dx, y + dy, 1, 1); };
  const rc = (dx, dy, w, h, c) => { g.fillStyle = col(c); g.fillRect(x + dx, y + dy, w, h); };
  const d = f.dir, side = d >= 2, fl = d === 3 ? -1 : 1;
  if (f.pose === 'dead') {
    rc(-5, -3, 9, 3, L.c1); rc(-5, -3, 9, 1, L.c0); rc(4 * (fl > 0 ? 1 : -1) - (fl > 0 ? 0 : 1), -3, 2, 2, L.face === P.ink ? L.c2 : L.face);
    return;
  }
  if (f.pose === 'roll') {
    const ph = Math.floor((f.t || 0) * 4) % 4;
    rc(-2, -6, 5, 5, L.c0); rc(-2, -6, 5, 1, L.c1);
    px(ph % 2 ? -2 : 2, -6 + ph, L.c1); px(0, -4, L.c2); rc(-2, -1, 5, 1, L.leg);
    return;
  }
  const walk = f.moving ? Math.floor((f.t || 0) * 4) % 4 : 0;
  const bob = walk === 1 || walk === 3 ? -1 : 0;
  const big = L.plate ? 1 : 0;
  // weapon behind the body when facing up or pointing upward
  const wpn = f.weapon;
  const hx = side ? fl * 1 : d === 0 ? 2 : -2, hy = -5 + bob;
  const drawW = () => wpn && HL.drawWeapon(g, x + hx, y + hy, wpn, flash);
  const behind = wpn && (d === 1 || Math.sin(wpn.ang) < -0.35);
  if (behind) drawW();
  // legs
  if (side) {
    const s = walk === 1 ? 1 : walk === 3 ? -1 : 0;
    rc(-s, -2, 1, 2, L.leg); rc(s, -2, 1, 2 - (s ? 0 : 0), L.leg);
  } else {
    rc(-1, walk === 1 ? -3 : -2, 1, walk === 1 ? 2 : 2, L.leg); rc(1, walk === 3 ? -3 : -2, 1, 2, L.leg);
  }
  // body
  const by = -8 + bob - big;
  const bw = 5 + big * 2, bx = -2 - big;
  rc(bx, by, bw, 6 + big, L.c0);
  if (side) rc(fl > 0 ? bx : bx + bw - 1, by, 1, 6 + big, L.c1); else rc(bx + bw - 1, by, 1, 6 + big, L.c1);
  rc(bx, by + 3 + big, bw, 1, L.c2);
  if (L.hem) rc(bx, by + 6 + big, bw, 1, L.c1);
  if (L.plate) { rc(bx - 1, by, 1, 2, L.c1); rc(bx + bw, by, 1, 2, L.c1); rc(bx, by, bw, 1, P.st0 === L.c0 ? L.c1 : P.st1); }
  if (f.tabard) rc(-1, by + 1, 2, 5 + big, f.tabard);
  // head
  const hyy = by - 3 + (L.hunch ? 1 : 0), hxx = -1 + (L.hunch && side ? fl : 0);
  rc(hxx, hyy, 3, 3, L.helm ? P.st1 : L.c0);
  if (L.helm) { rc(hxx, hyy, 3, 1, P.st0); if (!side && d === 0) rc(hxx, hyy + 1, 3, 1, P.ink); else if (side) px(hxx + (fl > 0 ? 2 : 0), hyy + 1, P.ink); }
  else if (d === 0) { px(hxx + 1, hyy + 1, L.face); px(hxx + 1, hyy + 2, L.face); }
  else if (side) { px(hxx + (fl > 0 ? 2 : 0), hyy + 1, L.face); }
  else rc(hxx, hyy + 2, 3, 1, L.c1);
  // eyes of the hollow: none. Red glint only on telegraph.
  if (f.glint) { px(hxx + (side ? (fl > 0 ? 2 : 0) : 1), hyy + 1, P.red0); }
  if (f.shield) {
    const sx = side ? (fl > 0 ? 3 : -5) : d === 0 ? -5 : 3;
    rc(sx, by, 3, 6, P.st2); rc(sx, by, 3, 1, P.st0); px(sx + 1, by + 2, P.rust);
  }
  if (!behind) drawW();
};

// weapon: {kind, ang, len}
HL.drawWeapon = function (g, x, y, w, flash) {
  const c = Math.cos(w.ang), s = Math.sin(w.ang);
  const put = (i, col, wd = 1) => { g.fillStyle = flash || col; g.fillRect(Math.round(x + c * i), Math.round(y + s * i * 0.85), wd, 1); };
  if (w.kind === 'sword') { put(0, P.wd1); for (let i = 1; i <= 7; i++) put(i, i === 7 ? P.st0 : P.st1); put(1, P.st2); }
  else if (w.kind === 'spear') { for (let i = -2; i <= 9; i++) put(i, P.wd0); put(10, P.st0); put(11, P.cream); }
  else if (w.kind === 'axe') { for (let i = 0; i <= 6; i++) put(i, P.wd1); put(6, P.bronze, 2); put(7, P.bronze, 2); put(5, P.bronze2, 2); }
  else if (w.kind === 'bow') {
    const nx = -s, ny = c;
    g.fillStyle = flash || P.wd1;
    for (let i = -3; i <= 3; i++) { const b = 2 - Math.abs(i) * 0.6; g.fillRect(Math.round(x + c * b + nx * i), Math.round(y + s * b + ny * i), 1, 1); }
  }
  else if (w.kind === 'maul') { for (let i = 0; i <= 6; i++) put(i, P.wd2); put(6, P.st1, 2); put(7, P.st2, 2); }
  else if (w.kind === 'claw') { put(1, P.ink); put(2, P.ink); }
};

HL.drawHound = function (g, x, y, f) {
  x = Math.round(x); y = Math.round(y);
  const col = (c) => f.flash || c;
  const rc = (dx, dy, w, h, c) => { g.fillStyle = col(c); g.fillRect(x + dx, y + dy, w, h); };
  if (f.pose === 'dead') { rc(-4, -2, 8, 2, P.red2); rc(-4, -2, 8, 1, P.red1); return; }
  const fl = Math.cos(f.ang) >= 0 ? 1 : -1, vert = Math.abs(Math.sin(f.ang)) > 0.75;
  const ph = Math.floor((f.t || 0) * 6) % 2;
  if (vert) {
    rc(-1, -7, 3, 6, P.red1); rc(-1, -7, 1, 6, P.red0); rc(-1, Math.sin(f.ang) > 0 ? -2 : -9, 3, 3, P.red2);
    rc(-2, -6 + ph, 1, 2, P.red3); rc(2, -6 + (1 - ph), 1, 2, P.red3); rc(-2, -3 + (1 - ph), 1, 2, P.red3); rc(2, -3 + ph, 1, 2, P.red3);
    if (f.glint) rc(0, Math.sin(f.ang) > 0 ? -1 : -9, 1, 1, P.cream);
    return;
  }
  rc(-4, -5, 8, 3, P.red1); rc(-4, -5, 8, 1, P.red0);
  rc(fl > 0 ? 3 : -6, -6, 3, 3, P.red2); // head
  rc(fl > 0 ? -5 : 4, -5, 1, 1, P.red2); // tail
  rc(-3, -2, 1, 2 - ph, P.red3); rc(-1, -2, 1, 1 + ph, P.red3); rc(1, -2, 1, 2 - ph, P.red3); rc(3, -2, 1, 1 + ph, P.red3);
  if (f.glint) rc(fl > 0 ? 5 : -6, -5, 1, 1, P.cream);
};

HL.drawLurker = function (g, x, y, f) {
  x = Math.round(x); y = Math.round(y);
  const col = (c) => f.flash || c;
  const rc = (dx, dy, w, h, c) => { g.fillStyle = col(c); g.fillRect(x + dx, y + dy, w, h); };
  if (f.pose === 'hidden' || f.pose === 'dead') { rc(-3, -2, 7, 2, P.ash4); rc(-2, -3, 5, 1, P.ash3); if (f.pose === 'hidden') { rc(-1, -3, 1, 1, P.mo2); rc(2, -2, 1, 1, P.mo3); } return; }
  const e = HL.clamp(f.emerge || 1, 0, 1), h = Math.round(4 + 8 * e), sw = Math.round(Math.sin((f.t || 0) * 5));
  rc(-3, -2, 7, 2, P.ash4);
  for (let i = 0; i < h; i++) { const wob = Math.round(Math.sin(i * 0.8 + (f.t || 0) * 4) * (i / h) * 1.5) + (i > h - 3 ? sw : 0); rc(-1 + wob, -2 - i, 3, 1, i % 3 ? P.mo3 : P.wd2); }
  rc(-1 + sw, -2 - h, 1, 1, P.red0); rc(1 + sw, -2 - h, 1, 1, P.red0);
  rc(-4, -3, 1, 2, P.mo3); rc(4, -4, 1, 3, P.mo3);
};

// The Bellworn Keeper: a hunched giant, a cracked bell for a head, chains trailing.
HL.drawKeeper = function (g, x, y, f) {
  x = Math.round(x); y = Math.round(y);
  const col = (c) => f.flash || c;
  const rc = (dx, dy, w, h, c) => { g.fillStyle = col(c); g.fillRect(x + dx, y + dy, w, h); };
  const t = f.t || 0, br = Math.round(Math.sin(t * 2) * 1);
  if (f.pose === 'dead') { rc(-14, -6, 28, 6, P.ch1); rc(-14, -6, 28, 1, P.ch0); rc(10, -9, 9, 8, P.bronze2); return; }
  // chains on the floor
  for (let i = 0; i < 10; i++) { const a = f.chainA || 0; rc(Math.round(Math.cos(a + i * 0.05) * (8 + i * 2)), Math.round(-2 + Math.sin(a + i * 0.05) * (3 + i)), 1, 1, i % 2 ? P.st1 : P.st3); }
  // legs
  rc(-7, -6, 4, 6, P.ink); rc(3, -6, 4, 6, P.ink);
  // torso
  rc(-10, -20 + br, 20, 15, P.ch1); rc(-10, -20 + br, 20, 2, P.ch0); rc(-10, -20 + br, 3, 15, P.ch0);
  for (let i = 0; i < 4; i++) rc(-8 + i * 5, -14 + br, 1, 7, P.st3);
  // arms (raised during a slam)
  const up = f.armsUp ? -10 : 0;
  rc(-14, -19 + br + up, 4, 12, P.ch1); rc(10, -19 + br + up, 4, 12, P.ch1);
  rc(-15, -8 + br + up, 5, 4, P.st3); rc(10, -8 + br + up, 5, 4, P.st3);
  // the bell head
  const hy = -32 + br;
  for (let r = 0; r < 12; r++) { const w = Math.round(6 + r * 0.7); rc(-w, hy + r, w * 2, 1, r < 2 ? P.bronze : r % 4 === 0 ? P.bronze2 : '#7b6a4d'); }
  rc(-4, hy + 6, 8, 6, P.ink);
  const glow = f.stunned ? P.cream3 : f.rage ? P.fire : P.red0;
  rc(-2, hy + 8, 4, 3, glow); rc(-1, hy + 9, 2, 1, f.stunned ? P.cream : P.lt1);
  rc(3, hy + 1, 1, 6, P.ink); rc(4, hy + 4, 1, 3, P.ink); // crack
};
