// VESPER — the renderer. A 384x216 pixel buffer scaled up without smoothing: the arena (sky, the
// moon, parallax silhouettes, a tiled floor band), the fighters, effects, floaters and the HUD.
(function () {
  const VS = window.VS, D = VS.DATA, A = VS.A;
  const R = VS.R = { W: 320, H: 180, FLOOR: 118, cam: 0, shake: 0, t: 0, touch: false, fx: [], floaters: [], flash: 0, flashCol: '255,255,255' };
  const FONT = 'Adventurer, "Courier New", monospace';
  R.font = (size) => `${size}px ${FONT}`;

  // The visible canvas is the pixel buffer itself, scaled up by CSS with pixelated sampling: the
  // graphics card does the enlargement, nothing full-resolution is painted each frame.
  R.init = function (canvas) {
    R.canvas = R.buf = canvas; R.ctx = canvas.getContext('2d'); R.ctx.imageSmoothingEnabled = false;
    R.resize(); window.addEventListener('resize', R.resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', R.resize);
  };
  R.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    // The picture keeps its height (180 px) and widens to the screen's shape, so a phone has no side bars.
    const W = Math.max(300, Math.min(420, Math.round(R.H * w / Math.max(1, h))));
    if (W !== R.W || R.canvas.width !== W) { R.W = W; R.canvas.width = W; R.canvas.height = R.H; R.ctx.imageSmoothingEnabled = false; }
    const k = Math.min(w / R.W, h / R.H); R.scale = k;
    R.offX = Math.round((w - R.W * k) / 2); R.offY = Math.round((h - R.H * k) / 2);
    const st = R.canvas.style; st.width = Math.round(R.W * k) + 'px'; st.height = Math.round(R.H * k) + 'px'; st.left = R.offX + 'px'; st.top = R.offY + 'px';
  };
  R.present = function () {
    const k = R.scale, st = R.canvas.style;
    if (R.shake > 0.3) { const sx = Math.round((Math.random() - 0.5) * R.shake * k), sy = Math.round((Math.random() - 0.5) * R.shake * k); st.transform = `translate(${sx}px,${sy}px)`; R.shook = true; }
    else if (R.shook) { st.transform = ''; R.shook = false; }
  };
  R.toBuf = (cx, cy) => ({ x: (cx - R.offX) / R.scale, y: (cy - R.offY) / R.scale });

  // ---- text -----------------------------------------------------------------------------------
  // Text is rendered once per string, size and colour into a small canvas and reused (filling text
  // with a custom font every frame was one of the most expensive things on a phone).
  const tcache = new Map();
  R.text = function (ctx, s, x, y, size, col, align, o) {
    o = o || {}; s = String(s);
    const shadow = o.shadow !== false, key = s + '|' + size + '|' + (col || '#fff') + '|' + (o.outline ? 1 : 0) + (shadow ? 1 : 0) + '|' + (o.shadowCol || '');
    let c = tcache.get(key);
    if (!c) {
      const m = R.ctx; m.font = R.font(size);
      const tw = Math.ceil(m.measureText(s).width), pad = 2, h = Math.ceil(size * 1.5) + pad * 2;
      c = document.createElement('canvas'); c.width = Math.max(1, tw + pad * 2 + 1); c.height = h;
      const g = c.getContext('2d'); g.font = R.font(size); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      const bx = pad, by = pad + Math.ceil(size * 1.1);
      if (shadow) { g.fillStyle = o.shadowCol || 'rgba(0,0,0,0.9)'; g.fillText(s, bx + 1, by + 1); if (o.outline) { g.fillText(s, bx - 1, by); g.fillText(s, bx, by - 1); g.fillText(s, bx - 1, by + 1); g.fillText(s, bx + 1, by - 1); } }
      g.fillStyle = col || '#fff'; g.fillText(s, bx, by);
      c.tw = tw; c.bx = bx; c.by = by;
      if (tcache.size > 800) { let n = 0; for (const k of tcache.keys()) { tcache.delete(k); if (++n >= 200) break; } }
      tcache.set(key, c);
    }
    const ax = align === 'center' ? c.tw / 2 : align === 'right' ? c.tw : 0;
    const ay = o.base === 'middle' ? Math.round(size * 0.35) : 0;
    ctx.drawImage(c, Math.round(x - ax - c.bx), Math.round(y + ay - c.by));
  };
  R.wrap = function (ctx, s, size, maxW) {
    ctx.font = R.font(size); const out = []; let cur = '';
    for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    if (cur) out.push(cur); return out;
  };

  // ---- a seeded hash for the scenery ------------------------------------------------------------
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const mix = (c1, c2, k) => {
    const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const a = p(c1), b = p(c2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
  };
  R.mix = mix;

  // A pixel-crisp disc (row by row, so the edge stays on the grid).
  R.disc = function (ctx, cx, cy, r, col) {
    ctx.fillStyle = col; cx = Math.round(cx); cy = Math.round(cy);
    for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(cx - w, cy + y, w * 2, 1); }
  };
  R.moon = function (ctx, cx, cy, r, col, glow) {
    const g = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.6);
    g.addColorStop(0, glow || 'rgba(255,40,60,0.35)'); g.addColorStop(1, 'rgba(255,40,60,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);
    R.disc(ctx, cx, cy, r, col);
    R.disc(ctx, cx - r * 0.18, cy - r * 0.2, Math.round(r * 0.78), mix(col, '#ffffff', 0.12));
  };

  // ---- the arena ----------------------------------------------------------------------------------
  const layerCache = {};
  function ridge(stage, layer, w, h, col, rough) {
    const k = stage + ':' + layer; if (layerCache[k]) return layerCache[k];
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = col; let y = h * 0.5;
    for (let x = 0; x < w; x++) {
      const n = hash(x >> 3, layer * 31 + stage * 7);
      y += (n - 0.5) * rough; y = Math.max(h * 0.15, Math.min(h * 0.9, y));
      if ((x & 7) === 0 && hash(x, layer + 5) < 0.08) { g.fillRect(x, y - 10, 3, 10); }
      g.fillRect(x, Math.round(y), 1, h);
    }
    return (layerCache[k] = c);
  }
  function floorTex(st) {
    const k = 'floor' + st.id; if (layerCache[k]) return layerCache[k];
    const w = D.ARENA.w + 440, h = R.H - R.FLOOR + 8, c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const t = st.look.ground;
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      const r = hash(x >> 4, (y >> 4) + 999); A.tile(g, r < 0.88 ? t[0] : r < 0.97 ? t[1] : t[2], x, y, 16, 16);
    }
    // Depth: dark at the back wall, lighter where the fighters stand, dark again at the front edge.
    const sh = g.createLinearGradient(0, 0, 0, h);
    sh.addColorStop(0, 'rgba(0,0,0,0.85)'); sh.addColorStop(0.3, 'rgba(0,0,0,0.5)'); sh.addColorStop(0.75, 'rgba(0,0,0,0.42)'); sh.addColorStop(1, 'rgba(0,0,0,0.75)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.fillStyle = st.look.fog; g.globalAlpha = 0.4; g.fillRect(0, 0, w, h); g.globalAlpha = 1;
    // A wash of moonlight down the middle of the floor.
    const ml = g.createLinearGradient(0, 0, 0, h); ml.addColorStop(0, 'rgba(255,60,80,0)'); ml.addColorStop(0.55, 'rgba(255,60,80,0.07)'); ml.addColorStop(1, 'rgba(255,60,80,0)');
    g.fillStyle = ml; g.fillRect(0, 0, w, h);
    return (layerCache[k] = c);
  }
  R.drawArena = function (ctx, st, cam, moonPull) {
    const L = st.look, W = R.W, H = R.H, F = R.FLOOR;
    // The sky and the moon (larger and redder every hour), built once per stage and screen width.
    const sk = 'sky' + st.id + W;
    let skyC = layerCache[sk];
    if (!skyC) {
      skyC = layerCache[sk] = document.createElement('canvas'); skyC.width = W + 60; skyC.height = F;
      const g = skyC.getContext('2d'), sky = g.createLinearGradient(0, 0, 0, F);
      sky.addColorStop(0, L.sky[0]); sky.addColorStop(0.65, L.sky[1]); sky.addColorStop(1, L.sky[2]);
      g.fillStyle = sky; g.fillRect(0, 0, skyC.width, F);
      R.moon(g, Math.round(W * 0.7 + 30), Math.round(22 + L.moon * 0.5), L.moon, L.moonCol);
    }
    ctx.drawImage(skyC, -30 - Math.round(Math.min(30, cam * 0.04)), 0);
    // Ridges, far to near.
    const far = mix(L.sky[1], '#000000', 0.35), mid = mix(L.sky[1], '#000000', 0.6);
    const r1 = ridge(st.id.length, 1, 900, 70, far, 3), r2 = ridge(st.id.length, 2, 900, 60, mid, 5);
    ctx.drawImage(r1, -Math.round(cam * 0.12) % 900, F - 62); ctx.drawImage(r1, 900 - Math.round(cam * 0.12) % 900, F - 62);
    ctx.drawImage(r2, -Math.round(cam * 0.25) % 900, F - 42); ctx.drawImage(r2, 900 - Math.round(cam * 0.25) % 900, F - 42);
    // Silhouette props on the horizon.
    const near = mix(L.sky[0], '#000000', 0.55);
    for (let i = 0; i < 16; i++) {
      const px = i * 62 + hash(i, 3) * 30 - cam * 0.55;
      if (px < -60 || px > W + 60) continue;
      const name = L.props[Math.floor(hash(i, 9) * L.props.length)];
      A.prop(ctx, name, px, F + 2, 0.75 + hash(i, 4) * 0.35, near);
    }
    // Fog at the horizon.
    const fg = ctx.createLinearGradient(0, F - 26, 0, F + 4);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, L.fog);
    ctx.fillStyle = fg; ctx.fillRect(0, F - 26, W, 30);
    // The floor band, then a red rim along its back edge.
    ctx.drawImage(floorTex(st), -Math.round(cam), F - 4);
    ctx.fillStyle = 'rgba(255,40,60,0.18)'; ctx.fillRect(0, F - 4, W, 1);
  };
  // Weather in front of everything in the world.
  R.drawWeather = function (ctx, st, cam, t) {
    const L = st.look, W = R.W, H = R.H;
    const n = L.snow || L.ash ? 60 : L.embers ? 36 : L.wind ? 30 : 0;
    for (let i = 0; i < n; i++) {
      const sp = 14 + hash(i, 1) * 26, x0 = hash(i, 2) * (W + 80);
      if (L.wind) { const x = ((x0 - t * (180 + sp * 4) - cam * 0.8) % (W + 80) + W + 80) % (W + 80) - 40, y = hash(i, 3) * H; ctx.fillStyle = 'rgba(220,230,255,0.25)'; ctx.fillRect(x, y, 10 + sp / 3, 1); continue; }
      const up = L.embers ? -1 : 1, y = ((hash(i, 3) * H + up * t * sp) % H + H) % H;
      const x = ((x0 + Math.sin(t * 0.8 + i) * 8 - cam * 0.9 - (L.ash ? t * 10 : 0)) % (W + 80) + W + 80) % (W + 80) - 40;
      ctx.fillStyle = L.snow ? 'rgba(235,240,255,0.8)' : L.ash ? 'rgba(150,140,140,0.6)' : (i % 3 ? 'rgba(255,90,60,0.9)' : 'rgba(255,200,120,0.9)');
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  };

  // ---- the fight ------------------------------------------------------------------------------------
  const ang = (u) => (u.face > 0 ? 0 : Math.PI);
  R.spawnFx = function (name, x, y, o) { R.fx.push(Object.assign({ name, x, y, t: 0, scale: 1, alpha: 1 }, o || {})); };
  R.float = function (text, x, y, col, big) { R.floaters.push({ text, x, y, t: 0, col, big }); };

  // Turn the sim's events into effects, floaters, flashes and shake.
  R.consume = function (s) {
    const yOf = (y) => R.FLOOR + y;
    for (const e of s.events) {
      switch (e.type) {
        case 'hit': {
          const o = s.units.find((u) => u.id === e.id), up = o ? 22 * o.scale : 22;
          R.spawnFx(e.heavy ? 'hit_crit' : 'hit_slash', e.x, yOf(e.y) - up, { scale: e.heavy ? 1.2 : 0.9, angle: (Math.random() - 0.5) });
          R.float(String(e.dmg), e.x, yOf(e.y) - up - 10, e.art ? '#ff4060' : e.heavy ? '#ffd0a0' : '#ffffff', e.heavy);
          R.shake = Math.max(R.shake, e.art ? 6 : e.heavy ? 2.5 : 1.2);
          break;
        }
        case 'hurt': R.spawnFx('hit_blunt', e.x, yOf(e.y) - 22, { scale: 1 }); R.float(String(e.dmg), e.x, yOf(e.y) - 34, '#ff5a6a', e.big); R.flash = 0.35; R.flashCol = '255,30,50'; R.shake = Math.max(R.shake, e.big ? 4 : 2.5); break;
        case 'parry': R.spawnFx('parry', e.x, yOf(e.y) - 20, { scale: 1.2 }); R.spawnFx('star_burst', e.x, yOf(e.y) - 20, { scale: 0.8 }); R.float('PARRY', e.x, yOf(e.y) - 40, '#bfe8ff', true); R.flash = 0.4; R.flashCol = '220,240,255'; R.shake = 3; break;
        case 'perfect': R.spawnFx('star_burst', e.x, yOf(e.y) - 20, { scale: 0.9 }); R.float('PERFECT', e.x, yOf(e.y) - 40, '#8ef0ff', true); break;
        case 'riposte': R.float('RIPOSTE', e.x, yOf(e.y) - 46, '#ff9aa8', true); break;
        case 'break': R.spawnFx('hit_big', e.x, yOf(e.y) - 22, { scale: 1.3 }); R.float('BREAK', e.x, yOf(e.y) - 48, '#ffd060', true); R.shake = 5; break;
        case 'kill': R.spawnFx(e.hero ? 'smoke_dark' : 'dissipate', e.x, yOf(e.y) - 16, { scale: e.boss ? 2 : 1.2 }); if (e.boss) { R.flash = 0.8; R.flashCol = '255,255,255'; R.shake = 8; } break;
        case 'blink': R.spawnFx('teleport', e.x, yOf(e.y) - 18, { scale: 1 }); break;
        case 'dodge': R.spawnFx('dust_kick', e.x, yOf(e.y), { scale: 0.8 }); break;
        case 'boltHit': R.spawnFx('spell_impact', e.x, yOf(e.y) - 16, { scale: 0.9 }); break;
        case 'swing': {
          const h = s.hero; const big = e.clip === 'Attack3' || e.clip === 'Attack6';
          R.spawnFx(big ? 'slash_arc_blood' : (e.clip === 'Attack2' ? 'slash_l' : 'slash_r'), h.x + h.face * 16, yOf(h.y) - 20, { scale: big ? 0.9 : 0.75, flip: h.face < 0 });
          break;
        }
        case 'phase': if (!e.quiet) { R.flash = 0.6; R.flashCol = '255,40,60'; R.shake = 6; } break;
      }
    }
  };

  function drawUnit(ctx, s, u, cam) {
    const x = Math.round(u.x - cam), y = R.FLOOR + Math.round(u.y), sc = u.scale;
    let alpha = 1;
    if (u.state === 'dead' && u.team === 'foe') alpha = Math.max(0, 1 - Math.max(0, u.deadT - 0.9) / 0.8);
    if (alpha <= 0) return;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - 7 * sc, y - 1, 14 * sc, 2); ctx.fillRect(x - 5 * sc, y - 2, 10 * sc, 4);
    // Wind-up tint: unparryable blows glow red.
    const winding = u.state === 'attack' && u.team === 'foe' && u.st < u.atk.wind * u.windMul;
    const opts = { alpha, flash: u.flash };
    if (winding && u.atk.unparry) { opts.flash = 0.25 + 0.25 * Math.sin(R.t * 30); opts.flashCol = '#ff2040'; }
    if (u.team === 'hero' && u.iframes > 0 && u.state !== 'dodge' && u.state !== 'hurt' && Math.floor(R.t * 20) % 2) opts.alpha = 0.6;
    // Dodge afterimages.
    if (u.state === 'dodge') for (let i = 1; i <= 3; i++) A.actor(ctx, u.set, u.clip, Math.max(0, u.frame - i * 2), ang(u), x - u.dodgeDir[0] * i * 9, y - u.dodgeDir[1] * i * 5, sc, { shade: '#ff2a44', alpha: 0.3 - i * 0.07 });
    // A thin rim so dark fighters read against dark ground: red for the knight, pale for the rest.
    const rim = u.team === 'hero' ? 'rgba(255,42,68,0.55)' : 'rgba(210,205,230,0.3)';
    if (alpha > 0.5) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1]]) A.actor(ctx, u.set, u.clip, u.frame, ang(u), x + ox, y + oy, sc, { shade: rim, alpha: alpha });
    A.actor(ctx, u.set, u.clip, u.frame, ang(u), x, y, sc, opts);
    // Telegraph glint at the top of the body.
    if (winding) {
      const k = u.st / (u.atk.wind * u.windMul);
      if (k > 0.35) {
        const gx = x + u.face * 6 * sc, gy = y - 34 * sc, r = Math.round(2 + 5 * Math.sin(Math.min(1, (k - 0.35) / 0.65) * Math.PI));
        ctx.fillStyle = u.atk.unparry ? '#ff2a44' : '#ffffff';
        ctx.fillRect(gx - r, gy, r * 2 + 1, 1); ctx.fillRect(gx, gy - r, 1, r * 2 + 1);
        ctx.fillRect(gx - 1, gy - 1, 3, 3);
      }
    }
    // Parry stance: a thin guard arc while the window is open.
    if (u.state === 'parry' && u.st <= s.mods.parryWin) {
      ctx.strokeStyle = 'rgba(200,235,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath();
      ctx.arc(x + u.face * 6, y - 20, 14, u.face > 0 ? -1.1 : Math.PI - 1.1 + 0.0, u.face > 0 ? 1.1 : Math.PI + 1.1); ctx.stroke();
    }
  }

  R.drawFight = function (ctx, s, dt) {
    const h = s.hero;
    // Camera: follow the hero, lean toward the nearest foe.
    const f = VS.sim.foes(s).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x))[0];
    let want = h.x - R.W / 2; if (f && Math.abs(f.x - h.x) < 200) want = (h.x + f.x) / 2 - R.W / 2;
    want = Math.max(0, Math.min(D.ARENA.w - R.W, want));
    R.cam += (want - R.cam) * Math.min(1, dt * 4); const cam = Math.round(R.cam);
    R.drawArena(ctx, s.def, cam, s.moon / 100);
    // Units and bolts, back to front.
    const list = s.units.slice().sort((a, b) => a.y - b.y);
    for (const u of list) drawUnit(ctx, s, u, cam);
    for (const b of s.bolts) {
      const x = b.x - cam, y = R.FLOOR + b.y - 16;
      A.fx(ctx, b.fx, b.t, x, y, b.fx === 'wind_gust' ? 0.8 : 0.9, 1, 0, b.vx < 0) || (ctx.fillStyle = '#c070ff', ctx.fillRect(x - 3, y - 3, 6, 6));
      if (b.reflected) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(x - 1, y - 1, 3, 3); }
    }
    // Effects in the world.
    R.fx = R.fx.filter((e) => {
      e.t += dt;
      const alive = A.fx(ctx, e.name, e.t, e.x - cam, e.y, e.scale, e.alpha, e.angle, e.flip);
      return alive && e.t < 3;
    });
    R.drawWeather(ctx, s.def, cam, R.t);
    // Floaters.
    R.floaters = R.floaters.filter((fl) => {
      fl.t += dt; const k = fl.t / 0.9; if (k >= 1) return false;
      ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      R.text(ctx, fl.text, Math.round(fl.x - cam), Math.round(fl.y - k * 12), fl.big ? 10 : 8, fl.col, 'center', { outline: true });
      ctx.restore(); return true;
    });
    // Perfect-dodge slow motion: a cold edge.
    if (s.slowT > 0) { ctx.fillStyle = 'rgba(120,220,255,0.10)'; ctx.fillRect(0, 0, R.W, R.H); }
    // Low health: a red pulse at the edges.
    if (h.alive && h.hp / h.maxHp <= s.mods.ldx) {
      const vk = 'vig' + R.W;
      if (!layerCache[vk]) {
        const c = layerCache[vk] = document.createElement('canvas'); c.width = R.W; c.height = R.H; const g2 = c.getContext('2d');
        const g = g2.createRadialGradient(R.W / 2, R.H / 2, R.H * 0.35, R.W / 2, R.H / 2, R.W * 0.6);
        g.addColorStop(0, 'rgba(200,10,30,0)'); g.addColorStop(1, 'rgba(200,10,30,1)'); g2.fillStyle = g; g2.fillRect(0, 0, R.W, R.H);
      }
      ctx.save(); ctx.globalAlpha = 0.3 + 0.12 * Math.sin(R.t * 5); ctx.drawImage(layerCache[vk], 0, 0); ctx.restore();
    }
    if (R.flash > 0) { ctx.fillStyle = `rgba(${R.flashCol},${R.flash * 0.5})`; ctx.fillRect(0, 0, R.W, R.H); R.flash = Math.max(0, R.flash - dt * 2.5); }
    R.shake = Math.max(0, R.shake - dt * 18);
  };

  // ---- HUD ----------------------------------------------------------------------------------------------
  R.drawHud = function (ctx, s, opts) {
    const h = s.hero, W = R.W;
    // The hero: a long thin bar, top left.
    R.text(ctx, 'VESPER', 8, 12, 8, '#ffffff');
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, 15, 112, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(8, 15, 112, 1); ctx.fillRect(8, 18, 112, 1);
    ctx.fillStyle = '#ff2a44'; ctx.fillRect(8, 16, Math.round(112 * h.hp / h.maxHp), 2);
    // The moon gauge: a small moon that fills.
    const mx = 16, my = 34, r = 8, k = s.moon / 100, full = k >= 1;
    R.disc(ctx, mx, my, r + 1, '#000000');
    R.disc(ctx, mx, my, r, '#2a0a12');
    ctx.save(); ctx.beginPath(); ctx.rect(mx - r, my + r - Math.round(2 * r * k), 2 * r + 1, 2 * r + 1); ctx.clip();
    R.disc(ctx, mx, my, r, full ? (Math.sin(R.t * 8) > 0 ? '#ff4060' : '#ff1a38') : '#c01a30'); ctx.restore();
    if (full) {
      const ldx = VS.ldxReady(s);
      R.text(ctx, ldx ? 'LAST DITCH EFFORT' : 'RED MOON', 28, 37, ldx ? 9 : 8, ldx ? (Math.sin(R.t * 10) > 0 ? '#ff2a44' : '#ffffff') : '#ff8090', 'left');
      R.text(ctx, opts.touch ? 'tap MOON' : '[L]', 28, 46, 6, '#c0a0a8');
    }
    // The boss: a thin bar across the top centre.
    const bosses = s.units.filter((u) => u.def.boss && (u.alive || u.deadT < 1));
    bosses.forEach((b, i) => {
      const bw = bosses.length > 1 ? 104 : 200, bx = bosses.length > 1 ? W - 12 - (2 - i) * 112 : W - 12 - bw, by = 14;
      R.text(ctx, b.def.name.toUpperCase() + (bosses.length > 1 ? '' : '  ·  ' + b.def.title.toUpperCase()), bx, by - 3, 6, '#e8d8dc');
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx, by, bw, 3);
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(bx, by, bw, 1);
      ctx.fillStyle = b.phase === 2 ? '#ff2a44' : '#d03048'; ctx.fillRect(bx, by + 1, Math.round(bw * Math.max(0, b.hp) / b.maxHp), 2);
      if (b.maxPoise) { ctx.fillStyle = '#ffd060'; ctx.fillRect(bx, by + 4, Math.round(bw * 0.35 * b.poise / b.maxPoise), 1); }
    });
    // Waves and the combo.
    if (s.wave < s.waves.length - 1 && s.wave >= 0 && !bosses.length) R.text(ctx, `WAVE ${s.wave + 1}/${s.waves.length - 1}`, W - 8, 12, 7, '#c8b8c0', 'right');
    if (s.combo >= 3) {
      const c = s.combo, sz = Math.min(16, 9 + c * 0.3);
      R.text(ctx, String(c), W - 34, 70, sz, c >= 20 ? '#ff2a44' : '#ffffff', 'right', { outline: true });
      R.text(ctx, 'HITS', W - 8, 70, 7, '#ff8090', 'right');
    }
  };

  // Touch controls: a stick bottom left; ATTACK, DODGE, PARRY and the MOON bottom right.
  R.touchLayout = function () {
    const W = R.W, H = R.H;
    return { stick: { x: 42, y: H - 42, r: 26 },
      buttons: [{ id: 'atk', x: W - 36, y: H - 34, r: 20, label: 'CUT' }, { id: 'dodge', x: W - 80, y: H - 20, r: 14, label: 'DASH' },
        { id: 'parry', x: W - 74, y: H - 60, r: 14, label: 'PARRY' }, { id: 'art', x: W - 32, y: H - 82, r: 14, label: 'MOON' },
        { id: 'pause', x: W - 14, y: 30, r: 9, label: 'II' }] };
  };
  R.drawTouch = function (ctx, s, st) {
    const L = R.touchLayout();
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(L.stick.x, L.stick.y, L.stick.r, 0, 7); ctx.stroke();
    const kx = st.stick ? st.stick.dx * L.stick.r : 0, ky = st.stick ? st.stick.dy * L.stick.r : 0;
    R.disc(ctx, L.stick.x + kx, L.stick.y + ky, 9, 'rgba(255,255,255,0.5)');
    for (const b of L.buttons) {
      const on = b.id !== 'art' || s.moon >= 100;
      ctx.globalAlpha = on ? (st.held[b.id] ? 0.85 : 0.5) : 0.2;
      R.disc(ctx, b.x, b.y, b.r, b.id === 'art' ? '#a01028' : b.id === 'atk' ? '#3a2028' : '#202030');
      ctx.strokeStyle = b.id === 'art' && on ? '#ff4060' : '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
      R.text(ctx, b.label, b.x, b.y + 3, b.r > 16 ? 9 : 7, '#ffffff', 'center', { shadow: false });
    }
    ctx.restore();
  };
})();
