// Bannerborn — atlas loading, recolouring and drawing of characters, props and effects.
(function () {
  const BB = window.BB;
  const A = BB.A = { chars: {}, env: {}, fx: null, tinted: {} };
  const CELL = 128, FOOT_X = 64, FOOT_Y = 90;
  BB.ENV_DRAW = 0.9;            // env atlases are baked at 0.5; drawn at 0.9 => 0.45 of source
  BB.TW = 128 * 0.45; BB.TH = 64 * 0.45;

  function loadImg(src) {
    return new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('img ' + src)); im.src = src;
    });
  }
  async function loadAtlas(path) {
    const [img, meta] = await Promise.all([loadImg(path + '.webp'), fetch(path + '.json').then((r) => r.json())]);
    // Decode now, while a loading screen is up. A browser otherwise unpacks a sheet the first time something is drawn
    // from it: in the middle of a fight, the frame a new kind of foe walks in.
    let bmp = null;
    if (window.createImageBitmap) bmp = await createImageBitmap(img).catch(() => null);
    else if (img.decode) await img.decode().catch(() => null);
    return { img: bmp || img, meta };
  }
  const pending = {};
  BB.loadChar = function (key) {
    if (A.chars[key]) return Promise.resolve(A.chars[key]);
    if (!pending[key]) pending[key] = loadAtlas('assets/chars/' + key).then((a) => (A.chars[key] = a));
    return pending[key];
  };
  // ---------------------------------------------------------------- lands made from the same art
  // A skin is the vale kit and the ground kit re-coloured sprite by sprite when a land is first entered: snow laid on
  // whatever faces the sky, crowns of trees turned, stone cooled or charred, the ground's own texture kept in new
  // colours. Nothing is downloaded: 'frost' is built from 'vale', 'frost.ground' from 'ground'. Every sprite keeps its
  // name, so every map, building and journey that works in the vale works in a skinned land.
  const c01 = (x) => Math.max(0, Math.min(1, x));
  const lumOf = (p, i) => (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255;
  const hash = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
  const setc = (p, i, c) => { p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; };
  const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  function each(p, W, r, fn) { for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0], i = (y * W + x) * 4; x < r[0] + r[2]; x++, i += 4) if (p[i + 3] > 40) fn(i, x - r[0], y - r[1], x, y); }
  function pct(p, W, r, mask, lo, hi) { // the brightness at two percentiles of a sprite's (masked) pixels
    const h = new Uint32Array(256); let n = 0; each(p, W, r, (i, x, y) => { if (!mask || mask(i, x, y)) { h[Math.round(lumOf(p, i) * 255)]++; n++; } });
    if (!n) return null; let a = 0, vlo = -1, vhi = 255;
    for (let v = 0; v < 256; v++) { a += h[v]; if (vlo < 0 && a >= n * lo) vlo = v; if (a >= n * hi) { vhi = v; break; } }
    return [vlo / 255, Math.max(vhi, vlo + 2) / 255];
  }
  const SK = {
    // the same texture in new colours: darkest pixels to lo, lightest to hi
    ramp(p, W, r, lo, hi) { const q = pct(p, W, r, null, 0.04, 0.97); if (q) each(p, W, r, (i) => setc(p, i, mixc(lo, hi, c01((lumOf(p, i) - q[0]) / (q[1] - q[0]))))); },
    // toward grey, then each channel scaled: stone cooled, wood charred
    tint(p, W, r, grey, mul) { each(p, W, r, (i) => { const g = lumOf(p, i) * 255; for (let c = 0; c < 3; c++) p[i + c] = Math.min(255, (p[i + c] * (1 - grey) + g * grey) * mul[c]); }); },
    // a tree: the lit clumps of its crown take the top colours, its shade the dark ones; the trunk is left alone
    crown(p, W, r, dark, lo, hi, cut) {
      const H = r[3], leaf = (i, x, y) => { const R = p[i], G = p[i + 1], B = p[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B); return mx > 0 && (mx - mn) / mx > 0.25 && y < H * 0.8 && !(R > G * 1.25 && lumOf(p, i) < 0.3 && y > H * 0.6); };
      const q = pct(p, W, r, leaf, cut, 0.93); if (!q) return;
      each(p, W, r, (i, x, y) => { if (!leaf(i, x, y)) return; const l = lumOf(p, i), t = (l - q[0]) / (q[1] - q[0]); setc(p, i, t > 0.02 ? mixc(lo, hi, c01(t)) : mixc(dark[0], dark[1], c01(l * 2.2))); });
    },
    // something lying on whatever faces the sky: the top few pixels of every column
    cap(p, W, r, d0, d1, lo, hi) {
      for (let x = r[0]; x < r[0] + r[2]; x++) {
        const yEnd = r[1] + r[3]; let y = r[1]; while (y < yEnd && p[(y * W + x) * 4 + 3] <= 40) y++; if (y >= yEnd) continue;
        let e = y; while (e + 1 < yEnd && p[((e + 1) * W + x) * 4 + 3] > 40) e++;
        const d = Math.min(d0 + Math.floor(hash(x, r[1]) * (d1 - d0 + 1)), Math.max(1, Math.floor((e - y) / 3)));
        for (let k = 0; k < d; k++) { const i = ((y + k) * W + x) * 4; setc(p, i, mixc(hi, lo, d > 1 ? k / (d - 1) * 0.6 : 0)); p[i + 3] = 255; }
      }
    },
    // a dusting: the lightest part of a sprite goes toward a colour
    dust(p, W, r, from, amount, col) { const q = pct(p, W, r, null, from, 0.97); if (q) each(p, W, r, (i) => { const t = c01((lumOf(p, i) - q[0]) / (q[1] - q[0])) * amount; if (t > 0) setc(p, i, mixc([p[i], p[i + 1], p[i + 2]], col, c01(t))); }); },
    // the darkest part (the gaps between stones) glows
    cracks(p, W, r, upTo, lo, hi) { const q = pct(p, W, r, null, 0.01, upTo); if (q) each(p, W, r, (i) => { const l = lumOf(p, i); if (l <= q[1]) setc(p, i, mixc(hi, lo, c01((l - q[0]) / (q[1] - q[0])))); }); },
    // a scatter of single pixels: embers in a burnt crown, spores on a stone
    specks(p, W, r, chance, col, minL) { each(p, W, r, (i, x, y, ax, ay) => { if (hash(ax, ay) < chance && lumOf(p, i) >= (minL || 0)) setc(p, i, col); }); },
  };
  const kindOf = (n) => /^Tree Shadow|^Torch|^Chest|^Door|^FirePlace|^Misc D/.test(n) ? 'keep' : /^TreeTrunk|^Stone/.test(n) ? 'stone' : /^Tree/.test(n) ? 'tree' : /^Flora/.test(n) ? 'flora'
    : /^Roof/.test(n) ? 'roof' : /^Wall/.test(n) ? 'wall' : /^Ground A1_/.test(n) ? 'dirt' : /^Ground A/.test(n) ? 'grass' : /^Ground [DEH]/.test(n) ? 'paved' : /^Ground/.test(n) ? 'earth' : 'misc';
  BB.LANDSKINS = {
    frost: { bg: '#3b4658', haze: 'rgba(40,70,120,0.08)', weather: 'snow',
      pal: { base: [214, 224, 238], alt: [226, 234, 246], path: [150, 160, 176], water: [130, 178, 208], floor: [150, 156, 170], dark: [150, 170, 200], light: [250, 252, 255] },
      apply(p, W, r, k) {
        if (k === 'tree') SK.crown(p, W, r, [[18, 40, 44], [60, 96, 100]], [150, 176, 204], [250, 252, 255], 0.48);
        else if (k === 'flora') SK.ramp(p, W, r, [112, 142, 172], [246, 250, 255]);
        else if (k === 'dirt' || k === 'earth') SK.ramp(p, W, r, [150, 170, 200], [234, 241, 252]);
        else if (k === 'grass') SK.ramp(p, W, r, [156, 178, 208], [250, 252, 255]);
        else if (k === 'paved') { SK.tint(p, W, r, 0.7, [0.94, 1, 1.1]); SK.dust(p, W, r, 0.6, 0.8, [240, 246, 255]); }
        else { SK.tint(p, W, r, k === 'misc' ? 0.25 : 0.4, [0.94, 1, 1.08]); if (k === 'roof') SK.dust(p, W, r, 0.35, 0.85, [238, 244, 255]); SK.cap(p, W, r, k === 'misc' ? 1 : 3, k === 'wall' ? 6 : k === 'misc' ? 3 : 5, [200, 216, 238], [250, 252, 255]); }
      } },
    ash: { bg: '#171212', haze: 'rgba(120,30,0,0.10)', weather: 'cinders',
      pal: { base: [70, 64, 62], alt: [84, 78, 74], path: [52, 48, 48], water: [214, 92, 24], floor: [70, 68, 70], dark: [28, 24, 24], light: [170, 110, 70] },
      apply(p, W, r, k) {
        if (k === 'tree') { SK.crown(p, W, r, [[14, 12, 12], [44, 38, 36]], [50, 44, 42], [112, 100, 92], 0.4); SK.specks(p, W, r, 0.03, [255, 150, 40], 0.12); }
        else if (k === 'flora') SK.ramp(p, W, r, [30, 26, 24], [128, 112, 96]);
        else if (k === 'dirt' || k === 'earth') SK.ramp(p, W, r, [28, 26, 28], [92, 86, 86]);
        else if (k === 'grass') { SK.ramp(p, W, r, [40, 38, 40], [124, 118, 116]); SK.specks(p, W, r, 0.006, [255, 140, 40]); }
        else if (k === 'paved') { SK.tint(p, W, r, 0.75, [0.62, 0.58, 0.58]); SK.cracks(p, W, r, 0.2, [150, 40, 8], [255, 170, 50]); }
        else { SK.tint(p, W, r, k === 'roof' ? 0.7 : 0.5, k === 'roof' ? [0.5, 0.45, 0.44] : [0.8, 0.72, 0.68]); if (k !== 'misc') SK.cap(p, W, r, 1, 2, [120, 114, 108], [176, 170, 162]); if (k === 'roof') SK.specks(p, W, r, 0.012, [255, 130, 30]); }
      } },
    mire: { bg: '#121a13', haze: 'rgba(20,60,30,0.12)', weather: 'spores',
      pal: { base: [52, 62, 44], alt: [62, 72, 46], path: [62, 56, 42], water: [30, 58, 56], floor: [78, 84, 76], dark: [18, 30, 28], light: [104, 124, 70] },
      apply(p, W, r, k) {
        if (k === 'tree') SK.crown(p, W, r, [[8, 20, 22], [22, 46, 44]], [34, 72, 62], [104, 134, 84], 0.3);
        else if (k === 'flora') SK.ramp(p, W, r, [24, 46, 34], [150, 170, 84]);
        else if (k === 'dirt' || k === 'earth') SK.ramp(p, W, r, [34, 30, 24], [92, 82, 58]);
        else if (k === 'grass') SK.ramp(p, W, r, [28, 42, 36], [98, 108, 60]);
        else if (k === 'paved') { SK.tint(p, W, r, 0.5, [0.7, 0.82, 0.7]); SK.dust(p, W, r, 0.7, 0.5, [112, 140, 70]); }
        else { SK.tint(p, W, r, 0.35, [0.8, 0.94, 0.8]); if (k !== 'misc') SK.cap(p, W, r, 2, 4, [58, 96, 44], [128, 158, 72]); }
      } },
    blight: { bg: '#181222', haze: 'rgba(90,30,140,0.10)', weather: 'motes',
      pal: { base: [92, 78, 104], alt: [108, 92, 120], path: [76, 66, 86], water: [84, 44, 130], floor: [96, 90, 108], dark: [40, 30, 54], light: [196, 166, 216] },
      apply(p, W, r, k) {
        if (k === 'tree') { SK.crown(p, W, r, [[26, 18, 36], [70, 52, 90]], [150, 124, 170], [240, 226, 246], 0.42); SK.specks(p, W, r, 0.012, [224, 130, 255], 0.2); }
        else if (k === 'flora') SK.ramp(p, W, r, [50, 36, 66], [220, 196, 232]);
        else if (k === 'dirt' || k === 'earth') SK.ramp(p, W, r, [44, 36, 52], [124, 108, 130]);
        else if (k === 'grass') SK.ramp(p, W, r, [56, 44, 70], [148, 128, 162]);
        else if (k === 'paved') SK.tint(p, W, r, 0.7, [0.86, 0.8, 0.98]);
        else { SK.tint(p, W, r, k === 'roof' ? 0.7 : 0.55, k === 'roof' ? [0.62, 0.5, 0.74] : [0.94, 0.86, 1.06]); if (k === 'stone' || k === 'wall') SK.specks(p, W, r, 0.008, [214, 130, 255], 0.25); }
      } },
  };
  function skinAtlas(a, S) {
    const c = document.createElement('canvas'); c.width = a.img.width; c.height = a.img.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(a.img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data, done = new Set();
    for (const n in a.meta.f) { const r = a.meta.f[n], key = r[0] + ',' + r[1]; if (done.has(key) || r[2] < 2) continue; done.add(key); const k = kindOf(n); if (k !== 'keep') S.apply(p, c.width, r, k); }
    x.putImageData(d, 0, 0);
    const out = (img) => ({ img, meta: a.meta });
    return window.createImageBitmap ? createImageBitmap(c).then(out, () => out(c)) : out(c);
  }
  let skinOrder = []; // the two lands most lately entered keep their art; an older one is built again if it is visited
  BB.loadEnv = function (biome) {
    if (A.env[biome]) return Promise.resolve(A.env[biome]);
    const dot = biome.indexOf('.'), sk = BB.LANDSKINS[dot < 0 ? biome : biome.slice(0, dot)];
    if (!pending['env' + biome]) pending['env' + biome] = (sk ? BB.loadEnv(dot < 0 ? 'vale' : 'ground').then((a) => skinAtlas(a, sk)) : loadAtlas('assets/env/' + biome)).then((a) => (A.env[biome] = a));
    return pending['env' + biome];
  };
  // everything a land's maps draw from: its kit, the vale kit and the ground kit, and its skin if it has one
  BB.loadLand = function (region) {
    const list = [BB.loadEnv(region.biome || 'vale'), BB.loadEnv('vale'), BB.loadEnv('ground')], s = region.skin;
    if (s) {
      list.push(BB.loadEnv(s), BB.loadEnv(s + '.ground'));
      skinOrder = skinOrder.filter((k) => k !== s); skinOrder.push(s);
      while (skinOrder.length > 2) { const old = skinOrder.shift(); for (const k of [old, old + '.ground']) { delete A.env[k]; delete pending['env' + k]; } }
    }
    return Promise.all(list);
  };
  BB.landReady = (region) => !region.skin || !!(A.env[region.skin] && A.env[region.skin + '.ground']);
  BB.loadFx = function () {
    if (A.fx) return Promise.resolve(A.fx);
    if (!pending.fx) pending.fx = loadAtlas('assets/fx/fx').then((a) => (A.fx = a));
    return pending.fx;
  };
  BB.loadOther = function () {
    if (A.other) return Promise.resolve(A.other);
    if (!pending.other) pending.other = loadAtlas('assets/fx/other').then((a) => (A.other = a));
    return pending.other;
  };
  BB.loadPortraits = function () {
    if (A.portraits) return Promise.resolve(A.portraits);
    if (!pending.portraits) pending.portraits = loadAtlas('assets/chars/h/portraits').then((a) => (A.portraits = a)).catch(() => null);
    return pending.portraits;
  };
  BB.ROSTER = [];
  BB.loadRoster = function () {
    if (pending.roster) return pending.roster;
    pending.roster = fetch('assets/chars/h/roster.json').then((r) => r.json()).then((j) => (BB.ROSTER = j)).catch(() => (BB.ROSTER = []));
    return pending.roster;
  };
  // roster keys for a foe pool: skel, skelshield, skelarcher, wraith, warlock, beast
  BB.poolKeys = function (pool) {
    return BB.ROSTER.filter((c) => (pool === 'beast' ? c.arch === 'beastfolk' : c.foe === pool)).map((c) => 'h/' + c.key);
  };
  BB.npcKeys = () => BB.ROSTER.filter((c) => c.role === 'npc').map((c) => 'h/' + c.key);
  BB.loadBase = function (onProgress) {
    const list = ['body', 'hair', 'helm', 'chestA', 'chestB', 'legsA', 'legsB', 'sword', 'axe', 'shield', 'slash'];
    let done = 0; const total = list.length + 2;
    const tick = () => { done++; onProgress && onProgress(done / total); };
    return Promise.all(list.map((k) => BB.loadChar(k).then(tick)).concat([BB.loadFx().then(tick), BB.loadEnv('vale').then(tick), BB.loadEnv('ground'), BB.loadOther(), BB.loadRoster()]));
  };

  // ---- colour helpers
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    }
    return [h, s, l];
  }
  function hue2(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
  function hsl2rgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s <= 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [Math.round(hue2(p, q, h + 1 / 3) * 255), Math.round(hue2(p, q, h) * 255), Math.round(hue2(p, q, h - 1 / 3) * 255)];
  }
  BB.hsl2rgb = hsl2rgb;

  // spec: {mode:'rot'|'col'|'skin', rot, col:{h,s}, l, h, s}
  function recolor(img, spec, pal) { // pal: a colour table to keep between calls for the same recolouring (pixel art repeats its colours)
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    const cache = pal || new Map();
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] === 0) continue;
      const key = (p[i] << 16) | (p[i + 1] << 8) | p[i + 2];
      let out = cache.get(key);
      if (!out) {
        let [h, s, l] = rgb2hsl(p[i], p[i + 1], p[i + 2]);
        if (spec.mode === 'skin') { h += spec.h; s *= spec.s; l = Math.min(1, l * spec.l); }
        else if (spec.mode === 'rot') { h += spec.rot; l = Math.min(1, l * spec.l); if (spec.sat !== undefined) s *= spec.sat; }
        else if (spec.mode === 'col') { h = spec.col.h; s = Math.min(1, s * 0.35 + spec.col.s); l = Math.min(1, l * spec.l); }
        else if (spec.mode === 'flat') { h = spec.h; s = spec.s; l = Math.min(1, l * spec.l); }
        out = hsl2rgb(h, s, l); cache.set(key, out);
      }
      p[i] = out[0]; p[i + 1] = out[1]; p[i + 2] = out[2];
    }
    x.putImageData(d, 0, 0);
    return c;
  }
  // which recolour mode suits which art layer
  const MODE = { chestA: 'rot', legsA: 'rot', chestB: 'col', legsB: 'col', helm: 'col', shield: 'col', slash: 'rot',
    ghoul: 'rot', warden: 'rot', necro: 'rot', shade: 'rot', witch: 'rot', sunguard: 'rot', sunblade: 'rot', sword: 'col', axe: 'col' };
  BB.tintSpec = function (layer, tintId) {
    if (!tintId || tintId === 'natural') return null;
    const t = BB.TINTS.find((q) => q.id === tintId); if (!t) return null;
    const m = MODE[layer] || 'rot';
    if (m === 'col' && t.col) return { mode: 'col', col: t.col, l: t.l };
    return { mode: 'rot', rot: t.rot, l: t.l };
  };
  // returns the drawable image for an atlas with a given spec (cached)
  BB.atlasImg = function (key, spec, specKey) {
    const a = A.chars[key]; if (!a) return null;
    if (!spec) return a.img;
    const ck = key + '|' + specKey;
    if (!A.tinted[ck]) A.tinted[ck] = recolor(a.img, spec);
    return A.tinted[ck];
  };

  // ---- character drawing. dir 0..7 (0 east, clockwise). frame index wraps per clip.
  // a clip a set lacks falls back to the nearest one it has (the paper-doll body has no Kick or Rolling)
  const FALLBACK = { Kick: ['Attack2', 'Attack1'], Attack6: ['AttackRun', 'Attack2', 'Attack1'], Rolling: ['Run'], Attack4: ['AttackRun', 'Attack1'],
    AttackRun: ['Attack1', 'Attack4'], Attack3: ['Attack1', 'Attack5'], Attack5: ['Attack1', 'Attack3'], Attack1: ['Attack5', 'Attack3'], Attack2: ['Attack1', 'Attack5', 'Attack3'],
    Special1: ['Attack1', 'Attack5', 'Taunt'], Taunt: ['Special1', 'Idle'], Walk: ['Run'], TakeDamage: ['Idle'], CrouchIdle: ['Idle'], Die: ['Idle'] };
  BB.resolveClip = function (key, clip) {
    const a = A.chars[key]; if (!a) return clip;
    if (a.meta.clips[clip]) return clip;
    for (const c of FALLBACK[clip] || []) if (a.meta.clips[c]) return c;
    return 'Idle';
  };
  BB.clipLen = function (key, clip) {
    const a = A.chars[key]; return a && a.meta.clips[BB.resolveClip(key, clip)] || 0;
  };
  BB.hasClip = (key, clip) => !!(A.chars[key] && A.chars[key].meta.clips[clip]);
  // Tinted art is recoloured in small pieces, and only what is drawn: one strip per clip and facing for characters,
  // one frame at a time for effects. (Recolouring a whole atlas froze the frame for a moment the first time a tinted
  // foe or effect appeared, and kept megabytes for each tint.)
  const strips = {}, pals = {};
  // a few milliseconds of recolouring per frame at most: a wave of new tinted foes is spread over the frames in which
  // they fade in, drawn in their plain colours until their strip is ready
  let tintEpoch = 0, tintSpent = 0;
  const TINT_BUDGET = 3;
  function tintBusy() { if (!BB.tintLazy) return performance.now(); /* menus draw a picture once: it must be right */ const now = performance.now(), ep = Math.floor(now / 16); if (ep !== tintEpoch) { tintEpoch = ep; tintSpent = 0; } return tintSpent > TINT_BUDGET ? -1 : now; }
  function stripFor(a, key, sk, spec, clip, dir, n) {
    const ck = key + '|' + sk + '|' + clip + '|' + dir; let S = strips[ck];
    if (S) return S;
    const t0 = tintBusy(); if (t0 < 0) return null;
    const rects = a.meta.f[clip], xs = []; let w = 0, h = 1;
    for (let i = 0; i < n; i++) { const q = rects[dir * n + i]; xs.push(w); if (q && q[2] > 1) { w += q[2] + 1; h = Math.max(h, q[3]); } }
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = h;
    const x = c.getContext('2d');
    for (let i = 0; i < n; i++) { const q = rects[dir * n + i]; if (q && q[2] > 1) x.drawImage(a.img, q[0], q[1], q[2], q[3], xs[i], 0, q[2], q[3]); }
    const pk = key + '|' + sk; S = strips[ck] = { c: recolor(c, spec, pals[pk] || (pals[pk] = new Map())), xs };
    tintSpent += performance.now() - t0;
    return S;
  }
  function drawFrame(ctx, key, img, clip, dir, frame, x, y, sc, spec, sk) {
    const a = A.chars[key]; if (!a) return;
    clip = BB.resolveClip(key, clip);
    const n = a.meta.clips[clip]; if (!n) return;
    const f = Math.max(0, Math.min(n - 1, frame | 0)), r = a.meta.f[clip][dir * n + f];
    if (!r || r[2] <= 1) return;
    if (spec) { const S = stripFor(a, key, sk, spec, clip, dir, n); if (S) { ctx.drawImage(S.c, S.xs[f], 0, r[2], r[3], x + (r[4] - FOOT_X) * sc, y + (r[5] - FOOT_Y) * sc, r[2] * sc, r[3] * sc); return; } }
    ctx.drawImage(img || a.img, r[0], r[1], r[2], r[3], x + (r[4] - FOOT_X) * sc, y + (r[5] - FOOT_Y) * sc, r[2] * sc, r[3] * sc);
  }
  BB.drawFrame = drawFrame;

  // layer list for a hero look + gear (cached on the hero object by a signature)
  BB.heroLayers = function (hero) {
    if (hero.legend) {
      const L = BB.LEGENDS[hero.legend];
      return [{ key: L.art, spec: null, sk: '' }];
    }
    if (hero.recruit) return [{ key: 'h/' + hero.recruit, spec: null, sk: '' }];
    const C = BB.CALLINGS[hero.calling], lk = hero.look, g = hero.gear || {};
    const skin = BB.SKINS.find((s) => s.id === lk.skin) || BB.SKINS[1];
    const out = [];
    const skinSpec = skin.id === 'tan' ? null : { mode: 'skin', h: skin.h, s: skin.s, l: skin.l };
    out.push({ key: 'body', spec: skinSpec, sk: skin.id });
    const pick = (slot, lookKey, tintKey) => {
      const it = g[slot];
      const look = it && it.look ? it.look : lk[lookKey];
      const tint = it ? it.tint : lk[tintKey];
      return { look, tint };
    };
    const legs = pick('legs', 'legs', 'legsTint');
    if (legs.look && legs.look !== 'none') out.push({ key: legs.look, spec: BB.tintSpec(legs.look, legs.tint), sk: legs.tint });
    const chest = pick('chest', 'chest', 'chestTint');
    if (chest.look && chest.look !== 'none') out.push({ key: chest.look, spec: BB.tintSpec(chest.look, chest.tint), sk: chest.tint });
    const head = pick('head', 'head', 'headTint');
    if (head.look === 'hair') {
      const hr = BB.HAIRS.find((q) => q.id === lk.hair) || BB.HAIRS[0];
      out.push({ key: 'hair', spec: hr.col ? { mode: 'col', col: hr.col, l: hr.l } : null, sk: hr.id });
    } else if (head.look === 'helm') out.push({ key: 'helm', spec: BB.tintSpec('helm', head.tint), sk: head.tint });
    if (C.weapon) {
      const wt = g.weapon ? g.weapon.tint : 'natural';
      out.push({ key: C.weapon, spec: BB.tintSpec(C.weapon, wt === 'natural' ? null : wt), sk: wt, weapon: true });
    }
    if (C.offhand) {
      const st = g.offhand ? g.offhand.tint : lk.shieldTint;
      out.push({ key: 'shield', spec: BB.tintSpec('shield', st), sk: st });
    }
    out.push({ key: 'slash', spec: BB.tintSpec('slash', C.slash), sk: C.slash, slash: true });
    return out;
  };
  BB.layerSig = (hero) => JSON.stringify([hero.calling, hero.look, hero.legend,
    ...BB.SLOTS.map((s) => hero.gear && hero.gear[s] ? hero.gear[s].look + hero.gear[s].tint : '')]);

  // draw a full hero (or any layer list). opts: {flash, alpha, noSlash, ghost}
  BB.drawLayers = function (ctx, layers, clip, dir, frame, x, y, sc, opts) {
    opts = opts || {};
    for (const L of layers) {
      if (L.slash && (opts.noSlash || !BB.hasClip('slash', clip))) continue;
      if (!A.chars[L.key]) continue;
      drawFrame(ctx, L.key, null, clip, dir, frame, x, y, sc, L.spec, L.sk);
    }
    if (opts.flash) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opts.flash;
      for (const L of layers) {
        if (L.slash || !A.chars[L.key]) continue;
        drawFrame(ctx, L.key, null, clip, dir, frame, x, y, sc, L.spec, L.sk);
      }
      ctx.restore();
    }
  };
  BB.drawChar = function (ctx, key, tintId, clip, dir, frame, x, y, sc, flash) {
    if (!A.chars[key]) return;
    const spec = BB.tintSpec(key, tintId);
    drawFrame(ctx, key, null, clip, dir, frame, x, y, sc, spec, tintId || '');
    if (flash) {
      const ga = ctx.globalAlpha, gc = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash;
      drawFrame(ctx, key, null, clip, dir, frame, x, y, sc, spec, tintId || ''); ctx.globalAlpha = ga; ctx.globalCompositeOperation = gc;
    }
  };

  // ---- environment sprites: anchor = tile centre
  BB.drawEnv = function (ctx, biome, name, x, y, sc, alpha) {
    const a = A.env[biome]; if (!a) return false;
    const r = a.meta.f[name]; if (!r) return false;
    const k = BB.ENV_DRAW * (sc || 1);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(a.img, r[0], r[1], r[2], r[3], x + r[4] * k, y + r[5] * k, r[2] * k, r[3] * k);
    if (alpha !== undefined) ctx.globalAlpha = 1;
    return true;
  };
  // single images from the "Other" pack: AoEFire, Cloud1-3, GodRay, ItemRay, DashLine (anchor = centre)
  BB.drawOther = function (ctx, name, x, y, sc, o) {
    const a = A.other; if (!a) return; const r = a.meta.f[name]; if (!r) return;
    o = o || {}; sc = sc || 1;
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.add) ctx.globalCompositeOperation = 'lighter';
    if (o.mul) ctx.globalCompositeOperation = 'multiply';
    ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
    const sx = o.sx || 1, sy = o.sy || 1;
    let img = a.img;
    let rx = r[0], ry = r[1];
    if (o.hue !== undefined) { const ck = 'o|' + name + '|' + o.hue; if (!fxTint[ck]) fxTint[ck] = recolor(cut(a.img, r), { mode: 'flat', h: o.hue, s: 0.85, l: 1 }); img = fxTint[ck]; rx = 0; ry = 0; }
    ctx.drawImage(img, rx, ry, r[2], r[3], r[4] * sc * sx, r[5] * sc * sy, r[2] * sc * sx, r[3] * sc * sy);
    ctx.restore();
  };
  BB.envRect = function (biome, name) { const a = A.env[biome]; return a && a.meta.f[name]; };
  BB.envHas = (biome, name) => !!(A.env[biome] && A.env[biome].meta.f[name]);

  // ---- effects: anchor = sprite centre. tinted variants cached per hue
  BB.fxLen = (key) => (A.fx && A.fx.meta.n[key]) || 0;
  const fxTint = {};
  function cut(img, r) { const c = document.createElement('canvas'); c.width = r[2]; c.height = r[3]; c.getContext('2d').drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); return c; }
  BB.drawFx = function (ctx, key, frame, x, y, sc, opts) {
    const a = A.fx; if (!a) return;
    const n = a.meta.n[key]; if (!n) return;
    const fi = Math.max(0, Math.min(n - 1, frame | 0)), r = a.meta.f[key][fi];
    if (!r || r[2] <= 1) return;
    let img = a.img, rx = r[0], ry = r[1];
    opts = opts || {};
    if (opts.hue !== undefined) { // this frame in this hue, recoloured the first time it is drawn
      const ck = key + '|' + fi + '|' + opts.hue + '|' + (opts.sat || 1) + (opts.flat ? '|f' + (opts.l || 1) : '');
      if (!fxTint[ck]) { const t0 = tintBusy(); if (t0 >= 0) { const pk = 'fx|' + key + '|' + opts.hue + '|' + (opts.sat || 1) + (opts.flat ? 'f' : ''); fxTint[ck] = recolor(cut(a.img, r), opts.flat ? { mode: 'flat', h: opts.hue, s: opts.sat || 0.9, l: opts.l || 1 } : { mode: 'rot', rot: opts.hue, l: 1, sat: opts.sat }, pals[pk] || (pals[pk] = new Map())); tintSpent += performance.now() - t0; } }
      if (fxTint[ck]) { img = fxTint[ck]; rx = 0; ry = 0; }
    }
    sc = sc || 1;
    const sy = opts.squash || 1;
    // no save/restore here: this runs for every spark on the field
    const ga = ctx.globalAlpha, gc = ctx.globalCompositeOperation;
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    if (opts.add) ctx.globalCompositeOperation = 'lighter';
    if (opts.rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(opts.rot);
      ctx.drawImage(img, rx, ry, r[2], r[3], r[4] * sc, r[5] * sc * sy, r[2] * sc, r[3] * sc * sy);
      ctx.restore();
    } else {
      ctx.drawImage(img, rx, ry, r[2], r[3], x + r[4] * sc, y + r[5] * sc * sy, r[2] * sc, r[3] * sc * sy);
    }
    ctx.globalAlpha = ga; ctx.globalCompositeOperation = gc;
  };

  // ---- a portrait canvas for a hero (head and shoulders, facing the camera)
  const portraitCache = {};
  BB.portrait = function (hero, size) {
    size = size || 64;
    const sig = (hero.legend || BB.layerSig(hero)) + size;
    if (portraitCache[sig]) return portraitCache[sig];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const sc = Math.max(1, Math.round(size / 28)); // whole pixels: crisp art
    const layers = BB.heroLayers(hero);
    BB.drawLayers(x, layers, 'Idle', 2, 0, size / 2, size / 2 + 33 * sc, sc, { noSlash: true });
    portraitCache[sig] = c;
    return c;
  };
  BB.foePortrait = function (key, tint, size) {
    const sig = key + tint + size;
    if (portraitCache[sig]) return portraitCache[sig];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const sc = size / 30;
    BB.drawChar(x, key, tint, 'Idle', 2, 0, size / 2, 49 * sc, sc);
    portraitCache[sig] = c; return c;
  };

  BB.dirFromVec = function (dx, dy) {
    // world (tile) vector to screen facing row
    const sx = dx - dy, sy = (dx + dy) / 2;
    if (Math.abs(sx) + Math.abs(sy) < 1e-6) return null;
    const a = Math.atan2(sy, sx) * 180 / Math.PI; // screen y down: clockwise positive
    return ((Math.round(a / 45) % 8) + 8) % 8;
  };
})();
