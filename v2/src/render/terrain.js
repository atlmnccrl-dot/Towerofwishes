// The terrain painter shared by the overworld and the battle arenas. A spec describes a piece of land
// (base textures, patches, rivers, lakes, roads, snow) and the painter fills a canvas pixel by pixel
// from the world atlas's tile textures, with organic edges, outlined shores and worn road verges.
// It also returns a class map so props can avoid water and roads.
//
//   const { canvas, cls } = paintTerrain(spec, w, h, atlasPixels, { scale: 1, seed: 7 })
//   cls[y * w + x]: 0 land, 1 water, 2 road, 3 shore rim, 4 patch
//
// spec: { base: [tex], patches: [{ tex: [tex], amount: 0..1, size }], water: { tex, rim, outline },
//         rivers: [{ pts: [[x, y]], w }], lakes: [{ x, y, rx, ry }], roads: [{ pts, w, tex: [tex], edge }],
//         snow: bool, tint: [r, g, b, amount] }

export const LAND = 0, WATER = 1, ROAD = 2, RIM = 3, PATCH = 4;

// the atlas page as raw pixels, read once
export function atlasPixels(atlas) {
  const img = atlas.pages[0], c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, sprites: atlas.data.sprites };
}

// a small value-noise field (smooth, seeded)
export function noise2(seed) {
  const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const s = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = s(x - x0), fy = s(y - y0);
    const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// a polyline made organic: subdivided, each point nudged sideways by noise
function wobble(pts, amp, seed) {
  const n = noise2(seed), out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.round(len / 12));
    const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
    for (let k = 0; k < steps; k++) {
      const t = k / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, o = (n(x / 40, y / 40) - 0.5) * 2 * amp;
      out.push([x + nx * o, y + ny * o]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function paintTerrain(spec, W, H, px, { scale = 1, seed = 7 } = {}) {
  const N = noise2(seed), N2 = noise2(seed + 11);
  // masks drawn with the canvas: water (rivers and lakes) and roads
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  const m = mask.getContext('2d', { willReadFrequently: true });
  m.lineCap = m.lineJoin = 'round';
  m.fillStyle = m.strokeStyle = '#f00';
  for (const r of spec.rivers || []) { const p = wobble(r.pts, r.w * 0.35, seed + 3); m.lineWidth = r.w; m.beginPath(); p.forEach(([x, y], i) => (i ? m.lineTo(x, y) : m.moveTo(x, y))); m.stroke(); }
  for (const l of spec.lakes || []) {
    m.beginPath();
    for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2, k = 0.82 + N(Math.cos(t) * 2 + l.x / 50, Math.sin(t) * 2 + l.y / 50) * 0.36; const x = l.x + Math.cos(t) * l.rx * k, y = l.y + Math.sin(t) * l.ry * k; a ? m.lineTo(x, y) : m.moveTo(x, y); }
    m.fill();
  }
  m.fillStyle = m.strokeStyle = '#0f0';
  for (const r of spec.roads || []) { const p = wobble(r.pts, r.w * 0.25, seed + 5); m.lineWidth = r.w; m.beginPath(); p.forEach(([x, y], i) => (i ? m.lineTo(x, y) : m.moveTo(x, y))); m.stroke(); }
  const md = m.getImageData(0, 0, W, H).data;
  const cls = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) cls[i] = md[i * 4 + 1] > 128 ? ROAD : md[i * 4] > 128 ? WATER : LAND;
  // patches of other ground, from noise
  const patchOf = new Int8Array(W * H).fill(-1);
  (spec.patches || []).forEach((p, pi) => {
    const sz = p.size || 60, P = noise2(seed + 20 + pi);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (cls[i] !== LAND) continue;
      if (P(x / sz, y / sz) + (N2(x / 6, y / 6) - 0.5) * 0.12 > 1 - (p.amount || 0.3)) { patchOf[i] = pi; cls[i] = PATCH; }
    }
  });
  // shores: land within two pixels of water is rim; water touching land gets the outline
  const near = (x, y, r, c) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && cls[yy * W + xx] === c) return true; } return false; };
  const shore = new Uint8Array(W * H);   // 1 rim (land side), 2 outline (water side), 3 road verge
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = cls[i];
    if ((c === LAND || c === PATCH) && near(x, y, 2 * scale, WATER)) shore[i] = 1;
    else if (c === WATER && near(x, y, 1, LAND) | near(x, y, 1, PATCH) | near(x, y, 1, ROAD)) shore[i] = 2;
    else if ((c === LAND || c === PATCH) && near(x, y, 1, ROAD)) shore[i] = 3;
  }
  // paint: textures sampled from the atlas, a different tile per 16-pixel cell
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const og = out.getContext('2d'), img = og.createImageData(W, H), d = img.data;
  const tex = (name) => px.sprites[name];
  const hash = (a, b) => { let n = Math.imul(a * 73856093 ^ b * 19349663 ^ seed, 2654435761); return (n >>> 0) / 4294967296; };
  const pick = (list, tx, ty) => tex(list[Math.floor(hash(tx, ty) * list.length)]);
  const water = spec.water || {}, rim = hex(water.rim || '#d8c48a'), outline = hex(water.outline || '#2b4650');
  const tint = spec.tint;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = cls[i];
    const sx = Math.floor(x / scale), sy = Math.floor(y / scale), tx = sx >> 4, ty = sy >> 4;
    let t;
    if (c === WATER) t = tex(water.tex || 't_water_1');
    else if (c === ROAD) t = pick((spec.roads[0] && spec.roads[0].tex) || ['t_dirt_1'], tx, ty);
    else if (c === PATCH) { const L = spec.patches[patchOf[i]].tex; t = tex(L[Math.floor(N(x / 90 + 50, y / 90) * L.length * 0.999)]); }   // one material per patch, not a quilt
    else t = pick(spec.base, tx, ty);
    let r = 0, g = 0, b = 0;
    if (t) { const u = sx % t[3], v = sy % t[4], k = ((t[2] + v) * px.w + t[1] + u) * 4; r = px.data[k]; g = px.data[k + 1]; b = px.data[k + 2]; }
    if (shore[i] === 1) [r, g, b] = mix([r, g, b], rim, 0.85);
    else if (shore[i] === 2) [r, g, b] = outline;
    else if (shore[i] === 3) [r, g, b] = mix([r, g, b], hex((spec.roads[0] && spec.roads[0].edge) || '#4a3a26'), 0.45);
    if (c === WATER) { const w = N2(x / 30 + seed, y / 9); if (w > 0.78 && (x + y) % 3 === 0) [r, g, b] = mix([r, g, b], [255, 255, 255], 0.35); }
    if (spec.snow && c !== WATER) { const l = (r * 0.3 + g * 0.59 + b * 0.11) / 255; [r, g, b] = c === ROAD ? [150 + l * 60, 160 + l * 60, 175 + l * 60] : [190 + l * 65, 200 + l * 55, 215 + l * 40]; }
    if (tint) [r, g, b] = mix([r, g, b], tint, tint[3]);
    const o = i * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  return { canvas: out, cls, W, H };
}
function hex(h) { if (Array.isArray(h)) return h; const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
