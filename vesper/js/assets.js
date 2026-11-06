// VESPER — asset engine. Loads the packed pixel cast, the effects and tile atlases from ../assets
// and draws them on the pixel buffer: plain, flashed white, as a solid silhouette, or in grey.
(function () {
  const VS = window.VS; const D = VS.DATA;
  const A = VS.A = { ROOT: '../assets/' };
  const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const sets = {}; let fxData = null, tileData = null;

  const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + src)); im.src = src; });
  async function loadJSON(src) { const r = await fetch(src); if (!r.ok) throw new Error('json ' + src); return r.json(); }

  async function loadSet(id) {
    if (sets[id]) return sets[id];
    const d = await loadJSON(A.ROOT + 'pixel/' + id + '.json');
    d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'pixel/' + p)));
    sets[id] = d; return d;
  }
  A.load = async function (ids, onProgress) {
    let n = 0; const total = ids.length + 2; const tick = () => { n++; if (onProgress) onProgress(n / total); };
    const jobs = ids.map((id) => loadSet(id).then(tick));
    jobs.push(loadJSON(A.ROOT + 'fx/fx.json').then(async (d) => { d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'fx/' + p))); fxData = d; tick(); }));
    jobs.push(loadJSON(A.ROOT + 'tiles/tiles.json').then(async (d) => { d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'tiles/' + p))); tileData = d; tick(); }));
    await Promise.all(jobs);
    try { if (document.fonts && document.fonts.load) await document.fonts.load('16px Adventurer'); } catch (e) { /* the font is optional */ }
  };
  A.hasSet = (id) => !!sets[id];

  // Recoloured copies of a page: a solid colour (silhouettes, flashes) or grey with hard contrast.
  const cache = {};
  function solid(img, col, key) {
    const k = key + '|' + col; if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return (cache[k] = c);
  }
  function grey(img, key) {
    const k = key + '|grey'; if (cache[k]) return cache[k];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      // Reds stay red (the hood, the plume); everything else goes to four hard greys.
      const r = p[i], gg = p[i + 1], b = p[i + 2], l = 0.3 * r + 0.59 * gg + 0.11 * b;
      if (r > gg * 1.5 && r > b * 1.5 && r > 60) { p[i] = 220; p[i + 1] = 30; p[i + 2] = 52; continue; }
      const v = l < 40 ? 14 : l < 75 ? 58 : l < 120 ? 120 : l < 170 ? 190 : 245;
      p[i] = p[i + 1] = p[i + 2] = v;
    }
    g.putImageData(d, 0, 0);
    return (cache[k] = c);
  }

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
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    const src = o.shade ? solid(img, o.shade, key) : o.grey ? grey(img, key) : img;
    ctx.drawImage(src, f[1], f[2], f[3], f[4], dx, dy, dw, dh);
    if (o.flash && !o.shade) { ctx.save(); ctx.globalAlpha *= Math.min(1, o.flash); ctx.drawImage(solid(img, o.flashCol || '#fff', key), f[1], f[2], f[3], f[4], dx, dy, dw, dh); ctx.restore(); }
    if (o.alpha != null) ctx.restore();
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
    const f = d.frames[i], k = scale || 1;
    ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha; ctx.translate(Math.round(x), Math.round(y)); if (angle) ctx.rotate(angle); if (flip) ctx.scale(-1, 1);
    ctx.drawImage(fxData.images[f[0]], f[1], f[2], f[3], f[4], Math.round((f[5] - d.anchor[0]) * k), Math.round((f[6] - d.anchor[1]) * k), Math.round(f[3] * k), Math.round(f[4] * k));
    ctx.restore(); return true;
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
    const img = shade ? solid(tileData.images[f[0]], shade, 'tile' + f[0]) : tileData.images[f[0]];
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
    ctx.drawImage(img, f[1], f[2], f[3], f[4], Math.round(x - f[3] * k / 2), Math.round(y - f[4] * k), Math.round(f[3] * k), Math.round(f[4] * k));
    if (alpha != null) ctx.restore(); return true;
  };
  A.propSize = (name) => { const f = tileData && tileData.sprites[name]; return f ? { w: f[3], h: f[4] } : { w: 0, h: 0 }; };
  A.hasTile = (name) => !!(tileData && tileData.sprites[name]);
  A.hasFx = (name) => !!(fxData && fxData.fx[name]);
})();
