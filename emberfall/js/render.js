// EMBERFALL — the renderer. Draws places, the fight, the HUD and text on a 480x270 pixel buffer.
(function () {
  const EF = window.EF; const D = EF.DATA; const S = EF.STORY;
  const R = EF.R = { W: 480, H: 270, cam: { x: 0, y: 0, zoom: 1 }, touch: false, t: 0 };
  const PX = 'Adventurer, "Press Start 2P", monospace';
  R.font = (size, bold) => `${bold ? 'bold ' : ''}${size}px ${PX}`;
  R.WORLD = { w: 560, h: 330, sx: 1.12, sy: 1.1 };

  R.init = function (canvas) {
    R.canvas = canvas; R.buf = document.createElement('canvas'); R.buf.width = R.W; R.buf.height = R.H;
    R.ctx = R.buf.getContext('2d'); R.ctx.imageSmoothingEnabled = false; R.out = canvas.getContext('2d'); R.resize();
    window.addEventListener('resize', R.resize);
  };
  R.resize = function () {
    const c = R.canvas; const dpr = Math.min(2, window.devicePixelRatio || 1); const w = window.innerWidth, h = window.innerHeight;
    const W = Math.max(480, Math.min(600, Math.round(270 * w / Math.max(1, h)))); if (W !== R.W) { R.W = W; R.buf.width = W; R.ctx.imageSmoothingEnabled = false; }
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    const k = Math.min(c.width / R.W, c.height / R.H); R.scale = k; R.offX = Math.round((c.width - R.W * k) / 2); R.offY = Math.round((c.height - R.H * k) / 2); R.dpr = dpr;
  };
  R.present = function () {
    const o = R.out; o.imageSmoothingEnabled = false; o.fillStyle = '#000'; o.fillRect(0, 0, R.canvas.width, R.canvas.height);
    o.drawImage(R.buf, R.offX, R.offY, Math.round(R.W * R.scale), Math.round(R.H * R.scale));
  };
  // Screen (CSS px) to buffer coordinates.
  R.toBuf = (cx, cy) => ({ x: (cx * R.dpr - R.offX) / R.scale, y: (cy * R.dpr - R.offY) / R.scale });

  // ---- text ------------------------------------------------------------------------------
  R.text = function (ctx, s, x, y, size, color, align, opts) {
    const o = opts || {}; ctx.font = R.font(size, o.bold); ctx.textAlign = align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.shadow !== false) { ctx.fillStyle = o.shadowColor || 'rgba(0,0,0,0.85)'; ctx.fillText(s, x + 1, y + 1); if (o.outline) { ctx.fillText(s, x - 1, y); ctx.fillText(s, x + 1, y); ctx.fillText(s, x, y - 1); ctx.fillText(s, x, y + 1); } }
    ctx.fillStyle = color || '#fff'; ctx.fillText(s, x, y);
  };
  R.wrap = function (ctx, s, size, maxW) {
    ctx.font = R.font(size); const words = s.split(' '); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  };
  R.panel = function (ctx, x, y, w, h, alpha, border) {
    ctx.fillStyle = `rgba(10,8,14,${alpha == null ? 0.78 : alpha})`; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = border || 'rgba(230,190,120,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  R.bar = function (ctx, x, y, w, h, frac, color, back) {
    ctx.fillStyle = back || 'rgba(0,0,0,0.7)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.max(0, Math.round((w - 2) * Math.max(0, Math.min(1, frac)))), h - 2);
  };

  // ---- places ----------------------------------------------------------------------------
  const groundCache = {};
  function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  R.ground = function (placeId) {
    if (groundCache[placeId]) return groundCache[placeId];
    const p = S.PLACES[placeId]; const w = R.WORLD.w, h = R.WORLD.h; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const tiles = p.ground; const seed = placeId.length * 17;
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      const r = hash(x, y, seed); const road = Math.abs(y + 16 - h / 2) < 40 && hash(x, y, seed + 1) < 0.85;
      let t = road ? p.road : (r < 0.55 ? tiles[0] : r < 0.8 ? tiles[1] : r < 0.93 ? tiles[2] : tiles[3]);
      if (road && hash(x, y, seed + 2) < 0.3) t = tiles[0];
      if (!EF.drawTile(g, t, x, y)) EF.drawTile(g, tiles[0], x, y);
    }
    // soften with a dark wash and a vignette
    g.fillStyle = p.wash || 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, w, h);
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
    return groundCache[placeId] = c;
  };
  R.placeProps = function (placeId) { const p = S.PLACES[placeId]; return p.props.map(([name, x, y]) => ({ name, x: x * R.WORLD.sx, y: y * R.WORLD.sy })); };

  // Weather: looping effect clips tiled across the view at low alpha.
  R.weather = function (ctx, kind, t, W, H, alpha) {
    const map = { ash: ['ash', 0.5], snow: ['snow', 0.6], rain: ['rain', 0.5], fog: ['fog', 0.35], fireflies: ['fireflies', 0.7], embers: ['embers', 0.7], motes: ['motes', 0.6] };
    const m = map[kind]; if (!m) return; const k = 3; const step = 32 * k;
    ctx.save(); ctx.globalAlpha = (alpha == null ? 1 : alpha) * m[1];
    for (let y = 0; y < H + step; y += step) for (let x = 0; x < W + step; x += step) EF.drawFx(ctx, m[0], t + hash(x, y, 3) * 2, x, y, k);
    ctx.restore();
  };
  R.applyCamera = function (ctx, cam) { ctx.translate(R.W / 2, R.H / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-Math.round(cam.x), -Math.round(cam.y)); };
  R.sky = function (ctx, place) { const p = S.PLACES[place]; ctx.fillStyle = p.sky; ctx.fillRect(0, 0, R.W, R.H); };
  R.fogOverlay = function (ctx, place, alpha) { const p = S.PLACES[place]; const g = ctx.createLinearGradient(0, 0, 0, R.H); g.addColorStop(0, p.fog); g.addColorStop(0.5, 'rgba(0,0,0,0)'); ctx.save(); ctx.globalAlpha = alpha == null ? 0.35 : alpha; ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H); ctx.restore(); };

  // Draw a world: ground, then props and actors sorted by their feet.
  R.drawWorld = function (ctx, place, cam, drawables, t, opts) {
    const o = opts || {}; ctx.save(); R.applyCamera(ctx, cam);
    ctx.drawImage(R.ground(place), 0, 0);
    if (o.groundFx) for (const f of o.groundFx) EF.drawFx(ctx, f.name, f.t, f.x, f.y, f.scale, f.alpha);
    if (o.under) o.under(ctx);
    const list = R.placeProps(place).map(p => ({ y: p.y, draw: c => EF.drawProp(c, p.name, p.x, p.y) })).concat(drawables);
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw(ctx);
    if (o.over) o.over(ctx);
    ctx.restore();
  };
  R.shadow = function (ctx, x, y, r) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 1, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); };

  // ---- the fight -------------------------------------------------------------------------
  const flashers = {};
  R.drawFight = function (ctx, c, place, t) {
    const host = c.hostEnt(); const cam = R.cam;
    // camera: follow the host, keep the boss in view a little
    let tx = host.x, ty = host.y; if (c.boss && !c.boss.dead) { tx = tx * 0.7 + c.boss.x * 0.3; ty = ty * 0.7 + c.boss.y * 0.3; }
    const zoom = c.result === 'win' ? 1.35 : 1.15; cam.zoom += (zoom - cam.zoom) * 0.04;
    const vw = R.W / cam.zoom, vh = R.H / cam.zoom; tx = Math.max(vw / 2, Math.min(R.WORLD.w - vw / 2, tx)); ty = Math.max(vh / 2, Math.min(R.WORLD.h - vh / 2, ty));
    cam.x += (tx - cam.x) * 0.08; cam.y += (ty - cam.y) * 0.08;
    if (c.shake > 0) { cam.x += (Math.random() - 0.5) * c.shake * 8; cam.y += (Math.random() - 0.5) * c.shake * 6; }
    R.sky(ctx, place);
    const drawables = [];
    for (const e of c.ents) drawables.push({ y: e.y + (e.dead ? -1000 : 0), draw: g => R.drawEnt(g, e, c) });
    for (const f of c.fx) if (!f.ground) drawables.push({ y: f.y + 6, draw: g => EF.drawFx(g, f.name, f.t, f.x, f.y, f.scale, f.alpha, f.ang) });
    for (const p of c.projs) drawables.push({ y: p.y + 14, draw: g => { EF.drawFx(g, p.fx, p.t, p.x, p.y, p.r > 10 ? 2.5 : 1.6, 1, p.fx === 'arrow' || p.fx === 'dagger' || p.fx === 'ice_shard' ? p.ang : 0); R.shadow(g, p.x, p.y + 14, 4); } });
    R.drawWorld(ctx, place, cam, drawables, t, {
      groundFx: c.fx.filter(f => f.ground),
      under: g => { for (const e of c.ents) if (!e.dead) R.drawUnder(g, e, c, t); },
      over: g => { for (const e of c.ents) if (!e.dead && e.kind === 'foe' && !e.boss) R.bar(g, e.x - 12, e.y - 44 * e.scale - 6, 24, 4, e.hp / e.maxHp, e.stagger > 0 ? '#ffb040' : '#e04040');
        for (const f of c.floaters) { const a = 1 - Math.max(0, (f.t - 0.6) / 0.5); g.save(); g.globalAlpha = a; R.text(g, f.text, f.x, f.y, f.big ? 11 : 8, f.color, 'center', { bold: f.big, outline: true }); g.restore(); } } });
    R.weather(ctx, S.PLACES[place].weather, t, R.W, R.H, 0.8); R.fogOverlay(ctx, place, 0.3);
    if (c.surgeT > 0) { ctx.save(); ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 10); const g = ctx.createRadialGradient(R.W / 2, R.H / 2, R.H * 0.3, R.W / 2, R.H / 2, R.W * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#ff6020'); ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H); ctx.restore(); }
    if (c.slowT > 0) { ctx.save(); ctx.globalAlpha = 0.15; ctx.fillStyle = '#80c0ff'; ctx.fillRect(0, 0, R.W, R.H); ctx.restore(); }
    R.drawHud(ctx, c, t);
  };
  R.drawUnder = function (ctx, e, c, t) {
    const hostE = c.hostEnt();
    if (e === hostE && !c.auto) { ctx.save(); ctx.strokeStyle = e.hero.color; ctx.globalAlpha = 0.8; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 12, 5.5, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (e.stagger > 0 && e.kind === 'foe') { ctx.save(); ctx.strokeStyle = '#ffb040'; ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 14); ctx.beginPath(); ctx.ellipse(e.x, e.y + 1, 10 * e.scale + 4, 4.5 * e.scale + 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    if (e.kind === 'foe' && e.state === 'attack' && !e.hitDone && e.cur) {
      const a = e.cur; const k = Math.min(1, e.stateT / e.tele); ctx.save(); ctx.globalAlpha = 0.25 + 0.45 * k; ctx.fillStyle = k > 0.8 ? '#ff5030' : '#d02020'; ctx.strokeStyle = '#ff6040'; ctx.lineWidth = 1;
      if (a.aoe) { ctx.beginPath(); ctx.ellipse(e.x, e.y, a.reach * k, a.reach * k * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(e.x, e.y, a.reach, a.reach * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
      else if (a.dash || a.bolt) { const L = a.dash ? (a.dashLen || a.reach) : a.reach; ctx.translate(e.x, e.y); ctx.scale(1, 0.55); ctx.rotate(e.facing); ctx.fillRect(0, -6, L * k, 12); ctx.globalAlpha = 0.9; ctx.strokeRect(0, -6, L, 12); }
      else { ctx.translate(e.x, e.y); ctx.scale(1, 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, (a.reach + 8) * k, e.facing - a.arc / 2, e.facing + a.arc / 2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, a.reach + 8, e.facing - a.arc / 2, e.facing + a.arc / 2); ctx.closePath(); ctx.stroke(); }
      ctx.restore();
    }
  };
  R.drawEnt = function (ctx, e, c) {
    const frame = EF.frameAt(e.clip, e.animT); let alpha = 1;
    if (e.dead) { alpha = e.kind === 'foe' ? Math.max(0, 1 - Math.max(0, e.stateT - 1.2) / 0.8) : 1; if (alpha <= 0) return; }
    else R.shadow(ctx, e.x, e.y, 9 * e.scale);
    const tint = e.status.frost > 0 ? '#80c0ff' : e.status.shock > 0 ? '#ffe080' : e.status.burn > 0 ? '#ff8040' : null;
    const ghost = e.state === 'dodge' && e.iframes > 0 ? 0.6 : 1;
    EF.drawActor(ctx, e.set, e.clip, frame, e.facing, Math.round(e.x), Math.round(e.y), e.scale, { flash: e.flash, tint, alpha: alpha * ghost });
    if (e.status.burn > 0 && !e.dead) EF.drawFx(ctx, 'flame', c.t + e.x, e.x, e.y - 14 * e.scale, 1.2 * e.scale, 0.8);
    if (e.boss && !e.dead && e.state === 'attack' && !e.hitDone) { /* a boss roar glyph */ }
  };
  // Portrait: the actor's head cropped into a circle.
  const portraitCache = {};
  R.portrait = function (set, size, color) {
    const key = set + size; if (portraitCache[key]) return portraitCache[key];
    const c = document.createElement('canvas'); c.width = size; c.height = size; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.beginPath(); g.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); g.clip(); g.fillStyle = '#1a1420'; g.fillRect(0, 0, size, size);
    const k = size / 22; EF.drawActor(g, set, 'Idle', 0, Math.PI / 2, size / 2, size / 2 + 30 * k, k);
    return portraitCache[key] = c;
  };
  R.drawHud = function (ctx, c, t) {
    const W = R.W, H = R.H;
    // party chips
    c.heroes.forEach((h, i) => {
      const x = 6, y = 6 + i * 30; const isHost = c.host === i; const size = 22;
      ctx.save(); ctx.globalAlpha = h.dead ? 0.4 : 1;
      ctx.fillStyle = 'rgba(10,8,14,0.7)'; ctx.fillRect(x - 1, y - 1, 92, 27);
      ctx.drawImage(R.portrait(h.set, size), x, y + 1);
      ctx.strokeStyle = isHost ? '#ffd060' : h.hero.color; ctx.lineWidth = isHost ? 2 : 1; ctx.beginPath(); ctx.arc(x + size / 2, y + 1 + size / 2, size / 2, 0, Math.PI * 2); ctx.stroke();
      if (isHost && !c.auto) EF.drawIcon(ctx, 2, 6, 7, x + size - 8, y - 5, 12);
      R.text(ctx, h.name.split(' ')[0].toUpperCase(), x + size + 4, y + 8, 7, isHost ? '#ffd060' : '#e8e0d0');
      R.bar(ctx, x + size + 4, y + 11, 62, 5, h.hp / h.maxHp, h.hp / h.maxHp < 0.3 ? '#ff4040' : '#60d060');
      const cdf = h.cdMax ? 1 - Math.max(0, h.cd) / h.cdMax : 1; R.bar(ctx, x + size + 4, y + 18, 62, 4, cdf, cdf >= 1 ? '#ffd060' : '#8070c0');
      if (cdf >= 1 && !h.dead) R.text(ctx, 'RDY', x + size + 68, y + 22, 6, '#ffd060', 'right');
      ctx.restore();
    });
    // waves / boss
    if (c.boss && !c.boss.dead) {
      const bw = 200, bx = (W - bw) / 2; R.text(ctx, c.boss.name.toUpperCase(), W / 2, 12, 8, '#ffd0a0', 'center'); R.bar(ctx, bx, 15, bw, 7, c.boss.hp / c.boss.maxHp, '#d03030');
      R.bar(ctx, bx + 40, 23, bw - 80, 3, c.boss.poise / c.boss.maxPoise, c.boss.stagger > 0 ? '#ffb040' : '#c0a060');
    } else {
      const foes = c.alive(1).length; R.text(ctx, 'WAVE ' + (c.wave + 1) + ' / ' + c.waves.length, W / 2, 12, 7, '#e8e0d0', 'center');
      for (let i = 0; i < Math.min(foes, 12); i++) { ctx.fillStyle = '#e04040'; ctx.fillRect(W / 2 - foes * 4 + i * 8 + 1, 16, 5, 5); }
    }
    if (c.sayT > 0 && c.bossSay) { const a = Math.min(1, c.sayT); ctx.save(); ctx.globalAlpha = a; R.text(ctx, c.bossSay.text, W / 2, 38, 8, '#ffd0a0', 'center', { bold: true }); ctx.restore(); }
    // combo
    if (c.combo > 1) { const sc = 1 + Math.max(0, 0.3 - c.comboT * 0.1); R.text(ctx, c.combo + ' HITS', W - 10, 50, 12, c.combo > 20 ? '#ffd060' : '#fff', 'right', { bold: true }); }
    // surge gauge
    const gx = 34, gy = H - 34, gr = 18; ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.stroke();
    const full = c.surge >= 100 && c.surgeT <= 0; ctx.strokeStyle = full ? (Math.sin(t * 10) > 0 ? '#fff0a0' : '#ff8030') : c.surgeT > 0 ? '#ff6020' : '#e07030';
    ctx.beginPath(); ctx.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (c.surgeT > 0 ? c.surgeT / 7 : c.surge / 100)); ctx.stroke(); ctx.restore();
    EF.drawIcon(ctx, 2, 5, 2, gx - 8, gy - 8, 16, full ? 1 : 0.5);
    R.text(ctx, full ? 'SURGE' : c.surgeT > 0 ? 'BURNING' : 'EMBER', gx, gy + gr + 10, 6, full ? '#ffe080' : '#c0b0a0', 'center');
    if (c.potions > 0) { EF.drawIcon(ctx, 2, 0, 2, gx + 30, gy - 10, 16); R.text(ctx, 'x' + c.potions, gx + 48, gy + 2, 7, '#fff'); }
    // banners
    for (const b of c.banners) { const a = b.t < 0.2 ? b.t / 0.2 : b.t > b.dur - 0.4 ? (b.dur - b.t) / 0.4 : 1; ctx.save(); ctx.globalAlpha = Math.max(0, a);
      if (b.big) { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, H / 2 - 22, W, 36); R.text(ctx, b.text, W / 2, H / 2 + 2, 16, '#ffe0a0', 'center', { bold: true }); }
      else R.text(ctx, b.text, W / 2, H / 2 - 40, 11, '#fff', 'center', { bold: true }); ctx.restore(); }
    if (c.introT > 0 && c.t < 0.05) { /* first frame */ }
    // touch controls
    if (R.touch) R.drawTouch(ctx, c, t);
    else if (c.t < 6 && !c.auto) { ctx.save(); ctx.globalAlpha = Math.min(1, (6 - c.t)); R.text(ctx, 'WASD move   J attack   K heavy   SPACE dodge   L special   Q surge   TAB swap   E potion', W / 2, H - 8, 6, '#c0b0a0', 'center'); ctx.restore(); }
    if (R.touch && c.t < 6 && !c.auto) { ctx.save(); ctx.globalAlpha = Math.min(1, (6 - c.t)); R.text(ctx, 'LEFT: touch and drag to move', 60, H - 100, 6, '#c0b0a0', 'left'); ctx.restore(); }
  };
  // Touch layout (buffer coordinates).
  R.touchLayout = function () {
    const W = R.W, H = R.H; return { stick: { x: 62, y: H - 62, r: 34 },
      buttons: [ { id: 'attack', x: W - 36, y: H - 44, r: 20, label: 'ATK', col: '#e0a040' }, { id: 'heavy', x: W - 82, y: H - 30, r: 15, label: 'HVY', col: '#e06040' },
        { id: 'dodge', x: W - 70, y: H - 74, r: 15, label: 'DGE', col: '#60c0ff' }, { id: 'special', x: W - 36, y: H - 94, r: 16, label: 'ART', col: '#c080ff' },
        { id: 'surge', x: W - 110, y: H - 62, r: 14, label: 'SRG', col: '#ff8030' }, { id: 'switch', x: W - 22, y: 56, r: 11, label: 'SWP', col: '#fff' }, { id: 'potion', x: W - 48, y: 56, r: 11, label: 'POT', col: '#60d060' } ] };
  };
  R.drawTouch = function (ctx, c, t) {
    const L = R.touchLayout(); ctx.save(); ctx.globalAlpha = 0.55;
    const sc = R.stickCenter || L.stick; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.globalAlpha = R.stickCenter ? 0.7 : 0.3; ctx.beginPath(); ctx.arc(sc.x, sc.y, L.stick.r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 0.55;
    const st = R.stickPos || { x: sc.x, y: sc.y }; ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(st.x, st.y, 12, 0, Math.PI * 2); ctx.fill();
    for (const b of L.buttons) { const h = c.hostEnt(); let on = true; if (b.id === 'special' && h.cd > 0) on = false; if (b.id === 'surge' && c.surge < 100) on = false; if (b.id === 'potion' && c.potions <= 0) on = false;
      ctx.globalAlpha = on ? 0.65 : 0.25; ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 0.9; R.text(ctx, b.label, b.x, b.y + 3, 6, '#000', 'center', { shadow: false }); }
    ctx.restore();
  };
})();
