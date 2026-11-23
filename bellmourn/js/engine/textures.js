// Procedural pixel textures. Every texture is drawn at 16 texels per world metre so that, with the
// camera at 16 buffer pixels per metre, one texel is one screen pixel. All are seeded: the same
// world looks the same every time.
import * as THREE from '../../vendor/three.module.min.js';

export const TPM = 16; // texels per metre

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(h, f) { const [r, g, b] = hex(h); const k = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${k(r)},${k(g)},${k(b)})`; }

function toTexture(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.userData.worldSize = [c.width / TPM, c.height / TPM];
  return t;
}

// Pixel noise speckle over a region.
function speckle(g, r, w, h, colors, density) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (r() < density) { g.fillStyle = colors[(r() * colors.length) | 0]; g.fillRect(x, y, 1, 1); }
  }
}

const cache = new Map();
function cached(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

// Cobblestones: rounded stones with dark wet joints, occasional larger flags.
export function cobble(seed = 1, tone = '#5a6472') {
  return cached('cobble' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed);
    g.fillStyle = shade(tone, 0.42); g.fillRect(0, 0, W, H);
    const rowH = 8;
    for (let row = 0; row < H / rowH; row++) {
      let x = (row % 2) * 4 - 4;
      while (x < W) {
        const w = 6 + ((r() * 5) | 0); const y = row * rowH;
        const f = 0.9 + r() * 0.16;
        const body = shade(tone, f);
        g.fillStyle = body;
        // rounded stone: skip corners
        for (let yy = 0; yy < rowH - 1; yy++) for (let xx = 0; xx < w - 1; xx++) {
          const corner = (xx === 0 || xx === w - 2) && (yy === 0 || yy === rowH - 2);
          if (corner) continue;
          const px = (x + xx + W) % W, py = (y + yy) % H;
          g.fillRect(px, py, 1, 1);
        }
        // top highlight, bottom shadow
        g.fillStyle = shade(tone, f * 1.18);
        for (let xx = 1; xx < w - 2; xx++) g.fillRect((x + xx + W) % W, y % H, 1, 1);
        g.fillStyle = shade(tone, f * 0.72);
        for (let xx = 1; xx < w - 2; xx++) g.fillRect((x + xx + W) % W, (y + rowH - 2) % H, 1, 1);
        x += w;
      }
    }
    speckle(g, r, W, H, [shade(tone, 0.6), shade(tone, 1.15)], 0.015);
    return toTexture(c);
  });
}

// Large paving flags: the lighter rectangular slabs of a square.
export function flags(seed = 2, tone = '#6a7482') {
  return cached('flags' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed);
    g.fillStyle = shade(tone, 0.45); g.fillRect(0, 0, W, H);
    const rows = [0, 12, 22, 34, 44, 54, 64];
    for (let i = 0; i < rows.length - 1; i++) {
      const y0 = rows[i], y1 = rows[i + 1];
      let x = ((r() * 10) | 0) - 10;
      while (x < W) {
        const w = 10 + ((r() * 14) | 0); const f = 0.8 + r() * 0.3;
        for (let y = y0; y < y1 - 1; y++) for (let xx = x; xx < x + w - 1; xx++) {
          g.fillStyle = shade(tone, f * (0.94 + r() * 0.1));
          g.fillRect((xx + W) % W, y, 1, 1);
        }
        g.fillStyle = shade(tone, f * 1.15);
        for (let xx = x; xx < x + w - 1; xx++) g.fillRect((xx + W) % W, y0, 1, 1);
        g.fillStyle = shade(tone, f * 0.7);
        for (let y = y0; y < y1 - 1; y++) g.fillRect((x + w - 2 + W) % W, y, 1, 1);
        // cracks
        if (r() < 0.35) {
          let cx = x + ((r() * w) | 0), cy = y0 + 1;
          g.fillStyle = shade(tone, 0.55);
          for (let k = 0; k < 6; k++) { g.fillRect((cx + W) % W, cy, 1, 1); cx += (r() * 3 | 0) - 1; cy += 1; if (cy >= y1 - 1) break; }
        }
        x += w;
      }
    }
    return toTexture(c);
  });
}

// Bricks: dark blue-grey courses with thin mortar and the odd wet streak.
export function brick(seed = 3, tone = '#2c3545') {
  return cached('brick' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    g.fillStyle = shade(tone, 0.55); g.fillRect(0, 0, W, H);
    for (let row = 0; row < H / 4; row++) {
      const off = (row % 2) * 4;
      for (let bx = -1; bx < W / 8 + 1; bx++) {
        const f = 0.82 + r() * 0.32; const x0 = bx * 8 + off;
        for (let y = row * 4; y < row * 4 + 3; y++) for (let x = x0; x < x0 + 7; x++) {
          if (x < 0 || x >= W) continue;
          g.fillStyle = shade(tone, f * (y === row * 4 ? 1.12 : 1)); g.fillRect(x, y, 1, 1);
        }
      }
    }
    // wet streaks
    for (let k = 0; k < 3; k++) {
      const x = (r() * W) | 0; const y0 = (r() * H) | 0; const len = 4 + ((r() * 10) | 0);
      g.fillStyle = shade(tone, 0.68);
      for (let y = y0; y < y0 + len; y++) g.fillRect(x, y % H, 1, 1);
    }
    speckle(g, r, W, H, [shade(tone, 0.6), shade(tone, 1.2)], 0.03);
    return toTexture(c);
  });
}

// Ashlar: big dressed stone blocks for plinths, steps, buttresses and trims.
export function ashlar(seed = 4, tone = '#4a5464') {
  return cached('ashlar' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    g.fillStyle = shade(tone, 0.5); g.fillRect(0, 0, W, H);
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * 6; const y0 = row * 8;
      for (let bx = -1; bx < 3; bx++) {
        const x0 = bx * 12 + off; const f = 0.85 + r() * 0.25;
        for (let y = y0; y < y0 + 7; y++) for (let x = x0; x < x0 + 11; x++) {
          if (x < 0 || x >= W) continue;
          g.fillStyle = shade(tone, f * (y === y0 ? 1.18 : (y === y0 + 6 ? 0.8 : 1)) * (0.96 + r() * 0.08)); g.fillRect(x, y, 1, 1);
        }
      }
    }
    return toTexture(c);
  });
}

// Slate roof: overlapping rows with a lit lower lip.
export function slate(seed = 5, tone = '#232c3a') {
  return cached('slate' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    g.fillStyle = shade(tone, 0.6); g.fillRect(0, 0, W, H);
    for (let row = 0; row < 8; row++) {
      const off = (row % 2) * 2; const y0 = row * 4;
      for (let bx = -1; bx < 9; bx++) {
        const x0 = bx * 4 + off; const f = 0.85 + r() * 0.3;
        for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + 3; x++) {
          if (x < 0 || x >= W) continue;
          g.fillStyle = shade(tone, f * (y === y0 + 3 ? 1.35 : 1)); g.fillRect(x, y, 1, 1);
        }
      }
    }
    return toTexture(c);
  });
}

export function wood(seed = 6, tone = '#5e3e28', plank = 4) {
  return cached('wood' + seed + tone + plank, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    for (let x0 = 0; x0 < W; x0 += plank) {
      const f = 0.8 + r() * 0.35;
      for (let x = x0; x < x0 + plank; x++) for (let y = 0; y < H; y++) {
        const edge = x === x0 + plank - 1;
        g.fillStyle = shade(tone, edge ? f * 0.6 : f * (x === x0 ? 1.15 : 1) * (0.94 + r() * 0.1));
        g.fillRect(x, y, 1, 1);
      }
      // a joint across the plank
      const jy = (r() * H) | 0; g.fillStyle = shade(tone, f * 0.55); g.fillRect(x0, jy, plank - 1, 1);
    }
    return toTexture(c);
  });
}

export function plaster(seed = 7, tone = '#4b5260') {
  return cached('plaster' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = shade(tone, 0.9 + r() * 0.16); g.fillRect(x, y, 1, 1); }
    // flaking patches showing brick
    for (let k = 0; k < 2; k++) {
      const x0 = (r() * 24) | 0, y0 = (r() * 24) | 0;
      for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) if (r() < 0.8) { g.fillStyle = shade('#2c3545', 0.8 + ((y % 2) ? 0.1 : 0)); g.fillRect(x0 + x, y0 + y, 1, 1); }
    }
    return toTexture(c);
  });
}

export function dirt(seed = 8, tone = '#3a3e3c') {
  return cached('dirt' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = shade(tone, 0.8 + r() * 0.35); g.fillRect(x, y, 1, 1); }
    speckle(g, r, W, H, [shade(tone, 1.5), shade(tone, 0.5)], 0.04);
    return toTexture(c);
  });
}

// Dead grass and weeds between stones.
export function grass(seed = 9, tone = '#2f3a34') {
  return cached('grass' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { g.fillStyle = shade(tone, 0.75 + r() * 0.4); g.fillRect(x, y, 1, 1); }
    for (let k = 0; k < 40; k++) { const x = (r() * W) | 0, y = (r() * H) | 0; g.fillStyle = shade(tone, 1.4); g.fillRect(x, y, 1, 1); g.fillStyle = shade(tone, 1.15); g.fillRect(x, (y + 1) % H, 1, 1); }
    return toTexture(c);
  });
}

export function iron() { return cached('iron', () => { const [c, g] = canvas(4, 4); g.fillStyle = '#0d1016'; g.fillRect(0, 0, 4, 4); g.fillStyle = '#1a1f28'; g.fillRect(0, 0, 4, 1); return toTexture(c); }); }

// A gothic rose window, drawn for a gable: dark glass, stone tracery, a quatrefoil.
export function roseWindow(lit = false) {
  return cached('rose' + lit, () => {
    const S = 48; const [c, g] = canvas(S, S); const cx = S / 2 - 0.5, cy = S / 2 - 0.5;
    const stone = '#7e8898', stoneLo = '#4e5868', glass = lit ? '#a86a30' : '#141a26', glass2 = lit ? '#d8a050' : '#1c2434', glass3 = lit ? '#6a2a3a' : '#182030';
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x - cx, dy = y - cy; const d = Math.hypot(dx, dy); const a = Math.atan2(dy, dx);
      let col = null;
      if (d < 23.5 && d >= 20.5) col = (dy < 0 ? stone : stoneLo);
      else if (d < 20.5) {
        // quatrefoil: four circles around the centre
        const lobes = [[0, -8], [8, 0], [0, 8], [-8, 0]];
        let inLobe = false, lobeEdge = false;
        for (const [lx, ly] of lobes) { const ld = Math.hypot(dx - lx, dy - ly); if (ld < 7.5) inLobe = true; if (ld >= 7.5 && ld < 9) lobeEdge = true; }
        const spoke = Math.abs(((a / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) > 0.42;
        if (inLobe) col = ((x + y) % 3 === 0 ? glass2 : (((x * 3 + y) % 7 === 0) ? glass3 : glass));
        else if (lobeEdge || d < 3) col = stone;
        else if (spoke && d > 12) col = stoneLo;
        else col = ((x * 7 + y * 3) % 5 === 0 ? glass2 : (d > 15 ? glass3 : glass));
        if (d < 2) col = glass2;
      }
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
    return toTexture(c, false);
  });
}

// A lancet (pointed arch) window; dark, or warm when someone is home.
export function lancet(lit = false, w = 8, h = 20) {
  return cached('lancet' + lit + w + h, () => {
    const [c, g] = canvas(w, h);
    const frame = '#4a5464', glass = lit ? '#d09848' : '#121824', glass2 = lit ? '#f0c068' : '#1a2230';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = (w - 1) / 2; const archH = w * 0.9;
      let inside = true;
      if (y < archH) { // pointed arch from two circles
        const r = w * 0.95; const d1 = Math.hypot(x - (cx + w * 0.45 - r + w * 0.5) , y - archH), d2 = Math.hypot(x - (cx - w * 0.45 + r - w * 0.5), y - archH);
        inside = d1 < r * 0.55 + 0.6 && d2 < r * 0.55 + 0.6;
      }
      if (!inside) continue;
      const edge = x === 0 || x === w - 1 || y === h - 1;
      g.fillStyle = edge ? frame : ((x === Math.round(cx) && y > archH) || y === Math.round(h * 0.6) ? frame : (((x + y) % 4 === 0) ? glass2 : glass));
      g.fillRect(x, y, 1, 1);
    }
    return toTexture(c, false);
  });
}

// Square house window with a cross frame.
export function houseWindow(lit = false) {
  return cached('hwin' + lit, () => {
    const w = 8, h = 10; const [c, g] = canvas(w, h);
    const frame = '#3a2a20', glass = lit ? '#d8a050' : '#131924', glass2 = lit ? '#f4c870' : '#1b2331';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const edge = x === 0 || x === w - 1 || y === 0 || y === h - 1 || x === 4 || y === 5;
      g.fillStyle = edge ? frame : (((x + y) % 3 === 0) ? glass2 : glass); g.fillRect(x, y, 1, 1);
    }
    return toTexture(c, false);
  });
}

export function door(tone = '#3e2a1e') {
  return cached('door' + tone, () => {
    const w = 16, h = 32; const [c, g] = canvas(w, h); const r = rng(11);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const archTop = y < 6 && Math.hypot(x - 7.5, y - 7) > 8; if (archTop) continue;
      const plankEdge = x % 4 === 3; g.fillStyle = shade(tone, plankEdge ? 0.6 : 0.9 + r() * 0.2); g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = '#14161a'; g.fillRect(0, 12, w, 1); g.fillRect(0, 24, w, 1); g.fillStyle = '#8a7a50'; g.fillRect(11, 18, 1, 2);
    return toTexture(c, false);
  });
}

// Soft radial glow sprite (for halos, light pools, embers).
export function glow(color = '#ffc070', size = 32, hard = 2.0) {
  return cached('glow' + color + size + hard, () => {
    const [c, g] = canvas(size, size); const [R, G, B] = hex(color); const img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5) / (size / 2); const a = Math.max(0, 1 - d) ** hard;
      const i = (y * size + x) * 4; img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; return t;
  });
}

// Flame sprite sheet: 4 frames, 8x12 each.
export function flame() {
  return cached('flame', () => {
    const fw = 8, fh = 12, n = 4; const [c, g] = canvas(fw * n, fh); const r = rng(13);
    const cols = ['#fff2b0', '#ffd060', '#ff9a30', '#d05018'];
    for (let f = 0; f < n; f++) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const t = y / fh; const wob = Math.sin(y * 0.9 + f * 1.7) * 1.2 * (1 - t);
      const half = (1 - Math.abs(t - 0.75) * 1.4) * 3.2 * Math.min(1, t * 1.6 + 0.2);
      const dx = Math.abs(x - 3.5 - wob);
      if (dx < half && r() > 0.06) { const k = Math.min(3, Math.floor(dx / Math.max(0.5, half) * 2 + (1 - t) * 2.2)); g.fillStyle = cols[k]; g.fillRect(f * fw + x, y, 1, 1); }
    }
    const t = toTexture(c, false); t.repeat.set(1 / n, 1); return t;
  });
}

// The square's paving: small dark cobbles with lighter, worn flagstones laid over them in runs.
export function court(seed = 21, tone = '#5c6674') {
  return cached('court' + seed + tone, () => {
    const base = cobble(seed, shade(tone, 0.92).replace(/rgb\((\d+),(\d+),(\d+)\)/, (m, r, g, b) => '#' + [r, g, b].map((v) => (+v).toString(16).padStart(2, '0')).join('')));
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed + 7);
    g.drawImage(base.image, 0, 0);
    const slabs = 11;
    for (let k = 0; k < slabs; k++) {
      const w = 10 + ((r() * 3) | 0) * 4, h = 7 + ((r() * 2) | 0) * 3; const x0 = (r() * W) | 0, y0 = ((r() * H / 2) | 0) * 2;
      const f = 1.05 + r() * 0.3;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const px = (x0 + x) % W, py = (y0 + y) % H; const edge = x === w - 1 || y === h - 1;
        g.fillStyle = edge ? shade(tone, 0.45) : shade(tone, f * (y === 0 ? 1.14 : (x === w - 2 ? 0.86 : 1)) * (0.95 + r() * 0.1)); g.fillRect(px, py, 1, 1);
      }
    }
    return toTexture(c);
  });
}

// ================================================================ Act II: the lands beyond the walls
// Shared value noise for the natural grounds (seeded, tiles at the canvas size).
function vnoise(seed, W, H, cell) {
  const r = rng(seed); const gw = Math.ceil(W / cell), gh = Math.ceil(H / cell); const v = [];
  for (let i = 0; i < gw * gh; i++) v.push(r());
  const at = (i, j) => v[((j % gh + gh) % gh) * gw + ((i % gw + gw) % gw)];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = Math.floor(fx), j = Math.floor(fy), u = fx - i, w = fy - j;
    const s = (t) => t * t * (3 - 2 * t); const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), d = at(i + 1, j + 1);
    return (a + (b - a) * s(u)) + ((c + (d - c) * s(u)) - (a + (b - a) * s(u))) * s(w);
  };
}
const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

// Snow: soft drifts in broad bands, wind ripples, a few glinting crystals, blue in the hollows.
export function snow(seed = 31, tone = '#c4cede') {
  return cached('snow' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 16), n2 = vnoise(seed + 1, W, H, 8);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ripple = Math.sin((x * 0.35 + y * 0.9) + n1(x, y) * 5) * 0.5 + 0.5;
      let f = 0.84 + n1(x, y) * 0.16 + n2(x, y) * 0.06 + (ripple > 0.9 ? 0.05 : (ripple < 0.08 ? -0.06 : 0));
      f = Math.round(f * 24) / 24;
      g.fillStyle = shade(tone, f); g.fillRect(x, y, 1, 1);
    }
    for (let k = 0; k < 26; k++) px(g, (r() * W) | 0, (r() * H) | 0, '#f4f8ff');
    for (let k = 0; k < 18; k++) px(g, (r() * W) | 0, (r() * H) | 0, shade(tone, 0.72));
    return toTexture(c);
  });
}

// Ice: a frozen sheet (8 m tile), pale streaks under the surface, a few long white cracks, bubbles.
export function ice(seed = 32, tone = '#6e98b8') {
  return cached('ice' + seed + tone, () => {
    const W = 128, H = 128; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 32), n2 = vnoise(seed + 9, W, H, 12);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const streak = Math.sin((x * 0.7 + y * 0.3) * 0.16 + n1(x, y) * 5); let f = 0.8 + n1(x, y) * 0.18 + n2(x, y) * 0.06 + (streak > 0.9 ? 0.08 : 0);
      f = Math.round(f * 18) / 18; g.fillStyle = shade(tone, f); g.fillRect(x, y, 1, 1);
    }
    for (let k = 0; k < 5; k++) { // long cracks: a dark line, a pale lip, branching once
      let x = r() * W, y = r() * H, a = r() * Math.PI * 2; const len = 30 + r() * 40;
      for (let s = 0; s < len; s++) {
        px(g, ((x | 0) + W) % W, ((y | 0) + H) % H, shade(tone, 0.62)); if (s % 3) px(g, ((x | 0) + W) % W, ((y | 0) + 1 + H) % H, shade(tone, 1.3));
        a += (r() - 0.5) * 0.5; x += Math.cos(a); y += Math.sin(a);
      }
    }
    for (let k = 0; k < 30; k++) { const x = (r() * W) | 0, y = (r() * H) | 0; px(g, x, y, shade(tone, 1.45)); }
    return toTexture(c);
  });
}

// Sand: wind ripples (a shadowed trough under a lit crest every few texels), grit and pebbles.
export function sand(seed = 33, tone = '#b88a56') {
  return cached('sand' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 32), n2 = vnoise(seed + 3, W, H, 8);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ph = (y + Math.sin(x * Math.PI * 2 / 32 + n1(x, y) * 3) * 2.5 + n1(x, y) * 7) / 6; const t = ph - Math.floor(ph); const rip = n1((x + 17) % W, (y + 9) % H) > 0.45;
      let f = 0.9 + n2(x, y) * 0.1 + (rip ? (t < 0.16 ? -0.07 : (t < 0.3 ? 0.05 : 0)) : 0);
      f = Math.round(f * 24) / 24; g.fillStyle = shade(tone, f); g.fillRect(x, y, 1, 1);
    }
    speckle(g, r, W, H, [shade(tone, 0.62), shade(tone, 1.2)], 0.02);
    return toTexture(c);
  });
}

// Sandstone: courses of soft blocks, the strata in fine lines, eroded corners, dark weathered joints.
export function sandstone(seed = 34, tone = '#a8784c') {
  return cached('sandstone' + seed + tone, () => {
    const W = 64, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    g.fillStyle = shade(tone, 0.48); g.fillRect(0, 0, W, H);
    for (let row = 0; row < 4; row++) {
      const y0 = row * 8; let x = -((r() * 12) | 0);
      while (x < W) {
        const w = 10 + ((r() * 10) | 0); const f = 0.86 + r() * 0.2;
        for (let y = y0; y < y0 + 7; y++) for (let xx = x; xx < x + w - 1; xx++) {
          const ex = xx - x, ey = y - y0; if ((ex === 0 || ex === w - 2) && (ey === 0 || ey === 6) && r() < 0.8) continue;
          const strata = (y + ((xx * 0.15) | 0)) % 3 === 0 ? 0.93 : 1; g.fillStyle = shade(tone, f * strata * (0.95 + r() * 0.08)); g.fillRect((xx + W) % W, y, 1, 1);
        }
        g.fillStyle = shade(tone, f * 1.16); for (let xx = x + 1; xx < x + w - 2; xx++) g.fillRect((xx + W) % W, y0, 1, 1);
        if (r() < 0.3) { const hx = x + 2 + ((r() * (w - 5)) | 0), hy = y0 + 2 + ((r() * 3) | 0); g.fillStyle = shade(tone, 0.6); g.fillRect((hx + W) % W, hy, 2, 1); }
        x += w;
      }
    }
    return toTexture(c);
  });
}

// Old catacomb stone: big rough blocks gone brown with age, pale saltpetre bleeding from the joints.
export function catstone(seed = 35, tone = '#5a5048') {
  return cached('catstone' + seed + tone, () => {
    const W = 64, H = 48; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 16);
    g.fillStyle = shade(tone, 0.4); g.fillRect(0, 0, W, H);
    for (let row = 0; row < 4; row++) {
      const y0 = row * 12; let x = -((r() * 14) | 0);
      while (x < W) {
        const w = 14 + ((r() * 12) | 0); const f = 0.8 + r() * 0.22;
        for (let y = y0; y < y0 + 11; y++) for (let xx = x; xx < x + w - 1; xx++) {
          const xw = (xx + W) % W; g.fillStyle = shade(tone, f * (0.88 + n1(xw, y) * 0.2 + (r() - 0.5) * 0.06)); g.fillRect(xw, y, 1, 1);
        }
        g.fillStyle = shade(tone, f * 1.18); for (let xx = x + 1; xx < x + w - 2; xx++) g.fillRect((xx + W) % W, y0, 1, 1);
        g.fillStyle = shade(tone, f * 0.66); for (let y = y0 + 1; y < y0 + 11; y++) g.fillRect((x + w - 2 + W) % W, y, 1, 1);
        x += w;
      }
    }
    for (let k = 0; k < 6; k++) { // saltpetre streaks running down from a joint
      const x = (r() * W) | 0, y0 = ((r() * 4) | 0) * 12 + 11, len = 3 + ((r() * 8) | 0);
      for (let i = 0; i < len; i++) px(g, x + (i > len / 2 && r() < 0.3 ? 1 : 0), (y0 + i) % H, i < 2 ? '#b8b0a0' : shade('#8a8478', 1 - i / len * 0.3));
    }
    return toTexture(c);
  });
}

// Tomb floor: long worn slabs with carved epitaph lines and the odd cross.
export function tombfloor(seed = 36, tone = '#575049') {
  return cached('tombfloor' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 16);
    g.fillStyle = shade(tone, 0.42); g.fillRect(0, 0, W, H);
    for (let col = 0; col < 4; col++) {
      let y = -((r() * 10) | 0); const x0 = col * 16;
      while (y < H) {
        const h = 20 + ((r() * 14) | 0), f = 0.8 + r() * 0.24;
        for (let yy = y; yy < y + h - 1; yy++) for (let x = x0; x < x0 + 15; x++) { const yw = (yy + H) % H; g.fillStyle = shade(tone, f * (0.9 + n1(x, yw) * 0.16)); g.fillRect(x, yw, 1, 1); }
        g.fillStyle = shade(tone, f * 1.15); for (let x = x0; x < x0 + 15; x++) g.fillRect(x, (y + H) % H, 1, 1);
        if (r() < 0.6) { g.fillStyle = shade(tone, f * 0.6); for (let k = 0; k < 3; k++) { const ly = y + 6 + k * 3; for (let x = x0 + 3; x < x0 + 12; x++) if (r() < 0.75) g.fillRect(x, (ly + H) % H, 1, 1); } }
        else if (r() < 0.5) { g.fillStyle = shade(tone, f * 0.58); const cx = x0 + 7, cy = y + 8; for (let k = -3; k <= 4; k++) g.fillRect(cx, (cy + k + H) % H, 1, 1); for (let k = -2; k <= 2; k++) g.fillRect(cx + k, (cy - 1 + H) % H, 1, 1); }
        y += h;
      }
    }
    return toTexture(c);
  });
}

// Basalt for the Abyss: dark columnar cells, their seams faintly red with the heat below.
export function basalt(seed = 37, tone = '#2e2628') {
  return cached('basalt' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const pts = [];
    for (let i = 0; i < 22; i++) pts.push([r() * W, r() * H, 0.82 + r() * 0.3]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let d1 = 1e9, d2 = 1e9, f = 1;
      for (const [qx, qy, qf] of pts) { let dx = Math.abs(x - qx), dy = Math.abs(y - qy); dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; f = qf; } else if (d < d2) d2 = d; }
      const e = d2 - d1; let col;
      if (e < 1) col = (x + y) % 3 === 0 ? '#5a1810' : '#3a0e0c';
      else if (e < 2) col = shade(tone, 0.6);
      else col = shade(tone, f * (e > 5 ? 1.05 : 0.95) * (0.94 + r() * 0.1));
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
    return toTexture(c);
  });
}

// Obsidian: black glass with violet depths and sharp pale glints along its fracture planes.
export function obsidian(seed = 38, tone = '#1c1620') {
  return cached('obsidian' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 8);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const f = 0.8 + n1(x, y) * 0.5; g.fillStyle = shade(tone, Math.round(f * 10) / 10); g.fillRect(x, y, 1, 1); }
    for (let k = 0; k < 5; k++) { let x = r() * W, y = r() * H; const dx = r() - 0.3, dy = r() * 0.6 + 0.4; for (let s = 0; s < 6 + r() * 6; s++) { px(g, ((x | 0) + W) % W, ((y | 0) + H) % H, s % 3 ? '#4a3c58' : '#8a7aa0'); x += dx; y += dy; } }
    return toTexture(c);
  });
}

// Hell brick: dark red-brown courses with carved glyphs that catch the fire.
export function hellbrick(seed = 39, tone = '#3a2220') {
  return cached('hellbrick' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    g.fillStyle = shade(tone, 0.45); g.fillRect(0, 0, W, H);
    for (let row = 0; row < 4; row++) for (let k = 0; k < 2; k++) {
      const x0 = k * 16 + (row % 2) * 8, y0 = row * 8, f = 0.85 + r() * 0.25;
      for (let y = y0; y < y0 + 7; y++) for (let x = x0; x < x0 + 15; x++) { g.fillStyle = shade(tone, f * (0.92 + r() * 0.12)); g.fillRect(x % W, y, 1, 1); }
      g.fillStyle = shade(tone, f * 1.2); for (let x = x0; x < x0 + 15; x++) g.fillRect(x % W, y0, 1, 1);
      if (r() < 0.45) { g.fillStyle = '#7a2a18'; const gx = x0 + 5, gy = y0 + 2; const G = (r() * 4) | 0; const shapes = [[[1, 0], [1, 1], [1, 2], [0, 1], [2, 1]], [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]], [[1, 0], [0, 1], [2, 1], [1, 2], [1, 1]]][G]; for (const [a, b] of shapes) g.fillRect((gx + a) % W, gy + b, 1, 1); }
    }
    return toTexture(c);
  });
}

// Lava: slow bright currents, white-gold to blood red, with drifting black crust (scroll it to flow).
export function lava(seed = 40) {
  return cached('lava' + seed, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 8), n2 = vnoise(seed + 1, W, H, 16);
    const RAMP = ['#1a0604', '#4a0e06', '#8a1c08', '#c83a0c', '#f06a18', '#ffa83a', '#ffe08a'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = Math.sin((x / W) * Math.PI * 2 * 2 + n2(x, y) * 5) * 0.25 + n1(x, y) * 0.55 + 0.25 + (r() - 0.5) * 0.08;
      g.fillStyle = RAMP[Math.max(0, Math.min(6, Math.floor(v * 7)))]; g.fillRect(x, y, 1, 1);
    }
    return toTexture(c);
  });
}

// A ritual circle (white on clear; tint it): rings, a band of glyphs, a seven-pointed star, an inner eye.
// kind: 'circle' (the full rite), 'seal' (rings and a triangle), 'ring' (rings and glyphs only).
export function sigil(kind = 'circle', S = 96, seed = 41) {
  return cached('sigil' + kind + S + seed, () => {
    const [c, g] = canvas(S, S); const r = rng(seed); const C = S / 2; const W = '#ffffff', D = 'rgba(255,255,255,0.55)';
    const ring = (R, th = 1, col = W) => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const d = Math.hypot(x + 0.5 - C, y + 0.5 - C); if (d >= R - th && d < R) px(g, x, y, col); } };
    const line = (x0, y0, x1, y1, col = W) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) px(g, Math.round(x0 + (x1 - x0) * i / n - 0.5), Math.round(y0 + (y1 - y0) * i / n - 0.5), col); };
    ring(C - 1, 1.2); ring(C - 3, 1); if (kind !== 'seal') ring(C - 11, 1);
    if (kind !== 'seal') { // glyph band between C-3 and C-11
      const n = Math.floor((C - 7) * Math.PI * 2 / 7); const glyphs = [];
      for (let i = 0; i < 9; i++) { const b = []; for (let k = 0; k < 15; k++) b.push(r() < 0.45); b[7] = true; glyphs.push(b); }
      for (let i = 0; i < n; i++) {
        const gl = glyphs[(r() * glyphs.length) | 0]; const a = (i / n) * Math.PI * 2; const ca = Math.cos(a), sa = Math.sin(a);
        for (let k = 0; k < 15; k++) if (gl[k]) { const u = (k % 3) - 1, v = Math.floor(k / 3) - 2; const rr = C - 7 + v, tt = u; px(g, Math.round(C + ca * rr - sa * tt - 0.5), Math.round(C + sa * rr + ca * tt - 0.5), W); }
      }
    }
    const R2 = kind === 'seal' ? C - 4 : C - 12;
    if (kind === 'circle') { // a heptagram
      const P = []; for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 7; P.push([C + Math.cos(a) * R2, C + Math.sin(a) * R2]); }
      for (let i = 0; i < 7; i++) { const a = P[i], b = P[(i + 3) % 7]; line(a[0], a[1], b[0], b[1]); }
      ring(R2 * 0.42, 1); ring(R2 * 0.3, 1, D);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = x + 0.5 - C, dy = (y + 0.5 - C) * 2.2; const d = Math.hypot(dx, dy); if (d < R2 * 0.26 && d > R2 * 0.26 - 1.3) px(g, x, y, W); if (Math.hypot(x + 0.5 - C, y + 0.5 - C) < 2.2) px(g, x, y, W); }
    } else if (kind === 'seal') {
      const P = []; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; P.push([C + Math.cos(a) * R2, C + Math.sin(a) * R2]); }
      for (let i = 0; i < 3; i++) line(P[i][0], P[i][1], P[(i + 1) % 3][0], P[(i + 1) % 3][1]);
      ring(R2 * 0.5, 1);
    }
    const t = toTexture(c, false); return t;
  });
}

// An eye for the wheel above the Abyss (16 x 10): lids, a red iris, a slit pupil. open: 0..2 (shut, half, wide).
export function eye(open = 2, w = 16, h = 10) {
  return cached('eye' + open + 'x' + w + 'x' + h, () => {
    const [c, g] = canvas(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - w / 2) / (w / 2), dy = (y + 0.5 - h / 2) / (h / 2); const lid = (1 - dx * dx) * (open === 0 ? 0.12 : (open === 1 ? 0.5 : 1));
      if (Math.abs(dy) > lid + 0.18) continue;
      let col = Math.abs(dy) > lid - 0.05 ? '#2a0806' : '#e8d8c0';
      if (open && Math.abs(dy) <= lid - 0.05) { const d = Math.hypot(dx * 1.6, dy); if (d < 0.62) col = d < 0.2 ? '#140202' : (d < 0.42 ? '#d02010' : '#ff7a28'); if (Math.abs(dx) < 0.06 && Math.abs(dy) < 0.6) col = '#000000'; }
      px(g, x, y, col);
    }
    return toTexture(c, false);
  });
}

// Crag: raw rock (no masonry): broad light and dark planes, angular fractures, a speckle of lichen.
export function crag(seed = 42, tone = '#4c5462') {
  return cached('crag' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 16), n2 = vnoise(seed + 5, W, H, 6);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let f = 0.78 + n1(x, y) * 0.3 + n2(x, y) * 0.08; f = Math.round(f * 14) / 14; g.fillStyle = shade(tone, f); g.fillRect(x, y, 1, 1); }
    for (let k = 0; k < 10; k++) {
      let x = r() * W, y = r() * H; const a0 = r() < 0.5 ? 0.3 : 1.3; let a = a0;
      for (let s = 0; s < 10 + r() * 16; s++) { px(g, ((x | 0) + W) % W, ((y | 0) + H) % H, shade(tone, 0.48)); px(g, ((x | 0) + W) % W, ((y | 0) - 1 + H) % H, shade(tone, 1.2)); a = a0 + (r() - 0.5) * 0.8; x += Math.cos(a); y += Math.sin(a); }
    }
    speckle(g, r, W, H, [shade('#6a7458', 0.9), shade(tone, 0.6)], 0.012);
    return toTexture(c);
  });
}

// ================================================================ Act III: the Wheel
// Marsh mud: black-green silt, wet hollows holding a skin of water that glints, a crust of pale dried
// silt in cracks on the rises, rotten leaves and root threads.
export function mud(seed = 51, tone = '#2e3226') {
  return cached('mud' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 16), n2 = vnoise(seed + 2, W, H, 6);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = n1(x, y) * 0.75 + n2(x, y) * 0.25; let f;
      if (v < 0.34) f = 0.62 + v * 0.3;               // wet hollow
      else f = 0.86 + v * 0.26 + (r() - 0.5) * 0.05;  // the rise
      f = Math.round(f * 16) / 16; g.fillStyle = shade(tone, f); g.fillRect(x, y, 1, 1);
      if (v < 0.3 && r() < 0.03) px(g, x, y, '#6a7a78');          // a glint on the wet skin
    }
    for (let k = 0; k < 9; k++) { // cracks in the dried crust
      let x = r() * W, y = r() * H, a = r() * 6.3; for (let s = 0; s < 6 + r() * 8; s++) { if (n1(x | 0, y | 0) > 0.42) px(g, ((x | 0) + W) % W, ((y | 0) + H) % H, shade(tone, 0.55)); a += (r() - 0.5) * 1.2; x += Math.cos(a); y += Math.sin(a); }
    }
    for (let k = 0; k < 14; k++) { const x = (r() * W) | 0, y = (r() * H) | 0; px(g, x, y, '#4a3a22'); if (r() < 0.5) px(g, (x + 1) % W, y, '#3a2c1a'); } // rotten leaves
    speckle(g, r, W, H, [shade('#4e5a34', 0.9), shade(tone, 1.25)], 0.012);
    return toTexture(c);
  });
}

// Moss: a deep pelt in clumps, lit crowns and dark hollows between them, sprigs of paler growth.
export function moss(seed = 52, tone = '#3a4630') {
  return cached('moss' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 8), n2 = vnoise(seed + 4, W, H, 3);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = n1(x, y) * 0.6 + n2(x, y) * 0.4; let f = 0.6 + v * 0.62; if (n2(x, (y + 1) % H) > n2(x, y) + 0.08) f *= 1.12;
      f = Math.round(f * 14) / 14; g.fillStyle = shade(tone, f); g.fillRect(x, y, 1, 1);
    }
    for (let k = 0; k < 40; k++) { const x = (r() * W) | 0, y = (r() * H) | 0; px(g, x, y, shade('#7a8a4a', 0.8 + r() * 0.3)); px(g, x, (y + 1) % H, shade(tone, 0.6)); }
    return toTexture(c);
  });
}

// Rotten boards (they run along X): grey-brown planks with dark gaps, soft black rot at the ends,
// moss creeping along the seams, rusted nail heads and the odd board gone.
export function rotwood(seed = 53, tone = '#4c4236') {
  return cached('rotwood' + seed + tone, () => {
    const W = 64, H = 32; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 8);
    for (let b = 0; b < 6; b++) {
      const y0 = Math.round(b * H / 6), y1 = Math.round((b + 1) * H / 6); const f = 0.78 + r() * 0.3, gone = r() < 0.08; const j = (r() * W) | 0;
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
        const seam = y === y1 - 1, xj = (x - j + W) % W; let col;
        if (gone) col = '#06080a';
        else if (seam) col = r() < 0.25 ? '#3e4a2a' : shade(tone, 0.38);
        else {
          let k = f * (0.9 + n1(x, y) * 0.18) * (y === y0 ? 1.12 : 1); if (xj < 2) k *= 0.5; // butt joint
          if (xj < 7 && n1(x, y) < 0.45) k *= 0.62;                                          // rot at the board's end
          if (((x * 3 + y * 7 + b) % 11) === 0) k *= 0.9;                                     // grain
          col = shade(tone, k);
        }
        px(g, x, y, col);
      }
      if (!gone) { px(g, (j + 3) % W, y0 + 1, '#5a3a24'); px(g, (j + W - 3) % W, y0 + 1, '#5a3a24'); }
    }
    for (let k = 0; k < 10; k++) { const x = (r() * W) | 0, y = ((r() * 6) | 0) * (H / 6) | 0; for (let i = 0; i < 3 + r() * 4; i++) px(g, (x + i) % W, (y + (r() < 0.5 ? 0 : 1)) % H, shade('#55663a', 0.8 + r() * 0.4)); }
    return toTexture(c);
  });
}

// Brass plates (2 m panels): a lit top and left edge, shaded bottom and right, rivets round the edge,
// a brushed grain, scratches and blooms of green patina.
export function brass(seed = 54, tone = '#8a6a34') {
  return cached('brass' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 16);
    for (let py = 0; py < 2; py++) for (let pxi = 0; pxi < 2; pxi++) {
      const x0 = pxi * 32, y0 = py * 32, f = 0.86 + r() * 0.2;
      for (let y = y0; y < y0 + 32; y++) for (let x = x0; x < x0 + 32; x++) {
        const ex = x - x0, ey = y - y0; let k = f * (0.92 + n1(x, y) * 0.14) * (((y * 5 + (x >> 2)) % 7) === 0 ? 0.96 : 1);
        if (ex === 0 || ey === 0) k = f * 1.32; else if (ex === 31 || ey === 31) k = f * 0.46; else if (ex === 1 || ey === 1) k *= 1.1;
        px(g, x, y, shade(tone, k));
      }
      for (let i = 3; i < 32; i += 7) for (const [a, b] of [[i, 3], [i, 28], [3, i], [28, i]]) { px(g, x0 + a, y0 + b, shade(tone, 1.45)); px(g, x0 + a + 1, y0 + b + 1, shade(tone, 0.5)); }
    }
    for (let k = 0; k < 6; k++) { let x = r() * W, y = r() * H; const dx = r() * 2 - 1, dy = r() * 0.4; for (let s = 0; s < 5 + r() * 8; s++) { px(g, ((x | 0) + W) % W, ((y | 0) + H) % H, shade(tone, 1.3)); x += dx; y += dy; } }
    for (let k = 0; k < 7; k++) { const cx = r() * W, cy = r() * H, rr = 1 + r() * 2.5; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y) < rr && r() < 0.7) px(g, (((cx + x) | 0) + W) % W, (((cy + y) | 0) + H) % H, r() < 0.5 ? '#3e6a58' : '#2e5446'); }
    return toTexture(c);
  });
}

// An iron grating over the drop: bars and a frame, the gaps black-violet with the depth below.
export function grate(seed = 55, tone = '#3a3e48') {
  return cached('grate' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const frame = x < 2 || y < 2; const bar = x % 4 === 0 || y % 4 === 0;
      let col; if (frame) col = shade(tone, x === 0 || y === 0 ? 1.3 : 0.9); else if (bar) col = shade(tone, (y % 4 === 0 ? 1.15 : 0.85) * (0.9 + r() * 0.15)); else col = (x + y) % 2 ? '#0c0a14' : '#120e1c';
      px(g, x, y, col);
    }
    for (let k = 0; k < 8; k++) { const x = (r() * W) | 0, y = ((r() * 8) | 0) * 4; px(g, x, y, '#6a4a2a'); } // rust
    return toTexture(c);
  });
}

// Tread plate: steel with raised diamond lugs in alternate directions, panel seams and rivets.
export function tread(seed = 56, tone = '#4a4e5a') {
  return cached('tread' + seed + tone, () => {
    const W = 32, H = 32; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 8);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let k = 0.86 + n1(x, y) * 0.12; const cx = x % 4, cy = y % 4; const alt = ((x >> 2) + (y >> 2)) % 2;
      if ((alt ? cx === cy : cx === 3 - cy) && cx > 0 && cx < 3) k = 1.3; else if ((alt ? cx === cy + 1 : cx === 4 - cy) && cx > 1) k = 0.62;
      if (x === 0 || y === 0) k = 0.42; if (x === 1 || y === 1) k = 1.15;
      px(g, x, y, shade(tone, k));
    }
    for (const [a, b] of [[3, 3], [28, 3], [3, 28], [28, 28]]) { px(g, a, b, shade(tone, 1.5)); px(g, a + 1, b + 1, shade(tone, 0.45)); }
    speckle(g, r, W, H, ['#5a3e2a'], 0.01);
    return toTexture(c);
  });
}

// Heaven's marble: great white slabs (2 m) jointed with thin gold, soft grey veins and a few of gold.
export function marble(seed = 57, tone = '#d8d2c6') {
  return cached('marble' + seed + tone, () => {
    const W = 64, H = 64; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 16), n2 = vnoise(seed + 7, W, H, 32);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const slab = ((x >> 5) + (y >> 5) * 2); const vein = Math.abs(Math.sin((x * 0.21 + y * 0.13 + slab * 3) + n2(x, y) * 7));
      let k = 0.94 + n1(x, y) * 0.08 + (slab % 3) * 0.02; if (vein < 0.06) k = 0.78; else if (vein < 0.12) k = 0.88;
      k = Math.round(k * 24) / 24; px(g, x, y, shade(tone, k));
      if (vein < 0.04 && n1(x, y) > 0.62) px(g, x, y, '#c8a050');
    }
    for (let i = 0; i < W; i++) { px(g, i, 0, '#b08a3c'); px(g, i, 32, '#b08a3c'); px(g, 0, i, '#b08a3c'); px(g, 32, i, '#b08a3c'); px(g, i, 1, shade(tone, 1.06)); px(g, i, 33, shade(tone, 1.06)); }
    for (let k = 0; k < 10; k++) px(g, (r() * W) | 0, (r() * H) | 0, '#f4efe4');
    return toTexture(c);
  });
}

// Gilt: beaten gold with an engraved key pattern in a band, for trims, steps and kerbs.
export function gilt(seed = 58, tone = '#b08a3c') {
  return cached('gilt' + seed + tone, () => {
    const W = 32, H = 16; const [c, g] = canvas(W, H); const r = rng(seed); const n1 = vnoise(seed, W, H, 8);
    const KEY = ['11111111', '10000001', '10111101', '10100101', '10100001', '10111111', '10000000', '11111111'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let k = 0.9 + n1(x, y) * 0.2; if (y === 0) k = 1.35; else if (y === H - 1) k = 0.55;
      else if (y >= 4 && y < 12 && KEY[y - 4][x % 8] === '1') k *= 0.72;
      px(g, x, y, shade(tone, Math.round(k * 12) / 12));
    }
    for (let k = 0; k < 6; k++) px(g, (r() * W) | 0, 1 + ((r() * (H - 2)) | 0), '#fff0b8');
    return toTexture(c);
  });
}
