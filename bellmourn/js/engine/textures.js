// Procedural pixel textures. Every texture is drawn at 16 texels per world metre so that, with the
// camera at 16 buffer pixels per metre, one texel is one screen pixel. All are seeded: the same
// world looks the same every time.
import * as THREE from 'three';

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
        const f = 0.84 + r() * 0.26;
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
    const stone = '#6a7482', stoneLo = '#465060', glass = lit ? '#a86a30' : '#141a26', glass2 = lit ? '#d8a050' : '#1c2434', glass3 = lit ? '#6a2a3a' : '#182030';
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
