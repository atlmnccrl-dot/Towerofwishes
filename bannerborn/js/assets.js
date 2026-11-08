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
    return { img, meta };
  }
  const pending = {};
  BB.loadChar = function (key) {
    if (A.chars[key]) return Promise.resolve(A.chars[key]);
    if (!pending[key]) pending[key] = loadAtlas('assets/chars/' + key).then((a) => (A.chars[key] = a));
    return pending[key];
  };
  BB.loadEnv = function (biome) {
    if (A.env[biome]) return Promise.resolve(A.env[biome]);
    if (!pending['env' + biome]) pending['env' + biome] = loadAtlas('assets/env/' + biome).then((a) => (A.env[biome] = a));
    return pending['env' + biome];
  };
  BB.loadFx = function () {
    if (A.fx) return Promise.resolve(A.fx);
    if (!pending.fx) pending.fx = loadAtlas('assets/fx/fx').then((a) => (A.fx = a));
    return pending.fx;
  };
  BB.loadBase = function (onProgress) {
    const list = ['body', 'hair', 'helm', 'chestA', 'chestB', 'legsA', 'legsB', 'sword', 'axe', 'shield', 'slash'];
    let done = 0; const total = list.length + 2;
    const tick = () => { done++; onProgress && onProgress(done / total); };
    return Promise.all(list.map((k) => BB.loadChar(k).then(tick)).concat([BB.loadFx().then(tick), BB.loadEnv('vale').then(tick)]));
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
  function recolor(img, spec) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    const cache = new Map();
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
  BB.clipLen = function (key, clip) {
    const a = A.chars[key]; return a && a.meta.clips[clip] || 0;
  };
  BB.hasClip = (key, clip) => !!(A.chars[key] && A.chars[key].meta.clips[clip]);
  function drawFrame(ctx, key, img, clip, dir, frame, x, y, sc) {
    const a = A.chars[key]; if (!a) return;
    const n = a.meta.clips[clip]; if (!n) return;
    const r = a.meta.f[clip][dir * n + (Math.max(0, Math.min(n - 1, frame | 0)))];
    if (!r || r[2] <= 1) return;
    ctx.drawImage(img, r[0], r[1], r[2], r[3], x + (r[4] - FOOT_X) * sc, y + (r[5] - FOOT_Y) * sc, r[2] * sc, r[3] * sc);
  }
  BB.drawFrame = drawFrame;

  // layer list for a hero look + gear (cached on the hero object by a signature)
  BB.heroLayers = function (hero) {
    if (hero.legend) {
      const L = BB.LEGENDS[hero.legend];
      return [{ key: L.art, spec: null, sk: '' }];
    }
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
      const img = BB.atlasImg(L.key, L.spec, L.sk);
      if (!img) continue;
      let c = clip;
      if (!BB.hasClip(L.key, c)) c = 'Idle';
      drawFrame(ctx, L.key, img, c, dir, frame, x, y, sc);
    }
    if (opts.flash) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opts.flash;
      for (const L of layers) {
        if (L.slash) continue;
        const img = BB.atlasImg(L.key, L.spec, L.sk); if (!img) continue;
        drawFrame(ctx, L.key, img, BB.hasClip(L.key, clip) ? clip : 'Idle', dir, frame, x, y, sc);
      }
      ctx.restore();
    }
  };
  BB.drawChar = function (ctx, key, tintId, clip, dir, frame, x, y, sc, flash) {
    const spec = BB.tintSpec(key, tintId);
    const img = BB.atlasImg(key, spec, tintId || '');
    if (!img) return;
    if (!BB.hasClip(key, clip)) clip = 'Idle';
    drawFrame(ctx, key, img, clip, dir, frame, x, y, sc);
    if (flash) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash;
      drawFrame(ctx, key, img, clip, dir, frame, x, y, sc); ctx.restore();
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
  BB.envRect = function (biome, name) { const a = A.env[biome]; return a && a.meta.f[name]; };
  BB.envHas = (biome, name) => !!(A.env[biome] && A.env[biome].meta.f[name]);

  // ---- effects: anchor = sprite centre. tinted variants cached per hue
  BB.fxLen = (key) => (A.fx && A.fx.meta.n[key]) || 0;
  const fxTint = {};
  BB.drawFx = function (ctx, key, frame, x, y, sc, opts) {
    const a = A.fx; if (!a) return;
    const n = a.meta.n[key]; if (!n) return;
    const r = a.meta.f[key][Math.max(0, Math.min(n - 1, frame | 0))];
    if (!r || r[2] <= 1) return;
    let img = a.img;
    opts = opts || {};
    if (opts.hue !== undefined) {
      const ck = opts.hue + '|' + (opts.sat || 1);
      if (!fxTint[ck]) fxTint[ck] = recolor(a.img, opts.flat ? { mode: 'flat', h: opts.hue, s: opts.sat || 0.9, l: opts.l || 1 } : { mode: 'rot', rot: opts.hue, l: 1, sat: opts.sat });
      img = fxTint[ck];
    }
    sc = sc || 1;
    const sy = opts.squash || 1;
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    if (opts.add) ctx.globalCompositeOperation = 'lighter';
    if (opts.rot) {
      ctx.translate(x, y); ctx.rotate(opts.rot);
      ctx.drawImage(img, r[0], r[1], r[2], r[3], r[4] * sc, r[5] * sc * sy, r[2] * sc, r[3] * sc * sy);
    } else {
      ctx.drawImage(img, r[0], r[1], r[2], r[3], x + r[4] * sc, y + r[5] * sc * sy, r[2] * sc, r[3] * sc * sy);
    }
    ctx.restore();
  };

  // ---- a portrait canvas for a hero (head and shoulders, facing the camera)
  const portraitCache = {};
  BB.portrait = function (hero, size) {
    size = size || 64;
    const sig = (hero.legend || BB.layerSig(hero)) + size;
    if (portraitCache[sig]) return portraitCache[sig];
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const sc = size / 28;
    const layers = BB.heroLayers(hero);
    BB.drawLayers(x, layers, 'Idle', 2, 0, size / 2, 47 * sc, sc, { noSlash: true });
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
