// HOLDFAST - asset engine. Loads the shared tile atlas, the effect atlas, the icon sheets and the
// font from ../assets, the game's own extra atlas and slim cast atlases from ./assets, and draws them.
(function () {
  const HF = window.HF; const A = HF.A = {};
  const ROOT = '../assets/', OWN = 'assets/';
  const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  A.atlas = {}; A.icons = {}; A.cast = {}; A.loading = {}; A.proc = {};
  const img = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + src)); i.src = src; });
  const json = async src => { const r = await fetch(src); if (!r.ok) throw new Error('json ' + src); return r.json(); };

  A.load = async function (onProgress) {
    let n = 0; const jobs = [];
    const tick = () => { n++; if (onProgress) onProgress(n / jobs.length); };
    jobs.push(json(ROOT + 'tiles/tiles.json').then(async d => { A.atlas.t = { img: await img(ROOT + 'tiles/' + d.pages[0]), s: d.sprites }; tick(); }));
    jobs.push(json(ROOT + 'fx/fx.json').then(async d => {
      const names = Array.isArray(d.pages) ? d.pages : Array.from({ length: d.pages || 1 }, (_, i) => 'fx_' + i + '.png');
      A.fx = { imgs: await Promise.all(names.map(p => img(ROOT + 'fx/' + p))), fx: d.fx }; tick();
    }));
    jobs.push(json(OWN + 'extra.json').then(async d => { A.atlas.x = { img: await img(OWN + 'extra.png'), s: d.sprites }; tick(); }));
    for (const f of ['icons1', 'icons2', 'icons3', 'mainmenuicons']) jobs.push(img(ROOT + 'ui/' + f + '.png').then(i => { A.icons[f] = i; tick(); }));
    for (const s of ['ashgate_f2', 'guild_adventurer', 'spearwoman', 'hamlet_predator']) jobs.push(A.loadCast(s).then(tick));
    await Promise.all(jobs);
    try { if (document.fonts) await document.fonts.load('16px Adventurer'); } catch (e) { /* optional */ }
    buildProcedural();
  };

  // ---- Cast (Character Creator sets, repacked) ------------------------------------------
  A.loadCast = function (id) {
    if (A.cast[id]) return Promise.resolve(A.cast[id]);
    if (A.loading[id]) return A.loading[id];
    return A.loading[id] = json(OWN + 'cast/' + id + '.json').then(async d => { d.img = await img(OWN + 'cast/' + d.page); A.cast[id] = d; return d; }).catch(e => { console.warn('cast', id, e.message); return null; });
  };
  A.want = id => { if (!A.cast[id] && !A.loading[id]) A.loadCast(id); return A.cast[id]; };
  A.dirIndex = a => { let d = Math.round(a / (Math.PI / 4)); return ((d % 8) + 8) % 8; };
  A.FPS = { Idle: 8, Walk: 13, Run: 18, Attack1: 22, Attack3: 18, Attack5: 20, CrouchIdle: 7, TakeDamage: 20, Die: 14 };
  A.LOOP = { Idle: 1, Walk: 1, Run: 1, CrouchIdle: 1, Attack5: 1, Attack1: 1, Attack3: 1 };
  A.frame = (clip, t) => { const f = Math.floor(t * (A.FPS[clip] || 12)); return A.LOOP[clip] ? f % 15 : Math.min(14, f); };
  const tintCache = {};
  function tinted(im, col, key) {
    const k = key + col; if (tintCache[k]) return tintCache[k];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d');
    g.drawImage(im, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return tintCache[k] = c;
  }
  // Draw an actor with its feet at (x, y). opts: flash, alpha, shade (silhouette colour), tint.
  A.drawActor = function (ctx, id, clip, frame, angle, x, y, k, opts) {
    const s = A.want(id); if (!s) return false;
    const an = s.anims[clip] || s.anims.Attack5 || s.anims.Idle; if (!an) return false;
    const fr = an[DIRS[A.dirIndex(angle)]] || an.S; if (!fr || !fr.length) return false;
    const f = fr[Math.max(0, Math.min(fr.length - 1, frame | 0))];
    const dx = x + (f[4] - s.anchor[0]) * k, dy = y + (f[5] - s.anchor[1]) * k, dw = f[2] * k, dh = f[3] * k;
    const o = opts || {};
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    if (o.shade) ctx.drawImage(tinted(s.img, o.shade, id), f[0], f[1], f[2], f[3], dx, dy, dw, dh);
    else {
      ctx.drawImage(s.img, f[0], f[1], f[2], f[3], dx, dy, dw, dh);
      if (o.flash) { ctx.save(); ctx.globalAlpha *= o.flash; ctx.drawImage(tinted(s.img, '#ffffff', id), f[0], f[1], f[2], f[3], dx, dy, dw, dh); ctx.restore(); }
      if (o.tint) { ctx.save(); ctx.globalAlpha *= o.tintA || 0.4; ctx.drawImage(tinted(s.img, o.tint, id), f[0], f[1], f[2], f[3], dx, dy, dw, dh); ctx.restore(); }
    }
    if (o.alpha != null) ctx.restore();
    return true;
  };
  // A cropped portrait canvas of an actor's idle front frame.
  A.portrait = function (id, size) {
    const s = A.cast[id]; if (!s) return null;
    const f = s.anims.Idle.S[0];
    const c = document.createElement('canvas'); c.width = size; c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const k = Math.floor(size / 26);
    g.drawImage(s.img, f[0], f[1], f[2], Math.min(f[3], 22), (size - f[2] * k) / 2, size * 0.08, f[2] * k, Math.min(f[3], 22) * k);
    return c;
  };

  // ---- Sprites ----------------------------------------------------------------------------
  const scaled = {};
  A.sprite = function (atlas, key) {
    if (atlas === 'p') { const c = A.proc[key]; return c ? { img: c, x: 0, y: 0, w: c.width, h: c.height } : null; }
    const at = A.atlas[atlas]; if (!at) return null; const s = at.s[key]; if (!s) return null;
    return atlas === 't' ? { img: at.img, x: s[1], y: s[2], w: s[3], h: s[4] } : { img: at.img, x: s[0], y: s[1], w: s[2], h: s[3] };
  };
  // Bottom-centre at (x, y). Downscaled sprites are pre-filtered once so they stay clean.
  A.draw = function (ctx, atlas, key, x, y, k, alpha, flip) {
    const sp = A.sprite(atlas, key); if (!sp) return null;
    k = k || 1;
    let src = sp.img, sx = sp.x, sy = sp.y, sw = sp.w, sh = sp.h;
    if (k < 1) {
      const ck = atlas + key + k; let c = scaled[ck];
      if (!c) { c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k)); const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height); scaled[ck] = c; }
      src = c; sx = 0; sy = 0; sw = c.width; sh = c.height; k = 1;
    }
    const w = sw * k, h = sh * k;
    if (alpha != null && alpha < 1) { ctx.save(); ctx.globalAlpha *= alpha; }
    if (flip) { ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1); ctx.drawImage(src, sx, sy, sw, sh, -w / 2, y - h, w, h); ctx.restore(); }
    else ctx.drawImage(src, sx, sy, sw, sh, x - w / 2, y - h, w, h);
    if (alpha != null && alpha < 1) ctx.restore();
    return { w, h };
  };
  A.size = (atlas, key, k) => { const sp = A.sprite(atlas, key); return sp ? { w: sp.w * (k || 1), h: sp.h * (k || 1) } : { w: 0, h: 0 }; };
  // A tile-sized sub-rectangle (ground textures).
  A.tile = function (ctx, atlas, key, dx, dy, size, sub) {
    const sp = A.sprite(atlas, key); if (!sp) return;
    if (sub) ctx.drawImage(sp.img, sp.x + sub[0], sp.y + sub[1], sub[2], sub[3], dx, dy, size, size);
    else ctx.drawImage(sp.img, sp.x, sp.y, sp.w, sp.h, dx, dy, size, size);
  };

  // ---- Effects ------------------------------------------------------------------------------
  A.fxLen = name => { const f = A.fx && A.fx.fx[name]; return f ? f.frames.length / f.fps : 0.5; };
  A.fxLoop = name => { const f = A.fx && A.fx.fx[name]; return f && f.loop; };
  A.drawFx = function (ctx, name, t, x, y, k, alpha) {
    const f = A.fx && A.fx.fx[name]; if (!f) return false;
    let i = Math.floor(t * f.fps); if (f.loop) i %= f.frames.length; else if (i >= f.frames.length) return false;
    const fr = f.frames[i]; k = k || 1;
    if (alpha != null) { ctx.save(); ctx.globalAlpha *= alpha; }
    ctx.drawImage(A.fx.imgs[fr[0]] || A.fx.imgs[0], fr[1], fr[2], fr[3], fr[4], x + (fr[5] - f.anchor[0]) * k, y + (fr[6] - f.anchor[1]) * k, fr[3] * k, fr[4] * k);
    if (alpha != null) ctx.restore();
    return true;
  };

  // ---- Icons (32 px cells) --------------------------------------------------------------------
  A.ICON = {
    wood: ['icons3', 3, 5], food: ['icons3', 0, 5], water: ['icons3', 1, 2], metal: ['icons3', 5, 4], knowledge: ['icons3', 3, 2],
    pop: ['icons1', 2, 6], morale: ['icons3', 0, 0], heart: ['icons3', 0, 0], hourglass: ['icons3', 2, 7], build: ['icons2', 2, 4], hammer: ['icons2', 3, 4],
    axe: ['icons2', 5, 4], map: ['icons2', 7, 5], compass: ['icons2', 5, 5], book: ['icons3', 3, 2], quill: ['icons3', 1, 7], gear: ['icons3', 2, 4],
    shield: ['icons3', 3, 1], sword: ['icons3', 0, 1], bow: ['icons3', 2, 1], spear: ['icons3', 7, 1], helmet: ['icons3', 4, 1], potion: ['icons3', 0, 2],
    wheat: ['icons3', 4, 5], mushroom: ['icons3', 7, 5], meat: ['icons3', 5, 5], house: ['icons3', 1, 4], anvil: ['icons3', 5, 4], skull: ['icons3', 0, 7],
    crown: ['icons3', 6, 7], castle: ['icons3', 5, 7], star: ['icons3', 0, 3], chest: ['icons3', 2, 6], scroll: ['icons3', 7, 3], key: ['icons3', 4, 3],
    flag: ['icons1', 3, 4], swords: ['icons1', 1, 3], people: ['icons1', 2, 6], tent: ['icons1', 0, 5], tower: ['icons1', 5, 5], pause: ['icons1', 6, 0],
    check: ['icons1', 7, 0], x: ['icons1', 1, 0], info: ['icons1', 4, 0], back: ['icons1', 5, 0], trophy: ['icons1', 4, 6], fire: ['icons3', 5, 2], campfire: ['icons3', 2, 5],
    tree: ['icons3', 3, 5], dragon: ['icons3', 4, 7], bag: ['icons3', 7, 0], exclaim: ['icons3', 1, 6], question: ['icons3', 0, 6], ring: ['icons3', 7, 7],
    labor: ['icons2', 3, 4], forage: ['icons3', 7, 5], farm: ['icons3', 4, 5], guard: ['icons3', 3, 1], medic: ['icons3', 0, 2], craft: ['icons3', 5, 4], research: ['icons3', 3, 2],
    stone: null, horn: ['icons1', 1, 3], people2: ['icons1', 2, 6], trade: ['icons1', 7, 6],
  };
  // Data URL per icon, for the DOM.
  const urls = {};
  A.iconURL = function (name, px) {
    const k = name + (px || 32); if (urls[k]) return urls[k];
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const d = A.ICON[name];
    if (d && A.icons[d[0]]) g.drawImage(A.icons[d[0]], d[1] * 32, d[2] * 32, 32, 32, 0, 0, 32, 32);
    else if (name === 'stone') { const sp = A.sprite('t', 'rock_a'); if (sp) g.drawImage(sp.img, sp.x, sp.y, sp.w, sp.h, 2, 4, 28, 26); }
    return urls[k] = c.toDataURL();
  };
  A.icon = (ctx, name, x, y, size) => { const d = A.ICON[name]; if (!d || !A.icons[d[0]]) return; ctx.drawImage(A.icons[d[0]], d[1] * 32, d[2] * 32, 32, 32, x, y, size, size); };
  // A thumbnail of a building tier, for the build menu.
  A.buildingThumb = function (type, tier, size) {
    const B = HF.D.B[type]; const parts = B.parts[tier || 0];
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    // Find bounds.
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of parts) { let w, h; if (p[0] === 'f') { w = 32 * p[4]; h = 40 * p[4]; } else { const s = A.size(p[0], p[1], p[4]); w = s.w; h = s.h; } x0 = Math.min(x0, p[2] - w / 2); x1 = Math.max(x1, p[2] + w / 2); y0 = Math.min(y0, p[3] - h); y1 = Math.max(y1, p[3]); }
    if (B.crop) { x0 = Math.min(x0, -B.w * 16); x1 = Math.max(x1, B.w * 16); y0 = Math.min(y0, -B.h * 32); y1 = Math.max(y1, 0); }
    const k = Math.min(size / (x1 - x0), size / (y1 - y0)) * 0.92;
    g.save(); g.translate(size / 2 - (x0 + x1) / 2 * k, size / 2 - (y0 + y1) / 2 * k); g.scale(k, k);
    if (B.crop) { g.fillStyle = '#6b4a2b'; g.fillRect(-B.w * 16, -B.h * 32, B.w * 32, B.h * 32); g.fillStyle = '#c8a040'; for (let i = 0; i < 9; i++) g.fillRect(-B.w * 16 + 6 + (i % 3) * 32, -B.h * 32 + 8 + Math.floor(i / 3) * 32, 20, 18); }
    for (const p of parts) { if (p[0] === 'f') A.drawFx(g, p[1], 0.2, p[2], p[3] - 14 * p[4], p[4]); else A.draw(g, p[0], p[1], p[2], p[3], p[4]); }
    g.restore();
    return c;
  };

  // ---- Procedural sprites (no pack has them; stand-in pixel art in the shared palette) ----------
  function buildProcedural() {
    // Palisade: sharpened stakes lashed together (32 x 40).
    let c = document.createElement('canvas'); c.width = 32; c.height = 40; let g = c.getContext('2d');
    const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    for (let i = 0; i < 4; i++) {
      const x = 1 + i * 8, top = 4 + (i % 2) * 3;
      px(x, top + 3, 7, 36 - top, '#2e1f14'); px(x + 1, top + 3, 5, 35 - top, '#6b4a2b'); px(x + 1, top + 3, 2, 35 - top, '#8a6238');
      px(x + 2, top, 3, 3, '#2e1f14'); px(x + 3, top - 1, 1, 1, '#2e1f14'); px(x + 3, top + 1, 1, 2, '#a07a4a');
      px(x + 1, top + 10, 5, 1, '#4f3520'); px(x + 1, top + 22, 5, 1, '#4f3520');
    }
    px(0, 16, 32, 3, '#2e1f14'); px(0, 17, 32, 1, '#b89a5c'); px(0, 28, 32, 3, '#2e1f14'); px(0, 29, 32, 1, '#b89a5c');
    px(2, 38, 28, 2, 'rgba(0,0,0,0.25)');
    A.proc.palisade = c;
    // Lookout: a timber platform on four legs with a ladder and railing (96 x 132).
    c = document.createElement('canvas'); c.width = 96; c.height = 132; g = c.getContext('2d');
    const o = '#2e1f14', w1 = '#6b4a2b', w2 = '#8a6238', w3 = '#a9824f', dk = '#4a3220';
    const post = (x, y0, y1) => { px(x - 1, y0, 7, y1 - y0, o); px(x, y0, 5, y1 - y0, w1); px(x, y0, 2, y1 - y0, w2); };
    post(14, 40, 128); post(77, 40, 128); post(24, 46, 120); post(67, 46, 120);
    // braces
    for (let k = 0; k < 44; k++) { px(19 + k, 120 - k * 1.4, 3, 3, o); px(20 + k, 120 - k * 1.4, 2, 2, w1); px(72 - k, 120 - k * 1.4, 3, 3, o); px(72 - k, 120 - k * 1.4, 2, 2, dk); }
    // platform
    px(6, 36, 84, 12, o); px(7, 37, 82, 10, w2); for (let x = 9; x < 88; x += 8) px(x, 37, 1, 10, dk); px(7, 37, 82, 2, w3);
    // railing
    px(6, 14, 4, 24, o); px(86, 14, 4, 24, o); px(46, 14, 4, 24, o); px(7, 15, 2, 22, w2); px(87, 15, 2, 22, w2); px(47, 15, 2, 22, w2);
    px(6, 14, 84, 4, o); px(7, 15, 82, 2, w3); px(6, 26, 84, 3, o); px(7, 27, 82, 1, w2);
    // roof
    px(2, 0, 92, 8, o); px(4, 1, 88, 6, '#7a2e22'); px(4, 1, 88, 2, '#a3443a'); px(10, 8, 4, 8, o); px(82, 8, 4, 8, o);
    // ladder
    px(40, 48, 3, 84, o); px(54, 48, 3, 84, o); px(41, 48, 1, 84, w3); px(55, 48, 1, 84, w3); for (let y = 54; y < 130; y += 9) { px(40, y, 17, 3, o); px(41, y + 1, 15, 1, w2); }
    // banner
    px(88, 0, 2, 14, o); px(90, 2, 6, 6, '#c8a040');
    px(8, 128, 80, 4, 'rgba(0,0,0,0.22)');
    A.proc.lookout = c;
    // Stump: a cut trunk with rings (16 x 12).
    c = document.createElement('canvas'); c.width = 16; c.height = 13; g = c.getContext('2d');
    px(1, 4, 14, 9, '#2e1f14'); px(2, 5, 12, 7, '#5a3d22'); px(2, 8, 12, 4, '#4a3220'); px(4, 11, 2, 2, '#4a3220'); px(11, 11, 2, 2, '#4a3220');
    px(2, 1, 12, 6, '#2e1f14'); px(3, 2, 10, 4, '#c8a46a'); px(5, 3, 6, 2, '#a9824f'); px(7, 3, 2, 1, '#c8a46a');
    A.proc.stump = c;
  }
})();
