// Act I textures of their own, one family per district, so no two districts share their ground, walls
// or roofs: herringbone brick and timber framing (Lantern Row), dock boards, clapboard and tarred
// pilings (Mirewater), granite setts and riveted plate, cinders and soot brick (the Foundry), a pale
// marble pavement with black diamond inlay and stucco (the Crown Heights), scaffold boards (the Belfry),
// cell-block stone (the gaol at Gallows Gate). Same rules as engine/textures.js: 16 texels per metre,
// seeded, nearest filtering, `userData.worldSize` for the world-mapped materials.
import * as THREE from '../../vendor/three.module.min.js';

const TPM = 16;
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// A tiny pixel canvas written through ImageData (fast), shaded from one base tone.
function sheet(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const img = g.createImageData(W, H); const d = img.data;
  const set = (x, y, rgb, f = 1) => { x = ((x % W) + W) % W; y = ((y % H) + H) % H; const i = (y * W + x) * 4; d[i] = Math.max(0, Math.min(255, rgb[0] * f)); d[i + 1] = Math.max(0, Math.min(255, rgb[1] * f)); d[i + 2] = Math.max(0, Math.min(255, rgb[2] * f)); d[i + 3] = 255; };
  const done = () => { g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.worldSize = [W / TPM, H / TPM]; return t; };
  return { set, done };
}
const cache = new Map();
const once = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };
const q = (f, n = 16) => Math.round(f * n) / n; // banded shading: reads as pixel art, not noise

// Brick paving laid in running bond, warm and worn, a soldier course every 2 m: Lantern Row's street.
export function herring(seed = 101, tone = '#6a4636') {
  return once('herr' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.set(x, y, b, 0.46);
    for (let row = 0; row < 8; row++) {
      const soldier = row === 0; const off = (row % 2) * 4;
      for (let bx = -1; bx < (soldier ? 9 : 5); bx++) {
        const f = 0.8 + r() * 0.3; const bw = soldier ? 4 : 8; const x0 = soldier ? bx * 4 : bx * 8 + off;
        for (let y = row * 4; y < row * 4 + 3; y++) for (let x = x0; x < x0 + bw - 1; x++) S.set(x, y, b, q(f * (y === row * 4 ? 1.14 : 1) * (soldier ? 0.9 : 1), 12));
      }
    }
    for (let i = 0; i < 10; i++) S.set((r() * W) | 0, (r() * H) | 0, [40, 30, 22]);
    return S.done();
  });
}

// Timber framing: dark oak posts, rails and braces over warm plaster panels (2 m square bays).
export function timberFrame(seed = 102, tone = '#b89a70', beam = '#3a2618') {
  return once('tfr' + seed + tone + beam, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), p = hex(tone), w = hex(beam);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.set(x, y, p, q(0.86 + r() * 0.14));
    const beamAt = (x, y) => { if (x < 2 || x > 29 || y < 2 || y > 29) return true; if (y >= 15 && y <= 16) return true; const d = Math.abs((x - 2) - (y - 2) * 27 / 13); return y < 15 && d < 1.6; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (beamAt(x, y)) S.set(x, y, w, q((0.85 + r() * 0.25) * (x % 31 === 0 || y % 31 === 0 ? 0.7 : 1)));
    // pegs, plaster cracks
    for (const [x, y] of [[1, 1], [30, 1], [1, 15], [30, 15], [1, 30], [30, 30]]) S.set(x, y, [200, 170, 120]);
    for (let k = 0; k < 3; k++) { let x = 6 + ((r() * 20) | 0), y = 18 + ((r() * 8) | 0); for (let i = 0; i < 5; i++) { S.set(x, y, p, 0.6); x += (r() * 3 | 0) - 1; y++; } }
    return S.done();
  });
}

// Wide dock boards, salt-grey and wet, with gaps and nail heads.
export function boards(seed = 103, tone = '#5a5048') {
  return once('brd' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    const pw = 5; // 0.31 m planks running along X
    for (let y0 = 0; y0 < H; y0 += pw) {
      const f = 0.78 + r() * 0.3; const joint = (r() * W) | 0;
      for (let y = y0; y < Math.min(H, y0 + pw); y++) for (let x = 0; x < W; x++) {
        let k = f * (0.93 + r() * 0.1); if (y === y0 + pw - 1) k = 0.32; else if (y === y0) k *= 1.14;
        if (x === joint && y !== y0 + pw - 1) k = 0.45;
        if (r() < 0.04) k *= 0.82; // grain
        S.set(x, y, b, q(k));
      }
      for (const nx of [(joint + 2) % W, (joint + 14) % W, (joint + 26) % W]) S.set(nx, y0 + 1, [26, 24, 22]);
    }
    return S.done();
  });
}

// Square granite setts in straight courses: hard quay and yard paving.
export function setts(seed = 104, tone = '#5a5c60') {
  return once('set' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.set(x, y, b, 0.38);
    for (let row = 0; row < 8; row++) { const off = (row & 1) * 2; for (let col = -1; col < 9; col++) {
      const f = 0.8 + r() * 0.32; const x0 = col * 4 + off, y0 = row * 4;
      for (let y = y0; y < y0 + 3; y++) for (let x = x0; x < x0 + 3; x++) S.set(x, y, b, q(f * (y === y0 ? 1.15 : (x === x0 + 2 ? 0.8 : 1)) * (0.94 + r() * 0.1)));
    } }
    return S.done();
  });
}

// Riveted iron floor plates with a raised diamond tread, soot in the seams.
export function plate(seed = 105, tone = '#4a4440') {
  return once('plt' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let k = 0.86 + r() * 0.08; const ex = x % 16, ey = y % 16;
      if (ex === 0 || ey === 0) k = 0.4; else if (ex === 1 || ey === 1) k = 1.1;
      else if (((x + y) % 4 === 0 && (x - y + 64) % 8 < 2)) k = 1.14;
      if ((ex === 2 || ex === 14) && (ey === 2 || ey === 14)) k = 1.35;
      S.set(x, y, b, q(k));
    }
    for (let i = 0; i < 30; i++) S.set((r() * W) | 0, (r() * H) | 0, [92, 52, 30]); // rust
    return S.done();
  });
}

// Cinders: black clinker and ash with the odd glowing coal (the foundry yards).
export function cinder(seed = 106, tone = '#2e2826') {
  return once('cin' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.set(x, y, b, q(0.82 + r() * 0.3, 6));
    for (let i = 0; i < 26; i++) { const x = (r() * W) | 0, y = (r() * H) | 0; S.set(x, y, b, 1.6); S.set(x + 1, y, b, 1.3); S.set(x, y + 1, b, 0.5); }
    for (let i = 0; i < 5; i++) S.set((r() * W) | 0, (r() * H) | 0, [214, 96, 34]);
    return S.done();
  });
}

// The Heights' pavement: pale veined marble slabs with a black diamond inlay at every crossing.
export function inlay(seed = 107, tone = '#cfc8bc', ink = '#1c1a20') {
  return once('inl' + seed + tone + ink, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone), k2 = hex(ink), gold = [176, 138, 60];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = Math.abs(Math.sin(x * 0.31 + y * 0.17 + Math.sin(y * 0.2) * 2)); let f = 0.93 + r() * 0.05; if (v < 0.07) f = 0.8;
      if (x % 16 === 0 || y % 16 === 0) f = 0.62;
      S.set(x, y, b, q(f));
      const dx = Math.abs(((x + 8) % 16) - 8), dy = Math.abs(((y + 8) % 16) - 8);
      if (dx + dy <= 3) S.set(x, y, k2, dx + dy === 3 ? 1.6 : 1); else if (dx + dy === 4) S.set(x, y, gold);
    }
    return S.done();
  });
}

// Stucco: smooth lime render, faintly warm, with rusticated joints every metre (palaces, villas).
export function stucco(seed = 108, tone = '#bdb4a6') {
  return once('stu' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let f = 0.9 + r() * 0.07; if (y % 16 === 0) f = 0.66; else if (y % 16 === 1) f = 1.06; if (y % 32 < 16 ? x === 0 : x === 16) f = 0.72; S.set(x, y, b, q(f)); }
    return S.done();
  });
}

// Clapboard: overlapping weatherboards, tarred or limewashed (dock sheds and warehouses).
export function clapboard(seed = 109, tone = '#3e3a34') {
  return once('clp' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y0 = 0; y0 < H; y0 += 4) { const f = 0.85 + r() * 0.22; for (let y = y0; y < y0 + 4; y++) for (let x = 0; x < W; x++) S.set(x, y, b, q(f * (y === y0 + 3 ? 1.3 : (y === y0 ? 0.55 : 1)) * (0.95 + r() * 0.08))); }
    for (let k = 0; k < 4; k++) { const x = (r() * W) | 0; for (let y = 0; y < H; y++) if (r() < 0.7) S.set(x, y, b, 0.75); } // streaks
    return S.done();
  });
}

// Corrugated iron: rusted ribs (shed roofs at the docks and the foundry).
export function corrugated(seed = 110, tone = '#5a4a3e') {
  return once('cor' + seed + tone, () => {
    const W = 16, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const ph = x % 4; let f = [1.18, 1.0, 0.72, 0.88][ph]; if (r() < 0.06) f *= 0.7; S.set(x, y, b, q(f)); }
    for (let i = 0; i < 20; i++) S.set((r() * W) | 0, (r() * H) | 0, [120, 62, 30]);
    return S.done();
  });
}

// Clay roof tiles, ochre and red (Lantern Row's roofs).
export function tiles(seed = 111, tone = '#7a3e2a') {
  return once('til' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let row = 0; row < 8; row++) { const off = (row & 1) * 2; for (let col = -1; col < 9; col++) {
      const f = 0.78 + r() * 0.34; for (let y = row * 4; y < row * 4 + 4; y++) for (let x = col * 4 + off; x < col * 4 + off + 4; x++) {
        const ex = ((x - off) % 4 + 4) % 4, ey = y - row * 4; let k = f * (ex === 0 ? 1.2 : ex === 3 ? 0.6 : 1) * (ey === 3 ? 0.55 : 1); S.set(x, y, b, q(k));
      } } }
    return S.done();
  });
}

// Prison stone: big rough-hewn blocks, dark with seepage (the gaol).
export function gaolStone(seed = 112, tone = '#3c4048') {
  return once('gst' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.set(x, y, b, 0.4);
    for (let row = 0; row < 3; row++) { const hgt = [10, 11, 11][row]; const y0 = [0, 10, 21][row]; let x0 = row === 1 ? -6 : 0;
      while (x0 < W) { const w = 9 + ((r() * 8) | 0); const f = 0.78 + r() * 0.3;
        for (let y = y0; y < y0 + hgt - 1; y++) for (let x = x0; x < x0 + w - 1; x++) { let k = f * (0.88 + r() * 0.2); if (y === y0) k *= 1.2; if (x === x0 + w - 2) k *= 0.75; S.set(x, y, b, q(k, 10)); }
        x0 += w; } }
    for (let k = 0; k < 3; k++) { const x = (r() * W) | 0; for (let y = (r() * 10) | 0; y < H; y++) if (r() < 0.8) S.set(x, y, [30, 40, 34]); }
    return S.done();
  });
}

// Red factory brick, sooted toward the top, with a blue engineering-brick course.
export function redBrick(seed = 113, tone = '#6a3426') {
  return once('rbk' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone), blue = hex('#2c2a34');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.set(x, y, [58, 48, 44]);
    for (let row = 0; row < 8; row++) { const off = (row & 1) * 4; const c = row === 5 ? blue : b; for (let bx = -1; bx < 5; bx++) {
      const f = 0.78 + r() * 0.34; for (let y = row * 4; y < row * 4 + 3; y++) for (let x = bx * 8 + off; x < bx * 8 + off + 7; x++) { if (x < 0 || x >= W) continue; S.set(x, y, c, q(f * (y === row * 4 ? 1.12 : 1) * (0.94 + r() * 0.1))); }
    } }
    for (let k = 0; k < 40; k++) S.set((r() * W) | 0, (r() * 10) | 0, [24, 20, 20]); // soot
    return S.done();
  });
}

// Weathered sea-wall stone, green with weed at the foot (the docks' quays and sea walls).
export function seaStone(seed = 114, tone = '#4a5450') {
  return once('sea' + seed + tone, () => {
    const W = 32, H = 32, S = sheet(W, H), r = rng(seed), b = hex(tone), weed = [40, 62, 44];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.set(x, y, b, 0.42);
    for (let row = 0; row < 4; row++) { const off = (row & 1) * 8; for (let bx = -1; bx < 3; bx++) { const f = 0.8 + r() * 0.3;
      for (let y = row * 8; y < row * 8 + 7; y++) for (let x = bx * 16 + off; x < bx * 16 + off + 15; x++) { if (x < 0 || x >= W) continue; S.set(x, y, b, q(f * (0.9 + r() * 0.16))); }
    } }
    for (let i = 0; i < 60; i++) { const x = (r() * W) | 0, y = 20 + ((r() * 12) | 0); S.set(x, y, weed); }
    return S.done();
  });
}
