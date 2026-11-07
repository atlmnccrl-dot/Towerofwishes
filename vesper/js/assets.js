// VESPER — asset engine. Loads the packed pixel cast, the effects and tile atlases from ../assets
// and draws them on the pixel buffer: plain, flashed white, as a solid silhouette, or in grey.
(function () {
  const VS = window.VS; const D = VS.DATA;
  const A = VS.A = { ROOT: '../assets/' };
  const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const sets = {}, tex = {}; let fxData = null, tileData = null;
  // Soft particle textures (white on clear, CC0): glows, a vortex, a rune ring, smoke, a ring, a flare.
  A.TEX = ['light_01', 'twirl_02', 'magic_01', 'magic_02', 'smoke_04', 'smoke_07', 'circle_03', 'star_06'];

  // Decoded during loading so the first draw of a sheet does not stall a frame.
  const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im)); im.onerror = () => rej(new Error('image ' + src)); im.src = src; });
  async function loadJSON(src) { const r = await fetch(src); if (!r.ok) throw new Error('json ' + src); return r.json(); }

  async function loadSet(id) {
    if (sets[id]) return sets[id];
    const d = await loadJSON(A.ROOT + 'pixel/' + id + '.json');
    d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'pixel/' + p)));
    sets[id] = d; return d;
  }
  A.load = async function (ids, onProgress) {
    let n = 0; const total = ids.length + 3; const tick = () => { n++; if (onProgress) onProgress(n / total); };
    const jobs = ids.map((id) => loadSet(id).then(tick));
    jobs.push(loadJSON(A.ROOT + 'fx/fx.json').then(async (d) => { d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'fx/' + p))); fxData = d; tick(); }));
    jobs.push(loadJSON(A.ROOT + 'tiles/tiles.json').then(async (d) => { d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'tiles/' + p))); tileData = d; tick(); }));
    jobs.push(Promise.all(A.TEX.map((t) => loadImage(A.ROOT + 'vfx/' + t + '.png').then((im) => { tex[t] = im; }).catch(() => {}))).then(tick));
    await Promise.all(jobs);
    try { if (document.fonts && document.fonts.load) await document.fonts.load('16px Adventurer'); } catch (e) { /* the font is optional */ }
  };
  A.hasSet = (id) => !!sets[id];
  // Draw one pixel of every sheet into the game's own buffer during loading, so the browser uploads
  // them to the graphics card then and not on the frame a new character first appears.
  A.warm = function (ctx) {
    const all = [];
    for (const k in sets) all.push(...sets[k].images);
    if (fxData) all.push(...fxData.images); if (tileData) all.push(...tileData.images); for (const k in tex) all.push(tex[k]);
    for (const im of all) ctx.drawImage(im, 0, 0, 1, 1, 0, 0, 1, 1);
    ctx.clearRect(0, 0, 2, 2);
  };

  // Recoloured copies, one per animation frame and colour (a few KB each), made on first use and
  // kept in a bounded cache. Recolouring whole 2048 px sheets cost ~16 MB per colour per character
  // and froze the game for up to a second and a half on first use.
  const cache = new Map(), MAX = 6000;
  function recolour(img, imgKey, sx, sy, sw, sh, mode) {
    const k = imgKey + '|' + sx + '|' + sy + '|' + mode;
    let c = cache.get(k);
    if (c) return c;
    c = document.createElement('canvas'); c.width = Math.max(1, sw); c.height = Math.max(1, sh);
    const g = c.getContext('2d'); g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    if (mode === 'grey') {
      // Reds stay red (the hood, the plume); everything else goes to five hard greys.
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        if (!p[i + 3]) continue;
        const r = p[i], gg = p[i + 1], bb = p[i + 2], l = 0.3 * r + 0.59 * gg + 0.11 * bb;
        if (r > gg * 1.5 && r > bb * 1.5 && r > 60) { p[i] = 220; p[i + 1] = 30; p[i + 2] = 52; continue; }
        const v = l < 40 ? 14 : l < 75 ? 58 : l < 120 ? 120 : l < 170 ? 190 : 245;
        p[i] = p[i + 1] = p[i + 2] = v;
      }
      g.putImageData(d, 0, 0);
    } else { g.globalCompositeOperation = 'source-in'; g.fillStyle = mode; g.fillRect(0, 0, c.width, c.height); }
    if (cache.size >= MAX) { let n = 0; for (const key of cache.keys()) { cache.delete(key); if (++n >= 1000) break; } }
    cache.set(k, c);
    return c;
  }
  A.cacheSize = () => cache.size;

  A.dirIndex = (angle) => { let d = Math.round(angle / (Math.PI / 4)); return ((d % 8) + 8) % 8; };
  function frameOf(setId, clip, frame, angle) {
    const s = sets[setId]; if (!s) return null;
    const an = s.anims[clip] || s.anims.Idle4 || s.anims.Idle; if (!an) return null;
    const frames = an[DIRS[A.dirIndex(angle)]] || an.E; if (!frames || !frames.length) return null;
    return { s, f: frames[Math.max(0, Math.min(frames.length - 1, frame | 0))] };
  }
  // Draw an actor with its feet at (x, y). opts: flash (0..1 white), shade (solid colour), grey, alpha.
  A.actor = function (ctx, setId, clip, frame, angle, x, y, scale, opts) {
    const r = frameOf(setId, clip, frame, angle); if (!r) return false;
    const { s, f } = r, k = scale || 1, o = opts || {};
    const img = s.images[f[0]], key = setId + f[0];
    const dx = Math.round(x + (f[5] - s.anchor[0]) * k), dy = Math.round(y + (f[6] - s.anchor[1]) * k), dw = Math.round(f[3] * k), dh = Math.round(f[4] * k);
    const ga = ctx.globalAlpha; if (o.alpha != null) ctx.globalAlpha = ga * o.alpha;
    if (o.shade || o.grey) ctx.drawImage(recolour(img, key, f[1], f[2], f[3], f[4], o.shade || 'grey'), 0, 0, f[3], f[4], dx, dy, dw, dh);
    else ctx.drawImage(img, f[1], f[2], f[3], f[4], dx, dy, dw, dh);
    if (o.flash && !o.shade) { const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * Math.min(1, o.flash); ctx.drawImage(recolour(img, key, f[1], f[2], f[3], f[4], o.flashCol || '#fff'), 0, 0, f[3], f[4], dx, dy, dw, dh); ctx.globalAlpha = a0; }
    ctx.globalAlpha = ga;
    return true;
  };
  // The frame's box relative to the feet (for framing close-ups).
  A.box = function (setId, clip, frame, angle, scale) {
    const r = frameOf(setId, clip, frame, angle); if (!r) return null; const { s, f } = r, k = scale || 1;
    return { x: (f[5] - s.anchor[0]) * k, y: (f[6] - s.anchor[1]) * k, w: f[3] * k, h: f[4] * k };
  };

  // Effects: name, t seconds since start, centre, scale, alpha, angle, flipX. False once a one-shot ends.
  A.fx = function (ctx, name, t, x, y, scale, alpha, angle, flip) {
    const d = fxData && fxData.fx[name]; if (!d) return false;
    let i = Math.floor(t * d.fps); if (d.loop) i %= d.frames.length; else if (i >= d.frames.length) return false;
    if (i < 0) return true;
    const f = d.frames[i], k = scale || 1, ga = ctx.globalAlpha;
    if (alpha != null) ctx.globalAlpha = ga * alpha;
    const ox = Math.round((f[5] - d.anchor[0]) * k), oy = Math.round((f[6] - d.anchor[1]) * k), w = Math.round(f[3] * k), h = Math.round(f[4] * k);
    if (!angle && !flip) ctx.drawImage(fxData.images[f[0]], f[1], f[2], f[3], f[4], Math.round(x) + ox, Math.round(y) + oy, w, h);
    else {
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (angle) ctx.rotate(angle); if (flip) ctx.scale(-1, 1);
      ctx.drawImage(fxData.images[f[0]], f[1], f[2], f[3], f[4], ox, oy, w, h); ctx.restore();
    }
    ctx.globalAlpha = ga; return true;
  };
  A.fxLen = (name) => { const d = fxData && fxData.fx[name]; return d ? d.frames.length / d.fps : 0; };
  A.fxLoop = (name) => { const d = fxData && fxData.fx[name]; return !!(d && d.loop); };

  // Tiles (top-left) and props (bottom-centre); props can be drawn as a solid silhouette.
  A.tile = function (ctx, name, x, y, w, h) {
    const f = tileData && tileData.sprites[name]; if (!f) return false;
    ctx.drawImage(tileData.images[f[0]], f[1], f[2], f[3], f[4], x, y, w || f[3], h || f[4]); return true;
  };
  A.prop = function (ctx, name, x, y, scale, shade, alpha) {
    const f = tileData && tileData.sprites[name]; if (!f) return false; const k = scale || 1;
    const ga = ctx.globalAlpha; if (alpha != null) ctx.globalAlpha = ga * alpha;
    const X = Math.round(x - f[3] * k / 2), Y = Math.round(y - f[4] * k), DW = Math.round(f[3] * k), DH = Math.round(f[4] * k);
    if (shade) ctx.drawImage(recolour(tileData.images[f[0]], 'tile' + f[0], f[1], f[2], f[3], f[4], shade), 0, 0, f[3], f[4], X, Y, DW, DH);
    else ctx.drawImage(tileData.images[f[0]], f[1], f[2], f[3], f[4], X, Y, DW, DH);
    ctx.globalAlpha = ga; return true;
  };
  A.propSize = (name) => { const f = tileData && tileData.sprites[name]; return f ? { w: f[3], h: f[4] } : { w: 0, h: 0 }; };
  // A texture tinted to a colour (cached per colour), drawn centred, optionally rotated and squashed.
  const tinted = new Map();
  function tint(name, col) {
    const k = name + col; let c = tinted.get(k); if (c) return c; const im = tex[name]; if (!im) return null;
    c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d');
    g.drawImage(im, 0, 0); if (col) { g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0); }
    tinted.set(k, c); return c;
  }
  A.tex = function (ctx, name, x, y, w, h, col, alpha, rot, add) {
    const c = tint(name, col || ''); if (!c || alpha <= 0) return false;
    ctx.save(); if (add) ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= alpha == null ? 1 : alpha; ctx.imageSmoothingEnabled = true;
    ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore(); return true;
  };
  A.hasTex = (name) => !!tex[name];
  A.hasTile = (name) => !!(tileData && tileData.sprites[name]);
  A.hasFx = (name) => !!(fxData && fxData.fx[name]);
})();
