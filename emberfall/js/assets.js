// EMBERFALL — asset engine. Loads the packed pixel cast, the effects atlas, the tile atlas and
// the icon sheets from ../assets and draws them on a pixel buffer.
(function () {
  const EF = window.EF = window.EF || {};
  EF.ROOT = EF.ROOT || '../assets/';
  const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const sets = {}, images = {};
  let fxData = null, tileData = null;
  EF.icons = [];

  function loadImage(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + src)); im.src = src; });
  }
  async function loadJSON(src) { const r = await fetch(src); if (!r.ok) throw new Error('json ' + src); return r.json(); }

  EF.loadSet = async function (id) {
    if (sets[id]) return sets[id];
    const data = await loadJSON(EF.ROOT + 'pixel/' + id + '.json');
    data.images = await Promise.all(data.pages.map(p => loadImage(EF.ROOT + 'pixel/' + p)));
    sets[id] = data; return data;
  };
  EF.hasSet = id => !!sets[id];
  EF.set = id => sets[id];

  EF.load = async function (setIds, onProgress) {
    let n = 0; const total = setIds.length + 3;
    const tick = () => { n++; if (onProgress) onProgress(n / total); };
    const jobs = setIds.map(id => EF.loadSet(id).then(tick));
    jobs.push(loadJSON(EF.ROOT + 'fx/fx.json').then(async d => { d.images = await Promise.all(d.pages.map(p => loadImage(EF.ROOT + 'fx/' + p))); fxData = d; tick(); }));
    jobs.push(loadJSON(EF.ROOT + 'tiles/tiles.json').then(async d => { d.images = await Promise.all(d.pages.map(p => loadImage(EF.ROOT + 'tiles/' + p))); tileData = d; tick(); }));
    jobs.push(Promise.all(['icons1.png', 'icons2.png', 'icons3.png', 'mainmenuicons.png'].map(f => loadImage(EF.ROOT + 'ui/' + f))).then(a => { EF.icons = a; tick(); }));
    await Promise.all(jobs);
    try { if (document.fonts && document.fonts.load) await document.fonts.load('16px Adventurer'); } catch (e) { /* font optional */ }
  };

  // Creator clips: timing tables live in data.js (shared with the simulation).
  EF.CLIP_FPS = EF.DATA.CLIP_FPS; EF.CLIP_LOOP = EF.DATA.CLIP_LOOP; EF.STRIKE = EF.DATA.STRIKE; EF.FRAMES = EF.DATA.FRAMES;

  EF.dirIndex = function (angle) { // angle in radians, screen space (y down); E = 0
    let d = Math.round(angle / (Math.PI / 4)); d = ((d % 8) + 8) % 8; return d;
  };
  EF.dirName = angle => DIRS[EF.dirIndex(angle)];

  // Frame index for a clip at time t (seconds since the clip started).
  EF.frameAt = function (clip, t) {
    const fps = EF.CLIP_FPS[clip] || 12; const f = Math.floor(t * fps);
    return EF.CLIP_LOOP[clip] ? f % EF.FRAMES : Math.min(EF.FRAMES - 1, f);
  };
  EF.clipDone = (clip, t) => !EF.CLIP_LOOP[clip] && t * (EF.CLIP_FPS[clip] || 12) >= EF.FRAMES;
  EF.clipLen = clip => EF.FRAMES / (EF.CLIP_FPS[clip] || 12);

  const tintCache = {};
  function tinted(img, col, key) {
    const k = key + '|' + col; if (tintCache[k]) return tintCache[k];
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return tintCache[k] = c;
  }

  // Draw an actor: set id, clip, frame, facing angle, feet at (x, y), scale.
  // opts: { flash (white hit flash 0..1), tint (colour), alpha, shade (silhouette colour) }
  EF.drawActor = function (ctx, setId, clip, frame, angle, x, y, scale, opts) {
    const s = sets[setId]; if (!s) return false;
    const an = s.anims[clip] || s.anims.Idle; if (!an) return false;
    const dir = DIRS[EF.dirIndex(angle)]; const frames = an[dir] || an.S; if (!frames || !frames.length) return false;
    const f = frames[Math.max(0, Math.min(frames.length - 1, frame | 0))];
    const img = s.images[f[0]]; const k = scale || 1;
    const dx = x + (f[5] - s.anchor[0]) * k, dy = y + (f[6] - s.anchor[1]) * k, dw = f[3] * k, dh = f[4] * k;
    const o = opts || {};
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    if (o.shade) ctx.drawImage(tinted(img, o.shade, setId + f[0]), f[1], f[2], f[3], f[4], dx, dy, dw, dh);
    else {
      ctx.drawImage(img, f[1], f[2], f[3], f[4], dx, dy, dw, dh);
      if (o.flash) { ctx.save(); ctx.globalAlpha *= o.flash; ctx.drawImage(tinted(img, '#fff', setId + f[0]), f[1], f[2], f[3], f[4], dx, dy, dw, dh); ctx.restore(); }
      if (o.tint) { ctx.save(); ctx.globalAlpha *= 0.45; ctx.drawImage(tinted(img, o.tint, setId + f[0]), f[1], f[2], f[3], f[4], dx, dy, dw, dh); ctx.restore(); }
    }
    if (o.alpha != null) ctx.restore();
    return true;
  };
  // Bounding box of an actor frame (for portraits): returns {x,y,w,h} relative to the feet.
  EF.actorBox = function (setId, clip, frame, angle, scale) {
    const s = sets[setId]; if (!s) return null; const an = s.anims[clip] || s.anims.Idle; const frames = an[DIRS[EF.dirIndex(angle)]] || an.S; const f = frames[frame | 0] || frames[0]; const k = scale || 1;
    return { x: (f[5] - s.anchor[0]) * k, y: (f[6] - s.anchor[1]) * k, w: f[3] * k, h: f[4] * k };
  };

  // Effects. name, t seconds since start, centre (x, y), scale. Returns false when a one-shot has ended.
  EF.fxInfo = name => fxData && fxData.fx[name];
  EF.drawFx = function (ctx, name, t, x, y, scale, alpha, angle) {
    const d = fxData && fxData.fx[name]; if (!d) return false;
    let i = Math.floor(t * d.fps); if (d.loop) i %= d.frames.length; else if (i >= d.frames.length) return false;
    const f = d.frames[i]; const img = fxData.images[f[0]]; const k = scale || 1;
    ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha; ctx.translate(x, y); if (angle) ctx.rotate(angle);
    ctx.drawImage(img, f[1], f[2], f[3], f[4], (f[5] - d.anchor[0]) * k, (f[6] - d.anchor[1]) * k, f[3] * k, f[4] * k);
    ctx.restore(); return true;
  };
  EF.fxLen = name => { const d = fxData && fxData.fx[name]; return d ? d.frames.length / d.fps : 0; };

  // Tiles and props. (x, y) is the top-left for ground tiles; for props, the bottom-centre.
  EF.tileInfo = name => tileData && tileData.sprites[name];
  EF.drawTile = function (ctx, name, x, y, scale) {
    const f = tileData && tileData.sprites[name]; if (!f) return false; const k = scale || 1;
    ctx.drawImage(tileData.images[f[0]], f[1], f[2], f[3], f[4], x, y, f[3] * k, f[4] * k); return true;
  };
  EF.drawProp = function (ctx, name, x, y, scale, alpha) {
    const f = tileData && tileData.sprites[name]; if (!f) return false; const k = scale || 1;
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
    ctx.drawImage(tileData.images[f[0]], f[1], f[2], f[3], f[4], Math.round(x - f[3] * k / 2), Math.round(y - f[4] * k), f[3] * k, f[4] * k);
    if (alpha != null) ctx.restore(); return true;
  };
  EF.propSize = name => { const f = tileData && tileData.sprites[name]; return f ? { w: f[3], h: f[4] } : { w: 0, h: 0 }; };

  // Icons: sheet 0..3, column, row (32 px cells; sheet 3 is 64x32 buttons).
  EF.drawIcon = function (ctx, sheet, col, row, x, y, size, alpha) {
    const img = EF.icons[sheet]; if (!img) return; const cw = sheet === 3 ? 64 : 32, ch = 32; const k = (size || 32) / 32;
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
    ctx.drawImage(img, col * cw, row * ch, cw, ch, x, y, cw * k, ch * k);
    if (alpha != null) ctx.restore();
  };
})();
