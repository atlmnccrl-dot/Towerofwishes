// VESPER — asset engine. Loads the packed pixel cast, the effects and tile atlases from ../assets
// and draws them on the pixel buffer: plain, flashed white, as a solid silhouette, or in grey.
(function () {
  const VS = window.VS;
  const A = VS.A = { ROOT: '../assets/' };
  const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
  const sets = {}, tex = {}; let fxData = null, tileData = null;
  // Soft particle textures (white on clear, CC0): glows, a vortex, a rune ring, smoke, a ring, a flare.
  A.TEX = ['light_01', 'twirl_02', 'magic_01', 'magic_02', 'smoke_04', 'smoke_07', 'circle_03', 'star_06'];

  // Decoded during loading so the first draw of a sheet does not stall a frame.
  const loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im)); im.onerror = () => rej(new Error('image ' + src)); im.src = src; });
  async function loadJSON(src) { const r = await fetch(src); if (!r.ok) throw new Error('json ' + src); return r.json(); }

  const pending = {};
  function loadSet(id) {
    if (sets[id]) return Promise.resolve(sets[id]);
    return pending[id] || (pending[id] = loadSetNow(id).finally(() => { delete pending[id]; }));
  }
  // The random-cast sets' metadata comes in bundles by act (vh_b<N>.json, found through vh_map.json);
  // without them, each set's own file.
  let vhMapP = null; const bundleP = {};
  const vhMap = () => vhMapP || (vhMapP = loadJSON(A.ROOT + 'pixel/vh_map.json').catch(() => ({})));
  async function vhMeta(id) { const m = await vhMap(), b = m[id]; if (b == null) return null; const B = await (bundleP[b] || (bundleP[b] = loadJSON(A.ROOT + 'pixel/vh_b' + b + '.json').catch(() => ({})))); return B[id] ? Object.assign({}, B[id]) : null; }
  async function loadSetNow(id) {
    if (id.indexOf('@') > 0) return loadSkin(id);
    const d = (id.startsWith('vh_') && await vhMeta(id)) || await loadJSON(A.ROOT + 'pixel/' + id + '.json');
    d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'pixel/' + p)));
    sets[id] = d; return d;
  }
  // A look: "<set>@<hero>.<skin>" is <set> with its pages recoloured (VS.DATA.SKINS), built once on first use.
  async function loadSkin(id) {
    const [baseId, rest] = id.split('@'), [hero, sk] = rest.split('.'), base = await loadSet(baseId);
    const def = ((VS.DATA && VS.DATA.SKINS && VS.DATA.SKINS[hero]) || []).find((x) => x.id === sk);
    const d = Object.assign({}, base, { images: def ? base.images.map((im) => A.recolour(im, def)) : base.images });
    sets[id] = d; return d;
  }
  A.recolour = function (img, def) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const id = x.getImageData(0, 0, c.width, c.height), a = id.data, inBand = (h) => { const [lo, hi] = def.band; return lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi; };
    const mid = def.band ? (def.band[0] <= def.band[1] ? (def.band[0] + def.band[1]) / 2 : ((def.band[0] + def.band[1] + 360) / 2) % 360) : 0;
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
      let h = 0; if (dl) h = (mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4) * 60; if (h < 0) h += 360;
      let s = mx ? dl / mx : 0, v = mx;
      if (def.tint) { if (s > 0.25) continue; h = def.to; s = Math.min(1, s + def.sat * Math.min(1, v * 1.6)); }   // greys take the colour; what already has colour keeps it
      else { if (s < (def.minS || 0.3) || v < (def.minV || 0.12) || !inBand(h)) continue; let dh = h - mid; if (dh > 180) dh -= 360; if (dh < -180) dh += 360; h = (def.to + dh * 0.6 + 360) % 360; s = Math.min(1, s * def.sat); v = Math.min(1, v * def.val); }
      const C = v * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - C, k = Math.floor(h / 60) % 6;
      const [rr, gg, bb] = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][k];
      a[i] = Math.round((rr + m) * 255); a[i + 1] = Math.round((gg + m) * 255); a[i + 2] = Math.round((bb + m) * 255);
    }
    x.putImageData(id, 0, 0); return c;
  };
  A.load = async function (ids, onProgress) {
    let n = 0; const total = ids.length + 3; const tick = () => { n++; if (onProgress) onProgress(n / total); };
    const jobs = ids.map((id) => loadSet(id).then(tick));
    // The effect pack, and the forge's effects (tools_forge.py: v_*) merged in after it (their page indices shifted).
    // ... and the First Cut's own pack (tools_firstcut_fx.py: fc_*), the same way.
    jobs.push(Promise.all([loadJSON(A.ROOT + 'fx/fx.json'), loadJSON(A.ROOT + 'fx/forge.json').catch(() => null), loadJSON(A.ROOT + 'fx/fc_fx.json').catch(() => null)]).then(async ([d, f, fc]) => {
      for (const g of [f, fc]) if (g) { const off = d.pages.length; d.pages = d.pages.concat(g.pages); for (const k in g.fx) { const e = g.fx[k]; e.frames = e.frames.map((fr) => [fr[0] + off].concat(fr.slice(1))); d.fx[k] = e; } }
      d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'fx/' + p))); fxData = d; tick();
    }));
    jobs.push(loadJSON(A.ROOT + 'tiles/tiles.json').then(async (d) => { d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'tiles/' + p))); tileData = d; tick(); }));
    jobs.push(Promise.all(A.TEX.map((t) => loadImage(A.ROOT + 'vfx/' + t + '.png').then((im) => { tex[t] = im; }).catch(() => {}))).then(tick));
    await Promise.all(jobs);
    try { if (document.fonts && document.fonts.load) await document.fonts.load('16px Adventurer'); } catch (e) { /* the font is optional */ }
  };
  A.hasSet = (id) => !!sets[id];
  // Load more character sets later (the act armies load when a fight needs them).
  A.loadSets = async function (ids, onProgress) { let n = 0; await Promise.all(ids.map((id) => loadSet(id).then(() => { n++; if (onProgress) onProgress(n / ids.length); }))); };
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
  // Sets exported without some clips (the tile packs' own characters have no roll, slide or kick):
  // the nearest clip they do have.
  const CLIP_FB = { Rolling: 'Run', Slide: 'TakeDamage', Kick: 'Attack2', Attack6: 'Attack3', RunBackwards: 'Walk', Idle2: 'Idle', Idle3: 'Idle', CrouchIdle: 'Idle4' };
  function frameOf(setId, clip, frame, angle) {
    const s = sets[setId]; if (!s) return null;
    const an = s.anims[clip] || s.anims[CLIP_FB[clip]] || s.anims.Idle4 || s.anims.Idle; if (!an) return null;
    const frames = an[DIRS[A.dirIndex(angle)]] || an.E; if (!frames || !frames.length) return null;
    // An empty cell in a sheet is stored as null: use the nearest frame that has pixels.
    let i = Math.max(0, Math.min(frames.length - 1, frame | 0)), f = frames[i];
    for (let d = 1; !f && d < frames.length; d++) f = frames[i - d] || frames[i + d];
    return f ? { s, f } : null;
  }
  // Draw an actor with its feet at (x, y). opts: flash (0..1 white), shade (solid colour), grey, alpha.
  A.actor = function (ctx, setId, clip, frame, angle, x, y, scale, opts) {
    const r = frameOf(setId, clip, frame, angle); if (!r) return false;
    const { s, f } = r, k = (scale || 1) / (s.res || 1), o = opts || {};   // res: a sheet drawn at a finer resolution (the First Cut's, 2x)
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
    const r = frameOf(setId, clip, frame, angle); if (!r) return null; const { s, f } = r, k = (scale || 1) / (s.res || 1);
    return { x: (f[5] - s.anchor[0]) * k, y: (f[6] - s.anchor[1]) * k, w: f[3] * k, h: f[4] * k };
  };

  // Crowd Breaker (PixelHit): the hand-drawn skill effects, packed by tools_cbfx.py into assets/cbfx. Loaded after
  // the game starts; until then (or without them) the old effects play.
  let cbData = null, cbP = null;
  A.loadCB = function () {
    return cbP || (cbP = loadJSON(A.ROOT + 'cbfx/cb.json').then(async (d) => { d.images = await Promise.all(Array.from({ length: d.pages }, (_, i) => loadImage(A.ROOT + 'cbfx/cb_' + i + (d.ext || '.png')))); cbData = d; }));   // ext: '.webp' in the store apps (tools_build.py --app)
  };
  A.cbReady = () => !!cbData;
  // The old effect names, played as Crowd Breaker sheets: [sheet, size against the old effect, options]
  // (flipAng: mirrored when the blow goes left; directional sheets pick their tag from the angle).
  // The pack's sheets are drawn big; every mapped effect is scaled down by this (the author, 2026-11-09: "effects are a bit too large on attacks").
  A.CB_SCALE = 0.62;
  A.CBMAP = {
    hit_slash: ['02_roaring_blade_nova/target', 1.3, { flipAng: true }], hit_crit: ['01_crimson_tide_cleave/target', 0.9],
    katana: ['06_piercing_dash/target', 1.0], parry: ['218_sky_rend_star/target', 1.7],
    spin_slash: ['113_earthshaker_stance/target', 1.0], shockwave: ['10_quake_stomp/target', 0.9], rock_burst: ['10_quake_stomp/target', 0.7],
    blast: ['08_meteor_rain/target', 0.75], explosion_fire: ['54_greater_fireball/target', 0.6], fire_burst: ['54_greater_fireball/target', 0.55],
    explosion_frost: ['183_frost_curtain/caster', 0.7], ice_shatter: ['13_water_orb/target', 0.6], thunder: ['101_skyfall_thunder/target', 0.9],
    hit_shock: ['15_storm_orb/target', 0.6], spell_zap: ['15_storm_orb/target', 0.6], dissipate: ['01_crimson_tide_cleave/death', 0.9],
    smoke_dark: ['01_crimson_tide_cleave/death', 1.0], smoke_burst: ['01_crimson_tide_cleave/death', 0.8], holy_light: ['156_inner_flow_mending/caster', 0.8],
    spell_cast: ['11_ghostfire_hex/caster', 0.8], cast_circle: ['11_ghostfire_hex/caster', 0.7], summon: ['05_phantom_legion/caster', 0.9],
    teleport: ['175_violet_veil/caster', 0.9], charge_up: ['12_golden_blessing/caster', 1.0], slash_arc_blood: ['01_crimson_tide_cleave/caster', 0.8, { flipAng: true }],
    arc_white: ['107_flashpoint_severance/target', 1.0],
  };
  const DIRL = DIRS.map((d) => '_' + d.toLowerCase());
  // Play one sheet: its tag for this direction (or its first), t seconds in. False once it has played out.
  A.cb = function (ctx, key, t, x, y, scale, alpha, angle, flip, o) {
    const d = cbData && cbData.fx[key]; if (!d) return false;
    let tag = d.tags[0];
    if (d.tags.length >= 8 && angle != null) { const suf = DIRL[A.dirIndex(angle)]; tag = d.tags.find((g) => g[0].endsWith(suf)) || tag; }
    const n = tag[2] - tag[1] + 1; let i = Math.floor(t * d.fps);
    if (o && o.loop) i = ((i % n) + n) % n; else if (i >= n) return false;
    if (i < 0) return true;
    const f = d.frames[tag[1] + i]; if (!f) return true;
    const k = scale || 1, ga = ctx.globalAlpha; if (alpha != null) ctx.globalAlpha = ga * alpha;
    const w = Math.round(f[3] * k), h = Math.round(f[4] * k), ox = Math.round(f[5] * k), oy = Math.round(f[6] * k), sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    if (!flip) ctx.drawImage(cbData.images[f[0]], f[1], f[2], f[3], f[4], Math.round(x) + ox, Math.round(y) + oy, w, h);
    else { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(-1, 1); ctx.drawImage(cbData.images[f[0]], f[1], f[2], f[3], f[4], ox, oy, w, h); ctx.restore(); }
    ctx.imageSmoothingEnabled = sm; ctx.globalAlpha = ga; return true;
  };
  A.cbLen = (key) => { const d = cbData && cbData.fx[key]; if (!d) return 0; const g = d.tags[0]; return (g[2] - g[1] + 1) / d.fps; };
  // Effects: name, t seconds since start, centre, scale, alpha, angle, flipX. False once a one-shot ends.
  // 'cb:<sheet>' plays a Crowd Breaker sheet by name; names in A.CBMAP play their Crowd Breaker sheet once loaded.
  A.fx = function (ctx, name, t, x, y, scale, alpha, angle, flip) {
    if (name.charCodeAt(0) === 99 && name.startsWith('cb:')) return A.cb(ctx, name.slice(3), t, x, y, scale, alpha, angle, flip);
    const mp = cbData && A.CBMAP[name];
    if (mp && cbData.fx[mp[0]]) return A.cb(ctx, mp[0], t, x, y, (scale || 1) * mp[1] * A.CB_SCALE, alpha, angle, mp[2] && mp[2].flipAng ? (!!flip !== (angle != null && Math.cos(angle) < 0)) : flip, mp[2]);
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
  A.fxLen = (name) => { const mp = cbData && A.CBMAP[name]; if (mp && cbData.fx[mp[0]]) return A.cbLen(mp[0]); if (name.startsWith('cb:')) return A.cbLen(name.slice(3)); const d = fxData && fxData.fx[name]; return d ? d.frames.length / d.fps : 0; };
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
  // ---- the isometric arena tiles (assets/iso): pages loaded by group as arenas need them ----------
  // Groups: w walls and rocks, d desert, i iso, a animations. Each tile is drawn with its ground
  // anchor on a point; tinted copies of a page (the hour's light) are made once per tint.
  let isoData = null, isoP = null; const isoPages = {}, isoPend = {}, isoTint = {};
  A.isoReady = (groups) => !!isoData && groups.every((g) => { for (let i = 0; i < (isoData.pages[g] || 0); i++) if (!isoPages[g + i]) return false; return true; });
  A.loadIso = async function (groups) {
    // The packs' tiles, and the forge's (tools_forge.py: the 'v' group) merged over them.
    if (!isoData) isoData = await (isoP || (isoP = Promise.all([loadJSON(A.ROOT + 'iso/tiles.json'), loadJSON(A.ROOT + 'iso/forge.json').catch(() => null)]).then(([d, f]) => {
      if (f) { Object.assign(d.pages, f.pages); Object.assign(d.tiles, f.tiles); Object.assign(d.anims, f.anims || {}); }
      return d;
    })));
    const jobs = [];
    for (const g of groups) for (let i = 0; i < (isoData.pages[g] || 0); i++) { const k = g + i; if (isoPages[k]) continue; jobs.push(isoPend[k] || (isoPend[k] = loadImage(A.ROOT + 'iso/tiles_' + k + '.png').then((im) => { isoPages[k] = im; }))); }
    await Promise.all(jobs);
  };
  function isoPage(p, tint) {
    const im = isoPages[p]; if (!im || !tint) return im;
    const k = p + tint; if (isoTint[k]) return isoTint[k];
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d');
    g.drawImage(im, 0, 0); g.globalCompositeOperation = 'multiply'; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0);
    // Keep only the tints in use: one hour at a time.
    for (const o in isoTint) if (!o.endsWith(tint)) delete isoTint[o];
    return (isoTint[k] = c);
  }
  A.isoHas = (key) => !!(isoData && isoData.tiles[key] && isoPages[isoData.tiles[key][0]]);
  A.isoInfo = (key) => isoData && isoData.tiles[key];
  A.isoAnim = (name) => isoData && isoData.anims[name];
  // Draw a tile with its anchor (the ground diamond's centre) at x, y, scaled; tint: a multiply colour.
  A.iso = function (ctx, key, x, y, scale, tint, alpha) {
    const f = isoData && isoData.tiles[key]; if (!f) return false;
    const pg = isoPage(f[0], tint); if (!pg) return false;
    if (alpha != null) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * alpha; ctx.drawImage(pg, f[1], f[2], f[3], f[4], x + f[5] * scale, y + f[6] * scale, f[3] * scale, f[4] * scale); ctx.globalAlpha = ga; }
    else ctx.drawImage(pg, f[1], f[2], f[3], f[4], x + f[5] * scale, y + f[6] * scale, f[3] * scale, f[4] * scale);
    return true;
  };
  A.isoWarm = function (ctx) { for (const k in isoPages) ctx.drawImage(isoPages[k], 0, 0, 1, 1, 0, 0, 1, 1); ctx.clearRect(0, 0, 2, 2); };
  // The First Cut as a sprite (tools_boss.py): three poses x four frames, at 3 and 6 pixels per unit. Drawn with
  // its eyes at (x, y), u screen pixels per unit; tint/amt darken or colour it toward a colour (amt 1: a silhouette).
  let boss = null, bossP = null; const bossScratch = document.createElement('canvas');
  A.loadBoss = () => bossP || (bossP = loadJSON(A.ROOT + 'forge/firstcut.json').then(async (d) => { d.images = await Promise.all(d.pages.map((p) => loadImage(A.ROOT + 'forge/' + p))); boss = d; }).catch(() => {}));
  A.bossReady = () => !!boss;
  A.boss = function (ctx, pose, fr, x, y, u, tint, amt) {
    if (!boss) return false;
    const P = u >= 4.2 ? 6 : 3, f = boss.frames[pose + '/' + P + '/' + (fr % 4)] || boss.frames['plant/' + P + '/' + (fr % 4)]; if (!f) return false;
    const img = boss.images[f[0]], k = u / P, w = f[3], h = f[4];
    let src = img, sx = f[1], sy = f[2];
    if (tint && amt > 0) {
      if (bossScratch.width < w || bossScratch.height < h) { bossScratch.width = Math.max(bossScratch.width, w); bossScratch.height = Math.max(bossScratch.height, h); }
      const g = bossScratch.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, w, h);
      g.drawImage(img, f[1], f[2], w, h, 0, 0, w, h); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = Math.min(1, amt); g.fillStyle = tint; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; src = bossScratch; sx = 0; sy = 0;
    }
    const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, sx, sy, w, h, Math.round(x - f[5] * k), Math.round(y - f[6] * k), Math.round(w * k), Math.round(h * k));
    ctx.imageSmoothingEnabled = sm; return true;
  };
  A.hasTex = (name) => !!tex[name];
  A.hasTile = (name) => !!(tileData && tileData.sprites[name]);
  A.hasFx = (name) => !!(fxData && fxData.fx[name]);
})();
